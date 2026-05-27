import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { TableModule } from 'primeng/table';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface KpiCard {
  title: string;
  value: string;
  icon: string;
  text: string;
  trend: string;
  tone: string;
}

interface SummaryCard {
  title: string;
  value: string;
  icon: string;
  meta: string;
  tone: string;
}

interface CashFlowPoint {
  month: string;
  moneyIn: string;
  moneyOut: string;
  netCashFlow: string;
  moneyInPercent: number;
  moneyOutPercent: number;
  netPercent: number;
}

interface MetricRow {
  label: string;
  value: string;
  meta?: string;
  percent?: number;
  tone?: string;
}

interface PieLegend {
  label: string;
  value: string;
  shade: string;
}

interface PieChart {
  title: string;
  total: string;
  subtitle: string;
  chartClass: string;
  legends: PieLegend[];
}

interface ApprovalRow {
  requestDate: string;
  requestType: string;
  name: string;
  referenceNo: string;
  amountOrDays: string;
  status: string;
  statusClass: string;
}

interface TransactionRow {
  date: string;
  voucherNo: string;
  particulars: string;
  type: string;
  debit: string;
  credit: string;
  status: string;
  statusClass: string;
}

interface DashboardColumn {
  field: string;
  header: string;
}

type DashboardRow = Record<string, string | number>;

interface DashboardReport {
  description: string;
  columns: DashboardColumn[];
  rows: DashboardRow[];
}

interface ActiveModal {
  title: string;
  report: DashboardReport;
}

@Component({
  selector: 'app-accounts-dashboard',
  imports: [FormsModule, NgSelectModule, TableModule],
  templateUrl: './accounts-dashboard.html'
})
export class AccountsDashboard {
  financialYear: string | null = '2025-2026';
  branch: string | null = 'Head Office';
  dateRange: string | null = 'This Month';
  readonly businessOwnerEmail = '';

  showModal = false;
  activeModal: ActiveModal | null = null;

  readonly financialYears = ['2025-2026', '2024-2025', '2023-2024'];
  readonly branches = ['Head Office', 'Hyderabad Branch', 'Bengaluru Branch', 'Chennai Branch'];
  readonly dateRanges = ['Today', 'This Week', 'This Month', 'This Quarter', 'This Year'];

  readonly kpiCards: KpiCard[] = [
    { title: 'Total Receivables', value: '₹24,50,000', icon: 'pi pi-wallet', text: 'Customer outstanding amount', trend: '+8.5% from last month', tone: 'success' },
    { title: 'Total Payables', value: '₹12,80,000', icon: 'pi pi-file', text: 'Vendor pending payments', trend: '5 bills due this week', tone: 'warning' },
    { title: 'Cash & Bank Balance', value: '₹18,75,500', icon: 'pi pi-building-columns', text: 'Across all bank accounts', trend: 'Updated today', tone: 'info' },
    { title: 'Monthly Expenses', value: '₹7,40,000', icon: 'pi pi-chart-line', text: 'Payroll, rent, utilities', trend: '12% increase', tone: 'danger' }
  ];

