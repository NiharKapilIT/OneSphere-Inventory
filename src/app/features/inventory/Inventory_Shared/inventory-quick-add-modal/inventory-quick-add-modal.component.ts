import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { QuickAddCategoryComponent } from '../quick-add-category/quick-add-category.component';

@Component({
  selector: 'app-inventory-quick-add-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, QuickAddCategoryComponent],
  templateUrl: './inventory-quick-add-modal.component.html'
})
export class InventoryQuickAddModalComponent {
  @Input({ required: true }) host!: any;
}
