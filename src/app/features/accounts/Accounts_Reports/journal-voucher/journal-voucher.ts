import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router'; 
import { take } from 'rxjs';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { CompanyDetailsService } from '../../../../core/services/Common/company-details-service';
@Component({
  selector: "app-journal-voucher",
  standalone: true,
  imports: [CommonModule,
    DatePipe,
    TitleCasePipe],
  templateUrl: "./journal-voucher.html",
  styleUrl: "./journal-voucher.css",
  providers: [DatePipe]
})

 
export class JournalVoucher implements OnInit {

  // ── DI via inject() ──────────────────────────────────────────────────────────
  private readonly router               = inject(Router);
  private readonly activatedRoute       = inject(ActivatedRoute);
  private readonly commonService        = inject(CommonService);
  private readonly jvReportService      = inject( AccountsReports);
  private readonly companyDetailsService = inject(CompanyDetailsService);
  private readonly datePipe             = inject(DatePipe);
  private readonly destroyRef           = inject(DestroyRef);

  // ── Signals ──────────────────────────────────────────────────────────────────
  loading           = signal<boolean>(false);
  journalVoucherData = signal<any[]>([]);

  companyName         = signal<string>('');
  registrationAddress = signal<string>('');
  cinNumber           = signal<string>('');
  branchName          = signal<string>('');

  pJvDate      = signal<string>('');
  pJvnumber    = signal<any>(null);
  pNarration   = signal<string>('');
  pDebitAmount = signal<number>(0);
  pCreditAmount = signal<number>(0);

  receiptName  = signal<string>('');
  duplicate    = signal<string>('');
  todaydate    = signal<Date>(new Date());

  // ── Plain fields ─────────────────────────────────────────────────────────────
  currencySymbol: string = '';
  username: string       = sessionStorage.getItem('username') ?? '';

  private todayDate: string  = '';
  private branchAddress: any = null;
  private gstNumber: any     = null;
  private Gstinn: any        = null;

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.todaydate.set(new Date());
    this.currencySymbol = this.commonService.currencysymbol;
    this.todayDate      = this.commonService.getFormatDateGlobal(new Date());

    this.loadCompanyDetails();
    this.readRouteParams();
  }

  getKapilGroupLogo() {
debugger
let img:string='';
let Company = this.commonService._getCompanyDetails();
  img = Company.companyLogo;
    return img;
  }

  // ── Route params ──────────────────────────────────────────────────────────────
  private readRouteParams(): void {
    this.activatedRoute.paramMap.pipe(take(1)).subscribe(params => {
      const encodedId = params.get('id') ?? '';
      if (!encodedId) return;

      try {
        const routeParams = atob(decodeURIComponent(encodedId));
        const splitData   = routeParams.split(',');

        this.pJvnumber.set(splitData[0]);
        this.receiptName.set(splitData[1] ?? '');

        if (splitData.length === 3) {
          this.duplicate.set(splitData[2]);
        }

        if (splitData[0]) {
          this.fetchJvById(splitData[0]);
        }
      } catch (err) {
        console.error('Invalid Base64 ID:', err);
      }
    });
  }

  // ── Company data ──────────────────────────────────────────────────────────────
  private loadCompanyDetails(): void {
    this.companyDetailsService.GetCompanyData().subscribe({
      next: (json: any) => {
        sessionStorage.setItem('CompanyDetails', JSON.stringify(json));

        const company = json[0];
        this.companyName.set(company.companyName ?? '');
        this.registrationAddress.set(company.registrationAddress ?? '');
        this.cinNumber.set(company.cinNumber ?? '');
        this.branchName.set(company.branchName ?? '');
        this.branchAddress = company.branchAddress;
        this.gstNumber     = company.gstNumber;

        if (this.gstNumber) {
          const chars  = this.gstNumber.split('');
          this.Gstinn  = (chars[0] + chars[1]).toString();
        }
      },
      error: err => this.commonService.showErrorMessage(err)
    });
  }

  // ── API call ───────────────────────────────────────────────────────────────────
  private fetchJvById(id: any): void {
    this.jvReportService
      .GetJvReport(
        id,
        this.commonService.getbranchname(),
        this.commonService.getschemaname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .subscribe({
        next: (res: any[]) => {
          const data = res ?? [];
          this.journalVoucherData.set(data);

          if (!data.length) return;

          this.pDebitAmount.set(
            data.reduce((sum: number, x: any) => sum + (x.pDebitamount  ?? 0), 0)
          );
          this.pCreditAmount.set(
            data.reduce((sum: number, x: any) => sum + (x.pCreditAmount ?? 0), 0)
          );

          this.pJvDate.set(
            this.datePipe.transform(data[0].pJvDate, 'dd-MMM-yyyy') ?? ''
          );
          this.pNarration.set(data[0].pNarration ?? '');
        },
        error: err => this.commonService.showErrorMessage(err)
      });
  }

  // ── PDF / Print ────────────────────────────────────────────────────────────────
  pdfOrprint(action: 'Pdf' | 'Print'): void {
    const rows: any[] = this.journalVoucherData().map(x => [
      x.pParticulars,
      this.commonService.currencyFormat(x.pDebitamount),
      this.commonService.currencyFormat(x.pCreditAmount)
    ]);

    rows.push([
      'Total',
      this.commonService.currencyFormat(this.pDebitAmount()),
      this.commonService.currencyFormat(this.pCreditAmount())
    ]);

    this.commonService._downloadGridPdf1(
      this.receiptName(),
      rows,
      ['Particulars', 'Debit Amount', 'Credit Amount'],
      {
        0: { halign: 'left',  cellWidth: 120 },
        1: { halign: 'right', cellWidth: 35  },
        2: { halign: 'right', cellWidth: 35  }
      },
      'a4',
      action,
      this.pNarration(),
      this.pJvnumber(),
      this.pJvDate(),
      this.todayDate,
      this.username,
      '',
      ''
    );
  }
}

