import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';


import { TableModule } from 'primeng/table';
import { Companydetails } from '../../../common/company-details/companydetails/companydetails';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-cheque-return',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    DatePickerModule,
    TableModule,
    Companydetails
  ],
  templateUrl: './cheque-return.html',
  styleUrl: './cheque-return.css'
})
export class ChequeReturn implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  private fb = inject(FormBuilder);
  private datePipe = inject(DatePipe);
  private router = inject(Router);
  private reportService = inject(AccountsTransactions);
  private commonService = inject(CommonService);
  private accReportService = inject(AccountsReports);
  private destroyRef = inject(DestroyRef);

  FrmChequeReturn!: FormGroup<{
    fromdate: FormControl<Date | null>;
    todate: FormControl<Date | null>;
  }>;

  dpConfig: any = {};
  dpConfig1: any = {};

  // Signals
  savebutton = signal('Generate Report');
  loading = signal(false);
  isLoading = signal(false);
  showHide = signal(true);
  showicons = signal(false);
  gridData = signal<any[]>([]);

  submitted = false;
  validation = false;
  printedDate = true;
  currencysymbol = '';
  StartDate: string | null = null;
  EndDate: string | null = null;
  sortColumn = '';
  sortDirection: 1 | -1 = 1;
  pageCriteria = new PageCriteria();

  private rawData: any[] = [];
  toDateMinDate: Date | null = null;

  ngOnInit(): void {
    this.initializeDatePickers();
    this.buildForm();
    this.setPageModel();
    this.updateFormattedDates();
    const initialFrom = this.FrmChequeReturn.get('fromdate')?.value as Date | null;
this.toDateMinDate = initialFrom ?? null;

this.FrmChequeReturn.get('fromdate')?.valueChanges.subscribe((val: unknown) => {
  const fromVal = val as Date | null;
  this.toDateMinDate = fromVal ?? null;
  const toDate = this.FrmChequeReturn.get('todate')?.value as Date | null;
  if (toDate && fromVal && toDate < fromVal) {
    this.FrmChequeReturn.get('todate')?.setValue(null as unknown as Date);
  }
});
  }

  private buildForm(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.FrmChequeReturn = this.fb.group({
      fromdate: [today, Validators.required],
      todate: [today, Validators.required]
    }, { validators: this.dateRangeValidator() }) as any;
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

  private initializeDatePickers(): void {
    this.currencysymbol = String(this.commonService.datePickerPropertiesSetup('currencysymbol'));

    this.dpConfig = {
      dateInputFormat: 'DD-MMM-YYYY',
      containerClass: String(this.commonService.datePickerPropertiesSetup('containerClass')),
      showWeekNumbers: false,
      maxDate: new Date()
    };

    this.dpConfig1 = { ...this.dpConfig };
  }

  private setPageModel(): void {
    this.pageCriteria.pageSize = this.commonService.pageSize;
    this.pageCriteria.offset = 0;
    this.pageCriteria.pageNumber = 1;
    this.pageCriteria.footerPageHeight = 50;
  }

  get f() {
    return this.FrmChequeReturn.controls;
  }

  updateFormattedDates(): void {
    this.StartDate = this.datePipe.transform(this.f.fromdate.value, 'dd-MMM-yyyy');
    this.EndDate = this.datePipe.transform(this.f.todate.value, 'dd-MMM-yyyy');
  }

  onFromDateChange(date: Date): void {
    this.dpConfig1 = { ...this.dpConfig1, minDate: date };
    this.updateFormattedDates();
    if (this.f.todate.value && date > this.f.todate.value) {
      this.validation = true;
      this.commonService.showWarningMessage('Please select To Date greater than From Date');
    } else {
      this.validation = false;
    }
  }

  onToDateChange(date: Date): void {
    this.dpConfig = { ...this.dpConfig, maxDate: date };
    this.updateFormattedDates();
    this.validation = !!(this.f.fromdate.value && this.f.fromdate.value > date);
  }

  GetChequeReturnDetails(): void {
    this.submitted = true;
    this.FrmChequeReturn.markAllAsTouched();

    if (this.FrmChequeReturn.errors?.['dateRangeInvalid']) {
      alert('From Date should not be greater than To Date');
      return;
    }
    if (this.FrmChequeReturn.invalid) return;

    const from = this.f.fromdate.value!;
    const to = this.f.todate.value!;

    this.loading.set(true);
    this.isLoading.set(true);
    this.savebutton.set('Processing');
    this.updateFormattedDates();

    const fromdate = this.commonService.getFormatDateNormal(from);
    const todate = this.commonService.getFormatDateNormal(to);

    this.reportService.GetChequeReturnDetails(
      fromdate,
      todate,
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
        this.showHide.set(false);
        this.updatePagination(data.length);
      },
      error: (err) => this.commonService.showErrorMessage(err),
      complete: () => {
        this.loading.set(false);
        this.isLoading.set(false);
        this.savebutton.set('Generate Report');
      }
    });
  }

  onFooterPageChange(event: any): void {
    this.pageCriteria.offset = event.page - 1;
    this.pageCriteria.CurrentPage = event.page;
    this.pageCriteria.currentPageRows = Math.min(
      this.pageCriteria.pageSize,
      this.pageCriteria.totalrows - this.pageCriteria.offset * this.pageCriteria.pageSize
    );
  }

  private updatePagination(total: number): void {
    this.pageCriteria.totalrows = total;
    this.pageCriteria.TotalPages = Math.ceil(total / this.pageCriteria.pageSize);
    this.pageCriteria.currentPageRows = Math.min(total, this.pageCriteria.pageSize);
  }

  export(): void {
    const rows = this.gridData().map(e => ({
      'Return Date': this.datePipe.transform(e.pcleardate, 'dd-MMM-yyyy'),
      'Cheque No.': e.preferencenumber,
      'Cheque Amt.': this.commonService.currencyformat(e.ptotalreceivedamount),
      'Bank Name': e.pbankname,
      'Receipt No.': e.preceiptid,
      'Receipt Date': this.datePipe.transform(e.pchequedate, 'dd-MMM-yyyy'),
      'Particulars': e.pparticulars,
      'Referred By': e.pbranchname
    }));

    this.commonService.exportAsExcelFile(rows, 'Cheque_Return');
  }

  pdfOrprint(type: 'Pdf' | 'Print'): void {
    if (!this.gridData().length) {
      this.commonService.showWarningMessage('No records to export');
      return;
    }

    const formatToDDMMMYYYY = (dateVal: any): string => {
      if (!dateVal) return '--NA--';
      const date = (dateVal?.year && dateVal?.month && dateVal?.day)
        ? new Date(dateVal.year, dateVal.month - 1, dateVal.day)
        : new Date(dateVal);
      if (isNaN(date.getTime())) return '--NA--';
      const day = String(date.getDate()).padStart(2, '0');
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    this.StartDate = formatToDDMMMYYYY(this.f.fromdate.value);
    this.EndDate = formatToDDMMMYYYY(this.f.todate.value);

    const rows = this.gridData().map(e => ([
      this.datePipe.transform(e.pcleardate, 'dd-MMM-yyyy'),
      e.preferencenumber,
      this.commonService.convertAmountToPdfFormat(
        this.commonService.currencyFormat(e.ptotalreceivedamount)
      ),
      e.pbankname,
      e.preceiptid,
      this.datePipe.transform(e.pchequedate, 'dd-MMM-yyyy'),
      e.pparticulars,
      e.pbranchname || '--NA--'
    ]));

    const headers = ['Return Date', 'Cheque No.', 'Cheque Amt.', 'Bank Name', 'Receipt No.', 'Receipt Date', 'Particulars', 'Referred By'];

    this.accReportService._ChequeReturnCancelReportsPdf(
      'Cheque Return',
      rows,
      headers,
      {},
      'landscape',
      'Between',
      this.StartDate ?? '',
      this.EndDate ?? '',
      type
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
