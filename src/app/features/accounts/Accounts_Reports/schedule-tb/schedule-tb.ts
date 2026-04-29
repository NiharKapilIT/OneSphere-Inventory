
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CommonService } from '../../../../core/services/Common/common.service';
import { DatePickerModule } from 'primeng/datepicker';

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

interface TBResponse {
  status: string;
  message?: string;
  dateLabel?: string;
  rows?: TBRow[];
}

@Component({
  selector: "app-schedule-tb",
  standalone:true,
  imports: [CommonModule, FormsModule, HttpClientModule, DatePickerModule],
  templateUrl: "./schedule-tb.html",
  styleUrl: "./schedule-tb.css",
})

export class ScheduleTb implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  private http = inject(HttpClient);
  private commonService = inject(CommonService);

  // ── Signals ──────────────────────────────────────────────────────────
  readonly loading = signal<boolean>(false);
  readonly btnPrint = signal<string>('Print');
  readonly errorMsg = signal<string | null>(null);
  readonly submitted = signal<boolean>(false);

  // ── State ─────────────────────────────────────────────────────────────
  asOnDate: Date = new Date();

  private readonly apiBase = 'https://localhost:5001/api';

  // ── Datepicker config ─────────────────────────────────────────────────
  readonly dpConfig: any = {
    containerClass: 'theme-dark-blue',
    dateInputFormat: 'DD-MMM-YYYY',
    maxDate: new Date(),
    showWeekNumbers: false,
  };

  ngOnInit(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.asOnDate = today;
  }

  // ── Print / Generate ──────────────────────────────────────────────────
  print(form: NgForm): void {
    this.submitted.set(true);
    this.errorMsg.set(null);

    if (!form.valid || !this.asOnDate) return;

    const toDate = this.formatDate(this.asOnDate);
    this.loading.set(true);
    this.btnPrint.set('Loading...');

    const params = new HttpParams()
      .set('fromDate', 'null')
      .set('toDate', toDate);

    this.http
      .get<any>(`${this.apiBase}/Accounts/GetScheduleTBReport`, { params })
      .subscribe({
        next: (res) => {
          let rows: TBRow[] = [];
          let dateLabel = 'AS ON ' + this.formatDateLabel(this.asOnDate);

          if (Array.isArray(res)) {
            rows = res as TBRow[];
          } else if (res?.status === 'ok' && res.rows) {
            rows = res.rows;
            dateLabel = res.dateLabel ?? dateLabel;
          } else {
            this.errorMsg.set(res?.message || 'Could not generate report.');
            this.resetBtn();
            return;
          }

          if (!rows?.length) {
            this.errorMsg.set('No data found for the selected date.');
            this.resetBtn();
            return;
          }

          this.generatePdf({ status: 'ok', rows, dateLabel });
          this.resetBtn();
        },
        error: () => {
          this.errorMsg.set('An error occurred while fetching report data.');
          this.resetBtn();
        },
      });
  }

  // ── PDF Generation ────────────────────────────────────────────────────
  private generatePdf(data: TBResponse): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginL = 14;
    const marginR = 14;
    const contentW = pageW - marginL - marginR;
    const col0W = contentW - 50;
    const col1W = 25;
    const col2W = 25;

    const kapilLogo = this.getKapilGroupLogo();
    const companyDetails = this.commonService._getCompanyDetails();
    const companyName = companyDetails?.companyName ?? '';
    const companyAddress = companyDetails?.registrationAddress ?? '';

    const drawPageHeader = (doc: jsPDF): number => {
      let y = 8;
      doc.addImage(kapilLogo, 'JPEG', 10, 5, 20, 20);

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(companyName, pageW / 2, y, { align: 'center' });
      y += 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(companyAddress, pageW / 2, y, { align: 'center' });
      y += 4;
      doc.text('Phone : , Email :', pageW / 2, y, { align: 'center' });
      y += 10;

      doc.setLineWidth(0.5);
      doc.line(marginL, y, pageW - marginR, y);
      y += 4;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('SCHEDULE TRIAL BALANCE ' + (data.dateLabel ?? ''), marginL, y);
      doc.text('TEST DIVISION', pageW - marginR, y, { align: 'right' });
      y += 3;

      doc.setLineWidth(0.5);
      doc.line(marginL, y, pageW - marginR, y);
      y += 1;

      autoTable(doc, {
        startY: y,
        head: [['Account Name', 'Debit Amount\u20B9', 'Credit Amount\u20B9']],
        body: [],
        theme: 'plain',
        headStyles: {
          fontStyle: 'bold', fontSize: 9, textColor: 0,
          fillColor: false, halign: 'center',
          cellPadding: { top: 2, bottom: 1, left: 2, right: 2 },
          lineWidth: { bottom: 0.3 }, lineColor: [0, 0, 0],
        },
        columnStyles: {
          0: { cellWidth: col0W, halign: 'center' },
          1: { cellWidth: col1W, halign: 'center' },
          2: { cellWidth: col2W, halign: 'center' },
        },
        margin: { left: marginL, right: marginR },
        tableWidth: contentW,
      });

      return (doc as any).lastAutoTable.finalY + 1;
    };

    let y = drawPageHeader(doc);
    const grouped = this.groupRows(data.rows!);
    let totalDebit = 0;
    let totalCredit = 0;
    let rowCount = 0;

    const drawSeparator = () => {
      const dashes = '-'.repeat(130);
      autoTable(doc, {
        startY: y,
        body: [[{ content: dashes, colSpan: 3, styles: { halign: 'left', fontSize: 6, textColor: 150, cellPadding: { top: 0, bottom: 0, left: 2, right: 2 } } }]],
        theme: 'plain',
        columnStyles: { 0: { cellWidth: col0W }, 1: { cellWidth: col1W }, 2: { cellWidth: col2W } },
        margin: { left: marginL, right: marginR },
        tableWidth: contentW,
      });
      y = (doc as any).lastAutoTable.finalY;
    };

    for (const [mainname, groups] of Object.entries(grouped)) {
      autoTable(doc, {
        startY: y,
        body: [[{ content: mainname, colSpan: 3, styles: { fontStyle: 'bold', fontSize: 9, textColor: 0, cellPadding: { top: 2, bottom: 1, left: 2, right: 2 } } }]],
        theme: 'plain',
        columnStyles: { 0: { cellWidth: col0W }, 1: { cellWidth: col1W }, 2: { cellWidth: col2W } },
        margin: { left: marginL, right: marginR },
        tableWidth: contentW,
      });
      y = (doc as any).lastAutoTable.finalY;

      for (const [groupname, subgroups] of Object.entries(groups as any)) {
        autoTable(doc, {
          startY: y,
          body: [[{ content: '  ' + groupname, colSpan: 3, styles: { fontStyle: 'bold', fontSize: 9, textColor: 0, cellPadding: { top: 1.5, bottom: 1, left: 2, right: 2 } } }]],
          theme: 'plain',
          columnStyles: { 0: { cellWidth: col0W }, 1: { cellWidth: col1W }, 2: { cellWidth: col2W } },
          margin: { left: marginL, right: marginR },
          tableWidth: contentW,
        });
        y = (doc as any).lastAutoTable.finalY;

        for (const [subgroupname, subheads] of Object.entries(subgroups as any)) {
          if (subgroupname) {
            autoTable(doc, {
              startY: y,
              body: [[{ content: '    ' + subgroupname, colSpan: 3, styles: { fontStyle: 'bold', fontSize: 9, textColor: 0, cellPadding: { top: 1.5, bottom: 1, left: 2, right: 2 } } }]],
              theme: 'plain',
              columnStyles: { 0: { cellWidth: col0W }, 1: { cellWidth: col1W }, 2: { cellWidth: col2W } },
              margin: { left: marginL, right: marginR },
              tableWidth: contentW,
            });
            y = (doc as any).lastAutoTable.finalY;
          }

          for (const [subhead, accounts] of Object.entries(subheads as any)) {
            if (subhead) {
              autoTable(doc, {
                startY: y,
                body: [[{ content: '      ' + subhead, colSpan: 3, styles: { fontStyle: 'bold', fontSize: 9, textColor: 0, cellPadding: { top: 1.5, bottom: 1, left: 2, right: 2 } } }]],
                theme: 'plain',
                columnStyles: { 0: { cellWidth: col0W }, 1: { cellWidth: col1W }, 2: { cellWidth: col2W } },
                margin: { left: marginL, right: marginR },
                tableWidth: contentW,
              });
              y = (doc as any).lastAutoTable.finalY;
            }

            const bodyRows = (accounts as TBRow[]).map(r => [
              '        ' + r.accountName,
              r.debitAmount > 0 ? this.formatAmt(r.debitAmount) : '',
              r.creditAmount > 0 ? this.formatAmt(r.creditAmount) : '',
            ]);

            autoTable(doc, {
              startY: y,
              body: bodyRows,
              theme: 'plain',
              bodyStyles: { fontSize: 8.5, textColor: 0, cellPadding: { top: 1, bottom: 1, left: 2, right: 2 } },
              columnStyles: {
                0: { cellWidth: col0W },
                1: { cellWidth: col1W, halign: 'right' },
                2: { cellWidth: col2W, halign: 'right' },
              },
              margin: { left: marginL, right: marginR },
              tableWidth: contentW,
            });
            y = (doc as any).lastAutoTable.finalY;

            totalDebit += (accounts as TBRow[]).reduce((s, r) => s + (r.debitAmount || 0), 0);
            totalCredit += (accounts as TBRow[]).reduce((s, r) => s + (r.creditAmount || 0), 0);
            rowCount++;

            if (rowCount % 8 === 0) drawSeparator();
          }
        }
      }
    }

    drawSeparator();

    autoTable(doc, {
      startY: y + 1,
      body: [[
        { content: 'Grand Total :', styles: { fontStyle: 'bold', halign: 'right' } },
        { content: this.formatAmt(totalDebit), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: this.formatAmt(totalCredit), styles: { fontStyle: 'bold', halign: 'right' } },
      ]],
      theme: 'plain',
      bodyStyles: { fontSize: 9, textColor: 0, cellPadding: { top: 2, bottom: 2, left: 2, right: 2 } },
      columnStyles: {
        0: { cellWidth: col0W },
        1: { cellWidth: col1W, halign: 'right' },
        2: { cellWidth: col2W, halign: 'right' },
      },
      margin: { left: marginL, right: marginR },
      tableWidth: contentW,
      didDrawCell: (hookData) => {
        if (hookData.row.index === 0) {
          const { x, y: cy, width, height } = hookData.cell;
          doc.setLineWidth(0.4);
          doc.line(x, cy, x + width, cy);
          doc.line(x, cy + height, x + width, cy + height);
        }
      },
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    const now = new Date();
    const printedOn = `Printed On : ${this.formatDateLabel(now)} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);
      doc.text(printedOn, marginL, pageH - 5);
      doc.text(`Page ${i} of ${pageCount}`, pageW - marginR, pageH - 5, { align: 'right' });
    }

    doc.save(`ScheduleTB_${this.formatDateFile(this.asOnDate)}.pdf`);
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  private groupRows(rows: TBRow[]): Record<string, any> {
    const grouped: Record<string, any> = {};
    for (const row of rows) {
      const m = row.mainName || '';
      const g = row.groupName || '';
      const s = row.subGroupName || '';
      const h = row.subHead || '';
      if (!grouped[m]) grouped[m] = {};
      if (!grouped[m][g]) grouped[m][g] = {};
      if (!grouped[m][g][s]) grouped[m][g][s] = {};
      if (!grouped[m][g][s][h]) grouped[m][g][s][h] = [];
      grouped[m][g][s][h].push(row);
    }
    return grouped;
  }

  private formatAmt(val: number): string {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private formatDateLabel(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d}-${months[date.getMonth()]}-${date.getFullYear()}`;
  }

  private formatDate(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
  }

  private formatDateFile(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}-${m}-${date.getFullYear()}`;
  }

  private resetBtn(): void {
    this.loading.set(false);
    this.btnPrint.set('Print');
  }

  getKapilGroupLogo(): string {
    return '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';
  }
}
