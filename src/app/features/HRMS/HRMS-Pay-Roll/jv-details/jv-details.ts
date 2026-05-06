import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonService } from '../../../../core/services/Common/common.service';
import { finalize } from 'rxjs';
import { HrmsPayroll } from '../../../../core/services/hrms/hrms-payroll';
import { TableModule } from 'primeng/table';

interface JvTypeOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-jv-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, NgSelectModule,TableModule,],
  templateUrl: './jv-details.html',
  styleUrls: ['./jv-details.css']
})
export class JvDetails implements OnInit {
  private fb                  = inject(FormBuilder);
  private datePipe            = inject(DatePipe);
  private _commonService      = inject(CommonService);
  // private _employeeAttendSvc  = inject(HrmsemployeeattendanceService);
  private _payrollSvc         = inject(HrmsPayroll);

  JvDetailsForm = this.fb.group({
    pPeriodType:    [null, Validators.required],
    pCalendarMonth: [null, Validators.required],
    jvType:         [null, Validators.required],
  });

  calendarYearData  = signal<any[]>([]);
  calendarMonthData = signal<any[]>([]);
  jvdetailslist     = signal<any[]>([]);
  JvDetailsGrid     = signal<any[]>([]);

  showhidetable = signal(false);
  dataisempty   = signal(false);
  isExists      = signal(false);
  loadingShow   = signal(false);
  loadingSave   = signal(false);

  totaldebitamount  = computed(() =>
    this.JvDetailsGrid().reduce((s, r) => s + parseFloat(r.debit_amount ?? 0), 0));
  totalcreditamount = computed(() =>
    this.JvDetailsGrid().reduce((s, r) => s + parseFloat(r.credit_amount ?? 0), 0));

  currencysymbol = this._commonService.datePickerPropertiesSetup('currencysymbol');
  private BranchId   = this._commonService._getCompanyDetails().branchId;
  private CalendarId: any;
  private MonthName  = '';
  private jvType     = '';
  private employeeCode = '15517';

  ngOnInit() {
    this.jvdetailslist.set(this._commonService.hrmsjvtypes);
    this.bindCalendarYear();
  }
  ctrl(name: string): AbstractControl {
    return this.JvDetailsForm.get(name)!;
  }
get showButtonLabel(): string { return this.loadingShow() ? 'Processing...' : 'Show'; }
  get saveButtonLabel(): string { return this.loadingSave() ? 'Processing...' : 'Save'; }
  private bindCalendarYear() {
    this._payrollSvc.GetCalendarYear().subscribe(res => {
      if (res) this.calendarYearData.set(res);
    });
  }

  CalendarYear_change(event: any) {
    this.calendarMonthData.set([]);
    this.JvDetailsForm.controls.pCalendarMonth.reset();
    if (!event) { this.JvDetailsGrid.set([]); return; }

    this.CalendarId = event.pCalenderPeriodId;
    this._payrollSvc.GetCalendarYearMonthAuthorized(this.CalendarId, '15517').subscribe(res => {
      if (res) this.calendarMonthData.set(res);
    });
  }

  CalendarYearMOnth_change(event: any) {
    if (!event) return;
    this.MonthName = event.pCalendarMonth;
  }

  click_jvtype(event: any) {
    this.jvType = event?.value ?? '';
    if (!event) this.JvDetailsGrid.set([]);
  }

  getjvdetails() {
    if (this.JvDetailsForm.invalid) {
      this.JvDetailsForm.markAllAsTouched();
      return;
    }

    this.loadingShow.set(true);
    this.showhidetable.set(false);
    this.dataisempty.set(false);

    this._payrollSvc.GetJVDetails(this.employeeCode, this.MonthName.toUpperCase(), this.jvType)
      .pipe(finalize(() => this.loadingShow.set(false)))
      .subscribe({
        next: (res) => {
          if (!res?.length) { this.dataisempty.set(true); return; }

          this.JvDetailsGrid.set(res);
          this.showhidetable.set(true);

          this._payrollSvc.GetJVDetailsDuplicateCheck(this.MonthName.toUpperCase(), this.jvType)
            .subscribe(count => this.isExists.set(count === 0));
        },
        error: (err) => {
          this._commonService.showErrorMessage(err);
          this.dataisempty.set(true);
        },
      });
  }

