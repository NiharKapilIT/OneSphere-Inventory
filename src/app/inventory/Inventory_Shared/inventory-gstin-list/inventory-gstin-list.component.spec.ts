import { InventoryGstinListComponent, PartyGstinRow } from './inventory-gstin-list.component';

// Coverage for item 6: multiple GSTIN+State rows per Vendor/Customer.
function makeHost(initialRows: PartyGstinRow[] = []) {
  let values: Record<string, any> = { gstins: initialRows };
  return {
    dcAddressStates: ['Telangana', 'Karnataka'],
    formValues: () => values,
    collectFormField: (key: string, value: any) => { values = { ...values, [key]: value }; }
  };
}

describe('InventoryGstinListComponent (item 6)', () => {
  it('starts empty when the host has no gstins yet', () => {
    const component = new InventoryGstinListComponent();
    component.host = makeHost();
    expect(component.rows()).toEqual([]);
  });

  it('adds a row and marks the first one added as primary by default', () => {
    const component = new InventoryGstinListComponent();
    component.host = makeHost();
    component.addRow();
    expect(component.rows().length).toBe(1);
    expect(component.rows()[0].isPrimary).toBe(true);
  });

  it('does not auto-mark a second added row as primary', () => {
    const component = new InventoryGstinListComponent();
    component.host = makeHost();
    component.addRow();
    component.addRow();
    expect(component.rows()[1].isPrimary).toBe(false);
  });

  it('setGstin auto-derives stateCode from a 15-character GSTIN\'s leading digits', () => {
    const component = new InventoryGstinListComponent();
    component.host = makeHost([{ stateName: 'Telangana', stateCode: null, gstin: '', isPrimary: true }]);
    component.setGstin(0, '36abcde1234f1z5');
    expect(component.rows()[0].gstin).toBe('36ABCDE1234F1Z5');
    expect(component.rows()[0].stateCode).toBe('36');
  });

  it('leaves stateCode null for an incomplete GSTIN', () => {
    const component = new InventoryGstinListComponent();
    component.host = makeHost([{ stateName: '', stateCode: null, gstin: '', isPrimary: true }]);
    component.setGstin(0, '36ABCDE');
    expect(component.rows()[0].stateCode).toBeNull();
  });

  it('setPrimary flips exactly one row to primary and clears the rest', () => {
    const component = new InventoryGstinListComponent();
    component.host = makeHost([
      { stateName: 'Telangana', stateCode: '36', gstin: '36ABCDE1234F1Z5', isPrimary: true },
      { stateName: 'Karnataka', stateCode: '29', gstin: '29ABCDE1234F1Z1', isPrimary: false }
    ]);
    component.setPrimary(1);
    expect(component.rows()[0].isPrimary).toBe(false);
    expect(component.rows()[1].isPrimary).toBe(true);
  });

  it('removing the primary row promotes the first remaining row to primary', () => {
    const component = new InventoryGstinListComponent();
    component.host = makeHost([
      { stateName: 'Telangana', stateCode: '36', gstin: '36ABCDE1234F1Z5', isPrimary: true },
      { stateName: 'Karnataka', stateCode: '29', gstin: '29ABCDE1234F1Z1', isPrimary: false }
    ]);
    component.removeRow(0);
    expect(component.rows().length).toBe(1);
    expect(component.rows()[0].gstin).toBe('29ABCDE1234F1Z1');
    expect(component.rows()[0].isPrimary).toBe(true);
  });

  it('removing a non-primary row leaves the primary flag untouched', () => {
    const component = new InventoryGstinListComponent();
    component.host = makeHost([
      { stateName: 'Telangana', stateCode: '36', gstin: '36ABCDE1234F1Z5', isPrimary: true },
      { stateName: 'Karnataka', stateCode: '29', gstin: '29ABCDE1234F1Z1', isPrimary: false }
    ]);
    component.removeRow(1);
    expect(component.rows().length).toBe(1);
    expect(component.rows()[0].isPrimary).toBe(true);
  });

  // Items 24/25: keyPrefix lets the quick-add modal reuse this component
  // against a prefixed key ('quickVendorGstins') without colliding with
  // the host transaction screen's own top-level formValues() fields.
  describe('keyPrefix (items 24/25)', () => {
    it('reads/writes the unprefixed "gstins" key by default', () => {
      const component = new InventoryGstinListComponent();
      component.host = makeHost();
      component.addRow();
      expect(component.host.formValues()['gstins'].length).toBe(1);
      expect(component.host.formValues()['quickVendorGstins']).toBeUndefined();
    });

    it('reads/writes a prefixed key when keyPrefix is set, leaving the unprefixed key untouched', () => {
      const component = new InventoryGstinListComponent();
      component.host = makeHost();
      component.keyPrefix = 'quickVendor';
      component.addRow();
      expect(component.rows().length).toBe(1);
      expect(component.host.formValues()['quickVendorGstins'].length).toBe(1);
      expect(component.host.formValues()['gstins']).toEqual([]);
    });
  });
});
