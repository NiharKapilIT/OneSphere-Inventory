import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryWarehouseLocationMasterComponent } from './warehouse-location-master';

// inv_warehouses.branch_id is a FK to global.branches(id). A BranchInvItem
// carries BOTH ids: branch_id (the global one) and id (the inventory-config
// local row id), and they are genuinely different numbers in live data
// (e.g. local id 14 = global branch 66). Warehouse Setup used to write the
// LOCAL id into that column, pointing the FK at whatever unrelated branch
// happened to own that global id.
describe('InventoryWarehouseLocationMasterComponent — branch id space (global, not local)', () => {
  let component: InventoryWarehouseLocationMasterComponent;

  // Mirrors the real shape: local ids 14/5 against global branch ids 66/29.
  const KUKATPALLY = { id: 14, branch_id: 66, company_id: 53, branch_name: 'Kukatpally', branch_code: 'K26001' } as any;
  const HEAD_OFFICE = { id: 5, branch_id: 29, company_id: 53, branch_name: 'Head Office', branch_code: 'HO' } as any;
  // A branch that predates the global link and only has its local id.
  const LEGACY = { id: 77, company_id: 53, branch_name: 'Legacy Branch', branch_code: 'LEG' } as any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryWarehouseLocationMasterComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    // Deliberately no detectChanges(): these are pure id-mapping methods on
    // the component class, and rendering the template would pull in the whole
    // InventoryScreenShell and its lookup HTTP calls for no benefit here.
    const fixture = TestBed.createComponent(InventoryWarehouseLocationMasterComponent);
    component = fixture.componentInstance;
    component.branches.set([KUKATPALLY, HEAD_OFFICE, LEGACY]);
  });

  it('writes the GLOBAL branch id, not the local inv_branch_config id', () => {
    expect((component as any).branchIdForName('Kukatpally')).toBe(66);
    expect((component as any).branchIdForName('Head Office')).toBe(29);
  });

  it('falls back to the local id only when no global branch id exists', () => {
    expect((component as any).branchIdForName('Legacy Branch')).toBe(77);
  });

  it('returns null for an unknown or empty branch name', () => {
    expect((component as any).branchIdForName('Nowhere')).toBeNull();
    expect((component as any).branchIdForName('')).toBeNull();
  });

  it('reads a stored global branch id back to the right branch name', () => {
    expect(component.branchNameForId(66)).toBe('Kukatpally');
    expect(component.branchNameForId(29)).toBe('Head Office');
  });

  it('still resolves a legacy local-id-only branch on the read side', () => {
    expect(component.branchNameForId(77)).toBe('Legacy Branch');
  });

  it('does not resolve a local id that belongs to a different global branch', () => {
    // 14 is Kukatpally's LOCAL id; nothing should be stored under it, and
    // reading it back must not silently claim to be Kukatpally.
    expect(component.branchNameForId(14)).toBe('');
    expect(component.branchNameForId(null)).toBe('');
  });

  it('round-trips: what branchIdForName writes is what branchNameForId reads', () => {
    for (const name of ['Kukatpally', 'Head Office', 'Legacy Branch']) {
      const id = (component as any).branchIdForName(name);
      expect(component.branchNameForId(id)).toBe(name);
    }
  });
});
