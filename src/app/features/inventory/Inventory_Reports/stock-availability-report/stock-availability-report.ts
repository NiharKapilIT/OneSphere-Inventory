import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { InventoryInteractiveReportComponent } from '../shared/inventory-interactive-report';
import { stockAvailabilityReportConfig } from '../../Inventory_Shared/inventory-screen.model';

@Component({
  selector: 'app-inventory-stock-availability-report',
  standalone: true,
  imports: [CommonModule, InventoryInteractiveReportComponent],
  templateUrl: './stock-availability-report.html'
})
export class InventoryStockAvailabilityReportComponent {
  readonly config = stockAvailabilityReportConfig;
}
