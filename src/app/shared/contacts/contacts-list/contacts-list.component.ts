// import { Component, OnInit, signal, computed } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { RouterModule } from '@angular/router';
// import { ContactAddComponent } from '../contact-add/contact-add.component';
// import { NgSelectModule } from '@ng-select/ng-select';
// import { SubscriberDetailsComponent } from '../subscriber-details/subscriber-details.component';
// import { EmployeeDetailsComponent } from '../employee-details/employee-details.component';
// import { ChannelPartnerDetailsComponent } from '../channel-partner-details/channel-partner-details.component';
// import { ContactMasterService } from '../../../core/services/contacts/contact-master.service';
// import { CommonService } from '../../../core/services/Common/common.service';
// import { ViewChild } from '@angular/core';

// export type ContactRole = 'Subscriber / Customer' | 'Employee' | 'Supplier / Vendor' | 'Advocate' | 'Channel Partner' | 'Freelancer';
// export type ContactTab = 'Contacts' | ContactRole;
// type ContactStatusFilter = 'Active' | 'Inactive';

// export interface Contact {
//   id: string;
//   uid: string;
//   name: string;
//   relation: string;
//   phone: string;
//   address: string;
//   status: 'Active' | 'Inactive';
//   photo?: string;
//   panNo?: string;
//   type: ContactTab;
//   roles?: ContactRole[];
// }

// @Component({
//   selector: 'app-contacts-list',
//   standalone: true,
//   imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, ContactAddComponent, SubscriberDetailsComponent, EmployeeDetailsComponent, ChannelPartnerDetailsComponent],
//   templateUrl: './contacts-list.component.html',
//   styleUrl: './contacts-list.component.scss',
// })
// export class ContactsListComponent implements OnInit {
//   roleTabs: ContactRole[] = ['Subscriber / Customer', 'Employee', 'Supplier / Vendor', 'Advocate', 'Channel Partner', 'Freelancer'];
//   tabs: ContactTab[] = ['Contacts', ...this.roleTabs];
//   statusOptions: ContactStatusFilter[] = ['Active', 'Inactive'];
//   pageSizeOptions = [6, 8, 12, 16];
//   tdsOptions = ['194H', '194C', '194J', '194I', '194M', '194N'];

//   activeTab = signal<ContactTab>('Contacts');
//   searchQuery = signal('');
//   currentPage = signal(1);
//   pageSize = signal(8);
//   showFilters = signal(false);
//   uidFilter = signal('');
//   phoneFilter = signal('');
//   relationFilter = signal('');
//   addressFilter = signal('');
//   statusFilter = signal<ContactStatusFilter | null>(null);
//   showAddForm = signal(false);
//   editingContact = signal<Contact | null>(null);
//   openMenuContactId = signal<string | null>(null);
//   roleModalContact = signal<Contact | null>(null);
//   roleModalRole = signal<ContactRole | null>(null);

//   allContacts = signal<Contact[]>([]);
//   loading = signal(false);
//   hasMore = signal(false);
//   @ViewChild(EmployeeDetailsComponent)
// employeeDetailsComponent!: EmployeeDetailsComponent;

//   filteredContacts = computed(() => {
//     const q = this.normalize(this.searchQuery());
//     const uid = this.normalize(this.uidFilter());
//     const phone = this.normalize(this.phoneFilter());
//     const relation = this.normalize(this.relationFilter());
//     const address = this.normalize(this.addressFilter());
//     const status = this.statusFilter();

//     return this.allContacts().filter(c =>
//       this.isInActiveBucket(c) &&
//       (!status || c.status === status) &&
//       (!q || this.matchesAny(c, q)) &&
//       (!uid || this.normalize(c.uid).includes(uid)) &&
//       (!phone || this.normalize(c.phone).includes(phone)) &&
//       (!relation || this.normalize(c.relation).includes(relation)) &&
//       (!address || this.normalize(c.address).includes(address))
//     );
//   });

//   pagedContacts = computed(() => this.filteredContacts());
//   totalItems = computed(() => this.filteredContacts().length);
//   totalPages = computed(() => this.currentPage() + (this.hasMore() ? 1 : 0));
//   pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
//   rangeStart = computed(() => this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1);
//   rangeEnd = computed(() => (this.currentPage() - 1) * this.pageSize() + this.totalItems());
//   activeFilterCount = computed(() => {
//     const filters = [
//       this.searchQuery(),
//       this.uidFilter(),
//       this.phoneFilter(),
//       this.relationFilter(),
//       this.addressFilter(),
//       this.statusFilter() || ''
//     ];

//     return filters.filter(value => String(value).trim().length > 0).length;
//   });


