import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Coverage for items 13/14: multi-branch sales with auto stock transfer.
// Item 13's switch defaults off and switch-off must stay byte-for-byte
// identical to pre-existing behaviour -- most tests here exist specifically
// to pin that guarantee down, not just the new on-behaviour.
describe('InventoryScreenShell — Interbranch Sale (items 13/14)', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const config: InventoryScreenConfig = {
    key: 'salesInvoice',
    title: 'Sales Invoice',
    subtitle: '',
    kind: 'transaction',
    icon: 'pi pi-receipt',
    lineColumns: ['Item / SKU', 'Variant', 'Attribute', 'UOM', 'Qty', 'Rate', 'MRP', 'Selling Price', 'Disc %', 'GST', 'Batch No', 'Serial No', 'Expiry Date', 'Warehouse', 'Amount']
  };

  const HYD_MAIN = { id: 101, warehouse_name: 'HYD Main WH', branch_id: 1, is_default: false } as any;
  const HYD_ANNEX = { id: 102, warehouse_name: 'HYD Annex WH', branch_id: 1, is_default: false } as any;
  const BLR_STORE = { id: 201, warehouse_name: 'BLR Store', branch_id: 2, is_default: false } as any;
  const HYD_BRANCH = { id: 1, branch_id: 1, branch_name: 'Hyderabad' } as any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();

    (component as any).loadedWarehouseObjects.set([HYD_MAIN, HYD_ANNEX, BLR_STORE]);
    (component as any).loadedBranchObjects.set([HYD_BRANCH]);
    (component as any).loadedProductObjects.set([
      { id: 14, product_name: 'LED Display 32 inch', product_code: 'LED-32' } as any,
      { id: 15, product_name: 'Serial Laptop', product_code: 'LAP-01', serial_applicable: true } as any
    ]);
  });

  describe('segment scoping (a branch and a warehouse are each independently segment-tagged)', () => {
    // Same branch_id as HYD_MAIN/HYD_ANNEX, but tagged to a different
    // segment -- must never be treated as a same-branch sibling for an
    // Electronics-segment (id 1) Sales Invoice.
    const HYD_ANNEX_HOTEL_SEGMENT = { id: 103, warehouse_name: 'HYD Hotel WH', branch_id: 1, segment_id: 2, is_default: false } as any;

    beforeEach(() => {
      // Stubbed directly rather than driven through selectedSegment()/
      // loadedSegmentObjects() -- the real path fires the shell's
      // segment-change effect (clearConfigForm(), several HTTP lookups),
      // which is unrelated noise for a pure filtering-logic test.
      vi.spyOn(component as any, 'selectedSegmentId').mockReturnValue(1);
      (component as any).loadedWarehouseObjects.set([
        { ...HYD_MAIN, segment_id: 1 }, { ...HYD_ANNEX, segment_id: 1 }, HYD_ANNEX_HOTEL_SEGMENT
      ]);
    });

    it('salesInvoiceBranchOptions() excludes a branch belonging to a different segment', () => {
      (component as any).loadedBranchObjects.set([{ ...HYD_BRANCH, segment_id: 1 }, { id: 2, branch_id: 2, branch_name: 'Bengaluru', segment_id: 2 } as any]);
      const options = (component as any).salesInvoiceBranchOptions();
      expect(options).toEqual(['Hyderabad']);
    });

    it('branchWarehousePool() excludes a same-branch warehouse from a different segment', () => {
      const pool = (component as any).branchWarehousePool(1);
      expect(pool.map((w: any) => w.id).sort()).toEqual([101, 102]);
    });

    it('resolveBranchDefaultWarehouse() never resolves a cross-segment warehouse even if it is the only is_default match', () => {
      (component as any).loadedWarehouseObjects.set([
        { ...HYD_MAIN, segment_id: 1, is_default: false },
        { ...HYD_ANNEX, segment_id: 1, is_default: false },
        { ...HYD_ANNEX_HOTEL_SEGMENT, is_default: true }
      ]);
      const result = (component as any).resolveBranchDefaultWarehouse(1);
      // Ambiguous within the Electronics segment (2 candidates, neither
      // default) -- correctly returns null rather than falling through to
      // the Hotel-segment warehouse's is_default flag.
      expect(result).toBeNull();
    });

    it('planInterbranchAutoTransfers() never sources a transfer from a same-branch, different-segment warehouse', () => {
      component.formValues.set({ interbranchSale: 'Yes', branch: 'Hyderabad', branchId: 1, warehouse: 'HYD Main WH', warehouseId: 101 });
      component.entryLineRows.set([['LED Display 32 inch', '', '', 'Nos', '10', '', '', '', '', '', '', '', '', '', '']]);
      (component as any).availableStockCache.set({ [(component as any).availableStockKey(14, null)]: [
        { warehouse_id: 101, warehouse_name: 'HYD Main WH', available: 2 },
        { warehouse_id: 103, warehouse_name: 'HYD Hotel WH', available: 50 } // plenty of stock, wrong segment
      ] });
      const plan = (component as any).planInterbranchAutoTransfers();
      expect(plan.transfers).toEqual([]);
      expect(plan.uncoveredLines.length).toBe(1);
      expect(plan.uncoveredLines[0]).toContain('no other warehouse');
    });
  });

  describe('switch defaults and field-clearing (byte-for-byte-off guarantee)', () => {
    it('defaults to off for a fresh record', () => {
      expect((component as any).interbranchSaleEnabled()).toBe(false);
    });

    it('switching off clears branch/branchId even if one was previously set', () => {
      component.formValues.set({ interbranchSale: 'Yes', branch: 'Hyderabad', branchId: 1 });
      component.collectFormField('interbranchSale', 'No');
      expect(component.formValues()['branch']).toBe('');
      expect(component.formValues()['branchId']).toBeNull();
      expect((component as any).interbranchSaleEnabled()).toBe(false);
    });

    it('is false on any screen other than salesInvoice even with interbranchSale=Yes', () => {
      component.config = { ...config, key: 'deliveryChallan' };
      component.formValues.set({ interbranchSale: 'Yes' });
      expect((component as any).interbranchSaleEnabled()).toBe(false);
    });
  });

  describe('branch selection auto-fills the fulfillment Warehouse (only when unambiguous, never overwriting)', () => {
    it('auto-fills Warehouse when exactly one warehouse is tagged with the branch', () => {
      (component as any).loadedWarehouseObjects.set([HYD_MAIN, BLR_STORE]); // only one Hyderabad warehouse now
      component.formValues.set({ interbranchSale: 'Yes' });
      component.collectFormField('branch', 'Hyderabad');
      expect(component.formValues()['warehouse']).toBe('HYD Main WH');
      expect(component.formValues()['warehouseId']).toBe(101);
    });

    it('leaves Warehouse blank when the branch has multiple warehouses and none is the company default', () => {
      component.formValues.set({ interbranchSale: 'Yes' });
      component.collectFormField('branch', 'Hyderabad');
      expect(component.formValues()['warehouse']).toBeUndefined();
    });

    it('uses the company-wide default warehouse when it belongs to the selected branch', () => {
      (component as any).loadedWarehouseObjects.set([HYD_MAIN, { ...HYD_ANNEX, is_default: true }, BLR_STORE]);
      component.formValues.set({ interbranchSale: 'Yes' });
      component.collectFormField('branch', 'Hyderabad');
      expect(component.formValues()['warehouse']).toBe('HYD Annex WH');
    });

    it('never overwrites a Warehouse the user already picked', () => {
      component.formValues.set({ interbranchSale: 'Yes', warehouse: 'BLR Store', warehouseId: 201 });
      component.collectFormField('branch', 'Hyderabad');
      expect(component.formValues()['warehouse']).toBe('BLR Store');
      expect(component.formValues()['warehouseId']).toBe(201);
    });
  });

  describe('branch-aware in-stock variant/attribute filter (item 14)', () => {
    const rows = [
      { warehouse_id: 101, warehouse_name: 'HYD Main WH', available: 0 },
      { warehouse_id: 102, warehouse_name: 'HYD Annex WH', available: 20 }
    ];

    it('switch off: stock only at a sibling warehouse is NOT counted as in-stock (unchanged pre-existing behaviour)', () => {
      component.formValues.set({ warehouse: 'HYD Main WH', warehouseId: 101 });
      const result = (component as any).filterAttributeOptionsByWarehouseStock(14, null, ['Red'], 101);
      // no cache entry yet -> kept visible pending fetch, so seed the cache first
      (component as any).availableStockCache.set({ [(component as any).availableStockKey(14, null, 'Red')]: rows });
      const result2 = (component as any).filterAttributeOptionsByWarehouseStock(14, null, ['Red'], 101);
      expect(result2).toEqual([]);
    });

    it('switch on + branch selected: stock at any branch warehouse IS counted as in-stock', () => {
      component.formValues.set({ interbranchSale: 'Yes', branch: 'Hyderabad', branchId: 1, warehouse: 'HYD Main WH', warehouseId: 101 });
      (component as any).availableStockCache.set({ [(component as any).availableStockKey(14, null, 'Red')]: rows });
      const result = (component as any).filterAttributeOptionsByWarehouseStock(14, null, ['Red'], 101);
      expect(result).toEqual(['Red']);
    });
  });

  describe('planInterbranchAutoTransfers()', () => {
    function seedStock(rows: any[]) {
      (component as any).availableStockCache.set({ [(component as any).availableStockKey(14, null)]: rows });
    }

    it('fully covers a shortfall from one sibling warehouse', () => {
      component.formValues.set({ interbranchSale: 'Yes', branch: 'Hyderabad', branchId: 1, warehouse: 'HYD Main WH', warehouseId: 101 });
      component.entryLineRows.set([['LED Display 32 inch', '', '', 'Nos', '10', '', '', '', '', '', '', '', '', '', '']]);
      seedStock([
        { warehouse_id: 101, warehouse_name: 'HYD Main WH', available: 2 },
        { warehouse_id: 102, warehouse_name: 'HYD Annex WH', available: 20 }
      ]);
      const plan = (component as any).planInterbranchAutoTransfers();
      expect(plan.uncoveredLines).toEqual([]);
      expect(plan.transfers.length).toBe(1);
      expect(plan.transfers[0].fromWarehouseId).toBe(102);
      expect(plan.transfers[0].toWarehouseId).toBe(101);
      expect(plan.transfers[0].items[0].qty).toBe(8);
    });

    it('splits a shortfall across two sibling warehouses when the first only partially covers it', () => {
      component.formValues.set({ interbranchSale: 'Yes', branch: 'Hyderabad', branchId: 1, warehouse: 'HYD Main WH', warehouseId: 101 });
      component.entryLineRows.set([['LED Display 32 inch', '', '', 'Nos', '10', '', '', '', '', '', '', '', '', '', '']]);
      (component as any).loadedWarehouseObjects.set([HYD_MAIN, HYD_ANNEX, { id: 103, warehouse_name: 'HYD Third WH', branch_id: 1, is_default: false }, BLR_STORE]);
      seedStock([
        { warehouse_id: 101, warehouse_name: 'HYD Main WH', available: 2 },
        { warehouse_id: 102, warehouse_name: 'HYD Annex WH', available: 3 },
        { warehouse_id: 103, warehouse_name: 'HYD Third WH', available: 5 }
      ]);
      const plan = (component as any).planInterbranchAutoTransfers();
      expect(plan.uncoveredLines).toEqual([]);
      expect(plan.transfers.length).toBe(2);
      const total = plan.transfers.reduce((sum: number, g: any) => sum + g.items[0].qty, 0);
      expect(total).toBe(8);
    });

    it('surfaces a serial-tracked product\'s shortfall as uncovered, never auto-transferred', () => {
      component.formValues.set({ interbranchSale: 'Yes', branch: 'Hyderabad', branchId: 1, warehouse: 'HYD Main WH', warehouseId: 101 });
      component.entryLineRows.set([['Serial Laptop', '', '', 'Nos', '5', '', '', '', '', '', '', '', '', '', '']]);
      (component as any).availableStockCache.set({ [(component as any).availableStockKey(15, null)]: [
        { warehouse_id: 101, warehouse_name: 'HYD Main WH', available: 1 },
        { warehouse_id: 102, warehouse_name: 'HYD Annex WH', available: 10 }
      ] });
      const plan = (component as any).planInterbranchAutoTransfers();
      expect(plan.transfers).toEqual([]);
      expect(plan.uncoveredLines.length).toBe(1);
      expect(plan.uncoveredLines[0]).toContain('serial-tracked');
    });

    it('surfaces a shortfall with zero stock anywhere as uncovered', () => {
      component.formValues.set({ interbranchSale: 'Yes', branch: 'Hyderabad', branchId: 1, warehouse: 'HYD Main WH', warehouseId: 101 });
      component.entryLineRows.set([['LED Display 32 inch', '', '', 'Nos', '10', '', '', '', '', '', '', '', '', '', '']]);
      seedStock([{ warehouse_id: 101, warehouse_name: 'HYD Main WH', available: 2 }]);
      const plan = (component as any).planInterbranchAutoTransfers();
      expect(plan.transfers).toEqual([]);
      expect(plan.uncoveredLines.length).toBe(1);
      expect(plan.uncoveredLines[0]).toContain('no other warehouse');
    });

    it('returns empty when no fulfillment warehouse is resolved', () => {
      component.formValues.set({ interbranchSale: 'Yes', branch: 'Hyderabad', branchId: 1 });
      component.entryLineRows.set([['LED Display 32 inch', '', '', 'Nos', '10', '', '', '', '', '', '', '', '', '', '']]);
      const plan = (component as any).planInterbranchAutoTransfers();
      expect(plan.transfers).toEqual([]);
      expect(plan.uncoveredLines).toEqual([]);
    });
  });

  describe('saveConfigRecord() interbranch save flow', () => {
    beforeEach(() => {
      component.formValues.set({
        interbranchSale: 'Yes', branch: 'Hyderabad', branchId: 1,
        warehouse: 'HYD Main WH', warehouseId: 101,
        customer: 'Acme', channelPartner: 'Direct', status: 'Posted'
      });
      component.entryLineRows.set([['LED Display 32 inch', '', '', 'Nos', '10', '', '', '', '', '', '', '', '', '', '']]);
      (component as any).availableStockCache.set({ [(component as any).availableStockKey(14, null)]: [
        { warehouse_id: 101, warehouse_name: 'HYD Main WH', available: 2 },
        { warehouse_id: 102, warehouse_name: 'HYD Annex WH', available: 20 }
      ] });
      // Item 30: every SI built in this describe block has no SO/DC
      // reference, so it also qualifies as a "Direct SI" and would
      // otherwise show item 30's own 3-way popup first. That popup is
      // orthogonal to interbranch-transfer behaviour (covered in its own
      // spec file) -- stub it to the "Only Invoice" choice (no follow-up)
      // so these tests keep exercising exactly the transfer flow they did
      // before item 30 existed.
      vi.spyOn(component as any, 'confirmDirectSiDcChoice').mockResolvedValue('onlyInvoice');
    });

    it('confirms with a transfer description, then creates the transfer and saves the SI on accept', async () => {
      const confirmSpy = vi.spyOn(component as any, 'confirmAction').mockResolvedValue(true);
      const transferSpy = vi.spyOn((component as any).txService, 'saveStockTransfer')
        .mockReturnValue(of({ success: true, data: { id: 999 } }));
      const executeSpy = vi.spyOn(component as any, 'executeSaveConfigRecord').mockImplementation(() => {});

      component.saveConfigRecord('posted');
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      const dialogArg = confirmSpy.mock.calls[0][0] as any;
      expect(dialogArg.lines.some((l: string) => l.includes('HYD Annex WH') && l.includes('HYD Main WH'))).toBe(true);
      expect(transferSpy).toHaveBeenCalledTimes(1);
      expect(executeSpy).toHaveBeenCalledTimes(1);
    });

    it('does not save the transfer or the SI when the user cancels', async () => {
      vi.spyOn(component as any, 'confirmAction').mockResolvedValue(false);
      const transferSpy = vi.spyOn((component as any).txService, 'saveStockTransfer');
      const executeSpy = vi.spyOn(component as any, 'executeSaveConfigRecord').mockImplementation(() => {});

      component.saveConfigRecord('posted');
      await Promise.resolve(); await Promise.resolve();

      expect(transferSpy).not.toHaveBeenCalled();
      expect(executeSpy).not.toHaveBeenCalled();
    });

    it('blocks the SI save and surfaces an error when transfer creation fails', async () => {
      vi.spyOn(component as any, 'confirmAction').mockResolvedValue(true);
      vi.spyOn((component as any).txService, 'saveStockTransfer')
        .mockReturnValue(throwError(() => ({ error: { message: 'Transfer failed' } })));
      const executeSpy = vi.spyOn(component as any, 'executeSaveConfigRecord').mockImplementation(() => {});

      component.saveConfigRecord('posted');
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

      expect(executeSpy).not.toHaveBeenCalled();
      expect(component.saveError()).toContain('Transfer failed');
    });

    it('switch off: still uses the original plain "Post anyway" confirmation, unaffected by this feature', async () => {
      component.formValues.set({
        interbranchSale: 'No', warehouse: 'HYD Main WH', warehouseId: 101,
        customer: 'Acme', channelPartner: 'Direct', status: 'Posted'
      });
      const confirmSpy = vi.spyOn(component as any, 'confirmAction').mockResolvedValue(true);
      const executeSpy = vi.spyOn(component as any, 'executeSaveConfigRecord').mockImplementation(() => {});

      component.saveConfigRecord('posted');
      await Promise.resolve(); await Promise.resolve();

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      const dialogArg = confirmSpy.mock.calls[0][0] as any;
      expect(dialogArg.title).toBe('Stock may go negative');
      expect(executeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
