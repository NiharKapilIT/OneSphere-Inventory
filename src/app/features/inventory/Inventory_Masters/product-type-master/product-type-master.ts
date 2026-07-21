import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import { productTypeMasterConfig } from '../../Inventory_Shared/inventory-screen.model';
import { InventoryQuickAddModalComponent } from '../../Inventory_Shared/inventory-quick-add-modal/inventory-quick-add-modal.component';

@Component({
  selector: 'app-inventory-product-type-master',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell, InventoryQuickAddModalComponent],
  templateUrl: './product-type-master.html'
})
export class InventoryProductTypeMasterComponent extends InventoryScreenShell {
  override readonly config = productTypeMasterConfig;

  ptFlag(key: string, defaultYes = false): boolean {
    const v = this.formValues()[key];
    if (v === undefined || v === null) return defaultYes;
    return v === 'Yes' || v === true;
  }

  setPtFlag(key: string, checked: boolean): void {
    this.collectFormField(key, checked ? 'Yes' : 'No');
  }
}
