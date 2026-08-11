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
import { InventoryDeliveryAddressComponent } from '../../Inventory_Shared/inventory-delivery-address/inventory-delivery-address.component';

@Component({
  selector: 'app-inventory-sales-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell, InventoryQuickAddModalComponent, InventorySerialPickerModalComponent, InventoryDeliveryAddressComponent],
  templateUrl: './sales-invoice.html'
})
export class InventorySalesInvoiceComponent extends InventoryScreenShell {
  override readonly config = salesInvoiceConfig;

  // Transport Details is optional on a Sales Invoice — toggled with a
  // Yes/No switch instead of always being shown. `null` means "not
  // explicitly touched yet": in that state the switch auto-reflects whether
  // the loaded record already has data there, so editing an older invoice
  // with transport details filled in doesn't hide them. (The equivalent
  // Delivery Address toggle now lives on the base InventoryScreenShell —
  // see deliveryAddressEnabled()/toggleDeliveryAddress() — since Sales
  // Order and Delivery Challan share the exact same behavior.)
  private readonly transportDetailsOverride = signal<boolean | null>(null);

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
    this.transportDetailsOverride.set(null);
  }

  override editRecordByRow(row: string[]): void {
    this.transportDetailsOverride.set(null);
    super.editRecordByRow(row);
  }
}
