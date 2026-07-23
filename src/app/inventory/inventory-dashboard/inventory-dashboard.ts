import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

type DashboardPeriod = 'today' | 'week' | 'month' | 'quarter';
type DashboardTab = 'owner' | 'segments' | 'actions' | 'transactions' | 'warehouses';
type GridAction = 'print' | 'mail' | 'export' | 'whatsapp';
type GridId = 'segments' | 'risk' | 'actions' | 'transactions' | 'warehouses' | 'topProducts' | 'slowProducts' | 'expiryAlerts';

interface OwnerKpi {
  label: string;
  value: string;
  note: string;
  icon: string;
  tone: string;
  route: string;
}

interface SegmentMetric {
  segment: string;
  icon: string;
  stockValue: string;
  revenueHold: string;
  stockShare: number;
  holdShare: number;
  health: number;
  lowStock: number;
  pendingApprovals: number;
  decision: string;
  route: string;
}

interface RiskRow {
  product: string;
  segment: string;
  location: string;
  available: string;
  reorder: string;
  coverage: string;
  impact: string;
  recommendedAction: string;
  status: 'Critical' | 'Watch' | 'Good';
  route: string;
}

interface ActionRow {
  priority: 'High' | 'Medium' | 'Low';
  action: string;
  segment: string;
  owner: string;
  due: string;
  value: string;
  status: 'Pending' | 'In Progress' | 'Ready';
  route: string;
}

interface TransactionRow {
  ref: string;
  type: string;
  segment: string;
  party: string;
  amount: string;
  date: string;
  status: 'Posted' | 'Pending' | 'Approved' | 'Draft';
  nextStep: string;
  route: string;
}

interface WarehouseRow {
  location: string;
  segment: string;
  capacity: string;
  fill: number;
  stockValue: string;
  slowMoving: string;
  pendingDispatch: string;
  action: string;
}

interface ProductInsight {
  product: string;
  segment: string;
  qty: string;
  value: string;
  note: string;
  route: string;
}

interface ExpiryAlert {
  product: string;
  segment: string;
  location: string;
  batch: string;
  expiry: string;
  qty: string;
  action: string;
  route: string;
}

interface DetailModal {
  title: string;
  subtitle: string;
  rows: { label: string; value: string }[];
  route?: string;
}

interface GridPayload {
  title: string;
  headers: string[];
  rows: string[][];
}

interface MovementPoint {
  label: string;
  inward: number;
  outward: number;
  dispatch: number;
  inwardValue: string;
  outwardValue: string;
  dispatchValue: string;
}

interface StockMix {
  label: string;
  value: string;
  share: number;
  color: string;
  note: string;
}

interface WarehouseSnapshot {
  location: string;
  segment: string;
  fill: number;
  stockValue: string;
  dispatch: string;
  slowMoving: string;
  icon: string;
}

interface StockAgeBucket {
  label: string;
  value: string;
  share: number;
  tone: 'fresh' | 'moving' | 'slow' | 'blocked';
}

@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './inventory-dashboard.html'
})
export class InventoryDashboard {
  readonly selectedPeriod = signal<DashboardPeriod>('month');
  readonly selectedSegment = signal('All Segments');
  readonly activeTab = signal<DashboardTab>('owner');
  readonly searchText = signal('');
  readonly activeModal = signal<DetailModal | null>(null);
  readonly toastMessage = signal('');
  readonly dashboardTime = signal(this.nowLabel());

  readonly ownerKpis: OwnerKpi[] = [
    { label: 'Stock Value', value: 'Rs. 4.82 Cr', note: 'Total available inventory value', icon: 'pi pi-chart-bar', tone: 'blue', route: '/dashboard/inventory/reports/segment-summary' },
    { label: 'Low Stock', value: '14 Items', note: '6 critical, 8 watch items', icon: 'pi pi-exclamation-triangle', tone: 'rose', route: '/dashboard/inventory/reports/stock-availability-report' },
    { label: 'Pending Orders', value: '86', note: 'Sales orders waiting for stock or approval', icon: 'pi pi-shopping-cart', tone: 'amber', route: '/dashboard/inventory/transactions/sales-order' },
    { label: 'Pending Dispatch', value: '28', note: 'Approved items not yet delivered', icon: 'pi pi-truck', tone: 'blue', route: '/dashboard/inventory/transactions/delivery-challan' },
    { label: "Today's Sales", value: 'Rs. 2.1 L', note: '8 invoices and counter bills', icon: 'pi pi-arrow-circle-up', tone: 'green', route: '/dashboard/inventory/transactions/sales-invoice' },
    { label: "Today's Purchase", value: 'Rs. 3.8 L', note: '12 inward and GRN entries', icon: 'pi pi-arrow-circle-down', tone: 'green', route: '/dashboard/inventory/transactions/goods-receipt' },
    { label: 'Profit Margin', value: '18.4%', note: 'Weighted margin for today', icon: 'pi pi-percentage', tone: 'amber', route: '/dashboard/inventory/reports/stock-ledger' }
  ];

