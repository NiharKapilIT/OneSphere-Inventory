import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { InventoryPurchaseInvoiceComponent } from './purchase-invoice';

// Purchase Invoice used to carry its own local override of
// transactionLineDisplayColumns()/lineGridRenderColumns() that never learned
// about 'Variant'/'Attribute' the way the shared base class
// (InventoryScreenShell) did -- so those two placeholder columns survived as
// literal dedicated grid columns instead of being stripped. The "Attribute"
// column's cell then fell back to a single flattened dropdown of every value
// across every attribute name mapped to the row's variant (e.g. RAM's
// 4GB/8GB/16GB AND Screen Size's 5.5"/6.1"/6.7" all in one list), with no way
// to set both attributes independently on one line.
//
// Fix: the override was deleted so PI now falls through to the base class's
// (already purchaseInvoice-aware) transactionLineDisplayColumns() and its
// lineGridRenderColumns(), matching GRN and Purchase Return exactly. This
// spec pins that down at the component level -- not just the base class --
// since the bug was specifically in this subclass's override.
//
// Note: at the time this comment was originally written, Variant/Attribute
// were folded into a per-attribute-name sub-row rendered directly under the
// Product cell (goods-receipt.html's and purchase-return.html's own
// `lineGridColumnIsProduct(column)` branch). That sub-row markup is gone now
// too -- InventoryLineProductPickerComponent (the "+ Product" popup) replaced
// it everywhere, including GRN/Purchase Return/Sales Order/Delivery
// Challan/Sales Return. See
// purchase-return.no-duplicate-variant-subcell.spec.ts (and its siblings) for
// the regression that shipped when those 5 templates kept the old sub-row
// markup alongside the new picker instead of deleting it.
describe('InventoryPurchaseInvoiceComponent — multi-attribute grid rendering (Variant + Attribute columns removed)', () => {
  let fixture: ComponentFixture<InventoryPurchaseInvoiceComponent>;
  let component: InventoryPurchaseInvoiceComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryPurchaseInvoiceComponent],
      providers: [
        provideHttpClient(),
        DatePipe,
        { provide: ActivatedRoute, useValue: { data: of({}), snapshot: { paramMap: { get: () => null }, queryParamMap: { get: () => null } }, queryParamMap: of({ get: () => null }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryPurchaseInvoiceComponent);
    component = fixture.componentInstance;
    // Deliberately not calling fixture.detectChanges() -- ngOnInit schedules
    // setTimeout-deferred reference-picker prompts that are irrelevant to
    // grid-column computation and would just be noise here; the methods
    // under test are plain synchronous methods callable straight off the
    // constructed instance.
  });

  // Mirrors purchaseInvoiceConfig.lineColumns (inventory-screen.model.ts) --
  // duplicated here as a literal so this spec doesn't silently go stale if
  // the config's column order changes; the real config is exercised too, see
  // the "uses the real purchaseInvoiceConfig" case below. 'Received Qty' is
  // deliberately absent -- PI never carries it as a column at all, GRN-linked
  // or not; billing is always on Accepted Qty once GRN-linked (item 5).
  const lineColumns = ['Product', 'Variant', 'Attribute', 'UOM', 'Qty', 'Accepted Qty', 'Rate', 'MRP', 'Selling Price', 'Disc %', 'GST', 'Batch No', 'Serial No', 'Expiry Date', 'Amount'];

  it('transactionLineDisplayColumns() strips the Variant and Attribute placeholder columns (matches GRN/Purchase Return)', () => {
    const columns = component.transactionLineDisplayColumns(lineColumns);
    expect(columns).not.toContain('Variant');
    expect(columns).not.toContain('Attribute');
    expect(columns).toContain('Product');
  });

  it('lineGridRenderColumns() (the real template-driving method) also excludes Variant/Attribute', () => {
    // directEntryLineRows() lazily seeds entryLineRows the first time it's
    // called for a given config.key -- in the real app that first call
    // always happens inside a template's change-detection pass, which
    // tolerates the signal write. Priming it with a plain top-level call
    // here (same as the template's own @for (row of directEntryLineRows())
    // loop would do) avoids that same write happening as a side effect
    // inside lineGridRenderColumns()'s computed chain, where Angular's
    // signals disallow it (NG0600).
    component.directEntryLineRows();
    const rendered = component.lineGridRenderColumns();
    expect(rendered).not.toContain('Variant');
    expect(rendered).not.toContain('Attribute');
  });

  it('uses the real purchaseInvoiceConfig (not just a hand-rolled column list)', () => {
    const rendered = component.transactionLineDisplayColumns(component.config.lineColumns || []);
    expect(rendered).not.toContain('Variant');
    expect(rendered).not.toContain('Attribute');
  });

  // Regression coverage for what the deleted override used to be responsible
  // for -- the base class's transactionLineDisplayColumns() already special-
  // cases config.key === 'purchaseInvoice' for this exact plain-Qty-vs-
  // Accepted-Qty switch (see inventory-screen-shell.pi-direct-qty.spec.ts for
  // the same behavior exercised against the base class directly), but this
  // confirms the concrete PI component itself keeps working post-override-
  // removal rather than assuming the base class alone is enough.
  it('still shows plain Qty (not Accepted Qty) for a direct invoice with no GRN reference', () => {
    const columns = component.transactionLineDisplayColumns(lineColumns);
    expect(columns).toContain('Qty');
    expect(columns).not.toContain('Accepted Qty');
    expect(columns).not.toContain('Received Qty');
  });

  it('still shows only Accepted Qty (not plain Qty, not Received Qty) once a GRN reference is bound', () => {
    component.formValues.set({ ...component.formValues(), grnId: 501 });
    const columns = component.transactionLineDisplayColumns(lineColumns);
    expect(columns).not.toContain('Qty');
    expect(columns).toContain('Accepted Qty');
    expect(columns).not.toContain('Received Qty');
  });

  // The actual feature this whole item is about: a product whose variant has
  // two independently-mapped attributes (RAM, Screen Size) surfaces BOTH as
  // separate entries in attrSelections -- the data that purchase-invoice.html's
  // Product-cell sub-row now iterates (@for (attr of rowView?.attrSelections)),
  // one control per attribute name, instead of one flattened dropdown.
  it('a line for a product with 2 mapped attributes carries both as separate attrSelections entries', () => {
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

    const row = ['Test Phone Multi Attr', 'Model A', '', 'Box', '1', '', '', '100', '', '', '0', '', '', '', '', '100'];
    component.entryLineRows.set([row]);

    const views = component.entryLineRowViews();
    expect(views.length).toBe(1);
    const names = views[0].attrSelections.map(a => a.name).sort();
    expect(names).toEqual(['Ram', 'Screen Size']);

    const ram = views[0].attrSelections.find(a => a.name === 'Ram');
    const screen = views[0].attrSelections.find(a => a.name === 'Screen Size');
    expect(ram?.value).toBe('8GB');
    expect(screen?.value).toBe('6.1 Inch');
    // Both are single-valued for this variant, so both render as a plain
    // readonly "Name: Value" label in the sub-row rather than a dropdown.
    expect(ram?.isAuto).toBe(true);
    expect(screen?.isAuto).toBe(true);
  });
});
