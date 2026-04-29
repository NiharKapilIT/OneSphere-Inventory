
import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NgSelectModule } from '@ng-select/ng-select';
import { TableModule } from 'primeng/table';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { DatePickerModule } from 'primeng/datepicker';


type BankType = 'CREDIT' | 'DEBIT';
type SortDir = 1 | -1;

interface BrsForm {
  fromDate: FormControl<Date | null>;
  toDate: FormControl<Date | null>;
  pbankname: FormControl<string | null>;
  branchschema: FormControl<string | null>;
  Bank: FormControl<string | null>;
}

@Component({
  selector: "app-brs-statements",
  standalone:true,
  imports: [CommonModule, ReactiveFormsModule, DatePickerModule, NgSelectModule, TableModule],
  templateUrl: "./brs-statements.html",
  styleUrl: "./brs-statements.css",
})

export class BrsStatements implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  // ── inject() replaces constructor DI ─────────────────────────────────
  private readonly fb = inject(FormBuilder);
  private readonly datePipe = inject(DatePipe);
  private readonly destroyRef = inject(DestroyRef);
  readonly _CommonService = inject(CommonService);
  private readonly bankBookSvc = inject(AccountsReports);

  // ── Signals ───────────────────────────────────────────────────────────
  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly saveButtonLabel = signal('Show');
  readonly isSaving = signal(false);

  readonly bankData = signal<any[]>([]);
  readonly gridData = signal<any[]>([]);
  readonly totalAmount = signal(0);

  readonly bankType = signal<BankType>('CREDIT');
  readonly bankCreditShow = computed(() => this.bankType() === 'CREDIT');
  readonly bankDebitShow = computed(() => this.bankType() === 'DEBIT');
  readonly reportName = computed(() =>
    this.bankType() === 'CREDIT' ? 'BANK CREDIT DETAILS' : 'BANK DEBIT DETAILS'
  );

  readonly sortColumn = signal('');
  readonly sortDirection = signal<SortDir>(1);

  // Computed sorted grid – no manual applySort() calls needed
  readonly sortedGrid = computed(() => {
    const col = this.sortColumn();
    const dir = this.sortDirection();
    if (!col) return this.gridData();
    return [...this.gridData()].sort((a, b) => {
      const aVal = a[col], bVal = b[col];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      return typeof aVal === 'string'
        ? aVal.localeCompare(bVal) * dir
        : (aVal - bVal) * dir;
    });
  });

  // ── Non-signal state ──────────────────────────────────────────────────
  private rawData: any[] = [];
  readonly currencySymbol: string;
  // readonly today = new Date();
  pageCriteria!: PageCriteria;
  selectedbank = '';
  startDate = '';
  endDate = '';
  dpConfig: any = {};
  dpConfig1: any = {};
  form!: FormGroup<BrsForm>;
  toDateMinDate: Date | null = null;
   today = new Date(new Date().setHours(0, 0, 0, 0));

  constructor() {
    this.currencySymbol = "₹";
    this.pageCriteria = new PageCriteria();
  }

  ngOnInit(): void {
    this.setPageModel();
    this.initDatePickers();
    this.buildForm();
    this.loadBankNames();
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

  // ── Form ──────────────────────────────────────────────────────────────
  private buildForm(): void {
    this.form = this.fb.group<BrsForm>(
      {
        fromDate: this.fb.control<Date | null>(this.today),
        toDate: this.fb.control<Date | null>(this.today),
        pbankname: this.fb.control<string | null>('', Validators.required),
        branchschema: this.fb.control<string | null>(null),
        Bank: this.fb.control<string>('CREDIT')
      },
      { validators: this.dateRangeValidator() }
    );
  }

  get f() { return this.form.controls; }

  private dateRangeValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const from = group.get('fromDate')?.value;
      const to = group.get('toDate')?.value;
      if (!from || !to) return null;
      const ft = new Date(from).setHours(0, 0, 0, 0);
      const tt = new Date(to).setHours(0, 0, 0, 0);
      return ft > tt ? { dateRangeInvalid: true } : null;
    };
  }

  // ── Date pickers ──────────────────────────────────────────────────────
  private initDatePickers(): void {
    const base: any = {
      dateInputFormat: 'DD-MMM-YYYY', containerClass: 'theme-dark-blue',
      showWeekNumbers: false, maxDate: new Date()
    };
    this.dpConfig = { ...base };
    this.dpConfig1 = { ...base, minDate: new Date() };
  }

  onFromDateChange(event: Date | null): void {
    if (event) this.dpConfig1 = { ...this.dpConfig1, minDate: event };
  }

  onToDateChange(event: Date | null): void {
    if (event) this.dpConfig = { ...this.dpConfig, maxDate: event };
  }

  // ── Bank data ─────────────────────────────────────────────────────────
  private loadBankNames(): void {
    this.bankBookSvc
      .GetBankNames(
        this._CommonService.getschemaname(), this._CommonService.getbranchname(),
        this._CommonService.getCompanyCode(), this._CommonService.getBranchCode()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any[]) => this.bankData.set(res),
        error: (err) => this._CommonService.showErrorMessage(err)
      });
  }

  onBankSelected(bank: any): void { this.selectedbank = bank?.bankName ?? ''; }

  // ── Bank type toggle ──────────────────────────────────────────────────
  onBankTypeChange(type: BankType): void {
    this.bankType.set(type);
    this.gridData.set([]);
    this.rawData = [];
    this.sortColumn.set('');
    this.sortDirection.set(1);
  }

  // ── Fetch ─────────────────────────────────────────────────────────────
  show(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    if (this.form.errors?.['dateRangeInvalid']) {
      alert('From Date should not be greater than To Date'); return;
    }

    this.isSaving.set(true);
    this.saveButtonLabel.set('Processing');

    const fromDate = this._CommonService.getFormatDateNormal(this.form.value.fromDate) ?? '';
    const toDate = this._CommonService.getFormatDateNormal(this.form.value.toDate) ?? '';
    const bankid = this.form.value.pbankname ?? '';
    const transtype = this.form.value.Bank ?? '';

    this.bankBookSvc
      .GetBrsReportBankDebitsBankCredits(
        fromDate, toDate, bankid, transtype,
        this._CommonService.getbranchname(), this._CommonService.getschemaname(),
        this._CommonService.getBranchCode(), this._CommonService.getCompanyCode()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any[]) => {
          const data = res || [];
          this.gridData.set(data);
          this.rawData = [...data];
          this.totalAmount.set(data.reduce((s, c) => s + parseFloat(c.ptotalamount || 0), 0));
          this.updatePagination();
          this.isSaving.set(false);
          this.saveButtonLabel.set('Show');
        },
        error: () => { this.isSaving.set(false); this.saveButtonLabel.set('Show'); }
      });
  }

  // ── Sort ──────────────────────────────────────────────────────────────
  sortBy(col: string): void {
    if (this.sortColumn() === col) {
      this.sortDirection.update(d => d === 1 ? -1 : 1);
    } else {
      this.sortColumn.set(col);
      this.sortDirection.set(1);
    }
  }

  getSortIcon(col: string): string {
    if (this.sortColumn() !== col) return '&#8597;';
    return this.sortDirection() === 1 ? '&#8593;' : '&#8595;';
  }

  // ── Pagination ────────────────────────────────────────────────────────
  private updatePagination(): void {
    this.pageCriteria.totalrows = this.gridData().length;
    this.pageCriteria.CurrentPage = 1;
    this.pageCriteria.offset = 0;
    this.pageCriteria.TotalPages = Math.ceil(this.pageCriteria.totalrows / this.pageCriteria.pageSize);
  }

  private setPageModel(): void {
    this.pageCriteria.pageSize = this._CommonService.pageSize;
    this.pageCriteria.offset = 0; this.pageCriteria.pageNumber = 1;
    this.pageCriteria.footerPageHeight = 50;
  }

  onPageChange(e: any): void {
    this.pageCriteria.offset = e.first / e.rows;
    this.pageCriteria.CurrentPage = this.pageCriteria.offset + 1;
  }

  // ── Date helpers ──────────────────────────────────────────────────────
  private formatToDDMMMYYYY(v: any): string {
    if (!v) return '';
    const d = v?.year && v?.month && v?.day
      ? new Date(v.year, v.month - 1, v.day) : new Date(v);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('en-US', { month: 'short' })}-${d.getFullYear()}`;
  }

  private safeDate(v: any): string {
    if (!v || v === '[object Object]') return '--NA--';
    const p = new Date(v);
    return isNaN(p.getTime()) ? '--NA--' : (this.datePipe.transform(p, 'dd-MMM-yyyy') ?? '--NA--');
  }

  private fromDb(ds: any): string {
    if (!ds) return '--NA--';
    const obj = this._CommonService.getDateObjectFromDataBase(ds);
    return obj ? this.formatToDDMMMYYYY(obj) || '--NA--' : '--NA--';
  }

  private resolveFormDates(): void {
    this.startDate = this.formatToDDMMMYYYY(this.f['fromDate'].value);
    this.endDate = this.formatToDDMMMYYYY(this.f['toDate'].value);
  }

  // ── PDF / Print ───────────────────────────────────────────────────────
  pdfOrPrintCredit(action: 'Pdf' | 'Print'): void {
    this.resolveFormDates();
    const headers = ['Receipt Date', 'Receipt No', 'Cheque No', 'Amount', 'Cheque Date', 'Deposit Date', 'Cleared Date', 'Particular'];
    const colWidths: any = {
      0: { cellWidth: 'auto', halign: 'center' }, 1: { cellWidth: 22, halign: 'left' },
      2: { cellWidth: 20, halign: 'right' }, 3: { cellWidth: 25, halign: 'left' },
      4: { cellWidth: 'auto', halign: 'center' }, 5: { cellWidth: 'auto', halign: 'center' },
      6: { cellWidth: 'auto', halign: 'center' }, 7: { cellWidth: 'auto', halign: 'left' }
    };
    const rows: any[][] = this.gridData().map(el => [
      this.fromDb(el.pissuedate), el.ptransactionno,
      el.preferencenumber || '--NA--',
      this._CommonService.convertAmountToPdfFormat(el.ptotalamount),
      el.preferencenumber ? this.fromDb(el.pissuedate) : '--NA--',
      this.fromDb(el.pdepositdate),
      el.preferencenumber ? this.fromDb(el.pclearDate) : '--NA--',
      el.pparticulars || '--NA--'
    ]);
    rows.push(['', 'Total', '', this._CommonService.convertAmountToPdfFormat(this.totalAmount()), '', '', '', '']);
    this._CommonService._downloadReportsPdf(this.reportName(), rows, headers, colWidths, 'a4', 'Between', this.startDate, this.endDate, action);
  }

  pdfOrPrintDebit(action: 'Pdf' | 'Print'): void {
    this.resolveFormDates();
    const headers = ['Trans Date', 'Trans No', 'Cheque No', 'Amount', 'Cleared Date', 'Particular'];
    const colWidths: any = {
      0: { cellWidth: 'auto', halign: 'center' }, 1: { cellWidth: 22, halign: 'left' },
      2: { cellWidth: 20, halign: 'right' }, 3: { cellWidth: 25, halign: 'left' },
      4: { cellWidth: 'auto', halign: 'center' }, 5: { cellWidth: 'auto', halign: 'left' }
    };
    const rows: any[][] = this.gridData().map(el => [
      this.formatToDDMMMYYYY(this._CommonService.getDateObjectFromDataBase(el.pissuedate)),
      el.ptransactionno, el.preferencenumber,
      this._CommonService.convertAmountToPdfFormat(el.ptotalamount),
      el.pclearDate ? this.formatToDDMMMYYYY(this._CommonService.getDateObjectFromDataBase(el.pclearDate)) : '--NA--',
      el.pparticulars || '--NA--'
    ]);
    rows.push(['', 'Total', '', this._CommonService.convertAmountToPdfFormat(this.totalAmount()), '', '']);
    this._CommonService._downloadReportsPdf(this.reportName(), rows, headers, colWidths, 'a4', 'Between', this.startDate, this.endDate, action);
  }

  // ── Excel ─────────────────────────────────────────────────────────────
  exportBankCredit(): void {
    const rows = this.gridData().map(el => ({
      'Receipt Date': this.datePipe.transform(el.pissuedate, 'dd-MMM-yyyy') ?? '--NA--',
      'Receipt No': el.ptransactionno,
      'Amount': this._CommonService.convertAmountToPdfFormat(el.ptotalamount),
      'Cheque No': el.preferencenumber || '--NA--',
      'Cheque Date': el.preferencenumber ? (this.datePipe.transform(el.pissuedate, 'dd-MMM-yyyy') ?? '--NA--') : '--NA--',
      'Deposit Date': el.preferencenumber ? (this.datePipe.transform(el.pdepositdate, 'dd-MMM-yyyy') ?? '--NA--') : '--NA--',
      'Cleared Date': el.pclearDate !== '[object Object]' ? (this.datePipe.transform(el.pclearDate, 'dd-MMM-yyyy') ?? '--NA--') : '--NA--',
      'Particular': el.pparticulars || '--NA--'
    }));
    this._CommonService.exportAsExcelFile(rows, 'BankCredit');
  }

  exportBankDebit(): void {
    const rows = this.gridData().map(el => ({
      'Trans Date': this.safeDate(el.pissuedate),
      'Trans No': el.ptransactionno,
      'Cheque No': el.preferencenumber,
      'Amount': this._CommonService.convertAmountToPdfFormat(el.ptotalamount),
      'Cleared Date': this.safeDate(el.pclearDate),
      'Particular': el.pparticulars || '--NA--'
    }));
    this._CommonService.exportAsExcelFile(rows, 'BankDebit');
  }
}