  readonly segmentMetrics: SegmentMetric[] = [
    { segment: 'Electronics', icon: 'pi pi-desktop', stockValue: 'Rs. 2.24 Cr', revenueHold: 'Rs. 18.2 L', stockShare: 100, holdShare: 81, health: 82, lowStock: 6, pendingApprovals: 3, decision: 'Approve reorder for laptop and CCTV items today.', route: '/dashboard/inventory/reports/stock-availability-report' },
    { segment: 'Agro Product', icon: 'pi pi-sun', stockValue: 'Rs. 86 L', revenueHold: 'Rs. 7.4 L', stockShare: 38, holdShare: 33, health: 68, lowStock: 3, pendingApprovals: 2, decision: 'Season stock is tight. Raise PR for seed and fertilizer.', route: '/dashboard/inventory/transactions/purchase-requisition' },
    { segment: 'Hotel / Restaurant', icon: 'pi pi-shopping-bag', stockValue: 'Rs. 42 L', revenueHold: 'Rs. 3.1 L', stockShare: 19, holdShare: 14, health: 74, lowStock: 4, pendingApprovals: 1, decision: 'Move expiring stock to kitchen consumption plan.', route: '/dashboard/inventory/transactions/material-consumption' },
    { segment: 'Drone Manufacturing', icon: 'pi pi-cog', stockValue: 'Rs. 1.22 Cr', revenueHold: 'Rs. 22.6 L', stockShare: 54, holdShare: 100, health: 91, lowStock: 0, pendingApprovals: 4, decision: 'Clear QC hold on battery packs to release finished goods.', route: '/dashboard/inventory/transactions/production-entry' },
    { segment: 'Co-working Space', icon: 'pi pi-building', stockValue: 'Rs. 28 L', revenueHold: 'Rs. 6.8 L', stockShare: 13, holdShare: 30, health: 94, lowStock: 1, pendingApprovals: 1, decision: 'Review cabin availability and convert bookings to invoices.', route: '/dashboard/inventory/transactions/sales-invoice' }
  ];

  readonly movementPoints: MovementPoint[] = [
    { label: 'Mon', inward: 54, outward: 34, dispatch: 28, inwardValue: 'Rs. 2.8 L', outwardValue: 'Rs. 1.7 L', dispatchValue: '8' },
    { label: 'Tue', inward: 68, outward: 48, dispatch: 42, inwardValue: 'Rs. 3.6 L', outwardValue: 'Rs. 2.4 L', dispatchValue: '12' },
    { label: 'Wed', inward: 41, outward: 62, dispatch: 51, inwardValue: 'Rs. 2.1 L', outwardValue: 'Rs. 3.1 L', dispatchValue: '15' },
    { label: 'Thu', inward: 72, outward: 57, dispatch: 64, inwardValue: 'Rs. 3.8 L', outwardValue: 'Rs. 2.9 L', dispatchValue: '18' },
    { label: 'Fri', inward: 46, outward: 70, dispatch: 58, inwardValue: 'Rs. 2.4 L', outwardValue: 'Rs. 3.5 L', dispatchValue: '16' },
    { label: 'Sat', inward: 63, outward: 44, dispatch: 37, inwardValue: 'Rs. 3.3 L', outwardValue: 'Rs. 2.2 L', dispatchValue: '11' },
    { label: 'Sun', inward: 34, outward: 30, dispatch: 25, inwardValue: 'Rs. 1.8 L', outwardValue: 'Rs. 1.5 L', dispatchValue: '7' }
  ];

