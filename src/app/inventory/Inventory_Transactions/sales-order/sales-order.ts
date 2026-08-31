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

import { InventoryTransportDetailsComponent } from '../../Inventory_Shared/inventory-transport-details/inventory-transport-details.component';
import { InventoryLineProductPickerComponent } from '../../Inventory_Shared/inventory-line-product-picker/inventory-line-product-picker.component';

@Component({
  selector: 'app-inventory-sales-order',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell, InventoryQuickAddModalComponent, InventoryDeliveryAddressComponent, InventoryTransportDetailsComponent, InventoryLineProductPickerComponent],
  templateUrl: './sales-order.html',
  styles: [`
    /* Product Picker rollout: the shared .grn-grid-compact base (styles.scss)
       still sizes the Product column for the old wide ng-select + stacked
       Variant/Attribute sub-selects (560px). Those sub-selects are gone now
       (see sales-order.html -- the picker is the only control in this
       cell), so this narrows the column to fit just the compact trigger
       button, matching Purchase Invoice's own override
       (purchase-invoice.ts, .purchase-invoice-line-grid). */
    :host ::ng-deep .sales-order-line-grid .erp-table.compact th.inventory-line-col-product,
    :host ::ng-deep .sales-order-line-grid .erp-table.compact td.inventory-line-col-product {
      min-width: 190px;
      width: 190px;
    }
  `]
})
export class InventorySalesOrderComponent extends InventoryScreenShell {
  override readonly config = salesOrderConfig;
}
