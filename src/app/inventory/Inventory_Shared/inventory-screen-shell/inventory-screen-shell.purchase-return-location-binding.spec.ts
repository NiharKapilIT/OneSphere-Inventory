import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Items (j) and (l).
//
// (j) A Purchase Return has to give the goods back from the location the
//     Purchase Invoice received them into. Two things stopped that happening:
//
//       * inventory.sp_get_purchase_docs_for_ref's 'PI' projection carried
//         warehouse_id/warehouse_name and no branch at all, so a PI received
//         at a BRANCH reached this screen with an empty location; and
//       * the purchaseReturn arm of selectPurchaseReference() then fell back
//         to `this.formValues()['warehouse']` -- which the session-default
//         pre-fill had already filled in.
//
//     Live consequence (UT, inv_purchase_returns id 49): a return against
//     PI-GE-26-00001, received at Branch 126 (Hyderabad), was stored against
//     Warehouse 29 (Secunderabad). Stock came off a store the goods were never
//     in, and the Accounts reversal posted into the wrong book.
//
// (l) A document is booked to the session's active Branch/Warehouse only --
//     company admins included, who move by switching their active location.
//     The pickers grey out to match, so the form can no longer show a location
//     the save is going to override.
describe('InventoryScreenShell — Purchase Return / GRN location binding (items j, l)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const purchaseReturnConfig: InventoryScreenConfig = {
    key: 'purchaseReturn',
    title: 'Purchase Return',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-replay',
    lineColumns: ['Item / SKU', 'Variant', 'Attribute', 'UOM', 'Return Qty', 'Rate', 'Amount']
  };

  const goodsReceiptConfig: InventoryScreenConfig = {
    ...purchaseReturnConfig,
    key: 'goodsReceipt',
    title: 'Goods Receipt Note',
    lineColumns: ['Item / SKU', 'Variant', 'Attribute', 'UOM', 'Received Qty', 'Rate', 'Amount']
  };

  const SEC_WH = { id: 29, warehouse_name: 'Secunderabad Warehouse', branch_id: 126, status: 'active' } as any;
  const HYD_BRANCH = { id: 126, branch_id: 126, branch_name: 'Hyderabad', status: 'active' } as any;

  const create = async (config: InventoryScreenConfig) => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();

    (component as any).loadedWarehouseObjects.set([SEC_WH]);
    (component as any).loadedBranchObjects.set([HYD_BRANCH]);
  };

  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  describe('selectPurchaseReference() on Purchase Return (item j)', () => {
    beforeEach(async () => { await create(purchaseReturnConfig); });

    it('binds a BRANCH-received PI to that branch instead of keeping the pre-filled session warehouse', () => {
      // Exactly the live shape: the session default has already put
      // Secunderabad Warehouse in the merged picker before the PI is chosen.
      component.formValues.set({ warehouse: 'Secunderabad Warehouse', warehouseId: 29 });

      component.selectPurchaseReference({
        id: 91,
        doc_number: 'PI-GE-26-00001',
        segment_id: 37,
        branch_id: 126,
        branch_name: 'Hyderabad',
        warehouse_id: undefined,
        warehouse_name: undefined,
        vendor_id: 53,
        party_name: 'Sriven Electronics Distributors',
        status: 'posted',
        items: []
      } as any);

      const values = component.formValues();
      expect(values['branchId']).toBe(126);
      expect(values['branch']).toBe('Hyderabad');
      expect(values['warehouseId']).toBeNull();
      expect(values['warehouse']).toBe('Hyderabad');
    });

    it('binds a WAREHOUSE-received PI to that warehouse (unchanged behaviour)', () => {
      component.formValues.set({ warehouse: 'Hyderabad', branchId: 126 });

      component.selectPurchaseReference({
        id: 93,
        doc_number: 'PI-GE-26-00003',
        segment_id: 37,
        warehouse_id: 29,
        warehouse_name: 'Secunderabad Warehouse',
        vendor_id: 53,
        party_name: 'Sriven Electronics Distributors',
        status: 'posted',
        items: []
      } as any);

      const values = component.formValues();
      expect(values['warehouseId']).toBe(29);
      expect(values['warehouse']).toBe('Secunderabad Warehouse');
      expect(values['branchId']).toBeNull();
      expect(values['branch']).toBe('');
    });

    it('leaves the location blank for a PI with no location at all, rather than inheriting an unrelated one', () => {
      component.formValues.set({ warehouse: 'Secunderabad Warehouse', warehouseId: 29 });

      component.selectPurchaseReference({
        id: 77,
        doc_number: 'PI-XX-26-00001',
        segment_id: 37,
        vendor_id: 53,
        party_name: 'Sriven Electronics Distributors',
        status: 'posted',
        items: []
      } as any);

      const values = component.formValues();
      expect(values['warehouseId']).toBeNull();
      expect(values['branchId']).toBeNull();
      expect(values['warehouse']).toBe('');
    });
  });

  describe('location pickers follow the session, not the operator (item l)', () => {
    it('locks Purchase Return once a session Warehouse is active, with no PI referenced', async () => {
      await create(purchaseReturnConfig);
      expect(component.purchaseReturnLocationLocked()).toBe(false);

      sessionStorage.setItem('warehouseId', '29');
      expect(component.purchaseReturnLocationLocked()).toBe(true);
    });

    it('locks Purchase Return on a session Branch too', async () => {
      await create(purchaseReturnConfig);
      sessionStorage.setItem('branchId', '126');
      expect(component.purchaseReturnLocationLocked()).toBe(true);
    });

    it('still locks Purchase Return on a referenced PI when no session location is set', async () => {
      await create(purchaseReturnConfig);
      component.formValues.set({ piId: 91, piReference: 'PI-GE-26-00001' });
      expect(component.purchaseReturnLocationLocked()).toBe(true);
    });

    it('leaves Purchase Return open for a Direct Purchase Return with no session location', async () => {
      await create(purchaseReturnConfig);
      component.formValues.set({ piId: null, piReference: 'Direct Purchase Return' });
      expect(component.purchaseReturnLocationLocked()).toBe(false);
    });

    it('locks the GRN receiving location to the session Warehouse', async () => {
      await create(goodsReceiptConfig);
      expect(component.goodsReceiptLocationLocked()).toBe(false);

      sessionStorage.setItem('warehouseId', '29');
      expect(component.goodsReceiptLocationLocked()).toBe(true);
    });

    it('ignores a session id that no longer resolves to a loaded location', async () => {
      await create(goodsReceiptConfig);
      sessionStorage.setItem('warehouseId', '9999'); // deactivated since login
      expect(component.goodsReceiptLocationLocked()).toBe(false);
    });

    it('does not lock a screen it does not own', async () => {
      await create(goodsReceiptConfig);
      sessionStorage.setItem('warehouseId', '29');
      expect(component.purchaseReturnLocationLocked()).toBe(false);
    });
  });
});