//   constructor(private contactMasterService: ContactMasterService,private _commonService:CommonService ) { }

//   ngOnInit() {
//     this.loadContacts();
//   }

//   loadContacts() {
//     this.loading.set(true);
//     const endindex = (this.currentPage() - 1) * this.pageSize();
//     this.contactMasterService.getContactViewByName(this.activeTab(), endindex).subscribe({
//       next: (data) => {
//         this.allContacts.set(this.mapContacts(data));
//         this.hasMore.set(data.length >= this.pageSize());
//         this.loading.set(false);
//       },
//       error: () => {
//         this.allContacts.set([]);
//         this.loading.set(false);
//       }
//     });
//   }

//   private mapContacts(data: any[]): Contact[] {
//     return data.map(dto => {
//       const roles: ContactRole[] = [];
//       if (dto.pisemployee) roles.push('Employee');
//       if (dto.pissupplier) roles.push('Supplier / Vendor');
//       if (dto.pisadvocate) roles.push('Advocate');
//       if (dto.pisfreelancer) roles.push('Freelancer');
//       if (Number(dto.subscribercount) > 0) roles.push('Subscriber / Customer');
//       if (dto.pisreferral) roles.push('Channel Partner');

//       const name = [dto.pContactName, dto.pContactsurname].filter(Boolean).join(' ').trim();
//       const relation = [dto.pRelationtitlename, dto.pFatherName].filter(Boolean).join(' ').trim();

//       return {
//         id: String(dto.pContactdId ?? ''),
//         uid: String(dto.pRefNo ?? ''),
//         name,
//         relation,
//         phone: String(dto.pContactNumber ?? ''),
//         address: String(dto.pAddresDetails ?? ''),
//         status: String(dto.pStatus ?? '') === 'Active' ? 'Active' : 'Inactive',
//         photo: dto.pImage ? String(dto.pImage) : undefined,
//         type: 'Contacts' as ContactTab,
//         roles,
//       };
//     });
//   }

//   switchTab(tab: ContactTab) {
//     this.activeTab.set(tab);
//     this.currentPage.set(1);
//     this.loadContacts();
//   }

//   onSearch() {
//     this.currentPage.set(1);
//   }
//   saveRoleForm() {

//   const role = this.roleModalRole();

//   if (role === 'Employee') {
//     this.employeeDetailsComponent.saveEmployee();
//     return;
//   }

//   this.closeRoleForm();
// }

//   toggleFilters() {
//     this.showFilters.update(value => !value);
//   }

//   clearFilters() {
//     this.searchQuery.set('');
//     this.uidFilter.set('');
//     this.phoneFilter.set('');
//     this.relationFilter.set('');
//     this.addressFilter.set('');
//     this.statusFilter.set(null);
//     this.currentPage.set(1);
//   }

//   setPageSize(value: string | number) {
//     const nextSize = Number(value);
//     if (!Number.isNaN(nextSize) && nextSize > 0) {
//       this.pageSize.set(nextSize);
//       this.currentPage.set(1);
//       this.loadContacts();
//     }
//   }

//   goToPage(page: number) {
//     const target = Math.min(Math.max(page, 1), this.totalPages());
//     if (target !== this.currentPage()) {
//       this.currentPage.set(target);
//       this.loadContacts();
//     }
//   }

//   getTabCount(tab: ContactTab) {
//     if (tab === 'Contacts') return this.allContacts().length;
//     return this.allContacts().filter(contact => this.hasRole(contact, tab)).length;
//   }

//   getContactInitials(contact: Contact) {
//     return contact.name
//       .split(/\s+/)
//       .filter(Boolean)
//       .slice(0, 2)
//       .map(part => part.charAt(0).toUpperCase())
//       .join('') || 'C';
//   }

//   prevPage() {
//     if (this.currentPage() > 1) {
//       this.currentPage.update(p => p - 1);
//       this.loadContacts();
//     }
//   }

//   nextPage() {
//     if (this.hasMore()) {
//       this.currentPage.update(p => p + 1);
//       this.loadContacts();
//     }
//   }

//   openAddForm() {
//     this.editingContact.set(null);
//     this.showAddForm.set(true);
//   }

//   openEditForm(contact: Contact) {
//     this.openMenuContactId.set(null);
//     this.editingContact.set(contact);
//     this.showAddForm.set(true);
//   }

//   onFormClose() {
//     this.showAddForm.set(false);
//     this.editingContact.set(null);
//   }

