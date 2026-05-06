import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { NgSelectModule } from '@ng-select/ng-select';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EmployeeOption {
  empId: string;
  employeeName: string;
}

interface PayrollApprovalRow {
  empId: string;
  employeeName: string;
  designation: string;
  dateOfJoining: string;
  basic: number;
  vda: number;
  year: string;
  month: number;
}

interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

@Component({
  selector: 'app-payroll-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, NgSelectModule],
  templateUrl: './payroll-approval.html'
})
export class PayrollApproval implements OnInit {
  submitted = false;

  selectedEmployee: EmployeeOption | null = null;
  selectedYear: string | null = null;
  selectedMonth: number | null = null;

  employeeOptions: EmployeeOption[] = [
    { empId: 'EMP001', employeeName: 'Ravi Kumar' },
    { empId: 'EMP002', employeeName: 'Suresh Reddy' },
    { empId: 'EMP003', employeeName: 'Anitha Devi' },
    { empId: 'EMP004', employeeName: 'Mahesh Babu' }
  ];

  yearOptions = [
    '2020-2021',
    '2021-2022',
    '2022-2023',
    '2023-2024',
    '2024-2025',
    '2025-2026'
  ];

  monthOptions = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 }
  ];

  allPayrollApprovalList: PayrollApprovalRow[] = [
    {
      empId: 'EMP001',
      employeeName: 'Ravi Kumar',
      designation: 'Accounts Officer',
      dateOfJoining: '12-Mar-2022',
      basic: 35000,
      vda: 2500,
      year: '2020-2021',
      month: 4
    },
    {
      empId: 'EMP002',
      employeeName: 'Suresh Reddy',
      designation: 'HR Executive',
      dateOfJoining: '20-Jun-2021',
      basic: 32000,
      vda: 2200,
      year: '2020-2021',
      month: 4
    },
    {
      empId: 'EMP003',
      employeeName: 'Anitha Devi',
      designation: 'Software Engineer',
      dateOfJoining: '05-Jan-2023',
      basic: 45000,
      vda: 3000,
      year: '2020-2021',
      month: 4
    },
    {
      empId: 'EMP004',
      employeeName: 'Mahesh Babu',
      designation: 'Admin Executive',
      dateOfJoining: '18-Sep-2020',
      basic: 28000,
      vda: 1800,
      year: '2020-2021',
      month: 4
    }
  ];

  payrollApprovalList: PayrollApprovalRow[] = [];

  ngOnInit(): void {
    this.payrollApprovalList = [...this.allPayrollApprovalList];
  }

  runPayrollProcess(): void {
    this.submitted = true;

    if (!this.selectedYear || !this.selectedMonth) {
      return;
    }

    this.payrollApprovalList = this.allPayrollApprovalList.filter(row => {
      const matchesYear = row.year === this.selectedYear;
      const matchesMonth = row.month === this.selectedMonth;
      const matchesEmployee = this.selectedEmployee
        ? row.empId === this.selectedEmployee.empId
        : true;

      return matchesYear && matchesMonth && matchesEmployee;
    });
  }

  onRollback(): void {
    console.log('Rollback clicked');
  }

  onApprove(): void {
    console.log('Approve clicked');
  }

  onCancel(): void {
    this.submitted = false;
    this.selectedEmployee = null;
    this.selectedYear = null;
    this.selectedMonth = null;
    this.payrollApprovalList = [...this.allPayrollApprovalList];
  }

  printPayrollApproval(): void {
    window.print();
  }

  exportPayrollApprovalExcel(): void {
    this.exportExcel('Payroll Approval', 'payroll-approval.xlsx', this.payrollApprovalList, this.payrollApprovalColumns);
  }

  exportPayrollApprovalPdf(): void {
    this.exportPdf('Payroll Approval', 'payroll-approval.pdf', this.payrollApprovalList, this.payrollApprovalColumns);
  }

  private get payrollApprovalColumns(): ExportColumn<PayrollApprovalRow>[] {
    return [
      { header: 'Emp ID', value: row => row.empId },
      { header: 'Employee Name', value: row => row.employeeName },
      { header: 'Designation', value: row => row.designation },
      { header: 'Date Of Joining', value: row => row.dateOfJoining },
      { header: 'Basic', value: row => row.basic },
      { header: 'VDA', value: row => row.vda }
    ];
  }

  private exportExcel<T>(sheetName: string, fileName: string, rows: T[], columns: ExportColumn<T>[]): void {
    if (!rows.length) {
      return;
    }

    const exportData = rows.map(row => columns.reduce((data, column) => ({
      ...data,
      [column.header]: column.value(row)
    }), {}));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = {
      Sheets: { [sheetName]: worksheet },
      SheetNames: [sheetName]
    };

    XLSX.writeFile(workbook, fileName);
  }

  private exportPdf<T>(title: string, fileName: string, rows: T[], columns: ExportColumn<T>[]): void {
    if (!rows.length) {
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFontSize(14);
    doc.text(title, 14, 15);
    autoTable(doc, {
      head: [columns.map(column => column.header)],
      body: rows.map(row => columns.map(column => column.value(row))),
      startY: 22,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [43, 80, 236] }
    });
    doc.save(fileName);
  }
}
