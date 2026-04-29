// import {
//   ChangeDetectionStrategy,
//   ChangeDetectorRef,
//   Component,
//   DestroyRef,
//   OnInit,
//   computed,
//   inject,
//   signal,
// } from '@angular/core';
// import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
// import { CommonModule, DatePipe } from '@angular/common';
// import {
//   FormBuilder,
//   FormControl,
//   FormGroup,
//   ReactiveFormsModule,
//   Validators,
// } from '@angular/forms';
// import { Router, RouterModule } from '@angular/router';
// import { BsDatepickerConfig, BsDatepickerModule } from 'ngx-bootstrap/datepicker';
// import { TableModule } from 'primeng/table';
// import { ButtonModule } from 'primeng/button';
// import { InputTextModule } from 'primeng/inputtext';
// import { NgSelectModule } from '@ng-select/ng-select';
// import { PaginatorModule } from 'primeng/paginator';

// import { CommonService } from '../../../../core/services/Common/common.service';
// import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';

// @Component({
//   selector: 'app-petty-cash',
//   standalone: true,
//   changeDetection: ChangeDetectionStrategy.OnPush,
//   imports: [
//     CommonModule,
//     ReactiveFormsModule,
//     RouterModule,
//     BsDatepickerModule,
//     TableModule,
//     ButtonModule,
//     InputTextModule,
//     NgSelectModule,
//     PaginatorModule,
//   ],
//   templateUrl: './petty-cash.html',
//   providers: [DatePipe],
// })
// export class PettyCash implements OnInit {

//   // ── DI via inject() ──────────────────────────────────────────────────────
//   private readonly fb                     = inject(FormBuilder);
//   private readonly router                 = inject(Router);
//   private readonly commonService          = inject(CommonService);
//   private readonly accountingService      = inject(AccountsTransactions);
//   private readonly cdr                    = inject(ChangeDetectorRef);
//   private readonly destroyRef             = inject(DestroyRef);

//   // ── Signals ──────────────────────────────────────────────────────────────
//   readonly paymentslist1          = signal<any[]>([]);
//   readonly partyjournalentrylist  = signal<any[]>([]);
//   readonly disableaddbutton       = signal(false);
//   readonly disablesavebutton      = signal(false);

//   // ── Computed ─────────────────────────────────────────────────────────────
//   readonly addbutton  = computed(() => this.disableaddbutton()  ? 'Processing' : 'Add');
//   readonly savebutton = computed(() => this.disablesavebutton() ? 'Processing' : 'Save');
//   readonly hasRows    = computed(() => this.paymentslist1().length > 0);
//   readonly totalPaid  = computed(() =>
//     this.paymentslist1().reduce((s, i) => s + Number(i.ptotalamount || 0), 0),
//   );

//   readonly isPartySelected = computed(() =>
//     !!this.paymentVoucherForm?.get('ppaymentsslistcontrols.ppartyname')?.value,
//   );

//   // ── UI visibility flags ───────────────────────────────────────────────────
//   showModeofPayment = false;
//   showTypeofPayment = false;
//   showtranstype     = false;
//   showbankcard      = true;
//   showbranch        = true;
//   showfinancial     = true;
//   showupi           = false;
//   showchequno       = true;
//   showgst           = true;
//   showtds           = true;
//   showgstamount     = false;
//   showigst          = false;
//   showcgst          = false;
//   showsgst          = false;
//   showutgst         = false;
//   showgstno         = false;
//   showsubledger     = true;

//   // ── Display labels ────────────────────────────────────────────────────────
//   displayCardName = 'Debit Card';
//   displaychequeno = 'Cheque No';
//   currencyCode    = '₹';
//   currencySymbol  = '';

//   // ── Lookup lists ──────────────────────────────────────────────────────────
//   banklist:            any[] = [];
//   modeoftransactionslist: any[] = [];
//   typeofpaymentlist:   any[] = [];
//   ledgeraccountslist:  any[] = [];
//   subledgeraccountslist: any[] = [];
//   partylist:           any[] = [];
//   gstlist:             any[] = [];
//   tdslist:             any[] = [];
//   tdssectionlist:      any[] = [];
//   tdspercentagelist:   any[] = [];
//   debitcardlist:       any[] = [];
//   statelist:           any[] = [];
//   chequenumberslist:   any[] = [];
//   upinameslist:        any[] = [];
//   upiidlist:           any[] = [];
//   paymentslist:        any[] = [];   // raw form values for save payload

//   // ── Balances ──────────────────────────────────────────────────────────────
//   cashBalance        = '';
//   bankBalance        = '';
//   bankbookBalance    = '';
//   bankpassbookBalance = '';
//   ledgerBalance      = '';
//   subledgerBalance   = '';
//   partyBalance       = '';

//   // ── Misc state ────────────────────────────────────────────────────────────
//   formValidationMessages: any    = {};
//   paymentlistcolumnwiselist: any = {};
//   imageResponse: any             = null;
//   disablegst   = false;
//   disabletds   = false;
//   disabletransactiondate = false;
//   kycFileName  = '';
//   BranchCode   = '';
//   receiptid    = '';

//   private _selectedPartyStateName = '';

//   readonly gstnopattern = '^(0[1-9]|[1-2][0-9]|3[0-9])([a-zA-Z]){5}([0-9]){4}([a-zA-Z]){1}([a-zA-Z0-9]){1}([a-zA-Z]){1}([a-zA-Z0-9]){1}?';

//   readonly ppaymentdateConfig: Partial<BsDatepickerConfig> = {
//     dateInputFormat:  'DD-MMM-YYYY',
//     containerClass:   'theme-dark-blue',
//     showWeekNumbers:  false,
//     maxDate:          new Date(),
//   };

//   // ── Form ─────────────────────────────────────────────────────────────────
//   paymentVoucherForm!: FormGroup;

//   // ── Shorthand accessor for nested group ───────────────────────────────────
//   private get pc(): FormGroup {
//     return this.paymentVoucherForm.get('ppaymentsslistcontrols') as FormGroup;
//   }

//   // ══════════════════════════════════════════════════════════════════════════
//   ngOnInit(): void {
//     this.currencySymbol = this.commonService.currencysymbol || '₹';

//     const company = this.commonService.comapnydetails;
//     if (company) {
//       this.disabletransactiondate = company.pdatepickerenablestatus;
//     }

//     this.paymentVoucherForm = this.fb.group({
//       ppaymentid:             [''],
//       schemaname:             [this.commonService.getschemaname()],
//       ppaymentdate:           [new Date(), Validators.required],
//       ptotalpaidamount:       [''],
//       pnarration:             ['', Validators.required],
//       pmodofPayment:          ['CASH'],
//       pbankname:              [''],
//       pbranchname:            [''],
//       ptranstype:             ['CHEQUE', Validators.required],
//       pCardNumber:            [''],
//       pUpiname:               [''],
//       pUpiid:                 [''],
//       ptypeofpayment:         [''],
//       pChequenumber:          [''],
//       pchequedate:            [''],
//       pbankid:                [''],
//       pCreatedby:             [this.commonService.getCreatedBy()],
//       pStatusname:            [this.commonService.pStatusname],
//       ptypeofoperation:       [this.commonService.ptypeofoperation],
//       pipaddress:             [this.commonService.getIpAddress()],
//       ppaymentsslistcontrols: this.buildPaymentControls(),
//       pDocStorePath:          [''],
//     });

//     this.paymentVoucherForm.get('ppaymentdate')?.setValue(new Date());
//     this.blurEventAllControls(this.paymentVoucherForm);
//     this.getLoadData();
//   }

//   // ── Form builder helpers ──────────────────────────────────────────────────
//   private buildPaymentControls(): FormGroup {
//     return this.fb.group({
//       psubledgerid:        [null],
//       psubledgername:      [''],
//       pledgerid:           [null],
//       pledgername:         ['',    Validators.required],
//       pamount:             [''],
//       pactualpaidamount:   ['',    Validators.required],
//       pgsttype:            [''],
//       pisgstapplicable:    [false],
//       pgstcalculationtype: ['EXCLUDE'],
//       pgstpercentage:      [''],
//       pgstamount:          [''],
//       pigstamount:         [''],
//       pcgstamount:         [''],
//       psgstamount:         [''],
//       putgstamount:        [''],
//       ppartyname:          ['',    Validators.required],
//       ppartyid:            [null],
//       pistdsapplicable:    [false],
//       pgstno:              new FormControl('', Validators.pattern(this.gstnopattern)),
//       pTdsSection:         [''],
//       pTdsPercentage:      [''],
//       ptdsamount:          [''],
//       ptdscalculationtype: ['INCLUDE'],
//       ppannumber:          [''],
//       pState:              [''],
//       pStateId:            [''],
//       pigstpercentage:     [''],
//       pcgstpercentage:     [''],
//       psgstpercentage:     [''],
//       putgstpercentage:    [''],
//       ptotalamount:        [''],
//     });
//   }

//   // ── Validation helpers ────────────────────────────────────────────────────
//   private blurEventAllControls(group: FormGroup): void {
//     Object.keys(group.controls).forEach(key => {
//       const ctrl = group.get(key);
//       if (ctrl instanceof FormGroup) {
//         this.blurEventAllControls(ctrl);
//       } else if (ctrl?.validator) {
//         ctrl.valueChanges
//           .pipe(takeUntilDestroyed(this.destroyRef))
//           .subscribe(() => this.getValidationByControl(group, key));
//       }
//     });
//   }

//   getValidationByControl(group: FormGroup, key: string): void {
//     const ctrl = group.get(key);
//     if (!ctrl) return;
//     this.formValidationMessages[key] = '';
//     if (ctrl.invalid && (ctrl.dirty || ctrl.touched)) {
//       for (const errorKey in ctrl.errors) {
//         const msg = this.commonService.getValidationMessage(ctrl, errorKey, key, key, '');
//         this.formValidationMessages[key] += msg + ' ';
//       }
//     }
//   }

//   private checkValidations(group: FormGroup, isValid: boolean): boolean {
//     Object.keys(group.controls).forEach(key => {
//       const ctrl = group.get(key);
//       if (ctrl instanceof FormGroup) {
//         isValid = this.checkValidations(ctrl, isValid);
//       } else {
//         ctrl?.markAsTouched();
//         if (ctrl?.invalid) {
//           isValid = false;
//           this.getValidationByControl(group, key);
//         }
//       }
//     });
//     return isValid;
//   }

//   // ── Balance display ────────────────────────────────────────────────────────
//   setBalances(type: string, amount: any): void {
//     const num       = Number(amount) || 0;
//     const formatted = this.commonService.currencyFormat(Math.abs(num).toFixed(2));
//     const label     = num < 0 ? `${formatted} Cr` : `${formatted} Dr`;
//     const map: Record<string, () => void> = {
//       CASH:      () => (this.cashBalance        = label),
//       BANK:      () => (this.bankBalance        = label),
//       BANKBOOK:  () => (this.bankbookBalance    = label),
//       PASSBOOK:  () => (this.bankpassbookBalance = label),
//       LEDGER:    () => (this.ledgerBalance      = label),
//       SUBLEDGER: () => (this.subledgerBalance   = label),
//       PARTY:     () => (this.partyBalance       = label),
//     };
//     map[type]?.();
//     this.cdr.markForCheck();
//   }

//   // ── Load data ──────────────────────────────────────────────────────────────
//   getLoadData(): void {
//     this.accountingService
//       .GetReceiptsandPaymentsLoadingDatapettycash(
//         'PETTYCASH',
//         this.commonService.getbranchname(),
//         this.commonService.getCompanyCode(),
//         this.commonService.getBranchCode(),
//         this.commonService.getschemaname(),
//         'taxes',
//       )
//       .pipe(takeUntilDestroyed(this.destroyRef))
//       .subscribe({
//         next: (json: any) => {
//           if (!json) return;
//           this.banklist             = json.banklist        || [];
//           this.modeoftransactionslist = json.modeofTransactionslist || [];
//           this.typeofpaymentlist    = this.getTypeOfPaymentData();
//           this.ledgeraccountslist   = json.accountslist    || [];
//           this.partylist            = json.partylist       || [];
//           this.gstlist              = json.gstlist         || [];
//           this.debitcardlist        = json.bankdebitcardslist || [];
//           this.setBalances('CASH', json.cashbalance);
//           this.setBalances('BANK', json.bankbalance);
//           this.cdr.markForCheck();
//         },
//         error: (err: any) => this.commonService.showErrorMessage(err),
//       });
//   }

//   private getTypeOfPaymentData(): any[] {
//     return (this.modeoftransactionslist || []).filter(
//       (p: any) => p.ptranstype !== p.ptypeofpayment,
//     );
//   }

//   trackByFn(index: number, _item: any): number {
//     return index;
//   }

//   // ── Mode of payment ────────────────────────────────────────────────────────
//   modeofPaymentChange(): void {
//     const mode = this.paymentVoucherForm.get('pmodofPayment')?.value;
//     if (mode === 'CASH') {
//       this.paymentVoucherForm.get('pbankid')?.setValue(0);
//       this.showModeofPayment = false;
//       this.showtranstype     = false;
//     } else if (mode === 'BANK') {
//       this.paymentVoucherForm.get('ptranstype')?.setValue('CHEQUE');
//       this.showModeofPayment = true;
//       this.showtranstype     = true;
//     } else {
//       this.showModeofPayment = true;
//       this.showtranstype     = false;
//     }
//     this.transofPaymentChange();
//     this.getpartyJournalEntryData();
//     this.cdr.markForCheck();
//   }

//   addModeofpaymentValidations(): void {
//     const get = (k: string) => this.paymentVoucherForm.get(k)!;
//     const controls = {
//       mode:     get('pmodofPayment'),
//       trans:    get('ptranstype'),
//       bank:     get('pbankname'),
//       cheque:   get('pChequenumber'),
//       card:     get('pCardNumber'),
//       type:     get('ptypeofpayment'),
//       upiName:  get('pUpiname'),
//       upiId:    get('pUpiid'),
//     };

//     if (this.showModeofPayment) {
//       controls.mode.setValidators(Validators.required);
//       controls.bank.setValidators(Validators.required);
//       controls.cheque.setValidators(Validators.required);
//       controls.trans.setValidators(this.showtranstype ? Validators.required : null!);
//       controls.card.setValidators(!this.showbankcard ? Validators.required : null!);
//       controls.type.setValidators(this.showTypeofPayment ? Validators.required : null!);
//       if (this.showupi) {
//         controls.upiName.setValidators(Validators.required);
//         controls.upiId.setValidators(Validators.required);
//       } else {
//         controls.upiName.clearValidators();
//         controls.upiId.clearValidators();
//       }
//     } else {
//       [controls.mode, controls.bank, controls.cheque, controls.upiName, controls.upiId, controls.type]
//         .forEach(c => c.clearValidators());
//     }
//     Object.values(controls).forEach(c => c.updateValueAndValidity());
//   }

