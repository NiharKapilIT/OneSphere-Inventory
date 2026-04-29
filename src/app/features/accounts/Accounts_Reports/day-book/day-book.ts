import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, ViewChild, inject, signal, DestroyRef } from '@angular/core';
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

import { finalize } from 'rxjs';
import { NgSelectModule } from '@ng-select/ng-select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { Companydetails } from '../../../common/company-details/companydetails/companydetails';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-day-book',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DatePickerModule,
    TableModule,
    NgSelectModule,
    Companydetails
  ],
  templateUrl: './day-book.html',
  styleUrl: './day-book.css',
  providers: [DatePipe]
})
export class DayBook implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  // ── DI ──────────────────────────────────────────────────────────────────────
  private fb                   = inject(FormBuilder);
  private datePipe             = inject(DatePipe);
  private reportService        = inject(AccountsReports);
  private reportTransService   = inject(AccountsTransactions);
  private chitService          = inject(AccountsReports);
  private commonService        = inject(CommonService);
  private destroyRef           = inject(DestroyRef);

  @ViewChild('myTable') table: any;

  // ── Signals ──────────────────────────────────────────────────────────────────
  readonly loading         = signal(false);
  readonly gridData        = signal<any[]>([]);
  readonly totalBalanceGrid = signal<any[]>([]);
  readonly kgmsBranchList  = signal<any[]>([]);
  readonly gridDataCheques = signal<any[]>([]);
  readonly receiptsAmount  = signal(0);
  readonly paymentsAmount  = signal(0);

  // ── State ────────────────────────────────────────────────────────────────────
  submitted        = false;
  printedDate      = true;
  dte              = true;
  showdate         = '';
  currencysymbol   = '₹';
  loginBranchschema = '';
  ChequesAmount    = 0;

  StartDate: string | null = null;
  EndDate:   string | null = null;

  // Sort – main grid
  mainSortColumn    = '';
  mainSortDirection: 1 | -1 = 1;
  private rawMainData: any[] = [];
  toDateMinDate: Date | null = null;

  // Sort – balance grid
  balanceSortColumn    = '';
  balanceSortDirection: 1 | -1 = 1;
  private rawBalanceData: any[] = [];

  pageCriteria = new PageCriteria();

  // ── Datepicker configs ───────────────────────────────────────────────────────
  // dpConfig: any = {
  //   dateInputFormat: 'DD-MMM-YYYY',
  //   containerClass:  'theme-dark-blue',
  //   maxDate:         new Date(),
  //   showWeekNumbers: false
  // };

  // dppConfig: any = { ...this.dpConfig };

  // ── Form ─────────────────────────────────────────────────────────────────────
  dayBookForm!: FormGroup;

  get f() { return this.dayBookForm.controls; }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.dayBookForm = this.fb.group(
      {
        date:        [today],
        dfromdate:   [today],
        dtodate:     [today],
        branch_code: ['']
      },
      { validators: this.dateRangeValidator }
    );

    this.loginBranchschema = sessionStorage.getItem('loginBranchSchemaname') ?? '';
    this.loadBranches();
    this.setPageModel();
    const initialFrom = this.dayBookForm.get('dfromdate')?.value;
  this.toDateMinDate = initialFrom ?? null;

  this.dayBookForm.get('dfromdate')?.valueChanges.subscribe((val: Date | null) => {
    this.toDateMinDate = val ?? null;
    const toDate = this.dayBookForm.get('dtodate')?.value;
    if (toDate && val && new Date(toDate).getTime() < new Date(val).getTime()) {
      this.dayBookForm.get('dtodate')?.setValue(null as unknown as Date);
    }
  });
  }

  // ── Validators ───────────────────────────────────────────────────────────────
  private dateRangeValidator(group: AbstractControl): ValidationErrors | null {
    const from = group.get('dfromdate')?.value;
    const to   = group.get('dtodate')?.value;
    if (from && to && new Date(from) > new Date(to)) {
      return { dateRangeInvalid: true };
    }
    return null;
  }

  // ── Date handlers ─────────────────────────────────────────────────────────────
  onDateToggle(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.gridData.set([]);
    this.totalBalanceGrid.set([]);
    this.dayBookForm.patchValue({
      dtodate: today
    });
  }

  // onFromDateChange(event: Date): void {
  //   this.dppConfig = { ...this.dppConfig, minDate: event };
  // }

  // onToDateChange(event: Date): void {
  //   this.dpConfig = { ...this.dpConfig, maxDate: event };
  // }

  // ── Load branches ─────────────────────────────────────────────────────────────
  private loadBranches(): void {
    this.chitService
      .getCAOBranchlist(
        this.commonService.getbranchname(),
        this.commonService.getschemaname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .subscribe((res: any[]) => this.kgmsBranchList.set(res ?? []));
  }

  // ── Page model ────────────────────────────────────────────────────────────────
  private setPageModel(): void {
    this.pageCriteria.pageSize   = this.commonService.pageSize;
    this.pageCriteria.pageNumber = 1;
    this.pageCriteria.offset     = 0;
  }

  // ── Formatted dates helper ────────────────────────────────────────────────────
  private updateFormattedDates(): void {
    this.StartDate = this.datePipe.transform(this.f['dfromdate'].value, 'dd-MMM-yyyy');
    this.EndDate   = this.datePipe.transform(this.f['dtodate'].value,   'dd-MMM-yyyy');
  }

  // ── Generate report ───────────────────────────────────────────────────────────
  getDayBookData(): void {
    this.updateFormattedDates();

    const fromDate = this.commonService.getFormatDateNormal(
      this.dayBookForm.get('dfromdate')?.value
    ) ?? '';

    const toDateControl = this.dayBookForm.get('dtodate')?.value;
    const toDate   = toDateControl ? (this.commonService.getFormatDateNormal(toDateControl) ?? '') : fromDate;
    const asOnFlag = toDateControl ? 'F' : 'T';

    this.loading.set(true);
    this.receiptsAmount.set(0);
    this.paymentsAmount.set(0);

    this.reportService
      .GetDayBook(
        fromDate, toDate, asOnFlag,
        this.commonService.getbranchname(),
        this.commonService.getBranchCode(),
        this.commonService.getCompanyCode(),
        this.commonService.getschemaname()
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res: any) => {
          const raw = res?.plstdaybookdata ?? [];
          const sorted = raw
            .map((item: any) => ({
              ...item,
              prcpttransactiondate: new Date(item.prcpttransactiondate).toISOString().split('T')[0]
            }))
            .sort((a: any, b: any) =>
              new Date(a.prcpttransactiondate).getTime() - new Date(b.prcpttransactiondate).getTime()
            );

          this.rawMainData = [...sorted];
          this.gridData.set(sorted);

          const totals = res?.plstdaybooktotals ?? [];
          this.rawBalanceData = [...totals];
          this.totalBalanceGrid.set(totals);

          this.calculateTotals();
          this.formatBalances();
        },
        error: (err) => this.commonService.showErrorMessage(err)
      });
  }

  private calculateTotals(): void {
    const data = this.gridData();
    this.receiptsAmount.set(data.reduce((sum, item) => sum + Number(item.prcptdebitamount || 0), 0));
    this.paymentsAmount.set(data.reduce((sum, item) => sum + Number(item.pcreditamount     || 0), 0));
  }

  private formatBalances(): void {
    const updated = this.totalBalanceGrid().map(item => {
      const opening = Number(item.popeningbal || 0);
      const closing = Number(item.pclosingbal || 0);
      return {
        ...item,
        popeningbal: opening === 0 ? '' : `${Math.abs(opening).toFixed(2)} ${opening < 0 ? 'Cr' : 'Dr'}`,
        pclosingbal: closing === 0 ? '' : `${Math.abs(closing).toFixed(2)} ${closing < 0 ? 'Cr' : 'Dr'}`
      };
    });
    this.totalBalanceGrid.set(updated);
    this.rawBalanceData = [...updated];
  }

  // ── PDF / Print ───────────────────────────────────────────────────────────────
  pdfOrprint(printorpdf: 'Pdf' | 'Print'): void {
    const fmt = (dateVal: any): string => {
      if (!dateVal) return '';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('en-US', { month: 'short' })}-${d.getFullYear()}`;
    };

    const fromDate = fmt(this.f['dfromdate'].value);
    const toDate   = fmt(this.f['dtodate'].value);
    this.showdate  = this.f['dtodate'].value ? 'Between' : 'As On';

    const firstgridrows: any[] = [];
    const firstgridheaders = ['Transaction\nNo.', 'Particulars', 'Type', 'Amount ', 'Transaction\nNo.', 'Particulars', 'Type  ', 'Amount  '];
    const FirstcolWidthHeight: any = {
      0: { cellWidth: 'auto', halign: 'center' }, 1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 'auto' },                   3: { cellWidth: 'auto', halign: 'right' },
      4: { cellWidth: 'auto' },                   5: { cellWidth: 'auto', halign: 'left' },
      6: { cellWidth: 'auto', halign: 'left' },   7: { cellWidth: 'auto', halign: 'right' }
    };

    const retungridData = this.commonService._getGroupingGridExportData(this.gridData(), 'prcpttransactiondate', true);

    retungridData.forEach((element: any) => {
      const debitamount  = element.prcptdebitamount ? this.commonService.convertAmountToPdfFormat(parseFloat(element.prcptdebitamount)) : this.commonService.convertAmountToPdfFormat(0);
      const paycreditamt = element.pcreditamount     ? this.commonService.convertAmountToPdfFormat(parseFloat(element.pcreditamount))     : this.commonService.convertAmountToPdfFormat(0);

      if (element.group) {
        const parts = element.group.content?.split('/');
        if (parts?.length === 3) {
          const [day, month, year] = parts;
          const d = new Date(Number(year), Number(month) - 1, Number(day));
          if (!isNaN(d.getTime())) {
            element.group.content = `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('en-US', { month: 'short' })}-${year}`;
          }
        }
        firstgridrows.push([element.group, '', '', '', '', '', '', '']);
        return;
      }
      firstgridrows.push([
        element.prcpttransactionno ?? '', element.prcptparticulars ?? '',
        element.prcptaccountname   ?? '', debitamount,
        element.ptransactionno     ?? '', element.pparticulars ?? '',
        element.paccountname       ?? '', paycreditamt
      ]);
    });

    const secondgridrows: any[] = [];
    const secondgridheaders = ['Bank Name', 'Opening Balance', 'Receipts', 'Payments', 'Closing Balance'];
    const SecondcolWidthHeight: any = {
      paccountname: { cellWidth: 'auto' }, popeningbal: { cellWidth: 'auto' },
      pdebitamount: { cellWidth: 'auto' }, pcreditamount: { cellWidth: 'auto' }, pclosingbal: { cellWidth: 'auto' }
    };

    this.totalBalanceGrid().forEach((element: any) => {
      secondgridrows.push([
        element.paccountname ?? '',
        !isNaN(parseFloat(element.popeningbal)) && parseFloat(element.popeningbal) !== 0 ? this.commonService.convertAmountToPdfFormat(parseFloat(element.popeningbal)) : '',
        Number(element.pdebitamount)  > 0 ? this.commonService.convertAmountToPdfFormat(parseFloat(element.pdebitamount))  : '',
        Number(element.pcreditamount) > 0 ? this.commonService.convertAmountToPdfFormat(parseFloat(element.pcreditamount)) : '',
        element.pclosingbal || ''
      ]);
    });

    this.commonService._downloadDayBookReportsPdf(
      'Day Book', firstgridrows, firstgridheaders, FirstcolWidthHeight, 'landscape',
      this.showdate, fromDate, toDate,
      '', secondgridrows, secondgridheaders, SecondcolWidthHeight,
      this.commonService.convertAmountToPdfFormat(String(this.receiptsAmount())),
      this.commonService.convertAmountToPdfFormat(String(this.paymentsAmount())),
      printorpdf
    );
  }

  // ── Cheques on hand ───────────────────────────────────────────────────────────
  GetChequeonHandDetails(): void {
    const today = this.commonService.getFormatDateNormal(new Date());
    this.loading.set(true);

    this.reportTransService
      .GetChequesOnHand(
        today,
        this.commonService.getbranchname(),
        this.commonService.getschemaname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res: any[]) => {
          if (res?.length) {
            this.gridDataCheques.set(res);
            this.ChequesAmount = res.reduce((sum, c) => sum + Number(c.receiptAmount || 0), 0);
            this.pdfOrprintChequesOnHand('Pdf');
          } else {
            alert('No Data To Display');
          }
        },
        error: (err:any) => this.commonService.showErrorMessage(err)
      });
  }

  pdfOrprintChequesOnHand(printOrPdf: 'Print' | 'Pdf'): void {
    const rows: any[] = [];
    this.ChequesAmount = 0;

    this.gridDataCheques().forEach((element: any) => {
      this.ChequesAmount += element?.receiptAmount || 0;
      rows.push([
        this.datePipe.transform(element?.chitReceiptDate, 'dd-MMM-yyyy'),
        element?.name,
        element?.referenceNumber,
        this.commonService.currencyformat(element?.receiptAmount),
        element?.chequeDate ? this.datePipe.transform(element.chequeDate, 'dd-MMM-yyyy') : '',
        element?.bankName,
        this.commonService.currencyformat(element?.totalReceivedAmount)
      ]);
    });

    this.commonService._downloadChequesOnHandReportsPdf(
      'Cheques On Hand', rows,
      ['Receipt Date', 'Received From', 'Cheque No.', 'Cheque Amount', 'Cheque Date', 'Bank Name', 'Receipt Amount'],
      { 0: { cellWidth: 22 }, 1: { cellWidth: 70 }, 2: { cellWidth: 38 }, 3: { cellWidth: 35, halign: 'left' }, 4: { cellWidth: 22 }, 5: { cellWidth: 48 }, 6: { cellWidth: 35, halign: 'left' } },
      'landscape', 'As On',
      this.datePipe.transform(this.f['dfromdate'].value, 'dd-MMM-yyyy') ?? '',
      this.datePipe.transform(this.f['dtodate'].value,   'dd-MMM-yyyy') ?? '',
      printOrPdf,
      this.commonService.currencyformat(this.ChequesAmount)
    );
  }

  // ── KGMS summary ──────────────────────────────────────────────────────────────
  getSummaryReport(): void {
    const fromDate = this.commonService.getFormatDateNormal(this.dayBookForm.value.dfromdate) ?? '';
    const toDate   = this.commonService.getFormatDateNormal(this.dayBookForm.value.dtodate)   ?? '';
    const branchCode = this.dayBookForm.value.branch_code || '';

    this.loading.set(true);
    this.chitService
      .GetkgmsCollectionReport(this.loginBranchschema, branchCode, fromDate, toDate, 'Summary')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res: any[]) => {
          if (!res?.length) { alert('No Data To Display'); return; }
          this.commonService.exportAsExcelFile(
            res.map(item => ({
              'Branch Name': item.pbranchname, 'Cash': item.pcash_total ?? 0,
              'Cheque': item.pcheque_total ?? 0, 'Online': item.ponlie_total ?? 0,
              'Grand Total': item.pgrandtotal ?? 0
            })),
            'KGMS WISE COLLECTION REPORT'
          );
        },
        error: (err: any) => this.commonService.showErrorMessage(err)
      });
  }

  // ── Sort – main grid ──────────────────────────────────────────────────────────
  sortMain(column: string): void {
    this.mainSortDirection = this.mainSortColumn === column
      ? (this.mainSortDirection === 1 ? -1 : 1) : 1;
    this.mainSortColumn = column;
    this.applyMainSort();
  }

  getSortIconMain(column: string): string {
    if (this.mainSortColumn !== column) return '&#8597;';
    return this.mainSortDirection === 1 ? '&#8593;' : '&#8595;';
  }

  private applyMainSort(): void {
    const { mainSortColumn: col, mainSortDirection: dir } = this;
    const groups = new Map<string, any[]>();

    [...this.rawMainData]
      .sort((a, b) => new Date(a.prcpttransactiondate).getTime() - new Date(b.prcpttransactiondate).getTime())
      .forEach(row => {
        const key = row.prcpttransactiondate;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
      });

    groups.forEach(rows =>
      rows.sort((a, b) => {
        const aVal = a[col], bVal = b[col];
        if (aVal == null) return 1; if (bVal == null) return -1;
        return typeof aVal === 'string' ? aVal.localeCompare(bVal) * dir : (aVal - bVal) * dir;
      })
    );

    this.gridData.set(Array.from(groups.values()).flat());
  }

  // ── Sort – balance grid ───────────────────────────────────────────────────────
  sortBalance(column: string): void {
    this.balanceSortDirection = this.balanceSortColumn === column
      ? (this.balanceSortDirection === 1 ? -1 : 1) : 1;
    this.balanceSortColumn = column;
    this.applyBalanceSort();
  }

  getSortIconBalance(column: string): string {
    if (this.balanceSortColumn !== column) return '&#8597;';
    return this.balanceSortDirection === 1 ? '&#8593;' : '&#8595;';
  }

  private applyBalanceSort(): void {
    const { balanceSortColumn: col, balanceSortDirection: dir } = this;
    this.totalBalanceGrid.set(
      [...this.rawBalanceData].sort((a, b) => {
        const aVal = a[col], bVal = b[col];
        if (aVal == null) return 1; if (bVal == null) return -1;
        return typeof aVal === 'string' ? aVal.localeCompare(bVal) * dir : (aVal - bVal) * dir;
      })
    );
  }
}
