import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SscAgenda } from './ssc-agenda';

describe('SscAgenda', () => {
  let component: SscAgenda;
  let fixture: ComponentFixture<SscAgenda>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SscAgenda],
    }).compileComponents();

    fixture = TestBed.createComponent(SscAgenda);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
