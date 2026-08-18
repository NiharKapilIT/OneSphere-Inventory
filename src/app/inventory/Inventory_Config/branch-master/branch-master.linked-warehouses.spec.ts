import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { InventoryBranchMasterComponent } from './branch-master';

// Coverage for item 13's follow-up: Warehouse Setup's own Branch field lets
// any number of warehouses point at the same branch, but until now Branch
// Master (where a business owner actually manages a branch) had no way to
// see that pool -- only the single, opt-in "Default Warehouse" pick. This
// pins down the read-only linkedWarehouses() list that surfaces it.
describe('InventoryBranchMasterComponent — linked warehouses (item 13 follow-up)', () => {
  let fixture: ComponentFixture<InventoryBranchMasterComponent>;
  let component: InventoryBranchMasterComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryBranchMasterComponent],
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryBranchMasterComponent);
    component = fixture.componentInstance;
    (component as any).warehouses.set([
      { id: 101, warehouse_name: 'HYD Main WH', branch_id: 1, is_default: true } as any,
      { id: 102, warehouse_name: 'HYD Annex WH', branch_id: 1, is_default: false } as any,
      { id: 201, warehouse_name: 'BLR Store', branch_id: 2, is_default: false } as any
    ]);
  });

  it('is empty when no branch is selected', () => {
    (component as any).selectedSettingsBranchId.set(null);
    expect(component.linkedWarehouses()).toEqual([]);
  });

  it('lists every warehouse tagged with the selected branch, alphabetically', () => {
    (component as any).selectedSettingsBranchId.set(1);
    const names = component.linkedWarehouses().map(w => w.warehouse_name);
    expect(names).toEqual(['HYD Annex WH', 'HYD Main WH']);
  });

  it('excludes warehouses belonging to a different branch', () => {
    (component as any).selectedSettingsBranchId.set(2);
    const names = component.linkedWarehouses().map(w => w.warehouse_name);
    expect(names).toEqual(['BLR Store']);
  });

  it('is empty for a branch with no linked warehouses at all', () => {
    (component as any).selectedSettingsBranchId.set(999);
    expect(component.linkedWarehouses()).toEqual([]);
  });
});
