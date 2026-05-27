import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import {
  AccessControlService,
  ModuleResponse,
  PermissionFlags,
  RoleScreenPermissionResponse,
  SaveRoleScreenPermissionsRequest,
  UserResponse
} from '../../../../core/services/Settings/access-control.service';

type PermissionAction = keyof PermissionFlags;

export interface SubModuleGroup {
  key: string;
  label: string;
  screens: RoleScreenPermissionResponse[];
}

export interface ModulePermissions {
  moduleCode: string;
  moduleName: string;
  icon: string;
  subGroups: SubModuleGroup[];
}

const FULL_ACCESS: PermissionFlags = { view: true, create: true, update: true, delete: true, approve: true, export: true };
const NO_ACCESS: PermissionFlags   = { view: false, create: false, update: false, delete: false, approve: false, export: false };

@Component({
  selector: 'app-roles-permissions',
  imports: [CommonModule, FormsModule, ToastModule],
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

  loading              = signal(false);
  saving               = signal(false);
  error                = signal('');
  userQ                = signal('');
  activeTab            = signal('');
  collapsed            = signal<Set<string>>(new Set());
  currentUserIsAdmin   = signal(false);

  users       = signal<UserResponse[]>([]);
  modules     = signal<ModuleResponse[]>([]);
  selected    = signal<UserResponse | null>(null);
  permissions = signal<RoleScreenPermissionResponse[]>([]);

  // ── Computed ────────────────────────────────────────────────────
  filteredUsers = computed(() => {
    const q = this.userQ().trim().toLowerCase();
    return q
      ? this.users().filter(u =>
          u.fullName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q)
        )
      : this.users();
  });

  /** Only the modules that are assigned to the selected user */
  userModules = computed((): ModuleResponse[] => {
    const user = this.selected();
    if (!user) return [];
    const ids = new Set((user.modules ?? []).map(m => m.id));
    return this.modules().filter(m => ids.has(m.id));
  });

  isAdmin = computed(() => {
    const u = this.selected();
    if (!u) return false;
    return u.isSuperAdmin || u.roles.some(r =>
      r.roleType === 'company_admin' || r.roleType === 'super_admin'
    );
  });

  // Derive sub-module groups for the active module tab
  activeModulePerms = computed((): ModulePermissions | null => {
    const code = this.activeTab();
    if (!code) return null;
    const all  = this.permissions();
    const mod  = this.modules().find(m => m.moduleCode.toUpperCase() === code.toUpperCase());
    const pfx  = code.toUpperCase();

    const screens = all.filter(p => {
      const sc = p.screenCode.toUpperCase();
      return sc.startsWith(pfx + '_') || sc === pfx;
    });

    const subMap = new Map<string, RoleScreenPermissionResponse[]>();
    for (const s of screens) {
      const parts  = s.screenCode.toUpperCase().replace(/-/g, '_').split('_');
      const noMod  = parts[0] === pfx ? parts.slice(1) : parts;
      const subKey = noMod.length > 1 ? noMod[0] : 'GENERAL';
      if (!subMap.has(subKey)) subMap.set(subKey, []);
      subMap.get(subKey)!.push(s);
    }

    const subGroups: SubModuleGroup[] = Array.from(subMap.entries()).map(([key, scr]) => ({
      key,
      label: this.toLabel(key),
      screens: scr
    }));

    return {
      moduleCode: code,
      moduleName: mod?.moduleName ?? code,
      icon: mod?.icon ?? 'pi-th-large',
      subGroups
    };
  });

  async ngOnInit(): Promise<void> {
    this.currentUserIsAdmin.set(this.readCurrentUserIsAdmin());
    await Promise.all([this.loadUsers(), this.loadModules()]);
  }

  // ── Data loaders ─────────────────────────────────────────────────
  async loadUsers(): Promise<void> {
    this.loading.set(true);
    try {
      const r = await firstValueFrom(this.accessControl.getUsers().pipe(timeout(12000)));
      this.users.set(r.data ?? []);
    } catch (e: any) {
      this.showToast('error', 'Load failed', this.errMsg(e, 'Unable to load users.'));
    } finally { this.loading.set(false); }
  }

  async loadModules(): Promise<void> {
    try {
      const r = await firstValueFrom(this.accessControl.getAssignableModules().pipe(timeout(12000)));
      const mods = (r.data ?? []).filter(m => m.status === 'active');
      this.modules.set(mods);
      if (mods.length && !this.activeTab()) this.activeTab.set(mods[0].moduleCode);
    } catch { /* tabs are optional */ }
  }

  // ── User selection ────────────────────────────────────────────────
  async selectUser(user: UserResponse): Promise<void> {
    this.selected.set(user);
    this.error.set('');
    this.permissions.set([]);
    // Auto-select first module tab for this user
    const firstMod = this.userModules()[0];
    this.activeTab.set(firstMod?.moduleCode ?? '');
    const roleId = user.roles[0]?.id;
    if (!roleId) {
      this.showToast('warn', 'No role assigned', `${user.fullName} has no role. Add a role via Manage Users.`);
      return;
    }
    this.loading.set(true);
    try {
      const r = await firstValueFrom(this.accessControl.getRolePermissions(roleId).pipe(timeout(12000)));
      this.permissions.set(r.data ?? []);
    } catch (e: any) {
      this.showToast('error', 'Load failed', this.errMsg(e, 'Unable to load permissions.'));
    } finally { this.loading.set(false); }
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

  grantAll(): void    { this.setForIds(this.activeScreenIds(), true);  }
  revokeAll(): void   { this.setForIds(this.activeScreenIds(), false); }

  grantSubModule(key: string): void {
    const sg = this.activeModulePerms()?.subGroups.find(g => g.key === key);
    if (sg) this.setForIds(new Set(sg.screens.map(s => s.screenId)), true);
  }

  revokeSubModule(key: string): void {
    const sg = this.activeModulePerms()?.subGroups.find(g => g.key === key);
    if (sg) this.setForIds(new Set(sg.screens.map(s => s.screenId)), false);
  }

  // ── Sub-module collapse ───────────────────────────────────────────
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
    const user   = this.selected();
    const roleId = user?.roles[0]?.id;
    if (!roleId) { this.error.set('User has no role to save permissions for.'); return; }

    const request: SaveRoleScreenPermissionsRequest = {
      roleId,
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
      // Reload to reflect saved state
      await this.selectUser(user!);
    } catch (e: any) {
      this.error.set(this.errMsg(e, 'Unable to save permissions.'));
      this.showToast('error', 'Save failed', this.error());
    } finally { this.saving.set(false); }
  }

  grantScreen(screenId: number): void {
    this.setForIds(new Set([screenId]), true);
  }

  // ── Helpers ───────────────────────────────────────────────────────
  roleTypeLabel(u: UserResponse): string {
    const r = u.roles[0];
    if (!r) return 'No role';
    return r.roleType.replace(/_/g, ' ');
  }

  userInitial(u: UserResponse): string {
    return (u.fullName || u.username).charAt(0).toUpperCase();
  }

  private activeScreenIds(): Set<number> {
    return new Set(
      (this.activeModulePerms()?.subGroups ?? []).flatMap(g => g.screens.map(s => s.screenId))
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

  private toLabel(code: string): string {
    return code.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
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
