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

interface BiometricRow {
  branch: string;
  employeeCode: string;
  date: string;
  employeeName: string;
  leaveType: string;
  avaCl: number;
  avaSl: number;
}

interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

@Component({
  selector: 'app-biometric-report',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, NgSelectModule, DatePickerModule],
  templateUrl: './biometric-Attendance.html'
})
export class BiometricAttendance implements OnInit {
  submitted = false;

  fromDate: Date | null = new Date(2026, 3, 1);
  toDate: Date | null = new Date(2026, 3, 1);

  allBiometricList: BiometricRow[] = [
    {
      branch: 'Hyderabad',
      employeeCode: 'EMP001',
      date: '2026-04-01',
      employeeName: 'Ravi Kumar',
      leaveType: 'CL',
      avaCl: 2,
      avaSl: 6
    },
    {
      branch: 'Warangal',
      employeeCode: 'EMP002',
      date: '2026-04-01',
      employeeName: 'Suresh Reddy',
      leaveType: 'SL',
      avaCl: 3,
      avaSl: 4
    },
    {
      branch: 'Chennai',
      employeeCode: 'EMP003',
      date: '2026-04-01',
      employeeName: 'Anitha Devi',
      leaveType: 'CL',
      avaCl: 4,
      avaSl: 5
    }
  ];

  biometricList: BiometricRow[] = [];

  ngOnInit(): void {
    this.biometricList = [...this.allBiometricList];
  }

  onShow(): void {
    this.submitted = true;

    if (!this.fromDate || !this.toDate) {
      return;
    }

    const fromDate = this.toDateKey(this.fromDate);
    const toDate = this.toDateKey(this.toDate);

    this.biometricList = this.allBiometricList.filter(row => {
      return row.date >= fromDate && row.date <= toDate;
    });
  }

  onCancel(): void {
    this.submitted = false;
    this.fromDate = new Date(2026, 3, 1);
    this.toDate = new Date(2026, 3, 1);
    this.biometricList = [...this.allBiometricList];
  }

  onSave(): void {
    console.log('Save clicked', this.biometricList);
  }

  exportBiometricExcel(): void {
    this.exportExcel('Biometric Details', 'biometric-details.xlsx', this.biometricList, this.biometricColumns);
  }

  exportBiometricPdf(): void {
    this.exportPdf('Biometric Details', 'biometric-details.pdf', this.biometricList, this.biometricColumns);
  }

  printBiometric(): void {
    window.print();
  }

  private get biometricColumns(): ExportColumn<BiometricRow>[] {
    return [
      { header: 'Branch', value: row => row.branch },
      { header: 'Employee code', value: row => row.employeeCode },
      { header: 'Date', value: row => row.date },
      { header: 'Employee Name', value: row => row.employeeName },
      { header: 'Leave Type', value: row => row.leaveType },
      { header: 'Ava.CL', value: row => row.avaCl },
      { header: 'Ava.SL', value: row => row.avaSl }
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

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
