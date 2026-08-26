import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, EmbeddedViewRef, Input, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { BranchInvItem, WarehouseItem } from '../inventory-config.service';
import { AvailableStock, InventoryTransactionsService } from '../inventory-transactions.service';
import { VariantAttrSelection } from '../inventory-screen-shell/inventory-screen-shell';

interface BranchStockCard {
  key: string;
  branchId: number | null;
  branchName: string;
  total: number;
  warehouses: { name: string; available: number }[];
  isCurrentBranch: boolean;
}

// Pilot (Sales Invoice / Purchase Invoice / Stock Transfer only): replaces the
// wide Product ng-select + nested Variant/Attribute sub-selects that every
// other transaction grid still uses with a compact "+ Product" trigger that opens
// a top modal popup for
// Product -> Variant -> one-or-more Attributes, shows closing stock for the
// current pick, and offers an informational cross-branch stock lookup for the
// same product (no selection from those cards -- lookup only).
//
// Mounted once PER GRID ROW (inside the Product <td>, via @for), same
// @Input({required:true}) host!: any convention as
// InventoryPartyFormComponent / InventoryQuickAddModalComponent /
// InventorySerialPickerModalComponent. It calls only methods the existing
// per-cell widgets already call today -- host.setEntryLineCell() and
// host.setLineAttrValue() -- immediately per pick (not batched), so
// pricing/GST/UOM/MRP recalculation behaves identically to every other
// screen's still-wide dropdown.
//
// Popup root gets classes `inventory-modal inventory-line-product-popup` and
// its header gets `inventory-modal-header` -- both already match app.ts's
// app-wide modal-drag selectors, so dragging by the header works with zero
// changes to app.ts. Position is fixed at the top of the viewport and
// centered horizontally, then clamped with the same 12px padding convention
// app.ts's drag-move handler uses once the user starts dragging.
//
// Deliberately a body-level embedded view, not an Angular CDK Overlay: an
// earlier pass in this same round tried `@angular/cdk/overlay`
// (Overlay.create({hasBackdrop:true, ...})) to get a dimmed backdrop "for
// free". That backfired -- CDK v21's overlay wrapper can promote itself to
// the browser's native Popover-API top layer, while ng-select dropdown
// panels are still ordinary high-z-index nodes. The popup therefore uses
// normal Angular template bindings, but its rendered backdrop/popup nodes
// are moved to document.body so parent stacking contexts in the transaction
// screen cannot paint the shell/breadcrumb above it. The popup's ng-selects
// append their panels to `.inventory-line-product-popup`, keeping options in
// the same modal layer instead of dropping under the backdrop.
@Component({
  selector: 'app-inventory-line-product-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './inventory-line-product-picker.component.html',
  styleUrl: './inventory-line-product-picker.component.scss'
})
export class InventoryLineProductPickerComponent implements OnDestroy {
  @Input({ required: true }) host!: any;
  @Input({ required: true }) rowIndex!: number;
  @Input({ required: true }) column!: string;
  @Input({ required: true }) productColumnIndex!: number;
  @Input({ required: true }) variantColumnIndex!: number;
  @Input({ required: true }) attributeColumnIndex!: number;

  @ViewChild('popupRoot') private readonly popupRootRef?: ElementRef<HTMLElement>;
  @ViewChild('popupTemplate') private readonly popupTemplateRef?: TemplateRef<unknown>;
  @ViewChild('triggerBtn') private readonly triggerBtnRef?: ElementRef<HTMLElement>;

