import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';

import { TableModule } from 'primeng/table';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NgSelectModule } from '@ng-select/ng-select';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { Companydetails } from '../../../common/company-details/companydetails/companydetails';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-bank-book',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Companydetails,
    DatePickerModule,
    TableModule,
    ReactiveFormsModule,
    NgSelectModule
  ],
  templateUrl: './bank-book.html',
  styleUrl: './bank-book.css',
  providers: [DatePipe]
})
export class BankBook implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  // ── DI ─────────────────────────────────────────────────────────────────────
  private fb                          = inject(FormBuilder);
  private router                      = inject(Router);
  private datePipe                    = inject(DatePipe);
  private commonService               = inject(CommonService);
  private bankBookService             = inject(AccountsReports);
  private reportService               = inject(AccountsReports);
  private destroyRef                  = inject(DestroyRef);
  private accountingTransactionsService = inject(AccountsTransactions);

  // ── Signals ─────────────────────────────────────────────────────────────────
  readonly loading      = signal(false);
  readonly showReport   = signal(false);
  readonly bankData     = signal<any[]>([]);
  readonly gridView     = signal<any[]>([]);
  readonly bankName     = signal('');
  readonly StartDate    = signal<string | null>(null);
  readonly EndDate      = signal<string | null>(null);

  // ── State ───────────────────────────────────────────────────────────────────
  submitted       = false;
  currencySymbol  = '₹';
  printedDate     = true;
  saveButton      = 'Generate Report';
  sortColumn      = '';
  sortDirection: 1 | -1 = 1;
  expandedRows: Record<string, boolean> = {};
