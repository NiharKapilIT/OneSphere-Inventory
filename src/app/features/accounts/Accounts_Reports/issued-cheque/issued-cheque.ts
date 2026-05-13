import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { NgSelectModule } from '@ng-select/ng-select';
import { TableModule } from 'primeng/table';
import { Companydetails } from '../../../common/company-details/companydetails/companydetails';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { PageCriteria } from '../../../../core/models/pagecriteria';

@Component({
  selector: 'app-issued-cheque',
  standalone: true,
  imports: [
    TableModule,
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    NgSelectModule,
    Companydetails
  ],
  templateUrl: './issued-cheque.html',
  // styleUrl: './issued-cheque.css',
  providers: [DatePipe]
})
export class IssuedCheque implements OnInit {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private datePipe = inject(DatePipe);
  private reportService = inject(AccountsReports);
  private commonService = inject(CommonService);
  private bankBookService = inject(AccountsReports);
  private accountingTransaction = inject(AccountsTransactions);
  private destroyRef = inject(DestroyRef);

  // ── Form ────────────────────────────────────────────────────────────────────
  FrmIssuedCheque!: FormGroup;

  get f() { return this.FrmIssuedCheque.controls; }

  // ── Signals ─────────────────────────────────────────────────────────────────
  BankData = signal<any[]>([]);
  lstBankChequeDetails = signal<any[]>([]);
  gridData = signal<any[]>([]);
  gridDataDetails = signal<any[]>([]);
  DataForCancel = signal<any[]>([]);

  savebutton = signal('Submit');
  printedDate = signal(true);
  TotalPages = signal(0);

  unusedSortColumn = signal('');
  unusedSortDirection = signal<1 | -1>(1);
  issuedSortColumn = signal('');
  issuedSortDirection = signal<1 | -1>(1);
  unusedSectionOpen = signal(true);

  commencementgridPage = signal({ size: 10, totalElements: 0, pageNumber: 0 });

  // ── Private state ────────────────────────────────────────────────────────────
  private rawUnusedData: any[] = [];
  private rawIssuedData: any[] = [];
  private _BankId: any;
  private _ChqBookId: any;
  private _ChqFromNo: any;
  private _ChqToNo: any;
  private BankName: any;
  private chequefrom: any;
  private strChqNo: any;

