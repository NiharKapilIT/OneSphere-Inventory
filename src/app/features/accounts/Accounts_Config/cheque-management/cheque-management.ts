import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { NgSelectModule } from '@ng-select/ng-select';
import { TableLazyLoadEvent } from 'primeng/table';

import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { AccountsConfig } from '../../../../core/services/accounts/accounts-config';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';

export interface StatusOption {
  label: string;
  value: string;
}

export interface ChequeRow {
  pchequebookid: string | number;
  pnoofcheques: number;
  pchequefromnumber: string;
  pchequetonumber: string;
  pchequegeneratestatus: boolean;
  pbankname: string;
  paccountnumber: string;
  pchequestatus: string;
  pbankconfigurationid: number;
  ptotalrecords?: number;
}

@Component({
  selector: 'app-cheque-management',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TableModule,
    ButtonModule,
    NgSelectModule,
  ],
  templateUrl: './cheque-management.html',
})
export class ChequeManagement implements OnInit, OnDestroy {
  // ── Services ──────────────────────────────────────────────────────────────
  private readonly accountingService = inject(AccountsConfig);
  private readonly commonService = inject(CommonService);
  private readonly accReportService = inject(AccountsReports);
  private readonly destroyRef = inject(DestroyRef);

  // ── Signals ───────────────────────────────────────────────────────────────
  readonly gridData = signal<ChequeRow[]>([]);
  readonly loading = signal<boolean>(false);
  readonly totalRecords = signal<number>(0);
  readonly bankDetails = signal<any[]>([]);

  readonly hasPrintableData = computed(() => this.gridData().length > 0);

  // ── State ─────────────────────────────────────────────────────────────────
  private allRows: ChequeRow[] = [];
  selectedStatus = '';
  selectedBankId: number | null = null;
  pageSize = 10;
  currentPage = 0;
  pageCriteria: PageCriteria = new PageCriteria();

  private readonly searchSubject = new Subject<string>();

  readonly statusList: StatusOption[] = [
    { label: 'All', value: 'All' },
    { label: 'Used', value: 'Used' },
    { label: 'Un Used', value: 'Un Used' },
  ];

  readonly tableColumns = [
    { field: 'pchequebookid', header: 'Book ID', align: 'center' },
    { field: 'pnoofcheques', header: 'No. of Cheques', align: 'center' },
    { field: 'pchequefromnumber', header: 'From', align: 'center' },
    { field: 'pchequetonumber', header: 'To', align: 'center' },
    { field: 'pchequegeneratestatus', header: 'Cheque Status', align: 'center' },
    { field: 'pbankname', header: 'Bank Name', align: 'left' },
    { field: 'paccountnumber', header: 'Account No.', align: 'left' },
    { field: 'pchequestatus', header: 'Book Status', align: 'left' },
  ];

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initPageCriteria();
    this.loadBankNames();
    this.loadGridData();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  // ── Init Helpers ──────────────────────────────────────────────────────────
  private initPageCriteria(): void {
    this.pageCriteria.pageSize = this.commonService.pageSize;
    this.pageCriteria.offset = 0;
    this.pageCriteria.pageNumber = 1;
    this.pageCriteria.footerPageHeight = 50;
  }

