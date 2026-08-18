import { CommonModule } from '@angular/common';
import { Component, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import { purchaseInvoiceConfig } from '../../Inventory_Shared/inventory-screen.model';
import { PurchaseInvoiceAttachment } from '../../Inventory_Shared/inventory-transactions.service';
import { InventoryQuickAddModalComponent } from '../../Inventory_Shared/inventory-quick-add-modal/inventory-quick-add-modal.component';
import { InventorySerialPickerModalComponent } from '../../Inventory_Shared/inventory-serial-picker-modal/inventory-serial-picker-modal.component';

import { InventoryTransportDetailsComponent } from '../../Inventory_Shared/inventory-transport-details/inventory-transport-details.component';
import { PurchaseInvoiceAttachmentsComponent } from './purchase-invoice-attachments.component';

@Component({
  selector: 'app-inventory-purchase-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell, InventoryQuickAddModalComponent, InventorySerialPickerModalComponent, InventoryTransportDetailsComponent, PurchaseInvoiceAttachmentsComponent],
  templateUrl: './purchase-invoice.html',
  styles: [`
    :host ::ng-deep .purchase-invoice-page .inventory-form-grid {
      align-items: start;
    }

    :host ::ng-deep .purchase-invoice-attachment-field {
      min-width: 0;
    }

    :host ::ng-deep .purchase-invoice-attachment-box--empty {
      display: flex;
      align-items: center;
      min-height: 68px;
      padding: 8px 10px;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
      color: #64748b;
      font-size: 11px;
      font-weight: 600;
    }

    :host .purchase-invoice-compact-check {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 30px;
      padding: 0 9px;
      border: 1px solid #dbe8f9;
      border-radius: 7px;
      background: #fff;
      color: #475569;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
    }

    :host .purchase-invoice-compact-check input {
      width: 14px;
      height: 14px;
      margin: 0;
      accent-color: #a8552f;
    }

    :host ::ng-deep .purchase-invoice-line-grid {
      border-radius: 8px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-line-title {
      padding: 10px 12px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-line-title-actions {
      gap: 6px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-line-title-actions .erp-btn.btn-sm {
      min-height: 30px;
      padding: 0 10px;
      border-radius: 7px;
      font-size: 12px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact {
      --grn-grid-control-height: 30px;
      min-width: 1260px;
      table-layout: fixed;
      border-collapse: separate;
      border-spacing: 0;
    }

    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact th,
    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact td {
      max-width: none;
      min-width: 86px;
      width: 86px;
      padding: 0 !important;
      white-space: nowrap;
      overflow-wrap: normal;
    }

    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact th {
      height: 32px;
      padding: 5px 7px !important;
      border-right: 1px solid #e2e8f0;
      font-size: 10.5px;
      line-height: 1.15;
      vertical-align: middle;
    }

    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact td {
      height: 31px;
      border-right: 1px solid #e8eef6;
      border-bottom: 1px solid #edf2f7;
      background: #fff;
      font-size: 12px;
      line-height: 1.2;
      vertical-align: top;
    }

    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact th:first-child,
    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact td:first-child {
      min-width: 58px;
      width: 58px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact th:nth-child(2),
    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact td:nth-child(2),
    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact th.inventory-line-col-product,
    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact td.inventory-line-col-product {
      min-width: 220px;
      width: 220px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact th.purchase-invoice-line-col-variant,
    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact td.purchase-invoice-line-col-variant {
      min-width: 130px;
      width: 130px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact th.purchase-invoice-line-col-attribute,
    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact td.purchase-invoice-line-col-attribute {
      min-width: 120px;
      width: 120px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact th.inventory-line-col-qty,
    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact td.inventory-line-col-qty {
      min-width: 78px;
      width: 78px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact th.inventory-line-col-rate,
    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact td.inventory-line-col-rate,
    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact th.inventory-line-col-amount,
    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact td.inventory-line-col-amount {
      min-width: 92px;
      width: 92px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact th.inventory-line-col-disc,
    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact td.inventory-line-col-disc {
      min-width: 68px;
      width: 68px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact th.inventory-line-col-gst,
    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact td.inventory-line-col-gst {
      min-width: 126px;
      width: 126px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact th.purchase-invoice-line-col-serial,
    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact td.purchase-invoice-line-col-serial {
      min-width: 148px;
      width: 148px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .erp-table.compact td:focus-within {
      position: relative;
      z-index: 2;
      box-shadow: inset 0 0 0 2px #22c55e;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-row-actions {
      justify-content: center;
      gap: 3px;
      min-height: 30px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-row-actions .erp-btn.btn-icon {
      width: 24px;
      height: 24px;
      min-width: 24px;
      padding: 0;
      border-radius: 6px;
      font-size: 11px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-grid-input,
    :host ::ng-deep .purchase-invoice-line-grid .inventory-serial-trigger,
    :host ::ng-deep .purchase-invoice-line-grid .inventory-grid-empty-hint,
    :host ::ng-deep .purchase-invoice-line-grid .inventory-grid-static-value,
    :host ::ng-deep .purchase-invoice-line-grid .inventory-grid-na {
      width: 100%;
      min-width: 0;
      min-height: var(--grn-grid-control-height) !important;
      height: var(--grn-grid-control-height) !important;
      padding: 4px 7px !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: #fff !important;
      box-shadow: none !important;
      color: #1e293b;
      font-size: 12px !important;
      font-weight: 500;
      line-height: 1.2 !important;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-grid-input::placeholder {
      font-size: 12px;
      color: #94a3b8;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-grid-input:focus {
      transform: none;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-serial-trigger {
      justify-content: flex-start;
      gap: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-grid-na,
    :host ::ng-deep .purchase-invoice-line-grid .inventory-grid-empty-hint {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-grid-static-value {
      display: inline-flex;
      align-items: center;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host ::ng-deep .purchase-invoice-line-grid .purchase-invoice-grid-select.ng-select {
      width: 100%;
      min-width: 0;
    }

    :host ::ng-deep .purchase-invoice-line-grid .purchase-invoice-grid-select .ng-select-container {
      min-width: 0;
      min-height: var(--grn-grid-control-height) !important;
      height: var(--grn-grid-control-height) !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: #fff !important;
      box-shadow: none !important;
      font-size: 12px !important;
    }

    :host ::ng-deep .purchase-invoice-line-grid .purchase-invoice-grid-select.ng-select-focused .ng-select-container {
      border: 0 !important;
      box-shadow: none !important;
    }

    :host ::ng-deep .purchase-invoice-line-grid .purchase-invoice-grid-select .ng-value-container {
      min-height: var(--grn-grid-control-height) !important;
      padding-left: 7px !important;
    }

    :host ::ng-deep .purchase-invoice-line-grid .purchase-invoice-grid-select .ng-arrow-wrapper,
    :host ::ng-deep .purchase-invoice-line-grid .purchase-invoice-grid-select .ng-clear-wrapper,
    :host ::ng-deep .purchase-invoice-line-grid .purchase-invoice-grid-select .ng-clear-zone {
      min-height: var(--grn-grid-control-height) !important;
      height: var(--grn-grid-control-height) !important;
    }

    :host ::ng-deep .purchase-invoice-line-grid .purchase-invoice-grid-select .ng-arrow-wrapper {
      width: 16px;
      padding: 0 4px 0 0 !important;
    }

    :host ::ng-deep .purchase-invoice-line-grid .purchase-invoice-grid-select .ng-placeholder,
    :host ::ng-deep .purchase-invoice-line-grid .purchase-invoice-grid-select .ng-value-label,
    :host ::ng-deep .purchase-invoice-line-grid .purchase-invoice-grid-select .ng-input input {
      overflow: hidden;
      font-size: 12px !important;
      line-height: 1.2 !important;
      text-overflow: ellipsis;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-line-subcell {
      margin-top: 0;
      border-top: 1px solid #edf2f7;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-line-subcell .purchase-invoice-grid-select .ng-select-container,
    :host ::ng-deep .purchase-invoice-line-grid .inventory-line-subcell .inventory-grid-subtitle {
      min-height: 28px !important;
      height: 28px !important;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-grid-subtitle {
      display: flex;
      align-items: center;
      margin: 0;
      padding: 4px 7px;
      color: #64748b;
      font-size: 11px;
      font-weight: 600;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-gst-cell {
      min-height: var(--grn-grid-control-height);
      height: var(--grn-grid-control-height);
      gap: 3px;
      padding: 2px 3px;
      border: 0;
      border-radius: 0;
      background: #f8fbff;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-gst-rate-pill {
      min-width: 38px;
      height: 24px;
      padding: 0 6px;
      border-radius: 6px;
      font-size: 11px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-gst-mode-toggle {
      height: 24px;
      padding: 1px;
      border-radius: 6px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-gst-mode-toggle button {
      min-width: 30px;
      height: 20px;
      padding: 0 5px;
      border-radius: 5px;
      font-size: 10px;
    }

    :host ::ng-deep .purchase-invoice-line-grid .inventory-line-total-row td {
      height: 34px;
      padding: 7px !important;
      background: #f8fafc;
    }

    :host .purchase-invoice-expanded-ref-strip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      margin-left: auto;
    }

    :host .purchase-invoice-expanded-ref-state {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: #64748b;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }

    :host .purchase-invoice-expanded-ref-link {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      max-width: 170px;
      min-height: 26px;
      padding: 0 9px;
      border: 1px solid #bfdbfe;
      border-radius: 7px;
      background: #eff6ff;
      color: #1d4ed8;
      cursor: pointer;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      text-decoration: none;
      white-space: nowrap;
    }

    :host .purchase-invoice-expanded-ref-link span {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host .purchase-invoice-expanded-ref-link:hover,
    :host .purchase-invoice-expanded-ref-link:focus-visible {
      border-color: #93c5fd;
      background: #dbeafe;
      outline: none;
    }

    :host .purchase-invoice-expanded-attachment-modal {
      width: min(960px, calc(100vw - 32px));
    }

    :host .purchase-invoice-expanded-attachment-img {
      display: block;
      max-width: 100%;
      max-height: 70vh;
      margin: 0 auto;
    }

    :host .purchase-invoice-expanded-attachment-frame {
      width: 100%;
      height: 70vh;
      border: 0;
    }

    ::ng-deep body .ng-dropdown-panel.purchase-invoice-grid-select {
      width: max-content !important;
      min-width: 260px !important;
      max-width: min(620px, calc(100vw - 24px)) !important;
    }
  `]
})
export class InventoryPurchaseInvoiceComponent extends InventoryScreenShell implements OnDestroy {
  override readonly config = purchaseInvoiceConfig;
  @ViewChild(PurchaseInvoiceAttachmentsComponent) private purchaseInvoiceAttachments?: PurchaseInvoiceAttachmentsComponent;

  private readonly sanitizer = inject(DomSanitizer);
  private pendingAttachmentResolveTimer: ReturnType<typeof setTimeout> | null = null;
  readonly expandedPiAttachments = signal<Record<number, PurchaseInvoiceAttachment[]>>({});
  readonly expandedPiAttachmentLoading = signal<Record<number, boolean>>({});
  readonly expandedPiAttachmentErrors = signal<Record<number, string>>({});
  readonly expandedAttachmentPreviewOpen = signal(false);
  readonly expandedAttachmentPreviewLoading = signal(false);
  readonly expandedAttachmentPreviewError = signal('');
  readonly expandedAttachmentPreviewName = signal('');
  readonly expandedAttachmentPreviewKind = signal<'image' | 'pdf' | 'other' | null>(null);
  readonly expandedAttachmentPreviewImgUrl = signal<SafeUrl | null>(null);
  readonly expandedAttachmentPreviewFrameUrl = signal<SafeResourceUrl | null>(null);
  private expandedAttachmentPreviewObjectUrl: string | null = null;

  override ngOnInit(): void {
    super.ngOnInit();
    [0, 350, 900].forEach(delay => {
      setTimeout(() => {
        const alreadyPicked = String(this.formValues()['grnReference'] || '').trim();
        if (!this.editingId() && !alreadyPicked && !this.refPickerOpen()) {
          this.openPurchaseReferencePicker();
        }
      }, delay);
    });
  }

  override transactionLineDisplayColumns(columns: string[]): string[] {
    const grnLinked = !!this.formValues()['grnId'];
    return columns.filter(column => {
      const key = this.piNormalizeColumnKey(column);
      const compact = key.replace(/[^a-z0-9]+/g, '');
      if (this.hideMrpSellingPrice() && (key === 'mrp' || key === 'selling price')) return false;
      if (grnLinked && compact === 'qty') return false;
      if (!grnLinked && (compact === 'receivedqty' || compact === 'acceptedqty')) return false;
      return true;
    });
  }

  override lineGridRenderColumns(): string[] {
    return this.transactionLineDisplayColumns(this.visibleLineColumns());
  }

  purchaseInvoiceColumnIsVariant(column: string): boolean {
    return this.piNormalizeColumnKey(column) === 'variant';
  }

  purchaseInvoiceColumnIsAttribute(column: string): boolean {
    return this.piNormalizeColumnKey(column) === 'attribute';
  }

  togglePurchaseInvoiceExpandedRow(row: string[]): void {
    this.toggleExpandGrn(row);
    if (!this.isExpandedGrn(row)) return;
    const invoiceId = this.purchaseInvoiceIdForRow(row);
    if (invoiceId) this.loadExpandedPiAttachments(invoiceId);
  }

  expandedPiAttachmentRefs(row: string[]): PurchaseInvoiceAttachment[] {
    const invoiceId = this.purchaseInvoiceIdForRow(row);
    return invoiceId ? (this.expandedPiAttachments()[invoiceId] || []) : [];
  }

  expandedPiAttachmentLoadingForRow(row: string[]): boolean {
    const invoiceId = this.purchaseInvoiceIdForRow(row);
    return !!invoiceId && !!this.expandedPiAttachmentLoading()[invoiceId];
  }

  expandedPiAttachmentErrorForRow(row: string[]): string {
    const invoiceId = this.purchaseInvoiceIdForRow(row);
    return invoiceId ? (this.expandedPiAttachmentErrors()[invoiceId] || '') : '';
  }

  previewExpandedPiAttachment(attachment: PurchaseInvoiceAttachment): void {
    this.expandedAttachmentPreviewOpen.set(true);
    this.expandedAttachmentPreviewLoading.set(true);
    this.expandedAttachmentPreviewError.set('');
    this.expandedAttachmentPreviewName.set(attachment.fileName);
    const kind = this.classifyAttachment(attachment.fileName);
    this.expandedAttachmentPreviewKind.set(kind);

    this.txService.downloadS3File('PurchaseInvoiceAttachment', attachment.fileKey).subscribe({
      next: blob => {
        this.expandedAttachmentPreviewLoading.set(false);
        this.revokeExpandedAttachmentPreviewUrl();
        const url = URL.createObjectURL(blob);
        this.expandedAttachmentPreviewObjectUrl = url;
        if (kind === 'image') {
          this.expandedAttachmentPreviewImgUrl.set(this.sanitizer.bypassSecurityTrustUrl(url));
        } else if (kind === 'pdf') {
          this.expandedAttachmentPreviewFrameUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        }
      },
      error: err => {
        this.expandedAttachmentPreviewLoading.set(false);
        this.expandedAttachmentPreviewError.set(this.apiErrorMessage(err, 'Could not load this file for preview.'));
      }
    });
  }

  closeExpandedPiAttachmentPreview(): void {
    this.expandedAttachmentPreviewOpen.set(false);
    this.expandedAttachmentPreviewLoading.set(false);
    this.expandedAttachmentPreviewError.set('');
    this.expandedAttachmentPreviewName.set('');
    this.expandedAttachmentPreviewKind.set(null);
    this.expandedAttachmentPreviewImgUrl.set(null);
    this.expandedAttachmentPreviewFrameUrl.set(null);
    this.revokeExpandedAttachmentPreviewUrl();
  }

  override ngOnDestroy(): void {
    this.closeExpandedPiAttachmentPreview();
    super.ngOnDestroy?.();
  }

  override savePurchaseInvoiceDraft(): void {
    const pendingAttachment = this.preparePendingAttachmentSave();
    super.savePurchaseInvoiceDraft();
    if (pendingAttachment) this.resolvePendingAttachmentAfterSave(pendingAttachment);
  }

  override postPurchaseInvoice(): void {
    const pendingAttachment = this.preparePendingAttachmentSave();
    super.postPurchaseInvoice();
    if (pendingAttachment) this.resolvePendingAttachmentAfterSave(pendingAttachment);
  }

  private piNormalizeColumnKey(value: any): string {
    return String(value ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  }

  private purchaseInvoiceRecordForRow(row: string[]): any | null {
    const piNo = String(row?.[0] || '').trim();
    if (!piNo) return null;
    return this.savedRecordObjects().find(record =>
      String(record?.pi_number ?? record?.piNumber ?? '').trim() === piNo
    ) || null;
  }

  private purchaseInvoiceIdForRow(row: string[]): number | null {
    const id = Number(this.purchaseInvoiceRecordForRow(row)?.id || 0);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private loadExpandedPiAttachments(invoiceId: number): void {
    if (this.expandedPiAttachmentLoading()[invoiceId]) return;
    this.expandedPiAttachmentLoading.update(state => ({ ...state, [invoiceId]: true }));
    this.expandedPiAttachmentErrors.update(state => ({ ...state, [invoiceId]: '' }));
    this.txService.getPurchaseInvoiceAttachments(invoiceId).subscribe({
      next: res => {
        this.expandedPiAttachmentLoading.update(state => ({ ...state, [invoiceId]: false }));
        this.expandedPiAttachments.update(state => ({ ...state, [invoiceId]: res.data || [] }));
      },
      error: err => {
        this.expandedPiAttachmentLoading.update(state => ({ ...state, [invoiceId]: false }));
        this.expandedPiAttachmentErrors.update(state => ({ ...state, [invoiceId]: this.apiErrorMessage(err, 'Could not load attachment refs.') }));
      }
    });
  }

  private classifyAttachment(fileName: string): 'image' | 'pdf' | 'other' {
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    if (['jpg', 'jpeg', 'png'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    return 'other';
  }

  private revokeExpandedAttachmentPreviewUrl(): void {
    if (!this.expandedAttachmentPreviewObjectUrl) return;
    URL.revokeObjectURL(this.expandedAttachmentPreviewObjectUrl);
    this.expandedAttachmentPreviewObjectUrl = null;
  }

  private preparePendingAttachmentSave(): { existingId: number | null; beforeIds: Set<number>; payload: Record<string, any> } | null {
    const attachmentPanel = this.purchaseInvoiceAttachments;
    if (!attachmentPanel?.hasPendingAttachment()) return null;
    return {
      existingId: this.editingId(),
      beforeIds: new Set(this.savedRecordObjects().map(record => Number(record?.id)).filter(id => Number.isFinite(id) && id > 0)),
      payload: this.buildPayload()
    };
  }

  private resolvePendingAttachmentAfterSave(context: { existingId: number | null; beforeIds: Set<number>; payload: Record<string, any> }): void {
    if (this.pendingAttachmentResolveTimer) {
      clearTimeout(this.pendingAttachmentResolveTimer);
      this.pendingAttachmentResolveTimer = null;
    }

    let attempts = 0;
    const tick = () => {
      attempts += 1;
      if (!this.purchaseInvoiceAttachments?.hasPendingAttachment()) return;
      if (this.isSaving()) {
        this.pendingAttachmentResolveTimer = setTimeout(tick, 250);
        return;
      }
      if (this.saveError()) return;

      const existingId = Number(context.existingId || 0);
      if (existingId > 0) {
        this.purchaseInvoiceAttachments.attachPendingToPurchaseInvoice(existingId);
        return;
      }

      const localMatch = this.findSavedPurchaseInvoiceForPendingAttachment(this.savedRecordObjects(), context);
      if (localMatch) {
        this.reopenSavedPurchaseInvoiceAndAttach(localMatch);
        return;
      }

      this.txService.getPurchaseInvoices(undefined, this.currentSegmentId).subscribe({
        next: res => {
          const records = Array.isArray(res.data) ? res.data : [];
          if (records.length) this.savedRecordObjects.set(records);
          const match = this.findSavedPurchaseInvoiceForPendingAttachment(records, context);
          if (match) {
            this.reopenSavedPurchaseInvoiceAndAttach(match);
            return;
          }
          if (attempts < 20) {
            this.pendingAttachmentResolveTimer = setTimeout(tick, 350);
          } else {
            this.purchaseInvoiceAttachments?.setPendingAttachmentMessage('Draft saved. Click Edit on the saved PI to finish attaching the selected file.');
          }
        },
        error: err => {
          if (attempts < 20) {
            this.pendingAttachmentResolveTimer = setTimeout(tick, 500);
          } else {
            this.purchaseInvoiceAttachments?.setPendingAttachmentMessage(this.apiErrorMessage(err, 'Draft saved, but the attachment could not be linked yet. Click Edit and attach again.'));
          }
        }
      });
    };

    this.pendingAttachmentResolveTimer = setTimeout(tick, 250);
  }

  private findSavedPurchaseInvoiceForPendingAttachment(records: any[], context: { beforeIds: Set<number>; payload: Record<string, any> }): any | null {
    const normalize = (value: any) => String(value ?? '').trim().toLowerCase();
    const piNo = normalize(context.payload['pi_number']);
    const vendorInvoiceNo = normalize(context.payload['vendor_invoice_no']);
    const vendorId = Number(context.payload['vendor_id'] || 0);
    const piDate = normalize(context.payload['pi_date']);

    const candidates = records
      .filter(record => {
        const id = Number(record?.id);
        return Number.isFinite(id) && id > 0 && !context.beforeIds.has(id);
      })
      .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));

    return candidates.find(record => piNo && normalize(record?.pi_number ?? record?.piNumber) === piNo)
      || candidates.find(record => vendorInvoiceNo && normalize(record?.vendor_invoice_no ?? record?.vendorInvoiceNo) === vendorInvoiceNo)
      || candidates.find(record => vendorId > 0 && Number(record?.vendor_id ?? record?.vendorId ?? 0) === vendorId && (!piDate || normalize(record?.pi_date ?? record?.piDate) === piDate))
      || candidates[0]
      || null;
  }

  private reopenSavedPurchaseInvoiceAndAttach(record: any): void {
    const savedId = Number(record?.id || 0);
    if (!savedId) return;
    const row = this.mapToGridRows([record])[0];
    if (row) this.editRecordByRow(row);
    this.purchaseInvoiceAttachments?.attachPendingToPurchaseInvoice(savedId);
  }
}
