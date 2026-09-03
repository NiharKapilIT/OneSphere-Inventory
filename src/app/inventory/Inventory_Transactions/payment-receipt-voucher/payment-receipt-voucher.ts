import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, ViewChildren, QueryList } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { InventoryConfigService, VendorItem, CustomerItem } from '../../Inventory_Shared/inventory-config.service';
import { AvailableNote, OutstandingInvoice, PaymentVoucher, PaymentsService, TdsCode, VendorFyPurchaseSummary } from '../../Inventory_Shared/payments.service';
import { StickyFooterOffsetService } from '../../../core/services/Common/sticky-footer-offset.service';
import { customerReceiptConfig, vendorPaymentConfig } from '../../Inventory_Shared/inventory-screen.model';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import { PaymentModeOption, PaymentModeSelectorComponent, PaymentModeSelectorValue, defaultPaymentModeValue } from '../../../shared/payment-mode-selector/payment-mode-selector.component';

type VoucherMode = 'pay' | 'receipt';
// Item 19: mode-of-payment capture now lives in the shared
// <app-payment-mode-selector> (same Cash/Bank -> Cheque/Online/Debit
// Card/Credit Card UX as Accounts' General Receipt) -- this row just pairs
// its output with the amount split across this mode, same as before.
type ModeRow = { details: PaymentModeSelectorValue; amount: number };

// Item 21: fallback only, used if the live taxation.tds_codes fetch (see
// tdsCodes signal) comes back empty — mirrors migration 149's seed values
// exactly so the fallback path still computes a correct amount, not just a
// section label. The real rates should always come from the server; this
// only covers the gap before that seed has ever run.
const TDS_SECTIONS_FALLBACK: { value: string; label: string; rate: number }[] = [
  { value: '194C',  label: '194C — Contractors/Sub-contractors (Individual/HUF)', rate: 1 },
  { value: '194H',  label: '194H — Commission/Brokerage', rate: 2 },
  { value: '194I',  label: '194I — Rent (Land/Building/Furniture)', rate: 10 },
  { value: '194J',  label: '194J — Professional/Technical Fees', rate: 10 },
  { value: '194JA', label: '194JA — Professional Fees (Individual/HUF)', rate: 2 },
  { value: '194R',  label: '194R — Benefits/Perquisites', rate: 10 },
];

const CASH_PAYMENT_LIMIT = 9999;
const CASH_RECEIPT_LIMIT = 199000;

