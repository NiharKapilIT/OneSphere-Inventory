import { CommonModule } from '@angular/common';
import { HorizDragScrollService } from '../horiz-drag-scroll.directive';
import { AfterViewChecked, AfterViewInit, Component, DestroyRef, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, concatMap, debounceTime, distinctUntilChanged, forkJoin, from, map, of, switchMap } from 'rxjs';
import { ApiResponse, AttributeItem, AttributeValueItem, BranchInvItem, CategoryItem, ContactItem, CustomerItem, GstRateGuide, HsnSacItem, InventoryConfigService, PaymentTermItem, ProductApplicableVariant, ProductBundleItem, ProductItem, ProductTypeItem, ProductUomConversion, ProductVariantStockAttribute, ProductVariantStockControl, SegmentItem, SerialPolicyItem, TaxCodeSuggestion, UomItem, VariantCombinationRow, VariantItem, VendorItem, WarehouseItem } from '../inventory-config.service';
import { AvailableStock, InventoryTransactionsService, PurchaseRefDoc, ServiceBundleConsumption, TransportDetails } from '../inventory-transactions.service';
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

interface ProductApplicableVariantAttributeRow {
  variant_id: number;
  variant_name: string;
  variant_label: string;
  attribute_name: string;
  attribute_value: string;
  index: number;
}

interface GrnExpandedColumn {
  key: string;
  label: string;
}

interface GridExportPayload {
  title: string;
  fields: Array<[string, string]>;
  columns: string[];
  rows: string[][];
  documentHtml?: string;
  mailBody?: string;
  fileName?: string;
}

export interface PriceHintView {
  message: string;
  severity: 'info' | 'warn' | 'error';
  fingerprint: string;
}

export interface EntryLineColumnView {
  options: string[];
  controlValue: any;
  usesMultiSelect: boolean;
  inputType: 'number' | 'text' | 'date';
  placeholder: string;
  stockHint: string;
  stockHintClass: string;
  priceHint: PriceHintView | null;
}

export interface EntryLineRowView {
  columns: EntryLineColumnView[];
  attrSelections: VariantAttrSelection[];
  serialNames: string[];
}

interface GlobalContactOption {
  id?: number;
  name: string;
  type: 'Company' | 'Individual';
  mobile: string;
  email: string;
  gstin: string;
  pan: string;
  address: string;
  // Which backing table `id` points into — 'inv_contacts' for the
  // "+Add Global Contact" quick-add store, 'global_contact' for legacy
  // Accounts contacts (tbl_mst_contact). Undefined for the static demo array.
  source?: 'inv_contacts' | 'global_contact';
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

const DC_ADDRESS_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const DC_STATE_DISTRICTS: Record<string, string[]> = {
  'Andhra Pradesh': ['Alluri Sitharama Raju', 'Anakapalli', 'Ananthapuramu', 'Annamayya', 'Bapatla', 'Chittoor', 'East Godavari', 'Eluru', 'Guntur', 'Kakinada', 'Konaseema', 'Krishna', 'Kurnool', 'Nandyal', 'NTR', 'Palnadu', 'Parvathipuram Manyam', 'Prakasam', 'Sri Potti Sriramulu Nellore', 'Sri Sathya Sai', 'Srikakulam', 'Tirupati', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'],
  'Karnataka': ['Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'],
  'Maharashtra': ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
  'Tamil Nadu': ['Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanniyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'],
  'Telangana': ['Adilabad', 'Bhadradri Kothagudem', 'Hanamkonda', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Kumuram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri'],
  'Delhi': ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi']
};

const DC_PINCODE_FALLBACK: Record<string, { state: string; district: string; city: string; area: string }> = {
  '500033': { state: 'Telangana', district: 'Hyderabad', city: 'Hyderabad', area: 'Jubilee Hills' },
  '500081': { state: 'Telangana', district: 'Rangareddy', city: 'Hyderabad', area: 'Madhapur' },
  '500032': { state: 'Telangana', district: 'Rangareddy', city: 'Hyderabad', area: 'Gachibowli' },
  '560001': { state: 'Karnataka', district: 'Bengaluru Urban', city: 'Bengaluru', area: 'Bengaluru GPO' },
  '560038': { state: 'Karnataka', district: 'Bengaluru Urban', city: 'Bengaluru', area: 'Indiranagar' },
  '400001': { state: 'Maharashtra', district: 'Mumbai City', city: 'Mumbai', area: 'Fort' },
  '600001': { state: 'Tamil Nadu', district: 'Chennai', city: 'Chennai', area: 'George Town' }
};

@Component({
  selector: 'app-inventory-screen-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule],
  templateUrl: './inventory-screen-shell.html'
})
export class InventoryScreenShell implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
  @Input({ required: true }) config!: InventoryScreenConfig;
  @ViewChild('guideButton') private guideButton?: ElementRef<HTMLElement>;
  @ViewChild('guidePanel') private guidePanel?: ElementRef<HTMLElement>;

  private readonly _dragScroll = inject(HorizDragScrollService);
  private readonly inventoryConfigService = inject(InventoryConfigService);
  protected readonly txService = inject(InventoryTransactionsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  // ── Reference picker ─────────────────────────────────────────────────────
  readonly refPickerOpen  = signal(false);
  readonly refPickerType  = signal('');
  readonly refPickerDocs  = signal<PurchaseRefDoc[]>([]);
  readonly refPickerSearch = signal('');
  readonly refPickerLoading = signal(false);
  // Drill-down row in the reference-picker tray (Purchase Return's "Posted
  // Purchase Invoices" / Sales Return's "Posted Sales Invoices") — lets the
  // user see each item's already-returned vs still-available qty before
  // picking a document, instead of picking blind.
  readonly refPickerExpandedDocId = signal<number | string | null>(null);
  readonly transactionReferenceDocs = signal<PurchaseRefDoc[]>([]);
  readonly transactionReferenceLoading = signal(false);
  private transactionReferenceOptionsCacheKey = '';
  private transactionReferenceOptionsCache: string[] = [];
  private readonly purchaseInvoiceReservedGrnRefKeys = new Set<string>();
  readonly txDocId        = signal<number | null>(null);
  readonly txDocNumber    = signal('');
  readonly txDocStatus    = signal('draft');
  readonly txSaving       = signal(false);
  readonly txSaveMsg      = signal('');
  readonly txSaveError    = signal('');
  readonly bundleConsumptionOpen = signal(false);
  readonly bundleConsumptionInvoiceId = signal<number | null>(null);
  readonly bundleConsumptionInvoiceNo = signal('');
  readonly bundleConsumptionRows = signal<ServiceBundleConsumption[]>([]);
  readonly bundleConsumptionLoading = signal(false);
  readonly bundleConsumptionError = signal('');

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
  // Global Contact linked to the "Vendor"/"Customer" quick-add modal when
  // opened from any transaction screen's "+" button (see
  // saveQuickVendor()/selectQuickVendorContact() and
  // saveQuickCustomer()/selectQuickCustomerContact()) — mirrors
  // selectedPartyContact's role on Vendor Master / Customer Master, scoped to
  // that nested quick-add flow.
  readonly quickVendorLinkedContact = signal<GlobalContactOption | null>(null);
  readonly quickCustomerLinkedContact = signal<GlobalContactOption | null>(null);
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
  private readonly gridPageState = signal<Record<string, number>>({});
  private readonly gridPageSizeState = signal<Record<string, number>>({});
  private dcPincodeLookupSeq = 0;
  private partyPincodeLookupSeq = 0;
  readonly entryLineRows = signal<string[][]>([]);
  readonly entryLineRowsKey = signal('');
  readonly attributeValuesPendingDeactivate = signal<string[][]>([]);
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
  private guidePortalHost?: HTMLElement;

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
  readonly confirmDialog = signal<{
    title: string;
    message: string;
    lines: string[];
    confirmLabel: string;
    cancelLabel: string;
    tone: 'warning' | 'danger';
  } | null>(null);
  private confirmDialogResolver: ((result: boolean) => void) | null = null;
  readonly variantGeneratorSelections = signal<Array<{ attributeName: string; valueNames: string[] }>>([]);
  readonly variantGeneratorRows = signal<VariantCombinationRow[]>([]);
  readonly variantGeneratorPicked = signal<Record<string, boolean>>({});
  readonly variantGeneratorLoading = signal(false);
  readonly variantGeneratorMessage = signal('');
  readonly variantGeneratorError = signal('');
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

  // Scratch fields for the "+ Add HSN / SAC" quick-add popup — kept separate
  // from hsnSacCode/gstRate (the product form's own tax fields) so opening
  // this popup while a product already has an HSN code selected doesn't
  // clobber that selection before the popup is saved or cancelled.
  readonly quickAddHsnType    = signal<'HSN' | 'SAC'>('HSN');
  readonly quickAddHsnGstRate = signal<number | null>(null);

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
  readonly lineSerialValueMap = signal<Record<string, string>>({});
  // Hidden per-row reference-id side-channel: a plain string-grid row has no
  // other way to carry the so_item_id/dc_item_id/si_item_id it was created
  // from when a DC/SI reference is picked — read back by deliveryChallanItems()
  // and salesLineItems() at save time so remaining-qty tracking (SO/DC) can
  // be threaded through without changing the visible grid columns.
  //
  // attributeId/attributeName/attributeValue (Purchase Return/Sales Return
  // only): the referenced PI/Invoice item's attribute already comes through
  // as clean structured fields (attribute_id/attribute_value) — routing it
  // through the grid's free-text "Attribute" cell and back out via
  // resolveLineAttribute() (display text -> re-parsed structured data) is a
  // lossy round trip that was silently dropping it, which broke the
  // "already returned" qty match in sp_get_*_docs_for_ref's WHEN 'PI'/'SI'
  // branches (attribute_id/attribute_value have to match exactly). Carrying
  // it here instead sidesteps that round trip entirely for reference-picked
  // rows; purchaseReturnItems()/salesReturnItems() fall back to
  // resolveLineAttribute() only for manually-added rows with no entry here.
  readonly lineRefItemIdMap = signal<Record<number, {
    soItemId?: number; dcItemId?: number; siItemId?: number;
    attributeId?: number | null; attributeName?: string | null; attributeValue?: string | null;
  }>>({});
  // Serial number tracking (per-unit picker) — finalized list of serial
  // numbers per line, entered (capture) or picked (select) via the popup.
  // Separate from lineSerialValueMap above, which drives the unrelated
  // named-sub-field system (e.g. IMEI No/Chassis No labels on one serial).
  readonly lineSerialUnitsMap = signal<Record<number, string[]>>({});
  readonly lineGstIncludedMap = signal<Record<number, boolean>>({});
  readonly activeSerialPicker = signal<{ rowIndex: number; mode: 'capture' | 'select' | 'inherited'; qtyNeeded: number; productId: number | null; productName: string } | null>(null);
  readonly serialPickerDraftValues = signal<string[]>([]);
  readonly serialPickerAvailableOptions = signal<{ id: number; serial_no: string }[]>([]);
  // "select" mode tracks the checked STATE by unique unit id, not by
  // serial_no text — a serial policy with allow_duplicate=true means two
  // different physical units can legitimately share the same serial_no
  // (e.g. two GRNs both received units "1".."8"), and a text-keyed toggle
  // can't tell them apart: checking one silently checks/unchecks its twin
  // too. serialPickerDraftValues (text) stays the actual save payload —
  // this signal is purely the picker's own selection bookkeeping.
  readonly serialPickerSelectedIds = signal<Set<number>>(new Set());
  readonly serialPickerLoading = signal(false);
  readonly serialPickerError = signal('');
  readonly serialPickerMessage = signal('');
  private serialPickerMessageTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly vendorOptionList = signal<string[]>([]);
  private readonly warehouseOptionList = signal<string[]>([]);
  private readonly branchOptionList = signal<string[]>([]);
  private readonly paymentTermOptionList = signal<string[]>([]);
  private readonly serialPolicyOptionList = signal<string[]>([]);
  private readonly batchPolicyOptionList = signal<string[]>([]);
  private readonly loadedSerialPolicyObjects = signal<SerialPolicyItem[]>([]);
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
      let values = (item.values || [])
        .filter(value => String(value.status || 'active').toLowerCase() === 'active')
        .map(value => value.value_name)
        .filter(Boolean);
      if (!values.length) values = this.attributePossibleValueTokens(item.possible_values);
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
        attributes: previousById.get(v.id)?.attributes ?? [],
      } as ProductApplicableVariant));
    this.applyApplicableVariantSelection(selected);
  }

  readonly selectedApplicableVariantRows = computed(() => {
    return this.selectedApplicableVariants().map(variant => {
      const master = this.findVariantById(variant.id);
      const normalized = this.normalizedApplicableVariant(variant);
      const mappedAttributeItems = this.productVariantAttributeItemList(normalized.attributes || []);
      const masterAttributeItems = master
        ? this.variantAttributeItemList(master)
        : this.variantLabelAttributeItemList(normalized.variant_label, normalized.variant_name);
      const attribute_items = mappedAttributeItems.length ? mappedAttributeItems : masterAttributeItems;
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
  readonly pendingProductVariantMapVariantId = signal<number | null>(null);
  readonly pendingProductVariantMapAttribute = signal('');
  readonly pendingProductVariantMapValue = signal('');

  readonly effectivePendingCombinationVariantId = computed(() => {
    const variants = this.selectedApplicableVariantRows();
    const selectedId = this.pendingCombinationVariantId();
    if (selectedId && variants.some(variant => variant.id === selectedId)) return selectedId;
    return variants[0]?.id ?? null;
  });

  readonly pendingVariantAttributeDimensions = computed(() => {
    const variantId = this.effectivePendingCombinationVariantId();
    return variantId ? this.variantAttributeDimensions(variantId, false) : [];
  });

  readonly effectiveProductVariantMapVariantId = computed(() => {
    const variants = this.selectedApplicableVariantRows();
    const selectedId = this.pendingProductVariantMapVariantId();
    if (selectedId && variants.some(variant => variant.id === selectedId)) return selectedId;
    return variants[0]?.id ?? null;
  });

  readonly productVariantMapAttributeOptions = computed(() => {
    const variantId = this.effectiveProductVariantMapVariantId();
    if (!variantId) return [];
    return this.variantAttributeDimensions(variantId).map(dim => dim.name);
  });

  readonly productVariantMapValueOptions = computed(() => {
    const variantId = this.effectiveProductVariantMapVariantId();
    const attributeName = this.pendingProductVariantMapAttribute();
    if (!variantId || !attributeName) return [];
    const dim = this.variantAttributeDimensions(variantId).find(item => this.optionEquals(item.name, attributeName));
    return dim?.values || [];
  });

  readonly productVariantAttributeRows = computed((): ProductApplicableVariantAttributeRow[] => {
    return this.selectedApplicableVariantRows().flatMap(variant =>
      (variant.attributes || []).map((attr, index) => ({
        variant_id: variant.id,
        variant_name: variant.variant_name,
        variant_label: variant.variant_label,
        attribute_name: attr.attribute_name,
        attribute_value: attr.attribute_value,
        index
      }))
    );
  });

  // True whenever the combination builder/grid is relevant: any selected
  // variant needs its own stock row, even if it has no attribute dimensions.
  readonly variantStockControlsVisible = computed(() => {
    return this.selectedApplicableVariantRows().length > 0 || this.variantStockCombinationRows().length > 0;
  });

  // Distinct attribute dimensions for one variant, e.g.
  // [{ name: 'Model', values: ['Xm','Xms','Za'] }, { name: 'Color', values: [...] }]
  variantAttributeDimensions(variantId: number, includeMasterValues = true): { name: string; values: string[] }[] {
    const variant = this.selectedApplicableVariantRows().find(v => v.id === variantId);
    const master = this.findVariantById(variantId);
    const items = variant?.attribute_items || [];
    const hasProductMappedValues = !!variant?.attributes?.length;
    const shouldIncludeMasterValues = includeMasterValues || !hasProductMappedValues;
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
    }
    if (shouldIncludeMasterValues) {
      for (const attr of master?.attributes || []) {
        const name = String(attr.attribute_name || '').trim();
        if (!name) continue;
        addValues(name, attr.attribute_value);
        addValues(name, attr.possible_values);
        if ((attr.attribute_type || '').toLowerCase() === 'yes/no') addValues(name, ['Yes', 'No']);
      }
    }
    return Array.from(byName.entries()).map(([name, values]) => ({ name, values }));
  }

  setPendingProductVariantMapVariant(variantId: number | null): void {
    const numericId = Number(variantId);
    this.pendingProductVariantMapVariantId.set(Number.isFinite(numericId) && numericId > 0 ? numericId : null);
    this.pendingProductVariantMapAttribute.set('');
    this.pendingProductVariantMapValue.set('');
    this.saveError.set('');
  }

  setPendingProductVariantMapAttribute(attributeName: any): void {
    const name = String(attributeName ?? '').trim();
    this.pendingProductVariantMapAttribute.set(name);
    this.pendingProductVariantMapValue.set('');
    this.saveError.set('');
  }

  setPendingProductVariantMapValue(value: any): void {
    this.pendingProductVariantMapValue.set(String(value ?? '').trim());
    this.saveError.set('');
  }

  addProductVariantAttributeMapping(): void {
    const variantId = this.effectiveProductVariantMapVariantId();
    const attributeName = this.pendingProductVariantMapAttribute().trim();
    const attributeValue = this.pendingProductVariantMapValue().trim();
    if (!variantId || !attributeName || !attributeValue) {
      this.saveError.set('Select Variant, Attribute and Value before adding the mapping.');
      return;
    }

    const variant = this.selectedApplicableVariants().find(item => item.id === variantId);
    if (!variant) return;
    const nextAttr = { attribute_name: attributeName, attribute_value: attributeValue };
    const existing = this.normalizeProductVariantAttributes(variant.attributes);
    if (existing.some(attr => this.optionEquals(attr.attribute_name, attributeName) && this.optionEquals(attr.attribute_value, attributeValue))) {
      this.saveError.set('This variant attribute value is already mapped for this product.');
      return;
    }

    this.selectedApplicableVariants.update(variants => variants.map(item =>
      item.id === variantId
        ? { ...item, attributes: [...existing, nextAttr] }
        : item
    ));
    this.pendingProductVariantMapValue.set('');
    this.saveMsg.set('Attribute value added to product mapping.');
    this.saveError.set('');
    setTimeout(() => this.saveMsg.set(''), 2000);
  }

  removeProductVariantAttributeMapping(variantId: number, index: number): void {
    this.selectedApplicableVariants.update(variants => variants.map(variant => {
      if (variant.id !== variantId) return variant;
      const attributes = this.normalizeProductVariantAttributes(variant.attributes).filter((_, attrIndex) => attrIndex !== index);
      return { ...variant, attributes };
    }));
    this.saveError.set('');
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
    const dimensions = this.variantAttributeDimensions(variantId, false);
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

  productStockFieldError(field: 'minStockLevel' | 'maxStockLevel' | 'reorderLevel' | 'reorderQty'): boolean {
    const values = {
      min: this.stockControlNumber(this.formValues()['minStockLevel']),
      max: this.stockControlNumber(this.formValues()['maxStockLevel']),
      reorder: this.stockControlNumber(this.formValues()['reorderLevel']),
      reorderQty: this.stockControlNumber(this.formValues()['reorderQty'])
    };
    const fieldMap = {
      minStockLevel: 'min',
      maxStockLevel: 'max',
      reorderLevel: 'reorder',
      reorderQty: 'reorderQty'
    } as const;
    return this.stockControlFieldInvalid(fieldMap[field], values, this.productStockControlsRequired());
  }

  variantStockCombinationFieldError(row: ProductVariantStockControl, field: 'min_stock_level' | 'max_stock_level' | 'reorder_level' | 'reorder_qty'): boolean {
    const values = this.variantStockControlValues(row);
    const fieldMap = {
      min_stock_level: 'min',
      max_stock_level: 'max',
      reorder_level: 'reorder',
      reorder_qty: 'reorderQty'
    } as const;
    return this.stockControlFieldInvalid(fieldMap[field], values, true);
  }

  private stockControlNumber(value: any): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private variantStockControlValues(row: ProductVariantStockControl): { min: number; max: number; reorder: number; reorderQty: number } {
    return {
      min: this.stockControlNumber(row?.min_stock_level),
      max: this.stockControlNumber(row?.max_stock_level),
      reorder: this.stockControlNumber(row?.reorder_level),
      reorderQty: this.stockControlNumber(row?.reorder_qty)
    };
  }

  private stockControlFieldInvalid(
    field: 'min' | 'max' | 'reorder' | 'reorderQty',
    values: { min: number; max: number; reorder: number; reorderQty: number },
    requireMax: boolean
  ): boolean {
    if (values[field] < 0) return true;
    if (field === 'max' && requireMax && !(values.max > 0)) return true;
    if ((field === 'min' || field === 'max') && values.max > 0 && values.min > values.max) return true;
    if ((field === 'min' || field === 'reorder') && values.min > 0 && values.reorder > 0 && values.reorder < values.min) return true;
    if ((field === 'max' || field === 'reorder') && values.max > 0 && values.reorder > values.max) return true;
    if ((field === 'max' || field === 'reorderQty') && values.max > 0 && values.reorderQty > values.max) return true;
    return false;
  }

  private stockControlValuesValidationMessage(
    label: string,
    values: { min: number; max: number; reorder: number; reorderQty: number },
    requireMax: boolean
  ): string {
    if ([values.min, values.max, values.reorder, values.reorderQty].some(value => value < 0)) {
      return `${label}: Stock control values cannot be negative.`;
    }
    if (requireMax && !(values.max > 0)) {
      return `${label}: Maximum Stock is required and must be greater than zero.`;
    }
    if (values.max > 0 && values.min > values.max) {
      return `${label}: Minimum Stock cannot be greater than Maximum Stock.`;
    }
    if (values.min > 0 && values.reorder > 0 && values.reorder < values.min) {
      return `${label}: Reorder Level cannot be below Minimum Stock.`;
    }
    if (values.max > 0 && values.reorder > values.max) {
      return `${label}: Reorder Level cannot be greater than Maximum Stock.`;
    }
    if (values.max > 0 && values.reorderQty > values.max) {
      return `${label}: Reorder Qty cannot be greater than Maximum Stock.`;
    }
    return '';
  }

  private productStockControlsValidationMessage(payload: Record<string, any>): string {
    if (this.config?.key !== 'productServiceMaster') return '';
    if (!this.productStockControlsRequired()) return '';

    const variantRows = Array.isArray(payload['variant_stock_controls']) ? payload['variant_stock_controls'] : [];
    if (this.selectedApplicableVariants().length) {
      if (!variantRows.length) return 'Add at least one Variant Stock Control row or turn off Stock Controls.';

      for (const row of variantRows) {
        const label = [
          row.variant_name || 'Variant',
          this.variantStockCombinationLabel(row)
        ].filter(Boolean).join(' - ');
        const message = this.stockControlValuesValidationMessage(label, this.variantStockControlValues(row), true);
        if (message) return message;
      }
      return '';
    }

    return this.stockControlValuesValidationMessage('Stock Controls', {
      min: this.stockControlNumber(payload['min_stock_level']),
      max: this.stockControlNumber(payload['max_stock_level']),
      reorder: this.stockControlNumber(payload['reorder_level']),
      reorderQty: this.stockControlNumber(payload['reorder_qty'])
    }, true);
  }

  onApplicableVariantsChange(items: VariantItem[] | null): void {
    const previousById = new Map(this.selectedApplicableVariants().map(variant => [variant.id, variant]));
    const selected = (items || []).map(v => ({
      id: v.id,
      variant_name: v.variant_name,
      variant_label: this.variantDisplayLabel(v),
      is_default: !!previousById.get(v.id)?.is_default,
      attributes: previousById.get(v.id)?.attributes ?? [],
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
  private transactionProductOptionsCacheSource: ProductItem[] | null = null;
  private readonly transactionProductOptionsCache = new Map<string, string[]>();

  protected productNamesForTransaction(key = this.config?.key || ''): string[] {
    const products = this.loadedProductObjects();
    if (this.transactionProductOptionsCacheSource !== products) {
      this.transactionProductOptionsCacheSource = products;
      this.transactionProductOptionsCache.clear();
    }
    const cacheKey = key || 'default';
    const cached = this.transactionProductOptionsCache.get(cacheKey);
    if (cached) return cached;
    const options = products
      .filter(product => this.productAllowedForTransaction(product, key))
      .map(p => p.product_name)
      .filter(Boolean) as string[];
    this.transactionProductOptionsCache.set(cacheKey, options);
    return options;
  }
  get salesEligibleProductOptions(): string[] {
    return this.productNamesForTransaction('salesInvoice');
  }
  get vendorOptions(): string[] { return this.vendorOptionList(); }
  get customerOptions(): string[] { return this.customerOptionList(); }
  get warehouseOptions(): string[] { return this.warehouseOptionList(); }
  get branchOptions(): string[] { return this.branchOptionList(); }
  get paymentTermOptions(): string[] { return this.paymentTermOptionList(); }
  get paymentTermResolvedOptions(): string[] {
    const field = this.displayFields().find(item => item.key === 'paymentTerms');
    return this.optionFallback(this.paymentTermOptions, field?.options);
  }
  get dcAddressStates(): string[] { return DC_ADDRESS_STATES; }
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

  // Real Global Contacts, used by Vendor Master, Customer Master, and the
  // Vendor/Customer "+" quick-add modal on every transaction screen (see
  // loadContacts()/loadGlobalMstContacts()/ngOnInit). Every other consumer of
  // `globalContacts` (Approval Workflow approver pickers, etc.) is untouched
  // and keeps using the static demo array above.
  private readonly loadedContactObjects = signal<ContactItem[]>([]);
  // Shared cross-app contacts (global.tbl_mst_contact) — see
  // loadGlobalMstContacts()/ngOnInit and 067_global_contact_writeback.sql.
  private readonly loadedGlobalMstContacts = signal<ContactItem[]>([]);
  // Real Global Contacts merged list — feeds Vendor Master / Customer
  // Master's own contact picker AND the Vendor/Customer "+" quick-add modal's
  // "Search Global Contact" field wherever it's opened from (any transaction
  // screen), so quick-add always binds to the same real contact data.
  protected readonly partyContactOptions = computed<GlobalContactOption[]>(() => {
    const toOption = (c: ContactItem, source: 'inv_contacts' | 'global_contact'): GlobalContactOption => ({
      id: c.id,
      name: c.name,
      type: (c.contact_type === 'Company' ? 'Company' : 'Individual') as 'Company' | 'Individual',
      mobile: c.mobile || '',
      email: c.email || '',
      gstin: c.gstin || '',
      pan: c.pan || '',
      address: c.address || '',
      source
    });
    return [
      ...this.loadedGlobalMstContacts().map(c => toOption(c, 'global_contact')),
      ...this.loadedContactObjects().map(c => toOption(c, 'inv_contacts'))
    ];
  });

  private loadContacts(): void {
    this.inventoryConfigService.getContacts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.loadedContactObjects.set(res.data ?? []),
        error: () => {}
      });
  }

  private loadGlobalMstContacts(): void {
    this.inventoryConfigService.getGlobalContacts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.loadedGlobalMstContacts.set(res.data ?? []),
        error: () => {} // legacy schema may be absent in some environments — fail quiet, keep inv_contacts working
      });
  }

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
    // Safety net for startLineGridColumnResize(): if the component is
    // destroyed mid-drag (route navigation while a resize handle is still
    // held down), drop the document-level listeners rather than leaking them.
    this.destroyRef.onDestroy(() => {
      if (this.lineGridResizeMoveHandler) document.removeEventListener('mousemove', this.lineGridResizeMoveHandler);
      if (this.lineGridResizeUpHandler) document.removeEventListener('mouseup', this.lineGridResizeUpHandler);
    });

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
    // Loaded on every screen (not just Vendor/Customer Master + GRN) so the
    // Vendor/Customer "+" quick-add's "Search Global Contact" field binds to
    // real data no matter which transaction screen it's opened from.
    this.loadContacts();
    this.loadGlobalMstContacts();

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
    if (this.showTransactionHeader() && !this.usesReferenceTrayOnly()) {
      this.loadTransactionReferenceDocs();
    }
    if (this.config?.key === 'productServiceMaster' || this.config?.key === 'hsnSacMapping') {
      this.loadTaxCodeSourceStatus();
      this.loadGstGuide();
    }
  }

  ngAfterViewInit(): void {
    this.syncGuidePortal();
  }

  ngAfterViewChecked(): void {
    this.syncGuidePortal();
  }

  ngOnDestroy(): void {
    this.guidePortalHost?.remove();
  }

  private syncGuidePortal(): void {
    const button = this.guideButton?.nativeElement;
    if (!button) return;

    const breadcrumbInner = document.querySelector<HTMLElement>('.breadcrumb-bar .bc-inner');
    if (!breadcrumbInner) return;

    if (!this.guidePortalHost) {
      this.guidePortalHost = document.createElement('span');
      this.guidePortalHost.className = 'inventory-breadcrumb-guide';
    }

    // Mount inside the Pay/Receipt toggle's own flex group (not as a plain
    // .bc-inner flex child) so Guide shares its already-collision-proof
    // absolute right-edge anchor instead of landing in the same reserved
    // gutter via a separate, uncoordinated position and overlapping it.
    const payToggle = breadcrumbInner.querySelector<HTMLElement>('.bc-pay-toggle');
    const guideParent = payToggle || breadcrumbInner;
    if (this.guidePortalHost.parentElement !== guideParent) {
      guideParent.prepend(this.guidePortalHost);
    }

    if (button.parentElement !== this.guidePortalHost) {
      this.guidePortalHost.appendChild(button);
    }

    const panel = this.guidePanel?.nativeElement;
    if (panel && panel.parentElement !== this.guidePortalHost) {
      this.guidePortalHost.appendChild(panel);
    }
  }

  @HostListener('window:inventory-barcode-scan', ['$event'])
  onInventoryBarcodeScan(event: Event): void {
    const detail = (event as CustomEvent<{ code?: string }>).detail;
    this.addScannedItem(detail?.code || '');
  }

  @HostListener('click', ['$event'])
  onShellClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    const button = target?.closest('button') as HTMLButtonElement | null;
    if (!button || button.closest('.inventory-modal')) return;

    const text = (button.textContent || '').trim().replace(/\s+/g, ' ');
    const title = button.getAttribute('title') || '';
    const dataAction = button.getAttribute('data-action') || '';
    const dataIndex = button.getAttribute('data-index');

    if (button.closest('.grid-export-actions')) {
      const toolbarAction = this.gridToolbarActionFromTitle(title);
      if (toolbarAction) {
        event.preventDefault();
        event.stopPropagation();
        const tableId = button.closest('.inventory-current-entries') ? 'entry' : 'records';
        this.runGridToolbarAction(tableId, toolbarAction);
        return;
      }
    }

    if (!this.isApiWired()) return;

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

  // ── Global keyboard navigation ───────────────────────────────────────────
  // Applied once here since every screen component extends this class: Enter
  // moves focus to the next field (Tab-order), Space opens a focused closed
  // ng-select, and Enter on the last cell of the grid's last row adds a new
  // row and focuses it — so the whole ERP can be driven without a mouse.
  private static readonly FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  @HostListener('keydown', ['$event'])
  onInventoryKeyNav(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (event.key === ' ' || event.code === 'Space') {
      this.handleKeyNavSpace(event, target);
      return;
    }

    if (event.key !== 'Enter') return;
    if (target.tagName === 'TEXTAREA') return; // Enter inserts a newline there
    if (target.closest('.ng-select-opened')) return; // let ng-select confirm its highlighted option

    const host = this.elementRef.nativeElement;
    const focusables = this.collectKeyNavFocusables(host);
    const currentIndex = focusables.indexOf(target);
    if (currentIndex === -1) return;

    if (this.isLastGridCellOfLastRow(target)) {
      event.preventDefault();
      this.addEntryLineRow();
      setTimeout(() => {
        const refreshed = this.collectKeyNavFocusables(host);
        const firstOfNewRow = refreshed.slice(currentIndex + 1).find(el => el.closest('.inventory-line-items tr'));
        (firstOfNewRow || refreshed[currentIndex + 1])?.focus();
      });
      return;
    }

    const next = focusables[currentIndex + 1];
    if (next) {
      event.preventDefault();
      next.focus();
    }
  }

  private handleKeyNavSpace(event: KeyboardEvent, target: HTMLElement): void {
    const ngSelectHost = target.closest('ng-select') as HTMLElement | null;
    if (!ngSelectHost || ngSelectHost.classList.contains('ng-select-opened')) return;
    const container = ngSelectHost.querySelector('.ng-select-container') as HTMLElement | null;
    if (!container) return;
    event.preventDefault();
    container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  }

  private collectKeyNavFocusables(host: HTMLElement): HTMLElement[] {
    return Array.from(host.querySelectorAll<HTMLElement>(InventoryScreenShell.FOCUSABLE_SELECTOR))
      .filter(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  }

  private isLastGridCellOfLastRow(target: HTMLElement): boolean {
    const row = target.closest('.inventory-line-items tr');
    if (!row) return false;
    const body = row.closest('tbody');
    if (!body || body.lastElementChild !== row) return false;
    const rowFocusables = Array.from(row.querySelectorAll<HTMLElement>(InventoryScreenShell.FOCUSABLE_SELECTOR))
      .filter(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
    return rowFocusables.length > 0 && rowFocusables[rowFocusables.length - 1] === target;
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

  private compactKey(value: any): string {
    return this.normalizeKey(value).replace(/[^a-z0-9]+/g, '');
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
    if (!this.usesReferenceTrayOnly()) {
      this.loadTransactionReferenceDocs();
    }
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

  private normalizeProductVariantAttributes(attributes: any): ProductVariantStockAttribute[] {
    const raw = Array.isArray(attributes) ? attributes : [];
    const seen = new Set<string>();
    const normalized: ProductVariantStockAttribute[] = [];
    for (const attr of raw) {
      const attributeName = String(attr?.attribute_name ?? attr?.attributeName ?? attr?.name ?? '').trim();
      const attributeValue = String(attr?.attribute_value ?? attr?.attributeValue ?? attr?.value ?? '').trim();
      if (!attributeName || !attributeValue) continue;
      const key = `${this.normalizeKey(attributeName)}::${this.normalizeKey(attributeValue)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push({ attribute_name: attributeName, attribute_value: attributeValue });
    }
    return normalized;
  }

  private productVariantAttributeItemList(attributes: ProductVariantStockAttribute[] | null | undefined): { name: string; value: string }[] {
    return this.normalizeProductVariantAttributes(attributes)
      .map(attr => ({ name: attr.attribute_name, value: attr.attribute_value }));
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
      is_default: !!variant.is_default,
      attributes: this.normalizeProductVariantAttributes(variant.attributes)
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
    const pendingMapId = this.pendingProductVariantMapVariantId();
    if (!pendingMapId || !validVariantIds.has(pendingMapId)) {
      this.pendingProductVariantMapVariantId.set(primary?.id ?? null);
      this.pendingProductVariantMapAttribute.set('');
      this.pendingProductVariantMapValue.set('');
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

  private findProductForReferenceItem(item: any, fallbackSelection: any): ProductItem | null {
    const productId = this.optionalNumber(item?.product_id ?? item?.productId);
    if (productId) {
      const byId = this.loadedProductObjects().find(product => Number(product.id) === productId);
      if (byId) return byId;
    }
    return this.findProductBySelection(fallbackSelection);
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
      const salesConversions = conversions.filter(conversion => !!(conversion.is_sales_uom || conversion.is_default_sale));
      if (salesConversions.length) return salesConversions;
      return conversions.filter(conversion => !!(conversion.is_purchase_uom || conversion.is_default_purchase));
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

  private productApplicableVariantTransactionLabel(variant: ProductApplicableVariant): string {
    const master = this.findVariantById(variant.id);
    return String(master?.variant_name || variant.variant_name || variant.variant_label || '').trim();
  }

  protected productVariantOptionObjects(product: ProductItem | null | undefined): Array<{ id: number; label: string; variant_name: string; aliases: string[] }> {
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
        const label = this.productApplicableVariantTransactionLabel(variant);
        const displayLabel = this.productApplicableVariantLabel(variant);
        const master = this.findVariantById(variant.id);
        const groupName = master?.variant_name || variant.variant_name || label;
        const aliases = [label, groupName, displayLabel, variant.variant_label, variant.variant_name]
          .map(value => String(value || '').trim())
          .filter(Boolean);
        return { id: variant.id, label, variant_name: groupName, aliases: [...new Set(aliases)] };
      })
      .filter(option => !!option.id && !!option.label);
  }

  private productVariantOptionMatches(option: { label: string; variant_name: string; aliases?: string[] }, value: string | null | undefined): boolean {
    return (option.aliases || [option.label, option.variant_name]).some(alias => this.optionEquals(alias, value || ''));
  }

  protected productVariantOptionsForTransaction(product: ProductItem | null | undefined): string[] {
    return this.productVariantOptionObjects(product).map(option => option.label);
  }

  private productApplicableVariantForId(product: ProductItem | null | undefined, variantId: number | null | undefined): ProductApplicableVariant | null {
    const id = Number(variantId);
    if (!product || !Number.isFinite(id) || id <= 0) return null;
    return (product.applicable_variants || []).find(variant => Number(variant.id) === id) ?? null;
  }

  private productMappedVariantAttributes(product: ProductItem | null | undefined, variantId: number | null | undefined): ProductVariantStockAttribute[] {
    return this.normalizeProductVariantAttributes(this.productApplicableVariantForId(product, variantId)?.attributes);
  }

  private variantAttributeItemsForTransaction(product: ProductItem | null | undefined, variantId: number | null | undefined): { name: string; value: string }[] {
    const mapped = this.productMappedVariantAttributes(product, variantId);
    if (mapped.length) return this.productVariantAttributeItemList(mapped);
    return this.variantAttributeItemList(this.findVariantById(Number(variantId) || 0));
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

  private serialNumbersFromRecordItem(item: any): string[] {
    const structured = item?.serial_numbers ?? item?.serialNumbers;
    if (Array.isArray(structured)) {
      return structured
        .map(value => String(value ?? '').trim())
        .filter(Boolean);
    }

    const raw = String(item?.serial_no ?? item?.serialNo ?? '').trim();
    if (!raw) return [];

    const parts = this.attributeTextParts(raw);
    const namedParts = parts.filter(part => part.name && part.value);
    if (namedParts.length) {
      const serialPart = namedParts.find(part => /(serial|chassis|chasis|imei|vin)/i.test(part.name)) ?? namedParts[0];
      return serialPart?.value ? [serialPart.value] : [];
    }

    return raw
      .split(/[,\n;|]+/)
      .map(value => value.trim())
      .filter(Boolean);
  }

  private lineSerialMapFromItems(items: any[] | null | undefined, startIndex = 0): Record<number, string[]> {
    const serialMap: Record<number, string[]> = {};
    (items || []).forEach((item: any, index: number) => {
      const serials = this.serialNumbersFromRecordItem(item);
      if (serials.length) serialMap[startIndex + index] = serials;
    });
    return serialMap;
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
      this.vendorSelectionCandidates(item).some(candidate => this.normalizeKey(candidate) === selectedKey)
    ) ?? null;
  }

  private vendorPhone(item: VendorItem | null | undefined): string {
    return String(item?.mobile || item?.contact_mobile || '').trim();
  }

  private vendorOptionLabel(item: VendorItem): string {
    const name = String(item.vendor_name || item.vendor_code || '').trim();
    const phone = this.vendorPhone(item);
    return [name, phone].filter(Boolean).join(' | ');
  }

  private vendorSelectionCandidates(item: VendorItem): string[] {
    const name = String(item.vendor_name || '').trim();
    const code = String(item.vendor_code || '').trim();
    const phone = this.vendorPhone(item);
    const contactName = String(item.contact_name || '').trim();
    const label = this.vendorOptionLabel(item);
    return this.mergeOptions([], [
      label,
      name,
      code,
      phone,
      contactName,
      phone && name ? `${phone} | ${name}` : ''
    ]);
  }

  private findCustomerBySelection(value: any): CustomerItem | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const selectedKey = this.normalizeKey(raw);
    return this.loadedCustomerObjects().find(item =>
      this.customerSelectionCandidates(item).some(candidate => this.normalizeKey(candidate) === selectedKey)
    ) ?? null;
  }

  private customerPhone(item: CustomerItem | null | undefined): string {
    return String(item?.mobile || item?.contact_mobile || '').trim();
  }

  private customerOptionLabel(item: CustomerItem): string {
    const name = String(item.customer_name || item.customer_code || '').trim();
    const phone = this.customerPhone(item);
    return [name, phone].filter(Boolean).join(' | ');
  }

  private customerSelectionCandidates(item: CustomerItem): string[] {
    const name = String(item.customer_name || '').trim();
    const code = String(item.customer_code || '').trim();
    const phone = this.customerPhone(item);
    const contactName = String(item.contact_name || '').trim();
    const label = this.customerOptionLabel(item);
    return this.mergeOptions([], [
      label,
      name,
      code,
      phone,
      contactName,
      phone && name ? `${phone} | ${name}` : ''
    ]);
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

  // The supplying/receiving branch's own GST registration for a purchase or
  // sales document — used to decide CGST+SGST vs IGST (see
  // isInterstateTransaction()/purchaseInvoiceFinancials()/
  // salesInvoiceFinancials()). Falls back from a direct branch_id to the
  // recorded warehouse's branch_id, since PI/SI records commonly carry only
  // a warehouse.
  private ourBranchForRecord(record: any): BranchInvItem | null {
    const branchId = this.branchIdFromRecord(record);
    if (branchId) {
      const branch = this.loadedBranchObjects().find(item => Number(item.branch_id) === branchId || Number(item.id) === branchId);
      if (branch) return branch;
    }
    const warehouseId = this.optionalNumber(record?.warehouse_id ?? record?.warehouseId);
    const warehouse = warehouseId ? this.loadedWarehouseObjects().find(item => Number(item.id) === warehouseId) : null;
    const warehouseBranchId = this.optionalNumber(warehouse?.branch_id);
    if (warehouseBranchId) {
      return this.loadedBranchObjects().find(item => Number(item.branch_id) === warehouseBranchId || Number(item.id) === warehouseBranchId) || null;
    }
    return null;
  }

  private gstStateCodeFromGstin(gstin: string | null | undefined): string {
    const clean = String(gstin || '').trim();
    return /^\d{2}/.test(clean) ? clean.slice(0, 2) : '';
  }

  // true => interstate (IGST); false => intrastate (CGST+SGST); null => not
  // enough data on one side to tell, so the caller keeps the old CGST+SGST
  // default rather than guessing.
  private isInterstateTransaction(
    ourGstin: string | null | undefined, ourState: string | null | undefined,
    theirGstin: string | null | undefined, theirState: string | null | undefined,
    placeOfSupply?: string | null
  ): boolean | null {
    const ourCode = this.gstStateCodeFromGstin(ourGstin);
    const theirCode = this.gstStateCodeFromGstin(theirGstin);
    if (ourCode && theirCode) return ourCode !== theirCode;

    const ourStateKey = this.normalizeKey(ourState || '');
    const theirStateKey = this.normalizeKey(placeOfSupply || theirState || '');
    if (ourStateKey && theirStateKey) return ourStateKey !== theirStateKey;

    return null;
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

  // Variant Master's Attribute Value cell allows typing a brand-new option
  // (e.g. a new car model) for closed-list attributes.
  isVariantAttributeValueColumn(column: string): boolean {
    return this.config?.key === 'variantMaster' && column.toLowerCase().includes('attribute value');
  }

  isAttributeValueAdminColumn(column: string): boolean {
    if (this.config?.key !== 'attributeMaster') return false;
    const key = column.toLowerCase().trim();
    return key === 'value code' || key === 'sort order';
  }

  // Shared by persistNewAttributeValueIfNeeded() (typing a new value directly
  // into a variant row's Value dropdown) and saveQuickAttribute()'s
  // duplicate-name merge path (typing an existing attribute's name again in
  // the "New Attribute" quick-add, to add more values to it) — same merge
  // logic, same payload shape, so both stay in sync with each other.
  private mergedAttributeValuesPayload(attribute: AttributeItem, rawValues: string[]): { payload: Record<string, any>; newOnes: string[] } | null {
    const existingRows = attribute.values || [];
    const existing = existingRows.length
      ? existingRows.map(row => row.value_name).filter(Boolean)
      : (attribute.possible_values || []);
    const newOnes = rawValues.filter(token => !existing.some(option => this.optionEquals(option, token)));
    if (!newOnes.length) return null;
    const updatedValues = [
      ...existingRows.map(row => ({
        id: row.id,
        value_code: row.value_code || null,
        value_name: row.value_name,
        status: row.status || 'active',
        sort_order: row.sort_order ?? 100
      })),
      ...newOnes.map((token, index) => ({
        value_code: null,
        value_name: token,
        status: 'active',
        sort_order: (existingRows.length + index + 1) * 10
      }))
    ];
    return {
      newOnes,
      payload: {
        segment_id: attribute.segment_id ?? this.selectedSegmentId(),
        attribute_code: attribute.attribute_code || null,
        attribute_name: attribute.attribute_name,
        attribute_type: attribute.attribute_type,
        possible_values: [...existing, ...newOnes],
        values: updatedValues,
        is_mandatory: attribute.is_mandatory,
        status: attribute.status || 'active'
      }
    };
  }

  private persistNewAttributeValueIfNeeded(attributeName: string, value: any): void {
    const attribute = this.findAttributeBySelection(attributeName);
    if (!attribute) return;
    const type = this.normalizeAttributeType(attribute.attribute_type);
    if (type !== 'select' && type !== 'multiselect') return;
    const tokens = this.variantAttributeValueTokens(attributeName, value);
    const merged = this.mergedAttributeValuesPayload(attribute, tokens);
    if (!merged) return;
    const newOnes = merged.newOnes;
    this.inventoryConfigService.saveAttribute(merged.payload, attribute.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        if (res.success && res.data) {
          const saved = res.data as AttributeItem;
          const replace = (items: AttributeItem[]) =>
            items.some(item => item.id === saved.id) ? items.map(item => item.id === saved.id ? saved : item) : [...items, saved];
          this.loadedAttributeObjects.update(replace);
          this.allAttributeObjects.update(replace);
          this.saveMsg.set(`Added "${newOnes.join(', ')}" to ${attribute.attribute_name}.`);
          setTimeout(() => this.saveMsg.set(''), 2000);
        } else {
          const message = res.message || `Failed to save new value onto ${attribute.attribute_name}.`;
          this.saveError.set(message);
          this.quickAddError.set(message);
        }
      },
      error: (err: any) => {
        const message = this.apiErrorMessage(err, `Failed to save new value onto ${attribute.attribute_name}.`);
        this.saveError.set(message);
        this.quickAddError.set(message);
      }
    });
  }

  // Memoized: this used to rebuild (spread + filter) the merged attribute list from
  // scratch on every single call. It's called from several places that each fire
  // per-row per-render-cycle in the variant attribute grid (quickVariantRowValueOptions,
  // quickVariantRowUsesMultiselect, quickVariantRowValueControlValue,
  // quickVariantRowValuePlaceholder), so with several rows and multi-select chips
  // that redraw frequently, the repeated array rebuilds compounded into a real
  // perceived freeze. Only recomputes now when the underlying signals actually change.
  private readonly attributeLookupObjects = computed((): AttributeItem[] => {
    const seen = new Set<string>();
    return [...this.loadedAttributeObjects(), ...this.allAttributeObjects()]
      .filter(item => {
        const key = item.id ? `id:${item.id}` : `name:${this.normalizeKey(item.attribute_name)}`;
        if (!item.attribute_name || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  });


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
    if (key === 'list') return 'List';
    if (key === 'dropdown' || key === 'select') return 'Dropdown';
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

  // Cache keyed by the input array's own identity. `formFieldValue()` and the quick-add
  // variant grid both call this on every template evaluation (i.e. every change-detection
  // pass, not just on real edits). Rebuilding a new array via map/filter each time — even
  // when `value` hadn't actually changed — made ng-select's writeValue() see a "new" value
  // on every pass, which re-triggers CD, which calls this again, forever (NG0103). Returning
  // the same cached array for the same input array reference breaks that loop.
  private readonly _variantAttributeValueTokensCache = new WeakMap<object, string[]>();

  private variantAttributeValueTokens(attributeName: string | null | undefined, value: any): string[] {
    if (Array.isArray(value)) {
      const cached = this._variantAttributeValueTokensCache.get(value);
      if (cached) return cached;
      const tokens = value.map(item => String(item ?? '').trim()).filter(Boolean);
      this._variantAttributeValueTokensCache.set(value, tokens);
      return tokens;
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

  private attributeValuesForSelection(attributeName: string | null | undefined, activeOnly = true): AttributeValueItem[] {
    const attribute = this.findAttributeBySelection(attributeName);
    if (!attribute) return [];
    const rows = attribute.values || [];
    return activeOnly
      ? rows.filter(row => String(row.status || 'active').toLowerCase() === 'active')
      : rows;
  }

  private findAttributeValueBySelection(attributeName: string | null | undefined, value: any): AttributeValueItem | null {
    const values = this.attributeValuesForSelection(attributeName, false);
    const text = this.variantAttributeValueForPayload(value);
    if (!text) return null;
    return values.find(row =>
      this.optionEquals(row.value_name, text)
      || this.optionEquals(row.value_code || '', text)
      || this.optionEquals(String(row.id || ''), text)
    ) ?? null;
  }

  addVariantGeneratorSelection(): void {
    this.variantGeneratorSelections.update(rows => [...rows, { attributeName: '', valueNames: [] }]);
  }

  removeVariantGeneratorSelection(index: number): void {
    this.variantGeneratorSelections.update(rows => rows.filter((_, rowIndex) => rowIndex !== index));
    this.variantGeneratorRows.set([]);
    this.variantGeneratorPicked.set({});
  }

  setVariantGeneratorAttribute(index: number, attributeName: string): void {
    this.variantGeneratorSelections.update(rows => rows.map((row, rowIndex) =>
      rowIndex === index ? { attributeName, valueNames: [] } : row
    ));
    this.variantGeneratorRows.set([]);
    this.variantGeneratorPicked.set({});
  }

  setVariantGeneratorValues(index: number, valueNames: string[]): void {
    this.variantGeneratorSelections.update(rows => rows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, valueNames: valueNames || [] } : row
    ));
    this.variantGeneratorRows.set([]);
    this.variantGeneratorPicked.set({});
  }

  variantGeneratorValueOptions(attributeName: string | null | undefined): string[] {
    const normalized = this.attributeValuesForSelection(attributeName, true)
      .map(row => row.value_name)
      .filter(Boolean);
    return normalized.length ? normalized : this.variantAttributeValueOptions(attributeName);
  }

  variantGeneratorRowKey(row: VariantCombinationRow, index: number): string {
    return row.combination_hash || `${row.product_id}:${row.variant_name}:${index}`;
  }

  variantGeneratorRowPicked(row: VariantCombinationRow, index: number): boolean {
    return !!this.variantGeneratorPicked()[this.variantGeneratorRowKey(row, index)];
  }

  setVariantGeneratorRowPicked(row: VariantCombinationRow, index: number, picked: boolean): void {
    const key = this.variantGeneratorRowKey(row, index);
    this.variantGeneratorPicked.update(map => ({ ...map, [key]: picked }));
  }

  variantGeneratorSelectedCount(): number {
    return this.variantGeneratorRows().filter((row, index) => !row.exists && this.variantGeneratorRowPicked(row, index)).length;
  }

  variantGeneratorSummary(): string {
    const rows = this.variantGeneratorRows();
    if (!rows.length) return '';
    const newCount = rows.filter(row => !row.exists).length;
    const existingCount = rows.length - newCount;
    const selectedCount = this.variantGeneratorSelectedCount();
    return `${rows.length} combinations | ${newCount} new | ${existingCount} existing | ${selectedCount} selected`;
  }

  private variantGeneratorProduct(): ProductItem | null {
    return this.findProductBySelection(this.formValues()['parentProduct']);
  }

  previewVariantCombinations(): void {
    const product = this.variantGeneratorProduct();
    if (!product?.id) {
      this.variantGeneratorError.set('Select Parent Product / Item before generating combinations.');
      return;
    }

    const selections = this.variantGeneratorSelections()
      .map((row, index) => {
        const attribute = this.findAttributeBySelection(row.attributeName);
        const valueIds = (row.valueNames || [])
          .map(value => this.findAttributeValueBySelection(row.attributeName, value)?.id)
          .filter((id): id is number => Number.isFinite(Number(id)));
        return {
          attribute_id: attribute?.id ?? null,
          attribute_name: attribute?.attribute_name || row.attributeName,
          display_order: index + 1,
          value_ids: valueIds,
          values: row.valueNames || []
        };
      })
      .filter(row => row.attribute_name && ((row.value_ids || []).length || (row.values || []).length));

    if (!selections.length) {
      this.variantGeneratorError.set('Select at least one attribute and one active value.');
      return;
    }

    this.variantGeneratorLoading.set(true);
    this.variantGeneratorError.set('');
    this.variantGeneratorMessage.set('');
    this.inventoryConfigService.generateVariantCombinations({
      product_id: product.id,
      sku_pattern: this.formValues()['skuPattern'] || 'ITEMCODE',
      create_variants: false,
      selections
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.variantGeneratorLoading.set(false);
        if (!res.success || !res.data) {
          this.variantGeneratorError.set(res.message || 'Unable to generate combinations.');
          return;
        }
        const rows = res.data.rows || [];
        this.variantGeneratorRows.set(rows);
        const picked: Record<string, boolean> = {};
        rows.forEach((row, index) => {
          picked[this.variantGeneratorRowKey(row, index)] = !row.exists;
        });
        this.variantGeneratorPicked.set(picked);
        this.variantGeneratorMessage.set(this.variantGeneratorSummary() || 'No combinations found.');
      },
      error: err => {
        this.variantGeneratorLoading.set(false);
        this.variantGeneratorError.set(this.apiErrorMessage(err, 'Unable to generate combinations.'));
      }
    });
  }

  createVariantCombinations(): void {
    const selected = this.variantGeneratorRows().filter((row, index) => !row.exists && this.variantGeneratorRowPicked(row, index));
    if (!selected.length) {
      this.variantGeneratorError.set('Select at least one new combination to create.');
      return;
    }

    let created = 0;
    let failed = 0;
    this.variantGeneratorLoading.set(true);
    this.variantGeneratorError.set('');
    this.variantGeneratorMessage.set('');

    from(selected).pipe(
      concatMap(row => this.inventoryConfigService.saveVariant(this.variantCombinationPayload(row)).pipe(
        catchError(err => of({ success: false, message: this.apiErrorMessage(err, 'Combination save failed.'), data: null } as ApiResponse<any>))
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: res => {
        if (res.success) created += 1;
        else {
          failed += 1;
          this.variantGeneratorError.set(res.message || 'One or more combinations failed.');
        }
      },
      complete: () => {
        this.variantGeneratorLoading.set(false);
        this.variantGeneratorMessage.set(`${created} variant${created === 1 ? '' : 's'} created${failed ? `, ${failed} failed` : ''}.`);
        this.loadApiRecords();
        this.loadLookupOptions();
        this.previewVariantCombinations();
      },
      error: err => {
        this.variantGeneratorLoading.set(false);
        this.variantGeneratorError.set(this.apiErrorMessage(err, 'Unable to create selected combinations.'));
      }
    });
  }

  private variantCombinationPayload(row: VariantCombinationRow): Record<string, any> {
    const product = this.variantGeneratorProduct();
    const images = String(this.formValues()['images'] || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    return {
      segment_id: this.selectedSegmentId(),
      product_id: product?.id ?? row.product_id,
      product_code: product?.product_code || null,
      product_name: product?.product_name || null,
      variant_code: row.sku || null,
      variant_name: row.variant_name,
      sku: row.sku || null,
      sku_pattern: this.formValues()['skuPattern'] || 'ITEMCODE',
      barcode: this.formValues()['barcode'] || null,
      price: Number(this.formValues()['price']) || 0,
      cost: Number(this.formValues()['cost']) || 0,
      stock_on_hand: Number(this.formValues()['stockOnHand']) || 0,
      images,
      attributes: (row.attributes || []).map((attr, index) => ({
        attribute_id: attr.attribute_id ?? null,
        attribute_name: attr.attribute_name || null,
        attribute_value_id: attr.attribute_value_id ?? null,
        attribute_value: attr.value_name || attr.attribute_value || null,
        display_order: attr.display_order ?? index + 1
      })),
      is_generated: true,
      status: 'active'
    };
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
    const row = this.quickAddVariantRows()[index];
    // Typing a brand-new value here (via addTag) saves it back onto the
    // Attribute record so it becomes a reusable option everywhere, same as
    // the Attribute Value cell in Variant Master's own line grid.
    if (row?.name && value) {
      this.persistNewAttributeValueIfNeeded(row.name, value);
    }
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

  // Memoized per-row view models for the variant attribute grid. `quickVariantRowValueControlValue()`
  // (and the token array it builds for multiselect attributes) constructed a brand-new array on every
  // invocation, and the template called it directly inside [ngModel] on a [multiple]="true" ng-select.
  // ng-select's writeValue() treats a new array reference as "the value changed", calls markForCheck(),
  // which triggers another CD pass, which re-evaluates the same method and produces yet another new
  // array — an infinite writeValue/setValue loop that Angular eventually kills with NG0103. This
  // computed only recomputes when the quickAddVariantRows signal itself changes (i.e. on an actual
  // user edit via .update()/.set()), so the same row keeps the same array reference across unrelated
  // change-detection cycles and ng-select stops seeing spurious "changes".
  readonly quickAddVariantRowViews = computed(() => {
    return this.quickAddVariantRows().map(row => ({
      options: this.variantAttributeValueOptions(row.name),
      usesMultiselect: this.variantAttributeUsesMultiselect(row.name),
      inputType: this.variantAttributeValueInputType(row.name),
      controlValue: this.variantAttributeValueControlValue(row.name, row.value),
      placeholder: this.variantAttributeValuePlaceholder(row.name),
    }));
  });

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
  // The currently selected/just quick-added UOM is always unioned in, otherwise
  // a UOM added via the "+" next to Base UOM while a curated category is
  // selected would be set on the form but invisible/unselectable in the dropdown.
  //
  // This MUST be a computed(), not a plain method: ng-select's [items] was
  // bound directly to a method call, which Angular re-invokes (and which
  // built a brand-new array) on every single change-detection pass, not just
  // when something actually changed. That reference churn made ng-select
  // reset mid-click, so clicking an option never registered as a selection.
  // computed() only recomputes when a dependency signal actually changes.
  protected readonly productBaseUomOptions = computed<string[]>(() => {
    const curated = (this.selectedProductCategoryObject()?.uoms || [])
      .map(u => this.uomDisplayLabel(u))
      .filter(Boolean);
    const base = curated.length
      ? this.mergeOptions(curated, [])
      : (this.uomOptions.length ? this.uomOptions : this.loadedUomObjects().map(u => this.uomDisplayLabel(u)).filter(Boolean));
    const current = String(this.formValues()['baseUom'] || '').trim();
    return current ? this.mergeOptions(base, [current]) : base;
  });

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
          // Bind to real Warehouse Master data only — this used to merge in
          // INVENTORY_OPTIONS.locations (a hardcoded pre-backend demo list),
          // so real warehouses always showed alongside fake ones.
          this.warehouseOptionList.set(this.mergeOptions([], names));
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
          // Bind to real Payment Terms Master data only — same demo-data-
          // merge cleanup as warehouse/vendor (see loadSegmentScopedLookups).
          this.paymentTermOptionList.set(this.mergeOptions([], names));
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
    this.loadedSerialPolicyObjects.set([]);
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
          const policies = res.data ?? [];
          this.loadedSerialPolicyObjects.set(policies);
          const names = policies.map(item => item.policy_name).filter(Boolean) as string[];
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
          // Bind to real Vendor Master data only — this used to merge in
          // INVENTORY_OPTIONS.suppliers (a hardcoded pre-backend demo list:
          // 'ElectroMart Supplies', 'Aero Labs', etc.), so GRN/PI/etc's
          // Vendor dropdown always showed fake names alongside (or instead
          // of, when no real vendors existed yet) real saved vendors.
          const vendorLabels = vendors.map(item => this.vendorOptionLabel(item)).filter(Boolean) as string[];
          this.vendorOptionList.set(this.mergeOptions([], vendorLabels));
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
          const names = customers.map(item => this.customerOptionLabel(item)).filter(Boolean) as string[];
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
    return this.gridDateDisplay(value);
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
      case 'taxCodeImport':
        return ['Choose the official CSV/XLSX source file.', 'Enter source name and source date.', 'Import, then review HSN/SAC suggestions before use.'];
      case 'vendorPayment':
        return ['Select vendor and voucher date.', 'Allocate amount against open purchase invoices.', 'Add payment mode and save the voucher.'];
      case 'customerReceipt':
        return ['Select customer and voucher date.', 'Allocate receipt against open sales invoices.', 'Add receipt mode and save the voucher.'];
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

  guideFields(): InventoryField[] {
    return this.displayFields().slice(0, 6);
  }

  hiddenGuideFieldCount(): number {
    return Math.max(0, this.displayFields().length - this.guideFields().length);
  }

  guideVideoUrl(): string {
    return (this.config?.guideVideoUrl || '').trim();
  }

  shortText(value: string | null | undefined, maxLength = 120): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
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

    if (field.key === 'serialFormat') return 'Free-text reference note, not validated — e.g. 15-digit IMEI';
    if (field.key === 'batchFormat') return 'Free-text reference note, not validated — e.g. YYYYMMDD-SUPPLIER-SEQ';

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
    this.quickAddHsnType.set('HSN');
    this.quickAddHsnGstRate.set(null);

    if (master === 'Variant') {
      this.quickAddVariantRows.set([{name: '', value: ''}]);
    }

    if (master === 'Vendor') {
      this.quickVendorLinkedContact.set(null);
    }

    if (master === 'Customer') {
      this.quickCustomerLinkedContact.set(null);
    }

    if (master === 'Attribute') {
      this.formValues.update(fv => ({
        ...fv,
        quickAttributeType: 'Text',
        quickAttributeValues: '',
        quickAttributeMandatory: 'No',
        quickAttributeStatus: 'active'
      }));
    }

    if (master === 'Serial Number Policy' || master === 'Batch / Lot Policy') {
      // The Applicable Category field is no longer shown in this popup (it's
      // implied by wherever the popup was opened from), so it must never carry
      // a stale value from a previous quick-add into this one — always clear
      // first, then auto-fill from context: the parent Category modal's
      // in-progress name, the category being created/edited on Category
      // Master's own screen, or the product's currently selected category.
      const fieldKey = master === 'Serial Number Policy' ? 'quickApplicableCategory' : 'quickApplicableFor';
      const parentCat = current === 'Category'
        ? currentName
        : this.config?.key === 'categoryMaster'
          ? String(this.formValues()['categoryName'] || '').trim()
          : (this.selectedProductCategory() || '');
      this.formValues.update(fv => ({ ...fv, [fieldKey]: parentCat }));
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

  private static readonly QUICK_ADD_MASTERS_WITH_AUTO_CODE = new Set([
    'Variant', 'UOM', 'Serial Number Policy', 'Batch / Lot Policy', 'Brand', 'Product Type', 'Vendor', 'Customer', 'Manufacturer'
  ]);

  onQuickAddNameChange(name: string): void {
    const normalizedName = toInventoryTitleCase(name ?? '');
    this.quickAddName.set(normalizedName);
    if (InventoryScreenShell.QUICK_ADD_MASTERS_WITH_AUTO_CODE.has(this.activeAddMaster()) && !this._quickAddCodeManuallySet) {
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

  saveQuickHsnSac(): void {
    const code = this.quickAddCode().trim().toUpperCase();
    const description = this.quickAddName().trim();
    if (!code) { this.quickAddError.set('HSN/SAC code is required.'); return; }
    if (!description) { this.quickAddError.set('Description is required.'); return; }
    if (this.isSavingQuickAdd()) return;

    const type = this.quickAddHsnType();
    const gstRate = this.quickAddHsnGstRate() ?? 0;
    const parentBeforeSave = this.quickAddParentMaster();
    const sourceKey = this.addMasterSourceFieldKey();

    this.isSavingQuickAdd.set(true);
    this.quickAddError.set('');
    this.inventoryConfigService.quickAddHsnSac(code, type, description, gstRate)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiResponse<HsnSacItem>) => {
          this.isSavingQuickAdd.set(false);
          if (res.success && res.data) {
            const saved = res.data;
            if (!this.hsnSacOptionList().some(o => this.optionEquals(o, saved.code))) {
              this.hsnSacOptionList.update(opts => [...opts, saved.code]);
            }
            this.loadedHsnSacObjects.update(items =>
              items.some(item => item.id === saved.id) ? items : [...items, saved]
            );
            if (sourceKey) {
              this.collectFormField(sourceKey, saved.code);
            }
            if (this.config?.key === 'productServiceMaster' && !parentBeforeSave) {
              this.hsnSacCode.set(saved.code);
              this.hsnSacDescription.set(saved.description || description);
              this.gstRate.set(saved.gst_rate ?? gstRate);
              this.collectFormField('hsnSacCode', saved.code);
              this.collectFormField('gstRate', saved.gst_rate ?? gstRate);
            }
            if (parentBeforeSave === 'Business Segment') {
              const cur: string[] = Array.isArray(this.formValues()['segmentHsnCodes']) ? this.formValues()['segmentHsnCodes'] : [];
              if (!cur.includes(saved.code)) this.collectFormField('segmentHsnCodes', [...cur, saved.code]);
            }
            this.completeQuickGlobalMasterSave(saved, 'hsnSacMapping', () => {
              this.restoreParentModal();
              this.loadLookupOptions();
            });
          } else {
            this.quickAddError.set(res.message || 'Failed to save HSN/SAC code.');
          }
        },
        error: (err: any) => {
          this.isSavingQuickAdd.set(false);
          this.quickAddError.set(this.apiErrorMessage(err, 'Failed to save HSN/SAC code.'));
        }
      });
  }

  // Manufacturer has no backing master table today — it is a free-text label
  // stored directly on the Brand record (see buildPayload's brandMaster case
  // and sp_upsert_brand's `manufacturer` column). So this quick-add has
  // nothing to persist to on its own: it records the typed name into the
  // shared suggestion pool (manufacturerOptionList, the same list Brand
  // Master's own Manufacturer field now reads from) and writes it back into
  // whichever field opened the popup, mirroring how the other name-only
  // quick-adds behave.
  saveQuickManufacturer(): void {
    const name = this.quickAddName().trim();
    if (!name) { this.quickAddError.set('Manufacturer name is required.'); return; }

    if (!this.manufacturerOptionList().some(o => this.optionEquals(o, name))) {
      this.manufacturerOptionList.update(opts => [...opts, name]);
    }
    const sourceKey = this.addMasterSourceFieldKey();
    if (sourceKey) {
      this.collectFormField(sourceKey, name);
    } else if (this.config?.key === 'brandMaster') {
      this.collectFormField('manufacturer', name);
    }
    this.restoreParentModal();
  }

  saveQuickProductType(): void {
    const name = this.quickAddName().trim();
    if (!name) { this.quickAddError.set('Product Nature name is required.'); return; }
    this.isSavingQuickAdd.set(true);
    this.quickAddError.set('');
    const payload: Record<string, any> = {
      typeName: name,
      typeCode: this.quickAddCode().trim() || this.generateCodeFromName(name),
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

    // Same name as an existing attribute — the duplicate-name banner already
    // told the user this. Treat Save as "add these values to it" instead of
    // sending a fresh insert the backend will reject on the name-uniqueness
    // check (that used to fail here with no way to actually add the values).
    const existingAttribute = this.findAttributeBySelection(name);
    if (existingAttribute) {
      const merged = this.mergedAttributeValuesPayload(existingAttribute, rawValues);
      if (!merged) {
        this.quickAddError.set(`"${existingAttribute.attribute_name}" already has all of those values.`);
        return;
      }
      this.isSavingQuickAdd.set(true);
      this.quickAddError.set('');
      this.inventoryConfigService.saveAttribute(merged.payload, existingAttribute.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res: ApiResponse<any>) => {
          this.isSavingQuickAdd.set(false);
          if (res.success && res.data) {
            const saved = res.data as AttributeItem;
            const replace = (items: AttributeItem[]) =>
              items.some(item => item.id === saved.id) ? items.map(item => item.id === saved.id ? saved : item) : [...items, saved];
            this.loadedAttributeObjects.update(replace);
            this.allAttributeObjects.update(replace);
            if (!this.attributeOptionList().includes(saved.attribute_name)) {
              this.attributeOptionList.update(opts => [...opts, saved.attribute_name]);
            }
            const sourceKey = this.addMasterSourceFieldKey();
            if (sourceKey) this.collectFormField(sourceKey, saved.attribute_name);
            this.restoreParentModal();
          } else {
            this.quickAddError.set(res.message || 'Failed to update attribute.');
          }
        },
        error: (err: any) => {
          this.isSavingQuickAdd.set(false);
          this.quickAddError.set(this.apiErrorMessage(err, 'Failed to update attribute.'));
        }
      });
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

  saveQuickContact(): void {
    const name = this.quickAddName().trim();
    if (!name) { this.quickAddError.set('Contact name is required.'); return; }
    if (this.isSavingQuickAdd()) return;
    const v = this.formValues();
    this.isSavingQuickAdd.set(true);
    this.quickAddError.set('');
    this.inventoryConfigService.saveContact({
      contact_type: v['quickContactType'] || 'Individual',
      name,
      mobile: v['quickContactMobile'] || null,
      email: v['quickContactEmail'] || null,
      gstin: v['quickContactGstin'] || null,
      pan: v['quickContactPan'] || null,
      address: v['quickContactAddress'] || null,
      status: 'active'
    }, null).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<any>) => {
        this.isSavingQuickAdd.set(false);
        if (res.success && res.data) {
          const saved = res.data;
          this.loadedContactObjects.update(list => [...list, saved]);
          const contactOption: GlobalContactOption = {
            id: saved.id,
            name: saved.name,
            type: saved.contact_type === 'Company' ? 'Company' : 'Individual',
            mobile: saved.mobile || '',
            email: saved.email || '',
            gstin: saved.gstin || '',
            pan: saved.pan || '',
            address: saved.address || '',
            source: 'inv_contacts'
          };
          if (this.isPartyMaster()) {
            this.selectPartyContact(contactOption);
          }
          // Contact Person was opened as a nested quick-add from within the
          // "Vendor"/"Customer" quick-add (opened from any transaction
          // screen's "+" button) — feed the new contact back into that
          // vendor/customer form instead of a party master.
          const feedIntoQuickVendor = this.quickAddParentMaster() === 'Vendor';
          const feedIntoQuickCustomer = this.quickAddParentMaster() === 'Customer';
          this.restoreParentModal();
          if (feedIntoQuickVendor) {
            this.selectQuickVendorContact(contactOption);
          } else if (feedIntoQuickCustomer) {
            this.selectQuickCustomerContact(contactOption);
          }
        } else {
          this.quickAddError.set(res.message || 'Failed to save contact.');
        }
      },
      error: (err: any) => {
        this.isSavingQuickAdd.set(false);
        this.quickAddError.set(this.apiErrorMessage(err, 'Failed to save contact.'));
      }
    });
  }

  saveQuickVendor(): void {
    const name = this.quickAddName().trim();
    if (!name) { this.quickAddError.set('Vendor name is required.'); return; }
    if (this.isSavingQuickAdd()) return;
    const v = this.formValues();
    const code = this.quickAddCode().trim() || this.generateCodeFromName(name) || null;
    const linkedContact = this.quickVendorLinkedContact();
    this.isSavingQuickAdd.set(true);
    this.quickAddError.set('');
    this.saveVendorWithContactWriteback({
      segment_id: this.selectedSegmentId(),
      segment_name: String(v['segment'] || this.selectedSegment() || '').trim() || null,
      vendor_code: code,
      vendor_name: name,
      vendor_type: v['quickVendorType'] || 'Company',
      gstin: v['quickVendorGstin'] || null,
      pan: v['quickVendorPan'] || null,
      mobile: v['quickVendorMobile'] || null,
      email: v['quickVendorEmail'] || null,
      address: v['quickVendorAddress'] || null,
      credit_limit: Number(v['quickVendorCreditLimit']) || 0,
      status: v['quickVendorStatus'] === 'Inactive' ? 'inactive' : 'active',
      contact_id: linkedContact?.id ?? null,
      contact_source: linkedContact?.source ?? null
    }, null).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<any>) => {
        this.isSavingQuickAdd.set(false);
        if (res.success && res.data) {
          const saved = res.data;
          const savedName = saved.vendor_name || name;
          this.loadedVendorObjects.update(list => [...list, saved]);
          if (!this.vendorOptionList().includes(savedName)) {
            this.vendorOptionList.update(opts => [...opts, savedName]);
          }
          const sourceKey = this.addMasterSourceFieldKey();
          if (sourceKey) this.collectFormField(sourceKey, savedName);
          this.quickVendorLinkedContact.set(null);
          this.restoreParentModal();
        } else {
          this.quickAddError.set(res.message || 'Failed to save vendor.');
        }
      },
      error: (err: any) => {
        this.isSavingQuickAdd.set(false);
        this.quickAddError.set(this.apiErrorMessage(err, 'Failed to save vendor.'));
      }
    });
  }

  saveQuickCustomer(): void {
    const name = this.quickAddName().trim();
    if (!name) { this.quickAddError.set('Customer name is required.'); return; }
    if (this.isSavingQuickAdd()) return;
    const v = this.formValues();
    const code = this.quickAddCode().trim() || this.generateCodeFromName(name) || null;
    const linkedContact = this.quickCustomerLinkedContact();
    this.isSavingQuickAdd.set(true);
    this.quickAddError.set('');
    this.saveCustomerWithContactWriteback({
      segment_id: this.selectedSegmentId(),
      segment_name: String(v['segment'] || this.selectedSegment() || '').trim() || null,
      customer_code: code,
      customer_name: name,
      customer_type: v['quickCustomerType'] || 'Company',
      gstin: v['quickCustomerGstin'] || null,
      pan: v['quickCustomerPan'] || null,
      mobile: v['quickCustomerMobile'] || null,
      email: v['quickCustomerEmail'] || null,
      address: v['quickCustomerAddress'] || null,
      credit_limit: Number(v['quickCustomerCreditLimit']) || 0,
      status: v['quickCustomerStatus'] === 'Inactive' ? 'inactive' : 'active',
      contact_id: linkedContact?.id ?? null,
      contact_source: linkedContact?.source ?? null
    }, null).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<any>) => {
        this.isSavingQuickAdd.set(false);
        if (res.success && res.data) {
          const saved = res.data;
          const savedName = saved.customer_name || name;
          this.loadedCustomerObjects.update(list => [...list, saved]);
          if (!this.customerOptionList().includes(savedName)) {
            this.customerOptionList.update(opts => [...opts, savedName]);
          }
          const sourceKey = this.addMasterSourceFieldKey();
          if (sourceKey) this.collectFormField(sourceKey, savedName);
          this.quickCustomerLinkedContact.set(null);
          this.restoreParentModal();
        } else {
          this.quickAddError.set(res.message || 'Failed to save customer.');
        }
      },
      error: (err: any) => {
        this.isSavingQuickAdd.set(false);
        this.quickAddError.set(this.apiErrorMessage(err, 'Failed to save customer.'));
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
                attributes: [],
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
    const categoryName = String(v['quickApplicableCategory'] || '').trim() || null;
    // sp_upsert_serial_policy links the category by id only — category_name is
    // read-only (used on the way out to join the display label back), so the
    // auto-filled category from context has to be resolved to an id here or
    // it silently never links, same fix as the main Serial Number Policy screen.
    const categoryId = categoryName
      ? this.loadedCategoryObjects().find(item => this.optionEquals(item.category_name, categoryName))?.id ?? null
      : null;
    this.isSavingQuickAdd.set(true);
    this.quickAddError.set('');
    this.inventoryConfigService.saveSerialPolicy({
      segment_id: this.selectedSegmentId(),
      policy_code: code,
      policy_name: name,
      category_id: categoryId,
      category_name: categoryName,
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
    this.collectFormField('gstin', contact?.gstin || '');
    this.collectFormField('pan', contact?.pan || '');
    this.collectFormField('mobile', contact?.mobile || '');
    this.collectFormField('email', contact?.email || '');
    this.collectFormField('address', contact?.address || '');
    if (this.isPartyMaster()) {
      this.collectFormField('contactId', contact?.id ?? null);
      this.collectFormField('contactSource', contact?.source ?? null);
      this.maybeAutoCode('name', contact?.name || '');
    }
  }

  selectPartyContactPerson(contact: GlobalContactOption | null): void {
    this.selectedPartyContactPerson.set(contact);
  }

  // Same auto-fill as selectPartyContact(), but targets the standalone
  // "Vendor" quick-add modal's own fields (used when that modal is opened
  // from any transaction screen) instead of a Vendor Master top-level form.
  selectQuickVendorContact(contact: GlobalContactOption | null): void {
    this.quickVendorLinkedContact.set(contact);
    this.quickAddName.set(contact?.name || '');
    if (!this._quickAddCodeManuallySet) {
      this.quickAddCode.set(contact?.name ? this.generateCodeFromName(contact.name) : '');
    }
    this.formValues.update(fv => ({
      ...fv,
      quickVendorMobile: contact?.mobile || '',
      quickVendorEmail: contact?.email || '',
      quickVendorGstin: contact?.gstin || '',
      quickVendorPan: contact?.pan || '',
      quickVendorAddress: contact?.address || ''
    }));
  }

  // Same auto-fill as selectQuickVendorContact(), but targets the "Customer"
  // quick-add modal's own fields (used when that modal is opened from any
  // transaction screen) instead of a Customer Master top-level form.
  selectQuickCustomerContact(contact: GlobalContactOption | null): void {
    this.quickCustomerLinkedContact.set(contact);
    this.quickAddName.set(contact?.name || '');
    if (!this._quickAddCodeManuallySet) {
      this.quickAddCode.set(contact?.name ? this.generateCodeFromName(contact.name) : '');
    }
    this.formValues.update(fv => ({
      ...fv,
      quickCustomerMobile: contact?.mobile || '',
      quickCustomerEmail: contact?.email || '',
      quickCustomerGstin: contact?.gstin || '',
      quickCustomerPan: contact?.pan || '',
      quickCustomerAddress: contact?.address || ''
    }));
  }

  isPartyMaster(): boolean {
    return this.config?.key === 'vendorMaster' || this.config?.key === 'customerMaster';
  }

  // After a Vendor/Customer save succeeds, push any edits made to the
  // autofilled contact fields (name/mobile/email/gstin/pan/address) back
  // onto the linked contact record — global.tbl_mst_contact for a
  // 'global_contact' source (067_global_contact_writeback.sql), or
  // inventory.inv_contacts (already fully editable) for 'inv_contacts'.
  // Best-effort: a write-back failure never blocks or fails the vendor/
  // customer save itself.
  private writeBackLinkedContact(payload: Record<string, any>): Observable<unknown> {
    const contactId = Number(payload['contact_id']);
    const contactSource = payload['contact_source'];
    if (!Number.isFinite(contactId) || contactId <= 0 || !contactSource) return of(null);
    const name = payload['vendor_name'] || payload['customer_name'] || '';
    if (contactSource === 'global_contact') {
      return this.inventoryConfigService.updateGlobalContact({
        name,
        mobile: payload['mobile'] || null,
        email: payload['email'] || null,
        pan: payload['pan'] || null,
        gstin: payload['gstin'] || null,
        address: payload['address'] || null,
        // Keyed off the payload shape (not config.key) so this stays correct
        // when the vendor save comes through the quick-add modal opened from
        // a non-Vendor-Master screen, e.g. GRN/Purchase Order/etc.
        mark_supplier: !!payload['vendor_name']
      }, contactId).pipe(catchError(() => of(null)));
    }
    if (contactSource === 'inv_contacts') {
      return this.inventoryConfigService.saveContact({
        contact_type: 'Company',
        name,
        mobile: payload['mobile'] || null,
        email: payload['email'] || null,
        gstin: payload['gstin'] || null,
        pan: payload['pan'] || null,
        address: payload['address'] || null
      }, contactId).pipe(catchError(() => of(null)));
    }
    return of(null);
  }

  private saveVendorWithContactWriteback(payload: Record<string, any>, id?: number | null): Observable<ApiResponse<any>> {
    return this.inventoryConfigService.saveVendor(payload, id).pipe(
      concatMap(res => res.success ? this.writeBackLinkedContact(payload).pipe(map(() => res)) : of(res))
    );
  }

  private saveCustomerWithContactWriteback(payload: Record<string, any>, id?: number | null): Observable<ApiResponse<any>> {
    return this.inventoryConfigService.saveCustomer(payload, id).pipe(
      concatMap(res => res.success ? this.writeBackLinkedContact(payload).pipe(map(() => res)) : of(res))
    );
  }

  partyLabel(): string {
    return this.config?.key === 'vendorMaster' ? 'Party / Vendor' : 'Party / Customer';
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
    const tableId = this.activeGridSearch();
    if (tableId) this.setGridPage(tableId, 1);
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

  private isGridDateColumn(column: string): boolean {
    const label = String(column || '').trim().toLowerCase();
    return label.includes('date')
      || label.includes('expiry')
      || label === 'valid till'
      || label === 'required by'
      || label === 'effective from'
      || label === 'effective to';
  }

  private formatGridDateRows(rows: string[][]): string[][] {
    const columns = this.config?.columns || [];
    if (!columns.some(column => this.isGridDateColumn(column))) return rows;
    return rows.map(row => row.map((cell, index) =>
      this.isGridDateColumn(columns[index]) ? this.gridDateDisplay(cell) : cell
    ));
  }

  gridRows(tableId: string, rows: string[][]): string[][] {
    const rawSourceRows = tableId === 'records' && this.isApiWired() ? this.liveRows() : rows;
    const sourceRows = this.formatGridDateRows(rawSourceRows);
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

  // ── Pagination (search/sort-aware, per grid tableId) ──────────────────────

  gridPageSize(tableId: string): number {
    return this.gridPageSizeState()[tableId] || 25;
  }

  setGridPageSize(tableId: string, size: number): void {
    this.gridPageSizeState.update(s => ({ ...s, [tableId]: size || 25 }));
    this.setGridPage(tableId, 1);
  }

  gridPage(tableId: string): number {
    return this.gridPageState()[tableId] || 1;
  }

  setGridPage(tableId: string, page: number): void {
    this.gridPageState.update(s => ({ ...s, [tableId]: Math.max(1, page) }));
  }

  gridTotalPages(tableId: string, rows: string[][]): number {
    const total = this.gridRows(tableId, rows).length;
    return Math.max(1, Math.ceil(total / this.gridPageSize(tableId)));
  }

  pagedRows(tableId: string, rows: string[][]): string[][] {
    const all = this.gridRows(tableId, rows);
    const size = this.gridPageSize(tableId);
    const totalPages = Math.max(1, Math.ceil(all.length / size));
    const page = Math.min(this.gridPage(tableId), totalPages);
    const start = (page - 1) * size;
    return all.slice(start, start + size);
  }

  gridPageRangeLabel(tableId: string, rows: string[][]): string {
    const total = this.gridRows(tableId, rows).length;
    if (!total) return '0 of 0';
    const size = this.gridPageSize(tableId);
    const totalPages = Math.max(1, Math.ceil(total / size));
    const page = Math.min(this.gridPage(tableId), totalPages);
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return `${start}-${end} of ${total}`;
  }

  canGoPrevGridPage(tableId: string): boolean {
    return this.gridPage(tableId) > 1;
  }

  canGoNextGridPage(tableId: string, rows: string[][]): boolean {
    return this.gridPage(tableId) < this.gridTotalPages(tableId, rows);
  }

  goPrevGridPage(tableId: string): void {
    this.setGridPage(tableId, this.gridPage(tableId) - 1);
  }

  goNextGridPage(tableId: string, rows: string[][]): void {
    this.setGridPage(tableId, this.gridPage(tableId) + 1);
  }

  runGridToolbarAction(tableId: string, action: 'print' | 'pdf' | 'excel' | 'mail' | 'whatsapp'): void {
    if (action === 'whatsapp') {
      this.saveError.set('Secure WhatsApp sending is not configured yet. Use Print, PDF, Excel, or Mail for now.');
      setTimeout(() => this.saveError.set(''), 3500);
      return;
    }

    const docStyledKeys = ['purchaseInvoice', 'salesInvoice', 'deliveryChallan'];
    if ((action === 'print' || action === 'pdf' || action === 'mail') && tableId === 'records'
        && docStyledKeys.includes(this.config?.key || '') && !this.expandedGrnId()) {
      this.saveMsg.set(`Expand a ${this.config?.title || 'record'} row first, then use Print, PDF, or Mail for the document format.`);
      setTimeout(() => this.saveMsg.set(''), 3500);
      return;
    }

    const payload = this.gridExportPayload(tableId);
    if (!payload.rows.length) {
      this.saveMsg.set('No rows available for this action.');
      setTimeout(() => this.saveMsg.set(''), 2500);
      return;
    }

    if (action === 'mail') {
      this.mailGridPayload(payload);
      return;
    }

    if (action === 'print' || action === 'pdf') {
      this.printGridPayload(payload, action === 'pdf');
      return;
    }

    this.downloadGridCsv(payload);
  }

  private gridToolbarActionFromTitle(title: string): 'print' | 'pdf' | 'excel' | 'mail' | 'whatsapp' | '' {
    switch (String(title || '').trim().toLowerCase()) {
      case 'print':
        return 'print';
      case 'export pdf':
        return 'pdf';
      case 'export excel':
        return 'excel';
      case 'mail':
        return 'mail';
      case 'whatsapp':
        return 'whatsapp';
      default:
        return '';
    }
  }

  private gridExportPayload(tableId: string): GridExportPayload {
    const selected = tableId === 'records' ? this.selectedExpandedDocumentExportPayload() : null;
    if (selected) return selected;

    const columns = tableId === 'records'
      ? [...(this.config?.columns || [])]
      : [...(this.config?.lineColumns || this.config?.columns || [])];
    const source = tableId === 'records' ? this.liveRows() : this.currentEntryRows();
    const rows = this.gridRows(tableId, source)
      .map(row => row.slice(0, columns.length).map(cell => String(cell ?? '')));
    return {
      title: `${this.config?.title || 'Inventory'} - ${tableId === 'records' ? 'Saved Records' : 'Grid'}`,
      fields: [],
      columns,
      rows
    };
  }

  private selectedExpandedDocumentExportPayload(): GridExportPayload | null {
    const key = this.config?.key || '';
    if (key !== 'goodsReceipt' && key !== 'purchaseInvoice' && key !== 'debitNote' && key !== 'creditNote'
        && key !== 'salesInvoice' && key !== 'deliveryChallan') return null;

    const expandedId = this.expandedGrnId();
    if (!expandedId) return null;

    const record = this.segmentFilteredRecords(this.savedRecordObjects())
      .find(item => Number(item.id) === Number(expandedId));
    if (!record) return null;

    if (key === 'debitNote' || key === 'creditNote') {
      const isDebit = key === 'debitNote';
      const docNo = String(isDebit
        ? (record.debit_note_number || record.debitNoteNumber || '')
        : (record.credit_note_number || record.creditNoteNumber || ''));
      const row = this.liveRows().find(candidate => candidate[0] === docNo) || [docNo];
      const columnDefs = this.grnExpandedColumns(row);
      const columns = columnDefs.map(column => column.label);
      const rows = this.grnExpandedItems(row)
        .map((item, index) => columnDefs.map(column => this.grnExpandedCell(item, column, index) || ''));
      const fields: Array<[string, string]> = isDebit
        ? [
            ['Debit Note No', docNo],
            ['Debit Note Date', this.gridDateDisplay(String(record.debit_note_date || record.debitNoteDate || ''))],
            ['Vendor', String(record.vendor_name || record.vendorName || '')],
            ['Reference', String(record.purchase_return_number || record.purchaseReturnNumber || record.purchase_invoice_number || record.purchaseInvoiceNumber || 'Direct')],
            ['Reason', String(record.reason || '')],
            ['Status', toInventoryTitleCase(String(record.status || 'draft'))],
            ['Return Amount', this.formatCurrency(record.subtotal ?? record.subTotal ?? 0)],
            ['GST Amount', this.formatCurrency(record.tax_amount ?? record.taxAmount ?? 0)],
            ['Total Amount', this.formatCurrency(record.total_amount ?? record.totalAmount ?? 0)]
          ]
        : [
            ['Credit Note No', docNo],
            ['Credit Note Date', this.gridDateDisplay(String(record.credit_note_date || record.creditNoteDate || ''))],
            ['Customer', String(record.customer_name || record.customerName || '')],
            ['Reference', String(record.sales_return_number || record.salesReturnNumber || record.sales_invoice_number || record.salesInvoiceNumber || 'Direct')],
            ['Reason', String(record.reason || '')],
            ['Status', toInventoryTitleCase(String(record.status || 'draft'))],
            ['Return Amount', this.formatCurrency(record.subtotal ?? record.subTotal ?? 0)],
            ['GST Amount', this.formatCurrency(record.tax_amount ?? record.taxAmount ?? 0)],
            ['Total Amount', this.formatCurrency(record.total_amount ?? record.totalAmount ?? 0)]
          ];

      return { title: `${this.config?.title || 'Inventory'} - ${docNo || 'Selected Record'}`, fields, columns, rows };
    }

    const docNo = key === 'purchaseInvoice'
      ? String(record.pi_number || record.piNumber || '')
      : key === 'salesInvoice'
        ? String(record.doc_number || record.docNumber || '')
        : key === 'deliveryChallan'
          ? String(record.dc_number || record.dcNumber || '')
          : String(record.grn_number || record.grnNumber || '');
    const row = this.liveRows().find(candidate => candidate[0] === docNo) || [docNo];
    const columnDefs = this.grnExpandedColumns(row);
    const columns = columnDefs.map(column => column.label);
    const rows = this.grnExpandedItems(row)
      .map((item, index) => columnDefs.map(column => this.grnExpandedCell(item, column, index) || ''));

    if (key === 'purchaseInvoice') {
      return this.purchaseInvoiceDocumentExportPayload(record, docNo, row, columns, rows);
    }

    if (key === 'salesInvoice') {
      return this.salesInvoiceDocumentExportPayload(record, docNo, row, columns, rows);
    }

    if (key === 'deliveryChallan') {
      return this.deliveryChallanDocumentExportPayload(record, docNo, row, columns, rows);
    }

    const fields: Array<[string, string]> = [
          ['GRN No', docNo],
          ['GRN Date', String(record.grn_date || record.grnDate || '')],
          ['Vendor', String(record.vendor_name || record.vendorName || '')],
          ['PO Reference', String(record.po_number || record.poNumber || record.rfq_number || record.rfqNumber || 'Direct')],
          ['Warehouse', String(record.warehouse_name || record.warehouseName || '')],
          ['Vendor Invoice No', String(record.vendor_invoice_no || record.vendorInvoiceNo || '')],
          ['Status', toInventoryTitleCase(String(record.status || 'draft'))],
          ['Total', `Rs. ${Number(record.total_amount ?? record.totalAmount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`]
        ];

    return { title: `${this.config?.title || 'Inventory'} - ${docNo || 'Selected Record'}`, fields, columns, rows };
  }

  private moneyValue(value: any): string {
    return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private vendorForRecord(record: any): VendorItem | null {
    const id = this.optionalNumber(record?.vendor_id ?? record?.vendorId);
    return this.loadedVendorObjects().find(item => Number(item.id) === Number(id))
      || this.findVendorBySelection(record?.vendor_name || record?.vendorName)
      || null;
  }

  private customerForRecord(record: any): CustomerItem | null {
    const id = this.optionalNumber(record?.customer_id ?? record?.customerId);
    return this.loadedCustomerObjects().find(item => Number(item.id) === Number(id))
      || this.findCustomerBySelection(record?.customer_name || record?.customerName)
      || null;
  }

  private purchaseInvoiceItemName(item: any): string {
    return [
      this.grnExpandedValue(item, 'product_name', 'productName'),
      this.grnExpandedValue(item, 'variant_name', 'variantName'),
      this.grnExpandedValue(item, 'attribute_value', 'attributeValue')
    ].filter(Boolean).join(' - ');
  }

  private purchaseInvoiceItemHsn(item: any): string {
    const productId = this.optionalNumber(item?.product_id ?? item?.productId);
    const productName = this.grnExpandedValue(item, 'product_name', 'productName');
    const product = this.loadedProductObjects().find(p =>
      (productId !== null && Number(p.id) === productId)
      || (!!productName && this.optionEquals(p.product_name, productName))
    );
    return String((product as any)?.hsn_sac_code || (product as any)?.hsnSacCode || '').trim();
  }

  // Doc-type-agnostic qty*rate/discount/GST rollup shared by every document-
  // styled print/PDF export (PI, SI). Items only need qty/rate/discount_pct/
  // gst_rate — DC has no pricing so it doesn't call this.
  private documentFinancials(items: any[]): {
    gross: number; discount: number; taxable: number; tax: number;
  } {
    return (items || []).reduce((acc: { gross: number; discount: number; taxable: number; tax: number }, item: any) => {
      const qty = Number(item?.qty ?? item?.accepted_qty ?? item?.acceptedQty ?? 0) || 0;
      const rate = Number(item?.rate ?? 0) || 0;
      const discPct = Number(item?.discount_pct ?? item?.discountPct ?? 0) || 0;
      const gstPct = Number(item?.gst_rate ?? item?.gstRate ?? 0) || 0;
      const lineGross = qty * rate;
      const lineDiscount = lineGross * discPct / 100;
      const computedTaxable = lineGross - lineDiscount;
      const savedTaxable = this.firstNumericValue(item, ['taxable_amount', 'taxableAmount']);
      const savedTax = this.firstNumericValue(item, ['tax_amount', 'taxAmount', 'gst_amount', 'gstAmount']);
      const lineTaxable = savedTaxable || computedTaxable;
      const lineTax = savedTax || this.transactionLineTaxBreakup(qty, rate, discPct, gstPct, undefined, this.itemGstIncluded(item) ?? false).taxAmount;
      acc.gross += lineGross;
      acc.discount += lineDiscount;
      acc.taxable += lineTaxable;
      acc.tax += lineTax;
      return acc;
    }, { gross: 0, discount: 0, taxable: 0, tax: 0 });
  }

  private purchaseInvoiceFinancials(record: any): {
    gross: number; discount: number; taxable: number; tax: number; cgst: number; sgst: number; igst: number; isInterstate: boolean; total: number; roundOff: number;
  } {
    const computed = this.documentFinancials(record?.items || []);
    const storedTaxable = Number(record?.subtotal ?? record?.subTotal ?? 0) || 0;
    const storedTax = Number(record?.tax_amount ?? record?.taxAmount ?? 0) || 0;
    const total = Number(record?.total_amount ?? record?.totalAmount ?? 0) || (computed.taxable + computed.tax);
    const taxable = computed.taxable || storedTaxable;
    const tax = computed.tax || storedTax;

    const vendor = this.vendorForRecord(record);
    const branch = this.ourBranchForRecord(record);
    const isInterstate = !!this.isInterstateTransaction(
      branch?.gstin, branch?.state,
      record?.vendor_gstin || record?.vendorGstin || vendor?.gstin, vendor?.state
    );

    return {
      gross: computed.gross || taxable,
      discount: computed.discount,
      taxable,
      tax,
      cgst: isInterstate ? 0 : tax / 2,
      sgst: isInterstate ? 0 : tax / 2,
      igst: isInterstate ? tax : 0,
      isInterstate,
      total,
      roundOff: total - (taxable + tax)
    };
  }

  private salesInvoiceFinancials(record: any): {
    gross: number; discount: number; taxable: number; tax: number; cgst: number; sgst: number; igst: number; isInterstate: boolean; total: number; roundOff: number;
  } {
    const computed = this.documentFinancials(record?.items || []);
    const total = computed.taxable + computed.tax;

    const customer = this.customerForRecord(record);
    const branch = this.ourBranchForRecord(record);
    const isInterstate = !!this.isInterstateTransaction(
      branch?.gstin, branch?.state,
      record?.customer_gstin || record?.customerGstin || customer?.gstin, customer?.state,
      record?.place_of_supply || record?.placeOfSupply || null
    );

    return {
      gross: computed.gross,
      discount: computed.discount,
      taxable: computed.taxable,
      tax: computed.tax,
      cgst: isInterstate ? 0 : computed.tax / 2,
      sgst: isInterstate ? 0 : computed.tax / 2,
      igst: isInterstate ? computed.tax : 0,
      isInterstate,
      total,
      roundOff: 0
    };
  }

  private purchaseInvoiceDocumentRows(record: any): string[][] {
    return (record?.items || []).map((item: any, index: number) => [
      String(index + 1),
      this.purchaseInvoiceItemName(item),
      this.purchaseInvoiceItemHsn(item),
      this.moneyValue(item?.qty ?? 0),
      this.grnExpandedValue(item, 'uom_name', 'uomName'),
      this.moneyValue(item?.rate ?? 0),
      this.moneyValue(item?.mrp ?? item?.Mrp ?? 0),
      this.moneyValue(item?.selling_price ?? item?.sellingPrice ?? 0),
      String(item?.discount_pct ?? item?.discountPct ?? 0),
      String(item?.gst_rate ?? item?.gstRate ?? 0),
      this.moneyValue(item?.amount ?? 0)
    ]);
  }

  private purchaseInvoiceDocumentExportPayload(
    record: any,
    docNo: string,
    _row: string[],
    fallbackColumns: string[],
    fallbackRows: string[][]
  ): GridExportPayload {
    const vendor = this.vendorForRecord(record);
    const vendorName = String(record.vendor_name || record.vendorName || vendor?.vendor_name || '');
    const vendorGstin = String(record.vendor_gstin || record.vendorGstin || vendor?.gstin || '');
    const branchName = String(record.branch_name || record.branchName || this.branchNameFromRecord(record) || '');
    const warehouseName = String(record.warehouse_name || record.warehouseName || '');
    const locationName = warehouseName || branchName;
    const columns = ['#', 'Product / Service', 'HSN', 'Qty', 'UOM', 'Rate (Rs.)', 'MRP', 'Selling Price', 'Disc %', 'GST %', 'Amount (Rs.)'];
    const rows = this.purchaseInvoiceDocumentRows(record);
    const exportColumns = rows.length ? columns : fallbackColumns;
    const exportRows = rows.length ? rows : fallbackRows;
    const totals = this.purchaseInvoiceFinancials(record);
    const fields: Array<[string, string]> = [
      ['PI No', docNo],
      ['PI Date', this.gridDateDisplay(String(record.pi_date || record.piDate || ''))],
      ['Vendor', vendorName],
      ['GSTIN', vendorGstin],
      ['Branch / Warehouse', locationName],
      ['GRN Reference', String(record.grn_number || record.grnNumber || 'Direct')],
      ['Vendor Invoice No', String(record.vendor_invoice_no || record.vendorInvoiceNo || '')],
      ['Vendor Invoice Date', this.gridDateDisplay(String(record.vendor_invoice_dt || record.vendorInvoiceDt || ''))],
      ['Payment Terms', String(record.payment_terms || record.paymentTerms || '')],
      ['Due Date', this.gridDateDisplay(String(record.due_date || record.dueDate || ''))],
      ['Status', toInventoryTitleCase(String(record.status || 'draft'))],
      ['Total', this.formatCurrency(totals.total)]
    ];
    const safe = (value: any) => this.escapeHtml(value);
    const summaryRows = [
      ['Sub total', this.moneyValue(totals.gross)],
      ['Discount', totals.discount ? `-${this.moneyValue(totals.discount)}` : this.moneyValue(0)],
      ['Taxable amount', this.moneyValue(totals.taxable)],
      ...(totals.isInterstate
        ? [['IGST', this.moneyValue(totals.igst)]]
        : [['CGST', this.moneyValue(totals.cgst)], ['SGST', this.moneyValue(totals.sgst)]]),
      ['Round off', this.moneyValue(totals.roundOff)]
    ];
    const documentHtml = `
      <section class="inventory-print-doc">
        <header class="print-doc-title">
          <div>
            <span>Purchase Invoice</span>
            <h1>${safe(docNo || 'Draft')}</h1>
          </div>
          <strong>${safe(toInventoryTitleCase(String(record.status || 'draft')))}</strong>
        </header>
        <div class="print-meta-grid">
          <div><strong>Invoice no.</strong><span>${safe(docNo)}</span></div>
          <div><strong>Invoice date</strong><span>${safe(this.gridDateDisplay(String(record.pi_date || record.piDate || '')))}</span></div>
          <div><strong>Due date</strong><span>${safe(this.gridDateDisplay(String(record.due_date || record.dueDate || '')))}</span></div>
          <div><strong>Payment terms</strong><span>${safe(record.payment_terms || record.paymentTerms || '-')}</span></div>
        </div>
        <div class="print-party-grid">
          <section>
            <h2>Vendor</h2>
            <label>Bill from</label>
            <p>${safe(vendorName || '-')}</p>
            <div class="print-party-inline">
              <div><label>GSTIN</label><p>${safe(vendorGstin || '-')}</p></div>
              <div><label>Phone</label><p>${safe(vendor?.mobile || vendor?.contact_mobile || '-')}</p></div>
            </div>
            <label>Email</label>
            <p>${safe(vendor?.email || vendor?.contact_email || '-')}</p>
            <label>Address</label>
            <p>${safe(vendor?.address || '-')}</p>
          </section>
          <section>
            <h2>Inventory</h2>
            <label>Branch / Warehouse</label>
            <p>${safe(locationName || '-')}</p>
            <label>GRN Reference</label>
            <p>${safe(record.grn_number || record.grnNumber || 'Direct')}</p>
            <label>Vendor invoice</label>
            <p>${safe(record.vendor_invoice_no || record.vendorInvoiceNo || '-')}</p>
          </section>
        </div>
        <section class="print-items">
          <h2>Products / Items</h2>
          <table>
            <thead><tr>${exportColumns.map(column => `<th>${safe(column)}</th>`).join('')}</tr></thead>
            <tbody>${exportRows.map(row => `<tr>${row.map(cell => `<td>${safe(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </section>
        <div class="print-bottom-grid">
          <section>
            <h2>Notes / Terms</h2>
            <p>${safe(record.remarks || 'Thank you for your business.')}</p>
          </section>
          <section class="print-summary">
            <h2>Summary</h2>
            ${summaryRows.map(([label, value]) => `<div><span>${safe(label)}</span><strong>${safe(value)}</strong></div>`).join('')}
            <div class="grand"><span>Grand total</span><strong>${safe(this.formatCurrency(totals.total))}</strong></div>
          </section>
        </div>
      </section>
    `;
    const mailBody = [
      `Purchase Invoice: ${docNo}`,
      '',
      ...fields.map(([label, value]) => `${label}: ${value}`),
      '',
      exportColumns.join(' | '),
      ...exportRows.map(row => row.join(' | ')),
      '',
      `Grand total: ${this.formatCurrency(totals.total)}`
    ].join('\n');
    return {
      title: `Purchase Invoice - ${docNo || 'Selected Record'}`,
      fields,
      columns: exportColumns,
      rows: exportRows,
      documentHtml,
      mailBody,
      fileName: `Purchase_Invoice_${docNo || 'Selected_Record'}`
    };
  }

  private salesInvoiceDocumentRows(record: any): string[][] {
    return (record?.items || []).map((item: any, index: number) => [
      String(index + 1),
      this.purchaseInvoiceItemName(item),
      this.purchaseInvoiceItemHsn(item),
      this.moneyValue(item?.qty ?? 0),
      this.grnExpandedValue(item, 'uom_name', 'uomName'),
      this.moneyValue(item?.rate ?? 0),
      this.moneyValue(item?.mrp ?? item?.Mrp ?? 0),
      this.moneyValue(item?.selling_price ?? item?.sellingPrice ?? 0),
      String(item?.discount_pct ?? item?.discountPct ?? 0),
      String(item?.gst_rate ?? item?.gstRate ?? 0),
      this.moneyValue(item?.amount ?? 0)
    ]);
  }

  private salesInvoiceDocumentExportPayload(
    record: any,
    docNo: string,
    _row: string[],
    fallbackColumns: string[],
    fallbackRows: string[][]
  ): GridExportPayload {
    const customer = this.customerForRecord(record);
    const customerName = String(record.customer_name || record.customerName || customer?.customer_name || '');
    const customerGstin = String(record.customer_gstin || record.customerGstin || customer?.gstin || '');
    const warehouseName = String(record.warehouse_name || record.warehouseName || '');
    const columns = ['#', 'Product / Service', 'HSN', 'Qty', 'UOM', 'Rate (Rs.)', 'MRP', 'Selling Price', 'Disc %', 'GST %', 'Amount (Rs.)'];
    const rows = this.salesInvoiceDocumentRows(record);
    const exportColumns = rows.length ? columns : fallbackColumns;
    const exportRows = rows.length ? rows : fallbackRows;
    const totals = this.salesInvoiceFinancials(record);
    const soReference = String(record.so_number || record.soNumber || record.reference_no || record.referenceNo || 'Direct');
    const fields: Array<[string, string]> = [
      ['Invoice No', docNo],
      ['Invoice Date', this.gridDateDisplay(String(record.doc_date || record.docDate || ''))],
      ['Due Date', this.gridDateDisplay(String(record.due_date || record.dueDate || ''))],
      ['Customer', customerName],
      ['GSTIN', customerGstin],
      ['Place of Supply', String(record.place_of_supply || record.placeOfSupply || '')],
      ['Warehouse', warehouseName],
      ['SO Reference', soReference],
      ['Payment Terms', String(record.payment_terms || record.paymentTerms || '')],
      ['Status', toInventoryTitleCase(String(record.status || 'draft'))],
      ['Total', this.formatCurrency(totals.total)]
    ];
    const safe = (value: any) => this.escapeHtml(value);
    const summaryRows = [
      ['Sub total', this.moneyValue(totals.gross)],
      ['Discount', totals.discount ? `-${this.moneyValue(totals.discount)}` : this.moneyValue(0)],
      ['Taxable amount', this.moneyValue(totals.taxable)],
      ...(totals.isInterstate
        ? [['IGST', this.moneyValue(totals.igst)]]
        : [['CGST', this.moneyValue(totals.cgst)], ['SGST', this.moneyValue(totals.sgst)]])
    ];
    const documentHtml = `
      <section class="inventory-print-doc">
        <header class="print-doc-title">
          <div>
            <span>Sales Invoice</span>
            <h1>${safe(docNo || 'Draft')}</h1>
          </div>
          <strong>${safe(toInventoryTitleCase(String(record.status || 'draft')))}</strong>
        </header>
        <div class="print-meta-grid">
          <div><strong>Invoice no.</strong><span>${safe(docNo)}</span></div>
          <div><strong>Invoice date</strong><span>${safe(this.gridDateDisplay(String(record.doc_date || record.docDate || '')))}</span></div>
          <div><strong>Due date</strong><span>${safe(this.gridDateDisplay(String(record.due_date || record.dueDate || '')))}</span></div>
          <div><strong>SO reference</strong><span>${safe(soReference)}</span></div>
        </div>
        <div class="print-party-grid">
          <section>
            <h2>Customer</h2>
            <label>Bill to</label>
            <p>${safe(customerName || '-')}</p>
            <div class="print-party-inline">
              <div><label>GSTIN</label><p>${safe(customerGstin || '-')}</p></div>
              <div><label>Phone</label><p>${safe(customer?.mobile || '-')}</p></div>
            </div>
            <label>Email</label>
            <p>${safe(customer?.email || '-')}</p>
            <label>Address</label>
            <p>${safe(customer?.address || '-')}</p>
          </section>
          <section>
            <h2>Dispatch</h2>
            <label>Warehouse</label>
            <p>${safe(warehouseName || '-')}</p>
            <label>Place of Supply</label>
            <p>${safe(record.place_of_supply || record.placeOfSupply || '-')}</p>
            <label>Vehicle No</label>
            <p>${safe(record.vehicle_no || record.vehicleNo || '-')}</p>
          </section>
        </div>
        <section class="print-items">
          <h2>Products / Items</h2>
          <table>
            <thead><tr>${exportColumns.map(column => `<th>${safe(column)}</th>`).join('')}</tr></thead>
            <tbody>${exportRows.map(row => `<tr>${row.map(cell => `<td>${safe(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </section>
        <div class="print-bottom-grid">
          <section>
            <h2>Notes / Terms</h2>
            <p>${safe(record.customer_notes || record.customerNotes || 'Thank you for your business.')}</p>
          </section>
          <section class="print-summary">
            <h2>Summary</h2>
            ${summaryRows.map(([label, value]) => `<div><span>${safe(label)}</span><strong>${safe(value)}</strong></div>`).join('')}
            <div class="grand"><span>Grand total</span><strong>${safe(this.formatCurrency(totals.total))}</strong></div>
          </section>
        </div>
      </section>
    `;
    const mailBody = [
      `Sales Invoice: ${docNo}`,
      '',
      ...fields.map(([label, value]) => `${label}: ${value}`),
      '',
      exportColumns.join(' | '),
      ...exportRows.map(row => row.join(' | ')),
      '',
      `Grand total: ${this.formatCurrency(totals.total)}`
    ].join('\n');
    return {
      title: `Sales Invoice - ${docNo || 'Selected Record'}`,
      fields,
      columns: exportColumns,
      rows: exportRows,
      documentHtml,
      mailBody,
      fileName: `Sales_Invoice_${docNo || 'Selected_Record'}`
    };
  }

  private deliveryChallanDocumentRows(record: any): string[][] {
    return (record?.items || []).map((item: any, index: number) => [
      String(index + 1),
      this.purchaseInvoiceItemName(item),
      this.grnExpandedValue(item, 'variant_name', 'variantName'),
      this.grnExpandedValue(item, 'attribute_value', 'attributeValue'),
      this.moneyValue(item?.so_qty ?? item?.soQty ?? 0),
      this.moneyValue(item?.dispatch_qty ?? item?.dispatchQty ?? 0),
      this.grnExpandedValue(item, 'uom_name', 'uomName')
    ]);
  }

  // DC is a price-free stock-movement document (rule: DC posting never moves
  // stock either — see fn_post_delivery_challan_dispatch), so this document
  // omits the print-summary money block PI/SI show and reports item/qty
  // counts in its place.
  private deliveryChallanDocumentExportPayload(
    record: any,
    docNo: string,
    _row: string[],
    fallbackColumns: string[],
    fallbackRows: string[][]
  ): GridExportPayload {
    const customer = this.customerForRecord(record);
    const customerName = String(record.customer_name || record.customerName || customer?.customer_name || '');
    const columns = ['#', 'Product / Service', 'Variant', 'Attribute', 'SO Qty', 'Dispatch Qty', 'UOM'];
    const rows = this.deliveryChallanDocumentRows(record);
    const exportColumns = rows.length ? columns : fallbackColumns;
    const exportRows = rows.length ? rows : fallbackRows;
    const items = record?.items || [];
    const totalDispatchQty = items.reduce((sum: number, item: any) => sum + (Number(item?.dispatch_qty ?? item?.dispatchQty ?? 0) || 0), 0);
    const soReference = String(record.so_number || record.soNumber || 'Direct Dispatch');
    const siReference = String(record.si_number || record.siNumber || '-');
    const fields: Array<[string, string]> = [
      ['DC No', docNo],
      ['DC Date', this.gridDateDisplay(String(record.dc_date || record.dcDate || ''))],
      ['Customer', customerName],
      ['Vehicle', String(record.vehicle || '')],
      ['Transporter', String(record.transporter || '')],
      ['LR No', String(record.lr_no || record.lrNo || '')],
      ['SO Reference', soReference],
      ['SI Reference', siReference],
      ['Status', toInventoryTitleCase(String(record.display_status || record.displayStatus || record.status || 'draft'))]
    ];
    const safe = (value: any) => this.escapeHtml(value);
    const documentHtml = `
      <section class="inventory-print-doc">
        <header class="print-doc-title">
          <div>
            <span>Delivery Challan</span>
            <h1>${safe(docNo || 'Draft')}</h1>
          </div>
          <strong>${safe(toInventoryTitleCase(String(record.display_status || record.displayStatus || record.status || 'draft')))}</strong>
        </header>
        <div class="print-meta-grid">
          <div><strong>DC no.</strong><span>${safe(docNo)}</span></div>
          <div><strong>DC date</strong><span>${safe(this.gridDateDisplay(String(record.dc_date || record.dcDate || '')))}</span></div>
          <div><strong>SO reference</strong><span>${safe(soReference)}</span></div>
          <div><strong>SI reference</strong><span>${safe(siReference)}</span></div>
        </div>
        <div class="print-party-grid">
          <section>
            <h2>Customer</h2>
            <label>Deliver to</label>
            <p>${safe(customerName || '-')}</p>
            <label>Delivery Address</label>
            <p>${safe(record.delivery_address || record.deliveryAddress || '-')}</p>
          </section>
          <section>
            <h2>Transport</h2>
            <label>Vehicle</label>
            <p>${safe(record.vehicle || '-')}</p>
            <label>Transporter</label>
            <p>${safe(record.transporter || '-')}</p>
            <label>LR No</label>
            <p>${safe(record.lr_no || record.lrNo || '-')}</p>
          </section>
        </div>
        <section class="print-items">
          <h2>Dispatched Items</h2>
          <table>
            <thead><tr>${exportColumns.map(column => `<th>${safe(column)}</th>`).join('')}</tr></thead>
            <tbody>${exportRows.map(row => `<tr>${row.map(cell => `<td>${safe(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </section>
        <div class="print-bottom-grid">
          <section>
            <h2>Notes / Remarks</h2>
            <p>${safe(record.remarks || 'Goods dispatched in good condition.')}</p>
          </section>
          <section class="print-summary">
            <h2>Summary</h2>
            <div><span>Items</span><strong>${safe(String(items.length))}</strong></div>
            <div class="grand"><span>Total Dispatch Qty</span><strong>${safe(this.moneyValue(totalDispatchQty))}</strong></div>
          </section>
        </div>
      </section>
    `;
    const mailBody = [
      `Delivery Challan: ${docNo}`,
      '',
      ...fields.map(([label, value]) => `${label}: ${value}`),
      '',
      exportColumns.join(' | '),
      ...exportRows.map(row => row.join(' | ')),
      '',
      `Total Dispatch Qty: ${this.moneyValue(totalDispatchQty)}`
    ].join('\n');
    return {
      title: `Delivery Challan - ${docNo || 'Selected Record'}`,
      fields,
      columns: exportColumns,
      rows: exportRows,
      documentHtml,
      mailBody,
      fileName: `Delivery_Challan_${docNo || 'Selected_Record'}`
    };
  }

  private printGridPayload(payload: GridExportPayload, asPdf: boolean): void {
    const fieldHtml = payload.fields.length
      ? `<div class="fields">${payload.fields.map(([label, value]) => `<div><strong>${this.escapeHtml(label)}</strong><span>${this.escapeHtml(value)}</span></div>`).join('')}</div>`
      : '';
    const headerHtml = payload.columns.map(column => `<th>${this.escapeHtml(column)}</th>`).join('');
    const bodyHtml = payload.rows.map(row => `<tr>${row.map(cell => `<td>${this.escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
    const popup = window.open('', '_blank', 'width=1100,height=760');
    if (!popup) {
      this.saveError.set('Popup blocked. Allow popups to print or save PDF.');
      setTimeout(() => this.saveError.set(''), 3000);
      return;
    }

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${this.escapeHtml(payload.title)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
            h1 { font-size: 20px; margin: 0 0 6px; }
            .hint { color: #64748b; font-size: 12px; margin-bottom: 14px; }
            .fields { display: grid; grid-template-columns: repeat(2, minmax(180px, 1fr)); gap: 8px 20px; margin: 12px 0 18px; }
            .fields div { border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
            .fields strong { display: block; color: #475569; font-size: 11px; text-transform: uppercase; }
            .fields span { font-size: 13px; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 7px 8px; text-align: left; vertical-align: top; }
            th { background: #f1f5f9; color: #334155; }
            .inventory-print-doc { color: #001b33; }
            .print-doc-title { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:14px; }
            .print-doc-title span, .inventory-print-doc h2 { color:#667085; font-size:11px; letter-spacing:2px; text-transform:uppercase; margin:0 0 10px; }
            .print-doc-title h1 { font-size:22px; margin:0; }
            .print-doc-title strong { border:1px solid #b7d7ce; border-radius:6px; padding:8px 12px; color:#00584f; text-transform:uppercase; font-size:11px; }
            .print-meta-grid, .print-party-grid, .print-bottom-grid { display:grid; gap:14px; margin-bottom:18px; }
            .print-meta-grid { grid-template-columns: repeat(4, minmax(130px, 1fr)); }
            .print-party-grid, .print-bottom-grid { grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr); }
            .print-meta-grid > div, .print-party-grid > section, .print-bottom-grid > section { border:1px solid #ddd8cf; border-radius:8px; padding:14px; }
            .print-meta-grid strong, .inventory-print-doc label { display:block; color:#5f6b7a; font-size:11px; font-weight:700; margin-bottom:5px; }
            .print-meta-grid span, .inventory-print-doc p { margin:0 0 12px; font-size:13px; }
            .print-party-inline { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
            .print-items { margin-bottom:18px; }
            .print-items table { border:0; }
            .print-items th { border:0; border-bottom:2px solid #243041; background:white; font-size:10px; letter-spacing:1px; text-transform:uppercase; }
            .print-items td { border:0; border-bottom:1px solid #e1ded7; padding:10px 8px; }
            .print-summary div { display:flex; justify-content:space-between; border-bottom:1px dotted #d8d3ca; padding:7px 0; font-size:13px; }
            .print-summary .grand { margin-top:10px; border:1px solid #b7d7ce; border-radius:8px; background:#f0fbf7; padding:12px; text-transform:uppercase; }
            .print-summary .grand strong { color:#00584f; font-size:17px; }
            @media (max-width: 800px) { .print-meta-grid, .print-party-grid, .print-bottom-grid { grid-template-columns: 1fr; } }
            @media print { body { margin: 12mm; } .hint { display: none; } }
          </style>
        </head>
        <body>
          ${payload.documentHtml ? '' : `<h1>${this.escapeHtml(payload.title)}</h1>`}
          <div class="hint">${asPdf ? 'Choose Save as PDF in the print dialog.' : 'Print preview'}</div>
          ${payload.documentHtml || `${fieldHtml}<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`}
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 250);
  }

  private mailGridPayload(payload: GridExportPayload): void {
    const fieldLines = payload.fields.map(([label, value]) => `${label}: ${value}`);
    const tableLines = [
      payload.columns.join(' | '),
      ...payload.rows.map(row => row.join(' | '))
    ];
    const body = payload.mailBody || [
      payload.title,
      '',
      ...fieldLines,
      ...(fieldLines.length ? [''] : []),
      ...tableLines
    ].join('\n');
    const url = `mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    this.saveMsg.set('Mail draft opened with the selected details.');
    setTimeout(() => this.saveMsg.set(''), 3000);
  }

  private downloadGridCsv(payload: GridExportPayload): void {
    const fieldRows = payload.fields.map(([label, value]) => [label, value]);
    const csvRows = [
      [payload.title],
      ...fieldRows,
      ...(fieldRows.length ? [[]] : []),
      payload.columns,
      ...payload.rows
    ];
    const csv = '\ufeff' + csvRows.map(row => row.map(cell => this.csvCell(cell)).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.fileSafeName(payload.fileName || payload.title)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private escapeHtml(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private csvCell(value: any): string {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  private fileSafeName(value: string): string {
    return String(value || 'inventory-grid').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'inventory-grid';
  }

  private formatCurrency(value: any): string {
    return `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
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
    const referenceKey = this.transactionReferenceField()?.key || this.segmentBarTransactionReferenceField()?.key;
    const procurementVendorKey = this.procurementVendorHeaderField()?.key;

    return this.displayFields().filter(field =>
      !this.isBusinessSegmentField(field)
      && field.key !== numberKey
      && field.key !== dateKey
      && field.key !== referenceKey
      && field.key !== procurementVendorKey
      && !(this.config?.key === 'salesOrder' && (field.key === 'customer' || field.key === 'creditSale' || field.key === 'paymentTerms' || field.key === 'dueDate' || field.key === 'deliveryDate' || field.key === 'deliveryAddress'))
      && !(this.config?.key === 'salesInvoice' && (field.key === 'customer' || field.key === 'referenceNo' || field.key === 'paymentTerms' || field.key === 'dueDate' || field.key === 'placeOfSupply' || field.key === 'warehouse' || field.key === 'transportMode' || field.key === 'vehicleNo' || field.key === 'deliveryAddress' || field.key === 'customerNotes' || field.key === 'internalNotes'))
      && !(this.config?.key === 'purchaseInvoice' && field.key === 'grnReference')
      && !(this.config?.key === 'purchaseInvoice' && field.key === 'status')
      && !(this.config?.key === 'goodsReceipt' && field.key === 'status')
      && !(this.config?.key === 'goodsReceipt' && field.key === 'poReference')
    );
  }

  bodyFieldByKey(key: string): InventoryField | null {
    const wanted = String(key || '').toLowerCase();
    return this.displayFields().find(field => field.key.toLowerCase() === wanted) || null;
  }

  // Groups bodyDisplayFields() into labeled cards for Sales Order/Invoice's
  // restructured layout (inspired by the reference mockup's card grouping,
  // built with this app's own existing .inventory-fieldset CSS convention —
  // see vendor-master.html for the same pattern). Every other screen keeps
  // rendering bodyDisplayFields() directly in one unlabeled group, untouched.
  formCards(): { title: string; fields: InventoryField[] }[] {
    const byKeys = (keys: string[]) => {
      const set = new Set(keys);
      return this.bodyDisplayFields().filter(field => set.has(field.key));
    };
    if (this.config?.key === 'salesOrder') {
      return [
        { title: 'Order Details', fields: byKeys(['paymentTerms', 'deliveryDate']) },
        { title: 'Customer & Delivery', fields: byKeys(['customer', 'deliveryAddress']) }
      ];
    }
    if (this.config?.key === 'salesInvoice') {
      return [
        { title: 'Invoice Details', fields: byKeys(['paymentTerms', 'dueDate', 'placeOfSupply']) },
        { title: 'Customer', fields: byKeys(['customer']) },
        { title: 'Dispatch', fields: byKeys(['warehouse', 'transportMode', 'vehicleNo']) },
        { title: 'Notes', fields: byKeys(['customerNotes', 'internalNotes']) }
      ];
    }
    return [{ title: '', fields: this.bodyDisplayFields() }];
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
    const field = this.primaryTransactionReferenceField();
    return this.transactionReferenceInSegmentBar(field) ? null : field;
  }

  segmentBarTransactionReferenceField(): InventoryField | null {
    const field = this.primaryTransactionReferenceField();
    return this.transactionReferenceInSegmentBar(field) ? field : null;
  }

  transactionReferenceInSegmentBar(field: InventoryField | null | undefined): boolean {
    const segmentBarReferenceScreens = new Set([
      'estimation',
      'proformaInvoice',
      'requestForQuotation',
      'purchaseOrder',
      'goodsReceipt',
      'purchaseInvoice',
      'salesInvoice',
      'purchaseReturn',
      'salesEnquiry',
      'salesQuotation',
      'deliveryChallan',
      'salesReturn',
      'productionReturn',
      'materialIssueProduction',
      'productionEntry',
      'internalIssueSlip',
      'shipmentEntry',
      'gatePass',
      'debitNote',
      'creditNote'
    ]);
    return !!field
      && this.showTransactionHeader()
      && this.isApiWired()
      && segmentBarReferenceScreens.has(this.config?.key || '');
  }

  transactionReferencePickerButtonVisible(_field: InventoryField | null | undefined): boolean {
    return !!(this.purchaseReferenceType() || this.salesReferenceType());
  }

  transactionReferencePickerTitle(_field: InventoryField | null | undefined): string {
    return this.purchaseReferenceButtonLabel();
  }

  private primaryTransactionReferenceField(): InventoryField | null {
    if (!this.showTransactionHeader()) return null;
    return this.displayFields().find(field => this.isPrimaryTransactionReferenceField(field)) || null;
  }

  // Also covers Sales Return's Customer field — Purchase Return already
  // promotes Vendor into its own header column (with a "+Add Vendor"
  // button); Sales Return's Customer was left as an ordinary grid field,
  // the same visual weight as Return Reason, which was one of the UX gaps
  // vs Purchase Return. Same header slot, same options-fallback helper
  // below, just keyed to the party field each screen actually has.
  procurementVendorHeaderField(): InventoryField | null {
    if (!this.showTransactionHeader()) return null;
    const key = this.config?.key || '';
    const procurementKeys = new Set(['purchaseOrder', 'goodsReceipt', 'purchaseInvoice', 'purchaseReturn', 'debitNote']);
    if (procurementKeys.has(key)) {
      return this.displayFields().find(field => field.key === 'vendor' || field.key === 'supplier') || null;
    }
    if (key === 'salesReturn') {
      return this.displayFields().find(field => field.key === 'customer') || null;
    }
    return null;
  }

  procurementVendorHeaderOptions(field: InventoryField): string[] {
    if (field.options?.length) return field.options;
    return this.config?.key === 'salesReturn' ? this.customerOptions : this.vendorOptions;
  }

  transactionNumberValue(field: InventoryField): string {
    const live = this.formValues()[field.key];
    const existing = String(live || this.txDocNumber() || '').trim();
    return existing || this.generateTransactionDocNumber(field);
  }

  transactionNumberPlaceholder(field: InventoryField): string {
    return `${this.transactionDocPrefix(field)}-YY-00001`;
  }

  // A single stable Date instance for "today", used as the p-datepicker
  // default below. p-datepicker's [ngModel] expects a Date object — the
  // previous fallback (todayIso(), a "YYYY-MM-DD" string) didn't render as a
  // selected day in the calendar, so the field always looked empty on a
  // fresh GRN/PI/etc even though todayIso() was already correct for the
  // save-payload fallback (docDate() in the payload builders is unaffected
  // by this change). Cached once (not `new Date()` per call) so the same
  // reference is returned across renders — no change-detection churn.
  private readonly _todayDateValue = new Date();

  // Public alias bound to [maxDate] on the header transaction-date picker
  // (PO Date, GRN Date, PI Date, RFQ Date, PR Date, SO/SI Date, Return Date,
  // Debit/Credit Note Date, DC Date, etc. — whichever field
  // isPrimaryTransactionDateField() resolves for the current screen) so a
  // user can never backdate the calendar into the future. Same instance as
  // _todayDateValue, just exposed for templates.
  readonly maxTransactionDate = this._todayDateValue;

  // A handful of body-level date fields represent a real-world event that
  // already happened by the time it's typed in (the vendor's own invoice
  // date on GRN/PI), so those also get capped at today. Forward-looking
  // fields — Expected Delivery, Due Date, Valid Till, Required Date,
  // Delivery Date, Expected Return, Insurance Expiry, etc. — are left
  // unrestricted since a future date is the whole point of those fields.
  private readonly pastOrTodayBodyDateFieldKeys = new Set(['vendorInvoiceDate']);

  bodyDateFieldMaxDate(field: InventoryField): Date | null {
    return this.pastOrTodayBodyDateFieldKeys.has(field.key) ? this.maxTransactionDate : null;
  }

  transactionDateValue(field: InventoryField): any {
    return this.datePickerValue(this.formValues()[field.key]) || this._todayDateValue;
  }

  transactionReferenceOptions(field: InventoryField): string[] {
    const docs = this.transactionReferenceDocsForField(field).map(doc => doc.doc_number).filter(Boolean);
    const options = this.config?.key === 'purchaseInvoice'
      ? ['Direct Purchase Invoice', ...docs]
      : this.config?.key === 'purchaseReturn'
        ? ['Direct Purchase Return', ...docs]
      : this.config?.key === 'debitNote'
        ? ['Direct Debit Note', ...docs]
      : this.config?.key === 'creditNote'
        ? ['Direct Credit Note', ...docs]
      : this.config?.key === 'goodsReceipt'
        ? ['Direct Goods Receipt', ...docs]
        : (docs.length ? docs : (field.options || []));
    const cacheKey = `${this.config?.key || ''}:${field.key}:${options.join('|')}`;
    if (cacheKey === this.transactionReferenceOptionsCacheKey) return this.transactionReferenceOptionsCache;
    this.transactionReferenceOptionsCacheKey = cacheKey;
    this.transactionReferenceOptionsCache = options;
    return this.transactionReferenceOptionsCache;
  }

  transactionReferenceUsesSelect(field: InventoryField): boolean {
    return !!this.purchaseReferenceType()
      || !!this.salesReferenceType()
      || field.type === 'select'
      || this.transactionReferenceOptions(field).length > 0;
  }

  selectTransactionReference(field: InventoryField, value: any): void {
    const selected = String(value || '').trim();
    if (this.config?.key === 'purchaseInvoice' && !selected) {
      this.clearPurchaseInvoiceReference(field);
      return;
    }
    if (this.config?.key === 'purchaseReturn' && !selected) {
      this.clearPurchaseReturnReference(field);
      return;
    }
    if ((this.config?.key === 'debitNote' || this.config?.key === 'creditNote') && !selected) {
      this.clearDocumentNoteReference(field);
      return;
    }
    if (this.config?.key === 'purchaseInvoice' && this.normalizeKey(selected).includes('directpurchaseinvoice')) {
      this.applyDirectPurchaseInvoiceReference(field);
      return;
    }
    if (this.config?.key === 'purchaseReturn' && this.normalizeKey(selected).includes('directpurchasereturn')) {
      this.useDirectPurchaseReturn();
      return;
    }
    if (this.config?.key === 'debitNote' && this.normalizeKey(selected).includes('directdebitnote')) {
      this.applyDirectDocumentNoteReference(field, 'Direct Debit Note');
      return;
    }
    if (this.config?.key === 'creditNote' && this.normalizeKey(selected).includes('directcreditnote')) {
      this.applyDirectDocumentNoteReference(field, 'Direct Credit Note');
      return;
    }
    if (this.config?.key === 'goodsReceipt' && this.normalizeKey(selected).includes('directgoodsreceipt')) {
      this.applyDirectGoodsReceiptReference();
      return;
    }

    const doc = this.transactionReferenceDocsForField(field).find(item => item.doc_number === selected)
      || this.transactionReferenceDocs().find(item => item.doc_number === selected);
    if (doc) {
      // selectPrimaryReference() (not selectSalesReference() directly) so a
      // DC picked out of Sales Invoice's merged SO+DC dropdown routes to the
      // DC-append/replace path instead of being force-fit through the SO
      // header-patch logic.
      this.selectPrimaryReference(doc);
      return;
    }

    this.collectFormField(field.key, value);
  }

  private clearPurchaseInvoiceReference(field: InventoryField): void {
    this.formValues.update(values => ({
      ...values,
      [field.key]: '',
      grnId: null,
      grnReference: '',
      vendorId: null,
      vendor: '',
      branchId: null,
      branch: '',
      warehouseId: null,
      warehouse: '',
      receivingLocation: '',
      vendorInvoiceNo: '',
      vendorInvoiceDate: null,
      paymentTerms: '',
      dueDate: null
    }));
    this.boundReferenceLabels.set([]);
    this.boundReferenceFields.set({});
    this.entryLineRowsKey.set(this.config?.key || '');
    this.entryLineRows.set([this.blankLineRow()]);
  }

  private applyDirectPurchaseInvoiceReference(field: InventoryField): void {
    this.formValues.update(values => ({
      ...values,
      [field.key]: 'Direct Purchase Invoice',
      grnId: null,
      grnReference: 'Direct Purchase Invoice',
      vendorId: null,
      vendor: '',
      branchId: null,
      branch: '',
      warehouseId: null,
      warehouse: '',
      receivingLocation: '',
      vendorInvoiceNo: '',
      vendorInvoiceDate: null,
      paymentTerms: '',
      dueDate: null
    }));
    this.boundReferenceLabels.set([]);
    this.boundReferenceFields.set({});
    this.entryLineRowsKey.set(this.config?.key || '');
    this.entryLineRows.set([this.blankLineRow()]);
  }

  useDirectPurchaseInvoice(): void {
    this.applyDirectPurchaseInvoiceReference({ key: 'grnReference', label: 'GRN Reference / Direct' });
    this.closePurchaseReferencePicker();
  }

  purchaseInvoiceReferenceLabel(): string {
    if (this.config?.key !== 'purchaseInvoice') return '';
    const ref = String(this.formValues()['grnReference'] || '').trim();
    return ref || 'Direct Purchase Invoice';
  }

  private clearPurchaseReturnReference(field: InventoryField): void {
    this.formValues.update(values => ({
      ...values,
      [field.key]: '',
      piId: null,
      piReference: '',
      vendorId: null,
      vendor: '',
      warehouseId: null,
      warehouse: ''
    }));
    this.boundReferenceLabels.set([]);
    this.boundReferenceFields.set({});
    this.entryLineRowsKey.set(this.config?.key || '');
    this.entryLineRows.set([this.blankLineRow()]);
  }

  private applyDirectPurchaseReturnReference(field: InventoryField): void {
    this.formValues.update(values => ({
      ...values,
      [field.key]: 'Direct Purchase Return',
      piId: null,
      piReference: 'Direct Purchase Return',
      vendorId: null,
      vendor: '',
      warehouseId: null,
      warehouse: ''
    }));
    this.boundReferenceLabels.set([]);
    this.boundReferenceFields.set({});
    this.entryLineRowsKey.set(this.config?.key || '');
    this.entryLineRows.set([this.blankLineRow()]);
    // Drop any attribute data carried from a previously-picked PI (see
    // lineRefItemIdMap's doc comment) — this is now a blank, unrelated row.
    this.lineRefItemIdMap.set({});
  }

  useDirectPurchaseReturn(): void {
    this.applyDirectPurchaseReturnReference({ key: 'piReference', label: 'PI Reference' });
    this.closePurchaseReferencePicker();
  }

  purchaseReturnReferenceLabel(): string {
    if (this.config?.key !== 'purchaseReturn') return '';
    const ref = String(this.formValues()['piReference'] || '').trim();
    return ref || 'Direct Purchase Return';
  }

  purchaseReturnLocationLocked(): boolean {
    if (this.config?.key !== 'purchaseReturn') return false;
    const values = this.formValues();
    const reference = this.normalizeKey(values['piReference'] || '');
    return !!values['piId'] && reference !== '' && !reference.includes('directpurchasereturn');
  }

  // Mirror of purchaseReturnLocationLocked() above -- Purchase Return greys
  // out its warehouse once a source PI is referenced, but Sales Return had
  // no equivalent and stayed editable indefinitely, which was one of the
  // UX gaps vs Purchase Return.
  salesReturnLocationLocked(): boolean {
    if (this.config?.key !== 'salesReturn') return false;
    const values = this.formValues();
    const reference = this.normalizeKey(values['invoiceReference'] || '');
    return !!values['invoiceId'] && reference !== '' && !reference.includes('directsalesreturn');
  }

  private clearDocumentNoteReference(field: InventoryField): void {
    const key = this.config?.key || '';
    this.formValues.update(values => ({
      ...values,
      [field.key]: '',
      purchaseReturnId: null,
      purchaseInvoiceId: null,
      purchaseInvoiceReference: '',
      salesReturnId: null,
      salesInvoiceId: null,
      salesInvoiceReference: '',
      ...(key === 'debitNote' ? { vendorId: null, vendor: '' } : {}),
      ...(key === 'creditNote' ? { customerId: null, customer: '' } : {})
    }));
    this.boundReferenceLabels.set([]);
    this.boundReferenceFields.set({});
    this.entryLineRowsKey.set(key);
    this.entryLineRows.set([this.blankLineRow()]);
  }

  private applyDirectDocumentNoteReference(field: InventoryField, label: string): void {
    const key = this.config?.key || '';
    this.formValues.update(values => ({
      ...values,
      [field.key]: label,
      purchaseReturnId: null,
      purchaseInvoiceId: null,
      purchaseInvoiceReference: '',
      salesReturnId: null,
      salesInvoiceId: null,
      salesInvoiceReference: ''
    }));
    this.boundReferenceLabels.set([]);
    this.boundReferenceFields.set({});
    this.entryLineRowsKey.set(key);
    this.entryLineRows.set([this.blankLineRow()]);
  }

  private applyDirectGoodsReceiptReference(): void {
    this.formValues.update(values => ({
      ...values,
      poId: null,
      poReference: 'Direct Goods Receipt'
    }));
    this.boundReferenceLabels.set([]);
    this.boundReferenceFields.set({});
    this.entryLineRowsKey.set(this.config?.key || '');
    this.entryLineRows.set([this.blankLineRow()]);
  }

  useDirectGoodsReceipt(): void {
    this.applyDirectGoodsReceiptReference();
    this.closePurchaseReferencePicker();
  }

  goodsReceiptReferenceLabel(): string {
    if (this.config?.key !== 'goodsReceipt') return '';
    const ref = String(this.formValues()['poReference'] || '').trim();
    return ref || 'Direct Goods Receipt';
  }

  directReferenceActionLabel(): string {
    const label = this.directReferenceLabelForCurrentTransaction();
    return label || (this.canUseDirectReferenceEntry() ? 'Direct Entry' : '');
  }

  useDirectReferenceEntry(): void {
    if (this.applyDirectReferenceForCurrentTransaction(true)) {
      this.closePurchaseReferencePicker();
    }
  }

  private canUseDirectReferenceEntry(): boolean {
    return !!this.primaryTransactionReferenceField();
  }

  private directReferenceLabelForCurrentTransaction(key = this.config?.key || ''): string {
    const labels: Record<string, string> = {
      goodsReceipt: 'Direct Goods Receipt',
      purchaseInvoice: 'Direct Purchase Invoice',
      purchaseReturn: 'Direct Purchase Return',
      salesReturn: 'Direct Sales Return',
      debitNote: 'Direct Debit Note',
      creditNote: 'Direct Credit Note',
      gatePass: 'Direct Movement'
    };
    return labels[key] || '';
  }

  private applyDirectReferenceForCurrentTransaction(resetRows = true): boolean {
    const key = this.config?.key || '';
    const field = this.primaryTransactionReferenceField();
    if (!field) return false;

    if (key === 'purchaseInvoice') {
      this.applyDirectPurchaseInvoiceReference(field);
      return true;
    }
    if (key === 'purchaseReturn') {
      this.applyDirectPurchaseReturnReference(field);
      return true;
    }
    if (key === 'debitNote') {
      this.applyDirectDocumentNoteReference(field, 'Direct Debit Note');
      return true;
    }
    if (key === 'creditNote') {
      this.applyDirectDocumentNoteReference(field, 'Direct Credit Note');
      return true;
    }
    if (key === 'goodsReceipt') {
      this.applyDirectGoodsReceiptReference();
      return true;
    }

    const directLabel = this.directReferenceLabelForCurrentTransaction(key);
    const patch: Record<string, any> = { [field.key]: directLabel };
    if (key === 'purchaseOrder') {
      patch['rfqId'] = null;
      patch['rfqReference'] = '';
      patch['linkedPr'] = '';
    } else if (key === 'deliveryChallan' || key === 'salesInvoice') {
      patch['soId'] = null;
      patch['soReference'] = '';
      patch['referenceNo'] = '';
    } else if (key === 'salesReturn') {
      patch['invoiceId'] = null;
      patch['invoiceReference'] = '';
    } else if (key === 'shipmentEntry') {
      patch['dcId'] = null;
      patch['dcReference'] = '';
    }

    this.formValues.update(values => ({ ...values, ...patch }));
    this.boundReferenceLabels.set([]);
    this.boundReferenceFields.set({});
    if (resetRows) {
      this.entryLineRowsKey.set(key);
      this.entryLineRows.set([this.blankLineRow()]);
      // Rows are blank now — drop whatever so/dc/si item id or (Sales
      // Return) attribute data lineRefItemIdMap carried from the previous
      // reference, or it would stale-leak onto these unrelated new rows.
      this.lineRefItemIdMap.set({});
    }
    return true;
  }

  usesReferenceTrayOnly(): boolean {
    return false;
  }

  private piReferenceTrayOpened = false;

  private maybeAutoOpenPurchaseInvoiceReferenceTray(): void {
    if (this.config?.key !== 'purchaseInvoice' || this.piReferenceTrayOpened) return;
    this.piReferenceTrayOpened = true;
    setTimeout(() => {
      if (!this.editingId()) this.openPurchaseReferencePicker();
    }, 0);
  }

  private transactionReferenceDocsForField(_field: InventoryField): PurchaseRefDoc[] {
    const docs = this.availableReferenceDocsForCurrentTransaction(this.transactionReferenceDocs());
    if (this.config?.key !== 'purchaseInvoice') return docs;

    const vendor = this.findVendorBySelection(this.formValues()['vendor']);
    const vendorId = vendor?.id ?? this.optionalNumber(this.formValues()['vendorId']);
    const vendorName = String(vendor?.vendor_name || this.formValues()['vendor'] || '').trim();
    if (!vendorId && !vendorName) return docs;

    const filtered = docs.filter(doc =>
      (vendorId && Number(doc.vendor_id) === Number(vendorId))
      || (!!vendorName && this.optionEquals(doc.party_name, vendorName))
    );
    return filtered.length ? filtered : docs;
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

  // Cached by the exact source value so the SAME Date object reference is
  // returned across repeated calls for an unchanged field — like
  // _todayDateValue above, lineColumnOptions()/attributeLookupObjects()
  // elsewhere in this file. formFieldValue() calls this directly from the
  // template for every date field on every change-detection pass; without
  // caching, `new Date(value)` returns a fresh reference each time even
  // though the value didn't change, which p-datepicker treats as "changed"
  // on every tick and reprocesses, retriggering change detection — a CD
  // storm that pins the CPU with no thrown error. This is what made the
  // whole tab lock up immediately after picking a GRN on Purchase Invoice:
  // that's the first moment piDate/dueDate/vendorInvoiceDate all get set to
  // plain ISO strings at once, so every p-datepicker on the form hit this
  // path on the very next render.
  private readonly datePickerValueCache = new Map<string, Date>();

  private datePickerValue(value: any): any {
    if (!value || value instanceof Date) return value || null;
    const key = String(value);
    const cached = this.datePickerValueCache.get(key);
    if (cached) return cached;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    this.datePickerValueCache.set(key, date);
    return date;
  }

  private isoDateValue(value: any): string | null {
    if (!value) return null;
    if (value instanceof Date) {
      const yyyy = value.getFullYear();
      const mm = String(value.getMonth() + 1).padStart(2, '0');
      const dd = String(value.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    const text = String(value).trim();
    if (!text) return null;
    const direct = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private gridDateParts(value: any): { day: string; month: string; year: string } | null {
    if (!value) return null;
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      return {
        day: String(value.getDate()).padStart(2, '0'),
        month: String(value.getMonth() + 1).padStart(2, '0'),
        year: String(value.getFullYear()).slice(-2)
      };
    }

    const text = String(value).trim();
    if (!text) return null;

    let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return { day: match[3], month: match[2], year: match[1].slice(-2) };

    match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
    if (match) {
      return {
        day: match[1].padStart(2, '0'),
        month: match[2].padStart(2, '0'),
        year: match[3].slice(-2)
      };
    }

    match = text.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{2}|\d{4})$/);
    if (match) {
      const monthText = match[2].toLowerCase();
      const monthIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        .findIndex(month => monthText.startsWith(month));
      if (monthIndex >= 0) {
        return {
          day: match[1].padStart(2, '0'),
          month: String(monthIndex + 1).padStart(2, '0'),
          year: match[3].slice(-2)
        };
      }
    }

    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return null;
    return {
      day: String(parsed.getDate()).padStart(2, '0'),
      month: String(parsed.getMonth() + 1).padStart(2, '0'),
      year: String(parsed.getFullYear()).slice(-2)
    };
  }

  gridDateDisplay(value: any): string {
    const parts = this.gridDateParts(value);
    return parts ? `${parts.day}-${parts.month}-${parts.year}` : String(value || '');
  }

  private paymentTermBySelection(value: any): PaymentTermItem | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    return this.loadedPaymentTermObjects().find(term =>
      this.optionEquals(term.term_name, raw)
      || this.optionEquals(term.term_code, raw)
    ) ?? null;
  }

  private paymentTermCreditDays(value: any): number {
    const term = this.paymentTermBySelection(value);
    if (term) return Number(term.credit_days || 0);
    const text = String(value ?? '').trim();
    if (!text || /immediate|advance/i.test(text)) return 0;
    const match = text.match(/\d+/);
    return match ? Number(match[0]) || 0 : 0;
  }

  private purchaseInvoiceDueDate(piDate: any, paymentTerms: any): string | null {
    const base = this.isoDateValue(piDate) || this.todayIso();
    const date = new Date(`${base}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    date.setDate(date.getDate() + this.paymentTermCreditDays(paymentTerms));
    return this.isoDateValue(date);
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

    if (['product', 'parentproduct', 'substituteproduct', 'finishedproduct', 'rawmaterials', 'applicableproducts'].includes(key) || addMaster === 'product / service') {
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

    if ((this.config?.key === 'goodsReceipt' || this.config?.key === 'purchaseInvoice') && key === 'receivinglocation') {
      return this.grnReceivingLocationOptions();
    }

    if (this.config?.key === 'deliveryChallan' && key === 'fromwarehouse') {
      return this.grnReceivingLocationOptions();
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

    if (key === 'manufacturer' || addMaster === 'manufacturer') {
      return this.manufacturerOptions;
    }

    if (key === 'placeofsupply') {
      return this.dcAddressStates;
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

  // Merged Receiving Branch / Warehouse picker (GRN needs only one location field,
  // user selects whichever applies) — combines both master lists into one dropdown.
  private readonly grnReceivingLocationOptions = computed((): string[] => {
    return Array.from(new Set([...this.warehouseOptions, ...this.branchOptions]));
  });

  // Same picker as above but grouped by master, so the GRN dropdown visibly
  // labels which entries are Warehouses vs Branches instead of one flat list.
  // bindValue stays the plain name string, so every existing consumer of
  // formValues()['receivingLocation'] (findWarehouseBySelection, the GRN
  // payload builder, etc.) is unaffected.
  readonly grnReceivingLocationGroups = computed((): { label: string; group: string }[] => [
    ...this.warehouseOptions.map(label => ({ label, group: 'Warehouse' })),
    ...this.branchOptions.map(label => ({ label, group: 'Branch' }))
  ]);

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

    if (this.isApiWired() || this.config?.kind === 'transaction') {
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
      && (this.hasOptionPair(field, 'Active', 'Inactive') || this.hasOptionPair(field, 'Draft', 'Posted'));
  }

  private isDraftPostedSwitchField(field: InventoryField): boolean {
    return field.type === 'select' && this.hasOptionPair(field, 'Draft', 'Posted');
  }

  isYesNoSwitchField(field: InventoryField): boolean {
    return field.type === 'select' && this.hasOptionPair(field, 'Yes', 'No');
  }

  private readonly grnTransportSubFieldKeys = new Set(['transportvehicleno', 'transportdrivername', 'transportcontactno']);

  // Vehicle No / Driver Name / Contact No only render once "Transport Details" is toggled to Yes.
  isGrnFieldHidden(field: InventoryField): boolean {
    if (this.config?.key !== 'goodsReceipt') return false;
    if (!this.grnTransportSubFieldKeys.has(field.key.toLowerCase())) return false;
    return this.formValues()['hasTransportDetails'] !== 'Yes';
  }

  fieldSwitchChecked(field: InventoryField): boolean {
    const live = this.formValues()[field.key];
    const value = live !== undefined ? live : this.defaultFieldValue(field);
    return value === 'Active' || value === 'Yes' || value === 'Posted' || value === true;
  }

  setFieldSwitchChecked(field: InventoryField, checked: boolean): void {
    const displayVal = this.isDraftPostedSwitchField(field)
      ? (checked ? 'Posted' : 'Draft')
      : this.isStatusSwitchField(field)
        ? (checked ? 'Active' : 'Inactive')
        : (checked ? 'Yes' : 'No');
    const cacheKey = `${this.config?.key || 'inventory'}:${field.key}`;
    this.fieldDefaultValues.set(cacheKey, displayVal);
    this.collectFormField(field.key, displayVal);
  }

  fieldSwitchOnLabel(field: InventoryField): string {
    if (this.isDraftPostedSwitchField(field)) return 'Posted';
    return this.isStatusSwitchField(field) ? 'Active' : 'Yes';
  }

  fieldSwitchOffLabel(field: InventoryField): string {
    if (this.isDraftPostedSwitchField(field)) return 'Draft';
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
      this.lineGstIncludedMap.set({});
      if (key === 'productServiceMaster') {
        this.entryLineRows.set([this.blankLineRow()]);
      } else if (key === 'uomMaster' || key === 'variantMaster') {
        this.entryLineRows.set([this.blankLineRow()]);
      } else if (this.config?.kind === 'transaction') {
        this.entryLineRows.set([this.blankLineRow()]);
      } else {
        const rows = this.lineRows();
        this.entryLineRows.set(rows.length ? rows.map(row => this.normalizeLineRow(row)) : [this.blankLineRow()]);
      }
    }
    return this.entryLineRows();
  }

  // Memoized per-row/per-column view for the generic line-item grid (used by
  // GRN, Purchase Invoice, Purchase Return, Debit Note, Sales Order, Sales
  // Invoice, Sales Return, Credit Note, Purchase Order — every transaction
  // screen that doesn't have its own bespoke grid like Purchase Requisition/
  // Request for Quotation do). The template used to call lineColumnOptions()/
  // lineCellControlValue()/etc directly per-cell — lineColumnOptions() in
  // particular calls productNamesForTransaction(), which does
  // .filter().map().filter() and therefore returns a BRAND NEW array on every
  // single call. Bound directly to an ng-select's [items] in the template,
  // that new-array-every-render-cycle behavior made ng-select treat the
  // options list as "changed" on every change-detection pass and reset,
  // which is why clicking an option (e.g. selecting a Product) never
  // registered — the same reference-stability bug class already fixed this
  // session for Base UOM, attributeLookupObjects, and variant value tokens.
  // This computed only re-runs when entryLineRows() (or any signal read
  // inside the per-cell derivations, e.g. loadedProductObjects()) actually
  // changes, so the same row/column keeps the same array reference across
  // unrelated render cycles.
  readonly entryLineRowViews = computed((): EntryLineRowView[] => {
    const rows = this.entryLineRows();
    const columns = this.config?.lineColumns || [];
    const isGrnLinkedPi = this.isGrnLinkedPurchaseInvoice();
    return rows.map((row, rowIndex) => ({
      columns: columns.map((column, columnIndex) => isGrnLinkedPi
        ? this.grnLinkedPurchaseInvoiceCellView(column, row, columnIndex, rowIndex)
        : {
          options: this.lineColumnOptions(column, row),
          controlValue: this.lineCellControlValue(row[columnIndex], column, row),
          usesMultiSelect: this.lineColumnUsesMultiSelect(column, row),
          inputType: this.lineCellInputType(column, row),
          placeholder: this.lineColumnTypingHint(column, row),
          stockHint: this.transactionStockControlHint(column, row, columnIndex, rowIndex),
          stockHintClass: this.transactionStockControlHintClass(column, row, columnIndex, rowIndex),
          priceHint: this.transactionPriceHint(column, row, rowIndex)
        }),
      attrSelections: isGrnLinkedPi ? this.grnLinkedPurchaseInvoiceAttrSelections(row) : this.lineRowAttrSelections(rowIndex, row),
      serialNames: isGrnLinkedPi ? this.grnLinkedPurchaseInvoiceSerialNames(row) : this.lineGridSerialColumnNamesForRow(row)
    }));
  });

  private isGrnLinkedPurchaseInvoice(): boolean {
    return this.config?.key === 'purchaseInvoice' && !!this.optionalNumber(this.formValues()['grnId']);
  }

  private grnLinkedPurchaseInvoiceCellView(column: string, row: string[], columnIndex: number, rowIndex: number): EntryLineColumnView {
    const key = this.normalizeKey(column);
    return {
      options: [],
      controlValue: row[columnIndex] ?? '',
      usesMultiSelect: false,
      inputType: this.lineCellInputType(column, row),
      placeholder: '',
      stockHint: this.transactionStockControlHint(column, row, columnIndex),
      stockHintClass: this.transactionStockControlHintClass(column, row, columnIndex),
      priceHint: this.transactionPriceHint(column, row, rowIndex)
    };
  }

  private grnLinkedPurchaseInvoiceAttrSelections(row: string[]): VariantAttrSelection[] {
    const grouped = new Map<string, { name: string; values: string[] }>();

    for (const part of this.attributeTextParts(this.lineCellValue(row, 'Attribute'))) {
      const name = String(part.name || '').trim();
      const value = String(part.value || '').trim();
      if (!name || !value) continue;
      const key = this.normalizeKey(name);
      if (!grouped.has(key)) grouped.set(key, { name, values: [] });
      const bucket = grouped.get(key)!;
      if (!bucket.values.some(existing => this.optionEquals(existing, value))) {
        bucket.values.push(value);
      }
    }

    return Array.from(grouped.values()).map(item => {
      const value = item.values.join(', ');
      return { name: item.name, options: value ? [value] : [], value, isAuto: true };
    });
  }

  private grnLinkedPurchaseInvoiceSerialNames(row: string[]): string[] {
    const names: string[] = [];
    const seen = new Set<string>();
    for (const part of this.attributeTextParts(this.lineCellValue(row, 'Serial No'))) {
      const name = String(part.name || '').trim();
      const key = this.normalizeKey(name);
      if (!name || seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }
    return names;
  }

  private readonly lineGridAttributeColumnList = computed((): string[] => {
    if (!this.isPolicyAwarePurchaseLineGrid()) return [];
    const names: string[] = [];
    const seen = new Set<string>();
    for (const rowView of this.entryLineRowViews()) {
      for (const attr of rowView.attrSelections || []) {
        const name = String(attr.name || '').trim();
        const key = this.normalizeKey(name);
        if (!name || seen.has(key)) continue;
        seen.add(key);
        names.push(name);
      }
    }
    return names;
  });

  private readonly lineGridSerialColumnList = computed((): string[] => {
    if (!this.isPolicyAwarePurchaseLineGrid()) return [];
    const names: string[] = [];
    const seen = new Set<string>();
    for (const rowView of this.entryLineRowViews()) {
      for (const name of rowView.serialNames || []) {
        const key = this.normalizeKey(name);
        if (!name || seen.has(key)) continue;
        seen.add(key);
        names.push(name);
      }
    }
    return names;
  });

  private readonly lineGridAttributeColumnSet = computed(() =>
    new Set(this.lineGridAttributeColumnList().map(name => this.normalizeKey(name)))
  );

  private readonly lineGridSerialColumnSet = computed(() =>
    new Set(this.lineGridSerialColumnList().map(name => this.normalizeKey(name)))
  );

  private readonly lineGridRenderColumnList = computed((): string[] => {
    const baseColumns = this.transactionLineDisplayColumns(this.visibleLineColumns());
    if (!this.isPolicyAwarePurchaseLineGrid()) return baseColumns;
    const attributeColumns = this.lineGridAttributeColumnList();
    const serialColumns = this.lineGridSerialColumnList();
    const rendered: string[] = [];
    for (const column of baseColumns) {
      const key = column.toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (key === 'attribute') {
        rendered.push(...(attributeColumns.length ? attributeColumns : [column]));
      } else if (key === 'serialno') {
        rendered.push(...(serialColumns.length ? serialColumns : [column]));
      } else {
        rendered.push(column);
      }
    }
    return rendered;
  });

  lineGridRenderColumns(): string[] {
    return this.lineGridRenderColumnList();
  }

  private transactionLineDisplayColumns(columns: string[]): string[] {
    if (this.config?.kind !== 'transaction') return columns;
    return columns.filter(column => {
      const key = this.normalizeKey(column);
      if (key === 'variant') return this.shouldRenderVariantLineColumn();
      if (key === 'attribute') return this.shouldRenderAttributeLineColumn();
      return true;
    });
  }

  private shouldRenderVariantLineColumn(): boolean {
    if (this.isGrnLinkedPurchaseInvoice()) {
      return this.entryLineRows().some(row => !!this.lineCellValue(this.normalizeLineRow(row), 'Variant'));
    }
    return this.entryLineRows().some(row => {
      const normalized = this.normalizeLineRow(row);
      if (this.lineCellValue(normalized, 'Variant')) return true;
      const product = this.lineRowProduct(normalized);
      return this.productVariantOptionObjects(product).length > 0;
    });
  }

  private shouldRenderAttributeLineColumn(): boolean {
    if (this.isGrnLinkedPurchaseInvoice()) {
      return this.entryLineRows().some(row => !!this.lineCellValue(this.normalizeLineRow(row), 'Attribute'));
    }
    return this.entryLineRows().some(row => {
      const normalized = this.normalizeLineRow(row);
      if (this.lineCellValue(normalized, 'Attribute')) return true;
      return this.lineRowHasVariantAttributes(normalized);
    });
  }

  lineGridSourceColumnIndex(column: string): number {
    return this.lineColumnIndex(column);
  }

  lineGridColumnHeader(column: string): string {
    // Header always shows the generic "Serial No." label, even on the 4
    // policy-aware grids (GRN/PI/DC/SI) where lineGridRenderColumns() has
    // already substituted a policy-specific column name (e.g. "Chassis No").
    // The specific policy label shows on the picker button inside the cell
    // instead (serialPickerSummaryForRow()) — keeps the header stable and
    // uniform while the button reflects what's actually being captured.
    if (this.lineGridColumnIsSerialValue(column) || column.toLowerCase().includes('serial')) {
      return 'Serial No.';
    }
    return column;
  }

  // Drag-to-resize column widths for the line-items grid (GRN's Received
  // Items grid, per the user's explicit ask — the markup that opts into this
  // via the "inventory-resizable-table" class is only in goods-receipt.html).
  // Keyed per-screen so widths chosen on one config never bleed into another.
  private readonly lineGridColumnWidths = signal<Record<string, number>>({});
  private lineGridResizeState: { key: string; startX: number; startWidth: number } | null = null;
  private lineGridResizeMoveHandler: ((event: MouseEvent) => void) | null = null;
  private lineGridResizeUpHandler: (() => void) | null = null;

  private lineGridColumnWidthKey(column: string): string {
    return `${this.config?.key || ''}:${this.normalizeKey(column)}`;
  }

  lineGridColumnWidthPx(column: string): string | null {
    const width = this.lineGridColumnWidths()[this.lineGridColumnWidthKey(column)];
    return width ? `${width}px` : null;
  }

  startLineGridColumnResize(event: MouseEvent, column: string): void {
    event.preventDefault();
    event.stopPropagation();
    const th = (event.currentTarget as HTMLElement)?.closest('th');
    const startWidth = th?.getBoundingClientRect().width || 120;
    const key = this.lineGridColumnWidthKey(column);
    this.lineGridResizeState = { key, startX: event.clientX, startWidth };

    this.lineGridResizeMoveHandler = (moveEvent: MouseEvent) => {
      const state = this.lineGridResizeState;
      if (!state) return;
      const nextWidth = Math.max(70, Math.round(state.startWidth + (moveEvent.clientX - state.startX)));
      this.lineGridColumnWidths.update(map => ({ ...map, [state.key]: nextWidth }));
    };
    this.lineGridResizeUpHandler = () => {
      this.lineGridResizeState = null;
      if (this.lineGridResizeMoveHandler) document.removeEventListener('mousemove', this.lineGridResizeMoveHandler);
      if (this.lineGridResizeUpHandler) document.removeEventListener('mouseup', this.lineGridResizeUpHandler);
      this.lineGridResizeMoveHandler = null;
      this.lineGridResizeUpHandler = null;
    };
    document.addEventListener('mousemove', this.lineGridResizeMoveHandler);
    document.addEventListener('mouseup', this.lineGridResizeUpHandler);
  }

  lineGridColumnCssClass(column: string): string {
    const classes: string[] = [];
    if (this.lineGridColumnIsProduct(column)) classes.push('inventory-line-col-product');
    if (this.lineGridColumnIsQuantity(column)) classes.push('inventory-line-col-qty');
    if (this.lineGridColumnIsGstValue(column)) classes.push('inventory-line-col-gst');
    if (this.lineGridColumnIsRate(column)) classes.push('inventory-line-col-rate');
    if (this.lineGridColumnIsDiscount(column)) classes.push('inventory-line-col-disc');
    if (this.lineGridColumnIsAmount(column)) classes.push('inventory-line-col-amount');
    return classes.join(' ');
  }

  lineGridColumnIsProduct(column: string): boolean {
    const key = this.compactKey(column);
    return key.includes('product')
      || key.includes('item')
      || key.includes('sku')
      || key.includes('material')
      || key.includes('service');
  }

  lineGridColumnIsQuantity(column: string): boolean {
    const key = this.compactKey(column);
    return (key.includes('qty') || key.includes('quantity')) && !this.lineGridColumnIsAmount(column);
  }

  lineGridColumnIsGstValue(column: string): boolean {
    const key = this.compactKey(column);
    if (!key || this.lineGridColumnIsAmount(column)) return false;
    return key === 'gst'
      || key === 'tax'
      || key === 'gstpct'
      || key === 'taxpct'
      || key === 'gstpercent'
      || key === 'taxpercent'
      || key === 'gstpercentage'
      || key === 'taxpercentage'
      || key.includes('gstrate')
      || key.includes('taxrate');
  }

  lineGridColumnIsRate(column: string): boolean {
    const key = this.compactKey(column);
    return (key === 'rate' || key.includes('rate') || key.includes('price') || key.includes('cost'))
      && !this.lineGridColumnIsGstValue(column)
      && !this.lineGridColumnIsDiscount(column)
      && !this.lineGridColumnIsAmount(column);
  }

  lineGridColumnIsDiscount(column: string): boolean {
    const key = this.compactKey(column);
    return key.includes('disc') || key.includes('discount');
  }

  lineGridColumnIsAmount(column: string): boolean {
    const key = this.compactKey(column);
    return key.includes('amount') || key.includes('total') || key.includes('value');
  }

  lineGridGstPercentText(row: string[], column: string): string {
    return `${this.transactionLineGstPercent(this.normalizeLineRow(row), column)}%`;
  }

  lineGstIncluded(rowIndex: number): boolean {
    return !!this.lineGstIncludedMap()[rowIndex];
  }

  toggleLineGstMode(rowIndex: number): void {
    this.setLineGstMode(rowIndex, !this.lineGstIncluded(rowIndex));
  }

  setLineGstMode(rowIndex: number, included: boolean): void {
    this.lineGstIncludedMap.update(map => ({ ...map, [rowIndex]: included }));
    this.entryLineRows.update(rows => rows.map((row, index) => {
      if (index !== rowIndex) return row;
      const nextRow = this.normalizeLineRow(row);
      this.recalculateLineRow(nextRow, rowIndex);
      return nextRow;
    }));
  }

  lineGstModeLabel(rowIndex: number): string {
    return this.lineGstIncluded(rowIndex) ? 'Included' : 'Excluded';
  }

  private transactionLineGstPercent(row: string[], column?: string): number {
    const normalized = this.normalizeLineRow(row);
    const raw = column ? this.lineCellValue(normalized, column) : this.lineValue(normalized, ['gst', 'tax']);
    const parsed = this.parseCurrency(raw);
    if (String(raw || '').trim() !== '' && Number.isFinite(parsed)) return parsed;
    return Number(this.lineRowProduct(normalized)?.gst_rate ?? 0) || 0;
  }

  private transactionLineTaxBreakup(qty: number, rate: number, discountPct: number, gstPct: number, rowIndex?: number, gstIncludedOverride?: boolean): {
    gross: number;
    discountAmount: number;
    taxableAmount: number;
    taxAmount: number;
    total: number;
    gstIncluded: boolean;
  } {
    const gross = qty * rate;
    const discountAmount = gross * discountPct / 100;
    const discountedGross = gross - discountAmount;
    const gstIncluded = gstIncludedOverride ?? (rowIndex !== undefined ? this.lineGstIncluded(rowIndex) : false);
    if (gstIncluded && gstPct > 0) {
      const taxableAmount = discountedGross / (1 + gstPct / 100);
      return {
        gross,
        discountAmount,
        taxableAmount,
        taxAmount: discountedGross - taxableAmount,
        total: discountedGross,
        gstIncluded
      };
    }
    const taxAmount = discountedGross * gstPct / 100;
    return {
      gross,
      discountAmount,
      taxableAmount: discountedGross,
      taxAmount,
      total: discountedGross + taxAmount,
      gstIncluded
    };
  }

  private roundLineAmount(value: number): number {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  private transactionLineTaxPayload(row: string[], rowIndex: number, qty: number, rate?: number, discountPct?: number, gstPct?: number): {
    gst_inclusive: boolean;
    taxable_amount: number;
    tax_amount: number;
    amount: number;
  } {
    const lineRate = rate ?? this.lineNumber(row, ['rate', 'list']);
    const lineDiscountPct = discountPct ?? this.lineNumber(row, ['disc', 'discount']);
    const lineGstPct = gstPct ?? this.transactionLineGstPercent(row);
    const breakup = this.transactionLineTaxBreakup(qty, lineRate, lineDiscountPct, lineGstPct, rowIndex);
    return {
      gst_inclusive: breakup.gstIncluded,
      taxable_amount: this.roundLineAmount(breakup.taxableAmount),
      tax_amount: this.roundLineAmount(breakup.taxAmount),
      amount: this.roundLineAmount(breakup.total)
    };
  }

  lineGridColumnIsAttributeValue(column: string): boolean {
    return this.lineGridAttributeColumnSet().has(this.normalizeKey(column));
  }

  lineGridColumnIsSerialValue(column: string): boolean {
    return this.lineGridSerialColumnSet().has(this.normalizeKey(column));
  }

  lineGridColumnIsSerialPicker(column: string): boolean {
    const key = this.compactKey(column);
    return this.lineGridColumnIsSerialValue(column)
      || key.includes('serial')
      || key.includes('chassis')
      || key.includes('chasis')
      || key.includes('imei')
      || key.includes('vin');
  }

  lineGridAttributeSelection(rowView: EntryLineRowView | undefined, column: string): VariantAttrSelection | null {
    return rowView?.attrSelections?.find(attr => this.optionEquals(attr.name, column)) ?? null;
  }

  lineGridColumnAppliesToRow(row: string[], rowIndex: number, column: string, rowView?: EntryLineRowView): boolean {
    rowView = rowView ?? this.entryLineRowViews()[rowIndex];
    if (this.lineGridColumnIsAttributeValue(column)) {
      return !!this.lineGridAttributeSelection(rowView, column);
    }
    if (this.lineGridColumnIsSerialValue(column)) {
      return (rowView?.serialNames || []).some(name => this.optionEquals(name, column));
    }
    return this.lineColumnAppliesToRow(row, column);
  }

  lineGridCellReadonly(rowIndex: number, row: string[], column: string): boolean {
    if ((this.config?.key === 'salesInvoice' || this.config?.key === 'deliveryChallan') && this.normalizeKey(column) === 'warehouse') {
      return true;
    }
    if ((this.config?.key === 'salesInvoice' || this.config?.key === 'salesOrder')
      && (this.normalizeKey(column) === 'mrp' || this.normalizeKey(column) === 'selling price')) {
      // MRP/Selling Price are set at procurement (GRN/Purchase Invoice) — sales
      // screens only ever display them, never let the user re-key them.
      return true;
    }
    if (this.config?.key !== 'purchaseInvoice' || !this.optionalNumber(this.formValues()['grnId'])) return false;
    if (this.lineGridColumnIsAttributeValue(column) || this.lineGridColumnIsSerialValue(column)) return true;
    const key = this.normalizeKey(column);
    const compactKey = this.compactKey(column);
    return key === 'product'
      || key === 'variant'
      || key === 'uom'
      || compactKey === 'receivedqty'
      || compactKey === 'acceptedqty'
      || key.includes('batch')
      || key.includes('serial')
      || key.includes('expiry');
  }

  lineGridReadonlyCellText(rowIndex: number, row: string[], column: string, cellView: EntryLineColumnView | null | undefined, rowView?: EntryLineRowView): string {
    if (this.lineGridColumnIsAttributeValue(column)) {
      return this.lineGridAttributeSelection(rowView ?? this.entryLineRowViews()[rowIndex], column)?.value || '';
    }
    if (this.lineGridColumnIsSerialValue(column)) {
      const pickedSerials = this.lineSerialUnitsMap()[rowIndex];
      if (pickedSerials?.length) return pickedSerials.join(', ');
      return this.lineGridSerialValue(rowIndex, row, column);
    }
    const key = this.config?.key || '';
    if ((key === 'salesInvoice' || key === 'deliveryChallan') && this.normalizeKey(column) === 'warehouse') {
      const existing = String(cellView?.controlValue ?? this.lineCellValue(row, column) ?? '').trim();
      if (existing) return existing;
      const headerField = key === 'deliveryChallan' ? 'fromWarehouse' : 'warehouse';
      return String(this.formValues()[headerField] || '').trim();
    }
    return String(cellView?.controlValue ?? this.lineCellValue(row, column) ?? '').trim();
  }

  addEntryLineRow(): void {
    this.directEntryLineRows();
    this.entryLineRows.update(rows => [...rows, this.blankLineRow()]);
  }

  readonly isLineGridFullscreen = signal(false);

  toggleLineGridFullscreen(): void {
    this.isLineGridFullscreen.update(value => !value);
  }

  removeEntryLineRow(rowIndex: number): void {
    this.directEntryLineRows();
    if (this.config?.key === 'attributeMaster') {
      const removedRow = this.entryLineRows()[rowIndex];
      const normalizedRemoved = removedRow ? this.normalizeLineRow(removedRow) : null;
      const valueId = normalizedRemoved?.[4] ? Number(normalizedRemoved[4]) : 0;
      if (normalizedRemoved && Number.isFinite(valueId) && valueId > 0) {
        const inactiveRow = [...normalizedRemoved];
        inactiveRow[2] = 'Inactive';
        this.attributeValuesPendingDeactivate.update(rows => {
          const withoutSame = rows.filter(row => Number(row[4]) !== valueId);
          return [...withoutSame, inactiveRow];
        });
      }
    }
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
    this.lineSerialValueMap.update(map => {
      const next: Record<string, string> = {};
      for (const [key, val] of Object.entries(map)) {
        const under = key.indexOf('_');
        if (under < 0) continue;
        const idx = parseInt(key.slice(0, under), 10);
        const rest = key.slice(under);
        if (idx < rowIndex) next[key] = val;
        else if (idx > rowIndex) next[`${idx - 1}${rest}`] = val;
      }
      return next;
    });
    this.dismissedPriceHints.update(map => {
      const next: Record<number, string> = {};
      for (const [key, val] of Object.entries(map)) {
        const idx = Number(key);
        if (idx < rowIndex) next[idx] = val;
        else if (idx > rowIndex) next[idx - 1] = val;
      }
      return next;
    });
    this.lineGstIncludedMap.update(map => {
      const next: Record<number, boolean> = {};
      for (const [key, val] of Object.entries(map)) {
        const idx = Number(key);
        if (idx < rowIndex) next[idx] = val;
        else if (idx > rowIndex) next[idx - 1] = val;
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
    if (this.config?.kind === 'transaction' && (
      colKey.includes('product') || colKey.includes('item') || colKey.includes('sku') || colKey.includes('material')
    )) {
      this.lineSerialValueMap.update(map => {
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
      const previousCellValue = nextRow[columnIndex] || '';
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
        if (column.toLowerCase().includes('attribute value')) {
          // Typing a brand-new value here (via addTag) — e.g. a new car model
          // under an existing "Model" attribute — saves it back onto the
          // Attribute record so it becomes a normal reusable option
          // everywhere, not just a one-off value on this row.
          const nameIndex = (this.config?.lineColumns || []).findIndex(candidate => candidate.toLowerCase().includes('attribute name'));
          const attributeName = nameIndex >= 0 ? nextRow[nameIndex] : '';
          if (attributeName && normalizedValue) {
            this.persistNewAttributeValueIfNeeded(attributeName, normalizedValue);
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
        // Clear the Attribute column when product changes — a different product
        // invalidates whatever was picked. On GRN specifically, Variant and
        // Attribute are edited independently, so a Variant change no longer
        // wipes out an already-entered Attribute value (other transaction
        // screens keep the original clear-on-variant-change behavior).
        if (isProductCol || (isVariantCol && !this.isPolicyAwarePurchaseLineGrid())) {
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
              if (!currentUom || !uomOptions.some(option => this.sameUomSelection(option, currentUom))) {
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
            if (this.isGstAutoFillLineGrid() && product.gst_rate != null) {
              // Auto-bind GST from the product's own mapped rate (Product Master /
              // HSN-SAC) instead of leaving it for manual re-entry on every inward line.
              const gstIdx = (this.config?.lineColumns || []).findIndex(c => c.toLowerCase().includes('gst'));
              if (gstIdx >= 0 && !nextRow[gstIdx]) {
                const gstValue = `${Number(product.gst_rate)}%`;
                nextRow[gstIdx] = gstValue;
              }
            }
            this.applyProductPricingDefaults(nextRow, product);
          }
          if (this.isPolicyAwarePurchaseLineGrid()) {
            // Clear stale Batch/Serial/Expiry values that no longer apply to the newly selected product.
            (this.config?.lineColumns || []).forEach((policyCol, policyIdx) => {
              if (!this.isPolicyLineColumn(policyCol)) return;
              if (!product || !this.productSupportsLinePolicy(product, policyCol)) nextRow[policyIdx] = '';
            });
          }
        }
        if (this.config?.key === 'purchaseInvoice' && this.normalizeKey(column) === 'mrp') {
          this.syncPurchaseInvoiceSellingPrice(nextRow, normalizedValue, previousCellValue);
        }
        // UOM is user-editable on every transaction screen except a
        // GRN-linked Purchase Invoice (lineGridCellReadonly locks the whole
        // row there). Any per-unit price already sitting in this row — Rate,
        // and on GRN/Purchase Invoice/Sales Invoice also MRP/Selling Price.
        // Sales Invoice's visible price columns must follow the selected
        // UOM instead of showing base-UOM values while billing a Box/Lot.
        // The value was captured in the PREVIOUS uom and has to be rescaled
        // or it keeps billing the newly selected unit at the old unit's
        // price. Qty-like columns scale by oldFactor/newFactor; price
        // columns scale the OPPOSITE way (newFactor/oldFactor) so
        // Amount = Qty x Rate keeps representing the same real value across
        // the switch. Without this, a "1 Box" (= 10 Nos) line switched to
        // "Numbers" kept Rate at the full per-Box price, so entering "2"
        // Numbers priced out at 10x what those 2 units are actually worth —
        // e.g. Rs. 15,00,000/Box shown unchanged as Rs. 15,00,000 per Number
        // instead of the correct Rs. 1,50,000.
        const uomSwitchScreens = new Set(['purchaseReturn', 'salesReturn', 'goodsReceipt', 'purchaseInvoice', 'salesOrder', 'salesInvoice']);
        if (uomSwitchScreens.has(this.config?.key || '')
          && this.normalizeKey(column) === 'uom'
          && previousCellValue && normalizedValue
          && !this.sameUomSelection(previousCellValue, normalizedValue)
        ) {
          const uomSwitchProduct = this.findProductBySelection(this.lineValue(nextRow, ['product', 'item', 'sku']));
          if (uomSwitchProduct) {
            const oldFactor = this.productUomConversionFactorForSelection(uomSwitchProduct, previousCellValue);
            const newFactor = this.productUomConversionFactorForSelection(uomSwitchProduct, normalizedValue);
            if (oldFactor > 0 && newFactor > 0) {
              if (this.config?.key === 'purchaseReturn' || this.config?.key === 'salesReturn') {
                // Invoice/Invoiced Qty is the OTHER document's own qty,
                // carried in its UOM at reference-pick time — converting it
                // is what made "Return Qty cannot be greater than Invoice
                // Qty" compare like-for-like instead of rejecting a
                // perfectly valid return entered in the new UOM.
                const invoiceQtyIdx = (this.config?.lineColumns || []).findIndex(c => {
                  const k = c.toLowerCase();
                  return k.includes('invoice') && k.includes('qty');
                });
                if (invoiceQtyIdx >= 0) {
                  const currentInvoiceQty = this.parseDecimalNumber(nextRow[invoiceQtyIdx]);
                  if (Number.isFinite(currentInvoiceQty) && currentInvoiceQty > 0) {
                    const convertedInvoiceQty = (currentInvoiceQty * oldFactor) / newFactor;
                    nextRow[invoiceQtyIdx] = String(Math.round(convertedInvoiceQty * 10000) / 10000);
                  }
                }
              }

              const priceColumnNeedles = (this.config?.key === 'goodsReceipt' || this.config?.key === 'purchaseInvoice' || this.config?.key === 'salesInvoice')
                ? ['rate', 'mrp', 'selling']
                : ['rate'];
              (this.config?.lineColumns || []).forEach((col, idx) => {
                const key = col.toLowerCase();
                if (!priceColumnNeedles.some(needle => key.includes(needle))) return;
                const currentPrice = this.parseDecimalNumber(nextRow[idx]);
                if (!Number.isFinite(currentPrice) || currentPrice <= 0) return;
                const convertedPrice = (currentPrice * newFactor) / oldFactor;
                nextRow[idx] = String(Math.round(convertedPrice * 100) / 100);
              });
            }
          }
        }
      }
      this.recalculateLineRow(nextRow, rowIndex);
      return nextRow;
    }));
    if (this.config?.kind === 'transaction' && (
      colKey.includes('qty') || colKey.includes('return') || colKey.includes('dispatch') || colKey.includes('accepted')
    )) {
      this.trimLineSerialUnitsToCurrentQty(rowIndex);
    }
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
    this.lineSerialValueMap.update(map => {
      const next = { ...map };
      Object.keys(next).filter(k => k.startsWith(`${rowIndex}_`)).forEach(k => delete next[k]);
      return next;
    });
    this.lineGstIncludedMap.update(map => {
      const next = { ...map };
      delete next[rowIndex];
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
    return (this.config?.lineColumns || []).filter(column => this.isLineColumnVisible(column));
  }

  private lineGridAttributeColumnNames(): string[] {
    return this.lineGridAttributeColumnList();
  }

  private serialPolicyForProduct(product: ProductItem | null | undefined): SerialPolicyItem | null {
    if (!product) return null;
    const id = Number(product.serial_policy_id);
    const name = String(product.serial_policy_name || '').trim();
    return this.loadedSerialPolicyObjects().find(policy =>
      (Number.isFinite(id) && id > 0 && Number(policy.id) === id)
      || (!!name && this.optionEquals(policy.policy_name, name))
    ) ?? null;
  }

  private serialFormatLooksLikeLabels(format: string): boolean {
    const key = this.normalizeKey(format);
    if (!key) return false;
    if (/(chassis|imei|engine|vin|\bserial\s*(no|number)?\b)/i.test(format)) return true;
    if (/[|,;/+&]/.test(format) && !/(yyyy|yy|seq|####|000|prefix|suffix)/i.test(format)) return true;
    return false;
  }

  private serialLabelFromToken(token: string): string {
    const raw = String(token || '').trim();
    const key = this.normalizeKey(raw);
    if (!key) return '';
    if (key.includes('imei')) return 'IMEI No';
    if (key.includes('chassis')) return 'Chassis No';
    if (key.includes('engine')) return 'Engine No';
    if (key.includes('vin')) return 'VIN No';
    if (key.includes('serial')) return 'Serial No';
    let label = raw
      .replace(/\b(required|tracking|capture|format|policy|number|num)\b/ig, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!label) return 'Serial No';
    label = toInventoryTitleCase(label);
    return /\b(no|number|id|code)\b/i.test(label) ? label : `${label} No`;
  }

  private productSerialColumnLabels(product: ProductItem | null | undefined): string[] {
    if (!product?.serial_applicable) return [];
    const policy = this.serialPolicyForProduct(product);
    const format = String(policy?.serial_format || '').trim();
    const policyName = String(policy?.policy_name || product.serial_policy_name || '').trim();
    const source = this.serialFormatLooksLikeLabels(format) ? format : (policyName || format || 'Serial No');
    const labels = source
      .split(/\s*(?:,|\||;|\/|\+|&|\band\b)\s*/i)
      .map(token => this.serialLabelFromToken(token))
      .filter(Boolean);
    return labels.length ? [...new Set(labels)] : ['Serial No'];
  }

  private lineGridSerialColumnNamesForRow(row: string[]): string[] {
    const productName = this.lineValue(row, ['product', 'item', 'sku', 'material']);
    const product = this.findProductBySelection(productName);
    const labels = this.productSerialColumnLabels(product);
    if (labels.length) return labels;
    const rawSerial = this.lineCellValue(row, 'Serial No');
    const parsed = this.attributeTextParts(rawSerial).filter(part => part.name).map(part => part.name);
    return parsed.length ? parsed : [];
  }

  private lineGridSerialColumnNames(): string[] {
    return this.lineGridSerialColumnList();
  }

  lineCellValue(row: string[], column: string): string {
    const index = this.lineColumnIndex(column);
    return index >= 0 ? String(row[index] ?? '') : '';
  }

  private lineSerialMapKey(rowIndex: number, label: string): string {
    return `${rowIndex}_${this.normalizeKey(label)}`;
  }

  lineGridSerialValue(rowIndex: number, row: string[], label: string): string {
    const mapped = this.lineSerialValueMap()[this.lineSerialMapKey(rowIndex, label)];
    if (mapped !== undefined) return mapped;
    const rawSerial = this.lineCellValue(row, 'Serial No');
    if (!rawSerial) return '';
    const parts = this.attributeTextParts(rawSerial);
    const named = parts.find(part => part.name && this.optionEquals(part.name, label));
    if (named) return named.value;
    const labels = this.isGrnLinkedPurchaseInvoice()
      ? this.grnLinkedPurchaseInvoiceSerialNames(row)
      : this.lineGridSerialColumnNamesForRow(row);
    return labels.length <= 1 && !parts.some(part => part.name)
      ? rawSerial
      : '';
  }

  private transactionLineSerialText(row: string[], rowIndex: number): string {
    // Serials entered via the picker (lineSerialUnitsMap) take priority —
    // this composes the human-readable legacy serial_no text column so
    // everything that still reads it (GRN drill-down, GRN->PI reference
    // copy, older display paths) sees the real values instead of blank,
    // even though serial_numbers is now the authoritative structured field.
    const pickedSerials = this.lineSerialUnitsMap()[rowIndex];
    if (pickedSerials?.length) return pickedSerials.join(', ');
    const labels = this.lineGridSerialColumnNamesForRow(row);
    if (!labels.length) return this.lineCellValue(row, 'Serial No');
    const values = labels
      .map(label => ({ label, value: this.lineGridSerialValue(rowIndex, row, label).trim() }))
      .filter(item => item.value);
    if (!values.length) return '';
    if (labels.length === 1) return values[0].value;
    return values.map(item => `${item.label}: ${item.value}`).join(' | ');
  }

  setLineSerialValue(rowIndex: number, label: string, value: string | null): void {
    this.lineSerialValueMap.update(map => ({ ...map, [this.lineSerialMapKey(rowIndex, label)]: String(value || '').trim() }));
    const serialIdx = this.lineColumnIndex('Serial No');
    if (serialIdx >= 0) {
      this.directEntryLineRows();
      this.entryLineRows.update(rows => rows.map((row, index) => {
        if (index !== rowIndex) return row;
        const nextRow = this.normalizeLineRow(row);
        nextRow[serialIdx] = this.transactionLineSerialText(nextRow, rowIndex);
        return nextRow;
      }));
    }
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
    const key = this.normalizeKey(column);
    const existingValue = this.lineCellValue(row, column);

    if (this.config?.kind === 'transaction') {
      if (this.isGrnLinkedPurchaseInvoice()) {
        if (key === 'variant' || key === 'attribute') return !!existingValue;
        if (this.isPolicyLineColumn(column)) return !!existingValue;
        return true;
      }

      if (key === 'variant') {
        if (existingValue) return true;
        const product = this.lineRowProduct(row);
        return this.productVariantOptionObjects(product).length > 0;
      }

      if (key === 'attribute') {
        if (existingValue) return true;
        return this.lineRowHasVariantAttributes(row);
      }
    }

    if (!this.isPolicyAwarePurchaseLineGrid() || !this.isPolicyLineColumn(column)) return true;
    if (existingValue) return true;

    const productName = this.lineValue(row, ['product', 'item', 'sku']);
    if (!productName) return false;

    const product = this.findProductBySelection(productName);
    if (!product) return false;

    return this.productSupportsLinePolicy(product, column);
  }

  private lineRowProduct(row: string[]): ProductItem | null {
    return this.findProductBySelection(this.lineValue(row, ['product', 'item', 'sku', 'material']));
  }

  private firstPositiveCurrencyValue(...values: any[]): number {
    for (const value of values) {
      const parsed = this.parseCurrency(String(value ?? ''));
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return 0;
  }

  private productVariantSellingPrice(product: ProductItem | null | undefined, row: string[]): number {
    const variantText = this.lineValue(row, ['variant']);
    const variantId = variantText
      ? this.productVariantOptionObjects(product).find(option => this.productVariantOptionMatches(option, variantText))?.id ?? null
      : null;
    if (!variantId) return 0;
    const variant = this.loadedVariantObjects().find(item => Number(item.id) === Number(variantId));
    return this.firstPositiveCurrencyValue((variant as any)?.selling_price, (variant as any)?.sellingPrice, variant?.price);
  }

  private productSellingPrice(product: ProductItem | null | undefined, row: string[]): number {
    if (!product) return 0;
    return this.firstPositiveCurrencyValue(
      (product as any).selling_price,
      (product as any).sellingPrice,
      (product as any).sale_price,
      (product as any).salePrice,
      this.productVariantSellingPrice(product, row),
      (product as any).price,
      (product as any).mrp
    );
  }

  private productMrp(product: ProductItem | null | undefined): number {
    if (!product) return 0;
    return this.firstPositiveCurrencyValue(
      (product as any).mrp,
      (product as any).selling_price,
      (product as any).sellingPrice,
      (product as any).sale_price,
      (product as any).salePrice,
      (product as any).price
    );
  }

  private productCostPriceUomFactor(product: ProductItem | null | undefined): number {
    if (!product) return 1;
    const conversions = this.activeProductUomConversions(product);
    const purchaseUom = conversions.find(conversion => conversion.is_default_purchase)
      ?? conversions.find(conversion => conversion.is_purchase_uom);
    const fallbackUom = conversions.length === 1
      ? conversions[0]
      : conversions.find(conversion => {
          const candidate = Number(conversion.conversion_factor);
          return Number.isFinite(candidate) && candidate > 1;
        });
    const factor = Number((purchaseUom ?? fallbackUom)?.conversion_factor);
    return Number.isFinite(factor) && factor > 0 ? factor : 1;
  }

  private productCostPriceForLineUom(product: ProductItem | null | undefined, row: string[]): number {
    const costPrice = this.firstPositiveCurrencyValue(product?.cost_price, product?.costPrice);
    if (!product || costPrice <= 0) return costPrice;
    const costUomFactor = this.productCostPriceUomFactor(product);
    const lineUomFactor = this.productUomConversionFactorForSelection(product, this.lineValue(row, ['uom']), 'salesInvoice');
    return (costPrice / costUomFactor) * (lineUomFactor > 0 ? lineUomFactor : 1);
  }

  private lineMoneyText(value: number): string {
    if (!Number.isFinite(value) || value <= 0) return '';
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
  }

  private productSalesPriceForUomSelection(
    product: ProductItem | null | undefined,
    uomSelection: string | null | undefined,
    baseUomPrice: number,
    key = 'salesInvoice'
  ): number {
    if (!product || !Number.isFinite(baseUomPrice) || baseUomPrice <= 0) return baseUomPrice;
    const factor = this.productUomConversionFactorForSelection(product, uomSelection, key);
    return baseUomPrice * (factor > 0 ? factor : 1);
  }

  private productSalesPriceForLineUom(product: ProductItem | null | undefined, row: string[], baseUomPrice: number): number {
    return this.productSalesPriceForUomSelection(product, this.lineValue(row, ['uom']), baseUomPrice, 'salesInvoice');
  }

  private setLineColumnDefault(row: string[], needles: string[], value: number, replaceZero = false): void {
    if (!Number.isFinite(value) || value <= 0) return;
    const idx = (this.config?.lineColumns || []).findIndex(column => {
      const key = column.toLowerCase();
      return needles.some(needle => key.includes(needle));
    });
    if (idx < 0) return;
    const current = String(row[idx] ?? '').trim();
    if (!current || (replaceZero && this.parseCurrency(current) === 0)) {
      row[idx] = this.lineMoneyText(value) || String(value);
    }
  }

  private applyProductPricingDefaults(row: string[], product: ProductItem): void {
    // Rate means different things per screen: SO/SI Rate is the customer
    // selling rate, while PI's Rate is
    // the vendor purchase rate (must NOT be overwritten from selling price)
    // — only MRP/Selling Price are safe to auto-bind on both.
    if (this.config?.key === 'salesInvoice') {
      const mrp = this.productSalesPriceForLineUom(product, row, this.productMrp(product));
      const selling = this.productSalesPriceForLineUom(product, row, this.productSellingPrice(product, row));
      this.setLineColumnDefault(row, ['mrp'], mrp, true);
      this.setLineColumnDefault(row, ['selling'], selling, true);
      this.setLineColumnDefault(row, ['rate'], mrp > 0 ? mrp : selling, true);
    } else if (this.config?.key === 'salesOrder' || this.config?.key === 'purchaseInvoice') {
      this.setLineColumnDefault(row, ['mrp'], this.productMrp(product), true);
      this.setLineColumnDefault(row, ['selling'], this.productSellingPrice(product, row), true);
    }
    if (this.config?.key === 'salesOrder') {
      this.setLineColumnDefault(row, ['rate'], this.productSellingPrice(product, row), true);
    }
  }

  private syncPurchaseInvoiceSellingPrice(row: string[], mrpValue: string, previousMrpValue: string): void {
    const sellingIdx = (this.config?.lineColumns || []).findIndex(column => this.normalizeKey(column) === 'sellingprice');
    if (sellingIdx < 0) return;
    const currentSelling = String(row[sellingIdx] ?? '').trim();
    const previousMrp = this.parseCurrency(previousMrpValue);
    const currentSellingNumber = this.parseCurrency(currentSelling);
    if (!currentSelling || (Number.isFinite(previousMrp) && previousMrp > 0 && currentSellingNumber === previousMrp)) {
      row[sellingIdx] = String(mrpValue || '').trim();
    }
  }

  private lineRowVariantId(product: ProductItem | null | undefined, row: string[]): number | null {
    const variantText = this.lineValue(row, ['variant']);
    if (!product || !variantText) return null;
    return this.productVariantOptionObjects(product).find(option =>
      this.productVariantOptionMatches(option, variantText)
    )?.id ?? null;
  }

  private lineRowHasVariantAttributes(row: string[]): boolean {
    const product = this.lineRowProduct(row);
    const variantId = this.lineRowVariantId(product, row);
    return !!variantId && this.variantAttributeItemsForTransaction(product, variantId).length > 0;
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
    const rejectedNote = this.grnRejectedQtyNote(column, row);
    const stateMessage = this.transactionStockControlState(column, row, columnIndex, rowIndex)?.message
      || this.warehouseStockLocationHint(column, row, rowIndex)?.message
      || '';
    return [rejectedNote, stateMessage].filter(Boolean).join(' · ');
  }

  // The per-line Warehouse cell on Sales Invoice / Delivery Challan is
  // read-only (lineGridCellReadonly), defaulting to the header warehouse —
  // this surfaces where else the product actually has stock, as a hint
  // rather than a second required field to fill in per line.
  private warehouseStockLocationHint(column: string, row: string[], rowIndex?: number): { message: string; severity: 'info' | 'warn' } | null {
    const key = this.config?.key || '';
    if (key !== 'salesInvoice' && key !== 'deliveryChallan') return null;
    if (this.normalizeKey(column) !== 'warehouse') return null;

    const product = this.findProductBySelection(this.lineValue(row, ['product', 'item', 'sku']));
    if (!product) return null;
    const variantText = this.lineValue(row, ['variant']);
    const variantId = variantText
      ? this.productVariantOptionObjects(product).find(option => this.productVariantOptionMatches(option, variantText))?.id ?? null
      : null;
    const attr = this.resolveLineAttribute(product, variantText, this.transactionLineAttributeText(row, rowIndex));
    const attributeValue = attr.attribute_value || null;

    this.fetchAvailableStockForLine(product.id ?? null, null);
    if (variantId) this.fetchAvailableStockForLine(product.id ?? null, variantId);
    if (variantId && attributeValue) this.fetchAvailableStockForLine(product.id ?? null, variantId, attributeValue);

    const cache = this.availableStockCache();
    const productRows = cache[this.availableStockKey(product.id ?? null, null)];
    const variantRows = variantId ? cache[this.availableStockKey(product.id ?? null, variantId)] : null;
    const attributeRows = variantId && attributeValue ? cache[this.availableStockKey(product.id ?? null, variantId, attributeValue)] : null;
    const rows = attributeRows || variantRows || productRows;
    if (!rows) return null;

    const headerField = key === 'deliveryChallan' ? (this.formValues()['fromWarehouse'] || this.formValues()['fromWarehouseId'])
      : (this.formValues()['warehouse'] || this.formValues()['warehouseId']);
    const warehouse = this.findWarehouseBySelection(headerField);
    const warehouseId = warehouse?.id ?? this.optionalNumber(headerField) ?? null;

    const fmt = (value: number) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
    const others = this.otherWarehousesWithStock(rows, warehouseId);
    if (!others.length) return null;
    const list = others.slice(0, 3).map(o => `${o.warehouse_name || 'Warehouse'}: ${fmt(o.available)}`).join(', ');
    return { message: `Also in stock at ${list}`, severity: 'info' };
  }

  private compactStockHint(message: string): string {
    const text = String(message || '').trim();
    if (!text) return '';
    const shortMatch = /^Short by\s+(.+?)\s+here/i.exec(text);
    if (shortMatch) return `Short: ${shortMatch[1]}`;
    return text
      .replace(/^Available \(all warehouses\):/i, 'Avail:')
      .replace(/^Available here:/i, 'Avail:')
      .replace(/\s+-\s+.*$/, '')
      .replace(/\s+—\s+.*$/, '')
      .trim();
  }

  transactionStockControlHintClass(column: string, row: string[], columnIndex: number, rowIndex?: number): string {
    const rejectedNote = this.grnRejectedQtyNote(column, row);
    const state = this.transactionStockControlState(column, row, columnIndex, rowIndex)
      || this.warehouseStockLocationHint(column, row, rowIndex);
    if (rejectedNote === 'Accepted exceeds Received' || this.rejectedQtyFromNote(rejectedNote) > 0 || state?.severity === 'error') return 'inventory-stock-hint inventory-hint-error';
    if (state?.severity === 'warn') return 'inventory-stock-hint inventory-hint-warn';
    if (rejectedNote || state) return 'inventory-stock-hint';
    return '';
  }

  // Dismiss state for the per-row Rate price hint (Sales Invoice/Sales Order
  // only) — keyed by row index, value is the fingerprint of the rate/disc/gst
  // combination that was dismissed. If the user edits the rate/disc/gst again
  // the fingerprint no longer matches, so the hint reappears for the new value.
  private readonly dismissedPriceHints = signal<Record<number, string>>({});

  isPriceHintDismissed(rowIndex: number, fingerprint: string): boolean {
    return this.dismissedPriceHints()[rowIndex] === fingerprint;
  }

  dismissPriceHint(rowIndex: number, fingerprint: string): void {
    this.dismissedPriceHints.update(map => ({ ...map, [rowIndex]: fingerprint }));
  }

  transactionPriceHintClass(hint: PriceHintView | null | undefined): string {
    if (!hint) return '';
    if (hint.severity === 'error') return 'inventory-stock-hint inventory-price-hint inventory-hint-error';
    if (hint.severity === 'warn') return 'inventory-stock-hint inventory-price-hint inventory-hint-warn';
    return 'inventory-stock-hint inventory-price-hint inventory-hint-info';
  }

  private transactionLineAmountPreview(row: string[], rowIndex?: number): {
    qty: number;
    rate: number;
    discountPct: number;
    gstPct: number;
    gstIncluded: boolean;
    discountAmount: number;
    taxAmount: number;
    total: number;
  } | null {
    const key = this.config?.key || '';
    const qtyIndex = key === 'purchaseReturn' || key === 'salesReturn'
      ? this.lineColumnIndex('Return Qty')
      : (key === 'goodsReceipt' || key === 'purchaseInvoice')
        ? this.lineColumnIndex('Accepted Qty')
        : this.findColumnIndex(['qty', 'quantity', 'received', 'accepted', 'produced']);
    const rateIndex = this.findColumnIndex(['rate', 'price', 'cost']);
    const amountIndex = this.amountColumnIndex();
    if (qtyIndex < 0 || rateIndex < 0 || amountIndex < 0) return null;

    const qty = this.parseCurrency(row[qtyIndex]);
    const rate = this.parseCurrency(row[rateIndex]);
    if (!Number.isFinite(qty) || !Number.isFinite(rate) || qty <= 0 || rate <= 0) return null;

    const discountIndex = this.findColumnIndex(['disc', 'discount']);
    const taxIndex = this.findColumnIndex(['gst', 'tax']);
    const discountPct = discountIndex >= 0 ? this.parseCurrency(row[discountIndex]) : 0;
    const gstPct = taxIndex >= 0 ? this.transactionLineGstPercent(row, this.config?.lineColumns?.[taxIndex]) : this.transactionLineGstPercent(row);
    const breakup = this.transactionLineTaxBreakup(qty, rate, discountPct, gstPct, rowIndex);
    return {
      qty,
      rate,
      discountPct,
      gstPct,
      gstIncluded: breakup.gstIncluded,
      discountAmount: breakup.discountAmount,
      taxAmount: breakup.taxAmount,
      total: breakup.total
    };
  }

  // Rate entry hint for Sales Invoice/Sales Order — flags when the rate being
  // billed to the customer is below the product's cost price (a real loss),
  // or simply above/below its usual Selling Price (informational), factoring
  // in the line's own Disc % and GST so the note shows the actual net amount
  // the customer will be charged, not just the raw rate.
  private transactionPriceHint(column: string, row: string[], rowIndex: number): PriceHintView | null {
    const key = this.config?.key || '';
    if (this.config?.kind !== 'transaction') return null;
    if (this.compactKey(column) !== 'rate') return null;

    const preview = this.transactionLineAmountPreview(row, rowIndex);
    if (!preview) return null;

    const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const formula = preview.gstIncluded
      ? `Qty ${fmt(preview.qty)} x Rs. ${fmt(preview.rate)} - Disc ${fmt(preview.discountPct)}% (GST ${fmt(preview.gstPct)}% included) = Rs. ${fmt(preview.total)}`
      : `Qty ${fmt(preview.qty)} x Rs. ${fmt(preview.rate)} - Disc ${fmt(preview.discountPct)}% + GST ${fmt(preview.gstPct)}% = Rs. ${fmt(preview.total)}`;
    const fingerprint = `${key}|${preview.qty}|${preview.rate}|${preview.discountPct}|${preview.gstPct}|${preview.gstIncluded}|${preview.total}`;

    // Sales Order's Rate is only the price expected/quoted to the customer,
    // not a bounded billing rate — no cost/selling-price comparison here,
    // just the plain calculation breakdown. Sales Invoice keeps the
    // cost/selling-price comparison below.
    if (key !== 'salesInvoice') {
      return { severity: 'info', fingerprint, message: formula };
    }

    const product = this.lineRowProduct(row);
    const productSellingForLineUom = this.productSalesPriceForLineUom(product, row, this.productSellingPrice(product, row));
    const sellingPrice = this.firstPositiveCurrencyValue(
      String(this.lineValue(row, ['selling price'])),
      productSellingForLineUom
    );
    const costPrice = this.productCostPriceForLineUom(product, row);

    if (costPrice > 0 && preview.rate < costPrice) {
      const loss = costPrice - preview.rate;
      return {
        severity: 'error',
        fingerprint,
        message: `${formula}. Below cost Rs. ${fmt(costPrice)}; loss Rs. ${fmt(loss)}/unit.`
      };
    }
    if (sellingPrice > 0 && preview.rate !== sellingPrice) {
      const diff = preview.rate - sellingPrice;
      const pct = (Math.abs(diff) / sellingPrice) * 100;
      return {
        severity: diff < 0 ? 'warn' : 'info',
        fingerprint,
        message: `${formula}. ${fmt(Math.abs(diff))} (${fmt(pct)}%) ${diff < 0 ? 'below' : 'above'} selling price Rs. ${fmt(sellingPrice)}.`
      };
    }
    return { severity: 'info', fingerprint, message: formula };
  }

  // Hard bounds on the Rate a Sales Invoice line can be billed at: never
  // above MRP (when the product has one), never below cost price. Checked on
  // the raw Rate before Disc % — an applied discount is a visible, deliberate
  // business decision and can legitimately bring the net amount below either
  // bound; this only blocks a wrong Rate typed directly.
  // Sales Order is deliberately excluded — its Rate is only the price
  // expected/quoted to the customer, not a bounded billing rate, so no
  // MRP/cost validation applies there.
  private validateSalesRateBounds(): string {
    if (this.config?.key !== 'salesInvoice') return '';
    const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    for (const row of this.activeSalesLineRows()) {
      const rate = this.lineNumber(row, ['rate']);
      if (!Number.isFinite(rate) || rate <= 0) continue;
      const product = this.lineRowProduct(row);
      const productMrpForLineUom = this.productSalesPriceForLineUom(product, row, this.productMrp(product));
      const mrp = this.firstPositiveCurrencyValue(String(this.lineValue(row, ['mrp'])), productMrpForLineUom);
      const costPrice = this.productCostPriceForLineUom(product, row);
      const productName = this.lineValue(row, ['product', 'item', 'sku']) || 'Line item';
      if (mrp > 0 && rate > mrp) {
        return `${productName}: Rate ₹${fmt(rate)} cannot exceed MRP ₹${fmt(mrp)}.`;
      }
      if (costPrice > 0 && rate < costPrice) {
        return `${productName}: Rate ₹${fmt(rate)} cannot be less than cost price ₹${fmt(costPrice)}.`;
      }
    }
    return '';
  }

  // GRN's Accepted Qty cell shows a live "Rejected: N" note (Received - Accepted)
  // once the user has entered an Accepted Qty — computed, never a free-text column.
  private grnRejectedQtyNote(column: string, row: string[]): string {
    if (!this.isInwardStockControlQtyColumn(column)) return '';
    const acceptedRaw = this.lineValue(row, ['accepted']).trim();
    if (!acceptedRaw) return '';
    const received = this.lineNumber(row, ['received']);
    const accepted = this.lineNumber(row, ['accepted']);
    if (accepted > received) return 'Accepted exceeds Received';
    return `Rejected: ${received - accepted}`;
  }

  private rejectedQtyFromNote(note: string): number {
    const match = /^Rejected:\s*([0-9.]+)/i.exec(note || '');
    return Number(match?.[1] || 0);
  }

  // Transport Details is a single free-text column on the backend (GrnUpsertRequest.TransportDetails),
  // so the Yes/No + Vehicle No / Driver Name / Contact No fields compose into one delimited string.
  private grnComposeTransportDetails(v: Record<string, any>): string | null {
    if (v['hasTransportDetails'] !== 'Yes') return null;
    const parts = [
      v['transportVehicleNo'] ? `Vehicle: ${v['transportVehicleNo']}` : '',
      v['transportDriverName'] ? `Driver: ${v['transportDriverName']}` : '',
      v['transportContactNo'] ? `Contact: ${v['transportContactNo']}` : ''
    ].filter(Boolean);
    return parts.length ? parts.join(' | ') : null;
  }

  private grnParseTransportDetails(text: string | null | undefined): {
    hasTransportDetails: string; transportVehicleNo: string; transportDriverName: string; transportContactNo: string;
  } {
    const raw = String(text || '').trim();
    if (!raw) return { hasTransportDetails: 'No', transportVehicleNo: '', transportDriverName: '', transportContactNo: '' };
    const extract = (label: string) => {
      const match = raw.match(new RegExp(`${label}:\\s*([^|]+)`));
      return match ? match[1].trim() : '';
    };
    return {
      hasTransportDetails: 'Yes',
      transportVehicleNo: extract('Vehicle'),
      transportDriverName: extract('Driver'),
      transportContactNo: extract('Contact')
    };
  }

  // Name-based (not positional) mapping from a saved GRN item back into a grid row,
  // so loading a record for edit stays correct regardless of lineColumns order/count.
  private grnItemToLineRow(item: any): string[] {
    const row = this.blankLineRow();
    const set = (column: string, value: string) => {
      const idx = this.lineColumnIndex(column);
      if (idx >= 0) row[idx] = value;
    };
    set('Product', item.product_name || item.productName || '');
    set('Variant', item.variant_name || item.variantName || '');
    set('Attribute', item.attribute_value || item.attributeValue || '');
    set('UOM', item.uom_name || item.uomName || '');
    set('Received Qty', String(item.received_qty ?? item.receivedQty ?? ''));
    set('Accepted Qty', String(item.accepted_qty ?? item.acceptedQty ?? ''));
    set('Rate', String(item.rate ?? ''));
    set('Disc %', String(item.discount_pct ?? item.discountPct ?? ''));
    set('GST', String(item.gst_rate ?? item.gstRate ?? ''));
    set('Batch No', item.batch_no || item.batchNo || '');
    set('Serial No', item.serial_no || item.serialNo || '');
    set('Expiry Date', item.expiry_date || item.expiryDate || '');
    set('Amount', String(item.amount ?? ''));
    return this.normalizeLineRow(row);
  }

  // ── Available-stock hints for DC/SI (rule 11) ────────────────────────────
  // Read-only cache keyed by "productId_variantId_warehouseId", populated by
  // fetchAvailableStockForLine() via sp_get_available_stock. transactionStock
  // ControlState() below only reads from this cache (it must stay synchronous
  // for template binding) — the fetch itself runs async and re-renders once
  // the response lands, same tick-later pattern as any other signal update.
  private purchaseInvoiceItemToLineRow(item: any): string[] {
    const row = this.blankLineRow();
    const set = (column: string, value: string) => {
      const idx = this.lineColumnIndex(column);
      if (idx >= 0) row[idx] = value;
    };
    const qty = String(item.qty ?? item.accepted_qty ?? item.acceptedQty ?? item.received_qty ?? item.receivedQty ?? '');
    set('Product', item.product_name || item.productName || '');
    set('Variant', item.variant_name || item.variantName || '');
    set('Attribute', this.referenceItemAttributeText(item));
    set('UOM', item.uom_name || item.uomName || '');
    set('Received Qty', qty);
    set('Accepted Qty', qty);
    set('Rate', String(item.rate ?? ''));
    set('MRP', String(item.mrp ?? item.Mrp ?? ''));
    set('Selling Price', String(item.selling_price ?? item.sellingPrice ?? ''));
    set('Disc %', String(item.discount_pct ?? item.discountPct ?? ''));
    set('GST', String(item.gst_rate ?? item.gstRate ?? ''));
    set('Batch No', item.batch_no || item.batchNo || '');
    set('Serial No', item.serial_no || item.serialNo || '');
    set('Expiry Date', item.expiry_date || item.expiryDate || '');
    set('Amount', String(item.amount ?? ''));
    return this.normalizeLineRow(row);
  }

  // Cache stores the raw per-warehouse rows the backend already returns
  // (rather than a single aggregated number) so the hint below can show
  // both "stock here" and "stock at other warehouses" instead of a single
  // blended total.
  private readonly availableStockCache = signal<Record<string, AvailableStock[]>>({});
  private readonly availableStockFetching = new Set<string>();

  private availableStockKey(
    productId: number | null | undefined,
    variantId: number | null | undefined,
    attributeValue?: string | null
  ): string {
    return `${productId || 0}_${variantId || 0}_${this.normalizeKey(attributeValue || '')}`;
  }

  private sumStockRows(rows: AvailableStock[]): { on_hand: number; pending_dc_qty: number; available: number } {
    return rows.reduce((acc, row) => ({
      on_hand: acc.on_hand + Number(row.on_hand || 0),
      pending_dc_qty: acc.pending_dc_qty + Number(row.pending_dc_qty || 0),
      available: acc.available + Number(row.available || 0)
    }), { on_hand: 0, pending_dc_qty: 0, available: 0 });
  }

  private stockRowForWarehouse(rows: AvailableStock[], warehouseId: number | null): AvailableStock | null {
    if (!warehouseId) return null;
    return rows.find(row => row.warehouse_id === warehouseId) ?? null;
  }

  private otherWarehousesWithStock(rows: AvailableStock[], warehouseId: number | null): AvailableStock[] {
    return rows
      .filter(row => (!warehouseId || row.warehouse_id !== warehouseId) && Number(row.available || 0) > 0)
      .sort((a, b) => Number(b.available || 0) - Number(a.available || 0));
  }

  private fetchAvailableStockForLine(
    productId: number | null,
    variantId: number | null,
    attributeValue?: string | null
  ): void {
    if (!productId && !variantId) return;
    const cacheKey = this.availableStockKey(productId, variantId, attributeValue);
    if (this.availableStockCache()[cacheKey] || this.availableStockFetching.has(cacheKey)) return;
    this.availableStockFetching.add(cacheKey);
    // No warehouseId sent — the backend returns every warehouse's row for
    // this product so the hint can show the full cross-warehouse picture.
    this.txService.getAvailableStock({ productId, variantId, attributeValue })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.availableStockFetching.delete(cacheKey);
          this.availableStockCache.update(map => ({ ...map, [cacheKey]: res.data || [] }));
        },
        error: () => this.availableStockFetching.delete(cacheKey)
      });
  }

  private salesOutwardStockControlState(
    column: string,
    row: string[],
    columnIndex: number,
    rowIndex?: number
  ): { message: string; severity: 'info' | 'warn' | 'error' } | null {
    const key = this.config?.key || '';
    // Sales Order is an estimate of customer demand, not a stock commitment —
    // the goods can still be procured after the order is placed, so no
    // available-stock hint/check applies here. Only Delivery Challan and
    // Sales Invoice actually move stock out, so only those get this hint.
    if (key !== 'deliveryChallan' && key !== 'salesInvoice') return null;
    const actionableColumn = key === 'deliveryChallan' ? 'dispatch qty' : 'qty';
    if (String(column || '').trim().toLowerCase() !== actionableColumn) return null;

    const product = this.findProductBySelection(this.lineValue(row, ['product', 'item', 'sku']));
    if (!product) return null;
    const variantText = this.lineValue(row, ['variant']);
    const variantId = variantText
      ? this.productVariantOptionObjects(product).find(option => this.productVariantOptionMatches(option, variantText))?.id ?? null
      : null;
    // Sales Order has no warehouse field any more — warehouseId stays null
    // there, and the hint below shows the cross-warehouse breakdown instead
    // of a single "here" figure.
    const warehouseField = key === 'deliveryChallan' ? (this.formValues()['fromWarehouse'] || this.formValues()['fromWarehouseId'])
      : key === 'salesInvoice' ? (this.formValues()['warehouse'] || this.formValues()['warehouseId'])
      : null;
    const warehouse = this.findWarehouseBySelection(warehouseField);
    const warehouseId = warehouse?.id ?? this.optionalNumber(warehouseField) ?? null;
    const attr = this.resolveLineAttribute(product, variantText, this.transactionLineAttributeText(row, rowIndex));
    const attributeValue = attr.attribute_value || null;

    this.fetchAvailableStockForLine(product.id ?? null, null);
    if (variantId) this.fetchAvailableStockForLine(product.id ?? null, variantId);
    if (variantId && attributeValue) this.fetchAvailableStockForLine(product.id ?? null, variantId, attributeValue);

    const cache = this.availableStockCache();
    const productRows = cache[this.availableStockKey(product.id ?? null, null)];
    const variantRows = variantId ? cache[this.availableStockKey(product.id ?? null, variantId)] : null;
    const attributeRows = variantId && attributeValue ? cache[this.availableStockKey(product.id ?? null, variantId, attributeValue)] : null;
    const rows = attributeRows || variantRows || productRows;
    if (!rows) return null;

    const qty = this.parseDecimalNumber(row[columnIndex]);
    const lineUom = this.uomNameFromSelection(this.lineValue(row, ['uom'])) || this.productBaseUomLabel(product);
    const lineFactor = this.productUomConversionFactorForSelection(product, lineUom, key);
    const uomLabel = lineUom ? ` ${lineUom}` : '';
    const valueInLineUom = (value: number) => lineFactor > 0 ? Number(value || 0) / lineFactor : Number(value || 0);
    const fmt = (value: number) => `${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 })}${uomLabel}`;
    const displayRows = rows.map(stockRow => ({
      ...stockRow,
      on_hand: valueInLineUom(stockRow.on_hand),
      pending_dc_qty: valueInLineUom(stockRow.pending_dc_qty),
      available: valueInLineUom(stockRow.available)
    }));

    if (warehouseId) {
      const here = this.stockRowForWarehouse(displayRows, warehouseId);
      const hereAvailable = here?.available ?? 0;
      if (Number.isFinite(qty) && qty > hereAvailable) {
        const short = qty - hereAvailable;
        const others = this.otherWarehousesWithStock(displayRows, warehouseId).slice(0, 2);
        const message = others.length
          ? `Short by ${fmt(short)} here — available at ${others.map(o => `${o.warehouse_name || 'another warehouse'}: ${fmt(o.available)}`).join(', ')}`
          : `Short by ${fmt(short)} here — no stock at other warehouses either`;
        return { message, severity: 'warn' };
      }
      return { message: `Available here: ${fmt(hereAvailable)}`, severity: 'info' };
    }

    // No specific warehouse to compare against (Sales Order) — surface the
    // cross-warehouse breakdown directly.
    const total = this.sumStockRows(displayRows);
    const breakdown = this.otherWarehousesWithStock(displayRows, null)
      .slice(0, 3)
      .map(r => `${r.warehouse_name || 'Warehouse'}: ${fmt(r.available)}`)
      .join(', ');
    const message = `Available (all warehouses): ${fmt(total.available)}${breakdown ? ` — ${breakdown}` : ''}`;
    return { message, severity: Number.isFinite(qty) && qty > total.available ? 'warn' : 'info' };
  }

  // Scans the current SI grid against the already-populated availableStockCache
  // (built as the user filled in product/variant/warehouse per line) and
  // returns a human-readable line per row that exceeds available stock.
  // Read-only — no new stock mutation path, per rule 13.
  private overAvailableStockLines(): string[] {
    if (this.config?.key !== 'salesInvoice') return [];
    const warehouse = this.findWarehouseBySelection(this.formValues()['warehouse'] || this.formValues()['warehouseId']);
    const warehouseId = warehouse?.id ?? this.optionalNumber(this.formValues()['warehouseId']) ?? null;
    const cache = this.availableStockCache();
    const results: string[] = [];
    this.activeSalesLineRows().forEach((row, index) => {
      const productName = this.lineValue(row, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      if (!product) return;
      const variantText = this.lineValue(row, ['variant']);
      const variantId = variantText
        ? this.productVariantOptionObjects(product).find(option => this.productVariantOptionMatches(option, variantText))?.id ?? null
        : null;
      const qty = this.lineNumber(row, ['qty']);
      const attr = this.resolveLineAttribute(product, variantText, this.transactionLineAttributeText(row, index));
      const attributeValue = attr.attribute_value || null;
      const rows = attributeValue && variantId
        ? cache[this.availableStockKey(product.id ?? null, variantId, attributeValue)]
        : variantId
          ? cache[this.availableStockKey(product.id ?? null, variantId)]
          : cache[this.availableStockKey(product.id ?? null, null)];
      if (!rows) return;
      const available = warehouseId
        ? (this.stockRowForWarehouse(rows, warehouseId)?.available ?? 0)
        : this.sumStockRows(rows).available;
      const lineUom = this.uomNameFromSelection(this.lineValue(row, ['uom'])) || this.productBaseUomLabel(product);
      const lineFactor = this.productUomConversionFactorForSelection(product, lineUom, this.config?.key || '');
      const availableInLineUom = lineFactor > 0 ? available / lineFactor : available;
      if (qty > availableInLineUom) {
        const scope = attributeValue ? ` (${attributeValue})` : variantText ? ` (${variantText})` : '';
        const uomLabel = lineUom ? ` ${lineUom}` : '';
        results.push(`${product.product_name || productName}${scope}: qty ${qty}${uomLabel} > available ${this.formatStockLimitQty(availableInLineUom)}${uomLabel}`);
      }
    });
    return results;
  }

  private transactionStockControlState(
    column: string,
    row: string[],
    columnIndex: number,
    rowIndex?: number
  ): { message: string; severity: 'info' | 'warn' | 'error' } | null {
    if (this.config?.kind !== 'transaction') return null;
    const salesOutwardState = this.salesOutwardStockControlState(column, row, columnIndex, rowIndex);
    if (salesOutwardState) return salesOutwardState;
    if (this.config?.key !== 'goodsReceipt' && this.config?.key !== 'purchaseInvoice') return null;
    if (!this.isInwardStockControlQtyColumn(column)) return null;

    const product = this.findProductBySelection(this.lineValue(row, ['product', 'item', 'sku', 'material']));
    if (!product || product.tracks_inventory === false || product.is_service) return null;

    const variantText = this.lineValue(row, ['variant']);
    const variantId = variantText
      ? this.productVariantOptionObjects(product).find(option => this.productVariantOptionMatches(option, variantText))?.id ?? null
      : null;
    const attributeText = this.transactionLineAttributeText(row, rowIndex);
    const limits = this.productStockLimitsForLine(product, variantId, attributeText);
    const uom = this.uomNameFromSelection(this.lineValue(row, ['uom'])) || this.productBaseUomLabel(product);
    const factor = this.productUomConversionFactorForSelection(product, uom, this.config?.key || '');
    const valueInRowUom = (value: number) => factor > 0 ? value / factor : value;
    let qty = this.parseDecimalNumber(row[columnIndex]);
    if (!Number.isFinite(qty)) {
      const receivedQty = this.lineNumber(row, ['received']);
      qty = receivedQty > 0 ? receivedQty : qty;
    }
    const fmt = (value: number) => this.formatStockLimitQty(valueInRowUom(value));
    const uomLabel = uom ? ` ${uom}` : '';

    // No stock-control numbers configured on this product at all — allow any
    // qty with no message. Only once at least one of Min/Max/Reorder Level/
    // Reorder Qty is actually set does that specific limit get enforced below.
    const hasLimits = [limits.minStock, limits.maxStock, limits.reorderLevel, limits.reorderQty].some(value => Number(value) > 0);
    if (!hasLimits) return null;

    if (Number.isFinite(qty) && qty > 0) {
      if (limits.maxStock > 0 && qty > valueInRowUom(limits.maxStock)) {
        return { message: `Above max ${fmt(limits.maxStock)}${uomLabel}`, severity: 'error' };
      }
      // Reorder Qty on the Product Master is the Minimum Order Qty for this
      // line — block if entered below it, same hard-error treatment as
      // exceeding Max Stock. (Previously this was checked the other way,
      // as an upper cap, which meant a qty entered below it silently saved
      // with no validation at all.)
      if (limits.reorderQty > 0 && qty < valueInRowUom(limits.reorderQty)) {
        return { message: `Below min order ${fmt(limits.reorderQty)}${uomLabel}`, severity: 'error' };
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
    if (limits.reorderQty > 0) parts.push(`Min order ${fmt(limits.reorderQty)}`);
    return parts.length
      ? { message: `${parts.join(' | ')}${uomLabel}`, severity: 'info' }
      : null;
  }

  private stockControlValidationMessage(): string {
    if (this.config?.kind !== 'transaction') return '';
    if (this.config?.key !== 'goodsReceipt' && this.config?.key !== 'purchaseInvoice') return '';
    this.directEntryLineRows();
    const columns = this.config?.lineColumns || [];
    for (const [rowIndex, row] of this.entryLineRows().map(item => this.normalizeLineRow(item)).entries()) {
      const productName = this.lineValue(row, ['product', 'item', 'sku', 'material']);
      if (!productName) continue;
      for (const [columnIndex, column] of columns.entries()) {
        const state = this.transactionStockControlState(column, row, columnIndex, rowIndex);
        if (state?.severity === 'error') {
          return `"${productName}": ${state.message}. Reduce the qty before saving.`;
        }
      }
    }
    return '';
  }

  // Guards against the "empty" GRN that used to slip through: the generic
  // "at least one item" check only confirmed the items array was non-empty,
  // not that any line actually had a product or a non-zero qty — a row with
  // a Disc% default of '0' and nothing else already counted as "an item".
  private validateGrnLineItems(items: any[]): string {
    if (!Array.isArray(items) || !items.length) {
      return 'Add at least one product line to the GRN before saving.';
    }
    for (const item of items) {
      const productName = String(item?.product_name || '').trim();
      if (!productName) return 'Every GRN line needs a Product selected.';
      const received = Number(item?.received_qty) || 0;
      const accepted = Number(item?.accepted_qty) || 0;
      if (received <= 0 && accepted <= 0) {
        return `"${productName}": enter Received Qty or Accepted Qty — a line with zero quantity can't be saved.`;
      }
    }
    return '';
  }

  private validatePurchaseReturnLineItems(items: any[]): string {
    if (!Array.isArray(items) || !items.length) {
      return 'Add at least one product line to the Purchase Return before saving.';
    }
    for (const item of items) {
      const productName = String(item?.product_name || '').trim();
      if (!productName) return 'Every Purchase Return line needs a Product selected.';
      const invoiceQty = Number(item?.grn_qty) || 0;
      const returnQty = Number(item?.return_qty) || 0;
      if (returnQty <= 0) return `"${productName}": Return Qty must be greater than zero.`;
      if (invoiceQty > 0 && returnQty > invoiceQty) {
        return `"${productName}": Return Qty cannot be greater than Invoice Qty.`;
      }
    }
    return '';
  }

  // Sales-side mirror of validatePurchaseReturnLineItems above — Sales
  // Return previously had no line-level qty check at all, so a Return Qty
  // greater than what was invoiced could be saved outright. invoiced_qty
  // is set on salesReturnItems() by setEntryLineCell's UOM-switch handler
  // (converted into whatever UOM the row's UOM cell currently shows), so by
  // the time this runs both sides are denominated in the same UOM.
  private validateSalesReturnLineItems(items: any[]): string {
    if (!Array.isArray(items) || !items.length) {
      return 'Add at least one product line to the Sales Return before saving.';
    }
    for (const item of items) {
      const productName = String(item?.product_name || '').trim();
      if (!productName) return 'Every Sales Return line needs a Product selected.';
      const invoiceQty = Number(item?.invoiced_qty) || 0;
      const returnQty = Number(item?.return_qty) || 0;
      if (returnQty <= 0) return `"${productName}": Return Qty must be greater than zero.`;
      if (invoiceQty > 0 && returnQty > invoiceQty) {
        return `"${productName}": Return Qty cannot be greater than Invoice Qty.`;
      }
    }
    return '';
  }

  private isInwardStockControlQtyColumn(column: string): boolean {
    const key = this.normalizeKey(column);
    if (this.config?.key === 'goodsReceipt') {
      return key === 'acceptedqty' || (key.includes('accepted') && key.includes('qty'));
    }
    if (this.config?.key === 'purchaseInvoice') {
      return key === 'acceptedqty'
        || key === 'invoiceqty'
        || (key.includes('accepted') && key.includes('qty'))
        || (key.includes('invoice') && key.includes('qty'));
    }
    return false;
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
    if (this.config?.key === 'attributeMaster' && key === 'status') return ['Active', 'Inactive'];
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
    if (key.includes('variant') && rowProduct) return this.variantOptionsForTransactionRow(rowProduct, row);
    if (key.includes('variant') && this.config?.kind === 'transaction') return [];
    if (key.includes('variant')) return this.variantOptions;
    if (key === 'attribute' && row) return this.lineAttributeOptionsForVariantRow(rowProduct, this.lineValue(row, ['variant']));
    if (key.includes('uom') && rowProduct) {
      const currentUom = row ? this.lineValue(row, ['uom']) : '';
      return this.mergeOptions(this.productUomOptionsForTransaction(rowProduct), currentUom ? [currentUom] : []);
    }
    if (key.includes('uom')) {
      const currentUom = row ? this.lineValue(row, ['uom']) : '';
      return this.mergeOptions(this.uomOptions, currentUom ? [currentUom] : []);
    }
    if (key.includes('rounding')) return ['Exact', '2 Decimals', 'Whole Number', 'Commercial Rounding'];
    if (key.includes('is purchase') || key.includes('is sales') || key === 'active') return ['Yes', 'No'];
    if (key.includes('gst') || key.includes('tax')) return this.config?.kind === 'transaction' ? [] : ['0%', '5%', '12%', '18%', '28%'];
    if (this.isPolicyAwarePurchaseLineGrid() && this.isPolicyLineColumn(column)) return [];
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
    return this.config?.key === 'goodsReceipt'
      || this.config?.key === 'purchaseInvoice'
      || this.config?.key === 'salesOrder'
      || this.config?.key === 'salesInvoice'
      || this.config?.key === 'salesReturn'
      || this.config?.key === 'deliveryChallan';
  }

  // GST auto-fill on product selection, same as GRN/Purchase Invoice — but
  // deliberately its own gate rather than folding into
  // isPolicyAwarePurchaseLineGrid(), which also drives purchase-only
  // behaviors (dynamic attribute/serial columns, Accepted-Qty-driven Amount
  // recalculation) that must never activate on Sales Order/Invoice.
  private isGstAutoFillLineGrid(): boolean {
    return this.isPolicyAwarePurchaseLineGrid()
      || this.config?.key === 'salesOrder'
      || this.config?.key === 'salesInvoice';
  }

  // Screens whose grid should hide Batch No / Serial No / Expiry Date columns
  // entirely when nothing in the current rows needs them (see
  // isLineColumnVisible below) — kept separate from isPolicyAwarePurchaseLineGrid
  // so adding Purchase Return here doesn't also switch on that gate's other,
  // unrelated purchase-only behaviors (dynamic attribute/serial columns,
  // Accepted-Qty-driven Amount recalculation) for a screen that doesn't use them.
  private isPolicyColumnHidingScreen(): boolean {
    return this.isPolicyAwarePurchaseLineGrid() || this.config?.key === 'purchaseReturn';
  }

  private isPolicyLineColumn(column: string): boolean {
    const key = String(column || '').toLowerCase();
    return key.includes('batch') || key.includes('lot') || key.includes('serial') || key.includes('expiry');
  }

  private shouldShowPolicyLineColumn(column: string): boolean {
    if (!this.isPolicyLineColumn(column)) return true;
    if (this.isGrnLinkedPurchaseInvoice()) {
      return this.entryLineRows().some(row => !!this.lineCellValue(this.normalizeLineRow(row), column));
    }

    this.directEntryLineRows();
    return this.entryLineRows().some(row => {
      const normalized = this.normalizeLineRow(row);
      if (this.lineCellValue(normalized, column)) return true;
      const productName = this.lineValue(normalized, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      return !!product && this.productSupportsLinePolicy(product, column);
    });
  }

  // Per-column visibility for the line grid's <th>/<td> loops — a Batch No /
  // Serial No / Expiry Date column disappears entirely on screens in
  // isPolicyColumnHidingScreen() when no current row either already has a
  // value there or is for a product configured to need it (batch_applicable
  // / serial_applicable / expiry_applicable). Any other column, or any
  // screen not in that set, is always visible — this only ever hides
  // columns that are structurally irrelevant right now, never one the user
  // could otherwise type into (Rate/GST/Qty/etc. are untouched).
  isLineColumnVisible(column: string): boolean {
    if (!this.isPolicyColumnHidingScreen()) return true;
    return this.shouldShowPolicyLineColumn(column);
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
    if (this.config?.key === 'attributeMaster' && key.includes('sort order')) return 'number';
    return 'text';
  }

  lineCellInputMode(column: string): 'decimal' | 'numeric' | 'text' | null {
    const key = column.toLowerCase();
    if (key.includes('factor') || key.includes('rate') || key.includes('amount') || key.includes('price') || key.includes('mrp') || key.includes('qty') || key.includes('quantity') || key.includes('gst') || key.includes('tax') || key.includes('disc')) {
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

  private recalculateLineRow(row: string[], rowIndex?: number): void {
    // GRN bills on what was actually kept, not what arrived — Amount = Accepted Qty x Rate.
    // The generic first-match lookup below would otherwise lock onto "Received Qty"
    // since it appears earlier in GRN's lineColumns than "Accepted Qty".
    const key = this.config?.key || '';
    if (key === 'debitNote' || key === 'creditNote') {
      const amountIndex = this.lineColumnIndex('Amount');
      const gstPctIndex = this.lineColumnIndex('GST %');
      const gstAmountIndex = this.lineColumnIndex('GST Amount');
      const totalIndex = this.lineColumnIndex('Total Amount');
      if (amountIndex >= 0 && gstPctIndex >= 0 && gstAmountIndex >= 0 && totalIndex >= 0) {
        const amount = this.parseCurrency(row[amountIndex]);
        const gstPct = this.parseCurrency(row[gstPctIndex]);
        const gstAmount = amount * gstPct / 100;
        row[gstAmountIndex] = gstAmount ? gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '';
        row[totalIndex] = (amount + gstAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
      }
      return;
    }
    const qtyIndex = key === 'purchaseReturn' || key === 'salesReturn'
      ? this.lineColumnIndex('Return Qty')
      : (key === 'goodsReceipt' || key === 'purchaseInvoice')
        ? this.lineColumnIndex('Accepted Qty')
        : this.findColumnIndex(['qty', 'quantity', 'received', 'accepted', 'produced']);
    const rateIndex = this.findColumnIndex(['rate', 'price', 'cost']);
    const discountIndex = this.findColumnIndex(['disc', 'discount']);
    const taxIndex = this.findColumnIndex(['gst', 'tax']);
    const amountIndex = this.amountColumnIndex();

    if (amountIndex < 0 || qtyIndex < 0 || rateIndex < 0) return;

    const qty = this.parseCurrency(row[qtyIndex]);
    const rate = this.parseCurrency(row[rateIndex]);
    const discountPercent = discountIndex >= 0 ? this.parseCurrency(row[discountIndex]) : 0;
    const taxPercent = taxIndex >= 0 ? this.transactionLineGstPercent(row, this.config?.lineColumns?.[taxIndex]) : this.transactionLineGstPercent(row);
    const total = this.transactionLineTaxBreakup(qty, rate, discountPercent, taxPercent, rowIndex).total;
    row[amountIndex] = Math.round(total).toLocaleString('en-IN');
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

  isPurchaseTransactionKey(key = this.config?.key || ''): boolean {
    return key === 'purchaseRequisition'
      || key === 'requestForQuotation'
      || key === 'purchaseOrder'
      || key === 'goodsReceipt'
      || key === 'purchaseInvoice'
      || key === 'purchaseReturn'
      || key === 'debitNote';
  }

  isSalesTransactionKey(key = this.config?.key || ''): boolean {
    return key === 'estimation'
      || key === 'proformaInvoice'
      || key === 'salesInvoice'
      || key === 'salesOrder'
      || key === 'salesQuotation'
      || key === 'deliveryChallan'
      || key === 'salesReturn'
      || key === 'creditNote';
  }

  purchaseReferenceType(key = this.config?.key || ''): string {
    if (key === 'requestForQuotation') return 'PR';
    if (key === 'purchaseOrder') return 'RFQ';
    if (key === 'goodsReceipt') return 'PO';
    if (key === 'purchaseInvoice') return 'GRN';
    if (key === 'purchaseReturn') return 'PI';
    if (key === 'debitNote') return 'PURCHASERETURN';
    return '';
  }

  salesReferenceType(key = this.config?.key || ''): string {
    if (key === 'deliveryChallan') return 'SO';
    if (key === 'salesInvoice') return 'SO';
    if (key === 'salesReturn') return 'SI';
    if (key === 'creditNote') return 'SALESRETURN';
    return '';
  }

  private purchaseInvoiceGrnRefKeys(grnId: any, grnNumber: any): string[] {
    const keys: string[] = [];
    const id = this.optionalNumber(grnId);
    const number = String(grnNumber || '').trim();
    if (id) keys.push(`id:${id}`);
    if (number) keys.push(`no:${this.normalizeKey(number)}`);
    return keys;
  }

  private purchaseInvoiceUsedGrnRefKeys(): Set<string> {
    const keys = new Set(this.purchaseInvoiceReservedGrnRefKeys);
    if (this.config?.key !== 'purchaseInvoice') return keys;

    this.savedRecordObjects().forEach(record => {
      const status = this.normalizeKey(record?.status || 'draft');
      if (status === 'cancelled') return;
      this.purchaseInvoiceGrnRefKeys(
        record?.grn_id ?? record?.grnId,
        record?.grn_number || record?.grnNumber
      ).forEach(key => keys.add(key));
    });
    return keys;
  }

  private filterPurchaseInvoiceAvailableGrnDocs(docs: PurchaseRefDoc[]): PurchaseRefDoc[] {
    if (this.config?.key !== 'purchaseInvoice') return docs;
    const usedKeys = this.purchaseInvoiceUsedGrnRefKeys();
    if (!usedKeys.size) return docs;
    return docs.filter(doc =>
      !this.purchaseInvoiceGrnRefKeys(doc.id, doc.doc_number).some(key => usedKeys.has(key))
    );
  }

  private purchaseReturnPiRefKeys(piId: number | null, piNumber: string): string[] {
    const keys: string[] = [];
    if (piId) keys.push(`id:${piId}`);
    const number = String(piNumber || '').trim().toLowerCase();
    if (number) keys.push(`no:${number}`);
    return keys;
  }

  private purchaseReturnLineKey(item: any): string {
    const idOrName = (idKey: string, nameKey: string, altNameKey?: string) => {
      const id = item?.[idKey];
      if (id !== undefined && id !== null && String(id).trim() !== '') return `id:${id}`;
      return `name:${this.normalizeKey(item?.[nameKey] ?? (altNameKey ? item?.[altNameKey] : ''))}`;
    };
    return [
      idOrName('product_id', 'product_name', 'productName'),
      idOrName('variant_id', 'variant_name', 'variantName'),
      idOrName('attribute_id', 'attribute_name', 'attributeName'),
      this.normalizeKey(item?.attribute_value ?? item?.attributeValue ?? '')
    ].join('|');
  }

  private purchaseReturnReservedQtyForPiLine(doc: PurchaseRefDoc, item: any): number {
    const refKeys = new Set(this.purchaseReturnPiRefKeys(doc.id, doc.doc_number));
    if (!refKeys.size) return 0;
    const lineKey = this.purchaseReturnLineKey(item);
    return this.segmentFilteredRecords(this.savedRecordObjects())
      .filter(record => this.normalizeKey(record?.status || 'draft') !== 'cancelled')
      .filter(record => this.purchaseReturnPiRefKeys(
        this.optionalNumber(record?.pi_id ?? record?.piId),
        record?.pi_number || record?.piNumber || ''
      ).some(key => refKeys.has(key)))
      .flatMap(record => record?.items || [])
      .filter(returnItem => this.purchaseReturnLineKey(returnItem) === lineKey)
      .reduce((sum, returnItem) => sum + (Number(returnItem?.return_qty ?? returnItem?.returnQty) || 0), 0);
  }

  private purchaseReturnDocHasRemainingQty(doc: PurchaseRefDoc): boolean {
    const items = Array.isArray(doc.items) ? doc.items : [];
    if (!items.length) return true;
    return items.some(item => {
      const explicitRemaining = item?.remaining_qty ?? item?.remainingQty;
      if (explicitRemaining !== undefined && explicitRemaining !== null && String(explicitRemaining).trim() !== '') {
        return (Number(explicitRemaining) || 0) > 0;
      }
      const invoiceQty = Number(item?.qty ?? item?.invoice_qty ?? item?.invoiceQty ?? item?.received_qty ?? item?.receivedQty ?? 0) || 0;
      if (invoiceQty <= 0) return true;
      const reservedQty = this.purchaseReturnReservedQtyForPiLine(doc, item);
      return reservedQty < invoiceQty;
    });
  }

  private filterPurchaseReturnAvailablePiDocs(docs: PurchaseRefDoc[]): PurchaseRefDoc[] {
    if (this.config?.key !== 'purchaseReturn') return docs;
    return docs.filter(doc => this.purchaseReturnDocHasRemainingQty(doc));
  }

  // Mirror of purchaseReturnPiRefKeys/purchaseReturnReservedQtyForPiLine/
  // purchaseReturnDocHasRemainingQty above, scoped to Sales Return against
  // Sales Invoice docs -- Purchase Return already hides a source PI once
  // every line has been fully returned; Sales Return had no equivalent, so
  // a fully-returned invoice stayed listed in the reference picker and the
  // user only discovered it was exhausted after expanding it.
  private salesReturnInvoiceRefKeys(invoiceId: number | null, invoiceNumber: string): string[] {
    const keys: string[] = [];
    if (invoiceId) keys.push(`id:${invoiceId}`);
    const number = String(invoiceNumber || '').trim().toLowerCase();
    if (number) keys.push(`no:${number}`);
    return keys;
  }

  private salesReturnReservedQtyForInvoiceLine(doc: PurchaseRefDoc, item: any): number {
    const refKeys = new Set(this.salesReturnInvoiceRefKeys(doc.id, doc.doc_number));
    if (!refKeys.size) return 0;
    // purchaseReturnLineKey is a generic product/variant/attribute matcher
    // despite its name -- reused as-is rather than duplicated.
    const lineKey = this.purchaseReturnLineKey(item);
    return this.segmentFilteredRecords(this.savedRecordObjects())
      .filter(record => this.normalizeKey(record?.status || 'draft') !== 'cancelled')
      .filter(record => this.salesReturnInvoiceRefKeys(
        this.optionalNumber(record?.invoice_id ?? record?.invoiceId),
        record?.invoice_number || record?.invoiceNumber || ''
      ).some(key => refKeys.has(key)))
      .flatMap(record => record?.items || [])
      .filter(returnItem => this.purchaseReturnLineKey(returnItem) === lineKey)
      .reduce((sum, returnItem) => sum + (Number(returnItem?.return_qty ?? returnItem?.returnQty) || 0), 0);
  }

  private salesReturnDocHasRemainingQty(doc: PurchaseRefDoc): boolean {
    const items = Array.isArray(doc.items) ? doc.items : [];
    if (!items.length) return true;
    return items.some(item => {
      const explicitRemaining = item?.remaining_qty ?? item?.remainingQty;
      if (explicitRemaining !== undefined && explicitRemaining !== null && String(explicitRemaining).trim() !== '') {
        return (Number(explicitRemaining) || 0) > 0;
      }
      const invoiceQty = Number(item?.qty ?? item?.invoice_qty ?? item?.invoiceQty ?? 0) || 0;
      if (invoiceQty <= 0) return true;
      const reservedQty = this.salesReturnReservedQtyForInvoiceLine(doc, item);
      return reservedQty < invoiceQty;
    });
  }

  private filterSalesReturnAvailableInvoiceDocs(docs: PurchaseRefDoc[]): PurchaseRefDoc[] {
    if (this.config?.key !== 'salesReturn') return docs;
    return docs.filter(doc => this.salesReturnDocHasRemainingQty(doc));
  }

  private documentNoteReturnRefKeys(returnId: number | null, returnNumber: string): string[] {
    const keys: string[] = [];
    if (returnId) keys.push(`id:${returnId}`);
    const number = String(returnNumber || '').trim().toLowerCase();
    if (number) keys.push(`no:${number}`);
    return keys;
  }

  private documentNoteUsedReturnRefKeys(): Set<string> {
    const keys = new Set<string>();
    const noteKey = this.config?.key || '';
    if (noteKey !== 'debitNote' && noteKey !== 'creditNote') return keys;

    this.segmentFilteredRecords(this.savedRecordObjects()).forEach(record => {
      if (this.normalizeKey(record?.status || 'draft') === 'cancelled') return;
      const id = noteKey === 'debitNote'
        ? this.optionalNumber(record?.purchase_return_id ?? record?.purchaseReturnId)
        : this.optionalNumber(record?.sales_return_id ?? record?.salesReturnId);
      const number = noteKey === 'debitNote'
        ? String(record?.purchase_return_number || record?.purchaseReturnNumber || '')
        : String(record?.sales_return_number || record?.salesReturnNumber || '');
      this.documentNoteReturnRefKeys(id, number).forEach(key => keys.add(key));
    });
    return keys;
  }

  private filterDocumentNoteAvailableReturnDocs(docs: PurchaseRefDoc[]): PurchaseRefDoc[] {
    const noteKey = this.config?.key || '';
    if (noteKey !== 'debitNote' && noteKey !== 'creditNote') return docs;
    const usedKeys = this.documentNoteUsedReturnRefKeys();
    return docs
      .filter(doc => this.normalizeKey(doc.status) === 'posted')
      .filter(doc => !this.documentNoteReturnRefKeys(doc.id, doc.doc_number).some(key => usedKeys.has(key)));
  }

  // Same "already used, stop offering it" rule as GRN→PI
  // (purchaseInvoiceUsedGrnRefKeys), applied to Sales Invoice's SO/DC
  // sources — an SO or DC that has already been pulled into ANY non-
  // cancelled Sales Invoice (draft OR posted; posting isn't the trigger,
  // saving is) must stop appearing as pickable, otherwise the same order
  // could be invoiced twice over before either invoice is ever posted.
  private salesInvoiceUsedSoRefKeys(): Set<string> {
    const keys = new Set<string>();
    if (this.config?.key !== 'salesInvoice') return keys;
    this.savedRecordObjects().forEach(record => {
      if (this.normalizeKey(record?.status || 'draft') === 'cancelled') return;
      const id = this.optionalNumber(record?.so_id ?? record?.soId);
      const number = String(record?.so_number ?? record?.soNumber ?? '').trim();
      if (id) keys.add(`id:${id}`);
      if (number) keys.add(`no:${this.normalizeKey(number)}`);
    });
    return keys;
  }

  private salesInvoiceUsedDcItemIds(): Set<number> {
    const ids = new Set<number>();
    if (this.config?.key !== 'salesInvoice') return ids;
    this.savedRecordObjects().forEach(record => {
      if (this.normalizeKey(record?.status || 'draft') === 'cancelled') return;
      (record?.items || []).forEach((item: any) => {
        const dcItemId = this.optionalNumber(item?.dc_item_id ?? item?.dcItemId);
        if (dcItemId) ids.add(dcItemId);
      });
    });
    return ids;
  }

  private filterSalesInvoiceAvailableReferenceDocs(docs: PurchaseRefDoc[]): PurchaseRefDoc[] {
    if (this.config?.key !== 'salesInvoice') return docs;
    const usedSoKeys = this.salesInvoiceUsedSoRefKeys();
    const usedDcItemIds = this.salesInvoiceUsedDcItemIds();
    if (!usedSoKeys.size && !usedDcItemIds.size) return docs;
    return docs
      .filter(doc => {
        if (this.referenceDocType(doc) !== 'SO' || !usedSoKeys.size) return true;
        const id = this.optionalNumber(doc.id);
        const number = String(doc.doc_number || '').trim();
        const keys = [id ? `id:${id}` : '', number ? `no:${this.normalizeKey(number)}` : ''].filter(Boolean);
        return !keys.some(key => usedSoKeys.has(key));
      })
      .map(doc => {
        if (this.referenceDocType(doc) !== 'DC' || !usedDcItemIds.size) return doc;
        return { ...doc, items: (doc.items || []).filter((item: any) => !usedDcItemIds.has(Number(item?.id))) };
      })
      .filter(doc => this.referenceDocType(doc) !== 'DC' || (doc.items || []).length > 0);
  }

  // Mirrors salesInvoiceUsedSoRefKeys()/salesInvoiceUsedDcItemIds() above,
  // one direction over: a Delivery Challan can reference either a Sales
  // Order (flow A/B) or, via the secondary picker, an already-posted Sales
  // Invoice directly (flow E — "Invoice to DC"). Whichever SO/SI a DC has
  // already picked — even while that DC is still a draft — shouldn't be
  // offered again when creating another DC, same as the SI side already does.
  private deliveryChallanUsedSoRefKeys(): Set<string> {
    const keys = new Set<string>();
    if (this.config?.key !== 'deliveryChallan') return keys;
    this.savedRecordObjects().forEach(record => {
      if (this.normalizeKey(record?.status || 'draft') === 'cancelled') return;
      const id = this.optionalNumber(record?.so_id ?? record?.soId);
      const number = String(record?.so_number ?? record?.soNumber ?? '').trim();
      if (id) keys.add(`id:${id}`);
      if (number) keys.add(`no:${this.normalizeKey(number)}`);
    });
    return keys;
  }

  private deliveryChallanUsedSiItemIds(): Set<number> {
    const ids = new Set<number>();
    if (this.config?.key !== 'deliveryChallan') return ids;
    this.savedRecordObjects().forEach(record => {
      if (this.normalizeKey(record?.status || 'draft') === 'cancelled') return;
      (record?.items || []).forEach((item: any) => {
        const siItemId = this.optionalNumber(item?.si_item_id ?? item?.siItemId);
        if (siItemId) ids.add(siItemId);
      });
    });
    return ids;
  }

  private filterDeliveryChallanAvailableReferenceDocs(docs: PurchaseRefDoc[]): PurchaseRefDoc[] {
    if (this.config?.key !== 'deliveryChallan') return docs;
    const usedSoKeys = this.deliveryChallanUsedSoRefKeys();
    const usedSiItemIds = this.deliveryChallanUsedSiItemIds();
    if (!usedSoKeys.size && !usedSiItemIds.size) return docs;
    return docs
      .filter(doc => {
        if (this.referenceDocType(doc) !== 'SO' || !usedSoKeys.size) return true;
        const id = this.optionalNumber(doc.id);
        const number = String(doc.doc_number || '').trim();
        const keys = [id ? `id:${id}` : '', number ? `no:${this.normalizeKey(number)}` : ''].filter(Boolean);
        return !keys.some(key => usedSoKeys.has(key));
      })
      .map(doc => {
        if (this.referenceDocType(doc) !== 'SI' || !usedSiItemIds.size) return doc;
        return { ...doc, items: (doc.items || []).filter((item: any) => !usedSiItemIds.has(Number(item?.id))) };
      })
      .filter(doc => this.referenceDocType(doc) !== 'SI' || (doc.items || []).length > 0);
  }

  private availableReferenceDocsForCurrentTransaction(docs: PurchaseRefDoc[]): PurchaseRefDoc[] {
    return this.filterDocumentNoteAvailableReturnDocs(
      this.filterSalesInvoiceAvailableReferenceDocs(
        this.filterDeliveryChallanAvailableReferenceDocs(
          this.filterPurchaseReturnAvailablePiDocs(this.filterPurchaseInvoiceAvailableGrnDocs(docs))
        )
      )
    );
  }

  private referenceDocsForType(type: string, docs: PurchaseRefDoc[]): PurchaseRefDoc[] {
    if (type === 'PR')  return docs.filter(doc => this.normalizeKey(doc.status) === 'approved');
    if (type === 'RFQ') return docs.filter(doc => ['accepted', 'responsereceived'].includes(this.normalizeKey(doc.status)));
    if (type === 'PO')  return docs.filter(doc => ['approved', 'confirmed'].includes(this.normalizeKey(doc.status)));
    if (type === 'GRN') return this.filterPurchaseInvoiceAvailableGrnDocs(docs.filter(doc => this.normalizeKey(doc.status) === 'posted'));
    if (type === 'PI')  return this.filterPurchaseReturnAvailablePiDocs(docs.filter(doc => this.normalizeKey(doc.status) === 'posted'));
    if (type === 'SO')  return docs.filter(doc => this.normalizeKey(doc.status) === 'posted');
    if (type === 'SI')  return this.filterSalesReturnAvailableInvoiceDocs(docs.filter(doc => this.normalizeKey(doc.status) === 'posted'));
    if (type === 'DC')  return docs.filter(doc => this.normalizeKey(doc.status) === 'posted');
    if (type === 'PURCHASERETURN' || type === 'SALESRETURN') return this.filterDocumentNoteAvailableReturnDocs(docs);
    return docs;
  }

  purchaseReferenceButtonLabel(): string {
    if (this.config?.key === 'deliveryChallan') return 'Pick SO / Sales Invoice';
    if (this.config?.key === 'salesInvoice') return 'Pick Sales Order / Delivery Challan';
    const type = this.purchaseReferenceType() || this.salesReferenceType();
    if (type === 'PR')  return 'Pick PR';
    if (type === 'RFQ') return 'Pick RFQ';
    if (type === 'PO')  return 'Pick PO';
    if (type === 'GRN') return 'Pick GRN';
    if (type === 'PI')  return 'Pick Invoice';
    if (type === 'PURCHASERETURN') return 'Pick Purchase Return';
    if (type === 'SO')  return 'Pick Sales Order';
    if (type === 'DC')  return 'Pick Delivery Challan';
    if (type === 'SI')  return 'Pick Sales Invoice';
    if (type === 'SALESRETURN') return 'Pick Sales Return';
    return 'Pick Reference';
  }

  purchaseDocType(key = this.config?.key || ''): string {
    if (key === 'purchaseRequisition') return 'PR';
    if (key === 'requestForQuotation') return 'RFQ';
    if (key === 'goodsReceipt') return 'GRN';
    if (key === 'purchaseInvoice') return 'PI';
    if (key === 'purchaseReturn') return 'PURCHASERETURN';
    if (key === 'debitNote') return 'DN';
    return '';
  }

  salesDocType(key = this.config?.key || ''): string {
    if (key === 'estimation') return 'estimation';
    if (key === 'proformaInvoice') return 'proforma';
    if (key === 'salesInvoice') return 'salesinvoice';
    if (key === 'salesOrder') return 'salesorder';
    if (key === 'salesQuotation') return 'salesquotation';
    if (key === 'salesReturn') return 'salesreturn';
    if (key === 'deliveryChallan') return 'deliverychallan';
    if (key === 'creditNote') return 'creditnote';
    return '';
  }

  private invalidateTransactionReferenceDocs(): void {
    this.transactionReferenceRequestKey = '';
    this.transactionReferenceOptionsCacheKey = '';
    this.transactionReferenceOptionsCache = [];
  }

  private removePurchaseInvoiceGrnReference(grnId: number | null, grnNumber: string): void {
    if (this.config?.key !== 'purchaseInvoice' || (!grnId && !grnNumber)) return;
    this.purchaseInvoiceGrnRefKeys(grnId, grnNumber).forEach(key => this.purchaseInvoiceReservedGrnRefKeys.add(key));
    this.transactionReferenceDocs.update(docs => this.filterPurchaseInvoiceAvailableGrnDocs(docs));
    this.refPickerDocs.update(docs => this.filterPurchaseInvoiceAvailableGrnDocs(docs));
    this.transactionReferenceOptionsCacheKey = '';
    this.transactionReferenceOptionsCache = [];
  }

  private loadTransactionReferenceDocs(force = false, allowAutoOpen = true): void {
    if (this.config?.key === 'deliveryChallan') {
      this.loadDeliveryChallanReferenceDocs(force, allowAutoOpen);
      return;
    }
    if (this.config?.key === 'salesInvoice') {
      this.loadSalesInvoiceReferenceDocs(force, allowAutoOpen);
      return;
    }

    const type = this.purchaseReferenceType() || this.salesReferenceType();
    if (!this.showTransactionHeader() || !type) {
      this.transactionReferenceDocs.set([]);
      this.transactionReferenceLoading.set(false);
      this.invalidateTransactionReferenceDocs();
      return;
    }

    const requestKey = `${this.config?.key || ''}:${type}:${this.selectedSegmentId() || 'all'}`;
    if (!force && this.transactionReferenceRequestKey === requestKey) return;

    this.transactionReferenceRequestKey = requestKey;
    this.transactionReferenceOptionsCacheKey = '';
    this.transactionReferenceOptionsCache = [];
    this.transactionReferenceLoading.set(true);
    this.txService.getRefDocs(type, this.selectedSegmentId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.transactionReferenceLoading.set(false);
          const docs = res.success ? this.referenceDocsForType(type, res.data || []) : [];
          this.transactionReferenceDocs.set(docs);
          const availableDocs = this.availableReferenceDocsForCurrentTransaction(docs);
          if (res.success && !this.editingId() && !this.primaryReferenceValue()) {
            if (!availableDocs.length) {
              this.applyDirectReferenceForCurrentTransaction(false);
            } else if (allowAutoOpen && this.shouldAutoOpenPrimaryReferencePicker()) {
              this.openPrimaryReferencePickerWithDocs(type, docs);
            }
          }
        },
        error: () => {
          this.transactionReferenceLoading.set(false);
          this.transactionReferenceDocs.set([]);
        }
      });
  }

  private loadDeliveryChallanReferenceDocs(force = false, allowAutoOpen = true): void {
    if (!this.showTransactionHeader()) {
      this.transactionReferenceDocs.set([]);
      this.transactionReferenceLoading.set(false);
      this.invalidateTransactionReferenceDocs();
      return;
    }

    const customerId = this.deliveryChallanReferenceCustomerId();
    const requestKey = `${this.config?.key || ''}:SO+SI:${this.selectedSegmentId() || 'all'}:${customerId || 'all'}`;
    if (!force && this.transactionReferenceRequestKey === requestKey) return;

    this.transactionReferenceRequestKey = requestKey;
    this.transactionReferenceOptionsCacheKey = '';
    this.transactionReferenceOptionsCache = [];
    this.transactionReferenceLoading.set(true);
    forkJoin({
      so: this.txService.getRefDocs('SO', this.selectedSegmentId(), customerId),
      si: this.txService.getRefDocs('SI', this.selectedSegmentId(), customerId)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ so, si }) => {
          this.transactionReferenceLoading.set(false);
          const docs = this.deliveryChallanReferenceDocsFromResponses(so, si);
          this.transactionReferenceDocs.set(docs);
          const availableDocs = this.availableReferenceDocsForCurrentTransaction(docs);
          if (!this.editingId() && !this.primaryReferenceValue()) {
            if (!availableDocs.length) {
              this.applyDirectReferenceForCurrentTransaction(false);
            } else if (allowAutoOpen && this.shouldAutoOpenPrimaryReferencePicker()) {
              this.openPrimaryReferencePickerWithDocs('SO', docs);
            }
          }
        },
        error: () => {
          this.transactionReferenceLoading.set(false);
          this.transactionReferenceDocs.set([]);
        }
      });
  }

  // Mirrors loadDeliveryChallanReferenceDocs's SO+SI merge — Sales Invoice's
  // dropdown and its auto-open-on-load tray must both offer DC entries too,
  // not just SO, same as the manually-opened picker (openSalesInvoiceReference
  // Picker) already does.
  private loadSalesInvoiceReferenceDocs(force = false, allowAutoOpen = true): void {
    if (!this.showTransactionHeader()) {
      this.transactionReferenceDocs.set([]);
      this.transactionReferenceLoading.set(false);
      this.invalidateTransactionReferenceDocs();
      return;
    }

    const customer = this.findCustomerBySelection(this.formValues()['customer']);
    const customerId = customer?.id ?? this.optionalNumber(this.formValues()['customerId']);
    const requestKey = `salesInvoice:SO+DC:${this.selectedSegmentId() || 'all'}:${customerId || 'all'}`;
    if (!force && this.transactionReferenceRequestKey === requestKey) return;

    this.transactionReferenceRequestKey = requestKey;
    this.transactionReferenceOptionsCacheKey = '';
    this.transactionReferenceOptionsCache = [];
    this.transactionReferenceLoading.set(true);
    forkJoin({
      so: this.txService.getRefDocs('SO', this.selectedSegmentId(), customerId),
      dc: this.txService.getRefDocs('DC', this.selectedSegmentId(), customerId)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ so, dc }) => {
          this.transactionReferenceLoading.set(false);
          const docs = this.salesInvoiceReferenceDocsFromResponses(so, dc);
          this.transactionReferenceDocs.set(docs);
          const availableDocs = this.availableReferenceDocsForCurrentTransaction(docs);
          if (!this.editingId() && !this.primaryReferenceValue()) {
            if (!availableDocs.length) {
              this.applyDirectReferenceForCurrentTransaction(false);
            } else if (allowAutoOpen && this.shouldAutoOpenPrimaryReferencePicker()) {
              this.openPrimaryReferencePickerWithDocs('SO', docs);
            }
          }
        },
        error: () => {
          this.transactionReferenceLoading.set(false);
          this.transactionReferenceDocs.set([]);
        }
      });
  }

  private deliveryChallanReferenceCustomerId(): number | null {
    const customer = this.findCustomerBySelection(this.formValues()['customer']);
    return this.optionalNumber(customer?.id ?? this.formValues()['customerId']);
  }

  private referenceItemProgressQty(item: any, ...keys: string[]): number {
    for (const key of keys) {
      const value = Number(item?.[key]);
      if (Number.isFinite(value) && value > 0) return value;
    }
    return 0;
  }

  private salesOrderHasDeliveryProgress(doc: PurchaseRefDoc): boolean {
    return (doc.items || []).some((item: any) =>
      this.referenceItemProgressQty(item, 'delivered_qty', 'deliveredQty') > 0
    );
  }

  private salesOrderHasDirectInvoiceProgress(doc: PurchaseRefDoc): boolean {
    return (doc.items || []).some((item: any) =>
      this.referenceItemProgressQty(item, 'invoiced_qty', 'invoicedQty') > 0
    );
  }

  private deliveryChallanReferenceDocsFromResponses(
    so: ApiResponse<PurchaseRefDoc[]>,
    si: ApiResponse<PurchaseRefDoc[]>
  ): PurchaseRefDoc[] {
    const soDocs = so.success
      ? this.referenceDocsForType('SO', so.data || [])
          .map(doc => ({ ...doc, doc_type: 'SO' }))
          .filter(doc => !this.salesOrderHasDirectInvoiceProgress(doc))
      : [];
    const siDocs = si.success
      ? this.referenceDocsForType('SI', si.data || [])
          .map(doc => ({ ...doc, doc_type: 'SI' }))
      : [];
    return [...soDocs, ...siDocs];
  }

  private openDeliveryChallanReferencePicker(): void {
    this.refPickerType.set('SO');
    this.refPickerOpen.set(false);
    this.refPickerLoading.set(true);
    this.refPickerSearch.set('');
    this.refPickerDocs.set([]);
    this.txSaveError.set('');
    const customerId = this.deliveryChallanReferenceCustomerId();
    forkJoin({
      so: this.txService.getRefDocs('SO', this.selectedSegmentId(), customerId),
      si: this.txService.getRefDocs('SI', this.selectedSegmentId(), customerId)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ so, si }) => {
          this.refPickerLoading.set(false);
          const docs = this.deliveryChallanReferenceDocsFromResponses(so, si);
          this.refPickerDocs.set(docs);
          this.transactionReferenceDocs.set(docs);
          this.transactionReferenceOptionsCacheKey = '';
          this.transactionReferenceOptionsCache = [];
          if (!so.success && !si.success) {
            this.txSaveError.set(so.message || si.message || 'Reference documents could not be loaded.');
            return;
          }
          if (!this.availableReferenceDocsForCurrentTransaction(docs).length) {
            if (!this.applyDirectReferenceForCurrentTransaction(true)) {
              this.txSaveError.set('Posted Sales Order or Sales Invoice not found. Continue as direct entry.');
            }
            return;
          }
          this.refPickerOpen.set(true);
        },
        error: err => {
          this.refPickerLoading.set(false);
          this.refPickerDocs.set([]);
          this.txSaveError.set(this.apiErrorMessage(err, 'Reference documents could not be loaded.'));
        }
      });
  }

  // Sales Invoice's picker merges posted Sales Orders and Delivery Challans
  // into one list — symmetric with openDeliveryChallanReferencePicker's own
  // SO+SI merge — so a client who dispatches via DC first, then invoices,
  // and one who invoices an SO directly both use the same single "Pick"
  // entry point (only the dropdown stays SO-only; the picker tray covers
  // both). Doc rows keep their own doc_type ('SO' | 'DC') for display and
  // for selectPrimaryReference to route the pick correctly.
  private salesInvoiceReferenceDocsFromResponses(
    so: ApiResponse<PurchaseRefDoc[]>,
    dc: ApiResponse<PurchaseRefDoc[]>
  ): PurchaseRefDoc[] {
    const soDocs = so.success
      ? this.referenceDocsForType('SO', so.data || [])
          .map(doc => ({ ...doc, doc_type: 'SO' }))
          .filter(doc => !this.salesOrderHasDeliveryProgress(doc))
      : [];
    const dcDocs = dc.success
      ? this.referenceDocsForType('DC', dc.data || []).map(doc => ({ ...doc, doc_type: 'DC' }))
      : [];
    return [...soDocs, ...dcDocs];
  }

  private openSalesInvoiceReferencePicker(): void {
    this.refPickerType.set('SO');
    this.refPickerOpen.set(false);
    this.refPickerLoading.set(true);
    this.refPickerSearch.set('');
    this.refPickerDocs.set([]);
    this.txSaveError.set('');
    const customer = this.findCustomerBySelection(this.formValues()['customer']);
    const customerId = customer?.id ?? this.optionalNumber(this.formValues()['customerId']);
    forkJoin({
      so: this.txService.getRefDocs('SO', this.selectedSegmentId(), customerId),
      dc: this.txService.getRefDocs('DC', this.selectedSegmentId(), customerId)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ so, dc }) => {
          this.refPickerLoading.set(false);
          const docs = this.salesInvoiceReferenceDocsFromResponses(so, dc);
          this.refPickerDocs.set(docs);
          if (!so.success && !dc.success) {
            this.txSaveError.set(so.message || dc.message || 'Reference documents could not be loaded.');
            return;
          }
          if (!this.availableReferenceDocsForCurrentTransaction(docs).length) {
            if (!this.applyDirectReferenceForCurrentTransaction(true)) {
              this.txSaveError.set('Posted Sales Order or Delivery Challan not found. Continue as direct entry.');
            }
            return;
          }
          this.refPickerOpen.set(true);
        },
        error: err => {
          this.refPickerLoading.set(false);
          this.refPickerDocs.set([]);
          this.txSaveError.set(this.apiErrorMessage(err, 'Reference documents could not be loaded.'));
        }
      });
  }

  openPurchaseReferencePicker(): void {
    if (this.config?.key === 'deliveryChallan') {
      this.openDeliveryChallanReferencePicker();
      return;
    }
    if (this.config?.key === 'salesInvoice') {
      this.openSalesInvoiceReferencePicker();
      return;
    }

    const type = this.purchaseReferenceType() || this.salesReferenceType();
    if (!type) return;
    this.refPickerType.set(type);
    this.refPickerOpen.set(false);
    this.refPickerLoading.set(true);
    this.refPickerSearch.set('');
    this.refPickerDocs.set([]);
    this.txSaveError.set('');
    this.txService.getRefDocs(type, this.selectedSegmentId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.refPickerLoading.set(false);
          const docs = res.success ? this.referenceDocsForType(type, res.data || []) : [];
          this.refPickerDocs.set(docs);
          this.transactionReferenceDocs.set(docs);
          this.transactionReferenceOptionsCacheKey = '';
          this.transactionReferenceOptionsCache = [];
          if (!res.success) {
            this.txSaveError.set(res.message || 'Reference documents could not be loaded.');
            return;
          }
          if (!this.availableReferenceDocsForCurrentTransaction(docs).length) {
            if (!this.applyDirectReferenceForCurrentTransaction(true)) {
              this.txSaveError.set(`${this.purchaseReferenceButtonLabel().replace('Pick ', '') || 'Reference'} not found. Continue as direct entry.`);
            }
            return;
          }
          this.refPickerOpen.set(true);
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
    this.refPickerExpandedDocId.set(null);
  }

  // Accepts either a plain numeric doc id (Purchase Return / Sales Return,
  // where the tray only ever lists one doc type so id alone is unique) or a
  // referenceDocTrackKey() string (Delivery Challan / Sales Invoice, whose
  // trays mix SO+DC or SO+SI docs sharing one id namespace across types) --
  // compared as strings either way so both call shapes share one signal.
  isRefPickerExpanded(docKey: number | string): boolean {
    return this.refPickerExpandedDocId() !== null && String(this.refPickerExpandedDocId()) === String(docKey);
  }

  toggleRefPickerExpand(docKey: number | string): void {
    this.refPickerExpandedDocId.set(this.isRefPickerExpanded(docKey) ? null : (docKey as any));
  }

  // "Available qty" for a reference-picker item — remaining_qty is what the
  // sp_get_*_docs_for_ref procedures already compute (qty minus whatever a
  // prior return already took), falling back to the raw qty for shapes that
  // don't carry a returned/remaining figure.
  refPickerItemAvailableQty(item: any): number {
    const remaining = item?.remaining_qty ?? item?.remainingQty;
    if (remaining !== undefined && remaining !== null && remaining !== '') return Number(remaining) || 0;
    return Number(item?.qty ?? 0) || 0;
  }

  refPickerItemReturnedQty(item: any): number {
    return Number(item?.returned_qty ?? item?.returnedQty ?? 0) || 0;
  }

  refPickerItemVariantText(item: any): string {
    return [item?.variant_name, item?.attribute_value].filter(part => String(part || '').trim()).join(' / ') || '-';
  }

  // Non-return pickers (Delivery Challan's "Posted Sales Orders / Invoices",
  // Sales Invoice's "Pick Sales Order / Delivery Challan") show a mixed list
  // of doc types -- an SO item, a DC item and an SI item each use a
  // different qty/rate/amount field name (so_qty vs dispatch_qty vs qty; DC
  // items carry no rate/amount at all, since DC is deliberately a
  // price-free stock-movement document). These tolerate whichever fields
  // are actually present instead of assuming one shape.
  refPickerItemQtyDisplay(item: any): string {
    const qty = item?.qty ?? item?.dispatch_qty ?? item?.so_qty ?? item?.invoiced_qty ?? item?.return_qty;
    return (qty === undefined || qty === null || qty === '') ? '-' : String(qty);
  }

  refPickerItemRateDisplay(item: any): string {
    const rate = item?.rate;
    return (rate === undefined || rate === null || rate === '') ? '-' : String(rate);
  }

  refPickerItemAmountDisplay(item: any): string {
    const amt = item?.amount ?? item?.return_amount;
    return (amt === undefined || amt === null || amt === '') ? '-' : String(amt);
  }

  // Reopens the reference-picker tray, pre-filtered (via the tray's own
  // search box) to the document already referenced on this record -- the
  // "drill into what I already picked" entry point requested for SO/DC/SI/
  // Sales Return references. Reuses the exact same fetch + search + expand
  // machinery the tray already has for choosing a NEW reference, so no new
  // endpoint or view mode is needed: narrowing the list to the one matching
  // doc leaves the user one click (its existing expand chevron) away from
  // that document's product-level detail.
  viewReferenceDetails(field: InventoryField): void {
    const value = String(this.formValues()[field.key] || '').trim();
    if (!value) return;
    this.openPurchaseReferencePicker();
    this.refPickerSearch.set(value);
  }

  private primaryReferenceValue(): string {
    const field = this.primaryTransactionReferenceField();
    return field ? String(this.formValues()[field.key] || '').trim() : '';
  }

  private shouldAutoOpenPrimaryReferencePicker(): boolean {
    const key = this.config?.key || '';
    return (key === 'salesInvoice' || key === 'deliveryChallan')
      && !this.refPickerOpen()
      && !this.refPickerLoading();
  }

  private openPrimaryReferencePickerWithDocs(type: string, docs: PurchaseRefDoc[]): void {
    const pickerDocs = [...docs];
    setTimeout(() => {
      if (this.primaryReferenceValue() || this.editingId()) return;
      this.refPickerType.set(type);
      this.refPickerSearch.set('');
      this.refPickerDocs.set(pickerDocs);
      this.refPickerLoading.set(false);
      this.refPickerOpen.set(true);
    }, 0);
  }

  refPickerAvailableDocs(): PurchaseRefDoc[] {
    return this.availableReferenceDocsForCurrentTransaction(this.refPickerDocs());
  }

  refPickerDisplayDocs(): PurchaseRefDoc[] {
    const q = this.refPickerSearch().trim().toLowerCase();
    const docs = this.refPickerAvailableDocs();
    const filtered = q
      ? docs.filter(doc =>
          String(doc.doc_number || '').toLowerCase().includes(q)
          || String(doc.party_name || '').toLowerCase().includes(q)
          || String(doc.doc_date || '').toLowerCase().includes(q)
        )
      : docs;
    return filtered.slice(0, 100);
  }

  refPickerHiddenCount(): number {
    const q = this.refPickerSearch().trim().toLowerCase();
    const docs = this.refPickerAvailableDocs();
    const total = q
      ? docs.filter(doc =>
          String(doc.doc_number || '').toLowerCase().includes(q)
          || String(doc.party_name || '').toLowerCase().includes(q)
          || String(doc.doc_date || '').toLowerCase().includes(q)
        ).length
      : docs.length;
    return Math.max(0, total - this.refPickerDisplayDocs().length);
  }

  // True once the tray holds a merged list (e.g. Sales Invoice's SO+DC,
  // Delivery Challan's SO+SI) — each doc is tagged with its own doc_type in
  // that case, so the tray can show a Type column to disambiguate.
  refPickerDocsHaveType(): boolean {
    return this.refPickerDocs().some(doc => !!doc.doc_type);
  }

  referenceDocTrackKey(doc: PurchaseRefDoc): string {
    const anyDoc = doc as any;
    const type = String(anyDoc.doc_type || anyDoc.docType || this.refPickerType() || this.purchaseReferenceType() || this.salesReferenceType() || 'REF').toUpperCase();
    return `${type}:${doc.id ?? ''}:${doc.doc_number || ''}`;
  }

  selectPrimaryReference(doc: PurchaseRefDoc): void {
    if (this.purchaseReferenceType()) {
      this.selectPurchaseReference(doc);
      return;
    }
    if (this.salesReferenceType()) {
      // The Sales Invoice picker merges SO and DC docs into one list (see
      // openSalesInvoiceReferencePicker); a DC row picked from it appends
      // rather than replacing, same as the pending-DC-banner pull.
      if (this.config?.key === 'salesInvoice' && this.referenceDocType(doc) === 'DC') {
        this.appendDeliveryChallanToSalesInvoice(doc);
        return;
      }
      this.selectSalesReference(doc);
    }
  }

  selectPurchaseReference(doc: PurchaseRefDoc): void {
    const key = this.config?.key || '';
    const rows = (doc.items || []).map(item => this.referenceItemToLineRow(item, key, doc));
    const closeBeforeRows = key === 'purchaseInvoice';
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
      const vendor = this.loadedVendorObjects().find(item => Number(item.id) === Number(doc.vendor_id))
        || this.findVendorBySelection(doc.party_name);
      const docAny = doc as any;
      const paymentTerms = docAny.payment_terms || docAny.paymentTerms || vendor?.payment_term_name || '';
      const piDate = this.isoDateValue(this.formValues()['piDate']) || this.todayIso();
      patch['grnId'] = doc.id;
      patch['grnReference'] = doc.doc_number;
      patch['vendorId'] = doc.vendor_id ?? null;
      patch['branchId'] = doc.branch_id ?? null;
      patch['branch'] = doc.branch_name || '';
      patch['warehouseId'] = doc.warehouse_id ?? null;
      patch['vendor'] = vendor?.vendor_name || doc.party_name || '';
      patch['warehouse'] = doc.warehouse_name || doc.remarks || '';
      patch['receivingLocation'] = doc.warehouse_name || doc.branch_name || doc.remarks || '';
      patch['piDate'] = piDate;
      patch['vendorInvoiceNo'] = docAny.vendor_invoice_no || docAny.vendorInvoiceNo || '';
      patch['vendorInvoiceDate'] = docAny.vendor_invoice_dt || docAny.vendorInvoiceDt || null;
      patch['paymentTerms'] = paymentTerms;
      patch['dueDate'] = paymentTerms ? this.purchaseInvoiceDueDate(piDate, paymentTerms) : null;
    } else if (key === 'purchaseReturn') {
      patch['piId'] = doc.id;
      patch['piReference'] = doc.doc_number;
      // The referenced PI's own grn_id, when it's a GRN-linked PI — the
      // serial picker needs this to look up serials under the GRN's source_
      // doc_type/id instead of the PI's, since a GRN-linked PI never writes
      // its own inv_serial_units rows (see openSerialPicker()).
      patch['piGrnId'] = doc.grn_id ?? null;
      patch['vendorId'] = doc.vendor_id ?? null;
      patch['warehouseId'] = doc.warehouse_id ?? null;
      patch['warehouse'] = doc.warehouse_name || doc.branch_name || doc.remarks || this.formValues()['warehouse'] || '';
      patch['branchId'] = doc.branch_id ?? null;
      patch['branch'] = doc.branch_name || '';
      patch['vendor'] = doc.party_name || this.formValues()['vendor'] || '';
    } else if (key === 'debitNote') {
      patch['purchaseReturnId'] = doc.id;
      patch['reference'] = doc.doc_number;
      patch['vendorId'] = doc.vendor_id ?? null;
      patch['vendor'] = doc.party_name || this.formValues()['vendor'] || '';
    }

    if (closeBeforeRows) {
      this.closePurchaseReferencePicker();
    }

    this.formValues.update(values => ({ ...values, ...patch }));
    const referenceSerialMap = this.lineSerialMapFromItems(doc.items || []);
    if (key === 'purchaseInvoice') {
      const applyRows = () => {
        this.entryLineRowsKey.set(key);
        this.entryLineRows.set(rows.length ? rows : [this.blankLineRow()]);
        // Carry the serials captured at GRN receipt time through onto the PI
        // line — the picker button on a GRN-linked PI row is otherwise stuck
        // showing 0, even though inv_grn_items.serial_numbers has the data.
        this.lineSerialUnitsMap.set(referenceSerialMap);
        // Carry the referenced GRN item's own attribute_id through directly
        // (see attributeRefMapFromItems' doc comment) — a GRN-linked PI line
        // needs this for its own serial picker's source-scoped lookup, same
        // reasoning as Purchase Return below.
        this.lineRefItemIdMap.set(this.attributeRefMapFromItems(doc.items || []));
      };
      if (closeBeforeRows) setTimeout(applyRows, 0);
      else applyRows();
    } else if (rows.length) {
      // Purchase Return deliberately does NOT inherit the referenced PI's
      // own serial_numbers snapshot here — that field is just the PI's
      // original received-serials record, not "what's still returnable".
      // Setting lineSerialUnitsMap from it pre-filled every new return with
      // the PI's first N serials regardless of whether those specific units
      // were already consumed by an earlier return, which is exactly what
      // surfaced as "Serial number X is not available" at Post (or the
      // openSerialPicker self-heal notice on reopen). The user must pick
      // from openSerialPicker's live, source-scoped, in-stock list instead.
      const applyRows = () => {
        this.entryLineRowsKey.set(key);
        this.entryLineRows.set(rows);
        if (key === 'purchaseReturn' || key === 'goodsReceipt') {
          this.lineRefItemIdMap.set(this.attributeRefMapFromItems(doc.items || []));
        }
      };
      if (closeBeforeRows) setTimeout(applyRows, 0);
      else applyRows();
    }
    this.boundReferenceLabels.set([doc.doc_number]);
    this.boundReferenceFields.set(patch);
    if (!closeBeforeRows) {
      this.closePurchaseReferencePicker();
    }
  }

  selectSalesReference(doc: PurchaseRefDoc, hydrated = false): void {
    const key = this.config?.key || '';
    const docType = this.referenceDocType(doc);
    if (!hydrated && (key === 'deliveryChallan' || key === 'salesInvoice') && docType === 'SO' && !this.referenceDocHasUsableItems(doc)) {
      this.hydrateSalesOrderReferenceDoc(doc)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(hydratedDoc => {
          if (hydratedDoc) {
            this.upsertReferenceDoc(hydratedDoc);
            this.selectSalesReference(hydratedDoc, true);
          } else {
            this.txSaveError.set('Selected Sales Order has no items to bind.');
            this.selectSalesReference(doc, true);
          }
        });
      return;
    }
    const rows = (doc.items || []).map(item => this.referenceItemToLineRow(item, key, doc));
    const closeBeforeRows = this.refPickerOpen();
    const patch: Record<string, any> = {
      segmentId: doc.segment_id ?? null,
      segment: doc.segment_name || this.formValues()['segment'] || this.selectedSegment()
    };

    if (key === 'deliveryChallan') {
      const customer = this.loadedCustomerObjects().find(item => Number(item.id) === Number(doc.vendor_id))
        || this.findCustomerBySelection(doc.party_name);
      patch['soId'] = docType === 'SI' ? null : doc.id;
      patch['siId'] = docType === 'SI' ? doc.id : null;
      patch['siReference'] = docType === 'SI' ? doc.doc_number : '';
      patch['soReference'] = doc.doc_number;
      patch['referenceNo'] = doc.doc_number;
      patch['customerId'] = doc.vendor_id ?? null;
      patch['customer'] = customer?.customer_name || doc.party_name || this.formValues()['customer'] || '';
      const addressSource = docType === 'SO' && doc.remarks ? { address: doc.remarks } : customer;
      Object.assign(patch, this.dcAddressPatchFromSource(addressSource, false));
      if (doc.warehouse_name || doc.branch_name) {
        patch['fromWarehouse'] = doc.warehouse_name || doc.branch_name || '';
        patch['fromWarehouseId'] = doc.warehouse_id ?? null;
        patch['warehouseId'] = doc.warehouse_id ?? null;
        patch['warehouse'] = doc.warehouse_name || '';
        patch['branchId'] = doc.branch_id ?? null;
        patch['branch'] = doc.branch_name || '';
      }
    } else if (key === 'salesInvoice') {
      const customer = this.loadedCustomerObjects().find(item => Number(item.id) === Number(doc.vendor_id))
        || this.findCustomerBySelection(doc.party_name);
      const docAny = doc as any;
      const paymentTerms = docAny.payment_terms || docAny.paymentTerms || customer?.payment_term_name || '';
      const invoiceDate = this.isoDateValue(this.formValues()['invoiceDate']) || this.todayIso();
      patch['soId'] = docType === 'SO' ? doc.id : null;
      patch['soReference'] = doc.doc_number;
      patch['referenceNo'] = doc.doc_number;
      patch['customerId'] = doc.vendor_id ?? null;
      patch['customer'] = customer?.customer_name || doc.party_name || this.formValues()['customer'] || '';
      patch['warehouseId'] = doc.warehouse_id ?? null;
      patch['warehouse'] = doc.warehouse_name || doc.remarks || this.formValues()['warehouse'] || '';
      patch['invoiceDate'] = invoiceDate;
      patch['paymentTerms'] = paymentTerms;
      patch['dueDate'] = paymentTerms ? this.purchaseInvoiceDueDate(invoiceDate, paymentTerms) : null;
    } else if (key === 'salesReturn') {
      patch['invoiceId'] = doc.id;
      patch['invoiceReference'] = doc.doc_number;
      patch['customerId'] = doc.vendor_id ?? null;
      patch['customer'] = doc.party_name || this.formValues()['customer'] || '';
      patch['returnToWarehouseId'] = doc.warehouse_id ?? null;
      patch['returnToWarehouse'] = doc.warehouse_name || doc.remarks || this.formValues()['returnToWarehouse'] || '';
    } else if (key === 'creditNote') {
      patch['salesReturnId'] = doc.id;
      patch['reference'] = doc.doc_number;
      patch['customerId'] = doc.vendor_id ?? null;
      patch['customer'] = doc.party_name || this.formValues()['customer'] || '';
    }

    if (closeBeforeRows) {
      this.closePurchaseReferencePicker();
    }

    this.formValues.update(values => ({ ...values, ...patch }));
    const referenceSerialMap = this.lineSerialMapFromItems(doc.items || []);
    if (rows.length) {
      const applyRows = () => {
        this.entryLineRowsKey.set(key);
        this.entryLineRows.set(rows);
        // Sales Return deliberately does NOT inherit the referenced
        // invoice's own serial_numbers snapshot here — same reasoning as
        // the purchase-side selectPrimaryReference fix: that field is the
        // invoice's original sold-serials record, not "what's still
        // returnable" once an earlier return against the same invoice has
        // already consumed some of them. The user picks from
        // openSerialPicker's live, invoice-scoped, still-sold list instead.
        if (key !== 'salesReturn') {
          this.lineSerialUnitsMap.set(referenceSerialMap);
        }
        if (key === 'deliveryChallan' || key === 'salesInvoice') {
        // Carry each picked SO item's own id forward so DC/SI posting can
        // advance that SO item's delivered_qty/invoiced_qty (rule 4) — the
        // ref-docs endpoint only started returning SO item ids once this was
        // added (sp_get_purchase_docs_for_ref's WHEN 'SO' branch). Merged
        // with the same item's own attribute_id/attribute_value (see
        // attributeRefMapFromItems' doc comment) — DC/SI's own serial
        // picker and save payload need that too, same reasoning as
        // Purchase/Sales Return below.
          const attrMap = this.attributeRefMapFromItems(doc.items || []);
          const nextMap: Record<number, { soItemId?: number; dcItemId?: number; siItemId?: number; attributeId?: number | null; attributeName?: string | null; attributeValue?: string | null }> = {};
          (doc.items || []).forEach((item: any, i: number) => {
            nextMap[i] = {
              ...attrMap[i],
              ...(key === 'deliveryChallan' && docType === 'SI'
                ? { siItemId: item?.id ?? null }
                : key === 'salesInvoice' && docType === 'DC'
                  ? { dcItemId: item?.id ?? null, soItemId: item?.so_item_id ?? item?.soItemId ?? null }
                  : { soItemId: item?.id ?? null })
            };
          });
          this.lineRefItemIdMap.set(nextMap);
        } else if (key === 'salesReturn') {
          // See lineRefItemIdMap's doc comment — carries the referenced
          // invoice item's attribute_id/attribute_value through directly
          // instead of round-tripping it via the grid's free-text
          // "Attribute" cell, which was silently dropping it and breaking
          // the "already returned" qty match in sp_get_sales_docs_for_ref's
          // WHEN 'SI' branch.
          this.lineRefItemIdMap.set(this.attributeRefMapFromItems(doc.items || []));
        }
      };
      if (closeBeforeRows) setTimeout(applyRows, 0);
      else applyRows();
    }
    this.boundReferenceLabels.set([doc.doc_number]);
    this.boundReferenceFields.set(patch);
    if (!closeBeforeRows) {
      this.closePurchaseReferencePicker();
    }
  }

  // ── Secondary reference picker (DC: pick SI; SI: pick DC, repeatable) ────
  // The primary "Pick Sales Order" flow above covers flows A/B via the
  // existing single-type inline dropdown (salesReferenceType() => 'SO').
  // This second, independent picker is symmetric in both directions: DC
  // picking an already-posted SI (flow E) and SI picking one-or-more posted
  // DCs (flows A/C/F) both APPEND real line data via referenceItemToLineRow,
  // each pick appending rather than replacing so multiple documents can be
  // consolidated. Neither direction moves stock on the DC side — DC posting
  // never touches inv_stock_balance regardless of reference type (only SI
  // posting does, see fn_post_sales_invoice_stock) — so linking DC->SI here
  // carries no double-counting risk.

  private referenceDocType(doc: PurchaseRefDoc): string {
    return String((doc as any).doc_type || (doc as any).docType || this.refPickerType() || this.salesReferenceType()).toUpperCase();
  }

  private referenceDocHasUsableItems(doc: PurchaseRefDoc): boolean {
    return (doc.items || []).some((item: any) =>
      !!String(item?.product_name || item?.productName || item?.product_id || item?.productId || '').trim()
    );
  }

  private sameReferenceDoc(a: PurchaseRefDoc, b: PurchaseRefDoc): boolean {
    const aType = this.referenceDocType(a);
    const bType = this.referenceDocType(b);
    const sameType = !aType || !bType || aType === bType;
    const sameId = a.id != null && b.id != null && Number(a.id) === Number(b.id);
    const sameNo = !!a.doc_number && !!b.doc_number && this.optionEquals(a.doc_number, b.doc_number);
    return sameType && (sameId || sameNo);
  }

  private upsertReferenceDoc(doc: PurchaseRefDoc): void {
    const mergeDocs = (docs: PurchaseRefDoc[]) => {
      let found = false;
      const next = docs.map(item => {
        if (!this.sameReferenceDoc(item, doc)) return item;
        found = true;
        return { ...item, ...doc, items: doc.items || item.items || [] };
      });
      return found ? next : [...next, doc];
    };
    this.transactionReferenceDocs.update(mergeDocs);
    this.refPickerDocs.update(mergeDocs);
    this.transactionReferenceOptionsCacheKey = '';
    this.transactionReferenceOptionsCache = [];
  }

  private hydrateSalesOrderReferenceDoc(doc: PurchaseRefDoc): Observable<PurchaseRefDoc | null> {
    return this.txService.getSalesOrders(undefined, this.selectedSegmentId()).pipe(
      map(res => {
        if (!res.success) return null;
        const match = (res.data || []).find((record: any) =>
          (doc.id != null && Number(record.id) === Number(doc.id))
          || (!!doc.doc_number && this.optionEquals(record.doc_number, doc.doc_number))
        );
        if (!match) return null;
        return {
          ...doc,
          id: match.id ?? doc.id,
          doc_type: 'SO',
          doc_number: match.doc_number || doc.doc_number,
          doc_date: match.doc_date || doc.doc_date,
          segment_id: match.segment_id ?? doc.segment_id,
          segment_name: match.segment_name || doc.segment_name,
          vendor_id: match.customer_id ?? doc.vendor_id,
          party_name: match.customer_name || doc.party_name,
          payment_terms: match.payment_terms || doc.payment_terms,
          status: match.status || doc.status,
          remarks: match.remarks || doc.remarks,
          items: match.items || doc.items || []
        } as PurchaseRefDoc;
      }),
      catchError(() => of(null))
    );
  }

  salesReferenceSecondaryType(key = this.config?.key || ''): string {
    if (key === 'salesInvoice') return 'DC';
    return '';
  }

  secondaryReferenceButtonLabel(): string {
    const type = this.salesReferenceSecondaryType();
    if (type === 'SI') return 'Pick Sales Invoice';
    if (type === 'DC') return 'Pick Delivery Challan';
    return '';
  }

  openSecondaryReferencePicker(preloadedDocs?: PurchaseRefDoc[]): void {
    const type = this.salesReferenceSecondaryType();
    if (!type) return;
    this.refPickerType.set(type);
    this.refPickerOpen.set(true);
    this.refPickerSearch.set('');
    this.txSaveError.set('');

    if (preloadedDocs) {
      this.refPickerLoading.set(false);
      this.refPickerDocs.set(preloadedDocs);
      return;
    }

    this.refPickerLoading.set(true);
    this.refPickerDocs.set([]);
    const customer = this.findCustomerBySelection(this.formValues()['customer']);
    const customerId = customer?.id ?? this.optionalNumber(this.formValues()['customerId']);
    this.txService.getRefDocs(type, this.selectedSegmentId(), customerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.refPickerLoading.set(false);
          this.refPickerDocs.set(res.success ? (res.data || []) : []);
          if (!res.success) this.txSaveError.set(res.message || 'Reference documents could not be loaded.');
        },
        error: err => {
          this.refPickerLoading.set(false);
          this.refPickerDocs.set([]);
          this.txSaveError.set(this.apiErrorMessage(err, 'Reference documents could not be loaded.'));
        }
      });
  }

  selectSecondaryReference(doc: PurchaseRefDoc): void {
    const key = this.config?.key || '';
    const type = this.refPickerType();

    if (key === 'deliveryChallan' && type === 'SI') {
      // Flow E: DC picks an already-posted SI, symmetric with SI picking a
      // DC below — real line data via referenceItemToLineRow, appended (not
      // replaced). No so_item_id on these rows, so fn_post_delivery_challan_
      // dispatch (SO delivered_qty tracking) naturally skips them; that's
      // fine since DC posting never moves stock either way.
      const rows = (doc.items || []).map((item: any) => this.referenceItemToLineRow(item, key, doc));
      const startIndex = this.entryLineRows().length;
      this.entryLineRowsKey.set(key);
      this.entryLineRows.update(existing => [...existing, ...rows]);
      this.lineSerialUnitsMap.update(map => ({ ...map, ...this.lineSerialMapFromItems(doc.items || [], startIndex) }));
      this.lineRefItemIdMap.update(map => {
        const next = { ...map };
        (doc.items || []).forEach((item: any, i: number) => {
          next[startIndex + i] = { siItemId: item?.id ?? null };
        });
        return next;
      });
      const customerId = doc.vendor_id ?? null;
      this.formValues.update(values => ({
        ...values,
        siId: doc.id,
        siReference: doc.doc_number,
        customerId: values['customerId'] ?? customerId,
        customer: values['customer'] || doc.party_name || '',
        referenceNo: values['referenceNo'] || doc.doc_number
      }));
      this.boundReferenceLabels.update(labels => [...labels, doc.doc_number]);
      this.closePurchaseReferencePicker();
      return;
    }

    if (key === 'salesInvoice' && type === 'DC') {
      this.appendDeliveryChallanToSalesInvoice(doc, 'append');
      return;
    }
  }

  // 'append': flows A/C/F, used only by the pending-DC banner's deliberate
  // "pull into this invoice" action — consolidates multiple DCs onto an
  // invoice the user is already building, on top of whatever's there.
  // 'replace' (the default): picking a DC out of the merged SO+DC picker is
  // choosing what this invoice is based on, same as picking an SO there —
  // it must replace the grid, not silently combine with a previous pick.
  // Each item only carries the qty still un-invoiced (remaining_qty, set by
  // sp_get_sales_docs_for_ref's WHEN 'DC' branch) — matches rule 4's
  // "editable downward only".
  private appendDeliveryChallanToSalesInvoice(doc: PurchaseRefDoc, mode: 'append' | 'replace' = 'replace'): void {
    const key = 'salesInvoice';
    const rows = (doc.items || []).map((item: any) => this.referenceItemToLineRow(item, key, doc));
    const effectiveMode: 'append' | 'replace' = mode === 'append' && this.activeSalesLineRows().length ? 'append' : 'replace';
    const startIndex = effectiveMode === 'append' ? this.entryLineRows().length : 0;
    this.entryLineRowsKey.set(key);
    if (effectiveMode === 'append') {
      this.entryLineRows.update(existing => [...existing, ...rows]);
      this.lineSerialUnitsMap.update(map => ({ ...map, ...this.lineSerialMapFromItems(doc.items || [], startIndex) }));
    } else {
      this.entryLineRows.set(rows.length ? rows : [this.blankLineRow()]);
      this.lineSerialUnitsMap.set(this.lineSerialMapFromItems(doc.items || []));
    }
    this.lineRefItemIdMap.update(map => {
      const next = effectiveMode === 'append' ? { ...map } : {};
      (doc.items || []).forEach((item: any, i: number) => {
        next[startIndex + i] = { dcItemId: item?.id ?? null, soItemId: item?.so_item_id ?? item?.soItemId ?? null };
      });
      return next;
    });
    const customerId = doc.vendor_id ?? null;
    this.formValues.update(values => ({
      ...values,
      customerId: effectiveMode === 'append' ? (values['customerId'] ?? customerId) : (customerId ?? values['customerId']),
      customer: effectiveMode === 'append' ? (values['customer'] || doc.party_name || '') : (doc.party_name || values['customer'] || ''),
      warehouseId: effectiveMode === 'append' ? (values['warehouseId'] ?? (doc.warehouse_id ?? null)) : (doc.warehouse_id ?? values['warehouseId']),
      warehouse: effectiveMode === 'append' ? (values['warehouse'] || doc.warehouse_name || doc.remarks || '') : (doc.warehouse_name || doc.remarks || values['warehouse'] || ''),
      referenceNo: effectiveMode === 'append' ? (values['referenceNo'] || doc.doc_number) : doc.doc_number
    }));
    this.boundReferenceLabels.update(labels => effectiveMode === 'append' ? [...labels, doc.doc_number] : [doc.doc_number]);
    this.closePurchaseReferencePicker();
  }

  // ── Pending-DC banner (rule 10) — read-only hint, dismissible, never blocks.
  readonly pendingDcDocs = signal<PurchaseRefDoc[]>([]);
  readonly pendingDcDismissed = signal(false);
  private pendingDcRequestKey = '';

  checkPendingDcBanner(): void {
    if (this.config?.key !== 'salesInvoice') return;
    const customer = this.findCustomerBySelection(this.formValues()['customer']);
    const customerId = customer?.id ?? this.optionalNumber(this.formValues()['customerId']);
    if (!customerId) {
      this.pendingDcDocs.set([]);
      return;
    }
    const requestKey = `${customerId}:${this.selectedSegmentId() || 'all'}`;
    if (this.pendingDcRequestKey === requestKey) return;
    this.pendingDcRequestKey = requestKey;
    this.pendingDcDismissed.set(false);
    this.txService.getRefDocs('DC', this.selectedSegmentId(), customerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.pendingDcDocs.set(res.success ? (res.data || []) : []),
        error: () => this.pendingDcDocs.set([])
      });
  }

  dismissPendingDcBanner(): void {
    this.pendingDcDismissed.set(true);
  }

  pullPendingDcIntoInvoice(): void {
    this.openSecondaryReferencePicker(this.pendingDcDocs());
  }

  // ── DC list "pending invoice" filter (rule 12) ───────────────────────────
  readonly dcPendingInvoiceFilter = signal(false);

  toggleDcPendingInvoiceFilter(): void {
    this.dcPendingInvoiceFilter.update(v => !v);
    this.loadApiRecords();
  }

  private referenceItemVariantText(item: any): string {
    return String(
      item?.variant_name
      || item?.variantName
      || item?.variant_label
      || item?.variantLabel
      || ''
    ).trim();
  }

  private referenceItemAttributeText(item: any): string {
    const rows = Array.isArray(item?.attributes)
      ? item.attributes
      : Array.isArray(item?.variant_attributes)
        ? item.variant_attributes
        : Array.isArray(item?.variantAttributes)
          ? item.variantAttributes
          : [];

    const fromRows = rows
      .map((attr: any) => {
        const name = String(attr?.attribute_name || attr?.attributeName || attr?.name || '').trim();
        const value = String(attr?.attribute_value || attr?.attributeValue || attr?.value_name || attr?.valueName || attr?.value || '').trim();
        return name && value ? `${name}: ${value}` : (value || name);
      })
      .filter(Boolean);
    if (fromRows.length) return fromRows.join(' | ');

    const attrName = String(item?.attribute_name || item?.attributeName || '').trim();
    const attrValue = String(item?.attribute_value || item?.attributeValue || item?.value_name || item?.valueName || '').trim();
    return attrName && attrValue ? `${attrName}: ${attrValue}` : (attrValue || attrName);
  }

  private referenceItemToLineRow(item: any, screenKey: string, sourceDoc?: PurchaseRefDoc): string[] {
    const product = item?.product_name || item?.productName || '';
    const uom = item?.uom_name || item?.uomName || '';
    const productCode = item?.product_code || item?.productCode || '';
    const requiredQty = String(item?.required_qty ?? item?.requiredQty ?? '');
    const receivedQty = String(item?.received_qty ?? item?.receivedQty ?? requiredQty);
    const rate = String(item?.vendor_rate ?? item?.vendorRate ?? item?.estimated_rate ?? item?.estimatedRate ?? item?.rate ?? '');
    const gst = String(item?.gst_rate ?? item?.gstRate ?? '');
    const discount = String(item?.discount_pct ?? item?.discountPct ?? '0');
    const remarks = item?.remarks || productCode || '';

    if (screenKey === 'requestForQuotation') {
      // columns: Product, Variant, Attribute, Qty, UOM, Target Rate, Vendor Rate, Lead Time
      return this.normalizeLineRow([product, '', '', requiredQty, uom, rate, '', '']);
    }

    if (screenKey === 'purchaseOrder') {
      // columns: Item/SKU, Variant, Attribute, UOM, Qty, Rate, Disc%, GST, Warehouse, Amount
      const warehouse = this.formValues()['receivingWarehouse'] || this.warehouseOptions?.[0] || '';
      const row = this.normalizeLineRow([product, '', '', uom, requiredQty, rate, '0', gst, warehouse, '']);
      this.recalculateLineRow(row);
      return row;
    }

    if (screenKey === 'goodsReceipt') {
      // columns: Product, Variant, Attribute, UOM, Received Qty, Accepted Qty, Rate, Disc %, GST, Batch No, Serial No, Expiry Date, Amount
      const variant = this.referenceItemVariantText(item);
      const attribute = this.referenceItemAttributeText(item);
      const row = this.normalizeLineRow([
        product,
        variant,
        attribute,
        uom,
        requiredQty,
        receivedQty,
        rate,
        discount,
        gst,
        item?.batch_no || item?.batchNo || '',
        item?.serial_no || item?.serialNo || '',
        item?.expiry_date || item?.expiryDate || '',
        '',
      ]);
      this.recalculateLineRow(row);
      return row;
    }

    if (screenKey === 'purchaseInvoice') {
      // Same operational grid as GRN. For a GRN-linked PI, Accepted Qty is the
      // invoice quantity and stock does not move again; for a direct PI it is
      // the quantity posted to stock.
      const variant = this.referenceItemVariantText(item);
      const attribute = this.referenceItemAttributeText(item);
      const receivedQtyText = String(item?.received_qty ?? item?.receivedQty ?? item?.qty ?? requiredQty);
      const invoiceQty = String(item?.accepted_qty ?? item?.acceptedQty ?? item?.qty ?? receivedQtyText);
      const row = this.blankLineRow();
      const set = (column: string, value: string) => {
        const idx = this.lineColumnIndex(column);
        if (idx >= 0) row[idx] = value;
      };
      set('Product', product);
      set('Variant', variant);
      set('Attribute', attribute);
      set('UOM', uom);
      set('Received Qty', receivedQtyText);
      set('Accepted Qty', invoiceQty);
      set('Rate', rate);
      set('MRP', String(item?.mrp ?? item?.Mrp ?? ''));
      set('Selling Price', String(item?.selling_price ?? item?.sellingPrice ?? ''));
      set('Disc %', discount);
      set('GST', gst);
      set('Batch No', item?.batch_no || item?.batchNo || '');
      set('Serial No', item?.serial_no || item?.serialNo || '');
      set('Expiry Date', item?.expiry_date || item?.expiryDate || '');
      set('Amount', String(item?.amount ?? ''));
      this.recalculateLineRow(row);
      return row;
    }

    if (screenKey === 'purchaseReturn') {
      // columns: Product, Variant, Attribute, UOM, Invoice Qty, Return Qty, Rate, GST, Return Amount, Return Reason
      // "Invoice Qty" is what the column header says it is — the qty
      // actually invoiced on this PI line, a fixed historical fact — not
      // qty-still-returnable-after-prior-returns. It was previously set from
      // remaining_qty (qty minus already returned), which happened to look
      // right only because remaining_qty itself was miscomputed as the full
      // original qty (115/116's attribute-matching fix); once that started
      // computing correctly, this cell started showing the reduced number
      // under a column that promises the original one. The reference
      // picker's own drill-down (Purchase Return's "Pick PI Reference" tray)
      // is where remaining/already-returned qty belongs, and already shows
      // it — this cell doesn't need to duplicate it.
      const originalInvoiceQty = Number(item?.qty ?? item?.received_qty ?? item?.receivedQty ?? requiredQty ?? 0) || 0;
      const invoiceQty = String(originalInvoiceQty || '');
      const variant = this.referenceItemVariantText(item);
      const attribute = this.referenceItemAttributeText(item);
      const row = this.normalizeLineRow([product, variant, attribute, uom, invoiceQty, '', rate, gst, '', '']);
      this.recalculateLineRow(row);
      return row;
    }

    if (screenKey === 'debitNote') {
      // columns: Description, Reference, Amount, GST %, GST Amount, Total Amount
      const qty = Number(item?.return_qty ?? item?.returnQty ?? item?.qty ?? 0) || 0;
      const rateNum = Number(item?.rate ?? 0) || 0;
      const amount = Number(item?.taxable_amount ?? item?.taxableAmount ?? 0) || (qty * rateNum);
      const gstPct = Number(item?.gst_rate ?? item?.gstRate ?? 0) || 0;
      const gstAmount = Number(item?.tax_amount ?? item?.taxAmount ?? 0) || (amount * gstPct / 100);
      const totalAmount = Number(item?.return_amount ?? item?.returnAmount ?? 0) || (amount + gstAmount);
      const variant = this.referenceItemVariantText(item);
      const attribute = this.referenceItemAttributeText(item);
      const description = ['Purchase Return', product, variant, attribute].filter(Boolean).join(' - ');
      return this.normalizeLineRow([
        description,
        sourceDoc?.doc_number || '',
        String(amount || ''),
        String(gstPct || ''),
        String(gstAmount || ''),
        String(totalAmount || '')
      ]);
    }

    if (screenKey === 'deliveryChallan') {
      // columns: Product, Variant, Attribute, SO Qty, Dispatch Qty, UOM
      // When picked from an SO, show remaining-to-deliver (qty - delivered_qty)
      // rather than the full ordered qty, per rule 3/4 "editable downward only".
      // When picked from an SI (flow E), so_qty carries the invoice's own qty
      // instead — there's no SO leg on that path.
      const orderedQty = Number(item?.qty ?? item?.required_qty ?? item?.requiredQty ?? 0);
      const deliveredQty = Number(item?.delivered_qty ?? item?.deliveredQty ?? 0);
      const soQty = item?.delivered_qty !== undefined || item?.deliveredQty !== undefined
        ? String(Math.max(0, orderedQty - deliveredQty))
        : String(orderedQty || '');
      const variant = this.referenceItemVariantText(item);
      const attribute = item?.attribute_value || item?.attributeValue || this.referenceItemAttributeText(item);
      const row = this.blankLineRow();
      const set = (column: string, value: string) => {
        const idx = this.lineColumnIndex(column);
        if (idx >= 0) row[idx] = value;
      };
      set('Product', product);
      set('Variant', variant);
      set('Attribute', attribute);
      set('SO Qty', soQty);
      set('Dispatch Qty', soQty);
      set('UOM', uom);
      return row;
    }

    if (screenKey === 'salesInvoice') {
      // columns: Item / SKU, Variant, Attribute, UOM, Qty, Rate, MRP, Selling Price, Disc%, GST, Batch/Serial, Expiry Date, Warehouse, Amount
      // Remaining qty, whichever source this item came from: a DC pick sets
      // remaining_qty (dispatch_qty - invoiced_qty); a direct SO pick carries
      // qty/invoiced_qty instead. Rule 4: never pre-fill more than what's
      // actually left un-invoiced on the source line. SO/DC items don't
      // carry price of their own, so MRP/Selling Price/Rate fall back to the
      // product master's own values below (applyProductPricingDefaults) —
      // same defaulting a manually-added line already gets — instead of
      // being left blank and forcing the user to re-type prices that are
      // already on the product.
      const variant = this.referenceItemVariantText(item);
      const attribute = item?.attribute_value || item?.attributeValue || this.referenceItemAttributeText(item);
      let dispatchQty: string;
      if (item?.remaining_qty !== undefined || item?.remainingQty !== undefined) {
        dispatchQty = String(item?.remaining_qty ?? item?.remainingQty ?? '');
      } else if (item?.invoiced_qty !== undefined || item?.invoicedQty !== undefined) {
        const orderedQty = Number(item?.qty ?? 0);
        const invoicedQty = Number(item?.invoiced_qty ?? item?.invoicedQty ?? 0);
        dispatchQty = String(Math.max(0, orderedQty - invoicedQty));
      } else {
        dispatchQty = String(item?.dispatch_qty ?? item?.dispatchQty ?? item?.qty ?? '');
      }
      const row = this.blankLineRow();
      const set = (column: string, value: string) => {
        const idx = this.lineColumnIndex(column);
        if (idx >= 0) row[idx] = value;
      };
      const refProduct = this.findProductForReferenceItem(item, product);
      set('Item / SKU', product);
      set('Variant', variant);
      set('Attribute', attribute);
      set('UOM', uom);
      set('Qty', dispatchQty);
      const mrp = this.firstPositiveCurrencyValue(item?.mrp, item?.Mrp, refProduct?.mrp);
      const sellingPrice = this.firstPositiveCurrencyValue(
        item?.selling_price,
        item?.sellingPrice,
        (refProduct as any)?.selling_price,
        (refProduct as any)?.sellingPrice
      );
      set('MRP', this.lineMoneyText(this.productSalesPriceForUomSelection(refProduct, uom, mrp, 'salesInvoice')));
      set('Selling Price', this.lineMoneyText(this.productSalesPriceForUomSelection(refProduct, uom, sellingPrice, 'salesInvoice')));
      const procurementRate = this.firstPositiveCurrencyValue(
        item?.mrp,
        item?.Mrp,
        item?.selling_price,
        item?.sellingPrice,
        refProduct?.mrp,
        (refProduct as any)?.selling_price,
        (refProduct as any)?.sellingPrice
      );
      set('Rate', this.lineMoneyText(this.productSalesPriceForUomSelection(refProduct, uom, procurementRate, 'salesInvoice')));
      set('Disc %', discount);
      set('GST', gst);
      set('Amount', String(item?.amount ?? ''));
      if (refProduct) this.applyProductPricingDefaults(row, refProduct);
      this.recalculateLineRow(row);
      return row;
    }

    if (screenKey === 'salesReturn') {
      // columns: Product, Variant, Attribute, Invoiced Qty, Return Qty, UOM, Rate, GST, Batch No, Serial No, Expiry Date, Return Amount, Reason
      const invoicedQty = String(item?.remaining_qty ?? item?.remainingQty ?? item?.qty ?? item?.invoiced_qty ?? item?.invoicedQty ?? '');
      const variant = this.referenceItemVariantText(item);
      const attribute = item?.attribute_value || item?.attributeValue || this.referenceItemAttributeText(item);
      const row = this.blankLineRow();
      const set = (column: string, value: string) => {
        const idx = this.lineColumnIndex(column);
        if (idx >= 0) row[idx] = value;
      };
      set('Product', product);
      set('Variant', variant);
      set('Attribute', attribute);
      set('Invoiced Qty', invoicedQty);
      set('UOM', uom);
      set('Rate', rate);
      set('GST', gst);
      set('Batch No', item?.batch_no || item?.batchNo || '');
      set('Serial No', item?.serial_no || item?.serialNo || '');
      set('Expiry Date', item?.expiry_date || item?.expiryDate || '');
      this.recalculateLineRow(row);
      return row;
    }

    if (screenKey === 'creditNote') {
      // columns: Description, Reference, Amount, GST %, GST Amount, Total Amount
      const qty = Number(item?.return_qty ?? item?.returnQty ?? item?.qty ?? 0) || 0;
      const rateNum = Number(item?.rate ?? 0) || 0;
      const amount = Number(item?.taxable_amount ?? item?.taxableAmount ?? item?.return_amount ?? item?.returnAmount ?? 0) || (qty * rateNum);
      const gstPct = Number(item?.gst_rate ?? item?.gstRate ?? 0) || 0;
      const gstAmount = Number(item?.tax_amount ?? item?.taxAmount ?? 0) || (amount * gstPct / 100);
      const totalAmount = Number(item?.return_amount ?? item?.returnAmount ?? 0) || (amount + gstAmount);
      const variant = this.referenceItemVariantText(item);
      const attribute = this.referenceItemAttributeText(item);
      const description = ['Sales Return', product, variant, attribute].filter(Boolean).join(' - ');
      return this.normalizeLineRow([
        description,
        sourceDoc?.doc_number || '',
        String(amount || ''),
        String(gstPct || ''),
        String(gstAmount || ''),
        String(totalAmount || '')
      ]);
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

  // ── Serial number tracking (per-unit picker) ──────────────────────────────

  private serialPickerModeForKey(): 'capture' | 'select' {
    const key = this.config?.key || '';
    return (key === 'goodsReceipt' || key === 'purchaseInvoice') ? 'capture' : 'select';
  }

  private serialPickerQtyForRow(row: string[]): number {
    // Deliberately scoped per screen, and mirrors the exact fallback chains
    // purchaseGrnItems()/purchasePiItems() use when building the save
    // payload — the picker must ask for precisely the qty that will actually
    // be saved, or the backend's count-vs-qty guard rejects the save.
    // (A merged needle list like ['accepted', ..., 'qty'] is also unsafe on
    // its own: lineValue() matches the first column whose label contains ANY
    // needle, scanning in column order, and "Received Qty" — which comes
    // before "Accepted Qty" on GRN — contains the substring "qty" too.)
    const key = this.config?.key || '';
    if (key === 'goodsReceipt') {
      const acceptedRaw = this.lineValue(row, ['accepted']).trim();
      return acceptedRaw !== '' ? this.lineNumber(row, ['accepted']) : this.lineNumber(row, ['received']);
    }
    if (key === 'purchaseInvoice') {
      const acceptedRaw = this.lineValue(row, ['accepted']).trim();
      if (acceptedRaw !== '') return this.lineNumber(row, ['accepted']);
      const receivedRaw = this.lineValue(row, ['received']).trim();
      return receivedRaw !== '' ? this.lineNumber(row, ['received']) : this.lineNumber(row, ['invoice', 'qty']);
    }
    if (key === 'deliveryChallan') return this.lineNumber(row, ['dispatch']);
    if (key === 'purchaseReturn' || key === 'salesReturn') return this.lineNumber(row, ['return']);
    return this.lineNumber(row, ['qty']);
  }

  isSerialApplicableRow(row: string[]): boolean {
    const productName = this.lineValue(row, ['product', 'item', 'sku']);
    const product = this.findProductBySelection(productName);
    return !!product?.serial_applicable;
  }

  private inheritedSalesSerialSource(rowIndex: number): { dcItemId?: number | null; siItemId?: number | null } | null {
    const key = this.config?.key || '';
    const ref = this.lineRefItemIdMap()[rowIndex];
    if (key === 'salesInvoice' && ref?.dcItemId) return { dcItemId: ref.dcItemId };
    if (key === 'deliveryChallan' && ref?.siItemId) return { siItemId: ref.siItemId };
    return null;
  }

  // Mirrors the backend's fn_post_grn_stock / fn_validate_serial_transition
  // checks (Database/Migrations/inventory/083_serial_number_tracking.sql) so
  // a missing/incomplete serial capture is caught here as a clear inline
  // message instead of surfacing as a raw Postgres exception after Post.
  private serialCoverageValidationMessage(): string {
    if (!this.config?.lineColumns?.length) return '';
    // Sales Order, Purchase Order, Quotations, RFQ, etc. never carry a Serial
    // No / IMEI line column — serial units are only captured on documents
    // that actually move stock (GRN, DC, Invoice, Return). Without this
    // guard, isSerialApplicableRow() (driven purely by the product master
    // flag) forced serial capture at the order stage too, before the
    // product/warehouse/qty is even finalized.
    const hasSerialColumn = this.config.lineColumns.some(column => {
      const normalized = column.toLowerCase();
      return normalized.includes('serial') || normalized.includes('imei');
    });
    if (!hasSerialColumn) return '';
    const rows = this.directEntryLineRows();
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const productName = this.lineValue(row, ['product', 'item', 'sku']);
      if (!productName || !this.isSerialApplicableRow(row)) continue;

      // Inherited rows (Sales Invoice billing a Delivery Challan) get their
      // serials reserved server-side when the picker is opened — not a
      // local capture gap, so skip rather than false-flag them here.
      if (this.inheritedSalesSerialSource(rowIndex)) continue;

      const product = this.findProductBySelection(productName);
      const qtyNeeded = this.serialPickerBaseQtyForRow(row, product);
      if (qtyNeeded <= 0) continue;

      const captured = (this.lineSerialUnitsMap()[rowIndex] || []).length;
      if (captured === 0) {
        return `Enter Serial / IMEI numbers for "${productName}" (row ${rowIndex + 1}) before posting — ${qtyNeeded} required.`;
      }
      if (captured !== qtyNeeded) {
        return `Serial / IMEI count for "${productName}" (row ${rowIndex + 1}) doesn't match quantity — entered ${captured}, need ${qtyNeeded}.`;
      }
    }
    return '';
  }

  // Serial numbers track individual physical units, always in base-UOM
  // terms — a line entered as "1 Lot" where 1 Lot = 10 No's still needs 10
  // serials, one per physical unit, regardless of which UOM the transaction
  // line itself was entered in. Reuses the same conversion factor the
  // stock-limit hint already uses (productUomConversionFactorForSelection),
  // so this stays consistent with the UOM fix applied to stock posting.
  private serialPickerBaseQtyForRow(row: string[], product: ProductItem | null | undefined): number {
    const rawQty = this.serialPickerQtyForRow(row);
    const uomSelection = this.lineValue(row, ['uom']);
    const factor = this.productUomConversionFactorForSelection(product, uomSelection, this.config?.key || '');
    return Math.round(rawQty * (factor > 0 ? factor : 1));
  }

  private trimLineSerialUnitsToCurrentQty(rowIndex: number): void {
    const serials = this.lineSerialUnitsMap()[rowIndex];
    if (!serials?.length) return;

    const row = this.normalizeLineRow(this.entryLineRows()[rowIndex] || []);
    const product = this.lineRowProduct(row);
    const qtyNeeded = this.serialPickerBaseQtyForRow(row, product);
    if (qtyNeeded <= 0 || serials.length <= qtyNeeded) return;

    this.lineSerialUnitsMap.update(map => ({ ...map, [rowIndex]: serials.slice(0, qtyNeeded) }));
  }

  serialPickerSummaryForRow(rowIndex: number, row: string[]): string {
    const count = (this.lineSerialUnitsMap()[rowIndex] || []).length;
    const productName = this.lineValue(row, ['product', 'item', 'sku']);
    const product = this.findProductBySelection(productName);
    const qty = this.serialPickerBaseQtyForRow(row, product);
    const inheritedSource = this.inheritedSalesSerialSource(rowIndex);
    const dcItemId = inheritedSource?.dcItemId ?? null;
    const siItemId = inheritedSource?.siItemId ?? null;
    const label = this.productSerialColumnLabels(product)[0] || 'Serial No';
    if (dcItemId) return count ? `${count} ${label}(s) from DC` : 'Loading…';

    if (siItemId) return count ? `${count} ${label}(s) from SI` : 'Loading...';
    const verb = this.serialPickerModeForKey() === 'capture' ? 'Enter' : 'Select';
    return `${verb} ${label} (${count}/${qty || 0})`;
  }

  private resolveHeaderWarehouseId(): number | null {
    const headerField = this.config?.key === 'deliveryChallan' ? (this.formValues()['fromWarehouse'] || this.formValues()['fromWarehouseId'])
      : (this.formValues()['warehouse'] || this.formValues()['warehouseId']);
    const warehouse = this.findWarehouseBySelection(headerField);
    return warehouse?.id ?? this.optionalNumber(headerField) ?? null;
  }

  // A serial already picked in a DIFFERENT row of the same not-yet-saved
  // document must not be offered again — sp_get_available_serials (and the
  // source-scoped equivalents) only know a unit's status in the DB, which
  // still reads 'in_stock'/'sold' until this document is actually saved, so
  // nothing server-side stops the same physical unit being picked twice
  // across two rows in one draft. This is the client-side backstop for that.
  private serialUnitsUsedInOtherRows(excludeRowIndex: number): Set<string> {
    const used = new Set<string>();
    const map = this.lineSerialUnitsMap();
    for (const key of Object.keys(map)) {
      if (Number(key) === excludeRowIndex) continue;
      for (const serial of map[Number(key)] || []) used.add(serial);
    }
    return used;
  }

  openSerialPicker(rowIndex: number, row: string[]): void {
    const productName = this.lineValue(row, ['product', 'item', 'sku']);
    const product = this.findProductBySelection(productName);
    if (!product?.serial_applicable) return;

    const qtyNeeded = this.serialPickerBaseQtyForRow(row, product);
    const inheritedSource = this.inheritedSalesSerialSource(rowIndex);
    const dcItemId = inheritedSource?.dcItemId ?? null;
    const siItemId = inheritedSource?.siItemId ?? null;

    // Purchase Return against a known PI, and Sales Return against a known
    // invoice, scope the pickable list to that source document's own units
    // (still handled below) but let the user choose which ones — e.g. the
    // specific damaged unit — instead of silently auto-binding the first N.
    // A Direct Purchase Return (no PI reference) or a Sales Return with no
    // invoice chosen yet has no source to scope to, so those fall back to
    // the unscoped manual-select list further down.
    const purchaseReturnPiId = this.config?.key === 'purchaseReturn' ? this.optionalNumber(this.formValues()['piId']) : null;
    // A GRN-linked PI never writes its own inv_serial_units rows — those
    // serials were already captured under the GRN's own id when the GRN was
    // posted (fn_post_grn_stock), and fn_post_pi_stock deliberately doesn't
    // touch stock/serials again for a GRN-linked PI. So when the referenced
    // PI has a grn_id, the lookup below has to key off 'grn'/that grn_id
    // instead of 'purchase_invoice'/the PI's own id, or it always comes back
    // empty for the (far more common) GRN -> PI -> Purchase Return flow.
    const purchaseReturnGrnId = this.config?.key === 'purchaseReturn' ? this.optionalNumber(this.formValues()['piGrnId']) : null;
    const salesReturnInvoiceId = this.config?.key === 'salesReturn' ? this.optionalNumber(this.formValues()['invoiceId']) : null;

    // Only SI billing a specific DC item stays truly "inherited" (no user
    // choice) — those units are reserved 1:1 against that exact DC item, so
    // there's nothing to pick between.
    const mode: 'capture' | 'select' | 'inherited' = inheritedSource ? 'inherited' : this.serialPickerModeForKey();

    this.activeSerialPicker.set({ rowIndex, mode, qtyNeeded, productId: product.id, productName: product.product_name || productName });
    this.serialPickerDraftValues.set([...(this.lineSerialUnitsMap()[rowIndex] || [])]);
    this.serialPickerAvailableOptions.set([]);
    this.serialPickerSelectedIds.set(new Set());
    this.serialPickerError.set('');
    this.serialPickerMessage.set('');

    if (mode === 'inherited' && inheritedSource) {
      this.serialPickerLoading.set(true);
      const inheritedSerials$ = dcItemId
        ? this.txService.getReservedSerialsForDcItem(dcItemId)
        : this.txService.getSoldSerialsForSiItem(siItemId!);
      inheritedSerials$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: res => {
            this.serialPickerLoading.set(false);
            const options = (res.data || [])
              .map((s, index) => ({ id: Number(s?.id) || -(index + 1), serial_no: String(s?.serial_no || '').trim() }))
              .filter((s): s is { id: number; serial_no: string } => !!s.serial_no);
            const existingSerials = this.lineSerialUnitsMap()[rowIndex] || this.serialPickerDraftValues();
            const serials = options.length ? options.map(s => s.serial_no) : existingSerials;
            this.serialPickerAvailableOptions.set(options);
            this.serialPickerDraftValues.set(serials);
            this.lineSerialUnitsMap.update(map => ({ ...map, [rowIndex]: serials }));
          },
          error: () => { this.serialPickerLoading.set(false); this.serialPickerError.set('Could not load reserved serials.'); }
        });
      return;
    }

    if (mode === 'select') {
      this.serialPickerLoading.set(true);
      const variantId = this.lineRowVariantId(product, row);
      // A single referenced GRN/PI/Invoice can carry the same product across
      // multiple variants — scope the source-bound lookups down to this
      // row's own variant/attribute too, or a return against one variant
      // would also offer serials that actually belong to a different one.
      const variantText = this.lineValue(row, ['variant']);
      const attributeText = this.transactionLineAttributeText(row, rowIndex);
      // Prefer the referenced document's own attribute_id/attribute_value
      // (carried via lineRefItemIdMap at reference-pick time) over
      // re-deriving it from the grid's free-text "Attribute" cell — that
      // round trip returns null outright for any multi-attribute product
      // and is what was silently emptying this exact source-scoped serial
      // lookup for attribute-tracked products.
      const refAttrForPicker = this.lineRefItemIdMap()[rowIndex];
      const resolvedAttrForPicker = this.resolveLineAttribute(product, variantText, attributeText);
      const attributeId = refAttrForPicker?.attributeId !== undefined ? refAttrForPicker.attributeId : resolvedAttrForPicker.attribute_id;
      const attributeValue = refAttrForPicker?.attributeValue !== undefined ? refAttrForPicker.attributeValue : resolvedAttrForPicker.attribute_value;
      const obs = purchaseReturnPiId
        ? this.txService.getInstockSerialsForSource(purchaseReturnGrnId
            ? { productId: product.id, sourceDocType: 'grn', sourceDocId: purchaseReturnGrnId, variantId, attributeId, attributeValue }
            : { productId: product.id, sourceDocType: 'purchase_invoice', sourceDocId: purchaseReturnPiId, variantId, attributeId, attributeValue })
        : this.config?.key === 'salesReturn'
          ? this.txService.getSoldSerialsForReturn({ productId: product.id, invoiceId: salesReturnInvoiceId, variantId, attributeId, attributeValue })
          : this.txService.getAvailableSerials({ productId: product.id, variantId, attributeId, attributeValue, warehouseId: this.resolveHeaderWarehouseId() });
      const usedElsewhere = this.serialUnitsUsedInOtherRows(rowIndex);
      const previouslySaved = [...this.serialPickerDraftValues()];
      obs.pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: res => {
            this.serialPickerLoading.set(false);
            const options = (res.data || [])
              .filter((s): s is { id: number; serial_no: string } => !!s.id && !!s.serial_no)
              .filter(s => !usedElsewhere.has(s.serial_no));
            this.serialPickerAvailableOptions.set(options);

            // Re-derive the checked ids from whatever this row had saved
            // before (e.g. re-opening an existing draft) by matching against
            // the freshly-fetched, currently-available options — one id per
            // remembered value, never the same id twice. Anything that no
            // longer matches (already returned/sold/reserved elsewhere since
            // this was last saved) silently drops out here instead of
            // surviving as a stale value that only fails at Post time with a
            // raw "Serial number X is not available" database error.
            const selectedIds = new Set<number>();
            const stillValid: string[] = [];
            for (const value of previouslySaved) {
              const match = options.find(o => o.serial_no === value && !selectedIds.has(o.id));
              if (match) {
                selectedIds.add(match.id);
                stillValid.push(value);
              }
            }
            this.serialPickerSelectedIds.set(selectedIds);
            if (stillValid.length !== previouslySaved.length) {
              this.serialPickerDraftValues.set(stillValid);
              this.lineSerialUnitsMap.update(map => ({ ...map, [rowIndex]: stillValid }));
              this.serialPickerError.set(
                `${previouslySaved.length - stillValid.length} previously selected serial(s) are no longer available and were removed — please reselect.`
              );
            }
          },
          error: () => {
            this.serialPickerLoading.set(false);
            this.serialPickerError.set(purchaseReturnPiId
              ? 'Could not load serials for the referenced Purchase Invoice.'
              : this.config?.key === 'salesReturn'
                ? 'Could not load serials for the referenced Sales Invoice.'
                : 'Could not load available serials.');
          }
        });
    }
  }

  // Keyed by the option's unique unit id (not its serial_no text) so two
  // different physical units that legitimately share the same serial text
  // (allow_duplicate serial policy) can be selected/deselected independently
  // — see serialPickerSelectedIds above for why a text-keyed toggle breaks.
  isSerialPickerOptionChecked(optionId: number): boolean {
    return this.serialPickerSelectedIds().has(optionId);
  }

  toggleSerialPickerOption(option: { id: number; serial_no: string }): void {
    const picker = this.activeSerialPicker();
    if (!picker || picker.mode === 'inherited') return;
    const selected = this.serialPickerSelectedIds();
    const next = new Set(selected);
    if (next.has(option.id)) {
      next.delete(option.id);
    } else {
      if (next.size >= picker.qtyNeeded) return;
      next.add(option.id);
    }
    this.serialPickerSelectedIds.set(next);
    const options = this.serialPickerAvailableOptions();
    this.serialPickerDraftValues.set(options.filter(o => next.has(o.id)).map(o => o.serial_no));
  }

  // Duplicate serial_no text in the current options list (allow_duplicate
  // policy) is otherwise indistinguishable to the user — surface a short
  // "Unit #<id>" hint next to those specific rows only.
  serialPickerOptionLabel(option: { id: number; serial_no: string }): string {
    const options = this.serialPickerAvailableOptions();
    const isDuplicateText = options.filter(o => o.serial_no === option.serial_no).length > 1;
    return isDuplicateText ? `${option.serial_no} (Unit #${option.id})` : option.serial_no;
  }

  // Local-only "already entered" check (same row's draft list) runs first —
  // instant, no round trip. Once that passes, sp_check_serial_duplicate asks
  // whether this serial already exists anywhere else in the system for this
  // product, and whether its Serial Number Policy allows repeats. This is a
  // hint surfaced the moment the user types/scans the value — the same rule
  // fn_post_grn_stock/fn_post_pi_stock enforces (blocking) at final Post, in
  // 106_serial_policy_duplicates_and_return_binding.sql, so a disallowed
  // duplicate is caught here instead of failing much later at Post.
  addSerialPickerCaptureValue(value: string): void {
    const picker = this.activeSerialPicker();
    const text = String(value || '').trim();
    if (!picker || picker.mode !== 'capture' || !text) return;
    const current = this.serialPickerDraftValues();
    if (current.includes(text)) {
      this.serialPickerError.set(`Serial number "${text}" is already entered.`);
      return;
    }
    if (current.length >= picker.qtyNeeded) return;

    if (!picker.productId) {
      this.commitSerialPickerCaptureValue(text);
      return;
    }

    const rowIndex = picker.rowIndex;
    this.serialPickerError.set('');
    this.txService.checkSerialDuplicate(picker.productId, text)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          // Picker may have moved to a different row/product while the
          // request was in flight — don't commit into the wrong row.
          if (this.activeSerialPicker()?.rowIndex !== rowIndex) return;
          const exists = !!res.data?.exists;
          const allowDuplicate = !!res.data?.allowDuplicate;
          if (exists && !allowDuplicate) {
            this.serialPickerError.set(
              `This serial no. already exists: "${text}". Remove the duplicate, or enable "Allow Duplicate" on its Serial Number Policy if repeats are expected.`
            );
            return;
          }
          this.commitSerialPickerCaptureValue(text, exists);
        },
        // A failed lookup shouldn't block data entry — the authoritative
        // check still runs server-side at Post either way.
        error: () => this.commitSerialPickerCaptureValue(text)
      });
  }

  private commitSerialPickerCaptureValue(text: string, isAllowedRepeat = false): void {
    const picker = this.activeSerialPicker();
    if (!picker) return;
    const current = this.serialPickerDraftValues();
    if (current.includes(text) || current.length >= picker.qtyNeeded) return;
    this.serialPickerDraftValues.set([...current, text]);
    this.serialPickerMessage.set(isAllowedRepeat
      ? `Serial number "${text}" saved (already used elsewhere — repeat allowed by its policy).`
      : `Serial number "${text}" saved.`);
    if (this.serialPickerMessageTimer) clearTimeout(this.serialPickerMessageTimer);
    this.serialPickerMessageTimer = setTimeout(() => this.serialPickerMessage.set(''), 1800);
  }

  removeSerialPickerCaptureValue(value: string): void {
    this.serialPickerDraftValues.set(this.serialPickerDraftValues().filter(s => s !== value));
  }

  // Bulk counterpart to addSerialPickerCaptureValue — adds a whole
  // From-To generated range in one go. Silently skips values already in the
  // draft (same "already entered" rule as the single-value path, just
  // without blocking the rest of the range on one collision) and never adds
  // past qtyNeeded. Returns how many were actually added so the modal can
  // tell the user whether anything happened.
  addSerialPickerRangeValues(values: string[]): number {
    const picker = this.activeSerialPicker();
    if (!picker || picker.mode !== 'capture' || !values.length) return 0;

    const current = this.serialPickerDraftValues();
    const remaining = picker.qtyNeeded - current.length;
    const uniqueNew = values.filter(v => !current.includes(v));
    const toAdd = uniqueNew.slice(0, Math.max(0, remaining));
    if (!toAdd.length) return 0;

    this.serialPickerError.set('');
    this.serialPickerDraftValues.set([...current, ...toAdd]);
    const skipped = values.length - toAdd.length;
    this.serialPickerMessage.set(
      skipped > 0
        ? `${toAdd.length} serial number(s) added, ${skipped} skipped (duplicate or exceeds quantity needed).`
        : `${toAdd.length} serial number(s) added.`
    );
    if (this.serialPickerMessageTimer) clearTimeout(this.serialPickerMessageTimer);
    this.serialPickerMessageTimer = setTimeout(() => this.serialPickerMessage.set(''), 2500);
    return toAdd.length;
  }

  closeSerialPicker(save: boolean): void {
    const picker = this.activeSerialPicker();
    if (picker && save) {
      this.lineSerialUnitsMap.update(map => ({ ...map, [picker.rowIndex]: [...this.serialPickerDraftValues()] }));
    }
    this.activeSerialPicker.set(null);
    this.serialPickerDraftValues.set([]);
    this.serialPickerAvailableOptions.set([]);
    this.serialPickerSelectedIds.set(new Set());
    this.serialPickerError.set('');
    this.serialPickerMessage.set('');
    if (this.serialPickerMessageTimer) {
      clearTimeout(this.serialPickerMessageTimer);
      this.serialPickerMessageTimer = null;
    }
  }

  isNameField(field: InventoryField): boolean {
    const key = (field.key || '').toLowerCase();
    return key.includes('name') && !key.includes('contact') && !key.includes('brand') && !key.includes('manufacturer');
  }

  clearConfigForm(): void {
    this.formValues.set({});
    this.deliveryAddressOverride.set(null);
    this.transportDetailsForm.set({});
    this.transportDetailsToggleOverride.set(null);
    this.isLineGridFullscreen.set(false);
    this._autoCodeFields.clear();
    this.genericNameValue.set('');
    this.editingId.set(null);
    this.txDocId.set(null);
    this.txDocNumber.set('');
    this.txDocStatus.set('draft');
    this.txSaveError.set('');
    this.txSaveMsg.set('');
    this.bundleConsumptionOpen.set(false);
    this.bundleConsumptionInvoiceId.set(null);
    this.bundleConsumptionInvoiceNo.set('');
    this.bundleConsumptionRows.set([]);
    this.bundleConsumptionError.set('');
    this.bundleConsumptionLoading.set(false);
    this.boundReferenceFields.set({});
    this.boundReferenceLabels.set([]);
    this.fieldDefaultValues.clear();
    this.saveError.set('');
    this.lineAttrValueMap.set({});
    this.lineSerialValueMap.set({});
    this.lineSerialUnitsMap.set({});
    this.categorySerialApplicable.set(false);
    this.categoryBatchApplicable.set(false);
    this.uomConversionRequired.set(false);
    this.selectedApplicableVariants.set([]);
    this.variantStockCombinationRows.set([]); this.pendingCombinationPicks.set({});
    this.pendingCombinationVariantId.set(null);
    this.pendingProductVariantMapVariantId.set(null);
    this.pendingProductVariantMapAttribute.set('');
    this.pendingProductVariantMapValue.set('');
    this.attributeValuesPendingDeactivate.set([]);
    this.pendingVariantResolve.set(null);
    this.variantGeneratorSelections.set([]);
    this.variantGeneratorRows.set([]);
    this.variantGeneratorPicked.set({});
    this.variantGeneratorMessage.set('');
    this.variantGeneratorError.set('');

    if (this.config?.key === 'uomMaster' || this.config?.key === 'variantMaster') {
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set([this.blankLineRow()]);
    }

    if (this.isPurchaseTransactionKey()) {
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set([this.blankLineRow()]);
      this.lineAttrValueMap.set({});
      this.lineSerialValueMap.set({});
      return;
    }

    if (this.isSalesTransactionKey()) {
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set([this.blankLineRow()]);
      this.lineAttrValueMap.set({});
      this.lineSerialValueMap.set({});
      this.lineRefItemIdMap.set({});
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
      uomSymbol: record.uom_symbol || '',
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
      if (this.config?.key === 'purchaseInvoice') {
        this.applyPurchaseInvoiceFieldDefaults(next, key, normalizedValue);
      }
      if (this.config?.key === 'deliveryChallan') {
        this.applyDeliveryChallanFieldDefaults(next, key, normalizedValue);
      }
      if (this.config?.kind === 'transaction' && (key === 'customer' || key === 'party')) {
        this.applySalesCustomerFieldDefaults(next, key, normalizedValue);
      }
      if (this.config?.kind === 'transaction' && this.isSalesTransactionKey(this.config?.key || '')) {
        this.applySalesTransactionPaymentDefaults(next, key);
      }
      return next;
    });
    if (key === 'segment' && normalizedValue && !this.optionEquals(this.selectedSegment(), normalizedValue)) {
      this.selectedSegment.set(normalizedValue);
    }
    if (this.config?.key === 'salesInvoice' && (key === 'customer' || key === 'soReference')) {
      this.checkPendingDcBanner();
    }
  }

  private applyPurchaseInvoiceFieldDefaults(next: Record<string, any>, key: string, value: any): void {
    if (key === 'vendor') {
      const vendor = this.findVendorBySelection(value);
      next['vendorId'] = vendor?.id ?? null;
      if (vendor?.payment_term_name) {
        next['paymentTerms'] = vendor.payment_term_name;
      }
    }

    if (key === 'receivingLocation') {
      const selected = String(value || '').trim();
      const selectedWarehouse = this.findWarehouseBySelection(selected);
      const selectedBranch = selectedWarehouse ? null : this.findBranchBySelection(selected);
      next['warehouseId'] = selectedWarehouse?.id ?? null;
      next['warehouse'] = selectedWarehouse?.warehouse_name || '';
      next['branchId'] = selectedBranch
        ? (this.optionalNumber(selectedBranch.branch_id) ?? this.optionalNumber(selectedBranch.id))
        : null;
      next['branch'] = selectedBranch?.branch_name || '';
    }

    if (key === 'vendor' || key === 'piDate' || key === 'paymentTerms') {
      const terms = String(next['paymentTerms'] || '').trim();
      if (terms) {
        next['dueDate'] = this.purchaseInvoiceDueDate(next['piDate'], terms) || next['dueDate'] || null;
      }
    }
  }

  private applyDeliveryChallanFieldDefaults(next: Record<string, any>, key: string, value: any): void {
    if (key !== 'fromWarehouse') return;
    const selected = String(value || '').trim();
    const selectedWarehouse = this.findWarehouseBySelection(selected);
    const selectedBranch = selectedWarehouse ? null : this.findBranchBySelection(selected);
    next['fromWarehouseId'] = selectedWarehouse?.id ?? null;
    next['warehouseId'] = selectedWarehouse?.id ?? null;
    next['warehouse'] = selectedWarehouse?.warehouse_name || '';
    next['branchId'] = selectedBranch
      ? (this.optionalNumber(selectedBranch.branch_id) ?? this.optionalNumber(selectedBranch.id))
      : null;
    next['branch'] = selectedBranch?.branch_name || '';
  }

  private applySalesCustomerFieldDefaults(next: Record<string, any>, key: string, value: any): void {
    if (key !== 'customer' && key !== 'party') return;
    const customer = this.findCustomerBySelection(value);
    next['customerId'] = customer?.id ?? null;
    if (customer?.payment_term_name) {
      next['paymentTerms'] = customer.payment_term_name;
    }
    if (this.config?.key === 'deliveryChallan') {
      Object.assign(next, this.dcAddressPatchFromSource(customer, false, next));
    }
  }

  private applySalesTransactionPaymentDefaults(next: Record<string, any>, key: string): void {
    if (!this.displayFields().some(field => field.key === 'dueDate')) return;
    const paymentKeys = new Set(['customer', 'party', 'invoiceDate', 'transactionDate', 'soDate', 'paymentTerms']);
    if (!paymentKeys.has(key)) return;
    const terms = String(next['paymentTerms'] || '').trim();
    if (!terms) return;
    const docDate = next['invoiceDate'] || next['soDate'] || next['transactionDate'] || next['docDate'];
    next['dueDate'] = this.purchaseInvoiceDueDate(docDate, terms) || next['dueDate'] || null;
  }

  // Backing state for the shared <app-inventory-delivery-address> component
  // (see inventory-delivery-address.component.ts) — the "Deliver to a
  // different address?" Yes/No switch shown on Sales Order, Sales Invoice
  // and Delivery Challan. `null` means "not explicitly touched yet": in that
  // state the switch auto-reflects whether the loaded record already has
  // delivery-address data, so editing an older document with an address
  // already filled in doesn't hide it. Reset in clearConfigForm()/
  // editRecordByRow() below so a fresh or newly-loaded document starts from
  // that auto-detected state again rather than carrying over the previous
  // record's explicit toggle choice.
  private readonly deliveryAddressOverride = signal<boolean | null>(null);

  deliveryAddressEnabled(): boolean {
    const override = this.deliveryAddressOverride();
    if (override !== null) return override;
    const v = this.formValues();
    return !!(v['deliveryHouseNo'] || v['deliveryStreet'] || v['deliveryState'] || v['deliveryDistrict']
      || v['deliveryCity'] || v['deliveryPincode'] || v['deliveryAddress']);
  }

  toggleDeliveryAddress(checked: boolean): void {
    this.deliveryAddressOverride.set(checked);
    if (!checked) {
      this.formValues.update(v => ({
        ...v,
        deliveryHouseNo: '', deliveryStreet: '', deliveryState: '',
        deliveryDistrict: '', deliveryCity: '', deliveryPincode: '', deliveryAddress: ''
      }));
    }
  }

  // ── Transport Details (shared across every goods-moving transaction screen) ──
  // Backed by inventory.inv_transport_details, a table of its own keyed by
  // (docType, docId) rather than columns on each transaction table -- see
  // 128_transport_details.sql. That means its state can't just live in
  // formValues() like an ordinary field: it's fetched separately once a
  // record's own id is known (loadTransportDetailsForRecord, called from
  // editRecordByRow) and saved separately right after the parent document's
  // own save succeeds (saveTransportDetailsIfNeeded, called from
  // executeSaveConfigRecord's success handler), since a brand-new
  // document has no id -- and so no doc_id to attach transport details to
  // -- until that first save completes.
  private readonly transportDetailsDocTypeMap: Record<string, string> = {
    salesOrder: 'sales_order',
    deliveryChallan: 'delivery_challan',
    salesInvoice: 'sales_invoice',
    salesReturn: 'sales_return',
    purchaseOrder: 'purchase_order',
    goodsReceipt: 'grn',
    purchaseInvoice: 'purchase_invoice',
    purchaseReturn: 'purchase_return',
    stockTransfer: 'stock_transfer',
    shipmentEntry: 'shipment_entry',
    gatePass: 'gate_pass'
  };

  readonly transportDetailsForm = signal<Record<string, any>>({});
  private readonly transportDetailsToggleOverride = signal<boolean | null>(null);

  transportDetailsDocType(): string | null {
    return this.transportDetailsDocTypeMap[this.config?.key || ''] || null;
  }

  transportDetailsSectionAvailable(): boolean {
    return !!this.transportDetailsDocType();
  }

  private transportDetailsHasAnyValue(f: Record<string, any> = this.transportDetailsForm()): boolean {
    return !!(f['vehicleType'] || f['vehicleName'] || f['vehicleNo'] || f['weighingEnabled'] || f['driverEnabled']);
  }

  transportDetailsSectionEnabled(): boolean {
    const override = this.transportDetailsToggleOverride();
    if (override !== null) return override;
    return this.transportDetailsHasAnyValue();
  }

  toggleTransportDetailsSection(checked: boolean): void {
    this.transportDetailsToggleOverride.set(checked);
    if (!checked) this.transportDetailsForm.set({});
  }

  setTransportDetailsField(key: string, value: any): void {
    this.transportDetailsForm.update(f => ({ ...f, [key]: value }));
  }

  private loadTransportDetailsForRecord(docId: number | null): void {
    this.transportDetailsForm.set({});
    this.transportDetailsToggleOverride.set(null);
    const docType = this.transportDetailsDocType();
    if (!docType || !docId) return;
    this.txService.getTransportDetails(docType, docId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const data = res.data;
          if (data && (data.id || data.vehicleType || data.vehicleName || data.vehicleNo)) {
            this.transportDetailsForm.set({ ...data });
          }
        },
        error: () => {}
      });
  }

  private saveTransportDetailsIfNeeded(docId: number | null): void {
    const docType = this.transportDetailsDocType();
    if (!docType || !docId || !this.transportDetailsHasAnyValue()) return;
    const payload: TransportDetails = { ...this.transportDetailsForm(), docType, docId } as TransportDetails;
    this.txService.saveTransportDetails(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => {}, error: () => {} });
  }

  dcDistrictOptions(): string[] {
    const state = String(this.formValues()['deliveryState'] || '').trim();
    const current = String(this.formValues()['deliveryDistrict'] || '').trim();
    const districts = DC_STATE_DISTRICTS[state] || [];
    return current && !districts.some(item => this.optionEquals(item, current))
      ? [current, ...districts]
      : districts;
  }

  updateDcDeliveryAddressPart(key: string, value: any): void {
    const normalized = this.normalizeDcAddressPart(key, value);
    this.formValues.update(values => {
      const next = { ...values, [key]: normalized };
      next['deliveryAddress'] = this.composeDcDeliveryAddress(next);
      return next;
    });
  }

  onDcDeliveryStateChange(value: any): void {
    const state = toInventoryTitleCase(String(value || ''));
    this.formValues.update(values => {
      const districts = DC_STATE_DISTRICTS[state] || [];
      const currentDistrict = String(values['deliveryDistrict'] || '').trim();
      const next: Record<string, any> = {
        ...values,
        deliveryState: state,
        deliveryDistrict: currentDistrict && districts.length && !districts.some(item => this.optionEquals(item, currentDistrict)) ? '' : currentDistrict
      };
      next['deliveryAddress'] = this.composeDcDeliveryAddress(next);
      return next;
    });
  }

  onDcDeliveryPincodeChange(value: any): void {
    const pincode = String(value || '').replace(/\D/g, '').slice(0, 6);
    this.updateDcDeliveryAddressPart('deliveryPincode', pincode);
    if (pincode.length === 6) {
      this.lookupDcPincode(pincode);
    }
  }

  composeDcDeliveryAddress(values: Record<string, any> = this.formValues()): string {
    const line1 = String(values['deliveryHouseNo'] || '').trim();
    const line2 = String(values['deliveryStreet'] || '').trim();
    const city = String(values['deliveryCity'] || '').trim();
    const district = String(values['deliveryDistrict'] || '').trim();
    const state = String(values['deliveryState'] || '').trim();
    const pincode = String(values['deliveryPincode'] || '').trim();
    return [line1, line2, city, district, state, pincode].filter(Boolean).join(', ');
  }

  private normalizeDcAddressPart(key: string, value: any): string {
    const text = String(value || '');
    if (key === 'deliveryPincode') return text.replace(/\D/g, '').slice(0, 6);
    if (key === 'deliveryState' || key === 'deliveryDistrict' || key === 'deliveryCity') return toInventoryTitleCase(text);
    return String(applyInventoryTextCase(text, 'sentence'));
  }

  private dcAddressPatchFromSource(source: any, overwrite = true, baseValues: Record<string, any> = this.formValues()): Record<string, any> {
    if (!source) return {};
    const patch: Record<string, any> = {};
    const value = (...keys: string[]) => {
      for (const key of keys) {
        const found = source?.[key];
        if (found !== undefined && found !== null && String(found).trim()) return String(found).trim();
      }
      return '';
    };
    const maybe = (target: string, nextValue: string) => {
      if (!nextValue) return;
      if (overwrite || !String(baseValues[target] || '').trim()) {
        patch[target] = this.normalizeDcAddressPart(target, nextValue);
      }
    };
    maybe('deliveryState', value('state', 'State'));
    maybe('deliveryDistrict', value('district', 'District'));
    maybe('deliveryCity', value('city', 'City', 'town', 'Town'));
    maybe('deliveryPincode', value('pincode', 'pinCode', 'postal_code', 'postalCode'));
    maybe('deliveryStreet', value('area', 'Area', 'street', 'Street'));
    maybe('deliveryAddress', value('address', 'delivery_address', 'deliveryAddress'));
    const next = { ...baseValues, ...patch };
    if (!String(patch['deliveryAddress'] || '').trim()) {
      const composed = this.composeDcDeliveryAddress(next);
      if (composed && (overwrite || !String(baseValues['deliveryAddress'] || '').trim())) {
        patch['deliveryAddress'] = composed;
      }
    }
    return patch;
  }

  private lookupDcPincode(pincode: string): void {
    const local = this.localDcPincodeLookup(pincode);
    if (local) this.applyDcPincodeLookup(local);

    const seq = ++this.dcPincodeLookupSeq;
    fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (seq !== this.dcPincodeLookupSeq) return;
        const postOffice = data?.[0]?.PostOffice?.[0];
        if (!postOffice) return;
        this.applyDcPincodeLookup({
          state: postOffice.State || '',
          district: postOffice.District || '',
          city: postOffice.Block && postOffice.Block !== 'NA' ? postOffice.Block : (postOffice.Name || ''),
          area: postOffice.Name || ''
        });
      })
      .catch(() => {});
  }

  private localDcPincodeLookup(pincode: string): { state: string; district: string; city: string; area: string } | null {
    const fromFallback = DC_PINCODE_FALLBACK[pincode];
    if (fromFallback) return fromFallback;
    const allSources = [
      ...this.loadedCustomerObjects(),
      ...this.loadedWarehouseObjects(),
      ...this.loadedBranchObjects()
    ] as any[];
    const match = allSources.find(item => String(item?.pincode || '').replace(/\D/g, '') === pincode);
    if (!match) return null;
    return {
      state: match.state || '',
      district: match.district || '',
      city: match.city || '',
      area: match.address || match.warehouse_name || match.branch_name || match.customer_name || ''
    };
  }

  private applyDcPincodeLookup(lookup: { state: string; district: string; city: string; area: string }): void {
    this.formValues.update(values => {
      const next: Record<string, any> = {
        ...values,
        deliveryState: lookup.state || values['deliveryState'] || '',
        deliveryDistrict: lookup.district || values['deliveryDistrict'] || '',
        deliveryCity: lookup.city || values['deliveryCity'] || '',
        deliveryStreet: values['deliveryStreet'] || lookup.area || ''
      };
      next['deliveryAddress'] = this.composeDcDeliveryAddress(next);
      return next;
    });
  }

  // ── Vendor Master / Customer Master structured address ─────────────────────
  // Vendor and Customer already have their own real city/state/district/pincode
  // columns (unlike DC/Sales Order, which only ever store one composed address
  // string) — so these save each part independently, no composeXAddress step
  // needed. Reuses the same DC_ADDRESS_STATES/DC_STATE_DISTRICTS reference data
  // and the same postalpincode.in + localDcPincodeLookup() lookup DC already
  // uses (that helper is already generic — takes a pincode, returns state/
  // district/city/area — not tied to any DC-specific state). Plain 'state'/
  // 'district'/'city'/'pincode' keys are safe here (no 'delivery' prefix
  // needed) since Vendor Master and Customer Master are never both open at
  // once and those are exactly the backend column names already.
  partyDistrictOptions(): string[] {
    const state = String(this.formValues()['state'] || '').trim();
    const current = String(this.formValues()['district'] || '').trim();
    const districts = DC_STATE_DISTRICTS[state] || [];
    return current && !districts.some(item => this.optionEquals(item, current))
      ? [current, ...districts]
      : districts;
  }

  onPartyStateChange(value: any): void {
    const state = toInventoryTitleCase(String(value || ''));
    this.formValues.update(values => {
      const districts = DC_STATE_DISTRICTS[state] || [];
      const currentDistrict = String(values['district'] || '').trim();
      return {
        ...values,
        state,
        district: currentDistrict && districts.length && !districts.some(item => this.optionEquals(item, currentDistrict)) ? '' : currentDistrict
      };
    });
  }

  onPartyPincodeChange(value: any): void {
    const pincode = String(value || '').replace(/\D/g, '').slice(0, 6);
    this.collectFormField('pincode', pincode);
    if (pincode.length === 6) {
      this.lookupPartyPincode(pincode);
    }
  }

  private lookupPartyPincode(pincode: string): void {
    const local = this.localDcPincodeLookup(pincode);
    if (local) this.applyPartyPincodeLookup(local);

    const seq = ++this.partyPincodeLookupSeq;
    fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (seq !== this.partyPincodeLookupSeq) return;
        const postOffice = data?.[0]?.PostOffice?.[0];
        if (!postOffice) return;
        this.applyPartyPincodeLookup({
          state: postOffice.State || '',
          district: postOffice.District || '',
          city: postOffice.Block && postOffice.Block !== 'NA' ? postOffice.Block : (postOffice.Name || ''),
          area: postOffice.Name || ''
        });
      })
      .catch(() => {});
  }

  private applyPartyPincodeLookup(lookup: { state: string; district: string; city: string; area: string }): void {
    this.formValues.update(values => ({
      ...values,
      state: lookup.state || values['state'] || '',
      district: lookup.district || values['district'] || '',
      city: lookup.city || values['city'] || ''
    }));
  }

  formFieldValue(field: InventoryField): any {
    const live = this.formValues()[field.key];
    const value = live !== undefined ? live : this.defaultFieldValue(field);
    if (field.type === 'date') {
      return this.datePickerValue(value);
    }
    if (this.config?.key === 'variantMaster' && field.key.toLowerCase() === 'attributevalue') {
      return this.variantAttributeValueControlValue(this.formValues()['attributeName'], value);
    }
    return value;
  }

  // 'tags' fields (e.g. Attribute Master "Possible Values") store a comma-joined string
  // so save/load and downstream option-parsing (variantAttributeValueOptions) stay unchanged;
  // this only adapts that string to/from the chip list ng-select renders.
  //
  // Cached by the exact comma-string so the SAME array reference is returned across
  // repeated calls within/between render cycles — like lineColumnOptions()/
  // attributeLookupObjects() elsewhere in this file, an ng-select [items]/[ngModel]
  // bound to a brand-new array every change-detection pass loses track of its own
  // multi-select/addTag state, so adding one tag right after another silently drops
  // earlier additions or fails to register the new one.
  private readonly _tagsFieldValueCache = new Map<string, string[]>();

  tagsFieldValue(field: InventoryField): string[] {
    const raw = String(this.formFieldValue(field) || '');
    const cacheKey = `${this.config?.key || ''}:${field.key}:${raw}`;
    const cached = this._tagsFieldValueCache.get(cacheKey);
    if (cached) return cached;
    const tokens = raw.split(',').map(v => v.trim()).filter(Boolean);
    this._tagsFieldValueCache.set(cacheKey, tokens);
    return tokens;
  }

  setTagsField(field: InventoryField, values: any): void {
    this.collectFormField(field.key, this.attributePossibleValueTokens(values).join(', '));
  }

  // Same 'Possible Values' chip pattern as tagsFieldValue/setTagsField, but for the
  // quick-add "New Attribute" panel (reachable from Product Master's Variant "+" and
  // similar screens), which keys its form values off 'quickAttributeValues' directly
  // rather than an InventoryField.
  private readonly _quickAttributeValuesTagsCache = new Map<string, string[]>();

  quickAttributeValuesTags(): string[] {
    const raw = String(this.formValues()['quickAttributeValues'] || '');
    const cached = this._quickAttributeValuesTagsCache.get(raw);
    if (cached) return cached;
    const tokens = raw.split(',').map(v => v.trim()).filter(Boolean);
    this._quickAttributeValuesTagsCache.set(raw, tokens);
    return tokens;
  }

  setQuickAttributeValuesTags(values: any): void {
    this.collectFormField('quickAttributeValues', this.attributePossibleValueTokens(values).join(', '));
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
    if (this.isApiWired()) {
      return this.mapToGridRows(this.segmentFilteredRecords(this.savedRecordObjects()));
    }
    return this.config?.kind === 'transaction' ? [] : (this.config?.rows || []);
  }

  // Existing Saved Records grid: hides any column that's blank across every
  // currently loaded row (e.g. "PO: Reference" on GRNs that were never linked
  // to a PO) rather than always reserving space for it. Each entry keeps its
  // original index into config.columns/row so sortBy()/sortIcon() — which
  // address that full, unfiltered index — need no changes; templates iterate
  // this instead of config.columns directly and read row[col.index] per cell.
  visibleRecordColumns(): { label: string; index: number }[] {
    const columns = this.config?.columns || [];
    const rows = this.liveRows();
    return columns
      .map((label, index) => ({ label, index }))
      .filter(col => !rows.length || rows.some(row => String(row?.[col.index] ?? '').trim() !== ''));
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
      case 'debitNote':            obs$ = this.txService.getDebitNotes(undefined, segmentId); break;
      case 'estimation':           obs$ = this.txService.getEstimations(undefined, segmentId); break;
      case 'proformaInvoice':      obs$ = this.txService.getProformaInvoices(undefined, segmentId); break;
      case 'salesInvoice':         obs$ = this.txService.getSalesInvoices(undefined, segmentId); break;
      case 'salesOrder':           obs$ = this.txService.getSalesOrders(undefined, segmentId); break;
      case 'salesQuotation':       obs$ = this.txService.getSalesQuotations(undefined, segmentId); break;
      case 'deliveryChallan':      obs$ = this.txService.getDeliveryChallans(undefined, segmentId, undefined, this.dcPendingInvoiceFilter()); break;
      case 'salesReturn':          obs$ = this.txService.getSalesReturns(undefined, segmentId); break;
      case 'creditNote':           obs$ = this.txService.getCreditNotes(undefined, segmentId); break;
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

  private forcedDocumentStatusMessage(forceDocumentStatus?: 'draft' | 'posted' | 'sent'): string {
    if (!forceDocumentStatus) return '';
    const draftMessage = (label: string) => `${label} saved as Draft.`;
    switch (this.config?.key) {
      case 'estimation':
        return forceDocumentStatus === 'sent' ? 'Estimation posted.' : draftMessage('Estimation');
      case 'proformaInvoice':
        return forceDocumentStatus === 'sent' ? 'Proforma Invoice posted.' : draftMessage('Proforma Invoice');
      case 'salesQuotation':
        return forceDocumentStatus === 'sent' ? 'Sales Quotation posted.' : draftMessage('Sales Quotation');
      case 'purchaseInvoice':
        return forceDocumentStatus === 'posted' ? 'Purchase Invoice posted.' : draftMessage('Purchase Invoice');
      case 'goodsReceipt':
        return forceDocumentStatus === 'posted' ? 'GRN posted.' : draftMessage('GRN');
      case 'purchaseReturn':
        return forceDocumentStatus === 'posted' ? 'Purchase Return posted.' : draftMessage('Purchase Return');
      case 'debitNote':
        return forceDocumentStatus === 'posted' ? 'Debit Note posted.' : draftMessage('Debit Note');
      case 'creditNote':
        return forceDocumentStatus === 'posted' ? 'Credit Note posted.' : draftMessage('Credit Note');
      case 'salesOrder':
        return forceDocumentStatus === 'posted' ? 'Sales Order posted.' : draftMessage('Sales Order');
      case 'salesInvoice':
        return forceDocumentStatus === 'posted' ? 'Sales Invoice posted.' : draftMessage('Sales Invoice');
      case 'deliveryChallan':
        return forceDocumentStatus === 'posted' ? 'Delivery Challan posted.' : draftMessage('Delivery Challan');
      case 'salesReturn':
        return forceDocumentStatus === 'posted' ? 'Sales Return posted.' : draftMessage('Sales Return');
      default:
        return '';
    }
  }

  confirmAction(options: { title: string; message: string; lines?: string[]; confirmLabel?: string; cancelLabel?: string; tone?: 'warning' | 'danger' }): Promise<boolean> {
    return new Promise(resolve => {
      this.confirmDialogResolver = resolve;
      this.confirmDialog.set({
        title: options.title,
        message: options.message,
        lines: options.lines || [],
        confirmLabel: options.confirmLabel || 'Continue',
        cancelLabel: options.cancelLabel || 'Cancel',
        tone: options.tone || 'warning'
      });
    });
  }

  resolveConfirmDialog(result: boolean): void {
    const resolver = this.confirmDialogResolver;
    this.confirmDialogResolver = null;
    this.confirmDialog.set(null);
    resolver?.(result);
  }

  saveConfigRecord(forceDocumentStatus?: 'draft' | 'posted' | 'sent'): void {
    if (this.isSaving()) return;
    const forceStatusAllowed = [
      'estimation',
      'proformaInvoice',
      'salesQuotation',
      'purchaseInvoice',
      'goodsReceipt',
      'purchaseReturn',
      'debitNote',
      'creditNote',
      'salesOrder',
      'salesInvoice',
      'deliveryChallan',
      'salesReturn'
    ].includes(this.config?.key || '') && !!forceDocumentStatus;
    // Snapshotted so a failed/cancelled Post can put the record back to how
    // it was — otherwise isCurrentRecordPosted() (read by the [attr.inert]
    // lock on the form) sees the forced "Posted" status below and locks the
    // whole screen even though the save never actually went through.
    const previousStatusValue = this.formValues()['status'];
    const previousTxDocStatus = this.txDocStatus();
    const revertForcedStatus = () => {
      if (!forceStatusAllowed) return;
      this.formValues.update(v => ({ ...v, status: previousStatusValue }));
      this.txDocStatus.set(previousTxDocStatus);
    };
    if (forceStatusAllowed) {
      const displayStatus = forceDocumentStatus === 'posted'
        ? 'Posted'
        : forceDocumentStatus === 'sent'
          ? 'Sent'
          : 'Draft';
      this.formValues.update(v => ({ ...v, status: displayStatus }));
      this.txDocStatus.set(forceDocumentStatus);
    }
    const payload = this.buildPayload();
    if (forceStatusAllowed) {
      payload['status'] = forceDocumentStatus;
    }
    const validationMessage = this.validatePayload(payload);
    if (validationMessage) {
      this.saveMsg.set('');
      this.saveError.set(validationMessage);
      revertForcedStatus();
      return;
    }

    // Rule 11: posting an SI with any line over its available stock is never
    // blocked — just confirmed. Checked here (not in validatePayload) since
    // this is advisory only, distinct from a hard validation failure.
    if (this.config?.key === 'salesInvoice' && String(payload['status'] || '').toLowerCase() === 'posted') {
      const overAvailableLines = this.overAvailableStockLines();
      if (overAvailableLines.length) {
        this.confirmAction({
          title: 'Stock may go negative',
          message: `${overAvailableLines.length} line${overAvailableLines.length === 1 ? '' : 's'} exceed available stock`,
          lines: overAvailableLines,
          confirmLabel: 'Post anyway',
          cancelLabel: 'Cancel',
          tone: 'warning'
        }).then(proceed => {
          if (proceed) this.executeSaveConfigRecord(payload, forceDocumentStatus, revertForcedStatus);
          else revertForcedStatus();
        });
        return;
      }
    }

    this.executeSaveConfigRecord(payload, forceDocumentStatus, revertForcedStatus);
  }

  private executeSaveConfigRecord(payload: Record<string, any>, forceDocumentStatus?: 'draft' | 'posted' | 'sent', revertForcedStatus?: () => void): void {
    const id = this.editingId();
    const savedPurchaseInvoiceGrnId = this.config?.key === 'purchaseInvoice'
      ? this.optionalNumber(payload['grn_id'])
      : null;
    const savedPurchaseInvoiceGrnNumber = this.config?.key === 'purchaseInvoice'
      ? String(payload['grn_number'] || '').trim()
      : '';
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
      case 'vendorMaster':          obs$ = this.saveVendorWithContactWriteback(payload, id);              break;
      case 'customerMaster':        obs$ = this.saveCustomerWithContactWriteback(payload, id);            break;
      case 'productServiceMaster':  obs$ = this.inventoryConfigService.saveProduct(payload, id);          break;
      case 'purchaseRequisition':   obs$ = this.txService.savePurchaseRequisition(payload, id);           break;
      case 'requestForQuotation':   obs$ = this.txService.saveRfq(payload, id);                           break;
      case 'purchaseOrder':         obs$ = this.txService.savePurchaseOrder(payload, id);                  break;
      case 'goodsReceipt':          obs$ = this.txService.saveGrn(payload, id);                           break;
      case 'purchaseInvoice':       obs$ = this.txService.savePurchaseInvoice(payload, id);                break;
      case 'purchaseReturn':        obs$ = this.txService.savePurchaseReturn(payload, id);                 break;
      case 'debitNote':             obs$ = this.txService.saveDebitNote(payload, id);                      break;
      case 'estimation':            obs$ = this.txService.saveEstimation(payload, id);                     break;
      case 'proformaInvoice':       obs$ = this.txService.saveProformaInvoice(payload, id);                break;
      case 'salesInvoice':          obs$ = this.txService.saveSalesInvoice(payload, id);                   break;
      case 'salesOrder':            obs$ = this.txService.saveSalesOrder(payload, id);                     break;
      case 'salesQuotation':        obs$ = this.txService.saveSalesQuotation(payload, id);                 break;
      case 'deliveryChallan':       obs$ = this.txService.saveDeliveryChallan(payload, id);                break;
      case 'salesReturn':           obs$ = this.txService.saveSalesReturn(payload, id);                    break;
      case 'creditNote':            obs$ = this.txService.saveCreditNote(payload, id);                     break;
      default: this.isSaving.set(false); return;
    }
    obs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<any>) => {
        this.isSaving.set(false);
        if (res.success) {
          // Transport Details lives in its own table keyed by (docType,
          // docId) rather than being part of this payload, since one shared
          // table backs every transaction screen that carries it -- so it's
          // saved as a second call once the parent document's own id is
          // known (id ?? the just-created id from this response), same
          // shape as the accounts-posting call that follows a Sales
          // Invoice save on the backend. No-ops on screens that don't
          // carry Transport Details or where nothing was entered.
          this.saveTransportDetailsIfNeeded(Number(res.data?.id ?? id ?? 0) || null);
          const savedSalesInvoiceId = this.config?.key === 'salesInvoice'
            ? Number(res.data?.id ?? 0)
            : 0;
          const savedSalesInvoiceNo = this.config?.key === 'salesInvoice'
            ? String(res.data?.docNumber || res.data?.doc_number || payload['doc_number'] || payload['invoiceNo'] || '')
            : '';
          const savedSalesInvoiceStatus = this.config?.key === 'salesInvoice'
            ? this.normalizeKey(res.data?.status || payload['status'] || '')
            : '';
          const finishSave = () => {
            const forcedStatusMessage = this.forcedDocumentStatusMessage(forceDocumentStatus);
            this.saveMsg.set(forcedStatusMessage || (id ? 'Record updated.' : 'Record saved.'));
            if (this.config?.key === 'purchaseInvoice') {
              this.removePurchaseInvoiceGrnReference(savedPurchaseInvoiceGrnId, savedPurchaseInvoiceGrnNumber);
              this.invalidateTransactionReferenceDocs();
            }
            if (this.config?.key === 'purchaseReturn' && res.data) {
              this.savedRecordObjects.update(records => {
                const savedId = Number(res.data?.id);
                const withoutCurrent = Number.isFinite(savedId) && savedId > 0
                  ? records.filter(record => Number(record?.id) !== savedId)
                  : records;
                return [res.data, ...withoutCurrent];
              });
              this.transactionReferenceDocs.update(docs => this.filterPurchaseReturnAvailablePiDocs(docs));
              this.refPickerDocs.update(docs => this.filterPurchaseReturnAvailablePiDocs(docs));
              this.invalidateTransactionReferenceDocs();
            }
            if ((this.config?.key === 'debitNote' || this.config?.key === 'creditNote') && res.data) {
              this.savedRecordObjects.update(records => {
                const savedId = Number(res.data?.id);
                const withoutCurrent = Number.isFinite(savedId) && savedId > 0
                  ? records.filter(record => Number(record?.id) !== savedId)
                  : records;
                return [res.data, ...withoutCurrent];
              });
              this.transactionReferenceDocs.update(docs => this.filterDocumentNoteAvailableReturnDocs(docs));
              this.refPickerDocs.update(docs => this.filterDocumentNoteAvailableReturnDocs(docs));
              this.invalidateTransactionReferenceDocs();
            }
            if (['goodsReceipt', 'purchaseInvoice', 'purchaseReturn', 'deliveryChallan', 'salesInvoice', 'salesReturn'].includes(this.config?.key || '')) {
              // fetchAvailableStockForLine() only ever fetches a given
              // product/variant/attribute key once and caches it for the
              // life of this component instance (see its own early-return
              // guard) — a save on any screen that actually moves
              // inv_stock_balance (GRN/PI/PR/DC/SI/Sales Return posting)
              // must drop that cache, or the on-screen "available stock"
              // hint and negative-stock check keep showing the pre-save
              // figure until the user navigates away and back.
              this.availableStockCache.set({});
              this.availableStockFetching.clear();
            }
            this.clearConfigForm();
            this.loadApiRecords();
            this.loadLookupOptions();
            if (['purchaseInvoice', 'purchaseReturn', 'debitNote', 'creditNote', 'salesInvoice', 'deliveryChallan', 'salesReturn'].includes(this.config?.key || '')) {
              // Refresh the reference-doc list (the just-saved doc must drop
              // out of it — see the duplicate-reference exclusion below) but
              // don't auto-reopen the picker tray right after a save; that
              // read as "the popup keeps loading every time" since it fired
              // on every single Save/Post, not just the first time the
              // screen was opened.
              this.loadTransactionReferenceDocs(true, false);
            }
            setTimeout(() => this.saveMsg.set(''), 3000);
            if (savedSalesInvoiceId > 0 && savedSalesInvoiceStatus === 'posted') {
              this.loadSalesInvoiceBundleConsumption(savedSalesInvoiceId, savedSalesInvoiceNo);
            }
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
          revertForcedStatus?.();
        }
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.saveError.set(this.apiErrorMessage(err, 'Server error. Check connection and try again.'));
        revertForcedStatus?.();
      }
    });
  }

  // ── Pending grid (temp entries before batch save) ────────────────────────

  private purchaseInvoiceCurrentStatusKey(): string {
    if (this.config?.key !== 'purchaseInvoice') return '';
    return this.normalizeKey(this.formValues()['status'] || this.txDocStatus() || 'draft');
  }

  private goodsReceiptCurrentStatusKey(): string {
    if (this.config?.key !== 'goodsReceipt') return '';
    return this.normalizeKey(this.formValues()['status'] || this.txDocStatus() || 'draft');
  }

  private purchaseReturnCurrentStatusKey(): string {
    if (this.config?.key !== 'purchaseReturn') return '';
    return this.normalizeKey(this.formValues()['status'] || this.txDocStatus() || 'draft');
  }

  private documentNoteCurrentStatusKey(): string {
    if (this.config?.key !== 'debitNote' && this.config?.key !== 'creditNote') return '';
    return this.normalizeKey(this.formValues()['status'] || this.txDocStatus() || 'draft');
  }

  private salesOrderCurrentStatusKey(): string {
    if (this.config?.key !== 'salesOrder') return '';
    return this.normalizeKey(this.formValues()['status'] || this.txDocStatus() || 'draft');
  }

  goodsReceiptIsPostedForm(): boolean {
    return this.goodsReceiptCurrentStatusKey() === 'posted';
  }

  purchaseReturnIsPostedForm(): boolean {
    return this.purchaseReturnCurrentStatusKey() === 'posted';
  }

  purchaseInvoiceIsPostedForm(): boolean {
    return this.purchaseInvoiceCurrentStatusKey() === 'posted';
  }

  documentNoteIsPostedForm(): boolean {
    return this.documentNoteCurrentStatusKey() === 'posted';
  }

  salesOrderIsPostedForm(): boolean {
    return ['posted', 'confirmed'].includes(this.salesOrderCurrentStatusKey());
  }

  saveGrnDraft(): void {
    if (this.goodsReceiptIsPostedForm()) {
      this.saveMsg.set('');
      this.saveError.set('Posted GRN cannot be moved back to Draft.');
      return;
    }
    this.saveConfigRecord('draft');
  }

  postGrn(): void {
    if (this.goodsReceiptIsPostedForm()) {
      this.saveMsg.set('');
      this.saveError.set('This GRN is already posted.');
      return;
    }
    this.saveConfigRecord('posted');
  }

  savePurchaseReturnDraft(): void {
    if (this.purchaseReturnIsPostedForm()) {
      this.saveMsg.set('');
      this.saveError.set('Posted Purchase Return cannot be moved back to Draft.');
      return;
    }
    this.saveConfigRecord('draft');
  }

  postPurchaseReturn(): void {
    if (this.purchaseReturnIsPostedForm()) {
      this.saveMsg.set('');
      this.saveError.set('This Purchase Return is already posted.');
      return;
    }
    this.saveConfigRecord('posted');
  }

  savePurchaseInvoiceDraft(): void {
    if (this.purchaseInvoiceIsPostedForm()) {
      this.saveMsg.set('');
      this.saveError.set('Posted Purchase Invoice cannot be moved back to Draft.');
      return;
    }
    this.saveConfigRecord('draft');
  }

  postPurchaseInvoice(): void {
    if (this.purchaseInvoiceIsPostedForm()) {
      this.saveMsg.set('');
      this.saveError.set('This Purchase Invoice is already posted.');
      return;
    }
    this.saveConfigRecord('posted');
  }

  saveDocumentNoteDraft(): void {
    if (this.documentNoteIsPostedForm()) {
      this.saveMsg.set('');
      this.saveError.set('Posted note cannot be moved back to Draft.');
      return;
    }
    this.saveConfigRecord('draft');
  }

  postDocumentNote(): void {
    if (this.documentNoteIsPostedForm()) {
      this.saveMsg.set('');
      this.saveError.set(`This ${this.config?.title || 'note'} is already posted.`);
      return;
    }
    this.saveConfigRecord('posted');
  }

  saveSalesOrderDraft(): void {
    if (this.salesOrderIsPostedForm()) {
      this.saveMsg.set('');
      this.saveError.set('Posted Sales Order cannot be moved back to Draft.');
      return;
    }
    this.saveConfigRecord('draft');
  }

  postSalesOrder(): void {
    if (this.salesOrderIsPostedForm()) {
      this.saveMsg.set('');
      this.saveError.set('This Sales Order is already posted.');
      return;
    }
    this.saveConfigRecord('posted');
  }

  // Same Clear / Save Draft / Post three-button pattern as GRN, Purchase
  // Invoice, Purchase Return, Sales Order, Debit/Credit Note — extended to
  // the remaining sales-family screens (Sales Invoice, Sales Return,
  // Delivery Challan, Estimation, Proforma Invoice, Sales Quotation), which
  // already had the saveConfigRecord(status) plumbing and per-screen Post
  // labels (salesTransactionPostStatus/salesTransactionPostButtonLabel —
  // used until now only by the grid-row quick-post) but no dedicated form
  // buttons of their own.
  private salesTransactionCurrentStatusKey(): string {
    return this.normalizeKey(this.formValues()['status'] || this.txDocStatus() || 'draft');
  }

  salesTransactionIsPostedForm(): boolean {
    const status = this.salesTransactionCurrentStatusKey();
    return status === 'posted' || status === 'sent' || status === 'confirmed';
  }

  // Single entry point transaction screens use to lock header fields and the
  // line grid (via [attr.inert]) and to disable Save Draft/Post once a
  // record has moved past Draft — dispatches to the per-family posted checks
  // above so the "is this record locked" rule lives in exactly one place.
  isCurrentRecordPosted(): boolean {
    switch (this.config?.key) {
      case 'goodsReceipt': return this.goodsReceiptIsPostedForm();
      case 'purchaseReturn': return this.purchaseReturnIsPostedForm();
      case 'purchaseInvoice': return this.purchaseInvoiceIsPostedForm();
      case 'debitNote':
      case 'creditNote': return this.documentNoteIsPostedForm();
      case 'salesOrder': return this.salesOrderIsPostedForm();
      case 'salesInvoice':
      case 'salesReturn':
      case 'deliveryChallan':
      case 'estimation':
      case 'proformaInvoice':
      case 'salesQuotation': return this.salesTransactionIsPostedForm();
      default: return false;
    }
  }

  saveSalesTransactionDraft(): void {
    if (this.salesTransactionIsPostedForm()) {
      this.saveMsg.set('');
      this.saveError.set(`This ${this.config?.title || 'record'} is already posted and cannot be moved back to Draft.`);
      return;
    }
    this.saveConfigRecord('draft');
  }

  postSalesTransactionForm(): void {
    if (this.salesTransactionIsPostedForm()) {
      this.saveMsg.set('');
      this.saveError.set(`This ${this.config?.title || 'record'} is already posted.`);
      return;
    }
    this.saveConfigRecord(this.salesTransactionPostStatus());
  }

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
    const failedRows: typeof rows = [];
    let savedCount = 0;
    const keepFailedRowsOnError = this.config?.key === 'categoryMaster';

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
        case 'vendorMaster':         return this.saveVendorWithContactWriteback(payload, null);
        case 'customerMaster':       return this.saveCustomerWithContactWriteback(payload, null);
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
        map(res => ({ row, res })),
        catchError(err => of({ row, res: { success: false, message: this.apiErrorMessage(err, 'Save failed'), data: null } }))
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ({ row, res }: { row: typeof rows[number]; res: ApiResponse<any> }) => {
        if (!res.success) {
          failedRows.push(row);
          this.saveError.update(e => e ? e : (res.message || 'One or more records failed to save.'));
        } else {
          savedCount++;
        }
      },
      error: (err: any) => {
        this.isBatchSaving.set(false);
        this.saveError.set(this.apiErrorMessage(err, 'Batch save failed.'));
        this.loadApiRecords();
      },
      complete: () => {
        this.isBatchSaving.set(false);
        this.pendingRows.set(keepFailedRowsOnError ? failedRows : []);
        this.editingPendingIndex.set(null);
        if (keepFailedRowsOnError && failedRows.length) {
          const failCount = failedRows.length;
          this.saveMsg.set(savedCount ? `${savedCount} record${savedCount !== 1 ? 's' : ''} saved.` : '');
          this.saveError.set(this.saveError() || `${failCount} record${failCount !== 1 ? 's' : ''} failed to save.`);
        } else {
          const count = rows.length;
          this.saveMsg.set(`${count} record${count !== 1 ? 's' : ''} saved.`);
        }
        this.loadApiRecords();
        this.loadLookupOptions();
        setTimeout(() => this.saveMsg.set(''), 3000);
      }
    });
  }

  // Status isn't shown as a grid column (redundant next to the Post action) —
  // read the real status off the matching saved record instead.
  isGrnDraftRow(row: string[]): boolean {
    const record = this.grnRecordForRow(row);
    return !!record && String(record.status || 'draft').trim().toLowerCase() === 'draft';
  }

  isPurchaseInvoiceDraftRow(row: string[]): boolean {
    if (this.config?.key !== 'purchaseInvoice') return false;
    const record = this.grnRecordForRow(row);
    return !!record && String(record.status || 'draft').trim().toLowerCase() === 'draft';
  }

  isPurchaseReturnDraftRow(row: string[]): boolean {
    if (this.config?.key !== 'purchaseReturn') return false;
    const record = this.purchaseReturnRecordForRow(row);
    return !!record && String(record.status || 'draft').trim().toLowerCase() === 'draft';
  }

  // Quick-post a Draft GRN straight from the saved-records grid, without
  // requiring the user to open Edit, flip the switch and Save manually.
  // Reuses the exact same load-into-form + save pipeline as Edit so the
  // payload/validation/stock-posting logic isn't duplicated. Status is no
  // longer a field on the entry form itself — Post (here) is the only
  // deliberate way to move a GRN from Draft to Posted.
  postGrnRecordByRow(row: string[]): void {
    this.editRecordByRow(row);
    this.saveConfigRecord('posted');
  }

  postPurchaseInvoiceRecordByRow(row: string[]): void {
    this.editRecordByRow(row);
    this.saveConfigRecord('posted');
  }

  postPurchaseReturnRecordByRow(row: string[]): void {
    this.editRecordByRow(row);
    this.saveConfigRecord('posted');
  }

  private salesTransactionRecordForRow(row: string[]): any | null {
    const records = this.segmentFilteredRecords(this.savedRecordObjects());
    switch (this.config?.key) {
      case 'estimation':
      case 'proformaInvoice':
      case 'salesQuotation':
      case 'salesInvoice':
      case 'salesOrder':
        return records.find(r => (r.doc_number || r.docNumber) === row[0]) || null;
      case 'deliveryChallan':
        return records.find(r => (r.dc_number || r.dcNumber) === row[0]) || null;
      case 'salesReturn':
        return records.find(r => (r.return_number || r.returnNumber) === row[0]) || null;
      case 'creditNote':
        return records.find(r => (r.credit_note_number || r.creditNoteNumber) === row[0]) || null;
      default:
        return null;
    }
  }

  private salesTransactionStatusKey(record: any, row: string[]): string {
    const rawStatus = record?.status ?? record?.doc_status ?? record?.docStatus ?? row[row.length - 1] ?? 'draft';
    return this.normalizeKey(rawStatus);
  }

  isSalesTransactionDraftRow(row: string[]): boolean {
    const record = this.salesTransactionRecordForRow(row);
    if (!record) return false;
    const statusKey = this.salesTransactionStatusKey(record, row);
    return statusKey === 'draft' || statusKey === 'saved';
  }

  private salesTransactionPostStatus(): 'posted' | 'sent' {
    switch (this.config?.key) {
      case 'estimation':
      case 'proformaInvoice':
      case 'salesQuotation':
        return 'sent';
      default:
        return 'posted';
    }
  }

  salesTransactionPostButtonLabel(): string {
    switch (this.config?.key) {
      case 'estimation':
        return 'Post this Estimation';
      case 'proformaInvoice':
        return 'Post this Proforma';
      case 'salesQuotation':
        return 'Post this Quotation';
      case 'salesOrder':
        return 'Post this SO';
      case 'salesInvoice':
        return 'Post this Invoice';
      case 'deliveryChallan':
        return 'Post this DC';
      case 'salesReturn':
        return 'Post this Return';
      case 'creditNote':
        return 'Post this Credit Note';
      default:
        return 'Post this Transaction';
    }
  }

  postSalesTransactionRecordByRow(row: string[]): void {
    if (!this.isSalesTransactionDraftRow(row)) return;
    this.editRecordByRow(row);
    this.saveConfigRecord(this.salesTransactionPostStatus());
  }

  // ── Saved GRN grid: row expand to preview items + post-from-drilldown ─────
  private purchaseReturnRecordForRow(row: string[]): any {
    const records = this.segmentFilteredRecords(this.savedRecordObjects());
    return records.find(r => (r.return_number || r.returnNumber) === row[0]) || null;
  }

  private grnRecordForRow(row: string[]): any {
    if (this.config?.key === 'purchaseInvoice') {
      const records = this.segmentFilteredRecords(this.savedRecordObjects());
      return records.find(r => (r.pi_number || r.piNumber) === row[0]) || null;
    }
    if (this.config?.key === 'purchaseReturn') {
      return this.purchaseReturnRecordForRow(row);
    }
    if (this.config?.key === 'debitNote') {
      const records = this.segmentFilteredRecords(this.savedRecordObjects());
      return records.find(r => (r.debit_note_number || r.debitNoteNumber) === row[0]) || null;
    }
    if (this.config?.key === 'creditNote') {
      const records = this.segmentFilteredRecords(this.savedRecordObjects());
      return records.find(r => (r.credit_note_number || r.creditNoteNumber) === row[0]) || null;
    }
    if (
      this.config?.key === 'estimation'
      || this.config?.key === 'proformaInvoice'
      || this.config?.key === 'salesQuotation'
      || this.config?.key === 'salesOrder'
      || this.config?.key === 'salesInvoice'
    ) {
      const records = this.segmentFilteredRecords(this.savedRecordObjects());
      return records.find(r => (r.doc_number || r.docNumber) === row[0]) || null;
    }
    if (this.config?.key === 'deliveryChallan') {
      const records = this.segmentFilteredRecords(this.savedRecordObjects());
      return records.find(r => (r.dc_number || r.dcNumber) === row[0]) || null;
    }
    if (this.config?.key === 'salesReturn') {
      const records = this.segmentFilteredRecords(this.savedRecordObjects());
      return records.find(r => (r.return_number || r.returnNumber) === row[0]) || null;
    }
    if (this.config?.key !== 'goodsReceipt') return null;
    const records = this.segmentFilteredRecords(this.savedRecordObjects());
    return records.find(r => (r.grn_number || r.grnNumber) === row[0]) || null;
  }

  readonly expandedGrnId = signal<number | null>(null);

  toggleExpandGrn(row: string[]): void {
    const record = this.grnRecordForRow(row);
    if (!record?.id) return;
    const id = Number(record.id);
    this.expandedGrnId.update(cur => (cur === id ? null : id));
  }

  isExpandedGrn(row: string[]): boolean {
    const record = this.grnRecordForRow(row);
    return !!record?.id && this.expandedGrnId() === Number(record.id);
  }

  grnExpandedItems(row: string[]): any[] {
    return this.grnRecordForRow(row)?.items || [];
  }

  grnExpandedColumns(row: string[]): GrnExpandedColumn[] {
    const items = this.grnExpandedItems(row);
    const isPurchaseInvoice = this.config?.key === 'purchaseInvoice';
    const isPurchaseReturn = this.config?.key === 'purchaseReturn';
    const isDocumentNote = this.config?.key === 'debitNote' || this.config?.key === 'creditNote';
    const isSalesDoc = [
      'estimation',
      'proformaInvoice',
      'salesQuotation',
      'salesOrder',
      'salesInvoice'
    ].includes(this.config?.key || '');
    const isDeliveryChallan = this.config?.key === 'deliveryChallan';
    const isSalesReturn = this.config?.key === 'salesReturn';
    const columns: GrnExpandedColumn[] = [
      { key: 'sno', label: '#' },
      { key: isDocumentNote ? 'description' : 'product', label: isDocumentNote ? 'Description' : 'Product' }
    ];

    if (isDocumentNote) {
      columns.push(
        { key: 'reference', label: 'Reference' },
        { key: 'note_amount', label: 'Return Amount' },
        { key: 'note_gst_pct', label: 'GST %' },
        { key: 'note_gst_amount', label: 'GST Amount' },
        { key: 'note_total_amount', label: 'Total Amount' }
      );
      return columns;
    }

    if (items.some(item => this.grnExpandedValue(item, 'variant_name', 'variantName'))) {
      columns.push({ key: 'variant', label: 'Variant' });
    }

    for (const name of this.grnExpandedAttributeNames(items)) {
      columns.push({ key: `attr:${name}`, label: name });
    }

    if (isSalesDoc) {
      columns.push(
        { key: 'uom', label: 'UOM' },
        { key: 'qty', label: 'Qty' },
        { key: 'rate', label: 'Rate' }
      );
      if (items.some(item => this.grnExpandedValue(item, 'mrp', 'MRP'))) {
        columns.push({ key: 'mrp', label: 'MRP' });
      }
      if (items.some(item => this.grnExpandedValue(item, 'selling_price', 'sellingPrice'))) {
        columns.push({ key: 'selling_price', label: 'Selling Price' });
      }
      columns.push({ key: 'disc_pct', label: 'Disc %' });
    } else if (isDeliveryChallan) {
      columns.push(
        { key: 'so_qty', label: 'SO Qty' },
        { key: 'dispatch_qty', label: 'Dispatch Qty' },
        { key: 'uom', label: 'UOM' }
      );
      if (items.some(item => this.grnExpandedValue(item, 'batch_serial', 'batchSerial'))) {
        columns.push({ key: 'batch_serial', label: 'Batch / Serial' });
      }
    } else if (isSalesReturn) {
      columns.push(
        { key: 'invoiced_qty', label: 'Invoice Qty' },
        { key: 'return_qty', label: 'Return Qty' },
        { key: 'uom', label: 'UOM' },
        { key: 'rate', label: 'Rate' }
      );
    } else {
      columns.push(
        { key: 'uom', label: 'UOM' },
        isPurchaseInvoice || isPurchaseReturn
          ? { key: 'qty', label: 'Invoice Qty' }
          : { key: 'received_qty', label: 'Received Qty' },
        ...(isPurchaseInvoice
          ? []
          : isPurchaseReturn
            ? [{ key: 'return_qty', label: 'Return Qty' }]
            : [{ key: 'accepted_qty', label: 'Accepted Qty' }]),
        { key: 'rate', label: 'Rate' }
      );
    }

    if (items.some(item => this.grnExpandedValue(item, 'gst_rate', 'gstRate'))) {
      columns.push({ key: 'gst_rate', label: 'GST' });
    }

    if (items.some(item => this.grnExpandedValue(item, 'batch_no', 'batchNo'))) {
      columns.push({ key: 'batch_no', label: 'Batch No' });
    }

    for (const name of this.grnExpandedSerialNames(items)) {
      columns.push({ key: `serial:${name}`, label: name });
    }

    if (items.some(item => this.grnExpandedValue(item, 'expiry_date', 'expiryDate'))) {
      columns.push({ key: 'expiry_date', label: 'Expiry Date' });
    }

    if (!isDeliveryChallan || items.some(item => this.grnExpandedValue(item, 'amount', 'return_amount', 'returnAmount'))) {
      columns.push({ key: 'amount', label: 'Amount' });
    }
    return columns;
  }

  private firstNumericValue(item: any, keys: string[]): number {
    for (const key of keys) {
      const raw = item?.[key];
      if (raw === null || raw === undefined || String(raw).trim() === '') continue;
      const value = Number(raw);
      if (Number.isFinite(value)) return value;
    }
    return 0;
  }

  private itemGstIncluded(item: any): boolean | null {
    const raw = item?.gst_inclusive ?? item?.gstInclusive;
    if (raw === true || raw === false) return raw;
    const text = String(raw ?? '').trim().toLowerCase();
    if (text === 'true' || text === 'yes' || text === 'included') return true;
    if (text === 'false' || text === 'no' || text === 'excluded') return false;
    return null;
  }

  private inferExpandedLineGstIncluded(item: any, gstPct: number): boolean | null {
    if (!gstPct) return false;
    const stored = this.itemGstIncluded(item);
    if (stored !== null) return stored;

    const amount = this.firstNumericValue(item, ['amount', 'return_amount', 'returnAmount', 'line_total', 'lineTotal']);
    const qty = this.firstNumericValue(item, ['qty', 'received_qty', 'receivedQty', 'accepted_qty', 'acceptedQty', 'return_qty', 'returnQty']);
    const rate = this.firstNumericValue(item, ['rate']);
    if (!amount || !qty || !rate) return null;

    const discountPct = this.firstNumericValue(item, ['discount_pct', 'discountPct']);
    const excludedTotal = this.roundLineAmount(this.transactionLineTaxBreakup(qty, rate, discountPct, gstPct, undefined, false).total);
    const includedTotal = this.roundLineAmount(this.transactionLineTaxBreakup(qty, rate, discountPct, gstPct, undefined, true).total);
    const roundedAmount = this.roundLineAmount(amount);
    if (Math.abs(roundedAmount - includedTotal) <= 0.02) return true;
    if (Math.abs(roundedAmount - excludedTotal) <= 0.02) return false;
    return null;
  }

  private grnExpandedGstAmount(item: any): number {
    const storedTax = this.firstNumericValue(item, ['tax_amount', 'taxAmount', 'gst_amount', 'gstAmount']);
    if (storedTax) return this.roundLineAmount(storedTax);

    const gstPct = this.firstNumericValue(item, ['gst_rate', 'gstRate']);
    if (!gstPct) return 0;

    const taxable = this.firstNumericValue(item, ['taxable_amount', 'taxableAmount']);
    if (taxable) return this.roundLineAmount(taxable * gstPct / 100);

    const qty = this.firstNumericValue(item, ['qty', 'received_qty', 'receivedQty', 'accepted_qty', 'acceptedQty', 'return_qty', 'returnQty']);
    const rate = this.firstNumericValue(item, ['rate']);
    const discountPct = this.firstNumericValue(item, ['discount_pct', 'discountPct']);
    if (qty && rate) {
      const included = this.inferExpandedLineGstIncluded(item, gstPct) ?? false;
      return this.roundLineAmount(this.transactionLineTaxBreakup(qty, rate, discountPct, gstPct, undefined, included).taxAmount);
    }

    const amount = this.firstNumericValue(item, ['amount', 'return_amount', 'returnAmount', 'line_total', 'lineTotal']);
    const included = this.inferExpandedLineGstIncluded(item, gstPct);
    if (amount && included) {
      const taxableFromTotal = amount / (1 + gstPct / 100);
      return this.roundLineAmount(amount - taxableFromTotal);
    }
    return 0;
  }

  private grnExpandedGstCell(item: any): string {
    const gstPct = this.firstNumericValue(item, ['gst_rate', 'gstRate']);
    if (!gstPct) return '';
    const taxAmount = this.grnExpandedGstAmount(item);
    const percentText = `${gstPct}%`;
    return taxAmount ? `${percentText} (${this.formatCurrency(taxAmount)})` : percentText;
  }

  private restoreLineGstModes(items: any[]): void {
    const next: Record<number, boolean> = {};
    (items || []).forEach((item, index) => {
      const gstPct = this.firstNumericValue(item, ['gst_rate', 'gstRate']);
      const included = this.itemGstIncluded(item) ?? this.inferExpandedLineGstIncluded(item, gstPct);
      if (included !== null) next[index] = included;
    });
    this.lineGstIncludedMap.set(next);
  }

  grnExpandedCell(item: any, column: GrnExpandedColumn, rowIndex: number): string {
    if (column.key === 'sno') return String(rowIndex + 1);
    if (column.key === 'description') return this.grnExpandedValue(item, 'description');
    if (column.key === 'reference') return this.grnExpandedValue(item, 'reference');
    if (column.key === 'note_amount') return this.formatCurrency(this.grnExpandedValue(item, 'amount'));
    if (column.key === 'note_gst_pct') return this.grnExpandedValue(item, 'gst_pct', 'gstPct');
    if (column.key === 'note_gst_amount') return this.formatCurrency(this.grnExpandedValue(item, 'gst_amount', 'gstAmount'));
    if (column.key === 'note_total_amount') return this.formatCurrency(this.grnExpandedValue(item, 'total_amount', 'totalAmount'));
    if (column.key === 'product') return this.grnExpandedValue(item, 'product_name', 'productName');
    if (column.key === 'variant') return this.grnExpandedValue(item, 'variant_name', 'variantName');
    if (column.key === 'uom') return this.grnExpandedValue(item, 'uom_name', 'uomName');
    if (column.key === 'qty') return this.grnExpandedValue(item, 'qty', 'grn_qty', 'invoice_qty', 'invoiceQty');
    if (column.key === 'so_qty') return this.grnExpandedValue(item, 'so_qty', 'soQty');
    if (column.key === 'dispatch_qty') return this.grnExpandedValue(item, 'dispatch_qty', 'dispatchQty');
    if (column.key === 'invoiced_qty') return this.grnExpandedValue(item, 'invoiced_qty', 'invoicedQty');
    if (column.key === 'received_qty') return this.grnExpandedValue(item, 'received_qty', 'receivedQty');
    if (column.key === 'accepted_qty') return this.grnExpandedValue(item, 'accepted_qty', 'acceptedQty');
    if (column.key === 'return_qty') return this.grnExpandedValue(item, 'return_qty', 'returnQty');
    if (column.key === 'rate') return this.grnExpandedValue(item, 'rate');
    if (column.key === 'mrp') return this.grnExpandedValue(item, 'mrp', 'MRP');
    if (column.key === 'selling_price') return this.grnExpandedValue(item, 'selling_price', 'sellingPrice');
    if (column.key === 'disc_pct') return this.grnExpandedValue(item, 'discount_pct', 'discountPct');
    if (column.key === 'gst_rate') return this.grnExpandedGstCell(item);
    if (column.key === 'batch_no') return this.grnExpandedValue(item, 'batch_no', 'batchNo');
    if (column.key === 'batch_serial') return this.grnExpandedValue(item, 'batch_serial', 'batchSerial');
    if (column.key === 'expiry_date') return this.gridDateDisplay(this.grnExpandedValue(item, 'expiry_date', 'expiryDate'));
    if (column.key === 'amount') return this.grnExpandedValue(item, 'amount', 'return_amount', 'returnAmount');
    if (column.key.startsWith('attr:')) return this.grnExpandedAttributeValue(item, column.key.slice(5));
    if (column.key.startsWith('serial:')) return this.grnExpandedSerialValue(item, column.key.slice(7));
    return '';
  }

  grnExpandedTotalColspan(row: string[]): number {
    return Math.max(1, this.grnExpandedColumns(row).length - 1);
  }

  grnExpandedTotal(row: string[]): string {
    const total = this.grnExpandedItems(row).reduce((sum, item) =>
      sum + (Number(item?.total_amount ?? item?.totalAmount ?? item?.amount ?? item?.return_amount ?? item?.returnAmount) || 0), 0);
    return this.formatCurrency(total);
  }

  documentNoteExpandedAmountTotal(row: string[]): string {
    const total = this.grnExpandedItems(row).reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
    return this.formatCurrency(total);
  }

  documentNoteExpandedGstTotal(row: string[]): string {
    const total = this.grnExpandedItems(row).reduce((sum, item) => sum + (Number(item?.gst_amount ?? item?.gstAmount) || 0), 0);
    return this.formatCurrency(total);
  }

  documentNoteExpandedGrandTotal(row: string[]): string {
    const total = this.grnExpandedItems(row).reduce((sum, item) => sum + (Number(item?.total_amount ?? item?.totalAmount) || 0), 0);
    return this.formatCurrency(total);
  }

  isDocumentNoteScreen(): boolean {
    return this.config?.key === 'debitNote' || this.config?.key === 'creditNote';
  }

  private grnExpandedValue(item: any, ...keys: string[]): string {
    for (const key of keys) {
      const value = item?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
    return '';
  }

  private grnExpandedAttributeParts(item: any): Array<{ name: string; value: string }> {
    const attributeValue = this.grnExpandedValue(item, 'attribute_value', 'attributeValue');
    const parts = this.attributeTextParts(attributeValue);
    if (parts.some(part => part.name)) return parts.filter(part => part.name && part.value);

    const attributeName = this.grnExpandedValue(item, 'attribute_name', 'attributeName');
    if (attributeName && attributeValue) {
      return attributeName
        .split('|')
        .map(name => name.trim())
        .filter(Boolean)
        .map(name => ({ name, value: attributeValue }));
    }
    return [];
  }

  private grnExpandedAttributeNames(items: any[]): string[] {
    const names: string[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      for (const part of this.grnExpandedAttributeParts(item)) {
        const key = this.normalizeKey(part.name);
        if (!part.name || seen.has(key)) continue;
        seen.add(key);
        names.push(part.name);
      }
    }
    return names;
  }

  private grnExpandedAttributeValue(item: any, name: string): string {
    const part = this.grnExpandedAttributeParts(item).find(candidate => this.optionEquals(candidate.name, name));
    return part?.value || '';
  }

  // Prefers the structured serial_numbers array (serialNumbersFromRecordItem
  // — the authoritative field every item table now carries) and falls back
  // to the legacy free-text serial_no column only when that array is empty.
  // Purchase Return and Delivery Challan items never had a serial_no column
  // at all (083_serial_number_tracking.sql), so without this fallback their
  // drill-down never showed captured/returned serials no matter what was
  // actually on the record.
  private grnExpandedSerialNames(items: any[]): string[] {
    const names: string[] = [];
    const seen = new Set<string>();
    const add = (name: string) => {
      const label = String(name || '').trim();
      const key = this.normalizeKey(label);
      if (!label || seen.has(key)) return;
      seen.add(key);
      names.push(label);
    };

    for (const item of items) {
      if (!this.serialNumbersFromRecordItem(item).length) continue;

      const raw = this.grnExpandedValue(item, 'serial_no', 'serialNo');
      const named = raw ? this.attributeTextParts(raw).filter(part => part.name) : [];
      if (named.length) {
        named.forEach(part => add(part.name));
        continue;
      }

      const product = this.findProductBySelection(this.grnExpandedValue(item, 'product_name', 'productName'));
      const labels = this.productSerialColumnLabels(product);
      add(labels[0] || 'Serial No');
    }

    return names;
  }

  private grnExpandedSerialValue(item: any, label: string): string {
    const serials = this.serialNumbersFromRecordItem(item);
    if (!serials.length) return '';
    const raw = this.grnExpandedValue(item, 'serial_no', 'serialNo');
    if (raw) {
      const parts = this.attributeTextParts(raw);
      const named = parts.find(part => part.name && this.optionEquals(part.name, label));
      if (named) return named.value;
      if (parts.some(part => part.name)) return '';
    }
    return serials.join(', ');
  }

  private salesInvoiceRecordForRow(row: string[]): any | null {
    if (this.config?.key !== 'salesInvoice') return null;
    const invoiceNo = row[0];
    return this.segmentFilteredRecords(this.savedRecordObjects())
      .find(r => r.doc_number === invoiceNo || r.docNumber === invoiceNo) || null;
  }

  // Bundle consumption only means anything for a Service Bundle product
  // (the product's own "Product Nature" set to Service Bundle in the
  // Product Master, with a Bundle Composition — physical-stock lines have
  // no such composition to consume). Gates the "Bundle consumption" row
  // action so it only appears on invoices that actually contain one.
  salesInvoiceRowHasBundle(row: string[]): boolean {
    const record = this.salesInvoiceRecordForRow(row);
    if (!record?.items?.length) return false;
    const products = this.loadedProductObjects();
    return record.items.some((item: any) => {
      const productId = this.optionalNumber(item?.product_id ?? item?.productId);
      const productName = String(item?.product_name ?? item?.productName ?? '').trim();
      const product = products.find(p =>
        (productId !== null && Number(p.id) === productId)
        || (!!productName && this.optionEquals(p.product_name, productName))
      );
      return product?.product_nature_name === 'Service Bundle';
    });
  }

  openSalesInvoiceBundleConsumption(row: string[]): void {
    const record = this.salesInvoiceRecordForRow(row);
    if (!record?.id) return;
    this.loadSalesInvoiceBundleConsumption(Number(record.id), record.doc_number || record.docNumber || row[0] || '');
  }

  closeSalesInvoiceBundleConsumption(): void {
    this.bundleConsumptionOpen.set(false);
  }

  private loadSalesInvoiceBundleConsumption(invoiceId: number, invoiceNo = ''): void {
    if (!Number.isFinite(invoiceId) || invoiceId <= 0) return;
    this.bundleConsumptionOpen.set(true);
    this.bundleConsumptionInvoiceId.set(invoiceId);
    this.bundleConsumptionInvoiceNo.set(invoiceNo);
    this.bundleConsumptionRows.set([]);
    this.bundleConsumptionError.set('');
    this.bundleConsumptionLoading.set(true);

    this.txService.getServiceBundleConsumptions(invoiceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.bundleConsumptionLoading.set(false);
          if (res.success) {
            this.bundleConsumptionRows.set(res.data || []);
          } else {
            this.bundleConsumptionError.set(res.message || 'Unable to load bundle consumption.');
          }
        },
        error: (err: any) => {
          this.bundleConsumptionLoading.set(false);
          this.bundleConsumptionError.set(this.apiErrorMessage(err, 'Unable to load bundle consumption.'));
        }
      });
  }

  bundleConsumptionItemCount(): number {
    return this.bundleConsumptionRows().reduce((sum, row) => sum + (row.items?.length || 0), 0);
  }

  bundleConsumptionTotal(field: 'required_qty' | 'issued_qty' | 'shortfall_qty'): number {
    return this.bundleConsumptionRows().reduce((sum, row) =>
      sum + (row.items || []).reduce((lineSum, item) => lineSum + (Number(item[field]) || 0), 0), 0);
  }

  bundleConsumptionStatusClass(status: string | undefined): string {
    const key = this.normalizeKey(status || 'posted');
    if (key === 'partial' || key === 'short_stock') return 'badge-warning';
    if (key === 'cancelled') return 'badge-danger';
    return 'badge-success';
  }

  private findRecordByRow(row: string[]): any {
    const records = this.segmentFilteredRecords(this.savedRecordObjects());
    switch (this.config?.key) {
      case 'businessSegments':   return records.find(r => r.segment_name === row[0]);
      case 'branchMaster':       return records.find(r => r.branch_code === row[0]);
      case 'warehouseMaster':    return records.find(r => r.warehouse_code === row[0]);
      case 'uomMaster':          return records.find(r => r.uom_code === row[0]);
      case 'categoryMaster':     return records.find(r => r.category_code === row[0]);
      case 'hsnSacMapping':      return records.find(r => r.code === row[0]);
      case 'paymentTermsMaster': return records.find(r => r.term_code === row[0] || r.term_name === row[0]);
      case 'brandMaster':        return records.find(r => r.brand_code === row[0]);
      case 'attributeMaster':    return records.find(r => r.attribute_code === row[0] || r.attribute_name === row[1]);
      case 'productGroupMaster': return records.find(r => r.group_code === row[0]);
      case 'variantMaster':      return records.find(r => r.variant_code === row[0]);
      case 'serialNumberPolicy': return records.find(r => r.policy_code === row[0]);
      case 'batchLotPolicy':     return records.find(r => r.policy_code === row[0]);
      case 'barcodeConfiguration': return records.find(r => r.barcode_type === row[0] && String(r.prefix || '') === row[2]);
      case 'substituteProducts': return records.find(r => r.product_name === row[0] && r.substitute_product_name === row[1]);
      case 'consumptionTypeMaster': return records.find(r => r.type_code === row[0] || r.type_name === row[0]);
      case 'productTypeMaster':   return records.find(r => r.type_code === row[0]);
      case 'vendorMaster':       return records.find(r => r.vendor_code === row[0]);
      case 'customerMaster':     return records.find(r => r.customer_code === row[0]);
      case 'productServiceMaster': return records.find(r => r.product_code === row[0]);
      case 'purchaseRequisition': return records.find(r => r.pr_number === row[0] || r.prNumber === row[0]);
      case 'requestForQuotation': return records.find(r => r.rfq_number === row[0] || r.rfqNumber === row[0]);
      case 'purchaseOrder': return records.find(r => r.po_number === row[0] || r.poNumber === row[0]);
      case 'goodsReceipt': return records.find(r => r.grn_number === row[0] || r.grnNumber === row[0]);
      case 'purchaseInvoice': return records.find(r => r.pi_number === row[0] || r.piNumber === row[0]);
      case 'purchaseReturn': return records.find(r => r.return_number === row[0] || r.returnNumber === row[0]);
      case 'debitNote': return records.find(r => r.debit_note_number === row[0] || r.debitNoteNumber === row[0]);
      case 'estimation':
      case 'proformaInvoice':
      case 'salesInvoice':
      case 'salesOrder':
      case 'salesQuotation': return records.find(r => r.doc_number === row[0]);
      case 'deliveryChallan': return records.find(r => r.dc_number === row[0] || r.dcNumber === row[0]);
      case 'salesReturn': return records.find(r => r.return_number === row[0] || r.returnNumber === row[0]);
      case 'creditNote': return records.find(r => r.credit_note_number === row[0] || r.creditNoteNumber === row[0]);
      default: return undefined;
    }
  }

  private readonly draftLockTransactionKeys = new Set([
    'goodsReceipt', 'purchaseInvoice', 'purchaseReturn', 'debitNote', 'creditNote',
    'salesOrder', 'salesInvoice', 'salesReturn', 'deliveryChallan', 'estimation', 'proformaInvoice', 'salesQuotation'
  ]);

  isDraftLockedScreen(): boolean {
    return this.draftLockTransactionKeys.has(this.config?.key || '');
  }

  rowStatusKey(row: string[]): string {
    return this.normalizeKey(this.findRecordByRow(row)?.status || 'draft');
  }

  // Edit/Delete in the records grid are only usable while a transaction row
  // is still Draft — once Posted (or Cancelled), the row is locked here too,
  // not just inside the opened form.
  canEditOrDeleteRow(row: string[]): boolean {
    if (!this.isDraftLockedScreen()) return true;
    return this.rowStatusKey(row) === 'draft';
  }

  cancelRecordByRow(row: string[]): void {
    if (!this.canEditOrDeleteRow(row)) return;
    const record = this.findRecordByRow(row);
    if (!record?.id) return;
    const purchaseType = this.purchaseDocType();
    const salesType = this.salesDocType();
    const obs$ = purchaseType
      ? this.txService.cancelDoc(purchaseType, Number(record.id), 'Deleted while in Draft from Inventory transaction screen')
      : salesType
        ? this.txService.cancelSalesDoc(salesType, Number(record.id))
        : null;
    if (!obs$) return;
    this.saveMsg.set('');
    this.saveError.set('');
    obs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        if (res.success) {
          this.saveMsg.set('Draft deleted.');
          this.loadApiRecords();
          setTimeout(() => this.saveMsg.set(''), 3000);
        } else {
          this.saveError.set(res.message || 'Delete failed.');
        }
      },
      error: err => this.saveError.set(this.apiErrorMessage(err, 'Delete failed.'))
    });
  }

  editRecordByRow(row: string[]): void {
    if (!this.isApiWired()) return;
    this.deliveryAddressOverride.set(null);
    if (this.config?.key === 'productServiceMaster' && !this.isAdmin()) {
      this.saveMsg.set('');
      this.saveError.set('Only admin can edit Product Master records.');
      return;
    }
    const record = this.findRecordByRow(row);
    const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Active';
    if (!record) return;
    this.editingId.set(record.id ?? null);
    this._autoCodeFields.clear();
    this.loadTransportDetailsForRecord(record.id ?? null);
    switch (this.config?.key) {
      case 'purchaseRequisition':
      case 'requestForQuotation':
      case 'purchaseOrder':
      case 'goodsReceipt':
      case 'purchaseInvoice':
      case 'purchaseReturn':
      case 'debitNote':
        this.applyPurchaseRecordToForm(record);
        break;
      case 'estimation':
      case 'proformaInvoice':
      case 'salesInvoice':
      case 'salesOrder':
      case 'salesQuotation':
      case 'deliveryChallan':
      case 'salesReturn':
      case 'creditNote':
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
        {
          const values = (record.values || []).length
            ? record.values
            : (record.possible_values || []).map((name: string) => ({ value_name: name }));
          this.attributeValuesPendingDeactivate.set([]);
          const rows = values
            .filter((v: any) => this.normalizeKey(v.status || 'active') !== 'inactive')
            .map((v: any) => [
            v.value_code || '',
            v.value_name || '',
            cap(v.status || 'active'),
            String(v.sort_order ?? 100),
            v.id !== undefined && v.id !== null ? String(v.id) : '',
            String(v.usage_count ?? 0)
          ]);
          // rows is kept as the edit-time snapshot (name -> code/id) even though the
          // grid UI is gone — buildPayload's attributeMaster case diffs the tag list
          // typed into `possibleValues` against this snapshot so existing value
          // codes/ids are preserved and values removed from the tags get deactivated
          // instead of silently orphaned.
          this.entryLineRowsKey.set('attributeMaster');
          this.entryLineRows.set(rows.length ? rows : [this.blankLineRow()]);
          this.formValues.set({
            attributeCode: record.attribute_code || '',
            attributeName: record.attribute_name || '',
            possibleValues: rows.map((r: string[]) => r[1]).filter(Boolean).join(', '),
            attributeType: record.data_type || record.attribute_type || 'Text',
            mandatoryFlag: record.is_mandatory ? 'Yes' : 'No',
            status: cap(record.status || 'active')
          });
        }
        break;
      case 'productGroupMaster':
        this.formValues.set({ groupCode: record.group_code || '', groupName: record.group_name || '', linkedCategory: record.category_name || '', description: record.description || '', status: cap(record.status || 'active') });
        break;
      case 'variantMaster':
        this.formValues.set({
          variantCode: record.variant_code || '',
          variantName: record.variant_name || '',
          skuPattern: record.sku_pattern || 'ITEMCODE',
          sku: record.sku || '',
          barcode: record.barcode || '',
          price: record.price ?? 0,
          cost: record.cost ?? 0,
          stockOnHand: record.stock_on_hand ?? record.stock ?? 0,
          images: Array.isArray(record.images) ? record.images.join(', ') : (record.images || ''),
          description: record.description || '',
          status: cap(record.status || 'active')
        });
        {
          const attrs = (record.attributes || []).length
            ? record.attributes
            : (record.attribute_name ? [{ attribute_name: record.attribute_name, attribute_value: record.attribute_value }] : []);
          const rows = attrs.map((attr: any) => [attr.attribute_name || '', attr.value_name || attr.attribute_value || '', attr.attribute_value_id !== undefined && attr.attribute_value_id !== null ? String(attr.attribute_value_id) : '']);
          this.entryLineRowsKey.set('variantMaster');
          this.entryLineRows.set(rows.length ? rows : [this.blankLineRow()]);
        }
        break;
      case 'serialNumberPolicy':
        this.formValues.set({ policyCode: record.policy_code || '', policyName: record.policy_name || '', applicableCategory: record.category_name || '', serialFormat: record.serial_format || '', captureStage: record.capture_stage || '', allowDuplicate: record.allow_duplicate ? 'Yes' : 'No', status: cap(record.status || 'active') });
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
        this.formValues.set({ name: record.vendor_name || '', code: record.vendor_code || '', segment: record.segment_name || '', vendorCategory: record.vendor_category || '', contactId: record.contact_id ?? null, contactSource: record.contact_source ?? null, gstin: record.gstin || '', pan: record.pan || '', mobile: record.mobile || '', email: record.email || '', address: record.address || '', city: record.city || '', state: record.state || '', district: record.district || '', pincode: record.pincode || '', paymentTerms: record.payment_term_name || '', creditLimit: record.credit_limit ?? 0, bankPayeeName: record.bank_payee_name || '', bankAccountNo: record.bank_account_no || '', bankIfscCode: record.bank_ifsc_code || '', bankName: record.bank_name || '', bankBranchName: record.bank_branch_name || '', status: cap(record.status || 'active') });
        // The GSTIN/PAN/Mobile/Email/Address fields display selectedPartyContact()'s
        // `type` in the ng-option template, not formValues() directly — reconstruct
        // it from the vendor's own saved fields so editing shows the real saved
        // contact instead of blanking the picker out.
        this.selectedPartyContact.set({
          id: record.contact_id ?? undefined,
          name: record.vendor_name || '',
          type: record.vendor_type === 'Individual' ? 'Individual' : 'Company',
          mobile: record.mobile || '',
          email: record.email || '',
          gstin: record.gstin || '',
          pan: record.pan || '',
          address: record.address || '',
          source: record.contact_source === 'global_contact' ? 'global_contact' : record.contact_source === 'inv_contacts' ? 'inv_contacts' : undefined
        });
        break;
      case 'customerMaster':
        this.formValues.set({ name: record.customer_name || '', code: record.customer_code || '', segment: record.segment_name || '', customerCategory: record.customer_category || '', contactId: record.contact_id ?? null, contactSource: record.contact_source ?? null, gstin: record.gstin || '', pan: record.pan || '', mobile: record.mobile || '', email: record.email || '', address: record.address || '', city: record.city || '', state: record.state || '', district: record.district || '', pincode: record.pincode || '', creditLimit: record.credit_limit ?? 0, bankPayeeName: record.bank_payee_name || '', bankAccountNo: record.bank_account_no || '', bankIfscCode: record.bank_ifsc_code || '', bankName: record.bank_name || '', bankBranchName: record.bank_branch_name || '', status: cap(record.status || 'active') });
        this.selectedPartyContact.set({
          id: record.contact_id ?? undefined,
          name: record.customer_name || '',
          type: record.customer_type === 'Individual' ? 'Individual' : 'Company',
          mobile: record.mobile || '',
          email: record.email || '',
          gstin: record.gstin || '',
          pan: record.pan || '',
          address: record.address || '',
          source: record.contact_source === 'global_contact' ? 'global_contact' : record.contact_source === 'inv_contacts' ? 'inv_contacts' : undefined
        });
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
              attributes: [],
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

  // Reopening ANY saved draft (GRN, PI, DC, Sales Invoice, Purchase/Sales
  // Return — whichever has serial-applicable lines) never restored
  // lineSerialUnitsMap from the line items' already-saved serial_numbers —
  // the picker showed "0 entered" on a line that actually had serials
  // captured earlier, and posting either re-flagged it as incomplete or,
  // worse, resent serial_numbers as null and wiped what was saved. Called
  // once, generically, from both applyPurchaseRecordToForm and
  // applySalesRecordToForm before their per-document-type branches run —
  // record.items is the same shape across every transaction type here, and
  // items without serial_numbers just don't add an entry. Always a full
  // .set() (never merge) so switching to edit a different record can't leak
  // a previously-edited record's serials into the new one.
  private hydrateLineSerialUnitsFromRecord(record: any): void {
    this.lineSerialUnitsMap.set(this.lineSerialMapFromItems(record?.items || []));
  }

  // A Sales Invoice line billed against a Delivery Challan item never
  // persists its own serial_numbers (salesLineItems() deliberately sends
  // null for dcItemId-linked lines — the DB linkage lives on
  // inv_serial_units.reserved_item_id/consumed_item_id instead), so
  // hydrateLineSerialUnitsFromRecord() above always finds an empty entry
  // for these rows. Pre-post, openSerialPicker() already re-fetches the
  // reserved units on click. Post-post those units have moved from
  // status='reserved' to status='sold' (fn_post_sales_invoice_stock), so
  // that same reserved-item lookup would come back empty even if the
  // picker button weren't inert on a posted record — there was previously
  // no query at all for "sold serials belonging to this SI item". This
  // fetches that once on load for every DC-linked line of a posted
  // invoice, so the Serial No column shows the actual bound units instead
  // of getting stuck on the static 'Loading…' fallback.
  private hydrateSoldSerialsForDcLinkedSalesInvoiceLines(record: any): void {
    if (!this.isCurrentRecordPosted()) return;
    (record?.items || []).forEach((item: any, index: number) => {
      const dcItemId = item?.dc_item_id;
      const siItemId = item?.id;
      if (!dcItemId || !siItemId) return;
      this.txService.getSoldSerialsForSiItem(siItemId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: res => {
            const serials = (res.data || []).map(s => s.serial_no).filter((s): s is string => !!s);
            if (serials.length) this.lineSerialUnitsMap.update(map => ({ ...map, [index]: serials }));
          },
          error: () => { /* leave the row's summary on its existing fallback text */ }
        });
    });
  }

  private applyPurchaseRecordToForm(record: any): void {
    const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : 'Draft';
    this.txDocId.set(record.id ?? null);
    this.txDocStatus.set(record.status || 'draft');
    this.hydrateLineSerialUnitsFromRecord(record);

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
        item.variant_name || '',
        item.attribute_value || item.attributeValue || this.referenceItemAttributeText(item),
        item.description || '',
        item.uom_name || '',
        String(item.required_qty ?? '')
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
        item.variant_name || '',
        item.attribute_value || item.attributeValue || this.referenceItemAttributeText(item),
        String(item.required_qty ?? ''),
        item.uom_name || '',
        String(item.target_rate ?? ''),
        String(item.vendor_rate ?? ''),
        item.lead_time || ''
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
      this.restoreLineGstModes(record.items || []);
      return;
    }

    if (this.config?.key === 'goodsReceipt') {
      this.txDocNumber.set(record.grn_number || '');
      const transport = this.grnParseTransportDetails(record.transport_details);
      this.formValues.set({
        segment: record.segment_name || this.selectedSegment(),
        segmentId: record.segment_id ?? null,
        grnNo: record.grn_number || '',
        grnDate: record.grn_date || null,
        vendorId: record.vendor_id ?? null,
        vendor: record.vendor_name || '',
        poId: record.po_id ?? record.rfq_id ?? null,
        poReference: record.po_number || record.rfq_number || '',
        branchId: this.branchIdFromRecord(record),
        branch: this.branchNameFromRecord(record),
        warehouseId: record.warehouse_id ?? null,
        warehouse: record.warehouse_name || '',
        receivingLocation: record.warehouse_name || this.branchNameFromRecord(record) || '',
        hasTransportDetails: transport.hasTransportDetails,
        transportVehicleNo: transport.transportVehicleNo,
        transportDriverName: transport.transportDriverName,
        transportContactNo: transport.transportContactNo,
        vendorInvoiceNo: record.vendor_invoice_no || '',
        vendorInvoiceDate: record.vendor_invoice_dt || null,
        status: cap(record.status || 'draft'),
        remarks: record.remarks || ''
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.grnItemToLineRow(item))
        .concat((record.items || []).length ? [] : [this.blankLineRow()]));
      this.restoreLineGstModes(record.items || []);
      return;
    }

    if (this.config?.key === 'purchaseInvoice') {
      this.txDocNumber.set(record.pi_number || record.piNumber || '');
      this.formValues.set({
        segment: record.segment_name || record.segmentName || this.selectedSegment(),
        segmentId: record.segment_id ?? record.segmentId ?? null,
        piNo: record.pi_number || record.piNumber || '',
        piDate: this.datePickerValue(record.pi_date || record.piDate),
        vendorId: record.vendor_id ?? record.vendorId ?? null,
        vendor: record.vendor_name || record.vendorName || '',
        grnId: record.grn_id ?? record.grnId ?? null,
        grnReference: record.grn_number || record.grnNumber || '',
        branchId: record.branch_id ?? record.branchId ?? null,
        branch: record.branch_name || record.branchName || this.branchNameFromRecord(record),
        warehouseId: record.warehouse_id ?? record.warehouseId ?? null,
        warehouse: record.warehouse_name || record.warehouseName || '',
        receivingLocation: record.warehouse_name || record.warehouseName || record.branch_name || record.branchName || this.branchNameFromRecord(record) || '',
        vendorInvoiceNo: record.vendor_invoice_no || record.vendorInvoiceNo || '',
        vendorInvoiceDate: this.datePickerValue(record.vendor_invoice_dt || record.vendorInvoiceDt),
        dueDate: this.datePickerValue(record.due_date || record.dueDate),
        paymentTerms: record.payment_terms || record.paymentTerms || '',
        status: cap(record.status || 'draft'),
        remarks: record.remarks || ''
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.purchaseInvoiceItemToLineRow(item))
        .concat((record.items || []).length ? [] : [this.blankLineRow()]));
      this.restoreLineGstModes(record.items || []);
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
        piGrnId: record.pi_grn_id ?? null,
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
        item.variant_name || '',
        item.attribute_value || item.attribute_name || '',
        item.uom_name || '',
        String(item.grn_qty ?? ''),
        String(item.return_qty ?? ''),
        String(item.rate ?? ''),
        String(item.gst_rate ?? ''),
        String(item.return_amount ?? ''),
        '',
        item.return_reason || ''
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
      this.restoreLineGstModes(record.items || []);
      // Restore the already-saved attribute_id/attribute_value per line (see
      // lineRefItemIdMap's doc comment) so re-saving this draft keeps using
      // the exact values instead of falling back to resolveLineAttribute().
      const purchaseReturnAttrMap: Record<number, { attributeId?: number | null; attributeName?: string | null; attributeValue?: string | null }> = {};
      (record.items || []).forEach((item: any, i: number) => {
        purchaseReturnAttrMap[i] = {
          attributeId: item?.attribute_id ?? item?.attributeId ?? null,
          attributeName: item?.attribute_name ?? item?.attributeName ?? null,
          attributeValue: item?.attribute_value ?? item?.attributeValue ?? null
        };
      });
      this.lineRefItemIdMap.set(purchaseReturnAttrMap);
    }

    if (this.config?.key === 'debitNote') {
      this.txDocNumber.set(record.debit_note_number || '');
      this.formValues.set({
        segment: record.segment_name || this.selectedSegment(),
        segmentId: record.segment_id ?? null,
        debitNoteNo: record.debit_note_number || '',
        debitNoteDate: record.debit_note_date || null,
        vendorId: record.vendor_id ?? null,
        vendor: record.vendor_name || '',
        purchaseReturnId: record.purchase_return_id ?? null,
        reference: record.purchase_return_number || '',
        purchaseInvoiceId: record.purchase_invoice_id ?? null,
        purchaseInvoiceReference: record.purchase_invoice_number || '',
        reason: record.reason || '',
        gstAdjustment: record.gst_adjustment ? 'Yes' : 'No',
        status: cap(record.status || 'draft'),
        remarks: record.remarks || ''
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.normalizeLineRow([
        item.description || '',
        item.reference || '',
        String(item.amount ?? ''),
        String(item.gst_pct ?? ''),
        String(item.gst_amount ?? ''),
        String(item.total_amount ?? '')
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
    }
  }

  private applySalesRecordToForm(record: any): void {
    const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : 'Draft';
    this.txDocId.set(record.id ?? null);
    this.txDocStatus.set(record.status || 'draft');
    this.txDocNumber.set(record.doc_number || '');
    this.hydrateLineSerialUnitsFromRecord(record);

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
      this.restoreLineGstModes(record.items || []);
      return;
    }

    if (this.config?.key === 'salesInvoice') {
      this.formValues.set({
        invoiceNo: record.doc_number || '',
        invoiceDate: record.doc_date || null,
        dueDate: record.due_date || null,
        soId: record.so_id ?? null,
        soReference: record.so_number || '',
        referenceNo: record.reference_no || '',
        customerId: record.customer_id ?? null,
        customer: record.customer_name || '',
        placeOfSupply: record.place_of_supply || '',
        warehouseId: record.warehouse_id ?? null,
        warehouse: record.warehouse_name || '',
        transportMode: record.transport_mode || '',
        vehicleNo: record.vehicle_no || '',
        paymentTerms: record.payment_terms || '',
        customerNotes: record.customer_notes || '',
        internalNotes: record.internal_notes || '',
        status: cap(record.status || 'draft')
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => {
        const row = this.blankLineRow();
        const set = (column: string, value: string) => {
          const idx = this.lineColumnIndex(column);
          if (idx >= 0) row[idx] = value;
        };
        set('Item / SKU', item.product_name || '');
        set('Variant', item.variant_name || '');
        set('Attribute', item.attribute_value || item.attributeValue || this.referenceItemAttributeText(item));
        set('UOM', item.uom_name || '');
        set('Qty', String(item.qty ?? ''));
        set('Rate', String(item.rate ?? ''));
        set('MRP', String(item.mrp ?? ''));
        set('Selling Price', String(item.selling_price ?? ''));
        set('Disc %', String(item.discount_pct ?? ''));
        set('GST', String(item.gst_rate ?? ''));
        set('Batch No', item.batch_no || '');
        set('Serial No', item.serial_no || '');
        set('Expiry Date', item.expiry_date || '');
        set('Warehouse', item.warehouse_name || record.warehouse_name || '');
        set('Amount', String(item.amount ?? ''));
        return this.normalizeLineRow(row);
      }).concat((record.items || []).length ? [] : [this.blankLineRow()]));
      this.restoreLineGstModes(record.items || []);
      // Re-populate the hidden reference-id map from the already-persisted
      // so_item_id/dc_item_id so re-saving an edited draft (without re-
      // picking any reference) doesn't silently drop them.
      this.lineRefItemIdMap.set(
        Object.fromEntries((record.items || []).map((item: any, i: number) => [
          i, { soItemId: item.so_item_id ?? null, dcItemId: item.dc_item_id ?? null }
        ]))
      );
      this.hydrateSoldSerialsForDcLinkedSalesInvoiceLines(record);
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
      this.restoreLineGstModes(record.items || []);
      return;
    }

    if (this.config?.key === 'salesOrder') {
      this.formValues.set({
        soNo: record.doc_number || '',
        soDate: record.doc_date || null,
        customerId: record.customer_id ?? null,
        customer: record.customer_name || '',
        creditSale: (record.payment_terms || record.due_date) ? 'Yes' : 'No',
        paymentTerms: record.payment_terms || '',
        dueDate: record.due_date || null,
        deliveryDate: record.delivery_date || null,
        deliveryAddress: record.delivery_location || '',
        status: cap(record.status || 'draft')
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.normalizeLineRow([
        item.product_name || '',
        item.variant_name || '',
        item.attribute_value || item.attributeValue || this.referenceItemAttributeText(item),
        item.uom_name || '',
        String(item.qty ?? ''),
        String(item.rate ?? ''),
        String(item.gst_rate ?? ''),
        item.batch_no || '',
        String(item.expiry_date ?? item.expiryDate ?? ''),
        String(item.amount ?? '')
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
      this.restoreLineGstModes(record.items || []);
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
        siId: record.si_id ?? null,
        siReference: record.si_number || '',
        referenceNo: record.reference_no || '',
        customerId: record.customer_id ?? null,
        customer: record.customer_name || '',
        fromWarehouseId: record.from_warehouse_id ?? null,
        fromWarehouse: record.from_warehouse_name || record.branch_name || record.branchName || '',
        warehouseId: record.from_warehouse_id ?? null,
        warehouse: record.from_warehouse_name || '',
        branchId: record.branch_id ?? record.branchId ?? null,
        branch: record.branch_name || record.branchName || '',
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
        item.variant_name || '',
        item.attribute_value || item.attributeValue || this.referenceItemAttributeText(item),
        String(item.so_qty ?? ''),
        String(item.dispatch_qty ?? ''),
        item.uom_name || ''
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
      this.lineRefItemIdMap.set(
        Object.fromEntries((record.items || []).map((item: any, i: number) => [
          i, { soItemId: item.so_item_id ?? null, siItemId: item.si_item_id ?? null }
        ]))
      );
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
        item.variant_name || '',
        item.attribute_value || item.attributeValue || this.referenceItemAttributeText(item),
        String(item.invoiced_qty ?? ''),
        String(item.return_qty ?? ''),
        item.uom_name || '',
        String(item.rate ?? ''),
        String(item.gst_rate ?? ''),
        item.batch_no || '',
        item.serial_no || '',
        String(item.expiry_date ?? item.expiryDate ?? ''),
        String(item.return_amount ?? ''),
        item.reason || ''
      ])).concat((record.items || []).length ? [] : [this.blankLineRow()]));
      this.restoreLineGstModes(record.items || []);
      // Restore the already-saved attribute_id/attribute_value per line (see
      // lineRefItemIdMap's doc comment) so re-saving this draft keeps using
      // the exact values instead of falling back to resolveLineAttribute().
      const salesReturnAttrMap: Record<number, { attributeId?: number | null; attributeName?: string | null; attributeValue?: string | null }> = {};
      (record.items || []).forEach((item: any, i: number) => {
        salesReturnAttrMap[i] = {
          attributeId: item?.attribute_id ?? item?.attributeId ?? null,
          attributeName: item?.attribute_name ?? item?.attributeName ?? null,
          attributeValue: item?.attribute_value ?? item?.attributeValue ?? null
        };
      });
      this.lineRefItemIdMap.set(salesReturnAttrMap);
    }

    if (this.config?.key === 'creditNote') {
      this.txDocNumber.set(record.credit_note_number || '');
      this.formValues.set({
        segment: record.segment_name || this.selectedSegment(),
        segmentId: record.segment_id ?? null,
        creditNoteNo: record.credit_note_number || '',
        creditNoteDate: record.credit_note_date || null,
        customerId: record.customer_id ?? null,
        customer: record.customer_name || '',
        salesReturnId: record.sales_return_id ?? null,
        reference: record.sales_return_number || '',
        salesInvoiceId: record.sales_invoice_id ?? null,
        salesInvoiceReference: record.sales_invoice_number || '',
        reason: record.reason || '',
        gstAdjustment: record.gst_adjustment ? 'Yes' : 'No',
        status: cap(record.status || 'draft'),
        remarks: record.remarks || ''
      });
      this.entryLineRowsKey.set(this.config.key);
      this.entryLineRows.set((record.items || []).map((item: any) => this.normalizeLineRow([
        item.description || '',
        item.reference || '',
        String(item.amount ?? ''),
        String(item.gst_pct ?? ''),
        String(item.gst_amount ?? ''),
        String(item.total_amount ?? '')
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
          uom_symbol: v['uomSymbol'] || null,
          decimal_allowed: v['decimalAllowed'] === true || v['decimalAllowed'] === 'Yes',
          is_base_uom: !!existing?.is_base_uom,
          conversions: existingConversions,
          status: lc(v['status'])
        };
      }
      case 'categoryMaster':
        return {
          segment_id: selectedSegmentId,
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
        // The values grid UI is gone — values are now typed as comma-separated
        // tags into the "Attribute Values" field (v['possibleValues']). To avoid
        // regressing edit behaviour, the edit-time snapshot captured into
        // entryLineRows() by editRecordByRow is used purely as a name -> {code,id}
        // lookup: tags matching an existing name reuse its code/id (so codes don't
        // churn and updates target the right row), brand-new tags get value_code:
        // null so the backend auto-generates one, and any existing value whose name
        // is no longer present in the tags is sent back with status 'inactive'
        // instead of silently staying active but orphaned.
        const tagNames = String(v['possibleValues'] || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        const existingRows = this.entryLineRows().filter(row => String(row[1] || '').trim());
        const existingByName = new Map(existingRows.map(row => [this.normalizeKey(row[1]), row]));
        const keptKeys = new Set(tagNames.map(name => this.normalizeKey(name)));
        const activeValueRows = tagNames.map((name, index) => {
          const existing = existingByName.get(this.normalizeKey(name));
          return {
            value_code: existing?.[0] || null,
            value_name: name,
            status: 'active',
            sort_order: (index + 1) * 10,
            id: existing?.[4] ? Number(existing[4]) : null
          };
        });
        const deactivatedValueRows = existingRows
          .filter(row => !keptKeys.has(this.normalizeKey(row[1])))
          .map((row, index) => ({
            value_code: row[0] || null,
            value_name: row[1],
            status: 'inactive',
            sort_order: Number(row[3]) || ((activeValueRows.length + index + 1) * 10),
            id: row[4] ? Number(row[4]) : null
          }));
        const valueRows = [...activeValueRows, ...deactivatedValueRows];
        return {
          segment_id: selectedSegmentId,
          attribute_code: v['attributeCode'] || null,
          attribute_name: v['attributeName'] || '',
          category_name: v['categoryName'] || null,
          attribute_type: this.attributeTypeForApi(v['attributeType']),
          data_type: this.attributeTypeForApi(v['attributeType']),
          display_order: 100,
          possible_values: tagNames.length ? tagNames : null,
          values: valueRows,
          is_mandatory: bool(v['mandatoryFlag']),
          status: lc(v['status'])
        };
      }
      case 'productGroupMaster':
        return { segment_id: selectedSegmentId, group_code: v['groupCode'] || null, group_name: v['groupName'] || '', category_name: v['linkedCategory'] || null, description: v['description'] || null, status: lc(v['status']) };
      case 'variantMaster':
        {
          const attrs = this.entryLineRows()
            .filter(r => r.some(cell => String(cell ?? '').trim()))
            .filter(r => r[0])
            .map((r, index) => {
              const attribute = this.findAttributeBySelection(r[0]);
              const valueText = this.variantAttributeValueForPayload(r[1]);
              const value = this.findAttributeValueBySelection(r[0], r[2] || valueText);
              return {
                attribute_id: attribute?.id ?? null,
                attribute_name: attribute?.attribute_name || r[0],
                attribute_value_id: value?.id ?? (r[2] ? Number(r[2]) || null : null),
                attribute_value: valueText,
                display_order: index + 1
              };
            });
          const firstAttr = attrs[0] || { attribute_name: v['attributeName'] || null, attribute_value: this.variantAttributeValueForPayload(v['attributeValue']) };
          const images = String(v['images'] || '').split(',').map((item: string) => item.trim()).filter(Boolean);
          return {
            segment_id: selectedSegmentId,
            product_id: null,
            product_code: null,
            product_name: null,
            variant_code: v['variantCode'] || null,
            variant_name: v['variantName'] || '',
            sku: v['sku'] || null,
            sku_pattern: v['skuPattern'] || 'ITEMCODE',
            barcode: v['barcode'] || null,
            price: Number(v['price']) || 0,
            cost: Number(v['cost']) || 0,
            stock_on_hand: Number(v['stockOnHand']) || 0,
            images,
            attribute_name: firstAttr.attribute_name,
            attribute_value: firstAttr.attribute_value,
            attributes: attrs.length ? attrs : (firstAttr.attribute_name ? [firstAttr] : []),
            description: v['description'] || null,
            status: lc(v['status'] || 'active')
          };
        }
      case 'serialNumberPolicy': {
        const categoryName = v['applicableCategory'] || null;
        const categoryId = categoryName
          ? this.loadedCategoryObjects().find(item => this.optionEquals(item.category_name, categoryName))?.id ?? null
          : null;
        return { segment_id: selectedSegmentId, policy_code: v['policyCode'] || null, policy_name: v['policyName'] || '', category_id: categoryId, category_name: categoryName, serial_format: v['serialFormat'] || null, capture_stage: captureStage(v['captureStage']), allow_duplicate: bool(v['allowDuplicate']), status: lc(v['status']) };
      }
      case 'batchLotPolicy': {
        const categoryName = v['applicableCategory'] || v['applicableFor'] || null;
        const categoryId = categoryName
          ? this.loadedCategoryObjects().find(item => this.optionEquals(item.category_name, categoryName))?.id ?? null
          : null;
        return { segment_id: selectedSegmentId, policy_code: v['policyCode'] || null, policy_name: v['policyName'] || '', category_id: categoryId, category_name: categoryName, batch_format: v['batchFormat'] || null, expiry_required: bool(v['expiryRequired']), qc_required: bool(v['qcRequired']), status: lc(v['status']) };
      }
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
        return { segment_id: selectedSegmentId, vendor_code: v['code'] || v['vendorCode'] || null, vendor_name: v['name'] || v['vendorName'] || '', segment_name: selectedSegmentName, vendor_category: v['vendorCategory'] || null, contact_id: v['contactId'] ?? null, contact_source: v['contactSource'] ?? null, gstin: v['gstin'] || null, pan: v['pan'] || null, mobile: v['mobile'] || null, email: v['email'] || null, address: v['address'] || null, city: v['city'] || null, state: v['state'] || null, district: v['district'] || null, pincode: v['pincode'] || null, payment_term_id: this.paymentTermBySelection(v['paymentTerms'])?.id ?? null, credit_limit: Number(v['creditLimit']) || 0, bank_payee_name: v['bankPayeeName'] || null, bank_account_no: v['bankAccountNo'] || null, bank_ifsc_code: v['bankIfscCode'] || null, bank_name: v['bankName'] || null, bank_branch_name: v['bankBranchName'] || null, status: lc(v['status']) };
      case 'customerMaster':
        return { segment_id: selectedSegmentId, customer_code: v['code'] || v['customerCode'] || null, customer_name: v['name'] || v['customerName'] || '', segment_name: selectedSegmentName, customer_category: v['customerCategory'] || null, contact_id: v['contactId'] ?? null, contact_source: v['contactSource'] ?? null, gstin: v['gstin'] || null, pan: v['pan'] || null, mobile: v['mobile'] || null, email: v['email'] || null, address: v['address'] || null, city: v['city'] || null, state: v['state'] || null, district: v['district'] || null, pincode: v['pincode'] || null, credit_limit: Number(v['creditLimit']) || 0, bank_payee_name: v['bankPayeeName'] || null, bank_account_no: v['bankAccountNo'] || null, bank_ifsc_code: v['bankIfscCode'] || null, bank_name: v['bankName'] || null, bank_branch_name: v['bankBranchName'] || null, status: lc(v['status']) };
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
            attributes: this.normalizeProductVariantAttributes(av.attributes),
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
      // GRN shows a single merged Branch/Warehouse picker — resolve the picked
      // name against Warehouse Master first, then Branch Master, so only the
      // matching side of the record gets populated (whichever the user picked).
      const grnLocation = v['receivingLocation'];
      const grnWarehouse = this.findWarehouseBySelection(grnLocation) || warehouse;
      const grnBranch = !grnWarehouse ? (this.findBranchBySelection(grnLocation) || branch) : null;
      const grnWarehouseId = grnWarehouse?.id ?? (grnBranch ? null : warehouseId);
      const grnBranchId = grnBranch
        ? (this.optionalNumber(grnBranch.branch_id) ?? this.optionalNumber(grnBranch.id))
        : (grnWarehouse ? null : branchId);
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        branch_id: grnBranchId,
        branch_name: grnBranch?.branch_name || (grnWarehouse ? null : (v['branch'] || null)),
        warehouse_id: grnWarehouseId,
        warehouse_name: grnWarehouse?.warehouse_name || (grnBranch ? null : (grnLocation || v['warehouse'] || null)),
        vendor_id: vendorId,
        vendor_name: vendor?.vendor_name || v['vendor'] || null,
        vendor_gstin: vendor?.gstin || null,
        po_id: this.optionalNumber(v['poId']),
        po_number: v['poReference'] || null,
        grn_number: docNo('grnNo', 'GRN Number'),
        grn_date: docDate('grnDate'),
        vendor_invoice_no: v['vendorInvoiceNo'] || null,
        vendor_invoice_dt: v['vendorInvoiceDate'] || null,
        transport_details: this.grnComposeTransportDetails(v),
        remarks: v['remarks'] || null,
        status: grnStatus,
        post: grnStatus === 'posted',
        items: this.purchaseGrnItems(grnWarehouse?.warehouse_name || '')
      };
    }

    if (this.config?.key === 'purchaseInvoice') {
      const piLocation = v['receivingLocation'] || v['warehouse'] || v['branch'];
      const piWarehouse = this.findWarehouseBySelection(piLocation) || warehouse;
      const piBranch = !piWarehouse ? (this.findBranchBySelection(piLocation) || branch) : null;
      const piWarehouseId = piWarehouse?.id ?? (piBranch ? null : warehouseId);
      const piBranchId = piBranch
        ? (this.optionalNumber(piBranch.branch_id) ?? this.optionalNumber(piBranch.id))
        : (piWarehouse ? null : branchId);
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        vendor_id: vendorId,
        vendor_name: vendor?.vendor_name || v['vendor'] || null,
        vendor_gstin: vendor?.gstin || null,
        grn_id: this.optionalNumber(v['grnId']),
        grn_number: v['grnReference'] || null,
        branch_id: piBranchId,
        branch_name: piBranch?.branch_name || (piWarehouse ? null : (v['branch'] || piLocation || null)),
        warehouse_id: piWarehouseId,
        warehouse_name: piWarehouse?.warehouse_name || (piBranch ? null : (v['warehouse'] || piLocation || null)),
        pi_number: docNo('piNo', 'PI Number'),
        pi_date: this.isoDateValue(v['piDate']) || docDate('piDate'),
        vendor_invoice_no: v['vendorInvoiceNo'] || null,
        vendor_invoice_dt: this.isoDateValue(v['vendorInvoiceDate']),
        due_date: this.isoDateValue(v['dueDate']),
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
        pi_number: this.normalizeKey(v['piReference']).includes('directpurchasereturn') ? null : (v['piReference'] || null),
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

    if (this.config?.key === 'debitNote') {
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        vendor_id: vendorId,
        vendor_name: vendor?.vendor_name || v['vendor'] || null,
        debit_note_number: docNo('debitNoteNo', 'Debit Note Number'),
        debit_note_date: docDate('debitNoteDate'),
        purchase_return_id: this.optionalNumber(v['purchaseReturnId']),
        purchase_return_number: v['reference'] || null,
        purchase_invoice_id: this.optionalNumber(v['purchaseInvoiceId']),
        purchase_invoice_number: v['purchaseInvoiceReference'] || null,
        reason: v['reason'] || null,
        gst_adjustment: v['gstAdjustment'] === 'Yes',
        remarks: v['remarks'] || null,
        status: status(v['status'], 'draft'),
        items: this.documentNoteItems()
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
        so_id: this.optionalNumber(v['soId']),
        so_number: this.optionalNumber(v['soId']) ? (v['soReference'] || null) : null,
        reference_no: v['referenceNo'] || v['soReference'] || null,
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
      const creditSale = v['creditSale'] === 'Yes';
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        doc_number: docNo('soNo', 'SO Number'),
        doc_date: docDate('soDate'),
        due_date: creditSale ? (v['dueDate'] || null) : null,
        delivery_date: v['deliveryDate'] || null,
        customer_id: customerId,
        customer_name: customerName,
        customer_gstin: customerGstin,
        payment_terms: creditSale ? (v['paymentTerms'] || null) : null,
        delivery_location: v['deliveryAddress'] || null,
        reference_no: null,
        remarks: v['remarks'] || null,
        status: status(v['status'], 'draft'),
        items
      };
    }

    if (this.config?.key === 'deliveryChallan') {
      const dcLocation = v['fromWarehouse'] || v['warehouse'] || v['branch'];
      const fromWarehouse = this.findWarehouseBySelection(dcLocation);
      const fromBranch = fromWarehouse ? null : this.findBranchBySelection(dcLocation);
      const fromWarehouseId = fromWarehouse?.id ?? (fromBranch ? null : this.optionalNumber(v['fromWarehouseId']));
      const fromBranchId = fromBranch
        ? (this.optionalNumber(fromBranch.branch_id) ?? this.optionalNumber(fromBranch.id))
        : (fromWarehouse ? null : this.optionalNumber(v['branchId']));
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        dc_number: docNo('dcNo', 'DC Number'),
        dc_date: docDate('dcDate'),
        so_id: this.optionalNumber(v['soId']),
        so_number: this.optionalNumber(v['soId']) ? (v['soReference'] || null) : null,
        si_id: this.optionalNumber(v['siId']),
        si_number: this.optionalNumber(v['siId']) ? (v['siReference'] || v['soReference'] || null) : null,
        reference_no: v['referenceNo'] || v['soReference'] || v['siReference'] || null,
        customer_id: customerId,
        customer_name: customerName,
        branch_id: fromBranchId,
        branch_name: fromBranch?.branch_name || (fromWarehouse ? null : (v['branch'] || dcLocation || null)),
        from_warehouse_id: fromWarehouseId,
        from_warehouse_name: fromWarehouse?.warehouse_name || (fromBranch ? null : (dcLocation || null)),
        vehicle: v['vehicle'] || null,
        transporter: v['transporter'] || null,
        lr_no: v['lrNo'] || null,
        delivery_address: v['deliveryAddress'] || this.composeDcDeliveryAddress(v) || null,
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

    if (this.config?.key === 'creditNote') {
      return {
        id: this.editingId(),
        segment_id: segmentId,
        segment_name: selectedSegmentName,
        customer_id: customerId,
        customer_name: customerName,
        credit_note_number: docNo('creditNoteNo', 'Credit Note Number'),
        credit_note_date: docDate('creditNoteDate'),
        sales_return_id: this.optionalNumber(v['salesReturnId']),
        sales_return_number: v['reference'] || null,
        sales_invoice_id: this.optionalNumber(v['salesInvoiceId']),
        sales_invoice_number: v['salesInvoiceReference'] || null,
        reason: v['reason'] || null,
        gst_adjustment: v['gstAdjustment'] === 'Yes',
        remarks: v['remarks'] || null,
        status: status(v['status'], 'draft'),
        items: this.documentNoteItems()
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
    const refMap = this.lineRefItemIdMap();
    return this.activeSalesLineRows().map((row, index) => {
      const productName = this.lineValue(row, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      const variantText = this.lineValue(row, ['variant']);
      const { uom_name, uom_id } = this.resolveLineUom(product, this.lineValue(row, ['uom']), false);
      const { variant_id, variant_name } = this.resolveLineVariant(product, variantText);
      // Prefer the referenced SO/DC item's own attribute_id/attribute_value
      // (carried via lineRefItemIdMap when this row came from picking a
      // reference) over re-deriving it from the grid's free-text
      // "Attribute" cell — see attributeRefMapFromItems' doc comment.
      // attribute_id itself was previously missing from this payload
      // entirely (only name/value were sent), so inv_sales_order_items and
      // inv_sales_invoice_items always saved attribute_id = NULL regardless
      // of what the backend expected, breaking attribute-scoped matching
      // for every downstream Sales Return/DC/SI on an attribute-tracked
      // product.
      const salesRefAttr = refMap[index];
      const salesResolvedAttr = this.resolveLineAttribute(product, variantText, this.transactionLineAttributeText(row, index));
      const attribute_id = salesRefAttr?.attributeId !== undefined ? salesRefAttr.attributeId : salesResolvedAttr.attribute_id;
      const attribute_name = salesRefAttr?.attributeName !== undefined ? salesRefAttr.attributeName : salesResolvedAttr.attribute_name;
      const attribute_value = salesRefAttr?.attributeValue !== undefined ? salesRefAttr.attributeValue : salesResolvedAttr.attribute_value;
      const qty = this.lineNumber(row, ['qty']);
      const rate = this.lineNumber(row, ['rate', 'list']);
      const discountPct = this.lineNumber(row, ['disc', 'discount']);
      const gstRate = this.transactionLineGstPercent(row);
      const taxPayload = this.transactionLineTaxPayload(row, index, qty, rate, discountPct, gstRate);
      const base: any = {
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
        qty,
        rate,
        discount_pct: discountPct,
        gst_rate: gstRate,
        gst_inclusive: taxPayload.gst_inclusive,
        taxable_amount: taxPayload.taxable_amount,
        tax_amount: taxPayload.tax_amount,
        amount: this.lineNumber(row, ['amount']) || taxPayload.amount,
        remarks: this.lineValue(row, ['remarks']) || null
      };
      if (this.config?.key === 'salesInvoice') {
        base['mrp'] = this.lineNumber(row, ['mrp']);
        base['selling_price'] = this.lineNumber(row, ['selling price']);
        base['batch_no'] = this.lineValue(row, ['batch']) || null;
        base['serial_no'] = this.lineValue(row, ['serial']) || null;
        base['expiry_date'] = this.lineValue(row, ['expiry']) || null;
        base['warehouse_name'] = this.lineValue(row, ['warehouse']) || this.formValues()['warehouse'] || null;
        const ref = refMap[index];
        base['so_item_id'] = ref?.soItemId ?? null;
        base['dc_item_id'] = ref?.dcItemId ?? null;
        base['serial_numbers'] = ref?.dcItemId ? null : (this.lineSerialUnitsMap()[index] || null);
      } else if (this.config?.key === 'salesOrder') {
        base['batch_no'] = this.lineValue(row, ['batch']) || null;
        base['serial_no'] = this.lineValue(row, ['serial']) || null;
        base['expiry_date'] = this.lineValue(row, ['expiry']) || null;
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
    const rawUomText = String(rowUomName || '').trim();
    const uomText = rawUomText || this.uomNameFromSelection(rowUomName || '');
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
    const match = this.productVariantOptionObjects(product).find(option => this.productVariantOptionMatches(option, variantText));
    if (match) return { variant_id: match.id, variant_name: match.label };
    return { variant_id: null, variant_name: variantText || null };
  }

  protected lineAttributeOptionsForVariantRow(product: ProductItem | null | undefined, variantText: string | null): string[] {
    if (!variantText) return [];
    const match = this.productVariantOptionObjects(product).find(v => this.productVariantOptionMatches(v, variantText));
    if (!match?.id) return [];
    const productMappedItems = this.productVariantAttributeItemList(this.productMappedVariantAttributes(product, match.id));
    if (productMappedItems.length) {
      return [...new Set(productMappedItems.map(item => item.value).filter(Boolean))];
    }
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

  protected buildLineAttrSelections(variantId: number | null, row: string[], rowIndex: number, product?: ProductItem | null): VariantAttrSelection[] {
    if (!variantId) return [];
    const items = this.variantAttributeItemsForTransaction(product, variantId);
    if (!items.length) return [];
    const valueMap = this.lineAttrValueMap();
    const rowAttrValue = this.lineValue(row, ['attribute']);
    const grouped = new Map<string, string[]>();
    for (const attr of items) {
      const name = (attr.name || '').trim();
      const val  = (attr.value || '').trim();
      if (!name) continue;
      if (!grouped.has(name)) grouped.set(name, []);
      if (val && !grouped.get(name)!.includes(val)) grouped.get(name)!.push(val);
    }
    const stockWarehouseId = this.salesOrderAttributeStockWarehouseId();
    const productId = product?.id ?? null;

    return Array.from(grouped.entries()).map(([name, options]) => {
      const mapValue = valueMap[`${rowIndex}_${name}`];
      const rowAttrParts = this.attributeTextParts(rowAttrValue);
      const namedRowAttrValue = rowAttrParts.find(part => part.name && this.optionEquals(part.name, name))?.value || '';
      const plainRowAttrValue = rowAttrParts.length === 1 && !rowAttrParts[0].name ? rowAttrParts[0].value : rowAttrValue;
      const committedValue = mapValue !== undefined
        ? mapValue
        : (namedRowAttrValue && options.includes(namedRowAttrValue)
          ? namedRowAttrValue
          : (plainRowAttrValue && options.includes(plainRowAttrValue) ? plainRowAttrValue : ''));

      let displayOptions = options;
      if (stockWarehouseId && productId) {
        const inStock = this.filterAttributeOptionsByWarehouseStock(productId, variantId, options, stockWarehouseId);
        // Keep an already-committed value visible/selectable even if it has
        // since gone out of stock (e.g. editing an older draft) — the filter
        // only narrows the choices offered for a fresh pick.
        displayOptions = committedValue && !inStock.includes(committedValue) ? [...inStock, committedValue] : inStock;
      }

      const value = committedValue || (displayOptions.length === 1 ? displayOptions[0] : '');
      return { name, options: displayOptions, value, isAuto: displayOptions.length <= 1 };
    });
  }

  // Only Delivery Challan and Sales Invoice actually move stock out of a
  // warehouse (same gate as salesOutwardStockControlState() above) — a Sales
  // Order is customer demand, not a stock commitment, so its attribute-value
  // choices are never narrowed by current stock; every other screen has no
  // stock-committing warehouse field at all. Returns the header warehouse id
  // for DC/SI so buildLineAttrSelections() below can hide out-of-stock values.
  private salesOrderAttributeStockWarehouseId(): number | null {
    const key = this.config?.key || '';
    if (key !== 'deliveryChallan' && key !== 'salesInvoice') return null;
    const headerField = key === 'deliveryChallan'
      ? (this.formValues()['fromWarehouse'] || this.formValues()['fromWarehouseId'])
      : (this.formValues()['warehouse'] || this.formValues()['warehouseId']);
    const warehouse = this.findWarehouseBySelection(headerField);
    return warehouse?.id ?? this.optionalNumber(headerField) ?? null;
  }

  // Narrows an attribute's selectable values down to those with stock > 0 in
  // the given warehouse, reusing the same per-value sp_get_available_stock
  // cache the Qty stock hint already populates. A value with no cache entry
  // yet is kept visible (and its fetch kicked off) rather than hidden, so the
  // dropdown doesn't flash empty while stock data is still loading in.
  private filterAttributeOptionsByWarehouseStock(productId: number, variantId: number | null, options: string[], warehouseId: number): string[] {
    const cache = this.availableStockCache();
    return options.filter(value => {
      const key = this.availableStockKey(productId, variantId, value);
      const rows = cache[key];
      if (rows === undefined) {
        this.fetchAvailableStockForLine(productId, variantId, value);
        return true;
      }
      const here = this.stockRowForWarehouse(rows, warehouseId);
      return Number(here?.available || 0) > 0;
    });
  }

  // Same idea as filterAttributeOptionsByWarehouseStock() above, one level
  // up: on DC/SI (the only screens salesOrderAttributeStockWarehouseId()
  // resolves a warehouse for), hide variants with no available stock in that
  // warehouse instead of listing every variant the product has regardless of
  // stock. A row's already-committed variant stays selectable even if it's
  // since gone out of stock, same as the attribute-value filter does.
  private variantOptionsForTransactionRow(product: ProductItem | null | undefined, row?: string[]): string[] {
    const options = this.productVariantOptionObjects(product);
    const warehouseId = this.salesOrderAttributeStockWarehouseId();
    if (!warehouseId || !product?.id) return options.map(option => option.label);

    const cache = this.availableStockCache();
    const inStock = options.filter(option => {
      const key = this.availableStockKey(product.id, option.id);
      const rows = cache[key];
      if (rows === undefined) {
        this.fetchAvailableStockForLine(product.id ?? null, option.id);
        return true;
      }
      return Number(this.stockRowForWarehouse(rows, warehouseId)?.available || 0) > 0;
    });

    const existingValue = row ? this.lineValue(row, ['variant']) : '';
    if (existingValue && !inStock.some(option => this.productVariantOptionMatches(option, existingValue))) {
      return [...inStock.map(option => option.label), existingValue];
    }
    return inStock.map(option => option.label);
  }

  lineRowAttrSelections(rowIndex: number, row: string[]): VariantAttrSelection[] {
    const productName = this.lineValue(row, ['product', 'item', 'sku', 'material']);
    const product = this.findProductBySelection(productName);
    const variantText = this.lineValue(row, ['variant']);
    if (!variantText || !product) return [];
    const match = this.productVariantOptionObjects(product).find(v => this.productVariantOptionMatches(v, variantText));
    if (!match?.id) return [];
    return this.buildLineAttrSelections(match.id, row, rowIndex, product);
  }

  setLineAttrValue(rowIndex: number, attrName: string, value: string | null): void {
    this.lineAttrValueMap.update(map => ({ ...map, [`${rowIndex}_${attrName}`]: value || '' }));
    const attrIdx = (this.config?.lineColumns || []).findIndex(c => c.toLowerCase() === 'attribute');
    if (attrIdx >= 0) {
      this.directEntryLineRows();
      this.entryLineRows.update(rows => rows.map((r, i) => {
        if (i !== rowIndex) return r;
        const nextRow = [...r];
        nextRow[attrIdx] = this.transactionLineAttributeText(nextRow, rowIndex);
        return nextRow;
      }));
    }
  }

  // Shared builder for lineRefItemIdMap's attribute fields from a reference
  // document's own items — used by every reference-pick handler (PO->GRN,
  // GRN->PI, PI->Purchase Return, SO->DC, SO/DC->SI, Invoice->Sales Return)
  // so the structured attribute_id the source document already carries
  // doesn't have to round-trip through the grid's free-text "Attribute"
  // cell and back out via resolveLineAttribute() below — a lossy trip that
  // returns null outright for any multi-attribute product (see that
  // function's own doc comment) and depends on variant-master load timing
  // even for a single-attribute one.
  private attributeRefMapFromItems(items: any[]): Record<number, { attributeId?: number | null; attributeName?: string | null; attributeValue?: string | null }> {
    const attrMap: Record<number, { attributeId?: number | null; attributeName?: string | null; attributeValue?: string | null }> = {};
    (items || []).forEach((item: any, i: number) => {
      attrMap[i] = {
        attributeId: item?.attribute_id ?? item?.attributeId ?? null,
        attributeName: item?.attribute_name ?? item?.attributeName ?? null,
        attributeValue: item?.attribute_value ?? item?.attributeValue ?? null
      };
    });
    return attrMap;
  }

  private resolveLineAttribute(
    product: ProductItem | null | undefined,
    variantText: string | null,
    attributeText: string | null
  ): { attribute_id: number | null; attribute_name: string | null; attribute_value: string | null } {
    const val = String(attributeText || '').trim() || null;
    if (!val) return { attribute_id: null, attribute_name: null, attribute_value: null };
    const match = this.productVariantOptionObjects(product).find(v => this.productVariantOptionMatches(v, variantText || ''));
    const items = match ? this.variantAttributeItemsForTransaction(product, match.id) : [];
    if (!items.length) return { attribute_id: null, attribute_name: null, attribute_value: val };
    const parts = this.attributeTextParts(val);
    if (parts.length > 1) {
      return {
        attribute_id: null,
        attribute_name: parts.map(part => part.name).filter(Boolean).join(' | ') || 'Attributes',
        attribute_value: parts.map(part => part.name ? `${part.name}: ${part.value}` : part.value).join(' | ')
      };
    }
    const valuePart = parts[0]?.value || val;
    const namePart = parts[0]?.name || '';
    const matchedItem = items.find(item =>
      this.optionEquals(item.value, valuePart) &&
      (!namePart || this.optionEquals(item.name, namePart))
    ) ?? items.find(item => this.optionEquals(item.value, valuePart)) ?? items[0];
    const variantObj = match ? this.loadedVariantObjects().find(v => v.id === match.id) : null;
    const primary = variantObj?.attributes?.find(attr => this.optionEquals(attr.attribute_name, matchedItem.name));
    return {
      attribute_id: primary?.attribute_id ?? null,
      attribute_name: matchedItem.name || primary?.attribute_name || null,
      attribute_value: matchedItem.value || valuePart
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
        gst_rate: this.transactionLineGstPercent(row),
        gst_inclusive: this.lineGstIncluded(index),
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
      const gstRate = this.transactionLineGstPercent(row);
      const taxPayload = this.transactionLineTaxPayload(row, index, qty, rate, discPct, gstRate);
      const { uom_name, uom_id } = this.resolveLineUom(product, this.lineValue(row, ['uom']), true);
      const { variant_id, variant_name } = this.resolveLineVariant(product, variantText);
      const { attribute_id, attribute_name, attribute_value } = this.resolveLineAttribute(product, variantText, this.lineValue(row, ['attribute']));
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
        gst_inclusive: taxPayload.gst_inclusive,
        taxable_amount: taxPayload.taxable_amount,
        tax_amount: taxPayload.tax_amount,
        warehouse_name: this.lineValue(row, ['warehouse', 'location']) || defaultWarehouse || null,
        amount: taxPayload.amount
      };
    });
  }

  private purchaseGrnItems(defaultWarehouse: string): any[] {
    return this.activePurchaseLineRows().map((row, index) => {
      const productName = this.lineValue(row, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      const variantText = this.lineValue(row, ['variant']);
      const receivedQty = this.lineNumber(row, ['received']);
      // Accepted Qty only falls back to Received Qty when the cell was left blank —
      // an explicitly entered 0 (fully rejected) must not be silently overridden.
      const acceptedCellRaw = this.lineValue(row, ['accepted']).trim();
      const acceptedQty = acceptedCellRaw !== '' ? this.lineNumber(row, ['accepted']) : receivedQty;
      const rate = this.lineNumber(row, ['rate']);
      const discountPct = this.lineNumber(row, ['disc', 'discount']);
      const gstRate = this.transactionLineGstPercent(row);
      // GRN bills on what was actually kept, not what arrived (same rule
      // recalculateLineRow() applies to the visible Amount column) — GST
      // must follow Accepted Qty too, or a rejected unit still gets taxed.
      const taxPayload = this.transactionLineTaxPayload(row, index, acceptedQty, rate, discountPct, gstRate);
      const { uom_name, uom_id } = this.resolveLineUom(product, this.lineValue(row, ['uom']), true);
      const { variant_id, variant_name } = this.resolveLineVariant(product, variantText);
      // Prefer the referenced PO item's own attribute_id/attribute_value
      // (carried via lineRefItemIdMap when this row came from picking a PO
      // reference) over re-deriving it from the grid's free-text
      // "Attribute" cell — see attributeRefMapFromItems' doc comment.
      const grnRefAttr = this.lineRefItemIdMap()[index];
      const grnResolvedAttr = this.resolveLineAttribute(product, variantText, this.transactionLineAttributeText(row, index));
      const attribute_id = grnRefAttr?.attributeId !== undefined ? grnRefAttr.attributeId : grnResolvedAttr.attribute_id;
      const attribute_name = grnRefAttr?.attributeName !== undefined ? grnRefAttr.attributeName : grnResolvedAttr.attribute_name;
      const attribute_value = grnRefAttr?.attributeValue !== undefined ? grnRefAttr.attributeValue : grnResolvedAttr.attribute_value;
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
        accepted_qty: acceptedQty,
        rejected_qty: Math.max(0, receivedQty - acceptedQty),
        rate,
        discount_pct: discountPct,
        gst_rate: gstRate,
        gst_inclusive: taxPayload.gst_inclusive,
        taxable_amount: taxPayload.taxable_amount,
        tax_amount: taxPayload.tax_amount,
        batch_no: this.lineValue(row, ['batch']),
        serial_no: this.transactionLineSerialText(row, index),
        serial_numbers: this.lineSerialUnitsMap()[index] || null,
        expiry_date: this.lineValue(row, ['expiry']) || null,
        warehouse_name: this.lineValue(row, ['warehouse', 'location']) || defaultWarehouse || null,
        amount: this.lineNumber(row, ['amount']) || taxPayload.amount,
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
      // Prefer the referenced GRN item's own attribute_id/attribute_value
      // (carried via lineRefItemIdMap when this row came from picking a GRN
      // reference) over re-deriving it from the grid's free-text
      // "Attribute" cell — see attributeRefMapFromItems' doc comment.
      const piRefAttr = this.lineRefItemIdMap()[index];
      const piResolvedAttr = this.resolveLineAttribute(product, variantText, this.transactionLineAttributeText(row, index));
      const attribute_id = piRefAttr?.attributeId !== undefined ? piRefAttr.attributeId : piResolvedAttr.attribute_id;
      const attribute_name = piRefAttr?.attributeName !== undefined ? piRefAttr.attributeName : piResolvedAttr.attribute_name;
      const attribute_value = piRefAttr?.attributeValue !== undefined ? piRefAttr.attributeValue : piResolvedAttr.attribute_value;
      const acceptedRaw = this.lineValue(row, ['accepted']).trim();
      const receivedRaw = this.lineValue(row, ['received']).trim();
      const qty = acceptedRaw !== ''
        ? this.lineNumber(row, ['accepted'])
        : receivedRaw !== ''
          ? this.lineNumber(row, ['received'])
          : this.lineNumber(row, ['invoice', 'qty']);
      const rate = this.lineNumber(row, ['rate']);
      const mrp = this.lineNumber(row, ['mrp']);
      const sellingPrice = this.lineNumber(row, ['selling price']);
      const discountPct = this.lineNumber(row, ['disc', 'discount']);
      const gstRate = this.transactionLineGstPercent(row);
      const taxPayload = this.transactionLineTaxPayload(row, index, qty, rate, discountPct, gstRate);
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
        qty,
        rate,
        mrp,
        selling_price: sellingPrice || mrp,
        discount_pct: discountPct,
        gst_rate: gstRate,
        gst_inclusive: taxPayload.gst_inclusive,
        taxable_amount: taxPayload.taxable_amount,
        tax_amount: taxPayload.tax_amount,
        batch_no: this.lineValue(row, ['batch']),
        serial_no: this.transactionLineSerialText(row, index),
        serial_numbers: this.lineSerialUnitsMap()[index] || null,
        expiry_date: this.lineValue(row, ['expiry']) || null,
        amount: this.lineNumber(row, ['amount']) || taxPayload.amount,
        remarks: this.lineValue(row, ['remarks']) || null
      };
    });
  }

  private purchaseReturnItems(): any[] {
    return this.activePurchaseLineRows().map((row, index) => {
      const productName = this.lineValue(row, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      const variantText = this.lineValue(row, ['variant']);
      const { variant_id, variant_name } = this.resolveLineVariant(product, variantText);
      // Prefer the referenced PI item's own attribute_id/attribute_value
      // (carried via lineRefItemIdMap when this row came from picking a PI
      // reference) over re-deriving it from the grid's free-text "Attribute"
      // cell — see lineRefItemIdMap's doc comment for why the text
      // round-trip was silently dropping it.
      const refAttr = this.lineRefItemIdMap()[index];
      const resolvedAttr = this.resolveLineAttribute(product, variantText, this.lineValue(row, ['attribute']));
      const attribute_id = refAttr?.attributeId !== undefined ? refAttr.attributeId : resolvedAttr.attribute_id;
      const attribute_name = refAttr?.attributeName !== undefined ? refAttr.attributeName : resolvedAttr.attribute_name;
      const attribute_value = refAttr?.attributeValue !== undefined ? refAttr.attributeValue : resolvedAttr.attribute_value;
      const { uom_name, uom_id } = this.resolveLineUom(product, this.lineValue(row, ['uom']), true);
      const returnQty = this.lineNumber(row, ['return']);
      const rate = this.lineNumber(row, ['rate']);
      const gstRate = this.transactionLineGstPercent(row);
      const breakup = this.transactionLineTaxBreakup(returnQty, rate, 0, gstRate, index);
      return {
        sno: index + 1,
        product_id: product?.id ?? null,
        product_name: product?.product_name || productName,
        product_code: product?.product_code || null,
        variant_id,
        variant_name,
        attribute_id,
        attribute_name,
        attribute_value,
        uom_id,
        uom_name,
        grn_qty: this.lineNumber(row, ['invoice', 'grn']),
        return_qty: returnQty,
        rate,
        gst_rate: gstRate,
        gst_inclusive: breakup.gstIncluded,
        taxable_amount: breakup.taxableAmount,
        tax_amount: breakup.taxAmount,
        return_amount: this.lineNumber(row, ['amount']) || breakup.total,
        return_reason: this.lineValue(row, ['reason']) || null,
        serial_numbers: this.lineSerialUnitsMap()[index] || null
      };
    });
  }

  // Debit Note / Credit Note lines have no product column (['Description',
  // 'Reference', 'Amount', 'GST %', 'GST Amount', 'Total Amount']), so they
  // can't reuse activePurchaseLineRows()'s product-required filter — this
  // filters on a non-empty Description cell instead.
  private documentNoteItems(): any[] {
    this.directEntryLineRows();
    return this.entryLineRows()
      .map(row => this.normalizeLineRow(row))
      .filter(row => row.some(cell => String(cell ?? '').trim()))
      .filter(row => !!this.lineValue(row, ['description']))
      .map((row, index) => {
        const amount = this.lineNumber(row, ['amount']);
        const gstPct = this.lineNumber(row, ['gst %']);
        const gstAmountText = this.lineValue(row, ['gst amount']).trim();
        const totalAmountText = this.lineValue(row, ['total amount']).trim();
        const gstAmount = gstAmountText ? this.lineNumber(row, ['gst amount']) : (amount * gstPct / 100);
        const totalAmount = totalAmountText ? this.lineNumber(row, ['total amount']) : (amount + gstAmount);
        return {
          sno: index + 1,
          description: this.lineValue(row, ['description']),
          reference: this.lineValue(row, ['reference']) || null,
          amount,
          gst_pct: gstPct,
          gst_amount: gstAmount,
          total_amount: totalAmount
        };
      });
  }

  private deliveryChallanItems(): any[] {
    const refMap = this.lineRefItemIdMap();
    return this.activeSalesLineRows().map((row, index) => {
      const productName = this.lineValue(row, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      const variantText = this.lineValue(row, ['variant']);
      const { uom_name, uom_id } = this.resolveLineUom(product, this.lineValue(row, ['uom']), false);
      const { variant_id, variant_name } = this.resolveLineVariant(product, variantText);
      const ref = refMap[index];
      // Prefer the referenced SO item's own attribute_id/attribute_value
      // (carried via lineRefItemIdMap when this row came from picking a
      // reference) over re-deriving it from the grid's free-text
      // "Attribute" cell — see attributeRefMapFromItems' doc comment.
      const dcResolvedAttr = this.resolveLineAttribute(product, variantText, this.transactionLineAttributeText(row, index));
      const attribute_id = ref?.attributeId !== undefined ? ref.attributeId : dcResolvedAttr.attribute_id;
      const attribute_name = ref?.attributeName !== undefined ? ref.attributeName : dcResolvedAttr.attribute_name;
      const attribute_value = ref?.attributeValue !== undefined ? ref.attributeValue : dcResolvedAttr.attribute_value;
      return {
        sno: index + 1,
        so_item_id: ref?.soItemId ?? null,
        si_item_id: ref?.siItemId ?? null,
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
        so_qty: this.lineNumber(row, ['so', 'order']),
        dispatch_qty: this.lineNumber(row, ['dispatch', 'qty']),
        serial_numbers: this.lineSerialUnitsMap()[index] || null
      };
    });
  }

  private salesReturnItems(): any[] {
    return this.activeSalesLineRows().map((row, index) => {
      const productName = this.lineValue(row, ['product', 'item', 'sku']);
      const product = this.findProductBySelection(productName);
      const variantText = this.lineValue(row, ['variant']);
      const { uom_name, uom_id } = this.resolveLineUom(product, this.lineValue(row, ['uom']), false);
      const { variant_id, variant_name } = this.resolveLineVariant(product, variantText);
      // Prefer the referenced invoice item's own attribute_id/attribute_value
      // (carried via lineRefItemIdMap when this row came from picking an
      // Invoice reference) over re-deriving it from the grid's attribute
      // cell state — see lineRefItemIdMap's doc comment for why that
      // round-trip was silently dropping it.
      const refAttr = this.lineRefItemIdMap()[index];
      const resolvedAttr = this.resolveLineAttribute(product, variantText, this.transactionLineAttributeText(row, index));
      const attribute_id = refAttr?.attributeId !== undefined ? refAttr.attributeId : resolvedAttr.attribute_id;
      const attribute_name = refAttr?.attributeName !== undefined ? refAttr.attributeName : resolvedAttr.attribute_name;
      const attribute_value = refAttr?.attributeValue !== undefined ? refAttr.attributeValue : resolvedAttr.attribute_value;
      const returnQty = this.lineNumber(row, ['return']);
      const rate = this.lineNumber(row, ['rate']);
      const gstRate = this.transactionLineGstPercent(row);
      const breakup = this.transactionLineTaxBreakup(returnQty, rate, 0, gstRate, index);
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
        invoiced_qty: this.lineNumber(row, ['invoiced', 'invoice']),
        return_qty: returnQty,
        rate,
        gst_rate: gstRate,
        gst_inclusive: breakup.gstIncluded,
        taxable_amount: breakup.taxableAmount,
        tax_amount: breakup.taxAmount,
        return_amount: this.lineNumber(row, ['amount']) || breakup.total,
        batch_no: this.lineValue(row, ['batch']) || null,
        serial_no: this.lineValue(row, ['serial']) || null,
        serial_numbers: this.lineSerialUnitsMap()[index] || null,
        expiry_date: this.lineValue(row, ['expiry']) || null,
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
    if (raw === 'post' || raw === 'posted') {
      return 'posted';
    }
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
      case 'variantMaster': {
        const comboKey = (attrs: any[]) => (attrs || [])
          .map(attr => {
            const attrKey = attr.attribute_value_id
              ? `id:${attr.attribute_value_id}`
              : `${this.normalizeKey(attr.attribute_name)}=${this.normalizeKey(attr.value_name || attr.attribute_value)}`;
            return attrKey;
          })
          .sort()
          .join('|');
        const payloadProduct = this.normalizeKey(payload['product_id'] || payload['product_name']);
        const payloadCombo = comboKey(payload['attributes'] || []);
        const hasCode = String(payload['variant_code'] ?? '').trim().length > 0;
        return duplicate(r => {
          const sameNameOrCode = same(r.variant_name, payload['variant_name']) || (hasCode && same(r.variant_code, payload['variant_code']));
          const recordProduct = this.normalizeKey(r.product_id || r.product_name);
          const recordCombo = comboKey(r.attributes || []);
          const sameCombination = !!(payloadProduct && payloadCombo && payloadProduct === recordProduct && payloadCombo === recordCombo);
          return sameNameOrCode || sameCombination;
        }) ? 'Variant already exists for this product/attribute combination. Edit the existing row instead of adding duplicate.' : '';
      }
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

    if (String(payload['status'] || '').toLowerCase() === 'posted') {
      const serialMessage = this.serialCoverageValidationMessage();
      if (serialMessage) return serialMessage;
    }

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
      if (!Array.isArray(payload['attributes']) || !payload['attributes'].length) return 'Add at least one attribute value for this variant.';
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

    if (this.config?.key === 'debitNote') {
      if (!hasValue(payload['vendor_name'])) return 'Vendor is required for Debit Note.';
      if (!Array.isArray(payload['items']) || !payload['items'].length) return 'Add at least one settlement / adjustment line before saving Debit Note.';
      if (!payload['items'].some((item: any) => Number(item?.total_amount ?? item?.amount ?? 0) > 0)) return 'Debit Note needs at least one line amount.';
      return '';
    }

    if (this.config?.key === 'creditNote') {
      if (!hasValue(payload['customer_name'])) return 'Customer is required for Credit Note.';
      if (!Array.isArray(payload['items']) || !payload['items'].length) return 'Add at least one settlement / adjustment line before saving Credit Note.';
      if (!payload['items'].some((item: any) => Number(item?.total_amount ?? item?.amount ?? 0) > 0)) return 'Credit Note needs at least one line amount.';
      return '';
    }

    const salesTransactionCustomerRequiredKeys = new Set(['salesInvoice', 'salesOrder', 'salesQuotation', 'deliveryChallan', 'salesReturn']);
    if (salesTransactionCustomerRequiredKeys.has(this.config?.key || '')) {
      if (!hasValue(payload['customer_name'])) return `Customer is required for ${this.config?.title || 'this document'}.`;
    }

    if (this.config?.key === 'salesReturn') {
      const returnItemsError = this.validateSalesReturnLineItems(payload['items']);
      if (returnItemsError) return returnItemsError;
    }

    if (this.config?.key === 'salesInvoice') {
      if (!hasValue(payload['doc_number'])) return 'Invoice No. is required for Sales Invoice.';
      if (!hasValue(payload['doc_date'])) return 'Invoice Date is required for Sales Invoice.';
    }

    if (this.config?.key === 'salesInvoice' || this.config?.key === 'salesOrder') {
      const rateBoundsError = this.validateSalesRateBounds();
      if (rateBoundsError) return rateBoundsError;
    }

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
        // Branch OR warehouse — same fallback as Purchase Invoice below.
        // Companies that don't sub-divide stock by warehouse receive
        // against their branch/head office instead; the payload builder
        // already resolves the combined picker into branch_id/branch_name
        // in that case (see buildPayload()'s goodsReceipt case), so this
        // must accept either side rather than hard-requiring warehouse_name.
        if (!hasValue(payload['branch_id']) && !hasValue(payload['branch_name']) && !hasValue(payload['warehouse_id']) && !hasValue(payload['warehouse_name'])) {
          return 'Receiving Branch / Warehouse is required for GRN.';
        }
        const grnItemsError = this.validateGrnLineItems(payload['items']);
        if (grnItemsError) return grnItemsError;
      }
      if (this.config?.key === 'purchaseInvoice') {
        if (!hasValue(payload['vendor_name'])) return 'Vendor is required for Purchase Invoice.';
        if (!hasValue(payload['pi_number'])) return 'Invoice no. is required for Purchase Invoice.';
        if (!hasValue(payload['pi_date'])) return 'Invoice date is required for Purchase Invoice.';
        // Required even when the PI references a GRN — a GRN can be receipted
        // before the vendor's own invoice arrives, but the PI itself always
        // represents that vendor invoice and must record its real number/date.
        if (!hasValue(payload['vendor_invoice_no'])) return 'Vendor Invoice No. is required for Purchase Invoice.';
        if (!hasValue(payload['vendor_invoice_dt'])) return 'Vendor Invoice Date is required for Purchase Invoice.';
        if (!hasValue(payload['branch_id']) && !hasValue(payload['branch_name']) && !hasValue(payload['warehouse_id']) && !hasValue(payload['warehouse_name'])) {
          return 'Branch / Warehouse is required for Purchase Invoice.';
        }
      }
      if (this.config?.key === 'purchaseReturn') {
        if (!hasValue(payload['vendor_name'])) return 'Vendor is required for Purchase Return.';
        if (!hasValue(payload['warehouse_name'])) return 'From Warehouse is required for Purchase Return.';
        const returnItemsError = this.validatePurchaseReturnLineItems(payload['items']);
        if (returnItemsError) return returnItemsError;
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
    const stockControlMessage = this.productStockControlsValidationMessage(payload);
    if (stockControlMessage) return stockControlMessage;

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
          r.uom_symbol || '',
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
        return records.map(r => {
          const activeValues = ((r.values || []).length ? r.values : (r.possible_values || []).map((value: string) => ({ value_name: value, usage_count: 0 })))
            .filter((value: any) => this.normalizeKey(value.status || 'active') !== 'inactive');
          const values = activeValues
            .map((value: any) => {
              const usage = Number(value.usage_count || 0);
              return usage > 0 ? `${value.value_name} (${usage})` : value.value_name;
            })
            .filter(Boolean)
            .join(', ');
          const usageTotal = activeValues.reduce((sum: number, value: any) => sum + Number(value.usage_count || 0), 0);
          return [
            r.attribute_code || '',
            r.attribute_name || '',
            r.data_type || r.attribute_type || '',
            values,
            String(usageTotal),
            cap(r.status || 'active')
          ];
        });
      case 'productGroupMaster':
        return records.map(r => [r.group_code || '', r.group_name || '', r.category_name || '', r.description || '', cap(r.status || 'active')]);
      case 'variantMaster':
        return records.map(r => [
          r.variant_code || '',
          r.variant_name || '',
          (r.attributes || []).length
            ? (r.attributes || []).map((attr: any) => [attr.attribute_name, attr.value_name || attr.attribute_value].filter(Boolean).join(': ')).join(', ')
            : [r.attribute_name, r.attribute_value].filter(Boolean).join(': '),
          cap(r.status || 'active')
        ]);
      case 'serialNumberPolicy':
        return records.map(r => [r.policy_code || '', r.policy_name || '', r.category_name || '', r.serial_format || '', r.capture_stage || '', r.allow_duplicate ? 'Yes' : 'No', cap(r.status || 'active')]);
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
          r.pi_number || r.piNumber || '',
          r.pi_date || r.piDate || '',
          r.vendor_name || r.vendorName || '',
          r.warehouse_name || r.warehouseName || r.branch_name || r.branchName || this.branchNameFromRecord(r),
          r.grn_number || r.grnNumber || 'Direct',
          `Rs. ${Number(r.total_amount ?? r.totalAmount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
          r.due_date || r.dueDate || '',
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
        // Status shows the derived display_status (Draft/Posted/Partially
        // Invoiced/Closed/Cancelled) from sp_get_delivery_challans, not the
        // raw 4-value stored status.
        return records.map(r => [
          r.dc_number || '',
          r.dc_date || '',
          r.customer_name || '',
          r.vehicle || '',
          String((r.items || []).length || 0),
          r.so_number || 'Direct',
          cap(r.display_status || r.status || 'draft')
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
      case 'debitNote':
        // columns: Debit Note No, Date, Vendor, Reference, Amount, Status
        return records.map(r => [
          r.debit_note_number || '',
          r.debit_note_date || '',
          r.vendor_name || '',
          r.purchase_return_number || r.purchase_invoice_number || 'Direct',
          `Rs. ${Number(r.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
          cap(r.status || 'draft')
        ]);
      case 'creditNote':
        // columns: Credit Note No, Date, Customer, Reference, Amount, Status
        return records.map(r => [
          r.credit_note_number || '',
          r.credit_note_date || '',
          r.customer_name || '',
          r.sales_return_number || r.sales_invoice_number || 'Direct',
          `Rs. ${Number(r.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
          cap(r.status || 'draft')
        ]);
      default:
        return [];
    }
  }
}