  readonly stockMix: StockMix[] = [
    { label: 'Fast Moving', value: 'Rs. 1.96 Cr', share: 42, color: '#2563eb', note: 'Sales-ready stock with steady movement' },
    { label: 'Production / Project', value: 'Rs. 1.24 Cr', share: 26, color: '#10b981', note: 'BOM, panel and site-linked materials' },
    { label: 'Seasonal Stock', value: 'Rs. 86 L', share: 18, color: '#f59e0b', note: 'Agro, kitchen and event-linked demand' },
    { label: 'Hold / Slow', value: 'Rs. 66 L', share: 14, color: '#e11d48', note: 'QC hold, old stock and expiry watch' }
  ];

  readonly warehouseSnapshots: WarehouseSnapshot[] = [
    { location: 'HYD Main WH', segment: 'Electronics', fill: 84, stockValue: 'Rs. 1.90 Cr', dispatch: '14 orders', slowMoving: 'Rs. 18.2 L', icon: 'pi pi-box' },
    { location: 'BLR Store', segment: 'Agro Product', fill: 62, stockValue: 'Rs. 72 L', dispatch: '8 orders', slowMoving: 'Rs. 3.4 L', icon: 'pi pi-map-marker' },
    { location: 'Kitchen Store', segment: 'Hotel / Restaurant', fill: 78, stockValue: 'Rs. 38 L', dispatch: 'Daily use', slowMoving: 'Rs. 0.8 L', icon: 'pi pi-shopping-bag' },
    { location: 'Mfg Store', segment: 'Drone Manufacturing', fill: 55, stockValue: 'Rs. 1.22 Cr', dispatch: 'QC 17', slowMoving: 'Rs. 6.2 L', icon: 'pi pi-cog' },
    { location: 'Co-work Floor 2', segment: 'Co-working Space', fill: 79, stockValue: 'Rs. 28 L', dispatch: '46 seats', slowMoving: 'Rs. 0', icon: 'pi pi-building' }
  ];

  readonly stockAgeBuckets: StockAgeBucket[] = [
    { label: '0-15 Days', value: 'Rs. 2.18 Cr', share: 45, tone: 'fresh' },
    { label: '16-30 Days', value: 'Rs. 1.32 Cr', share: 27, tone: 'moving' },
    { label: '31-60 Days', value: 'Rs. 82 L', share: 17, tone: 'slow' },
    { label: '60+ Days', value: 'Rs. 50 L', share: 11, tone: 'blocked' }
  ];

  readonly riskRows: RiskRow[] = [
    { product: 'Laptop i5 Gen12', segment: 'Electronics', location: 'HYD Main WH', available: '2 Nos', reorder: '10 Nos', coverage: '4 days', impact: 'Sales loss risk Rs. 5.8 L', recommendedAction: 'Raise PR', status: 'Critical', route: '/dashboard/inventory/transactions/purchase-requisition' },
    { product: 'Paddy Seeds Grade A', segment: 'Agro Product', location: 'BLR Store', available: '240 Bags', reorder: '300 Bags', coverage: '9 days', impact: 'Season demand risk Rs. 7.4 L', recommendedAction: 'Raise PR', status: 'Watch', route: '/dashboard/inventory/transactions/purchase-requisition' },
    { product: 'Cooking Oil 1L', segment: 'Hotel / Restaurant', location: 'Main Kitchen Store', available: '180 Nos', reorder: '200 Nos', coverage: '6 days', impact: 'Expiry in 18 days', recommendedAction: 'Consume first', status: 'Watch', route: '/dashboard/inventory/transactions/material-consumption' },
    { product: 'Battery Pack', segment: 'Drone Manufacturing', location: 'QC Store', available: '17 Nos hold', reorder: '0', coverage: 'QC hold', impact: 'Revenue hold Rs. 22.6 L', recommendedAction: 'QC approval', status: 'Critical', route: '/dashboard/inventory/transactions/production-entry' },
    { product: 'Dedicated Seat', segment: 'Co-working Space', location: 'Co-work Floor 2', available: '46 Seats', reorder: '20 Seats', coverage: 'Good', impact: 'Ready for booking', recommendedAction: 'Invoice bookings', status: 'Good', route: '/dashboard/inventory/transactions/sales-invoice' }
  ];

