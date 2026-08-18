import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 36: Cycle Count -- previously unwired, same starting
// point as the other three Inventory-group screens. Status model mirrors
// Stock Adjustment (pending_approval/approved/rejected, locked once
// decided) since a count sheet's variance only becomes a real stock
// correction after someone signs off on it.
describe('InventoryScreenShell — Cycle Count (item 36)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const config: InventoryScreenConfig = {
    key: 'cycleCount',
    title: 'Cycle Count / Physical Verification',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-search-plus',
    lineColumns: ['Product', 'UOM', 'System Qty', 'Physical Qty', 'Variance', 'Reason', 'Action']
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

  it('builds a payload with system/physical qty per line and a slugged status', () => {
    component.formValues.set({
      verificationNo: 'CC-EL-26-00001', verificationDate: '2026-08-16',
      warehouse: 'Secunderabad', status: 'Pending Approval'
    });
    component.entryLineRows.set([['Tomatoes', 'Kg', '280', '290', '', 'Recount', '']]);

    const payload = (component as any).buildPayload();
    expect(payload.warehouse_id).toBe(6);
    expect(payload.status).toBe('pending_approval');
    expect(payload.items[0].system_qty).toBe(280);
    expect(payload.items[0].physical_qty).toBe(290);
    expect(payload.items[0].reason).toBe('Recount');
  });

  it('slugs Approved and Rejected correctly', () => {
    component.formValues.set({ warehouse: 'Secunderabad', status: 'Approved' });
    component.entryLineRows.set([['Tomatoes', 'Kg', '280', '290', '', '', '']]);
    expect((component as any).buildPayload().status).toBe('approved');

    component.formValues.set({ warehouse: 'Secunderabad', status: 'Rejected' });
    expect((component as any).buildPayload().status).toBe('rejected');
  });

  it('loads a saved count back into the form and line items', () => {
    component.savedRecordObjects.set([{
      id: 1, verification_number: 'CC-EL-26-00001', verification_date: '2026-08-16',
      warehouse_name: 'Secunderabad', status: 'pending_approval',
      items: [{ product_name: 'Tomatoes', uom_name: 'Kg', system_qty: 280, physical_qty: 290, variance_qty: 10 }]
    }]);
    component.editRecordByRow(['CC-EL-26-00001']);
    expect(component.formValues()['warehouse']).toBe('Secunderabad');
    expect(component.formValues()['status']).toBe('Pending Approval');
    expect(component.entryLineRows().length).toBe(1);
  });

  it('treats a pending count as editable, an approved one as locked', () => {
    component.formValues.set({ status: 'Pending Approval' });
    expect(component.isCurrentRecordPosted()).toBe(false);
    component.formValues.set({ status: 'Approved' });
    expect(component.isCurrentRecordPosted()).toBe(true);
    component.formValues.set({ status: 'Rejected' });
    expect(component.isCurrentRecordPosted()).toBe(true);
  });
});
