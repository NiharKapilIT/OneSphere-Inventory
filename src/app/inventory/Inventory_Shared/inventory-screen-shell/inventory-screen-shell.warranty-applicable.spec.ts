import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryScreenShell } from './inventory-screen-shell';
import { InventoryScreenConfig } from '../inventory-screen.model';

// Warranty Applicable, the serial-side counterpart of the batch side's
// Expiry Required:
//
//   Batch / Lot Policy Master   -> expiry_required      Product Master -> expiry_applicable
//   Serial Number Policy Master -> warranty_applicable  Product Master -> warranty_applicable
//
// The two flags are independent of one another exactly as expiry_required and
// expiry_applicable are today: the policy master records the category-level
// intent, the product flag records the per-product choice, and picking a
// policy does not overwrite the product's own toggle. These tests pin that
// independence down so a later "helpful" auto-propagation can't land silently.
describe('InventoryScreenShell — Warranty Applicable', () => {
  let fixture: ComponentFixture<InventoryScreenShell>;
  let component: InventoryScreenShell;

  const serialPolicyConfig: InventoryScreenConfig = {
    key: 'serialNumberPolicy',
    title: 'Serial Number Policy Master',
    subtitle: '',
    kind: 'master',
    icon: 'pi pi-qrcode'
  };

  const productMasterConfig: InventoryScreenConfig = {
    key: 'productServiceMaster',
    title: 'Product / Service Master',
    subtitle: '',
    kind: 'master',
    icon: 'pi pi-box'
  };

  const create = async (config: InventoryScreenConfig) => {
    await TestBed.configureTestingModule({
      imports: [InventoryScreenShell],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryScreenShell);
    component = fixture.componentInstance;
    component.config = config;
    fixture.detectChanges();
  };

  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  describe('Serial Number Policy Master', () => {
    beforeEach(async () => { await create(serialPolicyConfig); });

    it('sends warranty_applicable on save', () => {
      component.formValues.set({
        policyName: 'Warranty Serial Tracking',
        policyCode: 'SNP-WAR',
        captureStage: 'Warranty Registration',
        allowDuplicate: 'No',
        warrantyApplicable: 'Yes',
        status: 'Active'
      });

      const payload = (component as any).buildPayload();

      expect(payload.warranty_applicable).toBe(true);
      // the flag it sits beside must not be disturbed
      expect(payload.allow_duplicate).toBe(false);
    });

    it('sends warranty_applicable false when the policy does not carry warranty', () => {
      component.formValues.set({
        policyName: 'Serial No Required',
        captureStage: 'Purchase Inward',
        allowDuplicate: 'No',
        warrantyApplicable: 'No',
        status: 'Active'
      });

      expect((component as any).buildPayload().warranty_applicable).toBe(false);
    });

    it('renders Warranty Applicable in the grid between Allow Duplicate and Status', () => {
      const rows = (component as any).mapToGridRows([{
        policy_code: 'SNP-WAR',
        policy_name: 'Warranty Serial Tracking',
        category_name: 'Electronics',
        serial_format: 'Alphanumeric',
        capture_stage: 'Warranty Registration',
        allow_duplicate: false,
        warranty_applicable: true,
        status: 'active'
      }]);

      expect(rows[0]).toEqual([
        'SNP-WAR', 'Warranty Serial Tracking', 'Electronics', 'Alphanumeric',
        'Warranty Registration', 'No', 'Yes', 'Active'
      ]);
    });
  });

  describe('Product Master — Tracking Policies', () => {
    beforeEach(async () => { await create(productMasterConfig); });

    it('defaults to off', () => {
      expect(component.productWarrantyApplicable()).toBe(false);
    });

    it('toggles independently of the other tracking flags', () => {
      component.setProductWarrantyApplicable(true);

      expect(component.productWarrantyApplicable()).toBe(true);
      expect(component.productExpiryApplicable()).toBe(false);
      expect(component.productQcRequired()).toBe(false);
      expect(component.productBatchApplicable()).toBe(false);
      expect(component.productSerialApplicable()).toBe(false);
    });

    it('is cleared when Tracking Policies is switched off', () => {
      component.setProductTrackingRequired(true);
      component.setProductWarrantyApplicable(true);
      expect(component.productWarrantyApplicable()).toBe(true);

      component.setProductTrackingRequired(false);

      expect(component.productWarrantyApplicable()).toBe(false);
    });

    it('sends warranty_applicable on save', () => {
      component.formValues.set({ productName: 'Drone Motor', status: 'Active' });
      component.setProductWarrantyApplicable(true);

      expect((component as any).buildPayload().warranty_applicable).toBe(true);
    });

    it('picking a Serial Number Policy does not silently switch Warranty on', () => {
      // Serial policy selection turns Serial Applicable on, exactly as picking
      // a Batch policy turns Batch Applicable on — but neither reaches across
      // to the expiry/warranty flag, which stays the user's own choice.
      component.onSerialPolicyChange('Warranty Serial Tracking');

      expect(component.productSerialApplicable()).toBe(true);
      expect(component.productWarrantyApplicable()).toBe(false);
    });
  });
});
