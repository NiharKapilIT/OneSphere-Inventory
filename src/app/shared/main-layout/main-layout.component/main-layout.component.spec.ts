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

  describe('flyout accordion state', () => {
    const transactions = {
      id: 'inventory-transactions',
      name: 'Transactions',
      screens: [
        { id: 'goods-receipt', name: 'Goods Receipt Note (GRN)', route: '/dashboard/inventory/transactions/goods-receipt', group: 'Procurement' },
        { id: 'production-entry', name: 'Production Entry', route: '/dashboard/inventory/transactions/production-entry', group: 'Manufacturing' },
        { id: 'stock-transfer', name: 'Stock Transfer', route: '/dashboard/inventory/transactions/stock-transfer', group: 'Inventory' }
      ]
    };

    it('opens the active group and collapses the remaining flyout groups', () => {
      component.selectedSubModule = transactions as any;
      component.selectedScreen = transactions.screens[1] as any;

      (component as any).initializeFlyoutGroups(transactions);

      expect(component.isFlyoutGroupExpanded('Manufacturing')).toBe(true);
      expect(component.isFlyoutGroupExpanded('Procurement')).toBe(false);

      component.toggleFlyoutGroup('Inventory');

      expect(component.isFlyoutGroupExpanded('Inventory')).toBe(true);
      expect(component.isFlyoutGroupExpanded('Manufacturing')).toBe(false);

      (component as any).expandActiveFlyoutGroup(transactions, transactions.screens[1]);

      expect(component.isFlyoutGroupExpanded('Manufacturing')).toBe(true);
      expect(component.isFlyoutGroupExpanded('Inventory')).toBe(false);
    });
  });

  // Branch/Warehouse merged-selector gate: only one active location is
  // required. A warehouse choice is validated as warehouse access and then
  // supplies its linked branch for legacy BranchCode context.
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

    it('isContextChanged is true when explicitly picking a warehouse whose id already equals the branch-context warehouseId', () => {
      sessionStorage.setItem('activeLocationKind', 'branch');
      component.onSwitchLocationChange('warehouse:100');
      expect(component.isContextChanged).toBe(true);
    });

    it('isContextChanged is true when explicitly picking a branch whose id already equals the warehouse-context branchId', () => {
      sessionStorage.setItem('activeLocationKind', 'warehouse');
      component.onSwitchLocationChange('branch:5');
      expect(component.isContextChanged).toBe(true);
    });

    it('isContextChanged is false when re-picking the same warehouse that is already the active warehouse context', () => {
      sessionStorage.setItem('activeLocationKind', 'warehouse');
      component.onSwitchLocationChange('warehouse:100');
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
      component.selectedSwitchBranchId = null;
      component.selectedSwitchWarehouseId = null;
      const authService = TestBed.inject(AuthService);
      const switchSpy = vi.spyOn(authService, 'switchBranch').mockReturnValue(of({ success: true, message: '' } as any));

      await component.applyTenantSwitch();

      expect(component.switchError).toBe('Please select a branch or warehouse.');
      expect(switchSpy).not.toHaveBeenCalled();
    });

    it('applyTenantSwitch omits a stale warehouseId when branch is the active pick', async () => {
      component.selectedSwitchWarehouseId = 101;
      const authService = TestBed.inject(AuthService);
      const switchSpy = vi.spyOn(authService, 'switchBranch').mockReturnValue(of({ success: true, message: '', data: undefined } as any));

      await component.applyTenantSwitch();

      expect(switchSpy).toHaveBeenCalledWith(5, null);
    });

    it('applyTenantSwitch sends same-company warehouse-only picks through switchCompany', async () => {
      component.onSwitchLocationChange('warehouse:101');
      const authService = TestBed.inject(AuthService);
      const switchBranchSpy = vi.spyOn(authService, 'switchBranch').mockReturnValue(of({ success: true, message: '', data: undefined } as any));
      const switchCompanySpy = vi.spyOn(authService, 'switchCompany').mockReturnValue(of({ success: true, message: '', data: undefined } as any));

      await component.applyTenantSwitch();

      expect(switchBranchSpy).not.toHaveBeenCalled();
      expect(switchCompanySpy).toHaveBeenCalledWith(10, null, 101);
    });

    it('onSwitchCompanyChange defaults to branch-only when a branch is available', () => {
      component.onSwitchCompanyChange(10);
      expect(component.selectedSwitchBranchId).toBe(5);
      expect(component.selectedSwitchWarehouseId).toBeNull();
    });

    it('onSwitchWarehouseChange sets the field directly', () => {
      component.onSwitchWarehouseChange(101);
      expect(component.selectedSwitchWarehouseId).toBe(101);
    });

    // Inventory-only: switchBranchDirectly() is a quick one-click branch
    // switch with no warehouse picker of its own — it must carry the
    // currently active session warehouse forward rather than 400ing outright
    // now that switch-branch is always-required on WarehouseId.
    it('switchBranchDirectly switches to branch-only context', async () => {
      const authService = TestBed.inject(AuthService);
      const switchSpy = vi.spyOn(authService, 'switchBranch').mockReturnValue(of({ success: true, message: '', data: undefined } as any));

      // Must differ from the session branchId (5) -- switchBranchDirectly no-ops
      // when asked to "switch" to the branch that's already active.
      await component.switchBranchDirectly(7);

      expect(switchSpy).toHaveBeenCalledWith(7, null);
    });
  });

  // Merged Branch/Warehouse single-select control (Phase 3): one ng-select
  // replacing the two separate Branch and Warehouse dropdowns in the topbar
  // switcher, mirroring login.component.ts's merged selector exactly.
  // Picking an entry must set the matching field and clear the other one so
  // stale branch/warehouse context cannot ride along with the visible choice.
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

    it('keeps the option array stable between reads while the dropdown is open', () => {
      const firstRead = component.mergedSwitchLocationOptions;
      const secondRead = component.mergedSwitchLocationOptions;
      expect(secondRead).toBe(firstRead);
    });

    it('defaults the displayed value to the branch when both branch and warehouse are already populated', () => {
      expect(component.selectedSwitchLocationKey).toBe('branch:5');
    });

    it('picking a warehouse entry sets selectedSwitchWarehouseId and clears selectedSwitchBranchId', () => {
      component.onSwitchLocationChange('warehouse:101');
      expect(component.selectedSwitchWarehouseId).toBe(101);
      expect(component.selectedSwitchBranchId).toBeNull();
      expect(component.selectedSwitchLocationKey).toBe('warehouse:101');
    });

    it('picking a branch entry sets selectedSwitchBranchId and clears selectedSwitchWarehouseId', () => {
      component.selectedSwitchWarehouseId = 101;
      component.onSwitchLocationChange('branch:5');
      expect(component.selectedSwitchBranchId).toBe(5);
      expect(component.selectedSwitchWarehouseId).toBeNull();
      expect(component.selectedSwitchLocationKey).toBe('branch:5');
    });

    it('handles the full ng-select item object emitted from mouse selection', () => {
      component.onSwitchLocationPicked({
        key: 'warehouse:101',
        label: 'Warehouse Two (WH2)',
        type: 'warehouse',
        id: 101
      });

      expect(component.selectedSwitchWarehouseId).toBe(101);
      expect(component.selectedSwitchBranchId).toBeNull();
    });
  });
});
