// import {
//   Component,
//   OnInit,
//   OnDestroy,
//   inject,
//   signal,
//   computed,
//   NgZone,
// } from '@angular/core';
// import {
//   FormBuilder,
//   FormGroup,
//   Validators,
//   FormControl,
//   ReactiveFormsModule,
// } from '@angular/forms';
// import {
//   CommonModule,
//   CurrencyPipe,
//   DatePipe,
//   DecimalPipe,
// } from '@angular/common';

// import { Router, RouterModule } from '@angular/router';

// import { NgSelectModule } from '@ng-select/ng-select';
// import { TableModule } from 'primeng/table';
// import { ButtonModule } from 'primeng/button';
// import { Subject, takeUntil } from 'rxjs';
// import { CommonService } from '../../../../core/services/Common/common.service';
// import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
// import { ValidationMessageComponent } from '../../../common/validation-message/validation-message.component';
// import { DatePickerModule } from 'primeng/datepicker';

// @Component({
//   selector: 'app-payment-voucher-view',
//   templateUrl: './payment-voucher-view.html',
//   standalone: true,
//   imports: [
//     CommonModule,
//     ReactiveFormsModule,

//     DatePickerModule,
//     CurrencyPipe,
//     NgSelectModule,
//     TableModule,
//     ValidationMessageComponent,
//     ButtonModule,
//     RouterModule,
//   ],
//   providers: [DecimalPipe, CurrencyPipe, DatePipe],
// })
// export class PaymentVoucherView implements OnInit, OnDestroy {
//   pDatepickerMaxDate: Date = new Date();
//   pDatepickerMinDate: Date = new Date();
//   // pDatepickerMinDate: Date = new Date(new Date().setFullYear(new Date().getFullYear() - 1));

//   // ─── Injected Services ────────────────────────────────────────────────────
//   private readonly fb = inject(FormBuilder);
//   private readonly zone = inject(NgZone);
//   private readonly router = inject(Router);
//   private readonly datePipe = inject(DatePipe);
//   private readonly commonService = inject(CommonService);
//   private readonly accountingTxService = inject(AccountsTransactions);
//   private readonly subscriberJvService = inject(AccountsTransactions);

//   private readonly destroy$ = new Subject<void>();

//   // ─── Constants ────────────────────────────────────────────────────────────
//   readonly currencyCode = 'INR';
//   readonly gstnoPattern =
//     '^(0[1-9]|[1-2][0-9]|3[0-9])([a-zA-Z]){5}([0-9]){4}([a-zA-Z]){1}([a-zA-Z0-9]){1}([a-zA-Z]){1}([a-zA-Z0-9]){1}?';

//   // ─── Signals (reactive state) ─────────────────────────────────────────────
//   readonly showModeofPayment = signal(false);
//   readonly showTypeofPayment = signal(false);
//   readonly showTransType = signal(false);
//   readonly showBankCard = signal(true);
//   readonly showBranch = signal(true);
//   readonly showFinancial = signal(true);
//   readonly showUpi = signal(false);
//   readonly showChequeNo = signal(true);
//   readonly showGst = signal(true);
//   readonly showTds = signal(true);
//   readonly showGstAmount = signal(false);
//   readonly showIgst = signal(false);
//   readonly showCgst = signal(false);
//   readonly showSgst = signal(false);
//   readonly showUtgst = signal(false);
//   readonly showGstNo = signal(false);
//   readonly showSubledger = signal(true);
//   readonly disableGst = signal(true);
//   readonly disableTds = signal(false);
//   readonly disableAddButton = signal(false);
//   readonly disableSaveButton = signal(false);
//   readonly addButtonLabel = signal('Add');
//   readonly saveButtonLabel = signal('Save');
//   readonly disableTransactionDate = signal(false);
//   readonly bankExists = signal(false);

//   displayCardName = 'Debit Card';
//   displayChequeNo = 'Cheque No';
//   currencySymbol = '₹';

//   // ─── Data Lists ───────────────────────────────────────────────────────────
//   banklist: any[] = [];
//   modeOfTransactionsList: any[] = [];
//   typeOfPaymentList: any[] = [];
//   ledgerAccountsList: any[] = [];
//   subLedgerAccountsList: any[] = [];
//   partyList: any[] = [];
//   gstList: any[] = [];
//   tdsList: any[] = [];
//   tdsSectionList: any[] = [];
//   tdsPercentageList: any[] = [];
//   debitCardList: any[] = [];
//   stateList: any[] = [];
//   chequeNumbersList: any[] = [];
//   upiNamesList: any[] = [];
//   upiIdList: any[] = [];
//   paymentsList: any[] = [];
//   paymentsList1: any[] = [];
//   partyjournalentrylist: any[] = [];

//   paymentListColumnWise: any = {};
//   imageResponse: any;
//   kycFileName: any;
//   jsonDataItem: any = [];
//   availableAmount: any;
//   cashBalance: any;
//   bankBalance: any;
//   cashRestrictAmount: any;
//   bankBookBalance: any;
//   bankPassbookBalance: any;
//   ledgerBalance: any;
//   subLedgerBalance: any;
//   partyBalance: any;
//   partyjournalentryList: any;

//   private selectedPartyStateName = '';
//   private pBankIdSelect: any;
//   private pSubLedgerId1: any;

//   groups: any[] = [];

//   // ─── Datepicker Config ───────────────────────────────────────────────────
//   // readonly ppaymentdateConfig: any = {
//   //   maxDate: new Date(),
//   //   containerClass: 'theme-dark-blue',
//   //   dateInputFormat: 'DD-MMM-YYYY',
//   //   showWeekNumbers: false,
//   // };

//   formValidationMessages: Record<string, string> = {};
//   paymentVoucherForm!: FormGroup;
//   today: Date = new Date();

//   // ─── Lifecycle ────────────────────────────────────────────────────────────
//   ngOnInit(): void {
//     this.getLoadData();
//     this.initBalances();
//     this.currencySymbol = this.commonService.currencysymbol;

//     if (this.commonService.comapnydetails != null) {
//       this.disableTransactionDate.set(
//         this.commonService.comapnydetails.pdatepickerenablestatus
//       );
//     }

//     this.disableGst.set(true);
//     this.paymentListColumnWise = {};
//     this.paymentsList = [];
//     this.paymentsList1 = [];
//     this.formValidationMessages = {};

//     this.buildForm();
//     this.modeofPaymentChange();
//     this.isgstapplicableChange();
//     this.istdsapplicableChange();

//     // this.paymentVoucherForm
//     //   .get('ppaymentsslistcontrols.ppaymentdate')
//     //   ?.setValue(new Date());

//     this.paymentVoucherForm.get('ppaymentdate')?.setValue(new Date());


//     this.blurEventAllControls(this.paymentVoucherForm);

//     this.paymentVoucherForm
//       .get('ppaymentsslistcontrols.pgstcalculationtype')
//       ?.valueChanges.pipe(takeUntil(this.destroy$))
//       .subscribe(() => this.calculateGstTdsAmounts());
//   }

//   ngOnDestroy(): void {
//     this.destroy$.next();
//     this.destroy$.complete();
//   }

//   // ─── Form Builder ─────────────────────────────────────────────────────────
//   private buildForm(): void {
//     //  [{ value: this.today, disabled: true }, Validators.required]
//     this.paymentVoucherForm = this.fb.group({
//       ppaymentid: [''],
//       schemaname: [this.commonService.getschemaname()],
//       ppaymentdate: [{ value: this.today, disabled: true }, Validators.required],
//       //  ppaymentdate: ['', Validators.required],
//       ptotalpaidamount: [''],
//       pnarration: ['', Validators.required],
//       pmodofpayment: ['CASH'],
//       pbankname: [''],
//       pbranchname: [''],
//       ptranstype: ['CHEQUE'],
//       pCardNumber: [''],
//       pUpiname: [''],
//       pUpiid: [''],
//       ptypeofpayment: [''],
//       pChequenumber: [''],
//       pchequedate: [''],
//       pbankid: [''],
//       pCreatedby: [this.commonService.getCreatedBy()],
//       pStatusname: [this.commonService.pStatusname],
//       ptypeofoperation: [this.commonService.ptypeofoperation],
//       pipaddress: [this.commonService.getIpAddress()],
//       pDocStorePath: [''],
//       ppaymentsslistcontrols: this.buildPaymentLineControls(),
//     });
//   }

//   private buildPaymentLineControls(): FormGroup {
//     return this.fb.group({
//       psubledgerid: [null],
//       psubledgername: [''],
//       pledgerid: [null, Validators.required],
//       pledgername: ['', Validators.required],
//       pamount: [''],
//       pactualpaidamount: [
//         '',
//         [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
//       ],
//       pgsttype: [''],
//       pisgstapplicable: [false],
//       pgstcalculationtype: [''],
//       pgstpercentage: [''],
//       pgstamount: [''],
//       pigstamount: [''],
//       pcgstamount: [''],
//       psgstamount: [''],
//       putgstamount: [''],
//       ppartyname: ['', Validators.required],
//       ppartyid: [null, Validators.required],
//       ppartyreftype: [''],
//       ppartyreferenceid: [''],
//       ppartypannumber: [''],
//       pistdsapplicable: [false],
//       pgstno: [''],
//       pTdsSection: [''],
//       pTdsPercentage: [''],
//       ptdsamount: [''],
//       ptdscalculationtype: [''],
//       ppannumber: [''],
//       pState: [''],
//       pStateId: [''],
//       pigstpercentage: [''],
//       pcgstpercentage: [''],
//       psgstpercentage: [''],
//       putgstpercentage: [''],
//       ptypeofoperation: [this.commonService.ptypeofoperation],
//       ptotalamount: [''],
//     });
//   }

//   // ─── Validation Helpers ───────────────────────────────────────────────────
//   private blurEventAllControls(group: FormGroup): void {
//     try {
//       Object.keys(group.controls).forEach((key) => {
//         this.setBlurEvent(group, key);
//       });
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//     }
//   }

//   private setBlurEvent(group: FormGroup, key: string): void {
//     try {
//       const ctrl = group.get(key);
//       if (!ctrl) return;
//       if (ctrl instanceof FormGroup) {
//         this.blurEventAllControls(ctrl);
//       } else if (ctrl.validator) {
//         ctrl.valueChanges
//           .pipe(takeUntil(this.destroy$))
//           .subscribe(() => this.getValidationByControl(group, key, true));
//       }
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//     }
//   }

//   checkValidations(group: FormGroup, isValid: boolean): boolean {
//     try {
//       Object.keys(group.controls).forEach((key) => {
//         isValid = this.getValidationByControl(group, key, isValid);
//       });
//     } catch {
//       return false;
//     }
//     return isValid;
//   }

//   getValidationByControl(
//     formGroup: FormGroup,
//     key: string,
//     isValid: boolean
//   ): boolean {
//     try {
//       let ctrl =
//         formGroup.get(key) ??
//         (
//           this.paymentVoucherForm.get(
//             'ppaymentsslistcontrols'
//           ) as FormGroup
//         )?.get(key);

//       if (!ctrl) return isValid;

//       if (ctrl instanceof FormGroup) {
//         if (key !== 'ppaymentsslistcontrols')
//           this.checkValidations(ctrl, isValid);
//         return isValid;
//       }

//       if (ctrl.validator) {
//         this.formValidationMessages[key] = '';
//         if (ctrl.errors || ctrl.invalid || ctrl.touched || ctrl.dirty) {
//           const labelEl = document.getElementById(key) as HTMLInputElement;
//           const labelName = labelEl?.title ?? key;
//           for (const errKey in ctrl.errors) {
//             const msg = this.commonService.getValidationMessage(
//               ctrl,
//               errKey,
//               labelName,
//               key,
//               ''
//             );
//             this.formValidationMessages[key] += msg + ' ';
//             isValid = false;
//           }
//         }
//       }
//     } catch {
//       return false;
//     }
//     return isValid;
//   }

//   // ─── Balance Helpers ──────────────────────────────────────────────────────
//   private initBalances(): void {
//     this.bankBookBalance = `${this.currencySymbol} 0.00 Dr`;
//     this.bankPassbookBalance = `${this.currencySymbol} 0.00 Dr`;
//     this.ledgerBalance = `${this.currencySymbol} 0.00 Dr`;
//     this.subLedgerBalance = `${this.currencySymbol} 0.00 Dr`;
//     this.partyBalance = `${this.currencySymbol} 0.00 Dr`;
//   }

//   setBalances(type: string, amount: any): void {
//     const abs = Math.abs(parseFloat(amount));
//     const formatted =
//       parseFloat(amount) < 0
//         ? this.commonService.currencyFormat(abs.toFixed(2)) + ' Cr'
//         : this.commonService.currencyFormat(
//           parseFloat(amount).toFixed(2)
//         ) + ' Dr';

//     switch (type) {
//       case 'CASH':
//         this.cashBalance = formatted;
//         break;
//       case 'BANK':
//         this.bankBalance = formatted;
//         break;
//       case 'BANKBOOK':
//         this.bankBookBalance = `${this.currencySymbol} ${formatted}`;
//         break;
//       case 'PASSBOOK':
//         this.bankPassbookBalance = `${this.currencySymbol} ${formatted}`;
//         break;
//       case 'LEDGER':
//         this.ledgerBalance = `${this.currencySymbol} ${formatted}`;
//         break;
//       case 'SUBLEDGER':
//         this.subLedgerBalance = `${this.currencySymbol} ${formatted}`;
//         break;
//       case 'PARTY':
//         this.partyBalance = `${this.currencySymbol} ${formatted}`;
//         break;
//     }
//   }

//   // ─── Mode of Payment ──────────────────────────────────────────────────────
//   modeofPaymentChange(): void {
//     const mode = this.paymentVoucherForm.get('pmodofpayment')?.value;
//     if (mode === 'CASH') {
//       this.paymentVoucherForm.get('pbankid')?.setValue(0);
//       this.showModeofPayment.set(false);
//       this.showTransType.set(false);
//     } else if (mode === 'BANK') {
//       this.paymentVoucherForm.get('ptranstype')?.setValue('CHEQUE');
//       this.showModeofPayment.set(true);
//       this.showTransType.set(true);
//     } else {
//       this.showModeofPayment.set(true);
//       this.showTransType.set(false);
//     }
//     this.transofPaymentChange();
//     this.getPartyJournalEntryData();
//     this.formValidationMessages = {};
//   }

//   addModeofPaymentValidations(): void {
//     const f = this.paymentVoucherForm;
//     const get = (k: string) => f.get(k)!;

//     if (this.showModeofPayment()) {
//       get('pmodofpayment').setValidators(Validators.required);
//       get('pbankname').setValidators(Validators.required);

//       if (this.showChequeNo()) {
//         get('pChequenumber').setValidators([
//           Validators.required,
//           Validators.maxLength(6),
//         ]);
//       } else {
//         get('pChequenumber').setValidators([
//           Validators.required,
//           Validators.pattern(/^[0-9]+$/),
//           Validators.maxLength(40),
//         ]);
//       }

//       get('ptranstype').setValidators(
//         this.showTransType() ? Validators.required : null!
//       );
//       if (!this.showBankCard()) {
//         get('pCardNumber').setValidators(Validators.required);
//       } else {
//         get('pCardNumber').clearValidators();
//       }
//       if (this.showTypeofPayment()) {
//         get('ptypeofpayment').setValidators(Validators.required);
//       } else {
//         get('ptypeofpayment').clearValidators();
//       }
//       if (this.showUpi()) {
//         get('pUpiname').setValidators(Validators.required);
//         get('pUpiid').setValidators(Validators.required);
//       } else {
//         get('pUpiname').clearValidators();
//         get('pUpiid').clearValidators();
//       }
//     } else {
//       ['pmodofpayment', 'pbankname', 'pChequenumber', 'pUpiname', 'pUpiid', 'ptypeofpayment'].forEach(
//         (k) => get(k).clearValidators()
//       );
//     }

//     ['pmodofpayment', 'ptranstype', 'pCardNumber', 'pbankname', 'pChequenumber', 'ptypeofpayment', 'pUpiname', 'pUpiid'].forEach(
//       (k) => get(k).updateValueAndValidity()
//     );
//   }

//   transofPaymentChange(): void {
//     this.displayCardName = 'Debit Card';
//     this.showTypeofPayment.set(false);
//     this.showBranch.set(false);
//     this.showFinancial.set(false);
//     this.showChequeNo.set(false);
//     this.showBankCard.set(true);
//     this.showUpi.set(false);
//     this.displayChequeNo = 'Reference No.';

//     const transType = this.paymentVoucherForm.get('ptranstype')?.value;
//     if (transType === 'CHEQUE') {
//       this.showBankCard.set(true);
//       this.displayChequeNo = 'Cheque No.';
//       this.showBranch.set(true);
//       this.showChequeNo.set(true);
//     } else if (transType === 'ONLINE') {
//       this.showBankCard.set(true);
//       this.showTypeofPayment.set(true);
//     } else if (transType === 'DEBIT CARD') {
//       this.showBankCard.set(false);
//       this.showFinancial.set(true);
//     } else {
//       this.displayCardName = 'Credit Card';
//       this.showBankCard.set(false);
//       this.showFinancial.set(true);
//     }

//     this.addModeofPaymentValidations();
//     this.clearTransTypeDetails();
//     this.formValidationMessages = {};

//     ['pbankname', 'pChequenumber', 'pbranchname', 'pCardNumber', 'ptypeofpayment', 'pUpiname', 'pUpiid'].forEach(
//       (f) => this.paymentVoucherForm.get(f)?.markAsUntouched()
//     );
//   }

//   typeofPaymentChange(): void {
//     const isUpi =
//       this.paymentVoucherForm.get('ptypeofpayment')?.value === 'UPI';
//     this.showUpi.set(isUpi);

//     const upiName = this.paymentVoucherForm.get('pUpiname')!;
//     const upiId = this.paymentVoucherForm.get('pUpiid')!;
//     if (isUpi) {
//       upiName.setValidators(Validators.required);
//       upiId.setValidators(Validators.required);
//     } else {
//       upiName.clearValidators();
//       upiId.clearValidators();
//     }
//     upiName.updateValueAndValidity();
//     upiId.updateValueAndValidity();
//     this.getValidationByControl(this.paymentVoucherForm, 'ptypeofpayment', true);
//   }

//   // ─── GST ─────────────────────────────────────────────────────────────────
//   isgstapplicable_Checked(): void {
//     const group = this.paymentVoucherForm.get(
//       'ppaymentsslistcontrols'
//     ) as FormGroup;
//     group.get('pStateId')?.setValue('');
//     this.gstClear();

//     const partyName = group.get('ppartyname')?.value;
//     const existing = this.paymentsList.find((x) => x.ppartyname === partyName);
//     if (existing) {
//       group.get('pisgstapplicable')?.setValue(existing.pisgstapplicable);
//     }
//     this.isgstapplicableChange();
//   }

//   isgstapplicableChange(): void {
//     const group = this.paymentVoucherForm.get(
//       'ppaymentsslistcontrols'
//     ) as FormGroup;
//     const isGst = group.get('pisgstapplicable')?.value;

//     const gstCalc = group.get('pgstcalculationtype');
//     const gstPct = group.get('pgstpercentage');
//     const stateCtrl = group.get('pStateId');
//     const gstAmt = group.get('pgstamount');

//     if (isGst) {
//       this.showGst.set(true);
//       gstCalc?.setValue('EXCLUDE');
//       gstCalc?.setValidators(Validators.required);
//       gstPct?.setValidators(Validators.required);
//       stateCtrl?.setValidators(Validators.required);
//       gstAmt?.setValidators(Validators.required);
//       this.calculateGstTdsAmounts();
//     } else {
//       this.showGst.set(false);
//       group.patchValue({
//         pgstcalculationtype: null,
//         pgstpercentage: null,
//         pStateId: null,
//         pgstamount: 0,
//         pigstpercentage: 0,
//         pigstamount: 0,
//         pcgstpercentage: 0,
//         pcgstamount: 0,
//         psgstpercentage: 0,
//         psgstamount: 0,
//         putgstpercentage: 0,
//         putgstamount: 0,
//         pgstno: '',
//       });
//       gstCalc?.clearValidators();
//       gstPct?.clearValidators();
//       stateCtrl?.clearValidators();
//       gstAmt?.clearValidators();
//     }

//     [gstCalc, gstPct, stateCtrl, gstAmt].forEach((c) =>
//       c?.updateValueAndValidity()
//     );
//   }

