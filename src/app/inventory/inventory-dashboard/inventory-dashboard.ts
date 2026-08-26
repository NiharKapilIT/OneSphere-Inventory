import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { inventoryDashboardConfig } from '../Inventory_Shared/inventory-screen.model';
import { InventoryScreenShell } from '../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import {
  DashboardDrilldownRow,
  DashboardStockRow,
  DashboardSummary,
  DashboardTransactionRow,
  DcPendingInvoiceLineRow,
  InventoryDashboardService,
  LossSaleFlagRow,
  SalesPiPendingFlagRow
} from '../Inventory_Shared/inventory-dashboard.service';
import { StatCardComponent, StatCardTone } from '../Inventory_Shared/stat-card/stat-card.component';
import { BarChartComponent, ChartSeries } from '../Inventory_Shared/charts/bar-chart.component';
import { LineChartComponent } from '../Inventory_Shared/charts/line-chart.component';
import { DonutChartComponent, DonutSlice } from '../Inventory_Shared/charts/donut-chart.component';

const SECTION_LAYOUT_KEY = 'inv-dashboard-section-layout-v3';
const WIDTH_OPTIONS = [4, 6, 8, 12] as const;

interface SectionLayoutItem {
  id: string;
  width: number; // one of WIDTH_OPTIONS — columns out of 12
  hidden?: boolean;
}

// Default order + width (out of 12 columns). Widths are just a starting
// point — every widget, including the KPI tiles, can be resized/reordered
// by the user; the result is saved to localStorage.
const DEFAULT_SECTION_LAYOUT: SectionLayoutItem[] = [
  { id: 'kpis', width: 12 },
  { id: 'financials', width: 12 },
  { id: 'documents', width: 12 },
  { id: 'ageing', width: 12 },
  { id: 'movement', width: 8 },
  { id: 'warehouseStock', width: 4 },
  { id: 'salesReturnsTrend', width: 8 },
  { id: 'payablesReceivablesDonut', width: 4 },
  { id: 'topReturnedProducts', width: 12 },
  { id: 'productSalesFunnel', width: 6 },
  { id: 'procurementSalesFunnel', width: 6 },
  { id: 'stockByProduct', width: 12 },
  { id: 'recentTransactions', width: 12 }
];

const SECTION_TITLES: Record<string, { title: string; subtitle: string }> = {
  kpis: { title: 'Key Metrics', subtitle: 'Stock value, pending documents, and today’s activity.' },
  financials: { title: 'Payables & Receivables', subtitle: 'Outstanding balances (today) and cash movement.' },
  documents: { title: 'Purchase, Sales & Returns', subtitle: 'Posted documents for the selected period.' },
  ageing: { title: 'Ageing', subtitle: 'Outstanding balances as of today, by invoice age.' },
  movement: { title: 'Movement', subtitle: 'Inward (GRN accepted qty) vs. outward (Sales Invoice qty), by day.' },
  warehouseStock: { title: 'Warehouse Stock', subtitle: 'Real qty and value per warehouse.' },
  salesReturnsTrend: { title: 'Sales & Returns', subtitle: 'Posted Sales Invoices vs. Sales Returns, by day.' },
  payablesReceivablesDonut: { title: 'Payables vs Receivables', subtitle: 'Share of total outstanding, as of today.' },
  topReturnedProducts: { title: 'Top Selling & Returned Products', subtitle: 'Ranked by value, for the selected period.' },
  productSalesFunnel: { title: 'Product Sales Funnel', subtitle: 'Top products by sales value, widest first.' },
  procurementSalesFunnel: { title: 'Procurement vs Sales Funnel', subtitle: 'Document count at each pipeline stage, this period.' },
  stockByProduct: { title: 'Stock by Product', subtitle: 'Every product currently tracked, with real qty and value.' },
  recentTransactions: { title: 'Recent Transactions', subtitle: 'Latest documents across purchase and sales, newest first.' }
};

type DashboardPeriod = 'today' | 'week' | 'month' | 'quarter';

interface FunnelStage {
  label: string;
  short: string;
  count: number;
  value: number;
  valueLabel: string;
  widthPct: number;
  conversionPct: number;
}

interface ProductFunnelStage {
  label: string;
  amount: number;
  qty: number;
  widthPct: number;
}

