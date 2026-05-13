import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, signal, computed, WritableSignal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { catchError, concat, debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { NgSelectModule } from '@ng-select/ng-select';
import { TableModule } from 'primeng/table';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { CommonService } from '../../../../core/services/Common/common.service';
import { Router } from '@angular/router';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { DatePickerModule } from 'primeng/datepicker';


@Component({
  selector: "app-pettycash-receipt-cancel",
  imports: [CommonModule, DatePickerModule, ReactiveFormsModule, FormsModule, NgSelectModule, TableModule],
  templateUrl: "./pettycash-receipt-cancel.html",
})

export class PettycashReceiptCancel implements OnInit {



  readonly currencysymbol = '₹';


  creditto = signal<string>('');
  receivedfrom = signal<string>('');
  receiptdate = signal<any>('');
  narration = signal<string>('');
  doneby = signal<string>('');
  pmodofPayment = signal<string>('');

  ButtonType = signal<string>('Save');
  isLoading = signal<boolean>(false);
  disablesavebutton = signal<boolean>(false);
  showtotalamount = signal<number>(0);
  show = signal<boolean>(false);

  lstdetails = signal<any[]>([]);
  receiptdata = signal<any[]>([]);
  Employee = signal<any[]>([]);

  disabletransactiondate = signal<boolean>(false);
  pettycashValidation = signal<Record<string, string>>({});
  pageCriteria = signal<PageCriteria>(new PageCriteria());
  showClicked = signal<boolean>(false);

  hasReceiptData = computed(() => this.lstdetails().length > 0);


  authorizedbylist$ = of<any[]>([]);
  contactSearchevent = new Subject<string>();
  pDatepickerMaxDate = new Date();


  PettyCashCancel!: FormGroup<{
    receiptnumber: FormControl<string | null>;
    receiptid: FormControl<number | null>;
    ipaddress: FormControl<string | null>;
    userid: FormControl<string | null>;
    activitytype: FormControl<string>;
    ppaymentdate: FormControl<Date | string | null>;
    totalreceivedamount: FormControl<number | null>;
    narration: FormControl<string | null>;
    cancellationreason: FormControl<string | null>;
    schemaid: FormControl<string | null>;
    autorizedcontactid: FormControl<string | null>;
    subintroducedname: FormControl<string | null>;
    pCreatedby: FormControl<number | null>;
  }>;

  pDobConfig: any = {};


  constructor(
    private _commonService: CommonService,
    private _AccountingTransactionsService: AccountsTransactions,
    private router: Router,
    private datePipe: DatePipe,
    private _paymentVouecherServices: AccountsReports,
    private fb: FormBuilder,

    private _generalreceiptcancelservice: AccountsTransactions
  ) {
    this.pDobConfig = {
      containerClass: 'theme-dark-blue',
      showWeekNumbers: false,
      maxDate: new Date(),
      dateInputFormat: 'DD-MMM-YYYY'
    };

    if (this._commonService.comapnydetails) {
      this.disabletransactiondate.set(
        this._commonService.comapnydetails.pdatepickerenablestatus
      );
    }
  }

  ngOnInit(): void {
    this.buildForm();
    this.setPageModel();
    this.contactSearch();
    this.getEmployeeName();
    this.getReceiptNumber();
  }




  private buildForm(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.PettyCashCancel = this.fb.group({
      receiptnumber: [''],
      receiptid: [null, Validators.required],
      ipaddress: [''],
      userid: [''],
      activitytype: ['C'],
      ppaymentdate: [today, Validators.required],
      totalreceivedamount: [null],
      narration: [''],
      cancellationreason: ['', Validators.required],
      schemaid: [this._commonService.getschemaname()],
      autorizedcontactid: [null, Validators.required],
      subintroducedname: [''],
      pCreatedby: [this._commonService.getCreatedBy()]
    }) as any;

  }


  getreceiptdata(event: any): void {
    if (event == null) {
      this.clearReceiptFields();
      this.show.set(false);
      return;
    }

    this.show.set(false);
    this.lstdetails.set([]);
    this.showtotalamount.set(0);

    const receiptId = typeof event === 'object'
      ? (event?.payment_number ?? event)
      : event;

    this._paymentVouecherServices
      .GetPettyCashbyId(
        receiptId,
        this._commonService.getbranchname(),
        this._commonService.getCompanyCode(),
        this._commonService.getBranchCode(),
        this._commonService.getschemaname()
      )
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res) ? res[0] : res;
          this.bindReceiptData(data);
        },
        error: (err: any) => {
          this.show.set(false);
          this.showErrorMessage(err);
        }
      });
  }

  private bindReceiptData(data: any): void {
    if (!data) {
      this.clearReceiptFields();
      return;
    }

    this.creditto.set(data.pcontactname || '');
    this.receivedfrom.set(data.pemployeename || data.pcontactname || '');
    this.receiptdate.set(data.ppaymentdate || '');
    this.narration.set(data.pnarration || '');
    this.pmodofPayment.set(data.pmodofPayment || '');
    this.doneby.set(data.pemployeename || data.pusername || '');

    this.PettyCashCancel.patchValue({
      receiptnumber: data.ppaymentid || '',
      narration: data.pnarration || ''
    });

    const details = data.ppaymentslist || [];
    this.lstdetails.set(details);

    const total = details.reduce(
      (sum: number, item: any) => sum + (parseFloat(item.pLedgeramount) || 0), 0
    );
    this.showtotalamount.set(total);

    this.pageCriteria.update(pc => ({
      ...pc,
      totalrows: details.length,
      TotalPages: Math.ceil(details.length / pc.pageSize) || 1
    }));
  }

  clearReceiptFields(): void {
    this.creditto.set('');
    this.receivedfrom.set('');
    this.receiptdate.set('');
    this.narration.set('');
    this.pmodofPayment.set('');
    this.doneby.set('');
    this.showtotalamount.set(0);
    this.lstdetails.set([]);
    this.pageCriteria.update(pc => ({ ...pc, totalrows: 0 }));
  }



  showdata(): void {
    this.showClicked.set(true);

    const receiptId = this.PettyCashCancel.value.receiptid;
    if (!receiptId) {
      this._commonService.showWarningMessage('Select receipt number');
      return;
    }

    if (this.lstdetails().length > 0) {
      this.show.set(true);
      return;
    }

    this._paymentVouecherServices
      .GetPettyCashbyId(
        receiptId,
        this._commonService.getbranchname(),
        this._commonService.getCompanyCode(),
        this._commonService.getBranchCode(),
        this._commonService.getschemaname()
      )
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res) ? res[0] : res;
          this.bindReceiptData(data);
          this.show.set(true);
        },
        error: (err: any) => this.showErrorMessage(err)
      });
  }


  Save(): void {
    if (this.PettyCashCancel.invalid) {
      this.PettyCashCancel.markAllAsTouched();
      return;
    }
    if (!this.lstdetails().length) {
      this._commonService.showWarningMessage('No receipt data found');
      return;
    }
    if (!confirm('Do you want to cancel this receipt ?')) return;

    this.isLoading.set(true);
    this.disablesavebutton.set(true);
    this.ButtonType.set('Processing');

    const details = this.lstdetails();
    const first = details[0];

    const totalreceivedamount = details.reduce(
      (sum: number, x: any) => sum + parseFloat(
        this._commonService.removeCommasInAmount
          ? this._commonService.removeCommasInAmount(x.pLedgeramount)
          : String(x.pLedgeramount)
      ), 0
    );

    const payload = {
      global_schema: this._commonService.getschemaname(),
      branch_schema: this._commonService.getbranchname(),
      company_code: this._commonService.getCompanyCode(),
      branch_code: this._commonService.getBranchCode(),

      pbranchid: Number(first?.pbranchid ?? 2),
      pCreatedby: Number(this._commonService.getCreatedBy() ?? 1),
      receiptid: Number(this.PettyCashCancel.get('receiptid')?.value ?? 13),

      ppaymentdate: String(
        this._commonService.getFormatDate1(
          this.PettyCashCancel?.value?.ppaymentdate ?? null
        ) ?? '2026-03-14'
      ),

      tbltransgenreceiptcancelid: String(first?.tbltransgenreceiptcancelid ?? '1'),
      branchid: String(first?.pbranchid ?? '2'),
      receiptamount: String(totalreceivedamount ?? '1000'),
      paymentid: String(first?.paymentid ?? '1'),
      cancellationreason: String(this.PettyCashCancel?.value?.cancellationreason ?? ''),
      schemaid: String(this._commonService.getschemaname() ?? '1'),
      receiptnumber: String(first?.receiptnumber ?? ''),
      parentaccountname: String(first?.parentaccountname ?? ''),

      receiptdate: String(
        this._commonService.getFormatDate1(this.receiptdate()) ?? '2026-03-14'
      ),

      ledgeramount: String(totalreceivedamount),
      totalreceivedamount: String(totalreceivedamount),
      contactname: String(this.creditto()),
      modeofreceipt: String(this.pmodofPayment()),
      narration: String(first?.pnarration ?? ''),
      employee: String(this.doneby()),

      tbltransgeneralreceiptid: String(first?.tbltransgeneralreceiptid ?? '13'),

      ppaymentdate_old: String(
        this._commonService.getFormatDate1(this.receiptdate()) ?? '2026-03-14'
      ),

      ptypeofoperation: 'CANCEL',
      isgstapplicable: String(first?.isgstapplicable ?? 'false'),
      tdsamount: String(first?.tdsamount ?? '0'),
      pistdsapplicable: String(first?.pistdsapplicable ?? 'false'),
      contactid: String(first?.pcontactid ?? '1'),
      pTdsPercentage: String(first?.pTdsPercentage ?? '0'),

      autorizedcontactid: String(this.PettyCashCancel?.value?.autorizedcontactid ?? '1'),
      userid: String(this._commonService.getCreatedBy() ?? '1'),
      ipaddress: String(this._commonService.getIpAddress() ?? ''),

      logentrydatetime: new Date().toISOString().split('T')[0],
      activitytype: 'C'
    };

    this._generalreceiptcancelservice.savepettycashcancel(payload).subscribe({
      next: (res: any) => {
        if (res) {
          // this._commonService.showInfoMessage('Cancelled Successfully');
          this._commonService.showSuccessMsg('Cancelled Successfully');
          this.getReceiptNumber();
          this.clear();
        }
      },
      error: (err: any) => {
        this.showErrorMessage(err);
        this.isLoading.set(false);
        this.disablesavebutton.set(false);
        this.ButtonType.set('Save');
      },
      complete: () => {
        this.isLoading.set(false);
        this.disablesavebutton.set(false);
        this.ButtonType.set('Save');
      }
    });
  }


  private contactSearch(): void {
    this.authorizedbylist$ = concat(
      of([]),
      this.contactSearchevent.pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap(term =>
          this._generalreceiptcancelservice
            .getEmployeeName(
              this._commonService.getbranchname(),
              term || 'A',
              this._commonService.getCompanyCode(),
              this._commonService.getBranchCode(),
              this._commonService.getschemaname()
            )
            .pipe(catchError(() => of([])))
        )
      )
    );
  }



  clear(): void {
    const currentDate = this.PettyCashCancel.get('ppaymentdate')?.value;

    this.showClicked.set(false);
    this.PettyCashCancel.reset({ ppaymentdate: currentDate });
    this.clearReceiptFields();
    this.show.set(false);
    this.ButtonType.set('Save');
    this.disablesavebutton.set(false);
    this.isLoading.set(false);
    this.getReceiptNumber();
  }


  getReceiptNumber(): void {
    this._AccountingTransactionsService
      .getReceiptNumber(
        this._commonService.getschemaname(),
        this._commonService.getbranchname(),
        this._commonService.getCompanyCode(),
        this._commonService.getBranchCode()
      )
      .subscribe({
        next: (res: any) => this.receiptdata.set(res),
        error: (err: any) => this.showErrorMessage(err)
      });
  }

  getEmployeeName(): void {
    this._generalreceiptcancelservice
      .getEmployeeName(
        this._commonService.getbranchname(),
        'A',
        this._commonService.getCompanyCode(),
        this._commonService.getBranchCode(),
        this._commonService.getschemaname()
      )
      .subscribe({
        next: (res: any) => this.Employee.set(res),
        error: (err: any) => this.showErrorMessage(err)
      });
  }


  setPageModel(): void {
    this.pageCriteria.update(pc => ({
      ...pc,
      pageSize: 10,
      offset: 0,
      pageNumber: 1,
      footerPageHeight: 50
    }));
  }

  onPrimePageChange(event: any): void {
    this.pageCriteria.update(pc => ({
      ...pc,
      offset: event.page,
      pageSize: event.rows
    }));
  }

  subIntroducedGridRowSelect(selected: any): void {
    if (selected) {
      this.PettyCashCancel.patchValue({
        autorizedcontactid: selected.subintroducedid,
        subintroducedname: selected.subintroducedname
      });
    }
  }

  showErrorMessage(msg: string): void {
    this._commonService.showErrorMessage(msg);
  }
}
