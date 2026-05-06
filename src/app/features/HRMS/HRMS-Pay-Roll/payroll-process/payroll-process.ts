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

interface PayrollRow {
  empId: string;
  employeeName: string;
  email: string;
  designation: string;
  dateOfJoining: string;
  basic: number;
  vda: number;
  year: string;
  month: number;
}

interface PayrollBreakupItem {
  particular: string;
  amount: number;
}

interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

@Component({
  selector: 'app-employee-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, NgSelectModule],
  templateUrl: './payroll-process.html'
})
export class Payrollprocess implements OnInit {
  submitted = false;

  selectedEmployee: EmployeeOption | null = null;
  selectedYear: string | null = null;
  selectedMonth: number | null = null;
  selectedPayrollDetail: PayrollRow | null = null;
  selectedPayrollIds: string[] = [];
  mailStatusMessage = '';

  earningsBreakup: PayrollBreakupItem[] = [];
  deductionsBreakup: PayrollBreakupItem[] = [];

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

  allPayrollList: PayrollRow[] = [
    {
      empId: 'EMP001',
      employeeName: 'Ravi Kumar',
      email: 'ravi.kumar@company.com',
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
      email: 'suresh.reddy@company.com',
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
      email: 'anitha.devi@company.com',
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
      email: 'mahesh.babu@company.com',
      designation: 'Admin Executive',
      dateOfJoining: '18-Sep-2020',
      basic: 28000,
      vda: 1800,
      year: '2020-2021',
      month: 4
    }
  ];

  payrollList: PayrollRow[] = [];

  ngOnInit(): void {
    this.payrollList = [...this.allPayrollList];
  }

  runPayroll(): void {
    this.submitted = true;

    if (!this.selectedYear || !this.selectedMonth) {
      return;
    }

    this.payrollList = this.allPayrollList.filter(row => {
      const matchesYear = row.year === this.selectedYear;
      const matchesMonth = row.month === this.selectedMonth;
      const matchesEmployee = this.selectedEmployee
        ? row.empId === this.selectedEmployee.empId
        : true;

      return matchesYear && matchesMonth && matchesEmployee;
    });
    this.syncSelectedRows();
  }

  onClear(): void {
    this.submitted = false;
    this.selectedEmployee = null;
    this.selectedYear = null;
    this.selectedMonth = null;
    this.payrollList = [...this.allPayrollList];
    this.selectedPayrollIds = [];
    this.mailStatusMessage = '';
  }

  openPayrollDetail(row: PayrollRow): void {
    this.selectedPayrollDetail = row;
    this.earningsBreakup = this.buildEarnings(row);
    this.deductionsBreakup = this.buildDeductions(row);
  }

  closePayrollDetail(): void {
    this.selectedPayrollDetail = null;
    this.earningsBreakup = [];
    this.deductionsBreakup = [];
  }

  get selectedPayrollMonthLabel(): string {
    const monthValue = this.selectedPayrollDetail?.month ?? this.selectedMonth ?? 4;
    const yearValue = this.selectedPayrollDetail?.year ?? this.selectedYear ?? '2025-2026';
    const month = this.monthOptions.find(item => item.value === monthValue)?.label ?? 'April';
    const year = yearValue.split('-')[1] ?? '2026';
    return `${month.slice(0, 3).toUpperCase()}-${year}`;
  }

  get grossSalary(): number {
    return this.earningsBreakup.reduce((total, item) => total + item.amount, 0);
  }

  get totalDeductions(): number {
    return this.deductionsBreakup.reduce((total, item) => total + item.amount, 0);
  }

  get netSalary(): number {
    return this.grossSalary - this.totalDeductions;
  }

  get selectedPayrollRows(): PayrollRow[] {
    return this.payrollList.filter(row => this.selectedPayrollIds.includes(row.empId));
  }

  get mailTargetCount(): number {
    return this.selectedPayrollRows.length || this.payrollList.length;
  }

  isPayrollSelected(row: PayrollRow): boolean {
    return this.selectedPayrollIds.includes(row.empId);
  }

  togglePayrollSelection(row: PayrollRow, checked: boolean): void {
    if (checked) {
      this.selectedPayrollIds = Array.from(new Set([...this.selectedPayrollIds, row.empId]));
      return;
    }

    this.selectedPayrollIds = this.selectedPayrollIds.filter(id => id !== row.empId);
  }

  toggleAllPayrollSelection(checked: boolean): void {
    this.selectedPayrollIds = checked ? this.payrollList.map(row => row.empId) : [];
  }

  allPayrollRowsSelected(): boolean {
    return this.payrollList.length > 0 && this.payrollList.every(row => this.selectedPayrollIds.includes(row.empId));
  }

  printPayrollGrid(): void {
    window.print();
  }

  exportPayrollExcel(): void {
    this.exportExcel('Payroll Process', 'payroll-process.xlsx', this.payrollList, this.payrollColumns);
  }

  exportPayrollPdf(): void {
    this.exportPdf('Payroll Process List', 'payroll-process.pdf', this.payrollList, this.payrollColumns);
  }

  printPayslip(): void {
    window.print();
  }