//   transofPaymentChange(): void {
//     this.displayCardName  = 'Debit Card';
//     this.showTypeofPayment = false;
//     this.showbranch       = false;
//     this.showfinancial    = false;
//     this.showchequno      = false;
//     this.showbankcard     = true;
//     this.showupi          = false;
//     this.displaychequeno  = 'Reference No.';

//     switch (this.paymentVoucherForm.get('ptranstype')?.value) {
//       case 'CHEQUE':
//         this.displaychequeno = 'Cheque No.';
//         this.showbranch = this.showchequno = true;
//         break;
//       case 'ONLINE':
//         this.showTypeofPayment = true;
//         break;
//       case 'DEBIT CARD':
//         this.showbankcard  = false;
//         this.showfinancial = true;
//         break;
//       default:
//         this.displayCardName = 'Credit Card';
//         this.showbankcard    = false;
//         this.showfinancial   = true;
//     }
//     this.addModeofpaymentValidations();
//     this.cleartranstypeDetails();
//     this.cdr.markForCheck();
//   }

//   typeofPaymentChange(): void {
//     const upiName = this.paymentVoucherForm.get('pUpiname')!;
//     const upiId   = this.paymentVoucherForm.get('pUpiid')!;
//     this.showupi = this.paymentVoucherForm.get('ptypeofpayment')?.value === 'UPI';
//     if (this.showupi) {
//       upiName.setValidators(Validators.required);
//       upiId.setValidators(Validators.required);
//     } else {
//       upiName.clearValidators();
//       upiId.clearValidators();
//     }
//     upiName.updateValueAndValidity();
//     upiId.updateValueAndValidity();
//     this.getValidationByControl(this.paymentVoucherForm, 'ptypeofpayment');
//     this.cdr.markForCheck();
//   }

//   // ── GST / TDS toggles ─────────────────────────────────────────────────────
//   isgstapplicable_Checked(): void {
//     if (!this.pc) return;
//     const isOn = this.pc.get('pisgstapplicable')?.value;

//     if (!isOn) {
//       this.pc.get('pStateId')?.setValue('');
//       this.gst_clear();
//       this.showgst = true;
//     } else {
//       this.showgst = false;
//       if (this.statelist.length === 1 && !this.pc.get('pStateId')?.value) {
//         const s = this.statelist[0];
//         this.pc.patchValue({ pStateId: s.pStateId, pState: s.pState || '', pgsttype: s.pgsttype || '' });
//         this.applyGstTypeFlags(s.pgsttype);
//       }
//     }
//     this.isgstapplicableChange();
//     this.cdr.markForCheck();
//   }

//   istdsapplicable_Checked(): void {
//     if (!this.pc) return;
//     const ppartyname = this.pc.get('ppartyname')?.value;
//     const match = this.paymentslist.find((x: any) => x.ppartyname === ppartyname);
//     if (match) this.pc.get('pistdsapplicable')?.setValue(match.pistdsapplicable);
//     this.istdsapplicableChange();
//     this.cdr.markForCheck();
//   }

//   isgstapplicableChange(): void {
//     if (!this.pc) return;
//     const enabled = this.pc.get('pisgstapplicable')?.value;
//     const calc  = this.pc.get('pgstcalculationtype');
//     const pct   = this.pc.get('pgstpercentage');
//     const state = this.pc.get('pStateId');
//     const amt   = this.pc.get('pgstamount');

//     if (enabled) {
//       this.showgst = false;
//       if (!this.disablegst) calc?.setValue('EXCLUDE');
//       [calc, pct, state, amt].forEach(c => { c?.setValidators(Validators.required); c?.markAsUntouched(); });
//       const gstType = this.pc.get('pgsttype')?.value;
//       if (gstType) this.applyGstTypeFlags(gstType);
//     } else {
//       this.showgst = true;
//       if (!this.disablegst) calc?.setValue('EXCLUDE');
//       [calc, pct, state, amt].forEach(c => c?.clearValidators());
//       this.formValidationMessages['pgstpercentage'] = '';
//       this.formValidationMessages['pStateId']       = '';
//       this.resetGstAmountFlags();
//     }
//     [calc, pct, state, amt].forEach(c => c?.updateValueAndValidity());
//     this.claculategsttdsamounts();
//     this.cdr.markForCheck();
//   }

//   istdsapplicableChange(): void {
//     if (!this.pc) return;
//     const enabled = this.pc.get('pistdsapplicable')?.value;
//     const calc    = this.pc.get('ptdscalculationtype');
//     const pct     = this.pc.get('pTdsPercentage');
//     const section = this.pc.get('pTdsSection');
//     const amt     = this.pc.get('ptdsamount');

//     if (enabled) {
//       this.showtds = false;
//       if (!this.disabletds) calc?.setValue('INCLUDE');
//       [calc, pct, section, amt].forEach(c => { c?.setValidators(Validators.required); c?.markAsUntouched(); });
//     } else {
//       this.showtds = true;
//       if (!this.disabletds) calc?.setValue('INCLUDE');
//       [calc, pct, section, amt].forEach(c => c?.clearValidators());
//       this.formValidationMessages['pTdsSection']    = '';
//       this.formValidationMessages['pTdsPercentage'] = '';
//     }
//     [calc, pct, section, amt].forEach(c => c?.updateValueAndValidity());
//     this.claculategsttdsamounts();
//     this.cdr.markForCheck();
//   }

//   private applyGstTypeFlags(gstType: string): void {
//     this.showgstamount = true;
//     this.showigst = this.showcgst = this.showsgst = this.showutgst = false;
//     switch (gstType) {
//       case 'IGST':       this.showigst = true; break;
//       case 'CGST,SGST':  this.showcgst = this.showsgst  = true; break;
//       case 'CGST,UTGST': this.showcgst = this.showutgst = true; break;
//       default: if (gstType) this.showcgst = true; break;
//     }
//   }

//   private resetGstAmountFlags(): void {
//     this.showgstamount = this.showigst = this.showcgst = this.showsgst = this.showutgst = false;
//   }

//   // ── Bank / card / UPI handlers ────────────────────────────────────────────
//   bankName_Change(event: Event): void {
//     const target  = event.target as HTMLSelectElement;
//     const pbankid = target.value;
//     this.upinameslist = this.chequenumberslist = [];
//     ['pChequenumber', 'pUpiname', 'pUpiid'].forEach(f => this.paymentVoucherForm.get(f)?.setValue(''));

//     if (pbankid) {
//       const bankname = target.options[target.selectedIndex].text;
//       this.getBankDetailsById(pbankid);
//       this.getBankBranchName(pbankid);
//       this.paymentVoucherForm.get('pbankname')?.setValue(bankname);
//     } else {
//       this.paymentVoucherForm.get('pbankname')?.setValue('');
//     }
//     this.getValidationByControl(this.paymentVoucherForm, 'pbankname');
//     this.formValidationMessages['pChequenumber'] = '';
//     this.cdr.markForCheck();
//   }

//   chequenumber_Change(): void {
//     this.getValidationByControl(this.paymentVoucherForm, 'pChequenumber');
//   }

//   debitCard_Change(): void {
//     const data = this.getbankname(this.paymentVoucherForm.get('pCardNumber')?.value);
//     if (data) {
//       this.paymentVoucherForm.get('pbankname')?.setValue(data.pbankname);
//       this.paymentVoucherForm.get('pbankid')?.setValue(data.pbankid);
//     }
//     this.getValidationByControl(this.paymentVoucherForm, 'pCardNumber');
//   }

//   private getbankname(cardnumber: any): any {
//     try {
//       const data = this.debitcardlist.find((d: any) => d.pCardNumber === cardnumber);
//       if (data) this.getBankBranchName(data.pbankid);
//       return data;
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//       return null;
//     }
//   }

//   private getBankDetailsById(pbankid: any): void {
//     this.accountingService
//       .GetBankDetailsbyId(pbankid)
//       .pipe(takeUntilDestroyed(this.destroyRef))
//       .subscribe({
//         next: (json: any) => {
//           if (!json) return;
//           this.upinameslist      = json.bankupilist  || [];
//           this.chequenumberslist = json.chequeslist  || [];
//           this.cdr.markForCheck();
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

//   upiName_Change(event: Event): void {
//     const upiname = (event.target as HTMLSelectElement).value;
//     this.upiidlist = this.upinameslist.filter((r: any) => r.pUpiname === upiname);
//     this.getValidationByControl(this.paymentVoucherForm, 'pUpiname');
//     this.cdr.markForCheck();
//   }

//   upid_change(): void {
//     this.getValidationByControl(this.paymentVoucherForm, 'pUpiid');
//   }

//   // ── Ledger / sub-ledger ───────────────────────────────────────────────────
//   ledgerName_Change(event: any): void {
//     const pledgerid = event?.pledgerid;
//     this.subledgeraccountslist = [];
//     this.pc.get('psubledgerid')?.setValue(null);
//     this.pc.get('psubledgername')?.setValue('');
//     this.subledgerBalance = '';

//     if (pledgerid) {
//       const ledger = this.ledgeraccountslist.find((l: any) => l.pledgerid === pledgerid);
//       if (ledger) {
//         this.pc.get('pledgername')?.setValue(ledger.pledgername);
//         this.setBalances('LEDGER', ledger.accountbalance ?? ledger.ledgeramount ?? 0);
//         this.getSubLedgerData(pledgerid);
//       } else {
//         this.setBalances('LEDGER', 0);
//         this.pc.get('pledgername')?.setValue('');
//       }
//     } else {
//       this.setBalances('LEDGER', 0);
//       this.pc.get('pledgername')?.setValue('');
//     }
//     this.cdr.markForCheck();
//   }

//   private getSubLedgerData(pledgerid: any): void {
//     this.accountingService
//       .GetSubLedgerData(
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
//           if (json.length > 0) {
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
//           this.cdr.markForCheck();
//         },
//         error: (err: any) => this.commonService.showErrorMessage(err),
//       });
//   }

//   subledger_Change(event: any): void {
//     const id = event?.psubledgerid;
//     this.subledgerBalance = '';
//     if (id) {
//       this.pc.get('psubledgername')?.setValue(event.psubledgername);
//       this.setBalances('SUBLEDGER', event?.accountbalance ?? event?.ledgeramount ?? 0);
//     } else {
//       this.pc.get('psubledgername')?.setValue('');
//       this.setBalances('SUBLEDGER', 0);
//     }
//     this.getValidationByControl(this.paymentVoucherForm, 'psubledgername');
//     this.cdr.markForCheck();
//   }

//   // ── Party ────────────────────────────────────────────────────────────────
//   partyName_Change(event: any): void {
//     const ppartyid = event?.ppartyid;
//     this.statelist = this.tdssectionlist = this.tdspercentagelist = [];
//     this._selectedPartyStateName = '';

//     this.pc.patchValue({
//       pStateId: '', pState: '', pTdsSection: '', pTdsPercentage: '',
//       ppartyreferenceid: '', ppartyreftype: '', ppartypannumber: '',
//       pgsttype: '', pgstpercentage: '', pgstamount: 0,
//       pigstamount: 0, pcgstamount: 0, psgstamount: 0, putgstamount: 0,
//       pisgstapplicable: false, pistdsapplicable: false,
//     });

//     this.resetGstAmountFlags();
//     this.showgstno = false;
//     this.showgst = this.showtds = true;
//     this.partyBalance = '';

//     if (ppartyid) {
//       this.pc.get('ppartyname')?.setValue(event.ppartyname);
//       const data = this.partylist.find((x: any) => x.ppartyid === ppartyid);
//       if (data) {
//         this.pc.patchValue({
//           ppartyreferenceid: data.ppartyreferenceid || '',
//           ppartyreftype:     data.ppartyreftype     || '',
//           ppartypannumber:   data.pan_no            || '',
//         });
//       }
//       this._selectedPartyStateName = event.state_name || '';
//       this.getPartyDetailsById(ppartyid);
//       this.setenableordisabletdsgst(event.ppartyname, 'PARTYCHANGE');
//     } else {
//       this.setBalances('PARTY', 0);
//       this.pc.get('ppartyname')?.setValue('');
//     }
//     this.cdr.markForCheck();
//   }

//   private getPartyDetailsById(ppartyid: any): void {
//     this.accountingService
//       .getPartyDetailsbyid(
//         ppartyid,
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
//           this.tdslist = json.lstTdsSectionDetails || [];
//           const unique = Array.from(new Set(this.tdslist.map((i: any) => i.pTdsSection)));
//           this.tdssectionlist = unique.map(s => ({ pTdsSection: s }));

//           const partyState = (this._selectedPartyStateName || '').toLowerCase().trim();
//           this.statelist = partyState && json.statelist?.length
//             ? json.statelist.filter((s: any) => {
//                 const name = (s.pState || s.pStatename || '').toLowerCase().trim();
//                 return name === partyState || name.includes(partyState) || partyState.includes(name);
//               })
//             : [];

//           this.setBalances('PARTY', json.accountbalance ?? 0);
//           this.claculategsttdsamounts();
//           this.pc.patchValue({ pStateId: '', pState: '', pgsttype: '', pisgstapplicable: false });
//           this.resetGstAmountFlags();
//           this.showgstno = false;
//           this.showgst = true;
//           this.cdr.markForCheck();
//         },
//         error: (err: any) => this.commonService.showErrorMessage(err),
//       });
//   }

//   setenableordisabletdsgst(partyname: string, _changetype: string): void {
//     this.pc.get('pistdsapplicable')?.setValue(false);
//     this.pc.get('pisgstapplicable')?.setValue(false);
//     const match = this.paymentslist.find((x: any) => x.ppartyname === partyname);
//     if (match) {
//       this.disablegst = this.disabletds = true;
//       this.pc.get('pistdsapplicable')?.setValue(match.pistdsapplicable);
//       this.pc.get('pisgstapplicable')?.setValue(match.pisgstapplicable);
//       if (match.pisgstapplicable) this.pc.get('pgstcalculationtype')?.setValue('EXCLUDE');
//       if (match.pistdsapplicable) this.pc.get('ptdscalculationtype')?.setValue('INCLUDE');
//     } else {
//       this.disablegst = this.disabletds = false;
//       this.pc.get('pgstcalculationtype')?.setValue('EXCLUDE');
//       this.pc.get('ptdscalculationtype')?.setValue('INCLUDE');
//     }
//   }

//   // ── GST field changes ─────────────────────────────────────────────────────
//   gsno_change(): void {
//     this.getValidationByControl(this.paymentVoucherForm, 'pgstno');
//   }