  readonly detailReports: Record<string, DashboardReport> = {
    'Total Receivables': {
      description: 'Customer outstanding details with invoice, due date, contact, tax, and ageing data.',
      columns: [
        { field: 'customerCode', header: 'Customer Code' },
        { field: 'customerName', header: 'Customer Name' },
        { field: 'branch', header: 'Branch' },
        { field: 'invoiceNo', header: 'Invoice No' },
        { field: 'invoiceDate', header: 'Invoice Date' },
        { field: 'dueDate', header: 'Due Date' },
        { field: 'outstanding', header: 'Outstanding' },
        { field: 'ageing', header: 'Ageing' },
        { field: 'mobile', header: 'Mobile' },
        { field: 'email', header: 'Email' },
        { field: 'gstin', header: 'GSTIN' },
        { field: 'status', header: 'Status' }
      ],
      rows: [
        { customerCode: 'CUST-1001', customerName: 'Aaradhya Retail Pvt Ltd', branch: 'Head Office', invoiceNo: 'SI-0526-0018', invoiceDate: '02 May 2026', dueDate: '16 May 2026', outstanding: 'Rs. 6,75,000', ageing: '0-30 Days', mobile: '9876543201', email: 'accounts@aaradhyaretail.in', gstin: '36AARCA1122L1Z5', status: 'Follow-up' },
        { customerCode: 'CUST-1048', customerName: 'GreenMart Hyperlocal', branch: 'Hyderabad Branch', invoiceNo: 'SI-0526-0024', invoiceDate: '04 May 2026', dueDate: '19 May 2026', outstanding: 'Rs. 4,20,000', ageing: '0-30 Days', mobile: '9876543202', email: 'finance@greenmart.in', gstin: '36AAFCG4421R1Z1', status: 'Current' },
        { customerCode: 'CUST-1126', customerName: 'North Star Agencies', branch: 'Bengaluru Branch', invoiceNo: 'SI-0426-0189', invoiceDate: '18 Apr 2026', dueDate: '03 May 2026', outstanding: 'Rs. 8,15,000', ageing: '31-60 Days', mobile: '9876543203', email: 'payables@northstar.in', gstin: '29AAICN8821M1Z3', status: 'Overdue' },
        { customerCode: 'CUST-1219', customerName: 'Veda Distribution House', branch: 'Chennai Branch', invoiceNo: 'SI-0326-0277', invoiceDate: '21 Mar 2026', dueDate: '20 Apr 2026', outstanding: 'Rs. 5,40,000', ageing: '61-90 Days', mobile: '9876543204', email: 'veda.accounts@example.com', gstin: '33AADCV5532K1Z8', status: 'Escalated' }
      ]
    },
    'Total Payables': {
      description: 'Vendor payable bills with due schedule, contact details, and current approval status.',
      columns: [
        { field: 'vendorCode', header: 'Vendor Code' },
        { field: 'vendorName', header: 'Vendor Name' },
        { field: 'billNo', header: 'Bill No' },
        { field: 'billDate', header: 'Bill Date' },
        { field: 'dueDate', header: 'Due Date' },
        { field: 'payable', header: 'Payable' },
        { field: 'category', header: 'Category' },
        { field: 'mobile', header: 'Mobile' },
        { field: 'email', header: 'Email' },
        { field: 'gstin', header: 'GSTIN' },
        { field: 'status', header: 'Status' }
      ],
      rows: [
        { vendorCode: 'VEN-2041', vendorName: 'Sri Lakshmi Traders', billNo: 'BILL-7721', billDate: '29 Apr 2026', dueDate: '07 May 2026', payable: 'Rs. 3,25,000', category: 'Supplies', mobile: '9848011122', email: 'billing@slt.example.com', gstin: '36AAVFS8890P1Z2', status: 'Due This Week' },
        { vendorCode: 'VEN-2108', vendorName: 'Pragati Services', billNo: 'BILL-7788', billDate: '01 May 2026', dueDate: '11 May 2026', payable: 'Rs. 2,10,000', category: 'Maintenance', mobile: '9848011123', email: 'accounts@pragatiservices.in', gstin: '36AAJFP4322K1Z7', status: 'Pending Approval' },
        { vendorCode: 'VEN-2185', vendorName: 'Metro Utilities', billNo: 'BILL-7814', billDate: '03 May 2026', dueDate: '14 May 2026', payable: 'Rs. 1,85,000', category: 'Utilities', mobile: '9848011124', email: 'finance@metroutilities.in', gstin: '36AAJCM5522N1Z0', status: 'Scheduled' },
        { vendorCode: 'VEN-2233', vendorName: 'Payroll Statutory Payables', billNo: 'SAL-0526', billDate: '05 May 2026', dueDate: '10 May 2026', payable: 'Rs. 5,60,000', category: 'Payroll', mobile: '9848011125', email: 'payroll@example.com', gstin: 'NA', status: 'In Review' }
      ]
    },
    'Cash & Bank Balance': {
      description: 'Cash, bank, deposit, and petty cash balances across accounts.',
      columns: [
        { field: 'accountType', header: 'Account Type' },
        { field: 'accountName', header: 'Account Name' },
        { field: 'bank', header: 'Bank' },
        { field: 'accountNo', header: 'Account No' },
        { field: 'branch', header: 'Branch' },
        { field: 'ifsc', header: 'IFSC' },
        { field: 'bookBalance', header: 'Book Balance' },
        { field: 'clearedBalance', header: 'Cleared Balance' },
        { field: 'lastUpdated', header: 'Last Updated' },
        { field: 'status', header: 'Status' }
      ],
      rows: [
        { accountType: 'Cash', accountName: 'Main Cash Counter', bank: '-', accountNo: '-', branch: 'Head Office', ifsc: '-', bookBalance: 'Rs. 3,25,000', clearedBalance: 'Rs. 3,25,000', lastUpdated: '06 May 2026 10:45 AM', status: 'Tallied' },
        { accountType: 'Bank', accountName: 'Current Account', bank: 'HDFC Bank', accountNo: '50200011887441', branch: 'Hitech City', ifsc: 'HDFC0001234', bookBalance: 'Rs. 9,80,500', clearedBalance: 'Rs. 9,24,000', lastUpdated: '06 May 2026 11:20 AM', status: 'BRS Pending' },
        { accountType: 'Bank', accountName: 'Collection Account', bank: 'ICICI Bank', accountNo: '001105002884', branch: 'Madhapur', ifsc: 'ICIC0000011', bookBalance: 'Rs. 5,70,000', clearedBalance: 'Rs. 5,70,000', lastUpdated: '06 May 2026 11:05 AM', status: 'Reconciled' },
        { accountType: 'Petty Cash', accountName: 'Admin Float', bank: '-', accountNo: '-', branch: 'Head Office', ifsc: '-', bookBalance: 'Rs. 48,000', clearedBalance: 'Rs. 48,000', lastUpdated: '06 May 2026 09:40 AM', status: 'Active' }
      ]
    },
    'Monthly Expenses': {
      description: 'Current month expense postings by ledger, party, cost center, and approval state.',
      columns: [
        { field: 'voucherNo', header: 'Voucher No' },
        { field: 'date', header: 'Date' },
        { field: 'ledger', header: 'Ledger' },
        { field: 'costCenter', header: 'Cost Center' },
        { field: 'party', header: 'Party' },
        { field: 'paymentMode', header: 'Payment Mode' },
        { field: 'amount', header: 'Amount' },
        { field: 'approvedBy', header: 'Approved By' },
        { field: 'remarks', header: 'Remarks' },
        { field: 'status', header: 'Status' }
      ],
      rows: [
        { voucherNo: 'PV-1028', date: '06 May 2026', ledger: 'Rent Expense', costCenter: 'Admin', party: 'Prime Properties', paymentMode: 'Bank', amount: 'Rs. 85,000', approvedBy: 'Finance Manager', remarks: 'Monthly office rent', status: 'Posted' },
        { voucherNo: 'PV-1029', date: '06 May 2026', ledger: 'Electricity Expense', costCenter: 'Operations', party: 'Metro Utilities', paymentMode: 'UPI', amount: 'Rs. 28,500', approvedBy: 'Branch Manager', remarks: 'April usage', status: 'Posted' },
        { voucherNo: 'PV-1031', date: '05 May 2026', ledger: 'Payroll Processing', costCenter: 'HRMS', party: 'Payroll Batch May', paymentMode: 'Journal', amount: 'Rs. 38,60,000', approvedBy: 'HR Head', remarks: 'Salary provision', status: 'In Review' },
        { voucherNo: 'PV-1033', date: '05 May 2026', ledger: 'Office Supplies', costCenter: 'Admin', party: 'Sri Lakshmi Traders', paymentMode: 'Bank', amount: 'Rs. 42,500', approvedBy: 'Accounts Lead', remarks: 'Stationery and consumables', status: 'Pending' }
      ]
    },
    'Day Collection': {
      description: 'All receipts collected today across branches, modes, and customers.',
      columns: [
        { field: 'time', header: 'Time' },
        { field: 'receiptNo', header: 'Receipt No' },
        { field: 'customer', header: 'Customer' },
        { field: 'branch', header: 'Branch' },
        { field: 'mode', header: 'Mode' },
        { field: 'amount', header: 'Amount' },
        { field: 'narration', header: 'Narration' },
        { field: 'postedBy', header: 'Posted By' },
        { field: 'status', header: 'Status' }
      ],
      rows: [
        { time: '09:14 AM', receiptNo: 'GR-2218', customer: 'Aaradhya Retail Pvt Ltd', branch: 'Head Office', mode: 'Bank', amount: 'Rs. 1,42,000', narration: 'Part payment against SI-0526-0018', postedBy: 'Ravi Kumar', status: 'Posted' },
        { time: '10:32 AM', receiptNo: 'GR-2219', customer: 'GreenMart Hyperlocal', branch: 'Hyderabad Branch', mode: 'UPI', amount: 'Rs. 85,000', narration: 'Advance against new order', postedBy: 'Meena Rao', status: 'Posted' },
        { time: '11:05 AM', receiptNo: 'GR-2220', customer: 'Bharat Agencies', branch: 'Head Office', mode: 'Cheque', amount: 'Rs. 2,08,000', narration: 'Full payment invoice SI-0426-0201', postedBy: 'Ravi Kumar', status: 'Pending Clearance' },
        { time: '12:18 PM', receiptNo: 'GR-2221', customer: 'Sunrise Distributors', branch: 'Bengaluru Branch', mode: 'Cash', amount: 'Rs. 50,000', narration: 'Cash collection field team', postedBy: 'Anand Shetty', status: 'Posted' }
      ]
    },
    'Today Spend': {
      description: 'All payments and expense vouchers posted today.',
      columns: [
        { field: 'time', header: 'Time' },
        { field: 'voucherNo', header: 'Voucher No' },
        { field: 'payee', header: 'Payee' },
        { field: 'ledger', header: 'Ledger' },
        { field: 'mode', header: 'Mode' },
        { field: 'amount', header: 'Amount' },
        { field: 'approvedBy', header: 'Approved By' },
        { field: 'status', header: 'Status' }
      ],
      rows: [
        { time: '09:45 AM', voucherNo: 'PV-1028', payee: 'Prime Properties', ledger: 'Rent Expense', mode: 'Bank Transfer', amount: 'Rs. 85,000', approvedBy: 'Finance Manager', status: 'Posted' },
        { time: '10:50 AM', voucherNo: 'PV-1029', payee: 'Metro Utilities', ledger: 'Electricity Expense', mode: 'UPI', amount: 'Rs. 28,500', approvedBy: 'Branch Manager', status: 'Posted' },
        { time: '11:30 AM', voucherNo: 'PV-1030', payee: 'Sri Lakshmi Traders', ledger: 'Office Supplies', mode: 'Bank', amount: 'Rs. 29,000', approvedBy: 'Accounts Lead', status: 'Pending' }
      ]
    },
    'Total Receipts': {
      description: 'All receipt vouchers for the selected period.',
      columns: [
        { field: 'date', header: 'Date' },
        { field: 'receiptNo', header: 'Receipt No' },
        { field: 'customer', header: 'Customer' },
        { field: 'branch', header: 'Branch' },
        { field: 'mode', header: 'Mode' },
        { field: 'amount', header: 'Amount' },
        { field: 'status', header: 'Status' }
      ],
      rows: [
        { date: '06 May 2026', receiptNo: 'GR-2218', customer: 'Aaradhya Retail Pvt Ltd', branch: 'Head Office', mode: 'Bank', amount: 'Rs. 1,42,000', status: 'Posted' },
        { date: '06 May 2026', receiptNo: 'GR-2219', customer: 'GreenMart Hyperlocal', branch: 'Hyderabad Branch', mode: 'UPI', amount: 'Rs. 85,000', status: 'Posted' },
        { date: '06 May 2026', receiptNo: 'GR-2220', customer: 'Bharat Agencies', branch: 'Head Office', mode: 'Cheque', amount: 'Rs. 2,08,000', status: 'Pending Clearance' },
        { date: '05 May 2026', receiptNo: 'GR-2215', customer: 'Veda Distribution House', branch: 'Chennai Branch', mode: 'Bank', amount: 'Rs. 1,75,000', status: 'Posted' },
        { date: '05 May 2026', receiptNo: 'GR-2216', customer: 'North Star Agencies', branch: 'Bengaluru Branch', mode: 'Cash', amount: 'Rs. 75,000', status: 'Posted' }
      ]
    },
    'Payment Vouchers': {
      description: 'All payment vouchers for the selected period.',
      columns: [
        { field: 'date', header: 'Date' },
        { field: 'voucherNo', header: 'Voucher No' },
        { field: 'payee', header: 'Payee' },
        { field: 'ledger', header: 'Ledger' },
        { field: 'mode', header: 'Mode' },
        { field: 'amount', header: 'Amount' },
        { field: 'approvedBy', header: 'Approved By' },
        { field: 'status', header: 'Status' }
      ],
      rows: [
        { date: '06 May 2026', voucherNo: 'PV-1028', payee: 'Prime Properties', ledger: 'Rent Expense', mode: 'Bank', amount: 'Rs. 85,000', approvedBy: 'Finance Manager', status: 'Posted' },
        { date: '06 May 2026', voucherNo: 'PV-1029', payee: 'Metro Utilities', ledger: 'Electricity', mode: 'UPI', amount: 'Rs. 28,500', approvedBy: 'Branch Manager', status: 'Posted' },
        { date: '05 May 2026', voucherNo: 'PV-1024', payee: 'Sri Lakshmi Traders', ledger: 'Purchases', mode: 'Bank', amount: 'Rs. 64,000', approvedBy: 'Accounts Lead', status: 'Pending' },
        { date: '04 May 2026', voucherNo: 'PV-1020', payee: 'Pragati Services', ledger: 'Maintenance', mode: 'Bank', amount: 'Rs. 32,000', approvedBy: 'Finance Manager', status: 'Posted' }
      ]
    },
    'Account Balances': {
      description: 'Live cash and bank balances across all accounts and branches.',
      columns: [
        { field: 'accountType', header: 'Account Type' },
        { field: 'accountName', header: 'Account Name' },
        { field: 'bank', header: 'Bank' },
        { field: 'accountNo', header: 'Account No' },
        { field: 'branch', header: 'Branch' },
        { field: 'balance', header: 'Balance' },
        { field: 'lastUpdated', header: 'Last Updated' },
        { field: 'status', header: 'Status' }
      ],
      rows: [
        { accountType: 'Cash', accountName: 'Main Cash Counter', bank: '-', accountNo: '-', branch: 'Head Office', balance: 'Rs. 3,25,000', lastUpdated: '06 May 2026 10:45 AM', status: 'Tallied' },
        { accountType: 'Bank', accountName: 'Current Account', bank: 'HDFC Bank', accountNo: '50200011887441', branch: 'Hitech City', balance: 'Rs. 9,80,500', lastUpdated: '06 May 2026 11:20 AM', status: 'BRS Pending' },
        { accountType: 'Bank', accountName: 'Collection Account', bank: 'ICICI Bank', accountNo: '001105002884', branch: 'Madhapur', balance: 'Rs. 5,70,000', lastUpdated: '06 May 2026 11:05 AM', status: 'Reconciled' },
        { accountType: 'Petty Cash', accountName: 'Admin Float', bank: '-', accountNo: '-', branch: 'Head Office', balance: 'Rs. 48,000', lastUpdated: '06 May 2026 09:40 AM', status: 'Active' },
        { accountType: 'Fixed Deposit', accountName: 'FD Account', bank: 'SBI', accountNo: '31445512890', branch: 'Head Office', balance: 'Rs. 42,00,000', lastUpdated: '01 May 2026', status: 'Active' }
      ]
    },
    'GST / TDS Summary': {
      description: 'GST payable, input credit, TDS deducted, and filing due dates for compliance tracking.',
      columns: [
        { field: 'taxType', header: 'Tax Type' },
        { field: 'description', header: 'Description' },
        { field: 'period', header: 'Period' },
        { field: 'taxAmount', header: 'Tax Amount' },
        { field: 'credit', header: 'Credit / Deducted' },
        { field: 'netPayable', header: 'Net Payable' },
        { field: 'dueDate', header: 'Due Date' },
        { field: 'status', header: 'Status' }
      ],
      rows: [
        { taxType: 'GST', description: 'CGST + SGST Output', period: 'May 2026', taxAmount: 'Rs. 2,18,000', credit: 'Rs. 1,46,500', netPayable: 'Rs. 71,500', dueDate: '20 Jun 2026', status: 'Pending' },
        { taxType: 'GST', description: 'GST Input Credit', period: 'May 2026', taxAmount: '-', credit: 'Rs. 1,46,500', netPayable: '-', dueDate: '20 Jun 2026', status: 'Available' },
        { taxType: 'TDS', description: 'Salary TDS (192)', period: 'May 2026', taxAmount: 'Rs. 58,400', credit: 'Rs. 58,400', netPayable: 'Rs. 58,400', dueDate: '07 Jun 2026', status: 'Payable' },
        { taxType: 'TDS', description: 'Vendor TDS (194C)', period: 'May 2026', taxAmount: 'Rs. 35,850', credit: 'Rs. 35,850', netPayable: 'Rs. 35,850', dueDate: '07 Jun 2026', status: 'Payable' }
      ]
    },

    // ── Cash Flow chart drill-downs ──
    'Cash Flow Overview': {
      description: 'Month-wise money-in, money-out and net cash position for the financial year.',
      columns: [
        { field: 'month', header: 'Month' },
        { field: 'openingBalance', header: 'Opening Balance' },
        { field: 'totalIn', header: 'Total Money In' },
        { field: 'totalOut', header: 'Total Money Out' },
        { field: 'netFlow', header: 'Net Cash Flow' },
        { field: 'closingBalance', header: 'Closing Balance' },
        { field: 'receipts', header: 'No. of Receipts' },
        { field: 'payments', header: 'No. of Payments' }
      ],
      rows: [
        { month: 'May 2025', openingBalance: 'Rs. 9,80,000', totalIn: 'Rs. 7,80,000', totalOut: 'Rs. 5,80,000', netFlow: 'Rs. 2,00,000', closingBalance: 'Rs. 11,80,000', receipts: 34, payments: 24 },
        { month: 'June 2025', openingBalance: 'Rs. 11,80,000', totalIn: 'Rs. 7,20,000', totalOut: 'Rs. 5,50,000', netFlow: 'Rs. 1,70,000', closingBalance: 'Rs. 13,50,000', receipts: 31, payments: 21 },
        { month: 'July 2025', openingBalance: 'Rs. 13,50,000', totalIn: 'Rs. 8,40,000', totalOut: 'Rs. 6,10,000', netFlow: 'Rs. 2,30,000', closingBalance: 'Rs. 15,80,000', receipts: 37, payments: 26 },
        { month: 'August 2025', openingBalance: 'Rs. 15,80,000', totalIn: 'Rs. 6,90,000', totalOut: 'Rs. 5,30,000', netFlow: 'Rs. 1,60,000', closingBalance: 'Rs. 17,40,000', receipts: 29, payments: 20 },
        { month: 'September 2025', openingBalance: 'Rs. 17,40,000', totalIn: 'Rs. 7,50,000', totalOut: 'Rs. 5,70,000', netFlow: 'Rs. 1,80,000', closingBalance: 'Rs. 19,20,000', receipts: 32, payments: 22 },
        { month: 'October 2025', openingBalance: 'Rs. 19,20,000', totalIn: 'Rs. 8,80,000', totalOut: 'Rs. 6,40,000', netFlow: 'Rs. 2,40,000', closingBalance: 'Rs. 21,60,000', receipts: 39, payments: 27 },
        { month: 'November 2025', openingBalance: 'Rs. 21,60,000', totalIn: 'Rs. 9,20,000', totalOut: 'Rs. 7,10,000', netFlow: 'Rs. 2,10,000', closingBalance: 'Rs. 23,70,000', receipts: 42, payments: 31 },
        { month: 'December 2025', openingBalance: 'Rs. 23,70,000', totalIn: 'Rs. 10,50,000', totalOut: 'Rs. 8,20,000', netFlow: 'Rs. 2,30,000', closingBalance: 'Rs. 26,00,000', receipts: 48, payments: 35 },
        { month: 'January 2026', openingBalance: 'Rs. 26,00,000', totalIn: 'Rs. 5,80,000', totalOut: 'Rs. 4,20,000', netFlow: 'Rs. 1,60,000', closingBalance: 'Rs. 27,60,000', receipts: 28, payments: 19 },
        { month: 'February 2026', openingBalance: 'Rs. 27,60,000', totalIn: 'Rs. 6,40,000', totalOut: 'Rs. 4,90,000', netFlow: 'Rs. 1,50,000', closingBalance: 'Rs. 29,10,000', receipts: 31, payments: 22 },
        { month: 'March 2026', openingBalance: 'Rs. 29,10,000', totalIn: 'Rs. 7,20,000', totalOut: 'Rs. 5,80,000', netFlow: 'Rs. 1,40,000', closingBalance: 'Rs. 30,50,000', receipts: 36, payments: 27 },
        { month: 'April 2026', openingBalance: 'Rs. 30,50,000', totalIn: 'Rs. 5,90,000', totalOut: 'Rs. 6,30,000', netFlow: '-Rs. 40,000', closingBalance: 'Rs. 30,10,000', receipts: 29, payments: 33 },
        { month: 'May 2026', openingBalance: 'Rs. 30,10,000', totalIn: 'Rs. 8,10,000', totalOut: 'Rs. 5,60,000', netFlow: 'Rs. 2,50,000', closingBalance: 'Rs. 32,60,000', receipts: 38, payments: 21 }
      ]
    },
    'Cash Flow - May 25': {
      description: 'May 2025 – detailed transaction ledger (money in and money out).',
      columns: [
        { field: 'date', header: 'Date' }, { field: 'voucherNo', header: 'Voucher No' },
        { field: 'particulars', header: 'Particulars' }, { field: 'type', header: 'Type' },
        { field: 'mode', header: 'Mode' }, { field: 'debit', header: 'Money Out' },
        { field: 'credit', header: 'Money In' }, { field: 'balance', header: 'Balance' }
      ],
      rows: [
        { date: '03 May 2025', voucherNo: 'GR-1401', particulars: 'Customer Receipt – Sunrise Dist.', type: 'Receipt', mode: 'Bank', debit: '-', credit: 'Rs. 2,10,000', balance: 'Rs. 11,90,000' },
        { date: '08 May 2025', voucherNo: 'PV-0601', particulars: 'Vendor Payment – Sri Lakshmi Traders', type: 'Payment', mode: 'Bank', debit: 'Rs. 95,000', credit: '-', balance: 'Rs. 10,95,000' },
        { date: '15 May 2025', voucherNo: 'GR-1418', particulars: 'Customer Receipt – GreenMart', type: 'Receipt', mode: 'UPI', debit: '-', credit: 'Rs. 2,80,000', balance: 'Rs. 13,75,000' },
        { date: '25 May 2025', voucherNo: 'PV-0614', particulars: 'Salary Disbursement', type: 'Payment', mode: 'Bank', debit: 'Rs. 3,86,000', credit: '-', balance: 'Rs. 9,89,000' }
      ]
    },
    'Cash Flow - Jun 25': {
      description: 'June 2025 – detailed transaction ledger (money in and money out).',
      columns: [
        { field: 'date', header: 'Date' }, { field: 'voucherNo', header: 'Voucher No' },
        { field: 'particulars', header: 'Particulars' }, { field: 'type', header: 'Type' },
        { field: 'mode', header: 'Mode' }, { field: 'debit', header: 'Money Out' },
        { field: 'credit', header: 'Money In' }, { field: 'balance', header: 'Balance' }
      ],
      rows: [
        { date: '04 Jun 2025', voucherNo: 'GR-1501', particulars: 'Customer Receipt – Veda Distribution', type: 'Receipt', mode: 'Bank', debit: '-', credit: 'Rs. 1,90,000', balance: 'Rs. 11,79,000' },
        { date: '12 Jun 2025', voucherNo: 'PV-0631', particulars: 'Office Rent – Prime Properties', type: 'Payment', mode: 'Bank', debit: 'Rs. 85,000', credit: '-', balance: 'Rs. 10,94,000' },
        { date: '20 Jun 2025', voucherNo: 'GR-1518', particulars: 'Customer Receipt – North Star', type: 'Receipt', mode: 'Cheque', debit: '-', credit: 'Rs. 2,35,000', balance: 'Rs. 13,29,000' },
        { date: '28 Jun 2025', voucherNo: 'PV-0648', particulars: 'Salary Disbursement', type: 'Payment', mode: 'Bank', debit: 'Rs. 3,86,000', credit: '-', balance: 'Rs. 9,43,000' }
      ]
    },
    'Cash Flow - Jul 25': {
      description: 'July 2025 – detailed transaction ledger (money in and money out).',
      columns: [
        { field: 'date', header: 'Date' }, { field: 'voucherNo', header: 'Voucher No' },
        { field: 'particulars', header: 'Particulars' }, { field: 'type', header: 'Type' },
        { field: 'mode', header: 'Mode' }, { field: 'debit', header: 'Money Out' },
        { field: 'credit', header: 'Money In' }, { field: 'balance', header: 'Balance' }
      ],
      rows: [
        { date: '02 Jul 2025', voucherNo: 'GR-1601', particulars: 'Customer Receipt – Aaradhya Retail', type: 'Receipt', mode: 'Bank', debit: '-', credit: 'Rs. 3,10,000', balance: 'Rs. 12,53,000' },
        { date: '09 Jul 2025', voucherNo: 'PV-0661', particulars: 'Vendor Payment – Metro Utilities', type: 'Payment', mode: 'UPI', debit: 'Rs. 42,000', credit: '-', balance: 'Rs. 12,11,000' },
        { date: '17 Jul 2025', voucherNo: 'GR-1619', particulars: 'Customer Receipt – Bharat Agencies', type: 'Receipt', mode: 'Bank', debit: '-', credit: 'Rs. 2,50,000', balance: 'Rs. 14,61,000' },
        { date: '29 Jul 2025', voucherNo: 'PV-0678', particulars: 'Salary Disbursement', type: 'Payment', mode: 'Bank', debit: 'Rs. 3,86,000', credit: '-', balance: 'Rs. 10,75,000' }
      ]
    },
    'Cash Flow - Aug 25': {
      description: 'August 2025 – detailed transaction ledger (money in and money out).',
      columns: [
        { field: 'date', header: 'Date' }, { field: 'voucherNo', header: 'Voucher No' },
        { field: 'particulars', header: 'Particulars' }, { field: 'type', header: 'Type' },
        { field: 'mode', header: 'Mode' }, { field: 'debit', header: 'Money Out' },
        { field: 'credit', header: 'Money In' }, { field: 'balance', header: 'Balance' }
      ],
      rows: [
        { date: '05 Aug 2025', voucherNo: 'GR-1701', particulars: 'Customer Receipt – GreenMart', type: 'Receipt', mode: 'UPI', debit: '-', credit: 'Rs. 1,80,000', balance: 'Rs. 12,55,000' },
        { date: '13 Aug 2025', voucherNo: 'PV-0701', particulars: 'GST Payment', type: 'Payment', mode: 'Bank', debit: 'Rs. 68,500', credit: '-', balance: 'Rs. 11,86,500' },
        { date: '21 Aug 2025', voucherNo: 'GR-1718', particulars: 'Customer Receipt – Sunrise Dist.', type: 'Receipt', mode: 'Bank', debit: '-', credit: 'Rs. 2,40,000', balance: 'Rs. 14,26,500' },
        { date: '30 Aug 2025', voucherNo: 'PV-0718', particulars: 'Salary Disbursement', type: 'Payment', mode: 'Bank', debit: 'Rs. 3,86,000', credit: '-', balance: 'Rs. 10,40,500' }
      ]
    },
    'Cash Flow - Sep 25': {
      description: 'September 2025 – detailed transaction ledger (money in and money out).',
      columns: [
        { field: 'date', header: 'Date' }, { field: 'voucherNo', header: 'Voucher No' },
        { field: 'particulars', header: 'Particulars' }, { field: 'type', header: 'Type' },
        { field: 'mode', header: 'Mode' }, { field: 'debit', header: 'Money Out' },
        { field: 'credit', header: 'Money In' }, { field: 'balance', header: 'Balance' }
      ],
      rows: [
        { date: '03 Sep 2025', voucherNo: 'GR-1801', particulars: 'Customer Receipt – North Star', type: 'Receipt', mode: 'Bank', debit: '-', credit: 'Rs. 2,20,000', balance: 'Rs. 12,60,500' },
        { date: '10 Sep 2025', voucherNo: 'PV-0731', particulars: 'Vendor Payment – Pragati Services', type: 'Payment', mode: 'Bank', debit: 'Rs. 1,10,000', credit: '-', balance: 'Rs. 11,50,500' },
        { date: '19 Sep 2025', voucherNo: 'GR-1819', particulars: 'Customer Receipt – Veda Distribution', type: 'Receipt', mode: 'Cheque', debit: '-', credit: 'Rs. 1,95,000', balance: 'Rs. 13,45,500' },
        { date: '27 Sep 2025', voucherNo: 'PV-0748', particulars: 'Salary Disbursement', type: 'Payment', mode: 'Bank', debit: 'Rs. 3,86,000', credit: '-', balance: 'Rs. 9,59,500' }
      ]
    },
    'Cash Flow - Oct 25': {
      description: 'October 2025 – detailed transaction ledger (money in and money out).',
      columns: [
        { field: 'date', header: 'Date' }, { field: 'voucherNo', header: 'Voucher No' },
        { field: 'particulars', header: 'Particulars' }, { field: 'type', header: 'Type' },
        { field: 'mode', header: 'Mode' }, { field: 'debit', header: 'Money Out' },
        { field: 'credit', header: 'Money In' }, { field: 'balance', header: 'Balance' }
      ],
      rows: [
        { date: '04 Oct 2025', voucherNo: 'GR-1881', particulars: 'Customer Receipt – Aaradhya Retail', type: 'Receipt', mode: 'Bank', debit: '-', credit: 'Rs. 2,60,000', balance: 'Rs. 12,19,500' },
        { date: '11 Oct 2025', voucherNo: 'PV-0761', particulars: 'TDS Payment', type: 'Payment', mode: 'Bank', debit: 'Rs. 92,000', credit: '-', balance: 'Rs. 11,27,500' },
        { date: '18 Oct 2025', voucherNo: 'GR-1898', particulars: 'Customer Receipt – Bharat Agencies', type: 'Receipt', mode: 'UPI', debit: '-', credit: 'Rs. 3,40,000', balance: 'Rs. 14,67,500' },
        { date: '30 Oct 2025', voucherNo: 'PV-0778', particulars: 'Salary Disbursement', type: 'Payment', mode: 'Bank', debit: 'Rs. 3,86,000', credit: '-', balance: 'Rs. 10,81,500' }
      ]
    },
    'Cash Flow - Nov 25': {
      description: 'November 2025 – detailed transaction ledger (money in and money out).',
      columns: [
        { field: 'date', header: 'Date' }, { field: 'voucherNo', header: 'Voucher No' },
        { field: 'particulars', header: 'Particulars' }, { field: 'type', header: 'Type' },
        { field: 'mode', header: 'Mode' }, { field: 'debit', header: 'Money Out' },
        { field: 'credit', header: 'Money In' }, { field: 'balance', header: 'Balance' }
      ],
      rows: [
        { date: '05 Nov 2025', voucherNo: 'GR-1921', particulars: 'Customer Receipt – GreenMart', type: 'Receipt', mode: 'Bank', debit: '-', credit: 'Rs. 2,80,000', balance: 'Rs. 13,61,500' },
        { date: '12 Nov 2025', voucherNo: 'PV-0801', particulars: 'Vendor Payment – Sri Lakshmi Traders', type: 'Payment', mode: 'Bank', debit: 'Rs. 85,000', credit: '-', balance: 'Rs. 12,76,500' },
        { date: '21 Nov 2025', voucherNo: 'GR-1938', particulars: 'Customer Receipt – Sunrise Dist.', type: 'Receipt', mode: 'Cheque', debit: '-', credit: 'Rs. 3,10,000', balance: 'Rs. 15,86,500' },
        { date: '29 Nov 2025', voucherNo: 'PV-0818', particulars: 'Salary Disbursement', type: 'Payment', mode: 'Bank', debit: 'Rs. 3,86,000', credit: '-', balance: 'Rs. 12,00,500' }
      ]
    },
    'Cash Flow - Dec 25': {
      description: 'December 2025 – detailed transaction ledger (money in and money out).',
      columns: [
        { field: 'date', header: 'Date' }, { field: 'voucherNo', header: 'Voucher No' },
        { field: 'particulars', header: 'Particulars' }, { field: 'type', header: 'Type' },
        { field: 'mode', header: 'Mode' }, { field: 'debit', header: 'Money Out' },
        { field: 'credit', header: 'Money In' }, { field: 'balance', header: 'Balance' }
      ],
      rows: [
        { date: '03 Dec 2025', voucherNo: 'GR-1961', particulars: 'Customer Receipt – North Star', type: 'Receipt', mode: 'Bank', debit: '-', credit: 'Rs. 3,50,000', balance: 'Rs. 15,50,500' },
        { date: '10 Dec 2025', voucherNo: 'PV-0841', particulars: 'Office Rent – Prime Properties', type: 'Payment', mode: 'Bank', debit: 'Rs. 85,000', credit: '-', balance: 'Rs. 14,65,500' },
        { date: '17 Dec 2025', voucherNo: 'GR-1978', particulars: 'Customer Receipt – Veda Distribution', type: 'Receipt', mode: 'UPI', debit: '-', credit: 'Rs. 4,10,000', balance: 'Rs. 18,75,500' },
        { date: '28 Dec 2025', voucherNo: 'PV-0858', particulars: 'Salary Disbursement', type: 'Payment', mode: 'Bank', debit: 'Rs. 3,86,000', credit: '-', balance: 'Rs. 14,89,500' }
      ]
    },
    'Cash Flow - Jan 26': {
      description: 'January 2026 – detailed transaction ledger (money in and money out).',
      columns: [
        { field: 'date', header: 'Date' }, { field: 'voucherNo', header: 'Voucher No' },
        { field: 'particulars', header: 'Particulars' }, { field: 'type', header: 'Type' },
        { field: 'mode', header: 'Mode' }, { field: 'debit', header: 'Money Out' },
        { field: 'credit', header: 'Money In' }, { field: 'balance', header: 'Balance' }
      ],
      rows: [
        { date: '03 Jan 2026', voucherNo: 'GR-1902', particulars: 'Customer Receipt – Sunrise Dist.', type: 'Receipt', mode: 'Bank', debit: '-', credit: 'Rs. 1,85,000', balance: 'Rs. 13,25,000' },
        { date: '07 Jan 2026', voucherNo: 'PV-0881', particulars: 'Vendor Payment – Sri Lakshmi Traders', type: 'Payment', mode: 'Bank', debit: 'Rs. 72,000', credit: '-', balance: 'Rs. 12,53,000' },
        { date: '12 Jan 2026', voucherNo: 'GR-1918', particulars: 'Customer Receipt – GreenMart', type: 'Receipt', mode: 'UPI', debit: '-', credit: 'Rs. 2,40,000', balance: 'Rs. 14,93,000' },
        { date: '21 Jan 2026', voucherNo: 'PV-0892', particulars: 'Rent – Prime Properties', type: 'Payment', mode: 'Bank', debit: 'Rs. 85,000', credit: '-', balance: 'Rs. 14,08,000' },
        { date: '28 Jan 2026', voucherNo: 'GR-1934', particulars: 'Customer Receipt – North Star', type: 'Receipt', mode: 'Cheque', debit: '-', credit: 'Rs. 1,55,000', balance: 'Rs. 15,63,000' }
      ]
    },
    'Cash Flow - Feb 26': {
      description: 'February 2026 – detailed transaction ledger (money in and money out).',
      columns: [
        { field: 'date', header: 'Date' }, { field: 'voucherNo', header: 'Voucher No' },
        { field: 'particulars', header: 'Particulars' }, { field: 'type', header: 'Type' },
        { field: 'mode', header: 'Mode' }, { field: 'debit', header: 'Money Out' },
        { field: 'credit', header: 'Money In' }, { field: 'balance', header: 'Balance' }
      ],
      rows: [
        { date: '04 Feb 2026', voucherNo: 'GR-1971', particulars: 'Customer Receipt – Veda Distribution', type: 'Receipt', mode: 'Bank', debit: '-', credit: 'Rs. 2,10,000', balance: 'Rs. 16,10,000' },
        { date: '10 Feb 2026', voucherNo: 'PV-0911', particulars: 'Vendor Payment – Metro Utilities', type: 'Payment', mode: 'UPI', debit: 'Rs. 28,500', credit: '-', balance: 'Rs. 15,81,500' },
        { date: '18 Feb 2026', voucherNo: 'GR-1988', particulars: 'Customer Receipt – Bharat Agencies', type: 'Receipt', mode: 'Bank', debit: '-', credit: 'Rs. 1,75,000', balance: 'Rs. 17,56,500' },
        { date: '25 Feb 2026', voucherNo: 'PV-0924', particulars: 'Salary Disbursement', type: 'Payment', mode: 'Bank', debit: 'Rs. 3,86,000', credit: '-', balance: 'Rs. 13,70,500' }
      ]
    },
    'Cash Flow - Mar 26': {
      description: 'March 2026 – detailed transaction ledger (money in and money out).',
      columns: [
        { field: 'date', header: 'Date' }, { field: 'voucherNo', header: 'Voucher No' },
        { field: 'particulars', header: 'Particulars' }, { field: 'type', header: 'Type' },
        { field: 'mode', header: 'Mode' }, { field: 'debit', header: 'Money Out' },
        { field: 'credit', header: 'Money In' }, { field: 'balance', header: 'Balance' }
      ],
      rows: [
        { date: '02 Mar 2026', voucherNo: 'GR-2021', particulars: 'Advance Receipt – Aaradhya Retail', type: 'Receipt', mode: 'Bank', debit: '-', credit: 'Rs. 3,00,000', balance: 'Rs. 16,70,500' },
        { date: '08 Mar 2026', voucherNo: 'PV-0948', particulars: 'Office Supplies', type: 'Payment', mode: 'Bank', debit: 'Rs. 42,500', credit: '-', balance: 'Rs. 16,28,000' },
        { date: '15 Mar 2026', voucherNo: 'GR-2038', particulars: 'Customer Receipt – Sunrise Dist.', type: 'Receipt', mode: 'Cheque', debit: '-', credit: 'Rs. 2,40,000', balance: 'Rs. 18,68,000' },
        { date: '28 Mar 2026', voucherNo: 'PV-0965', particulars: 'Salary Disbursement', type: 'Payment', mode: 'Bank', debit: 'Rs. 3,86,000', credit: '-', balance: 'Rs. 14,82,000' }
      ]
    },
    'Cash Flow - Apr 26': {
      description: 'April 2026 – detailed transaction ledger (money in and money out).',
      columns: [
        { field: 'date', header: 'Date' }, { field: 'voucherNo', header: 'Voucher No' },
        { field: 'particulars', header: 'Particulars' }, { field: 'type', header: 'Type' },
        { field: 'mode', header: 'Mode' }, { field: 'debit', header: 'Money Out' },
        { field: 'credit', header: 'Money In' }, { field: 'balance', header: 'Balance' }
      ],
      rows: [
        { date: '05 Apr 2026', voucherNo: 'GR-2081', particulars: 'Customer Receipt – GreenMart', type: 'Receipt', mode: 'UPI', debit: '-', credit: 'Rs. 1,20,000', balance: 'Rs. 15,02,000' },
        { date: '12 Apr 2026', voucherNo: 'PV-0988', particulars: 'Vendor Payment – Pragati Services', type: 'Payment', mode: 'Bank', debit: 'Rs. 1,85,000', credit: '-', balance: 'Rs. 13,17,000' },
        { date: '18 Apr 2026', voucherNo: 'GR-2097', particulars: 'Customer Receipt – North Star', type: 'Receipt', mode: 'Bank', debit: '-', credit: 'Rs. 2,80,000', balance: 'Rs. 15,97,000' },
        { date: '26 Apr 2026', voucherNo: 'PV-1005', particulars: 'GST Payment', type: 'Payment', mode: 'Bank', debit: 'Rs. 71,500', credit: '-', balance: 'Rs. 15,25,500' }
      ]
    },
    'Cash Flow - May 26': {
      description: 'May 2026 – detailed transaction ledger (money in and money out).',
      columns: [
        { field: 'date', header: 'Date' }, { field: 'voucherNo', header: 'Voucher No' },
        { field: 'particulars', header: 'Particulars' }, { field: 'type', header: 'Type' },
        { field: 'mode', header: 'Mode' }, { field: 'debit', header: 'Money Out' },
        { field: 'credit', header: 'Money In' }, { field: 'balance', header: 'Balance' }
      ],
      rows: [
        { date: '01 May 2026', voucherNo: 'GR-2201', particulars: 'Customer Receipt – Aaradhya Retail', type: 'Receipt', mode: 'Bank', debit: '-', credit: 'Rs. 1,42,000', balance: 'Rs. 16,67,500' },
        { date: '03 May 2026', voucherNo: 'GR-2205', particulars: 'Customer Receipt – Veda Distribution', type: 'Receipt', mode: 'Bank', debit: '-', credit: 'Rs. 1,75,000', balance: 'Rs. 18,42,500' },
        { date: '05 May 2026', voucherNo: 'PV-1024', particulars: 'Vendor Payment – Sri Lakshmi Traders', type: 'Payment', mode: 'Bank', debit: 'Rs. 64,000', credit: '-', balance: 'Rs. 17,78,500' },
        { date: '06 May 2026', voucherNo: 'PV-1028', particulars: 'Rent – Prime Properties', type: 'Payment', mode: 'Bank', debit: 'Rs. 85,000', credit: '-', balance: 'Rs. 16,93,500' },
        { date: '06 May 2026', voucherNo: 'GR-2218', particulars: 'Customer Receipt – GreenMart', type: 'Receipt', mode: 'UPI', debit: '-', credit: 'Rs. 85,000', balance: 'Rs. 17,78,500' }
      ]
    },

    // ── Receivables vs Payables drill-downs ──
    'Receivables vs Payables': {
      description: 'Comparative view of customer receivables, vendor payables, overdue, and upcoming amounts.',
      columns: [
        { field: 'category', header: 'Category' }, { field: 'amount', header: 'Amount' },
        { field: 'count', header: 'No. of Parties' }, { field: 'oldest', header: 'Oldest Entry' },
        { field: 'percentOfTotal', header: '% of Total' }, { field: 'status', header: 'Health' }
      ],
      rows: [
        { category: 'Customer Receivables', amount: 'Rs. 24,50,000', count: '18 customers', oldest: 'Feb 2026', percentOfTotal: '88%', status: 'Moderate' },
        { category: 'Vendor Payables', amount: 'Rs. 12,80,000', count: '11 vendors', oldest: 'Apr 2026', percentOfTotal: '46%', status: 'On Track' },
        { category: 'Overdue Receivables (>30 days)', amount: 'Rs. 5,40,000', count: '4 customers', oldest: 'Mar 2026', percentOfTotal: '22%', status: 'Action Needed' },
        { category: 'Upcoming Payables (next 14 days)', amount: 'Rs. 8,10,000', count: '6 vendors', oldest: 'Current', percentOfTotal: '29%', status: 'Scheduled' }
      ]
    },
    'Customer Receivables': {
      description: 'All outstanding customer invoices with ageing, contact, and GSTIN details.',
      columns: [
        { field: 'customerCode', header: 'Customer Code' }, { field: 'customerName', header: 'Customer Name' },
        { field: 'branch', header: 'Branch' }, { field: 'invoiceNo', header: 'Invoice No' },
        { field: 'invoiceDate', header: 'Invoice Date' }, { field: 'dueDate', header: 'Due Date' },
        { field: 'outstanding', header: 'Outstanding' }, { field: 'ageing', header: 'Ageing' },
        { field: 'mobile', header: 'Mobile' }, { field: 'email', header: 'Email' },
        { field: 'gstin', header: 'GSTIN' }, { field: 'status', header: 'Status' }
      ],
      rows: [
        { customerCode: 'CUST-1001', customerName: 'Aaradhya Retail Pvt Ltd', branch: 'Head Office', invoiceNo: 'SI-0526-0018', invoiceDate: '02 May 2026', dueDate: '16 May 2026', outstanding: 'Rs. 6,75,000', ageing: '0-30 Days', mobile: '9876543201', email: 'accounts@aaradhyaretail.in', gstin: '36AARCA1122L1Z5', status: 'Follow-up' },
        { customerCode: 'CUST-1048', customerName: 'GreenMart Hyperlocal', branch: 'Hyderabad Branch', invoiceNo: 'SI-0526-0024', invoiceDate: '04 May 2026', dueDate: '19 May 2026', outstanding: 'Rs. 4,20,000', ageing: '0-30 Days', mobile: '9876543202', email: 'finance@greenmart.in', gstin: '36AAFCG4421R1Z1', status: 'Current' },
        { customerCode: 'CUST-1126', customerName: 'North Star Agencies', branch: 'Bengaluru Branch', invoiceNo: 'SI-0426-0189', invoiceDate: '18 Apr 2026', dueDate: '03 May 2026', outstanding: 'Rs. 8,15,000', ageing: '31-60 Days', mobile: '9876543203', email: 'payables@northstar.in', gstin: '29AAICN8821M1Z3', status: 'Overdue' },
        { customerCode: 'CUST-1219', customerName: 'Veda Distribution House', branch: 'Chennai Branch', invoiceNo: 'SI-0326-0277', invoiceDate: '21 Mar 2026', dueDate: '20 Apr 2026', outstanding: 'Rs. 5,40,000', ageing: '61-90 Days', mobile: '9876543204', email: 'veda.accounts@example.com', gstin: '33AADCV5532K1Z8', status: 'Escalated' }
      ]
    },
    'Vendor Payables': {
      description: 'All outstanding vendor bills with due schedule, contact, and approval status.',
      columns: [
        { field: 'vendorCode', header: 'Vendor Code' }, { field: 'vendorName', header: 'Vendor Name' },
        { field: 'billNo', header: 'Bill No' }, { field: 'billDate', header: 'Bill Date' },
        { field: 'dueDate', header: 'Due Date' }, { field: 'payable', header: 'Payable' },
        { field: 'category', header: 'Category' }, { field: 'mobile', header: 'Mobile' },
        { field: 'email', header: 'Email' }, { field: 'gstin', header: 'GSTIN' },
        { field: 'status', header: 'Status' }
      ],
      rows: [
        { vendorCode: 'VEN-2041', vendorName: 'Sri Lakshmi Traders', billNo: 'BILL-7721', billDate: '29 Apr 2026', dueDate: '07 May 2026', payable: 'Rs. 3,25,000', category: 'Supplies', mobile: '9848011122', email: 'billing@slt.example.com', gstin: '36AAVFS8890P1Z2', status: 'Due This Week' },
        { vendorCode: 'VEN-2108', vendorName: 'Pragati Services', billNo: 'BILL-7788', billDate: '01 May 2026', dueDate: '11 May 2026', payable: 'Rs. 2,10,000', category: 'Maintenance', mobile: '9848011123', email: 'accounts@pragatiservices.in', gstin: '36AAJFP4322K1Z7', status: 'Pending Approval' },
        { vendorCode: 'VEN-2185', vendorName: 'Metro Utilities', billNo: 'BILL-7814', billDate: '03 May 2026', dueDate: '14 May 2026', payable: 'Rs. 1,85,000', category: 'Utilities', mobile: '9848011124', email: 'finance@metroutilities.in', gstin: '36AAJCM5522N1Z0', status: 'Scheduled' },
        { vendorCode: 'VEN-2233', vendorName: 'Payroll Statutory Payables', billNo: 'SAL-0526', billDate: '05 May 2026', dueDate: '10 May 2026', payable: 'Rs. 5,60,000', category: 'Payroll', mobile: '9848011125', email: 'payroll@example.com', gstin: 'NA', status: 'In Review' }
      ]
    },
    'Overdue Receivables': {
      description: 'Customers with invoices overdue beyond 30 days — immediate follow-up required.',
      columns: [
        { field: 'customerCode', header: 'Customer Code' }, { field: 'customerName', header: 'Customer Name' },
        { field: 'invoiceNo', header: 'Invoice No' }, { field: 'dueDate', header: 'Due Date' },
        { field: 'overdueDays', header: 'Overdue (Days)' }, { field: 'outstanding', header: 'Outstanding' },
        { field: 'ageing', header: 'Ageing Bucket' }, { field: 'mobile', header: 'Mobile' },
        { field: 'email', header: 'Email' }, { field: 'status', header: 'Status' }
      ],
      rows: [
        { customerCode: 'CUST-1126', customerName: 'North Star Agencies', invoiceNo: 'SI-0426-0189', dueDate: '03 May 2026', overdueDays: 3, outstanding: 'Rs. 8,15,000', ageing: '31-60 Days', mobile: '9876543203', email: 'payables@northstar.in', status: 'Overdue' },
        { customerCode: 'CUST-1219', customerName: 'Veda Distribution House', invoiceNo: 'SI-0326-0277', dueDate: '20 Apr 2026', overdueDays: 16, outstanding: 'Rs. 5,40,000', ageing: '61-90 Days', mobile: '9876543204', email: 'veda.accounts@example.com', status: 'Escalated' },
        { customerCode: 'CUST-1301', customerName: 'Horizon Retail Ltd', invoiceNo: 'SI-0226-0044', dueDate: '10 Mar 2026', overdueDays: 57, outstanding: 'Rs. 3,20,000', ageing: '61-90 Days', mobile: '9876543205', email: 'accounts@horizonretail.in', status: 'Legal Notice' },
        { customerCode: 'CUST-1342', customerName: 'Delta Enterprises', invoiceNo: 'SI-1125-0399', dueDate: '15 Dec 2025', overdueDays: 142, outstanding: 'Rs. 1,85,000', ageing: '90+ Days', mobile: '9876543206', email: 'delta@example.com', status: 'Written Off Risk' }
      ]
    },
    'Upcoming Payables': {
      description: 'Vendor bills due in the next 14 days — schedule payments to avoid late fees.',
      columns: [
        { field: 'vendorCode', header: 'Vendor Code' }, { field: 'vendorName', header: 'Vendor Name' },
        { field: 'billNo', header: 'Bill No' }, { field: 'dueDate', header: 'Due Date' },
        { field: 'daysRemaining', header: 'Days Remaining' }, { field: 'payable', header: 'Payable' },
        { field: 'category', header: 'Category' }, { field: 'mobile', header: 'Mobile' },
        { field: 'status', header: 'Status' }
      ],
      rows: [
        { vendorCode: 'VEN-2041', vendorName: 'Sri Lakshmi Traders', billNo: 'BILL-7721', dueDate: '07 May 2026', daysRemaining: 1, payable: 'Rs. 3,25,000', category: 'Supplies', mobile: '9848011122', status: 'Due Tomorrow' },
        { vendorCode: 'VEN-2233', vendorName: 'Payroll Statutory', billNo: 'SAL-0526', dueDate: '10 May 2026', daysRemaining: 4, payable: 'Rs. 5,60,000', category: 'Payroll', mobile: '9848011125', status: 'Priority' },
        { vendorCode: 'VEN-2108', vendorName: 'Pragati Services', billNo: 'BILL-7788', dueDate: '11 May 2026', daysRemaining: 5, payable: 'Rs. 2,10,000', category: 'Maintenance', mobile: '9848011123', status: 'Scheduled' },
        { vendorCode: 'VEN-2185', vendorName: 'Metro Utilities', billNo: 'BILL-7814', dueDate: '14 May 2026', daysRemaining: 8, payable: 'Rs. 1,85,000', category: 'Utilities', mobile: '9848011124', status: 'Scheduled' },
        { vendorCode: 'VEN-2294', vendorName: 'Clean India Services', billNo: 'BILL-7831', dueDate: '18 May 2026', daysRemaining: 12, payable: 'Rs. 45,000', category: 'Housekeeping', mobile: '9848011126', status: 'Upcoming' }
      ]
    },

    // ── Receipt Mode Split pie drill-downs ──
    'Receipt Mode Split': {
      description: 'Today\'s collection breakdown by payment mode — all receipts across modes.',
      columns: [
        { field: 'mode', header: 'Payment Mode' }, { field: 'receipts', header: 'No. of Receipts' },
        { field: 'amount', header: 'Amount Collected' }, { field: 'share', header: '% Share' },
        { field: 'avgTicket', header: 'Avg. Ticket Size' }
      ],
      rows: [
        { mode: 'Bank Transfer', receipts: 16, amount: 'Rs. 2,03,700', share: '42%', avgTicket: 'Rs. 12,731' },
        { mode: 'UPI', receipts: 12, amount: 'Rs. 1,45,500', share: '30%', avgTicket: 'Rs. 12,125' },
        { mode: 'Cash', receipts: 7, amount: 'Rs. 87,300', share: '18%', avgTicket: 'Rs. 12,471' },
        { mode: 'Cheque', receipts: 3, amount: 'Rs. 48,500', share: '10%', avgTicket: 'Rs. 16,167' }
      ]
    },
    'Receipt Mode Split - Bank': {
      description: 'Today\'s bank transfer receipts — account-wise credited amounts.',
      columns: [
        { field: 'receiptNo', header: 'Receipt No' }, { field: 'time', header: 'Time' },
        { field: 'customer', header: 'Customer' }, { field: 'bankName', header: 'Bank' },
        { field: 'accountNo', header: 'Account No' }, { field: 'transactionRef', header: 'Transaction Ref' },
        { field: 'amount', header: 'Amount' }, { field: 'status', header: 'Status' }
      ],
      rows: [
        { receiptNo: 'GR-2218', time: '09:14 AM', customer: 'Aaradhya Retail Pvt Ltd', bankName: 'HDFC Bank', accountNo: '50200011887441', transactionRef: 'NEFT/202605060001', amount: 'Rs. 1,42,000', status: 'Posted' },
        { receiptNo: 'GR-2222', time: '10:55 AM', customer: 'Veda Distribution House', bankName: 'ICICI Bank', accountNo: '001105002884', transactionRef: 'RTGS/202605060008', amount: 'Rs. 61,700', status: 'Posted' }
      ]
    },
    'Receipt Mode Split - UPI': {
      description: 'Today\'s UPI receipts — transaction-wise with UPI IDs.',
      columns: [
        { field: 'receiptNo', header: 'Receipt No' }, { field: 'time', header: 'Time' },
        { field: 'customer', header: 'Customer' }, { field: 'upiId', header: 'UPI ID' },
        { field: 'transactionRef', header: 'UTR No' }, { field: 'amount', header: 'Amount' },
        { field: 'status', header: 'Status' }
      ],
      rows: [
        { receiptNo: 'GR-2219', time: '10:32 AM', customer: 'GreenMart Hyperlocal', upiId: 'greenmart@okicici', transactionRef: 'UTR202605060014', amount: 'Rs. 85,000', status: 'Posted' },
        { receiptNo: 'GR-2224', time: '11:45 AM', customer: 'Sunrise Distributors', upiId: 'sunrisedist@okhdfcbank', transactionRef: 'UTR202605060029', amount: 'Rs. 60,500', status: 'Posted' }
      ]
    },
    'Receipt Mode Split - Cash': {
      description: 'Today\'s cash receipts — branch-wise cash collections.',
      columns: [
        { field: 'receiptNo', header: 'Receipt No' }, { field: 'time', header: 'Time' },
        { field: 'customer', header: 'Customer' }, { field: 'branch', header: 'Branch' },
        { field: 'receivedBy', header: 'Received By' }, { field: 'amount', header: 'Amount' },
        { field: 'status', header: 'Status' }
      ],
      rows: [
        { receiptNo: 'GR-2221', time: '12:18 PM', customer: 'Sunrise Distributors', branch: 'Bengaluru Branch', receivedBy: 'Anand Shetty', amount: 'Rs. 50,000', status: 'Posted' },
        { receiptNo: 'GR-2226', time: '02:40 PM', customer: 'Local Walk-in Customer', branch: 'Head Office', receivedBy: 'Ravi Kumar', amount: 'Rs. 37,300', status: 'Posted' }
      ]
    },
    'Receipt Mode Split - Cheque': {
      description: 'Today\'s cheque receipts — pending clearance and cleared amounts.',
      columns: [
        { field: 'receiptNo', header: 'Receipt No' }, { field: 'customer', header: 'Customer' },
        { field: 'chequeNo', header: 'Cheque No' }, { field: 'chequeDate', header: 'Cheque Date' },
        { field: 'bankName', header: 'Drawn On Bank' }, { field: 'amount', header: 'Amount' },
        { field: 'depositDate', header: 'Deposit Date' }, { field: 'status', header: 'Status' }
      ],
      rows: [
        { receiptNo: 'GR-2220', customer: 'Bharat Agencies', chequeNo: '004418', chequeDate: '05 May 2026', bankName: 'State Bank of India', amount: 'Rs. 48,500', depositDate: '06 May 2026', status: 'Pending Clearance' }
      ]
    },

    // ── Expense Category Split pie drill-downs ──
    'Expense Category Split': {
      description: 'Today\'s expense breakdown by category — all payments and vouchers.',
      columns: [
        { field: 'category', header: 'Category' }, { field: 'vouchers', header: 'No. of Vouchers' },
        { field: 'amount', header: 'Amount Spent' }, { field: 'share', header: '% Share' },
        { field: 'budgetLimit', header: 'Monthly Budget' }, { field: 'utilisation', header: 'Budget Used' }
      ],
      rows: [
        { category: 'Vendor Payments', vouchers: 8, amount: 'Rs. 54,030', share: '38%', budgetLimit: 'Rs. 2,00,000', utilisation: '27%' },
        { category: 'Payroll & Statutory', vouchers: 2, amount: 'Rs. 36,950', share: '26%', budgetLimit: 'Rs. 40,00,000', utilisation: '92%' },
        { category: 'Utilities', vouchers: 3, amount: 'Rs. 28,420', share: '20%', budgetLimit: 'Rs. 80,000', utilisation: '36%' },
        { category: 'Other / Miscellaneous', vouchers: 8, amount: 'Rs. 23,100', share: '16%', budgetLimit: 'Rs. 1,00,000', utilisation: '23%' }
      ]
    },
    'Expense Category Split - Vendor': {
      description: 'Today\'s vendor payment vouchers — supplier-wise payments.',
      columns: [
        { field: 'voucherNo', header: 'Voucher No' }, { field: 'time', header: 'Time' },
        { field: 'vendor', header: 'Vendor' }, { field: 'ledger', header: 'Expense Ledger' },
        { field: 'mode', header: 'Mode' }, { field: 'amount', header: 'Amount' },
        { field: 'approvedBy', header: 'Approved By' }, { field: 'status', header: 'Status' }
      ],
      rows: [
        { voucherNo: 'PV-1028', time: '09:45 AM', vendor: 'Prime Properties', ledger: 'Rent Expense', mode: 'Bank', amount: 'Rs. 85,000', approvedBy: 'Finance Manager', status: 'Posted' },
        { voucherNo: 'PV-1030', time: '11:30 AM', vendor: 'Sri Lakshmi Traders', ledger: 'Office Supplies', mode: 'Bank', amount: 'Rs. 29,000', approvedBy: 'Accounts Lead', status: 'Pending' }
      ]
    },
    'Expense Category Split - Payroll': {
      description: 'Today\'s payroll and statutory payment entries.',
      columns: [
        { field: 'voucherNo', header: 'Voucher No' }, { field: 'time', header: 'Time' },
        { field: 'description', header: 'Description' }, { field: 'ledger', header: 'Ledger' },
        { field: 'employees', header: 'Employees / Batch' }, { field: 'amount', header: 'Amount' },
        { field: 'approvedBy', header: 'Approved By' }, { field: 'status', header: 'Status' }
      ],
      rows: [
        { voucherNo: 'SAL-0526', time: '10:00 AM', description: 'Salary Provision May 2026', ledger: 'Salary Payable', employees: '248 employees', amount: 'Rs. 38,60,000', approvedBy: 'HR Head', status: 'In Review' }
      ]
    },
    'Expense Category Split - Utilities': {
      description: 'Today\'s utility payment vouchers.',
      columns: [
        { field: 'voucherNo', header: 'Voucher No' }, { field: 'time', header: 'Time' },
        { field: 'provider', header: 'Provider' }, { field: 'utilityType', header: 'Utility Type' },
        { field: 'period', header: 'Billing Period' }, { field: 'mode', header: 'Mode' },
        { field: 'amount', header: 'Amount' }, { field: 'status', header: 'Status' }
      ],
      rows: [
        { voucherNo: 'PV-1029', time: '10:50 AM', provider: 'Metro Utilities', utilityType: 'Electricity', period: 'April 2026', mode: 'UPI', amount: 'Rs. 28,500', status: 'Posted' }
      ]
    },
    'Expense Category Split - Other': {
      description: 'Today\'s miscellaneous and petty-cash expense entries.',
      columns: [
        { field: 'voucherNo', header: 'Voucher No' }, { field: 'time', header: 'Time' },
        { field: 'description', header: 'Description' }, { field: 'ledger', header: 'Ledger' },
        { field: 'mode', header: 'Mode' }, { field: 'amount', header: 'Amount' },
        { field: 'requestedBy', header: 'Requested By' }, { field: 'status', header: 'Status' }
      ],
      rows: [
        { voucherNo: 'PC-0118', time: '09:10 AM', description: 'Stationery purchase', ledger: 'Petty Cash', mode: 'Cash', amount: 'Rs. 1,800', requestedBy: 'Admin Team', status: 'Posted' },
        { voucherNo: 'PC-0119', time: '11:20 AM', description: 'Staff refreshments', ledger: 'Petty Cash', mode: 'Cash', amount: 'Rs. 2,400', requestedBy: 'HR Team', status: 'Posted' },
        { voucherNo: 'PV-1032', time: '02:15 PM', description: 'Courier charges', ledger: 'Misc Expenses', mode: 'Cash', amount: 'Rs. 850', requestedBy: 'Accounts Team', status: 'Posted' }
      ]
    },

    // ── Receivables Ageing pie drill-downs ──
    'Receivables Ageing': {
      description: 'Customer outstanding ageing summary — bucket-wise distribution of receivables.',
      columns: [
        { field: 'bucket', header: 'Ageing Bucket' }, { field: 'customers', header: 'No. of Customers' },
        { field: 'invoices', header: 'No. of Invoices' }, { field: 'amount', header: 'Outstanding Amount' },
        { field: 'share', header: '% Share' }, { field: 'action', header: 'Recommended Action' }
      ],
      rows: [
        { bucket: '0-30 Days (Current)', customers: 8, invoices: 12, amount: 'Rs. 11,02,500', share: '45%', action: 'Routine Follow-up' },
        { bucket: '31-60 Days', customers: 5, invoices: 7, amount: 'Rs. 6,12,500', share: '25%', action: 'Reminder Call' },
        { bucket: '61-90 Days', customers: 3, invoices: 4, amount: 'Rs. 4,41,000', share: '18%', action: 'Escalation Required' },
        { bucket: '90+ Days (Critical)', customers: 2, invoices: 3, amount: 'Rs. 2,94,000', share: '12%', action: 'Legal / Write-off Review' }
      ]
    },
    'Receivables Ageing - 0-30 Days': {
      description: 'Current (0-30 day) outstanding invoices — healthy receivables due within terms.',
      columns: [
        { field: 'customerName', header: 'Customer' }, { field: 'invoiceNo', header: 'Invoice No' },
        { field: 'invoiceDate', header: 'Invoice Date' }, { field: 'dueDate', header: 'Due Date' },
        { field: 'outstanding', header: 'Outstanding' }, { field: 'mobile', header: 'Mobile' },
        { field: 'status', header: 'Status' }
      ],
      rows: [
        { customerName: 'Aaradhya Retail Pvt Ltd', invoiceNo: 'SI-0526-0018', invoiceDate: '02 May 2026', dueDate: '16 May 2026', outstanding: 'Rs. 6,75,000', mobile: '9876543201', status: 'Follow-up' },
        { customerName: 'GreenMart Hyperlocal', invoiceNo: 'SI-0526-0024', invoiceDate: '04 May 2026', dueDate: '19 May 2026', outstanding: 'Rs. 4,20,000', mobile: '9876543202', status: 'Current' },
        { customerName: 'Bharat Agencies', invoiceNo: 'SI-0526-0031', invoiceDate: '05 May 2026', dueDate: '20 May 2026', outstanding: 'Rs. 2,08,000', mobile: '9876543210', status: 'Cheque Received' }
      ]
    },
    'Receivables Ageing - 31-60 Days': {
      description: 'Receivables overdue 31-60 days — follow-up and reminder stage.',
      columns: [
        { field: 'customerName', header: 'Customer' }, { field: 'invoiceNo', header: 'Invoice No' },
        { field: 'invoiceDate', header: 'Invoice Date' }, { field: 'dueDate', header: 'Due Date' },
        { field: 'overdueDays', header: 'Overdue Days' }, { field: 'outstanding', header: 'Outstanding' },
        { field: 'mobile', header: 'Mobile' }, { field: 'status', header: 'Status' }
      ],
      rows: [
        { customerName: 'North Star Agencies', invoiceNo: 'SI-0426-0189', invoiceDate: '18 Apr 2026', dueDate: '03 May 2026', overdueDays: 3, outstanding: 'Rs. 8,15,000', mobile: '9876543203', status: 'Overdue' },
        { customerName: 'Sunrise Distributors', invoiceNo: 'SI-0426-0201', invoiceDate: '22 Apr 2026', dueDate: '07 May 2026', overdueDays: 0, outstanding: 'Rs. 1,85,000', mobile: '9876543211', status: 'Due Today' }
      ]
    },
    'Receivables Ageing - 61-90 Days': {
      description: 'Receivables overdue 61-90 days — escalation needed.',
      columns: [
        { field: 'customerName', header: 'Customer' }, { field: 'invoiceNo', header: 'Invoice No' },
        { field: 'dueDate', header: 'Due Date' }, { field: 'overdueDays', header: 'Overdue Days' },
        { field: 'outstanding', header: 'Outstanding' }, { field: 'mobile', header: 'Mobile' },
        { field: 'email', header: 'Email' }, { field: 'status', header: 'Status' }
      ],
      rows: [
        { customerName: 'Veda Distribution House', invoiceNo: 'SI-0326-0277', dueDate: '20 Apr 2026', overdueDays: 16, outstanding: 'Rs. 5,40,000', mobile: '9876543204', email: 'veda.accounts@example.com', status: 'Escalated' },
        { customerName: 'Horizon Retail Ltd', invoiceNo: 'SI-0226-0044', dueDate: '10 Mar 2026', overdueDays: 57, outstanding: 'Rs. 3,20,000', mobile: '9876543205', email: 'accounts@horizonretail.in', status: 'Legal Notice' }
      ]
    },
    'Receivables Ageing - 90+ Days': {
      description: 'Receivables overdue beyond 90 days — immediate legal / write-off review.',
      columns: [
        { field: 'customerName', header: 'Customer' }, { field: 'invoiceNo', header: 'Invoice No' },
        { field: 'dueDate', header: 'Due Date' }, { field: 'overdueDays', header: 'Overdue Days' },
        { field: 'outstanding', header: 'Outstanding' }, { field: 'mobile', header: 'Mobile' },
        { field: 'email', header: 'Email' }, { field: 'gstin', header: 'GSTIN' },
        { field: 'status', header: 'Status' }
      ],
      rows: [
        { customerName: 'Delta Enterprises', invoiceNo: 'SI-1125-0399', dueDate: '15 Dec 2025', overdueDays: 142, outstanding: 'Rs. 1,85,000', mobile: '9876543206', email: 'delta@example.com', gstin: '36AACCD5511P1Z1', status: 'Written Off Risk' },
        { customerName: 'Metro Wholesale Club', invoiceNo: 'SI-1025-0288', dueDate: '30 Nov 2025', overdueDays: 157, outstanding: 'Rs. 1,09,000', mobile: '9876543212', email: 'accounts@metrowc.in', gstin: '36AABCM4420Q1Z8', status: 'Legal Initiated' }
      ]
    }
  };

