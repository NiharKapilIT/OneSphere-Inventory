import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, catchError, firstValueFrom, forkJoin, map, of } from 'rxjs';
import * as XLSX from 'xlsx';
import {
  ApiResponse,
  CategoryItem,
  InventoryConfigService,
  ProductItem,
  SegmentItem
} from '../../Inventory_Shared/inventory-config.service';
import { InventoryTransactionsService } from '../../Inventory_Shared/inventory-transactions.service';

// ── Bulk Import Master Data ─────────────────────────────────────────────────
// Relocated from Inventory_Config/business-segments/ (2026-09-17) into its own
// route-level popup, reachable from the "Import Data" breadcrumb button
// (OneSphere-Accounts main-layout.component.html, .bc-pay-toggle group) rather
// than being tied to one specific config screen.
//
// Redesigned same day (follow-up) into a real parse -> review -> submit flow
// instead of parsing and posting synchronously on one click. The 8-sheet
// parsing, per-sheet payload builders, sequential code/SKU generation and
// forkJoin-batched save logic below are carried over UNCHANGED from the
// original single-step implementation -- see docs/INVENTORY_AUTOMATION_TESTS.md
// for the history behind the blank-cell-omission / no-required-field-gating /
// sequential-code rules baked into them. What changed is everything ABOVE
// those builders: parseFile() now only reads the workbook into a reviewable,
// per-row-excludable ImportPreviewSheet[] (no save calls at all); a separate
// runSubmission() drives the actual save calls off whatever rows are
// currently included, callable either as one full submit or as a per-sheet
// "retry failed rows only" pass that needs no re-upload.
export type ImportPhase = 'select' | 'review';

export interface ImportPreviewRow {
  rowNumber: number;
  raw: Record<string, any>;
  include: boolean;
  primary: string;
  secondary: string;
  status: 'pending' | 'created' | 'failed';
  resultMessage?: string;
}

export interface ImportPreviewSheet {
  sheet: string;
  found: boolean;
  // Whether this sheet's records carry a segment_id at all (UOM/Category/
  // Brand/Item-Product/Vendor/Customer do; HSN-SAC and Opening Stock don't
  // -- see the per-row Segment Link column, which reads '-' for these two).
  hasSegmentConcept: boolean;
  // The sheet's own "Business Segment" column name, or null when the sheet
  // has no such column at all (UOM Master, Brand Master) and can only ever
  // resolve a segment via the popup's fallback picker.
  segmentColumn: string | null;
  rows: ImportPreviewRow[];
  skippedBlankInFile: number;
}

@Component({
  selector: 'app-inventory-import-data',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-data.html'
})
export class InventoryImportDataComponent implements OnInit {
  private svc = inject(InventoryConfigService);
  private txService = inject(InventoryTransactionsService);
  private router = inject(Router);
  private location = inject(Location);

  // Needed by the payload builders below (Business Segment / Parent Category
  // name resolution) -- this popup has no config screen of its own, so it
  // fetches these fresh on open rather than inheriting them from
  // business-segments.ts's own state the way the original in-page panel did.
  categories = signal<CategoryItem[]>([]);
  savedSegments = signal<SegmentItem[]>([]);
  loading = signal(true);
  loadError = signal('');

  readonly importTemplateUrl = '/assets/inventory-master-data-template.xlsx';
  importFile = signal<File | null>(null);
  parsing = signal(false);
  importing = signal(false);
  importOverallError = signal('');

  phase = signal<ImportPhase>('select');
  previewSheets = signal<ImportPreviewSheet[]>([]);

  // Business Segment fallback -- applied ONLY to a row that doesn't already
  // resolve its own segment (a filled Business Segment cell on Category/
  // Item-Product/Vendor/Customer rows always wins; UOM Master and Brand
  // Master have no such column at all, so this is their only way in).
  // Records saved with no segment_id are simply invisible on segment-scoped
  // Master screens (UOM/Brand/Item Master) on any company with more than
  // one Business Segment -- exactly the "imported but can't see it"
  // complaint this traced back to. To keep that from happening silently
  // again, this is three-way, not two-way: `undefined` (not yet decided --
  // blocks Submit whenever the company has more than one segment),
  // `null` (an explicit, deliberate "no segment link"), or a real segment
  // id. A single-segment company auto-selects its only segment on load; a
  // zero-segment company has nothing to decide, so it's set to `null`
  // immediately. See segmentGateSatisfied() and rowSegmentInfo().
  selectedSegmentId = signal<number | null | undefined>(undefined);

  ngOnInit(): void {
    this.loadPageData();
  }

  loadPageData(): void {
    this.loading.set(true);
    this.loadError.set('');
    forkJoin({
      categories: this.svc.getCategories(),
      segments: this.svc.getSegments(true)
    }).subscribe({
      next: ({ categories, segments }) => {
        this.categories.set(this.dedupeByName(categories.data ?? [], item => item.category_name));
        const segs = segments.data ?? [];
        this.savedSegments.set(segs);
        if (segs.length === 1) this.selectedSegmentId.set(segs[0].id);
        else if (segs.length === 0) this.selectedSegmentId.set(null);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.loadError.set(err?.error?.message ?? 'Unable to load inventory setup data.');
      }
    });
  }

