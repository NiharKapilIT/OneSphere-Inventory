import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonService } from '../../../../core/services/Common/common.service';
import { HrmsPayroll } from '../../../../core/services/hrms/hrms-payroll';

@Component({
  selector: 'app-ssc-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, DatePickerModule],
  templateUrl: './ssc-agenda.html',
})
export class SscAgenda implements OnInit {
  private hrms = inject(HrmsPayroll);
  private _commonService = inject(CommonService);
  selectedTab: string = 'Confirmation';
  selectedEmployee: number | null = null;
  selectedDesignation: number | null = null;
  selectedPromotionDesignation: number | null = null;
  selectedTransferDesignation: number | null = null;
  selectedBranch: string | null = null;
  selectedAuthority: string | null = null;
  selectedEmployeeInfo: any = null;

  maxDate: Date = new Date();
  confirmationDate: Date = new Date();
  confirmationMinutesDate: Date = new Date();
  confirmationRemarks: string = '';
  confirmationRefNo: string = '';
  isSaving: boolean = false;
  promotionDate: Date = new Date();
  promotionMinutesDate: Date = new Date();
  promotionRemarks: string = '';
  promotionRefNo: string = '';
  transferDate: Date = new Date();
  transferJoiningDate: Date = new Date();
  transferReportingDate: Date = new Date();
  transferRemarks: string = '';
  resignationDate: Date = new Date();
  resignationRemarks: string = '';

  GlobalSchema = '';
  CompanyName = '';
  searchtype = '';
  BranchId = 0;
  BranchSchema = '';
  sscagendatype = '';
  formValidationMessages: { [key: string]: string } = {};
  submitted: boolean = false;
  employeeOptions: any[] = [];
  designationOptions: any[] = [];
  branchOptions: string[] = ['Hyderabad', 'Warangal', 'Chennai'];
  authorityOptions: string[] = ['HR Manager', 'Branch Manager', 'Managing Director'];




  ngOnInit(): void {
    this.getDesignation();
    this.getEmployees();
  }

  getDesignation(): void {
    this.hrms.getDesignation().subscribe({
      next: (response: any[]) => {
        this.designationOptions = response;
      },
      error: (error: any) => {
        console.error('Error loading designation', error);
      }
    });
  }


  getEmployees(searchType: string = 'ALL'): void {
    this.hrms.getEmployees(
      this._commonService.getschemaname(),
      this._commonService.getCompanyCode(),
      searchType,
      this._commonService.getbrachid() ?? 0,
      this._commonService.getbranchname(),
      this.getSscAgendaType()
    ).subscribe({
      next: (response: any) => {
        const data = Array.isArray(response) ? response : (response?.data || response?.result || []);
        this.employeeOptions = data.map((emp: any) => ({
          ...emp,
          displayName: `${emp.contact_name} (${emp.employee_code})`
        }));
      },
      error: (error: any) => {
        console.error('Error loading employees', error);
      }
    });
  }

  onEmployeeSearch(event: { term: string }): void {
    if (event.term?.length >= 3) {
      this.getEmployees(event.term);
    }
  }

  onEmployeeChange(): void {
    if (this.selectedEmployee) {
      this.selectedEmployeeInfo = this.employeeOptions.find(
        emp => emp.contact_id === this.selectedEmployee
      ) ?? null;
    } else {
      this.selectedEmployeeInfo = null;
    }
  }

  getSscAgendaType(): string {
    const map: Record<string, string> = {
      'Confirmation': 'C',
      'Promotion': 'P',
      'Transfer': 'T',
      'Resignation': 'R'
    };
    return map[this.selectedTab] ?? 'C';
  }

  onTabChange(): void {
    this.formValidationMessages = {};
    this.submitted = false;
  }

  getValidationMsg(key: string): string {
    return this.formValidationMessages[key] || '';
  }

  validate(): boolean {
    this.formValidationMessages = {};
    let isValid = true;

    if (!this.selectedEmployee) {
      this.formValidationMessages['selectedEmployee'] = 'Employee Is Required';
      isValid = false;
    }

    if (this.selectedTab === 'Confirmation') {
      if (!this.selectedDesignation) {
        this.formValidationMessages['selectedDesignation'] = 'Designation Is Required';
        isValid = false;
      }
      if (!this.confirmationRemarks?.trim()) {
        this.formValidationMessages['confirmationRemarks'] = 'Remarks Is Required';
        isValid = false;
      }
      if (!this.confirmationRefNo?.trim()) {
        this.formValidationMessages['confirmationRefNo'] = 'Ref No. Is Required';
        isValid = false;
      }
    }

    if (this.selectedTab === 'Promotion') {
      if (!this.selectedPromotionDesignation) {
        this.formValidationMessages['selectedPromotionDesignation'] = 'Designation Is Required';
        isValid = false;
      }
      if (!this.promotionRemarks?.trim()) {
        this.formValidationMessages['promotionRemarks'] = 'Remarks Is Required';
        isValid = false;
      }
      if (!this.promotionRefNo?.trim()) {
        this.formValidationMessages['promotionRefNo'] = 'Ref No. Is Required';
        isValid = false;
      }
    }

    if (this.selectedTab === 'Transfer') {
      if (!this.selectedBranch) {
        this.formValidationMessages['selectedBranch'] = 'Branch Is Required';
        isValid = false;
      }
      if (!this.selectedTransferDesignation) {
        this.formValidationMessages['selectedTransferDesignation'] = 'Designation Is Required';
        isValid = false;
      }
      if (!this.transferRemarks?.trim()) {
        this.formValidationMessages['transferRemarks'] = 'Remarks Is Required';
        isValid = false;
      }
    }

    if (this.selectedTab === 'Resignation') {
      if (!this.selectedAuthority) {
        this.formValidationMessages['selectedAuthority'] = 'Authority Is Required';
        isValid = false;
      }
      if (!this.resignationRemarks?.trim()) {
        this.formValidationMessages['resignationRemarks'] = 'Remarks Is Required';
        isValid = false;
      }
    }

    return isValid;
  }


