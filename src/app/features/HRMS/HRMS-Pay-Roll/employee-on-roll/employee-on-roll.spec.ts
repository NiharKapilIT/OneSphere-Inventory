import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeOnRoll } from './employee-on-roll';

describe('EmployeeOnRoll', () => {
  let component: EmployeeOnRoll;
  let fixture: ComponentFixture<EmployeeOnRoll>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeOnRoll],
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeOnRoll);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