  readonly dayWiseSummary: SummaryCard[] = [
    { title: 'Day Collection', value: '₹4,85,000', icon: 'pi pi-book', meta: 'Today collection posted', tone: 'success' },
    { title: 'Today Spend', value: '₹1,42,500', icon: 'pi pi-credit-card', meta: 'Payments and expenses', tone: 'danger' },
    { title: 'Total Receipts', value: '38', icon: 'pi pi-receipt', meta: 'Receipt vouchers created', tone: 'info' },
    { title: 'Payment Vouchers', value: '21', icon: 'pi pi-file-check', meta: 'Total payment vouchers', tone: 'warning' }
  ];

  readonly cashFlowChartData: CashFlowPoint[] = [
    { month: 'May 26', moneyIn: '₹8.1L', moneyOut: '₹5.6L', netCashFlow: '₹2.5L', moneyInPercent: 77, moneyOutPercent: 53, netPercent: 24 },
    { month: 'Apr 26', moneyIn: '₹5.9L', moneyOut: '₹6.3L', netCashFlow: '-₹0.4L', moneyInPercent: 56, moneyOutPercent: 60, netPercent: 4 },
    { month: 'Mar 26', moneyIn: '₹7.2L', moneyOut: '₹5.8L', netCashFlow: '₹1.4L', moneyInPercent: 69, moneyOutPercent: 55, netPercent: 13 },
    { month: 'Feb 26', moneyIn: '₹6.4L', moneyOut: '₹4.9L', netCashFlow: '₹1.5L', moneyInPercent: 61, moneyOutPercent: 47, netPercent: 14 },
    { month: 'Jan 26', moneyIn: '₹5.8L', moneyOut: '₹4.2L', netCashFlow: '₹1.6L', moneyInPercent: 55, moneyOutPercent: 40, netPercent: 15 },
    { month: 'Dec 25', moneyIn: '₹10.5L', moneyOut: '₹8.2L', netCashFlow: '₹2.3L', moneyInPercent: 100, moneyOutPercent: 78, netPercent: 22 },
    { month: 'Nov 25', moneyIn: '₹9.2L', moneyOut: '₹7.1L', netCashFlow: '₹2.1L', moneyInPercent: 88, moneyOutPercent: 68, netPercent: 20 },
    { month: 'Oct 25', moneyIn: '₹8.8L', moneyOut: '₹6.4L', netCashFlow: '₹2.4L', moneyInPercent: 84, moneyOutPercent: 61, netPercent: 23 },
    { month: 'Sep 25', moneyIn: '₹7.5L', moneyOut: '₹5.7L', netCashFlow: '₹1.8L', moneyInPercent: 71, moneyOutPercent: 54, netPercent: 17 },
    { month: 'Aug 25', moneyIn: '₹6.9L', moneyOut: '₹5.3L', netCashFlow: '₹1.6L', moneyInPercent: 66, moneyOutPercent: 50, netPercent: 15 },
    { month: 'Jul 25', moneyIn: '₹8.4L', moneyOut: '₹6.1L', netCashFlow: '₹2.3L', moneyInPercent: 80, moneyOutPercent: 58, netPercent: 22 },
    { month: 'Jun 25', moneyIn: '₹7.2L', moneyOut: '₹5.5L', netCashFlow: '₹1.7L', moneyInPercent: 69, moneyOutPercent: 52, netPercent: 16 },
    { month: 'May 25', moneyIn: '₹7.8L', moneyOut: '₹5.8L', netCashFlow: '₹2.0L', moneyInPercent: 74, moneyOutPercent: 55, netPercent: 19 }
  ];

