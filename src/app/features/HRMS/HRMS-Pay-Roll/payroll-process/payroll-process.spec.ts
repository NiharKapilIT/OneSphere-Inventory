import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayrollProcess } from './payroll-process';

describe('PayrollProcess', () => {
  let component: PayrollProcess;
  let fixture: ComponentFixture<PayrollProcess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollProcess],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollProcess);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
