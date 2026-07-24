import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import { salesInvoiceConfig } from '../../Inventory_Shared/inventory-screen.model';
import { InventoryQuickAddModalComponent } from '../../Inventory_Shared/inventory-quick-add-modal/inventory-quick-add-modal.component';
import { InventorySerialPickerModalComponent } from '../../Inventory_Shared/inventory-serial-picker-modal/inventory-serial-picker-modal.component';

@Component({
  selector: 'app-inventory-sales-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell, InventoryQuickAddModalComponent, InventorySerialPickerModalComponent],
  templateUrl: './sales-invoice.html'
})
export class InventorySalesInvoiceComponent extends InventoryScreenShell {
  override readonly config = salesInvoiceConfig;

  // Place of Supply / Transport Details are optional on a Sales Invoice —
  // each section is toggled with a Yes/No switch instead of always being
  // shown. `null` means "not explicitly touched yet": in that state the
  // switch auto-reflects whether the loaded record already has data there,
  // so editing an older invoice with an address filled in doesn't hide it.
  private readonly placeOfSupplyOverride = signal<boolean | null>(null);
  private readonly transportDetailsOverride = signal<boolean | null>(null);

  placeOfSupplyEnabled(): boolean {
    const override = this.placeOfSupplyOverride();
    if (override !== null) return override;
    const v = this.formValues();
    return !!(v['deliveryHouseNo'] || v['deliveryStreet'] || v['deliveryState'] || v['deliveryDistrict']
      || v['deliveryCity'] || v['deliveryPincode'] || v['deliveryAddress']);
  }

  togglePlaceOfSupply(checked: boolean): void {
    this.placeOfSupplyOverride.set(checked);
    if (!checked) {
      this.formValues.update(v => ({
        ...v,
        deliveryHouseNo: '', deliveryStreet: '', deliveryState: '',
        deliveryDistrict: '', deliveryCity: '', deliveryPincode: '', deliveryAddress: ''
      }));
    }
  }

  transportDetailsEnabled(): boolean {
    const override = this.transportDetailsOverride();
    if (override !== null) return override;
    const v = this.formValues();
    return !!(v['transportMode'] || v['vehicleNo']);
  }

  toggleTransportDetails(checked: boolean): void {
    this.transportDetailsOverride.set(checked);
    if (!checked) {
      this.formValues.update(v => ({ ...v, transportMode: '', vehicleNo: '' }));
    }
  }

  override clearConfigForm(): void {
    super.clearConfigForm();
    this.placeOfSupplyOverride.set(null);
    this.transportDetailsOverride.set(null);
  }

  override editRecordByRow(row: string[]): void {
    this.placeOfSupplyOverride.set(null);
    this.transportDetailsOverride.set(null);
    super.editRecordByRow(row);
  }
}
