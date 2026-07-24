import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { InventoryConfigService, VendorItem, CustomerItem } from '../../Inventory_Shared/inventory-config.service';
import { AvailableNote, OutstandingInvoice, PaymentVoucher, PaymentsService } from '../../Inventory_Shared/payments.service';
import { StickyFooterOffsetService } from '../../../core/services/Common/sticky-footer-offset.service';

type VoucherMode = 'pay' | 'receipt';
type ModeRow = { modeKey: string; amount: number; refJson: Record<string, string> };

interface ModeDef {
  key: string;
  label: string;
  icon: string;
  fields: { key: string; placeholder: string }[];
}

const MODE_DEFS: ModeDef[] = [
  { key: 'cash',   label: 'Cash',              icon: 'pi pi-wallet',          fields: [] },
  { key: 'upi',     label: 'UPI',               icon: 'pi pi-mobile',          fields: [{ key: 'UPI ID / Ref', placeholder: 'name@bank / txn ref' }] },
  { key: 'card',    label: 'Card',              icon: 'pi pi-credit-card',     fields: [{ key: 'Card (last 4) / Auth', placeholder: '**** 4321 · auth code' }] },
  { key: 'cheque',  label: 'Cheque',            icon: 'pi pi-file-edit',       fields: [{ key: 'Cheque No.', placeholder: '000000' }, { key: 'Cheque Date / Bank', placeholder: 'dd-mm-yyyy · Bank' }] },
  { key: 'neft',    label: 'NEFT / RTGS',       icon: 'pi pi-building',        fields: [{ key: 'UTR No.', placeholder: 'UTR reference' }, { key: 'Bank Account', placeholder: 'Company bank a/c' }] },
  { key: 'imps',    label: 'IMPS',              icon: 'pi pi-bolt',            fields: [{ key: 'Ref No.', placeholder: 'IMPS reference' }] },
];

const TDS_SECTIONS: { value: string; label: string }[] = [
  { value: '194C',  label: '194C — Contractors/Sub-contractors' },
  { value: '194H',  label: '194H — Commission/Brokerage' },
  { value: '194I',  label: '194I — Rent' },
  { value: '194J',  label: '194J — Professional/Technical Fees' },
  { value: '194JA', label: '194JA — Professional Fees (Individual/HUF)' },
  { value: '194R',  label: '194R — Benefits/Perquisites' },
  { value: 'OTHER', label: 'Other' },
];

