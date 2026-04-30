import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router } from '@angular/router';

import { NgSelectModule } from '@ng-select/ng-select';
import { TableModule } from 'primeng/table';
import { NumberToWordsPipe } from '../../../../shared/pipes/number-to-words-pipe';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { PageCriteria } from '../../../../core/models/pagecriteria';


@Component({
  selector: 'app-re-print',
  standalone: true,
  imports: [ ReactiveFormsModule, CommonModule, NgSelectModule, TableModule],
  templateUrl: './re-print.html',
  providers: [NumberToWordsPipe]
})
export class RePrint implements OnInit {

  // ── injected services ──────────────────────────────────────────────────────
  private readonly numbertowords                 = inject(NumberToWordsPipe);
  private readonly router                        = inject(Router);
  private readonly formbuilder                   = inject(FormBuilder);
  private readonly _commonService                = inject(CommonService);
  private readonly _AccountingReportsService     = inject(AccountsReports);
  private readonly _ChitTransactionsService      = inject(AccountsReports);
  private readonly _subscriberJVService          = inject(AccountsReports);
  private readonly _AccountingTransactionsService = inject(AccountsTransactions);
  private readonly _AccountService               = inject(AccountsReports);
  private readonly destroyRef                    = inject(DestroyRef);

  // ── signals ────────────────────────────────────────────────────────────────
  readonly userbranchtxtboxshowhide = signal(true);
  readonly form15UID                = signal(false);
  readonly showhide                 = signal(false);
  readonly showForm15HGrid          = signal(false);
  readonly griddata                 = signal<any[]>([]);
  readonly form15HGridData          = signal<any[]>([]);

  // ── plain properties ───────────────────────────────────────────────────────
  ReprintRepotForm!: FormGroup;
  submitted = false;

  lstreporttype: { reporttype: string; reporttypeid: string }[] = [];
  ReprinttValidation: Record<string, string> = {};

  @ViewChild('myTable') table: any;

  pageCriteria!: PageCriteria;
  commencementgridPage = new PageCriteria();

  userBranchType: string | null     = null;
  userbranchngselectshowhide        = false;
  loginBranchschema                 = '';
  currencysymbol                    = '';
  branchName: string | null         = null;
  legalChitReceipt: any;
  ReceiptColunmForLegal             = false;
  gstvoucherprintdata: any[]        = [];
  gsthideshow                       = true;
  otherstate                        = true;
  UIDNoList: any[]                  = [];
  UIDdata: any;
  uid: any;
  enteredPAN                        = '';
  caolist: any[]                    = [];
  reporttype: any;
  branchcode: any;

  private list: any[] = [];

  // ── lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.currencysymbol = this._commonService.currencysymbol ?? '₹';

    this.lstreporttype = [
      { reporttype: 'General Receipt',    reporttypeid: 'General Receipt' },
      { reporttype: 'Payment Voucher',    reporttypeid: 'Payment Voucher' },
      { reporttype: 'Journal Voucher',    reporttypeid: 'Journal Voucher' },
      { reporttype: 'Petty Cash',         reporttypeid: 'Petty Cash' },
      { reporttype: 'Chit Payment',       reporttypeid: 'Chit Payment' },
      { reporttype: 'GST BILL',           reporttypeid: 'GST BILL' }
    ];

    this.ReprintRepotForm = this.formbuilder.group({
      schemaid:       [this._commonService.getschemaname()],
      schemaname:     ['schemaname'],
      samebranchcode: [this._commonService.getschemaname()],
      TransType:      [null, Validators.required],
      Transno:        [null, Validators.required],
      branch_name:    [null],
      panno:          [null]
    });

    this.setPageModel();
    this.userBranchType    = sessionStorage.getItem('userBranchType');
    this.loginBranchschema = sessionStorage.getItem('loginBranchSchemaname') ?? '';

    const companyDetails   = this._commonService._getCompanyDetails();
    this.branchName        = sessionStorage.getItem('branchname');
    this.legalChitReceipt  = companyDetails?.plegalcell_name;