//   // ─── TDS ─────────────────────────────────────────────────────────────────
//   istdsapplicable_Checked(): void {
//     const group = this.paymentVoucherForm.get(
//       'ppaymentsslistcontrols'
//     ) as FormGroup;
//     const partyName = group.get('ppartyname')?.value;
//     if (!partyName) {
//       this.istdsapplicableChange();
//       return;
//     }
//     const existing = this.paymentsList.find((x) => x.ppartyname === partyName);
//     if (existing) {
//       group.get('pistdsapplicable')?.setValue(existing.pistdsapplicable);
//     }
//     this.istdsapplicableChange();
//   }

//   istdsapplicableChange(): void {
//     const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
//     const isTds = group?.get('pistdsapplicable')?.value;

//     const tdsCalc = group?.get('ptdscalculationtype');
//     const tdsPct = group?.get('pTdsPercentage');
//     const section = group?.get('pTdsSection');
//     const tdsAmt = group?.get('ptdsamount');

//     if (isTds) {
//       this.showTds.set(true);
//       if (!this.disableTds()) tdsCalc?.setValue('INCLUDE');
//       tdsCalc?.setValidators(Validators.required);
//       tdsPct?.setValidators(Validators.required);
//       section?.setValidators(Validators.required);
//       tdsAmt?.setValidators(Validators.required);
//     } else {
//       this.showTds.set(false);
//       group?.patchValue({
//         ptdscalculationtype: null,
//         pTdsSection: null,
//         pTdsPercentage: null,
//         ptdsamount: 0,
//       });
//       tdsCalc?.clearValidators();
//       tdsPct?.clearValidators();
//       section?.clearValidators();
//       tdsAmt?.clearValidators();
//     }

//     [tdsCalc, tdsPct, section, tdsAmt].forEach((c) =>
//       c?.updateValueAndValidity()
//     );
//     this.calculateGstTdsAmounts();
//   }

