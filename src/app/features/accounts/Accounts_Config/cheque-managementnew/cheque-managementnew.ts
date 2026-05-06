// import {
//   Component,
//   OnInit,
//   inject,
//   signal,
//   computed,
//   effect,
//   DestroyRef,
// } from '@angular/core';
// import {
//   FormBuilder,
//   FormGroup,
//   ReactiveFormsModule,
//   Validators,
//   AbstractControl,
// } from '@angular/forms';
// import { Router, RouterModule } from '@angular/router';
// import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
// import { CommonModule, DatePipe } from '@angular/common';
// import { TableModule } from 'primeng/table';
// import { ButtonModule } from 'primeng/button';
// import { NgSelectModule } from '@ng-select/ng-select';

// import { CommonService } from '../../../../core/services/Common/common.service';
// import { AccountsConfig } from '../../../../core/services/accounts/accounts-config';
// import { DatePickerModule } from 'primeng/datepicker';


// // ─── Interfaces ───────────────────────────────────────────────────────────────

// export interface BankDetail {
//   bankName: string;
//   bankAccountId: number | string;
// }

// export interface ChequeGridRow {
//   pBankId: number | string;
//   bankName: string;
//   pNoofcheques: number;
//   pChequefrom: number;
//   pChequeto: number;
//   pStatusname: boolean;
//   ptypeofoperation: string;
//   branchSchema?: string;
//   pipaddress?: string;
//   pCreatedby?: any;
// }

// export interface SavePayload {
//   branchSchema: string;
//   company_code: string;
//   branch_code: string;
//   branch_id: number;
//   pBankId: number;
//   pNoofcheques: number;
//   pChequefrom: number;
//   pChequeto: number;
//   cheque_book_id: number;
//   pChqegeneratestatus: boolean;
//   pChequeGenerateDate: Date;
//   pCreatedby: any;
//   pipaddress: string;
//   ptypeofoperation: string;
// }

// export type SaveType = 'Active' | 'InActive';

// // ─── Component ────────────────────────────────────────────────────────────────

// @Component({
//   selector: 'app-cheque-managementnew',
//   standalone: true,
//   imports: [
//     CommonModule,
//     ReactiveFormsModule,
//     DatePickerModule,
//     TableModule,
//     ButtonModule,
//     NgSelectModule,
//     RouterModule,
//   ],
//   templateUrl: './cheque-managementnew.html',
//   styleUrl: './cheque-managementnew.css',
//   providers: [DatePipe],
// })
// export class ChequeManagementnew implements OnInit {
//   pDatepickerMaxDate: Date = new Date();


//   // ─── Angular 21: inject() instead of constructor injection ─────────────────
//   private readonly fb             = inject(FormBuilder);
//   private readonly router         = inject(Router);
//   private readonly destroyRef     = inject(DestroyRef);
//   private readonly commonService  = inject(CommonService);
//   private readonly datepipe       = inject(DatePipe);
//   private readonly accountingMasterService = inject(AccountsConfig);

//   // ─── Datepicker Config ───────────────────────────────────────────────────────
//   readonly currentdate: any = {
//     maxDate: new Date(),
//     containerClass: 'theme-dark-blue',
//     dateInputFormat: 'DD-MM-YYYY',
//     showWeekNumbers: false,
//   };

//   // ─── Form ────────────────────────────────────────────────────────────────────
//   chequemanagementform!: FormGroup;

//   // ─── Angular 21: Signals for reactive state ──────────────────────────────────
//   readonly bankdetails     = signal<BankDetail[]>([]);
//   readonly gridData        = signal<ChequeGridRow[]>([]);
//   readonly isLoadingBanks  = signal(false);
//   readonly disablesavebutton       = signal(false);
//   readonly disablesaveactivebutton = signal(false);
//   readonly buttonname              = signal('Save');
//   readonly buttonnameactive        = signal('Save & Generate');

//   // ─── Private state signals ───────────────────────────────────────────────────
//   private readonly _recordid    = signal<number | string>('');
//   private readonly _selectedbank = signal('');
//   private readonly _noofcheque  = signal(0);

//   // ─── Computed signals ────────────────────────────────────────────────────────
//   readonly hasGridData = computed(() => this.gridData().length > 0);
//   readonly gridRowCount = computed(() => this.gridData().length);

