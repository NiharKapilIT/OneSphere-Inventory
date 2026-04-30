import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';

import { NgSelectModule } from '@ng-select/ng-select';
import { TableModule } from 'primeng/table';

import { ValidationMessageComponent } from '../../../common/validation-message/validation-message.component';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-tds-jv',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgSelectModule,
    DatePickerModule,
    TableModule,

  ],
  templateUrl: './tds-jv.html',
  providers: [DatePipe],
})
export class TdsJv implements OnInit {
  // ── Form ─────────────────────────────────────────────────────────────────
  tdsJvDetailsForm!: FormGroup;
  formValidationMessages: Record<string, string> = {};

  // ── Lookup data ──────────────────────────────────────────────────────────
  calendarYearData: any[] = [];
  calendarMonthData: any[] = [];
  ledgeraccountslist: any[] = [];
  tdsledgeraccountslist: any[] = [];
  jvdetailslist: any[] = [];

  // ── Grid ─────────────────────────────────────────────────────────────────
  tdsJvDetailsGrid: any[] = [];
  selected1: any[] = [];
  selectedValues: any[] = [];
  pageCriteria: PageCriteria;

  // ── Totals ───────────────────────────────────────────────────────────────
  totaldebitamount = 0;
  totalcreditamount = 0;

  // ── UI state ──────────────────────────────────────────────────────────────
  currencysymbol: any;
  showhidetable = false;
  dataisempty = false;
  isExists = false;
  allRowsSelected = false;

  disabletransactiondate = false;
  disablesavebutton = false;
  disablesavebutton1 = false;
  savebutton = 'Save';
  savebutton1 = 'Show';

  // ── Date helpers ─────────────────────────────────────────────────────────
  public dpConfig1: any = {};
  today = '';
  splidate: string[] = [];
  MonthName = '';
  CalendarYear = '';
  CalendarId: any;
  MonthId: any;
  jvType: any;

  // ── Misc ─────────────────────────────────────────────────────────────────
  BranchId: any;
  employeeCode: any;
  cmonth: any;
  pmonth: any;
  selected = 'btn btn-primary text-white';
  notselected = 'btn btn-default border';
  minDate: any;
  maxDate: any;


