import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SharedModule } from 'primeng/api';

type EmployeeTab =
  | 'General Information'
  | 'Family Details'
  | 'Education'
  | 'Previous Experience Details'
  | 'Kapil Career'
  | 'Department Training'
  | 'Employee Documents';

@Component({
  selector: 'app-employee-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule, DatePickerModule, TableModule, ButtonModule, SharedModule],
  templateUrl: './employee-details.component.html',
  styleUrl: './employee-details.component.scss',
})
export class EmployeeDetailsComponent {
  @Input() contact: any = null;

  private fb = inject(FormBuilder);

  pDatepickerMaxDate: Date = new Date();

  tabs: EmployeeTab[] = [
    'General Information',
    'Family Details',
    'Education',
    'Previous Experience Details',
    'Kapil Career',
    'Department Training',
    'Employee Documents',
  ];
  activeTab = signal<EmployeeTab>('General Information');

  designations = ['Manager', 'Executive', 'Officer', 'Accountant', 'Field Staff'];
  roles = ['Admin', 'Branch User', 'Cashier', 'Collector', 'Manager'];
  branches = ['HABSIGUDA-2-CAO', 'Hyderabad', 'Vijayawada', 'Warangal'];
  countries = ['India', 'United States', 'United Kingdom', 'Australia'];
  communities = ['General', 'BC', 'SC', 'ST', 'OC'];
  relationships = ['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Brother', 'Sister'];
  educationOptions = ['SSC', 'Intermediate', 'Degree', 'Post Graduation', 'Professional'];
  bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  joinedAsOptions = ['New Joining', 'Transfer', 'Promotion', 'Rejoining'];
  documentTypes = ['Identity Proof', 'Address Proof', 'Education Proof', 'Experience Proof', 'Other'];
  documentNames = ['Aadhar Card', 'PAN Card', 'Passport', 'Driving License', 'Certificate'];

  form: FormGroup = this.fb.group({
    // Employment & Salary
    designation: [null],
    role: [null],
    branch: [null],
    basicSalary: [''],
    allowance: [''],
    payrollEligible: [false],
    // Personal Details
    residentialStatus: ['Resident'],
    placeOfBirth: [''],
    countryOfBirth: [null],
    nationality: [''],
    community: [null],
    maritalStatus: ['Married'],
    // General Information tab
    esiEligible: [false],
    pfEligible: [false],
    khcNo: [''],
    passportNo: [''],
    panNo: [''],
    drivingLicenseNo: [''],
    department: [''],
    joinedAs: [null],
    joinDate: [null],
    dateOfReporting: [null],
    dojInThisBranch: [null],
    earnedLeavesBranch: [null],
    prevEarnedLeavesClaimDate: [null],
    bloodGroup: [null],
    uanNumber: [''],
    healthProblems: [''],
    physicalHandicap: [false],
    // Family Details entry
    familyRelationship: [null],
    familyName: [''],
    familyDob: [null],
    familyAge: [''],
    familyGender: ['Male'],
    familyMartialStatus: ['Married'],
    familyEducation: [null],
    familyOccupation: [''],
    familyPhone: [''],
    // Education entry
    course: [''],
    educationGroup: [''],
    college: [''],
    educationPlace: [''],
    year: [''],
    marks: [''],
    // Previous Experience entry
    orgName: [''],
    expDesignation: [null],
    expFromDate: [null],
    expToDate: [null],
    lastPay: [''],
    reasonForLeaving: [''],
    // Kapil Career entry
    company: [''],
    careerDesignation: [null],
    careerFromDate: [null],
    careerToDate: [null],
    sscNo: [''],
    reasonForTransfer: [''],
    // Department Training entry
    courseName: [''],
    trainingDate: [null],
    disciplinaryActions: [''],
    extraCurricular: [''],
    // Employee Documents entry
    docType: [null],
    docName: [null],
    refNo: [''],
  });

  familyMembers = signal<any[]>([]);
  educationList = signal<any[]>([]);
  experienceList = signal<any[]>([]);
  careerList = signal<any[]>([]);
  trainingList = signal<any[]>([]);
  documentsList = signal<any[]>([]);

  setActiveTab(tab: EmployeeTab) {
    this.activeTab.set(tab);
  }

  deleteRow(list: any, index: number) {
    list.update((items: any[]) => items.filter((_: any, i: number) => i !== index));
  }
}
