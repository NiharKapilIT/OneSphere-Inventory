import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 35: Opening Stock Entry -- previously unwired, same
// starting point as Stock Transfer/Adjustment. The one thing worth pinning
// down here specifically: each line carries its own Rate (unlike Stock
// Adjustment's Increase, which uses the product's current cost_price), so
// the payload must include it per line.
describe('InventoryScreenShell — Opening Stock Entry (item 35)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const config: InventoryScreenConfig = {
    key: 'openingStockEntry',
    title: 'Opening Stock Entry',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-database',
    lineColumns: ['Product', 'UOM', 'Opening Qty', 'Rate', 'Total Value', 'Batch No', 'Serial No']
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

    (component as any).loadedWarehouseObjects.set([{ id: 6, warehouse_name: 'Secunderabad' } as any]);
    (component as any).loadedProductObjects.set([{ id: 6, product_name: 'Tomatoes' } as any]);
  });

  it('builds a payload carrying each line\'s own Rate', () => {
    component.formValues.set({
      entryNo: 'OSE-EL-26-00001', entryDate: '2026-08-16',
      warehouse: 'Secunderabad', status: 'Posted'
    });
    component.entryLineRows.set([['Tomatoes', 'Kg', '100', '42', '', '', '']]);

    const payload = (component as any).buildPayload();
    expect(payload.warehouse_id).toBe(6);
    expect(payload.status).toBe('posted');
    expect(payload.post).toBe(true);
    expect(payload.items[0].product_id).toBe(6);
    expect(payload.items[0].qty).toBe(100);
    expect(payload.items[0].rate).toBe(42);
  });

  it('does not set the posted flag for a draft save', () => {
    component.formValues.set({ warehouse: 'Secunderabad', status: 'Draft' });
    component.entryLineRows.set([['Tomatoes', 'Kg', '100', '42', '', '', '']]);
    const payload = (component as any).buildPayload();
    expect(payload.status).toBe('draft');
    expect(payload.post).toBe(false);
  });

  it('loads a saved entry back into the form and line items', () => {
    component.savedRecordObjects.set([{
      id: 1, entry_number: 'OSE-EL-26-00001', entry_date: '2026-08-16',
      warehouse_name: 'Secunderabad', status: 'posted',
      items: [{ product_name: 'Tomatoes', uom_name: 'Kg', qty: 100, rate: 42, amount: 4200 }]
    }]);
    component.editRecordByRow(['OSE-EL-26-00001']);
    expect(component.formValues()['warehouse']).toBe('Secunderabad');
    expect(component.entryLineRows().length).toBe(1);
  });

  it('reports a posted entry as posted, a draft as not', () => {
    component.formValues.set({ status: 'Posted' });
    expect(component.isCurrentRecordPosted()).toBe(true);
    component.formValues.set({ status: 'Draft' });
    expect(component.isCurrentRecordPosted()).toBe(false);
  });
});
