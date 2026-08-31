import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Item 1: a live data anomaly -- an inv_stock_balance row with NEITHER
// warehouse_id NOR branch_id set (a dual-NULL "Unassigned" row, predating
// the Full Warehouse/Branch Independence project) -- was rendered by the
// per-line stock hint as "Warehouse: N", because the label fallback only
// ever checked row.warehouse_name and defaulted straight to the literal
// string 'Warehouse'. It never checked row.branch_name at all, so a
// legitimate branch-only stock row (branch_id set, warehouse_id NULL) was
// ALSO mislabeled "Warehouse" instead of showing its real branch name.
//
// Separately: Delivery Challan's/Sales Invoice's header "From Warehouse /
// Branch" field is a merged picker now, but the hint's own header
// resolution used to only understand a Warehouse selection
// (findWarehouseBySelection()) -- a Branch-resolved header silently fell
// through to the generic "Available (all warehouses)" cross-location
// breakdown instead of the correct "Available here" / "Short by X here"
// comparison against the branch's own stock.
describe('InventoryScreenShell — stock-hint location labeling and branch-aware header resolution (item 1)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const config: InventoryScreenConfig = {
    key: 'deliveryChallan',
    title: 'Delivery Challan',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-truck',
    lineColumns: ['Item / SKU', 'Variant', 'Attribute', 'UOM', 'Dispatch Qty', 'Warehouse', 'Amount']
  };

  const HYD_WH = { id: 4, warehouse_name: 'Hyderabad', status: 'active' } as any;
  const HYD_BRANCH = { id: 1, branch_id: 1, branch_name: 'Hyderabad Branch', status: 'active' } as any;
  const PRODUCT = { id: 12, product_name: 'Dell Computer-I7', product_code: 'DELL-I7' } as any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();

    (component as any).loadedWarehouseObjects.set([HYD_WH]);
    (component as any).loadedBranchObjects.set([HYD_BRANCH]);
    (component as any).loadedProductObjects.set([PRODUCT]);
  });

  describe('stockRowLocationLabel()', () => {
    const label = (row: any) => (component as any).stockRowLocationLabel(row);

    it('labels a warehouse row by its warehouse name', () => {
      expect(label({ warehouse_id: 4, warehouse_name: 'Hyderabad', available: 109 })).toBe('Hyderabad');
    });

    it('labels a branch-only row (warehouse_id NULL) by its branch name, not "Warehouse"', () => {
      expect(label({ warehouse_id: null, branch_id: 1, branch_name: 'Hyderabad Branch', available: 5 })).toBe('Hyderabad Branch');
    });

    it('labels a dual-NULL row (the live "Unassigned" anomaly) as "Unassigned", never "Warehouse"', () => {
      expect(label({ warehouse_id: null, branch_id: null, available: 2 })).toBe('Unassigned');
    });
  });

  describe('"Available (all warehouses)" breakdown (Sales Order style, no header location resolved)', () => {
    it('never shows the literal word "Warehouse" for the dual-NULL row', () => {
      component.formValues.set({}); // no From Warehouse/Branch selected at all
      component.entryLineRows.set([['Dell Computer-I7', '', '', 'Numbers', '5', '', '']]);
      (component as any).availableStockCache.set({
        [(component as any).availableStockKey(12, null)]: [
          { warehouse_id: 4, warehouse_name: 'Hyderabad', available: 109 },
          { warehouse_id: null, branch_id: null, available: 2 }
        ]
      });

      const message = (component as any).salesOutwardStockControlState('Dispatch Qty', ['Dell Computer-I7', '', '', 'Numbers', '5', '', ''], 4)?.message;
      expect(message).toContain('Available (all warehouses): 111');
      expect(message).toContain('Hyderabad: 109');
      expect(message).toContain('Unassigned: 2');
      expect(message).not.toMatch(/[^d]Warehouse:\s*2/); // never the bare mislabel
    });
  });

  describe('branch-resolved header (item 1\'s DC screenshot scenario)', () => {
    it('compares against the branch\'s own stock ("Available here"), not the cross-location breakdown, when the header resolved to a Branch', () => {
      component.formValues.set({ fromWarehouse: 'Hyderabad Branch' });
      component.entryLineRows.set([['Dell Computer-I7', '', '', 'Numbers', '5', '', '']]);
      (component as any).availableStockCache.set({
        [(component as any).availableStockKey(12, null)]: [
          { warehouse_id: 4, warehouse_name: 'Hyderabad', available: 109 },
          { warehouse_id: null, branch_id: 1, branch_name: 'Hyderabad Branch', available: 20 }
        ]
      });

      const state = (component as any).salesOutwardStockControlState('Dispatch Qty', ['Dell Computer-I7', '', '', 'Numbers', '5', '', ''], 4);
      expect(state.message).toBe('Available here: 20 Numbers');
      expect(state.message).not.toContain('all warehouses');
    });

    it('reports a branch-sourced shortfall as "Short by X here", naming the other location correctly', () => {
      component.formValues.set({ fromWarehouse: 'Hyderabad Branch' });
      component.entryLineRows.set([['Dell Computer-I7', '', '', 'Numbers', '25', '', '']]);
      (component as any).availableStockCache.set({
        [(component as any).availableStockKey(12, null)]: [
          { warehouse_id: 4, warehouse_name: 'Hyderabad', available: 109 },
          { warehouse_id: null, branch_id: 1, branch_name: 'Hyderabad Branch', available: 20 }
        ]
      });

      const state = (component as any).salesOutwardStockControlState('Dispatch Qty', ['Dell Computer-I7', '', '', 'Numbers', '25', '', ''], 4);
      expect(state.severity).toBe('warn');
      expect(state.message).toContain('Short by 5');
      expect(state.message).toContain('Hyderabad: 109');
    });

    it('still resolves a Warehouse-selected header exactly as before (no regression)', () => {
      component.formValues.set({ fromWarehouse: 'Hyderabad' });
      component.entryLineRows.set([['Dell Computer-I7', '', '', 'Numbers', '5', '', '']]);
      (component as any).availableStockCache.set({
        [(component as any).availableStockKey(12, null)]: [
          { warehouse_id: 4, warehouse_name: 'Hyderabad', available: 109 }
        ]
      });

      const state = (component as any).salesOutwardStockControlState('Dispatch Qty', ['Dell Computer-I7', '', '', 'Numbers', '5', '', ''], 4);
      expect(state.message).toBe('Available here: 109 Numbers');
    });
  });
});
