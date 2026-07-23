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

@Component({
  selector: 'app-inventory-product-service-master',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell, InventoryQuickAddModalComponent],
  templateUrl: './product-service-master.html'
})
export class InventoryProductServiceMasterComponent extends InventoryScreenShell {
  override readonly config = productServiceMasterConfig;

  readonly pickedVariantId = signal<number | null>(null);

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

  readonly productNatureHints = computed(() => {
    const nature = this.selectedProductNature();
    if (!nature) return [];
    const hints: string[] = [];
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
