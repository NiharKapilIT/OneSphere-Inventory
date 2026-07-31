import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { forkJoin } from 'rxjs';
import {
  CategoryItem,
  HsnSacItem,
  InventoryConfigService,
  SegmentItem,
  UomItem
} from '../../Inventory_Shared/inventory-config.service';
import { applyInventoryTextCase, toInventoryTitleCase } from '../../Inventory_Shared/inventory-text-case.util';
import { InventoryCategoryMasterComponent } from '../../Inventory_Masters/category-master/category-master';
import { businessSegmentsConfig, categoryMasterConfig } from '../../Inventory_Shared/inventory-screen.model';
import { InventoryScreenShell } from '../../Inventory_Shared/inventory-screen-shell/inventory-screen-shell';

@Component({
  selector: 'app-inventory-business-segments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, InventoryCategoryMasterComponent, InventoryScreenShell],
  templateUrl: './business-segments.html'
})
export class InventoryBusinessSegmentsComponent implements OnInit {
  private svc = inject(InventoryConfigService);

  segmentName = signal('');
  segmentCode = signal('');
  usageNote = signal('');
  categoryIds = signal<number[]>([]);
  hsnSacIds = signal<number[]>([]);
  uomIds = signal<number[]>([]);
  editingId = signal<number | null>(null);

  categories = signal<CategoryItem[]>([]);
  hsnSacList = signal<HsnSacItem[]>([]);
  uomList = signal<UomItem[]>([]);
  savedSegments = signal<SegmentItem[]>([]);

  readonly existingMatches = computed(() => {
    const q = this.segmentName().trim().toLowerCase();
    if (q.length < 2) return [];
    return this.savedSegments().filter(s =>
      s.segment_name.toLowerCase().includes(q) && s.id !== this.editingId()
    );
  });

  loading = signal(true);
  saving = signal(false);
  saveMsg = signal('');
  saveError = signal('');

  showCategoryMasterDialog = signal(false);
  readonly businessSegmentsConfig = businessSegmentsConfig;
  readonly categoryMasterConfig = categoryMasterConfig;

  showHsnPopup = signal(false);
  newHsnCode = signal('');
  newHsnType = signal('HSN');
  newHsnDesc = signal('');
  newHsnGst = signal(0);
  addingHsn = signal(false);
  hsnPopupError = signal('');

  showUomPopup = signal(false);
  newUomName = signal('');
  newUomSymbol = signal('');
  addingUom = signal(false);
  uomPopupError = signal('');

  ngOnInit(): void {
    this.loadPageData();
  }

  loadPageData(): void {
    this.loading.set(true);
    forkJoin({
      categories: this.svc.getCategories(),
      hsn: this.svc.getHsnSac(),
      uoms: this.svc.getUoms(),
      segments: this.svc.getSegments(true)
    }).subscribe({
      next: ({ categories, hsn, uoms, segments }) => {
        this.categories.set(this.dedupeByName(categories.data ?? [], item => item.category_name));
        this.hsnSacList.set(this.dedupeByName(hsn.data ?? [], item => item.code));
        this.uomList.set(this.dedupeByName(uoms.data ?? [], item => item.uom_name || item.uom_code));
        this.savedSegments.set(segments.data ?? []);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.saveError.set(err?.error?.message ?? 'Unable to load inventory setup data.');
      }
    });
  }

