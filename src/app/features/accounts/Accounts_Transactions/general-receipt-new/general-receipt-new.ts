import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, FormControl, FormsModule, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SharedModule } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { ValidationMessageComponent } from '../../../common/validation-message/validation-message.component';
import { DatePickerModule } from 'primeng/datepicker';
import { NumbersOnlyDirective } from '../../../../core/Directive/numbers-only';



// ── Validators 
function alphabetsOnlyValidator(c: AbstractControl): ValidationErrors | null {
  if (!c.value) return null;
  return /^[a-zA-Z\s]+$/.test(c.value.toString().trim()) ? null : { alphabetsOnly: true };
}

function digitsOnlyValidator(c: AbstractControl): ValidationErrors | null {
  if (!c.value) return null;
  return /^[0-9]+$/.test(c.value.toString().replace(/,/g, '')) ? null : { digitsOnly: true };
}

function alphanumericValidator(c: AbstractControl): ValidationErrors | null {
  if (!c.value) return null;
  return /^[a-zA-Z0-9]+$/.test(c.value.toString().trim()) ? null : { alphanumeric: true };
}

function cardNumberValidator(c: AbstractControl): ValidationErrors | null {
  if (!c.value) return null;
  return /^\d{16}$/.test(c.value.toString().replace(/\s/g, '')) ? null : { cardNumber: true };
}

function positiveAmountValidator(c: AbstractControl): ValidationErrors | null {
  if (!c.value) return null;
  const val = parseFloat(c.value.toString().replace(/,/g, ''));
  return !isNaN(val) && val > 0 ? null : { positiveAmount: true };
}

function percentageValidator(c: AbstractControl): ValidationErrors | null {
  if (c.value === null || c.value === '') return null;
  const val = parseFloat(c.value.toString());
  return !isNaN(val) && val >= 0 && val <= 100 ? null : { percentage: true };
}