//   gst_clear(): void {
//     this.resetGstAmountFlags();
//     const fields = ['pigstpercentage','pigstamount','pcgstpercentage','pcgstamount',
//                     'psgstpercentage','psgstamount','putgstpercentage','putgstamount','pgstamount'];
//     fields.forEach(f => this.pc.get(f)?.setValue(0));
//     this.pc.get('pgsttype')?.setValue('');
//     this.cdr.markForCheck();
//   }

//   gst_Change(event: any): void {
//     const pct = event?.pgstpercentage ?? event;
//     const zeroFields = ['pigstpercentage','pcgstpercentage','psgstpercentage','putgstpercentage',
//                         'pigstamount','pcgstamount','psgstamount','putgstamount','pgstamount'];
//     zeroFields.forEach(f => this.pc.get(f)?.setValue(0));
//     if (pct !== null && pct !== undefined && pct !== '') this.getGstPercentage(pct);
//     this.getValidationByControl(this.paymentVoucherForm, 'pgstpercentage');
//     this.getValidationByControl(this.paymentVoucherForm, 'pgstamount');
//     this.cdr.markForCheck();
//   }

//   private getGstPercentage(pct: any): void {
//     const data = this.gstlist.find((g: any) => String(g.pgstpercentage) === String(pct));
//     if (!data) return;
//     this.pc.patchValue({
//       pigstpercentage: data.pigstpercentage || 0,
//       pcgstpercentage: data.pcgstpercentage || 0,
//       psgstpercentage: data.psgstpercentage || 0,
//       putgstpercentage: data.putgstpercentage || 0,
//     });
//     this.applyGstTypeFlags(this.pc.get('pgsttype')?.value);
//     this.claculategsttdsamounts();
//   }

//   state_change(event: Event): void {
//     const target   = event.target as HTMLSelectElement;
//     const stateId  = target.value;
//     const stateName = stateId ? target.options[target.selectedIndex].text : '';
//     this.gst_clear();

//     if (!stateId) {
//       this.pc.patchValue({ pState: '', pStateId: '' });
//     } else {
//       this.pc.patchValue({ pState: stateName, pStateId: stateId });
//       this.showgstno = !stateName.split('-')[1];
//       const data = this.statelist.find((s: any) => String(s.pStateId) === String(stateId));
//       if (data) {
//         this.pc.get('pgsttype')?.setValue(data.pgsttype);
//         this.applyGstTypeFlags(data.pgsttype);
//       }
//     }
//     this.getValidationByControl(this.paymentVoucherForm, 'pState');
//     this.formValidationMessages['pigstpercentage'] = '';
//     this.claculategsttdsamounts();
//     this.cdr.markForCheck();
//   }

//   // ── TDS field changes ─────────────────────────────────────────────────────
//   tdsSection_Change(event: Event): void {
//     const section = (event.target as HTMLSelectElement).value;
//     this.tdspercentagelist = [];
//     this.pc.get('pTdsPercentage')?.setValue('');
//     if (section) this.getTdsPercentage(section);
//     this.getValidationByControl(this.paymentVoucherForm, 'pTdsSection');
//     this.cdr.markForCheck();
//   }

//   private getTdsPercentage(section: any): void {
//     this.tdspercentagelist = this.tdslist.filter((t: any) => t.pTdsSection === section);
//     this.claculategsttdsamounts();
//   }

//   tds_Change(_event: any): void {
//     this.getValidationByControl(this.paymentVoucherForm, 'pTdsPercentage');
//     this.getValidationByControl(this.paymentVoucherForm, 'ptdsamount');
//     this.claculategsttdsamounts();
//   }

//   pamount_change(): void {
//     this.claculategsttdsamounts();
//   }

//   // ── Amount input helpers ──────────────────────────────────────────────────
//   blockInvalidAmountKeys(event: KeyboardEvent): void {
//     const allowed = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight',
//                      'ArrowUp','ArrowDown','Home','End','F5'];
//     if (allowed.includes(event.key)) return;
//     if ((event.ctrlKey || event.metaKey) && ['a','c','v','x'].includes(event.key.toLowerCase())) return;
//     if (/^[0-9]$/.test(event.key)) return;
//     if (event.key === '.') {
//       const v = (event.target as HTMLInputElement).value.replace(/,/g, '');
//       if (!v.includes('.')) return;
//     }
//     event.preventDefault();
//   }

//   onAmountInput(event: Event): void {
//     const input = event.target as HTMLInputElement;
//     let value = input.value.replace(/[^0-9.]/g, '');
//     let parts = value.split('.');
//     if (parts.length > 2) parts = [parts[0], parts[1]];
//     if (parts[0].length > 13) parts[0] = parts[0].substring(0, 13);
//     if (parts[1]) parts[1] = parts[1].substring(0, 2);
//     const formatted = parts.length > 1
//       ? `${this.formatIndian(parts[0])}.${parts[1]}`
//       : this.formatIndian(parts[0]);
//     input.value = formatted;
//     this.paymentVoucherForm.get('pactualpaidamount')?.setValue(
//       formatted.replace(/,/g, ''), { emitEvent: false }
//     );
//   }

//   formatAmountOnBlur(): void {
//     const ctrl = this.paymentVoucherForm.get('pactualpaidamount');
//     if (!ctrl?.value) return;
//     const parts     = ctrl.value.toString().split('.');
//     const formatted = parts.length > 1
//       ? `${this.formatIndian(parts[0])}.${parts[1]}`
//       : this.formatIndian(parts[0]);
//     const el = document.getElementById('pactualpaidamount') as HTMLInputElement;
//     if (el) el.value = formatted;
//   }

//   private formatIndian(value: string): string {
//     if (value.length <= 3) return value;
//     const last3 = value.slice(-3);
//     const rest  = value.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
//     return `${rest},${last3}`;
//   }

//   // ── GST / TDS calculation ─────────────────────────────────────────────────
//   claculategsttdsamounts(): void {
//     try {
//       if (!this.pc) return;
//       let paid = parseFloat(
//         this.commonService.removeCommasInAmount((this.pc.get('pactualpaidamount')?.value || '0').toString())
//       ) || 0;

//       const gstOn    = this.pc.get('pisgstapplicable')?.value;
//       const gstType  = this.pc.get('pgsttype')?.value;
//       const gstCalc  = this.pc.get('pgstcalculationtype')?.value || 'EXCLUDE';
//       const igstPct  = parseFloat(this.pc.get('pigstpercentage')?.value) || 0;
//       const cgstPct  = parseFloat(this.pc.get('pcgstpercentage')?.value) || 0;
//       const sgstPct  = parseFloat(this.pc.get('psgstpercentage')?.value) || 0;
//       const utgstPct = parseFloat(this.pc.get('putgstpercentage')?.value) || 0;

//       let igst = 0, cgst = 0, sgst = 0, utgst = 0, taxable = paid;

//       if (gstOn && gstType && paid > 0) {
//         if (gstCalc === 'EXCLUDE') {
//           if (gstType === 'IGST') igst = Math.round(paid * igstPct / 100);
//           else if (gstType === 'CGST,SGST') {
//             const t = Math.round(paid * (cgstPct + sgstPct) / 100);
//             cgst = Math.round(t / 2); sgst = t - cgst;
//           } else if (gstType === 'CGST,UTGST') {
//             const t = Math.round(paid * (cgstPct + utgstPct) / 100);
//             cgst = Math.round(t / 2); utgst = t - cgst;
//           }
//         } else {
//           if (gstType === 'IGST') {
//             igst    = Math.round(paid * igstPct / (100 + igstPct));
//             taxable = paid - igst;
//           } else if (gstType === 'CGST,SGST') {
//             const rate = cgstPct + sgstPct;
//             const t = Math.round(paid * rate / (100 + rate));
//             cgst = Math.round(t / 2); sgst = t - cgst;
//             taxable = paid - cgst - sgst;
//           } else if (gstType === 'CGST,UTGST') {
//             const rate = cgstPct + utgstPct;
//             const t = Math.round(paid * rate / (100 + rate));
//             cgst = Math.round(t / 2); utgst = t - cgst;
//             taxable = paid - cgst - utgst;
//           }
//         }
//       }

//       const gst = igst + cgst + sgst + utgst;

//       const tdsOn   = this.pc.get('pistdsapplicable')?.value;
//       const tdsCalc = this.pc.get('ptdscalculationtype')?.value || 'INCLUDE';
//       const tdsPct  = parseFloat(this.pc.get('pTdsPercentage')?.value) || 0;
//       let tds = 0;

//       if (tdsOn && tdsPct > 0 && paid > 0) {
//         tds = tdsCalc === 'INCLUDE'
//           ? Math.round(taxable * tdsPct / (100 + tdsPct))
//           : Math.round(taxable * tdsPct / 100);
//       }

//       const total = parseFloat((taxable + gst - tds).toFixed(2));

//       this.pc.patchValue({
//         pamount:      taxable > 0 ? taxable : '',
//         pgstamount:   gst,
//         pigstamount:  igst,
//         pcgstamount:  cgst,
//         psgstamount:  sgst,
//         putgstamount: utgst,
//         ptdsamount:   tds,
//         ptotalamount: total,
//       });
//       this.formValidationMessages['pamount'] = '';
//       this.cdr.markForCheck();
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//     }
//   }

//   // ── Add / remove row ───────────────────────────────────────────────────────
//   private validateaddPaymentDetails(): boolean {
//     this.formValidationMessages = {};
//     let isValid = true;

//     const required = [
//       { key: 'pactualpaidamount', msg: 'Enter Amount Paid' },
//       { key: 'ppartyid',          msg: 'Select Party'      },
//       { key: 'pledgerid',         msg: 'Select Ledger'     },
//     ];
//     required.forEach(({ key, msg }) => {
//       if (!this.pc.get(key)?.value) {
//         this.pc.get(key)?.markAsTouched();
//         this.formValidationMessages[key] = msg;
//         isValid = false;
//       }
//     });

//     if (this.showsubledger && !this.pc.get('psubledgerid')?.value) {
//       this.pc.get('psubledgerid')?.markAsTouched();
//       this.formValidationMessages['psubledgername'] = 'Select Sub Ledger';
//       isValid = false;
//     }

//     if (this.pc.get('pisgstapplicable')?.value) {
//       if (!this.pc.get('pStateId')?.value) {
//         this.pc.get('pStateId')?.markAsTouched();
//         this.formValidationMessages['pStateId'] = 'Select State';
//         isValid = false;
//       }
//       if (!this.pc.get('pgstpercentage')?.value) {
//         this.pc.get('pgstpercentage')?.markAsTouched();
//         this.formValidationMessages['pgstpercentage'] = 'Select GST %';
//         isValid = false;
//       }
//     }

//     if (this.pc.get('pistdsapplicable')?.value) {
//       if (!this.pc.get('pTdsSection')?.value) {
//         this.pc.get('pTdsSection')?.markAsTouched();
//         this.formValidationMessages['pTdsSection'] = 'Select Section';
//         isValid = false;
//       }
//       if (!this.pc.get('pTdsPercentage')?.value) {
//         this.pc.get('pTdsPercentage')?.markAsTouched();
//         this.formValidationMessages['pTdsPercentage'] = 'Select Percentage';
//         isValid = false;
//       }
//     }

//     if (isValid) {
//       const duplicate = this.paymentslist.some((row: any) =>
//         row.pledgername   === this.pc.get('pledgername')?.value &&
//         row.psubledgername === this.pc.get('psubledgername')?.value &&
//         row.ppartyid       === this.pc.get('ppartyid')?.value,
//       );
//       if (duplicate) {
//         this.commonService.showWarningMessage('Ledger, subledger and party already exists in the grid.');
//         isValid = false;
//       }
//     }

//     if (!isValid && Object.values(this.formValidationMessages).some((v: any) => v)) {
//       this.commonService.showWarningMessage('Please fill all required fields for this record');
//     }
//     return isValid;
//   }

//   addPaymentDetails(): void {
//     if (this.disableaddbutton()) return;
//     this.disableaddbutton.set(true);

//     if (!this.validateaddPaymentDetails()) {
//       this.disableaddbutton.set(false);
//       return;
//     }

//     const ctrl = this.pc;
//     const safeRemove = (v: any) => this.commonService.removeCommasInAmount((v || '0').toString());
//     const row = {
//       ppartyname:         ctrl.get('ppartyname')?.value,
//       pledgername:        ctrl.get('pledgername')?.value,
//       psubledgername:     ctrl.get('psubledgername')?.value,
//       ptotalamount:       safeRemove(ctrl.get('ptotalamount')?.value),
//       pamount:            safeRemove(ctrl.get('pamount')?.value),
//       pgstcalculationtype: ctrl.get('pgstcalculationtype')?.value || 'EXCLUDE',
//       pTdsSection:        ctrl.get('pTdsSection')?.value,
//       pgstpercentage:     ctrl.get('pgstpercentage')?.value || 0,
//       ptdsamount:         safeRemove(ctrl.get('ptdsamount')?.value),
//       ptdscalculationtype: ctrl.get('ptdscalculationtype')?.value || 'INCLUDE',
//       pTdsPercentage:     ctrl.get('pTdsPercentage')?.value || 0,
//     };

//     this.paymentslist1.update(list => [...list, row]);
//     this.paymentslist.push(ctrl.value);

//     this.getpartyJournalEntryData();
//     this.getPaymentListColumnWisetotals();

//     // Keep ledger/subledger, reset rest
//     const keepLedgerId   = ctrl.get('pledgerid')?.value;
//     const keepLedgerName = ctrl.get('pledgername')?.value;
//     const keepSubId      = ctrl.get('psubledgerid')?.value;
//     const keepSubName    = ctrl.get('psubledgername')?.value;

//     ctrl.patchValue({
//       ppartyid: null, ppartyname: '', pactualpaidamount: '',
//       ptdsamount: 0, pamount: '', ptotalamount: '', pgstamount: 0,
//       pigstamount: 0, pcgstamount: 0, psgstamount: 0, putgstamount: 0,
//       pisgstapplicable: false, pistdsapplicable: false,
//       pStateId: '', pgstpercentage: '', pTdsSection: '', pTdsPercentage: '',
//       pgsttype: '', pState: '', pgstno: '',
//       pigstpercentage: 0, pcgstpercentage: 0, psgstpercentage: 0, putgstpercentage: 0,
//       pledgerid: keepLedgerId, pledgername: keepLedgerName,
//       psubledgerid: keepSubId, psubledgername: keepSubName,
//     });

//     Object.keys(ctrl.controls).forEach(key => {
//       ctrl.get(key)?.markAsUntouched();
//       ctrl.get(key)?.markAsPristine();
//     });

//     this.formValidationMessages = {};
//     this.disableaddbutton.set(false);
//     this.cdr.markForCheck();
//   }

