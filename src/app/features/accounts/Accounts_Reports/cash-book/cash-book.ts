import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from "@angular/forms";
import { CommonService } from "../../../../core/services/Common/common.service";
import { CommonModule, DatePipe } from "@angular/common";
import { Router } from "@angular/router";
import { AccountsReports } from "../../../../core/services/accounts/accounts-reports";

import { TableModule } from "primeng/table";
import { Companydetails } from "../../../common/company-details/companydetails/companydetails";
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: "app-cash-book",
  standalone:true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePickerModule, TableModule, Companydetails],
  templateUrl: "./cash-book.html",
  styleUrl: "./cash-book.css",
  providers: [DatePipe]
})

export class CashBook implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  // ── DI ──────────────────────────────────────────────────────────────────────
  private readonly fb = inject(FormBuilder);
  private readonly reportService = inject(AccountsReports);
  private readonly commonService = inject(CommonService);
  private readonly datePipe = inject(DatePipe);
  private readonly router = inject(Router);

  // ── Reactive Form ────────────────────────────────────────────────────────────
  cashBookForm!: FormGroup;

  // ── Signals ──────────────────────────────────────────────────────────────────
  readonly submitted = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly showIcons = signal<boolean>(false);
  readonly gridView = signal<any[]>([]);
  readonly startDate = signal<Date | null>(null);
  readonly endDate = signal<Date | null>(null);
  readonly totalReceipts = computed(() => this.gridView().reduce((s, x) => s + (x.pdebitamount ?? 0), 0));
  readonly totalPayments = computed(() => this.gridView().reduce((s, x) => s + (x.pcreditamount ?? 0), 0));

  // Datepicker configs as signals so template reacts to minDate/maxDate updates
  readonly dpConfig = signal<any>({
    dateInputFormat: 'DD-MMM-YYYY',
    containerClass: 'theme-dark-blue',
    showWeekNumbers: false,
    maxDate: new Date()
  });

  readonly dpConfig1 = signal<any>({
    dateInputFormat: 'DD-MMM-YYYY',
    containerClass: 'theme-dark-blue',
    showWeekNumbers: false,
    maxDate: new Date()
  });

  // ── Non-reactive state ───────────────────────────────────────────────────────
  readonly currencySymbol = '₹';
  readonly printedDate = true;

  private rawData: any[] = [];
  private sortColumn = '';
  private sortDirection = 1;
   toDateMinDate: Date | null = null;
  

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initForm();
    this.syncDateSignals();
    const initialFrom = this.cashBookForm.get('fromDate')?.value;
  this.toDateMinDate = initialFrom ?? null;

  this.cashBookForm.get('fromDate')?.valueChanges.subscribe((val: Date | null) => {
    this.toDateMinDate = val ?? null;
    const toDate = this.cashBookForm.get('toDate')?.value;
    if (toDate && val && toDate < val) {
      this.cashBookForm.get('toDate')?.setValue(null as unknown as Date);
    }
  });
  }

  // ── Form Initialisation ───────────────────────────────────────────────────────
  private initForm(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.cashBookForm = this.fb.nonNullable.group(
      {
        fromDate: [today, Validators.required],
        toDate: [today, Validators.required],
        ptranstype: ['BOTH', Validators.required]
      },
      { validators: this.dateRangeValidator }
    );
  }

  private dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const from = group.get('fromDate')?.value;
  const to = group.get('toDate')?.value;
  if (from && to && new Date(from) > new Date(to)) {
    return { dateRangeInvalid: true };
  }
  return null;
}

  // ── Datepicker handlers ───────────────────────────────────────────────────────
  onFromDateChange(date: Date): void {
    // When "From Date" changes, update minDate of "To Date" picker
    this.dpConfig1.update(cfg => ({ ...cfg, minDate: date }));
  }

  onToDateChange(date: Date): void {
    // When "To Date" changes, update maxDate of "From Date" picker
    this.dpConfig.update(cfg => ({ ...cfg, maxDate: date }));
  }

  // ── Generate Report ───────────────────────────────────────────────────────────
  generateReport(): void {
    this.submitted.set(true);

    if (this.cashBookForm.invalid) {
      this.cashBookForm.markAllAsTouched();
      return;
    }

    const { fromDate, toDate, ptranstype } = this.cashBookForm.value;

    this.isLoading.set(true);
    this.syncDateSignals();

    const formattedFrom = this.commonService.getFormatDateGlobal(fromDate) ?? '';
    const formattedTo = this.commonService.getFormatDateGlobal(toDate) ?? '';

    this.reportService
      .GetCashBookReportbyDates(
        formattedFrom,
        formattedTo,
        ptranstype,
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .subscribe({
        next: (res: any) => {
          const data: any[] = res ?? [];
          this.rawData = [...data];
          this.gridView.set([...data]);
          this.showIcons.set(data.length > 0);
          this.isLoading.set(false);
        },
        error: (err: any) => {
          this.commonService.showErrorMessage(err);
          this.isLoading.set(false);
        }
      });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  private syncDateSignals(): void {
    this.startDate.set(this.cashBookForm.get('fromDate')?.value ?? null);
    this.endDate.set(this.cashBookForm.get('toDate')?.value ?? null);
  }

  get f() {
    return this.cashBookForm.controls;
  }

  // ── Filter ────────────────────────────────────────────────────────────────────
  onFilter(value: string): void {
    if (!value) {
      this.gridView.set([...this.rawData]);
      return;
    }
    const filter = value.toLowerCase();
    this.gridView.set(
      this.rawData.filter(x =>
        x.ptransactiondate?.toString().toLowerCase().includes(filter) ||
        x.ptransactionno?.toString().includes(filter) ||
        x.pparticulars?.toLowerCase().includes(filter) ||
        x.pdescription?.toLowerCase().includes(filter)
      )
    );
  }

  // ── Transaction Click ─────────────────────────────────────────────────────────
  clickTransNo(data: any): void {
    const transNo: string = data.ptransactionno ?? '';
    let route = '';
    let receiptName = '';

    if (transNo.startsWith('RCQ_') || transNo.startsWith('GR_') || transNo.startsWith('R_')) {
      route = '/general-receipt';
      receiptName = 'General Receipt';
    } else if (transNo.startsWith('MV_')) {
      route = '/payment-voucher';
      receiptName = 'Bank Payment';
    } else if (transNo.startsWith('JV_')) {
      route = '/journal-voucher';
      receiptName = 'Journal Voucher';
    }

    if (!route) return;

    const encoded = encodeURIComponent(btoa(`${transNo},${receiptName}`));
    window.open(
      this.router.serializeUrl(this.router.createUrlTree([route, encoded]))
    );
  }

  // ── Export Excel ──────────────────────────────────────────────────────────────
  export(): void {
    const rows = this.gridView().map(el => ({
      'Transaction Date': this.commonService.getFormatDateGlobal(el.ptransactiondate),
      'Transaction No.': el.ptransactionno || '--NA--',
      'Particulars': el.pparticulars,
      'Narration': el.pdescription || '--NA--',
      'Receipts': el.pdebitamount || '',
      'Payments': el.pcreditamount || '',
      'Balance': el.pclosingbal ? `${el.pclosingbal} ${el.pBalanceType}` : ''
    }));
    this.commonService.exportAsExcelFile(rows, 'Cash_Book');
  }

  // ── PDF / Print ───────────────────────────────────────────────────────────────
  pdfOrPrint(type: 'Pdf' | 'Print'): void {
    const { fromDate, toDate } = this.cashBookForm.value;
    const formattedFrom = this.datePipe.transform(fromDate, 'dd-MMM-yyyy') ?? '';
    const formattedTo = this.datePipe.transform(toDate, 'dd-MMM-yyyy') ?? '';

    const headers = [
      { header: 'Transaction No.', dataKey: 'ptransactionno' },
      { header: 'Particulars', dataKey: 'pparticulars' },
      { header: 'Narration', dataKey: 'pdescription' },
      { header: 'Receipts', dataKey: 'pdebitamount' },
      { header: 'Payments', dataKey: 'pcreditamount' },
      { header: 'Balance', dataKey: 'pclosingbal' }
    ];

    const colWidths = {
      0: { cellWidth: 45 },
      1: { cellWidth: 60 },
      2: { cellWidth: 70 },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
      5: { cellWidth: 38, halign: 'right' }
    };

    this.reportService._CashBookReportsPdf(
      'Cash Book',
      this.gridView(),
      headers,
      colWidths,
      'landscape',
      'Between',
      formattedFrom,
      formattedTo,
      type
    );
  }

  // ── Sorting ───────────────────────────────────────────────────────────────────
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
      const key = row.ptransactiondate;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    groups.forEach(rows =>
      rows.sort((a, b) => {
        const aVal = a[col];
        const bVal = b[col];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        return (typeof aVal === 'string'
          ? aVal.localeCompare(bVal)
          : aVal - bVal
        ) * dir;
      })
    );

    this.gridView.set(Array.from(groups.values()).flat());
  }
}
