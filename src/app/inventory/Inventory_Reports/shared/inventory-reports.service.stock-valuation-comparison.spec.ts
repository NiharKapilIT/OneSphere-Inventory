import { TestBed } from '@angular/core/testing';
import { HttpParams } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { InventoryReportsService, StockValuationComparison } from './inventory-reports.service';
import { CommonService } from '../../../core/services/Common/common.service';

// Covers InventoryReportsService.getStockValuationComparison(), the frontend
// side of GET /api/reports/stock-valuation-comparison
// (inventory.sp_get_stock_valuation_comparison, 151_stock_valuation_
// comparison_report.sql). Unlike getReport() above it, this endpoint
// returns a single object wrapped in {success,message,data} (OkResult), not
// the {success,data,summary,totalRecords} report envelope, so it needs its
// own thin unwrap rather than normalizeResponse(). Every case here resolves
// synchronously (of()/throwError() emit immediately), so plain subscribe()
// assertions are enough -- no done()/async needed under Vitest.
describe('InventoryReportsService.getStockValuationComparison', () => {
  let service: InventoryReportsService;
  let getApiCalls: Array<{ path: string; params: HttpParams }>;
  let commonServiceStub: Partial<CommonService>;

  const sampleComparison: StockValuationComparison = {
    productId: 16,
    productCode: 'TESTVAL-001',
    productName: 'Disposable Test Widget',
    valuationMethod: 'FIFO',
    uom: 'Pieces',
    currentCostPrice: 100,
    hypotheticalQty: 8,
    totalRemainingQty: 15,
    totalRemainingValue: 1650,
    layers: [],
    fifo: { costConsumed: 800, avgRate: 100, remainingQty: 7, remainingValue: 850, shortfallQty: 0 },
    lifo: { costConsumed: 950, avgRate: 118.75, remainingQty: 7, remainingValue: 700, shortfallQty: 0 },
    weightedAverage: { costConsumed: 880, avgRate: 110, remainingQty: 7, remainingValue: 850, shortfallQty: 0 }
  };

  beforeEach(() => {
    getApiCalls = [];
    commonServiceStub = {
      getAPI: (path: string, params: HttpParams) => {
        getApiCalls.push({ path, params });
        return of({ success: true, message: '', data: sampleComparison }) as any;
      }
    };

    TestBed.configureTestingModule({
      providers: [{ provide: CommonService, useValue: commonServiceStub }]
    });
    service = TestBed.inject(InventoryReportsService);
  });

  it('calls /reports/stock-valuation-comparison with productId and hypotheticalQty as query params', () => {
    service.getStockValuationComparison(16, 8).subscribe();

    expect(getApiCalls.length).toBe(1);
    expect(getApiCalls[0].path).toBe('/reports/stock-valuation-comparison');
    expect(getApiCalls[0].params.get('productId')).toBe('16');
    expect(getApiCalls[0].params.get('hypotheticalQty')).toBe('8');
  });

  it('unwraps the {success,message,data} envelope down to the comparison object', () => {
    let result: StockValuationComparison | undefined;
    service.getStockValuationComparison(16, 8).subscribe(value => { result = value; });

    expect(result).toEqual(sampleComparison);
    expect(result?.fifo.costConsumed).toBe(800);
    expect(result?.lifo.costConsumed).toBe(950);
    expect(result?.weightedAverage.costConsumed).toBe(880);
  });

  it('errors when the response has no data', () => {
    commonServiceStub.getAPI = () => of({ success: false, message: 'not found' }) as any;

    let caught: unknown;
    service.getStockValuationComparison(16, 8).subscribe({
      next: () => { throw new Error('expected an error, got a value'); },
      error: err => { caught = err; }
    });

    expect(caught).toBeTruthy();
  });

  it('propagates HTTP errors from the backend', () => {
    commonServiceStub.getAPI = () => throwError(() => new Error('network down')) as any;

    let caught: any;
    service.getStockValuationComparison(16, 8).subscribe({
      next: () => { throw new Error('expected an error, got a value'); },
      error: err => { caught = err; }
    });

    expect(caught?.message).toBe('network down');
  });
});
