import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
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
 getDesignations(): Observable<any> {
    return this.commonService
      .getAPI('/Common/GetDesignationsALL', 'GlobalSchema=' + this.commonService.getschemaname(), 'YES')
      .pipe(
        catchError((error) => {
          this.commonService.showErrorMessage(error);
          return throwError(() => error);
        })
      );
  }

  getRoles(): Observable<any> {
    const params = 'globalschema=global';
    return this.commonService
      .getAPI('/Common/GetRoles', 'GlobalSchema=' + this.commonService.getschemaname(), 'YES')
      .pipe(
        catchError((error) => {
          this.commonService.showErrorMessage(error);
          return throwError(() => error);
        })
      );
  }

  getBranches(): Observable<any> {
    return this.commonService
      .getAPI('/Common/GetBranches', 'GlobalSchema=' + this.commonService.getschemaname(), 'YES')
      .pipe(
        catchError((error) => {
          this.commonService.showErrorMessage(error);
          return throwError(() => error);
        })
      );
  }

  getRelationShip(): Observable<any> {
     const params = 'globalschema=global';
    return this.commonService
      .getAPI('/Common/getRelationShip', 'GlobalSchema=' + this.commonService.getschemaname(), 'YES')
      .pipe(
        catchError((error) => {
          this.commonService.showErrorMessage(error);
          return throwError(() => error);
        })
      );
  }

  getQualifications(): Observable<any> {
    return this.commonService
      .getAPI('/Common/ViewQualificationDetails', '', 'NO')
      .pipe(
        catchError((error) => {
          this.commonService.showErrorMessage(error);
          return throwError(() => error);
        })
      );
  }

  getCountryDetails(GlobalSchema:any): Observable<any> {
   const params = 'globalschema=global';
    return this.commonService
      .getAPI('/Common/getCountry', params, 'YES')
      .pipe(
        catchError((error) => {
          this.commonService.showErrorMessage(error);
          return throwError(() => error);
        })
      );
  }

  getContactDetailsEmployeeByID(
    referenceId: string,
    branchSchema: string
  ): Observable<any> {

    const params = new HttpParams()
      .set('refernceid', referenceId)
      .set('localschema', branchSchema);

    return this.commonService
      .getAPI('/ContactMore/ViewEmployeeContactDetails', params, 'YES')
      .pipe(
        catchError((error) => {
          this.commonService.showErrorMessage(error);
          return throwError(() => error);
        })
      );
  }

  saveEmployeeDetails(data: any): Observable<any> {
    return this.commonService
      .postAPI('/ContactMore/SaveContactEmployee', data)
      .pipe(
        catchError((error) => {
          this.commonService.showErrorMessage(error);
          return throwError(() => error);
        })
      );
  }
  getDocumentGroupNames(): Observable<any> {
  return this.commonService
    .getAPI('/Common/GetDocumentGroupNames', '', 'NO')
    .pipe(
      catchError((error) => {
        this.commonService.showErrorMessage(error);
        return throwError(() => error);
      })
    );
}

getDocumentNames(groupId: any): Observable<any> {

  const params = new HttpParams()
    .set('groupid', groupId);

  return this.commonService
    .getAPI('/Common/GetDocumentProofs', params, 'NO')
    .pipe(
      catchError((error) => {
        this.commonService.showErrorMessage(error);
        return throwError(() => error);
      })
    );
}

checkpancardno(panNo: string): Observable<any> {

  const params = new HttpParams()
    .set('panno', panNo);

  return this.commonService
    .getAPI('/Common/CheckPanCardNo', params, 'NO')
    .pipe(
      catchError((error) => {
        this.commonService.showErrorMessage(error);
        return throwError(() => error);
      })
    );
}

  saveContact(data: any): Observable<any> {
    return this.commonService.postAPI('/ContactMaster/SaveContact', data);
  }
  getNoOfRecords(tab: string): Observable<number> {
    const params = new HttpParams()
      .set('globalSchema', this.commonService.getschemaname())
      .set('companyCode', this.commonService.getCompanyCode())
      .set('tab', tab);
    return this.commonService.getAPI('/ContactMaster/Getnoofrecords', params, 'YES');
  }


  getSubscriberContactDetails(searchtype: string, formName: string): Observable<any[]> {
    const params = new HttpParams()
      .set('globalSchema', this.commonService.getschemaname())
      .set('searchtype', searchtype)
      .set('formName', formName);
    return this.commonService.getAPI('/Subscriber/GetSubscriberContactDetails', params, 'YES');
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