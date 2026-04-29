import { Routes } from '@angular/router';

export const hrmsRoutes: Routes = [
  {
    path: 'hrms-dashboard',
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./HRMS-dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'hrms-payroll',
    children: [
      {
        path: 'ssc-agenda',
        loadComponent: () => import('./HRMS-Pay-Roll/ssc-agenda/ssc-agenda').then(m => m.SscAgenda)
      },
      {
        path: 'employee-on-roll',
        loadComponent: () => import('./HRMS-Pay-Roll/employee-on-roll/employee-on-roll').then(m => m.EmployeeOnRoll)
      },
      {
        path: 'employee-attendance',
        loadComponent: () => import('./HRMS-Pay-Roll/employee-attendance/employee-attendance').then(m => m.EmployeeAttendance)
      },
      {
        path: 'payroll-process',
        loadComponent: () => import('./HRMS-Pay-Roll/payroll-process/payroll-process').then(m => m.Payrollprocess)
      },
      {
        path: 'payroll-approval',
        loadComponent: () => import('./HRMS-Pay-Roll/payroll-approval/payroll-approval').then(m => m.PayrollApproval)
      },
      {
        path: 'jv-details',
        loadComponent: () => import('./HRMS-Pay-Roll/jv-details/jv-details').then(m => m.JvDetails)
      },
      {
        path: 'khc-details',
        loadComponent: () => import('./HRMS-Pay-Roll/khc-details/khc-details').then(m => m.KhcDetails)
      },
      {
        path: 'biometric-attendance',
        loadComponent: () => import('./HRMS-Pay-Roll/biometric-attendance/biometric-attendance').then(m => m.BiometricAttendance)
      },
      {
        path: '',
        redirectTo: 'ssc-agenda',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: 'hrms-dashboard/dashboard',
    pathMatch: 'full'
  }
];