  // Closes the popup by leaving this route -- there is no local "open" signal
  // to flip since the popup IS the routed screen (same pattern as Pay/
  // Receipt in the breadcrumb, just rendered as an overlay instead of a full
  // page). Falls back to the Inventory dashboard when there's no prior
  // in-app location to return to (e.g. a direct URL visit).
  close(): void {
    if (this.importing() || this.parsing()) return;
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/dashboard/inventory/inventory-dashboard/dashboard');
    }
  }

  private normalizeKey(value: any): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private dedupeByName<T>(items: T[], picker: (item: T) => string | undefined): T[] {
    const seen = new Set<string>();
    return [...items]
      .sort((a, b) => String(picker(a) || '').localeCompare(String(picker(b) || '')))
      .filter(item => {
        const key = this.normalizeKey(picker(item));
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  // ── Phase 1: Parse (read-only, no save calls) ─────────────────────────────

  onImportFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.importFile.set(file);
    this.importOverallError.set('');
    this.previewSheets.set([]);
    this.phase.set('select');
  }

  async parseFile(): Promise<void> {
    const file = this.importFile();
    if (!file) {
      this.importOverallError.set('Choose a filled-in template file first.');
      return;
    }

    this.parsing.set(true);
    this.importOverallError.set('');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

      const sheets: ImportPreviewSheet[] = [
        this.buildFlatPreviewSheet(workbook, 'UOM Master', true, null,
          row => ({ primary: this.cell(row, 'UOM Name'), secondary: this.cell(row, 'UOM Symbol') })),
        this.buildFlatPreviewSheet(workbook, 'Category Master', true, 'Business Segment',
          row => ({ primary: this.cell(row, 'Category Name'), secondary: this.cell(row, 'Parent Category') })),
        this.buildFlatPreviewSheet(workbook, 'Brand Master', true, null,
          row => ({ primary: this.cell(row, 'Brand Name'), secondary: this.cell(row, 'Manufacturer') })),
        // hasSegmentConcept=true even though taxation.hsn_sac has no segment_id
        // COLUMN (unlike the false-classified Opening Stock below, which
        // really has no segment concept at all) -- Tax Classification Master
        // is still a segment-filtered screen (isSegmentFilteredGridKey() in
        // inventory-screen-shell.ts includes 'hsnSacMapping'), just scoped
        // via the segment's OWN hsn_sac_ids array rather than a column on
        // this row. See linkHsnSacToFallbackSegment() for the write side.
        this.buildFlatPreviewSheet(workbook, 'HSN-SAC Mapping', true, null,
          row => ({ primary: this.cell(row, 'HSN-SAC Code'), secondary: this.cell(row, 'Description') })),
        this.buildFlatPreviewSheet(workbook, 'Item-Product Master', true, 'Business Segment',
          row => ({ primary: this.cell(row, 'Item Name'), secondary: [this.cell(row, 'Category'), this.cell(row, 'Brand')].filter(Boolean).join(' / ') })),
        this.buildFlatPreviewSheet(workbook, 'Vendor Master', true, 'Business Segment',
          row => ({ primary: this.cell(row, 'Vendor Name / Company Name'), secondary: this.cell(row, 'GSTIN') })),
        this.buildFlatPreviewSheet(workbook, 'Customer Master', true, 'Business Segment',
          row => ({ primary: this.cell(row, 'Customer Name / Company Name'), secondary: this.cell(row, 'GSTIN') })),
        this.buildFlatPreviewSheet(workbook, 'Opening Stock', false, null,
          row => ({
            primary: this.cell(row, 'Item SKU') || this.cell(row, 'Item Name'),
            secondary: [
              this.cell(row, 'Warehouse / Branch'),
              this.cellNumber(row, 'Quantity') !== undefined ? `Qty ${this.cell(row, 'Quantity')} @ ${this.cell(row, 'Rate')}` : ''
            ].filter(Boolean).join(' · ')
          }))
      ];

      this.previewSheets.set(sheets);
      this.phase.set('review');
    } catch (err: any) {
      this.importOverallError.set(err?.error?.title ?? err?.error?.message ?? err?.message ?? 'Could not read the file. Make sure it is a filled-in copy of the template.');
    } finally {
      this.parsing.set(false);
    }
  }

  // Row 1 = instructions banner, Row 2 = column headers, Row 3 = per-column
  // guidance, Row 4+ = data -- matches Inventory_Master_Data_Template.xlsx.
  // Trailing all-blank template padding rows (the sheet ships with 500 rows)
  // are trimmed off so "rows parsed" reflects what the user actually filled.
  private readSheetRows(workbook: XLSX.WorkBook, sheetName: string): { found: boolean; rows: Record<string, any>[] } {
    const ws = workbook.Sheets[sheetName];
    if (!ws) return { found: false, rows: [] };
    const grid: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    const headerRow = (grid[1] || []).map((h: any) => this.stripHeaderLabel(String(h ?? '')));
    const dataRows = grid.slice(3);
    let lastNonBlank = -1;
    dataRows.forEach((r, i) => {
      if (Array.isArray(r) && r.some(cell => String(cell ?? '').trim() !== '')) lastNonBlank = i;
    });
    const rows = dataRows.slice(0, lastNonBlank + 1).map(r => {
      const obj: Record<string, any> = {};
      headerRow.forEach((key, i) => { if (key) obj[key] = r[i]; });
      return obj;
    });
    return { found: true, rows };
  }

  private buildFlatPreviewSheet(
    workbook: XLSX.WorkBook,
    sheetName: string,
    hasSegmentConcept: boolean,
    segmentColumn: string | null,
    summarize: (row: Record<string, any>) => { primary: string; secondary: string }
  ): ImportPreviewSheet {
    const { found, rows } = this.readSheetRows(workbook, sheetName);
    let skippedBlankInFile = 0;
    const previewRows: ImportPreviewRow[] = [];
    rows.forEach((row, idx) => {
      const rowNumber = idx + 4;
      if (this.isRowBlank(row)) { skippedBlankInFile++; return; }
      const { primary, secondary } = summarize(row);
      previewRows.push({ rowNumber, raw: row, include: true, primary, secondary, status: 'pending' });
    });
    return { sheet: sheetName, found, hasSegmentConcept, segmentColumn, rows: previewRows, skippedBlankInFile };
  }

  private stripHeaderLabel(h: string): string {
    return String(h ?? '').replace(/\s*\*\s*$/, '').trim();
  }

  private isRowBlank(row: Record<string, any>): boolean {
    return Object.values(row).every(v => v === undefined || v === null || String(v).trim() === '');
  }

  private cell(row: Record<string, any>, key: string): string {
    const v = row[key];
    return v === undefined || v === null ? '' : String(v).trim();
  }

  private cellNumber(row: Record<string, any>, key: string): number | undefined {
    const raw = row[key];
    if (raw === undefined || raw === null || String(raw).trim() === '') return undefined;
    const n = Number(String(raw).replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : undefined;
  }

  private cellYesNo(row: Record<string, any>, key: string): boolean | undefined {
    const v = this.cell(row, key).toLowerCase();
    if (!v) return undefined;
    return v === 'yes' || v === 'y' || v === 'true' || v === '1';
  }

  private cellDateIso(row: Record<string, any>, key: string): string | undefined {
    const raw = row[key];
    if (raw === undefined || raw === null || String(raw).trim() === '') return undefined;
    if (raw instanceof Date && !isNaN(raw.getTime())) {
      return raw.toISOString().slice(0, 10);
    }
    const text = String(raw).trim();
    const dmy = text.match(/^(\d{1,2})-([A-Za-z]{3,})-(\d{4})$/);
    if (dmy) {
      const months: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      const mm = months[dmy[2].slice(0, 3).toLowerCase()];
      if (mm) return `${dmy[3]}-${mm}-${dmy[1].padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const parsed = new Date(text);
    return isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
  }

  // Rule: a blank cell must never become an explicit null/"" in the payload --
  // the key is simply omitted so the backend's own default/validation applies.
  private setIfPresent(payload: Record<string, any>, key: string, value: any): void {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    payload[key] = value;
  }

  // Ports generateCodeFromName()/generateSku() from inventory-screen-shell.ts
  // (the manual single-record forms) into the import path, parameterized
  // instead of reading savedRecordObjects()/pendingRows() signals directly --
  // those signals reflect the CURRENT screen's live state, which a batch
  // import has no equivalent of. `existingCount` is a one-time snapshot of
  // how many records already exist (fetched once per sheet before that
  // sheet's payload array is built) and `batchIndex` is this row's 0-based
  // position within the current submit batch for THIS sheet only -- never a
  // running total across sheets or across excluded/blank rows. Using
  // existingCount + batchIndex + 1 as the sequence number is what keeps a
  // multi-row parallel batch from all computing the same "next" number the
  // way a naive per-row savedRecordObjects().length + 1 would.
  private generateSequentialCode(name: string, existingCount: number, batchIndex: number): string {
    const prefix = String(name || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    if (!prefix) return '';
    const yy = new Date().getFullYear().toString().slice(-2);
    const seq = String(existingCount + batchIndex + 1).padStart(5, '0');
    return `${prefix}-${yy}-${seq}`;
  }

  private generateSequentialSku(name: string, existingCount: number, batchIndex: number, category?: string, brand?: string, variant?: string): string {
    const catAbbr     = category ? category.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) : '';
    const brandAbbr   = brand    ? brand.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3)    : '';
    const variantAbbr = variant  ? variant.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3)  : '';
    const words    = String(name || '').trim().split(/\s+/).filter(Boolean);
    const nameParts = words.slice(0, 2)
      .map(w => w.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3))
      .filter(Boolean);
    const seq = String(existingCount + batchIndex + 1).padStart(4, '0');
    const parts = [catAbbr, brandAbbr, variantAbbr, ...nameParts, seq].filter(Boolean);
    if (parts.length <= 1) return '';
    return parts.join('-');
  }

  private uomImportPayload(row: Record<string, any>, fallbackSegmentId: number | null, existingCount: number, batchIndex: number): Record<string, any> {
    const payload: Record<string, any> = {};
    const uomName = this.cell(row, 'UOM Name');
    const uomCode = this.cell(row, 'UOM Code') || this.generateSequentialCode(uomName, existingCount, batchIndex);
    this.setIfPresent(payload, 'uom_code', uomCode);
    this.setIfPresent(payload, 'uom_name', uomName);
    this.setIfPresent(payload, 'uom_symbol', this.cell(row, 'UOM Symbol'));
    const decimalAllowed = this.cellYesNo(row, 'Decimal Allowed');
    if (decimalAllowed !== undefined) payload['decimal_allowed'] = decimalAllowed;
    payload['status'] = (this.cell(row, 'Status') || 'active').toLowerCase();
    // No "Business Segment" column exists on this sheet at all -- the popup's
    // segment picker is the only way a UOM row can end up linked to a
    // segment, matching what the manual "+Add" form does implicitly via
    // whichever segment happens to be selected at save time.
    if (fallbackSegmentId) payload['segment_id'] = fallbackSegmentId;
    return payload;
  }

  private categoryImportPayload(row: Record<string, any>, segmentByName: Map<string, number>, categoryByName: Map<string, number>, fallbackSegmentId: number | null, existingCount: number, batchIndex: number): Record<string, any> {
    const payload: Record<string, any> = {};
    const categoryName = this.cell(row, 'Category Name');
    const categoryCode = this.cell(row, 'Category Code') || this.generateSequentialCode(categoryName, existingCount, batchIndex);
    this.setIfPresent(payload, 'category_code', categoryCode);
    this.setIfPresent(payload, 'category_name', categoryName);
    this.setIfPresent(payload, 'description', this.cell(row, 'Description'));
    const segmentName = this.cell(row, 'Business Segment');
    const rowSegmentId = segmentName ? segmentByName.get(this.normalizeKey(segmentName)) : undefined;
    const resolvedSegmentId = rowSegmentId ?? fallbackSegmentId ?? undefined;
    if (resolvedSegmentId) payload['segment_id'] = resolvedSegmentId;
    const parentName = this.cell(row, 'Parent Category');
    if (parentName && !this.normalizeKey(parentName).startsWith('none')) {
      const id = categoryByName.get(this.normalizeKey(parentName));
      if (id) payload['parent_id'] = id;
    }
    payload['status'] = (this.cell(row, 'Status') || 'active').toLowerCase();
    return payload;
  }

  private brandImportPayload(row: Record<string, any>, fallbackSegmentId: number | null, existingCount: number, batchIndex: number): Record<string, any> {
    const payload: Record<string, any> = {};
    const brandName = this.cell(row, 'Brand Name');
    const brandCode = this.cell(row, 'Brand Code') || this.generateSequentialCode(brandName, existingCount, batchIndex);
    this.setIfPresent(payload, 'brand_code', brandCode);
    this.setIfPresent(payload, 'brand_name', brandName);
    this.setIfPresent(payload, 'manufacturer', this.cell(row, 'Manufacturer'));
    this.setIfPresent(payload, 'description', this.cell(row, 'Description'));
    payload['status'] = (this.cell(row, 'Status') || 'active').toLowerCase();
    // Same as UOM Master -- no "Business Segment" column on this sheet.
    if (fallbackSegmentId) payload['segment_id'] = fallbackSegmentId;
    return payload;
  }

  private hsnSacImportPayload(row: Record<string, any>): Record<string, any> {
    const payload: Record<string, any> = {};
    const code = this.cell(row, 'HSN-SAC Code');
    this.setIfPresent(payload, 'code', code);
    this.setIfPresent(payload, 'description', this.cell(row, 'Description'));
    this.setIfPresent(payload, 'category', this.cell(row, 'Category'));
    const gst = this.cellNumber(row, 'GST %');
    if (gst !== undefined) payload['gst_rate'] = gst;
    const cgst = this.cellNumber(row, 'CGST %');
    if (cgst !== undefined) payload['cgst_rate'] = cgst;
    const sgst = this.cellNumber(row, 'SGST %');
    if (sgst !== undefined) payload['sgst_rate'] = sgst;
    const igst = this.cellNumber(row, 'IGST %');
    if (igst !== undefined) payload['igst_rate'] = igst;
    const cess = this.cellNumber(row, 'Cess %');
    if (cess !== undefined) payload['cess_rate'] = cess;
    const effDate = this.cellDateIso(row, 'Effective Date');
    if (effDate) payload['effective_date'] = effDate;
    if (code) payload['hsn_type'] = code.length > 4 ? 'SAC' : 'HSN';
    payload['status'] = (this.cell(row, 'Status') || 'active').toLowerCase();
    return payload;
  }

  private productImportPayload(row: Record<string, any>, segmentByName: Map<string, number>, fallbackSegmentId: number | null, existingCount: number, batchIndex: number): Record<string, any> {
    const payload: Record<string, any> = {};
    const segmentName = this.cell(row, 'Business Segment');
    const rowSegmentId = segmentName ? segmentByName.get(this.normalizeKey(segmentName)) : undefined;
    const resolvedSegmentId = rowSegmentId ?? fallbackSegmentId ?? undefined;
    if (resolvedSegmentId) payload['segment_id'] = resolvedSegmentId;
    const itemName = this.cell(row, 'Item Name');
    const categoryName = this.cell(row, 'Category');
    const brandName = this.cell(row, 'Brand');
    // Unlike UOM/Category/Brand/Vendor/Customer (whose upsert procs already
    // auto-generate a fallback code server-side, see sp_upsert_uom etc.),
    // inv_products.sku is NOT NULL with no server-side fallback at all --
    // sp_upsert_product only auto-generates product_code, never sku. A blank
    // SKU cell that reached the backend unfilled would hard-fail every row.
    const sku = this.cell(row, 'SKU') || this.generateSequentialSku(itemName, existingCount, batchIndex, categoryName, brandName);
    this.setIfPresent(payload, 'sku', sku);
    // product_code IS auto-generated server-side (sp_upsert_product, format
    // <SegmentPrefix>-<CategoryPrefix>-NNNNN) when omitted -- but via the
    // same COUNT(*)+1-then-retry-loop pattern proven racy under true
    // concurrent inserts. The manual "+Add Item" form never actually
    // exercises that server fallback at all -- onProductNameChange() in
    // inventory-screen-shell.ts always fills productCode client-side via
    // generateCodeFromName() the moment a name is typed, the SAME generic
    // PREFIX-YY-NNNNN generator used for UOM/Category/Brand/Vendor/Customer
    // codes. There's no "Product Code" column on this sheet (never was --
    // see build.js), so this always fires; matching the manual form's own
    // generator, and reusing the identical existingCount/batchIndex basis
    // SKU above uses, routes every row around the server's racy fallback
    // exactly like the SKU fix already does.
    const productCode = this.cell(row, 'Product Code') || this.generateSequentialCode(itemName, existingCount, batchIndex);
    this.setIfPresent(payload, 'product_code', productCode);
    this.setIfPresent(payload, 'product_name', itemName);
    this.setIfPresent(payload, 'category_name', categoryName);
    this.setIfPresent(payload, 'brand_name', brandName);
    this.setIfPresent(payload, 'description', this.cell(row, 'Description'));

    const tracking = this.cell(row, 'Tracking Method').toLowerCase();
    if (tracking.includes('batch')) payload['batch_applicable'] = true;
    if (tracking.includes('serial')) payload['serial_applicable'] = true;
    const hasExpiry = this.cellYesNo(row, 'Has Expiry');
    if (hasExpiry !== undefined) payload['expiry_applicable'] = hasExpiry;

    this.setIfPresent(payload, 'valuation_method', this.cell(row, 'Valuation Method'));
    const productStatus = (this.cell(row, 'Status') || 'active').toLowerCase();
    payload['status'] = productStatus;
    payload['item_status'] = productStatus;

    this.setIfPresent(payload, 'base_uom_name', this.cell(row, 'Base UOM'));
    this.setIfPresent(payload, 'hsn_sac_code', this.cell(row, 'HSN-SAC Code'));

    const gstRate = this.cellNumber(row, 'GST %');
    if (gstRate !== undefined) payload['gst_rate'] = gstRate;
    const reorderLevel = this.cellNumber(row, 'Reorder Level');
    if (reorderLevel !== undefined) payload['reorder_level'] = reorderLevel;

    // The template's single Alternate UOM / Conversion Factor pair maps to
    // one uom_conversions row; Purchase UOM / Sale UOM only set the
    // is_purchase/is_sales flags when they match that same alternate UOM --
    // a third, unrelated purchase/sale UOM isn't modelled by this sheet.
    const altUom = this.cell(row, 'Alternate UOM');
    const factor = this.cellNumber(row, 'Conversion Factor');
    if (altUom && factor !== undefined) {
      const purchaseUom = this.cell(row, 'Purchase UOM');
      const saleUom = this.cell(row, 'Sale UOM');
      const isPurchase = !!purchaseUom && this.normalizeKey(purchaseUom) === this.normalizeKey(altUom);
      const isSale = !!saleUom && this.normalizeKey(saleUom) === this.normalizeKey(altUom);
      payload['uom_conversions'] = [{
        from_uom_name: altUom,
        alt_uom_name: altUom,
        conversion_factor: factor,
        is_purchase_uom: isPurchase,
        is_sales_uom: isSale,
        is_default_purchase: isPurchase,
        is_default_sale: isSale,
        status: 'active'
      }];
    }
    return payload;
  }

  private vendorImportPayload(row: Record<string, any>, segmentByName: Map<string, number>, paymentTermByName: Map<string, number>, fallbackSegmentId: number | null, existingCount: number, batchIndex: number): Record<string, any> {
    const payload: Record<string, any> = {};
    const segmentName = this.cell(row, 'Business Segment');
    const rowSegmentId = segmentName ? segmentByName.get(this.normalizeKey(segmentName)) : undefined;
    const resolvedSegmentId = rowSegmentId ?? fallbackSegmentId ?? undefined;
    if (resolvedSegmentId) payload['segment_id'] = resolvedSegmentId;
    const vendorName = this.cell(row, 'Vendor Name / Company Name');
    const vendorCode = this.cell(row, 'Vendor Code') || this.generateSequentialCode(vendorName, existingCount, batchIndex);
    this.setIfPresent(payload, 'vendor_code', vendorCode);
    this.setIfPresent(payload, 'vendor_name', vendorName);
    this.setIfPresent(payload, 'gstin', this.cell(row, 'GSTIN'));
    this.setIfPresent(payload, 'pan', this.cell(row, 'PAN'));
    this.setIfPresent(payload, 'contact_name', this.cell(row, 'Contact Person'));
    this.setIfPresent(payload, 'mobile', this.cell(row, 'Mobile'));
    this.setIfPresent(payload, 'email', this.cell(row, 'Email'));
    this.setIfPresent(payload, 'address', this.cell(row, 'Address'));
    const paymentTerms = this.cell(row, 'Payment Terms');
    if (paymentTerms) {
      const id = paymentTermByName.get(this.normalizeKey(paymentTerms));
      if (id) payload['payment_term_id'] = id;
    }
    const creditLimit = this.cellNumber(row, 'Credit Limit');
    if (creditLimit !== undefined) payload['credit_limit'] = creditLimit;
    this.setIfPresent(payload, 'bank_payee_name', this.cell(row, 'Bank Payee Name'));
    this.setIfPresent(payload, 'bank_account_no', this.cell(row, 'Bank Account No.'));
    this.setIfPresent(payload, 'bank_ifsc_code', this.cell(row, 'Bank IFSC Code'));
    this.setIfPresent(payload, 'bank_name', this.cell(row, 'Bank Name'));
    this.setIfPresent(payload, 'bank_branch_name', this.cell(row, 'Bank Branch'));
    payload['status'] = (this.cell(row, 'Status') || 'active').toLowerCase();
    return payload;
  }

  private customerImportPayload(row: Record<string, any>, segmentByName: Map<string, number>, paymentTermByName: Map<string, number>, fallbackSegmentId: number | null, existingCount: number, batchIndex: number): Record<string, any> {
    const payload: Record<string, any> = {};
    const segmentName = this.cell(row, 'Business Segment');
    const rowSegmentId = segmentName ? segmentByName.get(this.normalizeKey(segmentName)) : undefined;
    const resolvedSegmentId = rowSegmentId ?? fallbackSegmentId ?? undefined;
    if (resolvedSegmentId) payload['segment_id'] = resolvedSegmentId;
    const customerName = this.cell(row, 'Customer Name / Company Name');
    const customerCode = this.cell(row, 'Customer Code') || this.generateSequentialCode(customerName, existingCount, batchIndex);
    this.setIfPresent(payload, 'customer_code', customerCode);
    this.setIfPresent(payload, 'customer_name', customerName);
    this.setIfPresent(payload, 'gstin', this.cell(row, 'GSTIN'));
    this.setIfPresent(payload, 'pan', this.cell(row, 'PAN'));
    this.setIfPresent(payload, 'contact_name', this.cell(row, 'Contact Person'));
    this.setIfPresent(payload, 'mobile', this.cell(row, 'Mobile'));
    this.setIfPresent(payload, 'email', this.cell(row, 'Email'));
    this.setIfPresent(payload, 'address', this.cell(row, 'Billing Address'));
    this.setIfPresent(payload, 'shipping_address', this.cell(row, 'Shipping Address'));
    const paymentTerms = this.cell(row, 'Payment Terms');
    if (paymentTerms) {
      const id = paymentTermByName.get(this.normalizeKey(paymentTerms));
      if (id) payload['payment_term_id'] = id;
    }
    const creditLimit = this.cellNumber(row, 'Credit Limit');
    if (creditLimit !== undefined) payload['credit_limit'] = creditLimit;
    this.setIfPresent(payload, 'bank_payee_name', this.cell(row, 'Bank Payee Name'));
    this.setIfPresent(payload, 'bank_account_no', this.cell(row, 'Bank Account No.'));
    this.setIfPresent(payload, 'bank_ifsc_code', this.cell(row, 'Bank IFSC Code'));
    this.setIfPresent(payload, 'bank_name', this.cell(row, 'Bank Name'));
    this.setIfPresent(payload, 'bank_branch_name', this.cell(row, 'Bank Branch'));
    payload['status'] = (this.cell(row, 'Status') || 'active').toLowerCase();
    return payload;
  }

  private buildNameMap<T, V>(items: T[], nameFn: (item: T) => string | undefined, valueFn: (item: T) => V): Map<string, V> {
    const map = new Map<string, V>();
    for (const item of items || []) {
      const key = this.normalizeKey(nameFn(item));
      if (key && !map.has(key)) map.set(key, valueFn(item));
    }
    return map;
  }

  private refreshCategories(): void {
    this.svc.getCategories().subscribe({
      next: res => this.categories.set(this.dedupeByName(res.data ?? [], item => item.category_name)),
      error: () => undefined
    });
  }

  // ── Review step: per-row include/exclude, live Segment Link resolution ───

  backToFileSelect(): void {
    if (this.importing()) return;
    this.phase.set('select');
    this.previewSheets.set([]);
    this.importOverallError.set('');
  }

  toggleRowInclude(sheetName: string, rowNumber: number): void {
    this.previewSheets.update(sheets => sheets.map(s => s.sheet !== sheetName ? s : {
      ...s,
      rows: s.rows.map(r => r.rowNumber !== rowNumber ? r : { ...r, include: !r.include })
    }));
  }

  setSheetInclude(sheetName: string, include: boolean): void {
    this.previewSheets.update(sheets => sheets.map(s => s.sheet !== sheetName ? s : {
      ...s,
      rows: s.rows.map(r => ({ ...r, include }))
    }));
  }

  // Live per-row Segment Link resolution -- recomputed from the current
  // selectedSegmentId()/savedSegments() on every call, so changing the
  // picker in the review step immediately updates what every row will
  // actually be linked to, with no re-parse needed. Mirrors the resolution
  // order the *ImportPayload builders above actually use (row's own cell
  // wins, fallback only fills in when it doesn't resolve).
  rowSegmentInfo(sheet: ImportPreviewSheet, row: ImportPreviewRow): { label: string; warnings: string[] } {
    if (!sheet.hasSegmentConcept) return { label: '—', warnings: [] };
    const fallbackId = this.selectedSegmentId();
    const fallbackName = fallbackId ? (this.savedSegments().find(s => s.id === fallbackId)?.segment_name ?? null) : null;
    const cellValue = sheet.segmentColumn ? this.cell(row.raw, sheet.segmentColumn) : '';
    const warnings: string[] = [];
    if (cellValue) {
      const segmentByName = this.buildNameMap(this.savedSegments(), s => s.segment_name, s => s.id);
      const id = segmentByName.get(this.normalizeKey(cellValue));
      if (id) return { label: cellValue, warnings };
      warnings.push(`"${cellValue}" isn't a recognized Business Segment.`);
    }
    if (fallbackId) return { label: `${fallbackName} (default)`, warnings };
    if (this.savedSegments().length > 1) {
      warnings.push('No Business Segment link — may not appear on segment-scoped Master screens.');
    }
    return { label: 'No segment', warnings };
  }

  segmentPickerRequired(): boolean {
    return this.savedSegments().length > 1;
  }

  segmentGateSatisfied(): boolean {
    if (!this.segmentPickerRequired()) return true;
    return this.selectedSegmentId() !== undefined;
  }

  totalIncluded(): number {
    return this.previewSheets().reduce((sum, s) => sum + s.rows.filter(r => r.include).length, 0);
  }

  totalFailed(): number {
    return this.previewSheets().reduce((sum, s) => sum + s.rows.filter(r => r.status === 'failed').length, 0);
  }

  sheetFailedCount(sheet: ImportPreviewSheet): number {
    return sheet.rows.filter(r => r.status === 'failed').length;
  }

  sheetIncludedCount(sheet: ImportPreviewSheet): number {
    return sheet.rows.filter(r => r.include).length;
  }

  sheetCreatedCount(sheet: ImportPreviewSheet): number {
    return sheet.rows.filter(r => r.status === 'created').length;
  }

  anySubmitAttempted(): boolean {
    return this.previewSheets().some(s => s.rows.some(r => r.status !== 'pending'));
  }

  canSubmit(): boolean {
    return !this.importing() && !this.parsing() && this.totalIncluded() > 0 && this.segmentGateSatisfied();
  }

  // ── Phase 2: Submit (the only phase that calls a save endpoint) ──────────

  async submitImport(): Promise<void> {
    if (!this.canSubmit()) return;
    await this.runSubmission(sheetName => this.rowsIn(sheetName).filter(r => r.include));
  }

  async retryAllFailed(): Promise<void> {
    if (this.importing() || this.parsing()) return;
    await this.runSubmission(sheetName => this.rowsIn(sheetName).filter(r => r.include && r.status === 'failed'));
  }

  async retrySheetFailed(sheetName: string): Promise<void> {
    if (this.importing() || this.parsing()) return;
    await this.runSubmission(name => name === sheetName ? this.rowsIn(sheetName).filter(r => r.include && r.status === 'failed') : []);
  }

  private rowsIn(sheetName: string): ImportPreviewRow[] {
    return this.previewSheets().find(s => s.sheet === sheetName)?.rows ?? [];
  }

  private async runSubmission(rowsForSheet: (sheetName: string) => ImportPreviewRow[]): Promise<void> {
    this.importing.set(true);
    this.importOverallError.set('');

    try {
      // These three are resolved client-side because the underlying upsert
      // stored procedures have no name fallback for them (payment_term_id,
      // warehouse_id/branch_id) -- every other cross-sheet reference
      // (category, brand, uom, hsn/sac) the backend already resolves
      // server-side by name/code, same as a manual save.
      const [paymentTermsRes, warehousesRes, branchesRes] = await Promise.all([
        firstValueFrom(this.svc.getPaymentTerms(true)),
        firstValueFrom(this.svc.getWarehouses(true)),
        firstValueFrom(this.svc.getBranchesInv(true))
      ]);

      const segmentByName = this.buildNameMap(this.savedSegments(), s => s.segment_name, s => s.id);
      const paymentTermByName = this.buildNameMap(paymentTermsRes.data ?? [], p => p.term_name, p => p.id);
      const warehouseByName = this.buildNameMap(warehousesRes.data ?? [], w => w.warehouse_name, w => w.id);
      const branchByName = this.buildNameMap(branchesRes.data ?? [], b => b.branch_name, b => b.id ?? 0);
      // Parent Category can only resolve against categories that already
      // existed before this batch ran -- sibling rows in the Category
      // Master sheet save in parallel (forkJoin) and cannot reference each
      // other as parent/child within the same batch.
      const categoryByName = this.buildNameMap(this.categories(), c => c.category_name, c => c.id);
      const fallbackSegmentId = this.selectedSegmentId() ?? null;

      // Each existing-record count below is a one-time snapshot fetched
      // right before that sheet's payload array is built, then reused by
      // every row in that sheet's forkJoin batch -- never refetched per-row.
      // Refetching it on every runSubmission() call (a first full submit OR
      // a later retry) is what keeps a retry's auto-generated codes distinct
      // from whatever already landed on the first attempt.
      const uomsRes = await firstValueFrom(this.svc.getUoms(true));
      await this.submitRows('UOM Master', rowsForSheet('UOM Master'),
        (row, batchIndex) => this.uomImportPayload(row, fallbackSegmentId, (uomsRes.data ?? []).length, batchIndex),
        payload => this.svc.saveUom(payload));

      const categoryExistingCount = this.categories().length;
      await this.submitRows('Category Master', rowsForSheet('Category Master'),
        (row, batchIndex) => this.categoryImportPayload(row, segmentByName, categoryByName, fallbackSegmentId, categoryExistingCount, batchIndex),
        payload => this.svc.saveCategory(payload));

      const brandsRes = await firstValueFrom(this.svc.getBrands(null, true));
      await this.submitRows('Brand Master', rowsForSheet('Brand Master'),
        (row, batchIndex) => this.brandImportPayload(row, fallbackSegmentId, (brandsRes.data ?? []).length, batchIndex),
        payload => this.svc.saveBrand(payload));

      const hsnSacCreatedIds = await this.submitRows('HSN-SAC Mapping', rowsForSheet('HSN-SAC Mapping'),
        row => this.hsnSacImportPayload(row),
        payload => this.svc.saveHsnSac(payload));
      // taxation.hsn_sac has no segment_id column and sp_upsert_hsn_sac's own
      // DTO has no segment field either -- unlike UOM/Category/Brand/Item/
      // Vendor/Customer, a newly created HSN/SAC row needs a SEPARATE write
      // to the segment's own hsn_sac_ids array to become visible on Tax
      // Classification Master (a segment-filtered screen, same mechanism the
      // manual "+Add"/quick-add HSN flow already uses elsewhere -- see
      // linkHsnSacToFallbackSegment()'s own comment for how this was found).
      await this.linkHsnSacToFallbackSegment(hsnSacCreatedIds, fallbackSegmentId);

      // Products need their own pre-batch count for SKU generation -- the
      // Opening Stock re-fetch further below happens AFTER this sheet runs
      // specifically so it can see the rows this sheet just created, so it
      // can't double as this snapshot.
      const productsBeforeRes = await firstValueFrom(this.svc.getProducts(null, null, true));
      await this.submitRows('Item-Product Master', rowsForSheet('Item-Product Master'),
        (row, batchIndex) => this.productImportPayload(row, segmentByName, fallbackSegmentId, (productsBeforeRes.data ?? []).length, batchIndex),
        payload => this.svc.saveProduct(payload));

      const vendorsRes = await firstValueFrom(this.svc.getVendors(null, true));
      await this.submitRows('Vendor Master', rowsForSheet('Vendor Master'),
        (row, batchIndex) => this.vendorImportPayload(row, segmentByName, paymentTermByName, fallbackSegmentId, (vendorsRes.data ?? []).length, batchIndex),
        payload => this.svc.saveVendor(payload));

      const customersRes = await firstValueFrom(this.svc.getCustomers(null, true));
      await this.submitRows('Customer Master', rowsForSheet('Customer Master'),
        (row, batchIndex) => this.customerImportPayload(row, segmentByName, paymentTermByName, fallbackSegmentId, (customersRes.data ?? []).length, batchIndex),
        payload => this.svc.saveCustomer(payload));

      // Opening Stock references items by SKU -- re-fetch products now so it
      // sees anything the Item-Product Master sheet above just created.
      const productsRes = await firstValueFrom(this.svc.getProducts(null, null, true));
      const productBySku = this.buildNameMap(productsRes.data ?? [], p => p.sku, p => p);
      const productByName = this.buildNameMap(productsRes.data ?? [], p => p.product_name, p => p);
      await this.submitOpeningStockRows(rowsForSheet('Opening Stock'), warehouseByName, branchByName, productBySku, productByName);

      // Newly-imported categories should show up if the user reruns/retries
      // a sheet that references Parent Category, without needing to reopen
      // this popup.
      this.refreshCategories();
    } catch (err: any) {
      this.importOverallError.set(err?.error?.title ?? err?.error?.message ?? err?.message ?? 'Submit failed. See browser console for details.');
    } finally {
      this.importing.set(false);
    }
  }

  // Generic runner for the 7 flat (one row = one record) sheets -- saves
  // exactly the rows handed to it (already filtered to included, and to
  // failed-only on a retry, by the caller), then writes each row's
  // created/failed status back onto previewSheets() so the review table
  // reflects the outcome in place, with no separate results screen. Returns
  // the ids of every row that saved successfully -- most callers ignore it,
  // but HSN-SAC Mapping needs it for linkHsnSacToFallbackSegment().
  private async submitRows(
    sheetName: string,
    rows: ImportPreviewRow[],
    rowToPayload: (row: Record<string, any>, batchIndex: number) => Record<string, any>,
    save: (payload: Record<string, any>) => Observable<ApiResponse<any>>
  ): Promise<number[]> {
    if (!rows.length) return [];

    const jobs = rows.map((row, batchIndex) => ({ row, payload: rowToPayload(row.raw, batchIndex) }));
    const requests = jobs.map(job => save(job.payload).pipe(
      map(res => ({ job, res, error: null as any })),
      catchError(error => of({ job, res: null as any, error }))
    ));

    const results = await firstValueFrom(forkJoin(requests));
    const outcomeByRow = new Map<number, { status: 'created' | 'failed'; message?: string }>();
    const createdIds: number[] = [];
    for (const result of results) {
      if (result.res?.success) {
        outcomeByRow.set(result.job.row.rowNumber, { status: 'created' });
        const id = Number(result.res?.data?.id);
        if (Number.isFinite(id) && id > 0) createdIds.push(id);
      } else {
        const message = result.res?.message
          ?? result.error?.error?.title
          ?? result.error?.error?.message
          ?? result.error?.message
          ?? 'Save failed.';
        outcomeByRow.set(result.job.row.rowNumber, { status: 'failed', message });
      }
    }
    this.applyRowOutcomes(sheetName, outcomeByRow);
    return createdIds;
  }

  // HSN/SAC has no segment_id column at all (confirmed live against
  // taxation.hsn_sac's schema), and sp_upsert_hsn_sac's own upsert DTO has no
  // segment field either -- so unlike UOM/Category/Brand/Item/Vendor/
  // Customer, there is no way to link a new HSN/SAC code to a segment through
  // its own save call. The ONLY mechanism that exists (used by the manual
  // "+Add"/quick-add HSN flow elsewhere -- mapSavedGlobalMasterToSelectedSegment()
  // in inventory-screen-shell.ts) is a second write to the SEGMENT's own
  // hsn_sac_ids array. Tax Classification Master IS a segment-filtered screen
  // (isSegmentFilteredGridKey() there includes 'hsnSacMapping'), so without
  // this, a bulk-imported HSN/SAC code lands in the DB correctly (confirmed
  // live) but shows "0 of 0" on its own real Master screen -- the exact same
  // invisible-record failure mode the Business Segment picker exists to
  // prevent for the other six sheets, just missed for this one since it has
  // no segment_id column to set directly. Found during this redesign's live
  // verification, not previously caught (see docs/INVENTORY_AUTOMATION_TESTS.md).
  private async linkHsnSacToFallbackSegment(createdIds: number[], fallbackSegmentId: number | null): Promise<void> {
    if (!fallbackSegmentId || !createdIds.length) return;
    const seg = this.savedSegments().find(s => s.id === fallbackSegmentId);
    if (!seg) return;
    const hsnSacIds = new Set((seg.hsn_sac_codes || []).map(item => Number(item.id)).filter(id => Number.isFinite(id) && id > 0));
    createdIds.forEach(id => hsnSacIds.add(id));
    try {
      const res = await firstValueFrom(this.svc.saveSegment({
        segment_name: seg.segment_name,
        usage_note: seg.usage_note || null,
        category_ids: (seg.categories || []).map(c => c.id),
        hsn_sac_ids: [...hsnSacIds],
        uom_ids: (seg.uoms || []).map(u => u.id),
        status: seg.status || 'active'
      }, seg.id));
      if (res.success && res.data) {
        this.savedSegments.update(list => list.map(s => s.id === res.data!.id ? res.data! : s));
      }
    } catch {
      // Best-effort: the HSN/SAC rows themselves already saved successfully
      // (their own row status already shows "Created") -- a failure here
      // only means the segment-visibility link didn't take, not that the
      // import failed. Not surfaced as a row-level failure since it isn't
      // one; a re-run of just this sheet (Retry Failed has nothing to retry
      // here since the rows succeeded) or reselecting the segment picker and
      // resubmitting would retry this step too.
    }
  }

  // Opening Stock rows group by (Warehouse/Branch, Opening Date) into one
  // saveOpeningStockEntry() call per group -- the header+lines shape that
  // procedure expects, unlike the other 7 flat sheets. Every row sharing a
  // group gets that group's single created/failed outcome.
  private async submitOpeningStockRows(
    rows: ImportPreviewRow[],
    warehouseByName: Map<string, number>,
    branchByName: Map<string, number>,
    productBySku: Map<string, ProductItem>,
    productByName: Map<string, ProductItem>
  ): Promise<void> {
    if (!rows.length) return;

    interface OpeningGroup { locationText: string; dateIso: string | undefined; items: Record<string, any>[]; rowNumbers: number[]; }
    const groups = new Map<string, OpeningGroup>();

    for (const row of rows) {
      const r = row.raw;
      const locationText = this.cell(r, 'Warehouse / Branch');
      const dateIso = this.cellDateIso(r, 'Opening Date');
      const groupKey = `${this.normalizeKey(locationText)}||${dateIso ?? '__no-date__'}`;
      if (!groups.has(groupKey)) groups.set(groupKey, { locationText, dateIso, items: [], rowNumbers: [] });
      const group = groups.get(groupKey)!;

      const sku = this.cell(r, 'Item SKU');
      const itemNameCell = this.cell(r, 'Item Name');
      const product = (sku && productBySku.get(this.normalizeKey(sku)))
        || (itemNameCell && productByName.get(this.normalizeKey(itemNameCell)))
        || undefined;

      const item: Record<string, any> = {};
      this.setIfPresent(item, 'product_name', product?.product_name || itemNameCell);
      if (product?.id) item['product_id'] = product.id;
      if (product?.product_code) item['product_code'] = product.product_code;
      if (product?.base_uom_id) item['uom_id'] = product.base_uom_id;
      this.setIfPresent(item, 'uom_name', product?.base_uom_name);
      const qty = this.cellNumber(r, 'Quantity');
      if (qty !== undefined) item['qty'] = qty;
      const rate = this.cellNumber(r, 'Rate');
      if (rate !== undefined) item['rate'] = rate;
      this.setIfPresent(item, 'batch_no', this.cell(r, 'Batch No'));
      this.setIfPresent(item, 'serial_no', this.cell(r, 'Serial No'));

      group.items.push(item);
      group.rowNumbers.push(row.rowNumber);
    }
    if (!groups.size) return;

    const jobs = Array.from(groups.values()).map(group => {
      const payload: Record<string, any> = { items: group.items };
      if (group.dateIso) payload['entry_date'] = group.dateIso;
      const whId = warehouseByName.get(this.normalizeKey(group.locationText));
      if (whId) {
        payload['warehouse_id'] = whId;
      } else {
        const brId = branchByName.get(this.normalizeKey(group.locationText));
        if (brId) payload['branch_id'] = brId;
        else this.setIfPresent(payload, 'warehouse_name', group.locationText);
      }
      return { group, payload };
    });

    const requests = jobs.map(job => this.txService.saveOpeningStockEntry(job.payload).pipe(
      map(res => ({ job, res, error: null as any })),
      catchError(error => of({ job, res: null as any, error }))
    ));

    const results = await firstValueFrom(forkJoin(requests));
    const outcomeByRow = new Map<number, { status: 'created' | 'failed'; message?: string }>();
    for (const result of results) {
      const message = result.res?.message
        ?? result.error?.error?.title
        ?? result.error?.error?.message
        ?? result.error?.message
        ?? 'Save failed.';
      for (const rowNumber of result.job.group.rowNumbers) {
        outcomeByRow.set(rowNumber, result.res?.success ? { status: 'created' } : { status: 'failed', message });
      }
    }
    this.applyRowOutcomes('Opening Stock', outcomeByRow);
  }

  private applyRowOutcomes(sheetName: string, outcomeByRow: Map<number, { status: 'created' | 'failed'; message?: string }>): void {
    this.previewSheets.update(sheets => sheets.map(s => s.sheet !== sheetName ? s : {
      ...s,
      rows: s.rows.map(r => {
        const outcome = outcomeByRow.get(r.rowNumber);
        return outcome ? { ...r, status: outcome.status, resultMessage: outcome.message } : r;
      })
    }));
  }
}
