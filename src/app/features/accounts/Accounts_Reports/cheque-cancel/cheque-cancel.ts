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


import { TableModule } from 'primeng/table';
import { Router } from '@angular/router';
import { Companydetails } from '../../../common/company-details/companydetails/companydetails';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-cheque-cancel',
  imports: [
    CommonModule,
    TableModule,
    FormsModule,
    ReactiveFormsModule,
    DatePickerModule,
    Companydetails
  ],
  standalone: true,
  templateUrl: './cheque-cancel.html',
  styleUrl: './cheque-cancel.css'
})
export class ChequeCancel implements OnInit {
  pDatepickerMaxDate: Date = new Date();

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private datePipe = inject(DatePipe);
  private commonService = inject(CommonService);
  private reportService = inject(AccountsTransactions);
  private accReportService = inject(AccountsReports);
  private destroyRef = inject(DestroyRef);

  FrmChequeCancel!: FormGroup<{
    fromdate: FormGroup<any> | any;
    todate: FormGroup<any> | any;
  }>;

  submitted = false;
  dpConfig: any = {};
  dpConfig1: any = {};

  savebutton = signal('Generate Report');
  loading = signal(false);
  isLoading = signal(false);
  disablesavebutton = false;

  StartDate!: Date;
  EndDate!: Date;
  validation = false;

  gridData = signal<any[]>([]);
  showHide = signal(true);
  showicons = signal(false);

  pageCriteria = new PageCriteria();
  currencysymbol = '₹';
  printedDate = true;
  sortColumn = '';
  sortDirection: 1 | -1 = 1;
  private rawData: any[] = [];
  toDateMinDate: Date | null = null;

