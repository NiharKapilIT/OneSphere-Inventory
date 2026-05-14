import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import { deliveryChallanConfig } from '../../Inventory_Shared/inventory-screen.model';

@Component({
  selector: 'app-inventory-delivery-challan',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell],
  templateUrl: './delivery-challan.html'
})
export class InventoryDeliveryChallanComponent extends InventoryScreenShell {
  override readonly config = deliveryChallanConfig;
}
