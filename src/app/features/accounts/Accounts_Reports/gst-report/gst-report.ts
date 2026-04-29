import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
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


import { NgSelectModule } from '@ng-select/ng-select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableModule } from 'primeng/table';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-gst-report',
  imports: [
    FormsModule,
    CommonModule,
    
    ReactiveFormsModule,
    NgSelectModule,
    DatePickerModule,
    TableModule
  ],
  templateUrl: './gst-report.html',
  providers: [DatePipe],
  styleUrl: './gst-report.css'
})
export class GstReport implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  // ── Injected services ─────────────────────────────────────────────────────
  private readonly commonService     = inject(CommonService);
  private readonly reportService     = inject(AccountsReports);
  private readonly tdsReportService  = inject(AccountsReports);
  private readonly fb                = inject(FormBuilder);
  private readonly datePipe          = inject(DatePipe);
  private readonly destroyRef        = inject(DestroyRef);

  // ── Form ──────────────────────────────────────────────────────────────────
  GstReportForm!: FormGroup;

  // ── Signals ───────────────────────────────────────────────────────────────
  readonly gstReportDetails  = signal<any[]>([]);
  readonly gstSummaryDetails = signal<any[]>([]);
  readonly gstPaymentsData   = signal<any[]>([]);
  readonly ledgerAccountsList = signal<any[]>([]);

  readonly showIcons          = signal(false);
  readonly showHideGstReport  = signal(false);
  readonly showHideGstSummary = signal(false);
  readonly showReceipts       = signal(true);
  readonly showPayments       = signal(false);
  readonly disableSaveButton  = signal(false);
  readonly saveButton         = signal('GST Print');

  // ── Other state ───────────────────────────────────────────────────────────
  currencySymbol = '₹';
  month: string = '';
  submitted = false;

  pageCriteria = new PageCriteria();

  reportSortColumn    = '';
  reportSortDirection: 1 | -1 = 1;
  private rawReportData: any[] = [];

  summarySortColumn    = '';
  summarySortDirection: 1 | -1 = 1;
  private rawSummaryData: any[] = [];

  paymentsSortColumn    = '';
  paymentsSortDirection: 1 | -1 = 1;
  private rawPaymentsData: any[] = [];
  toDateMinDate: Date | null = null;

  private loginBranchSchema: any;

  // ── Datepicker configs ────────────────────────────────────────────────────
  dpConfig: any = {
    dateInputFormat: 'DD-MMM-YYYY',
    containerClass: 'theme-dark-blue',
    showWeekNumbers: false,
    maxDate: new Date()
  };

  dpConfig1: any = {
    dateInputFormat: 'DD-MMM-YYYY',
    containerClass: 'theme-dark-blue',
    showWeekNumbers: false,
    maxDate: new Date()
  };

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.currencySymbol = '₹';
    this.loginBranchSchema = sessionStorage.getItem('loginBranchSchemaname');
    this.setPageModel();
    this.buildForm();
    this.getLedger();
    const initialFrom = this.GstReportForm.get('fromdate')?.value;
  this.toDateMinDate = initialFrom ?? null;

  this.GstReportForm.get('fromdate')?.valueChanges.subscribe((val: Date | null) => {
    this.toDateMinDate = val ?? null;
    const toDate = this.GstReportForm.get('todate')?.value;
    if (toDate && val && toDate < val) {
      this.GstReportForm.get('todate')?.setValue(null as unknown as Date);
    }
  });
  }

  // ── Form helpers ──────────────────────────────────────────────────────────
  get f() { return this.GstReportForm.controls; }

  private buildForm(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    this.GstReportForm = this.fb.group(
      {
        month:             [firstDay, Validators.required],
        pledgerid:         [null, Validators.required],
        pledgername:       [''],
        receiptsPayments:  ['receipts'],
        fromdate:          [today, Validators.required],
        todate:            [today, Validators.required]
      },
      { validators: this.dateRangeValidator() }
    );

    this.onGstReportType('receipts');
  }

  private dateRangeValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      if (!this.showPayments()) return null;

      const from = group.get('fromdate')?.value;
      const to   = group.get('todate')?.value;
      if (!from || !to) return null;

      const fromTime = new Date(from).setHours(0, 0, 0, 0);
      const toTime   = new Date(to).setHours(0, 0, 0, 0);
      return fromTime > toTime ? { dateRangeInvalid: true } : null;
    };
  }

  private setPageModel(): void {
    this.pageCriteria.pageSize          = 10;
    this.pageCriteria.offset            = 0;
    this.pageCriteria.pageNumber        = 1;
    this.pageCriteria.footerPageHeight  = 50;
  }

  // ── Data loaders ──────────────────────────────────────────────────────────
  private getLedger(): void {
    this.reportService
      .GetGstLedgerAccountList(
        'GST REPORT',
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.ledgerAccountsList.set(res ?? []),
        error: err => this.commonService.showErrorMessage(err)
      });
  }

  // ── Event handlers ────────────────────────────────────────────────────────
  onLedgerNameChange(event: any): void {
    this.GstReportForm.patchValue({ pledgername: event?.pledgername ?? '' });
  }

  onToDateChange(event: Date): void {
    this.dpConfig1 = { ...this.dpConfig1, minDate: event };
  }

  onFromDateChange(event: Date): void {
    this.dpConfig = { ...this.dpConfig, maxDate: event };
  }
  

  onGstReportType(type: string): void {
    this.gstReportDetails.set([]);
    this.gstSummaryDetails.set([]);
    this.gstPaymentsData.set([]);
    this.showPayments.set(false);
    this.showHideGstReport.set(false);
    this.showIcons.set(false);

    if (type === 'receipts') {
      this.showReceipts.set(true);
      this.showPayments.set(false);

      this.GstReportForm.get('pledgerid')?.setValidators([Validators.required]);
      this.GstReportForm.get('month')?.setValidators([Validators.required]);
      this.GstReportForm.get('fromdate')?.clearValidators();
      this.GstReportForm.get('todate')?.clearValidators();
    } else {
      const today = new Date();
    today.setHours(0, 0, 0, 0);
      this.showPayments.set(true);
      this.showReceipts.set(false);

      this.GstReportForm.patchValue({ fromdate: today, todate: today, pledgerid: null });

      this.GstReportForm.get('fromdate')?.setValidators([Validators.required]);
      this.GstReportForm.get('todate')?.setValidators([Validators.required]);
      this.GstReportForm.get('pledgerid')?.clearValidators();
      this.GstReportForm.get('month')?.clearValidators();
    }

    ['pledgerid', 'month', 'fromdate', 'todate'].forEach(ctrl =>
      this.GstReportForm.get(ctrl)?.updateValueAndValidity()
    );
    this.GstReportForm.updateValueAndValidity();
  }

  clickGstReport(): void {
    this.submitted = true;

    if (this.GstReportForm.errors?.['dateRangeInvalid']) {
      alert('From Date should not be greater than To Date');
      return;
    }
    if (this.GstReportForm.invalid) return;

    this.gstReportDetails.set([]);
    this.gstSummaryDetails.set([]);

    if (this.showReceipts()) {
      this.loadGstReceipts();
    } else {
      this.loadGstPayments();
    }
  }

  clickGstSummary(): void {
    this.submitted = true;

    if (this.GstReportForm.errors?.['dateRangeInvalid']) {
      alert('From Date should not be greater than To Date');
      return;
    }
    if (this.GstReportForm.invalid) return;

    this.gstReportDetails.set([]);
    this.gstSummaryDetails.set([]);

    if (!this.showReceipts()) {
      this.commonService.showWarningMessage('No data');
      return;
    }

    const fromdate: Date = this.GstReportForm.value.month;
    const todate   = new Date(fromdate.getFullYear(), fromdate.getMonth() + 1, 0);
    const from     = this.datePipe.transform(fromdate, 'yyyy-MM-dd')!;
    const to       = this.datePipe.transform(todate,   'yyyy-MM-dd')!;
    const ledgername = this.GstReportForm.value.pledgerid;

    this.month = this.datePipe.transform(fromdate, 'MMM-yyyy')!;

    this.tdsReportService
      .getGstReportDetails(
        this.commonService.getbranchname(), from, to,
        'GST SUMMARY', ledgername,
        this.commonService.getschemaname(),
        this.commonService.getBranchCode(),
        this.commonService.getCompanyCode()
      )
      .subscribe((res: any[]) => {
        const data = res ?? [];
        this.gstSummaryDetails.set(data);
        this.rawSummaryData = [...data];
        this.showIcons.set(data.length > 0);
        this.showHideGstReport.set(false);
        this.showHideGstSummary.set(true);
        this.updatePagination(data.length);
      });
  }

  // ── Private loaders ───────────────────────────────────────────────────────
  private loadGstReceipts(): void {
    this.disableSaveButton.set(true);
    this.saveButton.set('Processing');

    const fromdate: Date = this.GstReportForm.value.month;
    const todate   = new Date(fromdate.getFullYear(), fromdate.getMonth() + 1, 0);
    const from     = this.datePipe.transform(fromdate, 'yyyy-MM-dd')!;
    const to       = this.datePipe.transform(todate,   'yyyy-MM-dd')!;
    const ledgername = this.GstReportForm.value.pledgerid;

    this.month = this.datePipe.transform(fromdate, 'MMM-yyyy')!;

    this.tdsReportService
      .getGstReportDetails(
        this.commonService.getbranchname(), from, to,
        'GST REPORT', ledgername,
        this.commonService.getschemaname(),
        this.commonService.getBranchCode(),
        this.commonService.getCompanyCode()
      )
      .subscribe({
        next: (res: any[]) => {
          this.handleSingleLedgerReport(res);
          this.disableSaveButton.set(false);
          this.saveButton.set('GST Print');
        },
        error: () => {
          this.disableSaveButton.set(false);
          this.saveButton.set('GST Print');
        }
      });
  }

  private loadGstPayments(): void {
    this.disableSaveButton.set(true);
    this.saveButton.set('Processing');
    this.gstPaymentsData.set([]);

    const fromdate = this.datePipe.transform(this.GstReportForm.value.fromdate, 'yyyy-MM-dd')!;
    const todate   = this.datePipe.transform(this.GstReportForm.value.todate,   'yyyy-MM-dd')!;

    this.tdsReportService
      .Getgstreport(
        this.commonService.getbranchname(), fromdate, todate,
        this.commonService.getschemaname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .subscribe({
        next: (result: any[]) => {
          const data = result ?? [];
          this.gstPaymentsData.set(data);
          this.rawPaymentsData = [...data];
          this.showIcons.set(data.length > 0);
          this.updatePagination(data.length);
          this.disableSaveButton.set(false);
          this.saveButton.set('GST Print');
        },
        error: () => {
          this.showIcons.set(false);
          this.disableSaveButton.set(false);
          this.saveButton.set('GST Print');
        }
      });
  }

  private handleSingleLedgerReport(res: any[]): void {
    const data = res ?? [];
    this.gstReportDetails.set(data);
    this.rawReportData = [...data];
    this.cleanObjectValues(data);
    this.showIcons.set(data.length > 0);
    this.showHideGstReport.set(true);
    this.showHideGstSummary.set(false);
    this.updatePagination(data.length);
  }

  private cleanObjectValues(data: any[]): void {
    data.forEach(item =>
      Object.keys(item).forEach(key => {
        if (JSON.stringify(item[key]) === '{}') item[key] = '';
      })
    );
  }

  private updatePagination(totalRows: number): void {
    this.pageCriteria.totalrows       = totalRows;
    this.pageCriteria.TotalPages      = Math.ceil(totalRows / this.pageCriteria.pageSize);
    this.pageCriteria.currentPageRows = totalRows < this.pageCriteria.pageSize
      ? totalRows
      : this.pageCriteria.pageSize;
  }

  // ── Export / Print ────────────────────────────────────────────────────────
  pdfOrPrint(printOrPdf: 'Pdf' | 'Print'): void {
    const toAmt = (val: any) => {
      const n = Number(val ?? 0);
      return this.commonService.convertAmountToPdfFormat(
        this.commonService.currencyFormat(isNaN(n) ? 0 : n)
      );
    };

    const rows: any[]        = [];
    const reportName         = 'GST Report';
    const gridHeaders        = [
      'Chit No.', 'GST No.', 'Name', 'Area', 'City', 'State',
      'Subscriber Address', 'Transaction Date', 'Transaction No.',
      'Taxable Amount', 'IGST', 'CGST', 'SGST'
    ];
    const colWidthHeight: any = {
      0: { cellWidth: 20, halign: 'left' },  1: { cellWidth: 20, halign: 'left' },
      2: { cellWidth: 23, halign: 'left' },  3: { cellWidth: 22, halign: 'left' },
      4: { cellWidth: 23, halign: 'left' },  5: { cellWidth: 18, halign: 'left' },
      6: { cellWidth: 'auto', halign: 'center' }, 7: { cellWidth: 'auto', halign: 'center' },
      8: { cellWidth: 'auto', halign: 'center' }, 9: { cellWidth: 15, halign: 'right' },
      10: { cellWidth: 15, halign: 'right' }, 11: { cellWidth: 15, halign: 'right' },
      12: { cellWidth: 15, halign: 'right' }
    };

    const details = this.gstReportDetails();
    const returnGridData = this.commonService._getGroupingGridExportData(details, 'parentname', false);

    returnGridData?.forEach((element: any) => {
      const gstNumber       = element.gstnumber && element.gstnumber !== '[object Object]' ? element.gstnumber : '--NA--';
      const transactionDate = element.chitreceiptdate ? this.commonService.getFormatDateGlobal(element.chitreceiptdate) : '';
      const taxableAmount   = toAmt(element.receiptamount);
      const igstAmount      = toAmt(element.igstamount);
      const cgstAmount      = toAmt(element.cgstamount);
      const sgstAmount      = toAmt(element.sgstamount);

      if (element.group !== undefined || (element.groupcode && element.accountname)) {
        rows.push([element.groupcode, gstNumber, element.accountname, element.area, element.city,
          element.state, element.guarantoraddress, transactionDate, element.receiptnumber,
          taxableAmount, igstAmount, cgstAmount, sgstAmount]);
      } else {
        rows.push(['', '', '', '', '', '', '', '', 'Total', taxableAmount, igstAmount, cgstAmount, sgstAmount]);
      }
    });

    const g1 = details.reduce((s, c) => s + Number(c.receiptamount || 0), 0).toFixed(2);
    const g2 = details.reduce((s, c) => s + Number(c.igstamount   || 0), 0).toFixed(2);
    const g3 = details.reduce((s, c) => s + Number(c.cgstamount   || 0), 0).toFixed(2);
    const g4 = details.reduce((s, c) => s + Number(c.sgstamount   || 0), 0).toFixed(2);

    rows.push(['', '', '', '', '', '', '', '', 'Grand Total', toAmt(g1), toAmt(g2), toAmt(g3), toAmt(g4)]);

    this.commonService.downloadgstprintpdf(reportName, this.month, rows, gridHeaders, colWidthHeight, 'landscape', printOrPdf);
  }

  pdfOrPrintGstSummary(printOrPdf: 'Pdf' | 'Print'): void {
    const rows: any[]        = [];
    const reportName         = 'GST Summary';
    const gridHeaders        = ['Company', 'State', 'Trans Type', 'From No.', 'To No.', 'Count'];
    const colWidthHeight: any = {
      0: { cellWidth: 'auto', halign: 'left' }, 1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 'auto', halign: 'left' }, 3: { cellWidth: 'auto', halign: 'left' },
      4: { cellWidth: 'auto', halign: 'left' }, 5: { cellWidth: 'auto', halign: 'left' }
    };

    this.gstSummaryDetails().forEach(el =>
      rows.push([el.companyname, el.state, el.transtype, el.transactionfrom, el.transactionto, el.count])
    );

    this.commonService.downloadgstsummarypdf(reportName, this.month, rows, gridHeaders, colWidthHeight, 'a4', printOrPdf);
  }

  pdfOrPrintPayments(printOrPdf: 'Pdf' | 'Print'): void {
    const rows: any[]        = [];
    const reportName         = 'GST Payments';
    const gridHeaders        = ['GST Voucher No.', 'Name', 'State', 'GST Voucher Date',
      'Taxable Amount', 'CGST Amount', 'SGST Amount', 'IGST Amount', 'Total Amount'];
    const colWidthHeight: any = {
      0: { cellWidth: 28, halign: 'left' },  1: { cellWidth: 45, halign: 'left' },
      2: { cellWidth: 28, halign: 'left' },  3: { cellWidth: 32, halign: 'left' },
      4: { cellWidth: 27, halign: 'right' }, 5: { cellWidth: 27, halign: 'right' },
      6: { cellWidth: 27, halign: 'right' }, 7: { cellWidth: 27, halign: 'right' },
      8: { cellWidth: 26, halign: 'right' }
    };

    this.gstPaymentsData().forEach(el =>
      rows.push([el.gstVoucherNo, el.contactName, el.stateName,
        this.datePipe.transform(el.invoiceDate, 'dd-MMM-yyyy'),
        el.taxableValue, el.cgstAmount, el.sgstAmount, el.igstAmount, el.totalAmount])
    );

    const fmt = (date: any): string => {
      const d  = new Date(date);
      const ms = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${String(d.getDate()).padStart(2,'0')}-${ms[d.getMonth()]}-${d.getFullYear()}`;
    };

    const fromdate = fmt(this.GstReportForm.value.fromdate);
    const todate   = fmt(this.GstReportForm.value.todate);

    this.commonService.downloadgstsummarypdf(reportName, `${fromdate} - ${todate}`, rows, gridHeaders, colWidthHeight, 'landscape', printOrPdf);
  }

  export(): void {
    const rows = this.gstReportDetails().map(el => ({
      'Parent Name':      el.parentname,
      'GSTNo.':           el.gstnumber && el.gstnumber !== '[object Object]' ? el.gstnumber : '--NA--',
      'Chit No.':         el.groupcode,
      'Name':             el.accountname,
      'Area':             el.area,
      'City':             el.city,
      'State':            el.state,
      'Subscriber Name':  el.guarantoraddress,
      'Transaction Date': el.chitreceiptdate ? this.commonService.getFormatDateGlobal(el.chitreceiptdate) : '',
      'Transaction No.':  el.receiptnumber,
      'Taxable Amount':   Number(el.receiptamount || 0),
      'IGST':             Number(el.igstamount    || 0),
      'CGST':             Number(el.cgstamount    || 0),
      'SGST':             Number(el.sgstamount    || 0)
    }));
    this.commonService.exportAsExcelFile(rows, 'GST');
  }

  exportSummary(): void {
    const rows = this.gstSummaryDetails().map(el => ({
      'Company':            el.companyname,
      'State':              el.state,
      'Transaction Type':   el.transtype,
      'From No.':           el.transactionfrom,
      'To No.':             el.transactionto,
      'Count':              el.count
    }));
    this.commonService.exportAsExcelFile(rows, 'GSTSummary');
  }

  exportPayments(): void {
    const rows = this.gstPaymentsData().map(el => ({
      'GST Voucher No':   el.gstVoucherNo,
      'Name':             el.contactName,
      'State':            el.stateName,
      'GST Voucher Date': this.datePipe.transform(el.invoiceDate, 'dd-MMM-yyyy'),
      'Taxable Amount':   el.taxableValue,
      'CGST Amount':      el.cgstAmount,
      'SGST Amount':      el.sgstAmount,
      'IGST Amount':      el.igstAmount,
      'Total Amount':     el.totalAmount
    }));
    this.commonService.exportAsExcelFile(rows, 'GSTPayments');
  }

  // ── Sort helpers – Report ─────────────────────────────────────────────────
  sortReport(column: string): void {
    this.reportSortDirection = this.reportSortColumn === column
      ? (this.reportSortDirection === 1 ? -1 : 1) : 1;
    this.reportSortColumn = column;
    this.applyReportSort();
  }

  getSortIconReport(column: string): string {
    if (this.reportSortColumn !== column) return '&#8597;';
    return this.reportSortDirection === 1 ? '&#8593;' : '&#8595;';
  }

  private applyReportSort(): void {
    const col = this.reportSortColumn;
    const dir = this.reportSortDirection;
    this.gstReportDetails.set(
      [...this.rawReportData].sort((a, b) => {
        const aVal = a[col], bVal = b[col];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        return typeof aVal === 'string' ? aVal.localeCompare(bVal) * dir : (aVal - bVal) * dir;
      })
    );
  }

  // ── Sort helpers – Summary ────────────────────────────────────────────────
  sortSummary(column: string): void {
    this.summarySortDirection = this.summarySortColumn === column
      ? (this.summarySortDirection === 1 ? -1 : 1) : 1;
    this.summarySortColumn = column;
    this.applySummarySort();
  }

  getSortIconSummary(column: string): string {
    if (this.summarySortColumn !== column) return '&#8597;';
    return this.summarySortDirection === 1 ? '&#8593;' : '&#8595;';
  }

  private applySummarySort(): void {
    const col = this.summarySortColumn;
    const dir = this.summarySortDirection;
    this.gstSummaryDetails.set(
      [...this.rawSummaryData].sort((a, b) => {
        const aVal = a[col], bVal = b[col];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        return typeof aVal === 'string' ? aVal.localeCompare(bVal) * dir : (aVal - bVal) * dir;
      })
    );
  }

  // ── Sort helpers – Payments ───────────────────────────────────────────────
  sortPayments(column: string): void {
    this.paymentsSortDirection = this.paymentsSortColumn === column
      ? (this.paymentsSortDirection === 1 ? -1 : 1) : 1;
    this.paymentsSortColumn = column;
    this.applyPaymentsSort();
  }

  getSortIconPayments(column: string): string {
    if (this.paymentsSortColumn !== column) return '&#8597;';
    return this.paymentsSortDirection === 1 ? '&#8593;' : '&#8595;';
  }

  private applyPaymentsSort(): void {
    const col = this.paymentsSortColumn;
    const dir = this.paymentsSortDirection;
    this.gstPaymentsData.set(
      [...this.rawPaymentsData].sort((a, b) => {
        const aVal = a[col], bVal = b[col];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        return typeof aVal === 'string' ? aVal.localeCompare(bVal) * dir : (aVal - bVal) * dir;
      })
    );
  }
}
