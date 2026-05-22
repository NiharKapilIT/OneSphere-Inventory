
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CommonService } from '../../../../core/services/Common/common.service';
import { DatePickerModule } from 'primeng/datepicker';

interface LedgerRow {
  transDate: string;
  transNo: string;
  particulars: string;
  narration: string;
  accountName: string;
  parentAccountName: string;
  chrAccountType: string;
  debitAmount: number;
  creditAmount: number;
  lBalance: number;
  typeofremainingbal: string;
}


@Component({
  selector: "app-ledger-extract",
  standalone:true,
  imports: [CommonModule, FormsModule, DatePickerModule],
  templateUrl: "./ledger-extract.html",
  // styleUrl: "./ledger-extract.css",
})

export class LedgerExtract implements OnInit {
  pDatepickerMaxDate: Date = new Date();
  toDateMinDate: Date | null = null;


  // ── Dependencies via inject() ─────────────────────────────────────────────
  private readonly http = inject(HttpClient);
  private readonly common = inject(CommonService);

  // ── Signals ───────────────────────────────────────────────────────────────
  submitted = signal(false);

  // ── Form model ────────────────────────────────────────────────────────────
  rc = {
    FromDate: null as Date | null,
    ToDate: null as Date | null,
    Narration: false,
    ExportType: 'PDF',
  };

  // ── Static data ───────────────────────────────────────────────────────────
  readonly exportTypes = [
    { value: 'PDF', label: 'PDF' },
    { value: 'EXCEL', label: 'EXCEL' },
  ];

