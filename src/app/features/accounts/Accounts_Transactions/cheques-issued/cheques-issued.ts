import { ChangeDetectorRef, Component, Input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';

import * as XLSX from 'xlsx';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { DatePickerModule } from 'primeng/datepicker';

type AOA = any[][];

interface PageCriteria {
  pageSize: number; offset: number; pageNumber: number;
  footerPageHeight: number; totalrows: number; TotalPages: number;
  currentPageRows: number; CurrentPage?: number;
}
interface Page {
  totalElements: number; pageSize: number; pageNumber: number;
  offset: number; size: number; totalPages: number;
}
interface ChequesIssuedRow {
  preceiptrecordid?: any; pUpiname?: string; pUpiid?: string;
  pBankconfigurationId?: string; pBankName?: string; ptranstype?: string;
  ptypeofpayment?: string; pChequenumber?: string; pchequedate?: any;
  pchequedepositdate?: any; pchequecleardate?: any; pbankid?: any;
  branchid?: any; pCardNumber?: string; pdepositbankid?: any;
  pdepositbankname?: string; pAccountnumber?: string; challanaNo?: string;
  preceiptid?: any; preceiptdate?: any; pmodofreceipt?: string;
  ptotalreceivedamount: number; pnarration?: string; ppartyname?: string;
  partyname?: string; ppartyid?: any; pistdsapplicable?: boolean;
  pTdsSection?: string; pTdsPercentage?: string; ptdsamount?: number;
  ptdscalculationtype?: string; ppartypannumber?: string; ppartyreftype?: string;
  ppartyreferenceid?: string; preceiptslist?: any[]; pFilename?: string;
  pFilepath?: string; pFileformat?: string; pCleardate?: any;
  pdepositeddate?: any; ptdsaccountid?: string; pTdsSectionId?: string;
  groupcode?: string; preceiptno?: string; formname?: string;
  chitpaymentid?: string; adjustmentid?: string; pdepositstatus?: boolean;
  pcancelstatus?: boolean; preturnstatus?: boolean; pbranchname?: string;
  pchequestatus?: string; pcancelcharges?: string; pactualcancelcharges?: string;
  pledger?: string; cancelstatus?: string; returnstatus?: string;
  clearstatus?: string; chqueno?: string; issueddate?: any;
  chitgroupcode?: string; chitgroupid?: any; ticketno?: any;
  chequeamount?: any; zpdaccountid?: string; installmentno?: string;
  schemesubscriberid?: string; contactid?: string; schemetype?: string;
  checksentryrecordid?: string; cheque_bank?: string; selfchequestatus?: string;
  branch_name?: string; receipt_branch_name?: string; subscriber_details?: string;
  chitReceiptNo?: string; total_count?: string; transactionNo?: string;
  transactiondate?: any; chitstatus?: string; chitgroupstatus?: string;
  receiptnumbers?: string; pdepositedBankid?: string; pdepositedBankName?: string;
  preferencetext?: string; preceiptype?: string; puploadeddate?: any;
  subscriberbankaccountno?: string; pkgmsreceiptdate?: any; chequeStatus?: string;
  pCreatedby?: any; pipaddress?: string; pclearstatus?: boolean;[key: string]: any;
}
type ActiveTabType =
  | 'all' | 'chequesissued' | 'onlinepayment' | 'cleared' | 'returned'
  | 'cancelled' | 'autobrs' | 'autobrsupload' | 'other' | 'bankfileupload';


@Component({
  selector: "app-cheques-issued",
  imports: [CommonModule, CurrencyPipe, NgSelectModule, TableModule, CheckboxModule,
    FormsModule, ReactiveFormsModule, DatePickerModule],
  templateUrl: "./cheques-issued.html",
})
export class ChequesIssued implements OnInit {

  @Input() fromFormName: any;

  // ── Signals ────────────────────────────────────────────────────────────────
  tabsShowOrHideBasedOnfromFormName = signal<boolean>(false);
  amounttotal = signal<any>(0);
  showicons = signal<boolean>(false);
  gridData = signal<ChequesIssuedRow[]>([]);
  gridLoading = signal<boolean>(false);
  all = signal<any>(0);
  chequesissued = signal<any>(0);
  onlinepayments = signal<any>(0);
  currencySymbol = signal<any>('');
  cleared = signal<any>(0);
  returned = signal<any>(0);
  cancelled = signal<any>(0);
  selectedBankName = signal<any>('');
  bankbalance = signal<any>(0);
  bankbalancetype = signal<any>('');
  brsdate = signal<any>('');
  bankList = signal<any[]>([]);
  ChequesIssuedValidation = signal<any>({});
  activeTab = signal<ActiveTabType>('all');
  status = signal<ActiveTabType>('all');
  brsdateshowhidecleared = signal<boolean>(false);
  brsdateshowhidereturned = signal<boolean>(false);
  brsdateshowhidecancelled = signal<boolean>(false);
  showhidegridcolumns = signal<boolean>(false);
  showhidegridcolumns2 = signal<boolean>(false);
  saveshowhide = signal<boolean>(true);
  validatebrsdatecancel = signal<boolean>(false);
  validatebrsdatereturn = signal<boolean>(false);
  validatebrsdateclear = signal<boolean>(false);
  transactionDate = signal<Date>(new Date());
  hiddendate = signal<boolean>(true);
  datetitle = signal<any>('');
  buttonname = signal<string>('Save');
  disablesavebutton = signal<boolean>(false);
  showOrHideOtherChequesGrid = signal<boolean>(false);
  showOrHideAllChequesGrid = signal<boolean>(false);
  showOrHideChequesIssuedGrid = signal<boolean>(false);
  OtherChequesData = signal<any[]>([]);
  displayAllChequesDataBasedOnForm = signal<any[]>([]);
  boolforAutoBrs = signal<boolean>(false);
  auto_brs_type_name = signal<string>('Upload');
  saveAutoBrsBool = signal<boolean>(false);
  PreDefinedAutoBrsArrayData = signal<any[]>([]);
  banknameshowhide = signal<boolean>(false);
  pageCriteria = signal<PageCriteria>({
    pageSize: 10, offset: 0, pageNumber: 1,
    footerPageHeight: 50, totalrows: 0, TotalPages: 0, currentPageRows: 0
  });
  pageCriteria2 = signal<PageCriteria>({
    pageSize: 10, offset: 0, pageNumber: 1,
    footerPageHeight: 50, totalrows: 0, TotalPages: 0, currentPageRows: 0
  });

  // ── Plain fields ───────────────────────────────────────────────────────────
  schemaname: any;
  gridDatatemp: ChequesIssuedRow[] = [];
  BanksList: any[] = [];
  ChequesIssuedData: ChequesIssuedRow[] = [];
  OtherChequesDataTemp: any[] = [];
  ChequesClearReturnData: ChequesIssuedRow[] = [];
  DataForSaving: any[] = [];
  dataTemp: ChequesIssuedRow[] = [];
  displayAllChequesDataBasedOnFormTemp: any[] = [];
  validate = false;
  bankbalancedetails: any = { pfrombrsdate: null, ptobrsdate: null };
  bankdetails: any;
  bankid: any = 0;
  bankname: any = '';
  todayDate: Date = new Date();
  pdfstatus = 'All';
  checkbox = false;
  tabname = '';
  pageSize = 10;
  totalElements = 0;
  page: Page = { totalElements: 0, pageSize: 10, pageNumber: 0, offset: 0, size: 10, totalPages: 0 };
  startindex = 0;
  endindex = 10;
  modeofreceipt = 'ALL';
  _searchText = '';
  fromdate: any = null;
  todate: any = null;
  _countData: any = {};
  companydetails: any;
  data: AOA = [['Date', 'UTR Number', 'amount', 'referencetext']];
  wopts: XLSX.WritingOptions = { bookType: 'xlsx', type: 'array' };
  fileName = 'AutoBrs.xlsx';
  Exceldata: any[] = [];
  dpConfig: any = {};
  brsfromConfig: any = {};
  brstoConfig: any = {};
  today = new Date();
  clearMinToDate = new Date(1900, 0, 1);
  returnMinToDate = new Date(1900, 0, 1);
  cancelMinToDate = new Date(1900, 0, 1);
  showBankUploadSection = false;
  otherChequesCount: any = 0;
  ChequesIssuedForm!: FormGroup;
  BrsReturnForm!: FormGroup;
  BrsCancelForm!: FormGroup;

  constructor(
    private _accountingtransaction: AccountsTransactions,
    private _commonService: CommonService,
    private fb: FormBuilder,
    private datepipe: DatePipe,
    private cdr: ChangeDetectorRef
  ) {
    this.dpConfig.maxDate = new Date();
    this.dpConfig.dateInputFormat = 'DD-MMM-YYYY';
    this.brsfromConfig.dateInputFormat = 'DD-MMM-YYYY';
    this.brsfromConfig.maxDate = new Date();
    this.brstoConfig.dateInputFormat = 'DD-MMM-YYYY';
    this.brstoConfig.maxDate = new Date();
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private safeBank(b: any): number {
    return (b !== null && b !== undefined && b !== '') ? Number(b) : 0;
  }
  private safeSearch(s: any): string {
    return (s && s !== '') ? s : '';
  }

  private toDateObject(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    const str = String(value).trim();
    if (!str || str === 'NA' || str === 'null' || str === 'undefined') return null;
    const dmySlash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmySlash) {
      const d = new Date(+dmySlash[3], +dmySlash[2] - 1, +dmySlash[1]);
      return isNaN(d.getTime()) ? null : d;
    }
    const dmyDash = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dmyDash) {
      const d = new Date(+dmyDash[3], +dmyDash[2] - 1, +dmyDash[1]);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
    try {
      const fromDb = this._commonService.getDateObjectFromDataBase(str);
      if (fromDb instanceof Date && !isNaN(fromDb.getTime())) return fromDb;
    } catch { /* ignore */ }
    return null;
  }

  private normalizeDates(row: any): any {
    const dateFields = [
      'preceiptdate', 'pdepositeddate', 'pCleardate', 'pchequedate',
      'pchequedepositdate', 'pchequecleardate', 'issueddate',
      'transactiondate', 'puploadeddate', 'pkgmsreceiptdate'
    ];
    dateFields.forEach(f => { if (row[f] !== undefined) row[f] = this.toDateObject(row[f]); });
    return row;
  }

  private buildTodayBrsDate(): string {
    const t = new Date();
    return t.getDate().toString().padStart(2, '0') + '-' +
      t.toLocaleString('en-US', { month: 'short' }) + '-' +
      t.getFullYear();
  }

  private safeBrsDate(value: any, fallback: 'today' | 'yesterday' = 'today'): Date {
    const parsed = this.toDateObject(value);
    if (parsed) return parsed;
    try {
      const fs = this._commonService.getDateObjectFromDataBase(value);
      if (fs instanceof Date && !isNaN(fs.getTime())) return fs;
    } catch { /* ignore */ }
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (fallback === 'yesterday') d.setDate(d.getDate() - 1);
    return d;
  }

  private getBrsFromToDates(): { fromDateVal: Date; toDateVal: Date } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { fromDateVal: today, toDateVal: today };
  }

  // ── Grid helpers ───────────────────────────────────────────────────────────

  private buildGrid(s: ChequesIssuedRow[]): ChequesIssuedRow[] {
    return (!this.bankid || this.bankid === 0) ? s : s.filter(r => r.pdepositbankid === this.bankid);
  }
  private buildGridByType(s: ChequesIssuedRow[], type: string, exclude = false): ChequesIssuedRow[] {
    return this.buildGrid(s).filter(r => exclude ? r.ptypeofpayment !== type : r.ptypeofpayment === type);
  }
  private buildGridByChequeStatus(s: ChequesIssuedRow[], stat: 'P' | 'R' | 'C'): ChequesIssuedRow[] {
    return this.buildGrid(s).filter(r => r.pchequestatus === stat);
  }
  private applyGridData(grid: ChequesIssuedRow[]): void {
    const copy = JSON.parse(JSON.stringify(grid));
    this.gridData.set(copy);
    this.gridDatatemp = copy;
    this.showicons.set(copy.length > 0);
    this.amounttotal.set(copy.reduce((s: number, r: ChequesIssuedRow) => s + (r.ptotalreceivedamount || 0), 0));
    this.dataTemp = JSON.parse(JSON.stringify(grid));
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.todayDate = new Date();
    this.pageSetUp();
    this.companydetails = JSON.parse(sessionStorage.getItem('companydetails') || '{}');
    this.currencySymbol.set(this._commonService.currencysymbol);
    this.fromdate = null;
    this.todate = null;

    this.ChequesIssuedForm = this.fb.group({
      ptransactiondate: [new Date(), Validators.required],
      bankname: [null, Validators.required],
      pfrombrsdate: [new Date()],
      ptobrsdate: [new Date()],
      pchequesOnHandlist: [], SearchClear: [''], pCreatedby: [''],
      schemaname: [this._commonService.getschemaname()],
      pipaddress: [this._commonService.getIpAddress()],
      auto_brs_type: ['Upload']
    });
    this.BrsReturnForm = this.fb.group({ frombrsdate: [''], tobrsdate: [''] });
    this.BrsCancelForm = this.fb.group({ frombrsdate: [''], tobrsdate: [''] });

    this.bankid = 0;
    this.bankname = '';
    this.selectedBankName.set('');
    this.bankbalance.set(0);
    this.bankbalancetype.set('');
    this.brsdate.set('');
    this.banknameshowhide.set(false);
    this.ChequesIssuedValidation.set({});

    this._accountingtransaction.GetBankntList(
      this._commonService.getbranchname(), this._commonService.getschemaname(),
      this._commonService.getCompanyCode(), this._commonService.getBranchCode()
    ).subscribe((res: any) => {
      this.bankList.set(res?.banklist || res || []);
      this.GetBankBalance(this.bankid);
    });

    this._accountingtransaction.GetBanksntList(
      this._commonService.getbranchname(), this._commonService.getschemaname(),
      this._commonService.getCompanyCode(), this._commonService.getBranchCode()
    ).subscribe({
      next: (banks: any) => (this.BanksList = banks || []),
      error: (err: any) => this._commonService.showErrorMessage(err)
    });

    this.setPageModel();
    this.setPageModel2();
    this.GetBankBalance(this.bankid);
    this.GetChequesIssued_Load(this.bankid);

    if (this.fromFormName === 'fromChequesStatusInformationForm') {
      this.tabsShowOrHideBasedOnfromFormName.set(false);
      this.showOrHideOtherChequesGrid.set(true);
      this.showOrHideAllChequesGrid.set(true);
      this.showOrHideChequesIssuedGrid.set(false);
    } else {
      this.tabsShowOrHideBasedOnfromFormName.set(true);
      this.showOrHideOtherChequesGrid.set(false);
      this.showOrHideAllChequesGrid.set(false);
      this.showOrHideChequesIssuedGrid.set(true);
    }
    this.boolforAutoBrs.set(this.companydetails?.pisautobrsimpsapplicable ?? true);
  }

  // ── Pagination ─────────────────────────────────────────────────────────────

  setPageModel(): void {
    this.pageCriteria.update(c => ({
      ...c,
      pageSize: this._commonService.pageSize,
      offset: 0, pageNumber: 1, footerPageHeight: 50
    }));
  }
  setPageModel2(): void {
    this.pageCriteria2.update(c => ({
      ...c,
      pageSize: this._commonService.pageSize,
      offset: 0, pageNumber: 1, footerPageHeight: 50
    }));
  }
  onFooterPageChange(event: { page: number }): void {
    this.pageCriteria.update(c => {
      const offset = event.page - 1;
      const currentPageRows = c.totalrows < event.page * c.pageSize
        ? c.totalrows % c.pageSize : c.pageSize;
      return { ...c, offset, CurrentPage: event.page, currentPageRows };
    });
  }
  pageSetUp(): void {
    this.page.offset = 0;
    this.page.pageNumber = 1;
    this.page.size = this._commonService.pageSize || 10;
    this.startindex = 0;
    this.endindex = this.page.size;
    this.page.totalElements = 5;
    this.page.totalPages = 1;
  }
  setPage(pageInfo: any, event: any): void {
    this.page.offset = event.page - 1;
    this.page.pageNumber = pageInfo.page;
    this.endindex = this.page.pageNumber * this.page.size;
    this.startindex = this.endindex - this.page.size;
    if (this.fromdate && this.todate) {
      this.GetDataOnBrsDates1(this.fromdate, this.todate, this.bankid);
    } else {
      this.GetChequesIssued(this.bankid, this.startindex, this.page.size, '');
    }
  }

  // ── Bank balance ───────────────────────────────────────────────────────────

  GetBankBalance(bankid: any): void {
    this._accountingtransaction.GetBankBalance(
      this.datepipe.transform(new Date(), 'yyyy-MM-dd') || '', bankid,
      this._commonService.getbranchname(), this._commonService.getBranchCode(),
      this._commonService.getCompanyCode()
    ).subscribe((bankdetails: any) => {
      this.bankbalancedetails = bankdetails || { pfrombrsdate: null, ptobrsdate: null };

      if (this.bankid === 0) {
        const totalBalance = (this.bankList() ?? [])
          .reduce((sum: number, bank: any) => sum + (bank.pbankbalance ?? 0), 0);
        if (totalBalance < 0) {
          this.bankbalance.set(Math.abs(totalBalance));
          this.bankbalancetype.set('Cr');
        } else if (totalBalance === 0) {
          this.bankbalance.set(0);
          this.bankbalancetype.set('');
        } else {
          this.bankbalance.set(totalBalance);
          this.bankbalancetype.set('Dr');
        }
      } else {
        const bal = this.bankbalancedetails._BankBalance ?? 0;
        this.bankbalance.set(bal < 0 ? Math.abs(bal) : bal);
        this.bankbalancetype.set(bal < 0 ? 'Cr' : bal === 0 ? '' : 'Dr');
      }

      this.brsdate.set(this.buildTodayBrsDate());

      // Only patch BRS dates when not on cleared/returned/cancelled tabs
      // (those tabs manage their own date forms)
      if (this.activeTab() !== 'cleared' &&
        this.activeTab() !== 'returned' &&
        this.activeTab() !== 'cancelled') {
        const fromDate = this.safeBrsDate(this.bankbalancedetails.pfrombrsdate, 'yesterday');
        const toDate = this.safeBrsDate(this.bankbalancedetails.ptobrsdate, 'today');
        this.ChequesIssuedForm.patchValue({ pfrombrsdate: fromDate, ptobrsdate: toDate });
        this.BrsReturnForm.patchValue({ frombrsdate: fromDate, tobrsdate: toDate });
        this.BrsCancelForm.patchValue({ frombrsdate: fromDate, tobrsdate: toDate });
        this.clearMinToDate = fromDate;
        this.returnMinToDate = fromDate;
        this.cancelMinToDate = fromDate;
      }
    });
  }

  onBankChange(bank: any): void {
    if (bank === null || bank === undefined) {
      this.selectedBankName.set('');
      this.bankname = '';
      this.bankbalance.set(0);
      this.bankbalancetype.set('');
      this.brsdate.set('');
      this.bankid = 0;
      this.banknameshowhide.set(false);
      this.bankbalancedetails = { pfrombrsdate: null, ptobrsdate: null };
      this.gridData.set([]);
      this.ChequesIssuedValidation.update(v => ({ ...v, bankname: '' }));
      return;
    }

    const bankName: string = (bank?.pbankname || bank?.pdepositbankname || '') as string;
    const bankId: any = bank?.pbankid ?? 0;
    if (!bankName || !bankId) return;

    this.selectedBankName.set(bankName);
    this.bankname = bankName;
    this.bankid = bankId;
    this.banknameshowhide.set(true);

    const bal: number = bank?.pbankbalance ?? 0;
    if (bal < 0) { this.bankbalance.set(Math.abs(bal)); this.bankbalancetype.set('Cr'); }
    else if (bal === 0) { this.bankbalance.set(0); this.bankbalancetype.set(''); }
    else { this.bankbalance.set(bal); this.bankbalancetype.set('Dr'); }

    this.brsdate.set(this.buildTodayBrsDate());
    this.ChequesIssuedValidation.update(v => ({ ...v, bankname: '' }));

    const formattedDate: string =
      this.datepipe.transform(this.ChequesIssuedForm.value?.ptransactiondate, 'yyyy-MM-dd') || '';

    if (!formattedDate) {
      this.GetChequesIssued_Load(this.bankid);
      return;
    }

    this._accountingtransaction
      .GetBankBalance(formattedDate, bankId,
        this._commonService.getbranchname(),
        this._commonService.getBranchCode(),
        this._commonService.getCompanyCode())
      .subscribe({
        next: (res: any) => {
          this.bankbalancedetails = {
            pfrombrsdate: res?.pfrombrsdate ?? null,
            ptobrsdate: res?.ptobrsdate ?? null,
          };
          const fromDateBank = this.safeBrsDate(res?.pfrombrsdate, 'yesterday');
          const toDateBank = this.safeBrsDate(res?.ptobrsdate, 'today');
          this.ChequesIssuedForm.patchValue({ pfrombrsdate: fromDateBank, ptobrsdate: toDateBank });
          this.BrsReturnForm.patchValue({ frombrsdate: fromDateBank, tobrsdate: toDateBank });
          this.BrsCancelForm.patchValue({ frombrsdate: fromDateBank, tobrsdate: toDateBank });
          this.clearMinToDate = fromDateBank;
          this.returnMinToDate = fromDateBank;
          this.cancelMinToDate = fromDateBank;
          this.GetChequesIssued_Load(this.bankid);
        },
        error: (err: any) => {
          this._commonService.showErrorMessage(err);
          this.GetChequesIssued_Load(this.bankid);
        },
      });
  }

  // ── Date change guards ─────────────────────────────────────────────────────

  change_date(_event: any): void { /* guard future date if needed */ }

  onClearFromDateChange(date: Date): void {
    if (date) {
      this.clearMinToDate = new Date(date);
      const t = this.ChequesIssuedForm.value.ptobrsdate;
      if (t && new Date(t) < new Date(date)) this.ChequesIssuedForm.patchValue({ ptobrsdate: null });
    }
  }
  onReturnFromDateChange(date: Date): void {
    if (date) {
      this.returnMinToDate = new Date(date);
      const t = this.BrsReturnForm.value.tobrsdate;
      if (t && new Date(t) < new Date(date)) this.BrsReturnForm.patchValue({ tobrsdate: null });
    }
  }
  onCancelFromDateChange(date: Date): void {
    if (date) {
      this.cancelMinToDate = new Date(date);
      const t = this.BrsCancelForm.value.tobrsdate;
      if (t && new Date(t) < new Date(date)) this.BrsCancelForm.patchValue({ tobrsdate: null });
    }
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  /**
   * Initial load — fetches cheques + row counts in parallel then delegates
   * to the correct tab's *1() method to apply the grid.
   */
  GetChequesIssued_Load(bankid: any): void {
    this.gridData.set([]);
    this.gridLoading.set(true);
    const bank = this.safeBank(bankid);
    const search = this.safeSearch(this._searchText);

    forkJoin([
      this._accountingtransaction.GetChequesIssued(
        bank, this._commonService.getbranchname(),
        this.startindex, this.endindex, this.modeofreceipt, search,
        this._commonService.getschemaname(), this._commonService.getBranchCode(),
        this._commonService.getCompanyCode()
      ),
      this._accountingtransaction.GetChequesRowCount(
        bank, this._commonService.getschemaname(), this._commonService.getbranchname(),
        search, 'CHEQUESISSUED', this.modeofreceipt,
        this._commonService.getCompanyCode(), this._commonService.getBranchCode()
      )
    ]).subscribe({
      next: ([data, count]: any) => {
        this.gridLoading.set(false);
        this._storeApiResponse(data);
        this._countData = count || {};
        this.CountOfRecords();
        this._applyTabGrid();
        if (this.fromFormName === 'fromChequesStatusInformationForm') {
          this.chequesStatusInfoGridForChequesIssued();
        }
        this.totalElements = +(count?.total_count || 0);
        this.page.totalElements = this.totalElements;
        if (this.page.totalElements > 10) {
          this.page.totalPages = Math.ceil(this.page.totalElements / 10);
        }
      },
      error: (err: any) => {
        this.gridLoading.set(false);
        this._commonService.showErrorMessage(err);
      }
    });
  }

  /**
   * Paginated load — fetches cheques for a specific page then delegates
   * to the correct tab's *1() method to apply the grid.
   */
  GetChequesIssued(bankid: any, startindex: number, endindex: number, _searchText: string): void {
    this.gridLoading.set(true);
    const bank = this.safeBank(bankid);
    const search = this.safeSearch(this._searchText);

    this._accountingtransaction.GetChequesIssued(
      bank, this._commonService.getbranchname(),
      startindex ?? 0, endindex ?? 10, this.modeofreceipt, search,
      this._commonService.getschemaname(), this._commonService.getBranchCode(),
      this._commonService.getCompanyCode()
    ).subscribe({
      next: (data: any) => {
        this.gridLoading.set(false);
        this._storeApiResponse(data);
        if (data?._countData) { this._countData = data._countData; this.CountOfRecords(); }
        this._applyTabGrid();
        if (this.fromFormName === 'fromChequesStatusInformationForm') {
          this.chequesStatusInfoGridForChequesIssued();
        }
      },
      error: (err: any) => {
        this.gridLoading.set(false);
        this._commonService.showErrorMessage(err);
      }
    });
  }

  /** Store parsed API arrays into component properties. */
  private _storeApiResponse(data: any): void {
    console.log('API response', data);
    this.ChequesIssuedData = (data?.pchequesOnHandlist || []).map((i: any) => this.normalizeDates(i));
    this.ChequesClearReturnData = (data?.pchequesclearreturnlist || []).map((i: any) => this.normalizeDates(i));
    this.OtherChequesData.set(data?.pchequesotherslist || []);
    this.OtherChequesDataTemp = [...this.OtherChequesData()];
    this.otherChequesCount = this.OtherChequesData().length;
  }

  /**
   * FIX: Single dispatcher — called AFTER data is stored.
   * Eliminates the race condition where *() methods called applyGridData()
   * synchronously before the API response arrived.
   */
  private _applyTabGrid(): void {
    const s = this.status();
    if (s === 'all') this.All1();
    else if (s === 'chequesissued') this.ChequesIssued1();
    else if (s === 'onlinepayment') this.OnlinePayments1();
    else if (s === 'cleared') this.Cleared1();
    else if (s === 'returned') this.Returned1();
    else if (s === 'cancelled') this.Cancelled1();
    else if (s === 'autobrs') this.autoBrs();
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  onSearch(event: any): void {
    const searchText = event?.toString() || '';
    this._searchText = searchText;
    if (this.fromFormName === 'fromChequesStatusInformationForm') {
      if (this.tabname === 'Other') {
        const filtered = searchText
          ? this._commonService.transform(this.OtherChequesDataTemp, searchText, '')
          : this.OtherChequesDataTemp;
        this.OtherChequesData.set(filtered);
        this.pageCriteria.update(c => ({
          ...c, totalrows: filtered.length,
          TotalPages: Math.ceil(filtered.length / c.pageSize) || 1,
          currentPageRows: Math.min(c.pageSize, filtered.length)
        }));
      } else {
        const filtered = searchText
          ? this._commonService.transform(this.displayAllChequesDataBasedOnFormTemp, searchText, '')
          : this.displayAllChequesDataBasedOnFormTemp;
        this.displayAllChequesDataBasedOnForm.set(filtered);
        this.pageCriteria.update(c => ({
          ...c, totalrows: filtered.length,
          TotalPages: Math.ceil(filtered.length / c.pageSize) || 1,
          currentPageRows: Math.min(c.pageSize, filtered.length)
        }));
      }
    } else {
      this.pageSetUp();
      this.GetChequesIssued_Load(this.bankid);
      const filtered = searchText
        ? this._commonService.transform(this.gridDatatemp, searchText, '')
        : this.gridDatatemp;
      this.gridData.set(filtered);
      this.amounttotal.set(
        filtered.reduce((s: number, c: ChequesIssuedRow) => s + (c.ptotalreceivedamount || 0), 0)
      );
      this.CountOfRecords();
    }
  }

  // ── Count ──────────────────────────────────────────────────────────────────

  CountOfRecords(): void {
    this.all.set(this._countData['total_count'] || 0);
    this.onlinepayments.set(this._countData['others_count'] || 0);
    this.chequesissued.set(this._countData['cheques_count'] || 0);
    this.cleared.set(this._countData['clear_count'] || 0);
    this.returned.set(this._countData['return_count'] || 0);
    this.cancelled.set(this._countData['cancel_count'] || 0);
  }



  All(): void {
    this.activeTab.set('all');
    this.status.set('all');
    this.pdfstatus = 'All';
    this.modeofreceipt = 'ALL';
    this.fromdate = null;
    this.todate = null;
    this._resetBrsDateVisibility();
    this._showMainGrid();
    this.fromFormName === 'fromChequesStatusInformationForm' ? this.GridColumnsHide() : this.GridColumnsShow();
    this.pageSetUp();
    this.GetChequesIssued_Load(this.bankid);
  }

  All1(): void {
    this.activeTab.set('all');
    this.status.set('all');
    this.pdfstatus = 'All';
    this.modeofreceipt = 'ALL';
    this._resetBrsDateVisibility();
    this._showMainGrid();
    this.fromFormName === 'fromChequesStatusInformationForm' ? this.GridColumnsHide() : this.GridColumnsShow();

    const grid: ChequesIssuedRow[] = this.bankid === 0
      ? [...this.ChequesIssuedData]
      : this.ChequesIssuedData.filter(d => d?.pdepositbankid == this.bankid);
    this._setGrid(grid);
    this._updatePageTotals(this._countData['total_count'] || grid.length);
  }



  ChequesIssued(): void {
    this.activeTab.set('chequesissued');
    this.status.set('chequesissued');
    this.pdfstatus = 'Cheques Issued';
    this.modeofreceipt = 'ALL';
    this.fromdate = null;
    this.todate = null;
    this._resetBrsDateVisibility();
    this._showMainGrid();
    this.fromFormName === 'fromChequesStatusInformationForm'
      ? this.GridColumnsHide()
      : this.GridColumnsShow();
    this.pageSetUp();
    this.GetChequesIssued_Load(this.bankid);
  }



  ChequesIssued1(): void {
    this.activeTab.set('chequesissued');
    this.status.set('chequesissued');
    this.pdfstatus = 'Cheques Issued';
    this.modeofreceipt = 'CHEQUE';
    this._resetBrsDateVisibility();
    this._showMainGrid();
    this.fromFormName === 'fromChequesStatusInformationForm'
      ? this.GridColumnsHide() : this.GridColumnsShow();
    const grid: ChequesIssuedRow[] = this.bankid === 0
      ? [...this.ChequesIssuedData]
      : this.ChequesIssuedData.filter(d => d?.pdepositbankid == this.bankid);

    this._setGrid(grid);
    this._updatePageTotals(this._countData['cheques_count'] || grid.length);
  }


  OnlinePayments(): void {
    this.activeTab.set('onlinepayment');
    this.status.set('onlinepayment');
    this.pdfstatus = 'Online Payments';
    this.modeofreceipt = 'ONLINE';
    this.fromdate = null;
    this.todate = null;
    this._resetBrsDateVisibility();
    this._showMainGrid();
    this.fromFormName === 'fromChequesStatusInformationForm' ? this.GridColumnsHide() : this.GridColumnsShow();
    this.pageSetUp();
    this.GetChequesIssued(this.bankid, this.startindex, this.endindex, this._searchText);
  }

  OnlinePayments1(): void {
    this.activeTab.set('onlinepayment');
    this.status.set('onlinepayment');
    this.pdfstatus = 'Online Payments';
    this.modeofreceipt = 'ONLINE';
    this._resetBrsDateVisibility();
    this._showMainGrid();
    this.fromFormName === 'fromChequesStatusInformationForm' ? this.GridColumnsHide() : this.GridColumnsShow();
    this.applyGridData(this.buildGridByType(this.ChequesIssuedData, 'CHEQUE', true));
    this._updatePageTotals(this._countData['others_count'] || 0);
  }

  /**
   * FIX: Cleared() — sets up UI state and fires API call only.
   * Grid population is handled exclusively by Cleared1() after the response.
   */
  Cleared(): void {
    this.activeTab.set('cleared');
    this.status.set('cleared');
    this.datetitle.set('Cleared Date');
    this.pdfstatus = 'Cleared';
    this.modeofreceipt = 'CLEAR';

    this._showMainGrid();
    this.brsdateshowhidecleared.set(true);
    this.brsdateshowhidereturned.set(false);
    this.brsdateshowhidecancelled.set(false);
    this._hideActionColumns();

    this.gridData.set([]);
    this.amounttotal.set(0);
    this.fromdate = null;
    this.todate = null;
    this.today = new Date();
    this.clearMinToDate = new Date(1900, 0, 1);

    const { fromDateVal, toDateVal } = this.getBrsFromToDates();
    this.ChequesIssuedForm.patchValue({ pfrombrsdate: fromDateVal, ptobrsdate: toDateVal });
    this.clearMinToDate = fromDateVal;
    this.pageSetUp();

    // API response → _applyTabGrid() → Cleared1() populates the grid
    this.GetChequesIssued(this.bankid, this.startindex, this.endindex, this._searchText);
  }


  Cleared1(): void {
    this.activeTab.set('cleared');
    this.status.set('cleared');
    this.datetitle.set('Cleared Date');
    this.pdfstatus = 'Cleared';
    this.modeofreceipt = 'CLEAR';

    this._showMainGrid();
    this.brsdateshowhidecleared.set(true);
    this.brsdateshowhidereturned.set(false);
    this.brsdateshowhidecancelled.set(false);
    this._hideActionColumns();

    const { fromDateVal, toDateVal } = this.getBrsFromToDates();
    this.ChequesIssuedForm.patchValue({ pfrombrsdate: fromDateVal, ptobrsdate: toDateVal });
    this.clearMinToDate = fromDateVal;

    // Only take cleared records from ChequesClearReturnData (they have pCleardate)
    const cleared = this.buildGridByChequeStatus(this.ChequesClearReturnData, 'P');

    this.applyGridData(cleared);
    this._updatePageTotals(this._countData['clear_count'] || cleared.length);
  }

  /**
   * FIX: Returned() — sets up UI state and fires API call only.
   * Grid population is handled exclusively by Returned1() after the response.
   */
  Returned(): void {
    this.activeTab.set('returned');
    this.status.set('returned');
    this.datetitle.set('Returned Date');
    this.pdfstatus = 'Returned';
    this.modeofreceipt = 'RETURN';

    this._showMainGrid();
    this.brsdateshowhidereturned.set(true);
    this.brsdateshowhidecleared.set(false);
    this.brsdateshowhidecancelled.set(false);
    this._hideActionColumns();

    this.gridData.set([]);
    this.amounttotal.set(0);
    this.fromdate = null;
    this.todate = null;
    this.today = new Date();
    this.returnMinToDate = new Date(1900, 0, 1);

    const { fromDateVal, toDateVal } = this.getBrsFromToDates();
    this.BrsReturnForm.patchValue({ frombrsdate: fromDateVal, tobrsdate: toDateVal });
    this.returnMinToDate = fromDateVal;
    this.pageSetUp();


    this.GetChequesIssued(this.bankid, this.startindex, this.endindex, this._searchText);
  }

  Returned1(): void {
    this.activeTab.set('returned');
    this.status.set('returned');
    this.datetitle.set('Returned Date');
    this.pdfstatus = 'Returned';
    this.modeofreceipt = 'RETURN';

    this._showMainGrid();
    this.brsdateshowhidereturned.set(true);
    this.brsdateshowhidecleared.set(false);
    this.brsdateshowhidecancelled.set(false);
    this._hideActionColumns();

    const { fromDateVal, toDateVal } = this.getBrsFromToDates();
    this.BrsReturnForm.patchValue({ frombrsdate: fromDateVal, tobrsdate: toDateVal });
    this.returnMinToDate = fromDateVal;


    const grid: ChequesIssuedRow[] = this.bankid === 0
      ? this.ChequesClearReturnData.filter(i => i.pchequestatus === 'R')
      : this.ChequesClearReturnData.filter(i => i.pchequestatus === 'R' && i.pdepositbankid == this.bankid);
    this._setGrid(grid);
    this._updatePageTotals(this._countData['return_count'] || grid.length);
  }

  /**
   * FIX: Cancelled() — sets up UI state and fires API call only.
   * Grid population is handled exclusively by Cancelled1() after the response.
   */
  Cancelled(): void {
    this.activeTab.set('cancelled');
    this.status.set('cancelled');
    this.datetitle.set('Cancelled Date');
    this.pdfstatus = 'Cancelled';
    this.modeofreceipt = 'CANCEL';
    this.tabname = 'Cancelled';

    this._showMainGrid();
    this.brsdateshowhidereturned.set(false);
    this.brsdateshowhidecleared.set(false);
    this.brsdateshowhidecancelled.set(true);
    this._hideActionColumns();

    this.gridData.set([]);
    this.amounttotal.set(0);
    this.fromdate = null;
    this.todate = null;
    this.today = new Date();
    this.cancelMinToDate = new Date(1900, 0, 1);

    const { fromDateVal, toDateVal } = this.getBrsFromToDates();
    this.BrsCancelForm.patchValue({ frombrsdate: fromDateVal, tobrsdate: toDateVal });
    this.cancelMinToDate = fromDateVal;
    this.pageSetUp();

    // API response → _applyTabGrid() → Cancelled1() populates the grid
    this.GetChequesIssued(this.bankid, this.startindex, this.endindex, this._searchText);
  }

  Cancelled1(): void {
    this.activeTab.set('cancelled');
    this.status.set('cancelled');
    this.datetitle.set('Cancelled Date');
    this.pdfstatus = 'Cancelled';
    this.modeofreceipt = 'CANCEL';
    this.tabname = 'Cancelled';

    this._showMainGrid();
    this.brsdateshowhidereturned.set(false);
    this.brsdateshowhidecleared.set(false);
    this.brsdateshowhidecancelled.set(true);
    this._hideActionColumns();

    const { fromDateVal, toDateVal } = this.getBrsFromToDates();
    this.BrsCancelForm.patchValue({ frombrsdate: fromDateVal, tobrsdate: toDateVal });
    this.cancelMinToDate = fromDateVal;

    // ChequesClearReturnData is already populated by _storeApiResponse()
    this.applyGridData(this.buildGridByChequeStatus(this.ChequesClearReturnData, 'C'));
    this._updatePageTotals(this._countData['cancel_count'] || 0);
  }

  otherCheques(): void {
    this._accountingtransaction.DataFromBrsDatesForOtherChequesDetails(null, null, this.bankid).subscribe({
      next: (data: any) => {
        this.tabname = 'OtherCheques';
        const list = data['pchequesotherslist'] || [];
        this.OtherChequesData.set(list);
        this.OtherChequesDataTemp = [...list];
        this.otherChequesCount = list.length;
        this.showOrHideOtherChequesGrid.set(true);
        this.showOrHideAllChequesGrid.set(false);
        this.showOrHideChequesIssuedGrid.set(false);
        this.brsdateshowhidereturned.set(false);
        this.brsdateshowhidecleared.set(false);
        this.brsdateshowhidecancelled.set(true);
        this.pageCriteria.update(c => ({
          ...c, totalrows: list.length,
          TotalPages: Math.ceil(list.length / c.pageSize) || 1,
          currentPageRows: Math.min(c.pageSize, list.length)
        }));
      },
      error: (err: any) => this._commonService.showErrorMessage(err)
    });
  }

  allCheques(): void {
    this._showAllChequesGrid();
    this._resetBrsDateVisibility();
    this.chequesStatusInfoGridForChequesIssued();
  }

  autoBrs(): void {
    this.gridDatatemp = [];
    this.gridData.set([...this.ChequesIssuedData]);
    this.dataTemp = JSON.parse(JSON.stringify(this.gridData()));
    const updated = this.gridData().map(e => ({ ...e, pdepositstatus: true, pchequestatus: 'P' }));
    this.gridData.set(updated);
    this.amounttotal.set(this.gridData().reduce((s: number, r: ChequesIssuedRow) => s + (r.ptotalreceivedamount || 0), 0));
    this._updatePageTotals(this._countData['cheques_count'] || 0);
  }

  // ── UI state helpers ───────────────────────────────────────────────────────

  private _resetBrsDateVisibility(): void {
    this.brsdateshowhidecleared.set(false);
    this.brsdateshowhidereturned.set(false);
    this.brsdateshowhidecancelled.set(false);
  }
  private _showMainGrid(): void {
    this.showOrHideOtherChequesGrid.set(false);
    this.showOrHideAllChequesGrid.set(false);
    this.showOrHideChequesIssuedGrid.set(true);
  }
  private _showAllChequesGrid(): void {
    this.showOrHideOtherChequesGrid.set(false);
    this.showOrHideAllChequesGrid.set(true);
    this.showOrHideChequesIssuedGrid.set(false);
  }
  private _hideActionColumns(): void {
    this.showhidegridcolumns.set(true);
    this.showhidegridcolumns2.set(true);
    this.saveshowhide.set(false);
    this.hiddendate.set(false);
  }
  private _setGrid(grid: ChequesIssuedRow[]): void {
    this.gridData.set(JSON.parse(JSON.stringify(grid)));
    this.gridDatatemp = [...this.gridData()];
    this.showicons.set(this.gridData().length > 0);
    this.amounttotal.set(this.gridData().reduce((s, c) => s + (c.ptotalreceivedamount || 0), 0));
    this.dataTemp = JSON.parse(JSON.stringify(grid));
  }
  private _updatePageTotals(count: number): void {
    this.totalElements = count;
    this.page.totalElements = count;
    this.page.totalPages = count > 10 ? Math.ceil(count / (this.page.size || 10)) : 1;
  }

  GridColumnsShow(): void {
    this.showhidegridcolumns.set(false);
    this.showhidegridcolumns2.set(false);
    this._resetBrsDateVisibility();
    this.saveshowhide.set(true);
    this.hiddendate.set(true);
  }
  GridColumnsHide(): void {
    this.showhidegridcolumns.set(true);
    this.showhidegridcolumns2.set(true);
    this.saveshowhide.set(false);
    this.hiddendate.set(false);
  }

  isSaveVisible(): boolean {
    return !['cleared', 'returned', 'cancelled'].includes(this.activeTab());
  }

  // ── Bank select (legacy HTML select) ──────────────────────────────────────

  SelectBank(event: any): void {
    const value = event?.target?.value;
    if (!value) {
      this.bankid = 0; this.bankname = ''; this.banknameshowhide.set(false);
      this.selectedBankName.set(''); this.bankbalance.set(0); this.bankbalancetype.set(''); this.brsdate.set('');
      this.bankbalancedetails = { pfrombrsdate: null, ptobrsdate: null };
      this.ChequesIssuedValidation.update(v => ({ ...v, bankname: '' }));
    } else {
      this.banknameshowhide.set(true);
      this.bankdetails = this.BanksList.find((b: any) => b.pdepositbankname === value);
      this.bankid = this.bankdetails?.pbankid; this.bankname = this.bankdetails?.pdepositbankname;
      this.selectedBankName.set(this.bankdetails?.pdepositbankname);
      const bal = this.bankdetails?.pbankbalance ?? 0;
      if (bal < 0) { this.bankbalance.set(Math.abs(bal)); this.bankbalancetype.set('Cr'); }
      else if (bal === 0) { this.bankbalance.set(0); this.bankbalancetype.set(''); }
      else { this.bankbalance.set(bal); this.bankbalancetype.set('Dr'); }
      this.ChequesIssuedValidation.update(v => ({ ...v, bankname: '' }));
      this.brsdate.set(this.buildTodayBrsDate());
    }
    this.GetChequesIssued_Load(this.bankid);
    this.ChequesIssuedForm.patchValue({ SearchClear: '' });
    this.CountOfRecords();
  }

  // ── BRS date filter ────────────────────────────────────────────────────────

  OnBrsDateChanges(fromdate: any, todate: any): void {
    this.validate = new Date(fromdate).setHours(0, 0, 0, 0) > new Date(todate).setHours(0, 0, 0, 0);
  }

  ShowBrsClear(): void {
    this.gridData.set([]); this.cleared.set(0); this._searchText = '';
    const fromdate = this.ChequesIssuedForm.controls['pfrombrsdate'].value;
    const todate = this.ChequesIssuedForm.controls['ptobrsdate'].value;
    if (fromdate != null && todate != null) {
      this.OnBrsDateChanges(fromdate, todate);
      if (!this.validate) {
        this.fromdate = this.datepipe.transform(fromdate, 'MM/dd/yyyy') || '';
        this.todate = this.datepipe.transform(todate, 'MM/dd/yyyy') || '';
        this.validatebrsdateclear.set(false); this.pageSetUp();
        this.GetDataOnBrsDates(this.fromdate, this.todate, this.bankid);
      } else { this.validatebrsdateclear.set(true); }
    } else { this._commonService.showWarningMessage('select fromdate and todate'); }
  }

  ShowBrsReturn(): void {
    this.gridData.set([]); this.returned.set(0); this._searchText = '';
    const fromdate = this.BrsReturnForm.controls['frombrsdate'].value;
    const todate = this.BrsReturnForm.controls['tobrsdate'].value;
    if (fromdate != null && todate != null) {
      this.OnBrsDateChanges(fromdate, todate);
      if (!this.validate) {
        this.fromdate = this.datepipe.transform(fromdate, 'MM/dd/yyyy') || '';
        this.todate = this.datepipe.transform(todate, 'MM/dd/yyyy') || '';
        this.validatebrsdatereturn.set(false); this.pageSetUp();
        this.GetDataOnBrsDates(this.fromdate, this.todate, this.bankid);
      } else { this.validatebrsdatereturn.set(true); }
    } else { this._commonService.showWarningMessage('select fromdate and todate'); }
  }

  ShowBrsCancel(): void {
    this._searchText = '';
    const fromdate = this.BrsCancelForm.controls['frombrsdate'].value;
    const todate = this.BrsCancelForm.controls['tobrsdate'].value;
    if (fromdate != null && todate != null) {
      this.OnBrsDateChanges(fromdate, todate);
      if (!this.validate) {
        this.fromdate = this.datepipe.transform(fromdate, 'MM/dd/yyyy') || '';
        this.todate = this.datepipe.transform(todate, 'MM/dd/yyyy') || '';
        this.validatebrsdatecancel.set(false);
        if (this.tabname === 'Cancelled') {
          this.gridData.set([]); this.cancelled.set(0); this.pageSetUp();
          this.GetDataOnBrsDates(this.fromdate, this.todate, this.bankid);
        } else if (this.tabname === 'OtherCheques') {
          this.GetDataOnBrsDatesForOtherCheques(this.fromdate, this.todate, this.bankid);
        }
      } else { this.validatebrsdatecancel.set(true); }
    } else { this._commonService.showWarningMessage('select fromdate and todate'); }
  }

  // ── Reset / Clear ──────────────────────────────────────────────────────────

  // Clear(): void {

  //   this.ChequesIssuedForm.reset({
  //     ptransactiondate: new Date(),
  //     bankname: null,
  //     pfrombrsdate: new Date(),
  //     ptobrsdate: new Date(),
  //     pchequesOnHandlist: null, SearchClear: '', pCreatedby: '',
  //     schemaname: this._commonService.getschemaname(),
  //     pipaddress: this._commonService.getIpAddress(), auto_brs_type: 'Upload'
  //   });
  //   this.BrsReturnForm.reset({ frombrsdate: '', tobrsdate: '' });
  //   this.BrsCancelForm.reset({ frombrsdate: '', tobrsdate: '' });

  //   this.bankid = 0; this.bankname = '';
  //   this.selectedBankName.set(''); this.bankbalance.set(0); this.bankbalancetype.set(''); this.brsdate.set('');
  //   this.banknameshowhide.set(false); this.ChequesIssuedValidation.set({});
  //   this.bankbalancedetails = { pfrombrsdate: null, ptobrsdate: null };

  //   this.gridData.set([]); this.gridDatatemp = [];
  //   this.ChequesIssuedData = []; this.ChequesClearReturnData = [];
  //   this.OtherChequesData.set([]); this.OtherChequesDataTemp = [];
  //   this.DataForSaving = []; this.dataTemp = [];
  //   this.modeofreceipt = 'ALL'; this.status.set('all'); this.activeTab.set('all');
  //   this._searchText = ''; this.fromdate = null; this.todate = null;
  //   this.amounttotal.set(0);
  //     this.todayDate = new Date();
  //   this.clearMinToDate = new Date();
  //   this.returnMinToDate = new Date();
  //   this.cancelMinToDate = new Date();
  //   this._resetBrsDateVisibility();
  //   this.validatebrsdateclear.set(false);
  //   this.validatebrsdatereturn.set(false);
  //   this.validatebrsdatecancel.set(false);
  //   this.buttonname.set('Save'); this.disablesavebutton.set(false);
  //   this.pageSetUp();
  //   this.GetBankBalance(this.bankid);
  //   this.GetChequesIssued_Load(this.bankid);
  // }


  Clear(): void {
    const today = new Date();

    // Reset forms
    this.ChequesIssuedForm.reset();

    // ✅ KEY FIX: reset the standalone ngModel variable
    this.transactionDateValue = new Date();
    this.todayDate = new Date();

    // Patch form values (non-datepicker fields)
    this.ChequesIssuedForm.patchValue({
      ptransactiondate: today,
      bankname: null,
      pchequesOnHandlist: null,
      SearchClear: '',
      pCreatedby: '',
      schemaname: this._commonService.getschemaname(),
      pipaddress: this._commonService.getIpAddress(),
      auto_brs_type: 'Upload'
    });

    this.BrsReturnForm.reset({ frombrsdate: '', tobrsdate: '' });
    this.BrsCancelForm.reset({ frombrsdate: '', tobrsdate: '' });

    // ... all your other resets ...
    this.bankid = 0;
    this.bankname = '';
    this.selectedBankName.set('');
    this.bankbalance.set(0);
    this.bankbalancetype.set('');
    this.brsdate.set('');
    this.banknameshowhide.set(false);
    this.ChequesIssuedValidation.set({});
    this.bankbalancedetails = { pfrombrsdate: null, ptobrsdate: null };
    this.gridData.set([]);
    this.gridDatatemp = [];
    this.ChequesIssuedData = [];
    this.ChequesClearReturnData = [];
    this.OtherChequesData.set([]);
    this.DataForSaving = [];
    this.dataTemp = [];
    this.modeofreceipt = 'ALL';
    this.status.set('all');
    this.activeTab.set('all');
    this._searchText = '';
    this.fromdate = null;
    this.todate = null;
    this.amounttotal.set(0);
    this.clearMinToDate = today;
    this.returnMinToDate = today;
    this.cancelMinToDate = today;
    this._resetBrsDateVisibility();
    this.validatebrsdateclear.set(false);
    this.validatebrsdatereturn.set(false);
    this.validatebrsdatecancel.set(false);
    this.buttonname.set('Save');
    this.disablesavebutton.set(false);
    this.pageSetUp();

    // ✅ Force change detection THEN call APIs
    this.cdr.detectChanges();

    this.GetBankBalance(this.bankid);
    this.GetChequesIssued_Load(this.bankid);
  }

  // ── BRS date-range data fetch ──────────────────────────────────────────────

  // GetDataOnBrsDates(frombrsdate: any, tobrsdate: any, bankid: any): void {
  //   const bank = this.safeBank(bankid);
  //   const search = this.safeSearch(this._searchText);
  //   forkJoin([
  //     this._accountingtransaction.DataFromBrsDatesChequesIssued(
  //       frombrsdate, tobrsdate, bank, this.modeofreceipt, search, this.startindex, this.endindex, ''),
  //     this._accountingtransaction.GetChequesRowCount(
  //       bank, this._commonService.getschemaname(), this._commonService.getbranchname(),
  //       search, 'CHEQUESISSUED', this.modeofreceipt,
  //       this._commonService.getCompanyCode(), this._commonService.getBranchCode())
  //   ]).subscribe({
  //     next: ([clearreturndata, countdata]: any) => {
  //       const list: ChequesIssuedRow[] = (clearreturndata?.pchequesclearreturnlist || [])
  //         .map((i: any) => this.normalizeDates(i));
  //       const s = this.status();
  //       const filtered = list.filter((r: ChequesIssuedRow) =>
  //         (s === 'cleared' && r.pchequestatus === 'P') ||
  //         (s === 'cancelled' && r.pchequestatus === 'C') ||
  //         (s === 'returned' && r.pchequestatus === 'R')
  //       );
  //       this._countData = countdata || {};
  //       this.CountOfRecords();
  //       this.gridData.set(filtered);
  //       const key = s === 'cleared' ? 'clear_count' : s === 'returned' ? 'return_count' : 'cancel_count';
  //       this._updatePageTotals(this._countData[key] || 0);
  //     },
  //     error: (err: any) => this._commonService.showErrorMessage(err)
  //   });
  // }

  GetDataOnBrsDates(frombrsdate: any, tobrsdate: any, bankid: any): void {
    const bank = this.safeBank(bankid);
    const search = this.safeSearch(this._searchText);

    forkJoin([
      this._accountingtransaction.DataFromBrsDatesChequesIssued(
        frombrsdate, tobrsdate, bank, this.modeofreceipt, search,
        this.startindex, this.endindex, ''
      ),
      this._accountingtransaction.GetChequesRowCount(
        bank, this._commonService.getschemaname(), this._commonService.getbranchname(),
        search, 'CHEQUESISSUED', this.modeofreceipt,
        this._commonService.getCompanyCode(), this._commonService.getBranchCode()
      )
    ]).subscribe({
      next: ([clearreturndata, countdata]: any) => {
        console.log('GetDataOnBrsDates response:', clearreturndata);

        const list: ChequesIssuedRow[] = (clearreturndata?.pchequesclearreturnlist || [])
          .map((i: any) => this.normalizeDates(i));

        const s = this.status();
        const filtered = list.filter((r: ChequesIssuedRow) =>
          (s === 'cleared' && r.pchequestatus === 'P') ||
          (s === 'cancelled' && r.pchequestatus === 'C') ||
          (s === 'returned' && r.pchequestatus === 'R')
        );

        this._countData = countdata || {};
        this.CountOfRecords();
        this.gridData.set(filtered);
        this.amounttotal.set(
          filtered.reduce((sum, r) => sum + (r.ptotalreceivedamount || 0), 0)
        );

        const key = s === 'cleared' ? 'clear_count'
          : s === 'returned' ? 'return_count'
            : 'cancel_count';
        this._updatePageTotals(this._countData[key] || filtered.length);
      },
      error: (err: any) => this._commonService.showErrorMessage(err)
    });
  }

  GetDataOnBrsDates1(frombrsdate: any, tobrsdate: any, bankid: any): void {
    this._accountingtransaction.DataFromBrsDatesChequesIssued(
      frombrsdate, tobrsdate, this.safeBank(bankid),
      this.modeofreceipt, this.safeSearch(this._searchText), this.startindex, this.endindex, ''
    ).subscribe({
      next: (clearreturndata: any) => {
        const s = this.status();
        const list: ChequesIssuedRow[] = (clearreturndata?.pchequesclearreturnlist || [])
          .map((i: any) => this.normalizeDates(i));
        this.gridData.set(list.filter((r: ChequesIssuedRow) =>
          (s === 'cleared' && r.pchequestatus === 'P') ||
          (s === 'cancelled' && r.pchequestatus === 'C') ||
          (s === 'returned' && r.pchequestatus === 'R')
        ));
      },
      error: (err: any) => this._commonService.showErrorMessage(err)
    });
  }

  GetDataOnBrsDatesForOtherCheques(frombrsdate: any, tobrsdate: any, bankid: any): void {
    this._accountingtransaction.DataFromBrsDatesForOtherChequesDetails(
      frombrsdate, tobrsdate, this.safeBank(bankid)
    ).subscribe({
      next: (data: any) => {
        const list = (data?.pchequesotherslist || []).map((x: any) => ({ ...x, preferencetext: '' }));
        this.OtherChequesData.set(list);
        this.otherChequesCount = list.length;
        this.pageCriteria.update(c => ({
          ...c, totalrows: list.length,
          TotalPages: Math.ceil(list.length / c.pageSize) || 1,
          currentPageRows: Math.min(c.pageSize, list.length)
        }));
      },
      error: (err: any) => this._commonService.showErrorMessage(err)
    });
  }

  // ── Checkbox actions ───────────────────────────────────────────────────────

  checkedClear(event: any, data: ChequesIssuedRow): void {
    const ro = this._commonService.getDateObjectFromDataBase(data.preceiptdate);
    const td = this.ChequesIssuedForm.controls['ptransactiondate'].value;
    if (event.target.checked) {
      const rt = ro ? new Date(ro).setHours(0, 0, 0, 0) : null;
      const tt = td ? new Date(td).setHours(0, 0, 0, 0) : null;
      if (rt !== null && tt !== null && tt >= rt) {
        data.pdepositstatus = true; data.preturnstatus = false;
        data.pcancelstatus = false; data.pchequestatus = 'P';
      } else {
        data.pclearstatus = false; data.pchequestatus = 'N'; event.target.checked = false;
        this._commonService.showWarningMessage('Transaction Date Should be >= Payment Date');
      }
    } else { data.pdepositstatus = false; data.pclearstatus = false; data.pchequestatus = 'N'; }
    this.gridData.set([...this.gridData()]);
  }

  checkedReturn(event: any, data: ChequesIssuedRow): void {
    const ro = this._commonService.getDateObjectFromDataBase(data.preceiptdate);
    const td = this.ChequesIssuedForm.controls['ptransactiondate'].value;
    if (event.target.checked) {
      const rt = ro ? new Date(ro).setHours(0, 0, 0, 0) : null;
      const tt = td ? new Date(td).setHours(0, 0, 0, 0) : null;
      if (rt !== null && tt !== null && tt >= rt) {
        data.preturnstatus = true; data.pcancelstatus = false;
        data.pdepositstatus = false; data.pchequestatus = 'R';
      } else {
        data.pclearstatus = false; data.preturnstatus = false;
        data.pchequestatus = 'N'; event.target.checked = false;
        this._commonService.showWarningMessage('Transaction Date Should be >= Payment Date');
      }
    } else { data.preturnstatus = false; data.pchequestatus = 'N'; }
    this.gridData.set([...this.gridData()]);
  }

  checkedCancel(event: any, data: ChequesIssuedRow): void {
    const ro = this._commonService.getDateObjectFromDataBase(data.preceiptdate);
    const td = this.ChequesIssuedForm.controls['ptransactiondate'].value;
    if (event.target.checked) {
      const rt = ro ? new Date(ro).setHours(0, 0, 0, 0) : null;
      const tt = td ? new Date(td).setHours(0, 0, 0, 0) : null;
      if (rt !== null && tt !== null && tt >= rt) {
        data.pcancelstatus = true; data.pdepositstatus = false;
        data.preturnstatus = false; data.pchequestatus = 'C';
      } else {
        data.pclearstatus = false; data.preturnstatus = false;
        data.pcancelstatus = false; data.pchequestatus = 'N'; event.target.checked = false;
        this._commonService.showWarningMessage('Transaction Date Should be >= Payment Date');
      }
    } else { data.pcancelstatus = false; data.pchequestatus = 'N'; }
    this.gridData.set([...this.gridData()]);
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  checkValidations(group: FormGroup, isValid: boolean): boolean {
    try { Object.keys(group.controls).forEach(k => { isValid = this.GetValidationByControl(group, k, isValid); }); }
    catch (e: any) { this.showErrorMessage(e); return false; }
    return isValid;
  }

  GetValidationByControl(formGroup: FormGroup, key: string, isValid: boolean): boolean {
    try {
      const fc = formGroup.get(key);
      if (fc) {
        if (fc instanceof FormGroup) { this.checkValidations(fc, isValid); }
        else if (fc.validator) {
          this.ChequesIssuedValidation.update(v => ({ ...v, [key]: '' }));
          if (fc.errors || fc.invalid || fc.touched || fc.dirty) {
            const el = document.getElementById(key) as HTMLInputElement;
            const ln = el ? el.title : key;
            for (const ek in fc.errors) {
              if (ek) {
                const em = this._commonService.getValidationMessage(fc, ek, ln, key, '');
                this.ChequesIssuedValidation.update(v => ({ ...v, [key]: (v[key] || '') + em + ' ' }));
                isValid = false;
              }
            }
          }
        }
      }
    } catch (e: any) { this.showErrorMessage(e); return false; }
    return isValid;
  }

  showErrorMessage(e: string): void { this._commonService.showErrorMessage(e); }

  BlurEventAllControll(fg: FormGroup): boolean {
    try { Object.keys(fg.controls).forEach(k => { this.setBlurEvent(fg, k); }); }
    catch (e: any) { this.showErrorMessage(e); return false; }
    return true;
  }

  setBlurEvent(fg: FormGroup, key: string): boolean {
    try {
      const fc = fg.get(key);
      if (fc) {
        if (fc instanceof FormGroup) { this.BlurEventAllControll(fc); }
        else if (fc.validator) { fg.get(key)!.valueChanges.subscribe(() => { this.GetValidationByControl(fg, key, true); }); }
      }
    } catch (e: any) { this.showErrorMessage(e); return false; }
    return true;
  }


  Save(): void {
    //  Bank name validation first
    if (!this.ChequesIssuedForm.controls['bankname'].value) {
      this.ChequesIssuedValidation.update(v => ({
        ...v,
        bankname: 'Please Select Bank Name'
      }));
      this._commonService.showWarningMessage('Please Select Bank Name');
      return;
    }

    this.ChequesIssuedValidation.update(v => ({ ...v, bankname: '' }));

    const dupbool = this.validateDuplicates();
    const isempty = this.emptyValuesFound();
    const selrec = this.gridData().filter(e => e.pchequestatus === 'P' || e.pchequestatus === 'R');
    const iscancel = this.gridData().filter(e => e.pcancelstatus === true);
    let isValid = true;

    if (this.status() !== 'autobrs') {
      if (!this.showhidegridcolumns()) {
        if (dupbool > 0) {
          this._commonService.showWarningMessage('Duplicates Found please enter unique values');
          isValid = false;
        } else if (isempty) {
          this._commonService.showWarningMessage('Please enter all input fields!');
          isValid = false;
        } else if (selrec.length === 0) {
          if (iscancel.length > 0) {
            isValid = true;
          } else {
            this._commonService.showWarningMessage('Please Select records');
            isValid = false;
          }
        }
      }
    }

    if (!isValid || !confirm('Do You Want To Save ?')) return;

    this.DataForSaving = [];
    if (!this.checkValidations(this.ChequesIssuedForm, isValid)) return;

    this.buttonname.set('Processing');
    this.disablesavebutton.set(true);

    this.gridData().forEach((row: ChequesIssuedRow, i: number) => {
      if (row.pchequestatus === 'P' || row.pchequestatus === 'R' || row.pchequestatus === 'C') {
        if (i < this.dataTemp.length) this.dataTemp[i].pchequestatus = row.pchequestatus;
        this.DataForSaving.push({ ...row });
      }
    });

    if (this.DataForSaving.length === 0) {
      this._commonService.showWarningMessage('Select atleast one record');
      this.disablesavebutton.set(false);
      this.buttonname.set('Save');
      return;
    }

    this.DataForSaving.forEach((item: ChequesIssuedRow) => {
      item.pCreatedby = this._commonService.getCreatedBy();
      item.pipaddress = this._commonService.getIpAddress();
      item.preferencetext = (item.preferencetext || '') + '-' + new Date().getFullYear().toString();
    });

    const formVal = this.ChequesIssuedForm.value;

    //  fmt for item-level dates (yyyy-MM-dd for DB fields)
    const fmt = (d: any) =>
      d ? (this.datepipe.transform(d instanceof Date ? d : new Date(d), 'yyyy-MM-dd') || '') : '';

    //  fmtTx for transaction date sent to stored procedure (dd/MM/yyyy)
    const fmtTx = (d: any) =>
      d ? (this.datepipe.transform(d instanceof Date ? d : new Date(d), 'dd/MM/yyyy') || '') : '';

    const mapCheque = (item: any): any => ({
      pRecordid: item.pRecordid || '',
      pUpiname: item.pUpiname || '',
      pUpiid: item.pUpiid || '',
      pBankconfigurationId: item.pBankconfigurationId || '',
      pBankName: item.pBankName || '',
      pbranchname: item.pbranchname || '',
      ptranstype: item.ptranstype || '',
      ptypeofpayment: item.ptypeofpayment || '',
      pChequenumber: item.pChequenumber || '',
      pchequedate: fmt(item.pchequedate),
      pchequedepositdate: fmt(item.pchequedepositdate),
      pchequecleardate: fmt(item.pchequecleardate),
      pbankid: item.pbankid || '',
      branchid: item.branchid || '',
      pCardNumber: item.pCardNumber || '',
      pdepositbankid: item.pdepositbankid || '',
      pdepositbankname: item.pdepositbankname || '',
      pAccountnumber: item.pAccountnumber || '',
      ChallanaNo: item.ChallanaNo || '',
      preceiptid: item.preceiptid || '',
      preceiptdate: fmt(item.preceiptdate),
      pmodofreceipt: item.pmodofreceipt || '',
      ptotalreceivedamount: item.ptotalreceivedamount || '0',
      pnarration: item.pnarration || '',
      ppartyname: item.ppartyname || '',
      ppartyid: item.ppartyid || '',
      pistdsapplicable: item.pistdsapplicable || '',
      pTdsSection: item.pTdsSection || '',
      pTdsPercentage: item.pTdsPercentage || '',
      ptdsamount: item.ptdsamount || '',
      ptdscalculationtype: item.ptdscalculationtype || '',
      ppartypannumber: item.ppartypannumber || '',
      ppartyreftype: item.ppartyreftype || '',
      ppartyreferenceid: item.ppartyreferenceid || '',
      pFilename: item.pFilename || '',
      pFilepath: item.pFilepath || '',
      pFileformat: item.pFileformat || '',
      pCleardate: fmt(item.pCleardate),
      pdepositeddate: fmt(item.pdepositeddate),
      ptdsaccountid: item.ptdsaccountid || '',
      preceiptrecordid: item.preceiptrecordid || '',
      pTdsSectionId: item.pTdsSectionId || '',
      groupcode: item.groupcode || '',
      preceiptno: item.preceiptno || '',
      formname: item.formname || 'CHEQUESISSUED',
      chitpaymentid: item.chitpaymentid || '',
      adjustmentid: item.adjustmentid || '',
      pdepositstatus: item.pdepositstatus || '',
      pcancelstatus: item.pcancelstatus || '',
      preturnstatus: item.preturnstatus || '',
      pchequestatus: item.pchequestatus || '',
      pcancelcharges: item.pcancelcharges || '',
      pactualcancelcharges: item.pactualcancelcharges || '',
      pledger: item.pledger || '',
      cancelstatus: item.cancelstatus || '',
      returnstatus: item.returnstatus || '',
      clearstatus: item.clearstatus || '',
      chqueno: item.chqueno || item.pChequenumber || '',
      issueddate: fmt(item.issueddate),
      chitgroupcode: item.chitgroupcode || '',
      chitgroupid: item.chitgroupid || '',
      ticketno: item.ticketno || '',
      chequeamount: item.chequeamount || '',
      zpdaccountid: item.zpdaccountid || '',
      installmentno: item.installmentno || '',
      schemesubscriberid: item.schemesubscriberid || '',
      contactid: item.contactid || '',
      schemetype: item.schemetype || '',
      checksentryrecordid: item.checksentryrecordid || '',
      cheque_bank: item.cheque_bank || '',
      selfchequestatus: item.selfchequestatus || '',
      branch_name: item.branch_name || '',
      receipt_branch_name: item.receipt_branch_name || '',
      subscriber_details: item.subscriber_details || '',
      ChitReceiptNo: item.ChitReceiptNo || '',
      total_count: item.total_count || '',
      transactionNo: item.transactionNo || '',
      transactiondate: fmt(item.transactiondate),
      chitstatus: item.chitstatus || '',
      chitgroupstatus: item.chitgroupstatus || '',
      receiptnumbers: item.receiptnumbers || '',
      pdepositedBankid: item.pdepositedBankid || '',
      pdepositedBankName: item.pdepositedBankName || '',
      preferencetext: item.preferencetext || '',
      preceiptype: item.preceiptype || '',
      puploadeddate: fmt(item.puploadeddate),
      subscriberbankaccountno: item.subscriberbankaccountno || '',
      pkgmsreceiptdate: fmt(item.pkgmsreceiptdate),
      preceiptslist: (item.preceiptslist || []).map((sub: any) => ({
        psubledgerid: sub.psubledgerid || '',
        psubledgername: sub.psubledgername || '',
        pledgerid: sub.pledgerid || '',
        pledgername: sub.pledgername || '',
        id: sub.id || '',
        text: sub.text || '',
        ptranstype: sub.ptranstype || '',
        accountbalance: sub.accountbalance || '',
        pAccounttype: sub.pAccounttype || '',
        legalcellReceipt: sub.legalcellReceipt || '',
        pbranchcode: sub.pbranchcode || '',
        pbranchtype: sub.pbranchtype || '',
        groupcode: sub.groupcode || '',
        chitgroupid: sub.chitgroupid || '',
        pamount: sub.pamount || '',
        pgsttype: sub.pgsttype || '',
        pgstcalculationtype: sub.pgstcalculationtype || '',
        pgstpercentage: sub.pgstpercentage || '',
        pigstamount: sub.pigstamount || '',
        pcgstamount: sub.pcgstamount || '',
        psgstamount: sub.psgstamount || '',
        putgstamount: sub.putgstamount || '',
        pState: sub.pState || '',
        pStateId: sub.pStateId || '',
        pgstno: sub.pgstno || '',
        pgstamount: sub.pgstamount || '',
        pigstpercentage: sub.pigstpercentage || '',
        pcgstpercentage: sub.pcgstpercentage || '',
        psgstpercentage: sub.psgstpercentage || '',
        putgstpercentage: sub.putgstpercentage || '',
        pactualpaidamount: sub.pactualpaidamount || '',
        ptotalamount: sub.ptotalamount || '',
        pisgstapplicable: sub.pisgstapplicable || '',
        ptdsamountindividual: sub.ptdsamountindividual || '',
        pTdsSection: sub.pTdsSection || '',
        pTdsPercentage: sub.pTdsPercentage || '',
        preferencetext: sub.preferencetext || ''
      }))
    });

    const payload = {
      global_schema: this._commonService.getschemaname(),
      branch_schema: this._commonService.getbranchname(),
      companycode: this._commonService.getCompanyCode(),
      branchcode: this._commonService.getBranchCode(),
      pCreatedby: this._commonService.getCreatedBy() || 0,
      ptransactiondate: fmtTx(formVal.ptransactiondate),
      pchequecleardate: '',
      pcaobranchcode: '',
      pcaobranchname: '',
      pcaobranchid: 0,
      pfrombrsdate: formVal.pfrombrsdate
        ? fmtTx(formVal.pfrombrsdate) : '',
      ptobrsdate: formVal.ptobrsdate
        ? fmtTx(formVal.ptobrsdate) : '',
      _BankBalance: this.bankbalance() || 0,
      _CashBalance: 0,
      chequestype: this.modeofreceipt || '',
      banknameForLegal: this.selectedBankName() || '',
      pchequesOnHandlist: this.DataForSaving.map(mapCheque),
      pchequesclearreturnlist: this.ChequesClearReturnData.map(mapCheque),
      pchequesotherslist: this.OtherChequesData().map((item: any) => ({
        ptransactionnumber: item.ptransactionnumber || '',
        ptransactiondate: fmtTx(item.ptransactiondate),
        particulars: item.particulars || '',
        debitamount: String(item.debitamount || '0'),
        creditamount: String(item.creditamount || '0'),
        accountname: item.accountname || '',
        chequereturncharges: String(item.chequereturncharges || '0')
      })),
      auto_brs_type_name: formVal.auto_brs_type || 'Upload'
    };

    this._accountingtransaction.SaveChequesIssued(JSON.stringify(payload)).subscribe({
      next: (data: any) => {
        if (data?.success === true && (!data?.message || data?.message === 'Cheques issued processed successfully')) {
          this._commonService.showSuccessMsg('Saved successfully');
          this.Clear();
        } else if (data?.success === false || data?.message?.includes('SQLSTATE')) {
          //  Handle backend error returned as success:true but with error message
          this._commonService.showErrorMessage(data?.message || 'Save failed');
        } else {
          this._commonService.showSuccessMsg('Saved successfully');
          this.Clear();
        }
        this.disablesavebutton.set(false);
        this.buttonname.set('Save');
      },
      error: (err: any) => {
        this._commonService.showErrorMessage(err);
        this.disablesavebutton.set(false);
        this.buttonname.set('Save');
      }
    });
  }

  // ── Status info grid ───────────────────────────────────────────────────────

  chequesStatusInfoGridForChequesIssued(): void {
    this._showAllChequesGrid();
    const grid: any[] = [
      ...this.ChequesIssuedData.filter(r => r.ptypeofpayment === 'CHEQUE').map(r => ({ ...r, chequeStatus: 'Cheques Issued' })),
      ...this.ChequesClearReturnData.filter(r => r.pchequestatus === 'P').map(r => ({ ...r, chequeStatus: 'Cleared' })),
      ...this.ChequesClearReturnData.filter(r => r.pchequestatus === 'R').map(r => ({ ...r, chequeStatus: 'Returned' })),
      ...this.ChequesClearReturnData.filter(r => r.pchequestatus === 'C').map(r => ({ ...r, chequeStatus: 'Cancelled' }))
    ];
    this.displayAllChequesDataBasedOnForm.set(grid);
    this.displayAllChequesDataBasedOnFormTemp = JSON.parse(JSON.stringify(grid));
    this.setPageModel();
    this.pageCriteria.update(c => ({
      ...c, totalrows: grid.length,
      TotalPages: Math.ceil(grid.length / c.pageSize) || 1,
      currentPageRows: Math.min(grid.length, c.pageSize)
    }));
  }

  // ── PDF / Export ───────────────────────────────────────────────────────────

  pdfOrprint(printorpdf: string): void {
    const isCRC = ['Cleared', 'Returned', 'Cancelled'].includes(this.pdfstatus);
    const gd: any[] = isCRC
      ? this.ChequesClearReturnData
      : [...this.ChequesIssuedData, ...this.OtherChequesData()];

    if (!gd || gd.length === 0) { this._commonService.showWarningMessage('No data available'); return; }

    let Totlaamount = 0;
    const headers: string[] = [
      'Cheque/Reference No.', 'Amount', 'Payment Id', 'Payment Date',
      ...(isCRC ? [`${this.pdfstatus} Date`] : []),
      'Transaction Mode', 'Party'
    ];
    const colStyles: Record<number, any> = {
      0: { cellWidth: 40, halign: 'center' }, 1: { cellWidth: 28, halign: 'right' },
      2: { cellWidth: 45, halign: 'center' }, 3: { cellWidth: 30, halign: 'center' },
    };
    if (isCRC) {
      colStyles[4] = { cellWidth: 22, halign: 'center' };
      colStyles[5] = { cellWidth: 28, halign: 'center' };
      colStyles[6] = { cellWidth: 50, halign: 'left' };
    } else {
      colStyles[4] = { cellWidth: 40, halign: 'center' };
      colStyles[5] = { cellWidth: 90, halign: 'left' };
    }

    const data: any[][] = [];
    gd.forEach((e: any) => {
      const amt = Number(e?.ptotalreceivedamount || 0);
      Totlaamount += amt;
      const dr = e?.preceiptdate ? this._commonService.getFormatDateGlobal(e.preceiptdate) : '';
      const dd = e?.pdepositeddate ? this._commonService.getFormatDateGlobal(e.pdepositeddate) : '--NA--';
      const cls = e?.pCleardate ? this._commonService.getFormatDateGlobal(e.pCleardate) : '';
      data.push([
        e?.pChequenumber || '',
        this._commonService.convertAmountToPdfFormat(amt),
        e?.preceiptid || '',
        dr,
        ...(isCRC ? [cls || dd] : []),
        e?.ptypeofpayment || '',
        e?.ppartyname || ''
      ]);
    });

    const totalRow: any[] = [
      { content: 'Total', colSpan: 1, styles: { halign: 'right', fontSize: 12, fontStyle: 'bold', textColor: [0, 0, 0] } },
      { content: this._commonService.convertAmountToPdfFormat(Totlaamount), styles: { halign: 'right', fontSize: 12, fontStyle: 'bold', textColor: [0, 0, 0] } }
    ];
    for (let i = 0; i < headers.length - 2; i++) totalRow.push('');
    data.push(totalRow);

    this._commonService._downloadchequesReportsPdf(
      'Cheques Issued', data, headers, colStyles, 'landscape',
      this.bankname || '', this.brsdate() || '', this.pdfstatus || '', printorpdf, ' '
    );
  }

  export(): void {
    const isCRC = ['Cleared', 'Returned', 'Cancelled'].includes(this.pdfstatus);
    const gd: any[] = isCRC
      ? this.ChequesClearReturnData
      : [...this.ChequesIssuedData, ...this.OtherChequesData()];

    if (!gd || gd.length === 0) { this._commonService.showWarningMessage('No data available'); return; }

    const rows: any[] = gd.map((e: any) => {
      const dr = this._commonService.getFormatDateGlobal(e.preceiptdate);
      const dd = this._commonService.getFormatDateGlobal(e.pdepositeddate) || '--NA--';
      const amt = e.ptotalreceivedamount || 0;
      return isCRC
        ? { 'Cheque/ Reference No.': e.pChequenumber || '', 'Amount': amt, 'Payment Id': e.preceiptid || '', 'Payment Date': dr, [`${this.pdfstatus} Date`]: dd, 'Transaction Mode': e.ptypeofpayment || '', 'Party': e.ppartyname || '' }
        : { 'Cheque/ Reference No.': e.pChequenumber || '', 'Amount': amt, 'Payment Id': e.preceiptid || '', 'Payment Date': dr, 'Transaction Mode': e.ptypeofpayment || '', 'Party': e.ppartyname || '' };
    });
    this._commonService.exportAsExcelFile(rows, 'Cheques Issued');
  }

  // ── Duplicate / validation helpers ────────────────────────────────────────

  checkDuplicateValues(_event: any, rowIndex: number, row: any): void {
    const value = _event?.target?.value || '';
    const bool = this.gridData().filter(item => item.pchequestatus === 'P').some(el =>
      value && el.preferencetext && el.preferencetext.toString().toLowerCase() === value.toString().toLowerCase()
    );
    if (bool) {
      this._commonService.showWarningMessage('Already Exist');
      const curr = [...this.gridData()]; curr[rowIndex].preferencetext = ''; this.gridData.set(curr);
    } else { row.preferencetext = value; }
    this.gridData.set([...this.gridData()]);
  }

  checkDuplicateValueslatest(_event: any, rowIndex: number, row: any): void {
    const value = _event?.target?.value || ''; let count = 0;
    this.gridData().filter(item => item.preturnstatus === true || item.pdepositstatus === true)
      .forEach((el: ChequesIssuedRow) => {
        if (value && el.preferencetext && el.preferencetext.toString().toLowerCase() === value.toString().toLowerCase() && el.pChequenumber !== row.pChequenumber) count += 1;
        else { row.preferencetext = value; count = 0; }
      });
    if (count > 0) this._commonService.showWarningMessage('Already Exist');
    this.gridData.set([...this.gridData()]);
  }

  validateDuplicates(): number {
    const arr = this.gridData().filter(e => e.pchequestatus === 'P' || e.pchequestatus === 'R');
    let count = 0;
    for (let i = 0; i < arr.length; i++)
      for (let k = 0; k < arr.length; k++)
        if (arr[i].pChequenumber !== arr[k].pChequenumber && arr[i].preferencetext && arr[k].preferencetext && arr[i].preferencetext === arr[k].preferencetext) count += 1;
    return count;
  }

  emptyValuesFound(): boolean {
    return this.gridData().filter(e => e.pdepositstatus === true || e.preturnstatus === true).some(item => !item.preferencetext);
  }

  emptyValuesFoundinReturn(): boolean {
    return this.gridData().filter(e => e.preturnstatus === true).every(item => !!item.preferencetext);
  }

  // ── Auto BRS / File upload ─────────────────────────────────────────────────

  BankUploadExcel(): void { this.saveshowhide.set(false); this.PreDefinedAutoBrsArrayData.set([]); this.showBankUploadSection = true; }
  bankFileUpload(): void { this.showBankUploadSection = true; }

  onFileChange(evt: any): void {
    this.PreDefinedAutoBrsArrayData.set([]);
    const target: DataTransfer = evt.target as DataTransfer;
    if (target.files.length !== 1) throw new Error('Cannot use multiple files');
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary', cellDates: false });
      const ws: XLSX.WorkSheet = wb.Sheets[wb.SheetNames[0]];
      const exceldata: any[] = (XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[]).slice(1);
      const parsed = exceldata.map((row: any[]) => ({
        transactiondate: new Date((row[0] - 25569) * 86400000),
        chqueno: row[1], chequeamount: row[2], preferencetext: row[3]
      }));
      this.PreDefinedAutoBrsArrayData.set(parsed);
      this.saveshowhide.set(false);
    };
    reader.readAsBinaryString(target.files[0]);
  }

  DownloadExcelforPreDefinedBidAmount(): void {
    const ws = XLSX.utils.aoa_to_sheet(this.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AutoBrs');
    XLSX.writeFile(wb, this.fileName);
  }

  checkbox_pending_data(row: any, event: any): void {
    const updated = this.PreDefinedAutoBrsArrayData().map((r: any, i: number) =>
      i === row.index ? { ...r, check: event.target.checked } : r
    );
    this.PreDefinedAutoBrsArrayData.set(updated);
  }

  getAutoBrs(type: string): void {
    this.PreDefinedAutoBrsArrayData.set([]);
    this._accountingtransaction.GetPendingautoBRSDetailsIssued(this._commonService.getschemaname(), type).subscribe({
      next: (res: any) => {
        const mapped = (res || []).map((x: any, i: number) => ({
          ...x, chqueno: x.pChequenumber, chequeamount: x.ptotalreceivedamount, index: i, check: false
        }));
        this.PreDefinedAutoBrsArrayData.set(mapped);
      },
      error: (err: any) => this._commonService.showErrorMessage(err)
    });
  }

  auto_brs_typeChange(event: any): void {
    this.PreDefinedAutoBrsArrayData.set([]);
    this.auto_brs_type_name.set(event);
  }

  AutoBrs(): void {
    if (this.ChequesIssuedForm.controls['bankname'].value) {
      this.status.set('autobrs'); this.modeofreceipt = 'ONLINE-AUTO'; this.saveshowhide.set(true);
      this.GetChequesIssued_Load(this.bankid);
    } else {
      this._commonService.showWarningMessage('Please Select Bank');
      this.gridData.set([]);
    }
  }

  saveAutoBrs(): void {
    let PreDefinedData: any[] = []; let valid = false;
    if (this.auto_brs_type_name() === 'Upload') {
      valid = Array.isArray(this.PreDefinedAutoBrsArrayData()) && this.PreDefinedAutoBrsArrayData().length !== 0;
      PreDefinedData = JSON.parse(JSON.stringify(this.PreDefinedAutoBrsArrayData()));
    } else if (this.auto_brs_type_name() === 'Pending') {
      valid = this.PreDefinedAutoBrsArrayData().filter((x: any) => x.check).length > 0;
      PreDefinedData = JSON.parse(JSON.stringify(this.PreDefinedAutoBrsArrayData().filter((x: any) => x.check)));
    }
    if (!valid) { this._commonService.showWarningMessage('No Data to Save'); return; }
    if (confirm('Do you want to save ?')) {
      PreDefinedData.forEach((e: any) => { e.transactiondate = this._commonService.getFormatDateGlobal(e.transactiondate); });
      this.saveAutoBrsBool.set(true);
      this._accountingtransaction.SaveAutoBrsdatauploadIssued(JSON.stringify({
        pchequesOnHandlist: PreDefinedData,
        schemaname: this._commonService.getschemaname(),
        auto_brs_type_name: this.auto_brs_type_name()
      })).subscribe({
        next: (res: any) => {
          this.saveAutoBrsBool.set(false);
          if (res) { this._commonService.showSuccessMsg('Saved successfully'); this.PreDefinedAutoBrsArrayData.set([]); }
          else { this._commonService.showWarningMessage('Not Saved!!'); }
        },
        error: (err: any) => { this._commonService.showErrorMessage(err); this.saveAutoBrsBool.set(false); }
      });
    }
  }

  transactionDateValue: Date = new Date();

  onTransactionDateChange(date: Date): void {
    this.ChequesIssuedForm.patchValue({ ptransactiondate: date });
  }

}