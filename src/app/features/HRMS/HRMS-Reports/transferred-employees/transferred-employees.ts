import { Component } from '@angular/core';
import { HrmsReportShell } from '../shared/hrms-report-shell';
import { transferredEmployeesConfig } from '../shared/hrms-report-configs';

@Component({
  selector: 'app-transferred-employees',
  standalone: true,
  imports: [HrmsReportShell],
  template: `<app-hrms-report-shell [config]="config"></app-hrms-report-shell>`
})
export class TransferredEmployees {
  readonly config = transferredEmployeesConfig;
}