//   // ─── Data Loading ─────────────────────────────────────────────────────────
//   getLoadData(): void {
//     this.accountingTxService
//       .GetReceiptsandPaymentsLoadingData2(
//         'PAYMENT VOUCHER',
//         this.commonService.getbranchname(),
//         this.commonService.getschemaname(),
//         this.commonService.getCompanyCode(),
//         this.commonService.getBranchCode(),
//         'taxes'
//       )
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (json: any) => {
//           if (!json) return;
//           this.banklist = json.banklist;
//           this.modeOfTransactionsList = json.modeofTransactionslist;
//           this.typeOfPaymentList = this.getTypeOfPaymentData();
//           this.ledgerAccountsList = json.accountslist;
//           this.partyList = json.partylist;
//           this.gstList = json.gstlist;
//           this.debitCardList = json.bankdebitcardslist;
//           this.setBalances('CASH', json.cashbalance);
//           this.setBalances('BANK', json.bankbalance);
//           this.cashRestrictAmount = json.cashRestrictAmount;
//         },
//         error: (err) => this.commonService.showErrorMessage(err),
//       });
//   }

//   getTypeOfPaymentData(): any[] {
//     return this.modeOfTransactionsList.filter(
//       (p) => p.ptranstype !== p.ptypeofpayment
//     );
//   }

//   // ─── Bank ─────────────────────────────────────────────────────────────────
//   bankName_Change(event: any): void {
//     const pbankid = event?.pbankid;
//     const bankname = event?.pbankname;
//     this.pBankIdSelect = pbankid;
//     this.paymentVoucherForm.get('pbankid')?.setValue(pbankid);

//     this.upiNamesList = [];
//     this.chequeNumbersList = [];
//     this.paymentVoucherForm.get('pChequenumber')?.setValue('');
//     this.paymentVoucherForm.get('pUpiname')?.setValue('');
//     this.paymentVoucherForm.get('pUpiid')?.setValue('');

//     if (pbankid) {
//       this.getBankDetailsById(pbankid);
//       this.getBankBranchName(pbankid);
//       this.paymentVoucherForm.get('pbankname')?.setValue(bankname);
//     } else {
//       this.paymentVoucherForm.get('pbankid')?.setValue('');
//       this.paymentVoucherForm.get('pbankname')?.setValue('');
//     }
//     this.getValidationByControl(this.paymentVoucherForm, 'pbankname', true);
//   }

//   getBankBranchName(pbankid: any): void {
//     const bank = this.banklist.find((b) => b.pbankid == pbankid);
//     if (!bank) return;
//     this.paymentVoucherForm.get('pbranchname')?.setValue(bank.pbranchname);
//     this.setBalances('BANKBOOK', bank.pbankbalance);
//     this.setBalances('PASSBOOK', bank.pbankpassbookbalance);
//   }

//   getBankDetailsById(pbankid: any): void {
//     this.accountingTxService
//       .GetBankDetailsbyId1(
//         pbankid,
//         this.commonService.getbranchname(),
//         this.commonService.getschemaname(),
//         this.commonService.getCompanyCode(),
//         this.commonService.getBranchCode()
//       )
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (json: any) => {
//           if (!json) return;
//           this.upiNamesList = json.bankupilist;
//           this.chequeNumbersList = json.chequeslist;
//         },
//         error: () => this.commonService.showErrorMessage('Bank API Error'),
//       });
//   }

//   chequeNumber_Change(): void {
//     const ctrl = this.paymentVoucherForm.get('pChequenumber');
//     ctrl?.markAsTouched();
//     if (!this.showChequeNo()) {
//       const numericOnly = (ctrl?.value || '').replace(/[^0-9]/g, '');
//       if (ctrl?.value !== numericOnly) ctrl?.setValue(numericOnly);
//     }
//     this.getValidationByControl(this.paymentVoucherForm, 'pChequenumber', true);
//   }

//   debitCard_Change(): void {
//     const data = this.getbankname(
//       this.paymentVoucherForm.get('pCardNumber')?.value
//     );
//     this.paymentVoucherForm.get('pbankname')?.setValue(data?.pbankname);
//     this.paymentVoucherForm.get('pbankid')?.setValue(data?.pbankid);
//     this.getValidationByControl(this.paymentVoucherForm, 'pCardNumber', true);
//   }

//   getbankname(cardNumber: any): any {
//     const data = this.debitCardList.find((d) => d.pCardNumber === cardNumber);
//     if (data) this.getBankBranchName(data.pbankid);
//     return data ?? null;
//   }

//   // ─── Ledger / Subledger ───────────────────────────────────────────────────
//   ledgerName_Change(event: any): void {
//     const group = this.paymentVoucherForm.get(
//       'ppaymentsslistcontrols'
//     ) as FormGroup;
//     const pledgerid = event?.pledgerid;

//     this.subLedgerAccountsList = [];
//     group.get('psubledgerid')?.setValue(null);
//     group.get('psubledgername')?.setValue('');
//     group.get('pledgername')?.setValue('');
//     this.ledgerBalance = `${this.currencySymbol} 0.00 Dr`;
//     this.subLedgerBalance = `${this.currencySymbol} 0.00 Dr`;

//     if (!pledgerid) {
//       this.setBalances('LEDGER', 0);
//       this.showSubledger.set(false);
//       return;
//     }

//     const ledger = this.ledgerAccountsList.find(
//       (l) => l.pledgerid === pledgerid
//     );
//     if (ledger) this.setBalances('LEDGER', ledger.accountbalance);

//     this.getSubLedgerData(pledgerid);
//     group.get('pledgername')?.setValue(event.pledgername);

//     const isRequired = this.subLedgerAccountsList?.length > 0;
//     this.showSubledger.set(isRequired);
//     if (isRequired) {
//       group.get('psubledgerid')?.setValidators([Validators.required]);
//     } else {
//       group.get('psubledgerid')?.clearValidators();
//     }
//     group.get('psubledgerid')?.updateValueAndValidity();
//   }

//   getSubLedgerData(pledgerid: any): void {
//     const group = this.paymentVoucherForm.get(
//       'ppaymentsslistcontrols'
//     ) as FormGroup;

//     this.accountingTxService
//       .GetSubLedgerData3(
//         pledgerid,
//         this.commonService.getbranchname(),
//         this.commonService.getCompanyCode(),
//         this.commonService.getbranchname(),
//         this.commonService.getBranchCode(),
//         this.commonService.getschemaname()
//       )
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (json: any) => {
//           if (!json) return;
//           this.subLedgerAccountsList = json.map((item: any) => ({
//             subledgername: item.psubledgername,
//             subledgerid: item.psubledgerid,
//             accountbalance: item.accountbalance,
//           }));

//           const subCtrl = group.get('psubledgername');
//           if (this.subLedgerAccountsList.length > 0) {
//             this.showSubledger.set(true);
//             subCtrl?.setValidators(Validators.required);
//           } else {
//             this.showSubledger.set(false);
//             subCtrl?.clearValidators();
//             group.get('psubledgerid')?.setValue(pledgerid);
//             subCtrl?.setValue(group.get('pledgername')?.value);
//             this.formValidationMessages['psubledgername'] = '';
//           }
//           subCtrl?.updateValueAndValidity();
//         },
//         error: (err) => this.commonService.showErrorMessage(err),
//       });
//   }

//   subledger_Change(event: any): void {
//     const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
//     const psubledgerid = event?.subledgerid;
//     this.subLedgerBalance = '';

//     if (psubledgerid) {
//       group?.get('psubledgerid')?.setValue(psubledgerid);
//       const data = this.subLedgerAccountsList.find(
//         (l) => l.subledgerid === psubledgerid
//       );
//       if (data) this.setBalances('SUBLEDGER', data.accountbalance);
//     } else {
//       group?.get('psubledgername')?.setValue('');
//       this.setBalances('SUBLEDGER', 0);
//     }

//     this.getValidationByControl(
//       this.paymentVoucherForm,
//       'psubledgername',
//       true
//     );
//   }

//   // ─── Party ────────────────────────────────────────────────────────────────
//   partyName_Change(event: any): void {
//     const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
//     const ppartyid = event?.ppartyid;

//     this.availableAmount = 0;
//     this.stateList = [];
//     this.tdsSectionList = [];
//     this.tdsPercentageList = [];
//     this.partyjournalentrylist = [];
//     this.partyBalance = '';

//     group?.patchValue({
//       pStateId: '',
//       pState: '',
//       pTdsSection: '',
//       pTdsPercentage: '',
//       ppartyreferenceid: '',
//       ppartyreftype: '',
//       ppartypannumber: '',
//     });

//     const transDate = this.commonService.getFormatDateNormal(
//       this.paymentVoucherForm.get('ppaymentdate')?.value
//     );

//     this.accountingTxService
//       .GetCashRestrictAmountpercontact1(
//         'PAYMENT VOUCHER',
//         'KGMS',
//         this.commonService.getbranchname(),
//         ppartyid,
//         transDate,
//         this.commonService.getCompanyCode(),
//         this.commonService.getschemaname(),
//         this.commonService.getBranchCode()
//       )
//       .pipe(takeUntil(this.destroy$))
//       .subscribe((amt: number) => {
//         this.availableAmount = this.cashRestrictAmount - amt;
//       });

//     if (ppartyid) {
//       this.selectedPartyStateName = event.state_name ?? '';
//       group?.get('ppartyname')?.setValue(event.ppartyname);

//       const partyData = this.partyList.find((x) => x.ppartyid === ppartyid);
//       if (partyData) {
//         group?.patchValue({
//           ppartyreferenceid: partyData.ppartyreferenceid,
//           ppartyreftype: partyData.ppartyreftype,
//           ppartypannumber: partyData.pan_no,
//         });
//       }

//       this.getPartyDetailsById(ppartyid, event.ppartyname);
//       this.setEnableOrDisableTdsGst(event.ppartyname, 'PARTYCHANGE');
//       this.disableGst.set(false);
//     } else {
//       this.setBalances('PARTY', 0);
//       group?.get('ppartyname')?.setValue('');
//       this.disableGst.set(true);
//     }
//   }

//   setEnableOrDisableTdsGst(ppartyname: string, changetype: string): void {
//     const group = this.paymentVoucherForm.get(
//       'ppaymentsslistcontrols'
//     ) as FormGroup;
//     group.patchValue({
//       pistdsapplicable: false,
//       pisgstapplicable: false,
//       pgstcalculationtype: '',
//       ptdscalculationtype: '',
//     });

//     const matched = this.paymentsList.filter((x) => x.ppartyname === ppartyname);
//     if (matched.length > 0) {
//       const data = matched[0];
//       this.disableGst.set(true);
//       this.disableTds.set(true);
//       group.patchValue({
//         pistdsapplicable: data.pistdsapplicable,
//         pisgstapplicable: data.pisgstapplicable,
//         pgstcalculationtype: data.pgstcalculationtype,
//         ptdscalculationtype: data.ptdscalculationtype,
//       });
//     } else {
//       this.disableGst.set(false);
//       this.disableTds.set(false);
//     }

//     if (changetype === 'PARTYCHANGE') {
//       this.isgstapplicableChange();
//       this.istdsapplicableChange();
//     }
//   }

//   getPartyDetailsById(ppartyid: any, _partyName: string): void {
//     this.accountingTxService
//       .getPartyDetailsbyid(
//         ppartyid,
//         this.commonService.getbranchname(),
//         this.commonService.getBranchCode(),
//         this.commonService.getCompanyCode(),
//         this.commonService.getschemaname(),
//         'taxes'
//       )
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (json: any) => {
//           if (!json) return;
//           this.tdsSectionList = [];
//           this.tdsList = json.lstTdsSectionDetails ?? [];
//           const uniqueSections = [
//             ...new Set(this.tdsList.map((i: any) => i.pTdsSection)),
//           ];
//           this.tdsSectionList = uniqueSections.map((s) => ({ pTdsSection: s }));

//           const partyState = (this.selectedPartyStateName ?? '').toLowerCase().trim();
//           if (partyState && json.statelist?.length) {
//             this.stateList = json.statelist.filter((st: any) => {
//               const s = (st.pState ?? st.pStatename ?? '').toLowerCase().trim();
//               return (
//                 s === partyState ||
//                 s.includes(partyState) ||
//                 partyState.includes(s)
//               );
//             });
//           } else {
//             this.stateList = [];
//           }
//           this.calculateGstTdsAmounts();
//           this.setBalances('PARTY', json.accountbalance);
//         },
//         error: (err) => this.commonService.showErrorMessage(err),
//       });
//   }

//   // ─── UPI ─────────────────────────────────────────────────────────────────
//   upiName_Change(event: any): void {
//     const upiname = event?.target?.value;
//     this.upiIdList = this.upiNamesList.filter((r) => r.pUpiname === upiname);
//     this.getValidationByControl(this.paymentVoucherForm, 'pUpiname', true);
//   }

//   upiId_Change(): void {
//     this.getValidationByControl(this.paymentVoucherForm, 'pUpiid', true);
//   }

//   // ─── TDS Section / Percentage ─────────────────────────────────────────────
//   tdsSection_Change(event: any): void {
//     const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
//     const ptdssection = event?.pTdsSection;
//     this.tdsPercentageList = [];
//     group?.get('pTdsPercentage')?.setValue('');
//     if (ptdssection) this.getTdsPercentage(ptdssection);
//     this.getValidationByControl(this.paymentVoucherForm, 'pTdsSection', true);
//   }

//   getTdsPercentage(ptdssection: any): void {
//     this.tdsPercentageList = this.tdsList.filter(
//       (r) => r.pTdsSection === ptdssection
//     );
//     this.calculateGstTdsAmounts();
//   }

//   tds_Change(_event: any): void {
//     this.getValidationByControl(this.paymentVoucherForm, 'pTdsPercentage', true);
//     this.getValidationByControl(this.paymentVoucherForm, 'ptdsamount', true);
//     this.calculateGstTdsAmounts();
//   }

//   // ─── GST Percentage ───────────────────────────────────────────────────────
//   gst_Change(event: any): void {
//     const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
//     ['pigstpercentage', 'pcgstpercentage', 'psgstpercentage', 'putgstpercentage'].forEach(
//       (k) => group?.get(k)?.setValue('')
//     );

//     if (event) {
//       this.getGstPercentage(event);
//       this.calculateGstTdsAmounts();
//     } else {
//       ['pgstamount', 'pigstamount', 'pcgstamount', 'psgstamount', 'putgstamount', 'pamount', 'ptotalamount'].forEach(
//         (k) => group?.get(k)?.setValue(null)
//       );
//     }

//     this.getValidationByControl(this.paymentVoucherForm, 'pgstpercentage', true);
//     this.getValidationByControl(this.paymentVoucherForm, 'pgstamount', true);
//   }

//   getGstPercentage(gstpercentage: any): void {
//     const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
//     const data = this.gstList.find((g) => g.pgstpercentage === gstpercentage);
//     if (data) {
//       group?.patchValue({
//         pigstpercentage: data.pigstpercentage,
//         pcgstpercentage: data.pcgstpercentage,
//         psgstpercentage: data.psgstpercentage,
//         putgstpercentage: data.putgstpercentage,
//       });
//     }
//     this.calculateGstTdsAmounts();
//   }

//   gstClear(): void {
//     const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
//     ['pigstpercentage', 'pcgstpercentage', 'psgstpercentage', 'putgstpercentage', 'pgstpercentage', 'pgstno'].forEach(
//       (k) => group?.get(k)?.setValue('')
//     );
//   }

//   // ─── State ────────────────────────────────────────────────────────────────
//   state_Change(event: any): void {
//     const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
//     const pstateid = event?.pStateId;
//     const gst = event?.gstnumber;

//     this.gstClear();

//     if (pstateid) {
//       group?.get('pState')?.setValue(event.pState);
//       this.showGstNo.set(!gst);

//       const data = this.getStateDetailsById(pstateid);
//       this.showGstAmount.set(true);
//       this.showIgst.set(false);
//       this.showCgst.set(false);
//       this.showSgst.set(false);
//       this.showUtgst.set(false);

//       group?.get('pgsttype')?.setValue(data?.pgsttype);
//       group?.get('pgstno')?.setValue(data?.gstnumber);

//       if (data?.pgsttype === 'IGST') {
//         this.showIgst.set(true);
//       } else {
//         this.showCgst.set(true);
//         if (data?.pgsttype === 'CGST,SGST') this.showSgst.set(true);
//         if (data?.pgsttype === 'CGST,UTGST') this.showUtgst.set(true);
//       }
//     } else {
//       group?.get('pState')?.setValue('');
//     }

//     this.getValidationByControl(this.paymentVoucherForm, 'pState', true);
//     this.formValidationMessages['pigstpercentage'] = '';
//     this.calculateGstTdsAmounts();
//   }

//   getStateDetailsById(pstateid: any): any {
//     return this.stateList.find((s) => s.pStateId == pstateid);
//   }

//   gstNo_Change(): void {
//     this.getValidationByControl(this.paymentVoucherForm, 'pgstno', true);
//   }

//   // ─── Calculation ─────────────────────────────────────────────────────────
//   pamount_change(): void {
//     this.calculateGstTdsAmounts();
//   }

//   calculateGstTdsAmounts(): void {
//     try {
//       const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
//       const safe = (val: any): number =>
//         parseFloat((val || '0').toString().replace(/,/g, '')) || 0;

//       const paidAmount = safe(group?.get('pactualpaidamount')?.value);
//       const gstType = group?.get('pgsttype')?.value;
//       const gstPct = safe(group?.get('pgstpercentage')?.value);
//       const isTds = group?.get('pistdsapplicable')?.value;
//       const tdsPct = safe(group?.get('pTdsPercentage')?.value);

//       let taxable = 0;
//       let gstAmt = 0;
//       let igst = 0, cgst = 0, sgst = 0, utgst = 0, tds = 0;

//       taxable =
//         gstPct > 0 || tdsPct > 0
//           ? Math.round((paidAmount * 100) / (100 + gstPct - tdsPct))
//           : paidAmount;

//       if (gstPct > 0) {
//         gstAmt = Math.round((taxable * gstPct) / 100);
//         if (gstType === 'IGST') igst = gstAmt;
//         else if (gstType === 'CGST,SGST') {
//           cgst = Math.round(gstAmt / 2);
//           sgst = Math.round(gstAmt / 2);
//         } else if (gstType === 'CGST,UTGST') {
//           cgst = Math.round(gstAmt / 2);
//           utgst = Math.round(gstAmt / 2);
//         }
//       }

//       if (isTds && tdsPct > 0) {
//         tds = Math.round((taxable * tdsPct) / 100);
//       }

//       const net = Math.round(taxable + gstAmt - tds);
//       const total = Math.round(taxable + gstAmt);

//       group?.patchValue({
//         ptaxableamount: taxable,
//         pgstamount: gstAmt,
//         pigstamount: igst,
//         pcgstamount: cgst,
//         psgstamount: sgst,
//         putgstamount: utgst,
//         ptdsamount: tds,
//         ptotalamount: total,
//         pamount: net,
//       });

//       this.formValidationMessages['pamount'] = '';
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//     }
//   }

//   // ─── Add / Remove Row ─────────────────────────────────────────────────────
//   addPaymentDetails(): void {
//     const round = (n: number) =>
//       Math.round((n + Number.EPSILON) * 100) / 100;

//     this.disableAddButton.set(true);
//     this.addButtonLabel.set('Processing');

//     const ctrl = this.paymentVoucherForm.get(
//       'ppaymentsslistcontrols'
//     ) as FormGroup;

//     const ppartyid = ctrl.get('ppartyid')?.value;
//     const pledgerid = ctrl.get('pledgerid')?.value;
//     const pactualpaidamount = ctrl.get('pactualpaidamount')?.value;
//     const subledgerid = ctrl.get('psubledgerid')?.value;

//     if (!ppartyid) return this.showAddError('Please select Party');
//     if (!pledgerid) return this.showAddError('Please select Ledger');
//     if (!pactualpaidamount || parseFloat(pactualpaidamount) <= 0)
//       return this.showAddError('Please enter Amount');

//     const isgst = ctrl.get('pisgstapplicable')?.value;
//     if (isgst) {
//       if (!ctrl.get('pgstcalculationtype')?.value)
//         return this.showAddError('Please select GST Calculation Type');
//       if (!ctrl.get('pStateId')?.value)
//         return this.showAddError('Please select State');
//       if (!ctrl.get('pgstpercentage')?.value)
//         return this.showAddError('Please select GST Percentage');
//     }

//     const istds = ctrl.get('pistdsapplicable')?.value;
//     if (istds) {
//       if (!ctrl.get('ptdscalculationtype')?.value)
//         return this.showAddError('Please select TDS Calculation Type');
//       if (!ctrl.get('pTdsSection')?.value)
//         return this.showAddError('Please select TDS Section');
//       if (!ctrl.get('pTdsPercentage')?.value)
//         return this.showAddError('Please select TDS Percentage');
//     }

//     const isSubledgerRequired = this.subLedgerAccountsList?.length > 0;
//     if (isSubledgerRequired && !subledgerid)
//       return this.showAddError('Please select Subledger');

//     const selectedSub =
//       this.subLedgerAccountsList?.find((x) => x.subledgerid === subledgerid) ??
//       null;

//     const currentRow = {
//       ppartyname: ctrl.get('ppartyname')?.value,
//       pledgername: ctrl.get('pledgername')?.value,
//       psubledgerid: selectedSub?.subledgerid ?? subledgerid,
//       psubledgername: selectedSub?.subledgername ?? '',
//       ptotalamount: round(
//         parseFloat(
//           this.commonService.removeCommasInAmount(
//             ctrl.get('ptotalamount')?.value ?? '0'
//           )
//         )
//       ),
//       pamount: round(
//         parseFloat(
//           this.commonService.removeCommasInAmount(
//             ctrl.get('pamount')?.value ?? '0'
//           )
//         )
//       ),
//       pgstcalculationtype: isgst ? ctrl.get('pgstcalculationtype')?.value : null,
//       pgsttype: isgst ? ctrl.get('pgsttype')?.value : null,
//       pgstpercentage: isgst ? ctrl.get('pgstpercentage')?.value ?? 0 : 0,
//       pgstamount: isgst
//         ? round(parseFloat(ctrl.get('pgstamount')?.value ?? '0'))
//         : 0,
//       pisgstapplicable: isgst ?? false,
//       pTdsSection: istds ? ctrl.get('pTdsSection')?.value : null,
//       pTdsPercentage: istds ? ctrl.get('pTdsPercentage')?.value ?? 0 : 0,
//       ptdsamount: istds
//         ? round(
//           parseFloat(
//             this.commonService.removeCommasInAmount(
//               ctrl.get('ptdsamount')?.value ?? '0'
//             )
//           )
//         )
//         : 0,
//       ptdscalculationtype: istds ? ctrl.get('ptdscalculationtype')?.value : null,
//       pistdsapplicable: istds ?? false,
//       ppartyid,
//       pledgerid,
//       pStateId: isgst ? ctrl.get('pStateId')?.value ?? 0 : 0,
//       pState: isgst ? ctrl.get('pState')?.value ?? '' : '',
//       pgstno: isgst ? ctrl.get('pgstno')?.value ?? '' : '',
//       ppartyreferenceid: ctrl.get('ppartyreferenceid')?.value ?? '',
//       ppartyreftype: ctrl.get('ppartyreftype')?.value ?? '',
//       ppartypannumber: ctrl.get('ppartypannumber')?.value ?? '',
//     };

//     if (!this.validateAddPaymentDetails(currentRow)) {
//       this.resetAddButton();
//       return;
//     }

//     const paidAmount = round(
//       parseFloat(
//         this.commonService.removeCommasInAmount(pactualpaidamount ?? '0')
//       )
//     );

//     if (isSubledgerRequired) {
//       this.subscriberJvService
//         .GetdebitchitCheckbalance(
//           this.commonService.getbranchname(),
//           pledgerid,
//           36,
//           subledgerid,
//           this.commonService.getschemaname(),
//           this.commonService.getCompanyCode(),
//           this.commonService.getBranchCode()
//         )
//         .pipe(takeUntil(this.destroy$))
//         .subscribe({
//           next: (result: any) => {
//             if (
//               result?.balancecheckstatus &&
//               paidAmount > parseFloat(result?.balanceamount ?? '0')
//             ) {
//               this.showAddError(
//                 'Enter the amount less or equal to subledger amount'
//               );
//               return;
//             }
//             this.savePaymentRow(currentRow, ctrl);
//           },
//           error: (err) => this.showAddError(err),
//         });
//     } else {
//       this.savePaymentRow(currentRow, ctrl);
//     }
//   }

//   validateAddPaymentDetails(currentRow: any): boolean {
//     let isValid = true;
//     try {
//       const { pledgername, psubledgername, psubledgerid, ppartyid } =
//         currentRow;
//       let count = 0,
//         fixedCount = 0,
//         bankCount = 0;

//       for (const row of this.paymentsList) {
//         if (row === currentRow) continue;
//         if (
//           pledgername === 'FIXED DEPOSIT RECEIPTS-CHITS' &&
//           this.paymentsList.length > 0
//         ) {
//           count = fixedCount = 1;
//           break;
//         }
//         if (
//           row.pledgername === 'FIXED DEPOSIT RECEIPTS-CHITS' ||
//           (row.pledgername === pledgername &&
//             row.psubledgername === psubledgername &&
//             row.ppartyid === ppartyid)
//         ) {
//           if (row.pledgername === 'FIXED DEPOSIT RECEIPTS-CHITS')
//             fixedCount = 1;
//           count = 1;
//           break;
//         }
//         for (const bank of this.banklist) {
//           if (
//             bank.paccountid === row.psubledgerid ||
//             bank.paccountid === psubledgerid
//           ) {
//             count = bankCount = 1;
//             break;
//           }
//         }
//       }

//       if (count === 1) {
//         if (fixedCount === 1)
//           this.commonService.showWarningMessage(
//             'Fixed deposit receipts accepts only one record in the grid'
//           );
//         else if (bankCount === 1)
//           this.commonService.showWarningMessage(
//             'Bank Accounts only one record in the grid'
//           );
//         else
//           this.commonService.showWarningMessage(
//             'Ledger, subledger and party already exists in the grid.'
//           );
//         isValid = false;
//       }
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//       isValid = false;
//     }
//     return isValid;
//   }

//   private showAddError(msg: string): void {
//     this.commonService.showWarningMessage(msg);
//     this.resetAddButton();
//   }

//   private resetAddButton(): void {
//     this.disableAddButton.set(false);
//     this.addButtonLabel.set('Add');
//   }

//   private savePaymentRow(row: any, ctrl: FormGroup): void {
//     this.paymentsList.push(row);
//     this.paymentsList1 = [...this.paymentsList1, row];
//     this.getPartyJournalEntryData();
//     this.clearPaymentDetailsParticular();
//     this.getPaymentListColumnWiseTotals();
//     ctrl.reset();
//     ctrl.markAsUntouched();
//     ctrl.markAsPristine();
//     ctrl.updateValueAndValidity();
//     this.resetAddButton();
//   }

//   removeHandler(rowIndex: number): void {
//     this.paymentsList.splice(rowIndex, 1);
//     this.paymentsList1.splice(rowIndex, 1);
//     this.paymentsList1 = [...this.paymentsList1];

//     const total = this.paymentsList.reduce(
//       (s, c) => s + parseFloat(c.ptotalamount ?? 0),
//       0
//     );
//     this.paymentVoucherForm.get('ptotalpaidamount')?.setValue(total);
//     this.getPartyJournalEntryData();
//     this.clearPaymentDetailsParticular();
//     this.getPaymentListColumnWiseTotals();
//   }

//   getPaymentListColumnWiseTotals(): void {
//     const safe = (v: any) =>
//       parseFloat((v || '0').toString().replace(/,/g, '')) || 0;
//     ['ptotalamount', 'pamount', 'pgstamount', 'ptdsamount'].forEach((key) => {
//       this.paymentListColumnWise[key] = this.paymentsList.reduce(
//         (s, c) => s + safe(c[key]),
//         0
//       );
//     });
//   }

//   // ─── Clear Helpers ────────────────────────────────────────────────────────
//   clearPaymentDetails(): void {
//     const ctrl = this.paymentVoucherForm.get(
//       'ppaymentsslistcontrols'
//     ) as FormGroup;
//     ctrl.reset();
//     this.showSubledger.set(true);
//     ctrl.patchValue({
//       pistdsapplicable: false,
//       pisgstapplicable: false,
//       pledgerid: null,
//       psubledgerid: null,
//       ppartyid: null,
//       pStateId: '',
//       pgstpercentage: '',
//       pTdsSection: '',
//       pTdsPercentage: '',
//     });
//     this.setBalances('LEDGER', 0);
//     this.setBalances('SUBLEDGER', 0);
//     this.setBalances('PARTY', 0);
//     this.istdsapplicable_Checked();
//     this.isgstapplicable_Checked();
//     this.formValidationMessages = {};
//   }

//   clearPaymentDetailsParticular(): void {
//     const ctrl = this.paymentVoucherForm.get(
//       'ppaymentsslistcontrols'
//     ) as FormGroup;
//     this.showSubledger.set(true);
//     this.showGst.set(false);
//     this.showTds.set(false);
//     this.disableGst.set(false);
//     this.disableTds.set(false);
//     this.showGstNo.set(false);
//     this.showGstAmount.set(false);
//     this.showIgst.set(false);
//     this.showCgst.set(false);
//     this.showSgst.set(false);
//     this.showUtgst.set(false);

//     ctrl.patchValue({
//       ppartyid: null,
//       ppartyname: '',
//       pledgerid: null,
//       pledgername: '',
//       psubledgerid: null,
//       psubledgername: '',
//       pactualpaidamount: '',
//       pamount: '',
//       ptotalamount: '',
//       pisgstapplicable: false,
//       pgstcalculationtype: '',
//       pgstpercentage: '',
//       pgstamount: '',
//       pgsttype: '',
//       pigstamount: '',
//       pcgstamount: '',
//       psgstamount: '',
//       putgstamount: '',
//       pigstpercentage: '',
//       pcgstpercentage: '',
//       psgstpercentage: '',
//       putgstpercentage: '',
//       pStateId: '',
//       pState: '',
//       pgstno: '',
//       pistdsapplicable: false,
//       ptdscalculationtype: '',
//       pTdsSection: '',
//       pTdsPercentage: '',
//       ptdsamount: '',
//       ppartyreferenceid: '',
//       ppartyreftype: '',
//       ppartypannumber: '',
//     });

//     this.subLedgerAccountsList = [];
//     this.tdsSectionList = [];
//     this.tdsPercentageList = [];
//     this.stateList = [];
//     this.setBalances('LEDGER', 0);
//     this.setBalances('SUBLEDGER', 0);
//     this.setBalances('PARTY', 0);
//     this.formValidationMessages = {};
//   }

//   clearTransTypeDetails(): void {
//     const fields = ['pbankid', 'pbankname', 'pCardNumber', 'ptypeofpayment', 'pbranchname', 'pUpiname', 'pUpiid', 'pChequenumber'];
//     this.chequeNumbersList = [];
//     fields.forEach((f) => {
//       this.paymentVoucherForm.get(f)?.setValue('');
//       this.paymentVoucherForm.get(f)?.markAsUntouched();
//       this.paymentVoucherForm.get(f)?.markAsPristine();
//     });
//     this.formValidationMessages = {};
//     this.setBalances('BANKBOOK', 0);
//     this.setBalances('PASSBOOK', 0);
//   }

//   clearPaymentVoucher(): void {
//     try {
//       this.paymentsList = [];
//       this.paymentsList1 = [];
//       this.partyjournalentrylist = [];
//       this.paymentListColumnWise = {};

//       this.paymentVoucherForm.patchValue({
//         pnarration: '',
//         pDocStorePath: '',
//         pmodofpayment: 'CASH',
//         ptranstype: 'CHEQUE',
//         ppaymentdate: new Date(),
//         ptotalpaidamount: '',
//         pbankname: '',
//         pbranchname: '',
//         pChequenumber: '',
//         pCardNumber: '',
//         ptypeofpayment: '',
//         pUpiname: '',
//         pUpiid: '',
//         pbankid: '',
//         schemaname: this.commonService.getschemaname(),
//       });

//       ['pnarration'].forEach((f) => {
//         this.paymentVoucherForm.get(f)?.markAsUntouched();
//         this.paymentVoucherForm.get(f)?.markAsPristine();
//       });

//       this.imageResponse = { name: '', fileType: 'imageResponse', contentType: '', size: 0 };

//       this.clearTransTypeDetails();

//       const ctrl = this.paymentVoucherForm.get('ppaymentsslistcontrols') as FormGroup;
//       ctrl.reset();
//       ctrl.markAsUntouched();
//       ctrl.markAsPristine();
//       this.clearPaymentDetailsParticular();

//       this.showGst.set(false);
//       this.showTds.set(false);
//       this.showModeofPayment.set(false);
//       this.showTransType.set(false);
//       this.showBranch.set(false);
//       this.showFinancial.set(false);
//       this.showChequeNo.set(false);
//       this.showTypeofPayment.set(false);
//       this.showUpi.set(false);
//       this.showSubledger.set(true);
//       this.disableGst.set(true);
//       this.disableTds.set(false);
//       this.disableSaveButton.set(false);
//       this.saveButtonLabel.set('Save');
//       this.disableAddButton.set(false);
//       this.addButtonLabel.set('Add');

//       this.subLedgerAccountsList = [];
//       this.tdsSectionList = [];
//       this.tdsPercentageList = [];
//       this.stateList = [];
//       this.chequeNumbersList = [];
//       this.upiNamesList = [];

//       this.setBalances('BANKBOOK', 0);
//       this.setBalances('PASSBOOK', 0);
//       this.setBalances('LEDGER', 0);
//       this.setBalances('SUBLEDGER', 0);
//       this.setBalances('PARTY', 0);

//       this.formValidationMessages = {};
//       this.getLoadData();
//       this.modeofPaymentChange();
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//     }
//   }

//   // ─── Save ─────────────────────────────────────────────────────────────────
//   validatesavePaymentVoucher(): boolean {
//     debugger;;
//     let isValid = true;
//     try {
//       isValid = this.checkValidations(this.paymentVoucherForm, isValid);
//       if (this.paymentsList.length === 0) {
//         this.commonService.showWarningMessage('Add at least one record to the grid!');
//         isValid = false;
//       }

//       if (this.paymentVoucherForm.get('pmodofpayment')?.value === 'CASH') {
//         const cashStr = this.cashBalance ?? '';
//         if (cashStr.indexOf('D') > -1) {
//           const cashVal = parseFloat(
//             this.commonService.removeCommasInAmount(cashStr.split('D')[0])
//           );
//           let paidVal =
//             parseFloat(
//               this.paymentVoucherForm.get('ptotalpaidamount')?.value ?? '0'
//             ) || 0;

//           if (paidVal > cashVal) {
//             this.commonService.showWarningMessage('Insufficient Cash Balance');
//             isValid = false;
//           }

//           if (isValid) {
//             const bankExists = this.paymentsList.some((p) =>
//               this.banklist.some((b) => b.paccountid === p.psubledgerid)
//             );
//             this.bankExists.set(bankExists);
//             const restrict = parseFloat(this.cashRestrictAmount ?? '0') || 0;
//             if (restrict > 0 && !bankExists) {
//               if (parseFloat(this.availableAmount) <= paidVal) {
//                 this.commonService.showWarningMessage(
//                   `Cash transactions limit below ${this.commonService.currencyformat(restrict)} Available Amount ${this.commonService.currencyformat(this.availableAmount)} only for this Party`
//                 );
//                 isValid = false;
//               }
//             }
//           }
//         } else {
//           this.commonService.showWarningMessage('Insufficient Cash Balance');
//           isValid = false;
//         }
//       }
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//     }
//     return isValid;
//   }

//   savePaymentVoucher(): void {
//     debugger;
//     this.disableSaveButton.set(true);
//     this.saveButtonLabel.set('Processing');

//     this.paymentVoucherForm
//       .get('ptotalpaidamount')
//       ?.setValue(
//         this.paymentsList.reduce(
//           (s, c) => s + parseFloat(c.ptotalamount ?? 0),
//           0
//         )
//       );

//     if (!this.validatesavePaymentVoucher()) {
//       this.disableSaveButton.set(false);
//       this.saveButtonLabel.set('Save');
//       return;
//     }

//     const accountIds = this.paymentsList.map((p) => p.psubledgerid).join(',');
//     const transDate = this.commonService.getFormatDateNormal(
//       this.paymentVoucherForm.get('ppaymentdate')?.value
//     );

//     this.accountingTxService
//       .GetCashAmountAccountWise(
//         'PAYMENT VOUCHER',
//         this.commonService.getbranchname(),
//         accountIds,
//         transDate,
//         this.commonService.getschemaname(),
//         this.commonService.getCompanyCode(),
//         this.commonService.getBranchCode()
//       )
//       .pipe(takeUntil(this.destroy$))
//       .subscribe((result: any) => {
//         let count = 0;
//         const formVal = this.paymentVoucherForm.value;

//         if (
//           formVal.pmodofpayment === 'CASH' &&
//           !this.bankExists()
//         ) {
//           for (const payment of this.paymentsList) {
//             const amount = parseFloat(
//               this.commonService.removeCommasInAmount(payment.ptotalamount)
//             );
//             for (const r of result) {
//               if (payment.psubledgerid === r.psubledgerid) {
//                 if (
//                   parseFloat(this.cashRestrictAmount) <
//                   r.accountbalance + amount
//                 )
//                   count = 1;
//               }
//             }
//           }
//         }

//         if (count !== 0) {
//           this.commonService.showWarningMessage(
//             `Subledger per day Cash transactions limit below ${this.commonService.currencysymbol}${this.commonService.currencyformat(this.cashRestrictAmount)} only`
//           );
//           this.disableSaveButton.set(false);
//           this.saveButtonLabel.set('Save');
//           return;
//         }

//         if (!confirm('Do You Want To Save ?')) {
//           this.disableSaveButton.set(false);
//           this.saveButtonLabel.set('Save');
//           return;
//         }

//         if (formVal.pmodofpayment === 'CASH') {
//           this.paymentVoucherForm.get('pbankid')?.setValue(0);
//         }

//         this.paymentVoucherForm.get('pipaddress')?.setValue('192.168.2.177');
//         this.paymentVoucherForm.get('pCreatedby')?.setValue(9);
// console.log(this.paymentVoucherForm.value , "formval");

//         const payload = this.buildSavePayload(
//           this.paymentVoucherForm.getRawValue()
//           // this.paymentVoucherForm.value
//         );

//         this.accountingTxService
//           .savePaymentVoucher(payload)
//           // .pipe(takeUntil(this.destroy$))
//           .subscribe({
//             next: (res: any) => {
//               console.log(res, "res");

//               if (res.success === true) {
//                 this.jsonDataItem = res;
//                 this.disableSaveButton.set(false);
//                 this.saveButtonLabel.set('Save');
//                 this.commonService.showInfoMessage('Saved successfully');
//                 this.clearPaymentVoucher();
//                 const receipt = btoa(res.voucherNo + ',' + 'Payment Voucher');
//                 const url = this.router.serializeUrl(
//                   this.router.createUrlTree(['/payment-voucher', receipt])
//                 );
//                 window.open(url, '_blank');
//                 this.commonService.showSuccessMessage();
//               } else {
//                 this.disableSaveButton.set(false);
//                 this.saveButtonLabel.set('Save');
//                 this.commonService.showErrorMessage('Error while saving..!');
//               }
//             },
//             error: (err) => {
//               this.commonService.showErrorMessage(err);
//               this.disableSaveButton.set(false);
//               this.saveButtonLabel.set('Save');
//             },
//           });
//       });
//   }

//   // private buildSavePayload(formVal: any): any {
//   //   return {
//   //     global_schema: this.commonService.getschemaname(),
//   //     branch_schema: this.commonService.getbranchname(),
//   //     company_code: this.commonService.getCompanyCode(),
//   //     branch_code: this.commonService.getBranchCode(),
//   //     ppaymentid: formVal.ppaymentid ?? '',
//   //     ppaymentdate:
//   //       this.commonService.getFormatDateNormal(formVal.ppaymentdate) ?? '',
//   //     pjvdate:
//   //       this.commonService.getFormatDateNormal(formVal.ppaymentdate) ?? '',
//   //     pmodofpayment: formVal.pmodofpayment ?? '',
//   //     ptotalpaidamount: formVal.ptotalpaidamount ?? 0,
//   //     pnarration: formVal.pnarration ?? '',
//   //     subscriberjoinedbranchid: 0,
//   //     bank_id: formVal.pbankid,
//   //     pbankid: formVal.pbankid,
//   //     pBankName: formVal.pbankname ?? '',
//   //     pbranchname: formVal.pbranchname ?? '',
//   //     ptranstype: formVal.ptranstype ?? '',
//   //     ptypeofpayment: formVal.ptypeofpayment ?? '',
//   //     pChequenumber: String(formVal.pChequenumber ?? ''),
//   //     pchequedate:
//   //       this.commonService.getFormatDateNormal(formVal.pchequedate) ?? '',
//   //     pCardNumber: formVal.pCardNumber ?? '',
//   //     pUpiname: formVal.pUpiname ?? '',
//   //     pUpiid: formVal.pUpiid ?? '',
//   //     branchid: String(this.commonService.getbrachid()),
//   //     pCreatedby: 9,
//   //     pipaddress: formVal.pipaddress ?? '',
//   //     pFilename: formVal.pDocStorePath ?? '',
//   //     pFilepath: '',
//   //     pFileformat: '',
//   //     formname: '',
//   //     totalreceivedamount: formVal.ptotalpaidamount?.toString() ?? '0',
//   //     receiptid: '',
//   //     contactid: '',
//   //     contactname: '',

//   //     ppaymentsslistcontrols: this.paymentsList.map((p) => ({
//   //       ppartyid: p.ppartyid ?? 0,
//   //       psubledgerid: p.psubledgerid ?? 0,
//   //       pamount: Number(p.pamount ?? p.ptotalamount ?? 0),
//   //       pistdsapplicable: p.pistdsapplicable ?? false,
//   //       pTdsSection: p.pTdsSection ?? '',
//   //       pTdsPercentage: p.pTdsPercentage?.toString() ?? '0',
//   //       ptdsamount: Number(p.ptdsamount ?? 0),
//   //       pisgstapplicable: p.pisgstapplicable ?? false,
//   //       ptdscalculationtype: p.ptdscalculationtype ?? '',
//   //       ppartyreferenceid: p.ppartyreferenceid ?? '',
//   //       ppartyname: p.ppartyname ?? '',
//   //       pgsttype: p.pgsttype ?? '',
//   //       pgstcalculationtype: p.pgstcalculationtype ?? '',
//   //       pgstpercentage: p.pgstpercentage?.toString() ?? '0',
//   //       pigstamount: p.pigstamount?.toString() ?? '0',
//   //       pcgstamount: p.pcgstamount?.toString() ?? '0',
//   //       psgstamount: p.psgstamount?.toString() ?? '0',
//   //       putgstamount: p.putgstamount?.toString() ?? '0',
//   //       pgstamount: p.pgstamount?.toString() ?? '0',
//   //       pactualpaidamount: p.pamount?.toString() ?? '0',
//   //     })),

//   //     ppaymentslist: this.paymentsList.map((p) => ({
//   //       psubledgerid: p.psubledgerid?.toString() ?? '',
//   //       psubledgername: p.psubledgername ?? '',
//   //       pledgerid: p.pledgerid?.toString() ?? '',
//   //       pledgername: p.pledgername ?? '',
//   //       pamount: p.pamount?.toString() ?? '0',
//   //       pgsttype: p.pgsttype ?? '',
//   //       pgstcalculationtype: p.pgstcalculationtype ?? '',
//   //       pgstpercentage: p.pgstpercentage?.toString() ?? '0',
//   //       pigstamount: p.pigstamount?.toString() ?? '0',
//   //       pcgstamount: p.pcgstamount?.toString() ?? '0',
//   //       psgstamount: p.psgstamount?.toString() ?? '0',
//   //       putgstamount: p.putgstamount?.toString() ?? '0',
//   //       pState: p.pState ?? '',
//   //       pStateId: p.pStateId?.toString() ?? '',
//   //       pgstno: p.pgstno ?? '',
//   //       pgstamount: p.pgstamount?.toString() ?? '0',
//   //       pactualpaidamount: p.pamount?.toString() ?? '0',
//   //       ptotalamount: p.ptotalamount?.toString() ?? '0',
//   //       pisgstapplicable: p.pisgstapplicable?.toString() ?? 'false',
//   //       pTdsSection: p.pTdsSection ?? '',
//   //       pTdsPercentage: p.pTdsPercentage?.toString() ?? '0',
//   //       ppartyname: p.ppartyname ?? '',
//   //       ppartyid: p.ppartyid?.toString() ?? '',
//   //       ppartyreferenceid: p.ppartyreferenceid ?? '',
//   //       ppartyreftype: p.ppartyreftype ?? '',
//   //       pistdsapplicable: p.pistdsapplicable?.toString() ?? 'false',
//   //       ptdsamount: p.ptdsamount?.toString() ?? '0',
//   //       ptdscalculationtype: p.ptdscalculationtype ?? '',
//   //       ppartypannumber: p.ppartypannumber ?? '',
//   //       pChequenumber: String(p.pChequenumber ?? ''),
//   //     })),
//   //   };
//   // }

//   // ─── Journal Entry ────────────────────────────────────────────────────────



//   private buildSavePayload(formVal: any): any {
//     debugger
//     const safe = (val: any, def: any = "") => val ?? def;
//     const str = (val: any) => (val ?? "").toString();

//     return {
//       // ── Schema ─────────────────────────────
//       global_schema: this.commonService.getschemaname(),
//       branch_schema: this.commonService.getbranchname(),
//       company_code: this.commonService.getCompanyCode(),
//       branch_code: this.commonService.getBranchCode(),

//       // ── Core ───────────────────────────────
//       ppaymentid: safe(formVal.ppaymentid),
//       // ppaymentdate: safe(this.datePipe.transform(formVal.ppaymentdate, 'dd-MMM-yyyy')),
//       ppaymentdate: formVal.ppaymentdate
//   ? this.datePipe.transform(formVal.ppaymentdate, 'dd-MMM-yyyy')
//   : "",
//       pjvdate: safe(this.datePipe.transform(formVal.ppaymentdate, 'dd-MMM-yyyy')),
//       // ppaymentdate: safe(this.commonService.getFormatDateNormal(formVal.ppaymentdate)),
//       // pjvdate: safe(this.commonService.getFormatDateNormal(formVal.ppaymentdate)),
//       pmodofpayment: safe(formVal.pmodofpayment),
//       ptotalpaidamount: safe(formVal.ptotalpaidamount, 0),
//       pnarration: safe(formVal.pnarration),
//       subscriberjoinedbranchid: 0,

//       bank_id: safe(formVal.pbankid, 0),
//       pbankid: safe(formVal.pbankid, 0),

//       // ── Bank / Payment ─────────────────────
//       pBankName: safe(formVal.pbankname),
//       pbranchname: safe(formVal.pbranchname),
//       ptranstype: safe(formVal.ptranstype),
//       ptypeofpayment: safe(formVal.ptypeofpayment),

//       pChequenumber: str(formVal.pChequenumber),
//       pchequedate: safe(this.commonService.getFormatDateNormal(formVal.pchequedate)),
//       pchequedepositdate: "",
//       pchequecleardate: "",

//       pCardNumber: safe(formVal.pCardNumber),
//       pUpiname: safe(formVal.pUpiname),
//       pUpiid: safe(formVal.pUpiid),

//       pRecordid: "",
//       pBankconfigurationId: "",
//       pdepositbankid: "",
//       pdepositbankname: "",
//       pAccountnumber: "",

//       branchid: str(this.commonService.getbrachid()),

//       // ── User/System ────────────────────────
//       pCreatedby: 9,
//       pipaddress: safe(formVal.pipaddress),

//       // ── File ──────────────────────────────
//       pFilename: safe(formVal.pDocStorePath),
//       pFilepath: "",
//       pFileformat: "",

//       // ── Contact / Receipt ─────────────────
//       formname: "",
//       totalreceivedamount: str(formVal.ptotalpaidamount || 0),
//       receiptid: "",
//       parentaccountname: "",
//       contactid: "",
//       contactname: "",
//       contactpaytype: "",
//       contactbankname: "",
//       contactbankaccno: "",
//       contactbankbranch: "",
//       contactbankifsc: "",

//       // ── Chit / Required junk fields ───────
//       chitgroupid: "",
//       groupcode: "",
//       ticketno: "",
//       challanaNo: "",
//       pparentid: "",
//       pAccountName: "",
//       pContactReferenceId: "",
//       pPanNumber: "",
//       radioButtonValue: "",
//       checkedChitScheme: "",
//       toChitNo: "",
//       payableValue: "",
//       pinstallment_no: "",
//       pchequeno_scheme: "",
//       pchequedate_scheme: "",
//       bank_name: "",
//       pchequeEntryid: "",

//       // ── Grid 1 ────────────────────────────
//       ppaymentsslistcontrols: this.paymentsList.map((p: any) => ({
//         ppartyid: safe(p.ppartyid, 0),
//         psubledgerid: safe(p.psubledgerid, 0),
//         pamount: Number(p.pamount ?? p.ptotalamount ?? 0),

//         pistdsapplicable: p.pistdsapplicable ?? false,
//         pTdsSection: safe(p.pTdsSection),
//         pTdsPercentage: str(p.pTdsPercentage || 0),
//         ptdsamount: Number(p.ptdsamount || 0),

//         pisgstapplicable: p.pisgstapplicable ?? false,
//         ptdscalculationtype: safe(p.ptdscalculationtype),

//         ppartyreferenceid: safe(p.ppartyreferenceid),
//         ppartyname: safe(p.ppartyname),

//         pgsttype: safe(p.pgsttype),
//         pgstcalculationtype: safe(p.pgstcalculationtype),
//         pgstpercentage: str(p.pgstpercentage || 0),

//         pigstamount: str(p.pigstamount || 0),
//         pcgstamount: str(p.pcgstamount || 0),
//         psgstamount: str(p.psgstamount || 0),
//         putgstamount: str(p.putgstamount || 0),
//         pgstamount: str(p.pgstamount || 0),

//         pactualpaidamount: str(p.pamount || 0),
//       })),

//       // ── Grid 2 (IMPORTANT FIXED) ───────────
//       ppaymentslist: this.paymentsList.map((p: any) => ({
//         id: str(p.id),
//         text: safe(p.text),

//         psubledgerid: str(p.psubledgerid),
//         psubledgername: safe(p.psubledgername),
//         pledgerid: str(p.pledgerid),
//         pledgername: safe(p.pledgername),

//         ptranstype: safe(p.ptranstype),
//         accountbalance: str(p.accountbalance || 0),
//         pAccounttype: safe(p.pAccounttype),

//         legalcellReceipt: safe(p.legalcellReceipt),
//         pbranchcode: safe(p.pbranchcode),
//         pbranchtype: safe(p.pbranchtype),
//         groupcode: safe(p.groupcode),

//         pamount: str(p.pamount || 0),

//         pgsttype: safe(p.pgsttype),
//         pgstcalculationtype: safe(p.pgstcalculationtype),
//         pgstpercentage: str(p.pgstpercentage || 0),

//         pigstamount: str(p.pigstamount || 0),
//         pcgstamount: str(p.pcgstamount || 0),
//         psgstamount: str(p.psgstamount || 0),
//         putgstamount: str(p.putgstamount || 0),

//         pState: safe(p.pState),
//         pStateId: str(p.pStateId),

//         pgstno: safe(p.pgstno),
//         pgstamount: str(p.pgstamount || 0),

//         pigstpercentage: str(p.pigstpercentage || 0),
//         pcgstpercentage: str(p.pcgstpercentage || 0),
//         psgstpercentage: str(p.psgstpercentage || 0),
//         putgstpercentage: str(p.putgstpercentage || 0),

//         pactualpaidamount: str(p.pamount || 0),
//         ptotalamount: str(p.ptotalamount || 0),

//         pisgstapplicable: str(p.pisgstapplicable ?? false),

//         ptdsamountindividual: str(p.ptdsamountindividual || 0),
//         pTdsSection: safe(p.pTdsSection),
//         pTdsPercentage: str(p.pTdsPercentage || 0),

//         preferencetext: safe(p.preferencetext),
//         pgstnumber: safe(p.pgstnumber),

//         ppartyname: safe(p.ppartyname),
//         ppartyid: str(p.ppartyid),
//         ppartyreferenceid: safe(p.ppartyreferenceid),
//         ppartyreftype: safe(p.ppartyreftype),

//         pistdsapplicable: str(p.pistdsapplicable ?? false),
//         ptdsamount: str(p.ptdsamount || 0),
//         ptdscalculationtype: safe(p.ptdscalculationtype),
//         ptdsaccountId: str(p.ptdsaccountId),

//         ppartypannumber: safe(p.ppartypannumber),
//         ptdsrefjvnumber: safe(p.ptdsrefjvnumber),

//         ledgeramount: str(p.ledgeramount || 0),
//         totalreceivedamount: str(p.totalreceivedamount || 0),

//         pFilename: safe(p.pFilename),
//         agentcode: safe(p.agentcode),
//         ticketno: safe(p.ticketno),
//         chitgroupid: safe(p.chitgroupid),

//         schemesubscriberid: safe(p.schemesubscriberid),
//         interbranchsubledgerid: safe(p.interbranchsubledgerid),
//         interbranchid: safe(p.interbranchid),

//         pformname: safe(p.pformname),
//         paccountname: safe(p.paccountname),
//         pgstvoucherno: safe(p.pgstvoucherno),

//         pChequenumber: str(p.pChequenumber)
//       }))
//     };
//   }



//   getPartyJournalEntryData(): void {
//     try {
//       const tdsEntries: any[] = [];
//       this.partyjournalentrylist = [];

//       const ledgerNames = [
//         ...new Set(
//           this.paymentsList.map((p) => p.pledgername).filter(Boolean)
//         ),
//       ];

//       let idx = 1;
//       for (const ledger of ledgerNames) {
//         const ledgerPayments = this.paymentsList.filter(
//           (p) => p.pledgername === ledger
//         );
//         const safe = (v: any) =>
//           Number(this.commonService.removeCommasInAmount(v) || 0);

//         const debit = ledgerPayments.reduce(
//           (s, p) => s + safe(p.pamount) + safe(p.ptdsamount),
//           0
//         );
//         this.partyjournalentrylist.push({
//           type: 'Payment Voucher',
//           accountname: ledger,
//           debitamount: debit,
//           creditamount: 0,
//         });

//         const sections = [...new Set(ledgerPayments.map((p) => p.pTdsSection).filter(Boolean))];
//         for (const sec of sections) {
//           const tdsAmt = ledgerPayments
//             .filter((p) => p.pTdsSection === sec)
//             .reduce((s, p) => s + safe(p.ptdsamount), 0);
//           if (tdsAmt > 0) {
//             tdsEntries.push({
//               type: `Journal Voucher ${idx}`,
//               accountname: `TDS-${sec} RECEIVABLE`,
//               debitamount: tdsAmt,
//               creditamount: 0,
//             });
//           }
//         }

//         const totalTds = ledgerPayments.reduce(
//           (s, p) => s + safe(p.ptdsamount),
//           0
//         );
//         if (totalTds > 0) {
//           tdsEntries.push({
//             type: `Journal Voucher ${idx}`,
//             accountname: ledger,
//             debitamount: 0,
//             creditamount: totalTds,
//           });
//         }
//         idx++;
//       }

//       [
//         { key: 'pigstamount', name: 'P-IGST' },
//         { key: 'pcgstamount', name: 'P-CGST' },
//         { key: 'psgstamount', name: 'P-SGST' },
//         { key: 'putgstamount', name: 'P-UTGST' },
//       ].forEach((gst) => {
//         const total = this.paymentsList.reduce(
//           (s, p) =>
//             s +
//             Number(this.commonService.removeCommasInAmount(p[gst.key]) || 0),
//           0
//         );
//         if (total > 0) {
//           this.partyjournalentrylist.push({
//             type: 'Payment Voucher',
//             accountname: gst.name,
//             debitamount: total,
//             creditamount: 0,
//           });
//         }
//       });

//       const totalPaid = this.paymentsList.reduce(
//         (s, p) =>
//           s + Number(this.commonService.removeCommasInAmount(p.ptotalamount) || 0),
//         0
//       );
//       if (totalPaid > 0) {
//         this.paymentVoucherForm.get('ptotalpaidamount')?.setValue(totalPaid);
//         this.partyjournalentrylist.push({
//           type: 'Payment Voucher',
//           accountname:
//             this.paymentVoucherForm.get('pmodofpayment')?.value === 'CASH'
//               ? 'CASH ON HAND'
//               : 'BANK',
//           debitamount: 0,
//           creditamount: totalPaid,
//         });
//       }

//       this.partyjournalentrylist = [
//         ...this.partyjournalentrylist,
//         ...tdsEntries,
//       ];
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//     }
//   }

//   // ─── File Upload ──────────────────────────────────────────────────────────
//   uploadAndProgress(event: any, files: FileList | null): void {
//     if (!files || files.length === 0) return;
//     const ext = event.target.value.substring(
//       event.target.value.lastIndexOf('.') + 1
//     );
//     if (!this.validateFile(event.target.value)) {
//       this.commonService.showWarningMessage('Upload jpg or png or pdf files');
//       return;
//     }

//     const file = event.target.files[0];
//     if (file) {
//       const reader = new FileReader();
//       reader.readAsDataURL(file);
//       reader.onload = () => {
//         this.imageResponse = {
//           name: file.name,
//           fileType: 'imageResponse',
//           contentType: file.type,
//           size: file.size,
//         };
//       };
//     }

//     const formData = new FormData();
//     for (let i = 0; i < files.length; i++) {
//       formData.append(files[i].name, files[i]);
//       formData.append('NewFileName', `Payment Voucher.${files[i].name.split('.').pop()}`);
//     }

//     this.commonService
//       .fileUploadS3('Account', formData)
//       .pipe(takeUntil(this.destroy$))
//       .subscribe((data: any) => {
//         this.kycFileName = data[0];
//         this.imageResponse.name = data[0];
//         this.paymentVoucherForm.get('pDocStorePath')?.setValue(this.kycFileName);
//       });
//   }

//   validateFile(fileName: string): boolean {
//     if (!fileName) return true;
//     const ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
//     return ['jpg', 'png', 'pdf'].includes(ext);
//   }

//   // ─── Keyboard Helpers ─────────────────────────────────────────────────────
//   allowNumberOnly(event: KeyboardEvent): void {
//     const ctrl = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'];
//     if (ctrl.includes(event.key)) return;
//     const input = event.target as HTMLInputElement;
//     if (event.key === '.' && input.value.includes('.')) {
//       event.preventDefault();
//       return;
//     }
//     if (!/[0-9.]/.test(event.key)) event.preventDefault();
//   }

//   // ─── Getters for template convenience ────────────────────────────────────
//   get lineGroup(): FormGroup {
//     return this.paymentVoucherForm.get('ppaymentsslistcontrols') as FormGroup;
//   }

//   getLineValue(key: string): any {
//     return this.lineGroup?.get(key)?.value ?? 0;
//   }
// }



import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  NgZone,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  CommonModule,
  CurrencyPipe,
  DatePipe,
  DecimalPipe,
} from '@angular/common';

import { Router, RouterModule } from '@angular/router';

import { NgSelectModule } from '@ng-select/ng-select';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { ValidationMessageComponent } from '../../../common/validation-message/validation-message.component';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-payment-voucher-view',
  templateUrl: './payment-voucher-view.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    DatePickerModule,
    CurrencyPipe,
    NgSelectModule,
    TableModule,
    // ValidationMessageComponent,
    ButtonModule,
    RouterModule,
  ],
  providers: [DecimalPipe, CurrencyPipe, DatePipe],
})
export class PaymentVoucherView implements OnInit, OnDestroy {
  pDatepickerMaxDate: any = new Date();
  pDatepickerMinDate: any = new Date();
  // pDatepickerMinDate: Date = new Date(new Date().setFullYear(new Date().getFullYear() - 1));