//   // ─── Validation messages ─────────────────────────────────────────────────────
//   chequemanagementvalidations: Record<string, string> = {};

//   // ─── Static date ─────────────────────────────────────────────────────────────
//   readonly today = new Date();

//   // ─── ngOnInit ────────────────────────────────────────────────────────────────
//   ngOnInit(): void {
//     this.initForm();
//     this.subscribeToFieldChanges();
//     this.loadBankDetails();

//     // Angular 21: effect() to react to gridData changes
//     effect(() => {
//       const count = this.gridData().length;
//       if (count === 0) {
//         this.chequemanagementvalidations = {};
//       }
//     }, { allowSignalWrites: true });
//   }

//   // ─── Form Initialization ─────────────────────────────────────────────────────
//   private initForm(): void {
//     this.chequemanagementform = this.fb.group({
//       pBankId:              [''],
//       bankName:             [null, Validators.required],
//       pBankdate:            [new Date()],
//       pNoofcheques:         ['', [Validators.required, Validators.min(1), Validators.max(999)]],
//       pChequefrom:          ['', [Validators.required, Validators.minLength(1)]],
//       pChequeto:            ['', Validators.required],
//       pChqegeneratestatus:  [false],
//       pStatusname:          ['Active'],
//       ptypeofoperation:     ['CREATE'],
//       pCreatedby:           [this.commonService.getCreatedBy()],
//       branchSchema:         [this.commonService.getschemaname()],
//       pipaddress:           [this.commonService.getIpAddress()],
//       pChequeGenerateDate:  [{ value: new Date(), disabled: true }],
//     });
//   }

//   // ─── Subscribe to field value changes for live validation ────────────────────
//   private subscribeToFieldChanges(): void {
//     Object.keys(this.chequemanagementform.controls).forEach((key) => {
//       const ctrl = this.chequemanagementform.get(key);
//       if (ctrl && !(ctrl instanceof FormGroup) && ctrl.validator) {
//         ctrl.valueChanges
//           .pipe(takeUntilDestroyed(this.destroyRef))   // Angular 21: no manual destroy$
//           .subscribe(() => this.updateValidationMessage(key));
//       }
//     });
//   }

//   // ─── Load Bank Details ───────────────────────────────────────────────────────
//   private loadBankDetails(): void {
//     this.isLoadingBanks.set(true);
//     this.accountingMasterService
//       .GetBankNames(
//         this.commonService.getschemaname(),
//         this.commonService.getbranchname(),
//         this.commonService.getCompanyCode(),
//         this.commonService.getBranchCode()
//       )
//       .pipe(takeUntilDestroyed(this.destroyRef))
//       .subscribe({
//         next: (res: BankDetail[]) => {
//           this.bankdetails.set(res ?? []);
//           this.isLoadingBanks.set(false);
//         },
//         error: (err: unknown) => {
//           this.isLoadingBanks.set(false);
//           this.commonService.showErrorMessage(err);
//         },
//       });
//   }

//   // ─── Template Getters (AbstractControl shortcuts) ───────────────────────────
//   get bankNameCtrl(): AbstractControl {
//     return this.chequemanagementform.controls['bankName'];
//   }

//   get noofchequesCtrl(): AbstractControl {
//     return this.chequemanagementform.controls['pNoofcheques'];
//   }

//   get chequefromCtrl(): AbstractControl {
//     return this.chequemanagementform.controls['pChequefrom'];
//   }

//   get chequetoCtrl(): AbstractControl {
//     return this.chequemanagementform.controls['pChequeto'];
//   }

//   // ─── Bank Selection ──────────────────────────────────────────────────────────
//   onBankChange(selectedBankName:any): void {
//     if (!selectedBankName) {
//       this._recordid.set('');
//       this._selectedbank.set('');
//       this.chequemanagementform.controls['pBankId'].setValue('');
//       return;
//     }

//     const selectedBank = this.bankdetails().find(
//       (bank) => bank.bankName === selectedBankName.bankName
//     );

//     if (!selectedBank) {
//       this._recordid.set('');
//       this._selectedbank.set(selectedBankName.bankName);
//       this.chequemanagementform.controls['pBankId'].setValue('');
//       return;
//     }

