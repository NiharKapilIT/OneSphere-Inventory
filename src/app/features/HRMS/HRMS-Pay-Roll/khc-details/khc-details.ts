import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EmployeeLookupRow {
  employeeId: string;
  employeeName: string;
  designation: string;
}

interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

@Component({
  selector: 'app-khc-details',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, NgSelectModule, DatePickerModule],
  templateUrl: './khc-details.html'
})
export class KhcDetails implements OnInit {
  submitted = false;

  employeeList: EmployeeLookupRow[] = [];
  allEmployees: EmployeeLookupRow[] = [
    {
      employeeId: 'EMP001',
      employeeName: 'Ravi Kumar',
      designation: 'Accounts Officer'
    },
    {
      employeeId: 'EMP002',
      employeeName: 'Suresh Reddy',
      designation: 'HR Executive'
    },
    {
      employeeId: 'EMP003',
      employeeName: 'Anitha Devi',
      designation: 'Software Engineer'
    }
  ];

  formData = {
    employeeId: '',
    employeeName: '',
    presentDesignation: '',
    kapilGroupJoinDate: new Date(2026, 3, 1) as Date | null,
    khcNo: '',
    employeePolicyDate: new Date(2026, 3, 1) as Date | null,
    renewalDate: new Date(2026, 3, 1) as Date | null,
    policyAmount: null as number | null
  };

  ngOnInit(): void {
    this.employeeList = [...this.allEmployees];
  }

  onSelectEmployee(row: EmployeeLookupRow): void {
    this.formData.employeeId = row.employeeId;
    this.formData.employeeName = row.employeeName;
    this.formData.presentDesignation = row.designation;
  }

  onClear(): void {
    this.submitted = false;
    this.employeeList = [...this.allEmployees];
    this.formData = {
      employeeId: '',
      employeeName: '',
      presentDesignation: '',
      kapilGroupJoinDate: new Date(2026, 3, 1),
      khcNo: '',
      employeePolicyDate: new Date(2026, 3, 1),
      renewalDate: new Date(2026, 3, 1),
      policyAmount: null
    };
  }

  onSave(): void {
    this.submitted = true;

    if (!this.formData.khcNo || !this.formData.policyAmount) {
      return;
    }

    console.log('KHC Details Saved', this.formData);
  }

  printEmployeeList(): void {
    window.print();
  }

  exportEmployeeListExcel(): void {
    this.exportExcel('KHC Employees', 'khc-employees.xlsx', this.employeeList, this.employeeColumns);
  }

  exportEmployeeListPdf(): void {
    this.exportPdf('KHC Employee List', 'khc-employees.pdf', this.employeeList, this.employeeColumns);
  }

  private get employeeColumns(): ExportColumn<EmployeeLookupRow>[] {
    return [
      { header: 'Employee ID', value: row => row.employeeId },
      { header: 'Employee Name', value: row => row.employeeName },
      { header: 'Designation', value: row => row.designation }
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
