import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { CommonService } from "../Common/common.service";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class HrmsPayroll {
 constructor(private http: HttpClient, private _CommonService: CommonService) { }



  getPolicyEmployeeDetails(GlobalSchema: any, CompanyCode: any, BranchSchema: any, BranchId: any): Observable<any> {
    const params = new HttpParams().set('GlobalSchema', GlobalSchema) .set('CompanyCode', CompanyCode).set('BranchSchema', BranchSchema)
     .set('BranchId', BranchId);
    return this._CommonService.getAPI('/Accounts/getPolicyEmployeeDetails', params, 'YES');
  }
    


    SavePolicyDetails(data: any) {
    return this._CommonService.postAPI('/Accounts/SavePolicyDetails', data);
  }



}
