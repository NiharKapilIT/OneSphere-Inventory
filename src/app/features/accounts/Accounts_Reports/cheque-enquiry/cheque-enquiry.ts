import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormGroup, FormsModule, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { CommonService } from '../../../../core/services/Common/common.service';
import { PageCriteria } from '../../../../core/models/pagecriteria';

@Component({
  selector: 'app-cheque-enquiry',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule, TableModule],
  templateUrl: './cheque-enquiry.html',
  // styleUrl: './cheque-enquiry.css',
})
export class ChequeEnquiry implements OnInit {

  // ── DI ──────────────────────────────────────────────────────────────────────
  private readonly fb                = inject(NonNullableFormBuilder);
  private readonly accountingService = inject(AccountsTransactions);
  private readonly accountservice    = inject(AccountsReports);
  private readonly commonService     = inject(CommonService);
  private readonly destroyRef        = inject(DestroyRef);
  private readonly datePipe          = inject(DatePipe);

  // ── Form ────────────────────────────────────────────────────────────────────
  ChequesIssuedForm!: FormGroup;

  // ── Signals ─────────────────────────────────────────────────────────────────
  spinner             = signal(false);
  gridLoading         = signal(false);
  showIssuedCheques   = signal(true);
  showReceivedCheques = signal(false);

  issuedData    = signal<any[]>([]);
  receivedData  = signal<any[]>([]);

  totalamount       = signal(0);
  amounttotal       = signal(0);
  totalreceivedcheques = signal(0);

  // ── Raw data (non-signal, only used as source to build signal data) ──────────
  BanksList: any[]                   = [];
  ChequesIssuedData: any[]           = [];
  ChequesInBankData: any[]           = [];
  ChequesClearReturnData: any[]      = [];
  ChequesClearReturnDataInBank: any[]= [];

  private issuedBackup:   any[] = [];
  private receivedBackup: any[] = [];

  // ── Sort state ───────────────────────────────────────────────────────────────
  issuedSortColumn:    string   = '';
  issuedSortDirection: 1 | -1   = 1;
  receivedSortColumn:  string   = '';
  receivedSortDirection: 1 | -1 = 1;

  // ── Pagination ───────────────────────────────────────────────────────────────
  issuedPageCriteria   = new PageCriteria();
  receivedPageCriteria = new PageCriteria();

  // ── Misc ─────────────────────────────────────────────────────────────────────
  bankid           = 0;
  bankname         = '';
  bankbalance      = 0;
  bankbalancetype  = '';
  currencySymbol   = this.commonService.currencysymbol;

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initForm();
    this.loadBanks();
    this.setPageModel();
    this.setupSearchListener();
    this.GetChequesIssued(0);
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  private initForm(): void {
    this.ChequesIssuedForm = this.fb.group({
      pchequestype: ['Issued'],
      bankname:     [''],
      SearchClear:  [''],
    });
  }

