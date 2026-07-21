import { Component, DestroyRef, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CategoryItem, InventoryConfigService } from '../inventory-config.service';
import { applyInventoryTextCase, toInventoryTitleCase } from '../inventory-text-case.util';

@Component({
  selector: 'app-quick-add-category',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './quick-add-category.component.html',
  styleUrl: './quick-add-category.component.scss'
})
export class QuickAddCategoryComponent {
  private svc = inject(InventoryConfigService);
  private destroyRef = inject(DestroyRef);

  @Input() set serialPolicies(v: string[]) { this.localSerialPolicies.update(list => this.mergePolicyNames(list, v)); }
  @Input() set batchPolicies(v: string[]) { this.localBatchPolicies.update(list => this.mergePolicyNames(list, v)); }
  @Input() set existingCategoryNames(v: string[]) { this.categoryNames.set(this.mergePolicyNames(v ?? [])); }
  @Input() set existingCategoryCodes(v: string[]) { this.categoryCodes.set(this.mergePolicyNames(v ?? [])); }
  @Input() segmentId: number | null = null;
  @Output() saved = new EventEmitter<CategoryItem>();
  @Output() cancelled = new EventEmitter<void>();

  catName = signal('');
  catCode = signal('');
  catDescription = signal('');
  catStatus = signal('Active');
  serialApplicable = signal(false);
  batchApplicable = signal(false);
  serialPolicyName = signal<string | null>(null);
  batchPolicyName = signal<string | null>(null);
  saving = signal(false);
  error = signal('');

  localSerialPolicies = signal<string[]>([]);
  localBatchPolicies = signal<string[]>([]);
  private categoryNames = signal<string[]>([]);
  private categoryCodes = signal<string[]>([]);

  readonly catNameSuggestions = computed(() => {
    const input = this.catName().trim().toLowerCase();
    if (!input) return [];
    return this.categoryNames()
      .filter(n => n.toLowerCase().includes(input))
      .slice(0, 8);
  });

  readonly catNameIsDuplicate = computed(() => {
    const input = this.catName().trim().toLowerCase();
    if (!input) return false;
    return this.categoryNames().some(n => n.toLowerCase() === input);
  });

  // Inline serial policy add
  showInlineSerialAdd = signal(false);
  inlineSerialName = signal('');
  inlineSerialCode = signal('');
  savingInlineSerial = signal(false);
  inlineSerialError = signal('');

  // Inline batch policy add
  showInlineBatchAdd = signal(false);
  inlineBatchName = signal('');
  inlineBatchCode = signal('');
  savingInlineBatch = signal(false);
  inlineBatchError = signal('');

  readonly inlineBatchNameIsDuplicate = computed(() => {
    const input = this.inlineBatchName().trim().toLowerCase();
    if (!input) return false;
    return this.localBatchPolicies().some(n => n.toLowerCase() === input);
  });

  readonly inlineSerialNameIsDuplicate = computed(() => {
    const input = this.inlineSerialName().trim().toLowerCase();
    if (!input) return false;
    return this.localSerialPolicies().some(n => n.toLowerCase() === input);
  });

  onCatNameChange(val: string): void {
    const name = toInventoryTitleCase(val ?? '');
    this.catName.set(name);
    this.catCode.set(this.autoCode(name));
  }

  onCatCodeChange(val: string): void {
    this.catCode.set(String(applyInventoryTextCase(val ?? '', 'upper')));
  }

  onCatDescriptionChange(val: string): void {
    this.catDescription.set(String(applyInventoryTextCase(val ?? '', 'sentence')));
  }