@Component({
  selector: 'app-general-receipt-new',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
    NgSelectModule,
    ButtonModule,
    TableModule,
    DatePickerModule,
    MessageModule,
    NumbersOnlyDirective

  ],
  templateUrl: './general-receipt-new.html',
})
export class GeneralReceiptNew implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  // ── DI  
  private cs = inject(CommonService);
  private svc = inject(AccountsTransactions);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private datepipe = inject(DatePipe);
  private jvSvc = inject(AccountsTransactions);
  private destroyRef = inject(DestroyRef);

  // ── Signals — UI state 
  bankshowhide = signal(false);
  walletshowhide = signal(false);
  chequeshowhide = signal(false);
  onlineshowhide = signal(false);
  debitShowhide = signal(false);
  creditShowhide = signal(false);
  gridshowhide = signal(false);
  showgst = signal(false);
  showtds = signal(false);
  showsubledger = signal(true);
  showupi = signal(false);
  showgstno = signal(false);
  showgstamount = signal(false);
  showigst = signal(false);
  showcgst = signal(false);
  showsgst = signal(false);
  showutgst = signal(false);
  //showCashWarning = signal(false);
  showCashWarning = signal(false);
  chequeDate = signal<Date>(new Date());
  transactionDate = signal<Date>(new Date());
  submitted = signal(false);
  disablesavebutton = signal(false);
  savebutton = signal('Save');

  // ── Signals — data  
  banklist = signal<any[]>([]);
  banklist1 = signal<any[]>([]);
  partylist = signal<any[]>([]);
  ledgeraccountslist = signal<any[]>([]);
  subledgeraccountslist = signal<any[]>([]);
  gstlist = signal<any[]>([]);
  tdssectionlist = signal<any[]>([]);
  tdspercentagelist = signal<any[]>([]);
  tdslist = signal<any[]>([]);
  statelist = signal<any[]>([]);
  upinameslist = signal<any[]>([]);
  typeofpaymentlist = signal<any[]>([]);
  modeoftransactionslist = signal<any[]>([]);
  paymentslist = signal<any[]>([]);
  partyjournalentrylist = signal<any[]>([]);
  imageResponse = signal<any>({ name: '' });
  cashWarningMessage = signal('');

  // ── Signals — balances  
  cashBalance = signal('');
  bankBalance = signal('');
  bankbookBalance = signal('');
  bankpassbookBalance = signal('');
  ledgerBalance = signal('');
  subledgerBalance = signal('');
  partyBalance = signal('');
  uploadedFileName = signal('');
  uploadedFilePath = signal('');
  uploadedFileFormat = signal('');

  // ── Computed  
  paymentsTotal = computed(() =>
    this.paymentslist().reduce((s, c) => s + (Number(c.ptotalamount) || 0), 0)
  );
  totalTdsAmount = computed(() =>
    this.paymentslist().reduce((s: number, c: any) => s + (Number(c.ptdsamountindividual) || 0), 0)
  );

  // ── Non-signal state  
  readonly currencySymbol = this.cs.currencysymbol || '₹';
  readonly today = new Date();
  readonly maxDate = new Date();
  chequeDateValue: any = new Date();
  readonly gstnopattern = '^(0[1-9]|[1-2][0-9]|3[0-9])([a-zA-Z]){5}([0-9]){4}([a-zA-Z]){1}([a-zA-Z0-9]){1}([a-zA-Z]){1}([a-zA-Z0-9]){1}?';
  readonly CASH_TRANSACTION_LIMIT = 200000;
  readonly rowsPerPageOptions = [5, 10, 20, 50];

  dpConfig: any = {};
  dpConfig1: any = {};

  GeneralReceiptForm!: FormGroup;
  //   used by Online and Debit/Credit card Reference No inputs
  pChequenumberOnly(event: any): void {
    event.target.value = event.target.value.replace(/\D/g, '');
  }

  cleanInput(event: any): void {
    event.target.value = event.target.value.replace(/[^0-9]/g, '');
  }


  formValidationMessages: { [key: string]: string } = {};

  Modeofpayment = '';
  Transtype = '';
  TempGSTtype = '';
  TempModeofReceipt: any = '';
  TempgstshowInclude = true;
  TempgstshowExclude = true;
  tempState: any = '';
  tempgstno: any = '';
  temporaryamount = 0;
  availableAmount: any = 0;
  cashRestrictAmount: any;
  bankexists: boolean | undefined;
  paymentlistcolumnwiselist: any = { ptotalamount: 0, pamount: 0, pgstamount: 0 };
  gstPercentageSelected = false;
  DepositBankDisable = false;
  private _selectedPartyStateName = '';
  disabletransactiondate = false;
  private _depositBankId: any = null;
  currencyCode = '₹';

  readonly Bankbuttondata = [
    { type: 'Cheque', chequeshowhide: true, onlineshowhide: false, debitShowhide: false, creditShowhide: false },
    { type: 'Online', chequeshowhide: false, onlineshowhide: true, debitShowhide: false, creditShowhide: false },
    { type: 'Debit Card', chequeshowhide: false, onlineshowhide: false, debitShowhide: true, creditShowhide: false },
    { type: 'Credit Card', chequeshowhide: false, onlineshowhide: false, debitShowhide: false, creditShowhide: true }
  ];

  readonly Paymentbuttondata = [
    { type: 'Cash', bankshowhide: false, walletshowhide: false },
    { type: 'Bank', bankshowhide: true, walletshowhide: false },
    { type: 'Wallet', bankshowhide: false, walletshowhide: true }
  ];



  ngOnInit(): void {
    this._configureDatepickers();
    this._buildForm();
    this._subscribeFormChanges();
    this._loadInitialData();

    this.partyBalance.set(`${this.currencySymbol} 0 Dr`);
    this.ledgerBalance.set(`${this.currencySymbol} 0 Dr`);
    this.subledgerBalance.set(`${this.currencySymbol} 0 Dr`);
    this.bankpassbookBalance.set(`${this.currencySymbol} 0 Dr`);
    this.bankbookBalance.set(`${this.currencySymbol} 0 Dr`);
    this.paymentlistcolumnwiselist = { ptotalamount: 0, pamount: 0, pgstamount: 0 };

    this.Paymenttype('Cash');
    this.GeneralReceiptForm.get('ptypeofpayment')?.setValue('Cash');
    this.checkDepositBankEnable();
    this.BlurEventAllControll(this.GeneralReceiptForm);
    sessionStorage.removeItem('schemaNameForReportCall');

    if (this.cs.comapnydetails != null) {
      this.disabletransactiondate = this.cs.comapnydetails.pdatepickerenablestatus;
    }
  }


  // ── Private setup  
  private _configureDatepickers(): void {
    this.dpConfig.containerClass = 'theme-dark-blue';
    this.dpConfig.dateInputFormat = 'DD-MMM-YYYY';
    this.dpConfig.showWeekNumbers = false;
    this.dpConfig.isAnimated = true;
    this.dpConfig1 = { ...this.dpConfig, maxDate: new Date() };
  }

  private _buildForm(): void {
    this.GeneralReceiptForm = this.fb.group({
      preceiptid: [''],
      //  preceiptdate: [{ value: this.today, disabled: true }, Validators.required],
      preceiptdate: [this.today, Validators.required],


      // preceiptdate: [{ value: new Date(), disabled: true }, Validators.required],
      pmodofreceipt: ['CASH', Validators.required],
      ptotalreceivedamount: [0],
      pnarration: ['', [Validators.required, Validators.maxLength(250)]],
      ppartyname: [''],
      ppartyid: [null, Validators.required],
      pistdsapplicable: [false],
      pTdsSection: [''],
      pTdsPercentage: ['', percentageValidator],
      ptdsamount: [0],
      ptdscalculationtype: [''],
      ppartypannumber: [''],
      pbankname: ['', alphabetsOnlyValidator],
      pbranchname: ['', [Validators.required, Validators.pattern(/^[A-Za-z ]+$/), Validators.maxLength(30)]],
      schemaname: [this.cs.getschemaname()],
      ptranstype: [''],
      ptypeofpayment: [null],
      pAccountnumber: [''],
      pChequenumber: [''],
      chequeDateValue: [this.today],
      transcatioindate: [this.today],
      pchequedate: [new Date()],
      pbankid: [null],
      pCardNumber: ['', cardNumberValidator],
      pdepositbankid: [null],
      pdepositbankid1: [null],
      pdepositbankname: [''],
      pRecordid: [0],
      pUpiname: [''],
      pUpiid: [''],
      pstatename: [''],
      pCreatedby: [this.cs.getCreatedBy()],
      pModifiedby: [0],
      pStatusid: [''],
      pStatusname: [this.cs.pStatusname],
      pEffectfromdate: [''],
      pEffecttodate: [''],
      ptypeofoperation: [this.cs.ptypeofoperation],
      ppartyreferenceid: [''],
      ppartyreftype: [''],
      preceiptslist: this._buildReceiptsGroup(),
      pFilename: [''],
      pFilepath: [''],
      pFileformat: [''],
      pipaddress: [this.cs.getIpAddress()],
      pDocStorePath: [''],
      pchequestatus: [false]
    });
  }

  private _buildReceiptsGroup(): FormGroup {
    return this.fb.group({
      pisgstapplicable: [false],
      pState: [''],
      pStateId: [''],
      pgstpercentage: [''],
      pamount: [''],
      pgsttype: [''],
      pgstcalculationtype: ['INCLUDE'],
      pigstamount: [''],
      pcgstamount: [''],
      psgstamount: [''],
      putgstamount: [''],
      psubledgerid: [null, Validators.required],
      psubledgername: [''],
      pledgerid: [null, Validators.required],
      pledgername: [''],
      pCreatedby: [this.cs.pCreatedby],
      pStatusname: [this.cs.pStatusname],
      pModifiedby: [''],
      pStatusid: [''],
      pEffectfromdate: [''],
      pEffecttodate: [''],
      ptypeofoperation: [this.cs.ptypeofoperation],
      pgstamount: [''],
      pgstno: new FormControl('', Validators.pattern(this.gstnopattern)),
      pigstpercentage: [''],
      pcgstpercentage: [''],
      psgstpercentage: [''],
      putgstpercentage: [''],
      pactualpaidamount: ['', [Validators.required, positiveAmountValidator, Validators.pattern(/^[0-9,]+(\.[0-9]{1,2})?$/)]],
      ptotalamount: ['']
    });
  }

  private _subscribeFormChanges(): void {
    const sub = (path: string, fn: () => void) =>
      this.GeneralReceiptForm.get(path)?.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(fn);

    sub('preceiptslist.pactualpaidamount', () => this.recalculateAll());
    sub('pTdsPercentage', () => this.recalculateAll());
    sub('preceiptslist.pgstpercentage', () => this.recalculateAll());

    sub('pbankid', () => {
      if (this.GeneralReceiptForm.get('ptranstype')?.value === 'Online') {
        this.toggleReferenceNo(this.GeneralReceiptForm.get('pbankid')?.value);
      }
    });

    sub('pbankname', () => {
      const type = this.GeneralReceiptForm.get('ptranstype')?.value;
      if (type === 'Debit Card' || type === 'Credit Card') {
        this.toggleReferenceNo(this.GeneralReceiptForm.get('pbankname')?.value);
      }
    });

    sub('ptypeofpayment', () => { });
  }

  private _loadInitialData(): void {
    this.svc.GetGlobalBanks('global')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.banklist.set(res),
        error: err => this.cs.showErrorMessage(err)
      });

    this._loadBankNtList();

    this.svc.GetReceiptsandPaymentsLoadingData2(
      'GENERAL RECEIPT',
      this.cs.getbranchname(),
      this.cs.getschemaname(),
      this.cs.getCompanyCode(),
      this.cs.getBranchCode(),
      'taxes'
    ).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (json: any) => {
          if (!json) return;
          this.modeoftransactionslist.set(json.modeofTransactionslist);
          this.typeofpaymentlist.set(this._getTypeofPaymentData());
          this.ledgeraccountslist.set(json.accountslist);
          this.partylist.set(json.partylist);
          this.gstlist.set(json.gstlist);
          this.setBalances('CASH', json.cashbalance);
          this.setBalances('BANK', json.bankbalance);
          this.cashRestrictAmount = json.cashRestrictAmount;
        },
        error: err => this.cs.showErrorMessage(err)
      });
  }

  private _loadBankNtList(): void {
    this.svc.GetBanksntList(
      this.cs.getbranchname(),
      this.cs.getschemaname(),
      this.cs.getCompanyCode(),
      this.cs.getBranchCode()
    ).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.banklist1.set(res.banklist),
        error: err => this.cs.showErrorMessage(err)
      });
  }



  getValidationMsg(key: string): string {

    // ── Party — only use formValidationMessages
    if (key === 'ppartyid') {
      if (this.paymentslist().length > 0) return '';
      return this.formValidationMessages['ppartyid'] || '';
    }

    // ── Bank field groups per tab ──
    const chequeOnlyFields = ['pbranchname', 'pAccountnumber', 'pchequedate'];
    const onlineOnlyFields = ['ptypeofpayment'];
    const cardOnlyFields = ['pCardNumber'];
    const creditOnlyFields = ['pbankname'];
    const bankSharedFields = ['pbankid', 'pChequenumber', 'pdepositbankid'];

    const allBankFields = [
      ...chequeOnlyFields,
      ...onlineOnlyFields,
      ...cardOnlyFields,
      ...creditOnlyFields,
      ...bankSharedFields
    ];

    // ── Bank-specific field handling ──
    if (allBankFields.includes(key)) {

      if (!this.bankshowhide()) return '';
      if (!this.Transtype) return '';

      if (key === 'pbankname' && this.Transtype !== 'Credit Card') return '';

      if (key === 'pbankid' &&
        (this.Transtype === 'Debit Card' || this.Transtype === 'Credit Card')) return '';

      const isRelevantToCurrentTab =
        (this.Transtype === 'Cheque' && (
          chequeOnlyFields.includes(key) || bankSharedFields.includes(key)
        )) ||
        (this.Transtype === 'Online' && (
          onlineOnlyFields.includes(key) || bankSharedFields.includes(key)
        )) ||
        (this.Transtype === 'Debit Card' && (
          cardOnlyFields.includes(key) || bankSharedFields.includes(key)
        )) ||
        (this.Transtype === 'Credit Card' && (
          cardOnlyFields.includes(key) || creditOnlyFields.includes(key) || bankSharedFields.includes(key)
        ));

      if (!isRelevantToCurrentTab) return '';

      return this.formValidationMessages[key] || '';
    }



    // formValidationMessages set by save/add button — takes priority
    if (this.formValidationMessages[key]) {
      return this.formValidationMessages[key];
    }

    // If payments already added to grid, don't re-validate cleared receipt fields
    const receiptLineFields = ['pledgerid', 'psubledgerid', 'pactualpaidamount'];
    if (this.submitted() && receiptLineFields.includes(key) && this.paymentslist().length > 0) {
      return '';
    }

    // Angular form control errors — only read formValidationMessages, never control state directly
    const ctrl = this.GeneralReceiptForm.get(key)
      ?? this.GeneralReceiptForm.get('preceiptslist.' + key);

    if (!ctrl || !ctrl.errors || !(ctrl.touched || this.submitted()) || !this.formValidationMessages[key]) {
      return '';
    }

    if (ctrl.errors['required']) return this._getRequiredMsg(key);
    if (ctrl.errors['minlength']) return `Minimum ${ctrl.errors['minlength'].requiredLength} characters required`;
    if (ctrl.errors['maxlength']) return `Maximum ${ctrl.errors['maxlength'].requiredLength} characters allowed`;
    if (ctrl.errors['pattern']) return this._getPatternMsg(key);
    if (ctrl.errors['positiveAmount']) return 'Amount must be greater than 0';
    if (ctrl.errors['digitsOnly']) return 'Only digits allowed';
    if (ctrl.errors['alphabetsOnly']) return 'Only alphabets allowed';
    if (ctrl.errors['cardNumber']) return 'Card number must be 16 digits';
    if (ctrl.errors['alphanumeric']) return 'Only alphanumeric characters allowed';
    if (ctrl.errors['percentage']) return 'Invalid percentage';

    return '';
  }

  private _getRequiredMsg(key: string): string {
    const map: { [k: string]: string } = {
      ppartyid: 'Party Is Required',
      pledgerid: 'Ledger Is Required',
      psubledgerid: 'Sub Ledger Is Required',
      pactualpaidamount: 'Amount Received Is Required And Must Be Greater Than 0',
      pmodofreceipt: 'Mode Of Receipt Is Required',
      ptranstype: 'Transaction Type Is Required',
      pbankid: 'Please Select Bank Name',
      pbranchname: 'Please Enter Branch Name',
      pAccountnumber: 'Please Enter Account Number',
      pChequenumber: 'Cheque Number Is Required',
      pchequedate: 'Please Select Cheque Date',
      pdepositbankid: 'Please Select Deposited Bank Name',
      ptypeofpayment: 'Type Of Payment Is Required',
      pCardNumber: 'Card Number Is Required',
      pbankname: 'Bank Name Is Required',
      pTdsSection: 'Section Is Required',
      pTdsPercentage: 'Percentage Is Required',
      pgstpercentage: 'GST Percentage Is Required',
      pStateId: 'State Is Required',
      pnarration: 'Narration Is Required',
    };
    return map[key] ?? `${key} is required`;
  }

  private _getPatternMsg(key: string): string {
    const map: { [k: string]: string } = {
      pbranchname: 'Branch name must contain alphabets only',
      pAccountnumber: 'Account number must contain digits only',
      pChequenumber: 'Cheque number must be exactly 6 digits',
      pgstno: 'Invalid GST number format',
      pbankname: 'Bank name must contain alphabets only',
    };
    return map[key] ?? 'Invalid format';
  }

  Paymenttype(type: string): void {
    this.formValidationMessages = {};
    this.submitted.set(false);
    this.GeneralReceiptForm.markAsUntouched();
    this.GeneralReceiptForm.markAsPristine();

    // reset non-bank fields touched/pristine so they dont fire on mode switch
    const fg = this.GeneralReceiptForm.get('preceiptslist') as FormGroup;
    ['pledgerid', 'psubledgerid', 'pactualpaidamount'].forEach(k => {
      fg?.get(k)?.markAsUntouched();
      fg?.get(k)?.markAsPristine();
    });
    this.GeneralReceiptForm.get('ppartyid')?.markAsUntouched();
    this.GeneralReceiptForm.get('ppartyid')?.markAsPristine();
    this.GeneralReceiptForm.get('pnarration')?.setValue('');
    this.GeneralReceiptForm.get('pnarration')?.markAsUntouched();
    this.GeneralReceiptForm.get('pnarration')?.markAsPristine();

    const btn = this.Paymentbuttondata.find((b: any) => b.type === type);
    if (btn) {
      this.bankshowhide.set(btn.bankshowhide);
      this.walletshowhide.set(btn.walletshowhide);
    }

    this.GeneralReceiptForm.controls['pbankname'].setValue('');
    this.GeneralReceiptForm.controls['pChequenumber'].setValue('');
    this.chequeDateValue = new Date();
    this.GeneralReceiptForm.controls['pchequedate'].setValue(new Date());
    this.GeneralReceiptForm.controls['pdepositbankname'].setValue('');
    this.GeneralReceiptForm.controls['ptypeofpayment'].setValue('null');
    this.GeneralReceiptForm.controls['pbranchname'].setValue('');
    this.GeneralReceiptForm.controls['pCardNumber'].setValue('');
    this.GeneralReceiptForm.controls['pAccountnumber'].setValue('');
    this._depositBankId = null;
    this.setBalances('BANKBOOK', 0);
    this.setBalances('PASSBOOK', 0);
    this.showCashWarning.set(false);
    this.cashWarningMessage.set('');
    // Reset UPI
    this.showupi.set(false);
    this.upinameslist.set([]);
    this.GeneralReceiptForm.get('pUpiname')?.setValue('');
    this.GeneralReceiptForm.get('pUpiid')?.setValue('');

    if (type === 'Bank') {
      this.GeneralReceiptForm.controls['ptranstype'].setValue('Cheque');
      this.Banktype('Cheque');
      this.Modeofpayment = type;
    } else {
      this.GeneralReceiptForm.controls['ptranstype'].setValue('');

      ['pdepositbankname', 'pbankid', 'pChequenumber', 'ptypeofpayment',
        'pbranchname', 'pCardNumber', 'pchequedate', 'pAccountnumber']
        .forEach(f => {
          this.GeneralReceiptForm.controls[f]?.clearValidators();
          this.GeneralReceiptForm.controls[f]?.updateValueAndValidity();
          this.GeneralReceiptForm.controls[f]?.enable();
        });

      this.chequeshowhide.set(false);
      this.onlineshowhide.set(false);
      this.creditShowhide.set(false);
      this.debitShowhide.set(false);
      this.Modeofpayment = type;
      this.Transtype = '';
    }
  }


  Banktype(type: string): void {
    this.formValidationMessages = {};
    this.submitted.set(false);

    this._depositBankId = null;
    this.validation(type);

    this.GeneralReceiptForm.controls['pbankid'].setValue(null);
    this.GeneralReceiptForm.controls['pChequenumber'].setValue('');

    this.chequeDateValue = new Date();
    this.GeneralReceiptForm.controls['pchequedate'].setValue(new Date());
    this.GeneralReceiptForm.controls['ptypeofpayment'].setValue(null);
    this.GeneralReceiptForm.controls['pbranchname'].setValue('');
    this.GeneralReceiptForm.controls['pCardNumber'].setValue('');
    this.GeneralReceiptForm.controls['pAccountnumber'].setValue('');
    this.GeneralReceiptForm.controls['pbankname'].setValue('');
    this.GeneralReceiptForm.controls['pchequestatus'].setValue(type === 'Cheque');

    // reset bank fields touched/pristine
    [
      'pbankid', 'ptypeofpayment', 'pChequenumber', 'pdepositbankid',
      'pCardNumber', 'pbankname', 'pbranchname', 'pAccountnumber', 'pchequedate'
    ].forEach(k => {
      const ctrl = this.GeneralReceiptForm.controls[k];
      if (!ctrl) return;
      ctrl.markAsUntouched();
      ctrl.markAsPristine();
    });

    // reset non-bank fields touched/pristine so they dont fire on tab switch
    const fg = this.GeneralReceiptForm.get('preceiptslist') as FormGroup;
    ['pledgerid', 'psubledgerid', 'pactualpaidamount'].forEach(k => {
      fg?.get(k)?.markAsUntouched();
      fg?.get(k)?.markAsPristine();
    });
    this.GeneralReceiptForm.get('ppartyid')?.markAsUntouched();
    this.GeneralReceiptForm.get('ppartyid')?.markAsPristine();
    this.GeneralReceiptForm.get('pnarration')?.setValue('');
    this.GeneralReceiptForm.get('pnarration')?.markAsUntouched();
    this.GeneralReceiptForm.get('pnarration')?.markAsPristine();

    this.Transtype = type;
    this.GeneralReceiptForm.get('ptypeofpayment')?.enable();

    this.typeofpaymentlist.set(
      type === 'Online'
        ? this.modeoftransactionslist().filter(
          (p: any) => p.ptranstype === 'Online' && p.ptypeofpayment !== 'Online'
        )
        : this._getTypeofPaymentData()
    );

    const btn = this.Bankbuttondata.find((b: any) => b.type === type);
    if (btn) {
      this.chequeshowhide.set(btn.chequeshowhide);
      this.onlineshowhide.set(btn.onlineshowhide);
      this.debitShowhide.set(btn.debitShowhide);
      this.creditShowhide.set(btn.creditShowhide);
    }

    // Reset UPI fields
    this.showupi.set(false);
    this.upinameslist.set([]);
    this.GeneralReceiptForm.get('pUpiname')?.setValue('');
    this.GeneralReceiptForm.get('pUpiid')?.setValue('');

    this.setBalances('BANKBOOK', 0);
    this.setBalances('PASSBOOK', 0);

    // if (type === 'Online') {
    //   this.GeneralReceiptForm.controls['ptypeofpayment'].setValue('');
    //   this.GeneralReceiptForm.get('pChequenumber')?.disable();
    // } 

    if (type === 'Online') {
      this.GeneralReceiptForm.controls['ptypeofpayment'].setValue(null);  // ← null instead of ''
      this.GeneralReceiptForm.get('pChequenumber')?.disable();
    }

    else {
      this.GeneralReceiptForm.controls['ptypeofpayment'].setValue(type);
      this.GeneralReceiptForm.get('pChequenumber')?.enable();
    }

    this.GeneralReceiptForm.controls['ptranstype'].setValue(type);
    this.checkDepositBankEnable();
  }

  checkDepositBankEnable(): void {
    this.GeneralReceiptForm.get('pdepositbankid')?.enable();
  }



  toggleReferenceNo(value: any): void {
    const refCtrl = this.GeneralReceiptForm.get('pChequenumber');
    if (value && value.toString().trim() !== '') {
      refCtrl?.enable();
    } else {
      refCtrl?.reset();
      refCtrl?.disable();
    }
  }
  // ── Balances 
  setBalances(type: string, amount: string | number): void {
    const n = Number(amount) || 0;
    const rounded = Math.round(Math.abs(n));
    const fmt = this.cs.currencyFormat(rounded.toString());
    const label = n < 0 ? `${fmt} Cr` : `${fmt} Dr`;

    switch (type) {
      case 'CASH': this.cashBalance.set(label); break;
      case 'BANK': this.bankBalance.set(label); break;
      case 'BANKBOOK': this.bankbookBalance.set(`${this.currencySymbol} ${label}`); break;
      case 'PASSBOOK': this.bankpassbookBalance.set(`${this.currencySymbol} ${label}`); break;
      case 'LEDGER': this.ledgerBalance.set(`${this.currencySymbol} ${label}`); break;
      case 'SUBLEDGER': this.subledgerBalance.set(`${this.currencySymbol} ${label}`); break;
      case 'PARTY': this.partyBalance.set(`${this.currencySymbol} ${label}`); break;
    }
  }

  getSafeBalance(balance: string, fallback?: string): string {
    const fb = fallback ?? `${this.currencySymbol} 0 Dr`;
    if (!balance || balance.includes('NaN') || balance.includes('undefined')) return fb;
    return balance;
  }


  // ── Amount helpers  
  getFormattedAmountDisplay(): string {
    const raw = this.GeneralReceiptForm.get('preceiptslist.pactualpaidamount')?.value;
    if (!raw) return '';
    const num = Number(raw.toString().replace(/,/g, ''));
    return isNaN(num) ? raw : num.toLocaleString('en-IN');
  }

  blockInvalidAmountKeys(event: KeyboardEvent): void {
    const allowed = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'F5'
    ];
    if (allowed.includes(event.key)) return;
    if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) return;
    if (/^[0-9]$/.test(event.key)) return;
    event.preventDefault();
  }

  onAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/,/g, '').replace(/\D/g, '');
    const MAX = 9999999999999;

    if (raw === '') {
      input.value = '';
      const ctrl = this.GeneralReceiptForm.get('preceiptslist.pactualpaidamount');
      ctrl?.setValue('', { emitEvent: true });
      // ctrl?.markAsTouched();
      this.recalculateAll();
      return;
    }

    const num = Math.min(Number(raw), MAX);
    input.value = num.toLocaleString('en-IN');
    try { input.setSelectionRange(input.value.length, input.value.length); } catch { }

    const ctrl = this.GeneralReceiptForm.get('preceiptslist.pactualpaidamount');
    ctrl?.setValue(raw, { emitEvent: true });
    ctrl?.markAsTouched();
    this.recalculateAll();
  }


  pamount_change(event: any): void {
    debugger
    const input = event?.target as HTMLInputElement;
    if (input) {
      const raw = this.GeneralReceiptForm.get('preceiptslist.pactualpaidamount')?.value;
      if (raw) {
        const num = Number(raw.toString().replace(/,/g, ''));
        if (!isNaN(num) && num > 0) input.value = num.toLocaleString('en-IN');
      }
    }
    this.recalculateAll();
  }

  recalculateAll(): void {
    try {
      const rg = this.GeneralReceiptForm.get('preceiptslist') as FormGroup;

      // ── Amount ──
      const rawAmount = rg.get('pactualpaidamount')?.value;
      const amountReceived = parseFloat(
        (typeof rawAmount === 'string'
          ? rawAmount.replace(/,/g, '')
          : rawAmount?.toString() || '0')
      ) || 0;

      // ── GST ──
      const isgst = rg.get('pisgstapplicable')?.value;
      const gsttype = rg.get('pgsttype')?.value;
      const cgstpct = parseFloat(rg.get('pcgstpercentage')?.value || '0') || 0;
      const sgstpct = parseFloat(rg.get('psgstpercentage')?.value || '0') || 0;
      const utgstpct = parseFloat(rg.get('putgstpercentage')?.value || '0') || 0;
      const pgstPct = parseFloat(rg.get('pgstpercentage')?.value || '0') || 0;

      // ── TDS ──
      const isTds = this.GeneralReceiptForm.get('pistdsapplicable')?.value;
      const tdsRate = this._getTdsPercentageValue();
      let gstRate = 0;
      if (isgst && gsttype) {
        if (gsttype === 'IGST') gstRate = pgstPct;
        else if (gsttype === 'CGST,SGST') gstRate = cgstpct + sgstpct;
        else if (gsttype === 'CGST,UTGST') gstRate = cgstpct + utgstpct;
      }

      // ── Show/hide flags ──
      this.showgstamount.set(!!(isgst && gsttype));
      this.showigst.set(gsttype === 'IGST');
      this.showcgst.set(gsttype === 'CGST,SGST' || gsttype === 'CGST,UTGST');
      this.showsgst.set(gsttype === 'CGST,SGST');
      this.showutgst.set(gsttype === 'CGST,UTGST');

      // ── Core calculation — identical to Payment Voucher ──
      let taxable = 0;
      let gstAmt = 0;
      let igstamt = 0;
      let cgstamt = 0;
      let sgstamt = 0;
      let utgstamt = 0;
      let tdsAmount = 0;

      // Back-calculate taxable from gross entered amount
      taxable =
        gstRate > 0 || tdsRate > 0
          ? Math.round((amountReceived * 100) / (100 + gstRate - tdsRate))
          : amountReceived;

      // GST breakdown
      if (isgst && gstRate > 0) {
        gstAmt = Math.round((taxable * gstRate) / 100);

        if (gsttype === 'IGST') {
          igstamt = gstAmt;

        } else if (gsttype === 'CGST,SGST') {
          cgstamt = Math.round(gstAmt / 2);
          sgstamt = Math.round(gstAmt / 2);

        } else if (gsttype === 'CGST,UTGST') {
          cgstamt = Math.round(gstAmt / 2);
          utgstamt = Math.round(gstAmt / 2);
        }
      }

      // TDS on taxable
      if (isTds && tdsRate > 0) {
        tdsAmount = Math.round((taxable * tdsRate) / 100);
      }

      const totalAmount = Math.round(taxable + gstAmt);             // gross before TDS
      const netAmount = Math.round(taxable + gstAmt - tdsAmount); // net received

      // ── Patch form ──
      rg.patchValue({
        pamount: netAmount,
        pgstamount: gstAmt,
        pigstamount: igstamt,
        pcgstamount: cgstamt,
        psgstamount: sgstamt,
        putgstamount: utgstamt,
        ptotalamount: totalAmount,
      }, { emitEvent: false });

      this.GeneralReceiptForm.get('ptdsamount')
        ?.setValue(tdsAmount, { emitEvent: false });

    } catch (e) {
      this.cs.showErrorMessage(e);
    }
  }
  private _getTdsPercentageValue(): number {
    const raw = this.GeneralReceiptForm.get('pTdsPercentage')?.value;
    if (raw === null || raw === undefined || raw === '') return 0;
    if (typeof raw === 'object' && 'pTdsPercentage' in raw) return Number(raw.pTdsPercentage) || 0;
    return Number(raw) || 0;
  }


  // ── Party  
  partyName_Change($event: any): void {
    this.formValidationMessages['ppartyid'] = '';
    this.availableAmount = 0;
    this.tempState = ''; this.tempgstno = ''; this.TempGSTtype = ''; this.TempModeofReceipt = '';
    this.showtds.set(false);
    this.GeneralReceiptForm.controls['pistdsapplicable'].setValue(false);
    this.GeneralReceiptForm.get('preceiptslist.pisgstapplicable')?.setValue(false);
    this.showgst.set(false);
    this._resetGstFlags();
    this.gstvalidation(false);
    this.statelist.set([]);
    this.GeneralReceiptForm.get('preceiptslist.pStateId')?.setValue('');
    this.tdssectionlist.set([]);
    this.tdspercentagelist.set([]);
    this.clearPaymentDetails();
    if (!$event?.ppartyid) {
      this.paymentslist.set([]);
      this.partyjournalentrylist.set([]);
      this.gridshowhide.set(false);
    }

    ['pTdsSection', 'pTdsPercentage', 'ppartyreferenceid', 'ppartyreftype', 'ppartypannumber']
      .forEach(f => this.GeneralReceiptForm.controls[f]?.setValue(f === 'pTdsPercentage' ? 0 : ''));

    this.partyBalance.set(`${this.currencySymbol} 0 Dr`);
    this.showCashWarning.set(false);
    this.cashWarningMessage.set('');

    const ppartyid = $event?.ppartyid;
    const trans_date = this.cs.getFormatDateNormal(this.GeneralReceiptForm.controls['preceiptdate'].value);

    this.svc.GetCashRestrictAmountpercontact1(
      'GENERAL RECEIPT', 'KGMS', this.cs.getbranchname(),
      ppartyid, trans_date, this.cs.getCompanyCode(),
      this.cs.getschemaname(), this.cs.getBranchCode()
    ).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.availableAmount = (Number(this.cashRestrictAmount) || 0) - (Number(res) || 0);
        },
        error: err => this.cs.showErrorMessage(err)
      });

    if (ppartyid) {
      this._selectedPartyStateName = $event.state_name || '';
      this.getPartyDetailsbyid(ppartyid);
      this.GeneralReceiptForm.controls['ppartyname'].setValue($event.ppartyname);
      this.GeneralReceiptForm.controls['pstatename'].setValue($event.state_name || '');
      const party = this.partylist().find((x: any) => x.ppartyid == ppartyid);
      if (party) {
        this.GeneralReceiptForm.controls['ppartyreferenceid'].setValue(party.ppartyreferenceid);
        this.GeneralReceiptForm.controls['ppartyreftype'].setValue(party.ppartyreftype);
        this.GeneralReceiptForm.controls['ppartypannumber'].setValue(party.pan_no || '');
      }
    } else {
      this.setBalances('PARTY', 0);
      this.GeneralReceiptForm.controls['ppartyname'].setValue('');
      this._selectedPartyStateName = '';
    }
  }

  getPartyDetailsbyid(id: any): void {
    this.svc.getPartyDetailsbyid(
      id, this.cs.getbranchname(), this.cs.getBranchCode(),
      this.cs.getCompanyCode(), this.cs.getschemaname(), 'taxes'
    ).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (json: any) => {
          if (!json) return;
          const rawTds = json.lstTdsSectionDetails || [];
          this.tdslist.set(rawTds);
          const sections = [...new Set(rawTds.map((i: any) => i.pTdsSection))];
          this.tdssectionlist.set(sections.map(s => ({ pTdsSection: s })));

          const partyState = (this._selectedPartyStateName || '').toLowerCase().trim();
          if (partyState && json.statelist?.length) {
            const filtered = json.statelist.filter((s: any) =>
              (s.pState || s.pStatename || '').toLowerCase().trim().includes(partyState) ||
              partyState.includes((s.pState || s.pStatename || '').toLowerCase().trim())
            );
            this.statelist.set(filtered);
            if (filtered.length === 1) {
              setTimeout(() => {
                this.GeneralReceiptForm.get('preceiptslist.pStateId')?.setValue(filtered[0].pStateId);
                this.state_change(filtered[0]);
              });
            }
          } else {
            this.statelist.set([]);
          }
          this.recalculateAll();
          this.setBalances('PARTY', json.accountbalance);
        },
        error: err => this.cs.showErrorMessage(err)
      });
  }


  // ── Ledger / SubLedger  
  ledgerName_Change($event: any): void {
    this.formValidationMessages['pledgerid'] = '';
    const pledgerid = $event?.pledgerid;
    this.subledgeraccountslist.set([]);
    this.GeneralReceiptForm.get('preceiptslist.psubledgerid')?.setValue(null);
    this.GeneralReceiptForm.get('preceiptslist.psubledgername')?.setValue('');
    this.ledgerBalance.set(`${this.currencySymbol} 0 Dr`);
    this.subledgerBalance.set(`${this.currencySymbol} 0 Dr`);

    if (pledgerid) {
      const data = this.ledgeraccountslist().find((l: any) => l.pledgerid === pledgerid);
      if (data) this.setBalances('LEDGER', data.accountbalance);
      this.GeneralReceiptForm.get('preceiptslist.pledgername')?.setValue($event.pledgername);
      const sub = this.GeneralReceiptForm.get('preceiptslist.psubledgerid');
      sub?.clearValidators();
      sub?.updateValueAndValidity();
      this.GetSubLedgerData(pledgerid);
    } else {
      this.setBalances('LEDGER', 0);
      this.GeneralReceiptForm.get('preceiptslist.pledgername')?.setValue('');
      this.formValidationMessages['pactualpaidamount'] = '';

    }
  }

  subledger_Change($event: any): void {
    const id = $event?.psubledgerid;
    this.subledgerBalance.set(`${this.currencySymbol} 0 Dr`);
    if (id) {
      this.GeneralReceiptForm.get('preceiptslist.psubledgername')?.setValue($event.psubledgername);
      const data = this.subledgeraccountslist().find((l: any) => l.psubledgerid == id);
      if (data) this.setBalances('SUBLEDGER', data.accountbalance);
    } else {
      this.GeneralReceiptForm.get('preceiptslist.psubledgername')?.setValue('');
      this.setBalances('SUBLEDGER', 0);
    }
  }

  GetSubLedgerData(pledgerid: any): void {
    this.svc.GetSubLedgerData(
      pledgerid, this.cs.getbranchname(), this.cs.getCompanyCode(),
      this.cs.getbranchname(), this.cs.getBranchCode(), this.cs.getschemaname()
    ).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (json: any) => {
          if (!json) return;
          this.subledgeraccountslist.set(json);
          const sub = this.GeneralReceiptForm.get('preceiptslist.psubledgerid');
          if (json.length > 0) {
            this.showsubledger.set(true);
            sub?.setValidators(Validators.required);
          } else {
            this.showsubledger.set(false);
            sub?.clearValidators();
            sub?.setValue(pledgerid);
            this.GeneralReceiptForm.get('preceiptslist.psubledgername')
              ?.setValue(this.GeneralReceiptForm.get('preceiptslist.pledgername')?.value);
          }
          sub?.updateValueAndValidity();
        },
        error: err => this.cs.showErrorMessage(err)
      });
  }


  // ── GST  
  isgstapplicableChange(): void {
    const on = this.GeneralReceiptForm.get('preceiptslist.pisgstapplicable')?.value;
    if (!on) {
      this.showgst.set(false);
      this._resetGstFlags();
      ['pgstcalculationtype', 'pgstpercentage', 'pgsttype'].forEach(k =>
        this.GeneralReceiptForm.get(`preceiptslist.${k}`)
          ?.setValue(k === 'pgstcalculationtype' ? 'INCLUDE' : null)
      );
      ['pgstamount', 'pigstamount', 'pcgstamount', 'psgstamount', 'putgstamount'].forEach(k =>
        this.GeneralReceiptForm.get(`preceiptslist.${k}`)?.setValue(0)
      );
      this.GeneralReceiptForm.get('preceiptslist.pamount')
        ?.setValue(this.GeneralReceiptForm.get('preceiptslist.pactualpaidamount')?.value || 0);
      this.gstvalidation(false);
      this.gstPercentageSelected = false;
      this.recalculateAll();
      return;
    }

    this.showgst.set(true);
    this.gstPercentageSelected = false;
    this.GeneralReceiptForm.get('preceiptslist.pgstcalculationtype')?.setValue('INCLUDE');

    const existingStateId = this.GeneralReceiptForm.get('preceiptslist.pStateId')?.value;
    if (existingStateId) {
      const s = this.statelist().find((x: any) => x.pStateId == existingStateId);
      if (s) this._applyStateGstType(s);
    } else if (this.statelist().length === 1) {
      setTimeout(() => {
        this.GeneralReceiptForm.get('preceiptslist.pStateId')?.setValue(this.statelist()[0].pStateId);
        this.state_change(this.statelist()[0]);
      });
    }


    this.recalculateAll();
    this.gstvalidation(on);
    this.formValidationMessages['pgstpercentage'] = '';
    this.formValidationMessages['pStateId'] = '';
    const gstCtrls = this.GeneralReceiptForm.get('preceiptslist') as FormGroup;
    gstCtrls.get('pgstpercentage')?.markAsUntouched();
    gstCtrls.get('pgstpercentage')?.markAsPristine();
    gstCtrls.get('pStateId')?.markAsUntouched();
    gstCtrls.get('pStateId')?.markAsPristine();
  }

  // gst_Change($event: any): void {
  //   if (!$event) {
  //     this.GeneralReceiptForm.get('preceiptslist.pgstpercentage')?.setValue(null);
  //     ['pigstpercentage', 'pcgstpercentage', 'psgstpercentage', 'putgstpercentage',
  //       'pgstamount', 'pigstamount', 'pcgstamount', 'psgstamount', 'putgstamount']
  //       .forEach(k => this.GeneralReceiptForm.get(`preceiptslist.${k}`)?.setValue(0));
  //     this.recalculateAll();
  //     return;
  //   }
  //   const pct = $event.pgstpercentage ?? $event;
  //   ['pigstpercentage', 'pcgstpercentage', 'psgstpercentage', 'putgstpercentage'].forEach(k =>
  //     this.GeneralReceiptForm.get(`preceiptslist.${k}`)?.setValue('')
  //   );
  //   ['pgstamount', 'pigstamount', 'pcgstamount', 'psgstamount', 'putgstamount'].forEach(k =>
  //     this.GeneralReceiptForm.get(`preceiptslist.${k}`)?.setValue(0)
  //   );
  //   if (pct) this._applyGstPercentage(pct);
  //   this.gstPercentageSelected = true;
  //   this.recalculateAll();
  // }
  gst_Change($event: any): void {
    if (!$event) {
      this.GeneralReceiptForm.get('preceiptslist.pgstpercentage')?.setValue(null);
      ['pigstpercentage', 'pcgstpercentage', 'psgstpercentage', 'putgstpercentage',
        'pgstamount', 'pigstamount', 'pcgstamount', 'psgstamount', 'putgstamount']
        .forEach(k => this.GeneralReceiptForm.get(`preceiptslist.${k}`)?.setValue(0));
      this.formValidationMessages['pgstpercentage'] = 'GST Percentage Is Required';
      this.GeneralReceiptForm.get('preceiptslist.pgstpercentage')?.markAsTouched();
      this.recalculateAll();
      return;
    }
    const pct = $event.pgstpercentage ?? $event;
    ['pigstpercentage', 'pcgstpercentage', 'psgstpercentage', 'putgstpercentage'].forEach(k =>
      this.GeneralReceiptForm.get(`preceiptslist.${k}`)?.setValue('')
    );
    ['pgstamount', 'pigstamount', 'pcgstamount', 'psgstamount', 'putgstamount'].forEach(k =>
      this.GeneralReceiptForm.get(`preceiptslist.${k}`)?.setValue(0)
    );
    if (pct) this._applyGstPercentage(pct);
    // ── clear validation as soon as value is selected ──
    this.formValidationMessages['pgstpercentage'] = '';
    this.GeneralReceiptForm.get('preceiptslist.pgstpercentage')?.markAsTouched();
    this.GeneralReceiptForm.get('preceiptslist.pgstpercentage')?.updateValueAndValidity();
    this.gstPercentageSelected = true;
    this.recalculateAll();
  }

  private _applyGstPercentage(pct: any): void {
    const data = this.gstlist().find((g: any) => g.pgstpercentage == pct);
    if (!data) return;
    ['pigstpercentage', 'pcgstpercentage', 'psgstpercentage', 'putgstpercentage'].forEach(k =>
      this.GeneralReceiptForm.get(`preceiptslist.${k}`)?.setValue(data[k])
    );
  }

  state_change($event: any): void {
    if (!$event) {
      this._gstClear();
      this.GeneralReceiptForm.get('preceiptslist.pStateId')?.setValue(null);
      this.GeneralReceiptForm.get('preceiptslist.pState')?.setValue('');
      this.GeneralReceiptForm.get('preceiptslist.pgstpercentage')?.setValue(null);
      this._resetGstFlags();
      return;
    }
    const id = $event.pStateId ?? $event.pstateid ?? $event.stateId;
    this._gstClear();
    this._resetGstFlags();
    if (!id) return;
    const s = this.statelist().find((x: any) => x.pStateId == id);
    if (!s) return;
    this.GeneralReceiptForm.get('preceiptslist.pState')?.setValue(s.pState);
    this.GeneralReceiptForm.get('preceiptslist.pgstno')?.setValue(s.gstnumber);
    this._applyStateGstType(s);
    this.recalculateAll();
  }

  private _applyStateGstType(s: any): void {
    this.showgstno.set(!s.gstnumber);
    this.GeneralReceiptForm.get('preceiptslist.pgsttype')?.setValue(s.pgsttype);
    this.GeneralReceiptForm.get('preceiptslist.pgstno')?.setValue(s.gstnumber);
    this.showgstamount.set(true);
    this.showigst.set(false);
    this.showcgst.set(false);
    this.showsgst.set(false);
    this.showutgst.set(false);
    if (s.pgsttype === 'IGST') {
      this.showigst.set(true);
    } else {
      this.showcgst.set(true);
      if (s.pgsttype === 'CGST,SGST') this.showsgst.set(true);
      if (s.pgsttype === 'CGST,UTGST') this.showutgst.set(true);
    }
  }

  private _gstClear(): void {
    ['pigstpercentage', 'pcgstpercentage', 'psgstpercentage',
      'putgstpercentage', 'pgstpercentage', 'pgstno']
      .forEach(k => this.GeneralReceiptForm.get(`preceiptslist.${k}`)?.setValue(''));
  }

  private _resetGstFlags(): void {
    this.showgstamount.set(false);
    this.showigst.set(false);
    this.showcgst.set(false);
    this.showsgst.set(false);
    this.showutgst.set(false);
    this.showgstno.set(false);
  }

  gstvalidation(on: any): void {
    // this.formValidationMessages = {};
    this.formValidationMessages['pgstpercentage'] = '';
    this.formValidationMessages['pStateId'] = '';
    const pctCtrl = this.GeneralReceiptForm.get('preceiptslist.pgstpercentage');
    const stateCtrl = this.GeneralReceiptForm.get('preceiptslist.pStateId');

    if (on) {
      if (this.statelist().length !== 1) stateCtrl?.setValidators(Validators.required);
      else stateCtrl?.clearValidators();
      pctCtrl?.setValidators([Validators.required, percentageValidator]);
      this.GeneralReceiptForm.get('preceiptslist.pgstpercentage')?.setValue(null);
    } else {
      stateCtrl?.clearValidators();
      pctCtrl?.clearValidators();
      this.GeneralReceiptForm.get('preceiptslist.pgstpercentage')?.setValue(null);
    }
    stateCtrl?.updateValueAndValidity();
    pctCtrl?.updateValueAndValidity();
    // this.formValidationMessages = {};
  }


  // ── TDS  
  istdsapplicableChange(): void {
    const on = this.GeneralReceiptForm.get('pistdsapplicable')?.value;
    if (on) {
      this.showtds.set(true);
      this.GeneralReceiptForm.controls['ptdscalculationtype'].setValue('EXCLUDE');
      this.GeneralReceiptForm.controls['pTdsSection'].setValue(null);
      this.GeneralReceiptForm.controls['pTdsPercentage'].setValue(null);
      this.GeneralReceiptForm.controls['ptdsamount'].setValue(0);
    } else {
      this.showtds.set(false);


      ['ptdscalculationtype', 'pTdsSection', 'pTdsPercentage'].forEach(f =>
        this.GeneralReceiptForm.controls[f].setValue(null)
      );
      this.GeneralReceiptForm.controls['ptdsamount'].setValue(0);
    }

    this.recalculateAll();
    this.tdsvalidation(on);
    this.formValidationMessages['pTdsSection'] = '';
    this.formValidationMessages['pTdsPercentage'] = '';
    this.GeneralReceiptForm.get('pTdsSection')?.markAsUntouched();
    this.GeneralReceiptForm.get('pTdsSection')?.markAsPristine();
    this.GeneralReceiptForm.get('pTdsPercentage')?.markAsUntouched();
    this.GeneralReceiptForm.get('pTdsPercentage')?.markAsPristine();
  }

  tdsSection_Change(event: any): void {
    const section = event?.pTdsSection;
    this.tdspercentagelist.set([]);
    this.GeneralReceiptForm.controls['pTdsPercentage'].setValue(null);
    this.GeneralReceiptForm.controls['ptdsamount'].setValue(0);
    if (section) {
      this.tdspercentagelist.set(this.tdslist().filter((r: any) => r.pTdsSection == section));
    }
    this.GetValidationByControl(this.GeneralReceiptForm, 'pTdsSection', true);
    this.recalculateAll();
  }

  tdsPercentage_Change(): void {
    this.recalculateAll();
    this.GetValidationByControl(this.GeneralReceiptForm, 'pTdsPercentage', true);
  }

  tdsvalidation(on: any): void {
    // this.formValidationMessages = {};
    this.formValidationMessages['pTdsSection'] = '';
    this.formValidationMessages['pTdsPercentage'] = '';
    const sec = this.GeneralReceiptForm.controls['pTdsSection'];
    const pct = this.GeneralReceiptForm.controls['pTdsPercentage'];
    if (on) {
      sec.setValidators(Validators.required);
      pct.setValidators([Validators.required, percentageValidator]);
    } else {
      sec.clearValidators();
      pct.clearValidators();
    }
    sec.updateValueAndValidity();
    pct.updateValueAndValidity();
  }

  addPaymentDetails(): void {
    const ledger = this.GeneralReceiptForm.get('preceiptslist.pledgerid');
    const amount = this.GeneralReceiptForm.get('preceiptslist.pactualpaidamount');

    ledger?.setValidators(Validators.required);
    amount?.setValidators([
      Validators.required,
      positiveAmountValidator,
      Validators.pattern(/^[0-9,]+(\.[0-9]{1,2})?$/)
    ]);
    ledger?.updateValueAndValidity();
    amount?.updateValueAndValidity();

    if (!this.addvalidations()) return;

    const accountHeadId = ledger?.value;
    const subId = this.GeneralReceiptForm.get('preceiptslist.psubledgerid')?.value;
    const paid = parseFloat(
      (this.cs.removeCommasInAmount(amount?.value) || 0).toString()
    );

    this.jvSvc.GetdebitchitCheckbalance(
      this.cs.getbranchname(), accountHeadId, 36, subId,
      this.cs.getschemaname(), this.cs.getCompanyCode(), this.cs.getBranchCode()
    ).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: any) => {
          const ok =
            result?.balancecheckstatus === true ||
            result?.balancecheckstatus === 'true';

          if (ok || paid >= 0) {
            const ctrl = this.GeneralReceiptForm.get('preceiptslist') as FormGroup;
            ctrl.patchValue({
              pCreatedby: this.cs.pCreatedby,
              pModifiedby: this.cs.pCreatedby
            });


            const rawForm = this.GeneralReceiptForm.getRawValue();
            const fv = ctrl.value; // preceiptslist values (none are disabled here)

            const pamount = parseFloat(
              (Number(this.cs.removeCommasInAmount(
                fv.pamount?.toString() || '0'
              ))).toFixed(2)
            );
            const pgst = parseFloat(
              (Number(this.cs.removeCommasInAmount(
                fv.pgstamount?.toString() || '0'
              ))).toFixed(2)
            );
            const ptotal = parseFloat((pamount + pgst).toFixed(2));



            const entry = {
              // ── Party fields — capture before clearPaymentDetails1() clears them ──
              ppartyid: this.GeneralReceiptForm.get('ppartyid')?.value || 0,
              ppartyname: this.GeneralReceiptForm.get('ppartyname')?.value || '',
              ppartypannumber: this.GeneralReceiptForm.get('ppartypannumber')?.value || '',
              ppartyreftype: this.GeneralReceiptForm.get('ppartyreftype')?.value || '',
              ppartyreferenceid: this.GeneralReceiptForm.get('ppartyreferenceid')?.value || '',

              // ── preceiptslist fields ──
              ...fv,
              pamount,
              pgstamount: pgst,
              ptotalamount: ptotal,
              pgstpercentage: Number(fv.pgstpercentage) || 0,
              pisgstapplicable: fv.pisgstapplicable === true,

              // ── TDS from root form ──
              pistdsapplicable: this.GeneralReceiptForm.get('pistdsapplicable')?.value,
              pTdsSection: this.GeneralReceiptForm.get('pTdsSection')?.value || '',
              pTdsPercentage: this._getTdsPercentageValue(),
              ptdsamountindividual: parseFloat(
                (Number(this.GeneralReceiptForm.get('ptdsamount')?.value) || 0).toFixed(2)
              ),

              // ── Bank fields from getRawValue — captures disabled controls ──
              pmodofreceipt: rawForm.pmodofreceipt || '',
              ptranstype: rawForm.ptranstype || '',
              ptypeofpayment: rawForm.ptypeofpayment || '',
              pbankid: rawForm.pbankid || 0,
              pbankname: rawForm.pbankname || '',
              pbranchname: rawForm.pbranchname || '',
              pAccountnumber: rawForm.pAccountnumber || '',
              pChequenumber: rawForm.pChequenumber || '',
              pchequedate: rawForm.pchequedate || '',
              pCardNumber: rawForm.pCardNumber || '',
              pdepositbankid: rawForm.pdepositbankid || 0,
              pdepositbankname: rawForm.pdepositbankname || '',
              pUpiname: rawForm.pUpiname || '',
              pUpiid: rawForm.pUpiid || '',
            };

            this.temporaryamount = parseFloat(
              (this.temporaryamount + entry.ptotalamount).toFixed(2)
            );
            this.paymentslist.update(list => [...list, entry]);
            this.gridshowhide.set(true);
            this.recalculateAll();
            this.getPaymentListColumnWisetotals();
            this.getpartyJournalEntryData();
            this.clearPaymentDetails1();
            this.formValidationMessages = {};
            this.submitted.set(false);
          } else {
            this.cs.showWarningMessage('Insufficient balance');
          }
        },
        error: err => this.cs.showErrorMessage(err)
      });
  }

  deleteRow(index: number): void {
    this.paymentslist.update(list => list.filter((_, i) => i !== index));
    if (this.paymentslist().length === 0) this.gridshowhide.set(false);
    this.getpartyJournalEntryData();
    this.getPaymentListColumnWisetotals();
  }


  addvalidations(): boolean {
    this.formValidationMessages = {};
    let isValid = true;

    if (!this.GeneralReceiptForm.get('ppartyid')?.value) {
      this.formValidationMessages['ppartyid'] = 'Party Is Required';
      isValid = false;
    }

    const fg = this.GeneralReceiptForm.controls['preceiptslist'] as FormGroup;
    const ledgerid = fg.controls['pledgerid'].value;
    const pactualpaidamount = fg.controls['pactualpaidamount'].value;
    const subledgerid = fg.controls['psubledgerid'].value;

    if (!ledgerid) {
      this.formValidationMessages['pledgerid'] = 'Ledger Is Required';
      fg.controls['pledgerid'].markAsTouched();
      isValid = false;
    }

    if (this.showsubledger() && !subledgerid) {
      this.formValidationMessages['psubledgerid'] = 'Sub Ledger Is Required';
      fg.controls['psubledgerid'].markAsTouched();
      isValid = false;
    }

    if (!pactualpaidamount || pactualpaidamount === '' || Number(pactualpaidamount) <= 0) {
      this.formValidationMessages['pactualpaidamount'] =
        'Amount Received Is Required And Must Be Greater Than 0';
      fg.controls['pactualpaidamount'].markAsTouched();
      isValid = false;
    }

    // ── GST validations  
    const isgst = fg.controls['pisgstapplicable']?.value;
    if (isgst) {
      if (!fg.controls['pStateId']?.value) {
        this.formValidationMessages['pStateId'] = 'State Is Required';
        fg.controls['pStateId']?.markAsTouched();
        isValid = false;
      }

      const gstPctVal = fg.controls['pgstpercentage']?.value;
      if (gstPctVal === null || gstPctVal === undefined || gstPctVal === '') {
        this.formValidationMessages['pgstpercentage'] = 'GST Percentage Is Required';
        fg.controls['pgstpercentage']?.markAsTouched();
        isValid = false;
      } else {
        this.formValidationMessages['pgstpercentage'] = '';
      }
    }

    // ── TDS validations 
    const istds = this.GeneralReceiptForm.get('pistdsapplicable')?.value;
    if (istds) {
      if (!this.GeneralReceiptForm.get('pTdsSection')?.value) {
        this.formValidationMessages['pTdsSection'] = 'Section Is Required';
        this.GeneralReceiptForm.get('pTdsSection')?.markAsTouched();
        isValid = false;
      }
      if (!this.GeneralReceiptForm.get('pTdsPercentage')?.value) {
        this.formValidationMessages['pTdsPercentage'] = 'Percentage Is Required';
        this.GeneralReceiptForm.get('pTdsPercentage')?.markAsTouched();
        isValid = false;
      }
    }

    if (isValid) {
      const dup = this.paymentslist().some(
        (g: any) => g.pledgerid == ledgerid && g.psubledgerid == subledgerid
      );
      if (dup) {
        this.cs.showWarningMessage('Ledger & Sub Ledger Already Exists');
        isValid = false;
      }
    }

    return isValid;
  }
  getPaymentListColumnWisetotals(): void {
    this.paymentlistcolumnwiselist = {
      ptotalamount: parseFloat(
        this.paymentslist().reduce((s: number, c: any) => s + (Number(c.ptotalamount) || 0), 0).toFixed(2)
      ),
      pamount: parseFloat(
        this.paymentslist().reduce((s: number, c: any) => s + (Number(c.pamount) || 0), 0).toFixed(2)
      ),
      pgstamount: parseFloat(
        this.paymentslist().reduce((s: number, c: any) => s + (Number(c.pgstamount) || 0), 0).toFixed(2)
      )
    };
  }

  getpartyJournalEntryData(): void {
    try {
      const list = this.paymentslist();
      if (!list.length) { this.partyjournalentrylist.set([]); return; }

      const entries: any[] = [];
      const uniqueLedgers = [...new Set(list.map((i: any) => i.pledgername).filter(Boolean))];

      uniqueLedgers.forEach(ledger => {
        const amt = list
          .filter((c: any) => c.pledgername === ledger)
          .reduce((s: number, c: any) => s + Number(this.cs.removeCommasInAmount(c.pamount || 0)), 0);
        if (amt > 0) {
          entries.push({ accountname: ledger, debitamount: parseFloat(amt.toFixed(2)), creditamount: '' });
        }
      });

      [
        { f: 'pigstamount', n: 'C-IGST' },
        { f: 'pcgstamount', n: 'C-CGST' },
        { f: 'psgstamount', n: 'C-SGST' },
        { f: 'putgstamount', n: 'C-UTGST' }
      ].forEach(({ f, n }) => {
        const amt = list.reduce(
          (s: number, c: any) => s + Number(this.cs.removeCommasInAmount(c[f] || 0)), 0
        );
        if (amt > 0) {
          entries.push({ accountname: n, debitamount: parseFloat(amt.toFixed(2)), creditamount: '' });
        }
      });

      const total = list.reduce(
        (s: number, c: any) => s + Number(this.cs.removeCommasInAmount(c.ptotalamount || 0)), 0
      );
      if (total > 0) {
        this.GeneralReceiptForm.controls['ptotalreceivedamount'].setValue(parseFloat(total.toFixed(2)));
        const acc = this.GeneralReceiptForm.controls['pmodofreceipt']?.value === 'CASH'
          ? 'CASH ON HAND'
          : 'BANK';
        entries.push({ accountname: acc, debitamount: '', creditamount: parseFloat(total.toFixed(2)) });
      }

      this.partyjournalentrylist.set(entries);
    } catch (e) {
      this.cs.showErrorMessage(e);
    }
  }
  clearPaymentDetails(): void {
    const ctrl = this.GeneralReceiptForm.get('preceiptslist') as FormGroup;
    ctrl.reset();
    ctrl.patchValue({
      pisgstapplicable: false,
      pStatusname: this.cs.pStatusname,
      pgstcalculationtype: 'INCLUDE'
    });
    this.showgst.set(false);
    this._resetGstFlags();
    this.showtds.set(false);
    this.GeneralReceiptForm.controls['pistdsapplicable'].setValue(false);
    this.tdsvalidation(false);
    this.showsubledger.set(true);
    this.subledgeraccountslist.set([]);
    this.ledgerBalance.set(`${this.currencySymbol} 0 Dr`);
    this.subledgerBalance.set(`${this.currencySymbol} 0 Dr`);
    this.formValidationMessages = {};
    this.gstPercentageSelected = false;
  }

  clearParty(): void {
    this.GeneralReceiptForm.get('ppartyid')?.reset(null);
    this.GeneralReceiptForm.get('ppartyname')?.reset('');
    this.partyBalance.set(`${this.currencySymbol} 0 Dr`);
    this._selectedPartyStateName = '';
    this.statelist.set([]);
    this.tdssectionlist.set([]);
    this.tdspercentagelist.set([]);
    this.availableAmount = 0;
  }

  clearPaymentDetails1(): void {
    const ctrl = this.GeneralReceiptForm.get('preceiptslist') as FormGroup;

    const currentNarration = this.GeneralReceiptForm.get('pnarration')?.value;
    const currentMode = this.GeneralReceiptForm.get('pmodofreceipt')?.value;
    const currentTranstype = this.GeneralReceiptForm.get('ptranstype')?.value;
    const currentBankId = this.GeneralReceiptForm.get('pbankid')?.value;
    const currentBranchName = this.GeneralReceiptForm.get('pbranchname')?.value;
    const currentAccountNumber = this.GeneralReceiptForm.get('pAccountnumber')?.value;
    const currentChequeNumber = this.GeneralReceiptForm.getRawValue().pChequenumber;
    const currentChequeDate = this.GeneralReceiptForm.get('pchequedate')?.value;
    const currentTypeofPayment = this.GeneralReceiptForm.get('ptypeofpayment')?.value;
    const currentCardNumber = this.GeneralReceiptForm.get('pCardNumber')?.value;
    const currentBankName = this.GeneralReceiptForm.get('pbankname')?.value;
    const currentDepositBankId = this.GeneralReceiptForm.get('pdepositbankid')?.value;
    const currentDepositBankName = this.GeneralReceiptForm.get('pdepositbankname')?.value;
    const currentUpiName = this.GeneralReceiptForm.get('pUpiname')?.value;
    const currentUpiId = this.GeneralReceiptForm.get('pUpiid')?.value;

    ctrl.reset();
    ctrl.markAsUntouched();
    ctrl.markAsPristine();

    ctrl.patchValue({
      pisgstapplicable: false,
      pStatusname: this.cs.pStatusname,
      pgstcalculationtype: 'INCLUDE'
    });

    // ── Clear party completely after add  
    const partyCtrl = this.GeneralReceiptForm.get('ppartyid');
    partyCtrl?.clearValidators();
    partyCtrl?.setValue(null, { emitEvent: false });
    partyCtrl?.markAsUntouched();
    partyCtrl?.markAsPristine();
    partyCtrl?.updateValueAndValidity({ emitEvent: false });

    this.GeneralReceiptForm.get('ppartyname')?.setValue('', { emitEvent: false });
    this.partyBalance.set(`${this.currencySymbol} 0 Dr`);
    this._selectedPartyStateName = '';
    this.statelist.set([]);
    this.tdssectionlist.set([]);
    this.tdspercentagelist.set([]);
    this.availableAmount = 0;

    // ── Restore narration  
    this.GeneralReceiptForm.get('pnarration')?.setValue(currentNarration, { emitEvent: false });

    // ── Restore mode of receipt  
    this.GeneralReceiptForm.get('pmodofreceipt')?.setValue(currentMode, { emitEvent: false });

    // ── Restore bank fields  
    this.GeneralReceiptForm.get('ptranstype')?.setValue(currentTranstype, { emitEvent: false });
    this.GeneralReceiptForm.get('pbankid')?.setValue(currentBankId, { emitEvent: false });
    this.GeneralReceiptForm.get('pbranchname')?.setValue(currentBranchName, { emitEvent: false });
    this.GeneralReceiptForm.get('pAccountnumber')?.setValue(currentAccountNumber, { emitEvent: false });
    this.GeneralReceiptForm.get('pChequenumber')?.setValue(currentChequeNumber, { emitEvent: false });
    this.GeneralReceiptForm.get('pchequedate')?.setValue(currentChequeDate, { emitEvent: false });
    this.GeneralReceiptForm.get('ptypeofpayment')?.setValue(currentTypeofPayment, { emitEvent: false });
    this.GeneralReceiptForm.get('pCardNumber')?.setValue(currentCardNumber, { emitEvent: false });
    this.GeneralReceiptForm.get('pbankname')?.setValue(currentBankName, { emitEvent: false });
    this.GeneralReceiptForm.get('pdepositbankid')?.setValue(currentDepositBankId, { emitEvent: false });
    this.GeneralReceiptForm.get('pdepositbankname')?.setValue(currentDepositBankName, { emitEvent: false });
    this.GeneralReceiptForm.get('pUpiname')?.setValue(currentUpiName, { emitEvent: false });
    this.GeneralReceiptForm.get('pUpiid')?.setValue(currentUpiId, { emitEvent: false });

    // ── Reset TDS root fields  
    this.GeneralReceiptForm.patchValue({
      pistdsapplicable: false,
      pTdsSection: '',
      pTdsPercentage: '',
      ptdsamount: 0
    }, { emitEvent: false });

    // ── Clear validators on receipt line fields 
    ctrl.get('pactualpaidamount')?.clearValidators();
    ctrl.get('pactualpaidamount')?.updateValueAndValidity();
    ctrl.get('psubledgerid')?.clearValidators();
    ctrl.get('psubledgerid')?.updateValueAndValidity();
    ctrl.get('pledgerid')?.clearValidators();
    ctrl.get('pledgerid')?.updateValueAndValidity();

    // ── Reset receipt line UI state  
    this.showtds.set(false);
    this.showgst.set(false);
    this._resetGstFlags();
    this.subledgeraccountslist.set([]);
    this.showsubledger.set(true);
    this.ledgerBalance.set(`${this.currencySymbol} 0 Dr`);
    this.subledgerBalance.set(`${this.currencySymbol} 0 Dr`);
    this.formValidationMessages = {};
    this.gstPercentageSelected = false;

    // ── Final safety — clear party message and state after all cycles 
    // ── Final safety — clear party message and state after all cycles  
    setTimeout(() => {
      this.formValidationMessages['ppartyid'] = '';
      this.GeneralReceiptForm.get('ppartyid')?.markAsUntouched();
      this.GeneralReceiptForm.get('ppartyid')?.markAsPristine();
      // ── Restore required validator for next entry  
      this.GeneralReceiptForm.get('ppartyid')?.setValidators(Validators.required);
      this.GeneralReceiptForm.get('ppartyid')?.updateValueAndValidity({ emitEvent: false });
    }, 0);
  }

  BankIdChange($event: any): void {
    this._loadBankNtList();
    this.GeneralReceiptForm.get('pbankid')?.markAsTouched();
    this.GetValidationByControl(this.GeneralReceiptForm, 'pbankid', true);

    if (!$event && $event !== 0) {
      this.GeneralReceiptForm.controls['pbranchname'].setValue('');
      this.setBalances('BANKBOOK', 0);
      this.setBalances('PASSBOOK', 0);
      return;
    }

    const id = typeof $event === 'object'
      ? ($event.pbankid ?? $event.pBankId ?? $event.bankid ?? $event.id)
      : $event;
    const bank = (this.banklist1() || []).find((b: any) => b.pbankid == id || b.pBankId == id);
    if (bank) {
      this.setBalances('BANKBOOK', Number(bank.pbankbalance) || 0);
      this.setBalances('PASSBOOK', Number(bank.pbankpassbookbalance) || 0);
    }
    this.getBankBranchName(id);
    this.GeneralReceiptForm.get('pbranchname')?.reset();
    this.checkDepositBankEnable();
  }

  getBankBranchName(id: any): void {
    if (!id) { this.GeneralReceiptForm.controls['pbranchname'].setValue(''); return; }
    const bank = this.banklist().find(
      (b: any) => b.pbankid == id || b.pBankId == id || b.bankid == id || b.id == id
    );
    if (!bank) { this.GeneralReceiptForm.controls['pbranchname'].setValue(''); return; }
    this.GeneralReceiptForm.controls['pbranchname'].setValue(bank.pbranchname || bank.pBranchName || '');
    const bb = bank.pbankbalance ?? bank.pBankBalance ?? null;
    const pb = bank.pbankpassbookbalance ?? bank.pBankPassbookBalance ?? null;
    this.setBalances('BANKBOOK', bb !== null && !isNaN(Number(bb)) ? Math.round(Number(bb)) : 0);
    this.setBalances('PASSBOOK', pb !== null && !isNaN(Number(pb)) ? Math.round(Number(pb)) : 0);
  }



  typeofDepositBank($event: any): void {
    if (!$event) {
      this._depositBankId = null;
      this.formValidationMessages['pdepositbankid'] = 'Please Select Deposited Bank Name';
      return;
    }

    const id = typeof $event === 'object'
      ? ($event.pbankId ?? $event.pbankid ?? $event.pBankId)
      : $event;

    this._depositBankId = id;

    const obj = [...(this.banklist1() || []), ...(this.banklist() || [])]
      .find((b: any) => b.pbankId == id || b.pbankid == id || b.pBankId == id);

    if (obj) {
      this.GeneralReceiptForm.controls['pdepositbankname'].setValue(
        obj.pbankname || obj.pBankName || ''
      );
      const bb = obj.pbankbalance ?? obj.pBankBalance ?? null;
      const pb = obj.pbankpassbookbalance ?? obj.pBankPassbookBalance ?? null;
      this.setBalances('BANKBOOK', bb !== null && !isNaN(Number(bb)) ? Math.round(Number(bb)) : 0);
      this.setBalances('PASSBOOK', pb !== null && !isNaN(Number(pb)) ? Math.round(Number(pb)) : 0);
    }

    // value selected — always clear error
    this.formValidationMessages['pdepositbankid'] = '';
    setTimeout(() => {
      this.formValidationMessages['pdepositbankid'] = '';
    }, 0);
  }


  onDepositBankClose(): void {
    const v = this.GeneralReceiptForm.getRawValue().pdepositbankid;
    if (!v || v === '' || v === 0) {
      this.formValidationMessages['pdepositbankid'] = 'Please Select Deposited Bank Name';
    }

  }

  typeofPaymentChange(args: any): void {
    this.GetValidationByControl(this.GeneralReceiptForm, 'ptypeofpayment', true);
    const type = typeof args === 'object'
      ? args?.ptypeofpayment
      : (typeof args === 'string' ? args : '');

    if (!this.Transtype) return;

    // this.GeneralReceiptForm.controls['pdepositbankid'].setValue(null);
    this.GeneralReceiptForm.controls['pdepositbankname'].setValue('');
    this.formValidationMessages['pdepositbankid'] = '';
    this.showupi.set(false);
    this.upinameslist.set([]);
    this.GeneralReceiptForm.get('pUpiname')?.setValue('');
    this.GeneralReceiptForm.get('pUpiid')?.setValue('');

    const upi = this.GeneralReceiptForm.controls['pUpiname'];
    upi.clearValidators();
    upi.updateValueAndValidity();

    if (this.Transtype.toUpperCase() === 'ONLINE') {
      this.toggleReferenceNo(type);
      if (type.toUpperCase() === 'UPI') {
        this.showupi.set(true);
        this.svc.GetBankUPIDetails(
          this.cs.getschemaname(), this.cs.getBranchCode(), this.cs.getCompanyCode()
        ).pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (json: any) => { if (json) this.upinameslist.set(json); },
            error: err => this.cs.showErrorMessage(err)
          });
        upi.setValidators(Validators.required);
        upi.updateValueAndValidity();
      }
    }
    this.validation(this.Transtype);
    this.checkDepositBankEnable();
  }


  // ── Validation  
  validation(type: string): void {
    // this.formValidationMessages = {};
    const cheque = this.GeneralReceiptForm.controls['pChequenumber'];
    const chequeDate = this.GeneralReceiptForm.controls['pchequedate'];
    const payType = this.GeneralReceiptForm.controls['ptypeofpayment'];
    const bank = this.GeneralReceiptForm.controls['pbankid'];
    const card = this.GeneralReceiptForm.controls['pCardNumber'];
    const deposit = this.GeneralReceiptForm.controls['pdepositbankid'];
    const account = this.GeneralReceiptForm.controls['pAccountnumber'];
    const branch = this.GeneralReceiptForm.controls['pbranchname'];

    deposit.clearValidators();
    deposit.updateValueAndValidity();
    cheque.setValidators([Validators.required, alphanumericValidator]);
    payType.setValidators(Validators.required);

    if (type === 'Online' || type === 'Cheque') {
      chequeDate.setValidators(Validators.required);
      bank.setValidators(Validators.required);
      card.clearValidators();
    } else {
      chequeDate.clearValidators();
      bank.clearValidators();
      card.setValidators([Validators.required, cardNumberValidator]);
    }

    if (type === 'Cheque') {
      account.setValidators([
        Validators.required, digitsOnlyValidator,
        Validators.minLength(9), Validators.maxLength(20)
      ]);
      branch.setValidators([
        Validators.required,
        Validators.pattern(/^[A-Za-z ]+$/),
        Validators.maxLength(30)
      ]);
    } else {
      account.clearValidators();
      branch.clearValidators();
    }

    if (cheque.value?.toString().trim()) deposit.setValidators(Validators.required);

    [account, chequeDate, cheque, payType, bank, card, deposit, branch]
      .forEach(c => c.updateValueAndValidity());
  }


  // ── Input helpers  
  numberOnly(event: KeyboardEvent): boolean {
    const cc = event.which || event.keyCode;
    if (cc < 48 || cc > 57) { event.preventDefault(); return false; }
    return true;
  }

  allowDigitsOnly(event: KeyboardEvent): boolean {
    const cc = event.which || event.keyCode;
    if ((cc >= 48 && cc <= 57) || [8, 9, 37, 39, 46].includes(cc)) return true;
    event.preventDefault();
    return false;
  }

  allowAlphabetsOnly(event: KeyboardEvent): boolean {
    const cc = event.which || event.keyCode;
    if ((cc >= 65 && cc <= 90) || (cc >= 97 && cc <= 122) || [32, 8, 9, 37, 39].includes(cc)) return true;
    event.preventDefault();
    return false;
  }


  branchNameChange(event: any): void {
    let v = event.target.value.replace(/[^a-zA-Z ]/g, '').substring(0, 40);
    v = v.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
    this.GeneralReceiptForm.get('pbranchname')?.setValue(v, { emitEvent: false });
    this.GeneralReceiptForm.get('pbranchname')?.markAsTouched();
    if (!v || v.trim() === '') {
      this.formValidationMessages['pbranchname'] = 'Please Enter Branch Name';
    } else {
      this.formValidationMessages['pbranchname'] = '';
    }
  }


  pAccountnumber_change(): void {
    const ctrl = this.GeneralReceiptForm.get('pAccountnumber');
    if (ctrl?.value) {
      ctrl.setValue(ctrl.value.toString().replace(/\D/g, '').substring(0, 40), { emitEvent: false });
    }
    ctrl?.markAsTouched();
    this.GetValidationByControl(this.GeneralReceiptForm, 'pAccountnumber', true);
    if (!ctrl?.value || ctrl.value.toString().trim() === '') {
      this.formValidationMessages['pAccountnumber'] = 'Please Enter Account Number';
    } else {
      this.formValidationMessages['pAccountnumber'] = '';
    }
  }


  BankNameChange(): void {
    const ctrl = this.GeneralReceiptForm.get('pbankname');
    if (ctrl?.value) {
      ctrl.setValue(ctrl.value.toString().replace(/[^a-zA-Z\s]/g, '').substring(0, 40), { emitEvent: false });
    }
    ctrl?.markAsTouched();
    this.GetValidationByControl(this.GeneralReceiptForm, 'pbankname', true);
    if (this.Transtype === 'Credit Card') {
      if (!ctrl?.value || ctrl.value.toString().trim() === '') {
        this.formValidationMessages['pbankname'] = 'Bank / Financial Services Is Required';
      } else {
        this.formValidationMessages['pbankname'] = '';
      }
    }
  }
  ChequeNoChange(): void {
    const ctrl = this.GeneralReceiptForm.get('pChequenumber');
    if (ctrl?.value) {
      ctrl.setValue(ctrl.value.toString().replace(/\D/g, '').substring(0, 40), { emitEvent: false });
    }
    ctrl?.markAsTouched();
    this.GetValidationByControl(this.GeneralReceiptForm, 'pChequenumber', true);
    const val = this.GeneralReceiptForm.getRawValue().pChequenumber;
    if (!val || val.toString().trim() === '') {
      this.formValidationMessages['pChequenumber'] = this.Transtype === 'Cheque'
        ? 'Cheque Number Is Required'
        : 'Reference No Is Required';
    } else {
      this.formValidationMessages['pChequenumber'] = '';
    }
  }

  ChequeDateChange(): void {
    this.GeneralReceiptForm.get('pchequedate')?.markAsTouched();
    this.GetValidationByControl(this.GeneralReceiptForm, 'pchequedate', true);
  }

  onChequeDateChange(date: Date): void {
    this.chequeDateValue = date;
    this.GeneralReceiptForm.controls['pchequedate'].setValue(date);
    this.ChequeDateChange();
  }

  CardNoChange(): void {
    const ctrl = this.GeneralReceiptForm.get('pCardNumber');
    if (ctrl?.value) {
      ctrl.setValue(ctrl.value.toString().replace(/\D/g, '').substring(0, 16), { emitEvent: false });
    }
    ctrl?.markAsTouched();
    this.GetValidationByControl(this.GeneralReceiptForm, 'pCardNumber', true);
    const val = ctrl?.value;
    if (!val || val.toString().trim() === '') {
      this.formValidationMessages['pCardNumber'] = 'Card Number Is Required';
    } else if (val.toString().length !== 16) {
      this.formValidationMessages['pCardNumber'] = 'Card Number Must Be 16 Digits';
    } else {
      this.formValidationMessages['pCardNumber'] = '';
    }
  }

  gstno_change(): void {
    this.GetValidationByControl(this.GeneralReceiptForm, 'pgstno', true);
  }

  focusNext(name: string): void {
    setTimeout(() =>
      (document.querySelector(`[formControlName="${name}"]`) as HTMLElement)?.focus(), 100
    );
  }

  trackByFn(index: number, item: any): any {
    return item?.pBankId || index;
  }

  getStateName(s: any): string {
    return s.pState || s.pStatename || s.stateName || '';
  }



  saveGeneralReceipt(): void {
    debugger

    this.submitted.set(true);
    this.showCashWarning.set(false);
    this.cashWarningMessage.set('');
    this.formValidationMessages = {};

    let hasError = false;

    //   if (this.paymentslist().length === 0) {
    //     if (!this.GeneralReceiptForm.get('ppartyid')?.value) {
    //       this.formValidationMessages['ppartyid'] = 'Party Is Required';
    //       hasError = true;
    //     }
    //   } else {
    //   // ── Grid has items — clear party validation completely ──
    //   this.GeneralReceiptForm.get('ppartyid')?.markAsUntouched();
    //   this.GeneralReceiptForm.get('ppartyid')?.markAsPristine();
    //   this.GeneralReceiptForm.get('ppartyid')?.clearValidators();
    //   this.GeneralReceiptForm.get('ppartyid')?.updateValueAndValidity();
    //   this.formValidationMessages['ppartyid'] = '';
    // }
    if (this.paymentslist().length === 0) {
      if (!this.GeneralReceiptForm.get('ppartyid')?.value) {
        this.formValidationMessages['ppartyid'] = 'Party Is Required';
        hasError = true;
      }
    } else {
      this.formValidationMessages['ppartyid'] = '';
    }

    // ── Bank mode validations — only for current active tab  
    if (this.bankshowhide()) {

      if (!this.GeneralReceiptForm.get('ptranstype')?.value) {
        this.formValidationMessages['ptranstype'] = 'Transaction Type Is Required';
        hasError = true;
      }

      if (this.Transtype === 'Cheque') {
        if (!this.GeneralReceiptForm.get('pbankid')?.value) {
          this.formValidationMessages['pbankid'] = 'Please Select Bank Name';
          hasError = true;
        }
        if (!this.GeneralReceiptForm.get('pbranchname')?.value?.toString().trim()) {
          this.formValidationMessages['pbranchname'] = 'Please Enter Branch Name';
          hasError = true;
        }
        if (!this.GeneralReceiptForm.get('pAccountnumber')?.value?.toString().trim()) {
          this.formValidationMessages['pAccountnumber'] = 'Please Enter Account Number';
          hasError = true;
        }
        const chequeVal = this.GeneralReceiptForm.getRawValue().pChequenumber;
        if (!chequeVal || chequeVal.toString().trim() === '') {
          this.formValidationMessages['pChequenumber'] = 'Cheque Number Is Required';
          hasError = true;
        }
        if (!this.GeneralReceiptForm.get('pchequedate')?.value) {
          this.formValidationMessages['pchequedate'] = 'Please Select Cheque Date';
          hasError = true;
        }


      } else if (this.Transtype === 'Online') {
        if (!this.GeneralReceiptForm.get('pbankid')?.value) {
          this.formValidationMessages['pbankid'] = 'Please Select Bank Name';
          hasError = true;
        }
        if (!this.GeneralReceiptForm.get('ptypeofpayment')?.value) {
          this.formValidationMessages['ptypeofpayment'] = 'Type Of Payment Is Required';
          hasError = true;
        }
        const refVal = this.GeneralReceiptForm.getRawValue().pChequenumber;
        if (!refVal || refVal.toString().trim() === '') {
          this.formValidationMessages['pChequenumber'] = 'Reference No Is Required';
          hasError = true;
        }
        const depositVal = this._depositBankId;
        if (!depositVal || depositVal === '' || depositVal === 0) {
          this.formValidationMessages['pdepositbankid'] = 'Please Select Deposited Bank Name';
          hasError = true;
        }

      } else if (this.Transtype === 'Debit Card') {
        const cardVal = this.GeneralReceiptForm.get('pCardNumber')?.value;
        if (!cardVal || cardVal.toString().trim() === '') {
          this.formValidationMessages['pCardNumber'] = 'Card Number Is Required';
          hasError = true;
        } else if (cardVal.toString().length !== 16) {
          this.formValidationMessages['pCardNumber'] = 'Card Number Must Be 16 Digits';
          hasError = true;
        }
        const refVal = this.GeneralReceiptForm.getRawValue().pChequenumber;
        if (!refVal || refVal.toString().trim() === '') {
          this.formValidationMessages['pChequenumber'] = 'Reference No Is Required';
          hasError = true;
        }
        const depositVal = this._depositBankId;
        if (!depositVal || depositVal === '' || depositVal === 0) {
          this.formValidationMessages['pdepositbankid'] = 'Please Select Deposited Bank Name';
          hasError = true;
        }

      } else if (this.Transtype === 'Credit Card') {
        const cardVal = this.GeneralReceiptForm.get('pCardNumber')?.value;
        if (!cardVal || cardVal.toString().trim() === '') {
          this.formValidationMessages['pCardNumber'] = 'Card Number Is Required';
          hasError = true;
        } else if (cardVal.toString().length !== 16) {
          this.formValidationMessages['pCardNumber'] = 'Card Number Must Be 16 Digits';
          hasError = true;
        }
        if (!this.GeneralReceiptForm.get('pbankname')?.value?.toString().trim()) {
          this.formValidationMessages['pbankname'] = 'Bank / Financial Services Is Required';
          hasError = true;
        }
        const refVal = this.GeneralReceiptForm.getRawValue().pChequenumber;
        if (!refVal || refVal.toString().trim() === '') {
          this.formValidationMessages['pChequenumber'] = 'Reference No Is Required';
          hasError = true;
        }
        const depositVal = this._depositBankId;
        if (!depositVal || depositVal === '' || depositVal === 0) {
          this.formValidationMessages['pdepositbankid'] = 'Please Select Deposited Bank Name';
          hasError = true;
        }
      }
    }

    // ── Ledger / SubLedger / Amount — only validate if no payments added yet  
    const fg = this.GeneralReceiptForm.get('preceiptslist') as FormGroup;
    if (this.paymentslist().length === 0) {
      if (!fg.get('pledgerid')?.value) {
        this.formValidationMessages['pledgerid'] = 'Ledger Is Required';
        fg.get('pledgerid')?.markAsTouched();
        hasError = true;
      }

      if (this.showsubledger() && !fg.get('psubledgerid')?.value) {
        this.formValidationMessages['psubledgerid'] = 'Sub Ledger Is Required';
        fg.get('psubledgerid')?.markAsTouched();
        hasError = true;
      }

      const amt = fg.get('pactualpaidamount')?.value;
      if (!amt || Number(amt) <= 0) {
        this.formValidationMessages['pactualpaidamount'] =
          'Amount Received Is Required And Must Be Greater Than 0';
        fg.get('pactualpaidamount')?.markAsTouched();
        hasError = true;
      }
    }

    // ── Narration  
    const narrationVal = this.GeneralReceiptForm.get('pnarration')?.value;
    if (!narrationVal || !narrationVal.toString().trim()) {
      this.formValidationMessages['pnarration'] = 'Narration Is Required';
      this.GeneralReceiptForm.get('pnarration')?.markAsTouched();
      hasError = true;
    }

    // ── Payments list  
    if (this.paymentslist().length === 0) {
      this.cs.showWarningMessage('Please add at least one payment detail');
      return;
    }

    // ── Stop here if any validation failed 
    if (hasError) return;

    // ── Cash limit check 
    if (this.GeneralReceiptForm.get('pmodofreceipt')?.value?.toUpperCase() === 'CASH') {
      const total = this.paymentslist().reduce(
        (s: number, i: any) => s + (parseFloat(i.ptotalamount?.toString() || '0') || 0), 0
      );
      if (total >= this.CASH_TRANSACTION_LIMIT) {
        this.cashWarningMessage.set(
          `Cash transactions limit below ₹2,00,000.00. Available Amount ₹2,00,000.00 only for this Party`
        );
        this.showCashWarning.set(true);
        setTimeout(() => {
          this.showCashWarning.set(false);
          this.cashWarningMessage.set('');
        }, 5000);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }


    const chequeDate = this.datepipe.transform(
      this.chequeDateValue, 'dd-MM-yyyy'
    );
    this.disablesavebutton.set(true);
    this.savebutton.set('Processing');

    const accountIds = this.paymentslist()
      .map((x: any) => x.psubledgerid)
      .filter(Boolean)
      .join(',');

    const trans_date = this.cs.getFormatDateNormal(
      this.GeneralReceiptForm.controls['preceiptdate'].value
    );

    this.svc.GetCashAmountAccountWise(
      'GENERAL RECEIPT', this.cs.getbranchname(), accountIds, trans_date,
      this.cs.getschemaname(), this.cs.getCompanyCode(), this.cs.getBranchCode()
    ).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: any[]) => {
          if (!confirm('Do You Want to Save ?')) {
            this.disablesavebutton.set(false);
            this.savebutton.set('Save');
            return;
          }

          const totalamount = parseFloat(
            (this.cs.removeCommasInAmount(
              this.paymentlistcolumnwiselist?.ptotalamount || 0
            )).toString()
          );

          const rawForm = this.GeneralReceiptForm.getRawValue();
          const depositBankId = this._depositBankId ?? rawForm.pdepositbankid ?? 0;
          const chequeNumber = rawForm.pChequenumber || '';
          const payments = this.paymentslist();


          const payload: any = {
            preceiptid: '',
            preceiptno: 'string',
            pRecordid: 0,
            ptypeofoperation: 'CREATE',
            formname: 'General Receipt',
            preceiptdate: trans_date,

            pmodofreceipt: this.GeneralReceiptForm.value.pmodofreceipt || '',
            ptranstype: this.GeneralReceiptForm.value.ptranstype || '',
            ptypeofpayment: this.GeneralReceiptForm.value.ptypeofpayment || '',

            pbankid: this.GeneralReceiptForm.value.pbankid || 0,
            pBankName: this.GeneralReceiptForm.value.pbankname || '',
            pbranchname: this.GeneralReceiptForm.value.pbranchname || '',
            pAccountnumber: this.GeneralReceiptForm.value.pAccountnumber || '',
            pChequenumber: chequeNumber,
            pchequedate: chequeDate || '',
            pchequedepositdate: '',
            pchequecleardate: '',
            pCardNumber: this.GeneralReceiptForm.value.pCardNumber || '',
            pdepositbankid: depositBankId,
            pdepositbankname: this.GeneralReceiptForm.value.pdepositbankname || '',
            pUpiname: this.GeneralReceiptForm.value.pUpiname || '',
            pUpiid: this.GeneralReceiptForm.value.pUpiid || '',
            pBankconfigurationId: '',

            ppartyid:
              this.GeneralReceiptForm.value.ppartyid ||
              this.paymentslist()[0]?.ppartyid ||
              0,

            ppartyname:
              this.GeneralReceiptForm.value.ppartyname ||
              this.paymentslist()[0]?.ppartyname ||
              '',

            ppartypannumber:
              this.GeneralReceiptForm.value.ppartypannumber ||
              this.paymentslist()[0]?.ppartypannumber ||
              '',

            ppartyreftype:
              this.GeneralReceiptForm.value.ppartyreftype ||
              this.paymentslist()[0]?.ppartyreftype ||
              '',

            ppartyreferenceid:
              this.GeneralReceiptForm.value.ppartyreferenceid ||
              this.paymentslist()[0]?.ppartyreferenceid ||
              '',

            ptotalreceivedamount: totalamount || 0,

            pistdsapplicable: payments.some(
              (x: any) => x.pistdsapplicable === true
            ),

            pTdsSection: payments[0]?.pTdsSection || 0,
            pTdsSectionId: payments[0]?.pTdsSection || 0,
            pTdsPercentage: payments[0]?.pTdsPercentage || 0,
            ptdsamount: payments[0]?.ptdsamountindividual || 0,
            ptdscalculationtype: '',
            ptdsaccountid: 0,

            pnarration: this.GeneralReceiptForm.value.pnarration || '',

            pFilename: this.uploadedFileName() || '',
            pFilepath: this.uploadedFilePath() || '',
            pFileformat: this.uploadedFileFormat() || '',
            pDocStorePath: '',

            global_schema: this.cs.getschemaname(),
            branch_schema: this.cs.getbranchname(),
            companycode: this.cs.getCompanyCode(),
            branchcode: this.cs.getBranchCode(),
            branchid: this.cs.getbrachid() || 1,
            schemaname: this.cs.getschemaname(),
            pCreatedby: this.cs.getCreatedBy() || 0,
            pModifiedby: 0,

            pStatusid: '',
            pStatusname: '',
            pEffectfromdate: '',
            pEffecttodate: '',
            pipaddress: '',
            pdepositeddate: '',
            pCleardate: '',
            preceiptrecordid: 0,
            groupcode: '',
            pchequestatus: this.GeneralReceiptForm.value.pchequestatus || '',
            preferencetext: '',
            chitpaymentid: 0,
            adjustmentid: 0,
            challanaNo: '',

            preceiptslist: payments.map((x: any) => {

              //  GST 
              const totalGST = Number(x.pgstamount) || 0;

              let cgstAmount = 0;
              let sgstAmount = 0;

              if (x.pgsttype?.includes('CGST') && x.pgsttype?.includes('SGST')) {

                // split without rounding issue
                cgstAmount = Math.floor(totalGST / 2);
                sgstAmount = totalGST - cgstAmount;
              }

              return {

                pledgerid: x.pledgerid || 0,
                pledgername: x.pledgername || '',

                psubledgerid: x.psubledgerid || 0,
                psubledgername: x.psubledgername || '',

                pactualpaidamount: parseFloat(
                  (Number(x.pactualpaidamount) || 0).toFixed(2)
                ),

                pamount: parseFloat(
                  (
                    Number(
                      this.cs.removeCommasInAmount(
                        x.pamount?.toString() || '0'
                      )
                    )
                  ).toFixed(2)
                ),

                pisgstapplicable: x.pisgstapplicable || false,

                pgstcalculationtype:
                  x.pgstcalculationtype || 'INCLUDE',

                pgsttype: x.pgsttype || '',

                pgstpercentage: x.pgstpercentage || 0,

                pgstamount: parseFloat(totalGST.toFixed(2)),

                pigstpercentage: x.pigstpercentage || 0,

                pigstamount: parseFloat(
                  (Number(x.pigstamount) || 0).toFixed(2)
                ),

                //  FIXED GST SPLIT
                pcgstpercentage: x.pcgstpercentage || 0,

                pcgstamount: parseFloat(
                  cgstAmount.toFixed(2)
                ),

                psgstpercentage: x.psgstpercentage || 0,

                psgstamount: parseFloat(
                  sgstAmount.toFixed(2)
                ),

                putgstpercentage: x.putgstpercentage || 0,

                putgstamount: parseFloat(
                  (Number(x.putgstamount) || 0).toFixed(2)
                ),

                pState: x.pState || '',
                pStateId: x.pStateId || 0,
                pgstno: x.pgstno || '',

                pistdsapplicable:
                  x.pistdsapplicable || false,

                pTdsSection: x.pTdsSection || '',

                pTdsPercentage:
                  Number(x.pTdsPercentage) || 0,

                ptdsamountindividual: parseFloat(
                  (
                    (
                      Math.round(Number(x.pamount)) *
                      (Number(x.pTdsPercentage) || 0)
                    ) / 100
                  ).toFixed(2)
                ),

                ptotalamount: parseFloat(
                  (Number(x.ptotalamount) || 0).toFixed(2)
                ),

                id: x.id || 0,
                text: x.text || '',
                ptranstype: x.ptranstype || '',
                accountbalance: x.accountbalance || '',
                pAccounttype: x.pAccounttype || '',
                legalcellReceipt: x.legalcellReceipt || '',
                pbranchcode: x.pbranchcode || '',
                pbranchtype: x.pbranchtype || '',
                groupcode: x.groupcode || '',
                chitgroupid: x.chitgroupid || '',
                preferencetext: x.preferencetext || ''
              };
            })
          };
          this.svc.saveGeneralReceipt(payload)
            .subscribe({
              next: (res: any) => {
                console.log('Save response:', res);
                if (res?.success) {
                  this.cs.showSuccessMessage();
                  this.ClearGenerealReceipt();
                  // this.router.navigate([
                  //   '/general-receipt',
                  //   btoa(`${res.receipt_number},General Receipt`)
                  // ]);



                  const receipt = btoa(res.receipt_number + ',' + 'General Receipt');
                  const url = this.router.serializeUrl(
                    this.router.createUrlTree(['/general-receipt', receipt])
                  );
                  window.open(url, '_blank');


                }
                this.disablesavebutton.set(false);
                this.savebutton.set('Save');
              },
              error: (err: any) => {
                this.cs.showErrorMessage(err);
                this.disablesavebutton.set(false);
                this.savebutton.set('Save');
              }
            });
        },
        error: (err: any) => {
          this.cs.showErrorMessage(err);
          this.disablesavebutton.set(false);
          this.savebutton.set('Save');
        }
      });
  }

  dismissCashWarning(): void {
    this.showCashWarning.set(false);
    this.cashWarningMessage.set('');
  }

  ClearGenerealReceipt(): void {
    this.GeneralReceiptForm.controls['pmodofreceipt'].setValue('CASH');
    this.Paymenttype('Cash');


    ['ppartyid', 'ppartyname', 'pnarration', 'pFilename', 'pFileformat', 'pFilepath'].forEach(f => {
      const ctrl = this.GeneralReceiptForm.controls[f];
      ctrl?.setValue(f === 'ppartyid' ? null : '');
      ctrl?.markAsUntouched();
      ctrl?.markAsPristine();
    });

    this.GeneralReceiptForm.controls['pistdsapplicable'].setValue(false);
    this.GeneralReceiptForm.controls['preceiptdate'].setValue(new Date());
    this.istdsapplicableChange();
    this.GeneralReceiptForm.get('preceiptslist.pisgstapplicable')?.setValue(false);
    this.isgstapplicableChange();
    this.paymentslist.set([]);
    this.partyjournalentrylist.set([]);
    this.gridshowhide.set(false);

    this.tempState = '';
    this.tempgstno = '';
    this.TempGSTtype = '';
    this.temporaryamount = 0;
    this.gstPercentageSelected = false;
    this.partyBalance.set(`${this.currencySymbol} 0 Dr`);
    this._selectedPartyStateName = '';
    this.statelist.set([]);
    this.tdssectionlist.set([]);
    this.tdspercentagelist.set([]);
    this.showCashWarning.set(false);
    this.cashWarningMessage.set('');
    this.clearPaymentDetails();
    this.paymentlistcolumnwiselist = { ptotalamount: 0, pamount: 0, pgstamount: 0 };

    this.formValidationMessages = {};
    this.submitted.set(false);
    //this.imageResponse.set({ name: '' });
    this.imageResponse.set({ name: '' });
    this.uploadedFileName.set('');
    this.uploadedFilePath.set('');
    this.uploadedFileFormat.set('');
    this.GeneralReceiptForm.markAsUntouched();
    this.GeneralReceiptForm.markAsPristine();
  }

  // uploadAndProgress(event: any): void {
  //   const ext = event.target.value
  //     .substring(event.target.value.lastIndexOf('.') + 1)
  //     .toLowerCase();
  //   if (!['jpg', 'png', 'pdf'].includes(ext)) {
  //     this.cs.showWarningMessage('Upload jpg, png or pdf files');
  //     return;
  //   }
  //   const file = event.target.files[0];
  //   if (!file) return;

  //   const reader = new FileReader();
  //   reader.readAsDataURL(file);
  //   reader.onload = () =>
  //     this.imageResponse.set({ name: file.name, contentType: file.type, size: file.size });

  //   const fd = new FormData();
  //   fd.append(file.name, file);
  //   fd.append('NewFileName', `General Receipt.${file.name.split('.').pop()}`);

  //   // this.cs.fileUploadS3('Account', fd)
  //   //   .pipe(takeUntilDestroyed(this.destroyRef))
  //   //   .subscribe((data: any) => {
  //   //     this.imageResponse.update(r => ({ ...r, name: data[0] }));
  //   //     this.GeneralReceiptForm.controls['pFilename'].setValue(data[0]);
  //   //   });
  //   this.cs.fileUploadS3('Account', fd)
  // .pipe(takeUntilDestroyed(this.destroyRef))
  // .subscribe((data: any) => {
  //   const uploadedFileName = data[0] || data?.fileName || data?.filePath || data;
  //   const uploadedFilePath = data[1] || data?.filePath || uploadedFileName;

  //   this.imageResponse.update(r => ({ ...r, name: uploadedFileName }));

  //   this.GeneralReceiptForm.controls['pFilename'].setValue(uploadedFileName);
  //   this.GeneralReceiptForm.controls['pFilepath'].setValue(uploadedFilePath);
  //   this.GeneralReceiptForm.controls['pFileformat'].setValue(
  //     uploadedFileName?.split('.')?.pop()?.toLowerCase() || ''
  //   );
  // });
  // }


  // ── Validation helpers  

  uploadAndProgress(event: any): void {
    // const ext = event.target.value
    //   .substring(event.target.value.lastIndexOf('.') + 1)
    //   .toLowerCase();
    const ext = event.target.files[0]?.name
      .substring(event.target.files[0]?.name.lastIndexOf('.') + 1)
      .toLowerCase() || '';

    if (!['jpg', 'png', 'pdf'].includes(ext)) {
      this.cs.showWarningMessage('Upload jpg, png or pdf files');
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    // reader.onload = () =>
    //   this.imageResponse.set({ name: file.name, contentType: file.type, size: file.size });

    reader.onload = () => {
      this.imageResponse.set({ name: file.name, contentType: file.type, size: file.size });
      this.uploadedFileName.set(file.name); // show file name immediately before API responds
    };

    const fd = new FormData();
    fd.append(file.name, file);
    fd.append('NewFileName', `General Receipt.${file.name.split('.').pop()}`);

    this.cs.fileUploadS3('Account', fd)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: any) => {
        console.log('Upload response:', data); // check once then remove

        const fileName = Array.isArray(data)
          ? data[0]
          : (data?.fileName || data?.name || data?.filePath || '');

        // const filePath = Array.isArray(data)
        //   ? (data[1] || data[0])
        //   : (data?.filePath || data?.path || fileName);
        const filePath = fileName;
        const fileFormat = ext;

        this.uploadedFileName.set(fileName);
        // this.uploadedFilePath.set(filePath);
        this.uploadedFilePath.set(filePath || fileName);
        this.uploadedFileFormat.set(fileFormat);

        this.imageResponse.update(r => ({ ...r, name: fileName }));
      });
  }


  checkValidations(group: FormGroup, isValid: boolean): boolean {
    Object.keys(group.controls).forEach(key => {
      group.get(key)?.markAsTouched();
      isValid = this.GetValidationByControl(group, key, isValid);
    });
    return isValid;
  }

  GetValidationByControl(fg: FormGroup, key: string, isValid: boolean): boolean {
    try {
      const ctrl = fg.get(key);
      if (!ctrl) return isValid;
      if (ctrl instanceof FormGroup) {
        if (key !== 'preceiptslist') this.checkValidations(ctrl, isValid);
      } else if (ctrl.validator) {
        this.formValidationMessages[key] = '';
        if ((ctrl.touched || ctrl.dirty) && (ctrl.errors || ctrl.invalid)) {

          isValid = false;

        }
      }
    } catch { }
    return isValid;
  }

  BlurEventAllControll(fg: FormGroup): void {
    Object.keys(fg.controls).forEach(key => this._setBlurEvent(fg, key));
  }

  private _setBlurEvent(fg: FormGroup, key: string): void {
    const ctrl = fg.get(key);
    if (!ctrl) return;
    if (ctrl instanceof FormGroup) {
      this.BlurEventAllControll(ctrl);
    } else if (ctrl.validator) {
      ctrl.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          if (ctrl.touched) this.GetValidationByControl(fg, key, true);
        });
    }
  }

  GetGlobalBanks(): Observable<any[]> {
    const params = new HttpParams().set('GlobalSchema', 'global');
    return this.cs.getAPI('/Accounts/GetGlobalBanks', params, 'YES');
  }

  private _getTypeofPaymentData(): any[] {
    return (this.modeoftransactionslist() || []).filter(
      (p: any) => p.ptranstype !== p.ptypeofpayment
    );
  }
}
