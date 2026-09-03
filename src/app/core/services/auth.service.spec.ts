import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.setItem('apiURL', 'https://erp.example/api');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('verifyOtp sends credentials so login stores the multi-tenant refresh cookie', () => {
    service.verifyOtp('sanams1', '123456', undefined, 10, null, 101).subscribe();

    const request = httpMock.expectOne('https://erp.example/api/auth/verify-otp');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({ loginId: 'sanams1', otp: '123456', companyId: 10, warehouseId: 101 });
    request.flush({ success: true, message: '' });
  });

  it('passwordLogin sends credentials so login stores the multi-tenant refresh cookie', () => {
    service.passwordLogin('sanams1', 'secret', undefined, 10, 5, null).subscribe();

    const request = httpMock.expectOne('https://erp.example/api/auth/password-login');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({ loginId: 'sanams1', password: 'secret', companyId: 10, branchId: 5 });
    request.flush({ success: true, message: '' });
  });

  it('refreshToken uses the HttpOnly cookie instead of a JavaScript token body', () => {
    service.refreshToken().subscribe();

    const request = httpMock.expectOne('https://erp.example/api/auth/refresh-token');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({});
    request.flush({ success: true, message: '' });
  });

  it('switchBranch sends credentials so the refresh cookie rotates with the branch', () => {
    service.switchBranch(5, 100).subscribe();

    const request = httpMock.expectOne('https://erp.example/api/auth/switch-branch');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({ branchId: 5, warehouseId: 100 });
    request.flush({ success: true, message: '' });
  });

  it('switchCompany sends credentials so same-company warehouse switches survive reload', () => {
    service.switchCompany(10, null, 101).subscribe();

    const request = httpMock.expectOne('https://erp.example/api/auth/switch-company');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({ companyId: 10, warehouseId: 101 });
    request.flush({ success: true, message: '' });
  });

  it('ensureAuthenticated refreshes a multi-tenant session from the cookie without a stored refresh token', () => {
    const expiredToken = jwt({ exp: Math.floor(Date.now() / 1000) - 60, user_id: 1, company_id: 10 });
    const freshToken = jwt({ exp: Math.floor(Date.now() / 1000) + 3600, user_id: 1, company_id: 10 });
    sessionStorage.setItem('authSessionKind', 'multiTenant');
    sessionStorage.setItem('token', expiredToken);

    service.ensureAuthenticated(true).subscribe(result => {
      expect(result).toBe(true);
      expect(sessionStorage.getItem('branchCode')).toBe('HO');
      expect(sessionStorage.getItem('warehouseId')).toBe('0');
    });

    const request = httpMock.expectOne('https://erp.example/api/auth/refresh-token');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({});
    request.flush({
      success: true,
      message: '',
      data: {
        accessToken: freshToken,
        user: { id: 1, username: 'sanams1', fullName: 'Sanam S', companyId: 10, isSuperAdmin: false },
        company: { id: 10, companyCode: 'SD001', companyName: 'sanam digitals' },
        branches: [{ id: 5, branchCode: 'HO', branchName: 'Head Office', isDefault: true }],
        defaultBranch: { id: 5, branchCode: 'HO', branchName: 'Head Office' },
        warehouse: null,
        roles: [],
        permissions: {},
        menu: []
      }
    });
  });
});

function jwt(payload: Record<string, unknown>): string {
  return [
    btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })),
    btoa(JSON.stringify(payload)),
    'signature'
  ].join('.');
}
