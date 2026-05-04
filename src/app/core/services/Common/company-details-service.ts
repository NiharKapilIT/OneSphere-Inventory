import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { CommonService } from './common.service';

@Injectable({
  providedIn: 'root',
})
export class CompanyDetailsService {
  private http = inject(HttpClient);
  private commonService = inject(CommonService);


  GetCompanyData(): Observable<any> {  
     
        let params = new HttpParams().set('GlobalSchema', this.commonService.getschemaname()).set('CompanyCode', this.commonService.getCompanyCode()).set('BranchCode', this.commonService.getBranchCode());
        return this.commonService.getAPI('/Accounts/GetCompanyNameAndAddress', params, 'YES') .pipe(
          catchError((e:any) => {
            this.commonService.showErrorMessage(e);
            return throwError(() => e);
          })
        );
    }

  SaveTextData(data: any): Observable<any> {
    return this.commonService.postAPI(
      '/Common/SaveTextData',
      data
    );
  }
  
}
