import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 12: Stock Transfer -- previously a completely unwired
// screen (no table, no posting logic, sidebar entry disabled). This pins
// down the frontend save-payload construction and saved-record load-back,
// the two custom paths this screen needed (buildStockTransferPayload/
// stockTransferItems is deliberately its own builder rather than routed
// through isPurchaseTransactionKey(), which pulls in vendor/PO-reference
// logic that doesn't apply to a plain From/To warehouse move).
describe('InventoryScreenShell — Stock Transfer (item 12)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const config: InventoryScreenConfig = {
    key: 'stockTransfer',
    title: 'Stock Transfer',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-arrow-right-arrow-left',
    lineColumns: ['Item / SKU', 'Variant', 'Attribute', 'UOM', 'Qty', 'Batch No', 'Serial No']
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

    (component as any).loadedWarehouseObjects.set([
      { id: 6, warehouse_name: 'Secunderabad' } as any,
      { id: 7, warehouse_name: 'Warangal' } as any
    ]);
    (component as any).loadedProductObjects.set([
      { id: 14, product_name: 'Dell Desktop' } as any
    ]);
  });

  it('builds a stock transfer payload with resolved warehouse ids and a posted flag', () => {
    component.formValues.set({
      transferNo: 'ST-EL-26-00001',
      transferDate: '2026-08-16',
      fromWarehouse: 'Secunderabad',
      toWarehouse: 'Warangal',
      remarks: 'Branch rebalance',
      status: 'Posted'
    });
    component.entryLineRows.set([['Dell Desktop', '', '', 'Nos', '2', '', '']]);

    const payload = (component as any).buildPayload();
    expect(payload.from_warehouse_id).toBe(6);
    expect(payload.to_warehouse_id).toBe(7);
    expect(payload.transfer_number).toBe('ST-EL-26-00001');
    expect(payload.status).toBe('posted');
    expect(payload.post).toBe(true);
    expect(payload.items.length).toBe(1);
    expect(payload.items[0].product_id).toBe(14);
    expect(payload.items[0].qty).toBe(2);
  });

  it('does not set the posted flag for a draft save', () => {
    component.formValues.set({
      fromWarehouse: 'Secunderabad', toWarehouse: 'Warangal', status: 'Draft'
    });
    component.entryLineRows.set([['Dell Desktop', '', '', 'Nos', '2', '', '']]);
    const payload = (component as any).buildPayload();
    expect(payload.status).toBe('draft');
    expect(payload.post).toBe(false);
  });

  it('splits a comma-separated Serial No cell into a serial_numbers array', () => {
    component.formValues.set({ fromWarehouse: 'Secunderabad', toWarehouse: 'Warangal' });
    component.entryLineRows.set([['Dell Desktop', '', '', 'Nos', '2', '', 'SN-001, SN-002']]);
    const payload = (component as any).buildPayload();
    expect(payload.items[0].serial_numbers).toEqual(['SN-001', 'SN-002']);
  });

  it('leaves serial_numbers null when the Serial No cell is blank', () => {
    component.formValues.set({ fromWarehouse: 'Secunderabad', toWarehouse: 'Warangal' });
    component.entryLineRows.set([['Dell Desktop', '', '', 'Nos', '2', '', '']]);
    const payload = (component as any).buildPayload();
    expect(payload.items[0].serial_numbers).toBeNull();
  });

  it('loads a saved stock transfer record back into the form and line items', () => {
    component.savedRecordObjects.set([{
      id: 1, transfer_number: 'ST-EL-26-00001', transfer_date: '2026-08-16',
      from_warehouse_name: 'Secunderabad', to_warehouse_name: 'Warangal',
      status: 'posted',
      items: [{ product_name: 'Dell Desktop', uom_name: 'Nos', qty: 2, serial_numbers: ['SN-001', 'SN-002'] }]
    }]);
    component.editRecordByRow(['ST-EL-26-00001']);
    expect(component.formValues()['fromWarehouse']).toBe('Secunderabad');
    expect(component.formValues()['toWarehouse']).toBe('Warangal');
    expect(component.entryLineRows().length).toBe(1);
    expect(component.entryLineRows()[0][0]).toBe('Dell Desktop');
  });

  it('reports a posted stock transfer as posted', () => {
    component.formValues.set({ status: 'Posted' });
    expect(component.isCurrentRecordPosted()).toBe(true);
  });

  it('reports a draft stock transfer as not posted', () => {
    component.formValues.set({ status: 'Draft' });
    expect(component.isCurrentRecordPosted()).toBe(false);
  });
});
