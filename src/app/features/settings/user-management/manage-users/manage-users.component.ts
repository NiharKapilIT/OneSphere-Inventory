import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import {
  AccessControlService,
  BranchResponse,
  ModuleResponse,
  RoleResponse,
  UserResponse,
  UserUpsertRequest
} from '../../../../core/services/Settings/access-control.service';
import { BiometricAuthService } from '../../../../core/services/biometric-auth.service';

interface UserFormState {
  id: number | null;
  fullName: string;
  username: string;
  email: string;
  mobile: string;
  password: string;
  status: string;
  branchIds: Set<number>;
  defaultBranchId: number | null;
  moduleIds: Set<number>;
  roleIds: Set<number>;
  biometricRequired: boolean;
}

@Component({
  selector: 'app-manage-users',
  imports: [CommonModule, FormsModule, ToastModule],
  providers: [MessageService],
  templateUrl: './manage-users.component.html',
  styleUrl: './manage-users.component.scss'
})
export class ManageUsersComponent implements OnInit, OnDestroy {
  private readonly accessControl = inject(AccessControlService);
  private readonly messageService = inject(MessageService);
  private readonly biometricSvc   = inject(BiometricAuthService);

  loading  = signal(false);
  saving   = signal(false);
  error    = signal('');
  search   = signal('');
  isSuperAdmin = signal(false);
  modalOpen    = signal(false);
  showPassword = signal(false);

  users    = signal<UserResponse[]>([]);
  branches = signal<BranchResponse[]>([]);
  modules  = signal<ModuleResponse[]>([]);
  roles    = signal<RoleResponse[]>([]);
  form     = signal<UserFormState>(this.emptyForm());

  // ── Post-save confirmation ────────────────────────────────────
  confirmOpen    = signal(false);
  confirmedUser  = signal<{ id: number; username: string; fullName: string } | null>(null);
  confirmedPass  = signal('');

  // ── Biometric enrollment (standalone modal) ───────────────────
  bioModalOpen    = signal(false);
  bioEnrolling    = signal(false);
  bioMessage      = signal('');
  bioSuccess      = signal(false);
  bioAvailable    = signal(false);
  bioUserId       = signal<number | null>(null);
  bioUsername     = signal('');
  bioDisplayName  = signal('');

  // ── In-form fingerprint capture (new user only) ───────────────
  scanPidXml    = signal<string | null>(null);
  scanCapturing = signal(false);
  scanDone      = signal(false);
  scanError     = signal('');

  // ── System-suggested context (read-only) ─────────────────────
  companyInfo = signal<{ id: string; code: string; name: string }>({ id: '', code: '', name: '' });

  // ── Username uniqueness ───────────────────────────────────────
  usernameChecking = signal(false);
  usernameTaken    = signal(false);

  private _usernameWasManuallyEdited = false;
  private _lastSuggestedUsername     = '';
  private _usernameDebounce: ReturnType<typeof setTimeout> | null = null;

  // ── Computed ─────────────────────────────────────────────────
  activeUsers   = computed(() => this.users().filter(u => u.status === 'active').length);
  blockedUsers  = computed(() => this.users().filter(u => u.status === 'blocked').length);

  selectedBranches = computed(() => {
    const sel = this.form().branchIds;
    return this.branches().filter(b => sel.has(b.id));
  });

  assignableModules = computed(() => this.modules().filter(m => m.status === 'active'));
  activeRoles = computed(() => this.roles().filter(r => r.status === 'active'));

  /** This form treats role as single-select in the UI (matches how it's already used everywhere
   *  else — auto-assign, `user.roles[0]`) even though the data model allows more than one. */
  selectedRoleId = computed((): number | null => {
    const [first] = this.form().roleIds;
    return first ?? null;
  });

