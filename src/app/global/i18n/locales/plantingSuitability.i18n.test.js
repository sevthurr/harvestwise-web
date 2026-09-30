/**
 * Guards the farmer.plantingSuitability namespace.
 *
 * A key that is missing from a locale silently falls back to the caller's
 * hardcoded English string, so a typo or a missing registration would ship a
 * half-translated screen with no error anywhere. These tests resolve every key
 * the PlantingSuitabilityCard actually uses, through the real i18n module.
 */
import { describe, it, expect } from "vitest";
import { t, getDictionary } from "../index.js";
import { en } from "./en.js";

// key -> interpolation params used in the component
const KEYS = {
  "farmer.plantingSuitability.no_data": {},
  "farmer.plantingSuitability.no_data_desc": {},
  "farmer.plantingSuitability.sow_by": { date: "Oct 14" },
  "farmer.plantingSuitability.window_opens": { date: "Oct 2" },
  "farmer.plantingSuitability.suitable_days": { good: 3, total: 14 },
  "farmer.plantingSuitability.no_recommendations": {},
  "farmer.plantingSuitability.notes_toggle": { count: 2 },
};

// Keys the card reuses from existing namespaces. Guarded so a rename elsewhere
// cannot silently break the dashboard card.
const REUSED = {
  "farmer.advisory.labels.recommended": {},
  "farmer.advisory.labels.proceed_with_caution": {},
  "farmer.advisory.labels.avoid_for_now": {},
  "farmer.dashboard.view_guide": {},
  "farmer.dashboard.my_preferred_crops_title": {},
  "farmer.dashboard.good_crops_title": {},
  "farmer.plantingGuide.view_guide_btn": {},
};

const LOCALES = [
  ["en", "en"],
  ["ceb", "ceb"],
  ["tl", "tl"],
];

describe.each(LOCALES)("plantingSuitability keys (%s)", (_label, lang) => {
  it.each(Object.keys(KEYS))("resolves %s", (key) => {
    const value = t(key, KEYS[key], lang);
    expect(value).not.toBe(key);
    expect(value).toBeTruthy();
  });

  it.each(Object.keys(REUSED))("resolves reused key %s", (key) => {
    const value = t(key, REUSED[key], lang);
    expect(value).not.toBe(key);
    expect(value).toBeTruthy();
  });

  it("interpolates every placeholder, leaving none visible", () => {
    for (const key of Object.keys(KEYS)) {
      const value = t(key, KEYS[key], lang);
      expect(value).not.toMatch(/\{(date|good|total|count)\}/);
    }
  });

  it("translates the 'no planting data' label away from English", () => {
    // The neutral state is the one most likely to be left in English by
    // accident, so assert the non-English locales actually differ.
    const value = t("farmer.plantingSuitability.no_data", {}, lang);
    expect(value).toBeTruthy();
    if (lang !== "en") {
      expect(value).not.toBe(en.farmer.plantingSuitability.no_data);
    }
  });
});

describe("locale parity", () => {
  it.each(["ceb", "tl"])("%s defines every en plantingSuitability key", (lang) => {
    const source = en.farmer.plantingSuitability;
    const target = getDictionary(lang).farmer.plantingSuitability;
    expect(Object.keys(target).sort()).toEqual(Object.keys(source).sort());
  });
});
