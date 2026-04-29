import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  effect,
  signal,
  computed,
  DestroyRef,
  ChangeDetectorRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { viewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DatePickerModule } from 'primeng/datepicker';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  FormArray,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  BsDatepickerModule,
  BsDatepickerConfig,
  BsDatepickerViewMode,
} from 'ngx-bootstrap/datepicker';
import { Router, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CommonService } from '../../../../core/services/Common/common.service';
import { Address } from '../../../common/address/address/address';
import { ValidationMessageComponent } from '../../../common/validation-message/validation-message.component';
import { AccountsConfig } from '../../../../core/services/accounts/accounts-config';
import { from } from 'rxjs';

// ── Typed form shape ──────────────────────────────────────────────────────────
interface BankMasterFormShape {
  modeOfReceipt: FormControl<string | null>;
  bankDetailsType: FormControl<string | null>;
  bankType: FormControl<string>;
  pCreatedby: FormControl<number>;
  pBankdate: FormControl<Date | null>;
  pAcctountype: FormControl<string | null>;
  pBankID: FormControl<string>;
  bankName: FormControl<string | null>;
  pBankbranch: FormControl<string>;
  pAccountnumber: FormControl<string>;
  pIfsccode: FormControl<string>;
  account_name: FormControl<string>;
  pOverdraft: FormControl<string>;
  pOpeningBalance: FormControl<string>;
  pOpeningBalanceType: FormControl<string>;
  pRecordid: FormControl<string>;
  pStatusname: FormControl<string>;
  ptypeofoperation: FormControl<string>;
  pCardNo: FormControl<string>;
  pIsdebitcardapplicable: FormControl<boolean>;
  pCardName: FormControl<string>;
  pValidfrom: FormControl<Date | null>;
  pValidto: FormControl<Date | null>;
  pUpiid: FormControl<string>;
  upiname: FormControl<string>;
  popeningjvno: FormControl<string>;
  pIsupiapplicable: FormControl<boolean>;
  pAddress1: FormControl<string>;
  pAddress2: FormControl<string>;
  pCity: FormControl<string>;
  pState: FormControl<string>;
  pDistrict: FormControl<string>;
  pPincode: FormControl<string>;
  pCountry: FormControl<string>;
  lstBankdebitcarddtlsDTO: FormArray;
  lstBankUPI: FormControl<any[]>;
  branchSchema: FormControl<string>;
  pipaddress: FormControl<string>;
  lstBankInformationAddressDTO: FormArray;
  isprimary: FormControl<boolean>;
  isformanbank: FormControl<boolean>;
  isforemanpaymentbank: FormControl<boolean>;
  isintrestpaymentbank: FormControl<boolean>;
}

@Component({
  selector: 'app-bank-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BsDatepickerModule,
    DatePickerModule,
    TableModule,
    ValidationMessageComponent,
    Address,
    NgSelectModule,
    ButtonModule,
    RouterModule,
  ],
  templateUrl: './bank-config.html',
  styleUrls: ['./bank-config.css'],
})
export class BankConfig implements OnInit {

  // ── DI via inject() ─────────────────────────────────────────────────────────
  private readonly fb                      = inject(FormBuilder);
  private readonly router                  = inject(Router);
  private readonly _commonService          = inject(CommonService);
  private readonly datepipe                = inject(DatePipe);
  private readonly _accountingMasterSvc    = inject(AccountsConfig);
  private readonly destroyRef              = inject(DestroyRef);
  private readonly cdr                     = inject(ChangeDetectorRef);

  // ── viewChild signal (replaces @ViewChild + setter) ─────────────────────────
  private readonly addressRef = viewChild(Address);

  // ── Signals (replaces plain mutable properties) ──────────────────────────────
  loading            = signal(false);
  buttonName         = signal('Save');
  disableSaveButton  = signal(false);
  disable            = signal(false);

  // Section-open toggles
  isBranchOpen       = signal(false);
  isDebitCardOpen    = signal(false);
  isUpiOpen          = signal(false);
  bankOpen           = signal(false);

  // Visibility flags (driven by checkbox state)
  debitCardHideShow  = signal(false);
  bankUpiHideShow    = signal(false);
  debitCardDetails   = signal(false);
  bankUpiDetails     = signal(false);
  bankSetup          = signal(false);

  // Computed: is this an edit operation?
  buttonType         = signal<string>('new');
  isEditMode         = computed(() => this.buttonType() === 'edit');

  // ── Non-signal state (simple, non-reactive values) ───────────────────────────
  AdresssDetailsForm: any;
  bankname: any;
  upiname: any[]          = [];
  banksList: any[]        = [];
  gridData: any[]         = [];
  datatobind: any;
  editdata: any;
  bankdetails: any;
  bankmastervalidations: any = {};
  upisetup: any           = {};
  date: Date              = new Date();
  todate                  = false;
  submitted               = false;
  cardno                  = false;
  accountnoFlag           = false;

  get f(): any {
    return this.bankmasterform?.controls ?? {};
  }

  accountno(): boolean {
    return this.accountnoFlag;
  }

