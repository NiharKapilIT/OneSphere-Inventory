import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, Observable, of, throwError } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CommonService } from '../Common/common.service';

const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';

@Injectable({
  providedIn: "root",
})

export class AccountsReports {

  Easy_chit_Img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALAAAABOCAYAAACAL5w3AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAD71JREFUeNrsXUtuI7sVpd09f/IsSAJ0eQVdRoIggwAqT9/E0gosrcDSCmytwNYKJK9A8uRNXQYyCIIEllfQ1cALMuzq2ZsEL7x651pXbLL+JcttXkCwJfFTJA8Pz+VPB2pP7e//+jHQf+il/vbnn2LlzZvFDvYIsD3950y/IgauxQjID/q11KBe+ebzdvDCoO3oPyP9utAv+j/VLwJmol+fEewDAB0iDBuFm2ogz30zegC/FONe4+0UrJrkxCEQn+tXT7A0AXnsZYYH8C7BO4NUmFRlUJ3GQP+5FEC+QXqpb1YP4DYlwz0kwrAJsOk0rwBkZuN+HpN78wCuCrZHApkG2LDhdInNF0JHn3onzwO4afCS3g00sPotpR+C3T2I35Ad7gi8ARyvYVt5AKynAO9aqkCyePMArm2Xu3CwAOIJ3rLe9uYlRG3H7VGD6zgnTIiZCbIuHLKvcPjiMo6ZTu9epHWj4459U3+f9n4HeRCQpjlhAvxN8H+qtud6CZT03S0AmcfkJFUewcIjHfcB/5/jeahz3BVMy9sbZ+ArVXHpF9p5AOAF4qtJHvh0XFrh44USCndCLI4Zi2swPn0+9qt5HsCZw7kGyGkD6QzU9sIFga+ftQJnSIlYPgcWUwZ4O296as/b9+PEPTTkoBFLnqjfVtyUmGkYZUST2jeSYQFYBu0A03zePIBbnWVI4ZD1wcBk12DTvFmJ9WwIZInsFCwfRtif4c0DeMt+aAHIS7WZ82UGvXKEvYLTxqw9M74fiu9nfu7YA9i0ry2x8coA8SV0smtWwioljO87wvHz5gG8tgTLvG2CWAkGDStICfn9ADMV3jyAf/P+xUxAWyCWDLuwyYACUoK+T1hXe2h4ADMwCBQfW85DOmOBCc4KUiLMkCPe3uAsxO0OADEWDNqzzSiArccZUiIWHeHSO3QewBIY3ZbzSA2GnTmkxA1kjVVKAOApmHzkIeIBzDZ1TXU13FFuMsDJJueRI/lcRke4bMsB9fbKAIzhO93BYsGkgJRIjdmLLaBinpmlxMzDxANYDt/dNlmthJTIm70YY9YidK30eXtjAAZwCBjnLYNYOmNOKYHZi4mYvVhYWJpAPPAg3k97yXshSHcmbW1lBJt+UpvLUPqQBrawcmfa1gZ4pEPAjtApxn4PsQcwg2MA5mtlYzn0L7Pq857gAiAemh1LbOckQPNFLP7Q6FsGMIBBAKarpe7auF0H2yR5OizO2ptshB3aRgcsM0fio5WL2b2Vt7/+6S/36tuVW2ozPt94DDL6shcANoARqgJXTFWQEvdI+xuJ4BgVrsG0Yzie3nYHYB6VabQjQnuAdPsknOuER9aDfSsAAa5pOWHcGeFkV2NU4OuvlqqhW4S8lQLyr+Rg/+Pf/7wS71OAOuGRcu82tLcBFMvWy1nW0jaNAJAaHOeR5AWNEn55+UUtBqmQb7PaSwC32DFKgRhxSDMPcSXALT72K3MvZ3y6PACY3w6ABYhP1PYJjEURVqW4AHTscdSsvftxFOpXVCDoShDQ+qzl+xwhXccSrV/mewhi0k8nYlqMhiOSBlPV4j0RuoECZb+o21l///vpZm7Ed40YsQ4bZ+RbOB6A5ALTUodfibCjgmXJsh/wfKZjPVGbTVf8PkG4DsA8cV1swl5gHZvsORsTOOaYK+7yC5egNMa0upF7qMuwgfo7c6RD92YcZ6R17iCkM4xIpl04gNmFDKNy8WxNk/r22dh5s7yXpHjlAvCyAQC/iqEWc7itzOPqRp5lsF+p+tPMl+j0Vg4AJ65EEC92PEdqCR/r8Ikjn5UB5qYspeesEtGlges6KqnuMW9aK2oQXNUAr3JIgjDDucmysvGKhI8arK7KBOJiYNcRoNTohS6bvnHw1pFgqUUPUpqdDGDFGc9SKl6OMxUbej6xsL9L47uwk9aRmy4AuwoxNbWJN6td5rDN1OV0ZVhUkq2rxnOFX+nwqQhDDl3f0gEeHR2Gytw4dt5bZiAq9fQiptP+VGJ2I0Vjj3WnSR3pdcRMQtF0lxghFhamoHyOXfkhzy8OhjnR8VY5Xr+10QtaN2NqqUq8uGo+mB2ZNzVK1LHDMj22jq4F2IISUToAwn1GevTdqGS6DyjH2JFnnrabOzobD6VZurfOPcVVgRGVBH5UUWdn+k4VRpzKAK7a0ysXLi+eBqutUhcV04xzHIduTie0AXQiWPvcBfyqnnZVYOUw4oMlfFh0VqShzrJTBq7bgxpbINBACit6wTEN8xhNXE5FVrrXFvmw0mndCAC4RoPbGk5hVBFYZeO5wicFO1+3JeyUcuJcvbAH4GTZHTemRX4QWA4cgGSvdlZQDlxkDO8uoNDKYGKp2NDC+B1TB2MUsLGvPFd3ngGAOo2YBcTFO/cNs0EBh6xJANaRH/UB7BiqZWXkgeuuykMAWInOP3HksSpQUQTQspdUPyj73Q+RRWLYVp1umNFbHr26FcFdlrUrA7DGKNGohIhqplfHyXPJgpVkQ8HWTUiUQp64znNkYeqt+UvMPoRNduwG26Wo/u3U0LBRSbZvRULUWR5MDTYymZ3X46OaIAsynL1PYE6aachd3aGOoePYlmcjw3Gzzeua03utMFCOY1XVymj/VG7gybCPu3bgbACOalTI1AHeOvsByuqnAJJgpPPlmQZiv2XG3O5djg62OW6xZaddtyUGijKc4lUFyedyyD6+Nv27BeAc/TussjVSp3ldE7y2CkxKxO3hda2fZewoQ+xg2EjHSR3PPy7h/NZlIFfHoEWRYQZzLxwAbkP/ZsmPuE0AHxaZQqkI3kC5L8fjs03ypfL0r3D4yh60XF9uYuukGYszXQewbxxSyQXgp5b070NT8cTehqoAjDJmX5I2Afy+wSHENNd+gLk5WwAH7rEoe+n4Yx3nAbq6VxIMsaOMZiPYOl+iLBtPcnRqZQauymwV4tXVvzuf/7UBuDENk7Fi5ZrqKp03nLSlkD9nSKeK0/NQUP+79mV02gBwDrCSBhmx7upr1NLoUwzAYMAmNYyrQNM2ejBkQCyky6ykQ1pkA3+cMbPhzKumA1d1VCwLyDr6N3gp/Ss1cJb+raJhylZg2FTeiOPqKIkjjjws6HRk1e5tF/q305L+LSo/GgFwrSGEGNxwkMKiAMpYmIgtYe8hT/LsvEKDZH03qdiRVcHTtmsm06/7uo5VBUbMGj2KAPjF9K/UwM5elDO91kEBBqrYVsGFTu/W6BiF2ALPQS8C8Z2jggJo4Z5jRiPJ0cE9R6fLm/XISpf2KlDdLG1yAgwYQcKkDTBb2Xivbv/DFoDBgK4eO1DF53GLFDgs4WS59j9wGmWP7EwrgnCctcG9wEjF9xPP3v2Y+5Mb4wYcq7KArKt/gxac11ISImognapaOXVoT9uydJ2f6kpU/sFB2w63ZZElaTBb0kA9xi+gf+sswNSVH40AuNtwxZMV3bwydrB/2X26eTbMOSY0sqSfqnInKOo6ec9DfFXHqgIjRjVH1KbXDioBOGggnVvDqyfNOM+JM89grcDirFW5AYbSP806CpWxWWdaZlQB4/RV9Y378wJOsGukkD5AmXhZ+RSRjq74Ra+KasSJG6p6+xWWtqVVWrDQ4Ji6HCNentZhho6K7xhgOC3BwgnyKMIEM0vnSKqcvtYgXi+uGNczfczpfFTGBx33RnYGnYarXtKsTlQy3g0+75TJxxh1Bhnlat327n7gXRpmNmyHRk/f+sUsr8UO33j5Z44RxYPXA3jv2ffKMtSWddy8eQC/mF04tHniYfF67N1bLfgff/+H3+k/v6jN/V70+kV/fvDzf//jfz7re3J0Cu4/aPMZQqwYeqtXj0GBqxFelZlHivhiY3m/A3np8lp+nvjv6jB9VEgqh16xpVHa2HXos4DR8ZihEvPGOo8Fhvyx8VxnNfPaC9JQ357G7qF9nssGYlkgbBHtTvPdn1XOKpvIS1q/wJL6ywAYFbaAA7M+yIjzYHyLjVngudoszX4DLrW5Sl9eZJdUbExelTKfgeeXxyLc+pc0Xzl4qaz3ugzmFCdfO9ATdcEriEU3zlAadwXDkT2fPtlH8EoGpsOXU7G4wB45VWYibpXsY28AgfYWhzb5kj1Z4cwgsezV+nWpPzvhDqP/P9L/PyIvjnMimIU+i8HwqcFQCTc42H+Ezzr4fKA2J4rXvzeG543E7APdKJng8xGeg5adlyI+18Ut0rgS7MRht8qAZx4Z5eEDrvSM/GtJX9TmOBONeLSi+YjnJxDLXxXtIuwH0WHPWb8bdbbOwyhbDGAmGDW5LmIjH87rwWg/V/qyPsYo/yN1QHFU7Lgt5/hQ9Lil6G08Fxqiok9QwRcCoAkYNrWwBa0+Bdi/e4+ChIKFQ8EiIRruSG0u8rsW6a4s7MtprRAnwLPFImwAoPTVZqk4BKiOEH+AuF+RP3XgCyGBKO4x0ooxtPLvUQyNdKdcBgzTsjw8Mhygni9E3Y6RzwgjB7He0gIqZs9QkM6tGJ1CSL8DpDtAJ+zhWaZiNJ2JsB2Uy8zrXLRfYEtfyJIT1HVHyBtuk0mbMzuHvN/XMex+xEM//7QRO1MAeODQUwEqd6I2vy5DafEZKWKRFTsU8tQz0u2p7e2PZh4fkOaT2mytnCLfJ7DFR/T+haWzsMVg6DOw4Qhhe2CmWJQ9QbgAYRdofC7DktnfuB+O0+vh1yb5l324M63Es3DZniwyqgPwc4ftcRykEaDz/SoI4gwjB5dhJcB4LcJ2LHlx2zEAbekrENsndKhYlJnlTqs/1XvID8LAxKzDF4v2ZNYLDJZzHTFnADAIOoKBI7BUaElfqe21eQ5rpv8ZFUaMGGHvAqfHG2+PUIGJ2Pds5nctmGVl5sXsJFjkBmGP9N/jjDKEhvTpi3hDdDBbvMAx4vAzxJBsYyPsDKPCkehwHUMWSCY8Es8zt+Q15/ZzpY+64bpLhF+SCFnaqnY+RAbUyI/4pfCF2mzitjVOZFTE1q2VgpFiIy+Kcwm9yOnKBpDp0vPMjLDfdBCRxkQ0fiIYYIGh7om/w3VSkQDECsPlo3geZrp7NByXZYqhmT7/hHTMTm77f4LycDwmhycBrs/GbIGtvEo41nNRXv78GuBmVp6CNfki8CeUeY725hHKzCsV8oGPcdnSXzvxSL8nnvFJtGP7ThzuWbhlhkIjd1ioCwaJcYMkD/fk1MQGoNlJ2TLsTosMFpcb2ud48fPccVhLZ+iL5zzFc/HzrjBUJsIBk/G4sU8seXXE853wsMnlo7R12GMx/KeYrZFlYHs+9k9gQz09l0W/nwiAj0Ud9tW32xSXRieais85z1PRaZ5ljWwvUY6hIJqVJa+V0Xbrenak/0xEgm0/7IJ9lXrju9EyprKuwSjcAKf7Oo20h3X3uMs6+78AAwAvTSAQoIpf6wAAAABJRU5ErkJggg==";

  httpHeaders = new HttpHeaders({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  });

  constructor(
    private http: HttpClient,
    private _CommonService: CommonService
  ) { }
  currencyformat: any;
  // GetLedgerAccountList(formname: string): Observable<any> {
  //   const params = new HttpParams()
  //     .set('formname', formname)
  //     .set('BranchSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI(
  //     '/AccountingTransactions/GetLedgerAccountList',
  //     params,
  //     'YES'
  //   );
  // }
  GetLedgerAccountList(formname: string, BranchSchema: string, CompanyCode: string, BranchCode: string, GlobalSchema: string): Observable<any> {
    const params = new HttpParams()
      .set('formname', formname)
      .set('BranchSchema', BranchSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode)
      .set('GlobalSchema', GlobalSchema);

    return this._CommonService.getAPI(
      '/Accounts/GetLedgerAccountList',
      params,
      'YES'
    );
  }
    Getgstvocuherprint(Branchschema: any, Gstvoucherno: any): Observable<any> {
    const params = new HttpParams().set('branchSchema', Branchschema).set('Gstvoucherno', Gstvoucherno).set('globalSchema', this._CommonService.getschemaname()).set('companyCode', this._CommonService.getCompanyCode()).set('branchCode', this._CommonService.getBranchCode());
    return this._CommonService.getAPI('/Accounts/Getgstvocuherprint', params, 'YES')
  }
  //   GetGstLedgerAccountList(formname: string): Observable<any> {
  //   const params = new HttpParams()
  //     .set('formname', formname)
  //     .set('BranchSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI(
  //     '/AccountingTransactions/GetGstLedgerAccountList',
  //     params,
  //     'YES'
  //   );
  // }
  GetGstLedgerAccountList(formname: string, BranchSchema: string, CompanyCode: string, BranchCode: string): Observable<any> {
    const params = new HttpParams()
      .set('formname', formname)
      .set('BranchSchema', BranchSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode);

    return this._CommonService.getAPI(
      '/Accounts/GetGstLedgerAccountList',
      params,
      'YES'
    );
  }


   GetChequesIssuedData(bankid: any, startindex: any, endindex: any, modeofreceipt: any, _searchText: any, GlobalSchema: any,branchcode:any,companycode:any): Observable<any> {
    const params = new HttpParams().set('_BankId', bankid).set('BranchSchema', this._CommonService.getbranchname()).set('startindex', startindex).set('endindex', endindex).set('modeofreceipt', modeofreceipt).set('searchtext', _searchText).set('GlobalSchema', GlobalSchema).set('branchcode', branchcode).set('companycode', companycode);
    return this._CommonService.getAPI('/Accounts/GetChequesIssued', params, 'YES')
  }
   GetChequeEnquiryData(bankid: any, startindex: any, endindex: any, modeofreceipt: any, searchtext: any): Observable<any> {
    const params = new HttpParams().set('depositedBankid', bankid).set('BranchSchema', this._CommonService.getbranchname()).set('startindex', startindex).set('endindex', endindex).set('modeofreceipt', modeofreceipt).set('searchtext', searchtext).set('BrsFromDate', '01-01-1991').set('BrsTodate', '11-03-2026').set('GlobalSchema', this._CommonService.getschemaname()).set('CompanyCode', this._CommonService.getCompanyCode()).set('BranchCode', this._CommonService.getBranchCode());
    return this._CommonService.getAPI('/Accounts/GetChequeEnquiryData', params, 'YES')
  }
   GetBankBalance(bankid: any) {
    const params = new HttpParams().set('brstodate', String(new Date())).set('_recordid', bankid).set('BranchSchema', this._CommonService.getbranchname()).set('branchCode', this._CommonService.getBranchCode()).set('companyCode', this._CommonService.getCompanyCode());
    return this._CommonService.getAPI('/Accounts/GetBankBalance', params, 'YES');
  }

