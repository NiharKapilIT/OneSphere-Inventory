
import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl, ValidationErrors, FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { NgSelectModule } from '@ng-select/ng-select';
import { SelectModule } from 'primeng/select';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { DatePickerModule } from 'primeng/datepicker';


@Component({
  selector: "app-tds-report",
  standalone:true,
  imports: [DatePickerModule, CommonModule, FormsModule, ReactiveFormsModule, TableModule, NgSelectModule, SelectModule],
  templateUrl: "./tds-report.html",
  styleUrl: "./tds-report.css",
  host: { ngSkipHydration: '' }
})

export class TdsReport implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  // ── Injected services ────────────────────────────────────────────────────────
  private readonly fb = inject(FormBuilder);
  private readonly datepipe = inject(DatePipe);
  private readonly commonService = inject(CommonService);
  private readonly tdsReportSvc = inject(AccountsReports);
  private readonly tdsService = inject(AccountsReports);
  private readonly reportService = inject(AccountsReports);

  // ── Datepicker configs ───────────────────────────────────────────────────────
  dpConfig: any = {};
  dpConfig1: any = {};

  // ── Page model ───────────────────────────────────────────────────────────────
  pageCriteria: PageCriteria = new PageCriteria();

  // ── Reactive form ────────────────────────────────────────────────────────────
  TdsReportForm!: FormGroup;

  // ── Signals (state) ──────────────────────────────────────────────────────────
  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly summary = signal(false);
  readonly betweenDate = signal(true);
  readonly grouptype = signal<'Between' | 'Ason'>('Between');
  readonly mismatchInfo = signal(false);

  readonly tdsReportData = signal<any[]>([]);
  readonly tdsSectionData = signal<any[]>([]);
  readonly mismatchDetails = signal<any[]>([]);

  private readonly rawData = signal<any[]>([]);

  // Sorting
  readonly sortColumn = signal('');
  readonly sortDirection = signal<1 | -1>(1);

  // ── Computed signals ─────────────────────────────────────────────────────────
  readonly saveButtonLabel = computed(() => this.loading() ? 'Processing…' : 'Show');

  readonly dtTable = computed(() => this.tdsReportData().length > 0);
  readonly noDtTable = computed(() =>
    !this.loading() && this.submitted() && this.tdsReportData().length === 0
  );

  readonly lblFromDate = computed(() =>
    this.betweenDate() ? 'From Date' : 'Date'
  );

  readonly currencySymbol = signal('');
  readonly branchSchema = signal<string | null>(null);
  toDateMinDate: Date | null = null;

  // ── Totals (computed) ────────────────────────────────────────────────────────
  readonly totalLedger = computed(() =>
    this.tdsReportData().reduce((s, x) => s + (x.ledgeramount ?? 0), 0)
  );
  readonly totalTds = computed(() =>
    this.tdsReportData().reduce((s, x) => s + (x.tdscalculatedamount ?? 0), 0)
  );
  readonly totalPaidAmt = computed(() =>
    this.tdsReportData().reduce((s, x) => s + (x.paidamount ?? 0), 0)
  );

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initializeDatePicker();
    this.initializeForm();
    this.setPageModel();
    this.getTDSSectionDetails();
    this.branchSchema.set(sessionStorage.getItem('loginBranchSchemaname'));
    this.currencySymbol.set(
      String(this.commonService.datePickerPropertiesSetup('currencysymbol'))
    );
    const initialFrom = this.TdsReportForm.get('fromdate')?.value;
  this.toDateMinDate = initialFrom ?? null;

  this.TdsReportForm.get('fromdate')?.valueChanges.subscribe((val: Date | null) => {
    this.toDateMinDate = val ?? null;
    const toDate = this.TdsReportForm.get('todate')?.value;
    if (toDate && val && toDate < val) {
      this.TdsReportForm.get('todate')?.setValue(null as unknown as Date);
    }
  });
  }

  // ── Initializers ─────────────────────────────────────────────────────────────
  private initializeDatePicker(): void {
    const base: any = {
      dateInputFormat: 'DD-MMM-YYYY',
      showWeekNumbers: false,
      containerClass: 'theme-dark-blue',
      maxDate: new Date()
    };
    this.dpConfig = { ...base };
    this.dpConfig1 = { ...base };
  }

  private initializeForm(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.TdsReportForm = this.fb.group(
      {
        sectionid: [null, Validators.required],
        sectionname: [''],
        fromdate: [today],
        todate: [today],
        reportType: ['']
      },
      { validators: this.dateRangeValidator() }
    );
  }

  private dateRangeValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const from = group.get('fromdate')?.value;
      const to = group.get('todate')?.value;
      if (!from || !to) return null;
      return new Date(from).setHours(0, 0, 0, 0) > new Date(to).setHours(0, 0, 0, 0)
        ? { dateRangeInvalid: true }
        : null;
    };
  }

  private setPageModel(): void {
    this.pageCriteria.pageSize = this.commonService.pageSize;
    this.pageCriteria.offset = 0;
    this.pageCriteria.pageNumber = 1;
    this.pageCriteria.footerPageHeight = 50;
  }

  // ── Form-control accessor ─────────────────────────────────────────────────────
  get f() { return this.TdsReportForm.controls; }

  // ── Event handlers ────────────────────────────────────────────────────────────
  onFromDateChange(date: Date): void {
    this.dpConfig1 = { ...this.dpConfig1, minDate: date };
    this.tdsReportData.set([]);
  }

  onToDateChange(date: Date): void {
    this.dpConfig = { ...this.dpConfig, maxDate: date };
    this.tdsReportData.set([]);
  }

  getTDSSectionDetails(): void {
    this.tdsReportSvc
      .getTDSSectionDetails(
        this.commonService.getschemaname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .subscribe((res: any[]) => this.tdsSectionData.set(res ?? []));
  }

  onSectionChange(event: any): void {
    if (!event) {
      this.TdsReportForm.patchValue({ sectionname: '' });
      return;
    }
    this.TdsReportForm.patchValue({ sectionid: event.tdsId, sectionname: event.sectionName });
    this.tdsReportData.set([]);
  }

  onSummaryToggle(event: Event): void {
    this.summary.set((event.target as HTMLInputElement).checked);
    this.tdsReportData.set([]);
  }

  onAsOnToggle(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.tdsReportData.set([]);
    this.betweenDate.set(!checked);
    this.grouptype.set(checked ? 'Ason' : 'Between');
  }

  onMismatchToggle(event: Event): void {
    this.mismatchInfo.set((event.target as HTMLInputElement).checked);
  }

  // ── Show / Fetch ──────────────────────────────────────────────────────────────
  Show(): void {
    this.submitted.set(true);

    if (this.TdsReportForm.errors?.['dateRangeInvalid']) {
      alert('From Date should not be greater than To Date');
      return;
    }
    if (this.TdsReportForm.invalid) return;

    this.tdsReportData.set([]);
    this.loading.set(true);

    const { sectionid, fromdate, todate } = this.TdsReportForm.value;
    const from = this.commonService.getFormatDateNormal(fromdate);
    const to = this.commonService.getFormatDateNormal(todate);
    const reporttype = this.summary() ? 'Summary' : 'Detail';

    if (!this.mismatchInfo()) {
      this.reportService
        .getTDSReportDetails(
          this.commonService.getbranchname(),
          sectionid,
          from,
          to,
          this.grouptype(),
          reporttype
        )
        .subscribe({
          next: (res: any[]) => {
            const data = res ?? [];
            this.tdsReportData.set(data);
            this.rawData.set([...data]);
            this.pageCriteria.totalrows = data.length;
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
    } else {
      this.tdsReportSvc
        .getTDSReportDiffDetails(
          this.commonService.getschemaname(),
          sectionid,
          from,
          to
        )
        .subscribe((res: any[]) => {
          this.mismatchDetails.set(res ?? []);
          if (this.mismatchDetails().length) this.exportMismatch();
          this.loading.set(false);
        });
    }
  }

  // ── Sort ──────────────────────────────────────────────────────────────────────
  sortBy(column: string): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update(d => d === 1 ? -1 : 1);
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set(1);
    }
    this.applySort();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn() !== column) return '&#8597;';
    return this.sortDirection() === 1 ? '&#8593;' : '&#8595;';
  }

  private applySort(): void {
    const col = this.sortColumn();
    const dir = this.sortDirection();
    this.tdsReportData.set(
      [...this.rawData()].sort((a, b) => {
        const aVal = a[col], bVal = b[col];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        return (typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal) * dir;
      })
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  getAbsoluteValue(num: number): number { return Math.abs(num); }

  private formatToDDMMMYYYY(dateVal: any): string {
    if (!dateVal) return '';
    const date = (dateVal?.year && dateVal?.month && dateVal?.day)
      ? new Date(dateVal.year, dateVal.month - 1, dateVal.day)
      : new Date(dateVal);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    return `${day}-${month}-${date.getFullYear()}`;
  }

  // ── Export / Print / PDF ──────────────────────────────────────────────────────
  pdfOrPrint(type: 'Pdf' | 'Print'): void {
    const data = this.tdsReportData();
    if (!data.length) return;

    const isSummary = this.summary();
    const reportname = isSummary ? 'TDS Report (Summary)' : 'TDS Report';
    const gridheaders = isSummary
      ? ['Agent Name', 'Agent Code', 'Pan Number', 'Paid Amount', 'TDS Calculated Amount', 'Amount']
      : ['Particulars', 'Pan Number', 'PAN Status', 'Agent Name', 'Agent Code', 'Transaction Date',
        'Paid Amount', 'TDS Calculated Amount', 'Amount', 'Effective JV', 'Subscriber Branch'];

    const colWidthHeight = isSummary
      ? {
        0: { cellWidth: 'auto', halign: 'left' }, 1: { cellWidth: 'auto', halign: 'left' }, 2: { cellWidth: 'auto', halign: 'left' },
        3: { cellWidth: 'auto', halign: 'right' }, 4: { cellWidth: 'auto', halign: 'right' }, 5: { cellWidth: 'auto', halign: 'right' }
      }
      : {
        0: { cellWidth: 35, halign: 'left' }, 1: { cellWidth: 'auto', halign: 'center' }, 2: { cellWidth: 'auto', halign: 'center' },
        3: { cellWidth: 'auto', halign: 'left' }, 4: { cellWidth: 'auto', halign: 'center' }, 5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 20, halign: 'right' }, 7: { cellWidth: 'auto', halign: 'right' }, 8: { cellWidth: 20, halign: 'right' },
        9: { cellWidth: 'auto', halign: 'center' }, 10: { cellWidth: 'auto', halign: 'left' }
      };

    const from = this.formatToDDMMMYYYY(this.TdsReportForm.value.fromdate);
    const to = this.formatToDDMMMYYYY(this.TdsReportForm.value.todate);

    const rows = data.map(e => {
      const paidTo = e.paid_to && Object.keys(e.paid_to).length ? JSON.stringify(e.paid_to) : '';
      const pan = e.pannumber ?? '--NA--';
      const branch = e.subscriberbranchname ?? '--NA--';
      const panSt = e.panstatus ?? '--NA--';
      const txDate = e.transaction_date ? this.datepipe.transform(e.transaction_date, 'dd-MMM-yyyy') : '';
      const ledger = this.commonService.convertAmountToPdfFormat(e.ledgeramount ?? 0);
      const tds = this.commonService.convertAmountToPdfFormat(e.tdscalculatedamount ?? 0);
      const paid = this.commonService.convertAmountToPdfFormat(e.paidamount ?? 0);
      return isSummary
        ? [e.agentName, e.referalcode, pan, paid, tds, ledger]
        : [paidTo, pan, panSt, e.agentName, e.referalcode, txDate, paid, tds, ledger, e.effectedjvid, branch];
    });

    const fmt = (n: number) => this.commonService.convertAmountToPdfFormat(n);
    const totalRow = isSummary
      ? ['', '', 'Grand Total', fmt(this.totalPaidAmt()), fmt(this.totalTds()), fmt(this.totalLedger())]
      : ['', '', '', '', '', 'Grand Total', fmt(this.totalPaidAmt()), fmt(this.totalTds()), fmt(this.totalLedger())];
    rows.push(totalRow);

    this.commonService.downloadtdsaccountingpdf(
      reportname, this.grouptype(), from, to, rows, gridheaders,
      colWidthHeight, 'landscape', '', this.TdsReportForm.value.sectionname, to, type
    );
  }

  export(): void {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fmt = (n: number) =>
      n < 0 ? `(${Math.abs(n).toFixed(2)})` : (n ?? 0).toFixed(2);

    const rows = this.tdsReportData().map(e => {
      const base: any = {
        'Pan Number': e.pannumber ?? '--NA--',
        'Agent Name': e.agentName,
        'Agent Code': e.referalcode,
        'Paid Amount': fmt(e.paidamount),
        'TDS Calculated Amount': fmt(e.tdscalculatedamount),
        'Amount': fmt(e.ledgeramount)
      };
      if (!this.summary()) {
        const d = e.transaction_date ? new Date(e.transaction_date) : null;
        return {
          'Particulars': e.paid_to,
          ...base,
          'PAN Status': e.panstatus ?? '--NA--',
          'Transaction Date': d
            ? `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`
            : '--NA--',
          'Effective JV': e.effectedjvid,
          'Subscriber Branch': e.subscriberbranchname ?? '--NA--'
        };
      }
      return base;
    });

    this.commonService.exportAsExcelFile(rows, this.summary() ? 'TDS (Summary)' : 'TDS');
  }

  private exportMismatch(): void {
    const rows = this.mismatchDetails().map(e => ({
      'Transaction No.': e.voucherno,
      'Parent Name': e.paid_to,
      'Account Name': e.agentName,
      'Paid Amount': e.ledgeramount,
      'Tds Amount': e.tdscalculatedamount,
      'Amount': e.paidamount
    }));
    this.commonService.exportAsExcelFile(rows, 'tdsmismatch Information');
  }
}