//     this._recordid.set(selectedBank.bankAccountId);
//     this._selectedbank.set(selectedBank.bankName);
//     this.chequemanagementform.controls['pBankId'].setValue(selectedBank.bankAccountId);
//     this.gridData.set([]);
//   }

//   // ─── Number of Cheques Changed ───────────────────────────────────────────────
//   onNoofchequesChange(event: Event): void {
//     const value = (event.target as HTMLInputElement).value;
//     const num = Number(value);
//     this._noofcheque.set(isNaN(num) ? 0 : num);

//     if (isNaN(num) || num <= 0) {
//       this.chequemanagementform.controls['pChequeto'].setValue('');
//     } else {
//       this.recalculateToNo();
//     }
//   }

//   // ─── From Cheque No Changed ──────────────────────────────────────────────────
//   onFromchequenoChange(event: Event): void {
//     const fromCheque = Number((event.target as HTMLInputElement).value);
//     const noOfCheques = Number(this.chequemanagementform.controls['pNoofcheques'].value);

//     if (!fromCheque || !noOfCheques) {
//       this.chequemanagementform.controls['pChequeto'].setValue('');
//       return;
//     }
//     this.chequemanagementform.controls['pChequeto'].setValue(
//       fromCheque + (noOfCheques - 1)
//     );
//   }

//   // ─── Recalculate To No ───────────────────────────────────────────────────────
//   private recalculateToNo(): void {
//     const from = Number(this.chequemanagementform.controls['pChequefrom'].value);
//     const count = this._noofcheque();
//     if (from && count) {
//       this.chequemanagementform.controls['pChequeto'].setValue(from + (count - 1));
//     }
//   }

//   // ─── Allow Numeric Input Only ────────────────────────────────────────────────
//   allowOnlyNumbers(event: Event, maxLength: number): void {
//     const input = event.target as HTMLInputElement;
//     let value = input.value.replace(/[^0-9]/g, '');
//     if (value.length > maxLength) value = value.slice(0, maxLength);
//     input.value = value;

//     const controlName = input.getAttribute('formControlName');
//     if (controlName && this.chequemanagementform.get(controlName)) {
//       this.chequemanagementform
//         .get(controlName)
//         ?.setValue(value, { emitEvent: false });
//     }
//   }

//   // ─── Overlap Range Validation ────────────────────────────────────────────────
//   private hasOverlap(fromcheq: number, tocheq: number): boolean {
//     return this.gridData().some((row) => {
//       if (this._selectedbank() !== row['bankName']) return false;
//       const ef = Number(row['pChequefrom']?.toString().replace(/,/g, ''));
//       const et = Number(row['pChequeto']?.toString().replace(/,/g, ''));
//       if (isNaN(ef) || isNaN(et)) return false;
//       return fromcheq <= et && tocheq >= ef;
//     });
//   }

//   // ─── Add to Grid ─────────────────────────────────────────────────────────────
//   addtoGrid(): void {
  
//     if (this.chequemanagementform.invalid) {
//       this.chequemanagementform.markAllAsTouched();
//       this.triggerAllValidations();
//       return;
//     }

//     const fromCheque = Number(this.chequemanagementform.controls['pChequefrom'].value);
//     const toCheque   = this.chequemanagementform.controls['pChequeto'].value;

//     if (!fromCheque || !toCheque) {
//       this.commonService.showWarningMessage('Please enter From No.');
//       return;
//     }

//     this.accountingMasterService
//       .GetExistingChequeCount(
//         this._recordid(),
//         fromCheque,
//         toCheque,
//         this.commonService.getbranchname(),
//         this.commonService.getCompanyCode(),
//         this.commonService.getBranchCode()
//       )
//       .pipe(takeUntilDestroyed(this.destroyRef))
//       .subscribe({
//         next: (res: any) => {
//           if (res && res.length > 0 && res[0].count === 0) {
//             this.chequemanagementform.controls['pStatusname'].setValue(false);
//             this.chequemanagementform.controls['ptypeofoperation'].setValue('CREATE');

//             // Angular 21: signal update (immutable spread)
//             this.gridData.update((prev) => [
//               ...prev,
//               { ...this.chequemanagementform.value } as ChequeGridRow,
//             ]);

//             this.resetAfterAdd();
//           } else {
//             this.commonService.showWarningMessage('Cheque No already exists');
//           }
//         },
//         error: (err: unknown) => this.commonService.showErrorMessage(err),
//       });
//   }

