import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { saveAs } from 'file-saver';
import { ContactAddComponent } from '../../../../shared/contacts/contact-add/contact-add.component';
import { Contact } from '../../../../shared/contacts/contacts-list/contacts-list.component';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EmployeeOnRollModel {
  empId: string;
  employeeName: string;
  designation: string;
  basicSalary: number;
  specialAllowances: number;
  allowances: number;
}

type PayrollTab = 'Allowance' | 'Advance' | 'Recoveries';

interface PayrollDetailRow {
  id: number;
  name: string;
  amount: number;
  period: number;
  deductionType?: string;
  fromDate?: string;
  toDate?: string;
}

interface PayrollAddedRow {
  id: number;
  name: string;
  amount: number;
  period?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  deductionType?: string;
  recurring?: boolean;
}

interface PayrollEntryForm {
  allowance: string;
  advance: string;
  recovery: string;
  amount: string;
  loanAdvanceAmount: string;
  deductionPeriod: string;
  deductionAmount: string;
  effectedFrom: Date | null;
  effectedTo: Date | null;
  deductionType: string;
  allowancesType: string;
  allowancesPeriod: string;
  recurring: boolean;
  reference: string;
  attachment: string;
  authorisedBy: string;
}

@Component({
  selector: 'app-employee-on-roll',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, DatePickerModule, ContactAddComponent],
  templateUrl: './employee-on-roll.html'
})
export class EmployeeOnRoll implements OnInit {
  searchText = '';

  employeeList: EmployeeOnRollModel[] = [];

  // Modal handling for ContactAddComponent
  showContactModal = false;
  selectedContact: Contact | null = null;

  showPayrollModal = false;
  selectedPayrollEmployee: EmployeeOnRollModel | null = null;
  payrollTabs: PayrollTab[] = ['Allowance', 'Advance', 'Recoveries'];
  activePayrollTab: PayrollTab = 'Allowance';
  payEntry: PayrollEntryForm = this.createPayEntry();
  private nextAddedRowId = 1;

  allowanceOptions = ['AO ALLOWANCES', 'CHILDREN EDUCATION', 'SPECIAL ALLOWANCE'];
  advanceOptions = ['ADVANCE', 'STAFF ADVANCE', 'SALARY ADVANCE'];
  recoveryOptions = ['INSURANCE', 'STAFF LOAN', 'OTHER RECOVERY'];
  deductionTypeOptions = ['Monthly', 'One Time', 'Installment'];
  authorisedByOptions = ['Branch Manager', 'HR Officer', 'Payroll Admin'];

  allowanceDetails: PayrollDetailRow[] = [
    { id: 1, name: 'AO ALLOWANCES', amount: 200, period: 2, deductionType: 'Monthly' },
    { id: 2, name: 'AO ALLOWANCES', amount: 500, period: 2, deductionType: 'Monthly' },
    { id: 3, name: 'CHILDREN EDUCATION', amount: 2250, period: 12, deductionType: 'Monthly' },
    { id: 4, name: 'SPECIAL ALLOWANCE', amount: 10000, period: 12, deductionType: 'Monthly' }
  ];

  advanceDetails: PayrollDetailRow[] = [
    { id: 5, name: 'ADVANCE', amount: 200, period: 2, fromDate: '22-Apr-2026', toDate: '22-Jun-2026' },
    { id: 6, name: 'ADVANCE', amount: 200, period: 2, fromDate: '22-Apr-2026', toDate: '22-Jun-2026' }
  ];

  recoveryDetails: PayrollDetailRow[] = [
    { id: 7, name: 'INSURANCE', amount: 3000, period: 12, fromDate: '24-Aug-2025' },
    { id: 8, name: 'INSURANCE', amount: 100, period: 2, fromDate: '22-Apr-2026' }
  ];

  addedAllowanceDetails: PayrollAddedRow[] = [];
  addedAdvanceDetails: PayrollAddedRow[] = [];
  addedRecoveryDetails: PayrollAddedRow[] = [];

