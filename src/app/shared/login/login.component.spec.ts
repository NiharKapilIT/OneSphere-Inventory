import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { of } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Branch/Warehouse selection: this app keeps separate selectedLogin* and
  // selectedUserid* signals, so both paths must enforce one active location.
  describe('branch/warehouse required-gate', () => {
    const tenantOption = {
      userId: 1, companyId: 10, companyCode: 'C1', companyName: 'Company One',
      username: 'u1', fullName: 'User One',
      branches: [{ id: 5, branchCode: 'BR1', branchName: 'Branch One', isDefault: true }],
      warehouses: [
        { id: 100, warehouseCode: 'WH1', warehouseName: 'Warehouse One', isDefault: false },
        { id: 101, warehouseCode: 'WH2', warehouseName: 'Warehouse Two', isDefault: false }
      ]
    };

    afterEach(() => {
      sessionStorage.clear();
    });

    describe('OTP path (selectedLogin* signals)', () => {
      beforeEach(() => {
        component.loginOtpSent.set(true);
        component.loginOtp.set('123456');
        component.loginRequiresSelection.set(true);
        component.loginTenantOptions.set([tenantOption as any]);
        component.selectedLoginCompanyId.set(10);
        component.selectedLoginBranchId.set(5);
        component.selectedLoginWarehouseId.set(null);
      });

      it('selectedLoginWarehouses reflects the selected tenant option company-wide list', () => {
        expect(component.selectedLoginWarehouses()).toEqual(tenantOption.warehouses as any);
      });

      it('verifyLoginOtp proceeds with only a branch picked', async () => {
        const authService = TestBed.inject(AuthService);
        const verifySpy = vi.spyOn(authService, 'verifyOtp').mockReturnValue(of({ success: true, message: '', data: undefined } as any));

        await component.verifyLoginOtp();

        expect(verifySpy).toHaveBeenCalledWith('', '123456', undefined, 10, 5, null);
      });

      it('verifyLoginOtp blocks submission when neither branch nor warehouse is picked', async () => {
        component.selectedLoginBranchId.set(null);
        const authService = TestBed.inject(AuthService);
        const verifySpy = vi.spyOn(authService, 'verifyOtp').mockReturnValue(of({ success: true, message: '' } as any));

        await component.verifyLoginOtp();

        expect(component.errorMessage()).toBe('Please select a branch or warehouse.');
        expect(verifySpy).not.toHaveBeenCalled();
      });

      it('selectLoginCompany defaults to branch-only when a branch is available', () => {
        component.selectLoginCompany(10);
        expect(component.selectedLoginBranchId()).toBe(5);
        expect(component.selectedLoginWarehouseId()).toBeNull();
      });

      it('selectLoginWarehouse sets warehouse and clears branch', () => {
        component.selectLoginWarehouse(101);
        expect(component.selectedLoginWarehouseId()).toBe(101);
        expect(component.selectedLoginBranchId()).toBeNull();
      });
    });

    // This is the path the plan called out explicitly: onUserIdLogin() had NO
    // pre-submit validation at all before this fix, unlike verifyLoginOtp.
    describe('userid/password path (selectedUserid* signals)', () => {
      beforeEach(() => {
        sessionStorage.setItem('apiURL', 'http://test.local/api');
        component.useridIdentifier.set('user@example.com');
        component.useridPassword.set('Password@123');
        component.useridRequiresSelection.set(true);
        component.useridTenantOptions.set([tenantOption as any]);
        component.selectedUseridCompanyId.set(10);
        component.selectedUseridBranchId.set(5);
        component.selectedUseridWarehouseId.set(null);
      });

      it('selectedUseridWarehouses reflects the selected tenant option company-wide list', () => {
        expect(component.selectedUseridWarehouses()).toEqual(tenantOption.warehouses as any);
      });

      it('onUserIdLogin proceeds with only a branch picked', async () => {
        const authService = TestBed.inject(AuthService);
        const loginSpy = vi.spyOn(authService, 'passwordLogin').mockReturnValue(of({ success: true, message: '', data: undefined } as any));

        await component.onUserIdLogin();

        expect(loginSpy).toHaveBeenCalledWith('user@example.com', 'Password@123', undefined, 10, 5, null);
      });

      it('onUserIdLogin blocks submission when neither branch nor warehouse is picked', async () => {
        component.selectedUseridBranchId.set(null);
        const authService = TestBed.inject(AuthService);
        const loginSpy = vi.spyOn(authService, 'passwordLogin').mockReturnValue(of({ success: true, message: '' } as any));

        await component.onUserIdLogin();

        expect(component.errorMessage()).toBe('Please select a branch or warehouse.');
        expect(loginSpy).not.toHaveBeenCalled();
      });

      it('onUserIdLogin passes warehouseId with branch null once warehouse is picked', async () => {
        component.selectUseridWarehouse(101);
        const authService = TestBed.inject(AuthService);
        const loginSpy = vi.spyOn(authService, 'passwordLogin').mockReturnValue(of({ success: true, message: '', data: undefined } as any));

        await component.onUserIdLogin();

        expect(loginSpy).toHaveBeenCalledWith('user@example.com', 'Password@123', undefined, 10, null, 101);
      });

      it('selectUseridCompany defaults to branch-only when a branch is available', () => {
        component.selectUseridCompany(10);
        expect(component.selectedUseridBranchId()).toBe(5);
        expect(component.selectedUseridWarehouseId()).toBeNull();
      });

      it('selectUseridWarehouse sets warehouse and clears branch', () => {
        component.selectUseridWarehouse(101);
        expect(component.selectedUseridWarehouseId()).toBe(101);
        expect(component.selectedUseridBranchId()).toBeNull();
      });
    });
  });
});


