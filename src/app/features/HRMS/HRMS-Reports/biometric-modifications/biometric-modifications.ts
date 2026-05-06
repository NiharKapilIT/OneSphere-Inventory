import { Component } from '@angular/core';
import { HrmsReportShell } from '../shared/hrms-report-shell';
import { biometricModificationsConfig } from '../shared/hrms-report-configs';

@Component({
  selector: 'app-biometric-modifications',
  standalone: true,
  imports: [HrmsReportShell],
  template: `<app-hrms-report-shell [config]="config"></app-hrms-report-shell>`
})
export class BiometricModifications {
  readonly config = biometricModificationsConfig;
}
