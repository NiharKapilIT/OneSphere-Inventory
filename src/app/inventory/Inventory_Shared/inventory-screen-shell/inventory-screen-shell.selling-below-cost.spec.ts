import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for item 32: the Sales Invoice hard block that used to prevent
// saving a line rated below the product's cost price is removed. The existing
// below-cost hint in transactionPriceHint() is downgraded from 'error' to
// 'warn' severity so it reads as a non-blocking warning, not a stopped save.
//
// The MRP ceiling is likewise no longer a blocker: salesRateBoundsNotice()
// (formerly validateSalesRateBounds()) still detects a rate over MRP, but
// saveConfigRecord() now shows it as an info notice alongside the save
// confirmation instead of validatePayload() refusing the save — verified
// below by asserting validatePayload() itself stays clean.
describe('InventoryScreenShell — selling below cost is a warning, not a block (item 32)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const lineColumns = ['Item / SKU', 'Variant', 'Attribute', 'UOM', 'Qty', 'Rate', 'MRP', 'Selling Price', 'Disc %', 'GST', 'Batch No', 'Serial No', 'Expiry Date', 'Warehouse', 'Amount'];

  const config: InventoryScreenConfig = {
    key: 'salesInvoice',
    title: 'Sales Invoice',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-receipt',
    lineColumns
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

    (component as any).loadedProductObjects.set([
      { id: 1, product_name: 'Test Product', cost_price: 100, mrp: 200 } as any
    ]);
  });

  function setLineRow(rate: number): void {
    const row = ['Test Product', '', '', 'Nos', '2', String(rate), '200', '150', '0', '0%', '', '', '', '', '100'];
    component.entryLineRows.set([row]);
  }

  it('does not block saving when the rate is below cost price', () => {
    setLineRow(50);
    const notice = (component as any).salesRateBoundsNotice();
    expect(notice).toBe('');
  });

  it('reports a rate over MRP as an advisory notice', () => {
    setLineRow(250);
    const notice = (component as any).salesRateBoundsNotice();
    expect(notice).toContain('exceeds MRP');
  });

  it('does not block Save Draft / Post when the rate exceeds MRP', () => {
    setLineRow(250);
    const payload = {
      doc_number: 'SI-TEST-1',
      doc_date: '2026-08-20',
      customer_name: 'Test Customer',
      channel_partner_name: 'Test Partner',
      status: 'draft',
      items: [{ product_name: 'Test Product', qty: 2, rate: 250, total_amount: 500 }]
    };
    expect((component as any).validatePayload(payload)).toBe('');
  });

  it('shows a warn-severity hint (not error) for a below-cost rate', () => {
    setLineRow(50);
    const row = component.entryLineRows()[0];
    const hint = (component as any).transactionPriceHint('Rate', row, 0);
    expect(hint.severity).toBe('warn');
    expect(hint.message).toContain('Below cost');
  });
});