  currencysymbol = this.commonService.datePickerPropertiesSetup('currencysymbol');
  pageCriteria = new PageCriteria();

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initForm();
    this.setPageModel();
    this.bankBookDetails();
  }

  // ── Init helpers ─────────────────────────────────────────────────────────────
  private initForm(): void {
    this.FrmIssuedCheque = this.fb.group({
      pbankname: [null, Validators.required],
      pchqfromto: [null, Validators.required],
      branchSchema: [''],
      lstIssuedCheque: [[]]
    });
  }

  private setPageModel(): void {
    this.pageCriteria.pageSize = this.commonService.pageSize;
    this.pageCriteria.offset = 0;
    this.pageCriteria.pageNumber = 1;
    this.pageCriteria.footerPageHeight = 50;
  }

  // ── Data loading ─────────────────────────────────────────────────────────────
  bankBookDetails(): void {
    this.bankBookService.GetBankNames(
      this.commonService.getschemaname(),
      this.commonService.getbranchname(),
      this.commonService.getCompanyCode(),
      this.commonService.getBranchCode()
    ).subscribe({
      next: (res: any) => this.BankData.set(res),
      error: (err: any) => this.commonService.showErrorMessage(err)
    });
  }


  toggleUnusedSection(): void {
    this.unusedSectionOpen.update(v => !v);
  }


  // Add this signal after unusedSectionOpen
  collapsedGroups = signal<Set<string>>(new Set());

  // Add these 2 methods after toggleUnusedSection()
  toggleGroup(status: string): void {
    this.collapsedGroups.update(groups => {
      const next = new Set(groups);
      next.has(status) ? next.delete(status) : next.add(status);
      return next;
    });
  }

  isGroupCollapsed(status: string): boolean {
    return this.collapsedGroups().has(status);
  }

  BankName_Cahange(event: any): void {
    this.gridData.set([]);
    this.gridDataDetails.set([]);
    this.lstBankChequeDetails.set([]);
    this.FrmIssuedCheque.get('pchqfromto')?.reset();

    if (!event) return;

    this._BankId = event.bankAccountId;
    this.BankName = event.bankName;

    this.reportService.GetBankChequeDetails(
      this._BankId,
      this.commonService.getbranchname(),
      this.commonService.getCompanyCode(),
      this.commonService.getBranchCode()
    ).subscribe({
      next: res => this.lstBankChequeDetails.set(res ?? []),
      error: err => this.commonService.showErrorMessage(err)
    });
  }

  GetIssuedBankDetails(event: any): void {
    if (this.FrmIssuedCheque.invalid) {
      Object.values(this.f).forEach(ctrl => ctrl.markAsTouched());
      return;
    }

    this._BankId = this.f['pbankname'].value;
    this._ChqBookId = this.f['pchqfromto'].value;
    this.strChqNo = event.pchqfromto;
    this.chequefrom = event.pchqfromto;

    this.GetData();
  }

  GetData(): void {
    const [from, to] = this.strChqNo.split('-');
    this._ChqFromNo = from;
    this._ChqToNo = to;

    this.reportService.GetUnusedChequeDetails(
      this._BankId, this._ChqBookId, from, to,
      this.commonService.getbranchname(),
      this.commonService.getschemaname(),
      this.commonService.getCompanyCode(),
      this.commonService.getBranchCode()
    ).subscribe({
      next: (res: any) => {
        const data = res ?? [];
        this.gridData.set(data);
        this.rawUnusedData = [...data];
        this.pageCriteria.totalrows = data.length;
        this.unusedSectionOpen.set(true);
      },
      error: (err: any) => this.commonService.showErrorMessage(err)
    });

    this.reportService.GetIssuedBankDetails(
      this._BankId, this._ChqBookId, from, to,
      this.commonService.getbranchname(),
      this.commonService.getschemaname(),
      this.commonService.getCompanyCode(),
      this.commonService.getBranchCode()
    ).subscribe({
      next: (res: any) => {
        const data = res ?? [];
        this.gridDataDetails.set(data);
        this.rawIssuedData = [...data];
        this.commencementgridPage.update(p => ({ ...p, totalElements: data.length }));
      },
      error: (err: any) => this.commonService.showErrorMessage(err)
    });
  }

  // ── Export ───────────────────────────────────────────────────────────────────
  export(): void {
    const rows = this.gridDataDetails().map(element => ({
      'Cheque Status': element.pchequestatus,
      'Cheque No.': element.pchequenumber,
      'Payment ID': element.ppaymentid,
      'Particulars': element.pparticulars,
      'Payment Date': this.commonService.getFormatDateGlobal(element.ppaymentdate),
      'Cleared Date': this.commonService.getFormatDateGlobal(element.pcleardate),
      'Paid Amt.': element.ppaidamount
        ? this.commonService.convertAmountToPdfFormat(
          this.commonService.currencyFormat(element.ppaidamount)
        )
        : '',
      'Bank Name': element.pbankname,
      'Cheque Book ID': element.pchkBookId,
      'Cheque Status ': element.pchequestatus
    }));
    this.commonService.exportAsExcelFile(rows, 'Issued_Cheque');
  }

  // ── Cancel unused cheques ────────────────────────────────────────────────────
  UnusedChequeCancel(): void {
    if (!this.DataForCancel().length) {
      this.commonService.showWarningMessage('Select Atleast One Un Used Cheque No.');
      return;
    }

    this.savebutton.set('Processing');
    const [from, to] = this.chequefrom.split('-');

    const payload = {
      pchequeNoFrom: Number(from),
      pchequeNoTo: Number(to),
      pchkBookId: this._ChqBookId,
      pbankaccountid: this._BankId,
      pbankname: this.BankName,
      pchqfromto: this.chequefrom,
      branchSchema: this.commonService.getbranchname(),
      pchequenumber: '',
      ppaymentid: '',
      pparticulars: '',
      ppaymentdate: '',
      pcleardate: '',
      pstatus: 'Cancelled',
      ppaidamount: 0,
      pchequestatus: '',
      lstIssuedCheque: this.DataForCancel().map((row: any) => ({
        pbankaccountid: this._BankId,
        pchkBookId: this._ChqBookId,
        pchequenumber: String(row.pchequenumber)
      }))
    };

    this.accountingTransaction.UnusedhequeCancel(
      payload,
      this.commonService.getBranchCode(),
      this.commonService.getCompanyCode(),
      this.commonService.getbranchname(),
      this.commonService.getschemaname()
    ).subscribe({
      next: () => {
        this.commonService.showSuccessMsg('Cancelled Successfully');
        this.savebutton.set('Submit');
        this.DataForCancel.set([]);
        this.GetData();
      },
      error: (err: any) => this.commonService.showErrorMessage(err)
    });
  }

  // ── PDF / Print ──────────────────────────────────────────────────────────────
  pdfOrprint(printorpdf: 'Pdf' | 'Print'): void {
    const rows: any[] = [];
    const reportname = 'Issued Cheque';
    const gridheaders = [
      'Cheque No.', 'Payment ID', 'Particulars', 'Payment Date',
      'Cheque\nCleared Date', 'Paid Amt.', 'Bank Name', 'Cheque Book ID', 'Cheque Status'
    ];
    const colWidthHeight = Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [i, { cellWidth: 'auto' }])
    );

    const retungridData = this.commonService._getGroupingGridExportData(
      this.gridDataDetails(), 'pchequestatus', false
    );

    retungridData.forEach((element: any) => {
      const paymentdate = element.ppaymentdate
        ? (this.datePipe.transform(element.ppaymentdate, 'dd-MMM-yyyy') ?? '') : '';
      const cleardate = element.pcleardate
        ? (this.datePipe.transform(element.pcleardate, 'dd-MMM-yyyy') ?? '') : '';
      const paidamount = element.ppaidamount && element.ppaidamount !== 0
        ? this.commonService.convertAmountToPdfFormat(
          this.commonService.currencyFormat(parseFloat(String(element.ppaidamount)))
        )
        : '';

      rows.push(
        element.group
          ? [element.group, element.pchequenumber, element.ppaymentid, element.pparticulars,
            paymentdate, cleardate, paidamount, element.pbankname, element.pchkBookId, element.pchequestatus]
          : [element.pchequenumber, element.ppaymentid, element.pparticulars,
            paymentdate, cleardate, paidamount, element.pbankname, element.pchkBookId, element.pchequestatus]
      );
    });

    this.reportService._IssuedChequesReportsPdf(
      reportname, rows, gridheaders, colWidthHeight, 'landscape', '', '', '', printorpdf
    );
  }

  // ── Checkbox cancel selection ────────────────────────────────────────────────
  checkedCancel(event: any, row: any): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    row.isSelected = isChecked;
    if (isChecked) {
      this.DataForCancel.update(list => [...list, row]);
    } else {
      this.DataForCancel.update(list => list.filter(r => r.pchequenumber !== row.pchequenumber));
    }
  }

  // ── Sort — Unused table ──────────────────────────────────────────────────────
  sortUnused(column: string): void {
    if (this.unusedSortColumn() === column) {
      this.unusedSortDirection.update(d => d === 1 ? -1 : 1);
    } else {
      this.unusedSortColumn.set(column);
      this.unusedSortDirection.set(1);
    }
    this.applyUnusedSort();
  }

  getSortIconUnused(column: string): string {
    if (this.unusedSortColumn() !== column) return '&#8597;';
    return this.unusedSortDirection() === 1 ? '&#8593;' : '&#8595;';
  }

  private applyUnusedSort(): void {
    const col = this.unusedSortColumn();
    const dir = this.unusedSortDirection();
    this.gridData.set([...this.rawUnusedData].sort((a, b) => {
      const aVal = a[col], bVal = b[col];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') return aVal.localeCompare(bVal) * dir;
      return (aVal - bVal) * dir;
    }));
  }

  // ── Sort — Issued table ──────────────────────────────────────────────────────
  sortIssued(column: string): void {
    if (this.issuedSortColumn() === column) {
      this.issuedSortDirection.update(d => d === 1 ? -1 : 1);
    } else {
      this.issuedSortColumn.set(column);
      this.issuedSortDirection.set(1);
    }
    this.applyIssuedSort();
  }

  getSortIconIssued(column: string): string {
    if (this.issuedSortColumn() !== column) return '&#8597;';
    return this.issuedSortDirection() === 1 ? '&#8593;' : '&#8595;';
  }

  private applyIssuedSort(): void {
    const col = this.issuedSortColumn();
    const dir = this.issuedSortDirection();
    const groups = new Map<string, any[]>();
    for (const row of this.rawIssuedData) {
      const key = row.pchequestatus;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    groups.forEach(rows => {
      rows.sort((a, b) => {
        const aVal = a[col], bVal = b[col];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === 'string') return aVal.localeCompare(bVal) * dir;
        return (aVal - bVal) * dir;
      });
    });
    this.gridDataDetails.set(Array.from(groups.values()).flat());
  }
}
