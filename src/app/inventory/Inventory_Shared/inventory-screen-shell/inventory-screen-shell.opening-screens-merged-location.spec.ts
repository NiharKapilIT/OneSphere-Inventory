import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig, openingInventoryBalanceConfig, openingStockEntryConfig } from '../inventory-screen.model';

// Opening Inventory Balance and Opening Stock Entry were missed by the
// original "Full Warehouse/Branch Independence" migration and used to show
// Branch and Warehouse as two separate mandatory <select> fields, unlike
// every other transaction screen (GRN/PI/DC/PR/SI), which show one merged
// Warehouse/Branch picker. This spec pins that both screens now collapse to
// the same single merged 'warehouse' field, that the picker's live
// type-tagged option list (which also drives the small "WH" badge in the
// dropdown template) works identically for these screens as for the
// pre-existing merged screens, and that Opening Stock Entry's real backend
// save resolves a branch-only pick correctly -- Opening Inventory Balance has
// no backend wiring at all (not in isApiWired(), no buildPayload case, no
// save endpoint -- Save is a no-op today), so there is nothing to assert
// about its payload.
describe('InventoryScreenShell — Opening Inventory Balance / Opening Stock Entry merged Warehouse/Branch picker', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const WH_MAIN = { id: 6, warehouse_code: 'SEC-1', warehouse_name: 'Secunderabad', status: 'active' } as any;
  const BR_HO = { id: 7, branch_id: 37, branch_code: 'HO', branch_name: 'Head Office', status: 'active' } as any;

  function makeComponent(config: InventoryScreenConfig): void {
    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
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
  });

  it('Opening Inventory Balance config has one merged Warehouse/Branch field, not two separate ones', () => {
    const fields = openingInventoryBalanceConfig.fields || [];
    const keys = fields.map(f => f.key);
    expect(keys).toContain('warehouse');
    expect(keys).not.toContain('branch');
    const warehouseField = fields.find(f => f.key === 'warehouse');
    expect(warehouseField?.label).toBe('Warehouse / Branch');
  });

  it('Opening Stock Entry config has one merged Warehouse/Branch field, not two separate ones', () => {
    const fields = openingStockEntryConfig.fields || [];
    const keys = fields.map(f => f.key);
    expect(keys).toContain('warehouse');
    expect(keys).not.toContain('branch');
    const warehouseField = fields.find(f => f.key === 'warehouse');
    expect(warehouseField?.label).toBe('Warehouse / Branch');
  });

  describe('grnReceivingLocationGroups() — same type-tagged option list backs the WH badge for these screens too', () => {
    it('tags Warehouse and Branch entries the same way for Opening Inventory Balance', () => {
      makeComponent(openingInventoryBalanceConfig);
      expect(component.grnReceivingLocationGroups()).toEqual([
        { label: 'Secunderabad', group: 'Warehouse', type: 'warehouse', id: 6 },
        { label: 'Head Office', group: 'Branch', type: 'branch', id: 37 }
      ]);
    });

    it('tags Warehouse and Branch entries the same way for Opening Stock Entry', () => {
      makeComponent(openingStockEntryConfig);
      expect(component.grnReceivingLocationGroups()).toEqual([
        { label: 'Secunderabad', group: 'Warehouse', type: 'warehouse', id: 6 },
        { label: 'Head Office', group: 'Branch', type: 'branch', id: 37 }
      ]);
    });
  });

  describe('Opening Stock Entry — real backend payload (isApiWired)', () => {
    beforeEach(() => makeComponent(openingStockEntryConfig));

    it('a branch selection posts branch-only, mirroring Purchase Invoice/Sales Invoice', () => {
      component.formValues.set({ warehouse: 'Head Office', entryNo: 'OSE-1' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBeFalsy();
      expect(payload['branch_id']).toBe(37);
      expect(payload['branch_name']).toBe('Head Office');
    });

    it('a warehouse selection posts with a null branch', () => {
      component.formValues.set({ warehouse: 'Secunderabad', entryNo: 'OSE-2' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBe(6);
      expect(payload['branch_id']).toBeNull();
    });

    it('is refused on Post with no location resolved at all, once a stock-tracking line exists', () => {
      component.entryLineRows.set([['Dell Desktop', 'Nos', '2', '100', '200', '', '']]);
      (component as any).loadedProductObjects.set([{ id: 14, product_name: 'Dell Desktop', product_code: 'DD-1' } as any]);
      component.formValues.set({ warehouse: '', entryNo: 'OSE-3', status: 'Posted' });
      const payload = (component as any).buildPayload();
      payload['status'] = 'posted';
      const message = (component as any).validatePayload(payload);
      expect(message).toContain('Warehouse / Branch');
    });

    it('a Draft with no location keeps the existing "no location yet" allowance', () => {
      component.formValues.set({ warehouse: '', entryNo: 'OSE-4', status: 'Draft' });
      const payload = (component as any).buildPayload();
      const message = (component as any).validatePayload(payload);
      expect(message).toBe('');
    });

    it('reopening a branch-only posted entry re-populates the merged field from branch_name, not blank', () => {
      component.savedRecordObjects.set([{
        id: 5,
        entry_number: 'OSE-5',
        branch_name: 'Head Office',
        warehouse_name: null,
        status: 'posted',
        items: []
      }]);
      component.editRecordByRow(['OSE-5']);
      expect(component.formValues()['warehouse']).toBe('Head Office');
    });
  });

  it('Opening Inventory Balance is not gated by the stock-location-required-on-post check (no backend wiring to guard)', () => {
    makeComponent(openingInventoryBalanceConfig);
    component.formValues.set({ warehouse: '', status: 'Posted' });
    const payload = (component as any).buildPayload();
    const message = (component as any).mergedLocationValidationMessage(payload);
    expect(message).toBe('');
  });
});
