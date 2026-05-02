import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { PageCriteria } from '../../../../core/models/pagecriteria';



@Component({
  selector: 'app-petty-cash-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    TableModule,
    PaginatorModule,
    DecimalPipe,
  ],
  templateUrl: './petty-cash-view.html',
})
export class PettyCashView implements OnInit, OnDestroy {

  // ── DI via inject() ────────────────────────────────────────────────────────
  private readonly router             = inject(Router);
  private readonly commonService      = inject(CommonService);
  private readonly accountingService  = inject(AccountsTransactions);
  private readonly cdr                = inject(ChangeDetectorRef);

  // ── Signals ────────────────────────────────────────────────────────────────
  readonly gridView    = signal<any[]>([]);
  readonly loading     = signal<boolean>(false);
  readonly totalRows   = signal<number>(0);

  readonly hasData = computed(() => this.gridView().length > 0);

  // ── State ──────────────────────────────────────────────────────────────────
  currencySymbol  = '₹';
  first           = 0;
  pageSize        = 10;

  pageCriteria    = new PageCriteria();

  // ── Private ────────────────────────────────────────────────────────────────
  private filteredData:      any[]     = [];
  private columnsWithSearch: string[]  = [];
  private readonly destroy$ = new Subject<void>();

  // ══════════════════════════════════════════════════════════════════════════
  ngOnInit(): void {
    this.currencySymbol = this.commonService.currencysymbol || '₹';
    this.setPageModel();
    this.getLoadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Page model ─────────────────────────────────────────────────────────────
  private setPageModel(): void {
    this.pageCriteria.pageSize         = 10;
    this.pageCriteria.offset           = 0;
    this.pageCriteria.pageNumber       = 1;
    this.pageCriteria.footerPageHeight = 50;
  }

  // ── Data fetch ─────────────────────────────────────────────────────────────
  getLoadData(): void {
    this.loading.set(true);

    this.accountingService
      .GetPettyCashExistingData(
        this.commonService.getschemaname(),
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode(),
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (json: any[]) => {
          this.loading.set(false);

          if (!json?.length) {
            this.gridView.set([]);
            this.filteredData = [];
            this.totalRows.set(0);
            this.cdr.markForCheck();
            return;
          }

          // Process — format dates without mutating originals
          const processed = json.map(item => ({
            ...item,
            paymentDate: this.commonService.getFormatDateGlobal(
              item.paymentDate ?? item.preceiptdate,
            ),
          }));

          this.filteredData      = processed;
          this.columnsWithSearch = Object.keys(processed[0]);

          this.gridView.set([...processed]);
          this.totalRows.set(processed.length);

          this.pageCriteria.totalrows  = processed.length;
          this.pageCriteria.TotalPages = Math.ceil(processed.length / this.pageCriteria.pageSize);

          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.loading.set(false);
          this.gridView.set([]);
          this.commonService.showErrorMessage(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ── Search / Filter ────────────────────────────────────────────────────────
  filterDatatable(event: Event): void {
    const term = (event.target as HTMLInputElement).value.toLowerCase().trim();

    const result = !term
      ? [...this.filteredData]
      : this.filteredData.filter(item =>
          this.columnsWithSearch.some(col => {
            const val = item[col];
            return val && val.toString().toLowerCase().includes(term);
          }),
        );

    this.gridView.set(result);
    this.totalRows.set(result.length);
    this.first = 0;
    this.pageCriteria.totalrows = result.length;
    this.cdr.markForCheck();
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  onPageChange(event: any): void {
    this.first    = event.first;
    this.pageSize = event.rows;
    this.pageCriteria.pageSize = event.rows;
  }

  // ── View row ───────────────────────────────────────────────────────────────
  viewRow(row: any): void {
    if (!row?.paymentId) return;
    const receipt = btoa(`${row.paymentId},Petty Cash`);
    const url     = this.router.serializeUrl(
      this.router.createUrlTree(['/payment-voucher', receipt]),
    );
    window.open(url, '_blank');
  }

  // ── Template helper ────────────────────────────────────────────────────────
  isCash(modeOfPayment: string): boolean {
    return modeOfPayment === 'CASH' || modeOfPayment === 'C';
  }
}