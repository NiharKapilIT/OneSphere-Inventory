import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { CommonService } from '../Common/common.service';

@Injectable({ providedIn: 'root' })
export class ContactMasterService {

  constructor(private commonService: CommonService) { }

  getContactViewByName(tabname: string, endindex: number): Observable<any[]> {
    const params = new HttpParams()
      .set('GlobalSchema', this.commonService.getschemaname())
      .set('companyCode', this.commonService.getCompanyCode())
      .set('type', 'ALL')
      .set('endindex', endindex)
      .set('tabname', tabname);
    return this.commonService.getAPI('/ContactMaster/GetcontactviewByName', params, 'YES');
  }
}
