import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs'
import { CommonService } from '../Common/common.service';


//gerneal recipt cancel service



  export interface PettyCashCancelPayload {


  global_schema: string;
  branch_schema: string;
  company_code: string;
  branch_code: string;

  pbranchid: number;
  pCreatedby: number;
  receiptid: number;

  ppaymentdate: string;

  tbltransgenreceiptcancelid: string;
  branchid: string;
  receiptamount: string;          // ✔ changed to string
  paymentid: string;
  cancellationreason: string;
  schemaid: string;
  receiptnumber: string;
  parentaccountname: string;
  receiptdate: string;

  ledgeramount: string;           // ✔ changed to string
  totalreceivedamount: string;    // ✔ changed to string

  // contactname: string;
  modeofreceipt: string;
  narration: string;
  employee: string;

  tbltransgeneralreceiptid: string; // ✔ changed to string

  ppaymentdate_old: string;

  ptypeofoperation: string;

  isgstapplicable: string;        // ✔ changed to string ("true"/"false")
  tdsamount: string;              // ✔ changed to string
  pistdsapplicable: string;       // ✔ changed to string

  contactid: string;              // ✔ safer as string
  pTdsPercentage: string;         // ✔ string

  autorizedcontactid: string;     // ✔ string

  userid: string;                 // ✔ string
  ipaddress: string;

  logentrydatetime: string;

  activitytype: string;
}



export interface GeneralreceiptCancelPayload {

  global_schema: string;
  branch_schema: string;
  company_code: string;
  branch_code: string;

  pbranchid: number;
  pCreatedby: number;
  receiptid: number;

  ppaymentdate: string;

  tbltransgenreceiptcancelid: number;   // changed to number
  branchid: number;                     // changed to number
  receiptamount: number;                // changed to number
  paymentid: number;                   // changed to number
  cancellationreason: string;
  schemaid: number;                    // changed to number
  receiptnumber: string;
  parentaccountname: string;
  receiptdate: string;

  ledgeramount: number;                // changed to number
  totalreceivedamount: number;         // changed to number

  modeofreceipt: string;
  narration: string;
  employee: string;

  tbltransgeneralreceiptid: number;    // changed to number

  ppaymentdate_old: string;

  ptypeofoperation: string;

  isgstapplicable: string;
  tdsamount: number;                  // changed to number
  pistdsapplicable: string;

  contactid: number;                  // changed to number
  pTdsPercentage: number;             // changed to number

  autorizedcontactid: number;         // changed to number

  userid: number;                     // changed to number
  ipaddress: string;

  logentrydatetime: string;

  activitytype: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccountsTransactions {


  httpHeaders = new HttpHeaders({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  });
  GetBankBalances: any;
  constructor(private http: HttpClient, private _CommonService: CommonService) { }



  GetPaymentVoucherExistingData(GlobalSchema: any, BranchSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('BranchSchema', BranchSchema)
      .set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/GetPaymentVoucherExistingData', params, 'YES');
  }


  GetOnlineSettlementList(payload: { transactiondate: string; branchcode: string; companycode: string; globalschema: string; }): Observable<any> {
    throw new Error('Method not implemented.');
  }
  GetUsersCompanyCodes(): Observable<any> {
    debugger;
    // const params = new HttpParams();
    return this._CommonService.getAPI('/Accounts/GetUsersCompanyCodes', '', 'NO');
  }

  GetUsersBranchCodes(companyConfigurationId: any): Observable<any> {
    const params = new HttpParams().set('companyConfigurationId', companyConfigurationId);
    return this._CommonService.getAPI('/Accounts/GetUsersBranchCodes', params, 'YES');
  }


  deletePaymentVoucher(id: number) {
    const params = new HttpParams().set('id', id).set('BranchSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/AccountingTransactions/DeletePaymentVoucher', params, 'YES');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  }

  // GetChequesInBankData(bankid: any, startindex: any, endindex: any, modeofreceipt: any, searchtext: any, printorview: any): Observable<any> {
  //   debugger;
  //   const params = new HttpParams().set('depositedBankid', bankid).set('BranchSchema', this._CommonService.getschemaname()).set('startindex', startindex).set('endindex', endindex).set('modeofreceipt', modeofreceipt).set('searchtext', searchtext).set('printorview', printorview);
  //   return this._CommonService.getAPI('/Accounts/GetChequesInBankData', params, 'YES')
  // }
  GetChequesInBankData(depositedBankid: any, GlobalSchema: any, BranchSchema: any,
    startindex: any, endindex: any, modeofreceipt: any, searchtext: any, CompanyCode: any, BranchCode: any) {
    let params = new HttpParams().set('depositedBankid', depositedBankid)
      .set('GlobalSchema', GlobalSchema).set('BranchSchema', BranchSchema).set('startindex', startindex).set('endindex', endindex)
      .set('modeofreceipt', modeofreceipt).set('searchtext', searchtext).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/GetChequesInBankData', params, 'YES');
  }
  GetReceiptsandPaymentsLoadingDataPettyCash(): Observable<any> {

    const params = new HttpParams().set('formname', 'PETTYCASH').set('BranchSchema', 'accounts').set('companyCode', 'KAPILCHITS')
      .set('branchCode', 'KLC01').set('GlobalSchema', 'global').set('TaxesSchema', 'taxes');
    return this._CommonService.getAPI('/Accounts/GetReceiptsandPaymentsLoadingDatapettycash', params, 'YES');
  }
  //  getChequesRowCount(data: any) {
  //   let params: any = {
  //     depositedBankId: data.depositedBankId, globalSchema: data.globalSchema, branchSchema: data.branchSchema, searchtext: data.searchtext, 
  //     BrsFromDate: data.BrsFromDate, BrsTodate: data.BrsTodate, formname: data.formname, modeofreceipt: data.modeofreceipt, 
  //     companyCode: data.companyCode, branchCode: data.branchCode};
  //   return this._CommonService.getAPI('/Accounts/getChequesRowCount', params, 'YES');
  // }
  GetGeneralReceiptExistingData(): Observable<any> {
    const params = new HttpParams().set('GlobalSchema', 'global').set('BranchSchema', 'accounts').set('TaxSchema', 'taxes')
      .set('CompanyCode', this._CommonService.getCompanyCode()).set('BranchCode', this._CommonService.getBranchCode());
    return this._CommonService.getAPI('/Accounts/GetGeneralReceiptExistingData', params, 'YES');
  }
  GetModeoftransactions(): Observable<any> {
    return this._CommonService.getAPI('/AccountingTransactions/GetModeoftransactions', '', 'NO');
  }
  GetGeneralReceiptsData(GlobalSchema: any, BranchSchema: any, TaxSchema: any, CompanyCode: any,
    BranchCode: any): Observable<any> {

    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('BranchSchema', BranchSchema).set('TaxSchema', TaxSchema)
      .set('CompanyCode', CompanyCode).set('BranchCode', BranchCode); return this._CommonService.getAPI('/Accounts/GetGeneralReceiptsData', params, 'YES');
  }
  GetReceiptsandPaymentsLoadingData(formname: any, BranchSchema: any): Observable<any> {
    const params = new HttpParams().set('formname', formname).set('BranchSchema', BranchSchema);
    return this._CommonService.getAPI('/accountingtransactions/GetReceiptsandPaymentsLoadingData', params, 'YES');
  }
  GetReceiptsandPaymentsLoadingData2(formname: any, BranchSchema: any, GlobalSchema: any, CompanyCode: any, BranchCode: any, TaxesSchema: any): Observable<any> {
    const params = new HttpParams().set('formname', formname).set('BranchSchema', BranchSchema)
      .set('GlobalSchema', GlobalSchema).set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode).set('TaxesSchema', TaxesSchema);
    return this._CommonService.getAPI('/Accounts/GetReceiptsandPaymentsLoadingData', params, 'YES');
  }

