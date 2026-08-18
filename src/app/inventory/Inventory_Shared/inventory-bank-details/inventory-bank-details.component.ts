import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { InventoryTransactionsService } from '../inventory-transactions.service';

// Shared "Bank Details" fieldset -- Payee Name / Account No. / IFSC Code /
// Bank / Branch, with Bank and Branch auto-filled from a live external IFSC
// lookup once 11 characters are typed. Lives on Vendor Master and Customer
// Master (party-level, always visible, no toggle -- unlike Transport
// Details, which is per-transaction and does have one). Same thin-wrapper
// convention as app-inventory-delivery-address: bound via [host]="this",
// reading/writing the host screen's own formValues()/collectFormField()
// rather than a private FormGroup, so it stays consistent with how the
// rest of this Inventory module's shared fieldsets work. The IFSC lookup
// itself is the one piece of real logic this component owns (rather than
// delegating to the host), since it's a self-contained UI concern.
@Component({
  selector: 'app-inventory-bank-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-bank-details.component.html'
})
export class InventoryBankDetailsComponent {
  @Input({ required: true }) host!: any;
  // '' on Vendor/Customer Master (unprefixed keys, unchanged from before);
  // 'quickVendor'/'quickCustomer' when embedded inside the quick-add modal,
  // so this shares the host transaction screen's own formValues() bag
  // without colliding with its top-level fields.
  @Input() keyPrefix = '';

  private readonly txService = inject(InventoryTransactionsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ifscLookupState = signal<'idle' | 'loading' | 'found' | 'not-found' | 'error'>('idle');

  pfx(field: string): string {
    return this.keyPrefix ? this.keyPrefix + field[0].toUpperCase() + field.slice(1) : field;
  }

  onIfscCodeChange(value: string): void {
    const normalized = (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    this.host.collectFormField(this.pfx('bankIfscCode'), normalized);
    if (normalized.length !== 11) {
      this.ifscLookupState.set('idle');
      return;
    }
    this.ifscLookupState.set('loading');
    this.txService.getIfscDetails(normalized)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (res.bankName || res.branchName) {
            this.host.collectFormField(this.pfx('bankName'), res.bankName || '');
            this.host.collectFormField(this.pfx('bankBranchName'), res.branchName || '');
            this.ifscLookupState.set('found');
          } else {
            this.ifscLookupState.set('not-found');
          }
        },
        error: () => this.ifscLookupState.set('error')
      });
  }
}
