import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, computed, inject, signal, DestroyRef, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import {
  INVENTORY_COMMON_REPORT_FILTERS,
  INVENTORY_REPORT_PRIMARY_FILTERS,
  InventoryReportColumn,
  InventoryReportDefinition,
  InventoryReportFilterDefinition,
  InventoryReportFilterKey,
  InventoryReportFilterValue,
  InventoryReportFilters,
  InventoryReportRow
} from '../shared/inventory-report.models';
import {
  INVENTORY_REPORTS,
  findInventoryReport,
  inventoryReportGroupIcon,
  inventoryReportGroupTitle
} from '../shared/inventory-report.registry';
import { InventoryReportsService } from '../shared/inventory-reports.service';
import { InventoryConfigService } from '../../Inventory_Shared/inventory-config.service';

interface BranchWarehouseOption {
  label: string;
  key: 'branchId' | 'warehouseId';
  group: string;
}

@Component({
  selector: 'app-inventory-report-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule],
  templateUrl: './inventory-report-page.html'
})
export class InventoryReportPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reportsService = inject(InventoryReportsService);
  private readonly configService = inject(InventoryConfigService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pageSizes = [10, 25, 50, 100];
  readonly pageSizeOptions = this.pageSizes.map(size => ({ label: `${size} rows`, value: size }));
  readonly report = signal<InventoryReportDefinition>(INVENTORY_REPORTS[0]);
  readonly filters = signal<InventoryReportFilters>({});
  readonly rows = signal<InventoryReportRow[]>([]);
  readonly summary = signal<Record<string, string | number>>({});
  readonly totalRecords = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly searchText = signal('');
  readonly loading = signal(false);
  readonly loadedFromApi = signal(false);
  readonly errorMessage = signal('');
  readonly infoMessage = signal('');
  readonly activeRow = signal<InventoryReportRow | null>(null);
  readonly sortColumn = signal('');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly groupBy = signal('');
  readonly showAdvancedFilters = signal(false);
  readonly showColumnChooser = signal(false);
  readonly visibleColumnKeys = signal<string[]>([]);
  readonly searchExpanded = signal(false);

  @ViewChild('searchInput') private searchInputRef?: ElementRef<HTMLInputElement>;

  // Real signed-in company (authCompany, set at login) — shown as a
  // read-only badge instead of the old Company filter, which only ever
  // offered a hardcoded list of demo companies unrelated to who's signed in.
  readonly currentCompanyName = signal(this.readCurrentCompanyName());

  private readCurrentCompanyName(): string {
    try {
      const raw = sessionStorage.getItem('authCompany');
      if (!raw) return '';
      const company = JSON.parse(raw);
      return company?.companyName || '';
    } catch {
      return '';
    }
  }

  // Real, company-scoped master data (branches/segments/warehouses/etc. that
  // actually belong to the signed-in company) to replace the static demo
  // name lists in INVENTORY_COMMON_REPORT_FILTERS, which mixed in branches
  // and segments from unrelated sample tenants (hotel, restaurant, real
  // estate...). Populated once; filterDefinitions() overrides options with
  // these when available.
  readonly masterOptions = signal<Partial<Record<InventoryReportFilterKey, string[]>>>({});

  constructor() {
    this.loadMasterOptions();
  }

  private loadMasterOptions(): void {
    const set = (key: InventoryReportFilterKey, names: (string | undefined)[]): void => {
      const unique = Array.from(new Set(names.filter((name): name is string => !!name))).sort((a, b) => a.localeCompare(b));
      this.masterOptions.update(current => ({ ...current, [key]: unique }));
    };

    const load = <T>(key: InventoryReportFilterKey, source: Observable<{ data?: T[] }>, pick: (item: T) => string | undefined): void => {
      source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => set(key, (res.data ?? []).map(pick)),
        error: () => set(key, [])
      });
    };

    load('branchId', this.configService.getBranchesInv(), item => item.branch_name);
    load('segmentId', this.configService.getSegments(), item => item.segment_name);
    load('warehouseId', this.configService.getWarehouses(), item => item.warehouse_name);
    load('productId', this.configService.getProducts(), item => item.product_name);
    load('productCategory', this.configService.getCategories(), item => item.category_name);
    load('brand', this.configService.getBrands(), item => item.brand_name);
    load('hsnSac', this.configService.getHsnSac(), item => item.code);
    load('customerId', this.configService.getCustomers(), item => item.customer_name);
    load('supplierId', this.configService.getVendors(), item => item.vendor_name);
    load('uom', this.configService.getUoms(), item => item.uom_symbol || item.uom_name);
  }

  readonly groupTitle = computed(() => inventoryReportGroupTitle(this.report().groupId));
  readonly groupIcon = computed(() => inventoryReportGroupIcon(this.report().groupId));
  readonly groupByOptions = computed(() => [
    { label: 'No group', value: '' },
    ...this.report().columns.map(column => ({ label: `Group by ${column.label}`, value: column.key }))
  ]);

  readonly filterDefinitions = computed(() => {
    const allowed = new Set<InventoryReportFilterKey>(this.report().filters);
    const dynamic = this.masterOptions();
    return INVENTORY_COMMON_REPORT_FILTERS.filter(filter => allowed.has(filter.key))
      .map(filter => dynamic[filter.key] ? { ...filter, options: dynamic[filter.key] } : filter);
  });

  // Stable computed so ng-select gets the same array reference between CD cycles — prevents NG0103 infinite loop
  readonly filterMultiValues = computed<Record<InventoryReportFilterKey, string[]>>(() => {
    const filters = this.filters();
    return INVENTORY_COMMON_REPORT_FILTERS.reduce<Record<InventoryReportFilterKey, string[]>>(
      (acc, { key }) => {
        const value = filters[key];
        acc[key] = Array.isArray(value)
          ? value
          : !value || value instanceof Date
          ? []
          : String(value).split(',').map(s => s.trim()).filter(Boolean);
        return acc;
      },
      {} as Record<InventoryReportFilterKey, string[]>
    );
  });

  readonly primaryFilterDefinitions = computed(() => {
    const primary = new Set<InventoryReportFilterKey>(INVENTORY_REPORT_PRIMARY_FILTERS);
    return this.filterDefinitions().filter(filter => primary.has(filter.key));
  });

  readonly advancedFilterDefinitions = computed(() => {
    const primary = new Set<InventoryReportFilterKey>(INVENTORY_REPORT_PRIMARY_FILTERS);
    return this.filterDefinitions().filter(filter => !primary.has(filter.key));
  });

  // Segment / Financial Year live in the page header now (alongside the
  // company/phase badges) instead of the filter row, per redesign.
  readonly headerFilterDefinitions = computed(() =>
    this.filterDefinitions().filter(filter => filter.key === 'segmentId' || filter.key === 'financialYear')
  );

  // Branch/Warehouse collapse into one combined field and From/To collapse
  // into one date-range field (both rendered separately below), so they're
  // excluded from the generic primary-filter loop.
  private static readonly EMBEDDED_FILTER_KEYS = new Set<InventoryReportFilterKey>([
    'segmentId', 'financialYear', 'branchId', 'warehouseId', 'fromDate', 'toDate'
  ]);

  readonly bandFilterDefinitions = computed(() =>
    this.primaryFilterDefinitions().filter(filter => !InventoryReportPageComponent.EMBEDDED_FILTER_KEYS.has(filter.key))
  );

  // All primary filters live in the header now (title col-6 / filters col-6,
  // wrapped into two rows) — segment + financial year plus every other
  // primary filter this report declares, so nothing spills into a second
  // filter row below the header. Branch/Warehouse and the date range are
  // still rendered as their own combined fields (see showBranchWarehouseField/
  // showDateRangeField below), so they're not duplicated here.
  readonly inlineFilterDefinitions = computed(() => [
    ...this.headerFilterDefinitions(),
    ...this.bandFilterDefinitions()
  ]);

  readonly showBranchWarehouseField = computed(() => {
    const allowed = new Set(this.report().filters);
    return allowed.has('branchId') || allowed.has('warehouseId');
  });

  readonly showDateRangeField = computed(() => {
    const allowed = new Set(this.report().filters);
    return allowed.has('fromDate') || allowed.has('toDate');
  });

  // Branch and Warehouse are both "where" filters, so they're offered as one
  // grouped multiselect instead of two separate dropdowns — pick branches,
  // warehouses, or both, individually.
  readonly branchWarehouseOptions = computed<BranchWarehouseOption[]>(() => {
    const dynamic = this.masterOptions();
    const branches = (dynamic.branchId ?? []).map(label => ({ label, key: 'branchId' as const, group: 'Branch' }));
    const warehouses = (dynamic.warehouseId ?? []).map(label => ({ label, key: 'warehouseId' as const, group: 'Warehouse' }));
    return [...branches, ...warehouses];
  });

  readonly branchWarehouseSelected = computed<BranchWarehouseOption[]>(() => {
    const values = this.filterMultiValues();
    const branchSet = new Set(values.branchId ?? []);
    const warehouseSet = new Set(values.warehouseId ?? []);
    return this.branchWarehouseOptions().filter(option =>
      (option.key === 'branchId' && branchSet.has(option.label)) ||
      (option.key === 'warehouseId' && warehouseSet.has(option.label))
    );
  });

  readonly dateRangeValue = computed<Date[] | null>(() => {
    const from = this.filterDateValue('fromDate');
    const to = this.filterDateValue('toDate');
    return from || to ? [from as Date, to as Date] : null;
  });

  readonly visibleColumns = computed(() => {
    const selected = this.visibleColumnKeys();
    return this.report().columns.filter(column => selected.includes(column.key));
  });

  readonly filteredRows = computed(() => this.rows().filter(row => this.matchesActiveFilters(row)));

  readonly searchableRows = computed(() => {
    const search = this.searchText().trim().toLowerCase();
    const rows = this.filteredRows();
    if (!search) return rows;
    return rows.filter(row =>
      Object.values(row).some(value => String(value ?? '').toLowerCase().includes(search))
    );
  });

  readonly sortedRows = computed(() => {
    const rows = [...this.searchableRows()];
    const columnKey = this.sortColumn();
    if (!columnKey) return rows;

    const column = this.report().columns.find(item => item.key === columnKey);
    const direction = this.sortDirection();

    return rows.sort((left, right) => {
      const leftValue = this.sortValue(left[columnKey], column);
      const rightValue = this.sortValue(right[columnKey], column);

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return direction === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      }

      const result = String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: 'base'
      });
      return direction === 'asc' ? result : -result;
    });
  });

  readonly groupedRows = computed(() => {
    const groupKey = this.groupBy();
    const rows = this.sortedRows();
    if (!groupKey) return [{ label: '', rows }];

    const groups = new Map<string, InventoryReportRow[]>();
    rows.forEach(row => {
      const label = String(row[groupKey] ?? 'Not specified');
      groups.set(label, [...(groups.get(label) ?? []), row]);
    });

    return Array.from(groups.entries()).map(([label, groupRows]) => ({ label, rows: groupRows }));
  });

  readonly summaryCards = computed(() => {
    const summary = this.summary();
    return (this.report().summaryCards ?? []).map(card => ({
      ...card,
      value: this.formatSummaryValue(summary[card.valueKey], card.fallback)
    }));
  });

  readonly totals = computed(() => {
    const totals: Record<string, string> = {};
    this.visibleColumns().forEach(column => {
      if (!column.total) return;
      const total = this.sortedRows().reduce((sum, row) => sum + this.numberValue(row[column.key]), 0);
      totals[column.key] = this.formatCell(total, column);
    });
    return totals;
  });

  readonly rowStart = computed(() => {
    if (!this.totalRecords()) return 0;
    return ((this.page() - 1) * this.pageSize()) + 1;
  });

  readonly rowEnd = computed(() => Math.min(this.page() * this.pageSize(), this.totalRecords()));
  readonly canMovePrevious = computed(() => this.page() > 1);
  readonly canMoveNext = computed(() => this.page() * this.pageSize() < this.totalRecords());

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const reportKey = params.get('reportKey');
        if (!reportKey) {
          // Use first report as default if no reportKey is provided
          this.setReport(INVENTORY_REPORTS[0]);
        } else {
          const definition = findInventoryReport(reportKey);
          this.setReport(definition);
        }
        this.generateReport(false);
      });
  }

  filterValue(key: InventoryReportFilterKey): InventoryReportFilterValue {
    return this.filters()[key] ?? '';
  }

  filterTextValue(key: InventoryReportFilterKey): string {
    const value = this.filterValue(key);
    return Array.isArray(value) ? value.join(', ') : value instanceof Date ? this.toDateInput(value) : String(value ?? '');
  }

  filterMultiValue(key: InventoryReportFilterKey): string[] {
    const value = this.filterValue(key);
    if (Array.isArray(value)) return value;
    if (value instanceof Date || value === null || value === undefined || value === '') return [];
    return String(value).split(',').map(item => item.trim()).filter(Boolean);
  }

  filterDateValue(key: InventoryReportFilterKey): Date | null {
    const value = this.filterValue(key);
    if (value instanceof Date) return value;
    if (Array.isArray(value) || !value) return null;

    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  updateFilter(key: InventoryReportFilterKey, value: InventoryReportFilterValue): void {
    this.filters.update(filters => ({ ...filters, [key]: value ?? '' }));
  }

  updateBranchWarehouse(selected: BranchWarehouseOption[] | null): void {
    const items = selected ?? [];
    const branchNames = items.filter(item => item.key === 'branchId').map(item => item.label);
    const warehouseNames = items.filter(item => item.key === 'warehouseId').map(item => item.label);
    this.filters.update(filters => ({ ...filters, branchId: branchNames, warehouseId: warehouseNames }));
  }

  updateDateRange(value: Date[] | null): void {
    const [from, to] = value ?? [null, null];
    this.filters.update(filters => ({ ...filters, fromDate: from ?? '', toDate: to ?? '' }));
  }

  resetFilters(generate = true): void {
    this.filters.set(this.defaultFilters());
    this.searchText.set('');
    this.page.set(1);
    if (generate) this.generateReport(false);
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters.update(value => !value);
  }

  toggleColumnChooser(): void {
    this.showColumnChooser.update(value => !value);
  }

  expandSearch(): void {
    this.searchExpanded.set(true);
    setTimeout(() => this.searchInputRef?.nativeElement.focus());
  }

  collapseSearchIfEmpty(): void {
    if (!this.searchText().trim()) this.searchExpanded.set(false);
  }

  isColumnVisible(columnKey: string): boolean {
    return this.visibleColumnKeys().includes(columnKey);
  }

  toggleColumn(columnKey: string, checked: boolean): void {
    this.visibleColumnKeys.update(keys => {
      if (checked && !keys.includes(columnKey)) return [...keys, columnKey];
      if (!checked) return keys.filter(key => key !== columnKey);
      return keys;
    });
  }

  generateReport(resetPage = true): void {
    if (resetPage) this.page.set(1);

    this.loading.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');

    this.reportsService.getReport(this.report(), this.filters(), this.page(), this.pageSize()).subscribe({
      next: response => {
        this.rows.set(response.data);
        this.summary.set(response.summary ?? {});
        this.totalRecords.set(response.totalRecords || response.data.length);
        this.loadedFromApi.set(true);
        this.infoMessage.set(response.message || 'Report generated from API data.');
        this.loading.set(false);
      },
      error: () => {
        this.loadPreview('API endpoint is not available yet. Preview rows are shown so the report layout remains usable.');
        this.errorMessage.set(`Backend endpoint /api/reports/${this.report().endpoint} is pending or unreachable.`);
        this.loading.set(false);
      }
    });
  }

  changePage(delta: number): void {
    const nextPage = this.page() + delta;
    if (nextPage < 1) return;
    if (delta > 0 && !this.canMoveNext()) return;
    this.page.set(nextPage);
    this.generateReport(false);
  }

  changePageSize(value: string | number): void {
    const size = Number(value);
    this.pageSize.set(Number.isFinite(size) && size > 0 ? size : 25);
    this.page.set(1);
    this.generateReport(false);
  }

  setSort(columnKey: string): void {
    if (this.sortColumn() === columnKey) {
      this.sortDirection.update(direction => direction === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.sortColumn.set(columnKey);
    this.sortDirection.set('asc');
  }

  sortIcon(columnKey: string): string {
    if (this.sortColumn() !== columnKey) return 'pi pi-sort-alt';
    return this.sortDirection() === 'asc' ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down';
  }

  openRow(row: InventoryReportRow): void {
    this.activeRow.set(row);
  }

  closeRow(): void {
    this.activeRow.set(null);
  }

  rowEntries(row: InventoryReportRow): Array<{ label: string; value: string }> {
    return this.visibleColumns().map(column => ({
      label: column.label,
      value: this.formatCell(row[column.key], column)
    }));
  }

  async exportExcel(): Promise<void> {
    const [XLSX, { saveAs }] = await Promise.all([
      import('xlsx'),
      import('file-saver')
    ]);
    const exportRows = this.exportRows();
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), `${this.report().slug}.xlsx`);
  }

  async exportPdf(): Promise<void> {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(13);
    doc.text(this.report().title, 14, 14);
    doc.setFontSize(9);
    doc.text(`${this.groupTitle()} / ${this.rowStart()}-${this.rowEnd()} of ${this.totalRecords()}`, 14, 20);
    autoTable(doc, {
      head: [this.visibleColumns().map(column => column.label)],
      body: this.sortedRows().map(row => this.visibleColumns().map(column => this.formatCell(row[column.key], column))),
      startY: 26,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [12, 74, 110] }
    });
    doc.save(`${this.report().slug}.pdf`);
  }

  printReport(): void {
    const popup = window.open('', '_blank', 'width=1200,height=760');
    if (!popup) {
      this.errorMessage.set('Popup blocked. Please allow popups to print this report.');
      return;
    }

    const headers = this.visibleColumns().map(column => `<th>${this.escapeHtml(column.label)}</th>`).join('');
    const body = this.sortedRows()
      .map(row => `<tr>${this.visibleColumns().map(column => `<td>${this.escapeHtml(this.formatCell(row[column.key], column))}</td>`).join('')}</tr>`)
      .join('');

    popup.document.write(`
      <html>
        <head>
          <title>${this.escapeHtml(this.report().title)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
            h2 { margin: 0 0 4px; font-size: 20px; }
            p { margin: 0 0 14px; color: #64748b; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #dbe8f9; padding: 7px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; color: #334155; }
          </style>
        </head>
        <body>
          <h2>${this.escapeHtml(this.report().title)}</h2>
          <p>${this.escapeHtml(this.groupTitle())} / ${this.escapeHtml(String(this.rowStart()))}-${this.escapeHtml(String(this.rowEnd()))} of ${this.escapeHtml(String(this.totalRecords()))}</p>
          <table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  formatCell(value: InventoryReportRow[string], column: InventoryReportColumn): string {
    if (value === null || value === undefined || value === '') return '-';
    if (column.type === 'currency') return this.formatCurrency(this.numberValue(value));
    if (column.type === 'number') return this.numberValue(value).toLocaleString('en-IN');
    if (column.type === 'percent') return `${this.numberValue(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
    return String(value);
  }

  filterTrack(_: number, filter: InventoryReportFilterDefinition): InventoryReportFilterKey {
    return filter.key;
  }

  filterPlaceholder(filter: InventoryReportFilterDefinition): string {
    return filter.placeholder ?? filter.label;
  }

  // Icon-only filter labels — was a full text label stacked above every
  // filter, which ate a full row per filter and made a report with 8-10
  // filters sprawl across many rows. The icon + title tooltip keeps the
  // meaning without the label row.
  private static readonly FILTER_ICONS: Partial<Record<InventoryReportFilterKey, string>> = {
    branchId: 'pi pi-sitemap',
    segmentId: 'pi pi-briefcase',
    financialYear: 'pi pi-calendar',
    warehouseId: 'pi pi-building',
    fromDate: 'pi pi-calendar-plus',
    toDate: 'pi pi-calendar-minus',
    productId: 'pi pi-box',
    productCategory: 'pi pi-tags',
    brand: 'pi pi-star',
    hsnSac: 'pi pi-hashtag',
    customerId: 'pi pi-user',
    supplierId: 'pi pi-truck',
    batchNo: 'pi pi-th-large',
    serialNo: 'pi pi-qrcode',
    uom: 'pi pi-percentage',
    status: 'pi pi-flag',
    project: 'pi pi-folder',
    department: 'pi pi-users',
    createdBy: 'pi pi-user-edit',
    approvedBy: 'pi pi-verified'
  };

  filterIcon(key: InventoryReportFilterKey): string {
    return InventoryReportPageComponent.FILTER_ICONS[key] ?? 'pi pi-filter';
  }

  private setReport(definition: InventoryReportDefinition): void {
    this.report.set(definition);
    this.groupBy.set(definition.defaultGroupBy ?? '');
    this.sortColumn.set('');
    this.sortDirection.set('asc');
    this.showAdvancedFilters.set(false);
    this.showColumnChooser.set(false);
    this.visibleColumnKeys.set(definition.columns.filter(column => column.defaultVisible !== false).map(column => column.key));
    this.filters.set(this.defaultFilters());
    this.page.set(1);
    this.loadPreview('Preview rows are shown until the API responds.');
  }

  private defaultFilters(): InventoryReportFilters {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const context = this.reportsService.contextDefaults();
    return {
      branchId: [],
      segmentId: [],
      financialYear: [String(context.financialYear || this.currentFinancialYear())],
      fromDate: start,
      toDate: today,
      status: []
    };
  }

  private loadPreview(message: string): void {
    this.rows.set(this.report().sampleRows);
    this.summary.set({});
    this.totalRecords.set(this.report().sampleRows.length);
    this.loadedFromApi.set(false);
    this.infoMessage.set(message);
  }

  private exportRows(): Array<Record<string, string>> {
    return this.sortedRows().map(row =>
      this.visibleColumns().reduce<Record<string, string>>((record, column) => {
        record[column.label] = this.formatCell(row[column.key], column);
        return record;
      }, {})
    );
  }

  private sortValue(value: InventoryReportRow[string], column: InventoryReportColumn | undefined): string | number {
    if (column?.type === 'number' || column?.type === 'currency' || column?.type === 'percent') {
      return this.numberValue(value);
    }
    return String(value ?? '');
  }

  private numberValue(value: InventoryReportRow[string]): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean' || value === null || value === undefined) return 0;
    const normalized = String(value).replace(/[^0-9.-]/g, '');
    const result = Number(normalized);
    return Number.isFinite(result) ? result : 0;
  }

  private formatCurrency(value: number): string {
    return `Rs. ${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  private formatSummaryValue(value: string | number | undefined, fallback: string): string {
    if (value === null || value === undefined || value === '') return fallback;
    return typeof value === 'number' ? value.toLocaleString('en-IN') : String(value);
  }

  private toDateInput(value: Date): string {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private matchesActiveFilters(row: InventoryReportRow): boolean {
    const filters = this.filters();
    return Object.entries(filters).every(([key, value]) => {
      if (key === 'fromDate' || key === 'toDate') return this.matchesDateFilter(row, key as InventoryReportFilterKey, value);
      return this.matchesValueFilter(row, key as InventoryReportFilterKey, value);
    });
  }

  private matchesValueFilter(row: InventoryReportRow, key: InventoryReportFilterKey, value: InventoryReportFilterValue): boolean {
    const values = this.filterValues(value);
    if (!values.length) return true;

    const fields = this.rowFieldsForFilter(key);
    if (!fields.length) return true;

    const haystack = fields
      .map(field => String(row[field] ?? '').toLowerCase())
      .filter(Boolean);

    if (!haystack.length) return true;

    return values.some(valueText => haystack.some(rowText => rowText.includes(valueText.toLowerCase())));
  }

  private matchesDateFilter(row: InventoryReportRow, key: InventoryReportFilterKey, value: InventoryReportFilterValue): boolean {
    const date = value instanceof Date ? value : value ? new Date(String(value)) : null;
    if (!date || Number.isNaN(date.getTime())) return true;

    const rowDate = this.firstRowDate(row);
    if (!rowDate) return true;

    const rowTime = this.startOfDay(rowDate).getTime();
    const filterTime = this.startOfDay(date).getTime();
    return key === 'fromDate' ? rowTime >= filterTime : rowTime <= filterTime;
  }

  private filterValues(value: InventoryReportFilterValue): string[] {
    if (Array.isArray(value)) {
      return value.map(item => String(item ?? '').trim()).filter(item => item && item !== 'All');
    }

    if (value instanceof Date || value === null || value === undefined) return [];

    const text = String(value).trim();
    return text && text !== 'All' ? [text] : [];
  }

  private rowFieldsForFilter(key: InventoryReportFilterKey): string[] {
    const fields: Record<InventoryReportFilterKey, string[]> = {
      companyId: [],
      branchId: [],
      segmentId: ['segment'],
      financialYear: [],
      warehouseId: ['warehouse', 'location', 'fromWarehouse', 'toWarehouse', 'store'],
      fromDate: [],
      toDate: [],
      productId: ['product', 'productName', 'productCode', 'indicator'],
      productCategory: ['category', 'indicatorGroup'],
      brand: ['brand'],
      hsnSac: ['hsnSac', 'hsnSacCode', 'description'],
      customerId: ['customer', 'party'],
      supplierId: ['supplier', 'party'],
      batchNo: ['batchNo', 'batch', 'lotNo'],
      serialNo: ['serialNo', 'serial'],
      uom: ['uom', 'billingUOM'],
      status: ['status', 'risk'],
      project: ['project', 'location'],
      department: ['department'],
      createdBy: ['createdBy'],
      approvedBy: ['approvedBy']
    };

    return fields[key] ?? [];
  }

  private firstRowDate(row: InventoryReportRow): Date | null {
    const dateColumns = this.report().columns.filter(column => column.type === 'date').map(column => column.key);
    const candidates = [
      ...dateColumns,
      'transactionDate',
      'documentDate',
      'invoiceDate',
      'poDate',
      'grnDate',
      'soDate',
      'dcDate'
    ];

    for (const key of candidates) {
      const value = row[key];
      if (!value) continue;
      const date = new Date(String(value));
      if (!Number.isNaN(date.getTime())) return date;
    }

    return null;
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private currentFinancialYear(): string {
    const today = new Date();
    const startYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    return `${startYear}-${startYear + 1}`;
  }
}
