import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 15: once a Purchase Return / Sales Return line is
// populated from a picked PI / Sales Invoice reference (selectPurchaseReference
// / selectSalesReference both stamp lineRefItemIdMap[rowIndex] for every
// referenced row — see 139... no, see inventory-screen-shell.ts:10345/10526),
// the Product/Variant/Attribute on that row must be locked — you can only
// return what was actually on the referenced document. A row added manually
// via "+ Add row" (no lineRefItemIdMap entry) is the "direct return, no
// reference" path and stays fully editable.
describe('InventoryScreenShell — Purchase/Sales Return locks Product/Variant/Attribute to the referenced doc (item 15)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const purchaseReturnConfig: InventoryScreenConfig = {
    key: 'purchaseReturn',
    title: 'Purchase Return',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-reply',
    lineColumns: ['Product', 'Variant', 'Attribute', 'UOM', 'Invoice Qty', 'Return Qty', 'Rate', 'GST', 'Return Amount', 'Serial No']
  };

  async function setup(config: InventoryScreenConfig): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
  }

  it('locks PI-sourced Purchase Return columns except Return Qty and Serial No', async () => {
    await setup(purchaseReturnConfig);
    component.lineRefItemIdMap.set({ 0: { attributeId: null, attributeName: null, attributeValue: null } });
    expect(component.lineGridCellReadonly(0, [], 'Product')).toBe(true);
    expect(component.lineGridCellReadonly(0, [], 'Variant')).toBe(true);
    expect(component.lineGridCellReadonly(0, [], 'Attribute')).toBe(true);
    expect(component.lineGridCellReadonly(0, [], 'UOM')).toBe(true);
    expect(component.lineGridCellReadonly(0, [], 'Invoice Qty')).toBe(true);
    expect(component.lineGridCellReadonly(0, [], 'Rate')).toBe(true);
    expect(component.lineGridCellReadonly(0, [], 'GST')).toBe(true);
    expect(component.lineGridCellReadonly(0, [], 'Return Amount')).toBe(true);
    expect(component.lineGridCellReadonly(0, [], 'Return Qty')).toBe(false);
    expect(component.lineGridCellReadonly(0, [], 'Serial No')).toBe(false);
  });

  it('leaves a manually-added row (no reference entry) fully editable', async () => {
    await setup(purchaseReturnConfig);
    component.lineRefItemIdMap.set({ 0: { attributeId: null, attributeName: null, attributeValue: null } });
    expect(component.lineGridCellReadonly(1, [], 'Product')).toBe(false);
    expect(component.lineGridCellReadonly(1, [], 'Variant')).toBe(false);
  });

  it('leaves everything editable on a fully direct return (no reference bound at all)', async () => {
    await setup(purchaseReturnConfig);
    expect(component.lineGridCellReadonly(0, [], 'Product')).toBe(false);
  });

  it('applies the same lock to Sales Return', async () => {
    await setup({ ...purchaseReturnConfig, key: 'salesReturn', title: 'Sales Return' });
    component.lineRefItemIdMap.set({ 0: { attributeId: null, attributeName: null, attributeValue: null } });
    expect(component.lineGridCellReadonly(0, [], 'Product')).toBe(true);
  });

  it('does not lock other transaction screens the same way', async () => {
    await setup({ ...purchaseReturnConfig, key: 'salesInvoice', title: 'Sales Invoice' });
    component.lineRefItemIdMap.set({ 0: { attributeId: null, attributeName: null, attributeValue: null } });
    expect(component.lineGridCellReadonly(0, [], 'Product')).toBe(false);
  });
});
