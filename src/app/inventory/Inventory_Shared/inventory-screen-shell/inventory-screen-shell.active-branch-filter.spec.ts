import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Item 2: GRN, Purchase Invoice, Purchase Return, Delivery Challan, Sales
// Invoice and Stock Transfer all share the one merged Warehouse/Branch
// picker (mergedLocationEntries()/grnReceivingLocationOptions()/
// grnReceivingLocationGroups()) -- an inactive branch must never be
// offered there for a fresh pick, but an already-saved document that
// references a branch since deactivated must keep resolving/displaying it
// (resolveMergedLocation() already falls back to findBranchBySelection(),
// unfiltered by status, for exactly this reason).
//
// Sales Return is deliberately absent from this coverage: its own location
// field ('returnToWarehouse') never joined the merged picker in the first
// place (it is warehouse-only, per its own INVENTORY_OPTIONS.locations
// config) -- there is no Branch option on that screen to filter yet.
describe('InventoryScreenShell — merged picker offers only ACTIVE branches (item 2)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const WH_MAIN = { id: 6, warehouse_code: 'SEC-1', warehouse_name: 'Secunderabad', status: 'active' } as any;

  const ACTIVE_BRANCH = { id: 7, branch_id: 37, branch_code: 'HO', branch_name: 'Head Office', status: 'active' } as any;
  const INACTIVE_BRANCH = { id: 8, branch_id: 38, branch_code: 'CLB', branch_name: 'Closed Branch', status: 'inactive' } as any;
  // No status field at all -- pre-existing rows in the live DB predate the
  // status column being enforced everywhere; must default to active, same
  // convention defaultBranchForTransaction() already uses.
  const NO_STATUS_BRANCH = { id: 9, branch_id: 39, branch_code: 'LEG', branch_name: 'Legacy Branch' } as any;

  function makeComponent(key: string, lineColumns: string[]): void {
    const config = { key, title: key, subtitle: '', kind: 'transaction', icon: 'pi pi-box', lineColumns } as InventoryScreenConfig;
    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
    (component as any).loadedWarehouseObjects.set([WH_MAIN]);
    (component as any).loadedBranchObjects.set([ACTIVE_BRANCH, INACTIVE_BRANCH, NO_STATUS_BRANCH]);
    (component as any).warehouseOptionList.set(['Secunderabad']);
    (component as any).branchOptionList.set(['Head Office', 'Closed Branch', 'Legacy Branch']);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();
  });

  describe('Goods Receipt (representative of GRN/PI/PR/DC/SI, which all share this computed)', () => {
    beforeEach(() => makeComponent('goodsReceipt', ['Product', 'UOM', 'Received Qty', 'Accepted Qty', 'Rate', 'Amount']));

    it('excludes the inactive branch from the flat option list', () => {
      expect((component as any).grnReceivingLocationOptions())
        .toEqual(['Secunderabad', 'Head Office', 'Legacy Branch']);
    });

    it('excludes the inactive branch from the grouped/tagged option list', () => {
      const labels = component.grnReceivingLocationGroups().map(o => o.label);
      expect(labels).not.toContain('Closed Branch');
      expect(labels).toEqual(['Secunderabad', 'Head Office', 'Legacy Branch']);
    });

    it('treats a branch with no status field at all as active', () => {
      expect((component as any).grnReceivingLocationOptions()).toContain('Legacy Branch');
    });

    it('keeps an already-selected inactive branch visible when editing an older document', () => {
      component.formValues.set({ receivingLocation: 'Closed Branch' });
      expect((component as any).grnReceivingLocationOptions()).toContain('Closed Branch');
    });

    it('still resolves an already-saved inactive branch correctly even though it is filtered from fresh picks', () => {
      component.formValues.set({ receivingLocation: 'Closed Branch' });
      const resolved = (component as any).resolveMergedLocation('Closed Branch');
      expect(resolved.type).toBe('branch');
      expect(resolved.branch.branch_name).toBe('Closed Branch');
    });

    it('does not leak the carve-out to a DIFFERENT branch that is also inactive', () => {
      component.formValues.set({ receivingLocation: 'Head Office' }); // active branch selected, not the inactive one
      expect((component as any).grnReceivingLocationOptions()).not.toContain('Closed Branch');
    });
  });

  describe('Stock Transfer (From/To both merged pickers, sharing the identical computed)', () => {
    beforeEach(() => makeComponent('stockTransfer', ['Item / SKU', 'Variant', 'Attribute', 'UOM', 'Qty', 'Batch No', 'Serial No']));

    it('excludes the inactive branch for both fromWarehouse and toWarehouse', () => {
      expect((component as any).grnReceivingLocationOptions())
        .toEqual(['Secunderabad', 'Head Office', 'Legacy Branch']);
    });

    it('keeps an already-selected inactive branch visible via either From or To', () => {
      component.formValues.set({ toWarehouse: 'Closed Branch' });
      expect((component as any).grnReceivingLocationOptions()).toContain('Closed Branch');
    });
  });
});
