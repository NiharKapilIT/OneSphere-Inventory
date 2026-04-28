
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';

import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: "app-address",
  standalone: true,
  imports: [ReactiveFormsModule, NgSelectModule],
  templateUrl: "./address.html",
  styleUrl: "./address.css",
})

export class Address implements OnInit {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private contactMasterService = inject(AccountsTransactions);
  private commonService = inject(CommonService);

  // Signals for dropdown data
  countryDetails = signal<any[]>([]);
  stateDetails = signal<any[]>([]);
  districtDetails = signal<any[]>([]);

  // Signal for error messages
  addressformErrorMessage = signal<Record<string, string>>({});

  // Computed signal to check if any error exists
  hasErrors = computed(() => Object.values(this.addressformErrorMessage()).some(msg => !!msg));

  addressForm!: FormGroup;
  private formName = signal<string>('');

  ngOnInit(): void {
    this.initForm();
    this.blurEventAllControls(this.addressForm);
    this.getCountryDetails();
  }

  private initForm(): void {
    this.addressForm = this.fb.group({
      paddress1: ['', Validators.required],
      paddress2: [''],
      pcity: ['', Validators.required],
      pRecordid: [0],
      pCountryId: [''],
      pStateId: [''],
      pDistrictId: [''],
      pCountry: ['', Validators.required],
      pState: ['', Validators.required],
      pDistrict: ['', Validators.required],
      Pincode: ['', Validators.required],
    });

    this.addressformErrorMessage.set({});
  }

  // ── Binding Methods ────────────────────────────────────────────────

  bindingdata(data: any): void {
    const d = data[0];

    this.setOrClearControl('paddress1', d.address1);
    this.setOrClearControl('paddress2', d.address2);
    this.setOrClearControl('Pincode', d.pincode);
    this.setOrClearControl('pcity', d.city);

    if (d.country_id !== 0) {
      this.contactMasterService
        .getstates(this.commonService.getschemaname(), d.country_id)
        .subscribe((json: any) => this.stateDetails.set(json));
    } else {
      this.clearControl('pState');
    }

    if (d.state_id !== 0) {
      this.contactMasterService
        .getDistrict(this.commonService.getschemaname(), d.state_id)
        .subscribe((json: any) => this.districtDetails.set(json));
    } else {
      this.clearControl('pDistrict');
    }

    if (d.district_id === 0) this.clearControl('pDistrict');

    this.addressForm.patchValue({
      pStateId: d.state_id,
      pCountry: d.country_name,
      pDistrict: d.district_name,
      pState: d.state_name,
      pDistrictId: d.district_id,
      pCountryId: d.country_id,
    });
  }

  bindingcompanydata(data: any): void {
    const d = data[0];

    this.setOrClearControl('paddress1', d.address1);
    this.setOrClearControl('paddress2', d.address2);
    this.setOrClearControl('Pincode', d.pincode);
    this.setOrClearControl('pcity', d.city);

    if (d.country_id !== 0) {
      this.contactMasterService
        .getstates(this.commonService.getschemaname(), d.country_id)
        .subscribe((json: any) => this.stateDetails.set(json));
    } else {
      this.clearControl('pState');
    }

    if (data.country_id !== 0) {
      this.contactMasterService.getCountryDetails().subscribe((json: any) => {
        if (json) this.countryDetails.set(json);
      });
    } else {
      this.clearControl('pCountry');
    }

    if (d.state_id !== 0) {
      this.contactMasterService
        .getDistrict(this.commonService.getschemaname(), d.state_id)
        .subscribe((json: any) => this.districtDetails.set(json));
    } else {
      this.clearControl('pDistrict');
    }

    if (d.district_id === 0) this.clearControl('pDistrict');

    this.addressForm.patchValue({
      pStateId: d.state_id,
      pCountry: d.country_name,
      pDistrict: d.district_name,
      pState: d.state_name,
      pDistrictId: d.district_id,
      pCountryId: d.country_id,
    });
  }

  editdata(data: any, formname: string): void {
    this.formName.set(formname);

    if (formname === 'companyconfig') {
      this.addressForm.get('pRecordid')?.setValue(data[0].bank_configuration_id);
      this.bindingcompanydata(data);
    } else if (formname === 'Bank') {
      this.addressForm.get('pRecordid')?.setValue(data[0].bank_configuration_id);
      this.bindingdata(data);
    }
  }

  // ── Dropdown Change Handlers ────────────────────────────────────────

  pCountry_Change(country: any): void {
    debugger;
    if (country) {
      const countryId = country.tbl_mst_country_id;
      const countryName = country.country_name;
      this.addressForm.get('pCountryId')?.setValue(countryId);
      this.addressForm.get('pCountry')?.setValue(countryName);
      this.getSateDetails(countryId);
    } else {
      this.stateDetails.set([]);
      this.districtDetails.set([]);
      this.addressForm.patchValue({ pCountryId: '', pCountry: '', pStateId: '', pDistrictId: '' });
    }
  }