  readonly accountTypes = [
    { value: 'SAVING', label: 'Saving' },
    { value: 'CURRENT', label: 'Current' },
  ];

  // ── Datepicker configs ───────────────────────────────────────────────────────
  readonly minMode: BsDatepickerViewMode = 'month';
  currentdate: Partial<BsDatepickerConfig> = new BsDatepickerConfig();
  dpConfig: Partial<BsDatepickerConfig>    = {
    containerClass: 'theme-dark-blue',
    dateInputFormat: 'MM/YYYY',
    maxDate: new Date(),
    showWeekNumbers: false,
    minMode: 'month',
  };
  ddpConfig: Partial<BsDatepickerConfig>   = {
    containerClass: 'theme-dark-blue',
    dateInputFormat: 'MM/YYYY',
    minDate: new Date(),
    showWeekNumbers: false,
    minMode: 'month',
  };

  // ── Typed FormGroup ──────────────────────────────────────────────────────────
  bankmasterform!: FormGroup<any>;

  // ── effect: populate AddressComponent once it mounts in edit mode ─────────
  constructor() {
    effect(() => {
      const comp = this.addressRef();
      const data = this.datatobind;
      if (
        comp &&
        data?.[0]?.lstBankInformationAddressDTO?.length &&
        this.isBranchOpen()
      ) {
        comp.editdata(data[0].lstBankInformationAddressDTO, 'Bank');
      }
    });
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.bankUpiHideShow.set(false);
    this.debitCardHideShow.set(false);
    this.buildForm();
    this.configureDatepicker();
    this.loadDropdownData();
    this.checkEditMode();
  }

  forceCD(): void {
    this.cdr.detectChanges();
  }

  compareByValue(a: any, b: any): boolean {
    return a === b;
  }

  // ── Form Construction ────────────────────────────────────────────────────────
  private buildForm(): void {
    this.bankmasterform = this.fb.group({
      modeOfReceipt:          [null as string | null],
      bankDetailsType:        [null as string | null],
      bankType:               ['', Validators.required],
      pCreatedby:             [this._commonService.getCreatedBy()],
      pBankdate:              [null as Date | null],
      pAcctountype:           [null, Validators.required],
      pBankID:                [''],
      bankName:               [null, Validators.required],
      pBankbranch:            [''],
      pAccountnumber:         ['', [Validators.required, Validators.pattern('^[0-9]{9,18}$')]],
      pIfsccode:              [''],
      account_name:           ['', Validators.required],
      pOverdraft:             ['', [Validators.pattern(/^\d*(\.\d{0,2})?$/)]],
      pOpeningBalance:        [''],
      pOpeningBalanceType:    ['', Validators.required],
      pRecordid:              ['0'],
      pStatusname:            ['Active'],
      ptypeofoperation:       ['CREATE'],
      // Debit card — validators added dynamically when section opens
      pCardNo:                [''],
      pIsdebitcardapplicable: [false],
      pCardName:              [''],
      pValidfrom:             [null as Date | null],
      pValidto:               [null as Date | null],
      // UPI — validators added dynamically when switch is ON
      pUpiid:                 [''],
      upiname:                ['',Validators.required],
      // upiname:                [''],
      popeningjvno:           [''],
      pIsupiapplicable:       [false],
      // Address fields (validation done manually via AddressComponent)
      pAddress1:              [''],
      pAddress2:              [''],
      pCity:                  [''],
      pState:                 [''],
      pDistrict:              [''],
      pPincode:               [''],
      pCountry:               [''],
      lstBankdebitcarddtlsDTO: this.fb.array([]),
      lstBankUPI:              [[] as any[]],
      branchSchema:            [this._commonService.getschemaname()],
      pipaddress:              [this._commonService.getIpAddress()],
      lstBankInformationAddressDTO: this.fb.array([]),
      isprimary:              [false],
      isformanbank:           [false],
      isforemanpaymentbank:   [false],
      isintrestpaymentbank:   [false],
    } as any);

    this.bankmasterform.controls['pBankdate'].setValue(this.date as any);
    this.bankmasterform.controls['pOpeningBalanceType'].setValue('D');
    this.BlurEventAllControll(this.bankmasterform);
  }

  private configureDatepicker(): void {
    this.currentdate = {
      maxDate: new Date(),
      containerClass: 'theme-dark-blue',
      dateInputFormat: 'DD-MMM-YYYY',
      showWeekNumbers: false,
    };
  }

  // ── Remote data loading ──────────────────────────────────────────────────────
  private loadDropdownData(): void {
    this._accountingMasterSvc
      .GetBankUPIDetails(
        this._commonService.getschemaname(),
        this._commonService.getBranchCode(),
        this._commonService.getCompanyCode()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => (this.upiname = res),
        error: () => alert('Failed to load UPI details'),
      });

