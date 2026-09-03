import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import { productionPlanningConfig } from '../../Inventory_Shared/inventory-screen.model';
import { InventoryQuickAddModalComponent } from '../../Inventory_Shared/inventory-quick-add-modal/inventory-quick-add-modal.component';
import { InventoryLineProductPickerComponent } from '../../Inventory_Shared/inventory-line-product-picker/inventory-line-product-picker.component';
import { InventorySerialPickerModalComponent } from '../../Inventory_Shared/inventory-serial-picker-modal/inventory-serial-picker-modal.component';

@Component({
  selector: 'app-inventory-production-planning',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell, InventoryQuickAddModalComponent, InventoryLineProductPickerComponent, InventorySerialPickerModalComponent],
  templateUrl: './production-planning.html'
})
export class InventoryProductionPlanningComponent extends InventoryScreenShell {
  override readonly config = productionPlanningConfig;
}