  GetReceiptsandPaymentsLoadingData1(GlobalSchema: any, AccountsSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('AccountsSchema', AccountsSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/BankNames', params, 'YES');
  }
  GetLedgerData1(formname: any, BranchSchema: any, CompanyCode: any, BranchCode: any, GlobalSchema: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('formname', formname).set('BranchSchema', BranchSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode).set('GlobalSchema', GlobalSchema);
    return this._CommonService.getAPI('/Accounts/GetLedgerAccountList', params, 'YES');
  }
  GetBankDetailsbyId1(pbankid: any, BranchSchema: any, GlobalSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('pbankid', pbankid).set('BranchSchema', BranchSchema).set('GlobalSchema', GlobalSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    // return this._CommonService.getAPI('/Accounts/BankNames', params, 'YES');
    return this._CommonService.getAPI('/Accounts/GetBankDetailsbyId', params, 'YES');
  }
  GetIssuedChequeNumbers(_BankId: any, BranchSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('_BankId', _BankId).set('BranchSchema', BranchSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    // return this._CommonService.getAPI('/Accounts/BankNames', params, 'YES');
    return this._CommonService.getAPI('/Accounts/GetIssuedChequeNumbers', params, 'YES');
  }
  GetBankNames(GlobalSchema: any, AccountsSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('AccountsSchema', AccountsSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/GetBankNames', params, 'YES');
  }
  GetReceiptNumber(GlobalSchema: any, BranchSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('BranchSchema', BranchSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/GetReceiptNumber', params, 'YES');
  }
  GetBankDetailsbyId(pbankid: any): Observable<any> {
    const params = new HttpParams().set('pbankid', pbankid).set('BranchSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/accountingtransactions/GetBankDetailsbyId', params, 'YES');
  }
  GetProductnamesandHSNcodes(): Observable<any> {
    //const params = new HttpParams().set('GlobalSchema',GlobalSchema);
    return this._CommonService.getAPI('/Configuration/GlobalConfiguration/GetProductnamesandHSNcodes', "params", 'NO');
  }
  GetReceiptsandPaymentsLoadingDatapettycash(formname: any, BranchSchema: any, companyCode: any, branchCode: any, GlobalSchema: any, TaxesSchema: 'taxes'): Observable<any> {
    const params = new HttpParams().set('formname', formname).set('BranchSchema', BranchSchema).set('companyCode', companyCode).set('branchCode', branchCode).set('GlobalSchema', GlobalSchema)
      .set('TaxesSchema', TaxesSchema);
    return this._CommonService.getAPI('/Accounts/GetReceiptsandPaymentsLoadingDatapettycash', params, 'YES');
  }
  // getchequesrowcount(depositedBankId: any, GlobalSchema: 'global', branchSchema: any, searchtext: any, BrsFromDate: any,
  //   BrsToDate: any, formname: any, modeofreceipt: any, companyCode: 'KAPILCHITS', branchCode: 'KLC01'): Observable<any> {
  //   const params = new HttpParams().set('depositedBankId', depositedBankId).set('GlobalSchema', GlobalSchema).set('branchSchema', branchSchema)
  //     .set('searchtext', searchtext).set('BrsFromDate', BrsFromDate).set('BrsToDate', BrsToDate).set('formname', formname).
  //     set('modeofreceipt', modeofreceipt).set('companyCode', companyCode).set('branchCode', branchCode);
  //   return this._CommonService.getAPI('/Accounts/getchequesrowcount', params, 'YES');
  // }
  // GetBankBalance(brstodate: any, _recordid: any, branchSchema: any, branchCode: 'KLC01', companyCode: 'KAPILCHITS') {
  //   const params = new HttpParams().set('brstodate', brstodate).set('_recordid', _recordid).set('branchSchema', branchSchema)
  //     .set('branchCode', branchCode).set('companyCode', companyCode);
  //   return this._CommonService.getAPI('/Accounts/GetBankBalance', params, 'YES');
  // }
  getReceiptNumber(GlobalSchema: any, BranchSchema: any, CompanyCode: any, BranchCode: any) {
    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('BranchSchema', BranchSchema).set("CompanyCode", CompanyCode)
      .set("BranchCode", BranchCode); return this._CommonService.getAPI("/Accounts/getReceiptNumber", params, 'YES');
  }

  // GetSubLedgerDataACCOUNTS(pledgerid: any, BranchSchema: any, CompanyCode: any, BranchCode: any, GlobalSchema: any): Observable<any> {
  //   debugger;
  //   const params = new HttpParams().set('pledgerid', pledgerid).set('BranchSchema', BranchSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode).set('GlobalSchema', GlobalSchema);
  //   return this._CommonService.getAPI('/Accounts/GetSubLedgerData', params, 'YES');
  // }
  GetSubLedgerData3(pledgerid: any, BranchSchema: any, CompanyCode: any, LocalSchema: any, BranchCode: any, GlobalSchema: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('pledgerid', pledgerid).set('BranchSchema', BranchSchema)
      .set('CompanyCode', CompanyCode).set('LocalSchema', LocalSchema).set('BranchCode', BranchCode).set('GlobalSchema', GlobalSchema);
    return this._CommonService.getAPI('/Accounts/GetSubLedgerData', params, 'YES');
  }
  GetSubLedgerDataFORinterbranch(pledgerid: any, BranchSchema: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('pledgerid', pledgerid).set('BranchSchema', BranchSchema);
    return this._CommonService.getAPI('/accountingtransactions/GetSubLedgerData', params, 'YES');
  }
  GetSubLedgerRestrictedStatus(pledgerid: any, BranchSchema: any, GlobalSchema: any, branchcode: any, companycode: any

  ): Observable<any> {
    debugger;
    const params = new HttpParams().set('pledgerid', pledgerid).set('BranchSchema', BranchSchema).set('GlobalSchema', GlobalSchema).set('branchcode', branchcode).set('companycode', companycode);
    return this._CommonService.getAPI('/Accounts/GetSubLedgerRestrictedStatus', params, 'YES');
  }
  GetSubLedgerDetails(pledgerid: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('pledgerid', pledgerid).set('BranchSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/accountingtransactions/GetSubLedgerDetails', params, 'YES');
  }
  GetChitValueDetails(groupcode: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('groupcode', groupcode).set('BranchSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/accountingtransactions/GetChitValueDetails', params, 'YES');
  }

  getPartyDetailsbyid(ppartyid: any, BranchSchema: any, BranchCode: any, CompanyCode: any, GlobalSchema: any, TaxSchema: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('ppartyid', ppartyid).set('BranchSchema', BranchSchema)
      .set('BranchCode', BranchCode).set('CompanyCode', CompanyCode)
      .set('GlobalSchema', GlobalSchema).set('TaxSchema', TaxSchema)
      ;
    return this._CommonService.getAPI('/Accounts/getPartyDetailsbyid', params, 'YES');
  }

  GetCashRestrictAmountpercontact(formname: any, branchschema: any, ppartyid: any, trans_date: any): Observable<any> {
    const params = new HttpParams().set('type', formname).set('contactid', ppartyid).set('BranchSchema', branchschema).set('checkdate', trans_date);
    return this._CommonService.getAPI('/Accounts/GetCashRestrictAmountpercontact', params, 'YES');
  }
  GetCashRestrictAmountpercontact1(type: any, branchtype: any, BranchSchema: any, contactid: any, checkdate: any, CompanyCode: any, GlobalSchema: any,
    BranchCode: any): Observable<any> {
    const params = new HttpParams().set('type', type).set('branchtype', branchtype).set('BranchSchema', BranchSchema).set('contactid', contactid)
      .set('checkdate', checkdate).set('CompanyCode', CompanyCode).set('GlobalSchema', GlobalSchema).set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/GetCashRestrictAmountpercontact', params, 'YES');
  }
  // GetBanksList(BranchSchema: any): Observable<any> {
  //   const params = new HttpParams().set('BranchSchema', BranchSchema);
  //   return this._CommonService.getAPI('/AccountingTransactions/GetBankntList', params, 'YES')
  // }
  GetBanksntList(BranchSchema: any, GlobalSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    const params = new HttpParams().set('BranchSchema', BranchSchema).set('GlobalSchema', GlobalSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/GetBankntList', params, 'YES')
  }
  GetBankNameDetails(globalSchema: any, branchSchema: any, BranchCode: any, CompanyCode: any): Observable<any> {
    let params = new HttpParams().set('globalSchema', globalSchema).set('branchSchema', branchSchema).set('BranchCode', BranchCode).set('CompanyCode', CompanyCode);
    return this._CommonService.getAPI('/Accounts/GetBankNameDetails', params, 'YES')
  }


  // GetPayTmBanksList(BranchSchema: any, p0: string, p1: string): Observable<any> {
  //   const params = new HttpParams().set('BranchSchema', BranchSchema);
  //   return this._CommonService.getAPI('/ChequesOnHand/GetBankUPIList', params, 'YES')
  // }
  GetPayTmBanksList(BranchSchema: any, CompanyCode: string, BranchCode: string): Observable<any> {
    const params = new HttpParams().set('BranchSchema', BranchSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/BankUPIList', params, 'YES')
  }
  // GetCAOBranchList(BranchSchema: any,CompanyCode:any,BranchCode:any): Observable<any> {
  //   const params = new HttpParams().set('BranchSchema', BranchSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
  //   return this._CommonService.getAPI('/ChequesOnHand/GetCAOBranchList', params, 'YES')
  // }
  GetCAOBranchList(GlobalSchema: any, BranchSchema: any, CompanyCode: any, BranchCode: any,): Observable<any> {
    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('BranchSchema', BranchSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/GetCAOBranchList', params, 'YES')
  }

  // GetChequesOnHandData(_BankId: any, BrsFromDate: any, BrsTodate: any, GlobalSchema: any,
  //   BranchSchema: any, startindex: any, endindex: any, _searchText: any,modeofreceipt: any, printorview: any,
  //   companyCode: any, branchCode: any): Observable<any> {
  //    debugger;
  //   const params = new HttpParams().set('_BankId', _BankId).set('BrsFromDate', BrsFromDate).set('BrsTodate', BrsTodate).set('GlobalSchema', GlobalSchema).set('BranchSchema', BranchSchema).set('startindex', startindex).set('endindex', endindex).set('searchtext', _searchText).set('printorview', printorview).set('companyCode', companyCode).set('branchCode', branchCode);
  //   return this._CommonService.getAPI('/Accounts/GetChequesOnHandData', params, 'YES')
  // }


  GetChequesOnHandData(_BankId: any, GlobalSchema: any, BranchSchema: any,
    startindex: any, endindex: any, _searchText: any, modeofreceipt: any,
    printorview: any, companyCode: any, branchCode: any): Observable<any> {
    const params = new HttpParams()
      .set('_BankId', _BankId)
      .set('GlobalSchema', GlobalSchema)
      .set('BranchSchema', BranchSchema)
      .set('startindex', startindex)
      .set('endindex', endindex)
      .set('modeofreceipt', modeofreceipt)
      .set('searchtext', _searchText || '')
      .set('printorview', printorview || 'PDF')
      .set('companyCode', companyCode)
      .set('branchCode', branchCode);
    return this._CommonService.getAPI('/Accounts/GetChequesOnHandData', params, 'YES')
  }

  GetCashOnHandData(caobranch: any): Observable<any> {
    const params = new HttpParams().set('BranchSchema', this._CommonService.getschemaname()).set('caoBranch', caobranch);
    return this._CommonService.getAPI('/ChequesOnHand/GetCashOnHandData', params, 'YES')
  }
  GetCashOnHandData_(BranchSchema: any, fromdate: any, todate: any, AsOnDate: any, CompanyCode: any, BranchCode: any, GlobalSchema: any): Observable<any> {//added by uday on 04-09-2024
    const params = new HttpParams().set('BranchSchema', BranchSchema).set('fromdate', fromdate)
      .set('todate', todate).set('AsOnDate', AsOnDate).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode).set('GlobalSchema', GlobalSchema);
    return this._CommonService.getAPI('/Accounts/GetCashOnHandData', params, 'YES');
  }

  // SaveChequesOnHand(data: any) {
  //   return this._CommonService.postAPI('/ChequesOnHand/SaveChequesOnHand', data)
  // }

  SaveChequesOnHand(data: any) {
    return this._CommonService.postAPI('/Accounts/SaveChequesOnHand', data);
  }

  SaveCashOnHand(data: any) {
    return this._CommonService.postAPI('/ChequesOnHand/SaveCashOnHand', data)
  }

  UpdateCashOnHand(data: any) {
    return this._CommonService.postAPI('/ChequesOnHand/UpdateCashOnHand', data)
  }

  // DataFromBrsDatesChequesOnHand(frombrsdate: any, tobrsdate: any, bankid: any, modeofreceipt: any, searchtext: any, startindex: any, endindex: any) {
  //   const params = new HttpParams().set('BrsFromDate', frombrsdate).set('BrsTodate', tobrsdate).set('_BankId', bankid).set('BranchSchema', this._CommonService.getschemaname()).set('modeofreceipt', modeofreceipt).set('searchtext', searchtext).set('startindex', startindex).set('endindex', endindex);
  //   return this._CommonService.getAPI('/ChequesOnHand/GetChequesOnHandData_New', params, 'YES');
  // }


  //   DataFromBrsDatesChequesOnHand(frombrsdate: any, tobrsdate: any, bankid: any, modeofreceipt: any, 
  //   searchtext: any, startindex: any, endindex: any) {
  //   const params = new HttpParams()
  //     .set('BrsFromDate', frombrsdate)
  //     .set('BrsTodate', tobrsdate)
  //     .set('_BankId', bankid)
  //     .set('GlobalSchema', this._CommonService.getschemaname())
  //     .set('BranchSchema', this._CommonService.getbranchname()) 
  //     .set('modeofreceipt', modeofreceipt)
  //     .set('searchtext', searchtext)
  //     .set('startindex', startindex)
  //     .set('endindex', endindex)
  //     .set('printorview', '')
  //     .set('companyCode', this._CommonService.getCompanyCode())
  //     .set('branchCode', this._CommonService.getBranchCode());


  //   return this._CommonService.getAPI('/Accounts/GetChequesOnHandData', params, 'YES');
  // }

  // DataFromBrsDatesChequesOnHand(frombrsdate: any, tobrsdate: any, bankid: any, modeofreceipt: any,
  //   searchtext: any, startindex: any, endindex: any) {
  //   const params = new HttpParams()
  //     .set('BrsFromDate', frombrsdate ?? '')
  //     .set('BrsTodate', tobrsdate ?? '')
  //     .set('_BankId', bankid)
  //     .set('GlobalSchema', this._CommonService.getschemaname())
  //     .set('BranchSchema', this._CommonService.getbranchname())
  //     .set('modeofreceipt', modeofreceipt || 'ALL')
  //     .set('searchtext', searchtext || '0')
  //     .set('startindex', startindex ?? 0)
  //     .set('endindex', endindex ?? 10)
  //      .set('printorview', 'PDF')
  //     .set('companyCode', this._CommonService.getCompanyCode())
  //     .set('branchCode', this._CommonService.getBranchCode());

  //   return this._CommonService.getAPI('/Accounts/GetChequesOnHandData', params, 'YES');
  // }

  DataFromBrsDatesChequesOnHand(frombrsdate: any, tobrsdate: any, bankid: any, modeofreceipt: any,
    searchtext: any, startindex: any, endindex: any) {
    const params = new HttpParams()
      .set('BrsFromDate', frombrsdate ?? '')
      .set('BrsTodate', tobrsdate ?? '')
      .set('_BankId', bankid)
      .set('BranchSchema', this._CommonService.getbranchname())
      .set('startindex', startindex ?? 0)
      .set('endindex', endindex ?? 10)
      .set('modeofreceipt', modeofreceipt ?? 'ALL')
      .set('searchtext', searchtext || '0')
      .set('GlobalSchema', this._CommonService.getschemaname())
      .set('companyCode', this._CommonService.getCompanyCode())
      .set('branchCode', this._CommonService.getBranchCode());

    return this._CommonService.getAPI('/Accounts/GetChequesOnHandData_New', params, 'YES');
  }

  GetBankntList(BranchSchema: any, GlobalSchema: any, CompanyCode: any, BranchCode: any) {
    const params = new HttpParams().set('BranchSchema', BranchSchema).set('globalSchema', GlobalSchema)
      .set('companyCode', CompanyCode).set('branchCode', BranchCode)
    return this._CommonService.getAPI('/Accounts/GetBankntList', params, 'YES')
  }

  GetBankUPIDetails(GlobalSchema: any, BranchCode: any, CompanyCode: any) {
    const params = new HttpParams().set('globalSchema', GlobalSchema).set('companyCode', CompanyCode).set('branchCode', BranchCode)
    return this._CommonService.getAPI('/Accounts/GetBankUPIDetails', params, 'YES')
  }
  // GetGlobalBanks(): Observable<any[]> {
  //       const params = new HttpParams().set('GlobalSchema', 'global');
  //       return this._CommonService.getAPI('/Accounts/GetGlobalBanks', params, 'YES');
  //   }

  // GetBankBalance(brstodate:any,_recordid:any,BranchSchema:any,branchCode:any,companyCode:any) {
  //   const params = new HttpParams().set('brstodate', brstodate).set('_recordid',_recordid).set('BranchSchema',BranchSchema).set('branchCode',branchCode).set('companyCode',companyCode);
  //   return this._CommonService.getAPI('/Accounts/GetBankBalance', params, 'YES');
  // }
  GetCashonhandBalance(globalSchema: any, BranchSchema: any, branchCode: any, companyCode: any) {
    const params = new HttpParams().set('globalSchema', globalSchema).set('BranchSchema', BranchSchema)
      .set('branchCode', branchCode).set('companyCode', companyCode);
    return this._CommonService.getAPI('/Accounts/GetCashonhandBalance', params, 'YES');
  }

  GetChequesIssuedData(bankid: any, startindex: any, endindex: any, modeofreceipt: any, _searchText: any, printorview: any): Observable<any> {
    const params = new HttpParams().set('_BankId', bankid).set('BranchSchema', this._CommonService.getschemaname()).set('startindex', startindex).set('endindex', endindex).set('modeofreceipt', modeofreceipt).set('searchtext', _searchText).set('printorview', printorview);
    return this._CommonService.getAPI('/Accounts/GetChequesIssued', params, 'YES')
  }

  // DataFromBrsDatesChequesIssued(frombrsdate: any, tobrsdate: any, bankid: any, modeofreceipt: any, _searchText: any, startindex: any, endindex: any) {
  //   const params = new HttpParams().set('BrsFromDate', frombrsdate).set('BrsTodate', tobrsdate).set('_BankId', bankid).set('BranchSchema', this._CommonService.getschemaname()).set('modeofreceipt', modeofreceipt).set('startindex', startindex).set('endindex', endindex).set('searchtext', _searchText);
  //   return this._CommonService.getAPI('/Accounts/GetIssuedCancelledCheques', params, 'YES');
  // }

  DataFromBrsDatesChequesIssued(
    frombrsdate: any,
    tobrsdate: any,
    bankid: any,
    modeofreceipt: any,
    _searchText: any,
    startindex: any,
    endindex: any,
    printorview: any
  ) {

    let params = new HttpParams();

    params = params.set('BrsFromDate', frombrsdate || '');

    params = params.set('BrsTodate', tobrsdate || '');

    params = params.set('BankId', bankid || 0);

    params = params.set('GlobalSchema', this._CommonService.getschemaname());

    params = params.set('BranchSchema', this._CommonService.getbranchname());

    params = params.set('startindex', startindex || 0);

    params = params.set('endindex', endindex || 100);

    params = params.set('modeofreceipt', modeofreceipt || '');

    params = params.set('searchtext', _searchText || '');

    params = params.set('printorview', printorview || '');

    params = params.set('companyCode', this._CommonService.getCompanyCode());

    params = params.set('branchCode', this._CommonService.getBranchCode());

    return this._CommonService.getAPI(
      '/Accounts/GetIssuedCancelledCheques',
      params,
      'YES'
    );

  }


  DataFromBrsDatesForOtherChequesDetails(frombrsdate: any, tobrsdate: any, bankid: any) {
    const params = new HttpParams().set('BrsFromDate', frombrsdate).set('BrsTodate', tobrsdate).set('_BankId', bankid).set('BranchSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/Accounts/GetChequesOtherDetails', params, 'YES');
  }

  getchequereturncharges(GlobalSchema: any, companyCode: any, branchCode: any) {
    const params = new HttpParams().set('globalSchema', GlobalSchema).set('companyCode', companyCode)
      .set('branchCode', branchCode); return this._CommonService.getAPI('/Accounts/getchequereturncharges', params, 'YES')

  }
  getreceiptnumber(GlobalSchema: any, BranchSchema: any, CompanyCode: any, BranchCode: any) {
    const params = new HttpParams().set('globalSchema', GlobalSchema).set('BranchSchema', BranchSchema)
      .set('CompanyCode', CompanyCode).set('BranchCode', BranchCode)
    return this._CommonService.getAPI('/Accounts/getreceiptnumber', params, 'YES')
  }
  getGeneralReceiptsData(GlobalSchema: any, BranchSchema: any, TaxSchema: any, CompanyCode: any, BranchCode: any) {
    const params = new HttpParams().set('globalSchema', GlobalSchema).set('BranchSchema', BranchSchema)
      .set('TaxSchema', TaxSchema).set('companyCode', CompanyCode).set('branchCode', BranchCode)
    return this._CommonService.getAPI('/Accounts/getGeneralReceiptsData', params, 'YES')
  }
  getBankUPIDetails(GlobalSchema: any, BranchCode: any, CompanyCode: any) {
    const params = new HttpParams().set('globalSchema', GlobalSchema).set('branchCode', BranchCode)
      .set('companyCode', CompanyCode); return this._CommonService.getAPI('/Accounts/getBankUPIDetails', params, 'YES')
  }

  GetPaytmInBankData(bankid: any, startindex: any, endindex: any, modeofreceipt: any, searchtext: any, printorview: any, receiptDate: any, chequeintype: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('depositedBankid', bankid).set('BranchSchema', this._CommonService.getschemaname()).set('startindex', startindex).set('endindex', endindex).set('modeofreceipt', modeofreceipt).set('searchtext', searchtext).set('printorview', printorview).set('receiptDate', receiptDate).set('chequeintype', chequeintype);
    return this._CommonService.getAPI('/ChequesOnHand/GetUPIClearedData', params, 'YES')
  }
  SaveChequesIssued(data: any) {
    return this._CommonService.postAPI('/Accounts/SaveChequesIssued', data)
  }

  GetUPIClearedDataForTotalCount(bankid: any, startindex: any, endindex: any, modeofreceipt: any, searchtext: any, printorview: any, receiptDate: any, chequeintype: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('depositedBankid', bankid).set('BranchSchema', this._CommonService.getschemaname()).set('startindex', startindex).set('endindex', endindex).set('modeofreceipt', modeofreceipt).set('searchtext', searchtext).set('printorview', printorview).set('receiptDate', receiptDate).set('chequeintype', chequeintype);
    return this._CommonService.getAPI('/ChequesOnHand/GetUPIClearedDataForTotalCount', params, 'YES')
  }

  // GetChequesRowCount(depositedBankId: any, GlobalSchema: any, BranchSchema: any, searchtext: any,
  //   BrsFromDate: any, BrsTodate: any, formname: any, modeofreceipt: any, companyCode: any, branchCode: any): Observable<any> {
  //   const params = new HttpParams().set('depositedBankid', depositedBankId).set('GlobalSchema', GlobalSchema)
  //     .set('BranchSchema', BranchSchema).set('searchtext', searchtext).set('BrsFromDate', BrsFromDate).set('BrsTodate', BrsTodate).set('formname', formname)
  //     .set('modeofreceipt', modeofreceipt)
  //     .set('companyCode', companyCode).set('branchCode', branchCode);
  //   return this._CommonService.getAPI('/Accounts/GetChequesRowCount', params, 'YES')
  // }

  //   GetChequesRowCount(depositedBankId: any, globalSchema: any, branchSchema: any, searchtext: any,
  //   BrsFromDate: any, BrsTodate: any, formname: any, modeofreceipt: any, companyCode: any, branchCode: any): Observable<any> {
  //   const params = new HttpParams()
  //     .set('depositedBankId', depositedBankId)
  //     .set('globalSchema', globalSchema)      
  //     .set('branchSchema', branchSchema)      
  //     .set('searchtext', searchtext)
  //     .set('BrsFromDate', BrsFromDate)
  //     .set('BrsTodate', BrsTodate)
  //     .set('formname', formname)
  //     .set('modeofreceipt', modeofreceipt)
  //     .set('companyCode', companyCode)
  //     .set('branchCode', branchCode);
  //   return this._CommonService.getAPI('/Accounts/GetChequesRowCount', params, 'YES')
  // }

  GetChequesRowCount(depositedBankId: any, GlobalSchema: any, BranchSchema: any, searchtext: any,
    formname: any, modeofreceipt: any, companyCode: any, branchCode: any): Observable<any> {
    const params = new HttpParams().set('depositedBankid', depositedBankId).set('GlobalSchema', GlobalSchema)
      .set('BranchSchema', BranchSchema).set('searchtext', searchtext).set('formname', formname)
      .set('modeofreceipt', modeofreceipt)
      .set('companyCode', companyCode).set('branchCode', branchCode);
    return this._CommonService.getAPI('/Accounts/GetChequesRowCount', params, 'YES')
  }

  //  getchequesrowcount(depositedBankId: any, GlobalSchema: 'global', branchSchema: any, searchtext: any, BrsFromDate: any,
  //     BrsToDate: any, formname: any, modeofreceipt: any, companyCode: 'KAPILCHITS', branchCode: 'KLC01'): Observable<any> {
  //     const params = new HttpParams().set('depositedBankId', depositedBankId).set('GlobalSchema', GlobalSchema).set('branchSchema', branchSchema)
  //       .set('searchtext', searchtext).set('BrsFromDate', BrsFromDate).set('BrsToDate', BrsToDate).set('formname', formname).
  //       set('modeofreceipt', modeofreceipt).set('companyCode', companyCode).set('branchCode', branchCode);
  //     return this._CommonService.getAPI('/Accounts/getchequesrowcount', params, 'YES');
  //   }

  // GetChequeEnquiryData(bankid): Observable<any> {
  //   const params = new HttpParams().set('depositedBankid', bankid).set('BranchSchema', this._CommonService.getschemaname());
  //   return this._CommonService.getAPI('/ChequesOnHand/GetChequeEnquiryData', params, 'YES')
  // }
  // GetChequeEnquiryData(bankid: any, startindex: any, endindex: any, modeofreceipt: any, searchtext: any): Observable<any> {
  //   const params = new HttpParams().set('depositedBankid', bankid).set('BranchSchema', this._CommonService.getschemaname()).set('startindex', startindex).set('endindex', endindex).set('modeofreceipt', modeofreceipt).set('searchtext', searchtext);
  //   return this._CommonService.getAPI('/ChequesOnHand/GetChequeEnquiryData', params, 'YES')
  // }
  GetChequeEnquiryData(bankid: any, startindex: any, endindex: any, modeofreceipt: any, searchtext: any): Observable<any> {
    const params = new HttpParams().set('depositedBankid', bankid).set('BranchSchema', this._CommonService.getbranchname()).set('startindex', startindex).set('endindex', endindex).set('modeofreceipt', modeofreceipt).set('searchtext', searchtext).set('BrsFromDate', '01-01-1991').set('BrsTodate', '11-03-2026').set('GlobalSchema', this._CommonService.getschemaname()).set('CompanyCode', this._CommonService.getCompanyCode()).set('BranchCode', this._CommonService.getBranchCode());
    return this._CommonService.getAPI('/ChequesOnHand/GetChequeEnquiryData', params, 'YES')
  }

  SaveChequesInBank(data: any) {
    return this._CommonService.postAPI('/Accounts/SaveChequesInBank', data)
  }

  SaveOnLineCollection_JV(data: any) {
    return this._CommonService.postAPI('/ChequesOnHand/SaveOnLineCollection_JV', data)
  }

  // DataFromBrsDatesChequesInBank(frombrsdate: any, tobrsdate: any, bankid: any, modeofreceipt: any, searchtext: any, startindex: any, endindex: any,GlobalSchema: any) {
  //   const params = new HttpParams().set('BrsFromDate', frombrsdate).set('BrsTodate', tobrsdate).set('depositedBankid', bankid).set('BranchSchema', this._CommonService.getschemaname()).set('modeofreceipt', modeofreceipt).set('searchtext', searchtext).set('startindex', startindex).set('endindex', endindex);
  //   return this._CommonService.getAPI('/Accounts/GetClearedReturnedCheques_New', params, 'YES');
  // }

  DataFromBrsDatesChequesInBank(
    frombrsdate: string,
    tobrsdate: string,
    bankid: number | string,
    modeofreceipt: string,
    searchtext: string = '',
    startindex: number = 0,
    endindex: number = 50,
    companycode: string,
    branchcode: string,
    globalschema: string = 'global'
  ) {
    const params = new HttpParams()
      .set('BrsFromDate', frombrsdate)
      .set('BrsTodate', tobrsdate)
      .set('depositedBankid', bankid.toString())
      .set('BranchSchema', this._CommonService.getbranchname())
      .set('modeofreceipt', modeofreceipt)
      .set('searchtext', searchtext)
      .set('startindex', startindex.toString())
      .set('endindex', endindex.toString())
      .set('CompanyCode', companycode)
      .set('BranchCode', branchcode)
      .set('GlobalSchema', globalschema);

    return this._CommonService.getAPI('/Accounts/GetClearedReturnedCheques_New', params, 'YES');
  }
  DataFromBrsDatesChequesIssued1(
    frombrsdate: string,
    tobrsdate: string,
    bankid: number | string,
    modeofreceipt: string,
    searchtext: string = '',
    startindex: number = 0,
    endindex: number = 50,
    companycode: string,
    branchcode: string,
    globalschema: string = 'global'
  ) {
    const params = new HttpParams()
      .set('BrsFromDate', frombrsdate)
      .set('BrsTodate', tobrsdate)
      .set('depositedBankid', bankid.toString())
      .set('BranchSchema', this._CommonService.getbranchname())
      .set('modeofreceipt', modeofreceipt)
      .set('searchtext', searchtext)
      .set('startindex', startindex.toString())
      .set('endindex', endindex.toString())
      .set('CompanyCode', companycode)
      .set('BranchCode', branchcode)
      .set('GlobalSchema', globalschema);

    return this._CommonService.getAPI('/Accounts/GetIssuedCancelledCheques_New', params, 'YES');
  }
  GetPendingautoBRSDetails(BranchSchema: any, allocationstatus: any, GlobalSchema: any, BranchCode: any, CompanyCode: any) {
    let params = new HttpParams().set('BranchSchema', BranchSchema).set('allocationstatus', allocationstatus).set('GlobalSchema', GlobalSchema).set('BranchCode', BranchCode)
      .set('CompanyCode', CompanyCode);
    return this._CommonService.getAPI('/Accounts/GetPendingautoBRSDetails', params, 'YES');
  }
  GetPendingautoBRSDetailsIssued(BranchSchema: any, allocationstatus: any) {
    const params = new HttpParams().set('BranchSchema', BranchSchema).set('allocationstatus', allocationstatus)
    return this._CommonService.getAPI('/ChequesOnHand/GetPendingautoBRSDetailsIssued', params, 'YES');
  }

  DataFromBrsDatesChequesIssuedBankubi(frombrsdate: any, tobrsdate: any, bankid: any) {
    const params = new HttpParams().set('BrsFromDate', frombrsdate).set('BrsTodate', tobrsdate).set('_BankId', bankid).set('BranchSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/ChequesOnHand/GetIssuedCancelledCheques_Newubi', params, 'YES');
  }

  DataFromBrsDatesChequesInBankubi(frombrsdate: any, tobrsdate: any, bankid: any) {
    const params = new HttpParams().set('BrsFromDate', frombrsdate).set('BrsTodate', tobrsdate).set('depositedBankid', bankid).set('BranchSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/ChequesOnHand/GetClearedReturnedCheques_Newubi', params, 'YES');
  }

  savePaymentVoucher(data: any) {
    debugger;
    return this._CommonService.postAPI('/Accounts/SavePaymentVoucher', data)
  }
  saveChequesIssued(data: any) {
    debugger;
    return this._CommonService.postAPI('/Accounts/saveChequesIssued', data)
  }
  saveCancelPettyCashReceipt(data: any) {
    debugger;
    return this._CommonService.postAPI('/Accounts/saveCancelPettyCashReceipt', data)
  }
  SaveInterBranchPaymentVoucher(data: any) {
    debugger;
    return this._CommonService.postAPI('/AccountingTransactions/SaveInterBranchPaymentVoucher', data)
  }

  saveInterBranchPaymentVoucherDetailsAll(data: any) {
    debugger;
    return this._CommonService.postAPI('/AccountingTransactions/saveInterBranchPaymentVoucherDetailsAll', data)
  }

  saveChallanaPayment(data: any) {
    debugger;
    return this._CommonService.postAPI('/AccountingTransactions/saveChallanaPaymentVoucher', data)
  }

  SavePettyCash(data: any) {
    return this._CommonService.postAPI('/Accounts/SavePettyCash', data)
  }

  saveGeneralReceipt(data: any) {
    const params = new HttpParams();
    // .set('Branchschema', branchSchema).set('Globalschema', globalSchema);
    return this._CommonService.postAPI('/Accounts/savegeneralreceipt', data);
  }

  saveJournalVoucher(data: any) {
    return this._CommonService.postAPI('/Accounts/SaveJournalVoucher', data)
  }

  GetJournalVoucherData(
    BranchSchema: any, CompanyCode: any, BranchCode: any
  ): Observable<any> {
    const params = new HttpParams().set('BranchSchema', BranchSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/GetJournalVoucherData', params, 'YES');
  }

  // UnusedhequeCancel(data: any) {
  //   debugger
  //   return this._CommonService.postAPI('/Accounting/AccountingReports/UnusedhequeCancel', data)
  // }
  // UnusedhequeCancel(data: any, BranchCode: any, CompanyCode: any, branchSchema: any, GlobalSchema: any) {
  //   const body = {
  //   ...data,
  //   BranchCode,
  //   CompanyCode,
  //   branchSchema,  
  //   GlobalSchema
  // };
  // console.log('Service body:', JSON.stringify(body, null, 2));
  //   return this._CommonService.postAPI('/Accounts/UnusedhequeCancel', body)
  // }
  UnusedhequeCancel(data: any, BranchCode: any, CompanyCode: any, branchSchema: any, GlobalSchema: any) {
    const params = new HttpParams()
      .set('BranchCode', BranchCode)
      .set('CompanyCode', CompanyCode)
      .set('branchSchema', branchSchema)
      .set('GlobalSchema', GlobalSchema);

    return this._CommonService.postAPIWithParams('/Accounts/UnusedhequeCancel', data, params);
  }

  // GetChequeReturnDetails(strFromDate: any, strToDate: any, p0: string, p1: string, p2: string, p3: string) {
  //   const params = new HttpParams().set('fromdate', strFromDate).set('todate', strToDate).set('BranchSchema', this._CommonService.getschemaname());
  //   return this._CommonService.getAPI('/Accounting/AccountingReports/GetChequeReturnDetails', params, 'YES');
  // }
  GetChequeReturnDetails(strFromDate: any, strToDate: any, BranchSchema: string, GlobalSchema: string, CompanyCode: string, BranchCode: string) {
    const params = new HttpParams().set('fromdate', strFromDate).set('todate', strToDate).set('BranchSchema', BranchSchema).set('GlobalSchema', GlobalSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/GetChequeReturnDetails', params, 'YES');
  }

  // GetChequeCancelDetails(strFromDate: any, strToDate: any) {
  //   const params = new HttpParams().set('fromdate', strFromDate).set('todate', strToDate).set('BranchSchema', this._CommonService.getschemaname());
  //   return this._CommonService.getAPI('/Accounting/AccountingReports/GetChequeCancelDetails', params, 'YES');
  // }
  GetChequeCancelDetails(strFromDate: any, strToDate: any, BranchSchema: any, GlobalSchema: any, CompanyCode: any, BranchCode: any) {
    const params = new HttpParams().set('fromdate', strFromDate).set('todate', strToDate).set('BranchSchema', BranchSchema).set('GlobalSchema', GlobalSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/GetChequeCancelDetails', params, 'YES');
  }

  GetInitialPVDetails(fromdate: any, todate: any, transtype: any) {
    const params = new HttpParams().set('fromdate', fromdate).set('todate', todate).set('transtype', transtype).set('localSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/Accounting/AccountingTransactions/GetInitialPVDetails', params, 'YES');
  }

  Getemipaymentsdata() {
    const params = new HttpParams().set('localSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/Accounting/AccountingTransactions/Getemipayments', params, 'YES');
  }

  GetBidPayableAdjust(fromdate: any, todate: any, formname: any) {
    debugger
    const params = new HttpParams().set('LocalSchema', this._CommonService.getschemaname()).set('Formname', formname).set('Fromdate', fromdate).set('Todate', todate)
    return this._CommonService.getAPI('/Notice/PSInfo/ZPDBidPaybleAdjust', params, 'YES');
  }
  // GetChequesOnHand(strToDate: any) {
  //   const params = new HttpParams().set('Ason', strToDate).set('BranchSchema', this._CommonService.getschemaname());
  //   return this._CommonService.getAPI('/Accounting/AccountingReports/GetChequesonHandData', params, 'YES');
  // }
  GetChequesOnHand(strToDate: any, BranchSchema: any, GlobalSchema: any, CompanyCode: any, BranchCode: any) {
    const params = new HttpParams().set('Ason', strToDate).set('BranchSchema', BranchSchema).set('GlobalSchema', GlobalSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/ChequesonHandData', params, 'YES');
  }

  getBranchType() {
    const params = new HttpParams().set('BranchSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/ChitTransactions/getBranchType', params, 'YES');
  }

  GetChequesIssued(
    _BankId: any,
    BranchSchema: any,
    startindex: any,
    endindex: any,
    modeofreceipt: any,
    searchtext: any,
    GlobalSchema: any,
    branchcode: any,
    companycode: any
  ) {
    const params = new HttpParams()
      .set('_BankId', _BankId ?? '')
      .set('BranchSchema', BranchSchema ?? '')
      .set('startindex', startindex ?? 0)
      .set('endindex', endindex ?? 10)
      .set('modeofreceipt', modeofreceipt ?? 'ALL')
      .set('searchtext', searchtext ?? '')
      .set('GlobalSchema', GlobalSchema ?? '')
      .set('branchcode', branchcode ?? '')
      .set('companycode', companycode ?? '');

    return this._CommonService.getAPI('/Accounts/GetChequesIssued', params, 'YES');
  }

  GetBankBalance(
    brstodate: any,
    _recordid: any,
    branchSchema: any,
    branchCode: any,
    companyCode: any
  ) {
    const params = new HttpParams()
      .set('brstodate', brstodate ?? '')
      .set('_recordid', _recordid ?? '')
      .set('branchSchema', branchSchema ?? '')
      .set('branchCode', branchCode ?? '')
      .set('companyCode', companyCode ?? '');

    return this._CommonService.getAPI('/Accounts/GetBankBalance', params, 'YES');
  }


  getChequeReturnCharges(GlobalSchema: string, companyCode: string, branchCode: string): Observable<any> {
    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('companyCode', companyCode)
      .set('branchCode', branchCode);
    return this._CommonService.getAPI('/Accounts/GetChequeReturnCharges', params, 'YES');
  }


  saveGstVoucher(localschema: any, data: any) {
    debugger;
    return this._CommonService.postAPI('/ChitTransactions/savegstvocuher?localschema=' + localschema, data)
  }
  Getgstvocuherprint(Branchschema: any, Gstvoucherno: any): Observable<any> {
    const params = new HttpParams().set('Branchschema', Branchschema).set('Gstvoucherno', Gstvoucherno);
    return this._CommonService.getAPI('/ChitTransactions/Getgstvocuherprint', params, 'YES')
  }
  getgstdocuments(Contactid: any): Observable<any> {
    const params = new HttpParams().set('Contactid', Contactid);
    return this._CommonService.getAPI('/Transactions/ChitTransations/AuctionController/gstvoucherdocuments', params, 'YES')
  }
  GetGlobalBanks(GlobalSchema: string,): Observable<any[]> {
    const params = new HttpParams().set('GlobalSchema', GlobalSchema);
    return this._CommonService.getAPI('/Accounts/GetGlobalBanks', params, 'YES');
  }
  GetPettyCashExistingData(GlobalSchema: string, BranchSchema: string, CompanyCode: string, Branchcode: string): Observable<any> {
    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('BranchSchema', BranchSchema)
      .set('CompanyCode', CompanyCode).set('Branchcode', Branchcode);
    return this._CommonService.getAPI('/Accounts/GetPettyCashExistingData', params, 'YES');
  }

  getPartywiseStates(): Observable<any[]> {
    return this.http.get<any[]>(
      'https://localhost:5001/api/Accounts/GetPartywiseStates?BranchSchema=accounts&partyid=1&GlobalSchema=global&CompanyCode=KAPILCHITS&BranchCode=KLC01'
    );
  }
  GetPartyDetailsById(ppartyid: number): Observable<any> {

    const params = new HttpParams()
      .set('ppartyid', ppartyid.toString()).set('BranchSchema', this._CommonService.getbranchname()).
      set('BranchCode', this._CommonService.getBranchCode()).set('CompanyCode', this._CommonService.getCompanyCode()).set('GlobalSchema', 'global').set('TaxSchema', 'taxes');
    return this._CommonService.getAPI('/Accounts/getPartyDetailsbyid', params, 'YES');
  }
  GetCashAmountAccountWise(formname: any, BranchSchema: any, account_id: any, transaction_date: any, GlobalSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    const params = new HttpParams().set('formname', formname).set('BranchSchema', BranchSchema).set('account_id', account_id).set('transaction_date', transaction_date).set('GlobalSchema', GlobalSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/GetCashAmountAccountWise', params, 'YES')
  }
  GettdsLedgerAccountsList(formname: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('formname', formname).set('BranchSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/AccountingTransactions/GetLedgerAccountList', params, 'YES');
  }
  GettdsLedgerAccountsList1(formname: any, BranchSchema: any, CompanyCode: any, BranchCode: any, GlobalSchema: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('formname', formname).set('BranchSchema', BranchSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode).set('GlobalSchema', GlobalSchema);
    return this._CommonService.getAPI('/Accounts/GetLedgerAccountList', params, 'YES');
  }
  GetTdsSectionNo(GlobalSchema: 'taxes', CompanyCode: 'KAPILCHITS', BranchCode: 'KLC01'): Observable<any> {
    debugger;
    const params = new HttpParams()
      .set('globalSchema', GlobalSchema).set('companyCode', CompanyCode).set('branchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/GetTdsSectionNo', params, 'YES');
  }

  GettdsJVDetails(Branchschema: any, creditledger: any, monthYear: any, debitledger: any, GlobalSchema: any, branchCode: any, companyCode: any): Observable<any> {
    const params = new HttpParams().set('Branchschema', Branchschema).set('creditledger', creditledger).set('MonthYear', monthYear)
      .set('debitledger', debitledger).set('GlobalSchema', GlobalSchema).set('branchCode', branchCode).set('companyCode', companyCode);
    return this._CommonService.getAPI('/Accounts/GetTDSJVDetails', params, 'YES');
  }



  GetInterBranchJVDetails(creditledger: any, transactiondate: any, debitledger: any): Observable<any> {
    const params = new HttpParams().set('Branchschema', this._CommonService.getschemaname()).set('creditledger', creditledger).set('todate', transactiondate).set('debitledger', debitledger);
    return this._CommonService.getAPI('/AccountingTransactions/GetInterBranchJVDetails', params, 'YES');
  }


  saveTDSjvdetails(data: any) {
    return this._CommonService.postAPI('/Accounts/SaveTDSJVDetails', data)
  }

  SaveInterBranchJVDetails(data: any) {
    return this._CommonService.postAPI('/accountingtransactions/SaveInterBranchJVDetails', data)
  }

  GetTDSJVDetailsDuplicateCheck(Branchschema: any, JVType: any, MonthYear: any, GlobalSchema: any, companyCode: any, branchCode: any): Observable<any> {
    const params = new HttpParams().set('Branchschema', Branchschema).set('JVType', JVType).set('MonthYear', MonthYear)
      .set('GlobalSchema', GlobalSchema).set('companyCode', companyCode).set('branchCode', branchCode);
    return this._CommonService.getAPI('/Accounts/GetTDSJVDetailsDuplicateCheck', params, 'YES');
  }

  GetLCExpensesLedgerAccountsList(formname: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('formname', formname).set('BranchSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/AccountingTransactions/GetLedgerAccountList', params, 'YES');
  }


  GetUPIClearedData_SettlementReport(fromdate: any, todate: any, pbankid: any) {
    const params = new HttpParams().set('FromDate', fromdate).set('Todate', todate).set('BranchSchema', this._CommonService.getschemaname()).set('depositedBankid', pbankid);
    return this._CommonService.getAPI('/ChequesOnHand/GetUPIClearedData_SettlementReport', params, 'YES');
  }

  getForemanDetails(BranchSchema: any, branchid: any, fromdate: any, todate: any, chitStatus: any): Observable<any> {
    const params = new HttpParams().set('BranchSchema', BranchSchema).set('branch_id', branchid).set('fromdate', fromdate).set('todate', todate).set('chitgrouptype', chitStatus);
    return this._CommonService.getAPI('/accountingtransactions/GetForemanDetails', params, 'YES');
  }

  GetForemanPaymentDetails(BranchSchema: any, fromdate: any, todate: any): Observable<any> {
    const params = new HttpParams().set('BranchSchema', BranchSchema).set('fromdate', fromdate).set('todate', todate);
    return this._CommonService.getAPI('/accountingtransactions/GetForemanPaymentDetails', params, 'YES');
  }

  SaveForemanDetails(data: any) {
    return this._CommonService.postAPI('/accountingtransactions/SaveForemanDetails', data)
  }
  getBanklist(GlobalSchema: 'global', BranchSchema: 'accounts', BranchCode: 'KLC01', CompanyName: 'KAPILCHITS'): Observable<any> {
    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('BranchSchema', BranchSchema).set('BranchCode', BranchCode).set('CompanyName', CompanyName);
    return this._CommonService.getAPI('/Accounts/getBankTransferDetails', params, 'YES');
  }
  getBankTransferDetails(BranchSchema: any, todate: any, banktransferid: any): Observable<any> {
    const params = new HttpParams().set('BranchSchema', BranchSchema).set('banktransferid', banktransferid).set('todate', todate);
    return this._CommonService.getAPI('/accountingtransactions/getBankTransferDetails', params, 'YES');
  }
  GetParollJVDetailsforwelfare(Branchschema: any, todate: any, debitledger: any): Observable<any> {
    const params = new HttpParams().set('Branchschema', Branchschema).set('debitledger', debitledger).set('todate', todate);
    return this._CommonService.getAPI('/AccountingTransactions/GetPayrollJVDetailsforwelfare', params, 'YES');
  }
  GetBankTransferTypes(BranchSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    const params = new HttpParams().set('branchSchema', BranchSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/GetBankTransferTypes', params, 'YES');

  }


  SaveBankTransferDetails(data: any) {
    return this._CommonService.postAPI('/accountingtransactions/SaveBankTransferDetails', data)
  }
  SaveParollJVDetailsforwelfare(data: any) {
    return this._CommonService.postAPI('/AccountingTransactions/SaveParollJVDetailsforwelfare', data)
  }

  SaveSchemeChequesUpdate(data: any) {
    debugger;
    return this._CommonService.postAPI('/ChitTransactions/SaveSchemeChequesUpdate', data)
  }

  GetLegalCellNames(): Observable<any> {
    const params = new HttpParams().set('BranchSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/ChitTransactions/GetLegalCellBranchAccountListforGeneralReceipt', params, 'YES');
  }

  saveInterBranchData(data: any) {
    return this._CommonService.postAPI('/ChitTransactions/saveInterBranchReceiptForLegalCell', data)
  }

  saveInterBranchDataForLegal(data: any) {
    return this._CommonService.postAPI('/ChitTransactions/saveInterBranchReceiptForLegalChitReceipt', data)
  }
  GetAgentadvancetenures(): Observable<any> {

    return this._CommonService.getAPI('/ChitTransactions/GetAgentadvancetenures', '', 'NO');
  }
  GetAgentadvanceinterest(Tenureid: any) {
    const params = new HttpParams().set('Tenureid', Tenureid);
    return this._CommonService.getAPI('/ChitTransactions/GetAgentadvanceinterest', params, 'YES');

  }

  GetSubLedgerDataLcExpenses(pledgerid: any, BranchSchema: any, FormName: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('pledgerid', pledgerid).set('BranchSchema', BranchSchema).set('FormName', FormName);
    return this._CommonService.getAPI('/AccountingTransactions/GetSubLedgerDataLcExpenses', params, 'YES');
  }

  SaveAgentAdvance(data: any) {
    return this._CommonService.postAPI('/ChitTransactions/SaveAgentAdvance', data)

  }
  getMVONames(): any {

    try {
      const params = new HttpParams().set('BranchSchema', this._CommonService.getschemaname());
      return this._CommonService.getAPI('/Verification/Getmvonames', params, 'YES');
    }
    catch (errormssg: any) {
      this._CommonService.showErrorMessage(errormssg);
    }
  }
  //added for gst voucher 01-04-2024 start.
  saveGstVoucher1(localschema: any, data: any) {
    debugger;
    return this._CommonService.postAPI('/ChitTransactions/savegstvocuher?localschema=' + localschema, data)
  }
  saveGstBill(localschema: any, data: any) {
    debugger;
    return this._CommonService.postAPI('/ChitTransactions/savegstbill?localschema=' + localschema, data)
  }
  GetPartywiseStates(Contactid: any, BranchSchema: any): Observable<any> {
    const params = new HttpParams().set('partyid', Contactid).set('BranchSchema', BranchSchema);
    return this._CommonService.getAPI('/AccountingTransactions/GetPartywiseStates', params, 'YES')
  }
  GetSubLedgerData1(pledgerid: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('pledgerid', pledgerid).set('BranchSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/accountingtransactions/GetSubLedgerData', params, 'YES');
  }
  // GetSubLedgerData(pledgerid: any): Observable<any> {
  //   debugger;
  //   const params = new HttpParams().set('pledgerid', pledgerid).set('BranchSchema', this._CommonService.getschemaname());
  //   return this._CommonService.getAPI('/accountingtransactions/GetSubLedgerData', params, 'YES');
  // }
  GetSubLedgerData(pledgerid: any, BranchSchema: any, CompanyCode: any, LocalSchema: any, BranchCode: any, GlobalSchema: any): Observable<any> {
    debugger;
    const params = new HttpParams().set('pledgerid', pledgerid).set('BranchSchema', BranchSchema).set('CompanyCode', CompanyCode).set('LocalSchema', LocalSchema).set('BranchCode', BranchCode).set('GlobalSchema', GlobalSchema);
    return this._CommonService.getAPI('/Accounts/GetSubLedgerData', params, 'YES');
  }
  //end.
  GetChitReceiptUPIDetails(upireferencenumber: any): any {//added by uday on 09-09-2024 for chit receipt upi details
    debugger
    try {
      const params = new HttpParams().set('upireferencenumber', upireferencenumber);
      return this._CommonService.getAPI('/ChitTransactions/GetChitReceiptUPIDetails', params, 'YES');
    }
    catch (errormssg: any) {
      this._CommonService.showErrorMessage(errormssg);
    }
  }
  GetInterBranchPaymentVoucherBulkData(BranchSchema: any, Month: any, ParentAccountName: any, statecode: any): any {
    try {
      const params = new HttpParams().set('BranchSchema', BranchSchema).set('Month', Month).set('ParentAccountName', ParentAccountName).set('statecode', statecode);
      return this._CommonService.getAPI('/AccountingTransactions/GetInterBranchPaymentVoucherBulkData', params, 'YES');
    } catch (errormssg: any) {
      this._CommonService.showErrorMessage(errormssg);
    }
  }
  SaveAutoBrsdataupload(data: any): any {
    try {
      return this._CommonService.postAPI('/ChequesOnHand/SaveAutoBrsdataupload', data);
    } catch (errormssg: any) {
      this._CommonService.showErrorMessage('errormssg');
    }
  }
  SaveAutoBrsdatauploadIssued(data: any): any {
    try {
      return this._CommonService.postAPI('/ChequesOnHand/SaveAutoBrsdatauploadIssued', data);
    } catch (errormssg: any) {
      this._CommonService.showErrorMessage(errormssg);
    }
  }

  SaveBulkJvUpload(data: any) {
    return this._CommonService.postAPI('Transactions/HRMSTransactions/SaveJVDetails', data)
  }





  //genreal recipt cancel service




  // savepettycashcancel(payload: { global_schema: string; branch_schema: string; company_code: string; branch_code: string; schemaid: string; receiptid: number | null | undefined; receiptnumber: any; receiptamount: string; totalreceivedamount: string; ppaymentdate: string; ppaymentdate_old: string; receiptdate: string; cancellationreason: string; activitytype: string; ptypeofoperation: string; contactid: any; contactname: string; narration: any; modeofreceipt: string; ledgeramount: string; isgstapplicable: any; tdsamount: any; pistdsapplicable: any; pTdsPercentage: any; tbltransgenreceiptcancelid: any; tbltransgeneralreceiptid: any; paymentid: any; branchid: any; pbranchid: any; parentaccountname: any; employee: string; autorizedcontactid: string; pCreatedby: any; userid: any; ipaddress: string; logentrydatetime: string; ppaymentslist: any[]; }) {
  //   throw new Error('Method not implemented.');
  // }
  cancelReceipt(GeneralReceiptCancelData: any): Observable<any[]> {
    throw new Error('Method not implemented.');
  }

 


  // getReceiptNumber(): Observable<any[]> {
  //   debugger;
  //   const params = new HttpParams().set('GlobalSchema', 'global').set('BranchSchema', 'accounts')
  //     .set('CompanyCode', 'KAPILCHITS').set('BranchCode', 'KLC01');
  //   return this._CommonService.getAPI('/Accounts/GetReceiptNumber', params, 'YES');
  // }
  getgeneralReceiptNumber(): Observable<any[]> {
    debugger;
    const params = new HttpParams().set('GlobalSchema', 'global').set('BranchSchema', 'accounts')
      .set('CompanyCode', this._CommonService.getCompanyCode()).set('BranchCode', this._CommonService.getBranchCode());
    return this._CommonService.getAPI('/Accounts/GetgeneralReceiptNumber', params, 'YES');
  }


  //  getreceiptdata(receiptId: any): Observable<any> {
  //   debugger;
  //   console.log('ReceiptId sent to API:', receiptId);
  //   const params = new HttpParams().set('GlobalSchema', 'global').set('BranchSchema', 'KLC01')
  //     .set('TaxSchema', 'taxes').set('CompanyCode', 'KAPILCHITS').set('BranchCode', 'accounts');
  //   return this._commonService.getAPI('/Accounts/GetGeneralReceiptsData', params,'YES');
  // }
  getreceiptdata(GlobalSchema: any, BranchSchema: any, TaxSchema: any, CompanyCode: any,
    BranchCode: any): Observable<any> {
    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('BranchSchema', BranchSchema).set('TaxSchema', TaxSchema)
      .set('CompanyCode', CompanyCode).set('BranchCode', BranchCode); return this._CommonService.getAPI('/Accounts/GetGeneralReceiptsData', params, 'YES');
  }

  // getEmployeeName(searchtype: string,GlobalSchema: any, BranchSchema: any,  CompanyCode: any,
  //   BranchCode: any): Observable<any[]> {

  //   debugger;

  //   const params = {
  //     LocalSchema: this._commonService.getbranchname(),
  //     searchtype: this.searchtype || 'BHEEM',
  //     companyCode: this._commonService.getCompanyCode(),
  //     branchCode: this._commonService.getBranchCode(),
  //     GlobalSchema: this._commonService.getschemaname()
  //   };
  //   return this._commonService.getAPI(
  //     '/Accounts/GetSubInterducedDetails',
  //     params,
  //     'YES'
  //   );


  // }
  getEmployeeName(
    LocalSchema: string,
    searchtype: string,
    companyCode: string,
    branchCode: string,
    GlobalSchema: string
  ): Observable<any[]> {
    const params = new HttpParams()
      .set('LocalSchema', LocalSchema || '')
      .set('searchtype', searchtype || 'BHEEM')
      .set('companyCode', companyCode || '')
      .set('branchCode', branchCode || '')
      .set('GlobalSchema', GlobalSchema || '');

    return this._CommonService.getAPI(
      '/Accounts/GetSubInterducedDetails',
      params,
      'YES'
    );
  }


  saveReceiptCancel(payload: any): Observable<any> {

    debugger;

    return this._CommonService.postAPI(
      '/GeneralReceiptCancel/saveGeneralReceiptCancel',
      payload
    );
  }


  savepettycashcancel(payload: PettyCashCancelPayload): Observable<any> {
    return this._CommonService.postAPI(
      '/Accounts/CancelPettyCashReceipt',
      payload
    );
  }
// GeneralreceiptCancelPayload
  SaveGeneralReceiptCancel(payload: any): Observable<any> {
    return this._CommonService.postAPI(
      '/Accounts/SaveGeneralReceiptCancel',
      payload
    );
  }


  // savepettycashcancel(payload: any): Observable<any> {

  //   debugger;

  //   return this._commonService.postAPI(
  //     '/GeneralReceiptCancel/savepettycashReceiptCancel',
  //     payload
  //   );
  // }
  





//notice seives p


  GetChequeReturnInvoice(
    GlobalSchema: any, BranchSchema: any, CompanyCode: any,
    BranchCode: any, commonReceiptNumber: any

  ): any {
    try {
      debugger
      const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('BranchSchema', BranchSchema)
        .set('CompanyCode', CompanyCode).set('BranchCode', BranchCode).set('commonReceiptNumber', commonReceiptNumber)

      return this._CommonService.getAPI('/Accounts/GetChequeReturnInvoice', params, 'YES');
    }
    catch (errormssg) {
      this._CommonService.showErrorMessage(errormssg);
    }
  }





    
  GetChequeReturnVoucher(
  GlobalSchema: any, BranchSchema: any, CompanyCode: any,
  BranchCode: any, CommonReceiptNumber: any
): any {
  try {
    const params = new HttpParams()
      .set('GlobalSchema', GlobalSchema)
      .set('BranchSchema', BranchSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode)
      .set('CommonReceiptNumber', CommonReceiptNumber);

    return this._CommonService.getAPI('/Accounts/GetChequeReturnVoucher', params, 'YES');
  }
  catch (errormssg) {
    this._CommonService.showErrorMessage(errormssg);
  }
}





//subscriber jv service



    GetdebitchitCheckbalance(BranchSchema:any,accountheadId:any, subcategory:any,subcategoryId:any,GlobalSchema:any,companyCode:any,branchCode:any) {
        const params = new HttpParams().set('BranchSchema', BranchSchema)
            .set('accountheadId', accountheadId)
            .set('subcategory', subcategory)
            .set('subcategoryId', subcategoryId).set('GlobalSchema',GlobalSchema).set('companyCode',companyCode).set('branchCode',branchCode);
        return this._CommonService.getAPI('/Accounts/SubscriberJVCheckbalance', params, 'YES');
    }
    


    //hrms employee details service
     GetTDSJVCalendarYearMonth(CalendarId: any, GlobalSchema: any): Observable<any> {

    const params = new HttpParams().set('CalendarId', CalendarId).set('GlobalSchema', GlobalSchema);

    return this._CommonService.getAPI('/Accounts/GetTDSJVCalendarYearMonth', params, 'YES');

  }

   GetCalendarYear(GlobalSchema: any): Observable<any> {

    const params = new HttpParams().set('GlobalSchema', GlobalSchema);

    return this._CommonService.getAPI('/Accounts/GetCalendarYear', params, 'YES');

  }






  //Contact master Service


  getCountryDetails(): Observable<any> {
  
      return this._CommonService.getAPI('/Common/getCountry', '', 'NO') .pipe(
          catchError((e:any) => {
            this._CommonService.showErrorMessage(e);
            return throwError(() => e);
          })
        )
  }
  getcountrys(GlobalSchema:any): Observable<any> {
      debugger;
    const params = new HttpParams().set('GlobalSchema', GlobalSchema);
    return this._CommonService.getAPI('/Accounts/getCountry', params, 'YES');
  }

getstates(GlobalSchema:any,id:any): Observable<any> {
      debugger;
    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('id', id);
    return this._CommonService.getAPI('/Accounts/getstate', params, 'YES');
  }

getDistrict(GlobalSchema:any,id:any): Observable<any> {
      debugger;
    const params = new HttpParams().set('GlobalSchema', GlobalSchema).set('id', id);
    return this._CommonService.getAPI('/Accounts/getDistrict', params, 'YES');
  }
}


