// import { CommonModule } from '@angular/common';
// import { Component, Input, inject, signal } from '@angular/core';
// import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
// import { NgSelectModule } from '@ng-select/ng-select';
// import { DatePickerModule } from 'primeng/datepicker';
// import { TableModule } from 'primeng/table';
// import { ButtonModule } from 'primeng/button';
// import { SharedModule } from 'primeng/api';

// type EmployeeTab =
//   | 'General Information'
//   | 'Family Details'
//   | 'Education'
//   | 'Previous Experience Details'
//   | 'Kapil Career'
//   | 'Department Training'
//   | 'Employee Documents';

// @Component({
//   selector: 'app-employee-details',
//   standalone: true,
//   imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule, DatePickerModule, TableModule, ButtonModule, SharedModule],
//   templateUrl: './employee-details.component.html',
//   styleUrl: './employee-details.component.scss',
// })
// export class EmployeeDetailsComponent {
//   @Input() contact: any = null;

//   private fb = inject(FormBuilder);

//   pDatepickerMaxDate: Date = new Date();

//   tabs: EmployeeTab[] = [
//     'General Information',
//     'Family Details',
//     'Education',
//     'Previous Experience Details',
//     'Kapil Career',
//     'Department Training',
//     'Employee Documents',
//   ];
//   activeTab = signal<EmployeeTab>('General Information');

//   designations = ['Manager', 'Executive', 'Officer', 'Accountant', 'Field Staff'];
//   roles = ['Admin', 'Branch User', 'Cashier', 'Collector', 'Manager'];
//   branches = ['HABSIGUDA-2-CAO', 'Hyderabad', 'Vijayawada', 'Warangal'];
//   countries = ['India', 'United States', 'United Kingdom', 'Australia'];
//   communities = ['General', 'BC', 'SC', 'ST', 'OC'];
//   relationships = ['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Brother', 'Sister'];
//   educationOptions = ['SSC', 'Intermediate', 'Degree', 'Post Graduation', 'Professional'];
//   bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
//   joinedAsOptions = ['New Joining', 'Transfer', 'Promotion', 'Rejoining'];
//   documentTypes = ['Identity Proof', 'Address Proof', 'Education Proof', 'Experience Proof', 'Other'];
//   documentNames = ['Aadhar Card', 'PAN Card', 'Passport', 'Driving License', 'Certificate'];

//   form: FormGroup = this.fb.group({
//     // Employment & Salary
//     designation: [null],
//     role: [null],
//     branch: [null],
//     basicSalary: [''],
//     allowance: [''],
//     payrollEligible: [false],
//     // Personal Details
//     residentialStatus: ['Resident'],
//     placeOfBirth: [''],
//     countryOfBirth: [null],
//     nationality: [''],
//     community: [null],
//     maritalStatus: ['Married'],
//     // General Information tab
//     esiEligible: [false],
//     pfEligible: [false],
//     khcNo: [''],
//     passportNo: [''],
//     panNo: [''],
//     drivingLicenseNo: [''],
//     department: [''],
//     joinedAs: [null],
//     joinDate: [null],
//     dateOfReporting: [null],
//     dojInThisBranch: [null],
//     earnedLeavesBranch: [null],
//     prevEarnedLeavesClaimDate: [null],
//     bloodGroup: [null],
//     uanNumber: [''],
//     healthProblems: [''],
//     physicalHandicap: [false],
//     // Family Details entry
//     familyRelationship: [null],
//     familyName: [''],
//     familyDob: [null],
//     familyAge: [''],
//     familyGender: ['Male'],
//     familyMartialStatus: ['Married'],
//     familyEducation: [null],
//     familyOccupation: [''],
//     familyPhone: [''],
//     // Education entry
//     course: [''],
//     educationGroup: [''],
//     college: [''],
//     educationPlace: [''],
//     year: [''],
//     marks: [''],
//     // Previous Experience entry
//     orgName: [''],
//     expDesignation: [null],
//     expFromDate: [null],
//     expToDate: [null],
//     lastPay: [''],
//     reasonForLeaving: [''],
//     // Kapil Career entry
//     company: [''],
//     careerDesignation: [null],
//     careerFromDate: [null],
//     careerToDate: [null],
//     sscNo: [''],
//     reasonForTransfer: [''],
//     // Department Training entry
//     courseName: [''],
//     trainingDate: [null],
//     disciplinaryActions: [''],
//     extraCurricular: [''],
//     // Employee Documents entry
//     docType: [null],
//     docName: [null],
//     refNo: [''],
//   });

//   familyMembers = signal<any[]>([]);
//   educationList = signal<any[]>([]);
//   experienceList = signal<any[]>([]);
//   careerList = signal<any[]>([]);
//   trainingList = signal<any[]>([]);
//   documentsList = signal<any[]>([]);

//   setActiveTab(tab: EmployeeTab) {
//     this.activeTab.set(tab);
//   }

//   deleteRow(list: any, index: number) {
//     list.update((items: any[]) => items.filter((_: any, i: number) => i !== index));
//   }
//   saveEmployee() {
//   debugger;

//   if (this.form.invalid) {
//     this.form.markAllAsTouched();
//     return;
//   }

//   const payload = {
//     contactId: this.contact?.id,
//     ...this.form.getRawValue(),
//     familyMembers: this.familyMembers(),
//     educationList: this.educationList(),
//     experienceList: this.experienceList(),
//     careerList: this.careerList(),
//     trainingList: this.trainingList(),
//     documentsList: this.documentsList()
//   };

//   console.log('Employee Payload', payload);

//   // API CALL
//   // this.contactMasterService.saveEmployeeDetails(payload).subscribe({
//   //   next: (res) => {
//   //     console.log(res);
//   //   }
//   // });

// }
// }
import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, SimpleChanges, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SharedModule } from 'primeng/api';
import { ContactMasterService } from '../../../core/services/contacts/contact-master.service';
import { CommonService } from '../../../core/services/Common/common.service';

type EmployeeTab =
  | 'General Information'
  | 'Family Details'
  | 'Education'
  | 'Previous Experience Details'
  | 'Kapil Career'
  | 'Department Training'
  | 'Employee Documents';

@Component({
  selector: 'app-employee-details',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    NgSelectModule, DatePickerModule, TableModule,
    ButtonModule, SharedModule
  ],
  templateUrl: './employee-details.component.html',
  styleUrl: './employee-details.component.scss',
})
export class EmployeeDetailsComponent implements OnInit, OnChanges {

  @Input() contact: any = null;
  @Input() triggerSave: boolean = false;
  @Output() onSaveSuccess = new EventEmitter<void>();

  private fb                   = inject(FormBuilder);
  private contactMasterService = inject(ContactMasterService);
  private _commonService       = inject(CommonService);

  // ── Meta ──────────────────────────────────────────────────────────────────
  pDatepickerMaxDate: Date = new Date();
  buttonName  = 'Save';
  isLoading   = false;
  ctc         = 0;
  currencysymbol: any;

  // ── Dropdown lists ────────────────────────────────────────────────────────
  lstDesignation:   any[] = [];
  rolesList:        any[] = [];
  Branchlist:       any[] = [];
  relationshipList: any[] = [];
  qualificationlist:any[] = [];
  countryDetails:   any[] = [];
  groupDetails:     any[] = [];
  kycDocumentType:  any[] = [];
  lstbloodgroup = [
    { bloodgroup: 'A+',  bloodgroupid: 'A+'  },
    { bloodgroup: 'A-',  bloodgroupid: 'A-'  },
    { bloodgroup: 'B+',  bloodgroupid: 'B+'  },
    { bloodgroup: 'B-',  bloodgroupid: 'B-'  },
    { bloodgroup: 'O+',  bloodgroupid: 'O+'  },
    { bloodgroup: 'O-',  bloodgroupid: 'O-'  },
    { bloodgroup: 'AB+', bloodgroupid: 'AB+' },
    { bloodgroup: 'AB-', bloodgroupid: 'AB-' },
  ];