  private autoCode(name: string): string {
    const words = name.trim().replace(/[^A-Za-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 0);
    if (!words.length) return '';
    const namePrefix = words.length >= 2
      ? words.slice(0, 2).map(w => w.substring(0, 3).toUpperCase()).join('')
      : words[0].substring(0, 6).toUpperCase();
    const yy = new Date().getFullYear().toString().slice(-2);
    const seq = String(this.nextCategorySequence(yy)).padStart(5, '0');
    return `${namePrefix}-${yy}-${seq}`;
  }

  // Global standard code format: PREFIX (first 3 alnum chars of name) - YY - 5-digit sequence.
  // Matches generateCodeFromName() in inventory-screen-shell.ts, used for Serial/Batch policy inline add.
  private autoCodeFromName(name: string, existingCount: number): string {
    const prefix = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    if (!prefix) return '';
    const yy = new Date().getFullYear().toString().slice(-2);
    const seq = String(existingCount + 1).padStart(5, '0');
    return `${prefix}-${yy}-${seq}`;
  }

  private mergePolicyNames(...groups: string[][]): string[] {
    const seen = new Set<string>();
    return groups
      .flat()
      .map(name => String(name ?? '').trim())
      .filter(name => {
        const key = name.toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }

  private normalizeKey(value: any): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private nextCategorySequence(yy: string): number {
    const matchingSequences = this.categoryCodes()
      .map(code => String(code ?? '').match(new RegExp(`-${yy}-(\\d+)$`))?.[1])
      .map(seq => Number(seq || 0))
      .filter(seq => Number.isFinite(seq) && seq > 0);
    if (matchingSequences.length) {
      return Math.max(...matchingSequences) + 1;
    }
    return this.categoryCodes().length + 1;
  }

  setSerialApplicable(val: boolean): void {
    this.serialApplicable.set(val);
    if (!val) { this.serialPolicyName.set(null); this.closeInlineSerialAdd(); }
  }

  setBatchApplicable(val: boolean): void {
    this.batchApplicable.set(val);
    if (!val) { this.batchPolicyName.set(null); this.closeInlineBatchAdd(); }
  }

  toggleInlineSerialAdd(): void {
    if (this.showInlineSerialAdd()) {
      this.closeInlineSerialAdd();
    } else {
      this.inlineSerialName.set('');
      this.inlineSerialCode.set('');
      this.inlineSerialError.set('');
      this.showInlineSerialAdd.set(true);
    }
  }

  closeInlineSerialAdd(): void {
    this.showInlineSerialAdd.set(false);
    this.inlineSerialName.set('');
    this.inlineSerialCode.set('');
    this.inlineSerialError.set('');
  }

  onInlineSerialNameChange(val: string): void {
    const name = toInventoryTitleCase(val ?? '');
    this.inlineSerialName.set(name);
    this.inlineSerialCode.set(name.trim() ? this.autoCodeFromName(name, this.localSerialPolicies().length) : '');
  }

  onInlineSerialCodeChange(val: string): void {
    this.inlineSerialCode.set(String(applyInventoryTextCase(val ?? '', 'upper')));
  }

  saveInlineSerialPolicy(): void {
    const name = this.inlineSerialName().trim();
    if (!name) { this.inlineSerialError.set('Policy name is required.'); return; }
    if (this.savingInlineSerial()) return;
    this.savingInlineSerial.set(true);
    this.inlineSerialError.set('');
    const code = this.inlineSerialCode().trim() || 'SNP-' + name.replace(/[^A-Z0-9]/gi, '').substring(0, 8).toUpperCase();
    this.svc.saveSerialPolicy({ segment_id: this.segmentId ?? null, policy_name: name, policy_code: code, status: 'active' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.savingInlineSerial.set(false);
          if (res.success) {
            const policyName = res.data?.policy_name || name;
            this.localSerialPolicies.update(list => this.mergePolicyNames(list, [policyName]));
            this.serialPolicyName.set(policyName);
            this.closeInlineSerialAdd();
          } else {
            this.inlineSerialError.set(res.message || 'Failed to save serial policy.');
          }
        },
        error: (err: any) => {
          this.savingInlineSerial.set(false);
          this.inlineSerialError.set(err?.error?.message ?? err?.error?.title ?? 'Failed to save serial policy.');
        }
      });
  }

  toggleInlineBatchAdd(): void {
    if (this.showInlineBatchAdd()) {
      this.closeInlineBatchAdd();
    } else {
      this.inlineBatchName.set('');
      this.inlineBatchCode.set('');
      this.inlineBatchError.set('');
      this.showInlineBatchAdd.set(true);
    }
  }

  closeInlineBatchAdd(): void {
    this.showInlineBatchAdd.set(false);
    this.inlineBatchName.set('');
    this.inlineBatchCode.set('');
    this.inlineBatchError.set('');
  }

  onInlineBatchNameChange(val: string): void {
    const name = toInventoryTitleCase(val ?? '');
    this.inlineBatchName.set(name);
    this.inlineBatchCode.set(name.trim() ? this.autoCodeFromName(name, this.localBatchPolicies().length) : '');
  }

  onInlineBatchCodeChange(val: string): void {
    this.inlineBatchCode.set(String(applyInventoryTextCase(val ?? '', 'upper')));
  }

  saveInlineBatchPolicy(): void {
    const name = this.inlineBatchName().trim();
    if (!name) { this.inlineBatchError.set('Policy name is required.'); return; }
    if (this.savingInlineBatch()) return;
    this.savingInlineBatch.set(true);
    this.inlineBatchError.set('');
    const code = this.inlineBatchCode().trim() || 'BLP-' + name.replace(/[^A-Z0-9]/gi, '').substring(0, 8).toUpperCase();
    this.svc.saveBatchPolicy({ segment_id: this.segmentId ?? null, policy_name: name, policy_code: code, status: 'active' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.savingInlineBatch.set(false);
          if (res.success) {
            const policyName = res.data?.policy_name || name;
            this.localBatchPolicies.update(list => this.mergePolicyNames(list, [policyName]));
            this.batchPolicyName.set(policyName);
            this.closeInlineBatchAdd();
          } else {
            this.inlineBatchError.set(res.message || 'Failed to save batch policy.');
          }
        },
        error: (err: any) => {
          this.savingInlineBatch.set(false);
          this.inlineBatchError.set(err?.error?.message ?? err?.error?.title ?? 'Failed to save batch policy.');
        }
      });
  }

  save(): void {
    const name = this.catName().trim();
    if (!name) { this.error.set('Category name is required.'); return; }
    if (this.categoryNames().some(existing => this.normalizeKey(existing) === this.normalizeKey(name))) {
      this.error.set('Category already exists. Select it from the list instead of adding duplicate.');
      return;
    }
    const serialPolicy = this.serialApplicable() ? (this.serialPolicyName()?.trim() || null) : null;
    const batchPolicy = this.batchApplicable() ? (this.batchPolicyName()?.trim() || null) : null;
    if (this.serialApplicable() && !serialPolicy) {
      this.error.set('Select or add a Serial Number Policy.');
      return;
    }
    if (this.batchApplicable() && !batchPolicy) {
      this.error.set('Select or add a Batch / Lot Policy.');
      return;
    }
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const code = this.catCode().trim() || this.autoCode(name);
    if (this.categoryCodes().some(existing => this.normalizeKey(existing) === this.normalizeKey(code))) {
      this.saving.set(false);
      this.error.set('Category code already exists. Change the code or select the existing category.');
      return;
    }
    this.svc.saveCategory({
      category_code: code,
      category_name: name,
      description: this.catDescription().trim(),
      serial_applicable: this.serialApplicable(),
      serial_policy_name: serialPolicy,
      batch_applicable: this.batchApplicable(),
      batch_policy_name: batchPolicy,
      status: this.catStatus().toLowerCase()
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.saving.set(false);
        if (res.success && res.data) {
          this.saved.emit(res.data);
        } else if (res.success) {
          this.saved.emit({
            id: 0, category_code: code, category_name: name,
            description: this.catDescription().trim(),
            serial_applicable: this.serialApplicable(),
            serial_policy_name: serialPolicy,
            batch_applicable: this.batchApplicable(),
            batch_policy_name: batchPolicy,
            status: this.catStatus().toLowerCase()
          });
        } else {
          this.error.set(res.message || 'Failed to save category.');
        }
      },
      error: (err: any) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? err?.error?.title ?? 'Failed to save category.');
      }
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
