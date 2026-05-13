import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, ViewChild, signal, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ValidationMessageComponent } from '../../../common/validation-message/validation-message.component';
import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import { PaginatorModule } from 'primeng/paginator';

import { NgSelectModule } from '@ng-select/ng-select';
import { forkJoin } from 'rxjs';
import { Table } from 'primeng/table';
import { CommonService } from '../../../../core/services/Common/common.service';
import { PageCriteria } from '../../../../core/models/pagecriteria';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { CompanyDetailsService } from '../../../../core/services/Common/company-details-service';
import { DatePickerModule } from 'primeng/datepicker';

declare var $: any;
@Component({
  selector: "app-cheques-onhand",
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule, NgSelectModule, DatePickerModule, CurrencyPipe, TableModule, CheckboxModule, PaginatorModule, ValidationMessageComponent],
  templateUrl: "./cheques-onhand.html",
})

export class ChequesOnhand implements OnInit {

  @ViewChild('dt') dt!: Table;
  private readonly fb = inject(FormBuilder);
  private readonly _accountingtransaction = inject(AccountsTransactions);
  private readonly _commonService = inject(CommonService);
  private readonly datepipe = inject(DatePipe);
  private readonly _companyDetailsService = inject(CompanyDetailsService);
  gridData = signal<any[]>([]);
  gridDatatemp = signal<any[]>([]);
  BanksList = signal<any[]>([]);

  all = signal<number>(0);
  chequesreceived = signal<number>(0);
  onlinereceipts = signal<number>(0);
  deposited = signal<number>(0);
  cancelled = signal<number>(0);

  amounttotal = signal<any>(0);
  currencySymbol = signal<any>('');
  bankbalance = signal<any>(0);
  bankbalancetype = signal<string>('');

  status = signal<string>('all');
  selectedTab = signal<string>('all');
  buttonname = signal<string>('Save');

  showicons = signal<boolean>(false);
  banknameshowhide = signal<any>(false);
  brsdateshowhidedeposited = signal<boolean>(false);
  brsdateshowhidecancelled = signal<boolean>(false);
  validatebrsdatedeposit = signal<boolean>(false);
  validatebrsdatecancel = signal<boolean>(false);
  disablesavebutton = signal<boolean>(false);
  pdatepickerenablestatus = signal<boolean>(false);
  isCleared = signal<boolean>(false);
  // page = signal<any>({});

  bankname = signal<any>(null);
  brsdate = signal<string>('');
  chequenumber = signal<any>(null);
  ChequesOnHandValidation = signal<any>({});

  currentSortField = signal<string>('preceiptdate');
  currentSortOrder = signal<number>(1);

  ChequesOnHandData: any[] = [];
  ChequesClearReturnData: any[] = [];
  ChequesClearReturnDataBasedOnBrs: any = [];
  DataForSaving: any[] = [];

  showhidegridcolumns = false;
  gridLoading = false;
  saveshowhide = true;
  hiddendate = true;
  depositchecked = false;
  cancelchecked = false;
  checkbox = false;
  chequeboxshoworhide = true;
  preferdrows = false;
  isClear = false;

  bankdetails: any;
  bankid: any = 0;
  bankbalancedetails: any;
  SelectBankData: any;

  fromdate: any;
  todate: any;

  _searchText = '';
  count = 0;
  sortOrder!: number;
  validate: any;
  schemaname: any;
  PopupData: any;
  userBranchType: any;
  chequereturncharges: any;
  companydetails: any;
  modeofreceipt: any = 'ALL';
  pdfstatus = '';
  datetitle = 'Deposited Date';
  Totalamount = 0;
  checked: any;
  startindex: any;
  endindex: any;
  _countData: any = [];
  totalElements!: number;

  pageCriteria: PageCriteria;
  pageSize = 10;
  rowsPerPageOptions: number[] = [10, 20, 50];
  page = signal<any>({ totalElements: 0, totalPages: 0, offset: 0, size: 0 });


  public dpConfig: any = {};
  public brsfromConfig: any = {};
  public brstoConfig: any = {};

  public group: any[] = [
    { field: 'preceiptdate' },
    { field: 'pChequenumber', dir: 'desc' }
  ];

  today2: Date = new Date();

  ChequesOnHandForm!: FormGroup;
  BrsDateForm!: FormGroup;

  constructor() {
    this.dpConfig.containerClass = 'theme-dark-blue';
    this.dpConfig.showWeekNumbers = false;
    this.dpConfig.dateInputFormat = 'DD-MMM-YYYY';

    this.brsfromConfig.containerClass = 'theme-dark-blue';
    this.brsfromConfig.showWeekNumbers = false;
    this.brsfromConfig.dateInputFormat = 'DD-MMM-YYYY';

    this.brstoConfig.containerClass = 'theme-dark-blue';
    this.brstoConfig.showWeekNumbers = false;
    this.brstoConfig.dateInputFormat = 'DD-MMM-YYYY';

    this.pageCriteria = new PageCriteria();
  }



  ngOnInit(): void {
    this.userBranchType = sessionStorage.getItem('userBranchType');
    this.companydetails = this._commonService._getCompanyDetails();

    if (!this.companydetails) {
      const loggedInUser = sessionStorage.getItem('loggedInUser');
      const parsedUser = loggedInUser ? JSON.parse(loggedInUser) : null;

      const companyCode =
        parsedUser?.companyCode ||
        sessionStorage.getItem('companyCode') ||
        this._commonService.getCompanyCode();

      const branchCode =
        parsedUser?.branchCode ||
        sessionStorage.getItem('branchCode') ||
        this._commonService.getBranchCode();

      this.companydetails = {
        companyName: companyCode,
        companyCode: companyCode,
        branchCode: branchCode
      };

      // sessionStorage.setItem('CompanyDetails', JSON.stringify(this.companydetails));
    }

    this.pdatepickerenablestatus.set(this.companydetails?.pdatepickerenablestatus);
    this.currencySymbol.set(this._commonService.currencysymbol);
    this.ChequesOnHandForm = this.fb.group({
      ptransactiondate: [this.today2, Validators.required],
      bankname: [null, Validators.required],
      pfrombrsdate: [this.today2],
      ptobrsdate: [this.today2],

      pchequesOnHandlist: [],
      SearchClear: [''],
      schemaname: [this._commonService.getschemaname()]
    });

    this.BrsDateForm = this.fb.group({
      frombrsdate: [''],
      tobrsdate: ['']
    });

    this.bankid = 0;
    this.banknameshowhide.set(false);
    this.ChequesOnHandValidation.set({});
    this.modeofreceipt = 'ALL';
    this.status.set('all');

    this.setPageModel();
    this.pageSetUp();


    this._accountingtransaction
      .GetBankntList(
        this._commonService.getbranchname(),
        this._commonService.getschemaname(),
        this._commonService.getCompanyCode(),
        this._commonService.getBranchCode()
      )
      .subscribe((res: any) => {
        this.BanksList.set(res?.banklist || res || []);
        this.GetBankBalance_Init();
      });
  }

  getFormattedBrsDates() {
    const frombrsdate = this.fromdate && this.fromdate !== '' ? this.fromdate : '';
    const tobrsdate = this.todate && this.todate !== '' ? this.todate : '';
    return { frombrsdate, tobrsdate };
  }

  GetBankBalance_Init() {
    const transactionDate =
      this.datepipe.transform(
        this.ChequesOnHandForm.controls['ptransactiondate'].value || new Date(),
        'dd-MM-yyyy'
      ) || this.datepipe.transform(new Date(), 'dd-MM-yyyy');

    this._accountingtransaction
      .GetBankBalance(
        transactionDate,
        this.bankid,
        this._commonService.getbranchname(),
        this._commonService.getBranchCode(),
        this._commonService.getCompanyCode()
      )
      .subscribe(bankdetails => {
        this.bankbalancedetails = bankdetails;

        if (this.bankid === 0) {
          const totalBalance = (this.BanksList() ?? []).reduce(
            (sum: number, bank: any) => sum + (bank.pbankbalance ?? 0),
            0
          );
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
          const balance = this.bankbalancedetails?._BankBalance ?? 0;
          if (balance < 0) {
            this.bankbalance.set(Math.abs(balance));
            this.bankbalancetype.set('Cr');
          } else if (balance === 0) {
            this.bankbalance.set(0);
            this.bankbalancetype.set('');
          } else {
            this.bankbalance.set(balance);
            this.bankbalancetype.set('Dr');
          }
        }

        const todayDate = new Date();
        this.brsdate.set(
          todayDate.getDate().toString().padStart(2, '0') +
          '-' +
          todayDate.toLocaleString('en-US', { month: 'short' }) +
          '-' +
          todayDate.getFullYear()
        );

        const fromDate = this.bankbalancedetails?.pfrombrsdate
          ? this._commonService.getDateObjectFromDataBase(this.bankbalancedetails.pfrombrsdate)
          : new Date();
        const toDate = this.bankbalancedetails?.ptobrsdate
          ? this._commonService.getDateObjectFromDataBase(this.bankbalancedetails.ptobrsdate)
          : new Date();


        if (this.status() !== 'deposited' && this.status() !== 'cancelled') {
          this.BrsDateForm.patchValue({ frombrsdate: fromDate, tobrsdate: toDate });
          this.ChequesOnHandForm.patchValue({ pfrombrsdate: fromDate, ptobrsdate: toDate });
        }
        if (this.isClear) {
          this.isClear = false;
          return;
        }
        this.GetChequesOnHand_Load(this.bankid);

      });
  }

  GetBankBalance(bankid: any) {
    const transactionDate = this.datepipe.transform(new Date(), 'dd-MM-yyyy') || '';

    this._accountingtransaction
      .GetBankBalance(
        transactionDate,
        bankid,
        this._commonService.getbranchname(),
        this._commonService.getBranchCode(),
        this._commonService.getCompanyCode()
      )
      .subscribe(bankdetails => {
        this.bankbalancedetails = bankdetails;

        if (this.bankid === 0) {
          const totalBalance = (this.BanksList() ?? []).reduce(
            (sum: number, bank: any) => sum + (bank.pbankbalance ?? 0),
            0
          );
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
        }

        const todayDate = new Date();
        this.brsdate.set(
          todayDate.getDate().toString().padStart(2, '0') +
          '-' +
          todayDate.toLocaleString('en-US', { month: 'short' }) +
          '-' +
          todayDate.getFullYear()
        );

        const fromDate = this.bankbalancedetails?.pfrombrsdate
          ? this._commonService.getDateObjectFromDataBase(this.bankbalancedetails.pfrombrsdate)
          : new Date();
        const toDate = this.bankbalancedetails?.ptobrsdate
          ? this._commonService.getDateObjectFromDataBase(this.bankbalancedetails.ptobrsdate)
          : new Date();


        if (this.status() !== 'deposited' && this.status() !== 'cancelled') {
          this.ChequesOnHandForm.patchValue({ pfrombrsdate: fromDate, ptobrsdate: toDate });
          this.BrsDateForm.patchValue({ frombrsdate: fromDate, tobrsdate: toDate });
        }

      });
  }

