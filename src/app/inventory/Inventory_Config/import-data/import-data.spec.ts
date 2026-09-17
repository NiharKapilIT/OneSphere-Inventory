import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import * as XLSX from 'xlsx';

import { InventoryImportDataComponent, ImportPreviewSheet } from './import-data';
import { InventoryConfigService } from '../../Inventory_Shared/inventory-config.service';
import { InventoryTransactionsService } from '../../Inventory_Shared/inventory-transactions.service';

// Bulk Import Master Data -- redesigned 2026-09-17 (same-day follow-up) from
// a one-click "parse and post immediately" flow into a real
// parse -> review -> submit flow: parseFile() only reads the workbook into a
// reviewable, per-row-excludable previewSheets() signal (no save calls at
// all); submitImport()/retryAllFailed()/retrySheetFailed() are the only
// methods that ever call a save endpoint, and they source their rows from
// previewSheets() rather than re-reading the file, so a retry needs no
// re-upload. This spec supersedes the original one-phase
// business-segments.bulk-import.spec.ts -> import-data.spec.ts port -- the
// per-row payload-building/code-generation assertions are carried over
// unchanged (those private methods didn't change), plus new cases for the
// parse/review/submit split, per-row include/exclude, the three-way Business
// Segment gate, and retry-without-reupload.
function buildWorkbook(sheets: Record<string, any[][]>): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return wb;
}

// Minimal banner/header/guidance scaffold matching the shipped template's
// row layout (row1 = banner, row2 = headers, row3 = guidance, row4+ = data).
function sheetRows(headers: string[], dataRows: any[][]): any[][] {
  return [
    ['banner'],
    headers,
    headers.map(() => ''),
    ...dataRows
  ];
}

const EMPTY_SHEETS: Record<string, any[][]> = {
  'UOM Master': sheetRows(['UOM Code *', 'UOM Name *', 'UOM Symbol', 'Decimal Allowed *', 'Status *'], []),
  'Category Master': sheetRows(['Category Code *', 'Category Name *', 'Parent Category', 'Business Segment', 'Description', 'Status *'], []),
  'Brand Master': sheetRows(['Brand Code *', 'Brand Name *', 'Manufacturer', 'Description', 'Status *'], []),
  'HSN-SAC Mapping': sheetRows(['HSN-SAC Code *', 'Description *', 'Category', 'GST % *', 'CGST %', 'SGST %', 'IGST %', 'Cess %', 'Effective Date', 'Status *'], []),
  'Item-Product Master': sheetRows(
    ['Business Segment', 'SKU *', 'Item Name *', 'Category *', 'Brand', 'Description', 'Tracking Method', 'Has Expiry', 'Valuation Method *', 'Status *', 'Base UOM *', 'Alternate UOM', 'Conversion Factor', 'HSN-SAC Code *', 'GST %', 'Opening Qty', 'Reorder Level', 'Purchase UOM', 'Sale UOM', 'Transaction Behavior'],
    []
  ),
  'Vendor Master': sheetRows(['Vendor Name / Company Name *', 'Vendor Code *', 'Business Segment', 'GSTIN', 'PAN', 'Contact Person', 'Mobile', 'Email', 'Address', 'Payment Terms', 'Credit Limit', 'Bank Payee Name', 'Bank Account No.', 'Bank IFSC Code', 'Bank Name', 'Bank Branch', 'Status *'], []),
  'Customer Master': sheetRows(['Customer Name / Company Name *', 'Customer Code *', 'Business Segment', 'GSTIN', 'PAN', 'Contact Person', 'Mobile', 'Email', 'Billing Address', 'Shipping Address', 'Payment Terms', 'Credit Limit', 'Bank Payee Name', 'Bank Account No.', 'Bank IFSC Code', 'Bank Name', 'Bank Branch', 'Status *'], []),
  'Opening Stock': sheetRows(['Warehouse / Branch *', 'Item SKU *', 'Item Name', 'Batch No', 'Serial No', 'Quantity *', 'Rate *', 'Total Value', 'Opening Date *'], [])
};

function workbookWith(overrides: Record<string, any[][]>): XLSX.WorkBook {
  return buildWorkbook({ ...EMPTY_SHEETS, ...overrides });
}

function toFile(wb: XLSX.WorkBook, name = 'test.xlsx'): File {
  return new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], name);
}

