import { Component } from '@angular/core';
import { HrmsReportShell } from '../shared/hrms-report-shell';
import { salaryStatementConfig } from '../shared/hrms-report-configs';

@Component({
  selector: 'app-salary-statement',
  standalone: true,
  imports: [HrmsReportShell],
  template: `<app-hrms-report-shell [config]="config"></app-hrms-report-shell>`
})
export class SalaryStatement {
  readonly config = salaryStatementConfig;
}
