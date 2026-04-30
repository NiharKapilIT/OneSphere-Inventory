import { Component, inject, signal } from "@angular/core";
import { TableModule } from "primeng/table";
import { PageCriteria } from "../../../../core/models/pagecriteria";
import { CommonService } from "../../../../core/services/Common/common.service";

@Component({
  selector: "app-company-config",
  imports: [TableModule],
  templateUrl: "./company-config.html",
})
export class CompanyConfig {
  selectedTab='companyConfiguration';
   gridData: any[] = [];
    pageCriteria: PageCriteria;
      pageSize = 10;
       page: any = {};
       startindex: any; endindex: any;
      //  companyshowgrid:boolean=true

          companyshowgrid = signal<boolean>(false);
          branchshowgrid = signal<boolean>(false);
        private readonly _commonService = inject(CommonService);
    constructor() {
    this.pageCriteria = new PageCriteria();
   
    }


  ngOnInit(): void {
    this.pageSetUp();
  }
   

     private pageSetUp() {
    this.page.offset = 0; this.page.pageNumber = 1;
    this.page.size = this._commonService.pageSize || 10;
    this.startindex = 0; this.endindex = this.page.size;
    this.page.totalElements = 0; this.page.totalPages = 1;
    this.pageCriteria.pageSize = this.page.size;
    this.pageCriteria.offset = 0;
  }
  companyConfiguration(){
  this.companyshowgrid.set(true);
  this.branchshowgrid.set(false);
  }
  branchConfiguration(){
    this.companyshowgrid.set(false);
    this.branchshowgrid.set(true);
  }
  userInfo(){
this.companyshowgrid.set(false);
this.branchshowgrid.set(false);
  }

}
