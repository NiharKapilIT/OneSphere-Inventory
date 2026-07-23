import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiResponse } from './inventory-config.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface PrItem {
  id?: number;
  sno: number;
  product_id?: number;
  product_name: string;
  product_code?: string;
  variant_id?: number;
  variant_name?: string;
  attribute_id?: number;
  attribute_name?: string;
  attribute_value?: string;
  uom_id?: number;
  uom_name?: string;
  required_qty: number;
  estimated_rate?: number;
  remarks?: string;
}

export interface PurchaseRequisition {
  id: number;
  pr_number: string;
  pr_date?: string;
  segment_id?: number;
  segment_name?: string;
  branch_id?: number;
  branch_name?: string;
  department?: string;
  requested_by?: string;
  required_by?: string;
  priority: string;
  remarks?: string;
  status: string;
  created_at?: string;
  items: PrItem[];
}

export interface RfqItem {
  id?: number;
  sno: number;
  product_id?: number;
  product_name: string;
  product_code?: string;
  variant_id?: number;
  variant_name?: string;
  attribute_id?: number;
  attribute_name?: string;
  attribute_value?: string;
  uom_id?: number;
  uom_name?: string;
  required_qty: number;
  target_rate?: number;
  vendor_rate?: number;
  gst_rate: number;
  gst_inclusive?: boolean;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  taxable_amount?: number;
  tax_amount?: number;
  line_total?: number;
  lead_time?: string;
  remarks?: string;
}

export interface Rfq {
  id: number;
  rfq_number: string;
  rfq_group_number?: string;
  rfq_date?: string;
  valid_till?: string;
  estd_delivery_date?: string;
  source_type?: string;
  segment_id?: number;
  segment_name?: string;
  pr_id?: number;
  pr_number?: string;
  vendor_id?: number;
  vendor_name?: string;
  vendor_gstin?: string;
  delivery_location?: string;
  payment_terms?: string;
  currency: string;
  send_channel?: string;
  vendor_response_link?: string;
  sent_at?: string;
  response_received_at?: string;
  gst_inclusive?: boolean;
  tds_applicable?: boolean;
  quality_score?: number;
  price_weight?: number;
  quality_weight?: number;
  lead_time_weight?: number;
  payment_terms_weight?: number;
  negotiation_notes?: string;
  selected_for_po?: boolean;
  remarks?: string;
  status: string;
  created_at?: string;
  items: RfqItem[];
}

export interface GrnItem {
  id?: number;
  sno: number;
  product_id?: number;
  product_name: string;
  product_code?: string;
  uom_name?: string;
  order_qty?: number;
  received_qty: number;
  accepted_qty: number;
  rejected_qty: number;
  rate: number;
  discount_pct: number;
  gst_rate: number;
  amount: number;
  batch_no?: string;
  serial_no?: string;
  expiry_date?: string;
  remarks?: string;
}

export interface Grn {
  id: number;
  grn_number: string;
  grn_date?: string;
  segment_id?: number;
  segment_name?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  vendor_id?: number;
  vendor_name?: string;
  vendor_gstin?: string;
  rfq_id?: number;
  rfq_number?: string;
  vendor_invoice_no?: string;
  vendor_invoice_dt?: string;
  transport_details?: string;
  remarks?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  created_at?: string;
  items: GrnItem[];
}

export interface PiItem {
  id?: number;
  sno: number;
  product_id?: number;
  product_name: string;
  product_code?: string;
  uom_name?: string;
  qty: number;
  rate: number;
  discount_pct: number;
  gst_rate: number;
  amount: number;
  remarks?: string;
}

export interface PurchaseInvoice {
  id: number;
  pi_number: string;
  pi_date?: string;
  segment_id?: number;
  segment_name?: string;
  vendor_id?: number;
  vendor_name?: string;
  vendor_gstin?: string;
  grn_id?: number;
  grn_number?: string;
  vendor_invoice_no?: string;
  vendor_invoice_dt?: string;
  due_date?: string;
  payment_terms?: string;
  remarks?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  created_at?: string;
  items: PiItem[];
}

export interface PurchaseOrderItem {
  id?: number;
  sno: number;
  product_id?: number;
  product_name: string;
  product_code?: string;
  variant_id?: number;
  variant_name?: string;
  attribute_id?: number;
  attribute_name?: string;
  attribute_value?: string;
  uom_id?: number;
  uom_name?: string;
  qty: number;
  rate: number;
  discount_pct: number;
  gst_rate: number;
  warehouse_name?: string;
  amount: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  po_date?: string;
  expected_delivery?: string;
  segment_id?: number;
  segment_name?: string;
  rfq_id?: number;
  rfq_number?: string;
  vendor_id?: number;
  vendor_name?: string;
  vendor_gstin?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  currency: string;
  payment_terms?: string;
  reference_no?: string;
  terms_conditions?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  created_at?: string;
  items: PurchaseOrderItem[];
}

export interface PurchaseRefDoc {
  id: number;
  doc_number: string;
  doc_date?: string;
  segment_id?: number;
  segment_name?: string;
  branch_id?: number;
  branch_name?: string;
  warehouse_id?: number;
  vendor_id?: number;
  party_name?: string;
  status: string;
  remarks?: string;
  items: any[];
}

export interface PurchaseReturnItem {
  id?: number;
  sno: number;
  product_id?: number;
  product_name: string;
  product_code?: string;
  uom_name?: string;
  grn_qty?: number;
  return_qty: number;
  rate: number;
  return_amount: number;
  return_reason?: string;
  remarks?: string;
}

