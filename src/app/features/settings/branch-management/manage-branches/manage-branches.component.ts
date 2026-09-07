import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../../../core/services/auth.service';
import { AccessControlService, BranchResponse, BranchUpsertRequest } from '../../../../core/services/Settings/access-control.service';

interface BranchFormState {
  id: number | null;
  branchCode: string;
  branchName: string;
  email: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  isHeadOffice: boolean;
  status: string;
}

@Component({
  selector: 'app-manage-branches',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule],
  providers: [MessageService],
  templateUrl: './manage-branches.component.html',
  styleUrl: './manage-branches.component.scss'
})
export class ManageBranchesComponent implements OnInit, OnDestroy {
  private readonly access = inject(AccessControlService);
  private readonly authService = inject(AuthService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  branches = signal<BranchResponse[]>([]);
  loading = signal(false);
  saving = signal(false);
  search = signal('');
  errorMessage = signal('');
  isAdmin = signal(false);

  form = signal<BranchFormState>(this.emptyForm());
  modalOpen = signal(false);

  // ── Branch code auto-suggest & uniqueness ─────────────────────
  branchCodeChecking = signal(false);
  branchCodeTaken = signal(false);
  // Bare codes across every company, used so a newly generated/edited code never
  // collides with another tenant's — the DB constraint itself is only per-company,
  // but codes should still look distinct company-to-company.
  allBranchCodes = signal<string[]>([]);

  // ── Duplicate branch name (within the same company) ───────────
  branchNameTaken = signal(false);

  private _codeWasManuallyEdited = false;
  private _lastSuggestedCode = '';
  private _codeDebounce: ReturnType<typeof setTimeout> | null = null;

  filteredBranches = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.branches();
    return this.branches().filter(branch =>
      [branch.branchCode, branch.branchName, branch.city, branch.status]
        .some(value => (value ?? '').toLowerCase().includes(term))
    );
  });

  async ngOnInit(): Promise<void> {
    this.isAdmin.set(this.readCurrentUserIsAdmin());
    await this.loadBranches();
    await this.loadAllBranchCodes();
  }

  async loadAllBranchCodes(): Promise<void> {
    try {
      const response = await firstValueFrom(this.access.getAllBranchCodes());
      this.allBranchCodes.set(response.data ?? []);
    } catch {
      // Non-fatal — falls back to checking uniqueness within just this company,
      // same as before this cross-tenant check existed.
    }
  }

  ngOnDestroy(): void {
    if (this._codeDebounce) clearTimeout(this._codeDebounce);
  }

  async loadBranches(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    try {
      const response = await firstValueFrom(this.access.getBranches());
      this.branches.set(response.data ?? []);
      if ((response.data ?? []).length === 0) {
        this.form.update(current => ({ ...current, isHeadOffice: true }));
      }
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Unable to load branches.');
    } finally {
      this.loading.set(false);
    }
  }

  newBranch(): void {
    this.clearBranchCodeState();
    this.resetForm();
    this.openModal();
  }

  openModal(): void {
    this.errorMessage.set('');
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.clearBranchCodeState();
    this.modalOpen.set(false);
    this.resetForm();
  }

  editBranch(branch: BranchResponse): void {
    this.clearBranchCodeState();
    this._codeWasManuallyEdited = true;
    this.form.set({
      id: branch.id,
      branchCode: branch.branchCode,
      branchName: branch.branchName,
      email: branch.email ?? '',
      mobile: branch.mobile ?? '',
      address: branch.address ?? '',
      city: branch.city ?? '',
      state: branch.state ?? '',
      country: branch.country ?? 'India',
      pincode: branch.pincode ?? '',
      isHeadOffice: branch.isHeadOffice,
      status: branch.status || 'active'
    });
    this.openModal();
  }

  resetForm(): void {
    this.form.set(this.emptyForm());
    if (this.branches().length === 0) {
      this.form.update(current => ({ ...current, isHeadOffice: true }));
    }
  }

  updateForm<K extends keyof BranchFormState>(field: K, value: BranchFormState[K]): void {
    this.form.update(current => ({ ...current, [field]: value }));
  }

  // ── Field change handlers (with auto-suggest) ─────────────────
  onBranchNameChange(value: string): void {
    this.updateForm('branchName', value);
    this.branchNameTaken.set(this.isBranchNameTaken(value));
    if (!this._codeWasManuallyEdited && !this.form().id) {
      const suggested = this.suggestBranchCode(value);
      if (suggested) {
        this._lastSuggestedCode = suggested;
        this.form.update(f => ({ ...f, branchCode: suggested }));
        this.scheduleBranchCodeCheck(suggested);
      }
    }
  }

  onBranchCodeChange(value: string): void {
    const upper = value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    this.updateForm('branchCode', upper);
    if (upper !== this._lastSuggestedCode) {
      this._codeWasManuallyEdited = true;
    }
    this.scheduleBranchCodeCheck(upper);
  }

  async saveBranch(): Promise<void> {
    const current = this.form();
    this.errorMessage.set('');
    if (!current.branchName.trim() || !current.branchCode.trim()) {
      this.errorMessage.set('Branch name and branch code are required.');
      return;
    }
    if (this.isBranchNameTaken(current.branchName)) {
      this.errorMessage.set('A branch with this name already exists in this company. Please choose a different name.');
      return;
    }
    if (!current.id && this.branchCodeTaken()) {
      this.errorMessage.set('This Branch Code is already in use. Please choose a different one.');
      return;
    }

    const isNew = !current.id;
    const request: BranchUpsertRequest = {
      branchCode: current.branchCode.trim(),
      branchName: current.branchName.trim(),
      email: this.optional(current.email),
      mobile: this.optional(current.mobile),
      address: this.optional(current.address),
      city: this.optional(current.city),
      state: this.optional(current.state),
      country: this.optional(current.country),
      pincode: this.optional(current.pincode),
      isHeadOffice: current.isHeadOffice,
      status: current.status || 'active'
    };

    this.saving.set(true);
    try {
      if (current.id) {
        await firstValueFrom(this.access.updateBranch(current.id, request));
        this.messages.add({ severity: 'success', summary: 'Branch updated', detail: 'Branch details saved.' });
      } else {
        await firstValueFrom(this.access.createBranch(request));
        this.messages.add({ severity: 'success', summary: 'Branch created', detail: 'You can now add users under this branch.' });
      }
      this.closeModal();
      await this.loadBranches();
      await this.refreshSessionContext();

      if (isNew) {
        const returnUrl = sessionStorage.getItem('inventoryBranchReturnUrl');
        if (returnUrl) {
          sessionStorage.removeItem('inventoryBranchReturnUrl');
          this.router.navigate([returnUrl]);
        }
      }
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Unable to save branch.');
    } finally {
      this.saving.set(false);
    }
  }

  async inactivateBranch(branch: BranchResponse): Promise<void> {
    if (!confirm(`Inactivate ${branch.branchName}?`)) return;
    try {
      await firstValueFrom(this.access.inactivateBranch(branch.id));
      this.messages.add({ severity: 'success', summary: 'Branch inactivated', detail: branch.branchName });
      await this.loadBranches();
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Unable to inactivate branch.');
    }
  }

  private suggestBranchCode(name: string): string {
    const words = name.trim().toUpperCase().split(/\s+/)
      .map(word => word.replace(/[^A-Z0-9]/g, ''))
      .filter(Boolean);
    if (!words.length) return '';

    const initials = words
      .map(word => word[0])
      .join('')
      .padEnd(2, 'X')
      .slice(0, 2);

    const prefix = `${initials}BC`;
    const serial = this.nextCodeSerial(prefix, this.knownBranchCodes());
    return `${prefix}${serial}`;
  }

  // Union of this company's branches (always fresh) and the cross-company code list
  // (may be empty if that load failed) — used for both suggesting and validating codes.
  private knownBranchCodes(): string[] {
    return Array.from(new Set([...this.allBranchCodes(), ...this.branches().map(b => b.branchCode)]));
  }

  private nextCodeSerial(prefix: string, existingCodes: string[]): string {
    const p = prefix.toLowerCase();
    let max = 0;
    for (const code of existingCodes) {
      if (!code.toLowerCase().startsWith(p)) continue;
      const n = parseInt(code.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
    // padStart(4, '0') only guarantees a minimum width; once the max hits 9999
    // the next number naturally overflows to 5+ digits instead of wrapping or colliding.
    return String(max + 1).padStart(4, '0');
  }

  private scheduleBranchCodeCheck(code: string): void {
    this.branchCodeTaken.set(false);
    if (this._codeDebounce) clearTimeout(this._codeDebounce);
    if (!code.trim()) { this.branchCodeChecking.set(false); return; }
    this.branchCodeChecking.set(true);
    this._codeDebounce = setTimeout(() => {
      this.branchCodeChecking.set(false);
      const lower = code.trim().toLowerCase();
      const currentId = this.form().id;
      // Editing a branch without changing its own code shouldn't flag as taken.
      const ownCode = currentId ? this.branches().find(b => b.id === currentId)?.branchCode : null;
      if (ownCode && ownCode.toLowerCase() === lower) {
        this.branchCodeTaken.set(false);
        return;
      }
      this.branchCodeTaken.set(this.knownBranchCodes().some(c => c.toLowerCase() === lower));
    }, 400);
  }

  private clearBranchCodeState(): void {
    this._codeWasManuallyEdited = false;
    this._lastSuggestedCode = '';
    this.branchCodeChecking.set(false);
    this.branchCodeTaken.set(false);
    this.branchNameTaken.set(false);
    if (this._codeDebounce) { clearTimeout(this._codeDebounce); this._codeDebounce = null; }
  }

  private isBranchNameTaken(name: string): boolean {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return false;
    const currentId = this.form().id;
    return this.branches().some(b => b.branchName.trim().toLowerCase() === trimmed && b.id !== currentId);
  }

  private emptyForm(): BranchFormState {
    return {
      id: null,
      branchCode: '',
      branchName: '',
      email: '',
      mobile: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      isHeadOffice: false,
      status: 'active'
    };
  }

  private optional(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
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

  // private async refreshSessionContext(): Promise<void> {
  //   try {

  private async refreshSessionContext(): Promise<void> {
    // Legacy Accounts-login sessions carry a JWT without company_id/active_branch_id
    // claims, which /api/auth/me requires — calling it here 401s, and a repeat 401
    // after the interceptor's silent refresh gets treated as a dead session and logs
    // the user out.
    if (sessionStorage.getItem('authSessionKind') === 'legacy') return;

    try {

      const response = await firstValueFrom(this.authService.me().pipe(timeout(8000)));
      if (response.data) {
        this.authService.setMultiTenantSession(response.data);
      }
    } catch {
      // Branch save succeeded; session can refresh on the next login if this call fails.
    }
  }
}
