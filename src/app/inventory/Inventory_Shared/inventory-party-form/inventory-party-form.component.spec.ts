import { InventoryPartyFormComponent } from './inventory-party-form.component';

// Coverage for items 24/25: the shared Vendor/Customer field set used by
// both Master screens and the quick-add modal.
function makeHost(overrides: Record<string, any> = {}) {
  let values: Record<string, any> = {};
  return {
    formValues: () => values,
    collectFormField: (key: string, value: any) => { values = { ...values, [key]: value }; },
    quickVendorLinkedContact: () => values['__quickVendorLinkedContact'] ?? null,
    quickCustomerLinkedContact: () => values['__quickCustomerLinkedContact'] ?? null,
    selectedPartyContact: () => values['__selectedPartyContact'] ?? null,
    selectQuickVendorContact: (contact: any) => { values = { ...values, __quickVendorLinkedContact: contact }; },
    selectQuickCustomerContact: (contact: any) => { values = { ...values, __quickCustomerLinkedContact: contact }; },
    selectPartyContact: (contact: any) => { values = { ...values, __selectedPartyContact: contact }; },
    ...overrides
  };
}

describe('InventoryPartyFormComponent (items 24/25)', () => {
  it('pfx() returns the bare field name when keyPrefix is empty (Master mode)', () => {
    const component = new InventoryPartyFormComponent();
    component.keyPrefix = '';
    expect(component.pfx('bankPayeeName')).toBe('bankPayeeName');
    expect(component.pfx('creditLimit')).toBe('creditLimit');
  });

  it('pfx() camelCase-prefixes the field name when keyPrefix is set (quick-add mode)', () => {
    const component = new InventoryPartyFormComponent();
    component.keyPrefix = 'quickVendor';
    expect(component.pfx('bankPayeeName')).toBe('quickVendorBankPayeeName');
    expect(component.pfx('creditLimit')).toBe('quickVendorCreditLimit');
  });

  it('categoryKey() uses the historical unprefixed key on Master (vendorCategory vs customerCategory)', () => {
    const vendorComponent = new InventoryPartyFormComponent();
    vendorComponent.partyKind = 'vendor';
    vendorComponent.keyPrefix = '';
    expect(vendorComponent.categoryKey()).toBe('vendorCategory');

    const customerComponent = new InventoryPartyFormComponent();
    customerComponent.partyKind = 'customer';
    customerComponent.keyPrefix = '';
    expect(customerComponent.categoryKey()).toBe('customerCategory');
  });

  it('categoryKey() uses a clean prefixed key in quick-add mode, for both party kinds', () => {
    const component = new InventoryPartyFormComponent();
    component.partyKind = 'vendor';
    component.keyPrefix = 'quickVendor';
    expect(component.categoryKey()).toBe('quickVendorCategory');
  });

  it('categoryOptions differs by partyKind, and showPriceList is customer-only', () => {
    const vendorComponent = new InventoryPartyFormComponent();
    vendorComponent.partyKind = 'vendor';
    expect(vendorComponent.categoryOptions).toContain('Supplier');
    expect(vendorComponent.showPriceList).toBe(false);

    const customerComponent = new InventoryPartyFormComponent();
    customerComponent.partyKind = 'customer';
    expect(customerComponent.categoryOptions).toContain('Dealer');
    expect(customerComponent.showPriceList).toBe(true);
  });

  it('in quick-add mode, selectedContact()/onContactChange() read/write the party-kind-specific linked-contact signal', () => {
    const component = new InventoryPartyFormComponent();
    component.host = makeHost();
    component.partyKind = 'vendor';
    component.nameCodeMode = 'quickAddSignals';

    const contact = { id: 7, name: 'Acme Supplies' };
    component.onContactChange(contact);
    expect(component.host.quickVendorLinkedContact()).toEqual(contact);
    expect(component.host.quickCustomerLinkedContact()).toBeNull();
    expect(component.selectedContact()).toEqual(contact);
  });

  it('in Master mode, selectedContact()/onContactChange() delegate to the host\'s own selectPartyContact()', () => {
    const component = new InventoryPartyFormComponent();
    component.host = makeHost();
    component.nameCodeMode = 'formValues';

    const contact = { id: 3, name: 'Beta Traders' };
    component.onContactChange(contact);
    expect(component.host.selectedPartyContact()).toEqual(contact);
    expect(component.selectedContact()).toEqual(contact);
  });
});
