import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';
import { PurchaseRefDoc } from '../inventory-transactions.service';

// Coverage for item 29: the Delivery Challan's primary reference dropdown
// now APPENDS picked Sales Orders (or an SO + an SI) instead of replacing
// the line-item grid each time — mirrors selectSecondaryReference's
// already-shipped DC<-SI append flow (same startIndex-offset pattern for
// every per-row map, same "keep whatever's already bound" header-field
// convention). Every other screen's primary reference pick (salesInvoice,
// salesReturn, creditNote) is untouched and still replaces.
describe('InventoryScreenShell — DC primary reference picker appends (item 29)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const dcConfig: InventoryScreenConfig = {
    key: 'deliveryChallan',
    title: 'Delivery Challan',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-truck'
  };

  const soDoc = (overrides: Partial<PurchaseRefDoc> = {}): PurchaseRefDoc => ({
    id: 501,
    doc_type: 'SO',
    doc_number: 'SO-26-00001',
    status: 'posted',
    party_name: 'Acme Corp',
    vendor_id: 7,
    items: [{ id: 9001, product_name: 'Dell I7', qty: 5 }],
    ...overrides
  });

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

  it('appends a second picked Sales Order instead of replacing the first one\'s rows', () => {
    component.selectSalesReference(soDoc());
    expect(component.entryLineRows().length).toBe(1);

    component.selectSalesReference(soDoc({
      id: 502, doc_number: 'SO-26-00002',
      items: [{ id: 9002, product_name: 'HP Monitor', qty: 2 }]
    }));

    expect(component.entryLineRows().length).toBe(2);
  });

  it('keeps the first pick\'s customer instead of overwriting it with the second pick\'s', () => {
    component.selectSalesReference(soDoc({ party_name: 'Acme Corp' }));
    component.selectSalesReference(soDoc({
      id: 502, doc_number: 'SO-26-00002', party_name: 'Different Customer Ltd', vendor_id: 99,
      items: [{ id: 9002, product_name: 'HP Monitor', qty: 2 }]
    }));

    expect(component.formValues()['customer']).toBe('Acme Corp');
  });

  it('tracks both picked doc numbers in boundReferenceLabels rather than only the latest', () => {
    component.selectSalesReference(soDoc());
    component.selectSalesReference(soDoc({
      id: 502, doc_number: 'SO-26-00002',
      items: [{ id: 9002, product_name: 'HP Monitor', qty: 2 }]
    }));

    expect((component as any).boundReferenceLabels()).toEqual(['SO-26-00001', 'SO-26-00002']);
  });

  it('excludes an already-picked SO from the reference-doc list so it cannot be double-picked', () => {
    component.selectSalesReference(soDoc());
    (component as any).transactionReferenceDocs.set([
      soDoc(),
      soDoc({ id: 502, doc_number: 'SO-26-00002', items: [{ id: 9002, product_name: 'HP Monitor', qty: 2 }] })
    ]);

    const available = (component as any).availableReferenceDocsForCurrentTransaction((component as any).transactionReferenceDocs());
    expect(available.map((d: PurchaseRefDoc) => d.doc_number)).toEqual(['SO-26-00002']);
  });

  it('still replaces (does not append) for Sales Invoice, which was not part of this item', () => {
    component.config = { ...dcConfig, key: 'salesInvoice', title: 'Sales Invoice' };
    component.selectSalesReference(soDoc());
    component.selectSalesReference(soDoc({
      id: 502, doc_number: 'SO-26-00002',
      items: [{ id: 9002, product_name: 'HP Monitor', qty: 2 }]
    }));

    expect(component.entryLineRows().length).toBe(1);
  });
});
