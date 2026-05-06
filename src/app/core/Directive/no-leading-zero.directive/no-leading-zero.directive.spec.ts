import { ComponentFixture, TestBed } from "@angular/core/testing";

import { NoLeadingZeroDirective } from "./no-leading-zero.directive";

describe("NoLeadingZeroDirective", () => {
  let component: NoLeadingZeroDirective;
  let fixture: ComponentFixture<NoLeadingZeroDirective>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoLeadingZeroDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(NoLeadingZeroDirective);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
