import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from "@angular/core";
import { AccountRow, ReportHeader, ScheduleTbRequest } from "../../../../core/models/schedule-tb-model";
import { AccountsReports } from "../../../../core/services/accounts/accounts-reports";
import { DatePipe, DecimalPipe, NgClass } from "@angular/common";
import { CommonService } from "../../../../core/services/Common/common.service";
import { FormsModule, NgForm } from "@angular/forms";
import { DatePicker } from "primeng/datepicker";
interface DisplayRow {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  debit: number | null;
  credit: number | null;
}

@Component({
  selector: "app-schedule-tb-report",
  imports: [DecimalPipe,FormsModule, DatePicker, NgClass],
  templateUrl: "./schedule-tb-report.html",
  styleUrl: "./schedule-tb-report.css",
})
export class ScheduleTbReport {
  private readonly scheduleService = inject(AccountsReports);
  // private readonly exportService = inject(ScheduleTbExportService);
  private commonService = inject(CommonService);
  private datepipe=inject(DatePipe);

  @ViewChild('reportRef', { static: false }) reportRef!: ElementRef<HTMLElement>;

  /* -----------------------------------------------------------------
   *  State (signals)
   * ----------------------------------------------------------------- */
  // loading = signal(false);
  // error = signal<string | null>(null);
  // collapsed = signal(false);
  // rows = signal<AccountRow[]>([]);

  loading   = signal(false);
  error     = signal<string | null>(null);
  errorMsg  = signal<string | null>(null);
  collapsed = signal(false);
  submitted = signal(false);
  btnPrint  = signal('Print');
  rows      = signal<AccountRow[]>([]);

  asOnDate: Date | null = null;
  pDatepickerMaxDate    = new Date();

  /* Header info — adjust or wire to your master tables */
  companyDetails = this.commonService._getCompanyDetails();
  today=this.datepipe.transform(new Date().toString(),'dd-MMM-yyyy');

  header: ReportHeader = {
    companyName: this.companyDetails.companyName,
    address: this.companyDetails.registrationAddress,
    cin: this.companyDetails.cinNumber,
    branch: this.companyDetails.branchName,
    asOnDate: this.today??'',
  };

  /* Request parameters — bind these to your filter form */
  request: ScheduleTbRequest = {
    date: this.today??'',
    companyCode: this.commonService.getCompanyCode(),
    branchCode: this.commonService.getBranchCode(),
  };

  /* Flat list of rows the template renders, in display order with level info */
  displayRows = computed<DisplayRow[]>(() => this.flatten(this.rows()));

  /* Grand totals */
  grandDebit = computed(() =>
    this.rows().reduce((s, r) => s + r.debitamount, 0)
  );
  grandCredit = computed(() =>
    this.rows().reduce((s, r) => s + r.creditamount, 0)
  );

  /* -----------------------------------------------------------------
   *  Lifecycle
   * ----------------------------------------------------------------- */
  // ngOnInit(): void {
  //   this.loadReport();
  // }

  // loadReport(): void {
  //   this.loading.set(true);
  //   this.error.set(null);
  //   this.scheduleService.fetchScheduleTb(this.request).subscribe({
  //     next: (rows:any[]) => {
  //       this.rows.set(rows);
  //       this.loading.set(false);
  //     },
  //     error: (err:any) => {
  //       this.error.set(err?.message ?? 'Failed to load report');
  //       this.loading.set(false);
  //     },
  //   });
  // }
  print(form: NgForm): void {
  this.submitted.set(true);
  this.errorMsg.set(null);

  if (form.invalid || !this.asOnDate) {
    this.errorMsg.set('Please fill all required fields.');
    return;
  }

  const formatted = this.datepipe.transform(this.asOnDate, 'dd-MMM-yyyy') ?? '';

  // Update header date for display
  this.header = { ...this.header, asOnDate: formatted };

  const request: ScheduleTbRequest = {
    date        : formatted,
    companyCode : this.commonService.getCompanyCode(),
    branchCode  : this.commonService.getBranchCode(),
  };

  this.loadReport(request);
}
private loadReport(request: ScheduleTbRequest): void {
  this.loading.set(true);
  this.error.set(null);
  this.rows.set([]);          // ← clears previous table instantly

  this.scheduleService.fetchScheduleTb(request).subscribe({
    next: (rows: any[]) => {
      this.rows.set(rows);
      this.loading.set(false);
    },
    error: (err: any) => {
      const status = err?.status;
      if (status === 404 || status === 204 || status === 400) {
        alert('No data found for the selected date.');
      } else {
        this.errorMsg.set('An error occurred while fetching report data.');
      }
          this.resetBtn();
    },
  });
}
private resetBtn(): void {
    this.loading.set(false);
    this.btnPrint.set('Print');
  }

  /* -----------------------------------------------------------------
   *  Flatten the tree into display rows with their level
   * ----------------------------------------------------------------- */
  private flatten(rows: AccountRow[]): DisplayRow[] {
    if (!rows.length) return [];
    const tree = this.scheduleService.buildTree(rows);
    const out: DisplayRow[] = [];
    const mains = this.scheduleService.sortMains(Object.keys(tree));

    for (const main of mains) {
      out.push({ level: 1, label: main, debit: null, credit: null });

      for (const grp of Object.keys(tree[main])) {
        out.push({ level: 2, label: grp, debit: null, credit: null });

        for (const sg of Object.keys(tree[main][grp])) {
          if (sg !== grp)
            out.push({ level: 3, label: sg, debit: null, credit: null });

          for (const sh of Object.keys(tree[main][grp][sg])) {
            if (sh !== sg)
              out.push({ level: 4, label: sh, debit: null, credit: null });

            for (const acc of tree[main][grp][sg][sh]) {
              out.push({
                level: 5,
                label: acc.vchaccountname,
                debit: acc.debitamount || null,
                credit: acc.creditamount || null,
              });
            }
          }
        }
      }
    }
    return out;
  }

  /* -----------------------------------------------------------------
   *  Toolbar actions
   * ----------------------------------------------------------------- */
  // onExportPdf(): void {
  //   this.exportService.exportPdf(this.reportRef.nativeElement, this.header);
  // }
  // onExportExcel(): void {
  //   this.exportService.exportExcel(this.rows(), this.header);
  // }
  // onPrint(): void {
  //   this.exportService.print();
  // }
  // onEmail(): void {
  //   this.exportService.sendEmail(this.header);
  // }
  onToggle(): void {
    this.collapsed.update((v) => !v);
  }

  /* trackBy for *ngFor performance */
  trackByIndex = (i: number) => i;
}