interface KpiTile {
  label: string;
  value: string;
  note: string;
  icon: string;
  tone: StatCardTone;
  key: string;
}

interface GridPayload {
  title: string;
  headers: string[];
  rows: string[][];
}

@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, InventoryScreenShell, StatCardComponent, BarChartComponent, LineChartComponent, DonutChartComponent],
  templateUrl: './inventory-dashboard.html',
  styleUrl: './inventory-dashboard.scss'
})
export class InventoryDashboard {
  private readonly dashboardService = inject(InventoryDashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly selectedPeriod = signal<DashboardPeriod>('week');
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly summary = signal<DashboardSummary | null>(null);
  readonly salesPiPendingFlags = signal<SalesPiPendingFlagRow[]>([]);
  readonly dcPendingInvoiceLines = signal<DcPendingInvoiceLineRow[]>([]);
  readonly lossSalesFlags = signal<LossSaleFlagRow[]>([]);
  readonly dashboardTime = signal(this.nowLabel());
  readonly activeModal = signal<GridPayload | null>(null);
  readonly inventoryDashboardConfig = inventoryDashboardConfig;

  readonly sectionLayout = signal<SectionLayoutItem[]>(this.loadSectionLayout());
  readonly dragOverId = signal<string | null>(null);
  readonly widthOptions = WIDTH_OPTIONS;
  private draggedId: string | null = null;

  readonly visibleSections = computed(() => this.sectionLayout().filter(item => !item.hidden));
  readonly hiddenSections = computed(() => this.sectionLayout().filter(item => item.hidden));

  readonly kpiTiles = computed<KpiTile[]>(() => {
    const k = this.summary()?.kpis;
    if (!k) return [];
    return [
      { label: 'Stock Value', value: this.fmt(k.stock_value), note: 'Qty on hand × cost price, all warehouses', icon: 'pi pi-chart-bar', tone: 'blue', key: 'stock_value' },
      { label: 'Out of Stock', value: String(k.out_of_stock_count), note: 'Products with zero qty on hand', icon: 'pi pi-exclamation-triangle', tone: 'rose', key: 'out_of_stock' },
      { label: 'Pending Purchase Orders', value: String(k.pending_purchase_orders), note: 'Not yet closed or cancelled', icon: 'pi pi-shopping-cart', tone: 'amber', key: 'pending_purchase_orders' },
      { label: 'Pending Sales Orders', value: String(k.pending_sales_orders), note: 'Not yet closed or cancelled', icon: 'pi pi-file', tone: 'amber', key: 'pending_sales_orders' },
      { label: 'Pending Dispatch', value: String(k.pending_dispatch), note: 'Delivery Challans posted, not yet invoiced', icon: 'pi pi-truck', tone: 'blue', key: 'pending_dispatch' },
      { label: "Today's Purchases", value: this.fmt(k.today_purchase_value), note: 'GRNs dated today', icon: 'pi pi-arrow-circle-down', tone: 'green', key: 'today_purchase_value' },
      { label: "Today's Sales", value: this.fmt(k.today_sales_value), note: 'Sales invoices dated today', icon: 'pi pi-arrow-circle-up', tone: 'green', key: 'today_sales_value' },
      { label: 'Sales Without PI', value: String(this.salesPiPendingFlags().length), note: 'Sold from GRN stock not yet vendor-invoiced', icon: 'pi pi-flag', tone: 'amber', key: 'sales_without_pi' },
      { label: 'Dispatched Without SI', value: String(this.dcPendingInvoiceLines().length), note: 'Delivery Challan stock deducted, not yet sales-invoiced', icon: 'pi pi-truck', tone: 'amber', key: 'dc_pending_invoice' },
      { label: 'Loss Sales', value: String(this.lossSalesFlags().length), note: 'Sold below current product cost, most recent lines', icon: 'pi pi-arrow-down', tone: 'rose', key: 'loss_sales' }
    ];
  });

  readonly financialCards = computed<KpiTile[]>(() => {
    const s = this.summary();
    if (!s) return [];
    const period = this.selectedPeriod();
    return [
      { label: 'Payables', value: this.fmt(s.payables.total), note: 'Outstanding to vendors, as of today', icon: 'pi pi-wallet', tone: 'rose', key: 'payables' },
      { label: 'Receivables', value: this.fmt(s.receivables.total), note: 'Outstanding from customers, as of today', icon: 'pi pi-inbox', tone: 'blue', key: 'receivables' },
      { label: 'Paid', value: this.fmt(s.cash_flow.paid), note: `${period}, posted Vendor Payments`, icon: 'pi pi-arrow-circle-up', tone: 'amber', key: 'paid' },
      { label: 'Received', value: this.fmt(s.cash_flow.received), note: `${period}, posted Customer Receipts`, icon: 'pi pi-arrow-circle-down', tone: 'green', key: 'received' }
    ];
  });

  readonly documentCards = computed<KpiTile[]>(() => {
    const k = this.summary()?.kpis;
    if (!k) return [];
    const period = this.selectedPeriod();
    return [
      { label: 'Purchases', value: this.fmt(k.purchases), note: `${period}, posted Purchase Invoices`, icon: 'pi pi-arrow-circle-down', tone: 'blue', key: 'purchases' },
      { label: 'Sales', value: this.fmt(k.sales), note: `${period}, posted Sales Invoices`, icon: 'pi pi-arrow-circle-up', tone: 'green', key: 'sales' },
      { label: 'Purchase Returns', value: this.fmt(k.purchase_returns), note: `${period}, posted Purchase Returns`, icon: 'pi pi-replay', tone: 'rose', key: 'purchase_returns' },
      { label: 'Sales Returns', value: this.fmt(k.sales_returns), note: `${period}, posted Sales Returns`, icon: 'pi pi-replay', tone: 'amber', key: 'sales_returns' }
    ];
  });

  readonly payablesAgeing = computed(() => this.summary()?.payables?.ageing ?? []);
  readonly receivablesAgeing = computed(() => this.summary()?.receivables?.ageing ?? []);

  readonly payablesAgeingChart = computed<ChartSeries[]>(() => [{ label: 'Payables', data: this.payablesAgeing().map(a => a.amount) }]);
  readonly payablesAgeingLabels = computed(() => this.payablesAgeing().map(a => `${a.bucket}d`));
  readonly receivablesAgeingChart = computed<ChartSeries[]>(() => [{ label: 'Receivables', data: this.receivablesAgeing().map(a => a.amount) }]);
  readonly receivablesAgeingLabels = computed(() => this.receivablesAgeing().map(a => `${a.bucket}d`));

  readonly movementChartLabels = computed(() => (this.summary()?.daily_movement ?? []).map(p => this.fmtDate(p.date)));
  readonly movementChartSeries = computed<ChartSeries[]>(() => {
    const rows = this.summary()?.daily_movement ?? [];
    return [
      { label: 'Inward (GRN)', data: rows.map(r => r.inward) },
      { label: 'Outward (Sales)', data: rows.map(r => r.outward) }
    ];
  });

  readonly salesReturnsTrend = computed(() => this.summary()?.sales_returns_trend ?? []);
  readonly salesTrendChartLabels = computed(() => this.salesReturnsTrend().map(p => this.fmtDate(p.date)));
  readonly salesTrendChartSeries = computed<ChartSeries[]>(() => {
    const rows = this.salesReturnsTrend();
    return [
      { label: 'Sales', data: rows.map(r => r.sales_amount) },
      { label: 'Sales Returns', data: rows.map(r => r.sales_return_amount) }
    ];
  });

  readonly topSellingProducts = computed(() => this.summary()?.top_selling_products ?? []);
  readonly topSellingChartLabels = computed(() => this.topSellingProducts().map(p => p.product_name));
  readonly topSellingChartSeries = computed<ChartSeries[]>(() => [{ label: 'Sales Value', data: this.topSellingProducts().map(p => p.amount) }]);

  readonly returnedProducts = computed(() => this.summary()?.returned_products ?? []);
  readonly returnedChartLabels = computed(() => this.returnedProducts().map(p => p.product_name));
  readonly returnedChartSeries = computed<ChartSeries[]>(() => [{ label: 'Return Value', data: this.returnedProducts().map(p => p.return_amount) }]);

  readonly productSalesFunnel = computed<ProductFunnelStage[]>(() => {
    const rows = this.topSellingProducts().slice(0, 6);
    const max = Math.max(1, ...rows.map(r => r.amount));
    return rows.map(r => ({
      label: r.product_name,
      amount: r.amount,
      qty: r.qty,
      widthPct: Math.max(18, Math.round((r.amount / max) * 100))
    }));
  });

  readonly procurementFunnelStages = computed<FunnelStage[]>(() => {
    const f = this.summary()?.pipeline_funnel?.procurement;
    const base = Math.max(1, f?.po_count ?? 0);
    const raw: Array<Omit<FunnelStage, 'widthPct' | 'conversionPct' | 'valueLabel'>> = [
      { label: 'Purchase Orders', short: 'PO', count: f?.po_count ?? 0, value: f?.po_value ?? 0 },
      { label: 'Goods Receipts', short: 'GRN', count: f?.grn_count ?? 0, value: f?.grn_value ?? 0 },
      { label: 'Purchase Invoices', short: 'PI', count: f?.pi_count ?? 0, value: f?.pi_value ?? 0 }
    ];
    return raw.map(s => {
      const pct = Math.round((s.count / base) * 100);
      return { ...s, widthPct: Math.max(18, pct), conversionPct: pct, valueLabel: s.value > 0 ? ' · ' + this.fmt(s.value) : '' };
    });
  });

  readonly salesFunnelStages = computed<FunnelStage[]>(() => {
    const f = this.summary()?.pipeline_funnel?.sales;
    const base = Math.max(1, f?.so_count ?? 0);
    const raw: Array<Omit<FunnelStage, 'widthPct' | 'conversionPct' | 'valueLabel'>> = [
      { label: 'Sales Orders', short: 'SO', count: f?.so_count ?? 0, value: 0 },
      { label: 'Delivery Challans', short: 'DC', count: f?.dc_count ?? 0, value: 0 },
      { label: 'Sales Invoices', short: 'SI', count: f?.si_count ?? 0, value: f?.si_value ?? 0 }
    ];
    return raw.map(s => {
      const pct = Math.round((s.count / base) * 100);
      return { ...s, widthPct: Math.max(18, pct), conversionPct: pct, valueLabel: s.value > 0 ? ' · ' + this.fmt(s.value) : '' };
    });
  });

  readonly payablesReceivablesTotal = computed(() => (this.summary()?.payables?.total ?? 0) + (this.summary()?.receivables?.total ?? 0));
  readonly payablesReceivablesSlices = computed<DonutSlice[]>(() => [
    { label: 'Payables', value: this.summary()?.payables?.total ?? 0 },
    { label: 'Receivables', value: this.summary()?.receivables?.total ?? 0 }
  ]);
  readonly filteredStockRows = computed<DashboardStockRow[]>(() => this.summary()?.stock_by_product ?? []);

  readonly filteredTransactions = computed<DashboardTransactionRow[]>(() => this.summary()?.recent_transactions ?? []);

  constructor() {
    this.loadSummary();
    this.loadSalesPiPendingFlags();
    this.loadDcPendingInvoiceLines();
    this.loadLossSalesFlags();
  }

  selectPeriod(period: DashboardPeriod): void {
    this.selectedPeriod.set(period);
    this.loadSummary();
  }

  refresh(): void {
    this.dashboardTime.set(this.nowLabel());
    this.loadSummary();
    this.loadSalesPiPendingFlags();
    this.loadDcPendingInvoiceLines();
    this.loadLossSalesFlags();
  }

  sectionTitle(id: string): string {
    return SECTION_TITLES[id]?.title ?? id;
  }

  sectionSubtitle(id: string): string {
    return SECTION_TITLES[id]?.subtitle ?? '';
  }

  resetSectionOrder(): void {
    const layout = DEFAULT_SECTION_LAYOUT.map(item => ({ ...item }));
    this.sectionLayout.set(layout);
    this.persistSectionLayout(layout);
  }

  setWidth(id: string, width: number): void {
    const layout = this.sectionLayout().map(item => item.id === id ? { ...item, width } : item);
    this.sectionLayout.set(layout);
    this.persistSectionLayout(layout);
  }

  hideSection(id: string): void {
    const layout = this.sectionLayout().map(item => item.id === id ? { ...item, hidden: true } : item);
    this.sectionLayout.set(layout);
    this.persistSectionLayout(layout);
  }

  showSection(id: string): void {
    const layout = this.sectionLayout().map(item => item.id === id ? { ...item, hidden: false } : item);
    this.sectionLayout.set(layout);
    this.persistSectionLayout(layout);
  }

  onSectionDragStart(id: string, ev: DragEvent): void {
    this.draggedId = id;
    ev.dataTransfer?.setData('text/plain', id);
    if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
  }

  onSectionDragEnter(id: string, ev: DragEvent): void {
    ev.preventDefault();
    if (this.draggedId && this.draggedId !== id) this.dragOverId.set(id);
  }

  onSectionDragOver(ev: DragEvent): void {
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
  }

  onSectionDrop(targetId: string, ev: DragEvent): void {
    ev.preventDefault();
    const draggedId = this.draggedId;
    this.dragOverId.set(null);
    this.draggedId = null;
    if (!draggedId || draggedId === targetId) return;

    const layout = [...this.sectionLayout()];
    const from = layout.findIndex(item => item.id === draggedId);
    const to = layout.findIndex(item => item.id === targetId);
    if (from === -1 || to === -1) return;

    const [moved] = layout.splice(from, 1);
    layout.splice(to, 0, moved);
    this.sectionLayout.set(layout);
    this.persistSectionLayout(layout);
  }

  onSectionDragEnd(): void {
    this.draggedId = null;
    this.dragOverId.set(null);
  }

  private loadSectionLayout(): SectionLayoutItem[] {
    try {
      const raw = localStorage.getItem(SECTION_LAYOUT_KEY);
      if (!raw) return DEFAULT_SECTION_LAYOUT.map(item => ({ ...item }));

      const saved: SectionLayoutItem[] = JSON.parse(raw);
      const defaultsById = new Map(DEFAULT_SECTION_LAYOUT.map(item => [item.id, item]));
      const merged: SectionLayoutItem[] = saved
        .filter(item => defaultsById.has(item.id))
        .map(item => ({
          id: item.id,
          width: (WIDTH_OPTIONS as readonly number[]).includes(item.width) ? item.width : defaultsById.get(item.id)!.width,
          hidden: !!item.hidden
        }));

      const seen = new Set(merged.map(item => item.id));
      for (const item of DEFAULT_SECTION_LAYOUT) {
        if (!seen.has(item.id)) merged.push({ ...item });
      }
      return merged;
    } catch {
      return DEFAULT_SECTION_LAYOUT.map(item => ({ ...item }));
    }
  }

  private persistSectionLayout(layout: SectionLayoutItem[]): void {
    try { localStorage.setItem(SECTION_LAYOUT_KEY, JSON.stringify(layout)); } catch { /* storage unavailable/full — layout just won't persist */ }
  }

  exportStockCsv(): void {
    const rows = this.filteredStockRows();
    const lines = [
      'Product,Category,Warehouse,Qty On Hand,Qty Reserved,Value',
      ...rows.map(r => `"${r.product_name}","${r.category}","${r.warehouse}",${r.qty_on_hand},${r.qty_reserved},${r.value}`)
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'inventory-stock-by-product.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  openCard(card: KpiTile): void {
    this.activeModal.set(this.buildPayload(card));
  }

  closeModal(): void {
    this.activeModal.set(null);
  }

  exportModalCsv(): void {
    const payload = this.activeModal();
    if (!payload) return;
    const lines = [
      payload.headers.join(','),
      ...payload.rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  fmt(n: number | undefined): string {
    return '₹ ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  fmtDate(d?: string): string {
    return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
  }

  private buildPayload(card: KpiTile): GridPayload {
    // Stock Value / Out of Stock are derived client-side from the already-fetched
    // stock_by_product list — no dedicated backend drilldown needed for these two.
    if (card.key === 'stock_value' || card.key === 'out_of_stock') {
      const rows = this.summary()?.stock_by_product ?? [];
      const filtered = card.key === 'out_of_stock' ? rows.filter(r => r.qty_on_hand <= 0) : rows;
      return {
        title: card.label,
        headers: ['Product', 'Category', 'Warehouse', 'Qty On Hand', 'Reserved', 'Value'],
        rows: filtered.map(r => [r.product_name, r.category, r.warehouse, String(r.qty_on_hand), String(r.qty_reserved), this.fmt(r.value)])
      };
    }

    if (card.key === 'sales_without_pi') {
      const rows = this.salesPiPendingFlags();
      return {
        title: card.label,
        headers: ['Sales Invoice', 'Product', 'Warehouse', 'Qty Sold', 'Pending PI Qty', 'Flagged'],
        rows: rows.map(r => [
          r.doc_number || '—', r.product_name || '—', r.warehouse_name || '—',
          String(r.qty_sold), String(r.pending_pi_qty), this.fmtDate(r.flagged_at)
        ])
      };
    }

    if (card.key === 'dc_pending_invoice') {
      const rows = this.dcPendingInvoiceLines();
      return {
        title: card.label,
        headers: ['Delivery Challan', 'Date', 'Customer', 'Product', 'Warehouse', 'Dispatched', 'Invoiced', 'Pending'],
        rows: rows.map(r => [
          r.dc_number || '—', this.fmtDate(r.dc_date), r.customer_name || '—', r.product_name || '—', r.warehouse_name || '—',
          String(r.dispatch_qty), String(r.invoiced_qty), String(r.pending_qty)
        ])
      };
    }

    if (card.key === 'loss_sales') {
      const rows = this.lossSalesFlags();
      return {
        title: card.label,
        headers: ['Sales Invoice', 'Date', 'Customer', 'Product', 'Qty', 'Rate', 'Cost', 'Loss Amount', 'Loss %'],
        rows: rows.map(r => [
          r.doc_number || '—', this.fmtDate(r.doc_date), r.customer_name || '—', r.product_name || '—',
          String(r.qty), this.fmt(r.rate), this.fmt(r.cost_price), this.fmt(r.loss_amount), `${r.loss_percent}%`
        ])
      };
    }

    const isOutstanding = card.key === 'payables' || card.key === 'receivables';
    const drillRows: DashboardDrilldownRow[] = this.summary()?.drilldowns?.[card.key] ?? [];
    return {
      title: card.label,
      headers: isOutstanding
        ? ['Document', 'Date', 'Party', 'Outstanding', 'Age']
        : ['Document', 'Date', 'Party', 'Amount', 'Status'],
      rows: drillRows.map(r => [r.doc_number || '—', this.fmtDate(r.date), r.party || '—', this.fmt(r.amount), r.status || '—'])
    };
  }

  private loadSummary(): void {
    const { from, to } = this.dateRangeFor(this.selectedPeriod());
    this.loading.set(true);
    this.loadError.set('');
    this.dashboardService.getDashboardSummary(from, to)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.loading.set(false);
          if (res.success && res.data) this.summary.set(res.data);
          else this.loadError.set(res.message || 'Unable to load dashboard.');
        },
        error: err => {
          this.loading.set(false);
          this.loadError.set(err?.error?.message || 'Unable to load dashboard.');
        }
      });
  }

  // Not period-scoped (most-recent flags, regardless of the KPI date filter)
  // so this is fetched once, not re-fetched on selectPeriod().
  private loadSalesPiPendingFlags(): void {
    this.dashboardService.getSalesPiPendingFlags()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => { if (res.success && res.data) this.salesPiPendingFlags.set(res.data); },
        error: () => {}
      });
  }

  // Live/derived (not a snapshot), so re-fetched on the same cadence as
  // loadSalesPiPendingFlags() rather than only once — see 103_dc_pending_
  // invoice_dashboard.sql.
  private loadDcPendingInvoiceLines(): void {
    this.dashboardService.getDcPendingInvoiceLines()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => { if (res.success && res.data) this.dcPendingInvoiceLines.set(res.data); },
        error: () => {}
      });
  }

  // Live/derived (not a snapshot -- current cost_price joined against
  // historical rate on every call), so re-fetched on the same cadence as
  // loadDcPendingInvoiceLines() rather than only once — see
  // 155_loss_sales_report.sql.
  private loadLossSalesFlags(): void {
    this.dashboardService.getLossSalesFlags()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => { if (res.success && res.data) this.lossSalesFlags.set(res.data); },
        error: () => {}
      });
  }

  private dateRangeFor(period: DashboardPeriod): { from: string; to: string } {
    const to = new Date();
    const from = new Date();
    if (period === 'week') from.setDate(to.getDate() - 6);
    else if (period === 'month') from.setDate(to.getDate() - 29);
    else if (period === 'quarter') from.setDate(to.getDate() - 89);
    return { from: this.isoDate(from), to: this.isoDate(to) };
  }

  private isoDate(d: Date): string { return d.toISOString().slice(0, 10); }

  private nowLabel(): string {
    return new Date().toLocaleString('en-IN', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}