  // setPageModel() {
  //   this.pageCriteria.pageSize = this._commonService.pageSize;
  //   this.pageCriteria.offset = 0;
  //   this.pageCriteria.pageNumber = 1;
  //   this.pageCriteria.footerPageHeight = 50;
  // }


  setPageModel() {
    this.rowsPerPageOptions = this._commonService.setPageModel(
      this.pageCriteria,
      this.gridData().length
    );
  }


  change_date(event: any) {
    this.gridData.update(data =>
      data.map(item => ({
        ...item,
        pdepositstatus: false,
        pcancelstatus: false,
        pchequestatus: 'N'
      }))
    );
  }



  pageSetUp() {
    this.startindex = 0;
    this.endindex = this._commonService.pageSize;
    this.pageCriteria.offset = 0;
    this.pageCriteria.pageSize = this._commonService.pageSize;
  }


  private applySortToGrid() {
    const field = this.currentSortField();
    const order = this.currentSortOrder();
    if (!field) return;
    this.gridData.update(data =>
      [...data].sort((a, b) => {
        const v1 = a[field], v2 = b[field];
        if (v1 == null && v2 == null) return 0;
        if (v1 == null) return 1;
        if (v2 == null) return -1;
        if (typeof v1 === 'string') return v1.localeCompare(v2) * order;
        return (v1 < v2 ? -1 : v1 > v2 ? 1 : 0) * order;
      })
    );
    this.gridDatatemp.set(this.gridData());
  }

  // setPage(event: any) {
  //   this.preferdrows = false;

  //   if (event.sortField) {
  //     this.currentSortField.set(event.sortField);
  //     this.currentSortOrder.set(event.sortOrder ?? 1);
  //   }

  //   this.page.update(p => ({
  //     ...p,
  //     offset: event.first / event.rows,
  //     pageNumber: event.first / event.rows + 1,
  //     size: event.rows
  //   }));
  //   this.startindex = event.first;
  //   this.endindex = event.first + event.rows;


  //   if (
  //     this.fromdate && this.fromdate !== '' &&
  //     this.todate && this.todate !== '' &&
  //     this.bankid && this.bankid !== 0
  //   ) {
  //     this.GetDataOnBrsDates1(this.fromdate, this.todate, this.bankid);
  //   } else {
  //     this.GetChequesOnHand(this.bankid, this.startindex, this.endindex, '');
  //   }
  // }

  // GetChequesOnHand_Load(bankid: any) {
  //   this.gridLoading = true;
  //   const modeofreceipt = this.modeofreceipt || 'ALL';

  //   const chequesData$ = this._accountingtransaction.GetChequesOnHandData(
  //     bankid,
  //     this._commonService.getschemaname(),
  //     this._commonService.getbranchname(),
  //     this.startindex,
  //     this.endindex,
  //     this._searchText,
  //     modeofreceipt,
  //     '',
  //     this._commonService.getCompanyCode(),
  //     this._commonService.getBranchCode()
  //   );

  //   const countData$ = this._accountingtransaction.GetChequesRowCount(
  //     bankid,
  //     this._commonService.getschemaname(),
  //     this._commonService.getbranchname(),
  //     this._searchText,
  //     'CHEQUESONHAND',
  //     modeofreceipt,
  //     this._commonService.getCompanyCode(),
  //     this._commonService.getBranchCode()
  //   );

  //   forkJoin([chequesData$, countData$]).subscribe({
  //     next: ([data, countData]: [any, any]) => {
  //       this.gridLoading = false;
  //       this.ChequesOnHandData = data.pchequesOnHandlist || [];
  //       this.ChequesClearReturnData = data.pchequesclearreturnlist || [];
  //       this._countData = countData;
  //       this.CountOfRecords();
  //       this.totalElements = +countData['total_count'];
  //       this.page.update(p => ({
  //         ...p,
  //         totalElements: +countData['total_count'],
  //         totalPages: +countData['total_count'] > 10
  //           ? Math.ceil(+countData['total_count'] / 10)
  //           : p.totalPages
  //       }));

  //       const s = this.status();
  //       if (s === 'all') this.All1();
  //       else if (s === 'chequesreceived') this.ChequesReceived1();
  //       else if (s === 'onlinereceipts') this.OnlineReceipts1();
  //       else if (s === 'deposited') this.Deposited1();
  //       else if (s === 'cancelled') this.Cancelled1();
  //       this.applySortToGrid();
  //     },
  //     error: (error: any) => {
  //       this.gridLoading = false;
  //       this._commonService.showErrorMessage(error);
  //     }
  //   });
  // }



  setPage(event: any) {
    const first = event.first ?? 0;
    const rows = event.rows ?? this._commonService.pageSize;

    const pageIndex = Math.floor(first / rows);

    this.startindex = first;
    this.endindex = first + rows;

    this.page.update(p => ({
      ...p,
      offset: pageIndex,
      // pageNumber: pageIndex,
      pageNumber: pageIndex + 1,
      size: rows
    }));

    this.GetChequesOnHand_Load(this.bankid);
  }



  // GetChequesOnHand_Load(bankid: any) {
  //   this.gridLoading = true;
  //   const modeofreceipt = this.modeofreceipt || 'ALL';

  //   const chequesData$ = this._accountingtransaction.GetChequesOnHandData(
  //     bankid,
  //     this._commonService.getschemaname(),
  //     this._commonService.getbranchname(),
  //     this.startindex,   // ← these must be 0 and pageSize after pageSetUp()
  //     this.endindex,
  //     this._searchText,
  //     modeofreceipt,
  //     '',
  //     this._commonService.getCompanyCode(),
  //     this._commonService.getBranchCode()
  //   );

  //   const countData$ = this._accountingtransaction.GetChequesRowCount(
  //     bankid,
  //     this._commonService.getschemaname(),
  //     this._commonService.getbranchname(),
  //     this._searchText,
  //     'CHEQUESONHAND',
  //     modeofreceipt,
  //     this._commonService.getCompanyCode(),
  //     this._commonService.getBranchCode()
  //   );

  //   forkJoin([chequesData$, countData$]).subscribe({
  //     next: ([data, countData]: [any, any]) => {
  //       this.gridLoading = false;
  //       this.ChequesOnHandData = data.pchequesOnHandlist || [];
  //       this.ChequesClearReturnData = data.pchequesclearreturnlist || [];
  //       this._countData = countData;
  //       this.CountOfRecords();

  //       const total = +countData['total_count'];
  //       this.totalElements = total;


  //       this.page.set({
  //         totalElements: total,
  //         totalPages: total > this._commonService.pageSize
  //           ? Math.ceil(total / this._commonService.pageSize)
  //           : 1,
  //         offset: 0,
  //         pageNumber: 1,
  //         size: this._commonService.pageSize
  //       });

  //       this.startindex = 0;
  //       this.endindex = this._commonService.pageSize;
  //       if (this.dt) {
  //         this.dt.first = 0;
  //       }
  //       const s = this.status();
  //       if (s === 'all') this.All1();
  //       else if (s === 'chequesreceived') this.ChequesReceived1();
  //       else if (s === 'onlinereceipts') this.OnlineReceipts1();
  //       else if (s === 'deposited') this.Deposited1();
  //       else if (s === 'cancelled') this.Cancelled1();
  //       this.applySortToGrid();
  //     },
  //     error: (error: any) => {
  //       this.gridLoading = false;
  //       this._commonService.showErrorMessage(error);
  //     }
  //   });
  // }




  GetChequesOnHand_Load(bankid: any) {
    this.gridLoading = true;

    const modeofreceipt = this.modeofreceipt || 'ALL';

    const chequesData$ = this._accountingtransaction.GetChequesOnHandData(
      bankid,
      this._commonService.getschemaname(),
      this._commonService.getbranchname(),
      this.startindex,
      this.endindex,
      this._searchText,
      modeofreceipt,
      '',
      this._commonService.getCompanyCode(),
      this._commonService.getBranchCode()
    );

    const countData$ = this._accountingtransaction.GetChequesRowCount(
      bankid,
      this._commonService.getschemaname(),
      this._commonService.getbranchname(),
      this._searchText,
      'CHEQUESONHAND',
      modeofreceipt,
      this._commonService.getCompanyCode(),
      this._commonService.getBranchCode()
    );

    forkJoin([chequesData$, countData$]).subscribe({
      next: ([data, countData]: [any, any]) => {

        this.gridLoading = false;

        this.ChequesOnHandData =
          data.pchequesOnHandlist || [];

        this.ChequesClearReturnData =
          data.pchequesclearreturnlist || [];

        this._countData = countData;

        this.CountOfRecords();

        const total = +countData['total_count'] || 0;

        this.totalElements = total;

        // ✅ ONLY update totals
        // ❌ DO NOT reset paginator state here
        this.page.update(p => ({
          ...p,
          totalElements: total,
          totalPages: Math.ceil(total / p.size)
        }));

        const s = this.status();

        if (s === 'all') {
          this.All1();
        }
        else if (s === 'chequesreceived') {
          this.ChequesReceived1();
        }
        else if (s === 'onlinereceipts') {
          this.OnlineReceipts1();
        }
        else if (s === 'deposited') {
          this.Deposited1();
        }
        else if (s === 'cancelled') {
          this.Cancelled1();
        }

        this.applySortToGrid();
      },

      error: (error: any) => {
        this.gridLoading = false;
        this._commonService.showErrorMessage(error);
      }
    });
  }



  GetChequesOnHand(bankid: any, startindex: any, endindex: any, searchText: any) {
    this.gridLoading = true;
    const modeofreceipt = this.modeofreceipt || 'ALL';

    this._accountingtransaction
      .GetChequesOnHandData(
        bankid,
        this._commonService.getschemaname(),
        this._commonService.getbranchname(),
        startindex,
        endindex,
        this._searchText,
        modeofreceipt,
        '',
        this._commonService.getCompanyCode(),
        this._commonService.getBranchCode()
      )
      .subscribe({
        next: (data: any) => {
          this.gridLoading = false;
          this.ChequesOnHandData = data.pchequesOnHandlist || [];
          this.ChequesClearReturnData = data.pchequesclearreturnlist || [];

          const s = this.status();
          if (s === 'all') this.All1();
          else if (s === 'chequesreceived') this.ChequesReceived1();
          else if (s === 'onlinereceipts') this.OnlineReceipts1();
          else if (s === 'deposited') this.Deposited1();
          else if (s === 'cancelled') this.Cancelled1();
          this.applySortToGrid();
        },
        error: (error: any) => {
          this.gridLoading = false;
          this._commonService.showErrorMessage(error);
        }
      });
  }

