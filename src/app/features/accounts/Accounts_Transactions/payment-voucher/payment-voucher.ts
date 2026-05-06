import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';

// ── Inline Types ────────────────────────────────────────────────────────────
// NOTE: Interface renamed to VoucherRow to avoid conflict with class PaymentVoucher
type PaymentModeCode = 'C' | 'B';
type PaymentTypeCode = 'B' | 'O' | 'CC' | 'CH';
type PaymentMode     = 'CASH' | 'BANK' | 'ONLINE' | 'CREDIT CARD' | 'CHEQUE' | '--';

// PrimeNG p-tag severity: 'success'|'info'|'warn'|'danger'|'secondary'|'contrast'
type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

interface VoucherRow {
  paymentId: string;
  paymentDate: string;
  modeOfPayment: PaymentModeCode;
  typeOfPayment?: PaymentTypeCode;
  bankName?: string;
  totalPaidAmount: number;
  [key: string]: unknown;
}

// Inline page state — no external PageCriteria class needed
interface PageState {
  pageSize: number;
  totalrows: number;
  TotalPages: number;
  currentPageRows: number;
}

@Component({
  selector: 'app-payment-voucher',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    TagModule,
    SkeletonModule,
  ],
  providers: [CurrencyPipe, DatePipe],
  templateUrl: './payment-voucher.html',
})
export class PaymentVoucher implements OnInit {

  // ── DI via inject() ─────────────────────────────────────────────────────
  private readonly commonService      = inject(CommonService);
  private readonly transactionService = inject(AccountsTransactions);
  private readonly router             = inject(Router);
  private readonly currencyPipe       = inject(CurrencyPipe);
  private readonly destroyRef         = inject(DestroyRef);

  // ── Signals ─────────────────────────────────────────────────────────────
  readonly allData    = signal<VoucherRow[]>([]);
  readonly gridData   = signal<VoucherRow[]>([]);
  readonly isLoading  = signal<boolean>(false);
  readonly searchTerm = signal<string>('');

  // ── Computed ────────────────────────────────────────────────────────────
  readonly totalRecords = computed(() => this.gridData().length);

  // ── Page state (inline — no external class) ─────────────────────────────
  pageCriteria: PageState = {
    pageSize: 10,
    totalrows: 0,
    TotalPages: 0,
    currentPageRows: 0,
  };

  readonly rowsPerPageOptions = [5, 10, 20, 50];

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadData();
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  loadData(): void {
    this.isLoading.set(true);

    this.transactionService
      .GetPaymentVoucherExistingData(
        this.commonService.getschemaname(),
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: VoucherRow[]) => {
          const formatted = (data ?? []).map((row) => ({
            ...row,
            paymentDate: this.commonService.getFormatDateGlobal(row.paymentDate),
          }));
          this.allData.set(formatted);
          this.gridData.set(formatted);
          this.updatePageCriteria(formatted.length);
          this.isLoading.set(false);
        },
        error: (err: unknown) => {                // explicit unknown → no implicit any
          this.commonService.showErrorMessage(err);
          this.isLoading.set(false);
        },
      });
  }

  // ── Search ────────────────────────────────────────────────────────────────
  onSearch(term: string): void {
    this.searchTerm.set(term);
    const lower = term.trim().toLowerCase();

    const filtered = !lower
      ? this.allData()
      : this.allData().filter((item) =>
          Object.values(item).some(
            (val) => val != null && String(val).toLowerCase().includes(lower)
          )
        );

    this.gridData.set(filtered);
    this.updatePageCriteria(filtered.length);
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  openVoucherReport(row: VoucherRow): void {
     ;
    if (!row?.paymentId) return;
    const receipt = btoa(`${row.paymentId},Payment Voucher`);
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/payment-voucher', receipt])
    );
    window.open(url, '_blank');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getPaymentMode(row: VoucherRow): PaymentMode {
    if (row.modeOfPayment === 'C') return 'CASH';
    if (row.modeOfPayment === 'B') {
      const map: Record<string, PaymentMode> = {
        B: 'BANK', O: 'ONLINE', CC: 'CREDIT CARD', CH: 'CHEQUE',
      };
      return map[row.typeOfPayment ?? ''] ?? 'BANK';
    }
    return '--';
  }

  // PrimeNG uses 'warn' not 'warning'
  getPaymentModeSeverity(row: VoucherRow): TagSeverity {
    const map: Record<string, TagSeverity> = {
      CASH:          'success',
      BANK:          'info',
      ONLINE:        'warn',       // ← 'warn' not 'warning'
      'CREDIT CARD': 'danger',
      CHEQUE:        'secondary',
    };
    return map[this.getPaymentMode(row)] ?? 'info';
  }

  formatCurrency(amount: number): string {
    return this.currencyPipe.transform(amount, 'INR', 'symbol', '1.2-2') ?? '₹0.00';
  }

  private updatePageCriteria(total: number): void {
    this.pageCriteria.totalrows       = total;
    this.pageCriteria.TotalPages      = Math.ceil(total / this.pageCriteria.pageSize) || 1;
    this.pageCriteria.currentPageRows = Math.min(total, this.pageCriteria.pageSize);
  }
}