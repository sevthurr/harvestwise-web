import { describe, it, expect } from "vitest";
import {
  composeAdvisoryReasons,
  resolveMainFactor,
} from "../app/farmer/utils/advisoryReasons";

/**
 * Weights mirror the backend presets in api/src/modules/advisory/weights.py so
 * the fixtures rank factors the same way the advisory engine scored them.
 */
const HARVEST_WEIGHTS = {
  price_outlook: 0.4,
  arrival_pressure: 0.25,
  weather_risk: 0.2,
  profitability: 0.1,
  historical_seasonal_production_level: 0.05,
};

const BEFORE_PLANTING_WEIGHTS = {
  price_outlook: 0.3,
  weather_risk: 0.25,
  arrival_pressure: 0.2,
  historical_seasonal_production_level: 0.15,
  profitability: 0.1,
};

const contrib = (module, label, raw, weights) => ({
  module,
  label,
  raw_score: raw,
  weight: weights[module],
  weighted_score: Number((raw * weights[module]).toFixed(6)),
});

describe("advisoryReasons — ranking is by influence, not position", () => {
  // Regression: the old composer walked a fixed order (weather → profitability
  // → price → arrival → production) and stopped at two, so a Caution-weather +
  // Marginal-profit payload always rendered "Reason 1: Weather / Reason 2:
  // Profitability" even when price and arrivals were the real drivers.
  const moduleResults = {
    price_outlook: "Unfavorable",
    arrival_pressure: "High",
    historical_seasonal_production_level: "High",
    profitability: "Marginal",
    weather_risk: "Caution",
    forecast_midpoint: 18,
    recent_average_price: 24,
    break_even_price: 20,
    lower_forecast_price: 16,
    upper_forecast_price: 20,
    current_arrival_kg: 8400,
  };

  const contributions = [
    contrib("price_outlook", "Unfavorable", 2, HARVEST_WEIGHTS),
    contrib("arrival_pressure", "High", 3, HARVEST_WEIGHTS),
    contrib("historical_seasonal_production_level", "High", 3, HARVEST_WEIGHTS),
    contrib("profitability", "Marginal", 1, HARVEST_WEIGHTS),
    contrib("weather_risk", "Caution", 1, HARVEST_WEIGHTS),
  ];

  const reasons = () =>
    composeAdvisoryReasons({
      moduleResults,
      contributions,
      vetoes: [],
      cropName: "Kamatis",
      horizonDays: 14,
    });

  it("surfaces the strongest-weighted factor first, not the first one checked", () => {
    expect(reasons()[0].module).toBe("price_outlook");
  });

  it("returns a proper reason for all five factors, ranked by weighted score", () => {
    // harvest weights: price 2x0.40=0.80 > arrival 3x0.25=0.75 >
    // weather 1x0.20=0.20 > production 3x0.05=0.15 > profitability 1x0.10=0.10
    expect(reasons().map((r) => r.module)).toEqual([
      "price_outlook",
      "arrival_pressure",
      "weather_risk",
      "historical_seasonal_production_level",
      "profitability",
    ]);
  });

  it("labels every reason with its factor name key", () => {
    const expected = {
      price_outlook: "farmer.advisory.factor_price",
      arrival_pressure: "farmer.advisory.factor_arrival",
      historical_seasonal_production_level: "farmer.advisory.factor_production",
      profitability: "farmer.advisory.factor_profitability",
      weather_risk: "farmer.advisory.factor_weather",
    };
    for (const r of reasons()) {
      expect(r.labelKey).toBe(expected[r.module]);
    }
  });

  it("orders by weighted score descending", () => {
    const byModule = Object.fromEntries(contributions.map((c) => [c.module, c.weighted_score]));
    const order = reasons().map((r) => byModule[r.module]);
    expect(order).toEqual([...order].sort((a, b) => b - a));
  });

  it("breaks full ties deterministically by canonical module order", () => {
    const tied = {
      price_outlook: "Favorable",
      arrival_pressure: "High",
      historical_seasonal_production_level: "High",
      profitability: "Favorable",
      weather_risk: "Suitable",
      current_arrival_kg: 8400,
    };
    const equal = { price_outlook: 0.1, arrival_pressure: 0.2, weather_risk: 0.2, profitability: 0.2, historical_seasonal_production_level: 0.2 };
    const out = composeAdvisoryReasons({
      moduleResults: tied,
      contributions: [
        contrib("price_outlook", "Favorable", 0, equal),
        contrib("arrival_pressure", "High", 3, equal),
        contrib("historical_seasonal_production_level", "High", 3, equal),
        contrib("profitability", "Favorable", 0, equal),
        contrib("weather_risk", "Suitable", 0, equal),
      ],
      vetoes: [],
      cropName: "Kamatis",
    });
    // arrival_pressure precedes historical_seasonal_production_level in SCORED_MODULES
    expect(out.slice(0, 2).map((r) => r.module)).toEqual([
      "arrival_pressure",
      "historical_seasonal_production_level",
    ]);
  });

  it("is stable across repeated calls", () => {
    expect(reasons()).toEqual(reasons());
  });
});