//   onFormSave(contact: Contact) {
//     if (this.editingContact()) {
//       this.allContacts.update(list =>
//         list.map(c => c.id === contact.id ? contact : c)
//       );
//     } else {
//       const currentTab = this.activeTab();
//       const roles = currentTab === 'Contacts' ? [] : [currentTab];
//       const newContact = { ...contact, id: Date.now().toString(), uid: `CNT${Date.now()}`.slice(0, 13), type: 'Contacts' as ContactTab, roles };
//       this.allContacts.update(list => [newContact, ...list]);
//     }
//     this.showAddForm.set(false);
//     this.editingContact.set(null);
//   }

//   toggleCardMenu(contactId: string) {
//     this.openMenuContactId.update(current => current === contactId ? null : contactId);
//   }

//   openRoleForm(contact: Contact, role: ContactRole) {
//     this.openMenuContactId.set(null);
//     this.roleModalContact.set(contact);
//     this.roleModalRole.set(role);
//   }

//   closeRoleForm() {
//     this.roleModalContact.set(null);
//     this.roleModalRole.set(null);
//   }

//   // saveRoleForm() {
//   //   const contact = this.roleModalContact();
//   //   const role = this.roleModalRole();
//   //   if (!contact || !role) return;

//   //   this.allContacts.update(list =>
//   //     list.map(item =>
//   //       item.id === contact.id
//   //         ? { ...item, roles: Array.from(new Set([...(item.roles || []), role])) }
//   //         : item
//   //     )
//   //   );
//   //   this.closeRoleForm();
//   // }

// //   saveRoleForm(): void {
// //   debugger;

// //   if (this._commonService.isNullOrEmptyString(this.isDateOfBirthValid.dateofbirth)) {
// //     this._commonService.showWarningMessage('Please Update the Date Of Birth in Contact');
// //     return;
// //   }

// //   this.ID = this.contactEmployeeForm.get('pcontactid')?.value;

// //   const form = this.contactEmployeeForm;

// //   // File Name
// //   form.patchValue({
// //     pFilename: form.get('pDocStorePath')?.value || this.kycFileName
// //   });

// //   // Salary Formatting
// //   this.updateAmountField('pEmploymentAllowanceORvda');
// //   this.updateAmountField('pEmploymentBasicSalary');

// //   if (form.get('pEmploymentBasicSalary')?.value === '0') {
// //     form.patchValue({ pEmploymentBasicSalary: '' });
// //     this._commonService.showWarningMessage(
// //       'Basic Salary should be greater than zero (0)'
// //     );
// //     return;
// //   }

// //   if (!this.validateSaveDeatails(form)) {
// //     return;
// //   }

// //   // Dropdown Mappings
// //   this.mapFieldValue(
// //     'presidentialstatus',
// //     {
// //       Resident: 'R',
// //       'Non-Resident': 'N',
// //       'Foreign National': 'F',
// //       'Person of Indian Origin': 'P'
// //     }
// //   );

// //   this.mapFieldValue(
// //     'pmaritalstatus',
// //     {
// //       Married: 'Ma',
// //       Single: 'Si',
// //       Separated: 'Se',
// //       Widowed: 'Wi'
// //     }
// //   );

// //   // Populate Form Arrays
// //   this.populateTrainingDetails();
// //   this.populateKapilCareerDetails();
// //   this.populatePreviousExperience();
// //   this.populateEducationDetails();
// //   this.populateEmployeeFamilyDetails();
// //   this.populateDocumentDetails();

// //   const data = JSON.stringify(form.getRawValue());

// //   // Clear Arrays
// //   this.clearFormArrays([
// //     'plstemployess',
// //     'plsteducation',
// //     'plstpreviousexp',
// //     'plstkapilcarrer',
// //     'plsttrainigdetails',
// //     'documentstorelist'
// //   ]);

// //   // Confirmation
// //   const confirmed = confirm(`Do you want to ${this.buttonName}?`);

// //   if (!confirmed) return;

// //   this.contactMasterService.saveEmployeeDetails(data).subscribe({
// //     next: () => {
// //       const message =
// //         this.buttonName === 'Save'
// //           ? 'Employee Details Saved Successfully'
// //           : 'Employee Details Updated Successfully';

// //       this._commonService.showInfoMessage(message);

// //       this.getSavedEmployeeDetails();
// //       this.clearMainDeatails();

// //       if (this._SscagendsService.isEmployeeEnroll === 'EmplyeeEnroll') {
// //         this._routes.navigate(['/Hrms/EmployeeOnroll']);
// //       } else {
// //         this._routes.navigate(
// //           ['/configuration/ContactListView'],
// //           { queryParams: { ID: this.ID } }
// //         );
// //       }
// //     },
// //     error: (error) => {
// //       this._commonService.showErrorMessage(error);
// //     }
// //   });
// // }

