import { Routes } from '@angular/router';
import { LoginComponent } from './shared/login/login.component';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './shared/main-layout/main-layout.component/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard]
  },
  {
    path: 'dashboard',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'inventory/inventory-dashboard/dashboard',
        pathMatch: 'full'
      },
      {
        path: 'sos-dashboard',
        loadComponent: () => import('./shared/sos-dashboard/sos-dashboard.component').then(m => m.SosDashboardComponent)
      },
      {
        path: 'inventory',
        loadChildren: () => import('./features/inventory/inventory_routs').then(m => m.inventoryRoutes)
      },
      {
        path: 'admin',
        children: [
          {
            path: 'subscription',
            loadComponent: () => import('./features/settings/subscription/subscription.component').then(m => m.SubscriptionComponent)
          }
        ]
      },
      {
        path: 'settings',
        loadChildren: () => import('./features/settings/settings_routs').then(m => m.settingsRoutes)
      }
    ]
  },

  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
