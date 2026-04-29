import { Routes } from '@angular/router';
import { LoginComponent } from './shared/login/login.component';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './shared/main-layout/main-layout.component/main-layout.component';
import { DashboardComponent } from './shared/dashboard/dashboard.component/dashboard.component';
import { GeneralReceipt } from './features/accounts/Accounts_Reports/general-receipt/general-receipt';
import { PaymentVoucher } from './features/accounts/Accounts_Reports/payment-voucher/payment-voucher';
import { JournalVoucher } from './features/accounts/Accounts_Reports/journal-voucher/journal-voucher';

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
    children: [
      {
        path: '',
        component: DashboardComponent
      },
      {
        path: 'contacts',
        loadComponent: () => import('./shared/contacts/contacts-list/contacts-list.component').then(m => m.ContactsListComponent)
      },
      {
        path: 'sos-dashboard',
        loadComponent: () => import('./shared/sos-dashboard/sos-dashboard.component').then(m => m.SosDashboardComponent)
      },
      {
        path: 'accounts',
        loadChildren: () => import('./features/accounts/accounts_routs').then(m => m.accountsRoutes)
      },
      {
        path: 'hrms',
        loadChildren: () => import('./features/HRMS/hrms_routs').then(m => m.hrmsRoutes)
      }
    ]
  },

  // reports
  {
    path: 'general-receipt/:id',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: GeneralReceipt
      }
    ]
  },
  {
    path: 'payment-voucher/:id',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: PaymentVoucher
      }
    ]
  },
  {
    path: 'journal-voucher/:id',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: JournalVoucher
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
