import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { InventoryScreenShell } from './inventory-screen-shell';
import { bomMasterConfig, priceListMasterConfig, workCenterMasterConfig } from '../inventory-screen.model';

// "4. should be implement end to end"
//
// BOM Master, Work Center Master and Price List Master used to have no backend
// at all: no table, no procedure, no controller. The frontend kept them in
// localStorage, so a BOM entered on one PC was invisible on every other PC and
// was lost when site data was cleared. Migration 219 gave all three real tables
// (inv_boms + inv_bom_items, inv_work_centers, inv_price_lists) with
// sp_upsert_* / sp_delete_* / sp_get_* procedures behind /inventory/masters
// endpoints, and these screens now save through the API like every other master.
//
// These tests drive the same delegated click handler the templates rely on —
// the buttons carry no (click) of their own — and assert the payload that
// reaches the service, since that is where the shape of a BOM is decided.
describe('InventoryScreenShell — BOM / Work Center / Price List save to the API', () => {
  function createComponent(config: typeof bomMasterConfig) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [
        provideHttpClient(),
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } }
      ]
    });
    const fixture = TestBed.createComponent(InventoryScreenShell);
    const component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
    return { fixture, component, svc: (component as any).inventoryConfigService };
  }

  // A real click: a <button> inside .inventory-form-actions, which is all the
  // handler has to go on (it matches on button text + ancestor class).
  function clickFormButton(component: InventoryScreenShell, label: string, finalAction = false): void {
    const wrapper = document.createElement('div');
    wrapper.className = finalAction ? 'inventory-form-actions inventory-final-actions' : 'inventory-form-actions';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    wrapper.appendChild(button);
    document.body.appendChild(wrapper);
    component.onShellClick({
      target: button,
      preventDefault: () => {},
      stopPropagation: () => {}
    } as unknown as MouseEvent);
    wrapper.remove();
  }

  describe('BOM Master', () => {
    function bomComponent() {
      const created = createComponent(bomMasterConfig);
      // Raw materials are validated against Product Master, which is empty in a
      // unit test; that rule has its own coverage elsewhere.
      vi.spyOn(created.component as any, 'validateBomMasterPayload').mockReturnValue('');
      return created;
    }

    it('saves through the API, not browser storage', () => {
      const { component, svc } = bomComponent();
      const saveBom = vi.spyOn(svc, 'saveBom').mockReturnValue(of({ success: true, message: '', data: { id: 7, bom_code: 'BOM-00001' } }));

      component.formValues.set({
        bomCode: 'BOM-TEST-01',
        finishedProduct: 'Test Assembly',
        version: 'V1',
        rawMaterials: ['Bolt', 'Nut'],
        quantity: '2',
        wastagePercent: '1',
        productionCost: '500',
        status: 'Active'
      });

      clickFormButton(component, 'Add');
      expect(component.pendingRows().length).toBe(1);

      clickFormButton(component, 'Save', true);
      expect(saveBom).toHaveBeenCalledTimes(1);
    });

    it('sends raw materials as rows, not a comma-joined string', () => {
      const { component, svc } = bomComponent();
      const saveBom = vi.spyOn(svc, 'saveBom').mockReturnValue(of({ success: true, message: '', data: { id: 8 } }));

      component.formValues.set({
        bomCode: 'BOM-ROWS',
        finishedProduct: 'Widget',
        rawMaterials: ['Steel', 'Copper'],
        quantity: '3',
        wastagePercent: '2',
        productionCost: '250'
      });
      clickFormButton(component, 'Add');
      clickFormButton(component, 'Save', true);

      const payload = saveBom.mock.calls[0][0] as any;
      expect(payload.bom_code).toBe('BOM-TEST-01'.replace('BOM-TEST-01', 'BOM-ROWS'));
      expect(payload.finished_product_name).toBe('Widget');
      expect(payload.quantity).toBe(3);
      expect(payload.wastage_percent).toBe(2);
      expect(payload.production_cost).toBe(250);
      expect(payload.items).toEqual([
        expect.objectContaining({ product_name: 'Steel' }),
        expect.objectContaining({ product_name: 'Copper' })
      ]);
    });

    it('refuses a BOM with no code instead of calling the API', () => {
      const { component, svc } = bomComponent();
      const saveBom = vi.spyOn(svc, 'saveBom');
      component.formValues.set({ finishedProduct: 'Widget', rawMaterials: ['Steel'] });

      clickFormButton(component, 'Add');

      expect(component.pendingRows().length).toBe(0);
      expect(component.saveError()).toContain('BOM Code');
      expect(saveBom).not.toHaveBeenCalled();
    });

    it('Edit reloads the record and its raw-material rows back into the form', () => {
      const { component } = bomComponent();
      component.savedRecordObjects.set([{
        id: 12,
        bom_code: 'BOM-EDIT',
        finished_product_name: 'Widget',
        bom_version: 'V2',
        quantity: 4,
        wastage_percent: 1.5,
        production_cost: 900,
        status: 'active',
        items: [{ product_name: 'Steel' }, { product_name: 'Copper' }]
      }]);

      component.editRecordByRow(['BOM-EDIT']);

      expect(component.editingId()).toBe(12);
      expect(component.isEditingSavedRecord()).toBe(true);
      expect(component.formValues()['finishedProduct']).toBe('Widget');
      expect(component.formValues()['rawMaterials']).toEqual(['Steel', 'Copper']);
    });

    it('Update sends the record id so the row is replaced, not duplicated', () => {
      const { component, svc } = bomComponent();
      const saveBom = vi.spyOn(svc, 'saveBom').mockReturnValue(of({ success: true, message: '', data: { id: 12 } }));
      component.savedRecordObjects.set([{ id: 12, bom_code: 'BOM-EDIT', finished_product_name: 'Widget', items: [] }]);

      component.editRecordByRow(['BOM-EDIT']);
      component.formValues.update(v => ({ ...v, finishedProduct: 'Widget MkII' }));
      clickFormButton(component, 'Update');

      expect(saveBom).toHaveBeenCalledTimes(1);
      expect(saveBom.mock.calls[0][1]).toBe(12);
      expect((saveBom.mock.calls[0][0] as any).finished_product_name).toBe('Widget MkII');
    });

    it('Delete calls the API for the matched record', async () => {
      const { component, svc } = bomComponent();
      vi.spyOn(component as any, 'confirmAction').mockResolvedValue(true);
      const deleteBom = vi.spyOn(svc, 'deleteBom').mockReturnValue(of({ success: true, message: '' }));
      component.savedRecordObjects.set([{ id: 12, bom_code: 'BOM-GONE', finished_product_name: 'Widget', items: [] }]);

      component.deleteRecordByRow(['BOM-GONE']);
      await Promise.resolve(); await Promise.resolve();

      expect(deleteBom).toHaveBeenCalledWith(12);
    });
  });

  describe('Work Center Master', () => {
    it('saves through the API with its own field names', () => {
      const { component, svc } = createComponent(workCenterMasterConfig);
      const save = vi.spyOn(svc, 'saveWorkCenter').mockReturnValue(of({ success: true, message: '', data: { id: 3 } }));

      component.formValues.set({
        workCenterCode: 'WC-TEST',
        workCenterName: 'Test Line',
        department: 'Manufacturing',
        capacity: '10 Units / Day',
        costPerHour: '900',
        status: 'Active'
      });
      clickFormButton(component, 'Add');
      clickFormButton(component, 'Save', true);

      const payload = save.mock.calls[0][0] as any;
      expect(payload.work_center_code).toBe('WC-TEST');
      expect(payload.work_center_name).toBe('Test Line');
      expect(payload.cost_per_hour).toBe(900);
    });
  });

  describe('Price List Master', () => {
    it('saves through the API', () => {
      const { component, svc } = createComponent(priceListMasterConfig);
      const save = vi.spyOn(svc, 'savePriceList').mockReturnValue(of({ success: true, message: '', data: { id: 5 } }));

      component.formValues.set({
        priceListName: 'Dealer Price List',
        applicableBranch: 'Head Office',
        product: 'LED Display',
        rate: '23000',
        status: 'Active'
      });
      clickFormButton(component, 'Add');
      clickFormButton(component, 'Save', true);

      const payload = save.mock.calls[0][0] as any;
      expect(payload.price_list_name).toBe('Dealer Price List');
      expect(payload.product_name).toBe('LED Display');
      expect(payload.rate).toBe(23000);
    });

    it('refuses a row with no rate', () => {
      const { component, svc } = createComponent(priceListMasterConfig);
      const save = vi.spyOn(svc, 'savePriceList');
      component.formValues.set({ priceListName: 'Dealer Price List', product: 'LED Display' });

      clickFormButton(component, 'Add');

      expect(component.pendingRows().length).toBe(0);
      expect(component.saveError()).toContain('Rate');
      expect(save).not.toHaveBeenCalled();
    });
  });

  it('all three are API-wired, so nothing is left in browser storage', () => {
    for (const config of [bomMasterConfig, workCenterMasterConfig, priceListMasterConfig]) {
      const { component } = createComponent(config);
      expect(component.isApiWired()).toBe(true);
      expect(component.isSaveWired()).toBe(true);
    }
  });
});