describe('InventoryImportDataComponent — Bulk Import Master Data', () => {
  let fixture: ComponentFixture<InventoryImportDataComponent>;
  let component: InventoryImportDataComponent;
  let saveUomCalls: Record<string, any>[];
  let saveCategoryCalls: Record<string, any>[];
  let saveProductCalls: Record<string, any>[];
  let saveOpeningStockCalls: Record<string, any>[];
  let saveHsnSacCalls: Record<string, any>[];
  let saveSegmentCalls: { payload: Record<string, any>; id: number | null | undefined }[];
  // 12 pre-existing UOMs -- matches the scenario in the original task brief: a
  // 5-row parallel batch on top of 12 existing records must land on sequence
  // 13..17, not five copies of 13.
  const EXISTING_UOM_COUNT = 12;

  function configureTestBed(segments: any[] = [{ id: 1, company_id: 1, segment_code: 'ELE', segment_name: 'Electronics', status: 'active', categories: [], hsn_sac_codes: [], uoms: [] }]) {
    // Allows a test to reconfigure with a different segments() fixture
    // mid-test (e.g. to compare zero/single/multi-segment behavior) even
    // though beforeEach's own call already instantiated the TestBed.
    TestBed.resetTestingModule();
    saveUomCalls = [];
    saveCategoryCalls = [];
    saveProductCalls = [];
    saveOpeningStockCalls = [];
    saveHsnSacCalls = [];
    saveSegmentCalls = [];

    const configServiceStub: Partial<InventoryConfigService> = {
      getSegments: () => of({ success: true, message: '', data: segments }) as any,
      getCategories: () => of({ success: true, message: '', data: [{ id: 5, category_code: 'CAT-ELEC', category_name: 'Electronics', status: 'active' }] }) as any,
      getPaymentTerms: () => of({ success: true, message: '', data: [] }) as any,
      getWarehouses: () => of({ success: true, message: '', data: [{ id: 9, company_id: 1, warehouse_code: 'WH1', warehouse_name: 'HYD Main WH', is_default: true, status: 'active' }] }) as any,
      getBranchesInv: () => of({ success: true, message: '', data: [] }) as any,
      getUoms: () => of({ success: true, message: '', data: Array.from({ length: EXISTING_UOM_COUNT }, (_, i) => ({ id: i + 1, uom_code: `PRE-${i}`, uom_name: `Existing UOM ${i}`, status: 'active' })) }) as any,
      getBrands: () => of({ success: true, message: '', data: [] }) as any,
      getVendors: () => of({ success: true, message: '', data: [] }) as any,
      getCustomers: () => of({ success: true, message: '', data: [] }) as any,
      getProducts: () => of({ success: true, message: '', data: [{ id: 21, product_code: 'ITM-1', sku: 'ITM-1001', product_name: 'LED Display', base_uom_id: 3, base_uom_name: 'Nos', product_type: 'Product', item_status: 'active' } as any] }) as any,
      saveUom: ((payload: Record<string, any>) => {
        saveUomCalls.push(payload);
        if (payload['uom_code'] === 'FAIL') return throwError(() => ({ error: { message: 'uom_name is required' } }));
        return of({ success: true, message: '', data: { id: 100 + saveUomCalls.length } });
      }) as any,
      saveCategory: ((payload: Record<string, any>) => {
        saveCategoryCalls.push(payload);
        return of({ success: true, message: '', data: { id: 200 + saveCategoryCalls.length } });
      }) as any,
      saveBrand: () => of({ success: true, message: '', data: { id: 1 } }) as any,
      // Distinct ids per call (not a fixed 1) -- linkHsnSacToFallbackSegment()
      // needs to aggregate more than one real created id to be tested properly.
      saveHsnSac: ((payload: Record<string, any>) => {
        saveHsnSacCalls.push(payload);
        return of({ success: true, message: '', data: { id: 900 + saveHsnSacCalls.length } });
      }) as any,
      saveProduct: ((payload: Record<string, any>) => {
        saveProductCalls.push(payload);
        return of({ success: true, message: '', data: { id: 100 + saveProductCalls.length, ...payload } });
      }) as any,
      saveVendor: () => of({ success: true, message: '', data: { id: 1 } }) as any,
      saveCustomer: () => of({ success: true, message: '', data: { id: 1 } }) as any,
      saveSegment: ((payload: Record<string, any>, id?: number | null) => {
        saveSegmentCalls.push({ payload, id });
        return of({ success: true, message: '', data: { id: id ?? 1, company_id: 1, segment_code: 'ELE', ...payload } });
      }) as any
    };

    const txServiceStub: Partial<InventoryTransactionsService> = {
      saveOpeningStockEntry: (payload: Record<string, any>) => {
        saveOpeningStockCalls.push(payload);
        return of({ success: true, message: '', data: { id: 1 } }) as any;
      }
    };

    return TestBed.configureTestingModule({
      imports: [InventoryImportDataComponent],
      providers: [
        provideHttpClient(),
        { provide: InventoryConfigService, useValue: configServiceStub },
        { provide: InventoryTransactionsService, useValue: txServiceStub }
      ]
    }).compileComponents();
  }

  beforeEach(async () => {
    await configureTestBed();
    fixture = TestBed.createComponent(InventoryImportDataComponent);
    component = fixture.componentInstance;
    // ngOnInit() alone exercises loadPageData() (populates categories()/
    // savedSegments(), which the import payload builders read) without
    // needing a router/Location harness just to render the template.
    component.ngOnInit();
  });

  // ── Rule: blank cell -> key omitted, never null/"" (payload builders are ──
  // ── unchanged by this redesign, still reachable via `as any`) ─────────────
  it('omits blank UOM Master columns from the payload instead of sending null/""', () => {
    const payload = (component as any).uomImportPayload({ 'UOM Code': 'NOS', 'UOM Name': 'Numbers', 'UOM Symbol': '', 'Decimal Allowed': '', 'Status': '' }, null, 0, 0);
    expect(payload).toEqual({ uom_code: 'NOS', uom_name: 'Numbers', status: 'active' });
    expect(Object.values(payload)).not.toContain(null);
    expect(Object.values(payload)).not.toContain('');
  });

  it('omits blank Category Master columns and resolves Business Segment / Parent Category by name', () => {
    const segmentByName = new Map([['electronics', 1]]);
    const categoryByName = new Map([['electronics', 5]]);
    const payload = (component as any).categoryImportPayload(
      { 'Category Code': 'CAT-MOB', 'Category Name': 'Mobiles', 'Parent Category': 'Electronics', 'Business Segment': 'Electronics', 'Description': '', 'Status': '' },
      segmentByName, categoryByName, null, 0, 0
    );
    expect(payload).toEqual({ category_code: 'CAT-MOB', category_name: 'Mobiles', segment_id: 1, parent_id: 5, status: 'active' });
  });

  it('parses DD-MMM-YYYY dates and leaves an unparsable/blank date omitted', () => {
    expect((component as any).cellDateIso({ d: '01-Apr-2026' }, 'd')).toBe('2026-04-01');
    expect((component as any).cellDateIso({ d: '' }, 'd')).toBeUndefined();
  });

  it('builds one uom_conversions row only when both Alternate UOM and Conversion Factor are present', () => {
    const noAlt = (component as any).productImportPayload({ 'SKU': 'X1', 'Item Name': 'Item X', 'Base UOM': 'Nos' }, new Map(), null, 0, 0);
    expect(noAlt.uom_conversions).toBeUndefined();

    const withAlt = (component as any).productImportPayload(
      { 'SKU': 'X2', 'Item Name': 'Item Y', 'Base UOM': 'Nos', 'Alternate UOM': 'Box', 'Conversion Factor': '4', 'Purchase UOM': 'Box' },
      new Map(), null, 0, 1
    );
    expect(withAlt.uom_conversions).toEqual([{
      from_uom_name: 'Box', alt_uom_name: 'Box', conversion_factor: 4,
      is_purchase_uom: true, is_sales_uom: false, is_default_purchase: true, is_default_sale: false, status: 'active'
    }]);
  });

  it('generateSequentialCode/generateSequentialSku produce the same PREFIX-YY-SEQ / part-joined shape as the manual-entry generators', () => {
    const yy = new Date().getFullYear().toString().slice(-2);
    expect((component as any).generateSequentialCode('Kilogram', 12, 0)).toBe(`KIL-${yy}-00013`);
    expect((component as any).generateSequentialCode('Kilogram', 12, 1)).toBe(`KIL-${yy}-00014`);
    expect((component as any).generateSequentialCode('###', 12, 0)).toBe(''); // no alnum prefix -> blank

    const sku = (component as any).generateSequentialSku('Laptop Stand', 40, 2, 'Computers', 'Dell');
    expect(sku).toBe('COM-DEL-LAP-STA-0043');
  });

  it('uses the typed Code/SKU exactly as entered and never overwrites it with a generated one', () => {
    const payload = (component as any).uomImportPayload({ 'UOM Code': 'NOS', 'UOM Name': 'Numbers' }, null, 999, 5);
    expect(payload.uom_code).toBe('NOS');
  });

  // ── Phase 1: parseFile() only reads the workbook -- never calls a save ────
  it('parseFile() populates previewSheets() and moves to the review phase without calling any save endpoint', async () => {
    // The blank row sits BETWEEN two real rows, not trailing -- a trailing
    // blank row is trimmed off entirely by readSheetRows() (it's template
    // padding, not a row the user filled), so it would never reach the
    // skipped-blank count at all. This matches how the pre-existing "skip
    // only a fully-blank row" case put its blank row in the middle too.
    const file = toFile(workbookWith({
      'UOM Master': sheetRows(['UOM Code *', 'UOM Name *', 'UOM Symbol', 'Decimal Allowed *', 'Status *'], [
        ['NOS', 'Numbers', 'Nos', 'No', 'Active'],
        ['', '', '', '', ''], // fully blank -- must be counted as skipped, not shown as a row
        ['B1', 'Beta', '', '', '']
      ])
    }));
    component.importFile.set(file);

    await component.parseFile();

    expect(component.phase()).toBe('review');
    expect(saveUomCalls.length).toBe(0);
    const uomSheet = component.previewSheets().find(s => s.sheet === 'UOM Master')!;
    expect(uomSheet.rows.length).toBe(2);
    expect(uomSheet.skippedBlankInFile).toBe(1);
    expect(uomSheet.rows[0].primary).toBe('Numbers');
    expect(uomSheet.rows[0].include).toBe(true);
    expect(uomSheet.rows[0].status).toBe('pending');
  });

  it('parseFile() flags a sheet missing from the workbook as not found, with no rows', async () => {
    const wb = buildWorkbook({ 'UOM Master': sheetRows(['UOM Name *'], [['Numbers']]) }); // only 1 sheet, rest absent
    component.importFile.set(toFile(wb));
    await component.parseFile();
    const categorySheet = component.previewSheets().find(s => s.sheet === 'Category Master')!;
    expect(categorySheet.found).toBe(false);
    expect(categorySheet.rows.length).toBe(0);
  });

  // ── Review step: per-row include/exclude ───────────────────────────────────
  it('toggleRowInclude/setSheetInclude flip include without touching other rows or sheets', async () => {
    component.importFile.set(toFile(workbookWith({
      'UOM Master': sheetRows(['UOM Code *', 'UOM Name *', 'UOM Symbol', 'Decimal Allowed *', 'Status *'], [
        ['A1', 'Alpha', '', '', ''],
        ['B1', 'Beta', '', '', '']
      ])
    })));
    await component.parseFile();

    component.toggleRowInclude('UOM Master', 4); // first data row (row 4 in the template's numbering)
    let uomSheet = component.previewSheets().find(s => s.sheet === 'UOM Master')!;
    expect(uomSheet.rows.find(r => r.rowNumber === 4)!.include).toBe(false);
    expect(uomSheet.rows.find(r => r.rowNumber === 5)!.include).toBe(true);

    component.setSheetInclude('UOM Master', false);
    uomSheet = component.previewSheets().find(s => s.sheet === 'UOM Master')!;
    expect(uomSheet.rows.every(r => !r.include)).toBe(true);
  });

  // ── Business Segment gate: three-way, not a skippable optional field ──────
  it('a single-segment company auto-selects it; segmentGateSatisfied() is true with nothing to decide', () => {
    // beforeEach's default stub returns exactly one segment (Electronics).
    expect(component.selectedSegmentId()).toBe(1);
    expect(component.segmentPickerRequired()).toBe(false);
    expect(component.segmentGateSatisfied()).toBe(true);
  });

  it('a zero-segment company has nothing to decide either', async () => {
    await configureTestBed([]);
    const f = TestBed.createComponent(InventoryImportDataComponent);
    const c = f.componentInstance;
    c.ngOnInit();
    expect(c.selectedSegmentId()).toBe(null);
    expect(c.segmentGateSatisfied()).toBe(true);
  });

  it('a multi-segment company starts undecided and blocks the gate until an explicit choice (real segment OR "No segment link") is made', async () => {
    await configureTestBed([
      { id: 1, company_id: 1, segment_code: 'ELE', segment_name: 'Electronics', status: 'active', categories: [], hsn_sac_codes: [], uoms: [] },
      { id: 2, company_id: 1, segment_code: 'COM', segment_name: 'Computers', status: 'active', categories: [], hsn_sac_codes: [], uoms: [] }
    ]);
    const f = TestBed.createComponent(InventoryImportDataComponent);
    const c = f.componentInstance;
    c.ngOnInit();

    expect(c.selectedSegmentId()).toBeUndefined();
    expect(c.segmentPickerRequired()).toBe(true);
    expect(c.segmentGateSatisfied()).toBe(false);

    c.selectedSegmentId.set(null); // explicit "No segment link" is a valid, deliberate choice
    expect(c.segmentGateSatisfied()).toBe(true);

    c.selectedSegmentId.set(2); // or a real segment
    expect(c.segmentGateSatisfied()).toBe(true);
  });

  it('canSubmit() is false while the segment gate is unmet even if rows are included', async () => {
    await configureTestBed([
      { id: 1, company_id: 1, segment_code: 'ELE', segment_name: 'Electronics', status: 'active', categories: [], hsn_sac_codes: [], uoms: [] },
      { id: 2, company_id: 1, segment_code: 'COM', segment_name: 'Computers', status: 'active', categories: [], hsn_sac_codes: [], uoms: [] }
    ]);
    const f = TestBed.createComponent(InventoryImportDataComponent);
    const c = f.componentInstance;
    c.ngOnInit();
    c.importFile.set(toFile(workbookWith({
      'UOM Master': sheetRows(['UOM Code *', 'UOM Name *', 'UOM Symbol', 'Decimal Allowed *', 'Status *'], [['NOS', 'Numbers', '', '', '']])
    })));
    await c.parseFile();

    expect(c.totalIncluded()).toBe(1);
    expect(c.canSubmit()).toBe(false); // segment still undecided

    c.selectedSegmentId.set(null);
    expect(c.canSubmit()).toBe(true);
  });

  // ── rowSegmentInfo(): live per-row resolution, row's own cell always wins ──
  it('rowSegmentInfo() shows "-" for sheets with no segment concept (HSN-SAC, Opening Stock), regardless of the picker', () => {
    const sheet: ImportPreviewSheet = { sheet: 'HSN-SAC Mapping', found: true, hasSegmentConcept: false, segmentColumn: null, rows: [], skippedBlankInFile: 0 };
    const row = { rowNumber: 4, raw: {}, include: true, primary: '8471', secondary: '', status: 'pending' as const };
    expect(component.rowSegmentInfo(sheet, row).label).toBe('—');
    expect(component.rowSegmentInfo(sheet, row).warnings).toEqual([]);
  });

  it('rowSegmentInfo() prefers the row\'s own Business Segment cell over the picker fallback', () => {
    component.selectedSegmentId.set(1); // Electronics, the only segment
    const sheet: ImportPreviewSheet = { sheet: 'Category Master', found: true, hasSegmentConcept: true, segmentColumn: 'Business Segment', rows: [], skippedBlankInFile: 0 };
    const row = { rowNumber: 4, raw: { 'Business Segment': 'Electronics' }, include: true, primary: 'Mobiles', secondary: '', status: 'pending' as const };
    const info = component.rowSegmentInfo(sheet, row);
    expect(info.label).toBe('Electronics');
    expect(info.warnings).toEqual([]);
  });

  it('rowSegmentInfo() falls back to the picker and warns when the row names an unrecognized segment', () => {
    component.selectedSegmentId.set(1); // Electronics
    const sheet: ImportPreviewSheet = { sheet: 'Category Master', found: true, hasSegmentConcept: true, segmentColumn: 'Business Segment', rows: [], skippedBlankInFile: 0 };
    const row = { rowNumber: 4, raw: { 'Business Segment': 'Nonexistent' }, include: true, primary: 'Mobiles', secondary: '', status: 'pending' as const };
    const info = component.rowSegmentInfo(sheet, row);
    expect(info.label).toBe('Electronics (default)');
    expect(info.warnings[0]).toContain('Nonexistent');
  });

  it('rowSegmentInfo() reports "No segment" with no warning when only one segment exists and none is unresolved', () => {
    component.selectedSegmentId.set(null); // explicit no-link, allowed on a single/zero-segment company
    const sheet: ImportPreviewSheet = { sheet: 'UOM Master', found: true, hasSegmentConcept: true, segmentColumn: null, rows: [], skippedBlankInFile: 0 };
    const row = { rowNumber: 4, raw: {}, include: true, primary: 'Numbers', secondary: '', status: 'pending' as const };
    const info = component.rowSegmentInfo(sheet, row);
    expect(info.label).toBe('No segment');
    // Only one segment exists -- no risk of a segment-scoped screen hiding
    // this record, so no warning is raised even though nothing is linked.
    expect(info.warnings).toEqual([]);
  });

  // ── Phase 2: submitImport() -- the only phase that saves, blank rows never
  // reach it because they were never added to previewSheets() in the first
  // place; one failing row doesn't stop the rest of the batch. ─────────────
  it('submitImport() saves every included row, isolates a failing row, and writes status back onto previewSheets()', async () => {
    component.importFile.set(toFile(workbookWith({
      'UOM Master': sheetRows(
        ['UOM Code *', 'UOM Name *', 'UOM Symbol', 'Decimal Allowed *', 'Status *'],
        [
          ['NOS', 'Numbers', 'Nos', 'No', 'Active'],
          ['FAIL', 'Broken Row', '', '', '']
        ]
      ),
      'Category Master': sheetRows(
        ['Category Code *', 'Category Name *', 'Parent Category', 'Business Segment', 'Description', 'Status *'],
        [['CAT-X', 'Category X', '', '', '', 'Active']]
      ),
      'Opening Stock': sheetRows(
        ['Warehouse / Branch *', 'Item SKU *', 'Item Name', 'Batch No', 'Serial No', 'Quantity *', 'Rate *', 'Total Value', 'Opening Date *'],
        [['HYD Main WH', 'ITM-1001', 'LED Display', '', '', '24', '24500', '', '01-Apr-2026']]
      )
    })));
    await component.parseFile();
    await component.submitImport();

    const uomSheet = component.previewSheets().find(s => s.sheet === 'UOM Master')!;
    expect(uomSheet.rows.find(r => r.raw['UOM Code'] === 'NOS')!.status).toBe('created');
    const failedRow = uomSheet.rows.find(r => r.raw['UOM Code'] === 'FAIL')!;
    expect(failedRow.status).toBe('failed');
    expect(failedRow.resultMessage).toContain('uom_name is required');
    expect(saveUomCalls.length).toBe(2);
    expect(saveUomCalls.some(p => Object.values(p).some(v => v === null || v === ''))).toBe(false);

    const categorySheet = component.previewSheets().find(s => s.sheet === 'Category Master')!;
    expect(categorySheet.rows[0].status).toBe('created');
    // The default fixture's single segment (Electronics, id 1) auto-selects
    // on load (segmentPickerRequired() is false with only one segment), so
    // it applies as the fallback even though this row's own Business
    // Segment cell is blank -- see the auto-select assertion elsewhere.
    expect(saveCategoryCalls[0]).toEqual({ category_code: 'CAT-X', category_name: 'Category X', segment_id: 1, status: 'active' });

    // Opening Stock groups by (Warehouse/Branch, Opening Date) and resolves
    // the SKU against the (freshly re-fetched) product list for uom/id.
    const openingSheet = component.previewSheets().find(s => s.sheet === 'Opening Stock')!;
    expect(openingSheet.rows[0].status).toBe('created');
    expect(saveOpeningStockCalls.length).toBe(1);
    expect(saveOpeningStockCalls[0]['warehouse_id']).toBe(9);
    expect(saveOpeningStockCalls[0]['entry_date']).toBe('2026-04-01');
    const openingItem = saveOpeningStockCalls[0]['items'][0];
    expect(openingItem.product_id).toBe(21);
    expect(openingItem.qty).toBe(24);
    expect(openingItem.rate).toBe(24500);

    expect(component.totalFailed()).toBe(1);
  });

  it('an excluded row is never sent to a save endpoint', async () => {
    component.importFile.set(toFile(workbookWith({
      'UOM Master': sheetRows(['UOM Code *', 'UOM Name *', 'UOM Symbol', 'Decimal Allowed *', 'Status *'], [
        ['A1', 'Alpha', '', '', ''],
        ['B1', 'Beta', '', '', '']
      ])
    })));
    await component.parseFile();
    component.toggleRowInclude('UOM Master', 5); // exclude the "Beta" row

    await component.submitImport();

    expect(saveUomCalls.length).toBe(1);
    expect(saveUomCalls[0]['uom_code']).toBe('A1');
    const uomSheet = component.previewSheets().find(s => s.sheet === 'UOM Master')!;
    expect(uomSheet.rows.find(r => r.rowNumber === 5)!.status).toBe('pending'); // never attempted
  });

  // ── Retry without re-upload ────────────────────────────────────────────────
  it('retrySheetFailed() resubmits only that sheet\'s failed rows, without touching already-created rows or other sheets', async () => {
    component.importFile.set(toFile(workbookWith({
      'UOM Master': sheetRows(['UOM Code *', 'UOM Name *', 'UOM Symbol', 'Decimal Allowed *', 'Status *'], [
        ['NOS', 'Numbers', '', '', ''],
        ['FAIL', 'Broken Row', '', '', '']
      ]),
      'Category Master': sheetRows(
        ['Category Code *', 'Category Name *', 'Parent Category', 'Business Segment', 'Description', 'Status *'],
        [['CAT-X', 'Category X', '', '', '', 'Active']]
      )
    })));
    await component.parseFile();
    await component.submitImport();
    expect(saveUomCalls.length).toBe(2);
    expect(saveCategoryCalls.length).toBe(1);
    expect(component.totalFailed()).toBe(1);

    // Fix the row in place (same pattern the review table's checkbox/edit
    // would drive) so the retry succeeds this time, then retry.
    component.previewSheets.update(sheets => sheets.map(s => s.sheet !== 'UOM Master' ? s : {
      ...s, rows: s.rows.map(r => r.raw['UOM Code'] === 'FAIL' ? { ...r, raw: { ...r.raw, 'UOM Code': 'FIX' } } : r)
    }));
    await component.retrySheetFailed('UOM Master');

    expect(saveUomCalls.length).toBe(3); // only the one retried row fired again
    expect(saveUomCalls[2]['uom_code']).toBe('FIX');
    expect(saveCategoryCalls.length).toBe(1); // untouched -- it never failed
    const uomSheet = component.previewSheets().find(s => s.sheet === 'UOM Master')!;
    expect(uomSheet.rows.find(r => r.raw['UOM Code'] === 'FIX')!.status).toBe('created');
    expect(component.totalFailed()).toBe(0);
  });

  // ── Same forkJoin-batch sequential-code trap as before, now driven off ────
  // ── the review step's included-row filter instead of a raw sheet read ─────
  it('submitImport() assigns 3 distinct, sequential UOM codes to a 3-row blank-code batch instead of duplicating one', async () => {
    component.importFile.set(toFile(workbookWith({
      'UOM Master': sheetRows(
        ['UOM Code *', 'UOM Name *', 'UOM Symbol', 'Decimal Allowed *', 'Status *'],
        [
          ['', 'Piece', 'Pc', 'No', 'Active'],
          ['', 'Pack', 'Pk', 'No', 'Active'],
          ['', 'Pair', 'Pr', 'No', 'Active']
        ]
      )
    })));
    await component.parseFile();
    await component.submitImport();

    const uomSheet = component.previewSheets().find(s => s.sheet === 'UOM Master')!;
    expect(uomSheet.rows.every(r => r.status === 'created')).toBe(true);

    const codes = saveUomCalls.map(p => p['uom_code']);
    const yy = new Date().getFullYear().toString().slice(-2);
    // EXISTING_UOM_COUNT (12) + batchIndex(0,1,2) + 1 -- 13, 14, 15 -- never
    // three copies of 13, which is what a per-row length+1-style calculation
    // would have produced since forkJoin fires all three save calls before
    // any of them resolve.
    expect(codes).toEqual([`PIE-${yy}-00013`, `PAC-${yy}-00014`, `PAI-${yy}-00015`]);
    expect(new Set(codes).size).toBe(3);
  });

  it('submitImport() assigns 3 distinct, sequential product_codes AND skus to a 3-row same-category Item-Product Master batch', async () => {
    component.importFile.set(toFile(workbookWith({
      'Item-Product Master': sheetRows(
        ['Item Name *', 'Category *', 'Brand', 'Base UOM *', 'HSN-SAC Code', 'Status *'],
        [
          ['Business Laptop Silver', 'Laptops', 'Corebyte', 'Nos', '8471', 'Active'],
          ['Business Laptop Black', 'Laptops', 'Corebyte', 'Nos', '8471', 'Active'],
          ['Business Laptop Grey', 'Laptops', 'Corebyte', 'Nos', '8471', 'Active']
        ]
      )
    })));
    await component.parseFile();
    await component.submitImport();

    expect(saveProductCalls.length).toBe(3);
    const productCodes = saveProductCalls.map(p => p['product_code']);
    const skus = saveProductCalls.map(p => p['sku']);
    const yy = new Date().getFullYear().toString().slice(-2);
    expect(productCodes).toEqual([`BUS-${yy}-00002`, `BUS-${yy}-00003`, `BUS-${yy}-00004`]);
    expect(skus).toEqual(['LAP-COR-BUS-LAP-0002', 'LAP-COR-BUS-LAP-0003', 'LAP-COR-BUS-LAP-0004']);
    expect(new Set(productCodes).size).toBe(3);
    expect(new Set(skus).size).toBe(3);
    const productSheet = component.previewSheets().find(s => s.sheet === 'Item-Product Master')!;
    expect(productSheet.rows.every(r => r.status === 'created')).toBe(true);
  });

  // ── HSN-SAC Mapping segment visibility (found live during this session's ──
  // ── redesign -- taxation.hsn_sac has no segment_id column, so a bulk- ─────
  // ── imported code needs a second write to the segment's hsn_sac_ids ──────
  it('HSN-SAC Mapping has no per-row Business Segment column, so segmentColumn is null but hasSegmentConcept is still true (segment-filtered screen, different mechanism)', async () => {
    component.importFile.set(toFile(workbookWith({
      'HSN-SAC Mapping': sheetRows(
        ['HSN-SAC Code *', 'Description *', 'Category', 'GST % *', 'CGST %', 'SGST %', 'IGST %', 'Cess %', 'Effective Date', 'Status *'],
        [['8517', 'Telephone sets', 'Electronics', '18', '9', '9', '18', '0', '01-Apr-2026', 'Active']]
      )
    })));
    await component.parseFile();
    const sheet = component.previewSheets().find(s => s.sheet === 'HSN-SAC Mapping')!;
    expect(sheet.hasSegmentConcept).toBe(true);
    expect(sheet.segmentColumn).toBeNull();
    // With the default fixture's single auto-selected segment (Electronics),
    // the row's Segment Link preview should show it as the default, same as
    // UOM/Brand Master.
    const info = component.rowSegmentInfo(sheet, sheet.rows[0]);
    expect(info.label).toBe('Electronics (default)');
  });

  it('submitImport() links every newly-created HSN-SAC row into the fallback segment\'s hsn_sac_ids via saveSegment(), preserving its existing category_ids/uom_ids/hsn_sac_ids', async () => {
    await configureTestBed([{
      id: 1, company_id: 1, segment_code: 'ELE', segment_name: 'Electronics', status: 'active',
      categories: [{ id: 5, category_code: 'CAT-ELEC', category_name: 'Electronics' }],
      hsn_sac_codes: [{ id: 700, code: '0101', hsn_type: 'HSN', gst_rate: 0 }], // a pre-existing mapped code
      uoms: [{ id: 3, uom_code: 'NOS', uom_name: 'Numbers' }]
    }]);
    const f = TestBed.createComponent(InventoryImportDataComponent);
    const c = f.componentInstance;
    c.ngOnInit();
    c.importFile.set(toFile(workbookWith({
      'HSN-SAC Mapping': sheetRows(
        ['HSN-SAC Code *', 'Description *', 'Category', 'GST % *', 'CGST %', 'SGST %', 'IGST %', 'Cess %', 'Effective Date', 'Status *'],
        [
          ['8517', 'Telephone sets', 'Electronics', '18', '9', '9', '18', '0', '01-Apr-2026', 'Active'],
          ['8471', 'Computers', 'Electronics', '18', '9', '9', '18', '0', '01-Apr-2026', 'Active']
        ]
      )
    })));
    await c.parseFile();
    await c.submitImport();

    expect(saveHsnSacCalls.length).toBe(2); // both rows saved as their own HSN-SAC records
    expect(saveSegmentCalls.length).toBe(1); // one batched segment update, not one per row
    const call = saveSegmentCalls[0];
    expect(call.id).toBe(1);
    // The two newly-created ids (901, 902 -- see the saveHsnSac stub) are
    // ADDED to the pre-existing mapped id (700), not replacing it.
    expect(call.payload['hsn_sac_ids'].sort((a: number, b: number) => a - b)).toEqual([700, 901, 902]);
    expect(call.payload['category_ids']).toEqual([5]);
    expect(call.payload['uom_ids']).toEqual([3]);
    expect(call.payload['segment_name']).toBe('Electronics');

    const sheet = c.previewSheets().find(s => s.sheet === 'HSN-SAC Mapping')!;
    expect(sheet.rows.every(r => r.status === 'created')).toBe(true);
  });

  it('does not call saveSegment() for HSN-SAC when no fallback segment is selected (explicit "No segment link")', async () => {
    await configureTestBed([
      { id: 1, company_id: 1, segment_code: 'ELE', segment_name: 'Electronics', status: 'active', categories: [], hsn_sac_codes: [], uoms: [] },
      { id: 2, company_id: 1, segment_code: 'COM', segment_name: 'Computers', status: 'active', categories: [], hsn_sac_codes: [], uoms: [] }
    ]);
    const f = TestBed.createComponent(InventoryImportDataComponent);
    const c = f.componentInstance;
    c.ngOnInit();
    c.selectedSegmentId.set(null); // explicit "No segment link" -- a valid, deliberate choice
    c.importFile.set(toFile(workbookWith({
      'HSN-SAC Mapping': sheetRows(
        ['HSN-SAC Code *', 'Description *', 'Category', 'GST % *', 'CGST %', 'SGST %', 'IGST %', 'Cess %', 'Effective Date', 'Status *'],
        [['8517', 'Telephone sets', 'Electronics', '18', '9', '9', '18', '0', '01-Apr-2026', 'Active']]
      )
    })));
    await c.parseFile();
    await c.submitImport();

    expect(saveHsnSacCalls.length).toBe(1);
    expect(saveSegmentCalls.length).toBe(0); // nothing to link to -- deliberately unlinked
    const sheet = c.previewSheets().find(s => s.sheet === 'HSN-SAC Mapping')!;
    expect(sheet.rows[0].status).toBe('created'); // the row itself still saves fine either way
  });
});
