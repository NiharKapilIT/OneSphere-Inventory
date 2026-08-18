import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for items 9/17: HSN/SAC shows in the Draft & Posted saved-records
// drilldown for every transaction type with per-line products (Purchase
// Return and Sales Return explicitly called out in item 17) — resolved from
// each line's own product master record via purchaseInvoiceItemHsn(), since
// no transaction item table snapshots hsn_sac_code of its own.
describe('InventoryScreenShell — HSN/SAC column in saved-records drilldown (items 9, 17)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const baseConfig: InventoryScreenConfig = {
    key: 'purchaseReturn',
    title: 'Purchase Return',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-undo'
  };

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

  function setRecordWithHsnProduct(): void {
    (component as any).loadedProductObjects.set([
      { id: 501, product_name: 'Dell I7 Laptop', hsn_sac_code: '8471' } as any
    ]);
    component.savedRecordObjects.set([{
      return_number: 'PR-26-00001',
      status: 'posted',
      items: [{ product_id: 501, product_name: 'Dell I7 Laptop', qty: 2 }]
    }]);
  }

  it('adds an hsn column to Purchase Return when the line product has an HSN/SAC code', () => {
    setRecordWithHsnProduct();
    const columns = component.grnExpandedColumns(['PR-26-00001']);
    expect(columns.some(c => c.key === 'hsn')).toBe(true);
  });

  it('resolves the HSN cell value from the product master, not the line item itself', () => {
    setRecordWithHsnProduct();
    const item = component.grnExpandedItems(['PR-26-00001'])[0];
    const columns = component.grnExpandedColumns(['PR-26-00001']);
    const hsnColumn = columns.find(c => c.key === 'hsn')!;
    expect(component.grnExpandedCell(item, hsnColumn, 0)).toBe('8471');
  });

  it('shows the same hsn column for Sales Return', () => {
    component.config = { ...baseConfig, key: 'salesReturn', title: 'Sales Return' };
    setRecordWithHsnProduct();
    const columns = component.grnExpandedColumns(['PR-26-00001']);
    expect(columns.some(c => c.key === 'hsn')).toBe(true);
  });

  it('does not add an hsn column when no line product resolves an HSN/SAC code', () => {
    (component as any).loadedProductObjects.set([{ id: 501, product_name: 'AMC Support' } as any]);
    component.savedRecordObjects.set([{
      return_number: 'PR-26-00002',
      status: 'posted',
      items: [{ product_id: 501, product_name: 'AMC Support', qty: 1 }]
    }]);
    const columns = component.grnExpandedColumns(['PR-26-00002']);
    expect(columns.some(c => c.key === 'hsn')).toBe(false);
  });

  it('does not add an hsn column for document-note types (Debit/Credit Note)', () => {
    component.config = { ...baseConfig, key: 'debitNote', title: 'Debit Note' };
    setRecordWithHsnProduct();
    const columns = component.grnExpandedColumns(['PR-26-00001']);
    expect(columns.some(c => c.key === 'hsn')).toBe(false);
  });
});