  readonly actionRows: ActionRow[] = [
    { priority: 'High', action: 'Approve laptop reorder', segment: 'Electronics', owner: 'Business Owner', due: 'Today', value: 'Rs. 5.8 L', status: 'Pending', route: '/dashboard/inventory/transactions/purchase-requisition' },
    { priority: 'High', action: 'Release QC battery packs', segment: 'Drone Manufacturing', owner: 'Operations Head', due: 'Today', value: 'Rs. 22.6 L', status: 'In Progress', route: '/dashboard/inventory/transactions/production-entry' },
    { priority: 'Medium', action: 'Follow up overdue PO-2241', segment: 'Electronics', owner: 'Purchase Team', due: 'Tomorrow', value: 'Rs. 4.8 L', status: 'Pending', route: '/dashboard/inventory/transactions/purchase-order' },
    { priority: 'Medium', action: 'Move expiring oil to kitchen plan', segment: 'Hotel / Restaurant', owner: 'Store Manager', due: '18 days', value: 'Rs. 0.8 L', status: 'Ready', route: '/dashboard/inventory/transactions/material-consumption' },
    { priority: 'Low', action: 'Convert cabin bookings to invoice', segment: 'Co-working Space', owner: 'Billing Team', due: 'This week', value: 'Rs. 6.8 L', status: 'Ready', route: '/dashboard/inventory/transactions/sales-invoice' }
  ];

  readonly transactionRows: TransactionRow[] = [
    { ref: 'GRN-1104', type: 'Goods Receipt', segment: 'Electronics', party: 'ElectroMart Supplies', amount: 'Rs. 11.7 L', date: '12-May-2026', status: 'Posted', nextStep: 'Stock available', route: '/dashboard/inventory/transactions/goods-receipt' },
    { ref: 'SO-2218', type: 'Sales Order', segment: 'Electronics', party: 'Tenant Works Pvt Ltd', amount: 'Rs. 4.2 L', date: '12-May-2026', status: 'Approved', nextStep: 'Dispatch pending', route: '/dashboard/inventory/transactions/sales-order' },
    { ref: 'PO-2241', type: 'Purchase Order', segment: 'Electronics', party: 'ElectroMart Supplies', amount: 'Rs. 4.8 L', date: '04-May-2026', status: 'Pending', nextStep: 'Follow up vendor', route: '/dashboard/inventory/transactions/purchase-order' },
    { ref: 'INV-4481', type: 'Sales Invoice', segment: 'Hotel / Restaurant', party: 'Fresh Foods Distributor', amount: 'Rs. 1.8 L', date: '11-May-2026', status: 'Posted', nextStep: 'Accounts posted', route: '/dashboard/inventory/transactions/sales-invoice' },
    { ref: 'ST-0442', type: 'Stock Transfer', segment: 'Precast Panels', party: 'HYD Main WH to Project Yard A', amount: 'Rs. 12.8 L', date: '10-May-2026', status: 'Posted', nextStep: 'Site receipt', route: '/dashboard/inventory/transactions/stock-transfer' },
    { ref: 'SA-1094', type: 'Stock Adjustment', segment: 'Electronics', party: 'HYD Main WH', amount: '-Rs. 0.4 L', date: '11-May-2026', status: 'Pending', nextStep: 'Owner approval', route: '/dashboard/inventory/transactions/stock-adjustment' }
  ];

  readonly warehouseRows: WarehouseRow[] = [
    { location: 'HYD Main WH', segment: 'Electronics', capacity: '12,000 sq.ft', fill: 84, stockValue: 'Rs. 1.9 Cr', slowMoving: 'Rs. 18.2 L', pendingDispatch: '14 orders', action: 'Dispatch old orders first' },
    { location: 'BLR Store', segment: 'Agro Product', capacity: '4,800 bags', fill: 62, stockValue: 'Rs. 72 L', slowMoving: 'Rs. 3.4 L', pendingDispatch: '8 orders', action: 'Raise seasonal PR' },
    { location: 'Main Kitchen Store', segment: 'Hotel / Restaurant', capacity: 'Cold and dry store', fill: 78, stockValue: 'Rs. 38 L', slowMoving: 'Rs. 0.8 L', pendingDispatch: 'Daily consumption', action: 'Consume expiry stock' },
    { location: 'Manufacturing Store', segment: 'Drone Manufacturing', capacity: 'Component bay', fill: 55, stockValue: 'Rs. 1.22 Cr', slowMoving: 'Rs. 6.2 L', pendingDispatch: 'QC hold 17', action: 'Release QC hold' },
    { location: 'Co-work Floor 2', segment: 'Co-working Space', capacity: '220 seats', fill: 79, stockValue: 'Rs. 28 L', slowMoving: 'Rs. 0', pendingDispatch: '46 seats free', action: 'Convert bookings' }
  ];

