import {
  Component, OnInit, Input, Output, EventEmitter,
  signal, computed, OnChanges, SimpleChanges
} from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Contact, ContactTab } from '../contacts-list/contacts-list.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { CommonService } from '../../../core/services/Common/common.service';
import { ContactMasterService } from '../../../core/services/contacts/contact-master.service';
import { NumbersOnlyDirective } from '../../../core/Directive/numbers-only';
import { Subject, Observable, concat, of, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map } from 'rxjs/operators';

export type ContactType = 'Individual' | 'Business Entity';
export type Gender = 'Male' | 'Female' | 'Third Gender';
type ContactSection = 'personal' | 'address' | 'kyc' | 'bank' | 'others';

interface Address {
  isPrimary: boolean;
  type: string;
  addressLine: string;
  area: string;
  city: string;
  country: string;
  countryId: any;
  state: string;
  stateId: any;
  district: string;
  districtId: any;
  pincode: string;
  longitude: string;
  latitude: string;
}

interface ContactPerson {
  contact: string;
  contactId?: any;
  designation: string;
  isPrimary: boolean;
}

interface BankDetail {
  isPrimary: boolean;
  bankId: any;
  bankName: string;
  accountNo: string;
  ifscCode: string;
  branch: string;
  accountHolderName: string;
  accountType: string;
  upiId: string;
}


@Component({
  selector: 'app-contact-add',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule, DatePickerModule, NumbersOnlyDirective, AsyncPipe],
  templateUrl: './contact-add.component.html',
  styleUrl: './contact-add.component.scss',
})
export class ContactAddComponent implements OnInit, OnChanges {
  @Input() contact: Contact | null = null;
  @Input() activeTab: ContactTab = 'Contacts';
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Contact>();

  private readonly tabMap: Record<ContactTab, string> = {
    'Contacts': 'Contacts',
    'Subscriber / Customer': 'Referrals',
    'Employee': 'Employees',
    'Supplier / Vendor': 'Suppliers',
    'Advocate': 'Advocates',
    'Channel Partner': 'Referrals',
    'Freelancer': 'Freelancer',
  };

  contactType = signal<ContactType>('Individual');
  activeSection = signal<ContactSection>('personal');

  form!: FormGroup;

  // Address table
  addressRows = signal<Address[]>([]);
  currentAddress: Address = this.emptyAddress();
  bankRows = signal<BankDetail[]>([]);
  contactSearchEvent = new Subject<string>();
  contactList$!: Observable<any[]>;
  selectedContactPerson: any = null;

  // Contact persons (Business)
  contactPersons = signal<ContactPerson[]>([]);
  currentContactPerson: ContactPerson = { contact: '', designation: '', isPrimary: false };
  // Photo
  photoPreview = signal<string | null>(null);
  pDatepickerMaxDate: Date = new Date();

  genders: Gender[] = ['Male', 'Female', 'Third Gender'];
  kycDocumentTypes: any[] = [];
  kycDocumentNames: any[] = [];
  kycStatuses = ['Pending', 'Verified', 'Rejected'];
  bankAccountTypes = ['Savings', 'Current', 'Cash Credit', 'Overdraft', 'NRE', 'NRO'];
  salutations: any[] = [];
  addressTypes: any[] = [];
  enterpriseTypes: any[] = [];
  businessNatures: any[] = [];
  countries: any[] = [];
  states: any[] = [];
  districts: any[] = [];
  banks: any[] = [];
  relationTitles: any[] = [];
  designations: any[] = [];
  isLoading = false;

  isSaving = signal(false);
  saveError = signal<string | null>(null);

  constructor(private fb: FormBuilder, private commonService: CommonService, private contactMasterService: ContactMasterService) { }

