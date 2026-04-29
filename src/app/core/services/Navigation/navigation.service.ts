
import { Injectable } from '@angular/core';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { CommonService } from '../Common/common.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Screen {
  id: string;
  name: string;
  route: string;
  icon?: string;
  relatedRoutes?: string[];
}

export interface SubModule {
  id: string;
  name: string;
  icon?: string;
  screens: Screen[];
}

export interface Module {
  id: string;
  name: string;
  icon?: string;
  subModules: SubModule[];
}

export interface NavigationPath {
  module: Module;
  subModule: SubModule;
  screen: Screen;
}
@Injectable({
    providedIn: 'root'
})

export class NavigationService {

    constructor(private commonService: CommonService) { }


    

      private selectedModuleSubject = new BehaviorSubject<Module | null>(null);
      private selectedSubModuleSubject = new BehaviorSubject<SubModule | null>(null);
      private selectedScreenSubject = new BehaviorSubject<Screen | null>(null);
      public selectedModule$: Observable<Module | null> = this.selectedModuleSubject.asObservable();
      public selectedSubModule$: Observable<SubModule | null> = this.selectedSubModuleSubject.asObservable();
      public selectedScreen$: Observable<Screen | null> = this.selectedScreenSubject.asObservable();
    
      private modulesData: Module[] = [
        {
          id: 'accounts',
          name: 'Accounts',
           subModules: [
            {
              id: 'accounts-config',
              name: 'Config.',
                screens: [
                {
                  id: 'bank-config',
                  name: 'Bank Configuration',
                  route: '/dashboard/accounts/accounts-config/bank-config-view',
                  relatedRoutes: ['/dashboard/accounts/accounts-config/bank-config']
                },
    
                {
                  id: 'cheque-management',
                  name: 'Cheque Management',
                  route: '/dashboard/accounts/accounts-config/cheque-management',
                  relatedRoutes: ['/dashboard/accounts/accounts-config/cheque-managementnew']
                }
    
              ]
            },
            {
              id: 'accounts-transactions',
              name: 'Transactions',
               screens: [
                {
                  id: 'general-receipt',
                  name: 'General Receipt',
                  route: '/dashboard/accounts/accounts-transactions/general-receipt',
                  relatedRoutes: [
                    '/dashboard/accounts/accounts-transactions/general-receipt-new',
                    '/general-receipt'
                  ]
                },
                {
                  id: 'payment-voucher',
                  name: 'Payment Voucher',
                  route: '/dashboard/accounts/accounts-transactions/payment-voucher',
                  relatedRoutes: [
                    '/dashboard/accounts/accounts-transactions/payment-voucher-view',
                    '/payment-voucher'
                  ]
                },
    
                {
                  id: 'journal-voucher-view',
                  name: 'Journal Voucher  ',
                  route: '/dashboard/accounts/accounts-transactions/journal-voucher-view',
                  relatedRoutes: [
                    '/dashboard/accounts/accounts-transactions/journal-voucher',
                    '/journal-voucher'
                  ]
                },
    
                //  { id: 'payment-voucher-view', name: 'Payment Voucher view', route: '/dashboard/accounts/accounts-transactions/payment-voucher-view' },
                //{ id: 'general-receipt-new', name: 'General receipt New', route: '/dashboard/accounts/accounts-transactions/general-receipt-new' },
                //{ id: 'general-receipt-view', name: 'General receipt View', route: '/dashboard/accounts/accounts-transactions/general-receipt-view' },
                // { id: 'petty-cash', name: 'Petty Cash', route: '/dashboard/accounts/accounts-transactions/petty-cash' },
                { id: 'cheques-onhand', name: 'Cheques On Hand', route: '/dashboard/accounts/accounts-transactions/cheques-onhand' },
                { id: 'cheques-inbank', name: 'Cheques In Bank', route: '/dashboard/accounts/accounts-transactions/cheques-inbank' },
                { id: 'cheques-issued', name: 'Cheques Issued', route: '/dashboard/accounts/accounts-transactions/cheques-issued' },
                {
                  id: 'petty-cash-view',
                  name: 'Petty Cash ',
                  route: '/dashboard/accounts/accounts-transactions/petty-cash-view',
                  relatedRoutes: ['/dashboard/accounts/accounts-transactions/petty-cash']
                },
    
                { id: 'general-receipt-cancel', name: 'General Receipt Cancel', route: '/dashboard/accounts/accounts-transactions/general-receipt-cancel' },
                { id: 'pettycash-receipt-cancel', name: 'Petty Cash Receipt Cancel', route: '/dashboard/accounts/accounts-transactions/pettycash-receipt-cancel' },
                // { id: 'cash-onhand', name: 'Cash On Hand', route: '/dashboard/accounts/accounts-transactions/cash-onhand' },
                { id: 'tds-jv', name: 'TDS Journal Voucher', route: '/dashboard/accounts/accounts-transactions/tds-jv' },
               // { id: 'funds-transfer-out', name: 'Funds Transfer Out', route: '/dashboard/accounts/accounts-transactions/funds-transfer-out' },
                //{ id: 'pendingfundtransfer', name: 'Pending Funds Transfer ', route: '/dashboard/accounts/accounts-transactions/pendingfundtransfer' },
                // { id: 'online-settlement', name: 'Online Settlement', route: '/dashboard/accounts/accounts-transactions/online-settlement' },
                // { id: 'online-receipts', name: 'Online Receipts', route: '/dashboard/accounts/accounts-transactions/online-receipts' },
                // { id: 'bank-transfer', name: 'Bank Transfer', route: '/dashboard/accounts/accounts-transactions/bank-transfer' },
              ]
            },
            {
              id: 'accounts-reports',
              name: 'Reports',
              screens: [
                { id: 'account-ledger', name: 'Account Ledger', route: '/dashboard/accounts/accounts-reports/account-ledger' },
                
                { id: 'cash-book', name: 'Cash Book', route: '/dashboard/accounts/accounts-reports/cash-book' },
                { id: 'bank-book', name: 'Bank Book', route: '/dashboard/accounts/accounts-reports/bank-book' },
                { id: 'day-book', name: 'Day Book', route: '/dashboard/accounts/accounts-reports/day-book' },
                { id: 'jv-list', name: 'JV List', route: '/dashboard/accounts/accounts-reports/jv-list' },
                { id: 'brs', name: 'BRS', route: '/dashboard/accounts/accounts-reports/brs' },
                { id: 'schedule-tb', name: 'Schedule TB', route: '/dashboard/accounts/accounts-reports/schedule-tb' },
                { id: 'brs-statements', name: 'BRS Statements', route: '/dashboard/accounts/accounts-reports/brs-statements' },
                { id: 'account-summary', name: 'Account Summary', route: '/dashboard/accounts/accounts-reports/account-summary' },
                { id: 'trial-balance', name: 'Trial Balance', route: '/dashboard/accounts/accounts-reports/trial-balance' },
                { id: 'comparison-tb', name: 'Comparison TB', route: '/dashboard/accounts/accounts-reports/comparison-tb' },
                { id: 'cheque-cancel', name: 'Cheque Cancel', route: '/dashboard/accounts/accounts-reports/cheque-cancel' },
                { id: 'cheque-return', name: 'Cheque Return', route: '/dashboard/accounts/accounts-reports/cheque-return' },
                { id: 'issued-cheque', name: 'Issued Cheque', route: '/dashboard/accounts/accounts-reports/issued-cheque' },
                // { id: 'receipts-and-payments', name: 'Receipts and Payments', route: '/dashboard/accounts/accounts-reports/receipts-and-payments' },
                { id: 'cheque-enquiry', name: 'Cheque Enquiry', route: '/dashboard/accounts/accounts-reports/cheque-enquiry' },
                { id: 'gst-report', name: 'GST Report', route: '/dashboard/accounts/accounts-reports/gst-report' },
                //{ id: 'trial-balance', name: 'Trial Balance', route: '/dashboard/accounts/accounts-reports/trial-balance' },
                // { id: 'online-settlement-report', name: 'Online Settlement Report', route: '/dashboard/accounts/accounts-reports/online-settlement-report' },
                // { id: 'pending-transfer', name: 'Pending Transfer', route: '/dashboard/accounts/accounts-reports/pending-transfer' },
                { id: 'tds-report', name: 'TDS Report', route: '/dashboard/accounts/accounts-reports/tds-report' },
                { id: 're-print', name: 'Re-Print', route: '/dashboard/accounts/accounts-reports/re-print' },
                { id: 'bank-entries', name: 'Bank Entries', route: '/dashboard/accounts/accounts-reports/bank-entries' },
                { id: 'ledger-extract', name: 'Ledger Extract', route: '/dashboard/accounts/accounts-reports/ledger-extract' }
              ]
            }
          ]
        },
        {
          id: 'inventory',
          name: 'Inventory',
            subModules: [
            {
              id: 'deposits',
              name: 'Deposits',
                screens: [
                { id: 'cash-deposit', name: 'Cash Deposit', route: '/dashboard/inventory/deposits/cash-deposit' },
                { id: 'cheque-deposit', name: 'Cheque Deposit', route: '/dashboard/inventory/deposits/cheque-deposit' },
                { id: 'online-deposit', name: 'Online Deposit', route: '/dashboard/inventory/deposits/online-deposit' }
              ]
            },
            {
              id: 'withdrawals',
              name: 'Withdrawals',
               screens: [
                { id: 'cash-withdrawal', name: 'Cash Withdrawal', route: '/dashboard/inventory/withdrawals/cash-withdrawal' },
                { id: 'online-transfer', name: 'Online Transfer', route: '/dashboard/inventory/withdrawals/online-transfer' },
                { id: 'cheque-withdrawal', name: 'Cheque Withdrawal', route: '/dashboard/inventory/withdrawals/cheque-withdrawal' }
              ]
            },
            {
              id: 'transfers',
              name: 'Transfers',
               screens: [
                { id: 'internal-transfer', name: 'Internal Transfer', route: '/dashboard/inventory/transfers/internal-transfer' },
                { id: 'external-transfer', name: 'External Transfer', route: '/dashboard/inventory/transfers/external-transfer' },
                { id: 'scheduled-transfer', name: 'Scheduled Transfer', route: '/dashboard/inventory/transfers/scheduled-transfer' }
              ]
            }
          ]
        },
        {
          id: 'hrms',
          name: 'HRMS',
          subModules: [
            {
              id: 'hrms-dashboard',
              name: 'Dashboard',
              screens: [
                { id: 'hrms-dashboard', name: 'HRMS Dashboard', route: '/dashboard/hrms/hrms-dashboard/dashboard' }
              ]
            },
            {
              id: 'hrms-payroll',
              name: 'HRMS Payroll',
              screens: [
                { id: 'ssc-agenda', name: 'SSC Agenda', route: '/dashboard/hrms/hrms-payroll/ssc-agenda' },
                { id: 'employee-on-roll', name: 'Employee On Roll', route: '/dashboard/hrms/hrms-payroll/employee-on-roll' },
                { id: 'employee-attendance', name: 'Employee Attendance', route: '/dashboard/hrms/hrms-payroll/employee-attendance' },
                { id: 'payroll-process', name: 'Payroll Process', route: '/dashboard/hrms/hrms-payroll/payroll-process' },
                { id: 'payroll-approval', name: 'Payroll Approval', route: '/dashboard/hrms/hrms-payroll/payroll-approval' },
                { id: 'jv-details', name: 'JV Details', route: '/dashboard/hrms/hrms-payroll/jv-details' },
                { id: 'khc-details', name: 'KHC Details', route: '/dashboard/hrms/hrms-payroll/khc-details' },
                { id: 'biometric-attendance', name: 'Biometric Attendance', route: '/dashboard/hrms/hrms-payroll/biometric-attendance' }
              ]
            }
          ]
        },
        {
          id: 'settings',
          name: 'Settings',
        subModules: [
            {
              id: 'user-management',
              name: 'User Management',
               screens: [
                { id: 'manage-users', name: 'Manage Users', route: '/dashboard/settings/user-management/manage-users' },
                { id: 'roles-permissions', name: 'Roles & Permissions', route: '/dashboard/settings/user-management/roles-permissions' },
                { id: 'user-activity', name: 'User Activity Log', route: '/dashboard/settings/user-management/user-activity' }
              ]
            },
            {
              id: 'system-config',
              name: 'System Configuration',
               screens: [
                { id: 'general-settings', name: 'General Settings', route: '/dashboard/settings/system-config/general-settings' },
                { id: 'email-config', name: 'Email Configuration', route: '/dashboard/settings/system-config/email-config' },
                { id: 'backup-restore', name: 'Backup & Restore', route: '/dashboard/settings/system-config/backup-restore' }
              ]
            }
          ]
        }
      ];