  GetLedgerAccountListforInterbranch(formname: string, BranchSchema: string): Observable<any> {
    const params = new HttpParams()
      .set('formname', formname)
      .set('BranchSchema', BranchSchema);

    return this._CommonService.getAPI(
      '/AccountingTransactions/GetLedgerAccountList',
      params,
      'YES'
    );
  }

  // GetLedgerReport(fromDate: string, toDate: string, pAccountId: string | number, pSubAccountId: string | number): Observable<any> {
  //   const params = new HttpParams()
  //     .set('fromDate', fromDate)
  //     .set('toDate', toDate)
  //     .set('pAccountId', pAccountId.toString())
  //     .set('pSubAccountId', pSubAccountId.toString())
  //     .set('BranchSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI(
  //     '/Accounting/AccountingReports/GetAccountLedgerDetails',
  //     params,
  //     'YES'
  //   );
  // }
  GetLedgerReport(fromDate: string, toDate: string, pAccountId: string | number, pSubAccountId: string | number, BranchSchema: any, GlobalSchema: any, BranchCode: any, CompanyCode: any): Observable<any> {
    const params = new HttpParams()
      .set('fromDate', fromDate)
      .set('toDate', toDate)
      .set('pAccountId', pAccountId.toString())
      .set('pSubAccountId', pSubAccountId.toString())
      .set('BranchSchema', BranchSchema)
      .set('GlobalSchema', GlobalSchema)
      .set('BranchCode', BranchCode)
      .set('CompanyCode', CompanyCode);

    return this._CommonService.getAPI(
      '/Accounts/GetAccountLedgerDetails',
      params,
      'YES'
    );
  }

  // GetCashBookReportbyDates(startDate: string, endDate: string, transType: string): Observable<any> {
  //   const params = new HttpParams()
  //     .set('fromdate', startDate)
  //     .set('todate', endDate)
  //     .set('transType', transType)
  //     .set('BranchSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI(
  //     '/Accounting/AccountingReports/getCashbookData',
  //     params,
  //     'YES'
  //   );
  // }
  GetCashBookReportbyDates(fromdate: string, todate: string, transType: string, BranchSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    debugger;
    const params = new HttpParams()
      .set('fromdate', fromdate)
      .set('todate', todate)
      .set('transType', transType)
      .set('BranchSchema', BranchSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode);

    return this._CommonService.getAPI(
      '/Accounts/getCashbookData',
      params,
      'YES'
    );
  }

  // GetDayBook(fromdate: string, todate: string, Ason: string): Observable<any> {
  //   const params = new HttpParams()
  //     .set('fromdate', fromdate)
  //     .set('todate', todate)
  //     .set('Ason', Ason)
  //     .set('BranchSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI(
  //     '/Accounting/AccountingReports/getDaybook',
  //     params,
  //     'YES'
  //   );
  // }
  GetDayBook(fromdate: string, todate: string, Ason: string, BranchSchema: any, branchCode: any, companyCode: any, GlobalSchema: any): Observable<any> {
    const params = new HttpParams()
      .set('fromdate', fromdate)
      .set('todate', todate)
      .set('Ason', Ason)
      .set('BranchSchema', BranchSchema).set('branchCode', branchCode).set('companyCode', companyCode).set('GlobalSchema', GlobalSchema);

    return this._CommonService.getAPI(
      '/Accounts/getDaybook',
      params,
      'YES'
    );
  }
  // GetLedgerSummary(fromDate: string, todate: string, AccountId: string | number, AsOnDate: string, groupcode: string): Observable<any> {
  //   const params = new HttpParams()
  //     .set('fromDate', fromDate)
  //     .set('todate', todate)
  //     .set('pAccountId', AccountId.toString())
  //     .set('AsOnDate', AsOnDate)
  //     .set('BranchSchema', this._CommonService.getschemaname())
  //     .set('Groupcode', groupcode);

  //   return this._CommonService.getAPI('/Accounting/AccountingReports/GetLedgerSummary', params, 'YES');
  // }
  GetLedgerSummary(fromDate: string, todate: string, AccountId: string | number, AsOnDate: string, groupcode: string, companyCode: any, branchCode: any, GlobalSchema: any): Observable<any> {
    const params = new HttpParams()
      .set('fromDate', fromDate)
      .set('todate', todate)
      .set('pAccountId', AccountId.toString())
      .set('AsOnDate', AsOnDate)
      .set('BranchSchema', this._CommonService.getbranchname())
      .set('Groupcode', groupcode)
      .set('companyCode', companyCode)
      .set('branchCode', branchCode)
      .set('GlobalSchema', GlobalSchema);

    return this._CommonService.getAPI('/Accounts/GetLedgerSummary', params, 'YES');
  }

  getPartyDetails(loanTypeId: string | number): Observable<any> {
    const params = new HttpParams()
      .set('Type', loanTypeId.toString())
      .set('BranchSchema', this._CommonService.getschemaname());

    return this._CommonService.getAPI('/ContactConfiguration/getPartyDetails', params, 'YES');
  }

  GetPartyLedgerReport(fromDate: string, toDate: string, pAccountId: string | number, pSubAccountId: string | number, pPartyRefId: string | number): Observable<any> {
    const params = new HttpParams()
      .set('fromDate', fromDate)
      .set('toDate', toDate)
      .set('pAccountId', pAccountId.toString())
      .set('pSubAccountId', pSubAccountId.toString())
      .set('pPartyRefId', pPartyRefId.toString())
      .set('BranchSchema', this._CommonService.getschemaname());

    return this._CommonService.getAPI('/Accounting/AccountingReports/GetPartyLedgerDetails', params, 'YES');
  }

  // GetLedgerSummaryAccountList(formname: string): Observable<any> {
  //   const params = new HttpParams()
  //     .set('formname', formname)
  //     .set('BranchSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI('/Accounting/AccountingReports/GetLedgerSummaryAccountList', params, 'YES');
  // }
  GetLedgerSummaryAccountList(formname: string, BranchSchema: string, CompanyCode: string, BranchCode: string, GlobalSchema: string): Observable<any> {
    const params = new HttpParams()
      .set('formname', formname)
      .set('BranchSchema', BranchSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode)
      .set('GlobalSchema', GlobalSchema);

    return this._CommonService.getAPI('/Accounts/GetLedgerSummaryAccountList', params, 'YES');
  }

  // GetGeneralReceiptbyId(ReceiptId: string | number, branchSchema: string): Observable<any> {
  //   const params = new HttpParams()
  //     .set('ReceiptId', ReceiptId.toString())
  //     .set('BranchSchema', branchSchema);

  //   return this._CommonService.getAPI('/AccountingTransactions/GetgeneralreceiptReportData', params, 'YES');
  // }
  GetGeneralReceiptbyId(ReceiptId: string | number, BranchSchema: string, CompanyCode: any, BranchCode: any, GlobalSchema: any): Observable<any> {
    const params = new HttpParams()
      .set('ReceiptId', ReceiptId.toString())
      .set('BranchSchema', BranchSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode)
      .set('GlobalSchema', GlobalSchema);

    return this._CommonService.getAPI('/Accounts/GetGeneralReceiptReportData', params, 'YES');
  }

  GetInterBranchGeneralReceiptbyId(ReceiptId: string | number): Observable<any> {
    const params = new HttpParams()
      .set('ReceiptId', ReceiptId.toString())
      .set('BranchSchema', this._CommonService.getschemaname());

    return this._CommonService.getAPI('/AccountingTransactions/GetgeneralreceiptInterBranchReportData', params, 'YES');
  }

  GetCaobranchlist(BranchSchema: string): Observable<any> {
    const params = new HttpParams().set('BranchSchema', BranchSchema);

    return this._CommonService.getAPI('/ChitTransactions/GetCAOBranchList', params, 'YES');
  }

  GetForm15hReportwithpan(loginBranchschema: string, pan_number: string): Observable<any> {
    const params = new HttpParams()
      .set('pan_number', pan_number)
      .set('loginBranchschema', loginBranchschema);

    return this._CommonService.getAPI('/ContactMaster/GetForm15HReportUIDDetails', params, 'YES');
  }

  GetChitReceiptslist(BranchSchema: string, CAOSchema: string): Observable<any> {
    const params = new HttpParams()
      .set('BranchSchema', BranchSchema)
      .set('CAOSchema', CAOSchema);

    return this._CommonService.getAPI('/ChitTransactions/GetChitReceiptslist', params, 'YES');
  }

  // GetRePrintInterBranchGeneralReceiptbyId(ReceiptId: string | number, branchschema: string): Observable<any> {
  //   const params = new HttpParams()
  //     .set('ReceiptId', ReceiptId.toString())
  //     .set('BranchSchema', branchschema);

  //   return this._CommonService.getAPI('/AccountingTransactions/GetRePrintInterBranchGeneralReceiptCount', params, 'YES');
  // }
  GetRePrintInterBranchGeneralReceiptbyId(ReceiptId: string | number, BranchSchema: string, CompanyCode: any, BranchCode: any): Observable<any> {
    const params = new HttpParams()
      .set('ReceiptId', ReceiptId.toString())
      .set('BranchSchema', BranchSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode);

    return this._CommonService.getAPI('/Accounts/GetRePrintInterBranchGeneralReceiptCount', params, 'YES');
  }
  // GetPaymentVoucherbyId(paymentId: string | number): Observable<any> {
  //   const params = new HttpParams()
  //     .set('paymentId', paymentId.toString())
  //     .set('LocalSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI('/AccountingTransactions/GetPaymentVoucherReportData', params, 'YES');
  // }
  GetPaymentVoucherbyId(paymentId: string | number, LocalSchema: any, CompanyCode: any, BranchCode: any, GlobalSchema: any): Observable<any> {
    const params = new HttpParams()
      .set('paymentId', paymentId.toString())
      .set('LocalSchema', LocalSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode)
      .set('GlobalSchema', GlobalSchema);

    return this._CommonService.getAPI('/Accounts/GetPaymentVoucherReportData', params, 'YES');
  }

  // GetChitPaymentReportData(paymentId: string | number): Observable<any> {
  //   const params = new HttpParams()
  //     .set('paymentId', paymentId.toString())
  //     .set('LocalSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI('/AccountingTransactions/GetChitPaymentReportData', params, 'YES');
  // }
  GetChitPaymentReportData(paymentId: string | number, LocalSchema: any, CompanyCode: any, BranchCode: any, GlobalSchema: any): Observable<any> {
    const params = new HttpParams()
      .set('paymentId', paymentId.toString())
      .set('LocalSchema', LocalSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode)
      .set('GlobalSchema', GlobalSchema);;

    return this._CommonService.getAPI('/Accounts/GetChitPaymentReportData', params, 'YES');
  }

  // GetPettyCashbyId(paymentId: string | number): Observable<any> {
  //   const params = new HttpParams()
  //     .set('paymentId', paymentId.toString())
  //     .set('LocalSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI('/AccountingTransactions/GetPettyCashReportData', params, 'YES');
  // GetgeneralreceiptbyId }
  // GetgeneralreceiptbyId(paymentId: string | number, LocalSchema: any, CompanyCode: any, BranchCode: any, GlobalSchema: any): Observable<any> {
  //   const params = new HttpParams()
  //     .set('paymentId', paymentId.toString())
  //     .set('LocalSchema', LocalSchema)
  //     .set('CompanyCode', CompanyCode)
  //     .set('BranchCode', BranchCode)
  //     .set('GlobalSchema', GlobalSchema);

  //   return this._CommonService.getAPI('/Accounts/GetgeneralreceiptReportData', params, 'YES');
  // }
  GetPettyCashbyId(paymentId: string | number, LocalSchema: any, CompanyCode: any, BranchCode: any, GlobalSchema: any): Observable<any> {
    const params = new HttpParams()
      .set('paymentId', paymentId.toString())
      .set('LocalSchema', LocalSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode)
      .set('GlobalSchema', GlobalSchema);

    return this._CommonService.getAPI('/Accounts/GetPettyCashReportData', params, 'YES');
  }

  // GetJvReport(Jvnumber: string | number): Observable<any> {
  //   const params = new HttpParams()
  //     .set('Jvnumber', Jvnumber.toString())
  //     .set('BranchSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI('/accountingtransactions/GetJournalVoucherReportData', params, 'YES');
  // }
  GetJvReport(Jvnumber: string | number, BranchSchema: any, GlobalSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    const params = new HttpParams()
      .set('Jvnumber', Jvnumber.toString())
      .set('BranchSchema', BranchSchema)
      .set('GlobalSchema', GlobalSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode);

    return this._CommonService.getAPI('/Accounts/GetJournalVoucherReportData', params, 'YES');
  }

  // GetComparisionTB(fromdate: string, todate: string): Observable<any> {
  //   const params = new HttpParams()
  //     .set('fromDate', fromdate)
  //     .set('todate', todate)
  //     .set('BranchSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI('/Accounting/AccountingReports/GetComparisionTB', params, 'YES');
  // }
  GetComparisionTB(fromdate: string, todate: string, BranchSchema: any, GlobalSchema: any, company_code: any, branch_code: any): Observable<any> {
    const params = new HttpParams()
      .set('fromDate', fromdate)
      .set('todate', todate)
      .set('BranchSchema', BranchSchema)
      .set('GlobalSchema', GlobalSchema).set('company_code', company_code).set('branch_code', branch_code);

    return this._CommonService.getAPI('/Accounts/GetComparisionTB', params, 'YES');
  }

  // GetTrialBalanceData(fromdate: string, todate: string, grouptype: string): Observable<any> {
  //   const params = new HttpParams()
  //     .set('fromDate', fromdate)
  //     .set('todate', todate)
  //     .set('GroupType', grouptype)
  //     .set('LocalSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI('/Accounting/AccountingReports/GetTrialBalance', params, 'YES');
  // }
  GetTrialBalanceData(fromdate: string, todate: string, GroupType: string, LocalSchema: any, CompanyCode: any, BranchCode: any, GlobalSchema: any): Observable<any> {
    const params = new HttpParams()
      .set('fromDate', fromdate)
      .set('todate', todate)
      .set('GroupType', GroupType)
      .set('LocalSchema', LocalSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode)
      .set('GlobalSchema', GlobalSchema);

    return this._CommonService.getAPI('/Accounts/GetTrialBalance', params, 'YES');
  }

  // GetBankChequeDetails(BankId: string | number): Observable<any> {
  //   const params = new HttpParams()
  //     .set('_BankId', BankId.toString())
  //     .set('BranchSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI('/Accounting/AccountingReports/GetIssuedChequeNumbers', params, 'YES');
  // }
  GetBankChequeDetails(_BankId: string | number, BranchSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    const params = new HttpParams()
      .set('_BankId', _BankId)
      .set('BranchSchema', BranchSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode);

    return this._CommonService.getAPI('/Accounts/GetIssuedChequeNumbers', params, 'YES');
  }

  // GetIssuedBankDetails(BankId: string | number, _ChqBookId: string | number, _ChqFromNo: string | number, _ChqToNo: string | number): Observable<any> {
  //   const params = new HttpParams()
  //     .set('_BankId', BankId.toString())
  //     .set('_ChqBookId', _ChqBookId.toString())
  //     .set('_ChqFromNo', _ChqFromNo.toString())
  //     .set('_ChqToNo', _ChqToNo.toString())
  //     .set('BranchSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI('/Accounting/AccountingReports/GetIssuedChequeDetails', params, 'YES');
  // }
  GetIssuedBankDetails(_BankId: string | number, _ChqBookId: string | number, _ChqFromNo: string | number, _ChqToNo: string | number, BranchSchema: any, GlobalSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    const params = new HttpParams()
      .set('_BankId', _BankId.toString())
      .set('_ChqBookId', _ChqBookId.toString())
      .set('_ChqFromNo', _ChqFromNo.toString())
      .set('_ChqToNo', _ChqToNo.toString())
      .set('BranchSchema', BranchSchema)
      .set('GlobalSchema', GlobalSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode);

    return this._CommonService.getAPI('/Accounts/GetIssuedChequeDetails', params, 'YES');
  }

