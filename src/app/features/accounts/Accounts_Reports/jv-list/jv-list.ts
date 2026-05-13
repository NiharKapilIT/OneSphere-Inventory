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
import { TreeNode } from 'primeng/api';

@Component({
  selector: 'app-jv-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePickerModule,
    TableModule,
    TreeTableModule,
    PaginatorModule,
    ReactiveFormsModule,
    Companydetails,
    NgSelectModule
  ],
  templateUrl: './jv-list.html',
  providers: [DatePipe]
})
export class JvList implements OnInit {
  pDatepickerMaxDate: Date = new Date();

  // ── DI ──────────────────────────────────────────────────────────────────────
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private commonService = inject(CommonService);
  private jvReportService = inject(AccountsReports);
  private destroyRef = inject(DestroyRef);

  @ViewChild('myTable') table!: any;
  @ViewChild('htmlData') htmlData!: ElementRef;

  // ── Signals ──────────────────────────────────────────────────────────────────
  readonly loading = signal(false);
  readonly isLoading = signal(false);
  readonly showHide = signal(true);
  readonly jvTreeData = signal<TreeNode[]>([]);
  readonly formNameData = signal<any[]>([]);

  // ── State ────────────────────────────────────────────────────────────────────
  printedDate = true;
  totalRecords = 0;
  savebutton = 'Generate Report';
  submitted = false;
  currencysymbol = '₹';

  jvtype = '';
  startDate!: Date;
  endDate!: Date;

  jvlistData: any[] = [];
  jvlistData1: any[] = [
    { value: 'All', viewValue: 'All' },
    { value: 'Auto', viewValue: 'Automatic' },
    { value: 'Manual', viewValue: 'Manual' }
  ];

  private rawJvData: TreeNode[] = [];
  toDateMinDate: Date | null = null;

