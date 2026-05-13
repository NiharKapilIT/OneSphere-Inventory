import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import { stockTransferConfig } from '../../Inventory_Shared/inventory-screen.model';

@Component({
  selector: 'app-inventory-stock-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell],
  templateUrl: './stock-transfer.html'
})
export class InventoryStockTransferComponent extends InventoryScreenShell {
  override readonly config = stockTransferConfig;
}
