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
  BranchInvItem, InventoryConfigService, SegmentItem
} from '../../Inventory_Shared/inventory-config.service';
import { applyInventoryTextCase, toInventoryTitleCase } from '../../Inventory_Shared/inventory-text-case.util';

export interface ActivityTypeOption {
  key: string;
  label: string;
  icon: string;
}

const ACTIVITY_TYPES: ActivityTypeOption[] = [
  { key: 'sales_branch',      label: 'Sales Branch',                     icon: 'pi pi-shopping-cart' },
  { key: 'procurement',       label: 'Procurement',                      icon: 'pi pi-truck' },
  { key: 'sales_procurement', label: 'Sales Procurement - Operational',  icon: 'pi pi-arrows-h' },
  { key: 'self_consumption',  label: 'Self Consumption',                  icon: 'pi pi-home' },
  { key: 'service_provider',  label: 'Service Provider',                  icon: 'pi pi-wrench' },
  { key: 'service_product',   label: 'Service & Product',                 icon: 'pi pi-box' },
];

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
  activityTypes            = signal<string[]>([]);
  status                   = signal('active');
  editingId                = signal<number | null>(null);

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

  readonly selectedSettingsBranch = computed(() =>
    this.settingsBranches().find(b => b.id === this.selectedSettingsBranchId()) ?? null
  );

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

  readonly activityOptions = ACTIVITY_TYPES;
  readonly settingsRoute   = '/dashboard/settings/branch-management/manage-branches';
  readonly upgradeRoute    = '/dashboard/admin/subscription';

  ngOnInit(): void {
    forkJoin({
      segments:     this.svc.getSegments(),
      branches:     this.svc.getBranchesInv(true),
      settings:     this.access.getBranches(),
      subscription: this.subSvc.getSubscription()
    }).subscribe({
      next: ({ segments, branches, settings, subscription }) => {
        this.segments.set(segments.data       ?? []);
        this.savedBranches.set(branches.data  ?? []);
        this.settingsBranches.set(
          (settings.data ?? []).filter(b => b.status === 'active')
        );
        this.subscription.set(subscription.data ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
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

  // ── Activity types ────────────────────────────────────────────────────
  toggleActivity(key: string): void {
    const current = this.activityTypes();
    if (current.includes(key)) {
      this.activityTypes.set(current.filter(k => k !== key));
    } else {
      this.activityTypes.set([...current, key]);
    }
  }

  hasActivity(key: string): boolean {
    return this.activityTypes().includes(key);
  }

  activityLabels(): string {
    return this.activityTypes()
      .map(k => this.activityOptions.find(o => o.key === k)?.label ?? k)
      .join(', ') || '—';
  }

  segmentName(id: number | null | undefined): string {
    if (!id) return '—';
    return this.segments().find(s => s.id === id)?.segment_name ?? '—';
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
    if (!this.activityTypes().length) {
      this.saveError.set('Select at least one activity type');
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
      activity_types:   this.activityTypes(),
      _activity_labels: this.activityLabels(),
      status:           this.status()
    }]);
    this.clearForm();
  }

  removePending(key: number): void {
    this.pendingBranches.update(rows => rows.filter(r => r._key !== key));
  }

  clearForm(): void {
    this.selectedSettingsBranchId.set(null);
    this.segmentId.set(null);
    this.activityTypes.set([]);
    this.status.set('active');
    this.editingId.set(null);
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
      activity_types: r.activity_types,
      status:         r.status
    }));

    this.svc.batchSaveBranchesInv(batch).subscribe({
      next: res => {
        this.pendingBranches.set([]);
        this.savedBranches.set(res.data ?? []);
        this.saving.set(false);
        this.saveMsg.set(`${batch.length} branch configuration(s) saved`);
        setTimeout(() => this.saveMsg.set(''), 4000);
      },
      error: err => {
        this.saving.set(false);
        this.saveError.set(err?.error?.title ?? err?.error?.message ?? 'Save failed');
      }
    });
  }

  editBranch(br: BranchInvItem): void {
    this.editingId.set(br.id);
    this.selectedSettingsBranchId.set(br.branch_id ?? null);
    this.segmentId.set(br.segment_id ?? null);
    this.activityTypes.set([...(br.activity_types ?? [])]);
    this.status.set((br.status || 'active').toLowerCase());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