describe("advisoryReasons — hard vetoes come from the backend", () => {
  it("leads with the veto sentence as the main factor", () => {
    const out = resolveMainFactor({
      moduleResults: { weather_risk: "Severe", price_outlook: "Favorable" },
      contributions: [
        contrib("weather_risk", "Severe", 2, BEFORE_PLANTING_WEIGHTS),
        contrib("price_outlook", "Favorable", 0, BEFORE_PLANTING_WEIGHTS),
      ],
      weightsApplied: BEFORE_PLANTING_WEIGHTS,
      vetoes: [{ code: "severe_weather", modules: ["weather_risk"] }],
    });
    expect(out.key).toBe("farmer.advisory.veto_severe_weather");
    expect(out.modules).toEqual(["weather_risk"]);
  });

  it("maps each known veto code to a localized key", () => {
    const codes = {
      profit_and_price: "farmer.advisory.veto_profit_and_price",
      severe_weather: "farmer.advisory.veto_severe_weather",
      oversupply: "farmer.advisory.veto_oversupply",
    };
    for (const [code, key] of Object.entries(codes)) {
      const out = resolveMainFactor({
        moduleResults: { weather_risk: "Severe" },
        contributions: [],
        weightsApplied: BEFORE_PLANTING_WEIGHTS,
        vetoes: [{ code, modules: ["weather_risk"] }],
      });
      expect(out.key).toBe(key);
    }
  });

  // Vetoes are evaluated from the raw labels, so reliability damping can leave
  // the vetoed factor's weighted_score looking small. The reasons must still
  // lead with the factor that actually forced the decision.
  it("seeds the reasons with vetoed factors despite damped scores", () => {
    const out = composeAdvisoryReasons({
      moduleResults: {
        price_outlook: "Favorable",
        arrival_pressure: "High",
        historical_seasonal_production_level: "High",
        profitability: "Favorable",
        weather_risk: "Suitable",
        current_arrival_kg: 8400,
      },
      contributions: [
        contrib("price_outlook", "Favorable", 0, BEFORE_PLANTING_WEIGHTS),
        contrib("arrival_pressure", "High", 3, BEFORE_PLANTING_WEIGHTS),
        contrib("historical_seasonal_production_level", "High", 3, BEFORE_PLANTING_WEIGHTS),
        contrib("profitability", "Favorable", 0, BEFORE_PLANTING_WEIGHTS),
        contrib("weather_risk", "Suitable", 0, BEFORE_PLANTING_WEIGHTS),
      ],
      vetoes: [{ code: "oversupply", modules: ["arrival_pressure", "historical_seasonal_production_level", "price_outlook"] }],
      cropName: "Kamatis",
    });
    expect(out[0].module).toBe("arrival_pressure");
  });

  it("ignores an unrecognised veto code and falls back to score ranking", () => {
    const out = resolveMainFactor({
      moduleResults: { price_outlook: "Unfavorable", weather_risk: "Suitable" },
      contributions: [
        contrib("price_outlook", "Unfavorable", 2, BEFORE_PLANTING_WEIGHTS),
        contrib("weather_risk", "Suitable", 0, BEFORE_PLANTING_WEIGHTS),
      ],
      weightsApplied: BEFORE_PLANTING_WEIGHTS,
      vetoes: [{ code: "something_new", modules: ["weather_risk"] }],
    });
    expect(out.key).toBe("farmer.advisory.advisory_major_factor");
  });
});