  pState_Change(state: any): void {
    debugger;
    if (state) {
      const stateId = state.tbl_mst_state_id;
      const stateName = state.state_name;
      this.addressForm.get('pStateId')?.setValue(stateId);
      this.addressForm.get('pState')?.setValue(stateName);
      this.getDistrictDetails(stateId);
    } else {
      this.districtDetails.set([]);
      this.addressForm.get('pStateId')?.setValue('');
      this.addressForm.get('pState')?.setValue('');
      this.addressForm.get('pDistrictId')?.setValue('');
    }
  }

  pDistrict_Change(district: any): void {
    debugger;
    if (district) {
      const districtId = district.tbl_mst_district_id;
      const districtName = district.district_name;
      this.addressForm.get('pDistrictId')?.setValue(districtId);
      this.addressForm.get('pDistrict')?.setValue(districtName);
    } else {
      this.addressForm.get('pDistrictId')?.setValue('');
      this.addressForm.get('pDistrict')?.setValue('');
    }
  }

  // ── API Calls ───────────────────────────────────────────────────────

  getCountryDetails(): void {
    this.contactMasterService
      .getcountrys(this.commonService.getschemaname())
      .subscribe({
        next: (res: any) => this.countryDetails.set(res),
        error: (err: any) => this.commonService.showErrorMessage(err),
      });
  }

  getSateDetails(countryId: any): void {
    this.contactMasterService
      .getstates(this.commonService.getschemaname(), countryId)
      .subscribe({
        next: (res: any) => this.stateDetails.set(res),
        error: (err: any) => this.commonService.showErrorMessage(err),
      });
  }

  getDistrictDetails(stateId: any): void {
    this.contactMasterService
      .getDistrict(this.commonService.getschemaname(), stateId)
      .subscribe({
        next: (res: any) => this.districtDetails.set(res),
        error: (err: any) => this.commonService.showErrorMessage(err),
      });
  }

  // ── Validation ──────────────────────────────────────────────────────

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

  getValidationByControl(formGroup: FormGroup, key: string, isValid: boolean): boolean {
    try {
      const control = formGroup.get(key);
      if (!control) return isValid;

      if (control instanceof FormGroup) {
        return this.checkValidations(control, isValid);
      }

      if (control.validator) {
        this.addressformErrorMessage.update((msgs) => ({ ...msgs, [key]: '' }));

        if (control.errors || control.invalid || control.touched || control.dirty) {
          const labelEl = document.getElementById(key) as HTMLElement | null;
          const labelName = labelEl?.getAttribute('title') ?? key;

          for (const errorKey in control.errors) {
            if (errorKey) {
              const message = this.commonService.getValidationMessage(control, errorKey, labelName, key, '');
              this.addressformErrorMessage.update((msgs) => ({
                ...msgs,
                [key]: (msgs[key] ?? '') + message + ' ',
              }));
              isValid = false;
            }
          }
        }
      }
    } catch {
      return false;
    }
    return isValid;
  }

  blurEventAllControls(formGroup: FormGroup): void {
    try {
      Object.keys(formGroup.controls).forEach((key) => this.setBlurEvent(formGroup, key));
    } catch {
      // silent
    }
  }

  setBlurEvent(formGroup: FormGroup, key: string): void {
    try {
      const control = formGroup.get(key);
      if (!control) return;

      if (control instanceof FormGroup) {
        this.blurEventAllControls(control);
      } else if (control.validator) {
        formGroup.get(key)?.valueChanges.subscribe(() => {
          this.getValidationByControl(formGroup, key, true);
        });
      }
    } catch {
      // silent
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private setOrClearControl(controlName: string, value: any): void {
    const control = this.addressForm.get(controlName);
    if (!control) return;

    if (!value || value === '' || value === 0) {
      control.clearValidators();
      control.updateValueAndValidity();
    } else {
      control.setValue(value);
    }
  }

  private clearControl(controlName: string): void {
    const control = this.addressForm.get(controlName);
    if (!control) return;
    control.clearValidators();
    control.updateValueAndValidity();
  }

  errorOf(key: string): string {
    return this.addressformErrorMessage()[key] ?? '';
  }

  allowOnlyNumbers(event: KeyboardEvent): void {
    const charCode = event.which ?? event.keyCode;
    if (charCode < 48 || charCode > 57) event.preventDefault();
  }

  clear(): void {
    this.addressForm.reset();

    const arr = this.addressForm.get('lstBankInformationAddressDTO');
    if (arr instanceof FormArray) arr.clear();

    this.addressformErrorMessage.set({});
    this.stateDetails.set([]);
    this.districtDetails.set([]);
  }
}
