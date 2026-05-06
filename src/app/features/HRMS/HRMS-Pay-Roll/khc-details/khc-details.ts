





// ─────────────────────────────────────────────────────────────────────────────
// ANGULAR 17+ CONCEPTS USED:
//  1.  Standalone Component  (standalone: true)
//  2.  inject()              (replaces constructor DI)
//  3.  Signals               (signal(), computed())
//  4.  OnInit lifecycle      (implements OnInit)
//  5.  FormBuilder (reactive forms) with typed controls
//  6.  Validators            (Validators.required)
//  7.  BsDatepickerConfig    (ngx-bootstrap)
//  8.  PageCriteria model
//  9.  takeUntilDestroyed()  (replaces manual unsubscribe/ngOnDestroy)
// 10.  DestroyRef            (used by takeUntilDestroyed)
// 11.  NgClass directive     (used in template via [ngClass])
// 12.  CommonModule          (NgIf, NgClass in standalone imports)
// 13.  ReactiveFormsModule   (formGroup, formControlName)
// 14.  TableModule           (p-table PrimeNG)
// 15.  ButtonModule          (PrimeNG buttons)
// 16.  PrimeNG icons         (pi pi-check, pi-times, pi-pencil etc.)
// 17.  @if / @else           (Angular 17 built-in control flow, used in template)
// 18.  Arrow-function subscribe error handler (fixes old bug)
// 19.  readonly signals for UI state (ShowHideDate, ShowHideDateEdit)
// 20.  Strict null checks / optional chaining (?.)
// 21.  input() / output()    (signal-based input/output — ready for future use)
// ─────────────────────────────────────────────────────────────────────────────