// // /* =========================================================
// //    Helper Methods
// // ========================================================= */

// // private updateAmountField(controlName: string): void {
// //   const value = this.contactEmployeeForm.get(controlName)?.value;

// //   this.contactEmployeeForm.patchValue({
// //     [controlName]: this._commonService.removeCommasInAmount(value)
// //   });
// // }

// // private mapFieldValue(
// //   controlName: string,
// //   mapping: Record<string, string>
// // ): void {
// //   const value = this.contactEmployeeForm.get(controlName)?.value;

// //   if (mapping[value]) {
// //     this.contactEmployeeForm.patchValue({
// //       [controlName]: mapping[value]
// //     });
// //   }
// // }

// // private clearFormArrays(arrayNames: string[]): void {
// //   arrayNames.forEach(arrayName => {
// //     const formArray = this.contactEmployeeForm.get(arrayName) as FormArray;

// //     while (formArray.length) {
// //       formArray.removeAt(0);
// //     }
// //   });
// // }

// // /* =========================================================
// //    Training Details
// // ========================================================= */

// // private populateTrainingDetails(): void {
// //   const formArray = this.contactEmployeeForm.get('plsttrainigdetails') as FormArray;

// //   this.lsttrainigdetails.forEach(item => {
// //     const group = this.addtrainingdetails();

// //     group.patchValue({
// //       precordid: item.precordid,
// //       pcoursename: item.pcoursename,
// //       pdate: item.pdate,
// //       ptypeofoperation: item.ptypeofoperation
// //     });

// //     formArray.push(group);
// //   });
// // }

// // /* =========================================================
// //    Kapil Career
// // ========================================================= */

// // private populateKapilCareerDetails(): void {
// //   const formArray = this.contactEmployeeForm.get('plstkapilcarrer') as FormArray;

// //   this.lstkapilcarrer.forEach(item => {
// //     const group = this.addkapilcarrierdetails();

// //     group.patchValue({
// //       precordid: item.precordid,
// //       pcompanyname: item.pcompanyname,
// //       designationname: item.designationname,
// //       designationid: item.designationid,
// //       pfromdate: item.pfromdate,
// //       ptodate: item.ptodate,
// //       psscminutesno: item.psscminutesno,
// //       preasonfortransfer: item.preasonfortransfer,
// //       ptypeofoperation: item.ptypeofoperation
// //     });

// //     formArray.push(group);
// //   });
// // }

// // /* =========================================================
// //    Previous Experience
// // ========================================================= */

// // private populatePreviousExperience(): void {
// //   const formArray = this.contactEmployeeForm.get('plstpreviousexp') as FormArray;

// //   this.lstpreviousexp.forEach(item => {
// //     const group = this.addPrvExpDetailscontrlos();

// //     group.patchValue({
// //       precordid: item.precordid,
// //       porginazationname: item.porginazationname,
// //       pdesignationname: item.pdesignationname,
// //       pdesignationid: item.pdesignationid,
// //       pfromdate: item.pfromdate,
// //       ptodate: item.ptodate,
// //       plastpay: item.plastpay,
// //       preasonforleaving: item.preasonforleaving,
// //       ptypeofoperation: item.ptypeofoperation
// //     });

// //     formArray.push(group);
// //   });
// // }

// // /* =========================================================
// //    Education
// // ========================================================= */

// // private populateEducationDetails(): void {
// //   const formArray = this.contactEmployeeForm.get('plsteducation') as FormArray;

// //   this.lsteducation.forEach(item => {
// //     const group = this.addEducationDetailscontrlos();

// //     group.patchValue({
// //       precordid: item.precordid,
// //       pcourse: item.pcourse,
// //       pgroup: item.pgroup,
// //       pschool: item.pschool,
// //       pplace: item.pplace,
// //       pyear: item.pyear,
// //       ppercentofmarks: item.ppercentofmarks,
// //       ptypeofoperation: item.ptypeofoperation
// //     });

// //     formArray.push(group);
// //   });
// // }

// // /* =========================================================
// //    Family Details
// // ========================================================= */

// // private populateEmployeeFamilyDetails(): void {
// //   const formArray = this.contactEmployeeForm.get('plstemployess') as FormArray;

// //   const genderMap: Record<string, string> = {
// //     Male: 'M',
// //     Female: 'F',
// //     'Third Gender': 'T'
// //   };

// //   const maritalMap: Record<string, string> = {
// //     Married: 'M',
// //     'Un-married': 'U'
// //   };

// //   this.lstemployess.forEach(item => {
// //     const group = this.addFamilyDetailscontrlos();

