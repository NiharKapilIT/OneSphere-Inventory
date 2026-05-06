import { Component } from '@angular/core';

@Component({
  selector: 'app-inventory-dashboard',
  templateUrl: './inventory-dashboard.html'
})
export class InventoryDashboard {
  stats = [
    { label: 'Cash Deposits', value: '0', icon: 'pi pi-indian-rupee text-primary fs-4' },
    { label: 'Cheque Deposits', value: '0', icon: 'pi pi-book text-success fs-4' },
    { label: 'Withdrawals', value: '0', icon: 'pi pi-arrow-circle-up text-warning fs-4' },
    { label: 'Transfers', value: '0', icon: 'pi pi-arrow-right-arrow-left text-info fs-4' }
  ];
}
