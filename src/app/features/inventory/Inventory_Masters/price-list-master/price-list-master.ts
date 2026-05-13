import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import { priceListMasterConfig } from '../../Inventory_Shared/inventory-screen.model';

@Component({
  selector: 'app-inventory-price-list-master',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell],
  templateUrl: './price-list-master.html'
})
export class InventoryPriceListMasterComponent extends InventoryScreenShell {
  override readonly config = priceListMasterConfig;
}
