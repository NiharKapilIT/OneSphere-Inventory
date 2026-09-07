import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { InventoryPurchaseReturnComponent } from './purchase-return';

// Regression coverage for the "+ Product picker rollout" bug reported live on
// Purchase Return (and, identically, on GRN/Sales Order/Delivery Challan/Sales
// Return -- the other 4 screens rolled onto InventoryLineProductPickerComponent
// alongside it): the rollout replaced the old wide Product ng-select + its
// stacked Variant/Attribute sub-selects with the compact picker everywhere it
// touched the *column list* (transactionLineDisplayColumns()/
// lineGridRenderColumns() already strip 'Variant'/'Attribute' for every
// transaction screen, PI included), but purchase-return.html's Product <td>
// still carried the OLD sub-row markup as a second, independent
// `@if (lineGridColumnIsProduct(column)) { ... }` block below the picker --
// copied from before the picker existed and never deleted when the picker
// was added, unlike Purchase Invoice/Sales Invoice/Stock Transfer's templates
// (see purchase-invoice.ts's own dead-CSS comment for the same cleanup done
// there). Live impact: a second, fully-live Variant <ng-select> plus one
// "Name: Value" line per attribute rendered UNDER the picker's trigger
// button in the same cell -- same underlying row data, so not a data-binding
// break, but a fully duplicated control stack that nearly tripled the row's
// height and made the cell look broken/overlapping.
// Fixed by deleting that leftover block from all 5 templates so the picker
// is the Product cell's only control, matching purchase-invoice.html exactly.
describe('InventoryPurchaseReturnComponent — Product cell has no leftover Variant/Attribute sub-row', () => {
  let fixture: ComponentFixture<InventoryPurchaseReturnComponent>;
  let component: InventoryPurchaseReturnComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryPurchaseReturnComponent],
      providers: [
        provideHttpClient(),
        DatePipe,
        { provide: ActivatedRoute, useValue: { data: of({}), snapshot: { paramMap: { get: () => null }, queryParamMap: { get: () => null } }, queryParamMap: of({ get: () => null }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryPurchaseReturnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Same fixture shape as purchase-invoice.multi-attribute-columns.spec.ts's
    // "Test Phone Multi Attr" product -- one variant carrying two independently
    // mapped attributes (Ram, Screen Size), which is exactly the case that
    // rendered the duplicate sub-row live (one <ng-select> for Variant plus
    // one "Name: Value" line per attribute).
    (component as any).loadedProductObjects.set([
      {
        id: 1,
        product_name: 'Test Phone Multi Attr',
        applicable_variants: [
          { id: 21, variant_name: 'Model A', variant_label: 'Model A', is_default: true }
        ]
      } as any
    ]);
    (component as any).loadedVariantObjects.set([
      {
        id: 21,
        variant_name: 'Model A',
        attributes: [
          { attribute_name: 'Ram', attribute_value: '8GB' },
          { attribute_name: 'Screen Size', attribute_value: '6.1 Inch' }
        ]
      } as any
    ]);

    // purchaseReturnConfig.lineColumns: ['Product', 'Variant', 'Attribute',
    // 'UOM', 'Invoice Qty', 'Return Qty', 'Rate', 'GST', 'Return Amount', 'Serial No']
    const row = ['Test Phone Multi Attr', 'Model A', '', 'Box', '5', '2', '150', '18', '354', ''];
    component.entryLineRows.set([row]);
    fixture.detectChanges();
  });

  it('renders exactly one product-picker control for the row and zero leftover .inventory-line-subcell nodes', () => {
    const pickerEls = fixture.nativeElement.querySelectorAll('app-inventory-line-product-picker');
    const subcellEls = fixture.nativeElement.querySelectorAll('.inventory-line-subcell');
    expect(pickerEls.length).toBe(1);
    expect(subcellEls.length).toBe(0);
  });

  it('does not render a live/editable Variant <ng-select> outside the picker (the old sub-row control)', () => {
    const productCell = fixture.nativeElement.querySelector('td.inventory-line-col-product');
    expect(productCell).toBeTruthy();
    // The product is now typed into a plain text box (so an unknown product can
    // be created inline), which makes this stricter than it used to be: NO
    // ng-select belongs in this cell at all. Any that appears is either the old
    // Variant sub-row control coming back or the product dropdown returning.
    expect(productCell.querySelectorAll('ng-select').length).toBe(0);
    expect(productCell.querySelector('input.inventory-line-product-input')).toBeTruthy();
    expect(productCell.querySelector('.inventory-line-subcell')).toBeNull();
  });

  it('the picker cell alone carries the variant and both attribute values', () => {
    const cell = fixture.nativeElement.querySelector('td.inventory-line-col-product .inventory-line-product-cell');
    expect(cell).toBeTruthy();
    // The product name is held by the inline search box; the variant and
    // attribute selection is summarised directly beneath it.
    const summary = fixture.nativeElement.querySelector('td.inventory-line-col-product .inventory-line-product-subtitle');
    const text = (summary?.textContent || '').replace(/\s+/g, ' ').trim();
    expect(text).toContain('Model A');
    expect(text).toContain('Ram');
    expect(text).toContain('8GB');
    expect(text).toContain('Screen Size');
    expect(text).toContain('6.1 Inch');
  });
});