  // ── Sub-list arrays (mirrors old lstemployess, lsteducation …) ────────────
  lstemployess:     any[] = [];
  lsteducation:     any[] = [];
  lstpreviousexp:   any[] = [];
  lstkapilcarrer:   any[] = [];
  lsttrainigdetails:any[] = [];
  ngxgriddata:      any[] = [];

  // ── Transaction-type flags ────────────────────────────────────────────────
  familydetailsTransType        = 'Add';
  EducationControlsTransType    = 'Add';
  priviousexpControlsTransType  = 'Add';
  KapilCareercontrolsTransType  = 'Add';
  TrainingcontrolsTransType     = 'Add';

  familyindex    = 0;
  educationindex = 0;
  prvexpindex    = 0;
  carrerindex    = 0;
  trainingindex  = 0;

  // ── Toggle flags ──────────────────────────────────────────────────────────
  showesi            = false;
  showpf             = false;
  showhealthproblems = false;
  disablepanno       = false;

  // ── File upload refs ──────────────────────────────────────────────────────
  imageResponse:          any;
  imageResponse_Employee: any;
  kycFileName:            any;
  kycFilePath:            any;

  // ── Validation map ────────────────────────────────────────────────────────
  EmployeeDetailsValidation: any = {};

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabs: EmployeeTab[] = [
    'General Information',
    'Family Details',
    'Education',
    'Previous Experience Details',
    'Kapil Career',
    'Department Training',
    'Employee Documents',
  ];
  activeTab = signal<EmployeeTab>('General Information');

  // ── Main form ─────────────────────────────────────────────────────────────
  form!: FormGroup;

