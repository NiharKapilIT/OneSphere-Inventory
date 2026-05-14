import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import { estimationConfig } from '../../Inventory_Shared/inventory-screen.model';

@Component({
  selector: 'app-inventory-estimation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell],
  templateUrl: './estimation.html'
})
export class InventoryEstimationComponent extends InventoryScreenShell {
  override readonly config = estimationConfig;
}
