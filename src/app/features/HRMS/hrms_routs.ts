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
    path: 'hrms-reports',
    children: [
      {
        path: 'salary-statement',
        loadComponent: () => import('./HRMS-Reports/salary-statement/salary-statement').then(m => m.SalaryStatement)
      },
      {
        path: 'esi-statement',
        loadComponent: () => import('./HRMS-Reports/esi-statement/esi-statement').then(m => m.EsiStatement)
      },
      {
        path: 'pf-statement',
        loadComponent: () => import('./HRMS-Reports/pf-statement/pf-statement').then(m => m.PfStatement)
      },
      {
        path: 'professional-tax',
        loadComponent: () => import('./HRMS-Reports/professional-tax/professional-tax').then(m => m.ProfessionalTax)
      },
      {
        path: 'employee-month-bonus-report',
        loadComponent: () => import('./HRMS-Reports/employee-month-bonus-report/employee-month-bonus-report').then(m => m.EmployeeMonthBonusReport)
      },
      {
        path: 'earned-leaves',
        loadComponent: () => import('./HRMS-Reports/earned-leaves/earned-leaves').then(m => m.EarnedLeaves)
      },
      {
        path: 'loyalty-statement',
        loadComponent: () => import('./HRMS-Reports/loyalty-statement/loyalty-statement').then(m => m.LoyaltyStatement)
      },
      {
        path: 'payslip',
        loadComponent: () => import('./HRMS-Reports/payslip/payslip').then(m => m.PayslipReport)
      },
      {
        path: 'biometric-report',
        loadComponent: () => import('./HRMS-Reports/biometric-report/biometric-report').then(m => m.BiometricReportPage)
      },
      {
        path: 'transferred-employees',
        loadComponent: () => import('./HRMS-Reports/transferred-employees/transferred-employees').then(m => m.TransferredEmployees)
      },
      {
        path: 'khc-renwals',
        loadComponent: () => import('./HRMS-Reports/khc-renwals/khc-renwals').then(m => m.KhcRenwals)
      },
      {
        path: 'allowance-details',
        loadComponent: () => import('./HRMS-Reports/allowance-details/allowance-details').then(m => m.AllowanceDetails)
      },
      {
        path: 'biometric-summary-report',
        loadComponent: () => import('./HRMS-Reports/biometric-summary-report/biometric-summary-report').then(m => m.BiometricSummaryReport)
      },
      {
        path: 'biometric-modifications',
        loadComponent: () => import('./HRMS-Reports/biometric-modifications/biometric-modifications').then(m => m.BiometricModifications)
      },
      {
        path: '',
        redirectTo: 'salary-statement',
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
