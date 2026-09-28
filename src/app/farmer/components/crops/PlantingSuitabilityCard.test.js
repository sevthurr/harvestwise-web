/**
 * Regression tests for the planting-suitability response boundary.
 *
 * The API emits snake_case and `parseResponse` performs no case conversion, so
 * any component reading camelCase directly gets `undefined` against a real
 * response. That shipped once: `commodityId`, `excludedRef`, `suitableDays` and
 * `assessedDays` were all undefined, which silently disabled the
 * preferred-crop match, the day-count line and the exclusion reason.
 *
 * The fixtures below are trimmed from a live response, so they fail if the API
 * ever renames a field.
 */
import { describe, it, expect } from "vitest";
import { normalizeCrop } from "./PlantingSuitabilityCard.jsx";

// Shape captured from GET /api/v1/farmer/planting-suitability (v2).
const API_CROP = {
  commodity_id: "COM-0003",
  name: "Carrots",
  variety: "Big",
  verdict: "caution",
  rank: 1,
  excluded_ref: null,
  rule_count: 7,
  covered_groups: ["temperature"],
  missing_groups: ["humidity", "wind"],
  assessed_days: 14,
  suitable_days: 3,
  window: { status: "open", window_start: "2026-09-23", window_end: "2026-10-08" },
  advisory_text: "Caution: Forecast temperature ... ",
  days: [],
};

describe("normalizeCrop", () => {
  it("exposes the snake_case fields the card reads under camelCase", () => {
    const crop = normalizeCrop(API_CROP);
    expect(crop.commodityId).toBe("COM-0003");
    expect(crop.suitableDays).toBe(3);
    expect(crop.assessedDays).toBe(14);
    expect(crop.ruleCount).toBe(7);
    expect(crop.missingGroups).toEqual(["humidity", "wind"]);
  });

  it("carries the exclusion code through for localization", () => {
    const crop = normalizeCrop({
      ...API_CROP,
      verdict: "unknown",
      excluded_ref: { code: "excluded.no_rules", params: {} },
    });
    expect(crop.excludedRef).toEqual({ code: "excluded.no_rules", params: {} });
  });

  it("keeps an absent exclusion as null, not undefined", () => {
    expect(normalizeCrop(API_CROP).excludedRef).toBeNull();
  });

  it("defaults missing_groups to an array", () => {
    const { missing_groups: _drop, ...rest } = API_CROP;
    expect(normalizeCrop(rest).missingGroups).toEqual([]);
  });

  it("preserves fields that need no mapping", () => {
    const crop = normalizeCrop(API_CROP);
    expect(crop.name).toBe("Carrots");
    expect(crop.variety).toBe("Big");
    expect(crop.verdict).toBe("caution");
    expect(crop.rank).toBe(1);
    expect(crop.window.status).toBe("open");
  });

  it("tolerates a null crop", () => {
    expect(normalizeCrop(null)).toBeNull();
  });
});