  SelectBank(event: any) {

    if (!event) {
      this.bankid = 0;
      this.bankname.set(null);
      this.banknameshowhide.set(false);
      this.ChequesOnHandValidation.update(v => ({ ...v, bankname: 'Bank Name is required' }));
    } else {
      this.bankdetails = event;
      this.banknameshowhide.set(true);
      this.bankid = this.bankdetails.pbankid;
      this.bankname.set(this.bankdetails.pdepositbankname);
      if (this.bankdetails.pbankbalance < 0) {
        this.bankbalance.set(Math.abs(this.bankdetails.pbankbalance));
        this.bankbalancetype.set('Cr');
      } else if (this.bankdetails.pbankbalance === 0) {
        this.bankbalance.set(0);
        this.bankbalancetype.set('');
      } else {
        this.bankbalance.set(this.bankdetails.pbankbalance);
        this.bankbalancetype.set('Dr');
      }
      this.ChequesOnHandValidation.update(v => ({ ...v, bankname: '' }));
    }

    const s = this.status();
    if (s === 'all') this.modeofreceipt = 'ALL';
    else if (s === 'chequesreceived') this.modeofreceipt = 'CHEQUE';
    else if (s === 'onlinereceipts') this.modeofreceipt = 'ONLINE';
    else if (s === 'deposited') this.modeofreceipt = 'DEPOSIT';
    else if (s === 'cancelled') this.modeofreceipt = 'CANCEL';

    this.fromdate = '';
    this.todate = '';
    this.pageSetUp();
    this.GetBankBalance(this.bankid);
    this.GetChequesOnHand_Load(this.bankid);
    this.ChequesOnHandForm.controls['SearchClear'].setValue('');
  }



  onSearch(event: any) {
    const searchText = event.toString();
    this._searchText = searchText;
    const SearchLength: any = this._commonService.searchfilterlength;

    if (searchText !== '' && parseInt(searchText.length) >= parseInt(SearchLength)) {
      let columnName;
      const lastChar = searchText.substr(searchText.length - 1);
      const asciivalue = lastChar.charCodeAt(0);
      columnName = asciivalue > 47 && asciivalue < 58 ? 'pChequenumber' : '';
      this.pageSetUp();
      this.GetChequesOnHand_Load(this.bankid);
      this.gridData.set(
        this._commonService.transform(this.gridDatatemp(), searchText, columnName)
      );
    } else {
      if (searchText === '') {
        this.pageSetUp();
        this.GetChequesOnHand_Load(this.bankid);
      }
      this.gridData.set(this.gridDatatemp());
    }
    this.amounttotal.set(
      parseFloat(this.gridData().reduce((sum, c) => sum + c.ptotalreceivedamount, 0))
    );
  }

  checkedDeposit(event: any, data: any) {
    const isChecked = event?.checked ?? false;
    const gridtemp = this.gridData().filter(a => a.preceiptid === data.preceiptid);

    if (isChecked) {
      const chequedate = this._commonService.getDateObjectFromDataBase(gridtemp[0].pchequedate);
      const receiptdate = this._commonService.getDateObjectFromDataBase(gridtemp[0].preceiptdate);
      const transactiondate = this.ChequesOnHandForm.controls['ptransactiondate'].value
        ? new Date(this.ChequesOnHandForm.controls['ptransactiondate'].value)
        : null;
      const today = new Date();

      if (chequedate && !isNaN(chequedate.getTime()) && receiptdate && !isNaN(receiptdate.getTime())) {
        if (today.getTime() >= chequedate.getTime()) {
          if (transactiondate && transactiondate.getTime() >= receiptdate.getTime()) {
            data.pdepositstatus = true;
            data.pcancelstatus = false;
            data.pchequestatus = 'P';
          } else {
            data.pdepositstatus = false;
            data.pcancelstatus = false;
            data.pchequestatus = 'N';
            this._commonService.showWarningMessage('Transaction Date Should be Greater than Receipt Date');
          }
        } else {
          data.pdepositstatus = false;
          data.pcancelstatus = false;
          data.pchequestatus = 'N';
          this._commonService.showWarningMessage('Post Dated Cheques Are Not Allowed');
        }
      } else {
        if (receiptdate && !isNaN(receiptdate.getTime())) {
          if (transactiondate && transactiondate.getTime() >= receiptdate.getTime()) {
            data.pdepositstatus = true;
            data.pcancelstatus = false;
            data.pchequestatus = 'P';
          } else {
            data.pdepositstatus = false;
            data.pcancelstatus = false;
            data.pchequestatus = 'N';
            this._commonService.showWarningMessage('Transaction Date Should be Greater than Receipt Date');
          }
        } else {
          data.pdepositstatus = false;
          data.pcancelstatus = false;
          data.pchequestatus = 'N';
          this._commonService.showWarningMessage('Invalid Receipt Date');
        }
      }
    } else {
      data.pdepositstatus = false;
      data.pchequestatus = 'N';
    }

    this.gridData.update(rows =>
      rows.map(r => (r.preceiptid === data.preceiptid ? { ...data } : r))
    );
  }


  checkedCancel(event: any, data: any) {
    const isChecked = event?.checked ?? false;
    const gridtemp = this.gridData().filter(a => a.preceiptid === data.preceiptid);
    this.PopupData = data;

    if (isChecked) {
      const receiptdate = this._commonService.getDateObjectFromDataBase(gridtemp[0].preceiptdate);
      const transactiondateValue = this.ChequesOnHandForm.controls['ptransactiondate'].value;
      const transactiondate = transactiondateValue ? new Date(transactiondateValue) : null;

      if (receiptdate && !isNaN(receiptdate.getTime())) {
        if (transactiondate && transactiondate.getTime() >= receiptdate.getTime()) {
          data.pcancelstatus = true;
          data.pdepositstatus = false;
          data.pchequestatus = 'C';
          this.chequenumber.set(data.pChequenumber);
          this.CancelChargesOk(0);
        } else {
          data.pdepositstatus = false;
          data.pcancelstatus = false;
          data.pchequestatus = 'N';
          this._commonService.showWarningMessage('Transaction Date Should be Greater than Receipt Date');
        }
      } else {
        data.pdepositstatus = false;
        data.pcancelstatus = false;
        data.pchequestatus = 'N';
        this._commonService.showWarningMessage('Invalid Receipt Date');
      }
    } else {
      data.pcancelstatus = false;
      data.pchequestatus = 'N';
    }

    this.gridData.update(rows =>
      rows.map(r => (r.preceiptid === data.preceiptid ? { ...data } : r))
    );
  }

  CancelChargesOk(value: any) {
    this.gridData.update(rows =>
      rows.map(r =>
        r.preceiptid === this.PopupData?.preceiptid
          ? { ...r, pactualcancelcharges: value }
          : r
      )
    );
  }

  GridColumnsShow() {
    this.showhidegridcolumns = false;
    this.saveshowhide = true;
    this.brsdateshowhidedeposited.set(false);
    this.brsdateshowhidecancelled.set(false);
    this.hiddendate = true;
  }

  GridColumnsHide() {
    this.showhidegridcolumns = true;
    this.saveshowhide = false;
    this.hiddendate = false;
  }

  CountOfRecords() {
    this.all.set(this._countData['total_count']);
    this.onlinereceipts.set(this._countData['others_count']);
    this.chequesreceived.set(this._countData['cheques_count']);
    this.deposited.set(this._countData['clear_count']);
    this.cancelled.set(this._countData['return_count']);
  }

  All() {
    this.chequeboxshoworhide = true;
    this.fromdate = '';
    this.todate = '';
    this.modeofreceipt = 'ALL';
    this.status.set('all');
    this.pdfstatus = 'All';
    this.GridColumnsShow();
    this.pageSetUp();
    this.GetChequesOnHand_Load(this.bankid);
  }

  // All1() {
  //   this.gridData.set([]);
  //   this.gridDatatemp.set([]);
  //   this.GridColumnsShow();
  //   this.status.set('all');
  //   this.pdfstatus = 'All';
  //   this.modeofreceipt = 'ALL';

  //   const mapped = this.ChequesOnHandData.map((element: any) => ({
  //     ...element,
  //     pbranchname: this.extractBranchName(element)
  //   }));

  //   this.gridData.set(JSON.parse(JSON.stringify(mapped)));
  //   this.gridDatatemp.set(this.gridData());
  //   this.showicons.set(this.gridData().length > 0);

  //   const total = this._countData && +this._countData['total_count'] > 0
  //     ? +this._countData['total_count']
  //     : this.gridData().length;

  //   this.page.update(p => ({
  //     ...p,
  //     totalElements: total,
  //     totalPages: total > 10 ? Math.ceil(total / 10) : p.totalPages
  //   }));
  //   this.totalElements = total;

  //   this.amounttotal.set(
  //     parseFloat(this.gridData().reduce((sum: number, c: any) => sum + (c.ptotalreceivedamount || 0), 0))
  //   );
  //   this.setPageModel();
  // }

  All1() {
    this.gridData.set([]);
    this.gridDatatemp.set([]);
    this.GridColumnsShow();
    this.status.set('all');
    this.pdfstatus = 'All';
    this.modeofreceipt = 'ALL';

    const mapped = this.ChequesOnHandData.map((element: any) => ({
      ...element,
      pbranchname: this.extractBranchName(element)
    }));

    this.gridData.set(JSON.parse(JSON.stringify(mapped)));
    this.gridDatatemp.set(this.gridData());
    this.showicons.set(this.gridData().length > 0);

    this.amounttotal.set(
      parseFloat(this.gridData().reduce((sum: number, c: any) => sum + (c.ptotalreceivedamount || 0), 0))
    );
  }

  ChequesReceived() {
    this.pageSetUp();
    this.chequeboxshoworhide = true;
    this.fromdate = '';
    this.todate = '';
    this.modeofreceipt = 'CHEQUE';
    this.status.set('chequesreceived');
    this.pdfstatus = 'Cheques Received';
    this.GridColumnsShow();
    this.GetChequesOnHand_Load(this.bankid);
  }

  ChequesReceived1() {
    this.gridData.set([]);
    this.gridDatatemp.set([]);
    this.GridColumnsShow();
    this.status.set('chequesreceived');
    this.pdfstatus = 'Cheques Received';
    this.modeofreceipt = 'CHEQUE';

    const grid = this.ChequesOnHandData
      .filter(i => i.ptypeofpayment === 'CHEQUE')
      .map(i => ({ ...i, pbranchname: this.extractBranchName(i) }));

    this.gridData.set(JSON.parse(JSON.stringify(grid)));
    this.gridDatatemp.set(this.gridData());
    this.showicons.set(this.gridData().length > 0);

    const total = this._countData && +this._countData['cheques_count'] > 0
      ? +this._countData['cheques_count']
      : this.gridData().length;

    this.page.update(p => ({
      ...p,
      totalElements: total,
      totalPages: total > 10 ? Math.ceil(total / 10) : p.totalPages
    }));
    this.totalElements = total;

    this.amounttotal.set(
      parseFloat(this.gridData().reduce((sum: number, c: any) => sum + (c.ptotalreceivedamount || 0), 0))
    );
  }


  OnlineReceipts() {
    this.pageSetUp();
    this.chequeboxshoworhide = true;
    this.fromdate = '';
    this.todate = '';
    this.modeofreceipt = 'ONLINE';
    this.status.set('onlinereceipts');
    this.pdfstatus = 'Online Receipts';
    this.GridColumnsShow();
    this.GetChequesOnHand_Load(this.bankid);
  }

