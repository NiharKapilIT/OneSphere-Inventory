import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 10: "In Sales screens, the Serial No. checkbox should
// be restricted as per the selling quantity added in the grid (selling 2,
// allow selecting 2 only)." Code inspection found this already enforced at
// multiple layers (toggleSerialPickerOption's qtyNeeded guard, an auto-trim
// on quantity decrease, and a post-time count-mismatch validation) with no
// existing test pinning it down -- this spec turns that reading into a
// verified fact rather than an assumption, matching the lesson from item 28
// earlier in this backlog (code that "looked" correct still had a real gap).
describe('InventoryScreenShell — Serial picker capped at line quantity (item 10)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const config: InventoryScreenConfig = {
    key: 'salesInvoice',
    title: 'Sales Invoice',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-receipt',
    lineColumns: ['Item / SKU', 'Variant', 'Attribute', 'UOM', 'Qty', 'Serial No']
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
  });

  function seedPicker(qtyNeeded: number) {
    (component as any).activeSerialPicker.set({ rowIndex: 0, mode: 'select', qtyNeeded, productId: 14, productName: 'Serial Phone' });
    (component as any).serialPickerAvailableOptions.set([
      { id: 1, serial_no: 'SN-001' },
      { id: 2, serial_no: 'SN-002' },
      { id: 3, serial_no: 'SN-003' }
    ]);
    (component as any).serialPickerSelectedIds.set(new Set<number>());
  }

  it('selling quantity 2: a 3rd serial cannot be selected once 2 are already checked', () => {
    seedPicker(2);
    component.toggleSerialPickerOption({ id: 1, serial_no: 'SN-001' });
    component.toggleSerialPickerOption({ id: 2, serial_no: 'SN-002' });
    expect((component as any).serialPickerSelectedIds().size).toBe(2);

    component.toggleSerialPickerOption({ id: 3, serial_no: 'SN-003' });
    expect((component as any).serialPickerSelectedIds().size).toBe(2);
    expect(component.isSerialPickerOptionChecked(3)).toBe(false);
    expect((component as any).serialPickerDraftValues()).toEqual(['SN-001', 'SN-002']);
  });

  it('unchecking one already-selected serial frees a slot for a different one', () => {
    seedPicker(2);
    component.toggleSerialPickerOption({ id: 1, serial_no: 'SN-001' });
    component.toggleSerialPickerOption({ id: 2, serial_no: 'SN-002' });
    component.toggleSerialPickerOption({ id: 1, serial_no: 'SN-001' }); // uncheck
    expect((component as any).serialPickerSelectedIds().size).toBe(1);

    component.toggleSerialPickerOption({ id: 3, serial_no: 'SN-003' });
    expect((component as any).serialPickerSelectedIds().size).toBe(2);
    expect(component.isSerialPickerOptionChecked(3)).toBe(true);
  });

  it('selling quantity 1: only one serial can ever be checked at a time', () => {
    seedPicker(1);
    component.toggleSerialPickerOption({ id: 1, serial_no: 'SN-001' });
    component.toggleSerialPickerOption({ id: 2, serial_no: 'SN-002' });
    expect((component as any).serialPickerSelectedIds().size).toBe(1);
    expect(component.isSerialPickerOptionChecked(1)).toBe(true);
    expect(component.isSerialPickerOptionChecked(2)).toBe(false);
  });

  it('an "inherited" picker (billing a specific DC item) ignores toggle clicks entirely', () => {
    (component as any).activeSerialPicker.set({ rowIndex: 0, mode: 'inherited', qtyNeeded: 2, productId: 14, productName: 'Serial Phone' });
    (component as any).serialPickerSelectedIds.set(new Set<number>());
    component.toggleSerialPickerOption({ id: 1, serial_no: 'SN-001' });
    expect((component as any).serialPickerSelectedIds().size).toBe(0);
  });
});
