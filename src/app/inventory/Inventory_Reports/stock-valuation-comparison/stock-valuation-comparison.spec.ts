import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { StockValuationComparisonComponent } from './stock-valuation-comparison';
import { InventoryConfigService, ProductItem } from '../../Inventory_Shared/inventory-config.service';
import { InventoryReportsService, StockValuationComparison } from '../shared/inventory-reports.service';

// Item: Stock Valuation Comparison Report -- covers the bits that are
// specific to this bespoke view (it doesn't go through report-page.ts, so
// none of that component's own specs apply): product/qty selection driving
// the request, the three FIFO/LIFO/Weighted-Average figures landing in the
// right signals, and the empty/no-product state before a comparison has
// been run.
describe('StockValuationComparisonComponent', () => {
  let fixture: ComponentFixture<StockValuationComparisonComponent>;
  let component: StockValuationComparisonComponent;
  let getComparisonCalls: Array<{ productId: number; hypotheticalQty: number }>;
  let comparisonResult: StockValuationComparison;

  const sampleProducts: ProductItem[] = [
    { id: 16, product_code: 'TESTVAL-001', product_name: 'Disposable Test Widget', product_type: 'Product', sku: 'TESTVAL-001', item_status: 'active', valuation_method: 'FIFO' } as ProductItem
  ];

  function buildComparison(overrides: Partial<StockValuationComparison> = {}): StockValuationComparison {
    return {
      productId: 16,
      productCode: 'TESTVAL-001',
      productName: 'Disposable Test Widget',
      valuationMethod: 'FIFO',
      uom: 'Pieces',
      currentCostPrice: 100,
      hypotheticalQty: 8,
      totalRemainingQty: 15,
      totalRemainingValue: 1650,
      layers: [
        { id: 1, receivedAt: '2026-08-18T00:00:00Z', receivedQty: 10, remainingQty: 10, unitCost: 100, sourceDocType: 'purchase_invoice', sourceDocId: 50 },
        { id: 2, receivedAt: '2026-08-18T01:00:00Z', receivedQty: 5, remainingQty: 5, unitCost: 130, sourceDocType: 'purchase_invoice', sourceDocId: 51 }
      ],
      fifo: { costConsumed: 800, avgRate: 100, remainingQty: 7, remainingValue: 850, shortfallQty: 0 },
      lifo: { costConsumed: 950, avgRate: 118.75, remainingQty: 7, remainingValue: 700, shortfallQty: 0 },
      weightedAverage: { costConsumed: 880, avgRate: 110, remainingQty: 7, remainingValue: 850, shortfallQty: 0 },
      ...overrides
    };
  }

  beforeEach(async () => {
    getComparisonCalls = [];
    comparisonResult = buildComparison();

    const configServiceStub: Partial<InventoryConfigService> = {
      getProducts: () => of({ success: true, message: '', data: sampleProducts }) as any
    };

    const reportsServiceStub: Partial<InventoryReportsService> = {
      getStockValuationComparison: (productId: number, hypotheticalQty: number) => {
        getComparisonCalls.push({ productId, hypotheticalQty });
        return of(comparisonResult);
      }
    };

    await TestBed.configureTestingModule({
      imports: [StockValuationComparisonComponent],
      providers: [
        provideHttpClient(),
        { provide: InventoryConfigService, useValue: configServiceStub },
        { provide: InventoryReportsService, useValue: reportsServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StockValuationComparisonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the product picker options on init', () => {
    expect(component.products().length).toBe(1);
    expect(component.products()[0].product_name).toBe('Disposable Test Widget');
  });

  it('shows the empty state before a comparison has been run', () => {
    expect(component.hasResult()).toBe(false);
    expect(component.loaded()).toBe(false);
    const empty = fixture.nativeElement.querySelector('.svc-empty-state');
    expect(empty).toBeTruthy();
  });

  it('generate() without a selected product sets an error and does not call the service', () => {
    component.generate();

    expect(component.errorMessage()).toContain('Select a product');
    expect(getComparisonCalls.length).toBe(0);
  });

  it('onProductChange() selects the product and clears any previous result', () => {
    component.comparison.set(comparisonResult);
    component.loaded.set(true);

    component.onProductChange(16);

    expect(component.selectedProductId()).toBe(16);
    expect(component.selectedProduct()?.product_code).toBe('TESTVAL-001');
    expect(component.comparison()).toBeNull();
    expect(component.loaded()).toBe(false);
  });

  it('generate() calls the service with the selected product id and hypothetical qty', () => {
    component.onProductChange(16);
    component.onQtyChange('8');

    component.generate();

    expect(getComparisonCalls).toEqual([{ productId: 16, hypotheticalQty: 8 }]);
  });

  it('generate() populates all three method figures from the response, and they genuinely differ', () => {
    component.onProductChange(16);
    component.onQtyChange('8');

    component.generate();
    fixture.detectChanges();

    expect(component.hasResult()).toBe(true);
    const result = component.comparison()!;
    expect(result.fifo.costConsumed).toBe(800);
    expect(result.lifo.costConsumed).toBe(950);
    expect(result.weightedAverage.costConsumed).toBe(880);
    // The whole point of the report: the three methods must not collapse to
    // the same number when layers sit at different rates.
    const totals = new Set([result.fifo.costConsumed, result.lifo.costConsumed, result.weightedAverage.costConsumed]);
    expect(totals.size).toBe(3);
  });

  it('generate() surfaces a friendly error and leaves comparison null when the service fails', () => {
    // A failing service response needs its own TestBed (the outer
    // beforeEach's stub always succeeds), so reconfigure a fresh fixture
    // with a stub that throws instead.
    return TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [StockValuationComparisonComponent],
        providers: [
          provideHttpClient(),
          { provide: InventoryConfigService, useValue: { getProducts: () => of({ success: true, message: '', data: sampleProducts }) } },
          { provide: InventoryReportsService, useValue: { getStockValuationComparison: () => throwError(() => ({ error: { message: 'boom' } })) } }
        ]
      })
      .compileComponents()
      .then(() => {
        const failFixture = TestBed.createComponent(StockValuationComparisonComponent);
        const failComponent = failFixture.componentInstance;
        failFixture.detectChanges();

        failComponent.onProductChange(16);
        failComponent.generate();

        expect(failComponent.comparison()).toBeNull();
        expect(failComponent.loaded()).toBe(true);
        expect(failComponent.errorMessage()).toBe('boom');
      });
  });

  it('formatCurrency() renders a rupee-prefixed, locale-formatted amount', () => {
    expect(component.formatCurrency(880)).toBe('Rs. 880');
    expect(component.formatCurrency(null)).toBe('Rs. 0');
  });
});