  allEmployees: EmployeeOnRollModel[] = [
    {
      empId: 'EMP001',
      employeeName: 'Ravi Kumar',
      designation: 'Accounts Officer',
      basicSalary: 35000,
      specialAllowances: 5000,
      allowances: 3000
    },
    {
      empId: 'EMP002',
      employeeName: 'Suresh Reddy',
      designation: 'HR Executive',
      basicSalary: 32000,
      specialAllowances: 4000,
      allowances: 2500
    },
    {
      empId: 'EMP003',
      employeeName: 'Anitha Devi',
      designation: 'Software Engineer',
      basicSalary: 45000,
      specialAllowances: 7000,
      allowances: 3500
    },
    {
      empId: 'EMP004',
      employeeName: 'Mahesh Babu',
      designation: 'Admin Executive',
      basicSalary: 28000,
      specialAllowances: 3000,
      allowances: 2000
    }
  ];

  ngOnInit(): void {
    this.employeeList = [...this.allEmployees];
  }

  onSearch(): void {
    const value = this.searchText.trim().toLowerCase();

    if (!value) {
      this.employeeList = [...this.allEmployees];
      return;
    }

    this.employeeList = this.allEmployees.filter(emp =>
      emp.empId.toLowerCase().includes(value) ||
      emp.employeeName.toLowerCase().includes(value) ||
      emp.designation.toLowerCase().includes(value)
    );
  }

  onClear(): void {
    this.searchText = '';
    this.employeeList = [...this.allEmployees];
  }

  printEmployeeList(): void {
    window.print();
  }

