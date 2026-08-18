import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';
import { PurchaseRefDoc } from '../inventory-transactions.service';

// Regression coverage for the Delivery Challan <-> Sales Invoice circular
// reference-picker bug fixed this session:
//   - a DC can reference an SO directly, or (via the secondary picker) an
//     already-posted SI directly ("Invoice to DC").
//   - an SI item created BY referencing a DC (dc_item_id set — its stock was
//     already dispatched at that DC's post time) must never be offered back
//     as a reference candidate when creating a *new* DC, or the same goods
//     would be dispatched twice.
//   - an SO/SI already picked into an *existing* DC (even a draft one)
//     must not be offered again when creating another DC.
//
// filterDeliveryChallanAvailableReferenceDocs()/deliveryChallanUsedSoRefKeys()/
// deliveryChallanUsedSiItemIds() are private — accessed via `as any`, the
// pragmatic way to pin down business-rule methods on this component without
// wiring the full async reference-picker UI flow (HTTP mocking, picker-open
// interactions) just to reach them.
describe('InventoryScreenShell — DC reference-picker exclusions', () => {
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
    items: [{ id: 9001, product_name: 'Dell I7' }],
    ...overrides
  });

  const siDoc = (items: any[], overrides: Partial<PurchaseRefDoc> = {}): PurchaseRefDoc => ({
    id: 601,
    doc_type: 'SI',
    doc_number: 'INV-26-00002',
    status: 'posted',
    items,
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

  function filterDocs(docs: PurchaseRefDoc[]): PurchaseRefDoc[] {
    return (component as any).filterDeliveryChallanAvailableReferenceDocs(docs);
  }

  it('passes docs through unchanged when nothing has been used yet', () => {
    component.savedRecordObjects.set([]);
    const docs = [soDoc()];
    expect(filterDocs(docs)).toEqual(docs);
  });

  it('excludes an SO already referenced by an existing non-cancelled DC (by id)', () => {
    component.savedRecordObjects.set([
      { status: 'draft', so_id: 501, items: [] }
    ]);
    const result = filterDocs([soDoc()]);
    expect(result).toHaveLength(0);
  });

  it('excludes an SO already referenced by an existing DC even while that DC is still a draft, matched by doc number', () => {
    // This is the exact "saved into the draft by reference should not show
    // next time" behavior — draft status must count as "used", not just posted.
    component.savedRecordObjects.set([
      { status: 'draft', so_number: 'SO-26-00001', items: [] }
    ]);
    expect(filterDocs([soDoc()])).toHaveLength(0);
  });

  it('does not exclude an SO whose only referencing DC was cancelled', () => {
    component.savedRecordObjects.set([
      { status: 'cancelled', so_id: 501, items: [] }
    ]);
    const result = filterDocs([soDoc()]);
    expect(result).toHaveLength(1);
  });

  it('excludes only the specific SI items already consumed by an existing DC, keeping the rest of that SI doc', () => {
    component.savedRecordObjects.set([
      { status: 'posted', items: [{ si_item_id: 7001 }] }
    ]);
    const doc = siDoc([
      { id: 7001, product_name: 'Dell I7' },
      { id: 7002, product_name: 'Dell I7' }
    ]);
    const result = filterDocs([doc]);
    expect(result).toHaveLength(1);
    expect(result[0].items.map((i: any) => i.id)).toEqual([7002]);
  });

  it('drops an SI doc entirely once every one of its items has been used', () => {
    component.savedRecordObjects.set([
      { status: 'posted', items: [{ si_item_id: 7001 }, { si_item_id: 7002 }] }
    ]);
    const doc = siDoc([
      { id: 7001, product_name: 'Dell I7' },
      { id: 7002, product_name: 'Dell I7' }
    ]);
    expect(filterDocs([doc])).toHaveLength(0);
  });

  it('is a no-op on any screen other than deliveryChallan (e.g. salesInvoice)', () => {
    component.config = { ...dcConfig, key: 'salesInvoice' };
    component.savedRecordObjects.set([
      { status: 'posted', so_id: 501, items: [{ si_item_id: 7001 }] }
    ]);
    const docs = [soDoc(), siDoc([{ id: 7001, product_name: 'Dell I7' }])];
    expect(filterDocs(docs)).toEqual(docs);
  });
});
