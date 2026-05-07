 import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-ssc-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, DatePickerModule],
  templateUrl: './ssc-agenda.html',
})
export class SscAgenda {
  selectedTab: string = 'Confirmation';

  selectedEmployee: string | null = null;
  selectedDesignation: string | null = null;
  selectedPromotionDesignation: string | null = null;
  selectedBranch: string | null = null;
  selectedTransferDesignation: string | null = null;
  selectedAuthority: string | null = null;

  maxDate: Date = new Date();

  // Confirmation
  confirmationDate: Date = new Date();
  confirmationMinutesDate: Date = new Date();
  confirmationRemarks: string = '';
  confirmationRefNo: string = '';

  // Promotion
  promotionDate: Date = new Date();
  promotionMinutesDate: Date = new Date();
  promotionRemarks: string = '';
  promotionRefNo: string = '';

  // Transfer
  transferDate: Date = new Date();
  transferJoiningDate: Date = new Date();
  transferReportingDate: Date = new Date();
  transferRemarks: string = '';

  // Resignation
  resignationDate: Date = new Date();
  resignationRemarks: string = '';

  // Validation messages
  formValidationMessages: { [key: string]: string } = {};
  submitted: boolean = false;

  employeeOptions: string[] = ['Employee 1', 'Employee 2', 'Employee 3'];
  designationOptions: string[] = ['HR Executive', 'Accounts Officer', 'Software Engineer'];
  promotionDesignationOptions: string[] = ['Senior HR Executive', 'Assistant Manager', 'Manager'];
  branchOptions: string[] = ['Hyderabad', 'Warangal', 'Chennai'];
  authorityOptions: string[] = ['HR Manager', 'Branch Manager', 'Managing Director'];

  // onTabChange(): void {
  //   this.clearForm();
  // }
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
    // save logic here
    console.log('Saved successfully');
    this.clearForm();
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