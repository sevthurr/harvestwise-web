import { describe, it, expect } from "vitest";
import { resolveFactorCondition } from "../app/farmer/utils/factorColors";

describe("Factor condition colors and icons", () => {
  it("resolves favorable condition as green", () => {
    const res = resolveFactorCondition("price_outlook", "favorable", "", "Price is rising");
    expect(res.condition).toBe("favorable");
    expect(res.colorClass).toBe("text-emerald-600");
    expect(res.iconType).toBe("price");
  });

  it("resolves moderate upper middle as yellow", () => {
    const res = resolveFactorCondition("price_outlook", "neutral", "", "Halos pareho sa kasagarang presyo");
    expect(res.condition).toBe("upper_middle");
    expect(res.colorClass).toBe("text-yellow-500");
    expect(res.iconType).toBe("price");
  });

  it("resolves moderate lower middle / caution as orange", () => {
    const res = resolveFactorCondition("weather_risk", "caution", "", "Kinahanglan bantayan");
    expect(res.condition).toBe("lower_middle");
    expect(res.colorClass).toBe("text-orange-500");
    expect(res.iconType).toBe("weather");
  });

  it("resolves unfavorable condition as red", () => {
    const res = resolveFactorCondition("weather_risk", "high", "", "Taas ang risgo sa panahon");
    expect(res.condition).toBe("unfavorable");
    expect(res.colorClass).toBe("text-red-600");
    expect(res.iconType).toBe("weather");
  });

  it("resolves supply arrival low as favorable (green)", () => {
    const res = resolveFactorCondition("arrival_pressure", "low", "", "Ubos ang naabot sa DFTC");
    expect(res.condition).toBe("favorable");
    expect(res.colorClass).toBe("text-emerald-600");
    expect(res.iconType).toBe("supply");
  });

  it("resolves high production as unfavorable (red)", () => {
    const res = resolveFactorCondition("historical_seasonal_production_level", "high", "", "Taas ang miaging produksyon");
    expect(res.condition).toBe("unfavorable");
    expect(res.colorClass).toBe("text-red-600");
    expect(res.iconType).toBe("production");
  });

  it("resolves moderately high production as upper middle (yellow)", () => {
    const res = resolveFactorCondition(
      "historical_seasonal_production_level",
      "upper_middle",
      "",
      "Moderately high historical production"
    );
    expect(res.condition).toBe("upper_middle");
    expect(res.colorClass).toBe("text-yellow-500");
  });
});