  // ── Banks ────────────────────────────────────────────────────────────────────
  private loadBanks(): void {
    this.accountingService
      .GetBanksntList(
        this.commonService.getbranchname(),
        this.commonService.getschemaname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode(),
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (banks: any) => (this.BanksList = banks),
        error: (err) => this.commonService.showErrorMessage(err),
      });
  }

  // ── Pagination helpers ───────────────────────────────────────────────────────
  private setPageModel(): void {
    const size = this.commonService.pageSize;

    this.issuedPageCriteria.pageSize    = size;
    this.issuedPageCriteria.offset      = 0;
    this.issuedPageCriteria.pageNumber  = 1;
    this.issuedPageCriteria.CurrentPage = 1;

    this.receivedPageCriteria.pageSize    = size;
    this.receivedPageCriteria.offset      = 0;
    this.receivedPageCriteria.pageNumber  = 1;
    this.receivedPageCriteria.CurrentPage = 1;
  }

  private updateIssuedPagination(totalRows: number): void {
    this.issuedPageCriteria.totalrows       = totalRows;
    this.issuedPageCriteria.TotalPages      = Math.ceil(totalRows / this.issuedPageCriteria.pageSize);
    this.issuedPageCriteria.currentPageRows =
      totalRows < this.issuedPageCriteria.pageSize ? totalRows : this.issuedPageCriteria.pageSize;
  }

  private updateReceivedPagination(totalRows: number): void {
    this.receivedPageCriteria.totalrows       = totalRows;
    this.receivedPageCriteria.TotalPages      = Math.ceil(totalRows / this.receivedPageCriteria.pageSize);
    this.receivedPageCriteria.currentPageRows =
      totalRows < this.receivedPageCriteria.pageSize ? totalRows : this.receivedPageCriteria.pageSize;
  }

  // ── Search ───────────────────────────────────────────────────────────────────
  onSearchForCheque(value: string): void {
    const filtered = !value?.trim()
      ? [...this.issuedBackup]
      : this.issuedBackup.filter((c) =>
          c.pChequenumber?.toString().toLowerCase().includes(value.trim().toLowerCase()),
        );

    this.issuedData.set(filtered);
    this.totalamount.set(filtered.reduce((s, c) => s + (c?.ptotalreceivedamount || 0), 0));
    this.updateIssuedPagination(filtered.length);
  }

  onSearchForChequeReceived(value: string): void {
    const filtered = !value?.trim()
      ? [...this.receivedBackup]
      : this.receivedBackup.filter((c) =>
          c.pChequenumber?.toString().toLowerCase().includes(value.trim().toLowerCase()),
        );

    this.receivedData.set(filtered);
    this.amounttotal.set(filtered.reduce((s, c) => s + (c?.ptotalreceivedamount || 0), 0));
    this.updateReceivedPagination(filtered.length);
  }

  // ── Type switch ──────────────────────────────────────────────────────────────
  selectChequesType(type: 'Issued' | 'Received'): void {
    debugger;
    this.showIssuedCheques.set(type === 'Issued');
    this.showReceivedCheques.set(type === 'Received');

    if (type === 'Issued') {
      if (this.issuedBackup.length) {
        this.issuedData.set([...this.issuedBackup]);
        this.totalamount.set(this.issuedData().reduce((s, c) => s + (c?.ptotalreceivedamount || 0), 0));
        this.updateIssuedPagination(this.issuedData().length);
      } else {
        this.GetChequesIssued(this.bankid);
      }
    } else {
      if (this.receivedBackup.length) {
        this.receivedData.set([...this.receivedBackup]);
        this.amounttotal.set(this.receivedData().reduce((s, c) => s + (c?.ptotalreceivedamount || 0), 0));
        this.updateReceivedPagination(this.receivedData().length);
      } else {
        this.GetChequesInBank();
      }
    }
  }

  // ── Bank selection ───────────────────────────────────────────────────────────
  SelectBank(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    if (!value) {
      this.bankid         = 0;
      this.bankname       = '';
      this.bankbalance    = 0;
      this.bankbalancetype = '';
    } else {
      const bank = this.BanksList.find((b) => b.pbankid == value);
      if (bank) {
        this.bankid         = bank.pbankid;
        this.bankname       = bank.pdepositbankname;
        this.bankbalance    = Math.abs(bank.pbankbalance);
        this.bankbalancetype =
          bank.pbankbalance < 0 ? 'Cr' : bank.pbankbalance > 0 ? 'Dr' : '';
      }
    }

    this.GetBankBalance(this.bankid);
    this.showIssuedCheques() ? this.GetChequesIssued(this.bankid) : this.GetChequesInBank();
  }

  GetBankBalance(bankId: number): void {
    this.accountservice
      .GetBankBalance(bankId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          const balance    = res?._BankBalance ?? 0;
          this.bankbalance = Math.abs(balance);
          this.bankbalancetype = balance < 0 ? 'Cr' : balance > 0 ? 'Dr' : '';
        },
        error: (err) => this.commonService.showErrorMessage(err),
      });
  }

  // ── API calls ────────────────────────────────────────────────────────────────
  GetChequesIssued(bankId: number): void {
    this.gridLoading.set(true);

    this.accountservice
      .GetChequesIssuedData(
        bankId, 0, 999999, 'CHEQUE', '0',
        this.commonService.getschemaname(),
        this.commonService.getBranchCode(),
        this.commonService.getCompanyCode(),
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.ChequesIssuedData      = res?.pchequesOnHandlist     ?? [];
          this.ChequesClearReturnData = res?.pchequesclearreturnlist ?? [];
          this.buildIssuedGrid();
          this.issuedBackup = [...this.issuedData()];
          this.gridLoading.set(false);
        },
        error: (err) => {
          this.gridLoading.set(false);
          this.commonService.showErrorMessage(err);
        },
      });
  }

  GetChequesInBank(searchText = '0'): void {
    this.gridLoading.set(true);

    this.accountservice
      .GetChequeEnquiryData(this.bankid, 0, 999999, 'RETURN', searchText)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.ChequesInBankData           = res?.pchequesOnHandlist     ?? [];
          this.ChequesClearReturnDataInBank = res?.pchequesclearreturnlist ?? [];
          this.buildReceivedGrid();
          this.gridLoading.set(false);
        },
        error: (err) => {
          this.gridLoading.set(false);
          this.commonService.showErrorMessage(err);
        },
      });
  }

  // ── Grid builders ─────────────────────────────────────────────────────────────
  private buildIssuedGrid(): void {
    const grid: any[] = [];

    this.ChequesIssuedData.forEach((item) => {
      if (item.ptypeofpayment !== 'CASH') grid.push({ ...item, chequeStatus: 'Issued' });
    });

    this.ChequesClearReturnData.forEach((item) => {
      if (item.pchequestatus === 'P') grid.push({ ...item, chequeStatus: 'Cleared' });
      if (item.pchequestatus === 'R') grid.push({ ...item, chequeStatus: 'Returned' });
      if (item.pchequestatus === 'C') grid.push({ ...item, chequeStatus: 'Cancelled' });
    });

    this.issuedData.set(grid);
    this.totalamount.set(grid.reduce((s, c) => s + (c?.ptotalreceivedamount || 0), 0));
    this.updateIssuedPagination(grid.length);
  }

  private buildReceivedGrid(): void {
    const mapStatus = (s: string) =>
      s === 'N' ? 'Deposited' : s === 'Y' ? 'Cleared' : s === 'R' ? 'Returned' : '';

    const onHand = (this.ChequesInBankData ?? [])
      .filter((i) => i.ptotalreceivedamount !== 0)
      .map((i) => ({
        ...i,
        pbranchname: typeof i.pbranchname === 'string' && i.pbranchname ? i.pbranchname : '--NA--',
        chequeStatus: mapStatus(i.pchequestatus),
      }));

    const clearReturn = (this.ChequesClearReturnDataInBank ?? [])
      .filter((i) => i.ptotalreceivedamount !== 0)
      .map((i) => ({
        ...i,
        pbranchname: typeof i.pbranchname === 'string' && i.pbranchname ? i.pbranchname : '--NA--',
        chequeStatus: i.pchequestatus === 'Y' ? 'Cleared' : i.pchequestatus === 'R' ? 'Returned' : '',
      }));

    const grid = [...onHand, ...clearReturn];

    this.receivedData.set(grid);
    this.receivedBackup = [...grid];
    this.totalreceivedcheques.set(grid.reduce((s, c) => s + (c?.ptotalreceivedamount || 0), 0));
    this.amounttotal.set(this.totalreceivedcheques());
    this.updateReceivedPagination(grid.length);
  }

  // ── Search listener ──────────────────────────────────────────────────────────
  private setupSearchListener(): void {
    this.ChequesIssuedForm.controls['SearchClear'].valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.showIssuedCheques() ? this.GetChequesIssued(this.bankid) : this.GetChequesInBank(value);
      });
  }

  // ── Clear ────────────────────────────────────────────────────────────────────
  Clear(): void {
    this.ChequesIssuedForm.reset({ pchequestype: 'Issued', SearchClear: '' });
    this.bankid = 0;
    this.GetChequesIssued(0);
  }

  // ── Sort – Issued ─────────────────────────────────────────────────────────────
  sortIssued(column: string): void {
    this.issuedSortDirection =
      this.issuedSortColumn === column ? (this.issuedSortDirection === 1 ? -1 : 1) : 1;
    this.issuedSortColumn = column;
    this.applyIssuedSort();
  }

  getSortIconIssued(column: string): string {
    if (this.issuedSortColumn !== column) return '&#8597;';
    return this.issuedSortDirection === 1 ? '&#8593;' : '&#8595;';
  }

  private applyIssuedSort(): void {
    const col = this.issuedSortColumn;
    const dir = this.issuedSortDirection;
    const sorted = [...this.issuedBackup].sort((a, b) => {
      const av = a[col], bv = b[col];
      if (av == null) return 1; if (bv == null) return -1;
      return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * dir;
    });
    this.issuedData.set(sorted);
    this.updateIssuedPagination(sorted.length);
  }

  // ── Sort – Received ───────────────────────────────────────────────────────────
  sortReceived(column: string): void {
    this.receivedSortDirection =
      this.receivedSortColumn === column ? (this.receivedSortDirection === 1 ? -1 : 1) : 1;
    this.receivedSortColumn = column;
    this.applyReceivedSort();
  }

  getSortIconReceived(column: string): string {
    if (this.receivedSortColumn !== column) return '&#8597;';
    return this.receivedSortDirection === 1 ? '&#8593;' : '&#8595;';
  }

  private applyReceivedSort(): void {
    const col = this.receivedSortColumn;
    const dir = this.receivedSortDirection;
    const sorted = [...this.receivedBackup].sort((a, b) => {
      const av = a[col], bv = b[col];
      if (av == null) return 1; if (bv == null) return -1;
      return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * dir;
    });
    this.receivedData.set(sorted);
    this.updateReceivedPagination(sorted.length);
  }

  // ── PDF / Print ───────────────────────────────────────────────────────────────
  pdfOrprint(printOrPdf: 'Pdf' | 'Print'): void {
    const rows: (string | number)[][] = [];

    const gridHeaders = [
      'Cheque Status', 'Cheque/ Reference No.', 'Branch Name',
      'Amount', 'Receipt Id', 'Receipt Date', 'Deposited Date',
      'Cleared Date', 'Returned Date', 'Transaction Mode',
      'Cheque Bank Name', 'Party',
    ];

    const colWidthHeight: any = {
      0: { cellWidth: 'auto', halign: 'center' },
      1: { cellWidth: 'auto', halign: 'center' },
      2: { cellWidth: 22,     halign: 'left'   },
      3: { cellWidth: 'auto', halign: 'right'  },
      4: { cellWidth: 17,     halign: 'center' },
      5: { cellWidth: 20,     halign: 'center' },
      6: { cellWidth: 'auto', halign: 'center' },
      7: { cellWidth: 'auto', halign: 'center' },
      8: { cellWidth: 'auto', halign: 'center' },
      9: { cellWidth: 'auto', halign: 'center' },
      10:{ cellWidth: 'auto', halign: 'center' },
      11:{ cellWidth: 'auto', halign: 'left'   },
    };

    this.receivedData().forEach((el) => {
      const amt = el?.ptotalreceivedamount && el.ptotalreceivedamount !== 0
        ? this.commonService.convertAmountToPdfFormat(
            this.commonService.currencyFormat(el.ptotalreceivedamount),
          )
        : '';

      rows.push([
        el?.chequeStatus ?? '',
        el?.pChequenumber ?? '',
        el?.pbranchname ?? '',
        amt,
        el?.preceiptid ?? '',
        this.datePipe.transform(el?.preceiptdate, 'dd-MMM-yyyy') ?? '',
        el?.ptypeofpayment === 'CHEQUE'
          ? (this.datePipe.transform(el?.pdepositeddate, 'dd-MMM-yyyy') ?? '')
          : 'N/A',
        el?.ptypeofpayment === 'CHEQUE' && el?.pchequestatus === 'Y'
          ? (this.datePipe.transform(el?.pCleardate, 'dd-MMM-yyyy') ?? '')
          : 'N/A',
        el?.ptypeofpayment === 'CHEQUE' && el?.pchequestatus === 'R'
          ? (this.datePipe.transform(el?.pCleardate, 'dd-MMM-yyyy') ?? '')
          : 'N/A',
        el?.ptypeofpayment ?? '',
        el?.cheque_bank ?? '',
        el?.ppartyname ?? '',
      ]);
    });

    const amountTotal = this.commonService.convertAmountToPdfFormat(
      this.commonService.currencyFormat(this.amounttotal()),
    );

    this.commonService._downloadchqrecReportsPdf(
      'Received Cheque Details', rows, gridHeaders, colWidthHeight,
      'landscape', '',
      this.commonService.getFormatDateGlobal(new Date()),
      printOrPdf === 'Pdf' ? null : '',
      printOrPdf, amountTotal,
    );
  }
}