  constructor(
    private _FormBuilder: FormBuilder,
    private _commonService: CommonService,
    private _employeeAttendService: AccountsTransactions,
    private datePipe: DatePipe,
    private _AccountingTransactionsService: AccountsTransactions,
  ) {
    this.currencysymbol = this._commonService.datePickerPropertiesSetup('currencysymbol');
    this.pageCriteria = new PageCriteria();

    this.dpConfig1.maxDate = new Date();
    this.dpConfig1.containerClass = 'theme-dark-blue';
    this.dpConfig1.dateInputFormat = 'DD-MMM-YYYY';
    this.dpConfig1.showWeekNumbers = false;

    const details = this._commonService.comapnydetails;
    if (details != null) {
      this.disabletransactiondate =
        details.pdatepickerenablestatus || details.pfinclosingjvallowstatus;
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.BranchId = this._commonService.comapnydetails.pbranchid;
    this.cmonth = this.selected;
    this.pmonth = this.notselected;

    this.bindformControls();
    this.setPageModel();
    this.BindCalendarYear();
    this.gettdsaccountsledger();
    this.getaccountsledger();
    this.getCurrentMonthdetails();
    this.BlurEventAllControll(this.tdsJvDetailsForm);

    this.jvdetailslist = this._commonService.hrmsjvtypes;
    this.minDate = new Date();
    this.maxDate = new Date();
    this.tdsJvDetailsForm.controls['preceiptdate'].setValue(new Date());
  }

  // ── Page model ───────────────────────────────────────────────────────────
  setPageModel(): void {
    this.pageCriteria.pageSize = this._commonService.pageSize;
    this.pageCriteria.offset = 0;
    this.pageCriteria.pageNumber = 1;
    this.pageCriteria.footerPageHeight = 50;
  }

  onFooterPageChange(event: any): void {
    this.pageCriteria.offset = event.page - 1;
    this.pageCriteria.currentPageRows =
      this.pageCriteria.totalrows < event.page * this.pageCriteria.pageSize
        ? this.pageCriteria.totalrows % this.pageCriteria.pageSize
        : this.pageCriteria.pageSize;
  }

  // ── Ledger lookups ────────────────────────────────────────────────────────
  gettdsaccountsledger(): void {
    this._AccountingTransactionsService.GettdsLedgerAccountsList1(
      'TDS JV',
      this._commonService.getbranchname(),
      this._commonService.getCompanyCode(),
      this._commonService.getBranchCode(),
      this._commonService.getschemaname(),
    ).subscribe({
      next: (json: any) => {
        if (json != null) {
          this.tdsledgeraccountslist = json;
        }
      },
      error: (error: any) => this._commonService.showErrorMessage(error),
    });
  }

  getaccountsledger(): void {
    this._AccountingTransactionsService.GettdsLedgerAccountsList1(
      'PAYMENT VOUCHER',
      this._commonService.getbranchname(),
      this._commonService.getCompanyCode(),
      this._commonService.getBranchCode(),
      this._commonService.getschemaname(),
    ).subscribe({
      next: (json: any) => {
        if (json != null) { this.ledgeraccountslist = json; }
      },
      error: (error: any) => this._commonService.showErrorMessage(error),
    });
  }

  // ── Form setup ────────────────────────────────────────────────────────────
  bindformControls(): void {
    this.tdsJvDetailsForm = this._FormBuilder.group({
      pPeriodType: [null, Validators.required],
      DebitLedger: [null, Validators.required],
      pCalendarMonth: [null, Validators.required],
      CreditLedger: [null, Validators.required],
      preceiptdate: [''],
      pnarration: ['', Validators.required],
    });
  }

  // ── Events ────────────────────────────────────────────────────────────────

  creditLedger_change(val: any): void {
    if (val) {
      this.tdsJvDetailsForm.controls['CreditLedger'].setErrors(null);
      this.tdsJvDetailsForm.controls['CreditLedger'].markAsUntouched();
    }
  }

  click_jvtype(val: any): void {
    if (!val) {
      this.tdsJvDetailsGrid = [];
    } else {
      this.jvType = val;
      // Clear validation error as soon as a valid value is chosen
      this.tdsJvDetailsForm.controls['DebitLedger'].setErrors(null);
      this.tdsJvDetailsForm.controls['DebitLedger'].markAsUntouched();
    }
  }

  CalendarYear_change_native(selectedId: any): void {
    debugger;
    this.pmonth = this.notselected;
    this.cmonth = this.notselected;
    this.MonthName = '';
    this.tdsJvDetailsForm.controls['pCalendarMonth'].setValue(null);

    if (selectedId) {
      const found = this.calendarYearData.find(
        (y: any) => String(y.calendarPeriodId) === String(selectedId.calendarPeriodId)
      );
      if (found) {
        this.CalendarId = found.calendarPeriodId;
        this.CalendarYear = found.periodType;
        this.BindCalendarMonth();
      }
      // Clear validation error as soon as a valid value is chosen
      this.tdsJvDetailsForm.controls['pPeriodType'].setErrors(null);
      this.tdsJvDetailsForm.controls['pPeriodType'].markAsUntouched();
      this.formValidationMessages = {};
    } else {
      this.calendarMonthData = [];
      this.tdsJvDetailsGrid = [];
      this.formValidationMessages = {};
    }
  }

  // Keep old ng-select handler in case it is called elsewhere
  CalendarYear_change(event: any): void {
    debugger;
    this.pmonth = this.notselected;
    this.cmonth = this.notselected;
    if (event != null) {
      this.CalendarId = event.calendarPeriodId;
      this.CalendarYear = event.periodType;
      this.BindCalendarMonth();
      this.formValidationMessages = {};
    } else {
      this.calendarMonthData = [];
      this.tdsJvDetailsGrid = [];
      this.formValidationMessages = {};
    }
    this.MonthName = '';
    this.tdsJvDetailsForm.controls['pCalendarMonth'].setValue(null);
  }

  // CalendarYearMOnth_change_native(selectedId: any): void {
  //   if (selectedId) {
  //     const found = this.calendarMonthData.find(
  //       (m: any) => String(m.calendarPeriodDetailsId) === String(selectedId)
  //     );
  //     if (found) {
  //       this.MonthId = found.calendarPeriodDetailsId;
  //       this.MonthName = found.calendarMonth;
  //     }
  //     // Clear validation error as soon as a valid value is chosen
  //     this.tdsJvDetailsForm.controls['pCalendarMonth'].setErrors(null);
  //     this.tdsJvDetailsForm.controls['pCalendarMonth'].markAsUntouched();
  //   }
  // }

  CalendarYearMOnth_change_native(selectedId: any): void {
    if (selectedId) {
      const found = this.calendarMonthData.find(
        (m: any) => String(m.calendarPeriodDetailsId) === String(selectedId)
      );
      if (found) {
        this.MonthId = found.calendarPeriodDetailsId;
        this.MonthName = found.calendarMonth; // ✅ This sets MonthName
      }
      this.tdsJvDetailsForm.controls['pCalendarMonth'].setErrors(null);
      this.tdsJvDetailsForm.controls['pCalendarMonth'].markAsUntouched();
    } else {
      this.MonthName = '';
      this.MonthId = null;
    }
  }

  CalendarYearMOnth_change(event: any): void {
    if (event) {
      this.MonthId = event.calendarPeriodDetailsId;
      this.MonthName = event.calendarMonth;
    }
  }

  // ── Calendar helpers ──────────────────────────────────────────────────────
  BindCalendarYear(): void {
    this._employeeAttendService
      .GetCalendarYear(this._commonService.getschemaname())
      .subscribe((res: any) => {
        if (res != null) { this.calendarYearData = res; }
      });
  }

  // BindCalendarMonth(): void {
  //   debugger
  //   this.calendarMonthData = [];
  //   this._employeeAttendService
  //     .GetTDSJVCalendarYearMonth(this.CalendarId, this._commonService.getschemaname())
  //     .subscribe((res: any) => {
  //       if (res != null) { this.calendarMonthData = res; }
  //     });

  //   const ctrl = this.tdsJvDetailsForm.controls['pCalendarMonth'];
  //   ctrl.setValidators([Validators.required]);
  //   ctrl.updateValueAndValidity();
  //   ctrl.setValue(null);
  // }

  BindCalendarMonth(): void {
    this.calendarMonthData = [];
    this.MonthName = '';
    this.MonthId = null;

    if (!this.CalendarId) return;

    this._employeeAttendService
      .GetTDSJVCalendarYearMonth(this.CalendarId, this._commonService.getschemaname())
      .subscribe({
        next: (res: any) => {
          this.calendarMonthData = res ? [...res] : []; // spread creates new reference
        },
        error: (error: any) => {
          this.calendarMonthData = [];
          this._commonService.showErrorMessage(error);
        }
      });

    const ctrl = this.tdsJvDetailsForm.controls['pCalendarMonth'];
    ctrl.setValidators([Validators.required]);
    ctrl.updateValueAndValidity();
    ctrl.setValue(null);
  }

  getCurrentMonthdetails(): void {
    this.formValidationMessages = {};
    this.pmonth = this.notselected;
    this.cmonth = this.selected;

    this.today = this.datePipe.transform(new Date(), 'dd-MMM-yyyy')!;
    this.splidate = this.today.split('-');
    this.MonthName = `${this.splidate[1]}-${this.splidate[2]}`;
    const year = parseInt(this.splidate[2], 10) - 1;
    this.CalendarYear = `${year}-${this.splidate[2]}`;

    this.tdsJvDetailsForm.controls['pPeriodType'].setValue(null);
    this.tdsJvDetailsForm.controls['pCalendarMonth'].setValue(null);
  }

  getPreviousMonthdetails(): void {
    this.formValidationMessages = {};
    this.pmonth = this.selected;
    this.cmonth = this.notselected;

    const previous = new Date();
    previous.setMonth(previous.getMonth() - 1);

    this.today = this.datePipe.transform(previous, 'dd-MMM-yyyy') ?? '';
    this.splidate = this.today.split('-');
    this.MonthName = `${this.splidate[1]}-${this.splidate[2]}`;
    const year = parseInt(this.splidate[2], 10) - 1;
    this.CalendarYear = `${year}-${this.splidate[2]}`;

    this.tdsJvDetailsForm.controls['pPeriodType'].setValue(null);
    this.tdsJvDetailsForm.controls['pCalendarMonth'].setValue(null);

    const periodCtrl = this.tdsJvDetailsForm.controls['pPeriodType'];
    const monthCtrl = this.tdsJvDetailsForm.controls['pCalendarMonth'];
    periodCtrl.clearValidators();
    monthCtrl.clearValidators();
  }

  // ── Grid fetch ────────────────────────────────────────────────────────────
  // gettdsjvdetails(): void {
  //   this.selected1         = [];
  //   this.selectedValues    = [];
  //   this.totaldebitamount  = 0;
  //   this.totalcreditamount = 0;
  //   this.showhidetable     = false;
  //   this.dataisempty       = false;
  //   this.tdsJvDetailsGrid  = [];

  //   const creditledger    = this.tdsJvDetailsForm.controls['CreditLedger'].value || '';
  //   const debitledger     = this.tdsJvDetailsForm.controls['DebitLedger'].value  || '';
  //   const selectedMonth    = this.tdsJvDetailsForm.controls['pCalendarMonth'].value;
  //   const monthYear       = (this.MonthName || selectedMonth || '').toString().toUpperCase();

  //   if (!debitledger) {
  //     this._commonService.showWarningMessage('Please select Debit Ledger');
  //     this.tdsJvDetailsForm.controls['DebitLedger'].markAsTouched();
  //     return;
  //   }
  //   if (!creditledger) {
  //     this._commonService.showWarningMessage('Please select Credit Ledger');
  //     this.tdsJvDetailsForm.controls['CreditLedger'].markAsTouched();
  //     return;
  //   }
  //   if (!monthYear) {
  //     this._commonService.showWarningMessage('Please select Year and Month');
  //     return;
  //   }

  //   this.savebutton1        = 'Processing';
  //   this.disablesavebutton1 = true;

  gettdsjvdetails(): void {
    debugger
    this.selected1 = [];
    this.selectedValues = [];
    this.totaldebitamount = 0;
    this.totalcreditamount = 0;
    this.showhidetable = false;
    this.dataisempty = false;
    this.tdsJvDetailsGrid = [];

    const creditledger = this.tdsJvDetailsForm.controls['CreditLedger'].value || '';
    const debitledger = this.tdsJvDetailsForm.controls['DebitLedger'].value || '';
    const selectedYear = this.tdsJvDetailsForm.controls['pPeriodType'].value;
    const selectedMonth = this.tdsJvDetailsForm.controls['pCalendarMonth'].value;
    const monthYear = (this.CalendarYear || '').toString().toUpperCase();
    // const monthYear = (this.MonthName || '').toString().toUpperCase();

    if (!debitledger) {
      this._commonService.showWarningMessage('Please select Debit Ledger');
      this.tdsJvDetailsForm.controls['DebitLedger'].markAsTouched();
      return;
    }
    if (!creditledger) {
      this._commonService.showWarningMessage('Please select Credit Ledger');
      this.tdsJvDetailsForm.controls['CreditLedger'].markAsTouched();
      return;
    }

    // ── NEW: validate Year ──────────────────────────────────────────────────
    if (!selectedYear) {
      this._commonService.showWarningMessage('Please select Year');
      this.tdsJvDetailsForm.controls['pPeriodType'].markAsTouched();
      return;
    }

    // ── NEW: validate Month ─────────────────────────────────────────────────
    if (!selectedMonth || !this.CalendarYear) {
      this._commonService.showWarningMessage('Please select Month');
      this.tdsJvDetailsForm.controls['pCalendarMonth'].markAsTouched();
      return;
    }

    if (!this.CalendarYear) {
      this._commonService.showWarningMessage('Please select Year and Month');
      return;
    }

    this.savebutton1 = 'Processing';
    this.disablesavebutton1 = true;

    this._AccountingTransactionsService.GettdsJVDetails(
      this._commonService.getbranchname(),
      creditledger,
      monthYear,
      debitledger,
      this._commonService.getschemaname(),
      this._commonService.getBranchCode(),
      this._commonService.getCompanyCode(),
    ).subscribe({
      next: (res: any[]) => {
        const validRecords = (res ?? []).filter(
          (item: any) =>
            (item.particulars && item.particulars.trim() !== '') ||
            Number(item.debit_amount) > 0 ||
            Number(item.credit_amount) > 0,
        );

        if (validRecords.length > 0) {
          this.tdsJvDetailsGrid = validRecords.map((item: any) => ({
            ...item,
            debit_amount: Number(item.debit_amount) || 0,
            credit_amount: Number(item.credit_amount) || 0,
          }));

          this.showhidetable = true;
          this.dataisempty = false;

          this.totaldebitamount = this.tdsJvDetailsGrid.reduce((s, r) => s + r.debit_amount, 0);
          this.totalcreditamount = this.tdsJvDetailsGrid.reduce((s, r) => s + r.credit_amount, 0);

          this.pageCriteria.totalrows = this.tdsJvDetailsGrid.length;
          this.pageCriteria.TotalPages = Math.ceil(this.pageCriteria.totalrows / this.pageCriteria.pageSize);
          this.pageCriteria.currentPageRows = Math.min(this.tdsJvDetailsGrid.length, this.pageCriteria.pageSize);

          this._AccountingTransactionsService.GetTDSJVDetailsDuplicateCheck(
            this._commonService.getbranchname(),
            debitledger,
            monthYear,
            this._commonService.getschemaname(),
            this._commonService.getCompanyCode(),
            this._commonService.getBranchCode(),
          ).subscribe((result: any) => {
            this.isExists = !(result > 0);
          });
        } else {
          this.tdsJvDetailsGrid = [];
          this.showhidetable = false;
          this.dataisempty = true;
          this.totaldebitamount = 0;
          this.totalcreditamount = 0;
          this.isExists = false;
        }

        this.savebutton1 = 'Show';
        this.disablesavebutton1 = false;
      },
      error: (error: any) => {
        this.tdsJvDetailsGrid = [];
        this.showhidetable = false;
        this.dataisempty = true;
        this.totaldebitamount = 0;
        this.totalcreditamount = 0;
        this.isExists = false;
        this.savebutton1 = 'Show';
        this.disablesavebutton1 = false;
        this._commonService.showErrorMessage(error);
      },
    });
  }



  // ── Selection ─────────────────────────────────────────────────────────────
  onSelect(event: any): void {
    this.selected1 = event ?? [];

    this.totaldebitamount = this.selected1.reduce(
      (sum, c) => sum + Number(c?.debit_amount || 0), 0,
    );
    this.totalcreditamount = this.selected1.reduce(
      (sum, c) => sum + Number(c?.credit_amount || 0), 0,
    );

    this.selectedValues = [...this.selected1];
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  saveJVDetails(): void {
    try {
      this.disablesavebutton = true;
      this.savebutton = 'Processing';

      if (this.selectedValues.length === 0) {
        this._commonService.showWarningMessage('No rows selected');
        this.resetSaveButton();
        return;
      }

      const creditRows = this.selectedValues.filter(r => r.account_trans_type === 'C');
      const debitRows = this.selectedValues.filter(r => r.account_trans_type === 'D');

      if (creditRows.length === 0 || debitRows.length === 0) {
        this._commonService.showWarningMessage('Please select at least one Debit and one Credit row');
        this.resetSaveButton();
        return;
      }

      const totalDebit = debitRows.reduce((s, r) => s + Number(r.debit_amount || 0), 0);
      const totalCredit = creditRows.reduce((s, r) => s + Number(r.credit_amount || 0), 0);

      if (totalDebit !== totalCredit) {
        this._commonService.showWarningMessage('Debit and Credit amounts must be equal');
        this.resetSaveButton();
        return;
      }

      if (!confirm('Do you want to save?')) {
        this.resetSaveButton();
        return;
      }

      const payload = {
        model: 'JOURNAL VOUCHER',
        global_schema: this._commonService.getschemaname(),
        branch_schema: this._commonService.getbranchname(),
        company_code: this._commonService.getCompanyCode(),
        branch_code: this._commonService.getBranchCode(),
        createdby: Number(this._commonService.getCreatedBy()) || 0,
        ipaddress: this._commonService.getIpAddress() || '',
        transaction_date: this._commonService.getFormatDateNormal(
          this.tdsJvDetailsForm.controls['preceiptdate'].value,
        ),
        payroll_month: this.MonthName,
        jv_type: this.tdsJvDetailsForm.controls['DebitLedger'].value || '',
        narration: this.tdsJvDetailsForm.controls['pnarration']?.value || '',
        jv_details: this.selectedValues.map(row => ({
          account_id: String(row.account_id),
          account_trans_type: row.account_trans_type,
          particulars: row.particulars || '',
          debit_amount: String(row.account_trans_type === 'D' ? row.debit_amount || 0 : 0),
          credit_amount: String(row.account_trans_type === 'C' ? row.credit_amount || 0 : 0),
        })),
      };

      this._AccountingTransactionsService.saveTDSjvdetails(JSON.stringify(payload)).subscribe({
        next: () => {
          this._commonService.showSuccessMessage();
          this.clearAllFields();
          this.tdsJvDetailsGrid = [];
          this.selectedValues = [];
          this.totaldebitamount = 0;
          this.totalcreditamount = 0;
          this.allRowsSelected = false;
          this.resetSaveButton();
        },
        error: (error: any) => {
          this.resetSaveButton();
          this._commonService.showErrorMessage(error);
        },
      });
    } catch (error: any) {
      this.resetSaveButton();
      this._commonService.exceptionHandlingMessages('JVDetails', 'SavePayrollProcess', error);
    }
  }

  private resetSaveButton(): void {
    this.disablesavebutton = false;
    this.savebutton = 'Save';
  }

  // ── Clear ─────────────────────────────────────────────────────────────────
  clearJVDetails(): void {
    this.clearAllFields();
  }

  clearAllFields(): void {
    this.bindformControls();
    this.tdsJvDetailsGrid = [];
    this.calendarMonthData = [];
    this.formValidationMessages = {};
    this.tdsJvDetailsForm.controls['preceiptdate'].setValue(new Date());
    this.MonthName = '';
    this.CalendarYear = '';
    this.getCurrentMonthdetails();
    this.employeeCode = 'All';
    this.selected1 = [];
    this.showhidetable = false;
    this.dataisempty = false;
    this.isExists = false;
  }

  // ── Export ────────────────────────────────────────────────────────────────
  export(): void {
    const rows = this.tdsJvDetailsGrid.map((element: any) => ({
      Particulars: element.particulars,
      'Debit Amount': element.debit_amount !== 0 ? element.debit_amount : 0,
      'Credit Amount': element.credit_amount !== 0 ? element.credit_amount : 0,
    }));
    this._commonService.exportAsExcelFile(rows, 'TDS-Jv');
  }

  // ── Validation helpers ────────────────────────────────────────────────────
  BlurEventAllControll(fromgroup: FormGroup): void {
    try {
      Object.keys(fromgroup.controls).forEach(key => this.setBlurEvent(fromgroup, key));
    } catch (error: any) {
      this._commonService.exceptionHandlingMessages('JVDetails', 'BlurEventAllControll', error);
    }
  }

  setBlurEvent(fromgroup: FormGroup, key: string): void {
    try {
      const formcontrol = fromgroup.get(key);
      if (formcontrol) {
        if (formcontrol instanceof FormGroup) {
          this.BlurEventAllControll(formcontrol);
        } else if (formcontrol.validator) {
          fromgroup.get(key)?.valueChanges.subscribe(() =>
            this.GetValidationByControl(fromgroup, key, true),
          );
        }
      }
    } catch (error: any) {
      this._commonService.exceptionHandlingMessages('JVDetails', 'setBlurEvent', error);
    }
  }

  checkValidations(group: FormGroup, isValid: boolean): boolean {
    try {
      Object.keys(group.controls).forEach(key => {
        isValid = this.GetValidationByControl(group, key, isValid);
      });
    } catch (error: any) {
      this._commonService.showErrorMessage(error);
      return false;
    }
    return isValid;
  }

  GetValidationByControl(formGroup: FormGroup, key: string, isValid: boolean): boolean {
    try {
      const formcontrol = formGroup.get(key);
      if (formcontrol) {
        if (formcontrol instanceof FormGroup) {
          this.checkValidations(formcontrol, isValid);
        } else if (formcontrol.validator) {
          this.formValidationMessages[key] = '';
          if (formcontrol.errors || formcontrol.invalid || formcontrol.touched || formcontrol.dirty) {
            const element = document.getElementById(key) as HTMLInputElement;
            const lablename = element?.title || key;

            for (const errorkey in formcontrol.errors) {
              if (errorkey) {
                const msg = this._commonService.getValidationMessage(formcontrol, errorkey, lablename, key, '');
                this.formValidationMessages[key] += msg + ' ';
                isValid = false;
              }
            }
          }
        }
      }
    } catch (error: any) {
      this._commonService.exceptionHandlingMessages('JV Details', 'GetValidationByControl', error);
      return false;
    }
    return isValid;
  }
}
