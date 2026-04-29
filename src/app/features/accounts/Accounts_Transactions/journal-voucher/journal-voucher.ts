// import { CommonModule, CurrencyPipe } from '@angular/common';
// import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
// import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
// import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
// import { Router, RouterModule } from '@angular/router';
// import { NgSelectModule } from '@ng-select/ng-select';

// import { ButtonModule } from 'primeng/button';
// import { TableModule } from 'primeng/table';
// import { CommonService } from '../../../../core/services/Common/common.service';
// import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
// import { DatePickerModule } from 'primeng/datepicker';

// @Component({
//   selector: 'app-journal-voucher',
//   standalone: true,
//   imports: [
//     CommonModule,
//     ReactiveFormsModule,
//     NgSelectModule,
//     DatePickerModule,
//     ButtonModule,
//     TableModule,
//     CurrencyPipe,
//     RouterModule,
//   ],
//   templateUrl: './journal-voucher.html',
//   providers: [CurrencyPipe],
// })
// export class JournalVoucher implements OnInit {
//   pDatepickerMaxDate: Date = new Date();


//   // ── DI via inject() ────────────────────────────────────────────────────────
//   private readonly fb                = inject(FormBuilder);
//   private readonly destroyRef        = inject(DestroyRef);
//   private readonly router            = inject(Router);
//   private readonly commonService     = inject(CommonService);
//   private readonly accountingService = inject(AccountsTransactions);
//   private readonly subscriberJVService = inject(AccountsTransactions);

//   // ── Signals ────────────────────────────────────────────────────────────────
//   readonly paymentslist      = signal<any[]>([]);
//   readonly debittotalamount  = signal<number>(0);
//   readonly credittotalamount = signal<number>(0);

//   readonly balancesMismatch = computed(
//     () => this.debittotalamount() !== this.credittotalamount(),
//   );

//   // ── UI state ───────────────────────────────────────────────────────────────
//   showModeofPayment  = false;
//   showTypeofPayment  = false;
//   showtranstype      = false;
//   showbankcard       = true;
//   showbranch         = true;
//   showfinancial      = true;
//   showupi            = false;
//   showchequno        = true;
//   showgst            = true;
//   showtds            = true;
//   showgstandtds      = false;
//   imageResponse: any;
//   currencySymbol: any;
//   readonlydebit      = false;
//   readonlycredit     = false;
//   showgstamount      = false;
//   showigst           = false;
//   showcgst           = false;
//   showsgst           = false;
//   showutgst          = false;
//   showgstno          = false;
//   showhidegrid       = false;
//   showsubledger      = true;
//   formValidationMessages: any = {};
//   paymentlistcolumnwiselist: any;
//   displayCardName    = 'Debit Card';
//   displaychequeno    = 'Cheque No';
//   kycFileName: any;

//   // ── List data ──────────────────────────────────────────────────────────────
//   banklist: any;
//   modeoftransactionslist: any;
//   typeofpaymentlist: any;
//   ledgeraccountslist: any;
//   subledgeraccountslist: any;
//   partylist: any;
//   gstlist: any;
//   tdslist: any;
//   tdssectionlist: any;
//   tdspercentagelist: any;
//   debitcardlist: any;
//   statelist: any;
//   chequenumberslist: any;
//   upinameslist: any;
//   upiidlist: any;
//   partyjournalentrylist: any;
//   amounttype: any;

//   // ── Balance strings ────────────────────────────────────────────────────────
//   cashBalance: any;
//   bankBalance: any;
//   bankbookBalance: any;
//   bankpassbookBalance: any;
//   ledgerBalance: any;
//   subledgerBalance: any;
//   partyBalance: any;

//   // ── Misc state ─────────────────────────────────────────────────────────────
//   disablegst!: boolean;
//   disabletds         = false;
//   disablesavebutton  = false;
//   savebutton         = 'Save';
//   hidefootertemplate: any;
//   disabletransactiondate = false;

//   // ── Form ───────────────────────────────────────────────────────────────────
//   paymentVoucherForm!: FormGroup;

//   readonly ppaymentdateConfig: any = {
//     maxDate: new Date(),
//     containerClass: 'theme-dark-blue',
//     dateInputFormat: 'DD-MMM-YYYY',
//     showWeekNumbers: false,
//   };

//   // ══════════════════════════════════════════════════════════════════════════
//   // Lifecycle
//   // ══════════════════════════════════════════════════════════════════════════
//   ngOnInit(): void {
//     this.currencySymbol   = this.commonService.currencysymbol || '₹';
//     this.ledgerBalance    = `${this.currencySymbol} 0.00 Dr`;
//     this.subledgerBalance = `${this.currencySymbol} 0.00 Dr`;
//     this.partyBalance     = `${this.currencySymbol} 0.00 Dr`;

//     const company = this.commonService.comapnydetails;
//     if (company) {
//       this.disabletransactiondate =
//         !!(company.pdatepickerenablestatus || company.pfinclosingjvallowstatus);
//     }

//     this.formValidationMessages = {};
//     this.hidefootertemplate     = true;

//     this.paymentVoucherForm = this.fb.group({
//       ppaymentid:            [''],
//       pjvdate:               ['', Validators.required],
//       ptotalpaidamount:      [''],
//       pnarration:            ['', [Validators.required, Validators.maxLength(250)]],
//       pmodofpayment:         ['M'],
//       pbankname:             [''],
//       pbranchname:           [''],
//       ptranstype:            [''],
//       pCardNumber:           [''],
//       pUpiname:              [''],
//       pUpiid:                [''],
//       schemaname:            [this.commonService.getschemaname()],
//       ptypeofpayment:        [''],
//       pChequenumber:         [''],
//       pchequedate:           [''],
//       pbankid:               [''],
//       pdebitamount:          [''],
//       pcreditamount:         [''],
//       pamount:               [''],
//       pCreatedby:            [this.commonService.getCreatedBy()],
//       pipaddress:            [this.commonService.getIpAddress()],
//       pStatusname:           [this.commonService.pStatusname],
//       ptypeofoperation:      [this.commonService.ptypeofoperation],
//       ppaymentsslistcontrols: this.buildPaymentControls(),
//       pFilename:             [''],
//       pFilepath:             [''],
//       pFileformat:           [''],
//       pDocStorePath:         [''],
//     });

//     this.isgstapplicableChange();
//     this.istdsapplicableChange();
//     this.paymentVoucherForm.get('pjvdate')?.setValue(new Date());
//     this.getLoadData();
//     this.blurEventAllControls(this.paymentVoucherForm);
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Form helpers
//   // ══════════════════════════════════════════════════════════════════════════
//   private buildPaymentControls(): FormGroup {
//     return this.fb.group({
//       psubledgerid:       [null],
//       psubledgername:     [''],
//       pledgerid:          [null, Validators.required],
//       pledgername:        ['',   Validators.required],
//       pamount:            [''],
//       pactualpaidamount:  [''],
//       pgsttype:           [''],
//       pisgstapplicable:   [false],
//       pgstcalculationtype:[''],
//       pgstpercentage:     [''],
//       pgstamount:         [''],
//       pigstamount:        [''],
//       pcgstamount:        [''],
//       psgstamount:        [''],
//       putgstamount:       [''],
//       ppartyname:         ['',   Validators.required],
//       ppartyid:           [null, Validators.required],
//       ppartyreftype:      [''],
//       ppartyreferenceid:  [''],
//       ppartypannumber:    [''],
//       pistdsapplicable:   [false],
//       pgstno:             [''],
//       pTdsSection:        [''],
//       pTdsPercentage:     [''],
//       ptdsamount:         [''],
//       ptdscalculationtype:[''],
//       ppannumber:         [''],
//       pState:             [''],
//       pStateId:           [''],
//       pdebitamount:       ['',   Validators.required],
//       pcreditamount:      ['',   Validators.required],
//       pigstpercentage:    [''],
//       pcgstpercentage:    [''],
//       psgstpercentage:    [''],
//       putgstpercentage:   [''],
//       ptotalcreditamount: [''],
//       ptotaldebitamount:  [''],
//       ptranstype:         [''],
//       ptypeofoperation:   [this.commonService.ptypeofoperation],
//       ptotalamount:       [''],
//     });
//   }

//   /** Shorthand accessor for the nested payment controls FormGroup */
//   private get pc(): FormGroup {
//     return this.paymentVoucherForm.get('ppaymentsslistcontrols') as FormGroup;
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Input helpers
//   // ══════════════════════════════════════════════════════════════════════════
//   allowNumberOnly(event: Event): void {
//     const input = event.target as HTMLInputElement;
//     input.value = input.value.replace(/[^0-9.]/g, '');
//   }

//   formatCurrency(field: string): void {
//     const control = this.paymentVoucherForm.get(`ppaymentsslistcontrols.${field}`);
//     if (!control?.value) return;
//     const num = parseFloat(control.value.toString().replace(/,/g, ''));
//     if (isNaN(num)) return;
//     control.setValue(
//       num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
//       { emitEvent: false },
//     );
//   }

//   trackByFn(index: any, _item: any): any {
//     return index;
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Validation helpers
//   // ══════════════════════════════════════════════════════════════════════════
//   blurEventAllControls(group: FormGroup): void {
//     try {
//       Object.keys(group.controls).forEach(key => this.setBlurEvent(group, key));
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//     }
//   }

//   private setBlurEvent(group: FormGroup, key: string): void {
//     try {
//       const control = group.get(key);
//       if (!control) return;
//       if (control instanceof FormGroup) {
//         this.blurEventAllControls(control);
//       } else if (control.validator) {
//         control.valueChanges
//           .pipe(takeUntilDestroyed(this.destroyRef))
//           .subscribe(() => this.getValidationByControl(group, key, true));
//       }
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//     }
//   }

//   checkValidations(group: FormGroup, isValid: boolean): boolean {
//     try {
//       Object.keys(group.controls).forEach(key => {
//         isValid = this.getValidationByControl(group, key, isValid);
//       });
//     } catch {
//       return false;
//     }
//     return isValid;
//   }

//   getValidationByControl(group: FormGroup, key: string, isValid: boolean): boolean {
//     try {
//       let control = group.get(key) ?? this.pc.get(key);
//       if (!control) return isValid;

//       if (control instanceof FormGroup) {
//         if (key !== 'ppaymentsslistcontrols') this.checkValidations(control, isValid);
//         return isValid;
//       }

//       if (control.validator) {
//         this.formValidationMessages[key] = '';
//         if (control.errors || control.invalid || control.touched || control.dirty) {
//           const labelEl  = document.getElementById(key) as HTMLInputElement | null;
//           const labelName = labelEl?.title ?? key;
//           for (const errorKey in control.errors) {
//             const msg = this.commonService.getValidationMessage(control, errorKey, labelName, key, '');
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

//   // ══════════════════════════════════════════════════════════════════════════
//   // Balance display
//   // ══════════════════════════════════════════════════════════════════════════
//   setBalances(type: string, amount: any): void {
//     const num       = parseFloat(amount);
//     const abs       = Math.abs(num);
//     const formatted = num < 0
//       ? `${this.commonService.currencyFormat(abs.toFixed(2))} Cr`
//       : `${this.commonService.currencyFormat(num.toFixed(2))} Dr`;

//     const sym = this.currencySymbol;
//     const map: Record<string, () => void> = {
//       CASH:      () => (this.cashBalance       = formatted),
//       BANK:      () => (this.bankBalance       = formatted),
//       BANKBOOK:  () => (this.bankbookBalance   = formatted),
//       PASSBOOK:  () => (this.bankpassbookBalance = formatted),
//       LEDGER:    () => (this.ledgerBalance    = `${sym} ${formatted}`),
//       SUBLEDGER: () => (this.subledgerBalance = `${sym} ${formatted}`),
//       PARTY:     () => (this.partyBalance     = `${sym} ${formatted}`),
//     };
//     map[type]?.();
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Mode-of-payment validations  ← FROM DOC 1
//   // ══════════════════════════════════════════════════════════════════════════
//   addModeofpaymentValidations(): void {
//     const modeCtrl     = this.paymentVoucherForm.get('pmodofpayment')!   as FormControl;
//     const transCtrl    = this.paymentVoucherForm.get('ptranstype')!       as FormControl;
//     const bankCtrl     = this.paymentVoucherForm.get('pbankname')!        as FormControl;
//     const chequeCtrl   = this.paymentVoucherForm.get('pChequenumber')!    as FormControl;
//     const cardCtrl     = this.paymentVoucherForm.get('pCardNumber')!      as FormControl;
//     const typeCtrl     = this.paymentVoucherForm.get('ptypeofpayment')!   as FormControl;
//     const branchCtrl   = this.paymentVoucherForm.get('pbranchname')!      as FormControl;
//     const upiNameCtrl  = this.paymentVoucherForm.get('pUpiname')!         as FormControl;
//     const upiIdCtrl    = this.paymentVoucherForm.get('pUpiid')!           as FormControl;

