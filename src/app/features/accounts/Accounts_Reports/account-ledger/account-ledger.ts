
import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal, computed, linkedSignal, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

import { TableModule } from 'primeng/table';
import { Companydetails } from '../../../common/company-details/companydetails/companydetails';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { CommonService } from '../../../../core/services/Common/common.service';
import { DatePickerModule } from 'primeng/datepicker';


// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface LedgerAccount {
  pledgerid: number;
  pledgername: string;
  pAccounttype: string;
}

export interface SubLedgerAccount {
  psubledgerid: number;
  psubledgername: string;
  pledgerid: number;
}

export interface LedgerRow {
  ptransactiondate: string;
  ptransactionno: number | string;
  pparticulars: string;
  pdebitamount: number;
  pcreditamount: number;
  popeningbal: number;
  pBalanceType: string;
}

export type SortDirection = 1 | -1;

// ─── Date Range Validator ─────────────────────────────────────────────────────

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const from = group.get('fromDate')?.value;
  const to = group.get('toDate')?.value;
  if (from && to && new Date(from) > new Date(to)) {
    return { dateRangeInvalid: true };
  }
  return null;
}
@Component({
  selector: "app-account-ledger",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule, DatePickerModule, TableModule, Companydetails],
  templateUrl: "./account-ledger.html",
  styleUrl: "./account-ledger.css",
  providers: [DatePipe]
})

