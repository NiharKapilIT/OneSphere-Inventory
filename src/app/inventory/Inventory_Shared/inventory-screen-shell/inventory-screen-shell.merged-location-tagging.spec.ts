import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Round 1 of "Warehouse/Branch independent stock".
//
// The merged Warehouse/Branch picker used to be a list of plain name strings,
// and a selection was identified by re-matching that string against Warehouse
// Master first and Branch Master second. A warehouse and a branch sharing a
// name were therefore indistinguishable downstream and always resolved as the
// warehouse. That is only cosmetic while branches cannot hold stock, and
// becomes a wrong-location posting the moment they can — so every option now
// carries an explicit { type, id } tag and resolution reads the tag.
//
// These tests pin BOTH halves of that: the tag is present and correct, AND
// nothing a user sees or any screen does has changed.
describe('InventoryScreenShell — merged Warehouse/Branch picker is type-tagged', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const WH_MAIN = { id: 6, warehouse_code: 'SEC-1', warehouse_name: 'Secunderabad', branch_id: 37, status: 'active' } as any;
  const WH_SPARE = { id: 9, warehouse_code: 'FLT-1', warehouse_name: 'Floating WH', branch_id: null, status: 'active' } as any;
  // Deliberately shares its NAME with WH_MAIN — the collision case.
  const WH_CLASH = { id: 11, warehouse_code: 'CLASH-W', warehouse_name: 'Kompally', branch_id: 41, status: 'active' } as any;

  const BR_SOLO = { id: 7, branch_id: 37, branch_code: 'HO', branch_name: 'Head Office' } as any;
  const BR_CLASH = { id: 12, branch_id: 41, branch_code: 'KMP', branch_name: 'Kompally' } as any;

  function makeComponent(key: string, lineColumns: string[]): void {
    const config = {
      key, title: key, subtitle: '', kind: 'transaction', icon: 'pi pi-box', lineColumns
    } as InventoryScreenConfig;
    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
    (component as any).loadedWarehouseObjects.set([WH_MAIN, WH_SPARE, WH_CLASH]);
    (component as any).loadedBranchObjects.set([BR_SOLO, BR_CLASH]);
    (component as any).warehouseOptionList.set(['Secunderabad', 'Floating WH', 'Kompally']);
    (component as any).branchOptionList.set(['Head Office', 'Kompally']);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();
    makeComponent('goodsReceipt', ['Product', 'UOM', 'Received Qty', 'Accepted Qty', 'Rate', 'Amount']);
  });

  it('tags every merged option with its type and master id', () => {
    const options = component.grnReceivingLocationGroups();

    expect(options).toEqual([
      { label: 'Secunderabad', group: 'Warehouse', type: 'warehouse', id: 6 },
      { label: 'Floating WH', group: 'Warehouse', type: 'warehouse', id: 9 },
      { label: 'Kompally', group: 'Warehouse', type: 'warehouse', id: 11 },
      { label: 'Head Office', group: 'Branch', type: 'branch', id: 37 },
      { label: 'Kompally', group: 'Branch', type: 'branch', id: 41 }
    ]);
  });

  // The controls bind bindLabel="label" / bindValue="label", so the labels and
  // their order are exactly what the user sees. Warehouses must keep coming
  // before branches — that ordering is what makes a name collision resolve to
  // the warehouse, matching the previous findWarehouseBySelection-first chain.
  it('does not change what the dropdown displays, or the order it displays it in', () => {
    expect(component.grnReceivingLocationGroups().map(o => o.label))
      .toEqual(['Secunderabad', 'Floating WH', 'Kompally', 'Head Office', 'Kompally']);
    expect(component.grnReceivingLocationGroups().map(o => o.group))
      .toEqual(['Warehouse', 'Warehouse', 'Warehouse', 'Branch', 'Branch']);
  });

  // The flat list (Delivery Challan's From Warehouse field) still collapses the
  // duplicate name, exactly as before — deliberately unchanged in Round 1.
  it('keeps the flat option list deduplicated by name, as before', () => {
    expect((component as any).grnReceivingLocationOptions())
      .toEqual(['Secunderabad', 'Floating WH', 'Kompally', 'Head Office']);
  });

  describe('resolveMergedLocation()', () => {
    const resolve = (value: any) => (component as any).resolveMergedLocation(value);

    it('resolves a warehouse name to the warehouse, by tag', () => {
      const result = resolve('Secunderabad');
      expect(result.type).toBe('warehouse');
      expect(result.warehouse.id).toBe(6);
      expect(result.branch).toBeNull();
    });

    it('resolves a branch name to the branch, by tag', () => {
      const result = resolve('Head Office');
      expect(result.type).toBe('branch');
      expect(result.branch.branch_id).toBe(37);
      expect(result.warehouse).toBeNull();
    });

    // Behaviour parity with the old findWarehouseBySelection-first chain.
    it('still prefers the warehouse when a warehouse and a branch share a name', () => {
      const result = resolve('Kompally');
      expect(result.type).toBe('warehouse');
      expect(result.warehouse.id).toBe(11);
    });

    // A saved document can carry a code rather than a display name; that path
    // is not in the option list, so it must still fall back to the matchers.
    it('falls back to code matching for a value that is not an option label', () => {
      expect(resolve('FLT-1').warehouse.id).toBe(9);
      expect(resolve('HO').branch.branch_id).toBe(37);
    });

    it('returns an empty resolution for an unknown or blank value', () => {
      expect(resolve('HYD Main WH')).toEqual({ type: null, warehouse: null, branch: null });
      expect(resolve('')).toEqual({ type: null, warehouse: null, branch: null });
      expect(resolve(null)).toEqual({ type: null, warehouse: null, branch: null });
    });
  });

  // Full Warehouse/Branch Independence: a branch selection no longer
  // resolves onward to a linked warehouse at all -- it posts branch-only,
  // directly. A directly picked warehouse still posts to itself with a
  // null branch, unchanged.
  describe('payload behaviour', () => {
    beforeEach(() => {
      component.entryLineRows.set([['Dell Desktop', 'Nos', '2', '2', '100', '200']]);
      (component as any).loadedProductObjects.set([
        { id: 14, product_name: 'Dell Desktop', product_code: 'DD-1' } as any
      ]);
      (component as any).loadedVendorObjects.set([{ id: 1, vendor_name: 'Test Vendor' } as any]);
    });

    it('a branch selection posts branch-only now, no longer resolved to its linked warehouse', () => {
      component.formValues.set({ receivingLocation: 'Head Office', vendor: 'Test Vendor' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBeFalsy();
      expect(payload['branch_id']).toBe(37);
    });

    it('a directly picked warehouse still posts with a null branch', () => {
      component.formValues.set({ receivingLocation: 'Floating WH', vendor: 'Test Vendor' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBe(9);
      expect(payload['branch_id']).toBeNull();
    });
  });
});