//     if (this.showModeofPayment) {
//       modeCtrl.setValidators(Validators.required);
//       bankCtrl.setValidators(Validators.required);
//       chequeCtrl.setValidators(Validators.required);

//       this.showtranstype
//         ? transCtrl.setValidators(Validators.required)
//         : transCtrl.clearValidators();

//       this.showbankcard
//         ? cardCtrl.clearValidators()
//         : cardCtrl.setValidators(Validators.required);

//       this.showTypeofPayment
//         ? typeCtrl.setValidators(Validators.required)
//         : typeCtrl.clearValidators();

//       this.showbranch
//         ? branchCtrl.setValidators(Validators.required)
//         : branchCtrl.clearValidators();

//       if (this.showupi) {
//         upiNameCtrl.setValidators(Validators.required);
//         upiIdCtrl.setValidators(Validators.required);
//       } else {
//         upiNameCtrl.clearValidators();
//         upiIdCtrl.clearValidators();
//       }
//     } else {
//       modeCtrl.clearValidators();
//       bankCtrl.clearValidators();
//       chequeCtrl.clearValidators();
//     }

//     [modeCtrl, transCtrl, bankCtrl, chequeCtrl, cardCtrl,
//       typeCtrl, branchCtrl, upiNameCtrl, upiIdCtrl].forEach(c => c.updateValueAndValidity());
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Transaction / payment type changes  ← FROM DOC 1
//   // ══════════════════════════════════════════════════════════════════════════
//   transofPaymentChange(): void {
//     this.displayCardName  = 'Debit Card';
//     this.showTypeofPayment = false;
//     this.showbranch       = false;
//     this.showfinancial    = false;
//     this.showchequno      = false;
//     this.showbankcard     = true;
//     this.displaychequeno  = 'Reference No';

//     const transtype = this.paymentVoucherForm.get('ptranstype')?.value;

//     if (transtype === 'CHEQUE') {
//       this.showbankcard    = true;
//       this.displaychequeno = 'Cheque No';
//       this.showbranch      = true;
//       this.showchequno     = true;
//     } else if (transtype === 'ONLINE') {
//       this.showbankcard      = true;
//       this.showTypeofPayment = true;
//       this.showfinancial     = false;
//     } else if (transtype === 'DEBIT CARD') {
//       this.showbankcard  = false;
//       this.showfinancial = true;
//     } else {
//       this.displayCardName = 'Credit Card';
//       this.showbankcard    = false;
//       this.showfinancial   = true;
//     }

//     this.addModeofpaymentValidations();
//   }

//   typeofPaymentChange(): void {
//     this.showupi = this.paymentVoucherForm.get('ptypeofpayment')?.value === 'UPI';
//     this.getValidationByControl(this.paymentVoucherForm, 'ptypeofpayment', true);
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // GST / TDS checkbox events  ← FROM DOC 1
//   // ══════════════════════════════════════════════════════════════════════════
//   isgstapplicable_Checked(event: Event): void {
//     const checked = (event.target as HTMLInputElement).checked;
//     this.paymentVoucherForm.get('ppaymentsslistcontrols.pisgstapplicable')?.setValue(checked);
//     this.isgstapplicableChange();
//   }

//   istdsapplicable_Checked(event: Event): void {
//     const checked = (event.target as HTMLInputElement).checked;
//     this.paymentVoucherForm.get('ppaymentsslistcontrols.pistdsapplicable')?.setValue(checked);
//     this.istdsapplicableChange();
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // GST / TDS toggles
//   // ══════════════════════════════════════════════════════════════════════════
//   isgstapplicableChange(): void {
//     const enabled = this.paymentVoucherForm.get('ppaymentsslistcontrols.pisgstapplicable')?.value;
//     const calc  = this.pc.get('pgstcalculationtype');
//     const pct   = this.pc.get('pgstpercentage');
//     const state = this.pc.get('pState');
//     const amt   = this.pc.get('pgstamount');

//     if (enabled) {
//       this.showgst = true;
//       if (!this.disablegst) calc?.setValue('INCLUDE');
//       [calc, pct, state, amt].forEach(c => c?.setValidators([Validators.required]));
//     } else {
//       this.showgst = false;
//       if (!this.disablegst) calc?.setValue('');
//       [calc, pct, state, amt].forEach(c => c?.clearValidators());
//     }
//     [calc, pct, state, amt].forEach(c => c?.updateValueAndValidity());
//     this.claculategsttdsamounts();
//   }

//   istdsapplicableChange(): void {
//     const enabled  = this.paymentVoucherForm.get('ppaymentsslistcontrols.pistdsapplicable')?.value;
//     const calc     = this.pc.get('ptdscalculationtype');
//     const pct      = this.pc.get('pTdsPercentage');
//     const section  = this.pc.get('pTdsSection');
//     const amt      = this.pc.get('ptdsamount');

//     if (enabled) {
//       this.showtds = true;
//       if (!this.disabletds) calc?.setValue('INCLUDE');
//       [calc, pct, section, amt].forEach(c => c?.setValidators([Validators.required]));
//     } else {
//       this.showtds = false;
//       if (!this.disabletds) calc?.setValue('');
//       [calc, pct, section, amt].forEach(c => c?.clearValidators());
//     }
//     [calc, pct, section, amt].forEach(c => c?.updateValueAndValidity());
//     this.claculategsttdsamounts();
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Load data
//   // ══════════════════════════════════════════════════════════════════════════
//   getLoadData(): void {
//     this.accountingService
//       .GetReceiptsandPaymentsLoadingData2(
//         'JOURNAL VOUCHER',
//         this.commonService.getbranchname(),
//         this.commonService.getschemaname(),
//         this.commonService.getCompanyCode(),
//         this.commonService.getBranchCode(),
//         'taxes',
//       )
//       .pipe(takeUntilDestroyed(this.destroyRef))
//       .subscribe({
//         next: (json: any) => {
//           if (!json) return;
//           this.banklist             = json.banklist;
//           this.modeoftransactionslist = json.modeofTransactionslist;
//           this.typeofpaymentlist    = this.getTypeOfPaymentData();
//           this.ledgeraccountslist   = json.accountslist;
//           this.partylist            = json.partylist;
//           this.gstlist              = json.gstlist;
//           this.debitcardlist        = json.bankdebitcardslist;
//           this.setBalances('CASH', json.cashbalance);
//           this.setBalances('BANK', json.bankbalance);
//         },
//         error: (err: any) => this.commonService.showErrorMessage(err),
//       });
//   }

//   private getTypeOfPaymentData(): any {
//     return this.modeoftransactionslist?.filter(
//       (p: any) => p.ptranstype === p.ptypeofpayment,
//     );
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Bank / cheque / card / UPI change handlers  ← FROM DOC 1
//   // ══════════════════════════════════════════════════════════════════════════
//   bankName_Change(event: any): void {
//     const pbankid = event.target.value;
//     this.upinameslist    = [];
//     this.chequenumberslist = [];
//     this.paymentVoucherForm.get('pUpiname')?.setValue('');
//     this.paymentVoucherForm.get('pUpiid')?.setValue('');

//     if (pbankid) {
//       const bankname = event.target.options[event.target.selectedIndex].text;
//       this.getBankDetailsById(pbankid);
//       this.getBankBranchName(pbankid);
//       this.paymentVoucherForm.get('pbankname')?.setValue(bankname);
//     } else {
//       this.paymentVoucherForm.get('pbankname')?.setValue('');
//     }

//     this.getValidationByControl(this.paymentVoucherForm, 'pbankname', true);
//     this.formValidationMessages['pChequenumber'] = '';
//   }

//   chequenumber_Change(): void {
//     this.getValidationByControl(this.paymentVoucherForm, 'pChequenumber', true);
//   }

//   debitCard_Change(): void {
//     const data = this.getbankname(this.paymentVoucherForm.get('pCardNumber')?.value);
//     this.paymentVoucherForm.get('pbankname')?.setValue(data.pbankname);
//     this.paymentVoucherForm.get('pbankid')?.setValue(data.pbankid);
//     this.getValidationByControl(this.paymentVoucherForm, 'pCardNumber', true);
//   }

//   private getbankname(cardnumber: any): any {
//     try {
//       const data = this.debitcardlist.find((d: any) => d.pCardNumber === cardnumber);
//       this.setBalances('BANKBOOK', data.pbankbookbalance);
//       this.setBalances('PASSBOOK', data.ppassbookbalance);
//       return data;
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//     }
//   }

//   upiName_Change(event: any): void {
//     this.getValidationByControl(this.paymentVoucherForm, 'pUpiname', true);
//   }

//   upid_change(): void {
//     this.getValidationByControl(this.paymentVoucherForm, 'pUpiid', true);
//   }

//   private getBankDetailsById(pbankid: any): void {
//     this.accountingService
//       .GetBankDetailsbyId(pbankid)
//       .pipe(takeUntilDestroyed(this.destroyRef))
//       .subscribe({
//         next: (json: any) => {
//           if (!json) return;
//           this.upinameslist      = json.bankupilist;
//           this.chequenumberslist = json.chequeslist;
//         },
//         error: (err: any) => this.commonService.showErrorMessage(err),
//       });
//   }

//   private getBankBranchName(pbankid: any): void {
//     const data = this.banklist.find((b: any) => b.pbankid === pbankid);
//     if (!data) return;
//     this.paymentVoucherForm.get('pbranchname')?.setValue(data.pbranchname);
//     this.setBalances('BANKBOOK', data.pbankbalance);
//     this.setBalances('PASSBOOK', data.pbankpassbookbalance);
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Ledger / sub-ledger change handlers
//   // ══════════════════════════════════════════════════════════════════════════
//   ledgerName_Change(event: any): void {
//     const id = event?.pledgerid;
//     this.subledgeraccountslist = [];
//     this.pc.get('psubledgerid')?.setValue(null);
//     this.pc.get('psubledgername')?.setValue('');
//     this.setBalances('LEDGER', 0);
//     this.setBalances('SUBLEDGER', 0);

//     if (id) {
//       const data = this.ledgeraccountslist?.find((l: any) => l.pledgerid === id);
//       if (data) this.setBalances('LEDGER', data.accountbalance);
//       this.pc.get('pledgername')?.setValue(event.pledgername);
//       this.getSubLedgerData(id);
//     } else {
//       this.pc.get('pledgername')?.setValue('');
//     }
//   }

//   private getSubLedgerData(pledgerid: any): void {
//     this.accountingService
//       .GetSubLedgerData3(
//         pledgerid,
//         this.commonService.getbranchname(),
//         this.commonService.getCompanyCode(),
//         this.commonService.getbranchname(),
//         this.commonService.getBranchCode(),
//         this.commonService.getschemaname(),
//       )
//       .pipe(takeUntilDestroyed(this.destroyRef))
//       .subscribe({
//         next: (json: any) => {
//           if (!json) return;
//           this.subledgeraccountslist = json;
//           const subCtrl = this.pc.get('psubledgername');
//           if (this.subledgeraccountslist.length > 0) {
//             this.showsubledger = true;
//             subCtrl?.setValidators(Validators.required);
//           } else {
//             subCtrl?.clearValidators();
//             this.showsubledger = false;
//             this.pc.get('psubledgerid')?.setValue(pledgerid);
//             this.pc.get('psubledgername')?.setValue(this.pc.get('pledgername')?.value);
//             this.formValidationMessages['psubledgername'] = '';
//           }
//           subCtrl?.updateValueAndValidity();
//         },
//         error: (err: any) => this.commonService.showErrorMessage(err),
//       });
//   }

//   subledger_Change(event: any): void {
//     const id = event?.psubledgerid;
//     this.setBalances('SUBLEDGER', 0);
//     if (id) {
//       this.pc.get('psubledgername')?.setValue(event.psubledgername);
//       const data = this.subledgeraccountslist?.find((l: any) => l.psubledgerid === id);
//       this.setBalances('SUBLEDGER', data?.accountbalance ?? 0);
//     } else {
//       this.pc.get('psubledgername')?.setValue('');
//     }
//     this.getValidationByControl(this.paymentVoucherForm, 'psubledgername', true);
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Party change handlers
//   // ══════════════════════════════════════════════════════════════════════════
//   partyName_Change(event: any): void {
//     const id = event?.ppartyid;
//     this.statelist        = [];
//     this.tdssectionlist   = [];
//     this.tdspercentagelist = [];

