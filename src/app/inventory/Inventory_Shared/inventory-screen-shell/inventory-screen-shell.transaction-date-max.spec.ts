import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Bug fix (2026-09-20), business rule: "every transactional screen ...
// transaction date should bind current date, don't allow future date, back
// dates are allowed." transactionDateFieldMaxDate() used to carve Production
// Entry's own productionDate field out of the cap entirely (uncapped, future
// dates allowed) with no comment explaining a business reason -- and
// productionDate is that screen's only header transaction-date field (same
// role as invoiceDate/returnDate/etc. elsewhere), not a distinct
// "logged after the fact" field. This pins down that the carve-out is gone
// and every screen's header date field is capped at today the same way.
describe('InventoryScreenShell — transactionDateFieldMaxDate() (2026-09-20 future-date rule)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const dateField = { key: 'productionDate', label: 'Production Date', type: 'date' as const };

  async function setup(key: string): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = { key, title: key, subtitle: '', kind: 'transaction', icon: 'pi pi-box' } as InventoryScreenConfig;
    fixture.detectChanges();
  }

  it('caps productionEntry\'s own productionDate field at today (carve-out removed)', async () => {
    await setup('productionEntry');
    expect(component.transactionDateFieldMaxDate(dateField)).toBe(component.maxTransactionDate);
    expect(component.transactionDateFieldMaxDate(dateField)).not.toBeNull();
  });

  it('still caps every other screen\'s header date field at today (regression)', async () => {
    await setup('salesReturn');
    const returnDateField = { key: 'returnDate', label: 'Return Date', type: 'date' as const };
    expect(component.transactionDateFieldMaxDate(returnDateField)).toBe(component.maxTransactionDate);
  });

  it('defaults a brand-new document\'s date field to today via transactionDateValue()', async () => {
    await setup('productionEntry');
    const value = component.transactionDateValue(dateField);
    const now = new Date();
    expect(value.getFullYear()).toBe(now.getFullYear());
    expect(value.getMonth()).toBe(now.getMonth());
    expect(value.getDate()).toBe(now.getDate());
  });

  it('leaves forward-looking body date fields (e.g. Expected Delivery) uncapped (regression)', async () => {
    await setup('purchaseOrder');
    const expectedDelivery = { key: 'expectedDelivery', label: 'Expected Delivery', type: 'date' as const };
    expect(component.bodyDateFieldMaxDate(expectedDelivery)).toBeNull();
  });

  it('still caps the one past-event body date field, vendorInvoiceDate, at today (regression)', async () => {
    await setup('purchaseInvoice');
    const vendorInvoiceDate = { key: 'vendorInvoiceDate', label: 'Vendor Invoice Date', type: 'date' as const };
    expect(component.bodyDateFieldMaxDate(vendorInvoiceDate)).toBe(component.maxTransactionDate);
  });
});
