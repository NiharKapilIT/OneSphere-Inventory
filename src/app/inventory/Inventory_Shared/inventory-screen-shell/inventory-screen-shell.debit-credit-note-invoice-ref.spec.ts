import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';
import { PurchaseRefDoc } from '../inventory-transactions.service';

// Coverage for item 18: "Debit Note & Credit Note should allow entries
// either way against an Invoice reference or as a direct entry." The
// backend (inventory.inv_debit_notes/inv_credit_notes + sp_upsert_debit_note/
// sp_upsert_credit_note, migrations 051/054) already had purchase_invoice_id/
// sales_invoice_id columns wired end to end; this closes the frontend gap:
// - the merged Settlement Reference dropdown now offers Direct + Return docs
//   + Invoice docs (mirrors Sales Invoice's existing SO+DC merge pattern —
//   transactionReferenceDocsForField()/transactionReferenceOptions()).
// - picking an Invoice doc routes through selectPurchaseReference (debitNote)
//   / selectSalesReference (creditNote), branching on referenceDocType(doc)
//   to populate purchaseInvoiceId/purchaseInvoiceReference (or
//   salesInvoiceId/salesInvoiceReference) instead of purchaseReturnId/
//   salesReturnId, and to seed the settlement lines from the invoice's items.
// - buildPayload() now gates purchase_return_number/purchase_invoice_number
//   (and the sales equivalents) on their own id being present, instead of
//   always echoing the dropdown's display label into purchase_return_number
//   regardless of which type of doc was actually picked.
// - the "already used, don't offer again" exclusion
//   (filterDocumentNoteAvailableReturnDocs) deliberately still applies only
//   to Return docs, never to Invoice docs -- more than one Debit/Credit Note
//   can legitimately be raised against the same Invoice over time (e.g. two
//   separate partial price adjustments), so excluding an Invoice once
//   referenced once would be the wrong, more-restrictive call.
describe('InventoryScreenShell — Debit Note / Credit Note Invoice reference (item 18)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const debitNoteConfig: InventoryScreenConfig = {
    key: 'debitNote',
    title: 'Debit Note',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-minus-circle',
    lineColumns: ['Description', 'Reference', 'Amount', 'GST %', 'GST Amount', 'Total Amount']
  };

  const creditNoteConfig: InventoryScreenConfig = {
    key: 'creditNote',
    title: 'Credit Note',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-plus-circle',
    lineColumns: ['Description', 'Reference', 'Amount', 'GST %', 'GST Amount', 'Total Amount']
  };

  const purchaseReturnDoc = (overrides: Partial<PurchaseRefDoc> = {}): PurchaseRefDoc => ({
    id: 301,
    doc_type: 'PURCHASERETURN',
    doc_number: 'PR-RET-001',
    status: 'posted',
    vendor_id: 5,
    party_name: 'ElectroMart Supplies',
    items: [{ product_name: 'LED Display', return_qty: 2, rate: 100, gst_rate: 18, return_amount: 236 }],
    ...overrides
  });

  const purchaseInvoiceDoc = (overrides: Partial<PurchaseRefDoc> = {}): PurchaseRefDoc => ({
    id: 401,
    doc_type: 'PI',
    doc_number: 'PI-26-00012',
    status: 'posted',
    vendor_id: 5,
    party_name: 'ElectroMart Supplies',
    items: [{ product_name: 'LED Display', qty: 5, rate: 100, gst_rate: 18 }],
    ...overrides
  });

  const salesReturnDoc = (overrides: Partial<PurchaseRefDoc> = {}): PurchaseRefDoc => ({
    id: 701,
    doc_type: 'SALESRETURN',
    doc_number: 'SR-RET-001',
    status: 'posted',
    vendor_id: 9,
    party_name: 'Tenant Works Pvt Ltd',
    items: [{ product_name: 'LED Display', return_qty: 3, rate: 200, gst_rate: 18, return_amount: 708 }],
    ...overrides
  });

  const salesInvoiceDoc = (overrides: Partial<PurchaseRefDoc> = {}): PurchaseRefDoc => ({
    id: 801,
    doc_type: 'SI',
    doc_number: 'INV-26-00006',
    status: 'posted',
    vendor_id: 9,
    party_name: 'Tenant Works Pvt Ltd',
    items: [{ product_name: 'LED Display', qty: 4, rate: 200, gst_rate: 18 }],
    ...overrides
  });

  async function setup(config: InventoryScreenConfig): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
  }

  const referenceField = { key: 'reference', label: 'Settlement Reference', type: 'select' as const };

  // ── Merged dropdown ───────────────────────────────────────────────────

  it('Debit Note: merged dropdown includes Direct + Return doc numbers + Invoice doc numbers', async () => {
    await setup(debitNoteConfig);
    component.transactionReferenceDocs.set([purchaseReturnDoc(), purchaseInvoiceDoc()]);

    const options = component.transactionReferenceOptions(referenceField);

    expect(options).toContain('Direct Debit Note');
    expect(options).toContain('PR-RET-001');
    expect(options).toContain('PI-26-00012');
  });

  it('Credit Note: merged dropdown includes Direct + Return doc numbers + Invoice doc numbers', async () => {
    await setup(creditNoteConfig);
    component.transactionReferenceDocs.set([salesReturnDoc(), salesInvoiceDoc()]);

    const options = component.transactionReferenceOptions(referenceField);

    expect(options).toContain('Direct Credit Note');
    expect(options).toContain('SR-RET-001');
    expect(options).toContain('INV-26-00006');
  });

  // ── Picking an Invoice populates vendor/customer + lines ────────────────

  it('Debit Note: picking a Purchase Invoice reference populates vendor + purchaseInvoiceId, clears purchaseReturnId', async () => {
    await setup(debitNoteConfig);

    component.selectPurchaseReference(purchaseInvoiceDoc());

    const v = component.formValues();
    expect(v['purchaseInvoiceId']).toBe(401);
    expect(v['purchaseInvoiceReference']).toBe('PI-26-00012');
    expect(v['purchaseReturnId']).toBeNull();
    expect(v['reference']).toBe('PI-26-00012');
    expect(v['vendor']).toBe('ElectroMart Supplies');
    expect(v['vendorId']).toBe(5);
  });

  it('Debit Note: an Invoice-sourced pick seeds settlement lines from the invoice items, labelled as Purchase Invoice', async () => {
    await setup(debitNoteConfig);

    component.selectPurchaseReference(purchaseInvoiceDoc());

    const rows = component.entryLineRows();
    expect(rows.length).toBe(1);
    expect(rows[0][0]).toContain('Purchase Invoice');
    expect(rows[0][0]).toContain('LED Display');
    expect(rows[0][0]).not.toContain('Purchase Return');
    expect(rows[0][1]).toBe('PI-26-00012');
  });

  it('Credit Note: picking a Sales Invoice reference populates customer + salesInvoiceId, clears salesReturnId', async () => {
    await setup(creditNoteConfig);

    component.selectSalesReference(salesInvoiceDoc());

    const v = component.formValues();
    expect(v['salesInvoiceId']).toBe(801);
    expect(v['salesInvoiceReference']).toBe('INV-26-00006');
    expect(v['salesReturnId']).toBeNull();
    expect(v['reference']).toBe('INV-26-00006');
    expect(v['customer']).toBe('Tenant Works Pvt Ltd');
    expect(v['customerId']).toBe(9);
  });

  it('Credit Note: an Invoice-sourced pick seeds settlement lines from the invoice items, labelled as Sales Invoice', async () => {
    await setup(creditNoteConfig);

    component.selectSalesReference(salesInvoiceDoc());

    const rows = component.entryLineRows();
    expect(rows.length).toBe(1);
    expect(rows[0][0]).toContain('Sales Invoice');
    expect(rows[0][0]).not.toContain('Sales Return');
  });

  // ── Regression: Return reference pick still works unchanged ────────────

  it('Debit Note: picking a Purchase Return reference still sets purchaseReturnId and clears purchaseInvoiceId (regression)', async () => {
    await setup(debitNoteConfig);

    component.selectPurchaseReference(purchaseReturnDoc());

    const v = component.formValues();
    expect(v['purchaseReturnId']).toBe(301);
    expect(v['reference']).toBe('PR-RET-001');
    expect(v['purchaseInvoiceId']).toBeNull();
    expect(v['purchaseInvoiceReference']).toBe('');

    const rows = component.entryLineRows();
    expect(rows[0][0]).toContain('Purchase Return');
  });

  it('Credit Note: picking a Sales Return reference still sets salesReturnId and clears salesInvoiceId (regression)', async () => {
    await setup(creditNoteConfig);

    component.selectSalesReference(salesReturnDoc());

    const v = component.formValues();
    expect(v['salesReturnId']).toBe(701);
    expect(v['reference']).toBe('SR-RET-001');
    expect(v['salesInvoiceId']).toBeNull();
    expect(v['salesInvoiceReference']).toBe('');
  });

  // ── Regression: Direct entry still clears everything ────────────────────

  // NOTE on why these two call applyDirectDocumentNoteReference() directly
  // instead of going through the public selectTransactionReference(field,
  // 'Direct Debit Note') dispatcher a real <ng-select> pick would use: doing
  // it that way exposed a PRE-EXISTING, unrelated bug --
  // selectTransactionReference()'s "did the user pick Direct X" check is
  // `this.normalizeKey(selected).includes('directdebitnote')`, but
  // normalizeKey() only lowercases+trims (no space stripping), so
  // 'Direct Debit Note' normalizes to 'direct debit note', which can never
  // contain the no-space needle 'directdebitnote'. The same broken pattern
  // is reused for purchaseInvoice/purchaseReturn/creditNote/goodsReceipt too
  // (five screens total) -- it predates item 18 and isn't something this
  // task's scope covers fixing (flagged in the item 18 report instead). The
  // net effect in production: explicitly re-picking "Direct X" from the
  // dropdown after a Return/Invoice was already selected silently falls
  // through to collectFormField() and does NOT clear the stale
  // purchaseReturnId/purchaseInvoiceId. These tests instead pin down that
  // applyDirectDocumentNoteReference() itself (the method that DOES get
  // reached correctly via the no-docs-available auto-default path in
  // loadDebitNoteReferenceDocs/loadCreditNoteReferenceDocs) still correctly
  // clears every reference field regardless of which type was previously
  // bound -- the actual regression surface item 18 touches.
  it('Debit Note: applyDirectDocumentNoteReference clears both Return and Invoice reference fields (regression)', async () => {
    await setup(debitNoteConfig);
    component.selectPurchaseReference(purchaseInvoiceDoc());
    expect(component.formValues()['purchaseInvoiceId']).toBe(401);

    (component as any).applyDirectDocumentNoteReference(referenceField, 'Direct Debit Note');

    const v = component.formValues();
    expect(v['reference']).toBe('Direct Debit Note');
    expect(v['purchaseReturnId']).toBeNull();
    expect(v['purchaseInvoiceId']).toBeNull();
    expect(v['purchaseInvoiceReference']).toBe('');
  });

  it('Credit Note: applyDirectDocumentNoteReference clears both Return and Invoice reference fields (regression)', async () => {
    await setup(creditNoteConfig);
    component.selectSalesReference(salesInvoiceDoc());
    expect(component.formValues()['salesInvoiceId']).toBe(801);

    (component as any).applyDirectDocumentNoteReference(referenceField, 'Direct Credit Note');

    const v = component.formValues();
    expect(v['reference']).toBe('Direct Credit Note');
    expect(v['salesReturnId']).toBeNull();
    expect(v['salesInvoiceId']).toBeNull();
    expect(v['salesInvoiceReference']).toBe('');
  });

  // ── "Already used" exclusion: Returns excluded, Invoices never excluded ─

  it('Debit Note: excludes an already-referenced Purchase Return from the merged list, keeps the Invoice', async () => {
    await setup(debitNoteConfig);
    component.savedRecordObjects.set([
      { status: 'draft', purchase_return_id: 301, items: [] }
    ]);

    const result = (component as any).filterDocumentNoteAvailableReturnDocs([
      purchaseReturnDoc(),
      purchaseInvoiceDoc()
    ]);

    expect(result.map((d: PurchaseRefDoc) => d.doc_number)).toEqual(['PI-26-00012']);
  });

  it('Debit Note: does NOT exclude a Purchase Invoice even if a prior Debit Note already referenced it (deliberate, less-restrictive decision)', async () => {
    await setup(debitNoteConfig);
    // Legacy/edge-case defense: even if some prior saved record's
    // purchase_return_number happens to collide with this Invoice's own
    // doc_number (documentNoteUsedReturnRefKeys keys purely off id/number,
    // with no type check of its own), the type-aware skip in
    // filterDocumentNoteAvailableReturnDocs must still keep the Invoice
    // offered -- only Return-typed docs are ever excluded by this rule.
    component.savedRecordObjects.set([
      { status: 'posted', purchase_return_id: 401, purchase_return_number: 'PI-26-00012', items: [] }
    ]);

    const result = (component as any).filterDocumentNoteAvailableReturnDocs([
      purchaseInvoiceDoc()
    ]);

    expect(result.map((d: PurchaseRefDoc) => d.doc_number)).toEqual(['PI-26-00012']);
  });

  it('Credit Note: excludes an already-referenced Sales Return from the merged list, keeps the Invoice', async () => {
    await setup(creditNoteConfig);
    component.savedRecordObjects.set([
      { status: 'draft', sales_return_id: 701, items: [] }
    ]);

    const result = (component as any).filterDocumentNoteAvailableReturnDocs([
      salesReturnDoc(),
      salesInvoiceDoc()
    ]);

    expect(result.map((d: PurchaseRefDoc) => d.doc_number)).toEqual(['INV-26-00006']);
  });

  // ── Save payload: gate purchase_return_number/purchase_invoice_number ──

  it('Debit Note payload: an Invoice-sourced note sends purchase_invoice_id/number and nulls purchase_return_number', async () => {
    await setup(debitNoteConfig);
    component.formValues.set({
      debitNoteNo: 'DN-100',
      debitNoteDate: '2026-08-17',
      vendor: 'ElectroMart Supplies',
      vendorId: 5,
      reference: 'PI-26-00012',
      purchaseInvoiceId: 401,
      purchaseInvoiceReference: 'PI-26-00012',
      purchaseReturnId: null,
      status: 'Draft'
    });

    const payload = (component as any).buildPayload();

    expect(payload.purchase_invoice_id).toBe(401);
    expect(payload.purchase_invoice_number).toBe('PI-26-00012');
    expect(payload.purchase_return_id).toBeNull();
    expect(payload.purchase_return_number).toBeNull();
  });

  it('Debit Note payload: a Return-sourced note still sends purchase_return_id/number and nulls purchase_invoice_number (regression)', async () => {
    await setup(debitNoteConfig);
    component.formValues.set({
      debitNoteNo: 'DN-101',
      debitNoteDate: '2026-08-17',
      vendor: 'ElectroMart Supplies',
      vendorId: 5,
      reference: 'PR-RET-001',
      purchaseReturnId: 301,
      purchaseInvoiceId: null,
      purchaseInvoiceReference: '',
      status: 'Draft'
    });

    const payload = (component as any).buildPayload();

    expect(payload.purchase_return_id).toBe(301);
    expect(payload.purchase_return_number).toBe('PR-RET-001');
    expect(payload.purchase_invoice_id).toBeNull();
    expect(payload.purchase_invoice_number).toBeNull();
  });

  it('Debit Note payload: a Direct entry nulls both purchase_return_number and purchase_invoice_number (latent mislabel bug fixed as a byproduct)', async () => {
    await setup(debitNoteConfig);
    component.formValues.set({
      debitNoteNo: 'DN-102',
      debitNoteDate: '2026-08-17',
      vendor: 'Walk-in Vendor',
      reference: 'Direct Debit Note',
      purchaseReturnId: null,
      purchaseInvoiceId: null,
      purchaseInvoiceReference: '',
      status: 'Draft'
    });

    const payload = (component as any).buildPayload();

    expect(payload.purchase_return_number).toBeNull();
    expect(payload.purchase_invoice_number).toBeNull();
  });

  it('Credit Note payload: an Invoice-sourced note sends sales_invoice_id/number and nulls sales_return_number', async () => {
    await setup(creditNoteConfig);
    component.formValues.set({
      creditNoteNo: 'CN-100',
      creditNoteDate: '2026-08-17',
      customer: 'Tenant Works Pvt Ltd',
      customerId: 9,
      reference: 'INV-26-00006',
      salesInvoiceId: 801,
      salesInvoiceReference: 'INV-26-00006',
      salesReturnId: null,
      status: 'Draft'
    });

    const payload = (component as any).buildPayload();

    expect(payload.sales_invoice_id).toBe(801);
    expect(payload.sales_invoice_number).toBe('INV-26-00006');
    expect(payload.sales_return_id).toBeNull();
    expect(payload.sales_return_number).toBeNull();
  });

  it('Credit Note payload: a Direct entry nulls both sales_return_number and sales_invoice_number', async () => {
    await setup(creditNoteConfig);
    component.formValues.set({
      creditNoteNo: 'CN-101',
      creditNoteDate: '2026-08-17',
      customer: 'Walk-in Customer',
      reference: 'Direct Credit Note',
      salesReturnId: null,
      salesInvoiceId: null,
      salesInvoiceReference: '',
      status: 'Draft'
    });

    const payload = (component as any).buildPayload();

    expect(payload.sales_return_number).toBeNull();
    expect(payload.sales_invoice_number).toBeNull();
  });

  // ── Reload: reference field falls back to the Invoice number ───────────

  it('Debit Note: reloading a saved Invoice-sourced note shows the invoice number in the Settlement Reference field', async () => {
    await setup(debitNoteConfig);
    (component as any).applyPurchaseRecordToForm({
      id: 55,
      debit_note_number: 'DN-100',
      vendor_name: 'ElectroMart Supplies',
      purchase_return_id: null,
      purchase_return_number: null,
      purchase_invoice_id: 401,
      purchase_invoice_number: 'PI-26-00012',
      status: 'draft',
      items: []
    });

    expect(component.formValues()['reference']).toBe('PI-26-00012');
  });

  it('Credit Note: reloading a saved Invoice-sourced note shows the invoice number in the Settlement Reference field', async () => {
    await setup(creditNoteConfig);
    (component as any).applySalesRecordToForm({
      id: 66,
      credit_note_number: 'CN-100',
      customer_name: 'Tenant Works Pvt Ltd',
      sales_return_id: null,
      sales_return_number: null,
      sales_invoice_id: 801,
      sales_invoice_number: 'INV-26-00006',
      status: 'draft',
      items: []
    });

    expect(component.formValues()['reference']).toBe('INV-26-00006');
  });
});