  readonly receivablesVsPayables: MetricRow[] = [
    { label: 'Customer Receivables', value: '₹24.5L', percent: 88, tone: 'primary' },
    { label: 'Vendor Payables', value: '₹12.8L', percent: 46, tone: 'warning' },
    { label: 'Overdue Receivables', value: '₹5.4L', percent: 32, tone: 'danger' },
    { label: 'Upcoming Payables', value: '₹8.1L', percent: 58, tone: 'info' }
  ];

  readonly pieCharts: PieChart[] = [
    {
      title: 'Receipt Mode Split',
      total: '₹4.85L',
      subtitle: 'Today collection',
      chartClass: 'receipt-pie',
      legends: [
        { label: 'Bank', value: '42%', shade: 'shade-1' },
        { label: 'UPI', value: '30%', shade: 'shade-2' },
        { label: 'Cash', value: '18%', shade: 'shade-3' },
        { label: 'Cheque', value: '10%', shade: 'shade-4' }
      ]
    },
    {
      title: 'Expense Category Split',
      total: '₹1.42L',
      subtitle: 'Today spend',
      chartClass: 'expense-pie',
      legends: [
        { label: 'Vendor', value: '38%', shade: 'shade-1' },
        { label: 'Payroll', value: '26%', shade: 'shade-2' },
        { label: 'Utilities', value: '20%', shade: 'shade-3' },
        { label: 'Other', value: '16%', shade: 'shade-4' }
      ]
    },
    {
      title: 'Receivables Ageing',
      total: '₹24.5L',
      subtitle: 'Outstanding mix',
      chartClass: 'ageing-pie',
      legends: [
        { label: '0-30 Days', value: '45%', shade: 'shade-1' },
        { label: '31-60 Days', value: '25%', shade: 'shade-2' },
        { label: '61-90 Days', value: '18%', shade: 'shade-3' },
        { label: '90+ Days', value: '12%', shade: 'shade-4' }
      ]
    }
  ];