  // ─── Injected Services ────────────────────────────────────────────────────
  private readonly fb = inject(FormBuilder);
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly datePipe = inject(DatePipe);
  private readonly commonService = inject(CommonService);
  private readonly accountingTxService = inject(AccountsTransactions);
  private readonly subscriberJvService = inject(AccountsTransactions);

  private readonly destroy$ = new Subject<void>();

  // ─── Constants ────────────────────────────────────────────────────────────
  readonly currencyCode = 'INR';
  readonly gstnoPattern =
    '^(0[1-9]|[1-2][0-9]|3[0-9])([a-zA-Z]){5}([0-9]){4}([a-zA-Z]){1}([a-zA-Z0-9]){1}([a-zA-Z]){1}([a-zA-Z0-9]){1}?';

  // ─── Signals (reactive state) ─────────────────────────────────────────────
  readonly showModeofPayment = signal(false);
  readonly showTypeofPayment = signal(false);
  readonly showTransType = signal(false);
  readonly showBankCard = signal(true);
  readonly showBranch = signal(true);
  readonly showFinancial = signal(true);
  readonly showUpi = signal(false);
  readonly showChequeNo = signal(true);
  readonly showGst = signal(true);
  readonly showTds = signal(true);
  readonly showGstAmount = signal(false);
  readonly showIgst = signal(false);
  readonly showCgst = signal(false);
  readonly showSgst = signal(false);
  readonly showUtgst = signal(false);
  readonly showGstNo = signal(false);
  readonly showSubledger = signal(true);
  readonly disableGst = signal(true);
  readonly disableTds = signal(false);
  readonly disableAddButton = signal(false);
  readonly disableSaveButton = signal(false);
  readonly addButtonLabel = signal('Add');
  readonly saveButtonLabel = signal('Save');
  readonly disableTransactionDate = signal(false);
  readonly bankExists = signal(false);