import { Component, OnInit, inject, DestroyRef, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { BsDatepickerModule, BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { CommonService } from '../../../../core/services/Common/common.service';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { HrmsPayroll } from '../../../../core/services/hrms/hrms-payroll';
import { HrmsReports } from '../../../../core/services/hrms/hrms-reports';
import { DatePickerModule } from 'primeng/datepicker';

// import { CommonService }                  from 'src/app/Services/common.service';
// import { SscagendsService }               from 'src/app/Services/HRMS/sscagends.service';
// import { HrmseployeeattendanceService }   from 'src/app/Services/HRMS/hrmseployeeattendance.service';
// import { HrmsreportsService }             from 'src/app/Services/HRMS/hrmsreports.service';
// import { PageCriteria }                   from 'src/app/Models/pagecriteria';
// import { DatePipe }                       from '@angular/common';

// ─────────────────────────────────────────────────────────────────────────────

interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

@Component({


  selector: 'app-khc-details',


  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    BsDatepickerModule,
    DatePickerModule
  ],

  templateUrl: './khc-details.html',
  styles: [],
  providers: [DatePipe],
})
export class KhcDetails implements OnInit {  // CONCEPT 4 — OnInit

  // ── CONCEPT 2: inject() replaces constructor parameter injection ───────────
  private _FormBuilder = inject(FormBuilder);
  private _commonService = inject(CommonService);
  private sscAgendaService = inject(HrmsPayroll);
  private _hrmsreportsService = inject(HrmsReports);
  private datePipe = inject(DatePipe);
  private destroyRef = inject(DestroyRef);

  // ── CONCEPT 3: Signals for reactive UI state ──────────────────────────────
  ShowHideDate = signal<boolean>(true);
  ShowHideDateEdit = signal<boolean>(false);
  savebutton = signal<string>('Save');
  disablesavebutton = signal<boolean>(false);

  // ── Standard properties ───────────────────────────────────────────────────
  pageCriteria: PageCriteria;
  currencysymbol: any;
  // EmployeeData: any[] = [];
  EmployeeData = [
    {
        "pContactName": "Ettaboina Venugopal",
        "pSurname": "Ettaboina",
        "pEmployeeId": 11347,
        "pEmployeecode": "KCE06075",
        "pContactId": 208892,
        "pEmployeeName": "Venugopal",
        "pContactNo": "9963602202",
        "pEmailid": "",
        "pDesignationId": 203,
        "pDesignation": "CLERK-CHIT ACT",
        "pBasicAmount": null,
        "pAllowanceAmount": null,
        "pSpecialAllowanceAmount": null,
        "pCtcAmount": null,
        "pnewChargeDate": null,
        "pPfno": "101659176045",
        "pEsino": "",
        "pKhcno": "789654123",
        "pBloodGroup": null,
        "pDateOfReporting": null,
        "pDateOfJoining": "12-11-2019",
        // "pDateOfJoining": "2019-11-12",
        "pSscMinutesDate": null,
        "pCL": null,
        "pSL": null,
        "pOthers": null,
        "pCLeave": null,
        "pSLeave": null,
        "pAvbSL": null,
        "pAvbCL": null,
        "pAvbOther": null,
        "pLOP": null,
        "pUsedCl": null,
        "pUsedSl": null,
        "pUsedOl": null,
        "pPanNo": null,
        "pGrossSalary": null,
        "pNetSalary": null,
        "pProffesionalTax": null,
        "pAadharNo": null,
        "pUANno": null,
        "plastpayrolldate": null,
        "ppolicystatus": "R",
        "pdateofpolicy": "04-20-2026",
        "pdateofpolicyrenewal": "04-20-2026",
        // "pdateofpolicy": "2026-04-20",
        // "pdateofpolicyrenewal": "2026-04-20",
        "ppolicyamount": 200,
        "ppolicyId": 24,
        "pmobileno": null,
        "pdateofbirth": null,
        "pCreatedby": null,
        "pStatusid": null,
        "pStatusname": null,
        "ptypeofoperation": null,
        "pipaddress": null,
        "pactivitytype": null,
        "currencyformat": null,
        "dateformat": null,
        "schemaname": null,
        "preleasetype": null,
        "pbranchid": null,
        "ppayrollbranchid": null
    },
   {
        "pContactName": "Roopa Devi Domakonda",
        "pSurname": "Domakonda",
        "pEmployeeId": 7636,
        "pEmployeecode": "KCE03213",
        "pContactId": 30916,
        "pEmployeeName": "Roopa Devi",
        "pContactNo": "9381143862",
        "pEmailid": "",
        "pDesignationId": 1856,
        "pDesignation": "JR.ACCOUNTS OFFICER",
        "pBasicAmount": null,
        "pAllowanceAmount": null,
        "pSpecialAllowanceAmount": null,
        "pCtcAmount": null,
        "pnewChargeDate": null,
        "pPfno": "APKKP0062191000001620",
        "pEsino": "",
        "pKhcno": "104-00026-59417",
        "pBloodGroup": null,
        "pDateOfReporting": null,
        "pDateOfJoining": "02-04-2009",
        // "pDateOfJoining": "2009-04-02",
        "pSscMinutesDate": null,
        "pCL": null,
        "pSL": null,
        "pOthers": null,
        "pCLeave": null,
        "pSLeave": null,
        "pAvbSL": null,
        "pAvbCL": null,
        "pAvbOther": null,
        "pLOP": null,
        "pUsedCl": null,
        "pUsedSl": null,
        "pUsedOl": null,
        "pPanNo": null,
        "pGrossSalary": null,
        "pNetSalary": null,
        "pProffesionalTax": null,
        "pAadharNo": null,
        "pUANno": null,
        "plastpayrolldate": null,
        "ppolicystatus": "R",
        "pdateofpolicy": "01-11-2024",
        "pdateofpolicyrenewal": "31-10-2025",
        // "pdateofpolicy": "2024-11-01",
        // "pdateofpolicyrenewal": "2025-10-31",
        "ppolicyamount": 1000000,
        "ppolicyId": 16,
        "pmobileno": null,
        "pdateofbirth": null,
        "pCreatedby": null,
        "pStatusid": null,
        "pStatusname": null,
        "ptypeofoperation": null,
        "pipaddress": null,
        "pactivitytype": null,
        "currencyformat": null,
        "dateformat": null,
        "schemaname": null,
        "preleasetype": null,
        "pbranchid": null,
        "ppayrollbranchid": null
    },
      {
        "pContactName": "Sambaraju Chiranjeevi",
        "pSurname": "Sambaraju",
        "pEmployeeId": 3149,
        "pEmployeecode": "KCE02184",
        "pContactId": 13962,
        "pEmployeeName": "Chiranjeevi",
        "pContactNo": "9949299694",
        "pEmailid": "",
        "pDesignationId": 203,
        "pDesignation": "CLERK-CHIT ACT",
        "pBasicAmount": null,
        "pAllowanceAmount": null,
        "pSpecialAllowanceAmount": null,
        "pCtcAmount": null,
        "pnewChargeDate": null,
        "pPfno": "AP/WGL/58673/317",
        "pEsino": "5213097820",
        "pKhcno": null,
        "pBloodGroup": null,
        "pDateOfReporting": null,
        "pDateOfJoining": "04-07-2002",
        // "pDateOfJoining": "2002-07-04",
        "pSscMinutesDate": null,
        "pCL": null,
        "pSL": null,
        "pOthers": null,
        "pCLeave": null,
        "pSLeave": null,
        "pAvbSL": null,
        "pAvbCL": null,
        "pAvbOther": null,
        "pLOP": null,
        "pUsedCl": null,
        "pUsedSl": null,
        "pUsedOl": null,
        "pPanNo": null,
        "pGrossSalary": null,
        "pNetSalary": null,
        "pProffesionalTax": null,
        "pAadharNo": null,
        "pUANno": null,
        "plastpayrolldate": null,
        "ppolicystatus": "Y",
        "pdateofpolicy": "",
        "pdateofpolicyrenewal": "",
        "ppolicyamount": 0,
        "ppolicyId": {},
        "pmobileno": null,
        "pdateofbirth": null,
        "pCreatedby": null,
        "pStatusid": null,
        "pStatusname": null,
        "ptypeofoperation": null,
        "pipaddress": null,
        "pactivitytype": null,
        "currencyformat": null,
        "dateformat": null,
        "schemaname": null,
        "preleasetype": null,
        "pbranchid": null,
        "ppayrollbranchid": null
    },
  ];
  BranchId: any;

  // CONCEPT 5 — Typed reactive FormGroup
  PolicyDetailsForm!: FormGroup;

  public today = new Date();
  formValidationMessages: any = {};

  EmployeeName: any;
  Designation: any;
  DesignationId: any;
  EmployeeId: any;
  pdateofjoining: any = new Date;

  // ── Datepicker configs ────────────────────────────────────────────────────
  public pDobConfig: Partial<BsDatepickerConfig> = new BsDatepickerConfig();
  public pDobConfig1: Partial<BsDatepickerConfig> = new BsDatepickerConfig();
  public pDobConfig2: Partial<BsDatepickerConfig> = new BsDatepickerConfig();
  public pDobConfig3: Partial<BsDatepickerConfig> = new BsDatepickerConfig();

  constructor() {
    // CONCEPT 2 — inject() used above; constructor is clean
    this.currencysymbol = this._commonService.datePickerPropertiesSetup('currencysymbol');
    this.pageCriteria = new PageCriteria();           // CONCEPT 8 — PageCriteria model
    this.BindDates();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONCEPT 4 — ngOnInit lifecycle hook
  // ══════════════════════════════════════════════════════════════════════════
  ngOnInit(): void {
    this.BranchId = this._commonService.comapnydetails.pbranchid;
    this.setPageModel();
    this.GetEmployeeDetails();
    this.BindFormControls();
    this.BlurEventAllControll(this.PolicyDetailsForm);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FORM SETUP — CONCEPT 5 + 6
  // ══════════════════════════════════════════════════════════════════════════
  BindFormControls(): void {
    this.PolicyDetailsForm = this._FormBuilder.group({
      pdateofjoining: [this.today],
      // pdateofjoining: [{ value: new Date(), disabled: true }],
      pdateofpolicy: [this.today],
      pdateofpolicyrenewal: [this.today],
      pemployeecontactid: [''],
      pdesignationid: [''],
      pkhcno: ['', Validators.required],
      ppolicyamount: ['', Validators.required],
      pEmployeeName: [''],
      pEmployeeCode: [''],
      ppolicystatus: [''],
      pDesignation: [''],
      ppolicyid: [''],
      pBranchid: [this._commonService.getbrachid()],
      pStatus: [null],
      schemaname: [this._commonService.getschemaname()],
      pCreatedby: [this._commonService.getCreatedBy()],
      ptypeofoperation: [this._commonService.ptypeofoperation],
      pipaddress: [this._commonService.getIpAddress()],

    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONCEPT 7 — BsDatepickerConfig setup
  // ══════════════════════════════════════════════════════════════════════════
  BindDates(): void {
    // // Join Date — max today
    // this.pDobConfig.containerClass  = this._commonService.datePickerPropertiesSetup('containerClass');
    // this.pDobConfig.showWeekNumbers = false;
    // this.pDobConfig.maxDate         = new Date();
    // this.pDobConfig.dateInputFormat = this._commonService.datePickerPropertiesSetup('dateInputFormat');

    // // Policy Date — max today
    // this.pDobConfig1.containerClass  = this._commonService.datePickerPropertiesSetup('containerClass');
    // this.pDobConfig1.showWeekNumbers = false;
    // this.pDobConfig1.maxDate         = new Date();
    // this.pDobConfig1.dateInputFormat = this._commonService.datePickerPropertiesSetup('dateInputFormat');

    // // Renewal Date — no max (future dates allowed)
    // this.pDobConfig2.containerClass  = this._commonService.datePickerPropertiesSetup('containerClass');
    // this.pDobConfig2.showWeekNumbers = false;
    // this.pDobConfig2.dateInputFormat = this._commonService.datePickerPropertiesSetup('dateInputFormat');

    // // Config3 — reserved / spare
    // this.pDobConfig3.containerClass  = this._commonService.datePickerPropertiesSetup('containerClass');
    // this.pDobConfig3.showWeekNumbers = false;
    // this.pDobConfig3.maxDate         = new Date();
    // this.pDobConfig3.dateInputFormat = this._commonService.datePickerPropertiesSetup('dateInputFormat');




  }

  // ══════════════════════════════════════════════════════════════════════════
  // PAGINATION — CONCEPT 8
  // ══════════════════════════════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════════════════════════════
  // DATA — CONCEPT 9: takeUntilDestroyed() auto-unsubscribe
  // ══════════════════════════════════════════════════════════════════════════


  
  GetEmployeeDetails(): void {
    this.sscAgendaService
      .getPolicyEmployeeDetails(this._commonService.getschemaname(), this._commonService.getCompanyCode(), this._commonService.getbranchname(), this.BranchId)
      .pipe(takeUntilDestroyed(this.destroyRef))      // CONCEPT 9
      .subscribe((res: any) => {
        this.EmployeeData = res;
        this.pageCriteria.totalrows = this.EmployeeData.length;
        this.pageCriteria.TotalPages = 1;

        if (this.pageCriteria.totalrows > 10) {
          this.pageCriteria.TotalPages =
            parseInt((this.pageCriteria.totalrows / 10).toString()) + 1;
        }

        this.pageCriteria.currentPageRows =
          this.EmployeeData.length < this.pageCriteria.pageSize
            ? this.EmployeeData.length
            : this.pageCriteria.pageSize;
      });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GRID ROW SELECT
  // CONCEPT 3  — signal() set() for ShowHideDate / ShowHideDateEdit / savebutton
  // CONCEPT 17 — @if in template driven by these signals
  // ══════════════════════════════════════════════════════════════════════════
  editPolicyDetails(event: any, row: any, rowIndex: any, group: any): void {
    this.clearControls();
    document
      .getElementById('details')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });

    // Employee info
    this.EmployeeName = row.pContactName;
    this.Designation = row.pDesignation;
    this.EmployeeId = row.pEmployeecode;

    this.PolicyDetailsForm.controls['pEmployeeName'].setValue(row.pContactName);
    this.PolicyDetailsForm.controls['pEmployeeCode'].setValue(row.pEmployeecode);
    this.PolicyDetailsForm.controls['pDesignation'].setValue(row.pDesignation);
    this.PolicyDetailsForm.controls['pemployeecontactid'].setValue(row.pContactId);
    this.PolicyDetailsForm.controls['pdesignationid'].setValue(row.pDesignationId);

    // const dateofJoin = this._commonService.getFormatDateGlobal(row.pDateOfJoining);
    // this.PolicyDetailsForm.controls['pdateofjoining'].setValue(dateofJoin);
    this.PolicyDetailsForm.controls['pdateofjoining'].setValue(
  row.pDateOfJoining ? new Date(row.pDateOfJoining) : null
);

    if (row.ppolicystatus === 'Y') {
      // ── Save mode ──────────────────────────────────────────────────────────
      this.PolicyDetailsForm.controls['ppolicystatus'].setValue('N');
      this.ShowHideDate.set(true);       // CONCEPT 3 — signal .set()
      this.ShowHideDateEdit.set(false);  // CONCEPT 3
      this.savebutton.set('Save');       // CONCEPT 3
    } else {
      // ── Update mode ────────────────────────────────────────────────────────
      this.ShowHideDate.set(false);      // CONCEPT 3
      this.ShowHideDateEdit.set(true);   // CONCEPT 3
      this.savebutton.set('Update');     // CONCEPT 3

      // const PolicyDate = this._commonService.getFormatDateGlobal(row.pdateofpolicy);
      // const RenewalDate = this._commonService.getFormatDateGlobal(row.pdateofpolicyrenewal);
      const PolicyAmount = this._commonService.currencyformat(row.ppolicyamount);

      // this.PolicyDetailsForm.controls['pdateofpolicy'].setValue(PolicyDate);
      // this.PolicyDetailsForm.controls['pdateofpolicyrenewal'].setValue(RenewalDate);


      // Policy Date
this.PolicyDetailsForm.controls['pdateofpolicy'].setValue(
  row.pdateofpolicy ? new Date(row.pdateofpolicy) : null
);

// Renewal Date
this.PolicyDetailsForm.controls['pdateofpolicyrenewal'].setValue(
  row.pdateofpolicyrenewal ? new Date(row.pdateofpolicyrenewal) : null
);
      this.PolicyDetailsForm.controls['ppolicyamount'].setValue(PolicyAmount);
      this.PolicyDetailsForm.controls['ppolicyid'].setValue(row.ppolicyId);
      this.PolicyDetailsForm.controls['pkhcno'].setValue(row.pKhcno);

      this.PolicyDetailsForm.controls['ppolicystatus'].setValue(
        row.ppolicystatus === 'N' ? 'R' : row.ppolicystatus
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SAVE
  // CONCEPT 18 — Arrow-function error handler (fixes the original bug)
  // CONCEPT  9 — takeUntilDestroyed on save call too
  // ══════════════════════════════════════════════════════════════════════════
  SavePolicyDetails(): void {
    debugger
    if (!this.EmployeeId || this.EmployeeId === '') {
      this._commonService.showWarningMessage('Fill All the Details');
      return;
    }

    if (this.checkValidations(this.PolicyDetailsForm, true)) {
      const Data = this.PolicyDetailsForm.value;
      const Status = Data.ppolicystatus === 'N' ? 'Save ?' : 'Update ?';

      if (confirm('Do you want to ' + Status)) {
        Data.pdateofjoining = this._commonService.getFormatDateNormal(Data.pdateofjoining);
        Data.pdateofpolicy = this._commonService.getFormatDateNormal(Data.pdateofpolicy);
        Data.pdateofpolicyrenewal = this._commonService.getFormatDateNormal(Data.pdateofpolicyrenewal);
        Data.ppolicyamount = this._commonService.removeCommasInAmount(Data.ppolicyamount);
        Data.pCreatedby = this._commonService.getCreatedBy();
        Data.pipaddress = this._commonService.getIpAddress();

        const JsonData = JSON.stringify(Data);

        this.disablesavebutton.set(true);      // CONCEPT 3
        this.savebutton.set('Proccessing');    // CONCEPT 3
console.log("json data",JsonData);

        this.sscAgendaService
          .SavePolicyDetails(JsonData)
          .pipe(takeUntilDestroyed(this.destroyRef))  // CONCEPT 9
          .subscribe({
            next: (res: any) => {                            // CONCEPT 18 — named handlers
              if (res) {
                if (Data.ppolicystatus === 'N') {
                  this._commonService.showSuccessMessage();
                } else {
                  this._commonService.showSuccessMsg('Updated Successfully');
                }
                this.disablesavebutton.set(false);   // CONCEPT 3
                this.savebutton.set('Save');          // CONCEPT 3
                this.clerDetails();
                this.GetEmployeeDetails();
              }
            },
            error: (err: any) => {                           // CONCEPT 18 — arrow error handler
              this.disablesavebutton.set(false);      // CONCEPT 3
              this.savebutton.set('Save');             // CONCEPT 3
              this._commonService.showErrorMessage(err);
            },
          });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CLEAR / CANCEL
  // ══════════════════════════════════════════════════════════════════════════

  CancelClick(): void {
    this.clerDetails();
  }

  /** Full reset — rebinds the entire form */
  clerDetails(): void {
    this.EmployeeId = '';
    this.EmployeeName = '';
    this.Designation = '';
    this.ShowHideDate.set(true);      // CONCEPT 3
    this.ShowHideDateEdit.set(false); // CONCEPT 3
    this.savebutton.set('Save');      // CONCEPT 3
    this.BindFormControls();
  }

  /** Partial reset — clears only policy fields, keeps form group alive */
  clearControls(): void {
    this.EmployeeId = '';
    this.EmployeeName = '';
    this.Designation = '';
    this.ShowHideDate.set(true);      // CONCEPT 3
    this.ShowHideDateEdit.set(false); // CONCEPT 3
    this.PolicyDetailsForm.controls['pkhcno'].setValue('');
    this.PolicyDetailsForm.controls['pdateofjoining'].setValue(this.today);
    this.PolicyDetailsForm.controls['pdateofpolicy'].setValue(this.today);
    this.PolicyDetailsForm.controls['pdateofpolicyrenewal'].setValue(this.today);
    this.PolicyDetailsForm.controls['ppolicyamount'].setValue('');
    this.formValidationMessages = {};
    this.BlurEventAllControll(this.PolicyDetailsForm);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DATE CHANGE — sets minDate for renewal picker
  // ══════════════════════════════════════════════════════════════════════════
  empPolicydateChange($event: any): void {
    this.pDobConfig2.minDate = $event;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VALIDATION HELPERS
  // CONCEPT 20 — optional chaining (?.) for safe DOM access
  // ══════════════════════════════════════════════════════════════════════════

  BlurEventAllControll(fromgroup: FormGroup): boolean | void {
    try {
      Object.keys(fromgroup.controls).forEach((key: string) => {
        this.setBlurEvent(fromgroup, key);
      });
    } catch (e) {
      this._commonService.showErrorMessage(e);
      return false;
    }
  }

  setBlurEvent(fromgroup: FormGroup, key: string): boolean | void {
    try {
      const formcontrol = fromgroup.get(key);
      if (formcontrol) {
        if (formcontrol instanceof FormGroup) {
          this.BlurEventAllControll(formcontrol);
        } else if (formcontrol.validator) {
          fromgroup.get(key)!.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))   // CONCEPT 9
            .subscribe(() => this.GetValidationByControl(fromgroup, key, true));
        }
      }
    } catch (e) {
      this._commonService.showErrorMessage(e);
      return false;
    }
  }

  GetValidationByControl(formGroup: FormGroup, key: string, validate: boolean): boolean {
    try {
      const formcontrol = formGroup.get(key);
      if (formcontrol) {
        if (formcontrol instanceof FormGroup) {
          this.checkValidations(formcontrol, validate);
        } else if (formcontrol.validator) {
          this.formValidationMessages[key] = '';
          if (formcontrol.errors || formcontrol.invalid || formcontrol.touched || formcontrol.dirty) {
            // CONCEPT 20 — optional chaining
            const lablename = (document.getElementById(key) as HTMLInputElement)?.title ?? '';
            for (const errorkey in formcontrol.errors) {
              if (errorkey) {
                const errormessage = this._commonService.getValidationMessage(
                  formcontrol, errorkey, lablename, key, ''
                );
                this.formValidationMessages[key] += errormessage + ' ';
                validate = false;
              }
            }
          }
        }
      }
    } catch (e) {
      this._commonService.showErrorMessage(e);
      return false;
    }
    return validate;
  }

  checkValidations(group: FormGroup, validate: boolean): boolean {
    try {
      Object.keys(group.controls).forEach((key: string) => {
        validate = this.GetValidationByControl(group, key, validate);
      });
    } catch (e) {
      this._commonService.showErrorMessage(e);
      return false;
    }
    return validate;
  }
}