//   // ─── Reset form fields after successful Add ───────────────────────────────────
//   private resetAfterAdd(): void {
//     const savedBankId   = this.chequemanagementform.controls['pBankId'].value;
//     const savedBankName = this.chequemanagementform.controls['bankName'].value;

//     this.chequemanagementform.reset();
//     this.chequemanagementform.markAsPristine();
//     this.chequemanagementform.markAsUntouched();
//     this.chequemanagementvalidations = {};
//     this._noofcheque.set(0);

//     // Restore bank values after reset
//     this.chequemanagementform.controls['pBankId'].setValue(savedBankId, { emitEvent: false });
//     this.chequemanagementform.controls['bankName'].setValue(savedBankName, { emitEvent: false });
//     this.chequemanagementform.controls['pBankdate'].setValue(new Date(), { emitEvent: false });
//     this.chequemanagementform.controls['pChequeGenerateDate'].setValue(new Date(), { emitEvent: false });
//   }

//   // ─── Remove Row ──────────────────────────────────────────────────────────────
//   removeHandler(rowIndex: number): void {
//     // Angular 21: signal update with filter
//     this.gridData.update((rows) => rows.filter((_, i) => i !== rowIndex));
//   }

//   // ─── Save ────────────────────────────────────────────────────────────────────
//   save(type: SaveType): void {
//     if (!this.hasGridData()) {
//       this.commonService.showWarningMessage(
//         'Please add at least one cheque record before saving.'
//       );
//       return;
//     }

//     const isActive = type === 'Active';

//     if (isActive) {
//       this.disablesaveactivebutton.set(true);
//       this.buttonnameactive.set('Processing');
//     } else {
//       this.disablesavebutton.set(true);
//       this.buttonname.set('Processing');
//     }

//     // Patch form meta fields
//     this.chequemanagementform.controls['pCreatedby'].setValue(
//       this.commonService.getCreatedBy()
//     );
//     this.chequemanagementform.controls['branchSchema'].setValue(
//       this.commonService.getbranchname()
//     );
//     this.chequemanagementform.controls['pipaddress'].setValue(
//       this.commonService.getIpAddress()
//     );
//     this.chequemanagementform.controls['pChqegeneratestatus'].setValue(isActive);

//     const form = this.chequemanagementform.value;
//     const grid = this.gridData()[0];

//     const payload: SavePayload = {
//       branchSchema:           form.branchSchema,
//       company_code:           this.commonService.getCompanyCode(),
//       branch_code:            this.commonService.getBranchCode(),
//       branch_id:              1,
//       pBankId:                Number(grid['pBankId']),
//       pNoofcheques:           Number(grid['pNoofcheques']),
//       pChequefrom:            Number(grid['pChequefrom']),
//       pChequeto:              Number(grid['pChequeto']),
//       cheque_book_id:         form['cheque_book_id'] ?? 0,
//       pChqegeneratestatus:    form.pChqegeneratestatus === true,
//       pChequeGenerateDate:    this.today,
//       pCreatedby:             form.pCreatedby,
//       pipaddress:             form.pipaddress,
//       ptypeofoperation:       grid['ptypeofoperation'],
//     };

//     this.accountingMasterService
//       .SaveChequeManagement(payload)
//       .pipe(takeUntilDestroyed(this.destroyRef))
//       .subscribe({
//         next: (saveddata: any) => {
//           this.resetSaveState();
//           if (saveddata) {
//             this.commonService.showSuccessMessage();
//             this.router.navigate([
//               '/dashboard/accounts/accounts-config/cheque-management',
//             ]);
//           }
//         },
//         error: (err: unknown) => {
//           this.commonService.showErrorMessage(err);
//           this.resetSaveState();
//         },
//       });
//   }

//   // ─── Reset save button state ─────────────────────────────────────────────────
//   private resetSaveState(): void {
//     this.disablesavebutton.set(false);
//     this.disablesaveactivebutton.set(false);
//     this.buttonname.set('Save');
//     this.buttonnameactive.set('Save & Generate');
//   }

