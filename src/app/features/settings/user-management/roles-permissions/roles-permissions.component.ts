import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import {
  AccessControlService,
  PermissionFlags,
  RoleResponse,
  RoleScreenPermissionResponse,
  RoleUpsertRequest,
  SaveRoleScreenPermissionsRequest,
  UserResponse
} from '../../../../core/services/Settings/access-control.service';

type PermissionAction = keyof PermissionFlags;

export interface ScreenGroup {
  key: string;
  label: string;
  screens: RoleScreenPermissionResponse[];
}

export interface ModuleTab {
  moduleId: number;
  moduleCode: string;
  moduleName: string;
  icon: string;
}

export interface ActiveModulePerms {
  moduleCode: string;
  moduleName: string;
  icon: string;
  groups: ScreenGroup[];
}

const FULL_ACCESS: PermissionFlags = { view: true, create: true, update: true, delete: true, approve: true, export: true };
const NO_ACCESS: PermissionFlags   = { view: false, create: false, update: false, delete: false, approve: false, export: false };

/**
 * Roles & Permissions — per-screen CRUD (+Approve/Export) access, grouped by
 * module and, within a module, by the screen's logical group (e.g. Inventory
 * → "Procurement" → Purchase Invoice). Module tabs are derived entirely from
 * whatever the API returns for the selected role, so a new microfrontend
 * (Accounts, HRMS, ...) shows up here automatically the moment its screens
 * are registered — nothing in this component is Inventory-specific.
 */
@Component({
  selector: 'app-roles-permissions',
  imports: [CommonModule, FormsModule, RouterModule, ToastModule],
  providers: [MessageService],
  templateUrl: './roles-permissions.component.html',
  styleUrl: './roles-permissions.component.scss'
})
export class RolesPermissionsComponent implements OnInit {
  private readonly accessControl = inject(AccessControlService);
  private readonly messageService = inject(MessageService);

  readonly ACTIONS: Array<{ key: PermissionAction; label: string }> = [
    { key: 'view',    label: 'View'    },
    { key: 'create',  label: 'Create'  },
    { key: 'update',  label: 'Update'  },
    { key: 'delete',  label: 'Delete'  },
    { key: 'approve', label: 'Approve' },
    { key: 'export',  label: 'Export'  },
  ];

  loading            = signal(false);
  saving             = signal(false);
  error              = signal('');
  roleQ              = signal('');
  activeTab          = signal('');
  collapsed          = signal<Set<string>>(new Set());
  currentUserIsAdmin = signal(false);

  showAddRole  = signal(false);
  newRoleName  = signal('');
  addingRole   = signal(false);

  roles       = signal<RoleResponse[]>([]);
  users       = signal<UserResponse[]>([]);
  selected    = signal<RoleResponse | null>(null);
  permissions = signal<RoleScreenPermissionResponse[]>([]);

  // ── Computed ────────────────────────────────────────────────────
  filteredRoles = computed(() => {
    const q = this.roleQ().trim().toLowerCase();
    const list = this.roles();
    return q
      ? list.filter(r => r.roleName.toLowerCase().includes(q) || r.roleCode.toLowerCase().includes(q))
      : list;
  });

  /** Super Admin is the only role type the backend always bypasses (`IsSuperAdmin` short-circuit) —
   *  every other role type, including Company Admin, is genuinely row-driven and editable here. */
  isSuperAdminRole = computed(() => this.selected()?.roleType === 'super_admin');

  /** Role ↔ user mapping is owned by Manage Users (a user's `roleIds` there) — this is a read-only
   *  view of who currently has the selected role, so it's clear where that assignment happens. */
  usersWithSelectedRole = computed((): UserResponse[] => {
    const role = this.selected();
    if (!role) return [];
    return this.users().filter(u => u.roles.some(r => r.id === role.id));
  });

  /** Module tabs, in the order the API already returns them (module display_order) — first-seen wins. */
  moduleTabs = computed((): ModuleTab[] => {
    const seen = new Map<string, ModuleTab>();
    for (const p of this.permissions()) {
      if (!seen.has(p.moduleCode)) {
        seen.set(p.moduleCode, { moduleId: p.moduleId, moduleCode: p.moduleCode, moduleName: p.moduleName, icon: p.moduleIcon || 'pi-th-large' });
      }
    }
    return Array.from(seen.values());
  });

