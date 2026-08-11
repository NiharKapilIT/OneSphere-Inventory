import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import { salesOrderConfig } from '../../Inventory_Shared/inventory-screen.model';
import { InventoryQuickAddModalComponent } from '../../Inventory_Shared/inventory-quick-add-modal/inventory-quick-add-modal.component';
import { InventoryDeliveryAddressComponent } from '../../Inventory_Shared/inventory-delivery-address/inventory-delivery-address.component';

@Component({
  selector: 'app-inventory-sales-order',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell, InventoryQuickAddModalComponent, InventoryDeliveryAddressComponent],
  templateUrl: './sales-order.html'
})
export class InventorySalesOrderComponent extends InventoryScreenShell {
  override readonly config = salesOrderConfig;
}