//     ['pStateId', 'pState', 'pTdsSection', 'pTdsPercentage',
//       'ppartyreferenceid', 'ppartyreftype', 'ppartypannumber'].forEach(f => this.pc.get(f)?.setValue(''));

//     this.partyBalance = `${this.currencySymbol} 0.00 Dr`;

//     if (id) {
//       this.pc.get('ppartyname')?.setValue(event.ppartyname);
//       const data = this.partylist?.find((x: any) => x.ppartyid === id);
//       this.pc.get('ppartyreferenceid')?.setValue(data?.ppartyreferenceid ?? '');
//       this.pc.get('ppartyreftype')?.setValue(data?.ppartyreftype ?? '');
//       this.pc.get('ppartypannumber')?.setValue(data?.ppartypannumber ?? '');
//       this.getPartyDetailsById(id, event.ppartyname);
//       this.setenableordisabletdsgst(event.ppartyname, 'PARTYCHANGE');
//     } else {
//       this.setBalances('PARTY', 0);
//       this.pc.get('ppartyname')?.setValue('');
//     }
//   }

//   setenableordisabletdsgst(partyname: string, changetype: string): void {
//     this.pc.get('pistdsapplicable')?.setValue(false);
//     this.pc.get('pisgstapplicable')?.setValue(false);

//     const existing = this.paymentslist().find((x: any) => x.ppartyname === partyname);
//     if (existing) {
//       this.disablegst = true;
//       this.disabletds = true;
//       ['pistdsapplicable', 'pisgstapplicable', 'pgstcalculationtype', 'ptdscalculationtype'].forEach(f =>
//         this.pc.get(f)?.setValue(existing[f]),
//       );
//     } else {
//       this.disablegst = false;
//       this.disabletds = false;
//     }

//     if (changetype === 'PARTYCHANGE') {
//       this.isgstapplicableChange();
//       this.istdsapplicableChange();
//     }
//   }

//   private getPartyDetailsById(partyid: string, _partynamename: any): void {
//     this.accountingService
//       .getPartyDetailsbyid(
//         partyid,
//         this.commonService.getbranchname(),
//         this.commonService.getBranchCode(),
//         this.commonService.getCompanyCode(),
//         this.commonService.getschemaname(),
//         'taxes',
//       )
//       .pipe(takeUntilDestroyed(this.destroyRef))
//       .subscribe({
//         next: (json: any) => {
//           if (!json) return;
//           this.tdslist   = json.lstTdsSectionDetails || [];
//           this.statelist = json.statelist || [];
//           const unique   = Array.from(new Set(this.tdslist.map((i: any) => i.pTdsSection)));
//           this.tdssectionlist = unique.map(s => ({ pTdsSection: s }));
//           this.setBalances('PARTY', json.accountbalance ?? 0);
//           this.claculategsttdsamounts();
//         },
//         error: (err: any) => this.commonService.showErrorMessage(err),
//       });
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // TDS / GST field change handlers
//   // ══════════════════════════════════════════════════════════════════════════
//   tdsSection_Change(event: any): void {
//     const section = event.target.value;
//     this.tdspercentagelist = [];
//     this.pc.get('pTdsPercentage')?.setValue('');
//     if (section) this.getTdsPercentage(section);
//     this.getValidationByControl(this.paymentVoucherForm, 'pTdsSection', true);
//   }

//   private getTdsPercentage(section: any): void {
//     this.tdspercentagelist = this.tdslist?.filter((t: any) => t.pTdsSection === section);
//     this.claculategsttdsamounts();
//   }

//   tds_Change(_event: any): void {
//     this.getValidationByControl(this.paymentVoucherForm, 'pTdsPercentage', true);
//     this.getValidationByControl(this.paymentVoucherForm, 'ptdsamount', true);
//     this.claculategsttdsamounts();
//   }

//   gst_Change(event: any): void {
//     const pct = event.target.value;
//     ['pigstpercentage', 'pcgstpercentage', 'psgstpercentage', 'putgstpercentage'].forEach(f =>
//       this.pc.get(f)?.setValue(''),
//     );
//     if (pct) this.getGstPercentage(pct);
//     this.getValidationByControl(this.paymentVoucherForm, 'pgstpercentage', true);
//     this.getValidationByControl(this.paymentVoucherForm, 'pgstamount', true);
//   }

//   private getGstPercentage(pct: any): void {
//     const data = this.gstlist?.find((g: any) => g.pgstpercentage === pct);
//     if (!data) return;
//     ['pigstpercentage', 'pcgstpercentage', 'psgstpercentage', 'putgstpercentage'].forEach(f =>
//       this.pc.get(f)?.setValue(data[f]),
//     );
//     this.claculategsttdsamounts();
//   }

//   gsno_change(): void {
//     this.getValidationByControl(this.paymentVoucherForm, 'pgstno', true);
//   }

//   state_change(event: any): void {
//     const stateId = event.target.value;
//     if (stateId) {
//       const stateName = event.target.options[event.target.selectedIndex].text;
//       this.pc.get('pState')?.setValue(stateName);
//       this.showgstno    = !stateName.split('-')[1];

//       const stateData   = this.statelist?.find((s: any) => s.pStateId === stateId);
//       this.showgstamount = true;
//       this.showigst = this.showcgst = this.showsgst = this.showutgst = false;
//       this.pc.get('pgsttype')?.setValue(stateData?.pgsttype);

//       if (stateData?.pgsttype === 'IGST') {
//         this.showigst = true;
//       } else {
//         this.showcgst  = true;
//         this.showsgst  = stateData?.pgsttype === 'CGST,SGST';
//         this.showutgst = stateData?.pgsttype === 'CGST,UTGST';
//       }
//     } else {
//       this.pc.get('pState')?.setValue('');
//     }
//     this.getValidationByControl(this.paymentVoucherForm, 'pState', true);
//     this.formValidationMessages['pigstpercentage'] = '';
//     this.claculategsttdsamounts();
//   }

//   pamount_change(): void {
//     this.claculategsttdsamounts();
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // GST / TDS calculation
//   // ══════════════════════════════════════════════════════════════════════════
//   claculategsttdsamounts(): void {
//     try {
//       const safe = (v: any) => {
//         const n = parseFloat((v ?? '0').toString().replace(/,/g, ''));
//         return isNaN(n) ? 0 : n;
//       };

//       let paid   = this.amounttype === 'Debit'
//         ? safe(this.pc.get('pdebitamount')?.value)
//         : safe(this.pc.get('pcreditamount')?.value);
//       let actual = paid;

//       const gstOn   = this.pc.get('pisgstapplicable')?.value ?? false;
//       const gstType = this.pc.get('pgsttype')?.value ?? '';
//       const gstCalc = this.pc.get('pgstcalculationtype')?.value ?? '';
//       const igstPct = safe(this.pc.get('pigstpercentage')?.value);
//       const cgstPct = safe(this.pc.get('pcgstpercentage')?.value);
//       const sgstPct = safe(this.pc.get('psgstpercentage')?.value);
//       const uPct    = safe(this.pc.get('putgstpercentage')?.value);

//       let gst = 0, igst = 0, cgst = 0, sgst = 0, utgst = 0;

//       if (gstOn) {
//         if (gstCalc === 'INCLUDE') {
//           if (gstType === 'IGST') {
//             igst = Math.round((paid * igstPct) / (100 + igstPct));
//             actual -= igst; gst = igst;
//           } else if (gstType === 'CGST,SGST') {
//             cgst = Math.round((paid * cgstPct) / (100 + igstPct));
//             sgst = Math.round((paid * sgstPct) / (100 + igstPct));
//             actual -= cgst + sgst; gst = cgst + sgst;
//           } else if (gstType === 'CGST,UTGST') {
//             cgst  = Math.round((paid * cgstPct) / (100 + igstPct));
//             utgst = Math.round((paid * uPct)    / (100 + igstPct));
//             actual -= cgst + utgst; gst = cgst + utgst;
//           }
//         } else if (gstCalc === 'EXCLUDE') {
//           if (gstType === 'IGST')      igst = Math.round((paid * igstPct) / 100);
//           if (gstType === 'CGST,SGST')  { cgst = Math.round((paid * cgstPct) / 100); sgst  = Math.round((paid * sgstPct) / 100); }
//           if (gstType === 'CGST,UTGST') { cgst = Math.round((paid * cgstPct) / 100); utgst = Math.round((paid * uPct)    / 100); }
//           gst = igst + cgst + sgst + utgst;
//         }
//       }

//       const tdsOn   = this.pc.get('pistdsapplicable')?.value ?? false;
//       const tdsCalc = this.pc.get('ptdscalculationtype')?.value ?? '';
//       const tdsPct  = safe(this.pc.get('pTdsPercentage')?.value);
//       let tds = 0;

//       if (tdsOn) {
//         const base = tdsCalc === 'INCLUDE' && gstCalc === 'INCLUDE' ? actual : paid;
//         if (tdsCalc === 'INCLUDE')  { tds = Math.round((base * tdsPct) / (100 + tdsPct)); actual -= tds; }
//         else if (tdsCalc === 'EXCLUDE') { tds = Math.round((paid * tdsPct) / 100); }
//       }

//       const total = actual + igst + cgst + sgst + utgst + tds;

//       const fields: Record<string, any> = {
//         pamount:             actual > 0 ? actual : '',
//         pgstamount:          gst,
//         pigstamount:         igst,
//         pcgstamount:         cgst,
//         psgstamount:         sgst,
//         putgstamount:        utgst,
//         ptdsamount:          tds,
//         ptotalamount:        total,
//         ...(this.amounttype === 'Debit'  ? { ptotaldebitamount:  total } : {}),
//         ...(this.amounttype === 'Credit' ? { ptotalcreditamount: total } : {}),
//       };

//       Object.entries(fields).forEach(([k, v]) => {
//         if (v !== undefined) this.pc.get(k)?.setValue(v);
//       });

//       this.formValidationMessages['pamount'] = '';
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//     }
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Validate before adding a row  ← FROM DOC 1
//   // Checks for duplicate ledger+subledger+party combination in grid
//   // ══════════════════════════════════════════════════════════════════════════
//   private validateaddPaymentDetails(): boolean {
//     let isValid = true;
//     try {
//       isValid = this.checkValidations(this.pc, isValid);

//       const ledgername   = this.pc.get('pledgername')?.value;
//       const subledgername = this.pc.get('psubledgername')?.value;
//       const partyname    = this.pc.get('ppartyname')?.value;

//       const isDuplicate = this.paymentslist().some(
//         row => row.pledgername === ledgername &&
//                row.psubledgername === subledgername &&
//                row.ppartyname === partyname,
//       );

//       if (isDuplicate) {
//         this.commonService.showWarningMessage('Ledger name and Party name already exists in grid');
//         isValid = false;
//       }
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//     }
//     return isValid;
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Add row — with duplicate check + multiple debit/credit rule  ← DOC 1 logic
//   // ══════════════════════════════════════════════════════════════════════════
//   addPaymentDetails(): void {
//     this.pc.markAllAsTouched();
//     if (this.pc.invalid) return;

//     // Duplicate ledger+party check
//     if (!this.validateaddPaymentDetails()) return;

//     const safeNum = (v: any) => parseFloat((v ?? '0').toString().replace(/,/g, '')) || 0;
//     const ledgerId    = this.pc.get('pledgerid')?.value;
//     const subledgerId = this.pc.get('psubledgerid')?.value;
//     const debit       = safeNum(this.pc.get('pdebitamount')?.value);
//     const credit      = safeNum(this.pc.get('pcreditamount')?.value);
//     const amount      = debit > 0 ? debit : credit;

//     // ── Multiple debit / credit rule  ← FROM DOC 1 ──
//     const existingDebits  = this.paymentslist().filter(x => safeNum(x.pdebitamount)  > 0).length;
//     const existingCredits = this.paymentslist().filter(x => safeNum(x.pcreditamount) > 0).length;

//     if (existingDebits >= 2 && credit > 0 && existingCredits >= 1) {
//       this.commonService.showWarningMessage('Only one credit allowed when multiple debits exist');
//       return;
//     }
//     if (existingCredits >= 2 && debit > 0 && existingDebits >= 1) {
//       this.commonService.showWarningMessage('Only one debit allowed when multiple credits exist');
//       return;
//     }

//     // ── Subledger restriction check ──
//     this.accountingService
//       .GetSubLedgerRestrictedStatus(
//         subledgerId,
//         this.commonService.getbranchname(),
//         this.commonService.getschemaname(),
//         this.commonService.getBranchCode(),
//         this.commonService.getCompanyCode(),
//       )
//       .pipe(takeUntilDestroyed(this.destroyRef))
//       .subscribe((res: any) => {
//         const { credit_restriction_status, debit_restriction_status } = res[0];
//         if ((debit > 0 && debit_restriction_status) || (credit > 0 && credit_restriction_status)) {
//           this.commonService.showWarningMessage('Transaction Not Allowed');
//           return;
//         }