  ngOnInit(): void {
    this.dpConfig = {
      dateInputFormat: 'DD-MMM-YYYY',
      containerClass: 'theme-dark-blue',
      showWeekNumbers: false,
      maxDate: new Date()
    };

    this.dpConfig1 = {
      dateInputFormat: 'DD-MMM-YYYY',
      containerClass: 'theme-dark-blue',
      showWeekNumbers: false,
      maxDate: new Date()
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.FrmChequeCancel = this.fb.group({
      fromdate: [today, Validators.required],
      todate: [today, Validators.required]
    });

    this.setPageModel();
    const initialFrom = this.FrmChequeCancel.get('fromdate')?.value as Date | null;
this.toDateMinDate = initialFrom ?? null;

this.FrmChequeCancel.get('fromdate')?.valueChanges.subscribe((val: unknown) => {
  const fromVal = val as Date | null;
  this.toDateMinDate = fromVal ?? null;
  const toDate = this.FrmChequeCancel.get('todate')?.value as Date | null;
  if (toDate && fromVal && toDate < fromVal) {
    this.FrmChequeCancel.get('todate')?.setValue(null as unknown as Date);
  }
});
  }

  dateRangeValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const from = group.get('fromdate')?.value;
      const to = group.get('todate')?.value;
      if (!from || !to) return null;
      const fromTime = new Date(from).setHours(0, 0, 0, 0);
      const toTime = new Date(to).setHours(0, 0, 0, 0);
      return fromTime > toTime ? { dateRangeInvalid: true } : null;
    };
  }

  get f() {
    return this.FrmChequeCancel.controls;
  }

  private updateDates(): void {
    this.StartDate = this.f.fromdate.value;
    this.EndDate = this.f.todate.value;
    this.validation = this.StartDate > this.EndDate;
  }

  onFromDateChange(event: Date): void {
    this.dpConfig1 = { ...this.dpConfig1, minDate: event };
  }

  onToDateChange(event: Date): void {
    this.dpConfig = { ...this.dpConfig, maxDate: event };
  }

  private setPageModel(): void {
    this.pageCriteria.pageSize = this.commonService.pageSize;
    this.pageCriteria.offset = 0;
    this.pageCriteria.pageNumber = 1;
    this.pageCriteria.footerPageHeight = 50;
  }

  onFooterPageChange(event: any): void {
    this.pageCriteria.offset = event.page - 1;
    this.pageCriteria.CurrentPage = event.page;
  }

  GetChequeCancelDetails(): void {
    this.submitted = true;
    if (this.FrmChequeCancel.invalid) return;
    if (this.FrmChequeCancel.errors?.['dateRangeInvalid']) {
      alert('From Date should not be greater than To Date');
      return;
    }
    if (this.validation) return;
    this.updateDates();

    const startdate = this.commonService.getFormatDateNormal(this.f.fromdate.value);
    const enddate = this.commonService.getFormatDateNormal(this.f.todate.value);

    this.loading.set(true);
    this.isLoading.set(true);
    this.savebutton.set('Processing');
    this.disablesavebutton = true;

    this.reportService.GetChequeCancelDetails(
      startdate,
      enddate,
      this.commonService.getbranchname(),
      this.commonService.getschemaname(),
      this.commonService.getCompanyCode(),
      this.commonService.getBranchCode()
    ).subscribe({
      next: (res: any[]) => {
        const data = res || [];
        this.gridData.set(data);
        this.rawData = [...data];
        this.showicons.set(data.length > 0);
        this.pageCriteria.totalrows = data.length;
        this.pageCriteria.currentPageRows = Math.min(this.pageCriteria.pageSize, data.length);
        this.showHide.set(false);
      },
      error: (err) => this.commonService.showErrorMessage(err),
      complete: () => {
        this.loading.set(false);
        this.isLoading.set(false);
        this.savebutton.set('Generate Report');
        this.disablesavebutton = false;
      }
    });
  }

  export(): void {
    const rows = this.gridData().map(element => ({
      'Cancel Date': this.datePipe.transform(element.depositedDate, 'dd-MMM-yyyy'),
      'Cheque No.': element.referenceNumber,
      'Cheque Amt.': this.commonService.convertAmountToPdfFormat(
        this.commonService.currencyFormat(element.totalReceivedAmount || 0)
      ),
      'Bank Name': element.bankName,
      'Receipt No.': element.receiptNumber,
      'Receipt Date': this.datePipe.transform(element.receiptDate, 'dd-MMM-yyyy'),
      'Particulars': element.particulars
    }));

    this.commonService.exportAsExcelFile(rows, 'Cheque_Cancel');
  }

  pdfOrprint(printorpdf: 'Pdf' | 'Print'): void {
    const rawFromDate = this.f.fromdate.value;
    const rawToDate = this.f.todate.value;

    const formatToDDMMMYYYY = (dateVal: any): string => {
      if (!dateVal) return '';
      const date = (dateVal?.year && dateVal?.month && dateVal?.day)
        ? new Date(dateVal.year, dateVal.month - 1, dateVal.day)
        : new Date(dateVal);
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const fromDate = formatToDDMMMYYYY(rawFromDate);
    const toDate = formatToDDMMMYYYY(rawToDate);

    const rows = this.gridData().map(e => ([
      this.datePipe.transform(e.depositedDate, 'dd-MMM-yyyy'),
      e.referenceNumber,
      this.commonService.currencyformat(e.totalReceivedAmount),
      e.bankName,
      e.receiptNumber,
      this.datePipe.transform(e.receiptDate, 'dd-MMM-yyyy'),
      e.particulars
    ]));

    const headers = ['Cancel Date', 'Cheque No.', 'Cheque Amt.', 'Bank Name', 'Receipt No.', 'Receipt Date', 'Particulars'];

    this.accReportService._ChequeReturnCancelReportsPdf(
      'Cheque Cancel',
      rows,
      headers,
      {},
      'landscape',
      'Between',
      fromDate,
      toDate,
      printorpdf
    );
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 1 ? -1 : 1;
    } else {
      this.sortColumn = column;
      this.sortDirection = 1;
    }
    this.applySort();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '&#8597;';
    return this.sortDirection === 1 ? '&#8593;' : '&#8595;';
  }

  private applySort(): void {
    const col = this.sortColumn;
    const dir = this.sortDirection;
    this.gridData.set([...this.rawData].sort((a, b) => {
      const aVal = a[col];
      const bVal = b[col];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') return aVal.localeCompare(bVal) * dir;
      return (aVal - bVal) * dir;
    }));
  }
}
