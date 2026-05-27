import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePickerModule } from 'primeng/datepicker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Companydetails } from '../../../common/company-details/companydetails/companydetails';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';

interface TBRow {
  accountId: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  mainName: string;
  groupName: string;
  subGroupName: string;
  subHead: string;
  mainNameSortOrder: number;
  groupSortOrder: number;
  subGroupSortOrder: number;
  subHeadSortOrder: number;
}

type ReportRowKind = 'group' | 'account' | 'grand-total';

interface ScheduleDisplayRow {
  id: string;
  kind: ReportRowKind;
  level: number;
  label: string;
  debitAmount: number;
  creditAmount: number;
}

interface ScheduleLevel {
  field: keyof Pick<TBRow, 'mainName' | 'groupName' | 'subGroupName' | 'subHead'>;
  sortField: keyof Pick<TBRow, 'mainNameSortOrder' | 'groupSortOrder' | 'subGroupSortOrder' | 'subHeadSortOrder'>;
  fallback: string;
}

@Component({
  selector: 'app-schedule-tb',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerModule, Companydetails],
  templateUrl: './schedule-tb.html',
})
export class ScheduleTb implements OnInit {
  private readonly commonService = inject(CommonService);
  private readonly reportService = inject(AccountsReports);
  private readonly destroyRef = inject(DestroyRef);

  readonly pDatepickerMaxDate: Date = new Date();
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly rawRows = signal<TBRow[]>([]);
  readonly displayRows = signal<ScheduleDisplayRow[]>([]);
  readonly showReport = signal(false);
  readonly reportDateLabel = signal('');
  readonly printedDate = true;

  readonly totals = computed(() => {
    return this.rawRows().reduce(
      (total, row) => ({
        debitAmount: total.debitAmount + this.toNumber(row.debitAmount),
        creditAmount: total.creditAmount + this.toNumber(row.creditAmount),
      }),
      { debitAmount: 0, creditAmount: 0 }
    );
  });

  asOnDate: Date = new Date();

  private readonly levels: ScheduleLevel[] = [
    { field: 'mainName', sortField: 'mainNameSortOrder', fallback: 'Main Head' },
    { field: 'groupName', sortField: 'groupSortOrder', fallback: 'Group' },
    { field: 'subGroupName', sortField: 'subGroupSortOrder', fallback: 'Sub Group' },
    { field: 'subHead', sortField: 'subHeadSortOrder', fallback: 'Sub Head' },
  ];

  ngOnInit(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.asOnDate = today;
    this.reportDateLabel.set(this.formatDisplayDate(today));
  }

