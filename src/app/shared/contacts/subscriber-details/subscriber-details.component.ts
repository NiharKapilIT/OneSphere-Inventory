import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SharedModule } from 'primeng/api';

type SubscriberGroupType = 'Chit Group' | 'PSO Group' | 'Interbranch';
type SubscriberTab =
  | 'KYC Details'
  | 'Income Details'
  | 'Nominee Details'
  | 'Bank Details'
  | 'Authorized Signatory'
  | 'Related Parties'
  | 'Incharge Details'
  | 'Business Reference';

@Component({
  selector: 'app-subscriber-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule, DatePickerModule, TableModule, ButtonModule, SharedModule],
  templateUrl: './subscriber-details.component.html',
  styleUrl: './subscriber-details.component.scss',
})
export class SubscriberDetailsComponent {
  @Input() contact: any = null;

  private fb = inject(FormBuilder);

  pDatepickerMaxDate: Date = new Date();

  private readonly chitGroupTabs: SubscriberTab[] = ['KYC Details', 'Income Details', 'Nominee Details', 'Bank Details', 'Authorized Signatory', 'Related Parties'];
  private readonly psoGroupTabs: SubscriberTab[] = ['KYC Details', 'Nominee Details', 'Bank Details', 'Incharge Details', 'Business Reference'];
  private readonly interbranchTabs: SubscriberTab[] = [
    'KYC Details',
    'Income Details',
    'Nominee Details',
    'Bank Details',
    'Authorized Signatory',
    'Related Parties',
    'Incharge Details',
    'Business Reference',
  ];

  activeGroupType = signal<SubscriberGroupType>('Chit Group');
  activeTab = signal<SubscriberTab>('KYC Details');

  documentTypes = ['Identity Proof', 'Address Proof', 'Income Proof', 'PAN', 'Aadhar'];
  documentNames = ['PAN Card', 'Aadhar Card', 'Passport', 'Voter ID', 'Driving License'];
  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  organizationNatures = ['Government', 'Private', 'Public Sector', 'Self Business', 'Professional'];
  employmentTypes = ['Permanent', 'Contract', 'Temporary', 'Consultant'];
  designations = ['Manager', 'Executive', 'Officer', 'Accountant', 'Other'];
  relationships = ['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Brother', 'Sister'];
  banks = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank'];
  inchargeTypes = ['Foreman', 'Manager', 'Supervisor', 'Collection Incharge'];

  form: FormGroup = this.fb.group({
    // Main panel
    chitGroup: [null],
    psoGroup: [null],
    chitPeriod: [null],
    interbranchName: [null],
    interbranchChitGroup: [null],
    ticketNo: [''],
    subscriber: [''],
    subscriberSignedDate: [null],
    introducedBy: [null],
    area: [null],
    companyChit: [false],
    intimation: [true],
    address: [''],
    // KYC Details
    kycDocType: [null],
    kycDocName: [null],
    kycRefNo: [''],
    kycMonth: [null],
    kycYear: [''],
    // Income Details
    orgName: [''],
    orgNature: [null],
    employmentType: [null],
    employmentId: [''],
    officePhone: [''],
    designation: [null],
    workExperience: [''],
    currentCompanyExp: [''],
    reportingTo: [''],
    hireDate: [null],
    basicSalary: [''],
    allowanceAmount: [''],
    grossAmount: [''],
    deductionAmount: [''],
    netAmount: [''],
    retirementDate: [null],
    // Nominee Details
    nomineeName: [''],
    nomineeAge: [''],
    nomineeRelationship: [null],
    nomineeAddress: [''],
    // Bank Details
    bankName: [null],
    accountNumber: [''],
    ifscCode: [''],
    bankBranch: [''],
    // Authorized Signatory
    signatoryEmployee: [null],
    signatoryDesignation: [null],
    // Related Parties
    relatedContact: [null],
    relatedContactInfo: [''],
    // Incharge Details
    inchargeType: [null],
    inchargeName: [null],
    // Business Reference
    bizDesignation: [null],
    bizEmployee: [null],
  });

  bankList = signal<any[]>([]);
  signatoryList = signal<any[]>([]);
  relatedPartiesList = signal<any[]>([]);
  inchargeGroupList = signal<any[]>([]);
  businessRefList = signal<any[]>([]);

  get tabs(): SubscriberTab[] {
    if (this.activeGroupType() === 'PSO Group') return this.psoGroupTabs;
    if (this.activeGroupType() === 'Interbranch') return this.interbranchTabs;
    return this.chitGroupTabs;
  }

  setGroupType(groupType: SubscriberGroupType) {
    this.activeGroupType.set(groupType);
    if (!this.tabs.includes(this.activeTab())) {
      this.activeTab.set(this.tabs[0]);
    }
  }

  setActiveTab(tab: SubscriberTab) {
    this.activeTab.set(tab);
  }

  deleteRow(list: any, index: number) {
    list.update((items: any[]) => items.filter((_: any, i: number) => i !== index));
  }
}
