import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TableModule } from 'primeng/table';
import { Companydetails } from '../../../common/company-details/companydetails/companydetails';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-comparison-tb',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    DatePickerModule,
    TableModule,
    Companydetails
  ],
  providers: [DatePipe],
  templateUrl: './comparison-tb.html',
  styleUrl: './comparison-tb.css'
})
export class ComparisonTb implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  // ── Injected Services ───────────────────────────────────────
  private readonly fb             = inject(FormBuilder);
  private readonly commonService  = inject(CommonService);
  private readonly reportService  = inject(AccountsReports);
  private readonly datePipe       = inject(DatePipe);
  private readonly destroyRef     = inject(DestroyRef);

  // ── Signals ─────────────────────────────────────────────────
  gridData    = signal<any[]>([]);
  showHide    = signal(true);
  loading     = signal(false);
  savebutton  = signal('Generate Report');

  // ── Plain State ─────────────────────────────────────────────
  ComparisionTBForm!: FormGroup;
  submitted    = false;
  printedDate  = true;
  hideprint    = true;
  difference   = 0;
  currencysymbol: string;

  fromdate: string | null = null;
  todate:   string | null = null;

  totaldebitamount1  = 0;
  totalcreditamount1 = 0;
  totaldebitamount2  = 0;
  totalcreditamount2 = 0;
  totaldebitamount3  = 0;
  totalcreditamount3 = 0;

  sortColumn    = '';
  sortDirection: 1 | -1 = 1;
  pageCriteria  = new PageCriteria();

  private rawData: any[] = [];

  dpConfig:  any = {};
  dpConfig1: any = {};

  @ViewChild('myTable') table: any;
  toDateMinDate: Date | null = null;

  constructor() {
    this.currencysymbol = String(
      this.commonService.datePickerPropertiesSetup('currencysymbol')
    );
  }

  // ── Lifecycle ───────────────────────────────────────────────
  ngOnInit(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.dpConfig = {
      dateInputFormat: 'DD-MMM-YYYY',
      containerClass: 'theme-dark-blue',
      showWeekNumbers: false,
      maxDate: today
    };

    this.dpConfig1 = {
      dateInputFormat: 'DD-MMM-YYYY',
      containerClass: String(
        this.commonService.datePickerPropertiesSetup('containerClass')
      ),
      showWeekNumbers: false,
      minDate: today,
      maxDate: today
    };

    this.setPageModel();
    this.buildForm(today);
    const initialFrom = this.ComparisionTBForm.get('fromDate')?.value;
  this.toDateMinDate = initialFrom ?? null;

  this.ComparisionTBForm.get('fromDate')?.valueChanges.subscribe((val: Date | null) => {
    this.toDateMinDate = val ?? null;
    const toDate = this.ComparisionTBForm.get('toDate')?.value;
    if (toDate && val && toDate < val) {
      this.ComparisionTBForm.get('toDate')?.setValue(null as unknown as Date);
    }
  });
  }

  // ── Form ────────────────────────────────────────────────────
  private buildForm(today: Date): void {
    this.ComparisionTBForm = this.fb.group(
      {
        fromDate: [today, Validators.required],
        toDate:   [today, Validators.required],
        grouping: [false]
      },
      { validators: this.dateRangeValidator() }
    );
  }

  private dateRangeValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const from = group.get('fromDate')?.value;
      const to   = group.get('toDate')?.value;
      if (!from || !to) return null;
      return new Date(from).setHours(0, 0, 0, 0) > new Date(to).setHours(0, 0, 0, 0)
        ? { dateRangeInvalid: true }
        : null;
    };
  }

  get f() { return this.ComparisionTBForm.controls; }

  // ── Page Model ──────────────────────────────────────────────
  private setPageModel(): void {
    this.pageCriteria.pageSize         = this.commonService.pageSize;
    this.pageCriteria.offset           = 0;
    this.pageCriteria.pageNumber       = 1;
    this.pageCriteria.footerPageHeight = 50;
  }

  // ── Date Change Handlers ────────────────────────────────────
  onFromDateChange(event: Date): void {
    this.dpConfig1 = { ...this.dpConfig1, minDate: event };
    this.ComparisionTBForm.controls['toDate'].setValue(new Date());
  }

  onToDateChange(event: Date): void {
    this.dpConfig1 = { ...this.dpConfig1, minDate: event };
  }

  onFromDateBound(event: Date): void {
    this.dpConfig = { ...this.dpConfig, maxDate: event };
  }

  // ── Checkbox ────────────────────────────────────────────────
  checkbox(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    console.log('Grouping:', checked);
  }

  // ── Generate ────────────────────────────────────────────────
  show(): void {
    this.ComparisionTBForm.value.grouping
      ? this.crystalreport()
      : this.getComparisionTBReports();
  }

  private crystalreport(): void {
    const fromDate    = this.commonService.getFormatDateNormal(this.ComparisionTBForm.value.fromDate);
    const toDate      = this.commonService.getFormatDateNormal(this.ComparisionTBForm.value.toDate);
    const BranchSchema = this.commonService.getschemaname();
    // crystal report logic here
  }

  private getComparisionTBReports(): void {
    this.ComparisionTBForm.markAllAsTouched();
    this.submitted = true;

    if (this.ComparisionTBForm.errors?.['dateRangeInvalid']) {
      alert('From Date should not be greater than To Date');
      return;
    }

    if (this.ComparisionTBForm.invalid) return;

    this.loading.set(true);
    this.savebutton.set('Processing...');
    this.updateFormattedDates();

    const fromdate = this.commonService.getFormatDateNormal(this.ComparisionTBForm.value.fromDate) ?? '';
    const todate   = this.commonService.getFormatDateNormal(this.ComparisionTBForm.value.toDate)   ?? '';

    this.reportService
      .GetComparisionTB(
        fromdate, todate,
        this.commonService.getbranchname(),
        this.commonService.getschemaname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const data = res || [];
          this.gridData.set(data);
          this.rawData = [...data];
          this.showHide.set(false);
          this.loading.set(false);
          this.savebutton.set('Generate Report');
          this.calculateTotals();
        },
        error: (err) => {
          this.commonService.showErrorMessage(err);
          this.loading.set(false);
          this.savebutton.set('Generate Report');
        }
      });
  }

  private updateFormattedDates(): void {
    this.fromdate = this.datePipe.transform(this.f['fromDate'].value, 'dd-MMM-yyyy');
    this.todate   = this.datePipe.transform(this.f['toDate'].value,   'dd-MMM-yyyy');
  }

  // ── Totals ──────────────────────────────────────────────────
  private calculateTotals(): void {
    const sum = (field: string) =>
      this.gridData().reduce((a, b) => a + (+b[field] || 0), 0);

    this.totaldebitamount1  = sum('debitamount1');
    this.totalcreditamount1 = sum('creditamount1');
    this.totaldebitamount2  = sum('debitamount2');
    this.totalcreditamount2 = sum('creditamount2');
    this.totaldebitamount3  = sum('debittotal');
    this.totalcreditamount3 = sum('credittotal');

    this.difference = Math.abs(this.totaldebitamount1 - this.totalcreditamount1);
    this.hideprint  = this.difference === 0;
  }

  // ── Export ──────────────────────────────────────────────────
  export(): void {
    const rows = this.gridData().map(e => ({
      'Comparision Name': e.parentaccountname,
      'Particulars':      e.accountname,
      'Debit':            e.debitamount1,
      'Credit':           e.creditamount1,
      'Debit 2':          e.debitamount2,
      'Credit 2':         e.creditamount2,
      'Debit Total':      e.debittotal,
      'Credit Total':     e.credittotal
    }));

    this.commonService.exportAsExcelFile(rows, 'Comparision_tb_dummy');
  }

  // ── PDF / Print ─────────────────────────────────────────────
  pdfOrprint(printorpdf: 'Pdf' | 'Print'): void {
    if (this.gridData().length === 0) {
      this.commonService.showInfoMessage('No Data');
      return;
    }

    const rows: any[]    = [];
    const reportname     = 'Comparison Trial Balance';
    const gridheaders    = ['Particulars', 'Debit', 'Credit', 'Debit', 'Credit', 'Debit', 'Credit'];
    const fromDate       = this.formatDate(this.ComparisionTBForm.controls['fromDate'].value);
    const toDate         = this.formatDate(this.ComparisionTBForm.controls['toDate'].value);

    const colWidthHeight = {
      parentaccountname: { cellWidth: 'auto' },
      accountname:       { cellWidth: 'auto' },
      debitamount1:      { cellWidth: 'auto' },
      creditamount1:     { cellWidth: 'auto' },
      debitamount2:      { cellWidth: 'auto' },
      creditamount2:     { cellWidth: 'auto' },
      debittotal:        { cellWidth: 'auto' },
      credittotal:       { cellWidth: 'auto' }
    };

    const fmt = (val: any): string => {
      if (val === undefined || val === null || val === '' || val === 0) return '';
      return this.commonService.currencyFormat(parseFloat(val).toFixed(2));
    };

    const retungridData = this.commonService._groupwiseSummaryExportDataTB(
      this.gridData(), 'parentaccountname',
      'debitamount1', 'creditamount1',
      'debitamount2', 'creditamount2',
      'debittotal',   'credittotal',
      'Total', false
    );

    retungridData.forEach((element: any) => {
      if (element.isGroupHeader) {
        rows.push([element.group]);
        return;
      }

      if (element.isSubtotal) {
        rows.push([
          { content: element.accountname,        styles: { fontStyle: 'bold', halign: 'left',  fillColor: '#ffffb3' } },
          { content: fmt(element.debitamount1),  styles: { fontStyle: 'bold', halign: 'right', fillColor: '#ffffb3' } },
          { content: fmt(element.creditamount1), styles: { fontStyle: 'bold', halign: 'right', fillColor: '#ffffb3' } },
          { content: fmt(element.debitamount2),  styles: { fontStyle: 'bold', halign: 'right', fillColor: '#ffffb3' } },
          { content: fmt(element.creditamount2), styles: { fontStyle: 'bold', halign: 'right', fillColor: '#ffffb3' } },
          { content: fmt(element.debittotal),    styles: { fontStyle: 'bold', halign: 'right', fillColor: '#ffffb3' } },
          { content: fmt(element.credittotal),   styles: { fontStyle: 'bold', halign: 'right', fillColor: '#ffffb3' } }
        ]);
        return;
      }

      rows.push([
        element.accountname  ?? '',
        fmt(element.debitamount1),
        fmt(element.creditamount1),
        fmt(element.debitamount2),
        fmt(element.creditamount2),
        fmt(element.debittotal),
        fmt(element.credittotal)
      ]);
    });

    rows.push([
      { content: 'Grand Total',                                                styles: { fontStyle: 'bold', halign: 'left',  fillColor: '#ffd700' } },
      { content: this.commonService.currencyFormat(this.totaldebitamount1),   styles: { fontStyle: 'bold', halign: 'right', fillColor: '#ffd700' } },
      { content: this.commonService.currencyFormat(this.totalcreditamount1),  styles: { fontStyle: 'bold', halign: 'right', fillColor: '#ffd700' } },
      { content: this.commonService.currencyFormat(this.totaldebitamount2),   styles: { fontStyle: 'bold', halign: 'right', fillColor: '#ffd700' } },
      { content: this.commonService.currencyFormat(this.totalcreditamount2),  styles: { fontStyle: 'bold', halign: 'right', fillColor: '#ffd700' } },
      { content: this.commonService.currencyFormat(this.totaldebitamount3),   styles: { fontStyle: 'bold', halign: 'right', fillColor: '#ffd700' } },
      { content: this.commonService.currencyFormat(this.totalcreditamount3),  styles: { fontStyle: 'bold', halign: 'right', fillColor: '#ffd700' } }
    ]);

    this.reportService._ComparisionTBReportsPdf(
      reportname, rows, gridheaders, colWidthHeight,
      'landscape', 'Between', fromDate, toDate, printorpdf
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
      const key = row.pparentaccountName;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
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
