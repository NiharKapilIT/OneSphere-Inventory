import {
  Component, OnInit, signal, computed, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';

import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import {
  SubscriptionService,
  SubscriptionPlan,
  ModulePricingItem,
  UpgradeRequest,
  CalculateUpgradeResponse,
  SubscriptionOrderListItem
} from '../../../core/services/subscription/subscription.service';

type ActiveTab = 'plan' | 'history';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule],
  providers: [MessageService],
  templateUrl: './subscription.component.html',
  styleUrl: './subscription.component.scss'
})
export class SubscriptionComponent implements OnInit {

  private readonly subscriptionService = inject(SubscriptionService);
  private readonly messageService = inject(MessageService);

  // ── Tab ─────────────────────────────────────────────────────────────
  activeTab = signal<ActiveTab>('plan');

  // ── Loading states ───────────────────────────────────────────────────
  planLoading = signal(true);
  modulesLoading = signal(true);
  calculating = signal(false);
  upgrading = signal(false);
  ordersLoading = signal(false);

  // ── Data ─────────────────────────────────────────────────────────────
  currentPlan = signal<SubscriptionPlan | null>(null);
  availableModules = signal<ModulePricingItem[]>([]);
  upgradePreview = signal<CalculateUpgradeResponse | null>(null);
  orders = signal<SubscriptionOrderListItem[]>([]);

  // ── Upgrade form ─────────────────────────────────────────────────────
  selectedModuleIds = signal<Set<number>>(new Set());
  maxBranches = signal(5);
  maxUsers = signal(10);

  // ── Computed helpers ─────────────────────────────────────────────────
  totalCost = computed(() => {
    const modules = this.availableModules();
    const ids = this.selectedModuleIds();
    return modules.filter(m => ids.has(m.id)).reduce((s, m) => s + m.monthlyPrice, 0);
  });

  hasChanges = computed(() => {
    const plan = this.currentPlan();
    if (!plan) return true;
    const preview = this.upgradePreview();
    if (preview) {
      return preview.branchesAdded !== 0 || preview.usersAdded !== 0 || preview.modulesAdded.length > 0;
    }
    const currentIds = new Set(plan.modules.filter(m => m.subscribed).map(m => m.id));
    const selectedIds = this.selectedModuleIds();
    if (this.maxBranches() !== plan.maxBranches) return true;
    if (this.maxUsers() !== plan.maxUsers) return true;
    for (const id of selectedIds) { if (!currentIds.has(id)) return true; }
    return false;
  });

  statusClass = computed(() => {
    const s = this.currentPlan()?.subscriptionStatus ?? '';
    if (s === 'active' || s === 'success') return 'status-active';
    if (s === 'temporary_approved') return 'status-trial';
    if (s === 'pending') return 'status-pending';
    return 'status-inactive';
  });

  statusLabel = computed(() => {
    const s = this.currentPlan()?.subscriptionStatus ?? '';
    const map: Record<string, string> = {
      active: 'Active', success: 'Active',
      temporary_approved: 'Trial', pending: 'Pending',
      failed: 'Failed', inactive: 'Inactive'
    };
    return map[s] ?? s;
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadPlan(), this.loadModules()]);
  }

  private async loadPlan(): Promise<void> {
    this.planLoading.set(true);
    try {
      const res = await firstValueFrom(this.subscriptionService.getSubscription().pipe(timeout(10000)));
      if (res?.data) {
        this.currentPlan.set(res.data);
        this.maxBranches.set(res.data.maxBranches);
        this.maxUsers.set(res.data.maxUsers);
      }
    } catch {
      // silent
    } finally {
      this.planLoading.set(false);
    }
  }

  private async loadModules(): Promise<void> {
    this.modulesLoading.set(true);
    try {
      const res = await firstValueFrom(this.subscriptionService.getAvailableModules().pipe(timeout(8000)));
      if (res?.data) {
        this.availableModules.set(res.data);
        // pre-select currently subscribed + core modules
        const ids = new Set(res.data.filter(m => m.subscribed || m.isCore).map(m => m.id));
        this.selectedModuleIds.set(ids);
      }
    } catch {
      // silent
    } finally {
      this.modulesLoading.set(false);
    }
  }

  isModuleSelected(moduleId: number): boolean {
    return this.selectedModuleIds().has(moduleId);
  }

  toggleModule(mod: ModulePricingItem): void {
    if (mod.isCore || mod.subscribed) return;
    const next = new Set(this.selectedModuleIds());
    next.has(mod.id) ? next.delete(mod.id) : next.add(mod.id);
    this.selectedModuleIds.set(next);
    this.upgradePreview.set(null); // reset preview on change
  }

  buildRequest(): UpgradeRequest {
    return {
      moduleIds: Array.from(this.selectedModuleIds()),
      maxBranches: this.maxBranches(),
      maxUsers: this.maxUsers()
    };
  }

  async previewUpgrade(): Promise<void> {
    this.calculating.set(true);
    this.upgradePreview.set(null);
    try {
      const res = await firstValueFrom(
        this.subscriptionService.calculateUpgrade(this.buildRequest()).pipe(timeout(10000))
      );
      if (res?.data) {
        this.upgradePreview.set(res.data);
      }
    } catch (err: any) {
      this.showToast('error', 'Preview failed', err?.error?.message ?? 'Could not calculate upgrade cost.');
    } finally {
      this.calculating.set(false);
    }
  }

  async confirmUpgrade(): Promise<void> {
    if (!this.upgradePreview()) {
      await this.previewUpgrade();
      return;
    }
    this.upgrading.set(true);
    try {
      const res = await firstValueFrom(
        this.subscriptionService.upgrade(this.buildRequest()).pipe(timeout(15000))
      );
      if (res?.data) {
        this.showToast('success', 'Upgrade submitted', res.message || 'Your plan has been updated.');
        this.upgradePreview.set(null);
        await this.loadPlan();
        await this.loadModules();
      }
    } catch (err: any) {
      this.showToast('error', 'Upgrade failed', err?.error?.message ?? 'Could not process upgrade.');
    } finally {
      this.upgrading.set(false);
    }
  }

  async loadOrders(): Promise<void> {
    if (this.ordersLoading()) return;
    this.ordersLoading.set(true);
    try {
      const res = await firstValueFrom(this.subscriptionService.getOrders().pipe(timeout(10000)));
      if (res?.data) this.orders.set(res.data);
    } catch {
      // silent
    } finally {
      this.ordersLoading.set(false);
    }
  }

  switchTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    if (tab === 'history' && this.orders().length === 0) {
      this.loadOrders();
    }
  }

  orderStatusClass(status: string): string {
    if (status === 'success') return 'ord-status-ok';
    if (status === 'pending' || status === 'temporary_approved') return 'ord-status-pending';
    if (status === 'failed') return 'ord-status-fail';
    return '';
  }

  formatDate(dt?: string): string {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  showToast(severity: string, summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 4000 });
  }
}