  filteredUsers = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.users();
    return this.users().filter(u =>
      u.fullName.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      (u.email ?? '').toLowerCase().includes(term)
    );
  });

  /** First non-admin company role; used when auto-assigning on new user */
  private defaultRoleId = computed((): number | null => {
    const priority = ['user', 'custom', 'branch_admin'];
    for (const t of priority) {
      const r = this.roles().find(x => x.status === 'active' && x.roleType === t);
      if (r) return r.id;
    }
    return this.roles().find(x => x.status === 'active')?.id ?? null;
  });

  hasBiometric(userId: number): boolean {
    return this.biometricSvc.hasCredential(userId);
  }

  isBiometricRequired(userId: number): boolean {
    return this.biometricSvc.isRequired(userId);
  }

  async ngOnInit(): Promise<void> {
    this.isSuperAdmin.set(this.readIsSuperAdmin());
    this.bioAvailable.set(await this.biometricSvc.isPlatformAuthenticatorAvailable());
    await this.loadLookups();
  }

  ngOnDestroy(): void {
    if (this._usernameDebounce) clearTimeout(this._usernameDebounce);
  }

  // ── Data loading ──────────────────────────────────────────────
  async loadLookups(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [users, branches, modules, roles] = await Promise.all([
        firstValueFrom(this.accessControl.getUsers().pipe(timeout(12000))),
        firstValueFrom(this.accessControl.getBranches().pipe(timeout(12000))),
        firstValueFrom(this.accessControl.getAssignableModules().pipe(timeout(12000))),
        firstValueFrom(this.accessControl.getRoles().pipe(timeout(12000)))
      ]);
      this.users.set(users.data ?? []);
      this.branches.set((branches.data ?? []).filter(b => b.status === 'active'));
      this.modules.set(modules.data ?? []);
      this.roles.set(roles.data ?? []);
    } catch (err: unknown) {
      const msg = this.readError(err, 'Unable to load data.');
      this.error.set(msg);
      this.showToast('error', 'Load failed', msg);
    } finally {
      this.loading.set(false);
    }
  }

  // ── Modal control ─────────────────────────────────────────────
  newUser(): void {
    this.clearUsernameState();
    this.resetForm();
    this.resetScan();
    const defRole = this.defaultRoleId();
    this.form.update(f => ({
      ...f,
      password: this.generatePassword(),
      roleIds: defRole ? new Set([defRole]) : new Set<number>()
    }));
    this.showPassword.set(true);
    this.error.set('');
    this.loadCompanyInfo();
    this.preselectCurrentBranch();
    this.modalOpen.set(true);
  }

  editUser(user: UserResponse): void {
    this.clearUsernameState();
    this._usernameWasManuallyEdited = true;
    this.resetScan();
    this.loadCompanyInfo();
    const branchIds   = new Set(user.branches.map(b => b.id));
    const defBranch   = user.branches.find(b => b.isDefault) ?? user.branches[0];
    this.form.set({
      id: user.id,
      fullName:        user.fullName,
      username:        user.username,
      email:           user.email ?? '',
      mobile:          user.mobile ?? '',
      password:        '',
      status:          user.status,
      branchIds,
      defaultBranchId: defBranch?.id ?? null,
      moduleIds:          new Set((user.modules ?? []).map(m => m.id)),
      roleIds:            new Set(user.roles.map(r => r.id)),
      biometricRequired:  this.biometricSvc.isRequired(user.id)
    });
    this.showPassword.set(false);
    this.error.set('');
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.clearUsernameState();
    this.modalOpen.set(false);
    this.resetForm();
    this.resetScan();
  }

  // ── Field change handlers (with auto-suggest) ─────────────────
  onFullNameChange(value: string): void {
    this.updateForm('fullName', value);
    if (!this._usernameWasManuallyEdited && !this.form().id) {
      const suggested = this.suggestUsername(value, this.form().email);
      if (suggested) {
        this._lastSuggestedUsername = suggested;
        this.form.update(f => ({ ...f, username: suggested }));
        this.scheduleUsernameCheck(suggested);
      }
    }
  }

  onEmailChange(value: string): void {
    this.updateForm('email', value);
    if (!this._usernameWasManuallyEdited && !this.form().id) {
      const suggested = this.suggestUsername(this.form().fullName, value);
      if (suggested) {
        this._lastSuggestedUsername = suggested;
        this.form.update(f => ({ ...f, username: suggested }));
        this.scheduleUsernameCheck(suggested);
      }
    }
  }

  onUsernameChange(value: string): void {
    this.updateForm('username', value);
    if (value !== this._lastSuggestedUsername) {
      this._usernameWasManuallyEdited = true;
    }
    this.scheduleUsernameCheck(value);
  }

  // ── Private helpers ───────────────────────────────────────────
  private loadCompanyInfo(): void {
    try {
      const c = JSON.parse(sessionStorage.getItem('authCompany') || '{}');
      this.companyInfo.set({
        id:   String(c.id   ?? sessionStorage.getItem('companyId')   ?? ''),
        code: String(c.companyCode ?? sessionStorage.getItem('companyCode') ?? ''),
        name: String(c.companyName ?? '')
      });
    } catch {
      this.companyInfo.set({
        id:   sessionStorage.getItem('companyId')   ?? '',
        code: sessionStorage.getItem('companyCode') ?? '',
        name: ''
      });
    }
  }

  private preselectCurrentBranch(): void {
    const currentBranchId = Number(sessionStorage.getItem('branchId') ?? 0);
    if (!currentBranchId) return;
    const found = this.branches().find(b => b.id === currentBranchId);
    if (!found) return;
    this.form.update(f => ({
      ...f,
      branchIds: new Set([currentBranchId]),
      defaultBranchId: currentBranchId
    }));
  }

  private scheduleUsernameCheck(username: string): void {
    this.usernameTaken.set(false);
    if (this._usernameDebounce) clearTimeout(this._usernameDebounce);
    if (!username.trim()) { this.usernameChecking.set(false); return; }
    this.usernameChecking.set(true);
    this._usernameDebounce = setTimeout(() => {
      this.usernameChecking.set(false);
      const lower     = username.trim().toLowerCase();
      const currentId = this.form().id;
      this.usernameTaken.set(
        this.users().some(u => u.username.toLowerCase() === lower && u.id !== currentId)
      );
    }, 400);
  }

  private suggestUsername(fullName: string, email: string): string {
    const emailTrimmed = email.trim();
    if (emailTrimmed.includes('@')) {
      const prefix = emailTrimmed.split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9._]/g, '')
        .replace(/^[._]+|[._]+$/g, '');
      if (prefix.length >= 2) return prefix;
    }
    const parts = fullName.trim().toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return `${parts[0]}.${parts[parts.length - 1]}`;
  }

  private clearUsernameState(): void {
    this._usernameWasManuallyEdited = false;
    this._lastSuggestedUsername     = '';
    this.usernameChecking.set(false);
    this.usernameTaken.set(false);
    if (this._usernameDebounce) { clearTimeout(this._usernameDebounce); this._usernameDebounce = null; }
  }

  closeConfirm(): void {
    this.confirmOpen.set(false);
    this.confirmedUser.set(null);
    this.confirmedPass.set('');
  }

  resetForm(): void {
    this.form.set(this.emptyForm());
    this.showPassword.set(false);
    this.error.set('');
  }

  private resetScan(): void {
    this.scanPidXml.set(null);
    this.scanCapturing.set(false);
    this.scanDone.set(false);
    this.scanError.set('');
  }

  async captureForNewUser(): Promise<void> {
    this.scanCapturing.set(true);
    this.scanError.set('');
    const { pidXml, error } = await this.biometricSvc.capturePidXml();
    this.scanCapturing.set(false);
    if (pidXml) {
      this.scanPidXml.set(pidXml);
      this.scanDone.set(true);
      this.scanError.set('');
    } else {
      this.scanPidXml.set(null);
      this.scanDone.set(false);
      this.scanError.set(error);
    }
  }

  regeneratePassword(): void {
    this.form.update(f => ({ ...f, password: this.generatePassword() }));
    this.showPassword.set(true);
  }

  // ── Form field toggles ────────────────────────────────────────
  toggleBranch(branchId: number, checked: boolean): void {
    this.form.update(cur => {
      const ids = new Set(cur.branchIds);
      checked ? ids.add(branchId) : ids.delete(branchId);
      let def = cur.defaultBranchId;
      if (checked && !def) def = branchId;
      if (!checked && def === branchId) def = ids.values().next().value ?? null;
      return { ...cur, branchIds: ids, defaultBranchId: def };
    });
  }

  toggleModule(moduleId: number, checked: boolean): void {
    this.form.update(cur => {
      const ids = new Set(cur.moduleIds);
      checked ? ids.add(moduleId) : ids.delete(moduleId);
      return { ...cur, moduleIds: ids };
    });
  }

  setDefaultBranch(branchId: number | null): void {
    this.form.update(cur => ({ ...cur, defaultBranchId: branchId }));
  }

  setRole(roleId: number | null): void {
    this.form.update(cur => ({ ...cur, roleIds: roleId ? new Set([roleId]) : new Set<number>() }));
  }

  updateForm<K extends keyof Omit<UserFormState, 'branchIds' | 'moduleIds' | 'roleIds'>>(
    field: K, value: UserFormState[K]
  ): void {
    this.form.update(cur => ({ ...cur, [field]: value }));
  }

  // ── Save ──────────────────────────────────────────────────────
  async saveUser(): Promise<void> {
    const cur        = this.form();
    const branchIds  = Array.from(cur.branchIds);
    const moduleIds  = Array.from(cur.moduleIds);
    this.error.set('');

    if (!cur.fullName.trim() || !cur.username.trim() || !cur.email.trim()) {
      this.error.set('Full name, username and email are required.'); return;
    }
    if (this.usernameTaken()) {
      this.error.set('This User ID is already taken. Please choose a different one.'); return;
    }
    if (branchIds.length === 0) { this.error.set('Select at least one branch.'); return; }
    if (moduleIds.length === 0) { this.error.set('Select at least one module.'); return; }
    if (!cur.id && !cur.password.trim()) { this.error.set('A temporary password is required for new users.'); return; }
    if (cur.password.trim() && cur.password.trim().length < 8) {
      this.error.set('Password must be at least 8 characters.'); return;
    }

    // Use whatever the admin picked in the Role dropdown; fall back to the default
    // only if it's somehow empty (the dropdown pre-fills it, so this is defensive).
    let roleIds = Array.from(cur.roleIds);
    if (roleIds.length === 0) {
      const defRole = this.defaultRoleId();
      if (defRole === null) {
        this.error.set('No role available to assign. Please create at least one role first, under Roles & Permissions.'); return;
      }
      roleIds = [defRole];
    }

    const request: UserUpsertRequest = {
      fullName:        cur.fullName.trim(),
      username:        cur.username.trim(),
      email:           this.optional(cur.email),
      mobile:          this.optional(cur.mobile),
      branchIds,
      defaultBranchId: cur.defaultBranchId && branchIds.includes(cur.defaultBranchId)
        ? cur.defaultBranchId
        : branchIds[0],
      moduleIds,
      roleIds,
      password:        this.optional(cur.password),
      status:          cur.status
    };

    this.saving.set(true);
    try {
      const result = cur.id
        ? await firstValueFrom(this.accessControl.updateUser(cur.id, request).pipe(timeout(12000)))
        : await firstValueFrom(this.accessControl.createUser(request).pipe(timeout(12000)));

      const savedUser = result.data;
      const pendingScanXml = this.scanPidXml(); // capture before closeModal clears it
      this.closeModal();
      await this.loadLookups();

      if (!cur.id && savedUser) {
        // Persist biometric-required flag
        this.biometricSvc.setRequired(savedUser.id, cur.biometricRequired);

        // Auto-enroll fingerprint that was captured during form entry
        if (pendingScanXml) {
          const enrollResult = await this.biometricSvc.enrollWithPid(savedUser.id, pendingScanXml);
          if (enrollResult === 'success') {
            this.showToast('success', 'Fingerprint enrolled', `${savedUser.fullName}'s fingerprint enrolled successfully.`);
          } else {
            this.showToast('warn', 'Fingerprint pending', 'User created. Please enroll fingerprint from the user list.');
          }
        }

        this.confirmedUser.set({ id: savedUser.id, username: savedUser.username, fullName: savedUser.fullName });
        this.confirmedPass.set(cur.password);
        this.confirmOpen.set(true);
      } else {
        // Update biometric-required flag on edit too
        if (cur.id) this.biometricSvc.setRequired(cur.id, cur.biometricRequired);
        this.showToast('success', 'User updated', result.message ?? 'Saved successfully.');
      }
    } catch (err: unknown) {
      this.error.set(this.readError(err, 'Unable to save user.'));
      this.showToast('error', 'Save failed', this.error());
    } finally {
      this.saving.set(false);
    }
  }

  async inactivateUser(user: UserResponse): Promise<void> {
    if (!confirm(`Inactivate ${user.fullName}?`)) return;
    this.loading.set(true);
    try {
      await firstValueFrom(this.accessControl.inactivateUser(user.id).pipe(timeout(12000)));
      this.showToast('success', 'User inactivated', `${user.fullName} is now inactive.`);
      await this.loadLookups();
    } catch (err: unknown) {
      this.showToast('error', 'Update failed', this.readError(err, 'Unable to inactivate user.'));
    } finally {
      this.loading.set(false);
    }
  }

  // ── Biometric enrollment ──────────────────────────────────────
  openBiometricEnrollment(userId: number, username: string, fullName: string): void {
    this.bioUserId.set(userId);
    this.bioUsername.set(username);
    this.bioDisplayName.set(fullName);
    this.bioMessage.set('');
    this.bioSuccess.set(false);
    this.bioEnrolling.set(false);
    this.bioModalOpen.set(true);
    this.closeConfirm();
  }

  async enrollBiometric(): Promise<void> {
    const uid  = this.bioUserId();
    const name = this.bioUsername();
    const disp = this.bioDisplayName();
    if (!uid) return;

    this.bioEnrolling.set(true);
    this.bioMessage.set('');
    const result = await this.biometricSvc.registerCredential(uid, name, disp);
    this.bioEnrolling.set(false);

    if (result === 'success') {
      this.bioSuccess.set(true);
      this.bioMessage.set('Fingerprint enrolled successfully! This user can now authenticate with their fingerprint on this device.');
      this.showToast('success', 'Fingerprint enrolled', `${disp}'s fingerprint is registered.`);
    } else if (result === 'cancelled') {
      this.bioMessage.set('Fingerprint scan was cancelled. Click "Enroll Fingerprint" to try again.');
    } else if (result === 'unsupported') {
      this.bioMessage.set('Biometric authentication is not supported on this device or browser.');
    } else {
      this.bioMessage.set('Fingerprint enrollment failed. Please try again.');
    }
  }

  removeBiometric(user: UserResponse): void {
    if (!confirm(`Remove fingerprint for ${user.fullName}?`)) return;
    this.biometricSvc.removeCredential(user.id);
    this.showToast('info', 'Fingerprint removed', `${user.fullName}'s fingerprint has been removed from this device.`);
  }

  closeBioModal(): void {
    this.bioModalOpen.set(false);
    this.bioMessage.set('');
    this.bioSuccess.set(false);
  }

  copyToClipboard(text: string): void {
    navigator.clipboard?.writeText(text).then(() => {
      this.showToast('info', 'Copied', 'Password copied to clipboard.');
    }).catch(() => {
      this.showToast('warn', 'Copy failed', 'Please copy the password manually.');
    });
  }

  // ── Formatters ────────────────────────────────────────────────
  formatUserBranches(user: UserResponse): string {
    return user.branches.map(b => b.branchName).join(', ') || '—';
  }

  formatUserModules(user: UserResponse): string {
    return (user.modules ?? []).map(m => m.moduleName).join(', ') || '—';
  }

  statusClass(status: string): string {
    if (status === 'active')  return 'settings-status settings-status-ok';
    if (status === 'blocked') return 'settings-status settings-status-danger';
    return 'settings-status settings-status-muted';
  }

  userInitial(user: UserResponse): string {
    return (user.fullName || user.username).charAt(0).toUpperCase();
  }

  // ── Private helpers ───────────────────────────────────────────
  private generatePassword(): string {
    const upper  = 'ABCDEFGHJKMNPQRSTUVWXYZ';
    const lower  = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const syms   = '@#$!';
    const all    = upper + lower + digits + syms;
    const rand   = (s: string) => s[Math.floor(Math.random() * s.length)];
    // Guarantee at least one of each category
    let pass = rand(upper) + rand(lower) + rand(digits) + rand(syms);
    for (let i = 0; i < 6; i++) pass += rand(all);
    // Shuffle
    return pass.split('').sort(() => Math.random() - 0.5).join('');
  }

  private emptyForm(): UserFormState {
    return {
      id: null, fullName: '', username: '', email: '', mobile: '',
      password: '', status: 'active',
      branchIds: new Set<number>(), defaultBranchId: null,
      moduleIds: new Set<number>(), roleIds: new Set<number>(),
      biometricRequired: false
    };
  }

  private optional(value: string): string | null {
    const t = value.trim();
    return t ? t : null;
  }

  private readIsSuperAdmin(): boolean {
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

  private readError(err: unknown, fallback: string): string {
    const v = err as { error?: { message?: string }; message?: string };
    return v.error?.message ?? v.message ?? fallback;
  }

  private showToast(severity: string, summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 3500 });
  }
}
