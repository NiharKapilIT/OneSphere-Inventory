import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { InventoryInteractiveReportComponent } from '../shared/inventory-interactive-report';
import { hsnSacReportConfig } from '../../Inventory_Shared/inventory-screen.model';

@Component({
  selector: 'app-inventory-hsn-sac-report',
  standalone: true,
  imports: [CommonModule, InventoryInteractiveReportComponent],
  templateUrl: './hsn-sac-report.html'
})
export class InventoryHsnSacReportComponent {
  readonly config = hsnSacReportConfig;
}
