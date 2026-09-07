import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { InventorySerialPickerModalComponent } from './inventory-serial-picker-modal.component';

// The quantity cap was already enforced in the host
// (toggleSerialPickerOption's qtyNeeded guard, covered by
// inventory-screen-shell.serial-qty-cap.spec.ts) — yet users could still tick
// more boxes than the line quantity on Delivery Challan and every other
// select-mode screen.
//
// The reason the model-level tests never caught it: refusing the click inside
// the handler is not enough. The browser ticks a native checkbox itself before
// (change) fires, and because the refusal leaves serialPickerSelectedIds
// untouched, the [checked] binding evaluates to the same false it already had.
// Angular only writes a property binding to the DOM when its value CHANGES, so
// nothing rewrote checked=false and the tick stayed on screen — the list then
// disagreed with what Save actually wrote.
//
// These tests therefore assert the DOM, not the handler: past the cap the
// remaining options must be genuinely disabled, while already-ticked ones stay
// enabled so a selection can still be swapped.
describe('InventorySerialPickerModalComponent — selection capped at line quantity', () => {
  let fixture: ComponentFixture<InventorySerialPickerModalComponent>;
  let component: InventorySerialPickerModalComponent;

  function makeHost(qtyNeeded: number, selectedIds: number[]) {
    const selected = new Set<number>(selectedIds);
    const options = [
      { id: 1, serial_no: 'SN-001' },
      { id: 2, serial_no: 'SN-002' },
      { id: 3, serial_no: 'SN-003' }
    ];
    return {
      activeSerialPicker: signal({
        rowIndex: 0, mode: 'select' as const, qtyNeeded,
        productId: 14, productName: 'Serial Phone'
      }),
      serialPickerAvailableOptions: signal(options),
      serialPickerDraftValues: signal(options.filter(o => selected.has(o.id)).map(o => o.serial_no)),
      serialPickerSelectedIds: signal(selected),
      serialPickerLoading: signal(false),
      serialPickerError: signal(''),
      serialPickerMessage: signal(''),
      isSerialPickerOptionChecked: (id: number) => selected.has(id),
      serialPickerOptionLabel: (o: { serial_no: string }) => o.serial_no,
      toggleSerialPickerOption: () => {},
      closeSerialPicker: () => {},
      saveSerialPicker: () => {}
    };
  }

  function render(qtyNeeded: number, selectedIds: number[]) {
    fixture = TestBed.createComponent(InventorySerialPickerModalComponent);
    component = fixture.componentInstance;
    component.host = makeHost(qtyNeeded, selectedIds) as any;
    fixture.detectChanges();
    return Array.from(
      fixture.nativeElement.querySelectorAll('.inventory-serial-select-row input[type="checkbox"]')
    ) as HTMLInputElement[];
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventorySerialPickerModalComponent]
    }).compileComponents();
  });

  it('leaves every option selectable while the quantity is not yet covered', () => {
    const boxes = render(2, [1]);
    expect(boxes.length).toBe(3);
    expect(boxes.map(b => b.disabled)).toEqual([false, false, false]);
  });

  it('quantity 2 with 2 already picked: the remaining option is disabled, not merely refused', () => {
    const boxes = render(2, [1, 2]);
    expect(boxes[0].checked).toBe(true);
    expect(boxes[1].checked).toBe(true);
    // The one that would exceed the quantity cannot be clicked at all.
    expect(boxes[2].disabled).toBe(true);
    expect(boxes[2].checked).toBe(false);
  });

  it('keeps already-picked options enabled at the cap so a selection can be swapped', () => {
    const boxes = render(2, [1, 2]);
    expect(boxes[0].disabled).toBe(false);
    expect(boxes[1].disabled).toBe(false);
  });

  it('quantity 1: once one is picked no other option can be ticked', () => {
    const boxes = render(1, [2]);
    expect(boxes[1].disabled).toBe(false);
    expect(boxes[0].disabled).toBe(true);
    expect(boxes[2].disabled).toBe(true);
  });

  it('explains why the remaining options are locked once the quantity is covered', () => {
    render(2, [1, 2]);
    const text = (fixture.nativeElement.textContent || '').replace(/\s+/g, ' ');
    expect(text).toContain('All 2 required serial numbers selected');
  });
});
