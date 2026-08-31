import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Required Session-Level Warehouse Selection (Phase 2): unlike Accounts,
  // this app's login screen keeps two INDEPENDENT signal sets â€” selectedLogin*
  // for the OTP path and selectedUserid* for the password/userid path (they
  // are not shared here) â€” so the warehouse gate had to be wired into both
  // separately. Both previously mirrored Branch's gate; the userid path had
  // NO gate at all before this fix.
  describe('warehouse required-gate', () => {
    const tenantOption = {
      userId: 1, companyId: 10, companyCode: 'C1', companyName: 'Company One',
      username: 'u1', fullName: 'User One',
      branches: [{ id: 5, branchCode: 'BR1', branchName: 'Branch One', isDefault: true }],
      warehouses: [
        { id: 100, warehouseCode: 'WH1', warehouseName: 'Warehouse One', isDefault: false },
        { id: 101, warehouseCode: 'WH2', warehouseName: 'Warehouse Two', isDefault: false }
      ]
    };

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

      it('verifyLoginOtp blocks submission with "Please select a warehouse." when none is picked', async () => {
        const authService = TestBed.inject(AuthService);
        const verifySpy = vi.spyOn(authService, 'verifyOtp').mockReturnValue(of({ success: true, message: '' } as any));

        await component.verifyLoginOtp();

        expect(component.errorMessage()).toBe('Please select a warehouse.');
        expect(verifySpy).not.toHaveBeenCalled();
      });

      it('selectLoginCompany defaults the warehouse to the option\'s default (or first) warehouse', () => {
        component.selectLoginCompany(10);
        expect(component.selectedLoginWarehouseId()).toBe(100);
      });

      it('selectLoginWarehouse sets the signal directly', () => {
        component.selectLoginWarehouse(101);
        expect(component.selectedLoginWarehouseId()).toBe(101);
      });
    });

    // This is the path the plan called out explicitly: onUserIdLogin() had NO
    // pre-submit validation at all before this fix, unlike verifyLoginOtp.
    describe('userid/password path (selectedUserid* signals)', () => {
      beforeEach(() => {
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

      it('onUserIdLogin blocks submission with "Please select a warehouse." when none is picked', async () => {
        const authService = TestBed.inject(AuthService);
        const loginSpy = vi.spyOn(authService, 'passwordLogin').mockReturnValue(of({ success: true, message: '' } as any));

        await component.onUserIdLogin();

        expect(component.errorMessage()).toBe('Please select a warehouse.');
        expect(loginSpy).not.toHaveBeenCalled();
      });

      it('onUserIdLogin proceeds and passes the warehouseId through once one is picked', async () => {
        component.selectedUseridWarehouseId.set(101);
        const authService = TestBed.inject(AuthService);
        const loginSpy = vi.spyOn(authService, 'passwordLogin').mockReturnValue(of({ success: true, message: '', data: undefined } as any));

        await component.onUserIdLogin();

        expect(loginSpy).toHaveBeenCalledWith('user@example.com', 'Password@123', undefined, 10, 5, 101);
      });

      it('selectUseridCompany defaults the warehouse to the option\'s default (or first) warehouse', () => {
        component.selectUseridCompany(10);
        expect(component.selectedUseridWarehouseId()).toBe(100);
      });

      it('selectUseridWarehouse sets the signal directly', () => {
        component.selectUseridWarehouse(101);
        expect(component.selectedUseridWarehouseId()).toBe(101);
      });
    });
  });
});


