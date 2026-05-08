
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CommonService } from '../../../../core/services/Common/common.service';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { AccountsConfig } from '../../../../core/services/accounts/accounts-config';


@Component({
  selector: "app-bank-config-view",
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterModule, TableModule, ButtonModule],
  templateUrl: "./bank-config-view.html",

})

export class BankConfigView implements OnInit {

  private readonly router = inject(Router);
  private readonly accountingMasterService = inject(AccountsConfig);
  private readonly commonService = inject(CommonService);

  // ── Signals ──────────────────────────────────────────────────────────
  readonly loading = signal<boolean>(false);
  readonly gridData = signal<any[]>([]);

  // Computed: total rows for paginator
  readonly totalRows = computed(() => this.gridData().length);

  // ── Non-reactive state ────────────────────────────────────────────────
  pageCriteria: PageCriteria = new PageCriteria();

  private filteredData: any[] = [];
  private columnsWithSearch: string[] = [];

  // ── Lifecycle ─────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.setPageModel();
    this.loadBankData();
  }

  // ── Data Load ─────────────────────────────────────────────────────────
  private loadBankData(): void {
    this.loading.set(true);

    this.accountingMasterService.viewbankinformation(
      this.commonService.getschemaname(),
      this.commonService.getbranchname(),
      this.commonService.getBranchCode(),
      this.commonService.getCompanyCode()
    ).subscribe({
      next: (data: any[]) => {
        this.filteredData = (data ?? []).map(row => ({
          ...row,
          // account_type: this.getAccountType(row)
        }));
        this.gridData.set([...this.filteredData]);
        this.columnsWithSearch = this.filteredData.length > 0
          ? Object.keys(this.filteredData[0])
          : [];
        this.setPageNumbers(this.filteredData);
        this.loading.set(false);
      },
      error: (error: any) => {
        this.commonService.showErrorMessage(error);
        this.loading.set(false);
      }
    });
  }

  // ── Page Model ────────────────────────────────────────────────────────
  private setPageModel(): void {
    this.pageCriteria.pageSize = this.commonService.pageSize;
    this.pageCriteria.offset = 0;
    this.pageCriteria.pageNumber = 1;
    this.pageCriteria.footerPageHeight = 50;
  }

  private setPageNumbers(data: any[]): void {
    this.pageCriteria.totalrows = data.length;
    this.pageCriteria.TotalPages = 1;

    if (this.pageCriteria.totalrows > this.pageCriteria.pageSize) {
      this.pageCriteria.TotalPages =
        Math.floor(this.pageCriteria.totalrows / this.pageCriteria.pageSize) + 1;
    }

    this.pageCriteria.currentPageRows =
      data.length < this.pageCriteria.pageSize
        ? data.length
        : this.pageCriteria.pageSize;
  }

  // ── Actions ───────────────────────────────────────────────────────────
  newSchemeForm(): void {
    this.accountingMasterService.newformstatus('new');
  }

  editHandler(row: any): void {
   
    this.router.navigate(['/dashboard/accounts/accounts-config/bank-config']);
    this.accountingMasterService.newformstatus('edit');
    this.accountingMasterService.GetBankDetails1(row.tbl_mst_bank_configuration_id, row);
  }

  // ── Search / Filter ───────────────────────────────────────────────────
  filterDatatable(event: Event): void {
 
    const filter = (event.target as HTMLInputElement).value?.toLowerCase() ?? '';

    if (!filter) {
      this.gridData.set([...this.filteredData]);
    } else {
      this.gridData.set(
        this.filteredData.filter(item =>
          this.columnsWithSearch.some(col => {
            const val = item[col];
            return val != null && String(val).toLowerCase().includes(filter);
          })
        )
      );
    }

    this.setPageNumbers(this.gridData());
  }

  // ── A/C Type helper (replaces *ngIf chain in template) ───────────────
  getAccountType(row: any): string {
    if (row.isprimary) return 'Primary Bank';
    if (row.is_interest_payment_bank) return 'Interest Payment Bank';
    if (row.isformanbank) return 'Foreman Bank';
    if (row.is_foreman_payment_bank) return 'Foreman Payment Bank';
    return '--';
  }
}
