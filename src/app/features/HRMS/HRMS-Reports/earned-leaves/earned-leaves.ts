import { Component } from '@angular/core';
import { HrmsReportShell } from '../shared/hrms-report-shell';
import { earnedLeavesConfig } from '../shared/hrms-report-configs';

@Component({
  selector: 'app-earned-leaves',
  standalone: true,
  imports: [HrmsReportShell],
  template: `<app-hrms-report-shell [config]="config"></app-hrms-report-shell>`
})
export class EarnedLeaves {
  readonly config = earnedLeavesConfig;
}
