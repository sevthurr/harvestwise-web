import { describe, expect, it } from "vitest";
import { formatDisplayLabel, formatPersonName } from "../app/global/utils/apiTransforms";

describe("admin display formatting", () => {
  it("normalizes identifier labels while preserving admin acronyms", () => {
    expect(formatDisplayLabel("dftc_daily_wholesale")).toBe("DFTC Daily Wholesale");
    expect(formatDisplayLabel("psa_openstat_api")).toBe("PSA OpenStat API");
  });

  it("formats person names from API values and usernames", () => {
    expect(formatPersonName("kaye.mayugba")).toBe("Kaye Mayugba");
    expect(formatPersonName("  jd santos ")).toBe("Jd Santos");
  });
});
