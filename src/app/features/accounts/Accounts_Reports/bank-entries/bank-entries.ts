
import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { TableModule } from 'primeng/table';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { DatePickerModule } from 'primeng/datepicker';


@Component({
  selector: "app-bank-entries",
  standalone:true,
  imports: [CommonModule, ReactiveFormsModule, DatePickerModule, TableModule, DatePipe],
  templateUrl: "./bank-entries.html",
  styleUrl: "./bank-entries.css",
})

export class BankEntries implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  // ── injected services ──────────────────────────────────────────────────────
  private readonly datePipe = inject(DatePipe);
  private readonly router = inject(Router);
  private readonly formbuilder = inject(FormBuilder);
  private readonly _CommonService = inject(CommonService);
  private readonly _bankBookService = inject(AccountsReports);
  private readonly verificationService = inject(AccountsReports);
  private readonly destroyRef = inject(DestroyRef);

  // ── signals ────────────────────────────────────────────────────────────────
  readonly loading = signal(false);
  readonly pdfLoading = signal(false);
  readonly showhide = signal(true);
  readonly summeryChecked = signal(false);
  readonly pagedData = signal<any[]>([]);

  // ── plain properties ───────────────────────────────────────────────────────
  BanknBookReportForm!: FormGroup;
  submitted = false;

  dpConfig: any = {};
  dpConfig1: any = {};

  pageCriteria: PageCriteria = new PageCriteria();
  currencysymbol: any;

   today = new Date(new Date().setHours(0, 0, 0, 0));
  startDate: any = new Date();
  endDate: any = new Date();

  private gridView: any[] = [];
  private isSummeryChecked = '';
  toDateMinDate: Date | null = null;

  // ── lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.currencysymbol = this._CommonService.datePickerPropertiesSetup('currencysymbol');
    this.initializeDatePickers();
    this.initializeForm();
    this.setPageModel();
     const initialFrom = this.BanknBookReportForm.get('fromDate')?.value;
  this.toDateMinDate = initialFrom ?? null;

  this.BanknBookReportForm.get('fromDate')?.valueChanges.subscribe((val: Date | null) => {
    this.toDateMinDate = val ?? null;
    const toDate = this.BanknBookReportForm.get('toDate')?.value;
    if (toDate && val && toDate < val) {
      this.BanknBookReportForm.get('toDate')?.setValue(null as unknown as Date);
    }
  });
  }

  // ── init helpers ───────────────────────────────────────────────────────────
  private initializeDatePickers(): void {
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
      maxDate: new Date(),
      minDate: new Date()
    };
  }

  private initializeForm(): void {
    this.BanknBookReportForm = this.formbuilder.group({
      fromDate: [this.today, Validators.required],
      toDate: [this.today, Validators.required]
    });
  }

  private setPageModel(): void {
    this.pageCriteria.pageSize = this._CommonService.pageSize;
    this.pageCriteria.offset = 0;
    this.pageCriteria.pageNumber = 1;
    this.pageCriteria.CurrentPage = 1;
    this.pageCriteria.footerPageHeight = 50;
    this.pageCriteria.totalrows = 0;
    this.pageCriteria.TotalPages = 0;
  }

  // ── form accessor ──────────────────────────────────────────────────────────
  get f() { return this.BanknBookReportForm.controls; }

  // ── pagination ─────────────────────────────────────────────────────────────
  private updatePagedData(): void {
    if (!this.gridView?.length) {
      this.pagedData.set([]);
      return;
    }
    const start = (this.pageCriteria.CurrentPage - 1) * this.pageCriteria.pageSize;
    const end = Math.min(start + this.pageCriteria.pageSize, this.gridView.length);
    this.pagedData.set(this.gridView.slice(start, end));
  }

  onFooterPageChange(event: any): void {
    this.pageCriteria.CurrentPage = event.page;
    this.pageCriteria.offset = (event.page - 1) * this.pageCriteria.pageSize;
    this.updatePagedData();
  }

  // ── date picker change handlers ────────────────────────────────────────────
  ToDateChange(event: Date): void {
    this.dpConfig1 = { ...this.dpConfig1, minDate: event };
  }

  FromDateChange(event: Date): void {
    this.dpConfig = { ...this.dpConfig, maxDate: event };
  }

  // ── summary checkbox ───────────────────────────────────────────────────────
  CheckSummery(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.summeryChecked.set(checked);
    this.isSummeryChecked = checked ? 'S' : '';
    this.pagedData.set([]);
    this.gridView = [];
  }

  // ── fetch report ───────────────────────────────────────────────────────────
  getbankBookReports(): void {
    this.submitted = true;
    if (!this.BanknBookReportForm.valid) return;

    this.loading.set(true);

    this.startDate = this.BanknBookReportForm.controls['fromDate'].value;
    this.endDate = this.BanknBookReportForm.controls['toDate'].value;

    const fromdate = new Date(this.startDate).toLocaleDateString('en-CA');
    const todate = new Date(this.endDate).toLocaleDateString('en-CA');

    this._bankBookService
      .GetBankEntriesDetails2(fromdate, todate, '', this.isSummeryChecked)
      .subscribe({
        next: (res) => {
          this.showhide.set(false);
          this.gridView = res ?? [];
          this.pageCriteria.totalrows = this.gridView.length;
          this.pageCriteria.TotalPages = Math.ceil(this.gridView.length / this.pageCriteria.pageSize);
          this.pageCriteria.CurrentPage = 1;
          this.pageCriteria.offset = 0;
          this.updatePagedData();
          this.loading.set(false);
        },
        error: (err) => {
          this._CommonService.showErrorMessage(err);
          this.loading.set(false);
        }
      });
  }

  // ── PDF / Print ────────────────────────────────────────────────────────────
  async pdfOrprint(printorpdf: 'Pdf' | 'Print'): Promise<void> {
    this.pdfLoading.set(true);
    try {
      const rows: any[] = [];
      let slNo = 1;

      this.gridView.forEach(element => {
        const datereceipt = this._CommonService.getFormatDateGlobal(element.transactionDate);
        rows.push([
          slNo++,
          datereceipt || '--NA--',
          (element.transactionNo && element.transactionNo !== '0') ? element.transactionNo : '--NA--',
          element.particulars || '--NA--',
          element.debitamount || '',
          element.creditamount || '',
          element.balance || '',
          element.balancetype || '--NA--'
        ]);
      });

      const headers = [
        'Sl No.', 'Transaction Date', 'Transaction No.', 'Particulars',
        'Debit Amount', 'Credit Amount', 'Balance', 'Balance Type'
      ];

      const colWidths = {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 65 },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 15, halign: 'right' },
        7: { cellWidth: 17, halign: 'center' }
      };

      const fromDate = this.formatToDDMMMYYYY(this.BanknBookReportForm.controls['fromDate'].value);
      const toDate = this.formatToDDMMMYYYY(this.BanknBookReportForm.controls['toDate'].value);

      this.verificationService.downloadKgmsOutwardReportsData(
        'Bank Entries Details', rows, headers, colWidths, 'a4',
        printorpdf === 'Print' ? 'Print' : 'Pdf',
        fromDate, toDate, 'Between'
      );
    } catch {
      this._CommonService.showErrorMessage('Failed to generate PDF');
    } finally {
      this.pdfLoading.set(false);
    }
  }

  // ── Excel export ───────────────────────────────────────────────────────────
  export(): void {
    const rows = this.gridView.map(element => ({
      'Transaction Date': this._CommonService.getFormatDateGlobal(element.transdate),
      'Transaction No.': element.transactionNo,
      'Particulars': element.particulars,
      'Debit Amount': element.debitamount,
      'Credit Amount': element.creditamount,
      'Balance': element.balance,
      'Balance Type': element.balancetype
    }));
    this._CommonService.exportAsExcelFile(rows, 'Bank Entries Details');
  }

  // ── private utility ────────────────────────────────────────────────────────
  private formatToDDMMMYYYY(dateVal: any): string {
    if (!dateVal) return '';
    const d = (dateVal?.year && dateVal?.month && dateVal?.day)
      ? new Date(dateVal.year, dateVal.month - 1, dateVal.day)
      : new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('en-US', { month: 'short' })}-${d.getFullYear()}`;
  }
}

