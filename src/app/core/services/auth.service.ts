import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';

export interface PermissionFlags {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export interface UserModuleAccess {
  id: number;
  moduleCode: string;
  moduleName: string;
  icon?: string | null;
  displayOrder: number;
  status: string;
}

export interface AuthApiResponse {
  success: boolean;
  message: string;
  data?: AuthPayload;
}

export interface OtpIssueResponse {
  success: boolean;
  message: string;
  data?: {
    otp?: string;
    smsSent?: boolean;
    SmsSent?: boolean;
    emailSent?: boolean;
    EmailSent?: boolean;
    deliveryConfirmed?: boolean;
    DeliveryConfirmed?: boolean;
    deliveryAcknowledged?: boolean;
    DeliveryAcknowledged?: boolean;
    acknowledged?: boolean;
    Acknowledged?: boolean;
    otpSent?: boolean;
    OtpSent?: boolean;
    deliveryChannel?: string;
    DeliveryChannel?: string;
  };
}

export interface LoginBranchWarehouse {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  // Populated on the company-wide list (LoginTenantOption.warehouses /
  // AuthPayload.warehouse) — the branch-scoped BranchResponse.Warehouses list
  // this interface also backs doesn't set these (see GetBranchWarehousesBatchAsync).
  isDefault?: boolean;
  status?: string;
}

export interface AuthPayload {
  requiresSelection?: boolean;
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    fullName: string;
    email?: string;
    mobile?: string;
    companyId: number;
    isSuperAdmin: boolean;
    hasPassword?: boolean;
    modules?: UserModuleAccess[];
  };
  company: {
    id: number;
    companyCode: string;
    companyName: string;
  };
  branches: Array<{
    id: number;
    branchCode: string;
    branchName: string;
    isDefault: boolean;
    warehouses?: LoginBranchWarehouse[];
  }>;
  defaultBranch?: {
    id: number;
    branchCode: string;
    branchName: string;
  };
  // Session-level active warehouse — directly parallel to defaultBranch, but
  // company-wide rather than branch-scoped (Warehouse and Branch have no FK
  // link to each other).
  warehouse?: LoginBranchWarehouse | null;
  roles: Array<{
    id: number;
    roleCode: string;
    roleName: string;
    roleType: string;
  }>;
  permissions: Record<string, PermissionFlags>;
  menu: any[];
  tenantOptions?: LoginTenantOption[];
}

export interface LoginTenantOption {
  userId: number;
  companyId: number;
  companyCode: string;
  companyName: string;
  username: string;
  fullName: string;
  email?: string;
  branches: Array<{
    id: number;
    branchCode: string;
    branchName: string;
    isDefault: boolean;
    warehouses?: LoginBranchWarehouse[];
  }>;
  // Company-wide, flat — deliberately NOT the same list as any single branch's
  // `warehouses` above (that's branch-scoped). Every active warehouse the
  // company has, for the login screen's independent Warehouse selector.
  warehouses?: LoginBranchWarehouse[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$: Observable<boolean> = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) { }


  private hasToken(): boolean {
    const token = sessionStorage.getItem('token') || '';
    return !!token && !this.isTokenExpired(token);
  }


  setSession(
    token: string,
    username: string,
    companyCode: string,
    branchCode: string,
    userId: number,
    branchId: number,
    ipAddress: string
  ): void {

    // Store individual values
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('authSessionKind', 'legacy');
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('username', username);
    sessionStorage.setItem('companyCode', companyCode);
    sessionStorage.setItem('branchCode', branchCode);
    sessionStorage.setItem('branchId', branchId.toString());
    sessionStorage.setItem('userId', userId.toString());
    sessionStorage.setItem('ipAddress', ipAddress);

    // Store combined object
    sessionStorage.setItem('loggedInUser', JSON.stringify({
      username,
      companyCode,
      branchCode,
      userId,
      branchId,
      ipAddress
    }));

    this.isAuthenticatedSubject.next(true);
  }

  requestOtp(loginId: string, companyCode?: string): Observable<OtpIssueResponse> {
    const body: Record<string, string> = { loginId };
    if (companyCode?.trim()) body['companyCode'] = companyCode.trim();
    return this.http.post<OtpIssueResponse>(`${this.apiBaseUrl()}/auth/request-otp`, body);
  }

  verifyOtp(loginId: string, otp: string, companyCode?: string, companyId?: number | null, branchId?: number | null, warehouseId?: number | null): Observable<AuthApiResponse> {
    const body: Record<string, string | number> = { loginId, otp };
    if (companyCode?.trim()) body['companyCode'] = companyCode.trim();
    if (companyId) body['companyId'] = companyId;
    if (branchId) body['branchId'] = branchId;
    if (warehouseId) body['warehouseId'] = warehouseId;
    return this.http.post<AuthApiResponse>(`${this.apiBaseUrl()}/auth/verify-otp`, body);
  }

