import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import { productServiceMasterConfig } from '../../Inventory_Shared/inventory-screen.model';
import { ProductItem } from '../../Inventory_Shared/inventory-config.service';
import { InventoryQuickAddModalComponent } from '../../Inventory_Shared/inventory-quick-add-modal/inventory-quick-add-modal.component';
import { HsnSacPickerComponent } from '../../Inventory_Shared/hsn-sac-picker/hsn-sac-picker.component';

@Component({
  selector: 'app-inventory-product-service-master',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell, InventoryQuickAddModalComponent, HsnSacPickerComponent],
  templateUrl: './product-service-master.html'
})
export class InventoryProductServiceMasterComponent extends InventoryScreenShell {
  override readonly config = productServiceMasterConfig;

  readonly pickedVariantId = signal<number | null>(null);
  readonly productNatureGuideVisible = signal(false);

  readonly pickedVariantPreview = computed(() => {
    const id = this.pickedVariantId();
    if (!id) return null;
    const v = this.variantObjects().find(o => o.id === id);
    if (!v) return null;
    const attrItems: { name: string; value: string }[] = (v.attributes || []).length
      ? (v.attributes!).map(a => ({ name: String(a.attribute_name || '').trim(), value: String(a.attribute_value || '').trim() })).filter(a => a.name)
      : v.attribute_name ? [{ name: v.attribute_name, value: v.attribute_value || '' }] : [];
    return { variant: v, attrItems };
  });

  readonly pickedAlreadyAdded = computed(() => {
    const id = this.pickedVariantId();
    return id ? this.selectedApplicableVariants().some(av => av.id === id) : false;
  });

  readonly selectedProductNature = computed(() => {
    const id = this.formValues()['productNatureId'];
    return id ? this.productNatureObjects.find(n => n.id === id) ?? null : null;
  });

  readonly productNatureGuideRows = computed(() =>
    this.productNatureObjects.map(nature => {
      const name = nature.type_name || '';
      const key = name.toLowerCase();
      let impact = nature.description || 'Controls stock, cost, purchase, sale and transaction behavior for this product.';

      if (key === 'physical stock') {
        impact = 'Normal stock item. GRN/opening stock increases stock, sales/dispatch/issue reduces stock, valuation and reorder controls apply.';
      } else if (key === 'raw material') {
        impact = 'Purchased input for production. Stock and cost are tracked, BOM/production can consume it, and it is normally not sold directly.';
      } else if (key === 'consumable') {
        impact = 'Internal-use stock item. Purchased into inventory, issued/consumed by departments or operations, usually not treated as a sales item.';
      } else if (key === 'fixed asset') {
        impact = 'Capital asset. Purchase and stock/serial identity can be tracked, but it is not normal sales stock; useful for asset/service-bundle mapping.';
      } else if (key === 'service') {
        impact = 'Non-stock service. No warehouse stock movement; used for purchase/sales billing, SAC/GST, pricing type and rental/service billing.';
      } else if (key === 'service bundle') {
        impact = 'Sellable package made from mapped assets/services/consumables. The bundle itself has no stock ledger; mapped child items carry tracking.';
      } else if (key === 'digital / subscription') {
        impact = 'Non-physical item or subscription. No warehouse stock movement; used for digital billing, renewals or subscription-style sales/purchase.';
      }

      return {
        id: nature.id,
        name,
        code: nature.type_code,
        impact,
        flags: [
          nature.tracks_inventory ? 'Stock' : 'No Stock',
          nature.tracks_cost ? 'Cost' : 'No Cost',
          nature.allows_purchase ? 'Purchase' : 'No Purchase',
          nature.allows_sale ? 'Sale' : 'No Sale',
          nature.allows_production ? 'Production' : '',
          nature.is_service ? 'Service' : '',
          nature.is_asset ? 'Asset' : ''
        ].filter(Boolean)
      };
    })
  );

  readonly productNatureHints = computed(() => {
    const nature = this.selectedProductNature();
    if (!nature) return [];
    const hints: string[] = this.productNatureGuideRows()
      .filter(row => row.id === nature.id)
      .map(row => row.impact);
    if (nature.tracks_inventory === false) hints.push('Not tracked as stock for this nature.');
    if (nature.allows_production) hints.push('Can be linked to a Bill of Materials as a component.');
    if (nature.allows_sale === false) hints.push('Not directly sellable — excluded from Sales product pickers.');
    return hints;
  });

  readonly selectedVariantAttributeHint = computed(() =>
    this.selectedApplicableVariantRows()
      .map(av => av.attribute_summary)
      .filter(s => !!s)
      .join(' | ')
  );

  private static readonly PRICING_TYPE_VISIBLE_NATURES = new Set(['Service', 'Service Bundle', 'Digital / Subscription']);
  private static readonly BUNDLE_ELIGIBLE_NATURES = new Set(['Fixed Asset', 'Service', 'Consumable']);

  readonly pricingTypeVisible = computed(() => {
    const natureName = this.selectedProductNature()?.type_name;
    return !!natureName && InventoryProductServiceMasterComponent.PRICING_TYPE_VISIBLE_NATURES.has(natureName);
  });

  readonly rentalUnitVisible = computed(() =>
    this.pricingTypeVisible() && this.formValues()['pricingType'] === 'Rental'
  );

  readonly bundleCompositionVisible = computed(() =>
    this.selectedProductNature()?.type_name === 'Service Bundle'
  );

  readonly bundleSectionExpanded = signal(true);

  readonly bundleEligibleProductOptions = computed(() =>
    this.loadedProductObjects().filter(p =>
      !!p.product_nature_name && InventoryProductServiceMasterComponent.BUNDLE_ELIGIBLE_NATURES.has(p.product_nature_name) && p.id !== this.editingId()
    )
  );

  findBundleEligibleProductById(id: number | null): ProductItem | null {
    if (!id) return null;
    return this.bundleEligibleProductOptions().find(p => p.id === id) ?? null;
  }

  addPickedVariant(): void {
    const id = this.pickedVariantId();
    if (!id || this.pickedAlreadyAdded()) return;
    this.onApplicableVariantIdsChange([...this.selectedApplicableVariantIds(), id]);
    this.pickedVariantId.set(null);
  }
}
