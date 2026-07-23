import { CommonModule } from '@angular/common';
import { HorizDragScrollService } from '../horiz-drag-scroll.directive';
import { Component, DestroyRef, HostListener, Input, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, concatMap, debounceTime, distinctUntilChanged, from, map, of, switchMap } from 'rxjs';
import { ReferenceDataBindEvent } from '../../../shared/reference-data-tray/reference-data-tray.models';
import { ReferenceDataTrayService } from '../../../shared/reference-data-tray/reference-data-tray.service';
import { ApiResponse, AttributeItem, BranchInvItem, CategoryItem, CustomerItem, GstRateGuide, HsnSacItem, InventoryConfigService, PaymentTermItem, ProductApplicableVariant, ProductBundleItem, ProductItem, ProductTypeItem, ProductUomConversion, ProductVariantStockAttribute, ProductVariantStockControl, SegmentItem, TaxCodeSuggestion, UomItem, VariantItem, VendorItem, WarehouseItem } from '../inventory-config.service';
import { InventoryTransactionsService, PurchaseRefDoc } from '../inventory-transactions.service';
import { applyInventoryTextCase, inventoryTextCaseForField, inventoryTextCaseForLineColumn, toInventoryTitleCase } from '../inventory-text-case.util';
import {
  INVENTORY_KPIS,
  INVENTORY_OPTIONS,
  INVENTORY_SEGMENT_DASHBOARDS,
  INVENTORY_SEGMENTS,
  INVENTORY_UOM_CONVERSIONS,
  InventoryField,
  InventoryScreenConfig,
  InventorySegment
} from '../inventory-screen.model';

export interface VariantAttrSelection {
  name: string;
  value: string;
  options: string[];
  isAuto: boolean;
}

interface GlobalContactOption {
  name: string;
  type: 'Company' | 'Individual';
  mobile: string;
  email: string;
  gstin: string;
  pan: string;
  address: string;
}

interface PartyRecentTransaction {
  ref: string;
  date: string;
  amount: string;
  status: string;
}

interface PartySummaryData {
  name: string;
  creditLimit: string;
  creditUsed: string;
  creditAvailable: string;
  overdueAmount: string;
  lastTransactionDate: string;
  lastTransactionAmount: string;
  recentTransactions: PartyRecentTransaction[];
}

@Component({
  selector: 'app-inventory-screen-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule],
  templateUrl: './inventory-screen-shell.html'
})
export class InventoryScreenShell implements OnInit {
  @Input({ required: true }) config!: InventoryScreenConfig;

  private readonly referenceDataTrayService = inject(ReferenceDataTrayService);
  private readonly _dragScroll = inject(HorizDragScrollService);
  private readonly inventoryConfigService = inject(InventoryConfigService);
  protected readonly txService = inject(InventoryTransactionsService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Reference picker ─────────────────────────────────────────────────────
  readonly refPickerOpen  = signal(false);
  readonly refPickerType  = signal('');
  readonly refPickerDocs  = signal<PurchaseRefDoc[]>([]);
  readonly refPickerLoading = signal(false);
  readonly transactionReferenceDocs = signal<PurchaseRefDoc[]>([]);
  readonly transactionReferenceLoading = signal(false);
  readonly txDocId        = signal<number | null>(null);
  readonly txDocNumber    = signal('');
  readonly txDocStatus    = signal('draft');
  readonly txSaving       = signal(false);
  readonly txSaveMsg      = signal('');
  readonly txSaveError    = signal('');

  readonly activeAddMaster = signal('');
  get quickAddHost(): this { return this; }
  readonly advicePanelOpen = signal(false);
  readonly partySummaryOpen = signal(false);
  readonly selectedPartyName = signal('');
  readonly posEnabled = signal(false);
  readonly warehouseRequired = signal(true);
  readonly branchContactRequired = signal(false);
  readonly partyContactRequired = signal(false);
  readonly selectedPartyContact = signal<GlobalContactOption | null>(null);
  readonly selectedPartyContactPerson = signal<GlobalContactOption | null>(null);
  readonly consumptionApprovalRequired = signal(false);
  readonly approvalLevel = signal('Single Level');
  readonly selectedLevelOneApprover = signal<GlobalContactOption | null>(null);
  readonly selectedLevelTwoApprover = signal<GlobalContactOption | null>(null);
  readonly selectedFinalApprover = signal<GlobalContactOption | null>(null);
  readonly uomConversionRequired = signal(false);
  readonly productBatchApplicable = signal(false);
  readonly productSerialApplicable = signal(false);
  readonly productExpiryApplicable = signal(false);
  readonly productQcRequired = signal(false);
  readonly productTaxUomRequired = signal(false);
  readonly productBrandRequired = signal(false);
  readonly productVariantRequired = signal(false);
  readonly productValuationRequired = signal(false);
  readonly productBrandVariantValuationRequired = computed(() =>
    this.productBrandRequired() || this.productVariantRequired() || this.productValuationRequired()
  );
  readonly productUomMappingRequired = signal(false);
  readonly selectedApplicableVariants = signal<ProductApplicableVariant[]>([]);
  readonly bundleCompositionRequired = signal(false);
  readonly bundleCompositionItems = signal<ProductBundleItem[]>([]);
  private readonly pendingVariantResolve = signal<{ name: string; label: string } | null>(null);
  readonly taxInfoVisible = signal(false);
  readonly productStockControlsRequired = signal(false);
  readonly productTrackingRequired = signal(false);
  readonly productAdditionalInfoRequired = signal(false);
  readonly categorySerialApplicable = signal(false);
  readonly categoryBatchApplicable = signal(false);
  readonly activeGridSearch = signal('');
  readonly gridSearchText = signal('');
  readonly sortState = signal<{ tableId: string; columnIndex: number; direction: 'asc' | 'desc' } | null>(null);
  readonly entryLineRows = signal<string[][]>([]);
  readonly entryLineRowsKey = signal('');
  readonly boundReferenceFields = signal<Record<string, string>>({});
  readonly boundReferenceLabels = signal<string[]>([]);
  readonly scannerMessage = signal('');
  readonly productName = signal('');
  readonly selectedProductCategory = signal('');
  readonly hsnSacCode = signal('');
  readonly hsnSacDescription = signal('');
  readonly gstRate = signal<number | null>(null);
  readonly selectedTaxCodeSuggestion = signal<TaxCodeSuggestion | null>(null);
  readonly taxCodeSuggestions = signal<TaxCodeSuggestion[]>([]);
  readonly taxCodeSuggesting = signal(false);
  readonly taxCodeSearchMessage = signal('');
  readonly selectedTaxSource = signal('');
  readonly taxSourceUpdatedAt = signal<string | null>(null);
  readonly gstGuide = signal<GstRateGuide | null>(null);
  readonly gstGuideLoading = signal(false);
  private readonly taxCodeSearch$ = new Subject<{ query: string; category: string; autoPick: boolean }>();

  // ── API form-capture state ────────────────────────────────────────────────
  readonly genericNameValue = signal('');

  readonly existingRowMatches = computed(() => {
    const q = this.genericNameValue().trim().toLowerCase();
    if (q.length < 2) return [];
    return this.liveRows().filter(row =>
      row.some(cell => cell.toLowerCase().includes(q))
    ).slice(0, 6);
  });

  readonly formValues = signal<Record<string, any>>({});
  readonly savedRecordObjects = signal<any[]>([]);
  readonly editingId = signal<number | null>(null);
  readonly isSaving = signal(false);
  readonly saveMsg = signal('');
  readonly saveError = signal('');
  readonly selectedSegment = signal('');

  readonly pendingRows = signal<Array<{ payload: Record<string, any>; formSnapshot: Record<string, any>; display: string[] }>>([]);
  readonly editingPendingIndex = signal<number | null>(null);
  readonly isBatchSaving = signal(false);
  readonly isAdmin = signal(false);

  readonly quickAddName       = signal('');
  readonly quickAddCode       = signal('');
  readonly isSavingQuickAdd   = signal(false);
  readonly quickAddError      = signal('');
  readonly addMasterSourceFieldKey = signal<string | null>(null);

  // Suggestions shown when typing in quick-add Name fields to prevent duplicates
  readonly quickAddSuggestions = computed(() => {
    const master = this.activeAddMaster();
    const input = this.quickAddName().trim().toLowerCase();
    if (!input) return [];
    let pool: string[];
    switch (master) {
      // Company-wide list (not segment-scoped) — matches what sp_upsert_uom actually checks,
      // so the warning shows even when this segment's own UOM list is still empty.
      case 'UOM':                  pool = this.loadedUomObjects().map(u => u.uom_name).filter((n): n is string => !!n); break;
      case 'Category':             pool = this.categoryOptions; break;
      case 'Variant':              pool = this.variantOptions; break;
      case 'Attribute':            pool = this.attributeOptions; break;
      case 'Brand':                pool = this.brandOptions; break;
      case 'Serial Number Policy': pool = this.serialPolicyOptions; break;
      case 'Batch / Lot Policy':   pool = this.batchPolicyOptions; break;
      case 'Product Type':         pool = this.productTypeOptions; break;
      case 'Manufacturer':         pool = this.manufacturerOptions; break;
      case 'Tax Category':         pool = this.taxCategoryOptions; break;
      default: return [];
    }
    return pool.filter(opt => opt.toLowerCase().includes(input)).slice(0, 8);
  });

  readonly quickAddIsDuplicate = computed(() => {
    const input = this.quickAddName().trim().toLowerCase();
    if (!input) return false;
    return this.quickAddSuggestions().some(opt => opt.toLowerCase() === input);
  });
  readonly productCodeIsAuto  = signal(false);
  readonly skuIsAuto          = signal(false);
  private _quickAddCodeManuallySet = false;
  readonly quickAddUomSymbol     = signal('');
  readonly quickAddUomType       = signal('Base');
  readonly quickAddParentMaster  = signal('');
  readonly quickAddParentName    = signal('');
  readonly quickAddParentCode    = signal('');
  readonly quickAddVariantRows   = signal<Array<{name: string; value: any}>>([{name: '', value: ''}]);
  private _autoCodeFields        = new Set<string>();

  readonly kpis = INVENTORY_KPIS;
  private readonly segmentCardList = signal<InventorySegment[]>([]);
  readonly uomConversions = INVENTORY_UOM_CONVERSIONS;
  private readonly segmentOptionList = signal<string[]>([]);
  protected readonly categoryOptionList = signal<string[]>([]);
  private readonly uomOptionList = signal<string[]>([]);
  private readonly hsnSacOptionList = signal<string[]>([]);
  private readonly brandOptionList = signal<string[]>([]);
  private readonly attributeOptionList = signal<string[]>([]);
  private readonly variantOptionList = signal<string[]>([]);
  private readonly productOptionList = signal<string[]>([]);
  readonly lineAttrValueMap = signal<Record<string, string>>({});
  private readonly vendorOptionList = signal<string[]>([]);
  private readonly warehouseOptionList = signal<string[]>([]);
  private readonly branchOptionList = signal<string[]>([]);
  private readonly paymentTermOptionList = signal<string[]>([]);
  private readonly serialPolicyOptionList = signal<string[]>([]);
  private readonly batchPolicyOptionList = signal<string[]>([]);
  private readonly manufacturerOptionList = signal<string[]>([]);
  private readonly taxCategoryOptionList = signal<string[]>([]);
  private readonly loadedCategoryObjects = signal<CategoryItem[]>([]);
  private readonly loadedSegmentObjects = signal<SegmentItem[]>([]);
  private readonly loadedHsnSacObjects = signal<HsnSacItem[]>([]);
  private readonly loadedUomObjects = signal<UomItem[]>([]);
  private readonly allAttributeObjects = signal<AttributeItem[]>([]);
  private readonly loadedAttributeObjects = signal<AttributeItem[]>([]);
  private readonly loadedAttributeReady = signal(false);

  // Stable computed caches — only recomputed when attribute signals change, never on every CD cycle.
  private readonly _stableAttrNameOptions = computed((): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    // Once the segment-scoped load has completed, use only that list (even if empty).
    // Before it completes, fall back to the global list so dropdowns aren't blank during initial load.
    const source = this.loadedAttributeReady()
      ? this.loadedAttributeObjects()
      : [...this.loadedAttributeObjects(), ...this.allAttributeObjects()];
    for (const item of source) {
      const dedupKey = item.id ? `id:${item.id}` : `n:${(item.attribute_name || '').toLowerCase()}`;
      if (!item.attribute_name || seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      result.push(item.attribute_name);
    }
    return result;
  });

  private readonly _stableAttrValueOptionsMap = computed((): Map<string, string[]> => {
    const seen = new Set<string>();
    const map = new Map<string, string[]>();
    const source = this.loadedAttributeReady()
      ? this.loadedAttributeObjects()
      : [...this.loadedAttributeObjects(), ...this.allAttributeObjects()];
    for (const item of source) {
      const nameKey = (item.attribute_name || '').toLowerCase().trim();
      if (!nameKey || seen.has(nameKey)) continue;
      seen.add(nameKey);
      let values = this.attributePossibleValueTokens(item.possible_values);
      if (!values.length) {
        const typeKey = (item.attribute_type || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
        if (typeKey.includes('yesno') || typeKey.includes('boolean')) values = ['Yes', 'No'];
      }
      map.set(nameKey, values);
    }
    return map;
  });

  private readonly loadedVariantObjects = signal<VariantItem[]>([]);
  protected readonly loadedProductObjects = signal<ProductItem[]>([]);
  private readonly loadedVendorObjects = signal<VendorItem[]>([]);
  private readonly loadedCustomerObjects = signal<CustomerItem[]>([]);
  private readonly customerOptionList = signal<string[]>([]);
  private readonly loadedWarehouseObjects = signal<WarehouseItem[]>([]);
  protected readonly loadedBranchObjects = signal<BranchInvItem[]>([]);
  private readonly loadedPaymentTermObjects = signal<PaymentTermItem[]>([]);
  private readonly loadedProductTypeObjects = signal<ProductTypeItem[]>([]);
  get productNatureObjects(): ProductTypeItem[] { return this.loadedProductTypeObjects(); }
  readonly statusOptions = INVENTORY_OPTIONS.status;
  readonly locationOptions = INVENTORY_OPTIONS.locations;
  readonly contactOptions = INVENTORY_OPTIONS.contactPersons;
  private readonly _productTypeOptions = signal<string[]>([]);
  get productTypeOptions(): string[] { return this._productTypeOptions(); }
  readonly valuationMethods = INVENTORY_OPTIONS.valuationMethods;
  readonly pricingTypeOptions = INVENTORY_OPTIONS.pricingTypes;
  readonly rentalUnitOptions = INVENTORY_OPTIONS.rentalUnits;
  readonly hsnSourceOptions = ['Government API', 'Ready API', 'Manual Entry'];
  readonly partyTypeOptions = ['Company', 'Individual'];

  get segmentOptions(): string[] { return this.segmentOptionList(); }
  get segmentCount(): number { return this.segmentOptions.length; }
  get currentSegmentId(): number | null { return this.selectedSegmentId(); }
  get categoryOptions(): string[] { return this.categoryOptionList(); }
  get categoryCodes(): string[] {
    return this.loadedCategoryObjects()
      .map(item => item.category_code)
      .filter((code): code is string => !!code);
  }
  get uomOptions(): string[] { return this.uomOptionList(); }
  get hsnSacOptions(): string[] { return this.hsnSacOptionList(); }
  get brandOptions(): string[] { return this.brandOptionList(); }
  get manufacturerOptions(): string[] { return this.manufacturerOptionList(); }
  get taxCategoryOptions(): string[] { return this.taxCategoryOptionList(); }
  get attributeOptions(): string[] { return this._stableAttrNameOptions(); }
  get variantOptions(): string[] { return this.variantOptionList(); }
  // Stable computed — same array reference until loadedVariantObjects changes; prevents ng-select from resetting on every render cycle
  readonly variantObjects = computed(() =>
    this.loadedVariantObjects().map(v => ({
      ...v,
      variant_label: this.variantDisplayLabel(v)
    }))
  );

  readonly selectedVariantItemsForPicker = computed(() => {
    const selectedIds = new Set(this.selectedApplicableVariants().map(av => av.id));
    return this.variantObjects().filter(v => selectedIds.has(v.id));
  });

  // ID-array binding used by ng-select with bindValue="id" + groupBy (avoids compareWith conflicts)
  readonly selectedApplicableVariantIds = computed(() =>
    this.selectedApplicableVariants().map(av => av.id)
  );

  onApplicableVariantIdsChange(ids: number[] | null): void {
    const previousById = new Map(this.selectedApplicableVariants().map(av => [av.id, av]));
    const idSet = new Set(ids || []);
    const selected = this.variantObjects()
      .filter(v => idSet.has(v.id))
      .map(v => ({
        id: v.id,
        variant_name: v.variant_name,
        variant_label: this.variantDisplayLabel(v),
        is_default: !!previousById.get(v.id)?.is_default,
      } as ProductApplicableVariant));
    this.applyApplicableVariantSelection(selected);
  }

  readonly selectedApplicableVariantRows = computed(() => {
    return this.selectedApplicableVariants().map(variant => {
      const master = this.findVariantById(variant.id);
      const normalized = this.normalizedApplicableVariant(variant);
      const attribute_items = master
        ? this.variantAttributeItemList(master)
        : this.variantLabelAttributeItemList(normalized.variant_label, normalized.variant_name);
      return {
        ...normalized,
        attribute_items,
        attribute_summary: attribute_items.map(a => a.value ? `${a.name}: ${a.value}` : a.name).join(', ')
      };
    });
  });

  // User-managed list of stock-control rows. Each row is a specific
  // combination of attribute values picked for one variant (e.g. Model=Xm
  // AND Color=Black together) — built explicitly via the combination picker
  // below rather than auto-flattened, since not every attribute-value
  // combination is necessarily stocked.
  readonly variantStockCombinationRows = signal<ProductVariantStockControl[]>([]);
  // Per-variant in-progress picks for the combination builder: variantId ->
  // attributeName -> currently selected value (not yet added as a row).
  readonly pendingCombinationPicks = signal<Record<number, Record<string, string>>>({});
  readonly pendingCombinationVariantId = signal<number | null>(null);

  readonly effectivePendingCombinationVariantId = computed(() => {
    const variants = this.selectedApplicableVariantRows();
    const selectedId = this.pendingCombinationVariantId();
    if (selectedId && variants.some(variant => variant.id === selectedId)) return selectedId;
    return variants[0]?.id ?? null;
  });

  readonly pendingVariantAttributeDimensions = computed(() => {
    const variantId = this.effectivePendingCombinationVariantId();
    return variantId ? this.variantAttributeDimensions(variantId) : [];
  });

  // True whenever the combination builder/grid is relevant: any selected
  // variant needs its own stock row, even if it has no attribute dimensions.
  readonly variantStockControlsVisible = computed(() => {
    return this.selectedApplicableVariantRows().length > 0 || this.variantStockCombinationRows().length > 0;
  });

  // Distinct attribute dimensions for one variant, e.g.
  // [{ name: 'Model', values: ['Xm','Xms','Za'] }, { name: 'Color', values: [...] }]
  variantAttributeDimensions(variantId: number): { name: string; values: string[] }[] {
    const variant = this.selectedApplicableVariantRows().find(v => v.id === variantId);
    const master = this.findVariantById(variantId);
    const items = variant?.attribute_items || [];
    const byName = new Map<string, string[]>();
    const addValues = (name: string, incoming: any): void => {
      const key = String(name || '').trim();
      if (!key) return;
      const values = byName.get(key) ?? [];
      for (const value of this.attributePossibleValueTokens(incoming)) {
        if (value && !values.includes(value)) values.push(value);
      }
      byName.set(key, values);
    };
    for (const item of items) {
      if (!item.name) continue;
      addValues(item.name, item.value);
      addValues(item.name, this._stableAttrValueOptionsMap().get(item.name.toLowerCase().trim()) ?? []);
    }
    for (const attr of master?.attributes || []) {
      const name = String(attr.attribute_name || '').trim();
      if (!name) continue;
      addValues(name, attr.attribute_value);
      addValues(name, attr.possible_values);
      if ((attr.attribute_type || '').toLowerCase() === 'yes/no') addValues(name, ['Yes', 'No']);
    }
    return Array.from(byName.entries()).map(([name, values]) => ({ name, values }));
  }

  setPendingCombinationVariant(variantId: number | null): void {
    const numericId = Number(variantId);
    this.pendingCombinationVariantId.set(Number.isFinite(numericId) && numericId > 0 ? numericId : null);
    this.saveError.set('');
  }

  setPendingCombinationPick(variantId: number, attributeName: string, value: any): void {
    const pickedValue = String(value ?? '').trim();
    this.pendingCombinationPicks.update(map => {
      const current = { ...(map[variantId] ?? {}) };
      if (pickedValue) current[attributeName] = pickedValue; else delete current[attributeName];
      return { ...map, [variantId]: current };
    });
    this.saveError.set('');
  }

  setPendingActiveCombinationPick(attributeName: string, value: any): void {
    const variantId = this.effectivePendingCombinationVariantId();
    if (!variantId) return;
    this.setPendingCombinationPick(variantId, attributeName, value);
  }

  private sameVariantStockCombination(a: ProductVariantStockControl, variantId: number, attributes: ProductVariantStockAttribute[]): boolean {
    if (a.variant_id !== variantId) return false;
    const existingAttributes = a.attributes || [];
    if (existingAttributes.length !== attributes.length) return false;
    const sortedA = [...existingAttributes].sort((x, y) => x.attribute_name.localeCompare(y.attribute_name));
    const sortedB = [...attributes].sort((x, y) => x.attribute_name.localeCompare(y.attribute_name));
    return sortedA.every((attr, i) => attr.attribute_name === sortedB[i].attribute_name && attr.attribute_value === sortedB[i].attribute_value);
  }

  addPendingVariantStockCombination(): void {
    const variantId = this.effectivePendingCombinationVariantId();
    if (!variantId) {
      this.saveError.set('Select an applicable variant before adding stock controls.');
      return;
    }
    this.addVariantStockCombination(variantId);
  }

  addVariantStockCombination(variantId: number): void {
    const variant = this.selectedApplicableVariantRows().find(v => v.id === variantId);
    if (!variant) return;
    const dimensions = this.variantAttributeDimensions(variantId);
    const picks = this.pendingCombinationPicks()[variantId] ?? {};
    const attributes: ProductVariantStockAttribute[] = dimensions
      .filter(dim => picks[dim.name])
      .map(dim => ({ attribute_name: dim.name, attribute_value: picks[dim.name] }));

    if (dimensions.length > 0 && attributes.length !== dimensions.length) {
      this.saveError.set('Select a value for every attribute before adding this combination.');
      return;
    }
    if (this.variantStockCombinationRows().some(row => this.sameVariantStockCombination(row, variantId, attributes))) {
      this.saveError.set('This exact combination has already been added.');
      return;
    }

    this.variantStockCombinationRows.update(rows => [...rows, {
      variant_id: variantId,
      variant_name: variant.variant_name,
      variant_label: variant.variant_label,
      attributes,
      min_stock_level: 0,
      max_stock_level: 0,
      reorder_level: 0,
      reorder_qty: 0,
    }]);
    this.pendingCombinationPicks.update(map => ({ ...map, [variantId]: {} }));
    this.saveError.set('');
  }

  removeVariantStockCombinationRow(index: number): void {
    this.variantStockCombinationRows.update(rows => rows.filter((_, i) => i !== index));
  }

  setVariantStockCombinationField(index: number, field: 'min_stock_level' | 'max_stock_level' | 'reorder_level' | 'reorder_qty', value: any): void {
    const numeric = Number(value) || 0;
    this.variantStockCombinationRows.update(rows => rows.map((row, i) => i === index ? { ...row, [field]: numeric } : row));
  }

  variantStockCombinationLabel(row: ProductVariantStockControl): string {
    return (row.attributes || []).map(a => `${a.attribute_name}: ${a.attribute_value}`).join(', ');
  }

  onApplicableVariantsChange(items: VariantItem[] | null): void {
    const previousById = new Map(this.selectedApplicableVariants().map(variant => [variant.id, variant]));
    const selected = (items || []).map(v => ({
      id: v.id,
      variant_name: v.variant_name,
      variant_label: this.variantDisplayLabel(v),
      is_default: !!previousById.get(v.id)?.is_default,
    } as ProductApplicableVariant));
    this.applyApplicableVariantSelection(selected);
  }

  setDefaultApplicableVariant(variantId: number): void {
    this.applyApplicableVariantSelection(
      this.selectedApplicableVariants().map(variant => ({
        ...variant,
        is_default: variant.id === variantId
      }))
    );
  }

  removeApplicableVariant(variantId: number): void {
    this.applyApplicableVariantSelection(
      this.selectedApplicableVariants().filter(variant => variant.id !== variantId)
    );
  }

  addBundleCompositionRow(): void {
    this.bundleCompositionItems.update(rows => [
      ...rows,
      { item_id: 0, item_name: '', quantity: 1, condition_tracked: false, depreciation_linked: false }
    ]);
  }

  removeBundleCompositionRow(index: number): void {
    this.bundleCompositionItems.update(rows => rows.filter((_, i) => i !== index));
  }

  updateBundleCompositionRow(index: number, patch: Partial<ProductBundleItem>): void {
    this.bundleCompositionItems.update(rows =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  onBundleCompositionItemChange(index: number, item: ProductItem | null): void {
    this.updateBundleCompositionRow(index, {
      item_id: item?.id ?? 0,
      item_name: item?.product_name ?? ''
    });
  }

  get productOptions(): string[] { return this.productOptionList(); }
  protected productNamesForTransaction(key = this.config?.key || ''): string[] {
    return this.loadedProductObjects()
      .filter(product => this.productAllowedForTransaction(product, key))
      .map(p => p.product_name)
      .filter(Boolean) as string[];
  }
  get salesEligibleProductOptions(): string[] {
    return this.productNamesForTransaction('salesInvoice');
  }
  get vendorOptions(): string[] { return this.vendorOptionList(); }
  get customerOptions(): string[] { return this.customerOptionList(); }
  get warehouseOptions(): string[] { return this.warehouseOptionList(); }
  get branchOptions(): string[] { return this.branchOptionList(); }
  get paymentTermOptions(): string[] { return this.paymentTermOptionList(); }
  get serialPolicyOptions(): string[] { return this.serialPolicyOptionList(); }
  get batchPolicyOptions(): string[] { return this.batchPolicyOptionList(); }
  get segments() { return this.segmentCardList(); }

  readonly globalContacts: GlobalContactOption[] = [
    {
      name: 'ElectroMart Supplies Pvt Ltd',
      type: 'Company',
      mobile: '9876543201',
      email: 'purchase@electromart.example',
      gstin: '36ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      address: 'Hyderabad Industrial Estate, Telangana'
    },
    {
      name: 'Tenant Works Pvt Ltd',
      type: 'Company',
      mobile: '9876543202',
      email: 'accounts@tenantworks.example',
      gstin: '29PQRSX2211K1Z9',
      pan: 'PQRSX2211K',
      address: 'MG Road, Bengaluru, Karnataka'
    },
    {
      name: 'Rajesh Kumar',
      type: 'Individual',
      mobile: '9876543210',
      email: 'rajesh.kumar@example.com',
      gstin: '',
      pan: 'ABCDE4321P',
      address: 'Madhapur, Hyderabad'
    },
    {
      name: 'Priya Sharma',
      type: 'Individual',
      mobile: '9876543211',
      email: 'priya.sharma@example.com',
      gstin: '',
      pan: 'PQRSX4321P',
      address: 'Indiranagar, Bengaluru'
    },
    {
      name: 'Fresh Foods Distributor',
      type: 'Company',
      mobile: '9876543203',
      email: 'orders@freshfoods.example',
      gstin: '36FOODX4400F1Z6',
      pan: 'FOODX4400F',
      address: 'Food Park, Hyderabad'
    }
  ];
  readonly defaultCategorySelections: string[] = [];
  readonly defaultUomSelections: string[] = [];
  readonly defaultHsnSacSelections: string[] = [];
  private readonly fieldDefaultValues = new Map<string, string | string[] | undefined>();
  private transactionReferenceRequestKey = '';
  readonly categorySuggestionRows = [
    ['Computers & Devices', 'Similar to Electronics, Laptop, Printer'],
    ['Mobile & Accessories', 'Similar to Mobile, Accessory, Charger'],
    ['IT Services', 'Similar to AMC, Support, Implementation']
  ];
  readonly hsnLookupRows = [
    ['8471', 'Computers and data processing machines', '18%', '9%', '9%', '18%', '0%', '01-Apr-2025', 'Active'],
    ['998313', 'Information technology consulting and support', '18%', '9%', '9%', '18%', '0%', '01-Apr-2025', 'Active'],
    ['996331', 'Restaurant and food serving services', '5%', '2.5%', '2.5%', '5%', '0%', '01-Apr-2025', 'Active'],
    ['996332', 'Hotel accommodation services', '12%', '6%', '6%', '12%', '0%', '01-Apr-2025', 'Active']
  ];
  readonly branchAccessOptions = [
    { name: 'Sales Unit', suitableFor: 'Showrooms, retail outlets, distributors' },
    { name: 'Procurement & Sales Unit', suitableFor: 'Trading businesses' },
    { name: 'Consumption Unit', suitableFor: 'Internal usage, projects, maintenance' },
    { name: 'Operations Unit', suitableFor: 'Procurement + Consumption' },
    { name: 'Production Unit', suitableFor: 'Manufacturing, fabrication, assembly' },
    { name: 'Service Unit', suitableFor: 'IT, coworking, consulting businesses' },
    { name: 'Project Unit', suitableFor: 'Real estate layouts, construction, infra projects' }
  ];
  readonly dashboard = computed(() => {
    const segment = this.selectedSegment();
    return INVENTORY_SEGMENT_DASHBOARDS[segment] ?? INVENTORY_SEGMENT_DASHBOARDS['Electronics'];
  });

  constructor() {
    effect(() => {
      const segment = this.selectedSegment();
      untracked(() => this.onSelectedSegmentChanged(segment));
    });

    // Heal pending backward-compat variant when loadedVariantObjects arrives after editRecordByRow
    effect(() => {
      const pending = this.pendingVariantResolve();
      if (!pending) return;
      const variants = this.loadedVariantObjects();
      if (!variants.length) return;
      const match = variants.find(v =>
        this.variantDisplayLabel(v) === pending.label || v.variant_name === pending.name
      );
      if (match) {
        untracked(() => {
          this.pendingVariantResolve.set(null);
          this.applyApplicableVariantSelection([{
            id: match.id,
            variant_name: match.variant_name,
            variant_label: this.variantDisplayLabel(match),
            is_default: true,
          }]);
        });
      }
    });

    this.referenceDataTrayService.referenceBind$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.applyReferenceBinding(event));

    this.taxCodeSearch$
      .pipe(
        debounceTime(300),
        map(request => ({
          query: request.query.trim(),
          category: request.category.trim(),
          autoPick: request.autoPick
        })),
        distinctUntilChanged((a, b) => a.query === b.query && a.category === b.category && a.autoPick === b.autoPick),
        switchMap(request => {
          const searchTerm = request.query.length >= 2 ? request.query : request.category;
          if (searchTerm.length < 2) {
            this.taxCodeSuggesting.set(false);
            this.taxCodeSuggestions.set([]);
            this.taxCodeSearchMessage.set('');
            return of({ res: { success: true, message: 'Minimum search length not reached.', data: [] as TaxCodeSuggestion[] }, autoPick: false });
          }

          this.taxCodeSuggesting.set(true);
          this.taxCodeSearchMessage.set('');
          return this.inventoryConfigService.searchTaxCodes(searchTerm, '', 10, request.autoPick ? request.category : undefined).pipe(
            map(res => ({ res, autoPick: request.autoPick })),
            catchError(() => of({ res: { success: false, message: 'Unable to search local HSN/SAC data.', data: [] as TaxCodeSuggestion[] }, autoPick: false }))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ res, autoPick }) => {
        this.taxCodeSuggesting.set(false);
        const suggestions = res.data ?? [];
        this.taxCodeSuggestions.set(suggestions);
        const hasSearchText = this.productName().trim().length >= 2 || this.hsnSacCode().trim().length >= 2;
        if (autoPick && suggestions.length) {
          this.selectTaxCodeSuggestion(suggestions[0], false);
          this.taxCodeSearchMessage.set(`Auto picked ${suggestions[0].code} from category hint. Verify before saving.`);
          return;
        }

        this.taxCodeSearchMessage.set((res.data?.length || !hasSearchText) ? '' : (res.message || 'No matching local HSN/SAC code found.'));
      });
  }

  ngOnInit(): void {
    const token = sessionStorage.getItem('token') || sessionStorage.getItem('jwt') || sessionStorage.getItem('access_token') || localStorage.getItem('token') || '';
    if (token) {
      try {
        const jwtPayload = JSON.parse(atob(token.split('.')[1]));
        const role: any = jwtPayload?.role || jwtPayload?.roles || jwtPayload?.userRole || '';
        const roleStr = Array.isArray(role) ? role.join(',') : String(role);
        this.isAdmin.set(roleStr.toLowerCase().includes('admin'));
      } catch { this.isAdmin.set(true); }
    } else {
      this.isAdmin.set(true); // dev fallback — no token means dev mode
    }
    this.loadLookupOptions();

    if (this.config?.key === 'productServiceMaster') {
      this.productTaxUomRequired.set(true);
      if (this.selectedProductCategory()) {
        this.queueTaxCodeSearch(true);
      }
    }

    if (this.config?.lineColumns?.length) {
      this.directEntryLineRows();
    }
    if (this.isApiWired()) {
      this.loadApiRecords();
    }
    if (this.showTransactionHeader()) {
      this.loadTransactionReferenceDocs();
    }
    if (this.config?.key === 'productServiceMaster' || this.config?.key === 'hsnSacMapping') {
      this.loadTaxCodeSourceStatus();
      this.loadGstGuide();
    }
  }

  @HostListener('window:inventory-barcode-scan', ['$event'])
  onInventoryBarcodeScan(event: Event): void {
    const detail = (event as CustomEvent<{ code?: string }>).detail;
    this.addScannedItem(detail?.code || '');
  }

  @HostListener('click', ['$event'])
  onShellClick(event: MouseEvent): void {
    if (!this.isApiWired()) return;

    const target = event.target as HTMLElement | null;
    const button = target?.closest('button') as HTMLButtonElement | null;
    if (!button || button.closest('.inventory-modal')) return;

    const text = (button.textContent || '').trim().replace(/\s+/g, ' ');
    const title = button.getAttribute('title') || '';
    const dataAction = button.getAttribute('data-action') || '';
    const dataIndex = button.getAttribute('data-index');

    // Pending grid — remove row
    if (title === 'Remove' || dataAction === 'remove-pending') {
      event.preventDefault();
      const idx = dataIndex !== null ? Number(dataIndex) : -1;
      if (idx >= 0) this.removePendingRow(idx);
      return;
    }

    // Edit — pending vs live grid
    if (title === 'Edit' || dataAction === 'edit-pending') {
      const isPending = dataAction === 'edit-pending' || !!button.closest('.inventory-current-entries');
      if (isPending) {
        event.preventDefault();
        const idx = dataIndex !== null ? Number(dataIndex) : -1;
        if (idx >= 0) this.editPendingRow(idx);
      } else {
        const row = button.closest('tr');
        if (!row) return;
        const cells = Array.from(row.querySelectorAll('td'))
          .slice(1)
          .map(cell => (cell.textContent || '').trim());
        if (cells.length) {
          event.preventDefault();
          this.editRecordByRow(cells);
        }
      }
      return;
    }

    if (text === 'Clear' || text === 'Cancel') {
      event.preventDefault();
      this.editingPendingIndex.set(null);
      this.clearConfigForm();
      return;
    }

    // "Add" in the form — push to pending grid, except screens/edits that save directly
    if (text === 'Add' || text === 'Add to List' || text === 'Save UOM' || text === 'Update UOM' || text === 'Save Product' || text === 'Update Product' || text === 'Update Mapping' || text === 'Update') {
      const isFormAction = !!button.closest('.inventory-form-actions') && !button.closest('.inventory-final-actions');
      if (isFormAction) {
        event.preventDefault();
        if (this.config?.key === 'uomMaster' || this.config?.key === 'productServiceMaster' || this.editingId() !== null) {
          this.saveConfigRecord();
        } else {
          this.addToPendingRows();
        }
      }
      return;
    }

    // "Save" / "Save All" in the final actions — batch save
    if (text === 'Save' || text === 'Save All') {
      const isFinalAction = !!button.closest('.inventory-final-actions');
      if (isFinalAction) {
        event.preventDefault();
        this.savePendingBatch();
      }
      return;
    }
  }

  readonly partySummaryData = computed<PartySummaryData | null>(() => {
    const name = this.selectedPartyName();
    if (!name) return null;
    return {
      name,
      creditLimit: '',
      creditUsed: '',
      creditAvailable: '',
      overdueAmount: '',
      lastTransactionDate: '',
      lastTransactionAmount: '',
      recentTransactions: []
    };
  });

  toggleAdvicePanel(): void {
    this.advicePanelOpen.update(open => !open);
  }

  togglePartySummary(): void {
    this.partySummaryOpen.update(open => !open);
  }

  openPartySummary(partyName: string): void {
    this.selectedPartyName.set(partyName);
    this.partySummaryOpen.set(true);
  }

  closePartySummary(): void {
    this.partySummaryOpen.set(false);
  }

  onProductNameChange(value: string): void {
    const name = toInventoryTitleCase(value ?? '');
    this.productName.set(name);
    if (!name || !name.trim()) {
      if (this.editingId() !== null || this.editingPendingIndex() !== null) {
        // Editing a saved/pending record — name cleared means user wants a fresh form.
        this.clearConfigForm();
      } else {
        // Fresh entry — only clear auto-generated code/SKU.
        if (this.productCodeIsAuto()) { this.collectFormField('productCode', ''); }
        if (this.skuIsAuto()) { this.collectFormField('sku', ''); }
      }
      return;
    }
    if (this.editingId() !== null) return;
    if (!this.formValues()['productCode'] || this.productCodeIsAuto()) {
      const c = this.generateCodeFromName(name);
      if (c) { this.collectFormField('productCode', c); this.productCodeIsAuto.set(true); }
    }
    if (!this.formValues()['sku'] || this.skuIsAuto()) {
      const cat     = this.selectedProductCategory() || undefined;
      const brand   = this.formValues()['brand'] as string || undefined;
      const variant = this.formValues()['variant'] as string || undefined;
      const s = this.generateSku(name, cat, brand, variant);
      if (s) { this.collectFormField('sku', s); this.skuIsAuto.set(true); }
    }
  }

  onProductTypeChange(type: string | null): void {
    this.collectFormField('productType', type);
  }

  private static readonly PRICING_TYPE_NATURES = new Set(['Service', 'Service Bundle', 'Digital / Subscription']);

  onProductNatureChange(natureId: number | null): void {
    const nature = this.productNatureObjects.find(n => n.id === natureId) ?? null;
    this.collectFormField('productNatureId', natureId);
    this.collectFormField('productNatureName', nature?.type_name ?? null);
    this.collectFormField('productType', nature?.type_name ?? null);
    if (nature && nature.tracks_inventory === false) {
      this.productStockControlsRequired.set(false);
      this.productTrackingRequired.set(false);
    }
    if (!nature || !InventoryScreenShell.PRICING_TYPE_NATURES.has(nature.type_name)) {
      this.collectFormField('pricingType', null);
      this.collectFormField('rentalUnit', null);
    }
    if (!nature || nature.type_name !== 'Service Bundle') {
      this.bundleCompositionRequired.set(false);
      this.bundleCompositionItems.set([]);
    }
  }

  onPricingTypeChange(pricingType: string | null): void {
    this.collectFormField('pricingType', pricingType);
    if (pricingType !== 'Rental') {
      this.collectFormField('rentalUnit', null);
    }
  }

  onProductCodeManualEdit(code: string): void {
    this.collectFormField('productCode', code);
    this.productCodeIsAuto.set(false);
  }

  onSkuManualEdit(sku: string): void {
    this.collectFormField('sku', sku);
    this.skuIsAuto.set(false);
  }

  onProductCategoryChange(value: string | null): void {
    this.selectedProductCategory.set(value || '');

    if (!value) {
      this.productSerialApplicable.set(false);
      this.productBatchApplicable.set(false);
      this.collectFormField('serialPolicyName', null);
      this.collectFormField('batchPolicyName', null);
      if (this.editingId() === null && this.skuIsAuto()) {
        const brand   = this.formValues()['brand'] as string || undefined;
        const variant = this.formValues()['variant'] as string || undefined;
        const s = this.generateSku(this.productName(), undefined, brand, variant);
        this.collectFormField('sku', s || '');
      }
      return;
    }

    const cat = this.loadedCategoryObjects().find(c => this.optionEquals(c.category_name, value));
    if (cat) {
      if (cat.serial_applicable) {
        this.productSerialApplicable.set(true);
        if (cat.serial_policy_name) {
          this.collectFormField('serialPolicyName', cat.serial_policy_name);
        }
      } else {
        this.productSerialApplicable.set(false);
        this.collectFormField('serialPolicyName', null);
      }
      if (cat.batch_applicable) {
        this.productBatchApplicable.set(true);
        if (cat.batch_policy_name) {
          this.collectFormField('batchPolicyName', cat.batch_policy_name);
        }
      } else {
        this.productBatchApplicable.set(false);
        this.collectFormField('batchPolicyName', null);
      }
      if (cat.serial_applicable || cat.batch_applicable) {
        this.productTrackingRequired.set(true);
      }
    }

    const currentBaseUom = String(this.formValues()['baseUom'] || '').trim();
    if (currentBaseUom && !this.productBaseUomOptions().some(option => this.optionEquals(option, currentBaseUom))) {
      this.collectFormField('baseUom', null);
    }

    if (this.editingId() === null && (!this.formValues()['sku'] || this.skuIsAuto())) {
      const brand   = this.formValues()['brand'] as string || undefined;
      const variant = this.formValues()['variant'] as string || undefined;
      const s = this.generateSku(this.productName(), value, brand, variant);
      if (s) { this.collectFormField('sku', s); this.skuIsAuto.set(true); }
    }
  }

  onBrandChange(brand: string | null): void {
    this.collectFormField('brand', brand);
    if (this.editingId() !== null) return;
    if (!this.formValues()['sku'] || this.skuIsAuto()) {
      const cat     = this.selectedProductCategory() || undefined;
      const variant = this.formValues()['variant'] as string || undefined;
      const s = this.generateSku(this.productName(), cat, brand || undefined, variant);
      if (s) { this.collectFormField('sku', s); this.skuIsAuto.set(true); }
    }
  }

  onVariantChange(variant: string | null): void {
    this.collectFormField('variant', variant);
    if (this.editingId() !== null) return;
    if (!this.formValues()['sku'] || this.skuIsAuto()) {
      const cat   = this.selectedProductCategory() || undefined;
      const brand = this.formValues()['brand'] as string || undefined;
      const s = this.generateSku(this.productName(), cat, brand, this.variantNameFromSelection(variant || undefined) || undefined);
      if (s) { this.collectFormField('sku', s); this.skuIsAuto.set(true); }
    }
  }

  onBatchPolicyChange(value: string | null): void {
    this.collectFormField('batchPolicyName', value);
    if (value) {
      this.productBatchApplicable.set(true);
      this.productTrackingRequired.set(true);
    }
  }

  onSerialPolicyChange(value: string | null): void {
    this.collectFormField('serialPolicyName', value);
    if (value) {
      this.productSerialApplicable.set(true);
      this.productTrackingRequired.set(true);
    }
  }

  onTaxCodeManualSearch(value: string): void {
    const code = String(applyInventoryTextCase(value ?? '', 'upper')).trim();
    this.hsnSacCode.set(code);
    if (code && !this.hsnSacOptionList().some(o => o.toLowerCase() === code.toLowerCase())) {
      this.hsnSacOptionList.update(opts => [...opts, code]);
    }
    const match = this.loadedHsnSacObjects().find(item => this.optionEquals(item.code, code));
    if (match) {
      this.hsnSacDescription.set(match.description || '');
      this.gstRate.set(match.gst_rate ?? null);
    }
    this.queueTaxCodeSearch(false);
  }

  onTaxDescriptionChange(value: string): void {
    this.hsnSacDescription.set(String(applyInventoryTextCase(value ?? '', 'sentence')));
  }

  onGstRateChange(value: string | number | null): void {
    const numeric = Number(value);
    this.gstRate.set(Number.isFinite(numeric) ? numeric : null);
  }

  selectTaxCodeSuggestion(item: TaxCodeSuggestion, clearSuggestions = true): void {
    this.selectedTaxCodeSuggestion.set(item);
    this.hsnSacCode.set(item.code);
    this.hsnSacDescription.set(item.description || '');
    this.gstRate.set(item.gst_rate ?? null);
    this.selectedTaxSource.set(item.source || this.selectedTaxSource());
    this.taxSourceUpdatedAt.set(item.source_updated_at || this.taxSourceUpdatedAt());
    if (item.category && !this.selectedProductCategory()) {
      this.selectedProductCategory.set(item.category);
      this.collectFormField('category', item.category);
    }
    if (clearSuggestions) {
      this.taxCodeSuggestions.set([]);
    }
    this.taxCodeSearchMessage.set('');
  }

  taxRateLabel(rate: number | null | undefined): string {
    return rate === null || rate === undefined ? 'GST not mapped' : `${rate}% GST`;
  }

  taxCodeSourceLabel(): string {
    const source = this.selectedTaxSource();
    const updatedAt = this.taxSourceUpdatedAt();
    if (!source && !updatedAt) {
      return 'No imported source available';
    }

    return `${source || 'Imported source'}${updatedAt ? `, updated ${this.formatDateLabel(updatedAt)}` : ''}`;
  }

  loadTaxCodeSourceStatus(): void {
    this.inventoryConfigService.getTaxCodeSourceStatus().subscribe({
      next: res => {
        const status = res.data;
        this.selectedTaxSource.set(status?.source || '');
        this.taxSourceUpdatedAt.set(status?.source_updated_at || null);
      },
      error: () => {
        this.selectedTaxSource.set('');
        this.taxSourceUpdatedAt.set(null);
      }
    });
  }

  loadGstGuide(): void {
    this.gstGuideLoading.set(true);
    this.inventoryConfigService.getGstGuide().subscribe({
      next: res => {
        this.gstGuide.set(res.data ?? null);
        this.gstGuideLoading.set(false);
      },
      error: () => {
        this.gstGuide.set(null);
        this.gstGuideLoading.set(false);
      }
    });
  }

  selectedTaxHint(): string {
    const selected = this.selectedTaxCodeSuggestion();
    if (!selected) {
      return 'Select a product/category or type at least two characters to get HSN/SAC hints.';
    }

    return [
      selected.category ? `Category: ${selected.category}` : '',
      selected.remarks ? `Instruction: ${selected.remarks}` : '',
      selected.gst_guide_label ? `GST guide: ${selected.gst_guide_label}` : ''
    ].filter(Boolean).join(' | ');
  }

  selectedGstGuideText(): string {
    const selected = this.selectedTaxCodeSuggestion();
    if (selected?.gst_guide_description || selected?.gst_guide_notes) {
      return [selected.gst_guide_description, selected.gst_guide_notes].filter(Boolean).join(' ');
    }

    const rate = this.gstRate();
    const guide = this.gstGuide()?.slabs.find(item => Number(item.rate) === Number(rate));
    return guide ? [guide.description, guide.notes].filter(Boolean).join(' ') : '';
  }

  gstGuidePreviewRows() {
    return (this.gstGuide()?.slabs || []).slice(0, 6);
  }

  private normalizeKey(value: any): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private normalizeFormFieldTextCase(key: string, value: any): any {
    const field = this.config?.fields?.find(item => item.key === key);
    const textCase = inventoryTextCaseForField(key, field?.label || this.labelFromKey(key), field?.type || 'text');
    return applyInventoryTextCase(value, textCase);
  }

  private normalizeLineCellTextCase(column: string, value: any): any {
    return applyInventoryTextCase(value, inventoryTextCaseForLineColumn(column));
  }

  private parseDecimalNumber(value: any): number {
    const text = String(value ?? '').trim();
    if (!text) return NaN;
    const normalized = text.replace(/,/g, '').replace(/\s+/g, '');
    if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return NaN;
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : NaN;
  }

  private sanitizeDecimalInput(value: any): string {
    const text = String(value ?? '').replace(/,/g, '').replace(/\s+/g, '');
    let sanitized = '';
    let hasDot = false;
    for (const char of text) {
      if (char >= '0' && char <= '9') {
        sanitized += char;
      } else if (char === '.' && !hasDot) {
        sanitized += char;
        hasDot = true;
      }
    }
    return sanitized;
  }

  private optionEquals(a: any, b: any): boolean {
    return this.normalizeKey(a) === this.normalizeKey(b);
  }

  readonly compareById = (a: any, b: any): boolean => a?.id === b?.id;

  protected apiErrorMessage(err: any, fallback: string): string {
    const body = err?.error;
    const fromValidationErrors = (errors: any): string => {
      if (!errors || typeof errors !== 'object') return '';
      const messages: string[] = [];
      Object.entries(errors).forEach(([field, value]) => {
        const parts = Array.isArray(value) ? value : [value];
        const text = parts.map(part => String(part ?? '').trim()).filter(Boolean).join(' ');
        if (text) messages.push(field ? `${field}: ${text}` : text);
      });
      return messages.join(' ');
    };

    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        return fromValidationErrors(parsed?.errors)
          || parsed?.message
          || parsed?.error
          || parsed?.detail
          || parsed?.title
          || body
          || fallback;
      } catch {
        return body || fallback;
      }
    }

    const message = fromValidationErrors(body?.errors)
      || body?.message
      || body?.error
      || body?.detail
      || body?.title;
    if (message) return message;

    const httpMessage = String(err?.message || '').trim();
    return httpMessage && !httpMessage.startsWith('Http failure response')
      ? httpMessage
      : fallback;
  }

  private selectedSegmentObject(): SegmentItem | null {
    const selected = this.selectedSegment();
    if (!selected) return null;
    return this.loadedSegmentObjects().find(
      item => this.optionEquals(item.segment_name, selected)
    ) ?? null;
  }

  private selectedSegmentId(): number | null {
    return this.selectedSegmentObject()?.id ?? null;
  }

  private segmentIdByName(segmentName: string | null | undefined): number | null {
    if (!segmentName) return null;
    const seg = this.loadedSegmentObjects().find(item => this.optionEquals(item.segment_name, segmentName));
    return seg?.id ?? null;
  }

  private refreshSegmentScopedOptions(): void {
    const seg = this.selectedSegmentObject();
    if (!seg) return;
    const cats = (seg?.categories?.map((c: any) => c.category_name) ?? []).filter(Boolean) as string[];
    const uoms = (seg?.uoms?.map((u: any) => u.uom_symbol || u.uom_name || u.uom_code) ?? []).filter(Boolean) as string[];
    const hsns = (seg?.hsn_sac_codes?.map((h: any) => h.code) ?? []).filter(Boolean) as string[];
    this.categoryOptionList.set(cats);
    this.uomOptionList.set(uoms);
    this.hsnSacOptionList.set(hsns);
  }

  private onSelectedSegmentChanged(segment: string): void {
    if (!segment || !this.config?.key) return;
    this.clearConfigForm();
    this.formValues.update(values => ({ ...values, segment }));
    this.refreshSegmentScopedOptions();
    this.loadSegmentScopedLookups();
    if (this.isApiWired()) {
      this.loadApiRecords();
    }
    this.transactionReferenceRequestKey = '';
    this.loadTransactionReferenceDocs();
  }

  private variantDisplayLabel(item: VariantItem): string {
    if (item.variant_label) return item.variant_label;
    const attrs = (item.attributes || [])
      .map(attr => [attr.attribute_name, attr.attribute_value].filter(Boolean).join(' '))
      .filter(Boolean)
      .join(', ');
    return attrs ? `${item.variant_name} - ${attrs}` : item.variant_name;
  }

  protected findVariantById(id: number | null | undefined): VariantItem | null {
    const variantId = Number(id);
    if (!Number.isFinite(variantId) || variantId <= 0) return null;
    return this.loadedVariantObjects().find(item => Number(item.id) === variantId) ?? null;
  }

  private variantAttributeItemList(item: VariantItem | null | undefined): { name: string; value: string }[] {
    const attrs = (item?.attributes || []).length
      ? item?.attributes || []
      : (item?.attribute_name || item?.attribute_value)
        ? [{ attribute_name: item?.attribute_name, attribute_value: item?.attribute_value }]
        : [];
    return attrs
      .map(attr => ({ name: String(attr.attribute_name || '').trim(), value: String(attr.attribute_value || '').trim() }))
      .filter(a => a.name);
  }

  private variantLabelAttributeItemList(label: string | null | undefined, variantName: string | null | undefined): { name: string; value: string }[] {
    const labelText = String(label || '').trim();
    const nameText = String(variantName || '').trim();
    if (!labelText || !nameText || labelText.toLowerCase() === nameText.toLowerCase()) return [];
    const prefix = `${nameText} - `;
    const attrPart = labelText.toLowerCase().startsWith(prefix.toLowerCase())
      ? labelText.slice(prefix.length).trim()
      : '';
    if (!attrPart) return [];
    return attrPart.split(',').map(s => s.trim()).filter(Boolean).map(s => ({ name: s, value: '' }));
  }

  private normalizedApplicableVariant(variant: ProductApplicableVariant): ProductApplicableVariant {
    const id = Number(variant.id);
    const master = this.findVariantById(id);
    const variantName = String(variant.variant_name || master?.variant_name || '').trim();
    const variantLabel = String((master ? this.variantDisplayLabel(master) : '') || variant.variant_label || variantName).trim();
    return {
      id: Number.isFinite(id) ? id : 0,
      variant_name: variantName,
      variant_label: variantLabel,
      is_default: !!variant.is_default
    };
  }

  private applyApplicableVariantSelection(variants: ProductApplicableVariant[]): void {
    const seen = new Set<number>();
    let normalized = variants
      .map(variant => this.normalizedApplicableVariant(variant))
      .filter(variant => {
        if (!variant.id || seen.has(variant.id)) return false;
        seen.add(variant.id);
        return true;
      });

    if (normalized.length && !normalized.some(variant => variant.is_default)) {
      normalized = normalized.map((variant, index) => ({ ...variant, is_default: index === 0 }));
    }

    const primary = normalized.find(variant => variant.is_default) ?? normalized[0];
    this.selectedApplicableVariants.set(normalized);
    this.productVariantRequired.set(normalized.length > 0);
    const validVariantIds = new Set(normalized.map(variant => variant.id));
    this.variantStockCombinationRows.update(rows => rows.filter(row => validVariantIds.has(Number(row.variant_id))));
    this.pendingCombinationPicks.update(map => {
      const next: Record<number, Record<string, string>> = {};
      for (const [id, picks] of Object.entries(map)) {
        const numericId = Number(id);
        if (validVariantIds.has(numericId)) next[numericId] = picks;
      }
      return next;
    });
    const pendingId = this.pendingCombinationVariantId();
    if (!pendingId || !validVariantIds.has(pendingId)) {
      this.pendingCombinationVariantId.set(primary?.id ?? null);
    }
    this.collectFormField('variant', primary?.variant_label || primary?.variant_name || null);
  }

  private uomDisplayLabel(item: Partial<UomItem> | any): string {
    return String(item?.uom_symbol || item?.uom_code || item?.uom_name || '').trim();
  }

  private findUomBySelection(value: string | null | undefined): UomItem | null {
    const raw = String(value ?? '').trim();
    const key = this.normalizeKey(raw);
    if (!key) return null;
    const labelName = raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
    const labelSymbol = raw.match(/\(([^)]+)\)\s*$/)?.[1]?.trim() || '';
    const candidates = [...new Set([raw, labelName, labelSymbol].filter(Boolean))];
    return this.loadedUomObjects().find(item =>
      candidates.some(candidate =>
        this.optionEquals(item.uom_name, candidate)
        || this.optionEquals(item.uom_symbol, candidate)
        || this.optionEquals(item.uom_code, candidate)
        || this.optionEquals(this.uomDisplayLabel(item), candidate)
      )
    ) ?? null;
  }

  private sameUomSelection(a: any, b: any): boolean {
    const rawA = String(a ?? '').trim();
    const rawB = String(b ?? '').trim();
    if (!rawA || !rawB) return false;
    const uomA = this.findUomBySelection(rawA);
    const uomB = this.findUomBySelection(rawB);
    if (uomA?.id && uomB?.id) return Number(uomA.id) === Number(uomB.id);
    return this.optionEquals(rawA, rawB)
      || this.optionEquals(this.uomNameFromSelection(rawA), this.uomNameFromSelection(rawB));
  }

  private findProductBySelection(value: any): ProductItem | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const selectedKey = this.normalizeKey(raw);
    return this.loadedProductObjects().find(item =>
      this.normalizeKey(item.product_name) === selectedKey
      || this.normalizeKey(item.product_code) === selectedKey
      || this.normalizeKey(item.sku) === selectedKey
    ) ?? null;
  }

  private transactionUomUsageForKey(key = this.config?.key || ''): 'purchase' | 'sales' | 'stock' {
    const normalized = this.normalizeKey(key);
    const purchaseKeys = new Set([
      'purchaserequisition',
      'requestforquotation',
      'purchaseorder',
      'goodsreceipt',
      'purchaseinvoice',
      'purchasereturn',
      'debitnote'
    ]);
    const salesKeys = new Set([
      'estimation',
      'proformainvoice',
      'posbilling',
      'salesenquiry',
      'salesquotation',
      'salesorder',
      'deliverychallan',
      'salesinvoice',
      'salesreturn',
      'creditnote',
      'shipmententry'
    ]);

    if (purchaseKeys.has(normalized)) return 'purchase';
    if (salesKeys.has(normalized)) return 'sales';
    return 'stock';
  }

  private productBaseUomLabel(product: ProductItem | null | undefined): string {
    return String(product?.base_uom_name || product?.base_uom_symbol || '').trim();
  }

  private productUomConversionLabel(conversion: ProductUomConversion | null | undefined): string {
    return String(
      conversion?.from_uom_name
      || conversion?.from_uom_symbol
      || conversion?.alt_uom_name
      || conversion?.alt_uom
      || ''
    ).trim();
  }

  private productUomConversionId(conversion: ProductUomConversion | null | undefined): number | null {
    return this.optionalNumber(conversion?.from_uom_id);
  }

  private activeProductUomConversions(product: ProductItem | null | undefined): ProductUomConversion[] {
    return (product?.uom_conversions || [])
      .filter(conversion => this.normalizeKey(conversion.status || 'active') !== 'inactive');
  }

  private productUomConversionsForTransaction(product: ProductItem | null | undefined, key = this.config?.key || ''): ProductUomConversion[] {
    const usage = this.transactionUomUsageForKey(key);
    const conversions = this.activeProductUomConversions(product);
    if (usage === 'purchase') {
      return conversions.filter(conversion => !!(conversion.is_purchase_uom || conversion.is_default_purchase));
    }
    if (usage === 'sales') {
      return conversions.filter(conversion => !!(conversion.is_sales_uom || conversion.is_default_sale));
    }
    return conversions;
  }

  protected productUomOptionsForTransaction(product: ProductItem | null | undefined, key = this.config?.key || ''): string[] {
    if (!product) return this.uomOptions;
    const base = this.productBaseUomLabel(product);
    const alternates = this.productUomConversionsForTransaction(product, key)
      .map(conversion => this.productUomConversionLabel(conversion))
      .filter(label => label && !this.optionEquals(label, base));
    return this.mergeOptions(base ? [base] : [], alternates);
  }

  protected defaultProductUomForTransaction(product: ProductItem | null | undefined, key = this.config?.key || ''): { name: string; id: number | null } {
    if (!product) return { name: '', id: null };
    const usage = this.transactionUomUsageForKey(key);
    const conversions = this.productUomConversionsForTransaction(product, key);
    const defaultConversion = usage === 'purchase'
      ? conversions.find(conversion => conversion.is_default_purchase) ?? conversions[0]
      : usage === 'sales'
        ? conversions.find(conversion => conversion.is_default_sale) ?? conversions[0]
        : conversions[0];
    const defaultName = this.productUomConversionLabel(defaultConversion);

    if (defaultName) {
      return { name: defaultName, id: this.productUomConversionId(defaultConversion) };
    }

    return { name: this.productBaseUomLabel(product), id: this.optionalNumber(product.base_uom_id) };
  }

  protected productUomIdForSelection(product: ProductItem | null | undefined, selection: any, key = this.config?.key || ''): number | null {
    const selected = String(selection ?? '').trim();
    if (!product || !selected) return null;
    const baseCandidates = [product.base_uom_name, product.base_uom_symbol].filter(Boolean);
    if (baseCandidates.some(candidate => this.optionEquals(candidate, selected))) {
      return this.optionalNumber(product.base_uom_id);
    }

    const conversion = this.productUomConversionsForTransaction(product, key).find(candidate =>
      [
        this.productUomConversionLabel(candidate),
        candidate.from_uom_name,
        candidate.from_uom_symbol,
        candidate.alt_uom_name,
        candidate.alt_uom
      ].some(value => this.optionEquals(value, selected))
    );
    return this.productUomConversionId(conversion);
  }

  protected productAlternateUomOptions(row?: string[]): string[] {
    const baseUom = this.formValues()['baseUom'];
    const current = row?.[0] || '';
    const selectedKeys = new Set(
      this.entryLineRows()
        .map(candidate => String(candidate[0] || '').trim())
        .filter(value => value && !this.sameUomSelection(value, current))
        .map(value => this.normalizeKey(this.uomNameFromSelection(value) || value))
    );

    return this.uomOptions.filter(option => {
      if (baseUom && this.sameUomSelection(option, baseUom)) return false;
      const key = this.normalizeKey(this.uomNameFromSelection(option) || option);
      return !selectedKeys.has(key);
    });
  }

  private productApplicableVariantLabel(variant: ProductApplicableVariant): string {
    const master = this.findVariantById(variant.id);
    return String((master ? this.variantDisplayLabel(master) : '') || variant.variant_label || variant.variant_name || '').trim();
  }

  protected productVariantOptionObjects(product: ProductItem | null | undefined): Array<{ id: number; label: string; variant_name: string }> {
    const variants = (product?.applicable_variants || []).length
      ? product?.applicable_variants || []
      : (product?.variant_name || product?.variant_label)
        ? [{
          id: product?.variant_id || 0,
          variant_name: product?.variant_name || '',
          variant_label: product?.variant_label || product?.variant_name || '',
          is_default: true
        }]
        : [];
    return variants
      .map(variant => {
        const label = this.productApplicableVariantLabel(variant);
        const master = this.findVariantById(variant.id);
        const groupName = master?.variant_name || variant.variant_name || label;
        return { id: variant.id, label, variant_name: groupName };
      })
      .filter(option => !!option.id && !!option.label);
  }

  protected productVariantOptionsForTransaction(product: ProductItem | null | undefined): string[] {
    return this.productVariantOptionObjects(product).map(option => option.label);
  }

  private productAllowedForTransaction(product: ProductItem, key = this.config?.key || ''): boolean {
    if (this.normalizeKey(product.item_status || product.status || 'active') === 'inactive') return false;
    const usage = this.transactionUomUsageForKey(key);
    if (usage === 'purchase') return product.allows_purchase !== false;
    if (usage === 'sales') return product.allows_sale !== false;
    return true;
  }

  private attributeTextParts(value: any): Array<{ name: string; value: string }> {
    return String(value ?? '')
      .split('|')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const idx = part.indexOf(':');
        return idx >= 0
          ? { name: part.slice(0, idx).trim(), value: part.slice(idx + 1).trim() }
          : { name: '', value: part };
      })
      .filter(part => part.name || part.value);
  }

  protected productStockLimitsForLine(
    product: ProductItem | null | undefined,
    variantId: number | null | undefined,
    attributeText: string | null | undefined
  ): { minStock: number; maxStock: number; reorderLevel: number; reorderQty: number } {
    if (!product) return { minStock: 0, maxStock: 0, reorderLevel: 0, reorderQty: 0 };
    const productLimits = {
      minStock: Number(product.min_stock_level ?? 0),
      maxStock: Number(product.max_stock_level ?? 0),
      reorderLevel: Number(product.reorder_level ?? 0),
      reorderQty: Number(product.reorder_qty ?? 0)
    };
    const numericVariantId = Number(variantId);
    if (!Number.isFinite(numericVariantId) || numericVariantId <= 0) return productLimits;

    const rows = (product.variant_stock_controls || []).filter(row => Number(row.variant_id) === numericVariantId);
    if (!rows.length) return productLimits;

    const attrParts = this.attributeTextParts(attributeText);
    const namedAttrs = new Map(attrParts.filter(part => part.name).map(part => [this.normalizeKey(part.name), this.normalizeKey(part.value)]));
    const valueAttrs = attrParts.filter(part => !part.name).map(part => this.normalizeKey(part.value));
    const exact = rows.find(row => {
      const attrs = row.attributes || [];
      if (!attrs.length) return !attrParts.length;
      if (namedAttrs.size) {
        return attrs.every(attr => namedAttrs.get(this.normalizeKey(attr.attribute_name)) === this.normalizeKey(attr.attribute_value));
      }
      return attrs.length === 1 && valueAttrs.includes(this.normalizeKey(attrs[0].attribute_value));
    });
    const selected = exact ?? (!attrParts.length && rows.length === 1 ? rows[0] : null);
    if (!selected) return productLimits;

    return {
      minStock: Number(selected.min_stock_level ?? productLimits.minStock),
      maxStock: Number(selected.max_stock_level ?? productLimits.maxStock),
      reorderLevel: Number(selected.reorder_level ?? productLimits.reorderLevel),
      reorderQty: Number(selected.reorder_qty ?? productLimits.reorderQty)
    };
  }

  private productVariantGridSummary(record: any): string {
    const variants: ProductApplicableVariant[] = (record?.applicable_variants || []).length
      ? record.applicable_variants
      : (record?.variant_name || record?.variant_label)
        ? [{
          id: record?.variant_id || 0,
          variant_name: record?.variant_name || '',
          variant_label: record?.variant_label || record?.variant_name || '',
          is_default: true
        }]
        : [];
    return variants
      .map(variant => this.productApplicableVariantLabel(variant))
      .filter(Boolean)
      .join(', ');
  }

  private productUomMappingGridSummary(record: any): string {
    const recordBaseUom = String(record?.base_uom_name || record?.base_uom_symbol || '').trim();
    return (record?.uom_conversions || [])
      .filter((conversion: any) => this.normalizeKey(conversion.status || 'active') !== 'inactive')
      .map((conversion: any) => {
        const altUom = this.productUomConversionLabel(conversion);
        const factor = Number(conversion.conversion_factor);
        const baseUom = String(conversion.to_uom_name || conversion.to_uom_symbol || recordBaseUom).trim();
        if (!altUom) return '';
        const factorPart = Number.isFinite(factor) && factor > 0 ? `${factor}` : '?';
        return baseUom
          ? `${altUom} = ${baseUom} × ${factorPart}`
          : `${altUom} = ${factorPart}`;
      })
      .filter(Boolean)
      .join(', ');
  }

  private findVendorBySelection(value: any): VendorItem | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const selectedKey = this.normalizeKey(raw);
    return this.loadedVendorObjects().find(item =>
      this.normalizeKey(item.vendor_name) === selectedKey
      || this.normalizeKey(item.vendor_code) === selectedKey
    ) ?? null;
  }

  private findCustomerBySelection(value: any): CustomerItem | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const selectedKey = this.normalizeKey(raw);
    return this.loadedCustomerObjects().find(item =>
      this.normalizeKey(item.customer_name) === selectedKey
      || this.normalizeKey(item.customer_code) === selectedKey
    ) ?? null;
  }

  private findWarehouseBySelection(value: any): WarehouseItem | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const selectedKey = this.normalizeKey(raw);
    return this.loadedWarehouseObjects().find(item =>
      this.normalizeKey(item.warehouse_name) === selectedKey
      || this.normalizeKey(item.warehouse_code) === selectedKey
    ) ?? null;
  }

  private findBranchBySelection(value: any): BranchInvItem | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const selectedKey = this.normalizeKey(raw);
    return this.loadedBranchObjects().find(item =>
      this.normalizeKey(item.branch_name) === selectedKey
      || this.normalizeKey(item.branch_code) === selectedKey
    ) ?? null;
  }

  private purchaseRequisitionRequesterOptions(branchValue: any = this.formValues()['branch']): string[] {
    if (this.config?.key !== 'purchaseRequisition') return this.contactOptions;
    const branch = this.findBranchBySelection(branchValue);
    const contactName = String(branch?.contact_name || '').trim();
    return contactName ? this.mergeOptions([], [contactName]) : [];
  }

  protected validatePrRequestedBy(payload: Record<string, any>): string {
    const hasValue = (v: any) => String(v ?? '').trim().length > 0;
    const requesterOptions = this.purchaseRequisitionRequesterOptions(this.formValues()['branch']);
    if (!requesterOptions.length) return 'Map contact person in Branch Master for selected PR Branch.';
    if (!hasValue(payload['requested_by'])) return 'Requested By is required for Purchase Requisition.';
    if (!requesterOptions.some(option => this.optionEquals(option, payload['requested_by']))) {
      return 'Requested By must be mapped to the selected PR Branch.';
    }
    return '';
  }

  private branchNameFromRecord(record: any): string {
    const directName = String(record?.branch_name || record?.branchName || '').trim();
    if (directName) return directName;

    const branchId = Number(record?.branch_id ?? record?.branchId);
    if (!Number.isFinite(branchId) || branchId <= 0) return '';

    const branch = this.loadedBranchObjects().find(item =>
      Number(item.branch_id) === branchId || Number(item.id) === branchId
    );
    return branch?.branch_name || branch?.branch_code || '';
  }

  private branchIdFromRecord(record: any): number | null {
    const rawId = this.optionalNumber(record?.branch_id ?? record?.branchId);
    const branchName = String(record?.branch_name || record?.branchName || '').trim();
    const branch = this.loadedBranchObjects().find(item =>
      (rawId !== null && (Number(item.branch_id) === rawId || Number(item.id) === rawId))
      || (!!branchName && this.optionEquals(item.branch_name, branchName))
    );
    return this.optionalNumber(branch?.branch_id) ?? rawId;
  }

  private uomNameFromSelection(value: string | null | undefined): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const selected = this.findUomBySelection(raw);
    if (selected?.uom_name) return selected.uom_name;
    return raw.replace(/\s*\([^)]*\)\s*$/, '').trim() || raw;
  }

  uomConversionMappingAvailable(): boolean {
    return this.config?.key === 'uomMaster' && this.editingId() !== null;
  }

  uomBaseMappingLabel(): string {
    const v = this.formValues();
    return String(v['uomCode'] || v['uomName'] || 'saved base UOM').trim();
  }

  uomFormActionLabel(): string {
    if (this.config?.key !== 'uomMaster') return 'Add';
    return this.editingId() !== null ? 'Update UOM' : 'Save UOM';
  }

  private blankUomConversionRow(baseLabel = this.uomBaseMappingLabel()): string[] {
    return ['', baseLabel, '', 'Exact'];
  }

  private findVariantBySelection(value: string | null | undefined): VariantItem | null {
    const key = this.normalizeKey(value);
    if (!key) return null;
    return this.loadedVariantObjects().find(item =>
      this.optionEquals(this.variantDisplayLabel(item), value)
      || this.optionEquals(item.variant_name, value)
      || this.optionEquals(item.variant_code, value)
    ) ?? null;
  }

  private variantNameFromSelection(value: string | null | undefined): string | null {
    return this.findVariantBySelection(value)?.variant_name || (value ? String(value) : null);
  }

  private findAttributeBySelection(value: string | null | undefined): AttributeItem | null {
    const key = this.normalizeKey(value);
    if (!key) return null;
    return this.attributeLookupObjects().find(item => this.optionEquals(item.attribute_name, value)) ?? null;
  }

  private attributeLookupObjects(): AttributeItem[] {
    const seen = new Set<string>();
    return [...this.loadedAttributeObjects(), ...this.allAttributeObjects()]
      .filter(item => {
        const key = item.id ? `id:${item.id}` : `name:${this.normalizeKey(item.attribute_name)}`;
        if (!item.attribute_name || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }


  private normalizeAttributeType(type: string | null | undefined): 'text' | 'number' | 'date' | 'select' | 'multiselect' {
    const key = this.normalizeKey(type).replace(/[^a-z0-9]+/g, '');
    if (key.includes('number') || key.includes('numeric') || key.includes('decimal') || key.includes('integer')) return 'number';
    if (key.includes('date')) return 'date';
    if (key.includes('multiselect')) return 'multiselect';
    if (key.includes('dropdown') || key.includes('select') || key.includes('list') || key.includes('yesno') || key.includes('boolean')) return 'select';
    return 'text';
  }

  private attributeTypeForApi(type: any): string {
    const raw = String(type || 'Text').trim();
    const key = raw.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (key === 'yesno' || key === 'boolean') return 'Yes/No';
    if (key === 'multiselect') return 'Multi Select';
    if (key === 'dropdown' || key === 'select' || key === 'list') return 'Dropdown';
    if (key === 'number' || key === 'numeric' || key === 'decimal' || key === 'integer') return 'Number';
    if (key === 'date') return 'Date';
    return 'Text';
  }

  private attributePossibleValueTokens(value: any): string[] {
    if (Array.isArray(value)) {
      return value.flatMap(item => this.attributePossibleValueTokens(item));
    }

    if (value && typeof value === 'object') {
      const direct = value.value ?? value.label ?? value.name ?? value.text ?? value.option ?? value.attribute_value ?? value.attributeValue;
      return direct === undefined ? [] : this.attributePossibleValueTokens(direct);
    }

    const text = String(value ?? '').trim();
    if (!text) return [];

    if ((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('{') && text.endsWith('}'))) {
      try {
        return this.attributePossibleValueTokens(JSON.parse(text));
      } catch {
        // Fall back to comma splitting below.
      }
    }

    return text.split(',').map(item => item.trim()).filter(Boolean);
  }


  private variantAttributeType(attributeName: string | null | undefined): 'text' | 'number' | 'date' | 'select' | 'multiselect' {
    return this.normalizeAttributeType(this.findAttributeBySelection(attributeName)?.attribute_type);
  }

  variantAttributeValueOptions(attributeName: string | null | undefined): string[] {
    if (!attributeName) return [];
    return this._stableAttrValueOptionsMap().get(attributeName.toLowerCase().trim()) ?? [];
  }

  variantAttributeValueInputType(attributeName: string | null | undefined): 'text' | 'number' | 'date' {
    const type = this.variantAttributeType(attributeName);
    return type === 'number' || type === 'date' ? type : 'text';
  }

  variantAttributeUsesMultiselect(attributeName: string | null | undefined): boolean {
    return this.variantAttributeType(attributeName) === 'multiselect';
  }

  variantAttributeValuePlaceholder(attributeName: string | null | undefined): string {
    const attribute = this.findAttributeBySelection(attributeName);
    if (!attributeName) return 'Select Attribute Name first';
    const options = this.variantAttributeValueOptions(attributeName);
    if (options.length) return `Select ${attribute?.attribute_name || 'attribute value'}`;
    const type = this.variantAttributeType(attributeName);
    if (type === 'number') return `Enter numeric ${attribute?.attribute_name || 'value'}`;
    if (type === 'date') return `Select ${attribute?.attribute_name || 'date'}`;
    return `Enter ${attribute?.attribute_name || 'attribute value'}`;
  }

  private variantAttributeValueAllowed(attributeName: string | null | undefined, value: any): boolean {
    const values = this.variantAttributeValueTokens(attributeName, value);
    if (!values.length) return true;
    const options = this.variantAttributeValueOptions(attributeName);
    if (options.length) return values.every(valueText => options.some(option => this.optionEquals(option, valueText)));
    const text = values[0] || '';
    const type = this.variantAttributeType(attributeName);
    if (type === 'number') return Number.isFinite(Number(text));
    if (type === 'date') return !Number.isNaN(Date.parse(text));
    return true;
  }

  private variantAttributeValueTokens(attributeName: string | null | undefined, value: any): string[] {
    if (Array.isArray(value)) {
      return value.map(item => String(item ?? '').trim()).filter(Boolean);
    }
    const text = String(value ?? '').trim();
    if (!text) return [];
    if (this.variantAttributeUsesMultiselect(attributeName)) {
      return text.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [text];
  }

  private variantAttributeValueForPayload(value: any): string | null {
    if (Array.isArray(value)) {
      const joined = value.map(item => String(item ?? '').trim()).filter(Boolean).join(', ');
      return joined || null;
    }
    const text = String(value ?? '').trim();
    return text || null;
  }

  variantAttributeValueControlValue(attributeName: string | null | undefined, value: any): any {
    if (this.variantAttributeUsesMultiselect(attributeName)) {
      return this.variantAttributeValueTokens(attributeName, value);
    }
    if (Array.isArray(value)) {
      return this.variantAttributeValueForPayload(value) || '';
    }
    return value ?? '';
  }

  addQuickVariantRow(): void {
    this.quickAddVariantRows.update(rows => [...rows, {name: '', value: ''}]);
  }

  removeQuickVariantRow(index: number): void {
    this.quickAddVariantRows.update(rows => rows.filter((_, i) => i !== index));
    if (!this.quickAddVariantRows().length) {
      this.quickAddVariantRows.set([{name: '', value: ''}]);
    }
  }

  setQuickVariantRowName(index: number, name: string): void {
    this.quickAddVariantRows.update(rows => rows.map((row, i) => {
      if (i !== index) return row;
      const attrChanged = row.name !== name;
      return {name, value: attrChanged ? '' : row.value};
    }));
  }

  setQuickVariantRowValue(index: number, value: any): void {
    this.quickAddVariantRows.update(rows => rows.map((row, i) => i === index ? {...row, value} : row));
  }

  quickVariantRowValueOptions(index: number): string[] {
    const row = this.quickAddVariantRows()[index];
    return row ? this.variantAttributeValueOptions(row.name) : [];
  }

  quickVariantRowUsesMultiselect(index: number): boolean {
    const row = this.quickAddVariantRows()[index];
    return row ? this.variantAttributeUsesMultiselect(row.name) : false;
  }

  quickVariantRowValueInputType(index: number): 'text' | 'number' | 'date' {
    const row = this.quickAddVariantRows()[index];
    return row ? this.variantAttributeValueInputType(row.name) : 'text';
  }

  quickVariantRowValueControlValue(index: number): any {
    const row = this.quickAddVariantRows()[index];
    return row ? this.variantAttributeValueControlValue(row.name, row.value) : '';
  }

  quickVariantRowValuePlaceholder(index: number): string {
    const row = this.quickAddVariantRows()[index];
    return row ? this.variantAttributeValuePlaceholder(row.name) : 'Select Attribute Name first';
  }

  private variantAttributesValidationMessage(attributes: any[]): string {
    for (const attr of attributes) {
      const name = attr?.attribute_name;
      const value = attr?.attribute_value;
      const meta = this.findAttributeBySelection(name);
      if (!name) continue;
      if (meta?.is_mandatory && !this.variantAttributeValueTokens(name, value).length) {
        return `${name} value is mandatory.`;
      }
      if (!this.variantAttributeValueAllowed(name, value)) {
        const options = this.variantAttributeValueOptions(name);
        if (options.length) return `${name} value must be one of: ${options.join(', ')}.`;
        const type = this.variantAttributeType(name);
        if (type === 'number') return `${name} value must be a number.`;
        if (type === 'date') return `${name} value must be a valid date.`;
      }
    }
    return '';
  }

  selectedVariantAttributeLabel(): string {
    const selected = this.findVariantBySelection(this.formValues()['variant']);
    if (!selected) return '';
    const attrs = (selected.attributes || [])
      .map(attr => [attr.attribute_name, attr.attribute_value].filter(Boolean).join(': '))
      .filter(Boolean);
    if (attrs.length) return attrs.join(' | ');
    return [selected.attribute_name, selected.attribute_value].filter(Boolean).join(': ');
  }

  private selectedProductCategoryObject(): CategoryItem | null {
    const category = this.selectedProductCategory();
    if (!category) return null;
    return this.loadedCategoryObjects().find(item => this.optionEquals(item.category_name, category)) ?? null;
  }

  // Base UOM choices for Product Master: Category's curated list first, falling
  // back to the segment's UOM list, then the full company list — so neither
  // Category nor Segment curation can ever block a save, only narrow the menu.
  protected productBaseUomOptions(): string[] {
    const curated = (this.selectedProductCategoryObject()?.uoms || [])
      .map(u => this.uomDisplayLabel(u))
      .filter(Boolean);
    if (curated.length) return this.mergeOptions(curated, []);
    if (this.uomOptions.length) return this.uomOptions;
    return this.loadedUomObjects().map(u => this.uomDisplayLabel(u)).filter(Boolean);
  }

  categoryRequiresBatchPolicy(): boolean {
    return !!this.selectedProductCategoryObject()?.batch_applicable;
  }

  categoryRequiresSerialPolicy(): boolean {
    return !!this.selectedProductCategoryObject()?.serial_applicable;
  }

  // HSN codes matching the selected product category — shown as a suggestion panel
  readonly categoryHsnSuggestions = computed(() => {
    const category = this.selectedProductCategory();
    if (!category || this.config?.key !== 'productServiceMaster') return [];
    const catKey = this.normalizeKey(category);
    const active = this.loadedHsnSacObjects().filter(h => h.status !== 'inactive');
    // 1. Exact match on category field (set via Tax Classification Master)
    const byField = active.filter(h => this.normalizeKey(h.category ?? '') === catKey);
    if (byField.length) return byField.slice(0, 8);
    // 2. Fallback: HSN description contains a significant word from the category name
    const words = catKey.split(/\s+/).filter(w => w.length > 3);
    if (!words.length) return [];
    return active.filter(h =>
      words.some(w => this.normalizeKey(h.description ?? '').includes(w))
    ).slice(0, 8);
  });

  selectHsnFromCategorySuggestion(item: HsnSacItem): void {
    if (!this.hsnSacOptionList().some(o => this.optionEquals(o, item.code))) {
      this.hsnSacOptionList.update(opts => [...opts, item.code]);
    }
    this.hsnSacCode.set(item.code);
    this.hsnSacDescription.set(item.description || '');
    this.gstRate.set(item.gst_rate ?? null);
    this.selectedTaxCodeSuggestion.set(null);
    this.collectFormField('hsnSacCode', item.code);
    this.collectFormField('gstRate', item.gst_rate ?? null);
    this.collectFormField('cgstRate', item.cgst_rate ?? null);
    this.collectFormField('sgstRate', item.sgst_rate ?? null);
    this.collectFormField('igstRate', item.igst_rate ?? null);
    this.collectFormField('cessRate', item.cess_rate ?? null);
  }

  private queueTaxCodeSearch(autoPick: boolean): void {
    const manualCode = this.hsnSacCode().trim();
    const query = manualCode.length >= 2 ? manualCode : this.productName();
    this.taxCodeSearch$.next({
      query,
      category: this.selectedProductCategory(),
      autoPick
    });
  }

  protected loadLookupOptions(): void {
    this.inventoryConfigService.getSegments(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const savedSegments = res.data ?? [];
          this.loadedSegmentObjects.set(savedSegments);
          const names = savedSegments.map(item => item.segment_name).filter(Boolean) as string[];
          this.segmentOptionList.set(names);
          this.segmentCardList.set(savedSegments.map(item => ({
            name: item.segment_name,
            behavior: item.usage_note || 'Configured inventory segment',
            stock: String((item.categories?.length || 0) + (item.uoms?.length || 0)) + ' mappings',
            availability: item.status === 'active' ? 'Active' : 'Inactive'
          })));
          const hasCurrentSegment = savedSegments.some(item => this.optionEquals(item.segment_name, this.selectedSegment()));
          if ((!this.selectedSegment() || !hasCurrentSegment) && names.length) {
            this.selectedSegment.set(names[0]);
          } else {
            this.refreshSegmentScopedOptions();
            this.loadSegmentScopedLookups();
          }
        },
        error: () => {}
      });

    this.inventoryConfigService.getCategories(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const cats = res.data ?? [];
          const names = cats.map(item => item.category_name).filter(Boolean) as string[];
          this.loadedCategoryObjects.set(cats);
          if (!this.selectedSegment() && names.length) {
            this.categoryOptionList.set(this.mergeOptions([], names));
          } else {
            this.refreshSegmentScopedOptions();
          }
        },
        error: () => {}
      });

    this.inventoryConfigService.getUoms(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const uoms = res.data ?? [];
          const names = uoms.map(item => item.uom_symbol || item.uom_name || item.uom_code).filter(Boolean) as string[];
          this.loadedUomObjects.set(uoms);
          if (!this.selectedSegment() && names.length) {
            this.uomOptionList.set(this.mergeOptions([], names));
          } else {
            this.refreshSegmentScopedOptions();
          }
        },
        error: () => {}
      });

    this.inventoryConfigService.getHsnSac(undefined, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const items = res.data ?? [];
          this.loadedHsnSacObjects.set(items);
          const codes = items.map(item => item.code).filter(Boolean) as string[];
          if (!this.selectedSegment() && codes.length) {
            this.hsnSacOptionList.set(this.mergeOptions([], codes));
          } else {
            this.refreshSegmentScopedOptions();
          }
          const taxCats = items.map(item => item.tax_category).filter(Boolean) as string[];
          this.taxCategoryOptionList.set(this.mergeOptions([], taxCats));
        },
        error: () => {}
      });

    this.inventoryConfigService.getAttributes(null, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const attributes = res.data ?? [];
          this.allAttributeObjects.set(attributes);
          if (!this.loadedAttributeObjects().length) {
            const names = attributes.map(item => item.attribute_name).filter(Boolean) as string[];
            this.attributeOptionList.set(this.mergeOptions([], names));
          }
        },
        error: () => {}
      });

    this.inventoryConfigService.getBranchesInv(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const branches = res.data ?? [];
          this.loadedBranchObjects.set(branches);
          const names = branches.map(item => item.branch_name || item.branch_code).filter(Boolean) as string[];
          this.branchOptionList.set(this.mergeOptions([], names));
        },
        error: () => {}
      });

    this.inventoryConfigService.getWarehouses(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const warehouses = res.data ?? [];
          this.loadedWarehouseObjects.set(warehouses);
          const names = warehouses.map(item => item.warehouse_name || item.warehouse_code).filter(Boolean) as string[];
          this.warehouseOptionList.set(this.mergeOptions(INVENTORY_OPTIONS.locations, names));
        },
        error: () => {}
      });

    this.inventoryConfigService.getPaymentTerms(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const terms = res.data ?? [];
          this.loadedPaymentTermObjects.set(terms);
          const names = terms.map(item => item.term_name || item.term_code).filter(Boolean) as string[];
          this.paymentTermOptionList.set(this.mergeOptions(INVENTORY_OPTIONS.paymentTerms, names));
        },
        error: () => {}
      });

    this.inventoryConfigService.getProductTypes(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const types = res.data ?? [];
          this.loadedProductTypeObjects.set(types);
          const names = [...new Set(types.map(item => item.type_name).filter(Boolean) as string[])];
          this._productTypeOptions.set(names.length ? names : [...INVENTORY_OPTIONS.productTypes]);
        },
        error: () => {
          this._productTypeOptions.set([...INVENTORY_OPTIONS.productTypes]);
        }
      });
  }

  private clearSegmentScopedLookupLists(): void {
    this.brandOptionList.set([]);
    this.attributeOptionList.set([]);
    this.variantOptionList.set([]);
    this.productOptionList.set([]);
    this.vendorOptionList.set([]);
    this.customerOptionList.set([]);
    this.uomOptionList.set([]);
    this.loadedCustomerObjects.set([]);
    this.serialPolicyOptionList.set([]);
    this.batchPolicyOptionList.set([]);
    this.loadedUomObjects.set([]);
    this.loadedAttributeObjects.set([]);
    this.loadedAttributeReady.set(false);
    this.loadedVariantObjects.set([]);
    this.loadedProductObjects.set([]);
    this.loadedVendorObjects.set([]);
  }

  private isCurrentSegmentRequest(requestedSegmentId: number | null): boolean {
    return (this.selectedSegmentId() ?? null) === (requestedSegmentId ?? null);
  }

  private loadSegmentScopedLookups(): void {
    const hasSelectedSegment = !!this.selectedSegment();
    const requestedSegmentId = this.selectedSegmentId();

    if (hasSelectedSegment && !requestedSegmentId) {
      this.clearSegmentScopedLookupLists();
      return;
    }

    this.inventoryConfigService.getBrands(requestedSegmentId, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (!this.isCurrentSegmentRequest(requestedSegmentId)) return;
          const items = res.data ?? [];
          const names = items.map(item => item.brand_name).filter(Boolean) as string[];
          this.brandOptionList.set(this.mergeOptions([], names));
          const mfrs = items.map(item => item.manufacturer).filter(Boolean) as string[];
          this.manufacturerOptionList.set(this.mergeOptions([], mfrs));
        },
        error: () => {}
      });

    this.inventoryConfigService.getUoms(true, requestedSegmentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (!this.isCurrentSegmentRequest(requestedSegmentId)) return;
          const uoms = res.data ?? [];
          this.loadedUomObjects.set(uoms);
          const names = uoms.map(item => item.uom_symbol || item.uom_name || item.uom_code).filter(Boolean) as string[];
          this.uomOptionList.set(this.mergeOptions([], names));
        },
        error: () => {}
      });

    this.inventoryConfigService.getAttributes(requestedSegmentId, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (!this.isCurrentSegmentRequest(requestedSegmentId)) return;
          const attributes = res.data ?? [];
          this.loadedAttributeObjects.set(attributes);
          this.loadedAttributeReady.set(true);
          const names = attributes.map(item => item.attribute_name).filter(Boolean) as string[];
          this.attributeOptionList.set(this.mergeOptions([], names));
        },
        error: () => { this.loadedAttributeReady.set(true); }
      });

    this.inventoryConfigService.getVariants(requestedSegmentId, null, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (!this.isCurrentSegmentRequest(requestedSegmentId)) return;
          const variants = res.data ?? [];
          this.loadedVariantObjects.set(variants);
          const names = variants.map(item => this.variantDisplayLabel(item)).filter(Boolean) as string[];
          this.variantOptionList.set(this.mergeOptions([], names));
        },
        error: () => {}
      });

    this.inventoryConfigService.getSerialPolicies(requestedSegmentId, null, false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (!this.isCurrentSegmentRequest(requestedSegmentId)) return;
          const names = (res.data ?? []).map(item => item.policy_name).filter(Boolean) as string[];
          this.serialPolicyOptionList.set(this.mergeOptions([], names));
        },
        error: () => {}
      });

    this.inventoryConfigService.getBatchPolicies(requestedSegmentId, null, false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (!this.isCurrentSegmentRequest(requestedSegmentId)) return;
          const names = (res.data ?? []).map(item => item.policy_name).filter(Boolean) as string[];
          this.batchPolicyOptionList.set(this.mergeOptions([], names));
        },
        error: () => {}
      });

    this.inventoryConfigService.getProducts(requestedSegmentId, null, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (!this.isCurrentSegmentRequest(requestedSegmentId)) return;
          const products = res.data ?? [];
          this.loadedProductObjects.set(products);
          const names = products.map(item => item.product_name).filter(Boolean) as string[];
          this.productOptionList.set(this.mergeOptions([], names));
        },
        error: () => {}
      });

    this.inventoryConfigService.getVendors(requestedSegmentId, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (!this.isCurrentSegmentRequest(requestedSegmentId)) return;
          const vendors = res.data ?? [];
          this.loadedVendorObjects.set(vendors);
          const names = vendors.map(item => item.vendor_name).filter(Boolean) as string[];
          this.vendorOptionList.set(this.mergeOptions(INVENTORY_OPTIONS.suppliers, names));
        },
        error: () => {}
      });

    this.inventoryConfigService.getCustomers(requestedSegmentId, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (!this.isCurrentSegmentRequest(requestedSegmentId)) return;
          const customers = res.data ?? [];
          this.loadedCustomerObjects.set(customers);
          const names = customers.map(item => item.customer_name).filter(Boolean) as string[];
          this.customerOptionList.set(this.mergeOptions([], names));
        },
        error: () => {}
      });
  }

  private savedOrFallback(fallback: string[], incoming: Array<string | null | undefined>): string[] {
    const saved = this.mergeOptions([], incoming);
    return saved.length ? saved : this.mergeOptions([], fallback);
  }

  private mergeOptions(base: string[], incoming: Array<string | null | undefined>): string[] {
    const seen = new Set<string>();
    return [...base, ...incoming]
      .map(item => (item || '').trim())
      .filter(item => {
        if (!item) return false;
        const key = item.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  private formatDateLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  screenUsageLabel(): string {
    if (!this.config) return 'ERP workflow';

    if (this.config.kind === 'dashboard') {
      return 'Used to review inventory position, segment behavior, stock health, and operational follow-up.';
    }

    if (this.config.kind === 'master') {
      return 'Used before transactions so users can select clean, validated master data instead of typing repeated values.';
    }

    if (this.config.kind === 'transaction') {
      return 'Used for daily ERP entry. Posted records affect stock, billing, approvals, accounting, or operational reports based on this screen.';
    }

    return 'Used to filter and review ERP data for audit, compliance, reconciliation, and management decisions.';
  }

  guideProcedureSteps(): string[] {
    switch (this.config?.key) {
      case 'dashboard':
        return ['Select or review the business segment.', 'Check KPI cards, workflow status and monitoring grid.', 'Open the related master, transaction or report when a stock issue needs action.'];
      case 'businessSegments':
        return ['Create the business segment first.', 'Map common categories, UOMs and tax codes for that segment.', 'Use the segment in product, warehouse, transaction and report screens.'];
      case 'branchMaster':
        return ['Create branch or store details.', 'Map GST, address and optional contact person from Global Contact.', 'Use the branch for access control, warehouse mapping and branch-wise reporting.'];
      case 'warehouseMaster':
        return ['Create stock location only when the segment maintains physical stock or capacity.', 'Map the warehouse to branch and segment.', 'Transactions such as GRN, transfer, adjustment and reports will use this location.'];
      case 'productServiceMaster':
        return ['Create the actual sellable or purchasable item/service.', 'Map category, UOM, HSN/SAC, tracking policy and stock controls.', 'Transactions pick this product and auto-fill tax, UOM and stock behavior.'];
      case 'categoryMaster':
        return ['Create broad product grouping such as Electronics, Food, Service or Rooms.', 'Set default serial or batch policies if needed.', 'Product Master can inherit these defaults to reduce repeated setup.'];
      case 'uomMaster':
        return ['Create base and alternate UOMs.', 'Add conversion only when purchase/sale UOM differs from stock UOM.', 'ERP stores stock in base UOM while allowing transactions in alternate UOM.'];
      case 'hsnSacMapping':
        return ['Enter the HSN/SAC code and map it to a Product Category.', 'Fill GST, CGST, SGST, IGST and Cess rates.', 'When this category is selected in Product Master, HSN/SAC and tax rates auto-bind to the product.'];
      case 'vendorMaster':
      case 'customerMaster':
        return ['Search and select company or individual from Global Contact.', 'Mobile, email, GSTIN, PAN and address bind from the contact.', 'Enable Contact Person only when the party is a company and a separate person must be mapped.'];
      case 'paymentTermsMaster':
        return ['Create terms such as Immediate, 15 Days, 30 Days or Advance.', 'Map terms to customer/vendor or transaction.', 'ERP uses it to calculate due dates, receivable ageing and payable schedules.'];
      case 'priceListMaster':
        return ['Create a price list for a customer type, branch or date range.', 'Add product-wise rates with UOM and effective dates.', 'Sales Invoice and POS can auto-fill rate based on customer and selected product.'];
      case 'bomMaster':
        return ['Select the finished product that will be manufactured.', 'Add raw material/component lines with UOM and quantity required.', 'During production, ERP consumes raw materials and can increase finished goods stock.'];
      case 'workCenterMaster':
        return ['Create the production area, machine, section or team where work happens.', 'Define department, capacity and cost per hour.', 'Manufacturing planning can use this for routing, capacity and production costing.'];
      case 'consumptionTypeMaster':
        return ['Create the reason/type for internal stock usage.', 'If approval is required, map a reusable Approval Workflow.', 'Stock issue or consumption entries use this to route approval and report department usage.'];
      case 'productTypeMaster':
        return ['Create or customize product nature classification.', 'Set behavior flags for purchase, sale, inventory tracking, serial and batch defaults.', 'System natures (Physical Stock, Service, Fixed Asset) are pre-seeded and cannot be deleted.'];
      case 'approvalWorkflowMaster':
        return ['Create reusable approval rules.', 'Choose single, two or multi-level approval.', 'Select approvers from Global Contact/user data and define thresholds or escalation timing.'];
      case 'barcodeConfiguration':
        return ['Define barcode format and generation rule.', 'Map it to product/category if needed.', 'Use it for labels, inward scanning, POS billing and stock verification.'];
      case 'serialNumberPolicy':
        return ['Define when serial/IMEI is required.', 'Set capture stage such as inward, sale or both.', 'ERP validates item-level movement and warranty traceability.'];
      case 'batchLotPolicy':
        return ['Define batch or lot format.', 'Set expiry and QC requirements.', 'ERP tracks lot-wise stock, food/agro expiry, QC hold and traceability.'];
      case 'substituteProducts':
        return ['Select original product.', 'Map approved substitute products.', 'Sales, procurement or issue teams can pick alternatives when original stock is unavailable.'];
      case 'transporterMaster':
      case 'vehicleMaster':
        return ['Create logistics master data.', 'Map contact, vehicle or transport details.', 'Dispatch, GRN, transfer and logistics reports can reuse it.'];
      case 'estimation':
      case 'proformaInvoice':
      case 'purchaseOrder':
      case 'goodsReceipt':
      case 'salesInvoice':
      case 'posBilling':
      case 'stockTransfer':
      case 'stockAdjustment':
        return ['Fill header details first: date, party, segment and location.', 'Add or remove item rows directly in the entry grid.', 'Save to post or keep the transaction as per workflow.'];
      case 'stockAvailabilityReport':
      case 'stockLedger':
      case 'segmentSummary':
      case 'hsnSacReport':
        return ['Select filters such as segment, product, location and date range.', 'Generate the report.', 'Use export, print or mail actions for audit and management review.'];
      default:
        if (this.config?.kind === 'master') {
          return [`Create the ${this.config.title} record with code, name and required classification.`, 'Keep status active only when the setup is verified.', 'After saving, users can select this master in related transaction and report screens.'];
        }

        if (this.config?.kind === 'transaction') {
          return [`Fill ${this.config.title} header details such as date, reference, party, branch or warehouse.`, 'Add item/detail rows with product, UOM, quantity, rate, tax and remarks where required.', 'Review the staged grid, then Save to post or move the document to approval as per workflow.'];
        }

        if (this.config?.kind === 'report') {
          return [`Select ${this.config.title} filters such as date range, segment, location and product.`, 'Generate the report and verify totals or balances.', 'Use print/export for audit, management review or accounts reconciliation.'];
        }

        return ['Review the screen purpose and prerequisites.', 'Fill the available fields carefully.', 'Save or export only after the data is verified.'];
    }
  }

  guideExampleText(): string {
    switch (this.config?.key) {
      case 'bomMaster':
        return 'Example: Finished Product = Drone. Raw material lines can be Drone Motor 4 Nos, Propeller 4 Nos, Battery Pack 1 Nos and Frame 1 Nos. Quantity means raw material required per one finished unit.';
      case 'workCenterMaster':
        return 'Example: Assembly Line can produce 40 units per day at Rs. 1200 per hour. QC Station can inspect 80 units per day at Rs. 850 per hour.';
      case 'priceListMaster':
        return 'Example: LED Display can have Retail rate 24500, Dealer rate 23000 and Corporate rate 23800. ERP chooses the rate from customer price list and product.';
      case 'approvalWorkflowMaster':
        return 'Example: Single Level = Admin Manager only. Two Level = Production Manager then Operations Head. Multi Level = Department Head, Finance Manager and Final Approver.';
      case 'consumptionTypeMaster':
        return 'Example: Production Issue may require Production Manager Approval, while Kitchen Consumption may be auto-approved below a defined amount.';
      case 'productTypeMaster':
        return 'Example: Physical Stock tracks inventory and allows purchase and sale. Fixed Asset allows only purchase — it is allotted to employees and cannot be sold from a transaction screen.';
      case 'vendorMaster':
      case 'customerMaster':
        return 'Example: Customer can be Tenant Works Pvt Ltd as a company, or Rajesh Kumar as an individual. Contact Person is needed only when a separate person is mapped under a company.';
      case 'uomMaster':
        return 'Example: Stock is kept in KG, purchase happens in Bag, and conversion is 1 Bag = 25 KG.';
      case 'productServiceMaster':
        return 'Example: LED Display is a physical stock item with Nos as base UOM, HSN 8471, serial tracking and GST auto-filled from HSN/SAC mapping.';
      default:
        if (this.config?.kind === 'dashboard') {
          return 'Example: Use the dashboard to see low stock, pending GRN, pending approval and segment-wise availability before opening the detailed screen.';
        }

        if (this.config?.kind === 'master') {
          return `Example: Create one clean ${this.config.title} record, keep code/name unique, then reuse it in transaction entry instead of typing the value again.`;
        }

        if (this.config?.kind === 'transaction') {
          return `Example: In ${this.config.title}, fill the document header, add multiple item rows in the current entries grid, then save when all lines are checked.`;
        }

        if (this.config?.kind === 'report') {
          return `Example: In ${this.config.title}, filter by segment, product/location and date range to verify balance, tax or movement details.`;
        }

        return 'Example data in this screen is for ERP workflow understanding. Replace it with real master or transaction data during implementation.';
    }
  }

  guideImpactText(): string {
    switch (this.config?.key) {
      case 'bomMaster':
        return 'Wrong BOM quantity will consume wrong raw material stock and distort production cost.';
      case 'workCenterMaster':
        return 'Wrong capacity or hourly cost can affect production planning and manufacturing costing.';
      case 'priceListMaster':
        return 'Wrong price list can auto-fill incorrect sales rates in invoice and POS.';
      case 'approvalWorkflowMaster':
        return 'Wrong approver mapping can block documents or send approval to the wrong user.';
      case 'consumptionTypeMaster':
        return 'Wrong workflow mapping can allow stock consumption without the required approval.';
      case 'productTypeMaster':
        return 'Wrong flags can allow purchase or sale of items that should be restricted, or miss serial/batch tracking that is required by branch activity.';
      default:
        return this.config?.outputImpact || 'This setup affects downstream ERP selection, validation, reporting and posting behavior.';
    }
  }

  fieldAdvice(field: InventoryField): string {
    const label = field.label || field.key;
    const typeText = this.fieldTypeLabel(field);
    const optionText = field.options?.length ? ` Select from ${field.options.slice(0, 4).join(', ')}${field.options.length > 4 ? ', etc.' : ''}.` : '';
    const addText = field.addMaster ? ` If the value is missing, add it from ${field.addMaster}.` : '';

    return `${label} is a ${typeText} field.${optionText}${addText}`;
  }

  fieldEffect(field: InventoryField): string {
    const key = `${field.key} ${field.label}`.toLowerCase();

    if (key.includes('segment')) return 'Controls business behavior, reporting group, and which inventory rules apply.';
    if (key.includes('branch') || key.includes('warehouse') || key.includes('location')) return 'Controls where stock, capacity, or activity is recorded and reported.';
    if (key.includes('product') || key.includes('item') || key.includes('sku') || key.includes('service')) return 'Connects this entry to product master, stock ledger, billing, and item-wise reports.';
    if (key.includes('category') || key.includes('group')) return 'Classifies products for defaults, filtering, MIS grouping, and policy mapping.';
    if (key.includes('uom') || key.includes('quantity') || key.includes('qty') || key.includes('conversion')) return 'Affects quantity calculation, stock balance, purchase/sale conversion, and valuation accuracy.';
    if (key.includes('hsn') || key.includes('sac') || key.includes('gst') || key.includes('tax')) return 'Affects tax calculation, invoice compliance, and HSN/SAC reporting.';
    if (key.includes('rate') || key.includes('price') || key.includes('amount') || key.includes('total') || key.includes('cost')) return 'Affects transaction value, billing totals, costing, and financial reports.';
    if (key.includes('vendor') || key.includes('supplier')) return 'Links purchase flow, payable tracking, delivery follow-up, and supplier analysis.';
    if (key.includes('customer') || key.includes('party')) return 'Links sales flow, receivable tracking, customer history, and statements.';
    if (key.includes('date')) return 'Controls posting period, ageing, report filters, and audit trail.';
    if (key.includes('approval') || key.includes('approver') || key.includes('workflow') || key.includes('escalation')) return 'Controls who must approve this entry, which role or user receives it, and how pending approvals move forward.';
    if (key.includes('status') || key.includes('active') || key.includes('approval')) return 'Controls whether this record can be used, posted, or selected in later ERP screens.';
    if (key.includes('serial') || key.includes('batch') || key.includes('lot') || key.includes('expiry')) return 'Controls traceability, warranty, expiry, QC, and item-level stock validation.';

    return 'Used by this screen for validation, search, reporting, and downstream ERP workflow.';
  }

  private fieldTypeLabel(field: InventoryField): string {
    switch (field.type) {
      case 'select': return 'single selection';
      case 'multiselect': return 'multiple selection';
      case 'number': return 'numeric';
      case 'date': return 'date';
      case 'textarea': return 'long text';
      case 'file': return 'file upload';
      default: return 'text';
    }
  }

  fieldTypingHint(field: InventoryField): string {
    const label = field.label || this.labelFromKey(field.key);
    const key = `${field.key} ${label}`.toLowerCase();

    if (this.config?.key === 'variantMaster' && field.key.toLowerCase() === 'attributevalue') {
      return this.variantAttributeValuePlaceholder(this.formValues()['attributeName']);
    }

    if (this.config?.key === 'purchaseRequisition' && field.key.toLowerCase() === 'requestedby') {
      if (!String(this.formValues()['branch'] || '').trim()) return 'Select Branch first';
      return this.purchaseRequisitionRequesterOptions().length
        ? 'Select mapped branch requester'
        : 'Map contact person in Branch Master for selected branch';
    }

    if (this.isStatusSwitchField(field)) return 'Switch to Active when this record can be used';
    if (this.isYesNoSwitchField(field)) return `Switch Yes when ${label.toLowerCase()} applies`;
    if (field.type === 'date') return `Select ${label} date`;
    if (field.type === 'file') return `Upload ${label}`;

    if (field.type === 'select' || field.type === 'multiselect') {
      const prefix = field.type === 'multiselect' ? 'Select one or more' : 'Select';
      const sample = (field.options || []).filter(Boolean).slice(0, 3).join(' / ');
      return sample ? `${prefix} ${label}, e.g. ${sample}` : `${prefix} ${label}`;
    }

    if (field.type === 'number') return this.numericTypingHint(label, key);

    if (key.includes('address') || key.includes('locationaddress')) return 'Type address, landmark, city and state';
    if (key.includes('gstin')) return 'Type GSTIN, e.g. 22AAAAA0000A1Z5';
    if (key.includes('pan')) return 'Type PAN, e.g. AAAAA0000A';
    if (key.includes('mobile') || key.includes('phone')) return 'Type 10-digit mobile number';
    if (key.includes('email') || key.includes('mail')) return 'Type email, e.g. name@company.com';
    if (key.includes('hsn') || key.includes('sac')) return 'Type HSN/SAC code or search by product/service';
    if (key.includes('gst') || key.includes('tax')) return 'Type GST/tax percent, e.g. 18';
    if (key.includes('uom code')) return 'Type UOM code, e.g. KG, NOS or BAG';
    if (key.includes('uom')) return 'Type or select UOM, e.g. KG, Nos or Bag';
    if (key.includes('sku')) return 'Type SKU or keep the auto-generated value';
    if (key.includes('code')) return `Type unique ${label.toLowerCase()} or keep auto-generated`;
    if (key.includes('serial')) return 'Type serial format or policy reference';
    if (key.includes('batch') || key.includes('lot')) return 'Type batch/lot format or policy reference';
    if (key.includes('description') || key.includes('remark') || key.includes('note')) return `Type ${label.toLowerCase()} details`;
    if (key.includes('product') || key.includes('item') || key.includes('service')) return `Type ${label.toLowerCase()} name or code`;
    if (key.includes('vendor') || key.includes('supplier') || key.includes('customer') || key.includes('party')) return `Type ${label.toLowerCase()} name or search contact`;
    if (key.includes('category') || key.includes('group')) return `Type ${label.toLowerCase()} name`;
    if (key.includes('name') || key.includes('title')) return `Type ${label}`;

    return `Type ${label}`;
  }

  lineColumnTypingHint(column: string, row?: string[]): string {
    const label = column || 'value';
    const key = label.toLowerCase();
    if (this.config?.key === 'variantMaster' && key.includes('attribute value')) {
      return this.variantAttributeValuePlaceholder(this.variantLineAttributeName(row));
    }

    const options = this.lineColumnOptions(label, row);

    if (options.length) {
      const sample = options.filter(Boolean).slice(0, 3).join(' / ');
      return sample ? `Select ${label}, e.g. ${sample}` : `Select ${label}`;
    }

    if (key.includes('date') || key.includes('expiry')) return `Enter ${label}, e.g. 05-Jun-2026`;
    if (key.includes('qty') || key.includes('quantity')) return `Enter ${label}, e.g. 10`;
    if (key.includes('factor') || key.includes('conversion')) {
      if (this.config?.key === 'productServiceMaster' && row) {
        const altUom = String(row[0] ?? '').trim();
        const baseUom = String(this.formValues()['baseUom'] ?? '').trim();
        if (altUom && baseUom) return `How many ${baseUom} in 1 ${altUom}? e.g. 100`;
        if (baseUom) return `How many ${baseUom} per 1 Alt UOM? e.g. 100`;
      }
      return `Enter ${label}, e.g. 50`;
    }
    if (key.includes('rate') || key.includes('price')) return `Enter ${label}, e.g. 100.00`;
    if (key.includes('amount') || key.includes('total') || key.includes('cost')) return `Enter ${label}, e.g. 1000.00`;
    if (key.includes('disc')) return `Enter ${label}, e.g. 5`;
    if (key.includes('gst') || key.includes('tax')) return `Enter ${label}, e.g. 18`;
    if (key.includes('uom')) return `Enter ${label}, e.g. KG or Nos`;
    if (key.includes('sku') || key.includes('product') || key.includes('item') || key.includes('material')) return `Type or scan ${label}`;
    if (key.includes('serial')) return `Enter ${label}, e.g. SN-1001`;
    if (key.includes('batch') || key.includes('lot')) return `Enter ${label}, e.g. LOT-001`;
    if (key.includes('remark') || key.includes('note')) return `Type ${label} details`;

    return `Type ${label}`;
  }

  private numericTypingHint(label: string, key: string): string {
    if (key.includes('qty') || key.includes('quantity')) return `Type ${label}, e.g. 10`;
    if (key.includes('rate') || key.includes('price')) return `Type ${label}, e.g. 100.00`;
    if (key.includes('amount') || key.includes('total') || key.includes('cost')) return `Type ${label}, e.g. 1000.00`;
    if (key.includes('gst') || key.includes('tax') || key.includes('cess')) return `Type ${label} percent, e.g. 18`;
    if (key.includes('factor') || key.includes('conversion')) return `Type ${label}, e.g. 50`;
    if (key.includes('level') || key.includes('stock') || key.includes('capacity')) return `Type ${label}, e.g. 100`;
    return `Type ${label}, e.g. 0`;
  }

  private labelFromKey(key: string): string {
    return String(key || 'value')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, match => match.toUpperCase());
  }

  openAddMaster(master: string, sourceFieldKey?: string): void {
    const current = this.activeAddMaster();
    const currentName = this.quickAddName();
    if (current) {
      this.quickAddParentMaster.set(current);
      this.quickAddParentName.set(currentName);
      this.quickAddParentCode.set(this.quickAddCode());
    } else {
      this.quickAddParentMaster.set('');
      this.quickAddParentName.set('');
      this.quickAddParentCode.set('');
    }
    this.activeAddMaster.set(master);
    this.addMasterSourceFieldKey.set(sourceFieldKey ?? null);
    this.quickAddName.set('');
    this.quickAddCode.set('');
    this.quickAddError.set('');
    this._quickAddCodeManuallySet = false;
    this.quickAddUomSymbol.set('');
    this.quickAddUomType.set('Base');

    if (master === 'Variant') {
      this.quickAddVariantRows.set([{name: '', value: ''}]);
    }

    if (master === 'Attribute') {
      this.formValues.update(fv => ({
        ...fv,
        quickAttributeCategoryName: this.selectedProductCategory() || '',
        quickAttributeType: 'Text',
        quickAttributeValues: '',
        quickAttributeMandatory: 'No',
        quickAttributeStatus: 'active'
      }));
    }

    if (master === 'Serial Number Policy' || master === 'Batch / Lot Policy') {
      // Pre-populate category: from parent Category modal name, or from the product's selected category
      const parentCat = current === 'Category'
        ? currentName
        : (this.selectedProductCategory() || '');
      if (parentCat) {
        const fieldKey = master === 'Serial Number Policy' ? 'quickApplicableCategory' : 'quickApplicableFor';
        this.formValues.update(fv => ({ ...fv, [fieldKey]: parentCat }));
      }
    }
  }

  addProductUomMappingRow(): void {
    if (this.config?.key !== 'productServiceMaster') {
      this.addEntryLineRow();
      return;
    }

    const baseUom = String(this.formValues()['baseUom'] || '').trim();
    if (!baseUom) {
      this.saveError.set('Select Base UOM before adding Product UOM mapping.');
      return;
    }

    this.saveError.set('');
    this.setProductUomMappingRequired(true);
    if (!this.entryLineRows().some(row => !String(row[0] || '').trim())) {
      this.entryLineRows.update(rows => [...rows, this.blankLineRow()]);
    }
  }

  openProductUomQuickMap(): void {
    if (this.config?.key !== 'productServiceMaster') {
      this.openAddMaster('UOM Conversion');
      return;
    }

    const baseUom = String(this.formValues()['baseUom'] || '').trim();
    if (!baseUom) {
      this.saveError.set('Select Base UOM before adding Product UOM mapping.');
      return;
    }

    this.saveError.set('');
    this.quickAddError.set('');
    this.setProductUomMappingRequired(true);
    this.directEntryLineRows();
    if (!this.entryLineRows().length) {
      this.entryLineRows.set([this.blankLineRow()]);
    }
    this.formValues.update((values) => ({
      ...values,
      convAltUom: '',
      convFactor: '',
      convIsPurchase: values['convIsPurchase'] ?? true,
      convIsSales: values['convIsSales'] ?? true,
    }));
    this.openAddMaster('UOM Conversion');
    this.openAddMaster('UOM', 'convAltUom');
  }

  isQuickUomMappingContext(): boolean {
    return this.config?.key === 'productServiceMaster'
      && this.quickAddParentMaster() === 'UOM Conversion'
      && this.addMasterSourceFieldKey() === 'convAltUom';
  }

  protected restoreParentModal(): void {
    const parent = this.quickAddParentMaster();
    if (parent) {
      this.activeAddMaster.set(parent);
      this.quickAddName.set(this.quickAddParentName());
      this.quickAddCode.set(this.quickAddParentCode());
      this.quickAddParentMaster.set('');
      this.quickAddParentName.set('');
      this.quickAddParentCode.set('');
      this.quickAddError.set('');
    } else {
      this.closeAddMaster();
    }
  }

  onQuickAddNameChange(name: string): void {
    const normalizedName = toInventoryTitleCase(name ?? '');
    this.quickAddName.set(normalizedName);
    if ((this.activeAddMaster() === 'Variant' || this.activeAddMaster() === 'UOM') && !this._quickAddCodeManuallySet) {
      this.quickAddCode.set(normalizedName ? this.generateCodeFromName(normalizedName) : '');
    }
  }

  onQuickAddCodeChange(code: string): void {
    this.quickAddCode.set(String(applyInventoryTextCase(code ?? '', 'upper')));
    this._quickAddCodeManuallySet = !!code.trim();
  }

  onQuickAddUomSymbolChange(symbol: string): void {
    this.quickAddUomSymbol.set(String(applyInventoryTextCase(symbol ?? '', 'upper')));
  }

  onQuickCategorySaved(item: CategoryItem): void {
    const name = item.category_name;
    if (!this.categoryOptionList().includes(name)) {
      this.categoryOptionList.update(opts => [...opts, name]);
    }
    if (item?.id) {
      this.loadedCategoryObjects.update(items =>
        items.some(existing => existing.id === item.id)
          ? items.map(existing => existing.id === item.id ? item : existing)
          : [...items, item]
      );
    }
    const sourceKey = this.addMasterSourceFieldKey();
    if (sourceKey) this.collectFormField(sourceKey, name);
    if (this.config?.key === 'productServiceMaster') {
      this.selectedProductCategory.set(name);
      this.queueTaxCodeSearch(true);
    }
    if (this.quickAddParentMaster() === 'Business Segment') {
      const cur: string[] = Array.isArray(this.formValues()['segmentCategories']) ? this.formValues()['segmentCategories'] : [];
      if (!cur.includes(name)) this.collectFormField('segmentCategories', [...cur, name]);
    }
    this.completeQuickGlobalMasterSave(item, 'categoryMaster', () => {
      this.restoreParentModal();
      this.loadLookupOptions();
    });
  }

  saveQuickUom(): void {
    const name = this.quickAddName().trim();
    if (!name) { this.quickAddError.set('UOM name is required.'); return; }
    if (this.isSavingQuickAdd()) return;

    const code   = this.quickAddCode().trim() || this.generateCodeFromName(name);
    const symbol = this.quickAddUomSymbol().trim() || null;
    const type   = this.quickAddUomType() || 'Base';
    const parentBeforeSave = this.quickAddParentMaster();
    const sourceKey = this.addMasterSourceFieldKey();
    const isQuickProductMapping = this.isQuickUomMappingContext();
    const fallbackLabel = symbol ? `${name} (${symbol})` : name;

    if (isQuickProductMapping) {
      const values = this.formValues();
      const baseUom = String(values['baseUom'] || '').trim();
      const factor = this.parseDecimalNumber(values['convFactor']);
      const baseLookup = this.findUomBySelection(baseUom);
      const newUomMatchesBase = [name, code, symbol, fallbackLabel]
        .filter((value): value is string => !!value)
        .some(value => {
          const raw = value.trim().toLowerCase();
          return raw === baseUom.toLowerCase()
            || raw === (baseLookup?.uom_name || '').toLowerCase()
            || raw === (baseLookup?.uom_code || '').toLowerCase()
            || raw === (baseLookup?.uom_symbol || '').toLowerCase()
            || raw === this.uomDisplayLabel(baseLookup).toLowerCase();
        });

      if (!baseUom) {
        this.quickAddError.set('Select Base UOM on product before mapping.');
        return;
      }
      if (newUomMatchesBase) {
        this.quickAddError.set('Mapping UOM must be different from Base UOM.');
        return;
      }
      if (!Number.isFinite(factor) || factor <= 0) {
        this.quickAddError.set('Enter a valid conversion factor for the new UOM.');
        return;
      }
    }

    this.isSavingQuickAdd.set(true);
    this.quickAddError.set('');
    this.inventoryConfigService.saveUom(
      { segment_id: this.selectedSegmentId(), uom_code: code, uom_name: name, uom_symbol: symbol, uom_type: type, status: 'active' }, null
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiResponse<any>) => {
          this.isSavingQuickAdd.set(false);
          if (res.success) {
            const label = this.uomDisplayLabel(res.data) || fallbackLabel;
            if (!this.uomOptionList().includes(label)) {
              this.uomOptionList.update(opts => [...opts, label]);
            }
            if (res.data) {
              this.loadedUomObjects.update(items =>
                items.some(item => item.id === res.data?.id)
                  ? items
                  : [...items, res.data as UomItem]
              );
            }
            if (sourceKey === 'applicableUoms') {
              const cur: string[] = Array.isArray(this.formValues()['applicableUoms']) ? this.formValues()['applicableUoms'] : [];
              if (!cur.includes(label)) this.collectFormField('applicableUoms', [...cur, label]);
            } else if (sourceKey) {
              this.collectFormField(sourceKey, label);
            }
            if (parentBeforeSave === 'Business Segment') {
              const cur: string[] = Array.isArray(this.formValues()['segmentUoms']) ? this.formValues()['segmentUoms'] : [];
              if (!cur.includes(label)) this.collectFormField('segmentUoms', [...cur, label]);
            }
            this.completeQuickGlobalMasterSave(res.data, 'uomMaster', () => {
              if (isQuickProductMapping) {
                this.collectFormField('convAltUom', label);
                this.addUomConversionRow();
                this.loadLookupOptions();
                return;
              }
              this.restoreParentModal();
              this.loadLookupOptions();
            });
          } else {
            this.quickAddError.set(res.message || 'Failed to save UOM.');
          }
        },
        error: (err: any) => {
          this.isSavingQuickAdd.set(false);
          this.quickAddError.set(this.apiErrorMessage(err, 'Failed to save UOM.'));
        }
      });
  }

  saveQuickProductType(): void {
    const name = this.quickAddName().trim();
    if (!name) { this.quickAddError.set('Product Nature name is required.'); return; }
    this.isSavingQuickAdd.set(true);
    this.quickAddError.set('');
    const payload: Record<string, any> = {
      typeName: name,
      typeCode: name.replace(/\s+/g, '_').toUpperCase().slice(0, 20),
      status: 'active'
    };
    this.inventoryConfigService.saveProductType(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.isSavingQuickAdd.set(false);
          const saved = res.data;
          if (saved) {
            this.loadedProductTypeObjects.update(list => [...list, saved]);
            if (!this._productTypeOptions().includes(saved.type_name)) {
              this._productTypeOptions.update(opts => [...opts, saved.type_name]);
            }
          }
          const sourceKey = this.addMasterSourceFieldKey();
          if (sourceKey) this.collectFormField(sourceKey, saved?.type_name ?? name);
          if (sourceKey === 'productType' && saved) {
            this.collectFormField('productNatureId', saved.id);
            this.collectFormField('productNatureName', saved.type_name);
          }
          this.restoreParentModal();
        },
        error: (err: any) => {
          this.isSavingQuickAdd.set(false);
          this.quickAddError.set(this.apiErrorMessage(err, 'Failed to save product nature.'));
        }
      });
  }

  saveQuickAttribute(): void {
    const name = this.quickAddName().trim();
    if (!name) { this.quickAddError.set('Attribute name is required.'); return; }
    if (this.isSavingQuickAdd()) return;
    const v = this.formValues();
    const rawValues = String(v['quickAttributeValues'] || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const attributeType = this.attributeTypeForApi(v['quickAttributeType']);
    const typeKey = attributeType.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if ((typeKey === 'dropdown' || typeKey === 'multiselect') && !rawValues.length) {
      this.quickAddError.set('Possible Values are required for Dropdown / Multi Select attributes.');
      return;
    }
    this.isSavingQuickAdd.set(true);
    this.quickAddError.set('');
    this.inventoryConfigService.saveAttribute({
      segment_id: this.selectedSegmentId(),
      category_name: v['quickAttributeCategoryName'] || null,
      attribute_name: name,
      attribute_type: attributeType,
      possible_values: rawValues.length ? rawValues : null,
      is_mandatory: v['quickAttributeMandatory'] === true || v['quickAttributeMandatory'] === 'Yes',
      status: String(v['quickAttributeStatus'] || 'active').toLowerCase()
    }, null).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<any>) => {
        this.isSavingQuickAdd.set(false);
        if (res.success) {
          if (!this.attributeOptionList().includes(name)) {
            this.attributeOptionList.update(opts => [...opts, name]);
          }
          if (res.data) {
            const saved = res.data as AttributeItem;
            this.loadedAttributeObjects.update(items =>
              items.some(item => item.id === saved.id)
                ? items.map(item => item.id === saved.id ? saved : item)
                : [...items, saved]
            );
            this.allAttributeObjects.update(items =>
              items.some(item => item.id === saved.id)
                ? items.map(item => item.id === saved.id ? saved : item)
                : [...items, saved]
            );
          }
          const sourceKey = this.addMasterSourceFieldKey();
          if (sourceKey) this.collectFormField(sourceKey, name);
          this.restoreParentModal();
          this.loadLookupOptions();
        } else {
          this.quickAddError.set(res.message || 'Failed to save attribute.');
        }
      },
      error: (err: any) => {
        this.isSavingQuickAdd.set(false);
        this.quickAddError.set(this.apiErrorMessage(err, 'Failed to save attribute.'));
      }
    });
  }

  saveQuickBrand(): void {
    const name = this.quickAddName().trim();
    if (!name) { this.quickAddError.set('Brand name is required.'); return; }
    if (this.isSavingQuickAdd()) return;
    const v = this.formValues();
    const code = this.quickAddCode().trim() || null;
    this.isSavingQuickAdd.set(true);
    this.quickAddError.set('');
    this.inventoryConfigService.saveBrand({
      segment_id: this.selectedSegmentId(),
      brand_code: code,
      brand_name: name,
      manufacturer: v['quickManufacturer'] || null,
      website: v['quickWebsite'] || null,
      country: v['quickCountry'] || null,
      status: 'active'
    }, null).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<any>) => {
        this.isSavingQuickAdd.set(false);
        if (res.success) {
          if (!this.brandOptionList().includes(name)) {
            this.brandOptionList.update(opts => [...opts, name]);
          }
          const mfr = (v['quickManufacturer'] || '').trim();
          if (mfr && !this.manufacturerOptionList().includes(mfr)) {
            this.manufacturerOptionList.update(opts => [...opts, mfr]);
          }
          const sourceKey = this.addMasterSourceFieldKey();
          if (sourceKey) this.collectFormField(sourceKey, name);
          this.restoreParentModal();
          this.loadLookupOptions();
        } else {
          this.quickAddError.set(res.message || 'Failed to save brand.');
        }
      },
      error: (err: any) => {
        this.isSavingQuickAdd.set(false);
        this.quickAddError.set(this.apiErrorMessage(err, 'Failed to save brand.'));
      }
    });
  }

  saveQuickVariant(): void {
    const name = this.quickAddName().trim();
    if (!name) { this.quickAddError.set('Variant name is required.'); return; }
    if (this.isSavingQuickAdd()) return;
    const code = this.quickAddCode().trim() || this.generateCodeFromName(name) || null;
    const filledRows = this.quickAddVariantRows().filter(r => r.name?.trim());
    const attributePayloads = filledRows.map((r, i) => ({
      attribute_name: r.name,
      attribute_value: this.variantAttributeValueForPayload(r.value),
      display_order: i + 1
    }));
    const attributeError = this.variantAttributesValidationMessage(
      filledRows.map(r => ({attribute_name: r.name, attribute_value: r.value}))
    );
    if (attributeError) { this.quickAddError.set(attributeError); return; }
    const firstAttr = attributePayloads[0];
    this.isSavingQuickAdd.set(true);
    this.quickAddError.set('');
    this.inventoryConfigService.saveVariant({
      segment_id: this.selectedSegmentId(),
      variant_code: code,
      variant_name: name,
      attribute_name: firstAttr?.attribute_name ?? null,
      attribute_value: firstAttr?.attribute_value ?? null,
      attributes: attributePayloads,
      status: 'active'
    }, null).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<any>) => {
        this.isSavingQuickAdd.set(false);
        if (res.success) {
          const optionName = res.data ? this.variantDisplayLabel(res.data) : name;
          if (!this.variantOptionList().includes(optionName)) {
            this.variantOptionList.update(opts => [...opts, optionName]);
          }
          const sourceKey = this.addMasterSourceFieldKey();
          if (sourceKey === 'applicableVariants') {
            // Multi-select context: add directly to selection and to loaded objects
            if (res.data) {
              this.loadedVariantObjects.update(objs =>
                objs.some(v => v.id === res.data!.id) ? objs : [...objs, res.data!]
              );
              const newVariant: ProductApplicableVariant = {
                id: res.data.id,
                variant_name: res.data.variant_name,
                variant_label: optionName,
                is_default: false,
              };
              const nextVariants = this.selectedApplicableVariants().some(av => av.id === newVariant.id)
                ? this.selectedApplicableVariants()
                : [...this.selectedApplicableVariants(), newVariant];
              this.applyApplicableVariantSelection(nextVariants);
            }
          } else if (sourceKey) {
            this.collectFormField(sourceKey, optionName);
          }
          this.restoreParentModal();
          this.loadLookupOptions();
        } else {
          this.quickAddError.set(res.message || 'Failed to save variant.');
        }
      },
      error: (err: any) => {
        this.isSavingQuickAdd.set(false);
        this.quickAddError.set(this.apiErrorMessage(err, 'Failed to save variant.'));
      }
    });
  }

  saveQuickSerialPolicy(): void {
    const name = this.quickAddName().trim();
    if (!name) { this.quickAddError.set('Policy name is required.'); return; }
    if (this.isSavingQuickAdd()) return;
    const v = this.formValues();
    const code = this.quickAddCode().trim() || null;
    this.isSavingQuickAdd.set(true);
    this.quickAddError.set('');
    this.inventoryConfigService.saveSerialPolicy({
      segment_id: this.selectedSegmentId(),
      policy_code: code,
      policy_name: name,
      category_name: v['quickApplicableCategory'] || null,
      serial_format: v['quickSerialFormat'] || null,
      capture_stage: this.normalizeCaptureStage(v['quickCaptureStage']),
      status: 'active'
    }, null).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<any>) => {
        this.isSavingQuickAdd.set(false);
        if (res.success) {
          const policyName = res.data?.policy_name || name;
          if (!this.serialPolicyOptionList().includes(policyName)) {
            this.serialPolicyOptionList.update(opts => [...opts, policyName]);
          }
          const sourceKey = this.addMasterSourceFieldKey();
          if (sourceKey) this.collectFormField(sourceKey, policyName);
          this.restoreParentModal();
          this.loadLookupOptions();
        } else {
          this.quickAddError.set(res.message || 'Failed to save serial policy.');
        }
      },
      error: (err: any) => {
        this.isSavingQuickAdd.set(false);
        this.quickAddError.set(this.apiErrorMessage(err, 'Failed to save serial policy.'));
      }
    });
  }

  saveQuickBatchPolicy(): void {
    const name = this.quickAddName().trim();
    if (!name) { this.quickAddError.set('Policy name is required.'); return; }
    if (this.isSavingQuickAdd()) return;
    const v = this.formValues();
    const code = this.quickAddCode().trim() || null;
    this.isSavingQuickAdd.set(true);
    this.quickAddError.set('');
    this.inventoryConfigService.saveBatchPolicy({
      segment_id: this.selectedSegmentId(),
      policy_code: code,
      policy_name: name,
      category_name: v['quickApplicableFor'] || null,
      batch_format: v['quickBatchFormat'] || null,
      expiry_required: v['quickExpiryRequired'] === true,
      qc_required: v['quickQcRequired'] === true,
      status: 'active'
    }, null).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<any>) => {
        this.isSavingQuickAdd.set(false);
        if (res.success) {
          const policyName = res.data?.policy_name || name;
          if (!this.batchPolicyOptionList().includes(policyName)) {
            this.batchPolicyOptionList.update(opts => [...opts, policyName]);
          }
          const sourceKey = this.addMasterSourceFieldKey();
          if (sourceKey) this.collectFormField(sourceKey, policyName);
          this.restoreParentModal();
          this.loadLookupOptions();
        } else {
          this.quickAddError.set(res.message || 'Failed to save batch policy.');
        }
      },
      error: (err: any) => {
        this.isSavingQuickAdd.set(false);
        this.quickAddError.set(this.apiErrorMessage(err, 'Failed to save batch policy.'));
      }
    });
  }

  addUomConversionRow(): void {
    const v = this.formValues();
    const altUom = (v['convAltUom'] || '').trim();
    const baseUom = (v['baseUom'] || '').trim();
    const factor = this.parseDecimalNumber(v['convFactor']);
    if (!baseUom) { this.quickAddError.set('Select Product Base UOM before mapping alternate UOM.'); return; }
    if (!altUom) { this.quickAddError.set('Alternate UOM is required.'); return; }
    if (this.sameUomSelection(baseUom, altUom)) { this.quickAddError.set('Alternate UOM and Base UOM cannot be the same.'); return; }
    if (this.entryLineRows().some(row => this.sameUomSelection(row[0], altUom))) {
      this.quickAddError.set('This Alternate UOM is already mapped for this product.');
      return;
    }
    if (!Number.isFinite(factor) || factor <= 0) { this.quickAddError.set('Conversion factor must be greater than zero.'); return; }
    const row = [
      altUom,
      String(factor),
      v['convIsPurchase'] !== false ? 'Yes' : 'No',
      v['convIsSales'] !== false ? 'Yes' : 'No',
      'Yes'
    ];
    this.entryLineRows.update(rows => [...rows, row]);
    this.formValues.update(fv => ({ ...fv, convAltUom: '', convFactor: '', convIsPurchase: true, convIsSales: true }));
    this.quickAddError.set('');
    this.closeAddMaster();
  }

  changeSegment(segment: string): void {
    this.selectedSegment.set(segment);
  }

  onSegmentChangedByUser(segment: string): void {
    if (!segment || this.optionEquals(this.selectedSegment(), segment)) return;
    this.clearConfigForm();
    this.selectedSegment.set(segment);
  }

  setPosEnabled(enabled: boolean): void {
    this.posEnabled.set(enabled);
  }

  setWarehouseRequired(required: boolean): void {
    this.warehouseRequired.set(required);
  }

  setBranchContactRequired(required: boolean): void {
    this.branchContactRequired.set(required);
  }

  setPartyContactRequired(required: boolean): void {
    this.partyContactRequired.set(required);
    if (!required) {
      this.selectedPartyContactPerson.set(null);
    }
  }

  setConsumptionApprovalRequired(required: boolean): void {
    this.consumptionApprovalRequired.set(required);
  }

  setApprovalLevel(level: string): void {
    this.approvalLevel.set(level);

    if (level === 'Single Level') {
      this.selectedLevelTwoApprover.set(null);
      this.selectedFinalApprover.set(null);
    }

    if (level === 'Two Level') {
      this.selectedFinalApprover.set(null);
    }
  }

  selectLevelOneApprover(contact: GlobalContactOption | null): void {
    this.selectedLevelOneApprover.set(contact);
  }

  selectLevelTwoApprover(contact: GlobalContactOption | null): void {
    this.selectedLevelTwoApprover.set(contact);
  }

  selectFinalApprover(contact: GlobalContactOption | null): void {
    this.selectedFinalApprover.set(contact);
  }

  selectPartyContact(contact: GlobalContactOption | null): void {
    this.selectedPartyContact.set(contact);
    this.collectFormField('name', contact?.name || '');
    this.collectFormField('type', contact?.type || 'Company');
    this.collectFormField('gstin', contact?.gstin || '');
    this.collectFormField('pan', contact?.pan || '');
    this.collectFormField('mobile', contact?.mobile || '');
    this.collectFormField('email', contact?.email || '');
    this.collectFormField('address', contact?.address || '');
  }

  selectPartyContactPerson(contact: GlobalContactOption | null): void {
    this.selectedPartyContactPerson.set(contact);
  }

  isPartyMaster(): boolean {
    return this.config?.key === 'vendorMaster' || this.config?.key === 'customerMaster';
  }

  partyLabel(): string {
    return this.config?.key === 'vendorMaster' ? 'Vendor' : 'Customer';
  }

  setUomConversionRequired(required: boolean): void {
    if (this.config?.key === 'uomMaster' && required && !this.uomConversionMappingAvailable()) {
      this.saveError.set('Save the UOM first. After it is saved, map alternate UOM conversions for this base UOM.');
      this.uomConversionRequired.set(false);
      return;
    }
    this.uomConversionRequired.set(required);
    if (this.config?.key === 'uomMaster' && required) {
      this.entryLineRowsKey.set('uomMaster');
      const rows = this.entryLineRows().filter(row => row.some(cell => String(cell ?? '').trim()));
      this.entryLineRows.set(rows.length ? rows : [this.blankUomConversionRow()]);
    }
  }

  setProductBatchApplicable(required: boolean): void {
    if (!required && this.categoryRequiresBatchPolicy()) {
      this.saveError.set('Selected category requires Batch / Lot Policy.');
      this.productBatchApplicable.set(true);
      this.productTrackingRequired.set(true);
      return;
    }
    this.productBatchApplicable.set(required);
    if (!required) this.collectFormField('batchPolicyName', null);
  }

  setProductSerialApplicable(required: boolean): void {
    if (!required && this.categoryRequiresSerialPolicy()) {
      this.saveError.set('Selected category requires Serial Number Policy.');
      this.productSerialApplicable.set(true);
      this.productTrackingRequired.set(true);
      return;
    }
    this.productSerialApplicable.set(required);
    if (!required) this.collectFormField('serialPolicyName', null);
  }

  setProductExpiryApplicable(required: boolean): void {
    this.productExpiryApplicable.set(required);
  }

  setProductQcRequired(required: boolean): void {
    this.productQcRequired.set(required);
  }

  setProductTaxUomRequired(required: boolean): void {
    this.productTaxUomRequired.set(required);
  }

  setProductBrandRequired(required: boolean): void {
    this.productBrandRequired.set(required);
    if (!required) this.collectFormField('brand', null);
  }

  setProductVariantRequired(required: boolean): void {
    this.productVariantRequired.set(required);
    if (!required) {
      this.collectFormField('variant', null);
      this.selectedApplicableVariants.set([]);
      this.variantStockCombinationRows.set([]); this.pendingCombinationPicks.set({});
      this.pendingCombinationVariantId.set(null);
    }
  }

  setProductValuationRequired(required: boolean): void {
    this.productValuationRequired.set(required);
    if (!required) this.collectFormField('valuationMethod', null);
  }

  setProductBrandVariantValuationRequired(required: boolean): void {
    this.productBrandRequired.set(required);
    this.productVariantRequired.set(required);
    this.productValuationRequired.set(required);
    if (!required) {
      this.collectFormField('brand', null);
      this.collectFormField('variant', null);
      this.collectFormField('valuationMethod', null);
      this.selectedApplicableVariants.set([]);
      this.variantStockCombinationRows.set([]); this.pendingCombinationPicks.set({});
      this.pendingCombinationVariantId.set(null);
      this.pendingVariantResolve.set(null);
    }
  }

  setProductUomMappingRequired(required: boolean): void {
    this.productUomMappingRequired.set(required);
    if (required) {
      this.entryLineRowsKey.set('productServiceMaster');
      const mappedRows = this.entryLineRows().filter(row => String(row[0] || '').trim());
      this.entryLineRows.set(mappedRows.length ? mappedRows : [this.blankLineRow()]);
      return;
    }

    if (!required) {
      this.entryLineRowsKey.set('productServiceMaster');
      this.entryLineRows.set([this.blankLineRow()]);
    }
  }

  setProductStockControlsRequired(required: boolean): void {
    this.productStockControlsRequired.set(required);
    if (required && this.selectedApplicableVariants().length) this.productVariantRequired.set(true);
    if (!required) this.pendingCombinationVariantId.set(null);
  }

  setProductTrackingRequired(required: boolean): void {
    if (!required && (this.categoryRequiresBatchPolicy() || this.categoryRequiresSerialPolicy())) {
      this.saveError.set('Selected category has mandatory tracking policy.');
      this.productTrackingRequired.set(true);
      return;
    }
    this.productTrackingRequired.set(required);
    if (!required) {
      this.setProductBatchApplicable(false);
      this.setProductSerialApplicable(false);
      this.productExpiryApplicable.set(false);
      this.productQcRequired.set(false);
    }
  }

  setProductAdditionalInfoRequired(required: boolean): void {
    this.productAdditionalInfoRequired.set(required);
  }

  setCategorySerialApplicable(required: boolean): void {
    this.categorySerialApplicable.set(required);
  }

  setCategoryBatchApplicable(required: boolean): void {
    this.categoryBatchApplicable.set(required);
  }

  toggleGridSearch(tableId: string): void {
    const isOpen = this.activeGridSearch() === tableId;
    this.activeGridSearch.set(isOpen ? '' : tableId);
    if (isOpen) {
      this.gridSearchText.set('');
    }
  }

  isGridSearchOpen(tableId: string): boolean {
    return this.activeGridSearch() === tableId;
  }

  setGridSearchText(value: string): void {
    this.gridSearchText.set(value);
  }

  sortBy(tableId: string, columnIndex: number): void {
    const current = this.sortState();
    const direction = current?.tableId === tableId && current.columnIndex === columnIndex && current.direction === 'asc'
      ? 'desc'
      : 'asc';
    this.sortState.set({ tableId, columnIndex, direction });
  }

  sortIcon(tableId: string, columnIndex: number): string {
    const current = this.sortState();
    if (current?.tableId !== tableId || current.columnIndex !== columnIndex) {
      return 'pi pi-sort-alt';
    }

    return current.direction === 'asc' ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down';
  }

  gridRows(tableId: string, rows: string[][]): string[][] {
    const sourceRows = tableId === 'records' && this.isApiWired() ? this.liveRows() : rows;
    const search = this.activeGridSearch() === tableId ? this.gridSearchText().trim().toLowerCase() : '';
    const filtered = search
      ? sourceRows.filter(row => row.some(cell => String(cell).toLowerCase().includes(search)))
      : [...sourceRows];
    const sort = this.sortState();

    if (sort?.tableId !== tableId) {
      return filtered;
    }

    return filtered.sort((a, b) => {
      const left = String(a[sort.columnIndex] ?? '');
      const right = String(b[sort.columnIndex] ?? '');
      const result = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
      return sort.direction === 'asc' ? result : -result;
    });
  }

  currentEntryRows(): string[][] {
    return this.pendingRows().map(r => r.display);
  }

  isPosView(): boolean {
    return this.config?.posMode === 'pos' || (this.config?.posMode === 'switch' && this.posEnabled());
  }

  displayFields() {
    const fields = this.isPosView() ? (this.config.posFields || this.config.fields || []) : (this.config.fields || []);
    return fields.map(field => this.runtimeField(field));
  }

  showTransactionHeader(): boolean {
    return this.config?.kind === 'transaction';
  }

  bodyDisplayFields(): InventoryField[] {
    if (!this.showTransactionHeader()) return this.displayFields();

    const numberKey = this.transactionNumberField()?.key;
    const dateKey = this.transactionDateField()?.key;
    const referenceKey = this.transactionReferenceField()?.key;

    return this.displayFields().filter(field =>
      !this.isBusinessSegmentField(field)
      && field.key !== numberKey
      && field.key !== dateKey
      && field.key !== referenceKey
    );
  }

  transactionSegmentValue(): string {
    return String(this.formValues()['segment'] || this.selectedSegment() || '');
  }

  transactionNumberField(): InventoryField | null {
    if (!this.showTransactionHeader()) return null;
    return this.displayFields().find(field => this.isPrimaryTransactionNumberField(field))
      || { key: 'transactionNo', label: `${this.transactionDocPrefix()} Number` };
  }

  transactionDateField(): InventoryField | null {
    if (!this.showTransactionHeader()) return null;
    return this.displayFields().find(field => this.isPrimaryTransactionDateField(field))
      || { key: 'transactionDate', label: 'Transaction Date', type: 'date' };
  }

  transactionReferenceField(): InventoryField | null {
    if (!this.showTransactionHeader()) return null;
    return this.displayFields().find(field => this.isPrimaryTransactionReferenceField(field)) || null;
  }

  transactionNumberValue(field: InventoryField): string {
    const live = this.formValues()[field.key];
    const existing = String(live || this.txDocNumber() || '').trim();
    return existing || this.generateTransactionDocNumber(field);
  }

  transactionNumberPlaceholder(field: InventoryField): string {
    return `${this.transactionDocPrefix(field)}-YY-00001`;
  }

  transactionDateValue(field: InventoryField): any {
    return this.formValues()[field.key] || this.todayIso();
  }

  transactionReferenceOptions(field: InventoryField): string[] {
    const docs = this.transactionReferenceDocs().map(doc => doc.doc_number).filter(Boolean);
    return docs.length ? docs : (field.options || []);
  }

  transactionReferenceUsesSelect(field: InventoryField): boolean {
    return !!this.purchaseReferenceType()
      || !!this.salesReferenceType()
      || field.type === 'select'
      || this.transactionReferenceOptions(field).length > 0;
  }

  selectTransactionReference(field: InventoryField, value: any): void {
    const doc = this.transactionReferenceDocs().find(item => item.doc_number === value);
    if (doc) {
      if (this.purchaseReferenceType()) {
        this.selectPurchaseReference(doc);
      } else {
        this.selectSalesReference(doc);
      }
      return;
    }

    this.collectFormField(field.key, value);
  }

  private isBusinessSegmentField(field: InventoryField): boolean {
    const key = field.key.toLowerCase();
    const label = field.label.toLowerCase();
    return key === 'segment' || label.includes('business segment');
  }

  private isPrimaryTransactionNumberField(field: InventoryField): boolean {
    const key = field.key.toLowerCase();
    const label = field.label.toLowerCase();
    if (key === 'referenceno' || label.includes('reference')) return false;
    if (key.includes('vendorinvoice') || label.includes('vendor invoice')) return false;
    if (key.includes('vehicle') || label.includes('vehicle')) return false;
    if (key.includes('mobile') || label.includes('mobile')) return false;
    if (key.includes('gstin') || key.includes('pan') || key === 'lrno') return false;
    return key.endsWith('no')
      || key.endsWith('number')
      || label.endsWith(' no')
      || label.endsWith(' no.')
      || label.includes(' number');
  }

  private isPrimaryTransactionDateField(field: InventoryField): boolean {
    if (field.type !== 'date') return false;
    const key = field.key.toLowerCase();
    const label = field.label.toLowerCase();
    if (key.includes('required') || label.includes('required')) return false;
    if (key.includes('expected') || label.includes('expected')) return false;
    if (key.includes('valid') || label.includes('valid')) return false;
    if (key.includes('due') || label.includes('due')) return false;
    if (key.includes('expiry') || label.includes('expiry')) return false;
    if (key.includes('vendorinvoice') || label.includes('vendor invoice')) return false;
    return key.endsWith('date') || label.includes('date');
  }

  private isPrimaryTransactionReferenceField(field: InventoryField): boolean {
    const key = field.key.toLowerCase();
    const label = field.label.toLowerCase();
    if (this.isPrimaryTransactionNumberField(field) || this.isPrimaryTransactionDateField(field)) return false;
    if (key.includes('vendorinvoice') || label.includes('vendor invoice')) return false;
    return key === 'referenceno'
      || key === 'reference'
      || key.endsWith('reference')
      || key.endsWith('ref')
      || key.includes('linked')
      || label.includes('reference')
      || label.includes(' ref')
      || label.includes('linked');
  }

  private transactionDocPrefix(field?: InventoryField | null): string {
    const key = this.config?.key || '';
    const prefixes: Record<string, string> = {
      estimation: 'EST',
      proformaInvoice: 'PF',
      purchaseOrder: 'PO',
      goodsReceipt: 'GRN',
      purchaseInvoice: 'PI',
      salesInvoice: 'INV',
      posBilling: 'POS',
      stockTransfer: 'ST',
      stockAdjustment: 'SA',
      purchaseRequisition: 'PR',
      requestForQuotation: 'RFQ',
      purchaseReturn: 'PRR',
      salesEnquiry: 'SE',
      salesQuotation: 'SQ',
      salesOrder: 'SO',
      deliveryChallan: 'DC',
      salesReturn: 'SR',
      openingStockEntry: 'OS',
      cycleCount: 'CC',
      productionPlanning: 'PP',
      materialIssueProduction: 'MI',
      productionEntry: 'PRD',
      productionReturn: 'PRET',
      materialConsumption: 'CON',
      internalIssueSlip: 'IIS',
      shipmentEntry: 'SHP',
      gatePass: 'GP',
      debitNote: 'DN',
      creditNote: 'CN'
    };
    if (prefixes[key]) return prefixes[key];

    const label = field?.label || this.config?.title || 'TXN';
    const words = label
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[^A-Za-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .filter(word => !['number', 'no', 'date', 'transaction'].includes(word.toLowerCase()));
    return words.slice(0, 3).map(word => word[0]?.toUpperCase() || '').join('') || 'TXN';
  }

  private generateTransactionDocNumber(field?: InventoryField | null): string {
    const prefix = this.transactionDocPrefix(field);
    const segmentCode = this.segmentCodedDocNumberKeys().includes(this.config?.key || '')
      ? `-${this.transactionSegmentDocCode()}`
      : '';
    const yy = new Date().getFullYear().toString().slice(-2);
    const count = Math.max(this.savedRecordObjects().length, this.liveRows().length, this.config?.rows?.length || 0);
    const seq = String(count + this.pendingRows().length + 1).padStart(5, '0');
    return `${prefix}${segmentCode}-${yy}-${seq}`;
  }

  private segmentCodedDocNumberKeys(): string[] {
    return ['purchaseRequisition', 'requestForQuotation', 'purchaseOrder'];
  }

  private transactionSegmentDocCode(): string {
    const segmentName = this.transactionSegmentValue();
    const segment = this.loadedSegmentObjects().find(item => this.optionEquals(item.segment_name, segmentName));
    const source = segment?.segment_name || segment?.segment_code || segmentName;
    const letters = String(source || '').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2);
    if (letters.length === 1) return `${letters}X`;
    return letters || 'SS';
  }

  private todayIso(): string {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private runtimeOptions(field: InventoryField): string[] | undefined {
    if (field.type !== 'select' && field.type !== 'multiselect') return field.options;

    const key = field.key.toLowerCase();
    const label = field.label.toLowerCase();
    const addMaster = (field.addMaster || '').toLowerCase();

    if (this.config?.key !== 'businessSegments' && (key === 'segment' || label.includes('business segment') || addMaster.includes('business segment'))) {
      return this.segmentOptions;
    }

    if (['category', 'linkedcategory', 'applicablecategory', 'parentcategory'].includes(key) || addMaster === 'category') {
      return this.categoryOptions;
    }

    if (key.includes('uom') || addMaster === 'uom') {
      return this.uomOptions;
    }

    if (key.includes('hsnsac') || label.includes('hsn') || addMaster.includes('hsn')) {
      return this.hsnSacOptions;
    }

    if (['product', 'substituteproduct', 'finishedproduct', 'rawmaterials', 'applicableproducts'].includes(key) || addMaster === 'product / service') {
      return this.optionFallback(this.productOptions, field.options);
    }

    if (key.includes('vendor') || key.includes('supplier') || label.includes('vendor') || label.includes('supplier') || addMaster === 'vendor') {
      return this.optionFallback(this.vendorOptions, field.options);
    }

    if (key === 'customer' || key === 'party' || label.includes('customer') || addMaster === 'customer') {
      return this.optionFallback(this.customerOptions, field.options);
    }

    if (this.config?.key === 'purchaseRequisition' && key === 'requestedby') {
      return this.purchaseRequisitionRequesterOptions();
    }

    if (this.config?.key === 'purchaseRequisition' && key === 'branch') {
      return this.branchOptions;
    }

    if (key.includes('warehouse') || key.includes('location') || label.includes('warehouse') || label.includes('location') || addMaster === 'location') {
      return this.optionFallback(this.warehouseOptions, field.options);
    }

    if (key.includes('branch') || label.includes('branch')) {
      return this.optionFallback(this.branchOptions, field.options);
    }

    if (key.includes('paymentterms') || label.includes('payment terms')) {
      return this.optionFallback(this.paymentTermOptions, field.options);
    }

    if (key === 'brand' || addMaster === 'brand') {
      return this.brandOptions;
    }

    if (key === 'variant' || addMaster === 'variant') {
      return this.variantOptions;
    }

    if (key === 'attributename' || addMaster === 'attribute') {
      return this.attributeOptions;
    }

    if (this.config?.key === 'variantMaster' && key === 'attributevalue') {
      return this.variantAttributeValueOptions(this.formValues()['attributeName']);
    }

    return field.options;
  }

  private runtimeField(field: InventoryField): InventoryField {
    const next: InventoryField = { ...field, options: this.runtimeOptions(field) };
    if (this.config?.key !== 'variantMaster' || field.key.toLowerCase() !== 'attributevalue') {
      return next;
    }

    const attributeName = this.formValues()['attributeName'];
    const options = this.variantAttributeValueOptions(attributeName);
    if (options.length) {
      return { ...next, type: this.variantAttributeUsesMultiselect(attributeName) ? 'multiselect' : 'select', options };
    }
    return { ...next, type: this.variantAttributeValueInputType(attributeName), options: [] };
  }

  private optionFallback(primary: string[], fallback?: string[]): string[] {
    return primary.length ? primary : (fallback || []);
  }

  defaultFieldValue(field: InventoryField): string | string[] | undefined {
    const sourceValue = this.sourceFieldValue(field);
    if (sourceValue) return sourceValue;

    if (this.isApiWired()) {
      if (field.type === 'multiselect') return [];
      if (this.isStatusSwitchField(field)) return 'Active';
      if (this.isYesNoSwitchField(field)) return 'No';
      return '';
    }

    const cacheKey = `${this.config?.key || 'inventory'}:${field.key}`;
    if (!this.fieldDefaultValues.has(cacheKey)) {
      this.fieldDefaultValues.set(
        cacheKey,
        field.type === 'multiselect' ? (field.options || []).slice(0, 2) : field.options?.[0]
      );
    }

    return this.fieldDefaultValues.get(cacheKey);
  }

  sourceFieldValue(field: InventoryField): string {
    const fields = this.boundReferenceFields();
    const exactValue = fields[field.key] || fields[field.label];
    if (exactValue) return exactValue;

    const normalizedKey = `${field.key} ${field.label}`.toLowerCase();
    if (normalizedKey.includes('customer') || normalizedKey.includes('vendor') || normalizedKey.includes('party')) {
      return fields['customer'] || fields['vendor'] || fields['party'] || '';
    }

    if (normalizedKey.includes('quotation') || normalizedKey.includes('order') || normalizedKey.includes('reference')) {
      return this.boundReferenceLabels().join(', ');
    }

    return '';
  }

  isStatusSwitchField(field: InventoryField): boolean {
    return field.type === 'select'
      && field.key.toLowerCase().includes('status')
      && this.hasOptionPair(field, 'Active', 'Inactive');
  }

  isYesNoSwitchField(field: InventoryField): boolean {
    return field.type === 'select' && this.hasOptionPair(field, 'Yes', 'No');
  }

  fieldSwitchChecked(field: InventoryField): boolean {
    const live = this.formValues()[field.key];
    const value = live !== undefined ? live : this.defaultFieldValue(field);
    return value === 'Active' || value === 'Yes' || value === true;
  }

  setFieldSwitchChecked(field: InventoryField, checked: boolean): void {
    const displayVal = this.isStatusSwitchField(field)
      ? (checked ? 'Active' : 'Inactive')
      : (checked ? 'Yes' : 'No');
    const cacheKey = `${this.config?.key || 'inventory'}:${field.key}`;
    this.fieldDefaultValues.set(cacheKey, displayVal);
    this.collectFormField(field.key, displayVal);
  }

  fieldSwitchOnLabel(field: InventoryField): string {
    return this.isStatusSwitchField(field) ? 'Active' : 'Yes';
  }

  fieldSwitchOffLabel(field: InventoryField): string {
    return this.isStatusSwitchField(field) ? 'Inactive' : 'No';
  }

  private hasOptionPair(field: InventoryField, first: string, second: string): boolean {
    const options = field.options || [];
    return options.includes(first) && options.includes(second) && options.length === 2;
  }

  lineRows() {
    return this.config.lineRows || [];
  }

  directEntryLineRows(): string[][] {
    const key = this.config?.key || '';
    if (this.entryLineRowsKey() !== key) {
      this.entryLineRowsKey.set(key);
      if (key === 'productServiceMaster') {
        this.entryLineRows.set([this.blankLineRow()]);
      } else if (key === 'uomMaster' || key === 'variantMaster') {
        this.entryLineRows.set([this.blankLineRow()]);
      } else if (this.isPurchaseTransactionKey(key)) {
        this.entryLineRows.set([this.blankLineRow()]);
      } else {
        const rows = this.lineRows();
        this.entryLineRows.set(rows.length ? rows.map(row => this.normalizeLineRow(row)) : [this.blankLineRow()]);
      }
    }
    return this.entryLineRows();
  }

  addEntryLineRow(): void {
    this.directEntryLineRows();
    this.entryLineRows.update(rows => [...rows, this.blankLineRow()]);
  }

  removeEntryLineRow(rowIndex: number): void {
    this.directEntryLineRows();
    this.lineAttrValueMap.update(map => {
      const next: Record<string, string> = {};
      for (const [key, val] of Object.entries(map)) {
        const under = key.indexOf('_');
        if (under < 0) continue;
        const idx = parseInt(key.slice(0, under), 10);
        const rest = key.slice(under); // includes leading '_'
        if (idx < rowIndex) next[key] = val;
        else if (idx > rowIndex) next[`${idx - 1}${rest}`] = val;
      }
      return next;
    });
    this.entryLineRows.update(rows => {
      const nextRows = rows.filter((_, index) => index !== rowIndex);
      return nextRows.length ? nextRows : [this.blankLineRow()];
    });
  }

  setEntryLineCell(rowIndex: number, columnIndex: number, value: any): void {
    this.directEntryLineRows();
    const colName = this.config?.lineColumns?.[columnIndex] || '';
    const colKey = colName.toLowerCase();
    const resetsAttr = this.config?.kind === 'transaction' && (
      colKey.includes('product') || colKey.includes('item') || colKey.includes('sku') ||
      colKey.includes('material') || colKey.includes('variant')
    );
    if (resetsAttr) {
      this.lineAttrValueMap.update(map => {
        const next = { ...map };
        Object.keys(next).filter(k => k.startsWith(`${rowIndex}_`)).forEach(k => delete next[k]);
        return next;
      });
    }
    this.entryLineRows.update(rows => rows.map((row, index) => {
      if (index !== rowIndex) return row;
      const nextRow = this.normalizeLineRow(row);
      const column = this.config?.lineColumns?.[columnIndex] || '';
      const rawValue = this.config?.key === 'productServiceMaster' && column.toLowerCase().includes('factor')
        ? this.sanitizeDecimalInput(value)
        : value;
      const normalizedValue = this.normalizeLineCellTextCase(column, rawValue);
      nextRow[columnIndex] = normalizedValue;
      if (this.config?.key === 'variantMaster') {
        if (column.toLowerCase().includes('attribute name')) {
          const valueIndex = (this.config?.lineColumns || []).findIndex(candidate => candidate.toLowerCase().includes('attribute value'));
          if (valueIndex >= 0 && !this.variantAttributeValueAllowed(normalizedValue, nextRow[valueIndex])) {
            nextRow[valueIndex] = '';
          }
          if (valueIndex >= 0) {
            nextRow[valueIndex] = this.variantAttributeValueControlValue(normalizedValue, nextRow[valueIndex]);
          }
        }
      }
      if (this.config?.key === 'productServiceMaster' && column.toLowerCase().includes('alternate uom')) {
        const baseUom = this.formValues()['baseUom'];
        if (normalizedValue && baseUom && this.sameUomSelection(baseUom, normalizedValue)) {
          nextRow[columnIndex] = '';
          this.saveError.set('Alternate UOM and Base UOM cannot be the same.');
        } else if (normalizedValue && rows.some((candidate, candidateIndex) =>
          candidateIndex !== rowIndex && this.sameUomSelection(candidate[columnIndex], normalizedValue)
        )) {
          nextRow[columnIndex] = '';
          this.saveError.set('This Alternate UOM is already mapped for this product.');
        }
      }
      if (this.config?.kind === 'transaction') {
        const col = column.toLowerCase();
        const isProductCol = col.includes('product') || col.includes('item') || col.includes('sku') || col.includes('material');
        const isVariantCol = col.includes('variant');
        if (isProductCol || isVariantCol) {
          // Clear the Attribute column when product or variant changes
          const attrIdx = (this.config?.lineColumns || []).findIndex(c => c.toLowerCase() === 'attribute');
          if (attrIdx >= 0) nextRow[attrIdx] = '';
        }
        if (isProductCol) {
          const product = this.findProductBySelection(normalizedValue);
          if (product) {
            const uomIdx = (this.config?.lineColumns || []).findIndex(c => c.toLowerCase().includes('uom'));
            if (uomIdx >= 0) {
              const uomOptions = this.productUomOptionsForTransaction(product);
              const currentUom = nextRow[uomIdx];
              if (!currentUom || !uomOptions.some(option => this.optionEquals(option, currentUom))) {
                nextRow[uomIdx] = this.defaultProductUomForTransaction(product).name;
              }
            }
            const variantIdx = (this.config?.lineColumns || []).findIndex(c => c.toLowerCase().includes('variant'));
            if (variantIdx >= 0) {
              const variantOptions = this.productVariantOptionsForTransaction(product);
              const currentVariant = nextRow[variantIdx];
              if (!currentVariant || !variantOptions.some(option => this.optionEquals(option, currentVariant))) {
                nextRow[variantIdx] = variantOptions.length === 1 ? variantOptions[0] : '';
              }
            }
          }
        }
      }
      this.recalculateLineRow(nextRow);
      return nextRow;
    }));
  }

  setEntryLineYesNoCell(rowIndex: number, columnIndex: number, checked: boolean): void {
    this.setEntryLineCell(rowIndex, columnIndex, checked ? 'Yes' : 'No');
  }

  clearEntryLineRow(rowIndex: number): void {
    this.directEntryLineRows();
    this.lineAttrValueMap.update(map => {
      const next = { ...map };
      Object.keys(next).filter(k => k.startsWith(`${rowIndex}_`)).forEach(k => delete next[k]);
      return next;
    });
    this.entryLineRows.update(rows => rows.map((row, index) => index === rowIndex ? this.blankLineRow() : row));
  }

  lineTotalLabel(): string {
    return `Total: Rs. ${this.lineTotalAmount().toLocaleString('en-IN')}`;
  }

  lineTotalAmount(): number {
    return this.directEntryLineRows().reduce((total, row) => total + this.parseCurrency(row[this.amountColumnIndex()] || ''), 0);
  }

  isLineTotalColumn(column: string): boolean {
    return this.isLineQuantityColumn(column) || this.isLineAmountColumn(column);
  }

  lineColumnTotal(columnIndex: number): string {
    const column = this.config?.lineColumns?.[columnIndex] || '';
    const total = this.directEntryLineRows().reduce((sum, row) => sum + this.parseCurrency(row[columnIndex] || ''), 0);

    if (this.isLineAmountColumn(column)) {
      return `Rs. ${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    }

    return total.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  visibleLineColumns(): string[] {
    const columns = this.config?.lineColumns || [];
    if (!this.isPolicyAwarePurchaseLineGrid()) return columns;
    return columns.filter(column => this.shouldShowPolicyLineColumn(column));
  }

  lineCellValue(row: string[], column: string): string {
    const index = this.lineColumnIndex(column);
    return index >= 0 ? String(row[index] ?? '') : '';
  }

  setEntryLineCellByColumn(rowIndex: number, column: string, value: string): void {
    const index = this.lineColumnIndex(column);
    if (index >= 0) this.setEntryLineCell(rowIndex, index, value);
  }

  lineColumnTotalByColumn(column: string): string {
    const index = this.lineColumnIndex(column);
    return index >= 0 ? this.lineColumnTotal(index) : '';
  }

  lineColumnAppliesToRow(row: string[], column: string): boolean {
    if (!this.isPolicyAwarePurchaseLineGrid() || !this.isPolicyLineColumn(column)) return true;
    if (this.lineCellValue(row, column)) return true;

    const productName = this.lineValue(row, ['product', 'item', 'sku']);
    if (!productName) return false;

    const product = this.findProductBySelection(productName);
    if (!product) return false;

    return this.productSupportsLinePolicy(product, column);
  }

  scannerStatusMessage(): string {
    return this.scannerMessage();
  }

  // Returns a dynamic header for the Conversion Factor column showing the base UOM name.
  // e.g. "Conversion Factor (1 Alt = ? Dozen)"
  uomLineColumnHeader(column: string): string {
    if (this.config?.key === 'productServiceMaster' && column === 'Conversion Factor') {
      const baseUom = String(this.formValues()['baseUom'] ?? '').trim();
      return baseUom ? `Conversion Factor (1 Alt = ? ${baseUom})` : 'Conversion Factor';
    }
    return column;
  }

  // Inline hint shown below the factor input: "= 100 Dozen"
  uomConversionEquivalenceHint(column: string, row: string[], columnIndex: number): string {
    if (this.config?.key !== 'productServiceMaster') return '';
    if (!column.toLowerCase().includes('factor')) return '';
    const factor = this.parseDecimalNumber(row[columnIndex]);
    if (!Number.isFinite(factor) || factor <= 0) return '';
    const baseUom = String(this.formValues()['baseUom'] ?? '').trim();
    const altUom  = String(row[0] ?? '').trim();
    if (!baseUom || !altUom) return '';
    return `1 ${altUom} = ${factor} ${baseUom}`;
  }

  transactionStockControlHint(column: string, row: string[], columnIndex: number, rowIndex?: number): string {
    return this.transactionStockControlState(column, row, columnIndex, rowIndex)?.message || '';
  }

  transactionStockControlHintClass(column: string, row: string[], columnIndex: number, rowIndex?: number): string {
    const state = this.transactionStockControlState(column, row, columnIndex, rowIndex);
    if (!state) return '';
    if (state.severity === 'error') return 'inventory-stock-hint inventory-hint-error';
    if (state.severity === 'warn') return 'inventory-stock-hint inventory-hint-warn';
    return 'inventory-stock-hint';
  }

  private transactionStockControlState(
    column: string,
    row: string[],
    columnIndex: number,
    rowIndex?: number
  ): { message: string; severity: 'info' | 'warn' | 'error' } | null {
    if (this.config?.kind !== 'transaction') return null;
    if (!this.isStockQuantityColumn(column)) return null;

    const product = this.findProductBySelection(this.lineValue(row, ['product', 'item', 'sku', 'material']));
    if (!product || product.tracks_inventory === false || product.is_service) return null;

    const variantText = this.lineValue(row, ['variant']);
    const variantId = variantText
      ? this.productVariantOptionObjects(product).find(option => this.optionEquals(option.label, variantText))?.id ?? null
      : null;
    const attributeText = this.transactionLineAttributeText(row, rowIndex);
    const limits = this.productStockLimitsForLine(product, variantId, attributeText);
    const uom = this.uomNameFromSelection(this.lineValue(row, ['uom'])) || this.productBaseUomLabel(product);
    const factor = this.productUomConversionFactorForSelection(product, uom, this.config?.key || '');
    const valueInRowUom = (value: number) => factor > 0 ? value / factor : value;
    const qty = this.parseDecimalNumber(row[columnIndex]);
    const fmt = (value: number) => this.formatStockLimitQty(valueInRowUom(value));
    const uomLabel = uom ? ` ${uom}` : '';
    const isProcurement = this.transactionUomUsageForKey(this.config?.key || '') === 'purchase';

    if (isProcurement && !(limits.maxStock > 0)) {
      return {
        message: 'Max stock not configured',
        severity: Number.isFinite(qty) && qty > 0 ? 'error' : 'warn'
      };
    }

    const hasLimits = [limits.minStock, limits.maxStock, limits.reorderLevel, limits.reorderQty].some(value => Number(value) > 0);
    if (!hasLimits) return null;

    if (Number.isFinite(qty) && qty > 0) {
      if (limits.maxStock > 0 && qty > valueInRowUom(limits.maxStock)) {
        return { message: `Above max ${fmt(limits.maxStock)}${uomLabel}`, severity: 'error' };
      }
      if (limits.minStock > 0 && qty < valueInRowUom(limits.minStock)) {
        return { message: `Below min ${fmt(limits.minStock)}${uomLabel}`, severity: 'warn' };
      }
      if (limits.reorderLevel > 0 && qty < valueInRowUom(limits.reorderLevel)) {
        return { message: `Below reorder ${fmt(limits.reorderLevel)}${uomLabel}`, severity: 'warn' };
      }
    }

    const parts: string[] = [];
    if (limits.minStock > 0) parts.push(`Min ${fmt(limits.minStock)}`);
    if (limits.maxStock > 0) parts.push(`Max ${fmt(limits.maxStock)}`);
    if (limits.reorderLevel > 0) parts.push(`Reorder ${fmt(limits.reorderLevel)}`);
    if (limits.reorderQty > 0) parts.push(`ROQ ${fmt(limits.reorderQty)}`);
    return parts.length
      ? { message: `${parts.join(' | ')}${uomLabel}`, severity: 'info' }
      : null;
  }

  private stockControlValidationMessage(): string {
    if (this.config?.kind !== 'transaction') return '';
    if (this.transactionUomUsageForKey(this.config?.key || '') !== 'purchase') return '';
    this.directEntryLineRows();
    const columns = this.config?.lineColumns || [];
    for (const [rowIndex, row] of this.entryLineRows().map(item => this.normalizeLineRow(item)).entries()) {
      const productName = this.lineValue(row, ['product', 'item', 'sku', 'material']);
      if (!productName) continue;
      for (const [columnIndex, column] of columns.entries()) {
        const state = this.transactionStockControlState(column, row, columnIndex, rowIndex);
        if (state?.severity === 'error') {
          const action = state.message === 'Max stock not configured'
            ? 'Set Max Stock in Product Master before procurement.'
            : 'Reduce the qty before saving.';
          return `"${productName}": ${state.message}. ${action}`;
        }
      }
    }
    return '';
  }

  private isStockQuantityColumn(column: string): boolean {
    const key = String(column || '').toLowerCase();
    if (!(key.includes('qty') || key.includes('quantity'))) return false;
    return ![
      'rate', 'price', 'amount', 'value', 'gst', 'tax', 'disc', 'discount', 'weight',
      'available', 'system', 'physical', 'variance', 'shortage', 'rejected', 'returnable'
    ].some(word => key.includes(word));
  }

  private transactionLineAttributeText(row: string[], rowIndex?: number): string {
    if (rowIndex != null) {
      const selected = this.lineRowAttrSelections(rowIndex, row)
        .filter(attr => String(attr.value || '').trim())
        .map(attr => `${attr.name}: ${String(attr.value || '').trim()}`);
      if (selected.length) return selected.join(' | ');
    }
    return this.lineValue(row, ['attribute']);
  }

  protected productUomConversionFactorForSelection(product: ProductItem | null | undefined, uomSelection: string | null | undefined, key = this.config?.key || ''): number {
    if (!product) return 1;
    const selected = this.uomNameFromSelection(uomSelection || '');
    if (!selected) return 1;
    const base = this.productBaseUomLabel(product);
    if (base && this.sameUomSelection(base, selected)) return 1;
    const conversion = this.productUomConversionsForTransaction(product, key).find(candidate =>
      [
        this.productUomConversionLabel(candidate),
        candidate.from_uom_name,
        candidate.from_uom_symbol,
        candidate.alt_uom_name,
        candidate.alt_uom
      ].some(value => this.optionEquals(value, selected))
    );
    const factor = Number(conversion?.conversion_factor);
    return Number.isFinite(factor) && factor > 0 ? factor : 1;
  }

  private formatStockLimitQty(value: number): string {
    if (!Number.isFinite(value)) return '0';
    const rounded = Math.round(value * 1000) / 1000;
    return rounded.toLocaleString('en-IN', { maximumFractionDigits: 3 });
  }

  lineColumnOptions(column: string, row?: string[]): string[] {
    const key = column.toLowerCase();
    if (key.includes('item') || key.includes('product') || key.includes('sku') || key.includes('material')) {
      return this.config?.kind === 'transaction' ? this.productNamesForTransaction(this.config?.key ?? '') : this.productOptions;
    }
    if (key.includes('attribute name')) return this.attributeOptions;
    if (this.config?.key === 'variantMaster' && key.includes('attribute value')) {
      return this.variantAttributeValueOptions(this.variantLineAttributeName(row));
    }
    if (this.config?.key === 'productServiceMaster' && key.includes('alternate uom')) {
      return this.uomOptions;
    }
    const rowProduct = row ? this.findProductBySelection(this.lineValue(row, ['product', 'item', 'sku', 'material'])) : null;
    if (key.includes('variant') && rowProduct) return this.productVariantOptionsForTransaction(rowProduct);
    if (key.includes('variant')) return this.variantOptions;
    if (key === 'attribute' && row) return this.lineAttributeOptionsForVariantRow(rowProduct, this.lineValue(row, ['variant']));
    if (key.includes('uom') && rowProduct) return this.productUomOptionsForTransaction(rowProduct);
    if (key.includes('uom')) return this.uomOptions;
    if (key.includes('rounding')) return ['Exact', '2 Decimals', 'Whole Number', 'Commercial Rounding'];
    if (key.includes('is purchase') || key.includes('is sales') || key === 'active') return ['Yes', 'No'];
    if (key.includes('gst') || key.includes('tax')) return ['0%', '5%', '12%', '18%', '28%'];
    if (this.isPurchaseTransactionKey() && this.isPolicyLineColumn(column)) return [];
    if (key.includes('batch')) return ['NA', 'LOT-FOOD-001', 'LOT-DRN-001', 'LOT-CBL-011'];
    if (key.includes('serial')) return ['NA', 'SN-1042..46', 'IMEI Required', 'Auto Capture'];
    if (key.includes('warehouse') || key.includes('location') || key.includes('store')) return this.locationOptions;
    if (key.includes('expiry')) return ['NA', '18-Jun-2026', '18-Aug-2026', '30-Sep-2026'];
    return [];
  }

  private lineColumnIndex(column: string): number {
    return (this.config?.lineColumns || []).findIndex(candidate => candidate === column);
  }

  private isPolicyAwarePurchaseLineGrid(): boolean {
    return this.config?.key === 'goodsReceipt' || this.config?.key === 'purchaseInvoice';
  }

  private isPolicyLineColumn(column: string): boolean {
    const key = String(column || '').toLowerCase();
    return key.includes('batch') || key.includes('lot') || key.includes('serial') || key.includes('expiry');
  }

  private shouldShowPolicyLineColumn(column: string): boolean {
    if (!this.isPolicyLineColumn(column)) return true;

    this.directEntryLineRows();
    return this.entryLineRows().some(row => {
      const normalized = this.normalizeLineRow(row);
      if (this.lineCellValue(normalized, column)) return true;
      const productName = this.lineValue(normalized, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      return !!product && this.productSupportsLinePolicy(product, column);
    });
  }

  private productSupportsLinePolicy(product: ProductItem, column: string): boolean {
    const key = String(column || '').toLowerCase();
    const batch = !!product.batch_applicable;
    const serial = !!product.serial_applicable;
    if (key.includes('expiry')) return !!product.expiry_applicable;
    if (key.includes('serial') && !key.includes('batch')) return serial;
    if ((key.includes('batch') || key.includes('lot')) && !key.includes('serial')) return batch;
    if (key.includes('batch') || key.includes('serial')) return batch || serial;
    return true;
  }

  isYesNoLineColumn(column: string): boolean {
    const key = String(column || '').trim().toLowerCase();
    return key.includes('is purchase') || key.includes('is sales') || key === 'active';
  }

  lineCellYesNoChecked(value: any): boolean {
    const normalized = this.normalizeKey(value);
    if (value === true) return true;
    if (normalized === 'yes' || normalized === 'active' || normalized === 'true' || normalized === '1') return true;
    return false;
  }

  lineCellInputType(column: string, row?: string[]): 'number' | 'text' | 'date' {
    const key = column.toLowerCase();
    if (this.config?.key === 'variantMaster' && key.includes('attribute value')) {
      return this.variantAttributeValueInputType(this.variantLineAttributeName(row));
    }
    return 'text';
  }

  lineCellInputMode(column: string): 'decimal' | 'numeric' | 'text' | null {
    const key = column.toLowerCase();
    if (key.includes('factor') || key.includes('rate') || key.includes('amount') || key.includes('price') || key.includes('qty') || key.includes('quantity') || key.includes('gst') || key.includes('tax') || key.includes('disc')) {
      return 'decimal';
    }
    return null;
  }

  lineColumnUsesMultiSelect(column: string, row?: string[]): boolean {
    return this.config?.key === 'variantMaster'
      && column.toLowerCase().includes('attribute value')
      && this.variantAttributeUsesMultiselect(this.variantLineAttributeName(row));
  }

  lineCellControlValue(value: any, column: string, row?: string[]): any {
    if (this.config?.key === 'variantMaster' && column.toLowerCase().includes('attribute value')) {
      return this.variantAttributeValueControlValue(this.variantLineAttributeName(row), value);
    }
    return value;
  }

  private variantLineAttributeName(row?: string[]): string {
    if (!row) return String(this.formValues()['attributeName'] || '');
    const attributeColumnIndex = (this.config?.lineColumns || []).findIndex(column => column.toLowerCase().includes('attribute name'));
    return attributeColumnIndex >= 0 ? String(row[attributeColumnIndex] || '') : '';
  }

  private normalizeLineRow(row: string[]): string[] {
    const columnCount = this.config?.lineColumns?.length || row.length;
    return Array.from({ length: columnCount }, (_, index) => row[index] || '');
  }

  private blankLineRow(): string[] {
    if (this.config?.key === 'uomMaster') return this.blankUomConversionRow();
    if (this.config?.key === 'productServiceMaster') {
      return (this.config?.lineColumns || []).map(column => {
        const key = column.toLowerCase();
        if (key.includes('purchase') || key.includes('sales') || key === 'active') return 'Yes';
        return '';
      });
    }
    if (this.isPurchaseTransactionKey(this.config?.key || '')) {
      return (this.config?.lineColumns || []).map(column => {
        const key = column.toLowerCase();
        if (key.includes('disc')) return '0';
        return '';
      });
    }
    return (this.config?.lineColumns || []).map(column => {
      const options = this.lineColumnOptions(column);
      const key = column.toLowerCase();
      if (this.config?.key === 'variantMaster') return '';
      if (key.includes('qty')) return '1';
      if (key.includes('disc')) return '0';
      if (key.includes('gst') || key.includes('tax')) return '18%';
      if (key.includes('rate') || key.includes('amount')) return '0';
      if (key.includes('warehouse')) return this.locationOptions[0] || '';
      if (key.includes('remark')) return '';
      return options[0] || '';
    });
  }

  private addScannedItem(code: string): void {
    const scannedCode = code.trim();
    if (!scannedCode || !this.config?.lineColumns?.length) return;

    const match = this.scannerCatalog().find(item =>
      item.codes.some(candidate => candidate.toLowerCase() === scannedCode.toLowerCase())
    );

    if (!match) {
      this.scannerMessage.set('Barcode not matched. Please select the item manually.');
      return;
    }

    const row = this.blankLineRow();
    this.config.lineColumns.forEach((column, columnIndex) => {
      const key = column.toLowerCase();
      if (key.includes('item') || key.includes('product') || key.includes('sku') || key.includes('material')) row[columnIndex] = match.item;
      else if (key.includes('uom')) row[columnIndex] = match.uom;
      else if (key.includes('qty') || key.includes('quantity')) row[columnIndex] = '1';
      else if (key.includes('rate')) row[columnIndex] = String(match.rate);
      else if (key.includes('disc')) row[columnIndex] = '0';
      else if (key.includes('gst') || key.includes('tax')) row[columnIndex] = `${match.gst}%`;
      else if (key.includes('batch') || key.includes('lot')) row[columnIndex] = match.batch;
      else if (key.includes('serial')) row[columnIndex] = match.serial;
      else if (key.includes('expiry')) row[columnIndex] = match.expiry;
      else if (key.includes('warehouse') || key.includes('location')) row[columnIndex] = match.warehouse;
      else if (key.includes('remark')) row[columnIndex] = 'Added by scanner';
    });
    this.recalculateLineRow(row);
    this.directEntryLineRows();
    this.entryLineRows.update(rows => {
      const blankIndex = rows.findIndex(existing => existing.every(cell => !cell || cell === '0' || cell === '18%' || cell === '1'));
      if (blankIndex < 0) return [...rows, row];
      return rows.map((existing, index) => index === blankIndex ? row : existing);
    });
    this.scannerMessage.set(`${match.item} added from scanner.`);
  }

  private scannerCatalog(): Array<{
    codes: string[];
    item: string;
    uom: string;
    rate: number;
    gst: number;
    batch: string;
    serial: string;
    expiry: string;
    warehouse: string;
  }> {
    return [];
  }

  private recalculateLineRow(row: string[]): void {
    const qtyIndex = this.findColumnIndex(['qty', 'quantity', 'received', 'accepted', 'produced']);
    const rateIndex = this.findColumnIndex(['rate', 'price', 'cost']);
    const discountIndex = this.findColumnIndex(['disc', 'discount']);
    const taxIndex = this.findColumnIndex(['gst', 'tax']);
    const amountIndex = this.amountColumnIndex();

    if (amountIndex < 0 || qtyIndex < 0 || rateIndex < 0) return;

    const qty = this.parseCurrency(row[qtyIndex]);
    const rate = this.parseCurrency(row[rateIndex]);
    const discountPercent = discountIndex >= 0 ? this.parseCurrency(row[discountIndex]) : 0;
    const taxPercent = taxIndex >= 0 ? this.parseCurrency(row[taxIndex]) : 0;
    const taxable = qty * rate * (1 - discountPercent / 100);
    row[amountIndex] = Math.round(taxable * (1 + taxPercent / 100)).toLocaleString('en-IN');
  }

  private amountColumnIndex(): number {
    return this.findColumnIndex(['amount', 'total', 'value', 'net']);
  }

  private isLineQuantityColumn(column: string): boolean {
    const key = column.toLowerCase();
    return key.includes('qty') || key.includes('quantity');
  }

  private isLineAmountColumn(column: string): boolean {
    const key = column.toLowerCase();
    return key.includes('amount') || key.includes('value') || key.includes('cost');
  }

  private findColumnIndex(needles: string[]): number {
    return (this.config?.lineColumns || []).findIndex(column => {
      const key = column.toLowerCase();
      return needles.some(needle => key.includes(needle));
    });
  }

  private parseCurrency(value: string): number {
    const numeric = Number(String(value || '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private applyReferenceBinding(event: ReferenceDataBindEvent): void {
    const screenKey = this.config?.key;
    if (!screenKey || event.target !== screenKey) return;

    const rows = event.rows.filter(row => row.target === screenKey);
    if (!rows.length) {
      this.boundReferenceFields.set({});
      this.boundReferenceLabels.set([]);
      this.entryLineRowsKey.set('');
      return;
    }

    const fields = rows.reduce<Record<string, string>>((acc, row) => ({ ...acc, ...(row.fields || {}) }), {});
    const labels = rows.map(row => row.sourceLabel);
    const lines = rows.flatMap(row => row.lines || []);

    this.boundReferenceFields.set(fields);
    this.boundReferenceLabels.set(labels);

    if (lines.length) {
      this.entryLineRowsKey.set(screenKey);
      this.entryLineRows.set(lines.map(row => this.normalizeLineRow(row)));
    }
  }

  isPurchaseTransactionKey(key = this.config?.key || ''): boolean {
    return key === 'purchaseRequisition'
      || key === 'requestForQuotation'
      || key === 'purchaseOrder'
      || key === 'goodsReceipt'
      || key === 'purchaseInvoice'
      || key === 'purchaseReturn';
  }

  isSalesTransactionKey(key = this.config?.key || ''): boolean {
    return key === 'estimation'
      || key === 'proformaInvoice'
      || key === 'salesInvoice'
      || key === 'salesOrder'
      || key === 'salesQuotation'
      || key === 'deliveryChallan'
      || key === 'salesReturn';
  }

  purchaseReferenceType(key = this.config?.key || ''): string {
    if (key === 'requestForQuotation') return 'PR';
    if (key === 'purchaseOrder') return 'RFQ';
    if (key === 'goodsReceipt') return 'PO';
    if (key === 'purchaseInvoice') return 'GRN';
    if (key === 'purchaseReturn') return 'PI';
    return '';
  }

  salesReferenceType(key = this.config?.key || ''): string {
    if (key === 'deliveryChallan') return 'SO';
    if (key === 'salesInvoice') return 'DC';
    if (key === 'salesReturn') return 'SI';
    return '';
  }

  private referenceDocsForType(type: string, docs: PurchaseRefDoc[]): PurchaseRefDoc[] {
    if (type === 'PR')  return docs.filter(doc => this.normalizeKey(doc.status) === 'approved');
    if (type === 'RFQ') return docs.filter(doc => ['accepted', 'responsereceived'].includes(this.normalizeKey(doc.status)));
    if (type === 'PO')  return docs.filter(doc => ['approved', 'confirmed', 'draft'].includes(this.normalizeKey(doc.status)));
    return docs;
  }

  purchaseReferenceButtonLabel(): string {
    const type = this.purchaseReferenceType() || this.salesReferenceType();
    if (type === 'PR')  return 'Pick PR';
    if (type === 'RFQ') return 'Pick RFQ';
    if (type === 'PO')  return 'Pick PO';
    if (type === 'GRN') return 'Pick GRN';
    if (type === 'PI')  return 'Pick Invoice';
    if (type === 'SO')  return 'Pick Sales Order';
    if (type === 'DC')  return 'Pick Delivery Challan';
    if (type === 'SI')  return 'Pick Sales Invoice';
    return 'Pick Reference';
  }

  purchaseDocType(key = this.config?.key || ''): string {
    if (key === 'purchaseRequisition') return 'PR';
    if (key === 'requestForQuotation') return 'RFQ';
    if (key === 'goodsReceipt') return 'GRN';
    if (key === 'purchaseInvoice') return 'PI';
    return '';
  }

  private loadTransactionReferenceDocs(): void {
    const type = this.purchaseReferenceType() || this.salesReferenceType();
    if (!this.showTransactionHeader() || !type) {
      this.transactionReferenceDocs.set([]);
      this.transactionReferenceLoading.set(false);
      this.transactionReferenceRequestKey = '';
      return;
    }

    const requestKey = `${this.config?.key || ''}:${type}:${this.selectedSegmentId() || 'all'}`;
    if (this.transactionReferenceRequestKey === requestKey) return;

    this.transactionReferenceRequestKey = requestKey;
    this.transactionReferenceLoading.set(true);
    this.txService.getRefDocs(type, this.selectedSegmentId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.transactionReferenceLoading.set(false);
          this.transactionReferenceDocs.set(res.success ? this.referenceDocsForType(type, res.data || []) : []);
        },
        error: () => {
          this.transactionReferenceLoading.set(false);
          this.transactionReferenceDocs.set([]);
        }
      });
  }

  openPurchaseReferencePicker(): void {
    const type = this.purchaseReferenceType() || this.salesReferenceType();
    if (!type) return;
    this.refPickerType.set(type);
    this.refPickerOpen.set(true);
    this.refPickerLoading.set(true);
    this.refPickerDocs.set([]);
    this.txSaveError.set('');
    this.txService.getRefDocs(type, this.selectedSegmentId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.refPickerLoading.set(false);
          this.refPickerDocs.set(res.success ? this.referenceDocsForType(type, res.data || []) : []);
          if (!res.success) this.txSaveError.set(res.message || 'Reference documents could not be loaded.');
        },
        error: err => {
          this.refPickerLoading.set(false);
          this.refPickerDocs.set([]);
          this.txSaveError.set(this.apiErrorMessage(err, 'Reference documents could not be loaded.'));
        }
      });
  }

  closePurchaseReferencePicker(): void {
    this.refPickerOpen.set(false);
    this.refPickerLoading.set(false);
  }

  selectPurchaseReference(doc: PurchaseRefDoc): void {
    const key = this.config?.key || '';
    const rows = (doc.items || []).map(item => this.referenceItemToLineRow(item, key));
    const patch: Record<string, any> = {
      segmentId: doc.segment_id ?? null,
      segment: doc.segment_name || this.formValues()['segment'] || this.selectedSegment()
    };

    if (key === 'requestForQuotation') {
      patch['prId'] = doc.id;
      patch['prReference'] = doc.doc_number;
      patch['branchId'] = doc.branch_id ?? null;
    } else if (key === 'purchaseOrder') {
      patch['rfqId'] = doc.id;
      patch['rfqReference'] = doc.doc_number;
      patch['linkedPr'] = doc.doc_number;
      patch['vendorId'] = doc.vendor_id ?? null;
      patch['supplier'] = doc.party_name || this.formValues()['supplier'] || '';
      patch['vendor'] = doc.party_name || this.formValues()['vendor'] || '';
    } else if (key === 'goodsReceipt') {
      patch['poId'] = doc.id;
      patch['poReference'] = doc.doc_number;
      patch['rfqReference'] = doc.doc_number;
      patch['vendorId'] = doc.vendor_id ?? null;
      patch['vendor'] = doc.party_name || this.formValues()['vendor'] || '';
    } else if (key === 'purchaseInvoice') {
      patch['grnId'] = doc.id;
      patch['grnReference'] = doc.doc_number;
      patch['vendorId'] = doc.vendor_id ?? null;
      patch['warehouseId'] = doc.warehouse_id ?? null;
      patch['vendor'] = doc.party_name || this.formValues()['vendor'] || '';
    } else if (key === 'purchaseReturn') {
      patch['piId'] = doc.id;
      patch['piReference'] = doc.doc_number;
      patch['vendorId'] = doc.vendor_id ?? null;
      patch['warehouseId'] = doc.warehouse_id ?? null;
      patch['vendor'] = doc.party_name || this.formValues()['vendor'] || '';
    }

    this.formValues.update(values => ({ ...values, ...patch }));
    if (rows.length) {
      this.entryLineRowsKey.set(key);
      this.entryLineRows.set(rows);
    }
    this.boundReferenceLabels.set([doc.doc_number]);
    this.boundReferenceFields.set(patch);
    this.closePurchaseReferencePicker();
  }

  selectSalesReference(doc: PurchaseRefDoc): void {
    const key = this.config?.key || '';
    const rows = (doc.items || []).map(item => this.referenceItemToLineRow(item, key));
    const patch: Record<string, any> = {
      segmentId: doc.segment_id ?? null,
      segment: doc.segment_name || this.formValues()['segment'] || this.selectedSegment()
    };

    if (key === 'deliveryChallan') {
      patch['soId'] = doc.id;
      patch['soReference'] = doc.doc_number;
      patch['customerId'] = doc.vendor_id ?? null;
      patch['customer'] = doc.party_name || this.formValues()['customer'] || '';
    } else if (key === 'salesInvoice') {
      patch['dcId'] = doc.id;
      patch['dcReference'] = doc.doc_number;
      patch['customerId'] = doc.vendor_id ?? null;
      patch['customer'] = doc.party_name || this.formValues()['customer'] || '';
      patch['warehouseId'] = doc.warehouse_id ?? null;
    } else if (key === 'salesReturn') {
      patch['invoiceId'] = doc.id;
      patch['invoiceReference'] = doc.doc_number;
      patch['customerId'] = doc.vendor_id ?? null;
      patch['customer'] = doc.party_name || this.formValues()['customer'] || '';
    }

    this.formValues.update(values => ({ ...values, ...patch }));
    if (rows.length) {
      this.entryLineRowsKey.set(key);
      this.entryLineRows.set(rows);
    }
    this.boundReferenceLabels.set([doc.doc_number]);
    this.boundReferenceFields.set(patch);
    this.closePurchaseReferencePicker();
  }

  private referenceItemToLineRow(item: any, screenKey: string): string[] {
    const product = item?.product_name || item?.productName || '';
    const uom = item?.uom_name || item?.uomName || '';
    const productCode = item?.product_code || item?.productCode || '';
    const requiredQty = String(item?.required_qty ?? item?.requiredQty ?? '');
    const receivedQty = String(item?.received_qty ?? item?.receivedQty ?? requiredQty);
    const rate = String(item?.vendor_rate ?? item?.vendorRate ?? item?.estimated_rate ?? item?.estimatedRate ?? item?.rate ?? '');
    const gst = String(item?.gst_rate ?? item?.gstRate ?? '');
    const remarks = item?.remarks || productCode || '';

    if (screenKey === 'requestForQuotation') {
      // columns: Product, Variant, Attribute, Qty, UOM, Target Rate, Vendor Rate, Lead Time, Remarks
      return this.normalizeLineRow([product, '', '', requiredQty, uom, rate, '', '', remarks]);
    }

    if (screenKey === 'purchaseOrder') {
      // columns: Item/SKU, Variant, Attribute, UOM, Qty, Rate, Disc%, GST, Warehouse, Amount
      const warehouse = this.formValues()['receivingWarehouse'] || this.warehouseOptions?.[0] || '';
      const row = this.normalizeLineRow([product, '', '', uom, requiredQty, rate, '0', gst, warehouse, '']);
      this.recalculateLineRow(row);
      return row;
    }

    if (screenKey === 'goodsReceipt') {
      const warehouse = this.formValues()['warehouse'] || this.warehouseOptions[0] || this.locationOptions[0] || '';
      const row = this.normalizeLineRow([product, uom, requiredQty, receivedQty, receivedQty, '0', rate, '0', gst, '', '', '', warehouse, '']);
      this.recalculateLineRow(row);
      return row;
    }

    if (screenKey === 'purchaseInvoice') {
      // columns: Product, Variant, Attribute, UOM, Qty, Rate, Disc%, GST, Amount, Remarks
      const row = this.normalizeLineRow([product, uom, receivedQty, rate, '0', gst, '', remarks]);
      this.recalculateLineRow(row);
      return row;
    }

    if (screenKey === 'purchaseReturn') {
      // columns: Product, Invoice Qty, Return Qty, UOM, Rate, Return Amount, Return Reason
      const invoiceQty = String(item?.qty ?? item?.received_qty ?? item?.receivedQty ?? requiredQty);
      return this.normalizeLineRow([product, invoiceQty, '', uom, rate, '', '']);
    }

    if (screenKey === 'deliveryChallan') {
      // columns: Product, SO Qty, Dispatch Qty, UOM, Batch / Serial, Remarks
      const soQty = String(item?.qty ?? item?.required_qty ?? item?.requiredQty ?? '');
      return this.normalizeLineRow([product, soQty, '', uom, '', '']);
    }

    if (screenKey === 'salesInvoice') {
      // columns: Item / SKU, UOM, Qty, Rate, Disc%, GST, Batch/Serial, Expiry Date, Warehouse, Amount
      const dispatchQty = String(item?.dispatch_qty ?? item?.dispatchQty ?? item?.qty ?? '');
      const row = this.normalizeLineRow([product, uom, dispatchQty, rate, '0', gst, '', '', '', '']);
      this.recalculateLineRow(row);
      return row;
    }

    if (screenKey === 'salesReturn') {
      // columns: Product, Invoiced Qty, Return Qty, UOM, Rate, Return Amount, Reason
      const invoicedQty = String(item?.qty ?? item?.invoiced_qty ?? item?.invoicedQty ?? '');
      return this.normalizeLineRow([product, invoicedQty, '', uom, rate, '', '']);
    }

    return this.normalizeLineRow([product, uom, requiredQty, rate, gst, remarks]);
  }

  cancelPurchaseRecordByRow(row: string[]): void {
    const record = this.findPurchaseRecordByRow(row);
    const docType = this.purchaseDocType();
    if (!record?.id || !docType) return;
    this.txSaving.set(true);
    this.txSaveMsg.set('');
    this.txSaveError.set('');
    this.txService.cancelDoc(docType, Number(record.id), 'Cancelled from Inventory transaction screen')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.txSaving.set(false);
          if (res.success) {
            this.txSaveMsg.set(`${docType} cancelled.`);
            this.loadApiRecords();
            setTimeout(() => this.txSaveMsg.set(''), 3000);
          } else {
            this.txSaveError.set(res.message || 'Cancel failed.');
          }
        },
        error: err => {
          this.txSaving.set(false);
          this.txSaveError.set(this.apiErrorMessage(err, 'Cancel failed.'));
        }
      });
  }

  canCancelPurchaseRow(row: string[]): boolean {
    const record = this.findPurchaseRecordByRow(row);
    const status = this.normalizeKey(record?.status || row[row.length - 1] || '');
    return !!record?.id && status !== 'cancelled' && status !== 'paid';
  }

  private findPurchaseRecordByRow(row: string[]): any {
    const docNo = row[0];
    return this.savedRecordObjects().find(record => {
      switch (this.config?.key) {
        case 'purchaseRequisition': return record.pr_number === docNo || record.prNumber === docNo;
        case 'requestForQuotation': return record.rfq_number === docNo || record.rfqNumber === docNo;
        case 'goodsReceipt': return record.grn_number === docNo || record.grnNumber === docNo;
        case 'purchaseInvoice': return record.pi_number === docNo || record.piNumber === docNo;
        default: return false;
      }
    });
  }

  closeAddMaster(): void {
    this.activeAddMaster.set('');
  }

  isNameField(field: InventoryField): boolean {
    const key = (field.key || '').toLowerCase();
    return key.includes('name') && !key.includes('contact') && !key.includes('brand') && !key.includes('manufacturer');
  }

  clearConfigForm(): void {
    this.formValues.set({});
    this._autoCodeFields.clear();
    this.genericNameValue.set('');
    this.editingId.set(null);
    this.txDocId.set(null);
    this.txDocNumber.set('');
    this.txDocStatus.set('draft');
    this.txSaveError.set('');
    this.txSaveMsg.set('');
    this.boundReferenceFields.set({});
    this.boundReferenceLabels.set([]);
    this.fieldDefaultValues.clear();
    this.saveError.set('');
    this.categorySerialApplicable.set(false);
    this.categoryBatchApplicable.set(false);
    this.uomConversionRequired.set(false);
    this.selectedApplicableVariants.set([]);
    this.variantStockCombinationRows.set([]); this.pendingCombinationPicks.set({});
    this.pendingCombinationVariantId.set(null);
    this.pendingVariantResolve.set(null);

    if (this.config?.key === 'uomMaster' || this.config?.key === 'variantMaster') {
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set([this.blankLineRow()]);
    }

    if (this.isPurchaseTransactionKey()) {
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set([this.blankLineRow()]);
      this.lineAttrValueMap.set({});
      return;
    }

    if (this.config?.key === 'vendorMaster' || this.config?.key === 'customerMaster') {
      this.selectedPartyContact.set(null);
      this.selectedPartyContactPerson.set(null);
    }

    if (this.config?.key !== 'productServiceMaster' && this.config?.key !== 'hsnSacMapping') return;

    this.productName.set('');
    this.selectedProductCategory.set('');
    this.hsnSacCode.set('');
    this.hsnSacDescription.set('');
    this.gstRate.set(null);
    this.selectedTaxCodeSuggestion.set(null);
    this.taxCodeSuggestions.set([]);
    this.taxCodeSearchMessage.set('');

    if (this.config?.key !== 'productServiceMaster') return;

    this.productBatchApplicable.set(false);
    this.productSerialApplicable.set(false);
    this.productExpiryApplicable.set(false);
    this.productQcRequired.set(false);
    this.productStockControlsRequired.set(false);
    this.productTrackingRequired.set(false);
    this.productAdditionalInfoRequired.set(false);
    this.productBrandRequired.set(false);
    this.productVariantRequired.set(false);
    this.productValuationRequired.set(false);
    this.productUomMappingRequired.set(false);
    this.bundleCompositionRequired.set(false);
    this.bundleCompositionItems.set([]);
    this.productCodeIsAuto.set(false);
    this.skuIsAuto.set(false);
    this.entryLineRowsKey.set('productServiceMaster');
    this.entryLineRows.set([this.blankLineRow()]);
  }

  // ── API wiring ────────────────────────────────────────────────────────────

  private applyUomRecordToForm(record: any, openMapping = false): void {
    const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Active';
    this.editingId.set(record.id ?? null);
    const baseLabel = this.uomDisplayLabel(record) || record.uom_code || record.uom_name || '';
    this.formValues.set({
      uomCode: record.uom_code || '',
      uomName: record.uom_name || '',
      decimalAllowed: record.decimal_allowed || false,
      isBaseUom: record.is_base_uom || false,
      status: cap(record.status || 'active')
    });

    const rows = (record.conversions || []).map((c: any) => [
      c.from_uom_symbol || c.from_uom_name || '',
      c.to_uom_symbol || c.to_uom_name || baseLabel,
      String(c.conversion_factor ?? ''),
      c.rounding_rule || 'Exact'
    ]);
    this.uomConversionRequired.set(openMapping || rows.length > 0);
    this.entryLineRowsKey.set('uomMaster');
    this.entryLineRows.set(rows.length ? rows : [this.blankUomConversionRow(baseLabel)]);
  }

  isApiWired(): boolean {
    const key = this.config?.key;
    return key === 'businessSegments' || key === 'branchMaster'
      || key === 'warehouseMaster' || key === 'uomMaster' || key === 'categoryMaster'
      || key === 'hsnSacMapping'
      || key === 'paymentTermsMaster' || key === 'brandMaster' || key === 'attributeMaster'
      || key === 'productGroupMaster' || key === 'variantMaster' || key === 'serialNumberPolicy'
      || key === 'batchLotPolicy' || key === 'barcodeConfiguration' || key === 'substituteProducts'
      || key === 'consumptionTypeMaster' || key === 'productTypeMaster'
      || key === 'vendorMaster' || key === 'customerMaster' || key === 'productServiceMaster'
      || this.isPurchaseTransactionKey(key || '')
      || this.isSalesTransactionKey(key || '');
  }

  collectFormField(key: string, value: any): void {
    const rawValue = key === 'convFactor' ? this.sanitizeDecimalInput(value) : value;
    const normalizedValue = this.normalizeFormFieldTextCase(key, rawValue);
    this.formValues.update(v => {
      const next = { ...v, [key]: normalizedValue };
      if (this.config?.key === 'purchaseRequisition' && key === 'branch') {
        const branch = this.findBranchBySelection(normalizedValue);
        next['branchId'] = this.optionalNumber(branch?.branch_id) ?? this.optionalNumber(branch?.id) ?? null;
        const requesterOptions = this.purchaseRequisitionRequesterOptions(normalizedValue);
        if (!requesterOptions.some(option => this.optionEquals(option, next['requestedBy']))) {
          next['requestedBy'] = requesterOptions.length === 1 ? requesterOptions[0] : '';
        }
      }
      if (this.config?.key === 'variantMaster' && key === 'attributeName' && !this.variantAttributeValueAllowed(normalizedValue, next['attributeValue'])) {
        next['attributeValue'] = '';
      }
      if (this.config?.key === 'variantMaster' && key === 'attributeName') {
        next['attributeValue'] = this.variantAttributeValueControlValue(normalizedValue, next['attributeValue']);
      }
      if (key === 'quickAttributeName' && !this.variantAttributeValueAllowed(normalizedValue, next['quickAttributeValue'])) {
        next['quickAttributeValue'] = '';
      }
      if (key === 'quickAttributeName') {
        next['quickAttributeValue'] = this.variantAttributeValueControlValue(normalizedValue, next['quickAttributeValue']);
      }
      return next;
    });
    if (key === 'segment' && normalizedValue && !this.optionEquals(this.selectedSegment(), normalizedValue)) {
      this.selectedSegment.set(normalizedValue);
    }
  }

  formFieldValue(field: InventoryField): any {
    const live = this.formValues()[field.key];
    const value = live !== undefined ? live : this.defaultFieldValue(field);
    if (this.config?.key === 'variantMaster' && field.key.toLowerCase() === 'attributevalue') {
      return this.variantAttributeValueControlValue(this.formValues()['attributeName'], value);
    }
    return value;
  }

  private isSegmentFilteredGridKey(key = this.config?.key || ''): boolean {
    return key === 'branchMaster' || key === 'warehouseMaster'
      || key === 'uomMaster' || key === 'categoryMaster' || key === 'hsnSacMapping'
      || key === 'brandMaster' || key === 'attributeMaster' || key === 'productGroupMaster'
      || key === 'variantMaster' || key === 'serialNumberPolicy' || key === 'batchLotPolicy'
      || key === 'barcodeConfiguration' || key === 'substituteProducts'
      || key === 'consumptionTypeMaster'
      || key === 'vendorMaster' || key === 'customerMaster' || key === 'productServiceMaster';
  }

  private segmentMappedIds(kind: 'categories' | 'hsn_sac_codes' | 'uoms'): Set<number> {
    const seg = this.selectedSegmentObject();
    const items = (seg?.[kind] ?? []) as Array<{ id?: number }>;
    return new Set(items.map(item => Number(item.id)).filter(id => Number.isFinite(id) && id > 0));
  }

  private recordBelongsToSelectedSegment(record: any): boolean {
    const key = this.config?.key || '';
    const selected = this.selectedSegment();
    if (!selected || !this.isSegmentFilteredGridKey(key)) return true;

    if (key === 'categoryMaster') {
      return this.segmentMappedIds('categories').has(Number(record.id));
    }

    if (key === 'hsnSacMapping') {
      return this.segmentMappedIds('hsn_sac_codes').has(Number(record.id));
    }

    if (key === 'uomMaster') {
      const selectedId = this.selectedSegmentId();
      const recordSegmentId = Number(record.segment_id ?? record.segmentId);
      if (selectedId && Number.isFinite(recordSegmentId) && recordSegmentId > 0) {
        return recordSegmentId === selectedId;
      }
      return !!record.is_system || this.segmentMappedIds('uoms').has(Number(record.id));
    }

    if (key === 'barcodeConfiguration') {
      const categories = new Set(this.categoryOptions.map(item => this.normalizeKey(item)));
      const categoryName = this.normalizeKey(record.category_name);
      return !!categoryName && categories.has(categoryName);
    }

    if (key === 'substituteProducts') {
      const products = new Set(this.productOptions.map(item => this.normalizeKey(item)));
      return products.has(this.normalizeKey(record.product_name))
        || products.has(this.normalizeKey(record.substitute_product_name));
    }

    const selectedId = this.selectedSegmentId();
    const recordSegmentId = Number(record.segment_id ?? record.segmentId);
    if (selectedId && Number.isFinite(recordSegmentId) && recordSegmentId > 0) {
      return recordSegmentId === selectedId;
    }

    const recordSegmentName = record.segment_name ?? record.segmentName;
    return !!recordSegmentName && this.optionEquals(recordSegmentName, selected);
  }

  private segmentFilteredRecords(records: any[]): any[] {
    return records.filter(record => this.recordBelongsToSelectedSegment(record));
  }

  liveRows(): string[][] {
    return this.isApiWired() ? this.mapToGridRows(this.segmentFilteredRecords(this.savedRecordObjects())) : (this.config?.rows || []);
  }

  loadApiRecords(): void {
    let obs$: Observable<ApiResponse<any[]>>;
    const key = this.config?.key;
    const segmentId = this.selectedSegmentId();
    switch (key) {
      case 'businessSegments':     obs$ = this.inventoryConfigService.getSegments(true);            break;
      case 'branchMaster':         obs$ = this.inventoryConfigService.getBranchesInv(true);         break;
      case 'warehouseMaster':      obs$ = this.inventoryConfigService.getWarehouses(true);          break;
      case 'uomMaster':            obs$ = this.inventoryConfigService.getUoms(true, segmentId);     break;
      case 'categoryMaster':       obs$ = this.inventoryConfigService.getCategories(true);          break;
      case 'hsnSacMapping':        obs$ = this.inventoryConfigService.getHsnSac(undefined, true);   break;
      case 'paymentTermsMaster':   obs$ = this.inventoryConfigService.getPaymentTerms(true);        break;
      case 'brandMaster':          obs$ = this.inventoryConfigService.getBrands(segmentId, true);        break;
      case 'attributeMaster':      obs$ = this.inventoryConfigService.getAttributes(segmentId, true);    break;
      case 'productGroupMaster':   obs$ = this.inventoryConfigService.getProductGroups(segmentId, null, true); break;
      case 'variantMaster':        obs$ = this.inventoryConfigService.getVariants(segmentId, null, true);     break;
      case 'serialNumberPolicy':   obs$ = this.inventoryConfigService.getSerialPolicies(segmentId, null, true); break;
      case 'batchLotPolicy':       obs$ = this.inventoryConfigService.getBatchPolicies(segmentId, null, true);  break;
      case 'barcodeConfiguration':  obs$ = this.inventoryConfigService.getBarcodeConfigurations(true);     break;
      case 'substituteProducts':    obs$ = this.inventoryConfigService.getSubstituteProducts(true);        break;
      case 'consumptionTypeMaster': obs$ = this.inventoryConfigService.getConsumptionTypes(segmentId, true);   break;
      case 'productTypeMaster':     obs$ = this.inventoryConfigService.getProductTypes(true);                  break;
      case 'vendorMaster':         obs$ = this.inventoryConfigService.getVendors(segmentId, true);       break;
      case 'customerMaster':       obs$ = this.inventoryConfigService.getCustomers(segmentId, true);     break;
      case 'productServiceMaster': obs$ = this.inventoryConfigService.getProducts(segmentId, null, true); break;
      case 'purchaseRequisition':  obs$ = this.txService.getPurchaseRequisitions(undefined, segmentId); break;
      case 'requestForQuotation':  obs$ = this.txService.getRfqs(undefined, segmentId); break;
      case 'purchaseOrder':        obs$ = this.txService.getPurchaseOrders(undefined, segmentId); break;
      case 'goodsReceipt':         obs$ = this.txService.getGrns(undefined, segmentId); break;
      case 'purchaseInvoice':      obs$ = this.txService.getPurchaseInvoices(undefined, segmentId); break;
      case 'purchaseReturn':       obs$ = this.txService.getPurchaseReturns(undefined, segmentId); break;
      case 'estimation':           obs$ = this.txService.getEstimations(undefined, segmentId); break;
      case 'proformaInvoice':      obs$ = this.txService.getProformaInvoices(undefined, segmentId); break;
      case 'salesInvoice':         obs$ = this.txService.getSalesInvoices(undefined, segmentId); break;
      case 'salesOrder':           obs$ = this.txService.getSalesOrders(undefined, segmentId); break;
      case 'salesQuotation':       obs$ = this.txService.getSalesQuotations(undefined, segmentId); break;
      case 'deliveryChallan':      obs$ = this.txService.getDeliveryChallans(undefined, segmentId); break;
      case 'salesReturn':          obs$ = this.txService.getSalesReturns(undefined, segmentId); break;
      default: return;
    }
    obs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<any[]>) => {
        if (res.success && Array.isArray(res.data)) {
          this.savedRecordObjects.set(res.data);
        }
      },
      error: () => {}
    });
  }

  private mapSavedGlobalMasterToSelectedSegment(record: any, masterKey = this.config?.key || ''): Observable<ApiResponse<SegmentItem>> | null {
    const key = masterKey;
    if (key !== 'categoryMaster' && key !== 'uomMaster' && key !== 'hsnSacMapping') {
      return null;
    }

    const seg = this.selectedSegmentObject();
    const savedId = Number(record?.id);
    if (!seg || !Number.isFinite(savedId) || savedId <= 0) {
      return null;
    }

    const categoryIds = new Set((seg.categories || []).map(item => Number(item.id)).filter(id => Number.isFinite(id) && id > 0));
    const hsnSacIds = new Set((seg.hsn_sac_codes || []).map(item => Number(item.id)).filter(id => Number.isFinite(id) && id > 0));
    const uomIds = new Set((seg.uoms || []).map(item => Number(item.id)).filter(id => Number.isFinite(id) && id > 0));

    if (key === 'categoryMaster') categoryIds.add(savedId);
    if (key === 'hsnSacMapping') hsnSacIds.add(savedId);
    if (key === 'uomMaster') uomIds.add(savedId);

    return this.inventoryConfigService.saveSegment({
      segment_name: seg.segment_name,
      usage_note: seg.usage_note || null,
      category_ids: [...categoryIds],
      hsn_sac_ids: [...hsnSacIds],
      uom_ids: [...uomIds],
      status: seg.status || 'active'
    }, seg.id);
  }

  private completeQuickGlobalMasterSave(record: any, masterKey: 'categoryMaster' | 'uomMaster' | 'hsnSacMapping', done: () => void): void {
    const segmentMap$ = this.mapSavedGlobalMasterToSelectedSegment(record, masterKey);
    if (!segmentMap$) {
      done();
      return;
    }

    segmentMap$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: mapRes => {
        if (mapRes.success && mapRes.data) {
          this.loadedSegmentObjects.update(items => items.map(item => item.id === mapRes.data?.id ? mapRes.data : item));
          this.refreshSegmentScopedOptions();
        }
        done();
      },
      error: (err: any) => {
        this.quickAddError.set(this.apiErrorMessage(err, 'Saved, but segment mapping update failed.'));
      }
    });
  }

  saveConfigRecord(): void {
    if (this.isSaving()) return;
    const payload = this.buildPayload();
    const validationMessage = this.validatePayload(payload);
    if (validationMessage) {
      this.saveMsg.set('');
      this.saveError.set(validationMessage);
      return;
    }

    const id = this.editingId();
    this.isSaving.set(true);
    this.saveMsg.set('');
    this.saveError.set('');
    let obs$: Observable<ApiResponse<any>>;
    switch (this.config?.key) {
      case 'businessSegments':      obs$ = this.inventoryConfigService.saveSegment(payload, id);          break;
      case 'branchMaster':          obs$ = this.inventoryConfigService.saveBranchInv(payload, id);       break;
      case 'warehouseMaster':       obs$ = this.inventoryConfigService.saveWarehouse(payload, id);        break;
      case 'uomMaster':             obs$ = this.inventoryConfigService.saveUom(payload, id);              break;
      case 'categoryMaster':        obs$ = this.inventoryConfigService.saveCategory(payload, id);         break;
      case 'hsnSacMapping':         obs$ = this.inventoryConfigService.saveHsnSac(payload, id);           break;
      case 'paymentTermsMaster':    obs$ = this.inventoryConfigService.savePaymentTerm(payload, id);      break;
      case 'brandMaster':           obs$ = this.inventoryConfigService.saveBrand(payload, id);            break;
      case 'attributeMaster':       obs$ = this.inventoryConfigService.saveAttribute(payload, id);        break;
      case 'productGroupMaster':    obs$ = this.inventoryConfigService.saveProductGroup(payload, id);     break;
      case 'variantMaster':         obs$ = this.inventoryConfigService.saveVariant(payload, id);          break;
      case 'serialNumberPolicy':    obs$ = this.inventoryConfigService.saveSerialPolicy(payload, id);     break;
      case 'batchLotPolicy':        obs$ = this.inventoryConfigService.saveBatchPolicy(payload, id);      break;
      case 'barcodeConfiguration':   obs$ = this.inventoryConfigService.saveBarcodeConfiguration(payload, id); break;
      case 'substituteProducts':     obs$ = this.inventoryConfigService.saveSubstituteProduct(payload, id); break;
      case 'consumptionTypeMaster': obs$ = this.inventoryConfigService.saveConsumptionType(payload, id);  break;
      case 'productTypeMaster':     obs$ = this.inventoryConfigService.saveProductType(payload, id);       break;
      case 'vendorMaster':          obs$ = this.inventoryConfigService.saveVendor(payload, id);           break;
      case 'customerMaster':        obs$ = this.inventoryConfigService.saveCustomer(payload, id);         break;
      case 'productServiceMaster':  obs$ = this.inventoryConfigService.saveProduct(payload, id);          break;
      case 'purchaseRequisition':   obs$ = this.txService.savePurchaseRequisition(payload, id);           break;
      case 'requestForQuotation':   obs$ = this.txService.saveRfq(payload, id);                           break;
      case 'purchaseOrder':         obs$ = this.txService.savePurchaseOrder(payload, id);                  break;
      case 'goodsReceipt':          obs$ = this.txService.saveGrn(payload, id);                           break;
      case 'purchaseInvoice':       obs$ = this.txService.savePurchaseInvoice(payload, id);                break;
      case 'purchaseReturn':        obs$ = this.txService.savePurchaseReturn(payload, id);                 break;
      case 'estimation':            obs$ = this.txService.saveEstimation(payload, id);                     break;
      case 'proformaInvoice':       obs$ = this.txService.saveProformaInvoice(payload, id);                break;
      case 'salesInvoice':          obs$ = this.txService.saveSalesInvoice(payload, id);                   break;
      case 'salesOrder':            obs$ = this.txService.saveSalesOrder(payload, id);                     break;
      case 'salesQuotation':        obs$ = this.txService.saveSalesQuotation(payload, id);                 break;
      case 'deliveryChallan':       obs$ = this.txService.saveDeliveryChallan(payload, id);                break;
      case 'salesReturn':           obs$ = this.txService.saveSalesReturn(payload, id);                    break;
      default: this.isSaving.set(false); return;
    }
    obs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<any>) => {
        this.isSaving.set(false);
        if (res.success) {
          const finishSave = () => {
            this.saveMsg.set(id ? 'Record updated.' : 'Record saved.');
            this.clearConfigForm();
            this.loadApiRecords();
            this.loadLookupOptions();
            setTimeout(() => this.saveMsg.set(''), 3000);
          };

          const segmentMap$ = this.mapSavedGlobalMasterToSelectedSegment(res.data);
          if (segmentMap$) {
            segmentMap$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
              next: mapRes => {
                if (mapRes.success && mapRes.data) {
                  this.loadedSegmentObjects.update(items => items.map(item => item.id === mapRes.data?.id ? mapRes.data : item));
                  this.refreshSegmentScopedOptions();
                }
                finishSave();
              },
              error: (err: any) => {
                this.saveError.set(this.apiErrorMessage(err, 'Record saved, but segment mapping update failed.'));
                this.loadLookupOptions();
              }
            });
          } else {
            finishSave();
          }
        } else {
          this.saveError.set(res.message || 'Save failed.');
        }
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.saveError.set(this.apiErrorMessage(err, 'Server error. Check connection and try again.'));
      }
    });
  }

  // ── Pending grid (temp entries before batch save) ────────────────────────

  typeAbbr(type: string): string {
    if (!type) return '';
    const map: Record<string, string> = {
      'Physical Stock': 'PS', 'Service': 'SVC', 'Both': 'BT',
      'Space / Seat': 'SS', 'Manufacturing Component': 'MC',
      'Project Material': 'PM', 'Real Estate Unit': 'RE',
      'Restaurant Menu Item': 'RM', 'Hotel Room': 'HR',
    };
    return map[type] ?? type.replace(/[^A-Za-z\s]/g, '').trim()
      .split(/\s+/).slice(0, 3).map(w => w[0]?.toUpperCase() ?? '').join('');
  }

  generateCodeFromName(name: string): string {
    const prefix = String(name || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    if (!prefix) return '';
    const yy = new Date().getFullYear().toString().slice(-2);
    const seq = String(this.savedRecordObjects().length + this.pendingRows().length + 1).padStart(5, '0');
    return `${prefix}-${yy}-${seq}`;
  }

  generateSku(name: string, category?: string, brand?: string, variant?: string): string {
    const catAbbr     = category ? category.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) : '';
    const brandAbbr   = brand    ? brand.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3)    : '';
    const variantAbbr = variant  ? variant.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3)  : '';
    const words    = String(name || '').trim().split(/\s+/).filter(Boolean);
    const nameParts = words.slice(0, 2)
      .map(w => w.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3))
      .filter(Boolean);
    const seq = String(this.savedRecordObjects().length + this.pendingRows().length + 1).padStart(4, '0');
    const parts = [catAbbr, brandAbbr, variantAbbr, ...nameParts, seq].filter(Boolean);
    if (parts.length <= 1) return '';
    return parts.join('-');
  }

  maybeAutoCode(fieldKey: string, value: string): void {
    // When the user types directly in a code field, mark it as manually set so we stop overriding it.
    const isCodeField = fieldKey.endsWith('Code') || fieldKey === 'typeCode' || fieldKey === 'code';
    if (isCodeField) {
      this._autoCodeFields.delete(fieldKey);
      return;
    }

    if (this.editingId() !== null || this.editingPendingIndex() !== null) return;

    let codeKey: string | null = null;
    if (fieldKey.endsWith('Name')) {
      codeKey = fieldKey.replace(/Name$/, 'Code');
    } else if (fieldKey === 'consumptionType') {
      codeKey = 'typeCode';
    } else if (fieldKey === 'name' &&
               (this.config?.key === 'vendorMaster' || this.config?.key === 'customerMaster')) {
      codeKey = 'code';
    }
    if (!codeKey) return;
    const fields = this.config?.fields || [];
    if (!fields.some(f => f.key === codeKey)) return;

    // Name cleared → clear the code only if we auto-generated it.
    if (!value || !value.trim()) {
      if (this._autoCodeFields.has(codeKey)) {
        this.collectFormField(codeKey, '');
      }
      return;
    }

    const current = this.formValues()[codeKey!];
    // Only skip auto-generation if the code was typed manually (not auto-generated by us).
    if (current && String(current).trim() && !this._autoCodeFields.has(codeKey)) return;
    const generated = this.generateCodeFromName(value);
    if (!generated) return;
    this.collectFormField(codeKey, generated);
    this._autoCodeFields.add(codeKey);
  }

  addToPendingRows(): void {
    const payload = this.buildPayload();
    const msg = this.validatePayload(payload);
    if (msg) { this.saveError.set(msg); return; }

    const display = this.mapToGridRows([payload])[0] || [];
    const formSnapshot: Record<string, any> = { ...this.formValues() };
    if (this.config?.key === 'productServiceMaster') {
      formSnapshot['__productName']             = this.productName();
      formSnapshot['__selectedProductCategory'] = this.selectedProductCategory();
      formSnapshot['__hsnSacCode']              = this.hsnSacCode();
      formSnapshot['__gstRate']                 = this.gstRate();
      formSnapshot['__productBatchApplicable']  = this.productBatchApplicable();
      formSnapshot['__productSerialApplicable'] = this.productSerialApplicable();
      formSnapshot['__productExpiryApplicable'] = this.productExpiryApplicable();
      formSnapshot['__productQcRequired']       = this.productQcRequired();
      formSnapshot['__entryLineRows']           = JSON.stringify(this.entryLineRows());
    }
    if (this.config?.key === 'uomMaster' || this.config?.key === 'variantMaster') {
      formSnapshot['__entryLineRows'] = JSON.stringify(this.entryLineRows());
      formSnapshot['__uomConversionRequired'] = this.uomConversionRequired();
    }
    const idx = this.editingPendingIndex();

    if (idx !== null) {
      const rows = this.pendingRows().slice();
      rows[idx] = { payload, formSnapshot, display };
      this.pendingRows.set(rows);
      this.editingPendingIndex.set(null);
    } else {
      this.pendingRows.update(rows => [...rows, { payload, formSnapshot, display }]);
    }
    this.saveError.set('');
    this.clearConfigForm();
  }

  editPendingRow(index: number): void {
    const row = this.pendingRows()[index];
    if (!row) return;
    this.editingPendingIndex.set(index);
    this.formValues.set({ ...row.formSnapshot });
    if (this.config?.key === 'productServiceMaster') {
      const s = row.formSnapshot;
      if (s['__productName'] !== undefined)             this.productName.set(s['__productName']);
      if (s['__selectedProductCategory'] !== undefined) this.selectedProductCategory.set(s['__selectedProductCategory']);
      if (s['__hsnSacCode'] !== undefined)              this.hsnSacCode.set(s['__hsnSacCode']);
      if (s['__gstRate'] !== undefined)                 this.gstRate.set(s['__gstRate']);
      if (s['__productBatchApplicable'] !== undefined)  this.productBatchApplicable.set(s['__productBatchApplicable']);
      if (s['__productSerialApplicable'] !== undefined) this.productSerialApplicable.set(s['__productSerialApplicable']);
      if (s['__productExpiryApplicable'] !== undefined) this.productExpiryApplicable.set(s['__productExpiryApplicable']);
      if (s['__productQcRequired'] !== undefined)       this.productQcRequired.set(s['__productQcRequired']);
      if (s['__entryLineRows']) {
        try {
          const rows = JSON.parse(s['__entryLineRows']);
          this.entryLineRowsKey.set('productServiceMaster');
          this.entryLineRows.set(rows);
        } catch {}
      }
    }
    if (this.config?.key === 'uomMaster' || this.config?.key === 'variantMaster') {
      const s = row.formSnapshot;
      if (s['__uomConversionRequired'] !== undefined) this.uomConversionRequired.set(s['__uomConversionRequired']);
      if (s['__entryLineRows']) {
        try {
          const rows = JSON.parse(s['__entryLineRows']);
          this.entryLineRowsKey.set(this.config.key);
          this.entryLineRows.set(rows);
        } catch {}
      }
    }
    this.saveError.set('');
  }

  removePendingRow(index: number): void {
    this.pendingRows.update(rows => rows.filter((_, i) => i !== index));
    if (this.editingPendingIndex() === index) {
      this.editingPendingIndex.set(null);
      this.clearConfigForm();
    }
  }

  savePendingBatch(): void {
    const rows = this.pendingRows();
    if (!rows.length || this.isBatchSaving()) return;
    this.isBatchSaving.set(true);
    this.saveMsg.set('');
    this.saveError.set('');

    const saveOne = (payload: Record<string, any>): Observable<ApiResponse<any>> => {
      switch (this.config?.key) {
        case 'businessSegments':     return this.inventoryConfigService.saveSegment(payload, null);
        case 'branchMaster':         return this.inventoryConfigService.saveBranchInv(payload, null);
        case 'warehouseMaster':      return this.inventoryConfigService.saveWarehouse(payload, null);
        case 'uomMaster':            return this.inventoryConfigService.saveUom(payload, null);
        case 'categoryMaster':       return this.inventoryConfigService.saveCategory(payload, null);
        case 'hsnSacMapping':        return this.inventoryConfigService.saveHsnSac(payload, null);
        case 'paymentTermsMaster':   return this.inventoryConfigService.savePaymentTerm(payload, null);
        case 'brandMaster':          return this.inventoryConfigService.saveBrand(payload, null);
        case 'attributeMaster':      return this.inventoryConfigService.saveAttribute(payload, null);
        case 'productGroupMaster':   return this.inventoryConfigService.saveProductGroup(payload, null);
        case 'variantMaster':        return this.inventoryConfigService.saveVariant(payload, null);
        case 'serialNumberPolicy':   return this.inventoryConfigService.saveSerialPolicy(payload, null);
        case 'batchLotPolicy':       return this.inventoryConfigService.saveBatchPolicy(payload, null);
        case 'barcodeConfiguration': return this.inventoryConfigService.saveBarcodeConfiguration(payload, null);
        case 'substituteProducts':   return this.inventoryConfigService.saveSubstituteProduct(payload, null);
        case 'consumptionTypeMaster':return this.inventoryConfigService.saveConsumptionType(payload, null);
        case 'vendorMaster':         return this.inventoryConfigService.saveVendor(payload, null);
        case 'customerMaster':       return this.inventoryConfigService.saveCustomer(payload, null);
        case 'productServiceMaster': return this.inventoryConfigService.saveProduct(payload, null);
        default: return of({ success: false, message: 'Unknown screen', data: null });
      }
    };

    from(rows).pipe(
      concatMap(row => saveOne(row.payload).pipe(
        concatMap(res => {
          if (!res.success) return of(res);
          const segmentMap$ = this.mapSavedGlobalMasterToSelectedSegment(res.data);
          if (!segmentMap$) return of(res);
          return segmentMap$.pipe(
            map(mapRes => {
              if (mapRes.success && mapRes.data) {
                this.loadedSegmentObjects.update(items => items.map(item => item.id === mapRes.data?.id ? mapRes.data : item));
                this.refreshSegmentScopedOptions();
              }
              return res;
            }),
            catchError(err => of({ success: false, message: this.apiErrorMessage(err, 'Record saved, but segment mapping failed.'), data: null }))
          );
        }),
        catchError(err => of({ success: false, message: this.apiErrorMessage(err, 'Save failed'), data: null }))
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (res: ApiResponse<any>) => {
        if (!res.success) {
          this.saveError.update(e => e ? e : (res.message || 'One or more records failed to save.'));
        }
      },
      error: (err: any) => {
        this.isBatchSaving.set(false);
        this.saveError.set(this.apiErrorMessage(err, 'Batch save failed.'));
        this.loadApiRecords();
      },
      complete: () => {
        this.isBatchSaving.set(false);
        this.pendingRows.set([]);
        this.editingPendingIndex.set(null);
        const count = rows.length;
        this.saveMsg.set(`${count} record${count !== 1 ? 's' : ''} saved.`);
        this.loadApiRecords();
        this.loadLookupOptions();
        setTimeout(() => this.saveMsg.set(''), 3000);
      }
    });
  }

  editRecordByRow(row: string[]): void {
    if (!this.isApiWired()) return;
    const records = this.segmentFilteredRecords(this.savedRecordObjects());
    const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Active';
    let record: any;
    switch (this.config?.key) {
      case 'businessSegments':   record = records.find(r => r.segment_name === row[0]);  break;
      case 'branchMaster':       record = records.find(r => r.branch_code === row[0]);   break;
      case 'warehouseMaster':    record = records.find(r => r.warehouse_code === row[0]); break;
      case 'uomMaster':          record = records.find(r => r.uom_code === row[0]);        break;
      case 'categoryMaster':     record = records.find(r => r.category_code === row[0]);   break;
      case 'hsnSacMapping':      record = records.find(r => r.code === row[0]);            break;
      case 'paymentTermsMaster': record = records.find(r => r.term_code === row[0] || r.term_name === row[0]); break;
      case 'brandMaster':        record = records.find(r => r.brand_code === row[0]);      break;
      case 'attributeMaster':    record = records.find(r => r.attribute_name === row[0]);  break;
      case 'productGroupMaster': record = records.find(r => r.group_code === row[0]);      break;
      case 'variantMaster':      record = records.find(r => r.variant_code === row[0]);    break;
      case 'serialNumberPolicy': record = records.find(r => r.policy_code === row[0]);     break;
      case 'batchLotPolicy':     record = records.find(r => r.policy_code === row[0]);     break;
      case 'barcodeConfiguration': record = records.find(r => r.barcode_type === row[0] && String(r.prefix || '') === row[2]); break;
      case 'substituteProducts': record = records.find(r => r.product_name === row[0] && r.substitute_product_name === row[1]); break;
      case 'consumptionTypeMaster': record = records.find(r => r.type_code === row[0] || r.type_name === row[0]); break;
      case 'productTypeMaster':   record = records.find(r => r.type_code === row[0]); break;
      case 'vendorMaster':       record = records.find(r => r.vendor_code === row[0]);     break;
      case 'customerMaster':     record = records.find(r => r.customer_code === row[0]);   break;
      case 'productServiceMaster': record = records.find(r => r.product_code === row[0]); break;
      case 'purchaseRequisition': record = records.find(r => r.pr_number === row[0] || r.prNumber === row[0]); break;
      case 'requestForQuotation': record = records.find(r => r.rfq_number === row[0] || r.rfqNumber === row[0]); break;
      case 'purchaseOrder': record = records.find(r => r.po_number === row[0] || r.poNumber === row[0]); break;
      case 'goodsReceipt': record = records.find(r => r.grn_number === row[0] || r.grnNumber === row[0]); break;
      case 'purchaseInvoice': record = records.find(r => r.pi_number === row[0] || r.piNumber === row[0]); break;
      case 'purchaseReturn': record = records.find(r => r.return_number === row[0] || r.returnNumber === row[0]); break;
      case 'estimation':
      case 'proformaInvoice':
      case 'salesInvoice':
      case 'salesOrder':
      case 'salesQuotation': record = records.find(r => r.doc_number === row[0]); break;
      case 'deliveryChallan': record = records.find(r => r.dc_number === row[0] || r.dcNumber === row[0]); break;
      case 'salesReturn': record = records.find(r => r.return_number === row[0] || r.returnNumber === row[0]); break;
    }
    if (!record) return;
    this.editingId.set(record.id ?? null);
    this._autoCodeFields.clear();
    switch (this.config?.key) {
      case 'purchaseRequisition':
      case 'requestForQuotation':
      case 'purchaseOrder':
      case 'goodsReceipt':
      case 'purchaseInvoice':
      case 'purchaseReturn':
        this.applyPurchaseRecordToForm(record);
        break;
      case 'estimation':
      case 'proformaInvoice':
      case 'salesInvoice':
      case 'salesOrder':
      case 'salesQuotation':
      case 'deliveryChallan':
      case 'salesReturn':
        this.applySalesRecordToForm(record);
        break;
      case 'businessSegments':
        this.formValues.set({
          segmentName: record.segment_name || '',
          category: (record.categories || []).map((c: any) => c.category_name),
          relatedHsnSac: (record.hsn_sac_codes || []).map((h: any) => h.code),
          typicalUoms: (record.uoms || []).map((u: any) => u.uom_symbol || u.uom_name),
          usageNote: record.usage_note || '',
          status: cap(record.status || 'active')
        });
        break;
      case 'branchMaster':
        this.formValues.set({
          branchCode: record.branch_code || '',
          branchName: record.branch_name || '',
          segment: record.segment_name || '',
          gstin: record.gstin || '',
          pan: record.pan || '',
          contactPerson: record.contact_name || '',
          mobile: record.contact_mobile || '',
          email: record.contact_email || '',
          address: record.address || '',
          status: cap(record.status || 'active')
        });
        break;
      case 'warehouseMaster':
        this.formValues.set({ locationCode: record.warehouse_code || '', locationName: record.warehouse_name || '', locationAddress: record.address || '', status: cap(record.status || 'active') });
        break;
      case 'uomMaster':
        this.applyUomRecordToForm(record, true);
        break;
      case 'categoryMaster':
        this.categorySerialApplicable.set(!!record.serial_applicable);
        this.categoryBatchApplicable.set(!!record.batch_applicable);
        this.formValues.set({
          categoryCode: record.category_code || '',
          categoryName: record.category_name || '',
          description: record.description || '',
          serialPolicyName: record.serial_policy_name || '',
          batchPolicyName: record.batch_policy_name || '',
          applicableUoms: (record.uoms || []).map((u: any) => u.uom_symbol || u.uom_name || u.uom_code).filter(Boolean),
          status: cap(record.status || 'active')
        });
        break;
      case 'hsnSacMapping':
        this.hsnSacCode.set(record.code || '');
        this.hsnSacDescription.set(record.description || '');
        this.gstRate.set(record.gst_rate ?? null);
        this.formValues.set({
          code: record.code || '',
          description: record.description || '',
          hsnType: record.hsn_type || 'HSN',
          category: record.category || '',
          gstRate: record.gst_rate ?? 0,
          cgstRate: record.cgst_rate ?? 0,
          sgstRate: record.sgst_rate ?? 0,
          igstRate: record.igst_rate ?? 0,
          cessRate: record.cess_rate ?? 0,
          effectiveDate: record.effective_date || null,
          status: cap(record.status || 'active')
        });
        break;
      case 'paymentTermsMaster':
        this.formValues.set({ termName: record.term_name || '', termCode: record.term_code || '', creditDays: record.credit_days ?? 0, discountPercent: record.discount_pct ?? 0, description: record.description || '', status: cap(record.status || 'active') });
        break;
      case 'brandMaster':
        this.formValues.set({ brandCode: record.brand_code || '', brandName: record.brand_name || '', manufacturer: record.manufacturer || '', description: record.description || '', status: cap(record.status || 'active') });
        break;
      case 'attributeMaster':
        this.formValues.set({ attributeCode: record.attribute_code || '', attributeName: record.attribute_name || '', attributeType: record.attribute_type || 'Text', possibleValues: (record.possible_values || []).join(', '), mandatoryFlag: record.is_mandatory ? 'Yes' : 'No', status: cap(record.status || 'active') });
        break;
      case 'productGroupMaster':
        this.formValues.set({ groupCode: record.group_code || '', groupName: record.group_name || '', linkedCategory: record.category_name || '', description: record.description || '', status: cap(record.status || 'active') });
        break;
      case 'variantMaster':
        this.formValues.set({ variantCode: record.variant_code || '', variantName: record.variant_name || '', description: record.description || '', status: cap(record.status || 'active') });
        {
          const attrs = (record.attributes || []).length
            ? record.attributes
            : (record.attribute_name ? [{ attribute_name: record.attribute_name, attribute_value: record.attribute_value }] : []);
          const rows = attrs.map((attr: any) => [attr.attribute_name || '', attr.attribute_value || '']);
          this.entryLineRowsKey.set('variantMaster');
          this.entryLineRows.set(rows.length ? rows : [this.blankLineRow()]);
        }
        break;
      case 'serialNumberPolicy':
        this.formValues.set({ policyCode: record.policy_code || '', policyName: record.policy_name || '', applicableCategory: record.category_name || '', serialFormat: record.serial_format || '', captureStage: record.capture_stage || '', status: cap(record.status || 'active') });
        break;
      case 'batchLotPolicy':
        this.formValues.set({ policyCode: record.policy_code || '', policyName: record.policy_name || '', applicableCategory: record.category_name || '', batchFormat: record.batch_format || '', expiryRequired: record.expiry_required ? 'Yes' : 'No', qcRequired: record.qc_required ? 'Yes' : 'No', status: cap(record.status || 'active') });
        break;
      case 'barcodeConfiguration':
        this.formValues.set({ barcodeType: record.barcode_type || '', autoGenerate: record.auto_generate ? 'Yes' : 'No', prefix: record.prefix || '', startingNumber: record.starting_number ?? 1, length: record.length ?? 12, applicableProducts: record.applicable_products || [], status: cap(record.status || 'active') });
        break;
      case 'substituteProducts':
        this.formValues.set({ product: record.product_name || '', substituteProduct: record.substitute_product_name || '', priority: record.priority ?? 1, remarks: record.remarks || '', status: cap(record.status || 'active') });
        break;
      case 'consumptionTypeMaster':
        this.formValues.set({ consumptionType: record.type_name || '', typeName: record.type_name || '', typeCode: record.type_code || '', department: record.department || '', approvalRequired: record.approval_required ? 'Yes' : 'No', approvalWorkflow: record.approval_workflow_name || '', remarks: record.remarks || '', status: cap(record.status || 'active') });
        break;
      case 'productTypeMaster':
        this.formValues.set({
          typeCode: record.type_code || '',
          typeName: record.type_name || '',
          description: record.description || '',
          sortOrder: record.sort_order ?? 100,
          tracksInventory: record.tracks_inventory ? 'Yes' : 'No',
          tracksCost: record.tracks_cost ? 'Yes' : 'No',
          isService: record.is_service ? 'Yes' : 'No',
          isAsset: record.is_asset ? 'Yes' : 'No',
          allowsPurchase: record.allows_purchase ? 'Yes' : 'No',
          allowsSale: record.allows_sale ? 'Yes' : 'No',
          allowsProduction: record.allows_production ? 'Yes' : 'No',
          isSystem: record.is_system ? 'Yes' : 'No',
          status: cap(record.status || 'active')
        });
        break;
      case 'vendorMaster':
        this.formValues.set({ name: record.vendor_name || '', code: record.vendor_code || '', segment: record.segment_name || '', type: record.vendor_type || 'Company', vendorCategory: record.vendor_category || '', gstin: record.gstin || '', pan: record.pan || '', mobile: record.mobile || '', email: record.email || '', address: record.address || '', creditLimit: record.credit_limit ?? 0, status: cap(record.status || 'active') });
        break;
      case 'customerMaster':
        this.formValues.set({ name: record.customer_name || '', code: record.customer_code || '', segment: record.segment_name || '', type: record.customer_type || 'Company', customerCategory: record.customer_category || '', gstin: record.gstin || '', pan: record.pan || '', mobile: record.mobile || '', email: record.email || '', address: record.address || '', creditLimit: record.credit_limit ?? 0, status: cap(record.status || 'active') });
        break;
      case 'productServiceMaster':
        this.genericNameValue.set(record.product_name || '');
        this.productName.set(record.product_name || '');
        this.selectedProductCategory.set(record.category_name || '');
        this.hsnSacCode.set(record.hsn_sac_code || '');
        this.gstRate.set(record.gst_rate ?? null);
        this.productBatchApplicable.set(!!record.batch_applicable);
        this.productSerialApplicable.set(!!record.serial_applicable);
        this.productExpiryApplicable.set(!!record.expiry_applicable);
        this.productQcRequired.set(!!record.qc_required);
        this.productTrackingRequired.set(!!record.batch_applicable || !!record.serial_applicable || !!record.expiry_applicable || !!record.qc_required);
        const savedVariants: ProductApplicableVariant[] = Array.isArray(record.applicable_variants) ? record.applicable_variants : [];
        const brandVariantValuationRequired = !!record.brand_name || !!record.variant_name || !!record.variant_label || savedVariants.length > 0 || !!record.valuation_method;
        this.productBrandRequired.set(brandVariantValuationRequired);
        this.productVariantRequired.set(brandVariantValuationRequired);
        this.productValuationRequired.set(brandVariantValuationRequired);
        this.productUomMappingRequired.set((record.uom_conversions || []).length > 0);
        const savedBundleItems: ProductBundleItem[] = Array.isArray(record.bundle_composition) ? record.bundle_composition : [];
        this.bundleCompositionItems.set(savedBundleItems);
        this.bundleCompositionRequired.set(record.product_nature_name === 'Service Bundle' || savedBundleItems.length > 0);
        this.formValues.set({
          productCode: record.product_code || '',
          sku: record.sku || '',
          productType: record.product_type || 'Physical Stock',
          productNatureId: record.product_nature_id ?? null,
          productNatureName: record.product_nature_name || '',
          pricingType: record.pricing_type || null,
          rentalUnit: record.rental_unit || null,
          baseUom: record.base_uom_symbol || record.base_uom_name || '',
          brand: record.brand_name || '',
          variant: record.variant_label || record.variant_name || '',
          valuationMethod: record.valuation_method || null,
          taxCategory: record.tax_category || '',
          serialPolicyName: record.serial_policy_name || '',
          batchPolicyName: record.batch_policy_name || '',
          minStockLevel: record.min_stock_level ?? 0,
          maxStockLevel: record.max_stock_level ?? 0,
          reorderLevel: record.reorder_level ?? 0,
          reorderQty: record.reorder_qty ?? 0,
          description: record.description || '',
          status: cap(record.item_status || record.status || 'active')
        });
        {
          const convRows = (record.uom_conversions || []).map((c: any) => [
            c.from_uom_symbol || c.from_uom_name || c.alt_uom_name || c.alt_uom || '',
            String(c.conversion_factor ?? ''),
            c.is_purchase_uom ? 'Yes' : 'No',
            c.is_sales_uom ? 'Yes' : 'No',
            c.status === 'inactive' ? 'No' : 'Yes'
          ]);
          this.entryLineRowsKey.set('productServiceMaster');
          this.entryLineRows.set(convRows.length ? convRows : [this.blankLineRow()]);
        }
        this.pendingVariantResolve.set(null);
        if (savedVariants.length > 0) {
          this.applyApplicableVariantSelection(savedVariants);
        } else if (record.variant_name || record.variant_label) {
          const rawLabel = String(record.variant_label || record.variant_name || '').trim();
          const rawName  = String(record.variant_name || '').trim();
          const match = this.loadedVariantObjects().find(v =>
            this.variantDisplayLabel(v) === rawLabel || v.variant_name === rawName
          );
          if (match) {
            this.applyApplicableVariantSelection([{
              id: match.id,
              variant_name: match.variant_name,
              variant_label: this.variantDisplayLabel(match),
              is_default: true,
            }]);
          } else {
            // Variants may not have loaded yet — store pending for effect-based healing
            this.pendingVariantResolve.set({ name: rawName, label: rawLabel });
            this.applyApplicableVariantSelection([]);
          }
        } else {
          this.applyApplicableVariantSelection([]);
        }
        this.variantStockCombinationRows.set(Array.isArray(record.variant_stock_controls) ? record.variant_stock_controls : []);
        this.pendingCombinationPicks.set({});
        this.pendingCombinationVariantId.set(this.selectedApplicableVariantRows()[0]?.id ?? null);
        break;
    }
  }

  private applyPurchaseRecordToForm(record: any): void {
    const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : 'Draft';
    this.txDocId.set(record.id ?? null);
    this.txDocStatus.set(record.status || 'draft');

    if (this.config?.key === 'purchaseRequisition') {
      this.txDocNumber.set(record.pr_number || '');
      this.formValues.set({
        segment: record.segment_name || this.selectedSegment(),
        segmentId: record.segment_id ?? null,
        prNo: record.pr_number || '',
        prDate: record.pr_date || null,
        branchId: this.branchIdFromRecord(record),
        branch: this.branchNameFromRecord(record),
        department: record.department || '',
        requestedBy: record.requested_by || '',
        priority: cap(record.priority || 'medium'),
        requiredDate: record.required_by || null,
        remarks: record.remarks || ''
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.normalizeLineRow([
        item.product_name || '',
        item.description || '',
        item.uom_name || '',
        String(item.required_qty ?? ''),
        String(item.approved_qty ?? ''),
        String(item.estimated_rate ?? ''),
        item.remarks || ''
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
      return;
    }

    if (this.config?.key === 'requestForQuotation') {
      this.txDocNumber.set(record.rfq_number || '');
      this.formValues.set({
        segment: record.segment_name || this.selectedSegment(),
        segmentId: record.segment_id ?? null,
        rfqNo: record.rfq_number || '',
        rfqDate: record.rfq_date || null,
        validTill: record.valid_till || null,
        vendorId: record.vendor_id ?? null,
        vendor: record.vendor_name || '',
        prId: record.pr_id || null,
        prReference: record.pr_number || '',
        currency: record.currency || 'INR',
        deliveryLocation: record.delivery_location || '',
        paymentTerms: record.payment_terms || '',
        status: cap(record.status || 'draft'),
        termsConditions: record.remarks || ''
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.normalizeLineRow([
        item.product_name || '',
        String(item.required_qty ?? ''),
        item.uom_name || '',
        String(item.target_rate ?? ''),
        String(item.vendor_rate ?? ''),
        item.lead_time || '',
        item.remarks || ''
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
      return;
    }

    if (this.config?.key === 'purchaseOrder') {
      this.txDocNumber.set(record.po_number || '');
      this.formValues.set({
        segment: record.segment_name || this.selectedSegment(),
        segmentId: record.segment_id ?? null,
        poNo: record.po_number || '',
        poDate: record.po_date || null,
        expectedDelivery: record.expected_delivery || null,
        rfqId: record.rfq_id ?? null,
        rfqReference: record.rfq_number || '',
        linkedPr: record.rfq_number || '',
        vendorId: record.vendor_id ?? null,
        supplier: record.vendor_name || '',
        warehouseId: record.warehouse_id ?? null,
        receivingWarehouse: record.warehouse_name || '',
        currency: record.currency || 'INR',
        paymentTerms: record.payment_terms || '',
        referenceNo: record.reference_no || '',
        terms: record.terms_conditions || '',
        status: cap(record.status || 'draft')
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.normalizeLineRow([
        item.product_name || '',
        item.variant_name || '',
        item.attribute_value || '',
        item.uom_name || '',
        String(item.qty ?? ''),
        String(item.rate ?? ''),
        String(item.discount_pct ?? ''),
        String(item.gst_rate ?? ''),
        item.warehouse_name || record.warehouse_name || '',
        String(item.amount ?? '')
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
      return;
    }

    if (this.config?.key === 'goodsReceipt') {
      this.txDocNumber.set(record.grn_number || '');
      this.formValues.set({
        segment: record.segment_name || this.selectedSegment(),
        segmentId: record.segment_id ?? null,
        grnNo: record.grn_number || '',
        grnDate: record.grn_date || null,
        vendorId: record.vendor_id ?? null,
        vendor: record.vendor_name || '',
        poId: record.po_id ?? record.rfq_id ?? null,
        poReference: record.po_number || record.rfq_number || '',
        warehouseId: record.warehouse_id ?? null,
        warehouse: record.warehouse_name || '',
        vehicleNo: record.transport_details || '',
        vendorInvoiceNo: record.vendor_invoice_no || '',
        vendorInvoiceDate: record.vendor_invoice_dt || null,
        status: cap(record.status || 'draft'),
        remarks: record.remarks || ''
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.normalizeLineRow([
        item.product_name || '',
        item.uom_name || '',
        String(item.order_qty ?? ''),
        String(item.received_qty ?? ''),
        String(item.accepted_qty ?? ''),
        String(item.rejected_qty ?? ''),
        String(item.rate ?? ''),
        String(item.discount_pct ?? ''),
        String(item.gst_rate ?? ''),
        item.batch_no || '',
        item.serial_no || '',
        item.expiry_date || '',
        record.warehouse_name || '',
        String(item.amount ?? '')
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
      return;
    }

    if (this.config?.key === 'purchaseInvoice') {
      this.txDocNumber.set(record.pi_number || '');
      this.formValues.set({
        segment: record.segment_name || this.selectedSegment(),
        segmentId: record.segment_id ?? null,
        piNo: record.pi_number || '',
        piDate: record.pi_date || null,
        vendorId: record.vendor_id ?? null,
        vendor: record.vendor_name || '',
        grnId: record.grn_id || null,
        grnReference: record.grn_number || '',
        vendorInvoiceNo: record.vendor_invoice_no || '',
        vendorInvoiceDate: record.vendor_invoice_dt || null,
        dueDate: record.due_date || null,
        paymentTerms: record.payment_terms || '',
        status: cap(record.status || 'draft'),
        remarks: record.remarks || ''
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.normalizeLineRow([
        item.product_name || '',
        item.uom_name || '',
        String(item.qty ?? ''),
        String(item.rate ?? ''),
        String(item.discount_pct ?? ''),
        String(item.gst_rate ?? ''),
        String(item.amount ?? ''),
        item.remarks || ''
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
    }

    if (this.config?.key === 'purchaseReturn') {
      this.txDocNumber.set(record.return_number || '');
      this.formValues.set({
        segment: record.segment_name || this.selectedSegment(),
        segmentId: record.segment_id ?? null,
        returnNo: record.return_number || '',
        returnDate: record.return_date || null,
        vendorId: record.vendor_id ?? null,
        vendor: record.vendor_name || '',
        piId: record.pi_id ?? null,
        piReference: record.pi_number || '',
        debitNoteRef: record.debit_note_ref || '',
        warehouseId: record.warehouse_id ?? null,
        warehouse: record.warehouse_name || '',
        returnReason: record.return_reason || '',
        status: cap(record.status || 'draft'),
        remarks: record.remarks || ''
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.normalizeLineRow([
        item.product_name || '',
        String(item.grn_qty ?? ''),
        String(item.return_qty ?? ''),
        item.uom_name || '',
        String(item.rate ?? ''),
        String(item.return_amount ?? ''),
        item.return_reason || ''
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
    }
  }

  private applySalesRecordToForm(record: any): void {
    const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : 'Draft';
    this.txDocId.set(record.id ?? null);
    this.txDocStatus.set(record.status || 'draft');
    this.txDocNumber.set(record.doc_number || '');

    if (this.config?.key === 'estimation' || this.config?.key === 'proformaInvoice') {
      this.formValues.set({
        segment: record.segment_name || this.selectedSegment(),
        segmentId: record.segment_id ?? null,
        transactionDate: record.doc_date || null,
        referenceNo: record.reference_no || '',
        party: record.customer_name || '',
        customerId: record.customer_id ?? null,
        status: cap(record.status || 'draft'),
        remarks: record.remarks || ''
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.normalizeLineRow([
        item.product_name || '',
        item.uom_name || '',
        String(item.qty ?? ''),
        String(item.rate ?? ''),
        String(item.discount_pct ?? ''),
        String(item.gst_rate ?? ''),
        String(item.amount ?? '')
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
      return;
    }

    if (this.config?.key === 'salesInvoice') {
      this.formValues.set({
        invoiceNo: record.doc_number || '',
        invoiceDate: record.doc_date || null,
        dueDate: record.due_date || null,
        dcId: record.dc_id ?? null,
        dcReference: record.dc_number || '',
        customerId: record.customer_id ?? null,
        customer: record.customer_name || '',
        placeOfSupply: record.place_of_supply || '',
        warehouseId: null,
        warehouse: record.warehouse_name || '',
        transportMode: record.transport_mode || '',
        vehicleNo: record.vehicle_no || '',
        paymentTerms: record.payment_terms || '',
        customerNotes: record.customer_notes || '',
        internalNotes: record.internal_notes || '',
        status: cap(record.status || 'draft')
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.normalizeLineRow([
        item.product_name || '',
        item.uom_name || '',
        String(item.qty ?? ''),
        String(item.rate ?? ''),
        String(item.discount_pct ?? ''),
        String(item.gst_rate ?? ''),
        item.batch_no || '',
        item.expiry_date || '',
        item.warehouse_name || record.warehouse_name || '',
        String(item.amount ?? '')
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
      return;
    }

    if (this.config?.key === 'salesQuotation') {
      this.formValues.set({
        quotationNo: record.doc_number || '',
        quotationDate: record.doc_date || null,
        validTill: record.valid_till || null,
        customerId: record.customer_id ?? null,
        customer: record.customer_name || '',
        priceList: '',
        currency: record.currency || 'INR',
        enquiryRef: record.reference_no || '',
        branch: '',
        terms: record.remarks || '',
        status: cap(record.status || 'draft')
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.normalizeLineRow([
        item.product_name || '',
        item.uom_name || '',
        String(item.qty ?? ''),
        String(item.rate ?? ''),
        String(item.discount_pct ?? ''),
        '',
        String(item.gst_rate ?? ''),
        String(item.amount ?? '')
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
      return;
    }

    if (this.config?.key === 'salesOrder') {
      this.formValues.set({
        soNo: record.doc_number || '',
        soDate: record.doc_date || null,
        customerId: record.customer_id ?? null,
        customer: record.customer_name || '',
        branch: '',
        warehouseId: null,
        warehouse: '',
        paymentTerms: record.payment_terms || '',
        deliveryDate: record.delivery_date || null,
        quotationRef: record.reference_no || '',
        deliveryAddress: record.delivery_location || '',
        status: cap(record.status || 'draft')
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.normalizeLineRow([
        item.product_name || '',
        item.uom_name || '',
        String(item.qty ?? ''),
        String(item.rate ?? ''),
        String(item.discount_pct ?? ''),
        String(item.gst_rate ?? ''),
        String(item.amount ?? '')
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
      return;
    }

    if (this.config?.key === 'deliveryChallan') {
      this.txDocNumber.set(record.dc_number || '');
      this.formValues.set({
        segment: record.segment_name || this.selectedSegment(),
        segmentId: record.segment_id ?? null,
        dcNo: record.dc_number || '',
        dcDate: record.dc_date || null,
        soId: record.so_id ?? null,
        soReference: record.so_number || '',
        customerId: record.customer_id ?? null,
        customer: record.customer_name || '',
        fromWarehouseId: record.from_warehouse_id ?? null,
        fromWarehouse: record.from_warehouse_name || '',
        vehicle: record.vehicle || '',
        transporter: record.transporter || '',
        lrNo: record.lr_no || '',
        deliveryAddress: record.delivery_address || '',
        status: cap(record.status || 'draft'),
        remarks: record.remarks || ''
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.normalizeLineRow([
        item.product_name || '',
        String(item.so_qty ?? ''),
        String(item.dispatch_qty ?? ''),
        item.uom_name || '',
        item.batch_serial || '',
        item.remarks || ''
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
      return;
    }

    if (this.config?.key === 'salesReturn') {
      this.txDocNumber.set(record.return_number || '');
      this.formValues.set({
        segment: record.segment_name || this.selectedSegment(),
        segmentId: record.segment_id ?? null,
        returnNo: record.return_number || '',
        returnDate: record.return_date || null,
        customerId: record.customer_id ?? null,
        customer: record.customer_name || '',
        invoiceId: record.invoice_id ?? null,
        invoiceReference: record.invoice_number || '',
        creditNoteRef: record.credit_note_ref || '',
        returnToWarehouseId: record.return_to_warehouse_id ?? null,
        returnToWarehouse: record.return_to_warehouse_name || '',
        returnReason: record.return_reason || '',
        status: cap(record.status || 'draft'),
        remarks: record.remarks || ''
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.normalizeLineRow([
        item.product_name || '',
        String(item.invoiced_qty ?? ''),
        String(item.return_qty ?? ''),
        item.uom_name || '',
        String(item.rate ?? ''),
        String(item.return_amount ?? ''),
        item.reason || ''
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
    }
  }

  private normalizeCaptureStage(s: any): string | null {
    const raw = String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    return raw.includes('both') ? 'both' : raw || null;
  }

  protected buildPayload(): Record<string, any> {
    const v = this.formValues();
    const lc = (s: string) => (s || 'Active').toLowerCase();
    const bool = (s: any) => s === true || s === 'Yes';
    const productType = (s: any) => String(s || '').trim() || 'Physical Stock';
    const captureStage = (s: any) => this.normalizeCaptureStage(s);
    const selectedSegmentName = String(v['segment'] || this.selectedSegment() || '').trim() || null;
    const selectedSegmentId = this.segmentIdByName(selectedSegmentName);
    const idsFromSelection = <T extends { id: number }>(
      value: any,
      items: T[],
      match: (item: T, selected: any) => boolean
    ): number[] => {
      const selected = Array.isArray(value) ? value : [];
      const ids = selected.map(item => {
        const numericId = Number(item);
        if (Number.isFinite(numericId) && numericId > 0) return numericId;
        return items.find(record => match(record, item))?.id ?? 0;
      }).filter(id => id > 0);
      return [...new Set(ids)];
    };
    if (this.isPurchaseTransactionKey()) {
      return this.buildPurchaseTransactionPayload(v, selectedSegmentId, selectedSegmentName);
    }
    if (this.isSalesTransactionKey()) {
      return this.buildSalesTransactionPayload(v, selectedSegmentId, selectedSegmentName);
    }
    switch (this.config?.key) {
      case 'businessSegments':
        return {
          segment_name: v['segmentName'] || '',
          category_ids: idsFromSelection(v['category'], this.loadedCategoryObjects(), (item, selected) => this.optionEquals(item.category_name, selected)),
          hsn_sac_ids: idsFromSelection(v['relatedHsnSac'], this.loadedHsnSacObjects(), (item, selected) => this.optionEquals(item.code, selected)),
          uom_ids: idsFromSelection(v['typicalUoms'], this.loadedUomObjects(), (item, selected) =>
            this.optionEquals(item.uom_name, selected) || this.optionEquals(item.uom_symbol, selected) || this.optionEquals(item.uom_code, selected)
          ),
          usage_note: v['usageNote'] || null,
          status: lc(v['status'] || 'active')
        };
      case 'branchMaster':
        return {
          branch_code: v['branchCode'] || null,
          branch_name: v['branchName'] || '',
          segment_id: selectedSegmentId,
          segment_name: selectedSegmentName,
          gstin: v['gstin'] || null,
          pan: v['pan'] || null,
          contact_name: v['contactPerson'] || null,
          contact_mobile: v['mobile'] || null,
          contact_email: v['email'] || null,
          address: v['address'] || null,
          activity_types: Array.isArray(v['activityTypes']) ? v['activityTypes'] : [],
          is_head_office: false,
          status: lc(v['status'] || 'active')
        };
      case 'warehouseMaster':
        return { segment_id: selectedSegmentId, warehouse_code: v['locationCode'] || '', warehouse_name: v['locationName'] || '', address: v['locationAddress'] || '', status: lc(v['status']) };
      case 'uomMaster': {
        const existing = this.savedRecordObjects().find(record => Number(record.id) === Number(this.editingId()));
        const existingConversions = (existing?.conversions || []).map((row: any) => ({
          id: row.id ?? null,
          from_uom_id: row.from_uom_id ?? null,
          from_uom_name: row.from_uom_name ?? null,
          to_uom_id: row.to_uom_id ?? null,
          to_uom_name: row.to_uom_name ?? null,
          conversion_factor: row.conversion_factor ?? null,
          rounding_rule: row.rounding_rule || 'Exact',
          status: row.status || 'active'
        }));
        return {
          segment_id: selectedSegmentId,
          uom_code: v['uomCode'] || '',
          uom_name: v['uomName'] || '',
          decimal_allowed: v['decimalAllowed'] === true || v['decimalAllowed'] === 'Yes',
          is_base_uom: !!existing?.is_base_uom,
          conversions: existingConversions,
          status: lc(v['status'])
        };
      }
      case 'categoryMaster':
        return {
          category_code: v['categoryCode'] || '',
          category_name: v['categoryName'] || '',
          description: v['description'] || '',
          serial_applicable: this.categorySerialApplicable(),
          serial_policy_name: v['serialPolicyName'] || null,
          batch_applicable: this.categoryBatchApplicable(),
          batch_policy_name: v['batchPolicyName'] || null,
          uom_ids: idsFromSelection(v['applicableUoms'], this.loadedUomObjects(), (item, selected) =>
            this.optionEquals(item.uom_name, selected) || this.optionEquals(item.uom_symbol, selected) || this.optionEquals(item.uom_code, selected)
          ),
          status: lc(v['status'])
        };
      case 'hsnSacMapping': {
        const code = String(v['code'] || this.hsnSacCode()).trim();
        const gstRate = this.gstRate() ?? (v['gstRate'] !== undefined && v['gstRate'] !== '' ? Number(v['gstRate']) : 0);
        return {
          code,
          description: v['description'] || this.hsnSacDescription() || null,
          hsn_type: v['hsnType'] || (code.length > 4 ? 'SAC' : 'HSN'),
          category: v['category'] || null,
          gst_rate: gstRate,
          cgst_rate: v['cgstRate'] !== undefined && v['cgstRate'] !== '' ? Number(v['cgstRate']) : gstRate / 2,
          sgst_rate: v['sgstRate'] !== undefined && v['sgstRate'] !== '' ? Number(v['sgstRate']) : gstRate / 2,
          igst_rate: v['igstRate'] !== undefined && v['igstRate'] !== '' ? Number(v['igstRate']) : gstRate,
          cess_rate: Number(v['cessRate']) || 0,
          effective_date: v['effectiveDate'] || null,
          status: lc(v['status'])
        };
      }
      case 'paymentTermsMaster':
        return { term_code: v['termCode'] || null, term_name: v['termName'] || '', credit_days: Number(v['creditDays']) || 0, discount_pct: Number(v['discountPercent']) || 0, description: v['description'] || '', status: lc(v['status']) };
      case 'brandMaster':
        return { segment_id: selectedSegmentId, brand_code: v['brandCode'] || null, brand_name: v['brandName'] || '', category_name: v['categoryName'] || null, manufacturer: v['manufacturer'] || null, description: v['description'] || null, status: lc(v['status']) };
      case 'attributeMaster': {
        const rawValues = String(v['possibleValues'] || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        return { segment_id: selectedSegmentId, attribute_code: v['attributeCode'] || null, attribute_name: v['attributeName'] || '', category_name: v['categoryName'] || null, attribute_type: this.attributeTypeForApi(v['attributeType']), possible_values: rawValues.length ? rawValues : null, is_mandatory: bool(v['mandatoryFlag']), status: lc(v['status']) };
      }
      case 'productGroupMaster':
        return { segment_id: selectedSegmentId, group_code: v['groupCode'] || null, group_name: v['groupName'] || '', category_name: v['linkedCategory'] || null, description: v['description'] || null, status: lc(v['status']) };
      case 'variantMaster':
        {
          const attrs = this.entryLineRows()
            .filter(r => r.some(cell => String(cell ?? '').trim()))
            .filter(r => r[0])
            .map((r, index) => ({
              attribute_name: r[0],
              attribute_value: this.variantAttributeValueForPayload(r[1]),
              display_order: index + 1
            }));
          const firstAttr = attrs[0] || { attribute_name: v['attributeName'] || null, attribute_value: this.variantAttributeValueForPayload(v['attributeValue']) };
          return {
            segment_id: selectedSegmentId,
            variant_code: v['variantCode'] || null,
            variant_name: v['variantName'] || '',
            category_name: v['categoryName'] || null,
            attribute_name: firstAttr.attribute_name,
            attribute_value: firstAttr.attribute_value,
            attributes: attrs.length ? attrs : (firstAttr.attribute_name ? [firstAttr] : []),
            description: v['description'] || null,
            status: lc(v['status'] || 'active')
          };
        }
      case 'serialNumberPolicy':
        return { segment_id: selectedSegmentId, policy_code: v['policyCode'] || null, policy_name: v['policyName'] || '', category_name: v['applicableCategory'] || null, serial_format: v['serialFormat'] || null, capture_stage: captureStage(v['captureStage']), status: lc(v['status']) };
      case 'batchLotPolicy':
        return { segment_id: selectedSegmentId, policy_code: v['policyCode'] || null, policy_name: v['policyName'] || '', category_name: v['applicableCategory'] || v['applicableFor'] || null, batch_format: v['batchFormat'] || null, expiry_required: bool(v['expiryRequired']), qc_required: bool(v['qcRequired']), status: lc(v['status']) };
      case 'barcodeConfiguration':
        return {
          category_name: v['categoryName'] || null,
          barcode_type: v['barcodeType'] || '',
          auto_generate: bool(v['autoGenerate'] || 'Yes'),
          prefix: v['prefix'] || null,
          starting_number: Number(v['startingNumber']) || 1,
          length: Number(v['length']) || 12,
          applicable_products: Array.isArray(v['applicableProducts']) ? v['applicableProducts'] : String(v['applicableProducts'] || '').split(',').map((item: string) => item.trim()).filter(Boolean),
          status: lc(v['status'])
        };
      case 'substituteProducts':
        return {
          product_name: v['product'] || '',
          substitute_product_name: v['substituteProduct'] || '',
          priority: Number(v['priority']) || 1,
          remarks: v['remarks'] || null,
          status: lc(v['status'])
        };
      case 'consumptionTypeMaster':
        return { segment_id: selectedSegmentId, type_code: v['typeCode'] || null, type_name: v['typeName'] || v['consumptionType'] || '', department: v['department'] || null, approval_required: bool(v['approvalRequired']), remarks: v['remarks'] || null, status: lc(v['status']) };
      case 'productTypeMaster':
        return {
          type_code: v['typeCode'] || null,
          type_name: v['typeName'] || '',
          description: v['description'] || null,
          sort_order: Number(v['sortOrder']) || 100,
          tracks_inventory: bool(v['tracksInventory'] ?? 'Yes'),
          tracks_cost: bool(v['tracksCost'] ?? 'Yes'),
          is_service: bool(v['isService']),
          is_asset: bool(v['isAsset']),
          allows_purchase: bool(v['allowsPurchase'] ?? 'Yes'),
          allows_sale: bool(v['allowsSale'] ?? 'Yes'),
          allows_production: bool(v['allowsProduction']),
          status: lc(v['status'])
        };
      case 'vendorMaster':
        return { segment_id: selectedSegmentId, vendor_code: v['code'] || v['vendorCode'] || null, vendor_name: v['name'] || v['vendorName'] || '', vendor_type: v['type'] || v['vendorType'] || 'Company', segment_name: selectedSegmentName, vendor_category: v['vendorCategory'] || null, gstin: v['gstin'] || null, pan: v['pan'] || null, mobile: v['mobile'] || null, email: v['email'] || null, address: v['address'] || null, credit_limit: Number(v['creditLimit']) || 0, status: lc(v['status']) };
      case 'customerMaster':
        return { segment_id: selectedSegmentId, customer_code: v['code'] || v['customerCode'] || null, customer_name: v['name'] || v['customerName'] || '', customer_type: v['type'] || v['customerType'] || 'Company', segment_name: selectedSegmentName, customer_category: v['customerCategory'] || null, gstin: v['gstin'] || null, pan: v['pan'] || null, mobile: v['mobile'] || null, email: v['email'] || null, address: v['address'] || null, credit_limit: Number(v['creditLimit']) || 0, status: lc(v['status']) };
      case 'productServiceMaster': {
        const baseUomSelection = v['baseUom'] || null;
        const baseUom = this.findUomBySelection(baseUomSelection);
        const baseUomName = this.uomNameFromSelection(baseUomSelection);
        const productUomConversions = this.productUomMappingRequired()
          ? this.entryLineRows()
            .filter(r => String(r[0] ?? '').trim())
            .map(r => {
              const altUom = this.findUomBySelection(r[0]);
              const altUomName = this.uomNameFromSelection(r[0]);
              return {
                from_uom_id: altUom?.id ?? null,
                from_uom_name: altUomName,
                alt_uom: altUom?.uom_symbol || altUomName,
                alt_uom_name: altUomName,
                to_uom_id: baseUom?.id ?? null,
                to_uom_name: baseUomName,
                conversion_factor: this.parseDecimalNumber(r[1]) || null,
                is_purchase_uom: this.lineCellYesNoChecked(r[2]),
                is_sales_uom: this.lineCellYesNoChecked(r[3]),
                is_default_purchase: this.lineCellYesNoChecked(r[2]),
                is_default_sale: this.lineCellYesNoChecked(r[3]),
                status: this.lineCellYesNoChecked(r[4]) ? 'active' : 'inactive'
              };
            })
          : [];
        return {
          segment_id: selectedSegmentId,
          segment_name: selectedSegmentName,
          product_code: v['productCode'] || null,
          product_name: this.productName().trim() || v['name'] || v['productName'] || '',
          sku: v['sku'] || null,
          product_type: productType(v['productType']),
          product_nature_id: v['productNatureId'] ?? null,
          product_nature_name: v['productNatureName'] || v['productType'] || null,
          item_status: lc(v['status'] || 'active'),
          status: lc(v['status'] || 'active'),
          category_name: this.selectedProductCategory() || v['category'] || v['categoryName'] || null,
          base_uom_id: baseUom?.id ?? null,
          base_uom_name: baseUomName,
          brand_name: this.productBrandRequired() ? (v['brand'] || v['brandName'] || null) : null,
          variant_name: this.productVariantRequired() ? (this.variantNameFromSelection(v['variant']) || null) : null,
          hsn_sac_code: this.hsnSacCode().trim() || v['hsnSac'] || v['hsnSacCode'] || null,
          gst_rate: this.gstRate() ?? (v['gstRate'] !== undefined && v['gstRate'] !== '' ? Number(v['gstRate']) : null),
          tax_category: v['taxCategory'] || (this.gstRate() !== null ? `GST ${this.gstRate()}%` : null),
          valuation_method: this.productValuationRequired() && v['valuationMethod'] && v['valuationMethod'] !== 'None' ? v['valuationMethod'] : 'FIFO',
          reorder_level: Number(v['reorderLevel']) || 0,
          reorder_qty: Number(v['reorderQty']) || 0,
          max_stock_level: Number(v['maxStockLevel']) || 0,
          min_stock_level: Number(v['minStockLevel']) || 0,
          batch_policy_name: v['batchPolicyName'] || null,
          serial_policy_name: v['serialPolicyName'] || null,
          batch_applicable: this.productBatchApplicable() || bool(v['batchApplicable']),
          serial_applicable: this.productSerialApplicable() || bool(v['serialApplicable']),
          expiry_applicable: this.productExpiryApplicable() || bool(v['expiryApplicable']),
          qc_required: this.productQcRequired() || bool(v['qcRequired']),
          description: v['description'] || null,
          pricing_type: InventoryScreenShell.PRICING_TYPE_NATURES.has(v['productNatureName']) ? (v['pricingType'] || null) : null,
          rental_unit: v['pricingType'] === 'Rental' ? (v['rentalUnit'] || null) : null,
          uom_conversions: productUomConversions,
          applicable_variants: this.selectedApplicableVariants().map(av => ({
            id: av.id,
            variant_name: av.variant_name,
            variant_label: av.variant_label,
            is_default: av.is_default,
          })),
          variant_stock_controls: this.variantStockCombinationRows(),
          bundle_composition: v['productNatureName'] === 'Service Bundle'
            ? this.bundleCompositionItems()
              .filter(b => b.item_id)
              .map(b => ({
                item_id: b.item_id,
                item_name: b.item_name,
                quantity: Number(b.quantity) || 1,
                condition_tracked: !!b.condition_tracked,
                depreciation_linked: !!b.depreciation_linked,
              }))
            : []
        };
      }
      default:
        return v;
    }
  }

  private buildPurchaseTransactionPayload(v: Record<string, any>, selectedSegmentId: number | null, selectedSegmentName: string | null): Record<string, any> {
    const branch = this.findBranchBySelection(v['branch']);
    const vendor = this.findVendorBySelection(v['vendor']);
    const warehouse = this.findWarehouseBySelection(v['warehouse']);
    const status = (value: any, fallback = 'draft') => this.purchaseStatus(value, fallback);
    const priority = this.purchaseStatus(v['priority'], 'medium');
    const docNo = (key: string, label: string) => String(v[key] || this.transactionNumberValue({ key, label })).trim() || null;
    const docDate = (key: string) => v[key] || this.todayIso();
    const segmentId = selectedSegmentId || Number(v['segmentId']) || null;
    const branchId = this.optionalNumber(branch?.branch_id)
      ?? this.optionalNumber(branch?.id)
      ?? this.optionalNumber(v['branchId']);
    const vendorId = vendor?.id ?? this.optionalNumber(v['vendorId']);
    const warehouseId = warehouse?.id ?? this.optionalNumber(v['warehouseId']);

    if (this.config?.key === 'purchaseRequisition') {
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        branch_id: branchId,
        pr_number: docNo('prNo', 'PR Number'),
        pr_date: docDate('prDate'),
        department: v['department'] || null,
        required_by: v['requiredDate'] || null,
        requested_by: v['requestedBy'] || null,
        priority: ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium',
        remarks: v['remarks'] || null,
        status: this.editingId() ? status(this.txDocStatus(), 'draft') : 'draft',
        items: this.purchasePrItems()
      };
    }

    if (this.config?.key === 'requestForQuotation') {
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        rfq_number: docNo('rfqNo', 'RFQ Number'),
        rfq_date: docDate('rfqDate'),
        valid_till: v['validTill'] || null,
        pr_id: this.optionalNumber(v['prId']),
        pr_number: v['prReference'] || null,
        vendor_id: vendorId,
        vendor_name: vendor?.vendor_name || v['vendor'] || null,
        vendor_gstin: vendor?.gstin || null,
        delivery_location: v['deliveryLocation'] || null,
        payment_terms: v['paymentTerms'] || null,
        currency: v['currency'] || 'INR',
        remarks: v['termsConditions'] || v['remarks'] || null,
        status: status(v['status'], 'draft'),
        items: this.purchaseRfqItems()
      };
    }

    if (this.config?.key === 'purchaseOrder') {
      const poVendor = this.findVendorBySelection(v['supplier'] || v['vendor']);
      const poVendorId = poVendor?.id ?? this.optionalNumber(v['vendorId']);
      const poWarehouse = this.findWarehouseBySelection(v['receivingWarehouse'] || v['warehouse']);
      const poWarehouseId = poWarehouse?.id ?? this.optionalNumber(v['warehouseId']);
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        vendor_id: poVendorId,
        vendor_name: poVendor?.vendor_name || v['supplier'] || v['vendor'] || null,
        vendor_gstin: poVendor?.gstin || null,
        rfq_id: this.optionalNumber(v['rfqId']),
        rfq_number: v['rfqReference'] || v['linkedPr'] || null,
        warehouse_id: poWarehouseId,
        warehouse_name: poWarehouse?.warehouse_name || v['receivingWarehouse'] || null,
        po_number: docNo('poNo', 'PO Number'),
        po_date: docDate('poDate'),
        expected_delivery: v['expectedDelivery'] || null,
        currency: v['currency'] || 'INR',
        payment_terms: v['paymentTerms'] || null,
        reference_no: v['referenceNo'] || null,
        terms_conditions: v['terms'] || null,
        status: status(v['status'], 'draft'),
        items: this.purchasePoItems()
      };
    }

    if (this.config?.key === 'goodsReceipt') {
      const grnStatus = status(v['status'], 'draft');
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        warehouse_id: warehouseId,
        warehouse_name: warehouse?.warehouse_name || v['warehouse'] || null,
        vendor_id: vendorId,
        vendor_name: vendor?.vendor_name || v['vendor'] || null,
        vendor_gstin: vendor?.gstin || null,
        po_id: this.optionalNumber(v['poId']),
        po_number: v['poReference'] || null,
        grn_number: docNo('grnNo', 'GRN Number'),
        grn_date: docDate('grnDate'),
        vendor_invoice_no: v['vendorInvoiceNo'] || null,
        vendor_invoice_dt: v['vendorInvoiceDate'] || null,
        transport_details: v['vehicleNo'] || null,
        remarks: v['remarks'] || null,
        status: grnStatus,
        post: grnStatus === 'posted',
        items: this.purchaseGrnItems(warehouse?.warehouse_name || v['warehouse'] || '')
      };
    }

    if (this.config?.key === 'purchaseInvoice') {
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        vendor_id: vendorId,
        vendor_name: vendor?.vendor_name || v['vendor'] || null,
        vendor_gstin: vendor?.gstin || null,
        grn_id: this.optionalNumber(v['grnId']),
        grn_number: v['grnReference'] || null,
        pi_number: docNo('piNo', 'PI Number'),
        pi_date: docDate('piDate'),
        vendor_invoice_no: v['vendorInvoiceNo'] || null,
        vendor_invoice_dt: v['vendorInvoiceDate'] || null,
        due_date: v['dueDate'] || null,
        payment_terms: v['paymentTerms'] || null,
        remarks: v['remarks'] || null,
        status: status(v['status'], 'draft'),
        items: this.purchasePiItems()
      };
    }

    if (this.config?.key === 'purchaseReturn') {
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        vendor_id: vendorId,
        vendor_name: vendor?.vendor_name || v['vendor'] || null,
        vendor_gstin: vendor?.gstin || null,
        pi_id: this.optionalNumber(v['piId']),
        pi_number: v['piReference'] || null,
        return_number: docNo('returnNo', 'Return Number'),
        return_date: docDate('returnDate'),
        debit_note_ref: v['debitNoteRef'] || null,
        warehouse_id: warehouseId,
        warehouse_name: warehouse?.warehouse_name || v['warehouse'] || null,
        return_reason: v['returnReason'] || null,
        remarks: v['remarks'] || null,
        status: status(v['status'], 'draft'),
        items: this.purchaseReturnItems()
      };
    }

    return v;
  }

  private buildSalesTransactionPayload(v: Record<string, any>, selectedSegmentId: number | null, selectedSegmentName: string | null): Record<string, any> {
    const status = (value: any, fallback = 'draft') => this.purchaseStatus(value, fallback);
    const docNo = (key: string, label: string) => String(v[key] || this.transactionNumberValue({ key, label })).trim() || null;
    const docDate = (key: string) => v[key] || this.todayIso();
    const segmentId = selectedSegmentId || Number(v['segmentId']) || null;
    const items = this.salesLineItems();
    const customerField = (this.config?.key === 'estimation' || this.config?.key === 'proformaInvoice') ? 'party' : 'customer';
    const customer = this.findCustomerBySelection(v[customerField]);
    const customerId = customer?.id ?? this.optionalNumber(v['customerId']);
    const customerName = customer?.customer_name || v[customerField] || null;
    const customerGstin = customer?.gstin || null;
    const docNum = this.editingId() ? (this.txDocNumber() || null) : null;

    if (this.config?.key === 'estimation') {
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        doc_number: docNum,
        doc_date: docDate('transactionDate'),
        customer_id: customerId,
        customer_name: customerName,
        reference_no: v['referenceNo'] || null,
        payment_terms: v['paymentTerms'] || null,
        remarks: v['remarks'] || null,
        status: status(v['status'], 'draft'),
        items
      };
    }

    if (this.config?.key === 'proformaInvoice') {
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        doc_number: docNum,
        doc_date: docDate('transactionDate'),
        customer_id: customerId,
        customer_name: customerName,
        reference_no: v['referenceNo'] || null,
        payment_terms: v['paymentTerms'] || null,
        remarks: v['remarks'] || null,
        status: status(v['status'], 'draft'),
        items
      };
    }

    if (this.config?.key === 'salesInvoice') {
      const warehouse = this.findWarehouseBySelection(v['warehouse']);
      const warehouseId = warehouse?.id ?? this.optionalNumber(v['warehouseId']);
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        doc_number: docNo('invoiceNo', 'Invoice No'),
        doc_date: docDate('invoiceDate'),
        due_date: v['dueDate'] || null,
        dc_id: this.optionalNumber(v['dcId']),
        dc_number: v['dcReference'] || null,
        customer_id: customerId,
        customer_name: customerName,
        customer_gstin: customerGstin,
        place_of_supply: v['placeOfSupply'] || null,
        warehouse_id: warehouseId,
        warehouse_name: warehouse?.warehouse_name || v['warehouse'] || null,
        transport_mode: v['transportMode'] || null,
        vehicle_no: v['vehicleNo'] || null,
        payment_terms: v['paymentTerms'] || null,
        customer_notes: v['customerNotes'] || null,
        internal_notes: v['internalNotes'] || null,
        status: status(v['status'], 'draft'),
        items
      };
    }

    if (this.config?.key === 'salesQuotation') {
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        doc_number: docNo('quotationNo', 'Quotation No'),
        doc_date: docDate('quotationDate'),
        valid_till: v['validTill'] || null,
        customer_id: customerId,
        customer_name: customerName,
        payment_terms: v['paymentTerms'] || null,
        reference_no: v['enquiryRef'] || null,
        remarks: v['terms'] || null,
        status: status(v['status'], 'draft'),
        items
      };
    }

    if (this.config?.key === 'salesOrder') {
      const warehouse = this.findWarehouseBySelection(v['warehouse']);
      const warehouseId = warehouse?.id ?? this.optionalNumber(v['warehouseId']);
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        doc_number: docNo('soNo', 'SO Number'),
        doc_date: docDate('soDate'),
        delivery_date: v['deliveryDate'] || null,
        customer_id: customerId,
        customer_name: customerName,
        customer_gstin: customerGstin,
        payment_terms: v['paymentTerms'] || null,
        delivery_location: v['deliveryAddress'] || null,
        reference_no: v['quotationRef'] || null,
        remarks: v['remarks'] || null,
        status: status(v['status'], 'draft'),
        items
      };
    }

    if (this.config?.key === 'deliveryChallan') {
      const fromWarehouse = this.findWarehouseBySelection(v['fromWarehouse'] || v['warehouse']);
      const fromWarehouseId = fromWarehouse?.id ?? this.optionalNumber(v['fromWarehouseId']);
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        dc_number: docNo('dcNo', 'DC Number'),
        dc_date: docDate('dcDate'),
        so_id: this.optionalNumber(v['soId']),
        so_number: v['soReference'] || null,
        customer_id: customerId,
        customer_name: customerName,
        from_warehouse_id: fromWarehouseId,
        from_warehouse_name: fromWarehouse?.warehouse_name || v['fromWarehouse'] || null,
        vehicle: v['vehicle'] || null,
        transporter: v['transporter'] || null,
        lr_no: v['lrNo'] || null,
        delivery_address: v['deliveryAddress'] || null,
        remarks: v['remarks'] || null,
        status: status(v['status'], 'draft'),
        items: this.deliveryChallanItems()
      };
    }

    if (this.config?.key === 'salesReturn') {
      const retWarehouse = this.findWarehouseBySelection(v['returnToWarehouse'] || v['warehouse']);
      const retWarehouseId = retWarehouse?.id ?? this.optionalNumber(v['returnToWarehouseId']);
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        return_number: docNo('returnNo', 'Return Number'),
        return_date: docDate('returnDate'),
        customer_id: customerId,
        customer_name: customerName,
        invoice_id: this.optionalNumber(v['invoiceId']),
        invoice_number: v['invoiceReference'] || null,
        credit_note_ref: v['creditNoteRef'] || null,
        return_to_warehouse_id: retWarehouseId,
        return_to_warehouse_name: retWarehouse?.warehouse_name || v['returnToWarehouse'] || null,
        return_reason: v['returnReason'] || null,
        remarks: v['remarks'] || null,
        status: status(v['status'], 'draft'),
        items: this.salesReturnItems()
      };
    }

    return v;
  }

  private activeSalesLineRows(): string[][] {
    this.directEntryLineRows();
    return this.entryLineRows()
      .map(row => this.normalizeLineRow(row))
      .filter(row => row.some(cell => String(cell ?? '').trim()))
      .filter(row => !!this.lineValue(row, ['product', 'item', 'sku']));
  }

  private salesLineItems(): any[] {
    return this.activeSalesLineRows().map((row, index) => {
      const productName = this.lineValue(row, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      const { uom_name, uom_id } = this.resolveLineUom(product, this.lineValue(row, ['uom']), false);
      const base: any = {
        sno: index + 1,
        product_id: product?.id ?? null,
        product_name: product?.product_name || productName,
        product_code: product?.product_code || null,
        variant_id: null,
        variant_name: null,
        uom_id,
        uom_name,
        attribute_name: null,
        attribute_value: null,
        qty: this.lineNumber(row, ['qty']),
        rate: this.lineNumber(row, ['rate', 'list']),
        discount_pct: this.lineNumber(row, ['disc', 'discount']),
        gst_rate: this.lineNumber(row, ['gst', 'tax']),
        amount: this.lineNumber(row, ['amount']),
        remarks: this.lineValue(row, ['remarks']) || null
      };
      if (this.config?.key === 'salesInvoice') {
        base['batch_no'] = this.lineValue(row, ['batch']) || null;
        base['serial_no'] = this.lineValue(row, ['serial']) || null;
        base['expiry_date'] = this.lineValue(row, ['expiry']) || null;
        base['warehouse_name'] = this.lineValue(row, ['warehouse']) || null;
      }
      return base;
    });
  }

  private activePurchaseLineRows(): string[][] {
    this.directEntryLineRows();
    return this.entryLineRows()
      .map(row => this.normalizeLineRow(row))
      .filter(row => row.some(cell => String(cell ?? '').trim()))
      .filter(row => !!this.lineValue(row, ['product', 'item', 'sku']));
  }

  protected purchasePrItems(): any[] {
    return this.activePurchaseLineRows().map((row, index) => {
      const productName = this.lineValue(row, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      const description = this.lineValue(row, ['description']);
      const variantText = this.lineValue(row, ['variant']);
      const { uom_name, uom_id } = this.resolveLineUom(product, this.lineValue(row, ['uom']), true);
      const { variant_id, variant_name } = this.resolveLineVariant(product, variantText);
      const { attribute_id, attribute_name, attribute_value } = this.resolveLineAttribute(product, variantText, this.lineValue(row, ['attribute']));
      return {
        sno: index + 1,
        product_id: product?.id ?? null,
        product_name: product?.product_name || productName,
        product_code: product?.product_code || null,
        variant_id,
        variant_name,
        uom_id,
        uom_name,
        attribute_id,
        attribute_name,
        attribute_value,
        required_qty: this.lineNumber(row, ['requested', 'qty']),
        estimated_rate: this.lineNumber(row, ['rate']),
        remarks: this.lineValue(row, ['remarks']) || description || null
      };
    });
  }

  private resolveLineUom(product: ProductItem | null | undefined, rowUomName: string | null, isPurchase = true): { uom_name: string | null; uom_id: number | null } {
    const uomText = this.uomNameFromSelection(rowUomName || '');
    if (product) {
      const transactionKey = isPurchase ? 'purchaseOrder' : 'salesInvoice';
      if (uomText) {
        return { uom_name: uomText, uom_id: this.productUomIdForSelection(product, uomText, transactionKey) };
      }
      const defaultUom = this.defaultProductUomForTransaction(product, transactionKey);
      return { uom_name: defaultUom.name || null, uom_id: defaultUom.id };
    }
    return { uom_name: uomText || null, uom_id: null };
  }

  private resolveLineVariant(product: ProductItem | null | undefined, variantText: string | null): { variant_id: number | null; variant_name: string | null } {
    if (!product || !variantText) return { variant_id: null, variant_name: variantText || null };
    const match = this.productVariantOptionObjects(product).find(option => this.optionEquals(option.label, variantText));
    if (match) return { variant_id: match.id, variant_name: match.label };
    return { variant_id: null, variant_name: variantText || null };
  }

  protected lineAttributeOptionsForVariantRow(product: ProductItem | null | undefined, variantText: string | null): string[] {
    if (!variantText) return [];
    const match = this.productVariantOptionObjects(product).find(v => this.optionEquals(v.label, variantText));
    if (!match?.id) return [];
    const variantObj = this.loadedVariantObjects().find(v => v.id === match.id);
    if (!variantObj?.attributes?.length) return [];
    const opts: string[] = [];
    for (const attr of variantObj.attributes) {
      const attrType = (attr.attribute_type || 'Text').toLowerCase();
      if (attrType === 'dropdown' || attrType === 'multi select') {
        opts.push(...(attr.possible_values || []).filter(Boolean));
      } else if (attrType === 'yes/no') {
        opts.push('Yes', 'No');
      }
    }
    return [...new Set(opts)];
  }

  protected buildLineAttrSelections(variantId: number | null, row: string[], rowIndex: number): VariantAttrSelection[] {
    if (!variantId) return [];
    const variantObj = this.findVariantById(variantId);
    if (!variantObj?.attributes?.length) return [];
    const valueMap = this.lineAttrValueMap();
    const rowAttrValue = this.lineValue(row, ['attribute']);
    const grouped = new Map<string, string[]>();
    for (const attr of variantObj.attributes) {
      const name = (attr.attribute_name || '').trim();
      const val  = (attr.attribute_value || '').trim();
      if (!name) continue;
      if (!grouped.has(name)) grouped.set(name, []);
      if (val && !grouped.get(name)!.includes(val)) grouped.get(name)!.push(val);
    }
    return Array.from(grouped.entries()).map(([name, options]) => {
      const mapValue = valueMap[`${rowIndex}_${name}`];
      const savedValue = mapValue !== undefined
        ? mapValue
        : (rowAttrValue && options.includes(rowAttrValue) ? rowAttrValue : (options.length === 1 ? options[0] : ''));
      return { name, options, value: savedValue, isAuto: options.length <= 1 };
    });
  }

  lineRowAttrSelections(rowIndex: number, row: string[]): VariantAttrSelection[] {
    const productName = this.lineValue(row, ['product', 'item', 'sku', 'material']);
    const product = this.findProductBySelection(productName);
    const variantText = this.lineValue(row, ['variant']);
    if (!variantText || !product) return [];
    const match = this.productVariantOptionObjects(product).find(v => this.optionEquals(v.label, variantText));
    if (!match?.id) return [];
    return this.buildLineAttrSelections(match.id, row, rowIndex);
  }

  setLineAttrValue(rowIndex: number, attrName: string, value: string | null): void {
    this.lineAttrValueMap.update(map => ({ ...map, [`${rowIndex}_${attrName}`]: value || '' }));
    const attrIdx = (this.config?.lineColumns || []).findIndex(c => c.toLowerCase() === 'attribute');
    if (attrIdx >= 0) {
      this.directEntryLineRows();
      this.entryLineRows.update(rows => rows.map((r, i) => {
        if (i !== rowIndex) return r;
        const nextRow = [...r];
        nextRow[attrIdx] = value || '';
        return nextRow;
      }));
    }
  }

  private resolveLineAttribute(
    product: ProductItem | null | undefined,
    variantText: string | null,
    attributeText: string | null
  ): { attribute_id: number | null; attribute_name: string | null; attribute_value: string | null } {
    const val = String(attributeText || '').trim() || null;
    if (!val) return { attribute_id: null, attribute_name: null, attribute_value: null };
    const match = this.productVariantOptionObjects(product).find(v => this.optionEquals(v.label, variantText || ''));
    const variantObj = match ? this.loadedVariantObjects().find(v => v.id === match.id) : null;
    if (!variantObj?.attributes?.length) return { attribute_id: null, attribute_name: null, attribute_value: val };
    // Use the first attribute dimension as the primary FK
    const primary = variantObj.attributes[0];
    return {
      attribute_id: primary.attribute_id ?? null,
      attribute_name: primary.attribute_name ?? null,
      attribute_value: val
    };
  }

  private purchaseRfqItems(): any[] {
    return this.activePurchaseLineRows().map((row, index) => {
      const productName = this.lineValue(row, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      const variantText = this.lineValue(row, ['variant']);
      const { uom_name, uom_id } = this.resolveLineUom(product, this.lineValue(row, ['uom']), true);
      const { variant_id, variant_name } = this.resolveLineVariant(product, variantText);
      const { attribute_id, attribute_name, attribute_value } = this.resolveLineAttribute(product, variantText, this.lineValue(row, ['attribute']));
      return {
        sno: index + 1,
        product_id: product?.id ?? null,
        product_name: product?.product_name || productName,
        product_code: product?.product_code || null,
        variant_id,
        variant_name,
        uom_id,
        uom_name,
        attribute_id,
        attribute_name,
        attribute_value,
        required_qty: this.lineNumber(row, ['qty']),
        target_rate: this.lineNumber(row, ['target']),
        vendor_rate: this.lineNumber(row, ['vendor rate']),
        gst_rate: this.lineNumber(row, ['gst', 'tax']),
        lead_time: this.lineValue(row, ['lead']),
        remarks: this.lineValue(row, ['remarks']) || null
      };
    });
  }

  private purchasePoItems(): any[] {
    const defaultWarehouse = this.formValues()['receivingWarehouse'] || '';
    return this.activePurchaseLineRows().map((row, index) => {
      const productName = this.lineValue(row, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      const variantText = this.lineValue(row, ['variant']);
      const qty = this.lineNumber(row, ['qty']);
      const rate = this.lineNumber(row, ['rate']);
      const discPct = this.lineNumber(row, ['disc', 'discount']);
      const gstRate = this.lineNumber(row, ['gst', 'tax']);
      const { uom_name, uom_id } = this.resolveLineUom(product, this.lineValue(row, ['uom']), true);
      const { variant_id, variant_name } = this.resolveLineVariant(product, variantText);
      const { attribute_id, attribute_name, attribute_value } = this.resolveLineAttribute(product, variantText, this.lineValue(row, ['attribute']));
      const taxable = qty * rate * (1 - discPct / 100);
      const amount = Math.round((taxable + taxable * (gstRate / 100)) * 100) / 100;
      return {
        sno: index + 1,
        product_id: product?.id ?? null,
        product_name: product?.product_name || productName,
        product_code: product?.product_code || null,
        variant_id, variant_name,
        uom_id, uom_name,
        attribute_id, attribute_name, attribute_value,
        qty, rate,
        discount_pct: discPct,
        gst_rate: gstRate,
        warehouse_name: this.lineValue(row, ['warehouse', 'location']) || defaultWarehouse || null,
        amount
      };
    });
  }

  private purchaseGrnItems(defaultWarehouse: string): any[] {
    return this.activePurchaseLineRows().map((row, index) => {
      const productName = this.lineValue(row, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      const variantText = this.lineValue(row, ['variant']);
      const receivedQty = this.lineNumber(row, ['received']);
      const { uom_name, uom_id } = this.resolveLineUom(product, this.lineValue(row, ['uom']), true);
      const { variant_id, variant_name } = this.resolveLineVariant(product, variantText);
      const { attribute_id, attribute_name, attribute_value } = this.resolveLineAttribute(product, variantText, this.lineValue(row, ['attribute']));
      return {
        sno: index + 1,
        product_id: product?.id ?? null,
        product_name: product?.product_name || productName,
        product_code: product?.product_code || null,
        variant_id,
        variant_name,
        uom_id,
        uom_name,
        attribute_id,
        attribute_name,
        attribute_value,
        received_qty: receivedQty,
        accepted_qty: this.lineNumber(row, ['accepted']) || receivedQty,
        rejected_qty: this.lineNumber(row, ['rejected']),
        rate: this.lineNumber(row, ['rate']),
        discount_pct: this.lineNumber(row, ['disc', 'discount']),
        gst_rate: this.lineNumber(row, ['gst', 'tax']),
        batch_no: this.lineValue(row, ['batch']),
        serial_no: this.lineValue(row, ['serial']),
        expiry_date: this.lineValue(row, ['expiry']) || null,
        warehouse_name: this.lineValue(row, ['warehouse', 'location']) || defaultWarehouse || null,
        remarks: this.lineValue(row, ['remarks']) || null
      };
    });
  }

  private purchasePiItems(): any[] {
    return this.activePurchaseLineRows().map((row, index) => {
      const productName = this.lineValue(row, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      const variantText = this.lineValue(row, ['variant']);
      const { uom_name, uom_id } = this.resolveLineUom(product, this.lineValue(row, ['uom']), true);
      const { variant_id, variant_name } = this.resolveLineVariant(product, variantText);
      const { attribute_id, attribute_name, attribute_value } = this.resolveLineAttribute(product, variantText, this.lineValue(row, ['attribute']));
      return {
        sno: index + 1,
        product_id: product?.id ?? null,
        product_name: product?.product_name || productName,
        product_code: product?.product_code || null,
        variant_id,
        variant_name,
        uom_id,
        uom_name,
        attribute_id,
        attribute_name,
        attribute_value,
        qty: this.lineNumber(row, ['qty']),
        rate: this.lineNumber(row, ['rate']),
        discount_pct: this.lineNumber(row, ['disc', 'discount']),
        gst_rate: this.lineNumber(row, ['gst', 'tax']),
        remarks: this.lineValue(row, ['remarks']) || null
      };
    });
  }

  private purchaseReturnItems(): any[] {
    return this.activePurchaseLineRows().map((row, index) => {
      const productName = this.lineValue(row, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      const { uom_name, uom_id } = this.resolveLineUom(product, this.lineValue(row, ['uom']), true);
      const returnQty = this.lineNumber(row, ['return']);
      const rate = this.lineNumber(row, ['rate']);
      return {
        sno: index + 1,
        product_id: product?.id ?? null,
        product_name: product?.product_name || productName,
        product_code: product?.product_code || null,
        uom_id,
        uom_name,
        grn_qty: this.lineNumber(row, ['invoice', 'grn']),
        return_qty: returnQty,
        rate,
        return_amount: returnQty * rate,
        return_reason: this.lineValue(row, ['reason']) || null
      };
    });
  }

  private deliveryChallanItems(): any[] {
    return this.activeSalesLineRows().map((row, index) => {
      const productName = this.lineValue(row, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      const { uom_name, uom_id } = this.resolveLineUom(product, this.lineValue(row, ['uom']), false);
      return {
        sno: index + 1,
        product_id: product?.id ?? null,
        product_name: product?.product_name || productName,
        product_code: product?.product_code || null,
        uom_id,
        uom_name,
        so_qty: this.lineNumber(row, ['so', 'order']),
        dispatch_qty: this.lineNumber(row, ['dispatch', 'qty']),
        batch_serial: this.lineValue(row, ['batch', 'serial']) || null,
        remarks: this.lineValue(row, ['remarks']) || null
      };
    });
  }

  private salesReturnItems(): any[] {
    return this.activeSalesLineRows().map((row, index) => {
      const productName = this.lineValue(row, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      const { uom_name, uom_id } = this.resolveLineUom(product, this.lineValue(row, ['uom']), false);
      const returnQty = this.lineNumber(row, ['return']);
      const rate = this.lineNumber(row, ['rate']);
      return {
        sno: index + 1,
        product_id: product?.id ?? null,
        product_name: product?.product_name || productName,
        product_code: product?.product_code || null,
        uom_id,
        uom_name,
        invoiced_qty: this.lineNumber(row, ['invoiced', 'invoice']),
        return_qty: returnQty,
        rate,
        return_amount: returnQty * rate,
        reason: this.lineValue(row, ['reason']) || null
      };
    });
  }

  private lineValue(row: string[], needles: string[]): string {
    const index = (this.config?.lineColumns || []).findIndex(column => {
      const key = column.toLowerCase();
      return needles.some(needle => key.includes(needle));
    });
    return index >= 0 ? String(row[index] ?? '').trim() : '';
  }

  private lineNumber(row: string[], needles: string[]): number {
    return this.parseCurrency(this.lineValue(row, needles));
  }

  private optionalNumber(value: any): number | null {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private purchaseStatus(value: any, fallback: string): string {
    const raw = String(value || fallback || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    return raw || fallback;
  }

  private duplicateRecordMessage(payload: Record<string, any>): string {
    const key = this.config?.key || '';
    const editingId = this.editingId();
    const pendingIndex = this.editingPendingIndex();
    const same = (a: any, b: any) => this.normalizeKey(a) === this.normalizeKey(b);
    const sourceRecords = this.isSegmentFilteredGridKey(key)
      ? this.segmentFilteredRecords(this.savedRecordObjects())
      : this.savedRecordObjects();
    const records = [
      ...sourceRecords.filter(record => record.id !== editingId),
      ...this.pendingRows()
        .filter((_, index) => index !== pendingIndex)
        .map(row => row.payload)
    ];

    const duplicate = (match: (record: any) => boolean) => records.some(match);
    switch (key) {
      case 'businessSegments':
        return duplicate(r => same(r.segment_name, payload['segment_name'])) ? 'Business Segment already exists. Edit the existing row instead of adding duplicate.' : '';
      case 'uomMaster':
        return duplicate(r => {
          if (r.is_system) return false;
          const payloadSegmentId = Number(payload['segment_id'] ?? this.selectedSegmentId());
          const recordSegmentId = Number(r.segment_id ?? r.segmentId);
          const sameSegment = payloadSegmentId > 0
            ? (Number.isFinite(recordSegmentId) && recordSegmentId > 0
                ? recordSegmentId === payloadSegmentId
                : this.segmentMappedIds('uoms').has(Number(r.id)))
            : (!Number.isFinite(recordSegmentId) || recordSegmentId <= 0);
          const hasPayloadCode = String(payload['uom_code'] ?? '').trim().length > 0;
          const hasPayloadSymbol = String(payload['uom_symbol'] ?? '').trim().length > 0;
          return sameSegment
            && (same(r.uom_name, payload['uom_name']) || (hasPayloadCode && same(r.uom_code, payload['uom_code'])) || (hasPayloadSymbol && same(r.uom_symbol, payload['uom_symbol'])));
        }) ? 'UOM already exists in this segment. Edit the existing row instead of adding duplicate.' : '';
      case 'categoryMaster':
        return duplicate(r => same(r.category_name, payload['category_name']) || same(r.category_code, payload['category_code'])) ? 'Category already exists. Edit the existing row instead of adding duplicate.' : '';
      case 'hsnSacMapping':
        return duplicate(r => same(r.code, payload['code'])) ? 'HSN/SAC code already exists. Edit the existing row instead of adding duplicate.' : '';
      case 'brandMaster':
        return duplicate(r => same(r.brand_name, payload['brand_name']) || same(r.brand_code, payload['brand_code'])) ? 'Brand already exists. Edit the existing row instead of adding duplicate.' : '';
      case 'attributeMaster':
        return duplicate(r => same(r.attribute_name, payload['attribute_name'])) ? 'Attribute already exists. Edit the existing row instead of adding duplicate.' : '';
      case 'productGroupMaster':
        return duplicate(r => same(r.group_name, payload['group_name']) || same(r.group_code, payload['group_code'])) ? 'Product Group already exists. Edit the existing row instead of adding duplicate.' : '';
      case 'variantMaster':
        return duplicate(r => same(r.variant_name, payload['variant_name']) || same(r.variant_code, payload['variant_code'])) ? 'Variant already exists. Edit the existing row instead of adding duplicate.' : '';
      case 'serialNumberPolicy':
      case 'batchLotPolicy':
        return duplicate(r => same(r.policy_name, payload['policy_name']) || same(r.policy_code, payload['policy_code'])) ? 'Policy already exists. Edit the existing row instead of adding duplicate.' : '';
      case 'vendorMaster':
        return duplicate(r => same(r.vendor_name, payload['vendor_name']) || same(r.vendor_code, payload['vendor_code'])) ? 'Vendor already exists. Edit the existing row instead of adding duplicate.' : '';
      case 'customerMaster':
        return duplicate(r => same(r.customer_name, payload['customer_name']) || same(r.customer_code, payload['customer_code'])) ? 'Customer already exists. Edit the existing row instead of adding duplicate.' : '';
      case 'productServiceMaster':
        return duplicate(r => same(r.product_name, payload['product_name']) && same(r.segment_name, payload['segment_name'])) ? 'Product / Service already exists in this segment. Edit the existing row instead of adding duplicate.' : '';
      default:
        return '';
    }
  }

  protected validatePayload(payload: Record<string, any>): string {
    const hasValue = (value: any) => String(value ?? '').trim().length > 0;

    if (this.config?.key === 'businessSegments') {
      if (!hasValue(payload['segment_name'])) return 'Business Segment name is required.';
    }

    if (this.isSegmentFilteredGridKey(this.config?.key || '') && !hasValue(this.selectedSegment())) {
      return 'Select Business Segment before saving this master.';
    }

    if (this.config?.key === 'branchMaster') {
      if (!hasValue(payload['branch_name'])) return 'Branch name is required.';
    }

    if (this.config?.key === 'uomMaster') {
      if (!hasValue(payload['uom_name'])) return 'UOM name is required.';
    }

    if (this.config?.key === 'categoryMaster') {
      if (!hasValue(payload['category_name'])) return 'Category name is required.';
    }

    if (this.config?.key === 'variantMaster') {
      if (!hasValue(payload['variant_name'])) return 'Variant name is required.';
      const variantAttributeError = this.variantAttributesValidationMessage(payload['attributes'] || []);
      if (variantAttributeError) return variantAttributeError;
    }

    if (this.config?.key === 'hsnSacMapping') {
      if (!hasValue(payload['code'])) return 'HSN/SAC Code is required.';
      if (payload['gst_rate'] === null || payload['gst_rate'] === undefined || payload['gst_rate'] === '') {
        return 'GST Rate is required for HSN/SAC mapping.';
      }
    }

    if (this.config?.key === 'barcodeConfiguration') {
      if (!hasValue(payload['barcode_type'])) return 'Barcode Type is required.';
    }

    if (this.config?.key === 'productTypeMaster') {
      if (!hasValue(payload['type_name'])) return 'Type Name is required.';
    }

    if (this.config?.key === 'substituteProducts') {
      if (!hasValue(payload['product_name'])) return 'Product is required.';
      if (!hasValue(payload['substitute_product_name'])) return 'Substitute Product is required.';
      if (String(payload['product_name']).trim().toLowerCase() === String(payload['substitute_product_name']).trim().toLowerCase()) {
        return 'Product and Substitute Product cannot be same.';
      }
    }

    const duplicateMessage = this.duplicateRecordMessage(payload);
    if (duplicateMessage) return duplicateMessage;

    if (this.isPurchaseTransactionKey()) {
      if (!Array.isArray(payload['items']) || !payload['items'].length) {
        return 'Add at least one product/service line before saving this purchase document.';
      }
      const stockValidation = this.stockControlValidationMessage();
      if (stockValidation) return stockValidation;
      if (this.config?.key === 'purchaseRequisition') {
        if (!hasValue(payload['branch_id'])) return 'Branch is required for Purchase Requisition.';
        if (!hasValue(payload['department'])) return 'Department is required for Purchase Requisition.';
        const prValidation = this.validatePrRequestedBy(payload);
        if (prValidation) return prValidation;
      }
      if (this.config?.key === 'requestForQuotation') {
        if (!hasValue(payload['vendor_name'])) return 'Vendor is required for Request for Quotation.';
      }
      if (this.config?.key === 'purchaseOrder') {
        if (!hasValue(payload['vendor_name'])) return 'Supplier is required for Purchase Order.';
        if (!hasValue(payload['warehouse_name'])) return 'Receiving Warehouse is required for Purchase Order.';
      }
      if (this.config?.key === 'goodsReceipt') {
        if (!hasValue(payload['vendor_name'])) return 'Vendor is required for GRN.';
        if (!hasValue(payload['warehouse_name'])) return 'Receiving Warehouse is required for GRN.';
      }
      if (this.config?.key === 'purchaseInvoice') {
        if (!hasValue(payload['vendor_name'])) return 'Vendor is required for Purchase Invoice.';
      }
      return '';
    }

    if (this.config?.key !== 'productServiceMaster') {
      return '';
    }

    if (!hasValue(payload['product_name'])) return 'Product / Service Name is required.';
    if (!hasValue(payload['category_name']) && !hasValue(payload['category_id'])) return 'Product Category is mandatory.';
    if (!hasValue(payload['base_uom_name']) && !hasValue(payload['base_uom_id'])) return 'Base UOM is mandatory.';
    if (!hasValue(payload['hsn_sac_code']) && !hasValue(payload['hsn_sac_id'])) return 'HSN/SAC tax classification is mandatory.';
    if (payload['gst_rate'] === null || payload['gst_rate'] === undefined || payload['gst_rate'] === '') return 'GST Rate is mandatory.';
    if (this.categoryRequiresBatchPolicy() && !hasValue(payload['batch_policy_name'])) return 'Selected category requires Batch / Lot Policy.';
    if (this.categoryRequiresSerialPolicy() && !hasValue(payload['serial_policy_name'])) return 'Selected category requires Serial Number Policy.';
    const variantRows = payload['applicable_variants'] || [];
    if (this.productVariantRequired() && (!Array.isArray(variantRows) || !variantRows.length)) {
      return 'Map at least one product Variant with its attributes.';
    }
    const uomRows = payload['uom_conversions'] || [];
    if (this.productUomMappingRequired() && !uomRows.length) return 'Add at least one Product UOM mapping row or turn off UOM mapping.';
    const badUomRow = uomRows.find((row: any) => !hasValue(row.alt_uom) || !(Number(row.conversion_factor) > 0));
    if (badUomRow) return 'Product UOM mapping rows need Alternate UOM and a conversion factor greater than zero.';
    const baseUom = payload['base_uom_name'] || this.formValues()['baseUom'];
    const baseAsAlternateRow = uomRows.find((row: any) =>
      this.sameUomSelection(baseUom, row.from_uom_name || row.alt_uom_name || row.alt_uom)
    );
    if (baseAsAlternateRow) return 'Alternate UOM and Base UOM cannot be the same.';
    const seenUomRows = new Set<string>();
    const duplicateUomRow = uomRows.find((row: any) => {
      const key = row.from_uom_id
        ? `id:${row.from_uom_id}`
        : this.normalizeKey(this.uomNameFromSelection(row.from_uom_name || row.alt_uom_name || row.alt_uom) || row.alt_uom);
      if (!key) return false;
      if (seenUomRows.has(key)) return true;
      seenUomRows.add(key);
      return false;
    });
    if (duplicateUomRow) return 'Each Alternate UOM can be mapped only once for this product.';
    const inactive = (row: any) => this.normalizeKey(row.status) === 'inactive';
    const noUseUomRow = uomRows.find((row: any) => !inactive(row) && !row.is_purchase_uom && !row.is_sales_uom);
    if (noUseUomRow) return 'Active UOM mapping rows must be marked Purchase, Sales, or both.';
    if (payload['batch_applicable'] && !hasValue(payload['batch_policy_name'])) return 'Select Batch / Lot Policy or turn off Batch Applicable.';
    if (payload['serial_applicable'] && !hasValue(payload['serial_policy_name'])) return 'Select Serial Number Policy or turn off Serial Number Applicable.';

    if (payload['product_nature_name'] === 'Service Bundle') {
      if (!hasValue(payload['pricing_type'])) return 'Pricing Type is required for a Service Bundle.';
      const bundleRows = payload['bundle_composition'] || [];
      if (!Array.isArray(bundleRows) || !bundleRows.length) return 'Add at least one item to Bundle Composition for a Service Bundle.';
      const badBundleRow = bundleRows.find((row: any) => !row.item_id || !(Number(row.quantity) >= 1));
      if (badBundleRow) return 'Each Bundle Composition row needs an Item / Asset and a quantity of at least 1.';
    }
    if (payload['pricing_type'] === 'Rental' && !hasValue(payload['rental_unit'])) return 'Rental Unit is required when Pricing Type is Rental.';

    return '';
  }

  protected mapToGridRows(records: any[]): string[][] {
    const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Active';
    switch (this.config?.key) {
      case 'businessSegments':
        return records.map(r => [
          r.segment_name || '',
          (r.categories || []).map((c: any) => c.category_name).join(', '),
          (r.hsn_sac_codes || []).map((h: any) => h.code).join(', '),
          (r.uoms || []).map((u: any) => u.uom_symbol || u.uom_name).join(', '),
          r.usage_note || '',
          cap(r.status || 'active')
        ]);
      case 'branchMaster':
        return records.map(r => [
          r.branch_code || '',
          r.branch_name || '',
          (r.activity_types || []).join(', '),
          [r.gstin ? `GSTIN: ${r.gstin}` : '', r.pan ? `PAN: ${r.pan}` : ''].filter(Boolean).join(' | '),
          [r.contact_name, r.contact_mobile, r.contact_email].filter(Boolean).join(' | '),
          '',
          cap(r.status || 'active')
        ]);
      case 'warehouseMaster':
        return records.map(r => [r.warehouse_code || '', r.warehouse_name || '', r.address || '', '', cap(r.status || 'active')]);
      case 'uomMaster':
        return records.map(r => [
          r.uom_code || '',
          r.uom_name || '',
          r.decimal_allowed ? 'Yes' : 'No',
          cap(r.status || 'active')
        ]);
      case 'categoryMaster':
        return records.map(r => [
          r.category_code || '',
          r.category_name || '',
          r.parent_name || '',
          r.serial_applicable ? (r.serial_policy_name || 'Yes') : 'No',
          r.batch_applicable ? (r.batch_policy_name || 'Yes') : 'No',
          r.description || '',
          cap(r.status || 'active')
        ]);
      case 'hsnSacMapping':
        return records.map(r => [r.code || '', r.description || '', r.category || '', String(r.gst_rate ?? ''), String(r.cgst_rate ?? ''), String(r.sgst_rate ?? ''), String(r.igst_rate ?? ''), String(r.cess_rate ?? ''), r.effective_date || '', cap(r.status || 'active')]);
      case 'paymentTermsMaster':
        return records.map(r => [r.term_name || '', r.term_code || '', String(r.credit_days ?? 0), String(r.discount_pct ?? 0), r.description || '', cap(r.status || 'active')]);
      case 'brandMaster':
        return records.map(r => [r.brand_code || '', r.brand_name || '', r.manufacturer || '', '', r.description || '', cap(r.status || 'active')]);
      case 'attributeMaster':
        return records.map(r => [r.attribute_name || '', r.attribute_type || '', (r.possible_values || []).join(', '), r.is_mandatory ? 'Yes' : 'No', cap(r.status || 'active')]);
      case 'productGroupMaster':
        return records.map(r => [r.group_code || '', r.group_name || '', r.category_name || '', r.description || '', cap(r.status || 'active')]);
      case 'variantMaster':
        return records.map(r => [
          r.variant_code || '',
          r.variant_name || '',
          (r.attributes || []).length
            ? (r.attributes || []).map((attr: any) => [attr.attribute_name, attr.attribute_value].filter(Boolean).join(': ')).join(', ')
            : [r.attribute_name, r.attribute_value].filter(Boolean).join(': '),
          r.description || '',
          cap(r.status || 'active')
        ]);
      case 'serialNumberPolicy':
        return records.map(r => [r.policy_code || '', r.policy_name || '', r.category_name || '', r.serial_format || '', r.capture_stage || '', cap(r.status || 'active')]);
      case 'batchLotPolicy':
        return records.map(r => [r.policy_code || '', r.policy_name || '', r.category_name || '', r.batch_format || '', r.expiry_required ? 'Yes' : 'No', r.qc_required ? 'Yes' : 'No', cap(r.status || 'active')]);
      case 'barcodeConfiguration':
        return records.map(r => [r.barcode_type || '', r.auto_generate ? 'Yes' : 'No', r.prefix || '', String(r.starting_number ?? ''), String(r.length ?? ''), (r.applicable_products || []).join(', ')]);
      case 'substituteProducts':
        return records.map(r => [r.product_name || '', r.substitute_product_name || '', String(r.priority ?? 1), r.remarks || '']);
      case 'consumptionTypeMaster':
        return records.map(r => [r.type_code || '', r.type_name || '', r.department || '', r.approval_required ? 'Yes' : 'No', r.remarks || '', cap(r.status || 'active')]);
      case 'productTypeMaster':
        return records.map(r => [
          r.type_code || '',
          r.type_name || '',
          r.allows_purchase ? 'Yes' : 'No',
          r.allows_sale ? 'Yes' : 'No',
          r.tracks_inventory ? 'Yes' : 'No',
          r.is_service ? 'Yes' : 'No',
          r.is_asset ? 'Yes' : 'No',
          r.is_system ? 'System' : 'Custom',
          cap(r.status || 'active')
        ]);
      case 'vendorMaster':
        return records.map(r => [r.vendor_code || '', r.vendor_name || '', r.vendor_type || '', r.segment_name || '', r.gstin || '', cap(r.status || 'active')]);
      case 'customerMaster':
        return records.map(r => [r.customer_code || '', r.customer_name || '', r.customer_type || '', r.segment_name || '', r.gstin || '', cap(r.status || 'active')]);
      case 'productServiceMaster':
        return records.map(r => [
          r.product_code || '',
          r.sku || '',
          r.product_name || '',
          r.category_name || '',
          r.base_uom_symbol || r.base_uom_name || '',
          this.productVariantGridSummary(r),
          this.productUomMappingGridSummary(r),
          r.valuation_method || '',
          r.hsn_sac_code || '',
          String(r.gst_rate ?? ''),
          cap(r.item_status || 'active')
        ]);
      case 'purchaseRequisition':
        return records.map(r => [
          r.pr_number || '',
          r.pr_date || '',
          this.branchNameFromRecord(r),
          r.department || '',
          r.requested_by || '',
          cap(r.priority || 'medium'),
          cap(r.status || 'draft')
        ]);
      case 'requestForQuotation':
        return records.map(r => [
          r.rfq_number || '',
          r.rfq_date || '',
          r.valid_till || '',
          r.vendor_name || '',
          String((r.items || []).length || 0),
          cap(r.status || 'draft')
        ]);
      case 'purchaseOrder':
        return records.map(r => [
          r.po_number || '',
          r.po_date || '',
          r.vendor_name || '',
          r.rfq_number || '',
          r.warehouse_name || '',
          String((r.items || []).length || 0),
          `Rs. ${Number(r.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
          cap(r.status || 'draft')
        ]);
      case 'goodsReceipt':
        return records.map(r => [
          r.grn_number || '',
          r.grn_date || '',
          r.vendor_name || '',
          r.po_number || r.rfq_number || '',
          r.warehouse_name || '',
          String((r.items || []).length || 0),
          cap(r.status || 'draft')
        ]);
      case 'purchaseInvoice':
        return records.map(r => [
          r.pi_number || '',
          r.pi_date || '',
          r.vendor_name || '',
          r.grn_number || 'Direct',
          `Rs. ${Number(r.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
          r.due_date || '',
          cap(r.status || 'draft')
        ]);
      case 'estimation':
      case 'proformaInvoice':
        return records.map(r => [
          r.doc_number || '',
          r.doc_date || '',
          r.segment_name || '',
          r.customer_name || '',
          String((r.items || []).length || 0),
          cap(r.status || 'draft')
        ]);
      case 'salesInvoice':
        return records.map(r => [
          r.doc_number || '',
          r.doc_date || '',
          r.segment_name || '',
          r.customer_name || '',
          r.proforma_number || '',
          cap(r.status || 'draft')
        ]);
      case 'salesQuotation':
        return records.map(r => [
          r.doc_number || '',
          r.doc_date || '',
          r.valid_till || '',
          r.customer_name || '',
          `Rs. ${Number(r.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
          cap(r.status || 'draft')
        ]);
      case 'salesOrder':
        return records.map(r => [
          r.doc_number || '',
          r.doc_date || '',
          r.customer_name || '',
          r.warehouse_name || '',
          `Rs. ${Number(r.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
          r.delivery_date || '',
          cap(r.status || 'draft')
        ]);
      case 'purchaseReturn':
        return records.map(r => [
          r.return_number || '',
          r.return_date || '',
          r.vendor_name || '',
          r.pi_number || 'Direct',
          String((r.items || []).length || 0),
          `Rs. ${Number(r.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
          cap(r.status || 'draft')
        ]);
      case 'deliveryChallan':
        // columns: DC No, DC Date, Customer, Vehicle, Items, SO Ref, Status
        return records.map(r => [
          r.dc_number || '',
          r.dc_date || '',
          r.customer_name || '',
          r.vehicle || '',
          String((r.items || []).length || 0),
          r.so_number || 'Direct',
          cap(r.status || 'draft')
        ]);
      case 'salesReturn':
        // columns: Return No, Return Date, Customer, Invoice Ref, Amount, Status
        return records.map(r => [
          r.return_number || '',
          r.return_date || '',
          r.customer_name || '',
          r.invoice_number || '',
          `Rs. ${Number(r.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
          cap(r.status || 'draft')
        ]);
      default:
        return [];
    }
  }
}