    GetUserRightsBasedonRoleAnduserId(roleId:any, userId:any, branchId:any) {
        debugger;
        const params = new HttpParams().set('roleId', roleId).set('userId', userId).set('branchId', branchId);
        return this.commonService.getAPI('/Settings/Users/UserRights/GetUserRightsBasedonRoleAnduserId', params, 'YES');
    }
    getUnclearedChequesNotification(BranchSchema:any) {
        debugger;
        const params = new HttpParams().set('BranchSchema', BranchSchema);
        return this.commonService.getAPI('/Dashboard/getUnclearedChequesNotification', params, 'YES');
    }
    getUnclearedChequesNotificationDiffData(BranchSchema:any) {
        debugger;
        const params = new HttpParams().set('BranchSchema', BranchSchema);
        return this.commonService.getAPI('/Dashboard/getUnclearedChequesNotificationDiffData', params, 'YES');
    }
    getSubscriberBalanceNotificationDiffData(BranchSchema:any) {
        debugger;
        const params = new HttpParams().set('BranchSchema', BranchSchema);
        return this.commonService.getAPI('/Dashboard/getSubscriberBalanceNotificationDiffData', params, 'YES');
    }

    ShowApplicationVersionNo() {
        debugger;
        return this.commonService.getAPI('/Common/GetApplicationVersiono','','NO')
      }
    getSubscriberBalanceNotificationDiffReport(BranchSchema:any) {
        debugger;
        const params = new HttpParams().set('BranchSchema', BranchSchema);
        return this.commonService.getAPI('/Dashboard/getSubscriberBalanceNotificationDiffReport', params, 'YES');
    }


    
//global_ERP
    
