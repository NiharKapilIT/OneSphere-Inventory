import { Routes } from '@angular/router';

export const settingsRoutes: Routes = [
  {
    path: 'settings-dashboard',
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./settings-dashboard/settings-dashboard')
            .then(m => m.SettingsDashboard)
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
    redirectTo: 'settings-dashboard/dashboard',
    pathMatch: 'full'
  }
];
