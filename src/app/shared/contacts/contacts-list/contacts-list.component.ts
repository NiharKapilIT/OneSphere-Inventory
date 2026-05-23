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
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, ContactAddComponent, SubscriberDetailsComponent, EmployeeDetailsComponent, ChannelPartnerDetailsComponent],
  templateUrl: './contacts-list.component.html',
  styleUrl: './contacts-list.component.scss',
})
export class ContactsListComponent implements OnInit {
  roleTabs: ContactRole[] = ['Subscriber / Customer', 'Employee', 'Supplier / Vendor', 'Advocate', 'Channel Partner', 'Freelancer'];
  tabs: ContactTab[] = ['Contacts', ...this.roleTabs];
  statusOptions: ContactStatusFilter[] = ['Active', 'Inactive'];
  pageSizeOptions = [6, 8, 12, 16];
  tdsOptions = ['194H', '194C', '194J', '194I', '194M', '194N'];

  activeTab = signal<ContactTab>('Contacts');
  searchQuery = signal('');
  currentPage = signal(1);
  pageSize = signal(8);
  showFilters = signal(false);
  uidFilter = signal('');
  phoneFilter = signal('');
  relationFilter = signal('');
  addressFilter = signal('');
  statusFilter = signal<ContactStatusFilter | null>(null);
  showAddForm = signal(false);
  editingContact = signal<Contact | null>(null);
  openMenuContactId = signal<string | null>(null);
  roleModalContact = signal<Contact | null>(null);
  roleModalRole = signal<ContactRole | null>(null);

  allContacts = signal<Contact[]>([]);
  loading = signal(false);
  hasMore = signal(false);


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
    const q = this.normalize(this.searchQuery());
    const uid = this.normalize(this.uidFilter());
    const phone = this.normalize(this.phoneFilter());
    const relation = this.normalize(this.relationFilter());
    const address = this.normalize(this.addressFilter());
    const status = this.statusFilter();

    return this.allContacts().filter(c =>
      this.isInActiveBucket(c) &&
      (!status || c.status === status) &&
      (!q || this.matchesAny(c, q)) &&
      (!uid || this.normalize(c.uid).includes(uid)) &&
      (!phone || this.normalize(c.phone).includes(phone)) &&
      (!relation || this.normalize(c.relation).includes(relation)) &&
      (!address || this.normalize(c.address).includes(address))
    );
  });

  pagedContacts = computed(() => this.filteredContacts());
  totalItems = computed(() => this.filteredContacts().length);
  totalPages = computed(() => this.currentPage() + (this.hasMore() ? 1 : 0));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  rangeStart = computed(() => this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1);
  rangeEnd = computed(() => (this.currentPage() - 1) * this.pageSize() + this.totalItems());
  activeFilterCount = computed(() => {
    const filters = [
      this.searchQuery(),
      this.uidFilter(),
      this.phoneFilter(),
      this.relationFilter(),
      this.addressFilter(),
      this.statusFilter() || ''
    ];

    return filters.filter(value => String(value).trim().length > 0).length;
  });


  constructor(private contactMasterService: ContactMasterService) { }

  
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
      if (dto.pisemployee) roles.push('Employee');
      if (dto.pissupplier) roles.push('Supplier / Vendor');
      if (dto.pisadvocate) roles.push('Advocate');
      if (dto.pisfreelancer) roles.push('Freelancer');
      if (Number(dto.subscribercount) > 0) roles.push('Subscriber / Customer');
      if (dto.pisreferral) roles.push('Channel Partner');

      const name = [dto.pContactName, dto.pContactsurname].filter(Boolean).join(' ').trim();
      const relation = [dto.pRelationtitlename, dto.pFatherName].filter(Boolean).join(' ').trim();

      return {
        id: String(dto.pContactdId ?? ''),
        uid: String(dto.pRefNo ?? ''),
        name,
        relation,
        phone: String(dto.pContactNumber ?? ''),
        address: String(dto.pAddresDetails ?? ''),
        status: String(dto.pStatus ?? '') === 'Active' ? 'Active' : 'Inactive',
        photo: dto.pImagePath  ? String(dto.pImage) : undefined,
        type: 'Contacts' as ContactTab,
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

  toggleFilters() {
    this.showFilters.update(value => !value);
  }

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



  getContactInitials(contact: Contact) {
    return contact.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || 'C';
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
      this.allContacts.update(list =>
        list.map(c => c.id === contact.id ? contact : c)
      );
    } else {
      const currentTab = this.activeTab();
      const roles = currentTab === 'Contacts' ? [] : [currentTab];
      const newContact = { ...contact, id: Date.now().toString(), uid: `CNT${Date.now()}`.slice(0, 13), type: 'Contacts' as ContactTab, roles };
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
    this.roleModalContact.set(contact);
    this.roleModalRole.set(role);
  }

  closeRoleForm() {
    this.roleModalContact.set(null);
    this.roleModalRole.set(null);
  }

  
 saveRoleForm() {
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

  hasRole(contact: Contact, role: ContactRole) {
    return (contact.roles || []).includes(role);
  }

  getRoleIcon(role: ContactRole) {
    const icons: Record<ContactRole, string> = {
      'Subscriber / Customer': 'pi-users',
      'Employee': 'pi-id-card',
      'Supplier / Vendor': 'pi-truck',
      'Advocate': 'pi-briefcase',
      'Channel Partner': 'pi-share-alt',
      'Freelancer': 'pi-star',
    };
    return icons[role];
  }

  maskPan(pan: string | undefined): string {
    if (!pan || pan.length < 4) return pan || 'N/A';
    return 'X'.repeat(pan.length - 4) + pan.slice(-4);
  }

  printList() {
    window.print();
  }

  private normalize(value: string | null | undefined): string {
    return (value || '').trim().toLowerCase();
  }

  private matchesAny(contact: Contact, query: string): boolean {
    return [
      contact.name,
      contact.uid,
      contact.phone,
      contact.relation,
      contact.address,
      contact.status,
      ...(contact.roles || [])
    ].some(value => this.normalize(value).includes(query));
  }

  private isInActiveBucket(contact: Contact): boolean {
    const tab = this.activeTab();
    return tab === 'Contacts' || this.hasRole(contact, tab);
  }
}