// //     group.patchValue({
// //       precordid: item.precordid,
// //       relationshipid: item.relationshipid,
// //       relationshipname: item.relationshipname,
// //       pname: item.pname,
// //       pdateofbirth: item.pdateofbirth,
// //       page: item.page,
// //       pgender: genderMap[item.pgender] || item.pgender,
// //       pmaritialstatus:
// //         maritalMap[item.pmaritialstatus] || item.pmaritialstatus,
// //       qualificationid: item.qualificationid,
// //       qualificationname: item.qualificationname,
// //       poccupation: item.poccupation,
// //       pphoneno: item.pphoneno,
// //       ptypeofoperation: item.ptypeofoperation
// //     });

// //     formArray.push(group);
// //   });
// // }

// // /* =========================================================
// //    Document Details
// // ========================================================= */

// // private populateDocumentDetails(): void {
// //   const formArray = this.contactEmployeeForm.get('documentstorelist') as FormArray;

// //   this.ngxgriddata.forEach(item => {
// //     const group = this.addemployeedocumentsdetails();

// //     group.patchValue({
// //       pDocumentId: item.pDocumentId,
// //       pDocumentGroupId: item.pDocumentGroupId,
// //       pDocumentGroup: item.pDocumentGroup,
// //       pDocStorePath: item.pDocStorePath,
// //       pDocReferenceno: item.pDocReferenceno,
// //       pDocumentName: item.pDocumentName,
// //       ptypeofoperation: item.ptypeofoperation,
// //       pFilename: item.pFilename,
// //       pDocIsDownloadable: item.pDocIsDownloadable,
// //       pDocstoreId: item.pDocstoreId
// //     });

// //     formArray.push(group);
// //   });
// // }

//   hasRole(contact: Contact, role: ContactRole) {
//     return (contact.roles || []).includes(role);
//   }

//   getRoleIcon(role: ContactRole) {
//     const icons: Record<ContactRole, string> = {
//       'Subscriber / Customer': 'pi-users',
//       'Employee': 'pi-id-card',
//       'Supplier / Vendor': 'pi-truck',
//       'Advocate': 'pi-briefcase',
//       'Channel Partner': 'pi-share-alt',
//       'Freelancer': 'pi-star',
//     };
//     return icons[role];
//   }

//   maskPan(pan: string | undefined): string {
//     if (!pan || pan.length < 4) return pan || 'N/A';
//     return 'X'.repeat(pan.length - 4) + pan.slice(-4);
//   }

//   printList() {
//     window.print();
//   }

//   private normalize(value: string | null | undefined): string {
//     return (value || '').trim().toLowerCase();
//   }

//   private matchesAny(contact: Contact, query: string): boolean {
//     return [
//       contact.name,
//       contact.uid,
//       contact.phone,
//       contact.relation,
//       contact.address,
//       contact.status,
//       ...(contact.roles || [])
//     ].some(value => this.normalize(value).includes(query));
//   }

//   private isInActiveBucket(contact: Contact): boolean {
//     const tab = this.activeTab();
//     return tab === 'Contacts' || this.hasRole(contact, tab);
//   }
// }
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ContactAddComponent } from '../contact-add/contact-add.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { SubscriberDetailsComponent } from '../subscriber-details/subscriber-details.component';
import { EmployeeDetailsComponent } from '../employee-details/employee-details.component';
import { ChannelPartnerDetailsComponent } from '../channel-partner-details/channel-partner-details.component';
import { ContactMasterService } from '../../../core/services/contacts/contact-master.service';
import { CommonService } from '../../../core/services/Common/common.service';

export type ContactRole = 'Subscriber / Customer' | 'Employee' | 'Supplier / Vendor' | 'Advocate' | 'Channel Partner' | 'Freelancer';
export type ContactTab = 'Contacts' | ContactRole;
type ContactStatusFilter = 'Active' | 'Inactive';

export interface Contact {
  id: string;
  uid: string;
  name: string;
  relation: string;
  phone: string;
  address: string;
  status: 'Active' | 'Inactive';
  photo?: string;
  panNo?: string;
  type: ContactTab;
  roles?: ContactRole[];
}

@Component({
  selector: 'app-contacts-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, NgSelectModule,
    ContactAddComponent, SubscriberDetailsComponent,
    EmployeeDetailsComponent, ChannelPartnerDetailsComponent
  ],
  templateUrl: './contacts-list.component.html',
  styleUrl: './contacts-list.component.scss',
})
export class ContactsListComponent implements OnInit {