//         // ── Balance check ──
//         this.subscriberJVService
//           .GetdebitchitCheckbalance(
//             this.commonService.getbranchname(),
//             ledgerId, 36, subledgerId,
//             this.commonService.getschemaname(),
//             this.commonService.getCompanyCode(),
//             this.commonService.getBranchCode(),
//           )
//           .pipe(takeUntilDestroyed(this.destroyRef))
//           .subscribe((result: any) => {
//             const balance = safeNum(result.balanceamount);
//             const checkOn = result.balancecheckstatus !== false;

//             if (!checkOn || amount <= balance) {
//               const row = { ...this.pc.value, pdebitamount: debit, pcreditamount: credit };
//               this.paymentslist.update(list => [...list, row]);
//               this.pc.reset();
//               this.pc.markAsPristine();
//               this.pc.markAsUntouched();
//               this.calculateTotals();
//               this.getpartyJournalEntryData();
//               this.clearPaymentDetails1();
//               this.getPaymentListColumnWisetotals();
//               this.disableamounttype('');
//               this.validateDebitCreditAmounts();
//               this.showhidegrid = true;
//             } else {
//               this.commonService.showWarningMessage('Insufficient Balance');
//             }
//           });
//       });
//   }

//   calculateTotals(): void {
//     const safeNum = (v: any) => parseFloat((v ?? '0').toString().replace(/,/g, '')) || 0;
//     const list    = this.paymentslist();
//     this.debittotalamount.set(list.reduce((s, i) => s + safeNum(i.pdebitamount),  0));
//     this.credittotalamount.set(list.reduce((s, i) => s + safeNum(i.pcreditamount), 0));
//   }

//   removeHandler(_row: any, rowIndex: number): void {
//     this.paymentslist.update(list => list.filter((_, i) => i !== rowIndex));
//     this.calculateTotals();
//     this.showhidegrid = this.paymentslist().length > 0;
//     this.getpartyJournalEntryData();
//     this.disableamounttype('');
//     this.getPaymentListColumnWisetotals();
//     this.validateDebitCreditAmounts();
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Clear helpers
//   // ══════════════════════════════════════════════════════════════════════════
//   clearPaymentDetails(): void {
//     this.pc.reset();
//     ['pistdsapplicable', 'pisgstapplicable'].forEach(f => this.pc.get(f)?.setValue(false));
//     this.resetTaxFlags();
//     this.isgstapplicableChange();
//     this.istdsapplicableChange();
//     this.formValidationMessages = {};
//     this.showsubledger = true;
//   }

//   clearPaymentDetails1(): void {
//     this.pc.get('pistdsapplicable')?.setValue(false);
//     this.pc.get('pisgstapplicable')?.setValue(false);
//     ['psubledgerid', 'ppartyid', 'pStateId', 'pgstpercentage', 'pTdsSection', 'pTdsPercentage',
//       'pdebitamount', 'pcreditamount', 'pledgerid', 'pledgername', 'psubledgername'].forEach(f =>
//         this.pc.get(f)?.setValue(f.endsWith('id') ? null : ''),
//     );
//     ['LEDGER', 'SUBLEDGER', 'PARTY'].forEach(t => this.setBalances(t, 0));
//     this.resetTaxFlags();
//     this.isgstapplicableChange();
//     this.istdsapplicableChange();
//     this.formValidationMessages = {};
//   }

//   private resetTaxFlags(): void {
//     this.subledgeraccountslist = [];
//     this.showsubledger         = true;
//     this.showgst = this.showtds = this.showgstamount = false;
//     this.showigst = this.showcgst = this.showsgst = this.showutgst = this.showgstno = false;
//     this.statelist = [];
//     this.tdssectionlist = [];
//     this.tdspercentagelist = [];
//     ['LEDGER', 'SUBLEDGER', 'PARTY'].forEach(t => this.setBalances(t, 0));
//   }

//   clearPaymentVoucher(): void {
//     try {
//       this.paymentslist.set([]);
//       this.debittotalamount.set(0);
//       this.credittotalamount.set(0);
//       this.paymentVoucherForm.reset();
//       this.showhidegrid = false;
//       this.clearPaymentDetails();
//       this.paymentVoucherForm.get('pjvdate')?.setValue(new Date());
//       this.paymentVoucherForm.get('schemaname')?.setValue(this.commonService.getschemaname());
//       this.formValidationMessages    = {};
//       this.paymentlistcolumnwiselist = undefined;
//       this.cashBalance = this.bankBalance = this.bankbookBalance = this.bankpassbookBalance = '0';
//       const z = `${this.currencySymbol} 0.00 Dr`;
//       this.ledgerBalance = this.subledgerBalance = this.partyBalance = z;
//       this.partyjournalentrylist = [];
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//     }
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Validation before save
//   // ══════════════════════════════════════════════════════════════════════════
//   validatesaveJournalVoucher(): boolean {
//     debugger
//     const dateOk   = this.paymentVoucherForm.get('pjvdate')?.valid;
//     const narratOk = this.paymentVoucherForm.get('pnarration')?.valid;

//     if (!dateOk || !narratOk) {
//       this.paymentVoucherForm.get('pjvdate')?.markAsTouched();
//       this.paymentVoucherForm.get('pnarration')?.markAsTouched();
//       this.commonService.showWarningMessage('Please fill all required fields (Date and Narration)');
//       return false;
//     }
//     if (!this.paymentslist().length) {
//       this.commonService.showWarningMessage('Please add at least one entry to the grid');
//       return false;
//     }
//     return true;
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Save
//   // ══════════════════════════════════════════════════════════════════════════
//   saveJournalVoucher(): void {
//     debugger
//     if (!this.validatesaveJournalVoucher()) return;
//     if (!confirm('Do You Want to Save ?')) return;

//     this.disablesavebutton = true;
//     this.savebutton        = 'Processing';

//     try {
//       const list   = this.paymentslist();
//       const sumFn  = (key: string) => list.reduce((s, i) => s + Number(i[key] || 0), 0);
//       const totalD = sumFn('pdebitamount');
//       const totalC = sumFn('pcreditamount');

//       if (totalD !== totalC) {
//         this.commonService.showWarningMessage(`Debit (${totalD}) and Credit (${totalC}) must be equal`);
//         this.disablesavebutton = false;
//         this.savebutton = 'Save';
//         return;
//       }

//       const clean = (v: any) => Number((v ?? 0).toString().replace(/,/g, '')).toFixed(2);

//       const payload = {
//         global_schema:      this.commonService.getschemaname(),
//         branch_schema:      this.commonService.getbranchname(),
//         company_code:       this.commonService.getCompanyCode(),
//         branch_code:        this.commonService.getBranchCode(),
//         pjvnumber:          this.paymentVoucherForm.value.ppaymentid || '',
//         pjvdate:            this.commonService.getFormatDateNormal(this.paymentVoucherForm.value.pjvdate),
//         pnarration:         this.paymentVoucherForm.value.pnarration || '',
//         ptotalpaidamount:   totalD.toFixed(2),
//         pmodoftransaction:  this.paymentVoucherForm.value.pmodofpayment || '',
//         referenceno:        '',
//         tdsVoucherStatus:   '',
//         pbranchid:          '1',
//         pCreatedby:         '1',
//         pipaddress:         this.commonService.getIpAddress() || '::1',
//         formname:           'JOURNAL VOUCHER',
//         pFilename: '', pFilepath: '', pFileformat: '',
//         pJournalVoucherlist: list.map((item: any) => ({
//           ppartyid:              String(item.ppartyid || ''),
//           psubledgerid:          String(item.psubledgerid || ''),
//           ptranstype:            item.ptranstype === 'Debit' ? 'D' : item.ptranstype === 'Credit' ? 'C' : '',
//           pledgername:           item.pledgername || '',
//           paccountname:          item.pledgername || '',
//           pgstnumber:            '',
//           ppartyname:            item.ppartyname || '',
//           ppartyreferenceid:     String(item.psubledgerid || ''),
//           ppartyreftype:         '',
//           pistdsapplicable:      '',
//           ptdsamount:            String(item.ptdsamount || ''),
//           ptdscalculationtype:   '',
//           ptdsaccountId:         '',
//           ppartypannumber:       '',
//           ptdsrefjvnumber:       '',
//           pamount:               clean(item.pdebitamount || item.pcreditamount || item.pamount || 0),
//           ledgeramount:          clean(item.pdebitamount || item.pcreditamount || item.pamount || 0),
//           totalreceivedamount:   clean(item.pdebitamount || item.pcreditamount || item.pamount || 0),
//           pFilename: '', agentcode: '', ticketno: '',
//           chitgroupid: '1', schemesubscriberid: '1',
//           interbranchsubledgerid: '1', interbranchid: '2',
//           pformname:     'LEGAL EXPENSES JV',
//           pgstvoucherno: '', pChequenumber: '',
//         })),
//       };

//       this.accountingService
//         .saveJournalVoucher(payload)
//         .pipe(takeUntilDestroyed(this.destroyRef))
//         .subscribe({
//           next: (res: any) => {
//             if (res?.success === true) {
//               this.commonService.showInfoMessage('Saved successfully');
//               this.clearPaymentVoucher();
//               const receipt = btoa(`${res.voucherNo},Journal Voucher`);
//               const url     = this.router.serializeUrl(
//                 this.router.createUrlTree(['/journal-voucher', receipt]),
//               );
//               window.open(url, '_blank');
//             }
//             this.disablesavebutton = false;
//             this.savebutton = 'Save';
//           },
//           error: (err: any) => {
//             this.commonService.showErrorMessage(err);
//             this.disablesavebutton = false;
//             this.savebutton = 'Save';
//           },
//         });
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//       this.disablesavebutton = false;
//       this.savebutton = 'Save';
//     }
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Amount type control
//   // ══════════════════════════════════════════════════════════════════════════
//   disableamounttype(_type: string): void {
//     const debit  = this.pc.get('pdebitamount')!;
//     const credit = this.pc.get('pcreditamount')!;
//     const trans  = this.pc.get('ptranstype')!;
//     const amt    = this.pc.get('pamount')!;
//     const dVal   = debit.value;
//     const cVal   = credit.value;

//     if (!dVal && !cVal) {
//       this.readonlydebit = this.readonlycredit = false;
//       trans.reset(); amt.reset();
//       debit.setValidators([Validators.required]);  debit.updateValueAndValidity();
//       credit.setValidators([Validators.required]); credit.updateValueAndValidity();
//     }
//     if (dVal) {
//       this.readonlydebit = false; this.readonlycredit = true;
//       trans.setValue('Debit'); amt.setValue(dVal);
//       credit.reset(); credit.clearValidators(); credit.updateValueAndValidity();
//       debit.setValidators([Validators.required]); debit.updateValueAndValidity();
//     }
//     if (cVal) {
//       this.readonlydebit = true; this.readonlycredit = false;
//       trans.setValue('Credit'); amt.setValue(cVal);
//       debit.reset(); debit.clearValidators(); debit.updateValueAndValidity();
//       credit.setValidators([Validators.required]); credit.updateValueAndValidity();
//     }
//   }

//   validateDebitCreditAmounts(): void {
//     try {
//       const list   = this.paymentslist();
//       const dCnt   = list.filter((i: any) => !isNullOrEmpty(i.pdebitamount)).length;
//       const cCnt   = list.filter((i: any) => !isNullOrEmpty(i.pcreditamount)).length;
//       const dCtrl  = this.pc.get('pdebitamount')  as FormControl;
//       const cCtrl  = this.pc.get('pcreditamount') as FormControl;

