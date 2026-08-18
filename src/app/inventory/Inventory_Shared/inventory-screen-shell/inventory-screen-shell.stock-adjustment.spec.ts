import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 12 (second half): Stock Adjustment -- previously
// completely unwired, same starting point as Stock Transfer. Posts only on
// pending_approval -> approved (never on a plain save), which is the one
// meaningfully different rule from every other transaction screen this
// session touched, so isCurrentRecordPosted() (locks the form once decided)
// and the status-label round-trip get their own direct coverage here.
describe('InventoryScreenShell — Stock Adjustment (item 12)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const config: InventoryScreenConfig = {
    key: 'stockAdjustment',
    title: 'Stock / Availability Adjustment',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-sliders-h',
    lineColumns: ['Item / SKU', 'Variant', 'Attribute', 'UOM', 'Qty', 'Batch No', 'Serial No']
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

    (component as any).loadedWarehouseObjects.set([{ id: 6, warehouse_name: 'Secunderabad' } as any]);
    (component as any).loadedProductObjects.set([{ id: 6, product_name: 'Tomatoes' } as any]);
  });

  it('builds an Increase adjustment payload with the resolved warehouse id and slugged status', () => {
    component.formValues.set({
      adjustmentNo: 'SA-EL-26-00001', adjustmentDate: '2026-08-16',
      warehouse: 'Secunderabad', adjustmentType: 'Increase', reason: 'Found stock',
      status: 'Pending Approval'
    });
    component.entryLineRows.set([['Tomatoes', '', '', 'Kg', '5', '', '']]);

    const payload = (component as any).buildPayload();
    expect(payload.warehouse_id).toBe(6);
    expect(payload.adjustment_type).toBe('Increase');
    expect(payload.status).toBe('pending_approval');
    expect(payload.items[0].product_id).toBe(6);
    expect(payload.items[0].qty).toBe(5);
  });

  it('defaults an unrecognized adjustment type to Increase, never silently to Decrease', () => {
    component.formValues.set({ warehouse: 'Secunderabad' });
    component.entryLineRows.set([['Tomatoes', '', '', 'Kg', '5', '', '']]);
    const payload = (component as any).buildPayload();
    expect(payload.adjustment_type).toBe('Increase');
  });

  it('slugs "Approved" and "Rejected" statuses correctly', () => {
    component.formValues.set({ warehouse: 'Secunderabad', status: 'Approved' });
    component.entryLineRows.set([['Tomatoes', '', '', 'Kg', '5', '', '']]);
    expect((component as any).buildPayload().status).toBe('approved');

    component.formValues.set({ warehouse: 'Secunderabad', status: 'Rejected' });
    expect((component as any).buildPayload().status).toBe('rejected');
  });

  it('loads a saved adjustment record back into the form and line items', () => {
    component.savedRecordObjects.set([{
      id: 1, adjustment_number: 'SA-EL-26-00001', adjustment_date: '2026-08-16',
      warehouse_name: 'Secunderabad', adjustment_type: 'Increase', reason: 'Found stock',
      status: 'pending_approval',
      items: [{ product_name: 'Tomatoes', uom_name: 'Kg', qty: 5 }]
    }]);
    component.editRecordByRow(['SA-EL-26-00001']);
    expect(component.formValues()['warehouse']).toBe('Secunderabad');
    expect(component.formValues()['status']).toBe('Pending Approval');
    expect(component.entryLineRows().length).toBe(1);
  });

  it('treats a pending adjustment as editable (not posted)', () => {
    component.formValues.set({ status: 'Pending Approval' });
    expect(component.isCurrentRecordPosted()).toBe(false);
  });

  it('treats an approved adjustment as locked (posted)', () => {
    component.formValues.set({ status: 'Approved' });
    expect(component.isCurrentRecordPosted()).toBe(true);
  });

  it('treats a rejected adjustment as locked too', () => {
    component.formValues.set({ status: 'Rejected' });
    expect(component.isCurrentRecordPosted()).toBe(true);
  });
});
