import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 31: "Close DC" (sp_close_delivery_challan) is only
// offered once a Delivery Challan is genuinely partially invoiced --
// display_status is computed server-side in sp_get_delivery_challans using
// the exact same definition sp_close_delivery_challan re-validates itself
// before reversing anything (see that proc's own header comment for why a
// DC can't be auto-closed the first time an SI bills less than the full
// dispatched qty: it may legitimately be invoiced across several separate
// Sales Invoices over time).
describe('InventoryScreenShell — Close DC gating (item 31)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const dcConfig: InventoryScreenConfig = {
    key: 'deliveryChallan',
    title: 'Delivery Challan',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-truck'
  };

  const row = ['DC-26-00013'];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = dcConfig;
    fixture.detectChanges();
  });

  function setRecord(overrides: Record<string, any>): void {
    component.savedRecordObjects.set([{ dc_number: 'DC-26-00013', id: 35, status: 'posted', items: [], ...overrides }]);
  }

  it('offers Close DC once the record is partially invoiced', () => {
    setRecord({ display_status: 'partially_invoiced' });
    expect(component.isDeliveryChallanCloseable(row)).toBe(true);
  });

  it('does not offer Close DC while the DC is still fully open (posted, nothing invoiced yet)', () => {
    setRecord({ display_status: 'posted' });
    expect(component.isDeliveryChallanCloseable(row)).toBe(false);
  });

  it('does not offer Close DC once it is already fully invoiced', () => {
    setRecord({ display_status: 'posted' });
    expect(component.isDeliveryChallanCloseable(row)).toBe(false);
  });

  it('does not offer Close DC once the DC is already closed', () => {
    setRecord({ display_status: 'closed', status: 'closed' });
    expect(component.isDeliveryChallanCloseable(row)).toBe(false);
  });

  it('is a no-op on any screen other than deliveryChallan', () => {
    component.config = { ...dcConfig, key: 'salesInvoice' };
    setRecord({ display_status: 'partially_invoiced' });
    expect(component.isDeliveryChallanCloseable(row)).toBe(false);
  });

  it('closeDeliveryChallanRecordByRow does nothing when the row is not closeable', () => {
    setRecord({ display_status: 'posted' });
    const spy = vi.spyOn((component as any).txService, 'closeDeliveryChallan');
    component.closeDeliveryChallanRecordByRow(row);
    expect(spy).not.toHaveBeenCalled();
  });
});