  generateReport(form: NgForm): void {
    this.submitted.set(true);
    this.errorMsg.set(null);

    if (!form.valid || !this.asOnDate) {
      return;
    }

    const toDate = this.commonService.getFormatDateNormal(this.asOnDate);
    if (!toDate) {
      this.errorMsg.set('Select a valid as on date.');
      return;
    }

    this.loading.set(true);
    this.showReport.set(false);
    this.rawRows.set([]);
    this.displayRows.set([]);
    this.reportDateLabel.set(this.formatDisplayDate(this.asOnDate));

    this.reportService
      .GetScheduleTBNestedReport(
        toDate,
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const rows = Array.isArray(res) ? res.map(row => this.normalizeRow(row)) : [];
          const activeRows = rows.filter(row => row.accountName && (row.debitAmount || row.creditAmount));

          if (!activeRows.length) {
            this.errorMsg.set('No data found for the selected date.');
            this.loading.set(false);
            return;
          }

          this.rawRows.set(this.sortRows(activeRows));
          this.displayRows.set(this.buildDisplayRows(this.rawRows()));
          this.showReport.set(true);
          this.loading.set(false);
        },
        error: (err) => {
          this.errorMsg.set(this.readError(err));
          this.loading.set(false);
        },
      });

      // this.resetBtn();
    
    error: (err: any) => {

      const status = err?.status;

      if (status === 404 || status === 204 || status === 400) {

        alert('No data found for the selected date.');

      } else {

        this.errorMsg.set(
          'An error occurred while fetching report data.'
        );
      }

      // this.resetBtn();
    }
  }

  rowClass(row: ScheduleDisplayRow): string {
    if (row.kind === 'account') return 'schedule-row schedule-row-account';
    if (row.kind === 'grand-total') return 'schedule-row schedule-row-grand';
    return `schedule-row schedule-row-level schedule-row-level-${Math.min(row.level, 3)}`;
  }

  rowIndent(row: ScheduleDisplayRow): number {
    return 16 + row.level * 24;
  }

  levelLabel(row: ScheduleDisplayRow): string {
    if (row.kind === 'account') return '';
    if (row.kind === 'grand-total') return 'Total';
    return ['Main', 'Group', 'Sub Group', 'Sub Head'][row.level] ?? 'Head';
  }

  amountText(value: number): string {
    if (!value) return '';
    return this.formatAmount(value);
  }

  exportExcel(): void {
    if (!this.ensureReport()) return;

    const rows = this.displayRows().map(row => ({
      Level: row.kind === 'account' ? 'Account' : this.levelLabel(row),
      Particulars: row.label,
      Debit: row.debitAmount || '',
      Credit: row.creditAmount || '',
    }));

    this.commonService.exportAsExcelFile(rows, `Schedule_TB_${this.formatFileDate(this.asOnDate)}`);
  }

  exportPdf(): void {
    if (!this.ensureReport()) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const company = this.commonService._getCompanyDetails() ?? {};
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 10;
    const totalPagesExp = '{total_pages_count_string}';
    const logo = this.commonService.getKapilGroupLogo();

    if (logo) {
      doc.addImage(logo, 'JPEG', 10, 6, 20, 20);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(company.companyName ?? '', pageWidth / 2, 11, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(company.registrationAddress ?? '', pageWidth / 2, 17, { align: 'center', maxWidth: 150 });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Schedule Trial Balance', pageWidth / 2, 31, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`As on: ${this.reportDateLabel()}`, marginX, 39);
    doc.text(`Branch: ${company.branchName ?? this.commonService.getBranchCode()}`, pageWidth - marginX, 39, { align: 'right' });

    const body = this.displayRows().map(row => this.pdfRow(row));

    autoTable(doc, {
      startY: 44,
      head: [['Particulars', 'Debit Amount', 'Credit Amount']],
      body,
      theme: 'grid',
      margin: { left: marginX, right: marginX, bottom: 16 },
      headStyles: {
        fillColor: [12, 74, 110],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 1.8,
        overflow: 'linebreak',
        lineColor: [210, 220, 230],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 118 },
        1: { cellWidth: 36, halign: 'right' },
        2: { cellWidth: 36, halign: 'right' },
      },
      didDrawPage: () => {
        const page = `Page ${doc.getNumberOfPages()}${typeof doc.putTotalPages === 'function' ? ` of ${totalPagesExp}` : ''}`;
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);
        doc.text(`Printed on: ${this.formatDisplayDate(new Date())}`, marginX, pageHeight - 6);
        doc.text(page, pageWidth - marginX, pageHeight - 6, { align: 'right' });
      },
    });

    if (typeof doc.putTotalPages === 'function') {
      doc.putTotalPages(totalPagesExp);
    }

    doc.save(`Schedule_TB_${this.formatFileDate(this.asOnDate)}.pdf`);
  }

  printReport(): void {
    if (!this.ensureReport()) return;

    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      this.errorMsg.set('Popup blocked. Allow popups to print the report.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(this.buildPrintableHtml());
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  mailReport(): void {
    if (!this.ensureReport()) return;

    const company = this.commonService._getCompanyDetails() ?? {};
    const subject = encodeURIComponent(`Schedule Trial Balance - ${this.reportDateLabel()}`);
    const body = encodeURIComponent([
      `${company.companyName ?? ''}`,
      `Schedule Trial Balance`,
      `As on: ${this.reportDateLabel()}`,
      `Branch: ${company.branchName ?? this.commonService.getBranchCode()}`,
      '',
      this.mailBodyPreview(),
      '',
      'Use the ERP PDF or Excel export buttons for the complete report file.',
    ].join('\n'));

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  private buildDisplayRows(rows: TBRow[]): ScheduleDisplayRow[] {
    const output: ScheduleDisplayRow[] = [];
    this.appendLevel(output, rows, 0, 'root', 0);

    output.push({
      id: 'grand-total',
      kind: 'grand-total',
      level: 0,
      label: 'Grand Total',
      debitAmount: this.totals().debitAmount,
      creditAmount: this.totals().creditAmount,
    });

    return output;
  }

  private appendLevel(output: ScheduleDisplayRow[], rows: TBRow[], level: number, path: string, displayLevel: number): void {
    if (level >= this.levels.length) {
      rows
        .slice()
        .sort((a, b) => a.accountName.localeCompare(b.accountName))
        .forEach((row, index) => {
          output.push({
            id: `${path}-account-${index}-${row.accountId || 'na'}`,
            kind: 'account',
            level: displayLevel,
            label: row.accountName,
            debitAmount: row.debitAmount,
            creditAmount: row.creditAmount,
          });
        });
      return;
    }

    const levelConfig = this.levels[level];

    if (!rows.some(row => this.cleanText(row[levelConfig.field]))) {
      this.appendLevel(output, rows, level + 1, path, displayLevel);
      return;
    }

    const groups = new Map<string, TBRow[]>();

    rows.forEach(row => {
      const label = this.cleanText(row[levelConfig.field]);
      const key = label || levelConfig.fallback;
      const groupRows = groups.get(key) ?? [];
      groupRows.push(row);
      groups.set(key, groupRows);
    });

    Array.from(groups.entries())
      .sort((a, b) => this.groupSortValue(a[1], levelConfig.sortField) - this.groupSortValue(b[1], levelConfig.sortField) || a[0].localeCompare(b[0]))
      .forEach(([label, groupedRows], index) => {
        const totals = this.sumRows(groupedRows);
        const groupId = `${path}-${level}-${index}`;

        output.push({
          id: groupId,
          kind: 'group',
          level: displayLevel,
          label,
          debitAmount: totals.debitAmount,
          creditAmount: totals.creditAmount,
        });

        this.appendLevel(output, groupedRows, level + 1, groupId, displayLevel + 1);
      });
  }

  private normalizeRow(row: any): TBRow {
    const accountId = this.cleanText(row.accountId ?? row.account_id1 ?? row.accountid ?? row.accountId1);
    const accountName = this.cleanText(row.accountName ?? row.account_name1 ?? row.vchaccountname ?? row.accountname ?? row.accountName1);

    return {
      accountId,
      accountName: accountName || (accountId ? `Account ${accountId}` : 'Unnamed Account'),
      debitAmount: this.toNumber(row.debitAmount ?? row.debitamount1 ?? row.debitamount ?? row.debitAmount1),
      creditAmount: this.toNumber(row.creditAmount ?? row.creditamount1 ?? row.creditamount ?? row.creditAmount1),
      mainName: this.cleanText(row.mainName ?? row.mainname1 ?? row.mainname ?? row.mainName1),
      groupName: this.cleanText(row.groupName ?? row.groupname1 ?? row.groupname ?? row.groupName1),
      subGroupName: this.cleanText(row.subGroupName ?? row.subgroupname1 ?? row.subgroupname ?? row.subGroupName1),
      subHead: this.cleanText(row.subHead ?? row.subhead1 ?? row.subhead ?? row.subHead1),
      mainNameSortOrder: this.toNumber(row.mainNameSortOrder ?? row.sortorder1 ?? row.mainnamesortorder ?? row.sortOrder1),
      groupSortOrder: this.toNumber(row.groupSortOrder ?? row.groupsortorder1 ?? row.groupsortorder ?? row.groupSortOrder1),
      subGroupSortOrder: this.toNumber(row.subGroupSortOrder ?? row.subgroupsortorder1 ?? row.subgroupsortorder ?? row.subGroupSortOrder1),
      subHeadSortOrder: this.toNumber(row.subHeadSortOrder ?? row.subheadsortorder1 ?? row.subheadsortorder ?? row.subHeadSortOrder1),
    };
  }

  private sortRows(rows: TBRow[]): TBRow[] {
    return rows.slice().sort((a, b) =>
      a.mainNameSortOrder - b.mainNameSortOrder ||
      a.groupSortOrder - b.groupSortOrder ||
      a.subGroupSortOrder - b.subGroupSortOrder ||
      a.subHeadSortOrder - b.subHeadSortOrder ||
      a.mainName.localeCompare(b.mainName) ||
      a.groupName.localeCompare(b.groupName) ||
      a.subGroupName.localeCompare(b.subGroupName) ||
      a.subHead.localeCompare(b.subHead) ||
      a.accountName.localeCompare(b.accountName)
    );
  }

  private pdfRow(row: ScheduleDisplayRow): any[] {
    const styles: any = this.pdfStylesForRow(row);
    return [
      {
        content: row.label,
        styles: {
          ...styles,
          cellPadding: { top: 1.8, bottom: 1.8, left: 2 + row.level * 4, right: 2 },
        },
      },
      { content: this.amountText(row.debitAmount), styles: { ...styles, halign: 'right' } },
      { content: this.amountText(row.creditAmount), styles: { ...styles, halign: 'right' } },
    ];
  }

  private pdfStylesForRow(row: ScheduleDisplayRow): any {
    if (row.kind === 'account') {
      return { textColor: [0, 0, 0], fontStyle: 'normal' };
    }

    if (row.kind === 'grand-total') {
      return { textColor: [0, 0, 0], fillColor: [229, 231, 235], fontStyle: 'bold' };
    }

    const palette = [
      { text: [4, 120, 87], fill: [220, 252, 231] },
      { text: [29, 78, 216], fill: [219, 234, 254] },
      { text: [126, 34, 206], fill: [243, 232, 255] },
      { text: [180, 83, 9], fill: [254, 243, 199] },
    ];
    const color = palette[Math.min(row.level, palette.length - 1)];
    return { textColor: color.text, fillColor: color.fill, fontStyle: 'bold' };
  }

  private buildPrintableHtml(): string {
    const company = this.commonService._getCompanyDetails() ?? {};
    const rows = this.displayRows().map(row => `
      <tr class="${this.rowClass(row)}">
        <td style="padding-left:${this.rowIndent(row)}px">${row.kind === 'account' ? '' : `<span class="print-chip">${this.levelLabel(row)}</span>`}${this.escapeHtml(row.label)}</td>
        <td class="amount">${this.amountText(row.debitAmount)}</td>
        <td class="amount">${this.amountText(row.creditAmount)}</td>
      </tr>
    `).join('');

    return `<!doctype html>
      <html>
      <head>
        <title>Schedule Trial Balance</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 20px; }
          h1, h2, p { margin: 0; }
          .header { text-align: center; margin-bottom: 14px; }
          .meta { display: flex; justify-content: space-between; margin: 12px 0; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 6px 8px; }
          th { background: #0c4a6e; color: #fff; text-align: center; }
          .amount { text-align: right; white-space: nowrap; }
          .schedule-row-level-0 { background: #dcfce7; color: #047857; font-weight: 700; }
          .schedule-row-level-1 { background: #dbeafe; color: #1d4ed8; font-weight: 700; }
          .schedule-row-level-2 { background: #f3e8ff; color: #7e22ce; font-weight: 700; }
          .schedule-row-level-3 { background: #fef3c7; color: #b45309; font-weight: 700; }
          .schedule-row-account { color: #000; background: #fff; }
          .schedule-row-grand { color: #000; background: #e5e7eb; font-weight: 700; }
          .print-chip { display: inline-block; min-width: 58px; margin-right: 8px; font-size: 10px; text-transform: uppercase; }
          @page { size: A4 portrait; margin: 12mm; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${this.escapeHtml(company.companyName ?? '')}</h2>
          <p>${this.escapeHtml(company.registrationAddress ?? '')}</p>
          <h1>Schedule Trial Balance</h1>
        </div>
        <div class="meta">
          <strong>As on: ${this.escapeHtml(this.reportDateLabel())}</strong>
          <strong>Branch: ${this.escapeHtml(company.branchName ?? this.commonService.getBranchCode())}</strong>
        </div>
        <table>
          <thead><tr><th>Particulars</th><th>Debit Amount</th><th>Credit Amount</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>`;
  }

  private mailBodyPreview(): string {
    const previewRows = this.displayRows()
      .slice(0, 60)
      .map(row => `${'  '.repeat(Math.max(row.level, 0))}${row.label}  Dr: ${this.amountText(row.debitAmount) || '-'}  Cr: ${this.amountText(row.creditAmount) || '-'}`);

    if (this.displayRows().length > 60) {
      previewRows.push(`... ${this.displayRows().length - 60} more rows`);
    }

    return previewRows.join('\n');
  }

  private ensureReport(): boolean {
    if (!this.displayRows().length) {
      this.errorMsg.set('Generate the report before exporting.');
      return false;
    }
    return true;
  }

  private sumRows(rows: TBRow[]): { debitAmount: number; creditAmount: number } {
    return rows.reduce(
      (total, row) => ({
        debitAmount: total.debitAmount + this.toNumber(row.debitAmount),
        creditAmount: total.creditAmount + this.toNumber(row.creditAmount),
      }),
      { debitAmount: 0, creditAmount: 0 }
    );
  }

  private groupSortValue(rows: TBRow[], sortField: ScheduleLevel['sortField']): number {
    const values = rows.map(row => this.toNumber(row[sortField])).filter(value => value > 0);
    return values.length ? Math.min(...values) : Number.MAX_SAFE_INTEGER;
  }

  private formatAmount(value: number): string {
    return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private formatDisplayDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    return `${day}-${month}-${date.getFullYear()}`;
  }

  private formatFileDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private cleanText(value: unknown): string {
    return String(value ?? '').trim();
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private readError(err: any): string {
    if (typeof err === 'string') return err;
    return err?.error?.message ?? err?.error ?? err?.message ?? 'An error occurred while fetching report data.';
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
