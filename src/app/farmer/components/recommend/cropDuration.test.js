/**
 * Regression tests for the Step 1 crop duration.
 *
 * The assessment used to read a hardcoded `CROP_DURATIONS` map, which
 * disagreed with `commodity.typical_duration_min_days` / `_max_days` for all
 * ten top-10 crops (e.g. Talong 120 days in the UI vs 46–50 in the database),
 * so every farmer was told to expect harvest weeks too early. Duration must
 * now come from the API and a variety with no duration must read as unknown
 * rather than inheriting a sibling variety's numbers.
 *
 * `CROP_DURATIONS` survives as a fallback for crops the API catalog does not
 * cover (offline bundle, non-top-10 crops). The API value must always win
 * when both exist — that priority is what this file guards.
 */
import { describe, it, expect } from "vitest";
import { CROP_DURATIONS, formatDurationLabel, getCropDuration, suggestHarvestDate } from "./types.js";
import { buildCatalog, durationForOption } from "./useCommodityCatalog.js";

// Trimmed from GET /api/v1/prices?is_top10=true
const PRICES_ITEMS = [
  { commodity_id: "COM-0011", name: "Talong", variety: "Banate King", is_top10: true, unit_of_measure: "kg", typical_duration_min_days: 46, typical_duration_max_days: 50, duration_basis: "DAT" },
  { commodity_id: "COM-0007", name: "Carrots", variety: "Big", is_top10: true, unit_of_measure: "kg", typical_duration_min_days: 90, typical_duration_max_days: 120, duration_basis: "DAE" },
  { commodity_id: "COM-0009", name: "Lettuce", variety: "Ball", is_top10: true, unit_of_measure: "kg", typical_duration_min_days: 45, typical_duration_max_days: 60, duration_basis: "DAT" },
  { commodity_id: "COM-0010", name: "Lettuce", variety: "Curly", is_top10: true, unit_of_measure: "kg", typical_duration_min_days: null, typical_duration_max_days: null, duration_basis: null },
  { commodity_id: "COM-0003", name: "Ampalaya", variety: "Galaxy", is_top10: true, unit_of_measure: "kg", typical_duration_min_days: 48, typical_duration_max_days: 52, duration_basis: "DAT" },
  { commodity_id: "COM-0099", name: "Saba", variety: null, is_top10: false, unit_of_measure: "kg", typical_duration_min_days: 10, typical_duration_max_days: 20, duration_basis: "DAT" },
];

const PLANTING = "2026-10-01";
const t = (key, params) => {
  const table = {
    "farmer.assess.duration_days_single": "{value} days",
    "farmer.assess.duration_days_range": "{min}-{max} days",
    "farmer.assess.duration_months_single": "{value} months",
    "farmer.assess.duration_months_range": "{min}-{max} months",
  };
  const raw = table[key];
  if (!raw) return key;
  return raw.replace(/\{(\w+)\}/g, (_, p) => String(params[p]));
};

describe("buildCatalog", () => {
  const options = buildCatalog(PRICES_ITEMS);
  const byId = Object.fromEntries(options.map((o) => [o.id, o]));

  it("keeps only top-10 rows", () => {
    expect(options.map((o) => o.id).sort()).toEqual(["ampalaya", "carrots", "lettuce", "talong"]);
    expect(byId.saba).toBeUndefined();
  });

  it("groups varieties under one base vegetable", () => {
    expect(byId.lettuce.varieties).toEqual(["Ball", "Curly"]);
    expect(byId.lettuce.varietyMap.curly).toBe("COM-0010");
  });

  it("reads duration from the API per variety", () => {
    expect(durationForOption(byId.talong, "Banate King")).toEqual({ min: 46, max: 50, basis: "DAT" });
    expect(durationForOption(byId.carrots, "Big")).toEqual({ min: 90, max: 120, basis: "DAE" });
  });

  it("does not lend one variety's duration to a variety that has none", () => {
    expect(durationForOption(byId.lettuce, "Ball")).toEqual({ min: 45, max: 60, basis: "DAT" });
    expect(durationForOption(byId.lettuce, "Curly")).toBeNull();
  });

  it("falls back to the default variety when none is selected", () => {
    expect(durationForOption(byId.talong, "")).toEqual({ min: 46, max: 50, basis: "DAT" });
    expect(durationForOption(null, "Ball")).toBeNull();
  });
});

describe("formatDurationLabel", () => {
  it("quotes months only when both ends land on a half-month step", () => {
    expect(formatDurationLabel({ min: 90, max: 120 }, t)).toBe("3-4 months");
    expect(formatDurationLabel({ min: 45, max: 60 }, t)).toBe("1.5-2 months");
    expect(formatDurationLabel({ min: 90, max: 90 }, t)).toBe("3 months");
  });

  it("keeps days when months would be a fraction", () => {
    expect(formatDurationLabel({ min: 46, max: 50 }, t)).toBe("46-50 days");
    expect(formatDurationLabel({ min: 38, max: 45 }, t)).toBe("38-45 days");
  });

  it("returns null when the database has no duration", () => {
    expect(formatDurationLabel(null, t)).toBeNull();
  });
});

describe("suggestHarvestDate", () => {
  it("derives the window from the database duration", () => {
    expect(suggestHarvestDate(PLANTING, { min: 46, max: 50 })).toEqual({
      minDate: "2026-11-16",
      maxDate: "2026-11-20",
    });
  });

  it("collapses a single-value duration to one date", () => {
    expect(suggestHarvestDate(PLANTING, { min: 90, max: 90 })).toEqual({
      minDate: "2026-12-30",
      maxDate: null,
    });
  });

  it("returns null without a planting date or a duration", () => {
    expect(suggestHarvestDate("", { min: 46, max: 50 })).toBeNull();
    expect(suggestHarvestDate(PLANTING, null)).toBeNull();
  });

  it("falls back to CROP_DURATIONS when given a commodity id", () => {
    // Step 1 passes a commodity id whenever the API catalog has no row, so the
    // farmer still gets a window instead of a blank suggestion.
    expect(suggestHarvestDate(PLANTING, "talong", "Banate King").minDate).toBe("2026-11-16");
  });

  it("prefers the API duration over CROP_DURATIONS when both are available", () => {
    // Ampalaya's crop-wide table range is 45–75 days; the database says 48–52.
    // If the API value ever stops winning, farmers get a four-week window
    // instead of the four-day one the research specifies.
    const apiDuration = { min: 48, max: 52 };
    expect(getCropDuration("ampalaya")).toMatchObject({ daysMin: 45, daysMax: 75 });
    expect(suggestHarvestDate(PLANTING, apiDuration, "Galaxy")).toEqual({
      minDate: "2026-11-18",
      maxDate: "2026-11-22",
    });
  });
});

describe("getCropDuration", () => {
  it("resolves the fallback table by commodity and by variety", () => {
    expect(getCropDuration("talong")).toMatchObject({ daysMin: 46, daysMax: 50 });
    expect(getCropDuration("talong", "Banate King")).toMatchObject({ daysMin: 46, daysMax: 50 });
  });

  it("returns null for a crop that is in neither source", () => {
    expect(getCropDuration("saba")).toBeNull();
    expect(getCropDuration(null)).toBeNull();
  });
});
