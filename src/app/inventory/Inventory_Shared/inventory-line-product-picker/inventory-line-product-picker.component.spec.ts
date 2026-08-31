import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { InventoryLineProductPickerComponent } from './inventory-line-product-picker.component';
import { AvailableStock, InventoryTransactionsService } from '../inventory-transactions.service';
import { VariantAttrSelection } from '../inventory-screen-shell/inventory-screen-shell';

// Product Picker popup pilot (Sales Invoice / Purchase Invoice / Stock
// Transfer) -- this is the new shared per-row component, tested against a
// hand-built `host` stub (same @Input({required:true}) host!: any convention
// as InventoryPartyFormComponent/InventoryQuickAddModalComponent) rather than
// the full InventoryScreenShell, so these cases pin down the picker's own
// contract with the host (which methods it calls, in what order, with what
// values) independent of the shell's own 15000+ line implementation.
//
// One regression case below (outside-click vs. an ng-select dropdown panel)
// is coverage for a real bug caught during live verification: ng-select
// panels render outside the individual <ng-select> host element, so the
// outside-click handler must treat option-panel clicks as inside the picker.
describe('InventoryLineProductPickerComponent', () => {
  let fixture: ComponentFixture<InventoryLineProductPickerComponent>;
  let component: InventoryLineProductPickerComponent;
  let host: any;
  let setEntryLineCellCalls: Array<{ rowIndex: number; columnIndex: number; value: any }>;
  let setLineAttrValueCalls: Array<{ rowIndex: number; name: string; value: any }>;
  let getAvailableStockCalls: Array<{ productId?: number | null; variantId?: number | null; attributeValue?: string | null }>;
  let availableStockResult: AvailableStock[];

  // Fixed test column layout -- productColumnIndex/variantColumnIndex are
  // plain @Inputs the real templates pass as
  // host.lineGridSourceColumnIndex('Variant'/'Attribute'); here they're just
  // literal indices into this layout.
  const COLUMNS = ['Product', 'Variant', 'UOM', 'Qty'];
  const colIndex = (name: string) => COLUMNS.indexOf(name);

  function buildHost() {
    const activeLineProductPickerRow = signal<number | null>(null);
    const entryLineRows = signal<string[][]>([['', '', '', '']]);
    const loadedWarehouseObjects = signal<any[]>([]);
    const loadedBranchObjects = signal<any[]>([]);
    const formValues = signal<Record<string, any>>({});

    let productOptions = ['Widget A', 'Widget B'];
    let variantOptions: string[] = [];
    let variantApplies = false;
    let attrSelections: VariantAttrSelection[] = [];
    let resolvedProduct: any = null;
    let variantOptionObjects: Array<{ id: number; label: string; variant_name: string; aliases: string[] }> = [];

    const h: any = {
      activeLineProductPickerRow,
      entryLineRows,
      loadedWarehouseObjects,
      loadedBranchObjects,
      formValues,
      config: { key: 'purchaseInvoice' },
      lineCellValue: (row: string[], column: string) => row[colIndex(column)] ?? '',
      lineColumnOptions: (column: string) => (column === 'Variant' ? variantOptions : productOptions),
      lineColumnAppliesToRow: (_row: string[], column: string) => (column === 'Variant' ? variantApplies : true),
      lineGridCellReadonly: () => false,
      lineRowAttrSelections: () => attrSelections,
      findProductBySelection: (value: string) => (value ? resolvedProduct : null),
      productVariantOptionObjects: () => variantOptionObjects,
      productVariantOptionMatches: (option: any, value: string) => option.label === value,
      setEntryLineCell: (rowIndex: number, columnIndex: number, value: any) => {
        setEntryLineCellCalls.push({ rowIndex, columnIndex, value });
        entryLineRows.update(rows => rows.map((r, i) => {
          if (i !== rowIndex) return r;
          const next = [...r];
          next[columnIndex] = value;
          return next;
        }));
      },
      setLineAttrValue: (rowIndex: number, name: string, value: any) => {
        setLineAttrValueCalls.push({ rowIndex, name, value });
      },
      // Real InventoryScreenShell.productSubtitleFromParts() logic, mirrored
      // here (not a dummy stub) so triggerSubtitle() tests below exercise the
      // exact same join rule the live host applies.
      productSubtitleFromParts: (variantName: string, attrPairs: Array<{ name: string; value: string }>) =>
        [variantName, ...(attrPairs || []).map(p => `${p.name} ${p.value}`)].filter(Boolean).join(' · '),
      // Test-only setters (host is `any`, so these don't need a real type).
      __setVariantApplies: (v: boolean) => { variantApplies = v; },
      __setVariantOptions: (v: string[]) => { variantOptions = v; },
      __setAttrSelections: (v: VariantAttrSelection[]) => { attrSelections = v; },
      __setResolvedProduct: (v: any) => { resolvedProduct = v; },
      __setVariantOptionObjects: (v: any[]) => { variantOptionObjects = v; }
    };
    return h;
  }

  beforeEach(async () => {
    setEntryLineCellCalls = [];
    setLineAttrValueCalls = [];
    getAvailableStockCalls = [];
    availableStockResult = [];
    host = buildHost();

    const txServiceStub: Partial<InventoryTransactionsService> = {
      getAvailableStock: (params: any) => {
        getAvailableStockCalls.push(params);
        return of({ success: true, message: '', data: availableStockResult });
      }
    };

    await TestBed.configureTestingModule({
      imports: [InventoryLineProductPickerComponent],
      providers: [
        provideHttpClient(),
        { provide: InventoryTransactionsService, useValue: txServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryLineProductPickerComponent);
    component = fixture.componentInstance;
    component.host = host;
    component.rowIndex = 0;
    component.column = 'Product';
    component.productColumnIndex = colIndex('Product');
    component.variantColumnIndex = colIndex('Variant');
    component.attributeColumnIndex = -1; // no literal Attribute column in this test layout
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    document.body.querySelectorAll('.inventory-line-product-popup-backdrop').forEach(node => node.remove());
  });

  it('shows "+ Product" on the trigger when no product is picked yet', () => {
    expect((component as any).triggerLabel()).toBe('+ Product');
    expect((component as any).triggerTitle()).toBe('Add product');
  });

  it('composes the compact trigger label from product, variant and non-empty attribute values', () => {
    host.entryLineRows.set([['Widget A', 'Model A', '', '']]);
    host.__setAttrSelections([
      { name: 'Color', value: 'Red', options: ['Red', 'Blue'], isAuto: false },
      { name: 'Size', value: '', options: ['S', 'M'], isAuto: false } // unpicked -- excluded from the label
    ]);
    fixture.detectChanges();
    expect((component as any).triggerLabel()).toBe('Widget A — Model A — Color: Red');
  });

  // Workstream 2 Step A: the trigger's visible text now renders as a bold
  // product name plus a small "Variant · Attr Value" subtitle underneath --
  // the same host.productSubtitleFromParts() join the saved-records
  // drilldown (grnExpandedProductSubtitle) uses, so both places format
  // identically.
  describe('triggerSubtitle() / bold-name-small-subtitle rendering (Workstream 2 Step A)', () => {
    it('composes the subtitle from variant and non-empty attribute values via host.productSubtitleFromParts()', () => {
      host.entryLineRows.set([['Widget A', 'Model A', '', '']]);
      host.__setAttrSelections([
        { name: 'Color', value: 'Red', options: ['Red', 'Blue'], isAuto: false },
        { name: 'Size', value: '', options: ['S', 'M'], isAuto: false } // unpicked -- excluded
      ]);
      fixture.detectChanges();
      expect((component as any).triggerSubtitle()).toBe('Model A · Color Red');
    });

    it('renders <strong> product name and <small class="inventory-grid-subtitle"> in the trigger DOM once a product is picked', () => {
      host.entryLineRows.set([['Widget A', 'Model A', '', '']]);
      host.__setAttrSelections([{ name: 'Color', value: 'Red', options: ['Red', 'Blue'], isAuto: false }]);
      fixture.detectChanges();
      const strong: HTMLElement = fixture.nativeElement.querySelector('.inventory-line-product-trigger-text strong');
      const small: HTMLElement = fixture.nativeElement.querySelector('.inventory-line-product-trigger-text small.inventory-grid-subtitle');
      expect(strong?.textContent).toBe('Widget A');
      expect(small?.textContent).toBe('Model A · Color Red');
    });

    it('renders plain "+ Product" text with no <strong>/<small> when nothing is picked yet', () => {
      fixture.detectChanges();
      const text: HTMLElement = fixture.nativeElement.querySelector('.inventory-line-product-trigger-text');
      expect(text.textContent.trim()).toBe('+ Product');
      expect(text.querySelector('strong')).toBeNull();
      expect(text.querySelector('small')).toBeNull();
    });

    it('omits the <small> subtitle when there is no variant and no attribute to show', () => {
      host.entryLineRows.set([['Widget A', '', '', '']]);
      fixture.detectChanges();
      const text: HTMLElement = fixture.nativeElement.querySelector('.inventory-line-product-trigger-text');
      expect(text.querySelector('strong')?.textContent).toBe('Widget A');
      expect(text.querySelector('small')).toBeNull();
    });
  });

  it('openPopup() sets host.activeLineProductPickerRow to this row and positions the popup at the top modal layer', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
    const fakeButton = document.createElement('button');
    fakeButton.getBoundingClientRect = () => ({ left: 120, top: 200, bottom: 230, right: 260, width: 140, height: 30 } as DOMRect);
    (component as any).openPopup({ currentTarget: fakeButton, stopPropagation: vi.fn() } as unknown as MouseEvent);
    expect(host.activeLineProductPickerRow()).toBe(0);
    expect((component as any).popupLeft()).toBe(260);
    expect((component as any).popupTop()).toBe(12);
  });

  // Regression: a popup opened near the bottom of a scrolled grid, then
  // grown taller once Variant/Attribute fields and stock panels render in
  // (after the async stock query resolves), could end up with its own
  // "Add Product" footer pushed off-screen -- openPopup()'s one-time
  // reclamp only ever measured the popup at its initial (near-empty) size.
  // reclampToViewport() must therefore be re-callable directly (this is
  // what a live ResizeObserver drives in the browser; ResizeObserver itself
  // isn't available in this test environment, see the typeof guard in
  // attachResizeObserver()) and correctly pull the popup back up when its
  // real rendered height would otherwise overflow the viewport.
  it('reclampToViewport() pulls the popup back up when its rendered height would overflow the viewport', () => {
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1600, configurable: true });

    host.activeLineProductPickerRow.set(0);
    (component as any).popupLeft.set(120);
    (component as any).popupTop.set(900); // opened low on a tall page, before the popup grew
    fixture.detectChanges();

    // Simulate the popup having since grown (Variant/Attribute fields +
    // stock panels rendered in) to a height that would now push its footer
    // off the bottom of the viewport if left at top:900.
    const root: HTMLElement = document.body.querySelector('.inventory-line-product-popup') as HTMLElement;
    root.getBoundingClientRect = () => ({ left: 120, top: 900, bottom: 900 + 400, right: 600, width: 480, height: 400 } as DOMRect);
    (component as any).reclampToViewport();

    // maxTop = innerHeight(1000) - rect.height(400) - padding(12) = 588
    expect((component as any).popupTop()).toBe(588);
  });

  it('picking a product calls host.setEntryLineCell with this row and the product column index', () => {
    (component as any).pickProduct('Widget B');
    expect(setEntryLineCellCalls).toEqual([{ rowIndex: 0, columnIndex: colIndex('Product'), value: 'Widget B' }]);
  });

  it('picking a variant calls host.setEntryLineCell with this row and the variant column index', () => {
    (component as any).pickVariant('Model A');
    expect(setEntryLineCellCalls).toEqual([{ rowIndex: 0, columnIndex: colIndex('Variant'), value: 'Model A' }]);
  });

  it('never calls setEntryLineCell for a variant pick when no Variant column exists on this screen (variantColumnIndex < 0)', () => {
    component.variantColumnIndex = -1;
    (component as any).pickVariant('Model A');
    expect(setEntryLineCellCalls).toEqual([]);
  });

  it('picking an attribute value calls host.setLineAttrValue with this row, the attribute name and value', () => {
    (component as any).pickAttribute('Color', 'Blue');
    expect(setLineAttrValueCalls).toEqual([{ rowIndex: 0, name: 'Color', value: 'Blue' }]);
  });

  it('the Variant step only shows when host.lineColumnAppliesToRow(row, "Variant") says so', () => {
    expect((component as any).showVariantStep()).toBe(false);
    host.__setVariantApplies(true);
    // showVariantStep() is a computed() over host.entryLineRows() (via this
    // row's own row() computed) -- __setVariantApplies() above only mutates
    // a plain closure variable inside the host stub's lineColumnAppliesToRow,
    // which carries no signal of its own to invalidate the cached computed.
    // A fresh entryLineRows reference is what actually makes it re-evaluate,
    // exactly like a real row edit would in the live shell.
    host.entryLineRows.set([[...host.entryLineRows()[0]]]);
    fixture.detectChanges();
    expect((component as any).showVariantStep()).toBe(true);
  });

  // Regression: picking still stays open after a real setEntryLineCell round
  // trip (host owns entryLineRows -- the picked value flows back through the
  // same signal this component reads its own state from).
  it('stays open (does not touch activeLineProductPickerRow) after a product pick', () => {
    host.activeLineProductPickerRow.set(0);
    (component as any).pickProduct('Widget A');
    fixture.detectChanges();
    expect(host.activeLineProductPickerRow()).toBe(0);
    expect((component as any).isOpen()).toBe(true);
  });

  it('close() clears activeLineProductPickerRow only when this row is the one currently open', () => {
    host.activeLineProductPickerRow.set(1); // a different row's popup is open
    (component as any).close();
    expect(host.activeLineProductPickerRow()).toBe(1); // untouched

    host.activeLineProductPickerRow.set(0); // this row's popup is open
    (component as any).close();
    expect(host.activeLineProductPickerRow()).toBeNull();
  });

  // The actual bug found live: ng-select option panels are not descendants of
  // the input control itself -- outsideClickHandler must treat a click
  // anywhere inside a `.ng-dropdown-panel` as "inside".
  it('treats a click inside an ng-select dropdown panel as inside the popup', () => {
    host.activeLineProductPickerRow.set(0);
    fixture.detectChanges();

    const panel = document.createElement('div');
    panel.className = 'ng-dropdown-panel';
    const option = document.createElement('div');
    option.className = 'ng-option';
    panel.appendChild(option);

    (component as any).outsideClickHandler({ target: option });
    expect(host.activeLineProductPickerRow()).toBe(0);
  });

  it('closes on a genuine outside click (not the popup, the trigger, or a dropdown panel)', () => {
    host.activeLineProductPickerRow.set(0);
    fixture.detectChanges();

    const outside = document.createElement('div');
    (component as any).outsideClickHandler({ target: outside });
    expect(host.activeLineProductPickerRow()).toBeNull();
  });

  // Full Warehouse/Branch Independence: warehouse-posted rows now build their
  // own independent "By Warehouse" list -- one card per warehouse, never
  // grouped/rolled up under a branch (Warehouse and Branch are fully
  // independent location concepts; loadedWarehouseObjects()/branch_id is not
  // even consulted by warehouseCards() any more).
  it('fetches available stock scoped to the resolved product/variant once the popup opens, and lists warehouse-posted rows one card per warehouse', () => {
    host.__setResolvedProduct({ id: 16 });
    host.entryLineRows.set([['Widget A', 'Model A', '', '']]);
    host.__setVariantOptionObjects([{ id: 5, label: 'Model A', variant_name: 'Model', aliases: ['Model A'] }]);
    host.loadedWarehouseObjects.set([
      { id: 101, company_id: 1, branch_id: 9, warehouse_name: 'HYD Main WH' },
      { id: 102, company_id: 1, branch_id: 11, warehouse_name: 'BLR Store' }
    ]);
    availableStockResult = [
      { product_id: 16, warehouse_id: 101, warehouse_name: 'HYD Main WH', on_hand: 10, pending_dc_qty: 0, available: 10 },
      { product_id: 16, warehouse_id: 102, warehouse_name: 'BLR Store', on_hand: 25, pending_dc_qty: 0, available: 25 }
    ];

    host.activeLineProductPickerRow.set(0);
    fixture.detectChanges();

    expect(getAvailableStockCalls.length).toBeGreaterThan(0);
    const cards = (component as any).warehouseCards();
    expect(cards.map((c: any) => c.warehouseName)).toEqual(['BLR Store', 'HYD Main WH']); // sorted by available desc
    expect(cards[0].available).toBe(25);
    expect(cards[1].available).toBe(10);
    // No branch-only rows in this fixture -- the By Branch list stays empty.
    expect((component as any).branchCards()).toEqual([]);
  });

  // Workstream A / Full Warehouse/Branch Independence: branch-only stock rows
  // (warehouse_id NULL, branch_id set -- e.g. from a Head-Office PI via
  // migration 159's branch-posting path) build the independent "By Branch"
  // list -- one card per branch, built only from rows that carry their own
  // branch_id directly (never derived via a warehouse's branch_id link). The
  // location_type/location_id/location_name fields on AvailableStock make
  // this possible.
  describe('branch-only stock rows (warehouse_id NULL, branch_id set)', () => {
    it('does not collide on track key when two branch-only rows exist for the same pick, and labels each by its own branch/location name', () => {
      host.__setResolvedProduct({ id: 16 });
      host.entryLineRows.set([['Widget A', '', '', '']]);
      availableStockResult = [
        { product_id: 16, warehouse_id: undefined, branch_id: 9, branch_name: 'Head Office', location_type: 'branch', location_id: 9, location_name: 'Head Office', on_hand: 5, pending_dc_qty: 0, available: 5 },
        { product_id: 16, warehouse_id: undefined, branch_id: 11, branch_name: 'Bangalore Branch', location_type: 'branch', location_id: 11, location_name: 'Bangalore Branch', on_hand: 8, pending_dc_qty: 0, available: 8 }
      ];

      host.activeLineProductPickerRow.set(0);
      // Both rows share warehouse_id undefined/null -- this used to be the
      // literal @for track expression (track row.warehouse_id), which
      // Angular throws NG0955 "duplicate track key" for at exactly this
      // point once two such rows coexist.
      expect(() => fixture.detectChanges()).not.toThrow();

      const items = document.body.querySelectorAll('.inv-line-picker-stock-list li');
      expect(items.length).toBe(2);
      const labels = Array.from(items).map(li => li.querySelector('span')?.textContent?.trim());
      expect(labels).toEqual(['Head Office', 'Bangalore Branch']);
    });

    it('attributes a branch-only row directly to its own branch in Stock Across Branches, instead of losing it to an Unassigned/warehouse bucket', () => {
      host.__setResolvedProduct({ id: 16 });
      host.entryLineRows.set([['Widget A', '', '', '']]);
      host.loadedWarehouseObjects.set([
        { id: 101, company_id: 1, branch_id: 9, warehouse_name: 'HYD Main WH' }
      ]);
      host.loadedBranchObjects.set([
        { id: 9, branch_id: 9, company_id: 1, branch_name: 'Head Office', branch_code: 'HO', activity_types: [], is_head_office: true, status: 'active' }
      ]);
      availableStockResult = [
        // Stock posted straight against Head Office itself -- no warehouse
        // at all (fn_post_pi_stock's branch-only path, migration 159).
        { product_id: 16, warehouse_id: undefined, branch_id: 9, branch_name: 'Head Office', location_type: 'branch', location_id: 9, location_name: 'Head Office', on_hand: 12, pending_dc_qty: 0, available: 12 }
      ];

      host.activeLineProductPickerRow.set(0);
      fixture.detectChanges();

      const cards = (component as any).branchCards();
      expect(cards.length).toBe(1);
      expect(cards[0].branchName).toBe('Head Office');
      expect(cards[0].available).toBe(12);
    });

    it('excludes a legacy dual-NULL "Unassigned" row from both lists, keeping only the real branch row in By Branch', () => {
      host.__setResolvedProduct({ id: 16 });
      host.entryLineRows.set([['Widget A', '', '', '']]);
      host.loadedBranchObjects.set([
        { id: 9, branch_id: 9, company_id: 1, branch_name: 'Head Office', branch_code: 'HO', activity_types: [], is_head_office: true, status: 'active' }
      ]);
      availableStockResult = [
        // Legacy row: neither warehouse nor branch ever set on it -- fits
        // neither the By Warehouse nor the By Branch list any more.
        { product_id: 16, warehouse_id: undefined, branch_id: undefined, branch_name: undefined, location_type: 'unassigned', location_id: undefined, location_name: 'Unassigned', on_hand: 3, pending_dc_qty: 0, available: 3 },
        // New branch-primary row for the same product.
        { product_id: 16, warehouse_id: undefined, branch_id: 9, branch_name: 'Head Office', location_type: 'branch', location_id: 9, location_name: 'Head Office', on_hand: 12, pending_dc_qty: 0, available: 12 }
      ];

      host.activeLineProductPickerRow.set(0);
      expect(() => fixture.detectChanges()).not.toThrow();

      expect((component as any).warehouseCards()).toEqual([]);
      const cards = (component as any).branchCards();
      expect(cards.length).toBe(1);
      expect(cards[0].branchName).toBe('Head Office');
      expect(cards[0].available).toBe(12);
    });
  });

  // Regression for a live bug (Dell Computer-I7 / Memory / Speed): with only
  // Product+Variant picked, "Total available" (currentPickTotal(), driven by
  // the scoped currentPickQuery$ -- rendered together with its own
  // per-location rows, e.g. "Hyderabad: 109, Unassigned: 2") correctly
  // showed 111. Once the 3rd attribute (Speed=256) was ALSO picked,
  // currentPickTotal() collapsed to 0 ("No stock recorded for this pick
  // yet"), while the separate, always-unfiltered "By Warehouse" cards
  // (warehouseCards(), driven by branchQuery$, which never sends variantId
  // or attributeValue) kept showing Hyderabad = 109 -- so the same popup
  // simultaneously claimed "no stock" and "109 in Hyderabad" for what a user
  // reads as the same product. The actual root cause was server-side:
  // inventory.sp_get_available_stock excluded legacy stock rows that were
  // never tagged with any attribute_value at all once a specific
  // attribute_value was requested, even though that untagged stock is
  // physically available to satisfy any attribute pick. Fixed in
  // 173_available_stock_untagged_attribute_fallback.sql so those rows count
  // toward any attribute-scoped query instead of vanishing from it. This
  // test pins the frontend half of the contract against the exact response
  // shape the fixed procedure now returns (live-verified via psql for
  // company 53 / product 12 / variant 13, with and without
  // attribute_value='256'): currentPickTotal() must stay 111 -- and must
  // never fall below what the informational By Warehouse card for the same
  // location (Hyderabad, 109) reports -- once the attribute is also picked.
  describe('Total available never disagrees with the By Warehouse breakdown', () => {
    it('currentPickTotal() stays at the full 111 (not 0) once a specific attribute value is also picked, and is never less than a single By Warehouse card', () => {
      host.__setResolvedProduct({ id: 12 });
      host.__setVariantOptionObjects([{ id: 13, label: 'Memory', variant_name: 'Memory', aliases: ['Memory'] }]);
      host.entryLineRows.set([['Dell Computer-I7', 'Memory', '', '']]);

      // Same shape sp_get_available_stock now returns for company 53 /
      // product 12 / variant 13, live-verified via psql both with and
      // without attribute_value='256' after the fix: Hyderabad (warehouse)
      // 109 + Unassigned 2 = 111 either way -- no attribute_value on either
      // row because this stock was never split by attribute.
      const fullStock: AvailableStock[] = [
        { product_id: 12, variant_id: 13, warehouse_id: 4, warehouse_name: 'Hyderabad', location_type: 'warehouse', location_id: 4, location_name: 'Hyderabad', on_hand: 109, pending_dc_qty: 0, available: 109 },
        { product_id: 12, variant_id: 13, warehouse_id: undefined, location_type: 'unassigned', location_id: undefined, location_name: 'Unassigned', on_hand: 2, pending_dc_qty: 0, available: 2 }
      ];
      const txService: any = TestBed.inject(InventoryTransactionsService);
      txService.getAvailableStock = (params: any) => {
        getAvailableStockCalls.push(params);
        return of({ success: true, message: '', data: fullStock });
      };

      // Partial selection first (Variant only, attribute left unpicked) --
      // must show the full 111, matching the reported "correct" state.
      host.activeLineProductPickerRow.set(0);
      fixture.detectChanges();
      expect((component as any).currentPickTotal()).toBe(111);

      // Now also pick the 3rd attribute (Speed=256) -- currentPickTotal()
      // must still be 111, not collapse to 0, and must remain >= the
      // Hyderabad By Warehouse card, which is unaffected by the attribute
      // pick (branchQuery$ never sends variantId/attributeValue).
      host.__setAttrSelections([{ name: 'Speed', value: '256', options: ['516', '256', '128'], isAuto: false }]);
      host.entryLineRows.set([[...host.entryLineRows()[0]]]); // fresh reference, see showVariantStep() note above
      fixture.detectChanges();

      expect((component as any).currentPickTotal()).toBe(111);
      const hyderabadCard = (component as any).warehouseCards().find((c: any) => c.warehouseName === 'Hyderabad');
      expect(hyderabadCard.available).toBe(109);
      expect((component as any).currentPickTotal()).toBeGreaterThanOrEqual(hyderabadCard.available);
    });
  });

  // "Current Warehouse" / "Current Branch" labeling (informational only --
  // cards stay non-clickable either way). Full Warehouse/Branch Independence:
  // Warehouse and Branch are fully independent location concepts now, so a
  // picked WAREHOUSE only ever highlights a By Warehouse card, never a
  // By Branch one (no more "warehouse -> its branch" resolution anywhere).
  // Purchase Invoice's merged Warehouse/Branch field is 'receivingLocation'.
  it('labels the warehouse card matching the transaction\'s own current warehouse (Purchase Invoice: receivingLocation)', () => {
    host.__setResolvedProduct({ id: 16 });
    host.entryLineRows.set([['Widget A', '', '', '']]);
    host.config = { key: 'purchaseInvoice' };
    host.formValues.set({ receivingLocation: 'HYD Main WH' });
    host.loadedWarehouseObjects.set([
      { id: 101, company_id: 1, branch_id: 9, warehouse_name: 'HYD Main WH' },
      { id: 102, company_id: 1, branch_id: 11, warehouse_name: 'BLR Store' }
    ]);
    availableStockResult = [
      { product_id: 16, warehouse_id: 101, warehouse_name: 'HYD Main WH', on_hand: 10, pending_dc_qty: 0, available: 10 },
      { product_id: 16, warehouse_id: 102, warehouse_name: 'BLR Store', on_hand: 25, pending_dc_qty: 0, available: 25 }
    ];

    host.activeLineProductPickerRow.set(0);
    fixture.detectChanges();

    const cards = (component as any).warehouseCards();
    const hyd = cards.find((c: any) => c.warehouseName === 'HYD Main WH');
    const blr = cards.find((c: any) => c.warehouseName === 'BLR Store');
    expect(hyd.isCurrentWarehouse).toBe(true);
    expect(blr.isCurrentWarehouse).toBe(false);

    // Also confirm the actual DOM: the badge renders as a real element with
    // the right text, attached to the HYD Main WH card only -- not just that
    // the underlying signal computed the right boolean.
    const badges = document.body.querySelectorAll('.inv-line-picker-current-badge');
    expect(badges.length).toBe(1);
    expect(badges[0].textContent.trim()).toBe('Current Warehouse');
    const currentCard = document.body.querySelector('.inv-line-picker-branch-card--current');
    expect(currentCard?.textContent).toContain('HYD Main WH');
    expect(currentCard?.textContent).not.toContain('BLR Store');
  });

  it('resolves the current warehouse from Stock Transfer\'s "fromWarehouse" field', () => {
    host.__setResolvedProduct({ id: 16 });
    host.entryLineRows.set([['Widget A', '', '', '']]);
    host.config = { key: 'stockTransfer' };
    host.formValues.set({ fromWarehouse: 'BLR Store' });
    host.loadedWarehouseObjects.set([{ id: 102, company_id: 1, branch_id: 11, warehouse_name: 'BLR Store' }]);
    availableStockResult = [
      { product_id: 16, warehouse_id: 102, warehouse_name: 'BLR Store', on_hand: 25, pending_dc_qty: 0, available: 25 }
    ];

    host.activeLineProductPickerRow.set(0);
    fixture.detectChanges();

    expect((component as any).warehouseCards()[0].isCurrentWarehouse).toBe(true);
  });

  // Sales Invoice's own Warehouse/Branch picker (formValues['warehouse']) and
  // its separate Interbranch Sale Branch field (formValues['branch'],
  // relevant only once Interbranch Sale is on) are two unrelated fields --
  // each list only ever lights up for the kind of location actually picked
  // in whichever field is currently in play, never cross-resolved.
  it('resolves the current warehouse/branch from Sales Invoice\'s "branch" field only when Interbranch Sale is on, else "warehouse" -- each list highlights only its own kind', () => {
    host.__setResolvedProduct({ id: 16 });
    host.entryLineRows.set([['Widget A', '', '', '']]);
    host.config = { key: 'salesInvoice' };
    host.loadedWarehouseObjects.set([{ id: 102, company_id: 1, branch_id: 11, warehouse_name: 'BLR Store' }]);
    host.loadedBranchObjects.set([
      { id: 11, branch_id: 11, company_id: 1, branch_name: 'Bangalore Branch', branch_code: 'B26001', activity_types: [], is_head_office: false, status: 'active' }
    ]);
    availableStockResult = [
      { product_id: 16, warehouse_id: 102, warehouse_name: 'BLR Store', on_hand: 25, pending_dc_qty: 0, available: 25 },
      // Bangalore Branch also carries its own DIRECT stock (branch_id set,
      // warehouse_id NULL) -- unrelated to the BLR Store warehouse row above.
      { product_id: 16, warehouse_id: undefined, branch_id: 11, branch_name: 'Bangalore Branch', location_type: 'branch', location_id: 11, location_name: 'Bangalore Branch', on_hand: 7, pending_dc_qty: 0, available: 7 }
    ];

    // Interbranch off -- resolves off the plain 'warehouse' field, which
    // names a warehouse: only the By Warehouse card lights up.
    host.formValues.set({ interbranchSale: 'No', warehouse: 'BLR Store', branch: '' });
    host.activeLineProductPickerRow.set(0);
    fixture.detectChanges();
    expect((component as any).warehouseCards()[0].isCurrentWarehouse).toBe(true);
    expect((component as any).branchCards()[0].isCurrentBranch).toBe(false);

    // Interbranch on -- 'branch' now takes priority and names a branch
    // directly: only the By Branch card lights up.
    host.formValues.set({ interbranchSale: 'Yes', warehouse: 'BLR Store', branch: 'Bangalore Branch' });
    fixture.detectChanges();
    expect((component as any).warehouseCards()[0].isCurrentWarehouse).toBe(false);
    expect((component as any).branchCards()[0].isCurrentBranch).toBe(true);
  });

  // New behaviour: an explicit "Add Product" confirm button, instead of the
  // popup closing itself the instant the last required field is picked.
  // canAddProduct() gates that button -- it must stay in lockstep with what
  // the template actually renders as an editable field vs. a static/auto
  // value (see the @if branches for Variant and each Attribute above).
  describe('explicit "Add Product" confirm', () => {
    it('is disabled with nothing picked yet, and does not close the popup if clicked anyway', () => {
      host.activeLineProductPickerRow.set(0);
      fixture.detectChanges();
      expect((component as any).canAddProduct()).toBe(false);

      (component as any).addProduct();
      expect(host.activeLineProductPickerRow()).toBe(0); // untouched -- still open
    });

    it('is enabled once a product is picked when the screen has no Variant/Attribute steps', () => {
      host.entryLineRows.set([['Widget A', '', '', '']]);
      fixture.detectChanges();
      expect((component as any).canAddProduct()).toBe(true);
    });

    it('stays disabled until Variant is also picked when the Variant step applies to this row', () => {
      host.__setVariantApplies(true);
      host.entryLineRows.set([['Widget A', '', '', '']]);
      fixture.detectChanges();
      expect((component as any).canAddProduct()).toBe(false);

      host.entryLineRows.set([['Widget A', 'Model A', '', '']]);
      fixture.detectChanges();
      expect((component as any).canAddProduct()).toBe(true);
    });

    it('does not require a Variant value when the Variant field is readonly (pre-filled by the shell)', () => {
      host.__setVariantApplies(true);
      host.lineGridCellReadonly = () => true;
      host.entryLineRows.set([['Widget A', '', '', '']]);
      fixture.detectChanges();
      expect((component as any).canAddProduct()).toBe(true);
    });

    it('stays disabled until every non-auto, non-readonly Attribute also has a value', () => {
      host.entryLineRows.set([['Widget A', '', '', '']]);
      host.__setAttrSelections([
        { name: 'Color', value: '', options: ['Red', 'Blue'], isAuto: false }
      ]);
      fixture.detectChanges();
      expect((component as any).canAddProduct()).toBe(false);

      host.__setAttrSelections([
        { name: 'Color', value: 'Red', options: ['Red', 'Blue'], isAuto: false }
      ]);
      // Same pattern as the showVariantStep test above -- a fresh
      // entryLineRows reference is what makes the attrSelections() computed
      // re-evaluate against the stub's updated closure variable.
      host.entryLineRows.set([[...host.entryLineRows()[0]]]);
      fixture.detectChanges();
      expect((component as any).canAddProduct()).toBe(true);
    });

    it('does not require a value for an auto-resolved (single-option) Attribute', () => {
      host.entryLineRows.set([['Widget A', '', '', '']]);
      host.__setAttrSelections([
        { name: 'Size', value: 'One Size', options: ['One Size'], isAuto: true }
      ]);
      fixture.detectChanges();
      expect((component as any).canAddProduct()).toBe(true);
    });

    it('addProduct() closes the popup (finalizing the row) once the pick is complete', () => {
      host.activeLineProductPickerRow.set(0);
      host.entryLineRows.set([['Widget A', '', '', '']]);
      fixture.detectChanges();
      expect((component as any).canAddProduct()).toBe(true);

      (component as any).addProduct();
      expect(host.activeLineProductPickerRow()).toBeNull();
    });

    it('renders the "Add Product" button as disabled/enabled in the DOM in lockstep with canAddProduct()', () => {
      host.activeLineProductPickerRow.set(0);
      fixture.detectChanges();
      let button: HTMLButtonElement = document.body.querySelector('.inv-line-picker-add-btn') as HTMLButtonElement;
      expect(button.disabled).toBe(true);

      host.entryLineRows.set([['Widget A', '', '', '']]);
      fixture.detectChanges();
      button = document.body.querySelector('.inv-line-picker-add-btn') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });
  });

  // Item 4: a dimmed backdrop behind the top modal popup, matching the
  // shared `.inventory-modal-backdrop` class every other app modal renders.
  it('renders the shared modal backdrop behind the popup while open, and not at all while closed', () => {
    expect(document.body.querySelector('.inventory-line-product-popup-backdrop')).toBeNull();

    host.activeLineProductPickerRow.set(0);
    fixture.detectChanges();
    const backdrop = document.body.querySelector('.inventory-line-product-popup-backdrop') as HTMLElement;
    expect(backdrop).not.toBeNull();
    expect(backdrop.querySelector('.inventory-line-product-popup')).not.toBeNull();
  });
});