export interface PurchaseReturn {
  id: number;
  return_number: string;
  return_date?: string;
  segment_id?: number;
  segment_name?: string;
  vendor_id?: number;
  vendor_name?: string;
  pi_id?: number;
  pi_number?: string;
  debit_note_ref?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  return_reason?: string;
  remarks?: string;
  total_amount: number;
  status: string;
  created_at?: string;
  items: PurchaseReturnItem[];
}

export interface DeliveryChallanItem {
  id?: number;
  sno: number;
  product_id?: number;
  product_name: string;
  product_code?: string;
  uom_name?: string;
  so_qty?: number;
  dispatch_qty: number;
  batch_serial?: string;
  remarks?: string;
}

export interface DeliveryChallan {
  id: number;
  dc_number: string;
  dc_date?: string;
  segment_id?: number;
  segment_name?: string;
  so_id?: number;
  so_number?: string;
  customer_id?: number;
  customer_name?: string;
  from_warehouse_id?: number;
  from_warehouse_name?: string;
  vehicle?: string;
  transporter?: string;
  lr_no?: string;
  delivery_address?: string;
  remarks?: string;
  status: string;
  created_at?: string;
  items: DeliveryChallanItem[];
}

export interface SalesReturnItem {
  id?: number;
  sno: number;
  product_id?: number;
  product_name: string;
  product_code?: string;
  uom_name?: string;
  invoiced_qty?: number;
  return_qty: number;
  rate: number;
  return_amount: number;
  reason?: string;
  remarks?: string;
}