  private setupSearch(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => this.applySearchFilter(term));
  }

  // ── Data Loading ──────────────────────────────────────────────────────────
  private loadBankNames(): void {
    this.accountingService
      .GetBankNames(
        this.commonService.getschemaname(),
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: any[]) => this.bankDetails.set(data),
        error: (err: any) => this.commonService.showErrorMessage(err),
      });
  }

  loadGridData(): void {
    this.loading.set(true);
    this.accountingService
      .ViewChequeManagementDetails(
        this.commonService.getbranchname(),
        this.commonService.getschemaname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode(),
        this.pageSize,
        this.currentPage
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: ChequeRow[]) => {
          this.loading.set(false);
          const rows = data ?? [];
          this.allRows = [...rows];
          this.gridData.set(rows);
          this.totalRecords.set(data?.[0]?.ptotalrecords ?? 0);
          this.syncPagination();
        },
        error: (err: any) => {
          this.loading.set(false);
          this.commonService.showErrorMessage(err);
        },
      });
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  onPageChange(event: TableLazyLoadEvent): void {
    this.pageSize = event.rows ?? 10;
    this.currentPage = Math.floor((event.first ?? 0) / this.pageSize);
    this.loadGridData();
  }

  private syncPagination(): void {
    const total = this.totalRecords();
    this.pageCriteria.totalrows = total;
    this.pageCriteria.TotalPages = total > this.pageSize ? Math.ceil(total / this.pageSize) : 1;
    this.pageCriteria.currentPageRows = this.gridData().length;
  }

  // ── Filtering ─────────────────────────────────────────────────────────────
  onBankChange(event: any): void {
    this.selectedBankId = event?.bankAccountId ?? null;
  }

  onShowClick(): void {
    this.applyBankAndStatusFilter(this.selectedBankId, this.selectedStatus);
  }

  onSearchInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchSubject.next(term);
  }

  private applySearchFilter(term: string): void {
    if (!term.trim()) {
      this.gridData.set([...this.allRows]);
      return;
    }
    const lower = term.toLowerCase();
    this.gridData.set(
      this.allRows.filter((row) =>
        Object.values(row).some((val) => val?.toString().toLowerCase().includes(lower))
      )
    );
  }

  private applyBankAndStatusFilter(bankId: number | null, status: string): void {
    const filtered = this.allRows.filter((item) => {
      const matchesBank = bankId ? item.pbankconfigurationid === bankId : true;
      const matchesStatus =
        !status || status === 'All'
          ? true
          : (item.pchequestatus ?? '').trim().toLowerCase() === status.trim().toLowerCase();
      return matchesBank && matchesStatus;
    });
    this.gridData.set(filtered);
    this.pageCriteria.totalrows = filtered.length;
    this.pageCriteria.TotalPages = Math.ceil(filtered.length / this.pageSize) || 1;
    this.pageCriteria.currentPageRows = filtered.length;
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  onGenerateCheques(row: ChequeRow): void {
    if (row.pchequegeneratestatus) return;

    const payload = {
      globalSchema: this.commonService.getschemaname(),
      branchSchema: this.commonService.getbranchname(),
      company_code: this.commonService.getCompanyCode(),
      branch_code: this.commonService.getBranchCode(),
      branch_id: 1,
      pBankId: row.pbankconfigurationid,
      pNoofcheques: row.pnoofcheques,
      pChequefrom: row.pchequefromnumber,
      pChequeto: row.pchequetonumber,
      pChqbookid: row.pchequebookid,
      pChqegeneratestatus: true,
      pChequeGenerateDate: new Date().toISOString(),
      pCreatedby: this.commonService.getCreatedBy(),
      pipaddress: this.commonService.getIpAddress(),
    };

    this.accountingService.updateChequeManagement(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          if (res) {
            this.commonService.showInfoMessage('Updated Successfully');
            this.loadGridData();
          }
        },
        error: (err: any) => this.commonService.showErrorMessage(err),
      });
  }

  // // ── Export ────────────────────────────────────────────────────────────────
  // exportToPdf(type: 'Pdf' | 'Print'): void {
  //   const headers = [
  //     'Book ID', 'No. of Cheques', 'From', 'To',
  //     'Cheque Status', 'Bank Name', 'Account No.', 'Book Status',
  //   ];
  //   const styles = Object.fromEntries(
  //     Array.from({ length: 8 }, (_, i) => [i, { cellWidth: 'auto', halign: i < 5 ? 'center' : 'left' }])
  //   );
  //   const rows = this.gridData().map((e) => [
  //     e.pchequebookid,
  //     e.pnoofcheques,
  //     e.pchequefromnumber,
  //     e.pchequetonumber,
  //     e.pchequegeneratestatus ? 'Active' : 'Generate Cheques',
  //     e.pbankname,
  //     e.paccountnumber,
  //     e.pchequestatus,
  //   ]);
  //   this.accReportService._ChequeManagementPdf('Cheque Management', rows, headers, styles, 'landscape', type);
  // }

  // exportToExcel(): void {
  //   const rows = this.gridData().map((e) => ({
  //     'Book ID': e.pchequebookid,
  //     'No. of Cheques': e.pnoofcheques,
  //     From: e.pchequefromnumber,
  //     To: e.pchequetonumber,
  //     'Cheque Status': e.pchequegeneratestatus ? 'Active' : 'Generate Cheques',
  //     'Bank Name': e.pbankname,
  //     'Account No.': e.paccountnumber,
  //     'Book Status': e.pchequestatus,
  //   }));
  //   this.commonService.exportAsExcelFile(rows, 'Cheque Management');
  // }

  // ── Track By ──────────────────────────────────────────────────────────────
  trackByBookId(_: number, row: ChequeRow): string | number {
    return row.pchequebookid;
  }
}