describe("advisoryReasons — main factor resolution", () => {
  it("names the highest weighted factor when there is real risk", () => {
    const out = resolveMainFactor({
      moduleResults: { price_outlook: "Unfavorable", weather_risk: "Suitable" },
      contributions: [
        contrib("price_outlook", "Unfavorable", 2, HARVEST_WEIGHTS),
        contrib("weather_risk", "Suitable", 0, HARVEST_WEIGHTS),
      ],
      weightsApplied: HARVEST_WEIGHTS,
      vetoes: [],
      lang: "en",
    });
    expect(out.key).toBe("farmer.advisory.advisory_major_factor");
    expect(out.params.factor).toBe("Price");
  });

  it("localizes the factor name into the headline", () => {
    const out = resolveMainFactor({
      moduleResults: { weather_risk: "Severe" },
      contributions: [contrib("weather_risk", "Severe", 2, BEFORE_PLANTING_WEIGHTS)],
      weightsApplied: BEFORE_PLANTING_WEIGHTS,
      vetoes: [],
      lang: "ceb",
    });
    expect(out.params.factor).toBe("Panahon");
  });

  // Recommended: every risk score is 0, so weighted ranking is a no-op. The
  // main factor falls back to whichever factor the context weighted highest.
  it("falls back to the highest-weight factor when all risk scores are zero", () => {
    const out = resolveMainFactor({
      moduleResults: {
        price_outlook: "Favorable",
        arrival_pressure: "Low",
        historical_seasonal_production_level: "Low",
        profitability: "Favorable",
        weather_risk: "Suitable",
      },
      contributions: [
        contrib("price_outlook", "Favorable", 0, BEFORE_PLANTING_WEIGHTS),
        contrib("arrival_pressure", "Low", 0, BEFORE_PLANTING_WEIGHTS),
        contrib("historical_seasonal_production_level", "Low", 0, BEFORE_PLANTING_WEIGHTS),
        contrib("profitability", "Favorable", 0, BEFORE_PLANTING_WEIGHTS),
        contrib("weather_risk", "Suitable", 0, BEFORE_PLANTING_WEIGHTS),
      ],
      weightsApplied: BEFORE_PLANTING_WEIGHTS,
      vetoes: [],
      lang: "en",
    });
    expect(out.key).toBe("farmer.advisory.advisory_major_factor");
    expect(out.params.factor).toBe("Price");
  });

  it("returns null when there is nothing to say", () => {
    expect(resolveMainFactor({})).toBeNull();
    expect(resolveMainFactor({ moduleResults: null })).toBeNull();
  });
});

describe("advisoryReasons — other factors checked", () => {
  const moduleResults = {
    price_outlook: "Unfavorable",
    arrival_pressure: "High",
    historical_seasonal_production_level: "Low",
    profitability: "Marginal",
    weather_risk: "Suitable",
  };

  it("includes every factor as a proper reason, not a one-liner", () => {
    const out = composeAdvisoryReasons({ moduleResults, cropName: "Kamatis" });
    expect(out.map((r) => r.module).sort()).toEqual([
      "arrival_pressure",
      "historical_seasonal_production_level",
      "price_outlook",
      "profitability",
      "weather_risk",
    ]);
  });

  it("gives the production factor its own reason even though it has no volume data", () => {
    const out = composeAdvisoryReasons({ moduleResults, cropName: "Kamatis" });
    expect(out.find((r) => r.module === "historical_seasonal_production_level").key).toBe(
      "farmer.factors.production.production_low_basic",
    );
  });

  it("omits a factor whose label is missing rather than guessing", () => {
    const out = composeAdvisoryReasons({
      moduleResults: { ...moduleResults, weather_risk: undefined },
      cropName: "Kamatis",
    });
    expect(out.find((r) => r.module === "weather_risk")).toBeUndefined();
    expect(out).toHaveLength(4);
  });

  it("omits a factor whose label is unrecognised", () => {
    const out = composeAdvisoryReasons({
      moduleResults: { ...moduleResults, weather_risk: "SomethingNew" },
      cropName: "Kamatis",
    });
    expect(out.find((r) => r.module === "weather_risk")).toBeUndefined();
  });
});

describe("advisoryReasons — degraded payloads", () => {
  it("falls back to the unavailable message when there are no module results", () => {
    const out = composeAdvisoryReasons({ moduleResults: null });
    expect(out).toEqual([
      { key: "farmer.advisory.advisory_reasons_unavailable", params: {} },
    ]);
  });

  it("falls back to the unavailable message when no factor has a usable label", () => {
    const out = composeAdvisoryReasons({ moduleResults: { price_outlook: "" } });
    expect(out[0].key).toBe("farmer.advisory.advisory_reasons_unavailable");
  });

  it("uses the classification-only tier when the numeric values are missing", () => {
    const out = composeAdvisoryReasons({
      moduleResults: { profitability: "Unfavorable" },
      contributions: [contrib("profitability", "Unfavorable", 2, BEFORE_PLANTING_WEIGHTS)],
      vetoes: [],
      cropName: "Kamatis",
    });
    // break_even_price / forecast bounds absent -> must not invent them
    expect(out[0].key).toBe("farmer.factors.profitability.profitability_unfavorable_basic");
  });

  it("uses the value-bearing arrival tier when volume is present", () => {
    const out = composeAdvisoryReasons({
      moduleResults: { arrival_pressure: "High", current_arrival_kg: 8400 },
      contributions: [contrib("arrival_pressure", "High", 3, BEFORE_PLANTING_WEIGHTS)],
      vetoes: [],
      cropName: "Kamatis",
    });
    expect(out[0].key).toBe("farmer.advisory.reasons.reason_arrival_high");
    expect(out[0].params).toEqual({ current_volume: "8,400", unit: "kg" });
  });
});
