import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePickerModule } from 'primeng/datepicker';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';
import { channelPartnerMasterConfig } from '../../Inventory_Shared/inventory-screen.model';
import { InventoryQuickAddModalComponent } from '../../Inventory_Shared/inventory-quick-add-modal/inventory-quick-add-modal.component';
import { InventoryPartyFormComponent } from '../../Inventory_Shared/inventory-party-form/inventory-party-form.component';

@Component({
  selector: 'app-inventory-channel-partner-master',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule, InventoryScreenShell, InventoryQuickAddModalComponent, InventoryPartyFormComponent],
  templateUrl: '../vendor-master/vendor-master.html'
})
export class InventoryChannelPartnerMasterComponent extends InventoryScreenShell {
  override readonly config = channelPartnerMasterConfig;
}
