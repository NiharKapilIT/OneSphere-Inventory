import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { forkJoin } from 'rxjs';
import {
  AccessControlService, BranchResponse
} from '../../../core/services/Settings/access-control.service';
import {
  SubscriptionPlan, SubscriptionService
} from '../../../core/services/subscription/subscription.service';
import {
  BranchInvItem, InventoryConfigService, SegmentItem, WarehouseItem
} from '../../Inventory_Shared/inventory-config.service';
import { applyInventoryTextCase, toInventoryTitleCase } from '../../Inventory_Shared/inventory-text-case.util';

@Component({
  selector: 'app-inventory-branch-master',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule],
  templateUrl: './branch-master.html'
})
export class InventoryBranchMasterComponent implements OnInit {
  private svc          = inject(InventoryConfigService);
  private access       = inject(AccessControlService);
  private subSvc       = inject(SubscriptionService);
  private router       = inject(Router);

  // ── Form state ────────────────────────────────────────────────────────
  selectedSettingsBranchId = signal<number | null>(null);
  segmentId                = signal<number | null>(null);
  status                   = signal('active');
  editingId                = signal<number | null>(null);
  warehouseId              = signal<number | null>(null);

  // ── Quick-add new branch ──────────────────────────────────────────────
  showQuickAdd       = signal(false);
  quickBranchName    = signal('');
  quickBranchCode    = signal('');
  quickBranchSaving  = signal(false);
  quickBranchError   = signal('');

  // ── Reference lists / grids ───────────────────────────────────────────
  settingsBranches = signal<BranchResponse[]>([]);
  segments         = signal<SegmentItem[]>([]);
  savedBranches    = signal<BranchInvItem[]>([]);
  pendingBranches  = signal<any[]>([]);
  warehouses       = signal<WarehouseItem[]>([]);

  readonly selectedSettingsBranch = computed(() =>
    this.settingsBranches().find(b => b.id === this.selectedSettingsBranchId()) ?? null
  );

  // Warehouse currently linked (inv_warehouses.branch_id) to the selected branch, if any.
  readonly linkedWarehouse = computed(() => {
    const id = this.selectedSettingsBranchId();
    if (!id) return null;
    return this.warehouses().find(w => w.branch_id === id) ?? null;
  });

  readonly alreadyConfigured = computed(() => {
    const id = this.selectedSettingsBranchId();
    if (!id || this.editingId()) return null;
    return this.savedBranches().find(b => b.branch_id === id) ?? null;
  });

  readonly visibleSavedBranches = computed(() => {
    const selectedSegmentId = this.segmentId();
    return selectedSegmentId
      ? this.savedBranches().filter(branch => branch.segment_id === selectedSegmentId)
      : this.savedBranches();
  });

  // ── Subscription quota ────────────────────────────────────────────────
  subscription = signal<SubscriptionPlan | null>(null);

  readonly branchLimitReached = computed(() => {
    const s = this.subscription();
    return !!s && s.currentBranchCount >= s.maxBranches;
  });

  readonly userLimitReached = computed(() => {
    const s = this.subscription();
    return !!s && s.currentUserCount >= s.maxUsers;
  });

  // ── Page state ────────────────────────────────────────────────────────
  loading   = signal(true);
  saving    = signal(false);
  saveMsg   = signal('');
  saveError = signal('');

  readonly settingsRoute   = '/dashboard/settings/branch-management/manage-branches';
  readonly upgradeRoute    = '/dashboard/admin/subscription';

