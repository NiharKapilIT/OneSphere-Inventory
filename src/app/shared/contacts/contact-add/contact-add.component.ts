import {
  Component, OnInit, Input, Output, EventEmitter,
  signal, computed, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Contact, ContactTab } from '../contacts-list/contacts-list.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { CommonService } from '../../../core/services/Common/common.service';
import { ContactMasterService } from '../../../core/services/contacts/contact-master.service';
import { forkJoin } from 'rxjs';

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
  designation: string;
}

@Component({
  selector: 'app-contact-add',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule, DatePickerModule],
  templateUrl: './contact-add.component.html',
  styleUrl: './contact-add.component.scss',
})
export class ContactAddComponent implements OnInit, OnChanges {
  @Input() contact: Contact | null = null;
  @Input() activeTab: ContactTab = 'Contacts';
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Contact>();

  private readonly tabMap: Record<ContactTab, string> = {
    'Contacts':              'Contacts',
    'Subscriber / Customer': 'Referrals',
    'Employee':              'Employees',
    'Supplier / Vendor':     'Suppliers',
    'Advocate':              'Advocates',
    'Channel Partner':       'Referrals',
    'Freelancer':            'Freelancer',
  };

  contactType = signal<ContactType>('Individual');
  activeSection = signal<ContactSection>('personal');

  form!: FormGroup;

  // Address table
  addressRows = signal<Address[]>([]);
  currentAddress: Address = this.emptyAddress();

  // Contact persons (Business)
  contactPersons = signal<ContactPerson[]>([]);
  currentContactPerson: ContactPerson = { contact: '', designation: '' };

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
    if (state) {
      this.commonService.getDistricts(state.tbl_mst_state_id).subscribe({
        next: (data) => { this.districts = data; },
        error: () => { this.districts = []; }
      });
    }
  }

  onDistrictChange(district: any) {
    this.currentAddress.districtId = district?.tbl_mst_district_id ?? null;
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
      age: data.pAge ?? '',
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

    // 5. Address rows
    if (Array.isArray(data.pAddressList) && data.pAddressList.length > 0) {
      this.addressRows.set(data.pAddressList.map((a: any) => ({
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
        longitude: a.plongitude ?? '',
        latitude: a.platitude ?? '',
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
      salutation: [''],
      firstName: ['', Validators.required],
      surName: [''],
      mailingName: [''],
      gender: ['Male', Validators.required],
      fatherSalutation: [''],
      fatherName: ['', Validators.required],
      dob: [null],
      age: [''],
      panCard: [''],
      aadharCard: [''],
      cntNo: [''],
      // Business
      enterpriseName: [''],
      enterpriseEmail: [''],
      enterpriseContact: [''],
      enterprisePan: [''],
      enterpriseType: [''],
      businessNature: [''],
      // Contact Info
      primaryContact: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      secondaryContact: [''],
      primaryEmail: ['', Validators.email],
      secondaryEmail: ['', Validators.email],
      // Flags
      kycDocumentType: [''],
      kycDocumentName: [''],
      kycDocumentNo: [''],
      kycIssuedDate: [null],
      kycExpiryDate: [null],
      kycStatus: ['Pending'],
      kycRemarks: [''],
      bankName: [''],
      bankBranch: [''],
      accountHolderName: [''],
      accountNo: [''],
      accountType: [''],
      ifscCode: [''],
      upiId: [''],
      fabricatedContact: [false],
      fabricatedContactComments: [''],
      fabricatedContactDocument: [''],
      paidGuarantor: [false],
      paidGuarantorComments: [''],
      paidGuarantorDocument: [''],
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
    if (!this.currentAddress.addressLine && !this.currentAddress.city) return;
    const rows = this.addressRows();
    const newAddr = { ...this.currentAddress };
    if (rows.length === 0) newAddr.isPrimary = true;
    this.addressRows.update(list => [...list, newAddr]);
    this.currentAddress = this.emptyAddress();
    this.states = [];
    this.districts = [];
  }

  removeAddress(idx: number) {
    this.addressRows.update(list => list.filter((_, i) => i !== idx));
  }

  setPrimaryAddress(idx: number) {
    this.addressRows.update(list => list.map((a, i) => ({ ...a, isPrimary: i === idx })));
  }

  // Contact persons
  addContactPerson() {
    if (!this.currentContactPerson.contact) return;
    this.contactPersons.update(list => [...list, { ...this.currentContactPerson }]);
    this.currentContactPerson = { contact: '', designation: '' };
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
    this.activeSection.set('personal');
  }

  onFlagDocumentChange(event: Event, controlName: 'fabricatedContactDocument' | 'paidGuarantorDocument') {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.form.get(controlName)?.setValue(file?.name || '');
  }

  saveContact() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    const payload = {
      GlobalSchema: this.commonService.getschemaname(),
      CompanyCode: this.commonService.getCompanyCode(),
      Tab: this.tabMap[this.activeTab],
      ContactType: this.contactType(),
      // Individual
      Salutation: v.salutation,
      FirstName: v.firstName,
      SurName: v.surName,
      MailingName: v.mailingName,
      Gender: v.gender,
      FatherSalutation: v.fatherSalutation,
      FatherName: v.fatherName,
      DOB: v.dob,
      Age: v.age,
      PANCard: v.panCard,
      AadharCard: v.aadharCard,
      CNTNo: v.cntNo,
      // Business
      EnterpriseName: v.enterpriseName,
      EnterpriseEmail: v.enterpriseEmail,
      EnterpriseContact: v.enterpriseContact,
      EnterprisePAN: v.enterprisePan,
      EnterpriseType: v.enterpriseType,
      BusinessNature: v.businessNature,
      // Contact info
      PrimaryContact: v.primaryContact,
      SecondaryContact: v.secondaryContact,
      PrimaryEmail: v.primaryEmail,
      SecondaryEmail: v.secondaryEmail,
      // KYC
      KYCDocumentType: v.kycDocumentType,
      KYCDocumentName: v.kycDocumentName,
      KYCDocumentNo: v.kycDocumentNo,
      KYCIssuedDate: v.kycIssuedDate,
      KYCExpiryDate: v.kycExpiryDate,
      KYCStatus: v.kycStatus,
      KYCRemarks: v.kycRemarks,
      // Bank
      BankName: v.bankName,
      BankBranch: v.bankBranch,
      AccountHolderName: v.accountHolderName,
      AccountNo: v.accountNo,
      AccountType: v.accountType,
      IFSCCode: v.ifscCode,
      UPIId: v.upiId,
      // Flags
      FabricatedContact: v.fabricatedContact,
      FabricatedContactComments: v.fabricatedContactComments,
      PaidGuarantor: v.paidGuarantor,
      PaidGuarantorComments: v.paidGuarantorComments,
      // Address & contact persons
      Addresses: this.addressRows(),
      ContactPersons: this.contactPersons(),
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
          relation: this.contactType() === 'Individual' ? `S/o - ${v.fatherName}` : '',
          phone: v.primaryContact,
          address: this.addressRows()[0]
            ? `${this.addressRows()[0].addressLine},${this.addressRows()[0].city}` : '',
          status: 'Active',
          photo: this.photoPreview() ?? undefined,
          type: this.contact?.type ?? 'Contacts',
        };
        this.onSave.emit(saved);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.saveError.set(err?.message ?? 'Failed to save contact. Please try again.');
      }
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