  ngOnInit() {
    this.buildForm();
    this.loadCountries();
    this.loadContactTitles();
    this.loadBanks();
    this.loadRelationTitles();
    this.loadAddressTypes(this.contactType());
    this.loadKycDocumentTypes();
    this.loadEnterpriseTypes();
    this.loadBusinessNatures();
    this.loadDesignations();
    this.setupContactSearch();

    forkJoin({
      countries: this.commonService.getCountries(),
      salutations: this.commonService.getContactTitles(),
      banks: this.commonService.getGlobalBanks(),
      relationTitles: this.commonService.getRelationTitles(),
      kycDocs: this.commonService.getDocumentGroupNames(),
      enterpriseTypes: this.commonService.getEnterpriseType(),
      businessNatures: this.commonService.getBusinessTypes(),
    }).subscribe({
      next: (results) => {
        this.countries = results.countries ?? [];
        this.salutations = results.salutations ?? [];
        this.banks = results.banks ?? [];
        this.relationTitles = results.relationTitles ?? [];
        this.kycDocumentTypes = results.kycDocs ?? [];
        this.enterpriseTypes = results.enterpriseTypes ?? [];
        this.businessNatures = results.businessNatures ?? [];
        this.loadAddressTypes(this.contactType());

        if (this.contact?.id) {
          this.loadContactForEdit(Number(this.contact.id));
        }
      },
      error: () => {
        if (this.contact?.id) {
          this.loadContactForEdit(Number(this.contact.id));
        }
      }
    });
  }

  loadContactTitles() {
    this.commonService.getContactTitles().subscribe({
      next: (data) => { this.salutations = data; },
      error: () => { this.salutations = []; }
    });
  }

  loadBanks() {
    this.commonService.getGlobalBanks().subscribe({
      next: (data) => { this.banks = data; },
      error: () => { this.banks = []; }
    });
  }

  loadRelationTitles() {
    this.commonService.getRelationTitles().subscribe({
      next: (data) => { this.relationTitles = data; },
      error: () => { this.relationTitles = []; }
    });
  }

  loadAddressTypes(contactType: string) {
    this.commonService.getAddressType(contactType).subscribe({
      next: (data) => { this.addressTypes = data; },
      error: () => { this.addressTypes = []; }
    });
  }

  onIfscInput(event: Event, controlName: string): void {

    const input = event.target as HTMLInputElement;

    const pos = input.selectionStart ?? input.value.length;

    const clean = input.value
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();

    const control = this.form.get(controlName);

    control?.setValue(clean, { emitEvent: false });

    input.value = clean;

    input.setSelectionRange(pos, pos);
  }


  setPrimaryContactPerson(idx: number) {
    this.contactPersons.update(list => list.map((cp, i) => ({ ...cp, isPrimary: i === idx })));
  }