export class AccountLedger implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  // ── Services ──────────────────────────────────────────────────────────────
  private readonly fb = inject(FormBuilder);
  private readonly reportService = inject(AccountsReports);
  private readonly txnService = inject(AccountsTransactions);
  private readonly commonService = inject(CommonService);
  private readonly datePipe = inject(DatePipe);

  // ── State Signals ─────────────────────────────────────────────────────────
  readonly isLoading = signal(false);
  readonly showReport = signal(false);
  readonly submitted = signal(false);
  readonly isNarrationChecked = signal(false);
  readonly printedDate = signal(true);

  readonly ledgerList = signal<LedgerAccount[]>([]);
  readonly subLedgerList = signal<SubLedgerAccount[]>([]);
  readonly rawData = signal<LedgerRow[]>([]);

  readonly ledgerName = signal('');
  readonly subLedgerName = signal('');

  readonly sortColumn = signal<string>('');
  readonly sortDirection = signal<SortDirection>(1);

  readonly currencySymbol = signal('₹');
  readonly pageSize = signal(10);
  toDateMinDate: Date | null = null;
  

  // ── Computed Signals ──────────────────────────────────────────────────────

  /** Grid rows sorted within their date groups */
  readonly gridView = computed<LedgerRow[]>(() => {
    const col = this.sortColumn();
    const dir = this.sortDirection();
    const data = this.rawData();

    if (!col) return data;

    const groups = new Map<string, LedgerRow[]>();
    for (const row of data) {
      const key = row.ptransactiondate;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    groups.forEach(rows =>
      rows.sort((a, b) => {
        const aVal = (a as any)[col];
        const bVal = (b as any)[col];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === 'string') return aVal.localeCompare(bVal) * dir;
        return (aVal - bVal) * dir;
      })
    );

    return Array.from(groups.values()).flat();
  });

  readonly totalDebit = computed(() =>
    this.gridView().reduce((s, r) => s + (r.pdebitamount || 0), 0)
  );

  readonly totalCredit = computed(() =>
    this.gridView().reduce((s, r) => s + (r.pcreditamount || 0), 0)
  );

  readonly reportTitle = computed(() => {
    const sub = this.subLedgerName();
    return sub
      ? `${this.ledgerName()} / ${sub}`
      : this.ledgerName();
  });

  // ── Form ──────────────────────────────────────────────────────────────────
  form!: FormGroup;
  readonly today = new Date();

  dpConfig: any = {};
  dpConfig1: any = {};

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.initDatepickers();
    this.initForm();
    this.loadLedgers();
    const initialFrom = this.form.get('fromDate')?.value;
  this.toDateMinDate = initialFrom ?? null;

  this.form.get('fromDate')?.valueChanges.subscribe((val: Date | null) => {
    this.toDateMinDate = val ?? null;
    const toDate = this.form.get('toDate')?.value;
    if (toDate && val && toDate < val) {
      this.form.get('toDate')?.setValue(null as unknown as Date);
    }
  });
  }

  private initDatepickers(): void {
    this.dpConfig = {
      dateInputFormat: 'DD-MMM-YYYY',
      containerClass: 'theme-dark-blue',
      showWeekNumbers: false,
      maxDate: this.today
    };
    this.dpConfig1 = {
      dateInputFormat: 'DD-MMM-YYYY',
      containerClass: 'theme-dark-blue',
      showWeekNumbers: false,
      maxDate: this.today
    };
  }

  private initForm(): void {
    this.form = this.fb.group(
      {
        pledgerid: [null, Validators.required],
        psubledgerid: [null],
        fromDate: [this.today, Validators.required],
        toDate: [this.today, Validators.required]
      },
      { validators: dateRangeValidator }
    );
  }

  // ── Data Loading ──────────────────────────────────────────────────────────

  private loadLedgers(): void {
    this.reportService
      .GetLedgerAccountList(
        'ACCOUNT LEDGER',
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode(),
        this.commonService.getschemaname()
      )
      .subscribe({
        next: res => this.ledgerList.set(res ?? []),
        error: err => this.commonService.showErrorMessage(err)
      });
  }

  onLedgerChange(event: LedgerAccount | null): void {
    this.form.get('psubledgerid')?.reset();
    this.subLedgerList.set([]);

    const ledgerId = event?.pledgerid;
    if (!ledgerId) return;

    this.txnService
      .GetSubLedgerData(
        ledgerId,
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getbranchname(),
        this.commonService.getBranchCode(),
        this.commonService.getschemaname()
      )
      .subscribe({
        next: res => this.subLedgerList.set(res ?? []),
        error: err => this.commonService.showErrorMessage(err)
      });
  }

  // ── Report Generation ─────────────────────────────────────────────────────

  generateReport(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { pledgerid, psubledgerid, fromDate, toDate } = this.form.value;

    const selectedLedger = this.ledgerList().find(x => x.pledgerid === pledgerid);
    this.ledgerName.set(selectedLedger?.pledgername ?? '');

    const selectedSub = this.subLedgerList().find(x => x.psubledgerid === psubledgerid);
    this.subLedgerName.set(selectedSub?.psubledgername ?? '');

    this.isLoading.set(true);

    const formattedFrom = this.commonService.getFormatDateGlobal(fromDate) ?? '';
    const formattedTo = this.commonService.getFormatDateGlobal(toDate) ?? '';

    this.reportService
      .GetLedgerReport(
        formattedFrom,
        formattedTo,
        pledgerid,
        psubledgerid || 0,
        this.commonService.getbranchname(),
        this.commonService.getschemaname(),
        this.commonService.getBranchCode(),
        this.commonService.getCompanyCode()
      )
      .subscribe({
        next: res => {
          this.rawData.set(res ?? []);
          this.showReport.set(true);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
  }

  // ── Datepicker Sync ───────────────────────────────────────────────────────

  onFromDateChange(date: Date): void {
    this.dpConfig1 = { ...this.dpConfig1, minDate: date };
  }

  onToDateChange(date: Date): void {
    this.dpConfig = { ...this.dpConfig, maxDate: date };
  }

  // ── Sorting ───────────────────────────────────────────────────────────────

  sortBy(column: string): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update(d => (d === 1 ? -1 : 1));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set(1);
    }
  }

  getSortIcon(column: string): string {
    if (this.sortColumn() !== column) return '&#8597;';
    return this.sortDirection() === 1 ? '&#8593;' : '&#8595;';
  }

  // ── Export ────────────────────────────────────────────────────────────────

  exportToExcel(): void {
    const rows = this.gridView().map(x => ({
      'Transaction Date': this.datePipe.transform(x.ptransactiondate, 'dd-MMM-yyyy'),
      'Transaction No': x.ptransactionno,
      'Particulars': x.pparticulars,
      'Debit': x.pdebitamount,
      'Credit': x.pcreditamount,
      'Balance': x.popeningbal
    }));
    this.commonService.exportAsExcelFile(rows, 'Account_Ledger');
  }

  pdfOrPrint(mode: 'Print' | 'Pdf'): void {
    const { form, gridView, isNarrationChecked, ledgerName, subLedgerName } = this;

    const reportName = 'Account Ledger';
    const subReportName = subLedgerName()
      ? `${ledgerName()} (${subLedgerName()})`
      : ledgerName();

    const gridHeaders = ['Transaction No.', 'Particulars', 'Debit', 'Credit', 'Balance'];

    const colWidthHeight = {
      ptransactiondate: { cellWidth: 'auto' },
      ptransactionno: { cellWidth: 'auto' },
      pparticulars: { cellWidth: 25 },
      pdebitamount: { cellWidth: 'auto' },
      pcreditamount: { cellWidth: 'auto' },
      popeningbal: { cellWidth: 'auto' }
    };

    const safeFloat = (v: any) => isNaN(parseFloat(v)) ? 0 : parseFloat(v);

    const groupedData = this.commonService._getGroupingGridExportData(
      gridView(), 'ptransactiondate', true
    );

    const rows = groupedData.map((el: any) => {
      const { ptransactionno, pparticulars, pdebitamount, pcreditamount, popeningbal, pBalanceType, group } = el;
      const bal = this.commonService.convertAmountToPdfFormat(safeFloat(popeningbal)) + ` ${pBalanceType}`;
      const debit = safeFloat(pdebitamount) !== 0 ? this.commonService.convertAmountToPdfFormat(safeFloat(pdebitamount)) : '';
      const credit = safeFloat(pcreditamount) !== 0 ? this.commonService.convertAmountToPdfFormat(safeFloat(pcreditamount)) : '';

      return group !== undefined
        ? [{ ...group, content: this.formatDate(group.content) }, ptransactionno, pparticulars, debit, credit, bal]
        : [ptransactionno, pparticulars, debit, credit, bal];
    });

    const fromDate = this.formatDate(form.get('fromDate')?.value);
    const toDate = this.formatDate(form.get('toDate')?.value);

    this.reportService._AccountLedgerReportsPdfforpettycash(
      reportName, subReportName, rows, gridHeaders,
      colWidthHeight, 'a4', 'Between', fromDate, toDate,
      mode, isNarrationChecked()
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatDate(date: Date | string | null): string {
    if (!date) return '';
    if (typeof date === 'string') {
    const [day, month, year] = date.split('/');
    date = new Date(+year, +month - 1, +day);
  }
    return this.datePipe.transform(date, 'dd-MMM-yyyy') ?? '';
  }

  onNarrationChange(event: Event): void {
    this.isNarrationChecked.set((event.target as HTMLInputElement).checked);
  }

  fieldInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.touched && ctrl?.invalid);
  }
}