  saveSegment(): void {
    const name = this.segmentName().trim();
    if (!name) {
      this.saveError.set('Business segment is required.');
      return;
    }
    if (this.savedSegments().some(seg => this.normalizeKey(seg.segment_name) === this.normalizeKey(name) && seg.id !== this.editingId())) {
      this.saveError.set('Business segment already exists. Edit the existing segment instead of adding duplicate.');
      return;
    }

    this.saving.set(true);
    this.saveMsg.set('');
    this.saveError.set('');

    const payload = {
      segment_name: name,
      segment_code: this.segmentCode().trim() || undefined,
      usage_note: this.usageNote().trim() || undefined,
      category_ids: this.categoryIds(),
      hsn_sac_ids: this.hsnSacIds(),
      uom_ids: this.uomIds(),
      status: 'active'
    };

    this.svc.saveSegment(payload, this.editingId()).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveMsg.set(this.editingId() ? 'Business segment updated.' : 'Business segment saved.');
        this.clearForm();
        this.refreshSegments();
        setTimeout(() => this.saveMsg.set(''), 4000);
      },
      error: err => {
        this.saving.set(false);
        this.saveError.set(err?.error?.title ?? err?.error?.message ?? 'Save failed.');
      }
    });
  }

  refreshSegments(): void {
    this.svc.getSegments(true).subscribe({
      next: res => this.savedSegments.set(res.data ?? []),
      error: () => undefined
    });
  }

  onSegmentNameChange(name: string): void {
    const normalizedName = toInventoryTitleCase(name ?? '');
    this.segmentName.set(normalizedName);
    if (!normalizedName.trim()) {
      if (this.editingId() !== null) {
        // Editing a saved segment — name cleared means user wants a fresh form.
        this.clearForm();
      } else {
        // Fresh entry — only clear the auto-generated code.
        this.segmentCode.set('');
      }
      return;
    }
    if (this.editingId() !== null) return;
    this.segmentCode.set(this.autoCode(normalizedName));
  }

  onSegmentCodeChange(code: string): void {
    this.segmentCode.set(String(applyInventoryTextCase(code ?? '', 'upper')));
  }

  onUsageNoteChange(note: string): void {
    this.usageNote.set(String(applyInventoryTextCase(note ?? '', 'sentence')));
  }

  onNewHsnCodeChange(code: string): void {
    this.newHsnCode.set(String(applyInventoryTextCase(code ?? '', 'upper')));
  }

  onNewHsnDescChange(description: string): void {
    this.newHsnDesc.set(String(applyInventoryTextCase(description ?? '', 'sentence')));
  }

  onNewUomNameChange(name: string): void {
    this.newUomName.set(toInventoryTitleCase(name ?? ''));
  }

  onNewUomSymbolChange(symbol: string): void {
    this.newUomSymbol.set(String(applyInventoryTextCase(symbol ?? '', 'upper')));
  }

  // Global standard code format: PREFIX (first 3 alnum chars of name) - YY - 5-digit sequence.
  // Matches generateCodeFromName() in inventory-screen-shell.ts, used across the other master screens.
  private autoCode(name: string): string {
    const prefix = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    if (!prefix) return '';
    const yy = new Date().getFullYear().toString().slice(-2);
    const seq = String(this.savedSegments().length + 1).padStart(5, '0');
    return `${prefix}-${yy}-${seq}`;
  }

  private normalizeKey(value: any): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private dedupeByName<T>(items: T[], picker: (item: T) => string | undefined): T[] {
    const seen = new Set<string>();
    return [...items]
      .sort((a, b) => String(picker(a) || '').localeCompare(String(picker(b) || '')))
      .filter(item => {
        const key = this.normalizeKey(picker(item));
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  clearForm(): void {
    this.segmentName.set('');
    this.segmentCode.set('');
    this.usageNote.set('');
    this.categoryIds.set([]);
    this.hsnSacIds.set([]);
    this.uomIds.set([]);
    this.editingId.set(null);
    this.saveError.set('');
  }

  editSegment(seg: SegmentItem): void {
    this.editingId.set(seg.id);
    this.segmentName.set(seg.segment_name);
    this.segmentCode.set(seg.segment_code ?? '');
    this.usageNote.set(seg.usage_note ?? '');
    this.categoryIds.set((seg.categories ?? []).map(c => c.id));
    this.hsnSacIds.set((seg.hsn_sac_codes ?? []).map(h => h.id));
    this.uomIds.set((seg.uoms ?? []).map(u => u.id));
    this.saveError.set('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  categoryNames(seg: SegmentItem): string {
    return (seg.categories ?? []).map(c => c.category_name).filter(Boolean).join(', ') || '-';
  }

  hsnSacCodes(seg: SegmentItem): string {
    return (seg.hsn_sac_codes ?? []).map(h => h.code).filter(Boolean).join(', ') || '-';
  }

  uomNames(seg: SegmentItem): string {
    return (seg.uoms ?? []).map(u => u.uom_name).filter(Boolean).join(', ') || '-';
  }

  selectedCategoryCount(): number {
    return this.categoryIds().length;
  }

  selectedHsnCount(): number {
    return this.hsnSacIds().length;
  }

  selectedUomCount(): number {
    return this.uomIds().length;
  }

  openCategoryMasterDialog(): void {
    this.showCategoryMasterDialog.set(true);
  }

  closeCategoryMasterDialog(): void {
    this.showCategoryMasterDialog.set(false);
    this.refreshCategories();
  }

  private refreshCategories(): void {
    this.svc.getCategories().subscribe({
      next: res => this.categories.set(this.dedupeByName(res.data ?? [], item => item.category_name)),
      error: () => undefined
    });
  }

  openHsnPopup(): void {
    this.newHsnCode.set('');
    this.newHsnType.set('HSN');
    this.newHsnDesc.set('');
    this.newHsnGst.set(0);
    this.hsnPopupError.set('');
    this.showHsnPopup.set(true);
  }

  closeHsnPopup(): void {
    this.showHsnPopup.set(false);
  }

  submitHsn(): void {
    const code = this.newHsnCode().trim();
    if (!code) {
      this.hsnPopupError.set('HSN/SAC code is required.');
      return;
    }
    if (this.hsnSacList().some(item => this.normalizeKey(item.code) === this.normalizeKey(code))) {
      this.hsnPopupError.set('HSN/SAC code already exists. Select it from the list instead.');
      return;
    }

    this.addingHsn.set(true);
    this.hsnPopupError.set('');
    this.svc.quickAddHsnSac(code, this.newHsnType(), this.newHsnDesc().trim(), this.newHsnGst()).subscribe({
      next: res => {
        if (res.data) {
          this.hsnSacList.update(list => {
            const withoutDuplicate = list.filter(item => item.id !== res.data!.id);
            return [...withoutDuplicate, res.data!];
          });
          this.hsnSacIds.update(ids => [...new Set([...ids, res.data!.id])]);
        }
        this.addingHsn.set(false);
        this.showHsnPopup.set(false);
      },
      error: err => {
        this.addingHsn.set(false);
        this.hsnPopupError.set(err?.error?.title ?? err?.error?.message ?? 'Failed to add HSN/SAC.');
      }
    });
  }

  openUomPopup(): void {
    this.newUomName.set('');
    this.newUomSymbol.set('');
    this.uomPopupError.set('');
    this.showUomPopup.set(true);
  }

  closeUomPopup(): void {
    this.showUomPopup.set(false);
  }

  submitUom(): void {
    const uomName = this.newUomName().trim();
    if (!uomName) {
      this.uomPopupError.set('UOM name is required.');
      return;
    }
    const symbol = this.newUomSymbol().trim();
    const segmentId = this.editingId();
    if (this.uomList().some(item =>
      !item.is_system
      && (segmentId ? Number(item.segment_id) === segmentId || this.uomIds().includes(item.id) : !item.segment_id)
      && (
        this.normalizeKey(item.uom_name) === this.normalizeKey(uomName)
        || (!!symbol && this.normalizeKey(item.uom_symbol) === this.normalizeKey(symbol))
      )
    )) {
      this.uomPopupError.set('UOM already exists in this segment. Select it from the list instead.');
      return;
    }

    this.addingUom.set(true);
    this.uomPopupError.set('');
    this.svc.quickAddUom(uomName, this.newUomSymbol().trim() || undefined, segmentId).subscribe({
      next: res => {
        if (res.data) {
          this.uomList.update(list => [...list, res.data!]);
          this.uomIds.update(ids => [...new Set([...ids, res.data!.id])]);
        }
        this.addingUom.set(false);
        this.showUomPopup.set(false);
      },
      error: err => {
        this.addingUom.set(false);
        this.uomPopupError.set(err?.error?.title ?? err?.error?.message ?? 'Failed to add UOM.');
      }
    });
  }

  get cgstSgst(): number {
    return this.newHsnGst() / 2;
  }
}
