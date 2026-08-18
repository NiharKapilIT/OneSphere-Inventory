import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 24: the quick-add Vendor/Customer rebuild also fixed
// two real gaps on the actual Master screens it was extracted from --
// Payment Terms had no payment_term_id computation for Customer (Vendor's
// buildPayload case already had it), and Shipping Address never had any
// backend storage/payload plumbing at all.
describe('InventoryScreenShell — Vendor/Customer Master payload gaps (item 24)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const config: InventoryScreenConfig = {
    key: 'customerMaster',
    title: 'Customer Master',
    subtitle: '',
    kind: 'master',
    icon: 'pi pi-users'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
  });

  it('buildPayload() includes shipping_address for a Customer', () => {
    component.formValues.set({ name: 'Acme Retail', shippingAddress: '221B Baker Street' });
    const payload = (component as any).buildPayload();
    expect(payload.shipping_address).toBe('221B Baker Street');
  });

  it('buildPayload() computes payment_term_id for a Customer (previously only Vendor did this)', () => {
    // No Payment Term Master data loaded in this fixture, so the lookup
    // resolves to null -- what matters here is that customerMaster's
    // buildPayload case calls paymentTermBySelection() at all (it
    // previously omitted the key entirely), not the resolved value.
    component.formValues.set({ name: 'Acme Retail', paymentTerms: 'Net 30' });
    const payload = (component as any).buildPayload();
    expect('payment_term_id' in payload).toBe(true);
    expect(payload.payment_term_id).toBeNull();
  });

  it('editRecordByRow() reads shipping_address and payment_term_name back into formValues for a Customer', () => {
    component.savedRecordObjects.set([{
      id: 5, customer_name: 'Acme Retail', customer_code: 'CUS-00005', status: 'active',
      shipping_address: '221B Baker Street', payment_term_name: 'Net 30'
    }]);
    component.editRecordByRow(['CUS-00005', 'Acme Retail']);
    expect(component.formValues()['shippingAddress']).toBe('221B Baker Street');
    expect(component.formValues()['paymentTerms']).toBe('Net 30');
  });

  it('editRecordByRow() still reads bank details for a Customer (regression guard for the DTO fix)', () => {
    component.savedRecordObjects.set([{
      id: 5, customer_name: 'Acme Retail', customer_code: 'CUS-00005', status: 'active',
      bank_payee_name: 'Acme Retail Pvt Ltd', bank_account_no: '1234567890',
      bank_ifsc_code: 'HDFC0001234', bank_name: 'HDFC', bank_branch_name: 'MG Road'
    }]);
    component.editRecordByRow(['CUS-00005', 'Acme Retail']);
    const v = component.formValues();
    expect(v['bankPayeeName']).toBe('Acme Retail Pvt Ltd');
    expect(v['bankAccountNo']).toBe('1234567890');
    expect(v['bankIfscCode']).toBe('HDFC0001234');
  });
});

describe('InventoryScreenShell — openAddMaster() resets Contact Person Mapping state (items 24/25)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const config: InventoryScreenConfig = {
    key: 'vendorMaster',
    title: 'Vendor Master',
    subtitle: '',
    kind: 'master',
    icon: 'pi pi-truck'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
  });

  it('opening a fresh Vendor quick-add clears a previously mapped Contact Person', () => {
    (component as any).partyContactRequired.set(true);
    (component as any).selectedPartyContactPerson.set({ id: 1, name: 'Stale Contact' });
    component.openAddMaster('Vendor');
    expect((component as any).partyContactRequired()).toBe(false);
    expect((component as any).selectedPartyContactPerson()).toBeNull();
  });

  it('the secondary "+Add Global Contact" (Contact Person Mapping) passes a distinguishing sourceFieldKey', () => {
    component.openAddMaster('Contact Person', 'contactPerson');
    expect((component as any).addMasterSourceFieldKey()).toBe('contactPerson');
  });

  it('the primary "+Add Global Contact" passes no sourceFieldKey', () => {
    component.openAddMaster('Contact Person');
    expect((component as any).addMasterSourceFieldKey()).toBeNull();
  });
});
