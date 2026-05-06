import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

interface KpiCard {
  title: string;
  value: string;
  icon: string;
  text: string;
  trend: string;
  tone: string;
}

interface MetricRow {
  label: string;
  value: string;
  meta?: string;
  percent?: number;
  tone?: string;
}

interface ApprovalRow {
  requestDate: string;
  requestType: string;
  employeeName: string;
  referenceNo: string;
  amountOrDays: string;
  status: string;
  statusClass: string;
}

interface ActivityItem {
  icon: string;
  title: string;
  employeeName: string;
  time: string;
  status: string;
  statusClass: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, NgSelectModule],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  financialYear: string | null = '2025-2026';
  branch: string | null = 'Head Office';
  dateRange: string | null = 'This Month';

  readonly financialYears = ['2025-2026', '2024-2025', '2023-2024'];
  readonly branches = ['Head Office', 'Hyderabad Branch', 'Bengaluru Branch', 'Chennai Branch'];
  readonly dateRanges = ['Today', 'This Week', 'This Month', 'This Quarter', 'This Year'];

  readonly kpiCards: KpiCard[] = [
    { title: 'Total Employees', value: '248', icon: 'pi pi-users', text: 'Active employees', trend: '12 new joiners this month', tone: 'primary' },
    { title: 'Present Today', value: '221', icon: 'pi pi-clock', text: 'Today attendance', trend: '89% attendance', tone: 'success' },
    { title: 'On Leave', value: '14', icon: 'pi pi-calendar', text: 'Employees on leave', trend: '6 pending approvals', tone: 'warning' },
    { title: 'Payroll This Month', value: '₹38,60,000', icon: 'pi pi-credit-card', text: 'Monthly salary processing', trend: 'Payroll pending', tone: 'info' }
  ];

  readonly attendanceSummary: MetricRow[] = [
    { label: 'Present', value: '221', percent: 89, tone: 'success' },
    { label: 'Absent', value: '13', percent: 5, tone: 'danger' },
    { label: 'Late In', value: '18', percent: 7, tone: 'warning' },
    { label: 'Work From Home', value: '24', percent: 10, tone: 'info' },
    { label: 'On Leave', value: '14', percent: 6, tone: 'primary' }
  ];

  readonly departmentEmployees: MetricRow[] = [
    { label: 'HR', value: '18', percent: 18 },
    { label: 'Accounts', value: '32', percent: 32 },
    { label: 'Sales', value: '64', percent: 64 },
    { label: 'Development', value: '78', percent: 78 },
    { label: 'Support', value: '36', percent: 36 },
    { label: 'Admin', value: '20', percent: 20 }
  ];

  readonly payrollSummary: MetricRow[] = [
    { label: 'Total Employees', value: '248', percent: 100, tone: 'primary' },
    { label: 'Payroll Processed', value: '210', percent: 85, tone: 'success' },
    { label: 'Payroll Pending', value: '38', percent: 15, tone: 'warning' },
    { label: 'Payslips Generated', value: '196', percent: 79, tone: 'info' },
    { label: 'Salary Disbursement Status', value: 'In Review', percent: 62, tone: 'warning' }
  ];

  readonly upcomingEvents: ActivityItem[] = [
    { icon: 'pi pi-gift', title: 'Birthday', employeeName: 'Neha Sharma', time: 'Today', status: 'Notify', statusClass: 'info' },
    { icon: 'pi pi-star', title: 'Work anniversary', employeeName: 'Kiran Kumar', time: 'Tomorrow', status: '5 Years', statusClass: 'success' },
    { icon: 'pi pi-user-check', title: 'Probation completion', employeeName: 'Anil Reddy', time: '18 Jun', status: 'Review', statusClass: 'warning' },
    { icon: 'pi pi-file', title: 'Contract expiry', employeeName: 'Priya Menon', time: '25 Jun', status: 'Action', statusClass: 'danger' },
    { icon: 'pi pi-calendar-plus', title: 'Joining anniversary', employeeName: 'Rohit Das', time: '30 Jun', status: 'Upcoming', statusClass: 'info' }
  ];

  readonly pendingApprovals: ApprovalRow[] = [
    { requestDate: '06 May 2026', requestType: 'Leave Approval', employeeName: 'Rahul Verma', referenceNo: 'LV-3112', amountOrDays: '3 Days', status: 'Pending', statusClass: 'warning' },
    { requestDate: '05 May 2026', requestType: 'Salary Approval', employeeName: 'Payroll Batch May', referenceNo: 'SAL-0526', amountOrDays: '₹38,60,000', status: 'In Review', statusClass: 'info' },
    { requestDate: '04 May 2026', requestType: 'Reimbursement Approval', employeeName: 'Megha Iyer', referenceNo: 'RE-7042', amountOrDays: '₹8,450', status: 'Approved', statusClass: 'success' },
    { requestDate: '04 May 2026', requestType: 'Advance Request Approval', employeeName: 'Suresh Babu', referenceNo: 'ADV-1407', amountOrDays: '₹25,000', status: 'Pending', statusClass: 'warning' },
    { requestDate: '03 May 2026', requestType: 'Attendance Regularization', employeeName: 'Kiran Kumar', referenceNo: 'AR-8941', amountOrDays: '1 Day', status: 'Rejected', statusClass: 'danger' }
  ];

  readonly recentActivities: ActivityItem[] = [
    { icon: 'pi pi-user-plus', title: 'New employee added', employeeName: 'Asha Rani', time: '12 min ago', status: 'Completed', statusClass: 'success' },
    { icon: 'pi pi-calendar', title: 'Leave request submitted', employeeName: 'Rahul Verma', time: '35 min ago', status: 'Pending', statusClass: 'warning' },
    { icon: 'pi pi-clock', title: 'Attendance regularized', employeeName: 'Kiran Kumar', time: '1 hr ago', status: 'In Review', statusClass: 'info' },
    { icon: 'pi pi-credit-card', title: 'Payroll processed', employeeName: 'Payroll Team', time: '2 hrs ago', status: 'Draft', statusClass: 'warning' },
    { icon: 'pi pi-file-pdf', title: 'Payslip generated', employeeName: '196 Employees', time: 'Yesterday', status: 'Generated', statusClass: 'success' },
    { icon: 'pi pi-upload', title: 'Employee document uploaded', employeeName: 'Megha Iyer', time: 'Yesterday', status: 'Verified', statusClass: 'success' }
  ];
}
