import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import { requestForQuotationConfig } from '../../Inventory_Shared/inventory-screen.model';

@Component({
  selector: 'app-inventory-request-for-quotation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell],
  templateUrl: './request-for-quotation.html'
})
export class InventoryRequestForQuotationComponent extends InventoryScreenShell {
  override readonly config = requestForQuotationConfig;
}