  exportExcel(): void {
    if (!this.employeeList.length) {
      return;
    }

    const exportData = this.employeeList.map(emp => ({
      'Emp ID': emp.empId,
      'Employee Name': emp.employeeName,
      'Designation': emp.designation,
      'Basic Salary': emp.basicSalary,
      'Special Allowances': emp.specialAllowances,
      'Allowances': emp.allowances
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = {
      Sheets: { 'Employee On-Roll': worksheet },
      SheetNames: ['Employee On-Roll']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const fileData = new Blob(
      [excelBuffer],
      {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
      }
    );

    saveAs(fileData, 'employee-on-roll.xlsx');
  }

  // Open Add Contact modal
  openAddContact(): void {
    this.selectedContact = null;
    this.showContactModal = true;
  }

  // View contact (populate minimal data)
  viewContact(employee: EmployeeOnRollModel): void {
    this.selectedContact = {
      id: employee.empId,
      uid: employee.empId,
      name: employee.employeeName,
      relation: '',
      phone: '',
      address: '',
      status: 'Active',
      type: 'Contacts',
      roles: ['Employee']
    };
    this.showContactModal = true;
  }

  // Edit contact (same as view for now)
  editContact(employee: EmployeeOnRollModel): void {
    this.viewContact(employee);
  }

  closeContactModal(): void {
    this.showContactModal = false;
    this.selectedContact = null;
  }

  // Capture saved contact (could integrate into employee list later)
  saveContact(contact: Contact): void {
    console.log('Contact saved from modal:', contact);
    this.closeContactModal();
  }

  openPayrollModal(employee: EmployeeOnRollModel): void {
    this.selectedPayrollEmployee = employee;
    this.activePayrollTab = 'Allowance';
    this.payEntry = this.createPayEntry();
    this.showPayrollModal = true;
  }

  closePayrollModal(): void {
    this.showPayrollModal = false;
    this.selectedPayrollEmployee = null;
  }

  setPayrollTab(tab: PayrollTab): void {
    this.activePayrollTab = tab;
    this.payEntry = this.createPayEntry();
  }

  addPayrollEntry(): void {
    if (this.activePayrollTab === 'Allowance') {
      const amount = this.toNumber(this.payEntry.amount);
      if (!this.payEntry.allowance || amount <= 0) {
        return;
      }

      this.addedAllowanceDetails = [
        ...this.addedAllowanceDetails,
        {
          id: this.nextAddedRowId++,
          name: this.payEntry.allowance,
          amount,
          period: this.toNumber(this.payEntry.allowancesPeriod),
          effectiveFrom: this.formatDateDisplay(this.payEntry.effectedFrom),
          deductionType: this.payEntry.allowancesType,
          recurring: this.payEntry.recurring
        }
      ];
      this.payEntry = this.createPayEntry();
      return;
    }

    if (this.activePayrollTab === 'Advance') {
      const amount = this.toNumber(this.payEntry.loanAdvanceAmount);
      if (!this.payEntry.advance || amount <= 0) {
        return;
      }

      this.addedAdvanceDetails = [
        ...this.addedAdvanceDetails,
        {
          id: this.nextAddedRowId++,
          name: this.payEntry.advance,
          amount,
          period: this.toNumber(this.payEntry.deductionPeriod),
          effectiveFrom: this.formatDateDisplay(this.payEntry.effectedFrom),
          effectiveTo: this.formatDateDisplay(this.payEntry.effectedTo)
        }
      ];
      this.payEntry = this.createPayEntry();
      return;
    }

    const amount = this.toNumber(this.payEntry.amount);
    if (!this.payEntry.recovery || amount <= 0) {
      return;
    }

    this.addedRecoveryDetails = [
      ...this.addedRecoveryDetails,
      {
        id: this.nextAddedRowId++,
        name: this.payEntry.recovery,
        amount,
        period: this.toNumber(this.payEntry.deductionPeriod),
        effectiveFrom: this.formatDateDisplay(this.payEntry.effectedFrom),
        deductionType: this.payEntry.deductionType
      }
    ];
    this.payEntry = this.createPayEntry();
  }

  clearPayrollEntry(): void {
    this.payEntry = this.createPayEntry();
  }

  savePayrollDetails(): void {
    this.closePayrollModal();
  }

  removeExistingPayrollRow(row: PayrollDetailRow): void {
    if (this.activePayrollTab === 'Allowance') {
      this.allowanceDetails = this.allowanceDetails.filter(item => item.id !== row.id);
      return;
    }

    if (this.activePayrollTab === 'Advance') {
      this.advanceDetails = this.advanceDetails.filter(item => item.id !== row.id);
      return;
    }

    this.recoveryDetails = this.recoveryDetails.filter(item => item.id !== row.id);
  }

  removeAddedPayrollRow(row: PayrollAddedRow): void {
    if (this.activePayrollTab === 'Allowance') {
      this.addedAllowanceDetails = this.addedAllowanceDetails.filter(item => item.id !== row.id);
      return;
    }

    if (this.activePayrollTab === 'Advance') {
      this.addedAdvanceDetails = this.addedAdvanceDetails.filter(item => item.id !== row.id);
      return;
    }

    this.addedRecoveryDetails = this.addedRecoveryDetails.filter(item => item.id !== row.id);
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.payEntry.attachment = input.files?.[0]?.name ?? '';
    input.value = '';
  }

  get activeExistingRows(): PayrollDetailRow[] {
    if (this.activePayrollTab === 'Allowance') {
      return this.allowanceDetails;
    }

    if (this.activePayrollTab === 'Advance') {
      return this.advanceDetails;
    }

    return this.recoveryDetails;
  }

  get activeAddedRows(): PayrollAddedRow[] {
    if (this.activePayrollTab === 'Allowance') {
      return this.addedAllowanceDetails;
    }

    if (this.activePayrollTab === 'Advance') {
      return this.addedAdvanceDetails;
    }

    return this.addedRecoveryDetails;
  }

  get activeExistingTotal(): number {
    return this.activeExistingRows.reduce((total, row) => total + this.toNumber(row.amount), 0);
  }

  get activeAddedTotal(): number {
    return this.activeAddedRows.reduce((total, row) => total + this.toNumber(row.amount), 0);
  }

  private createPayEntry(): PayrollEntryForm {
    return {
      allowance: '',
      advance: '',
      recovery: '',
      amount: '',
      loanAdvanceAmount: '',
      deductionPeriod: '',
      deductionAmount: '0',
      effectedFrom: this.todayDisplay(),
      effectedTo: this.todayDisplay(),
      deductionType: '',
      allowancesType: '',
      allowancesPeriod: '',
      recurring: false,
      reference: '',
      attachment: '',
      authorisedBy: ''
    };
  }

  private todayDisplay(): Date {
    return new Date();
  }

  private formatDateDisplay(date: Date | null): string {
    if (!date) {
      return '';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });

    return `${day}-${month}-${date.getFullYear()}`;
  }

  private toNumber(value: string | number | null | undefined): number {
    const parsed = Number(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  exportPdf(): void {
    if (!this.employeeList.length) {
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFontSize(14);
    doc.text('Employee On-Roll', 14, 15);

    const headers = [[
      'Emp ID',
      'Employee Name',
      'Designation',
      'Basic Salary',
      'Special Allowances',
      'Allowances'
    ]];

    const rows = this.employeeList.map(emp => [
      emp.empId,
      emp.employeeName,
      emp.designation,
      emp.basicSalary,
      emp.specialAllowances,
      emp.allowances
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 22,
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [43, 80, 236]
      }
    });

    doc.save('employee-on-roll.pdf');
  }
}
