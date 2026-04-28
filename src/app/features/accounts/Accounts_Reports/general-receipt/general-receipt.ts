
import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import autoTable from 'jspdf-autotable';
import jsPDF from 'jspdf';
import { take } from 'rxjs';
import { NumberToWordsPipe } from '../../../../shared/pipes/number-to-words-pipe';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { CompanyDetailsService } from '../../../../core/services/Common/company-details-service';

@Component({
  selector: "app-general-receipt",
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, TitleCasePipe, NumberToWordsPipe],
  templateUrl: "./general-receipt.html",
  styleUrl: "./general-receipt.css",
  providers: [NumberToWordsPipe, DatePipe]
})

export class GeneralReceipt implements OnInit {

  // ── DI via inject() ─────────────────────────────────────────────────────────
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly commonService = inject(CommonService);
  private readonly receiptService = inject(AccountsReports);
  private readonly companyService = inject(CompanyDetailsService);
  private readonly datePipe = inject(DatePipe);
  private readonly numberToWords = inject(NumberToWordsPipe);
  private readonly destroyRef = inject(DestroyRef);

  // ── Signals ──────────────────────────────────────────────────────────────────
  receiptData = signal<any[]>([]);
  cancelled = signal<boolean>(false);
  duplicate = signal<string>('');
  receiptName = signal<string>('');
  companyName = signal<string>('');
  cinNumber = signal<string>('');
  branchName = signal<string>('');
  registrationAddress = signal<string>('');
  printedon = signal<Date>(new Date());

  // ── Plain fields ─────────────────────────────────────────────────────────────
  currencySymbol: string = '₹';
  username: string = sessionStorage.getItem('username') ?? '';
  printFileName: string = '';

