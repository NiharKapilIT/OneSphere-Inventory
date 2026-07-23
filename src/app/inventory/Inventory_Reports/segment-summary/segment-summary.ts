import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { InventoryInteractiveReportComponent } from '../shared/inventory-interactive-report';
import { segmentSummaryConfig } from '../../Inventory_Shared/inventory-screen.model';

@Component({
  selector: 'app-inventory-segment-summary',
  standalone: true,
  imports: [CommonModule, InventoryInteractiveReportComponent],
  templateUrl: './segment-summary.html'
})
export class InventorySegmentSummaryComponent {
  readonly config = segmentSummaryConfig;
}
