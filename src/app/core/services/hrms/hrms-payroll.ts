import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { CommonService } from '../Common/common.service';

@Injectable({
  providedIn: 'root',
})
export class HrmsPayroll {

  constructor(
    private http: HttpClient,
    private _CommonService: CommonService
  ) {}

GetCalendarYear(GlobalSchema: string, CompanyName: string): Observable<any> {
  const params = new HttpParams()
    .set('GlobalSchema', GlobalSchema)
    .set('CompanyName', CompanyName)
    //.set('BranchSchema', BranchSchema)
   

   return this._CommonService.getAPI('/HRMSTransaction/GetCalendarYear', params, 'YES' );
}
}