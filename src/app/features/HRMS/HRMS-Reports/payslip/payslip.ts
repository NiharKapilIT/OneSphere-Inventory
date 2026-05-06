import { Component } from '@angular/core';
import { HrmsReportShell } from '../shared/hrms-report-shell';
import { payslipConfig } from '../shared/hrms-report-configs';

@Component({
  selector: 'app-payslip-report',
  standalone: true,
  imports: [HrmsReportShell],
  template: `<app-hrms-report-shell [config]="config"></app-hrms-report-shell>`
})
export class PayslipReport {
  readonly config = payslipConfig;
}