  readonly topProducts: ProductInsight[] = [
    { product: 'LED Display 32 inch', segment: 'Electronics', qty: '48 Nos sold', value: 'Rs. 11.7 L', note: 'Margin 21.6%', route: '/dashboard/inventory/transactions/sales-invoice' },
    { product: 'AMC Support', segment: 'IT Services', qty: '14 contracts', value: 'Rs. 9.6 L', note: 'Margin 42.0%', route: '/dashboard/inventory/masters/product-service-master' },
    { product: 'Drone Motor 2KW', segment: 'Drone Manufacturing', qty: '220 Nos issued', value: 'Rs. 8.8 L', note: 'Production linked', route: '/dashboard/inventory/transactions/production-entry' },
    { product: 'Basmati Rice 25KG', segment: 'Hotel / Restaurant', qty: '820 Bags', value: 'Rs. 4.9 L', note: 'Fast kitchen movement', route: '/dashboard/inventory/transactions/material-consumption' }
  ];

  readonly slowProducts: ProductInsight[] = [
    { product: 'Laptop i5 Gen12', segment: 'Electronics', qty: '22 Nos', value: 'Rs. 15.4 L', note: 'Slow for 31 days', route: '/dashboard/inventory/reports/stock-availability-report' },
    { product: 'Cotton Bales', segment: 'Agro Product', qty: '42 Bale', value: 'Rs. 12.6 L', note: 'Move before season closes', route: '/dashboard/inventory/reports/stock-availability-report' },
    { product: 'Aluminium Frame', segment: 'Drone Manufacturing', qty: '160 Nos', value: 'Rs. 3.2 L', note: 'Production demand dropped', route: '/dashboard/inventory/reports/stock-ledger' },
    { product: 'Conference Hall Package', segment: 'Co-working Space', qty: '8 slots', value: 'Rs. 2.4 L', note: 'Low booking conversion', route: '/dashboard/inventory/transactions/sales-invoice' }
  ];

  readonly expiryAlerts: ExpiryAlert[] = [
    { product: 'Cooking Oil 1L', segment: 'Hotel / Restaurant', location: 'Main Kitchen Store', batch: 'LOT-CLN-441', expiry: '18 days', qty: '80 Nos', action: 'Consume first', route: '/dashboard/inventory/transactions/material-consumption' },
    { product: 'Agro Seed Premium', segment: 'Agro Product', location: 'BLR Store', batch: 'LOT-AGRO-0526-A', expiry: '35 days', qty: '118 Bags', action: 'Sell / transfer', route: '/dashboard/inventory/transactions/stock-transfer' },
    { product: 'Basmati Rice 25KG', segment: 'Hotel / Restaurant', location: 'Main Kitchen Store', batch: 'LOT-RICE-0526-K', expiry: '42 days', qty: '60 Bags', action: 'Kitchen plan', route: '/dashboard/inventory/transactions/material-consumption' }
  ];

  readonly segmentNames = computed(() => ['All Segments', ...this.segmentMetrics.map(item => item.segment)]);

  readonly filteredSegments = computed(() => {
    const selected = this.selectedSegment();
    return this.segmentMetrics.filter(row => selected === 'All Segments' || row.segment === selected);
  });

