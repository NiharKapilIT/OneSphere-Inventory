import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 6: multiple GSTIN+State rows per Vendor/Customer.
// normalizePartyGstinRows() is the one place that reads the gstins array
// coming back from sp_get_vendors/sp_upsert_vendor -- the controller's
// default System.Text.Json output serializes it camelCase (stateName,
// isPrimary), NOT the snake_case the SQL layer parses on the way in
// (state_name, is_primary). This is the exact same casing-mismatch bug
// class that silently broke Channel Partner earlier this session
// (channelPartnerId vs channel_partner_id) -- confirmed directly against
// System.Text.Json with ASP.NET Core's default JsonSerializerOptions that a
// snake_case key fails to bind to a PascalCase property at all. A dedicated
// spec here keeps this pinned down regardless of which casing the backend
// actually sends on any given day.
describe('InventoryScreenShell — Vendor/Customer GSTIN list casing (item 6)', () => {
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

  it('reads camelCase gstins rows (the real controller output shape)', () => {
    const rows = (component as any).normalizePartyGstinRows([
      { id: 1, stateName: 'Telangana', stateCode: '36', gstin: '36ABCDE1234F1Z5', isPrimary: true }
    ]);
    expect(rows).toEqual([{ stateName: 'Telangana', stateCode: '36', gstin: '36ABCDE1234F1Z5', isPrimary: true }]);
  });

  it('still reads snake_case gstins rows as a defensive fallback', () => {
    const rows = (component as any).normalizePartyGstinRows([
      { id: 1, state_name: 'Karnataka', state_code: '29', gstin: '29ABCDE1234F1Z1', is_primary: false }
    ]);
    expect(rows).toEqual([{ stateName: 'Karnataka', stateCode: '29', gstin: '29ABCDE1234F1Z1', isPrimary: false }]);
  });

  it('returns an empty array for a missing/non-array gstins value', () => {
    expect((component as any).normalizePartyGstinRows(undefined)).toEqual([]);
    expect((component as any).normalizePartyGstinRows(null)).toEqual([]);
  });

  it('loads the normalized gstins list into formValues on editRecordByRow for a vendor', () => {
    component.savedRecordObjects.set([{
      id: 9, vendor_name: 'Acme Vendor', vendor_code: 'VND-00009', status: 'active',
      gstins: [{ stateName: 'Telangana', stateCode: '36', gstin: '36ABCDE1234F1Z5', isPrimary: true }]
    }]);
    component.editRecordByRow(['VND-00009', 'Acme Vendor']);
    expect(component.formValues()['gstins']).toEqual([
      { stateName: 'Telangana', stateCode: '36', gstin: '36ABCDE1234F1Z5', isPrimary: true }
    ]);
  });
});
