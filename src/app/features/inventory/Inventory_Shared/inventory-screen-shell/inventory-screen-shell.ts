import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, concatMap, debounceTime, distinctUntilChanged, from, map, of, switchMap } from 'rxjs';
import { ReferenceDataBindEvent } from '../../../../shared/reference-data-tray/reference-data-tray.models';
import { ReferenceDataTrayService } from '../../../../shared/reference-data-tray/reference-data-tray.service';
import { ApiResponse, CategoryItem, GstRateGuide, InventoryConfigService, TaxCodeSuggestion } from '../inventory-config.service';
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

interface GlobalContactOption {
  name: string;
  type: 'Company' | 'Individual';
  mobile: string;
  email: string;
  gstin: string;
  pan: string;
  address: string;
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
  private readonly inventoryConfigService = inject(InventoryConfigService);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeAddMaster = signal('');
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

  readonly quickAddName = signal('');
  readonly quickAddCode = signal('');
  readonly isSavingQuickAdd = signal(false);
  readonly quickAddError = signal('');
  readonly addMasterSourceFieldKey = signal<string | null>(null);

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
  private readonly serialPolicyOptionList = signal<string[]>([]);
  private readonly batchPolicyOptionList = signal<string[]>([]);
  private readonly loadedCategoryObjects = signal<CategoryItem[]>([]);
  readonly statusOptions = INVENTORY_OPTIONS.status;
  readonly locationOptions = INVENTORY_OPTIONS.locations;
  readonly contactOptions = INVENTORY_OPTIONS.contactPersons;
  readonly productTypeOptions = INVENTORY_OPTIONS.productTypes;
  readonly valuationMethods = INVENTORY_OPTIONS.valuationMethods;
  readonly hsnSourceOptions = ['Government API', 'Ready API', 'Manual Entry'];
  readonly partyTypeOptions = ['Company', 'Individual'];

