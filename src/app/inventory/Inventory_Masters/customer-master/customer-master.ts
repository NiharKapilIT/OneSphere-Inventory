import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import { customerMasterConfig } from '../../Inventory_Shared/inventory-screen.model';
import { InventoryQuickAddModalComponent } from '../../Inventory_Shared/inventory-quick-add-modal/inventory-quick-add-modal.component';
import { InventoryBankDetailsComponent } from '../../Inventory_Shared/inventory-bank-details/inventory-bank-details.component';

@Component({
  selector: 'app-inventory-customer-master',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell, InventoryQuickAddModalComponent, InventoryBankDetailsComponent],
  templateUrl: './customer-master.html'
})
export class InventoryCustomerMasterComponent extends InventoryScreenShell {
  override readonly config = customerMasterConfig;
}