  private setupContactSearch(): void {
    this.contactList$ = concat(
      of([]),
      this.contactSearchEvent.pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap(term => {
          if (!term || term.trim().length < 2) return of([]);
          return this.contactMasterService.getSubscriberContactDetails(term, 'CONTACT MASTER')
            .pipe(
              map((res: any) => res?.message ?? res ?? []),
              catchError(() => of([]))
            );
        })
      )
    );
  }

  onContactPersonSelect(selected: any): void {
    if (selected) {
      this.selectedContactPerson = selected;
    } else {
      this.selectedContactPerson = null;
    }
  }



  addContactPerson() {
    this.form.get('contactPerson')?.markAsTouched();
    this.form.get('contactPersonDesignation')?.markAsTouched();

    const contactVal = this.form.get('contactPerson')?.value;
    const designationVal = this.form.get('contactPersonDesignation')?.value;

    const contact = (contactVal ?? '').toString().trim();
    const designation = (designationVal ?? '').toString().trim();

    if (!contact || !designation) return;

    this.contactPersons.update(list => [
      ...list,
      {
        contact: contact,
        contactId: this.selectedContactPerson?.contactid ?? null,
        designation: designation,
        isPrimary: list.length === 0
      }
    ]);

    this.form.patchValue({ contactPerson: null, contactPersonDesignation: null });
    this.form.get('contactPerson')?.markAsUntouched();
    this.form.get('contactPersonDesignation')?.markAsUntouched();
    this.selectedContactPerson = null;
  }

  lettersOnly(event: any): void {
    event.target.value = event.target.value.replace(/[^a-zA-Z ]/g, '');
  }

  convertTitleCase(controlName: string): void {
    const control = this.form.get(controlName);
    const value = control?.value as string;
    if (value) {
      const titleCase = value
        .toLowerCase()
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      control?.setValue(titleCase);
    }
  }

  loadKycDocumentTypes() {
    this.commonService.getDocumentGroupNames().subscribe({
      next: (data) => { this.kycDocumentTypes = data; },
      error: () => { this.kycDocumentTypes = []; }
    });
  }

  onKycDocTypeChange(item: any) {
    this.kycDocumentNames = [];
    this.form.patchValue({ kycDocumentName: null });
    if (item?.pDocumentGroupId) {
      this.commonService.getDocumentProofs(item.pDocumentGroupId).subscribe({
        next: (data) => { this.kycDocumentNames = data; },
        error: () => { this.kycDocumentNames = []; }
      });
    }
  }

  loadEnterpriseTypes() {
    this.commonService.getEnterpriseType().subscribe({
      next: (data) => { this.enterpriseTypes = data; },
      error: () => { this.enterpriseTypes = []; }
    });
  }

  loadBusinessNatures() {
    this.commonService.getBusinessTypes().subscribe({
      next: (data) => { this.businessNatures = data; },
      error: () => { this.businessNatures = []; }
    });
  }

  loadDesignations() {
    this.commonService.getDesignationsAll().subscribe({
      next: (data) => { this.designations = data; },
      error: () => { this.designations = []; }
    });
  }

  loadCountries() {
    this.commonService.getCountries().subscribe({
      next: (data) => { this.countries = data; },
      error: () => { this.countries = []; }
    });
  }


  onCountryChange(country: any) {
    this.states = [];
    this.districts = [];
    this.currentAddress.countryId = country?.tbl_mst_country_id ?? null;
    this.form.patchValue({ state: null, district: null });
    if (country) {
      this.commonService.getStates(country.tbl_mst_country_id).subscribe({
        next: (data) => { this.states = data; },
        error: () => { this.states = []; }
      });
    }
  }


  onStateChange(state: any) {
    this.districts = [];
    this.currentAddress.stateId = state?.tbl_mst_state_id ?? null;
    this.currentAddress.state = state?.state_name ?? '';
    this.form.patchValue({ district: null });
    if (state) {
      this.commonService.getDistricts(state.tbl_mst_state_id).subscribe({
        next: (data) => { this.districts = data; },
        error: () => { this.districts = []; }
      });
    }
  }

  onDistrictChange(district: any) {
    this.currentAddress.districtId = district?.tbl_mst_district_id ?? null;
    this.currentAddress.district = district?.district_name ?? '';
  }


  ngOnChanges(changes: SimpleChanges) {
    console.log('4. ngOnChanges fired:', changes);
    console.log('5. contact value:', this.contact);
    console.log('6. contact.id:', this.contact?.id);
    if (changes['contact'] && this.form) {
      if (this.contact?.id) {
        console.log('7. calling loadContactForEdit with:', Number(this.contact.id))
        this.loadContactForEdit(Number(this.contact.id));
      } else {
        this.form.reset();
      }
    }
  }

  loadContactForEdit(contactId: number) {
    console.log('8. loadContactForEdit called with:', contactId);

    this.isLoading = true;
    this.commonService.viewContact(contactId).subscribe({
      next: (data) => {
        console.log('9. API response:', data);
        this.isLoading = false;
        this.bindViewContactData(data);
      },
      error: (error) => {
        console.log('10. API error:', error);
        this.isLoading = false;
        if (this.contact) { this.patchForm(this.contact); }
      }
    });
  }

  private bindViewContactData(data: any) {
    // 1. Contact type
    const isBusinessEntity = (data.pContactType ?? '').toString().toLowerCase().includes('business');
    const contactType: ContactType = isBusinessEntity ? 'Business Entity' : 'Individual';
    this.contactType.set(contactType);
    this.loadAddressTypes(contactType);

    // 2. Photo
    const photoPath = data.pContactimagepath ?? data.pPhoto ?? null;
    if (photoPath) { this.photoPreview.set(photoPath.toString()); }

    // 3. DOB
    let parsedDob: Date | null = null;
    if (data.pDob) {
      const d = new Date(data.pDob.toString());
      if (!isNaN(d.getTime())) parsedDob = d;
    }

    // 4. Patch form
    this.form.patchValue({
      // Individual
      salutation: data.pTitleName ?? '',
      firstName: data.pName ?? '',
      surName: data.pSurName ?? '',
      mailingName: data.pcontactmailingname ?? '',
      // gender:           data.pGender             ?? '',
      gender: this.mapGender(data.pGender),
      fatherSalutation: data.rTitleName ?? '',
      fatherName: data.pFatherName ?? '',
      dob: parsedDob,
      age: data.pAge ? Number(data.pAge) : null,
      panCard: data.ppancardno ?? '',
      // Business
      enterpriseName: data.pName ?? '',
      enterpriseEmail: data.pBusinessEntityEmailid ?? '',
      enterpriseContact: data.pBusinessEntityContactno ?? '',
      enterprisePan: data.ppancardno ?? '',
      enterpriseType: data.pEnterpriseType ?? '',
      businessNature: data.pBusinesstype ?? '',
      // Contact info
      primaryContact: data.pContactNumber ?? '',
      secondaryContact: data.pAlternativeNo ?? '',
      primaryEmail: data.pEmailId ?? '',
      secondaryEmail: data.pEmailId2 ?? '',
      // Flags
      fabricatedContact: this.toBool(data.is_fabricated_applicable),
      fabricatedContactComments: data.is_fabricated_comments ?? '',
      fabricatedContactDocument: data.fabricated_filename ?? '',
      paidGuarantor: this.toBool(data.is_paidguarantor_applicable),
      paidGuarantorComments: data.is_paidguarantor_comments ?? '',
      paidGuarantorDocument: data.paidguarantor_filename ?? '',
    });


    if (Array.isArray(data.pAddressList) && data.pAddressList.length > 0) {
      this.addressRows.set(data.pAddressList.map((a: any) => ({
        // isPrimary: true,
        isPrimary: this.toBool(a.pAddressPriority),
        type: a.pAddressType ?? '',
        addressLine: a.pAddress1 ?? '',
        area: a.pAddress2 ?? '',
        city: a.pCity ?? '',
        country: a.pCountry ?? '',
        countryId: a.pCountryId ?? null,
        state: a.pState ?? '',
        stateId: a.pStateId ?? null,
        district: a.pDistrict ?? '',
        districtId: a.pDistrictId ?? null,
        pincode: a.pPinCode ?? '',
        plongitude: a.longitude || null,
        platitude: a.latitude || null,
      })));
    }

    // 6. Business contact persons
    if (Array.isArray(data.pbusinessList) && data.pbusinessList.length > 0) {
      this.contactPersons.set(data.pbusinessList.map((p: any) => ({
        contact: p.pContactName ?? '',
        designation: p.designationname ?? '',
      })));
    }

    // 7. Bank — from referralbankdetailslist
    if (Array.isArray(data.referralbankdetailslist) && data.referralbankdetailslist.length > 0) {
      const bank =
        data.referralbankdetailslist.find((b: any) => b.pIsprimaryAccount) ??
        data.referralbankdetailslist[0];
      this.form.patchValue({
        bankName: bank.pBankName ?? '',
        bankBranch: bank.pBankBranch ?? '',
        accountHolderName: bank.pBankAccountname ?? '',
        accountNo: bank.pBankAccountNo ?? '',
        ifscCode: bank.pBankifscCode ?? '',
      });
    }

    // 8. KYC — from documentstorelist
    if (Array.isArray(data.documentstorelist) && data.documentstorelist.length > 0) {
      const kyc = data.documentstorelist[0];
      this.form.patchValue({
        kycDocumentType: kyc.pDocumentGroup ?? '',
        kycDocumentNo: kyc.pDocReferenceno ?? '',
      });
    }

    this.activeSection.set('personal');
  }

  private toBool(val: any): boolean {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
    if (typeof val === 'number') return val === 1;
    return false;
  }

  buildForm() {
    this.form = this.fb.group({
      // Individual
      addressType: [null, Validators.required],
      addressLine: [null, Validators.required],
      area: [null, Validators.required],
      city: [null, Validators.required],
      country: [null, Validators.required],
      state: [null, Validators.required],
      district: [null, Validators.required],
      pincode: [null, Validators.required],
      salutation: [null],
      firstName: ['', Validators.required],
      surName: [''],
      mailingName: [''],
      gender: ['Male', Validators.required],
      fatherSalutation: [null],
      fatherName: ['', Validators.required],
      dob: [null],
      age: [''],
      panCard: [''],
      aadharCard: [''],
      cntNo: [''],
      // Business
      enterpriseName: ['', Validators.required],
      enterpriseEmail: [''],
      enterpriseContact: ['', Validators.required],
      enterprisePan: ['',],
      enterpriseType: [null],
      businessNature: [null],
      // Contact Info
      primaryContact: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      secondaryContact: [''],
      primaryEmail: ['', Validators.email],
      secondaryEmail: ['', Validators.email],
      // Flags
      kycDocumentType: [null, Validators.required],
      kycDocumentName: [null, Validators.required],
      kycReferenceNo: ['', Validators.required],
      kycIssuedDate: [null],
      kycExpiryDate: [null],
      kycStatus: ['Pending'],
      kycRemarks: [''],
      bankName: [null, Validators.required],
      bankBranch: [''],
      accountHolderName: [''],
      accountNo: ['', Validators.required],
      accountType: [null],
      ifscCode: ['', Validators.required],
      upiId: [''],
      fabricatedContact: [false],
      fabricatedContactComments: [''],
      fabricatedContactDocument: [''],
      paidGuarantor: [false],
      paidGuarantorComments: [''],
      paidGuarantorDocument: [''],
      contactPerson: [null, Validators.required],
      contactPersonDesignation: [null, Validators.required],
    });
  }

  patchForm(c: Contact) {
    this.form.patchValue({
      firstName: c.name,
      primaryContact: c.phone,
    });
  }

  setContactType(type: ContactType) {
    this.contactType.set(type);
    this.loadAddressTypes(type);
  }

  goNextSection() {
    this.activeSection.set(this.getAdjacentSection(1));
  }

  goPreviousSection() {
    this.activeSection.set(this.getAdjacentSection(-1));
  }

  // Address management
  emptyAddress(): Address {
    return {
      isPrimary: false, type: '', addressLine: '', area: '',
      city: '', country: '', countryId: null, state: '', stateId: null,
      district: '', districtId: null, pincode: '', longitude: '', latitude: ''
    };
  }


  addAddress() {
    const addressControls = ['addressLine', 'area', 'city', 'addressType', 'country', 'state', 'district', 'pincode', 'latitude', 'longitude'];
    addressControls.forEach(key => this.form.get(key)?.markAsTouched());

    const v = this.form.value;
    if (!v.addressLine || !v.city || !v.state || !v.district || !v.pincode) return;

    const newAddr: Address = {
      isPrimary: this.addressRows().length === 0,
      type: v.addressType ?? '',
      addressLine: v.addressLine ?? '',
      area: v.area ?? '',
      city: v.city ?? '',
      country: v.country ?? '',
      countryId: this.currentAddress.countryId,
      state: v.state ?? '',
      stateId: this.currentAddress.stateId,
      district: v.district ?? '',
      districtId: this.currentAddress.districtId,
      pincode: v.pincode ?? '',
      longitude: this.currentAddress.longitude,
      latitude: this.currentAddress.latitude,
    };

    this.addressRows.update(list => [...list, newAddr]);

    this.form.patchValue({
      addressLine: null, area: null, city: null,
      addressType: null, country: null, state: null,
      district: null, pincode: null, longitude: null, latitude: null
    });

    addressControls.forEach(key => this.form.get(key)?.markAsUntouched());

    this.currentAddress = this.emptyAddress();
    this.states = [];
    this.districts = [];
  }



  removeAddress(idx: number) {
    this.addressRows.update(list => list.filter((_, i) => i !== idx));
  }

  setPrimaryAddress(idx: number) {
    debugger
    this.addressRows.update(list => list.map((a, i) => ({ ...a, isPrimary: i === idx })));
  }


  removeContactPerson(idx: number) {
    this.contactPersons.update(list => list.filter((_, i) => i !== idx));
  }

  // Photo upload
  onPhotoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => this.photoPreview.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }


  clearForm() {
    this.form.reset();
    this.form.patchValue({
      salutation: 'Mr.',
      gender: 'Male',
      fatherSalutation: 'Mr.',
      kycStatus: 'Pending',
    });
    this.addressRows.set([]);
    this.contactPersons.set([]);
    this.photoPreview.set(null);
    this.currentAddress = this.emptyAddress();
    this.states = [];
    this.districts = [];
    this.activeSection.set('personal');
    this.bankRows.set([]);
  }

  onFlagDocumentChange(event: Event, controlName: 'fabricatedContactDocument' | 'paidGuarantorDocument') {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.form.get(controlName)?.setValue(file?.name || '');
  }



  addBank() {
    const bankControls = ['bankName', 'accountNo', 'ifscCode'];
    bankControls.forEach(key => this.form.get(key)?.markAsTouched());

    const v = this.form.value;
    if (!v.bankName || !v.accountNo || !v.ifscCode) return;

    const newBank: BankDetail = {
      isPrimary: this.bankRows().length === 0,
      bankId: v.bankName?.bankId ?? null,
      bankName: v.bankName?.bankName ?? (typeof v.bankName === 'string' ? v.bankName : ''),
      accountNo: v.accountNo ?? '',
      ifscCode: v.ifscCode ?? '',
      branch: v.bankBranch ?? '',
      accountHolderName: v.accountHolderName ?? '',
      accountType: v.accountType ?? '',
      upiId: v.upiId ?? '',
    };

    this.bankRows.update(list => [...list, newBank]);

    this.form.patchValue({
      bankName: null, bankBranch: '', accountHolderName: '',
      accountNo: '', accountType: null, ifscCode: '', upiId: '',

    });
    bankControls.forEach(key => this.form.get(key)?.markAsUntouched());
  }

  removeBank(idx: number) {
    this.bankRows.update(list => {
      const updated = list.filter((_, i) => i !== idx);
      if (updated.length > 0 && !updated.some(b => b.isPrimary)) {
        updated[0] = { ...updated[0], isPrimary: true };
      }
      return updated;
    });
  }

  setPrimaryBank(idx: number) {
    this.bankRows.update(list => list.map((b, i) => ({ ...b, isPrimary: i === idx })));
  }


  saveContact() {
    debugger
    // if (this.form.invalid) {
    //   this.form.markAllAsTouched();
    //   return;
    // }

    const v = this.form.value;
    const branchId = this.commonService.getbrachid();
    const schemaName = this.commonService.getschemaname();
    const fullName = `${v.firstName || ''} ${v.surName || ''}`.trim();

    const auditFields = {
      pCreatedby: branchId,
      pStatusid: 1,
      pStatusname: 'Active',
      ptypeofoperation: 'INSERT',
      pipaddress: '127.0.0.1',
      pactivitytype: 'CREATE',
      currencyformat: 'INR',
      dateformat: 'dd/MM/yyyy',
      schemaname: schemaName,
      preleasetype: 'LIVE',
      branch_id: branchId,
      ppayrollbranchid: 1,
    };

    const payload = {
      ...auditFields,
      global_schema: schemaName,
      company_code: this.commonService.getCompanyCode(),
      branch_code: this.commonService.getBranchCode(),
      samebranchcode: this.commonService.getBranchCode(),
      schemaid: 1,
      pContactId: 0,
      pTitleName: v.salutation || null,
      rTitleName: v.fatherSalutation || null,
      pContactTitilesid: 1,
      pName: this.isIndividual ? v.firstName : v.enterpriseName,
      pSurName: v.surName || null,
      pContactName: this.isIndividual ? fullName : v.enterpriseName,
      pContactimagepath: null,
      pReferenceId: null,
      pPhoto: null,
      pFatherName: v.fatherName || null,
      pSpouseName: null,
      pcontactmailingname: v.mailingName || null,
      pRoleid: 1,
      pRolename: 'Customer',
      pContactTypeId: this.contactType() === 'Individual' ? 1 : 2,
      pContactType: this.contactType(),
      pcontactexistingstatus: false,
      pDob: v.dob ? new Date(v.dob).toISOString().split('T')[0] : null,
      pAge: v.age ? Number(v.age) : null,
      pGender: v.gender || null,
      pGenderCode: v.gender === 'Male' ? 'M' : v.gender === 'Female' ? 'F' : null,
      pIsPanNoAvailable: !!v.panCard,
      pPanNumber: v.panCard || null,
      ppancardno: v.panCard || null,
      pContactNumber: v.primaryContact || null,
      pAlternativeNo: v.secondaryContact || null,
      pEmailId: v.primaryEmail || null,
      pEmailId2: v.secondaryEmail || null,
      pBusinesscontactreferenceid: null,
      pBusinesscontactName: v.enterpriseName || null,
      pBusinesstype: v.businessNature || null,
      pEnterpriseTypeId: null,
      pBusinesstypeId: null,
      pEnterpriseType: v.enterpriseType || null,
      pBusinessEntityEmailid: v.enterpriseEmail || null,
      pBusinessEntityContactno: v.enterpriseContact || null,
      is_fabricated_applicable: v.fabricatedContact === true,
      is_fabricated_comments: v.fabricatedContactComments || null,
      fabricated_filename: null,
      is_paidguarantor_applicable: v.paidGuarantor === true,
      is_paidguarantor_comments: v.paidGuarantorComments || null,
      paidguarantor_filename: null,

      pAddressList: this.addressRows().map((a: any, index: number) => ({
        pRecordId: 0,
        pAddressTypeID: 1,
        pAddressType: a.type || null,
        pAddress1: a.addressLine || null,
        pAddress2: a.area || null,
        pState: a.state || null,
        pStateId: a.stateId ?? null,
        pDistrict: a.district || null,
        pDistrictId: a.districtId ?? null,
        pCity: a.city || null,
        pCountry: a.country || null,
        pCountryId: a.countryId ?? null,
        pPinCode: a.pincode || null,
        plongitude: a.longitude || null,
        platitude: a.latitude || null,
        pAddressPriority: index === 0 ? 1 : 2,
        ptypeofoperation: 'INSERT',
        pAddressDetails: `${a.addressLine || ''} ${a.city || ''} ${a.state || ''}`.trim() || null,
      })),

      pcontactdetailslist: [
        {
          ...auditFields,
          pbranchid: branchId,
          pContactNumber: v.primaryContact || null,
          pPriority: 1,
        },
      ],

      pEmailidsList: [
        {
          ...auditFields,
          pbranchid: branchId,
          pRecordId: 0,
          pEmailId: v.primaryEmail || null,
          pPriority: 1,
          pContactNumber: v.primaryContact || null,
          pContactName: fullName || null,
        },
      ],

      pEnterpriseTypelist: v.enterpriseType ? [
        {
          ...auditFields,
          pEnterpriseType: v.enterpriseType,
          pEnterpriseTypeId: null,
        },
      ] : [],

      pBusinesstypelist: v.businessNature ? [
        {
          ...auditFields,
          pBusinesstype: v.businessNature,
        },
      ] : [],

      documentstorelist: v.kycDocumentNo ? [
        {
          ...auditFields,
          contactdocumentsid: 0,
          pDocumentId: 0,
          pDocumentGroupId: v.kycDocumentType?.pDocumentGroupId ?? null,
          pDocumentGroup: v.kycDocumentType?.pDocumentGroup || null,
          pDocumentName: v.kycDocumentName?.pDocumentName || null,
          pDocStorePath: null,
          pDocFileType: 'pdf',
          pDocReferenceno: v.kycDocumentNo || null,
          pDocIsDownloadable: true,
          pDocumentReferenceMonth: null,
          pDocumentReferenceYear: null,
          pFilename: v.fabricatedContactDocument || v.paidGuarantorDocument || null,
          pVerificationoperation: null,
          psubsectionname: null,
          IsVerified: false,
          pDocstoreId: 0,
          pContactId: 0,
          pLoanId: 0,
          pApplicationNo: null,
          pName: fullName || null,
          pContactType: this.contactType(),
          pTransactionType: null,
          pApplicanttype: null,
          pContactreferenceid: null,
          pisapplicable: true,
        },
      ] : [],

      referralbankdetailslist: this.bankRows().map(b => ({
        ...auditFields,
        pContactId: 0,
        precordid: 0,
        pBankAccountname: b.accountHolderName || '',
        pBankId: b.bankId ?? null,
        pBankName: b.bankName || '',
        pBankAccountNo: b.accountNo || '',
        pBankifscCode: b.ifscCode || '',
        pBankBranch: b.branch || '',
        pIsprimaryAccount: b.isPrimary,
        pContactbankId: 0,
      })),

      pbusinessList: this.contactPersons().map((p: any, index: number) => ({
        precordid: 0,
        pContactId: 0,
        pContactName: p.contact || null,
        designationid: null,
        designationname: p.designation || null,
        pBusinessPriority: index + 1,
        pstatus: 'Active',
        ptypeofoperation: 'INSERT',
      })),

      pBusinessContactlist: [],
    };

    this.isSaving.set(true);
    this.saveError.set(null);

    this.contactMasterService.saveContact(payload).subscribe({
      next: () => {
        this.isSaving.set(false);

        const saved: Contact = {
          id: this.contact?.id ?? '',
          uid: this.contact?.uid ?? '',
          name: this.contactType() === 'Individual'
            ? `${v.salutation} ${v.firstName} ${v.surName}`.trim()
            : v.enterpriseName,
          relation: this.contactType() === 'Individual'
            ? `S/o - ${v.fatherName}`
            : '',
          phone: v.primaryContact,
          address: this.addressRows()[0]
            ? `${this.addressRows()[0].addressLine}, ${this.addressRows()[0].city}`
            : '',
          status: 'Active',
          photo: this.photoPreview() ?? undefined,
          type: this.contact?.type ?? 'Contacts',
        };

        this.onSave.emit(saved);
      },

      error: (err) => {
        this.isSaving.set(false);
        console.error(err);
        this.saveError.set(
          err?.error?.title ||
          err?.message ||
          'Failed to save contact. Please try again.'
        );
      },
    });
  }




  close() {
    this.onClose.emit();
  }

  get isIndividual() { return this.contactType() === 'Individual'; }

  get isFirstSection() { return this.activeSection() === 'personal'; }

  get isLastSection() { return this.activeSection() === 'others'; }

  private getAdjacentSection(direction: 1 | -1): ContactSection {
    const sections: ContactSection[] = ['personal', 'address', 'kyc', 'bank', 'others'];
    const currentIndex = sections.indexOf(this.activeSection());
    const nextIndex = Math.min(Math.max(currentIndex + direction, 0), sections.length - 1);
    return sections[nextIndex];
  }

  private mapGender(gender: string): string {
    switch ((gender || '').toUpperCase()) {
      case 'M':
        return 'Male';

      case 'F':
        return 'Female';

      case 'T':
        return 'Third Gender';

      default:
        return '';
    }
  }

}
