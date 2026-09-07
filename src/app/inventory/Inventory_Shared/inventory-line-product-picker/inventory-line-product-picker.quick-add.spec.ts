import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryLineProductPickerComponent } from './inventory-line-product-picker.component';

// "at Transaction screen instead of drop down for product/service picker can we
// make search text box same like HSN picker if new one same will show add kind
// of thing."
//
// The product cell was an ng-select: you could type to filter, but it could only
// ever return something already in the list. It is now a text box in the shape of
// app-hsn-sac-picker — typed text is kept, matches are offered, and an unknown
// product can be created without leaving the line.
//
// The search is client-side on purpose: the shell already loads every product
// (host.lineColumnOptions), unlike the tax master which has thousands of rows and
// needs a debounced endpoint.
describe('InventoryLineProductPickerComponent — inline product search and create', () => {
  const products = ['LED Display', 'LED Strip', 'Drone Motor'];

  // The host exposes activeLineProductPickerRow as a signal: callable for the
  // read, with a .set() for the write.
  function fakeSignal<T>(initial: T) {
    let value = initial;
    const accessor: any = () => value;
    accessor.set = (next: T) => { value = next; };
    return accessor;
  }

  function makeHost(overrides: Record<string, any> = {}) {
    return {
      lineCellValue: () => '',
      lineColumnOptions: () => products,
      findProductBySelection: () => null,
      setEntryLineCell: vi.fn(),
      setLineAttrValue: vi.fn(),
      lineGridCellReadonly: () => false,
      lineGridRow: () => [],
      entryLineRows: () => [[]],
      productSubtitleFromParts: () => '',
      lineAttrValueMap: () => ({}),
      activeLineProductPickerRow: fakeSignal<number | null>(null),
      addProductFromLineProductPicker: vi.fn(),
      canAddProductFromThisScreen: () => true,
      ...overrides
    };
  }

  function createComponent(host: any) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [InventoryLineProductPickerComponent],
      providers: [provideHttpClient()]
    });
    const fixture = TestBed.createComponent(InventoryLineProductPickerComponent);
    const component = fixture.componentInstance as any;
    component.host = host;
    component.rowIndex = 0;
    component.column = 'Product';
    component.productColumnIndex = 0;
    component.variantColumnIndex = -1;
    component.attributeColumnIndex = -1;
    return { fixture, component };
  }

  it('filters the loaded products as you type — no endpoint involved', () => {
    const { component } = createComponent(makeHost());
    component.onSearchInput('led');
    expect(component.matches()).toEqual(['LED Display', 'LED Strip']);
  });

  it('picking a match writes it into the line cell', () => {
    const host = makeHost();
    const { component } = createComponent(host);
    component.onSearchInput('drone');
    component.chooseMatch('Drone Motor');
    expect(host.setEntryLineCell).toHaveBeenCalledWith(0, 0, 'Drone Motor');
  });

  it('offers to create only once the typed text matches nothing', () => {
    const { component } = createComponent(makeHost());

    component.onSearchInput('L');            // too short to judge
    expect(component.canQuickAddProduct()).toBe(false);

    component.onSearchInput('LED Display');  // exact existing product
    expect(component.canQuickAddProduct()).toBe(false);

    component.onSearchInput('Copper Wire');  // genuinely new
    expect(component.canQuickAddProduct()).toBe(true);
  });

  it('the create affordance opens the real Product Master, carrying the typed name and the cell', () => {
    const host = makeHost();
    const { component } = createComponent(host);

    component.onSearchInput('Copper Wire');
    component.createInProductMaster();

    // Row/column travel with it so the saved product comes back into THIS cell.
    expect(host.addProductFromLineProductPicker).toHaveBeenCalledWith({
      rowIndex: 0,
      columnIndex: 0,
      productName: 'Copper Wire'
    });
    // No product is written yet — it does not exist until Product Master saves.
    expect(host.setEntryLineCell).not.toHaveBeenCalled();
  });

  it('does not offer the trip on a screen with no return route wired', () => {
    const { component } = createComponent(makeHost({ canAddProductFromThisScreen: () => false }));
    component.onSearchInput('Copper Wire');
    expect(component.canQuickAddProduct()).toBe(false);
  });

  it('abandoning the search does not strand half-typed text in the cell', () => {
    const host = makeHost();
    const { component } = createComponent(host);
    component.onSearchInput('Copp');
    component.closeSearch();

    expect(component.searchText()).toBe('');
    expect(component.searchOpen()).toBe(false);
    expect(host.setEntryLineCell).not.toHaveBeenCalled();
  });

  // The line grid sits inside .tbl-wrap { overflow-x: auto }. A panel absolutely
  // positioned inside the cell is CLIPPED at the table's edge however high its
  // z-index goes — z-index orders painting, it does not exempt an element from
  // an ancestor's overflow. So the panel is rendered into <body> and positioned
  // fixed, the same treatment the variant popup and the old ng-select
  // (appendTo="body") already used.
  describe('suggestion panel escapes the grid’s overflow clipping', () => {
    const panelInBody = () => document.body.querySelector(':scope > .inventory-line-product-suggest');

    afterEach(() => {
      document.body.querySelectorAll('.inventory-line-product-suggest').forEach(node => node.remove());
    });

    it('renders the panel as a direct child of <body>, not inside the cell', () => {
      const { fixture, component } = createComponent(makeHost());
      fixture.detectChanges();
      component.onSearchInput('led');
      fixture.detectChanges();

      expect(panelInBody()).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.inventory-line-product-suggest')).toBeNull();
    });

    it('positions it against the viewport so it is not laid out inside the scroll box', () => {
      const { fixture, component } = createComponent(makeHost());
      fixture.detectChanges();
      component.onSearchInput('led');
      fixture.detectChanges();

      expect(getComputedStyle(panelInBody() as Element).position).toBe('fixed');
    });

    it('removes the panel from <body> when the search closes', () => {
      const { fixture, component } = createComponent(makeHost());
      fixture.detectChanges();
      component.onSearchInput('led');
      fixture.detectChanges();
      expect(panelInBody()).toBeTruthy();

      component.closeSearch();
      fixture.detectChanges();
      expect(panelInBody()).toBeNull();
    });

    it('leaves nothing attached to <body> when the row is destroyed mid-search', () => {
      const { fixture, component } = createComponent(makeHost());
      fixture.detectChanges();
      component.onSearchInput('led');
      fixture.detectChanges();
      expect(panelInBody()).toBeTruthy();

      fixture.destroy();
      expect(panelInBody()).toBeNull();
    });
  });
});
