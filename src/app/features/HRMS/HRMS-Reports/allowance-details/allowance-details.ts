import { Component } from '@angular/core';
import { HrmsReportShell } from '../shared/hrms-report-shell';
import { allowanceDetailsConfig } from '../shared/hrms-report-configs';

@Component({
  selector: 'app-allowance-details',
  standalone: true,
  imports: [HrmsReportShell],
  template: `<app-hrms-report-shell [config]="config"></app-hrms-report-shell>`
})
export class AllowanceDetails {
  readonly config = allowanceDetailsConfig;
}
