import { TestBed } from '@angular/core/testing';
import { HttpParams } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { InventoryReportsService, MisReport } from './inventory-reports.service';
import { CommonService } from '../../../core/services/Common/common.service';

// Covers InventoryReportsService.getMisReport(), the frontend side of
// GET /api/reports/mis-report (inventory.sp_get_mis_report,
// 153_mis_report.sql). Same single-object {success,message,data} shape as
// getStockValuationComparison -- see that spec file for the pattern this
// mirrors. dateFrom/dateTo are both optional (server defaults to the
// current financial year when omitted), so the param-building tests cover
// both the with-dates and omitted-dates cases.
describe('InventoryReportsService.getMisReport', () => {
  let service: InventoryReportsService;
  let getApiCalls: Array<{ path: string; params: HttpParams }>;
  let commonServiceStub: Partial<CommonService>;

  const sampleReport: MisReport = {
    financialYear: '2026-2027',
    dateFrom: '2026-04-01',
    dateTo: '2027-03-31',
    companyWide: {
      sales: 3430000,
      purchases: 2530000,
      stockValue: 1820000,
      payables: 850000,
      receivables: 677000,
      payablesAgeing: [],
      receivablesAgeing: [],
      topSellingProducts: []
    },
    segments: []
  };

  beforeEach(() => {
    getApiCalls = [];
    commonServiceStub = {
      getAPI: (path: string, params: HttpParams) => {
        getApiCalls.push({ path, params });
        return of({ success: true, message: '', data: sampleReport }) as any;
      }
    };

    TestBed.configureTestingModule({
      providers: [{ provide: CommonService, useValue: commonServiceStub }]
    });
    service = TestBed.inject(InventoryReportsService);
  });

  it('calls /reports/mis-report with no params when no dates are given', () => {
    service.getMisReport().subscribe();

    expect(getApiCalls.length).toBe(1);
    expect(getApiCalls[0].path).toBe('/reports/mis-report');
    expect(getApiCalls[0].params.has('dateFrom')).toBe(false);
    expect(getApiCalls[0].params.has('dateTo')).toBe(false);
  });

  it('passes dateFrom and dateTo as query params when given', () => {
    service.getMisReport('2026-04-01', '2026-08-18').subscribe();

    expect(getApiCalls[0].params.get('dateFrom')).toBe('2026-04-01');
    expect(getApiCalls[0].params.get('dateTo')).toBe('2026-08-18');
  });

  it('unwraps the {success,message,data} envelope down to the report object', () => {
    let result: MisReport | undefined;
    service.getMisReport().subscribe(value => { result = value; });

    expect(result).toEqual(sampleReport);
    expect(result?.companyWide.sales).toBe(3430000);
  });

  it('errors when the response has no data', () => {
    commonServiceStub.getAPI = () => of({ success: false, message: 'not found' }) as any;

    let caught: unknown;
    service.getMisReport().subscribe({
      next: () => { throw new Error('expected an error, got a value'); },
      error: err => { caught = err; }
    });

    expect(caught).toBeTruthy();
  });

  it('propagates HTTP errors from the backend', () => {
    commonServiceStub.getAPI = () => throwError(() => new Error('network down')) as any;

    let caught: any;
    service.getMisReport().subscribe({
      next: () => { throw new Error('expected an error, got a value'); },
      error: err => { caught = err; }
    });

    expect(caught?.message).toBe('network down');
  });
});