    this._accountingMasterSvc
      .GetGlobalBanks(this._commonService.getschemaname())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => (this.banksList = res),
        error: () => alert('Failed to load banks list'),
      });
  }

  // ── Edit mode initialisation ─────────────────────────────────────────────────
  private checkEditMode(): void {
    debugger;
    const type = this._accountingMasterSvc.newstatus();
    this.buttonType.set(type);

    if (type !== 'edit') return;

    this.editdata    = this._accountingMasterSvc.editbankdetails();
    this.bankdetails = this._accountingMasterSvc.editbankdetails1();
    this.loading.set(true);

    this._accountingMasterSvc
      .viewbank(
        this.editdata,
        this._commonService.getschemaname(),
        this._commonService.getbranchname(),
        this._commonService.getCompanyCode(),
        this._commonService.getBranchCode()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: any) => {
        this.datatobind = data;
        this.buttonName.set('Update');
        this.disable.set(true);
        this.loading.set(false);
        this.populateFormForEdit();
      });
  }

  private populateFormForEdit(): void {
    debugger;
    const d    = this.datatobind[0];
    const det  = this.bankdetails;
    const form = this.bankmasterform;
    console.log("d",d);
    console.log("det",det); 
    console.log("from",form);
    
    

    // Bank date
    form.controls['pBankdate'].setValue(
      this._commonService.getDateObjectFromDataBase(d.pBankdate)
    );

    // Bank type → dropdown
    const bankTypeMap: Record<string, string> = {
      isprimary:              'primary',
      isformanbank:           'foreman',
      isforemanpaymentbank:   'foremanpayment',
      is_interest_payment_bank: 'interest',
    };
    const matchedType = Object.entries(bankTypeMap).find(([key]) => det[key]);
    form.controls['bankType'].setValue(matchedType ? matchedType[1] : '');

    form.patchValue({
      isprimary:           !!det.isprimary,
      isformanbank:        !!det.isformanbank,
      isforemanpaymentbank:!!det.is_foreman_payment_bank,
      isintrestpaymentbank:!!det.is_interest_payment_bank,
    });
    this.bankSetup.set(!!form.controls['bankType'].value);

    // Basic bank fields
    form.patchValue({
      bankName:         d.pBankname,
      pBankbranch:      d.pBankbranch,
      pRecordid:        d.pRecordid,
      pAccountnumber:   d.pAccountnumber || '',
      pIfsccode:        d.pIfsccode,
      account_name:     d.pAccountname,
      // account_name:     d.pAccountnumber,
      ptypeofoperation: 'UPDATE',
      pOverdraft:       d.pOverdraft ? d.pOverdraft.toFixed(2) : '',
      pAcctountype:     d.pAcctountype,
      pOpeningBalance:  this._commonService.currencyformat(d.pOpeningBalance),
      popeningjvno:     d.popeningjvno,
      pOpeningBalanceType: d.pOpeningBalanceType || 'D',
    });

    // UPI section
    if (d.pIsupiapplicable) {
      form.controls['pIsupiapplicable'].setValue(true);
      this.isUpiOpen.set(true);
      this.bankUpiHideShow.set(true);
      this.bankUpiDetails.set(true);
      this.gridData = d.lstBankUPI;
      this.upivalidation('GET');
    }

    // Debit card section
    if (d.pIsdebitcardapplicable) {
      form.controls['pIsdebitcardapplicable'].setValue(true);
      this.isDebitCardOpen.set(true);
      this.debitCardHideShow.set(true);
      this.debitCardDetails.set(true);
      this.applyDebitCardValidators();

      const card = d.lstBankdebitcarddtlsDTO?.[0];
      if (card) {
        form.patchValue({
          pCardNo:    card.debitcard_number || '',
          pCardName:  card.debitcard_name   || '',
          pValidfrom: this._commonService.getDateObjectFromDataBase(card.valid_from_date),
          pValidto:   this._commonService.getDateObjectFromDataBase(card.valid_to_date),
        });
      }
    }

    // Address section — effect() handles calling editdata() on AddressComponent
    if (d.lstBankInformationAddressDTO?.length > 0) {
      this.isBranchOpen.set(true);
      // effect() in constructor() watches addressRef() + datatobind + isBranchOpen
      // and calls addressRef().editdata() automatically when all three are ready
    }
  }

  // ── Calendar helper ──────────────────────────────────────────────────────────
  onOpenCalendar(container: any): void {
    container.monthSelectHandler = (event: any): void => {
      container._store.dispatch(container._actions.select(event.date));
    };
    container.setViewMode('month');
  }

  // ── Input helpers ────────────────────────────────────────────────────────────
  blockNonLettersPaste(event: ClipboardEvent): void {
    const paste = event.clipboardData?.getData('text') || '';
    if (!/^[a-zA-Z ]*$/.test(paste)) event.preventDefault();
  }

  lettersOnly(event: any): void {
    event.target.value = event.target.value.replace(/[^a-zA-Z ]/g, '');
  }
//it working but nam e and accont number not coming together in account name
  // allowNumbersOnly1(event: any): void {
  //   event.target.value = event.target.value.replace(/[^0-9]/g, '');
  //   const accountNumber = event.target.value;
  //   this.bankmasterform.get('pAccountnumber')?.setValue(accountNumber);

  //   const bankName = this.bankmasterform.get('bankName')?.value || '';
  //   if (bankName) {
  //     this.bankmasterform.get('account_name')?.setValue(`${accountNumber}@${bankName}`);
  //   }
  // }