//   removeHandler(rowIndex: number): void {
//     if (rowIndex < 0 || rowIndex >= this.paymentslist1().length) return;
//     this.paymentslist1.update(list => list.filter((_, i) => i !== rowIndex));
//     if (this.paymentslist.length > rowIndex) this.paymentslist.splice(rowIndex, 1);
//     this.paymentVoucherForm.get('ptotalpaidamount')?.setValue(this.totalPaid());
//     this.getpartyJournalEntryData();
//     this.clearPaymentDetails();
//     this.getPaymentListColumnWisetotals();
//     this.cdr.markForCheck();
//   }

//   // ── Clear helpers ─────────────────────────────────────────────────────────
//   clearPaymentDetails(): void {
//     this.pc.reset();
//     this.showsubledger = true;
//     this.pc.patchValue({
//       pistdsapplicable: false, pisgstapplicable: false,
//       pledgerid: null, psubledgerid: null, ppartyid: null,
//       pStateId: '', pgstpercentage: '', pTdsSection: '', pTdsPercentage: '',
//       pgstcalculationtype: 'EXCLUDE', ptdscalculationtype: 'INCLUDE',
//     });
//     ['LEDGER','SUBLEDGER','PARTY'].forEach(t => this.setBalances(t, 0));
//     this.resetGstAmountFlags();
//     this.istdsapplicable_Checked();
//     this.isgstapplicable_Checked();
//     this.formValidationMessages = {};
//     this.cdr.markForCheck();
//   }

//   private cleartranstypeDetails(): void {
//     this.chequenumberslist = [];
//     ['pbankid','pbankname','pCardNumber','ptypeofpayment','pbranchname','pUpiname','pUpiid','pChequenumber']
//       .forEach(f => this.paymentVoucherForm.get(f)?.setValue(''));
//     this.formValidationMessages = {};
//     this.setBalances('BANKBOOK', 0);
//     this.setBalances('PASSBOOK', 0);
//   }

//   clearPaymentVoucher(): void {
//     try {
//       this.paymentslist.length = 0;
//       this.paymentslist1.set([]);
//       this.partyjournalentrylist.set([]);
//       this.paymentVoucherForm.reset();
//       this.cleartranstypeDetails();
//       this.clearPaymentDetails();
//       this.paymentVoucherForm.patchValue({ pmodofPayment: 'CASH' });
//       this.showModeofPayment = false;
//       this.modeofPaymentChange();
//       this.paymentVoucherForm.get('ppaymentdate')?.setValue(new Date());
//       this.resetGstAmountFlags();
//       this.formValidationMessages    = {};
//       this.paymentlistcolumnwiselist = {};
//       this.bankbookBalance = this.bankpassbookBalance = '';
//       this.ledgerBalance = this.subledgerBalance = this.partyBalance = '';
//       this.imageResponse = { name: '', fileType: 'imageResponse', contentType: '', size: 0 };
//       this.cdr.markForCheck();
//     } catch (e: any) {
//       this.commonService.showErrorMessage(e.message || e);
//     }
//   }

//   // ── Column totals ─────────────────────────────────────────────────────────
//   getPaymentListColumnWisetotals(): void {
//     const list = this.paymentslist1();
//     this.paymentlistcolumnwiselist = {
//       ptotalamount: list.reduce((s, c) => s + Number(c.ptotalamount || 0), 0),
//       pamount:      list.reduce((s, c) => s + Number(c.pamount      || 0), 0),
//       pgstamount:   this.paymentslist.reduce((s, c: any) => s + Number(c.pgstamount || 0), 0),
//       ptdsamount:   list.reduce((s, c) => s + Number(c.ptdsamount   || 0), 0),
//     };
//   }

//   // ── Journal entry ─────────────────────────────────────────────────────────
//   getpartyJournalEntryData(): void {
//     try {
//       const tdsEntries: any[] = [];
//       const entries: any[]    = [];

//       const ledgers = [...new Set(this.paymentslist.map((p: any) => p.pledgername))];
//       ledgers.forEach((ledger: any, i) => {
//         const rows = this.paymentslist.filter((p: any) => p.pledgername === ledger);
//         const debit = rows.reduce((s, p: any) => {
//           const amt = parseFloat(this.commonService.removeCommasInAmount((p.pamount    || '0').toString())) || 0;
//           const tds = parseFloat(this.commonService.removeCommasInAmount((p.ptdsamount || '0').toString())) || 0;
//           return s + (amt - tds);
//         }, 0);

//         if (debit > 0) entries.push({ accountname: ledger, debitamount: parseFloat(debit.toFixed(2)), creditamount: '' });

//         const tdsSections = [...new Set(rows.filter((p: any) => p.pistdsapplicable && parseFloat(p.ptdsamount || 0) > 0).map((p: any) => p.pTdsSection))];
//         tdsSections.forEach((section: any) => {
//           const tdsAmt = rows.filter((p: any) => p.pTdsSection === section)
//             .reduce((s, p: any) => s + (parseFloat(this.commonService.removeCommasInAmount((p.ptdsamount || '0').toString())) || 0), 0);
//           if (tdsAmt > 0) {
//             tdsEntries.push({ accountname: `TDS-${section} RECEIVABLE`, debitamount: parseFloat(tdsAmt.toFixed(2)), creditamount: '' });
//             tdsEntries.push({ accountname: ledger, debitamount: '', creditamount: parseFloat(tdsAmt.toFixed(2)) });
//           }
//         });
//       });

//       const gstFields = [
//         { field: 'pigstamount', label: 'P-IGST' },
//         { field: 'pcgstamount', label: 'P-CGST' },
//         { field: 'psgstamount', label: 'P-SGST' },
//         { field: 'putgstamount', label: 'P-UTGST' },
//       ];
//       gstFields.forEach(({ field, label }) => {
//         const amt = this.paymentslist.reduce((s, p: any) => s + (parseFloat(this.commonService.removeCommasInAmount((p[field] || '0').toString())) || 0), 0);
//         if (amt > 0) entries.push({ accountname: label, debitamount: parseFloat(amt.toFixed(2)), creditamount: '' });
//       });

//       const total = this.totalPaid();
//       if (total > 0) {
//         this.paymentVoucherForm.get('ptotalpaidamount')?.setValue(parseFloat(total.toFixed(2)));
//         const mode = this.paymentVoucherForm.get('pmodofPayment')?.value;
//         entries.push({ accountname: mode === 'CASH' ? 'PETTY CASH' : 'BANK', debitamount: '', creditamount: parseFloat(total.toFixed(2)) });
//       }

//       this.partyjournalentrylist.set([...entries, ...tdsEntries]);
//       this.cdr.markForCheck();
//     } catch (e) {
//       this.commonService.showErrorMessage(e);
//     }
//   }

//   getTotalDebit(): number {
//     return this.partyjournalentrylist().reduce((s, r) => s + (parseFloat(r.debitamount) || 0), 0);
//   }

//   getTotalCredit(): number {
//     return this.partyjournalentrylist().reduce((s, r) => s + (parseFloat(r.creditamount) || 0), 0);
//   }

//   // ── Validate & Save ───────────────────────────────────────────────────────
//   validatesavePaymentVoucher(): boolean {
//     this.formValidationMessages = {};
//     if (!this.paymentslist.length) {
//       this.commonService.showWarningMessage('Please add at least one record to the grid before saving!');
//       return false;
//     }

//     const date     = this.paymentVoucherForm.get('ppaymentdate')?.value;
//     const narration = this.paymentVoucherForm.get('pnarration')?.value;
//     const mode     = this.paymentVoucherForm.get('pmodofPayment')?.value;

//     if (!date)      { this.paymentVoucherForm.get('ppaymentdate')?.markAsTouched(); this.formValidationMessages['ppaymentdate'] = 'Select Date'; }
//     if (!narration) { this.paymentVoucherForm.get('pnarration')?.markAsTouched();   this.formValidationMessages['pnarration']  = 'Enter Narration'; }
//     if (!mode)      { this.paymentVoucherForm.get('pmodofPayment')?.markAsTouched(); this.formValidationMessages['pmodofPayment'] = 'Select Mode of Payment'; }

//     if (mode === 'BANK') {
//       const bankId  = this.paymentVoucherForm.get('pbankid')?.value;
//       const cheque  = this.paymentVoucherForm.get('pChequenumber')?.value;
//       if (!bankId)  this.formValidationMessages['pbankid']       = 'Select Bank Name';
//       if (!cheque)  this.formValidationMessages['pChequenumber'] = `Enter ${this.displaychequeno}`;
//     }

//     if (Object.values(this.formValidationMessages).some((v: any) => v)) {
//       this.commonService.showWarningMessage('Please fill all required fields');
//       return false;
//     }

//     if (mode === 'CASH') {
//       const cashNum = Number(this.commonService.removeCommasInAmount((this.cashBalance || '0').replace(/[^\d.-]/g, ''))) || 0;
//       if (this.totalPaid() > cashNum) {
//         this.commonService.showWarningMessage('Insufficient Cash Balance');
//         return false;
//       }
//     }
//     return true;
//   }

//   savePaymentVoucher(): void {
//     if (!this.validatesavePaymentVoucher() || !confirm('Do You Want To Save ?')) return;

//     this.disablesavebutton.set(true);

//     const payDate   = this.commonService.getFormatDateNormal(this.paymentVoucherForm.get('ppaymentdate')?.value) || '';
//     const chequeDate = this.commonService.getFormatDateNormal(this.paymentVoucherForm.get('pchequedate')?.value) || '';
//     const total     = this.totalPaid();

//     const payload = {
//       global_schema:   this.commonService.getschemaname(),
//       branch_schema:   this.commonService.getbranchname(),
//       company_code:    this.commonService.getCompanyCode(),
//       branch_code:     this.commonService.getBranchCode(),
//       pCreatedby:      9,
//       pipaddress:      this.commonService.getIpAddress() || '',
//       pjvdate:         payDate,
//       ppaymentdate:    payDate,
//       ppaymentid:      this.paymentVoucherForm.get('ppaymentid')?.value || '',
//       pmodofPayment:   this.paymentVoucherForm.get('pmodofPayment')?.value || '',
//       pnarration:      this.paymentVoucherForm.get('pnarration')?.value || '',
//       ptotalpaidamount: Number(total || 0),
//       ptranstype:      this.paymentVoucherForm.get('ptranstype')?.value || 'PAYMENT',
//       ptypeofpayment:  this.paymentVoucherForm.get('ptypeofpayment')?.value || 'PETTYCASH',
//       pbankname:       this.paymentVoucherForm.get('pbankname')?.value || '',
//       pbranchname:     this.paymentVoucherForm.get('pbranchname')?.value || '',
//       pChequenumber:   this.paymentVoucherForm.get('pChequenumber')?.value || '',
//       pchequedate:     chequeDate,
//       pbankid:         Number(this.paymentVoucherForm.get('pbankid')?.value || 0),
//       pCardNumber:     this.paymentVoucherForm.get('pCardNumber')?.value || '',
//       pUpiname:        this.paymentVoucherForm.get('pUpiname')?.value || '',
//       pUpiid:          this.paymentVoucherForm.get('pUpiid')?.value || '',
//       formname:        'PETTYCASH',
//       pFilename:       this.imageResponse?.name || '',
//       pFilepath:       '/uploads/receipts/',
//       pFileformat:     this.imageResponse?.contentType?.split('/')[1] || '',
//       ppaymentsslistcontrols: this.paymentslist.map((item: any) => ({
//         ppartyid:            Number(item.ppartyid || 0),
//         psubledgerid:        Number(item.psubledgerid || 0),
//         pamount:             Number(item.pamount || 0),
//         pistdsapplicable:    item.pistdsapplicable === true || item.pistdsapplicable === 'true',
//         pTdsSection:         item.pTdsSection || '',
//         ptdsamount:          Number(item.ptdsamount || 0),
//         pisgstapplicable:    item.pisgstapplicable === true || item.pisgstapplicable === 'true',
//         ptdscalculationtype: item.ptdscalculationtype || 'INCLUDE',
//         pgstcalculationtype: item.pgstcalculationtype || 'EXCLUDE',
//         ppartyreferenceid:   item.ppartyreferenceid || '',
//         ppartyname:          item.ppartyname || '',
//       })),
//     };

//     this.accountingService
//       .SavePettyCash(payload)
//       .pipe(takeUntilDestroyed(this.destroyRef))
//       .subscribe({
//         next: (res: any) => {
//           if (res?.success) {
//             this.commonService.showInfoMessage('Saved Successfully');
//             this.router.navigate(['dashboard/accounts/accounts-transactions/petty-cash-view']);
//           } else {
//             this.commonService.showErrorMessage(res?.message || 'Save failed');
//           }
//           this.disablesavebutton.set(false);
//           this.cdr.markForCheck();
//         },
//         error: (err: any) => {
//           this.commonService.showErrorMessage(err);
//           this.disablesavebutton.set(false);
//           this.cdr.markForCheck();
//         },
//       });
//   }

//   // ── File upload ───────────────────────────────────────────────────────────
//   uploadAndProgress(event: Event): void {
//     try {
//       const file = (event.target as HTMLInputElement).files?.[0];
//       if (!file || !this.validateFile(file.name)) {
//         this.commonService.showWarningMessage('Upload jpg, png, or pdf files only');
//         return;
//       }
//       const reader = new FileReader();
//       reader.readAsDataURL(file);
//       reader.onload = () => {
//         this.imageResponse = { name: file.name, fileType: 'imageResponse', contentType: file.type, size: file.size };
//         this.cdr.markForCheck();
//       };
//       const formData = new FormData();
//       formData.append('file', file);
//       formData.append('NewFileName', `Payment Voucher.${file.name.split('.').pop()}`);
//       this.commonService.fileUploadS3('Account', formData)
//         .pipe(takeUntilDestroyed(this.destroyRef))
//         .subscribe({
//           next: (data: any) => {
//             if (!data?.length) return;
//             this.kycFileName = data[0];
//             this.imageResponse.name = data[0];
//             this.paymentVoucherForm.get('pFilename')?.setValue(this.kycFileName);
//             this.cdr.markForCheck();
//           },
//           error: (err: any) => this.commonService.showErrorMessage(err),
//         });
//     } catch (e: any) {
//       this.commonService.showErrorMessage(e.message || e);
//     }
//   }

//   validateFile(name: string): boolean {
//     return ['jpg','png','pdf'].includes(name.split('.').pop()?.toLowerCase() || '');
//   }

//   getStateName(state: any): string {
//     return state?.pState || state?.pStatename || '';
//   }
// }



import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, computed, inject, signal, } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators, } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { NgSelectModule } from '@ng-select/ng-select';
import { PaginatorModule } from 'primeng/paginator';

