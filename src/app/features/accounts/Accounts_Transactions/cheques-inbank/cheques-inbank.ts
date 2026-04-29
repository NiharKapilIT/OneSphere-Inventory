import {
  Component, OnInit, Input, inject, signal,
  DestroyRef, ChangeDetectorRef, ChangeDetectionStrategy, NgZone
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import {
  FormBuilder, FormGroup, FormsModule,
  ReactiveFormsModule, Validators
} from '@angular/forms';
import { forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── PrimeNG DatePicker (replaces ngx-bootstrap bsDatepicker)
import { DatePickerModule } from 'primeng/datepicker';

import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import { PaginatorModule } from 'primeng/paginator';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { NgSelectModule } from '@ng-select/ng-select';
import { TableLazyLoadEvent } from 'primeng/table';
import { NumberToWordsPipe } from '../../../../shared/pipes/number-to-words-pipe';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { CommonService } from '../../../../core/services/Common/common.service';
import { PageCriteria } from '../../../../core/models/pagecriteria';

declare var $: any;
type AOA = any[][];

@Component({
  selector: 'app-cheques-in-bank',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule,
    // PrimeNG DatePicker – used in template as <p-datepicker>
    DatePickerModule,
    PaginatorModule,
    TableModule,
    CheckboxModule,
    ButtonModule,
    InputTextModule,
  ],
  templateUrl:'./cheques-inbank.html',
  providers: [DatePipe, NumberToWordsPipe, CurrencyPipe],
})
export class ChequesInbank implements OnInit {

  private readonly _accountingtransaction = inject(AccountsTransactions);
  private readonly fb = inject(FormBuilder);
  private readonly datepipe = inject(DatePipe);
  private readonly _commonService = inject(CommonService);
  private readonly _noticeservice = inject(AccountsTransactions);
  private readonly numbertowords = inject(NumberToWordsPipe);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);


  onChequeClearDateSelect(date: Date) {
    this.ChequesInBankForm.get('pchequecleardate')?.setValue(date);
  }



  @Input() fromFormName: any;

  gridLoading = signal(false);
  searchloading = signal(false);

  ChequesInBankForm!: FormGroup;
  BrsDateForm!: FormGroup;
  ChequesInBankValidation: any = {};

  currencyCode = 'INR';
  readonly printedOn: string = new Date().toISOString();
  rowHeight: number | 'auto' = 50;

  fromdate1: any; todate1: any;
  totalElements: number | undefined;
  startindex: any; endindex: any;
  selectedTab = 'all';
  tabsShowOrHideBasedOnfromFormName = false;

  BanksList: any[] = [];
  previewdetails: any[] = [];
  chequerwturnvoucherdetails: any[] = [];
  ChequesInBankData: any[] = [];
  _countData: any = {};
  gridData: any[] = [];
  filteredData: any[] = [];
  gridDatatemp: any[] = [];
  ChequesClearReturnData: any[] = [];
  DataForSaving: any[] = [];

  all: any; chequesdeposited: any; onlinereceipts: any;
  cleared: any; returned: any;
  amounttotal: any; Totlaamount: any;
  currencySymbol: any; bankbalancetype: any;
  bankdetails: any; bankid: any; datetitle: any;
  validate: any; bankname = ''; brsdate: any;
  bankbalancedetails: any; bankbalance: any;
  userBranchType: any;
  ChequesClearReturnDataBasedOnBrs: any;
  PopupData: any;
  chequenumber: any;
  status = ''; pdfstatus = 'All';
  buttonname = 'Save';
  disablesavebutton = false;
  hiddendate = true;
  banknameshowhide = false;
  brsdateshowhidecleared = false;
  brsdateshowhidereturned = false;
  validatebrsdateclear = false;
  validatebrsdatereturn = false;
  showicons = true;
  saveshowhide: any;
  showhidegridcolumns = false;
  showhidegridcolumns2 = false;
  modeofreceipt = '';
  _searchText = '';
  fromdate: any = ''; todate: any = '';
  preferdrows = false;
  chequeboxshoworhide = false;
  receiptmode = 'CH';
  schemaname: any;
  pageCriteria: PageCriteria;
  pageCriteria2: PageCriteria;
  pageSize = 10;
  disabletransactiondate = false;
  displayGridBasedOnFormName: boolean | undefined;
  displayGridDataBasedOnForm: any;
  displayGridDataBasedOnFormTemp: any;
  chequereturncharges: any;
  boolforAutoBrs = false;
  companydetails: any; roleid: any;
  selectedamt = 0;
  auto_brs_type_name = 'Upload';
  autoBsrGridData: any[] = [];
  autoBrsDuplicates: any[] = [];
  autoBrsData: any[] = [];
  page: any = {};
  activeTab = '';
  returnChargesInputValue = 250;
  returnChargesError = false;
  minimumReturnCharge = 250;
  saveAutoBrsBool = false;
  PreDefinedAutoBrsArrayData: any[] = [];
  Exceldata: any[] = [];
  data: AOA = [['Date', 'UTR Number', 'amount', 'referencetext', 'UTR type', 'Receipt type']];
  wopts: XLSX.WritingOptions = { bookType: 'xlsx', type: 'array' };
  fileName = 'AutoBrs.xlsx';
  //  chequeClearDateModel: Date = new Date();

  // brsFromDateModel: Date = new Date(new Date().setDate(new Date().getDate() - 1));
  // brsToDateModel: Date = new Date();
  // brsReturnFromDateModel: Date = new Date(new Date().setDate(new Date().getDate() - 1));
  // brsReturnToDateModel: Date = new Date();
  chequeClearDateModel: Date = new Date();
  brsFromDateModel: Date = new Date();
  brsToDateModel: Date = new Date();
  brsReturnFromDateModel: Date = new Date();
  brsReturnToDateModel: Date = new Date();
  showReturnModal = false;

  // ── today2: used as [maxDate] on all date pickers to prevent future date selection
  today2: Date = new Date();

  today: number = Date.now();
  todayDate: any;

  constructor() {
    this.pageCriteria = new PageCriteria();
    this.pageCriteria2 = new PageCriteria();
    if (this._commonService.comapnydetails != null)
      this.disabletransactiondate = this._commonService.comapnydetails.pdatepickerenablestatus;
  }



  ngOnInit(): void {
    this.showicons = true;
    this.rowHeight = Number(this.page?.rowHeight) || 50;
    this.pageSetUp();
    this.setPageModel2();
    this.userBranchType = sessionStorage.getItem('userBranchType');
    this.roleid = sessionStorage.getItem('roleid');
    this.companydetails = this._commonService.comapnydetails;
    this.boolforAutoBrs = this.companydetails?.pisautobrsimpsapplicable || false;
    this.currencySymbol = this._commonService.currencysymbol;

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // this.ChequesInBankForm = this.fb.group({
    //   ptransactiondate: [{ value: today, disabled: true }, Validators.required],
    //   pchequecleardate: [today, Validators.required],
    //   bankname: [null, Validators.required],
    //   pfrombrsdate: [yesterday],
    //   ptobrsdate: [today],
    //   pchequesOnHandlist: [],
    //   SearchClear: [''],
    //   schemaname: [this._commonService.getschemaname()],
    //   searchtext: [''],
    //   receipttype: ['Adjusted'],
    //   auto_brs_type: ['Upload']
    // });

    this.ChequesInBankForm = this.fb.group({
      ptransactiondate: [{ value: today, disabled: true }, Validators.required],
      pchequecleardate: [today, Validators.required],
      bankname: [null, Validators.required],
      pfrombrsdate: [today],
      ptobrsdate: [today],
      pchequesOnHandlist: [],
      SearchClear: [''],
      schemaname: [this._commonService.getschemaname()],
      searchtext: [''],
      receipttype: ['Adjusted'],
      auto_brs_type: ['Upload']
    });

    this.BrsDateForm = this.fb.group({
      frombrsdate: [today],
      tobrsdate: [today]
    });
    this.ChequesInBankForm.get('pchequecleardate')?.setValue(new Date());

    this.bankid = 0;
    this.banknameshowhide = false;
    this.ChequesInBankValidation = {};

    if (this.fromFormName === 'fromChequesStatusInformationForm') {
      this.tabsShowOrHideBasedOnfromFormName = false;
      this.displayGridBasedOnFormName = false;
      this.activeTab = 'cheques';
      this.modeofreceipt = 'ALL';
      this.status = 'all';
    } else {
      this.tabsShowOrHideBasedOnfromFormName = true;
      this.displayGridBasedOnFormName = true;
      this.activeTab = 'onlinereceipts';
      this.status = 'onlinereceipts';
      this.modeofreceipt = 'ALL';
      this.selectedTab = 'onlinereceipts';
    }

    this.GetBankList();
    this.GetBankBalance(this.bankid);
    this.getChequeReturnCharges();
    this.BlurEventAllControll(this.ChequesInBankForm);

    setTimeout(() => {
      this.ChequesInBankForm.get('pchequecleardate')?.setValue(new Date());
      this.cdr.markForCheck();
    }, 0);
  }
  private pageSetUp() {
    this.page.offset = 0; this.page.pageNumber = 1;
    this.page.size = this._commonService.pageSize || 10;
    this.startindex = 0; this.endindex = this.page.size;
    this.page.totalElements = 0; this.page.totalPages = 1;
    this.pageCriteria.pageSize = this.page.size;
    this.pageCriteria.offset = 0;
  }

  onFooterPageChange(event: { page?: number }): void {
    const currentPage = event.page ?? 1;
    this.pageCriteria.offset = currentPage - 1;
    this.pageCriteria.CurrentPage = currentPage;
    if (this.pageCriteria.totalrows < currentPage * this.pageCriteria.pageSize)
      this.pageCriteria.currentPageRows = this.pageCriteria.totalrows % this.pageCriteria.pageSize;
    else
      this.pageCriteria.currentPageRows = this.pageCriteria.pageSize;
    this.loadData(currentPage, this.pageCriteria.pageSize);
  }

  loadData(pageNumber: number, pageSize: number) {
    console.log(`Fetching data for page ${pageNumber}, page size ${pageSize}`);
  }

  loadPage(event: any) {
    const first = event.first ?? 0;
    const rows = event.rows ?? 10;
    this.page.size = rows;
    this.page.offset = Math.floor(first / rows);
    this.startindex = first;
    this.endindex = first + rows;
    this.preferdrows = false;
    if (this.fromdate !== '' && this.todate !== '')
      this.GetDataOnBrsDates1(this.fromdate, this.todate, this.bankid);
    else
      this.GetChequesInBankforSearchDeposit(
        this.bankid, this.startindex, this.endindex, this._searchText || '');
  }

  setPage(event: TableLazyLoadEvent) {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.page.size ?? 10;
    const page = Math.floor(first / rows);
    this.page.offset = page; this.page.size = rows; this.page.pageNumber = page + 1;
    this.pageCriteria.pageSize = rows; this.pageCriteria.offset = page;
    this.startindex = first; this.endindex = this.startindex + rows;
    this.preferdrows = false;
    if (this.fromdate !== '' && this.todate !== '')
      this.GetDataOnBrsDates1(this.fromdate, this.todate, this.bankid);
    else
      this.GetChequesInBankforSearchDeposit(
        this.bankid, this.startindex, this.endindex, this._searchText || '');
  }

  private setPageModel2() {
    this.pageCriteria2.pageSize = this._commonService.pageSize;
    this.pageCriteria2.offset = 0;
    this.pageCriteria2.pageNumber = 1;
    this.pageCriteria2.footerPageHeight = 50;
  }

  getCurrentPageTotal(dt: any): number {
    if (!dt) return 0;
    const allData: any[] = dt.filteredValue ?? dt._value ?? dt.value ?? [];
    if (!allData || allData.length === 0) return 0;
    const first: number = dt.first ?? 0;
    const rows: number = dt.rows ?? 10;
    const pageData = allData.slice(first, first + rows);
    return pageData.reduce((sum: number, c: any) => sum + (Number(c?.ptotalreceivedamount) || 0), 0);
  }

  // ── Bank ──────────────────────────────────────────────────────────────────────

  GetBankList() {
    const BranchSchema = this._commonService.getbranchname();
    const GlobalSchema = this._commonService.getschemaname();
    const CompanyCode = this._commonService.getCompanyCode();
    const BranchCode = this._commonService.getBranchCode();
    this._accountingtransaction.GetBankntList(BranchSchema, GlobalSchema, CompanyCode, BranchCode)
      .subscribe({
        next: (res: any) => {
          this.BanksList = res?.banklist || [];
          this.GetBankBalance(this.bankid);
        },
        error: (err: any) => {
          setTimeout(() => this._commonService.showErrorMessage(err));
          this.BanksList = [];
        }
      });
  }

  GetBankBalance(bankid: any) {
    try {
      const brsToDate = this._commonService.getFormatDateNormal(new Date());
      const BranchSchema = this._commonService.getbranchname();
      const branchCode = this._commonService.getBranchCode();
      const companyCode = this._commonService.getCompanyCode();
      this._accountingtransaction.GetBankBalance(brsToDate, bankid, BranchSchema, branchCode, companyCode)
        .subscribe({
          next: (res: any) => {
            if (res) {
              this.bankbalancedetails = res;
              this.fromdate1 = res.pfrombrsdate; this.todate1 = res.ptobrsdate;
              if (bankid == 0) {
                this.banknameshowhide = false; this.bankname = '';
                const total = (this.BanksList ?? [])
                  .reduce((s: number, b: any) => s + (b.pbankbalance ?? 0), 0);
                this.bankbalance = total === 0 ? 0 : Math.abs(total);
                this.bankbalancetype = total < 0 ? 'Cr' : total === 0 ? '' : 'Dr';
              } else {
                const sel = this.BanksList.find((b: any) => b.pbankid === bankid);
                const balance = sel?.pbankbalance ?? res?.pbankbalance ?? 0;
                this.bankbalance = balance === 0 ? 0 : Math.abs(balance);
                this.bankbalancetype = balance < 0 ? 'Cr' : balance === 0 ? '' : 'Dr';
              }
              const d = new Date();
              this.brsdate = d.getDate().toString().padStart(2, '0') + '-' +
                d.toLocaleString('en-US', { month: 'short' }) + '-' + d.getFullYear();
              this.pageSetUp();
              this.GetChequesInBankforSearchDeposit(this.bankid, this.startindex, this.endindex, '');
            } else {
              this.bankbalancedetails = {};
              this.bankbalance = 0;
              this.bankbalancetype = '';
              this.brsdate = '';
            }
          },
          error: (err: any) => setTimeout(() => this._commonService.showErrorMessage(err))
        });
    } catch (e: any) { this._commonService.showErrorMessage(e?.message || e); }
  }


  SelectBank(event: any) {
    if (!event) {
     
      this.bankid = 0;
      this.bankname = '';
      this.banknameshowhide = false;
      // Show validation message just like the reference component
      this.ChequesInBankValidation['bankname'] = 'Bank Name is Required';
      this.bankbalance = 0;
      this.bankbalancetype = '';
      const d = new Date();
      this.brsdate = d.getDate().toString().padStart(2, '0') + '-' +
        d.toLocaleString('en-US', { month: 'short' }) + '-' + d.getFullYear();
    } else {
      // ── Bank selected ──
      this.banknameshowhide = true;
      this.bankdetails = event;
      this.bankid = event.pbankid;
      this.bankname = event.pbankname;
      // Clear validation when a valid bank is chosen
      this.ChequesInBankValidation['bankname'] = '';
      const d = new Date();
      this.brsdate = d.getDate().toString().padStart(2, '0') + '-' +
        d.toLocaleString('en-US', { month: 'short' }) + '-' + d.getFullYear();
      this.bankbalance = event.pbankbalance === 0 ? 0 : Math.abs(event.pbankbalance);
      this.bankbalancetype = event.pbankbalance < 0 ? 'Cr' : event.pbankbalance === 0 ? '' : 'Dr';
    }
    this.pageSetUp();
    this.ChequesInBankForm?.get('SearchClear')?.setValue('');
    this._searchText = '';
    this.GetChequesInBankforSearchDeposit(this.bankid, this.startindex, this.endindex, '');
    this.cdr.markForCheck();
  }

  // ── Count badges ──────────────────────────────────────────────────────────────

  CountOfRecords() {
    this.all = this._countData['total_count'] || 0;
    this.onlinereceipts = this._countData['others_count'] || 0;
    this.chequesdeposited = this._countData['cheques_count'] || 0;
    this.cleared = this._countData['clear_count'] || 0;
    this.returned = this._countData['return_count'] || 0;
  }

  private _recalculateCountsForBank(): void {
    const onHand = this.bankid == 0
      ? [...this.ChequesInBankData]
      : this.ChequesInBankData.filter((d: any) => d?.pdepositbankid == this.bankid);

    const cr = this.bankid == 0
      ? [...this.ChequesClearReturnData]
      : this.ChequesClearReturnData.filter((d: any) => d?.pdepositbankid == this.bankid);

    this.all = onHand.length;
    this.chequesdeposited = onHand.filter((d: any) => d.ptypeofpayment === 'CHEQUE').length;
    this.onlinereceipts = onHand.filter((d: any) => d.ptypeofpayment !== 'CHEQUE').length;
    this.cleared = cr.filter((d: any) => d.pchequestatus === 'Y').length;
    this.returned = cr.filter((d: any) => d.pchequestatus === 'R').length;
  }

  // ── Tab filters ───────────────────────────────────────────────────────────────

  private _applyTabFilter() {
    if (this.status === 'all') this.All1();
    else if (this.status === 'chequesdeposited') this.ChequesDeposited1();
    else if (this.status === 'onlinereceipts') this.OnlineReceipts1();
    else if (this.status === 'cleared') this.Cleared1();
    else if (this.status === 'returned') this.Returned1();
    if (this.fromFormName === 'fromChequesStatusInformationForm') this.chequesStatusInfoGrid();
  }

  All() {
    this.gridData = []; this.gridDatatemp = []; this.amounttotal = 0;
    this.fromdate = ''; this.todate = ''; this.chequeboxshoworhide = true;
    this.fromFormName === 'fromChequesStatusInformationForm'
      ? this.GridColumnsHide() : this.GridColumnsShow();
    this.status = 'all'; this.pdfstatus = 'All'; this.modeofreceipt = 'ALL';
    this.pageSetUp();
    this.GetChequesInBankforSearchDeposit(this.bankid, this.startindex, this.endindex, '');
  }

  All1() {
    this.gridData = []; this.gridDatatemp = [];
    this.fromFormName === 'fromChequesStatusInformationForm'
      ? this.GridColumnsHide() : this.GridColumnsShow();
    this.status = 'all'; this.pdfstatus = 'All'; this.modeofreceipt = 'ALL';
    const grid = this.bankid == 0
      ? [...this.ChequesInBankData]
      : this.ChequesInBankData.filter((d: any) => d?.pdepositbankid == this.bankid);
    this.gridData = JSON.parse(JSON.stringify(grid));
    this.gridDatatemp = [...this.gridData];
    this.showicons = this.gridData.length > 0;
    this.amounttotal = this.gridData.reduce((s: number, c: any) => s + (c.ptotalreceivedamount || 0), 0);
    this.page.totalElements = this.gridData.length;
    this.page.totalPages = Math.ceil(this.gridData.length / (this.page.size || 10));
  }

  ChequesDeposited() {
    this.amounttotal = 0; this.fromdate = ''; this.todate = '';
    this.modeofreceipt = 'CHEQUE'; this.status = 'chequesdeposited';
    this.pdfstatus = 'Cheques Deposited'; this.chequeboxshoworhide = true;
    this.fromFormName === 'fromChequesStatusInformationForm'
      ? this.GridColumnsHide() : this.GridColumnsShow();
    this.pageSetUp();
    this.GetChequesInBankforSearchDeposit(
      this.bankid, this.startindex, this.endindex, this._searchText);
  }

  ChequesDeposited1() {
    this.modeofreceipt = 'CHEQUE'; this.gridData = []; this.gridDatatemp = [];
    this.fromFormName === 'fromChequesStatusInformationForm'
      ? this.GridColumnsHide() : this.GridColumnsShow();
    this.status = 'chequesdeposited'; this.pdfstatus = 'Cheques Deposited';
    const grid = this.bankid == 0
      ? this.ChequesInBankData.filter((d: any) => d.ptypeofpayment === 'CHEQUE')
      : this.ChequesInBankData.filter(
        (d: any) => d.ptypeofpayment === 'CHEQUE' && d.pdepositbankid == this.bankid);
    this.gridData = JSON.parse(JSON.stringify(grid));
    this.gridDatatemp = [...this.gridData];
    this.showicons = this.gridData.length > 0;
    this.amounttotal = this.gridData.reduce((s: number, c: any) => s + (c.ptotalreceivedamount || 0), 0);
    this.page.totalElements = this.gridData.length;
    this.page.totalPages = Math.ceil(this.gridData.length / (this.page.size || 10));
  }

  OnlineReceipts() {
    this.chequeboxshoworhide = true; this.amounttotal = 0;
    this.fromdate = ''; this.todate = '';
    this.pageSetUp(); this.gridData = []; this.gridDatatemp = [];
    this.fromFormName === 'fromChequesStatusInformationForm'
      ? this.GridColumnsHide() : this.GridColumnsShow();
    this.status = 'onlinereceipts'; this.pdfstatus = 'Online Receipts';
    this.modeofreceipt = 'ONLINE';
    this.GetChequesInBankforSearchDeposit(
      this.bankid, this.startindex, this.endindex, this._searchText);
  }

  OnlineReceipts1() {
    this.gridData = []; this.gridDatatemp = [];
    this.fromFormName === 'fromChequesStatusInformationForm'
      ? this.GridColumnsHide() : this.GridColumnsShow();
    this.status = 'onlinereceipts'; this.pdfstatus = 'Online Receipts';
    this.modeofreceipt = 'ONLINE';
    const grid = this.bankid == 0
      ? this.ChequesInBankData.filter((j: any) => j.ptypeofpayment !== 'CHEQUE')
      : this.ChequesInBankData.filter(
        (j: any) => j.ptypeofpayment !== 'CHEQUE' && j.pdepositbankid == this.bankid);
    this.gridData = JSON.parse(JSON.stringify(grid));
    this.gridDatatemp = [...this.gridData];
    this.showicons = this.gridData.length > 0;
    this.amounttotal = this.gridData.reduce((s: number, c: any) => s + (c.ptotalreceivedamount || 0), 0);
    this.page.totalElements = this.gridData.length;
    this.onlinereceipts = this.gridData.length;
    this.page.totalPages = Math.ceil(this.gridData.length / (this.page.size || 10));
  }

  Cleared() {
    this.chequeboxshoworhide = false; this.amounttotal = 0;
    this.fromdate = ''; this.todate = '';
    this.datetitle = 'Cleared Date'; this.gridData = []; this.gridDatatemp = [];
    this.GridColumnsHide(); this.brsdateshowhidecleared = true;
    this.brsdateshowhidereturned = false;
    this.status = 'cleared'; this.pdfstatus = 'Cleared'; this.modeofreceipt = 'CLEAR';
    this.pageSetUp();
    this.GetChequesInBankforSearchDeposit(
      this.bankid, this.startindex, this.endindex, this._searchText);
  }

  Cleared1() {
    this.datetitle = 'Cleared Date'; this.gridData = []; this.gridDatatemp = [];
    this.GridColumnsHide(); this.brsdateshowhidecleared = true;
    this.brsdateshowhidereturned = false;
    this.status = 'cleared'; this.pdfstatus = 'Cleared'; this.modeofreceipt = 'CLEAR';
    const grid = this.bankid == 0
      ? this.ChequesClearReturnData.filter((i: any) => i.pchequestatus == 'Y')
      : this.ChequesClearReturnData.filter(
        (i: any) => i.pchequestatus == 'Y' && i.pdepositbankid == this.bankid);
    this.gridData = JSON.parse(JSON.stringify(grid));
    this.gridDatatemp = [...this.gridData];
    this.showicons = this.gridData.length > 0;
    this.amounttotal = this.gridData.reduce((s: number, c: any) => s + (c.ptotalreceivedamount || 0), 0);
    this.page.totalElements = this.gridData.length;
    this.cleared = this.gridData.length;
    this.page.totalPages = Math.ceil(this.gridData.length / (this.page.size || 10));
  }

  Returned() {
    this.chequeboxshoworhide = false; this.amounttotal = 0;
    this.fromdate = ''; this.todate = '';
    this.datetitle = 'Returned Date'; this.gridData = []; this.gridDatatemp = [];
    this.GridColumnsHide(); this.brsdateshowhidecleared = false;
    this.brsdateshowhidereturned = true;
    this.status = 'returned'; this.pdfstatus = 'Returned'; this.modeofreceipt = 'RETURN';
    this.pageSetUp();
    this.GetChequesInBankforSearchDeposit(this.bankid, this.startindex, this.endindex, '');
  }

  Returned1() {
    this.datetitle = 'Returned Date'; this.gridData = []; this.gridDatatemp = [];
    this.GridColumnsHide(); this.brsdateshowhidecleared = false;
    this.brsdateshowhidereturned = true;
    this.status = 'returned'; this.pdfstatus = 'Returned'; this.modeofreceipt = 'RETURN';
    const grid = this.bankid == 0
      ? this.ChequesClearReturnData.filter((i: any) => i.pchequestatus == 'R')
      : this.ChequesClearReturnData.filter(
        (i: any) => i.pchequestatus == 'R' && i.pdepositbankid == this.bankid);
    this.gridData = JSON.parse(JSON.stringify(grid));
    this.gridDatatemp = [...this.gridData];
    this.showicons = this.gridData.length > 0;
    this.amounttotal = this.gridData.reduce(
      (s: number, c: any) => s + (c.ptotalreceivedamount || 0), 0);
    this.page.totalElements = this.gridData.length;
    this.returned = this.gridData.length;
    this.page.totalPages = Math.ceil(this.gridData.length / (this.page.size || 10));
  }

  GridColumnsShow() {
    this.showhidegridcolumns = false; this.showhidegridcolumns2 = false;
    this.saveshowhide = true; this.brsdateshowhidecleared = false;
    this.brsdateshowhidereturned = false; this.hiddendate = true;
  }

  GridColumnsHide() {
    this.showhidegridcolumns = true; this.showhidegridcolumns2 = true;
    this.saveshowhide = false; this.hiddendate = false;
  }

  // ── API calls ─────────────────────────────────────────────────────────────────

  GetChequesInBankforSearchDeposit(bankid: any, startindex: any, endindex: any, searchText: any) {
    this.gridLoading.set(true);

    const apiMode = 'ALL';

    const data$ = this._accountingtransaction.GetChequesInBankData(
      bankid, this._commonService.getschemaname(), this._commonService.getbranchname(),
      0, 99999, apiMode, searchText || '',
      this._commonService.getCompanyCode(), this._commonService.getBranchCode());

    const count$ = this._accountingtransaction.GetChequesRowCount(
      bankid, this._commonService.getschemaname(), this._commonService.getbranchname(),
      '', 'CHEQUESINBANK', apiMode,
      this._commonService.getCompanyCode(), this._commonService.getBranchCode());

    forkJoin([data$, count$]).subscribe({
      next: (data: any) => {
        this.ChequesInBankData = data[0]?.pchequesOnHandlist || [];
        const rawList = data[0]?.pchequesclearreturnlist;
        this.ChequesClearReturnData = Array.isArray(rawList)
          ? (Array.isArray(rawList[0]) ? rawList[0] : rawList) : [];
        this._countData = data[1];

        this._recalculateCountsForBank();

        this.page.totalElements = this.ChequesInBankData.length +
          this.ChequesClearReturnData.length;
        this.page.totalPages = Math.ceil(this.page.totalElements / (this.page.size || 10));
        this._applyTabFilter();
        setTimeout(() => {
          this.gridLoading.set(false);
          this.cdr.markForCheck();
        });
      },
      error: (err: any) => {
        setTimeout(() => {
          this.gridLoading.set(false);
          this.cdr.markForCheck();
          this._commonService.showErrorMessage(err);
        });
      }
    });
  }

  GetChequesInBank_load(bankid: any, modeofreceipt: string = this.modeofreceipt) {
    this.modeofreceipt = modeofreceipt;
    this.gridLoading.set(true);
    this.brsdateshowhidecleared = false;
    const apiMode = 'ALL';
    this._accountingtransaction.GetChequesInBankData(
      bankid, this._commonService.getschemaname(), this._commonService.getbranchname(),
      0, 99999, apiMode, '', this._commonService.getCompanyCode(), this._commonService.getBranchCode()
    ).subscribe({
      next: (data: any) => {
        this.ChequesInBankData = data?.pchequesOnHandlist || [];
        const rawList = data?.pchequesclearreturnlist;
        this.ChequesClearReturnData = Array.isArray(rawList)
          ? (Array.isArray(rawList[0]) ? rawList[0] : rawList) : [];
        this._recalculateCountsForBank();
        this._applyTabFilter();
        setTimeout(() => { this.gridLoading.set(false); this.cdr.markForCheck(); });
      },
      error: (err: any) => {
        setTimeout(() => {
          this.gridLoading.set(false);
          this.cdr.markForCheck();
          this._commonService.showErrorMessage(err);
        });
      }
    });
  }

  GetChequesInBank(bankid: any, startindex: any, endindex: any, searchText: string) {
    this.gridLoading.set(true);
    const apiMode = 'ALL';
    this._accountingtransaction.GetChequesInBankData(
      bankid, this._commonService.getschemaname(), this._commonService.getbranchname(),
      0, 99999, apiMode, searchText || '',
      this._commonService.getCompanyCode(), this._commonService.getBranchCode()
    ).subscribe({
      next: (data: any) => {
        this.ChequesInBankData = data?.pchequesOnHandlist || [];
        const rawList = data?.pchequesclearreturnlist;
        this.ChequesClearReturnData = Array.isArray(rawList)
          ? (Array.isArray(rawList[0]) ? rawList[0] : rawList) : [];
        this._recalculateCountsForBank();
        this._applyTabFilter();
        this.PreDefinedAutoBrsArrayData = [...this.gridData];
        setTimeout(() => { this.gridLoading.set(false); this.cdr.markForCheck(); });
      },
      error: (err: any) => {
        setTimeout(() => {
          this.gridLoading.set(false);
          this.cdr.markForCheck();
          this._commonService.showErrorMessage(err);
        });
      }
    });
  }

  GetDataOnBrsDates(frombrsdate: any, tobrsdate: any, bankid: any) {
    const data$ = this._accountingtransaction.DataFromBrsDatesChequesInBank(
      frombrsdate, tobrsdate, bankid, this.modeofreceipt, '0',
      this.startindex, this.endindex,
      this._commonService.getCompanyCode(), this._commonService.getBranchCode(),
      this._commonService.getschemaname());

    const count$ = this._accountingtransaction.GetChequesRowCount(
      this.bankid, this._commonService.getschemaname(), this._commonService.getbranchname(),
      this._searchText, 'CHEQUESINBANK', this.modeofreceipt,
      this._commonService.getCompanyCode(), this._commonService.getBranchCode());

    forkJoin([data$, count$]).subscribe({
      next: (clearreturndata: any) => {
        const kk: any[] = [];
        this.ChequesClearReturnDataBasedOnBrs = clearreturndata[0]['pchequesclearreturnlist'];
        for (const item of this.ChequesClearReturnDataBasedOnBrs) {
          if (this.status === 'cleared' && item.pchequestatus === 'Y') kk.push(item);
          if (this.status === 'returned' && item.pchequestatus === 'R') kk.push(item);
        }
        this._countData = clearreturndata[1];
        this.gridData = kk;
        this.amounttotal = kk.reduce((s: number, c: any) => s + (c.ptotalreceivedamount || 0), 0);
        this.gridData.forEach(d => {
          d.preceiptdate = this._commonService.getFormatDateGlobal(d?.preceiptdate);
          d.pdepositeddate = this._commonService.getFormatDateGlobal(d?.pdepositeddate);
          d.pCleardate = this._commonService.getFormatDateGlobal(d?.pCleardate);
        });

        if (this.status === 'cleared') {
          this.cleared = kk.length;
        } else if (this.status === 'returned') {
          this.returned = kk.length;
        }

        this.totalElements = this.page.totalElements = kk.length;
        this.page.totalPages = kk.length > 0
          ? Math.ceil(kk.length / (this.page.size || 10)) : 1;
        this.cdr.markForCheck();
      },
      error: (error: any) => setTimeout(() => this._commonService.showErrorMessage(error))
    });
  }

  GetDataOnBrsDates1(frombrsdate: any, tobrsdate: any, bankid: any) {
    this._accountingtransaction.DataFromBrsDatesChequesInBank(
      frombrsdate, tobrsdate, bankid, this.modeofreceipt, '0',
      this.startindex, this.endindex,
      this._commonService.getCompanyCode(), this._commonService.getBranchCode(),
      this._commonService.getschemaname()
    ).subscribe({
      next: (clearreturndata: any) => {
        const kk: any[] = [];
        this.ChequesClearReturnDataBasedOnBrs = clearreturndata['pchequesclearreturnlist'];
        for (const item of this.ChequesClearReturnDataBasedOnBrs) {
          if (this.status === 'cleared' && item.pchequestatus === 'Y') kk.push(item);
          if (this.status === 'returned' && item.pchequestatus === 'R') kk.push(item);
        }
        this.gridData = kk;
        this.amounttotal = kk.reduce((s: number, c: any) => s + (c.ptotalreceivedamount || 0), 0);
        this.gridData.forEach(d => {
          d.preceiptdate = this._commonService.getFormatDateGlobal(d.preceiptdate);
          d.pdepositeddate = this._commonService.getFormatDateGlobal(d.pdepositeddate);
          d.pCleardate = this._commonService.getFormatDateGlobal(d.pCleardate);
        });
        if (this.status === 'cleared') {
          this.cleared = kk.length;
        } else if (this.status === 'returned') {
          this.returned = kk.length;
        }
        this.page.totalElements = kk.length;
        this.page.totalPages = kk.length > 0 ? Math.ceil(kk.length / (this.page.size || 10)) : 1;
        this.cdr.markForCheck();
      },
      error: (error: any) => setTimeout(() => this._commonService.showErrorMessage(error))
    });
  }

  // ── BRS date helpers ──────────────────────────────────────────────────────────

  OnBrsDateChanges(fromdate: any, todate: any) { this.validate = fromdate > todate; }

  // ShowBrsClear() {
  //   this._searchText = ''; this.gridData = [];
  //   this.amounttotal = 0;
  //   const fromdate = this.ChequesInBankForm.controls['pfrombrsdate'].value;
  //   const todate = this.ChequesInBankForm.controls['ptobrsdate'].value;
  //   if (fromdate != null && todate != null) {
  //     this.OnBrsDateChanges(fromdate, todate);
  //     if (!this.validate) {
  //       const fd = this._commonService.getFormatDateNormal(fromdate);
  //       const td = this._commonService.getFormatDateNormal(todate);
  //       this.fromdate = fd; this.todate = td; this.validatebrsdateclear = false;
  //       this.pageSetUp(); this.GetDataOnBrsDates(fd, td, this.bankid);
  //     } else { this.validatebrsdateclear = true; }
  //   } else { this._commonService.showWarningMessage('select fromdate and todate'); }
  // }

  // ShowBrsReturn() {
  //   this._searchText = ''; this.gridData = [];
  //   this.amounttotal = 0;
  //   const fromdate = this.BrsDateForm.controls['frombrsdate'].value;
  //   const todate = this.BrsDateForm.controls['tobrsdate'].value;
  //   if (fromdate != null && todate != null) {
  //     this.OnBrsDateChanges(fromdate, todate);
  //     if (!this.validate) {
  //       const fd = this._commonService.getFormatDateNormal(fromdate);
  //       const td = this._commonService.getFormatDateNormal(todate);
  //       this.fromdate = fd; this.todate = td; this.validatebrsdatereturn = false;
  //       this.pageSetUp(); this.GetDataOnBrsDates(fd, td, this.bankid);
  //     } else { this.validatebrsdatereturn = true; }
  //   } else { this._commonService.showWarningMessage('select fromdate and todate'); }
  // }

  // ── Search ────────────────────────────────────────────────────────────────────
   ShowBrsClear() {
  this._searchText = ''; this.gridData = [];
  this.amounttotal = 0;
  const fromdate = this.brsFromDateModel;
  const todate = this.brsToDateModel;
  if (fromdate != null && todate != null) {
    this.OnBrsDateChanges(fromdate, todate);
    if (!this.validate) {
      this.validatebrsdateclear = false;
      const fd = new Date(fromdate as Date); fd.setHours(0,0,0,0);
      const td = new Date(todate as Date); td.setHours(23,59,59,999);

      const bankFilter = (d: any) => this.bankid == 0 || d?.pdepositbankid == this.bankid;
      const filtered = this.ChequesClearReturnData
        .filter(bankFilter)
        .filter((d: any) => d.pchequestatus === 'Y')
        .filter((d: any) => {
          if (!d.pCleardate) return false;
          const clearDate = new Date(this._commonService.getDateObjectFromDataBase(d.pCleardate) as Date);
          clearDate.setHours(0,0,0,0);
          return clearDate >= fd && clearDate <= td;
        });

      this.gridData = JSON.parse(JSON.stringify(filtered));
      this.gridDatatemp = [...this.gridData];
      this.cleared = this.gridData.length;
      this.amounttotal = this.gridData.reduce((s: number, c: any) => s + (c.ptotalreceivedamount || 0), 0);
      this.page.totalElements = this.gridData.length;
      this.page.totalPages = Math.ceil(this.gridData.length / (this.page.size || 10));
      this.cdr.markForCheck();
    } else { this.validatebrsdateclear = true; }
  } else { this._commonService.showWarningMessage('Select fromdate and todate'); }
}

ShowBrsReturn() {
  this._searchText = ''; this.gridData = [];
  this.amounttotal = 0;
  const fromdate = this.brsReturnFromDateModel;
  const todate = this.brsReturnToDateModel;
  if (fromdate != null && todate != null) {
    this.OnBrsDateChanges(fromdate, todate);
    if (!this.validate) {
      this.validatebrsdatereturn = false;
      const fd = new Date(fromdate as Date); fd.setHours(0,0,0,0);
      const td = new Date(todate as Date); td.setHours(23,59,59,999);

      const bankFilter = (d: any) => this.bankid == 0 || d?.pdepositbankid == this.bankid;
      const filtered = this.ChequesClearReturnData
        .filter(bankFilter)
        .filter((d: any) => d.pchequestatus === 'R')
        .filter((d: any) => {
          if (!d.pCleardate) return false;
          const returnDate = new Date(this._commonService.getDateObjectFromDataBase(d.pCleardate) as Date);
          returnDate.setHours(0,0,0,0);
          return returnDate >= fd && returnDate <= td;
        });

      this.gridData = JSON.parse(JSON.stringify(filtered));
      this.gridDatatemp = [...this.gridData];
      this.returned = this.gridData.length;
      this.amounttotal = this.gridData.reduce((s: number, c: any) => s + (c.ptotalreceivedamount || 0), 0);
      this.page.totalElements = this.gridData.length;
      this.page.totalPages = Math.ceil(this.gridData.length / (this.page.size || 10));
      this.cdr.markForCheck();
    } else { this.validatebrsdatereturn = true; }
  } else { this._commonService.showWarningMessage('Select fromdate and todate'); }
}
  showSearchText(_event: any) {
    const searchText = this.ChequesInBankForm.controls['searchtext'].value?.toString().trim() || '';
    this._searchText = searchText;
    if (this.fromFormName === 'fromChequesStatusInformationForm') {
      if (searchText) {
        const lastChar = searchText.substr(searchText.length - 1);
        const asciivalue = lastChar.charCodeAt(0);
        const columnName = (asciivalue > 47 && asciivalue < 58) ? 'pChequenumber' : '';
        this.displayGridDataBasedOnForm = this._commonService.transform(
          this.displayGridDataBasedOnFormTemp, searchText, columnName);
      } else { this.displayGridDataBasedOnForm = this.displayGridDataBasedOnFormTemp; }
      this.pageCriteria.totalrows = this.displayGridDataBasedOnForm.length;
      this.pageCriteria.TotalPages = this.pageCriteria.totalrows > 10
        ? Math.ceil(this.pageCriteria.totalrows / 10) : 1;
      this.pageCriteria.currentPageRows =
        this.displayGridDataBasedOnForm.length < this.pageCriteria.pageSize
          ? this.displayGridDataBasedOnForm.length : this.pageCriteria.pageSize;
    } else {
      if (searchText) {
        const filterFn = (item: any) =>
          item.pChequenumber?.toString().toLowerCase().includes(searchText.toLowerCase());
        const bankFilter = (d: any) => this.bankid == 0 || d?.pdepositbankid == this.bankid;
        const oH = this.ChequesInBankData.filter(filterFn).filter(bankFilter);
        const cr = this.ChequesClearReturnData.filter(filterFn).filter(bankFilter);
        this.all = oH.length;
        this.chequesdeposited = oH.filter((d: any) => d.ptypeofpayment === 'CHEQUE').length;
        this.onlinereceipts = oH.filter((d: any) => d.ptypeofpayment !== 'CHEQUE').length;
        this.cleared = cr.filter((d: any) => d.pchequestatus === 'Y').length;
        this.returned = cr.filter((d: any) => d.pchequestatus === 'R').length;
        if (this.status === 'all') this.gridData = JSON.parse(JSON.stringify(oH));
        else if (this.status === 'chequesdeposited')
          this.gridData = JSON.parse(JSON.stringify(
            oH.filter((d: any) => d.ptypeofpayment === 'CHEQUE')));
        else if (this.status === 'onlinereceipts')
          this.gridData = JSON.parse(JSON.stringify(
            oH.filter((d: any) => d.ptypeofpayment !== 'CHEQUE')));
        else if (this.status === 'cleared')
          this.gridData = JSON.parse(JSON.stringify(
            cr.filter((d: any) => d.pchequestatus === 'Y')));
        else if (this.status === 'returned')
          this.gridData = JSON.parse(JSON.stringify(
            cr.filter((d: any) => d.pchequestatus === 'R')));
        this.gridDatatemp = [...this.gridData];
        this.amounttotal = this.gridData.reduce(
          (s: number, c: any) => s + (c.ptotalreceivedamount || 0), 0);
      } else {
        this.pageSetUp(); this.modeofreceipt = 'ALL';
        this.GetChequesInBankforSearchDeposit(this.bankid, this.startindex, this.endindex, '');
      }
    }
  }

  onPaste(event: ClipboardEvent) {
    setTimeout(() => {
      const input = event.target as HTMLInputElement;
      let value = (input.value || '').trim().replace(/\s+/g, '');
      input.value = value;
      this.onSearch(value);
      input.setSelectionRange(value.length, value.length);
    }, 0);
  }

  onSearch(event: any) {
    const searchText = (event || '').toString().trim().replace(/\s+/g, '');
    this._searchText = searchText;
    if (this.fromFormName === 'fromChequesStatusInformationForm') {
      if (searchText) {
        const lastChar = searchText.substr(searchText.length - 1);
        const asc = lastChar.charCodeAt(0);
        const col = (asc > 47 && asc < 58) ? 'pChequenumber' : '';
        this.displayGridDataBasedOnForm = this._commonService.transform(
          this.displayGridDataBasedOnFormTemp.map((x: any) => ({
            ...x, pChequenumber: x.pChequenumber?.toString().replace(/\s+/g, '')
          })), searchText, col);
      } else {
        this.displayGridDataBasedOnForm = this.displayGridDataBasedOnFormTemp;
      }
      this.pageCriteria.totalrows = this.displayGridDataBasedOnForm.length;
      this.pageCriteria.TotalPages = this.pageCriteria.totalrows > 10
        ? Math.ceil(this.pageCriteria.totalrows / 10) : 1;
      this.pageCriteria.currentPageRows =
        this.displayGridDataBasedOnForm.length < this.pageCriteria.pageSize
          ? this.displayGridDataBasedOnForm.length : this.pageCriteria.pageSize;
    } else {
      if (searchText) {
        const filterFn = (item: any) =>
          Object.values(item).some(val =>
            val?.toString().toLowerCase().includes(searchText.toLowerCase()));
        const bankFilter = (d: any) => this.bankid == 0 || d?.pdepositbankid == this.bankid;
        const filteredOnHand = this.ChequesInBankData.filter(filterFn).filter(bankFilter);
        const filteredClearReturn = this.ChequesClearReturnData.filter(filterFn).filter(bankFilter);
        this.all = filteredOnHand.length;
        this.chequesdeposited = filteredOnHand.filter(
          (d: any) => d.ptypeofpayment === 'CHEQUE').length;
        this.onlinereceipts = filteredOnHand.filter(
          (d: any) => d.ptypeofpayment !== 'CHEQUE').length;
        this.cleared = filteredClearReturn.filter((d: any) => d.pchequestatus === 'Y').length;
        this.returned = filteredClearReturn.filter((d: any) => d.pchequestatus === 'R').length;
        if (this.status === 'all')
          this.gridData = JSON.parse(JSON.stringify(filteredOnHand));
        else if (this.status === 'chequesdeposited')
          this.gridData = JSON.parse(JSON.stringify(
            filteredOnHand.filter((d: any) => d.ptypeofpayment === 'CHEQUE')));
        else if (this.status === 'onlinereceipts')
          this.gridData = JSON.parse(JSON.stringify(
            filteredOnHand.filter((d: any) => d.ptypeofpayment !== 'CHEQUE')));
        else if (this.status === 'cleared')
          this.gridData = JSON.parse(JSON.stringify(
            filteredClearReturn.filter((d: any) => d.pchequestatus === 'Y')));
        else if (this.status === 'returned')
          this.gridData = JSON.parse(JSON.stringify(
            filteredClearReturn.filter((d: any) => d.pchequestatus === 'R')));
        this.gridDatatemp = [...this.gridData];
        this.amounttotal = this.gridData.reduce(
          (s: number, c: any) => s + (c.ptotalreceivedamount || 0), 0);
        this.page.totalElements = this.gridData.length;
        this.page.totalPages = Math.ceil(this.gridData.length / (this.page.size || 10));
        this.cdr.markForCheck();
      } else {
        this._recalculateCountsForBank();
        this._applyTabFilter();
        this.amounttotal = this.gridData.reduce(
          (s: number, c: any) => s + (c.ptotalreceivedamount || 0), 0);
        this.page.totalElements = this.gridData.length;
        this.page.totalPages = Math.ceil(this.gridData.length / (this.page.size || 10));
        this.cdr.markForCheck();
      }
    }
  }

  change_date(_event: any) {
    for (const row of this.gridData) {
      row.pdepositstatus = false; row.pcancelstatus = false; row.pchequestatus = 'N';
    }
  }

  // ── Checkbox handlers ─────────────────────────────────────────────────────────

  onRowClearCheck(event: any, row: any) {
    if (event.target.checked) {
      row.pdepositstatus = true; row.pchequestatus = 'Y'; row.preturnstatus = false;
    } else {
      row.pdepositstatus = false; row.pchequestatus = 'N';
      row.preturnstatus = false; row.preferencetext = '';
    }
    this.selectedamt = this.gridData.filter((r: any) => r.pdepositstatus)
      .reduce((s: number, r: any) => s + (r.ptotalreceivedamount || 0), 0);
    this.gridData = [...this.gridData];
  }

  CheckedReturn(event: any, data: any) {
    const gridtemp = this.gridData.filter(a => a?.preceiptid == data.preceiptid);
    this.PopupData = data;
    if (event.target.checked) {
      const depositedDateStr = gridtemp[0]?.pdepositeddate;
      const receiptdate = depositedDateStr
        ? this._commonService.getDateObjectFromDataBase(depositedDateStr) : null;
      const chequecleardate = this.ChequesInBankForm?.get('pchequecleardate')?.value;
      if (!receiptdate ||
        (chequecleardate &&
          new Date(chequecleardate).getTime() >= new Date(receiptdate).getTime())) {
        data.preturnstatus = true;
        data.pdepositstatus = false;
        data.pchequestatus = 'R';
        this.returnChargesError = false;
        this.chequenumber = data.pChequenumber;
        this.showReturnModal = true;
        this.cdr.markForCheck();
        setTimeout(() => {
          const el = document.getElementById('cancelcharges') as HTMLInputElement;
          if (el) {
            el.value = String(this.minimumReturnCharge || 250);
            el.focus();
            el.select();
          }
          this.cdr.markForCheck();
        }, 50);
      } else {
        data.preturnstatus = false; data.pchequestatus = 'N';
        event.target.checked = false;
        setTimeout(() => this._commonService.showWarningMessage(
          'Cheque Clear Date Should be Greater than or Equal Deposited Date'));
      }
    } else {
      data.preturnstatus = false; data.pchequestatus = 'N';
    }
    for (let i = 0; i < this.gridData.length; i++) {
      if (this.gridData[i]?.preceiptid == data.preceiptid) {
        this.gridData[i] = data; break;
      }
    }
    this.gridData = [...this.gridData];
    this.cdr.markForCheck();
  }

  CheckedClear(event: any, data: any) {
    const gridtemp = this.gridData.filter(a => a?.preceiptid == data.preceiptid);
    if (event.target.checked) {
      const receiptdate = gridtemp[0]?.pdepositeddate
        ? this._commonService.getDateObjectFromDataBase(gridtemp[0].pdepositeddate) : null;
      const chequecleardate = this.ChequesInBankForm?.get('pchequecleardate')?.value;
      if (receiptdate && chequecleardate &&
        new Date(chequecleardate).getTime() < new Date(receiptdate).getTime()) {
        event.target.checked = false;
        this._commonService.showWarningMessage(
          'Cheque Clear Date Should be Greater than or Equal to Deposited Date');
      } else {
        if (parseInt(this.roleid, 10) !== 2) {
          data.pdepositstatus = true; data.pchequestatus = 'Y'; data.preturnstatus = false;
          this.gridData.forEach(el => {
            if (el?.pChequenumber == data.pChequenumber &&
              data.cheque_bank == el.cheque_bank &&
              data.receipt_branch_name == el.receipt_branch_name) {
              el.pdepositstatus = true; el.preturnstatus = false; el.pchequestatus = 'Y';
            }
          });
        } else {
          data.pdepositstatus = true; data.preturnstatus = false; data.pchequestatus = 'Y';
        }
      }
    } else {
      data.pdepositstatus = false; data.pchequestatus = 'N';
      this.gridData.forEach(el => {
        if (el?.pChequenumber == data.pChequenumber && data.cheque_bank == el.cheque_bank) {
          el.pdepositstatus = false; el.preturnstatus = false; el.pchequestatus = 'N';
          if (this.status !== 'autobrs') el.preferencetext = '';
        }
      });
      data.preturnstatus = '';
      const idx = this.gridData.indexOf(data);
      if (this.status !== 'autobrs') {
        const el = document.getElementById('preferencetext' + idx) as HTMLInputElement;
        if (el) el.value = '';
      }
    }
    for (let i = 0; i < this.gridData.length; i++) {
      if (this.gridData[i]?.preceiptid == data.preceiptid) {
        this.gridData[i] = data; break;
      }
    }
    this.selectedamt = 0;
    this.gridData.forEach((el: any) => {
      if (el?.pdepositstatus) this.selectedamt += el?.ptotalreceivedamount || 0;
    });
  }

  selectAllClear(eve: any) {
    this.preferdrows = eve.target.checked;
    this.gridData.forEach((row: any) => {
      if (eve.target.checked) { row.pdepositstatus = true; row.pchequestatus = 'Y'; }
      else { row.pdepositstatus = false; row.pchequestatus = 'N'; row.preferencetext = ''; }
    });
    this.selectedamt = this.gridData.filter((r: any) => r.pdepositstatus)
      .reduce((s: number, r: any) => s + (r.ptotalreceivedamount || 0), 0);
    this.gridData = [...this.gridData];
  }

  // ── Return modal ──────────────────────────────────────────────────────────────

  CancelChargesOk(passedValue?: any) {
    const inputEl = document.getElementById('cancelcharges') as HTMLInputElement;
    const raw = (inputEl?.value || passedValue?.toString() || '0').replace(/,/g, '').trim();
    const value = parseFloat(raw);
    const minimum = Number(this.minimumReturnCharge || 250);
    if (!raw || isNaN(value) || value < minimum) {
      this.returnChargesError = true;
      this.cdr.markForCheck();
      setTimeout(() =>
        this._commonService.showWarningMessage('Minimum Amount Should Be ' + minimum));
      return;
    }
    this.returnChargesError = false;
    for (let i = 0; i < this.gridData.length; i++) {
      if (this.gridData[i].preceiptid == this.PopupData?.preceiptid) {
        this.gridData[i].pactualcancelcharges = value;
        break;
      }
    }
    this.showReturnModal = false;
    this.cdr.markForCheck();
  }

  closeReturnModal() {
    if (this.PopupData) {
      this.PopupData.preturnstatus = false;
      this.PopupData.pchequestatus = 'N';
      for (let i = 0; i < this.gridData.length; i++) {
        if (this.gridData[i].preceiptid == this.PopupData.preceiptid) {
          this.gridData[i].preturnstatus = false;
          this.gridData[i].pchequestatus = 'N';
          break;
        }
      }
      this.gridData = [...this.gridData];
    }
    this.returnChargesError = false;
    this.showReturnModal = false;
    this.cdr.markForCheck();
  }

  returnCharges_Change(event: Event) {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/,/g, '').trim();
    const value = parseFloat(raw || '0');
    this.returnChargesError = !raw || value < Number(this.minimumReturnCharge || 250);
    this.cdr.markForCheck();
  }

  getChequeReturnCharges() {
    this._accountingtransaction.getChequeReturnCharges(
      this._commonService.getschemaname(),
      this._commonService.getCompanyCode(),
      this._commonService.getBranchCode()
    ).subscribe({
      next: (res: any[]) => {
         
        const charge = Array.isArray(res) && res.length > 0 && res[0].chargeAmount > 0
          ? res[0].chargeAmount
          : 250;
        this.chequereturncharges = this.minimumReturnCharge = this.returnChargesInputValue = charge;
      },
      error: (error: any) => {
        this.chequereturncharges = this.minimumReturnCharge = this.returnChargesInputValue = 250;
        setTimeout(() => this._commonService.showErrorMessage(error));
      }
    });

  }



  // ── Save / Validate ───────────────────────────────────────────────────────────

  // validateSave(): boolean {
  //   let isvalid = this.checkValidations(this.ChequesInBankForm, true);
  //   const chequecleardate = this.ChequesInBankForm?.get('pchequecleardate')?.value;
  //   const transactiondate = this.ChequesInBankForm?.get('ptransactiondate')?.value;
  //   if (new Date(transactiondate).getTime() < new Date(chequecleardate).getTime()) {
  //     this._commonService.showWarningMessage(
  //       'Transaction Date Should be Greater than or Equal to Cheque Clear Date');
  //     isvalid = false;
  //   }
  //   const isvalidbool = this.modeofreceipt !== 'ONLINE-AUTO' ? this.validateDuplicates() : 0;
  //   const isempty = this.emptyValuesFound();
  //   if (this.DataForSaving.length > 0) { isvalid = true; }
  //   else {
  //     const selectrecords = this.gridData.filter(
  //       el => el.pchequestatus === 'Y' || el.pchequestatus === 'R');
  //     if (!this.showhidegridcolumns) {
  //       if (isvalidbool > 0) {
  //         this._commonService.showWarningMessage('Duplicates Found please enter unique values');
  //         isvalid = false;
  //       } else if (isempty) {
  //         this._commonService.showWarningMessage('Please enter all input fields!');
  //         isvalid = false;
  //       } else if (selectrecords.length == 0) {
  //         this._commonService.showWarningMessage('Please Select records');
  //         isvalid = false;
  //       }
  //     }
  //   }
  //   if (isvalid && !confirm('Do You Want To Save ?')) isvalid = false;
  //   return isvalid;
  // }
  validateSave(): boolean {
    let isvalid = this.checkValidations(this.ChequesInBankForm, true);
    const chequecleardate = this.ChequesInBankForm?.get('pchequecleardate')?.value;
    const transactiondate = new Date();
    if (new Date(transactiondate).getTime() < new Date(chequecleardate).getTime()) {
      this._commonService.showWarningMessage(
        'Transaction Date Should be Greater than or Equal to Cheque Clear Date');
      isvalid = false;
    }
    const isvalidbool = this.modeofreceipt !== 'ONLINE-AUTO' ? this.validateDuplicates() : 0;
    const isempty = this.emptyValuesFound();
    if (this.DataForSaving.length > 0) { isvalid = true; }
    else {
      const selectrecords = this.gridData.filter(
        el => el.pchequestatus === 'Y' || el.pchequestatus === 'R');
      if (!this.showhidegridcolumns) {
        if (isvalidbool > 0) {
          this._commonService.showWarningMessage('Duplicates Found please enter unique values');
          isvalid = false;
        } else if (isempty) {
          this._commonService.showWarningMessage('Please enter all input fields!');
          isvalid = false;
        } else if (selectrecords.length == 0) {
          this._commonService.showWarningMessage('Please Select records');
          isvalid = false;
        }
      }
    }
    if (isvalid && !confirm('Do You Want To Save ?')) isvalid = false;
    return isvalid;
  }


  // Save() {
  //   console.log('Save called, status:', this.status);
  //   this.DataForSaving = [];

  //   if (this.status === 'autobrs') {
  //     this.DataForSaving = this.autoBrsData;
  //     if (this.DataForSaving.length) {
  //       if (confirm('Do you want to save ?')) {
  //         this.gridLoading.set(true);
  //         this._prepareSaveItems(this.DataForSaving, true);
  //         this.ChequesInBankForm.controls['pchequesOnHandlist'].setValue(this.DataForSaving);
  //         const payload = this._buildSavePayload();
  //         this._accountingtransaction.SaveChequesInBank(payload).subscribe(
  //           (res: any) => {
  //             if (res[0] === true) {
  //               this.gridLoading.set(false);
  //               setTimeout(() => this._commonService.showSuccessMessage());
  //               this.Clear(); this.autoBrsData = [];
  //             }
  //             this.disablesavebutton = false; this.buttonname = 'Save';
  //           },
  //           (error: any) => {
  //             this.gridLoading.set(false);
  //             setTimeout(() => this._commonService.showErrorMessage(error));
  //             this.disablesavebutton = false; this.buttonname = 'Save';
  //           }
  //         );
  //       } else { this.gridLoading.set(false); }
  //     } else {
  //       this.disablesavebutton = false; this.buttonname = 'Save';
  //       setTimeout(() => this._commonService.showWarningMessage('Select atleast one record'));
  //     }

  //   } else {

  //     // ── Check bank selected
  //     if (!this.bankid || this.bankid == 0) {
  //       this._commonService.showWarningMessage('Please Select Bank');
  //       return;
  //     }

  //     // ── Check cheque clear date
  //     const chequecleardate = this.chequeClearDateModel;
  //     if (!chequecleardate) {
  //       this._commonService.showWarningMessage('Please Select Cheque Clear Date');
  //       return;
  //     }

  //     // ── Check selected records
  //     const selectedRecords = this.gridData.filter(
  //       el => el.pchequestatus === 'Y' || el.pchequestatus === 'R');
  //     console.log('selectedRecords:', selectedRecords.length);

  //     if (selectedRecords.length === 0) {
  //       this._commonService.showWarningMessage('Please Select records');
  //       return;
  //     }

  //     // ── Check empty reference text for cleared records
  //     if (!this.showhidegridcolumns) {
  //       const emptyRef = selectedRecords
  //         .filter(el => el.pchequestatus === 'Y')
  //         .some(item => !item.preferencetext || item.preferencetext.toString().trim() === '');
  //       if (emptyRef) {
  //         this._commonService.showWarningMessage('Please enter all input fields!');
  //         return;
  //       }


  //       const dupeCount = this.validateDuplicates();
  //       if (dupeCount > 0) {
  //         this._commonService.showWarningMessage('Duplicates Found please enter unique values');
  //         return;
  //       }
  //     }

  //     // ── Transaction date vs cheque clear date
  //     const transactiondate = new Date();
  //     if (new Date(transactiondate).getTime() < new Date(chequecleardate).getTime()) {
  //       this._commonService.showWarningMessage(
  //         'Transaction Date Should be Greater than or Equal to Cheque Clear Date');
  //       return;
  //     }

  //     // ── Confirm save
  //     if (!confirm('Do You Want To Save ?')) return;

  //     this.disablesavebutton = true;
  //     this.buttonname = 'Processing';
  //     this.DataForSaving = selectedRecords;

  //     this._prepareSaveItems(this.DataForSaving, false);
  //     this.ChequesInBankForm.get('pchequesOnHandlist')?.setValue(this.DataForSaving);
  //     const payload = this._buildSavePayload();
  //     console.log('payload:', payload);

  //     this._accountingtransaction.SaveChequesInBank(payload).subscribe(
  //       (data: any) => {
  //         console.log('save response:', data);
  //         if (data) {
  //           const receipt = data.o_common_receipt_no;
  //           if (receipt && receipt.split('$')[0] === 'R') {
  //             const mo = data.o_return_receipts;
  //             const encodedMo = encodeURIComponent(mo);
  //             this._noticeservice.GetChequeReturnInvoice(
  //               this._commonService.getschemaname(), this._commonService.getbranchname(),
  //               this._commonService.getCompanyCode(), this._commonService.getBranchCode(),
  //               encodedMo
  //             ).subscribe((res: any) => {
  //               if (res?.length > 0) {
  //                 this.previewdetails = res;
  //                 for (const p of this.previewdetails) {
  //                   p.paddress = p.paddress.split(',');
  //                   if (JSON.stringify(p.incidentalcharges) === '{}' ||
  //                     isNullOrEmptyString(p.incidentalcharges)) p.incidentalcharges = 0;
  //                 }
  //                 this.pdfContentData();
  //               }
  //             });
  //             this._noticeservice.GetChequeReturnVoucher(
  //               this._commonService.getschemaname(), this._commonService.getbranchname(),
  //               this._commonService.getCompanyCode(), this._commonService.getBranchCode(),
  //               encodedMo
  //             ).subscribe({
  //               next: (res: any) => {
  //                 if (res?.length > 0) {
  //                   this.chequerwturnvoucherdetails = res;
  //                   this.chequereturnvoucherpdf();
  //                 }
  //               },
  //               error: (err: any) =>
  //                 setTimeout(() => this._commonService.showErrorMessage(err))
  //             });
  //           }
  //           setTimeout(() => this._commonService.showSuccessMessage());
  //           const hasClear = this.DataForSaving.some(i => i.pchequestatus === 'Y');
  //           const hasReturn = this.DataForSaving.some(i => i.pchequestatus === 'R');
  //           this.Clear();
  //           if (hasReturn) {
  //             this.status = 'returned';
  //             this.selectedTab = 'returned';
  //             this.modeofreceipt = 'RETURN';
  //             this.Returned();
  //           } else if (hasClear) {
  //             this.status = 'cleared';
  //             this.selectedTab = 'cleared';
  //             this.modeofreceipt = 'CLEAR';
  //             this.Cleared();
  //           }
  //         }
  //         this.disablesavebutton = false; this.buttonname = 'Save';
  //         this.cdr.markForCheck();
  //       },
  //       (error: any) => {
  //         console.log('save error:', error);
  //         setTimeout(() => this._commonService.showErrorMessage(error));
  //         this.disablesavebutton = false; this.buttonname = 'Save';
  //       }
  //     );
  //   }
  // }

  Save() {
    console.log('Save called, status:', this.status);
    this.DataForSaving = [];

    if (this.status === 'autobrs') {
      this.DataForSaving = this.autoBrsData;
      if (this.DataForSaving.length) {
        if (confirm('Do you want to save ?')) {
          this.gridLoading.set(true);
          this._prepareSaveItems(this.DataForSaving, true);
          this.ChequesInBankForm.controls['pchequesOnHandlist'].setValue(this.DataForSaving);
          const payload = this._buildSavePayload();
          this._accountingtransaction.SaveChequesInBank(payload).subscribe(
            (res: any) => {
              if (res[0] === true) {
                this.gridLoading.set(false);
                setTimeout(() => this._commonService.showSuccessMessage());
                this.Clear(); this.autoBrsData = [];
              }
              this.disablesavebutton = false; this.buttonname = 'Save';
            },
            (error: any) => {
              this.gridLoading.set(false);
              setTimeout(() => this._commonService.showErrorMessage(error));
              this.disablesavebutton = false; this.buttonname = 'Save';
            }
          );
        } else { this.gridLoading.set(false); }
      } else {
        this.disablesavebutton = false; this.buttonname = 'Save';
        setTimeout(() => this._commonService.showWarningMessage('Select atleast one record'));
      }

    } else {

      // ── 1. Check bank selected
      if (!this.bankid || this.bankid == 0) {
        this._commonService.showWarningMessage('Please Select Bank');
        return;
      }

      // ── 2. Check cheque clear date
      const chequecleardate = this.chequeClearDateModel;
      if (!chequecleardate) {
        this._commonService.showWarningMessage('Please Select Cheque Clear Date');
        return;
      }

      // ── 3. Check selected records
      const selectedRecords = this.gridData.filter(
        el => el.pchequestatus === 'Y' || el.pchequestatus === 'R');
      console.log('selectedRecords:', selectedRecords.length);

      if (selectedRecords.length === 0) {
        this._commonService.showWarningMessage('Please Select records');
        return;
      }

      // ── 4. Check empty reference text for cleared records
      if (!this.showhidegridcolumns) {
        const emptyRef = selectedRecords
          .filter(el => el.pchequestatus === 'Y')
          .some(item => !item.preferencetext || item.preferencetext.toString().trim() === '');
        if (emptyRef) {
          this._commonService.showWarningMessage('Please enter all input fields!');
          return;
        }

        const dupeCount = this.validateDuplicates();
        if (dupeCount > 0) {
          this._commonService.showWarningMessage('Duplicates Found please enter unique values');
          return;
        }
      }

      // ── 5. Transaction date vs cheque clear date
      const transactiondate = new Date();
      if (new Date(transactiondate).getTime() < new Date(chequecleardate).getTime()) {
        this._commonService.showWarningMessage(
          'Transaction Date Should be Greater than or Equal to Cheque Clear Date');
        return;
      }

      // ── 6. Confirm save
      if (!confirm('Do You Want To Save ?')) return;

      this.disablesavebutton = true;
      this.buttonname = 'Processing';
      this.DataForSaving = selectedRecords;

      this._prepareSaveItems(this.DataForSaving, false);
      this.ChequesInBankForm.get('pchequesOnHandlist')?.setValue(this.DataForSaving);
      const payload = this._buildSavePayload();
      console.log('payload:', payload);

      this._accountingtransaction.SaveChequesInBank(payload).subscribe(
        (data: any) => {
          console.log('save response:', data);
          if (data) {
            const receipt = data.o_common_receipt_no;
            if (receipt && receipt.split('$')[0] === 'R') {
              const mo = data.o_return_receipts;
              const encodedMo = encodeURIComponent(mo);
              this._noticeservice.GetChequeReturnInvoice(
                this._commonService.getschemaname(), this._commonService.getbranchname(),
                this._commonService.getCompanyCode(), this._commonService.getBranchCode(),
                encodedMo
              ).subscribe((res: any) => {
                if (res?.length > 0) {
                  this.previewdetails = res;
                  for (const p of this.previewdetails) {
                    p.paddress = p.paddress.split(',');
                    if (JSON.stringify(p.incidentalcharges) === '{}' ||
                      isNullOrEmptyString(p.incidentalcharges)) p.incidentalcharges = 0;
                  }
                  this.pdfContentData();
                }
              });
              this._noticeservice.GetChequeReturnVoucher(
                this._commonService.getschemaname(), this._commonService.getbranchname(),
                this._commonService.getCompanyCode(), this._commonService.getBranchCode(),
                encodedMo
              ).subscribe({
                next: (res: any) => {
                  if (res?.length > 0) {
                    this.chequerwturnvoucherdetails = res;
                    this.chequereturnvoucherpdf();
                  }
                },
                error: (err: any) =>
                  setTimeout(() => this._commonService.showErrorMessage(err))
              });
            }
            setTimeout(() => this._commonService.showSuccessMessage());
            const hasClear = this.DataForSaving.some(i => i.pchequestatus === 'Y');
            const hasReturn = this.DataForSaving.some(i => i.pchequestatus === 'R');
            this.Clear();
            if (hasReturn) {
              this.status = 'returned';
              this.selectedTab = 'returned';
              this.modeofreceipt = 'RETURN';
              this.Returned();
            } else if (hasClear) {
              this.status = 'cleared';
              this.selectedTab = 'cleared';
              this.modeofreceipt = 'CLEAR';
              this.Cleared();
            }
          }
          this.disablesavebutton = false; this.buttonname = 'Save';
          this.cdr.markForCheck();
        },
        (error: any) => {
          console.log('save error:', error);
          setTimeout(() => this._commonService.showErrorMessage(error));
          this.disablesavebutton = false; this.buttonname = 'Save';
        }
      );
    }
  }

  private _prepareSaveItems(items: any[], isAuto: boolean) {
    for (const item of items) {
      item.pCreatedby = '1';
      item.pdepositeddate = this._commonService.getFormatDateNormal(
        this._commonService.getDateObjectFromDataBase(item.pdepositeddate));
      item.preceiptdate = this._commonService.getFormatDateNormal(
        this._commonService.getDateObjectFromDataBase(item.preceiptdate));
      item.pchequedate = this._commonService.getFormatDateNormal(
        this._commonService.getDateObjectFromDataBase(item.pchequedate));
      item.pipaddress = this._commonService.getIpAddress();
      item.pactualcancelcharges = item.pactualcancelcharges ?? 0;
      if (isAuto) {
        item.pchequestatus = 'Y';
        item.preferencetext = item.preferencetext + '-' + new Date().getFullYear();
      } else {
        item.preferencetext = item.preferencetext + '-' + new Date().getFullYear();
      }
    }
  }

  // private _buildSavePayload(): string {
  //   const d = this.ChequesInBankForm.value;
  //   d.pchequecleardate = this._commonService.getFormatDateNormal(d.pchequecleardate);
  //   d.ptransactiondate = this._commonService.getFormatDateNormal(d.ptransactiondate);
  //   d.global_schema = this._commonService.getschemaname();
  //   d.branch_schema = this._commonService.getbranchname();
  //   d.company_code = this._commonService.getCompanyCode();
  //   d.branch_code = this._commonService.getBranchCode();
  //   d.schemaname = this._commonService.getschemaname();
  //   return JSON.stringify(d);
  // }

  private _buildSavePayload(): string {
    const d = this.ChequesInBankForm.getRawValue();
    d.pchequecleardate = this._commonService.getFormatDateNormal(d.pchequecleardate);
    d.ptransactiondate = this._commonService.getFormatDateNormal(new Date());
    d.global_schema = this._commonService.getschemaname();
    d.branch_schema = this._commonService.getbranchname();
    d.company_code = this._commonService.getCompanyCode();
    d.branch_code = this._commonService.getBranchCode();
    d.schemaname = this._commonService.getschemaname();
    return JSON.stringify(d);
  }

  
  // Clear() {
  //   const today = new Date();
  //   const yesterday = new Date();
  //   yesterday.setDate(yesterday.getDate() - 1);

  //   this.ChequesInBankForm.reset({
  // ptransactiondate: { value: today, disabled: true },
  // pchequecleardate: today,
  //     bankname: null,
  //     pfrombrsdate: yesterday,
  //     ptobrsdate: today,
  //     schemaname: this._commonService.getschemaname(),
  //     searchtext: '',
  //     receipttype: 'Adjusted',
  //     auto_brs_type: 'Upload'
  //   });
  //   this.BrsDateForm.reset({ frombrsdate: yesterday, tobrsdate: today });

  //   this.bankid = 0;
  //   this.bankname = '';
  //   this.bankbalance = 0;
  //   this.bankbalancetype = '';
  //   this.brsdate = '';
  //   this.banknameshowhide = false;
  //   // Reset bank validation on clear
  //   this.ChequesInBankValidation = {};

  //   this.gridData = []; this.gridDatatemp = [];
  //   this.ChequesInBankData = []; this.ChequesClearReturnData = [];
  //   this.modeofreceipt = 'ALL'; this.status = 'onlinereceipts';
  //   this.selectedTab = 'onlinereceipts';
  //   this._searchText = ''; this.fromdate = ''; this.todate = '';
  //   this.preferdrows = false;
  //   this.amounttotal = 0; this.selectedamt = 0;
  //   this.brsdateshowhidecleared = false; this.brsdateshowhidereturned = false;
  //   this.pageSetUp(); this.GetBankBalance(this.bankid);
  //   this.cdr.markForCheck();
  // }

  // ── Duplicate / Validation helpers ────────────────────────────────────────────
  //   Clear() {
  //   const today = new Date();
  //   const yesterday = new Date();
  //   yesterday.setDate(yesterday.getDate() - 1);

  //   this.ChequesInBankForm.reset({
  //     ptransactiondate: today,
  //     pchequecleardate: today,
  //     bankname: null,
  //     pfrombrsdate: yesterday,
  //     ptobrsdate: today,
  //     schemaname: this._commonService.getschemaname(),
  //     searchtext: '',
  //     receipttype: 'Adjusted',
  //     auto_brs_type: 'Upload'
  //   });
  //   this.ChequesInBankForm.get('ptransactiondate')?.disable();

  //   this.BrsDateForm.reset({ frombrsdate: yesterday, tobrsdate: today });
  //   this.chequeClearDateModel = new Date();
  // this.brsFromDateModel = new Date(new Date().setDate(new Date().getDate() - 1));
  // this.brsToDateModel = new Date();
  // this.brsReturnFromDateModel = new Date(new Date().setDate(new Date().getDate() - 1));
  // this.brsReturnToDateModel = new Date();

  //   this.bankid = 0;
  //   this.bankname = '';
  //   this.bankbalance = 0;
  //   this.bankbalancetype = '';
  //   this.brsdate = '';
  //   this.banknameshowhide = false;
  //   this.ChequesInBankValidation = {};
  // this.chequeClearDateModel = new Date();
  //   this.gridData = []; this.gridDatatemp = [];
  //   this.ChequesInBankData = []; this.ChequesClearReturnData = [];
  //   this.modeofreceipt = 'ALL'; this.status = 'onlinereceipts';
  //   this.selectedTab = 'onlinereceipts';
  //   this._searchText = ''; this.fromdate = ''; this.todate = '';
  //   this.preferdrows = false;
  //   this.amounttotal = 0; this.selectedamt = 0;
  //   this.brsdateshowhidecleared = false; this.brsdateshowhidereturned = false;
  //   this.pageSetUp(); this.GetBankBalance(this.bankid);
  //   this.cdr.markForCheck();
  // }

  // Clear() {
  //   const today = new Date();

  //   this.ChequesInBankForm.reset({
  //     ptransactiondate: today,
  //     pchequecleardate: today,
  //     bankname: null,
  //     pfrombrsdate: today,
  //     ptobrsdate: today,
  //     schemaname: this._commonService.getschemaname(),
  //     searchtext: '',
  //     receipttype: 'Adjusted',
  //     auto_brs_type: 'Upload'
  //   });
  //   this.ChequesInBankForm.get('ptransactiondate')?.disable();

  //   this.BrsDateForm.reset({ frombrsdate: today, tobrsdate: today });

  //   this.chequeClearDateModel = new Date();
  //   this.brsFromDateModel = new Date();
  //   this.brsToDateModel = new Date();
  //   this.brsReturnFromDateModel = new Date();
  //   this.brsReturnToDateModel = new Date();

  //   this.bankid = 0;
  //   this.bankname = '';
  //   this.bankbalance = 0;
  //   this.bankbalancetype = '';
  //   this.brsdate = '';
  //   this.banknameshowhide = false;
  //   this.ChequesInBankValidation = {};

  //   this.gridData = []; this.gridDatatemp = [];
  //   this.ChequesInBankData = []; this.ChequesClearReturnData = [];
  //   this.modeofreceipt = 'ALL'; this.status = 'onlinereceipts';
  //   this.selectedTab = 'onlinereceipts';
  //   this._searchText = ''; this.fromdate = ''; this.todate = '';
  //   this.preferdrows = false;
  //   this.amounttotal = 0; this.selectedamt = 0;
  //   this.brsdateshowhidecleared = false; this.brsdateshowhidereturned = false;
  //   this.pageSetUp(); this.GetBankBalance(this.bankid);
  //   this.cdr.markForCheck();
  // }

  Clear() {
  const today = new Date();

  // Preserve date values before reset
  const savedChequeClearDate = this.chequeClearDateModel;
  const savedBrsFromDate = this.brsFromDateModel;
  const savedBrsToDate = this.brsToDateModel;
  const savedBrsReturnFromDate = this.brsReturnFromDateModel;
  const savedBrsReturnToDate = this.brsReturnToDateModel;

  this.ChequesInBankForm.reset({
    ptransactiondate: today,
    pchequecleardate: savedChequeClearDate,
    bankname: null,
    pfrombrsdate: savedBrsFromDate,
    ptobrsdate: savedBrsToDate,
    schemaname: this._commonService.getschemaname(),
    searchtext: '',
    receipttype: 'Adjusted',
    auto_brs_type: 'Upload'
  });
  this.ChequesInBankForm.get('ptransactiondate')?.disable();

  this.BrsDateForm.reset({
    frombrsdate: savedBrsReturnFromDate,
    tobrsdate: savedBrsReturnToDate
  });

  // Restore preserved date models
  this.chequeClearDateModel = savedChequeClearDate;
  this.brsFromDateModel = savedBrsFromDate;
  this.brsToDateModel = savedBrsToDate;
  this.brsReturnFromDateModel = savedBrsReturnFromDate;
  this.brsReturnToDateModel = savedBrsReturnToDate;

  this.bankid = 0;
  this.bankname = '';
  this.bankbalance = 0;
  this.bankbalancetype = '';
  this.brsdate = '';
  this.banknameshowhide = false;
  this.ChequesInBankValidation = {};

  this.gridData = []; this.gridDatatemp = [];
  this.ChequesInBankData = []; this.ChequesClearReturnData = [];
  this.modeofreceipt = 'ALL'; this.status = 'onlinereceipts';
  this.selectedTab = 'onlinereceipts';
  this._searchText = ''; this.fromdate = ''; this.todate = '';
  this.preferdrows = false;
  this.amounttotal = 0; this.selectedamt = 0;
  this.brsdateshowhidecleared = false; this.brsdateshowhidereturned = false;
  this.pageSetUp(); this.GetBankBalance(this.bankid);
  this.cdr.markForCheck();
}
  checkDuplicateValueslatest(event: any, rowIndex: any, row: any) {
    const value = event.target.value.trim();
    if (!value) { row.preferencetext = ''; this.gridData = [...this.gridData]; return; }
    let isDuplicate = false;
    this.gridData.forEach(el => {
      if (el.pChequenumber === row.pChequenumber &&
        el.cheque_bank === row.cheque_bank &&
        el.receipt_branch_name === row.receipt_branch_name) {
        if (el.pdepositstatus === true) el.preferencetext = value;
        return;
      }
      if ((el.pdepositstatus === true || el.preturnstatus === true) &&
        el.preferencetext?.toString().trim() !== '' &&
        el.preferencetext?.toString().toLowerCase() === value.toLowerCase())
        isDuplicate = true;
    });
    if (isDuplicate) {
      this._commonService.showWarningMessage('Already Exist');
      row.preferencetext = '';
      const el = document.getElementById('preferencetext' + rowIndex) as HTMLInputElement;
      if (el) el.value = '';
    } else { row.preferencetext = value; }
    this.gridData = [...this.gridData];
  }

  validateDuplicates() {
    const arr = this.gridData.filter(
      el => el.pchequestatus === 'Y' || el.pchequestatus === 'R');
    let count = 0;
    for (let i = 0; i < arr.length; i++)
      for (let k = 0; k < arr.length; k++)
        if (arr[i].pChequenumber !== arr[k].pChequenumber &&
          !this._commonService.isNullOrEmptyString(arr[i].preferencetext) &&
          !this._commonService.isNullOrEmptyString(arr[k].preferencetext) &&
          arr[i].preferencetext === arr[k].preferencetext) count++;
    return count;
  }

  emptyValuesFound() {
    return this.gridData
      .filter(el => el.pdepositstatus === true && el.pchequestatus === 'Y')
      .some(item => !item.preferencetext || item.preferencetext.toString().trim() === '');
  }

  checkValidations(group: FormGroup, isValid: boolean): boolean {
    try {
      Object.keys(group.controls).forEach(key =>
        isValid = this.GetValidationByControl(group, key, isValid));
    } catch (e) { this.showErrorMessage('e'); return false; }
    return isValid;
  }

  GetValidationByControl(formGroup: FormGroup, key: string, isValid: boolean): boolean {
    try {
      const ctrl = formGroup.get(key);
      if (ctrl) {
        if (ctrl instanceof FormGroup) this.checkValidations(ctrl, isValid);
        else if (ctrl.validator) {
          this.ChequesInBankValidation[key] = '';
          if (ctrl.errors || ctrl.invalid || ctrl.touched || ctrl.dirty) {
            const label = (document.getElementById(key) as HTMLInputElement)?.title || key;
            for (const errkey in ctrl.errors) {
              if (errkey) {
                this.ChequesInBankValidation[key] +=
                  this._commonService.getValidationMessage(ctrl, errkey, label, key, '') + ' ';
                isValid = false;
              }
            }
          }
        }
      }
    } catch (e) { this.showErrorMessage('e'); return false; }
    return isValid;
  }

  showErrorMessage(errormsg: string) { this._commonService.showErrorMessage(errormsg); }

  BlurEventAllControll(fromgroup: FormGroup): any {
    try {
      Object.keys(fromgroup.controls).forEach(key => this.setBlurEvent(fromgroup, key));
    } catch (e) { this.showErrorMessage('e'); return false; }
  }

  setBlurEvent(fromgroup: FormGroup, key: string): any {
    try {
      const ctrl = fromgroup.get(key);
      if (ctrl) {
        if (ctrl instanceof FormGroup) this.BlurEventAllControll(ctrl);
        else if (ctrl.validator)
          fromgroup.get(key)?.valueChanges.subscribe(
            () => this.GetValidationByControl(fromgroup, key, true));
      }
    } catch (e) { this.showErrorMessage('e'); return false; }
  }

  // ── Grid status view ──────────────────────────────────────────────────────────

  chequesStatusInfoGrid() {
    const grid: any[] = [];
    for (const d of this.ChequesInBankData) {
      if (d.ptypeofpayment === 'CHEQUE') { d.chequeStatus = 'Deposited'; grid.push(d); }
    }
    for (const d of this.ChequesClearReturnData) {
      if (d.pchequestatus === 'Y') { d.chequeStatus = 'Cleared'; grid.push(d); }
    }
    for (const d of this.ChequesClearReturnData) {
      if (d.pchequestatus === 'R') { d.chequeStatus = 'Returned'; grid.push(d); }
    }
    this.displayGridDataBasedOnForm = grid;
    this.displayGridDataBasedOnFormTemp = JSON.parse(JSON.stringify(grid));
    this.setPageModel2();
    this.pageCriteria.totalrows = grid.length;
    this.pageCriteria.TotalPages = grid.length > this.pageCriteria.pageSize
      ? parseInt((grid.length / this.pageCriteria.pageSize).toString()) + 1 : 1;
    this.pageCriteria.currentPageRows = grid.length < this.pageCriteria.pageSize
      ? grid.length : this.pageCriteria.pageSize;
  }

  // ── Export / Print ────────────────────────────────────────────────────────────

  pdfOrprint(printorpdf: any) {
    if (!this.gridData?.length) {
      this._commonService.showWarningMessage('No data available'); return;
    }
    this.Totlaamount = 0;
    const isCleared = this.pdfstatus === 'Cleared';
    const isReturned = this.pdfstatus === 'Returned';
    const hasDateCol = isCleared || isReturned;
    const headers = [
      'Cheque/\nReference No.', 'Branch Name', 'Amount', 'Receipt ID',
      'Receipt Date', 'Deposited Date',
      ...(hasDateCol ? [isCleared ? 'Cleared Date' : 'Returned Date'] : []),
      'Transaction Mode', 'Cheque Bank Name', 'Cheque Branch Name', 'Party'
    ];
    const colStyles: Record<number, any> = {
      0: { cellWidth: 30, halign: 'center' }, 1: { cellWidth: 35, halign: 'left' },
      2: { cellWidth: 22, halign: 'right' }, 3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' }, 5: { cellWidth: 20, halign: 'center' }
    };
    if (hasDateCol) {
      colStyles[6] = { cellWidth: 20, halign: 'center' };
      colStyles[7] = { cellWidth: 22, halign: 'center' };
      colStyles[8] = { cellWidth: 28, halign: 'left' };
      colStyles[9] = { cellWidth: 24, halign: 'left' };
      colStyles[10] = { cellWidth: 38, halign: 'left' };
    } else {
      colStyles[6] = { cellWidth: 24, halign: 'center' };
      colStyles[7] = { cellWidth: 32, halign: 'left' };
      colStyles[8] = { cellWidth: 28, halign: 'left' };
      colStyles[9] = { cellWidth: 46, halign: 'left' };
    }
    const data: any[][] = [];
    this.gridData.forEach((e: any) => {
      const amt = Number(e?.ptotalreceivedamount || 0); this.Totlaamount += amt;
      data.push([
        e?.pChequenumber || '', e?.pbranchname || '',
        this._commonService.convertAmountToPdfFormat(amt), e?.preceiptid || '',
        e?.preceiptdate ? this._commonService.getFormatDateGlobal(e.preceiptdate) : '',
        e?.pdepositeddate ? this._commonService.getFormatDateGlobal(e.pdepositeddate) : '',
        ...(hasDateCol
          ? [e?.pCleardate ? this._commonService.getFormatDateGlobal(e.pCleardate) : ''] : []),
        e?.ptypeofpayment || '',
        (e?.cheque_bank && e.cheque_bank !== '--NA--') ? e.cheque_bank : '',
        (e?.receipt_branch_name && e.receipt_branch_name !== '--NA--') ? e.receipt_branch_name : '',
        e?.ppartyname || ''
      ]);
    });
    const totalRow: any[] = [
      {
        content: 'Total', colSpan: 2,
        styles: { halign: 'right', fontSize: 12, fontStyle: 'bold', textColor: [0, 0, 0] }
      },
      {
        content: this._commonService.convertAmountToPdfFormat(this.Totlaamount),
        styles: {
          halign: 'right', fontSize: 12, fontStyle: 'bold',
          textColor: [0, 0, 0], cellWidth: 30
        }
      }
    ];
    for (let i = 0; i < headers.length - 3; i++) totalRow.push('');
    data.push(totalRow);
    this._commonService._downloadchequesReportsPdf(
      'Cheques In Bank', data, headers, colStyles, 'landscape',
      this.bankname || '', this.brsdate || '', this.pdfstatus || '', printorpdf, ' ');
  }

  export(): void {
    this.Totlaamount = 0;
    const isCleared = this.pdfstatus === 'Cleared';
    const isReturned = this.pdfstatus === 'Returned';
    const buildRows = (gridData: any[]): any[] => gridData.map((e: any) => {
      const row: Record<string, any> = {
        'Cheque/ Reference No.': e?.pChequenumber || '',
        'Branch Name': e?.pbranchname || '',
        'Amount': e?.ptotalreceivedamount
          ? this._commonService.removeCommasInAmount(e.ptotalreceivedamount) : '',
        'Receipt Id': e?.preceiptid || '',
        'Receipt Date': e?.preceiptdate
          ? this._commonService.getFormatDateGlobal(e.preceiptdate) : '',
        'Deposited Date': e?.pdepositeddate
          ? this._commonService.getFormatDateGlobal(e.pdepositeddate) : '',
      };
      if (isCleared) row['Cleared Date'] = e?.pCleardate
        ? this._commonService.getFormatDateGlobal(e.pCleardate) : '';
      if (isReturned) row['Returned Date'] = e?.pCleardate
        ? this._commonService.getFormatDateGlobal(e.pCleardate) : '';
      row['Transaction Mode'] = e?.ptypeofpayment || '';
      row['Cheque Bank Name'] = e?.cheque_bank && e.cheque_bank !== '--NA--'
        ? e.cheque_bank : '';
      row['Cheque Branch Name'] = e?.receipt_branch_name && e.receipt_branch_name !== '--NA--'
        ? e.receipt_branch_name : '';
      row['Party'] = e?.ppartyname || '';
      return row;
    });
    if (isCleared || isReturned) {
      this._commonService.exportAsExcelFile(buildRows(this.gridData), 'Cheques in Bank');
      return;
    }
    this._accountingtransaction.GetChequesInBankData(
      this.bankid, this._commonService.getschemaname(), this._commonService.getbranchname(),
      0, 99999, 'ALL', '', this._commonService.getCompanyCode(), this._commonService.getBranchCode()
    ).subscribe({
      next: (data: any) => {
        let allRows: any[] = data?.pchequesOnHandlist || [];
        if (this.pdfstatus === 'Cheques Deposited')
          allRows = allRows.filter((r: any) => this.bankid === 0
            ? r.ptypeofpayment === 'CHEQUE'
            : r.ptypeofpayment === 'CHEQUE' && r.pdepositbankid == this.bankid);
        else if (this.pdfstatus === 'Online Receipts')
          allRows = allRows.filter((r: any) => this.bankid === 0
            ? r.ptypeofpayment !== 'CHEQUE'
            : r.ptypeofpayment !== 'CHEQUE' && r.pdepositbankid == this.bankid);
        this._commonService.exportAsExcelFile(buildRows(allRows), 'Cheques in Bank');
      },
      error: (err: any) => this._commonService.showErrorMessage(err)
    });
  }

  // ── PDF generation ────────────────────────────────────────────────────────────

  pdfContentData() {
    if (!this.previewdetails.length) return;
    const lMargin = 15, rMargin = 15;
    const doc = new jsPDF('p', 'mm', 'a4');
    const Companyreportdetails = this._commonService._getCompanyDetails();
    const today = this._commonService.getFormatDateGlobal(new Date());
    const kapil_logo = this._commonService.getKapilGroupLogo();
    const address = this._commonService.getcompanyaddress();
    this.previewdetails.forEach((obj: any, idx: number) => {
      if (idx > 0) doc.addPage();
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFont('times', 'normal');
      if (kapil_logo) doc.addImage(kapil_logo, 'JPEG', 10, 5, 30, 20);
      doc.setFontSize(12); doc.text(Companyreportdetails.pCompanyName, 72, 10);
      doc.setFontSize(8);
      doc.text(address?.substr(0, 115) ?? '', 110, 15, { align: 'center' });
      doc.text(address?.substring(115) ?? '', 110, 18);
      if (Companyreportdetails?.pCinNo)
        doc.text('CIN : ' + Companyreportdetails.pCinNo, 90, 22);
      doc.setFontSize(14);
      doc.text('Cheque Return Invoice', pageWidth / 2, 30, { align: 'center' });
      doc.setFontSize(12); doc.text('To,', 30, 55);
      const ExportRightSideData = [
        obj.psubscribername?.trim() + ', ', (obj.paddress ?? '') + '.'];
      this._commonService.addWrappedText({
        text: ExportRightSideData, textWidth: 100, doc, fontSize: 10,
        fontType: 'normal', lineSpacing: 5, xPosition: 30,
        initialYPosition: 60, pageWrapInitialYPosition: 10
      });
      doc.text(['Date  : ' + today], 160, 45);
      doc.text('Dear Sir / Madam', 15, 90);
      doc.text('SUB : NOTICE REGARDING RETURN OF YOUR CHEQUE.', 55, 97);
      const chitno = doc.splitTextToSize(obj.pchitno ?? '', 120);
      doc.text('Ref : Chit No. : ', 55, 104); doc.text(chitno, 85, 104);
      const Content =
        `We regret to inform you that your cheque No : ${obj.preferencenumber} ` +
        `dated : ${this._commonService.getFormatDateGlobal(obj.pchequedate)} ` +
        `for Rs. ${this._commonService.convertAmountToPdfFormat(obj.ptotalreceivedamount)} ` +
        `drawn on : ${obj.pbankname}  towards subscription to the above Chit : ` +
        `${obj.pchitno} has been returned by your bank unpaid.\n\n` +
        `Kindly arrange payment of the amount of the cheque in cash or demand draft ` +
        `together with penality of Rs. ` +
        `${this._commonService.convertAmountToPdfFormat(obj.pchequereturnchargesamount)} ` +
        `and Bank Charges immediately on receipt of this letter.\n\n` +
        `Please note that our Official Receipt No. ${obj.preceiptid} ` +
        `Date : ${this._commonService.getFormatDateGlobal(obj.pchequedate)} ` +
        `issued in this regard stands cancelled. Henceforth payment may be made ` +
        `either in cash or by D.D only.\n\n` +
        `Please note that under the provision of Section 138B of Negotiable Instruments ` +
        `Act we can/will initiate legal proceeding against you if you fail to pay within ` +
        `Fifteen days from the date of this notice.\n\n` +
        `We hope you will not allow us to initiate the above proceedings.\n\n` +
        `We request your immediate response.\n\n`;
      doc.text(doc.splitTextToSize(Content, (pageWidth - lMargin - rMargin)),
        15, 115 + (chitno.length ? 3 : 0));
      doc.text('Yours faithfully,', 165, 200);
      doc.text('For ' + Companyreportdetails.pCompanyName, 115, 207);
      doc.text('Manager', 165, 220);
    });
    doc.save('Cheque Return Invoice.pdf');
  }

  chequereturnvoucherpdf() {
    if (!this.chequerwturnvoucherdetails.length) return;
    const doc = new jsPDF();
    const Companyreportdetails = this._commonService._getCompanyDetails();
    const today = this._commonService.getFormatDateGlobal(new Date());
    const kapil_logo = this._commonService.getKapilGroupLogo();
    const address = this._commonService.getcompanyaddress();
    this.todayDate = this.datepipe.transform(this.today, 'dd-MMM-yyyy h:mm:ss a');
    this.chequerwturnvoucherdetails.forEach((obj: any, idx: number) => {
      if (idx > 0) doc.addPage();
      doc.setFont('times', 'normal'); doc.setFontSize(12); doc.setTextColor(0, 0, 0);
      if (kapil_logo) doc.addImage(kapil_logo, 'JPEG', 10, 5, 30, 20);
      doc.text(Companyreportdetails.pCompanyName, 72, 10);
      doc.setFontSize(8);
      doc.text(address.substr(0, 115), 110, 15, { align: 'center' });
      doc.text('' + address.substring(115) + '', 110, 18);
      if (!isNullOrEmptyString(Companyreportdetails.pCinNo))
        doc.text('CIN : ' + Companyreportdetails.pCinNo + '', 90, 22);
      doc.setFontSize(14); doc.text('Cheque Return Voucher', 92, 30);
      doc.setFontSize(12);
      doc.text(['Date  : ' + today], 160, 48);
      doc.text('Printed On  :  ' + this.todayDate, 15, 40);
      doc.text('Voucher No. : ' + obj.pvoucherno + '', 15, 48);
      doc.text('Debit To       : ' + obj.pdebitaccountname + '', 15, 55);
      doc.text('Bank             : ' + obj.pcreditaccountname + '', 15, 62);
      doc.rect(15, 135, 30, 12, 'S');
      doc.text('Manager', 55, 145);
      doc.text('Accounts Officer', 110, 145);
      doc.text('Cashier', 180, 145);
      doc.text('Amount In Words :  Rupees ' +
        this.titleCase(this.numbertowords.transform(obj.ptotalreceivedamount)) + ' Only.',
        15, 125);
      const bodygrid: any[] = [
        ['Cheque No.', obj.preferencenumber],
        ['Cheque Date', this._commonService.getFormatDateGlobal(obj.pchequedate)],
        ['Bank', obj.pbankname], ['Branch', obj.pbranchname],
        ['Receipt No.', obj.preceiptid],
        ['Receipt Date', this._commonService.getFormatDateGlobal(obj.pchequedate)],
        [{
          content: 'Amount', colSpan: 1,
          styles: { halign: 'right', fontSize: 8, fontStyle: 'bold' }
        },
        this._commonService.currencyFormat(obj.ptotalreceivedamount)]
      ];
      autoTable(doc, {
        tableLineColor: [0, 0, 0], tableLineWidth: 0.1,
        columns: ['PARTICULARS', ''], body: bodygrid, theme: 'grid',
        headStyles: {
          fillColor: this._commonService.pdfProperties('Header Color1'),
          halign: this._commonService.pdfProperties('Header Alignment') as any,
          fontSize: 9, textColor: 0
        },
        styles: {
          cellPadding: 1, fontSize: 10, cellWidth: 'wrap',
          overflow: 'linebreak', textColor: 0
        },
        columnStyles: {
          0: { cellWidth: 'wrap', halign: 'left' },
          1: { cellWidth: 'wrap', halign: 'right' }
        },
        startY: 69, margin: { right: 35, left: 35 }
      });
    });
    doc.save('Cheque Return Voucher.pdf');
  }

  titleCase(str: any) {
    return str.toLowerCase().split(' ')
      .map((w: string) => w.charAt(0).toUpperCase() + w.substring(1)).join(' ');
  }

  // ── AutoBRS ───────────────────────────────────────────────────────────────────

  AutoBrs() {
    if (this.ChequesInBankForm.controls['bankname'].value) {
      this.status = 'autobrs'; this.modeofreceipt = 'ONLINE-AUTO';
      this.brsdateshowhidereturned = false; this.saveshowhide = true;
      this.GetChequesInBank_load(this.bankid);
    } else {
      this._commonService.showWarningMessage('Please Select Bank');
      this.gridData = [];
    }
  }

  onFileChange(evt: any) {
    this.PreDefinedAutoBrsArrayData = [];
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (target.files.length !== 1) throw new Error('Cannot use multiple files');
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const wb = XLSX.read(e.target.result, { type: 'binary', cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      this.Exceldata = (<AOA>XLSX.utils.sheet_to_json(ws, { header: 1 })).splice(1);
      this.PreDefinedAutoBrsArrayData = this.Exceldata.map((row: any) => ({
        transactiondate: new Date((row[0] - 25569) * 86400000),
        chqueno: row[1], chequeamount: row[2],
        preferencetext: row[3], preceiptype: row[4], uploadtype: row[5]
      }));
      this.PreDefinedAutoBrsArrayData = [...this.PreDefinedAutoBrsArrayData];
      this.saveshowhide = false;
    };
    reader.readAsBinaryString(target.files[0]);
  }

  DownloadExcelforPreDefinedBidAmount(): void {
    const ws = XLSX.utils.aoa_to_sheet(this.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AutoBrs');
    XLSX.writeFile(wb, this.fileName);
  }

  saveAutoBrs() {
    let valid = false; let items: any[] = [];
    if (this.auto_brs_type_name === 'Upload') {
      valid = Array.isArray(this.PreDefinedAutoBrsArrayData) &&
        this.PreDefinedAutoBrsArrayData.length > 0;
      items = JSON.parse(JSON.stringify(this.PreDefinedAutoBrsArrayData));
    } else if (this.auto_brs_type_name === 'Pending') {
      items = JSON.parse(JSON.stringify(
        this.PreDefinedAutoBrsArrayData.filter((x: any) => x.check)));
      valid = items.length > 0;
    }
    if (valid) {
      if (confirm('Do you want to save ?')) {
        items.forEach((el: any) => {
          el.transactiondate = this._commonService.getFormatDateNormal(el.transactiondate);
          el.ptranstype = el.preceiptype; el.preceiptype = el.uploadtype;
        });
        const newobj = {
          pchequesOnHandlist: items,
          schemaname: this._commonService.getschemaname(),
          auto_brs_type_name: this.auto_brs_type_name
        };
        this.saveAutoBrsBool = true;
        this._accountingtransaction.SaveAutoBrsdataupload(JSON.stringify(newobj)).subscribe(
          (res: any) => {
            this.saveAutoBrsBool = false;
            if (res) {
              setTimeout(() => this._commonService.showSuccessMessage());
              this.PreDefinedAutoBrsArrayData = [];
            } else {
              setTimeout(() => this._commonService.showWarningMessage('Not Saved!!'));
            }
          },
          (error: any) => {
            setTimeout(() => this._commonService.showErrorMessage(error));
            this.saveAutoBrsBool = false;
          }
        );
      }
    } else {
      setTimeout(() => this._commonService.showWarningMessage('No Data to Save'));
    }
  }

  auto_brs_typeChange(event: any) {
    this.PreDefinedAutoBrsArrayData = []; this.auto_brs_type_name = event;
  }

  BankUploadExcel() { this.saveshowhide = false; this.PreDefinedAutoBrsArrayData = []; }

  getAutoBrs(type: any) {
    this.PreDefinedAutoBrsArrayData = [];
    this._accountingtransaction.GetPendingautoBRSDetails(
      this._commonService.getbranchname(), type, this._commonService.getschemaname(),
      this._commonService.getBranchCode(), this._commonService.getCompanyCode()
    ).subscribe({
      next: (res: any) => {
        this.PreDefinedAutoBrsArrayData = (res || []).map((x: any, i: number) => ({
          ...x, chqueno: x.pChequenumber, chequeamount: x.ptotalreceivedamount,
          uploadtype: x.preceiptype, preceiptype: x.pmodofreceipt, index: i, check: false
        }));
        this.PreDefinedAutoBrsArrayData = [...this.PreDefinedAutoBrsArrayData];
      },
      error: (error: any) => setTimeout(() => this._commonService.showErrorMessage(error))
    });
  }

  checkbox_pending_data(row: any, event: any) {
    this.PreDefinedAutoBrsArrayData[row.index]['check'] = event.target.checked;
  }

  autoBrsCheckedClear(event: any, row: any) {
    this.selectedamt = 0;
    if (event.target.checked) {
      const chequecleardate = this.ChequesInBankForm.controls['pchequecleardate'].value;
      if (new Date(chequecleardate).getTime() >= new Date().getTime()) {
        this._searchText = row.pChequenumber?.toString() || '';
        this.gridLoading.set(true);
        this._accountingtransaction.GetChequesInBankData(
          this.bankid, this._commonService.getschemaname(), this._commonService.getbranchname(),
          0, 99999, this.modeofreceipt, this._searchText,
          this._commonService.getCompanyCode(), this._commonService.getBranchCode()
        ).subscribe((res: any) => {
          this.autoBrsDuplicates = res?.pchequesOnHandlist || [];
          for (const d of this.autoBrsDuplicates)
            if (d.pChequenumber == row.pChequenumber && d.pchequedate == row.pchequedate)
              this.autoBrsData.push(d);
          this.selectedamt = this.autoBrsData
            .reduce((s: number, c: any) => s + (c.ptotalreceivedamount || 0), 0);
          this.gridLoading.set(false);
        });
      } else {
        this._commonService.showWarningMessage(
          'Cheque Clear Date Should be Greater than or Equal to Deposited Date');
        this.gridLoading.set(false);
        event.target.checked = false; row.pdepositstatus = false;
        this.selectedamt = this.autoBrsData
          .reduce((s: number, c: any) => s + (c.ptotalreceivedamount || 0), 0);
      }
    } else {
      this.autoBrsData = this.autoBrsData.filter(
        (x: any) => x.pChequenumber !== row.pChequenumber);
      this.selectedamt = this.autoBrsData
        .reduce((s: number, c: any) => s + (c.ptotalreceivedamount || 0), 0);
    }
  }

  receipttypeChange(event: any) {
    if (event != undefined) this.receiptmode = event.value === 'Adjusted' ? 'CH' : 'I';
  }

  loadingDataonClearSearch(event: any) {
    if (event.target.value === '') {
      this._searchText = ''; this.modeofreceipt = 'ALL';
      this.GridColumnsHide(); this.GetChequesInBank_load(this.bankid);
    }
  }
}

function isNullOrEmptyString(value: any): boolean {
  return value === null || value === undefined ||
    value === '' || value.toString().trim() === '';
}

// 12345