  // Screens for the active module tab, grouped by their real screen_group (not a string-prefix guess).
  activeModulePerms = computed((): ActiveModulePerms | null => {
    const code = this.activeTab();
    if (!code) return null;
    const tab = this.moduleTabs().find(m => m.moduleCode === code);
    const screens = this.permissions().filter(p => p.moduleCode === code);

    const groupMap = new Map<string, RoleScreenPermissionResponse[]>();
    for (const s of screens) {
      const key = s.screenGroup?.trim() || 'General';
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(s);
    }

    const groups: ScreenGroup[] = Array.from(groupMap.entries()).map(([key, scr]) => ({ key, label: key, screens: scr }));

    return {
      moduleCode: code,
      moduleName: tab?.moduleName ?? code,
      icon: tab?.icon ?? 'pi-th-large',
      groups
    };
  });

  async ngOnInit(): Promise<void> {
    this.currentUserIsAdmin.set(this.readCurrentUserIsAdmin());
    await Promise.all([this.loadRoles(), this.loadUsers()]);
  }

  // ── Data loaders ─────────────────────────────────────────────────
  async loadRoles(): Promise<void> {
    this.loading.set(true);
    try {
      const r = await firstValueFrom(this.accessControl.getRoles().pipe(timeout(12000)));
      this.roles.set((r.data ?? []).filter(role => role.status === 'active'));
    } catch (e: any) {
      this.showToast('error', 'Load failed', this.errMsg(e, 'Unable to load roles.'));
    } finally { this.loading.set(false); }
  }

  /** Only for the read-only "who has this role" panel — errors here are non-fatal to the screen. */
  async loadUsers(): Promise<void> {
    try {
      const r = await firstValueFrom(this.accessControl.getUsers().pipe(timeout(12000)));
      this.users.set(r.data ?? []);
    } catch { /* optional context, fine to skip if it fails */ }
  }

  // ── Role selection ────────────────────────────────────────────────
  async selectRole(role: RoleResponse): Promise<void> {
    this.selected.set(role);
    this.error.set('');
    this.permissions.set([]);
    this.activeTab.set('');
    this.loading.set(true);
    try {
      const r = await firstValueFrom(this.accessControl.getRolePermissions(role.id).pipe(timeout(12000)));
      this.permissions.set(r.data ?? []);
      const firstTab = this.moduleTabs()[0];
      if (firstTab) this.activeTab.set(firstTab.moduleCode);
    } catch (e: any) {
      this.showToast('error', 'Load failed', this.errMsg(e, 'Unable to load permissions.'));
    } finally { this.loading.set(false); }
  }

  // ── Add role ─────────────────────────────────────────────────────
  toggleAddRole(): void {
    this.showAddRole.update(v => !v);
    this.newRoleName.set('');
  }

  async addRole(): Promise<void> {
    const name = this.newRoleName().trim();
    if (!name) return;
    const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50) || 'ROLE';

