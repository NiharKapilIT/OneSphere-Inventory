import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ScheduleTbReport } from "./schedule-tb-report";

describe("ScheduleTbReport", () => {
  let component: ScheduleTbReport;
  let fixture: ComponentFixture<ScheduleTbReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScheduleTbReport],
    }).compileComponents();

    fixture = TestBed.createComponent(ScheduleTbReport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