//       if (dCnt > 1 && cCnt === 1) {
//         this.readonlydebit = false; this.readonlycredit = true;
//         cCtrl.clearValidators(); cCtrl.updateValueAndValidity();
//       } else if (cCnt > 1 && dCnt === 1) {
//         this.readonlydebit = true; this.readonlycredit = false;
//         dCtrl.clearValidators(); dCtrl.updateValueAndValidity();
//       } else {
//         this.readonlydebit = this.readonlycredit = false;
//       }
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//     }
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Journal entry display
//   // ══════════════════════════════════════════════════════════════════════════
//   getpartyJournalEntryData(): void {
//     this.partyjournalentrylist = [];
//     const mode = this.paymentVoucherForm.get('pmodofpayment')?.value;
//     this.partyjournalentrylist.push(
//       mode === 'CASH'
//         ? { accountname: 'To MAIN CASH', debitamount: '', creditamount: '1000' }
//         : { accountname: 'To BANK',      debitamount: '', creditamount: '20000' },
//     );
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // Column-wise totals
//   // ══════════════════════════════════════════════════════════════════════════
//   getPaymentListColumnWisetotals(): void {
//     this.hidefootertemplate = false;
//     const safeNum = (v: any) => {
//       if (isNullOrEmpty(v)) return 0;
//       return parseFloat(v.toString().replace(/,/g, '')) || 0;
//     };
//     const list = this.paymentslist();
//     this.paymentlistcolumnwiselist = {
//       ptotaldebitamount:  list.reduce((s: number, i: any) => s + safeNum(i.ptotaldebitamount), 0).toFixed(2),
//       ptotalcreditamount: list.reduce((s: number, i: any) => s + safeNum(i.ptotalcreditamount), 0).toFixed(2),
//       pamount:    list.reduce((s: number, i: any) => s + this.commonService.removeCommasInAmount(i.pamount),    0),
//       pgstamount: list.reduce((s: number, i: any) => s + this.commonService.removeCommasInAmount(i.pgstamount), 0),
//       ptdsamount: list.reduce((s: number, i: any) => s + this.commonService.removeCommasInAmount(i.ptdsamount), 0),
//     };
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   // File upload
//   // ══════════════════════════════════════════════════════════════════════════
//   uploadAndProgress(event: any, files: any): void {
//     const ext = event.target.value.substring(event.target.value.lastIndexOf('.') + 1);
//     if (!this.validateFile(event.target.value)) {
//       this.commonService.showWarningMessage('Upload jpg or png or jpeg files');
//       return;
//     }
//     const file = event.target.files[0];
//     if (event && file) {
//       const reader = new FileReader();
//       reader.readAsDataURL(file);
//       reader.onload = () => {
//         this.imageResponse = { name: file.name, fileType: 'imageResponse', contentType: file.type, size: file.size };
//       };
//     }
//     if (!files?.length) return;
//     const formData = new FormData();
//     for (let i = 0; i < files.length; i++) {
//       formData.append(files[i].name, files[i]);
//       formData.append('NewFileName', `Journal Voucher.${files[i].name.split('.').pop()}`);
//     }
//     this.commonService.fileUploadS3('Account', formData)
//       .pipe(takeUntilDestroyed(this.destroyRef))
//       .subscribe((data: any) => {
//         this.kycFileName      = data[0];
//         this.imageResponse.name = data[0];
//         this.paymentVoucherForm.get('pFilename')?.setValue(this.kycFileName);
//       });
//   }

//   validateFile(fileName: any): boolean {
//     if (!fileName) return true;
//     const ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
//     return ['jpg', 'png', 'jpeg'].includes(ext);
//   }

//   showErrorMessage(msg: string): void {
//     this.commonService.showErrorMessage(msg);
//   }
// }

// // ── Module-level helper ────────────────────────────────────────────────────
// function isNullOrEmpty(value: any): boolean {
//   return value === null || value === undefined || value === '';
// }



import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-journal-voucher',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgSelectModule,
    DatePickerModule,
    ButtonModule,
    TableModule,
    CurrencyPipe,
    RouterModule,
  ],
  templateUrl: './journal-voucher.html',
  providers: [CurrencyPipe],
})
export class JournalVoucher implements OnInit {
  pDatepickerMaxDate: Date = new Date();


  // ── DI via inject() ────────────────────────────────────────────────────────
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly commonService = inject(CommonService);
  private readonly accountingService = inject(AccountsTransactions);
  private readonly subscriberJVService = inject(AccountsTransactions);

  // ── Signals ────────────────────────────────────────────────────────────────
  readonly paymentslist = signal<any[]>([]);
  readonly debittotalamount = signal<number>(0);
  readonly credittotalamount = signal<number>(0);

  readonly balancesMismatch = computed(
    () => this.debittotalamount() !== this.credittotalamount(),
  );

  // ── UI state ───────────────────────────────────────────────────────────────
  showModeofPayment = false;
  showTypeofPayment = false;
  showtranstype = false;
  showbankcard = true;
  showbranch = true;
  showfinancial = true;
  showupi = false;
  showchequno = true;
  showgst = true;
  showtds = true;
  showgstandtds = false;
  imageResponse: any;
  currencySymbol: any;
  readonlydebit = false;
  readonlycredit = false;
  showgstamount = false;
  showigst = false;
  showcgst = false;
  showsgst = false;
  showutgst = false;
  showgstno = false;
  showhidegrid = false;
  showsubledger = true;
  formValidationMessages: any = {};
  paymentlistcolumnwiselist: any;
  displayCardName = 'Debit Card';
  displaychequeno = 'Cheque No';
  kycFileName: any;

  // ── List data ──────────────────────────────────────────────────────────────
  banklist: any;
  modeoftransactionslist: any;
  typeofpaymentlist: any;
  ledgeraccountslist: any;
  subledgeraccountslist: any;
  partylist: any;
  gstlist: any;
  tdslist: any;
  tdssectionlist: any;
  tdspercentagelist: any;
  debitcardlist: any;
  statelist: any;
  chequenumberslist: any;
  upinameslist: any;
  upiidlist: any;
  partyjournalentrylist: any;
  amounttype: any;

  // ── Balance strings ────────────────────────────────────────────────────────
  cashBalance: any;
  bankBalance: any;
  bankbookBalance: any;
  bankpassbookBalance: any;
  ledgerBalance: any;
  subledgerBalance: any;
  partyBalance: any;

  // ── Misc state ─────────────────────────────────────────────────────────────
  disablegst!: boolean;
  disabletds = false;
  disablesavebutton = false;
  savebutton = 'Save';
  hidefootertemplate: any;
  disabletransactiondate = false;

  // ── Form ───────────────────────────────────────────────────────────────────
  paymentVoucherForm!: FormGroup;

  readonly ppaymentdateConfig: any = {
    maxDate: new Date(),
    containerClass: 'theme-dark-blue',
    dateInputFormat: 'DD-MMM-YYYY',
    showWeekNumbers: false,
  };
  today: any;

  // ══════════════════════════════════════════════════════════════════════════
  // Lifecycle
  // ══════════════════════════════════════════════════════════════════════════
  ngOnInit(): void {
    this.currencySymbol = this.commonService.currencysymbol || '₹';
    this.ledgerBalance = `${this.currencySymbol} 0.00 Dr`;
    this.subledgerBalance = `${this.currencySymbol} 0.00 Dr`;
    this.partyBalance = `${this.currencySymbol} 0.00 Dr`;

    const company = this.commonService.comapnydetails;
    if (company) {
      this.disabletransactiondate =
        !!(company.pdatepickerenablestatus || company.pfinclosingjvallowstatus);
    }

    this.formValidationMessages = {};
    this.hidefootertemplate = true;

    this.paymentVoucherForm = this.fb.group({
      ppaymentid: [''],
      pjvdate: [{value:this.today,disabled:true}, Validators.required],

      ptotalpaidamount: [''],
      pnarration: ['', [Validators.required, Validators.maxLength(250)]],
      pmodofpayment: ['M'],
      pbankname: [''],
      pbranchname: [''],
      ptranstype: [''],
      pCardNumber: [''],
      pUpiname: [''],
      pUpiid: [''],
      schemaname: [this.commonService.getschemaname()],
      ptypeofpayment: [''],
      pChequenumber: [''],
      pchequedate: [''],
      pbankid: [''],
      pdebitamount: ['', Validators.required],
      pcreditamount: ['', Validators.required],
      pamount: [''],
      pCreatedby: [this.commonService.getCreatedBy()],
      pipaddress: [this.commonService.getIpAddress()],
      pStatusname: [this.commonService.pStatusname],
      ptypeofoperation: [this.commonService.ptypeofoperation],
      ppaymentsslistcontrols: this.buildPaymentControls(),
      pFilename: [''],
      pFilepath: [''],
      pFileformat: [''],
      pDocStorePath: [''],
    });

    this.isgstapplicableChange();
    this.istdsapplicableChange();
    //this.paymentVoucherForm.get('pjvdate')?.setValue(new Date());
    this.paymentVoucherForm.get('pjvdate')?.setValue(this.pDatepickerMaxDate);
    this.getLoadData();
    this.blurEventAllControls(this.paymentVoucherForm);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Form helpers
  // ══════════════════════════════════════════════════════════════════════════
  private buildPaymentControls(): FormGroup {
    return this.fb.group({
      psubledgerid: [null, Validators.required],
      psubledgername: [''],
      pledgerid: [null, Validators.required],
      pledgername: ['', Validators.required],
      pamount: [''],
      pactualpaidamount: [''],
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
      pdebitamount: ['', Validators.required],
      pcreditamount: ['', Validators.required],
      pigstpercentage: [''],
      pcgstpercentage: [''],
      psgstpercentage: [''],
      putgstpercentage: [''],
      ptotalcreditamount: [''],
      ptotaldebitamount: [''],
      ptranstype: [''],
      ptypeofoperation: [this.commonService.ptypeofoperation],
      ptotalamount: [''],
    });
  }

  /** Shorthand accessor for the nested payment controls FormGroup */
  private get pc(): FormGroup {
    return this.paymentVoucherForm.get('ppaymentsslistcontrols') as FormGroup;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Input helpers
  // ══════════════════════════════════════════════════════════════════════════
  allowNumberOnly(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9.]/g, '');
  }

  formatCurrency(field: string): void {
    const control = this.paymentVoucherForm.get(`ppaymentsslistcontrols.${field}`);
    if (!control?.value) return;
    const num = parseFloat(control.value.toString().replace(/,/g, ''));
    if (isNaN(num)) return;
    control.setValue(
      num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      { emitEvent: false },
    );
  }

  trackByFn(index: any, _item: any): any {
    return index;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Validation helpers
  // ══════════════════════════════════════════════════════════════════════════
  blurEventAllControls(group: FormGroup): void {
    try {
      Object.keys(group.controls).forEach(key => this.setBlurEvent(group, key));
    } catch (e) {
      this.commonService.showErrorMessage(e);
    }
  }

  private setBlurEvent(group: FormGroup, key: string): void {
    try {
      const control = group.get(key);
      if (!control) return;
      if (control instanceof FormGroup) {
        this.blurEventAllControls(control);
      } else if (control.validator) {
        control.valueChanges
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => this.getValidationByControl(group, key, true));
      }
    } catch (e) {
      this.commonService.showErrorMessage(e);
    }
  }

  checkValidations(group: FormGroup, isValid: boolean): boolean {
    try {
      Object.keys(group.controls).forEach(key => {
        isValid = this.getValidationByControl(group, key, isValid);
      });
    } catch {
      return false;
    }
    return isValid;
  }