  OnlineReceipts1() {
    this.gridData.set([]);
    this.gridDatatemp.set([]);
    this.GridColumnsShow();
    this.status.set('onlinereceipts');
    this.pdfstatus = 'Online Receipts';
    this.fromdate = '';
    this.todate = '';
    this.modeofreceipt = 'ONLINE';

    const grid = this.ChequesOnHandData
      .filter(i => i.ptypeofpayment !== 'CHEQUE')
      .map(i => ({ ...i, pbranchname: this.extractBranchName(i) }));

    this.gridData.set(JSON.parse(JSON.stringify(grid)));
    this.gridDatatemp.set(this.gridData());
    this.showicons.set(this.gridData().length > 0);

    const total = this._countData && +this._countData['others_count'] > 0
      ? +this._countData['others_count']
      : this.gridData().length;

    this.page.update(p => ({
      ...p,
      totalElements: total,
      totalPages: total > 10 ? Math.ceil(total / 10) : p.totalPages
    }));
    this.totalElements = total;

    this.amounttotal.set(
      parseFloat(this.gridData().reduce((sum: number, c: any) => sum + (c.ptotalreceivedamount || 0), 0))
    );
  }



  Deposited() {
    this.pageSetUp();
    this.chequeboxshoworhide = false;
    this.fromdate = '';
    this.todate = '';
    this.modeofreceipt = 'DEPOSIT';
    this.status.set('deposited');
    this.pdfstatus = 'Deposited';
    this.datetitle = 'Deposited Date';
    this.GridColumnsHide();
    this.brsdateshowhidedeposited.set(true);
    this.brsdateshowhidecancelled.set(false);

    let finalFromDate: Date = this.today2;
    let finalToDate: Date = this.today2;

    try {
      if (this.bankbalancedetails?.pfrombrsdate) {
        const d = this._commonService.getDateObjectFromDataBase(this.bankbalancedetails.pfrombrsdate);
        if (d instanceof Date && !isNaN(d.getTime())) finalFromDate = d;
      }
    } catch (e) { finalFromDate = new Date(); }

    try {
      if (this.bankbalancedetails?.ptobrsdate) {
        const d = this._commonService.getDateObjectFromDataBase(this.bankbalancedetails.ptobrsdate);
        if (d instanceof Date && !isNaN(d.getTime())) finalToDate = d;
      }
    } catch (e) { finalToDate = new Date(); }


    this.ChequesOnHandForm.patchValue({ pfrombrsdate: finalFromDate, ptobrsdate: finalToDate });
    this.ChequesOnHandForm.controls['pfrombrsdate'].markAsDirty();
    this.ChequesOnHandForm.controls['ptobrsdate'].markAsDirty();


    this.GetChequesOnHand_Load(this.bankid);
  }

  Deposited1() {

    this.modeofreceipt = 'DEPOSIT';
    this.status.set('deposited');
    this.pdfstatus = 'Deposited';
    this.datetitle = 'Deposited Date';
    this.gridData.set([]);
    this.gridDatatemp.set([]);
    this.GridColumnsHide();
    this.brsdateshowhidedeposited.set(true);
    this.brsdateshowhidecancelled.set(false);
    this.ChequesOnHandForm.patchValue({ pfrombrsdate: null, ptobrsdate: null });
    const today = new Date();
    this.ChequesOnHandForm.patchValue({ pfrombrsdate: this.today2, ptobrsdate: this.today2 });
    this.ChequesOnHandForm.controls['pfrombrsdate'].markAsDirty();
    this.ChequesOnHandForm.controls['ptobrsdate'].markAsDirty();
    this.ChequesOnHandForm.controls['pfrombrsdate'].updateValueAndValidity();
    this.ChequesOnHandForm.controls['ptobrsdate'].updateValueAndValidity();

    let grid: any[] = [];
    if (this.bankid === 0) {
      grid = this.ChequesClearReturnData
        .filter(i => i.pchequestatus === 'P')
        .map(i => ({
          ...i,
          pbranchname: this.extractBranchName(i),
          receiptnumbers: i.receiptnumbers || i.preceiptid || i.receipt_number || '',
          pChequenumber: i.pChequenumber || i.chqueno || i.cheque_number || '',
          preceiptdate: i.preceiptdate || i.receipt_date || '',
          pchequedate: i.pchequedate || i.cheque_date || '',
          pdepositeddate: i.pdepositeddate || i.deposited_date || i.pchequedepositdate || ''
        }));
    } else {
      grid = this.ChequesClearReturnData
        .filter(i => i.pchequestatus === 'P' && i.pdepositbankid === this.bankid)
        .map(i => ({
          ...i,
          pbranchname: this.extractBranchName(i),
          receiptnumbers: i.receiptnumbers || i.preceiptid || i.receipt_number || '',
          pChequenumber: i.pChequenumber || i.chqueno || i.cheque_number || '',
          preceiptdate: i.preceiptdate || i.receipt_date || '',
          pchequedate: i.pchequedate || i.cheque_date || '',
          pdepositeddate: i.pdepositeddate || i.deposited_date || i.pchequedepositdate || ''
        }));
    }

    this.gridData.set(JSON.parse(JSON.stringify(grid)));
    this.gridDatatemp.set(this.gridData());
    this.showicons.set(this.gridData().length > 0);

    const total = this._countData && +this._countData['clear_count'] > 0
      ? +this._countData['clear_count']
      : this.gridData().length;

    this.page.update(p => ({
      ...p,
      totalElements: total,
      totalPages: total > 10 ? Math.ceil(total / 10) : p.totalPages
    }));
    this.totalElements = total;
    this.amounttotal.set(
      parseFloat(this.gridData().reduce((sum: number, c: any) => sum + (c.ptotalreceivedamount || 0), 0))
    );
  }

  Cancelled() {
    this.pageSetUp();
    this.chequeboxshoworhide = false;
    this.fromdate = '';
    this.todate = '';
    this.modeofreceipt = 'CANCEL';
    this.status.set('cancelled');
    this.pdfstatus = 'Cancelled';
    this.datetitle = 'Cancelled Date';
    this.GridColumnsHide();
    this.brsdateshowhidedeposited.set(true);
    this.brsdateshowhidecancelled.set(false);
    const fromDate = this._commonService.getDateObjectFromDataBase(
      this.bankbalancedetails.pfrombrsdate
    );
    const toDate = this._commonService.getDateObjectFromDataBase(
      this.bankbalancedetails.ptobrsdate
    );

    this.BrsDateForm.patchValue({ frombrsdate: fromDate, tobrsdate: toDate });
    this.BrsDateForm.controls['frombrsdate'].markAsDirty();
    this.BrsDateForm.controls['tobrsdate'].markAsDirty();

    this.GetChequesOnHand_Load(this.bankid);
  }


  Cancelled1() {
    this.modeofreceipt = 'CANCEL';
    this.status.set('cancelled');
    this.pdfstatus = 'Cancelled';
    this.datetitle = 'Cancelled Date';
    this.gridData.set([]);
    this.gridDatatemp.set([]);
    this.GridColumnsHide();
    this.brsdateshowhidedeposited.set(false);
    this.brsdateshowhidecancelled.set(true);
    this.ChequesOnHandForm.patchValue({ pfrombrsdate: null, ptobrsdate: null });

    const today = new Date();
    this.BrsDateForm.patchValue({ frombrsdate: this.today2, tobrsdate: this.today2 });
    this.BrsDateForm.controls['frombrsdate'].markAsDirty();
    this.BrsDateForm.controls['tobrsdate'].markAsDirty();
    this.BrsDateForm.controls['frombrsdate'].updateValueAndValidity();
    this.BrsDateForm.controls['tobrsdate'].updateValueAndValidity();


    const grid = this.ChequesClearReturnData
      .filter(i => i.pchequestatus === 'C')
      .map(i => ({
        ...i,
        pbranchname: this.extractBranchName(i),
        receiptnumbers: i.receiptnumbers || i.preceiptid || i.receipt_number || '',
        pChequenumber: i.pChequenumber || i.chqueno || i.cheque_number || '',
        preceiptdate: i.preceiptdate || i.receipt_date || '',
        pchequedate: i.pchequedate || i.cheque_date || '',
        pdepositeddate: i.pdepositeddate || i.cancelled_date || i.pchequedepositdate || ''
      }));

    this.gridData.set(JSON.parse(JSON.stringify(grid)));
    this.gridDatatemp.set(this.gridData());
    this.showicons.set(this.gridData().length > 0);

    const total = this._countData && +this._countData['return_count'] > 0
      ? +this._countData['return_count']
      : this.gridData().length;

    this.page.update(p => ({
      ...p,
      totalElements: total,
      totalPages: total > 10 ? Math.ceil(total / 10) : p.totalPages
    }));
    this.totalElements = total;

    this.amounttotal.set(
      parseFloat(this.gridData().reduce((sum: number, c: any) => sum + (c.ptotalreceivedamount || 0), 0))
    );
  }


  pdfOrprint(printOrPdf: 'Print' | 'Pdf') {

    this.Totalamount = 0;
    const s = this.status();
    if (s === 'all') this.modeofreceipt = 'ALL';
    else if (s === 'chequesreceived') this.modeofreceipt = 'CHEQUE';
    else if (s === 'onlinereceipts') this.modeofreceipt = 'ONLINE';
    else if (s === 'deposited') this.modeofreceipt = 'DEPOSIT';
    else if (s === 'cancelled') this.modeofreceipt = 'CANCEL';

    this._companyDetailsService.GetCompanyData().subscribe({
      next: (companyRes: any) => {
        const companyData = Array.isArray(companyRes) && companyRes.length > 0 ? companyRes[0] : null;
        if (companyData) {
          const mappedDetails = {
            companyName: companyData.pCompanyName || companyData.companyName || '',
            registrationAddress: companyData.pAddress1 || companyData.registrationAddress || '',
            cinNumber: companyData.pCinNo || companyData.cinNumber || '',
            branchName: companyData.pBranchname || companyData.branchName || '',
            uniqueBranchName: companyData.pBranchname || companyData.uniqueBranchName || '',
            branchAddress: companyData.pAddress1 || companyData.branchAddress || ''
          };
          // sessionStorage.setItem('CompanyDetails', JSON.stringify(mappedDetails));
          this.companydetails = mappedDetails;
        } else {
          this._setFallbackCompanyDetails();
        }
        this._generatePdf(printOrPdf);
      },
      error: () => {
        this._setFallbackCompanyDetails();
        this._generatePdf(printOrPdf);
      }
    });
  }

  private _setFallbackCompanyDetails() {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const parsedUser = loggedInUser ? JSON.parse(loggedInUser) : null;
    const fallback = {
      companyName: parsedUser?.companyName || this._commonService.getCompanyCode() || '',
      registrationAddress: parsedUser?.registrationAddress || '',
      cinNumber: parsedUser?.cinNumber || '',
      branchName: parsedUser?.branchName || this._commonService.getBranchCode() || '',
      uniqueBranchName: parsedUser?.uniqueBranchName || parsedUser?.branchName || '',
      branchAddress: parsedUser?.branchAddress || ''
    };
    // sessionStorage.setItem('CompanyDetails', JSON.stringify(fallback));
    this.companydetails = fallback;
  }