      getModules(): Module[] {
        return this.modulesData;
      }

      /** Add a brand-new top-level module (e.g. a feature module loaded lazily). */
      registerModule(module: Module): void {
        if (this.modulesData.find(m => m.id === module.id)) return;
        this.modulesData.push(module);
      }

      /** Add a sub-module to an existing module. */
      registerSubModule(moduleId: string, subModule: SubModule): void {
        const mod = this.modulesData.find(m => m.id === moduleId);
        if (!mod) return;
        if (mod.subModules.find(s => s.id === subModule.id)) return;
        mod.subModules.push(subModule);
      }

      /** Add or merge screens into an existing sub-module. */
      registerScreens(moduleId: string, subModuleId: string, screens: Screen[]): void {
        const mod = this.modulesData.find(m => m.id === moduleId);
        if (!mod) return;
        const sub = mod.subModules.find(s => s.id === subModuleId);
        if (!sub) return;
        for (const screen of screens) {
          if (!sub.screens.find(s => s.id === screen.id)) {
            sub.screens.push(screen);
          }
        }
      }

      findPathByRoute(route: string): NavigationPath | null {
        const currentRoute = this.normalizeRoute(route);

        for (const module of this.modulesData) {
          for (const subModule of module.subModules) {
            for (const screen of subModule.screens) {
              const screenRoutes = [screen.route, ...(screen.relatedRoutes ?? [])];
              const isMatch = screenRoutes.some(screenRoute =>
                this.routeMatches(currentRoute, screenRoute)
              );

              if (isMatch) {
                return { module, subModule, screen };
              }
            }
          }
        }

        return null;
      }
    
      selectModule(module: Module): void {
        this.selectedModuleSubject.next(module);
        this.selectedSubModuleSubject.next(null);
      }
    
      selectSubModule(subModule: SubModule): void {
        this.selectedSubModuleSubject.next(subModule);
      }
    
      selectScreen(screen: Screen): void {
        this.selectedScreenSubject.next(screen);
      }
    
      getSelectedModule(): Module | null {
        return this.selectedModuleSubject.value;
      }
    
      getSelectedSubModule(): SubModule | null {
        return this.selectedSubModuleSubject.value;
      }
    
      getSelectedScreen(): Screen | null {
        return this.selectedScreenSubject.value;
      }

      private routeMatches(currentRoute: string, screenRoute: string): boolean {
        const normalizedScreenRoute = this.normalizeRoute(screenRoute);
        return currentRoute === normalizedScreenRoute ||
          currentRoute.startsWith(`${normalizedScreenRoute}/`);
      }

      private normalizeRoute(route: string): string {
        const pathOnly = (route || '/').split(/[?#]/)[0] || '/';
        const withLeadingSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
        return withLeadingSlash.replace(/\/+$/, '') || '/';
      }
    
}
