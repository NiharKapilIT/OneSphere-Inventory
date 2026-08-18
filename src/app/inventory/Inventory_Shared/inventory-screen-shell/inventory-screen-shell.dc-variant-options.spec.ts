import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 28: "Variants are not allowing to add available while
// adding a Direct DC" — verifies a Delivery Challan line lets the user pick
// a Variant for a variant-bearing product even with no Sales Order
// reference bound (a "Direct DC"), i.e. lineColumnOptions('Variant', row)
// is driven purely by the row's own selected product, not by a reference
// doc or warehouse selection.
describe('InventoryScreenShell — Direct DC variant selection (item 28)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const lineColumns = ['Product', 'Variant', 'Attribute', 'SO Qty', 'Dispatch Qty', 'UOM', 'Serial No'];

  const config: InventoryScreenConfig = {
    key: 'deliveryChallan',
    title: 'Delivery Challan (DC)',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-truck',
    lineColumns
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();

    (component as any).loadedProductObjects.set([
      {
        id: 1,
        product_name: 'T-Shirt',
        applicable_variants: [
          { id: 11, variant_name: 'Red - M', variant_label: 'Red - M', is_default: true },
          { id: 12, variant_name: 'Blue - L', variant_label: 'Blue - L', is_default: false }
        ]
      } as any
    ]);
  });

  it('offers variant options for a Direct DC row (no SO reference, no soReference field set)', () => {
    const row = ['T-Shirt', '', '', '', '5', 'Nos', ''];
    const options = component.lineColumnOptions('Variant', row);
    expect(options.length).toBeGreaterThan(0);
    expect(options).toContain('Red - M');
    expect(options).toContain('Blue - L');
  });

  it('does not require a reference doc header field to be set for variants to appear', () => {
    expect(component.formValues()['soReference']).toBeFalsy();
    const row = ['T-Shirt', '', '', '', '5', 'Nos', ''];
    const options = component.lineColumnOptions('Variant', row);
    expect(options.length).toBe(2);
  });
});
