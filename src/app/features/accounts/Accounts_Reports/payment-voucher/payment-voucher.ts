
import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { take } from 'rxjs';
import { NumberToWordsPipe } from '../../../../shared/pipes/number-to-words-pipe';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { CompanyDetailsService } from '../../../../core/services/Common/company-details-service';

@Component({
  selector: "app-payment-voucher",
  standalone: true,
  imports: [CommonModule, DatePipe, NumberToWordsPipe, TitleCasePipe, DecimalPipe],
  templateUrl: "./payment-voucher.html",
  styleUrl: "./payment-voucher.css",
  providers: [NumberToWordsPipe, DatePipe]

})

export class PaymentVoucher implements OnInit {

  // ── DI via inject() ──────────────────────────────────────────────────────────
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly commonService = inject(CommonService);
  private readonly paymentService = inject(AccountsReports);
  private readonly companyService = inject(CompanyDetailsService);
  private readonly numberToWords = inject(NumberToWordsPipe);
  private readonly datePipe = inject(DatePipe);
  private readonly destroyRef = inject(DestroyRef);

  // ── Signals ──────────────────────────────────────────────────────────────────
  loading = signal(false);
  tempPaymentData = signal<any[]>([]);
  showGrid = signal(false);

  // ── Company / header fields ───────────────────────────────────────────────
  companyName = signal<string>('');
  registrationAddress = signal<string>('');
  cinNumber = signal<string>('');
  branchName = signal<string>('');

  // ── Misc state ────────────────────────────────────────────────────────────
  todaydate = signal<Date>(new Date());
  receiptName = signal<string>('');
  duplicate = signal<string>('');
  currencysymbol: string;
  Gstinn = signal<string>('');
  gstNumber = signal<string>('');
  branchAddress: string = '';
  username: string = sessionStorage.getItem('username') ?? '';

  private pvnumber: string = '';

  constructor() {
    this.currencysymbol = "₹";
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.todaydate.set(new Date());
    this.getCompanyName();
    this.readRouteParams();
  }

  // ── Route params ─────────────────────────────────────────────────────────
  private readRouteParams(): void {
    this.activatedRoute.paramMap.pipe(take(1)).subscribe(params => {
      const encodedId = params.get('id') ?? '';
      if (!encodedId) {
        console.error('No id param found');
        return;
      }

      const routeParams = atob(decodeURIComponent(encodedId));
      const splitData = routeParams.split(',');

      this.pvnumber = splitData[0];
      this.receiptName.set(splitData[1]);

      if (splitData.length === 3) {
        this.duplicate.set(splitData[2]);
      }

      const name = this.receiptName();
      if (name === 'Petty Cash') {
        this.showGrid.set(true);
        this.fetchPettyCash(this.pvnumber);
      } else if (name === 'Chit Payment') {
        this.showGrid.set(false);
        this.fetchChitPayment(this.pvnumber);
      } else {
        this.showGrid.set(true);
        this.fetchPaymentVoucher(this.pvnumber);
      }
    });
  }

  // ── Company data ─────────────────────────────────────────────────────────
  private getCompanyName(): void {
    this.companyService.GetCompanyData().subscribe({
      next: (json: any) => {
        sessionStorage.setItem('CompanyDetails', JSON.stringify(json));
        const company = json[0];

        this.companyName.set(company.companyName);
        this.registrationAddress.set(company.registrationAddress);
        this.cinNumber.set(company.cinNumber);
        this.branchName.set(company.branchName);
        this.branchAddress = company.branchAddress;
        this.gstNumber.set(company.gstNumber);

        if (company.gstNumber) {
          const digits = company.gstNumber.split('');
          this.Gstinn.set((digits[0] + digits[1]).toString());
        }
      },
      error: err => this.commonService.showErrorMessage(err)
    });
  }

  // ── API calls ─────────────────────────────────────────────────────────────
  private fetchPaymentVoucher(id: string): void {
    this.paymentService
      .GetPaymentVoucherbyId(
        id,
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode(),
        this.commonService.getschemaname()
      )
      .subscribe({
        next: (res: any) => {
          const unique = this.deduplicateById(res, 'ppaymentid');
          this.tempPaymentData.set(this.computeTotals(unique));
        },
        error: err => this.commonService.showErrorMessage(err)
      });
  }

  private fetchPettyCash(id: string): void {
    this.paymentService
      .GetPettyCashbyId(
        id,
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode(),
        this.commonService.getschemaname()
      )
      .subscribe({
        next: (res: any) => {
          const unique = this.deduplicateById(res, 'ppaymentid');
          this.tempPaymentData.set(this.computeTotals(unique));
        },
        error: err => this.commonService.showErrorMessage(err)
      });
  }

