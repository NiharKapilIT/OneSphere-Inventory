import { Routes } from '@angular/router';

export const inventoryRoutes: Routes = [
  {
    path: 'inventory-dashboard',
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./inventory-dashboard/inventory-dashboard')
            .then(m => m.InventoryDashboard)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: 'inventory-dashboard/dashboard',
    pathMatch: 'full'
  }
];