allowNumbersOnly1(event: any) {
  event.target.value = event.target.value.replace(/[^0-9]/g, '');
  const accountNumber = event.target.value;
  this.bankmasterform.get('pAccountnumber')?.setValue(accountNumber);

  // ✅ bankName@accountNumber
  const bankName = this.bankname || this.bankmasterform.get('bankName')?.value || '';
  if (bankName && accountNumber) {
    this.bankmasterform.get('account_name')?.setValue(`${bankName}@${accountNumber}`);
  } else if (bankName) {
    this.bankmasterform.get('account_name')?.setValue(bankName);
  }
}
//woking


//   allowNumbersOnly1(event: any) {
//   event.target.value = event.target.value.replace(/[^0-9]/g, '');
//   const accountNumber = event.target.value;
//   this.bankmasterform.get('pAccountnumber')?.setValue(accountNumber);

//   // ✅ bankName@accountNumber
//   const bankName = this.bankname || this.bankmasterform.get('bankName')?.value || '';
//   if (bankName && accountNumber) {
//     this.bankmasterform.get('account_name')?.setValue(`${bankName}@${accountNumber}`);
//   } else if (bankName) {
//     this.bankmasterform.get('account_name')?.setValue(bankName);
//   }
// }



  allowNumbersOnly(event: KeyboardEvent): void {
    const charCode = event.which || event.keyCode;
    const input    = event.target as HTMLInputElement;
    const allowed  = [8, 9, 37, 39, 46];

    if ((charCode < 48 || charCode > 57) && !allowed.includes(charCode)) {
      event.preventDefault();
    }
    if (charCode === 46 && input.value.includes('.')) event.preventDefault();
  }

  blockNonNumericPaste(event: ClipboardEvent): void {
    const paste = event.clipboardData?.getData('text') || '';
    if (!/^\d*\.?\d*$/.test(paste)) event.preventDefault();
  }

  convertTitleCase(controlName: string): void {
    const control = this.bankmasterform.get(controlName);
    const value   = control?.value as string;
    if (value) {
      const titleCase = value
        .toLowerCase()
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      control?.setValue(titleCase);
    }
  }

  onInputChange(event: Event, controlName: string): void {
    const input      = event.target as HTMLInputElement;
    const cleanValue = input.value.replace(/₹|,/g, '');

    if ((cleanValue.match(/\./g) || []).length > 1) return;
    if (!/^\d*\.?\d{0,2}$/.test(cleanValue)) return;

    const parts    = cleanValue.split('.');
    parts[0]       = parts[0] ? Number(parts[0]).toLocaleString('en-IN') : '';
    input.value    = parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];

    this.bankmasterform.get(controlName)?.setValue(cleanValue, { emitEvent: false });
  }

  onInputBlur(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/₹|,/g, '');

    if (!value) {
      this.bankmasterform.get(controlName)?.setValue('');
      return;
    }

    const num = parseFloat(value);
    if (!isNaN(num)) {
      input.value = num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      this.bankmasterform.get(controlName)?.setValue(num.toFixed(2), { emitEvent: false });
    }
  }

  onSimpleInput(event: Event, controlName: string): void {
    const input  = event.target as HTMLInputElement;
    let value    = input.value.replace(/[^0-9.]/g, '');
    const parts  = value.split('.');

    if (parts.length > 2)            value = `${parts[0]}.${parts[1]}`;
    if (parts[1]?.length > 2)        value = `${parts[0]}.${parts[1].substring(0, 2)}`;

    input.value = value;
    this.bankmasterform.get(controlName)?.setValue(value, { emitEvent: false });
  }

  onCleanInput(event: Event, controlName: string): void {
    this.onSimpleInput(event, controlName);
  }

  onIfscInput(): void {
    const control = this.bankmasterform.get('pIfsccode');
    if (control?.value) {
      const clean = (control.value as string)
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();
      control.setValue(clean, { emitEvent: false });
    }
  }

  // ── Bank name change ─────────────────────────────────────────────────────────
  // onChange(event: any): void {
  //   this.bankname = event.bankName;
  //   const bankid  = event.bankId;
  //   const accountNumber = this.bankmasterform.get('pAccountnumber')?.value || '';

  //   this.bankmasterform.get('account_name')?.setValue(
  //     accountNumber ? `${this.bankname}@${accountNumber}` : `${this.bankname}@`
  //   );
  //   this.bankmasterform.get('pBankID')?.setValue(bankid);
  // }


  onChange(event: any) {
  // 👉 When cleared
  if (!event) {
    this.bankname = null;
    this.bankmasterform.get('account_name')?.setValue('');
    this.bankmasterform.get('pBankID')?.setValue(null);
    return;
  }

  // 👉 Normal selection
  this.bankname = event.bankName;
  let bankid = event.bankId;

  const accountNumber = this.bankmasterform.get('pAccountnumber')?.value || '';

  const accountNameValue = accountNumber
    ? `${this.bankname}@${accountNumber}`
    : this.bankname;

  this.bankmasterform.get('account_name')?.setValue(accountNameValue);
  this.bankmasterform.get('pBankID')?.setValue(bankid);
}
//working but small iosyue
//   onChange(event: any) {
//   this.bankname = event.bankName;
//   let bankid = event.bankId;