  getValidationByControl(group: FormGroup, key: string, isValid: boolean): boolean {
    try {
      let control = group.get(key) ?? this.pc.get(key);
      if (!control) return isValid;

      if (control instanceof FormGroup) {
        if (key !== 'ppaymentsslistcontrols') this.checkValidations(control, isValid);
        return isValid;
      }

      if (control.validator) {
        this.formValidationMessages[key] = '';
        if (control.errors || control.invalid || control.touched || control.dirty) {
          const labelEl = document.getElementById(key) as HTMLInputElement | null;
          const labelName = labelEl?.title ?? key;
          for (const errorKey in control.errors) {
            const msg = this.commonService.getValidationMessage(control, errorKey, labelName, key, '');
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

  // ══════════════════════════════════════════════════════════════════════════
  // Balance display
  // ══════════════════════════════════════════════════════════════════════════
  setBalances(type: string, amount: any): void {
    const num = parseFloat(amount);
    const abs = Math.abs(num);
    const formatted = num < 0
      ? `${this.commonService.currencyFormat(abs.toFixed(2))} Cr`
      : `${this.commonService.currencyFormat(num.toFixed(2))} Dr`;

    const sym = this.currencySymbol;
    const map: Record<string, () => void> = {
      CASH: () => (this.cashBalance = formatted),
      BANK: () => (this.bankBalance = formatted),
      BANKBOOK: () => (this.bankbookBalance = formatted),
      PASSBOOK: () => (this.bankpassbookBalance = formatted),
      LEDGER: () => (this.ledgerBalance = `${sym} ${formatted}`),
      SUBLEDGER: () => (this.subledgerBalance = `${sym} ${formatted}`),
      PARTY: () => (this.partyBalance = `${sym} ${formatted}`),
    };
    map[type]?.();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Mode-of-payment validations  ← FROM DOC 1
  // ══════════════════════════════════════════════════════════════════════════
  addModeofpaymentValidations(): void {
    const modeCtrl = this.paymentVoucherForm.get('pmodofpayment')! as FormControl;
    const transCtrl = this.paymentVoucherForm.get('ptranstype')! as FormControl;
    const bankCtrl = this.paymentVoucherForm.get('pbankname')! as FormControl;
    const chequeCtrl = this.paymentVoucherForm.get('pChequenumber')! as FormControl;
    const cardCtrl = this.paymentVoucherForm.get('pCardNumber')! as FormControl;
    const typeCtrl = this.paymentVoucherForm.get('ptypeofpayment')! as FormControl;
    const branchCtrl = this.paymentVoucherForm.get('pbranchname')! as FormControl;
    const upiNameCtrl = this.paymentVoucherForm.get('pUpiname')! as FormControl;
    const upiIdCtrl = this.paymentVoucherForm.get('pUpiid')! as FormControl;

    if (this.showModeofPayment) {
      modeCtrl.setValidators(Validators.required);
      bankCtrl.setValidators(Validators.required);
      chequeCtrl.setValidators(Validators.required);

      this.showtranstype
        ? transCtrl.setValidators(Validators.required)
        : transCtrl.clearValidators();

      this.showbankcard
        ? cardCtrl.clearValidators()
        : cardCtrl.setValidators(Validators.required);

      this.showTypeofPayment
        ? typeCtrl.setValidators(Validators.required)
        : typeCtrl.clearValidators();

      this.showbranch
        ? branchCtrl.setValidators(Validators.required)
        : branchCtrl.clearValidators();

      if (this.showupi) {
        upiNameCtrl.setValidators(Validators.required);
        upiIdCtrl.setValidators(Validators.required);
      } else {
        upiNameCtrl.clearValidators();
        upiIdCtrl.clearValidators();
      }
    } else {
      modeCtrl.clearValidators();
      bankCtrl.clearValidators();
      chequeCtrl.clearValidators();
    }

    [modeCtrl, transCtrl, bankCtrl, chequeCtrl, cardCtrl,
      typeCtrl, branchCtrl, upiNameCtrl, upiIdCtrl].forEach(c => c.updateValueAndValidity());
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Transaction / payment type changes  ← FROM DOC 1
  // ══════════════════════════════════════════════════════════════════════════
  transofPaymentChange(): void {
    this.displayCardName = 'Debit Card';
    this.showTypeofPayment = false;
    this.showbranch = false;
    this.showfinancial = false;
    this.showchequno = false;
    this.showbankcard = true;
    this.displaychequeno = 'Reference No';

    const transtype = this.paymentVoucherForm.get('ptranstype')?.value;

    if (transtype === 'CHEQUE') {
      this.showbankcard = true;
      this.displaychequeno = 'Cheque No';
      this.showbranch = true;
      this.showchequno = true;
    } else if (transtype === 'ONLINE') {
      this.showbankcard = true;
      this.showTypeofPayment = true;
      this.showfinancial = false;
    } else if (transtype === 'DEBIT CARD') {
      this.showbankcard = false;
      this.showfinancial = true;
    } else {
      this.displayCardName = 'Credit Card';
      this.showbankcard = false;
      this.showfinancial = true;
    }

    this.addModeofpaymentValidations();
  }

  typeofPaymentChange(): void {
    this.showupi = this.paymentVoucherForm.get('ptypeofpayment')?.value === 'UPI';
    this.getValidationByControl(this.paymentVoucherForm, 'ptypeofpayment', true);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GST / TDS checkbox events  ← FROM DOC 1
  // ══════════════════════════════════════════════════════════════════════════
  isgstapplicable_Checked(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.paymentVoucherForm.get('ppaymentsslistcontrols.pisgstapplicable')?.setValue(checked);
    this.isgstapplicableChange();
  }

  istdsapplicable_Checked(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.paymentVoucherForm.get('ppaymentsslistcontrols.pistdsapplicable')?.setValue(checked);
    this.istdsapplicableChange();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GST / TDS toggles
  // ══════════════════════════════════════════════════════════════════════════
  isgstapplicableChange(): void {
    const enabled = this.paymentVoucherForm.get('ppaymentsslistcontrols.pisgstapplicable')?.value;
    const calc = this.pc.get('pgstcalculationtype');
    const pct = this.pc.get('pgstpercentage');
    const state = this.pc.get('pState');
    const amt = this.pc.get('pgstamount');

    if (enabled) {
      this.showgst = true;
      if (!this.disablegst) calc?.setValue('INCLUDE');
      [calc, pct, state, amt].forEach(c => c?.setValidators([Validators.required]));
    } else {
      this.showgst = false;
      if (!this.disablegst) calc?.setValue('');
      [calc, pct, state, amt].forEach(c => c?.clearValidators());
    }
    [calc, pct, state, amt].forEach(c => c?.updateValueAndValidity());
    this.claculategsttdsamounts();
  }

  istdsapplicableChange(): void {
    const enabled = this.paymentVoucherForm.get('ppaymentsslistcontrols.pistdsapplicable')?.value;
    const calc = this.pc.get('ptdscalculationtype');
    const pct = this.pc.get('pTdsPercentage');
    const section = this.pc.get('pTdsSection');
    const amt = this.pc.get('ptdsamount');

    if (enabled) {
      this.showtds = true;
      if (!this.disabletds) calc?.setValue('INCLUDE');
      [calc, pct, section, amt].forEach(c => c?.setValidators([Validators.required]));
    } else {
      this.showtds = false;
      if (!this.disabletds) calc?.setValue('');
      [calc, pct, section, amt].forEach(c => c?.clearValidators());
    }
    [calc, pct, section, amt].forEach(c => c?.updateValueAndValidity());
    this.claculategsttdsamounts();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Load data
  // ══════════════════════════════════════════════════════════════════════════
  getLoadData(): void {
    this.accountingService
      .GetReceiptsandPaymentsLoadingData2(
        'JOURNAL VOUCHER',
        this.commonService.getbranchname(),
        this.commonService.getschemaname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode(),
        'taxes',
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (json: any) => {
          if (!json) return;
          this.banklist = json.banklist;
          this.modeoftransactionslist = json.modeofTransactionslist;
          this.typeofpaymentlist = this.getTypeOfPaymentData();
          this.ledgeraccountslist = json.accountslist;
          this.partylist = json.partylist;
          this.gstlist = json.gstlist;
          this.debitcardlist = json.bankdebitcardslist;
          this.setBalances('CASH', json.cashbalance);
          this.setBalances('BANK', json.bankbalance);
        },
        error: (err: any) => this.commonService.showErrorMessage(err),
      });
  }

  private getTypeOfPaymentData(): any {
    return this.modeoftransactionslist?.filter(
      (p: any) => p.ptranstype === p.ptypeofpayment,
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Bank / cheque / card / UPI change handlers  ← FROM DOC 1
  // ══════════════════════════════════════════════════════════════════════════
  bankName_Change(event: any): void {
    const pbankid = event.target.value;
    this.upinameslist = [];
    this.chequenumberslist = [];
    this.paymentVoucherForm.get('pUpiname')?.setValue('');
    this.paymentVoucherForm.get('pUpiid')?.setValue('');

    if (pbankid) {
      const bankname = event.target.options[event.target.selectedIndex].text;
      this.getBankDetailsById(pbankid);
      this.getBankBranchName(pbankid);
      this.paymentVoucherForm.get('pbankname')?.setValue(bankname);
    } else {
      this.paymentVoucherForm.get('pbankname')?.setValue('');
    }

    this.getValidationByControl(this.paymentVoucherForm, 'pbankname', true);
    this.formValidationMessages['pChequenumber'] = '';
  }

  chequenumber_Change(): void {
    this.getValidationByControl(this.paymentVoucherForm, 'pChequenumber', true);
  }

  debitCard_Change(): void {
    const data = this.getbankname(this.paymentVoucherForm.get('pCardNumber')?.value);
    this.paymentVoucherForm.get('pbankname')?.setValue(data.pbankname);
    this.paymentVoucherForm.get('pbankid')?.setValue(data.pbankid);
    this.getValidationByControl(this.paymentVoucherForm, 'pCardNumber', true);
  }

  private getbankname(cardnumber: any): any {
    try {
      const data = this.debitcardlist.find((d: any) => d.pCardNumber === cardnumber);
      this.setBalances('BANKBOOK', data.pbankbookbalance);
      this.setBalances('PASSBOOK', data.ppassbookbalance);
      return data;
    } catch (e) {
      this.commonService.showErrorMessage(e);
    }
  }

  upiName_Change(event: any): void {
    this.getValidationByControl(this.paymentVoucherForm, 'pUpiname', true);
  }

  upid_change(): void {
    this.getValidationByControl(this.paymentVoucherForm, 'pUpiid', true);
  }

  private getBankDetailsById(pbankid: any): void {
    this.accountingService
      .GetBankDetailsbyId(pbankid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (json: any) => {
          if (!json) return;
          this.upinameslist = json.bankupilist;
          this.chequenumberslist = json.chequeslist;
        },
        error: (err: any) => this.commonService.showErrorMessage(err),
      });
  }

  private getBankBranchName(pbankid: any): void {
    const data = this.banklist.find((b: any) => b.pbankid === pbankid);
    if (!data) return;
    this.paymentVoucherForm.get('pbranchname')?.setValue(data.pbranchname);
    this.setBalances('BANKBOOK', data.pbankbalance);
    this.setBalances('PASSBOOK', data.pbankpassbookbalance);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Ledger / sub-ledger change handlers
  // ══════════════════════════════════════════════════════════════════════════
  ledgerName_Change(event: any): void {
    const id = event?.pledgerid;
    this.subledgeraccountslist = [];
    this.pc.get('psubledgerid')?.setValue(null);
    this.pc.get('psubledgername')?.setValue('');
    this.setBalances('LEDGER', 0);
    this.setBalances('SUBLEDGER', 0);

    if (id) {
      const data = this.ledgeraccountslist?.find((l: any) => l.pledgerid === id);
      if (data) this.setBalances('LEDGER', data.accountbalance);
      this.pc.get('pledgername')?.setValue(event.pledgername);
      this.getSubLedgerData(id);
    } else {
      this.pc.get('pledgername')?.setValue('');
    }
  }

  private getSubLedgerData(pledgerid: any): void {
    this.accountingService
      .GetSubLedgerData3(
        pledgerid,
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getbranchname(),
        this.commonService.getBranchCode(),
        this.commonService.getschemaname(),
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (json: any) => {
          if (!json) return;
          this.subledgeraccountslist = json;
          const subCtrl = this.pc.get('psubledgerid');
          if (this.subledgeraccountslist.length > 0) {
            this.showsubledger = true;
            subCtrl?.setValidators(Validators.required);
          } else {
            subCtrl?.clearValidators();
            this.showsubledger = false;
            this.pc.get('psubledgerid')?.setValue(pledgerid);
            this.pc.get('psubledgername')?.setValue(this.pc.get('pledgername')?.value);
            this.formValidationMessages['psubledgername'] = '';
          }
          subCtrl?.updateValueAndValidity();
        },
        error: (err: any) => this.commonService.showErrorMessage(err),
      });
  }

  subledger_Change(event: any): void {
    const id = event?.psubledgerid;
    this.setBalances('SUBLEDGER', 0);
    if (id) {
      this.pc.get('psubledgername')?.setValue(event.psubledgername);
      const data = this.subledgeraccountslist?.find((l: any) => l.psubledgerid === id);
      this.setBalances('SUBLEDGER', data?.accountbalance ?? 0);
    } else {
      this.pc.get('psubledgername')?.setValue('');
    }
    this.getValidationByControl(this.paymentVoucherForm, 'psubledgername', true);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Party change handlers
  // ══════════════════════════════════════════════════════════════════════════
  partyName_Change(event: any): void {
    const id = event?.ppartyid;
    this.statelist = [];
    this.tdssectionlist = [];
    this.tdspercentagelist = [];

    ['pStateId', 'pState', 'pTdsSection', 'pTdsPercentage',
      'ppartyreferenceid', 'ppartyreftype', 'ppartypannumber'].forEach(f => this.pc.get(f)?.setValue(''));

    this.partyBalance = `${this.currencySymbol} 0.00 Dr`;

    if (id) {
      this.pc.get('ppartyname')?.setValue(event.ppartyname);
      const data = this.partylist?.find((x: any) => x.ppartyid === id);
      this.pc.get('ppartyreferenceid')?.setValue(data?.ppartyreferenceid ?? '');
      this.pc.get('ppartyreftype')?.setValue(data?.ppartyreftype ?? '');
      this.pc.get('ppartypannumber')?.setValue(data?.ppartypannumber ?? '');
      this.getPartyDetailsById(id, event.ppartyname);
      this.setenableordisabletdsgst(event.ppartyname, 'PARTYCHANGE');
    } else {
      this.setBalances('PARTY', 0);
      this.pc.get('ppartyname')?.setValue('');
    }
  }

  setenableordisabletdsgst(partyname: string, changetype: string): void {
    this.pc.get('pistdsapplicable')?.setValue(false);
    this.pc.get('pisgstapplicable')?.setValue(false);

    const existing = this.paymentslist().find((x: any) => x.ppartyname === partyname);
    if (existing) {
      this.disablegst = true;
      this.disabletds = true;
      ['pistdsapplicable', 'pisgstapplicable', 'pgstcalculationtype', 'ptdscalculationtype'].forEach(f =>
        this.pc.get(f)?.setValue(existing[f]),
      );
    } else {
      this.disablegst = false;
      this.disabletds = false;
    }

    if (changetype === 'PARTYCHANGE') {
      this.isgstapplicableChange();
      this.istdsapplicableChange();
    }
  }

  private getPartyDetailsById(partyid: string, _partynamename: any): void {
    this.accountingService
      .getPartyDetailsbyid(
        partyid,
        this.commonService.getbranchname(),
        this.commonService.getBranchCode(),
        this.commonService.getCompanyCode(),
        this.commonService.getschemaname(),
        'taxes',
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (json: any) => {
          if (!json) return;
          this.tdslist = json.lstTdsSectionDetails || [];
          this.statelist = json.statelist || [];
          const unique = Array.from(new Set(this.tdslist.map((i: any) => i.pTdsSection)));
          this.tdssectionlist = unique.map(s => ({ pTdsSection: s }));
          this.setBalances('PARTY', json.accountbalance ?? 0);
          this.claculategsttdsamounts();
        },
        error: (err: any) => this.commonService.showErrorMessage(err),
      });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TDS / GST field change handlers
  // ══════════════════════════════════════════════════════════════════════════
  tdsSection_Change(event: any): void {
    const section = event.target.value;
    this.tdspercentagelist = [];
    this.pc.get('pTdsPercentage')?.setValue('');
    if (section) this.getTdsPercentage(section);
    this.getValidationByControl(this.paymentVoucherForm, 'pTdsSection', true);
  }

  private getTdsPercentage(section: any): void {
    this.tdspercentagelist = this.tdslist?.filter((t: any) => t.pTdsSection === section);
    this.claculategsttdsamounts();
  }

  tds_Change(_event: any): void {
    this.getValidationByControl(this.paymentVoucherForm, 'pTdsPercentage', true);
    this.getValidationByControl(this.paymentVoucherForm, 'ptdsamount', true);
    this.claculategsttdsamounts();
  }

  gst_Change(event: any): void {
    const pct = event.target.value;
    ['pigstpercentage', 'pcgstpercentage', 'psgstpercentage', 'putgstpercentage'].forEach(f =>
      this.pc.get(f)?.setValue(''),
    );
    if (pct) this.getGstPercentage(pct);
    this.getValidationByControl(this.paymentVoucherForm, 'pgstpercentage', true);
    this.getValidationByControl(this.paymentVoucherForm, 'pgstamount', true);
  }

  private getGstPercentage(pct: any): void {
    const data = this.gstlist?.find((g: any) => g.pgstpercentage === pct);
    if (!data) return;
    ['pigstpercentage', 'pcgstpercentage', 'psgstpercentage', 'putgstpercentage'].forEach(f =>
      this.pc.get(f)?.setValue(data[f]),
    );
    this.claculategsttdsamounts();
  }

  gsno_change(): void {
    this.getValidationByControl(this.paymentVoucherForm, 'pgstno', true);
  }

  state_change(event: any): void {
    const stateId = event.target.value;
    if (stateId) {
      const stateName = event.target.options[event.target.selectedIndex].text;
      this.pc.get('pState')?.setValue(stateName);
      this.showgstno = !stateName.split('-')[1];

      const stateData = this.statelist?.find((s: any) => s.pStateId === stateId);
      this.showgstamount = true;
      this.showigst = this.showcgst = this.showsgst = this.showutgst = false;
      this.pc.get('pgsttype')?.setValue(stateData?.pgsttype);

      if (stateData?.pgsttype === 'IGST') {
        this.showigst = true;
      } else {
        this.showcgst = true;
        this.showsgst = stateData?.pgsttype === 'CGST,SGST';
        this.showutgst = stateData?.pgsttype === 'CGST,UTGST';
      }
    } else {
      this.pc.get('pState')?.setValue('');
    }
    this.getValidationByControl(this.paymentVoucherForm, 'pState', true);
    this.formValidationMessages['pigstpercentage'] = '';
    this.claculategsttdsamounts();
  }

  pamount_change(): void {
    this.claculategsttdsamounts();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GST / TDS calculation
  // ══════════════════════════════════════════════════════════════════════════
  claculategsttdsamounts(): void {
    try {
      const safe = (v: any) => {
        const n = parseFloat((v ?? '0').toString().replace(/,/g, ''));
        return isNaN(n) ? 0 : n;
      };

      let paid = this.amounttype === 'Debit'
        ? safe(this.pc.get('pdebitamount')?.value)
        : safe(this.pc.get('pcreditamount')?.value);
      let actual = paid;

      const gstOn = this.pc.get('pisgstapplicable')?.value ?? false;
      const gstType = this.pc.get('pgsttype')?.value ?? '';
      const gstCalc = this.pc.get('pgstcalculationtype')?.value ?? '';
      const igstPct = safe(this.pc.get('pigstpercentage')?.value);
      const cgstPct = safe(this.pc.get('pcgstpercentage')?.value);
      const sgstPct = safe(this.pc.get('psgstpercentage')?.value);
      const uPct = safe(this.pc.get('putgstpercentage')?.value);

      let gst = 0, igst = 0, cgst = 0, sgst = 0, utgst = 0;

      if (gstOn) {
        if (gstCalc === 'INCLUDE') {
          if (gstType === 'IGST') {
            igst = Math.round((paid * igstPct) / (100 + igstPct));
            actual -= igst; gst = igst;
          } else if (gstType === 'CGST,SGST') {
            cgst = Math.round((paid * cgstPct) / (100 + igstPct));
            sgst = Math.round((paid * sgstPct) / (100 + igstPct));
            actual -= cgst + sgst; gst = cgst + sgst;
          } else if (gstType === 'CGST,UTGST') {
            cgst = Math.round((paid * cgstPct) / (100 + igstPct));
            utgst = Math.round((paid * uPct) / (100 + igstPct));
            actual -= cgst + utgst; gst = cgst + utgst;
          }
        } else if (gstCalc === 'EXCLUDE') {
          if (gstType === 'IGST') igst = Math.round((paid * igstPct) / 100);
          if (gstType === 'CGST,SGST') { cgst = Math.round((paid * cgstPct) / 100); sgst = Math.round((paid * sgstPct) / 100); }
          if (gstType === 'CGST,UTGST') { cgst = Math.round((paid * cgstPct) / 100); utgst = Math.round((paid * uPct) / 100); }
          gst = igst + cgst + sgst + utgst;
        }
      }

      const tdsOn = this.pc.get('pistdsapplicable')?.value ?? false;
      const tdsCalc = this.pc.get('ptdscalculationtype')?.value ?? '';
      const tdsPct = safe(this.pc.get('pTdsPercentage')?.value);
      let tds = 0;

      if (tdsOn) {
        const base = tdsCalc === 'INCLUDE' && gstCalc === 'INCLUDE' ? actual : paid;
        if (tdsCalc === 'INCLUDE') { tds = Math.round((base * tdsPct) / (100 + tdsPct)); actual -= tds; }
        else if (tdsCalc === 'EXCLUDE') { tds = Math.round((paid * tdsPct) / 100); }
      }

      const total = actual + igst + cgst + sgst + utgst + tds;

      const fields: Record<string, any> = {
        pamount: actual > 0 ? actual : '',
        pgstamount: gst,
        pigstamount: igst,
        pcgstamount: cgst,
        psgstamount: sgst,
        putgstamount: utgst,
        ptdsamount: tds,
        ptotalamount: total,
        ...(this.amounttype === 'Debit' ? { ptotaldebitamount: total } : {}),
        ...(this.amounttype === 'Credit' ? { ptotalcreditamount: total } : {}),
      };

      Object.entries(fields).forEach(([k, v]) => {
        if (v !== undefined) this.pc.get(k)?.setValue(v);
      });

      this.formValidationMessages['pamount'] = '';
    } catch (e) {
      this.commonService.showErrorMessage(e);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Validate before adding a row  ← FROM DOC 1
  // Checks for duplicate ledger+subledger+party combination in grid
  // ══════════════════════════════════════════════════════════════════════════
  private validateaddPaymentDetails(): boolean {
    let isValid = true;
    try {
      isValid = this.checkValidations(this.pc, isValid);

      const ledgername = this.pc.get('pledgername')?.value;
      const subledgername = this.pc.get('psubledgername')?.value;
      const partyname = this.pc.get('ppartyname')?.value;

      const isDuplicate = this.paymentslist().some(
        row => row.pledgername === ledgername &&
          row.psubledgername === subledgername &&
          row.ppartyname === partyname,
      );

      if (isDuplicate) {
        this.commonService.showWarningMessage('Ledger name and Party name already exists in grid');
        isValid = false;
      }
    } catch (e) {
      this.commonService.showErrorMessage(e);
    }
    return isValid;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Add row — with duplicate check + multiple debit/credit rule  ← DOC 1 logic
  // ══════════════════════════════════════════════════════════════════════════
  addPaymentDetails(): void {
    this.pc.markAllAsTouched();
    if (this.pc.invalid) return;

    // Duplicate ledger+party check
    if (!this.validateaddPaymentDetails()) return;

    const safeNum = (v: any) => parseFloat((v ?? '0').toString().replace(/,/g, '')) || 0;
    const ledgerId = this.pc.get('pledgerid')?.value;
    const subledgerId = this.pc.get('psubledgerid')?.value;
    const debit = safeNum(this.pc.get('pdebitamount')?.value);
    const credit = safeNum(this.pc.get('pcreditamount')?.value);
    const amount = debit > 0 ? debit : credit;

    // ── Multiple debit / credit rule  ← FROM DOC 1 ──
    const existingDebits = this.paymentslist().filter(x => safeNum(x.pdebitamount) > 0).length;
    const existingCredits = this.paymentslist().filter(x => safeNum(x.pcreditamount) > 0).length;

    if (existingDebits >= 2 && credit > 0 && existingCredits >= 1) {
      this.commonService.showWarningMessage('Only one credit allowed when multiple debits exist');
      return;
    }
    if (existingCredits >= 2 && debit > 0 && existingDebits >= 1) {
      this.commonService.showWarningMessage('Only one debit allowed when multiple credits exist');
      return;
    }

    // ── Subledger restriction check ──
    this.accountingService
      .GetSubLedgerRestrictedStatus(
        subledgerId,
        this.commonService.getbranchname(),
        this.commonService.getschemaname(),
        this.commonService.getBranchCode(),
        this.commonService.getCompanyCode(),
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: any) => {
        const { credit_restriction_status, debit_restriction_status } = res[0];
        if ((debit > 0 && debit_restriction_status) || (credit > 0 && credit_restriction_status)) {
          this.commonService.showWarningMessage('Transaction Not Allowed');
          return;
        }

        // ── Balance check ──
        this.subscriberJVService
          .GetdebitchitCheckbalance(
            this.commonService.getbranchname(),
            ledgerId, 36, subledgerId,
            this.commonService.getschemaname(),
            this.commonService.getCompanyCode(),
            this.commonService.getBranchCode(),
          )
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((result: any) => {
            const balance = safeNum(result.balanceamount);
            const checkOn = result.balancecheckstatus !== false;

            if (!checkOn || amount <= balance) {
              const row = { ...this.pc.value, pdebitamount: debit, pcreditamount: credit };
              this.paymentslist.update(list => [...list, row]);
              this.pc.reset();
              this.pc.markAsPristine();
              this.pc.markAsUntouched();
              this.calculateTotals();
              this.getpartyJournalEntryData();
              this.clearPaymentDetails1();
              this.getPaymentListColumnWisetotals();
              this.disableamounttype('');
              this.validateDebitCreditAmounts();
              this.showhidegrid = true;
            } else {
              this.commonService.showWarningMessage('Insufficient Balance');
            }
          });
      });
  }

  calculateTotals(): void {
    const safeNum = (v: any) => parseFloat((v ?? '0').toString().replace(/,/g, '')) || 0;
    const list = this.paymentslist();
    this.debittotalamount.set(list.reduce((s, i) => s + safeNum(i.pdebitamount), 0));
    this.credittotalamount.set(list.reduce((s, i) => s + safeNum(i.pcreditamount), 0));
  }

  removeHandler(_row: any, rowIndex: number): void {
    this.paymentslist.update(list => list.filter((_, i) => i !== rowIndex));
    this.calculateTotals();
    this.showhidegrid = this.paymentslist().length > 0;
    this.getpartyJournalEntryData();
    this.disableamounttype('');
    this.getPaymentListColumnWisetotals();
    this.validateDebitCreditAmounts();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Clear helpers
  // ══════════════════════════════════════════════════════════════════════════
  clearPaymentDetails(): void {
    this.pc.reset();
    ['pistdsapplicable', 'pisgstapplicable'].forEach(f => this.pc.get(f)?.setValue(false));
    this.resetTaxFlags();
    this.isgstapplicableChange();
    this.istdsapplicableChange();
    this.formValidationMessages = {};
    this.showsubledger = true;
  }

  clearPaymentDetails1(): void {
    this.pc.get('pistdsapplicable')?.setValue(false);
    this.pc.get('pisgstapplicable')?.setValue(false);
    ['psubledgerid', 'ppartyid', 'pStateId', 'pgstpercentage', 'pTdsSection', 'pTdsPercentage',
      'pdebitamount', 'pcreditamount', 'pledgerid', 'pledgername', 'psubledgername'].forEach(f =>
        this.pc.get(f)?.setValue(f.endsWith('id') ? null : ''),
      );
    ['LEDGER', 'SUBLEDGER', 'PARTY'].forEach(t => this.setBalances(t, 0));
    this.resetTaxFlags();
    this.isgstapplicableChange();
    this.istdsapplicableChange();
    this.formValidationMessages = {};
  }

  private resetTaxFlags(): void {
    this.subledgeraccountslist = [];
    this.showsubledger = true;
    this.showgst = this.showtds = this.showgstamount = false;
    this.showigst = this.showcgst = this.showsgst = this.showutgst = this.showgstno = false;
    this.statelist = [];
    this.tdssectionlist = [];
    this.tdspercentagelist = [];
    ['LEDGER', 'SUBLEDGER', 'PARTY'].forEach(t => this.setBalances(t, 0));
  }

  clearPaymentVoucher(): void {
    try {
      this.paymentslist.set([]);
      this.debittotalamount.set(0);
      this.credittotalamount.set(0);
      this.paymentVoucherForm.reset();
      this.showhidegrid = false;
      this.clearPaymentDetails();
      this.paymentVoucherForm.get('pjvdate')?.setValue(new Date());
      this.paymentVoucherForm.get('schemaname')?.setValue(this.commonService.getschemaname());
      this.formValidationMessages = {};
      this.paymentlistcolumnwiselist = undefined;
      this.cashBalance = this.bankBalance = this.bankbookBalance = this.bankpassbookBalance = '0';
      const z = `${this.currencySymbol} 0.00 Dr`;
      this.ledgerBalance = this.subledgerBalance = this.partyBalance = z;
      this.partyjournalentrylist = [];
    } catch (e) {
      this.commonService.showErrorMessage(e);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Validation before save
  // ══════════════════════════════════════════════════════════════════════════
  validatesaveJournalVoucher(): boolean {
    debugger
    const dateOk = this.paymentVoucherForm.get('pjvdate')?.valid;
    const narratOk = this.paymentVoucherForm.get('pnarration')?.valid;

    if (!dateOk || !narratOk) {
      this.paymentVoucherForm.get('pjvdate')?.markAsTouched();
      this.paymentVoucherForm.get('pnarration')?.markAsTouched();
      this.commonService.showWarningMessage('Please fill all required fields (Date and Narration)');
      return false;
    }
    if (!this.paymentslist().length) {
      this.commonService.showWarningMessage('Please add at least one entry to the grid');
      return false;
    }
    return true;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Save
  // ══════════════════════════════════════════════════════════════════════════
  saveJournalVoucher(): void {
    debugger
    if (!this.validatesaveJournalVoucher()) return;
    if (!confirm('Do You Want to Save ?')) return;

    this.disablesavebutton = true;
    this.savebutton = 'Processing';

    try {
      const list = this.paymentslist();
      const sumFn = (key: string) => list.reduce((s, i) => s + Number(i[key] || 0), 0);
      const totalD = sumFn('pdebitamount');
      const totalC = sumFn('pcreditamount');

      if (totalD !== totalC) {
        this.commonService.showWarningMessage(`Debit (${totalD}) and Credit (${totalC}) must be equal`);
        this.disablesavebutton = false;
        this.savebutton = 'Save';
        return;
      }

      const clean = (v: any) => Number((v ?? 0).toString().replace(/,/g, '')).toFixed(2);

      const payload = {
        global_schema: this.commonService.getschemaname(),
        branch_schema: this.commonService.getbranchname(),
        company_code: this.commonService.getCompanyCode(),
        branch_code: this.commonService.getBranchCode(),
        pjvnumber: this.paymentVoucherForm.value.ppaymentid || '',
        pjvdate: this.commonService.getFormatDateNormal(this.paymentVoucherForm.value.pjvdate),
        pnarration: this.paymentVoucherForm.value.pnarration || '',
        ptotalpaidamount: totalD.toFixed(2),
        pmodoftransaction: this.paymentVoucherForm.value.pmodofpayment || '',
        referenceno: '',
        tdsVoucherStatus: '',
        pbranchid: '1',
        pCreatedby: '1',
        pipaddress: this.commonService.getIpAddress() || '::1',
        formname: 'JOURNAL VOUCHER',
        pFilename: '', pFilepath: '', pFileformat: '',
        pJournalVoucherlist: list.map((item: any) => ({
          ppartyid: String(item.ppartyid || ''),
          psubledgerid: String(item.psubledgerid || ''),
          ptranstype: item.ptranstype === 'Debit' ? 'D' : item.ptranstype === 'Credit' ? 'C' : '',
          pledgername: item.pledgername || '',
          paccountname: item.pledgername || '',
          pgstnumber: '',
          ppartyname: item.ppartyname || '',
          ppartyreferenceid: String(item.psubledgerid || ''),
          ppartyreftype: '',
          pistdsapplicable: '',
          ptdsamount: String(item.ptdsamount || ''),
          ptdscalculationtype: '',
          ptdsaccountId: '',
          ppartypannumber: '',
          ptdsrefjvnumber: '',
          pamount: clean(item.pdebitamount || item.pcreditamount || item.pamount || 0),
          ledgeramount: clean(item.pdebitamount || item.pcreditamount || item.pamount || 0),
          totalreceivedamount: clean(item.pdebitamount || item.pcreditamount || item.pamount || 0),
          pFilename: '', agentcode: '', ticketno: '',
          chitgroupid: '1', schemesubscriberid: '1',
          interbranchsubledgerid: '1', interbranchid: '2',
          pformname: 'LEGAL EXPENSES JV',
          pgstvoucherno: '', pChequenumber: '',
        })),
      };

      this.accountingService
        .saveJournalVoucher(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res: any) => {
            if (res?.success === true) {
              this.commonService.showInfoMessage('Saved successfully');
              this.clearPaymentVoucher();
              const receipt = btoa(`${res.voucherNo},Journal Voucher`);
              const url = this.router.serializeUrl(
                this.router.createUrlTree(['/journal-voucher', receipt]),
              );
              window.open(url, '_blank');
            }
            this.disablesavebutton = false;
            this.savebutton = 'Save';
          },
          error: (err: any) => {
            this.commonService.showErrorMessage(err);
            this.disablesavebutton = false;
            this.savebutton = 'Save';
          },
        });
    } catch (e) {
      this.commonService.showErrorMessage(e);
      this.disablesavebutton = false;
      this.savebutton = 'Save';
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Amount type control
  // ══════════════════════════════════════════════════════════════════════════
  disableamounttype(_type: string): void {
    const debit = this.pc.get('pdebitamount')!;
    const credit = this.pc.get('pcreditamount')!;
    const trans = this.pc.get('ptranstype')!;
    const amt = this.pc.get('pamount')!;
    const dVal = debit.value;
    const cVal = credit.value;

    if (!dVal && !cVal) {
      this.readonlydebit = this.readonlycredit = false;
      trans.reset(); amt.reset();
      debit.setValidators([Validators.required]); debit.updateValueAndValidity();
      credit.setValidators([Validators.required]); credit.updateValueAndValidity();
    }
    if (dVal) {
      this.readonlydebit = false; this.readonlycredit = true;
      trans.setValue('Debit'); amt.setValue(dVal);
      credit.reset(); credit.clearValidators(); credit.updateValueAndValidity();
      debit.setValidators([Validators.required]); debit.updateValueAndValidity();
    }
    if (cVal) {
      this.readonlydebit = true; this.readonlycredit = false;
      trans.setValue('Credit'); amt.setValue(cVal);
      debit.reset(); debit.clearValidators(); debit.updateValueAndValidity();
      credit.setValidators([Validators.required]); credit.updateValueAndValidity();
    }
  }

  validateDebitCreditAmounts(): void {
    try {
      const list = this.paymentslist();
      const dCnt = list.filter((i: any) => !isNullOrEmpty(i.pdebitamount)).length;
      const cCnt = list.filter((i: any) => !isNullOrEmpty(i.pcreditamount)).length;
      const dCtrl = this.pc.get('pdebitamount') as FormControl;
      const cCtrl = this.pc.get('pcreditamount') as FormControl;

      if (dCnt > 1 && cCnt === 1) {
        this.readonlydebit = false; this.readonlycredit = true;
        cCtrl.clearValidators(); cCtrl.updateValueAndValidity();
      } else if (cCnt > 1 && dCnt === 1) {
        this.readonlydebit = true; this.readonlycredit = false;
        dCtrl.clearValidators(); dCtrl.updateValueAndValidity();
      } else {
        this.readonlydebit = this.readonlycredit = false;
      }
    } catch (e) {
      this.commonService.showErrorMessage(e);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Journal entry display
  // ══════════════════════════════════════════════════════════════════════════
  getpartyJournalEntryData(): void {
    this.partyjournalentrylist = [];
    const mode = this.paymentVoucherForm.get('pmodofpayment')?.value;
    this.partyjournalentrylist.push(
      mode === 'CASH'
        ? { accountname: 'To MAIN CASH', debitamount: '', creditamount: '1000' }
        : { accountname: 'To BANK', debitamount: '', creditamount: '20000' },
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Column-wise totals
  // ══════════════════════════════════════════════════════════════════════════
  getPaymentListColumnWisetotals(): void {
    this.hidefootertemplate = false;
    const safeNum = (v: any) => {
      if (isNullOrEmpty(v)) return 0;
      return parseFloat(v.toString().replace(/,/g, '')) || 0;
    };
    const list = this.paymentslist();
    this.paymentlistcolumnwiselist = {
      ptotaldebitamount: list.reduce((s: number, i: any) => s + safeNum(i.ptotaldebitamount), 0).toFixed(2),
      ptotalcreditamount: list.reduce((s: number, i: any) => s + safeNum(i.ptotalcreditamount), 0).toFixed(2),
      pamount: list.reduce((s: number, i: any) => s + this.commonService.removeCommasInAmount(i.pamount), 0),
      pgstamount: list.reduce((s: number, i: any) => s + this.commonService.removeCommasInAmount(i.pgstamount), 0),
      ptdsamount: list.reduce((s: number, i: any) => s + this.commonService.removeCommasInAmount(i.ptdsamount), 0),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // File upload
  // ══════════════════════════════════════════════════════════════════════════
  uploadAndProgress(event: any, files: any): void {
    const ext = event.target.value.substring(event.target.value.lastIndexOf('.') + 1);
    if (!this.validateFile(event.target.value)) {
      this.commonService.showWarningMessage('Upload jpg or png or jpeg files');
      return;
    }
    const file = event.target.files[0];
    if (event && file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        this.imageResponse = { name: file.name, fileType: 'imageResponse', contentType: file.type, size: file.size };
      };
    }
    if (!files?.length) return;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append(files[i].name, files[i]);
      formData.append('NewFileName', `Journal Voucher.${files[i].name.split('.').pop()}`);
    }
    this.commonService.fileUploadS3('Account', formData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: any) => {
        this.kycFileName = data[0];
        this.imageResponse.name = data[0];
        this.paymentVoucherForm.get('pFilename')?.setValue(this.kycFileName);
      });
  }

  validateFile(fileName: any): boolean {
    if (!fileName) return true;
    const ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
    return ['jpg', 'png', 'jpeg'].includes(ext);
  }

  showErrorMessage(msg: string): void {
    this.commonService.showErrorMessage(msg);
  }
}

// ── Module-level helper ────────────────────────────────────────────────────
function isNullOrEmpty(value: any): boolean {
  return value === null || value === undefined || value === '';
}