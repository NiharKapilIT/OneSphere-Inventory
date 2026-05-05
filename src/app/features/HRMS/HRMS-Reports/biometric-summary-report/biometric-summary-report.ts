import { Component } from '@angular/core';
import { HrmsReportShell } from '../shared/hrms-report-shell';
import { biometricSummaryReportConfig } from '../shared/hrms-report-configs';

@Component({
  selector: 'app-biometric-summary-report',
  standalone: true,
  imports: [HrmsReportShell],
  template: `<app-hrms-report-shell [config]="config"></app-hrms-report-shell>`
})
export class BiometricSummaryReport {
  readonly config = biometricSummaryReportConfig;
}
