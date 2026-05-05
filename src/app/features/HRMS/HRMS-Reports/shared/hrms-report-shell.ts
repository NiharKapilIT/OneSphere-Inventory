import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type HrmsReportFieldType = 'date' | 'select' | 'employee';

export interface HrmsReportField {
  key: string;
  label: string;
  type: HrmsReportFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  widthClass?: string;
}

export interface HrmsReportColumn {
  field: string;
  header: string;
}

export interface HrmsReportConfig {
  title: string;
  fields: HrmsReportField[];
  columns?: HrmsReportColumn[];
  rows?: Record<string, string | number>[];
  showTable?: boolean;
  showSave?: boolean;
  primaryActionLabel?: string;
  showExportActions?: boolean;
}

@Component({
  selector: 'app-hrms-report-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, ButtonModule, DatePickerModule, TableModule],
  templateUrl: './hrms-report-shell.html'
})
export class HrmsReportShell {
  private reportConfig!: HrmsReportConfig;

  @Input({ required: true })
  set config(value: HrmsReportConfig) {
    this.reportConfig = value;
    value.fields
      .filter(field => field.type === 'date' && !this.values[field.key])
      .forEach(field => {
        this.values[field.key] = new Date(this.currentDate);
      });
  }

  get config(): HrmsReportConfig {
    return this.reportConfig;
  }

  readonly values: Record<string, string | Date | null> = {};
  readonly currentDate = new Date(2026, 4, 5);
  readonly employeeOptions = ['Ravi Kumar', 'Suresh Reddy', 'Anitha Devi', 'Mahesh Babu'];
  readonly yearOptions = ['2020-2021', '2021-2022', '2022-2023', '2023-2024', '2024-2025', '2025-2026'];
  readonly monthOptions = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  get rows(): Record<string, string | number>[] {
    return this.config.rows ?? [];
  }

  get columns(): HrmsReportColumn[] {
    return this.config.columns ?? [];
  }

  get showTable(): boolean {
    return this.config.showTable !== false;
  }

  fieldOptions(field: HrmsReportField): string[] {
    if (field.options?.length) {
      return field.options;
    }

    if (field.key.toLowerCase().includes('year')) {
      return this.yearOptions;
    }

    if (field.key.toLowerCase().includes('month')) {
      return this.monthOptions;
    }

    if (field.type === 'employee') {
      return this.employeeOptions;
    }

    return [];
  }

  fieldPlaceholder(field: HrmsReportField): string {
    if (field.placeholder) {
      return field.placeholder;
    }

    if (field.type === 'date') {
      return 'DD-MMM-YYYY';
    }

    if (field.type === 'employee') {
      return 'Search by employee name';
    }

    if (field.key.toLowerCase().includes('month')) {
      return 'Select Month';
    }

    return 'Select';
  }

  onShow(): void {
    // Placeholder for API integration.
  }

  onSave(): void {
    // Placeholder for API integration.
  }

  printReport(): void {
    window.print();
  }

  exportExcel(): void {
    const exportData = this.rows.length
      ? this.rows
      : [this.columns.reduce((row, column) => ({ ...row, [column.header]: '' }), {})];
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = {
      Sheets: { [this.config.title]: worksheet },
      SheetNames: [this.config.title]
    };

    XLSX.writeFile(workbook, `${this.fileName}.xlsx`);
  }

  exportPdf(): void {
    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFontSize(14);
    doc.text(this.config.title, 14, 15);
    autoTable(doc, {
      head: [this.columns.map(column => column.header)],
      body: this.rows.map(row => this.columns.map(column => row[column.field] ?? '')),
      startY: 22,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [43, 80, 236] }
    });
    doc.save(`${this.fileName}.pdf`);
  }

  private get fileName(): string {
    return this.config.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