  // ── Signals for p-table display ───────────────────────────────────────────
  familyMembers  = signal<any[]>([]);
  educationList  = signal<any[]>([]);
  experienceList = signal<any[]>([]);
  careerList     = signal<any[]>([]);
  trainingList   = signal<any[]>([]);
  documentsList  = signal<any[]>([]);
  communities: string[]=[];

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit() {
    this.currencysymbol = this._commonService.datePickerPropertiesSetup('currencysymbol');
    this.buildForm();
    this.loadDropdowns();
    this.communities= [
  'Hindu',
  'Muslim',
  'Christian',
  'Sikh',
  'Buddhist',
  'Jain',
  'Parsi',
  'Jewish',
  'Bahai',
  'Tribal',
  'Other'
];

    if (this.contact?.id) {
      this.getSavedEmployeeDetails();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Triggered by parent ContactsListComponent pulsing triggerSave true
    if (changes['triggerSave']?.currentValue === true) {
      this.saveEmployee();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Form builder  (mirrors old contactEmployeeForm exactly)
  // ─────────────────────────────────────────────────────────────────────────

  buildForm() {
    this.form = this.fb.group({
      // identifiers
      precordid:                [''],
      pcontactid:               [this.contact?.id ?? ''],
      pemployeecode:            [''],
      pipaddress:               [this._commonService.getIpAddress()],
      pCreatedby:               [this._commonService.getCreatedBy()],
      schemaid:                 [this._commonService.getschemaname()],
      schemaname:               ['schemaname'],
      samebranchcode:           [this._commonService.getschemaname()],

      // salary
      pEmploymentBasicSalary:   ['', Validators.required],
      pEmploymentAllowanceORvda:['', Validators.required],
      pEmploymentCTC:           ['0'],

      // designation / role / branch
      mdesignationname:         [''],
      mdesignationid:           ['', Validators.required],
      pEmploymentRoleId:        ['', Validators.required],
      pEmploymentRoleName:      [''],
      branchid:                 ['', Validators.required],
      BranchName:               [''],
      payrolleligible:          [false],

      // personal
      presidentialstatus:       ['Resident'],
      pplaceofbirth:            [''],
      pCountryId:               [''],
      pnationality:             [''],
      pminoritycommunity:       [''],
      pmaritalstatus:           ['Married'],

      // general info tab
      pkhcno:                   [''],
      pesino:                   [''],
      ppfno:                    [''],
      pispf:                    [false],
      pisesi:                   [false],
      ppassportno:              [''],
      pBranchId:                [''],
      pBranchName:              [''],
      pIsPanNoAvailable:        [false],
      ppancardno:               ['', Validators.required],
      pdrivinglicienceno:       [''],
      pdepartment:              ['', Validators.required],
      pdateofreporting:         [new Date(), Validators.required],
      pdojinthisbranch:         [new Date(), Validators.required],
      pjoinedasid:              ['', Validators.required],
      pjoinedas:                [''],
      pjoindate:                [new Date(), Validators.required],
      ppreviouesearnedleavesdate:[''],
      pearnedleavesclaimbranch: [''],
      phealthproblems:          [''],
      bloodgroup:               [''],
      uan_number:               [''],
      pishandicaped:            [false],

      // training tab extras
      pdisciplinaryactions:     [''],
      pextracurricularactivities:[''],

      // file
      pDocStorePath:            [''],
      pFilename:                [''],
      pDocumentName:            [''],

      // nested sub-form groups (mirrors old FamilyControls, EducationControls …)
      FamilyControls:           this.addFamilyDetailsControls(),
      EducationControls:        this.addEducationDetailsControls(),
      priviousexpControls:      this.addPrvExpDetailsControls(),
      KapilCareercontrols:      this.addKapilCareerDetails(),
      Trainingcontrols:         this.addTrainingDetails(),
      EmployeeDocumentsControls:this.addEmployeeDocumentsDetails(),

      // FormArrays for final payload (mirrors old plstemployess …)
      plstemployess:            this.fb.array([]),
      plsteducation:            this.fb.array([]),
      plstpreviousexp:          this.fb.array([]),
      plstkapilcarrer:          this.fb.array([]),
      plsttrainigdetails:       this.fb.array([]),
      documentstorelist:        this.fb.array([]),
    });

    this.blurEventAllControls(this.form);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Sub-FormGroup builders  (exact mirror of old addFamilyDetailscontrlos …)
  // ─────────────────────────────────────────────────────────────────────────

  addFamilyDetailsControls(): FormGroup {
    return this.fb.group({
      precordid:        [''],
      relationshipid:   [''],
      relationshipname: ['', Validators.required],
      pname:            ['', Validators.required],
      pdateofbirth:     ['', Validators.required],
      page:             [''],
      pgender:          ['Male'],
      pmaritialstatus:  ['Married'],
      qualificationid:  [''],
      qualificationname:[''],
      poccupation:      [''],
      pphoneno:         [''],
      ptypeofoperation: [''],
    });
  }

  addEducationDetailsControls(): FormGroup {
    return this.fb.group({
      precordid:        [''],
      pcourse:          ['', Validators.required],
      pgroup:           ['', Validators.required],
      pschool:          ['', Validators.required],
      pplace:           ['', Validators.required],
      pyear:            [''],
      ppercentofmarks:  [''],
      ptypeofoperation: [''],
    });
  }

  addPrvExpDetailsControls(): FormGroup {
    return this.fb.group({
      precordid:          [''],
      porginazationname:  ['', Validators.required],
      pdesignationname:   ['', Validators.required],
      pdesignationid:     [''],
      pfromdate:          [''],
      ptodate:            [''],
      plastpay:           [''],
      preasonforleaving:  ['', Validators.required],
      ptypeofoperation:   [''],
    });
  }

  addKapilCareerDetails(): FormGroup {
    return this.fb.group({
      precordid:          [''],
      pcompanyname:       ['', Validators.required],
      designationname:    ['', Validators.required],
      designationid:      [''],
      pfromdate:          [''],
      ptodate:            [''],
      psscminutesno:      [''],
      preasonfortransfer: ['', Validators.required],
      ptypeofoperation:   [''],
    });
  }

  addTrainingDetails(): FormGroup {
    return this.fb.group({
      precordid:        [''],
      pcoursename:      ['', Validators.required],
      pdate:            ['', Validators.required],
      ptypeofoperation: [''],
    });
  }

  addEmployeeDocumentsDetails(): FormGroup {
    return this.fb.group({
      pDocumentId:      [null, Validators.required],
      pDocumentGroupId: [null, Validators.required],
      pDocumentGroup:   [''],
      pDocStorePath:    [''],
      pDocReferenceno:  ['', Validators.required],
      pDocumentName:    [''],
      ptypeofoperation: [''],
      pFilename:        [''],
      pDocIsDownloadable:[true],
      pDocstoreId:      [''],
      pipaddress:       [this._commonService.getIpAddress()],
      pCreatedby:       [this._commonService.getCreatedBy()],
      schemaid:         [this._commonService.getschemaname()],
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Load dropdowns from API  (mirrors old ngOnInit calls)
  // ─────────────────────────────────────────────────────────────────────────

  loadDropdowns() {
    this.contactMasterService.getDesignations().subscribe({
      next: (json: any[]) => { if (json) this.lstDesignation = json; },
      error: (err: any)  => this._commonService.showErrorMessage(err)
    });
    this.contactMasterService.getRoles().subscribe({
      next: (json: any[]) => { if (json) this.rolesList = json; },
      error: (err: any)  => this._commonService.showErrorMessage(err)
    });
    this.contactMasterService.getBranches().subscribe({
      next: (json: any[]) => { if (json) this.Branchlist = json; },
      error: (err: any)  => this._commonService.showErrorMessage(err)
    });
    this.contactMasterService.getRelationShip().subscribe({
      next: (json: any[]) => { if (json) this.relationshipList = json; },
      error: (err: any)  => this._commonService.showErrorMessage(err)
    });
    this.contactMasterService.getQualifications().subscribe({
      next: (json: any[]) => { if (json) this.qualificationlist = json; },
      error: (err: any)  => this._commonService.showErrorMessage(err)
    });
    this.contactMasterService.getCountryDetails(this._commonService.getschemaname()).subscribe({
      next: (json: any[]) => { if (json) this.countryDetails = json; },
      error: (err: any)  => this._commonService.showErrorMessage(err)
    });
    this.contactMasterService.getDocumentGroupNames().subscribe({
      next: (json: any[]) => { if (json) this.groupDetails = json; },
      error: (err: any)  => this._commonService.showErrorMessage(err)
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Load saved employee  (mirrors old getSavedEmployeeDetails)
  // ─────────────────────────────────────────────────────────────────────────

  getSavedEmployeeDetails() {
    const id     = this.contact?.id;
    const schema = this._commonService.getschemaname();

    this.contactMasterService.getContactDetailsEmployeeByID(id, schema).subscribe({
      next: (json: { precordid: any; pcontactid: any; pemployeecode: any; pEmploymentBasicSalary: string | number | null | undefined; pEmploymentAllowanceORvda: string | number | null | undefined; pEmploymentCTC: any; mdesignationid: string; mdesignationname: any; pEmploymentRoleId: string; pEmploymentRoleName: any; branchid: string; BranchName: any; payrolleligible: any; presidentialstatus: string; pplaceofbirth: any; pCountryId: any; pnationality: any; pminoritycommunity: any; pmaritalstatus: string; pkhcno: any; ppassportno: any; ppancardno: any; pdrivinglicienceno: any; pdepartment: any; pdateofreporting: any; pjoindate: any; pdojinthisbranch: any; pjoinedasid: string; pjoinedas: any; ppreviouesearnedleavesdate: any; pBranchId: string; pBranchName: any; bloodgroup: any; uan_number: any; pdisciplinaryactions: any; pextracurricularactivities: any; pDocStorePath: any; pisesi: any; pesino: any; pispf: any; ppfno: any; pishandicaped: any; phealthproblems: any; plstemployess: any[]; plsteducation: string | any[]; plstpreviousexp: any[]; plstkapilcarrer: any[]; plsttrainigdetails: any[]; documentstorelist: string | any[]; }) => {
        if (!json) return;

        this.buttonName = json.precordid ? 'Update' : 'Save';

        // ── Main form patch ──────────────────────────────────────────────
        this.form.patchValue({
          precordid:                  json.precordid,
          pcontactid:                 json.pcontactid,
          pemployeecode:              json.pemployeecode,
          pEmploymentBasicSalary:     this._commonService.currencyformat(json.pEmploymentBasicSalary),
          pEmploymentAllowanceORvda:  this._commonService.currencyformat(json.pEmploymentAllowanceORvda),
          pEmploymentCTC:             json.pEmploymentCTC,
          mdesignationid:             json.mdesignationid   ? parseInt(json.mdesignationid)   : '',
          mdesignationname:           json.mdesignationname,
          pEmploymentRoleId:          json.pEmploymentRoleId ? parseInt(json.pEmploymentRoleId) : '',
          pEmploymentRoleName:        json.pEmploymentRoleName,
          branchid:                   json.branchid         ? parseInt(json.branchid)          : '',
          BranchName:                 json.BranchName,
          payrolleligible:            json.payrolleligible  ?? false,
          presidentialstatus:         this.mapResidentialStatusIn(json.presidentialstatus),
          pplaceofbirth:              json.pplaceofbirth,
          pCountryId:                 json.pCountryId,
          pnationality:               json.pnationality,
          pminoritycommunity:         json.pminoritycommunity,
          pmaritalstatus:             this.mapMaritalStatusIn(json.pmaritalstatus),
          pkhcno:                     json.pkhcno,
          ppassportno:                json.ppassportno,
          ppancardno:                 json.ppancardno ?? '',
          pdrivinglicienceno:         json.pdrivinglicienceno,
          pdepartment:                json.pdepartment,
          pdateofreporting:           json.pdateofreporting
                                        ? this._commonService.getDateObjectFromDataBase(json.pdateofreporting)
                                        : new Date(),
          pjoindate:                  json.pjoindate
                                        ? this._commonService.getDateObjectFromDataBase(json.pjoindate)
                                        : new Date(),
          pdojinthisbranch:           json.pdojinthisbranch
                                        ? this._commonService.getDateObjectFromDataBase(json.pdojinthisbranch)
                                        : new Date(),
          pjoinedasid:                json.pjoinedasid ? parseInt(json.pjoinedasid) : '',
          pjoinedas:                  json.pjoinedas,
          ppreviouesearnedleavesdate: json.ppreviouesearnedleavesdate
                                        ? this._commonService.getDateObjectFromDataBase(json.ppreviouesearnedleavesdate)
                                        : '',
          pBranchId:                  json.pBranchId ? parseInt(json.pBranchId) : '',
          pBranchName:                json.pBranchName,
          bloodgroup:                 json.bloodgroup  ?? '',
          uan_number:                 json.uan_number,
          pdisciplinaryactions:       json.pdisciplinaryactions,
          pextracurricularactivities: json.pextracurricularactivities,
          pDocStorePath:              json.pDocStorePath ?? '',
        });

        // ── PAN disable ──────────────────────────────────────────────────
        if (json.ppancardno) {
          this.disablepanno = true;
          this.form.controls['pIsPanNoAvailable'].setValue(true);
        }

        // ── ESI ──────────────────────────────────────────────────────────
        if (json.pisesi) {
          this.showesi = true;
          this.form.controls['pisesi'].setValue(true);
          this.form.controls['pesino'].setValue(json.pesino);
          this.form.controls['pesino'].setValidators(Validators.required);
          this.form.controls['pesino'].updateValueAndValidity();
        }

        // ── PF ───────────────────────────────────────────────────────────
        if (json.pispf) {
          this.showpf = true;
          this.form.controls['pispf'].setValue(true);
          this.form.controls['ppfno'].setValue(json.ppfno);
          this.form.controls['ppfno'].setValidators(Validators.required);
          this.form.controls['ppfno'].updateValueAndValidity();
        }

        // ── Physical handicap ────────────────────────────────────────────
        if (json.pishandicaped) {
          this.showhealthproblems = true;
          this.form.controls['pishandicaped'].setValue(true);
          this.form.controls['phealthproblems'].setValue(json.phealthproblems);
          this.form.controls['phealthproblems'].setValidators(Validators.required);
          this.form.controls['phealthproblems'].updateValueAndValidity();
        }

        this.ctcCalculation();

        // ── Populate sub-lists ───────────────────────────────────────────
        if (json.plstemployess?.length) {
          this.lstemployess = json.plstemployess.map((item: any) => ({
            ...item,
            pdateofbirth: this._commonService.getDateObjectFromDataBase(item.pdateofbirth),
          }));
          this.familyMembers.set([...this.lstemployess]);
        }

        if (json.plsteducation?.length) {
          this.lsteducation = [...json.plsteducation];
          this.educationList.set([...this.lsteducation]);
        }

        if (json.plstpreviousexp?.length) {
          this.lstpreviousexp = json.plstpreviousexp.map((item: any) => ({
            ...item,
            pfromdate: this._commonService.getDateObjectFromDataBase(item.pfromdate),
            ptodate:   this._commonService.getDateObjectFromDataBase(item.ptodate),
          }));
          this.experienceList.set([...this.lstpreviousexp]);
        }

        if (json.plstkapilcarrer?.length) {
          this.lstkapilcarrer = json.plstkapilcarrer.map((item: any) => ({
            ...item,
            pfromdate: this._commonService.getDateObjectFromDataBase(item.pfromdate),
            ptodate:   this._commonService.getDateObjectFromDataBase(item.ptodate),
          }));
          this.careerList.set([...this.lstkapilcarrer]);
        }

        if (json.plsttrainigdetails?.length) {
          this.lsttrainigdetails = json.plsttrainigdetails.map((item: any) => ({
            ...item,
            pdate: this._commonService.getDateObjectFromDataBase(item.pdate),
          }));
          this.trainingList.set([...this.lsttrainigdetails]);
        }

        if (json.documentstorelist?.length) {
          this.ngxgriddata = [...json.documentstorelist];
          this.documentsList.set([...this.ngxgriddata]);
        }

        this.EmployeeDetailsValidation = {};
      },
      error: (err: any) => this._commonService.showErrorMessage(err)
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CTC Calculation  (mirrors old ctcCalculation)
  // ─────────────────────────────────────────────────────────────────────────

  ctcCalculation() {
    const a = this.form.controls['pEmploymentBasicSalary'].value;
    const b = this.form.controls['pEmploymentAllowanceORvda'].value;
    const basic     = a ? +this.removeCommas(String(a)) : 0;
    const allowance = b ? +this.removeCommas(String(b)) : 0;
    this.ctc = basic + allowance;
    this.form.controls['pEmploymentCTC'].setValue(this.ctc);
  }

  private removeCommas(val: string): string {
    return val.split(',').join('');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Dropdown change handlers  (mirrors old designationname_Change …)
  // ─────────────────────────────────────────────────────────────────────────

  designationname_Change($event: any) {
    this.form.controls['mdesignationname'].setValue($event.designationname);
    this.form.controls['mdesignationid'].setValue($event.designationid);
  }

  role_Change($event: any) {
    this.form.controls['pEmploymentRoleName'].setValue($event.pEmploymentRoleName);
    this.form.controls['pEmploymentRoleId'].setValue($event.pEmploymentRoleId);
  }

  mainBranch_Change($event: any) {
    this.form.controls['BranchName'].setValue($event.pBranchName);
    this.form.controls['branchid'].setValue($event.pBranchId);
  }

  Branch_Change($event: any) {
    this.form.controls['pBranchName'].setValue($event?.pBranchName ?? '');
    this.form.controls['pBranchId'].setValue($event?.pBranchId   ?? '');
  }

  joined_Change($event: any) {
    this.form.controls['pjoinedas'].setValue($event.designationname);
    this.form.controls['pjoinedasid'].setValue($event.designationid);
  }

  bloodgroup_Change($event: any) {
    this.form.controls['bloodgroup'].setValue($event?.bloodgroup ?? '');
  }

  pCountry_Change($event: any) {
    this.form.controls['pCountryId'].setValue($event.target.value);
  }

  relationship_Change($event: any) {
    const fc = this.form.get('FamilyControls') as FormGroup;
    fc.controls['relationshipid'].setValue($event.relationshipid);
    fc.controls['relationshipname'].setValue($event.relationshipname);
  }

  Qualification_Change($event: any) {
    const fc = this.form.get('FamilyControls') as FormGroup;
    fc.controls['qualificationid'].setValue($event?.qualificationid ?? '');
    fc.controls['qualificationname'].setValue($event?.qualificationname ?? '');
  }

  designationname_Changeexp($event: any) {
    const pc = this.form.get('priviousexpControls') as FormGroup;
    pc.controls['pdesignationname'].setValue($event.designationname);
    pc.controls['pdesignationid'].setValue($event.designationid);
  }

  designationname_Changecarrer($event: any) {
    const kc = this.form.get('KapilCareercontrols') as FormGroup;
    kc.controls['designationname'].setValue($event.designationname);
    kc.controls['designationid'].setValue($event.designationid);
  }

  idProofType_Change($event: any) {
    const ec = this.form.get('EmployeeDocumentsControls') as FormGroup;
    ec.controls['pDocReferenceno'].setValue('');
    ec.controls['pDocStorePath'].setValue('');
    ec.controls['pFilename'].setValue('');
    ec.controls['pDocumentId'].setValue(null);
    this.kycDocumentType = [];

    if ($event?.pDocumentGroupId) {
      ec.controls['pDocumentGroup'].setValue($event.pDocumentGroup);
      this.EmployeeDetailsValidation['pDocumentGroupId'] = '';
      this.contactMasterService.getDocumentNames($event.pDocumentGroupId).subscribe({
        next: (res: any[]) => { if (res?.length) this.kycDocumentType = res; },
        error: (err: any) => this._commonService.showErrorMessage(err)
      });
    } else {
      ec.controls['pDocumentGroup'].setValue('');
    }
  }

  pIdProof_Change($event: any) {
    const ec = this.form.get('EmployeeDocumentsControls') as FormGroup;
    if ($event?.pDocumentId) {
      ec.controls['pDocumentName'].setValue($event.pDocumentName);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Checkbox toggles  (mirrors old onFilterChageesi …)
  // ─────────────────────────────────────────────────────────────────────────

  onFilterChageesi(eve: any) {
    const ctrl = this.form.controls['pesino'];
    if (eve.target.checked) {
      this.form.controls['pisesi'].setValue(true);
      ctrl.setValidators(Validators.required);
      this.showesi = true;
    } else {
      this.form.controls['pisesi'].setValue(false);
      ctrl.clearValidators();
      this.showesi = false;
    }
    ctrl.updateValueAndValidity();
  }

  onFilterChagepf(eve: any) {
    const ctrl = this.form.controls['ppfno'];
    if (eve.target.checked) {
      this.form.controls['pispf'].setValue(true);
      ctrl.setValidators(Validators.required);
      this.showpf = true;
    } else {
      this.form.controls['pispf'].setValue(false);
      ctrl.clearValidators();
      this.showpf = false;
    }
    ctrl.updateValueAndValidity();
  }

  onFilterChagephc(eve: any) {
    const ctrl = this.form.controls['phealthproblems'];
    if (eve.target.checked) {
      this.form.controls['pishandicaped'].setValue(true);
      ctrl.setValidators(Validators.required);
      this.showhealthproblems = true;
    } else {
      this.form.controls['pishandicaped'].setValue(false);
      ctrl.clearValidators();
      this.showhealthproblems = false;
    }
    ctrl.updateValueAndValidity();
  }

  onPayrolleligible(eve: any) {
    this.form.controls['payrolleligible'].setValue(eve.target.checked);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Age Calculation
  // ─────────────────────────────────────────────────────────────────────────

  ageCalculation() {
    const fc  = this.form.get('FamilyControls') as FormGroup;
    const dob = fc.controls['pdateofbirth'].value;
    if (dob) {
      const timeDiff = Math.abs(Date.now() - new Date(dob).getTime());
      const age      = Math.floor(timeDiff / (1000 * 3600 * 24) / 365.25);
      fc.controls['page'].setValue(age);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Date validations  (mirrors old ToDateChangeexp / FromDateChangeexp)
  // ─────────────────────────────────────────────────────────────────────────

  ToDateChangeexp($event: any) {
    if (!$event) return;
    const pc         = this.form.get('priviousexpControls') as FormGroup;
    const fromDate   = pc.controls['pfromdate'].value;
    const toDate     = pc.controls['ptodate'].value;
    const joindate   = this.form.controls['pjoindate'].value;

    if (fromDate && toDate && fromDate <= toDate) {
      this._commonService.showWarningMessage('To date should be greater than From date');
      pc.controls['ptodate'].setValue('');
    } else if (joindate && toDate && toDate > joindate) {
      this._commonService.showWarningMessage('To date should be less than or equal to Join date');
      pc.controls['ptodate'].setValue('');
    }
  }

  FromDateChangeexp($event: any) {
    if (!$event) return;
    const pc       = this.form.get('priviousexpControls') as FormGroup;
    const fromDate = pc.controls['pfromdate'].value;
    const toDate   = pc.controls['ptodate'].value;
    const joindate = this.form.controls['pjoindate'].value;

    if (fromDate && toDate && fromDate >= toDate) {
      this._commonService.showWarningMessage('From Date should be less than To Date');
      pc.controls['pfromdate'].setValue('');
    } else if (fromDate && joindate && fromDate > joindate) {
      this._commonService.showWarningMessage('From date should be less than Join date');
      pc.controls['pfromdate'].setValue('');
    }
  }

  ToDateChangekapilcarrer($event: any) {
    // min date for To date picker set via bsConfig in old code
    // handled via p-datepicker [minDate] in template if needed
  }

  FromDateChangekapilcarrer($event: any) {
    // handled via p-datepicker [maxDate] in template if needed
  }

  checkyear() {
    const ec   = this.form.get('EducationControls') as FormGroup;
    const year = ec.controls['pyear'].value;
    if (year && year > new Date().getFullYear()) {
      this._commonService.showWarningMessage('Year should be less than or equal to current year');
      ec.controls['pyear'].setValue('');
    }
  }

  checkpercentage() {
    const ec  = this.form.get('EducationControls') as FormGroup;
    const pct = ec.controls['ppercentofmarks'].value;
    if (pct && +pct > 100) {
      this._commonService.showWarningMessage('% Of Marks should be less than or equal to 100');
      ec.controls['ppercentofmarks'].setValue('');
    }
  }

  checkpancardexist() {
    const pan = this.form.controls['ppancardno'].value;
    if (!pan) return;
    this.contactMasterService.checkpancardno(pan).subscribe({
      next: (res: number) => {
        if (res > 0) {
          this._commonService.showWarningMessage('Pan Card No. already exists');
          this.form.controls['ppancardno'].setValue('');
        }
      },
      error: (err: any) => this._commonService.showErrorMessage(err)
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Add to sub-lists  (mirrors old addFamilyDetails, addeducationDetails …)
  // ─────────────────────────────────────────────────────────────────────────

  addFamilyDetails() {
    const fc = this.form.get('FamilyControls') as FormGroup;
    if (!this.checkValidationsSubGroup(fc)) return;

    if (this.familydetailsTransType === 'Update') {
      fc.controls['ptypeofoperation'].setValue(
        this.lstemployess[this.familyindex].precordid > 0 ? 'UPDATE' : 'CREATE'
      );
      fc.controls['precordid'].setValue(this.lstemployess[this.familyindex].precordid);
      this.lstemployess[this.familyindex] = fc.value;
    } else {
      fc.controls['precordid'].setValue(0);
      fc.controls['ptypeofoperation'].setValue('CREATE');
      this.lstemployess.push(fc.value);
    }
    this.familyMembers.set([...this.lstemployess]);
    this.familydetailsTransType = 'Add';
    this.clearFamilyDetails();
  }

  addEducationDetails() {
    const ec = this.form.get('EducationControls') as FormGroup;
    if (!this.checkValidationsSubGroup(ec)) return;

    if (this.EducationControlsTransType === 'Update') {
      ec.controls['ptypeofoperation'].setValue(
        this.lsteducation[this.educationindex].precordid > 0 ? 'UPDATE' : 'CREATE'
      );
      ec.controls['precordid'].setValue(this.lsteducation[this.educationindex].precordid);
      this.lsteducation[this.educationindex] = ec.value;
    } else {
      ec.controls['precordid'].setValue(0);
      ec.controls['ptypeofoperation'].setValue('CREATE');
      this.lsteducation.push(ec.value);
    }
    this.educationList.set([...this.lsteducation]);
    this.EducationControlsTransType = 'Add';
    this.clearEducationDetails();
  }

  addPrevExpDetails() {
    const pc = this.form.get('priviousexpControls') as FormGroup;
    if (!this.checkValidationsSubGroup(pc)) return;

    if (this.priviousexpControlsTransType === 'Update') {
      pc.controls['ptypeofoperation'].setValue(
        this.lstpreviousexp[this.prvexpindex].precordid > 0 ? 'UPDATE' : 'CREATE'
      );
      pc.controls['precordid'].setValue(this.lstpreviousexp[this.prvexpindex].precordid);
      this.lstpreviousexp[this.prvexpindex] = pc.value;
    } else {
      pc.controls['precordid'].setValue(0);
      pc.controls['ptypeofoperation'].setValue('CREATE');
      this.lstpreviousexp.push(pc.value);
    }
    this.experienceList.set([...this.lstpreviousexp]);
    this.priviousexpControlsTransType = 'Add';
    this.clearPrvExpDetails();
  }

  addKapilCareerDetails_() {
    const kc = this.form.get('KapilCareercontrols') as FormGroup;
    if (!this.checkValidationsSubGroup(kc)) return;

    if (this.KapilCareercontrolsTransType === 'Update') {
      kc.controls['ptypeofoperation'].setValue(
        this.lstkapilcarrer[this.carrerindex].precordid > 0 ? 'UPDATE' : 'CREATE'
      );
      kc.controls['precordid'].setValue(this.lstkapilcarrer[this.carrerindex].precordid);
      this.lstkapilcarrer[this.carrerindex] = kc.value;
    } else {
      kc.controls['precordid'].setValue(0);
      kc.controls['ptypeofoperation'].setValue('CREATE');
      this.lstkapilcarrer.push(kc.value);
    }
    this.careerList.set([...this.lstkapilcarrer]);
    this.KapilCareercontrolsTransType = 'Add';
    this.clearKapilCareerDetails();
  }

  addTrainingDetails_() {
    const tc = this.form.get('Trainingcontrols') as FormGroup;
    if (!this.checkValidationsSubGroup(tc)) return;

    if (this.TrainingcontrolsTransType === 'Update') {
      tc.controls['ptypeofoperation'].setValue(
        this.lsttrainigdetails[this.trainingindex].precordid > 0 ? 'UPDATE' : 'CREATE'
      );
      tc.controls['precordid'].setValue(this.lsttrainigdetails[this.trainingindex].precordid);
      this.lsttrainigdetails[this.trainingindex] = tc.value;
    } else {
      tc.controls['precordid'].setValue(0);
      tc.controls['ptypeofoperation'].setValue('CREATE');
      this.lsttrainigdetails.push(tc.value);
    }
    this.trainingList.set([...this.lsttrainigdetails]);
    this.TrainingcontrolsTransType = 'Add';
    this.clearTrainingDetails();
  }

  addEmployeeDocument() {
    const ec = this.form.get('EmployeeDocumentsControls') as FormGroup;
    if (!this.checkValidationsSubGroup(ec)) return;

    const duplicate = this.ngxgriddata.some(
      k => k.pDocumentGroup === ec.controls['pDocumentGroup'].value &&
           k.pDocumentId    === ec.controls['pDocumentId'].value
    );
    if (duplicate) {
      this._commonService.showWarningMessage('Already Document type Exist !!');
      return;
    }
    ec.controls['ptypeofoperation'].setValue('CREATE');
    this.ngxgriddata = [...this.ngxgriddata, ec.value];
    this.documentsList.set([...this.ngxgriddata]);
    this.clearEmployeeDocuments();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Edit handlers  (mirrors old editemployeeDeatails …)
  // ─────────────────────────────────────────────────────────────────────────

  editFamilyDetails(index: number) {
    const fc = this.form.get('FamilyControls') as FormGroup;
    fc.patchValue(this.lstemployess[index]);
    fc.controls['relationshipid'].setValue(parseInt(this.lstemployess[index].relationshipid));
    fc.controls['relationshipname'].setValue(this.lstemployess[index].relationshipname);
    if (this.lstemployess[index].qualificationid) {
      fc.controls['qualificationid'].setValue(parseInt(this.lstemployess[index].qualificationid));
      fc.controls['qualificationname'].setValue(this.lstemployess[index].qualificationname);
    }
    this.familydetailsTransType = 'Update';
    this.familyindex = index;
  }

  editEducationDetails(index: number) {
    const ec = this.form.get('EducationControls') as FormGroup;
    ec.patchValue(this.lsteducation[index]);
    this.EducationControlsTransType = 'Update';
    this.educationindex = index;
  }

  editPrvExpDetails(index: number) {
    const pc = this.form.get('priviousexpControls') as FormGroup;
    pc.patchValue(this.lstpreviousexp[index]);
    if (this.lstpreviousexp[index].pdesignationid) {
      pc.controls['pdesignationid'].setValue(parseInt(this.lstpreviousexp[index].pdesignationid));
      pc.controls['pdesignationname'].setValue(this.lstpreviousexp[index].pdesignationname);
    }
    this.priviousexpControlsTransType = 'Update';
    this.prvexpindex = index;
  }

  editKapilCareerDetails(index: number) {
    const kc = this.form.get('KapilCareercontrols') as FormGroup;
    kc.patchValue(this.lstkapilcarrer[index]);
    if (this.lstkapilcarrer[index].designationid) {
      kc.controls['designationid'].setValue(parseInt(this.lstkapilcarrer[index].designationid));
      kc.controls['designationname'].setValue(this.lstkapilcarrer[index].designationname);
    }
    this.KapilCareercontrolsTransType = 'Update';
    this.carrerindex = index;
  }

  editTrainingDetails(index: number) {
    const tc = this.form.get('Trainingcontrols') as FormGroup;
    tc.patchValue(this.lsttrainigdetails[index]);
    this.TrainingcontrolsTransType = 'Update';
    this.trainingindex = index;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Delete handlers
  // ─────────────────────────────────────────────────────────────────────────

  deleteFamilyDetails(index: number) {
    this.lstemployess.splice(index, 1);
    this.familyMembers.set([...this.lstemployess]);
    this.familydetailsTransType = 'Add';
    this.familyindex = 0;
  }

  deleteEducationDetails(index: number) {
    this.lsteducation.splice(index, 1);
    this.educationList.set([...this.lsteducation]);
    this.EducationControlsTransType = 'Add';
    this.educationindex = 0;
  }

  deletePrvExpDetails(index: number) {
    this.lstpreviousexp.splice(index, 1);
    this.experienceList.set([...this.lstpreviousexp]);
    this.priviousexpControlsTransType = 'Add';
    this.prvexpindex = 0;
  }

  deleteKapilCareerDetails(index: number) {
    this.lstkapilcarrer.splice(index, 1);
    this.careerList.set([...this.lstkapilcarrer]);
    this.KapilCareercontrolsTransType = 'Add';
    this.carrerindex = 0;
  }

  deleteTrainingDetails(index: number) {
    this.lsttrainigdetails.splice(index, 1);
    this.trainingList.set([...this.lsttrainigdetails]);
    this.TrainingcontrolsTransType = 'Add';
    this.trainingindex = 0;
  }

  removeDocumentHandler(index: number) {
    this.ngxgriddata.splice(index, 1);
    this.documentsList.set([...this.ngxgriddata]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Clear handlers  (mirrors old clearEmployeeDeatails …)
  // ─────────────────────────────────────────────────────────────────────────

  clearFamilyDetails() {
    const fc = this.form.get('FamilyControls') as FormGroup;
    fc.reset();
    fc.patchValue({ pgender: 'Male', pmaritialstatus: 'Married', ptypeofoperation: '' });
    this.familydetailsTransType = 'Add';
    this.EmployeeDetailsValidation = {};
  }

  clearEducationDetails() {
    (this.form.get('EducationControls') as FormGroup).reset();
    this.EducationControlsTransType = 'Add';
    this.EmployeeDetailsValidation  = {};
  }

  clearPrvExpDetails() {
    (this.form.get('priviousexpControls') as FormGroup).reset();
    this.priviousexpControlsTransType = 'Add';
    this.EmployeeDetailsValidation    = {};
  }

  clearKapilCareerDetails() {
    (this.form.get('KapilCareercontrols') as FormGroup).reset();
    this.KapilCareercontrolsTransType = 'Add';
    this.EmployeeDetailsValidation    = {};
  }

  clearTrainingDetails() {
    (this.form.get('Trainingcontrols') as FormGroup).reset();
    this.TrainingcontrolsTransType = 'Add';
    this.EmployeeDetailsValidation = {};
  }

  clearEmployeeDocuments() {
    const ec = this.form.get('EmployeeDocumentsControls') as FormGroup;
    ec.reset();
    ec.patchValue({ pDocIsDownloadable: true });
    this.imageResponse_Employee = null;
    this.EmployeeDetailsValidation = {};
  }

  clearMainDetails() {
    this.form.reset();
    this.buttonName = 'Save';
    this.clearFamilyDetails();
    this.clearPrvExpDetails();
    this.clearKapilCareerDetails();
    this.clearEducationDetails();
    this.clearTrainingDetails();
    this.lstkapilcarrer    = [];
    this.lstpreviousexp    = [];
    this.lsttrainigdetails = [];
    this.lsteducation      = [];
    this.lstemployess      = [];
    this.ngxgriddata       = [];
    this.familyMembers.set([]);
    this.educationList.set([]);
    this.experienceList.set([]);
    this.careerList.set([]);
    this.trainingList.set([]);
    this.documentsList.set([]);
    this.EmployeeDetailsValidation = {};
    this.ctc = 0;
    this.form.patchValue({ pmaritalstatus: 'Married', presidentialstatus: 'Resident' });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Tab switch
  // ─────────────────────────────────────────────────────────────────────────

  // ngOnInit() {
  //   this.commonService.getRoles().subscribe({
  //     next: (data) => { this.roles = data; },
  //     error: () => { this.roles = []; }
  //   });
  //   this.commonService.getDesignationsAll().subscribe({
  //     next: (data) => { this.designations = data; },
  //     error: () => { this.designations = []; }
  //   });
  //   this.commonService.getBranches().subscribe({
  //     next: (data) => { this.branches = data; },
  //     error: () => { this.branches = []; }
  //   });
  //   this.commonService.getCountries().subscribe({
  //     next: (data) => { this.countries = data; },
  //     error: () => { this.countries = []; }
  //   });
  //   this.commonService.getDocumentGroupNames().subscribe({
  //     next: (data) => { this.documentTypes = data; },
  //     error: () => { this.documentTypes = []; }
  //   });
  //   this.commonService.getQualifications().subscribe({
  //     next: (data) => { this.educationOptions = data; },
  //     error: () => { this.educationOptions = []; }
  //   });
  // }

  onDocTypeChange(item: any) {
    this.kycDocumentType = [];
    this.form.patchValue({ docName: null });
    if (item?.pDocumentGroupId) {
      this._commonService.getDocumentProofs(item.pDocumentGroupId).subscribe({
        next: (data) => { this.kycDocumentType = data; },
        error: () => { this.kycDocumentType = []; }
      });
    }
  }

  setActiveTab(tab: EmployeeTab) {
    this.activeTab.set(tab);
    if (tab !== 'Employee Documents') {
      this.clearEmployeeDocuments();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // File upload  (mirrors old uploadAndProgress)
  // ─────────────────────────────────────────────────────────────────────────

  uploadAndProgress(event: any, files: FileList | null, type: 'DT' | 'ED') {
    if (!files || files.length === 0) return;

    const file = files[0];
    const ext  = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) {
      this._commonService.showWarningMessage('Upload jpg, png or pdf files');
      return;
    }
    if ((file.size / 1024 / 1024) > 10) {
      this._commonService.showWarningMessage('File Size Maximum Allowed 10Mb Only!');
      return;
    }

    const formData = new FormData();
    formData.append(file.name, file);
    formData.append('NewFileName', 'EmployeeDocuments.' + ext);

    this._commonService.fileUploadS3('BPO', formData).subscribe({
      next: (data: any) => {
        const uploadedName = data[0];
        const ec = this.form.get('EmployeeDocumentsControls') as FormGroup;

        if (type === 'DT') {
          this.imageResponse  = { name: uploadedName };
          this.kycFileName    = uploadedName;
          this.form.controls['pFilename'].setValue(uploadedName);
        } else {
          this.imageResponse_Employee = { name: uploadedName };
          ec.controls['pFilename'].setValue(uploadedName);
          ec.controls['pDocStorePath'].setValue(uploadedName);
        }
      },
      error: err => this._commonService.showErrorMessage(err)
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Validation  (mirrors old checkValidations + BlurEventAllControll)
  // ─────────────────────────────────────────────────────────────────────────

  checkValidationsSubGroup(group: FormGroup): boolean {
    let isValid = true;
    Object.keys(group.controls).forEach(key => {
      const ctrl = group.get(key);
      if (!ctrl || ctrl instanceof FormGroup || !ctrl.validator) return;
      this.EmployeeDetailsValidation[key] = '';
      if (ctrl.errors) {
        const label = (document.getElementById(key) as HTMLInputElement)?.title || key;
        for (const errorKey in ctrl.errors) {
          const msg = this._commonService.getValidationMessage(ctrl, errorKey, label, key, '');
          this.EmployeeDetailsValidation[key] += msg + ' ';
          isValid = false;
        }
      }
    });
    return isValid;
  }

  validateMainForm(): boolean {
    let isValid = true;
    Object.keys(this.form.controls).forEach(key => {
      const ctrl = this.form.get(key);
      if (!ctrl || ctrl instanceof FormGroup || ctrl instanceof FormArray || !ctrl.validator) return;
      this.EmployeeDetailsValidation[key] = '';
      ctrl.markAsTouched();
      if (ctrl.errors) {
        const label = (document.getElementById(key) as HTMLInputElement)?.title || key;
        for (const errorKey in ctrl.errors) {
          const msg = this._commonService.getValidationMessage(ctrl, errorKey, label, key, '');
          this.EmployeeDetailsValidation[key] += msg + ' ';
          isValid = false;
        }
      }
    });
    return isValid;
  }

  blurEventAllControls(group: FormGroup) {
    Object.keys(group.controls).forEach(key => {
      const ctrl = group.get(key);
      if (ctrl instanceof FormGroup) {
        this.blurEventAllControls(ctrl);
      } else if (ctrl?.validator) {
        ctrl.valueChanges.subscribe(() => {
          this.EmployeeDetailsValidation[key] = '';
          if (ctrl.errors) {
            const label = (document.getElementById(key) as HTMLInputElement)?.title || key;
            for (const errorKey in ctrl.errors) {
              const msg = this._commonService.getValidationMessage(ctrl, errorKey, label, key, '');
              this.EmployeeDetailsValidation[key] = (this.EmployeeDetailsValidation[key] || '') + msg + ' ';
            }
          }
        });
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main Save  (mirrors old SaveEmployeeForm with full FormArray population)
  // ─────────────────────────────────────────────────────────────────────────

  saveEmployee() {
    // ── Salary formatting ────────────────────────────────────────────────
    this.form.controls['pEmploymentBasicSalary'].setValue(
      this._commonService.removeCommasInAmount(this.form.controls['pEmploymentBasicSalary'].value)
    );
    this.form.controls['pEmploymentAllowanceORvda'].setValue(
      this._commonService.removeCommasInAmount(this.form.controls['pEmploymentAllowanceORvda'].value)
    );

    if (this.form.controls['pEmploymentBasicSalary'].value === '0' ||
        this.form.controls['pEmploymentBasicSalary'].value === '') {
      this.form.controls['pEmploymentBasicSalary'].setValue('');
      this._commonService.showWarningMessage('Basic Salary should be greater than zero (0)');
      return;
    }

    // ── Main form validation ─────────────────────────────────────────────
    if (!this.validateMainForm()) return;

    // ── Residential / marital status → codes ────────────────────────────
    this.form.controls['presidentialstatus'].setValue(
      this.mapResidentialStatusOut(this.form.controls['presidentialstatus'].value)
    );
    this.form.controls['pmaritalstatus'].setValue(
      this.mapMaritalStatusOut(this.form.controls['pmaritalstatus'].value)
    );

    // ── Populate plsttrainigdetails FormArray ────────────────────────────
    this.lsttrainigdetails.forEach(item => {
      const fa  = this.form.get('plsttrainigdetails') as FormArray;
      const grp = this.addTrainingDetails();
      grp.controls['precordid'].setValue(item.precordid);
      grp.controls['pcoursename'].setValue(item.pcoursename);
      grp.controls['pdate'].setValue(item.pdate);
      grp.controls['ptypeofoperation'].setValue(item.ptypeofoperation);
      fa.push(grp);
    });

    // ── Populate plstkapilcarrer FormArray ───────────────────────────────
    this.lstkapilcarrer.forEach(item => {
      const fa  = this.form.get('plstkapilcarrer') as FormArray;
      const grp = this.addKapilCareerDetails();
      grp.controls['precordid'].setValue(item.precordid);
      grp.controls['pcompanyname'].setValue(item.pcompanyname);
      grp.controls['designationname'].setValue(item.designationname);
      grp.controls['designationid'].setValue(item.designationid);
      grp.controls['pfromdate'].setValue(item.pfromdate);
      grp.controls['ptodate'].setValue(item.ptodate);
      grp.controls['psscminutesno'].setValue(item.psscminutesno);
      grp.controls['preasonfortransfer'].setValue(item.preasonfortransfer);
      grp.controls['ptypeofoperation'].setValue(item.ptypeofoperation);
      fa.push(grp);
    });

    // ── Populate plstpreviousexp FormArray ───────────────────────────────
    this.lstpreviousexp.forEach(item => {
      const fa  = this.form.get('plstpreviousexp') as FormArray;
      const grp = this.addPrvExpDetailsControls();
      grp.controls['precordid'].setValue(item.precordid);
      grp.controls['porginazationname'].setValue(item.porginazationname);
      grp.controls['pdesignationname'].setValue(item.pdesignationname);
      grp.controls['pdesignationid'].setValue(item.pdesignationid);
      grp.controls['pfromdate'].setValue(item.pfromdate);
      grp.controls['ptodate'].setValue(item.ptodate);
      grp.controls['plastpay'].setValue(item.plastpay);
      grp.controls['preasonforleaving'].setValue(item.preasonforleaving);
      grp.controls['ptypeofoperation'].setValue(item.ptypeofoperation);
      fa.push(grp);
    });

    // ── Populate plsteducation FormArray ─────────────────────────────────
    this.lsteducation.forEach(item => {
      const fa  = this.form.get('plsteducation') as FormArray;
      const grp = this.addEducationDetailsControls();
      grp.controls['precordid'].setValue(item.precordid);
      grp.controls['pcourse'].setValue(item.pcourse);
      grp.controls['pgroup'].setValue(item.pgroup);
      grp.controls['pschool'].setValue(item.pschool);
      grp.controls['pplace'].setValue(item.pplace);
      grp.controls['pyear'].setValue(item.pyear);
      grp.controls['ppercentofmarks'].setValue(item.ppercentofmarks);
      grp.controls['ptypeofoperation'].setValue(item.ptypeofoperation);
      fa.push(grp);
    });

    // ── Populate plstemployess FormArray with gender/marital mapping ─────
    this.lstemployess.forEach(item => {
      const fa  = this.form.get('plstemployess') as FormArray;
      const grp = this.addFamilyDetailsControls();
      grp.controls['precordid'].setValue(item.precordid);
      grp.controls['relationshipid'].setValue(item.relationshipid);
      grp.controls['relationshipname'].setValue(item.relationshipname);
      grp.controls['pname'].setValue(item.pname);
      grp.controls['pdateofbirth'].setValue(item.pdateofbirth);
      grp.controls['page'].setValue(item.page);
      grp.controls['pgender'].setValue(this.mapGenderOut(item.pgender));
      grp.controls['pmaritialstatus'].setValue(item.pmaritialstatus === 'Married' ? 'M' : 'U');
      grp.controls['qualificationid'].setValue(item.qualificationid);
      grp.controls['qualificationname'].setValue(item.qualificationname);
      grp.controls['poccupation'].setValue(item.poccupation);
      grp.controls['pphoneno'].setValue(item.pphoneno);
      grp.controls['ptypeofoperation'].setValue(item.ptypeofoperation);
      fa.push(grp);
    });

    // ── Populate documentstorelist FormArray ─────────────────────────────
    this.ngxgriddata.forEach(item => {
      const fa  = this.form.get('documentstorelist') as FormArray;
      const grp = this.addEmployeeDocumentsDetails();
      grp.patchValue(item);
      fa.push(grp);
    });

    // ── Serialize ────────────────────────────────────────────────────────
    const data = JSON.stringify(this.form.getRawValue());

    // ── Clear FormArrays after serialization (mirrors old removeAt loops) ─
    this.clearFormArray('plstemployess');
    this.clearFormArray('plsteducation');
    this.clearFormArray('plstpreviousexp');
    this.clearFormArray('plstkapilcarrer');
    this.clearFormArray('plsttrainigdetails');
    this.clearFormArray('documentstorelist');

    // ── Restore display values after code mapping ────────────────────────
    this.form.controls['presidentialstatus'].setValue(
      this.mapResidentialStatusIn(this.form.controls['presidentialstatus'].value)
    );
    this.form.controls['pmaritalstatus'].setValue(
      this.mapMaritalStatusIn(this.form.controls['pmaritalstatus'].value)
    );

    if (!confirm(`Do you want to ${this.buttonName}?`)) return;

    this.isLoading = true;
    this.contactMasterService.saveEmployeeDetails(data).subscribe({
      next: () => {
        this._commonService.showInfoMessage(
          this.buttonName === 'Save'
            ? 'Employee Details Saved Successfully'
            : 'Employee Details Updated Successfully'
        );
        this.isLoading = false;
        this.getSavedEmployeeDetails(); // refresh form data
        this.onSaveSuccess.emit();      // notify parent to close modal
      },
      error: (err: any) => {
        this._commonService.showErrorMessage(err);
        this.isLoading = false;
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private clearFormArray(arrayName: string) {
    const fa = this.form.get(arrayName) as FormArray;
    while (fa.length) fa.removeAt(0);
  }

  private mapResidentialStatusIn(val: string): string {
    const map: Record<string, string> = {
      R: 'Resident', N: 'Non-Resident',
      F: 'Foreign National', P: 'Person of Indian Origin'
    };
    return map[val] ?? val;
  }

  private mapResidentialStatusOut(val: string): string {
    const map: Record<string, string> = {
      'Resident': 'R', 'Non-Resident': 'N',
      'Foreign National': 'F', 'Person of Indian Origin': 'P'
    };
    return map[val] ?? val;
  }

  private mapMaritalStatusIn(val: string): string {
    const map: Record<string, string> = {
      Ma: 'Married', Si: 'Single', Se: 'Separated', Wi: 'Widowed'
    };
    return map[val] ?? val;
  }

  private mapMaritalStatusOut(val: string): string {
    const map: Record<string, string> = {
      'Married': 'Ma', 'Single': 'Si', 'Separated': 'Se', 'Widowed': 'Wi'
    };
    return map[val] ?? val;
  }

  private mapGenderOut(val: string): string {
    const map: Record<string, string> = {
      'Male': 'M', 'Female': 'F', 'Third Gender': 'T'
    };
    return map[val] ?? val;
  }
    deleteRow(list: any, index: number) {
    list.update((items: any[]) => items.filter((_: any, i: number) => i !== index));
  }
}
