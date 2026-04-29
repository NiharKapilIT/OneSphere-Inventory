import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayrollApproval } from './payroll-approval';

describe('PayrollApproval', () => {
  let component: PayrollApproval;
  let fixture: ComponentFixture<PayrollApproval>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollApproval],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollApproval);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