toDateMinDate: Date | null = null;
  private rawData: any[] = [];

  pageCriteria = new PageCriteria();
  today = new Date(new Date().setHours(0, 0, 0, 0));

  // ── Form ────────────────────────────────────────────────────────────────────
  bankBookForm = this.fb.nonNullable.group(
    {
      fromDate: [this.today, Validators.required],
      toDate:   [this.today, Validators.required],
      pbankname: ['',        Validators.required]
    },
    { validators: this.dateRangeValidator() }
  );

  get f() { return this.bankBookForm.controls; }

  // ── Datepicker configs ───────────────────────────────────────────────────────
  dpConfig: any = {
    dateInputFormat:  'DD-MMM-YYYY',
    containerClass:   'theme-dark-blue',
    showWeekNumbers:  false,
    maxDate:          new Date()
  };

  dpConfig1: any = {
    dateInputFormat:  'DD-MMM-YYYY',
    containerClass:   'theme-dark-blue',
    showWeekNumbers:  false,
    maxDate:          new Date()
  };

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadBankNames();
    const initialFrom = this.bankBookForm.get('fromDate')?.value;
  this.toDateMinDate = initialFrom ?? null;

  this.bankBookForm.get('fromDate')?.valueChanges.subscribe((val: Date | null) => {
    this.toDateMinDate = val ?? null;
    const toDate = this.bankBookForm.get('toDate')?.value;
    if (toDate && val && toDate < val) {
      this.bankBookForm.get('toDate')?.setValue(null as unknown as Date);
    }
  });
  }

  // ── Validators ───────────────────────────────────────────────────────────────
  private dateRangeValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const from = group.get('fromDate')?.value;
      const to   = group.get('toDate')?.value;
      if (from && to && new Date(from) > new Date(to)) {
        return { dateRangeInvalid: true };
      }
      return null;
    };
  }

  // ── Datepicker change handlers ───────────────────────────────────────────────
  onFromDateChange(event: Date): void {
    this.dpConfig1 = { ...this.dpConfig1, minDate: event };
  }

  onToDateChange(event: Date): void {
    this.dpConfig = { ...this.dpConfig, maxDate: event };
  }

  // ── Bank name change ─────────────────────────────────────────────────────────
  onBankChange(selectedValue: any): void {
    const selected = this.bankData().find((b: any) => b.bankAccountId === selectedValue);
    this.bankName.set(selected?.bankName ?? '');
  }

  // ── Load bank names ──────────────────────────────────────────────────────────
  loadBankNames(): void {
    this.bankBookService
      .GetBankNames(
        this.commonService.getschemaname(),
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .subscribe({
        next: (res: any) => this.bankData.set(res),
        error: (err: any) => {
          console.error('ERROR:', err);
          alert('API Error');
        }
      });
  }

  // ── Generate report ──────────────────────────────────────────────────────────
  getBankBookReports(): void {
    this.submitted = true;

    if (this.bankBookForm.invalid) {
      this.bankBookForm.markAllAsTouched();
      return;
    }

    if (this.bankBookForm.errors?.['dateRangeInvalid']) {
      alert('From Date should not be greater than To Date');
      return;
    }

    const { fromDate, toDate, pbankname = '' } = this.bankBookForm.value;

    const selected = this.bankData().find(b => b.bankAccountId == this.f['pbankname'].value);
    this.bankName.set(selected?.bankName ?? '');

    this.StartDate.set(this.datePipe.transform(fromDate, 'dd-MMM-yyyy'));
    this.EndDate.set(this.datePipe.transform(toDate,   'dd-MMM-yyyy'));

    this.loading.set(true);
    this.saveButton = 'Processing';

    const from = this.commonService.getFormatDateNormal(fromDate) ?? '';
    const to   = this.commonService.getFormatDateNormal(toDate)   ?? '';

    this.bankBookService
      .GetBankBookReportbyDates(
        from, to, pbankname,
        this.commonService.getschemaname(),
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.rawData = [...res];
          this.gridView.set(res);
          this.showReport.set(true);
          this.loading.set(false);
          this.saveButton = 'Generate Report';
        },
        error: err => {
          this.commonService.showErrorMessage(err);
          this.loading.set(false);
          this.saveButton = 'Generate Report';
        }
      });
  }

  // ── PDF / Print ──────────────────────────────────────────────────────────────
  pdfOrPrint(type: 'Pdf' | 'Print'): void {
    const { fromDate, toDate } = this.bankBookForm.value;

    const fmt = (dateVal: any): string => {
      if (!dateVal) return '';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      const day   = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      return `${day}-${month}-${d.getFullYear()}`;
    };

    const from = fmt(fromDate);
    const to   = fmt(toDate);

    const rows: any[] = [];
    let lastGroup = '';

    this.gridView().forEach(item => {
      const groupLabel = fmt(item.ptransactiondate);

      if (groupLabel !== lastGroup) {
        lastGroup = groupLabel;
        rows.push({ isGroupHeader: true, groupLabel });
      }

      const debitamt  = item.pdebitamount  ? this.commonService.convertAmountToPdfFormat(item.pdebitamount)  : '';
      const creditamt = item.pcreditamount ? this.commonService.convertAmountToPdfFormat(item.pcreditamount) : '';
      const balance   = item.popeningbal   ? `${this.commonService.convertAmountToPdfFormat(item.popeningbal)}  ${item.pBalanceType}` : '';

      rows.push({
        transactionNo: item.ptransactionno !== 0 ? item.ptransactionno : '--NA--',
        particulars:   item.pparticulars,
        narration:     item.pdescription,
        receipts:      debitamt,
        payments:      creditamt,
        balance
      });
    });

    const gridheaders = [
      { header: 'Transaction No.', field: 'transactionNo' },
      { header: 'Particulars',     field: 'particulars'   },
      { header: 'Narration',       field: 'narration'     },
      { header: 'Receipts',        field: 'receipts'      },
      { header: 'Payments',        field: 'payments'      },
      { header: 'Balance',         field: 'balance'       }
    ];

    this.reportService._BankBookReportsPdf(
      'Bank Book', rows, gridheaders, {}, 'landscape',
      'Between', from, to, type, this.bankName()
    );
  }

  // ── Excel export ─────────────────────────────────────────────────────────────
  export(): void {
    const rows = this.gridView().map(item => ({
      'Transaction Date': this.datePipe.transform(item.ptransactiondate, 'dd-MMM-yyyy'),
      'Transaction No.':  item.ptransactionno,
      'Particulars':      item.pparticulars,
      'Narration':        item.pdescription,
      'Receipts':         item.pdebitamount,
      'Payments':         item.pcreditamount,
      'Balance':          item.popeningbal
    }));

    this.commonService.exportAsExcelFile(rows, 'BankBook');
  }

  // ── Row expand ────────────────────────────────────────────────────────────────
  toggleRow(row: any): void {
    const key = row.ptransactionno;
    this.expandedRows[key] = !this.expandedRows[key];

    if (this.expandedRows[key] && !row.details) {
      this.reportService
        .GetTransTypeDetails(
          row.ptransactionno,
          this.commonService.getbranchname(),
          this.commonService.getschemaname(),
          this.commonService.getCompanyCode(),
          this.commonService.getBranchCode()
        )
        .subscribe((res: any) => (row.details = res));
    }
  }

  // ── Sort ─────────────────────────────────────────────────────────────────────
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
    const { sortColumn: col, sortDirection: dir } = this;

    const groups = new Map<string, any[]>();
    for (const row of this.rawData) {
      const key = row.ptransactiondate;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    groups.forEach(rows =>
      rows.sort((a, b) => {
        const aVal = a[col], bVal = b[col];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        return typeof aVal === 'string'
          ? aVal.localeCompare(bVal) * dir
          : (aVal - bVal) * dir;
      })
    );

    this.gridView.set(Array.from(groups.values()).flat());
  }
}
