import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { stockAdjustmentConfig } from '../inventory-screen.model';

// User request: "in stock adjustment should add even branches too". Stock
// Adjustment was the last stockLocationScreenKeys-style screen still showing
// a Warehouse-only picker (its config field was literally labeled
// "Warehouse", not "Warehouse / Branch" like the already-merged screens --
// GRN/PI/DC/PR/SI/Opening Stock Entry). This spec mirrors
// inventory-screen-shell.opening-screens-merged-location.spec.ts's coverage
// shape for Stock Adjustment specifically, plus the one thing that screen
// doesn't need: Stock Adjustment posts on pending_approval -> approved, not
// draft -> posted, so its "nothing selected at posting time" refusal has to
// be gated on status === 'approved', not the generic 'posted' check every
// other merged screen uses (stockAdjustmentLocationValidationMessage()).
describe('InventoryScreenShell — Stock Adjustment merged Warehouse/Branch picker', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const WH_MAIN = { id: 6, warehouse_code: 'SEC-1', warehouse_name: 'Secunderabad', status: 'active' } as any;
  const BR_HO = { id: 7, branch_id: 37, branch_code: 'HO', branch_name: 'Head Office', status: 'active' } as any;

  function makeComponent(): void {
    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = stockAdjustmentConfig;
    fixture.detectChanges();
    (component as any).loadedWarehouseObjects.set([WH_MAIN]);
    (component as any).loadedBranchObjects.set([BR_HO]);
    (component as any).warehouseOptionList.set(['Secunderabad']);
    (component as any).branchOptionList.set(['Head Office']);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();
    makeComponent();
  });

  it('config has one merged Warehouse/Branch field, labeled "Warehouse / Branch", not plain "Warehouse"', () => {
    const fields = stockAdjustmentConfig.fields || [];
    const keys = fields.map(f => f.key);
    expect(keys).toContain('warehouse');
    expect(keys).not.toContain('branch');
    const warehouseField = fields.find(f => f.key === 'warehouse');
    expect(warehouseField?.label).toBe('Warehouse / Branch');
    expect(stockAdjustmentConfig.columns).toContain('Warehouse / Branch');
  });

  it('grnReceivingLocationGroups() tags Warehouse and Branch entries for the WH badge, same as every other merged screen', () => {
    expect(component.grnReceivingLocationGroups()).toEqual([
      { label: 'Secunderabad', group: 'Warehouse', type: 'warehouse', id: 6 },
      { label: 'Head Office', group: 'Branch', type: 'branch', id: 37 }
    ]);
  });

  describe('buildStockAdjustmentPayload — branch/warehouse resolution', () => {
    it('a branch selection posts branch-only, mirroring Purchase Invoice/Sales Invoice/Opening Stock Entry', () => {
      component.formValues.set({ warehouse: 'Head Office', adjustmentNo: 'SA-1', adjustmentType: 'Increase' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBeFalsy();
      expect(payload['warehouse_name']).toBeFalsy();
      expect(payload['branch_id']).toBe(37);
      expect(payload['branch_name']).toBe('Head Office');
    });

    it('a warehouse selection posts with a null branch, unregressed from before this change', () => {
      component.formValues.set({ warehouse: 'Secunderabad', adjustmentNo: 'SA-2', adjustmentType: 'Decrease' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBe(6);
      expect(payload['warehouse_name']).toBe('Secunderabad');
      expect(payload['branch_id']).toBeNull();
    });
  });

  describe('validatePayload — Stock Adjustment posts on pending_approval -> approved, not draft -> posted', () => {
    beforeEach(() => {
      component.entryLineRows.set([['Dell Desktop', '', '', 'Nos', '2', '', '']]);
      (component as any).loadedProductObjects.set([{ id: 14, product_name: 'Dell Desktop', product_code: 'DD-1' } as any]);
    });

    it('is refused when set to Approved with no location resolved at all, once a stock-tracking line exists', () => {
      component.formValues.set({ warehouse: '', adjustmentNo: 'SA-3', status: 'Approved' });
      const payload = (component as any).buildPayload();
      const message = (component as any).validatePayload(payload);
      expect(message).toContain('Warehouse / Branch');
    });

    it('a still-Pending-Approval adjustment with no location keeps the existing "no location yet" allowance', () => {
      component.formValues.set({ warehouse: '', adjustmentNo: 'SA-4', status: 'Pending Approval' });
      const payload = (component as any).buildPayload();
      const message = (component as any).validatePayload(payload);
      expect(message).toBe('');
    });

    it('an Approved adjustment with a branch resolved is not refused', () => {
      component.formValues.set({ warehouse: 'Head Office', adjustmentNo: 'SA-5', status: 'Approved' });
      const payload = (component as any).buildPayload();
      const message = (component as any).validatePayload(payload);
      expect(message).toBe('');
    });
  });

  it('reopening a branch-only approved adjustment re-populates the merged field from branch_name, not blank', () => {
    component.savedRecordObjects.set([{
      id: 9,
      adjustment_number: 'SA-6',
      branch_id: 37,
      branch_name: 'Head Office',
      warehouse_name: null,
      adjustment_type: 'Increase',
      status: 'approved',
      items: []
    }]);
    component.editRecordByRow(['SA-6']);
    expect(component.formValues()['warehouse']).toBe('Head Office');
    expect(component.formValues()['branchId']).toBe(37);
  });
});