  private generalreceiptID: string = '';
  private schemaName: string = '';

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.printedon.set(new Date());
    this.loadCompanyDetails();
    this.readRouteParams();
  }

  // ── Route params ──────────────────────────────────────────────────────────────
  private readRouteParams(): void {
    this.activatedRoute.paramMap.pipe(take(1)).subscribe(params => {
      const encodedId = params.get('id') ?? '';

      if (!encodedId) {
        console.warn('No ID found in params');
        return;
      }

      try {
        const decoded = atob(decodeURIComponent(encodedId));
        const split = decoded.split(',');

        this.generalreceiptID = split[0] ?? '';
        this.receiptName.set(split[1] ?? '');
        this.schemaName = split[3] ?? '';

        if (split[2]) {
          this.duplicate.set(split[2]);
        }

        if (this.generalreceiptID) {
          this.fetchReceiptById(this.generalreceiptID);
        }
      } catch (err) {
        console.error('Invalid Base64 ID:', err);
      }
    });
  }

  // ── Company data ───────────────────────────────────────────────────────────────
  private loadCompanyDetails(): void {
    this.companyService.GetCompanyData().subscribe({
      next: (res: any) => {
        const company = res[0];
        this.companyName.set(company?.companyName ?? '');
        this.cinNumber.set(company?.cinNumber ?? '');
        this.branchName.set(company?.branchName ?? '');
        this.registrationAddress.set(company?.registrationAddress ?? '');
      },
      error: err => this.commonService.showErrorMessage(err)
    });
  }

  // ── API call ───────────────────────────────────────────────────────────────────
  private fetchReceiptById(id: string): void {
    this.receiptService
      .GetGeneralReceiptbyId(
        id,
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode(),
        this.commonService.getschemaname()
      )
      .subscribe({
        next: (res: any) => {
          if (!res?.length) return;
          this.receiptData.set(res);

          const first = res[0];
          const receiptDate = this.datePipe.transform(first.receipt_date, 'ddMMyyyy');
          const today = this.datePipe.transform(new Date(), 'ddMMyyyyhmmssa');
          this.printFileName = `GR_${first.receiptid}_RD_${receiptDate}_PD_${today}`;
        },
        error: err => this.commonService.showErrorMessage(err)
      });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────────
  getTotalAmount(list: any[]): number {
    if (!list?.length) return 0;
    return list.reduce((total: number, item: any) => total + (Number(item?.pLedgeramount) || 0), 0);
  }

  getNarration(narration: any): string {
    if (typeof narration === 'string') return narration;
    return narration?.narration ?? '';
  }

  getPaymentModeLabel(code: string): string {
    const map: Record<string, string> = {
      CH: 'Chq',
      U: 'UPI',
      DC: 'Debit Card',
      NEFT: 'NEFT',
      RTGS: 'RTGS'
    };
    return map[code] ?? code;
  }

  isCash(mode: string): boolean {
    return mode === 'C' || mode === 'CASH';
  }

  isCheque(type: string): boolean {
    return type === 'CH';
  }

  hasStringRef(ref: any): boolean {
    return typeof ref === 'string' && !!ref;
  }

  getBankName(bank: any): string {
    return typeof bank === 'string' ? bank : '';
  }
   getKapilGroupLogo() {
debugger
let img:string='';
let Company = this.commonService._getCompanyDetails();
  img = Company.companyLogo;
    return img;
  }

  // ── PDF / Print ────────────────────────────────────────────────────────────────
  pdfOrprint(type: 'Pdf' | 'Print'): void {
    const gridheaders = ['S.No.', 'Particulars', 'Amount'];
    const columnStyles = {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 40, halign: 'right' }
    };
    this.createPdf(this.receiptName(), gridheaders, columnStyles, type);
  }

  private createPdf(
    reportname: string,
    gridheaders: any[],
    columnStyles: any,
    type: 'Pdf' | 'Print'
  ): void {
    const data = this.receiptData();
    if (!data.length) return;

    const kapilLogo = this.getKapilGroupLogo();
    const doc = new jsPDF('p', 'mm', 'a4');
    const companyDetails = this.commonService._getCompanyDetails();
    const companyName = companyDetails?.companyName ?? '';
    const companyAddress = companyDetails?.registrationAddress ?? '';
    const companyCIN = companyDetails?.cinNumber ?? '';
    const pageWidth = doc.internal.pageSize.getWidth();

    data.forEach((row, index) => {
      doc.addImage(kapilLogo, 'JPEG', 10, 5, 20, 20);

      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text(companyName, pageWidth / 2, 15, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(companyAddress, pageWidth / 2, 21, { align: 'center' });
      doc.text(`CIN : ${companyCIN}`, pageWidth / 2, 26, { align: 'center' });

      doc.setFontSize(12);
      doc.text(reportname, 105, 35, { align: 'center' });

      doc.setFontSize(9);
      doc.text(`Receipt No : ${row.receiptid}`, 15, 38);
      doc.text(
        `Date : ${this.datePipe.transform(row.receipt_date, 'dd-MMM-yyyy')}`,
        150, 38
      );

      const subList: any[] = row.pGeneralReceiptSubDetailsList ?? [];
      const tableRows: any[] = subList.map((item: any, i: number) => [
        i + 1,
        item.pAccountname,
        this.commonService.currencyFormat(item.pLedgeramount)
      ]);

      const total = subList.reduce((s: number, x: any) => s + x.pLedgeramount, 0);
      tableRows.push([
        { content: 'Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
        this.commonService.currencyFormat(total)
      ]);

      autoTable(doc, {
        head: [gridheaders],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        headStyles: {
          fillColor: this.commonService.pdfProperties('Header Color'),
          halign: this.commonService.pdfProperties('Header Alignment') as any,
          fontSize: Number(this.commonService.pdfProperties('Header Fontsize'))
        },
        styles: { fontSize: 9 },
        columnStyles
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      const amountWords = `Rupees ${this.titleCase(this.numberToWords.transform(total))} Only.`;

      const narration = this.getNarration(row.narration);
      const modeLabel = row.modeof_receipt === 'CASH'
        ? 'CASH'
        : this.getPaymentModeLabel(row.typeofpayment ?? '');

      const refLabel = row.typeofpayment === 'CH' ? 'Chq Reference' : 'Ref No';
      const bankName = this.getBankName(row.cheque_bank);
      const refInfo = this.hasStringRef(row.reference_number)
        ? ` (${refLabel} : ${row.reference_number}, Bank : ${bankName})`
        : '';

      const content = [
        `Received With Thanks From : ${row.account_name}`,
        `Amount In Words : ${amountWords}`,
        `Narration : ${narration}`,
        `Mode Of Payment : ${modeLabel}${refInfo}`,
        `GST (Include) : ${subList[0]?.pcgstamount ?? ''}`,
        `TDS (Exclude) : ${subList[0]?.ptdsamount ?? ''}`
      ].join('\n');

      const textLines = doc.splitTextToSize(content, 180);
      doc.text(textLines, 15, finalY);

      const afterY = finalY + textLines.length * 5;
      const pageHeight = doc.internal.pageSize.height;
      const signY = Math.min(afterY + 25, pageHeight - 20);

      doc.text('(Approved By)', 25, signY);
      doc.text('(Verified By)', 90, signY);
      doc.text(this.username, 160, signY - 6);
      doc.text('(Posted By)', 160, signY);

      if (index < data.length - 1) doc.addPage();
    });

    if (type === 'Pdf') {
      doc.save(`${reportname}.pdf`);
    } else {
      this.commonService.setiFrameForPrint(doc);
    }
  }

  titleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // private getKapilGroupLogo(): string {
  //   return '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';
  // }
}

