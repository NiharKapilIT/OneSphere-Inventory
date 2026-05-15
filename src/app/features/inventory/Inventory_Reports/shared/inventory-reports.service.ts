import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { CommonService } from '../../../../core/services/Common/common.service';
import {
  InventoryReportApiResponse,
  InventoryReportDefinition,
  InventoryReportFilterValue,
  InventoryReportFilters,
  InventoryReportRow
} from './inventory-report.models';

@Injectable({
  providedIn: 'root'
})
export class InventoryReportsService {
  constructor(private readonly commonService: CommonService) {}

  contextDefaults(): InventoryReportFilters {
    return {
      companyId: this.commonService.getCompanyCode(),
      branchId: this.commonService.getBranchCode(),
      createdBy: String(this.commonService.getCreatedBy() ?? ''),
      financialYear: this.currentFinancialYear()
    };
  }

  getReport(
    report: InventoryReportDefinition,
    filters: InventoryReportFilters,
    page: number,
    pageSize: number
  ): Observable<InventoryReportApiResponse> {
    const params = this.buildParams(filters, page, pageSize);

    return this.commonService
      .getAPI(`/api/reports/${report.endpoint}`, params, 'YES')
      .pipe(
        map(response => this.normalizeResponse(response)),
        catchError(error => throwError(() => error))
      );
  }

  private buildParams(filters: InventoryReportFilters, page: number, pageSize: number): HttpParams {
    const contextParams: Record<string, string> = {
      globalSchema: this.commonService.getschemaname(),
      branchSchema: this.commonService.getbranchname(),
      userId: this.storageValue('userId'),
      roleId: this.storageValue('roleId'),
      page: String(page),
      pageSize: String(pageSize)
    };

    let params = new HttpParams();

    Object.entries({ ...contextParams, ...filters }).forEach(([key, value]) => {
      const normalizedValue = this.paramValue(value);
      if (normalizedValue && normalizedValue !== 'All') {
        params = params.set(key, normalizedValue);
      }
    });

    return params;
  }

  private paramValue(value: InventoryReportFilterValue): string {
    if (Array.isArray(value)) {
      return value
        .map(item => String(item ?? '').trim())
        .filter(item => item && item !== 'All')
        .join(',');
    }

    if (value instanceof Date) {
      return this.toDateParam(value);
    }

    return String(value ?? '').trim();
  }

  private normalizeResponse(response: unknown): InventoryReportApiResponse {
    if (Array.isArray(response)) {
      return {
        success: true,
        message: '',
        data: response as InventoryReportRow[],
        summary: {},
        totalRecords: response.length
      };
    }

    const value = (response ?? {}) as Partial<InventoryReportApiResponse> & {
      totalrecords?: number;
      total?: number;
      rows?: InventoryReportRow[];
    };

    const data = Array.isArray(value.data)
      ? value.data
      : Array.isArray(value.rows)
        ? value.rows
        : [];

    return {
      success: value.success !== false,
      message: String(value.message ?? ''),
      data,
      summary: (value.summary ?? {}) as Record<string, string | number>,
      totalRecords: Number(value.totalRecords ?? value.totalrecords ?? value.total ?? data.length)
    };
  }

  private storageValue(key: string): string {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(key) ?? '';
  }

  private currentFinancialYear(): string {
    const today = new Date();
    const startYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    return `${startYear}-${startYear + 1}`;
  }

  private toDateParam(value: Date): string {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
}
