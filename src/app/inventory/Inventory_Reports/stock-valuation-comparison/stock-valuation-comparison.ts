import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgSelectModule } from '@ng-select/ng-select';

import { StatCardComponent } from '../../Inventory_Shared/stat-card/stat-card.component';
import { BarChartComponent, ChartSeries } from '../../Inventory_Shared/charts/bar-chart.component';
import { InventoryConfigService, ProductItem } from '../../Inventory_Shared/inventory-config.service';
import { InventoryReportsService, StockValuationComparison } from '../shared/inventory-reports.service';

// Item: Stock Valuation Comparison Report. The business owner asked "what
// would FIFO/LIFO/Weighted Average each say" for one product -- a
// side-by-side comparison, not a filtered table -- so unlike the other 16
// Inventory reports this does NOT go through the generic
// Inventory_Reports/report-page shell (InventoryReportPageComponent),
// which only knows how to render one flat, filterable grid. This is a
// bespoke view: a product + hypothetical-qty picker standing in for the
// usual filter row, three app-stat-card panels (one per method), a small
// app-bar-chart comparing their totals, then the underlying open cost
// layers the comparison was computed from -- read-only end to end, backed
// by inventory.sp_get_stock_valuation_comparison
// (151_stock_valuation_comparison_report.sql), which never writes
// remaining_qty.
@Component({
  selector: 'app-stock-valuation-comparison',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, StatCardComponent, BarChartComponent],
  templateUrl: './stock-valuation-comparison.html',
  styleUrl: './stock-valuation-comparison.scss'
})
export class StockValuationComparisonComponent {
  private readonly reportsService = inject(InventoryReportsService);
  private readonly configService = inject(InventoryConfigService);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<ProductItem[]>([]);
  readonly productsLoading = signal(false);
  readonly selectedProductId = signal<number | null>(null);
  readonly hypotheticalQty = signal(1);

  readonly comparison = signal<StockValuationComparison | null>(null);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly errorMessage = signal('');

  readonly selectedProduct = computed<ProductItem | null>(() => {
    const id = this.selectedProductId();
    return id ? this.products().find(p => p.id === id) ?? null : null;
  });

  readonly hasResult = computed(() => this.loaded() && !!this.comparison() && !this.errorMessage());

  readonly layers = computed(() => this.comparison()?.layers ?? []);

  readonly chartLabels = computed(() => ['FIFO', 'LIFO', 'Weighted Average']);

  readonly chartSeries = computed<ChartSeries[]>(() => {
    const result = this.comparison();
    if (!result) return [{ label: 'Cost to consume', data: [0, 0, 0] }];
    return [{
      label: `Cost to consume ${this.formatQty(result.hypotheticalQty)} ${result.uom ?? 'units'}`,
      data: [result.fifo.costConsumed, result.lifo.costConsumed, result.weightedAverage.costConsumed]
    }];
  });

  constructor() {
    this.loadProducts();
  }

  private loadProducts(): void {
    this.productsLoading.set(true);
    this.configService.getProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.products.set(res.data ?? []);
          this.productsLoading.set(false);
        },
        error: () => {
          this.products.set([]);
          this.productsLoading.set(false);
        }
      });
  }

  onProductChange(productId: number | null): void {
    this.selectedProductId.set(productId ?? null);
    this.comparison.set(null);
    this.loaded.set(false);
    this.errorMessage.set('');
  }

  onQtyChange(value: string | number): void {
    const qty = Number(value);
    this.hypotheticalQty.set(Number.isFinite(qty) && qty > 0 ? qty : 0);
  }

  generate(): void {
    const productId = this.selectedProductId();
    if (!productId) {
      this.errorMessage.set('Select a product to compare valuation methods.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.reportsService.getStockValuationComparison(productId, this.hypotheticalQty())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this.comparison.set(result);
          this.loaded.set(true);
          this.loading.set(false);
        },
        error: err => {
          this.comparison.set(null);
          this.loaded.set(true);
          this.errorMessage.set(err?.error?.message || 'Unable to load the stock valuation comparison.');
          this.loading.set(false);
        }
      });
  }

  formatCurrency(value: number | undefined | null): string {
    return `Rs. ${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  formatQty(value: number | undefined | null): string {
    return Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
  }

  formatDate(value: string | undefined | null): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
