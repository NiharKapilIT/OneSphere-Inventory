import { HrmsReportConfig } from './hrms-report-shell';

const yearMonthFields = [
  { key: 'year', label: 'Year', type: 'select' as const, required: true, widthClass: 'col-xl-2 col-lg-3 col-md-6' },
  { key: 'month', label: 'Month', type: 'select' as const, required: true, widthClass: 'col-xl-2 col-lg-3 col-md-6' }
];

const employeeYearMonthFields = [
  { key: 'employee', label: 'Select Employee', type: 'employee' as const, widthClass: 'col-xl-4 col-lg-5 col-md-6' },
  ...yearMonthFields
];

const dateRangeFields = [
  { key: 'fromDate', label: 'From Date', type: 'date' as const, required: true, widthClass: 'col-xl-3 col-lg-4 col-md-6' },
  { key: 'toDate', label: 'To Date', type: 'date' as const, required: true, widthClass: 'col-xl-3 col-lg-4 col-md-6' }
];

export const salaryStatementConfig: HrmsReportConfig = {
  title: 'Salary Statement',
  fields: yearMonthFields,
  columns: [
    { field: 'empId', header: 'Emp ID' },
    { field: 'employeeName', header: 'Employee Name' },
    { field: 'designation', header: 'Designation' },
    { field: 'dateOfJoining', header: 'Date Of Joining' },
    { field: 'basic', header: 'Basic' },
    { field: 'vda', header: 'VDA' },
    { field: 'arrears', header: 'Arrears' },
    { field: 'basicProtection', header: 'Basic Protection' }
  ]
};

export const esiStatementConfig: HrmsReportConfig = {
  title: 'ESI Statement',
  fields: [
    { key: 'employee', label: 'Employee Name', type: 'employee', widthClass: 'col-xl-4 col-lg-5 col-md-6' },
    ...yearMonthFields
  ],
  columns: [
    { field: 'employeeId', header: 'Employee ID' },
    { field: 'esiNumber', header: 'E.S.I Number' },
    { field: 'employeeName', header: 'Employee Name' },
    { field: 'absentDays', header: 'Absent Days' },
    { field: 'totalMonthlyWages', header: 'Total Monthly Wages' },
    { field: 'employeeContribution', header: 'Employee Contribution(0.75%)' }
  ]
};

export const pfStatementConfig: HrmsReportConfig = {
  title: 'PF Statement',
  fields: employeeYearMonthFields,
  columns: [
    { field: 'empId', header: 'Emp ID' },
    { field: 'pfNo', header: 'PF No.' },
    { field: 'uanNo', header: 'UAN No.' },
    { field: 'aadharNo', header: 'Aadhar No.' },
    { field: 'employeeName', header: 'Employee Name' },
    { field: 'dateOfBirth', header: 'Date Of Birth' },
    { field: 'absentDays', header: 'Absent Days' },
    { field: 'basic', header: 'Basic' }
  ]
};

export const professionalTaxConfig: HrmsReportConfig = {
  title: 'Professional Tax',
  fields: [
    { key: 'employees', label: 'Select Employees', type: 'employee', widthClass: 'col-xl-4 col-lg-5 col-md-6' },
    ...yearMonthFields
  ],
  columns: [
    { field: 'empId', header: 'Emp ID' },
    { field: 'pfNo', header: 'PF No.' },
    { field: 'uanNo', header: 'UAN No.' },
    { field: 'employeeName', header: 'Employee Name' },
    { field: 'grossSalary', header: 'Gross Salary' },
    { field: 'netSalary', header: 'Net Salary' },
    { field: 'professionalTax', header: 'Professional Tax' }
  ]
};

export const employeeMonthBonusConfig: HrmsReportConfig = {
  title: 'Employee Month Bonus Report',
  fields: [
    { key: 'employee', label: 'Employee Name', type: 'employee', widthClass: 'col-xl-4 col-lg-5 col-md-6' },
    ...yearMonthFields
  ],
  columns: [
    { field: 'month', header: 'Month' },
    { field: 'employeeName', header: 'Employee Name' },
    { field: 'salary', header: 'Salary' },
    { field: 'vda', header: 'V.D.A' },
    { field: 'arrears', header: 'Arrears' },
    { field: 'absents', header: 'Absents' },
    { field: 'totalSalary', header: 'Total Salary' },
    { field: 'bonusAmount', header: 'Bonus Amount' }
  ]
};