//   // ─── Clear ───────────────────────────────────────────────────────────────────
//   clear(): void {
//     this.chequemanagementform.reset();
//     this.gridData.set([]);
//     this._noofcheque.set(0);
//     this._recordid.set('');
//     this._selectedbank.set('');
//     this.chequemanagementvalidations = {};
//     this.chequemanagementform.controls['pBankdate'].setValue(new Date(), { emitEvent: false });
//     this.chequemanagementform.controls['pChequeGenerateDate'].setValue(new Date(), { emitEvent: false });
//   }

//   // ─── Trigger all validation messages ────────────────────────────────────────
//   private triggerAllValidations(): void {
//     Object.keys(this.chequemanagementform.controls).forEach((key) =>
//       this.updateValidationMessage(key)
//     );
//   }

//   // ─── Update single field validation message ──────────────────────────────────
//   private updateValidationMessage(key: string): void {
//     const ctrl = this.chequemanagementform.get(key);
//     if (!ctrl || ctrl instanceof FormGroup) return;

//     this.chequemanagementvalidations[key] = '';

//     if (ctrl.invalid && (ctrl.dirty || ctrl.touched)) {
//       for (const errorKey in ctrl.errors) {
//         if (errorKey) {
//           const el = document.getElementById(key) as HTMLInputElement | null;
//           const labelName = el?.title || key;
//           const msg = this.commonService.getValidationMessage(
//             ctrl, errorKey, labelName, key, ''
//           );
//           this.chequemanagementvalidations[key] += msg + ' ';
//         }
//       }
//     }
//   }

//   // ─── Public error helper ─────────────────────────────────────────────────────
//   showErrorMessage(errormsg: unknown): void {
//     this.commonService.showErrorMessage(errormsg);
//   }
// }
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
  DestroyRef,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { NgSelectModule } from '@ng-select/ng-select';
import {
  BsDatepickerConfig,
  BsDatepickerModule,
} from 'ngx-bootstrap/datepicker';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsConfig } from '../../../../core/services/accounts/accounts-config';
import { DatePickerModule } from 'primeng/datepicker';


// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface BankDetail {
  bankName: string;
  bankAccountId: number | string;
}

export interface ChequeGridRow {
  pBankId: number | string;
  bankName: string;
  pNoofcheques: number;
  pChequefrom: number;
  pChequeto: number;
  pStatusname: boolean;
  ptypeofoperation: string;
  branchSchema?: string;
  pipaddress?: string;
  pCreatedby?: any;
}

export interface SavePayload {
  branchSchema: string;
  company_code: string;
  branch_code: string;
  branch_id: number;
  pBankId: number;
  pNoofcheques: number;
  pChequefrom: number;
  pChequeto: number;
  cheque_book_id: number;
  pChqegeneratestatus: boolean;
  pChequeGenerateDate: Date;
  pCreatedby: any;
  pipaddress: string;
  ptypeofoperation: string;
}

export type SaveType = 'Active' | 'InActive';

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-cheque-managementnew',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BsDatepickerModule,
    TableModule,
    ButtonModule,
    NgSelectModule,
    RouterModule,
    DatePickerModule
  ],
  templateUrl: './cheque-managementnew.html',
  styleUrl: './cheque-managementnew.css',
  providers: [DatePipe],
})
export class ChequeManagementnew implements OnInit {
  pDatepickerMaxDate: any = new Date();

  // ─── Angular 21: inject() instead of constructor injection ─────────────────
  private readonly fb             = inject(FormBuilder);
  private readonly router         = inject(Router);
  private readonly destroyRef     = inject(DestroyRef);
  private readonly commonService  = inject(CommonService);
  private readonly datepipe       = inject(DatePipe);
  private readonly accountingMasterService = inject(AccountsConfig);

  // ─── Datepicker Config ───────────────────────────────────────────────────────
  readonly currentdate: Partial<BsDatepickerConfig> = {
    maxDate: new Date(),
    containerClass: 'theme-dark-blue',
    dateInputFormat: 'DD-MM-YYYY',
    showWeekNumbers: false,
  };

  // ─── Form ────────────────────────────────────────────────────────────────────
  chequemanagementform!: FormGroup;

  // ─── Angular 21: Signals for reactive state ──────────────────────────────────
  readonly bankdetails     = signal<BankDetail[]>([]);
  readonly gridData        = signal<ChequeGridRow[]>([]);
  readonly isLoadingBanks  = signal(false);
  readonly disablesavebutton       = signal(false);
  readonly disablesaveactivebutton = signal(false);
  readonly buttonname              = signal('Save');
  readonly buttonnameactive        = signal('Save & Generate');