  readonly accountBalances: MetricRow[] = [
    { label: 'Cash Balance', value: '₹3,25,000', meta: 'Main cash counter' },
    { label: 'Bank Balance', value: '₹15,50,500', meta: '5 active accounts' },
    { label: 'Petty Cash', value: '₹48,000', meta: 'Admin float' },
    { label: 'Fixed Deposit', value: '₹42,00,000', meta: '3 deposits active' },
    { label: 'Loan Outstanding', value: '₹18,20,000', meta: 'Term loan balance' }
  ];

  readonly taxSummary: MetricRow[] = [
    { label: 'GST Payable', value: '₹2,18,000', meta: 'Current month' },
    { label: 'GST Input Credit', value: '₹1,46,500', meta: 'Eligible ITC' },
    { label: 'TDS Payable', value: '₹82,400', meta: 'Salary and vendors' },
    { label: 'TDS Deducted', value: '₹94,250', meta: 'Month to date' },
    { label: 'Filing Due Date', value: '20 Jun 2026', meta: 'GST return' }
  ];

  readonly pendingApprovals: ApprovalRow[] = [
    { requestDate: '06 May 2026', requestType: 'Payment Voucher Approval', name: 'Sri Lakshmi Traders', referenceNo: 'PV-1028', amountOrDays: '₹1,25,000', status: 'Pending', statusClass: 'warning' },
    { requestDate: '05 May 2026', requestType: 'Journal Voucher Approval', name: 'Accounts Team', referenceNo: 'JV-0884', amountOrDays: '₹72,500', status: 'In Review', statusClass: 'info' },
    { requestDate: '04 May 2026', requestType: 'Salary Approval', name: 'Payroll Batch May', referenceNo: 'SAL-0526', amountOrDays: '₹38,60,000', status: 'Approved', statusClass: 'success' },
    { requestDate: '04 May 2026', requestType: 'Reimbursement Approval', name: 'Megha Iyer', referenceNo: 'RE-7042', amountOrDays: '₹8,450', status: 'Rejected', statusClass: 'danger' }
  ];