  passwordLogin(loginId: string, password: string, companyCode?: string, companyId?: number | null, branchId?: number | null, warehouseId?: number | null): Observable<AuthApiResponse> {
    const body: Record<string, string | number> = { loginId, password };
    if (companyCode?.trim()) body['companyCode'] = companyCode.trim();
    if (companyId) body['companyId'] = companyId;
    if (branchId) body['branchId'] = branchId;
    if (warehouseId) body['warehouseId'] = warehouseId;
    return this.http.post<AuthApiResponse>(`${this.apiBaseUrl()}/auth/password-login`, body);
  }

  requestRegistrationOtp(identifier: string): Observable<OtpIssueResponse> {
    return this.http.post<OtpIssueResponse>(`${this.apiBaseUrl()}/auth/request-registration-otp`, {
      identifier
    });
  }

  verifyRegistrationOtp(identifier: string, otp: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiBaseUrl()}/auth/verify-registration-otp`, {
      identifier,
      otp
    });
  }

  suggestCompanyCode(name: string): Observable<{ success: boolean; code: string }> {
    return this.http.get<{ success: boolean; code: string }>(
      `${this.apiBaseUrl()}/auth/suggest-company-code?name=${encodeURIComponent(name)}`
    );
  }

  checkCompanyCode(code: string): Observable<{ success: boolean; available: boolean }> {
    return this.http.get<{ success: boolean; available: boolean }>(
      `${this.apiBaseUrl()}/auth/check-company-code?code=${encodeURIComponent(code)}`
    );
  }

  refreshToken(refreshToken: string): Observable<AuthApiResponse> {
    return this.http.post<AuthApiResponse>(`${this.apiBaseUrl()}/auth/refresh-token`, { refreshToken });
  }

  switchBranch(branchId: number, warehouseId?: number | null): Observable<AuthApiResponse> {
    const body: Record<string, number> = { branchId };
    if (warehouseId) body['warehouseId'] = warehouseId;
    return this.http.post<AuthApiResponse>(`${this.apiBaseUrl()}/auth/switch-branch`, body);
  }

  switchCompany(companyId: number, branchId?: number | null, warehouseId?: number | null): Observable<AuthApiResponse> {
    const body: Record<string, number> = { companyId };
    if (branchId) body['branchId'] = branchId;
    if (warehouseId) body['warehouseId'] = warehouseId;
    return this.http.post<AuthApiResponse>(`${this.apiBaseUrl()}/auth/switch-company`, body);
  }

  me(): Observable<AuthApiResponse> {
    return this.http.get<AuthApiResponse>(`${this.apiBaseUrl()}/auth/me`);
  }

  setMyPassword(currentPassword: string | null, newPassword: string): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.apiBaseUrl()}/auth/me/password`, {
      currentPassword,
      newPassword
    });
  }

  setMultiTenantSession(payload: AuthPayload): void {
    const branch = payload.defaultBranch || payload.branches?.[0];
    const username = payload.user?.username || payload.user?.fullName || '';
    const refreshToken = payload.refreshToken || sessionStorage.getItem('refreshToken') || '';

    sessionStorage.setItem('token', payload.accessToken || '');
    sessionStorage.setItem('refreshToken', refreshToken);
    sessionStorage.setItem('authSessionKind', 'multiTenant');
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('username', username);
    sessionStorage.setItem('companyCode', payload.company?.companyCode || '');
    sessionStorage.setItem('companyId', String(payload.company?.id || payload.user?.companyId || 0));
    sessionStorage.setItem('branchCode', branch?.branchCode || '');
    sessionStorage.setItem('branchId', String(branch?.id || 0));
    sessionStorage.setItem('warehouseId', String(payload.warehouse?.id || 0));
    sessionStorage.setItem('warehouseCode', payload.warehouse?.warehouseCode || '');
    sessionStorage.setItem('warehouseName', payload.warehouse?.warehouseName || '');
    sessionStorage.setItem('userId', String(payload.user?.id || 0));
    sessionStorage.setItem('authUser', JSON.stringify(payload.user || {}));
    sessionStorage.setItem('authCompany', JSON.stringify(payload.company || {}));
    sessionStorage.setItem('authBranches', JSON.stringify(payload.branches || []));
    sessionStorage.setItem('authRoles', JSON.stringify(payload.roles || []));
    sessionStorage.setItem('authPermissions', JSON.stringify(payload.permissions || {}));
    sessionStorage.setItem('authMenu', JSON.stringify(payload.menu || []));
    // Preserve existing tenant options when the incoming payload doesn't carry them
    const tenantOptions = payload.tenantOptions?.length
      ? payload.tenantOptions
      : this.parseStorage<LoginTenantOption[]>('authTenantOptions', []);
    sessionStorage.setItem('authTenantOptions', JSON.stringify(tenantOptions));
    this.writeCompanyDetailsFallback(payload, branch);
    sessionStorage.setItem('loggedInUser', JSON.stringify({
      username,
      companyCode: payload.company?.companyCode || '',
      branchCode: branch?.branchCode || '',
      userId: payload.user?.id || 0,
      branchId: branch?.id || 0,
      ipAddress: sessionStorage.getItem('ipAddress') || ''
    }));

    this.isAuthenticatedSubject.next(true);
  }


  logout(): void {
    sessionStorage.clear();
    this.isAuthenticatedSubject.next(false);
  }


  isAuthenticated(): boolean {
    return this.hasToken();
  }

  ensureAuthenticated(requireTenantClaims = false): Observable<boolean> {
    const token = this.getToken();
    if (!token) return of(false);

    if (requireTenantClaims && !this.hasTenantClaims(token)) {
      return of(false);
    }

    if (!this.isTokenExpired(token)) {
      return of(true);
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken || !this.apiBaseUrl()) {
      return of(false);
    }

    return this.refreshToken(refreshToken).pipe(
      tap(response => {
        if (response.data?.accessToken) {
          this.setMultiTenantSession(response.data);
        }
      }),
      map(response => {
        const refreshedToken = response.data?.accessToken || '';
        return !!refreshedToken && (!requireTenantClaims || this.hasTenantClaims(refreshedToken));
      }),
      catchError(() => of(false))
    );
  }



  getToken(): string {
    return sessionStorage.getItem('token') || '';
  }

  hasTenantClaims(token = this.getToken()): boolean {
    const payload = this.decodeJwtPayload(token);
    return !!payload?.['user_id'] && !!payload?.['company_id'];
  }

  isTokenExpired(token = this.getToken(), skewSeconds = 60): boolean {
    const payload = this.decodeJwtPayload(token);
    const expiresAt = Number(payload?.['exp'] || 0);
    if (!expiresAt) return false; // no exp claim → legacy token, trust server-side expiry
    return expiresAt * 1000 <= Date.now() + skewSeconds * 1000;
  }

  getRefreshToken(): string {
    return sessionStorage.getItem('refreshToken') || '';
  }

  getUsername(): string {
    return sessionStorage.getItem('username') || '';
  }

  getCompanyCode(): string {
    return sessionStorage.getItem('companyCode') || '';
  }

  getBranchCode(): string {
    return sessionStorage.getItem('branchCode') || '';
  }

  getUserId(): number {
    return Number(sessionStorage.getItem('userId') || 0);
  }

  getBranchId(): number {
    return Number(sessionStorage.getItem('branchId') || 0);
  }

  getWarehouseId(): number {
    return Number(sessionStorage.getItem('warehouseId') || 0);
  }

  getMenu(): any[] {
    return this.parseStorage<any[]>('authMenu', []);
  }

  getTenantOptions(): LoginTenantOption[] {
    return this.parseStorage<LoginTenantOption[]>('authTenantOptions', []);
  }

  getPermissions(): Record<string, PermissionFlags> {
    return this.parseStorage<Record<string, PermissionFlags>>('authPermissions', {});
  }

  getPermission(screenCode: string): PermissionFlags | null {
    const permissions = this.getPermissions();
    return permissions[screenCode] || permissions[screenCode.toUpperCase()] || null;
  }

  can(screenCode: string, action: keyof PermissionFlags = 'view'): boolean {
    const permission = this.getPermission(screenCode);
    return !!permission?.[action];
  }

  canAccessModule(moduleId: string): boolean {
    const allowed = this.getAllowedModuleIds();
    return !allowed || allowed.has(moduleId.toLowerCase());
  }

  // Get full logged user object

  getLoggedInUser(): {
    username: string;
    companyCode: string;
    branchCode: string;
    userId: number;
    branchId: number;
    ipAddress: string;
  } | null {
    const user = sessionStorage.getItem('loggedInUser');
    return user ? JSON.parse(user) : null;
  }

  private apiBaseUrl(): string {
    return sessionStorage.getItem('apiURL') || '';
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;

      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map(char => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join('')
      );

      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private getAllowedModuleIds(): Set<string> | null {
    const user = this.parseStorage<{ isSuperAdmin?: boolean; modules?: UserModuleAccess[] }>('authUser', {});
    const roles = this.parseStorage<Array<{ roleType?: string }>>('authRoles', []);
    const isCompanyAdmin = user.isSuperAdmin === true ||
      roles.some(role => role.roleType?.toLowerCase() === 'company_admin');
    if (isCompanyAdmin) return null;

    const modules = user.modules ?? [];
    if (modules.length === 0) return null;

    const codeToRouteId: Record<string, string> = {
      INVENTORY: 'inventory',
      SETTINGS: 'settings'
    };

    return new Set(
      modules
        .map(module => codeToRouteId[(module.moduleCode || '').toUpperCase()])
        .filter((value): value is string => !!value)
    );
  }

  private writeCompanyDetailsFallback(payload: AuthPayload, branch?: AuthPayload['defaultBranch']): void {
    sessionStorage.setItem('CompanyDetails', JSON.stringify({
      companyId: payload.company?.id || payload.user?.companyId || 0,
      companyCode: payload.company?.companyCode || '',
      companyName: payload.company?.companyName || '',
      branchId: branch?.id || 0,
      branchCode: branch?.branchCode || '',
      branchName: branch?.branchName || ''
    }));
  }

  private parseStorage<T>(key: string, fallback: T): T {
    try {
      const value = sessionStorage.getItem(key);
      return value ? JSON.parse(value) as T : fallback;
    } catch {
      return fallback;
    }
  }
}