  private fetchChitPayment(id: string): void {
    this.paymentService
      .GetChitPaymentReportData(
        id,
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode(),
        this.commonService.getschemaname()
      )
      .subscribe({
        next: (res: any) => {
          if (!res?.length) {
            this.tempPaymentData.set([]);
            return;
          }

          const unique = this.deduplicateById(res, 'ppaymentid');
          const data = unique[0];

          data.ppaymentslist = [{
            pLedgeramount: data?.transaction_amount ?? 0,
            pAccountname: data?.parentaccountname ?? '',
            pcgstamount: 0,
            psgstamount: null,
            pigstamount: null,
            ptdsamount: 0
          }];

          data.pcontactname = `${data.pcontactname} ( ${data.accountname} )`;

          const withTotals = unique.map((x: any) => ({
            ...x,
            totvalue: (x.ppaymentslist as any[]).reduce(
              (s: number, i: any) => s + i.pLedgeramount, 0
            )
          }));

          this.tempPaymentData.set(withTotals.length ? withTotals : [{}]);
        },
        error: err => this.commonService.showErrorMessage(err)
      });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private deduplicateById(arr: any[], key: string): any[] {
    return arr.filter(
      (item: any, index: number, self: any[]) =>
        index === self.findIndex((t: any) => t[key] === item[key])
    );
  }
  getKapilGroupLogo() {
debugger
let img:string='';
let Company = this.commonService._getCompanyDetails();
  img = Company.companyLogo;
    return img;
  }

  private computeTotals(list: any[]): any[] {
    const result = list.map((x: any) => {
      const baseTotal = x.ppaymentslist.reduce((s: number, i: any) => s + i.pLedgeramount, 0);
      const cgst = x.ppaymentslist.reduce((s: number, i: any) => s + (i.pcgstamount ?? 0), 0);
      const igst = x.ppaymentslist.reduce((s: number, i: any) => s + (i.pigstamount ?? 0), 0);
      const tds = x.ppaymentslist.reduce((s: number, i: any) => s + (i.ptdsamount ?? 0), 0);

      return {
        ...x,
        totvalue: baseTotal + cgst + igst - tds,
        gstvalue: cgst + igst,
        tdsvalue: tds
      };
    });

    return result.length ? result : [{}];
  }

  private buildRows(): any[] {
    const rows: any[] = [];
    let sno = 1;

    for (const payment of this.tempPaymentData()) {
      for (const item of payment.ppaymentslist) {
        rows.push([sno++, item.pAccountname, this.commonService.currencyFormat(item.pLedgeramount)]);

        const isIntra = item.state_code?.toString() === this.Gstinn();

        if (isIntra) {
          if (item.pcgstamount) {
            rows.push([sno++, 'P-SGST (Exclude)', this.commonService.currencyFormat(item.pcgstamount / 2)]);
            rows.push([sno++, 'P-CGST (Exclude)', this.commonService.currencyFormat(item.pcgstamount / 2)]);
          }
        } else {
          if (item.pigstamount) {
            rows.push([sno++, 'P-IGST (Exclude)', this.commonService.currencyFormat(item.pigstamount)]);
          } else if (item.pcgstamount) {
            rows.push([sno++, 'P-IGST (Exclude)', this.commonService.currencyFormat(item.pcgstamount)]);
          }
        }

        if (item.ptdsamount) {
          rows.push([sno++, 'TDS (Include)', `-(${this.commonService.currencyFormat(item.ptdsamount)})`]);
        }
      }
    }

    return rows;
  }

  private computeGrandTotal(): number {
    return this.tempPaymentData().reduce((sum: number, payment: any) => {
      return sum + payment.ppaymentslist.reduce((s: number, item: any) => {
        let total = item.pLedgeramount;
        const isIntra = item.state_code?.toString() === this.Gstinn();

        if (isIntra) {
          total += item.pcgstamount ?? 0;
        } else {
          total += item.pigstamount ?? item.pcgstamount ?? 0;
        }

        total -= item.ptdsamount ?? 0;
        return s + total;
      }, 0);
    }, 0);
  }

  // ── PDF / Print ───────────────────────────────────────────────────────────
  pdfOrPrint(action: 'Pdf' | 'Print'): void {
    const rows = this.buildRows();
    const grandTotal = this.computeGrandTotal();

    rows.push(['', 'Total', this.commonService.currencyFormat(grandTotal)]);

    const first = this.tempPaymentData()[0];
    const paidTo = first?.pcontactname ?? first?.pAccountname ?? '';
    const amountInWords = `Rupees ${this.numberToWords.transform(grandTotal)} Only`;

    this.commonService._downloadGridPdf1(
      this.receiptName(),
      rows,
      ['S.No.', 'Particulars', 'Amount'],
      { 0: { halign: 'center', cellWidth: 20 }, 1: { halign: 'left' }, 2: { halign: 'right' } },
      'a4',
      action,
      first?.pnarration,
      first?.ppaymentid,
      this.datePipe.transform(first?.ppaymentdate, 'dd-MMM-yyyy'),
      this.datePipe.transform(this.todaydate(), 'dd-MMM-yyyy h:mm:ss a'),
      this.username,
      paidTo,
      amountInWords
    );
  }

  titleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}

