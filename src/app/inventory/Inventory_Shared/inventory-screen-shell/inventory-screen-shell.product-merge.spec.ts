import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 8: Variant + Attribute no longer render as their own
// grid columns anywhere — they're merged into the Product cell as a second
// line (read-only saved-records drilldown: grnExpandedProductSubtitle()) or
// a stacked sub-row of controls (live entry grid: lineGridColumnIsProduct()
// branch in each transaction screen's own template). transactionLineDisplayColumns()
// is the single shared gate behind both — this pins its contract down so it
// can't silently start rendering separate Variant/Attribute columns again.
describe('InventoryScreenShell — Product/Variant/Attribute merge (item 8)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const config: InventoryScreenConfig = {
    key: 'salesOrder',
    title: 'Sales Order',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-shopping-bag'
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

  describe('transactionLineDisplayColumns()', () => {
    it('strips Variant and Attribute from a transaction line-column list', () => {
      const result = component.transactionLineDisplayColumns(['Product', 'Variant', 'Attribute', 'UOM', 'Qty', 'Amount']);
      expect(result).toEqual(['Product', 'UOM', 'Qty', 'Amount']);
    });

    it('is case/spacing-insensitive when matching Variant and Attribute', () => {
      const result = component.transactionLineDisplayColumns(['Product', 'variant', 'ATTRIBUTE ', 'Amount']);
      expect(result).toEqual(['Product', 'Amount']);
    });

    it('leaves non-transaction (master) screens untouched', () => {
      component.config = { ...config, key: 'variantMaster', kind: 'master' };
      const result = component.transactionLineDisplayColumns(['Variant', 'Attribute']);
      expect(result).toEqual(['Variant', 'Attribute']);
    });

    it('passes through columns that are not Variant/Attribute unchanged', () => {
      const result = component.transactionLineDisplayColumns(['Product', 'UOM', 'Rate', 'GST']);
      expect(result).toEqual(['Product', 'UOM', 'Rate', 'GST']);
    });
  });

  describe('grnExpandedProductSubtitle()', () => {
    it('combines variant name and a single attribute into one subtitle', () => {
      const item = { variant_name: '256GB', attribute_value: 'Color: Black' };
      const subtitle = (component as any).grnExpandedProductSubtitle(item);
      expect(subtitle).toContain('256GB');
      expect(subtitle).toContain('Black');
    });

    it('returns just the variant when there is no attribute', () => {
      const item = { variant_name: '256GB' };
      expect((component as any).grnExpandedProductSubtitle(item)).toBe('256GB');
    });

    it('returns an empty string when there is neither variant nor attribute', () => {
      const item = { product_name: 'AMC Support' };
      expect((component as any).grnExpandedProductSubtitle(item)).toBe('');
    });
  });

  describe('grnExpandedColumns() no longer emits separate Variant/Attribute columns', () => {
    it('does not include a variant or attr: column even when items carry variant/attribute data', () => {
      component.savedRecordObjects.set([{
        doc_number: 'SO-26-00001',
        status: 'posted',
        items: [{ product_name: 'Dell I7', variant_name: '256GB', attribute_value: 'Color: Black' }]
      }]);
      const columns = component.grnExpandedColumns(['SO-26-00001']);
      expect(columns.some(c => c.key === 'variant')).toBe(false);
      expect(columns.some(c => c.key.startsWith('attr:'))).toBe(false);
      expect(columns.some(c => c.key === 'product')).toBe(true);
    });
  });
});