  readonly filteredRiskRows = computed(() => this.filterRows(this.riskRows));
  readonly filteredActionRows = computed(() => this.filterRows(this.actionRows));
  readonly filteredTransactionRows = computed(() => this.filterRows(this.transactionRows));
  readonly filteredWarehouseRows = computed(() => this.filterRows(this.warehouseRows));
  readonly filteredTopProducts = computed(() => this.filterRows(this.topProducts));
  readonly filteredSlowProducts = computed(() => this.filterRows(this.slowProducts));
  readonly filteredExpiryAlerts = computed(() => this.filterRows(this.expiryAlerts));
  readonly criticalRiskCount = computed(() => this.filteredRiskRows().filter(row => row.status === 'Critical').length);
  readonly watchRiskCount = computed(() => this.filteredRiskRows().filter(row => row.status === 'Watch').length);
  readonly goodRiskCount = computed(() => this.filteredRiskRows().filter(row => row.status === 'Good').length);
  readonly stockMixDonutStyle = computed(() => {
    let start = 0;
    const stops = this.stockMix.map(item => {
      const end = start + item.share;
      const stop = `${item.color} ${start}% ${end}%`;
      start = end;
      return stop;
    });

    return `conic-gradient(${stops.join(', ')})`;
  });
  readonly riskDonutStyle = computed(() => {
    const total = Math.max(this.filteredRiskRows().length, 1);
    const critical = (this.criticalRiskCount() / total) * 100;
    const watch = critical + ((this.watchRiskCount() / total) * 100);

    return `conic-gradient(#e11d48 0 ${critical}%, #f59e0b ${critical}% ${watch}%, #10b981 ${watch}% 100%)`;
  });

  readonly topDecision = computed(() => {
    const firstCritical = this.filteredRiskRows().find(row => row.status === 'Critical');
    return firstCritical
      ? `${firstCritical.recommendedAction}: ${firstCritical.product} at ${firstCritical.location}`
      : 'No critical stock blocker in the selected segment.';
  });

  selectPeriod(period: DashboardPeriod): void {
    this.selectedPeriod.set(period);
    this.notify(`Dashboard period changed to ${period}.`);
  }

  setActiveTab(tab: DashboardTab): void {
    this.activeTab.set(tab);
  }

  refreshDashboard(): void {
    this.dashboardTime.set(this.nowLabel());
    this.notify('Dashboard refreshed.');
  }

  handleGridAction(gridId: GridId, action: GridAction): void {
    const payload = this.gridPayload(gridId);

    if (action === 'export') {
      this.exportCsv(payload);
      return;
    }

    if (action === 'print') {
      this.printGrid(payload);
      return;
    }

    if (action === 'mail') {
      this.mailGrid(payload);
      return;
    }

    this.whatsappGrid(payload);
  }

  openKpi(kpi: OwnerKpi): void {
    this.activeModal.set({
      title: kpi.label,
      subtitle: kpi.note,
      route: kpi.route,
      rows: [
        { label: 'Current value', value: kpi.value },
        { label: 'Period', value: this.selectedPeriod() },
        { label: 'Segment filter', value: this.selectedSegment() },
        { label: 'Owner decision', value: this.topDecision() }
      ]
    });
  }

  openDetail(title: string, row: object, route?: string): void {
    this.activeModal.set({
      title,
      subtitle: 'Dashboard drill down',
      route,
      rows: Object.entries(row).map(([label, value]) => ({ label: this.labelize(label), value: String(value) }))
    });
  }

  closeModal(): void {
    this.activeModal.set(null);
  }

  healthWidth(value: number): string {
    return `${value}%`;
  }

  chartPercent(value: number): string {
    return `${Math.max(4, Math.min(100, value))}%`;
  }

  fillTone(fill: number): string {
    if (fill >= 80) return 'high';
    if (fill >= 55) return 'medium';
    return 'low';
  }

  clearSearch(): void {
    this.searchText.set('');
    this.selectedSegment.set('All Segments');
  }

  private filterRows<T extends { segment?: string }>(rows: readonly T[]): T[] {
    const selected = this.selectedSegment();
    const search = this.searchText().trim().toLowerCase();

    return rows
      .filter(row => selected === 'All Segments' || row.segment === selected)
      .filter(row => !search || Object.values(row as Record<string, unknown>).some(value => String(value).toLowerCase().includes(search)));
  }

