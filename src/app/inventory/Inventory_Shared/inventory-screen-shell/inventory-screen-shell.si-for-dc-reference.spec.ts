import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Bug fix (2026-09-20): "unable to do Sales Return, no reference coming from
// the Sales Invoice." Root cause was in
// inventory.sp_get_sales_docs_for_ref's WHEN 'SI' branch (migration 239),
// shared by three different callers of GetRefDocsAsync(docType: 'SI') and
// carrying two exclusions that only make sense for ONE of them: Delivery
// Challan's own "pick an SI to create a new DC from" reference picker (an
// SI item already linked to a DC had its stock physically dispatched
// already, so re-offering it would dispatch the same goods twice). Applied
// to Sales Return/Credit Note too, it wrongly hid any invoice whose items
// were already DC-linked -- confirmed live against company 7's only posted
// invoice, INV-26-00002, whose two lines both had a non-cancelled DC item
// referencing them (dci.si_item_id), so the whole invoice never reached the
// Sales Return picker.
//
// The SQL fix adds a separate WHEN 'SI_FOR_DC' branch that keeps the
// exclusion; this frontend half must request THAT type only from Delivery
// Challan's own two reference loads, while Sales Return / Credit Note keep
// requesting the now-unrestricted plain 'SI'. This spec pins down the
// doc_type string each caller actually sends over HTTP -- the one place a
// future edit could silently regress back to the shared, over-restrictive
// 'SI' for the DC screen, or under-restrict Delivery Challan's own picker by
// leaving it on 'SI'.
describe('InventoryScreenShell — SI vs SI_FOR_DC reference doc_type routing', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;
  let requestedDocTypes: string[];

  function stubGetRefDocs(): void {
    requestedDocTypes = [];
    (component as any).txService.getRefDocs = (docType: string) => {
      requestedDocTypes.push(docType);
      return of({ success: true, data: [] });
    };
  }

  async function setup(config: InventoryScreenConfig): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
    stubGetRefDocs();
  }

  const dcConfig: InventoryScreenConfig = {
    key: 'deliveryChallan', title: 'Delivery Challan', subtitle: '', kind: 'transaction', icon: 'pi pi-truck'
  };
  const salesReturnConfig: InventoryScreenConfig = {
    key: 'salesReturn', title: 'Sales Return', subtitle: '', kind: 'transaction', icon: 'pi pi-undo'
  };
  const creditNoteConfig: InventoryScreenConfig = {
    key: 'creditNote', title: 'Credit Note', subtitle: '', kind: 'transaction', icon: 'pi pi-plus-circle'
  };

  it('Delivery Challan\'s auto-load (loadDeliveryChallanReferenceDocs) requests SI_FOR_DC, not plain SI', async () => {
    await setup(dcConfig);
    (component as any).loadDeliveryChallanReferenceDocs(true, false);
    expect(requestedDocTypes).toContain('SI_FOR_DC');
    expect(requestedDocTypes).not.toContain('SI');
  });

  it('Delivery Challan\'s manual "Pick" tray (openDeliveryChallanReferencePicker) requests SI_FOR_DC, not plain SI', async () => {
    await setup(dcConfig);
    (component as any).openDeliveryChallanReferencePicker();
    expect(requestedDocTypes).toContain('SI_FOR_DC');
    expect(requestedDocTypes).not.toContain('SI');
  });

  it('Sales Return still requests plain SI (must NOT pick up the DC-only exclusion)', async () => {
    await setup(salesReturnConfig);
    // loadTransactionReferenceDocs() (unlike the DC/Credit Note-specific
    // loaders above) gates on segment resolution having completed first --
    // see its own comment about the ':all' cache-key bug this guards
    // against. No segments endpoint is mocked in this spec, so it's forced
    // resolved directly.
    (component as any).segmentsResolved.set(true);
    (component as any).loadTransactionReferenceDocs(true, false);
    expect(requestedDocTypes).toContain('SI');
    expect(requestedDocTypes).not.toContain('SI_FOR_DC');
  });

  it('Credit Note\'s auto-load (loadCreditNoteReferenceDocs) still requests plain SI', async () => {
    await setup(creditNoteConfig);
    (component as any).loadCreditNoteReferenceDocs(true, false);
    expect(requestedDocTypes).toContain('SI');
    expect(requestedDocTypes).not.toContain('SI_FOR_DC');
  });

  it('Credit Note\'s manual "Pick" tray (openCreditNoteReferencePicker) still requests plain SI', async () => {
    await setup(creditNoteConfig);
    (component as any).openCreditNoteReferencePicker();
    expect(requestedDocTypes).toContain('SI');
    expect(requestedDocTypes).not.toContain('SI_FOR_DC');
  });
});
