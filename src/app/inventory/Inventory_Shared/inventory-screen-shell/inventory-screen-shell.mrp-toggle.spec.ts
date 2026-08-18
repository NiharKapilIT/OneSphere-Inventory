import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 4: MRP/Selling Price show/hide toggle on Purchase
// Invoice and Sales Invoice — a personal display preference (declutters the
// grid), not a permissions gate, so the underlying line data is untouched
// either way; toggleMrpSellingPriceColumns() only affects which columns
// transactionLineDisplayColumns() (entry grid) and grnExpandedColumns()
// (read-only drilldown) actually render.
describe('InventoryScreenShell — MRP/Selling Price show/hide toggle (item 4)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const config: InventoryScreenConfig = {
    key: 'salesInvoice',
    title: 'Sales Invoice',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-receipt'
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

  it('shows MRP and Selling Price by default', () => {
    const columns = component.transactionLineDisplayColumns(['Item / SKU', 'UOM', 'Rate', 'MRP', 'Selling Price', 'Amount']);
    expect(columns).toContain('MRP');
    expect(columns).toContain('Selling Price');
  });

  it('hides MRP and Selling Price from the entry grid once toggled', () => {
    component.toggleMrpSellingPriceColumns();
    const columns = component.transactionLineDisplayColumns(['Item / SKU', 'UOM', 'Rate', 'MRP', 'Selling Price', 'Amount']);
    expect(columns).not.toContain('MRP');
    expect(columns).not.toContain('Selling Price');
    expect(columns).toContain('Rate');
    expect(columns).toContain('Amount');
  });

  it('toggles back to showing them on a second click', () => {
    component.toggleMrpSellingPriceColumns();
    component.toggleMrpSellingPriceColumns();
    const columns = component.transactionLineDisplayColumns(['Item / SKU', 'MRP', 'Selling Price']);
    expect(columns).toContain('MRP');
    expect(columns).toContain('Selling Price');
  });

  it('hides the mrp/selling_price columns from the saved-records drilldown too', () => {
    component.savedRecordObjects.set([{
      doc_number: 'INV-26-00001',
      status: 'posted',
      items: [{ product_name: 'Dell I7', mrp: 60000, selling_price: 55000, qty: 1 }]
    }]);
    component.toggleMrpSellingPriceColumns();
    const columns = component.grnExpandedColumns(['INV-26-00001']);
    expect(columns.some(c => c.key === 'mrp')).toBe(false);
    expect(columns.some(c => c.key === 'selling_price')).toBe(false);
  });
});
