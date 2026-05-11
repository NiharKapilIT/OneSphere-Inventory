import { ChangeDetectorRef, Component, OnInit, signal, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { PageCriteria } from '../../../../core/models/pagecriteria';

@Component({
  selector: 'app-journal-voucher-view',
  standalone: true,
  imports: [TableModule, CurrencyPipe, RouterLink, ButtonModule],
  templateUrl: './journal-voucher-view.html',
})
export class JournalVoucherView implements OnInit {

  public Journalvoucherlist: any[] = [];
  public pageSize = 10;
  public skip = 0;
  private data: Object[] = [];
  public gridData: any;
  public gridView: any;
  currencySymbol: any;
  filteredData: any[] = [];
  columnsWithSearch: string[] = [];
  rowsPerPageOptions: number[] = [10, 20, 50];
  readonly totalRows = signal<number>(0);



  public headerCells: any = { textAlign: 'center' };
  pageCriteria: PageCriteria;

  @ViewChild('dt') myTable!: Table;

  constructor(
    private _commonService: CommonService,
    private _AccountingTransactionsService: AccountsTransactions,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.pageCriteria = new PageCriteria();
  }

  ngOnInit(): void {
    this.getLoadData();
    //this.setPageModel();
    this.currencySymbol = this._commonService.currencysymbol;
  }

  getLoadData(): void {
    this._AccountingTransactionsService.GetJournalVoucherData(
      this._commonService.getbranchname(),
      this._commonService.getCompanyCode(),
      this._commonService.getBranchCode()
    ).subscribe({
      next: (json: any) => {
        console.log(json, "json");

        if (json != null) {
          this.gridData = json;
          this.gridView = json;
          // this.Journalvoucherlist = this.gridData;
//           this.Journalvoucherlist = [
//             ...this.gridData,
//  jvDate: this._commonService.getFormatDateGlobal(
//               gridData.jvDate 
//             ),
//           ];

this.Journalvoucherlist = this.gridData.map((item: any) => ({
  ...item,
  jvDate: this._commonService.getFormatDateGlobal(item.jvDate)
}));


          this.pageCriteria.totalrows = this.gridData.length;
          this.pageCriteria.TotalPages = 1;

          if (this.pageCriteria.totalrows > this.pageCriteria.pageSize) {
            this.pageCriteria.TotalPages =
              parseInt((this.pageCriteria.totalrows / this.pageCriteria.pageSize).toString()) + 1;
          }

          this.pageCriteria.currentPageRows =
            this.gridData.length < this.pageSize
              ? this.gridData.length
              : this.pageSize;

          // this.filteredData = this.gridView;
          this.filteredData = [...this.gridView];
          this.columnsWithSearch = Object.keys(this.gridView[0]);
          this.setPageModel();
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        this._commonService.showErrorMessage(error);
      }
    });
  }

  // setPageModel(): void {
  //   this.pageCriteria.pageSize = this._commonService.pageSize;
  //   this.pageCriteria.offset = 0;
  //   this.pageCriteria.pageNumber = 1;
  //   this.pageCriteria.footerPageHeight = 50;
  // }

  private setPageModel(): void {
    this.rowsPerPageOptions = this._commonService.setPageModel(
      this.pageCriteria,
      this.Journalvoucherlist.length
    );
  }

  onFooterPageChange(event: any): void {
    this.pageCriteria.offset = event.page - 1;
    this.pageCriteria.currentPageRows =
      this.pageCriteria.totalrows < event.page * this.pageSize
        ? this.pageCriteria.totalrows % this.pageSize
        : this.pageSize;
  }

  viewHandler(event: any, row: any): void {
    const receipt = btoa(row.journalVoucherNo + ',' + 'Journal Voucher');
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/journal-voucher', receipt])
    );
    window.open(url, '_blank');
  }

  filterDatatable(event: any): void {
    const filter = event.target.value.toLowerCase().trim();

    this.Journalvoucherlist = this.filteredData.filter((item: any) => {
      if (!filter) return true;

      return this.columnsWithSearch.some((column: string) => {
        const colValue = item[column];
        return (
          colValue !== null &&
          colValue !== undefined &&
          colValue.toString().toLowerCase().includes(filter)
        );
      });
    });
  }
}