  // ─── Private state signals ───────────────────────────────────────────────────
  private readonly _recordid    = signal<number | string>('');
  private readonly _selectedbank = signal('');
  private readonly _noofcheque  = signal(0);

  // ─── Computed signals ────────────────────────────────────────────────────────
  readonly hasGridData = computed(() => this.gridData().length > 0);
  readonly gridRowCount = computed(() => this.gridData().length);

  // ─── Validation messages ─────────────────────────────────────────────────────
  chequemanagementvalidations: Record<string, string> = {};

  // ─── Static date ─────────────────────────────────────────────────────────────
  readonly today = new Date();
  readonly gridEffect = effect(() => {
  if (this.gridData().length === 0) {
    this.chequemanagementvalidations = {};
  }
});

  // ─── ngOnInit ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initForm();
    this.subscribeToFieldChanges();
    this.loadBankDetails();

    // Angular 21: effect() to react to gridData changes
    // effect(() => {
    //   const count = this.gridData().length;
    //   if (count === 0) {
    //     this.chequemanagementvalidations = {};
    //   }
    // }, { allowSignalWrites: true });
  }

  // ─── Form Initialization ─────────────────────────────────────────────────────
  private initForm(): void {
    this.chequemanagementform = this.fb.group({
      pBankId:              [''],
      bankName:             [null, Validators.required],
      pBankdate:            [new Date()],
      pNoofcheques:         ['', [Validators.required, Validators.min(1), Validators.max(999)]],
      pChequefrom:          ['', [Validators.required, Validators.minLength(1)]],
      pChequeto:            ['', Validators.required],
      pChqegeneratestatus:  [false],
      pStatusname:          ['Active'],
      ptypeofoperation:     ['CREATE'],
      pCreatedby:           [this.commonService.getCreatedBy()],
      branchSchema:         [this.commonService.getschemaname()],
      pipaddress:           [this.commonService.getIpAddress()],
      pChequeGenerateDate:  [{ value: new Date(), disabled: true }],
    });
  }

  // ─── Subscribe to field value changes for live validation ────────────────────
  private subscribeToFieldChanges(): void {
    Object.keys(this.chequemanagementform.controls).forEach((key) => {
      const ctrl = this.chequemanagementform.get(key);
      if (ctrl && !(ctrl instanceof FormGroup) && ctrl.validator) {
        ctrl.valueChanges
          .pipe(takeUntilDestroyed(this.destroyRef))   // Angular 21: no manual destroy$
          .subscribe(() => this.updateValidationMessage(key));
      }
    });
  }

  // ─── Load Bank Details ───────────────────────────────────────────────────────
  private loadBankDetails(): void {
    this.isLoadingBanks.set(true);
    this.accountingMasterService
      .GetBankNames(
        this.commonService.getschemaname(),
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: BankDetail[]) => {
          this.bankdetails.set(res ?? []);
          this.isLoadingBanks.set(false);
        },
        error: (err: unknown) => {
          this.isLoadingBanks.set(false);
          this.commonService.showErrorMessage(err);
        },
      });
  }

  // ─── Template Getters (AbstractControl shortcuts) ───────────────────────────
  get bankNameCtrl(): AbstractControl {
    return this.chequemanagementform.controls['bankName'];
  }

  get noofchequesCtrl(): AbstractControl {
    return this.chequemanagementform.controls['pNoofcheques'];
  }

  get chequefromCtrl(): AbstractControl {
    return this.chequemanagementform.controls['pChequefrom'];
  }

  get chequetoCtrl(): AbstractControl {
    return this.chequemanagementform.controls['pChequeto'];
  }

  // ─── Bank Selection ──────────────────────────────────────────────────────────
  onBankChange(event: BankDetail | null): void {
    if (!event) {
      this._recordid.set('');
      this._selectedbank.set('');
      return;
    }
    this._recordid.set(event.bankAccountId);
    this._selectedbank.set(event.bankName);
    this.chequemanagementform.controls['pBankId'].setValue(event.bankAccountId);
    this.gridData.set([]);
  }

  // ─── Number of Cheques Changed ───────────────────────────────────────────────
  onNoofchequesChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const num = Number(value);
    this._noofcheque.set(isNaN(num) ? 0 : num);

    if (isNaN(num) || num <= 0) {
      this.chequemanagementform.controls['pChequeto'].setValue('');
    } else {
      this.recalculateToNo();
    }
  }

  // ─── From Cheque No Changed ──────────────────────────────────────────────────
  onFromchequenoChange(event: Event): void {
    const fromCheque = Number((event.target as HTMLInputElement).value);
    const noOfCheques = Number(this.chequemanagementform.controls['pNoofcheques'].value);

    if (!fromCheque || !noOfCheques) {
      this.chequemanagementform.controls['pChequeto'].setValue('');
      return;
    }
    this.chequemanagementform.controls['pChequeto'].setValue(
      fromCheque + (noOfCheques - 1)
    );
  }

  // ─── Recalculate To No ───────────────────────────────────────────────────────
  private recalculateToNo(): void {
    const from = Number(this.chequemanagementform.controls['pChequefrom'].value);
    const count = this._noofcheque();
    if (from && count) {
      this.chequemanagementform.controls['pChequeto'].setValue(from + (count - 1));
    }
  }

  // ─── Allow Numeric Input Only ────────────────────────────────────────────────
  allowOnlyNumbers(event: Event, maxLength: number): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length > maxLength) value = value.slice(0, maxLength);
    input.value = value;

    const controlName = input.getAttribute('formControlName');
    if (controlName && this.chequemanagementform.get(controlName)) {
      this.chequemanagementform
        .get(controlName)
        ?.setValue(value, { emitEvent: false });
    }
  }

  // ─── Overlap Range Validation ────────────────────────────────────────────────
  private hasOverlap(fromcheq: number, tocheq: number): boolean {
    return this.gridData().some((row) => {
      if (this._selectedbank() !== row['bankName']) return false;
      const ef = Number(row['pChequefrom']?.toString().replace(/,/g, ''));
      const et = Number(row['pChequeto']?.toString().replace(/,/g, ''));
      if (isNaN(ef) || isNaN(et)) return false;
      return fromcheq <= et && tocheq >= ef;
    });
  }

  // ─── Add to Grid ─────────────────────────────────────────────────────────────
  addtoGrid(): void {
    if (this.chequemanagementform.invalid) {
      this.chequemanagementform.markAllAsTouched();
      this.triggerAllValidations();
      return;
    }

    const fromCheque = Number(this.chequemanagementform.controls['pChequefrom'].value);
    const toCheque   = this.chequemanagementform.controls['pChequeto'].value;

    if (!fromCheque || !toCheque) {
      this.commonService.showWarningMessage('Please enter From No.');
      return;
    }

    this.accountingMasterService
      .GetExistingChequeCount(
        this._recordid(),
        fromCheque,
        toCheque,
        this.commonService.getbranchname(),
        this.commonService.getCompanyCode(),
        this.commonService.getBranchCode()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          if (res && res.length > 0 && res[0].count === 0) {
            this.chequemanagementform.controls['pStatusname'].setValue(false);
            this.chequemanagementform.controls['ptypeofoperation'].setValue('CREATE');

            // Angular 21: signal update (immutable spread)
            this.gridData.update((prev) => [
              ...prev,
              { ...this.chequemanagementform.value } as ChequeGridRow,
            ]);

            this.resetAfterAdd();
          } else {
            this.commonService.showWarningMessage('Cheque No already exists');
          }
        },
        error: (err: unknown) => this.commonService.showErrorMessage(err),
      });
  }

  // ─── Reset form fields after successful Add ───────────────────────────────────
  private resetAfterAdd(): void {
    const savedBankId   = this.chequemanagementform.controls['pBankId'].value;
    const savedBankName = this.chequemanagementform.controls['bankName'].value;

    this.chequemanagementform.reset();
    this.chequemanagementform.markAsPristine();
    this.chequemanagementform.markAsUntouched();
    this.chequemanagementvalidations = {};
    this._noofcheque.set(0);

    // Restore bank values after reset
    this.chequemanagementform.controls['pBankId'].setValue(savedBankId, { emitEvent: false });
    this.chequemanagementform.controls['bankName'].setValue(savedBankName, { emitEvent: false });
  }

  // ─── Remove Row ──────────────────────────────────────────────────────────────
  removeHandler(rowIndex: number): void {
    // Angular 21: signal update with filter
    this.gridData.update((rows) => rows.filter((_, i) => i !== rowIndex));
  }

  // ─── Save ────────────────────────────────────────────────────────────────────
  save(type: SaveType): void {
    if (!this.hasGridData()) {
      this.commonService.showWarningMessage(
        'Please add at least one cheque record before saving.'
      );
      return;
    }

    const isActive = type === 'Active';

    if (isActive) {
      this.disablesaveactivebutton.set(true);
      this.buttonnameactive.set('Processing');
    } else {
      this.disablesavebutton.set(true);
      this.buttonname.set('Processing');
    }

    // Patch form meta fields
    this.chequemanagementform.controls['pCreatedby'].setValue(
      this.commonService.getCreatedBy()
    );
    this.chequemanagementform.controls['branchSchema'].setValue(
      this.commonService.getbranchname()
    );
    this.chequemanagementform.controls['pipaddress'].setValue(
      this.commonService.getIpAddress()
    );
    this.chequemanagementform.controls['pChqegeneratestatus'].setValue(isActive);

    const form = this.chequemanagementform.value;
    const grid = this.gridData();

    console.log(grid);
    



const payload: SavePayload[] = grid.map((row: any) => ({
  branchSchema:           form.branchSchema,
  company_code:           this.commonService.getCompanyCode(),
  branch_code:            this.commonService.getBranchCode(),
  branch_id:              1,
  pBankId:                Number(row['pBankId']),
  pNoofcheques:           Number(row['pNoofcheques']),
  pChequefrom:            Number(row['pChequefrom']),
  pChequeto:              Number(row['pChequeto']),
  cheque_book_id:         form['cheque_book_id'] ?? 0,
  pChqegeneratestatus:    form.pChqegeneratestatus === true,
  pChequeGenerateDate:    this.today,
  pCreatedby:             form.pCreatedby,
  pipaddress:             form.pipaddress,
  ptypeofoperation:       row['ptypeofoperation'],
}));





    this.accountingMasterService
      .SaveChequeManagement(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saveddata: any) => {
          this.resetSaveState();
          if (saveddata) {
            this.commonService.showSuccessMessage();
            this.router.navigate([
              '/dashboard/accounts/accounts-config/cheque-management',
            ]);
          }
        },
        error: (err: unknown) => {
          this.commonService.showErrorMessage(err);
          this.resetSaveState();
        },
      });
  }

  // ─── Reset save button state ─────────────────────────────────────────────────
  private resetSaveState(): void {
    this.disablesavebutton.set(false);
    this.disablesaveactivebutton.set(false);
    this.buttonname.set('Save');
    this.buttonnameactive.set('Save & Generate');
  }

  // ─── Clear ───────────────────────────────────────────────────────────────────
  clear(): void {
    this.chequemanagementform.reset();
    this.gridData.set([]);
    this._noofcheque.set(0);
    this._recordid.set('');
    this._selectedbank.set('');
    this.chequemanagementvalidations = {};
  }

  // ─── Trigger all validation messages ────────────────────────────────────────
  private triggerAllValidations(): void {
    Object.keys(this.chequemanagementform.controls).forEach((key) =>
      this.updateValidationMessage(key)
    );
  }

  // ─── Update single field validation message ──────────────────────────────────
  private updateValidationMessage(key: string): void {
    const ctrl = this.chequemanagementform.get(key);
    if (!ctrl || ctrl instanceof FormGroup) return;

    this.chequemanagementvalidations[key] = '';

    if (ctrl.invalid && (ctrl.dirty || ctrl.touched)) {
      for (const errorKey in ctrl.errors) {
        if (errorKey) {
          const el = document.getElementById(key) as HTMLInputElement | null;
          const labelName = el?.title || key;
          const msg = this.commonService.getValidationMessage(
            ctrl, errorKey, labelName, key, ''
          );
          this.chequemanagementvalidations[key] += msg + ' ';
        }
      }
    }
  }

  // ─── Public error helper ─────────────────────────────────────────────────────
  showErrorMessage(errormsg: unknown): void {
    this.commonService.showErrorMessage(errormsg);
  }
}