  private gridPayload(gridId: GridId): GridPayload {
    switch (gridId) {
      case 'segments':
        return {
          title: 'Segment Health',
          headers: ['Segment', 'Stock Value', 'Revenue Hold', 'Health', 'Low Stock', 'Pending Approvals', 'Decision'],
          rows: this.filteredSegments().map(row => [row.segment, row.stockValue, row.revenueHold, `${row.health}%`, String(row.lowStock), String(row.pendingApprovals), row.decision])
        };
      case 'risk':
        return {
          title: 'Stock Risk',
          headers: ['Product', 'Segment', 'Location', 'Available', 'Reorder', 'Coverage', 'Impact', 'Action', 'Status'],
          rows: this.filteredRiskRows().map(row => [row.product, row.segment, row.location, row.available, row.reorder, row.coverage, row.impact, row.recommendedAction, row.status])
        };
      case 'actions':
        return {
          title: 'Owner Action List',
          headers: ['Priority', 'Action', 'Segment', 'Owner', 'Due', 'Value', 'Status'],
          rows: this.filteredActionRows().map(row => [row.priority, row.action, row.segment, row.owner, row.due, row.value, row.status])
        };
      case 'transactions':
        return {
          title: 'Inventory Transactions',
          headers: ['Ref', 'Type', 'Segment', 'Party / Location', 'Amount', 'Date', 'Status', 'Next Step'],
          rows: this.filteredTransactionRows().map(row => [row.ref, row.type, row.segment, row.party, row.amount, row.date, row.status, row.nextStep])
        };
      case 'warehouses':
        return {
          title: 'Warehouse Utilisation',
          headers: ['Location', 'Segment', 'Capacity', 'Fill', 'Stock Value', 'Slow Moving', 'Pending Dispatch', 'Action'],
          rows: this.filteredWarehouseRows().map(row => [row.location, row.segment, row.capacity, `${row.fill}%`, row.stockValue, row.slowMoving, row.pendingDispatch, row.action])
        };
      case 'topProducts':
        return {
          title: 'Top Products',
          headers: ['Product', 'Segment', 'Qty', 'Value', 'Note'],
          rows: this.filteredTopProducts().map(row => [row.product, row.segment, row.qty, row.value, row.note])
        };
      case 'slowProducts':
        return {
          title: 'Slow Products',
          headers: ['Product', 'Segment', 'Qty', 'Value', 'Note'],
          rows: this.filteredSlowProducts().map(row => [row.product, row.segment, row.qty, row.value, row.note])
        };
      case 'expiryAlerts':
        return {
          title: 'Expiry Alerts',
          headers: ['Product', 'Segment', 'Location', 'Batch', 'Expiry', 'Qty', 'Action'],
          rows: this.filteredExpiryAlerts().map(row => [row.product, row.segment, row.location, row.batch, row.expiry, row.qty, row.action])
        };
    }
  }

  private exportCsv(payload: GridPayload): void {
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
    this.notify(`${payload.title} exported.`);
  }

  private printGrid(payload: GridPayload): void {
    const popup = window.open('', '_blank', 'width=1100,height=760');
    if (!popup) {
      this.notify('Popup blocked. Please allow popups to print this grid.');
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>${payload.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
            h2 { margin: 0 0 4px; font-size: 20px; }
            p { margin: 0 0 16px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #dbe8f9; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; color: #334155; }
          </style>
        </head>
        <body>
          <h2>${payload.title}</h2>
          <p>Inventory dashboard / ${this.selectedPeriod()} / ${this.selectedSegment()}</p>
          ${this.tableHtml(payload)}
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
    this.notify(`${payload.title} print opened.`);
  }

  private mailGrid(payload: GridPayload): void {
    const subject = encodeURIComponent(`Inventory Dashboard - ${payload.title}`);
    const body = encodeURIComponent(this.textSummary(payload));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    this.notify(`${payload.title} mail draft opened.`);
  }

  private whatsappGrid(payload: GridPayload): void {
    const text = encodeURIComponent(this.textSummary(payload));
    window.open(`https://wa.me/?text=${text}`, '_blank');
    this.notify(`${payload.title} WhatsApp share opened.`);
  }

  private textSummary(payload: GridPayload): string {
    const rows = payload.rows.slice(0, 12).map(row => row.join(' | ')).join('\n');
    return `${payload.title}\nPeriod: ${this.selectedPeriod()}\nSegment: ${this.selectedSegment()}\n\n${payload.headers.join(' | ')}\n${rows}`;
  }

  private tableHtml(payload: GridPayload): string {
    const head = payload.headers.map(header => `<th>${header}</th>`).join('');
    const rows = payload.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('');
    return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  private notify(message: string): void {
    this.toastMessage.set(message);
    window.setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set('');
      }
    }, 2600);
  }

  private labelize(value: string): string {
    return value.replace(/([A-Z])/g, ' $1').replace(/^./, first => first.toUpperCase());
  }

  private nowLabel(): string {
    return new Date().toLocaleString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
