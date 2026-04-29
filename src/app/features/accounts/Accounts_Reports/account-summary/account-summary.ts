import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { Companydetails } from '../../../common/company-details/companydetails/companydetails';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { DatePickerModule } from 'primeng/datepicker';


@Component({
  selector: 'app-account-summary',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePickerModule,
    FormsModule,
    TableModule,
    ButtonModule,
    MultiSelectModule,
    Companydetails
  ],
  providers: [DatePipe],
  templateUrl: './account-summary.html',
  styleUrl: './account-summary.css'
})
export class AccountSummary implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  // ── Injected Services ───────────────────────────────────────
  private readonly fb             = inject(FormBuilder);
  private readonly reportService  = inject(AccountsReports);
  private readonly commonService  = inject(CommonService);
  private readonly datePipe       = inject(DatePipe);
  private readonly destroyRef     = inject(DestroyRef);

  // ── Signals ─────────────────────────────────────────────────
  loading          = signal(false);
  selectedDateMode = signal(true);
  gridData         = signal<any[]>([]);
  ledgerList       = signal<any[]>([]);
  totalDebit       = signal(0);
  totalCredit      = signal(0);

  // ── Form ────────────────────────────────────────────────────
  accountSummaryForm!: FormGroup;
  submitted = false;

  // ── Display state ───────────────────────────────────────────
  betweendates: 'As On' | 'Between' = 'As On';
  betweenfrom  = '';
  betweento    = '';
  inbetween    = '';
  AsOnDate     = 'T';
  printedDate  = true;
  sortColumn   = '';
  sortDirection: 1 | -1 = 1;

  private rawData: any[] = [];

  dpConfig: any = {
    dateInputFormat: 'DD-MMM-YYYY',
    containerClass: 'theme-dark-blue',
    maxDate: new Date()
  };

  dpConfig1: any = {
    dateInputFormat: 'DD-MMM-YYYY',
    containerClass: 'theme-dark-blue',
    maxDate: new Date()
  };
  toDateMinDate: Date | null = null;
  today = new Date();

  // ── Lifecycle ───────────────────────────────────────────────
  ngOnInit(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.accountSummaryForm = this.fb.group(
      {
        fromDate: [today],
        toDate:   [today],
        ledgerId: ['', Validators.required],
        asOn:     [true]
      },
      { validators: this.dateRangeValidator }
    );

    this.betweendates = 'As On';
    this.betweenfrom  = this.datePipe.transform(this.today, 'dd-MMM-yyyy') ?? '';
    const initialFrom = this.accountSummaryForm.get('fromDate')?.value;
  this.toDateMinDate = initialFrom ?? null;

  this.accountSummaryForm.get('fromDate')?.valueChanges.subscribe((val: Date | null) => {
    this.toDateMinDate = val ?? null;
    const toDate = this.accountSummaryForm.get('toDate')?.value;
    if (toDate && val && toDate < val) {
      this.accountSummaryForm.get('toDate')?.setValue(null as unknown as Date);
    }
  });
    this.loadLedgerAccounts();
  }
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.accountSummaryForm.patchValue({
        fromDate: this.today,
        toDate:   this.today
      });
    }, 0);
  }

  get f() { return this.accountSummaryForm.controls; }
  onFromDateSelect(date: Date): void {
  this.toDateMinDate = date;
  const toDate = this.accountSummaryForm.get('toDate')?.value;
  if (toDate && toDate < date) {
    this.accountSummaryForm.get('toDate')?.setValue(null as unknown as Date);
  }
}

  // ── Validators ──────────────────────────────────────────────
  private dateRangeValidator(group: AbstractControl) {
    const from = (group as FormGroup).get('fromDate')?.value;
    const to   = (group as FormGroup).get('toDate')?.value;
    if (from && to && new Date(from) > new Date(to)) {
      return { dateRangeInvalid: true };
    }
    return null;
  }
 

  // ── Data Loading ────────────────────────────────────────────
  private loadLedgerAccounts(): void {
    this.reportService
      .GetLedgerSummaryAccountList(
        'ACCOUNT LEDGER',
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode(),
        this.commonService.getschemaname()
      )
      .subscribe({
        next:  (res) => this.ledgerList.set(res ?? []),
        error: (err) => this.commonService.showErrorMessage(err)
      });
  }

  // ── Date Mode ───────────────────────────────────────────────
  onDateModeChange(): void {
    const isAsOn = this.accountSummaryForm.value.asOn;
    this.selectedDateMode.set(isAsOn);
    this.AsOnDate     = isAsOn ? 'T' : 'F';
    this.betweendates = isAsOn ? 'As On' : 'Between';
    this.inbetween    = isAsOn ? '' : 'And';
    this.gridData.set([]);

    if (isAsOn) {
      this.accountSummaryForm.patchValue({
        toDate: this.accountSummaryForm.value.fromDate
      });
    }
  }

  onFromDateChange(event: Date): void {
    this.dpConfig1 = { ...this.dpConfig1, minDate: event };
  }

  onToDateChange(event: Date): void {
    this.dpConfig = { ...this.dpConfig, maxDate: event };
  }

  // ── Report Generation ───────────────────────────────────────
  generateReport(): void {
    this.submitted = true;

    if (this.accountSummaryForm.invalid) {
      this.accountSummaryForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.gridData.set([]);
    this.totalDebit.set(0);
    this.totalCredit.set(0);

    const formValue = this.accountSummaryForm.value;
    const fromDate  = this.commonService.getFormatDateNormal(formValue.fromDate) ?? '';
    const toDate    = this.commonService.getFormatDateNormal(
      this.selectedDateMode() ? formValue.fromDate : formValue.toDate
    ) ?? '';

    this.betweenfrom = this.datePipe.transform(formValue.fromDate, 'dd-MMM-yyyy') ?? '';
    this.betweento   = this.selectedDateMode()
      ? ''
      : (this.datePipe.transform(formValue.toDate, 'dd-MMM-yyyy') ?? '');

    this.reportService
      .GetLedgerSummary(
        fromDate, toDate, formValue.ledgerId, this.AsOnDate,
        'MM220221P65',
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode(),
        this.commonService.getschemaname()
      )
      .subscribe({
        next: (res) => {
          const data = res ?? [];
          this.rawData = [...data];
          this.gridData.set(data);
          this.calculateTotals();
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.commonService.showErrorMessage(err);
        }
      });
  }

  // ── Totals ──────────────────────────────────────────────────
  private calculateTotals(): void {
    let debitSum  = 0;
    let creditSum = 0;

    this.gridData().forEach((item) => {
      const debit  = Math.abs(item.pdebitamount  || 0);
      const credit = Math.abs(item.pcreditamount || 0);

      item.pdebitamount  = debit;
      item.pcreditamount = credit;
      debitSum  += debit;
      creditSum += credit;

      item.popeningbal = item.popeningbal < 0
        ? this.commonService.currencyformat(Math.abs(item.popeningbal)) + ' Cr'
        : item.popeningbal > 0
          ? this.commonService.currencyformat(item.popeningbal) + ' Dr'
          : item.popeningbal;

      item.pclosingbal = item.pclosingbal < 0
        ? this.commonService.currencyformat(Math.abs(item.pclosingbal)) + ' Cr'
        : item.pclosingbal > 0
          ? this.commonService.currencyformat(item.pclosingbal) + ' Dr'
          : item.pclosingbal;
    });

    this.totalDebit.set(debitSum);
    this.totalCredit.set(creditSum);
  }

  // ── Export ──────────────────────────────────────────────────
  exportExcel(): void {
    const rows = this.gridData().map((element) => ({
      'Ledger Name':           element.pparentname,
      'Particulars':           element.paccountname,
      'Min Transaction Date':  this.datePipe.transform(element.ptransactiondate, 'dd-MMM-yyyy'),
      'Debit Amount':          element.pdebitamount,
      'Credit Amount':         element.pcreditamount
    }));

    this.commonService.exportAsExcelFile(rows, 'Account_Summary');
  }

  pdfOrprint(printOrPdf: 'Pdf' | 'Print'): void {
    const reportName       = 'Account Summary';
    const gridHeaders      = ['Particulars', 'Max Transaction Date', 'Opening Balance', 'Debit Amount', 'Credit Amount', 'Closing Balance'];
    const gridHeadersAsOn  = ['Particulars', 'Max Transaction Date', 'Debit Amount', 'Credit Amount'];

    const rows: any[]      = [];
    const rowsAsOn: any[]  = [];

    const fromDateRaw = this.accountSummaryForm.get('fromDate')?.value;
    const toDateRaw   = this.accountSummaryForm.get('toDate')?.value;

    const fmt = (dateVal: any): string => {
      if (!dateVal) return '';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('en-US', { month: 'short' })}-${d.getFullYear()}`;
    };

    const fromDate = fmt(fromDateRaw);
    const toDate   = fmt(toDateRaw);

    const groupedData = this.commonService._getGroupingGridExportData(this.gridData(), 'pparentname', false);

    const formatBalance = (val: any): string => {
      if (val === null || val === undefined || val === '') return '';
      let num: number;
      let suffix: string;
      if (typeof val === 'string') {
        suffix = val.includes('Cr') ? ' Cr' : val.includes('Dr') ? ' Dr' : '';
        num = parseFloat(val.replace(/[₹$€£,\s]/g, '').replace(/Cr|Dr/g, '').trim());
      } else {
        suffix = val < 0 ? ' Cr' : ' Dr';
        num = Math.abs(val);
      }
      if (isNaN(num)) return '';
      const [intPart, decPart] = num.toFixed(2).split('.');
      const last3  = intPart.slice(-3);
      const others = intPart.slice(0, -3);
      const formatted = others
        ? others.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3
        : last3;
      return `${formatted}.${decPart}${suffix}`;
    };

    groupedData?.forEach((element: any) => {
      if (element.group !== undefined) {
        rows.push([element.group]);
        rowsAsOn.push([element.group]);
        return;
      }
      const openingBal      = formatBalance(element.popeningbal);
      const closingBal      = formatBalance(element.pclosingbal);
      const debitAmt        = element.pdebitamount  ? this.commonService.convertAmountToPdfFormat(element.pdebitamount)  : '';
      const creditAmt       = element.pcreditamount ? this.commonService.convertAmountToPdfFormat(element.pcreditamount) : '';
      const transactionDate = element.ptransactiondate ? fmt(element.ptransactiondate) : '';

      rows.push([element.paccountname, transactionDate, openingBal, debitAmt, creditAmt, closingBal]);
      rowsAsOn.push([element.paccountname, transactionDate, debitAmt, creditAmt]);
    });

    if (this.AsOnDate === 'T') {
      const colStyles = { 0: { cellWidth: 'auto' }, 1: { cellWidth: 'auto', halign: 'center' }, 2: { cellWidth: 'auto', halign: 'right' }, 3: { cellWidth: 'auto', halign: 'right' } };
      rowsAsOn.push(['Total', '', this.commonService.convertAmountToPdfFormat(this.totalDebit()), this.commonService.convertAmountToPdfFormat(this.totalCredit())]);
      rowsAsOn.push([{ content: 'Grand Total', colSpan: 2, styles: { halign: 'center' } }, { content: this.commonService.convertAmountToPdfFormat(this.totalDebit() - this.totalCredit()), colSpan: 3, styles: { halign: 'center' } }]);
      this.commonService._downloadReportsPdfAccountSummaryason(reportName, rowsAsOn, gridHeadersAsOn, colStyles, 'a4', this.betweendates, fromDate, toDate, printOrPdf);
    } else {
      const colStyles = { 0: { cellWidth: 'auto', halign: 'left' }, 1: { cellWidth: 'auto', halign: 'center' }, 2: { cellWidth: 'auto', halign: 'right' }, 3: { cellWidth: 'auto', halign: 'right' }, 4: { cellWidth: 'auto', halign: 'right' }, 5: { cellWidth: 'auto', halign: 'right' } };
      rows.push(['Total', '', '', this.commonService.convertAmountToPdfFormat(this.totalDebit()), this.commonService.convertAmountToPdfFormat(this.totalCredit()), '']);
      rows.push([{ content: 'Grand Total', colSpan: 1, styles: { halign: 'center' } }, '', '', { content: this.commonService.convertAmountToPdfFormat(this.totalDebit() - this.totalCredit()), colSpan: 2, styles: { halign: 'center' } }, '']);
      this.commonService._downloadReportsPdfAccountSummary(reportName, rows, gridHeaders, colStyles, 'landscape', this.betweendates, fromDate, toDate, printOrPdf);
    }
  }

  // ── Sorting ─────────────────────────────────────────────────
  sortBy(column: string): void {
    this.sortDirection = this.sortColumn === column
      ? (this.sortDirection === 1 ? -1 : 1)
      : 1;
    this.sortColumn = column;
    this.applySortWithinGroups();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '&#8597;';
    return this.sortDirection === 1 ? '&#8593;' : '&#8595;';
  }

  private applySortWithinGroups(): void {
    const col = this.sortColumn;
    const dir = this.sortDirection;

    const groups = new Map<string, any[]>();
    for (const row of this.rawData) {
      if (!groups.has(row.pparentname)) groups.set(row.pparentname, []);
      groups.get(row.pparentname)!.push(row);
    }

    groups.forEach((rows) => {
      rows.sort((a, b) => {
        const aVal = a[col];
        const bVal = b[col];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === 'string') return aVal.localeCompare(bVal) * dir;
        return (aVal - bVal) * dir;
      });
    });

    this.gridData.set(Array.from(groups.values()).flat());
  }
}