  exportPayslipExcel(): void {
    if (!this.selectedPayrollDetail) {
      return;
    }

    const rows: (string | number)[][] = [
      ['Payroll Details Of', this.selectedPayrollDetail.employeeName],
      ['EMP ID', this.selectedPayrollDetail.empId],
      ['For The Month Of', this.selectedPayrollMonthLabel],
      [],
      ['Earnings', 'Amount', 'Deductions', 'Amount']
    ];
    const maxRows = Math.max(this.earningsBreakup.length, this.deductionsBreakup.length);

    for (let index = 0; index < maxRows; index++) {
      rows.push([
        this.earningsBreakup[index]?.particular ?? '',
        this.earningsBreakup[index]?.amount ?? '',
        this.deductionsBreakup[index]?.particular ?? '',
        this.deductionsBreakup[index]?.amount ?? ''
      ]);
    }

    rows.push([], ['Gross Salary', this.grossSalary, 'Deductions', this.totalDeductions], ['Net Salary', this.netSalary]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook: XLSX.WorkBook = {
      Sheets: { Payslip: worksheet },
      SheetNames: ['Payslip']
    };

    XLSX.writeFile(workbook, `${this.selectedPayrollDetail.empId}-payslip.xlsx`);
  }

  exportPayslipPdf(): void {
    if (!this.selectedPayrollDetail) {
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');

    doc.setFontSize(15);
    doc.text(`Payroll Details Of ${this.selectedPayrollDetail.employeeName}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`EMP ID - ${this.selectedPayrollDetail.empId}`, 14, 24);
    doc.text(`For The Month Of - ${this.selectedPayrollMonthLabel}`, 135, 24);

    const rows = [];
    const maxRows = Math.max(this.earningsBreakup.length, this.deductionsBreakup.length);

    for (let index = 0; index < maxRows; index++) {
      rows.push([
        this.earningsBreakup[index]?.particular ?? '',
        this.earningsBreakup[index]?.amount ?? '',
        this.deductionsBreakup[index]?.particular ?? '',
        this.deductionsBreakup[index]?.amount ?? ''
      ]);
    }

    autoTable(doc, {
      head: [['Earnings', 'Amount', 'Deductions', 'Amount']],
      body: rows,
      startY: 34,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [43, 80, 236] }
    });

    const finalY = (doc as any).lastAutoTable?.finalY ?? 34;
    autoTable(doc, {
      body: [
        ['Gross Salary', this.grossSalary, 'Deductions', this.totalDeductions],
        ['Net Salary', this.netSalary, '', '']
      ],
      startY: finalY + 8,
      styles: { fontSize: 10, cellPadding: 3, fontStyle: 'bold' }
    });

    doc.save(`${this.selectedPayrollDetail.empId}-payslip.pdf`);
  }

  sendPayrollMail(): void {
    const recipients = this.selectedPayrollRows.length ? this.selectedPayrollRows : this.payrollList;

    if (!recipients.length) {
      this.mailStatusMessage = 'No payroll records available to mail.';
      return;
    }

    const subject = encodeURIComponent(`Payroll Details - ${this.selectedPayrollMonthLabel}`);
    const body = encodeURIComponent('Dear Employee,\n\nPlease find your payroll details for the selected payroll cycle.\n\nRegards,\nHR Team');
    const bcc = encodeURIComponent(recipients.map(row => row.email).join(';'));

    window.location.href = `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;
    this.mailStatusMessage = `Mail draft prepared for ${recipients.length} employee${recipients.length === 1 ? '' : 's'}.`;
  }

  private buildEarnings(row: PayrollRow): PayrollBreakupItem[] {
    const allowances = row.empId === 'EMP004' ? 17950 : Math.max(row.basic * 0.18, 0);

    return [
      { particular: 'Basic', amount: row.empId === 'EMP004' ? 16500 : row.basic },
      { particular: 'VDA', amount: row.vda },
      { particular: 'Arrears', amount: 0 },
      { particular: 'Allowances', amount: allowances },
      { particular: 'Basic Protection', amount: 0 },
      { particular: 'Increment Protection', amount: 0 },
      { particular: 'Special Allowances', amount: 0 },
      { particular: 'Other Allowances', amount: 0 }
    ];
  }

  private buildDeductions(row: PayrollRow): PayrollBreakupItem[] {
    return [
      { particular: 'Advance', amount: 0 },
      { particular: 'Insurance', amount: row.empId === 'EMP004' ? 500 : 0 },
      { particular: 'Recoveries', amount: 0 },
      { particular: 'PF Amount', amount: row.empId === 'EMP004' ? 1800 : Math.round(row.basic * 0.12) },
      { particular: 'ESI Amount', amount: 0 },
      { particular: 'LOP Amount', amount: 0 },
      { particular: 'Professional TAX', amount: 200 },
      { particular: 'Income TAX', amount: 0 }
    ];
  }

  private syncSelectedRows(): void {
    const visibleIds = new Set(this.payrollList.map(row => row.empId));
    this.selectedPayrollIds = this.selectedPayrollIds.filter(id => visibleIds.has(id));
  }

  private get payrollColumns(): ExportColumn<PayrollRow>[] {
    return [
      { header: 'Emp ID', value: row => row.empId },
      { header: 'Employee Name', value: row => row.employeeName },
      { header: 'Email', value: row => row.email },
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