    const request: RoleUpsertRequest = { roleCode: code, roleName: name, roleType: 'custom', description: null, status: 'active' };
    this.addingRole.set(true);
    try {
      const r = await firstValueFrom(this.accessControl.createRole(request).pipe(timeout(12000)));
      this.showToast('success', 'Role created', `${name} was created.`);
      this.showAddRole.set(false);
      this.newRoleName.set('');
      await this.loadRoles();
      const created = this.roles().find(x => x.id === r.data.id);
      if (created) await this.selectRole(created);
    } catch (e: any) {
      this.showToast('error', 'Create failed', this.errMsg(e, 'Unable to create role.'));
    } finally { this.addingRole.set(false); }
  }

  async deactivateRole(role: RoleResponse, ev: Event): Promise<void> {
    ev.stopPropagation();
    if (role.roleType === 'super_admin' || role.roleType === 'company_admin') {
      this.showToast('warn', 'Not allowed', 'System roles cannot be deactivated.');
      return;
    }
    try {
      await firstValueFrom(this.accessControl.inactivateRole(role.id).pipe(timeout(12000)));
      this.showToast('success', 'Role deactivated', `${role.roleName} was deactivated.`);
      if (this.selected()?.id === role.id) { this.selected.set(null); this.permissions.set([]); }
      await this.loadRoles();
    } catch (e: any) {
      this.showToast('error', 'Deactivate failed', this.errMsg(e, 'Unable to deactivate role.'));
    }
  }

  // ── Permission toggling ───────────────────────────────────────────
  toggle(screenId: number, action: PermissionAction, val: boolean): void {
    this.permissions.update(items =>
      items.map(item =>
        item.screenId === screenId
          ? { ...item, permissions: { ...item.permissions, [action]: val } }
          : item
      )
    );
  }

  setColumnForTab(action: PermissionAction, val: boolean): void {
    const ids = this.activeScreenIds();
    this.permissions.update(items =>
      items.map(item =>
        ids.has(item.screenId)
          ? { ...item, permissions: { ...item.permissions, [action]: val } }
          : item
      )
    );
  }

  grantAll(): void  { this.setForIds(this.activeScreenIds(), true);  }
  revokeAll(): void { this.setForIds(this.activeScreenIds(), false); }

  grantGroup(key: string): void {
    const g = this.activeModulePerms()?.groups.find(x => x.key === key);
    if (g) this.setForIds(new Set(g.screens.map(s => s.screenId)), true);
  }

  revokeGroup(key: string): void {
    const g = this.activeModulePerms()?.groups.find(x => x.key === key);
    if (g) this.setForIds(new Set(g.screens.map(s => s.screenId)), false);
  }

  // ── Group collapse ───────────────────────────────────────────────
  toggleCollapse(key: string): void {
    this.collapsed.update(set => {
      const n = new Set(set);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  isCollapsed(key: string): boolean { return this.collapsed().has(key); }

  // ── Save ──────────────────────────────────────────────────────────
  async savePermissions(): Promise<void> {
    const role = this.selected();
    if (!role) { this.error.set('Select a role first.'); return; }

    const request: SaveRoleScreenPermissionsRequest = {
      roleId: role.id,
      permissions: this.permissions().map(item => ({
        screenId:   item.screenId,
        canView:    item.permissions.view,
        canCreate:  item.permissions.create,
        canUpdate:  item.permissions.update,
        canDelete:  item.permissions.delete,
        canApprove: item.permissions.approve,
        canExport:  item.permissions.export
      }))
    };

    this.saving.set(true);
    this.error.set('');
    try {
      const r = await firstValueFrom(this.accessControl.saveRolePermissions(request).pipe(timeout(12000)));
      this.showToast('success', 'Permissions saved', r.message ?? 'Updated successfully.');
      await this.selectRole(role);
    } catch (e: any) {
      this.error.set(this.errMsg(e, 'Unable to save permissions.'));
      this.showToast('error', 'Save failed', this.error());
    } finally { this.saving.set(false); }
  }

  grantScreen(screenId: number): void {
    this.setForIds(new Set([screenId]), true);
  }

  // ── Helpers ───────────────────────────────────────────────────────
  roleTypeLabel(role: RoleResponse): string {
    return role.roleType.replace(/_/g, ' ');
  }

  roleInitial(role: RoleResponse): string {
    return role.roleName.charAt(0).toUpperCase();
  }

  private activeScreenIds(): Set<number> {
    return new Set(
      (this.activeModulePerms()?.groups ?? []).flatMap(g => g.screens.map(s => s.screenId))
    );
  }

  private setForIds(ids: Set<number>, grant: boolean): void {
    const flags = grant ? { ...FULL_ACCESS } : { ...NO_ACCESS };
    this.permissions.update(items =>
      items.map(item =>
        ids.has(item.screenId) ? { ...item, permissions: { ...flags } } : item
      )
    );
  }

  private errMsg(e: any, fallback: string): string {
    return e?.error?.message ?? e?.message ?? fallback;
  }

  private readCurrentUserIsAdmin(): boolean {
    try {
      const u = JSON.parse(sessionStorage.getItem('authUser') || '{}') as { isSuperAdmin?: boolean };
      if (u.isSuperAdmin === true) return true;
      const roles = JSON.parse(sessionStorage.getItem('authRoles') || '[]') as Array<{ roleType?: string }>;
      return roles.some(r => {
        const t = (r.roleType ?? '').toLowerCase().replace(/[\s_\-]/g, '');
        return t === 'companyadmin' || t === 'superadmin' || t === 'branchadmin';
      });
    } catch { return false; }
  }

  private showToast(sev: string, sum: string, det: string): void {
    this.messageService.add({ severity: sev, summary: sum, detail: det, life: 3500 });
  }
}