  readonly recentTransactions: TransactionRow[] = [
    { date: '06 May', voucherNo: 'PV-1028', particulars: 'Rent Payment', type: 'Payment', debit: '₹85,000', credit: '-', status: 'Posted', statusClass: 'success' },
    { date: '06 May', voucherNo: 'GR-2217', particulars: 'Customer Receipt', type: 'Receipt', debit: '-', credit: '₹1,42,000', status: 'Posted', statusClass: 'success' },
    { date: '05 May', voucherNo: 'PV-1024', particulars: 'Vendor Payment', type: 'Payment', debit: '₹64,000', credit: '-', status: 'Pending', statusClass: 'warning' },
    { date: '05 May', voucherNo: 'JV-0884', particulars: 'Salary Entry', type: 'Journal', debit: '₹38,60,000', credit: '₹38,60,000', status: 'In Review', statusClass: 'info' },
    { date: '04 May', voucherNo: 'BNK-0498', particulars: 'Bank Charges', type: 'Bank', debit: '₹2,350', credit: '-', status: 'Posted', statusClass: 'success' }
  ];

  openCardModal(title: string): void {
    const report = this.detailReports[title];
    if (report) {
      this.activeModal = { title, report };
      this.showModal = true;
    }
  }

  openCashFlowMonth(month: string): void {
    const title = `Cash Flow - ${month} 26`;
    this.openCardModal(this.detailReports[title] ? title : 'Cash Flow Overview');
  }

