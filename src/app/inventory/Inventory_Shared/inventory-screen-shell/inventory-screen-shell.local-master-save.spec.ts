import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';

import { InventoryScreenShell } from './inventory-screen-shell';
import { bomMasterConfig, priceListMasterConfig, workCenterMasterConfig } from '../inventory-screen.model';

// "BOM MASTER IS NOT SAVING".
//
// BOM Master, Work Center Master and Price List Master have no backend at all —
// there is no inv_bom / work_center / price_list table in the schema, no
// controller and no service method — so they are correctly absent from
// isApiWired() and persist in localStorage instead. The bug was that
// onShellClick(), the single delegated handler behind every button on these
// screens (the templates carry no (click) of their own), returned early on
// !isApiWired() BEFORE reaching its Add / Save / Edit / Delete branches. The
// storage layer underneath was already written and dispatched from
// savePendingBatch(); nothing could ever call it. Every button was inert.
//
// These tests pin the behaviour at the click-handler level — the level the bug
// actually lived at — rather than calling the save methods directly, which
// would have passed the whole time the screen was broken.
describe('InventoryScreenShell — browser-persisted masters actually save', () => {
  function createComponent(config: typeof bomMasterConfig, queryParams: Record<string, string> = {}) {
    const router = { navigate: vi.fn() };
    const activatedRoute = { snapshot: { queryParamMap: convertToParamMap(queryParams) } };

    // Several tests below mount the screen a second time to prove the row was
    // really written to storage rather than just held in a signal — that is a
    // fresh TestBed, so the previous one has to be torn down first.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [
        provideHttpClient(),
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: activatedRoute }
      ]
    });

    const fixture = TestBed.createComponent(InventoryScreenShell);
    const component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
    return { fixture, component, router };
  }

  // Reproduces a real click: a <button> inside .inventory-form-actions, which
  // is exactly what the 22 master templates render and all the handler has to
  // go on (it matches on button text + ancestor class).
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

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('BOM Master', () => {
    // Raw materials are validated against Product Master, which is empty in a
    // unit test, so that specific rule is stubbed out — it is not what broke.
    function bomComponent() {
      const created = createComponent(bomMasterConfig);
      vi.spyOn(created.component as any, 'validateBomMasterPayload').mockReturnValue('');
      return created;
    }

    it('stages a BOM through the Add button and writes it on Save (the reported bug)', () => {
      const { component } = bomComponent();
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

      const saved = component.liveRows().find(row => row[0] === 'BOM-TEST-01');
      expect(saved).toBeTruthy();
      expect(saved![1]).toBe('Test Assembly');
      expect(saved![3]).toBe('Bolt, Nut');
    });

    it('survives a reload — the row is read back out of storage, not just held in memory', () => {
      const { component } = bomComponent();
      component.formValues.set({ bomCode: 'BOM-PERSIST', finishedProduct: 'Widget', rawMaterials: ['Steel'] });
      clickFormButton(component, 'Add');
      clickFormButton(component, 'Save', true);

      const { component: reopened } = bomComponent();
      expect(reopened.liveRows().some(row => row[0] === 'BOM-PERSIST')).toBe(true);
    });

    it('refuses a BOM with no code instead of writing a blank row', () => {
      const { component } = bomComponent();
      component.formValues.set({ finishedProduct: 'Widget', rawMaterials: ['Steel'] });

      clickFormButton(component, 'Add');

      expect(component.pendingRows().length).toBe(0);
      expect(component.saveError()).toContain('BOM Code');
    });

    it('Edit fills the form from the row and switches the button to Update', () => {
      const { component } = bomComponent();
      component.formValues.set({ bomCode: 'BOM-EDIT', finishedProduct: 'Widget', version: 'V1', rawMaterials: ['Steel'] });
      clickFormButton(component, 'Add');
      clickFormButton(component, 'Save', true);
      component.clearConfigForm();

      const row = component.liveRows().find(r => r[0] === 'BOM-EDIT')!;
      component.editRecordByRow(row);

      expect(component.formValues()['bomCode']).toBe('BOM-EDIT');
      expect(component.formValues()['finishedProduct']).toBe('Widget');
      expect(component.formValues()['rawMaterials']).toEqual(['Steel']);
      expect(component.isEditingSavedRecord()).toBe(true);
    });

    it('Update replaces the row in place — including when its own code is changed', () => {
      const { component } = bomComponent();
      component.formValues.set({ bomCode: 'BOM-OLD', finishedProduct: 'Widget', rawMaterials: ['Steel'] });
      clickFormButton(component, 'Add');
      clickFormButton(component, 'Save', true);

      component.editRecordByRow(component.liveRows().find(r => r[0] === 'BOM-OLD')!);
      component.formValues.update(v => ({ ...v, bomCode: 'BOM-NEW', finishedProduct: 'Widget MkII' }));
      clickFormButton(component, 'Update');

      const rows = component.liveRows();
      expect(rows.some(r => r[0] === 'BOM-OLD')).toBe(false);
      expect(rows.find(r => r[0] === 'BOM-NEW')?.[1]).toBe('Widget MkII');
    });

    it('Delete removes the row and it stays gone after a reload', async () => {
      const { component } = bomComponent();
      vi.spyOn(component as any, 'confirmAction').mockResolvedValue(true);
      component.formValues.set({ bomCode: 'BOM-GONE', finishedProduct: 'Widget', rawMaterials: ['Steel'] });
      clickFormButton(component, 'Add');
      clickFormButton(component, 'Save', true);

      component.deleteRecordByRow(component.liveRows().find(r => r[0] === 'BOM-GONE')!);
      await Promise.resolve(); await Promise.resolve();

      expect(component.liveRows().some(r => r[0] === 'BOM-GONE')).toBe(false);
      const { component: reopened } = bomComponent();
      expect(reopened.liveRows().some(r => r[0] === 'BOM-GONE')).toBe(false);
    });

    it('a deleted seeded row does not reappear, but re-creating that code does', async () => {
      const { component } = bomComponent();
      vi.spyOn(component as any, 'confirmAction').mockResolvedValue(true);
      const seeded = bomMasterConfig.rows![0];

      component.deleteRecordByRow(seeded);
      await Promise.resolve(); await Promise.resolve();
      expect(component.liveRows().some(r => r[0] === seeded[0])).toBe(false);

      component.clearConfigForm();
      component.formValues.set({ bomCode: seeded[0], finishedProduct: 'Rebuilt', rawMaterials: ['Steel'] });
      clickFormButton(component, 'Add');
      clickFormButton(component, 'Save', true);

      expect(component.liveRows().find(r => r[0] === seeded[0])?.[1]).toBe('Rebuilt');
    });
  });

  describe('Work Center Master', () => {
    // Its Work Center Code is the LAST field but the FIRST column, so Edit has
    // to map fields to columns by label — a positional read would drop the code
    // into the name box.
    it('saves, then reads back into the right fields on Edit', () => {
      const { component } = createComponent(workCenterMasterConfig);
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

      const row = component.liveRows().find(r => r[0] === 'WC-TEST');
      expect(row).toBeTruthy();
      expect(row![1]).toBe('Test Line');

      component.clearConfigForm();
      component.editRecordByRow(row!);
      expect(component.formValues()['workCenterCode']).toBe('WC-TEST');
      expect(component.formValues()['workCenterName']).toBe('Test Line');
      expect(component.formValues()['costPerHour']).toBe('900');
    });
  });

  describe('Price List Master', () => {
    it('saves a price list row (it had no save path of any kind before)', () => {
      const { component } = createComponent(priceListMasterConfig);
      component.formValues.set({
        priceListName: 'Dealer Price List',
        applicableBranch: 'Head Office',
        product: 'LED Display',
        rate: '23000',
        status: 'Active'
      });

      clickFormButton(component, 'Add');
      clickFormButton(component, 'Save', true);

      const row = component.liveRows().find(r => r[0] === 'Dealer Price List');
      expect(row).toBeTruthy();
      expect(row![2]).toBe('LED Display');
      expect(row![3]).toBe('23000');
    });

    it('refuses a row with no rate', () => {
      const { component } = createComponent(priceListMasterConfig);
      component.formValues.set({ priceListName: 'Dealer Price List', product: 'LED Display' });

      clickFormButton(component, 'Add');

      expect(component.pendingRows().length).toBe(0);
      expect(component.saveError()).toContain('Rate');
    });
  });

  describe('rows are scoped to the company', () => {
    it('a BOM saved under one company is not visible under another', () => {
      sessionStorage.setItem('companyId', '11');
      const { component } = createComponent(bomMasterConfig);
      vi.spyOn(component as any, 'validateBomMasterPayload').mockReturnValue('');
      component.formValues.set({ bomCode: 'BOM-CO11', finishedProduct: 'Widget', rawMaterials: ['Steel'] });
      clickFormButton(component, 'Add');
      clickFormButton(component, 'Save', true);
      expect(component.liveRows().some(r => r[0] === 'BOM-CO11')).toBe(true);

      sessionStorage.setItem('companyId', '22');
      const { component: other } = createComponent(bomMasterConfig);
      expect(other.liveRows().some(r => r[0] === 'BOM-CO11')).toBe(false);
    });
  });
});
