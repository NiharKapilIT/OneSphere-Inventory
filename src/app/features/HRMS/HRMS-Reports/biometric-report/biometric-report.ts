import { Component } from '@angular/core';
import { HrmsReportShell } from '../shared/hrms-report-shell';
import { biometricReportConfig } from '../shared/hrms-report-configs';

@Component({
  selector: 'app-biometric-report-page',
  standalone: true,
  imports: [HrmsReportShell],
  template: `<app-hrms-report-shell [config]="config"></app-hrms-report-shell>`
})
export class BiometricReportPage {
  readonly config = biometricReportConfig;
}
