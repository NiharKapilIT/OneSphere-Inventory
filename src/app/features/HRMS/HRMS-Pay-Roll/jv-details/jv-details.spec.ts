import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JVDetails } from './jv-details';

describe('JVDetails', () => {
  let component: JVDetails;
  let fixture: ComponentFixture<JVDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JVDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(JVDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
