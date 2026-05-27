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

@Component({
  selector: 'app-inventory-business-segments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule],
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

  showCatPopup = signal(false);
  newCatName = signal('');
  addingCat = signal(false);
  catPopupError = signal('');

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
        this.categories.set(categories.data ?? []);
        this.hsnSacList.set(hsn.data ?? []);
        this.uomList.set(uoms.data ?? []);
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
    this.segmentName.set(name);
    if (!this.editingId()) {
      this.segmentCode.set(this.autoCode(name));
    }
  }

  private autoCode(name: string): string {
    const words = name.trim().replace(/[^A-Za-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 0);
    let base: string;
    if (words.length >= 2) {
      base = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
    } else if (words.length === 1) {
      base = words[0].substring(0, 3).toUpperCase();
    } else {
      return '';
    }
    const seq = String(this.savedSegments().length + 1).padStart(3, '0');
    return `${base}-${seq}`;
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

  openCatPopup(): void {
    this.newCatName.set('');
    this.catPopupError.set('');
    this.showCatPopup.set(true);
  }

  closeCatPopup(): void {
    this.showCatPopup.set(false);
  }

  submitCat(): void {
    const categoryName = this.newCatName().trim();
    if (!categoryName) {
      this.catPopupError.set('Category name is required.');
      return;
    }

    this.addingCat.set(true);
    this.catPopupError.set('');
    this.svc.quickAddCategory(categoryName).subscribe({
      next: res => {
        if (res.data) {
          this.categories.update(list => [...list, res.data!]);
          this.categoryIds.update(ids => [...new Set([...ids, res.data!.id])]);
        }
        this.addingCat.set(false);
        this.showCatPopup.set(false);
      },
      error: err => {
        this.addingCat.set(false);
        this.catPopupError.set(err?.error?.title ?? err?.error?.message ?? 'Failed to add category.');
      }
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

    this.addingUom.set(true);
    this.uomPopupError.set('');
    this.svc.quickAddUom(uomName, this.newUomSymbol().trim() || undefined).subscribe({
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