  ngOnInit(): void {
    forkJoin({
      segments:     this.svc.getSegments(),
      branches:     this.svc.getBranchesInv(true),
      settings:     this.access.getBranches(),
      subscription: this.subSvc.getSubscription(),
      warehouses:   this.svc.getWarehouses(true)
    }).subscribe({
      next: ({ segments, branches, settings, subscription, warehouses }) => {
        this.segments.set(segments.data       ?? []);
        this.savedBranches.set(branches.data  ?? []);
        this.settingsBranches.set(
          (settings.data ?? []).filter(b => b.status === 'active')
        );
        this.subscription.set(subscription.data ?? null);
        this.warehouses.set(warehouses.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // Selecting a branch pre-fills whichever warehouse is already linked to it.
  onSettingsBranchSelected(id: number | null): void {
    this.selectedSettingsBranchId.set(id);
    this.warehouseId.set(this.warehouses().find(w => w.branch_id === id)?.id ?? null);
  }

  // ── Quick-add branch ──────────────────────────────────────────────────
  onQuickNameChange(name: string): void {
    const normalizedName = toInventoryTitleCase(name ?? '');
    this.quickBranchName.set(normalizedName);
    if (!normalizedName.trim()) { this.quickBranchCode.set(''); return; }
    const words = normalizedName.trim().replace(/[^A-Za-z0-9\s]/g, '').split(/\s+/).filter(w => w);
    let base: string;
    if (words.length >= 2) {
      base = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
    } else if (words.length === 1) {
      base = words[0].substring(0, 3).toUpperCase();
    } else { base = ''; }
    if (!base) { this.quickBranchCode.set(''); return; }
    const seq = String(this.settingsBranches().length + 1).padStart(3, '0');
    this.quickBranchCode.set(`${base}-${seq}`);
  }

  onQuickCodeChange(code: string): void {
    this.quickBranchCode.set(String(applyInventoryTextCase(code ?? '', 'upper')));
  }

  saveQuickBranch(): void {
    const name = this.quickBranchName().trim();
    const code = this.quickBranchCode().trim();
    if (!name) { this.quickBranchError.set('Branch name is required'); return; }
    if (!code) { this.quickBranchError.set('Branch code is required'); return; }
    if (this.branchLimitReached()) {
      this.quickBranchError.set('Branch limit reached. Upgrade your plan to add more branches.');
      return;
    }

    this.quickBranchSaving.set(true);
    this.quickBranchError.set('');
    this.access.createBranch({
      branchName: name,
      branchCode: code,
      isHeadOffice: false,
      status: 'active'
    }).subscribe({
      next: res => {
        const created = res.data;
        this.settingsBranches.update(list => [...list, created]);
        this.selectedSettingsBranchId.set(created.id);
        this.subscription.update(s => s
          ? { ...s, currentBranchCount: s.currentBranchCount + 1 }
          : s
        );
        this.quickBranchSaving.set(false);
        this.quickBranchName.set('');
        this.quickBranchCode.set('');
        this.showQuickAdd.set(false);
      },
      error: err => {
        this.quickBranchSaving.set(false);
        this.quickBranchError.set(err?.error?.message ?? err?.error?.title ?? 'Could not create branch');
      }
    });
  }

  cancelQuickAdd(): void {
    this.showQuickAdd.set(false);
    this.quickBranchName.set('');
    this.quickBranchCode.set('');
    this.quickBranchError.set('');
  }

  goToSettingsBranch(): void {
    sessionStorage.setItem('inventoryBranchReturnUrl', '/dashboard/inventory/configuration/branch-config');
    this.router.navigate([this.settingsRoute]);
  }

  segmentName(id: number | null | undefined): string {
    if (!id) return '—';
    return this.segments().find(s => s.id === id)?.segment_name ?? '—';
  }

  warehouseName(id: number | null | undefined): string {
    if (!id) return '—';
    return this.warehouses().find(w => w.id === id)?.warehouse_name ?? '—';
  }

  warehouseNameForBranch(branchId: number | null | undefined): string {
    if (!branchId) return '—';
    return this.warehouses().find(w => w.branch_id === branchId)?.warehouse_name ?? '—';
  }

  branchDisplayLabel(branchId: number | null | undefined): string {
    if (!branchId) return '—';
    const sb = this.settingsBranches().find(b => b.id === branchId);
    if (sb) return `${sb.branchCode} – ${sb.branchName}`;
    const saved = this.savedBranches().find(b => b.branch_id === branchId);
    return saved ? `${saved.branch_code} – ${saved.branch_name}` : `Branch #${branchId}`;
  }

  // ── Pending / save ────────────────────────────────────────────────────
  addToPending(): void {
    const sb = this.selectedSettingsBranch();
    if (!sb) {
      this.saveError.set('Please select a branch');
      return;
    }
    this.saveError.set('');

    this.pendingBranches.update(rows => [...rows, {
      _key:             Date.now(),
      _editId:          this.editingId(),
      branch_id:        sb.id,
      branch_name:      sb.branchName,
      branch_code:      sb.branchCode,
      segment_id:       this.segmentId(),
      _segment_name:    this.segmentName(this.segmentId()),
      status:           this.status(),
      warehouse_id:     this.warehouseId(),
      _warehouse_name:  this.warehouseName(this.warehouseId())
    }]);
    this.clearForm();
  }

  removePending(key: number): void {
    this.pendingBranches.update(rows => rows.filter(r => r._key !== key));
  }

  clearForm(): void {
    this.selectedSettingsBranchId.set(null);
    this.segmentId.set(null);
    this.status.set('active');
    this.editingId.set(null);
    this.warehouseId.set(null);
    this.saveError.set('');
    this.cancelQuickAdd();
  }

  saveAll(): void {
    if (!this.pendingBranches().length) return;
    this.saving.set(true); this.saveMsg.set(''); this.saveError.set('');

    const batch = this.pendingBranches().map(r => ({
      ...(r._editId ? { id: r._editId } : {}),
      branch_id:      r.branch_id,
      branch_name:    r.branch_name,
      branch_code:    r.branch_code || undefined,
      segment_id:     r.segment_id  ?? undefined,
      status:         r.status
    }));

    const warehouseLinks = this.pendingBranches()
      .filter(r => r.warehouse_id)
      .map(r => ({ warehouseId: r.warehouse_id as number, branchId: r.branch_id as number }));

    this.svc.batchSaveBranchesInv(batch).subscribe({
      next: res => {
        this.pendingBranches.set([]);
        this.savedBranches.set(res.data ?? []);
        this.saving.set(false);
        this.saveMsg.set(`${batch.length} branch configuration(s) saved`);
        setTimeout(() => this.saveMsg.set(''), 4000);
        this.linkWarehousesToBranches(warehouseLinks);
      },
      error: err => {
        this.saving.set(false);
        this.saveError.set(err?.error?.title ?? err?.error?.message ?? 'Save failed');
      }
    });
  }

  // Points each selected warehouse's branch_id at the branch it was configured against
  // (inv_warehouses.branch_id is the single source of truth for the branch<->warehouse link).
  private linkWarehousesToBranches(links: { warehouseId: number; branchId: number }[]): void {
    for (const { warehouseId, branchId } of links) {
      const wh = this.warehouses().find(w => w.id === warehouseId);
      if (!wh || wh.branch_id === branchId) continue;
      this.svc.saveWarehouse({
        branch_id:      branchId,
        segment_id:     wh.segment_id,
        warehouse_code: wh.warehouse_code,
        warehouse_name: wh.warehouse_name,
        address:        wh.address,
        city:           wh.city,
        state:          wh.state,
        district:       wh.district,
        pincode:        wh.pincode,
        capacity:       wh.capacity,
        capacity_unit:  wh.capacity_unit,
        is_default:     wh.is_default,
        status:         wh.status
      }, warehouseId).subscribe({
        next: res => {
          if (res.data) {
            this.warehouses.update(list => list.map(w => w.id === res.data!.id ? res.data! : w));
          }
        },
        error: () => undefined
      });
    }
  }

  editBranch(br: BranchInvItem): void {
    // Rows sourced only from Settings (not yet configured for inventory) have no id yet —
    // treat as a new inventory config entry rather than an edit.
    this.editingId.set(br.id ?? null);
    this.selectedSettingsBranchId.set(br.branch_id ?? null);
    this.segmentId.set(br.segment_id ?? null);
    this.status.set((br.status || 'active').toLowerCase());
    this.warehouseId.set(this.warehouses().find(w => w.branch_id === br.branch_id)?.id ?? null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
