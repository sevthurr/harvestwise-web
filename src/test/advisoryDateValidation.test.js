import { describe, expect, it } from "vitest";
import { hasValidAdvisoryDatePair } from "../app/global/utils/apiTransforms";

describe("hasValidAdvisoryDatePair", () => {
  it("accepts an ISO date pair with harvest after planting", () => {
    expect(hasValidAdvisoryDatePair("2026-10-01", "2026-12-01")).toBe(true);
  });

  it("rejects reversed or equal dates", () => {
    expect(hasValidAdvisoryDatePair("2026-12-01", "2026-10-01")).toBe(false);
    expect(hasValidAdvisoryDatePair("2026-10-01", "2026-10-01")).toBe(false);
  });

  it("rejects incomplete and non-date values", () => {
    expect(hasValidAdvisoryDatePair("", "2026-12-01")).toBe(false);
    expect(hasValidAdvisoryDatePair("2026-10-01T00:00:00Z", "2026-12-01")).toBe(false);
    expect(hasValidAdvisoryDatePair("2026-13-01", "2027-01-01")).toBe(false);
  });
});
