import { Routes } from '@angular/router';
import { GeneralReceipt } from './Accounts_Reports/general-receipt/general-receipt';

export const accountsRoutes: Routes = [
  {
    path: 'accounts-dashboard',
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./accounts-dashboard/accounts-dashboard')
            .then(m => m.AccountsDashboard)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },

  // ✅ ACCOUNTS CONFIG
  {
    path: 'accounts-config',
    children: [
      {
        path: 'bank-config',
        loadComponent: () =>
          import('./Accounts_Config/bank-config/bank-config')
            .then(m => m.BankConfig)
      },
      {
        path: 'bank-config-view',
        loadComponent: () =>
          import('./Accounts_Config/bank-config-view/bank-config-view')
            .then(m => m.BankConfigView)
      },
      {
        path: 'cheque-management',
        loadComponent: () =>
          import('./Accounts_Config/cheque-management/cheque-management')
            .then(m => m.ChequeManagement)
      },
      {
        path: 'cheque-managementnew',
        loadComponent: () =>
          import('./Accounts_Config/cheque-managementnew/cheque-managementnew')
            .then(m => m.ChequeManagementnew)
      },
      {
        path: 'company-config',
        loadComponent: () =>
          import('./Accounts_Config/company-config/company-config')
            .then(m => m.CompanyConfig)
      }
    ]
  },

  // ✅ ACCOUNTS TRANSACTIONS
  {
    path: 'accounts-transactions',
    children: [
      {
        path: 'general-receipt',
        loadComponent: () =>
          import('./Accounts_Transactions/general-receipt/general-receipt')
            .then(m => m.GeneralReceipt)
      },
      {
        path: 'general-receipt-new',
        loadComponent: () =>
          import('./Accounts_Transactions/general-receipt-new/general-receipt-new')
            .then(m => m.GeneralReceiptNew)
      },
      {
        path: 'payment-voucher',
        loadComponent: () =>
          import('./Accounts_Transactions/payment-voucher/payment-voucher')
            .then(m => m.PaymentVoucher)
      },
      {
        path: 'payment-voucher-view',
        loadComponent: () =>
          import('./Accounts_Transactions/payment-voucher-view/payment-voucher-view')
            .then(m => m.PaymentVoucherView)
      },
      {
        path: 'journal-voucher-view',
        loadComponent: () =>
          import('./Accounts_Transactions/journal-voucher-view/journal-voucher-view')
            .then(m => m.JournalVoucherView)
      },
      {
        path: 'journal-voucher',
        loadComponent: () =>
          import('./Accounts_Transactions/journal-voucher/journal-voucher')
            .then(m => m.JournalVoucher)
      },
      {
        path: 'cheques-onhand',
        loadComponent: () =>
          import('./Accounts_Transactions/cheques-onhand/cheques-onhand')
            .then(m => m.ChequesOnhand)
      },
      {
        path: 'cheques-inbank',
        loadComponent: () =>
          import('./Accounts_Transactions/cheques-inbank/cheques-inbank')
            .then(m => m.ChequesInbank)
      },
      {
        path: 'cheques-issued',
        loadComponent: () =>
          import('./Accounts_Transactions/cheques-issued/cheques-issued')
            .then(m => m.ChequesIssued)
      },
      {
        path: 'petty-cash-view',
        loadComponent: () =>
          import('./Accounts_Transactions/petty-cash-view/petty-cash-view')
            .then(m => m.PettyCashView)
      },
      {
        path: 'petty-cash',
        loadComponent: () =>
          import('./Accounts_Transactions/petty-cash/petty-cash')
            .then(m => m.PettyCash)
      },
      {
        path: 'general-receipt-cancel',
        loadComponent: () =>
          import('./Accounts_Transactions/general-receipt-cancel/general-receipt-cancel')
            .then(m => m.GeneralReceiptCancel)
      },
      {
        path: 'pettycash-receipt-cancel',
        loadComponent: () =>
          import('./Accounts_Transactions/pettycash-receipt-cancel/pettycash-receipt-cancel')
            .then(m => m.PettycashReceiptCancel)
      },
      {
        path: 'tds-jv',
        loadComponent: () =>
          import('./Accounts_Transactions/tds-jv/tds-jv')
            .then(m => m.TdsJv)
      },
      {
        path: 'funds-transfer-out',
        loadComponent: () =>
          import('./Accounts_Transactions/fund-transfer-out/fund-transfer-out')
            .then(m => m.FundTransferOut)
      }
    ]
  },


  // ✅ ACCOUNTS REPORTS
  {
    path: 'accounts-reports',
    children: [
      {
        path: 'account-ledger',
        loadComponent: () =>
          import('./Accounts_Reports/account-ledger/account-ledger')
            .then(m => m.AccountLedger)
      },
      {
        path: 'account-summary',
        loadComponent: () =>
          import('./Accounts_Reports/account-summary/account-summary')
            .then(m => m.AccountSummary)
      },
      {
        path: 'bank-book',
        loadComponent: () =>
          import('./Accounts_Reports/bank-book/bank-book')
            .then(m => m.BankBook)
      },
      {
        path: 'bank-entries',
        loadComponent: () =>
          import('./Accounts_Reports/bank-entries/bank-entries')
            .then(m => m.BankEntries)
      },
      {
        path: 'brs',
        loadComponent: () =>
          import('./Accounts_Reports/brs/brs')
            .then(m => m.Brs)
      },
      {
        path: 'brs-statements',
        loadComponent: () =>
          import('./Accounts_Reports/brs-statements/brs-statements')
            .then(m => m.BrsStatements)
      },
      {
        path: 'cash-book',
        loadComponent: () =>
          import('./Accounts_Reports/cash-book/cash-book')
            .then(m => m.CashBook)
      },
      {
        path: 'cheque-cancel',
        loadComponent: () =>
          import('./Accounts_Reports/cheque-cancel/cheque-cancel')
            .then(m => m.ChequeCancel)
      },
      {
        path: 'cheque-enquiry',
        loadComponent: () =>
          import('./Accounts_Reports/cheque-enquiry/cheque-enquiry')
            .then(m => m.ChequeEnquiry)
      },
      {
        path: 'cheque-return',
        loadComponent: () =>
          import('./Accounts_Reports/cheque-return/cheque-return')
            .then(m => m.ChequeReturn)
      },
      {
        path: 'comparison-tb',
        loadComponent: () =>
          import('./Accounts_Reports/comparison-tb/comparison-tb')
            .then(m => m.ComparisonTb)
      },
      {
        path: 'day-book',
        loadComponent: () =>
          import('./Accounts_Reports/day-book/day-book')
            .then(m => m.DayBook)
      },
      {
        path: 'gst-report',
        loadComponent: () =>
          import('./Accounts_Reports/gst-report/gst-report')
            .then(m => m.GstReport)
      },
      {
        path: 'issued-cheque',
        loadComponent: () =>
          import('./Accounts_Reports/issued-cheque/issued-cheque')
            .then(m => m.IssuedCheque)
      },
      {
        path: 'jv-list',
        loadComponent: () =>
          import('./Accounts_Reports/jv-list/jv-list')
            .then(m => m.JvList)
      },
      {
        path: 'ledger-extract',
        loadComponent: () =>
          import('./Accounts_Reports/ledger-extract/ledger-extract')
            .then(m => m.LedgerExtract)
      },
      {
        path: 're-print',
        loadComponent: () =>
          import('./Accounts_Reports/re-print/re-print')
            .then(m => m.RePrint)
      },
      {
        path: 'schedule-tb',
        loadComponent: () =>
          import('./Accounts_Reports/schedule-tb/schedule-tb')
            .then(m => m.ScheduleTb)
      },
      {
        path: 'schedule-tb-report',
        loadComponent: () =>
          import('./Accounts_Reports/schedule-tb-report/schedule-tb-report')
            .then(m => m.ScheduleTbReport)
      },
      {
        path: 'tds-report',
        loadComponent: () =>
          import('./Accounts_Reports/tds-report/tds-report')
            .then(m => m.TdsReport)
      },
      {
        path: 'trial-balance',
        loadComponent: () =>
          import('./Accounts_Reports/trial-balance/trial-balance')
            .then(m => m.TrialBalance)
      },

     
    ]
  },
  {
    path: '',
    redirectTo: 'accounts-dashboard/dashboard',
    pathMatch: 'full'
  }
];