  // GetUnusedChequeDetails(_BankId: string | number, _ChqBookId: string | number, _ChqFromNo: string | number, _ChqToNo: string | number): Observable<any> {
  //   const params = new HttpParams()
  //     .set('_BankId', _BankId.toString())
  //     .set('_ChqBookId', _ChqBookId.toString())
  //     .set('_ChqFromNo', _ChqFromNo.toString())
  //     .set('_ChqToNo', _ChqToNo.toString())
  //     .set('BranchSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI('/Accounting/AccountingReports/GetUnUsedCheques', params, 'YES');
  // }
  GetUnusedChequeDetails(_BankId: string | number, _ChqBookId: string | number, _ChqFromNo: string | number, _ChqToNo: string | number, BranchSchema: any, GlobalSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    const params = new HttpParams()
      .set('_BankId', _BankId.toString())
      .set('_ChqBookId', _ChqBookId.toString())
      .set('_ChqFromNo', _ChqFromNo.toString())
      .set('_ChqToNo', _ChqToNo.toString())
      .set('BranchSchema', BranchSchema)
      .set('GlobalSchema', GlobalSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode);

    return this._CommonService.getAPI('/Accounts/GetUnUsedCheques', params, 'YES');
  }

  // GetJvListReport(fromdate: string, todate: string, pmodeoftransaction: string): Observable<any> {
  //   const params = new HttpParams()
  //     .set('fromdate', fromdate)
  //     .set('todate', todate)
  //     .set('pmodeoftransaction', pmodeoftransaction)
  //     .set('BranchSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI('/Accounting/AccountingReports/GetJvListDetails', params, 'YES');
  // }
  GetJvListReport(fromdate: any, todate: any, pmodeoftransaction: string, BranchSchema: any, CompanyCode: any, BranchCode: any, GlobalSchema: any): Observable<any> {
    const params = new HttpParams()
      .set('fromdate', fromdate)
      .set('todate', todate)
      .set('pmodeoftransaction', pmodeoftransaction)
      .set('BranchSchema', BranchSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode)
      .set('GlobalSchema', GlobalSchema);

    return this._CommonService.getAPI('/Accounts/GetJvListDetails', params, 'YES');
  }
  GetJvListReportGroup(fromdate: any, todate: any, pmodeoftransaction: string, BranchSchema: any, GlobalSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    const params = new HttpParams()
      .set('fromdate', fromdate)
      .set('todate', todate)
      .set('pmodeoftransaction', pmodeoftransaction)
      .set('BranchSchema', BranchSchema)
      .set('GlobalSchema', GlobalSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode);

    return this._CommonService.getAPI(
      '/Accounts/GetJvListDetailsGroup',
      params,
      'YES'
    );
  }
  //   _CashBookReportsPdf(
  //     reportName: string,
  //     gridData: any[],
  //     gridheaders: any[],
  //     colWidthHeight: any,
  //     pagetype: any,
  //     betweenorason: string,
  //     fromdate: string,
  //     todate: string,
  //     printorpdf: string
  //   ) {
  //     const address = this._CommonService.getcompanyaddress();
  //     const Companyreportdetails = this._CommonService._getCompanyDetails();
  //     const doc = new jsPDF(pagetype);
  //     const totalPagesExp = '{total_pages_count_string}';
  //     const today = this._CommonService.pdfProperties('Date');
  //     const currencyformat = this._CommonService.currencysymbol;
  //     const rupeeImage = this._CommonService._getRupeeSymbol();
  //     const kapil_logo = this._CommonService.getKapilGroupLogo();
  //     const companyName = Companyreportdetails?.companyName ?? '';
  // const companyAddress = Companyreportdetails?.registrationAddress ?? '';
  // const companyCIN = Companyreportdetails?.cinNumber ?? '';
  // const companyBranch = Companyreportdetails?.branchName ?? '';

  //     let pdfInMM: number;

  //     autoTable(doc, {
  //       columns: gridheaders,
  //       body: gridData,
  //       theme: 'grid',
  //       headStyles: {
  //         fillColor: this._CommonService.pdfProperties('Header Color'),
  //         halign: 'center',
  //         // this._CommonService.pdfProperties('Header Alignment'),
  //         fontSize: Number(this._CommonService.pdfProperties('Header Fontsize'))
  //       },
  //       styles: {
  //         cellPadding: 1,
  //         fontSize: Number(this._CommonService.pdfProperties('Cell Fontsize')),
  //         cellWidth: 'wrap',
  //         rowPageBreak: 'avoid',
  //         overflow: 'linebreak'
  //       } as any,
  //       columnStyles: colWidthHeight,
  //       startY: 48,
  //       showHead: 'everyPage',
  //       didDrawPage: (data: any) => {
  //         const pageSize = doc.internal.pageSize;
  //         const pageWidth = pageSize.getWidth();
  //         const pageHeight = pageSize.getHeight();

  //         doc.setFont('helvetica', 'normal');

  //         if (doc.getNumberOfPages() === 1) {
  //           doc.setFontSize(15);

  //           if (pagetype === 'a4') {
  //             doc.addImage(kapil_logo, 'JPEG', 10, 15, 20, 20);
  //             // doc.text(Companyreportdetails?.pCompanyName ?? '', 60, 20);
  //             // doc.setFontSize(10);
  //             // doc.text(address, 40, 27);

  //             // if (Companyreportdetails?.pCinNo ?? '') {
  //             //   doc.text('CIN : ' + Companyreportdetails.pCinNo, 85, 32);
  //             // }
  //             doc.setFontSize(15);
  //             doc.setFont('helvetica', 'bold');
  //             doc.text(companyName, 105, 15, { align: 'center' });
  //             doc.setFontSize(9);
  //             doc.setFont('helvetica', 'normal');
  //             doc.text(
  //               companyAddress,
  //               105,
  //               21,
  //               { align: 'center' }
  //             );
  //             doc.text(`CIN : ${companyCIN}`, 105, 26, { align: 'center' });

  //             doc.setFontSize(14);
  //             doc.text(reportName, 90, 42);
  //             doc.setFontSize(10);
  //             doc.text('Branch : ' + companyBranch, 163, 47);

  //             if (betweenorason === 'Between') {
  //               doc.text(`Between : ${fromdate} And ${todate}`, 15, 47);
  //             } else if (betweenorason === 'As On' && fromdate) {
  //               doc.text(`As on : ${fromdate}`, 15, 47);
  //             }

  //             pdfInMM = 233;
  //             doc.line(10, 50, pdfInMM - 30, 50);
  //           }
  //         }

  //         let page = 'Page ' + doc.getNumberOfPages();
  //         if (typeof doc.putTotalPages === 'function') {
  //           page += ' of ' + totalPagesExp;
  //         }

  //         doc.line(5, pageHeight - 10, pageWidth - 5, pageHeight - 10);
  //         doc.setFontSize(10);
  //         //doc.text('Printed on : ' + today, 15, pageHeight - 5);
  //         doc.text(page, pageWidth - 30, pageHeight - 5);
  //       },
  //       didDrawCell: (data: any) => {
  //         if (
  //           [3, 4, 5].includes(data.column.index) &&
  //           data.cell.section === 'body' &&
  //           data.cell.raw !== 0 &&
  //           currencyformat === '₹'
  //         ) {
  //           const textPos = data.cell.textPos;
  //           //  doc.addImage(rupeeImage, textPos.x - data.cell.contentWidth, textPos.y + 0.5, 1.7, 1.7);
  //         }
  //       }
  //     });

  //     if (typeof doc.putTotalPages === 'function') {
  //       doc.putTotalPages(totalPagesExp);
  //     }

