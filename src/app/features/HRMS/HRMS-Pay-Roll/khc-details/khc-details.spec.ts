import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KHCDetails } from './khc-details';

describe('KHCDetails', () => {
  let component: KHCDetails;
  let fixture: ComponentFixture<KHCDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KHCDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(KHCDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
