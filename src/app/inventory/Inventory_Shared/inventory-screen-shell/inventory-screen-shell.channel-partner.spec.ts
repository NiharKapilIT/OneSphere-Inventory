import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';
import { PurchaseRefDoc } from '../inventory-transactions.service';

// Coverage for item 2 (Channel Partner): required directly on Sales Order
// and Sales Invoice; on Delivery Challan and Sales Return it has no editable
// field of its own and instead auto-carries whatever the referenced SO/SI
// already has (selectSalesReference()) -- same "in loop" treatment as
// customer/warehouse/etc.
describe('InventoryScreenShell — Channel Partner (item 2)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const baseConfig: InventoryScreenConfig = {
    key: 'deliveryChallan',
    title: 'Delivery Challan',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-truck'
  };

  const soDoc = (overrides: Partial<PurchaseRefDoc> = {}): PurchaseRefDoc => ({
    id: 501,
    doc_type: 'SO',
    doc_number: 'SO-26-00001',
    status: 'posted',
    party_name: 'Acme Corp',
    channel_partner_id: 42,
    channel_partner_name: 'Bright Distributors',
    items: [{ id: 9001, product_name: 'Dell I7' }],
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = baseConfig;
    fixture.detectChanges();
  });

  it('carries channel_partner_id/name from a picked SO into a Delivery Challan, which has no editable field of its own', () => {
    component.selectSalesReference(soDoc());
    expect(component.formValues()['channelPartnerId']).toBe(42);
    expect(component.formValues()['channelPartner']).toBe('Bright Distributors');
  });

  it('carries channel_partner_id/name from a picked SO into a Sales Invoice as a default (still editable)', () => {
    component.config = { ...baseConfig, key: 'salesInvoice' };
    component.selectSalesReference(soDoc());
    expect(component.formValues()['channelPartnerId']).toBe(42);
    expect(component.formValues()['channelPartner']).toBe('Bright Distributors');
  });

  it('carries channel_partner_id/name from a picked Sales Invoice into a Sales Return, which has no editable field of its own', () => {
    component.config = { ...baseConfig, key: 'salesReturn' };
    const invoiceDoc = soDoc({ id: 601, doc_type: 'SI', doc_number: 'INV-26-00002' });
    component.selectSalesReference(invoiceDoc);
    expect(component.formValues()['channelPartnerId']).toBe(42);
    expect(component.formValues()['channelPartner']).toBe('Bright Distributors');
  });

  it('does not clobber an existing Delivery Challan channelPartner when the referenced doc has none', () => {
    component.formValues.set({ channelPartner: 'Existing Partner', channelPartnerId: 7 });
    component.selectSalesReference(soDoc({ channel_partner_id: undefined, channel_partner_name: undefined }));
    expect(component.formValues()['channelPartner']).toBe('Existing Partner');
  });

  function validate(key: string, values: Record<string, any>): string {
    component.config = { ...baseConfig, key, kind: 'transaction' };
    component.formValues.set(values);
    const payload = (component as any).buildPayload();
    return (component as any).validatePayload(payload);
  }

  // Channel Partner is no longer required on every sale. Most sales are direct,
  // and demanding a partner on all of them blocked the ordinary case. The
  // "Referral Business" switch declares the intent: the partner is required
  // only when it is on, and the field is hidden entirely when it is off.

  it('allows saving a Sales Order with no Channel Partner when it is not referral business', () => {
    const message = validate('salesOrder', {
      customer: 'Acme Corp', channelPartner: '', referralBusiness: 'No'
    });
    expect(message).not.toContain('Channel Partner');
  });

  it('allows saving a Sales Invoice with no Channel Partner when it is not referral business', () => {
    const message = validate('salesInvoice', {
      customer: 'Acme Corp', channelPartner: '', referralBusiness: 'No',
      invoiceNo: 'INV-1', invoiceDate: '2026-08-15'
    });
    expect(message).not.toContain('Channel Partner');
  });

  it('treats an absent Referral Business flag as direct business, not referral', () => {
    // A document saved before this switch existed carries no flag at all; it
    // must not start failing validation retroactively.
    const message = validate('salesOrder', { customer: 'Acme Corp', channelPartner: '' });
    expect(message).not.toContain('Channel Partner');
  });

  it('requires a Channel Partner once the sale IS marked referral business', () => {
    const message = validate('salesOrder', {
      customer: 'Acme Corp', channelPartner: '', referralBusiness: 'Yes'
    });
    expect(message).toContain('Channel Partner is required');
  });

  it('accepts a referral Sales Invoice that names its Channel Partner', () => {
    const message = validate('salesInvoice', {
      customer: 'Acme Corp', channelPartner: 'Bright Referrals', referralBusiness: 'Yes',
      invoiceNo: 'INV-1', invoiceDate: '2026-08-15'
    });
    expect(message).not.toContain('Channel Partner');
  });

  it('does not require a Channel Partner to save a Delivery Challan', () => {
    const message = validate('deliveryChallan', { customer: 'Acme Corp' });
    expect(message).not.toContain('Channel Partner is required');
  });

  it('does not require a Channel Partner to save a Sales Return', () => {
    const message = validate('salesReturn', { customer: 'Acme Corp' });
    expect(message).not.toContain('Channel Partner is required');
  });
});
