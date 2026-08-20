import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { QuickAddCategoryComponent } from '../quick-add-category/quick-add-category.component';
import { HsnSacPickerComponent } from '../hsn-sac-picker/hsn-sac-picker.component';
import { InventoryPartyFormComponent } from '../inventory-party-form/inventory-party-form.component';
import { RemoteContactAddHostComponent } from '../remote-contact-add-host/remote-contact-add-host.component';

@Component({
  selector: 'app-inventory-quick-add-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, QuickAddCategoryComponent, HsnSacPickerComponent, InventoryPartyFormComponent, RemoteContactAddHostComponent],
  templateUrl: './inventory-quick-add-modal.component.html'
})
export class InventoryQuickAddModalComponent {
  @Input({ required: true }) host!: any;
}
