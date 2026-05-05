import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ContactAddComponent } from '../contact-add/contact-add.component';
import { NgSelectModule } from '@ng-select/ng-select';

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
  type: ContactTab;
  roles?: ContactRole[];
}

@Component({
  selector: 'app-contacts-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, ContactAddComponent],
  templateUrl: './contacts-list.component.html',
  styleUrl: './contacts-list.component.scss',
})
export class ContactsListComponent implements OnInit {
  roleTabs: ContactRole[] = ['Subscriber / Customer', 'Employee', 'Supplier / Vendor', 'Advocate', 'Channel Partner', 'Freelancer'];
  tabs: ContactTab[] = ['Contacts', ...this.roleTabs];
  statusOptions: ContactStatusFilter[] = ['Active', 'Inactive'];
  pageSizeOptions = [6, 8, 12, 16];

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

  allContacts = signal<Contact[]>([
    { id: '1', uid: 'CNT2560669', name: 'Uatuser', relation: '', phone: '8466999824', address: '', status: 'Active', type: 'Contacts', roles: ['Subscriber / Customer'] },
    { id: '2', uid: 'CNT2560668', name: 'Test Jag Test', relation: 'S/o - Test', phone: '9290218040', address: 'Test,Boduppal,Boduppal,Hyderabad,Telangana', status: 'Active', type: 'Contacts', roles: ['Subscriber / Customer'] },
    { id: '3', uid: 'CNT2560667', name: 'Sdfsdfs', relation: 'S/o - Fsdfs', phone: '1313213213', address: 'Dsfgsd,Gsfd,Sfgdgs,Ambedkar Konaseema', status: 'Active', type: 'Contacts', roles: ['Subscriber / Customer'] },
    { id: '4', uid: 'CNT2560666', name: 'Abc', relation: 'S/o - Fdgfg', phone: '5465465465', address: 'Fdgd,Fdgdf,Sfgdgd,Ambedkar Konaseema', status: 'Active', type: 'Contacts', roles: ['Subscriber / Customer'] },
    { id: '5', uid: 'EMP1000001', name: 'Ravi Kumar', relation: 'S/o - Suresh Kumar', phone: '9876543210', address: 'Hyderabad, Telangana', status: 'Active', type: 'Contacts', roles: ['Employee'] },
    { id: '6', uid: 'SUP2000001', name: 'Lakshmi Enterprises', relation: '', phone: '8800112233', address: 'Vijayawada, Andhra Pradesh', status: 'Active', type: 'Contacts', roles: ['Supplier / Vendor'] },
    { id: '7', uid: 'CHP3000001', name: 'Prasad Rao', relation: 'S/o - Rao', phone: '9911223344', address: 'Warangal, Telangana', status: 'Active', type: 'Contacts', roles: ['Channel Partner'] },
    { id: '8', uid: 'ADV4000001', name: 'Mohan Gandavarapu', relation: '', phone: '8885220886', address: 'Pallipalem,Sangam,Duvvur,Nellore,AP', status: 'Active', type: 'Contacts', roles: ['Advocate'] },
    { id: '9', uid: 'FRL5000001', name: 'Priya Sharma', relation: 'D/o - Sharma', phone: '7788996655', address: 'Secunderabad, Telangana', status: 'Active', type: 'Contacts', roles: ['Freelancer'] },
  ]);

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

  totalItems = computed(() => this.filteredContacts().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index + 1));
  rangeStart = computed(() => this.totalItems() === 0 ? 0 : ((this.currentPage() - 1) * this.pageSize()) + 1);
  rangeEnd = computed(() => Math.min(this.currentPage() * this.pageSize(), this.totalItems()));
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

  pagedContacts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredContacts().slice(start, start + this.pageSize());
  });

  ngOnInit() {}

  switchTab(tab: ContactTab) {
    this.activeTab.set(tab);
    this.currentPage.set(1);
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
    }
  }

  goToPage(page: number) {
    this.currentPage.set(Math.min(Math.max(page, 1), this.totalPages()));
  }

  getTabCount(tab: ContactTab) {
    if (tab === 'Contacts') return this.allContacts().length;
    return this.allContacts().filter(contact => this.hasRole(contact, tab)).length;
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
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1);
  }

  openAddForm() {
    this.editingContact.set(null);
    this.showAddForm.set(true);
  }

  openEditForm(contact: Contact) {
    this.openMenuContactId.set(null);
    this.editingContact.set(contact);
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
    if (!contact || !role) return;

    this.allContacts.update(list =>
      list.map(item =>
        item.id === contact.id
          ? { ...item, roles: Array.from(new Set([...(item.roles || []), role])) }
          : item
      )
    );
    this.closeRoleForm();
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
