import { Component, ElementRef, OnInit, ViewChild, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { TreeTableModule } from 'primeng/treetable';
import { Router } from '@angular/router';

import { finalize } from 'rxjs';
import { PaginatorModule } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { NgSelectModule } from '@ng-select/ng-select';
import { Companydetails } from '../../../common/company-details/companydetails/companydetails';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-jv-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePickerModule,
    TableModule,
    PaginatorModule,
    ReactiveFormsModule,
    Companydetails,
    NgSelectModule
  ],
  templateUrl: './jv-list.html',
  styleUrl: './jv-list.css',
  providers: [DatePipe]
})
export class JvList implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  // ── DI ──────────────────────────────────────────────────────────────────────
  private fb               = inject(FormBuilder);
  private router           = inject(Router);
  private commonService    = inject(CommonService);
  private jvReportService  = inject(AccountsReports);
  private destroyRef       = inject(DestroyRef);

  @ViewChild('myTable') table!: any;
  @ViewChild('htmlData') htmlData!: ElementRef;

  // ── Signals ──────────────────────────────────────────────────────────────────
  readonly loading       = signal(false);
  readonly isLoading     = signal(false);
  readonly showHide      = signal(true);
  readonly jvlistDataa   = signal<any[]>([]);
  readonly formNameData  = signal<any[]>([]);

  // ── State ────────────────────────────────────────────────────────────────────
  printedDate  = true;
  treeData: any[] = [];
  totalRecords  = 0;
  savebutton    = 'Generate Report';
  submitted     = false;
  currencysymbol = '₹';

  jvtype    = '';
  startDate!: Date;
  endDate!:   Date;

  jvlistData: any[] = [];

  jvSortColumn    = '';
  jvSortDirection: 1 | -1 = 1;
  private rawJvData: any[] = [];
  toDateMinDate: Date | null = null;

  pageCriteria: PageCriteria = new PageCriteria();

  // ── Datepicker configs ───────────────────────────────────────────────────────
  dpConfig: any = {
    dateInputFormat: 'DD-MMM-YYYY',
    containerClass:  'theme-dark-blue',
    showWeekNumbers: false,
    maxDate:         new Date()
  };

  dpConfig1: any = {
    dateInputFormat: 'DD-MMM-YYYY',
    containerClass:  'theme-dark-blue',
    showWeekNumbers: false,
    maxDate:         new Date(),
    minDate:         new Date()
  };

  // ── Form ─────────────────────────────────────────────────────────────────────
  JvlistReportForm!: FormGroup;

  get f() { return this.JvlistReportForm.controls; }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.setPageModel();
    this.getFormNames();

    this.JvlistReportForm = this.fb.group({
      fromDate:    [today, Validators.required],
      toDate:      [today, Validators.required],
      formName:    ['',         Validators.required],
      ptranstype:  ['All',      Validators.required]
    });
    const initialFrom = this.JvlistReportForm.get('fromDate')?.value;
  this.toDateMinDate = initialFrom ?? null;

  this.JvlistReportForm.get('fromDate')?.valueChanges.subscribe((val: Date | null) => {
    this.toDateMinDate = val ?? null;
    const toDate = this.JvlistReportForm.get('toDate')?.value;
    if (toDate && val && toDate < val) {
      this.JvlistReportForm.get('toDate')?.setValue(null as unknown as Date);
    }
  });
  }

  // ── Form names ────────────────────────────────────────────────────────────────
  getFormNames(): void {
    this.jvReportService.GetFormNameDetails().subscribe((res: any[]) => {
      const unique = res.filter(
        (item, index, self) =>
          index === self.findIndex(t => t.formNames === item.formNames)
      );
      this.formNameData.set(unique);
    });
  }

  // ── Page model ────────────────────────────────────────────────────────────────
  private setPageModel(): void {
    this.pageCriteria.pageSize         = this.commonService.pageSize;
    this.pageCriteria.offset           = 0;
    this.pageCriteria.pageNumber       = 1;
    this.pageCriteria.footerPageHeight = 50;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  isDateRow(row: any): boolean {
    const value = row.formOrModulename || row.pparticulars;
    return /^\d{4}-\d{2}-\d{2}$/.test(value?.trim());
  }

  onFooterPageChange(event: any): void {
    this.pageCriteria.offset = event.page - 1;
    this.pageCriteria.currentPageRows =
      this.pageCriteria.totalrows < event.page * this.pageCriteria.pageSize
        ? this.pageCriteria.totalrows % this.pageCriteria.pageSize
        : this.pageCriteria.pageSize;
  }

  // ── Datepicker handlers ───────────────────────────────────────────────────────
  onFromDateChange(event: Date): void {
    this.dpConfig1 = { ...this.dpConfig1, minDate: event };
  }

  onToDateChange(event: Date): void {
    this.dpConfig = { ...this.dpConfig, maxDate: event };
  }

  SelectTransactiontype(): void {
    this.jvlistData = [];
    this.jvlistDataa.set([]);
  }

  // ── Generate report ───────────────────────────────────────────────────────────
  getjvListReports(): void {
    this.submitted = true;

    if (this.JvlistReportForm.invalid) {
      this.JvlistReportForm.markAllAsTouched();
      return;
    }

    this.jvlistData = [];
    this.jvlistDataa.set([]);
    this.loading.set(true);
    this.isLoading.set(true);
    this.savebutton = 'Processing';

    this.jvtype    = this.JvlistReportForm.value.ptranstype;
    this.startDate = this.JvlistReportForm.value.fromDate;
    this.endDate   = this.JvlistReportForm.value.toDate;

    const fromdate = this.commonService.getFormatDateNormal(this.startDate) || '';
    const todate   = this.commonService.getFormatDateNormal(this.endDate)   || '';

    this.jvReportService
      .GetJvListReport(
        fromdate, todate, this.jvtype,
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode(),
        this.commonService.getschemaname()
      )
      .pipe(finalize(() => {
        this.isLoading.set(false);
        this.loading.set(false);
        this.savebutton = 'Generate Report';
      }))
      .subscribe({
        next: (res: any[]) => {
          if (res.length > 0) {
            this.jvlistData = res;
            const built = this.buildTableData(res);
            this.jvlistDataa.set(built);
            this.rawJvData = [...built];
            this.showHide.set(false);
          } else {
            this.commonService.showInfoMessage('No Data');
            this.showHide.set(true);
          }
        },
        error: err => this.commonService.showErrorMessage(err)
      });
  }

  // ── Build flat table data ─────────────────────────────────────────────────────
  buildTableData(data: any[]): any[] {
    const result: any[] = [];
    let currentDate    = '';
    let currentTransNo = '';

    data.forEach(row => {
      if (row.ptransactiondate !== currentDate) {
        currentDate    = row.ptransactiondate;
        currentTransNo = '';
        result.push({ formOrModulename: row.ptransactiondate, pdebitamount: 0, pcreditamount: 0 });
      }

      if (row.ptransactionno !== currentTransNo) {
        currentTransNo = row.ptransactionno;
        result.push({ formOrModulename: row.ptransactionno, pdebitamount: 0, pcreditamount: 0 });

        if (row.pdescription) {
          result.push({ formOrModulename: 'Narration: ' + row.pdescription, pdebitamount: 0, pcreditamount: 0 });
        }
      }

      result.push({
        formOrModulename: row.pparticulars,
        pdebitamount:     parseFloat(row.pdebitamount  || 0).toFixed(2),
        pcreditamount:    parseFloat(row.pcreditamount || 0).toFixed(2)
      });
    });

    return result;
  }

  // ── PDF / Print ───────────────────────────────────────────────────────────────
  pdfOrprint(printorpdf: 'Pdf' | 'Print'): void {
    const fmt = (dateVal: any): string => {
      if (!dateVal) return '';
      const d = (dateVal?.year && dateVal?.month && dateVal?.day)
        ? new Date(dateVal.year, dateVal.month - 1, dateVal.day)
        : new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('en-US', { month: 'short' })}-${d.getFullYear()}`;
    };

    const fromDate = fmt(this.JvlistReportForm.value.fromDate);
    const toDate   = fmt(this.JvlistReportForm.value.toDate);

    const formatGroupDate = (content: string): string => {
      const parts = content?.split('/');
      if (parts?.length === 3) {
        const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
        return `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('en-US', { month: 'short' })}-${d.getFullYear()}`;
      }
      return content;
    };

    const rows: any[]      = [];
    let currentTransNo     = '';
    const gridheaders      = ['Particulars', 'Debit Amount', 'Credit Amount'];
    const groupedData      = this.commonService._MultipleGroupingGridExportData(this.jvlistData, 'ptransactiondate', true);

    groupedData.forEach((element: any) => {
      if (element.ptransactionno === undefined) {
        currentTransNo = '';
        rows.push([{ ...element.group, content: formatGroupDate(element.group.content) }]);
      } else {
        if (element.ptransactionno !== currentTransNo) {
          currentTransNo = element.ptransactionno;
          rows.push([{ content: element.ptransactionno, colSpan: 3, styles: { halign: 'left', fontStyle: 'normal', fillColor: [255, 255, 255] } }]);
        }
        rows.push([
          element.pparticulars,
          element.pdebitamount  > 0 ? String(element.pdebitamount)  : '',
          element.pcreditamount > 0 ? String(element.pcreditamount) : ''
        ]);
      }
    });

    this.commonService._JvListdownloadReportsPdf(
      'JV List', rows, gridheaders, {}, 'landscape', 'Between', fromDate, toDate, printorpdf
    );
  }

  // ── Sort ──────────────────────────────────────────────────────────────────────
  sortJv(column: string): void {
    this.jvSortDirection = this.jvSortColumn === column
      ? (this.jvSortDirection === 1 ? -1 : 1) : 1;
    this.jvSortColumn = column;
    this.applyJvSort();
  }

  getSortIconJv(column: string): string {
    if (this.jvSortColumn !== column) return '&#8597;';
    return this.jvSortDirection === 1 ? '&#8593;' : '&#8595;';
  }

  private applyJvSort(): void {
    const { jvSortColumn: col, jvSortDirection: dir } = this;
    this.jvlistDataa.set(
      [...this.rawJvData].sort((a, b) => (parseFloat(a[col]) || 0 - (parseFloat(b[col]) || 0)) * dir)
    );
  }
}
