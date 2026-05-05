import { Component } from '@angular/core';
import { HrmsReportShell } from '../shared/hrms-report-shell';
import { esiStatementConfig } from '../shared/hrms-report-configs';

@Component({
  selector: 'app-esi-statement',
  standalone: true,
  imports: [HrmsReportShell],
  template: `<app-hrms-report-shell [config]="config"></app-hrms-report-shell>`
})
export class EsiStatement {
  readonly config = esiStatementConfig;
}