  saveJVDetails() {
    if (!this.JvDetailsGrid().length) return;
    if (!confirm('Do you want to save?')) return;

    const payload = this.JvDetailsGrid().map(row => ({
      ...row,
      payroll_month:    this.MonthName,
      transaction_date: this._commonService.getFormatDateNormal(new Date()),
      jv_type:          this.jvType,
      schemaname:       this._commonService.getschemaname(),
      pCreatedby:       this._commonService.getCreatedBy(),
      pipaddress:       this._commonService.getIpAddress(),
    }));

    this.loadingSave.set(true);
    this._payrollSvc.SaveJVDetails(JSON.stringify(payload))
      .pipe(finalize(() => this.loadingSave.set(false)))
      .subscribe({
        next: (res:any[]) => {
          if (res) {
            this._commonService.showSuccessMessage();
            this.clearJVDetails();
          }
        },
        error: (err:any) => this._commonService.showErrorMessage(err),
      });
  }

  clearJVDetails() {
    this.JvDetailsForm.reset();
    this.JvDetailsGrid.set([]);
    this.calendarMonthData.set([]);
    this.showhidetable.set(false);
    this.dataisempty.set(false);
    this.isExists.set(false);
    this.MonthName    = '';
    this.employeeCode = 'All';
  }

  pdfOrprint(mode: 'Pdf' | 'Print') {
    const reportname = `JV's Report for: ${this.JvDetailsForm.controls.jvType.value}`;
    const headers    = ['Particulars', 'Debit Amount', 'Credit Amount'];
    const colStyles  = {
      0: { cellWidth: 'auto', halign: 'left'  },
      1: { cellWidth: 'auto', halign: 'right' },
      2: { cellWidth: 'auto', halign: 'right' },
    };

    const rows = this.JvDetailsGrid().map(el => [
      el.particulars,
      this._commonService.convertAmountToPdfFormat(el.debit_amount  ?? 0),
      this._commonService.convertAmountToPdfFormat(el.credit_amount ?? 0),
    ]);

    rows.push([
      'Total:',
      this._commonService.convertAmountToPdfFormat(this.totaldebitamount()),
      this._commonService.convertAmountToPdfFormat(this.totalcreditamount()),
    ]);

    this._payrollSvc._downloadjvdetailsPdf(reportname, rows, headers, colStyles, 'a4', '', '', '', mode);
  }
}
// {
//   submitted = false;

//   selectedYear: string | null = null;
//   selectedMonth: number | null = null;
//   selectedJvType: string | null = null;

//   yearOptions = [
//     '2020-2021',
//     '2021-2022',
//     '2022-2023',
//     '2023-2024',
//     '2024-2025',
//     '2025-2026'
//   ];

//   monthOptions = [
//     { label: 'January', value: 1 },
//     { label: 'February', value: 2 },
//     { label: 'March', value: 3 },
//     { label: 'April', value: 4 },
//     { label: 'May', value: 5 },
//     { label: 'June', value: 6 },
//     { label: 'July', value: 7 },
//     { label: 'August', value: 8 },
//     { label: 'September', value: 9 },
//     { label: 'October', value: 10 },
//     { label: 'November', value: 11 },
//     { label: 'December', value: 12 }
//   ];

//   jvTypeOptions: JvTypeOption[] = [
//     { label: 'ESI', value: 'ESI' },
//     { label: 'PROVIDENT FUND', value: 'PROVIDENT_FUND' },
//     { label: 'AO ALLOWANCES', value: 'AO_ALLOWANCES' },
//     { label: 'PROFISSIONAL TAX', value: 'PROFISSIONAL_TAX' },
//     { label: 'VDA', value: 'VDA' },
//     { label: 'HRA', value: 'HRA' },
//     { label: 'QUIT ACT ALLOWANCE', value: 'QUIT_ACT_ALLOWANCE' }
//   ];

//   onShow(): void {
//     this.submitted = true;

//     if (!this.selectedYear || !this.selectedMonth || !this.selectedJvType) {
//       return;
//     }

//     console.log('JV Details Filter', {
//       year: this.selectedYear,
//       month: this.selectedMonth,
//       jvType: this.selectedJvType
//     });
//   }

//   onClear(): void {
//     this.submitted = false;
//     this.selectedYear = null;
//     this.selectedMonth = null;
//     this.selectedJvType = null;
//   }
// }
