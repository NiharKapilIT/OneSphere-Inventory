import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Item 26: "Procurement give quick add master at grid header which should
// redirect to product master once saved again should come back to
// procurement screen (GRN or PI)". GRN/PI's line-item grid header gets a new
// "Add Product" trigger (addProductFromProcurementGrid()) that does a real
// Angular Router navigation to the actual Product Master screen instead of
// opening the lightweight InventoryQuickAddModalComponent used everywhere
// else — that modal is completely untouched by this item, see the sibling
// quick-add specs (inventory-screen-shell.party-quick-add.spec.ts,
// inventory-screen-shell.contact-quick-add.spec.ts) for its own coverage.
//
// The in-progress GRN/PI is preserved via a sessionStorage snapshot rather
// than the existing "Save Draft" DB round trip: investigation of
// validatePayload() found GRN/PI's Draft-save validation unconditionally
// requires vendor/branch-warehouse and at least one line with a product
// already selected (validateGrnLineItems()) — exactly the state the user is
// in the moment they need this button, since the product they're trying to
// add doesn't exist yet. A forced Draft save at that moment would routinely
// fail validation and block the feature it exists for, so persistence here
// deliberately does not depend on the backend validating cleanly.
describe('InventoryScreenShell — GRN/PI "Add Product" routes to Product Master and back (item 26)', () => {
  const grnConfig: InventoryScreenConfig = {
    key: 'goodsReceipt',
    title: 'Goods Receipt Note (GRN)',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-download',
    lineColumns: ['Product', 'Variant', 'Attribute', 'UOM', 'Received Qty', 'Accepted Qty', 'Rate', 'Disc %', 'GST', 'Batch No', 'Serial No', 'Expiry Date', 'Amount']
  };

  const piConfig: InventoryScreenConfig = {
    key: 'purchaseInvoice',
    title: 'Purchase Invoice',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-receipt',
    lineColumns: ['Product', 'Variant', 'Attribute', 'UOM', 'Qty', 'Received Qty', 'Accepted Qty', 'Rate', 'MRP', 'Selling Price', 'Disc %', 'GST', 'Batch No', 'Serial No', 'Expiry Date', 'Amount']
  };

  const productMasterConfig: InventoryScreenConfig = {
    key: 'productServiceMaster',
    title: 'Product / Service Master',
    subtitle: '',
    kind: 'master',
    icon: 'pi pi-box'
  };

  function createComponent(config: InventoryScreenConfig, queryParams: Record<string, string> = {}) {
    const router = { navigate: vi.fn() };
    const activatedRoute = { snapshot: { queryParamMap: convertToParamMap(queryParams) } };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [
        provideHttpClient(),
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: activatedRoute }
      ]
    });

    const fixture = TestBed.createComponent(InventoryScreenShell);
    const component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
    return { fixture, component, router };
  }

  const storageKeyFor = (key: string) => `inv_procurement_resume::${key}`;

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('addProductFromProcurementGrid() — leaving GRN/PI', () => {
    it('snapshots the in-progress GRN and navigates to Product Master carrying return context', () => {
      const { component, router } = createComponent(grnConfig);
      component.formValues.set({ vendor: 'Acme Supplies', vendorId: 5, receivingLocation: 'HYD Main WH' });
      component.entryLineRows.set([['', '', '', 'Nos', '', '', '', '', '', '', '', '', '']]);

      component.addProductFromProcurementGrid();

      expect(router.navigate).toHaveBeenCalledWith(
        ['/dashboard/inventory/masters/product-service-master'],
        { queryParams: { returnTo: 'goodsReceipt', returnRoute: '/dashboard/inventory/transactions/goods-receipt' } }
      );
      const raw = sessionStorage.getItem(storageKeyFor('goodsReceipt'));
      expect(raw).toBeTruthy();
      const snap = JSON.parse(raw!);
      expect(snap.formValues.vendor).toBe('Acme Supplies');
      expect(snap.entryLineRows).toEqual([['', '', '', 'Nos', '', '', '', '', '', '', '', '', '']]);
    });

    it('snapshots the in-progress PI and navigates to Product Master carrying return context', () => {
      const { component, router } = createComponent(piConfig);
      component.formValues.set({ vendor: 'Acme Supplies', piNo: 'PI-0091' });

      component.addProductFromProcurementGrid();

      expect(router.navigate).toHaveBeenCalledWith(
        ['/dashboard/inventory/masters/product-service-master'],
        { queryParams: { returnTo: 'purchaseInvoice', returnRoute: '/dashboard/inventory/transactions/purchase-invoice' } }
      );
      expect(sessionStorage.getItem(storageKeyFor('purchaseInvoice'))).toBeTruthy();
    });

    it('preserves an already-set editingId (an existing saved draft being edited) in the snapshot', () => {
      const { component } = createComponent(grnConfig);
      component.editingId.set(777);
      component.formValues.set({ vendor: 'Acme Supplies' });

      component.addProductFromProcurementGrid();

      const snap = JSON.parse(sessionStorage.getItem(storageKeyFor('goodsReceipt'))!);
      expect(snap.editingId).toBe(777);
    });

    it('is a no-op on a screen other than GRN/PI (this feature never touches other quick-add triggers)', () => {
      const { component, router } = createComponent(productMasterConfig);
      component.addProductFromProcurementGrid();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(sessionStorage.length).toBe(0);
    });
  });

  // The same trip, now offered on every enabled screen that can trigger a
  // Product quick-add. It had to be: the quick-add modal's own
  // 'Product / Service' branch is a static mock with no [ngModel] and no save
  // handler, so on the screens below the "+" opened a popup that could never
  // create anything — and inside the line product picker the button called
  // addProductFromProcurementGrid(), which returned silently because the
  // screen had no return route registered.
  describe('every enabled screen with a Product "+" reaches Product Master (and back)', () => {
    const cases: Array<[string, string]> = [
      ['purchaseReturn', '/dashboard/inventory/transactions/purchase-return'],
      ['salesOrder', '/dashboard/inventory/transactions/sales-order'],
      ['deliveryChallan', '/dashboard/inventory/transactions/delivery-challan'],
      ['salesReturn', '/dashboard/inventory/transactions/sales-return'],
      ['stockAdjustment', '/dashboard/inventory/transactions/stock-adjustment'],
      ['productionPlanning', '/dashboard/inventory/transactions/production-planning'],
      ['materialIssueProduction', '/dashboard/inventory/transactions/material-issue-production'],
      ['productionEntry', '/dashboard/inventory/transactions/production-entry'],
      ['productionReturn', '/dashboard/inventory/transactions/production-return'],
      ['bomMaster', '/dashboard/inventory/masters/bom-master'],
      ['priceListMaster', '/dashboard/inventory/masters/price-list-master'],
      ['barcodeConfiguration', '/dashboard/inventory/masters/barcode-configuration']
    ];

    for (const [key, route] of cases) {
      it(`${key}: navigates to Product Master carrying its own return route`, () => {
        const { component, router } = createComponent({
          key,
          title: key,
          subtitle: '',
          kind: key.endsWith('Master') || key === 'barcodeConfiguration' ? 'master' : 'transaction',
          icon: 'pi pi-box'
        } as InventoryScreenConfig);

        component.addProductFromProcurementGrid();

        expect(router.navigate).toHaveBeenCalledWith(
          ['/dashboard/inventory/masters/product-service-master'],
          { queryParams: { returnTo: key, returnRoute: route } }
        );
      });

      it(`${key}: Product Master navigates back to it after a successful save`, async () => {
        const { component, router } = createComponent(productMasterConfig, { returnTo: key, returnRoute: route });
        vi.spyOn(component as any, 'validatePayload').mockReturnValue('');
        vi.spyOn((component as any).inventoryConfigService, 'saveProduct')
          .mockReturnValue(of({ success: true, data: { id: 900, product_name: 'Round Trip' } }));

        component.saveConfigRecord();
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

        expect(router.navigate).toHaveBeenCalledWith([route], { queryParams: { resumed: '1', createdProduct: 'Round Trip' } });
      });
    }

    // A product needs nature, UOM, HSN, category and tracking policies before a
    // line can use it — too much for a cut-down inline form — so the line grid's
    // create affordance takes the full round trip instead, and the product it
    // creates lands back in the cell the user was typing into.
    describe('round trip from a line grid cell', () => {
      const grnLineConfig: InventoryScreenConfig = {
        key: 'goodsReceipt', title: 'GRN', subtitle: '', kind: 'transaction', icon: 'pi pi-download',
        lineColumns: ['Product', 'UOM', 'Qty']
      };

      it('carries the typed name and the exact cell out to Product Master', () => {
        const { component, router } = createComponent(grnLineConfig);
        component.entryLineRows.set([['', 'Nos', ''], ['', 'Nos', '']]);

        component.addProductFromLineProductPicker({ rowIndex: 1, columnIndex: 0, productName: 'Copper Wire' });

        expect(router.navigate).toHaveBeenCalledWith(
          ['/dashboard/inventory/masters/product-service-master'],
          { queryParams: { returnTo: 'goodsReceipt', returnRoute: '/dashboard/inventory/transactions/goods-receipt', productName: 'Copper Wire' } }
        );
        const snap = JSON.parse(sessionStorage.getItem(storageKeyFor('goodsReceipt'))!);
        expect(snap.pendingLine).toEqual({ rowIndex: 1, columnIndex: 0, productName: 'Copper Wire' });
      });

      it('Product Master opens with that name already filled in', () => {
        const { component } = createComponent(productMasterConfig, {
          returnTo: 'goodsReceipt',
          returnRoute: '/dashboard/inventory/transactions/goods-receipt',
          productName: 'Copper Wire'
        });

        expect(component.productName()).toBe('Copper Wire');
        expect(component.formValues()['productName']).toBe('Copper Wire');
      });

      it('sends the saved product name back on the return leg', async () => {
        const { component, router } = createComponent(productMasterConfig, {
          returnTo: 'goodsReceipt',
          returnRoute: '/dashboard/inventory/transactions/goods-receipt',
          productName: 'Copper Wire'
        });
        vi.spyOn(component as any, 'validatePayload').mockReturnValue('');
        vi.spyOn((component as any).inventoryConfigService, 'saveProduct')
          .mockReturnValue(of({ success: true, data: { id: 601, product_name: 'Copper Wire' } }));

        component.saveConfigRecord();
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

        expect(router.navigate).toHaveBeenCalledWith(
          ['/dashboard/inventory/transactions/goods-receipt'],
          { queryParams: { resumed: '1', createdProduct: 'Copper Wire' } }
        );
      });

      it('drops the created product into the row it was started from', async () => {
        sessionStorage.setItem(storageKeyFor('goodsReceipt'), JSON.stringify({
          formValues: { vendor: 'Acme Supplies' },
          entryLineRows: [['LED Display', 'Nos', '2'], ['', 'Nos', '']],
          editingId: null,
          pendingLine: { rowIndex: 1, columnIndex: 0, productName: 'Copper Wire' },
          savedAt: Date.now()
        }));

        const { component } = createComponent(grnLineConfig, { resumed: '1', createdProduct: 'Copper Wire' });
        const setCell = vi.spyOn(component, 'setEntryLineCell');
        await new Promise(resolve => setTimeout(resolve));

        expect(component.formValues()['vendor']).toBe('Acme Supplies');
        expect(setCell).toHaveBeenCalledWith(1, 0, 'Copper Wire');
      });

      it('restores the document but touches no cell when the user came back without saving', async () => {
        sessionStorage.setItem(storageKeyFor('goodsReceipt'), JSON.stringify({
          formValues: { vendor: 'Acme Supplies' },
          entryLineRows: [['', 'Nos', '']],
          editingId: null,
          pendingLine: { rowIndex: 0, columnIndex: 0, productName: 'Copper Wire' },
          savedAt: Date.now()
        }));

        // No createdProduct — Product Master was abandoned.
        const { component } = createComponent(grnLineConfig, { resumed: '1' });
        const setCell = vi.spyOn(component, 'setEntryLineCell');
        await new Promise(resolve => setTimeout(resolve));

        expect(component.formValues()['vendor']).toBe('Acme Supplies');
        expect(setCell).not.toHaveBeenCalled();
      });
    });

    it('the line product picker only offers "Open Product Master" where the trip is wired', () => {
      const wired = createComponent({
        key: 'salesReturn', title: '', subtitle: '', kind: 'transaction', icon: 'pi pi-box'
      } as InventoryScreenConfig).component;
      const unwired = createComponent({
        key: 'cycleCount', title: '', subtitle: '', kind: 'transaction', icon: 'pi pi-box'
      } as InventoryScreenConfig).component;

      expect(wired.canAddProductFromThisScreen()).toBe(true);
      expect(unwired.canAddProductFromThisScreen()).toBe(false);
    });
  });

  describe('returning to GRN/PI from Product Master (?resumed=1)', () => {
    it('restores the exact in-progress GRN form/grid state and consumes the one-shot snapshot', () => {
      sessionStorage.setItem(storageKeyFor('goodsReceipt'), JSON.stringify({
        formValues: { vendor: 'Acme Supplies', vendorId: 5 },
        entryLineRows: [['New Widget', '', '', 'Nos', '10', '10', '100', '', '', '', '', '', '1000']],
        editingId: null,
        savedAt: Date.now()
      }));

      const { component } = createComponent(grnConfig, { resumed: '1' });

      expect(component.formValues()).toEqual({ vendor: 'Acme Supplies', vendorId: 5 });
      expect(component.entryLineRows()).toEqual([['New Widget', '', '', 'Nos', '10', '10', '100', '', '', '', '', '', '1000']]);
      expect(sessionStorage.getItem(storageKeyFor('goodsReceipt'))).toBeNull();
    });

    it('restores editingId when the snapshot carried one (was already an existing saved draft)', () => {
      sessionStorage.setItem(storageKeyFor('purchaseInvoice'), JSON.stringify({
        formValues: { vendor: 'Acme Supplies' },
        entryLineRows: [],
        editingId: 321,
        savedAt: Date.now()
      }));

      const { component } = createComponent(piConfig, { resumed: '1' });

      expect(component.editingId()).toBe(321);
    });

    it('does not restore on a normal visit with no ?resumed=1, even with a stale snapshot present', () => {
      sessionStorage.setItem(storageKeyFor('goodsReceipt'), JSON.stringify({
        formValues: { vendor: 'Should Not Appear' },
        entryLineRows: [['Ghost Row']],
        editingId: null,
        savedAt: Date.now()
      }));

      const { component } = createComponent(grnConfig); // no query params — an ordinary visit

      expect(component.formValues()).toEqual({});
      // Left untouched rather than silently auto-applied — an abandoned
      // detour (tab closed mid-flow) should never surface on some later,
      // unrelated visit to this screen.
      expect(sessionStorage.getItem(storageKeyFor('goodsReceipt'))).toBeTruthy();
    });

    it('discards an expired (>30 min old) snapshot instead of restoring it', () => {
      sessionStorage.setItem(storageKeyFor('goodsReceipt'), JSON.stringify({
        formValues: { vendor: 'Too Old' },
        entryLineRows: [],
        editingId: null,
        savedAt: Date.now() - 31 * 60 * 1000
      }));

      const { component } = createComponent(grnConfig, { resumed: '1' });

      expect(component.formValues()).toEqual({});
      expect(sessionStorage.getItem(storageKeyFor('goodsReceipt'))).toBeNull();
    });
  });

  describe('Product Master save — navigates back only when it actually arrived via this flow', () => {
    it('navigates back to GRN with ?resumed=1 after a successful save that carried returnTo/returnRoute', async () => {
      const { component, router } = createComponent(productMasterConfig, {
        returnTo: 'goodsReceipt',
        returnRoute: '/dashboard/inventory/transactions/goods-receipt'
      });
      vi.spyOn(component as any, 'validatePayload').mockReturnValue('');
      vi.spyOn((component as any).inventoryConfigService, 'saveProduct')
        .mockReturnValue(of({ success: true, data: { id: 555, product_name: 'New Widget' } }));

      component.saveConfigRecord();
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

      expect(router.navigate).toHaveBeenCalledWith(
        ['/dashboard/inventory/transactions/goods-receipt'],
        { queryParams: { resumed: '1', createdProduct: 'New Widget' } }
      );
    });

    it('navigates back to PI with ?resumed=1 when returnTo=purchaseInvoice', async () => {
      const { component, router } = createComponent(productMasterConfig, {
        returnTo: 'purchaseInvoice',
        returnRoute: '/dashboard/inventory/transactions/purchase-invoice'
      });
      vi.spyOn(component as any, 'validatePayload').mockReturnValue('');
      vi.spyOn((component as any).inventoryConfigService, 'saveProduct')
        .mockReturnValue(of({ success: true, data: { id: 556, product_name: 'New Widget 2' } }));

      component.saveConfigRecord();
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

      expect(router.navigate).toHaveBeenCalledWith(
        ['/dashboard/inventory/transactions/purchase-invoice'],
        { queryParams: { resumed: '1', createdProduct: 'New Widget 2' } }
      );
    });

    it('does not navigate on a normal/unrelated Product Master save (no returnTo) — untouched standalone usage', async () => {
      const { component, router } = createComponent(productMasterConfig);
      vi.spyOn(component as any, 'validatePayload').mockReturnValue('');
      vi.spyOn((component as any).inventoryConfigService, 'saveProduct')
        .mockReturnValue(of({ success: true, data: { id: 557, product_name: 'Unrelated Save' } }));

      component.saveConfigRecord();
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('does not navigate when the save fails, even with returnTo present', async () => {
      const { component, router } = createComponent(productMasterConfig, {
        returnTo: 'purchaseInvoice',
        returnRoute: '/dashboard/inventory/transactions/purchase-invoice'
      });
      vi.spyOn(component as any, 'validatePayload').mockReturnValue('');
      vi.spyOn((component as any).inventoryConfigService, 'saveProduct')
        .mockReturnValue(of({ success: false, message: 'Duplicate product code' }));

      component.saveConfigRecord();
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
