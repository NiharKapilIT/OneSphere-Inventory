import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { HsnSacItem, InventoryConfigService, TaxCodeSuggestion } from '../inventory-config.service';
import { applyInventoryTextCase } from '../inventory-text-case.util';

// Single reusable HSN/SAC code field: live-searches the uploaded tax-code
// master (taxation.hsn_sac via /api/tax-codes/search) as the user types,
// always keeps whatever text is typed as the value (free-text entry is never
// blocked by the suggestion list), and offers a "save as new code" inline
// mini-form when nothing in the master matches — so every screen that embeds
// this component gets identical suggest-or-add-manually behavior.
@Component({
  selector: 'app-hsn-sac-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hsn-sac-picker.component.html',
  styleUrl: './hsn-sac-picker.component.scss'
})
export class HsnSacPickerComponent implements OnInit {
  private readonly svc = inject(InventoryConfigService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() code: string | null = '';
  @Output() codeChange = new EventEmitter<string>();

  @Input() description: string | null = '';
  @Output() descriptionChange = new EventEmitter<string>();

  @Input() gstRate: number | null = null;
  @Output() gstRateChange = new EventEmitter<number | null>();

  @Input() placeholder = 'Search or type HSN / SAC code';
  @Input() allowQuickAdd = true;
  @Input() typeFilter: 'HSN' | 'SAC' | '' = '';

  @Output() selected = new EventEmitter<TaxCodeSuggestion | HsnSacItem>();

  readonly suggestions = signal<TaxCodeSuggestion[]>([]);
  readonly suggesting = signal(false);
  readonly searchMessage = signal('');

  readonly showQuickAdd = signal(false);
  readonly quickAddType = signal<'HSN' | 'SAC'>('HSN');
  readonly quickAddDescription = signal('');
  readonly quickAddGstRate = signal<number | null>(null);
  readonly quickAddSaving = signal(false);
  readonly quickAddError = signal('');

  readonly hasExactMatch = computed(() => {
    const typed = (this.code || '').trim().toUpperCase();
    if (!typed) return true;
    return this.suggestions().some(s => s.code.toUpperCase() === typed);
  });

  readonly canOfferQuickAdd = computed(() =>
    this.allowQuickAdd
    && (this.code || '').trim().length >= 2
    && !this.suggesting()
    && !this.hasExactMatch()
  );

  private readonly search$ = new Subject<string>();

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          if (query.trim().length < 2) {
            this.suggesting.set(false);
            return of<TaxCodeSuggestion[]>([]);
          }
          this.suggesting.set(true);
          return this.svc.searchTaxCodes(query.trim(), this.typeFilter || '', 10).pipe(
            switchMap(res => of(res.data ?? [])),
            catchError(() => of<TaxCodeSuggestion[]>([]))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(results => {
        this.suggesting.set(false);
        this.suggestions.set(results);
        this.searchMessage.set(results.length ? '' : 'No matching code in the tax master.');
      });
  }

  onCodeInput(value: string): void {
    const upper = String(applyInventoryTextCase(value ?? '', 'upper')).trim();
    this.code = upper;
    this.codeChange.emit(upper);
    this.showQuickAdd.set(false);
    this.quickAddError.set('');
    if (upper.length >= 2) {
      this.search$.next(upper);
    } else {
      this.suggestions.set([]);
      this.searchMessage.set('');
    }
  }

  selectSuggestion(item: TaxCodeSuggestion): void {
    this.code = item.code;
    this.codeChange.emit(item.code);
    this.description = item.description || '';
    this.descriptionChange.emit(this.description);
    this.gstRate = item.gst_rate ?? null;
    this.gstRateChange.emit(this.gstRate);
    this.selected.emit(item);
    this.suggestions.set([]);
    this.searchMessage.set('');
    this.showQuickAdd.set(false);
  }

  openQuickAdd(): void {
    this.quickAddDescription.set(this.description || '');
    this.quickAddGstRate.set(this.gstRate);
    this.quickAddType.set((this.code || '').trim().length >= 6 ? 'SAC' : 'HSN');
    this.quickAddError.set('');
    this.showQuickAdd.set(true);
  }

  cancelQuickAdd(): void {
    this.showQuickAdd.set(false);
    this.quickAddError.set('');
  }

  submitQuickAdd(): void {
    const code = (this.code || '').trim().toUpperCase();
    const description = this.quickAddDescription().trim();
    if (!code) { this.quickAddError.set('Code is required.'); return; }
    if (!description) { this.quickAddError.set('Description is required.'); return; }
    if (this.quickAddSaving()) return;

    this.quickAddSaving.set(true);
    this.quickAddError.set('');
    this.svc.quickAddHsnSac(code, this.quickAddType(), description, this.quickAddGstRate() ?? 0)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.quickAddSaving.set(false);
          if (!res.success || !res.data) {
            this.quickAddError.set(res.message || 'Failed to save the new code.');
            return;
          }
          const saved = res.data;
          this.code = saved.code;
          this.codeChange.emit(saved.code);
          this.description = saved.description || description;
          this.descriptionChange.emit(this.description);
          this.gstRate = saved.gst_rate ?? this.quickAddGstRate();
          this.gstRateChange.emit(this.gstRate);
          this.selected.emit(saved);
          this.showQuickAdd.set(false);
          this.suggestions.set([]);
          this.searchMessage.set('');
        },
        error: err => {
          this.quickAddSaving.set(false);
          this.quickAddError.set(err?.error?.message || 'Failed to save the new code.');
        }
      });
  }

  taxRateLabel(rate: number | null | undefined): string {
    return rate === null || rate === undefined ? 'GST not mapped' : `${rate}% GST`;
  }
}
