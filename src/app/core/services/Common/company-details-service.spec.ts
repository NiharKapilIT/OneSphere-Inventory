import { TestBed } from "@angular/core/testing";
import { DatePipe } from "@angular/common";

import { CompanyDetailsService } from "./company-details-service";

describe("CompanyDetailsService", () => {
  let service: CompanyDetailsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DatePipe],
    });
    service = TestBed.inject(CompanyDetailsService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