export interface SalesReturn {
  id: number;
  return_number: string;
  return_date?: string;
  segment_id?: number;
  segment_name?: string;
  customer_id?: number;
  customer_name?: string;
  invoice_id?: number;
  invoice_number?: string;
  credit_note_ref?: string;
  return_to_warehouse_id?: number;
  return_to_warehouse_name?: string;
  return_reason?: string;
  remarks?: string;
  total_amount: number;
  status: string;
  created_at?: string;
  items: SalesReturnItem[];
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class InventoryTransactionsService {
  private readonly http = inject(HttpClient);

  private base(): string { return sessionStorage.getItem('apiURL') || ''; }
  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem('token') || ''}` });
  }
  private url(path: string): string { return `${this.base()}/inventory/transactions/${path}`; }

  private camelize(key: string): string {
    return key.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase());
  }

  private toApiValue(value: any): any {
    if (Array.isArray(value)) return value.map(i => this.toApiValue(i));
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      return Object.entries(value).reduce((out, [k, v]) => {
        (out as any)[this.camelize(k)] = this.toApiValue(v);
        return out;
      }, {} as Record<string, any>);
    }
    return value;
  }

  private mapArray<T>(src: Observable<ApiResponse<any[]>>, normalize: (item: any) => T): Observable<ApiResponse<T[]>> {
    return src.pipe(map(res => ({ ...res, data: (res.data ?? []).map(normalize) })));
  }

  private mapItem<T>(src: Observable<ApiResponse<any>>, normalize: (item: any) => T): Observable<ApiResponse<T>> {
    return src.pipe(map(res => ({ ...res, data: res.data ? normalize(res.data) : undefined })));
  }

  // ── Normalizers ──────────────────────────────────────────────────────────────

  private normPr(r: any): PurchaseRequisition {
    return {
      id: r?.id, pr_number: r?.prNumber || r?.pr_number || '',
      pr_date: r?.prDate || r?.pr_date,
      segment_id: r?.segmentId ?? r?.segment_id,
      segment_name: r?.segmentName || r?.segment_name,
      branch_id: r?.branchId ?? r?.branch_id,
      branch_name: r?.branchName || r?.branch_name,
      department: r?.department,
      requested_by: r?.requestedBy || r?.requested_by,
      required_by: r?.requiredBy || r?.required_by,
      priority: r?.priority || 'medium', remarks: r?.remarks,
      status: r?.status || 'draft', created_at: r?.createdAt || r?.created_at,
      items: (r?.items || []).map((i: any) => ({
        id: i.id, sno: i.sno || 1,
        product_id: i.productId ?? i.product_id,
        product_name: i.productName || i.product_name || '',
        product_code: i.productCode || i.product_code,
        variant_id: i.variantId ?? i.variant_id,
        variant_name: i.variantName || i.variant_name,
        attribute_id: i.attributeId ?? i.attribute_id,
        attribute_name: i.attributeName || i.attribute_name,
        attribute_value: i.attributeValue || i.attribute_value,
        uom_id: i.uomId ?? i.uom_id,
        uom_name: i.uomName || i.uom_name,
        required_qty: Number(i.requiredQty || i.required_qty || 0),
        estimated_rate: i.estimatedRate ?? i.estimated_rate,
        remarks: i.remarks
      }))
    };
  }

  private normRfq(r: any): Rfq {
    return {
      id: r?.id, rfq_number: r?.rfqNumber || r?.rfq_number || '',
      rfq_group_number: r?.rfqGroupNumber || r?.rfq_group_number,
      rfq_date: r?.rfqDate || r?.rfq_date,
      valid_till: r?.validTill || r?.valid_till,
      estd_delivery_date: r?.estdDeliveryDate || r?.estd_delivery_date,
      source_type: r?.sourceType || r?.source_type,
      segment_id: r?.segmentId ?? r?.segment_id,
      segment_name: r?.segmentName || r?.segment_name,
      pr_id: r?.prId || r?.pr_id, pr_number: r?.prNumber || r?.pr_number,
      vendor_id: r?.vendorId ?? r?.vendor_id,
      vendor_name: r?.vendorName || r?.vendor_name,
      vendor_gstin: r?.vendorGstin || r?.vendor_gstin,
      delivery_location: r?.deliveryLocation || r?.delivery_location,
      payment_terms: r?.paymentTerms || r?.payment_terms,
      currency: r?.currency || 'INR',
      send_channel: r?.sendChannel || r?.send_channel,
      vendor_response_link: r?.vendorResponseLink || r?.vendor_response_link,
      sent_at: r?.sentAt || r?.sent_at,
      response_received_at: r?.responseReceivedAt || r?.response_received_at,
      gst_inclusive: !!(r?.gstInclusive ?? r?.gst_inclusive),
      tds_applicable: !!(r?.tdsApplicable ?? r?.tds_applicable),
      quality_score: r?.qualityScore ?? r?.quality_score,
      price_weight: r?.priceWeight ?? r?.price_weight,
      quality_weight: r?.qualityWeight ?? r?.quality_weight,
      lead_time_weight: r?.leadTimeWeight ?? r?.lead_time_weight,
      payment_terms_weight: r?.paymentTermsWeight ?? r?.payment_terms_weight,
      negotiation_notes: r?.negotiationNotes || r?.negotiation_notes,
      selected_for_po: !!(r?.selectedForPo ?? r?.selected_for_po),
      remarks: r?.remarks,
      status: r?.status || 'draft', created_at: r?.createdAt || r?.created_at,
      items: (r?.items || []).map((i: any) => ({
        id: i.id, sno: i.sno || 1,
        product_id: i.productId ?? i.product_id,
        product_name: i.productName || i.product_name || '',
        product_code: i.productCode || i.product_code,
        variant_id: i.variantId ?? i.variant_id,
        variant_name: i.variantName || i.variant_name,
        attribute_id: i.attributeId ?? i.attribute_id,
        attribute_name: i.attributeName || i.attribute_name,
        attribute_value: i.attributeValue || i.attribute_value,
        uom_id: i.uomId ?? i.uom_id,
        uom_name: i.uomName || i.uom_name,
        required_qty: Number(i.requiredQty || i.required_qty || 0),
        target_rate: i.targetRate ?? i.target_rate,
        vendor_rate: i.vendorRate ?? i.vendor_rate,
        gst_rate: Number(i.gstRate || i.gst_rate || 0),
        gst_inclusive: !!(i.gstInclusive ?? i.gst_inclusive),
        cgst_rate: i.cgstRate ?? i.cgst_rate,
        sgst_rate: i.sgstRate ?? i.sgst_rate,
        igst_rate: i.igstRate ?? i.igst_rate,
        taxable_amount: Number(i.taxableAmount ?? i.taxable_amount ?? 0),
        tax_amount: Number(i.taxAmount ?? i.tax_amount ?? 0),
        line_total: Number(i.lineTotal ?? i.line_total ?? 0),
        lead_time: i.leadTime || i.lead_time, remarks: i.remarks
      }))
    };
  }

  private normGrn(r: any): Grn {
    return {
      id: r?.id, grn_number: r?.grnNumber || r?.grn_number || '',
      grn_date: r?.grnDate || r?.grn_date,
      segment_id: r?.segmentId ?? r?.segment_id,
      segment_name: r?.segmentName || r?.segment_name,
      warehouse_id: r?.warehouseId ?? r?.warehouse_id,
      warehouse_name: r?.warehouseName || r?.warehouse_name,
      vendor_id: r?.vendorId ?? r?.vendor_id,
      vendor_name: r?.vendorName || r?.vendor_name,
      vendor_gstin: r?.vendorGstin || r?.vendor_gstin,
      rfq_id: r?.rfqId || r?.rfq_id, rfq_number: r?.rfqNumber || r?.rfq_number,
      vendor_invoice_no: r?.vendorInvoiceNo || r?.vendor_invoice_no,
      vendor_invoice_dt: r?.vendorInvoiceDt || r?.vendor_invoice_dt,
      transport_details: r?.transportDetails || r?.transport_details,
      remarks: r?.remarks,
      subtotal: Number(r?.subtotal || 0), tax_amount: Number(r?.taxAmount || r?.tax_amount || 0),
      total_amount: Number(r?.totalAmount || r?.total_amount || 0),
      status: r?.status || 'draft', created_at: r?.createdAt || r?.created_at,
      items: (r?.items || []).map((i: any) => ({
        id: i.id, sno: i.sno || 1,
        product_id: i.productId ?? i.product_id,
        product_name: i.productName || i.product_name || '',
        product_code: i.productCode || i.product_code,
        uom_name: i.uomName || i.uom_name,
        order_qty: Number(i.orderQty || i.order_qty || i.receivedQty || i.received_qty || 0),
        received_qty: Number(i.receivedQty || i.received_qty || 0),
        accepted_qty: Number(i.acceptedQty || i.accepted_qty || 0),
        rejected_qty: Number(i.rejectedQty || i.rejected_qty || 0),
        rate: Number(i.rate || 0), discount_pct: Number(i.discountPct || i.discount_pct || 0),
        gst_rate: Number(i.gstRate || i.gst_rate || 0),
        amount: Number(i.amount || 0),
        batch_no: i.batchNo || i.batch_no, serial_no: i.serialNo || i.serial_no,
        expiry_date: i.expiryDate || i.expiry_date, remarks: i.remarks
      }))
    };
  }

  private normPi(r: any): PurchaseInvoice {
    return {
      id: r?.id, pi_number: r?.piNumber || r?.pi_number || '',
      pi_date: r?.piDate || r?.pi_date,
      segment_id: r?.segmentId ?? r?.segment_id,
      segment_name: r?.segmentName || r?.segment_name,
      vendor_id: r?.vendorId ?? r?.vendor_id,
      vendor_name: r?.vendorName || r?.vendor_name,
      vendor_gstin: r?.vendorGstin || r?.vendor_gstin,
      grn_id: r?.grnId || r?.grn_id, grn_number: r?.grnNumber || r?.grn_number,
      vendor_invoice_no: r?.vendorInvoiceNo || r?.vendor_invoice_no,
      vendor_invoice_dt: r?.vendorInvoiceDt || r?.vendor_invoice_dt,
      due_date: r?.dueDate || r?.due_date,
      payment_terms: r?.paymentTerms || r?.payment_terms,
      remarks: r?.remarks,
      subtotal: Number(r?.subtotal || 0), tax_amount: Number(r?.taxAmount || r?.tax_amount || 0),
      total_amount: Number(r?.totalAmount || r?.total_amount || 0),
      status: r?.status || 'draft', created_at: r?.createdAt || r?.created_at,
      items: (r?.items || []).map((i: any) => ({
        id: i.id, sno: i.sno || 1,
        product_id: i.productId ?? i.product_id,
        product_name: i.productName || i.product_name || '',
        product_code: i.productCode || i.product_code,
        uom_name: i.uomName || i.uom_name,
        qty: Number(i.qty || 0), rate: Number(i.rate || 0),
        discount_pct: Number(i.discountPct || i.discount_pct || 0),
        gst_rate: Number(i.gstRate || i.gst_rate || 0),
        amount: Number(i.amount || 0), remarks: i.remarks
      }))
    };
  }

  // ── API methods ───────────────────────────────────────────────────────────────

  getPurchaseRequisitions(status?: string, segmentId?: number | null): Observable<ApiResponse<PurchaseRequisition[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (segmentId) params = params.set('segmentId', String(segmentId));
    return this.mapArray(
      this.http.get<ApiResponse<any[]>>(this.url('purchase-requisitions'), { headers: this.headers(), params }),
      r => this.normPr(r)
    );
  }

  savePurchaseRequisition(payload: Record<string, any>, id?: number | null): Observable<ApiResponse<PurchaseRequisition>> {
    const h = this.headers();
    const body = this.toApiValue(payload);
    return this.mapItem(
      id
        ? this.http.put<ApiResponse<any>>(this.url(`purchase-requisitions/${id}`), body, { headers: h })
        : this.http.post<ApiResponse<any>>(this.url('purchase-requisitions'), body, { headers: h }),
      r => this.normPr(r)
    );
  }

  getRfqs(status?: string, segmentId?: number | null): Observable<ApiResponse<Rfq[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (segmentId) params = params.set('segmentId', String(segmentId));
    return this.mapArray(
      this.http.get<ApiResponse<any[]>>(this.url('rfq'), { headers: this.headers(), params }),
      r => this.normRfq(r)
    );
  }

  saveRfq(payload: Record<string, any>, id?: number | null): Observable<ApiResponse<Rfq>> {
    const h = this.headers();
    const body = this.toApiValue(payload);
    return this.mapItem(
      id
        ? this.http.put<ApiResponse<any>>(this.url(`rfq/${id}`), body, { headers: h })
        : this.http.post<ApiResponse<any>>(this.url('rfq'), body, { headers: h }),
      r => this.normRfq(r)
    );
  }

  getGrns(status?: string, segmentId?: number | null): Observable<ApiResponse<Grn[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (segmentId) params = params.set('segmentId', String(segmentId));
    return this.mapArray(
      this.http.get<ApiResponse<any[]>>(this.url('grn'), { headers: this.headers(), params }),
      r => this.normGrn(r)
    );
  }

  saveGrn(payload: Record<string, any>, id?: number | null): Observable<ApiResponse<Grn>> {
    const h = this.headers();
    const body = this.toApiValue(payload);
    return this.mapItem(
      id
        ? this.http.put<ApiResponse<any>>(this.url(`grn/${id}`), body, { headers: h })
        : this.http.post<ApiResponse<any>>(this.url('grn'), body, { headers: h }),
      r => this.normGrn(r)
    );
  }

  getPurchaseInvoices(status?: string, segmentId?: number | null): Observable<ApiResponse<PurchaseInvoice[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (segmentId) params = params.set('segmentId', String(segmentId));
    return this.mapArray(
      this.http.get<ApiResponse<any[]>>(this.url('purchase-invoices'), { headers: this.headers(), params }),
      r => this.normPi(r)
    );
  }

  savePurchaseInvoice(payload: Record<string, any>, id?: number | null): Observable<ApiResponse<PurchaseInvoice>> {
    const h = this.headers();
    const body = this.toApiValue(payload);
    return this.mapItem(
      id
        ? this.http.put<ApiResponse<any>>(this.url(`purchase-invoices/${id}`), body, { headers: h })
        : this.http.post<ApiResponse<any>>(this.url('purchase-invoices'), body, { headers: h }),
      r => this.normPi(r)
    );
  }

  private normPo(r: any): PurchaseOrder {
    return {
      id: r?.id, po_number: r?.poNumber || r?.po_number || '',
      po_date: r?.poDate || r?.po_date,
      expected_delivery: r?.expectedDelivery || r?.expected_delivery,
      segment_id: r?.segmentId ?? r?.segment_id,
      segment_name: r?.segmentName || r?.segment_name,
      rfq_id: r?.rfqId || r?.rfq_id,
      rfq_number: r?.rfqNumber || r?.rfq_number,
      vendor_id: r?.vendorId ?? r?.vendor_id,
      vendor_name: r?.vendorName || r?.vendor_name,
      vendor_gstin: r?.vendorGstin || r?.vendor_gstin,
      warehouse_id: r?.warehouseId ?? r?.warehouse_id,
      warehouse_name: r?.warehouseName || r?.warehouse_name,
      currency: r?.currency || 'INR',
      payment_terms: r?.paymentTerms || r?.payment_terms,
      reference_no: r?.referenceNo || r?.reference_no,
      terms_conditions: r?.termsConditions || r?.terms_conditions,
      subtotal: Number(r?.subtotal || 0),
      tax_amount: Number(r?.taxAmount || r?.tax_amount || 0),
      total_amount: Number(r?.totalAmount || r?.total_amount || 0),
      status: r?.status || 'draft', created_at: r?.createdAt || r?.created_at,
      items: (r?.items || []).map((i: any) => ({
        id: i.id, sno: i.sno || 1,
        product_id: i.productId ?? i.product_id,
        product_name: i.productName || i.product_name || '',
        product_code: i.productCode || i.product_code,
        variant_id: i.variantId ?? i.variant_id,
        variant_name: i.variantName || i.variant_name,
        attribute_id: i.attributeId ?? i.attribute_id,
        attribute_name: i.attributeName || i.attribute_name,
        attribute_value: i.attributeValue || i.attribute_value,
        uom_id: i.uomId ?? i.uom_id,
        uom_name: i.uomName || i.uom_name,
        qty: Number(i.qty || 0),
        rate: Number(i.rate || 0),
        discount_pct: Number(i.discountPct || i.discount_pct || 0),
        gst_rate: Number(i.gstRate || i.gst_rate || 0),
        warehouse_name: i.warehouseName || i.warehouse_name,
        amount: Number(i.amount || 0)
      }))
    };
  }

  getPurchaseOrders(status?: string, segmentId?: number | null): Observable<ApiResponse<PurchaseOrder[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (segmentId) params = params.set('segmentId', String(segmentId));
    return this.mapArray(
      this.http.get<ApiResponse<any[]>>(this.url('purchase-orders'), { headers: this.headers(), params }),
      r => this.normPo(r)
    );
  }

  savePurchaseOrder(payload: Record<string, any>, id?: number | null): Observable<ApiResponse<PurchaseOrder>> {
    const h = this.headers();
    const body = this.toApiValue(payload);
    return this.mapItem(
      id
        ? this.http.put<ApiResponse<any>>(this.url(`purchase-orders/${id}`), body, { headers: h })
        : this.http.post<ApiResponse<any>>(this.url('purchase-orders'), body, { headers: h }),
      r => this.normPo(r)
    );
  }

  cancelDoc(docType: string, docId: number, reason?: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      this.url('cancel'),
      this.toApiValue({ doc_type: docType, doc_id: docId, reason }),
      { headers: this.headers() }
    );
  }

  // ── Sales transactions ────────────────────────────────────────────────────────

  private salesUrl(path: string): string { return `${this.base()}/inventory/sales/${path}`; }

  private normSalesItem(i: any) {
    return {
      id: i.id, sno: i.sno || 1,
      product_id: i.productId ?? i.product_id,
      product_name: i.productName || i.product_name || '',
      product_code: i.productCode || i.product_code,
      variant_id: i.variantId ?? i.variant_id,
      variant_name: i.variantName || i.variant_name,
      uom_id: i.uomId ?? i.uom_id,
      uom_name: i.uomName || i.uom_name,
      attribute_name: i.attributeName || i.attribute_name,
      attribute_value: i.attributeValue || i.attribute_value,
      qty: Number(i.qty || 0), rate: Number(i.rate || 0),
      discount_pct: Number(i.discountPct || i.discount_pct || 0),
      gst_rate: Number(i.gstRate || i.gst_rate || 0),
      amount: Number(i.amount || 0), remarks: i.remarks
    };
  }

  private normEstimation(r: any) {
    return {
      id: r?.id, doc_number: r?.docNumber || r?.doc_number || '',
      doc_date: r?.docDate || r?.doc_date,
      valid_till: r?.validTill || r?.valid_till,
      segment_id: r?.segmentId ?? r?.segment_id,
      segment_name: r?.segmentName || r?.segment_name,
      customer_id: r?.customerId ?? r?.customer_id,
      customer_name: r?.customerName || r?.customer_name,
      reference_no: r?.referenceNo || r?.reference_no,
      payment_terms: r?.paymentTerms || r?.payment_terms,
      remarks: r?.remarks, status: r?.status || 'draft',
      created_at: r?.createdAt || r?.created_at,
      items: (r?.items || []).map((i: any) => this.normSalesItem(i))
    };
  }

  getEstimations(status?: string, segmentId?: number | null): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (segmentId) params = params.set('segmentId', String(segmentId));
    return this.http.get<ApiResponse<any[]>>(this.salesUrl('estimations'), { headers: this.headers(), params }).pipe(
      map(res => ({ ...res, data: (res.data ?? []).map(r => this.normEstimation(r)) }))
    );
  }

  saveEstimation(payload: Record<string, any>, id?: number | null): Observable<ApiResponse<any>> {
    const h = this.headers(); const body = this.toApiValue(payload);
    return id
      ? this.http.put<ApiResponse<any>>(this.salesUrl(`estimations/${id}`), body, { headers: h })
      : this.http.post<ApiResponse<any>>(this.salesUrl('estimations'), body, { headers: h });
  }

  private normProforma(r: any) {
    return {
      id: r?.id, doc_number: r?.docNumber || r?.doc_number || '',
      doc_date: r?.docDate || r?.doc_date, valid_till: r?.validTill || r?.valid_till,
      segment_id: r?.segmentId ?? r?.segment_id, segment_name: r?.segmentName || r?.segment_name,
      estimation_number: r?.estimationNumber || r?.estimation_number,
      customer_id: r?.customerId ?? r?.customer_id, customer_name: r?.customerName || r?.customer_name,
      payment_terms: r?.paymentTerms || r?.payment_terms, place_of_supply: r?.placeOfSupply || r?.place_of_supply,
      reference_no: r?.referenceNo || r?.reference_no,
      remarks: r?.remarks, status: r?.status || 'draft', created_at: r?.createdAt || r?.created_at,
      items: (r?.items || []).map((i: any) => this.normSalesItem(i))
    };
  }

  getProformaInvoices(status?: string, segmentId?: number | null): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (segmentId) params = params.set('segmentId', String(segmentId));
    return this.http.get<ApiResponse<any[]>>(this.salesUrl('proforma-invoices'), { headers: this.headers(), params }).pipe(
      map(res => ({ ...res, data: (res.data ?? []).map(r => this.normProforma(r)) }))
    );
  }

  saveProformaInvoice(payload: Record<string, any>, id?: number | null): Observable<ApiResponse<any>> {
    const h = this.headers(); const body = this.toApiValue(payload);
    return id
      ? this.http.put<ApiResponse<any>>(this.salesUrl(`proforma-invoices/${id}`), body, { headers: h })
      : this.http.post<ApiResponse<any>>(this.salesUrl('proforma-invoices'), body, { headers: h });
  }

  private normSalesInvoice(r: any) {
    return {
      id: r?.id, doc_number: r?.docNumber || r?.doc_number || '',
      doc_date: r?.docDate || r?.doc_date, due_date: r?.dueDate || r?.due_date,
      segment_id: r?.segmentId ?? r?.segment_id, segment_name: r?.segmentName || r?.segment_name,
      proforma_number: r?.proformaNumber || r?.proforma_number,
      customer_id: r?.customerId ?? r?.customer_id, customer_name: r?.customerName || r?.customer_name,
      customer_gstin: r?.customerGstin || r?.customer_gstin, place_of_supply: r?.placeOfSupply || r?.place_of_supply,
      warehouse_name: r?.warehouseName || r?.warehouse_name, payment_terms: r?.paymentTerms || r?.payment_terms,
      remarks: r?.remarks, status: r?.status || 'draft', created_at: r?.createdAt || r?.created_at,
      items: (r?.items || []).map((i: any) => ({
        ...this.normSalesItem(i),
        batch_no: i.batchNo || i.batch_no, serial_no: i.serialNo || i.serial_no,
        expiry_date: i.expiryDate || i.expiry_date,
        warehouse_name: i.warehouseName || i.warehouse_name
      }))
    };
  }

  getSalesInvoices(status?: string, segmentId?: number | null): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (segmentId) params = params.set('segmentId', String(segmentId));
    return this.http.get<ApiResponse<any[]>>(this.salesUrl('invoices'), { headers: this.headers(), params }).pipe(
      map(res => ({ ...res, data: (res.data ?? []).map(r => this.normSalesInvoice(r)) }))
    );
  }

  saveSalesInvoice(payload: Record<string, any>, id?: number | null): Observable<ApiResponse<any>> {
    const h = this.headers(); const body = this.toApiValue(payload);
    return id
      ? this.http.put<ApiResponse<any>>(this.salesUrl(`invoices/${id}`), body, { headers: h })
      : this.http.post<ApiResponse<any>>(this.salesUrl('invoices'), body, { headers: h });
  }

  private normSalesOrder(r: any) {
    return {
      id: r?.id, doc_number: r?.docNumber || r?.doc_number || '',
      doc_date: r?.docDate || r?.doc_date, delivery_date: r?.deliveryDate || r?.delivery_date,
      segment_id: r?.segmentId ?? r?.segment_id, segment_name: r?.segmentName || r?.segment_name,
      customer_id: r?.customerId ?? r?.customer_id, customer_name: r?.customerName || r?.customer_name,
      payment_terms: r?.paymentTerms || r?.payment_terms,
      remarks: r?.remarks, status: r?.status || 'draft', created_at: r?.createdAt || r?.created_at,
      items: (r?.items || []).map((i: any) => this.normSalesItem(i))
    };
  }

  getSalesOrders(status?: string, segmentId?: number | null): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (segmentId) params = params.set('segmentId', String(segmentId));
    return this.http.get<ApiResponse<any[]>>(this.salesUrl('orders'), { headers: this.headers(), params }).pipe(
      map(res => ({ ...res, data: (res.data ?? []).map(r => this.normSalesOrder(r)) }))
    );
  }

  saveSalesOrder(payload: Record<string, any>, id?: number | null): Observable<ApiResponse<any>> {
    const h = this.headers(); const body = this.toApiValue(payload);
    return id
      ? this.http.put<ApiResponse<any>>(this.salesUrl(`orders/${id}`), body, { headers: h })
      : this.http.post<ApiResponse<any>>(this.salesUrl('orders'), body, { headers: h });
  }

  private normSalesQuotation(r: any) {
    return {
      id: r?.id, doc_number: r?.docNumber || r?.doc_number || '',
      doc_date: r?.docDate || r?.doc_date, valid_till: r?.validTill || r?.valid_till,
      segment_id: r?.segmentId ?? r?.segment_id, segment_name: r?.segmentName || r?.segment_name,
      customer_id: r?.customerId ?? r?.customer_id, customer_name: r?.customerName || r?.customer_name,
      payment_terms: r?.paymentTerms || r?.payment_terms, reference_no: r?.referenceNo || r?.reference_no,
      remarks: r?.remarks, status: r?.status || 'draft', created_at: r?.createdAt || r?.created_at,
      items: (r?.items || []).map((i: any) => this.normSalesItem(i))
    };
  }

  getSalesQuotations(status?: string, segmentId?: number | null): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (segmentId) params = params.set('segmentId', String(segmentId));
    return this.http.get<ApiResponse<any[]>>(this.salesUrl('quotations'), { headers: this.headers(), params }).pipe(
      map(res => ({ ...res, data: (res.data ?? []).map(r => this.normSalesQuotation(r)) }))
    );
  }

  saveSalesQuotation(payload: Record<string, any>, id?: number | null): Observable<ApiResponse<any>> {
    const h = this.headers(); const body = this.toApiValue(payload);
    return id
      ? this.http.put<ApiResponse<any>>(this.salesUrl(`quotations/${id}`), body, { headers: h })
      : this.http.post<ApiResponse<any>>(this.salesUrl('quotations'), body, { headers: h });
  }

  cancelSalesDoc(docType: string, docId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      this.salesUrl('cancel'),
      this.toApiValue({ doc_type: docType, doc_id: docId }),
      { headers: this.headers() }
    );
  }

  // ── Purchase Return ──────────────────────────────────────────────────────────

  private normPurchaseReturn(r: any): PurchaseReturn {
    return {
      id: r?.id, return_number: r?.returnNumber || r?.return_number || '',
      return_date: r?.returnDate || r?.return_date,
      segment_id: r?.segmentId ?? r?.segment_id,
      segment_name: r?.segmentName || r?.segment_name,
      vendor_id: r?.vendorId ?? r?.vendor_id,
      vendor_name: r?.vendorName || r?.vendor_name,
      pi_id: r?.piId ?? r?.pi_id,
      pi_number: r?.piNumber || r?.pi_number,
      debit_note_ref: r?.debitNoteRef || r?.debit_note_ref,
      warehouse_id: r?.warehouseId ?? r?.warehouse_id,
      warehouse_name: r?.warehouseName || r?.warehouse_name,
      return_reason: r?.returnReason || r?.return_reason,
      remarks: r?.remarks,
      total_amount: r?.totalAmount ?? r?.total_amount ?? 0,
      status: r?.status || 'draft',
      created_at: r?.createdAt || r?.created_at,
      items: (r?.items || []).map((i: any) => ({
        id: i?.id, sno: i?.sno ?? 0,
        product_id: i?.productId ?? i?.product_id,
        product_name: i?.productName || i?.product_name || '',
        product_code: i?.productCode || i?.product_code,
        uom_name: i?.uomName || i?.uom_name,
        grn_qty: i?.grnQty ?? i?.grn_qty,
        return_qty: i?.returnQty ?? i?.return_qty ?? 0,
        rate: i?.rate ?? 0,
        return_amount: i?.returnAmount ?? i?.return_amount ?? 0,
        return_reason: i?.returnReason || i?.return_reason,
        remarks: i?.remarks
      } as PurchaseReturnItem))
    };
  }

  getPurchaseReturns(status?: string, segmentId?: number | null): Observable<ApiResponse<PurchaseReturn[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (segmentId) params = params.set('segmentId', String(segmentId));
    return this.http.get<ApiResponse<any[]>>(this.url('purchase-returns'), { headers: this.headers(), params }).pipe(
      map(res => ({ ...res, data: (res.data ?? []).map(r => this.normPurchaseReturn(r)) }))
    );
  }

  savePurchaseReturn(payload: Record<string, any>, id?: number | null): Observable<ApiResponse<any>> {
    const h = this.headers(); const body = this.toApiValue(payload);
    return id
      ? this.http.put<ApiResponse<any>>(this.url(`purchase-returns/${id}`), body, { headers: h })
      : this.http.post<ApiResponse<any>>(this.url('purchase-returns'), body, { headers: h });
  }

  // ── Delivery Challan ─────────────────────────────────────────────────────────

  private normDeliveryChallan(r: any): DeliveryChallan {
    return {
      id: r?.id, dc_number: r?.dcNumber || r?.dc_number || '',
      dc_date: r?.dcDate || r?.dc_date,
      segment_id: r?.segmentId ?? r?.segment_id,
      segment_name: r?.segmentName || r?.segment_name,
      so_id: r?.soId ?? r?.so_id,
      so_number: r?.soNumber || r?.so_number,
      customer_id: r?.customerId ?? r?.customer_id,
      customer_name: r?.customerName || r?.customer_name,
      from_warehouse_id: r?.fromWarehouseId ?? r?.from_warehouse_id,
      from_warehouse_name: r?.fromWarehouseName || r?.from_warehouse_name,
      vehicle: r?.vehicle, transporter: r?.transporter,
      lr_no: r?.lrNo || r?.lr_no,
      delivery_address: r?.deliveryAddress || r?.delivery_address,
      remarks: r?.remarks, status: r?.status || 'draft',
      created_at: r?.createdAt || r?.created_at,
      items: (r?.items || []).map((i: any) => ({
        id: i?.id, sno: i?.sno ?? 0,
        product_id: i?.productId ?? i?.product_id,
        product_name: i?.productName || i?.product_name || '',
        product_code: i?.productCode || i?.product_code,
        uom_name: i?.uomName || i?.uom_name,
        so_qty: i?.soQty ?? i?.so_qty,
        dispatch_qty: i?.dispatchQty ?? i?.dispatch_qty ?? 0,
        batch_serial: i?.batchSerial || i?.batch_serial,
        remarks: i?.remarks
      } as DeliveryChallanItem))
    };
  }

  getDeliveryChallans(status?: string, segmentId?: number | null): Observable<ApiResponse<DeliveryChallan[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (segmentId) params = params.set('segmentId', String(segmentId));
    return this.http.get<ApiResponse<any[]>>(this.salesUrl('delivery-challans'), { headers: this.headers(), params }).pipe(
      map(res => ({ ...res, data: (res.data ?? []).map(r => this.normDeliveryChallan(r)) }))
    );
  }

  saveDeliveryChallan(payload: Record<string, any>, id?: number | null): Observable<ApiResponse<any>> {
    const h = this.headers(); const body = this.toApiValue(payload);
    return id
      ? this.http.put<ApiResponse<any>>(this.salesUrl(`delivery-challans/${id}`), body, { headers: h })
      : this.http.post<ApiResponse<any>>(this.salesUrl('delivery-challans'), body, { headers: h });
  }

  // ── Sales Return ─────────────────────────────────────────────────────────────

  private normSalesReturn(r: any): SalesReturn {
    return {
      id: r?.id, return_number: r?.returnNumber || r?.return_number || '',
      return_date: r?.returnDate || r?.return_date,
      segment_id: r?.segmentId ?? r?.segment_id,
      segment_name: r?.segmentName || r?.segment_name,
      customer_id: r?.customerId ?? r?.customer_id,
      customer_name: r?.customerName || r?.customer_name,
      invoice_id: r?.invoiceId ?? r?.invoice_id,
      invoice_number: r?.invoiceNumber || r?.invoice_number,
      credit_note_ref: r?.creditNoteRef || r?.credit_note_ref,
      return_to_warehouse_id: r?.returnToWarehouseId ?? r?.return_to_warehouse_id,
      return_to_warehouse_name: r?.returnToWarehouseName || r?.return_to_warehouse_name,
      return_reason: r?.returnReason || r?.return_reason,
      remarks: r?.remarks,
      total_amount: r?.totalAmount ?? r?.total_amount ?? 0,
      status: r?.status || 'draft',
      created_at: r?.createdAt || r?.created_at,
      items: (r?.items || []).map((i: any) => ({
        id: i?.id, sno: i?.sno ?? 0,
        product_id: i?.productId ?? i?.product_id,
        product_name: i?.productName || i?.product_name || '',
        product_code: i?.productCode || i?.product_code,
        uom_name: i?.uomName || i?.uom_name,
        invoiced_qty: i?.invoicedQty ?? i?.invoiced_qty,
        return_qty: i?.returnQty ?? i?.return_qty ?? 0,
        rate: i?.rate ?? 0,
        return_amount: i?.returnAmount ?? i?.return_amount ?? 0,
        reason: i?.reason, remarks: i?.remarks
      } as SalesReturnItem))
    };
  }

  getSalesReturns(status?: string, segmentId?: number | null): Observable<ApiResponse<SalesReturn[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (segmentId) params = params.set('segmentId', String(segmentId));
    return this.http.get<ApiResponse<any[]>>(this.salesUrl('sales-returns'), { headers: this.headers(), params }).pipe(
      map(res => ({ ...res, data: (res.data ?? []).map(r => this.normSalesReturn(r)) }))
    );
  }

  saveSalesReturn(payload: Record<string, any>, id?: number | null): Observable<ApiResponse<any>> {
    const h = this.headers(); const body = this.toApiValue(payload);
    return id
      ? this.http.put<ApiResponse<any>>(this.salesUrl(`sales-returns/${id}`), body, { headers: h })
      : this.http.post<ApiResponse<any>>(this.salesUrl('sales-returns'), body, { headers: h });
  }

  getRefDocs(docType: string, segmentId?: number | null): Observable<ApiResponse<PurchaseRefDoc[]>> {
    const params = new HttpParams().set('docType', docType);
    const scopedParams = segmentId ? params.set('segmentId', String(segmentId)) : params;
    return this.http.get<ApiResponse<PurchaseRefDoc[]>>(this.url('ref-docs'), { headers: this.headers(), params: scopedParams }).pipe(
      map(res => {
        const docs = (res.data || []).map(r => ({
          id: (r as any).id, doc_number: (r as any).docNumber || (r as any).doc_number || '',
          doc_date: (r as any).docDate || (r as any).doc_date,
          segment_id: (r as any).segmentId ?? (r as any).segment_id,
          segment_name: (r as any).segmentName || (r as any).segment_name,
          branch_id: (r as any).branchId ?? (r as any).branch_id,
          branch_name: (r as any).branchName || (r as any).branch_name,
          warehouse_id: (r as any).warehouseId ?? (r as any).warehouse_id,
          vendor_id: (r as any).vendorId ?? (r as any).vendor_id,
          party_name: (r as any).partyName || (r as any).party_name,
          status: (r as any).status || '', remarks: (r as any).remarks,
          items: (r as any).items || []
        }));
        const filteredDocs = docType.toUpperCase() === 'PR'
          ? docs.filter(doc => String(doc.status || '').trim().toLowerCase() === 'approved')
          : docs;
        return { ...res, data: filteredDocs };
      })
    );
  }
}
