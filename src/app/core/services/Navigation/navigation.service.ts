
import { Injectable } from '@angular/core';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { CommonService } from '../Common/common.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Screen {
  id: string;
  name: string;
  route: string;
  icon?: string;
  group?: string;
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
              id: 'accounts-dashboard',
              name: 'Dashboard',
              screens: [
                { id: 'accounts-dashboard', name: 'Accounts Dashboard', route: '/dashboard/accounts/accounts-dashboard/dashboard' }
              ]
            },
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
                },
                {
                  id: 'company-config',
                  name: 'Company Config',
                  route: '/dashboard/accounts/accounts-config/company-config',
                  relatedRoutes: ['/dashboard/accounts/accounts-config/company-config']
                },
    
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
              id: 'inventory-dashboard',
              name: 'Dashboard',
              screens: [
                { id: 'inventory-dashboard', name: 'Inventory Summary Dashboard', route: '/dashboard/inventory/inventory-dashboard/dashboard' }
              ]
            },
            {
              id: 'inventory-configuration',
              name: 'Configuration',
              screens: [
                { id: 'business-segments', name: 'Business Segments', route: '/dashboard/inventory/configuration/business-segments' },
                { id: 'warehouse-location-master', name: 'Warehouse Setup', route: '/dashboard/inventory/configuration/warehouse-location-master' },
                { id: 'branch-master', name: 'Branch / Store Setup', route: '/dashboard/inventory/configuration/branch-master' }
              ]
            },
            {
              id: 'inventory-masters',
              name: 'Masters',
              screens: [
                { id: 'product-service-master', name: 'Product Master', route: '/dashboard/inventory/masters/product-service-master', group: 'Product Config' },
                { id: 'category-master', name: 'Product Category', route: '/dashboard/inventory/masters/category-master', group: 'Product Config' },
                { id: 'brand-master', name: 'Brand Master', route: '/dashboard/inventory/masters/brand-master', group: 'Product Config' },
                { id: 'variant-master', name: 'Variant Master', route: '/dashboard/inventory/masters/variant-master', group: 'Product Config' },
                { id: 'attribute-master', name: 'Attribute Master', route: '/dashboard/inventory/masters/attribute-master', group: 'Product Config' },
                { id: 'uom-master', name: 'UOM Master', route: '/dashboard/inventory/masters/uom-master', group: 'Product Config' },
                { id: 'hsn-sac-mapping', name: 'Tax Classification Master', route: '/dashboard/inventory/masters/hsn-sac-mapping', group: 'Product Config' },
                { id: 'barcode-configuration', name: 'Barcode Configuration', route: '/dashboard/inventory/masters/barcode-configuration', group: 'Product Config' },
                { id: 'serial-number-policy', name: 'Serial Number Policy', route: '/dashboard/inventory/masters/serial-number-policy', group: 'Product Config' },
                { id: 'batch-lot-policy', name: 'Batch / Lot Policy', route: '/dashboard/inventory/masters/batch-lot-policy', group: 'Product Config' },
                { id: 'substitute-products', name: 'Substitute Products', route: '/dashboard/inventory/masters/substitute-products', group: 'Product Config' },
                { id: 'vendor-master', name: 'Vendor Master', route: '/dashboard/inventory/masters/vendor-master', group: 'Party & Commercial Master' },
                { id: 'customer-master', name: 'Customer Master', route: '/dashboard/inventory/masters/customer-master', group: 'Party & Commercial Master' },
                { id: 'payment-terms-master', name: 'Payment Terms Master', route: '/dashboard/inventory/masters/payment-terms-master', group: 'Party & Commercial Master' },
                { id: 'price-list-master', name: 'Price List Master', route: '/dashboard/inventory/masters/price-list-master', group: 'Party & Commercial Master' },
                { id: 'bom-master', name: 'BOM Master', route: '/dashboard/inventory/masters/bom-master', group: 'Manufacturing Master' },
                { id: 'work-center-master', name: 'Work Center Master', route: '/dashboard/inventory/masters/work-center-master', group: 'Manufacturing Master' },
                { id: 'consumption-type-master', name: 'Consumption Type Master', route: '/dashboard/inventory/masters/consumption-type-master', group: 'Operations Master' },
                { id: 'approval-workflow-master', name: 'Approval Workflow Master', route: '/dashboard/inventory/masters/approval-workflow-master', group: 'Operations Master' },
                { id: 'transporter-master', name: 'Transporter Master', route: '/dashboard/inventory/masters/transporter-master', group: 'Logistics Master' },
                { id: 'vehicle-master', name: 'Vehicle Master', route: '/dashboard/inventory/masters/vehicle-master', group: 'Logistics Master' }
              ]
            },
            {
              id: 'inventory-transactions',
              name: 'Transactions',
              screens: [
                // Procurement
                { id: 'purchase-requisition', name: 'Purchase Requisition', route: '/dashboard/inventory/transactions/purchase-requisition', group: 'Procurement' },
                { id: 'request-for-quotation', name: 'Request for Quotation', route: '/dashboard/inventory/transactions/request-for-quotation', group: 'Procurement' },
                { id: 'purchase-order', name: 'Purchase Order', route: '/dashboard/inventory/transactions/purchase-order', group: 'Procurement' },
                { id: 'goods-receipt', name: 'Goods Receipt Note (GRN)', route: '/dashboard/inventory/transactions/goods-receipt', group: 'Procurement' },
                { id: 'purchase-return', name: 'Purchase Return', route: '/dashboard/inventory/transactions/purchase-return', group: 'Procurement' },
                // Sales
                { id: 'sales-enquiry', name: 'Sales Enquiry', route: '/dashboard/inventory/transactions/sales-enquiry', group: 'Sales' },
                { id: 'sales-quotation', name: 'Sales Quotation', route: '/dashboard/inventory/transactions/sales-quotation', group: 'Sales' },
                { id: 'sales-order', name: 'Sales Order', route: '/dashboard/inventory/transactions/sales-order', group: 'Sales' },
                { id: 'delivery-challan', name: 'Delivery Challan', route: '/dashboard/inventory/transactions/delivery-challan', group: 'Sales' },
                { id: 'sales-invoice', name: 'Sales Invoice', route: '/dashboard/inventory/transactions/sales-invoice', group: 'Sales' },
                { id: 'sales-return', name: 'Sales Return', route: '/dashboard/inventory/transactions/sales-return', group: 'Sales' },
                // Inventory
                { id: 'stock-transfer', name: 'Stock Transfer', route: '/dashboard/inventory/transactions/stock-transfer', group: 'Inventory' },
                { id: 'stock-adjustment', name: 'Stock Adjustment', route: '/dashboard/inventory/transactions/stock-adjustment', group: 'Inventory' },
                { id: 'opening-stock-entry', name: 'Opening Stock Entry', route: '/dashboard/inventory/transactions/opening-stock-entry', group: 'Inventory' },
                { id: 'cycle-count', name: 'Cycle Count', route: '/dashboard/inventory/transactions/cycle-count', group: 'Inventory' },
                // Manufacturing
                { id: 'production-planning', name: 'Production Planning', route: '/dashboard/inventory/transactions/production-planning', group: 'Manufacturing' },
                { id: 'material-issue-production', name: 'Material Issue for Production', route: '/dashboard/inventory/transactions/material-issue-production', group: 'Manufacturing' },
                { id: 'production-entry', name: 'Production Entry', route: '/dashboard/inventory/transactions/production-entry', group: 'Manufacturing' },
                { id: 'production-return', name: 'Production Return', route: '/dashboard/inventory/transactions/production-return', group: 'Manufacturing' },
                // Consumption
                { id: 'material-consumption', name: 'Material Consumption', route: '/dashboard/inventory/transactions/material-consumption', group: 'Consumption' },
                { id: 'internal-issue-slip', name: 'Internal Issue Slip', route: '/dashboard/inventory/transactions/internal-issue-slip', group: 'Consumption' },
                // Logistics
                { id: 'shipment-entry', name: 'Shipment Entry', route: '/dashboard/inventory/transactions/shipment-entry', group: 'Logistics' },
                { id: 'gate-pass', name: 'Gate Pass', route: '/dashboard/inventory/transactions/gate-pass', group: 'Logistics' },
                // Financial
                { id: 'debit-note', name: 'Debit Note', route: '/dashboard/inventory/transactions/debit-note', group: 'Financial' },
                { id: 'credit-note', name: 'Credit Note', route: '/dashboard/inventory/transactions/credit-note', group: 'Financial' }
              ]
            },
            {
              id: 'inventory-reports',
              name: 'Reports',
              screens: [
                { id: 'stock-summary', name: 'Stock Summary Report', route: '/dashboard/inventory/reports/stock-summary', group: 'Stock Reports' },
                { id: 'stock-ledger', name: 'Stock Ledger Report', route: '/dashboard/inventory/reports/stock-ledger', group: 'Stock Reports' },
                { id: 'warehouse-wise-stock', name: 'Warehouse-wise Stock Report', route: '/dashboard/inventory/reports/warehouse-wise-stock', group: 'Stock Reports' },
                { id: 'purchase-order-register', name: 'Purchase Order Register', route: '/dashboard/inventory/reports/purchase-order-register', group: 'Purchase Reports' },
                { id: 'grn-register', name: 'GRN Register', route: '/dashboard/inventory/reports/grn-register', group: 'Purchase Reports' },
                { id: 'purchase-invoice-register', name: 'Purchase Invoice Register', route: '/dashboard/inventory/reports/purchase-invoice-register', group: 'Purchase Reports' },
                { id: 'sales-order-register', name: 'Sales Order Register', route: '/dashboard/inventory/reports/sales-order-register', group: 'Sales Reports' },
                { id: 'delivery-challan-register', name: 'Delivery Challan Register', route: '/dashboard/inventory/reports/delivery-challan-register', group: 'Sales Reports' },
                { id: 'sales-invoice-register', name: 'Sale Invoice Register', route: '/dashboard/inventory/reports/sales-invoice-register', group: 'Sales Reports' },
                { id: 'hsn-summary', name: 'HSN/SAC Summary Report', route: '/dashboard/inventory/reports/hsn-summary', group: 'GST & Compliance Reports' },
                { id: 'batch-serial-expiry', name: 'Batch / Serial / Expiry Report', route: '/dashboard/inventory/reports/batch-serial-expiry', group: 'Batch / Serial / Expiry Reports' },
                { id: 'product-profitability', name: 'Product Profitability Report', route: '/dashboard/inventory/reports/product-profitability', group: 'Costing & Profitability Reports' },
                { id: 'low-stock-alert', name: 'Low Stock Alert Report', route: '/dashboard/inventory/reports/low-stock-alert', group: 'Alert & Exception Reports' },
                { id: 'pending-document', name: 'Pending Document Report', route: '/dashboard/inventory/reports/pending-document', group: 'Alert & Exception Reports' }
              ]
            }
          ]
        },
        {
          id: 'hrms',
          name: 'HRMS',
          subModules: [
            {
              id: 'Dashboard',
              name: 'Dashboard',
              screens: [
                { id: 'hrms-dashboard', name: 'HRMS Dashboard', route: '/dashboard/hrms/hrms-dashboard/dashboard' }
              ]
            },
            {
              id: 'hrms-payroll',
              name: 'Payroll',
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
            },
            {
              id: 'hrms-reports',
              name: 'Report',
              screens: [
                { id: 'salary-statement', name: 'Salary Statement', route: '/dashboard/hrms/hrms-reports/salary-statement' },
                { id: 'esi-statement', name: 'ESI Statement', route: '/dashboard/hrms/hrms-reports/esi-statement' },
                { id: 'pf-statement', name: 'PF Statement', route: '/dashboard/hrms/hrms-reports/pf-statement' },
                { id: 'professional-tax', name: 'Professional Tax', route: '/dashboard/hrms/hrms-reports/professional-tax' },
                { id: 'employee-month-bonus-report', name: 'Employee Month Bonus Report', route: '/dashboard/hrms/hrms-reports/employee-month-bonus-report' },
                { id: 'earned-leaves', name: 'Earned Leaves', route: '/dashboard/hrms/hrms-reports/earned-leaves' },
                { id: 'loyalty-statement', name: 'Loyalty Statement', route: '/dashboard/hrms/hrms-reports/loyalty-statement' },
                { id: 'payslip', name: 'PaySlip', route: '/dashboard/hrms/hrms-reports/payslip' },
                { id: 'biometric-report', name: 'Biometric Report', route: '/dashboard/hrms/hrms-reports/biometric-report' },
                { id: 'transferred-employees', name: 'Transferd Employees', route: '/dashboard/hrms/hrms-reports/transferred-employees' },
                { id: 'khc-renwals', name: 'KHC Renwals', route: '/dashboard/hrms/hrms-reports/khc-renwals' },
                { id: 'allowance-details', name: 'Allowance Details', route: '/dashboard/hrms/hrms-reports/allowance-details' },
                { id: 'biometric-summary-report', name: 'Biometric Summary Report', route: '/dashboard/hrms/hrms-reports/biometric-summary-report' },
                { id: 'biometric-modifications', name: 'Biometric Modifications', route: '/dashboard/hrms/hrms-reports/biometric-modifications' }
              ]
            }
          ]
        },
        {
          id: 'settings',
          name: 'Settings',
        subModules: [
            {
              id: 'settings-dashboard',
              name: 'Dashboard',
              screens: [
                { id: 'settings-dashboard', name: 'Settings Dashboard', route: '/dashboard/settings/settings-dashboard/dashboard' }
              ]
            },
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
        },
      
      ];

    GetUserRightsBasedonRoleAnduserId(roleId:any, userId:any, branchId:any) {
         ;
        const params = new HttpParams().set('roleId', roleId).set('userId', userId).set('branchId', branchId);
        return this.commonService.getAPI('/Settings/Users/UserRights/GetUserRightsBasedonRoleAnduserId', params, 'YES');
    }
    getUnclearedChequesNotification(BranchSchema:any) {
         ;
        const params = new HttpParams().set('BranchSchema', BranchSchema);
        return this.commonService.getAPI('/Dashboard/getUnclearedChequesNotification', params, 'YES');
    }
    getUnclearedChequesNotificationDiffData(BranchSchema:any) {
         ;
        const params = new HttpParams().set('BranchSchema', BranchSchema);
        return this.commonService.getAPI('/Dashboard/getUnclearedChequesNotificationDiffData', params, 'YES');
    }
    getSubscriberBalanceNotificationDiffData(BranchSchema:any) {
         ;
        const params = new HttpParams().set('BranchSchema', BranchSchema);
        return this.commonService.getAPI('/Dashboard/getSubscriberBalanceNotificationDiffData', params, 'YES');
    }

    ShowApplicationVersionNo() {
         ;
        return this.commonService.getAPI('/Common/GetApplicationVersiono','','NO')
      }
    getSubscriberBalanceNotificationDiffReport(BranchSchema:any) {
         ;
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
