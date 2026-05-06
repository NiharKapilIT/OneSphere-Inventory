import { NoLeadingZero } from "./no-leading-zero";

describe("NoLeadingZero", () => {
  it("should create an instance", () => {
    const directive = new NoLeadingZero();
    expect(directive).toBeTruthy();
  });
});
