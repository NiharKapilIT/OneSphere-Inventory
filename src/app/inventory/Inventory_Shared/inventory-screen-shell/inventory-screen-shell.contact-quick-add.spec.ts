import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 25: "+Add Global Contact" must create/update rows in
// the real global.tbl_mst_contact pool (via saveGlobalContact()), not the
// company-scoped inv_contacts table saveContact() writes to. Verifies the
// request payload/route and the two distinct places a newly-created
// contact can be routed back into afterward.
describe('InventoryScreenShell — saveQuickContact() targets Global Contact (item 25)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;
  let httpMock: HttpTestingController;

  const config: InventoryScreenConfig = {
    key: 'purchaseOrder',
    title: 'Purchase Order',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-file'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
    httpMock = TestBed.inject(HttpTestingController);
  });

  // No httpMock.verify() here deliberately: mounting a 'transaction' kind
  // config fires a batch of unrelated background data-load GETs (segments,
  // categories, uom, contacts, ...) on init that these tests have no
  // reason to flush -- only the specific global-contact request each test
  // cares about is asserted.

  it('POSTs to the global contact route (not inv_contacts) with city/pincode, and no contact_type', () => {
    (component as any).quickAddName.set('New Global Co');
    component.formValues.set({
      quickContactMobile: '9998887770', quickContactCity: 'Chennai', quickContactPincode: '600001'
    });

    component.saveQuickContact();

    const req = httpMock.expectOne(r => r.url.includes('contacts/global') && r.method === 'POST');
    expect(req.request.body.name).toBe('New Global Co');
    expect(req.request.body.city).toBe('Chennai');
    expect(req.request.body.pincode).toBe('600001');
    expect(req.request.body.contact_type).toBeUndefined();
    req.flush({ success: true, data: { id: 99, name: 'New Global Co', mobile: '9998887770' } });
  });

  it('routes a Contact-Person-Mapping-sourced save into selectedPartyContactPerson, not the primary picker', () => {
    (component as any).addMasterSourceFieldKey.set('contactPerson');
    (component as any).quickAddName.set('Mapped Person');
    component.formValues.set({});

    component.saveQuickContact();

    const req = httpMock.expectOne(r => r.url.includes('contacts/global'));
    req.flush({ success: true, data: { id: 42, name: 'Mapped Person' } });

    expect((component as any).selectedPartyContactPerson()?.name).toBe('Mapped Person');
    expect((component as any).selectedPartyContact()).toBeNull();
  });

  it('a Contact Person opened from inside the quick-add Vendor popup feeds back into quickVendorLinkedContact', () => {
    component.openAddMaster('Vendor');
    component.openAddMaster('Contact Person');
    (component as any).quickAddName.set('Fresh Vendor Contact');
    component.formValues.set({});

    component.saveQuickContact();

    const req = httpMock.expectOne(r => r.url.includes('contacts/global'));
    req.flush({ success: true, data: { id: 55, name: 'Fresh Vendor Contact' } });

    expect((component as any).quickVendorLinkedContact()?.name).toBe('Fresh Vendor Contact');
    // restoreParentModal() should have switched the popup back to 'Vendor'.
    expect(component.activeAddMaster()).toBe('Vendor');
  });

  it('tags the resulting GlobalContactOption as global_contact, not inv_contacts', () => {
    (component as any).quickAddName.set('Source Check Co');
    component.formValues.set({});

    component.saveQuickContact();

    const req = httpMock.expectOne(r => r.url.includes('contacts/global'));
    req.flush({ success: true, data: { id: 61, name: 'Source Check Co' } });

    expect((component as any).selectedPartyContact()).toBeNull();
    // isPartyMaster() is false for this transaction-screen config, and no
    // parent quick-add master was open, so the only externally-observable
    // effect is the loadedGlobalMstContacts cache growing by one real row.
    expect((component as any).loadedGlobalMstContacts().some((c: any) => c.id === 61)).toBe(true);
  });
});
