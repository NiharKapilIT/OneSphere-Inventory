import { Component } from '@angular/core';
import { HrmsReportShell } from '../shared/hrms-report-shell';
import { loyaltyStatementConfig } from '../shared/hrms-report-configs';

@Component({
  selector: 'app-loyalty-statement',
  standalone: true,
  imports: [HrmsReportShell],
  template: `<app-hrms-report-shell [config]="config"></app-hrms-report-shell>`
})
export class LoyaltyStatement {
  readonly config = loyaltyStatementConfig;
}