  roleTabs: ContactRole[] = ['Subscriber / Customer', 'Employee', 'Supplier / Vendor', 'Advocate', 'Channel Partner', 'Freelancer'];
  tabs: ContactTab[] = ['Contacts', ...this.roleTabs];
  statusOptions: ContactStatusFilter[] = ['Active', 'Inactive'];
  pageSizeOptions = [6, 8, 12, 16];
  tdsOptions = ['194H', '194C', '194J', '194I', '194M', '194N'];

  activeTab          = signal<ContactTab>('Contacts');
  searchQuery        = signal('');
  currentPage        = signal(1);
  pageSize           = signal(8);
  showFilters        = signal(false);
  uidFilter          = signal('');
  phoneFilter        = signal('');
  relationFilter     = signal('');
  addressFilter      = signal('');
  statusFilter       = signal<ContactStatusFilter | null>(null);
  showAddForm        = signal(false);
  editingContact     = signal<Contact | null>(null);
  openMenuContactId  = signal<string | null>(null);
  roleModalContact   = signal<Contact | null>(null);
  roleModalRole      = signal<ContactRole | null>(null);
  allContacts        = signal<Contact[]>([]);
  loading            = signal(false);
  hasMore            = signal(false);
  isEmployeeSaving   = signal(false);

  // ── NEW: pulse signal that tells EmployeeDetailsComponent to save ──
  triggerEmployeeSave = signal(false);


  tabCounts = signal<Record<string, number>>({});

 
 loadTabCount(tab: ContactTab) {
  const tabMap: Record<ContactTab, string> = {
    'Contacts':              'Contacts',
    'Subscriber / Customer': 'Referrals',
    'Employee':              'Employees',
    'Supplier / Vendor':     'Suppliers',
    'Advocate':              'Advocates',
    'Channel Partner':       'Referrals',
    'Freelancer':            'Freelancer',  // ← was 'Referrals', now 'Freelancer'
  };

  this.contactMasterService.getNoOfRecords(tabMap[tab]).subscribe({
    next: (count) => {
      this.tabCounts.update(current => ({ ...current, [tab]: count }));
    },
    error: () => {}
  });
}




  filteredContacts = computed(() => {
    const q        = this.normalize(this.searchQuery());
    const uid      = this.normalize(this.uidFilter());
    const phone    = this.normalize(this.phoneFilter());
    const relation = this.normalize(this.relationFilter());
    const address  = this.normalize(this.addressFilter());
    const status   = this.statusFilter();

    return this.allContacts().filter(c =>
      this.isInActiveBucket(c) &&
      (!status   || c.status === status) &&
      (!q        || this.matchesAny(c, q)) &&
      (!uid      || this.normalize(c.uid).includes(uid)) &&
      (!phone    || this.normalize(c.phone).includes(phone)) &&
      (!relation || this.normalize(c.relation).includes(relation)) &&
      (!address  || this.normalize(c.address).includes(address))
    );
  });

  pagedContacts  = computed(() => this.filteredContacts());
  totalItems     = computed(() => this.filteredContacts().length);
  totalPages     = computed(() => this.currentPage() + (this.hasMore() ? 1 : 0));
  pageNumbers    = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  rangeStart     = computed(() => this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1);
  rangeEnd       = computed(() => (this.currentPage() - 1) * this.pageSize() + this.totalItems());

  activeFilterCount = computed(() => {
    const filters = [
      this.searchQuery(), this.uidFilter(), this.phoneFilter(),
      this.relationFilter(), this.addressFilter(), this.statusFilter() || ''
    ];
    return filters.filter(v => String(v).trim().length > 0).length;
  });

  constructor(
    private contactMasterService: ContactMasterService,
    private _commonService: CommonService
  ) {}

  
  ngOnInit() {
  this.loadContacts();
  this.loadTabCount('Contacts');
}

  
 
loadContacts() {
  this.loading.set(true);
  const endindex = (this.currentPage() - 1) * this.pageSize();
  
  const tabMap: Record<ContactTab, string> = {
    'Contacts':              'Contacts',
    'Subscriber / Customer': 'Referrals',
    'Employee':              'Employees',
    'Supplier / Vendor':     'Suppliers',
    'Advocate':              'Advocates',
    'Channel Partner':       'Referrals',
    'Freelancer':            'Freelancer',
  };

  const activeTab = this.activeTab();
  this.contactMasterService.getContactViewByName(tabMap[activeTab], endindex).subscribe({
    next: (data) => {
      const mapped = this.mapContacts(data);
      if (activeTab !== 'Contacts') {
        mapped.forEach(c => {
          if (!(c.roles ?? []).includes(activeTab as ContactRole)) {
            (c.roles = c.roles ?? []).push(activeTab as ContactRole);
          }
        });
      }
      this.allContacts.set(mapped);
      this.hasMore.set(data.length >= this.pageSize());
      this.loading.set(false);
    },
    error: () => {
      this.allContacts.set([]);
      this.loading.set(false);
    }
  });
}

