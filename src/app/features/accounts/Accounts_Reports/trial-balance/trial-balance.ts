import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { Table, TableModule } from 'primeng/table';
import { Companydetails } from '../../../common/company-details/companydetails/companydetails';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-trial-balance',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePickerModule,
    
    TableModule,
    Companydetails
  ],
  providers: [DatePipe],
  templateUrl: './trial-balance.html',
  styleUrl: './trial-balance.css'
})
export class TrialBalance implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  // ── Injected Services ───────────────────────────────────────
  private readonly fb               = inject(FormBuilder);
  private readonly commonService    = inject(CommonService);
  private readonly accountingService = inject(AccountsReports);
  private readonly datePipe         = inject(DatePipe);
  private readonly destroyRef       = inject(DestroyRef);

  // ── Signals ─────────────────────────────────────────────────
  trialBalanceList  = signal<any[]>([]);
  showhidetable     = signal(false);
  dataisempty       = signal(false);
  savebutton        = signal('Generate Report');
  totalDebit        = signal(0);
  totalCredit       = signal(0);
  difference        = signal(0);
  trialBalanceDiff  = signal(false);

  // ── Plain State ─────────────────────────────────────────────
  TrialBalanceForm!: FormGroup;
  currencysymbol    = '₹';
  groupType         = 'BETWEEN';
  showhideason      = true;
  withgrouping      = false;
  printedDate       = true;
  betweendates: 'As On' | 'Between' = 'Between';
  betweenfrom       = '';
  betweento         = '';
  sortColumn        = '';
  sortDirection     = 1;
  toDateMinDate: Date | null = null;

  private trialBalanceRaw: any[] = [];

  dpConfig: any  = {};
  dppConfig: any = {};

  @ViewChild('dt') table!: Table;

  // ── Lifecycle ───────────────────────────────────────────────
  ngOnInit(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.dpConfig = {
      dateInputFormat: 'DD-MMM-YYYY',
      containerClass: 'theme-dark-blue',
      showWeekNumbers: false,
      maxDate: new Date()
    };

    this.dppConfig = {
      dateInputFormat: 'DD-MMM-YYYY',
      containerClass: 'theme-dark-blue',
      showWeekNumbers: false,
      maxDate: new Date(),
      minDate: new Date()
    };

    this.TrialBalanceForm = this.fb.group({
      fromdate:  [today],
      todate:    [today],
      grouptype: ['BETWEEN']
    });

    this.groupType    = 'BETWEEN';
    this.showhideason = true;
    this.betweendates = 'Between';
    this.betweenfrom  = this.datePipe.transform(today, 'dd-MMM-yyyy') ?? '';
    this.betweento    = this.datePipe.transform(today, 'dd-MMM-yyyy') ?? '';
    const initialFrom = this.TrialBalanceForm.get('fromdate')?.value;
  this.toDateMinDate = initialFrom ?? null;

  this.TrialBalanceForm.get('fromdate')?.valueChanges.subscribe((val: Date | null) => {
    this.toDateMinDate = val ?? null;
    const toDate = this.TrialBalanceForm.get('todate')?.value;
    if (toDate && val && toDate < val) {
      this.TrialBalanceForm.get('todate')?.setValue(null as unknown as Date);
    }
  });
  }

  // ── Checkbox Handlers ───────────────────────────────────────
  checkboxChecked(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checked) {
      this.groupType    = 'ASON';
      this.showhideason = false;
      this.betweendates = 'As On';
      this.betweento    = '';
    } else {
      this.groupType    = 'BETWEEN';
      this.showhideason = true;
      this.betweendates = 'Between';
    }

    this.trialBalanceList.set([]);
    this.showhidetable.set(false);
    this.totalDebit.set(0);
    this.totalCredit.set(0);
    this.difference.set(0);
    this.trialBalanceDiff.set(false);

    this.TrialBalanceForm.patchValue({
      grouptype: this.groupType,
      fromdate:  today,
      todate:    today
    });
  }

  withGrouping(event: Event): void {
    this.withgrouping = (event.target as HTMLInputElement).checked;
  }

  // ── Date Change Handlers ────────────────────────────────────
  onFromDateChange(event: Date): void {
    this.dppConfig = { ...this.dppConfig, minDate: event };
  }

  onToDateChange(event: Date): void {
    this.dpConfig = { ...this.dpConfig, maxDate: event };
  }

  // ── Report Generation ───────────────────────────────────────
  generateReport(): void {
    this.savebutton.set('Processing...');

    const fromdate = this.TrialBalanceForm.value.fromdate;
    const todate   = this.groupType === 'ASON'
      ? fromdate
      : this.TrialBalanceForm.value.todate;

    this.betweenfrom = this.datePipe.transform(fromdate, 'dd-MMM-yyyy') ?? '';
    this.betweento   = this.groupType === 'ASON'
      ? ''
      : (this.datePipe.transform(todate, 'dd-MMM-yyyy') ?? '');

    this.getTrialBalance(fromdate, todate, this.groupType);
  }

  private getTrialBalance(fromdate: Date, todate: Date, grouptype: string): void {
    const fdate = this.commonService.getFormatDateNormal(fromdate) ?? '';
    const tdate = this.commonService.getFormatDateNormal(todate)   ?? '';

    this.accountingService
      .GetTrialBalanceData(
        fdate, tdate, grouptype,
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode(),
        this.commonService.getschemaname()
      )
      .subscribe({
        next: (res: any[]) => {
          const filtered = res.filter(
            x => !(x.pdebitamount === 0 && x.pcreditamount === 0)
          );

          this.trialBalanceRaw = [...filtered];
          this.trialBalanceList.set([...filtered]);

          if (filtered.length > 0) {
            this.calculateTotals();
            this.showhidetable.set(true);
            this.dataisempty.set(false);
          } else {
            this.totalDebit.set(0);
            this.totalCredit.set(0);
            this.showhidetable.set(false);
            this.dataisempty.set(true);
          }

          this.savebutton.set('Generate Report');
        },
        error: (err) => {
          this.commonService.showErrorMessage(err);
          this.savebutton.set('Generate Report');
        }
      });
  }

  // ── Totals ──────────────────────────────────────────────────
  private calculateTotals(): void {
    const debit  = this.trialBalanceList().reduce((sum, c) => sum + c.pdebitamount,  0);
    const credit = this.trialBalanceList().reduce((sum, c) => sum + c.pcreditamount, 0);

    this.totalDebit.set(debit);
    this.totalCredit.set(credit);

    if (Math.round(debit * 100) !== Math.round(credit * 100)) {
      this.trialBalanceDiff.set(true);
      this.difference.set(Math.abs(debit - credit));
    } else {
      this.trialBalanceDiff.set(false);
      this.difference.set(0);
    }
  }

  // ── Export ──────────────────────────────────────────────────
  export(): void {
    const details        = this.commonService._getCompanyDetails();
    const companyName    = details?.companyName         ?? '';
    const registrationAddr = details?.registrationAddress ?? '';
    const companyCIN     = details?.cinNumber           ?? '';
    const companyBranch  = details?.branchName          ?? '';

    const dateInfo = this.betweendates === 'Between'
      ? `Between : ${this.betweenfrom} And ${this.betweento}`
      : `As on : ${this.betweenfrom}`;

    const headerRows = [
      { Type: companyName },
      { Type: registrationAddr },
      { Type: `CIN : ${companyCIN}` },
      { Type: '' },
      { Type: dateInfo, Particulars: `Branch : ${companyBranch}` },
      {}
    ];

    const rows = this.trialBalanceList().map(element => ({
      Type:        element.pparentname,
      Particulars: element.paccountname,
      Debit:       element.pdebitamount  !== 0 ? this.commonService.currencyformat(element.pdebitamount)  : '',
      Credit:      element.pcreditamount !== 0 ? this.commonService.currencyformat(element.pcreditamount) : ''
    }));

    this.commonService.exportAsExcelFile([...headerRows, ...rows], 'TrialBalance');
  }

  // ── PDF / Print ─────────────────────────────────────────────
  pdfOrprint(printOrpdf: 'Print' | 'Pdf'): void {
    if (this.withgrouping) {
      this.generateGroupedReport(printOrpdf);
    } else {
      this.generateNormalReport(printOrpdf);
    }
  }

  private generateGroupedReport(printOrpdf: 'Print' | 'Pdf'): void {
    const rows: any[]    = [];
    const reportName     = 'Trial Balance';
    const gridHeaders    = ['Particulars', 'Debit', 'Credit'];
    const fromDate       = this.formatDate(this.TrialBalanceForm.controls['fromdate'].value);
    const toDate         = this.formatDate(this.TrialBalanceForm.controls['todate'].value);
    const colWidthHeight = {
      paccountname:  { cellWidth: 'auto' },
      pdebitamount:  { cellWidth: 'auto' },
      pcreditamount: { cellWidth: 'auto' }
    };

    const returnGridData = this.commonService._groupwiseSummaryExportDataTrialBalance(
      this.trialBalanceList(), 'pparentname', 'pdebitamount', 'pcreditamount'
    );

    returnGridData?.forEach((element: any) => {
      const debitAmt  = this.formatAmount(element?.pdebitamount);
      const creditAmt = this.formatAmount(element?.pcreditamount);

      if (element.isGroupFooter) {
        rows.push([
          { content: 'Total :', colSpan: 1, styles: { fontStyle: 'bold', halign: 'right', fillColor: [255, 255, 179] } },
          { content: debitAmt,              styles: { fontStyle: 'bold', halign: 'right', fillColor: [255, 255, 179] } },
          { content: creditAmt,             styles: { fontStyle: 'bold', halign: 'right', fillColor: [255, 255, 179] } }
        ]);
        return;
      }

      if (element?.group !== undefined) {
        rows.push([{
          content: element.group?.content ?? element.group,
          colSpan: 3,
          styles: { fontStyle: 'bold', fillColor: [220, 220, 220], textColor: [0, 0, 0], halign: 'left' }
        }]);
      } else {
        rows.push([element.paccountname, debitAmt, creditAmt]);
      }
    });

    this.pushTotals(rows);
    this.commonService._downloadTrialBalanceReportsPdf(
      reportName, rows, gridHeaders, colWidthHeight, 'a4',
      this.getGroupTypeLabel(), fromDate, toDate, printOrpdf, this.getGridTotals()
    );
  }

  private generateNormalReport(printOrpdf: 'Print' | 'Pdf'): void {
    const rows: any[]    = [];
    const reportName     = 'Trial Balance';
    const gridHeaders    = ['Particulars', 'Debit', 'Credit'];
    const fromDate       = this.formatDate(this.TrialBalanceForm.controls['fromdate'].value);
    const toDate         = this.formatDate(this.TrialBalanceForm.controls['todate'].value);
    const colWidthHeight = {
      paccountname:  { cellWidth: 'auto' },
      pdebitamount:  { cellWidth: 'auto' },
      pcreditamount: { cellWidth: 'auto' }
    };

    this.trialBalanceList()?.forEach((element: any) => {
      rows.push([
        element?.paccountname,
        this.formatAmount(element?.pdebitamount),
        this.formatAmount(element?.pcreditamount)
      ]);
    });

    this.pushTotals(rows);
    this.commonService._downloadTrialBalanceReportsPdf(
      reportName, rows, gridHeaders, colWidthHeight, 'a4',
      this.getGroupTypeLabel(), fromDate, toDate, printOrpdf, this.getGridTotals()
    );
  }

  // ── Helpers ─────────────────────────────────────────────────
  private formatDate(dateVal: any): string {
    if (!dateVal) return '';
    const date = (dateVal?.year && dateVal?.month && dateVal?.day)
      ? new Date(dateVal.year, dateVal.month - 1, dateVal.day)
      : new Date(dateVal);
    if (isNaN(date.getTime())) return '';
    const day   = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    return `${day}-${month}-${date.getFullYear()}`;
  }

  private formatAmount(value: number | null | undefined): string {
    if (!value) return '';
    let amount  = this.commonService.currencyFormat(parseFloat(value.toString()));
    amount      = this.commonService.convertAmountToPdfFormat(amount);
    const decimal = amount.split('.')[1];
    if (!decimal)              return amount + '.00';
    if (decimal.length === 1)  return amount + '0';
    return amount;
  }

  private getGroupTypeLabel(): string {
    return this.groupType === 'BETWEEN' ? 'Between' : 'As On';
  }

  private getGridTotals(): any {
    return {
      debittotal:  this.formatAmount(this.totalDebit()),
      credittotal: this.formatAmount(this.totalCredit())
    };
  }

  private pushTotals(rows: any[]): void {
    const totals = this.getGridTotals();
    rows.push(['Total', totals.debittotal, totals.credittotal]);
  }

  // ── Sorting ─────────────────────────────────────────────────
  sortBy(column: string): void {
    this.sortDirection = this.sortColumn === column
      ? (this.sortDirection === 1 ? -1 : 1)
      : 1;
    this.sortColumn = column;
    this.applySort();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '&#8597;';
    return this.sortDirection === 1 ? '&#8593;' : '&#8595;';
  }

  private applySort(): void {
    const col = this.sortColumn;
    const dir = this.sortDirection;

    this.trialBalanceList.set(
      [...this.trialBalanceRaw].sort((a, b) => {
        const aVal = a[col];
        const bVal = b[col];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === 'string') return aVal.localeCompare(bVal) * dir;
        return (aVal - bVal) * dir;
      })
    );
  }
}