  private _generatePdf(printOrPdf: 'Print' | 'Pdf') {
    this.Totalamount = 0;
    const isDeposited = this.status() === 'deposited';
    const isCancelled = this.status() === 'cancelled';
    const totalCount = this.totalElements || 99999;
    const searchText = this._searchText || '';

    if (isCancelled) {
      this._fetchDataAndBuildPdf('CANCELLED', 'C', isDeposited, isCancelled, printOrPdf, searchText);
      return;
    }
    if (isDeposited) {
      this._fetchDataAndBuildPdf('DEPOSITED', 'P', isDeposited, isCancelled, printOrPdf, searchText);
      return;
    }

    let apiMode = 'ALL';
    if (this.status() === 'chequesreceived') apiMode = 'CHEQUE';
    else if (this.status() === 'onlinereceipts') apiMode = 'ONLINE';

    this._accountingtransaction
      .GetChequesOnHandData(
        this.bankid,
        this._commonService.getschemaname(),
        this._commonService.getbranchname(),
        0,
        totalCount,
        searchText,
        apiMode,
        'PDF',
        this._commonService.getCompanyCode(),
        this._commonService.getBranchCode()
      )
      .subscribe({
        next: (result: any) => {
          let gridData: any[] = result?.pchequesOnHandlist || [];


          if (this.status() === 'chequesreceived')
            gridData = gridData.filter((x: any) => x.ptypeofpayment === 'CHEQUE');
          else if (this.status() === 'onlinereceipts')
            gridData = gridData.filter((x: any) => x.ptypeofpayment !== 'CHEQUE');

          if (searchText) {
            gridData = gridData.filter((x: any) =>
              (x.pChequenumber || '').toLowerCase().includes(searchText.toLowerCase()) ||
              (x.receiptnumbers || '').toLowerCase().includes(searchText.toLowerCase()) ||
              (x.ppartyname || '').toLowerCase().includes(searchText.toLowerCase())
            );
          }

          this._buildPdfRows(
            gridData.length ? gridData : [...this.gridData()],
            printOrPdf, isDeposited, isCancelled
          );
        },
        error: () => this._buildPdfRows([...this.gridData()], printOrPdf, isDeposited, isCancelled)
      });
  }



  private _fetchDataAndBuildPdf(
    mode: string | null,
    statusFilter: string,
    isDeposited: boolean,
    isCancelled: boolean,
    printOrPdf: 'Print' | 'Pdf',
    searchText: string = ''
  ) {
    const fallback = () => this._buildPdfRows([...this.gridData()], printOrPdf, isDeposited, isCancelled);

    const applyFilters = (data: any[]): any[] => {
      let filtered = data.filter((x: any) => x.pchequestatus === statusFilter);

      if (isDeposited && this.bankid && this.bankid !== 0)
        filtered = filtered.filter((x: any) => x.pdepositbankid === this.bankid);


      if (searchText) {
        filtered = filtered.filter((x: any) =>
          (x.pChequenumber || '').toLowerCase().includes(searchText.toLowerCase()) ||
          (x.receiptnumbers || '').toLowerCase().includes(searchText.toLowerCase()) ||
          (x.ppartyname || '').toLowerCase().includes(searchText.toLowerCase())
        );
      }

      return filtered;
    };

    if (this.fromdate && this.todate && mode) {
      this._accountingtransaction
        .DataFromBrsDatesChequesOnHand(
          this.fromdate, this.todate, this.bankid,
          mode,
          searchText || '0',
          0, 99999
        )
        .subscribe({
          next: (result: any) => {
            const data = applyFilters(result?.pchequesclearreturnlist || []);
            this._buildPdfRows(data.length ? data : [...this.gridData()], printOrPdf, isDeposited, isCancelled);
          },
          error: fallback
        });
    } else {
      this._accountingtransaction
        .GetChequesOnHandData(
          this.bankid,
          this._commonService.getschemaname(),
          this._commonService.getbranchname(),
          0, 99999,
          searchText || '',
          'ALL', 'PDF',
          this._commonService.getCompanyCode(),
          this._commonService.getBranchCode()
        )
        .subscribe({
          next: (result: any) => {
            const data = applyFilters(result?.pchequesclearreturnlist || []);
            this._buildPdfRows(data.length ? data : [...this.gridData()], printOrPdf, isDeposited, isCancelled);
          },
          error: fallback
        });
    }
  }