import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { DatePickerModule } from 'primeng/datepicker';
import { ValidationMessageComponent } from '../../../common/validation-message/validation-message.component';

@Component({
  selector: 'app-petty-cash',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    DatePickerModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    NgSelectModule,
    PaginatorModule,
    // ValidationMessageComponent,
  ],
  templateUrl: './petty-cash.html',
  providers: [DatePipe],
})
export class PettyCash implements OnInit {
  pDatepickerMaxDate: any = new Date();


  // ── DI via inject() ──────────────────────────────────────────────────────
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly commonService = inject(CommonService);
  private readonly accountingService = inject(AccountsTransactions);
   private datepipe = inject(DatePipe);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  // ── Signals ──────────────────────────────────────────────────────────────
  readonly paymentslist1 = signal<any[]>([]);
  readonly partyjournalentrylist = signal<any[]>([]);
  readonly disableaddbutton = signal(false);
  readonly disablesavebutton = signal(false);

  // ── Computed ─────────────────────────────────────────────────────────────
  readonly addbutton = computed(() => this.disableaddbutton() ? 'Processing' : 'Add');
  readonly savebutton = computed(() => this.disablesavebutton() ? 'Processing' : 'Save');
  readonly hasRows = computed(() => this.paymentslist1().length > 0);
  readonly totalPaid = computed(() =>
    this.paymentslist1().reduce((s, i) => s + Number(i.ptotalamount || 0), 0),
  );

  get isPartySelected(): boolean {
    return !!this.paymentVoucherForm?.get('ppaymentsslistcontrols.ppartyname')?.value;
  }

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
  showgstamount = false;
  showigst = false;
  showcgst = false;
  showsgst = false;
  showutgst = false;
  showgstno = false;
  showsubledger = true;

  displayCardName = 'Debit Card';
  displaychequeno = 'Cheque No';
  currencyCode = '₹';
  currencySymbol = '';

  banklist: any[] = [];
  modeoftransactionslist: any[] = [];
  typeofpaymentlist: any[] = [];
  ledgeraccountslist: any[] = [];
  subledgeraccountslist: any[] = [];
  partylist: any[] = [];
  gstlist: any[] = [];
  tdslist: any[] = [];
  tdssectionlist: any[] = [];
  tdspercentagelist: any[] = [];
  debitcardlist: any[] = [];
  statelist: any[] = [];
  chequenumberslist: any[] = [];
  upinameslist: any[] = [];
  upiidlist: any[] = [];
  paymentslist: any[] = [];
  cashBalance = '';
  bankBalance = '';
  bankbookBalance = '';
  bankpassbookBalance = '';
  ledgerBalance = '';
  subledgerBalance = '';
  partyBalance = '';
  formValidationMessages: any = {};
  paymentlistcolumnwiselist: any = {};
  imageResponse: any = null;
  disablegst = false;
  disabletds = false;
  disabletransactiondate = false;
  kycFileName = '';
  BranchCode = '';
  receiptid = '';
  dpConfig: any = {};
  dpConfig1: any = {};

  private _selectedPartyStateName = '';
   readonly today = new Date();
  readonly maxDate = new Date();

  readonly gstnopattern = '^(0[1-9]|[1-2][0-9]|3[0-9])([a-zA-Z]){5}([0-9]){4}([a-zA-Z]){1}([a-zA-Z0-9]){1}([a-zA-Z]){1}([a-zA-Z0-9]){1}?';

  readonly ppaymentdateConfig: any = {
    dateInputFormat: 'DD-MMM-YYYY',
    containerClass: 'theme-dark-blue',
    showWeekNumbers: false,
    maxDate: new Date(),
  };


  paymentVoucherForm!: FormGroup;


  private get pc(): FormGroup {
    return this.paymentVoucherForm.get('ppaymentsslistcontrols') as FormGroup;
  }

  ngOnInit(): void {
     this._configureDatepickers();
    this.currencySymbol = this.commonService.currencysymbol || '₹';

    const company = this.commonService.comapnydetails;
    if (company) {
      this.disabletransactiondate = company.pdatepickerenablestatus;
    }

    this.paymentVoucherForm = this.fb.group({
      ppaymentid: [''],
      schemaname: [this.commonService.getschemaname()],
      ppaymentdate: [new Date(), Validators.required],
      ptotalpaidamount: [''],
      pnarration: ['', Validators.required],
      pmodofPayment: ['CASH'],
      pbankname: [''],
      pbranchname: [''],
      ptranstype: ['CHEQUE', Validators.required],
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
      ppaymentsslistcontrols: this.buildPaymentControls(),
      pDocStorePath: [''],
    });

    this.paymentVoucherForm.get('ppaymentdate')?.setValue(new Date());
    this.blurEventAllControls(this.paymentVoucherForm);
    this.getLoadData();
  }
   private _configureDatepickers(): void {
    this.dpConfig.containerClass = 'theme-dark-blue';
    this.dpConfig.dateInputFormat = 'DD-MMM-YYYY';
    this.dpConfig.showWeekNumbers = false;
    this.dpConfig.isAnimated = true;
    this.dpConfig1 = { ...this.dpConfig, maxDate: new Date() };
  }


  private buildPaymentControls(): FormGroup {
    return this.fb.group({
      psubledgerid: [null, Validators.required],
      psubledgername: [''],
      pledgerid: [null, Validators.required],
      pledgername: ['', Validators.required],
      pamount: [''],
      pactualpaidamount: ['', Validators.required],
      pgsttype: [''],
      pisgstapplicable: [false],
      pgstcalculationtype: ['EXCLUDE'],
      pgstpercentage: [''],
      pgstamount: [''],
      pigstamount: [''],
      pcgstamount: [''],
      psgstamount: [''],
      putgstamount: [''],
      ppartyname: ['', Validators.required],
      ppartyid: [null,Validators.required],
      pistdsapplicable: [false],
      pgstno: new FormControl('', Validators.pattern(this.gstnopattern)),
      pTdsSection: [''],
      pTdsPercentage: [''],
      ptdsamount: [''],
      ptdscalculationtype: ['INCLUDE'],
      ppannumber: [''],
      pState: [''],
      pStateId: [''],
      pigstpercentage: [''],
      pcgstpercentage: [''],
      psgstpercentage: [''],
      putgstpercentage: [''],
      ptotalamount: [''],
    });
  }


