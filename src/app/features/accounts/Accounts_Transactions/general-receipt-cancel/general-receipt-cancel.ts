import { Component, OnInit, signal, computed, inject } from '@angular/core';

import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { Observable, Subject, concat, of } from 'rxjs';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsReports } from '../../../../core/services/accounts/accounts-reports';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { DatePickerModule } from 'primeng/datepicker';



@Component({
  selector: "app-general-receipt-cancel",
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, NgSelectModule, FormsModule, ReactiveFormsModule, DatePickerModule, TableModule, ButtonModule, InputTextModule],
  templateUrl: "./general-receipt-cancel.html",
})

export class GeneralReceiptCancel implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  // ─── Injected Services ────────────────────────────────────────────────────
  private readonly fb = inject(FormBuilder);
  private readonly commonService = inject(CommonService);
  private readonly receiptCancelService = inject(AccountsTransactions);
  private readonly accountingReportsService = inject(AccountsReports);

  // ─── Datepicker Config ────────────────────────────────────────────────────
  dpConfig: any = {
    maxDate: new Date(),
    containerClass: 'theme-dark-blue',
    dateInputFormat: 'DD-MMM-YYYY',
    showWeekNumbers: false,
  };

  // ─── Signals ──────────────────────────────────────────────────────────────
  receiptdata = signal<any[]>([]);
  lstdetails = signal<any[]>([]);
  receivedfrom = signal('');
  receiptdate = signal('');
  narration = signal('');
  pmodofPayment = signal('');
  doneby = signal('');
  showtotalamount = signal(0);
  currencysymbol = signal<string>('');
  show = signal(false);
  isLoading = signal(false);
  disablesavebutton = signal(false);
  buttonType = signal<'Save' | 'Processing'>('Save');
  pageCriteria = signal<PageCriteria>(new PageCriteria());
  testDate: any = new Date();
  showValidation = signal(false); 
  

  // ─── Computed ─────────────────────────────────────────────────────────────
  isSaveDisabled = computed(() => this.disablesavebutton() || this.isLoading());

  // ─── Schema / Branch Identifiers ──────────────────────────────────────────
  private readonly globalSchema = this.commonService.getschemaname();
  private readonly branchSchema = this.commonService.getbranchname();
  private readonly companyCode = this.commonService.getCompanyCode();
  private readonly branchCode = this.commonService.getBranchCode();
  

  // ─── Reactive Autocomplete ────────────────────────────────────────────────
  contactSearchevent = new Subject<string>();
  authorizedbylist$!: Observable<any[]>;

  // ─── Form ─────────────────────────────────────────────────────────────────
  GeneralReceiptCancelForm!: FormGroup;

  // ─── Internal Raw Data ────────────────────────────────────────────────────
  private generalReceiptData: any[] = [];

  // ─────────────────────────────────────────────────────────────────────────
   
  ngOnInit(): void {
  this.initPageCriteria();
  this.buildForm();
  this.loadReceiptNumbers();
  this.setupContactSearch();
  this.watchAllControls();
  this.currencysymbol.set(String(this.commonService.datePickerPropertiesSetup('currencysymbol') ?? ''));

  
  this.GeneralReceiptCancelForm.get('ppaymentdate')?.enable();
  this.GeneralReceiptCancelForm.get('ppaymentdate')?.setValue(new Date());
  this.GeneralReceiptCancelForm.get('ppaymentdate')?.disable();
}
  

  // ─── Form Builder ─────────────────────────────────────────────────────────
  buildForm(): void {
    this.GeneralReceiptCancelForm = this.fb.group({
      receiptnumber: [''],
      receiptid: [null, Validators.required],
      ipaddress: [''],
      userid: [''],
      activitytype: ['C'],
      ppaymentdate: [{ value: new Date(), disabled: true }, Validators.required],
      totalreceivedamount: [''],
      narration: [''],
      cancellationreason: ['', Validators.required],
      schemaid: [this.globalSchema],
      autorizedcontactid: ['', Validators.required],
      subintroducedname: [''],
      
    });
    
  }

  // ─── Page Criteria ────────────────────────────────────────────────────────
  private initPageCriteria(): void {
    this.pageCriteria.update(pc => {
      pc.pageSize = this.commonService.pageSize;
      pc.offset = 0;
      pc.pageNumber = 1;
      pc.footerPageHeight = 50;
      return { ...pc };
    });
  }

  onPrimePageChange(event: any): void {
    this.pageCriteria.update(pc => ({
      ...pc,
      offset: event.first / event.rows,
      pageSize: event.rows,
    }));
  }

  // ─── Load Receipt Numbers ─────────────────────────────────────────────────
  loadReceiptNumbers(): void {
    this.receiptCancelService.getgeneralReceiptNumber().subscribe({
      next: res => this.receiptdata.set(res ?? []),
      error: err => this.showError(err),
    });
  }

  // ─── Contact Autocomplete ─────────────────────────────────────────────────
  private setupContactSearch(): void {
    this.authorizedbylist$ = concat(
      of([]),
      this.contactSearchevent.pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap(term =>
          this.receiptCancelService
            .getEmployeeName(
              this.branchSchema,
              term || 'A',
              this.companyCode,
              this.branchCode,
              this.globalSchema,
            )
            .pipe(catchError(() => of([])))
        )
      )
    );
  }

  // ─── Receipt Selection Change ─────────────────────────────────────────────
  getreceiptdata(event: any): void {
    if (!event) {
      this.clearReceiptFields();
      this.show.set(false);
      return;
    }

    const receiptId = typeof event === 'object'
      ? event.receiptnumber ?? event
      : event;

    this.accountingReportsService
      .GetGeneralReceiptbyId(
        receiptId,
        this.branchSchema,
        this.companyCode,
        this.branchCode,
        this.globalSchema,
      )
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res) ? res[0] : res;
          data ? this.bindReceiptData(data) : this.clearReceiptFields();
        },
        error: (err) => {
          this.show.set(false);
          this.clearReceiptFields();
          this.showError(err);
        },
      });
  }

  // ─── Bind Receipt Data ────────────────────────────────────────────────────
  private bindReceiptData(data: any): void {
    if (!data) { this.clearReceiptFields(); return; }

    this.receivedfrom.set(data.account_name ?? data.contact_name ?? '');
    this.receiptdate.set(data.receipt_date ?? data.receiptdate ?? '');
    this.narration.set(data.narration ?? '');
    this.pmodofPayment.set(
      data.modeof_receipt === 'C' ? 'Cash' : (data.modeof_receipt ?? '')
    );
    this.doneby.set(data.employeename ?? data.posted_by ?? '');

    const details = [{
      pAccountname: data.account_name ?? 'Receipt Amount',
      pLedgeramount: data.pLedgeramount ?? 0,
    }];

    this.lstdetails.set(details);
    this.generalReceiptData = details;
    this.showtotalamount.set(parseFloat(data.ledger_amount) || 0);
    this.pageCriteria.update(pc => ({ ...pc, totalrows: details.length }));

    this.GeneralReceiptCancelForm.patchValue({
      receiptnumber: data.receiptid ?? '',
      narration: data.narration ?? '',
    });
  }

  // ─── Show Button ──────────────────────────────────────────────────────────
  // Show(): void {
  //   if (!this.GeneralReceiptCancelForm.controls['receiptid'].value) {
  //     this.commonService.showWarningMessage('Please select the receipt number');
  //     return;
  //   }

  //   const cancelledBy = sessionStorage.getItem('username') ?? '';
  //   this.GeneralReceiptCancelForm.patchValue({ cancelledby: cancelledBy });
  //   this.show.set(true);

  //   const receiptId = this.GeneralReceiptCancelForm.get('receiptnumber')?.value;
  //   this.getreceiptdata(receiptId);
  // }
  Show(): void {
  if (!this.GeneralReceiptCancelForm.controls['receiptid'].value) {
    this.showValidation.set(true);
    this.commonService.showWarningMessage('Please select the receipt number');
    return;
  }

  const cancelledBy = sessionStorage.getItem('username') ?? '';
  this.GeneralReceiptCancelForm.patchValue({ cancelledby: cancelledBy });
  this.show.set(true);

  const receiptId = this.GeneralReceiptCancelForm.get('receiptnumber')?.value;
  this.getreceiptdata(receiptId);
}

  // ─── Save ─────────────────────────────────────────────────────────────────
  Save(): void {
    if (this.GeneralReceiptCancelForm.invalid) {
      this.GeneralReceiptCancelForm.markAllAsTouched();
      return;
    }
    if (!this.lstdetails().length) {
      this.commonService.showWarningMessage('No receipt data found');
      return;
    }
    if (!confirm('Do you want to cancel this receipt?')) return;

    this.isLoading.set(true);
    this.disablesavebutton.set(true);
    this.buttonType.set('Processing');

    const first = this.lstdetails()[0];
    const totalReceivedAmount = this.lstdetails().reduce((sum, x) =>
      sum + parseFloat(
        this.commonService.removeCommasInAmount
          ? this.commonService.removeCommasInAmount(x.pLedgeramount)
          : String(x.pLedgeramount)
      ), 0
    );

    const formatDate = (d: any) =>
      this.commonService.getFormatDateGlobal(d) ?? '2026-03-11';

    const payload = {
      global_schema: this.globalSchema,
      branch_schema: this.branchSchema,
      company_code: this.companyCode,
      branch_code: this.branchCode,
      pbranchid: first?.pbranchid ? Number(first.pbranchid) : 2,
      pCreatedby: 9,
      receiptid: this.GeneralReceiptCancelForm.get('receiptid')?.value
        ? Number(this.GeneralReceiptCancelForm.get('receiptid')?.value)
        : 13,
      ppaymentdate: formatDate(this.GeneralReceiptCancelForm?.value?.ppaymentdate),
      tbltransgenreceiptcancelid: first?.tbltransgenreceiptcancelid ? Number(first.tbltransgenreceiptcancelid) : 1,
      branchid: first?.pbranchid ? Number(first.pbranchid) : 2,
      receiptamount: totalReceivedAmount ? Number(totalReceivedAmount) : 0,
      paymentid: first?.paymentid ? Number(first.paymentid) : 0,
      schemaid: 0,
      cancellationreason: this.GeneralReceiptCancelForm?.value?.cancellationreason?.trim()
        || 'Receipt Cancelled',
      receiptnumber: first?.receiptnumber ? String(first.receiptnumber) : 'RCPT0013',
      parentaccountname: first?.parentaccountname ? String(first.parentaccountname) : 'Cash Account',
      receiptdate: formatDate(this.receiptdate()),
      ledgeramount: totalReceivedAmount ? Number(totalReceivedAmount) : 0,
      totalreceivedamount: totalReceivedAmount ? Number(totalReceivedAmount) : 0,
      modeofreceipt: this.pmodofPayment() || 'CASH',
      narration: first?.pnarration ? String(first.pnarration) : 'general receipt cancellation',
      employee: 'Srinivasulu',
      tbltransgeneralreceiptid: first?.tbltransgeneralreceiptid ? Number(first.tbltransgeneralreceiptid) : 0,
      ppaymentdate_old: formatDate(this.receiptdate()),
      ptypeofoperation: 'CANCEL',
      isgstapplicable: first?.isgstapplicable ? String(first.isgstapplicable) : 'false',
      tdsamount: first?.tdsamount ? Number(first.tdsamount) : 0,
      pistdsapplicable: first?.pistdsapplicable ? String(first.pistdsapplicable) : 'false',
      contactid: first?.pcontactid ? Number(first.pcontactid) : 0,
      pTdsPercentage: first?.pTdsPercentage ? Number(first.pTdsPercentage) : 0,
      autorizedcontactid: this.GeneralReceiptCancelForm?.value?.autorizedcontactid
        ? Number(this.GeneralReceiptCancelForm.value.autorizedcontactid)
        : 0,
      userid: 10,
      ipaddress: String(this.commonService.getIpAddress() ?? ''),
      logentrydatetime: new Date().toISOString().split('T')[0],
      activitytype: 'C',
    };

    this.receiptCancelService.SaveGeneralReceiptCancel(payload).subscribe({
      next: (res: any) => {
        if (res) {
          this.commonService.showInfoMessage('Cancelled Successfully');
          this.show.set(false);
          this.loadReceiptNumbers();
          this.clearReceiptFields();
          this.GeneralReceiptCancelForm.patchValue({ receiptid: null });
        }
      },
      error: (err: any) => {
        this.showError(err);
        this.resetLoadingState();
      },
      complete: () => this.resetLoadingState(),
    });
  }

  // ─── Cancel / Reset ───────────────────────────────────────────────────────
  Cancel(): void {
    this.buildForm();
    this.resetLoadingState();
    this.show.set(false);
    this.clearReceiptFields();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private clearReceiptFields(): void {
    this.receivedfrom.set('');
    this.receiptdate.set('');
    this.narration.set('');
    this.pmodofPayment.set('');
    this.doneby.set('');
    this.showtotalamount.set(0);
    this.lstdetails.set([]);
    this.generalReceiptData = [];
    this.pageCriteria.update(pc => ({ ...pc, totalrows: 0 }));
  }

  private resetLoadingState(): void {
    this.isLoading.set(false);
    this.disablesavebutton.set(false);
    this.buttonType.set('Save');
  }

  private watchAllControls(): void {
    Object.keys(this.GeneralReceiptCancelForm.controls).forEach(key => {
      this.GeneralReceiptCancelForm.get(key)?.valueChanges.subscribe(() => {
        // Trigger change detection via signals if needed
      });
    });
  }

  private showError(err: any): void {
    this.commonService.showErrorMessage(err);
  }
}
