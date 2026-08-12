import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import { salesInvoiceConfig } from '../../Inventory_Shared/inventory-screen.model';
import { InventoryQuickAddModalComponent } from '../../Inventory_Shared/inventory-quick-add-modal/inventory-quick-add-modal.component';
import { InventorySerialPickerModalComponent } from '../../Inventory_Shared/inventory-serial-picker-modal/inventory-serial-picker-modal.component';
import { InventoryDeliveryAddressComponent } from '../../Inventory_Shared/inventory-delivery-address/inventory-delivery-address.component';
import { InventoryTransportDetailsComponent } from '../../Inventory_Shared/inventory-transport-details/inventory-transport-details.component';

// Transport Details used to be a Sales-Invoice-only toggle
// (transportDetailsEnabled()/toggleTransportDetails(), backed by plain
// transportMode/vehicleNo formValues() keys) defined here. It's now the
// shared app-inventory-transport-details component (see sales-invoice.html)
// backed by inventory.inv_transport_details and InventoryScreenShell's own
// transportDetailsForm()/transportDetailsSectionEnabled(), the same
// component used across every other goods-moving transaction screen —
// so this subclass no longer needs an override of its own.
@Component({
  selector: 'app-inventory-sales-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell, InventoryQuickAddModalComponent, InventorySerialPickerModalComponent, InventoryDeliveryAddressComponent, InventoryTransportDetailsComponent],
  templateUrl: './sales-invoice.html'
})
export class InventorySalesInvoiceComponent extends InventoryScreenShell {
  override readonly config = salesInvoiceConfig;
}
