import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { CommonService } from '../../../../core/services/Common/common.service';
import { AccountsTransactions } from '../../../../core/services/accounts/accounts-transactions';
import { DatePickerModule } from 'primeng/datepicker';



export interface Receipt {
  receipt_date: string;
  receipt_number: string;
  modeof_receipt: string;
  ptypeofpayment: string;
  pChequenumber: string;
  totalreceivedamount: number;
  narration: string;
}


@Component({
  selector: 'app-general-receipt',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, TableModule, TooltipModule, DatePickerModule, FormsModule],
  templateUrl: './general-receipt.html',
  providers: [CurrencyPipe, DecimalPipe],
})

export class GeneralReceipt implements OnInit {

  private cs = inject(CommonService);
  private service = inject(AccountsTransactions);
  private router = inject(Router);
  private readonly currencyPipe = inject(CurrencyPipe);


  // ── State ────────────────────────────────────────────────────────────────
  allData = signal<Receipt[]>([]);
  searchText = signal<string>('');
  loading = signal<boolean>(false);
  pageSize = signal<number>(10);
  fromDate = signal<Date | null>(null);
  toDate = signal<Date | null>(null);
  readonly currencyCode = 'INR';


  readonly currencySymbol = this.cs.currencysymbol || '₹';

  readonly rowsPerPageOptions = [5, 10, 20, 50];

  // ── Derived ──────────────────────────────────────────────────────────────
  filteredData = computed(() => {
    const text = this.searchText().toLowerCase().trim();
    if (!text) return this.allData();
    return this.allData().filter(d =>
      d.receipt_date.toLowerCase().includes(text) ||
      d.receipt_number.toLowerCase().includes(text) ||
      d.modeof_receipt.toLowerCase().includes(text) ||
      d.narration.toLowerCase().includes(text) ||
      d.ptypeofpayment.toLowerCase().includes(text)
    );
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {

    this.loadData();
  }


  formatCurrency(amount: number): string {
    return this.currencyPipe.transform(amount, 'INR', 'symbol', '1.2-2') ?? '₹0.00';
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  loadData(): void {
    this.loading.set(true);
    this.service.GetGeneralReceiptsData(
      this.cs.getschemaname(),
      this.cs.getbranchname(),
      'taxes',
      this.cs.getCompanyCode(),
      this.cs.getBranchCode()
    ).subscribe({
      next: (data: any[]) => {
        this.loading.set(false);
        if (!data?.length) { this.allData.set([]); return; }

        const mapped: Receipt[] = data.map(item => ({
          receipt_date: this.cs.getFormatDateGlobal(
            item.preceiptdate ?? item.preceipt_date ?? item.receipt_date
          ) || '--',
          receipt_number:
            item.preceiptnumber ?? item.preceipt_number ?? item.receipt_number ?? '--',
          modeof_receipt:
            item.pmodofreceipt ?? item.modeof_receipt ?? item.mode ?? '--',
          ptypeofpayment:
            item.ptypeofpayment ?? item.typeofpayment ?? '',
          pChequenumber:
            item.pChequenumber ?? item.pchequenumber ?? item.chequenumber ?? '',
          totalreceivedamount:
            item.ptotalreceivedamount ?? item.totalreceivedamount ?? 0,
          narration:
            item.pnarration ?? item.narration ?? ''
        }));

        this.allData.set(mapped);
      },
      error: (err) => {
        this.loading.set(false);
        this.allData.set([]);
        this.cs.showErrorMessage(err);
      }
    });
  }

  // ── UI Handlers ──────────────────────────────────────────────────────────
  onSearch(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  onPageChange(event: { rows: number }): void {
    this.pageSize.set(event.rows);
  }

  viewRow(row: Receipt): void {
    if (!row?.receipt_number) return;
    const receipt = btoa(`${row.receipt_number},General Receipt`);
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/general-receipt', receipt])
    );
    window.open(url, '_blank');
  }



  // ── Display Helpers ──────────────────────────────────────────────────────
  getPaymentLabel(row: Receipt): string {
    const mode = (row.modeof_receipt || '').toUpperCase().trim();

    if (mode === 'C' || mode === 'CASH') return 'CASH';

    if (mode === 'B' || mode === 'BANK') {
      const type = (row.ptypeofpayment || '').toUpperCase().trim();
      const codeMap: Record<string, string> = {
        'CHEQUE': 'CH', 'CH': 'CH',
        'ONLINE': 'O', 'O': 'O',
        'DEBIT CARD': 'DC', 'DEBITCARD': 'DC', 'DC': 'DC',
        'CREDIT CARD': 'CC', 'CREDITCARD': 'CC', 'CC': 'CC',
      };
      const code = codeMap[type] ?? type;
      let result = code ? `BANK(${code})` : 'BANK';
      if (row.pChequenumber) result += ` - ${row.pChequenumber}`;
      return result;
    }

    return row.modeof_receipt || '--';
  }

  getPaymentChipClass(row: Receipt): string {
    const mode = (row.modeof_receipt || '').toUpperCase();
    if (mode === 'C' || mode === 'CASH') return 'chip chip--cash';
    if (mode === 'B' || mode === 'BANK') return 'chip chip--bank';
    return 'chip chip--default';
  }

  getPaymentIcon(row: Receipt): string {
    const mode = (row.modeof_receipt || '').toUpperCase();
    if (mode === 'C' || mode === 'CASH') return 'pi pi-wallet';
    if (mode === 'B' || mode === 'BANK') return 'pi pi-credit-card';
    return 'pi pi-circle';
  }
}