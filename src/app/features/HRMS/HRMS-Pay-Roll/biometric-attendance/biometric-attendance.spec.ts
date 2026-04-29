import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BiometricAttendance } from './biometric-attendance';

describe('BiometricAttendance', () => {
  let component: BiometricAttendance;
  let fixture: ComponentFixture<BiometricAttendance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiometricAttendance],
    }).compileComponents();

    fixture = TestBed.createComponent(BiometricAttendance);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
