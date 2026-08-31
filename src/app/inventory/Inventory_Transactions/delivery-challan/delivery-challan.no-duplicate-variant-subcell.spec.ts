import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { InventoryDeliveryChallanComponent } from './delivery-challan';

// Regression coverage for the "+ Product picker rollout" bug reported live on
// Purchase Return and identically on GRN/Sales Order/Delivery Challan/Sales
// Return -- see purchase-return.no-duplicate-variant-subcell.spec.ts for the
// full writeup. This is the same coverage for Delivery Challan specifically.
describe('InventoryDeliveryChallanComponent — Product cell has no leftover Variant/Attribute sub-row', () => {
  let fixture: ComponentFixture<InventoryDeliveryChallanComponent>;
  let component: InventoryDeliveryChallanComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryDeliveryChallanComponent],
      providers: [
        provideHttpClient(),
        DatePipe,
        { provide: ActivatedRoute, useValue: { data: of({}), snapshot: { paramMap: { get: () => null }, queryParamMap: { get: () => null } }, queryParamMap: of({ get: () => null }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryDeliveryChallanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

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

    // deliveryChallanConfig.lineColumns: ['Product', 'Variant', 'Attribute',
    // 'SO Qty', 'Dispatch Qty', 'UOM', 'Serial No']
    const row = ['Test Phone Multi Attr', 'Model A', '', '5', '5', 'Box', ''];
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
    expect(productCell.querySelector('ng-select')).toBeNull();
  });

  it('the picker trigger button alone carries the product name, variant and both attribute values', () => {
    const trigger = fixture.nativeElement.querySelector('td.inventory-line-col-product .inventory-line-product-trigger');
    expect(trigger).toBeTruthy();
    const text = trigger.textContent.replace(/\s+/g, ' ').trim();
    expect(text).toContain('Test Phone Multi Attr');
    expect(text).toContain('Model A');
    expect(text).toContain('Ram');
    expect(text).toContain('8GB');
    expect(text).toContain('Screen Size');
    expect(text).toContain('6.1 Inch');
  });
});