  private _buildPdfRows(
    gridData: any[],
    printOrPdf: 'Print' | 'Pdf',
    isDeposited: boolean,
    isCancelled: boolean
  ) {
    this.Totalamount = 0;

    if (!gridData || gridData.length === 0) {
      alert('No data available');
      return;
    }

    const isDepositOrCancel = isDeposited || isCancelled;
    const rows: any[] = [];
    const reportname = 'Cheques On Hand';

    const gridheaders = isDepositOrCancel
      ? [
        'Cheque/Reference No.', 'Branch Name', 'Amount', 'Receipt No',
        'Receipt Date', 'Cheque Date', this.datetitle,
        'Transaction Mode', 'Cheque Bank Name', 'Party'
      ]
      : [
        'Cheque/Reference No.', 'Branch Name', 'Amount', 'Receipt No',
        'Receipt Date', 'Cheque Date', 'Transaction Mode',
        'Cheque Bank Name', 'Party',
        'Self Cheque', 'Chit Status', 'Deposited Bank'
      ];

    const colWidthHeight = isDepositOrCancel
      ? {
        0: { cellWidth: 33, halign: 'center' },
        1: { cellWidth: 26, halign: 'left' },
        2: { cellWidth: 24, halign: 'right' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' },
        6: { cellWidth: 23, halign: 'center' },
        7: { cellWidth: 25, halign: 'center' },
        8: { cellWidth: 40, halign: 'center' },
        9: { cellWidth: 30, halign: 'left' },
        10: { cellWidth: 45, halign: 'left' }
      }
      : {
        0: { cellWidth: 22, halign: 'center' },
        1: { cellWidth: 26, halign: 'left' },
        2: { cellWidth: 24, halign: 'right' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 20, halign: 'center' },
        7: { cellWidth: 25, halign: 'center' },
        8: { cellWidth: 25, halign: 'left' },
        9: { cellWidth: 35, halign: 'left' },
        10: { cellWidth: 15, halign: 'center' },
        11: { cellWidth: 20, halign: 'center' },
        12: { cellWidth: 20, halign: 'left' }
      };

    gridData.forEach((element: any) => {

      const datereceipt = this.datepipe.transform(element.preceiptdate,'dd-MMM-yyyy');
      // this._commonService.getFormatDateGlobal(element.preceiptdate);

      const depositeddate = element.pdepositeddate
        ? this.datepipe.transform(element.pdepositeddate,'dd-MMM-yyyy')
        : '';

      const chequedate = element.pchequedate
        ? this.datepipe.transform(element.pchequedate,'dd-MMM-yyyy')
        // this._commonService.getFormatDateGlobal(element.pchequedate)
        : '';

      const branchName =
        typeof element.pbranchname === 'string' && element.pbranchname.trim() !== ''
          ? element.pbranchname
          : '';

      const selfCheque =
        element.selfchequestatus === true ? 'Yes'
          : element.selfchequestatus === false ? 'No'
            : '';

      const chitStatus = element.chitstatus || '';
      const depositedBank = element.pdepositedBankName || '';


      const receiptNumber =
        element.receiptnumbers
        || element.preceiptnumbers
        || element.preceiptnumber
        || element.receipt_number
        || element.receiptno
        || element.preceiptid
        || '';


      let totalreceivedamt = '';
      try {
        if (
          element.ptotalreceivedamount != null &&
          element.ptotalreceivedamount !== undefined &&
          element.ptotalreceivedamount !== 0
        ) {
          const amt = parseFloat(element.ptotalreceivedamount) || 0;
          totalreceivedamt = this._commonService.convertAmountToPdfFormat(
            this._commonService.currencyformat(parseFloat(amt.toFixed(2)))
          );
          this.Totalamount += amt;
        }
      } catch (e) {
        totalreceivedamt = element.ptotalreceivedamount?.toString() || '';
        this.Totalamount += parseFloat(element.ptotalreceivedamount) || 0;
      }

      const row = isDepositOrCancel
        ? [
          element.pChequenumber || '',
          branchName,
          totalreceivedamt,
          receiptNumber,
          datereceipt,
          chequedate,
          depositeddate,
          element.ptypeofpayment || '',
          element.cheque_bank || '',
          element.ppartyname || ''
        ]
        : [
          element.pChequenumber || '',
          branchName,
          totalreceivedamt,
          receiptNumber,
          datereceipt,
          chequedate,
          element.ptypeofpayment || '',
          element.cheque_bank || '',
          element.ppartyname || '',
          selfCheque,
          chitStatus,
          depositedBank
        ];

      rows.push(row);
    });


    let amounttotal = '';
    try {
      this.Totalamount = parseFloat(this.Totalamount.toFixed(2));
      amounttotal = this._commonService.convertAmountToPdfFormat(
        this._commonService.currencyformat(this.Totalamount)
      );
    } catch (e) {
      amounttotal = parseFloat(this.Totalamount.toFixed(2)).toString() || '0';
    }

    const totalColCount = isDepositOrCancel ? 11 : 13;
    const lbl = {
      content: 'Total',
      colSpan: 2,
      styles: { halign: 'right', fontSize: 16, fontStyle: 'bold' }
    };
    const lblvalue = {
      content: amounttotal,
      styles: { halign: 'right', fontSize: 16, fontStyle: 'bold' }
    };
    const totalRow: any[] = [lbl, lblvalue];
    for (let i = 0; i < totalColCount - 2; i++) {
      totalRow.push('');
    }
    rows.push(totalRow);

    this._commonService._downloadchequesReportsPdf(
      reportname, rows, gridheaders, colWidthHeight, 'landscape',
      this.bankname() || '', this.brsdate() || '', this.pdfstatus || '',
      printOrPdf, ' '
    );
  }



  Save() {
    this.count = 0;
    this.DataForSaving = [];
    let isValid = true;
    let deposit = 0;
    this.ChequesOnHandValidation.set({});
    if (!this.bankid || this.bankid == 0) {
      this._commonService.showWarningMessage('Please Select Bank');
      return;
    }

    const hasSelectedRows = this.gridData().some(
      row => row.pdepositstatus === true || row.pcancelstatus === true
    );

    this.gridData().forEach(aa => {
      if ((aa.pchequestatus || '').trim() === 'P') deposit++;
    });

    let validationcount = 0;
    this.gridData().forEach(row => {
      const s = (row.pchequestatus || '').trim();
      if ((s === 'P' || s === 'C') && row.selfchequestatus === true) validationcount++;
    });

    const control = this.ChequesOnHandForm.get('bankname');
    if (deposit > 0 && validationcount > 0) {
      control?.setValidators(Validators.required);
    } else {
      control?.clearValidators();
    }
    control?.updateValueAndValidity();

    const formValid = this.checkValidations(this.ChequesOnHandForm, isValid);

    if (formValid) {
      const addedReceiptIds = new Set<string>();

      this.gridData().forEach(row => {
        const status = (row.pchequestatus || '').trim();
        const receiptId = row.preceiptid?.toString();
        console.log('Row status:', status, '| receiptId:', receiptId);

        if (addedReceiptIds.has(receiptId)) return;

        if (status === 'P' || status === 'C') {
          this.count++;
          addedReceiptIds.add(receiptId);
          this.DataForSaving.push(this._mapRowToSavePayload(row, status));
        }
      });

      if (this.DataForSaving.length === 0) {
        setTimeout(() => this._commonService.showWarningMessage('please select atleast one row'), 0);
        return;
      }

      const dataSnapshot = [...this.DataForSaving];
      const userConfirmed = confirm('Do You Want To Save ?');

      if (!userConfirmed) {
        this.checked = false;
        this.disablesavebutton.set(false);
        this.buttonname.set('Save');
        return;
      }

      this.disablesavebutton.set(true);
      this.buttonname.set('Processing');

      const payload = {
        global_schema: this._commonService.getschemaname(),
        branch_schema: this._commonService.getbranchname(),
        companycode: this._commonService.getCompanyCode(),
        branchcode: this._commonService.getBranchCode(),
        pCreatedby: this._commonService.getCreatedBy()?.toString() || '1',
        // ptransactiondate: this.datepipe.transform(
        //   this.ChequesOnHandForm.controls['ptransactiondate'].value,
        //   'yyyy-MM-dd'
        // ),

        ptransactiondate: this.datepipe.transform(
          this.ChequesOnHandForm.controls['ptransactiondate'].value,
          'yyyy/MM/dd'
        ),
        pchequecleardate: '',
        pcaobranchcode: '',
        pcaobranchname: '',
        pcaobranchid: '',
        pfrombrsdate: '',
        ptobrsdate: '',
        _BankBalance: '',
        chequestype: '',
        _CashBalance: '',
        banknameForLegal: '',
        pipaddress: this._commonService.getIpAddress() || '127.0.0.1',
        pchequesOnHandlist: dataSnapshot,
        pchequesclearreturnlist: [],
        pchequesotherslist: [],
        auto_brs_type_name: ''
      };

      console.log('Payload:', JSON.stringify(payload));

      this._accountingtransaction.SaveChequesOnHand(JSON.stringify(payload)).subscribe({
        next: (data: any) => {
          console.log('API response:', data);
          if (data?.success) {
            setTimeout(() => this._commonService.showSuccessMessage(), 0);

            this.DataForSaving = [];
            this.count = 0;
            this.checked = false;
            this.disablesavebutton.set(false);
            this.buttonname.set('Save');
            this.bankid = 0;
            this.bankdetails = null;
            this.bankname.set(null);
            this.banknameshowhide.set(false);
            const bankControl = this.ChequesOnHandForm.get('bankname');
            bankControl?.clearValidators();
            bankControl?.reset(null);
            bankControl?.updateValueAndValidity({ emitEvent: false });


            this.Clear();


            this.GetChequesOnHand_Load(0);

          } else {
            setTimeout(() => this._commonService.showWarningMessage(data?.message || 'Save failed'), 0);
            this.checked = false;
            this.disablesavebutton.set(false);
            this.buttonname.set('Save');
          }
        },
        error: (error: any) => {
          console.log('Save Error:', error);
          setTimeout(() => this._commonService.showErrorMessage(error), 0);
          this.checked = false;
          this.disablesavebutton.set(false);
          this.buttonname.set('Save');
        }
      });
    }
  }



  // private _mapRowToSavePayload(row: any, status: string): any {
  //   const str = (v: any) => v?.toString() || '';
  //   return {
  //     pRecordid: str(row.pRecordid),
  //     pUpiname: str(row.pUpiname),
  //     pUpiid: str(row.pUpiid),
  //     pBankconfigurationId: str(row.pBankconfigurationId),
  //     pBankName: str(row.pBankName),
  //     ptranstype: str(row.ptranstype),
  //     ptypeofpayment: str(row.ptypeofpayment),
  //     pChequenumber: str(row.pChequenumber),
  //     pchequedate: str(row.pchequedate),
  //     pchequedepositdate: str(row.pchequedepositdate),
  //     pchequecleardate: str(row.pchequecleardate),
  //     pbankid: str(row.pbankid),
  //     branchid: str(row.branchid),
  //     pCardNumber: str(row.pCardNumber),
  //     pdepositbankid: status === 'P'
  //       ? (this.bankdetails ? str(this.bankdetails.pbankid) : '0')
  //       : status === 'C'
  //         ? (this.bankdetails ? str(this.bankdetails.pbankid) : str(row.pdepositbankid) || '0')
  //         : (str(row.pdepositbankid) || '0'),
  //     pdepositbankname: str(row.pdepositbankname),
  //     pAccountnumber: str(row.pAccountnumber),
  //     challanaNo: str(row.challanaNo),
  //     preceiptid: str(row.preceiptid),
  //     preceiptdate: str(row.preceiptdate),
  //     pmodofreceipt: str(row.pmodofreceipt),
  //     ptotalreceivedamount: str(row.ptotalreceivedamount),
  //     pnarration: str(row.pnarration),
  //     ppartyname: str(row.ppartyname),
  //     ppartyid: str(row.ppartyid),
  //     pistdsapplicable: str(row.pistdsapplicable),
  //     pTdsSection: str(row.pTdsSection),
  //     pTdsPercentage: str(row.pTdsPercentage),
  //     ptdsamount: str(row.ptdsamount),
  //     ptdscalculationtype: str(row.ptdscalculationtype),
  //     ppartypannumber: str(row.ppartypannumber),
  //     ppartyreftype: str(row.ppartyreftype),
  //     ppartyreferenceid: str(row.ppartyreferenceid),
  //     preceiptslist: row.preceiptslist || [],
  //     pFilename: str(row.pFilename),
  //     pFilepath: str(row.pFilepath),
  //     pFileformat: str(row.pFileformat),
  //     pCleardate: str(row.pCleardate),
  //     pdepositeddate: status === 'P' ? '' : str(row.pdepositeddate),
  //     ptdsaccountid: str(row.ptdsaccountid),
  //     preceiptrecordid: str(row.preceiptrecordid),
  //     pTdsSectionId: str(row.pTdsSectionId),
  //     groupcode: str(row.groupcode),
  //     preceiptno: str(row.preceiptno),
  //     formname: str(row.formname),
  //     chitpaymentid: str(row.chitpaymentid),
  //     adjustmentid: str(row.adjustmentid),
  //     pdepositstatus: row.pdepositstatus === true ? 'true' : 'false',
  //     pcancelstatus: row.pcancelstatus === true ? 'true' : 'false',
  //     preturnstatus: str(row.preturnstatus),
  //     pbranchname: str(row.pbranchname),
  //     pchequestatus: status,
  //     pcancelcharges: str(row.pcancelcharges),
  //     pactualcancelcharges: str(row.pactualcancelcharges) || '0',
  //     pledger: str(row.pledger),
  //     cancelstatus: str(row.cancelstatus),
  //     returnstatus: str(row.returnstatus),
  //     clearstatus: str(row.clearstatus),
  //     chqueno: str(row.chqueno),
  //     issueddate: str(row.issueddate),
  //     chitgroupcode: str(row.chitgroupcode),
  //     chitgroupid: str(row.chitgroupid),
  //     ticketno: str(row.ticketno),
  //     chequeamount: str(row.chequeamount),
  //     zpdaccountid: str(row.zpdaccountid),
  //     installmentno: str(row.installmentno),
  //     schemesubscriberid: str(row.schemesubscriberid),
  //     contactid: str(row.contactid),
  //     schemetype: str(row.schemetype),
  //     checksentryrecordid: str(row.checksentryrecordid),
  //     cheque_bank: str(row.cheque_bank),
  //     selfchequestatus: row.selfchequestatus === true ? 'true'
  //       : row.selfchequestatus === false ? 'false'
  //         : str(row.selfchequestatus),
  //     branch_name: str(row.branch_name),
  //     receipt_branch_name: str(row.receipt_branch_name),
  //     subscriber_details: str(row.subscriber_details),
  //     chitReceiptNo: str(row.chitReceiptNo),
  //     total_count: str(row.total_count),
  //     transactionNo: str(row.transactionNo),
  //     transactiondate: str(row.transactiondate),
  //     chitstatus: str(row.chitstatus),
  //     chitgroupstatus: str(row.chitgroupstatus),
  //     receiptnumbers: str(row.receiptnumbers),
  //     //pdepositedBankid: str(row.pdepositedBankid),
  //     pdepositedBankid: status === 'P' || status === 'C'
  //       ? (this.bankdetails ? str(this.bankdetails.pbankid) : str(row.pdepositedBankid) || '0')
  //       : str(row.pdepositedBankid),

  //     pdepositedBankName: str(row.pdepositedBankName),
  //     preferencetext: str(row.preferencetext),
  //     preceiptype: str(row.preceiptype),
  //     puploadeddate: str(row.puploadeddate),
  //     subscriberbankaccountno: str(row.subscriberbankaccountno),
  //     pkgmsreceiptdate: str(row.pkgmsreceiptdate),
  //     pCreatedby: this._commonService.getCreatedBy()?.toString() ?? '1'
  //   };
  // }


  private _mapRowToSavePayload(row: any, status: string): any {
    const str = (v: any) => v?.toString() || '';

    // ADD this date formatter — YYYY/MM/DD to match procedure's to_date format
    const fmtSlash = (d: any): string => {
      if (!d) return '';
      const parsed = d instanceof Date ? d : new Date(d);
      if (isNaN(parsed.getTime())) return '';
      return this.datepipe.transform(parsed, 'yyyy/MM/dd') || '';
    };

    return {
      pRecordid: str(row.pRecordid),
      pUpiname: str(row.pUpiname),
      pUpiid: str(row.pUpiid),
      pBankconfigurationId: str(row.pBankconfigurationId),
      pBankName: str(row.pBankName),
      ptranstype: str(row.ptranstype),
      ptypeofpayment: str(row.ptypeofpayment),
      pChequenumber: str(row.pChequenumber),

      // ✅ FIXED — use YYYY/MM/DD format
      pchequedate: fmtSlash(row.pchequedate),
      pchequedepositdate: fmtSlash(row.pchequedepositdate),
      pchequecleardate: fmtSlash(row.pchequecleardate),

      pbankid: str(row.pbankid),
      branchid: str(row.branchid),
      pCardNumber: str(row.pCardNumber),
      pdepositbankid: status === 'P'
        ? (this.bankdetails ? str(this.bankdetails.pbankid) : '0')
        : status === 'C'
          ? (this.bankdetails ? str(this.bankdetails.pbankid) : str(row.pdepositbankid) || '0')
          : (str(row.pdepositbankid) || '0'),
      pdepositbankname: str(row.pdepositbankname),
      pAccountnumber: str(row.pAccountnumber),
      challanaNo: str(row.challanaNo),
      preceiptid: str(row.preceiptid),

      // ✅ FIXED
      preceiptdate: fmtSlash(row.preceiptdate),

      pmodofreceipt: str(row.pmodofreceipt),
      ptotalreceivedamount: str(row.ptotalreceivedamount),
      pnarration: str(row.pnarration),
      ppartyname: str(row.ppartyname),
      ppartyid: str(row.ppartyid),
      pistdsapplicable: str(row.pistdsapplicable),
      pTdsSection: str(row.pTdsSection),
      pTdsPercentage: str(row.pTdsPercentage),
      ptdsamount: str(row.ptdsamount),
      ptdscalculationtype: str(row.ptdscalculationtype),
      ppartypannumber: str(row.ppartypannumber),
      ppartyreftype: str(row.ppartyreftype),
      ppartyreferenceid: str(row.ppartyreferenceid),
      preceiptslist: row.preceiptslist || [],
      pFilename: str(row.pFilename),
      pFilepath: str(row.pFilepath),
      pFileformat: str(row.pFileformat),

      // ✅ FIXED
      pCleardate: fmtSlash(row.pCleardate),
      pdepositeddate: status === 'P' ? '' : fmtSlash(row.pdepositeddate),

      ptdsaccountid: str(row.ptdsaccountid),
      preceiptrecordid: str(row.preceiptrecordid),
      pTdsSectionId: str(row.pTdsSectionId),
      groupcode: str(row.groupcode),
      preceiptno: str(row.preceiptno),
      formname: str(row.formname),
      chitpaymentid: str(row.chitpaymentid),
      adjustmentid: str(row.adjustmentid),
      pdepositstatus: row.pdepositstatus === true ? 'true' : 'false',
      pcancelstatus: row.pcancelstatus === true ? 'true' : 'false',
      preturnstatus: str(row.preturnstatus),
      pbranchname: str(row.pbranchname),
      pchequestatus: status,
      pcancelcharges: str(row.pcancelcharges),
      pactualcancelcharges: str(row.pactualcancelcharges) || '0',
      pledger: str(row.pledger),
      cancelstatus: str(row.cancelstatus),
      returnstatus: str(row.returnstatus),
      clearstatus: str(row.clearstatus),
      chqueno: str(row.chqueno),

      // ✅ FIXED
      issueddate: fmtSlash(row.issueddate),

      chitgroupcode: str(row.chitgroupcode),
      chitgroupid: str(row.chitgroupid),
      ticketno: str(row.ticketno),
      chequeamount: str(row.chequeamount),
      zpdaccountid: str(row.zpdaccountid),
      installmentno: str(row.installmentno),
      schemesubscriberid: str(row.schemesubscriberid),
      contactid: str(row.contactid),
      schemetype: str(row.schemetype),
      checksentryrecordid: str(row.checksentryrecordid),
      cheque_bank: str(row.cheque_bank),
      selfchequestatus: row.selfchequestatus === true ? 'true'
        : row.selfchequestatus === false ? 'false'
          : str(row.selfchequestatus),
      branch_name: str(row.branch_name),
      receipt_branch_name: str(row.receipt_branch_name),
      subscriber_details: str(row.subscriber_details),
      chitReceiptNo: str(row.chitReceiptNo),
      total_count: str(row.total_count),
      transactionNo: str(row.transactionNo),

      // ✅ FIXED
      transactiondate: fmtSlash(row.transactiondate),

      chitstatus: str(row.chitstatus),
      chitgroupstatus: str(row.chitgroupstatus),
      receiptnumbers: str(row.receiptnumbers),
      pdepositedBankid: status === 'P' || status === 'C'
        ? (this.bankdetails ? str(this.bankdetails.pbankid) : str(row.pdepositedBankId) || '0')
        : str(row.pdepositedBankId),
      pdepositedBankName: str(row.pdepositedBankName),
      preferencetext: str(row.preferencetext),
      preceiptype: str(row.preceiptype),
      puploadeddate: fmtSlash(row.puploadeddate),
      pkgmsreceiptdate: fmtSlash(row.pkgmsreceiptdate),
      subscriberbankaccountno: str(row.subscriberbankaccountno),
      pCreatedby: this._commonService.getCreatedBy()?.toString() ?? '1'
    };
  }




  Clear() {
    this.isCleared.set(false);
    this.isClear = false;
    this.saveshowhide = true;
    this._searchText = '';
    const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
    if (searchInput) searchInput.value = '';

    this.count = 0;
    this.DataForSaving = [];
    this.SelectBankData = '';
    this.preferdrows = false;
    this.ChequesOnHandValidation.set({});
    this.bankid = 0;
    this.bankname.set(null);
    this.bankdetails = null;
    this.banknameshowhide.set(false);
    this.modeofreceipt = 'ALL';
    this.fromdate = '';
    this.todate = '';
    this.disablesavebutton.set(false);
    this.buttonname.set('Save');
    this.checked = false;

    const bankControl = this.ChequesOnHandForm.get('bankname');
    bankControl?.clearValidators();
    bankControl?.reset(null);
    bankControl?.updateValueAndValidity({ emitEvent: false });

    const fromDate = this.today2;
    const toDate = this.today2;

    this.ChequesOnHandForm.patchValue({
      ptransactiondate: this.today2,
      bankname: null,
      pfrombrsdate: fromDate,
      ptobrsdate: toDate,
      pchequesOnHandlist: null,
      SearchClear: '',
      schemaname: this._commonService.getschemaname()
    }, { emitEvent: false });

    this.BrsDateForm.patchValue({ frombrsdate: fromDate, tobrsdate: toDate }, { emitEvent: false });
    this.ChequesOnHandForm.markAsPristine();
    this.ChequesOnHandForm.markAsUntouched();
    this.ChequesOnHandValidation.set({});
    this.gridData.update(rows =>
      rows.map(row => ({
        ...row,
        pdepositstatus: false,
        pcancelstatus: false,
        pchequestatus: 'N'
      }))
    );

    this.showicons.set(this.gridData().length > 0);
    this.pageSetUp();
    this.setPageModel();

  }


  ShowBrsDeposit() {
    this.gridData.set([]);
    this._searchText = '';
    this.deposited.set(0);
    const fromdate = this.ChequesOnHandForm.controls['pfrombrsdate'].value;
    const todate = this.ChequesOnHandForm.controls['ptobrsdate'].value;
    if (fromdate != null && todate != null) {
      this.OnBrsDateChanges(fromdate, todate);
      if (this.validate === false) {
        const from = this.datepipe.transform(fromdate, 'dd-MM-yyyy')!;
        const to = this.datepipe.transform(todate, 'dd-MM-yyyy')!;
        this.fromdate = from;
        this.todate = to;
        this.validatebrsdatedeposit.set(false);
        this.pageSetUp();
        this.GetDataOnBrsDates(from, to, this.bankid);
      } else {
        this.validatebrsdatedeposit.set(true);
      }
    } else {
      this._commonService.showWarningMessage('select fromdate and todate');
    }
  }

  ShowBrsCancel() {
    this._searchText = '';
    this.gridData.set([]);
    this.cancelled.set(0);
    const fromdate = this.BrsDateForm.controls['frombrsdate'].value;
    const todate = this.BrsDateForm.controls['tobrsdate'].value;
    if (fromdate != null && todate != null) {
      this.OnBrsDateChanges(fromdate, todate);
      if (this.validate === false) {
        const from = this.datepipe.transform(fromdate, 'dd-MM-yyyy')!;
        const to = this.datepipe.transform(todate, 'dd-MM-yyyy')!;
        this.fromdate = from;
        this.todate = to;
        this.validatebrsdatecancel.set(false);
        this.validatebrsdatedeposit.set(false);
        this.pageSetUp();
        this.GetDataOnBrsDates(from, to, this.bankid);
      } else {
        this.validatebrsdatecancel.set(true);
      }
    } else {
      this._commonService.showWarningMessage('select fromdate and todate');
    }
  }

  GetDataOnBrsDates(frombrsdate: any, tobrsdate: any, bankid: any) {
    this.showicons.set(false);
    this.ChequesClearReturnDataBasedOnBrs = [];
    const searchtext = this._searchText || '0';
    let modeofreceipt = 'ALL';
    const s = this.status();
    if (s === 'deposited') modeofreceipt = 'DEPOSITED';
    else if (s === 'cancelled') modeofreceipt = 'CANCELLED';

    forkJoin([
      this._accountingtransaction.DataFromBrsDatesChequesOnHand(frombrsdate, tobrsdate, bankid, modeofreceipt, searchtext, 0, 99999)
    ]).subscribe({
      next: ([clearreturndata]: [any]) => {
        let allData: any[] = clearreturndata['pchequesclearreturnlist'] ?? [];
        if (s === 'cancelled') allData = allData.filter((x: any) => x.pchequestatus === 'C');
        else if (s === 'deposited') {
          allData = allData.filter((x: any) => x.pchequestatus === 'P');
          if (this.bankid !== 0) allData = allData.filter((x: any) => x.pdepositbankid === this.bankid);
        }
        allData.forEach((item: any) => { item.pbranchname = this.extractBranchName(item); });
        this.ChequesClearReturnDataBasedOnBrs = allData;
        this.gridData.set(allData);
        this.gridDatatemp.set(allData);
        this.showicons.set(this.gridData().length > 0);

        if (s === 'cancelled') this.cancelled.set(this.gridData().length);
        else if (s === 'deposited') this.deposited.set(this.gridData().length);

        this.totalElements = this.gridData().length;
        this.page.update(p => ({
          ...p,
          totalElements: this.gridData().length,
          totalPages: this.gridData().length > 10 ? Math.ceil(this.gridData().length / 10) : p.totalPages
        }));
        this.amounttotal.set(
          parseFloat(this.gridData().reduce((sum: number, c: any) => sum + (c.ptotalreceivedamount || 0), 0).toFixed(2))
        );
        this.applySortToGrid();
      },
      error: (error: any) => this._commonService.showErrorMessage(error)
    });
  }

  GetDataOnBrsDates1(frombrsdate: any, tobrsdate: any, bankid: any) {
    if (!frombrsdate || !tobrsdate || !bankid || bankid === 0) {
      this._commonService.showWarningMessage('Please select From Date, To Date and Bank.');
      return;
    }
    this.showicons.set(false);
    const s = this.status();
    let modeofreceipt = 'ALL';
    if (s === 'deposited') modeofreceipt = 'DEPOSITED';
    else if (s === 'cancelled') modeofreceipt = 'CANCELLED';

    this._accountingtransaction
      .DataFromBrsDatesChequesOnHand(frombrsdate, tobrsdate, bankid, modeofreceipt, this._searchText || '0', this.startindex, this.endindex)
      .subscribe({
        next: (clearreturndata: any) => {
          let allData: any[] = clearreturndata['pchequesclearreturnlist'] ?? [];
          if (s === 'cancelled') allData = allData.filter((x: any) => x.pchequestatus === 'C');
          else if (s === 'deposited') {
            allData = allData.filter((x: any) => x.pchequestatus === 'P');
            if (this.bankid !== 0) allData = allData.filter((x: any) => x.pdepositbankid === this.bankid);
          }
          allData.forEach((item: any) => { item.pbranchname = this.extractBranchName(item); });
          this.ChequesClearReturnDataBasedOnBrs = allData;
          this.gridData.set(allData);
          this.gridDatatemp.set(allData);
          this.showicons.set(this.gridData().length > 0);
          if (s === 'cancelled') this.cancelled.set(this.gridData().length);
          else if (s === 'deposited') this.deposited.set(this.gridData().length);
          this.totalElements = this.gridData().length;
          this.page.update(p => ({
            ...p,
            totalElements: this.gridData().length,
            totalPages: this.gridData().length > 10 ? Math.ceil(this.gridData().length / 10) : p.totalPages
          }));
          this.amounttotal.set(
            parseFloat(this.gridData().reduce((sum: number, c: any) => sum + (c.ptotalreceivedamount || 0), 0).toFixed(2))
          );
          this.applySortToGrid();
        },
        error: (error: any) => this._commonService.showErrorMessage(error)
      });
  }

  OnBrsDateChanges(fromdate: any, todate: any) {
    this.validate = fromdate > todate;
  }

  checkValidations(group: FormGroup, isValid: boolean): boolean {
    try {
      Object.keys(group.controls).forEach((key: string) => {
        isValid = this.GetValidationByControl(group, key, isValid);
      });
    } catch (e) {
      console.error('checkValidations error:', e);
      return false;
    }
    return isValid;
  }

  GetValidationByControl(formGroup: FormGroup, key: string, isValid: boolean): boolean {
    try {
      if (this.isClear) return true;
      const formcontrol = formGroup.get(key);
      if (formcontrol) {
        if (formcontrol instanceof FormGroup) {
          this.checkValidations(formcontrol, isValid);
        } else if (formcontrol.validator) {
          this.ChequesOnHandValidation.update(v => ({ ...v, [key]: '' }));
          if (formcontrol.errors || formcontrol.invalid || formcontrol.touched || formcontrol.dirty) {
            const element = document.getElementById(key) as HTMLInputElement;
            const lablename = element ? element.title : key;
            for (const errorkey in formcontrol.errors) {
              if (errorkey) {
                const errormessage = this._commonService.getValidationMessage(formcontrol, errorkey, lablename, key, '');
                this.ChequesOnHandValidation.update(v => ({ ...v, [key]: (v[key] || '') + errormessage + ' ' }));
                isValid = false;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('GetValidationByControl error for key:', key, e);
      return false;
    }
    return isValid;
  }

  showErrorMessage(errormsg: string) {
    this._commonService.showErrorMessage(errormsg);
  }

  BlurEventAllControll(fromgroup: FormGroup): void {
    try {
      Object.keys(fromgroup.controls).forEach((key: string) => {
        this.setBlurEvent(fromgroup, key);
      });
    } catch (e) {
      this.showErrorMessage('e');
    }
  }

  setBlurEvent(fromgroup: FormGroup, key: string): void {
    try {
      const formcontrol = fromgroup.get(key);
      if (formcontrol) {
        if (formcontrol instanceof FormGroup) {
          this.BlurEventAllControll(formcontrol);
        } else if (formcontrol.validator) {
          formcontrol.valueChanges.subscribe(() => {
            this.GetValidationByControl(fromgroup, key, true);
          });
        }
      }
    } catch (e) {
      this.showErrorMessage('e');
    }
  }

  sortGridBasedOnBankSelection(bankid: any) {
    let depositedCount = 0;
    if (this.bankid === 0) {
      this.ChequesClearReturnData.forEach(i => { if (i.pchequestatus === 'P') depositedCount++; });
    } else {
      this.ChequesClearReturnData.forEach(i => {
        if (i.pchequestatus === 'P' && i.pdepositbankid === bankid) depositedCount++;
      });
    }
    this.deposited.set(depositedCount);
    if (this.status() === 'deposited') this.Deposited();
  }

  export(): void {
    if (!this.gridData()?.length) { alert('No data available'); return; }

    const currentStatus = this.status();
    const isDeposited = currentStatus === 'deposited';
    const isCancelled = currentStatus === 'cancelled';
    const totalCount = this.totalElements || 99999;

    if (isCancelled || isDeposited) {
      const mode = isCancelled ? 'CANCELLED' : 'DEPOSITED';
      const statusFilter = isCancelled ? 'C' : 'P';
      const fetchFn = (this.fromdate && this.todate)
        ? this._accountingtransaction.DataFromBrsDatesChequesOnHand(this.fromdate, this.todate, this.bankid, mode, this._searchText || '0', 0, 99999)
        : this._accountingtransaction.GetChequesOnHandData(this.bankid, this._commonService.getschemaname(), this._commonService.getbranchname(), 0, 99999, '', 'ALL', 'PDF', this._commonService.getCompanyCode(), this._commonService.getBranchCode());

      fetchFn.subscribe({
        next: (result: any) => {
          let data: any[] = (result?.pchequesclearreturnlist || []).filter((x: any) => x.pchequestatus === statusFilter);
          if (isDeposited && this.bankid && this.bankid !== 0) data = data.filter((x: any) => x.pdepositbankid === this.bankid);
          this._buildExcelRows(data.length ? data : [...this.gridData()], currentStatus);
        },
        error: () => this._buildExcelRows([...this.gridData()], currentStatus)
      });
      return;
    }

    let apiMode = 'ALL';
    if (currentStatus === 'chequesreceived') apiMode = 'CHEQUE';
    else if (currentStatus === 'onlinereceipts') apiMode = 'ONLINE';

    this._accountingtransaction
      .GetChequesOnHandData(this.bankid, this._commonService.getschemaname(), this._commonService.getbranchname(), 0, totalCount, '', apiMode, 'PDF', this._commonService.getCompanyCode(), this._commonService.getBranchCode())
      .subscribe({
        next: (result: any) => {
          let data: any[] = result?.pchequesOnHandlist || [];
          if (currentStatus === 'chequesreceived') data = data.filter((x: any) => x.ptypeofpayment === 'CHEQUE');
          else if (currentStatus === 'onlinereceipts') data = data.filter((x: any) => x.ptypeofpayment !== 'CHEQUE');
          this._buildExcelRows(data.length ? data : [...this.gridData()], currentStatus);
        },
        error: () => this._buildExcelRows([...this.gridData()], currentStatus)
      });
  }


  private _buildExcelRows(gridData: any[], currentStatus: string): void {
    if (!gridData?.length) { alert('No data available'); return; }

    const isDeposited = currentStatus === 'deposited';
    const isCancelled = currentStatus === 'cancelled';

    const rows = gridData.map((element: any) => {
      const datereceipt = this._commonService.getFormatDateGlobal(element.preceiptdate);
      const depositeddate = element.pdepositeddate ? this._commonService.getFormatDateGlobal(element.pdepositeddate) : '';
      const chequedate = element.pchequedate ? this._commonService.getFormatDateGlobal(element.pchequedate) : '';
      const totalreceivedamt = element.ptotalreceivedamount != null && element.ptotalreceivedamount !== 0 ? element.ptotalreceivedamount : '';
      const branchName = this.extractBranchName(element);
      const selfCheque = element.selfchequestatus === true ? 'Yes' : element.selfchequestatus === false ? 'No' : '';


      const receiptNumber =
        element.receiptnumbers
        || element.preceiptnumbers
        || element.preceiptnumber
        || element.receipt_number
        || element.receiptno
        || element.preceiptid
        || '';

      if (isDeposited) {
        return {
          'Cheque/ Reference No.': element.pChequenumber || '',
          'Branch Name': branchName,
          'Amount': totalreceivedamt,
          'Receipt No': receiptNumber,
          'Receipt Date': datereceipt,
          'Cheque Date': chequedate,
          'Deposited Date': depositeddate,
          'Transaction Mode': element.ptypeofpayment || '',
          'Cheque Bank Name': element.cheque_bank || '',
          'Party': element.ppartyname || ''
        };
      } else if (isCancelled) {
        return {
          'Cheque/ Reference No.': element.pChequenumber || '',
          'Branch Name': branchName,
          'Amount': totalreceivedamt,
          'Receipt No': receiptNumber,
          'Receipt Date': datereceipt,
          'Cheque Date': chequedate,
          'Cancelled Date': depositeddate,
          'Transaction Mode': element.ptypeofpayment || '',
          'Cheque Bank Name': element.cheque_bank || '',
          'Party': element.ppartyname || ''
        };
      } else {
        return {
          'Cheque/ Reference No.': element.pChequenumber || '',
          'Branch Name': branchName,
          'Amount': totalreceivedamt,
          'Receipt No': receiptNumber,
          'Receipt Date': datereceipt,
          'Cheque Date': chequedate,
          'Transaction Mode': element.ptypeofpayment || '',
          'Cheque Bank Name': element.cheque_bank || '',
          'Party': element.ppartyname || '',
          'Self Cheque': selfCheque,
          'Chit Status': element.chitstatus || '',
          'Deposited Bank': element.pdepositedBankName || ''
        };
      }
    });

    this._commonService.exportAsExcelFile(rows, 'Cheques On Hand');
  }

  preferedselection(eve: any) {
    const isChecked = eve?.checked ?? false;
    const maxvalue = (this.pageCriteria.CurrentPage) * 10;
    const minvalue = maxvalue - 10;
    for (let i = minvalue; i <= maxvalue - 1; i++) {
      const rows = this.gridData();
      if (rows[i]) {
        if (isChecked) {
          this.preferdrows = true;
          if (rows[i].clearstatus === 'YES') {
            this.checkedDeposit({ checked: true }, rows[i]);
          }
        } else {
          this.checkedDeposit({ checked: false }, rows[i]);
          this.preferdrows = false;
        }
      }
    }
  }



  // selectTab(tab: string) {
  //   this.isCleared.set(false);
  //   this.selectedTab.set(tab);
  //   if (this.dt) this.dt.first = 0;

  //   if (tab === 'all') this.All();
  //   else if (tab === 'cheques') this.ChequesReceived();
  //   else if (tab === 'online') this.OnlineReceipts();
  //   else if (tab === 'deposited') this.Deposited();
  //   else if (tab === 'cancelled') this.Cancelled();
  // }


  selectTab(tab: string) {
    this.isCleared.set(false);
    this.selectedTab.set(tab);

    this.startindex = 0;
    this.endindex = this._commonService.pageSize;
    this.pageCriteria.offset = 0;
    if (this.dt) {
      this.dt.first = 0;  // force PrimeNG internal state to page 1
    }

    if (tab === 'all') this.All();
    else if (tab === 'cheques') this.ChequesReceived();
    else if (tab === 'online') this.OnlineReceipts();
    else if (tab === 'deposited') this.Deposited();
    else if (tab === 'cancelled') this.Cancelled();
  }



  onDepositChange(event: any, row: any) {
    if (event.checked) {
      this.checked = event.checked;
      row.pcancelstatus = false;
    }
    this.checkedDeposit(event, row);
  }

  onCancelChange(event: any, row: any) {
    if (event.checked) {
      this.checked = event.checked;
      row.pdepositstatus = false;
    }
    this.checkedCancel(event, row);
  }

  private extractBranchName(element: any): string {
    if (typeof element.pbranchname === 'string') return element.pbranchname;
    return element.pbranchname?.name || element.pbranchname?.pBranchname || element.branch_name || '';
  }
}