@Component({
  selector: 'app-payment-receipt-voucher',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, ToastModule],
  providers: [MessageService],
  templateUrl: './payment-receipt-voucher.html',
  styleUrl: './payment-receipt-voucher.scss'
})
export class PaymentReceiptVoucherComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly inventoryConfigService = inject(InventoryConfigService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly footerOffset = inject(StickyFooterOffsetService);
  private readonly messageService = inject(MessageService);

  readonly modeDefs = MODE_DEFS;
  readonly tdsSections = TDS_SECTIONS;
  readonly Math = Math;

  readonly mode = signal<VoucherMode>('pay');
  readonly parties = signal<(VendorItem | CustomerItem)[]>([]);
  readonly loadingParties = signal(false);
  readonly selectedPartyId = signal<number | null>(null);

  readonly outstandingInvoices = signal<OutstandingInvoice[]>([]);
  readonly loadingInvoices = signal(false);
  readonly selectedInvoiceIds = signal<Set<number>>(new Set());
  readonly allocAmounts = signal<Record<number, number>>({});
  readonly quickAmount = signal<number>(0);

  readonly availableNotes = signal<AvailableNote[]>([]);
  readonly selectedNoteIds = signal<Set<number>>(new Set());
  readonly noteApplyAmounts = signal<Record<number, number>>({});

  readonly modeRows = signal<ModeRow[]>([]);
  readonly narration = signal('');
  readonly tdsApplicable = signal(false);
  readonly tdsAmount = signal<number>(0);
  readonly tdsSection = signal<string>('');
  readonly voucherDate = signal<string>(new Date().toISOString().slice(0, 10));

  readonly drawerInvoice = signal<OutstandingInvoice | null>(null);
  readonly drawerHistory = signal<{ voucherNumber: string; date?: string; amount: number }[]>([]);

  readonly vouchers = signal<PaymentVoucher[]>([]);
  readonly loadingVouchers = signal(false);

  readonly isSaving = signal(false);
  readonly saveMsg = signal('');
  readonly saveError = signal('');

  readonly partyType = computed<'vendor' | 'customer'>(() => this.mode() === 'pay' ? 'vendor' : 'customer');
  readonly partyLabel = computed(() => this.mode() === 'pay' ? 'Vendor' : 'Customer');
  readonly docLabel = computed(() => this.mode() === 'pay' ? 'Purchase Invoice' : 'Sales Invoice');
  readonly invoiceTypeKey = computed<'purchase_invoice' | 'sales_invoice'>(() => this.mode() === 'pay' ? 'purchase_invoice' : 'sales_invoice');

  readonly selectedParty = computed(() => {
    const id = this.selectedPartyId();
    if (!id) return null;
    return this.parties().find(p => p.id === id) ?? null;
  });

  readonly partyName = (p: VendorItem | CustomerItem): string => (p as VendorItem).vendor_name ?? (p as CustomerItem).customer_name ?? '';

  readonly partyOptions = computed(() => this.parties().map(p => ({ id: p.id, name: this.partyName(p) })));

  readonly totalOutstanding = computed(() => this.outstandingInvoices().reduce((s, i) => s + i.outstanding, 0));
  readonly overdueTotal = computed(() => {
    const today = this.today();
    return this.outstandingInvoices()
      .filter(i => i.due_date && this.daysBetween(i.due_date, today) > 0)
      .reduce((s, i) => s + i.outstanding, 0);
  });

  readonly totalAllocated = computed(() => {
    const alloc = this.allocAmounts();
    let sum = 0;
    for (const id of this.selectedInvoiceIds()) sum += alloc[id] || 0;
    return sum;
  });

  // Balance that will still be outstanding for this party once this voucher is posted.
  readonly remainingOutstanding = computed(() => Math.max(0, this.totalOutstanding() - this.totalAllocated()));

  // GST embedded in the amount currently allocated to selected invoices,
  // split proportionally per invoice (an invoice's own tax_amount / total_amount ratio).
  readonly gstInAllocated = computed(() => {
    const alloc = this.allocAmounts();
    const ids = this.selectedInvoiceIds();
    let gst = 0;
    for (const inv of this.outstandingInvoices()) {
      if (!ids.has(inv.invoice_id) || !inv.tax_amount || !inv.total_amount) continue;
      gst += (alloc[inv.invoice_id] || 0) * (inv.tax_amount / inv.total_amount);
    }
    return gst;
  });
  readonly taxableInAllocated = computed(() => Math.max(0, this.totalAllocated() - this.gstInAllocated()));

  // Debit/Credit Note value applied against this voucher — nets off the
  // invoice total, so cash/bank modes only need to cover what's left.
  readonly totalNotesApplied = computed(() => {
    const amounts = this.noteApplyAmounts();
    let sum = 0;
    for (const id of this.selectedNoteIds()) sum += amounts[id] || 0;
    return sum;
  });

  readonly modeTotal = computed(() => this.modeRows().reduce((s, r) => s + (r.amount || 0), 0));

  readonly onAccountAmount = computed(() => Math.max(0, this.modeTotal() + this.totalNotesApplied() + this.tdsAmount() - this.totalAllocated()));
  readonly netAmount = computed(() => Math.max(0, this.modeTotal()));

  // What the mode-total should match: the selected invoices' allocated total
  // once any are ticked, otherwise the quick "amount to pay/receive" figure
  // typed at the top before any invoice is picked — minus whatever's been
  // netted off via an applied Debit/Credit Note.
  readonly referenceTotal = computed(() => Math.max(0,
    (this.selectedInvoiceIds().size > 0 ? this.totalAllocated() : this.quickAmount()) - this.totalNotesApplied()
  ));
  readonly modeDiff = computed(() => this.modeTotal() - (this.referenceTotal() - this.tdsAmount()));
  readonly modeShort = computed(() => this.modeDiff() < -0.005);

  readonly canSave = computed(() =>
    !!this.selectedPartyId() && (this.totalAllocated() > 0 || this.modeTotal() > 0 || this.totalNotesApplied() > 0) && !this.isSaving()
  );

  constructor() {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => {
      const initialMode = (data['mode'] === 'receipt' ? 'receipt' : 'pay') as VoucherMode;
      this.setMode(initialMode);
    });

    // Push the global SOS button up above this page's own sticky footer while it's visible.
    effect(() => this.footerOffset.set(this.selectedParty() ? 100 : 0));
    this.destroyRef.onDestroy(() => this.footerOffset.clear());
  }

  today(): string { return new Date().toISOString().slice(0, 10); }
  daysBetween(a: string, b: string): number { return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000); }
  fmtDate(d?: string): string { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
  fmt(n: number | undefined): string { return '₹ ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  agingLabel(inv: OutstandingInvoice): { text: string; cls: string } {
    if (!inv.due_date) return { text: 'Not set', cls: 'badge-success' };
    const od = this.daysBetween(inv.due_date, this.today());
    const partPaid = inv.paid_amount > 0;
    if (od > 0) return { text: `Overdue ${od}d${partPaid ? ' · Part-paid' : ''}`, cls: 'badge-danger' };
    if (partPaid) return { text: 'Part-paid', cls: 'badge-info' };
    if (od > -7) return { text: `Due in ${-od}d`, cls: 'badge-warning' };
    return { text: 'Not set', cls: 'badge-success' };
  }

  setMode(mode: VoucherMode): void {
    this.mode.set(mode);
    this.selectedPartyId.set(null);
    this.outstandingInvoices.set([]);
    this.selectedInvoiceIds.set(new Set());
    this.allocAmounts.set({});
    this.availableNotes.set([]);
    this.selectedNoteIds.set(new Set());
    this.noteApplyAmounts.set({});
    this.quickAmount.set(0);
    this.modeRows.set([]);
    this.narration.set('');
    this.tdsApplicable.set(false);
    this.tdsAmount.set(0);
    this.tdsSection.set('');
    this.saveMsg.set('');
    this.saveError.set('');
    this.loadParties();
    this.loadVouchers();
  }

  private loadParties(): void {
    this.loadingParties.set(true);
    const onNext = (res: { data?: (VendorItem | CustomerItem)[] }) => { this.parties.set(res.data ?? []); this.loadingParties.set(false); };
    const onError = () => { this.parties.set([]); this.loadingParties.set(false); };
    if (this.mode() === 'pay') {
      this.inventoryConfigService.getVendors(null, false).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: onNext, error: onError });
    } else {
      this.inventoryConfigService.getCustomers(null, false).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: onNext, error: onError });
    }
  }

  private loadVouchers(): void {
    this.loadingVouchers.set(true);
    this.paymentsService.getPaymentVouchers(this.mode() === 'pay' ? 'payment' : 'receipt')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => { this.vouchers.set(res.data ?? []); this.loadingVouchers.set(false); },
        error: () => { this.vouchers.set([]); this.loadingVouchers.set(false); }
      });
  }

  onPartyChange(partyId: number | null): void {
    this.selectedPartyId.set(partyId);
    this.outstandingInvoices.set([]);
    this.selectedInvoiceIds.set(new Set());
    this.allocAmounts.set({});
    this.availableNotes.set([]);
    this.selectedNoteIds.set(new Set());
    this.noteApplyAmounts.set({});
    this.quickAmount.set(0);
    this.modeRows.set([]);
    if (!partyId) return;
    this.loadingInvoices.set(true);
    this.paymentsService.getOutstandingInvoices(this.partyType(), partyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => { this.outstandingInvoices.set(res.data ?? []); this.loadingInvoices.set(false); },
        error: () => { this.outstandingInvoices.set([]); this.loadingInvoices.set(false); }
      });
    this.paymentsService.getAvailableNotes(this.partyType(), partyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.availableNotes.set(res.data ?? []),
        error: () => this.availableNotes.set([])
      });
  }

  toggleInvoice(inv: OutstandingInvoice, checked: boolean): void {
    const ids = new Set(this.selectedInvoiceIds());
    const alloc = { ...this.allocAmounts() };
    if (checked) {
      ids.add(inv.invoice_id);
      if (!alloc[inv.invoice_id]) alloc[inv.invoice_id] = inv.outstanding;
    } else {
      ids.delete(inv.invoice_id);
      alloc[inv.invoice_id] = 0;
    }
    this.selectedInvoiceIds.set(ids);
    this.allocAmounts.set(alloc);
  }

  isSelected(inv: OutstandingInvoice): boolean { return this.selectedInvoiceIds().has(inv.invoice_id); }
  allocFor(inv: OutstandingInvoice): number { return this.allocAmounts()[inv.invoice_id] || 0; }

  setAlloc(inv: OutstandingInvoice, value: string): void {
    let v = this.parseAmt(value);
    if (v > inv.outstanding) v = inv.outstanding;
    this.allocAmounts.update(a => ({ ...a, [inv.invoice_id]: v }));
  }

  allocExceeds(inv: OutstandingInvoice): boolean { return this.allocFor(inv) > inv.outstanding + 0.005; }

  fullAlloc(inv: OutstandingInvoice): void {
    const ids = new Set(this.selectedInvoiceIds());
    ids.add(inv.invoice_id);
    this.selectedInvoiceIds.set(ids);
    this.allocAmounts.update(a => ({ ...a, [inv.invoice_id]: inv.outstanding }));
  }

  selectAll(on: boolean): void {
    const ids = new Set<number>();
    const alloc: Record<number, number> = {};
    for (const inv of this.outstandingInvoices()) {
      if (on) { ids.add(inv.invoice_id); alloc[inv.invoice_id] = inv.outstanding; }
      else alloc[inv.invoice_id] = 0;
    }
    this.selectedInvoiceIds.set(ids);
    this.allocAmounts.set(alloc);
  }

  allSelected(): boolean {
    const rows = this.outstandingInvoices();
    return rows.length > 0 && rows.every(r => this.isSelected(r));
  }

  toggleNote(note: AvailableNote, checked: boolean): void {
    const ids = new Set(this.selectedNoteIds());
    const amounts = { ...this.noteApplyAmounts() };
    if (checked) {
      ids.add(note.note_id);
      if (!amounts[note.note_id]) amounts[note.note_id] = note.outstanding;
    } else {
      ids.delete(note.note_id);
      amounts[note.note_id] = 0;
    }
    this.selectedNoteIds.set(ids);
    this.noteApplyAmounts.set(amounts);
  }

  isNoteSelected(note: AvailableNote): boolean { return this.selectedNoteIds().has(note.note_id); }
  noteApplyFor(note: AvailableNote): number { return this.noteApplyAmounts()[note.note_id] || 0; }

  setNoteApply(note: AvailableNote, value: string): void {
    let v = this.parseAmt(value);
    if (v > note.outstanding) v = note.outstanding;
    this.noteApplyAmounts.update(a => ({ ...a, [note.note_id]: v }));
  }

  noteApplyExceeds(note: AvailableNote): boolean { return this.noteApplyFor(note) > note.outstanding + 0.005; }

  clearAllocations(): void {
    this.selectedInvoiceIds.set(new Set());
    this.allocAmounts.set({});
    this.selectedNoteIds.set(new Set());
    this.noteApplyAmounts.set({});
    this.quickAmount.set(0);
    this.modeRows.set([]);
    this.tdsAmount.set(0);
    this.tdsSection.set('');
  }

  toggleTds(on: boolean): void {
    this.tdsApplicable.set(on);
    if (!on) { this.tdsAmount.set(0); this.tdsSection.set(''); }
  }

  parseAmt(v: string): number {
    const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  autoAllocate(): void {
    let amt = this.quickAmount();
    if (amt <= 0) { this.saveError.set('Enter an amount to auto-allocate.'); return; }
    const sorted = [...this.outstandingInvoices()].sort((a, b) =>
      new Date(a.due_date || a.invoice_date || '').getTime() - new Date(b.due_date || b.invoice_date || '').getTime());
    const ids = new Set<number>();
    const alloc: Record<number, number> = {};
    for (const inv of sorted) {
      if (amt <= 0) { alloc[inv.invoice_id] = 0; continue; }
      const take = Math.min(inv.outstanding, amt);
      ids.add(inv.invoice_id);
      alloc[inv.invoice_id] = take;
      amt -= take;
    }
    this.selectedInvoiceIds.set(ids);
    this.allocAmounts.set(alloc);
    this.saveError.set('');
    if (amt > 0.005) this.saveMsg.set(`${this.fmt(amt)} left unallocated after auto-allocating.`);
  }

  addMode(defKey: string): void {
    const remain = Math.max(0, this.referenceTotal() - this.modeTotal());
    this.modeRows.update(rows => [...rows, { modeKey: defKey, amount: remain, refJson: {} }]);
  }
  removeMode(idx: number): void { this.modeRows.update(rows => rows.filter((_, i) => i !== idx)); }
  setModeAmount(idx: number, value: string): void {
    const v = this.parseAmt(value);
    this.modeRows.update(rows => rows.map((r, i) => i === idx ? { ...r, amount: v } : r));
  }
  setModeType(idx: number, key: string): void {
    this.modeRows.update(rows => rows.map((r, i) => i === idx ? { ...r, modeKey: key, refJson: {} } : r));
  }
  setModeRef(idx: number, fieldKey: string, value: string): void {
    this.modeRows.update(rows => rows.map((r, i) => i === idx ? { ...r, refJson: { ...r.refJson, [fieldKey]: value } } : r));
  }
  modeDef(key: string): ModeDef { return this.modeDefs.find(m => m.key === key) ?? this.modeDefs[0]; }

  openDrawer(inv: OutstandingInvoice): void {
    this.drawerInvoice.set(inv);
    const history: { voucherNumber: string; date?: string; amount: number }[] = [];
    for (const v of this.vouchers()) {
      if (v.status !== 'posted') continue;
      for (const a of v.allocations) {
        if (a.invoice_id === inv.invoice_id) history.push({ voucherNumber: v.voucher_number, date: v.voucher_date, amount: a.allocated_amount });
      }
    }
    this.drawerHistory.set(history);
  }
  closeDrawer(): void { this.drawerInvoice.set(null); }

  save(): void {
    const party = this.selectedParty();
    if (!party) { this.saveError.set('Select a ' + this.partyLabel().toLowerCase() + ' first.'); return; }
    const allocations = this.outstandingInvoices()
      .filter(inv => this.isSelected(inv) && this.allocFor(inv) > 0)
      .map(inv => ({
        invoiceType: this.invoiceTypeKey(),
        invoiceId: inv.invoice_id,
        invoiceNumber: inv.invoice_number,
        allocatedAmount: this.allocFor(inv)
      }));
    const noteAllocations = this.availableNotes()
      .filter(n => this.isNoteSelected(n) && this.noteApplyFor(n) > 0)
      .map(n => ({
        invoiceType: n.note_type,
        invoiceId: n.note_id,
        invoiceNumber: n.note_number,
        allocatedAmount: this.noteApplyFor(n)
      }));
    const modes = this.modeRows().filter(r => r.amount > 0).map(r => ({ modeKey: r.modeKey, amount: r.amount, refJson: r.refJson }));

    if (allocations.length === 0 && noteAllocations.length === 0 && modes.length === 0) { this.saveError.set('Nothing to save — allocate an amount.'); return; }
    if (modes.length === 0 && this.referenceTotal() > 0.005) { this.saveError.set('Add at least one ' + (this.mode() === 'pay' ? 'payment' : 'receipt') + ' mode.'); return; }
    if (this.mode() === 'pay' && this.tdsApplicable() && this.tdsAmount() > 0 && !this.tdsSection()) {
      this.saveError.set('Select a TDS section.');
      return;
    }

    this.isSaving.set(true);
    this.saveMsg.set('');
    this.saveError.set('');
    this.paymentsService.savePaymentVoucher({
      voucherType: this.mode() === 'pay' ? 'payment' : 'receipt',
      voucherDate: this.voucherDate(),
      partyType: this.partyType(),
      partyId: party.id,
      partyName: this.partyName(party),
      partyGstin: (party as VendorItem).gstin,
      narration: this.narration(),
      tdsAmount: this.mode() === 'pay' ? this.tdsAmount() : 0,
      tdsSection: this.mode() === 'pay' ? this.tdsSection() : undefined,
      allocations: [...allocations, ...noteAllocations],
      modes
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.isSaving.set(false);
        if (res.success) {
          const voucherNo = res.data?.voucher_number || 'Voucher';
          this.saveMsg.set(`${voucherNo} posted successfully.`);
          this.messageService.add({
            severity: 'success',
            summary: 'Posted',
            detail: `${voucherNo} for ${this.fmt(this.netAmount())} posted successfully against ${this.partyName(party)}.`,
            life: 4500
          });
          this.clearAllocations();
          this.narration.set('');
          this.loadVouchers();
          if (this.selectedPartyId()) this.onPartyChange(this.selectedPartyId());
        } else {
          const msg = res.message || 'Save failed.';
          this.saveError.set(msg);
          this.messageService.add({ severity: 'error', summary: 'Save failed', detail: msg, life: 5000 });
        }
      },
      error: err => {
        this.isSaving.set(false);
        const msg = err?.error?.message || 'Server error. Check connection and try again.';
        this.saveError.set(msg);
        this.messageService.add({ severity: 'error', summary: 'Save failed', detail: msg, life: 5000 });
      }
    });
  }
}
