import { Component } from '@angular/core';
import { HrmsReportShell } from '../shared/hrms-report-shell';
import { pfStatementConfig } from '../shared/hrms-report-configs';

@Component({
  selector: 'app-pf-statement',
  standalone: true,
  imports: [HrmsReportShell],
  template: `<app-hrms-report-shell [config]="config"></app-hrms-report-shell>`
})
export class PfStatement {
  readonly config = pfStatementConfig;
}