  private mapContacts(data: any[]): Contact[] {
    return data.map(dto => {
      const roles: ContactRole[] = [];
      if (dto.pisemployee)                   roles.push('Employee');
      if (dto.pissupplier)                   roles.push('Supplier / Vendor');
      if (dto.pisadvocate)                   roles.push('Advocate');
      if (dto.pisfreelancer)                 roles.push('Freelancer');
      if (Number(dto.subscribercount) > 0)   roles.push('Subscriber / Customer');
      if (dto.pisreferral)                   roles.push('Channel Partner');

      const name     = [dto.pContactName, dto.pContactsurname].filter(Boolean).join(' ').trim();
      const relation = [dto.pRelationtitlename, dto.pFatherName].filter(Boolean).join(' ').trim();

      return {
        id:      String(dto.pContactdId ?? ''),
        uid:     String(dto.pRefNo ?? ''),
        name,
        relation,
        phone:   String(dto.pContactNumber ?? ''),
        address: String(dto.pAddresDetails ?? ''),
        status:  String(dto.pStatus ?? '') === 'Active' ? 'Active' : 'Inactive',
        photo:   dto.pImage ? String(dto.pImage) : undefined,
        type:    'Contacts' as ContactTab,
        roles,
      };
    });
  }

switchTab(tab: ContactTab) {
  this.activeTab.set(tab);
  this.currentPage.set(1);
   this.tabCounts.set({}); 
  this.loadContacts();
  this.loadTabCount(tab);
}
  onSearch() {
    this.currentPage.set(1);
  }

  toggleFilters()  { this.showFilters.update(v => !v); }

  clearFilters() {
    this.searchQuery.set('');
    this.uidFilter.set('');
    this.phoneFilter.set('');
    this.relationFilter.set('');
    this.addressFilter.set('');
    this.statusFilter.set(null);
    this.currentPage.set(1);
  }

  setPageSize(value: string | number) {
    const nextSize = Number(value);
    if (!Number.isNaN(nextSize) && nextSize > 0) {
      this.pageSize.set(nextSize);
      this.currentPage.set(1);
      this.loadContacts();
    }
  }

  goToPage(page: number) {
    const target = Math.min(Math.max(page, 1), this.totalPages());
    if (target !== this.currentPage()) {
      this.currentPage.set(target);
      this.loadContacts();
    }
  }
 

