import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiResponse } from './inventory-config.service';

export interface OutstandingInvoice {
  invoice_type: 'purchase_invoice' | 'sales_invoice';
  invoice_id: number;
  invoice_number: string;
  invoice_date?: string;
  due_date?: string;
  reference?: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  outstanding: number;
  // Item 21: true when any line item on this invoice resolves to a
  // Service-natured product (inv_product_types.is_service) — the frontend
  // gates TDS visibility on this instead of guessing from the invoice as a whole.
  has_service_item: boolean;
}

// Item 21: taxation.tds_codes, read-only — replaces the previously
// hardcoded TDS_SECTIONS list in payment-receipt-voucher.ts as the source
// of truth for section/rate.
export interface TdsCode {
  id: number;
  section_code: string;
  description?: string;
  rate: number;
  deductee_type?: string;
  threshold_amount?: number;
}

// Item 22: vendor-level (not per-invoice) FY-cumulative-purchases check —
// TCS only ever becomes relevant once this crosses the ₹50L threshold.
export interface VendorFyPurchaseSummary {
  vendor_id: number;
  financial_year: string;
  cumulative_purchase_amount: number;
  threshold_amount: number;
  threshold_crossed: boolean;
}

export interface PaymentVoucherAllocation {
  invoice_type: 'purchase_invoice' | 'sales_invoice' | 'debit_note' | 'credit_note';
  invoice_id: number;
  invoice_number?: string;
  allocated_amount: number;
}

export interface AvailableNote {
  note_type: 'debit_note' | 'credit_note';
  note_id: number;
  note_number: string;
  note_date?: string;
  reason?: string;
  return_number?: string;
  total_amount: number;
  applied_amount: number;
  outstanding: number;
}

export interface PaymentVoucherMode {
  mode_key: string;
  amount: number;
  ref_json?: Record<string, string>;
}

export interface PaymentVoucher {
  id: number;
  voucher_number: string;
  voucher_type: 'payment' | 'receipt';
  voucher_date?: string;
  segment_id?: number;
  segment_name?: string;
  party_type: 'vendor' | 'customer';
  party_id?: number;
  party_name?: string;
  party_gstin?: string;
  total_allocated: number;
  tds_amount: number;
  tcs_amount: number;
  tcs_percentage?: number;
  net_amount: number;
  narration?: string;
  status: string;
  created_at?: string;
  allocations: PaymentVoucherAllocation[];
  modes: PaymentVoucherMode[];
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly http = inject(HttpClient);

