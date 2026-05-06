import { Component } from '@angular/core';
import { HrmsReportShell } from '../shared/hrms-report-shell';
import { employeeMonthBonusConfig } from '../shared/hrms-report-configs';

@Component({
  selector: 'app-employee-month-bonus-report',
  standalone: true,
  imports: [HrmsReportShell],
  template: `<app-hrms-report-shell [config]="config"></app-hrms-report-shell>`
})
export class EmployeeMonthBonusReport {
  readonly config = employeeMonthBonusConfig;
}
