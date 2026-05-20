import {
  Component, OnInit, Input, Output, EventEmitter,
  signal, computed, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Contact } from '../contacts-list/contacts-list.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { CommonService } from '../../../core/services/Common/common.service';

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
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Contact>();

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
  kycDocumentTypes = ['PAN Card', 'Aadhar Card', 'Passport', 'Voter ID', 'Driving License', 'GST Certificate'];
  kycStatuses = ['Pending', 'Verified', 'Rejected'];
  bankAccountTypes = ['Savings', 'Current', 'Cash Credit', 'Overdraft', 'NRE', 'NRO'];
  salutations = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'];
  addressTypes = ['Home', 'Office', 'Permanent', 'Temporary', 'Other'];
  enterpriseTypes = ['Private Limited', 'Public Limited', 'Partnership', 'LLP', 'Proprietorship', 'Trust', 'Society'];
  businessNatures = ['Manufacturing', 'Trading', 'Services', 'Agriculture', 'Retail', 'Wholesale', 'Other'];
  countries: any[] = [];
  states: any[] = [];
  districts: any[] = [];

  constructor(private fb: FormBuilder, private commonService: CommonService) { }

  ngOnInit() {
    this.buildForm();
    this.loadCountries();
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
    if (changes['contact'] && this.form) {
      if (this.contact) {
        this.patchForm(this.contact);
      } else {
        this.form.reset();
      }
    }
  }

  buildForm() {
    this.form = this.fb.group({
      // Individual
      salutation: ['Mr.'],
      firstName: ['', Validators.required],
      surName: [''],
      mailingName: [''],
      gender: ['Male', Validators.required],
      fatherSalutation: ['Mr.'],
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
}
