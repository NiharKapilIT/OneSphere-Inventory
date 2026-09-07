import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig, bomMasterConfig } from '../inventory-screen.model';

// "in BOM master and Manufacturing should be show the product only finished and
// subfinished".
//
// The intermediate stage is seeded twice: Semi-Finished Product (active) and
// Semi-Finished / WIP (inactive legacy). Both are matched, so it does not
// matter which label a product carries.
//
// MANUFACTURING_OUTPUT_NATURE_KEYS used to include 'physicalstock' and
// 'product', so every ordinary stock item appeared in the Finished Product
// dropdown on BOM Master and the four Production screens. A Physical Stock item
// is bought and sold, not produced. The INPUT side is deliberately untouched:
// raw material fields still list Raw Material + Semi-Finished, or a BOM could
// not consume anything.
describe('InventoryScreenShell — manufacturing output is Finished / Semi-Finished only', () => {
  function createComponent(config: InventoryScreenConfig) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [
        provideHttpClient(),
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } }
      ]
    });
    const fixture = TestBed.createComponent(InventoryScreenShell);
    const component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
    return component;
  }

  const productionPlanningConfig = {
    key: 'productionPlanning',
    title: 'Production Planning',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-list',
    fields: [{ key: 'finishedProduct', label: 'Finished Product', type: 'select', options: [] }]
  } as InventoryScreenConfig;

  // Mirrors the seeded natures in inventory.inv_product_types.
  const products = [
    { id: 1, product_name: 'Drone Motor', product_nature_name: 'Finished Product', tracks_inventory: true, allows_sale: true, allows_production: true },
    { id: 2, product_name: 'Motor Housing', product_nature_name: 'Semi-Finished Product', tracks_inventory: true, allows_sale: false, allows_production: true },
    { id: 3, product_name: 'Half Frame', product_nature_name: 'Semi-Finished / WIP', tracks_inventory: true, allows_sale: false, allows_production: true },
    { id: 4, product_name: 'LED Display', product_nature_name: 'Physical Stock', tracks_inventory: true, allows_sale: true, allows_production: false },
    { id: 5, product_name: 'Copper Wire', product_nature_name: 'Raw Material', tracks_inventory: true, allows_sale: false, allows_production: true, allows_purchase: true },
    { id: 6, product_name: 'Installation', product_nature_name: 'Service', tracks_inventory: false, is_service: true, allows_sale: true, allows_production: false }
  ];

  function withProducts(component: InventoryScreenShell) {
    (component as any).loadedProductObjects.set(products);
    return component;
  }

  it('BOM Master Finished Product lists only Finished and Semi-Finished, never Physical Stock', () => {
    const component = withProducts(createComponent(bomMasterConfig));
    const options = (component as any).finishedManufacturingProductOptions();

    expect(options).toContain('Drone Motor');
    expect(options).toContain('Motor Housing');
    expect(options).toContain('Half Frame');   // 'Semi-Finished / WIP' — the legacy label for the same stage
    expect(options).not.toContain('LED Display');
    expect(options).not.toContain('Copper Wire');
    expect(options).not.toContain('Installation');
  });

  it('Production Planning applies the same rule', () => {
    const component = withProducts(createComponent(productionPlanningConfig));
    expect((component as any).finishedManufacturingProductOptions()).toEqual(
      expect.arrayContaining(['Drone Motor', 'Motor Housing'])
    );
    expect((component as any).finishedManufacturingProductOptions()).not.toContain('LED Display');
  });

  it('the raw material side is unchanged — a BOM must still be able to consume inputs', () => {
    const component = withProducts(createComponent(bomMasterConfig));
    const raw = (component as any).rawMaterialProductOptions();

    expect(raw).toContain('Copper Wire');
    expect(raw).toContain('Motor Housing');   // sub-finished feeds a higher assembly
    expect(raw).not.toContain('Drone Motor'); // a finished good is not an input
    expect(raw).not.toContain('LED Display');
  });

  it('rejects a Physical Stock item as a Production Plan output', () => {
    const component = withProducts(createComponent(productionPlanningConfig));
    const message = (component as any).productIsManufacturingFinished(products[3]);
    expect(message).toBe(false);
    expect((component as any).productIsManufacturingFinished(products[0])).toBe(true);
  });

  // With no product classified yet the dropdown is legitimately empty. Saying so
  // beats an unexplained blank list.
  it('explains an empty Finished Product list instead of leaving it blank', () => {
    const component = createComponent(bomMasterConfig);
    (component as any).loadedProductObjects.set([products[3]]);   // Physical Stock only

    const hint = component.fieldTypingHint({ key: 'finishedProduct', label: 'Finished Product', type: 'select' } as any);
    expect(hint).toContain('Product Master');
  });

  it('drops the hint once a Finished product exists', () => {
    const component = withProducts(createComponent(bomMasterConfig));
    const hint = component.fieldTypingHint({ key: 'finishedProduct', label: 'Finished Product', type: 'select' } as any);
    expect(hint).not.toContain('None yet');
  });
});
