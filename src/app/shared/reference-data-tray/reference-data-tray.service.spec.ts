import { TestBed } from '@angular/core/testing';
import { ReferenceDataTrayService } from './reference-data-tray.service';

describe('ReferenceDataTrayService', () => {
  let service: ReferenceDataTrayService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReferenceDataTrayService);
    localStorage.clear();
  });

  it('returns reference data for a dependent inventory screen', () => {
    const config = service.resolveForRoute('/dashboard/inventory/transactions/purchase-order?mode=new');

    expect(config).toBeTruthy();
    expect(config?.title).toContain('Purchase Order Reference');
    expect(config?.sections.length).toBeGreaterThan(0);
  });

  it('does not return a tray config for screens without reference data', () => {
    const config = service.resolveForRoute('/dashboard/inventory/inventory-dashboard/dashboard');

    expect(config).toBeNull();
  });

  it('preserves open and position state per tray config', () => {
    service.saveState('inventory-purchase-order-reference', {
      isOpen: false,
      position: { left: 320, top: 140 }
    });

    expect(service.loadState('inventory-purchase-order-reference')).toEqual({
      isOpen: false,
      position: { left: 320, top: 140 }
    });
  });
});
