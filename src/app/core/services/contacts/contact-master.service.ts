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

  getNoOfRecords(tab: string): Observable<number> {
    const params = new HttpParams()
      .set('globalSchema', this.commonService.getschemaname())
      .set('companyCode', this.commonService.getCompanyCode())
      .set('tab', tab);
    return this.commonService.getAPI('/ContactMaster/Getnoofrecords', params, 'YES');
  }

saveContactSupplier(contactId: string, isSupplier: boolean): Observable<any> {

  const url =
    `/ContactMore/SaveContactSupplier` +
    `?globalSchema=${this.commonService.getschemaname()}` +
    `&companyCode=${this.commonService.getCompanyCode()}` +
    `&branchCode=${this.commonService.getBranchCode()}`;

  const body = {
    pContactId: contactId,
    pIsSupplier: isSupplier
  };

  return this.commonService.postAPI(url, body);
}
}