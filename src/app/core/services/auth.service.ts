import { Injectable, NgZone } from '@angular/core';
import { HttpClient }         from '@angular/common/http';
import { Router }             from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public  isAuthenticated$: Observable<boolean> = this.isAuthenticatedSubject.asObservable();

  private logoutTimer:  ReturnType<typeof setTimeout> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  /** Fire refresh 2 minutes before the 15-min access token expires */
  private readonly REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000;
  private readonly API = '/api/auth';

  constructor(
    private zone:   NgZone,
    private router: Router,
    private http:   HttpClient
  ) {
    this.resumeTimers();
  }

  // ── Storage helpers ──────────────────────────────────────────────

  /** Access token → sessionStorage (tab-scoped, never persisted) */
  private setAccessToken(token: string): void {
    sessionStorage.setItem('accessToken', token);
  }
  getToken(): string { return sessionStorage.getItem('accessToken') ?? ''; }

  /** Refresh token → localStorage (survives tab close) */
  private setRefreshToken(token: string): void {
    localStorage.setItem('refreshToken', token);
  }
  private getRefreshToken(): string { return localStorage.getItem('refreshToken') ?? ''; }
  private clearRefreshToken(): void { localStorage.removeItem('refreshToken'); }

  // ── JWT helpers ───────────────────────────────────────────────────

  private decodeToken(token: string): Record<string, any> | null {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch { return null; }
  }

  private getMsUntilExpiry(token: string): number {
    const decoded = this.decodeToken(token);
    if (!decoded?.['exp']) return 0;
    return decoded['exp'] * 1000 - Date.now();
  }

  private hasToken(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return this.getMsUntilExpiry(token) > 0;
  }

  // ── Timer management ─────────────────────────────────────────────

  private clearAllTimers(): void {
    if (this.logoutTimer)  { clearTimeout(this.logoutTimer);  this.logoutTimer  = null; }
    if (this.refreshTimer) { clearTimeout(this.refreshTimer); this.refreshTimer = null; }
  }

  private scheduleTimers(accessToken: string): void {
    this.clearAllTimers();

    const msUntilExpiry  = this.getMsUntilExpiry(accessToken);
    const msUntilRefresh = msUntilExpiry - this.REFRESH_BEFORE_EXPIRY_MS;

    if (msUntilExpiry <= 0) { this.logout(); return; }

    this.zone.runOutsideAngular(() => {

      // Refresh 2 min before expiry
      this.refreshTimer = setTimeout(() => {
        this.zone.run(() => this.silentRefresh());
      }, Math.max(0, msUntilRefresh));

      // Hard logout if refresh never fires / fails
      this.logoutTimer = setTimeout(() => {
        this.zone.run(() => {
          this.logout();
          this.router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
        });
      }, msUntilExpiry);
    });
  }

  private resumeTimers(): void {
    const token = this.getToken();
    if (!token || !this.hasToken()) { this.logout(); return; }
    this.scheduleTimers(token);
  }

  // ── Real silent refresh ───────────────────────────────────────────

  private silentRefresh(): void {
    const accessToken  = this.getToken();
    const refreshToken = this.getRefreshToken();

    if (!accessToken || !refreshToken) { this.logout(); return; }

    this.http
      .post<{ accessToken: string; refreshToken: string }>(
        `${this.API}/refresh`,
        { accessToken, refreshToken }
      )
      .subscribe({
        next: ({ accessToken: newAccess, refreshToken: newRefresh }) => {
          this.setAccessToken(newAccess);
          this.setRefreshToken(newRefresh);
          this.scheduleTimers(newAccess);
          console.info('[AuthService] Tokens rotated successfully.');
        },
        error: err => {
          console.warn('[AuthService] Silent refresh failed — logging out.', err);
          this.logout();
          this.router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
        }
      });
  }

  // ── Public API ───────────────────────────────────────────────────

  setSession(
    accessToken:  string,
    refreshToken: string,
    username:     string,
    companyCode:  string,
    branchCode:   string,
    userId:       number,
    branchId:     number,
    ipAddress:    string,
    network = '', city = '', region = '', country = '', timezone = '', org = ''
  ): void {
    const decoded      = this.decodeToken(accessToken);
    const claimUserId  = decoded?.['userId']      ?? userId;
    const claimCompany = decoded?.['companyCode'] ?? companyCode;
    const claimBranch  = decoded?.['branchCode']  ?? branchCode;

    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);          

    sessionStorage.setItem('isLoggedIn',   'true');
    sessionStorage.setItem('username',     username);
    sessionStorage.setItem('companyCode',  claimCompany);
    sessionStorage.setItem('branchCode',   claimBranch);
    sessionStorage.setItem('branchId',     branchId.toString());
    sessionStorage.setItem('userId',       claimUserId.toString());
    sessionStorage.setItem('ipAddress',    ipAddress);
    sessionStorage.setItem('networkInfo',  JSON.stringify({ network, city, region, country, timezone, org, ipAddress }));
    sessionStorage.setItem('loggedInUser', JSON.stringify({ username, companyCode: claimCompany, branchCode: claimBranch, userId: claimUserId, branchId, ipAddress }));

    this.isAuthenticatedSubject.next(true);
    this.scheduleTimers(accessToken);
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      // Best-effort revoke on the server — don't await
      this.http.post(`${this.API}/logout`, { refreshToken }).subscribe();
    }
    this.clearAllTimers();
    this.clearRefreshToken();
    sessionStorage.clear();
    this.isAuthenticatedSubject.next(false);
  }

  // ── Getters (unchanged) ──────────────────────────────────────────
  isAuthenticated(): boolean { return this.hasToken(); }
  getUsername(): string      { return sessionStorage.getItem('username')    ?? ''; }
  getCompanyCode(): string   { return sessionStorage.getItem('companyCode') ?? ''; }
  getBranchCode(): string    { return sessionStorage.getItem('branchCode')  ?? ''; }
  getUserId(): number        { return Number(sessionStorage.getItem('userId') ?? 0); }

  getNetworkInfo() {
    const raw = sessionStorage.getItem('networkInfo');
    return raw ? JSON.parse(raw) : null;
  }
  getLoggedInUser() {
    const raw = sessionStorage.getItem('loggedInUser');
    return raw ? JSON.parse(raw) : null;
  }
}