import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Full Warehouse/Branch Independence: Warehouse and Branch are two fully
// independent location concepts now. A Branch pick on any merged-picker
// screen (GRN, Purchase Invoice, Delivery Challan, Purchase Return, Sales
// Invoice) is ALWAYS valid on its own -- posted directly against the branch
// itself, never resolved to "the one warehouse it's linked to", regardless
// of whether that branch has zero, one, or several linked warehouses. The
// old inv_warehouses.branch_id link still exists in the live database
// (decision #4: existing data is left untouched), but nothing reads it for
// resolution purposes any more.
describe('InventoryScreenShell — Branch selection posts branch-only (no resolution to a warehouse)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  // branch_id here is the GLOBAL branch id (global.branches.id), which is what
  // inv_warehouses.branch_id actually FKs to — deliberately different numbers
  // from the branches' own local inv_branch_config ids below. Kept only
  // because loadedWarehouseObjects()/loadedBranchObjects() fixtures elsewhere
  // in this codebase still carry it; nothing in this spec relies on the link
  // itself resolving to anything any more.
  const SOLO_WH = { id: 6, warehouse_name: 'Secunderabad', branch_id: 37, status: 'active' } as any;
  const TWIN_WH_A = { id: 7, warehouse_name: 'Warangal Main', branch_id: 38, status: 'active' } as any;
  const TWIN_WH_B = { id: 8, warehouse_name: 'Warangal Annex', branch_id: 38, status: 'active' } as any;
  const UNLINKED_WH = { id: 9, warehouse_name: 'Floating WH', branch_id: null, status: 'active' } as any;

  const SOLO_BRANCH = { id: 7, branch_id: 37, branch_name: 'Head Office' } as any;
  const TWIN_BRANCH = { id: 8, branch_id: 38, branch_name: 'Hanamkonda' } as any;
  const BARE_BRANCH = { id: 9, branch_id: 39, branch_name: 'Nizamabad' } as any;

  function makeComponent(config: InventoryScreenConfig): void {
    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
    (component as any).loadedWarehouseObjects.set([SOLO_WH, TWIN_WH_A, TWIN_WH_B, UNLINKED_WH]);
    (component as any).loadedBranchObjects.set([SOLO_BRANCH, TWIN_BRANCH, BARE_BRANCH]);
    (component as any).loadedProductObjects.set([
      { id: 14, product_name: 'Dell Desktop', product_code: 'DD-1' } as any,
      { id: 15, product_name: 'AMC Support', product_code: 'AMC-1', product_type: 'Service', is_service: true } as any
    ]);
  }

  const transaction = (key: string, title: string, lineColumns: string[]): InventoryScreenConfig => ({
    key, title, subtitle: '', kind: 'transaction', icon: 'pi pi-box', lineColumns
  } as InventoryScreenConfig);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();
  });

  describe('Goods Receipt (merged Receiving Branch / Warehouse picker)', () => {
    beforeEach(() => {
      makeComponent(transaction('goodsReceipt', 'Goods Receipt',
        ['Product', 'UOM', 'Received Qty', 'Accepted Qty', 'Rate', 'Amount']));
      // A GRN needs a line and a vendor before any other validation is
      // reached — unrelated to the location logic under test here, but a
      // toBe('') assertion would otherwise trip over them.
      component.entryLineRows.set([['Dell Desktop', 'Nos', '2', '2', '100', '200']]);
      (component as any).loadedVendorObjects.set([{ id: 1, vendor_name: 'Test Vendor' } as any]);
    });

    it('picking a branch posts branch-only, even with exactly one linked warehouse -- no more auto-collapse', () => {
      component.formValues.set({ receivingLocation: 'Head Office', vendor: 'Test Vendor' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBeFalsy();
      expect(payload['warehouse_name']).toBeFalsy();
      expect(payload['branch_id']).toBe(37);
      expect(payload['branch_name']).toBe('Head Office');
      expect((component as any).validatePayload(payload)).toBe('');
    });

    // fn_post_grn_stock (migration 163) posts straight against a Branch via
    // inventory.fn_upsert_stock_balance -- a branch with several linked
    // warehouses used to be refused as ambiguous; there is nothing left to
    // disambiguate now.
    it('a branch with several linked warehouses is no longer ambiguous -- posts branch-only just the same', () => {
      component.formValues.set({ receivingLocation: 'Hanamkonda', vendor: 'Test Vendor' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBeFalsy();
      expect(payload['branch_id']).toBe(38);
      expect(payload['branch_name']).toBe('Hanamkonda');
      expect((component as any).validatePayload(payload)).toBe('');
    });

    it('a branch with no linked warehouse at all is no longer blocked -- posts branch-only', () => {
      component.formValues.set({ receivingLocation: 'Nizamabad', vendor: 'Test Vendor' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBeFalsy();
      expect(payload['branch_id']).toBe(39);
      expect(payload['branch_name']).toBe('Nizamabad');
      expect((component as any).validatePayload(payload)).toBe('');
    });

    it('leaves a directly picked warehouse exactly as before (branch stays null)', () => {
      component.formValues.set({ receivingLocation: 'Floating WH', vendor: 'Test Vendor' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBe(9);
      expect(payload['branch_id']).toBeNull();
      expect((component as any).validatePayload(payload)).toBe('');
    });

    it('blocks a location name that matches no warehouse and no branch', () => {
      component.formValues.set({ receivingLocation: 'HYD Main WH' });
      const payload = (component as any).buildPayload();
      expect((component as any).validatePayload(payload)).toContain('is not a Warehouse in this company');
    });

    // GRN needs no new "no location at all" rule — it has had a stricter one
    // all along (blocks the DRAFT too, not just the post). Pinned here so a
    // future change can't quietly drop it and reopen the Unassigned hole.
    it('already refuses any save with no location at all, draft included', () => {
      component.formValues.set({ vendor: 'Test Vendor', status: 'Draft' });
      const payload = (component as any).buildPayload();
      expect((component as any).validatePayload(payload)).toBe('Receiving Branch / Warehouse is required for GRN.');
    });
  });

  describe('Purchase Invoice (same merged picker)', () => {
    beforeEach(() => makeComponent(transaction('purchaseInvoice', 'Purchase Invoice',
      ['Product', 'UOM', 'Qty', 'Rate', 'Amount'])));

    it('picking a branch posts branch-only, even with exactly one linked warehouse -- no more auto-collapse', () => {
      component.formValues.set({ receivingLocation: 'Head Office' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBeFalsy();
      expect(payload['branch_id']).toBe(37);
      expect(payload['branch_name']).toBe('Head Office');
    });

    // fn_post_pi_stock (migration 159) already posts straight against a
    // Branch via inventory.fn_upsert_stock_balance -- a branch with several
    // linked warehouses used to be refused as ambiguous even here (the
    // old branchOnlyStockPostingScreenKeys only ever waived the
    // zero-linked-warehouse case, not the ambiguous one); there is nothing
    // left to disambiguate now.
    it('a branch with several linked warehouses is no longer ambiguous -- posts branch-only', () => {
      component.entryLineRows.set([['Dell Desktop', 'Nos', '2', '100', '200']]);
      component.formValues.set({
        receivingLocation: 'Hanamkonda', vendor: 'Test Vendor', piNo: 'PI-3', piDate: '2026-08-20',
        vendorInvoiceNo: 'VI-3', vendorInvoiceDate: '2026-08-20'
      });
      (component as any).loadedVendorObjects.set([{ id: 1, vendor_name: 'Test Vendor' } as any]);
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBeFalsy();
      expect(payload['branch_id']).toBe(38);
      expect((component as any).validatePayload(payload)).toBe('');
    });

    // This behaviour is no longer Purchase-Invoice-specific -- every
    // merged-picker screen works this way now.
    it('allows posting straight against a branch with no linked warehouse', () => {
      component.entryLineRows.set([['Dell Desktop', 'Nos', '2', '100', '200']]);
      component.formValues.set({
        receivingLocation: 'Nizamabad', vendor: 'Test Vendor', piNo: 'PI-2', piDate: '2026-08-20',
        vendorInvoiceNo: 'VI-2', vendorInvoiceDate: '2026-08-20'
      });
      (component as any).loadedVendorObjects.set([{ id: 1, vendor_name: 'Test Vendor' } as any]);
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBeFalsy();
      expect(payload['branch_id']).toBe(39);
      expect(payload['branch_name']).toBe('Nizamabad');
      expect((component as any).validatePayload(payload)).toBe('');
    });

    // As with GRN, Purchase Invoice already had its own stricter rule.
    it('already refuses any save with no location at all, draft included', () => {
      component.entryLineRows.set([['Dell Desktop', 'Nos', '2', '100', '200']]);
      component.formValues.set({
        vendor: 'Test Vendor', piNo: 'PI-1', piDate: '2026-08-20',
        vendorInvoiceNo: 'VI-1', vendorInvoiceDate: '2026-08-20'
      });
      (component as any).loadedVendorObjects.set([{ id: 1, vendor_name: 'Test Vendor' } as any]);
      const payload = (component as any).buildPayload();
      expect((component as any).validatePayload(payload)).toBe('Branch / Warehouse is required for Purchase Invoice.');
    });
  });

  describe('Delivery Challan (merged From Warehouse / Branch picker)', () => {
    beforeEach(() => makeComponent(transaction('deliveryChallan', 'Delivery Challan',
      ['Product', 'UOM', 'Dispatch Qty'])));

    it('picking a branch dispatches branch-only, even with exactly one linked warehouse -- no more auto-collapse', () => {
      component.formValues.set({ fromWarehouse: 'Head Office' });
      const payload = (component as any).buildPayload();
      expect(payload['from_warehouse_id']).toBeFalsy();
      expect(payload['branch_id']).toBe(37);
      expect(payload['branch_name']).toBe('Head Office');
    });

    // fn_post_delivery_challan_dispatch (migration 164) posts straight
    // against a Branch now.
    it('a branch with several linked warehouses is no longer ambiguous -- dispatches branch-only just the same', () => {
      component.formValues.set({ fromWarehouse: 'Hanamkonda' });
      const payload = (component as any).buildPayload();
      payload['customer_name'] = 'Test Customer';
      expect(payload['from_warehouse_id']).toBeFalsy();
      expect(payload['branch_id']).toBe(38);
      expect((component as any).validatePayload(payload)).toBe('');
    });

    it('a branch with no linked warehouse is no longer blocked -- dispatches branch-only', () => {
      component.formValues.set({ fromWarehouse: 'Nizamabad' });
      const payload = (component as any).buildPayload();
      payload['customer_name'] = 'Test Customer';
      expect(payload['from_warehouse_id']).toBeFalsy();
      expect(payload['branch_id']).toBe(39);
      expect((component as any).validatePayload(payload)).toBe('');
    });

    it('refuses to POST with no location at all', () => {
      component.entryLineRows.set([['Dell Desktop', 'Nos', '2']]);
      component.formValues.set({ customer: 'Test Customer', status: 'Posted' });
      const payload = (component as any).buildPayload();
      payload['status'] = 'posted';
      payload['customer_name'] = 'Test Customer';
      expect((component as any).validatePayload(payload)).toContain('Select the From Warehouse / Branch');
    });

    it('still allows a DRAFT with no location', () => {
      component.entryLineRows.set([['Dell Desktop', 'Nos', '2']]);
      component.formValues.set({ customer: 'Test Customer' });
      const payload = (component as any).buildPayload();
      payload['customer_name'] = 'Test Customer';
      expect((component as any).validatePayload(payload)).toBe('');
    });
  });

  describe('Purchase Return (now wired into the same merged Warehouse/Branch picker)', () => {
    beforeEach(() => {
      makeComponent(transaction('purchaseReturn', 'Purchase Return',
        ['Product', 'Variant', 'Attribute', 'UOM', 'Invoice Qty', 'Return Qty', 'Rate', 'GST', 'Return Amount', 'Serial No']));
      component.entryLineRows.set([['Dell Desktop', '', '', 'Nos', '2', '1', '100', '0%', '100', '']]);
    });

    it('picking a branch posts branch-only, even with exactly one linked warehouse -- no more auto-collapse', () => {
      component.formValues.set({ warehouse: 'Head Office', vendor: 'Test Vendor' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBeFalsy();
      expect(payload['branch_id']).toBe(37);
      expect(payload['branch_name']).toBe('Head Office');
      expect((component as any).validatePayload(payload)).toBe('');
    });

    // fn_post_purchase_return_stock (migration 165) posts straight against
    // a Branch now.
    it('a branch with several linked warehouses is no longer ambiguous -- posts branch-only just the same', () => {
      component.formValues.set({ warehouse: 'Hanamkonda', vendor: 'Test Vendor' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBeFalsy();
      expect(payload['branch_id']).toBe(38);
      expect((component as any).validatePayload(payload)).toBe('');
    });

    it('a branch with no linked warehouse is no longer blocked -- posts branch-only', () => {
      component.formValues.set({ warehouse: 'Nizamabad', vendor: 'Test Vendor' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBeFalsy();
      expect(payload['branch_id']).toBe(39);
      expect((component as any).validatePayload(payload)).toBe('');
    });

    it('leaves a directly picked warehouse exactly as before (branch stays null)', () => {
      component.formValues.set({ warehouse: 'Floating WH', vendor: 'Test Vendor' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBe(9);
      expect(payload['branch_id']).toBeFalsy();
      expect((component as any).validatePayload(payload)).toBe('');
    });

    it('blocks a location name that matches no warehouse and no branch', () => {
      component.formValues.set({ warehouse: 'HYD Main WH', vendor: 'Test Vendor' });
      const payload = (component as any).buildPayload();
      expect((component as any).validatePayload(payload)).toContain('is not a Warehouse in this company');
    });

    it('already refuses any save with no location at all (Purchase Return\'s own stricter rule)', () => {
      component.formValues.set({ vendor: 'Test Vendor' });
      const payload = (component as any).buildPayload();
      expect((component as any).validatePayload(payload)).toBe('Warehouse / Branch is required for Purchase Return.');
    });
  });

  describe('Sales Invoice (merged Warehouse/Branch picker + separate interbranch Branch field)', () => {
    beforeEach(() => makeComponent(transaction('salesInvoice', 'Sales Invoice',
      ['Item / SKU', 'Variant', 'Attribute', 'UOM', 'Qty', 'Rate', 'MRP', 'Selling Price', 'Disc %', 'GST', 'Batch No', 'Serial No', 'Expiry Date', 'Warehouse', 'Amount'])));

    function stockLine(): void {
      component.entryLineRows.set([
        ['Dell Desktop', '', '', 'Nos', '2', '100', '200', '150', '0', '0%', '', '', '', '', '200']
      ]);
    }

    // Full Warehouse/Branch Independence: Sales Invoice's own Warehouse
    // field is now the same merged Warehouse/Branch picker GRN/PI/DC/
    // Purchase Return use -- picking a branch posts stock directly against
    // it (fn_post_sales_invoice_stock, migration 166), never resolved to
    // "the one warehouse it's linked to". This replaces the old
    // warehouse-autofill-from-branch-pool fallback that used to run through
    // the separate Interbranch Sale Branch field when Warehouse was empty --
    // that field is untouched, but no longer feeds this resolution at all.
    it('picking a branch on the invoice\'s own field posts branch-only, even with exactly one linked warehouse', () => {
      stockLine();
      component.formValues.set({ warehouse: 'Head Office' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBeFalsy();
      expect(payload['branch_id']).toBe(37);
      expect(payload['branch_name']).toBe('Head Office');
    });

    it('a branch with several linked warehouses is no longer ambiguous on Sales Invoice\'s own field either', () => {
      stockLine();
      component.formValues.set({ warehouse: 'Hanamkonda' });
      const payload = (component as any).buildPayload();
      payload['customer_name'] = 'Test Customer';
      payload['channel_partner_name'] = 'Test Partner';
      expect(payload['warehouse_id']).toBeFalsy();
      expect(payload['branch_id']).toBe(38);
      expect((component as any).validatePayload(payload)).toBe('');
    });

    // Workstream D: the grid's own per-line Warehouse column is gone from
    // the real salesInvoiceConfig (inventory-screen.model.ts) -- it was
    // forced read-only and always mirrored the header field anyway.
    // salesLineItems() now reads the header 'warehouse' field directly
    // instead of a dead per-line cell lookup.
    it('stamps each line item\'s warehouse_name straight from the header Warehouse field', () => {
      stockLine();
      component.formValues.set({ warehouse: 'Secunderabad' });
      const payload = (component as any).buildPayload();
      expect(payload.items[0].warehouse_name).toBe('Secunderabad');
    });

    // The real INV-26-00002 signature: a stale warehouse name left over from
    // the old hardcoded demo location list, written through beside a NULL id.
    it('blocks a stale warehouse name that matches nothing', () => {
      stockLine();
      component.formValues.set({ warehouse: 'HYD Main WH' });
      const payload = (component as any).buildPayload();
      expect((component as any).validatePayload(payload)).toContain('is not a Warehouse in this company');
    });

    it('refuses to POST a stock-moving invoice with no location at all', () => {
      stockLine();
      component.formValues.set({ status: 'Posted' });
      const payload = (component as any).buildPayload();
      payload['status'] = 'posted';
      expect((component as any).validatePayload(payload)).toContain('Select the Warehouse this invoice ships from');
    });

    // The two cases below must stay saveable, so they carry the unrelated
    // fields Sales Invoice independently requires (customer, channel partner,
    // invoice no/date) — otherwise they'd fail on those, not on the location.
    function completeSalesHeader(extra: Record<string, any>): void {
      component.formValues.set({
        customer: 'Test Customer',
        channelPartner: 'Test Partner',
        invoiceNo: 'INV-TEST-1',
        invoiceDate: '2026-08-20',
        ...extra
      });
      (component as any).loadedCustomerObjects.set([{ id: 1, customer_name: 'Test Customer' } as any]);
    }

    it('still allows a DRAFT with no location', () => {
      stockLine();
      completeSalesHeader({ status: 'Draft' });
      const payload = (component as any).buildPayload();
      payload['customer_name'] = 'Test Customer';
      payload['channel_partner_name'] = 'Test Partner';
      expect((component as any).validatePayload(payload)).toBe('');
    });

    it('still allows POSTING a service-only invoice with no warehouse', () => {
      component.entryLineRows.set([
        ['AMC Support', '', '', 'Year', '1', '5000', '', '', '0', '0%', '', '', '', '', '5000']
      ]);
      completeSalesHeader({ status: 'Posted' });
      const payload = (component as any).buildPayload();
      payload['status'] = 'posted';
      payload['customer_name'] = 'Test Customer';
      payload['channel_partner_name'] = 'Test Partner';
      expect((component as any).validatePayload(payload)).toBe('');
    });
  });

  describe('Sales Return (out of scope for branch-aware posting -- fn_post_sales_return_stock untouched)', () => {
    beforeEach(() => makeComponent(transaction('salesReturn', 'Sales Return',
      ['Product', 'Variant', 'Attribute', 'Invoiced Qty', 'Return Qty', 'UOM', 'Rate', 'GST', 'Batch No', 'Serial No', 'Expiry Date', 'Return Amount', 'Reason'])));

    function returnLine(): void {
      component.entryLineRows.set([
        ['Dell Desktop', '', '', '2', '1', 'Nos', '100', '0%', '', '', '', '100', 'Quality Issue']
      ]);
    }

    // Full Warehouse/Branch Independence: Sales Return never gained a
    // branch_id column or a branch-aware posting path (deliberately out of
    // scope), and the shared branch->single-warehouse resolver it used to
    // borrow (singleWarehouseForBranch()) is deleted entirely -- a branch
    // name typed into Return To Warehouse no longer resolves to anything.
    it('a branch name in Return To Warehouse no longer resolves to a warehouse', () => {
      returnLine();
      component.formValues.set({ returnToWarehouse: 'Head Office' });
      const payload = (component as any).buildPayload();
      expect(payload['return_to_warehouse_id']).toBeFalsy();
    });

    it('a directly picked warehouse still resolves exactly as before', () => {
      returnLine();
      component.formValues.set({ returnToWarehouse: 'Floating WH' });
      const payload = (component as any).buildPayload();
      expect(payload['return_to_warehouse_id']).toBe(9);
      expect(payload['return_to_warehouse_name']).toBe('Floating WH');
    });

    it('refuses to POST a return with no location at all', () => {
      returnLine();
      component.formValues.set({ status: 'Posted' });
      const payload = (component as any).buildPayload();
      payload['status'] = 'posted';
      expect((component as any).validatePayload(payload)).toContain('Select the Return To Warehouse');
    });

    it('blocks a stale return warehouse name that matches nothing', () => {
      returnLine();
      component.formValues.set({ returnToWarehouse: 'HYD Main WH' });
      const payload = (component as any).buildPayload();
      expect((component as any).validatePayload(payload)).toContain('is not a Warehouse in this company');
    });
  });

  // Workstream B: once a Branch/Warehouse is selected on one of the
  // stockLocationScreenKeys screens, the product list narrows to what's
  // actually in stock there -- reusing sp_get_available_stock (via
  // getAvailableStock) with no productId, a single bulk "which products
  // have stock here" call. Deliberately fails open (full unfiltered list)
  // whenever the location is unresolved, the fetch is still in flight, or it
  // resolves to genuinely zero stocked products -- a filtering bug here
  // reads as "I can't find my product at all," worse than no filter.
  describe('Product filtering scoped to the selected Branch/Warehouse (Workstream B)', () => {
    beforeEach(() => {
      makeComponent(transaction('goodsReceipt', 'Goods Receipt',
        ['Product', 'UOM', 'Received Qty', 'Accepted Qty', 'Rate', 'Amount']));
      (component as any).loadedProductObjects.set([
        { id: 14, product_name: 'Dell Desktop', product_code: 'DD-1' } as any,
        { id: 20, product_name: 'HP Printer', product_code: 'HP-1' } as any
      ]);
    });

    function seedAvailableStock(rows: any[]) {
      return vi.spyOn((component as any).txService, 'getAvailableStock')
        .mockReturnValue(of({ success: true, message: '', data: rows }));
    }

    it('fails open (full list) before any location is selected', () => {
      component.formValues.set({ receivingLocation: '' });
      expect((component as any).lineColumnOptions('Item / SKU')).toEqual(['Dell Desktop', 'HP Printer']);
    });

    it('fails open on the very first read (fetch just kicked off), then narrows once the fetch resolves', () => {
      seedAvailableStock([{ product_id: 14, available: 5 }]);
      component.formValues.set({ receivingLocation: 'Floating WH' }); // UNLINKED_WH, id 9
      // First call reads the pre-fetch cache state (nothing yet) and fails open.
      expect((component as any).productNamesScopedToLocation('goodsReceipt')).toEqual(['Dell Desktop', 'HP Printer']);
      // The stub resolves synchronously, so a second read now sees the
      // narrowed set -- exactly what the next render/change-detection pass
      // would show once the real HTTP call lands.
      expect((component as any).productNamesScopedToLocation('goodsReceipt')).toEqual(['Dell Desktop']);
    });

    it('fails open (full list) when the location resolves to genuinely zero stocked products', () => {
      seedAvailableStock([]);
      component.formValues.set({ receivingLocation: 'Floating WH' });
      (component as any).productNamesScopedToLocation('goodsReceipt'); // kick off + resolve
      expect((component as any).productNamesScopedToLocation('goodsReceipt')).toEqual(['Dell Desktop', 'HP Printer']);
    });

    // Full Warehouse/Branch Independence: a branch pick now resolves
    // straight to { branchId } -- no more "try to find one linked warehouse
    // first" -- so the underlying fetch is scoped by branchId, not warehouseId.
    it('resolves a branch straight to a branch-scoped location -- no more auto-collapse to a linked warehouse', () => {
      seedAvailableStock([{ product_id: 20, available: 3 }]);
      component.formValues.set({ receivingLocation: 'Head Office' }); // SOLO_BRANCH, branch_id 37
      (component as any).productNamesScopedToLocation('goodsReceipt');
      expect((component as any).productNamesScopedToLocation('goodsReceipt')).toEqual(['HP Printer']);
      const spy = (component as any).txService.getAvailableStock as any;
      expect(spy.mock.calls[0][0]).toEqual(expect.objectContaining({ branchId: 37 }));
    });

    it('resolves a directly picked warehouse and filters by that warehouse, unchanged', () => {
      seedAvailableStock([{ product_id: 20, available: 3 }]);
      component.formValues.set({ receivingLocation: 'Floating WH' }); // UNLINKED_WH, id 9
      (component as any).productNamesScopedToLocation('goodsReceipt');
      expect((component as any).productNamesScopedToLocation('goodsReceipt')).toEqual(['HP Printer']);
      const spy = (component as any).txService.getAvailableStock as any;
      expect(spy.mock.calls[0][0]).toEqual(expect.objectContaining({ warehouseId: 9 }));
    });

    it('does not scope Sales Order -- out of scope for Workstream B, stays the plain unfiltered list', () => {
      seedAvailableStock([{ product_id: 14, available: 1 }]);
      component.config = transaction('salesOrder', 'Sales Order', ['Item / SKU']);
      component.formValues.set({ warehouse: 'Secunderabad' });
      expect((component as any).productNamesScopedToLocation('salesOrder')).toEqual(['Dell Desktop', 'HP Printer']);
    });
  });
});
