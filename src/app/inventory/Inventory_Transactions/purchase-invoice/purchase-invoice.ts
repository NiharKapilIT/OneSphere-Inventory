import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import { purchaseInvoiceConfig } from '../../Inventory_Shared/inventory-screen.model';
import { InventoryQuickAddModalComponent } from '../../Inventory_Shared/inventory-quick-add-modal/inventory-quick-add-modal.component';
import { InventorySerialPickerModalComponent } from '../../Inventory_Shared/inventory-serial-picker-modal/inventory-serial-picker-modal.component';

import { InventoryTransportDetailsComponent } from '../../Inventory_Shared/inventory-transport-details/inventory-transport-details.component';

@Component({
  selector: 'app-inventory-purchase-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell, InventoryQuickAddModalComponent, InventorySerialPickerModalComponent, InventoryTransportDetailsComponent],
  templateUrl: './purchase-invoice.html'
})
export class InventoryPurchaseInvoiceComponent extends InventoryScreenShell {
  override readonly config = purchaseInvoiceConfig;

  override ngOnInit(): void {
    super.ngOnInit();
    [0, 350, 900].forEach(delay => {
      setTimeout(() => {
        const alreadyPicked = String(this.formValues()['grnReference'] || '').trim();
        if (!this.editingId() && !alreadyPicked && !this.refPickerOpen()) {
          this.openPurchaseReferencePicker();
        }
      }, delay);
    });
  }
}
