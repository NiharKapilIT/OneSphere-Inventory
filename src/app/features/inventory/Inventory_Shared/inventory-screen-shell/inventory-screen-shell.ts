import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReferenceDataBindEvent } from '../../../../shared/reference-data-tray/reference-data-tray.models';
import { ReferenceDataTrayService } from '../../../../shared/reference-data-tray/reference-data-tray.service';
import {
  INVENTORY_KPIS,
  INVENTORY_OPTIONS,
  INVENTORY_SEGMENT_DASHBOARDS,
  INVENTORY_SEGMENTS,
  INVENTORY_UOM_CONVERSIONS,
  InventoryField,
  InventoryScreenConfig
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
  readonly selectedSegment = signal('Electronics');
  readonly kpis = INVENTORY_KPIS;
  readonly segments = INVENTORY_SEGMENTS;
  readonly uomConversions = INVENTORY_UOM_CONVERSIONS;
  readonly segmentOptions = INVENTORY_OPTIONS.segments;
  readonly statusOptions = INVENTORY_OPTIONS.status;
  readonly locationOptions = INVENTORY_OPTIONS.locations;
  readonly contactOptions = INVENTORY_OPTIONS.contactPersons;
  readonly categoryOptions = INVENTORY_OPTIONS.categories;
  readonly uomOptions = INVENTORY_OPTIONS.uoms;
  readonly hsnSacOptions = INVENTORY_OPTIONS.hsnSac;
  readonly brandOptions = INVENTORY_OPTIONS.brands;
  readonly productOptions = INVENTORY_OPTIONS.products;
  readonly productTypeOptions = INVENTORY_OPTIONS.productTypes;
  readonly hsnSourceOptions = ['Government API', 'Ready API', 'Manual Entry'];
  readonly partyTypeOptions = ['Company', 'Individual'];
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
  readonly defaultCategorySelections = INVENTORY_OPTIONS.categories.slice(0, 2);
  readonly defaultUomSelections = INVENTORY_OPTIONS.uoms.slice(0, 3);
  readonly defaultHsnSacSelections = INVENTORY_OPTIONS.hsnSac.slice(0, 2);
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
  }

  ngOnInit(): void {
    if (this.config?.lineColumns?.length) {
      this.directEntryLineRows();
    }
  }

  @HostListener('window:inventory-barcode-scan', ['$event'])
  onInventoryBarcodeScan(event: Event): void {
    const detail = (event as CustomEvent<{ code?: string }>).detail;
    this.addScannedItem(detail?.code || '');
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

  openAddMaster(master: string): void {
    this.activeAddMaster.set(master);
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
    const search = this.activeGridSearch() === tableId ? this.gridSearchText().trim().toLowerCase() : '';
    const filtered = search
      ? rows.filter(row => row.some(cell => String(cell).toLowerCase().includes(search)))
      : [...rows];
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
    return (this.config?.rows || []).slice(0, 2);
  }

  isPosView(): boolean {
    return this.config?.posMode === 'pos' || (this.config?.posMode === 'switch' && this.posEnabled());
  }

  displayFields() {
    return this.isPosView() ? (this.config.posFields || this.config.fields || []) : (this.config.fields || []);
  }

  defaultFieldValue(field: InventoryField): string | string[] | undefined {
    const sourceValue = this.sourceFieldValue(field);
    if (sourceValue) return sourceValue;

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
    const value = this.defaultFieldValue(field);
    return value === 'Active' || value === 'Yes';
  }

  setFieldSwitchChecked(field: InventoryField, checked: boolean): void {
    const cacheKey = `${this.config?.key || 'inventory'}:${field.key}`;
    this.fieldDefaultValues.set(cacheKey, this.isStatusSwitchField(field)
      ? (checked ? 'Active' : 'Inactive')
      : (checked ? 'Yes' : 'No'));
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
}
