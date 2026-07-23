import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { InventoryInteractiveReportComponent } from '../shared/inventory-interactive-report';
import { stockLedgerConfig } from '../../Inventory_Shared/inventory-screen.model';

@Component({
  selector: 'app-inventory-stock-ledger',
  standalone: true,
  imports: [CommonModule, InventoryInteractiveReportComponent],
  templateUrl: './stock-ledger.html'
})
export class InventoryStockLedgerComponent {
  readonly config = stockLedgerConfig;
}