  save(): void {
    this.submitted = true;
    if (!this.validate()) return;

    this.isSaving = true;

    const formatDate = (date: Date | null): string | null => {
      if (!date) return null;
      const d = new Date(date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const payload = {
      company_code: this._commonService.getCompanyCode(),
      branch_code: this._commonService.getbranchname(),
      schemaname: this._commonService.getbranchname(),
      pSscAgendaType: this.getSscAgendaType(),
      pEmployeeContactId: this.selectedEmployee,
      pbranchid: this._commonService.getbrachid() ?? 0,
      pCreatedby: Number(sessionStorage.getItem('userId')) ?? 0,
      pipaddress: '',
      pStatus: 'Active',
      pStatusid: 1,
      pStatusname: 'Approved',
      pactivitytype: 'I',
      currencyformat: 'INR',
      dateformat: 'dd-MM-yyyy',
      preleasetype: 'Production',
      ppayrollbranchid: this._commonService.getbrachid() ?? 1,

      pDesignationId: this.selectedTab === 'Confirmation'
        ? this.selectedDesignation
        : this.selectedTab === 'Promotion'
          ? this.selectedPromotionDesignation
          : this.selectedTab === 'Transfer'
            ? this.selectedTransferDesignation
            : null,

      pDateofConfirmation: this.selectedTab === 'Confirmation'
        ? formatDate(this.confirmationDate) : '',
      pSscMinutesNo: this.selectedTab === 'Confirmation'
        ? this.confirmationRefNo
        : this.selectedTab === 'Promotion'
          ? this.promotionRefNo : '',
      pSscMinutesDate: this.selectedTab === 'Confirmation'
        ? formatDate(this.confirmationMinutesDate)
        : this.selectedTab === 'Promotion'
          ? formatDate(this.promotionMinutesDate) : '',
      pRemarks: this.selectedTab === 'Confirmation' ? this.confirmationRemarks
        : this.selectedTab === 'Promotion' ? this.promotionRemarks
          : this.selectedTab === 'Transfer' ? this.transferRemarks
            : this.resignationRemarks,

      pDateofPromotion: this.selectedTab === 'Promotion'
        ? formatDate(this.promotionDate) : '',

      pDateOfTransfer: this.selectedTab === 'Transfer'
        ? formatDate(this.transferDate) : '',
      pDateOfJoining: this.selectedTab === 'Transfer'
        ? formatDate(this.transferJoiningDate) : '',
      pDateOfReporting: this.selectedTab === 'Transfer'
        ? formatDate(this.transferReportingDate) : '',
      pTrnsferTo: this.selectedTab === 'Transfer'
        ? this.selectedBranch : null,
      pResignationAuthorityId: this.selectedTab === 'Resignation'
        ? this.selectedAuthority : null,

      pDateOfResignation: this.selectedTab === 'Resignation'
        ? formatDate(this.resignationDate) : '',

      pFileName: '',
      ptypeofoperation: 'INSERT',
    };

    console.log('SSC Payload:', payload);

    this.hrms.saveSscAgenda(payload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        if (res?.success) {
          this._commonService.showSuccessMessage();
          this.clearForm();
        } else {
          this._commonService.showErrorMessage(res?.message ?? 'Save failed');
        }
      },
      error: (err: any) => {
        this.isSaving = false;
        this._commonService.showErrorMessage(err?.message ?? 'An error occurred');
      }
    });
  }

  clearForm(): void {
    this.submitted = false;
    this.formValidationMessages = {};
    this.selectedEmployee = null;
    this.selectedDesignation = null;
    this.selectedPromotionDesignation = null;
    this.selectedBranch = null;
    this.selectedTransferDesignation = null;
    this.selectedAuthority = null;
    this.selectedEmployeeInfo = null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.confirmationDate = new Date(today);
    this.confirmationMinutesDate = new Date(today);
    this.confirmationRemarks = '';
    this.confirmationRefNo = '';
    this.promotionDate = new Date(today);
    this.promotionMinutesDate = new Date(today);
    this.promotionRemarks = '';
    this.promotionRefNo = '';
    this.transferDate = new Date(today);
    this.transferJoiningDate = new Date(today);
    this.transferReportingDate = new Date(today);
    this.transferRemarks = '';
    this.resignationDate = new Date(today);
    this.resignationRemarks = '';
  }



}