@Component({
  selector: 'app-payment-receipt-voucher',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, ToastModule, InventoryScreenShell, PaymentModeSelectorComponent],
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

  @ViewChildren(PaymentModeSelectorComponent) modeSelectors!: QueryList<PaymentModeSelectorComponent>;

  readonly Math = Math;

  // Item 21: live section/rate master, fetched once (mode-independent — TDS
  // codes aren't per-vendor/customer). Falls back to the hardcoded list only
  // if the server ever returns nothing (e.g. before 149's seed has run).
  //
  // Option `value` is a composite "sectionCode|deducteeType" key, not just
  // the section code — 194C alone has two different live rates (1% for
  // Individual/HUF, 2% for Company/Firm/Others), so section code alone
  // can't uniquely resolve a rate. `tdsSectionCode()` below strips the
  // composite back down to the plain code for the save payload/backend,
  // which only ever stored a bare section string.
  readonly tdsCodes = signal<TdsCode[]>([]);
  readonly tdsSectionOptions = computed(() => {
    const live = this.tdsCodes();
    if (live.length) {
      return live.map(c => ({
        value: `${c.section_code}|${c.deductee_type || ''}`,
        label: `${c.section_code} — ${c.description || ''}${c.deductee_type ? ` (${c.deductee_type})` : ''}`.trim()
      }));
    }
    return TDS_SECTIONS_FALLBACK.map(s => ({ value: s.value, label: s.label }));
  });

  readonly mode = signal<VoucherMode>('pay');
  readonly parties = signal<(VendorItem | CustomerItem)[]>([]);
  readonly loadingParties = signal(false);
  readonly selectedPartyId = signal<number | null>(null);

  // Item 22: TCS — vendor-level FY-cumulative-purchases threshold, Vendor
  // Payment only. Unlike TDS's per-invoice Service gate, this is fetched
  // once per selected vendor (not per invoice) since it depends on the
  // vendor's whole-year purchase history, not what's on this voucher.
  readonly vendorFySummary = signal<VendorFyPurchaseSummary | null>(null);
  readonly tcsPercentageInput = signal<string>('');

  readonly outstandingInvoices = signal<OutstandingInvoice[]>([]);
  readonly loadingInvoices = signal(false);
  readonly selectedInvoiceIds = signal<Set<number>>(new Set());
  readonly allocAmounts = signal<Record<number, number>>({});
  readonly quickAmount = signal<number>(0);

  readonly availableNotes = signal<AvailableNote[]>([]);
  readonly selectedNoteIds = signal<Set<number>>(new Set());
  readonly noteApplyAmounts = signal<Record<number, number>>({});

  readonly modeRows = signal<ModeRow[]>([]);
  readonly accountBankOptions = signal<PaymentModeOption[]>([]);
  readonly accountDepositBankOptions = signal<PaymentModeOption[]>([]);
  readonly accountOnlinePaymentTypes = signal<PaymentModeOption[]>([]);
  readonly narration = signal('');
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
  readonly guideConfig = computed(() => this.mode() === 'pay' ? vendorPaymentConfig : customerReceiptConfig);
  readonly cashLimit = computed(() => this.mode() === 'pay' ? CASH_PAYMENT_LIMIT : CASH_RECEIPT_LIMIT);

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

  // Item 21: TDS only applies to a Vendor Payment (mode 'pay'), and only
  // when at least one selected invoice carries a Service line item —
  // sp_get_outstanding_invoices now returns has_service_item per invoice
  // for exactly this gate.
  readonly hasServiceAllocation = computed(() => {
    if (this.mode() !== 'pay') return false;
    const ids = this.selectedInvoiceIds();
    return this.outstandingInvoices().some(inv => ids.has(inv.invoice_id) && inv.has_service_item);
  });

  // Kept as its own name (rather than inlining hasServiceAllocation()
  // everywhere) since the template and save() already read it as
  // "is TDS applicable" — it's just no longer independently settable.
  readonly tdsApplicable = computed(() => this.hasServiceAllocation());

  // Real TDS base excludes GST (CBDT circular) — taxableInAllocated() is
  // exactly that once invoices are selected; before any invoice is picked
  // there's no GST split available yet, so quickAmount() is used as-is.
  readonly tdsBaseAmount = computed(() =>
    this.selectedInvoiceIds().size > 0 ? this.taxableInAllocated() : this.quickAmount()
  );

  readonly tdsSectionCode = computed(() => this.tdsSection().split('|')[0] || '');
  readonly tdsDeducteeType = computed(() => this.tdsSection().split('|')[1] || '');

  readonly tdsRate = computed(() => {
    const [code, deductee] = this.tdsSection().split('|');
    if (!code) return 0;
    const live = this.tdsCodes();
    if (live.length) {
      const match = live.find(c => c.section_code === code && (c.deductee_type || '') === (deductee || ''));
      return match?.rate ?? 0;
    }
    return TDS_SECTIONS_FALLBACK.find(s => s.value === code)?.rate ?? 0;
  });

  // Auto-computed, not manually typed — item 21's "shown automatically with
  // the percentage and amount" requirement. Zero unless TDS is applicable
  // AND a section has actually been picked (rate otherwise unknown).
  readonly tdsAmount = computed(() =>
    this.tdsApplicable() && this.tdsSection() && this.tdsRate() > 0
      ? Math.round(this.tdsBaseAmount() * this.tdsRate() / 100 * 100) / 100
      : 0
  );

  // Item 22: TCS applicability is a Vendor Payment / Purchase-only, vendor-
  // level gate — "enabled" once this vendor's FY-cumulative posted Purchase
  // Invoice total has crossed ₹50L, independent of what's on THIS voucher
  // (unlike TDS's per-invoice Service check).
  readonly tcsThresholdCrossed = computed(() =>
    this.mode() === 'pay' && !!this.vendorFySummary()?.threshold_crossed
  );

  readonly tcsPercentage = computed(() => this.parseAmt(this.tcsPercentageInput()));

  // No rate master for TCS (per the user's own spec: "provide a small text
  // box to enter the percentage") — a manually-typed rate applied to the
  // same "amount of this payment" base referenceTotal() already represents
  // (GST-inclusive, unlike TDS's taxableInAllocated() base — no CBDT
  // GST-exclusion circular applies to TCS the way it does to TDS).
  readonly tcsAmount = computed(() =>
    this.tcsThresholdCrossed() && this.tcsPercentage() > 0
      ? Math.round(this.referenceTotal() * this.tcsPercentage() / 100 * 100) / 100
      : 0
  );

  // Debit/Credit Note value applied against this voucher — nets off the
  // invoice total, so cash/bank modes only need to cover what's left.
  readonly totalNotesApplied = computed(() => {
    const amounts = this.noteApplyAmounts();
    let sum = 0;
    for (const id of this.selectedNoteIds()) sum += amounts[id] || 0;
    return sum;
  });

  readonly modeTotal = computed(() => this.modeRows().reduce((s, r) => s + (r.amount || 0), 0));
  readonly cashModeTotal = computed(() => this.modeRows()
    .filter(r => r.details.modeKey === 'cash')
    .reduce((s, r) => s + (r.amount || 0), 0));
  readonly cashLimitExceeded = computed(() => this.cashModeTotal() > this.cashLimit() + 0.005);
  readonly cashLimitMessage = computed(() =>
    `Total cash ${this.mode() === 'pay' ? 'payment against Purchase Invoice' : 'receipt against Sales Invoice'} cannot exceed ${this.fmt(this.cashLimit())}.`
  );

  readonly onAccountAmount = computed(() => Math.max(0, this.modeTotal() + this.totalNotesApplied() + this.tdsAmount() + this.tcsAmount() - this.totalAllocated()));
  readonly netAmount = computed(() => Math.max(0, this.modeTotal()));

  // What the mode-total should match: the selected invoices' allocated total
  // once any are ticked, otherwise the quick "amount to pay/receive" figure
  // typed at the top before any invoice is picked — minus whatever's been
  // netted off via an applied Debit/Credit Note.
  readonly referenceTotal = computed(() => Math.max(0,
    (this.selectedInvoiceIds().size > 0 ? this.totalAllocated() : this.quickAmount()) - this.totalNotesApplied()
  ));
  readonly modeDiff = computed(() => this.modeTotal() - (this.referenceTotal() - this.tdsAmount() - this.tcsAmount()));
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

    // Item 21: clear a stale section pick the moment the Service condition
    // that justified it stops holding (e.g. the user un-ticks the one
    // Service invoice) — tdsApplicable itself is now just an alias for
    // hasServiceAllocation() (see its getter below), no separate manual
    // toggle to keep in sync.
    effect(() => { if (!this.hasServiceAllocation()) this.tdsSection.set(''); });

    this.paymentsService.getTdsCodes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => this.tdsCodes.set(res.data ?? []),
      error: () => this.tdsCodes.set([])
    });

    this.loadPaymentAccountSetup();
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
    this.tdsSection.set('');
    this.vendorFySummary.set(null);
    this.tcsPercentageInput.set('');
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

  private loadPaymentAccountSetup(): void {
    this.paymentsService.getPaymentVoucherAccountSetup()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: setup => {
          this.accountBankOptions.set(setup.banks ?? []);
          this.accountDepositBankOptions.set(setup.depositBanks ?? []);
          this.accountOnlinePaymentTypes.set(setup.onlinePaymentTypes ?? []);
        },
        error: () => {
          this.accountBankOptions.set([]);
          this.accountDepositBankOptions.set([]);
          this.accountOnlinePaymentTypes.set([]);
        }
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
    this.vendorFySummary.set(null);
    this.tcsPercentageInput.set('');
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
    // Item 22: vendor-level FY threshold check, Vendor Payment only.
    if (this.mode() === 'pay') {
      this.paymentsService.getVendorFyPurchaseSummary(partyId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: res => this.vendorFySummary.set(res.data ?? null),
          error: () => this.vendorFySummary.set(null)
        });
    }
  }

  setTcsPercentage(value: string): void { this.tcsPercentageInput.set(value); }

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
    this.tdsSection.set('');
  }

  setTdsSection(value: string): void { this.tdsSection.set(value); }

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

  addMode(): void {
    const remain = Math.max(0, this.referenceTotal() - this.modeTotal());
    this.modeRows.update(rows => [...rows, { details: defaultPaymentModeValue(), amount: remain }]);
  }
  removeMode(idx: number): void { this.modeRows.update(rows => rows.filter((_, i) => i !== idx)); }
  setModeAmount(idx: number, value: string): void {
    const v = this.parseAmt(value);
    this.modeRows.update(rows => rows.map((r, i) => i === idx ? { ...r, amount: v } : r));
  }
  setModeDetails(idx: number, details: PaymentModeSelectorValue): void {
    this.modeRows.update(rows => rows.map((r, i) => i === idx ? { ...r, details } : r));
  }

  // Flattens the shared component's rich output into the flat string map
  // `inv_payment_voucher_modes.ref_json` (JSONB) already expects -- no
  // backend/schema changes needed, this just slots the same shape in.
  private buildRefJson(d: PaymentModeSelectorValue): Record<string, string> {
    const json: Record<string, string> = {};
    const put = (k: string, v: string | number | null | undefined) => { if (v !== null && v !== undefined && v !== '') json[k] = String(v); };
    if (d.mode === 'BANK') {
      put('bankSubType', d.bankSubType);
      put('bankId', d.bankId);
      put('bankName', d.bankName);
      put('branchName', d.branchName);
      put('accountNumber', d.accountNumber);
      put(d.bankSubType === 'CHEQUE' ? 'chequeNumber' : 'referenceNumber', d.refNumber);
      put(d.bankSubType === 'CHEQUE' ? 'chequeDate' : 'transactionDate', d.refDate);
      put('cardNumber', d.cardNumber);
      put('bankFinancialServices', d.bankFinancialServices);
      put('typeOfPayment', d.typeOfPayment);
      put('upiId', d.upiId);
      put('depositBankId', d.depositBankId);
      put('depositBankName', d.depositBankName);
    }
    put('summary', d.summary);
    return json;
  }

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
    const activeModeRows = this.modeRows().filter(r => r.amount > 0);
    if (this.cashLimitExceeded()) {
      this.saveError.set(this.cashLimitMessage());
      return;
    }
    const invalidRow = activeModeRows.find(r => !r.details.isValid);
    if (invalidRow) {
      this.saveError.set('Complete the required fields for each ' + (this.mode() === 'pay' ? 'payment' : 'receipt') + ' mode before saving.');
      this.modeSelectors?.forEach(c => c.markAllTouched());
      return;
    }
    const modes = activeModeRows.map(r => ({ modeKey: r.details.modeKey, amount: r.amount, refJson: this.buildRefJson(r.details) }));

    if (allocations.length === 0 && noteAllocations.length === 0 && modes.length === 0) { this.saveError.set('Nothing to save — allocate an amount.'); return; }
    if (modes.length === 0 && this.referenceTotal() > 0.005) { this.saveError.set('Add at least one ' + (this.mode() === 'pay' ? 'payment' : 'receipt') + ' mode.'); return; }
    if (this.mode() === 'pay' && this.tdsApplicable() && !this.tdsSection()) {
      this.saveError.set('This payment includes a Service invoice — select the applicable TDS section.');
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
      tdsSection: this.mode() === 'pay' ? this.tdsSectionCode() : undefined,
      tcsAmount: this.mode() === 'pay' ? this.tcsAmount() : 0,
      tcsPercentage: this.mode() === 'pay' && this.tcsPercentage() > 0 ? this.tcsPercentage() : null,
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