  private base(): string { return sessionStorage.getItem('apiURL') || ''; }
  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem('token') || ''}` });
  }
  private url(path: string): string { return `${this.base()}/inventory/payments/${path}`; }

  private normOutstanding(r: any): OutstandingInvoice {
    return {
      invoice_type: r?.invoiceType ?? r?.invoice_type,
      invoice_id: r?.invoiceId ?? r?.invoice_id,
      invoice_number: r?.invoiceNumber ?? r?.invoice_number ?? '',
      invoice_date: r?.invoiceDate ?? r?.invoice_date,
      due_date: r?.dueDate ?? r?.due_date,
      reference: r?.reference,
      subtotal_amount: r?.subtotalAmount ?? r?.subtotal_amount ?? 0,
      tax_amount: r?.taxAmount ?? r?.tax_amount ?? 0,
      total_amount: r?.totalAmount ?? r?.total_amount ?? 0,
      paid_amount: r?.paidAmount ?? r?.paid_amount ?? 0,
      outstanding: r?.outstanding ?? 0,
      has_service_item: !!(r?.hasServiceItem ?? r?.has_service_item)
    };
  }

  private normTdsCode(r: any): TdsCode {
    return {
      id: r?.id,
      section_code: r?.sectionCode ?? r?.section_code ?? '',
      description: r?.description,
      rate: Number(r?.rate ?? 0),
      deductee_type: r?.deducteeType ?? r?.deductee_type,
      threshold_amount: r?.thresholdAmount ?? r?.threshold_amount
    };
  }

  private normNote(r: any): AvailableNote {
    return {
      note_type: r?.noteType ?? r?.note_type,
      note_id: r?.noteId ?? r?.note_id,
      note_number: r?.noteNumber ?? r?.note_number ?? '',
      note_date: r?.noteDate ?? r?.note_date,
      reason: r?.reason,
      return_number: r?.returnNumber ?? r?.return_number,
      total_amount: r?.totalAmount ?? r?.total_amount ?? 0,
      applied_amount: r?.appliedAmount ?? r?.applied_amount ?? 0,
      outstanding: r?.outstanding ?? 0
    };
  }

  private normVoucher(r: any): PaymentVoucher {
    return {
      id: r?.id,
      voucher_number: r?.voucherNumber ?? r?.voucher_number ?? '',
      voucher_type: r?.voucherType ?? r?.voucher_type,
      voucher_date: r?.voucherDate ?? r?.voucher_date,
      segment_id: r?.segmentId ?? r?.segment_id,
      segment_name: r?.segmentName ?? r?.segment_name,
      party_type: r?.partyType ?? r?.party_type,
      party_id: r?.partyId ?? r?.party_id,
      party_name: r?.partyName ?? r?.party_name,
      party_gstin: r?.partyGstin ?? r?.party_gstin,
      total_allocated: r?.totalAllocated ?? r?.total_allocated ?? 0,
      tds_amount: r?.tdsAmount ?? r?.tds_amount ?? 0,
      tcs_amount: r?.tcsAmount ?? r?.tcs_amount ?? 0,
      tcs_percentage: r?.tcsPercentage ?? r?.tcs_percentage,
      net_amount: r?.netAmount ?? r?.net_amount ?? 0,
      narration: r?.narration,
      status: r?.status || 'posted',
      created_at: r?.createdAt ?? r?.created_at,
      allocations: (r?.allocations || []).map((a: any) => ({
        invoice_type: a?.invoiceType ?? a?.invoice_type,
        invoice_id: a?.invoiceId ?? a?.invoice_id,
        invoice_number: a?.invoiceNumber ?? a?.invoice_number,
        allocated_amount: a?.allocatedAmount ?? a?.allocated_amount ?? 0
      })),
      modes: (r?.modes || []).map((m: any) => ({
        mode_key: m?.modeKey ?? m?.mode_key,
        amount: m?.amount ?? 0,
        ref_json: m?.refJson ?? m?.ref_json ?? {}
      }))
    };
  }

  getOutstandingInvoices(partyType: 'vendor' | 'customer', partyId: number): Observable<ApiResponse<OutstandingInvoice[]>> {
    const params = new HttpParams().set('partyType', partyType).set('partyId', String(partyId));
    return this.http.get<ApiResponse<any[]>>(this.url('outstanding-invoices'), { headers: this.headers(), params }).pipe(
      map(res => ({ ...res, data: (res.data ?? []).map(r => this.normOutstanding(r)) }))
    );
  }

  getTdsCodes(): Observable<ApiResponse<TdsCode[]>> {
    return this.http.get<ApiResponse<any[]>>(this.url('tds-codes'), { headers: this.headers() }).pipe(
      map(res => ({ ...res, data: (res.data ?? []).map(r => this.normTdsCode(r)) }))
    );
  }

  getVendorFyPurchaseSummary(vendorId: number): Observable<ApiResponse<VendorFyPurchaseSummary>> {
    const params = new HttpParams().set('vendorId', String(vendorId));
    return this.http.get<ApiResponse<any>>(this.url('vendor-fy-summary'), { headers: this.headers(), params }).pipe(
      map(res => ({
        ...res,
        data: res.data ? {
          vendor_id: res.data.vendorId ?? res.data.vendor_id,
          financial_year: res.data.financialYear ?? res.data.financial_year ?? '',
          cumulative_purchase_amount: res.data.cumulativePurchaseAmount ?? res.data.cumulative_purchase_amount ?? 0,
          threshold_amount: res.data.thresholdAmount ?? res.data.threshold_amount ?? 5000000,
          threshold_crossed: !!(res.data.thresholdCrossed ?? res.data.threshold_crossed)
        } : undefined
      }))
    );
  }

  getAvailableNotes(partyType: 'vendor' | 'customer', partyId: number): Observable<ApiResponse<AvailableNote[]>> {
    const params = new HttpParams().set('partyType', partyType).set('partyId', String(partyId));
    return this.http.get<ApiResponse<any[]>>(this.url('available-notes'), { headers: this.headers(), params }).pipe(
      map(res => ({ ...res, data: (res.data ?? []).map(r => this.normNote(r)) }))
    );
  }

  getPaymentVouchers(voucherType?: 'payment' | 'receipt', segmentId?: number | null): Observable<ApiResponse<PaymentVoucher[]>> {
    let params = new HttpParams();
    if (voucherType) params = params.set('voucherType', voucherType);
    if (segmentId) params = params.set('segmentId', String(segmentId));
    return this.http.get<ApiResponse<any[]>>(this.url('vouchers'), { headers: this.headers(), params }).pipe(
      map(res => ({ ...res, data: (res.data ?? []).map(r => this.normVoucher(r)) }))
    );
  }

  savePaymentVoucher(payload: {
    voucherType: 'payment' | 'receipt';
    voucherDate?: string;
    segmentId?: number | null;
    segmentName?: string;
    partyType: 'vendor' | 'customer';
    partyId: number;
    partyName?: string;
    partyGstin?: string;
    narration?: string;
    tdsAmount?: number;
    tdsSection?: string;
    tcsAmount?: number;
    tcsPercentage?: number | null;
    allocations: { invoiceType: string; invoiceId: number; invoiceNumber?: string; allocatedAmount: number }[];
    modes: { modeKey: string; amount: number; refJson?: Record<string, string> }[];
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.url('vouchers'), payload, { headers: this.headers() }).pipe(
      map(res => ({ ...res, data: res.data ? this.normVoucher(res.data) : undefined }))
    );
  }

  cancelPaymentVoucher(voucherId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.url('vouchers/cancel'), { voucherId }, { headers: this.headers() });
  }
}