  get segmentOptions(): string[] { return this.segmentOptionList(); }
  get segmentCount(): number { return this.segmentOptions.length; }
  get categoryOptions(): string[] { return this.categoryOptionList(); }
  get uomOptions(): string[] { return this.uomOptionList(); }
  get hsnSacOptions(): string[] { return this.hsnSacOptionList(); }
  get brandOptions(): string[] { return this.brandOptionList(); }
  get attributeOptions(): string[] { return this.attributeOptionList(); }
  get variantOptions(): string[] { return this.variantOptionList(); }
  get productOptions(): string[] { return this.productOptionList(); }
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
      this.queueTaxCodeSearch(true);
    }

    if (this.config?.lineColumns?.length) {
      this.directEntryLineRows();
    }
    if (this.isApiWired()) {
      this.loadApiRecords();
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

    // "Add" in the form — push to pending grid
    if (text === 'Add' || text === 'Add to List') {
      const isFormAction = !!button.closest('.inventory-form-actions') && !button.closest('.inventory-final-actions');
      if (isFormAction) {
        event.preventDefault();
        this.addToPendingRows();
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

  readonly partySummaryData = computed(() => {
    const name = this.selectedPartyName();
    if (!name) return null;
    return {
      name,
      creditLimit: '5,00,000',
      creditUsed: '2,18,400',
      creditAvailable: '2,81,600',
      overdueAmount: '34,200',
      lastTransactionDate: '08-May-2026',
      lastTransactionAmount: '1,12,800',
      recentTransactions: [
        { ref: 'GRN-1042', date: '08-May-2026', amount: '1,12,800', status: 'Posted' },
        { ref: 'GRN-1039', date: '03-May-2026', amount: '67,500', status: 'Posted' },
        { ref: 'PO-2218', date: '28-Apr-2026', amount: '38,100', status: 'Approved' }
      ]
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
    this.productName.set(value ?? '');
    this.queueTaxCodeSearch(false);
  }

  onProductCategoryChange(value: string | null): void {
    this.selectedProductCategory.set(value || '');
    this.queueTaxCodeSearch(true);

    if (value) {
      const cat = this.loadedCategoryObjects().find(c => c.category_name === value);
      if (cat) {
        if (cat.serial_applicable) {
          this.productSerialApplicable.set(true);
          if (cat.serial_policy_name) this.collectFormField('serialPolicyName', cat.serial_policy_name);
        }
        if (cat.batch_applicable) {
          this.productBatchApplicable.set(true);
          if (cat.batch_policy_name) this.collectFormField('batchPolicyName', cat.batch_policy_name);
        }
      }
    }
  }

  onTaxCodeManualSearch(value: string): void {
    this.hsnSacCode.set(value ?? '');
    this.queueTaxCodeSearch(false);
  }

  onTaxDescriptionChange(value: string): void {
    this.hsnSacDescription.set(value ?? '');
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
          const names = savedSegments.map(item => item.segment_name).filter(Boolean) as string[];
          this.segmentOptionList.set(names);
          this.segmentCardList.set(savedSegments.map(item => ({
            name: item.segment_name,
            behavior: item.usage_note || 'Configured inventory segment',
            stock: String((item.categories?.length || 0) + (item.uoms?.length || 0)) + ' mappings',
            availability: item.status === 'active' ? 'Active' : 'Inactive'
          })));
          const segmentCategories = savedSegments.flatMap(item => item.categories?.map(c => c.category_name) || []).filter(Boolean) as string[];
          const segmentUoms = savedSegments.flatMap(item => item.uoms?.map(u => u.uom_symbol || u.uom_name || u.uom_code) || []).filter(Boolean) as string[];
          const segmentHsn = savedSegments.flatMap(item => item.hsn_sac_codes?.map(h => h.code) || []).filter(Boolean) as string[];
          if (segmentCategories.length) this.categoryOptionList.set(segmentCategories);
          if (segmentUoms.length) this.uomOptionList.set(segmentUoms);
          if (segmentHsn.length) this.hsnSacOptionList.set(segmentHsn);
          if (!this.selectedSegment() && names.length) {
            this.selectedSegment.set(names[0]);
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
          if (names.length) this.categoryOptionList.set(names);
          this.loadedCategoryObjects.set(cats);
        },
        error: () => {}
      });

    this.inventoryConfigService.getUoms(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const names = (res.data ?? []).map(item => item.uom_symbol || item.uom_name || item.uom_code).filter(Boolean) as string[];
          if (names.length) this.uomOptionList.set(names);
        },
        error: () => {}
      });

    this.inventoryConfigService.getHsnSac(undefined, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const codes = (res.data ?? []).map(item => item.code).filter(Boolean) as string[];
          if (codes.length) this.hsnSacOptionList.set(codes);
        },
        error: () => {}
      });

    this.inventoryConfigService.getBrands(null, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const names = (res.data ?? []).map(item => item.brand_name).filter(Boolean) as string[];
          if (names.length) this.brandOptionList.set(names);
        },
        error: () => {}
      });

    this.inventoryConfigService.getAttributes(null, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const names = (res.data ?? []).map(item => item.attribute_name).filter(Boolean) as string[];
          if (names.length) this.attributeOptionList.set(names);
        },
        error: () => {}
      });

    this.inventoryConfigService.getVariants(null, null, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const names = (res.data ?? []).map(item => item.variant_name).filter(Boolean) as string[];
          if (names.length) this.variantOptionList.set(names);
        },
        error: () => {}
      });

    this.inventoryConfigService.getSerialPolicies(null, null, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const names = (res.data ?? []).map(item => item.policy_name).filter(Boolean) as string[];
          if (names.length) this.serialPolicyOptionList.set(names);
        },
        error: () => {}
      });

    this.inventoryConfigService.getBatchPolicies(null, null, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const names = (res.data ?? []).map(item => item.policy_name).filter(Boolean) as string[];
          if (names.length) this.batchPolicyOptionList.set(names);
        },
        error: () => {}
      });

    this.inventoryConfigService.getProducts(null, null, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const names = (res.data ?? []).map(item => item.product_name).filter(Boolean) as string[];
          if (names.length) this.productOptionList.set(names);
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
        return ['Search or enter HSN/SAC code.', 'Maintain GST, CGST, SGST, IGST and cess details.', 'Product and invoice screens use this mapping for tax calculation and compliance reporting.'];
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

  openAddMaster(master: string, sourceFieldKey?: string): void {
    this.activeAddMaster.set(master);
    this.addMasterSourceFieldKey.set(sourceFieldKey ?? null);
    this.quickAddName.set('');
    this.quickAddCode.set('');
    this.quickAddError.set('');
  }

  onQuickAddNameChange(name: string): void {
    this.quickAddName.set(name);
    this.quickAddCode.set(this.generateCodeFromName(name));
  }

  saveQuickCategory(): void {
    const name = this.quickAddName().trim();
    if (!name) { this.quickAddError.set('Category name is required.'); return; }
    if (this.isSavingQuickAdd()) return;

    const code = this.quickAddCode().trim() || this.generateCodeFromName(name);
    this.isSavingQuickAdd.set(true);
    this.quickAddError.set('');

    const v = this.formValues();
    const catPayload: Record<string, any> = {
      category_code: code,
      category_name: name,
      description: v['description'] || '',
      serial_applicable: this.categorySerialApplicable(),
      serial_policy_name: v['serialPolicyName'] || null,
      batch_applicable: this.categoryBatchApplicable(),
      batch_policy_name: v['batchPolicyName'] || null,
      status: 'active'
    };
    this.inventoryConfigService.saveCategory(catPayload, null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiResponse<any>) => {
          this.isSavingQuickAdd.set(false);
          if (res.success) {
            if (!this.categoryOptionList().includes(name)) {
              this.categoryOptionList.update(opts => [...opts, name]);
            }
            const sourceKey = this.addMasterSourceFieldKey();
            if (sourceKey) this.collectFormField(sourceKey, name);
            if (this.config?.key === 'productServiceMaster') {
              this.selectedProductCategory.set(name);
              this.queueTaxCodeSearch(true);
            }
            this.closeAddMaster();
            this.loadLookupOptions();
          } else {
            this.quickAddError.set(res.message || 'Failed to save category.');
          }
        },
        error: (err: any) => {
          this.isSavingQuickAdd.set(false);
          this.quickAddError.set(err?.error?.message || 'Failed to save category.');
        }
      });
  }

  changeSegment(segment: string): void {
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
    this.uomConversionRequired.set(required);
  }

  setProductBatchApplicable(required: boolean): void {
    this.productBatchApplicable.set(required);
  }

  setProductSerialApplicable(required: boolean): void {
    this.productSerialApplicable.set(required);
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

  setProductStockControlsRequired(required: boolean): void {
    this.productStockControlsRequired.set(required);
  }

  setProductTrackingRequired(required: boolean): void {
    this.productTrackingRequired.set(required);
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
    return fields.map(field => ({ ...field, options: this.runtimeOptions(field) }));
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
      return this.productOptions;
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

    return field.options;
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
    return this.isPosView() && this.config.posMode === 'switch'
      ? [
          ['LED Display', '8528', 'Nos', '1', '24,500', '18', '28,910'],
          ['Cable Roll', '8528', 'Roll', '2', '1,850', '18', '4,366']
        ]
      : (this.config.lineRows || []);
  }

  directEntryLineRows(): string[][] {
    const key = this.config?.key || '';
    if (this.entryLineRowsKey() !== key) {
      const rows = this.lineRows();
      this.entryLineRowsKey.set(key);
      this.entryLineRows.set(rows.length ? rows.map(row => this.normalizeLineRow(row)) : [this.blankLineRow()]);
    }

    return this.entryLineRows();
  }

  addEntryLineRow(): void {
    this.directEntryLineRows();
    this.entryLineRows.update(rows => [...rows, this.blankLineRow()]);
  }

  removeEntryLineRow(rowIndex: number): void {
    this.directEntryLineRows();
    this.entryLineRows.update(rows => {
      const nextRows = rows.filter((_, index) => index !== rowIndex);
      return nextRows.length ? nextRows : [this.blankLineRow()];
    });
  }

  setEntryLineCell(rowIndex: number, columnIndex: number, value: string): void {
    this.directEntryLineRows();
    this.entryLineRows.update(rows => rows.map((row, index) => {
      if (index !== rowIndex) return row;
      const nextRow = this.normalizeLineRow(row);
      nextRow[columnIndex] = value;
      this.recalculateLineRow(nextRow);
      return nextRow;
    }));
  }

  clearEntryLineRow(rowIndex: number): void {
    this.directEntryLineRows();
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

  scannerStatusMessage(): string {
    return this.scannerMessage();
  }

  lineColumnOptions(column: string): string[] {
    const key = column.toLowerCase();
    if (key.includes('item') || key.includes('product') || key.includes('sku')) return this.productOptions;
    if (key.includes('uom')) return this.uomOptions;
    if (key.includes('gst') || key.includes('tax')) return ['0%', '5%', '12%', '18%', '28%'];
    if (key.includes('batch')) return ['NA', 'LOT-FOOD-001', 'LOT-DRN-001', 'LOT-CBL-011'];
    if (key.includes('serial')) return ['NA', 'SN-1042..46', 'IMEI Required', 'Auto Capture'];
    if (key.includes('warehouse') || key.includes('location') || key.includes('store')) return this.locationOptions;
    if (key.includes('expiry')) return ['NA', '18-Jun-2026', '18-Aug-2026', '30-Sep-2026'];
    return [];
  }

  lineCellInputType(column: string): 'number' | 'text' {
    const key = column.toLowerCase();
    return key.includes('qty') || key.includes('disc') || key.includes('rate') || key.includes('amount') || key.includes('tax') || key.includes('gst')
      ? 'number'
      : 'text';
  }

  private normalizeLineRow(row: string[]): string[] {
    const columnCount = this.config?.lineColumns?.length || row.length;
    return Array.from({ length: columnCount }, (_, index) => row[index] || '');
  }

  private blankLineRow(): string[] {
    return (this.config?.lineColumns || []).map(column => {
      const options = this.lineColumnOptions(column);
      const key = column.toLowerCase();
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

  private scannerCatalog() {
    return [
      { codes: ['ELE1001', '8901001001', 'LED Display'], item: 'LED Display', uom: 'Nos', rate: 24500, gst: 18, batch: 'NA', serial: 'Auto Capture', expiry: 'NA', warehouse: 'HYD Main WH' },
      { codes: ['AGRO7781', '8902007781', 'Agro Seed'], item: 'Agro Seed', uom: 'Bag', rate: 4200, gst: 5, batch: 'LOT-7781', serial: 'NA', expiry: '18-Jun-2026', warehouse: 'BLR Store' },
      { codes: ['DRN4400', '8903004400', 'Drone Motor'], item: 'Drone Motor', uom: 'Set', rate: 8500, gst: 18, batch: 'LOT-DRN-001', serial: 'Auto Capture', expiry: 'NA', warehouse: 'Manufacturing Store' },
      { codes: ['FOD1001', '8904001001', 'Basmati Rice'], item: 'Basmati Rice', uom: 'KG', rate: 92, gst: 5, batch: 'LOT-FOOD-001', serial: 'NA', expiry: '18-Aug-2026', warehouse: 'Main Kitchen Store' },
      { codes: ['SRV2090', '9983132090', 'AMC Support'], item: 'AMC Support', uom: 'Month', rate: 12000, gst: 18, batch: 'NA', serial: 'NA', expiry: 'NA', warehouse: 'Co-work Floor 2' }
    ];
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

  closeAddMaster(): void {
    this.activeAddMaster.set('');
  }

  clearConfigForm(): void {
    this.formValues.set({});
    this.editingId.set(null);
    this.fieldDefaultValues.clear();
    this.saveError.set('');
    this.categorySerialApplicable.set(false);
    this.categoryBatchApplicable.set(false);

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
  }

  // ── API wiring ────────────────────────────────────────────────────────────

  isApiWired(): boolean {
    const key = this.config?.key;
    return key === 'businessSegments' || key === 'branchMaster'
      || key === 'warehouseMaster' || key === 'uomMaster' || key === 'categoryMaster'
      || key === 'hsnSacMapping'
      || key === 'paymentTermsMaster' || key === 'brandMaster' || key === 'attributeMaster'
      || key === 'productGroupMaster' || key === 'variantMaster' || key === 'serialNumberPolicy'
      || key === 'batchLotPolicy' || key === 'barcodeConfiguration' || key === 'substituteProducts'
      || key === 'consumptionTypeMaster'
      || key === 'vendorMaster' || key === 'customerMaster' || key === 'productServiceMaster';
  }

  collectFormField(key: string, value: any): void {
    this.formValues.update(v => ({ ...v, [key]: value }));
  }

  formFieldValue(field: InventoryField): any {
    const live = this.formValues()[field.key];
    return live !== undefined ? live : this.defaultFieldValue(field);
  }

  liveRows(): string[][] {
    return this.isApiWired() ? this.mapToGridRows(this.savedRecordObjects()) : (this.config?.rows || []);
  }

  loadApiRecords(): void {
    let obs$: Observable<ApiResponse<any[]>>;
    const key = this.config?.key;
    switch (key) {
      case 'businessSegments':     obs$ = this.inventoryConfigService.getSegments(true);            break;
      case 'branchMaster':         obs$ = this.inventoryConfigService.getBranchesInv(true);         break;
      case 'warehouseMaster':      obs$ = this.inventoryConfigService.getWarehouses(true);          break;
      case 'uomMaster':            obs$ = this.inventoryConfigService.getUoms(true);                break;
      case 'categoryMaster':       obs$ = this.inventoryConfigService.getCategories(true);          break;
      case 'hsnSacMapping':        obs$ = this.inventoryConfigService.getHsnSac(undefined, true);   break;
      case 'paymentTermsMaster':   obs$ = this.inventoryConfigService.getPaymentTerms(true);        break;
      case 'brandMaster':          obs$ = this.inventoryConfigService.getBrands(null, true);        break;
      case 'attributeMaster':      obs$ = this.inventoryConfigService.getAttributes(null, true);    break;
      case 'productGroupMaster':   obs$ = this.inventoryConfigService.getProductGroups(null, null, true); break;
      case 'variantMaster':        obs$ = this.inventoryConfigService.getVariants(null, null, true);     break;
      case 'serialNumberPolicy':   obs$ = this.inventoryConfigService.getSerialPolicies(null, null, true); break;
      case 'batchLotPolicy':       obs$ = this.inventoryConfigService.getBatchPolicies(null, null, true);  break;
      case 'barcodeConfiguration':  obs$ = this.inventoryConfigService.getBarcodeConfigurations(true);     break;
      case 'substituteProducts':    obs$ = this.inventoryConfigService.getSubstituteProducts(true);        break;
      case 'consumptionTypeMaster': obs$ = this.inventoryConfigService.getConsumptionTypes(null, true);   break;
      case 'vendorMaster':         obs$ = this.inventoryConfigService.getVendors(null, true);       break;
      case 'customerMaster':       obs$ = this.inventoryConfigService.getCustomers(null, true);     break;
      case 'productServiceMaster': obs$ = this.inventoryConfigService.getProducts(null, null, true);      break;
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
      case 'vendorMaster':          obs$ = this.inventoryConfigService.saveVendor(payload, id);           break;
      case 'customerMaster':        obs$ = this.inventoryConfigService.saveCustomer(payload, id);         break;
      case 'productServiceMaster':  obs$ = this.inventoryConfigService.saveProduct(payload, id);          break;
      default: this.isSaving.set(false); return;
    }
    obs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<any>) => {
        this.isSaving.set(false);
        if (res.success) {
          this.saveMsg.set(id ? 'Record updated.' : 'Record saved.');
          this.clearConfigForm();
          this.loadApiRecords();
          this.loadLookupOptions();
          setTimeout(() => this.saveMsg.set(''), 3000);
        } else {
          this.saveError.set(res.message || 'Save failed.');
        }
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.saveError.set(err?.error?.message || err?.message || 'Server error. Check connection and try again.');
      }
    });
  }

  // ── Pending grid (temp entries before batch save) ────────────────────────

  generateCodeFromName(name: string): string {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    const prefix = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
    if (!prefix) return '';
    const existingCount = this.savedRecordObjects().length + this.pendingRows().length;
    return `${prefix}-${String(existingCount + 1).padStart(3, '0')}`;
  }

  maybeAutoCode(fieldKey: string, value: string): void {
    if (!value || this.editingId() !== null || this.editingPendingIndex() !== null) return;
    let codeKey: string | null = null;
    if (fieldKey.endsWith('Name')) {
      codeKey = fieldKey.replace(/Name$/, 'Code');
    } else if (fieldKey === 'consumptionType') {
      codeKey = 'typeCode';
    }
    if (!codeKey) return;
    const fields = this.config?.fields || [];
    if (!fields.some(f => f.key === codeKey)) return;
    const current = this.formValues()[codeKey!];
    if (current && String(current).trim()) return;
    this.collectFormField(codeKey!, this.generateCodeFromName(value));
  }

  addToPendingRows(): void {
    const payload = this.buildPayload();
    const msg = this.validatePayload(payload);
    if (msg) { this.saveError.set(msg); return; }

    const display = this.mapToGridRows([payload])[0] || [];
    const formSnapshot = { ...this.formValues() };
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
      concatMap(row => saveOne(row.payload).pipe(catchError(err => of({ success: false, message: err?.error?.message || 'Save failed', data: null })))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (res: ApiResponse<any>) => {
        if (!res.success) {
          this.saveError.update(e => e ? e : (res.message || 'One or more records failed to save.'));
        }
      },
      error: (err: any) => {
        this.isBatchSaving.set(false);
        this.saveError.set(err?.error?.message || 'Batch save failed.');
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
    const records = this.savedRecordObjects();
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
      case 'vendorMaster':       record = records.find(r => r.vendor_code === row[0]);     break;
      case 'customerMaster':     record = records.find(r => r.customer_code === row[0]);   break;
      case 'productServiceMaster': record = records.find(r => r.product_code === row[0]); break;
    }
    if (!record) return;
    this.editingId.set(record.id ?? null);
    switch (this.config?.key) {
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
        this.formValues.set({ uomCode: record.uom_code || '', uomName: record.uom_name || '', status: cap(record.status || 'active') });
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
          gstRate: record.gst_rate ?? 0,
          cgstRate: record.cgst_rate ?? 0,
          sgstRate: record.sgst_rate ?? 0,
          igstRate: record.igst_rate ?? 0,
          cessRate: record.cess_rate ?? 0,
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
        this.formValues.set({ attributeName: record.attribute_name || '', attributeType: record.attribute_type || 'Text', possibleValues: (record.possible_values || []).join(', '), mandatoryFlag: record.is_mandatory ? 'Yes' : 'No', status: cap(record.status || 'active') });
        break;
      case 'productGroupMaster':
        this.formValues.set({ groupCode: record.group_code || '', groupName: record.group_name || '', linkedCategory: record.category_name || '', description: record.description || '', status: cap(record.status || 'active') });
        break;
      case 'variantMaster':
        this.formValues.set({ variantCode: record.variant_code || '', variantName: record.variant_name || '', attributeName: record.attribute_name || '', attributeValue: record.attribute_value || '', description: record.description || '' });
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
      case 'vendorMaster':
        this.formValues.set({ name: record.vendor_name || '', code: record.vendor_code || '', segment: record.segment_name || '', type: record.vendor_type || 'Company', vendorCategory: record.vendor_category || '', gstin: record.gstin || '', pan: record.pan || '', mobile: record.mobile || '', email: record.email || '', address: record.address || '', creditLimit: record.credit_limit ?? 0, status: cap(record.status || 'active') });
        break;
      case 'customerMaster':
        this.formValues.set({ name: record.customer_name || '', code: record.customer_code || '', segment: record.segment_name || '', type: record.customer_type || 'Company', customerCategory: record.customer_category || '', gstin: record.gstin || '', pan: record.pan || '', mobile: record.mobile || '', email: record.email || '', address: record.address || '', creditLimit: record.credit_limit ?? 0, status: cap(record.status || 'active') });
        break;
      case 'productServiceMaster':
        this.productName.set(record.product_name || '');
        this.selectedProductCategory.set(record.category_name || '');
        this.hsnSacCode.set(record.hsn_sac_code || '');
        this.gstRate.set(record.gst_rate ?? null);
        this.productBatchApplicable.set(!!record.batch_applicable);
        this.productSerialApplicable.set(!!record.serial_applicable);
        this.productExpiryApplicable.set(!!record.expiry_applicable);
        this.productQcRequired.set(!!record.qc_required);
        this.formValues.set({
          productCode: record.product_code || '',
          sku: record.sku || '',
          productType: record.product_type === 'Service' ? 'Service' : 'Physical Stock',
          baseUom: record.base_uom_symbol || record.base_uom_name || '',
          brand: record.brand_name || '',
          variant: record.variant_name || '',
          valuationMethod: record.valuation_method || 'FIFO',
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
        break;
    }
  }

  protected buildPayload(): Record<string, any> {
    const v = this.formValues();
    const lc = (s: string) => (s || 'Active').toLowerCase();
    const bool = (s: any) => s === true || s === 'Yes';
    const productType = (s: any) => {
      const raw = String(s || 'Product').trim();
      if (raw === 'Product' || raw === 'Service' || raw === 'Both') return raw;
      return raw.toLowerCase().includes('service') ? 'Service' : 'Product';
    };
    const captureStage = (s: any) => {
      const raw = String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      return raw.includes('both') ? 'both' : raw || null;
    };
    switch (this.config?.key) {
      case 'businessSegments':
        return {
          segment_name: v['segmentName'] || '',
          category_names: Array.isArray(v['category']) ? v['category'] : [],
          hsn_sac_codes: Array.isArray(v['relatedHsnSac']) ? v['relatedHsnSac'] : [],
          uom_names: Array.isArray(v['typicalUoms']) ? v['typicalUoms'] : [],
          usage_note: v['usageNote'] || null,
          status: lc(v['status'] || 'active')
        };
      case 'branchMaster':
        return {
          branch_code: v['branchCode'] || null,
          branch_name: v['branchName'] || '',
          segment_name: v['segment'] || null,
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
        return { warehouse_code: v['locationCode'] || '', warehouse_name: v['locationName'] || '', address: v['locationAddress'] || '', status: lc(v['status']) };
      case 'uomMaster':
        return { uom_code: v['uomCode'] || '', uom_name: v['uomName'] || '', status: lc(v['status']) };
      case 'categoryMaster':
        return {
          category_code: v['categoryCode'] || '',
          category_name: v['categoryName'] || '',
          description: v['description'] || '',
          serial_applicable: this.categorySerialApplicable(),
          serial_policy_name: v['serialPolicyName'] || null,
          batch_applicable: this.categoryBatchApplicable(),
          batch_policy_name: v['batchPolicyName'] || null,
          status: lc(v['status'])
        };
      case 'hsnSacMapping': {
        const code = String(v['code'] || this.hsnSacCode()).trim();
        const gstRate = this.gstRate() ?? (v['gstRate'] !== undefined && v['gstRate'] !== '' ? Number(v['gstRate']) : 0);
        return {
          code,
          description: v['description'] || this.hsnSacDescription() || null,
          hsn_type: v['hsnType'] || (code.length > 4 ? 'SAC' : 'HSN'),
          gst_rate: gstRate,
          cgst_rate: v['cgstRate'] !== undefined && v['cgstRate'] !== '' ? Number(v['cgstRate']) : gstRate / 2,
          sgst_rate: v['sgstRate'] !== undefined && v['sgstRate'] !== '' ? Number(v['sgstRate']) : gstRate / 2,
          igst_rate: v['igstRate'] !== undefined && v['igstRate'] !== '' ? Number(v['igstRate']) : gstRate,
          cess_rate: Number(v['cessRate']) || 0,
          status: lc(v['status'])
        };
      }
      case 'paymentTermsMaster':
        return { term_code: v['termCode'] || null, term_name: v['termName'] || '', credit_days: Number(v['creditDays']) || 0, discount_pct: Number(v['discountPercent']) || 0, description: v['description'] || '', status: lc(v['status']) };
      case 'brandMaster':
        return { brand_code: v['brandCode'] || null, brand_name: v['brandName'] || '', category_name: v['categoryName'] || null, manufacturer: v['manufacturer'] || null, description: v['description'] || null, status: lc(v['status']) };
      case 'attributeMaster': {
        const rawValues = String(v['possibleValues'] || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        return { attribute_name: v['attributeName'] || '', category_name: v['categoryName'] || null, attribute_type: v['attributeType'] || 'Text', possible_values: rawValues.length ? rawValues : null, is_mandatory: bool(v['mandatoryFlag']), status: lc(v['status']) };
      }
      case 'productGroupMaster':
        return { group_code: v['groupCode'] || null, group_name: v['groupName'] || '', category_name: v['linkedCategory'] || null, description: v['description'] || null, status: lc(v['status']) };
      case 'variantMaster':
        return { variant_code: v['variantCode'] || null, variant_name: v['variantName'] || '', category_name: v['categoryName'] || null, attribute_name: v['attributeName'] || null, attribute_value: v['attributeValue'] || null, description: v['description'] || null, status: 'active' };
      case 'serialNumberPolicy':
        return { policy_code: v['policyCode'] || null, policy_name: v['policyName'] || '', category_name: v['applicableCategory'] || null, serial_format: v['serialFormat'] || null, capture_stage: captureStage(v['captureStage']), status: lc(v['status']) };
      case 'batchLotPolicy':
        return { policy_code: v['policyCode'] || null, policy_name: v['policyName'] || '', category_name: v['applicableCategory'] || v['applicableFor'] || null, batch_format: v['batchFormat'] || null, expiry_required: bool(v['expiryRequired']), qc_required: bool(v['qcRequired']), status: lc(v['status']) };
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
        return { type_code: v['typeCode'] || null, type_name: v['typeName'] || v['consumptionType'] || '', department: v['department'] || null, approval_required: bool(v['approvalRequired']), remarks: v['remarks'] || null, status: lc(v['status']) };
      case 'vendorMaster':
        return { vendor_code: v['code'] || v['vendorCode'] || null, vendor_name: v['name'] || v['vendorName'] || '', vendor_type: v['type'] || v['vendorType'] || 'Company', segment_name: v['segment'] || null, vendor_category: v['vendorCategory'] || null, gstin: v['gstin'] || null, pan: v['pan'] || null, mobile: v['mobile'] || null, email: v['email'] || null, address: v['address'] || null, credit_limit: Number(v['creditLimit']) || 0, status: lc(v['status']) };
      case 'customerMaster':
        return { customer_code: v['code'] || v['customerCode'] || null, customer_name: v['name'] || v['customerName'] || '', customer_type: v['type'] || v['customerType'] || 'Company', segment_name: v['segment'] || null, customer_category: v['customerCategory'] || null, gstin: v['gstin'] || null, pan: v['pan'] || null, mobile: v['mobile'] || null, email: v['email'] || null, address: v['address'] || null, credit_limit: Number(v['creditLimit']) || 0, status: lc(v['status']) };
      case 'productServiceMaster':
        return {
          segment_name: this.selectedSegment() || v['segment'] || null,
          product_code: v['productCode'] || null,
          product_name: this.productName().trim() || v['name'] || v['productName'] || '',
          sku: v['sku'] || null,
          product_type: productType(v['productType']),
          item_status: lc(v['status'] || 'active'),
          status: lc(v['status'] || 'active'),
          category_name: this.selectedProductCategory() || v['category'] || v['categoryName'] || null,
          base_uom_name: v['baseUom'] || null,
          brand_name: v['brand'] || v['brandName'] || null,
          variant_name: v['variant'] || null,
          hsn_sac_code: this.hsnSacCode().trim() || v['hsnSac'] || v['hsnSacCode'] || null,
          gst_rate: this.gstRate() ?? (v['gstRate'] !== undefined && v['gstRate'] !== '' ? Number(v['gstRate']) : null),
          tax_category: v['taxCategory'] || (this.gstRate() !== null ? `GST ${this.gstRate()}%` : null),
          valuation_method: v['valuationMethod'] || 'FIFO',
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
          description: v['description'] || null
        };
      default:
        return v;
    }
  }

  protected validatePayload(payload: Record<string, any>): string {
    const hasValue = (value: any) => String(value ?? '').trim().length > 0;

    if (this.config?.key === 'businessSegments') {
      if (!hasValue(payload['segment_name'])) return 'Business Segment name is required.';
    }

    if (this.config?.key === 'branchMaster') {
      if (!hasValue(payload['branch_name'])) return 'Branch name is required.';
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

    if (this.config?.key === 'substituteProducts') {
      if (!hasValue(payload['product_name'])) return 'Product is required.';
      if (!hasValue(payload['substitute_product_name'])) return 'Substitute Product is required.';
      if (String(payload['product_name']).trim().toLowerCase() === String(payload['substitute_product_name']).trim().toLowerCase()) {
        return 'Product and Substitute Product cannot be same.';
      }
    }

    if (this.config?.key !== 'productServiceMaster') {
      return '';
    }

    if (!hasValue(payload['product_name'])) return 'Product / Service Name is required.';
    if (!hasValue(payload['category_name']) && !hasValue(payload['category_id'])) return 'Product Category is mandatory.';
    if (!hasValue(payload['base_uom_name']) && !hasValue(payload['base_uom_id'])) return 'Base UOM is mandatory.';
    if (!hasValue(payload['hsn_sac_code']) && !hasValue(payload['hsn_sac_id'])) return 'HSN/SAC tax classification is mandatory.';
    if (payload['batch_applicable'] && !hasValue(payload['batch_policy_name'])) return 'Select Batch / Lot Policy or turn off Batch Applicable.';
    if (payload['serial_applicable'] && !hasValue(payload['serial_policy_name'])) return 'Select Serial Number Policy or turn off Serial Number Applicable.';

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
        return records.map(r => [r.uom_code || '', r.uom_name || '', 'No', 'No', 'No', cap(r.status || 'active')]);
      case 'categoryMaster':
        return records.map(r => [r.category_code || '', r.category_name || '', '', 'No', 'No', r.description || '', cap(r.status || 'active')]);
      case 'hsnSacMapping':
        return records.map(r => [r.code || '', r.description || '', String(r.gst_rate ?? ''), String(r.cgst_rate ?? ''), String(r.sgst_rate ?? ''), String(r.igst_rate ?? ''), String(r.cess_rate ?? ''), '', cap(r.status || 'active')]);
      case 'paymentTermsMaster':
        return records.map(r => [r.term_name || '', r.term_code || '', String(r.credit_days ?? 0), String(r.discount_pct ?? 0), r.description || '', cap(r.status || 'active')]);
      case 'brandMaster':
        return records.map(r => [r.brand_code || '', r.brand_name || '', r.manufacturer || '', '', r.description || '', cap(r.status || 'active')]);
      case 'attributeMaster':
        return records.map(r => [r.attribute_name || '', r.attribute_type || '', (r.possible_values || []).join(', '), r.is_mandatory ? 'Yes' : 'No', cap(r.status || 'active')]);
      case 'productGroupMaster':
        return records.map(r => [r.group_code || '', r.group_name || '', r.category_name || '', r.description || '', cap(r.status || 'active')]);
      case 'variantMaster':
        return records.map(r => [r.variant_code || '', r.variant_name || '', r.attribute_name || '', r.attribute_value || '', r.description || '']);
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
      case 'vendorMaster':
        return records.map(r => [r.vendor_code || '', r.vendor_name || '', r.vendor_type || '', r.segment_name || '', r.gstin || '', cap(r.status || 'active')]);
      case 'customerMaster':
        return records.map(r => [r.customer_code || '', r.customer_name || '', r.customer_type || '', r.segment_name || '', r.gstin || '', cap(r.status || 'active')]);
      case 'productServiceMaster':
        return records.map(r => [r.product_code || '', r.sku || '', r.product_name || '', r.category_name || '', r.base_uom_symbol || r.base_uom_name || '', r.valuation_method || '', r.hsn_sac_code || '', String(r.gst_rate ?? ''), cap(r.item_status || 'active')]);
      default:
        return [];
    }
  }
}