  cashFlowTooltip(point: CashFlowPoint): string {
    return `${point.month}: Money In ${point.moneyIn}, Money Out ${point.moneyOut}, Net Flow ${point.netCashFlow}. Click to view transactions.`;
  }

  metricTooltip(metric: MetricRow): string {
    return `${metric.label}: ${metric.value}${metric.percent !== undefined ? ` (${metric.percent}%)` : ''}. Click to view ledger.`;
  }

  closeModal(): void {
    this.showModal = false;
    this.activeModal = null;
  }

  exportModalToExcel(): void {
    if (!this.activeModal) return;
    const { title, report } = this.activeModal;
    const exportData = report.rows.map(row =>
      Object.fromEntries(report.columns.map(c => [c.header, row[c.field] ?? '']))
    );
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
    XLSX.writeFile(wb, `${title}.xlsx`);
  }

  exportModalToPdf(): void {
    if (!this.activeModal) return;
    const { title, report } = this.activeModal;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    autoTable(doc, {
      head: [report.columns.map(c => c.header)],
      body: report.rows.map(row => report.columns.map(c => String(row[c.field] ?? ''))),
      startY: 22,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [12, 74, 110] }
    });
    doc.save(`${title}.pdf`);
  }

  printModal(): void {
    if (!this.activeModal) return;
    const { title, report } = this.activeModal;
    const headHtml = report.columns.map(c => `<th>${c.header}</th>`).join('');
    const bodyHtml = report.rows.map(row =>
      `<tr>${report.columns.map(c => `<td>${row[c.field] ?? ''}</td>`).join('')}</tr>`
    ).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
      <style>
        body { font-family: sans-serif; font-size: 12px; padding: 20px; }
        h2 { color: #0c4a6e; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #dbe8f9; padding: 7px 10px; text-align: left; }
        th { background: #0c4a6e; color: #fff; font-weight: 600; }
        tr:nth-child(even) td { background: #f8fafc; }
      </style>
      </head><body>
      <h2>${title}</h2>
      <table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>
      </body></html>`);
    win.document.close();
    win.print();
  }

  sendModalByEmail(): void {
    if (!this.activeModal) return;
    const subject = encodeURIComponent(`${this.activeModal.title} – Report`);
    const body = encodeURIComponent(
      `Please find the ${this.activeModal.title} report below.\n\n${this.activeModal.report.description}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  sendModalByWhatsapp(): void {
    if (!this.activeModal) return;
    const text = encodeURIComponent(
      `*${this.activeModal.title}*\n${this.activeModal.report.description}\n${this.activeModal.report.rows.length} records`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  sendStatsByEmail(): void {
    const subject = encodeURIComponent(`Accounts monitoring summary - ${this.dateRange}`);
    const body = encodeURIComponent(this.buildMonitoringMessage());
    window.location.href = `mailto:${this.businessOwnerEmail}?subject=${subject}&body=${body}`;
  }

  sendStatsByWhatsapp(): void {
    const text = encodeURIComponent(this.buildMonitoringMessage());
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  private buildMonitoringMessage(): string {
    const dayStats = this.dayWiseSummary
      .map(item => `${item.title}: ${item.value}`)
      .join('\n');

    return [
      'Accounts Monitoring Summary',
      `Financial Year: ${this.financialYear}`,
      `Branch: ${this.branch}`,
      `Date Range: ${this.dateRange}`,
      '',
      dayStats,
      '',
      'Key Position:',
      'Total Receivables: ₹24,50,000',
      'Total Payables: ₹12,80,000',
      'Cash & Bank Balance: ₹18,75,500'
    ].join('\n');
  }
}
