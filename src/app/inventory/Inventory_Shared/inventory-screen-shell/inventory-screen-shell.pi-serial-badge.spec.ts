import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';
import { ProductItem } from '../inventory-config.service';

// Coverage for the PI Serial No badge: a GRN-linked PI's Serial No cell used
// to render as plain readonly text -- an inline comma-joined list of the
// actual serial number strings (transactionLineSerialText()/
// lineGridReadonlyCellText()'s raw-value fallback). That's replaced by a
// compact "{policy name} · {count}" badge (purchase-invoice.html's
// serialViewBadge @let + this file's serialViewBadgeTextForRow()), clickable
// to open a read-only view of the real serial numbers via a new 'view' mode
// on the existing serial-picker modal/state (openSerialPickerReadOnly()).
describe('InventoryScreenShell — PI Serial No read-only badge', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const lineColumns = ['Product', 'Variant', 'Attribute', 'UOM', 'Accepted Qty', 'Rate', 'Batch No', 'Serial No', 'Amount'];

  const config: InventoryScreenConfig = {
    key: 'purchaseInvoice',
    title: 'Purchase Invoice',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-file',
    lineColumns
  };

  const serialProduct: ProductItem = {
    id: 14,
    product_code: 'PHN-001',
    sku: 'PHN-001',
    product_name: 'Serial Phone',
    product_type: 'Goods',
    item_status: 'Active',
    reorder_level: 0,
    serial_applicable: true,
    serial_policy_name: 'IMEI Policy'
  } as ProductItem;

  const batchProduct: ProductItem = {
    id: 15,
    product_code: 'BAG-001',
    sku: 'BAG-001',
    product_name: 'Rice Bag',
    product_type: 'Goods',
    item_status: 'Active',
    reorder_level: 0,
    serial_applicable: false
  } as ProductItem;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    (component as any).loadedProductObjects.set([serialProduct, batchProduct]);
    fixture.detectChanges();
  });

  // Row layout matches lineColumns: [Product, Variant, Attribute, UOM, Accepted Qty, Rate, Batch No, Serial No, Amount]
  const rowFor = (productName: string) => [productName, '', '', 'Nos', '3', '50000', '', '', '150000'];

  it('returns "{policy name} · {count}" once serials are captured for a serial-tracked row', () => {
    (component as any).lineSerialUnitsMap.set({ 0: ['IMEI-001', 'IMEI-002', 'IMEI-003'] });
    const row = rowFor('Serial Phone');
    const text = component.serialViewBadgeTextForRow(0, row);
    expect(text).toBe('IMEI Policy · 3');
  });

  it('returns empty (no badge) when the product is not serial-applicable', () => {
    (component as any).lineSerialUnitsMap.set({ 0: [] });
    const row = rowFor('Rice Bag');
    expect(component.serialViewBadgeTextForRow(0, row)).toBe('');
  });

  it('returns empty (no badge) for a serial-tracked row with zero captured serials', () => {
    (component as any).lineSerialUnitsMap.set({});
    const row = rowFor('Serial Phone');
    expect(component.serialViewBadgeTextForRow(0, row)).toBe('');
  });

  it('falls back to the derived serial label when the product has no explicit serial_policy_name', () => {
    const unnamedPolicyProduct: ProductItem = {
      ...serialProduct,
      id: 16,
      product_code: 'CHS-001',
      sku: 'CHS-001',
      product_name: 'Truck Chassis',
      serial_policy_name: ''
    } as ProductItem;
    (component as any).loadedProductObjects.set([serialProduct, batchProduct, unnamedPolicyProduct]);
    (component as any).lineSerialUnitsMap.set({ 0: ['CH-1'] });
    const row = rowFor('Truck Chassis');
    expect(component.serialViewBadgeTextForRow(0, row)).toBe('Serial No · 1');
  });

  it('openSerialPickerReadOnly opens a read-only "view" picker seeded from the already-captured serials, without mutating lineSerialUnitsMap', () => {
    (component as any).lineSerialUnitsMap.set({ 0: ['IMEI-001', 'IMEI-002', 'IMEI-003'] });
    const row = rowFor('Serial Phone');

    component.openSerialPickerReadOnly(0, row);

    const picker = (component as any).activeSerialPicker();
    expect(picker?.mode).toBe('view');
    expect(picker?.qtyNeeded).toBe(3);
    expect(picker?.productName).toBe('Serial Phone');
    expect((component as any).serialPickerDraftValues()).toEqual(['IMEI-001', 'IMEI-002', 'IMEI-003']);

    // Closing without saving (the only option in 'view' mode) must not touch
    // the underlying per-row serial data.
    component.closeSerialPicker(false);
    expect((component as any).lineSerialUnitsMap()[0]).toEqual(['IMEI-001', 'IMEI-002', 'IMEI-003']);
  });
});