    if (this.legalChitReceipt === this.branchName) {
      this.ReceiptColunmForLegal = true;
    }
  }

  // ── form accessor ──────────────────────────────────────────────────────────
  get f() { return this.ReprintRepotForm.controls; }

  // ── pagination ─────────────────────────────────────────────────────────────
  private setPageModel(): void {
    this.pageCriteria                  = new PageCriteria();
    this.pageCriteria.pageSize         = this._commonService.pageSize;
    this.pageCriteria.offset           = 0;
    this.pageCriteria.pageNumber       = 1;
    this.pageCriteria.footerPageHeight = 50;
  }

  onFooterPageChange(event: any): void {
    this.pageCriteria.offset      = event.page - 1;
    this.pageCriteria.CurrentPage = event.page;
    this.pageCriteria.currentPageRows =
      this.pageCriteria.totalrows < event.page * this.pageCriteria.pageSize
        ? this.pageCriteria.totalrows % this.pageCriteria.pageSize
        : this.pageCriteria.pageSize;
  }

  private updatePagination(data: any[]): void {
    this.pageCriteria.totalrows       = data.length;
    this.pageCriteria.TotalPages      = data.length > 10 ? Math.ceil(data.length / 10) : 1;
    this.pageCriteria.CurrentPage     = 1;
    this.pageCriteria.currentPageRows =
      data.length < this.pageCriteria.pageSize ? data.length : this.pageCriteria.pageSize;
  }

  // ── filter ─────────────────────────────────────────────────────────────────
  ReprintdataFilter(value: string): void {
    const searchText = (value ?? '').toLowerCase().trim();

    const filtered = searchText
      ? this.list.filter(
          a =>
            a?.chit_no?.toString().toLowerCase().includes(searchText) ||
            a?.receipt_number?.toString().toLowerCase().includes(searchText)
        )
      : [...this.list];

    this.griddata.set(filtered);
    this.updatePagination(filtered);
  }

  // ── report type change ─────────────────────────────────────────────────────
  reportchange_Change(event: any): void {
    const ctrl = this.ReprintRepotForm.controls;

    ctrl['panno'].clearValidators();
    ctrl['panno'].setValue(null);
    ctrl['panno'].updateValueAndValidity();

    this.form15UID.set(false);
    this.showForm15HGrid.set(false);
    ctrl['TransType'].setValue(event?.reporttype);
    this.reporttype = event?.reporttype;
    this.showhide.set(false);
    this.griddata.set([]);

    if (event?.reporttype === 'Form 15H') {
      this.form15UID.set(true);
      this.userbranchtxtboxshowhide.set(false);
      this.userbranchngselectshowhide = false;

      ctrl['panno'].setValidators(Validators.required);
      ctrl['panno'].updateValueAndValidity();
      ctrl['branch_name'].clearValidators();
      ctrl['branch_name'].updateValueAndValidity();
      ctrl['Transno'].clearValidators();
      ctrl['Transno'].updateValueAndValidity();
      return;
    }

    this.vaildationforbranch();

    if (
      event?.reporttype === 'Chit Receipt/PSO Chit Receipt' ||
      event?.reporttype === 'Verification Charges'
    ) {
      if (this.userBranchType === 'CAO') {
        if (event?.reporttype === 'Verification Charges') {
          this.userbranchtxtboxshowhide.set(false);
          this.form15UID.set(false);
          this.userbranchngselectshowhide = true;

          ctrl['panno'].clearValidators();
          ctrl['Transno'].clearValidators();
          ctrl['Transno'].updateValueAndValidity();
          this.showhide.set(true);

          this._AccountingReportsService
            .GetVerificationChargesReceiptslist(this.loginBranchschema, this.loginBranchschema)
            .subscribe(res => {
              const data = res ?? [];
              this.griddata.set(data);
              this.list = [...data];
              this.updatePagination(data);
            });
        } else {
          ctrl['Transno'].setValidators(Validators.required);
          ctrl['Transno'].updateValueAndValidity();
          ctrl['panno'].clearValidators();
          ctrl['panno'].updateValueAndValidity();
          this.vaildationforbranch();
        }

        if (ctrl['TransType'].value === 'Form 15H') {
          this.form15UID.set(true);
          ctrl['panno'].setValue(null);
          this.userbranchtxtboxshowhide.set(false);

          this._AccountingReportsService
            .GetForm15hReportwithpan(this.loginBranchschema, this.enteredPAN)
            .subscribe(res => (this.UIDNoList = res ?? []));
        }
      } else {
        ctrl['branch_name'].setValue(null);
        this.CallBranchApi();

        ctrl['branch_name'].setValidators(Validators.required);
        ctrl['branch_name'].updateValueAndValidity();
        ctrl['Transno'].clearValidators();
        ctrl['Transno'].updateValueAndValidity();
        ctrl['panno'].clearValidators();
        ctrl['panno'].updateValueAndValidity();

        this.userbranchngselectshowhide = true;
        this.userbranchtxtboxshowhide.set(false);
      }
    }
  }

  vaildationforbranch(): void {
    const ctrl = this.ReprintRepotForm.controls;
    ctrl['Transno'].setValue('');
    this.userbranchngselectshowhide = false;
    this.userbranchtxtboxshowhide.set(true);

    ctrl['Transno'].setValidators(Validators.required);
    ctrl['Transno'].updateValueAndValidity();
    ctrl['branch_name'].clearValidators();
    ctrl['branch_name'].updateValueAndValidity();

    this.ReprinttValidation = {};
    this.showhide.set(false);
  }

  Branchchange(event: any): void {
    this.ReprinttValidation = {};
    this.griddata.set([]);
    this.branchcode = event?.branch_code;
    this.showhide.set(this.userBranchType !== 'CAO');

    const serviceCall =
      this.reporttype === 'Verification Charges'
        ? this._AccountingReportsService.GetVerificationChargesReceiptslist(
            this.loginBranchschema,
            this.branchcode
          )
        : this._AccountingReportsService.GetChitReceiptslist(
            this.loginBranchschema,
            this.branchcode
          );

    serviceCall.subscribe(res => {
      const data = res ?? [];
      this.griddata.set(data);
      this.list = [...data];
      this.updatePagination(data);
    });
  }

  private CallBranchApi(): void {
    this._AccountingReportsService
      .GetCaobranchlist(this.loginBranchschema)
      .subscribe(res => (this.caolist = res ?? []));
  }

  // ── row click handlers ─────────────────────────────────────────────────────
  clickForLegalReceipt(row: any): void {
    if (this.legalChitReceipt !== this.branchName) return;
    const recieptno      = btoa(row?.general_receipt_number);
    const commonreceiptno = btoa(row?.commanReceiptNumber);
    const caoschema      = btoa(this.branchcode);
    const incidentalcharges = btoa('true');
    window.open(
      `/#/LegalChitReceiptPrint?recieptno=${recieptno}&commonreceiptno=${commonreceiptno}&caoschema=${caoschema}&INCcharges=${incidentalcharges}`,
      '_blank'
    );
  }

  click(row: any): void {
    this.ReprintRepotForm.controls['Transno'].setValue(row?.receipt_number);
    this.getduplicateReport();
  }

  onUIDClick(uid: string): void {
    const encoded = btoa(`${uid},Form 15H,Reprint,${this.loginBranchschema}`);
    window.open(`/#/Form15hReprint?id=${encoded}`, '_blank');
  }

  // ── generate report ────────────────────────────────────────────────────────
  getduplicateReport(): void {
    debugger
    this.submitted = true;
    this.ReprintRepotForm.markAllAsTouched();
    if (this.ReprintRepotForm.invalid) return;

    const transType  = this.ReprintRepotForm.controls['TransType'].value;
    const transNo    = this.ReprintRepotForm.controls['Transno'].value;
    const schemaName = this._commonService.getbranchname();

    if (transType === 'General Receipt') {
      this._AccountingReportsService
        .GetRePrintInterBranchGeneralReceiptbyId(
          transNo,
          this._commonService.getbranchname(),
          this._commonService.getCompanyCode(),
          this._commonService.getBranchCode()
        )
        .subscribe(count => {
          if (count === 0) {
            this._AccountingReportsService
              .GetGeneralReceiptbyId(
                transNo,
                this._commonService.getbranchname(),
                this._commonService.getCompanyCode(),
                this._commonService.getBranchCode(),
                this._commonService.getschemaname()
              )
              .subscribe(res => {
                if (res) {

                  const receipt = btoa(`${transNo},General Receipt,Reprint,${schemaName}`);
                 
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/general-receipt', receipt])
    );
    window.open(url, '_blank');


                } else alert('Transaction No. Does Not Exit !');
              });
          } else {
            this._AccountingReportsService
              .GetInterBranchGeneralReceiptbyId(transNo)
              .subscribe(res => {
                if (res) {
                  const receipt = btoa(`${transNo},Inter Branch Receipt,Reprint`);
                  window.open(`/InterBranchReport?id=${receipt}`, '_blank');
                } else alert('Transaction No. Does Not Exit !');
              });
          }
        });
    }

    if (transType === 'Form 15H') {
      this._AccountingReportsService
        .GetForm15hReportwithpan(
          this.loginBranchschema,
          this.ReprintRepotForm.controls['panno'].value
        )
        .subscribe({
          next: res => {
            if (res?.length > 0) {
              this.form15HGridData.set(res);
              this.showForm15HGrid.set(true);
              this.showhide.set(false);
              this.pageCriteria.totalrows  = res.length;
              this.pageCriteria.TotalPages = Math.ceil(res.length / this.pageCriteria.pageSize);
              this.pageCriteria.CurrentPage = 1;
            } else {
              this._commonService.showWarningMessage('No Records!');
              this.form15HGridData.set([]);
            }
          },
          error: () => this._commonService.showErrorMessage('Error fetching UID list')
        });
      return;
    }

    if (transType === 'Verification Charges') {
      this._AccountingReportsService
        .GetGeneralReceiptbyId(
          transNo,
          this._commonService.getbranchname(),
          this._commonService.getCompanyCode(),
          this._commonService.getBranchCode(),
          this._commonService.getschemaname()
        )
        .subscribe(res => {
          if (res) {
            const receipt = btoa(`${transNo},General Receipt,Reprint,${schemaName}`);
            window.open(
              this.router.serializeUrl(this.router.createUrlTree(['/GeneralReceiptReport', receipt])),
              '_blank'
            );
          } else alert('Transaction No. Does Not Exit !');
        });
    }

    if (transType === 'Journal Voucher') {
      const receipt = btoa(`${transNo},Journal Voucher,Reprint`);
      this._AccountingReportsService
        .GetJvReport(
          transNo,
          this._commonService.getbranchname(),
          this._commonService.getschemaname(),
          this._commonService.getCompanyCode(),
          this._commonService.getBranchCode()
        )
        .subscribe(res => {
          if (res?.length > 0) {


            
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/journal-voucher', receipt])
    );
    window.open(url, '_blank');


          } else alert('Transaction No. Does Not Exit !');
        });
    }

    if (transType === 'Payment Voucher') {
      this._AccountingReportsService
        .GetPaymentVoucherbyId(
          transNo,
          this._commonService.getbranchname(),
          this._commonService.getCompanyCode(),
          this._commonService.getBranchCode(),
          this._commonService.getschemaname()
        )
        .subscribe(res => {
          if (res?.length > 0) {
            const receipt      = btoa(`${transNo},Payment Voucher,Reprint`);

           
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/payment-voucher', receipt])
    );
    window.open(url, '_blank');


          } else alert('Transaction No. Does Not Exit !');
        });
    }

    if (transType === 'Subscriber JV') {
      this._subscriberJVService.getSubscriberJVReport(transNo).subscribe((res: any[]) => {
        if (res?.[0]?.sjvDetails?.length > 0) {
          const debit  = res[0].sjvDetails.reduce((s: number, v: any) => s + v.debit,  0);
          const credit = res[0].sjvDetails.reduce((s: number, v: any) => s + v.credit, 0);
          if (debit === credit) {
            const receipt = btoa(`${transNo},Subscriber JV,Reprint`);
            window.open(`/#/JournalVoucherPrint?id=${receipt}`, '_blank');
          } else this._commonService.showWarningMessage('Credit and Debit Not Matched!!');
        } else alert('Transaction No. Does Not Exit !');
      });
    }

    if (transType === 'Petty Cash') {
      this._AccountingReportsService
        .GetPettyCashbyId(
          transNo,
          this._commonService.getbranchname(),
          this._commonService.getCompanyCode(),
          this._commonService.getBranchCode(),
          this._commonService.getschemaname()
        )
        .subscribe(res => {
          if (res?.length > 0) {
            const receipt = btoa(`${transNo},Petty Cash,Reprint`);
             const url = this.router.serializeUrl(
      this.router.createUrlTree(['/payment-voucher', receipt])
    );
    window.open(url, '_blank');

          } else alert('Transaction No. Does Not Exit !');
        });
    }

    if (transType === 'Chit Payment') {
      this._AccountingReportsService
        .GetChitPaymentReportData(
          transNo,
          this._commonService.getbranchname(),
          this._commonService.getCompanyCode(),
          this._commonService.getBranchCode(),
          this._commonService.getschemaname()
        )
        .subscribe(res => {
          if (res?.length > 0) {
            const receipt = btoa(`${transNo},Chit Payment Voucher,Reprint`);
            window.open(
              this.router.serializeUrl(this.router.createUrlTree(['/PaymentVoucher', receipt])),
              '_blank'
            );
          } else alert('Transaction No. Does Not Exist !');
        });
    }

    if (transType === 'GST BILL') {
      this._AccountService.Getgstvocuherprint(schemaName, transNo).subscribe(res => {
        this.gstvoucherprintdata = res ?? [];
        if (this.gstvoucherprintdata.length > 0) this.print();
        else alert('Transaction No. Does Not Exist !');
      });
    }
  }

  // ── GST print ──────────────────────────────────────────────────────────────
  print(): void {
    let totaligstamt       = 0;
    let totalamtBeforeTax  = 0;
    let totalCGSTAmt       = 0;
    let totalSGSTAmt       = 0;
    let totalTaxAmt        = 0;
    let totalamtAfterTax   = 0;
    let totaldiscountAmt   = 0;
    let proundoff_amount   = 0;
    let tdsamount          = 0;
    const gridrows: any[]  = [];

    this.gstvoucherprintdata.forEach((e: any) => {
      proundoff_amount  = parseFloat(e.proundoff_amount) || 0;
      tdsamount         = parseFloat(e.invoice_tds_amount) || 0;
      totalamtBeforeTax += e.invoice_amount;
      totaldiscountAmt  += e.product_discount;
      totalamtAfterTax  += e.invoice_total_amount;

      if (this.gsthideshow) {
        totalCGSTAmt += e.cgst_amount;
        totalSGSTAmt += e.sgst_amount;
        totalTaxAmt   = totalCGSTAmt + totalSGSTAmt;
        gridrows.push([
          e.product_name, e.hsN_code, e.product_qty, e.product_cost,
          e.invoice_amount, e.product_discount,
          e.invoice_amount - e.product_discount,
          e.cgst_percentage, e.cgst_amount,
          e.sgst_percentage, e.sgst_amount,
          e.invoice_total_amount
        ]);
      } else {
        totaligstamt += e.igst_amount;
        totalTaxAmt   = totaligstamt;
        gridrows.push([
          e.product_name, e.hsN_code, e.product_qty, e.product_cost,
          e.invoice_amount, e.product_discount,
          e.invoice_amount - e.product_discount,
          e.igst_percentage, e.igst_amount,
          e.invoice_total_amount
        ]);
      }
    });

    totalamtAfterTax -= tdsamount;
    const finalAmount  = totalamtAfterTax + proundoff_amount;
    const amountWords  = this.titleCase(this.numbertowords.transform(finalAmount)) + ' Rupees Only.';
    const totalamount_after_tax = this.gstvoucherprintdata.reduce(
      (s: number, c: any) => s + parseFloat(c.invoice_total_amount), 0
    );

    this._commonService._downloadGSTVOucherReport2(
      'Tax Invoice', gridrows, [], {}, 'a4', 'As On', '', '', 'Pdf',
      this.gstvoucherprintdata, '', '', false,
      totalamtBeforeTax, totaligstamt, totalCGSTAmt, totalSGSTAmt,
      totalTaxAmt, finalAmount, this.gsthideshow, this.otherstate,
      amountWords, totaldiscountAmt, proundoff_amount, tdsamount,
      totalamount_after_tax
    );
  }

  // ── utility ────────────────────────────────────────────────────────────────
  titleCase(str: string): string {
    return str
      ?.toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
