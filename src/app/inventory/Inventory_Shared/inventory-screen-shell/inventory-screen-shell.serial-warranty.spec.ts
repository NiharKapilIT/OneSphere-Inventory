import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';
import { ProductItem } from '../inventory-config.service';

// "Final delivery" batch, 2026-09-11: per-serial warranty capture (migration
// 237), redesigning what used to be a single line-level Warranty Upto date
// (migration 229) regardless of how many serial units the line covered.
// Capture happens only where new serial units are actually created — GRN and
// Direct PI — with one shared default (mode + values) applied to every
// captured serial unless a specific one is individually overridden, per the
// user's own confirmed UX choice.
describe('InventoryScreenShell — per-serial warranty capture (migration 237)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const grnColumns = ['Product', 'Variant', 'Attribute', 'UOM', 'Received Qty', 'Accepted Qty', 'Rate', 'Batch No', 'Serial No', 'Expiry Date', 'Amount'];

  const grnConfig: InventoryScreenConfig = {
    key: 'goodsReceipt', title: 'Goods Receipt Note (GRN)', subtitle: '', kind: 'transaction', icon: 'pi pi-download',
    lineColumns: grnColumns
  };

  const warrantyProduct: ProductItem = {
    id: 103, product_code: 'ROO-001', sku: 'ROO-001', product_name: 'Rooftop Panels',
    product_type: 'Product', item_status: 'Active', reorder_level: 0,
    serial_applicable: true, warranty_applicable: true, serial_policy_name: 'Serial No.'
  } as ProductItem;

  const noWarrantyProduct: ProductItem = {
    id: 200, product_code: 'SCR-001', sku: 'SCR-001', product_name: 'Screens',
    product_type: 'Product', item_status: 'Active', reorder_level: 0,
    serial_applicable: true, warranty_applicable: false
  } as ProductItem;

  function makeComponent(config: InventoryScreenConfig): void {
    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
    (component as any).loadedProductObjects.set([warrantyProduct, noWarrantyProduct]);
    (component as any).loadedWarehouseObjects.set([{ id: 29, warehouse_name: 'Secunderabad Warehouse' } as any]);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();
  });

  describe('openSerialPicker() sets warrantyApplicable correctly', () => {
    it('true for a capture-mode row on a warranty-applicable product (GRN)', () => {
      makeComponent(grnConfig);
      const row = ['Rooftop Panels', '', '', 'NOS', '2', '2', '100', '', '', '', ''];
      component.entryLineRows.set([row]);
      component.openSerialPicker(0, row);
      expect(component.activeSerialPicker()?.mode).toBe('capture');
      expect(component.activeSerialPicker()?.warrantyApplicable).toBe(true);
    });

    it('false for a capture-mode row when the product has no warranty policy', () => {
      makeComponent(grnConfig);
      const row = ['Screens', '', '', 'NOS', '2', '2', '100', '', '', '', ''];
      component.entryLineRows.set([row]);
      component.openSerialPicker(0, row);
      expect(component.activeSerialPicker()?.warrantyApplicable).toBe(false);
    });

    it('false for a select-mode row (Sales Invoice) even on a warranty-applicable product — nothing to re-capture at sale', () => {
      const siConfig: InventoryScreenConfig = {
        key: 'salesInvoice', title: 'Sales Invoice', subtitle: '', kind: 'transaction', icon: 'pi pi-receipt',
        lineColumns: ['Item / SKU', 'UOM', 'Qty', 'Rate', 'Serial No', 'Amount']
      };
      makeComponent(siConfig);
      const row = ['Rooftop Panels', 'NOS', '1', '100', '', ''];
      component.entryLineRows.set([row]);
      component.formValues.set({ warehouse: 'Secunderabad Warehouse' });
      component.openSerialPicker(0, row);
      expect(component.activeSerialPicker()?.mode).toBe('select');
      expect(component.activeSerialPicker()?.warrantyApplicable).toBe(false);
    });
  });

  describe('resolvedWarrantyUpto()', () => {
    beforeEach(() => makeComponent(grnConfig));

    it('computes the date from manufacturing_date + term months', () => {
      const upto = (component as any).resolvedWarrantyUpto({ mode: 'term', manufacturing_date: '2026-08-01', warranty_term_months: 12, warranty_upto: null });
      expect(upto).toBe('2027-08-01');
    });

    it('returns the straight date as-is in straight mode', () => {
      const upto = (component as any).resolvedWarrantyUpto({ mode: 'straight', manufacturing_date: null, warranty_term_months: null, warranty_upto: '2028-01-15' });
      expect(upto).toBe('2028-01-15');
    });

    it('returns null when term mode is missing either input', () => {
      expect((component as any).resolvedWarrantyUpto({ mode: 'term', manufacturing_date: '2026-08-01', warranty_term_months: null, warranty_upto: null })).toBeNull();
      expect((component as any).resolvedWarrantyUpto(null)).toBeNull();
    });
  });

  describe('closeSerialPicker(true) resolves the shared default + per-serial overrides', () => {
    beforeEach(() => makeComponent(grnConfig));

    it('applies the shared default to every serial with no override', () => {
      const row = ['Rooftop Panels', '', '', 'NOS', '2', '2', '100', '', '', '', ''];
      component.entryLineRows.set([row]);
      component.openSerialPicker(0, row);
      (component as any).commitSerialPickerCaptureValue('SN-A');
      (component as any).commitSerialPickerCaptureValue('SN-B');
      component.setSerialPickerWarrantyDefaultMode('term');
      component.setSerialPickerWarrantyDefaultMfgDate('2026-08-01');
      component.setSerialPickerWarrantyDefaultTermMonths('12');
      component.closeSerialPicker(true);

      const saved = component.lineSerialWarrantyMap()[0];
      expect(saved['SN-A']).toEqual({ mode: 'term', manufacturing_date: '2026-08-01', warranty_term_months: 12, warranty_upto: null });
      expect(saved['SN-B']).toEqual(saved['SN-A']);
    });

    it('a per-serial override wins over the shared default for that one serial only', () => {
      const row = ['Rooftop Panels', '', '', 'NOS', '2', '2', '100', '', '', '', ''];
      component.entryLineRows.set([row]);
      component.openSerialPicker(0, row);
      (component as any).commitSerialPickerCaptureValue('SN-A');
      (component as any).commitSerialPickerCaptureValue('SN-B');
      component.setSerialPickerWarrantyDefaultMode('term');
      component.setSerialPickerWarrantyDefaultMfgDate('2026-08-01');
      component.setSerialPickerWarrantyDefaultTermMonths('12');

      component.toggleSerialPickerWarrantyEdit('SN-B');
      component.setSerialPickerSerialWarrantyMode('SN-B', 'straight');
      component.setSerialPickerSerialWarrantyStraightDate('SN-B', '2028-01-01');
      component.closeSerialPicker(true);

      const saved = component.lineSerialWarrantyMap()[0];
      expect(saved['SN-A']).toEqual({ mode: 'term', manufacturing_date: '2026-08-01', warranty_term_months: 12, warranty_upto: null });
      expect(saved['SN-B']).toEqual({ mode: 'straight', manufacturing_date: null, warranty_term_months: null, warranty_upto: '2028-01-01' });
    });

    it('clearSerialPickerWarrantyOverride() reverts a serial back to the shared default', () => {
      const row = ['Rooftop Panels', '', '', 'NOS', '1', '1', '100', '', '', '', ''];
      component.entryLineRows.set([row]);
      component.openSerialPicker(0, row);
      (component as any).commitSerialPickerCaptureValue('SN-A');
      component.setSerialPickerWarrantyDefaultMode('straight');
      component.setSerialPickerWarrantyDefaultStraightDate('2027-01-01');

      component.toggleSerialPickerWarrantyEdit('SN-A');
      component.setSerialPickerSerialWarrantyStraightDate('SN-A', '2099-01-01');
      component.clearSerialPickerWarrantyOverride('SN-A');
      component.closeSerialPicker(true);

      expect(component.lineSerialWarrantyMap()[0]['SN-A'].warranty_upto).toBe('2027-01-01');
    });

    it('does not persist anything on Cancel (save=false)', () => {
      const row = ['Rooftop Panels', '', '', 'NOS', '1', '1', '100', '', '', '', ''];
      component.entryLineRows.set([row]);
      component.openSerialPicker(0, row);
      (component as any).commitSerialPickerCaptureValue('SN-A');
      component.setSerialPickerWarrantyDefaultMfgDate('2026-08-01');
      component.closeSerialPicker(false);

      expect(component.lineSerialWarrantyMap()[0]).toBeUndefined();
    });

    it('a non-warranty product never populates lineSerialWarrantyMap', () => {
      const row = ['Screens', '', '', 'NOS', '1', '1', '100', '', '', '', ''];
      component.entryLineRows.set([row]);
      component.openSerialPicker(0, row);
      (component as any).commitSerialPickerCaptureValue('SN-Z');
      component.closeSerialPicker(true);

      expect(component.lineSerialWarrantyMap()[0]).toBeUndefined();
    });
  });

  describe('save payload carries serial_warranty (GRN / Direct PI)', () => {
    it('purchaseGrnItems() includes each row\'s captured warranty map', () => {
      makeComponent(grnConfig);
      component.formValues.set({ warehouse: 'Secunderabad Warehouse', vendor: 'Acme' });
      const row = ['Rooftop Panels', '', '', 'NOS', '1', '1', '100', '', '', '', ''];
      component.entryLineRows.set([row]);
      (component as any).lineSerialUnitsMap.set({ 0: ['SN-A'] });
      (component as any).lineSerialWarrantyMap.set({ 0: { 'SN-A': { mode: 'term', manufacturing_date: '2026-08-01', warranty_term_months: 12, warranty_upto: null } } });

      const items = (component as any).purchaseGrnItems('Secunderabad Warehouse');
      expect(items[0].serial_warranty).toEqual({ 'SN-A': { mode: 'term', manufacturing_date: '2026-08-01', warranty_term_months: 12, warranty_upto: null } });
    });

    it('purchasePiItems() includes each row\'s captured warranty map', () => {
      const piConfig: InventoryScreenConfig = {
        key: 'purchaseInvoice', title: 'Purchase Invoice', subtitle: '', kind: 'transaction', icon: 'pi pi-file',
        lineColumns: ['Product', 'Variant', 'Attribute', 'UOM', 'Qty', 'Rate', 'MRP', 'Selling Price', 'Disc %', 'GST', 'Batch No', 'Serial No', 'Expiry Date', 'Warranty Upto', 'Amount']
      };
      makeComponent(piConfig);
      component.formValues.set({ vendor: 'Acme' });
      const row = ['Rooftop Panels', '', '', 'NOS', '1', '100', '', '', '', '', '', '', '', '', ''];
      component.entryLineRows.set([row]);
      (component as any).lineSerialUnitsMap.set({ 0: ['SN-A'] });
      (component as any).lineSerialWarrantyMap.set({ 0: { 'SN-A': { mode: 'straight', manufacturing_date: null, warranty_term_months: null, warranty_upto: '2028-01-01' } } });

      const items = (component as any).purchasePiItems();
      expect(items[0].serial_warranty).toEqual({ 'SN-A': { mode: 'straight', manufacturing_date: null, warranty_term_months: null, warranty_upto: '2028-01-01' } });
    });
  });

  describe('draft round-trip restores lineSerialWarrantyMap', () => {
    it('hydrateLineSerialWarrantyFromRecord() restores per-serial warranty from a reopened GRN draft', () => {
      makeComponent(grnConfig);
      const record = {
        id: 1, grn_number: 'GRN-26-00099', status: 'draft', items: [
          { product_name: 'Rooftop Panels', serial_numbers: ['SN-A'], serial_warranty: { 'SN-A': { mode: 'term', manufacturing_date: '2026-08-01', warranty_term_months: 12, warranty_upto: null } } }
        ]
      };
      (component as any).hydrateLineSerialWarrantyFromRecord(record);
      expect(component.lineSerialWarrantyMap()[0]['SN-A'].warranty_term_months).toBe(12);
    });

    it('is a no-op for a record whose items carry no serial_warranty', () => {
      makeComponent(grnConfig);
      (component as any).hydrateLineSerialWarrantyFromRecord({ items: [{ product_name: 'Screens' }] });
      expect(component.lineSerialWarrantyMap()).toEqual({});
    });
  });

  it('clearConfigForm() resets lineSerialWarrantyMap', () => {
    makeComponent(grnConfig);
    (component as any).lineSerialWarrantyMap.set({ 0: { 'SN-A': { mode: 'term', manufacturing_date: null, warranty_term_months: null, warranty_upto: null } } });
    component.clearConfigForm();
    expect(component.lineSerialWarrantyMap()).toEqual({});
  });
});