export const earnedLeavesConfig: HrmsReportConfig = {
  title: 'Earned Leaves',
  fields: employeeYearMonthFields,
  showSave: true,
  showExportActions: false,
  columns: [
    { field: 'empId', header: 'Emp ID' },
    { field: 'employeeName', header: 'Employee Name' },
    { field: 'basic', header: 'Basic' },
    { field: 'vda', header: 'V.D.A' },
    { field: 'earnedLeaves', header: 'Earned Leaves' },
    { field: 'elAmount', header: 'E.L Amount' },
    { field: 'joiningDate', header: 'Joining Date' },
    { field: 'lastElDate', header: 'Last E.L Date' }
  ]
};

export const loyaltyStatementConfig: HrmsReportConfig = {
  title: 'Loyalty Statement',
  fields: yearMonthFields,
  columns: [
    { field: 'empCode', header: 'Emp Code' },
    { field: 'employeeName', header: 'Employee Name' },
    { field: 'loyaltyAmount', header: 'Loyalty Allowances Amount' },
    { field: 'joiningDate', header: 'Joining Date' },
    { field: 'years', header: 'Years' }
  ]
};

export const payslipConfig: HrmsReportConfig = {
  title: 'PaySlip',
  fields: [
    { key: 'employees', label: 'Employees', type: 'employee', widthClass: 'col-xl-4 col-lg-5 col-md-6' },
    ...yearMonthFields
  ],
  showTable: false,
  primaryActionLabel: 'Generate Pay Slip'
};

export const biometricReportConfig: HrmsReportConfig = {
  title: 'Biometric Report',
  fields: [
    ...dateRangeFields,
    { key: 'leaveType', label: 'Leave Type', type: 'select', required: true, options: ['CL', 'SL', 'EL', 'LOP'], widthClass: 'col-xl-3 col-lg-4 col-md-6' }
  ],
  columns: [
    { field: 'branchName', header: 'Branch Name' },
    { field: 'employeeName', header: 'Employee Name' },
    { field: 'employeeCode', header: 'Employee code' },
    { field: 'date', header: 'Date' },
    { field: 'leaveType', header: 'Leave Type' },
    { field: 'remarks', header: 'Remarks' }
  ]
};

export const transferredEmployeesConfig: HrmsReportConfig = {
  title: 'Transferd Employees',
  fields: dateRangeFields,
  columns: [
    { field: 'employeeCode', header: 'Employee Code' },
    { field: 'employeeName', header: 'Employee Name' },
    { field: 'reportingDate', header: 'Reporting Date' },
    { field: 'transferringDate', header: 'Transferring Date' },
    { field: 'fromBranch', header: 'From Branch' },
    { field: 'toBranch', header: 'To Branch' }
  ]
};

export const khcRenwalsConfig: HrmsReportConfig = {
  title: 'KHC Renwals',
  fields: [
    { key: 'month', label: 'For the Month', type: 'select', required: true, widthClass: 'col-xl-4 col-lg-5 col-md-6' },
    { key: 'type', label: 'Type', type: 'select', required: true, placeholder: 'Select Month', options: ['Renewal', 'Reward'], widthClass: 'col-xl-4 col-lg-5 col-md-6' }
  ],
  columns: [],
  showExportActions: false
};

export const allowanceDetailsConfig: HrmsReportConfig = {
  title: 'Allowance Details',
  fields: [
    { key: 'date', label: 'Date', type: 'date', required: true, widthClass: 'col-xl-3 col-lg-4 col-md-6' }
  ],
  columns: [
    { field: 'branchName', header: 'Branch Name' },
    { field: 'employeeName', header: 'Employee Name' },
    { field: 'allowanceName', header: 'Allowance Name' },
    { field: 'allowanceAmount', header: 'Allowance Amount' }
  ]
};

export const biometricSummaryReportConfig: HrmsReportConfig = {
  title: 'Biometric Summary Report',
  fields: yearMonthFields,
  columns: [
    { field: 'branchName', header: 'Branch Name' },
    { field: 'employeeCode', header: 'Employee Code' },
    { field: 'employeeName', header: 'Employee Name' },
    { field: 'day24', header: 'Day 24' },
    { field: 'day25', header: 'Day 25' },
    { field: 'day26', header: 'Day 26' },
    { field: 'day27', header: 'Day 27' },
    { field: 'day28', header: 'Day 28' },
    { field: 'day29', header: 'Day 29' }
  ]
};

export const biometricModificationsConfig: HrmsReportConfig = {
  title: 'Biometric Modifications',
  fields: [
    ...dateRangeFields,
    { key: 'employee', label: 'Select Employee', type: 'employee', widthClass: 'col-xl-3 col-lg-4 col-md-6' }
  ],
  columns: [
    { field: 'branchName', header: 'Branch Name' },
    { field: 'employeeCode', header: 'Employee Code' },
    { field: 'employeeName', header: 'Employee Name' },
    { field: 'date', header: 'Date' },
    { field: 'modificationType', header: 'Modification Type' },
    { field: 'remarks', header: 'Remarks' }
  ]
};
