import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// A Branch picked on a stock-moving document used to leave the payload's
// warehouse id NULL. Every posting function matches its stock rows with
//     COALESCE(warehouse_id, 0) = COALESCE(<doc>.warehouse_id, 0)
// so a NULL document warehouse matched every OTHER stock row that also had a
// NULL warehouse — company-wide. Postings therefore landed in one shared,
// cross-document, cross-branch "Unassigned" pool instead of a real location.
//
// A branch selection now resolves through the existing inv_warehouses
// .branch_id link (N:1). Exactly one linked warehouse resolves transparently;
// zero or several is refused with a validation message rather than guessed at.
describe('InventoryScreenShell — Branch selection resolves to a real warehouse', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  // branch_id here is the GLOBAL branch id (global.branches.id), which is what
  // inv_warehouses.branch_id actually FKs to — deliberately different numbers
  // from the branches' own local inv_branch_config ids below.
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

    it('resolves a branch with exactly one linked warehouse to that warehouse', () => {
      component.formValues.set({ receivingLocation: 'Head Office', vendor: 'Test Vendor' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBe(6);
      expect(payload['warehouse_name']).toBe('Secunderabad');
      // The document really is at that branch — only the NULL warehouse is fixed.
      expect(payload['branch_id']).toBe(37);
      expect(payload['branch_name']).toBe('Head Office');
      expect((component as any).validatePayload(payload)).toBe('');
    });

    it('never leaves warehouse_id NULL for a branch selection', () => {
      component.formValues.set({ receivingLocation: 'Head Office' });
      expect((component as any).buildPayload()['warehouse_id']).not.toBeNull();
    });

    it('blocks the save when the branch has more than one linked warehouse', () => {
      component.formValues.set({ receivingLocation: 'Hanamkonda' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBeFalsy();
      const message = (component as any).validatePayload(payload);
      expect(message).toContain('Hanamkonda has 2 warehouses');
      expect(message).toContain('Warangal Main');
      expect(message).toContain('Warangal Annex');
    });

    it('blocks the save when the branch has no linked warehouse', () => {
      component.formValues.set({ receivingLocation: 'Nizamabad' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBeFalsy();
      expect((component as any).validatePayload(payload)).toContain('no Warehouse linked to it');
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

    it('resolves a single-warehouse branch instead of writing NULL', () => {
      component.formValues.set({ receivingLocation: 'Head Office' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBe(6);
      expect(payload['branch_id']).toBe(37);
    });

    it('blocks an ambiguous branch', () => {
      component.formValues.set({ receivingLocation: 'Hanamkonda' });
      const payload = (component as any).buildPayload();
      expect((component as any).validatePayload(payload)).toContain('has 2 warehouses');
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

    it('resolves a single-warehouse branch into from_warehouse_id', () => {
      component.formValues.set({ fromWarehouse: 'Head Office' });
      const payload = (component as any).buildPayload();
      expect(payload['from_warehouse_id']).toBe(6);
      expect(payload['from_warehouse_name']).toBe('Secunderabad');
      expect(payload['branch_id']).toBe(37);
    });

    it('blocks a branch with no linked warehouse', () => {
      component.formValues.set({ fromWarehouse: 'Nizamabad' });
      const payload = (component as any).buildPayload();
      expect(payload['from_warehouse_id']).toBeFalsy();
      expect((component as any).validatePayload(payload)).toContain('no Warehouse linked to it');
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

  describe('Sales Invoice (separate Warehouse + interbranch Branch fields)', () => {
    beforeEach(() => makeComponent(transaction('salesInvoice', 'Sales Invoice',
      ['Item / SKU', 'Variant', 'Attribute', 'UOM', 'Qty', 'Rate', 'MRP', 'Selling Price', 'Disc %', 'GST', 'Batch No', 'Serial No', 'Expiry Date', 'Warehouse', 'Amount'])));

    function stockLine(): void {
      component.entryLineRows.set([
        ['Dell Desktop', '', '', 'Nos', '2', '100', '200', '150', '0', '0%', '', '', '', '', '200']
      ]);
    }

    it('falls back to the interbranch branch\'s single warehouse when Warehouse is empty', () => {
      stockLine();
      component.formValues.set({ interbranchSale: 'Yes', branch: 'Head Office' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBe(6);
      expect(payload['warehouse_name']).toBe('Secunderabad');
    });

    it('blocks an ambiguous branch rather than posting to Unassigned', () => {
      stockLine();
      component.formValues.set({ interbranchSale: 'Yes', branch: 'Hanamkonda', status: 'Posted' });
      const payload = (component as any).buildPayload();
      expect(payload['warehouse_id']).toBeFalsy();
      expect((component as any).validatePayload(payload)).toContain('has 2 warehouses');
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

  describe('Sales Return', () => {
    beforeEach(() => makeComponent(transaction('salesReturn', 'Sales Return',
      ['Product', 'Variant', 'Attribute', 'Invoiced Qty', 'Return Qty', 'UOM', 'Rate', 'GST', 'Batch No', 'Serial No', 'Expiry Date', 'Return Amount', 'Reason'])));

    function returnLine(): void {
      component.entryLineRows.set([
        ['Dell Desktop', '', '', '2', '1', 'Nos', '100', '0%', '', '', '', '100', 'Quality Issue']
      ]);
    }

    it('resolves a branch name in Return To Warehouse to its single warehouse', () => {
      returnLine();
      component.formValues.set({ returnToWarehouse: 'Head Office' });
      const payload = (component as any).buildPayload();
      expect(payload['return_to_warehouse_id']).toBe(6);
      expect(payload['return_to_warehouse_name']).toBe('Secunderabad');
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
});