//   const accountNumber = this.bankmasterform.get('pAccountnumber')?.value || '';

//   // ✅ Only set account_name if accountNumber exists, else just bankName
//   const accountNameValue = accountNumber
//     ? `${this.bankname}@${accountNumber}`
//     : this.bankname;

//   this.bankmasterform.get('account_name')?.setValue(accountNameValue);
//   this.bankmasterform.get('pBankID')?.setValue(bankid);
// }
//woking
//   onChange(event: any) {
//   this.bankname = event.bankName;
//   let bankid = event.bankId;

//   const accountNumber = this.bankmasterform.get('pAccountnumber')?.value || '';

//   // ✅ Only set account_name if accountNumber exists, else just bankName
//   const accountNameValue = accountNumber
//     ? `${this.bankname}@${accountNumber}`
//     : this.bankname;

//   this.bankmasterform.get('account_name')?.setValue(accountNameValue);
//   this.bankmasterform.get('pBankID')?.setValue(bankid);
// }



  // ── UPI grid ─────────────────────────────────────────────────────────────────
  addtogrid(): void {
    this.submitted = true;
    if (!this.validateupi()) return;

    this.gridData = [
      ...this.gridData,
      {
        pUpiid:          this.bankmasterform.value.pUpiid,
        pUpiname:        this.bankmasterform.value.upiname,
        pCreatedby:      this.bankmasterform.value.pCreatedby,
        pStatusname:     this.bankmasterform.value.pIsupiapplicable,
        ptypeofoperation:'CREATE',
      },
    ];

    this.bankmasterform.patchValue({ pUpiid: '', upiname: '' });
    this.submitted = false;
    this.bankmastervalidations['pUpiid']  = '';
    this.bankmastervalidations['upiname'] = '';
  }

  validateupi(): boolean {
    const pUpiid  = this.bankmasterform.value.pUpiid;
    const upiname = this.bankmasterform.value.upiname;

    if (!pUpiid || !upiname) {
      this._commonService.showWarningMessage('Both UPI ID and UPI Link must be provided.');
      return false;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9]+$/.test(pUpiid as string)) {
      this._commonService.showWarningMessage('Please enter a valid UPI ID (example: john.doe@sbi).');
      return false;
    }
    return true;
  }

  removeHandler(_row: any, rowIndex: number): void {
    this.gridData = this.gridData.filter((_, i) => i !== rowIndex);
  }

  // ── Validator helpers ────────────────────────────────────────────────────────
  private clearFieldValidators(fields: string[]): void {
    fields.forEach(field => {
      const ctrl = this.bankmasterform.get(field);
      ctrl?.clearValidators();
      ctrl?.setErrors(null);
      ctrl?.updateValueAndValidity();
    });
  }

  private applyDebitCardValidators(): void {
    this.bankmasterform.get('pCardNo')?.setValidators([
      Validators.required,
      Validators.minLength(16),
      Validators.maxLength(16),
      Validators.pattern('^[0-9]+$'),
    ]);
    this.bankmasterform.get('pCardName')?.setValidators([Validators.required]);
    this.bankmasterform.get('pValidfrom')?.setValidators([Validators.required]);
    this.bankmasterform.get('pValidto')?.setValidators([Validators.required]);
    ['pCardNo', 'pCardName', 'pValidfrom', 'pValidto'].forEach(f =>
      this.bankmasterform.get(f)?.updateValueAndValidity()
    );
  }

  upivalidation(type: 'GET' | 'SET' | string): void {
    const pUpiid  = this.bankmasterform.controls['pUpiid'];
    const upiname = this.bankmasterform.controls['upiname'];

    if (type === 'GET') {
      pUpiid.setValidators(Validators.required);
      upiname.setValidators(Validators.required);
    } else {
      pUpiid.clearValidators();
      upiname.clearValidators();
    }
    pUpiid.updateValueAndValidity();
    upiname.updateValueAndValidity();
  }

  debitcardvalidation(type: 'GET' | 'SET' | string): void {
    const pCardNo   = this.bankmasterform.controls['pCardNo'];
    const pCardName = this.bankmasterform.controls['pCardName'];

    if (type === 'GET') {
      pCardNo.setValidators(Validators.required);
      pCardName.setValidators(Validators.required);
    } else {
      pCardNo.setErrors(null);   pCardNo.clearValidators();
      pCardName.setErrors(null); pCardName.clearValidators();
    }
    pCardNo.updateValueAndValidity();
    pCardName.updateValueAndValidity();
  }

  validateopeningbalancetype(type: 'GET' | 'SET' | string): void {
    const ctrl = this.bankmasterform.controls['pOpeningBalanceType'];
    type === 'GET'
      ? ctrl.setValidators(Validators.required)
      : ctrl.clearValidators();
    ctrl.updateValueAndValidity();
  }

  validatedatepicker(): boolean {
    const fromValue = this.bankmasterform.get('pValidfrom')?.value;
    const toValue   = this.bankmasterform.get('pValidto')?.value;

    if (!fromValue || !toValue) { this.todate = true; return false; }

    const from = new Date(fromValue as any);
    const to   = new Date(toValue as any);

    this.todate = from > to;
    return !this.todate;
  }

  // ── Section toggles ──────────────────────────────────────────────────────────
  toggleBranch(): void {
    this.isBranchOpen.update(v => !v);
    this.clearFieldValidators(['pAddress1', 'pCountry', 'pState', 'pDistrict']);
  }

  toggleDebitCard(): void {
    this.isDebitCardOpen.update(v => !v);

    if (this.isDebitCardOpen()) {
      this.applyDebitCardValidators();
    } else {
      ['pCardNo', 'pCardName', 'pValidfrom', 'pValidto'].forEach(f => {
        this.bankmasterform.get(f)?.clearValidators();
        this.bankmasterform.get(f)?.reset();
        this.bankmasterform.get(f)?.setErrors(null);
        this.bankmasterform.get(f)?.updateValueAndValidity();
      });
      this.debitCardHideShow.set(false);
      this.debitCardDetails.set(false);
    }
  }

  toggleUpi(): void {
    this.isUpiOpen.update(v => !v);

    if (this.isUpiOpen()) {
      if (this.bankUpiHideShow()) this.upivalidation('GET');
    } else {
      this.upivalidation('SET');
      this.bankUpiHideShow.set(false);
      this.bankUpiDetails.set(false);
      this.bankmasterform.get('pUpiid')?.reset();
      this.bankmasterform.get('upiname')?.reset();
    }
  }

  toggleBank(): void {
    this.bankOpen.update(v => !v);
  }

  // ── Checkbox handlers ─────────────────────────────────────────────────────────
  bankdebitcardchecked(event: Event): void {
    this.bankmastervalidations = {};
    const checked = (event.target as HTMLInputElement).checked;

    this.debitCardDetails.set(checked);
    this.debitCardHideShow.set(checked);
    this.debitcardvalidation(checked ? 'GET' : 'SET');
  }

  bankupichecked(event: Event): void {
    this.bankmastervalidations = {};
    const checked = (event.target as HTMLInputElement).checked;

    this.bankUpiDetails.set(checked);
    this.bankUpiHideShow.set(checked);

    if (checked) {
      this.upivalidation('GET');
    } else {
      this.upivalidation('SET');
      this.bankmasterform.get('pUpiid')?.reset();
      this.bankmasterform.get('upiname')?.reset();
    }
  }

  // ── Bank type dropdown change ─────────────────────────────────────────────────
  bankchange(event: Event): void {
    const selectedType = (event.target as HTMLSelectElement).value;

    this.bankmasterform.patchValue({
      isprimary:           false,
      isformanbank:        false,
      isforemanpaymentbank:false,
      isintrestpaymentbank:false,
    });

    switch (selectedType) {
      case 'primary':       this.bankmasterform.controls['isprimary'].setValue(true);           break;
      case 'foreman':       this.bankmasterform.controls['isformanbank'].setValue(true);        break;
      case 'foremanpayment':this.bankmasterform.controls['isforemanpaymentbank'].setValue(true); break;
      case 'interest':      this.bankmasterform.controls['isintrestpaymentbank'].setValue(true); break;
    }

    this.bankSetup.set(!!selectedType);
  }

  // ── Validation helpers (inherited pattern) ────────────────────────────────────
  cardno_change():  void { this.bankmastervalidations['pCardNo']   = ''; }
  name_change():    void { this.bankmastervalidations['pCardName'] = ''; }
  getapi():         any  { return this.upisetup; }

  checkValidations(group: FormGroup, isValid: boolean): boolean {
    try {
      Object.keys(group.controls).forEach(key => {
        isValid = this.GetValidationByControl(group, key, isValid);
      });
    } catch (e: any) {
      this._commonService.showErrorMessage(e);
      return false;
    }
    return isValid;
  }

  GetValidationByControl(formGroup: FormGroup, key: string, isValid: boolean): boolean {
    try {
      const formcontrol = formGroup.get(key);
      if (!formcontrol) return isValid;

      if (formcontrol instanceof FormGroup) {
        this.checkValidations(formcontrol, isValid);
      } else if (formcontrol.validator) {
        this.bankmastervalidations[key] = '';
        if (formcontrol.errors || formcontrol.invalid || formcontrol.touched || formcontrol.dirty) {
          const el = document.getElementById(key);
          if (el) {
            const lablename = (el as HTMLInputElement).title;
            for (const errorkey in formcontrol.errors) {
              if (errorkey) {
                const msg = this._commonService.getValidationMessage(formcontrol, errorkey, lablename, key, '');
                this.bankmastervalidations[key] += msg + ' ';
                isValid = false;
              }
            }
          }
        }
      }
    } catch (e: any) {
      this._commonService.showErrorMessage(e);
    }
    return isValid;
  }

  BlurEventAllControll(fromgroup: FormGroup): void {
    try {
      Object.keys(fromgroup.controls).forEach(key => this.setBlurEvent(fromgroup, key));
    } catch (e: any) {
      this._commonService.showErrorMessage(e);
    }
  }

  setBlurEvent(fromgroup: FormGroup, key: string): void {
    try {
      const formcontrol = fromgroup.get(key);
      if (!formcontrol) return;

      if (formcontrol instanceof FormGroup) {
        this.BlurEventAllControll(formcontrol);
      } else if (formcontrol.validator) {
        formcontrol.valueChanges
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => this.GetValidationByControl(fromgroup, key, true));
      }
    } catch (e: any) {
      this._commonService.showErrorMessage(e);
    }
  }

  // ── Clear / Reset ─────────────────────────────────────────────────────────────
  clear(): void {
    this.disable.set(false);
    this.cardno      = false;
    this.accountnoFlag = false;
    this.buttonName.set('Save');
    this.buttonType.set('new');
    this._accountingMasterSvc.newformstatus('new');

    const currentDate = this.date;
    this.bankmasterform.reset();
    this.bankmasterform.controls['pBankdate'].setValue(currentDate as any);

    this.debitCardDetails.set(false);
    this.bankUpiDetails.set(false);
    this.gridData            = [];
    this.bankmastervalidations = {};
    this.datatobind          = [];
    this.isBranchOpen.set(false);

    this.addressRef()?.clear();
  }

  // ── Save ──────────────────────────────────────────────────────────────────────
  save(): void {
    debugger;
    this.bankmasterform.markAllAsTouched();

    // Clear address fields from bankmasterform — managed by AddressComponent
    this.clearFieldValidators(['pAddress1', 'pState', 'pDistrict', 'pCountry']);

    // Clear UPI validators if grid has data or section is closed
    if (this.gridData.length > 0 || !this.isUpiOpen()) {
      this.clearFieldValidators(['pUpiid', 'upiname']);
    }

    // STEP 1: Branch address validation
    if (this.isBranchOpen()) {
      const addrComp = this.addressRef();
      if (addrComp) {
        this.AdresssDetailsForm = addrComp.addressForm.value;
        const { paddress1, pCountry, pState, pDistrict } = this.AdresssDetailsForm || {};
        if (!paddress1 || !pCountry || !pState || !pDistrict) {
          this._commonService.showWarningMessage(
            'Branch Address: Address Line 1, Country, State and District are required.'
          );
          return;
        }
      }
    } else {
      this.AdresssDetailsForm = this.addressRef()?.addressForm.value ?? {};
    }

    // STEP 2: Main form validation
    if (!this.bankmasterform.valid) {
      this._commonService.showWarningMessage('Please fill all required fields correctly');
      return;
    }

    // STEP 3: Exactly one bank setup must be selected
    const f = this.bankmasterform.value;
    const bankSetupCount = [
      f.isprimary,
      f.isforemanpaymentbank,
      f.isformanbank,
      f.isintrestpaymentbank,
    ].filter(Boolean).length;

    if (bankSetupCount !== 1) {
      this._commonService.showWarningMessage('Select exactly one Bank Setup');
      return;
    }

    const actionLabel = this.isEditMode() ? 'Update' : 'Save';
    if (!confirm(`Do You Want to ${actionLabel}?`)) return;

    // STEP 4: Build payload
    const selectedBank = this.banksList.find((ele: any) => ele.bankName === f.bankName);

    const payload = {
      branchcode:           String(this._commonService.getBranchCode()  || ''),
      companycode:          String(this._commonService.getCompanyCode() || ''),
      globalSchema:         String(this._commonService.getschemaname()  || ''),
      pChequeGenerateDate:  this.datepipe.transform(new Date(), 'yyyy-MM-dd'),
      branchSchema:         String(this._commonService.getbranchname()  || ''),
      pipaddress:           '192.168.2.177',
      pCreatedby:           1,
      pBankdate:            this.datepipe.transform(f.pBankdate as any, 'yyyy-MM-dd'),
      pAcctountype:         String(f.pAcctountype  || ''),
      pBankID:              Number(selectedBank?.bankId || 0),
      pBankname:            String(f.bankName       || ''),
      pBankbranch:          String(f.pBankbranch    || ''),
      pAccountnumber:       String(f.pAccountnumber || ''),
      pIfsccode:            String(f.pIfsccode      || ''),
      pAccountname:         String(f.account_name   || ''),
      pOverdraft:           parseFloat(f.pOverdraft as string)       || 0,
      pOpeningBalance:      parseFloat(f.pOpeningBalance as string)  || 0,
      pOpeningBalanceType:  String(f.pOpeningBalanceType || ''),
      pRecordid:            Number(f.pRecordid || 0),
      pStatusname:          'Active',
      ptypeofoperation:     this.isEditMode() ? 'UPDATE' : 'CREATE',
      pIsdebitcardapplicable: !!f.pIsdebitcardapplicable,
      pIsupiapplicable:       !!f.pIsupiapplicable,
      popeningjvno:         String(f.popeningjvno || ''),
      isprimary:            !!f.isprimary,
      isformanbank:         !!f.isformanbank,
      isforemanpaymentbank: !!f.isforemanpaymentbank,
      isintrestpaymentbank: !!f.isintrestpaymentbank,
      pChqegeneratestatus:  '',
      pSwiftccode:          '',
      pAccountid:           '',
      pbranchid:            '',

      lstBankInformationAddressDTO: this.isBranchOpen() ? [{
        pAddress1:        String(this.AdresssDetailsForm?.paddress1  || ''),
        pAddress2:        String(this.AdresssDetailsForm?.paddress2  || ''),
        pCity:            String(this.AdresssDetailsForm?.pcity      || ''),
        pState:           String(this.AdresssDetailsForm?.pState     || ''),
        pDistrict:        String(this.AdresssDetailsForm?.pDistrict  || ''),
        pPincode:         String(this.AdresssDetailsForm?.Pincode    || ''),
        pCountry:         String(this.AdresssDetailsForm?.pCountry   || ''),
        pRecordid:        Number(this.AdresssDetailsForm?.pRecordid  || 0),
        pdistrictid:      Number(this.AdresssDetailsForm?.pDistrictId || 0),
        pStatusname:      'Active',
        ptypeofoperation: this.isEditMode() ? 'UPDATE' : 'CREATE',
        pCreatedby:       1,
        pAddressType:     'HEAD OFFICE',
        pBankId:          Number(selectedBank?.bankId || 0),
      }] : [],

      lstBankdebitcarddtlsDTO: f.pIsdebitcardapplicable ? [{
        pCardNo:          String(f.pCardNo   || ''),
        pCardName:        String(f.pCardName || ''),
        pValidfrom:       this.datepipe.transform(f.pValidfrom as any, 'yyyy-MM-dd'),
        pValidto:         this.datepipe.transform(f.pValidto   as any, 'yyyy-MM-dd'),
        pRecordid:        Number(this.datatobind?.[0]?.lstBankdebitcarddtlsDTO?.[0]?.pRecordid || 0),
        pStatusname:      'Active',
        ptypeofoperation: this.isEditMode() ? 'UPDATE' : 'CREATE',
        pCreatedby:       1,
        pBankId:          Number(selectedBank?.bankId || 0),
      }] : [],

      lstBankUPI: this.gridData.map((upi: any) => ({
        pUpiid:               String(upi.pUpiid  || ''),
        pUpiname:             String(upi.pUpiname || ''),
        pCreatedby:           1,
        ptypeofoperation:     String(upi.ptypeofoperation || 'CREATE'),
        pStatusname:          String(upi.ptypeofoperation || 'CREATE'),
        pRecordid:            Number(upi.pRecordid        || 0),
        pBankconfigurationId: Number(upi.pBankconfigurationId || 0),
      })),

      lstChequemanagementDTO: [],
      lstCheques:             [],
    };

    // STEP 5: Submit
    this.disableSaveButton.set(true);
    this.buttonName.set('Processing');
    const finalData = JSON.stringify(payload);

    this._accountingMasterSvc
      .GetCheckDuplicateDebitCardNo(finalData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => this.handleDuplicateCheckResponse(res, finalData),
        error: (err: any) => this.handleError(err),
      });
  }

  private handleDuplicateCheckResponse(res: any, finalData: string): void {
    // In both duplicate and non-duplicate cases, we proceed to save
    // (duplicate warning is shown by handleDuplicates when applicable)
    if (res.status !== 'B') {
      this.handleDuplicates(res);
    }

    this._accountingMasterSvc
      .savebankinformation(finalData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved: any) => {
          if (saved.success === true) {
            const msg = this.isEditMode() ? 'Updated Successfully' : 'Saved Successfully';
            this._commonService.showSuccessMsg(msg);
            this.router.navigate(['/dashboard/accounts/accounts-config/bank-config-view']);
          } else {
            this.disableSaveButton.set(false);
            this.buttonName.set('Save');
          }
        },
        error: (err: any) => this.handleError(err),
      });
  }

  handleDuplicates(res: any): void {
    if (!res || res.status === 'TRUE') return;

    if (res.bankAccountCount > 0) this._commonService.showWarningMessage('Bank Already Exists');
    if (res.debitCardCount   > 0) this._commonService.showWarningMessage('Debit Card Already Exists');
    if (res.upiCount         > 0) this._commonService.showWarningMessage('UPI Id Already Exists');

    this.disableSaveButton.set(false);
    this.buttonName.set('Save');
  }

  handleError(err: any): void {
    this._commonService.showErrorMessage(err);
    this.disableSaveButton.set(false);
    this.buttonName.set('Save');
  }

  // ── FormArray builders (kept for backward compatibility with save logic) ──────
  private Bankdebitcarddtls(): FormGroup {
    return this.fb.group({
      pCardNo:          [''],
      pCardName:        [''],
      pValidfrom:       [''],
      pValidto:         [''],
      pRecordid:        [''],
      pStatusname:      ['Active'],
      ptypeofoperation: ['CREATE'],
      pCreatedby:       [this._commonService.getCreatedBy()],
    });
  }

  private BankInformationAddress(): FormGroup {
    return this.fb.group({
      pAddress1: [''], pAddress2: [''], pCity:     [''],
      pState:    [''], pDistrict: [''], pPincode:  [''],
      pCountry:  [''], pRecordid: [''],
    });
  }
}