  pageCriteria: PageCriteria = new PageCriteria();

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
    maxDate: new Date(),
    minDate: new Date()
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
      fromDate: [today, Validators.required],
      toDate: [today, Validators.required],
      formName: [null, Validators.required],
      ptranstype: ['All', Validators.required]
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
    this.pageCriteria.pageSize = this.commonService.pageSize;
    this.pageCriteria.offset = 0;
    this.pageCriteria.pageNumber = 1;
    this.pageCriteria.footerPageHeight = 50;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
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
    this.jvTreeData.set([]);
  }

  // ── Generate report ───────────────────────────────────────────────────────────
  getjvListReports(): void {
    this.submitted = true;

    if (this.JvlistReportForm.invalid) {
      this.JvlistReportForm.markAllAsTouched();
      return;
    }

    this.jvlistData = [];
    this.jvTreeData.set([]);
    this.loading.set(true);
    this.isLoading.set(true);
    this.savebutton = 'Processing';

    this.jvtype = this.JvlistReportForm.value.ptranstype;
    this.startDate = this.JvlistReportForm.value.fromDate;
    this.endDate = this.JvlistReportForm.value.toDate;

    const selectedFormName: string = this.JvlistReportForm.value.formName ?? '';
    const fromdate = this.commonService.getFormatDateNormal(this.startDate) || '';
    const todate = this.commonService.getFormatDateNormal(this.endDate) || '';

    this.jvReportService
      .GetJvListReport(
        fromdate,
        todate,
        this.jvtype,
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode(),
        this.commonService.getschemaname(),
        selectedFormName
      )
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
          this.loading.set(false);
          this.savebutton = 'Generate Report';
        })
      )
      .subscribe({
        next: (res: any[]) => {
          if (res && res.length > 0) {
            this.jvlistData = res;
            const tree = this.buildTreeData(res);
            this.jvTreeData.set(tree);
            this.rawJvData = [...tree];
            this.showHide.set(false);
          } else {
            this.commonService.showInfoMessage('No Data');
            this.jvTreeData.set([]);
            this.showHide.set(true);
          }
        },
        error: err => {
          this.commonService.showErrorMessage(err);
          this.showHide.set(true);
        }
      });
  }

  // ── Build tree data ───────────────────────────────────────────────────────────
  // buildTreeData(data: any[]): TreeNode[] {
  //   const roots: TreeNode[]        = [];
  //   const dateMap  = new Map<string, TreeNode>();
  //   const transMap = new Map<string, TreeNode>();

  //   data.forEach(row => {
  //     if (!dateMap.has(row.ptransactiondate)) {
  //       const dateNode: TreeNode = {
  //         data: {
  //           formOrModulename: row.ptransactiondate,
  //           pdebitamount:     0,
  //           pcreditamount:    0,
  //           isDate:           true
  //         },
  //         children: [],
  //         expanded: true
  //       };
  //       dateMap.set(row.ptransactiondate, dateNode);
  //       roots.push(dateNode);
  //     }

  //     const dateNode = dateMap.get(row.ptransactiondate)!;

  //     const transKey = row.ptransactiondate + '_' + row.ptransactionno;
  //     if (!transMap.has(transKey)) {
  //       const transNode: TreeNode = {
  //         data: {
  //           formOrModulename: row.ptransactionno,
  //           pdebitamount:     0,
  //           pcreditamount:    0,
  //           isTransHeader:    true
  //         },
  //         children: [],
  //         expanded: true
  //       };

  //       if (row.pdescription) {
  //         transNode.children!.push({
  //           data: {
  //             formOrModulename: 'Narration: ' + row.pdescription,
  //             pdebitamount:     0,
  //             pcreditamount:    0,
  //             isNarration:      true
  //           },
  //           leaf: true
  //         });
  //       }

  //       transMap.set(transKey, transNode);
  //       dateNode.children!.push(transNode);
  //     }

  //     const transNode = transMap.get(transKey)!;

  //     transNode.children!.push({
  //       data: {
  //         formOrModulename: row.pparticulars,
  //         pdebitamount:     parseFloat(row.pdebitamount  || 0).toFixed(2),
  //         pcreditamount:    parseFloat(row.pcreditamount || 0).toFixed(2),
  //         isEntry:          true
  //       },
  //       leaf: true
  //     });
  //   });

  //   return roots;
  // }


  buildTreeData(data: any[]): TreeNode[] {
    const roots: TreeNode[] = [];
    const dateMap = new Map<string, TreeNode>();
    const transMap = new Map<string, TreeNode>();

    data.forEach(row => {
      if (!dateMap.has(row.ptransactiondate)) {
        const dateNode: TreeNode = {
          data: {
            formOrModulename: row.ptransactiondate,
            pdebitamount: 0,
            pcreditamount: 0,
            isDate: true
          },
          children: [],
          expanded: true
        };
        dateMap.set(row.ptransactiondate, dateNode);
        roots.push(dateNode);
      }

      const dateNode = dateMap.get(row.ptransactiondate)!;

      const transKey = row.ptransactiondate + '_' + row.ptransactionno;
      if (!transMap.has(transKey)) {
        const transNode: TreeNode = {
          data: {
            formOrModulename: row.ptransactionno,
            pdebitamount: 0,
            pcreditamount: 0,
            isTransHeader: true,
            _narration: row.pdescription || null
          },
          children: [],
          expanded: true
        };

        transMap.set(transKey, transNode);
        dateNode.children!.push(transNode);
      }

      const transNode = transMap.get(transKey)!;

      transNode.children!.push({
        data: {
          formOrModulename: row.pparticulars,
          pdebitamount: parseFloat(row.pdebitamount || 0).toFixed(2),
          pcreditamount: parseFloat(row.pcreditamount || 0).toFixed(2),
          isEntry: true
        },
        leaf: true
      });
    });

    transMap.forEach(transNode => {
      const narration = transNode.data._narration;
      if (narration) {
        transNode.children!.push({
          data: {
            formOrModulename: 'Narration: ' + narration,
            pdebitamount: 0,
            pcreditamount: 0,
            isNarration: true
          },
          leaf: true
        });
      }
      delete transNode.data._narration;
    });

    return roots;
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
    const toDate = fmt(this.JvlistReportForm.value.toDate);

    const formatGroupDate = (content: string): string => {
      const parts = content?.split('/');
      if (parts?.length === 3) {
        const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
        return `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('en-US', { month: 'short' })}-${d.getFullYear()}`;
      }
      return content;
    };


    const rows: any[] = [];
    let currentTransNo = '';
    const gridheaders = ['Particulars', 'Debit Amount', 'Credit Amount'];
    const groupedData = this.commonService._MultipleGroupingGridExportData(
      this.jvlistData, 'ptransactiondate', true
    );

    groupedData.forEach((element: any) => {
      if (element.ptransactionno === undefined) {
        currentTransNo = '';
        rows.push([{ ...element.group, content: formatGroupDate(element.group.content) }]);
      } else {
        if (element.ptransactionno !== currentTransNo) {
          currentTransNo = element.ptransactionno;
          rows.push([{
            content: element.ptransactionno,
            colSpan: 3,
            styles: { halign: 'left', fontStyle: 'normal', fillColor: [255, 255, 255] }
          }]);
        }
        rows.push([
          element.pparticulars,
          element.pdebitamount > 0 ? String(element.pdebitamount) : '',
          element.pcreditamount > 0 ? String(element.pcreditamount) : ''
        ]);
      }
    });

    // this.commonService._JvListdownloadReportsPdf(
    //   'JV List', rows, gridheaders, {}, 'landscape', 'Between', fromDate, toDate, printorpdf
    // );
    this.commonService._JvListdownloadReportsPdf(
      `JV List (${this.JvlistReportForm.value.formName ?? ''})`,
      rows, gridheaders, {}, 'landscape', 'Between', fromDate, toDate, printorpdf
    );

  }
  // ── Excel Export ──────────────────────────────────────────────────────────────
  exportExcel(): void {
    const rows = this.jvlistData.map(item => ({
      'Transaction Date': item.ptransactiondate,
      'Transaction No.': item.ptransactionno,
      'Particulars': item.pparticulars,
      'Description': item.pdescription,
      'Debit Amount': item.pdebitamount,
      'Credit Amount': item.pcreditamount
    }));

    // this.commonService.exportAsExcelFile(rows, 'JournalEntryRegister');
    this.commonService.exportAsExcelFile(rows, `JournalEntryRegister (${this.JvlistReportForm.value.formName ?? ''})`);
  }


}

// 111