  displayCardName = 'Debit Card';
  displayChequeNo = 'Cheque No';
  currencySymbol = '₹';

  // ─── Data Lists ───────────────────────────────────────────────────────────
  banklist: any[] = [];
  modeOfTransactionsList: any[] = [];
  typeOfPaymentList: any[] = [];
  ledgerAccountsList: any[] = [];
  subLedgerAccountsList: any[] = [];
  partyList: any[] = [];
  gstList: any[] = [];
  tdsList: any[] = [];
  tdsSectionList: any[] = [];
  tdsPercentageList: any[] = [];
  debitCardList: any[] = [];
  stateList: any[] = [];
  chequeNumbersList: any[] = [];
  upiNamesList: any[] = [];
  upiIdList: any[] = [];
  paymentsList: any[] = [];
  paymentsList1: any[] = [];
  partyjournalentrylist: any[] = [];

  paymentListColumnWise: any = {};
  imageResponse: any;
  kycFileName: any;
  jsonDataItem: any = [];
  availableAmount: any;
  cashBalance: any;
  bankBalance: any;
  cashRestrictAmount: any;
  bankBookBalance: any;
  bankPassbookBalance: any;
  ledgerBalance: any;
  subLedgerBalance: any;
  partyBalance: any;
  partyjournalentryList: any;

  private selectedPartyStateName = '';
  private pBankIdSelect: any;
  private pSubLedgerId1: any;

  groups: any[] = [];

  // ─── Datepicker Config ───────────────────────────────────────────────────
  // readonly ppaymentdateConfig: any = {
  //   maxDate: new Date(),
  //   containerClass: 'theme-dark-blue',
  //   dateInputFormat: 'DD-MMM-YYYY',
  //   showWeekNumbers: false,
  // };

  formValidationMessages: Record<string, string> = {};
  paymentVoucherForm!: FormGroup;
  today: Date = new Date();

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.getLoadData();
    this.initBalances();
    this.currencySymbol = this.commonService.currencysymbol;

    if (this.commonService.comapnydetails != null) {
      this.disableTransactionDate.set(
        this.commonService.comapnydetails.pdatepickerenablestatus
      );
    }

    this.disableGst.set(true);
    this.paymentListColumnWise = {};
    this.paymentsList = [];
    this.paymentsList1 = [];
    this.formValidationMessages = {};

    this.buildForm();
    this.modeofPaymentChange();
    this.isgstapplicableChange();
    this.istdsapplicableChange();

    // this.paymentVoucherForm
    //   .get('ppaymentsslistcontrols.ppaymentdate')
    //   ?.setValue(new Date());

    this.paymentVoucherForm.get('ppaymentdate')?.setValue(new Date());


    this.blurEventAllControls(this.paymentVoucherForm);