  getTabCount(tab: ContactTab): number {
  return this.tabCounts()[tab] ?? 0;
}


  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadContacts();
    }
  }

  nextPage() {
    if (this.hasMore()) {
      this.currentPage.update(p => p + 1);
      this.loadContacts();
    }
  }

  // getTabCount(tab: ContactTab) {
  //   if (tab === 'Contacts') return this.allContacts().length;
  //   return this.allContacts().filter(c => this.hasRole(c, tab as ContactRole)).length;
  // }

  getContactInitials(contact: Contact) {
    return contact.name
      .split(/\s+/).filter(Boolean).slice(0, 2)
      .map(p => p.charAt(0).toUpperCase()).join('') || 'C';
  }

  openAddForm() {
    this.editingContact.set(null);
    this.showAddForm.set(true);
  }


  openEditForm(contact: Contact) {
  console.log('1. openEditForm called:', contact);
  console.log('2. contact.id:', contact.id);

  this.openMenuContactId.set(null);
  this.editingContact.set(null);
  this.showAddForm.set(false);

  console.log('3. setting contact:', contact);

  this.editingContact.set({ ...contact });
  this.showAddForm.set(true);
}

  onFormClose() {
    this.showAddForm.set(false);
    this.editingContact.set(null);
  }

  onFormSave(contact: Contact) {
    if (this.editingContact()) {
      this.allContacts.update(list => list.map(c => c.id === contact.id ? contact : c));
    } else {
      const newContact: Contact = {
        ...contact,
        id:    Date.now().toString(),
        uid:   `CNT${Date.now()}`.slice(0, 13),
        type:  'Contacts',
        roles: []
      };
      this.allContacts.update(list => [newContact, ...list]);
    }
    this.showAddForm.set(false);
    this.editingContact.set(null);
  }

  toggleCardMenu(contactId: string) {
    this.openMenuContactId.update(current => current === contactId ? null : contactId);
  }

  openRoleForm(contact: Contact, role: ContactRole) {
    this.openMenuContactId.set(null);
    this.triggerEmployeeSave.set(false); // reset before opening
    this.roleModalContact.set(contact);
    this.roleModalRole.set(role);
  }

  closeRoleForm() {
    this.roleModalContact.set(null);
    this.roleModalRole.set(null);
    this.triggerEmployeeSave.set(false); // reset on close
  }

  // ── Save button in modal footer calls this ────────────────────────────────
  // saveRoleForm() {
  //   debugger
  //   const role = this.roleModalRole();

  //   if (role === 'Employee') {
  //     // Pulse true → EmployeeDetailsComponent.ngOnChanges fires → saveEmployee()
  //     this.triggerEmployeeSave.set(true);
  //     // Reset after tick so next Save click works again
  //     setTimeout(() => this.triggerEmployeeSave.set(false), 200);
  //     return;
  //   }

    // For all other roles, close immediately
  
 saveRoleForm() {
  debugger
  const contact = this.roleModalContact();
  const role = this.roleModalRole();

  if (!contact || !role) {
    return;
  }

  // Supplier API call
  // if (role === 'Supplier / Vendor') {

  //   this.contactMasterService
  //     .saveContactSupplier(contact.id, true)
  //     .subscribe({

  //       next: (res: any) => {

  //         this.allContacts.update(list =>
  //           list.map(item =>
  //             item.id === contact.id
  //               ? {
  //                   ...item,
  //                   roles: Array.from(
  //                     new Set([...(item.roles || []), role])
  //                   )
  //                 }
  //               : item
  //           )
  //         );

  //         this.closeRoleForm();
  //       },

  //       error: (err) => {
  //         console.error('Supplier save failed', err);
  //       }

  //     });

  // } else {
    if (role === 'Supplier / Vendor') {

  this.contactMasterService
    .saveContactSupplier(contact.id, true)
    .subscribe({

      next: (res: any) => {

        if (res === true) {

          alert('Supplier saved successfully');

          this.allContacts.update(list =>
            list.map(item =>
              item.id === contact.id
                ? {
                    ...item,
                    roles: Array.from(
                      new Set([...(item.roles || []), role])
                    )
                  }
                : item
            )
          );

          this.closeRoleForm();

        } else {
          alert('Save failed');
        }
      },

      error: (err) => {
        console.error('Supplier save failed', err);
        alert('API Error');
      }

    });

} else if (role === 'Employee') {
  this.isEmployeeSaving.set(true);  
      // Pulse true → EmployeeDetailsComponent.ngOnChanges fires → saveEmployee()
      this.triggerEmployeeSave.set(true);
      // Reset after tick so next Save click works again
      setTimeout(() => this.triggerEmployeeSave.set(false), 200);
      return;
    } else {

    // Local update for other roles
    this.allContacts.update(list =>
      list.map(item =>
        item.id === contact.id
          ? {
              ...item,
              roles: Array.from(
                new Set([...(item.roles || []), role])
              )
            }
          : item
      )
    );

    this.closeRoleForm();
  }
}

  // ── Called by (onSaveSuccess) output from EmployeeDetailsComponent ────────
  onEmployeeSaveSuccess() {
    this.isEmployeeSaving.set(false); 
    this.closeRoleForm();
    this.loadContacts(); // refresh grid
  }
  onEmployeeSaveCancelled() {
  this.isEmployeeSaving.set(false); // just reset spinner, keep modal open
}

  hasRole(contact: Contact, role: ContactRole) {
    return (contact.roles || []).includes(role);
  }

  getRoleIcon(role: ContactRole | null | string) {
    const icons: Record<string, string> = {
      'Subscriber / Customer': 'pi-users',
      'Employee':              'pi-id-card',
      'Supplier / Vendor':     'pi-truck',
      'Advocate':              'pi-briefcase',
      'Channel Partner':       'pi-share-alt',
      'Freelancer':            'pi-star',
    };
    return icons[role ?? ''] ?? '';
  }

  maskPan(pan: string | undefined): string {
    if (!pan || pan.length < 4) return pan || 'N/A';
    return 'X'.repeat(pan.length - 4) + pan.slice(-4);
  }

  printList() { window.print(); }

  private normalize(value: string | null | undefined): string {
    return (value || '').trim().toLowerCase();
  }

  private matchesAny(contact: Contact, query: string): boolean {
    return [
      contact.name, contact.uid, contact.phone,
      contact.relation, contact.address, contact.status,
      ...(contact.roles || [])
    ].some(v => this.normalize(v).includes(query));
  }

  private isInActiveBucket(contact: Contact): boolean {
    const tab = this.activeTab();
    return tab === 'Contacts' || this.hasRole(contact, tab as ContactRole);
  }
}
