import { TestBed } from '@angular/core/testing';

import { NavigationService } from './navigation.service';
import { CommonService } from '../Common/common.service';

describe('NavigationService', () => {
  let service: NavigationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: CommonService, useValue: {} }]
    });
    service = TestBed.inject(NavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('keeps enabled Manufacturing transaction screens clickable in the shell menu', () => {
    const inventory = service.getModules().find(module => module.id === 'inventory');
    const transactions = inventory?.subModules.find(subModule => subModule.id === 'inventory-transactions');
    const manufacturingIds = [
      'production-planning',
      'material-issue-production',
      'production-entry',
      'production-return'
    ];

    const manufacturingScreens = manufacturingIds.map(id =>
      transactions?.screens.find(screen => screen.id === id)
    );

    expect(manufacturingScreens.every(screen => !!screen && !screen.disabled)).toBe(true);
  });
});