    this.paymentVoucherForm
      .get('ppaymentsslistcontrols.pgstcalculationtype')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateGstTdsAmounts());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Form Builder ─────────────────────────────────────────────────────────
  private buildForm(): void {
    this.paymentVoucherForm = this.fb.group({
      ppaymentid: [''],
      schemaname: [this.commonService.getschemaname()],
      ppaymentdate: [{ value: this.today, disabled: true }, Validators.required],
      //  ppaymentdate: ['', Validators.required],
      ptotalpaidamount: [''],
      pnarration: ['', Validators.required],
      pmodofpayment: ['CASH'],
      pbankname: [''],
      pbranchname: [''],
      ptranstype: ['CHEQUE'],
      pCardNumber: [''],
      pUpiname: [''],
      pUpiid: [''],
      ptypeofpayment: [''],
      pChequenumber: [''],
      pchequedate: [''],
      pbankid: [''],
      pCreatedby: [this.commonService.getCreatedBy()],
      pStatusname: [this.commonService.pStatusname],
      ptypeofoperation: [this.commonService.ptypeofoperation],
      pipaddress: [this.commonService.getIpAddress()],
      pDocStorePath: [''],
      ppaymentsslistcontrols: this.buildPaymentLineControls(),
    });
  }

  private buildPaymentLineControls(): FormGroup {
    return this.fb.group({
      psubledgerid: [null, Validators.required],
      // psubledgerid: [null],
      psubledgername: [''],
      pledgerid: [null, Validators.required],
      pledgername: ['', Validators.required],
      pamount: [''],
      pactualpaidamount: [
        '',
        [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      ],
      pgsttype: [''],
      pisgstapplicable: [false],
      pgstcalculationtype: [''],
      pgstpercentage: [''],
      pgstamount: [''],
      pigstamount: [''],
      pcgstamount: [''],
      psgstamount: [''],
      putgstamount: [''],
      ppartyname: ['', Validators.required],
      ppartyid: [null, Validators.required],
      ppartyreftype: [''],
      ppartyreferenceid: [''],
      ppartypannumber: [''],
      pistdsapplicable: [false],
      pgstno: [''],
      pTdsSection: [''],
      pTdsPercentage: [''],
      ptdsamount: [''],
      ptdscalculationtype: [''],
      ppannumber: [''],
      pState: [''],
      pStateId: [''],
      pigstpercentage: [''],
      pcgstpercentage: [''],
      psgstpercentage: [''],
      putgstpercentage: [''],
      ptypeofoperation: [this.commonService.ptypeofoperation],
      ptotalamount: [''],
    });
  }

  // ─── Validation Helpers ───────────────────────────────────────────────────
  private blurEventAllControls(group: FormGroup): void {
    try {
      Object.keys(group.controls).forEach((key) => {
        this.setBlurEvent(group, key);
      });
    } catch (e) {
      this.commonService.showErrorMessage(e);
    }
  }

  private setBlurEvent(group: FormGroup, key: string): void {
    try {
      const ctrl = group.get(key);
      if (!ctrl) return;
      if (ctrl instanceof FormGroup) {
        this.blurEventAllControls(ctrl);
      } else if (ctrl.validator) {
        ctrl.valueChanges
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => this.getValidationByControl(group, key, true));
      }
    } catch (e) {
      this.commonService.showErrorMessage(e);
    }
  }

  checkValidations(group: FormGroup, isValid: boolean): boolean {
    try {
      Object.keys(group.controls).forEach((key) => {
        isValid = this.getValidationByControl(group, key, isValid);
      });
    } catch {
      return false;
    }
    return isValid;
  }

  getValidationByControl(
    formGroup: FormGroup,
    key: string,
    isValid: boolean
  ): boolean {
    try {
      let ctrl =
        formGroup.get(key) ??
        (
          this.paymentVoucherForm.get(
            'ppaymentsslistcontrols'
          ) as FormGroup
        )?.get(key);

      if (!ctrl) return isValid;

      if (ctrl instanceof FormGroup) {
        if (key !== 'ppaymentsslistcontrols')
          this.checkValidations(ctrl, isValid);
        return isValid;
      }

      if (ctrl.validator) {
        this.formValidationMessages[key] = '';
        if (ctrl.errors || ctrl.invalid || ctrl.touched || ctrl.dirty) {
          const labelEl = document.getElementById(key) as HTMLInputElement;
          const labelName = labelEl?.title ?? key;
          for (const errKey in ctrl.errors) {
            const msg = this.commonService.getValidationMessage(
              ctrl,
              errKey,
              labelName,
              key,
              ''
            );
            this.formValidationMessages[key] += msg + ' ';
            isValid = false;
          }
        }
      }
    } catch {
      return false;
    }
    return isValid;
  }

  // ─── Balance Helpers ──────────────────────────────────────────────────────
  private initBalances(): void {
    this.bankBookBalance = `${this.currencySymbol} 0.00 Dr`;
    this.bankPassbookBalance = `${this.currencySymbol} 0.00 Dr`;
    this.ledgerBalance = `${this.currencySymbol} 0.00 Dr`;
    this.subLedgerBalance = `${this.currencySymbol} 0.00 Dr`;
    this.partyBalance = `${this.currencySymbol} 0.00 Dr`;
  }

  setBalances(type: string, amount: any): void {
    const abs = Math.abs(parseFloat(amount));
    const formatted =
      parseFloat(amount) < 0
        ? this.commonService.currencyFormat(abs.toFixed(2)) + ' Cr'
        : this.commonService.currencyFormat(
          parseFloat(amount).toFixed(2)
        ) + ' Dr';

    switch (type) {
      case 'CASH':
        this.cashBalance = formatted;
        break;
      case 'BANK':
        this.bankBalance = formatted;
        break;
      case 'BANKBOOK':
        this.bankBookBalance = `${this.currencySymbol} ${formatted}`;
        break;
      case 'PASSBOOK':
        this.bankPassbookBalance = `${this.currencySymbol} ${formatted}`;
        break;
      case 'LEDGER':
        this.ledgerBalance = `${this.currencySymbol} ${formatted}`;
        break;
      case 'SUBLEDGER':
        this.subLedgerBalance = `${this.currencySymbol} ${formatted}`;
        break;
      case 'PARTY':
        this.partyBalance = `${this.currencySymbol} ${formatted}`;
        break;
    }
  }

  // ─── Mode of Payment ──────────────────────────────────────────────────────
  modeofPaymentChange(): void {
    const mode = this.paymentVoucherForm.get('pmodofpayment')?.value;
    if (mode === 'CASH') {
      this.paymentVoucherForm.get('pbankid')?.setValue(0);
      this.showModeofPayment.set(false);
      this.showTransType.set(false);
    } else if (mode === 'BANK') {
      this.paymentVoucherForm.get('ptranstype')?.setValue('CHEQUE');
      this.showModeofPayment.set(true);
      this.showTransType.set(true);
    } else {
      this.showModeofPayment.set(true);
      this.showTransType.set(false);
    }
    this.transofPaymentChange();
    this.getPartyJournalEntryData();
    this.formValidationMessages = {};
  }

  addModeofPaymentValidations(): void {
    const f = this.paymentVoucherForm;
    const get = (k: string) => f.get(k)!;

    if (this.showModeofPayment()) {
      get('pmodofpayment').setValidators(Validators.required);
      get('pbankname').setValidators(Validators.required);

      if (this.showChequeNo()) {
        get('pChequenumber').setValidators([
          Validators.required,
          Validators.maxLength(6),
        ]);
      } else {
        get('pChequenumber').setValidators([
          Validators.required,
          Validators.pattern(/^[0-9]+$/),
          Validators.maxLength(40),
        ]);
      }

      get('ptranstype').setValidators(
        this.showTransType() ? Validators.required : null!
      );
      if (!this.showBankCard()) {
        get('pCardNumber').setValidators(Validators.required);
      } else {
        get('pCardNumber').clearValidators();
      }
      if (this.showTypeofPayment()) {
        get('ptypeofpayment').setValidators(Validators.required);
      } else {
        get('ptypeofpayment').clearValidators();
      }
      if (this.showUpi()) {
        get('pUpiname').setValidators(Validators.required);
        get('pUpiid').setValidators(Validators.required);
      } else {
        get('pUpiname').clearValidators();
        get('pUpiid').clearValidators();
      }
    } else {
      ['pmodofpayment', 'pbankname', 'pChequenumber', 'pUpiname', 'pUpiid', 'ptypeofpayment'].forEach(
        (k) => get(k).clearValidators()
      );
    }

    ['pmodofpayment', 'ptranstype', 'pCardNumber', 'pbankname', 'pChequenumber', 'ptypeofpayment', 'pUpiname', 'pUpiid'].forEach(
      (k) => get(k).updateValueAndValidity()
    );
  }

  transofPaymentChange(): void {
    this.displayCardName = 'Debit Card';
    this.showTypeofPayment.set(false);
    this.showBranch.set(false);
    this.showFinancial.set(false);
    this.showChequeNo.set(false);
    this.showBankCard.set(true);
    this.showUpi.set(false);
    this.displayChequeNo = 'Reference No.';

    const transType = this.paymentVoucherForm.get('ptranstype')?.value;
    if (transType === 'CHEQUE') {
      this.showBankCard.set(true);
      this.displayChequeNo = 'Cheque No.';
      this.showBranch.set(true);
      this.showChequeNo.set(true);
    } else if (transType === 'ONLINE') {
      this.showBankCard.set(true);
      this.showTypeofPayment.set(true);
    } else if (transType === 'DEBIT CARD') {
      this.showBankCard.set(false);
      this.showFinancial.set(true);
    } else {
      this.displayCardName = 'Credit Card';
      this.showBankCard.set(false);
      this.showFinancial.set(true);
    }

    this.addModeofPaymentValidations();
    this.clearTransTypeDetails();
    this.formValidationMessages = {};

    ['pbankname', 'pChequenumber', 'pbranchname', 'pCardNumber', 'ptypeofpayment', 'pUpiname', 'pUpiid'].forEach(
      (f) => this.paymentVoucherForm.get(f)?.markAsUntouched()
    );
  }

  typeofPaymentChange(): void {
    const isUpi =
      this.paymentVoucherForm.get('ptypeofpayment')?.value === 'UPI';
    this.showUpi.set(isUpi);

    const upiName = this.paymentVoucherForm.get('pUpiname')!;
    const upiId = this.paymentVoucherForm.get('pUpiid')!;
    if (isUpi) {
      upiName.setValidators(Validators.required);
      upiId.setValidators(Validators.required);
    } else {
      upiName.clearValidators();
      upiId.clearValidators();
    }
    upiName.updateValueAndValidity();
    upiId.updateValueAndValidity();
    this.getValidationByControl(this.paymentVoucherForm, 'ptypeofpayment', true);
  }

  // ─── GST ─────────────────────────────────────────────────────────────────
  isgstapplicable_Checked(): void {
    const group = this.paymentVoucherForm.get(
      'ppaymentsslistcontrols'
    ) as FormGroup;
    group.get('pStateId')?.setValue('');
    this.gstClear();

    const partyName = group.get('ppartyname')?.value;
    const existing = this.paymentsList.find((x) => x.ppartyname === partyName);
    if (existing) {
      group.get('pisgstapplicable')?.setValue(existing.pisgstapplicable);
    }
    this.isgstapplicableChange();
  }

  isgstapplicableChange(): void {
    const group = this.paymentVoucherForm.get(
      'ppaymentsslistcontrols'
    ) as FormGroup;
    const isGst = group.get('pisgstapplicable')?.value;

    const gstCalc = group.get('pgstcalculationtype');
    const gstPct = group.get('pgstpercentage');
    const stateCtrl = group.get('pStateId');
    const gstAmt = group.get('pgstamount');

    if (isGst) {
      this.showGst.set(true);
      gstCalc?.setValue('EXCLUDE');
      gstCalc?.setValidators(Validators.required);
      gstPct?.setValidators(Validators.required);
      stateCtrl?.setValidators(Validators.required);
      gstAmt?.setValidators(Validators.required);
      this.calculateGstTdsAmounts();
    } else {
      this.showGst.set(false);
      group.patchValue({
        pgstcalculationtype: null,
        pgstpercentage: null,
        pStateId: null,
        pgstamount: 0,
        pigstpercentage: 0,
        pigstamount: 0,
        pcgstpercentage: 0,
        pcgstamount: 0,
        psgstpercentage: 0,
        psgstamount: 0,
        putgstpercentage: 0,
        putgstamount: 0,
        pgstno: '',
      });
      gstCalc?.clearValidators();
      gstPct?.clearValidators();
      stateCtrl?.clearValidators();
      gstAmt?.clearValidators();
    }

    [gstCalc, gstPct, stateCtrl, gstAmt].forEach((c) =>
      c?.updateValueAndValidity()
    );
  }

  // ─── TDS ─────────────────────────────────────────────────────────────────
  istdsapplicable_Checked(): void {
    const group = this.paymentVoucherForm.get(
      'ppaymentsslistcontrols'
    ) as FormGroup;
    const partyName = group.get('ppartyname')?.value;
    if (!partyName) {
      this.istdsapplicableChange();
      return;
    }
    const existing = this.paymentsList.find((x) => x.ppartyname === partyName);
    if (existing) {
      group.get('pistdsapplicable')?.setValue(existing.pistdsapplicable);
    }
    this.istdsapplicableChange();
  }

  istdsapplicableChange(): void {
    const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
    const isTds = group?.get('pistdsapplicable')?.value;

    const tdsCalc = group?.get('ptdscalculationtype');
    const tdsPct = group?.get('pTdsPercentage');
    const section = group?.get('pTdsSection');
    const tdsAmt = group?.get('ptdsamount');

    if (isTds) {
      this.showTds.set(true);
      if (!this.disableTds()) tdsCalc?.setValue('INCLUDE');
      tdsCalc?.setValidators(Validators.required);
      tdsPct?.setValidators(Validators.required);
      section?.setValidators(Validators.required);
      tdsAmt?.setValidators(Validators.required);
    } else {
      this.showTds.set(false);
      group?.patchValue({
        ptdscalculationtype: null,
        pTdsSection: null,
        pTdsPercentage: null,
        ptdsamount: 0,
      });
      tdsCalc?.clearValidators();
      tdsPct?.clearValidators();
      section?.clearValidators();
      tdsAmt?.clearValidators();
    }

    [tdsCalc, tdsPct, section, tdsAmt].forEach((c) =>
      c?.updateValueAndValidity()
    );
    this.calculateGstTdsAmounts();
  }

  // ─── Data Loading ─────────────────────────────────────────────────────────
  getLoadData(): void {
    this.accountingTxService
      .GetReceiptsandPaymentsLoadingData2(
        'PAYMENT VOUCHER',
        this.commonService.getbranchname(),
        this.commonService.getschemaname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode(),
        'taxes'
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (json: any) => {
          if (!json) return;
          this.banklist = json.banklist;
          this.modeOfTransactionsList = json.modeofTransactionslist;
          this.typeOfPaymentList = this.getTypeOfPaymentData();
          this.ledgerAccountsList = json.accountslist;
          this.partyList = json.partylist;
          this.gstList = json.gstlist;
          this.debitCardList = json.bankdebitcardslist;
          this.setBalances('CASH', json.cashbalance);
          this.setBalances('BANK', json.bankbalance);
          this.cashRestrictAmount = json.cashRestrictAmount;
        },
        error: (err) => this.commonService.showErrorMessage(err),
      });
  }

  getTypeOfPaymentData(): any[] {
    return this.modeOfTransactionsList.filter(
      (p) => p.ptranstype !== p.ptypeofpayment
    );
  }

  // ─── Bank ─────────────────────────────────────────────────────────────────
  bankName_Change(event: any): void {
    const pbankid = event?.pbankid;
    const bankname = event?.pbankname;
    this.pBankIdSelect = pbankid;
    this.paymentVoucherForm.get('pbankid')?.setValue(pbankid);

    this.upiNamesList = [];
    this.chequeNumbersList = [];
    this.paymentVoucherForm.get('pChequenumber')?.setValue('');
    this.paymentVoucherForm.get('pUpiname')?.setValue('');
    this.paymentVoucherForm.get('pUpiid')?.setValue('');

    if (pbankid) {
      this.getBankDetailsById(pbankid);
      this.getBankBranchName(pbankid);
      this.paymentVoucherForm.get('pbankname')?.setValue(bankname);
    } else {
      this.paymentVoucherForm.get('pbankid')?.setValue('');
      this.paymentVoucherForm.get('pbankname')?.setValue('');
    }
    this.getValidationByControl(this.paymentVoucherForm, 'pbankname', true);
  }

  getBankBranchName(pbankid: any): void {
    const bank = this.banklist.find((b) => b.pbankid == pbankid);
    if (!bank) return;
    this.paymentVoucherForm.get('pbranchname')?.setValue(bank.pbranchname);
    this.setBalances('BANKBOOK', bank.pbankbalance);
    this.setBalances('PASSBOOK', bank.pbankpassbookbalance);
  }

  getBankDetailsById(pbankid: any): void {
    this.accountingTxService
      .GetBankDetailsbyId1(
        pbankid,
        this.commonService.getbranchname(),
        this.commonService.getschemaname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (json: any) => {
          if (!json) return;
          this.upiNamesList = json.bankupilist;
          this.chequeNumbersList = json.chequeslist;
        },
        error: () => this.commonService.showErrorMessage('Bank API Error'),
      });
  }

  chequeNumber_Change(): void {
    const ctrl = this.paymentVoucherForm.get('pChequenumber');
    ctrl?.markAsTouched();
    if (!this.showChequeNo()) {
      const numericOnly = (ctrl?.value || '').replace(/[^0-9]/g, '');
      if (ctrl?.value !== numericOnly) ctrl?.setValue(numericOnly);
    }
    this.getValidationByControl(this.paymentVoucherForm, 'pChequenumber', true);
  }

  debitCard_Change(): void {
    const data = this.getbankname(
      this.paymentVoucherForm.get('pCardNumber')?.value
    );
    this.paymentVoucherForm.get('pbankname')?.setValue(data?.pbankname);
    this.paymentVoucherForm.get('pbankid')?.setValue(data?.pbankid);
    this.getValidationByControl(this.paymentVoucherForm, 'pCardNumber', true);
  }

  getbankname(cardNumber: any): any {
    const data = this.debitCardList.find((d) => d.pCardNumber === cardNumber);
    if (data) this.getBankBranchName(data.pbankid);
    return data ?? null;
  }

  // ─── Ledger / Subledger ───────────────────────────────────────────────────
  ledgerName_Change(event: any): void {
    const group = this.paymentVoucherForm.get(
      'ppaymentsslistcontrols'
    ) as FormGroup;
    const pledgerid = event?.pledgerid;

    this.subLedgerAccountsList = [];
    group.get('psubledgerid')?.setValue(null);
    group.get('psubledgername')?.setValue('');
    group.get('pledgername')?.setValue('');
    this.ledgerBalance = `${this.currencySymbol} 0.00 Dr`;
    this.subLedgerBalance = `${this.currencySymbol} 0.00 Dr`;

    if (!pledgerid) {
      this.setBalances('LEDGER', 0);
      this.showSubledger.set(false);
      return;
    }

    const ledger = this.ledgerAccountsList.find(
      (l) => l.pledgerid === pledgerid
    );
    if (ledger) this.setBalances('LEDGER', ledger.accountbalance);

    this.getSubLedgerData(pledgerid);
    group.get('pledgername')?.setValue(event.pledgername);

    const isRequired = this.subLedgerAccountsList?.length > 0;
    this.showSubledger.set(isRequired);
    if (isRequired) {
      group.get('psubledgerid')?.setValidators([Validators.required]);
    } else {
      group.get('psubledgerid')?.clearValidators();
    }
    group.get('psubledgerid')?.updateValueAndValidity();
  }

  getSubLedgerData(pledgerid: any): void {
    const group = this.paymentVoucherForm.get(
      'ppaymentsslistcontrols'
    ) as FormGroup;

    this.accountingTxService
      .GetSubLedgerData3(
        pledgerid,
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getbranchname(),
        this.commonService.getBranchCode(),
        this.commonService.getschemaname()
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (json: any) => {
          if (!json) return;
          this.subLedgerAccountsList = json.map((item: any) => ({
            subledgername: item.psubledgername,
            subledgerid: item.psubledgerid,
            accountbalance: item.accountbalance,
          }));

          // const subCtrl = group.get('psubledgername');
          // if (this.subLedgerAccountsList.length > 0) {
          //   this.showSubledger.set(true);
          //   subCtrl?.setValidators(Validators.required);
          // } else {
          //   this.showSubledger.set(false);
          //   subCtrl?.clearValidators();
          //   group.get('psubledgerid')?.setValue(pledgerid);
          //   subCtrl?.setValue(group.get('pledgername')?.value);
          //   this.formValidationMessages['psubledgername'] = '';
          // }
          // subCtrl?.updateValueAndValidity();


          const subCtrl = group.get('psubledgerid');

          if (this.subLedgerAccountsList.length > 0) {
            this.showSubledger.set(true);
            subCtrl?.setValidators(Validators.required);
          } else {
            this.showSubledger.set(false);
            subCtrl?.clearValidators();

            group.get('psubledgerid')?.setValue(pledgerid);
            group.get('psubledgername')?.setValue(group.get('pledgername')?.value);

            this.formValidationMessages['psubledgerid'] = '';
          }

          subCtrl?.updateValueAndValidity();
        },
        error: (err) => this.commonService.showErrorMessage(err),
      });
  }

  subledger_Change(event: any): void {
    const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
    const psubledgerid = event?.subledgerid;
    this.subLedgerBalance = '';

    if (psubledgerid) {
      group?.get('psubledgerid')?.setValue(psubledgerid);
      const data = this.subLedgerAccountsList.find(
        (l) => l.subledgerid === psubledgerid
      );
      if (data) this.setBalances('SUBLEDGER', data.accountbalance);
    } else {
      group?.get('psubledgername')?.setValue('');
      this.setBalances('SUBLEDGER', 0);
    }

    this.getValidationByControl(
      this.paymentVoucherForm,
      'psubledgername',
      true
    );
  }

  // ─── Party ────────────────────────────────────────────────────────────────
  partyName_Change(event: any): void {
    const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
    const ppartyid = event?.ppartyid;

    this.availableAmount = 0;
    this.stateList = [];
    this.tdsSectionList = [];
    this.tdsPercentageList = [];
    this.partyjournalentrylist = [];
    this.partyBalance = '';

    group?.patchValue({
      pStateId: '',
      pState: '',
      pTdsSection: '',
      pTdsPercentage: '',
      ppartyreferenceid: '',
      ppartyreftype: '',
      ppartypannumber: '',
    });

    const transDate = this.commonService.getFormatDateNormal(
      this.paymentVoucherForm.get('ppaymentdate')?.value
    );

    this.accountingTxService
      .GetCashRestrictAmountpercontact1(
        'PAYMENT VOUCHER',
        'KGMS',
        this.commonService.getbranchname(),
        ppartyid,
        transDate,
        this.commonService.getCompanyCode(),
        this.commonService.getschemaname(),
        this.commonService.getBranchCode()
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe((amt: number) => {
        this.availableAmount = this.cashRestrictAmount - amt;
      });

    if (ppartyid) {
      this.selectedPartyStateName = event.state_name ?? '';
      group?.get('ppartyname')?.setValue(event.ppartyname);

      const partyData = this.partyList.find((x) => x.ppartyid === ppartyid);
      if (partyData) {
        group?.patchValue({
          ppartyreferenceid: partyData.ppartyreferenceid,
          ppartyreftype: partyData.ppartyreftype,
          ppartypannumber: partyData.pan_no,
        });
      }

      this.getPartyDetailsById(ppartyid, event.ppartyname);
      this.setEnableOrDisableTdsGst(event.ppartyname, 'PARTYCHANGE');
      this.disableGst.set(false);
    } else {
      this.setBalances('PARTY', 0);
      group?.get('ppartyname')?.setValue('');
      this.disableGst.set(true);
    }
  }

  setEnableOrDisableTdsGst(ppartyname: string, changetype: string): void {
    const group = this.paymentVoucherForm.get(
      'ppaymentsslistcontrols'
    ) as FormGroup;
    group.patchValue({
      pistdsapplicable: false,
      pisgstapplicable: false,
      pgstcalculationtype: '',
      ptdscalculationtype: '',
    });

    const matched = this.paymentsList.filter((x) => x.ppartyname === ppartyname);
    if (matched.length > 0) {
      const data = matched[0];
      this.disableGst.set(true);
      this.disableTds.set(true);
      group.patchValue({
        pistdsapplicable: data.pistdsapplicable,
        pisgstapplicable: data.pisgstapplicable,
        pgstcalculationtype: data.pgstcalculationtype,
        ptdscalculationtype: data.ptdscalculationtype,
      });
    } else {
      this.disableGst.set(false);
      this.disableTds.set(false);
    }

    if (changetype === 'PARTYCHANGE') {
      this.isgstapplicableChange();
      this.istdsapplicableChange();
    }
  }

  getPartyDetailsById(ppartyid: any, _partyName: string): void {
    this.accountingTxService
      .getPartyDetailsbyid(
        ppartyid,
        this.commonService.getbranchname(),
        this.commonService.getBranchCode(),
        this.commonService.getCompanyCode(),
        this.commonService.getschemaname(),
        'taxes'
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (json: any) => {
          if (!json) return;
          this.tdsSectionList = [];
          this.tdsList = json.lstTdsSectionDetails ?? [];
          const uniqueSections = [
            ...new Set(this.tdsList.map((i: any) => i.pTdsSection)),
          ];
          this.tdsSectionList = uniqueSections.map((s) => ({ pTdsSection: s }));

          const partyState = (this.selectedPartyStateName ?? '').toLowerCase().trim();
          if (partyState && json.statelist?.length) {
            this.stateList = json.statelist.filter((st: any) => {
              const s = (st.pState ?? st.pStatename ?? '').toLowerCase().trim();
              return (
                s === partyState ||
                s.includes(partyState) ||
                partyState.includes(s)
              );
            });
          } else {
            this.stateList = [];
          }
          this.calculateGstTdsAmounts();
          this.setBalances('PARTY', json.accountbalance);
        },
        error: (err) => this.commonService.showErrorMessage(err),
      });
  }

  // ─── UPI ─────────────────────────────────────────────────────────────────
  upiName_Change(event: any): void {
    const upiname = event?.target?.value;
    this.upiIdList = this.upiNamesList.filter((r) => r.pUpiname === upiname);
    this.getValidationByControl(this.paymentVoucherForm, 'pUpiname', true);
  }

  upiId_Change(): void {
    this.getValidationByControl(this.paymentVoucherForm, 'pUpiid', true);
  }

  // ─── TDS Section / Percentage ─────────────────────────────────────────────
  tdsSection_Change(event: any): void {
    const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
    const ptdssection = event?.pTdsSection;
    this.tdsPercentageList = [];
    group?.get('pTdsPercentage')?.setValue('');
    if (ptdssection) this.getTdsPercentage(ptdssection);
    this.getValidationByControl(this.paymentVoucherForm, 'pTdsSection', true);
  }

  getTdsPercentage(ptdssection: any): void {
    this.tdsPercentageList = this.tdsList.filter(
      (r) => r.pTdsSection === ptdssection
    );
    this.calculateGstTdsAmounts();
  }

  tds_Change(_event: any): void {
    this.getValidationByControl(this.paymentVoucherForm, 'pTdsPercentage', true);
    this.getValidationByControl(this.paymentVoucherForm, 'ptdsamount', true);
    this.calculateGstTdsAmounts();
  }

  // ─── GST Percentage ───────────────────────────────────────────────────────
  gst_Change(event: any): void {
    const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
    ['pigstpercentage', 'pcgstpercentage', 'psgstpercentage', 'putgstpercentage'].forEach(
      (k) => group?.get(k)?.setValue('')
    );

    if (event) {
      this.getGstPercentage(event);
      this.calculateGstTdsAmounts();
    } else {
      ['pgstamount', 'pigstamount', 'pcgstamount', 'psgstamount', 'putgstamount', 'pamount', 'ptotalamount'].forEach(
        (k) => group?.get(k)?.setValue(null)
      );
    }

    this.getValidationByControl(this.paymentVoucherForm, 'pgstpercentage', true);
    this.getValidationByControl(this.paymentVoucherForm, 'pgstamount', true);
  }

  getGstPercentage(gstpercentage: any): void {
    const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
    const data = this.gstList.find((g) => g.pgstpercentage === gstpercentage);
    if (data) {
      group?.patchValue({
        pigstpercentage: data.pigstpercentage,
        pcgstpercentage: data.pcgstpercentage,
        psgstpercentage: data.psgstpercentage,
        putgstpercentage: data.putgstpercentage,
      });
    }
    this.calculateGstTdsAmounts();
  }

  gstClear(): void {
    const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
    ['pigstpercentage', 'pcgstpercentage', 'psgstpercentage', 'putgstpercentage', 'pgstpercentage', 'pgstno'].forEach(
      (k) => group?.get(k)?.setValue('')
    );
  }

  // ─── State ────────────────────────────────────────────────────────────────
  state_Change(event: any): void {
    const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
    const pstateid = event?.pStateId;
    const gst = event?.gstnumber;

    this.gstClear();

    if (pstateid) {
      group?.get('pState')?.setValue(event.pState);
      this.showGstNo.set(!gst);

      const data = this.getStateDetailsById(pstateid);
      this.showGstAmount.set(true);
      this.showIgst.set(false);
      this.showCgst.set(false);
      this.showSgst.set(false);
      this.showUtgst.set(false);

      group?.get('pgsttype')?.setValue(data?.pgsttype);
      group?.get('pgstno')?.setValue(data?.gstnumber);

      if (data?.pgsttype === 'IGST') {
        this.showIgst.set(true);
      } else {
        this.showCgst.set(true);
        if (data?.pgsttype === 'CGST,SGST') this.showSgst.set(true);
        if (data?.pgsttype === 'CGST,UTGST') this.showUtgst.set(true);
      }
    } else {
      group?.get('pState')?.setValue('');
    }

    this.getValidationByControl(this.paymentVoucherForm, 'pState', true);
    this.formValidationMessages['pigstpercentage'] = '';
    this.calculateGstTdsAmounts();
  }

  getStateDetailsById(pstateid: any): any {
    return this.stateList.find((s) => s.pStateId == pstateid);
  }

  gstNo_Change(): void {
    this.getValidationByControl(this.paymentVoucherForm, 'pgstno', true);
  }

  // ─── Calculation ─────────────────────────────────────────────────────────
  pamount_change(): void {
    this.calculateGstTdsAmounts();
  }

  calculateGstTdsAmounts(): void {
    try {
      const group = this.paymentVoucherForm.get('ppaymentsslistcontrols');
      const safe = (val: any): number =>
        parseFloat((val || '0').toString().replace(/,/g, '')) || 0;

      const paidAmount = safe(group?.get('pactualpaidamount')?.value);
      const gstType = group?.get('pgsttype')?.value;
      const gstPct = safe(group?.get('pgstpercentage')?.value);
      const isTds = group?.get('pistdsapplicable')?.value;
      const tdsPct = safe(group?.get('pTdsPercentage')?.value);

      let taxable = 0;
      let gstAmt = 0;
      let igst = 0, cgst = 0, sgst = 0, utgst = 0, tds = 0;

      taxable =
        gstPct > 0 || tdsPct > 0
          ? Math.round((paidAmount * 100) / (100 + gstPct - tdsPct))
          : paidAmount;

      if (gstPct > 0) {
        gstAmt = Math.round((taxable * gstPct) / 100);
        if (gstType === 'IGST') igst = gstAmt;
        else if (gstType === 'CGST,SGST') {
          cgst = Math.round(gstAmt / 2);
          sgst = Math.round(gstAmt / 2);
        } else if (gstType === 'CGST,UTGST') {
          cgst = Math.round(gstAmt / 2);
          utgst = Math.round(gstAmt / 2);
        }
      }

      if (isTds && tdsPct > 0) {
        tds = Math.round((taxable * tdsPct) / 100);
      }

      const net = Math.round(taxable + gstAmt - tds);
      const total = Math.round(taxable + gstAmt);

      group?.patchValue({
        ptaxableamount: taxable,
        pgstamount: gstAmt,
        pigstamount: igst,
        pcgstamount: cgst,
        psgstamount: sgst,
        putgstamount: utgst,
        ptdsamount: tds,
        ptotalamount: total,
        pamount: net,
      });

      this.formValidationMessages['pamount'] = '';
    } catch (e) {
      this.commonService.showErrorMessage(e);
    }
  }

  // ─── Add / Remove Row ─────────────────────────────────────────────────────
  // addPaymentDetails(): void {
  //   debugger;
  //   const round = (n: number) =>
  //     Math.round((n + Number.EPSILON) * 100) / 100;

  //   this.disableAddButton.set(true);
  //   this.addButtonLabel.set('Processing');

  //   const ctrl = this.paymentVoucherForm.get(
  //     'ppaymentsslistcontrols'
  //   ) as FormGroup;

  //   const ppartyid = ctrl.get('ppartyid')?.value;
  //   const pledgerid = ctrl.get('pledgerid')?.value;
  //   const pactualpaidamount = ctrl.get('pactualpaidamount')?.value;
  //   const subledgerid = ctrl.get('psubledgerid')?.value;

  //   if (!ppartyid) return this.showAddError('Please select Party');
  //   if (!pledgerid) return this.showAddError('Please select Ledger');
  //   if (!pactualpaidamount || parseFloat(pactualpaidamount) <= 0)
  //     return this.showAddError('Please enter Amount');

  //   const isgst = ctrl.get('pisgstapplicable')?.value;
  //   if (isgst) {
  //     if (!ctrl.get('pgstcalculationtype')?.value)
  //       return this.showAddError('Please select GST Calculation Type');
  //     if (!ctrl.get('pStateId')?.value)
  //       return this.showAddError('Please select State');
  //     if (!ctrl.get('pgstpercentage')?.value)
  //       return this.showAddError('Please select GST Percentage');
  //   }

  //   const istds = ctrl.get('pistdsapplicable')?.value;
  //   if (istds) {
  //     if (!ctrl.get('ptdscalculationtype')?.value)
  //       return this.showAddError('Please select TDS Calculation Type');
  //     if (!ctrl.get('pTdsSection')?.value)
  //       return this.showAddError('Please select TDS Section');
  //     if (!ctrl.get('pTdsPercentage')?.value)
  //       return this.showAddError('Please select TDS Percentage');
  //   }

  //   const isSubledgerRequired = this.subLedgerAccountsList?.length > 0;
  //   if (isSubledgerRequired && !subledgerid)
  //     return this.showAddError('Please select Subledger');

  //   const selectedSub =
  //     this.subLedgerAccountsList?.find((x) => x.subledgerid === subledgerid) ??
  //     null;

  //   const currentRow = {
  //     ppartyname: ctrl.get('ppartyname')?.value,
  //     pledgername: ctrl.get('pledgername')?.value,
  //     psubledgerid: selectedSub?.subledgerid ?? subledgerid,
  //     psubledgername: selectedSub?.subledgername ?? '',
  //     ptotalamount: round(
  //       parseFloat(
  //         this.commonService.removeCommasInAmount(
  //           ctrl.get('ptotalamount')?.value ?? '0'
  //         )
  //       )
  //     ),
  //     pamount: round(
  //       parseFloat(
  //         this.commonService.removeCommasInAmount(
  //           ctrl.get('pamount')?.value ?? '0'
  //         )
  //       )
  //     ),
  //     pgstcalculationtype: isgst ? ctrl.get('pgstcalculationtype')?.value : null,
  //     pgsttype: isgst ? ctrl.get('pgsttype')?.value : null,
  //     pgstpercentage: isgst ? ctrl.get('pgstpercentage')?.value ?? 0 : 0,
  //     pgstamount: isgst
  //       ? round(parseFloat(ctrl.get('pgstamount')?.value ?? '0'))
  //       : 0,
  //     pisgstapplicable: isgst ?? false,
  //     pTdsSection: istds ? ctrl.get('pTdsSection')?.value : null,
  //     pTdsPercentage: istds ? ctrl.get('pTdsPercentage')?.value ?? 0 : 0,
  //     ptdsamount: istds
  //       ? round(
  //         parseFloat(
  //           this.commonService.removeCommasInAmount(
  //             ctrl.get('ptdsamount')?.value ?? '0'
  //           )
  //         )
  //       )
  //       : 0,
  //     ptdscalculationtype: istds ? ctrl.get('ptdscalculationtype')?.value : null,
  //     pistdsapplicable: istds ?? false,
  //     ppartyid,
  //     pledgerid,
  //     pStateId: isgst ? ctrl.get('pStateId')?.value ?? 0 : 0,
  //     pState: isgst ? ctrl.get('pState')?.value ?? '' : '',
  //     pgstno: isgst ? ctrl.get('pgstno')?.value ?? '' : '',
  //     ppartyreferenceid: ctrl.get('ppartyreferenceid')?.value ?? '',
  //     ppartyreftype: ctrl.get('ppartyreftype')?.value ?? '',
  //     ppartypannumber: ctrl.get('ppartypannumber')?.value ?? '',
  //   };

  //   if (!this.validateAddPaymentDetails(currentRow)) {
  //     this.resetAddButton();
  //     return;
  //   }

  //   const paidAmount = round(
  //     parseFloat(
  //       this.commonService.removeCommasInAmount(pactualpaidamount ?? '0')
  //     )
  //   );

  //   if (isSubledgerRequired) {
  //     this.subscriberJvService
  //       .GetdebitchitCheckbalance(
  //         this.commonService.getbranchname(),
  //         pledgerid,
  //         36,
  //         subledgerid,
  //         this.commonService.getschemaname(),
  //         this.commonService.getCompanyCode(),
  //         this.commonService.getBranchCode()
  //       )
  //       .pipe(takeUntil(this.destroy$))
  //       .subscribe({
  //         next: (result: any) => {
  //           if (
  //             result?.balancecheckstatus &&
  //             paidAmount > parseFloat(result?.balanceamount ?? '0')
  //           ) {
  //             this.showAddError(
  //               'Enter the amount less or equal to subledger amount'
  //             );
  //             return;
  //           }
  //           this.savePaymentRow(currentRow, ctrl);
  //         },
  //         error: (err) => this.showAddError(err),
  //       });
  //   } else {
  //     this.savePaymentRow(currentRow, ctrl);
  //   }
  // }

  validateAddPaymentDetails(currentRow: any): boolean {
    debugger;
    let isValid = true;
    try {
      const { pledgername, psubledgername, psubledgerid, ppartyid } =
        currentRow;
      let count = 0,
        fixedCount = 0,
        bankCount = 0;

      for (const row of this.paymentsList) {
        if (row === currentRow) continue;
        if (
          pledgername === 'FIXED DEPOSIT RECEIPTS-CHITS' &&
          this.paymentsList.length > 0
        ) {
          count = fixedCount = 1;
          break;
        }
        if (
          row.pledgername === 'FIXED DEPOSIT RECEIPTS-CHITS' ||
          (row.pledgername === pledgername &&
            row.psubledgername === psubledgername &&
            row.ppartyid === ppartyid)
        ) {
          if (row.pledgername === 'FIXED DEPOSIT RECEIPTS-CHITS')
            fixedCount = 1;
          count = 1;
          break;
        }
        for (const bank of this.banklist) {
          if (
            bank.paccountid === row.psubledgerid ||
            bank.paccountid === psubledgerid
          ) {
            count = bankCount = 1;
            break;
          }
        }
      }

      if (count === 1) {
        if (fixedCount === 1)
          this.commonService.showWarningMessage(
            'Fixed deposit receipts accepts only one record in the grid'
          );
        else if (bankCount === 1)
          this.commonService.showWarningMessage(
            'Bank Accounts only one record in the grid'
          );
        else
          this.commonService.showWarningMessage(
            'Ledger, subledger and party already exists in the grid.'
          );
        isValid = false;
      }
    } catch (e) {
      this.commonService.showErrorMessage(e);
      isValid = false;
    }
    return isValid;
  }



  addPaymentDetails(): void {
    debugger;
    const round = (n: number) =>
      Math.round((n + Number.EPSILON) * 100) / 100;

    // ── ADD THIS: mark all controls touched so validation messages appear ──
    const ctrl = this.paymentVoucherForm.get(
      'ppaymentsslistcontrols'
    ) as FormGroup;
    ctrl.markAllAsTouched();
    Object.keys(ctrl.controls).forEach(key =>
      this.getValidationByControl(ctrl, key, true)
    );
    // ──────────────────────────────────────────────────────────────────────

    this.disableAddButton.set(true);
    this.addButtonLabel.set('Processing');

    const ppartyid = ctrl.get('ppartyid')?.value;
    const pledgerid = ctrl.get('pledgerid')?.value;
    const pactualpaidamount = ctrl.get('pactualpaidamount')?.value;
    const subledgerid = ctrl.get('psubledgerid')?.value;

    if (!ppartyid) return this.showAddError('Please select Party');
    if (!pledgerid) return this.showAddError('Please select Ledger');
    if (!pactualpaidamount || parseFloat(pactualpaidamount) <= 0)
      return this.showAddError('Please enter Amount');

    const isgst = ctrl.get('pisgstapplicable')?.value;
    if (isgst) {
      if (!ctrl.get('pgstcalculationtype')?.value)
        return this.showAddError('Please select GST Calculation Type');
      if (!ctrl.get('pStateId')?.value)
        return this.showAddError('Please select State');
      if (!ctrl.get('pgstpercentage')?.value)
        return this.showAddError('Please select GST Percentage');
    }

    const istds = ctrl.get('pistdsapplicable')?.value;
    if (istds) {
      if (!ctrl.get('ptdscalculationtype')?.value)
        return this.showAddError('Please select TDS Calculation Type');
      if (!ctrl.get('pTdsSection')?.value)
        return this.showAddError('Please select TDS Section');
      if (!ctrl.get('pTdsPercentage')?.value)
        return this.showAddError('Please select TDS Percentage');
    }

    const isSubledgerRequired = this.subLedgerAccountsList?.length > 0;
    if (isSubledgerRequired && !subledgerid)
      return this.showAddError('Please select Subledger');

    const selectedSub =
      this.subLedgerAccountsList?.find((x) => x.subledgerid === subledgerid) ??
      null;

    const currentRow = {
      ppartyname: ctrl.get('ppartyname')?.value,
      pledgername: ctrl.get('pledgername')?.value,
      psubledgerid: selectedSub?.subledgerid ?? subledgerid,
      psubledgername: selectedSub?.subledgername ?? '',
      ptotalamount: round(
        parseFloat(
          this.commonService.removeCommasInAmount(
            ctrl.get('ptotalamount')?.value ?? '0'
          )
        )
      ),
      pamount: round(
        parseFloat(
          this.commonService.removeCommasInAmount(
            ctrl.get('pamount')?.value ?? '0'
          )
        )
      ),
      pgstcalculationtype: isgst ? ctrl.get('pgstcalculationtype')?.value : null,
      pgsttype: isgst ? ctrl.get('pgsttype')?.value : null,
      pgstpercentage: isgst ? ctrl.get('pgstpercentage')?.value ?? 0 : 0,
      pgstamount: isgst
        ? round(parseFloat(ctrl.get('pgstamount')?.value ?? '0'))
        : 0,
      pisgstapplicable: isgst ?? false,
      pTdsSection: istds ? ctrl.get('pTdsSection')?.value : null,
      pTdsPercentage: istds ? ctrl.get('pTdsPercentage')?.value ?? 0 : 0,
      ptdsamount: istds
        ? round(
          parseFloat(
            this.commonService.removeCommasInAmount(
              ctrl.get('ptdsamount')?.value ?? '0'
            )
          )
        )
        : 0,
      ptdscalculationtype: istds ? ctrl.get('ptdscalculationtype')?.value : null,
      pistdsapplicable: istds ?? false,
      ppartyid,
      pledgerid,
      pStateId: isgst ? ctrl.get('pStateId')?.value ?? 0 : 0,
      pState: isgst ? ctrl.get('pState')?.value ?? '' : '',
      pgstno: isgst ? ctrl.get('pgstno')?.value ?? '' : '',
      ppartyreferenceid: ctrl.get('ppartyreferenceid')?.value ?? '',
      ppartyreftype: ctrl.get('ppartyreftype')?.value ?? '',
      ppartypannumber: ctrl.get('ppartypannumber')?.value ?? '',
    };

    if (!this.validateAddPaymentDetails(currentRow)) {
      this.resetAddButton();
      return;
    }

    const paidAmount = round(
      parseFloat(
        this.commonService.removeCommasInAmount(pactualpaidamount ?? '0')
      )
    );

    if (isSubledgerRequired) {
      this.subscriberJvService
        .GetdebitchitCheckbalance(
          this.commonService.getbranchname(),
          pledgerid,
          36,
          subledgerid,
          this.commonService.getschemaname(),
          this.commonService.getCompanyCode(),
          this.commonService.getBranchCode()
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result: any) => {
            if (
              result?.balancecheckstatus &&
              paidAmount > parseFloat(result?.balanceamount ?? '0')
            ) {
              this.showAddError(
                'Enter the amount less or equal to subledger amount'
              );
              return;
            }
            this.savePaymentRow(currentRow, ctrl);
          },
          error: (err) => this.showAddError(err),
        });
    } else {
      this.savePaymentRow(currentRow, ctrl);
    }
  }





  private showAddError(msg: string): void {
    this.commonService.showWarningMessage(msg);
    this.resetAddButton();
  }

  private resetAddButton(): void {
    this.disableAddButton.set(false);
    this.addButtonLabel.set('Add');
  }

  // private savePaymentRow(row: any, ctrl: FormGroup): void {
  //   debugger
  //   this.paymentsList.push(row);
  //   this.paymentsList1 = [...this.paymentsList1, row];
  //   this.getPartyJournalEntryData();
  //   this.clearPaymentDetailsParticular();
  //   this.getPaymentListColumnWiseTotals();
  //   ctrl.reset();
  //   ctrl.markAsUntouched();
  //   ctrl.markAsPristine();
  //   ctrl.updateValueAndValidity();
  //   this.resetAddButton();
  // }

  private savePaymentRow(row: any, ctrl: FormGroup): void {
    this.paymentsList.push(row);
    this.paymentsList1 = [...this.paymentsList1, row];
    this.getPartyJournalEntryData();
    this.getPaymentListColumnWiseTotals();

    // ✅ Mark clean BEFORE reset so valueChanges subscribers don't fire validation
    ctrl.markAsUntouched();
    ctrl.markAsPristine();
    ctrl.reset();
    ctrl.updateValueAndValidity({ emitEvent: false }); // ✅ suppress valueChanges

    // ✅ Clear after everything so no stale messages remain
    this.formValidationMessages = {};

    this.clearPaymentDetailsParticular(); // this also sets formValidationMessages = {}
    this.resetAddButton();
  }

  removeHandler(rowIndex: number): void {
    this.paymentsList.splice(rowIndex, 1);
    this.paymentsList1.splice(rowIndex, 1);
    this.paymentsList1 = [...this.paymentsList1];

    const total = this.paymentsList.reduce(
      (s, c) => s + parseFloat(c.ptotalamount ?? 0),
      0
    );
    this.paymentVoucherForm.get('ptotalpaidamount')?.setValue(total);
    this.getPartyJournalEntryData();
    this.clearPaymentDetailsParticular();
    this.getPaymentListColumnWiseTotals();
  }

  getPaymentListColumnWiseTotals(): void {
    const safe = (v: any) =>
      parseFloat((v || '0').toString().replace(/,/g, '')) || 0;
    ['ptotalamount', 'pamount', 'pgstamount', 'ptdsamount'].forEach((key) => {
      this.paymentListColumnWise[key] = this.paymentsList.reduce(
        (s, c) => s + safe(c[key]),
        0
      );
    });
  }

  // ─── Clear Helpers ────────────────────────────────────────────────────────
  clearPaymentDetails(): void {
    const ctrl = this.paymentVoucherForm.get(
      'ppaymentsslistcontrols'
    ) as FormGroup;
    ctrl.reset();
    this.showSubledger.set(true);
    ctrl.patchValue({
      pistdsapplicable: false,
      pisgstapplicable: false,
      pledgerid: null,
      psubledgerid: null,
      ppartyid: null,
      pStateId: '',
      pgstpercentage: '',
      pTdsSection: '',
      pTdsPercentage: '',
    });
    this.setBalances('LEDGER', 0);
    this.setBalances('SUBLEDGER', 0);
    this.setBalances('PARTY', 0);
    this.istdsapplicable_Checked();
    this.isgstapplicable_Checked();
    this.formValidationMessages = {};
  }

  clearPaymentDetailsParticular(): void {
    const ctrl = this.paymentVoucherForm.get(
      'ppaymentsslistcontrols'
    ) as FormGroup;
    this.showSubledger.set(true);
    this.showGst.set(false);
    this.showTds.set(false);
    this.disableGst.set(false);
    this.disableTds.set(false);
    this.showGstNo.set(false);
    this.showGstAmount.set(false);
    this.showIgst.set(false);
    this.showCgst.set(false);
    this.showSgst.set(false);
    this.showUtgst.set(false);

    ctrl.patchValue({
      ppartyid: null,
      ppartyname: '',
      pledgerid: null,
      pledgername: '',
      psubledgerid: null,
      psubledgername: '',
      pactualpaidamount: '',
      pamount: '',
      ptotalamount: '',
      pisgstapplicable: false,
      pgstcalculationtype: '',
      pgstpercentage: '',
      pgstamount: '',
      pgsttype: '',
      pigstamount: '',
      pcgstamount: '',
      psgstamount: '',
      putgstamount: '',
      pigstpercentage: '',
      pcgstpercentage: '',
      psgstpercentage: '',
      putgstpercentage: '',
      pStateId: '',
      pState: '',
      pgstno: '',
      pistdsapplicable: false,
      ptdscalculationtype: '',
      pTdsSection: '',
      pTdsPercentage: '',
      ptdsamount: '',
      ppartyreferenceid: '',
      ppartyreftype: '',
      ppartypannumber: '',
    });

    this.subLedgerAccountsList = [];
    this.tdsSectionList = [];
    this.tdsPercentageList = [];
    this.stateList = [];
    this.setBalances('LEDGER', 0);
    this.setBalances('SUBLEDGER', 0);
    this.setBalances('PARTY', 0);
    this.formValidationMessages = {};
  }

  clearTransTypeDetails(): void {
    const fields = ['pbankid', 'pbankname', 'pCardNumber', 'ptypeofpayment', 'pbranchname', 'pUpiname', 'pUpiid', 'pChequenumber'];
    this.chequeNumbersList = [];
    fields.forEach((f) => {
      this.paymentVoucherForm.get(f)?.setValue('');
      this.paymentVoucherForm.get(f)?.markAsUntouched();
      this.paymentVoucherForm.get(f)?.markAsPristine();
    });
    this.formValidationMessages = {};
    this.setBalances('BANKBOOK', 0);
    this.setBalances('PASSBOOK', 0);
  }

  clearPaymentVoucher(): void {
    try {
      this.paymentsList = [];
      this.paymentsList1 = [];
      this.partyjournalentrylist = [];
      this.paymentListColumnWise = {};

      this.paymentVoucherForm.patchValue({
        pnarration: '',
        pDocStorePath: '',
        pmodofpayment: 'CASH',
        ptranstype: 'CHEQUE',
        ppaymentdate: new Date(),
        ptotalpaidamount: '',
        pbankname: '',
        pbranchname: '',
        pChequenumber: '',
        pCardNumber: '',
        ptypeofpayment: '',
        pUpiname: '',
        pUpiid: '',
        pbankid: '',
        schemaname: this.commonService.getschemaname(),
      });

      ['pnarration'].forEach((f) => {
        this.paymentVoucherForm.get(f)?.markAsUntouched();
        this.paymentVoucherForm.get(f)?.markAsPristine();
      });

      this.imageResponse = { name: '', fileType: 'imageResponse', contentType: '', size: 0 };

      this.clearTransTypeDetails();

      const ctrl = this.paymentVoucherForm.get('ppaymentsslistcontrols') as FormGroup;
      ctrl.reset();
      ctrl.markAsUntouched();
      ctrl.markAsPristine();
      this.clearPaymentDetailsParticular();

      this.showGst.set(false);
      this.showTds.set(false);
      this.showModeofPayment.set(false);
      this.showTransType.set(false);
      this.showBranch.set(false);
      this.showFinancial.set(false);
      this.showChequeNo.set(false);
      this.showTypeofPayment.set(false);
      this.showUpi.set(false);
      this.showSubledger.set(true);
      this.disableGst.set(true);
      this.disableTds.set(false);
      this.disableSaveButton.set(false);
      this.saveButtonLabel.set('Save');
      this.disableAddButton.set(false);
      this.addButtonLabel.set('Add');

      this.subLedgerAccountsList = [];
      this.tdsSectionList = [];
      this.tdsPercentageList = [];
      this.stateList = [];
      this.chequeNumbersList = [];
      this.upiNamesList = [];

      this.setBalances('BANKBOOK', 0);
      this.setBalances('PASSBOOK', 0);
      this.setBalances('LEDGER', 0);
      this.setBalances('SUBLEDGER', 0);
      this.setBalances('PARTY', 0);

      this.formValidationMessages = {};
      this.getLoadData();
      this.modeofPaymentChange();
    } catch (e) {
      this.commonService.showErrorMessage(e);
    }
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  validatesavePaymentVoucher(): boolean {
    debugger;;
    let isValid = true;
    try {
      isValid = this.checkValidations(this.paymentVoucherForm, isValid);
      if (this.paymentsList.length === 0) {
        this.commonService.showWarningMessage('Add at least one record to the grid!');
        isValid = false;
      }

      if (this.paymentVoucherForm.get('pmodofpayment')?.value === 'CASH') {
        const cashStr = this.cashBalance ?? '';
        if (cashStr.indexOf('D') > -1) {
          const cashVal = parseFloat(
            this.commonService.removeCommasInAmount(cashStr.split('D')[0])
          );
          let paidVal =
            parseFloat(
              this.paymentVoucherForm.get('ptotalpaidamount')?.value ?? '0'
            ) || 0;

          if (paidVal > cashVal) {
            this.commonService.showWarningMessage('Insufficient Cash Balance');
            isValid = false;
          }

          if (isValid) {
            const bankExists = this.paymentsList.some((p) =>
              this.banklist.some((b) => b.paccountid === p.psubledgerid)
            );
            this.bankExists.set(bankExists);
            const restrict = parseFloat(this.cashRestrictAmount ?? '0') || 0;
            if (restrict > 0 && !bankExists) {
              if (parseFloat(this.availableAmount) <= paidVal) {
                this.commonService.showWarningMessage(
                  `Cash transactions limit below ${this.commonService.currencyformat(restrict)} Available Amount ${this.commonService.currencyformat(this.availableAmount)} only for this Party`
                );
                isValid = false;
              }
            }
          }
        } else {
          this.commonService.showWarningMessage('Insufficient Cash Balance');
          isValid = false;
        }
      }
    } catch (e) {
      this.commonService.showErrorMessage(e);
    }
    return isValid;
  }

  savePaymentVoucher(): void {
    debugger;
    this.disableSaveButton.set(true);
    this.saveButtonLabel.set('Processing');

    this.paymentVoucherForm
      .get('ptotalpaidamount')
      ?.setValue(
        this.paymentsList.reduce(
          (s, c) => s + parseFloat(c.ptotalamount ?? 0),
          0
        )
      );

    if (!this.validatesavePaymentVoucher()) {
      this.disableSaveButton.set(false);
      this.saveButtonLabel.set('Save');
      return;
    }

    const accountIds = this.paymentsList.map((p) => p.psubledgerid).join(',');
    const transDate = this.commonService.getFormatDateNormal(
      this.paymentVoucherForm.get('ppaymentdate')?.value
    );

    this.accountingTxService
      .GetCashAmountAccountWise(
        'PAYMENT VOUCHER',
        this.commonService.getbranchname(),
        accountIds,
        transDate,
        this.commonService.getschemaname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: any) => {
        let count = 0;
        const formVal = this.paymentVoucherForm.value;

        if (
          formVal.pmodofpayment === 'CASH' &&
          !this.bankExists()
        ) {
          for (const payment of this.paymentsList) {
            const amount = parseFloat(
              this.commonService.removeCommasInAmount(payment.ptotalamount)
            );
            for (const r of result) {
              if (payment.psubledgerid === r.psubledgerid) {
                if (
                  parseFloat(this.cashRestrictAmount) <
                  r.accountbalance + amount
                )
                  count = 1;
              }
            }
          }
        }

        if (count !== 0) {
          this.commonService.showWarningMessage(
            `Subledger per day Cash transactions limit below ${this.commonService.currencysymbol}${this.commonService.currencyformat(this.cashRestrictAmount)} only`
          );
          this.disableSaveButton.set(false);
          this.saveButtonLabel.set('Save');
          return;
        }

        if (!confirm('Do You Want To Save ?')) {
          this.disableSaveButton.set(false);
          this.saveButtonLabel.set('Save');
          return;
        }

        if (formVal.pmodofpayment === 'CASH') {
          this.paymentVoucherForm.get('pbankid')?.setValue(0);
        }

        this.paymentVoucherForm.get('pipaddress')?.setValue('192.168.2.177');
        this.paymentVoucherForm.get('pCreatedby')?.setValue(9);
        console.log(this.paymentVoucherForm.value, "formval");

        const payload = this.buildSavePayload(
          this.paymentVoucherForm.getRawValue()
          // this.paymentVoucherForm.value
        );

        this.accountingTxService
          .savePaymentVoucher(payload)
          // .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res: any) => {
              console.log(res, "res");

              if (res.success === true) {
                this.jsonDataItem = res;
                this.disableSaveButton.set(false);
                this.saveButtonLabel.set('Save');
                this.commonService.showInfoMessage('Saved successfully');
                this.clearPaymentVoucher();
                const receipt = btoa(res.voucherNo + ',' + 'Payment Voucher');
                const url = this.router.serializeUrl(
                  this.router.createUrlTree(['/payment-voucher', receipt])
                );
                window.open(url, '_blank');
                this.commonService.showSuccessMessage();
              } else {
                this.disableSaveButton.set(false);
                this.saveButtonLabel.set('Save');
                this.commonService.showErrorMessage('Error while saving..!');
              }
            },
            error: (err) => {
              this.commonService.showErrorMessage(err);
              this.disableSaveButton.set(false);
              this.saveButtonLabel.set('Save');
            },
          });
      });
  }

  // private buildSavePayload(formVal: any): any {
  //   return {
  //     global_schema: this.commonService.getschemaname(),
  //     branch_schema: this.commonService.getbranchname(),
  //     company_code: this.commonService.getCompanyCode(),
  //     branch_code: this.commonService.getBranchCode(),
  //     ppaymentid: formVal.ppaymentid ?? '',
  //     ppaymentdate:
  //       this.commonService.getFormatDateNormal(formVal.ppaymentdate) ?? '',
  //     pjvdate:
  //       this.commonService.getFormatDateNormal(formVal.ppaymentdate) ?? '',
  //     pmodofpayment: formVal.pmodofpayment ?? '',
  //     ptotalpaidamount: formVal.ptotalpaidamount ?? 0,
  //     pnarration: formVal.pnarration ?? '',
  //     subscriberjoinedbranchid: 0,
  //     bank_id: formVal.pbankid,
  //     pbankid: formVal.pbankid,
  //     pBankName: formVal.pbankname ?? '',
  //     pbranchname: formVal.pbranchname ?? '',
  //     ptranstype: formVal.ptranstype ?? '',
  //     ptypeofpayment: formVal.ptypeofpayment ?? '',
  //     pChequenumber: String(formVal.pChequenumber ?? ''),
  //     pchequedate:
  //       this.commonService.getFormatDateNormal(formVal.pchequedate) ?? '',
  //     pCardNumber: formVal.pCardNumber ?? '',
  //     pUpiname: formVal.pUpiname ?? '',
  //     pUpiid: formVal.pUpiid ?? '',
  //     branchid: String(this.commonService.getbrachid()),
  //     pCreatedby: 9,
  //     pipaddress: formVal.pipaddress ?? '',
  //     pFilename: formVal.pDocStorePath ?? '',
  //     pFilepath: '',
  //     pFileformat: '',
  //     formname: '',
  //     totalreceivedamount: formVal.ptotalpaidamount?.toString() ?? '0',
  //     receiptid: '',
  //     contactid: '',
  //     contactname: '',

  //     ppaymentsslistcontrols: this.paymentsList.map((p) => ({
  //       ppartyid: p.ppartyid ?? 0,
  //       psubledgerid: p.psubledgerid ?? 0,
  //       pamount: Number(p.pamount ?? p.ptotalamount ?? 0),
  //       pistdsapplicable: p.pistdsapplicable ?? false,
  //       pTdsSection: p.pTdsSection ?? '',
  //       pTdsPercentage: p.pTdsPercentage?.toString() ?? '0',
  //       ptdsamount: Number(p.ptdsamount ?? 0),
  //       pisgstapplicable: p.pisgstapplicable ?? false,
  //       ptdscalculationtype: p.ptdscalculationtype ?? '',
  //       ppartyreferenceid: p.ppartyreferenceid ?? '',
  //       ppartyname: p.ppartyname ?? '',
  //       pgsttype: p.pgsttype ?? '',
  //       pgstcalculationtype: p.pgstcalculationtype ?? '',
  //       pgstpercentage: p.pgstpercentage?.toString() ?? '0',
  //       pigstamount: p.pigstamount?.toString() ?? '0',
  //       pcgstamount: p.pcgstamount?.toString() ?? '0',
  //       psgstamount: p.psgstamount?.toString() ?? '0',
  //       putgstamount: p.putgstamount?.toString() ?? '0',
  //       pgstamount: p.pgstamount?.toString() ?? '0',
  //       pactualpaidamount: p.pamount?.toString() ?? '0',
  //     })),

  //     ppaymentslist: this.paymentsList.map((p) => ({
  //       psubledgerid: p.psubledgerid?.toString() ?? '',
  //       psubledgername: p.psubledgername ?? '',
  //       pledgerid: p.pledgerid?.toString() ?? '',
  //       pledgername: p.pledgername ?? '',
  //       pamount: p.pamount?.toString() ?? '0',
  //       pgsttype: p.pgsttype ?? '',
  //       pgstcalculationtype: p.pgstcalculationtype ?? '',
  //       pgstpercentage: p.pgstpercentage?.toString() ?? '0',
  //       pigstamount: p.pigstamount?.toString() ?? '0',
  //       pcgstamount: p.pcgstamount?.toString() ?? '0',
  //       psgstamount: p.psgstamount?.toString() ?? '0',
  //       putgstamount: p.putgstamount?.toString() ?? '0',
  //       pState: p.pState ?? '',
  //       pStateId: p.pStateId?.toString() ?? '',
  //       pgstno: p.pgstno ?? '',
  //       pgstamount: p.pgstamount?.toString() ?? '0',
  //       pactualpaidamount: p.pamount?.toString() ?? '0',
  //       ptotalamount: p.ptotalamount?.toString() ?? '0',
  //       pisgstapplicable: p.pisgstapplicable?.toString() ?? 'false',
  //       pTdsSection: p.pTdsSection ?? '',
  //       pTdsPercentage: p.pTdsPercentage?.toString() ?? '0',
  //       ppartyname: p.ppartyname ?? '',
  //       ppartyid: p.ppartyid?.toString() ?? '',
  //       ppartyreferenceid: p.ppartyreferenceid ?? '',
  //       ppartyreftype: p.ppartyreftype ?? '',
  //       pistdsapplicable: p.pistdsapplicable?.toString() ?? 'false',
  //       ptdsamount: p.ptdsamount?.toString() ?? '0',
  //       ptdscalculationtype: p.ptdscalculationtype ?? '',
  //       ppartypannumber: p.ppartypannumber ?? '',
  //       pChequenumber: String(p.pChequenumber ?? ''),
  //     })),
  //   };
  // }

  // ─── Journal Entry ────────────────────────────────────────────────────────



  private buildSavePayload(formVal: any): any {
    debugger
    const safe = (val: any, def: any = "") => val ?? def;
    const str = (val: any) => (val ?? "").toString();

    return {
      // ── Schema ─────────────────────────────
      global_schema: this.commonService.getschemaname(),
      branch_schema: this.commonService.getbranchname(),
      company_code: this.commonService.getCompanyCode(),
      branch_code: this.commonService.getBranchCode(),

      // ── Core ───────────────────────────────
      ppaymentid: safe(formVal.ppaymentid),
      // ppaymentdate: safe(this.datePipe.transform(formVal.ppaymentdate, 'dd-MMM-yyyy')),
      ppaymentdate: formVal.ppaymentdate
        ? this.datePipe.transform(formVal.ppaymentdate, 'dd-MMM-yyyy')
        : "",
      pjvdate: safe(this.datePipe.transform(formVal.ppaymentdate, 'dd-MMM-yyyy')),
      // ppaymentdate: safe(this.commonService.getFormatDateNormal(formVal.ppaymentdate)),
      // pjvdate: safe(this.commonService.getFormatDateNormal(formVal.ppaymentdate)),
      pmodofpayment: safe(formVal.pmodofpayment),
      ptotalpaidamount: safe(formVal.ptotalpaidamount, 0),
      pnarration: safe(formVal.pnarration),
      subscriberjoinedbranchid: 0,

      bank_id: safe(formVal.pbankid, 0),
      pbankid: safe(formVal.pbankid, 0),

      // ── Bank / Payment ─────────────────────
      pBankName: safe(formVal.pbankname),
      pbranchname: safe(formVal.pbranchname),
      ptranstype: safe(formVal.ptranstype),
      ptypeofpayment: safe(formVal.ptypeofpayment),

      pChequenumber: str(formVal.pChequenumber),
      pchequedate: safe(this.commonService.getFormatDateNormal(formVal.pchequedate)),
      pchequedepositdate: "",
      pchequecleardate: "",

      pCardNumber: safe(formVal.pCardNumber),
      pUpiname: safe(formVal.pUpiname),
      pUpiid: safe(formVal.pUpiid),

      pRecordid: "",
      pBankconfigurationId: "",
      pdepositbankid: "",
      pdepositbankname: "",
      pAccountnumber: "",

      branchid: str(this.commonService.getbrachid()),

      // ── User/System ────────────────────────
      pCreatedby: 9,
      pipaddress: safe(formVal.pipaddress),

      // ── File ──────────────────────────────
      pFilename: safe(formVal.pDocStorePath),
      pFilepath: "",
      pFileformat: "",

      // ── Contact / Receipt ─────────────────
      formname: "",
      totalreceivedamount: str(formVal.ptotalpaidamount || 0),
      receiptid: "",
      parentaccountname: "",
      contactid: "",
      contactname: "",
      contactpaytype: "",
      contactbankname: "",
      contactbankaccno: "",
      contactbankbranch: "",
      contactbankifsc: "",

      // ── Chit / Required junk fields ───────
      chitgroupid: "",
      groupcode: "",
      ticketno: "",
      challanaNo: "",
      pparentid: "",
      pAccountName: "",
      pContactReferenceId: "",
      pPanNumber: "",
      radioButtonValue: "",
      checkedChitScheme: "",
      toChitNo: "",
      payableValue: "",
      pinstallment_no: "",
      pchequeno_scheme: "",
      pchequedate_scheme: "",
      bank_name: "",
      pchequeEntryid: "",

      // ── Grid 1 ────────────────────────────
      ppaymentsslistcontrols: this.paymentsList.map((p: any) => ({
        ppartyid: safe(p.ppartyid, 0),
        psubledgerid: safe(p.psubledgerid, 0),
        pamount: Number(p.pamount ?? p.ptotalamount ?? 0),

        pistdsapplicable: p.pistdsapplicable ?? false,
        pTdsSection: safe(p.pTdsSection),
        pTdsPercentage: str(p.pTdsPercentage || 0),
        ptdsamount: Number(p.ptdsamount || 0),

        pisgstapplicable: p.pisgstapplicable ?? false,
        ptdscalculationtype: safe(p.ptdscalculationtype),

        ppartyreferenceid: safe(p.ppartyreferenceid),
        ppartyname: safe(p.ppartyname),

        pgsttype: safe(p.pgsttype),
        pgstcalculationtype: safe(p.pgstcalculationtype),
        pgstpercentage: str(p.pgstpercentage || 0),

        pigstamount: str(p.pigstamount || 0),
        pcgstamount: str(p.pcgstamount || 0),
        psgstamount: str(p.psgstamount || 0),
        putgstamount: str(p.putgstamount || 0),
        pgstamount: str(p.pgstamount || 0),

        pactualpaidamount: str(p.pamount || 0),
      })),

      // ── Grid 2 (IMPORTANT FIXED) ───────────
      ppaymentslist: this.paymentsList.map((p: any) => ({
        id: str(p.id),
        text: safe(p.text),

        psubledgerid: str(p.psubledgerid),
        psubledgername: safe(p.psubledgername),
        pledgerid: str(p.pledgerid),
        pledgername: safe(p.pledgername),

        ptranstype: safe(p.ptranstype),
        accountbalance: str(p.accountbalance || 0),
        pAccounttype: safe(p.pAccounttype),

        legalcellReceipt: safe(p.legalcellReceipt),
        pbranchcode: safe(p.pbranchcode),
        pbranchtype: safe(p.pbranchtype),
        groupcode: safe(p.groupcode),

        pamount: str(p.pamount || 0),

        pgsttype: safe(p.pgsttype),
        pgstcalculationtype: safe(p.pgstcalculationtype),
        pgstpercentage: str(p.pgstpercentage || 0),

        pigstamount: str(p.pigstamount || 0),
        pcgstamount: str(p.pcgstamount || 0),
        psgstamount: str(p.psgstamount || 0),
        putgstamount: str(p.putgstamount || 0),

        pState: safe(p.pState),
        pStateId: str(p.pStateId),

        pgstno: safe(p.pgstno),
        pgstamount: str(p.pgstamount || 0),

        pigstpercentage: str(p.pigstpercentage || 0),
        pcgstpercentage: str(p.pcgstpercentage || 0),
        psgstpercentage: str(p.psgstpercentage || 0),
        putgstpercentage: str(p.putgstpercentage || 0),

        pactualpaidamount: str(p.pamount || 0),
        ptotalamount: str(p.ptotalamount || 0),

        pisgstapplicable: str(p.pisgstapplicable ?? false),

        ptdsamountindividual: str(p.ptdsamountindividual || 0),
        pTdsSection: safe(p.pTdsSection),
        pTdsPercentage: str(p.pTdsPercentage || 0),

        preferencetext: safe(p.preferencetext),
        pgstnumber: safe(p.pgstnumber),

        ppartyname: safe(p.ppartyname),
        ppartyid: str(p.ppartyid),
        ppartyreferenceid: safe(p.ppartyreferenceid),
        ppartyreftype: safe(p.ppartyreftype),

        pistdsapplicable: str(p.pistdsapplicable ?? false),
        ptdsamount: str(p.ptdsamount || 0),
        ptdscalculationtype: safe(p.ptdscalculationtype),
        ptdsaccountId: str(p.ptdsaccountId),

        ppartypannumber: safe(p.ppartypannumber),
        ptdsrefjvnumber: safe(p.ptdsrefjvnumber),

        ledgeramount: str(p.ledgeramount || 0),
        totalreceivedamount: str(p.totalreceivedamount || 0),

        pFilename: safe(p.pFilename),
        agentcode: safe(p.agentcode),
        ticketno: safe(p.ticketno),
        chitgroupid: safe(p.chitgroupid),

        schemesubscriberid: safe(p.schemesubscriberid),
        interbranchsubledgerid: safe(p.interbranchsubledgerid),
        interbranchid: safe(p.interbranchid),

        pformname: safe(p.pformname),
        paccountname: safe(p.paccountname),
        pgstvoucherno: safe(p.pgstvoucherno),

        pChequenumber: str(p.pChequenumber)
      }))
    };
  }



  getPartyJournalEntryData(): void {
    try {
      const tdsEntries: any[] = [];
      this.partyjournalentrylist = [];

      const ledgerNames = [
        ...new Set(
          this.paymentsList.map((p) => p.pledgername).filter(Boolean)
        ),
      ];

      let idx = 1;
      for (const ledger of ledgerNames) {
        const ledgerPayments = this.paymentsList.filter(
          (p) => p.pledgername === ledger
        );
        const safe = (v: any) =>
          Number(this.commonService.removeCommasInAmount(v) || 0);

        const debit = ledgerPayments.reduce(
          (s, p) => s + safe(p.pamount) + safe(p.ptdsamount),
          0
        );
        this.partyjournalentrylist.push({
          type: 'Payment Voucher',
          accountname: ledger,
          debitamount: debit,
          creditamount: 0,
        });

        const sections = [...new Set(ledgerPayments.map((p) => p.pTdsSection).filter(Boolean))];
        for (const sec of sections) {
          const tdsAmt = ledgerPayments
            .filter((p) => p.pTdsSection === sec)
            .reduce((s, p) => s + safe(p.ptdsamount), 0);
          if (tdsAmt > 0) {
            tdsEntries.push({
              type: `Journal Voucher ${idx}`,
              accountname: `TDS-${sec} RECEIVABLE`,
              debitamount: tdsAmt,
              creditamount: 0,
            });
          }
        }

        const totalTds = ledgerPayments.reduce(
          (s, p) => s + safe(p.ptdsamount),
          0
        );
        if (totalTds > 0) {
          tdsEntries.push({
            type: `Journal Voucher ${idx}`,
            accountname: ledger,
            debitamount: 0,
            creditamount: totalTds,
          });
        }
        idx++;
      }

      [
        { key: 'pigstamount', name: 'P-IGST' },
        { key: 'pcgstamount', name: 'P-CGST' },
        { key: 'psgstamount', name: 'P-SGST' },
        { key: 'putgstamount', name: 'P-UTGST' },
      ].forEach((gst) => {
        const total = this.paymentsList.reduce(
          (s, p) =>
            s +
            Number(this.commonService.removeCommasInAmount(p[gst.key]) || 0),
          0
        );
        if (total > 0) {
          this.partyjournalentrylist.push({
            type: 'Payment Voucher',
            accountname: gst.name,
            debitamount: total,
            creditamount: 0,
          });
        }
      });

      const totalPaid = this.paymentsList.reduce(
        (s, p) =>
          s + Number(this.commonService.removeCommasInAmount(p.ptotalamount) || 0),
        0
      );
      if (totalPaid > 0) {
        this.paymentVoucherForm.get('ptotalpaidamount')?.setValue(totalPaid);
        this.partyjournalentrylist.push({
          type: 'Payment Voucher',
          accountname:
            this.paymentVoucherForm.get('pmodofpayment')?.value === 'CASH'
              ? 'CASH ON HAND'
              : 'BANK',
          debitamount: 0,
          creditamount: totalPaid,
        });
      }

      this.partyjournalentrylist = [
        ...this.partyjournalentrylist,
        ...tdsEntries,
      ];
    } catch (e) {
      this.commonService.showErrorMessage(e);
    }
  }

  // ─── File Upload ──────────────────────────────────────────────────────────
  uploadAndProgress(event: any, files: FileList | null): void {
    if (!files || files.length === 0) return;
    const ext = event.target.value.substring(
      event.target.value.lastIndexOf('.') + 1
    );
    if (!this.validateFile(event.target.value)) {
      this.commonService.showWarningMessage('Upload jpg or png or pdf files');
      return;
    }

    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        this.imageResponse = {
          name: file.name,
          fileType: 'imageResponse',
          contentType: file.type,
          size: file.size,
        };
      };
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append(files[i].name, files[i]);
      formData.append('NewFileName', `Payment Voucher.${files[i].name.split('.').pop()}`);
    }

    this.commonService
      .fileUploadS3('Account', formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.kycFileName = data[0];
        this.imageResponse.name = data[0];
        this.paymentVoucherForm.get('pDocStorePath')?.setValue(this.kycFileName);
      });
  }

  validateFile(fileName: string): boolean {
    if (!fileName) return true;
    const ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
    return ['jpg', 'png', 'pdf'].includes(ext);
  }

  // ─── Keyboard Helpers ─────────────────────────────────────────────────────
  allowNumberOnly(event: KeyboardEvent): void {
    const ctrl = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'];
    if (ctrl.includes(event.key)) return;
    const input = event.target as HTMLInputElement;
    if (event.key === '.' && input.value.includes('.')) {
      event.preventDefault();
      return;
    }
    if (!/[0-9.]/.test(event.key)) event.preventDefault();
  }

  // ─── Getters for template convenience ────────────────────────────────────
  get lineGroup(): FormGroup {
    return this.paymentVoucherForm.get('ppaymentsslistcontrols') as FormGroup;
  }

  getLineValue(key: string): any {
    return this.lineGroup?.get(key)?.value ?? 0;
  }
}

