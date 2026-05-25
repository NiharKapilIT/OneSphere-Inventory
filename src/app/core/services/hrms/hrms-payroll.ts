import { HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { CommonService } from "../Common/common.service";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@angular/common";

@Injectable({
  providedIn: 'root',
})
export class HrmsPayroll {
  private _CommonService      = inject(CommonService);
  GetCalendarYear(): Observable<any> {
    const params = new HttpParams().set('GlobalSchema', this._CommonService.getschemaname()).set('CompanyName', this._CommonService.getCompanyCode());

    return this._CommonService.getAPI('/HRMSTransactions/GetCalendarYear', params, 'YES');

  }
  GetCalendarYearMonthAuthorized(CalendarId: any, employeecontactId: any): Observable<any> {

    const params = new HttpParams().set('GlobalSchema', this._CommonService.getschemaname()).set('BranchSchema', this._CommonService.getbranchname()).set('CalendarId', CalendarId).set('EmpContactId', employeecontactId).set('CompanyName', this._CommonService.getCompanyCode());

    return this._CommonService.getAPI('/HRMSTransactions/GetCalendarYearMonthAuthorised', params, 'YES');

  }
  GetJVDetails(emplyoeeCode:any, monthYear:any, jvType:any): Observable<any> {
    const params = new HttpParams().set('Branchschema', this._CommonService.getbranchname()).set('EmployeeCode', emplyoeeCode).set('MonthYear', monthYear).set('JVType', jvType).set('CompanyName',this._CommonService.getCompanyCode()).set('GlobalSchema', this._CommonService.getschemaname());
    return this._CommonService.getAPI('/HRMSTransactions/GetJVDetailsByType', params, 'YES');
  }
  GetJVDetailsDuplicateCheck(monthYear:any, jvType:any): Observable<any> {
    const params = new HttpParams().set('Branchschema', this._CommonService.getschemaname()).set('MonthYear', monthYear).set('JVType', jvType);
    return this._CommonService.getAPI('/HRMSTransactions/GetJVDetailsDuplicateCheck', params, 'YES');
  }
  SaveJVDetails(data:any):any {
    try {
      debugger
      return this._CommonService.postAPI("/HRMSTransactions/SaveJVDetails", data)
    }
    catch (errormssg) {
      this._CommonService.showErrorMessage(errormssg);
    }
  }




  //   getdesignations() {

  //   try {
  //     return this._CommonService.getAPI('/Common/GetDesignations', '', 'NO');
  //   }
  //   catch (e) {
  //     this._CommonService.showErrorMessage(e);
  //   }
  // }
  
  
  _downloadjvdetailsPdf(
    reportName:     string,
    gridData:       any[][],
    gridHeaders:    string[],
    colWidthHeight: Record<number, { cellWidth: string; halign: string }>,
    pageType:       'a4' | 'landscape',
    betweenOrAsOn:  string,
    fromDate:       string,
    toDate:         string,
    printOrPdf:     'Pdf' | 'Print'
  ): void {
    const address            = this._CommonService.getcompanyaddress();
    const companyDetails     = this._CommonService._getCompanyDetails();
    const currencyFormat     = this._CommonService.currencysymbol;
    const kapilLogo          = this._CommonService.getKapilGroupLogo();
    const rupeeImage         = this._CommonService._getRupeeSymbol();
    const today              = formatDate(new Date(), 'dd-MMM-yyyy  h:mm:ss a', 'en-IN');
    const totalPagesExp      = '{total_pages_count_string}';

    const isLandscape = pageType === 'landscape';
    const doc         = new jsPDF(isLandscape ? 'landscape' : 'portrait');

    const lMargin  = 15;
    const rMargin  = 15;
    const pdfInMM  = isLandscape ? 315 : 233;

    autoTable(doc, {
      columns:  gridHeaders,
      body:     gridData,
      theme:    'grid',
      startY:   55,
      showHead: 'everyPage',
      showFoot: 'lastPage',
      rowPageBreak:  'avoid',

      headStyles: {
        fillColor: this._CommonService.pdfProperties('Header Color'),
        halign:    this._CommonService.pdfProperties('Header Alignment') as 'center',
        fontSize:  Number(this._CommonService.pdfProperties('Header Fontsize')),
      },

      styles: {
        cellPadding:   1,
        fontSize:      Number(this._CommonService.pdfProperties('Cell Fontsize')),
        cellWidth:     'wrap',
        overflow:      'linebreak',
      },

      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left'  },
        1: { cellWidth: 'auto', halign: 'right' },
        2: { cellWidth: 'auto', halign: 'right' },
        3: { cellWidth: 'auto', halign: 'right' },
      },

      didDrawPage: (data) => {
        const pageSize   = doc.internal.pageSize;
        const pageWidth  = pageSize.width  ?? pageSize.getWidth();
        const pageHeight = pageSize.height ?? pageSize.getHeight();
        const isFirstPage = doc.getNumberOfPages() === 1;

        if (isFirstPage) {
          this.drawPageHeader(
            doc, companyDetails, address, reportName,
            betweenOrAsOn, fromDate, toDate,
            kapilLogo, isLandscape, pdfInMM, lMargin, rMargin
          );
        } else {
          data.settings.margin.top    = 20;
          data.settings.margin.bottom = 15;
        }

        // footer
        const lineY   = pageHeight - 10;
        const footerY = pageHeight - 5;
        let pageLabel = `Page ${doc.getNumberOfPages()}`;
        if (typeof (doc as any).putTotalPages === 'function') {
          pageLabel += ` of ${totalPagesExp}`;
        }

        doc.line(5, lineY, pdfInMM - lMargin - rMargin, lineY);
        doc.setFontSize(10);
        doc.text(`Printed on : ${today}`, data.settings.margin.left, footerY);
        doc.text(pageLabel, pageWidth - data.settings.margin.right - 20, footerY);
      },

      willDrawCell: (data) => {
        if (data.row.index === gridData.length - 1) {
          doc.setFont('helvetica', 'bold');
        }
      },

      didDrawCell: (data) => {
        const isAmountCol = [1, 2, 3].includes(data.column.index);
        if (isAmountCol && data.cell.section === 'body' && data.cell.raw !== 0) {
          if (currencyFormat === '₹') {
            // const { x, y } = data.cell.textPos;
            // doc.setFont('helvetica', 'normal');
            // doc.addImage(rupeeImage, x - data.cell.contentWidth, y + 0.5, 1.5, 1.5);
            const x = data.cell.x + data.cell.padding('left');
const y = data.cell.y + data.cell.padding('top');
doc.addImage(rupeeImage, x - data.cell.contentWidth, y + 0.5, 1.5, 1.5);
          }
        }
      },
    });

    if (typeof (doc as any).putTotalPages === 'function') {
      (doc as any).putTotalPages(totalPagesExp);
    }

    if (printOrPdf === 'Pdf') {
      doc.save(`${reportName}.pdf`);
    } else {
      this._CommonService.setiFrameForPrint(doc);
    }
  }

  private drawPageHeader(
    doc:            jsPDF,
    companyDetails: any,
    address:        string,
    reportName:     string,
    betweenOrAsOn:  string,
    fromDate:       string,
    toDate:         string,
    kapilLogo:      string,
    isLandscape:    boolean,
    pdfInMM:        number,
    lMargin:        number,
    rMargin:        number
  ): void {
    const logoX        = isLandscape ? 20  : 10;
    const companyNameX = isLandscape ? 110 : 60;
    const addressX     = isLandscape ? 80  : 40;
    const cinX         = isLandscape ? 125 : 85;
    const reportNameX  = isLandscape ? 130 : 65;
    const branchX      = isLandscape ? 235 : 163;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(15);
    doc.addImage(kapilLogo, 'JPEG', logoX, 15, 20, 20);

    doc.setTextColor('black');
    doc.text(companyDetails.pCompanyName, companyNameX, 20);

    doc.setFontSize(8);
    doc.text(address, addressX, 27, { align: 'left' });

    if (companyDetails.pCinNo) {
      doc.text(`CIN : ${companyDetails.pCinNo}`, cinX, 32);
    }

    doc.setFontSize(14);
    doc.text(reportName, reportNameX, 42);

    doc.setFontSize(10);
    doc.text(`Branch : ${companyDetails.pBranchname}`, branchX, 50);

    if (betweenOrAsOn === 'Between') {
      doc.text(`Between : ${fromDate}  And  ${toDate}`, 15, 50);
    } else if (betweenOrAsOn === 'As On' && fromDate) {
      doc.text(`As on : ${fromDate}`, 15, 50);
    }

    doc.setDrawColor(0, 0, 0);
    doc.line(10, 52, pdfInMM - lMargin - rMargin, 52);
  }
//  constructor(private http: HttpClient, private _CommonService: CommonService) { }



  getPolicyEmployeeDetails(GlobalSchema: any, CompanyCode: any, BranchSchema: any, BranchId: any): Observable<any> {
    const params = new HttpParams().set('GlobalSchema', GlobalSchema) .set('CompanyCode', CompanyCode).set('BranchSchema', BranchSchema)
     .set('BranchId', BranchId);
    return this._CommonService.getAPI('/Accounts/getPolicyEmployeeDetails', params, 'YES');
  }
    


    SavePolicyDetails(data: any) {
    return this._CommonService.postAPI('/Accounts/SavePolicyDetails', data);
  }


  getDesignation(): Observable<any[]> {
  return this._CommonService.getAPI('/Common/GetDesignation?GlobalSchema=global', '', 'NO');
}
  
//  getEmployees(GlobalSchema: any, CompanyName: any, searchtype: any, BranchId: any, BranchSchema: any,sscagendatype: any): Observable<any> {
//     const params = new HttpParams().set('GlobalSchema', GlobalSchema) .set('CompanyName', CompanyName).set('searchtype', searchtype)
//      .set('BranchId', BranchId).set('BranchSchema', BranchSchema).set('sscagendatype', sscagendatype);
//     return this._CommonService.getAPI('/HRMSTransactions/GetSSCAgendaEmployeeDetails', params, 'YES');
//   }

getEmployees(GlobalSchema: any, CompanyName: any, searchtype: any, BranchId: any, BranchSchema: any, sscagendatype: any): Observable<any> {
  const params = `GlobalSchema=${GlobalSchema}&CompanyName=${CompanyName}&searchtype=${searchtype}&BranchId=${BranchId}&BranchSchema=${BranchSchema}&sscagendatype=${sscagendatype}`;
  return this._CommonService.getAPI('/HRMSTransactions/GetSSCAgendaEmployeeDetails', params, 'YES');
}



  saveSscAgenda(data: any): Observable<any> {
  return this._CommonService.postAPI('/HRMSTransactions/api/Transactions/HRMSTransactions/SaveSscAgenda', data);
}
}