  private blurEventAllControls(group: FormGroup): void {
    Object.keys(group.controls).forEach(key => {
      const ctrl = group.get(key);
      if (ctrl instanceof FormGroup) {
        this.blurEventAllControls(ctrl);
      } else if (ctrl?.validator) {
        ctrl.valueChanges
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => this.getValidationByControl(group, key));
      }
    });
  }

  getValidationByControl(group: FormGroup, key: string): void {
    const ctrl = group.get(key);
    if (!ctrl) return;
    this.formValidationMessages[key] = '';
    if (ctrl.invalid && (ctrl.dirty || ctrl.touched)) {
      for (const errorKey in ctrl.errors) {
        const msg = this.commonService.getValidationMessage(ctrl, errorKey, key, key, '');
        this.formValidationMessages[key] += msg + ' ';
      }
    }
  }

  private checkValidations(group: FormGroup, isValid: boolean): boolean {
    Object.keys(group.controls).forEach(key => {
      const ctrl = group.get(key);
      if (ctrl instanceof FormGroup) {
        isValid = this.checkValidations(ctrl, isValid);
      } else {
        ctrl?.markAsTouched();
        if (ctrl?.invalid) {
          isValid = false;
          this.getValidationByControl(group, key);
        }
      }
    });
    return isValid;
  }


  setBalances(type: string, amount: any): void {
    const num = Number(amount) || 0;
    const formatted = this.commonService.currencyFormat(Math.abs(num).toFixed(2));
    const label = num < 0 ? `${formatted} Cr` : `${formatted} Dr`;
    const map: Record<string, () => void> = {
      CASH: () => (this.cashBalance = label),
      BANK: () => (this.bankBalance = label),
      BANKBOOK: () => (this.bankbookBalance = label),
      PASSBOOK: () => (this.bankpassbookBalance = label),
      LEDGER: () => (this.ledgerBalance = label),
      SUBLEDGER: () => (this.subledgerBalance = label),
      PARTY: () => (this.partyBalance = label),
    };
    map[type]?.();
    this.cdr.markForCheck();
  }


  getLoadData(): void {
    this.accountingService
      .GetReceiptsandPaymentsLoadingDatapettycash(
        'PETTYCASH',
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode(),
        this.commonService.getschemaname(),
        'taxes',
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (json: any) => {
          if (!json) return;
          this.banklist = json.banklist || [];
          this.modeoftransactionslist = json.modeofTransactionslist || [];
          this.typeofpaymentlist = this.getTypeOfPaymentData();
          this.ledgeraccountslist = json.accountslist || [];
          this.partylist = json.partylist || [];
          this.gstlist = json.gstlist || [];
          this.debitcardlist = json.bankdebitcardslist || [];
          this.setBalances('CASH', json.cashbalance);
          this.setBalances('BANK', json.bankbalance);
          this.cdr.markForCheck();
        },
        error: (err: any) => this.commonService.showErrorMessage(err),
      });
  }

  private getTypeOfPaymentData(): any[] {
    return (this.modeoftransactionslist || []).filter(
      (p: any) => p.ptranstype !== p.ptypeofpayment,
    );
  }

  trackByFn(index: number, _item: any): number {
    return index;
  }


  modeofPaymentChange(): void {
    const mode = this.paymentVoucherForm.get('pmodofPayment')?.value;
    if (mode === 'CASH') {
      this.paymentVoucherForm.get('pbankid')?.setValue(0);
      this.showModeofPayment = false;
      this.showtranstype = false;
    } else if (mode === 'BANK') {
      this.paymentVoucherForm.get('ptranstype')?.setValue('CHEQUE');
      this.showModeofPayment = true;
      this.showtranstype = true;
    } else {
      this.showModeofPayment = true;
      this.showtranstype = false;
    }
    this.transofPaymentChange();
    this.getpartyJournalEntryData();
    this.cdr.markForCheck();
  }

  addModeofpaymentValidations(): void {
    const get = (k: string) => this.paymentVoucherForm.get(k)!;
    const controls = {
      mode: get('pmodofPayment'),
      trans: get('ptranstype'),
      bank: get('pbankname'),
      cheque: get('pChequenumber'),
      card: get('pCardNumber'),
      type: get('ptypeofpayment'),
      upiName: get('pUpiname'),
      upiId: get('pUpiid'),
    };

    if (this.showModeofPayment) {
      controls.mode.setValidators(Validators.required);
      controls.bank.setValidators(Validators.required);
      controls.cheque.setValidators(Validators.required);
      controls.trans.setValidators(this.showtranstype ? Validators.required : null!);
      controls.card.setValidators(!this.showbankcard ? Validators.required : null!);
      controls.type.setValidators(this.showTypeofPayment ? Validators.required : null!);
      if (this.showupi) {
        controls.upiName.setValidators(Validators.required);
        controls.upiId.setValidators(Validators.required);
      } else {
        controls.upiName.clearValidators();
        controls.upiId.clearValidators();
      }
    } else {
      [controls.mode, controls.bank, controls.cheque, controls.upiName, controls.upiId, controls.type]
        .forEach(c => c.clearValidators());
    }
    Object.values(controls).forEach(c => c.updateValueAndValidity());
  }

  transofPaymentChange(): void {
    this.displayCardName = 'Debit Card';
    this.showTypeofPayment = false;
    this.showbranch = false;
    this.showfinancial = false;
    this.showchequno = false;
    this.showbankcard = true;
    this.showupi = false;
    this.displaychequeno = 'Reference No.';

    switch (this.paymentVoucherForm.get('ptranstype')?.value) {
      case 'CHEQUE':
        this.displaychequeno = 'Cheque No.';
        this.showbranch = this.showchequno = true;
        break;
      case 'ONLINE':
        this.showTypeofPayment = true;
        break;
      case 'DEBIT CARD':
        this.showbankcard = false;
        this.showfinancial = true;
        break;
      default:
        this.displayCardName = 'Credit Card';
        this.showbankcard = false;
        this.showfinancial = true;
    }
    this.addModeofpaymentValidations();
    this.cleartranstypeDetails();
    this.cdr.markForCheck();
  }

  typeofPaymentChange(): void {
    const upiName = this.paymentVoucherForm.get('pUpiname')!;
    const upiId = this.paymentVoucherForm.get('pUpiid')!;
    this.showupi = this.paymentVoucherForm.get('ptypeofpayment')?.value === 'UPI';
    if (this.showupi) {
      upiName.setValidators(Validators.required);
      upiId.setValidators(Validators.required);
    } else {
      upiName.clearValidators();
      upiId.clearValidators();
    }
    upiName.updateValueAndValidity();
    upiId.updateValueAndValidity();
    this.getValidationByControl(this.paymentVoucherForm, 'ptypeofpayment');
    this.cdr.markForCheck();
  }

  isgstapplicable_Checked(): void {
    if (!this.pc) return;
    const isOn = this.pc.get('pisgstapplicable')?.value;

    if (!isOn) {
      this.pc.get('pStateId')?.setValue('');
      this.gst_clear();
      this.showgst = true;
    } else {
      this.showgst = false;
      if (this.statelist.length === 1 && !this.pc.get('pStateId')?.value) {
        const s = this.statelist[0];
        this.pc.patchValue({ pStateId: s.pStateId, pState: s.pState || '', pgsttype: s.pgsttype || '' });
        this.applyGstTypeFlags(s.pgsttype);
      }
    }
    this.isgstapplicableChange();
    this.cdr.markForCheck();
  }

  istdsapplicable_Checked(): void {
    if (!this.pc) return;
    const ppartyname = this.pc.get('ppartyname')?.value;
    const match = this.paymentslist.find((x: any) => x.ppartyname === ppartyname);
    if (match) this.pc.get('pistdsapplicable')?.setValue(match.pistdsapplicable);
    this.istdsapplicableChange();
    this.cdr.markForCheck();
  }

  isgstapplicableChange(): void {
    if (!this.pc) return;
    const enabled = this.pc.get('pisgstapplicable')?.value;
    const calc = this.pc.get('pgstcalculationtype');
    const pct = this.pc.get('pgstpercentage');
    const state = this.pc.get('pStateId');
    const amt = this.pc.get('pgstamount');

    if (enabled) {
      this.showgst = false;
      if (!this.disablegst) calc?.setValue('EXCLUDE');
      [calc, pct, state, amt].forEach(c => { c?.setValidators(Validators.required); c?.markAsUntouched(); });
      const gstType = this.pc.get('pgsttype')?.value;
      if (gstType) this.applyGstTypeFlags(gstType);
    } else {
      this.showgst = true;
      if (!this.disablegst) calc?.setValue('EXCLUDE');
      [calc, pct, state, amt].forEach(c => c?.clearValidators());
      this.formValidationMessages['pgstpercentage'] = '';
      this.formValidationMessages['pStateId'] = '';
      this.resetGstAmountFlags();
    }
    [calc, pct, state, amt].forEach(c => c?.updateValueAndValidity());
    this.claculategsttdsamounts();
    this.cdr.markForCheck();
  }

  istdsapplicableChange(): void {
    if (!this.pc) return;
    const enabled = this.pc.get('pistdsapplicable')?.value;
    const calc = this.pc.get('ptdscalculationtype');
    const pct = this.pc.get('pTdsPercentage');
    const section = this.pc.get('pTdsSection');
    const amt = this.pc.get('ptdsamount');

    if (enabled) {
      this.showtds = false;
      if (!this.disabletds) calc?.setValue('INCLUDE');
      [calc, pct, section, amt].forEach(c => { c?.setValidators(Validators.required); c?.markAsUntouched(); });
    } else {
      this.showtds = true;
      if (!this.disabletds) calc?.setValue('INCLUDE');
      [calc, pct, section, amt].forEach(c => c?.clearValidators());
      this.formValidationMessages['pTdsSection'] = '';
      this.formValidationMessages['pTdsPercentage'] = '';
    }
    [calc, pct, section, amt].forEach(c => c?.updateValueAndValidity());
    this.claculategsttdsamounts();
    this.cdr.markForCheck();
  }

  private applyGstTypeFlags(gstType: string): void {
    this.showgstamount = true;
    this.showigst = this.showcgst = this.showsgst = this.showutgst = false;
    switch (gstType) {
      case 'IGST': this.showigst = true; break;
      case 'CGST,SGST': this.showcgst = this.showsgst = true; break;
      case 'CGST,UTGST': this.showcgst = this.showutgst = true; break;
      default: if (gstType) this.showcgst = true; break;
    }
  }

  private resetGstAmountFlags(): void {
    this.showgstamount = this.showigst = this.showcgst = this.showsgst = this.showutgst = false;
  }


  bankName_Change(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const pbankid = target.value;
    this.upinameslist = this.chequenumberslist = [];
    ['pChequenumber', 'pUpiname', 'pUpiid'].forEach(f => this.paymentVoucherForm.get(f)?.setValue(''));

    if (pbankid) {
      const bankname = target.options[target.selectedIndex].text;
      this.getBankDetailsById(pbankid);
      this.getBankBranchName(pbankid);
      this.paymentVoucherForm.get('pbankname')?.setValue(bankname);
    } else {
      this.paymentVoucherForm.get('pbankname')?.setValue('');
    }
    this.getValidationByControl(this.paymentVoucherForm, 'pbankname');
    this.formValidationMessages['pChequenumber'] = '';
    this.cdr.markForCheck();
  }

  chequenumber_Change(): void {
    this.getValidationByControl(this.paymentVoucherForm, 'pChequenumber');
  }

  debitCard_Change(): void {
    const data = this.getbankname(this.paymentVoucherForm.get('pCardNumber')?.value);
    if (data) {
      this.paymentVoucherForm.get('pbankname')?.setValue(data.pbankname);
      this.paymentVoucherForm.get('pbankid')?.setValue(data.pbankid);
    }
    this.getValidationByControl(this.paymentVoucherForm, 'pCardNumber');
  }

  private getbankname(cardnumber: any): any {
    try {
      const data = this.debitcardlist.find((d: any) => d.pCardNumber === cardnumber);
      if (data) this.getBankBranchName(data.pbankid);
      return data;
    } catch (e) {
      this.commonService.showErrorMessage(e);
      return null;
    }
  }

  private getBankDetailsById(pbankid: any): void {
    this.accountingService
      .GetBankDetailsbyId(pbankid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (json: any) => {
          if (!json) return;
          this.upinameslist = json.bankupilist || [];
          this.chequenumberslist = json.chequeslist || [];
          this.cdr.markForCheck();
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

  upiName_Change(event: Event): void {
    const upiname = (event.target as HTMLSelectElement).value;
    this.upiidlist = this.upinameslist.filter((r: any) => r.pUpiname === upiname);
    this.getValidationByControl(this.paymentVoucherForm, 'pUpiname');
    this.cdr.markForCheck();
  }

  upid_change(): void {
    this.getValidationByControl(this.paymentVoucherForm, 'pUpiid');
  }

  ledgerName_Change(event: any): void {
    const pledgerid = event?.pledgerid;
    this.subledgeraccountslist = [];
    this.pc.get('psubledgerid')?.setValue(null);
    this.pc.get('psubledgername')?.setValue('');
    this.subledgerBalance = '';

    if (pledgerid) {
      const ledger = this.ledgeraccountslist.find((l: any) => l.pledgerid === pledgerid);
      if (ledger) {
        this.pc.get('pledgername')?.setValue(ledger.pledgername);
        this.setBalances('LEDGER', ledger.accountbalance ?? ledger.ledgeramount ?? 0);
        this.getSubLedgerData(pledgerid);
      } else {
        this.setBalances('LEDGER', 0);
        this.pc.get('pledgername')?.setValue('');
      }
    } else {
      this.setBalances('LEDGER', 0);
      this.pc.get('pledgername')?.setValue('');
    }
    this.cdr.markForCheck();
  }

  private getSubLedgerData(pledgerid: any): void {
    this.accountingService
      .GetSubLedgerData(
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
          const subCtrl = this.pc.get('psubledgername');
          if (json.length > 0) {
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
          this.cdr.markForCheck();
        },
        error: (err: any) => this.commonService.showErrorMessage(err),
      });
  }

  subledger_Change(event: any): void {
    const id = event?.psubledgerid;
    this.subledgerBalance = '';
    if (id) {
      this.pc.get('psubledgername')?.setValue(event.psubledgername);
      this.setBalances('SUBLEDGER', event?.accountbalance ?? event?.ledgeramount ?? 0);
    } else {
      this.pc.get('psubledgername')?.setValue('');
      this.setBalances('SUBLEDGER', 0);
    }
    this.getValidationByControl(this.paymentVoucherForm, 'psubledgername');
    this.cdr.markForCheck();
  }


  partyName_Change(event: any): void {
    const ppartyid = event?.ppartyid;
    this.statelist = this.tdssectionlist = this.tdspercentagelist = [];
    this._selectedPartyStateName = '';

    this.pc.patchValue({
      pStateId: '', pState: '', pTdsSection: '', pTdsPercentage: '',
      ppartyreferenceid: '', ppartyreftype: '', ppartypannumber: '',
      pgsttype: '', pgstpercentage: '', pgstamount: 0,
      pigstamount: 0, pcgstamount: 0, psgstamount: 0, putgstamount: 0,
      pisgstapplicable: false, pistdsapplicable: false,
    });

    this.resetGstAmountFlags();
    this.showgstno = false;
    this.showgst = this.showtds = true;
    this.partyBalance = '';

    if (ppartyid) {
      this.pc.get('ppartyname')?.setValue(event.ppartyname);
      const data = this.partylist.find((x: any) => x.ppartyid === ppartyid);
      if (data) {
        this.pc.patchValue({
          ppartyreferenceid: data.ppartyreferenceid || '',
          ppartyreftype: data.ppartyreftype || '',
          ppartypannumber: data.pan_no || '',
        });
      }
      this._selectedPartyStateName = event.state_name || '';
      this.getPartyDetailsById(ppartyid);
      this.setenableordisabletdsgst(event.ppartyname, 'PARTYCHANGE');
    } else {
      this.setBalances('PARTY', 0);
      this.pc.get('ppartyname')?.setValue('');
    }
    this.cdr.markForCheck();
  }

  private getPartyDetailsById(ppartyid: any): void {
    this.accountingService
      .getPartyDetailsbyid(
        ppartyid,
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
          const unique = Array.from(new Set(this.tdslist.map((i: any) => i.pTdsSection)));
          this.tdssectionlist = unique.map(s => ({ pTdsSection: s }));

          const partyState = (this._selectedPartyStateName || '').toLowerCase().trim();
          this.statelist = partyState && json.statelist?.length
            ? json.statelist.filter((s: any) => {
              const name = (s.pState || s.pStatename || '').toLowerCase().trim();
              return name === partyState || name.includes(partyState) || partyState.includes(name);
            })
            : [];

          this.setBalances('PARTY', json.accountbalance ?? 0);
          this.claculategsttdsamounts();
          this.pc.patchValue({ pStateId: '', pState: '', pgsttype: '', pisgstapplicable: false });
          this.resetGstAmountFlags();
          this.showgstno = false;
          this.showgst = true;
          this.cdr.markForCheck();
        },
        error: (err: any) => this.commonService.showErrorMessage(err),
      });
  }

  setenableordisabletdsgst(partyname: string, _changetype: string): void {
    this.pc.get('pistdsapplicable')?.setValue(false);
    this.pc.get('pisgstapplicable')?.setValue(false);
    const match = this.paymentslist.find((x: any) => x.ppartyname === partyname);
    if (match) {
      this.disablegst = this.disabletds = true;
      this.pc.get('pistdsapplicable')?.setValue(match.pistdsapplicable);
      this.pc.get('pisgstapplicable')?.setValue(match.pisgstapplicable);
      if (match.pisgstapplicable) this.pc.get('pgstcalculationtype')?.setValue('EXCLUDE');
      if (match.pistdsapplicable) this.pc.get('ptdscalculationtype')?.setValue('INCLUDE');
    } else {
      this.disablegst = this.disabletds = false;
      this.pc.get('pgstcalculationtype')?.setValue('EXCLUDE');
      this.pc.get('ptdscalculationtype')?.setValue('INCLUDE');
    }
  }


  gsno_change(): void {
    this.getValidationByControl(this.paymentVoucherForm, 'pgstno');
  }

  gst_clear(): void {
    this.resetGstAmountFlags();
    const fields = ['pigstpercentage', 'pigstamount', 'pcgstpercentage', 'pcgstamount',
      'psgstpercentage', 'psgstamount', 'putgstpercentage', 'putgstamount', 'pgstamount'];
    fields.forEach(f => this.pc.get(f)?.setValue(0));
    this.pc.get('pgsttype')?.setValue('');
    this.cdr.markForCheck();
  }

  gst_Change(event: any): void {
    const pct = event?.pgstpercentage ?? event;
    const zeroFields = ['pigstpercentage', 'pcgstpercentage', 'psgstpercentage', 'putgstpercentage',
      'pigstamount', 'pcgstamount', 'psgstamount', 'putgstamount', 'pgstamount'];
    zeroFields.forEach(f => this.pc.get(f)?.setValue(0));
    if (pct !== null && pct !== undefined && pct !== '') this.getGstPercentage(pct);
    this.getValidationByControl(this.paymentVoucherForm, 'pgstpercentage');
    this.getValidationByControl(this.paymentVoucherForm, 'pgstamount');
    this.cdr.markForCheck();
  }

  private getGstPercentage(pct: any): void {
    const data = this.gstlist.find((g: any) => String(g.pgstpercentage) === String(pct));
    if (!data) return;
    this.pc.patchValue({
      pigstpercentage: data.pigstpercentage || 0,
      pcgstpercentage: data.pcgstpercentage || 0,
      psgstpercentage: data.psgstpercentage || 0,
      putgstpercentage: data.putgstpercentage || 0,
    });
    this.applyGstTypeFlags(this.pc.get('pgsttype')?.value);
    this.claculategsttdsamounts();
  }

  state_change(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const stateId = target?.value;
    const stateName = stateId ? target.options[target.selectedIndex]?.text : '';
    this.gst_clear();

    if (!stateId) {
      this.pc.patchValue({ pState: '', pStateId: '' });
    } else {
      this.pc.patchValue({ pState: stateName, pStateId: stateId });
      this.showgstno = !stateName?.split('-')[1];
      const data = this.statelist.find((s: any) => String(s.pStateId) === String(stateId));
      if (data) {
        this.pc.get('pgsttype')?.setValue(data.pgsttype);
        this.applyGstTypeFlags(data.pgsttype);
      }
    }
    this.getValidationByControl(this.paymentVoucherForm, 'pState');
    this.formValidationMessages['pigstpercentage'] = '';
    this.claculategsttdsamounts();
    this.cdr.markForCheck();
  }


  // tdsSection_Change(section: any): void {
  //   debugger;
  //   this.tdspercentagelist = [];
  //   this.pc.get('pTdsPercentage')?.setValue('');
  //   if (section) this.getTdsPercentage(section);
  //   this.getValidationByControl(this.paymentVoucherForm, 'pTdsSection');
  //   this.cdr.markForCheck();
  // }


  tdsSection_Change(event: any): void {
    const section = event.pTdsSection
    this.tdspercentagelist = [];
    this.pc.get('pTdsPercentage')?.setValue('');
    if (section) this.getTdsPercentage(section);
    this.getValidationByControl(this.paymentVoucherForm, 'pTdsSection');
    this.cdr.markForCheck();
  }

  // private getTdsPercentage(section: any): void {
  //   debugger;
  //   this.tdspercentagelist = this.tdslist.filter((t: any) => t.pTdsSection === section);
  //   this.claculategsttdsamounts();
  // }


  private getTdsPercentage(section: any): void {
    debugger
    console.log("chyeolomfnmf");

    this.tdspercentagelist = this.tdslist.filter((t: any) => t.pTdsSection === section);
    this.claculategsttdsamounts();
  }

  tds_Change(_event: any): void {
    this.getValidationByControl(this.paymentVoucherForm, 'pTdsPercentage');
    this.getValidationByControl(this.paymentVoucherForm, 'ptdsamount');
    this.claculategsttdsamounts();
  }

  pamount_change(): void {
    this.claculategsttdsamounts();
  }


  blockInvalidAmountKeys(event: KeyboardEvent): void {
    const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight',
      'ArrowUp', 'ArrowDown', 'Home', 'End', 'F5'];
    if (allowed.includes(event.key)) return;
    if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) return;
    if (/^[0-9]$/.test(event.key)) return;
    if (event.key === '.') {
      const v = (event.target as HTMLInputElement).value.replace(/,/g, '');
      if (!v.includes('.')) return;
    }
    event.preventDefault();
  }

  onAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^0-9.]/g, '');
    let parts = value.split('.');
    if (parts.length > 2) parts = [parts[0], parts[1]];
    if (parts[0].length > 13) parts[0] = parts[0].substring(0, 13);
    if (parts[1]) parts[1] = parts[1].substring(0, 2);
    const formatted = parts.length > 1
      ? `${this.formatIndian(parts[0])}.${parts[1]}`
      : this.formatIndian(parts[0]);
    input.value = formatted;
    this.pc.get('pactualpaidamount')?.setValue(
      formatted.replace(/,/g, ''), { emitEvent: false }
    );

    this.claculategsttdsamounts();
  }

  formatAmountOnBlur(): void {
    const ctrl = this.pc.get('pactualpaidamount');
    if (!ctrl?.value) return;
    const parts = ctrl.value.toString().split('.');
    const formatted = parts.length > 1
      ? `${this.formatIndian(parts[0])}.${parts[1]}`
      : this.formatIndian(parts[0]);
    const el = document.getElementById('pactualpaidamount') as HTMLInputElement;
    if (el) el.value = formatted;
    this.claculategsttdsamounts();
  }

  private formatIndian(value: string): string {
    if (!value || value.length <= 3) return value || '';
    const last3 = value.slice(-3);
    const rest = value.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return `${rest},${last3}`;
  }


  claculategsttdsamounts(): void {
    try {
      if (!this.pc) return;
      let paid = parseFloat(
        this.commonService.removeCommasInAmount((this.pc.get('pactualpaidamount')?.value || '0').toString())
      ) || 0;

      const gstOn = this.pc.get('pisgstapplicable')?.value;
      const gstType = this.pc.get('pgsttype')?.value;
      const gstCalc = this.pc.get('pgstcalculationtype')?.value || 'EXCLUDE';
      const igstPct = parseFloat(this.pc.get('pigstpercentage')?.value) || 0;
      const cgstPct = parseFloat(this.pc.get('pcgstpercentage')?.value) || 0;
      const sgstPct = parseFloat(this.pc.get('psgstpercentage')?.value) || 0;
      const utgstPct = parseFloat(this.pc.get('putgstpercentage')?.value) || 0;

      let igst = 0, cgst = 0, sgst = 0, utgst = 0, taxable = paid;

      if (gstOn && gstType && paid > 0) {
        if (gstCalc === 'EXCLUDE') {
          if (gstType === 'IGST') igst = Math.round(paid * igstPct / 100);
          else if (gstType === 'CGST,SGST') {
            const t = Math.round(paid * (cgstPct + sgstPct) / 100);
            cgst = Math.round(t / 2); sgst = t - cgst;
          } else if (gstType === 'CGST,UTGST') {
            const t = Math.round(paid * (cgstPct + utgstPct) / 100);
            cgst = Math.round(t / 2); utgst = t - cgst;
          }
        } else {
          if (gstType === 'IGST') {
            igst = Math.round(paid * igstPct / (100 + igstPct));
            taxable = paid - igst;
          } else if (gstType === 'CGST,SGST') {
            const rate = cgstPct + sgstPct;
            const t = Math.round(paid * rate / (100 + rate));
            cgst = Math.round(t / 2); sgst = t - cgst;
            taxable = paid - cgst - sgst;
          } else if (gstType === 'CGST,UTGST') {
            const rate = cgstPct + utgstPct;
            const t = Math.round(paid * rate / (100 + rate));
            cgst = Math.round(t / 2); utgst = t - cgst;
            taxable = paid - cgst - utgst;
          }
        }
      }

      const gst = igst + cgst + sgst + utgst;

      const tdsOn = this.pc.get('pistdsapplicable')?.value;
      const tdsCalc = this.pc.get('ptdscalculationtype')?.value || 'INCLUDE';
      const tdsPct = parseFloat(this.pc.get('pTdsPercentage')?.value) || 0;
      let tds = 0;

      if (tdsOn && tdsPct > 0 && paid > 0) {
        tds = tdsCalc === 'INCLUDE'
          ? Math.round(taxable * tdsPct / (100 + tdsPct))
          : Math.round(taxable * tdsPct / 100);
      }

      const total = parseFloat((taxable + gst - tds).toFixed(2));

      this.pc.patchValue({
        pamount: taxable > 0 ? taxable : '',
        pgstamount: gst,
        pigstamount: igst,
        pcgstamount: cgst,
        psgstamount: sgst,
        putgstamount: utgst,
        ptdsamount: tds,
        ptotalamount: total,
      });
      this.formValidationMessages['pamount'] = '';
      this.cdr.markForCheck();
    } catch (e) {
      this.commonService.showErrorMessage(e);
    }
  }


  private validateaddPaymentDetails(): boolean {
    this.formValidationMessages = {};
    let isValid = true;

    const required = [
      { key: 'pactualpaidamount', msg: 'Enter Amount Paid' },
      { key: 'ppartyid', msg: 'Select Party' },
      { key: 'pledgerid', msg: 'Select Ledger' },
    ];
    required.forEach(({ key, msg }) => {
      if (!this.pc.get(key)?.value) {
        this.pc.get(key)?.markAsTouched();
        this.formValidationMessages[key] = msg;
        isValid = false;
      }
    });

    if (this.showsubledger && !this.pc.get('psubledgerid')?.value) {
      this.pc.get('psubledgerid')?.markAsTouched();
      this.formValidationMessages['psubledgername'] = 'Select Sub Ledger';
      isValid = false;
    }

    if (this.pc.get('pisgstapplicable')?.value) {
      if (!this.pc.get('pStateId')?.value) {
        this.pc.get('pStateId')?.markAsTouched();
        this.formValidationMessages['pStateId'] = 'Select State';
        isValid = false;
      }
      if (!this.pc.get('pgstpercentage')?.value) {
        this.pc.get('pgstpercentage')?.markAsTouched();
        this.formValidationMessages['pgstpercentage'] = 'Select GST %';
        isValid = false;
      }
    }

    if (this.pc.get('pistdsapplicable')?.value) {
      if (!this.pc.get('pTdsSection')?.value) {
        this.pc.get('pTdsSection')?.markAsTouched();
        this.formValidationMessages['pTdsSection'] = 'Select Section';
        isValid = false;
      }
      if (!this.pc.get('pTdsPercentage')?.value) {
        this.pc.get('pTdsPercentage')?.markAsTouched();
        this.formValidationMessages['pTdsPercentage'] = 'Select Percentage';
        isValid = false;
      }
    }

    if (isValid) {
      const duplicate = this.paymentslist.some((row: any) =>
        row.pledgername === this.pc.get('pledgername')?.value &&
        row.psubledgername === this.pc.get('psubledgername')?.value &&
        row.ppartyid === this.pc.get('ppartyid')?.value,
      );
      if (duplicate) {
        this.commonService.showWarningMessage('Ledger, subledger and party already exists in the grid.');
        isValid = false;
      }
    }

    if (!isValid && Object.values(this.formValidationMessages).some((v: any) => v)) {
      this.commonService.showWarningMessage('Please fill all required fields for this record');
    }
    return isValid;
  }

  addPaymentDetails(): void {
    if (this.disableaddbutton()) return;
    this.disableaddbutton.set(true);

    if (!this.validateaddPaymentDetails()) {
      this.disableaddbutton.set(false);
      return;
    }

    const ctrl = this.pc;
    const safeRemove = (v: any) => this.commonService.removeCommasInAmount((v || '0').toString());
    const row = {
      ppartyname: ctrl.get('ppartyname')?.value,
      pledgername: ctrl.get('pledgername')?.value,
      psubledgername: ctrl.get('psubledgername')?.value,
      ptotalamount: safeRemove(ctrl.get('ptotalamount')?.value),
      pamount: safeRemove(ctrl.get('pamount')?.value),
      pgstcalculationtype: ctrl.get('pgstcalculationtype')?.value || 'EXCLUDE',
      pTdsSection: ctrl.get('pTdsSection')?.value,
      pgstpercentage: ctrl.get('pgstpercentage')?.value || 0,
      ptdsamount: safeRemove(ctrl.get('ptdsamount')?.value),
      ptdscalculationtype: ctrl.get('ptdscalculationtype')?.value || 'INCLUDE',
      pTdsPercentage: ctrl.get('pTdsPercentage')?.value || 0,
    };

    this.paymentslist1.update(list => [...list, row]);
    this.paymentslist.push(ctrl.value);

    this.getpartyJournalEntryData();
    this.getPaymentListColumnWisetotals();


    const keepLedgerId = ctrl.get('pledgerid')?.value;
    const keepLedgerName = ctrl.get('pledgername')?.value;
    const keepSubId = ctrl.get('psubledgerid')?.value;
    const keepSubName = ctrl.get('psubledgername')?.value;

    ctrl.patchValue({
      ppartyid: null, ppartyname: '', pactualpaidamount: '',
      ptdsamount: 0, pamount: '', ptotalamount: '', pgstamount: 0,
      pigstamount: 0, pcgstamount: 0, psgstamount: 0, putgstamount: 0,
      pisgstapplicable: false, pistdsapplicable: false,
      pStateId: '', pgstpercentage: '', pTdsSection: '', pTdsPercentage: '',
      pgsttype: '', pState: '', pgstno: '',
      pigstpercentage: 0, pcgstpercentage: 0, psgstpercentage: 0, putgstpercentage: 0,
      pledgerid: keepLedgerId, pledgername: keepLedgerName,
      psubledgerid: keepSubId, psubledgername: keepSubName,
    });


    const amtEl = document.getElementById('pactualpaidamount') as HTMLInputElement;
    if (amtEl) amtEl.value = '';

    Object.keys(ctrl.controls).forEach(key => {
      ctrl.get(key)?.markAsUntouched();
      ctrl.get(key)?.markAsPristine();
    });

    this.formValidationMessages = {};
    this.disableaddbutton.set(false);
    this.cdr.markForCheck();
  }

  removeHandler(rowIndex: number): void {
    if (rowIndex < 0 || rowIndex >= this.paymentslist1().length) return;
    this.paymentslist1.update(list => list.filter((_, i) => i !== rowIndex));
    if (this.paymentslist.length > rowIndex) this.paymentslist.splice(rowIndex, 1);
    this.paymentVoucherForm.get('ptotalpaidamount')?.setValue(this.totalPaid());
    this.getpartyJournalEntryData();
    this.clearPaymentDetails();
    this.getPaymentListColumnWisetotals();
    this.cdr.markForCheck();
  }

  clearPaymentDetails(): void {
    this.pc.reset();
    this.showsubledger = true;
    this.pc.patchValue({
      pistdsapplicable: false, pisgstapplicable: false,
      pledgerid: null, psubledgerid: null, ppartyid: null,
      pStateId: '', pgstpercentage: '', pTdsSection: '', pTdsPercentage: '',
      pgstcalculationtype: 'EXCLUDE', ptdscalculationtype: 'INCLUDE',
    });
    ['LEDGER', 'SUBLEDGER', 'PARTY'].forEach(t => this.setBalances(t, 0));
    this.resetGstAmountFlags();
    this.showgst = true;
    this.showtds = true;
    this.disablegst = false;
    this.disabletds = false;
    this.formValidationMessages = {};
    this.statelist = [];
    this.tdssectionlist = [];
    this.tdspercentagelist = [];
    this.subledgeraccountslist = [];
    this.cdr.markForCheck();
  }

  private cleartranstypeDetails(): void {
    this.chequenumberslist = [];
    ['pbankid', 'pbankname', 'pCardNumber', 'ptypeofpayment', 'pbranchname', 'pUpiname', 'pUpiid', 'pChequenumber']
      .forEach(f => this.paymentVoucherForm.get(f)?.setValue(''));
    this.formValidationMessages = {};
    this.setBalances('BANKBOOK', 0);
    this.setBalances('PASSBOOK', 0);
  }

  clearPaymentVoucher(): void {
    try {
      this.paymentslist.length = 0;
      this.paymentslist1.set([]);
      this.partyjournalentrylist.set([]);
      this.paymentVoucherForm.reset();
      this.cleartranstypeDetails();
      this.pc.patchValue({
        pistdsapplicable: false, pisgstapplicable: false,
        pledgerid: null, psubledgerid: null, ppartyid: null,
        pStateId: '', pgstpercentage: '', pTdsSection: '', pTdsPercentage: '',
        pgstcalculationtype: 'EXCLUDE', ptdscalculationtype: 'INCLUDE',
      });


      this.paymentVoucherForm.patchValue({ pmodofPayment: 'CASH' });
      this.paymentVoucherForm.get('ppaymentdate')?.setValue(new Date());


      this.showModeofPayment = false;
      this.showsubledger = true;
      this.showgst = true;
      this.showtds = true;
      this.disablegst = false;
      this.disabletds = false;
      this.resetGstAmountFlags();


      ['LEDGER', 'SUBLEDGER', 'PARTY', 'BANKBOOK', 'PASSBOOK'].forEach(t => this.setBalances(t, 0));
      this.bankbookBalance = this.bankpassbookBalance = '';


      this.statelist = [];
      this.tdssectionlist = [];
      this.tdspercentagelist = [];
      this.subledgeraccountslist = [];


      this.formValidationMessages = {};
      this.paymentlistcolumnwiselist = {};
      this.imageResponse = { name: '', fileType: 'imageResponse', contentType: '', size: 0 };


      this.modeofPaymentChange();

      this.cdr.markForCheck();
    } catch (e: any) {
      this.commonService.showErrorMessage(e.message || e);
    }
  }


  getPaymentListColumnWisetotals(): void {
    const list = this.paymentslist1();
    this.paymentlistcolumnwiselist = {
      ptotalamount: list.reduce((s, c) => s + Number(c.ptotalamount || 0), 0),
      pamount: list.reduce((s, c) => s + Number(c.pamount || 0), 0),
      pgstamount: this.paymentslist.reduce((s, c: any) => s + Number(c.pgstamount || 0), 0),
      ptdsamount: list.reduce((s, c) => s + Number(c.ptdsamount || 0), 0),
    };
  }

  getpartyJournalEntryData(): void {
    try {
      const tdsEntries: any[] = [];
      const entries: any[] = [];

      const ledgers = [...new Set(this.paymentslist.map((p: any) => p.pledgername))];
      ledgers.forEach((ledger: any) => {
        const rows = this.paymentslist.filter((p: any) => p.pledgername === ledger);
        const debit = rows.reduce((s, p: any) => {
          const amt = parseFloat(this.commonService.removeCommasInAmount((p.pamount || '0').toString())) || 0;
          const tds = parseFloat(this.commonService.removeCommasInAmount((p.ptdsamount || '0').toString())) || 0;
          return s + (amt - tds);
        }, 0);

        if (debit > 0) entries.push({ accountname: ledger, debitamount: parseFloat(debit.toFixed(2)), creditamount: '' });

        const tdsSections = [...new Set(rows.filter((p: any) => p.pistdsapplicable && parseFloat(p.ptdsamount || 0) > 0).map((p: any) => p.pTdsSection))];
        tdsSections.forEach((section: any) => {
          const tdsAmt = rows.filter((p: any) => p.pTdsSection === section)
            .reduce((s, p: any) => s + (parseFloat(this.commonService.removeCommasInAmount((p.ptdsamount || '0').toString())) || 0), 0);
          if (tdsAmt > 0) {
            tdsEntries.push({ accountname: `TDS-${section} RECEIVABLE`, debitamount: parseFloat(tdsAmt.toFixed(2)), creditamount: '' });
            tdsEntries.push({ accountname: ledger, debitamount: '', creditamount: parseFloat(tdsAmt.toFixed(2)) });
          }
        });
      });

      const gstFields = [
        { field: 'pigstamount', label: 'P-IGST' },
        { field: 'pcgstamount', label: 'P-CGST' },
        { field: 'psgstamount', label: 'P-SGST' },
        { field: 'putgstamount', label: 'P-UTGST' },
      ];
      gstFields.forEach(({ field, label }) => {
        const amt = this.paymentslist.reduce((s, p: any) => s + (parseFloat(this.commonService.removeCommasInAmount((p[field] || '0').toString())) || 0), 0);
        if (amt > 0) entries.push({ accountname: label, debitamount: parseFloat(amt.toFixed(2)), creditamount: '' });
      });

      const total = this.totalPaid();
      if (total > 0) {
        this.paymentVoucherForm.get('ptotalpaidamount')?.setValue(parseFloat(total.toFixed(2)));
        const mode = this.paymentVoucherForm.get('pmodofPayment')?.value;
        entries.push({ accountname: mode === 'CASH' ? 'PETTY CASH' : 'BANK', debitamount: '', creditamount: parseFloat(total.toFixed(2)) });
      }

      this.partyjournalentrylist.set([...entries, ...tdsEntries]);
      this.cdr.markForCheck();
    } catch (e) {
      this.commonService.showErrorMessage(e);
    }
  }

  getTotalDebit(): number {
    return this.partyjournalentrylist().reduce((s, r) => s + (parseFloat(r.debitamount) || 0), 0);
  }

  getTotalCredit(): number {
    return this.partyjournalentrylist().reduce((s, r) => s + (parseFloat(r.creditamount) || 0), 0);
  }


  validatesavePaymentVoucher(): boolean {
    debugger
    this.formValidationMessages = {};

    if (!this.paymentslist || this.paymentslist.length === 0) {
      this.commonService.showWarningMessage('Please add at least one record to the grid before saving!');
      return false;
    }

    const paymentDate = this.paymentVoucherForm.get('ppaymentdate')?.value;
    if (!paymentDate) {
      this.paymentVoucherForm.get('ppaymentdate')?.markAsTouched();
      this.formValidationMessages['ppaymentdate'] = 'Select Date';
    }

    const narration = this.paymentVoucherForm.get('pnarration')?.value;
    if (!narration) {
      this.paymentVoucherForm.get('pnarration')?.markAsTouched();
      this.formValidationMessages['pnarration'] = 'Enter Narration';
    }

    const modeOfPayment = this.paymentVoucherForm.get('pmodofPayment')?.value;
    if (!modeOfPayment) {
      this.paymentVoucherForm.get('pmodofPayment')?.markAsTouched();
      this.formValidationMessages['pmodofPayment'] = 'Select Mode of Payment';
    }

    if (modeOfPayment === 'BANK') {
      const bankId = this.paymentVoucherForm.get('pbankid')?.value;
      const chequeNumber = this.paymentVoucherForm.get('pChequenumber')?.value;
      if (!bankId) {
        this.paymentVoucherForm.get('pbankid')?.markAsTouched();
        this.formValidationMessages['pbankid'] = 'Select Bank Name';
      }
      if (!chequeNumber) {
        this.paymentVoucherForm.get('pChequenumber')?.markAsTouched();
        this.formValidationMessages['pChequenumber'] = `Enter ${this.displaychequeno}`;
      }
    }

    if (Object.values(this.formValidationMessages).some((v: any) => v)) {
      this.commonService.showWarningMessage('Please fill all required fields');
      this.cdr.markForCheck();
      return false;
    }

    if (modeOfPayment === 'CASH') {
      const rawBalance = (this.cashBalance || '0').toString().trim().replace(/[^\d.]/g, '');
      const numericCashBalance = Number(this.commonService.removeCommasInAmount(rawBalance)) || 0;
      if (this.totalPaid() > numericCashBalance) {
        this.commonService.showWarningMessage('Insufficient Cash Balance');
        return false;
      }
    }

    return true;
  }


  savePaymentVoucher(): void {
    debugger;

    if (!this.validatesavePaymentVoucher()) {
     return;
   }


   if (!confirm('Do You Want To Save ?')) {
      return;
    }

    this.disablesavebutton.set(true);
    this.cdr.markForCheck();

    try {
      const total = this.totalPaid();
      const payDate = this.commonService.getFormatDateNormal(
        this.paymentVoucherForm.get('ppaymentdate')?.value
      ) || new Date().toISOString().split('T')[0];
      const chequeDate = this.commonService.getFormatDateNormal(
        this.paymentVoucherForm.get('pchequedate')?.value
      ) || '';

      const payload = {
        pRecordid: '',
        global_schema: this.commonService.getschemaname() || '',
        branch_schema: this.commonService.getbranchname() || '',
        company_code: this.commonService.getCompanyCode() || '',
        branch_code: this.commonService.getBranchCode() || '',
        branchid: this.BranchCode || '',
        pCreatedby: 9,
        pipaddress: this.commonService.getIpAddress() || '',
        ppaymentid: this.paymentVoucherForm.get('ppaymentid')?.value || '',
        ppaymentdate: payDate,
        pjvdate: payDate,
        formname: 'PETTYCASH',
        ptranstype: this.paymentVoucherForm.get('ptranstype')?.value || 'PAYMENT',
        ptypeofpayment: this.paymentVoucherForm.get('ptypeofpayment')?.value || 'PETTYCASH',
        pmodofPayment: this.paymentVoucherForm.get('pmodofPayment')?.value || '',
        pnarration: this.paymentVoucherForm.get('pnarration')?.value || '',
        ptotalpaidamount: Number(total || 0),
        totalreceivedamount: String(total || 0),
        payableValue: String(total || 0),
        pbankid: Number(this.paymentVoucherForm.get('pbankid')?.value || 0),
        bank_id: Number(this.paymentVoucherForm.get('pbankid')?.value || 0),
        pbankname: this.paymentVoucherForm.get('pbankname')?.value || '',
        bank_name: this.paymentVoucherForm.get('pbankname')?.value || '',
        pbranchname: this.paymentVoucherForm.get('pbranchname')?.value || '',
        pChequenumber: this.paymentVoucherForm.get('pChequenumber')?.value || '',
        pchequedate: chequeDate,
        pchequedepositdate: '',
        pchequecleardate: '',
        pchequeEntryid: '',
        pBankconfigurationId: '',
        pdepositbankid: '',
        pdepositbankname: '',
        pAccountnumber: '',
        pCardNumber: this.paymentVoucherForm.get('pCardNumber')?.value || '',
        pUpiname: this.paymentVoucherForm.get('pUpiname')?.value || '',
        pUpiid: this.paymentVoucherForm.get('pUpiid')?.value || '',
        receiptid: this.receiptid || '',
        parentaccountname: this.paymentslist[0]?.paccountname || '',
        contactid: String(this.paymentslist[0]?.ppartyid || ''),
        contactname: this.paymentslist[0]?.ppartyname || '',
        chitgroupid: this.paymentslist[0]?.chitgroupid || '',
        groupcode: this.paymentslist[0]?.groupcode || '',
        ticketno: this.paymentslist[0]?.ticketno || '',
        challanaNo: '',
        pparentid: String(this.paymentslist[0]?.pledgerid || ''),
        pAccountName: this.paymentslist[0]?.pledgername || '',
        pContactReferenceId: this.paymentslist[0]?.ppartyreferenceid || '',
        pPanNumber: this.paymentslist[0]?.ppartypannumber || '',
        radioButtonValue: this.paymentVoucherForm.get('pmodofPayment')?.value || '',
        contactpaytype: this.paymentVoucherForm.get('pmodofPayment')?.value || '',
        contactbankname: '',
        contactbankaccno: '',
        contactbankbranch: '',
        contactbankifsc: '',
        checkedChitScheme: 'false',
        toChitNo: '',
        subscriberjoinedbranchid: 0,
        pinstallment_no: '',
        pchequeno_scheme: '',
        pchequedate_scheme: '',
        pFilename: this.imageResponse?.name || '',
        pFilepath: '/uploads/receipts/',
        pFileformat: this.imageResponse?.contentType?.split('/')[1] || '',
        ppaymentsslistcontrols: this.paymentslist.map((item: any) => ({
          ppartyid: Number(item.ppartyid || 0),
          psubledgerid: Number(item.psubledgerid || 0),
          pamount: Number(item.pamount || 0),
          pistdsapplicable: item.pistdsapplicable === true || item.pistdsapplicable === 'true',
          pTdsSection: item.pTdsSection || '',
          ptdsamount: Number(item.ptdsamount || 0),
          pisgstapplicable: item.pisgstapplicable === true || item.pisgstapplicable === 'true',
          ptdscalculationtype: item.ptdscalculationtype || 'INCLUDE',
          pgstcalculationtype: item.pgstcalculationtype || 'EXCLUDE',
          ppartyreferenceid: item.ppartyreferenceid || '',
          ppartyname: item.ppartyname || '',
        })),
        ppaymentslist: this.paymentslist.map((item: any) => ({
          psubledgerid: String(item.psubledgerid || ''),
          psubledgername: item.psubledgername || '',
          pledgerid: String(item.pledgerid || ''),
          pledgername: item.pledgername || '',
          id: String(item.psubledgerid || ''),
          text: item.psubledgername || '',
          ptranstype: 'PAYMENT',
          accountbalance: String(item.ledgeramount || '0'),
          pAccounttype: item.pAccounttype || '',
          legalcellReceipt: item.legalcellReceipt || '',
          pbranchcode: this.BranchCode || '',
          pbranchtype: 'MAIN',
          groupcode: item.groupcode || '',
          pamount: String(item.pamount || '0'),
          pgsttype: item.pgsttype || '',
          pgstcalculationtype: item.pgstcalculationtype || 'EXCLUDE',
          pgstpercentage: String(item.pgstpercentage || '0'),
          pigstamount: String(item.pigstamount || '0'),
          pcgstamount: String(item.pcgstamount || '0'),
          psgstamount: String(item.psgstamount || '0'),
          putgstamount: String(item.putgstamount || '0'),
          pState: item.pState || '',
          pStateId: String(item.pStateId || ''),
          pgstno: item.pgstno || '',
          pgstamount: String(item.pgstamount || '0'),
          pigstpercentage: String(item.pigstpercentage || '0'),
          pcgstpercentage: String(item.pcgstpercentage || '0'),
          psgstpercentage: String(item.psgstpercentage || '0'),
          putgstpercentage: String(item.putgstpercentage || '0'),
          pactualpaidamount: String(item.pactualpaidamount || '0'),
          ptotalamount: String(item.ptotalamount || '0'),
          pisgstapplicable: item.pisgstapplicable ? 'true' : 'false',
          ptdsamountindividual: String(item.ptdsamount || '0'),
          pTdsSection: item.pTdsSection || '',
          pTdsPercentage: String(item.pTdsPercentage || '0'),
          preferencetext: item.ppartyreferenceid || '',
          pgstnumber: item.pgstno || '',
          ppartyname: item.ppartyname || '',
          ppartyid: String(item.ppartyid || ''),
          ppartyreferenceid: item.ppartyreferenceid || '',
          ppartyreftype: item.ppartyreftype || '',
          pistdsapplicable: item.pistdsapplicable ? 'true' : 'false',
          ptdsamount: String(item.ptdsamount || '0'),
          ptdscalculationtype: item.ptdscalculationtype || 'INCLUDE',
          ptdsaccountId: String(item.ptdsaccountId || ''),
          ppartypannumber: item.ppartypannumber || '',
          ptdsrefjvnumber: item.ptdsrefjvnumber || '',
          ledgeramount: String(item.ledgeramount || '0'),
          totalreceivedamount: String(item.pactualpaidamount || '0'),
          pFilename: this.imageResponse?.name || '',
          agentcode: item.agentcode || '',
          ticketno: item.ticketno || '',
          chitgroupid: item.chitgroupid || '',
          schemesubscriberid: item.schemesubscriberid || '',
          interbranchsubledgerid: item.interbranchsubledgerid || '',
          interbranchid: item.interbranchid || '',
          pformname: 'PETTYCASH',
          paccountname: item.paccountname || '',
          pgstvoucherno: item.pgstvoucherno || '',
          pChequenumber: this.paymentVoucherForm.get('pChequenumber')?.value || '',
        })),
      };

      this.accountingService.SavePettyCash(payload).subscribe({
        next: (res: any) => {
          if (res?.success) {
            this.commonService.showInfoMessage('Saved Successfully');
            this.router.navigate(['dashboard/accounts/accounts-transactions/petty-cash-view']);
          } else {
            this.commonService.showErrorMessage(res?.message || 'Save failed');
            this.disablesavebutton.set(false);
            this.cdr.markForCheck();
          }
        },
        error: (err: any) => {
          this.commonService.showErrorMessage(err);
          this.disablesavebutton.set(false);
          this.cdr.markForCheck();
        },
      });

    } catch (e: any) {
      this.commonService.showErrorMessage(e.message || e);
      this.disablesavebutton.set(false);
      this.cdr.markForCheck();
    }
  }


  uploadAndProgress(event: Event): void {
    try {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file || !this.validateFile(file.name)) {
        this.commonService.showWarningMessage('Upload jpg, png, or pdf files only');
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        this.imageResponse = { name: file.name, fileType: 'imageResponse', contentType: file.type, size: file.size };
        this.cdr.markForCheck();
      };
      const formData = new FormData();
      formData.append('file', file);
      formData.append('NewFileName', `Payment Voucher.${file.name.split('.').pop()}`);
      this.commonService.fileUploadS3('Account', formData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (data: any) => {
            if (!data?.length) return;
            this.kycFileName = data[0];
            this.imageResponse.name = data[0];
            this.paymentVoucherForm.get('pFilename')?.setValue(this.kycFileName);
            this.cdr.markForCheck();
          },
          error: (err: any) => this.commonService.showErrorMessage(err),
        });
    } catch (e: any) {
      this.commonService.showErrorMessage(e.message || e);
    }
  }

  validateFile(name: string): boolean {
    return ['jpg', 'png', 'pdf'].includes(name.split('.').pop()?.toLowerCase() || '');
  }

  getStateName(state: any): string {
    return state?.pState || state?.pStatename || '';
  }
}