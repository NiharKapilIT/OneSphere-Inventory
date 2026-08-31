import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Required Session-Level Warehouse Selection, Phase 4: populate-on-open
// defaulting of a transaction screen's location field(s) from the logged-in
// session's active Warehouse/Branch. Deliberately a SEPARATE spec file from
// inventory-screen-shell.branch-warehouse-resolution.spec.ts, which covers
// SAVE-time resolution (what a typed-in name resolves to in buildPayload) --
// this one covers what applyDefaultLocationToCurrentTransaction() writes into
// formValues() before the user has touched anything, replacing the old
// 4-screen-only shouldDefaultBranchForCurrentScreen() allowlist with the full
// 9-screen LOCATION_DEFAULT_CAPABILITIES map.
describe('InventoryScreenShell — session Warehouse/Branch defaulting (populate-on-open)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const WH_DEFAULT = { id: 200, warehouse_code: 'CWH', warehouse_name: 'Central WH', is_default: true, status: 'active' } as any;
  const WH_OTHER = { id: 201, warehouse_code: 'AWH', warehouse_name: 'Annex WH', is_default: false, status: 'active' } as any;

  const BRANCH_HO = {
    id: 300, branch_id: 50, branch_name: 'Head Office', branch_code: 'HO',
    is_head_office: true, status: 'active', created_at: '2020-01-01T00:00:00Z'
  } as any;
  const BRANCH_OTHER = {
    id: 301, branch_id: 51, branch_name: 'Alpha Branch', branch_code: 'ALPHA',
    is_head_office: false, status: 'active', created_at: '2021-01-01T00:00:00Z'
  } as any;

  function makeComponent(config: InventoryScreenConfig): void {
    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
    (component as any).loadedWarehouseObjects.set([WH_DEFAULT, WH_OTHER]);
    (component as any).loadedBranchObjects.set([BRANCH_HO, BRANCH_OTHER]);
  }

  // Field keys per screen, mirroring each real config in inventory-screen.model.ts
  // closely enough for configHasField() to see them. Bug fix: this map was
  // missing entirely before -- every one of these ad-hoc test configs had NO
  // `fields` array at all, so configHasField() (which reads `this.config?.fields
  // || []`) always returned false and applyDefaultLocationToCurrentTransaction()
  // silently no-op'd on every capability, on every test, regardless of anything
  // it was supposed to do. That made every "a default IS applied" assertion in
  // this file fail (14 of 19 cases) while every "nothing happens" assertion
  // happened to still pass, which is what made the gap easy to miss. Found and
  // fixed here since it directly guards the LOCATION_DEFAULT_CAPABILITIES map
  // this same session extended for Opening Inventory Balance/Opening Stock
  // Entry -- their own coverage lives in
  // inventory-screen-shell.opening-screens-merged-location.spec.ts instead,
  // which reaches the real production configs directly rather than an ad-hoc
  // stand-in, so it was unaffected by this bug.
  const FIELD_KEYS_BY_SCREEN: Record<string, string[]> = {
    goodsReceipt: ['receivingLocation'],
    purchaseInvoice: ['receivingLocation'],
    purchaseReturn: ['warehouse'],
    deliveryChallan: ['fromWarehouse'],
    salesInvoice: ['warehouse', 'branch'],
    purchaseRequisition: ['branch'],
    salesReturn: ['returnToWarehouse'],
    purchaseOrder: ['receivingWarehouse'],
    stockTransfer: ['fromWarehouse', 'toWarehouse'],
    salesOrder: [] // deliberately outside the capability map -- no location field at all
  };

  const transaction = (key: string, title: string): InventoryScreenConfig => ({
    key, title, subtitle: '', kind: 'transaction', icon: 'pi pi-box', lineColumns: [],
    fields: (FIELD_KEYS_BY_SCREEN[key] || []).map(fieldKey => ({ key: fieldKey, label: fieldKey }))
  } as InventoryScreenConfig);

  function applyDefaults(force = false): void {
    (component as any).applyDefaultLocationToCurrentTransaction(force);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();
  });

  afterEach(() => {
    sessionStorage.removeItem('warehouseId');
    sessionStorage.removeItem('branchId');
  });

  describe('merged screens (goodsReceipt/receivingLocation, purchaseInvoice/receivingLocation, purchaseReturn/warehouse, deliveryChallan/fromWarehouse, salesInvoice/warehouse)', () => {
    it('prefers the session Warehouse when active', () => {
      sessionStorage.setItem('warehouseId', String(WH_OTHER.id));
      sessionStorage.setItem('branchId', String(BRANCH_OTHER.branch_id));
      makeComponent(transaction('goodsReceipt', 'Goods Receipt'));
      applyDefaults();
      expect(component.formValues()['receivingLocation']).toBe('Annex WH');
    });

    it('falls back to the session Branch when no session Warehouse is active', () => {
      sessionStorage.setItem('branchId', String(BRANCH_OTHER.branch_id));
      makeComponent(transaction('purchaseInvoice', 'Purchase Invoice'));
      applyDefaults();
      expect(component.formValues()['receivingLocation']).toBe('Alpha Branch');
    });

    it('falls back to today\'s branch heuristic (Head Office first) when neither session value is active', () => {
      makeComponent(transaction('deliveryChallan', 'Delivery Challan'));
      applyDefaults();
      expect(component.formValues()['fromWarehouse']).toBe('Head Office');
    });

    it('does not overwrite an already-set value unless forced', () => {
      sessionStorage.setItem('warehouseId', String(WH_OTHER.id));
      makeComponent(transaction('purchaseReturn', 'Purchase Return'));
      component.formValues.set({ warehouse: 'Some Existing Value' });
      applyDefaults();
      expect(component.formValues()['warehouse']).toBe('Some Existing Value');
    });

    it('overwrites an existing value when forced', () => {
      sessionStorage.setItem('warehouseId', String(WH_OTHER.id));
      makeComponent(transaction('purchaseReturn', 'Purchase Return'));
      component.formValues.set({ warehouse: 'Some Existing Value' });
      applyDefaults(true);
      expect(component.formValues()['warehouse']).toBe('Annex WH');
    });

    it('is skipped entirely while editing an existing record, unless forced', () => {
      sessionStorage.setItem('warehouseId', String(WH_OTHER.id));
      makeComponent(transaction('salesInvoice', 'Sales Invoice'));
      component.editingId.set(999);
      applyDefaults();
      expect(component.formValues()['warehouse']).toBeUndefined();
    });

    it('a session Warehouse pick on the merged picker also clears the stale generic branch companion fields (reuses the manual-selection handler)', () => {
      sessionStorage.setItem('warehouseId', String(WH_OTHER.id));
      makeComponent(transaction('goodsReceipt', 'Goods Receipt'));
      applyDefaults();
      const values = component.formValues();
      expect(values['warehouseId']).toBe(WH_OTHER.id);
      expect(values['branchId']).toBeNull();
    });
  });

  describe('branchOnly screens (purchaseRequisition/branch, salesInvoice/branch — Interbranch Sale)', () => {
    it('prefers the session Branch when active', () => {
      sessionStorage.setItem('branchId', String(BRANCH_OTHER.branch_id));
      makeComponent(transaction('purchaseRequisition', 'Purchase Requisition'));
      applyDefaults();
      expect(component.formValues()['branch']).toBe('Alpha Branch');
      expect(component.formValues()['branchId']).toBe(BRANCH_OTHER.branch_id);
    });

    it('ignores an active session Warehouse -- a branchOnly field is never defaulted from Warehouse', () => {
      sessionStorage.setItem('warehouseId', String(WH_OTHER.id));
      sessionStorage.setItem('branchId', String(BRANCH_OTHER.branch_id));
      makeComponent(transaction('purchaseRequisition', 'Purchase Requisition'));
      applyDefaults();
      expect(component.formValues()['branch']).toBe('Alpha Branch');
    });

    it('falls back to today\'s branch heuristic when no session Branch is active', () => {
      makeComponent(transaction('purchaseRequisition', 'Purchase Requisition'));
      applyDefaults();
      expect(component.formValues()['branch']).toBe('Head Office');
    });

    it('defaults Sales Invoice\'s separate Interbranch Sale Branch field independently of its own merged Warehouse field', () => {
      sessionStorage.setItem('warehouseId', String(WH_OTHER.id));
      sessionStorage.setItem('branchId', String(BRANCH_OTHER.branch_id));
      makeComponent(transaction('salesInvoice', 'Sales Invoice'));
      applyDefaults();
      const values = component.formValues();
      expect(values['warehouse']).toBe('Annex WH');   // merged field: session Warehouse wins
      expect(values['branch']).toBe('Alpha Branch');  // branchOnly field: session Branch, independently
    });
  });

  describe('warehouseOnly screens (salesReturn/returnToWarehouse, purchaseOrder/receivingWarehouse)', () => {
    it('prefers the session Warehouse when active', () => {
      sessionStorage.setItem('warehouseId', String(WH_OTHER.id));
      makeComponent(transaction('salesReturn', 'Sales Return'));
      applyDefaults();
      expect(component.formValues()['returnToWarehouse']).toBe('Annex WH');
    });

    it('a session Branch is NEVER stuffed into a warehouse-only field -- falls to the warehouse heuristic instead', () => {
      sessionStorage.setItem('branchId', String(BRANCH_OTHER.branch_id));
      makeComponent(transaction('purchaseOrder', 'Purchase Order'));
      applyDefaults();
      // Falls to the is_default-first warehouse heuristic (WH_DEFAULT), never
      // to 'Alpha Branch' or a blank field.
      expect(component.formValues()['receivingWarehouse']).toBe('Central WH');
    });

    it('falls back to the is_default-first warehouse heuristic when no session Warehouse is active', () => {
      makeComponent(transaction('purchaseOrder', 'Purchase Order'));
      applyDefaults();
      expect(component.formValues()['receivingWarehouse']).toBe('Central WH');
    });
  });

  describe('Stock Transfer (fromWarehouse defaults, toWarehouse deliberately left blank)', () => {
    it('defaults fromWarehouse per the merged rule', () => {
      sessionStorage.setItem('warehouseId', String(WH_OTHER.id));
      makeComponent(transaction('stockTransfer', 'Stock Transfer'));
      applyDefaults();
      expect(component.formValues()['fromWarehouse']).toBe('Annex WH');
    });

    it('never touches toWarehouse, even when a session Warehouse is active', () => {
      sessionStorage.setItem('warehouseId', String(WH_OTHER.id));
      makeComponent(transaction('stockTransfer', 'Stock Transfer'));
      applyDefaults();
      expect(component.formValues()['toWarehouse']).toBeUndefined();
    });
  });

  describe('screens outside the capability map', () => {
    it('no-ops for a screen with no location-capable header field', () => {
      makeComponent(transaction('salesOrder', 'Sales Order'));
      sessionStorage.setItem('warehouseId', String(WH_OTHER.id));
      expect(() => applyDefaults()).not.toThrow();
      expect(component.formValues()['warehouse']).toBeUndefined();
    });
  });

  // Load-order race fix: the branches and warehouses master-list fetches are
  // two independent HTTP calls with no ordering guarantee. tryApplyDefaultLocation()
  // gates on BOTH having resolved, so a warehouse-preferred default can't be
  // pre-empted by branches resolving first.
  describe('tryApplyDefaultLocation() load-order gate', () => {
    it('does not apply a default until both branches and warehouses have loaded', () => {
      makeComponent(transaction('goodsReceipt', 'Goods Receipt'));
      sessionStorage.setItem('warehouseId', String(WH_OTHER.id));
      (component as any).branchesMasterLoaded = true;
      (component as any).warehousesMasterLoaded = false;
      (component as any).tryApplyDefaultLocation();
      expect(component.formValues()['receivingLocation']).toBeUndefined();
    });

    it('applies the default once both master lists have loaded', () => {
      makeComponent(transaction('goodsReceipt', 'Goods Receipt'));
      sessionStorage.setItem('warehouseId', String(WH_OTHER.id));
      (component as any).branchesMasterLoaded = true;
      (component as any).warehousesMasterLoaded = true;
      (component as any).tryApplyDefaultLocation();
      expect(component.formValues()['receivingLocation']).toBe('Annex WH');
    });
  });
});
