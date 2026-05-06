import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { CommonService } from "../Common/common.service";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AccountsConfig {

  recordid: any;
  bankdetails: any;
  status: any;
  adressdetails: any;

  constructor(
    private http: HttpClient,
    private _CommonService: CommonService
  ) { }

  ViewChequeManagementDetails(BranchSchema: any, GlobalSchema: any, CompanyCode: any, BranchCode: any, PageSize: any, PageNo: any): Observable<any> {
    const params = new HttpParams()
      .set('BranchSchema', BranchSchema)
      .set('GlobalSchema', GlobalSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode)
      .set('PageSize', PageSize).set('PageNo', PageNo);

    return this._CommonService.getAPI(
      '/Accounts/GetViewChequeManagementDetails',
      params,
      'YES'
    );
  }

  GetBankDetails1(recordid: any, data: any) {
    this.recordid = recordid;
    this.bankdetails = data;
  }




  GetBankDetails(GlobalSchema: any, BranchCode: any, CompanyCode: any,): Observable<any> {
    ;
    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('BranchCode', BranchCode).set('CompanyCode', CompanyCode);
    return this._CommonService.getAPI('/Accounts/GetBankNames', params, 'YES');
  }


  GetCompanyBranchHierarchy(startIndex: any, endIndex: any): Observable<any> {

    const params = new HttpParams().set('startIndex', startIndex).set('endIndex', endIndex);
    return this._CommonService.getAPI('/Accounts/GetCompanyBranchHierarchy', params, 'YES');
  }




  GetBankUPIDetails(GlobalSchema: any, BranchCode: any, CompanyCode: any,): Observable<any> {
    ;
    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('BranchCode', BranchCode).set('CompanyCode', CompanyCode);
    return this._CommonService.getAPI('/Accounts/GetBankUPIDetails', params, 'YES');
  }


  GetExistingChequeCount(
    bankId: any,
    chqFromNo: any,
    chqToNo: any,
    BranchSchema: any,
    CompanyCode: any,
    BranchCode: any,
  ): Observable<any> {
    const params = new HttpParams()

      .set('bankId', bankId)
      .set('chqFromNo', chqFromNo)
      .set('chqToNo', chqToNo)
      .set('BranchSchema', BranchSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode)
      ;

    return this._CommonService.getAPI(
      '/Accounts/GetExistingChequeCount',
      params,
      'YES'
    );
  }

  GetAvailableChequeCount(
    BankId: any,
    ChqFromNo: any,
    ChqToNo: any
  ): Observable<any> {
    const params = new HttpParams()
      .set('BranchSchema', this._CommonService.getschemaname())
      .set('BankId', BankId)
      .set('ChqFromNo', ChqFromNo)
      .set('ChqToNo', ChqToNo);

    return this._CommonService.getAPI(
      '/Accounting/Configuration/GetAvailableChequeCount',
      params,
      'YES'
    );
  }

  SaveChequeManagement(cheqinformation: any): Observable<any> {
    return this._CommonService.postAPI(
      '/Accounts/SaveChequeManagement',
      cheqinformation
    );
  }
  updateChequeManagement(cheqinformation: any): Observable<any> {
    return this._CommonService.postAPI(
      '/Accounts/UpdateChequeManagement',
      cheqinformation
    );
  }

  viewbankinformation(
    GlobalSchema: any, BranchSchema: any, BranchCode: any, CompanyCode: any

  ): Observable<any> {
    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('BranchSchema', BranchSchema)
      .set('BranchCode', BranchCode).set('CompanyCode', CompanyCode)
      ;

    return this._CommonService.getAPI(
      '/Accounts/GetViewBankInformationDetails',
      params,
      'Yes'
    );
  }

  viewbank(precordid: any, GlobalSchema: any, BranchSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    const params = new HttpParams().set('precordid', precordid).set('GlobalSchema', GlobalSchema)
      .set('BranchSchema', BranchSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode)

    return this._CommonService.getAPI(
      '/Accounts/ViewBankInformation',

      params,
      'Yes'
    );
  }

  newformstatus(status: any): void {
    this.status = status;
  }

  newstatus(): any {
    return this.status;
  }

  editbankdetails(): any {
    return this.recordid;
  }

  editbankdetails1(): any {
    return this.bankdetails;
  }

  savebankinformation(bankinformationdata: any): Observable<any> {
    return this._CommonService.postAPI(
      '/Accounts/SaveBankInformation',
      bankinformationdata
    );
  }

  GetCheckDuplicateDebitCardNo(bankinformationdata: any): Observable<any> {

    return this._CommonService.postAPI(
      '/Accounts/GetCheckDuplicateDebitCardNo',
      bankinformationdata
    );
  }




  GetBankNames(GlobalSchema: any, AccountsSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    ;
    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('AccountsSchema', AccountsSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    // return this._CommonService.getAPI('/Accounts/BankNames', params, 'YES');
    return this._CommonService.getAPI('/Accounts/GetBankNames', params, 'YES');
  }

  GetBanks(precordid: any, GlobalSchema: any, BranchSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    ;
    const params = new HttpParams().set('precordid', precordid).set('GlobalSchema', GlobalSchema).set('BranchSchema', BranchSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    // return this._CommonService.getAPI('/Accounts/BankNames', params, 'YES');
    return this._CommonService.getAPI('/Accounts/GetViewBankInformation', params, 'YES');
  }
  GetGlobalBanks(GlobalSchema: any): Observable<any> {
    ;
    const params = new HttpParams().set('GlobalSchema', GlobalSchema);
    // return this._CommonService.getAPI('/Accounts/BankNames', params, 'YES');
    return this._CommonService.getAPI('/Accounts/GetGlobalBanks', params, 'YES');
  }


  GetAccountTree(): Observable<any> {
    const params = new HttpParams()
      .set('BranchSchema', this._CommonService.getschemaname());

    return this._CommonService.getAPI(
      '/AccountTree',
      params,
      'YES'
    );
  }

  GetAccountTreeSearch(searchterm: any): Observable<any> {
    const params = new HttpParams()
      .set('BranchSchema', this._CommonService.getschemaname())
      .set('searchterm', searchterm);

    return this._CommonService.getAPI(
      '/AccountTreeSearch',
      params,
      'YES'
    );
  }

  getBankConfigurationdetails(branchschema: any): Observable<any> {
    const params = new HttpParams()
      .set('branchschema', branchschema);

    return this._CommonService.getAPI(
      '/BankInformation/getBankConfigurationdetails',
      params,
      'YES'
    );
  }

  GetSubLedgerdata(ledgerid: any, branchschema: any): Observable<any> {
    const params = new HttpParams()
      .set('ledgerid', ledgerid)
      .set('branchschema', branchschema);

    return this._CommonService.getAPI(
      '/GetSubLedgerdata',
      params,
      'YES'
    );
  }

  CheckAccountnameDuplicate(
    Accountname: any,
    Accounttype: any,
    Parentid: any
  ): Observable<any> {
    const params = new HttpParams()
      .set('Accountname', Accountname)
      .set('AccountType', Accounttype)
      .set('ParentId', Parentid);

    return this._CommonService.getAPI(
      '/checkAccountnameDuplicates',
      params,
      'YES'
    );
  }



  SaveAccountHeads(accountsdata: any): Observable<any> {
    return this._CommonService.postAPI(
      '/SaveAccHead',
      accountsdata
    );
  }



  SaveCompanyConfiguration(companydata: any): Observable<any> {
    return this._CommonService.postAPI('/Accounts/SaveCompanyConfiguration', companydata);
  }

}