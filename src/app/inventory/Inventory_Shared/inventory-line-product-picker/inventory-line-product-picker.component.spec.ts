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

  it('fetches available stock scoped to the resolved product/variant once the popup opens, and groups cross-branch rows by branch', () => {
    host.__setResolvedProduct({ id: 16 });
    host.entryLineRows.set([['Widget A', 'Model A', '', '']]);
    host.__setVariantOptionObjects([{ id: 5, label: 'Model A', variant_name: 'Model', aliases: ['Model A'] }]);
    host.loadedWarehouseObjects.set([
      { id: 101, company_id: 1, branch_id: 9, warehouse_name: 'HYD Main WH' },
      { id: 102, company_id: 1, branch_id: 11, warehouse_name: 'BLR Store' }
    ]);
    host.loadedBranchObjects.set([
      { id: 9, branch_id: 9, company_id: 1, branch_name: 'Head Office', branch_code: 'HO', activity_types: [], is_head_office: true, status: 'active' },
      { id: 11, branch_id: 11, company_id: 1, branch_name: 'Bangalore Branch', branch_code: 'B26001', activity_types: [], is_head_office: false, status: 'active' }
    ]);
    availableStockResult = [
      { product_id: 16, warehouse_id: 101, warehouse_name: 'HYD Main WH', on_hand: 10, pending_dc_qty: 0, available: 10 },
      { product_id: 16, warehouse_id: 102, warehouse_name: 'BLR Store', on_hand: 25, pending_dc_qty: 0, available: 25 }
    ];

    host.activeLineProductPickerRow.set(0);
    fixture.detectChanges();

    expect(getAvailableStockCalls.length).toBeGreaterThan(0);
    const cards = (component as any).branchCards();
    expect(cards.map((c: any) => c.branchName)).toEqual(['Bangalore Branch', 'Head Office']); // sorted by total available desc
    expect(cards[0].total).toBe(25);
    expect(cards[1].total).toBe(10);
  });

  // "Current Branch" labeling (informational only -- cards stay
  // non-clickable either way). Purchase Invoice's combined branch/warehouse
  // field is 'receivingLocation'; resolving it to a branch goes through the
  // same warehouse-then-branch dual lookup InventoryScreenShell's own
  // applyPurchaseInvoiceFieldDefaults() already uses for that field.
  it('labels the branch card matching the transaction\'s own current branch (Purchase Invoice: receivingLocation)', () => {
    host.__setResolvedProduct({ id: 16 });
    host.entryLineRows.set([['Widget A', '', '', '']]);
    host.config = { key: 'purchaseInvoice' };
    host.formValues.set({ receivingLocation: 'HYD Main WH' });
    host.loadedWarehouseObjects.set([
      { id: 101, company_id: 1, branch_id: 9, warehouse_name: 'HYD Main WH' },
      { id: 102, company_id: 1, branch_id: 11, warehouse_name: 'BLR Store' }
    ]);
    host.loadedBranchObjects.set([
      { id: 9, branch_id: 9, company_id: 1, branch_name: 'Head Office', branch_code: 'HO', activity_types: [], is_head_office: true, status: 'active' },
      { id: 11, branch_id: 11, company_id: 1, branch_name: 'Bangalore Branch', branch_code: 'B26001', activity_types: [], is_head_office: false, status: 'active' }
    ]);
    availableStockResult = [
      { product_id: 16, warehouse_id: 101, warehouse_name: 'HYD Main WH', on_hand: 10, pending_dc_qty: 0, available: 10 },
      { product_id: 16, warehouse_id: 102, warehouse_name: 'BLR Store', on_hand: 25, pending_dc_qty: 0, available: 25 }
    ];

    host.activeLineProductPickerRow.set(0);
    fixture.detectChanges();

    const cards = (component as any).branchCards();
    const headOffice = cards.find((c: any) => c.branchName === 'Head Office');
    const bangalore = cards.find((c: any) => c.branchName === 'Bangalore Branch');
    expect(headOffice.isCurrentBranch).toBe(true);
    expect(bangalore.isCurrentBranch).toBe(false);

    // Also confirm the actual DOM: the badge renders as a real element with
    // the right text, attached to the Head Office card only -- not just that
    // the underlying signal computed the right boolean.
    const badges = document.body.querySelectorAll('.inv-line-picker-current-badge');
    expect(badges.length).toBe(1);
    expect(badges[0].textContent.trim()).toBe('Current Branch');
    const currentCard = document.body.querySelector('.inv-line-picker-branch-card--current');
    expect(currentCard?.textContent).toContain('Head Office');
    expect(currentCard?.textContent).not.toContain('Bangalore Branch');
  });

  it('resolves the current branch from Stock Transfer\'s "fromWarehouse" field', () => {
    host.__setResolvedProduct({ id: 16 });
    host.entryLineRows.set([['Widget A', '', '', '']]);
    host.config = { key: 'stockTransfer' };
    host.formValues.set({ fromWarehouse: 'BLR Store' });
    host.loadedWarehouseObjects.set([{ id: 102, company_id: 1, branch_id: 11, warehouse_name: 'BLR Store' }]);
    host.loadedBranchObjects.set([
      { id: 11, branch_id: 11, company_id: 1, branch_name: 'Bangalore Branch', branch_code: 'B26001', activity_types: [], is_head_office: false, status: 'active' }
    ]);
    availableStockResult = [
      { product_id: 16, warehouse_id: 102, warehouse_name: 'BLR Store', on_hand: 25, pending_dc_qty: 0, available: 25 }
    ];

    host.activeLineProductPickerRow.set(0);
    fixture.detectChanges();

    expect((component as any).branchCards()[0].isCurrentBranch).toBe(true);
  });

  it('resolves the current branch from Sales Invoice\'s "branch" field only when Interbranch Sale is on, else "warehouse"', () => {
    host.__setResolvedProduct({ id: 16 });
    host.entryLineRows.set([['Widget A', '', '', '']]);
    host.config = { key: 'salesInvoice' };
    host.loadedWarehouseObjects.set([{ id: 102, company_id: 1, branch_id: 11, warehouse_name: 'BLR Store' }]);
    host.loadedBranchObjects.set([
      { id: 11, branch_id: 11, company_id: 1, branch_name: 'Bangalore Branch', branch_code: 'B26001', activity_types: [], is_head_office: false, status: 'active' }
    ]);
    availableStockResult = [
      { product_id: 16, warehouse_id: 102, warehouse_name: 'BLR Store', on_hand: 25, pending_dc_qty: 0, available: 25 }
    ];

    // Interbranch off -- resolves off the plain 'warehouse' field.
    host.formValues.set({ interbranchSale: 'No', warehouse: 'BLR Store', branch: '' });
    host.activeLineProductPickerRow.set(0);
    fixture.detectChanges();
    expect((component as any).branchCards()[0].isCurrentBranch).toBe(true);

    // Interbranch on with a DIFFERENT branch picked than the resolved
    // warehouse's own branch -- 'branch' now takes priority over 'warehouse'.
    host.formValues.set({ interbranchSale: 'Yes', warehouse: 'BLR Store', branch: 'Some Other Branch' });
    fixture.detectChanges();
    expect((component as any).branchCards()[0].isCurrentBranch).toBe(false);
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
