import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { MainLayoutComponent } from './main-layout.component';
import { AuthService } from '../../../core/services/auth.service';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      // MainLayoutComponent -> NavigationService -> CommonService needs these;
      // app.config.ts provides them app-wide but the test module doesn't pull
      // that in, so they must be provided here too (mirrors login.component.spec.ts).
      // provideRouter is needed too — the template's routerLink directives
      // inject ActivatedRoute, which has no default test-module provider.
      providers: [MessageService, DatePipe, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Branch/Warehouse merged-selector gate (Phase 3): Warehouse used to be
  // hard-required alongside Branch (Phase 2's "warehouse switch context").
  // Now the backend silently defaults whichever of Branch/Warehouse is
  // omitted (see ResolveSelectedBranchId/ResolveSelectedWarehouseId on the
  // API), so this gate only needs to confirm at least ONE of the two
  // resolved — not both.
  describe('branch/warehouse required-gate (only one of the two needed)', () => {
    const tenantOption = {
      userId: 1, companyId: 10, companyCode: 'C1', companyName: 'Company One',
      username: 'u1', fullName: 'User One',
      branches: [{ id: 5, branchCode: 'BR1', branchName: 'Branch One', isDefault: true }],
      warehouses: [
        { id: 100, warehouseCode: 'WH1', warehouseName: 'Warehouse One', isDefault: true },
        { id: 101, warehouseCode: 'WH2', warehouseName: 'Warehouse Two', isDefault: false }
      ]
    };

    beforeEach(() => {
      sessionStorage.setItem('companyId', '10');
      sessionStorage.setItem('branchId', '5');
      sessionStorage.setItem('warehouseId', '100');
      component.tenantOptions = [tenantOption as any];
      component.selectedSwitchCompanyId = 10;
      component.selectedSwitchBranchId = 5;
    });

    afterEach(() => {
      sessionStorage.clear();
    });

    it('isContextChanged is true when only the selected warehouse differs from the session one', () => {
      component.selectedSwitchWarehouseId = 101;
      expect(component.isContextChanged).toBe(true);
    });

    it('isContextChanged is false when company/branch/warehouse all match the session', () => {
      component.selectedSwitchWarehouseId = 100;
      expect(component.isContextChanged).toBe(false);
    });

    it('applyTenantSwitch proceeds with only a branch selected — warehouse stays null and is sent as such for the backend to silently default', async () => {
      component.selectedSwitchWarehouseId = null;
      const authService = TestBed.inject(AuthService);
      const switchSpy = vi.spyOn(authService, 'switchBranch').mockReturnValue(of({ success: true, message: '', data: undefined } as any));

      await component.applyTenantSwitch();

      expect(component.switchError).toBe('');
      expect(switchSpy).toHaveBeenCalledWith(5, null);
    });

    it('applyTenantSwitch blocks with "Please select a branch or warehouse." when NEITHER is selected', async () => {
      // Must target a DIFFERENT company than the session's current one —
      // applyTenantSwitch's very first guard silently no-ops (no switchError
      // at all) for "same company, no branch picked", which isn't the case
      // this test means to exercise.
      sessionStorage.setItem('companyId', '999');
      component.selectedSwitchBranchId = null;
      component.selectedSwitchWarehouseId = null;
      const authService = TestBed.inject(AuthService);
      const switchSpy = vi.spyOn(authService, 'switchBranch').mockReturnValue(of({ success: true, message: '' } as any));

      await component.applyTenantSwitch();

      expect(component.switchError).toBe('Please select a branch or warehouse.');
      expect(switchSpy).not.toHaveBeenCalled();
    });

    it('applyTenantSwitch passes the selected warehouseId through to switchBranch', async () => {
      component.selectedSwitchWarehouseId = 101;
      const authService = TestBed.inject(AuthService);
      const switchSpy = vi.spyOn(authService, 'switchBranch').mockReturnValue(of({ success: true, message: '', data: undefined } as any));

      await component.applyTenantSwitch();

      expect(switchSpy).toHaveBeenCalledWith(5, 101);
    });

    it('onSwitchCompanyChange defaults the warehouse to the option\'s default (or first) warehouse', () => {
      component.onSwitchCompanyChange(10);
      expect(component.selectedSwitchWarehouseId).toBe(100);
    });

    it('onSwitchWarehouseChange sets the field directly', () => {
      component.onSwitchWarehouseChange(101);
      expect(component.selectedSwitchWarehouseId).toBe(101);
    });

    // Inventory-only: switchBranchDirectly() is a quick one-click branch
    // switch with no warehouse picker of its own — it must carry the
    // currently active session warehouse forward rather than 400ing outright
    // now that switch-branch is always-required on WarehouseId.
    it('switchBranchDirectly carries the current session warehouse forward', async () => {
      const authService = TestBed.inject(AuthService);
      const switchSpy = vi.spyOn(authService, 'switchBranch').mockReturnValue(of({ success: true, message: '', data: undefined } as any));

      // Must differ from the session branchId (5) -- switchBranchDirectly no-ops
      // when asked to "switch" to the branch that's already active.
      await component.switchBranchDirectly(7);

      expect(switchSpy).toHaveBeenCalledWith(7, 100);
    });
  });

  // Merged Branch/Warehouse single-select control (Phase 3): one ng-select
  // replacing the two separate Branch and Warehouse dropdowns in the topbar
  // switcher, mirroring login.component.ts's merged selector exactly.
  // Picking an entry must set ONLY the matching field and leave the other
  // one exactly as it was — this is the invariant Phase 5 (warehouse-level
  // access control) will build on. Kept byte-identical to the Accounts copy
  // of this spec (these two components are hand-duplicated, not
  // federation-shared).
  describe('merged Branch/Warehouse selector (Phase 3)', () => {
    const tenantOption = {
      userId: 1, companyId: 10, companyCode: 'C1', companyName: 'Company One',
      username: 'u1', fullName: 'User One',
      branches: [{ id: 5, branchCode: 'BR1', branchName: 'Branch One', isDefault: true }],
      warehouses: [
        { id: 100, warehouseCode: 'WH1', warehouseName: 'Warehouse One', isDefault: true },
        { id: 101, warehouseCode: 'WH2', warehouseName: 'Warehouse Two', isDefault: false }
      ]
    };

    beforeEach(() => {
      component.tenantOptions = [tenantOption as any];
      component.selectedSwitchCompanyId = 10;
      component.selectedSwitchBranchId = 5;
      component.selectedSwitchWarehouseId = 100;
    });

    it('lists warehouses first, then branches, each tagged with its type', () => {
      const entries = component.mergedSwitchLocationOptions;
      expect(entries.map(e => e.key)).toEqual(['warehouse:100', 'warehouse:101', 'branch:5']);
      expect(entries.find(e => e.key === 'warehouse:100')?.type).toBe('warehouse');
      expect(entries.find(e => e.key === 'branch:5')?.type).toBe('branch');
    });

    it('defaults the displayed value to the branch when both branch and warehouse are already populated', () => {
      expect(component.selectedSwitchLocationKey).toBe('branch:5');
    });

    it('picking a warehouse entry sets ONLY selectedSwitchWarehouseId, leaving selectedSwitchBranchId untouched', () => {
      component.onSwitchLocationChange('warehouse:101');
      expect(component.selectedSwitchWarehouseId).toBe(101);
      expect(component.selectedSwitchBranchId).toBe(5);
      expect(component.selectedSwitchLocationKey).toBe('warehouse:101');
    });

    it('picking a branch entry sets ONLY selectedSwitchBranchId, leaving selectedSwitchWarehouseId untouched', () => {
      component.selectedSwitchWarehouseId = 101;
      component.onSwitchLocationChange('branch:5');
      expect(component.selectedSwitchBranchId).toBe(5);
      expect(component.selectedSwitchWarehouseId).toBe(101);
      expect(component.selectedSwitchLocationKey).toBe('branch:5');
    });
  });
});