  dpConfig: any = {
    containerClass: 'theme-dark-blue',
    dateInputFormat: 'DD-MMM-YYYY',
    maxDate: new Date(),
    showWeekNumbers: false,
  };

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.rc.FromDate = today;
    this.rc.ToDate = today;
    this.toDateMinDate = today;
  }
  onFromDateChange(val: any | null): void {
  this.toDateMinDate = val ?? null;
  if (this.rc.ToDate && val && this.rc.ToDate < val) {
    this.rc.ToDate = null;
  }
}

  // ── Public actions ────────────────────────────────────────────────────────
  print(): void {
    this.submitted.set(true);

    if (!this.rc.FromDate || !this.rc.ToDate || !this.rc.ExportType) return;

    if (this.rc.FromDate > this.rc.ToDate) {
      alert('From Date Should Be Less Than To Date.');
      return;
    }

    const fromApi = this.formatDateForApi(this.rc.FromDate);
    const toApi = this.formatDateForApi(this.rc.ToDate);
    const fromDisplay = this.formatDate(this.rc.FromDate);
    const toDisplay = this.formatDate(this.rc.ToDate);

    this.http
      .get<LedgerRow[]>(
        `https://localhost:5001/api/Accounts/GetLedgerExtractReport?fromDate=${fromApi}&toDate=${toApi}&Narration=${this.rc.Narration}&BranchSchema=accounts`
      )
      .subscribe({
        next: (data) => {
          if (!data || data.length === 0) {
            alert('No records found for the selected date range.');
            return;
          }
          if (this.rc.ExportType === 'PDF') {
            this.generatePDF(data, fromDisplay, toDisplay);
          } else {
            this.generateExcel(data, fromDisplay, toDisplay);
          }
        },
        error: () => alert('Failed to fetch report data. Please try again.'),
      });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private generatePDF(data: LedgerRow[], from: string, to: string): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const withNarration = this.rc.Narration;

    const companyDetails = this.common._getCompanyDetails();
    const companyName = companyDetails?.companyName ?? '';
    const companyAddress = companyDetails?.registrationAddress ?? '';
    const companyCIN = companyDetails?.cinNumber ?? '';
    const colCount = withNarration ? 7 : 6;
    const footerText = "(*R - Gen.Receipt, B - Chq./DD Deposits and Returns, MV - Gen.Payments, JV - JV's,PV-Purchase Voucher,MIN-MaterialIndentNote,DR- Bank Credit,DV- Bank Debit,RJV -Gen. Cheque Cleared)";
    const kapilLogo = this.common.getKapilGroupLogo();

    const drawHeader = (doc: jsPDF) => {
      doc.addImage(kapilLogo, 'JPEG', 10, 5, 20, 20);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(companyName, pageW / 2, 10, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(companyAddress, pageW / 2, 15, { align: 'center' });
      doc.text('CIN :' + companyCIN, pageW / 2, 19, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('LEDGER EXTRACT', pageW / 2, 24, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`BETWEEN : ${from}  and  ${to}`, 14, 30);
      doc.text('TEST DIVISION', pageW - 14, 30, { align: 'right' });
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(14, 32, pageW - 14, 32);
    };

    const drawFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
      const printDate = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const pd = `${String(printDate.getDate()).padStart(2, '0')}-${months[printDate.getMonth()]}-${printDate.getFullYear()} ${String(printDate.getHours() % 12 || 12).padStart(2, '0')}:${String(printDate.getMinutes()).padStart(2, '0')} ${printDate.getHours() >= 12 ? 'pm' : 'am'}`;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      const splitFooter = doc.splitTextToSize(footerText, pageW - 28);
      doc.text(splitFooter, pageW / 2, pageH - 10, { align: 'center' });
      doc.text(`Print Date : ${pd}`, 14, pageH - 4);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageW - 14, pageH - 4, { align: 'right' });
    };

    const grouped = this.groupData(data);
    const columns = withNarration
      ? ['TransDate', 'Trans.No.', 'Particulars', 'Narration', 'Debit', 'Credit', 'Balance']
      : ['TransDate', 'Trans.No.', 'Particulars', 'Debit', 'Credit', 'Balance'];

    const tableBody: any[] = [];

    for (const parentName of Object.keys(grouped)) {
      tableBody.push([{
        content: parentName,
        colSpan: colCount,
        styles: { fontStyle: 'bold', fontSize: 8, fillColor: [255, 255, 255], textColor: 0, cellPadding: { top: 3, bottom: 1, left: 2, right: 2 } },
      }]);

      let parentDebit = 0, parentCredit = 0;

      for (const accName of Object.keys(grouped[parentName])) {
        const rows = grouped[parentName][accName];

        tableBody.push([{
          content: accName,
          colSpan: colCount,
          styles: { fontStyle: 'bold', fontSize: 7.5, fillColor: [255, 255, 255], textColor: 0, cellPadding: { top: 1, bottom: 1, left: 6, right: 2 } },
        }]);

        let accDebit = 0, accCredit = 0;

        for (const r of rows) {
          accDebit += r.debitAmount || 0;
          accCredit += r.creditAmount || 0;
          const balDisplay = `${this.formatCurrency(Math.abs(r.lBalance))} ${r.typeofremainingbal}`;
          const debitCell = r.debitAmount ? this.formatCurrency(r.debitAmount) : '';
          const creditCell = r.creditAmount ? this.formatCurrency(r.creditAmount) : '';

          if (withNarration) {
            tableBody.push([
              { content: this.formatDisplayDate(r.transDate), styles: { fontSize: 7.5 } },
              { content: r.transNo, styles: { fontSize: 7.5 } },
              { content: r.particulars, styles: { fontSize: 7.5 } },
              { content: r.narration ?? '', styles: { fontSize: 7.5 } },
              { content: debitCell, styles: { halign: 'right', fontSize: 7.5 } },
              { content: creditCell, styles: { halign: 'right', fontSize: 7.5 } },
              { content: balDisplay, styles: { halign: 'right', fontSize: 7.5 } },
            ]);
          } else {
            tableBody.push([
              { content: this.formatDisplayDate(r.transDate), styles: { fontSize: 7.5 } },
              { content: r.transNo, styles: { fontSize: 7.5 } },
              { content: r.particulars, styles: { fontSize: 7.5 } },
              { content: debitCell, styles: { halign: 'right', fontSize: 7.5 } },
              { content: creditCell, styles: { halign: 'right', fontSize: 7.5 } },
              { content: balDisplay, styles: { halign: 'right', fontSize: 7.5 } },
            ]);
          }
        }

        parentDebit += accDebit;
        parentCredit += accCredit;

        const totalSpan = withNarration ? 4 : 3;
        tableBody.push([
          { content: 'Total :', colSpan: totalSpan, styles: { halign: 'right', fontStyle: 'bold', fontSize: 7.5, fillColor: [255, 255, 255] } },
          { content: this.formatCurrency(accDebit), styles: { halign: 'right', fontStyle: 'bold', fontSize: 7.5, fillColor: [255, 255, 255] } },
          { content: this.formatCurrency(accCredit), styles: { halign: 'right', fontStyle: 'bold', fontSize: 7.5, fillColor: [255, 255, 255] } },
          { content: '', styles: { halign: 'right', fontStyle: 'bold', fontSize: 7.5, fillColor: [255, 255, 255] } },
        ]);
      }

      const netBal = parentDebit - parentCredit;
      const netBalDisplay = `${this.formatCurrency(Math.abs(netBal))} ${netBal >= 0 ? 'Dr' : 'Cr'}`;
      const grandTotalSpan = withNarration ? 4 : 3;

      tableBody.push([
        { content: 'Grand Total :', colSpan: grandTotalSpan, styles: { halign: 'right', fontStyle: 'bold', fontSize: 7.5, fillColor: [255, 255, 255] } },
        { content: this.formatCurrency(parentDebit), styles: { halign: 'right', fontStyle: 'bold', fontSize: 7.5, fillColor: [255, 255, 255] } },
        { content: this.formatCurrency(parentCredit), styles: { halign: 'right', fontStyle: 'bold', fontSize: 7.5, fillColor: [255, 255, 255] } },
        { content: netBalDisplay, styles: { halign: 'right', fontStyle: 'bold', fontSize: 7.5, fillColor: [255, 255, 255] } },
      ]);
    }

    autoTable(doc, {
      startY: 34,
      head: [columns],
      body: tableBody,
      styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak', lineColor: [180, 180, 180], lineWidth: 0.1 },
      headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', halign: 'center', fontSize: 8, lineWidth: 0.3, lineColor: [0, 0, 0] },
      columnStyles: withNarration
        ? { 0: { cellWidth: 22 }, 1: { cellWidth: 22 }, 4: { halign: 'right', cellWidth: 25 }, 5: { halign: 'right', cellWidth: 25 }, 6: { halign: 'right', cellWidth: 30 } }
        : { 0: { cellWidth: 25 }, 1: { cellWidth: 25 }, 3: { halign: 'right', cellWidth: 28 }, 4: { halign: 'right', cellWidth: 28 }, 5: { halign: 'right', cellWidth: 35 } },
      didDrawPage: () => drawHeader(doc),
      margin: { top: 34, bottom: 18, left: 14, right: 14 },
    });

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawFooter(doc, i, totalPages);
    }

    doc.save(`LedgerExtract_${from.replace(/\//g, '-')}_${to.replace(/\//g, '-')}.pdf`);
  }

  private generateExcel(data: LedgerRow[], from: string, to: string): void {
    const withNarration = this.rc.Narration;
    const grouped = this.groupData(data);
    const wb = XLSX.utils.book_new();
    const aoa: any[][] = [];

    if (withNarration) {
      aoa.push(['TransDate', 'Trans.No.', 'Particulars', 'Narration', 'Debit', 'Credit', 'Balance']);
    } else {
      aoa.push(['TransDate', 'Trans.No.', 'Particulars', 'Debit', 'Credit', 'Balance']);
    }

    for (const parentName of Object.keys(grouped)) {
      aoa.push([parentName]);
      let parentDebit = 0, parentCredit = 0;

      for (const accName of Object.keys(grouped[parentName])) {
        const rows = grouped[parentName][accName];
        const parentAccounts = Object.keys(grouped[parentName]);
        if (parentAccounts.length > 1) aoa.push([accName]);

        let accDebit = 0, accCredit = 0;

        for (const r of rows) {
          accDebit += r.debitAmount || 0;
          accCredit += r.creditAmount || 0;
          const datePart = r.transDate ? r.transDate.split('T')[0] : '';
          const dateVal = datePart ? new Date(datePart) : '';

          if (withNarration) {
            aoa.push([dateVal, r.transNo, r.particulars, r.narration ?? '', r.debitAmount || 0, r.creditAmount || 0, r.lBalance]);
          } else {
            aoa.push([dateVal, r.transNo, r.particulars, r.debitAmount || 0, r.creditAmount || 0, r.lBalance]);
          }
        }

        parentDebit += accDebit;
        parentCredit += accCredit;
        aoa.push(['Total :', accDebit, accCredit]);
      }

      const netBal = parentDebit - parentCredit;
      aoa.push(['Grand Total :', parentDebit, parentCredit, netBal]);
      aoa.push([]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = withNarration
      ? [{ wch: 20 }, { wch: 14 }, { wch: 50 }, { wch: 35 }, { wch: 14 }, { wch: 14 }, { wch: 16 }]
      : [{ wch: 20 }, { wch: 14 }, { wch: 50 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];

    const debitCol = withNarration ? 'E' : 'D';
    const creditCol = withNarration ? 'F' : 'E';
    const balCol = withNarration ? 'G' : 'F';
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

    for (let R = range.s.r; R <= range.e.r; R++) {
      const cellA = ws[`A${R + 1}`];
      if (cellA && cellA.t === 'd') cellA.z = 'dd-mm-yyyy';
      for (const col of [debitCol, creditCol, balCol]) {
        const nc = `${col}${R + 1}`;
        if (ws[nc] && ws[nc].t === 'n') ws[nc].z = '#,##0.00';
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Ledger Extract');
    XLSX.writeFile(wb, `LedgerExtract_${from.replace(/\//g, '-')}_${to.replace(/\//g, '-')}.xlsx`);
  }

  // ── Shared grouping helper ─────────────────────────────────────────────────
  private groupData(data: LedgerRow[]): Record<string, Record<string, LedgerRow[]>> {
    const grouped: Record<string, Record<string, LedgerRow[]>> = {};
    for (const row of data) {
      const parent = row.parentAccountName || 'OTHERS';
      const acc = row.accountName;
      if (!grouped[parent]) grouped[parent] = {};
      if (!grouped[parent][acc]) grouped[parent][acc] = [];
      grouped[parent][acc].push(row);
    }
    return grouped;
  }

  // ── Date / number formatters ───────────────────────────────────────────────
  private formatDateForApi(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' }); 
  return `${day}-${month}-${d.getFullYear()}`;
}

private formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${day}-${month}-${d.getFullYear()}`;
}

  private formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}-${month}-${year} 00`;
  }

  private formatCurrency(value: number): string {
    if (value == null || isNaN(value)) return '0.00';
    return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