  private readonly txService = inject(InventoryTransactionsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly documentRef = inject(DOCUMENT);
  private readonly viewContainerRef = inject(ViewContainerRef);

  protected readonly popupLeft = signal(0);
  protected readonly popupTop = signal(0);

  protected readonly currentPickStockRows = signal<AvailableStock[]>([]);
  protected readonly currentPickStockLoading = signal(false);
  protected readonly branchStockRows = signal<AvailableStock[]>([]);
  protected readonly branchStockLoading = signal(false);

  private readonly currentPickQuery$ = new Subject<{ productId: number | null; variantId: number | null; attributeValue: string | null }>();
  private readonly branchQuery$ = new Subject<number | null>();

  // Bound once (not per render) so add/removeEventListener target the same
  // function reference -- mirrors app.ts's own handleModalPointerDown-style
  // convention for module-level document listeners.
  //
  // The popup's ng-select panels are appended to the popup root. Keep the
  // `.ng-dropdown-panel` guard anyway because ng-select still renders that
  // panel outside the individual <ng-select> host element, and the same
  // handler also protects any future append target changes.
  private readonly outsideClickHandler = (event: PointerEvent): void => {
    const target = event.target as Element | null;
    if (!target) return;
    if (this.popupRootRef?.nativeElement.contains(target)) return;
    if (target.closest?.('.inventory-line-product-popup')) return;
    if (this.triggerBtnRef?.nativeElement.contains(target)) return;
    if (target.closest?.('.ng-dropdown-panel')) return;
    this.close();
  };

  constructor() {
    // Both stock queries are plain reads off the existing available-stock
    // endpoint (InventoryTransactionsService.getAvailableStock) -- the same
    // one the shell's own inline stock hint already calls -- injected
    // directly here rather than routed through the shell's private
    // per-line cache, since this popup's own two panels (current-pick vs.
    // cross-branch) need independently-scoped queries.
    this.currentPickQuery$
      .pipe(
        switchMap(query => {
          if (!query.productId) return of<AvailableStock[]>([]);
          this.currentPickStockLoading.set(true);
          return this.txService.getAvailableStock(query).pipe(
            switchMap(res => of(res.data || [])),
            catchError(() => of<AvailableStock[]>([]))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(rows => {
        this.currentPickStockLoading.set(false);
        this.currentPickStockRows.set(rows);
      });

    this.branchQuery$
      .pipe(
        switchMap(productId => {
          if (!productId) return of<AvailableStock[]>([]);
          this.branchStockLoading.set(true);
          // No warehouseId/variantId -- every warehouse row for the product,
          // same shape the shell's own cross-warehouse hint already fetches.
          return this.txService.getAvailableStock({ productId }).pipe(
            switchMap(res => of(res.data || [])),
            catchError(() => of<AvailableStock[]>([]))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(rows => {
        this.branchStockLoading.set(false);
        this.branchStockRows.set(rows);
      });

    // Re-query both panels whenever this row's popup is open and its
    // product/variant/attribute selection changes -- and only then, so the
    // other (closed) row instances mounted alongside this one in the grid
    // never fire a network call.
    effect(() => {
      if (!this.isOpen()) return;
      const productId = this.resolvedProduct()?.id ?? null;
      const variantId = this.resolvedVariantId();
      const attributeValue = this.currentAttributeValue();
      this.currentPickQuery$.next({ productId, variantId, attributeValue });
      this.branchQuery$.next(productId);
    });

    // Outside-click-to-close, added/removed only while this row's popup is
    // actually open -- not a permanent per-row listener (there can be dozens
    // of grid rows, each with its own instance of this component).
    //
    // The ResizeObserver alongside it fixes a real bug caught live: the
    // popup's Product/Variant/Attribute fields and stock panels only exist
    // once picks are made and their async stock query resolves, so a popup
    // opened near the bottom of a scrolled grid can grow noticeably taller
    // AFTER openPopup()'s own one-time reclampToViewport() already ran on
    // an near-empty popup. `position: fixed` doesn't respond to page
    // scrolling either, so without this the "Add Product" footer could end
    // up genuinely unreachable -- not just visually clipped. Re-clamping on
    // every resize (not just once at open) keeps the whole popup, footer
    // included, inside the viewport as it grows or shrinks.
    effect(() => {
      if (this.isOpen()) {
        this.ensurePopupRendered();
        this.documentRef.addEventListener('pointerdown', this.outsideClickHandler, true);
        setTimeout(() => this.attachResizeObserver());
      } else {
        this.documentRef.removeEventListener('pointerdown', this.outsideClickHandler, true);
        this.detachResizeObserver();
        this.destroyPopupView();
      }
    });
  }

  ngOnDestroy(): void {
    this.documentRef.removeEventListener('pointerdown', this.outsideClickHandler, true);
    this.detachResizeObserver();
    this.destroyPopupView();
  }

  private resizeObserver: ResizeObserver | null = null;
  private popupView: EmbeddedViewRef<unknown> | null = null;
  private popupRenderQueued = false;

  private ensurePopupRendered(): void {
    if (this.popupView) return;
    if (!this.popupTemplateRef) {
      this.queuePopupRender();
      return;
    }
    this.popupView = this.viewContainerRef.createEmbeddedView(this.popupTemplateRef);
    this.popupView.detectChanges();
    for (const node of this.popupView.rootNodes) {
      if (node && typeof (node as Node).nodeType === 'number') {
        this.documentRef.body.appendChild(node as Node);
      }
    }
    setTimeout(() => {
      if (!this.isOpen()) return;
      this.popupView?.detectChanges();
      this.reclampToViewport();
      this.attachResizeObserver();
    }, 0);
  }

  private queuePopupRender(): void {
    if (this.popupRenderQueued) return;
    this.popupRenderQueued = true;
    setTimeout(() => {
      this.popupRenderQueued = false;
      if (this.isOpen()) this.ensurePopupRendered();
    }, 0);
  }

  private destroyPopupView(): void {
    const view = this.popupView;
    this.popupView = null;
    this.popupRenderQueued = false;
    if (!view) return;
    const nodes = [...view.rootNodes] as Node[];
    for (const node of nodes) {
      if (node.parentNode) node.parentNode.removeChild(node);
    }
    view.destroy();
  }

  private popupRootElement(): HTMLElement | null {
    if (this.popupRootRef?.nativeElement) return this.popupRootRef.nativeElement;
    const view = this.popupView;
    if (!view) return null;
    for (const node of view.rootNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.classList.contains('inventory-line-product-popup')) return node;
      const found = node.querySelector<HTMLElement>('.inventory-line-product-popup');
      if (found) return found;
    }
    return null;
  }

  private attachResizeObserver(): void {
    if (this.resizeObserver || !this.isOpen()) return;
    if (typeof ResizeObserver === 'undefined') return; // e.g. this component's own unit-test environment
    const root = this.popupRootElement();
    if (!root) return;
    this.resizeObserver = new ResizeObserver(() => this.reclampToViewport());
    this.resizeObserver.observe(root);
  }

  private detachResizeObserver(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  protected readonly isOpen = computed(() => this.host.activeLineProductPickerRow() === this.rowIndex);

  private readonly row = computed<string[]>(() => this.host.entryLineRows()[this.rowIndex] ?? []);

  protected readonly productValue = computed(() => this.host.lineCellValue(this.row(), this.column));
  protected readonly productOptions = computed<string[]>(() => this.host.lineColumnOptions(this.column, this.row()));

  protected readonly showVariantStep = computed(() =>
    this.variantColumnIndex >= 0 && this.host.lineColumnAppliesToRow(this.row(), 'Variant')
  );
  protected readonly variantValue = computed(() => this.host.lineCellValue(this.row(), 'Variant'));
  protected readonly variantOptions = computed<string[]>(() => this.host.lineColumnOptions('Variant', this.row()));
  protected readonly variantReadonly = computed(() => !!this.host.lineGridCellReadonly(this.rowIndex, this.row(), 'Variant'));

  protected readonly attrSelections = computed<VariantAttrSelection[]>(() =>
    this.host.lineRowAttrSelections(this.rowIndex, this.row()) || []
  );

  private readonly resolvedProduct = computed(() => this.host.findProductBySelection(this.productValue()));

  private readonly resolvedVariantId = computed<number | null>(() => {
    const product = this.resolvedProduct();
    const variantText = this.variantValue();
    if (!product || !variantText) return null;
    const options: Array<{ id: number; label: string; variant_name: string; aliases: string[] }> = this.host.productVariantOptionObjects(product) || [];
    const match = options.find(option => this.host.productVariantOptionMatches(option, variantText));
    return match?.id ?? null;
  });

  // Mirrors InventoryScreenShell's own resolveLineAttribute(): a single
  // selected attribute passes its bare value ("Red"); two or more join as
  // "Name: Value | Name2: Value2" -- the same composite key format the
  // shell's existing stock-hint code already resolves to for a multi-attribute
  // product, so this panel's numbers line up with what the inline hint shows.
  private readonly currentAttributeValue = computed<string | null>(() => {
    const groups = this.attrSelections().filter(attr => String(attr.value || '').trim());
    if (!groups.length) return null;
    if (groups.length === 1) return groups[0].value;
    return groups.map(attr => `${attr.name}: ${attr.value}`).join(' | ');
  });

  protected readonly currentPickTotal = computed(() =>
    this.currentPickStockRows().reduce((sum, row) => sum + Number(row.available || 0), 0)
  );

  // Groups the product-wide (no warehouseId) available-stock rows by branch
  // for the informational cards: warehouse_id -> branch_id via
  // host.loadedWarehouseObjects(), then branch_id -> branch name via
  // host.loadedBranchObjects() -- matching both fields BranchInvItem exposes
  // (branch_id and id) the same dual-fallback way the shell's own
  // ourBranchForRecord()/branchWarehousePool() already do, since which one
  // WarehouseItem.branch_id actually lines up with isn't pinned down by a
  // single field name alone. Sorted by total available descending, mirroring
  // the shell's own otherWarehousesWithStock() sort. Each card also carries
  // isCurrentBranch, comparing against currentBranchId() below -- purely a
  // label, cards stay non-clickable/non-selectable either way.
  protected readonly branchCards = computed<BranchStockCard[]>(() => {
    const rows = this.branchStockRows();
    if (!rows.length) return [];
    const warehouses: WarehouseItem[] = this.host.loadedWarehouseObjects() || [];
    const branches: BranchInvItem[] = this.host.loadedBranchObjects() || [];
    const currentBranchId = this.currentBranchId();
    const byBranch = new Map<string, BranchStockCard>();
    for (const stockRow of rows) {
      const available = Number(stockRow.available || 0);
      const warehouse = warehouses.find(w => Number(w.id) === Number(stockRow.warehouse_id));
      const branchIdRef = warehouse?.branch_id != null ? Number(warehouse.branch_id) : null;
      const branch = branchIdRef != null
        ? branches.find(b => Number(b.branch_id) === branchIdRef || Number(b.id) === branchIdRef)
        : null;
      const resolvedBranchId = branch ? Number(branch.branch_id ?? branch.id) : null;
      const key = branch
        ? String(branch.branch_id ?? branch.id ?? branch.branch_name)
        : `warehouse_${stockRow.warehouse_id ?? stockRow.warehouse_name ?? 'unknown'}`;
      const branchName = branch?.branch_name || warehouse?.warehouse_name || stockRow.warehouse_name || 'Unassigned';
      if (!byBranch.has(key)) {
        byBranch.set(key, {
          key,
          branchId: resolvedBranchId,
          branchName,
          total: 0,
          warehouses: [],
          isCurrentBranch: resolvedBranchId != null && currentBranchId != null && resolvedBranchId === currentBranchId
        });
      }
      const card = byBranch.get(key)!;
      card.total += available;
      card.warehouses.push({ name: warehouse?.warehouse_name || stockRow.warehouse_name || 'Warehouse', available });
    }
    return Array.from(byBranch.values()).sort((a, b) => b.total - a.total);
  });

  // Resolves "the transaction's own branch" for the current document, so the
  // matching card in Stock Across Branches can be labelled -- purely a
  // label, this never changes which cards render or that they stay
  // non-clickable. No single header field name is shared across the 3 pilot
  // screens (Sales Invoice: 'warehouse', or 'branch' once Interbranch Sale
  // is on; Purchase Invoice: 'receivingLocation', a combined branch-or-
  // warehouse field; Stock Transfer: 'fromWarehouse'), so this reads the
  // right one per host.config.key and resolves it the same
  // warehouse-then-branch dual-lookup way InventoryScreenShell's own
  // applyPurchaseInvoiceFieldDefaults()/applyDeliveryChallanFieldDefaults()
  // already do for their own combined fields -- reimplemented locally
  // (rather than promoting the shell's private findWarehouseBySelection()/
  // findBranchBySelection()) since host.loadedWarehouseObjects()/
  // host.loadedBranchObjects() already give this component everything the
  // lookup needs.
  private readonly currentBranchId = computed<number | null>(() => {
    const formValues = this.host.formValues?.() || {};
    const screenKey = this.host.config?.key || '';
    let raw = '';
    if (screenKey === 'salesInvoice') {
      const interbranch = String(formValues['interbranchSale'] || '').trim().toLowerCase() === 'yes';
      raw = interbranch ? String(formValues['branch'] || '') : String(formValues['warehouse'] || '');
    } else if (screenKey === 'stockTransfer') {
      raw = String(formValues['fromWarehouse'] || '');
    } else if (screenKey === 'purchaseInvoice') {
      raw = String(formValues['receivingLocation'] || '');
    }
    raw = raw.trim();
    if (!raw) return null;

    const key = raw.toLowerCase();
    const warehouses: WarehouseItem[] = this.host.loadedWarehouseObjects() || [];
    const warehouse = warehouses.find(w =>
      String(w.warehouse_name || '').trim().toLowerCase() === key
      || String(w.warehouse_code || '').trim().toLowerCase() === key
    );
    if (warehouse) {
      return warehouse.branch_id != null ? Number(warehouse.branch_id) : null;
    }

    const branches: BranchInvItem[] = this.host.loadedBranchObjects() || [];
    const branch = branches.find(b =>
      String(b.branch_name || '').trim().toLowerCase() === key
      || String(b.branch_code || '').trim().toLowerCase() === key
    );
    return branch ? Number(branch.branch_id ?? branch.id) : null;
  });

  protected readonly triggerLabel = computed(() => {
    const product = this.productValue();
    if (!product) return '+ Product';
    const parts = [product];
    const variant = this.variantValue();
    if (variant) parts.push(variant);
    const label = parts.join(' — ');
    const attrText = this.attrSelections()
      .filter(attr => String(attr.value || '').trim())
      .map(attr => `${attr.name}: ${attr.value}`)
      .join(', ');
    return attrText ? `${label} — ${attrText}` : label;
  });

  protected readonly triggerTitle = computed(() => this.productValue() ? this.triggerLabel() : 'Add product');

  protected readonly canOpenProductConfig = computed(() => {
    const host = this.host;
    return !!host && (
      typeof host.addProductFromLineProductPicker === 'function'
      || typeof host.addProductFromProcurementGrid === 'function'
    );
  });

  protected openPopup(event: MouseEvent): void {
    event.stopPropagation?.();
    const viewportPadding = 12;
    const estimatedWidth = Math.min(680, window.innerWidth - (viewportPadding * 2));
    const left = Math.min(
      Math.max(viewportPadding, (window.innerWidth - estimatedWidth) / 2),
      Math.max(viewportPadding, window.innerWidth - estimatedWidth - viewportPadding)
    );
    const top = viewportPadding;
    this.popupLeft.set(left);
    this.popupTop.set(top);
    this.host.activeLineProductPickerRow.set(this.rowIndex);
    this.ensurePopupRendered();
    // Re-clamp once against the popup's REAL rendered size next tick --
    // opening flush against the right/bottom edge otherwise only fit the
    // estimated width above, not whatever the content actually measures.
    setTimeout(() => this.reclampToViewport(), 0);
  }

  private reclampToViewport(): void {
    const root = this.popupRootElement();
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const viewportPadding = 12;
    const maxLeft = Math.max(viewportPadding, window.innerWidth - rect.width - viewportPadding);
    const maxTop = Math.max(viewportPadding, window.innerHeight - rect.height - viewportPadding);
    const left = Math.min(Math.max(viewportPadding, rect.left), maxLeft);
    const top = Math.min(Math.max(viewportPadding, rect.top), maxTop);
    if (left !== rect.left) this.popupLeft.set(left);
    if (top !== rect.top) this.popupTop.set(top);
  }

  protected close(): void {
    if (this.host.activeLineProductPickerRow() === this.rowIndex) {
      this.host.activeLineProductPickerRow.set(null);
    }
  }

  protected stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  protected openProductConfig(event: MouseEvent): void {
    event.stopPropagation();
    const host = this.host;
    this.close();
    if (typeof host?.addProductFromLineProductPicker === 'function') {
      host.addProductFromLineProductPicker();
      return;
    }
    if (typeof host?.addProductFromProcurementGrid === 'function') {
      host.addProductFromProcurementGrid();
    }
  }

  // Item 4 nuance: this popup writes each pick straight through to the row
  // as it happens (host.setEntryLineCell()/setLineAttrValue()) -- that part
  // stays unchanged, since Variant/Attribute options are themselves resolved
  // by re-reading the row (host.lineColumnOptions('Variant', row) etc.), so
  // deferring every write to one final batch would break the cascade. What
  // changes is that the popup no longer closes itself the moment the last
  // field lands a value -- it now only closes (finalizing the row) when the
  // user explicitly clicks "Add Product", gated by canAddProduct() below so
  // the button stays disabled until the pick is actually complete for this
  // product (variant required if the step shows and isn't readonly/prefilled;
  // every non-auto, non-readonly attribute must carry a value -- mirrors
  // exactly which fields the template renders as an editable ng-select vs. a
  // static value).
  protected readonly canAddProduct = computed(() => {
    if (!this.productValue()) return false;
    if (this.showVariantStep() && !this.variantReadonly() && !this.variantValue()) return false;
    return this.attrSelections().every(attr =>
      attr.isAuto || this.isAttributeReadonly(attr.name) || String(attr.value || '').trim().length > 0
    );
  });

  protected addProduct(): void {
    if (!this.canAddProduct()) return;
    this.close();
  }

  protected pickProduct(value: string): void {
    this.host.setEntryLineCell(this.rowIndex, this.productColumnIndex, value);
  }

  protected pickVariant(value: string): void {
    if (this.variantColumnIndex < 0) return;
    this.host.setEntryLineCell(this.rowIndex, this.variantColumnIndex, value);
  }

  protected pickAttribute(name: string, value: string | null): void {
    this.host.setLineAttrValue(this.rowIndex, name, value);
  }

  protected isAttributeReadonly(attrName: string): boolean {
    return !!this.host.lineGridCellReadonly(this.rowIndex, this.row(), attrName);
  }
}