  //     if (printorpdf === 'Pdf') doc.save(`${reportName}.pdf`);
  //     if (printorpdf === 'Print') this.setiFrameForPrint(doc);
  //   }
  _CashBookReportsPdf(
    reportName: string,
    gridData: any[],
    gridheaders: any[],
    colWidthHeight: any,
    pagetype: any,
    betweenorason: string,
    fromdate: string,
    todate: string,
    printorpdf: string
  ) {
    const address = this._CommonService.getcompanyaddress();
    const Companyreportdetails = this._CommonService._getCompanyDetails();
    const doc = new jsPDF(pagetype);
    const totalPagesExp = '{total_pages_count_string}';
    const today = this._CommonService.pdfProperties('Date');
    const currencyformat = this._CommonService.currencysymbol;
    const rupeeImage = this._CommonService._getRupeeSymbol();
    const kapil_logo = this._CommonService.getKapilGroupLogo();
    const companyName = Companyreportdetails?.companyName ?? '';
    const companyAddress = Companyreportdetails?.registrationAddress ?? '';
    const companyCIN = Companyreportdetails?.cinNumber ?? '';
    const companyBranch = Companyreportdetails?.branchName ?? '';

    // group rows by date
    const groupMap = new Map<string, any[]>();
    for (const row of gridData) {
      if (row._isGroupHeader) continue;
      const key = row.ptransactiondate;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(row);
    }

    let isFirstTable = true;
    let currentY = 48;

    const drawPageHeader = (doc: jsPDF) => {
      const pageWidth = doc.internal.pageSize.getWidth();
      if (doc.getNumberOfPages() === 1) {
      doc.setFont('helvetica', 'normal');
      doc.addImage(kapil_logo, 'JPEG', 10, 15, 20, 20);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text(companyName, pageWidth / 2, 15, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(companyAddress, pageWidth / 2, 21, { align: 'center' });
      doc.text(`CIN : ${companyCIN}`, pageWidth / 2, 26, { align: 'center' });
      doc.setFontSize(14);
      doc.text(reportName, pageWidth / 2, 36, { align: 'center' });
      doc.setFontSize(10);
      doc.text('Branch : ' + companyBranch, pageWidth - 30, 43, { align: 'right' });
      if (betweenorason === 'Between') {
        doc.text(`Between : ${fromdate} And ${todate}`, 15, 43);
      } else if (betweenorason === 'As On' && fromdate) {
        doc.text(`As on : ${fromdate}`, 15, 43);
      }
      doc.line(10, 46, pageWidth - 10, 46);
    };
  }

    // draw header on first page
    drawPageHeader(doc);

    groupMap.forEach((rows, dateKey) => {
      const dateLabel = new Date(dateKey).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      const pageHeight = doc.internal.pageSize.getHeight();

      // if not enough space for date header + at least one row, add new page
      if (!isFirstTable && currentY + 20 > pageHeight - 15) {
        doc.addPage();
        drawPageHeader(doc);
        currentY = 48;
      }

      // draw date group header bar
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFillColor(220, 230, 241);
      doc.rect(10, currentY, pageWidth - 20, 7, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(dateLabel, 13, currentY + 5);
      doc.setFont('helvetica', 'normal');

      currentY += 7;

      autoTable(doc, {
        columns: gridheaders,
        body: rows,
        theme: 'grid',
        headStyles: {
          fillColor: this._CommonService.pdfProperties('Header Color'),
          halign: 'center',
          fontSize: Number(this._CommonService.pdfProperties('Header Fontsize'))
        },
        bodyStyles: {
          fontSize: Number(this._CommonService.pdfProperties('Cell Fontsize')),
        },
        styles: {
          cellPadding: 1,
          fontSize: Number(this._CommonService.pdfProperties('Cell Fontsize')),
          cellWidth: 'wrap',
          rowPageBreak: 'avoid',
          overflow: 'linebreak'
        } as any,
        columnStyles: colWidthHeight,
        startY: currentY,
        margin: { top: 48, left: 10, right: 10 },
        showHead: isFirstTable ? 'firstPage' : 'never',
        didDrawPage: (data: any) => {
          const pageSize = doc.internal.pageSize;
          const pageWidth = pageSize.getWidth();
          const pageHeight = pageSize.getHeight();

          // redraw company header on new pages
          if (data.pageNumber > 1 || !isFirstTable) {
            drawPageHeader(doc);
          }

          let page = 'Page ' + doc.getNumberOfPages();
          if (typeof doc.putTotalPages === 'function') {
            page += ' of ' + totalPagesExp;
          }
          doc.line(5, pageHeight - 10, pageWidth - 5, pageHeight - 10);
          doc.setFontSize(10);
          doc.text(page, pageWidth - 30, pageHeight - 5);
        },

        didDrawCell: (data: any) => {
          if (
            [3, 4, 5].includes(data.column.index) &&
            data.cell.section === 'body' &&
            data.cell.raw !== 0 &&
            currencyformat === '₹'
          ) {
            // rupee image if needed
          }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 4;
      isFirstTable = false;
    });

    // draw totals row at the end
    const totalReceipts = gridData
      .filter(r => !r._isGroupHeader)
      .reduce((sum, r) => sum + (r.pdebitamount || 0), 0);
    const totalPayments = gridData
      .filter(r => !r._isGroupHeader)
      .reduce((sum, r) => sum + (r.pcreditamount || 0), 0);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    if (currentY + 10 > pageHeight - 15) {
      doc.addPage();
      drawPageHeader(doc);
      currentY = 48;
    }

    doc.setFillColor(200, 200, 200);
    doc.rect(10, currentY, pageWidth - 20, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Total', 13, currentY + 5);
    doc.text(totalReceipts.toFixed(2), pageWidth - 80, currentY + 5, { align: 'right' });
    doc.text(totalPayments.toFixed(2), pageWidth - 50, currentY + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    if (typeof doc.putTotalPages === 'function') {
      doc.putTotalPages(totalPagesExp);
    }

    if (printorpdf === 'Pdf') doc.save(`${reportName}.pdf`);
    if (printorpdf === 'Print') this.setiFrameForPrint(doc);
  }
  // _BankBookReportsPdf(
  //   reportName: string,
  //   gridData: any[],
  //   gridheaders: any[],
  //   colWidthHeight: any,
  //   pagetype: any,
  //   betweenorason: string,
  //   fromdate: string,
  //   todate: string,
  //   printorpdf: string,
  //   bankname: string
  // ) {
  //   const address = this._CommonService.getcompanyaddress();
  //   const Companyreportdetails = this._CommonService._getCompanyDetails();
  //   const doc = new jsPDF(pagetype);
  //   const totalPagesExp = '{total_pages_count_string}';
  //   const today = this._CommonService.pdfProperties('Date');
  //   const kapil_logo = this._CommonService.getKapilGroupLogo();

  // //   doc.autoTable({
  // //     columns: gridheaders,
  // //     body: gridData,
  // //     theme: 'grid',
  // //     startY: 48,
  // //     didDrawPage: () => {
  // //       doc.setFont(undefined, 'normal');
  // //       doc.setFontSize(14);
  // //       doc.text(`${reportName} - ${bankname}`, 100, 30);
  // //     }
  // //   });

  //   if (printorpdf === 'Pdf') doc.save(`${reportName}.pdf`);
  //   if (printorpdf === 'Print') this.setiFrameForPrint(doc);
  // }
  _BankBookReportsPdf(
    reportName: string,
    gridData: any[],
    gridheaders: any[],
    colWidthHeight: any,
    pagetype: any,
    betweenorason?: string,
    fromdate?: string,
    todate?: string,
    printorpdf?: string,
    bankname?: string
  ) {

    //   const doc = new jsPDF({
    //   orientation: 'landscape',
    //   unit: 'mm',
    //   format: 'a4'
    // });

    //   const today = this._CommonService.pdfProperties('Date');

    //   doc.setFontSize(14);
    //   doc.setFont('helvetica', 'bold');
    //   doc.text(`${reportName}`, 105, 15, { align: 'center' });

    //   doc.setFontSize(11);
    //   doc.setFont('helvetica', 'normal');
    //   doc.text(`${bankname}`, 105, 22, { align: 'center' });

    //   doc.setFontSize(9);
    //   doc.text(`Generated On: ${today}`, 14, 30);

    //   if (betweenorason && fromdate && todate) {
    //     doc.text(`${betweenorason}: ${fromdate} - ${todate}`, 14, 36);
    //   }

    // const pageWidth = doc.internal.pageSize.getWidth();
    // const margin = 8;
    // const usableWidth = pageWidth - margin * 2;

    // autoTable(doc, {
    //   head: [gridheaders.map(h => h.header ?? h)],
    //   body: gridData.map(row =>
    //     gridheaders.map(h => {
    //       const value = row[h.field ?? h] ?? '';
    //       return String(value);  
    //     })
    //   ),

    //   startY: 42,
    //   theme: 'grid',

    //   margin: { left: margin, right: margin },

    //   tableWidth: usableWidth,  

    //   styles: {
    //     fontSize: 5,
    //     cellPadding: 1,
    //     overflow: 'hidden',    
    //     cellWidth: usableWidth / gridheaders.length
    //   },

    //   headStyles: {
    //     fillColor: [11, 64, 147],
    //     textColor: 255,
    //     fontSize: 6
    //   }
    // });

    //   const pageCount = doc.getNumberOfPages();
    //   for (let i = 1; i <= pageCount; i++) {
    //     doc.setPage(i);
    //     doc.setFontSize(8);
    //     doc.text(
    //       `Page ${i} of ${pageCount}`,
    //       105,
    //       doc.internal.pageSize.height - 10,
    //       { align: 'center' }
    //     );
    //   }
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;
    let currentY = 12;
    const Companyreportdetails = this._CommonService._getCompanyDetails();
    const kapil_logo = this._CommonService.getKapilGroupLogo();
    const companyName = Companyreportdetails?.companyName ?? '';
    const companyAddress = Companyreportdetails?.registrationAddress ?? '';
    const companyCIN = Companyreportdetails?.cinNumber ?? '';
    const companyBranch = Companyreportdetails?.branchName ?? '';


    doc.setFont('helvetica', 'bold');
    doc.addImage(kapil_logo, 'JPEG', 10, 15, 20, 20);
    doc.setFontSize(16);
    doc.text(
      companyName,
      pageWidth / 2,
      currentY,
      { align: 'center' }
    );
    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(
      companyAddress,
      pageWidth / 2,
      currentY,
      { align: 'center' }
    );
    currentY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(
      `CIN: ${companyCIN}`,
      pageWidth / 2,
      currentY,
      { align: 'center' }
    );
    currentY += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(reportName, pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    if (bankname) {
      doc.text(bankname, pageWidth / 2, currentY, { align: 'center' });
      currentY += 6;
    }

    doc.setFontSize(10);
    doc.text(`Between : ${fromdate} And ${todate}`, margin, currentY);
    // doc.text(`Between : ${fromdate} And ${todate}`, 15, 57);
    doc.text(`Branch: ${companyBranch}`, pageWidth - margin, currentY, { align: 'right' });

    currentY += 6;

    const headRow = gridheaders.map(h => h.header ?? h);

    const bodyRows: any[] = gridData.map(row => {
      if (row.isGroupHeader) {
        return [{
          content: row.groupLabel,
          colSpan: gridheaders.length,
          styles: {
            fontStyle: 'bold',
            fillColor: [220, 230, 245],
            textColor: [11, 64, 147],
            halign: 'left',
            fontSize: 10
          }
        }];
      }
      return gridheaders.map(h => {
        const value = row[h.field ?? h] ?? '';
        return String(value);
      });
    });

    autoTable(doc, {
      head: [headRow],
      body: bodyRows,

      startY: currentY + 4,
      theme: 'grid',

      margin: { left: margin, right: margin },

      styles: {
        fontSize: 10,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle'
      },

      headStyles: {
        fillColor: [11, 64, 147],
        textColor: 255,
        fontSize: 12,
        halign: 'center'
      }
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    }

    if (printorpdf === 'Pdf') {
      doc.save(`${reportName}.pdf`);
    }

    if (printorpdf === 'Print') {
      this.setiFrameForPrint(doc);
    }

  }
  _AccountLedgerReportsPdf(
    reportName: string,
    subreportname: string,
    gridData: any[],
    gridheaders: any[],
    colWidthHeight: any,
    pagetype: any,
    betweenorason: string,
    fromdate: string,
    todate: string,
    printorpdf: string
  ) {
    const address = this._CommonService.getcompanyaddress();
    const Companyreportdetails = this._CommonService._getCompanyDetails();
    const doc = new jsPDF(pagetype);
    const today = this._CommonService.pdfProperties('Date');
    const kapil_logo = this._CommonService.getKapilGroupLogo();

    autoTable(doc, {
      columns: gridheaders,
      body: gridData,
      startY: 64,
      theme: 'grid',
      headStyles: { fontSize: 6 },
      margin: { left: 3, right: 3 },
      didDrawPage: () => {
        doc.setFont('helvetica', 'normal');
        doc.addImage(kapil_logo, 'JPEG', 10, 15, 20, 20);
        doc.setFontSize(15);
        doc.text(Companyreportdetails?.pCompanyName ?? '', 60, 15);
        doc.setFontSize(9);
        doc.text(address, 32, 20);
        doc.setFontSize(14);
        doc.text(reportName, 90, 38);
        doc.text(subreportname, 30, 45);
        doc.setFontSize(10);
        doc.text('Printed on : ' + today, 15, doc.internal.pageSize.getHeight() - 5);
      }
    });

    if (printorpdf === 'Pdf') doc.save(`${reportName}.pdf`);
    if (printorpdf === 'Print') this.setiFrameForPrint(doc);
  }
  _AccountLedgerReportsPdfforpettycash(
    reportName: string,
    subreportname: string,
    gridData: any[],
    gridheaders: any[],
    colWidthHeight: any,
    pagetype: any,
    betweenorason: string,
    fromdate: string,
    todate: string,
    printorpdf: string,
    isNarrationChecked: boolean
  ) {
    debugger
    const address = this._CommonService.getcompanyaddress();
    console.log('Session at PDF time:', sessionStorage.getItem('CompanyDetails'));
    const Companyreportdetails = this._CommonService._getCompanyDetails();
    const doc = new jsPDF(pagetype);
    const totalPagesExp = '{total_pages_count_string}';
    const today = this._CommonService.pdfProperties('Date');
    const kapil_logo = this._CommonService.getKapilGroupLogo();
    const companyName = Companyreportdetails?.companyName ?? '';
    const companyAddress = Companyreportdetails?.branchAddress ?? '';
    const companyCIN = Companyreportdetails?.cinNumber ?? '';
    const companyBranch = Companyreportdetails?.branchName ?? '';
    const companyGST = Companyreportdetails?.gstNumber ?? '';
    const registrationAddr = Companyreportdetails?.registrationAddress ?? '';

    autoTable(doc, {
      columns: gridheaders,
      body: gridData,
      theme: 'grid',
      headStyles: {
        fillColor: this._CommonService.pdfProperties('Header Color'),
        halign: this._CommonService.pdfProperties('Header Alignment') as 'left' | 'center' | 'right',
        fontSize: Number(this._CommonService.pdfProperties('Header Fontsize'))
      },
      styles: {
        cellPadding: 1,
        fontSize: Number(this._CommonService.pdfProperties('Cell Fontsize')),
        cellWidth: 'wrap',
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { halign: 'center' },
        1: { cellWidth: isNarrationChecked ? 60 : 'auto', halign: 'left' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      },
      startY: 64,
      didDrawPage: (data: any) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFont('helvetica', 'normal');

        if (doc.getNumberOfPages() === 1) {
          doc.addImage(kapil_logo, 'JPEG', 10, 15, 20, 20);
          // doc.setFontSize(15);
          // doc.text(Companyreportdetails?.pCompanyName??'', 60, 15);
          // doc.setFontSize(9);
          // doc.text(address, 32, 20);
          doc.setFontSize(15);
          doc.setFont('helvetica', 'bold');
          doc.text(companyName, 105, 15, { align: 'center' });
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(
            registrationAddr,
            105,
            21,
            { align: 'center' }
          );
          doc.text(`CIN : ${companyCIN}`, 105, 26, { align: 'center' });

          doc.setFontSize(14);
          doc.text(reportName, 90, 38);
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(subreportname, 90);
          // doc.text(lines, 30, 45);
          doc.text(lines, pageWidth / 2, 45, { align: 'center' });

          // doc.setFontSize(10);
          // doc.text('Branch : ' + Companyreportdetails?.pBranchname, 163, 57);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Branch : ${companyBranch}`, 160, 57);

          if (betweenorason === 'Between') {
            doc.text(`Between : ${fromdate} And ${todate}`, 15, 57);
          } else if (fromdate) {
            doc.text(`As on : ${fromdate}`, 15, 52);
          }

          doc.line(10, 59, pageWidth - 10, 59);
        }

        let page = 'Page ' + doc.getNumberOfPages();
        if (typeof doc.putTotalPages === 'function') {
          page += ' of ' + totalPagesExp;
        }

        doc.line(5, pageHeight - 10, pageWidth - 5, pageHeight - 10);
        doc.text('Printed on : ' + today, 15, pageHeight - 5);
        doc.text(page, pageWidth - 30, pageHeight - 5);
      }
    });

    if (typeof doc.putTotalPages === 'function') doc.putTotalPages(totalPagesExp);
    if (printorpdf === 'Pdf') doc.save(`${reportName}.pdf`);
    if (printorpdf === 'Print') this.setiFrameForPrint(doc);
  }


  _IssuedChequesReportsPdf(
    reportName: string,
    gridData: any[],
    gridheaders: any[],
    colWidthHeight: any,
    pagetype: any,
    betweenorason: string,
    fromdate: string,
    todate: string,
    printorpdf: string
  ) {
    const Companyreportdetails = this._CommonService._getCompanyDetails();
    const doc = new jsPDF({
      orientation: pagetype === 'landscape' ? 'landscape' : 'portrait',
      format: 'a4'
    });

    const today = this._CommonService.pdfProperties('Date');
    const kapil_logo = this._CommonService.getKapilGroupLogo();
    const currencyformat = this._CommonService.currencysymbol;
    const totalPagesExp = '{total_pages_count_string}';
    const rupeeImg = this._CommonService._getRupeeSymbol();
    const companyName = Companyreportdetails?.companyName ?? '';
    const companyAddress = Companyreportdetails?.registrationAddress ?? '';
    const companyCIN = Companyreportdetails?.cinNumber ?? '';
    const companyBranch = Companyreportdetails?.branchName ?? '';

    autoTable(doc, {
      head: [gridheaders],
      body: gridData,
      startY: 52,
      theme: 'grid',
      headStyles: {
        fillColor: this._CommonService.pdfProperties('Header Color'),
        halign: this._CommonService.pdfProperties('Header Alignment') as 'left' | 'center' | 'right' | 'justify',
        fontSize: Number(this._CommonService.pdfProperties('Header Fontsize'))
      },
      columnStyles: colWidthHeight,
      didDrawPage: (pageData: any) => {
        if (pageData.pageNumber !== 1) return;
        doc.setFont('helvetica', 'normal');
        if (kapil_logo) {
          doc.addImage(kapil_logo, 'JPEG', 10, 15, 20, 20);
        }

        // doc.setFontSize(15);
        // doc.text(Companyreportdetails?.pCompanyName ?? '', 60, 20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        // doc.text(Companyreportdetails?.pCompanyName ?? '', 150, 20, { align: 'center' });
        doc.text(companyName, 150, 20, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        // doc.text(address ?? '', 150, 27, { align: 'center' });
        doc.text(companyAddress, 150, 27, { align: 'center' });

        // doc.text('CIN : ' + (Companyreportdetails?.pCIN ?? ''), 150, 33, { align: 'center' });
        doc.text('CIN : ' + companyCIN, 150, 33, { align: 'center' });

        doc.setFontSize(14);
        doc.text(reportName ?? '', 125, 42);

      },
      didDrawCell: (data: any) => {
        // if (
        //   data.column.index === 5 &&
        //   data.cell.section === 'body' &&
        //   data.cell.raw !== 0 &&
        //   currencyformat === '₹'
        // ) {
        //   const textPos = data.cell.textPos;
        //   const rupeeImg = this._CommonService._getRupeeSymbol();
        //   doc.addImage(rupeeImg, textPos.x - data.cell.contentWidth, textPos.y + 0.5, 1.7, 1.7);
        // }
        if (
          data.column.index === 5 &&
          data.cell.section === 'body' &&
          data.cell.raw !== 0 &&
          data.cell.raw !== '' &&
          data.cell.raw !== null &&
          currencyformat === '₹'
        ) {
          const x = data.cell.x + 1;
          const y = data.cell.y + data.cell.height / 2 - 1;
          doc.addImage(rupeeImg, 'PNG', x, y, 1.7, 1.7);
        }
      }
    });

    if (typeof doc.putTotalPages === 'function') doc.putTotalPages(totalPagesExp);
    if (printorpdf === 'Pdf') doc.save(`${reportName ?? 'report'}.pdf`);
    if (printorpdf === 'Print') this.setiFrameForPrint(doc);
  }

  // _ChequeReturnCancelReportsPdf(
  //   reportName: string,
  //   gridData: any[],
  //   gridheaders: any[],
  //   colWidthHeight: any,
  //   pagetype: any,
  //   betweenorason: string,
  //   fromdate: string,
  //   todate: string,
  //   printorpdf: string
  // ) {
  //   const address = this._CommonService.getcompanyaddress();
  //   const Companyreportdetails = this._CommonService._getCompanyDetails();
  //   const doc = new jsPDF(pagetype);
  //   const today = this._CommonService.pdfProperties('Date');
  //   const kapil_logo = this._CommonService.getKapilGroupLogo();
  //   const currencyformat = this._CommonService.currencysymbol;
  //   const totalPagesExp = '{total_pages_count_string}';

  //   autoTable(doc, {
  //     head: [gridheaders],
  //     body: gridData,
  //     startY: 53,
  //     theme: 'grid',
  //     didDrawPage: () => {
  //       doc.setFont('helvetica', 'normal');
  //       doc.addImage(kapil_logo, 'JPEG', 10, 15, 20, 20);
  //       doc.setFontSize(15);
  //       doc.text(Companyreportdetails?.pCompanyName ?? '', 60, 20);
  //       doc.setFontSize(14);
  //       doc.text(reportName, 85, 42);
  //     },
  //     didDrawCell: (data: any) => {
  //       if (data.column.index === 2 && currencyformat === '₹') {
  //         const textPos = data.cell.textPos;
  //         const rupeeImg = this._CommonService._getRupeeSymbol();
  //         doc.addImage(rupeeImg, textPos.x - data.cell.contentWidth, textPos.y + 0.5, 1.7, 1.7);
  //       }
  //     }
  //   });

  //   if (typeof doc.putTotalPages === 'function') doc.putTotalPages(totalPagesExp);
  //   if (printorpdf === 'Pdf') doc.save(`${reportName}.pdf`);
  //   if (printorpdf === 'Print') this.setiFrameForPrint(doc);
  // }
  _ChequeReturnCancelReportsPdf(
    reportName: string,
    gridData: any[],
    gridheaders: any[],
    colWidthHeight: any,
    pagetype: any,
    betweenorason: string,
    fromdate: string,
    todate: string,
    printorpdf: string
  ) {
    const address = this._CommonService.getcompanyaddress();
    const Companyreportdetails = this._CommonService._getCompanyDetails();
    // const branch = this._CommonService.getBranch();
    const doc = new jsPDF({ orientation: 'landscape' });

    const todayDateTime = this._CommonService.pdfProperties('Date');
    const kapil_logo = this._CommonService.getKapilGroupLogo();
    const currencyformat = this._CommonService.currencysymbol;
    const totalPagesExp = '{total_pages_count_string}';
    const rupeeImg = this._CommonService._getRupeeSymbol();
    const companyName = Companyreportdetails?.companyName ?? '';
    const companyAddress = Companyreportdetails?.registrationAddress ?? '';
    const companyCIN = Companyreportdetails?.cinNumber ?? '';
    const companyBranch = Companyreportdetails?.branchName ?? '';
    const cleanedGridData: any[] = gridData.map(row => {
      if (Array.isArray(row)) {
        return row.map((cell, i) =>
          i === 2
            ? String(cell ?? '').replace(/[^\d,\.]/g, '').trim()
            : typeof cell === 'string' ? cell.replace(/₹/g, '').trim() : cell
        );
      }
      const cleaned: any = { ...row };
      Object.keys(cleaned).forEach(k => {
        if (typeof cleaned[k] === 'string') cleaned[k] = cleaned[k].replace(/₹/g, '').trim();
      });
      return cleaned;
    });

    autoTable(doc, {
      head: [gridheaders],
      // body: gridData,
      body: cleanedGridData,
      startY: 78,
      theme: 'grid',
      columnStyles: {
        2: { halign: 'left', cellPadding: { top: 1, bottom: 1, left: 4, right: 1 } }
      }, headStyles: {
        fillColor: this._CommonService.pdfProperties('Header Color'),
        halign: this._CommonService.pdfProperties('Header Alignment') as 'left' | 'center' | 'right' | 'justify',
        fontSize: Number(this._CommonService.pdfProperties('Header Fontsize'))
      },

      didDrawPage: function (data) {
        if (doc.getNumberOfPages() === 1) {

          doc.addImage(kapil_logo, 'JPEG', 10, 10, 20, 20);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          // doc.text(Companyreportdetails?.pCompanyName ?? '', 150, 20, { align: 'center' });
          doc.text(companyName, 150, 20, { align: 'center' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          // doc.text(address ?? '', 150, 27, { align: 'center' });
          doc.text(companyAddress, 150, 27, { align: 'center' });

          // doc.text('CIN : ' + (Companyreportdetails?.pCIN ?? ''), 150, 33, { align: 'center' });
          doc.text('CIN : ' + companyCIN, 150, 33, { align: 'center' });

          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(reportName, 150, 45, { align: 'center' });

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');

          let dateText = '';
          if (betweenorason === 'Between' && fromdate && todate) {
            dateText = 'Between : ' + fromdate + ' And ' + todate;
          } else if (betweenorason === 'As On' && fromdate) {
            dateText = 'As On : ' + fromdate;
          }

          // doc.text(dateText, 15, 55);
          // doc.text('Branch : ' + (branch ?? ''), 230, 55);
          doc.text(dateText, 15, 55);
          doc.text(`Branch : ${companyBranch}`, 230, 55);

          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.5);
          doc.line(15, 62, 282, 62);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('Cheque Details', 90, 68);
          doc.text('Receipt Details', 200, 68);
        }
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height
          ? pageSize.height
          : pageSize.getHeight();

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        doc.text(
          'Printed on : ' + todayDateTime,
          15,
          pageHeight - 10
        );

        const pageStr = 'Page ' + doc.getNumberOfPages();
        doc.text(pageStr, pageSize.width - 40, pageHeight - 10);
      },

      didDrawCell: (data: any) => {
        // if (data.column.index === 2 && currencyformat === '₹') {
        //   const textPos = data.cell.textPos;
        //   const rupeeImg = this._CommonService._getRupeeSymbol();
        //   doc.addImage(
        //     rupeeImg,
        //     'JPEG',
        //     textPos.x - data.cell.contentWidth,
        //     textPos.y + 0.5,
        //     1.7,
        //     1.7
        //   );
        // }
        if (
          data.column.index === 2 &&
          data.cell.section === 'body' &&
          data.cell.raw !== '' &&
          data.cell.raw !== null &&
          currencyformat === '₹'
        ) {
          // const cellText = String(data.cell.raw).replace(/[^\d,\.]/g, '').trim();
          // if (!cellText) return;

          // const padding = data.cell.padding;
          // let paddingRight = 2;
          // if (typeof padding === 'number') {
          //   paddingRight = padding;
          // } else if (padding && typeof padding === 'object') {
          //   paddingRight = (padding as any).right ?? 2;
          // }

          // const symbolSize = 1.7;

          // const cellFontSize = data.cell.styles?.fontSize ?? 8;
          // doc.setFontSize(cellFontSize);
          // doc.setFont('helvetica', 'normal');
          // const textWidth = doc.getTextWidth(cellText);

          // const x = (data.cell.x + data.cell.width) - paddingRight - textWidth - symbolSize - 0.5;
          // const y = data.cell.y + data.cell.height / 2 - 1;

          // doc.addImage(rupeeImg, 'PNG', x, y, symbolSize, symbolSize);
          const x = data.cell.x + 1;
          const y = data.cell.y + data.cell.height / 2 - 1;
          doc.addImage(rupeeImg, 'PNG', x, y, 1.7, 1.7);
        }
      }
    });

    if (typeof doc.putTotalPages === 'function') {
      doc.putTotalPages(totalPagesExp);
    }

    if (printorpdf === 'Pdf') doc.save(`${reportName}.pdf`);
    if (printorpdf === 'Print') this.setiFrameForPrint(doc);
  }
  // _ChequeManagementPdf(
  //   reportName: string,
  //   gridData: any[],
  //   gridheaders: any[],
  //   colWidthHeight: any,
  //   pagetype: any,
  //   printorpdf: string
  // ) {
  //   const address = this._CommonService.getcompanyaddress();
  //   const Companyreportdetails = this._CommonService._getCompanyDetails();
  //   const doc = new jsPDF(pagetype);
  //   const today = this._CommonService.pdfProperties('Date');
  //   const kapil_logo = this._CommonService.getKapilGroupLogo();
  //   const totalPagesExp = '{total_pages_count_string}';

  // //   doc.autoTable({
  // //     columns: gridheaders,
  // //     body: gridData,
  // //     theme: 'grid',
  // //     columnStyles: colWidthHeight,
  // //     startY: 53,
  // //     didDrawPage: (data:any) => {
  // //       const pageHeight = doc.internal.pageSize.getHeight();
  // //       const pageWidth = doc.internal.pageSize.getWidth();

  // //       doc.setFont(undefined, 'normal');

  // //       if (doc.internal.getNumberOfPages() === 1) {
  // //         doc.addImage(kapil_logo, 'JPEG', 10, 15, 20, 20);
  // //         doc.setFontSize(15);
  // //         doc.text(Companyreportdetails.pCompanyName, 60, 20);
  // //         doc.setFontSize(10);
  // //         doc.text(address, 40, 27);
  // //         doc.setFontSize(14);
  // //         doc.text(reportName, 85, 42);
  // //         doc.line(10, 51, pageWidth - 10, 51);
  // //       }

  // //       let page = 'Page ' + doc.internal.getNumberOfPages();
  // //       if (typeof doc.putTotalPages === 'function') page += ' of ' + totalPagesExp;

  // //       doc.line(5, pageHeight - 10, pageWidth - 5, pageHeight - 10);
  // //       doc.setFontSize(10);
  // //       doc.text('Printed on : ' + today, 15, pageHeight - 5);
  // //       doc.text(page, pageWidth - 30, pageHeight - 5);
  // //     }
  // //   });

  //   if (typeof doc.putTotalPages === 'function') doc.putTotalPages(totalPagesExp);
  //   if (printorpdf === 'Pdf') doc.save(`${reportName}.pdf`);
  //   if (printorpdf === 'Print') this.setiFrameForPrint(doc);
  // }



  _ChequeManagementPdf(
    reportName: string,
    gridData: any[],
    gridheaders: any[],
    colWidthHeight: any,
    pagetype: any,
    printorpdf: string
  ) {
    const address = this._CommonService.getcompanyaddress();
    const Companyreportdetails = this._CommonService._getCompanyDetails();
    const doc = new jsPDF(pagetype);
    const today = this._CommonService.pdfProperties('Date');
    const kapil_logo = this._CommonService.getKapilGroupLogo();
    const totalPagesExp = '{total_pages_count_string}';
    const companyName = Companyreportdetails?.companyName ?? '';
    const companyAddress = Companyreportdetails?.registrationAddress ?? '';
    const companyCIN = Companyreportdetails?.cinNumber ?? '';
    const companyBranch = Companyreportdetails?.branchName ?? '';

    autoTable(doc, {
      head: [gridheaders],   // ✅ IMPORTANT
      body: gridData,        // ✅ IMPORTANT
      theme: 'grid',
      columnStyles: colWidthHeight,
      startY: 53,
      didDrawPage: (data: any) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();

        // doc.setFont(undefined, 'normal');
        // doc.setFont('helvetica', 'normal');

        doc.setFont(undefined as any, 'normal');

        if (doc.getNumberOfPages() === 1) {

          doc.addImage(kapil_logo, 'JPEG', 10, 15, 20, 20);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          doc.text(companyName, 150, 20, { align: 'center' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);

          doc.text(companyAddress, 150, 27, { align: 'center' });

          doc.text('CIN : ' + companyCIN, 150, 33, { align: 'center' });

          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(reportName, 150, 45, { align: 'center' });
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Branch : ${companyBranch}`, 240, 50, { align: 'left' });
        }

        let page = 'Page ' + doc.getNumberOfPages();

        if (typeof doc.putTotalPages === 'function') {
          page += ' of ' + totalPagesExp;
        }

        doc.line(5, pageHeight - 10, pageWidth - 5, pageHeight - 10);
        doc.setFontSize(10);
        doc.text('Printed on : ' + today, 15, pageHeight - 5);
        doc.text(page, pageWidth - 30, pageHeight - 5);
      }
    });

    if (typeof doc.putTotalPages === 'function') {
      doc.putTotalPages(totalPagesExp);
    }

    if (printorpdf === 'Pdf') doc.save(`${reportName}.pdf`);
    if (printorpdf === 'Print') this.setiFrameForPrint(doc);
  }

  // _ComparisionTBReportsPdf(
  //   reportName: string,
  //   gridData: any[],
  //   gridheaders: any[],
  //   colWidthHeight: any,
  //   pagetype: any,
  //   betweenorason: string,
  //   fromdate: string,
  //   todate: string,
  //   printorpdf: string
  // ) {
  //   const Companyreportdetails = this._CommonService._getCompanyDetails();
  //   const doc = new jsPDF({
  //     orientation: pagetype === 'landscape' ? 'landscape' : 'portrait',
  //     format: 'a4'
  //   });

  //   const today = this._CommonService.pdfProperties('Date');
  //   const kapil_logo = this._CommonService.getKapilGroupLogo();
  //   const currencyformat = this._CommonService.currencysymbol;
  //   const totalPagesExp = '{total_pages_count_string}';

  //   autoTable(doc, {
  //     head: [gridheaders],
  //     body: gridData,
  //     startY: 55,
  //     theme: 'grid',
  //     columnStyles: colWidthHeight,
  //     didDrawPage: () => {
  //       const pageHeight = doc.internal.pageSize.getHeight();
  //       const pageWidth = doc.internal.pageSize.getWidth();

  //       doc.setFont('helvetica', 'normal');
  //       if (kapil_logo) doc.addImage(kapil_logo, 'JPEG', 10, 5, 30, 15);

  //       doc.setFontSize(15);
  //       doc.text(String(Companyreportdetails?.pCompanyName ?? ''), 60, 10);

  //       doc.setFontSize(14);
  //       doc.text(String(reportName ?? ''), 90, 30);

  //       if (betweenorason === 'Between') {
  //         doc.text(String(`Between : ${fromdate ?? ''} And ${todate ?? ''}`), 15, 40);
  //       }

  //       const pageNo = (doc as any).internal.getNumberOfPages?.() ?? 1;
  //       let page = 'Page ' + String(pageNo);

  //       if (typeof (doc as any).putTotalPages === 'function') {
  //         page += ' of ' + totalPagesExp;
  //       }

  //       doc.line(5, pageHeight - 10, pageWidth - 5, pageHeight - 10);
  //       doc.setFontSize(10);
  //       doc.text(String('Printed on : ' + today), 15, pageHeight - 5);
  //       doc.text(String(page), pageWidth - 30, pageHeight - 5);
  //     },
  //     didDrawCell: (data: any) => {
  //       if (data.cell.section === 'body' && data.column.index > 0 && data.cell.raw !== 0 && currencyformat === '₹') {
  //         const rupeeImg = this._CommonService._getRupeeSymbol();
  //         const textPos = data.cell.textPos;
  //         doc.addImage(rupeeImg, textPos.x - data.cell.contentWidth, textPos.y + 0.5, 1.7, 1.7);
  //       }
  //     }

  //   });

  //   if (typeof (doc as any).putTotalPages === 'function') {
  //     (doc as any).putTotalPages(totalPagesExp);
  //   }

  //   if (printorpdf === 'Pdf') {
  //     doc.save(`${reportName ?? 'report'}.pdf`);
  //   }

  //   if (printorpdf === 'Print') {
  //     this.setiFrameForPrint(doc);
  //   }
  // }
  _ComparisionTBReportsPdf(
    reportName: string,
    gridData: any[],
    gridheaders: any[],
    colWidthHeight: any,
    pagetype: any,
    betweenorason: string,
    fromdate: string,
    todate: string,
    printorpdf: string
  ) {
    const Companyreportdetails = this._CommonService._getCompanyDetails();
    const doc = new jsPDF({
      orientation: 'landscape',
      format: 'a4'
    });
    const companyName = Companyreportdetails?.companyName ?? '';
    const companyAddress = Companyreportdetails?.registrationAddress ?? '';
    const companyCIN = Companyreportdetails?.cinNumber ?? '';
    const companyBranch = Companyreportdetails?.branchName ?? '';

    const today = this._CommonService.pdfProperties('Date');
    const kapil_logo = this._CommonService.getKapilGroupLogo();
    const currencyformat = this._CommonService.currencysymbol;
    const totalPagesExp = '{total_pages_count_string}';

    const columnStyles: any = {
      0: { cellWidth: 82 },
      1: { cellWidth: 28, halign: 'right' },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
    };
    const rupeeImg = this._CommonService._getRupeeSymbol();
    const tableLeft = 10;
    const col0W = 82;
    const colW = 28;
    const asAtRowH = 8;
    const asAtStartY = 48;
    const headerFill: [number, number, number] = [0, 168, 168];

    autoTable(doc, {
      head: [gridheaders],
      body: gridData,
      startY: 60,
      theme: 'grid',
      columnStyles: columnStyles,
      tableWidth: 250,
      margin: { left: 10, right: 10 },
      styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
      // headStyles: { fillColor: [0, 168, 168], textColor: 255, fontSize: 8 },
      headStyles: {
        fillColor: this._CommonService.pdfProperties('Header Color'),
        halign: this._CommonService.pdfProperties('Header Alignment') as 'left' | 'center' | 'right' | 'justify',
        fontSize: Number(this._CommonService.pdfProperties('Header Fontsize'))
      },
      didParseCell: (data: any) => {
        if (data.row.raw?.isSubtotal === true) {
          data.cell.styles.fillColor = '#ffffb3';
          data.cell.styles.halign = data.column.index === 0 ? 'left' : 'right';
          data.cell.styles.fontStyle = 'bold';
        }
      },
      didDrawPage: () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
        if (currentPage === 1) {
          doc.setFont('helvetica', 'normal');
          if (kapil_logo) doc.addImage(kapil_logo, 'JPEG', 10, 5, 20, 20);

          // doc.setFontSize(15);
          // doc.text(String(Companyreportdetails?.pCompanyName ?? ''), 60, 10);
          doc.setFontSize(15);
          doc.setFont('helvetica', 'bold');
          doc.text(companyName, pageWidth / 2, 15, { align: 'center' });
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(
            companyAddress,
            pageWidth / 2, 22,
            { align: 'center' }
          );
          doc.text(`CIN : ${companyCIN}`, pageWidth / 2, 27, { align: 'center' });

          doc.setFontSize(14);
          doc.text(String(reportName ?? ''), pageWidth / 2, 35, { align: 'center' });

          if (betweenorason === 'Between') {
            doc.setFontSize(11);
            doc.text(`Between : ${fromdate ?? ''} And ${todate ?? ''}`, 15, 45);
          }
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Branch : ${companyBranch}`, pageWidth - 70, 45);
          const tableLeft = 10;
          const col0W = 82;
          const colW = 28;
          const grpW = colW * 2;

          const x1 = tableLeft + col0W;
          const x2 = x1 + grpW;
          const x3 = x2 + grpW;

          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.3);
          doc.line(tableLeft, 49, tableLeft + col0W + grpW * 3, 49);

          doc.text('As at', tableLeft + 5, 54, { align: 'left' });
          doc.text(fromdate ?? '', x1 + grpW / 2, 54, { align: 'center' });

          doc.text(todate ?? '', x2 + grpW / 2, 54, { align: 'center' });

          doc.text('For the Period', x3 + grpW / 2, 54, { align: 'center' });


        }



        const pageNo = (doc as any).internal.getNumberOfPages?.() ?? 1;
        let page = 'Page ' + String(pageNo);
        if (typeof (doc as any).putTotalPages === 'function') {
          page += ' of ' + totalPagesExp;
        }

        doc.line(5, pageHeight - 10, pageWidth - 5, pageHeight - 10);
        doc.setFontSize(10);
        doc.text('Printed on : ' + today, 15, pageHeight - 5);
        doc.text(page, pageWidth - 30, pageHeight - 5);
      },
      didDrawCell: (data: any) => {
        if (
          data.cell.section === 'body' &&
          data.column.index > 0 &&
          data.cell.raw !== 0 &&
          data.cell.raw !== '' &&
          currencyformat === '₹'
        ) {
          // const rupeeImg = this._CommonService._getRupeeSymbol();
          // const textPos = data.cell.textPos;
          // doc.addImage(rupeeImg, textPos.x - data.cell.contentWidth, textPos.y + 0.5, 1.7, 1.7);
          const padding = data.cell.padding;
          let paddingLeft = 2;
          if (typeof padding === 'number') {
            paddingLeft = padding;
          } else if (padding && typeof padding === 'object') {
            paddingLeft = (padding as any).left ?? 2;
          }

          const x = data.cell.x + paddingLeft;
          const y = data.cell.y + data.cell.height / 2 - 1;

          doc.addImage(rupeeImg, 'PNG', x, y, 1.7, 1.7);
        }
      }
    });

    if (typeof (doc as any).putTotalPages === 'function') {
      (doc as any).putTotalPages(totalPagesExp);
    }

    if (printorpdf === 'Pdf') {
      doc.save(`${reportName ?? 'report'}.pdf`);
    }

    if (printorpdf === 'Print') {
      this.setiFrameForPrint(doc);
    }
  }


  setiFrameForPrint(doc: any) {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = doc.output('bloburl');
    document.body.appendChild(iframe);
    iframe.contentWindow?.print();
  }
  GetSubscriberJvListReport(fromdate: string, todate: string, pmodeoftransaction: string, tablename: string): Observable<any> {
    const params = new HttpParams()
      .set('fromdate', fromdate)
      .set('todate', todate)
      .set('pmodeoftransaction', pmodeoftransaction)
      .set('tablename', tablename)
      .set('BranchSchema', this._CommonService.getschemaname());

    return this._CommonService.getAPI('/Accounting/AccountingReports/GetSubscriberJvListDetails', params, 'YES');
  }
  GetSubscriberJvListReportGroup(fromdate: string, todate: string, pmodeoftransaction: string, tablename: string): Observable<any> {
    const params = new HttpParams()
      .set('fromdate', fromdate)
      .set('todate', todate)
      .set('pmodeoftransaction', pmodeoftransaction)
      .set('tablename', tablename)
      .set('BranchSchema', this._CommonService.getschemaname());

    return this._CommonService.getAPI('/Accounting/AccountingReports/GetSubscriberJvListDetailsGroup', params, 'YES');
  }
  // GetFormNameDetails(): Observable<any> {
  //   const params = new HttpParams()
  //     .set('BranchSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI('/Accounting/AccountingReports/GetFormNameDetails', params, 'YES');
  // }
  GetFormNameDetails(): Observable<any> {
    const params = new HttpParams()
      .set('globalSchema', this._CommonService.getschemaname())
      .set('companyCode', this._CommonService.getCompanyCode())
      .set('BranchCode', this._CommonService.getBranchCode());

    return this._CommonService.getAPI('/Accounts/Getformnamedetails', params, 'YES');
  }
  // GetTransTypeDetails(formname: string): Observable<any> {
  //   const params = new HttpParams()
  //     .set('formname', formname)
  //     .set('BranchSchema', this._CommonService.getschemaname());

  //   return this._CommonService.getAPI('/Accounting/AccountingReports/GetTrnastype', params, 'YES');
  // }
  GetTransTypeDetails(formname: string, BranchSchema: any, GlobalSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    const params = new HttpParams()
      .set('formname', formname)
      .set('BranchSchema', BranchSchema)
      .set('GlobalSchema', GlobalSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode);

    return this._CommonService.getAPI('/Accounts/GetTrnastype', params, 'YES');
  }
  GetChitReceiptCancelbyId(paymentId: string | number): Observable<any> {
    const params = new HttpParams()
      .set('paymentId', paymentId.toString())
      .set('LocalSchema', this._CommonService.getschemaname());

    return this._CommonService.getAPI('/AccountingTransactions/GetChitReceiptCancelReportData', params, 'YES');
  }
  GetSubscriberRemovalReport(transactionNo: string | number): Observable<any> {
    const params = new HttpParams()
      .set('TransactionNo', transactionNo.toString())
      .set('localSchema', this._CommonService.getschemaname());

    return this._CommonService.getAPI('/ChitTransactions/ChitReports/getSubscriberRemovalReport', params, 'YES');
  }
  GetBrsStatementsReport(brstype: string, fromdate: string, todate: string, bankname: string): Observable<any> {
    const params = new HttpParams()
      .set('brstype', brstype)
      .set('fromdate', fromdate)
      .set('todate', todate)
      .set('bankname', bankname)
      .set('BranchSchema', this._CommonService.getschemaname());

    return this._CommonService.getAPI('/Accounting/AccountingReports/GetBrsStatementsReport', params, 'YES');
  }
  getChitAdvanceReport(fromdate: string, todate: string, branchschema: string, caoschema: string): Observable<any> {
    const params = new HttpParams()
      .set('fromdate', fromdate)
      .set('todate', todate)
      .set('branchschema', branchschema)
      .set('caoschema', caoschema)
      .set('globalSchema', this._CommonService.globalschema);

    return this._CommonService.getAPI('/ChitTransactions/ChitReports/getChitAdvanceReport', params, 'YES');
  }
  GetChitAdvanceReceipts(fromdate: string, todate: string, localschema: string): Observable<any> {
    const params = new HttpParams()
      .set('fromdate', fromdate)
      .set('todate', todate)
      .set('schemaName', localschema);

    return this._CommonService.getAPI('/ChitTransactions/GetChitAdvanceReceipts', params, 'YES');
  }
  _CompletedGroupDetailsPdf(
    reportName: string,
    gridData: any[],
    gridheaders: any[],
    colWidthHeight: any,
    pagetype: any,
    betweenorason: string,
    fromdate: string,
    todate: string,
    printorpdf: string,
    doc: any
  ) {
    const address = this._CommonService.getcompanyaddress();
    const company = this._CommonService._getCompanyDetails();
    const today = this._CommonService.pdfProperties('Date');
    const logo = this._CommonService.getKapilGroupLogo();
    const currencyformat = this._CommonService.currencysymbol;
    const totalPagesExp = '{total_pages_count_string}';
    const startpage = doc.internal.getNumberOfPages();

    doc.autoTable({
      columns: gridheaders,
      body: gridData,
      startY: 48,
      theme: 'grid',
      didDrawPage: (data: any) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFont(undefined, 'normal');

        if (doc.internal.getNumberOfPages() === startpage) {
          doc.addImage(logo, 'JPEG', 10, 15, 20, 20);
          doc.setFontSize(15);
          doc.text(company?.pCompanyName ?? '', 60, 20);
          doc.setFontSize(10);
          doc.text(address, 40, 27);
          doc.setFontSize(14);
          doc.text(reportName, 90, 42);
          doc.line(10, 53, pageWidth - 10, 53);
        }

        let page = 'Page ' + doc.internal.getNumberOfPages();
        if (typeof doc.putTotalPages === 'function') page += ' of ' + totalPagesExp;
      },
      didDrawCell: (data: any) => {
        if ((data.column.index === 1 || data.column.index === 4) &&
          data.cell.section === 'body' &&
          data.cell.raw !== 0 &&
          currencyformat === '₹') {

          const img = this._CommonService._getRupeeSymbol();
          const textPos = data.cell.textPos;
          doc.addImage(img, textPos.x - data.cell.contentWidth, textPos.y + 0.5, 1.7, 1.7);
        }
      }
    });

    if (typeof doc.putTotalPages === 'function') doc.putTotalPages(totalPagesExp);
  }
  getChitAdvanceIntrestReport(
    fromdate: string,
    todate: string,
    caoschema: string,
    branchschema: string,
    schemename: string,
    chequeintype: string
  ): Observable<any> {
    const params = new HttpParams()
      .set('fromdate', fromdate)
      .set('todate', todate)
      .set('caoschema', caoschema)
      .set('branchschema', branchschema)
      .set('globalSchema', this._CommonService.globalschema)
      .set('schemename', schemename)
      .set('chequeintype', chequeintype);

    return this._CommonService.getAPI('/ChitTransactions/ChitReports/getChitAdvanceInterestReport', params, 'YES');
  }
  GetBPOInwardOutwardStatus(
    fromdate: string,
    todate: string,
    groupcode: string,
    ticketno: string,
    branchschema: string,
    loginschema: string
  ): Observable<any> {
    const params = new HttpParams()
      .set('fromdate', fromdate)
      .set('todate', todate)
      .set('branchschema', branchschema)
      .set('globalSchema', this._CommonService.globalschema)
      .set('loginschema', loginschema)
      .set('groupcode', groupcode)
      .set('ticketno', ticketno);

    return this._CommonService.getAPI('/Verification/GetBPOInwardOutwardStatus', params, 'YES');
  }
  getbporeferenceid(branchschema: string): Observable<any> {
    const params = new HttpParams().set('branchschema', branchschema);
    return this._CommonService.getAPI('/ChitTransactions/ChitReports/getbporeferenceid', params, 'YES');
  }
  Outwardchequesinfo(
    fromdate: string,
    todate: string,
    groupcode: string,
    ticketno: string,
    formname: string,
    branchschema: string,
    localschema: string
  ): Observable<any> {
    const params = new HttpParams()
      .set('fromdate', fromdate)
      .set('todate', todate)
      .set('branchschema', branchschema)
      .set('localschema', localschema)
      .set('groupcode', groupcode)
      .set('ticketno', ticketno)
      .set('formname', formname);

    return this._CommonService.getAPI('/Verification/GetOutwardCheques', params, 'YES');
  }
  getRemovedchitagreementDetilas(TransactionNo: string | number): Observable<any> {
    const params = new HttpParams()
      .set('localSchema', this._CommonService.getschemaname())
      .set('TransactionNo', TransactionNo.toString());

    return this._CommonService.getAPI('/ChitTransactions/ChitReports/getRemovedchitagreementDetilas', params, 'YES');
  }
  UpdateScheduleid(userId: string | number, asondate: string): Observable<any> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('asondate', asondate)
      .set('branchschema', this._CommonService.getschemaname());

    return this._CommonService.getAPI('/ChitTransactions/ChitReports/UpdateScheduleid', params, 'YES');
  }
  GetReceiptsandPayments(
    fromdate: string,
    todate: string,
    groupcode: string,
    branchschema: string,
    userid: string | number
  ): Observable<any> {
    const params = new HttpParams()
      .set('userId', userid.toString())
      .set('fromdate', fromdate)
      .set('todate', todate)
      .set('branchschema', branchschema)
      .set('groupcode', groupcode);

    return this._CommonService.getAPI('/ChitTransactions/ChitReports/GetReceiptsandPayments', params, 'YES');
  }
  GetReceiptsandPaymentsExtractCode(
    fromdate: string,
    todate: string,
    groupcode: string,
    branchschema: string,
    userid: string | number,
    extractcode: string
  ): Observable<any> {
    const params = new HttpParams()
      .set('userId', userid.toString())
      .set('fromdate', fromdate)
      .set('todate', todate)
      .set('branchschema', branchschema)
      .set('groupcode', groupcode)
      .set('extractcode', extractcode);

    return this._CommonService.getAPI('/ChitTransactions/ChitReports/GetReceiptsandPaymentsExtractCodes', params, 'YES');
  }
  getLegalCellTransfer(
    fromdate: string,
    todate: string,
    BranchSchema: string,
    localschema: string
  ): Observable<any> {
    const params = new HttpParams()
      .set('fromdate', fromdate)
      .set('todate', todate)
      .set('BranchSchema', BranchSchema)
      .set('localschema', localschema);

    return this._CommonService.getAPI('/Verification/GetLegalcellTransferMemoReport', params, 'YES');
  }
  GetBalances(fromdate: string, todate: string, grouptype: string, formname: string): Observable<any> {
    const params = new HttpParams()
      .set('formname', formname)
      .set('fromDate', fromdate)
      .set('todate', todate)
      .set('GroupType', grouptype)
      .set('LocalSchema', this._CommonService.getschemaname());

    return this._CommonService.getAPI('/Accounting/AccountingReports/GetBalances', params, 'YES');
  }
  GetBPOInwardOutwardSummary(branchschema: string, fromdate: string, todate: string): Observable<any> {
    const params = new HttpParams()
      .set('branchschema', branchschema)
      .set('fromdate', fromdate)
      .set('todate', todate);

    return this._CommonService.getAPI('/Verification/GetBPOInwardOutwardSummary', params, 'YES');
  }
  getCrystalReportsAPIdetails(branchschema: string, fromdate: string, todate: string): Observable<any> {
    const params = new HttpParams()
      .set('branchschema', branchschema)
      .set('fromdate', fromdate)
      .set('todate', todate);

    return this._CommonService.getAPI('/Verification/GetBPOInwardOutwardSummary', params, 'YES');
  }
  GetVerificationChargesReceiptslist(BranchSchema: string, CAOSchema: string): Observable<any> {
    const params = new HttpParams()
      .set('BranchSchema', BranchSchema)
      .set('CAOSchema', CAOSchema);

    return this._CommonService.getAPI('/ChitTransactions/GetVerificationChargesReceiptslist', params, 'YES');
  }




  //bank book servies



  GetBankEntriesDetails(fromdate: string, todate: string, pbankname: any) {
    throw new Error('Method not implemented.');
  }


  //   GetBankNames():Observable<any> {
  //     try {

  //  const params = new HttpParams().set('BranchSchema', this._CommonService.getschemaname());
  //       return this._CommonService.getAPI('/Accounting/AccountingReports/GetBankNames', params, 'YES');
  //     }
  //     catch (e:any) {
  //        this._CommonService.showErrorMessage(e);
  //     }
  //   }

  // GetBankNames(): Observable<any> {
  //   let params = new HttpParams().set('BranchSchema', this._CommonService.getschemaname());

  //   return this._CommonService
  //     .getAPI('/Accounting/AccountingReports/GetBankNames', params, 'YES')
  //     .pipe(
  //       catchError((e:any) => {
  //         this._CommonService.showErrorMessage(e);
  //         return throwError(() => e);
  //       })
  //     );
  // }

  // GetBankNames(branchSchema: any,
  //   branchName: any,
  //   companyCode: any,
  //   branchCode: any): Observable<any> {
  //     debugger;
  //   let params = new HttpParams()
  //     .set('BranchSchema', branchSchema)
  //     .set('BranchName', branchName)
  //     .set('CompanyCode', companyCode)
  //     .set('BranchCode', branchCode);

  //   return this._CommonService
  //     .getAPI('/Accounts/BankNames', params, 'YES')
  //     .pipe(
  //       catchError((e: any) => {
  //         this._CommonService.showErrorMessage(e);
  //         return throwError(() => e);
  //       })
  //     );
  // }



  GetBankNames(GlobalSchema: any, AccountsSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {
    debugger;
    const params = new HttpParams()
      .set('GlobalSchema', GlobalSchema)
      .set('AccountsSchema', AccountsSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/GetBankNames', params, 'YES');
  }
  // GetBankBookReportbyDates(FromDate: string | number | boolean, ToDate: string | number | boolean, _pBankAccountId: string | number | boolean): Observable<any> {

  //   let params = new HttpParams().set('FromDate', FromDate).set('ToDate', ToDate).set('_pBankAccountId', _pBankAccountId).set('BranchSchema', this._CommonService.getschemaname());
  //   return this._CommonService.getAPI('/Accounting/AccountingReports/GetBankBookDetails', params, 'YES')
  //     .pipe(
  //       catchError((e: any) => {
  //         this._CommonService.showErrorMessage(e);
  //         return throwError(() => e);
  //       })
  //     );
  // }
  GetBankBookReportbyDates(FromDate: string | number | boolean, ToDate: string | number | boolean, _pBankAccountId: string | number | boolean, GlobalSchema: any, AccountsSchema: any, CompanyCode: any, BranchCode: any): Observable<any> {

    let params = new HttpParams().set('FromDate', FromDate).set('ToDate', ToDate).set('_pBankAccountId', _pBankAccountId).set('BranchSchema', this._CommonService.getschemaname()).set('GlobalSchema', GlobalSchema)
      .set('AccountsSchema', AccountsSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode);;
    return this._CommonService.getAPI('/Accounts/GetBankBookDetails', params, 'YES')
      .pipe(
        catchError((e: any) => {
          this._CommonService.showErrorMessage(e);
          return throwError(() => e);
        })
      );
  }
  // GetBrsReportBankDebitsBankCredits(fromdate: string | number | boolean, todate: string | number | boolean, bankid: string | number | boolean, transtype: string | number | boolean, branchschema: any): Observable<any> {

  //   let params = new HttpParams().set('fromdate', fromdate).set('todate', todate).set('bankid', bankid).set('transtype', transtype).set('branchschema', this._CommonService.getschemaname());
  //   return this._CommonService.getAPI('/ChitTransactions/ChitReports/GetBrsReportBankDebitsBankCredits', params, 'YES')

  //     .pipe(
  //       catchError((e: any) => {
  //         this._CommonService.showErrorMessage(e);
  //         return throwError(() => e);
  //       })
  //     );
  // }
  GetBrsReportBankDebitsBankCredits(fromdate: string | number | boolean, todate: string | number | boolean, bankid: string | number | boolean, transtype: string | number | boolean, branchschema: any, GlobalSchema: any, Branchcode: any, companycode: any): Observable<any> {

    let params = new HttpParams().set('fromdate', fromdate).set('todate', todate).set('bankid', bankid).set('transtype', transtype).set('branchschema', branchschema).set('GlobalSchema', GlobalSchema).set('Branchcode', Branchcode).set('companycode', companycode);
    return this._CommonService.getAPI('/Accounts/GetBrsReportBankDebitsBankCredits', params, 'YES')

      .pipe(
        catchError((e: any) => {
          this._CommonService.showErrorMessage(e);
          return throwError(() => e);
        })
      );
  }
  // GetBankEntriesDetails2(fromDate: string|null, toDate: string|null, branchName: string, ReportType: string): Observable<any> {

  //   let params = new HttpParams()
  //     .set('FromDate', fromDate || '')
  //     .set('ToDate', toDate || '')
  //     .set('BranchSchema', this._CommonService.getschemaname()).set('ReportType', ReportType || 'S').set('BranchSchema', this._CommonService.getschemaname());

  //   if (branchName) {
  //     params = params.set('BranchName', branchName);
  //   }

  //   return this._CommonService.getAPI(
  //     '/Accounting/AccountingReports/GetBankEntriesDetails',
  //     params,
  //     'YES'
  //   )
  //     .pipe(
  //       catchError((e: any) => {
  //         this._CommonService.showErrorMessage(e);
  //         return throwError(() => e);
  //       })
  //     );
  // }
  GetBankEntriesDetails2(fromDate: string | null, toDate: string | null, branchName: string, ReportType: string): Observable<any> {

    let params = new HttpParams()
      .set('fromDate', fromDate || '')
      .set('toDate', toDate || '')
      .set('branchname', this._CommonService.getbranchname()).set('ReportType', ReportType || 'S').set('GlobalSchema', this._CommonService.getschemaname()).set('companycode', this._CommonService.getCompanyCode()).set('branchcode', this._CommonService.getBranchCode());

    if (branchName) {
      params = params.set('BranchName', branchName);
    }

    return this._CommonService.getAPI(
      '/Accounts/GetBankEntriesDetails',
      params,
      'YES'
    )
      .pipe(
        catchError((e: any) => {
          this._CommonService.showErrorMessage(e);
          return throwError(() => e);
        })
      );
  }





  //brs statment







  GetBrStatementReportbyDates(fromdate: string | number | boolean, pBankAccountId: string | number | boolean): Observable<any> {

    let params = new HttpParams().set('fromdate', fromdate).set('_pBankAccountId', pBankAccountId).set('BranchSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/Accounting/AccountingReports/GetBrs', params, 'YES').pipe(
      catchError((e: any) => {
        this._CommonService.showErrorMessage(e);
        return throwError(() => e);
      })
    );
  }
  GetBrStatementReportbyDatesChequesInfo(fromdate: string | number | boolean, todate: string | number | boolean, pBankAccountId: string | number | boolean): Observable<any> {


    const params = new HttpParams().set('fromdate', fromdate).set('todate', todate).set('_pBankAccountId', pBankAccountId).set('BranchSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/Accounting/AccountingReports/GetBrStatementReportbyDatesChequesInfo', params, 'YES').pipe(
      catchError((e: any) => {
        this._CommonService.showErrorMessage(e);
        return throwError(() => e);
      })
    );
  }
  GetBRSBankbalance(fromdate: string | number | boolean, pBankAccountId: string | number | boolean): Observable<any> {

    const params = new HttpParams().set('fromdate', fromdate).set('_pBankAccountId', pBankAccountId).set('BranchSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/Accounting/AccountingReports/GetBrsBankBalance', params, 'YES').pipe(
      catchError((e: any) => {
        this._CommonService.showErrorMessage(e);
        return throwError(() => e);
      })
    );
  }

  Getbrscount(brsdate: string | number | boolean, _pBankAccountId: string | number | boolean, BranchSchema: string | number | boolean): Observable<any> {

    const params = new HttpParams().set('brsdate', brsdate).set('_pBankAccountId', _pBankAccountId).set('BranchSchema', BranchSchema);
    return this._CommonService.getAPI('/Accounting/AccountingReports/Getbrscount', params, 'YES').pipe(
      catchError((e: any) => {
        this._CommonService.showErrorMessage(e);
        return throwError(() => e);
      })
    );
  }
  saveBRS(brsData: any) {

    return this._CommonService.postAPI('/Accounting/AccountingReports/SaveBrs', brsData)
  }




  //subscriber jv



  GetAccountHeads(trantype: any, accountheadname: any) {
    const params = new HttpParams().set('BranchSchema', this._CommonService.getschemaname()).set("accounttype", trantype).set('accountheadname', accountheadname);
    return this._CommonService.getAPI('/ChitTransactions/GetSubscriberJVAccountHeads', params, 'Yes');

  }

  GetPartyDetails() {
    const params = new HttpParams().set('BranchSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/AccountingTransactions/GetPartyList', params, 'Yes');

  }

  GetPartyDetailsByGroup(group: any) {
    const params = new HttpParams().set('BranchSchema', this._CommonService.getschemaname())
      .set('subledger', group);
    return this._CommonService.getAPI('/AccountingTransactions/GetPartyListByGroup', params, 'Yes');

  }

  GetSubcategories(accountheadid: any, chitgroupid: any, ticketno: any, accountid: any, accountheadtype: any, subcategoryname: any) {
    const params = new HttpParams().set('BranchSchema', this._CommonService.getschemaname())
      .set('accountheadid', accountheadid)
      .set('chitgroupid', chitgroupid)
      .set('ticketno', ticketno)
      .set('accountid', accountid)
      .set('accountheadtype', accountheadtype)
      .set('subcategoryname', subcategoryname);
    return this._CommonService.getAPI('/ChitTransactions/GetSubscriberJVSubcategory', params, 'YES');
  }
  GetTDSSubcategoryDetails(subcategoryID: any, partyid: any) {
    debugger;
    const params = new HttpParams().set('BranchSchema', this._CommonService.getschemaname())
      .set('subcategoryId', subcategoryID)
      .set('partyId', partyid);
    return this._CommonService.getAPI('/ChitTransactions/GetTDSSubcategoryDetails', params, 'YES');
  }

  GetdebitchitCheckbalance(BranchSchema: any, accountheadId: any, subcategory: any, subcategoryId: any, GlobalSchema: any, companyCode: any, branchCode: any) {
    const params = new HttpParams().set('BranchSchema', BranchSchema)
      .set('accountheadId', accountheadId)
      .set('subcategory', subcategory)
      .set('subcategoryId', subcategoryId).set('GlobalSchema', GlobalSchema).set('companyCode', companyCode).set('branchCode', branchCode);
    return this._CommonService.getAPI('/Accounts/SubscriberJVCheckbalance', params, 'YES');
  }

  PartyStatusChecking(accounthead: any, subcategory: any) {
    const params = new HttpParams().set('BranchSchema', this._CommonService.getschemaname())
      .set('accounthead', accounthead)
      .set('subcategory', subcategory)
    return this._CommonService.getAPI('/ChitTransactions/PartyStatusChecking', params, 'YES');
  }

  saveChitReceipt(data: any) {
    return this._CommonService.postAPI('/ChitTransactions/SaveSubscriberJV', data)
  }

  saveSubscriberVoucher(data: any) {
    return this._CommonService.postAPI('/ChitTransactions/SaveSubscriberVoucher', data)
  }

  getSubscriberJVReport(jvnumber: any) {
    const params = new HttpParams().set('localSchema', this._CommonService.getschemaname())
      .set('jvnumber', jvnumber);
    return this._CommonService.getAPI('/ChitTransactions/ChitReports/getSubscriberJVReport', params, 'YES');
  }
  getSubscriberJVReportForLegal(jvnumber: any, localSchema: any) {
    const params = new HttpParams().set('localSchema', localSchema)
      .set('jvnumber', jvnumber);
    return this._CommonService.getAPI('/ChitTransactions/ChitReports/getSubscriberJVReport', params, 'YES');
  }
  // Removal Filing Date by Ramakanth : 02-10-2021


  getRemovalFilingDetails(fromdate: any, todate: any, localschema: any, branchschema: any) {
    const params = new HttpParams().set("BranchSchema", branchschema).set('fromdate', fromdate).set('todate', todate).set('Localschema', localschema);
    return this._CommonService.getAPI('/ChitTransactions/GetSubscriberRemovalFilingDetails', params, 'YES');;
  }
  saveRemovalFilingDate(sremovaldata: any) {
    return this._CommonService.postAPI('/ChitTransactions/SaveSubscriberRemovalFiling', sremovaldata)
  }




  //brs statement service


  // GetBrStatementReportByDates(
  //   fromDate: string,
  //   bankAccountId: number
  // ): Observable<any> {

  //   const params = new HttpParams({
  //     fromObject: {
  //       fromdate: fromDate,
  //       _pBankAccountId: bankAccountId.toString(),
  //       BranchSchema: this._commonService.getschemaname()
  //     }
  //   });

  //   return this._commonService.getAPI(
  //     '/Accounting/AccountingReports/GetBrs',
  //     params,
  //     'YES'
  //   );
  // }
  GetBrStatementReportByDates(
    fromdate: string,
    _pBankAccountId: number,
    BranchSchema: any,
    branchCode: any,
    companyCode: any,
    GlobalSchema: any
  ): Observable<any> {

    const params = new HttpParams({
      fromObject: {
        fromdate: fromdate,
        _pBankAccountId: _pBankAccountId,
        BranchSchema: BranchSchema,
        branchCode: branchCode,
        companyCode: companyCode,
        GlobalSchema: GlobalSchema
      }
    });

    return this._CommonService.getAPI(
      '/Accounts/GetBrs',
      params,
      'YES'
    );
  }
  // GetBrStatementReportByDatesChequesInfo(
  //   fromDate: string,
  //   toDate: string,
  //   bankAccountId: number
  // ): Observable<any> {

  //   const params = new HttpParams({
  //     fromObject: {
  //       fromdate: fromDate,
  //       todate: toDate,
  //       _pBankAccountId: bankAccountId.toString(),
  //       BranchSchema: this._commonService.getschemaname()
  //     }
  //   });

  //   return this._commonService.getAPI(
  //     '/Accounting/AccountingReports/GetBrStatementReportbyDatesChequesInfo',
  //     params,
  //     'YES'
  //   );
  // }

  GetBrStatementReportByDatesChequesInfo(
    fromDate: string,
    toDate: string,
    bankAccountId: number,
    BranchSchema: any,
    GlobalSchema: any,
    BranchCode: any,
    CompanyCode: any
  ): Observable<any> {

    const params = new HttpParams({
      fromObject: {
        fromdate: fromDate,
        todate: toDate,
        pBankAccountId: bankAccountId.toString(),
        BranchSchema: BranchSchema,
        GlobalSchema: GlobalSchema,
        BranchCode: BranchCode,
        CompanyCode: CompanyCode
      }
    });

    return this._CommonService.getAPI(
      '/Accounts/GetBrStatementReportbyDatesChequesInfo',
      params,
      'YES'
    );
  }
  GetBrsBankBalance(
    fromDate: string,
    bankAccountId: number
  ): Observable<any> {

    const params = new HttpParams({
      fromObject: {
        fromdate: fromDate,
        _pBankAccountId: bankAccountId.toString(),
        BranchSchema: this._CommonService.getschemaname()
      }
    });

    return this._CommonService.getAPI(
      '/Accounting/AccountingReports/GetBrsBankBalance',
      params,
      'YES'
    );
  }
  GetBrsCount(
    brsDate: string,
    bankAccountId: number,
    branchSchema: string
  ): Observable<any> {

    const params = new HttpParams({
      fromObject: {
        brsdate: brsDate,
        _pBankAccountId: bankAccountId.toString(),
        BranchSchema: branchSchema
      }
    });

    return this._CommonService.getAPI(
      '/Accounting/AccountingReports/Getbrscount',
      params,
      'YES'
    );
  }
  SaveBrs(brsData: any): Observable<any> {
    return this._CommonService.postAPI(
      '/Accounts/AccountingReports/SaveBrs',
      brsData
    );
  }


  //chit transcation service




  // getBranchesByCAO(BranchSchema: string, Caoname: string) {

  //   const params = new HttpParams()
  //     .set('BranchSchema', BranchSchema)
  //     .set('Caoname', Caoname);

  //   return this._commonService.getAPI(
  //     '/ChitTransactions/ChitReports/getBranchesByCAO',
  //     params,
  //     'YES'
  //   );
  // }

  getKGMSBranchList(LocalSchema: string) {

    const params = new HttpParams().set('BranchSchema', LocalSchema);

    return this._CommonService.getAPI(
      '/ChitTransactions/getKGMSBranchesList',
      params,
      'YES'
    );
  }
  getPaytmAutoreceiptCount(branchcode: any, OfflineSchema: any, trdate: any) {
    const params = new HttpParams().set('OfflineSchema', OfflineSchema).set('branchcode', branchcode).set('trdate', trdate);
    return this._CommonService.getAPI('/ChitTransactions/getPaytmAutoreceiptCount', params, 'YES');
  }


  updatestatuspatm(transactiondate: any): any {
    try {
      debugger;
      const params = new HttpParams().set('transactiondate', transactiondate);
      return this._CommonService.getAPI('/ChitTransactions/updatestatuspatm', params, 'YES');
    }
    catch (errormssg) {
      this._CommonService.showErrorMessage(errormssg);
    }
  }



  updatestatusCashfree(transactiondate: any): any {
    try {
      debugger;
      const params = new HttpParams().set('transactiondate', transactiondate);
      return this._CommonService.getAPI('/ChitTransactions/updatestatuscashfree', params, 'YES');
    }
    catch (errormssg) {
      this._CommonService.showErrorMessage(errormssg);
    }
  }



  gettransations(OfflineSchema: any, transactiondate: any): any {
    try {
      //let params =this._commonService.getschemaname()
      let params = new HttpParams().set('OfflineSchema', OfflineSchema).set('caoname', this._CommonService.getbranchname()).set('transactiondate', transactiondate)
      return this._CommonService.getAPI('/ChitTransactions/GetSQLonlinetransactions', params, 'YES')
    }
    catch (errormssg) {
      this._CommonService.showErrorMessage(errormssg);
    }
  }



  getpaytmautoreceipt(fromdate: any, globalschema: any): any {
    try {
      debugger;
      //let params =this._commonService.getschemaname()
      let params = new HttpParams().set('strdate', fromdate).set('BranchSchema', this._CommonService.getschemaname()).set('GLOBAL', globalschema)
      return this._CommonService.getAPI('/ChitTransactions/paytmautoreceipt', params, 'YES')
    }
    catch (errormssg) {
      this._CommonService.showErrorMessage(errormssg);
    }
  }
  // getCAOpendingtrasferlist(
  //   BranchSchema: string,
  //   Caoschema: string,
  //   ptypeofpayment: string
  // ) {

  //   const params = new HttpParams()
  //     .set('BranchSchema', BranchSchema)
  //     .set('Caoschema', Caoschema)
  //     .set('ptypeofpayment', ptypeofpayment);

  //   return this._commonService.getAPI(
  //     '/ChitTransactions/ChitReports/GetPendingTransferDetails',
  //     params,
  //     'YES'
  //   );
  // }
  getCAOpendingtrasferlist(
    BranchSchema: string,
    Caoschema: string,
    ptypeofpayment: string,
    CompanyCode: any,
    BranchCode: any,
    GlobalSchema: any
  ) {

    const params = new HttpParams()
      .set('BranchSchema', BranchSchema)
      .set('Caoschema', Caoschema)
      .set('ptypeofpayment', ptypeofpayment)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode)
      .set('GlobalSchema', GlobalSchema);

    return this._CommonService.getAPI(
      '/Accounts/GetPendingTransferDetails',
      params,
      'YES'
    );
  }
  // getCAOBranchlist(BranchSchema: any){
  //   const params = new HttpParams().set('BranchSchema', BranchSchema);
  //   return this._commonService.getAPI('/ChitTransactions/ChitReports/getCAOBranches', params, 'YES');
  // }
  getCAOBranchlist(BranchSchema: any, GlobalSchema: any, CompanyCode: any, BranchCode: any) {
    const params = new HttpParams().set('BranchSchema', BranchSchema).set('GlobalSchema', GlobalSchema).set('CompanyCode', CompanyCode).set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/GetCAOBranchList', params, 'YES');
  }
  GetkgmsCollectionReport(
    CAOSchema: string,
    Branchschema: string,
    fromdate: string,
    todate: string,
    ReportType: string
  ): Observable<any> {
    const params = new HttpParams()
      .set('CAOSchema', CAOSchema)
      .set('Branchschema', Branchschema)
      .set('fromdate', fromdate)
      .set('todate', todate)
      .set('ReportType', ReportType);

    return this.http.get<any>('/ChitTransactions/GetkgmsCollectionReport', { params })
      .pipe(
        catchError((err) => {
          this._CommonService.showErrorMessage(err);
          return throwError(() => err); // RxJS 7+ syntax
        })
      );
  }



  //subscriber balance services



  _downloadPending_transferinReportsPdf(
    reportName: string,
    gridData: any[],
    gridheaders: any[],
    colWidthHeight: any,
    pagetype: any,
    printorpdf: string,
    branchname: string,
    typeofpaymentforreport: string
  ) {
    const address = this._CommonService.getcompanyaddress();
    const Companyreportdetails = this._CommonService._getCompanyDetails();
    const doc = new jsPDF(pagetype);
    const totalPagesExp = '{total_pages_count_string}';
    const today = this._CommonService.pdfProperties("Date");
    const currencyformat = this._CommonService.currencysymbol;
    const kapil_logo = this._CommonService.getKapilGroupLogo();
    const rupeeImage = this._CommonService._getRupeeSymbol();

    let lMargin = 15;
    let rMargin = 15;
    let pdfInMM = 0;

    (doc as any).autoTable({
      head: [gridheaders],
      body: gridData,
      theme: 'grid',
      headStyles: {
        fillColor: this._CommonService.pdfProperties("Header Color"),
        halign: this._CommonService.pdfProperties("Header Alignment"),
        fontSize: this._CommonService.pdfProperties("Header Fontsize")
      },
      styles: {
        cellWidth: 'wrap',
        fontSize: this._CommonService.pdfProperties("Cell Fontsize"),
        rowPageBreak: 'avoid',
        overflow: 'linebreak'
      },
      columnStyles: colWidthHeight,
      startY: 48,
      margins: { left: 10 },
      showHead: 'everyPage',
      showFoot: 'lastPage',

      didDrawPage: (data: any) => {
        const pageSize = doc.internal.pageSize;
        const pageWidth = pageSize.width ?? pageSize.getWidth();
        const pageHeight = pageSize.height ?? pageSize.getHeight();

        doc.setFont("helvetica", "normal");

        if ((doc as any).internal.getNumberOfPages() === 1) {
          doc.setFontSize(15);

          if (pagetype === "a4") {
            if (kapil_logo) doc.addImage(kapil_logo, 'JPEG', 10, 5, 20, 20);

            doc.setTextColor('black');
            doc.text(Companyreportdetails?.pCompanyName ?? '', 60, 10);
            doc.setFontSize(8);

            if (reportName === 'Pending Transfer In') {
              doc.text(address, pageWidth / 2, 17, { align: 'center' });
            } else {
              doc.text(address, 70, 17, { align: 'left' });
            }

            if (Companyreportdetails?.pCinNo ?? '') {
              doc.text('CIN : ' + Companyreportdetails.pCinNo, 75, 22);
            }

            doc.setFontSize(14);
            doc.text(reportName, reportName === 'Pending Transfer In' ? 75 : 85, 32);

            doc.setFontSize(10);
            doc.text('Branch : ' + branchname, 163, 42);
            doc.text('Type of Payment : ' + typeofpaymentforreport, 10, 42);

            pdfInMM = 233;
            doc.setDrawColor(0, 0, 0);
            doc.line(10, 45, (pdfInMM - lMargin - rMargin), 45);
          }

          if (pagetype === "landscape") {
            if (kapil_logo) doc.addImage(kapil_logo, 'JPEG', 10, 5, 20, 20);

            doc.setTextColor('black');
            doc.text(Companyreportdetails?.pCompanyName ?? '', 110, 10);
            doc.setFontSize(10);
            doc.text(address, 80, 15, { align: 'left' });

            if (Companyreportdetails?.pCinNo ?? '') {
              doc.text('CIN : ' + Companyreportdetails.pCinNo, 125, 20);
            }

            doc.setFontSize(14);
            doc.text(reportName, 130, 30);
            doc.setFontSize(10);
            doc.text('Branch : ' + branchname, 235, 40);

            pdfInMM = 315;
            doc.setDrawColor(0, 0, 0);
            doc.line(10, 45, (pdfInMM - lMargin - rMargin), 45);
          }
        } else {
          data.settings.margin.top = 20;
          data.settings.margin.bottom = 20;
        }

        const page = `Page ${(doc as any).internal.getNumberOfPages()}${typeof doc.putTotalPages === 'function' ? ' of ' + totalPagesExp : ''}`;

        doc.line(5, pageHeight - 10, (pdfInMM - lMargin - rMargin), pageHeight - 10);
        doc.setFontSize(10);
        doc.text("Printed on : " + today, data.settings.margin.left, pageHeight - 5);
        doc.text(page, pageWidth - data.settings.margin.right - 20, pageHeight - 5);
      },

      willDrawCell: (data: any) => {
        if (data.row.index === gridData.length - 1) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
        }
      },

      didDrawCell: (data: any) => {
        if (data.column.index === 11 && data.cell.section === 'body') {
          const td = data.cell.raw;
          if (td && currencyformat === "₹") {
            const textPos = (data.cell as any).textPos;
            doc.setFont("helvetica", "normal");
            doc.addImage(rupeeImage, textPos.x - data.cell.contentWidth, textPos.y + 0.5, 1.5, 1.5);
          }
        }
      }
    });

    if (typeof doc.putTotalPages === 'function') {
      doc.putTotalPages(totalPagesExp);
    }

    if (printorpdf === "Pdf") {
      doc.save(reportName + '.pdf');
    }

    if (printorpdf === "Print") {
      this._CommonService.setiFrameForPrint(doc);
    }
  }








  //tds service






  getTdsReport(
    fromDate: string,
    toDate: string,
    sectionName: string
  ): Observable<any> {

    const params = new HttpParams()
      .set('FromDate', fromDate)
      .set('ToDate', toDate)
      .set('SectionName', sectionName);

    return this._CommonService.getAPI('/TDS/GetTdsReportDetails', params, 'YES');
  }
  //   getTdsSectionDetails(): Observable<any> {
  //   return this.commonService
  //     .getAPI('/Tds/getTdsSectionNo', '', 'NO')
  //     .pipe(
  //       catchError((error: any) => {
  //         this.commonService.showErrorMessage(error);
  //         return of(null);
  //       })
  //     );
  // }
  getTdsSectionDetails(globalSchema: any, companyCode: any, branchCode: any): Observable<any> {
    const params = new HttpParams()
      .set('globalSchema', globalSchema)
      .set('companyCode', companyCode)
      .set('branchCode', branchCode);
    return this._CommonService
      .getAPI('/Accounts/GetTdsSectionNo', params, 'YES')
      .pipe(
        catchError((error: any) => {
          this._CommonService.showErrorMessage(error);
          return of(null);
        })
      );
  }





  //tds report services




  public getTDSSectionDetails(GlobalSchema: any, CompanyCode: any, BranchCode: any) {
    const params = new HttpParams()
      .set('GlobalSchema', GlobalSchema)
      .set('CompanyCode', CompanyCode)
      .set('BranchCode', BranchCode);
    return this._CommonService.getAPI('/Accounts/GetTDSSectionDetails', params, 'YES');
  }


  public getTDSReportDetails(localSchema: any, sectionid: any, fromdate: any, todate: any, grouptype: any, reporttype: any) {
    const params = new HttpParams().set("localSchema", localSchema).set("sectionid", sectionid).set("fromdate", fromdate).set("todate", todate).set("grouptype", grouptype).set("reporttype", reporttype);
    return this._CommonService.getAPI('/ChitTransactions/ChitReports/getTDSReportDetails', params, 'YES');
  }

  public getTDSReportDiffDetails(localSchema: any, sectionid: any, fromdate: any, todate: any) {
    const params = new HttpParams().set("localSchema", localSchema).set("sectionid", sectionid).set("fromdate", fromdate).set("todate", todate);
    return this._CommonService.getAPI('/ChitTransactions/ChitReports/getTDSReportDiffDetails', params, 'YES');
  }

  // getGstReportDetails(fromdate:any, todate:any, reporttype:any,ledgername:any) :any{
  //   try {
  //     const params = new HttpParams().set('localSchema', this._commonservice.getschemaname()).set('fromdate', fromdate).set('todate', todate).set('reporttype', reporttype).set('ledgername', ledgername);
  //     return this._commonservice.getAPI('/ChitTransactions/ChitReports/getGstReport', params, 'YES');
  //   }
  //   catch (errormssg:any) {
  //     this._commonservice.showErrorMessage(errormssg);
  //   }
  // }
  getGstReportDetails(localSchema: any, fromdate: any, todate: any, reporttype: any, ledgername: any, GlobalSchema: any, branchcode: any, companycode: any): any {
    try {
      const params = new HttpParams().set('localSchema', localSchema).set('fromdate', fromdate).set('todate', todate).set('reporttype', reporttype).set('ledgername', ledgername).set('GlobalSchema', GlobalSchema).set('branchcode', branchcode).set('companycode', companycode);
      return this._CommonService.getAPI('/Accounts/getGstReport1', params, 'YES');
    }
    catch (errormssg: any) {
      this._CommonService.showErrorMessage(errormssg);
    }
  }
  // public exportAsExcelFile(json: any[], excelFileName: string): void {

  //   const myworksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(json);
  //   const myworkbook: XLSX.WorkBook = { Sheets: { 'data': myworksheet }, SheetNames: ['data'] };
  //   const excelBuffer: any = XLSX.write(myworkbook, { bookType: 'xlsx', type: 'array' });
  //   this.saveAsExcelFile(excelBuffer, excelFileName);
  // }

  // private saveAsExcelFile(buffer: any, fileName: string): void {
  //   const data: Blob = new Blob([buffer], {
  //     type: EXCEL_TYPE
  //   });
  //   FileSaver.saveAs(data, fileName + '_Excel'+ EXCEL_EXTENSION);
  // }
  Getgstreport(accountsSchema: any, fromdate: any, todate: any, globalSchema: any, CompanyName: any, BranchCode: any): any {
    try {
      // const params = new HttpParams().set('Branchschema',Branchschema).set('fromdate', fromdate).set('todate', todate);
      // return this._commonservice.getAPI('/ChitTransactions/Getgstreport', params, 'YES');
      const params = new HttpParams().set('accountsSchema', accountsSchema).set('fromdate', fromdate).set('todate', todate).set('globalSchema', globalSchema).set('CompanyName', CompanyName).set('BranchCode', BranchCode);
      return this._CommonService.getAPI('/Accounts/Getgstreport', params, 'YES');
    }
    catch (errormssg: any) {
      this._CommonService.showErrorMessage(errormssg);
    }
  }




  downloadKgmsOutwardReportsData(
    reportName: string,
    gridData: any[],
    gridheaders: any[],
    colWidthHeight: any,
    pagetype: 'a4' | 'landscape',
    printorpdf: 'Pdf' | 'Print',
    fromdate: string,
    todate: string,
    betweenorason: string
  ) {

    const Companyreportdetails = this._CommonService._getCompanyDetails();
    const address = this._CommonService.getcompanyaddress();

    const doc = new jsPDF({
      orientation: pagetype === 'landscape' ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const totalPagesExp = '{total_pages_count_string}';

    const today = this._CommonService.pdfProperties("Date");

    const kapil_logo = this._CommonService.getKapilGroupLogo();
    const currencyformat = this._CommonService.currencysymbol;
    const rupeeImage = this._CommonService._getRupeeSymbol();

    const lMargin = 15;
    const rMargin = 15;

    let pdfInMM: number;

    autoTable(doc, {

      head: [gridheaders],
      body: gridData,

      bodyStyles: {
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0]
      },

      theme: 'grid',

      headStyles: {
        fillColor: this._CommonService.pdfProperties("Header Color"),
        halign: this._CommonService.pdfProperties("Header Alignment") as 'center',
        fontSize: 10
        // Number(this._CommonService.pdfProperties("Header Fontsize"))
      },

      styles: {
        cellPadding: 1,
        fontSize: 10,
        // Number(this._CommonService.pdfProperties("Cell Fontsize")),
        cellWidth: 'wrap',
        overflow: 'linebreak'
      },

      margin: { left: 10 },

      columnStyles: colWidthHeight,

      startY: 48,

      showHead: 'everyPage',
      showFoot: 'lastPage',

      didDrawPage: (data) => {

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setFont('Times', 'normal');

        if (doc.getNumberOfPages() === 1) {

          doc.setFontSize(15);

          if (pagetype === 'a4') {

            doc.addImage(kapil_logo, 'JPEG', 10, 5, 20, 20);

            doc.setTextColor('black');

            doc.text(
              Companyreportdetails.companyName,
              pageWidth / 2,
              10,
              { align: 'center' }
            );

            doc.setFontSize(8);

            const address1 = address.substr(0, 115);
            const address2 = address.substring(115);

            // doc.text(address1, pageWidth / 2, 15, { align: 'center' });
            doc.text(Companyreportdetails.registrationAddress, pageWidth / 2, 18, { align: 'center' });

            if (Companyreportdetails.cinNumber) {
              doc.text(
                'CIN : ' + Companyreportdetails.cinNumber,
                pageWidth / 2,
                22,
                { align: 'center' }
              );
            }

            doc.setFontSize(14);

            doc.text(reportName, pageWidth / 2, 30, { align: 'center' });

            doc.setFontSize(10);

            doc.text(
              'Branch : ' + Companyreportdetails.branchName,
              pageWidth - 10,
              40,
              { align: 'right' }
            );

            if (betweenorason === "Between") {
              doc.text(`Between : ${fromdate} And ${todate}`, 15, 40);
            }

            if (betweenorason === "As On" && fromdate) {
              doc.text(`As on : ${fromdate}`, 15, 40);
            }

            pdfInMM = 233;

            doc.line(
              10,
              45,
              (pdfInMM - lMargin - rMargin),
              45
            );
          }

          if (pagetype === 'landscape') {

            doc.addImage(kapil_logo, 'JPEG', 20, 5, 20, 20);

            doc.text(
              Companyreportdetails.companyName,
              pageWidth / 2,
              10,
              { align: 'center' }
            );

            doc.setFontSize(10);

            const address1 = address.substr(0, 150);

            doc.text(Companyreportdetails.registrationAddress, pageWidth / 2, 15, { align: 'center' });

            if (Companyreportdetails.cinNumber) {
              doc.text(
                'CIN : ' + Companyreportdetails.cinNumber,
                pageWidth / 2,
                20,
                { align: 'center' }
              );
            }

            doc.setFontSize(14);

            doc.text(reportName, pageWidth / 2, 30, { align: 'center' });

            doc.setFontSize(10);

            doc.text(
              'Branch : ' + Companyreportdetails.branchName,
              pageWidth - 10,
              40,
              { align: 'right' }
            );

            if (betweenorason === "Between") {
              doc.text(`Between : ${fromdate} And ${todate}`, 15, 40);
            }

            if (betweenorason === "As On" && fromdate) {
              doc.text(`As on : ${fromdate}`, 15, 40);
            }

            pdfInMM = 315;

            doc.line(
              10,
              45,
              (pdfInMM - lMargin - rMargin),
              45
            );
          }

        } else {

          data.settings.margin.top = 20;
          data.settings.margin.bottom = 15;

        }

        let page = "Page " + doc.getNumberOfPages();

        if (typeof doc.putTotalPages === 'function') {
          page += ' of ' + totalPagesExp;
        }

        doc.line(
          5,
          pageHeight - 10,
          (pdfInMM - lMargin - rMargin),
          pageHeight - 10
        );

        doc.setFontSize(10);

        doc.text(
          "Printed on : " + today,
          data.settings.margin.left - 5,
          pageHeight - 5
        );

        doc.text(
          page,
          pageWidth - data.settings.margin.right - 20,
          pageHeight - 5
        );

      }

    });

    if (typeof doc.putTotalPages === 'function') {
      doc.putTotalPages(totalPagesExp);
    }

    if (printorpdf === "Pdf") {
      doc.save(reportName + '.pdf');
    }

    if (printorpdf === "Print") {
      this._CommonService.setiFrameForPrint(doc);
    }

  }





}

