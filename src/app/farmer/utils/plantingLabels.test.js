/**
 * Tests for planting-suitability localization.
 *
 * The regression these guard: the API used to send finished English sentences
 * (`notes`, `excluded_reason`) and stored English strings (`advisory_category`),
 * all of which the client rendered verbatim. A farmer who had selected Cebuano
 * or Tagalog still read English on the crop calendar.
 *
 * Two properties matter most:
 *  - an unrecognised code or category must render *nothing*, never a raw dotted
 *    i18n key, which would be worse than the English it replaced
 *  - the tone must come from the mapped value, not from string comparison, so an
 *    unknown category is no longer silently styled as "avoid"
 */
import { describe, it, expect } from "vitest";
import { t } from "../../global/i18n/index.js";
import {
  advisoryCategoryLabel,
  localizedRefText,
  recommendationLine,
  toneClasses,
  weatherRiskLabel,
} from "./plantingLabels";

const tr = (lang) => (key, params = {}) => t(key, params, lang);

describe("localizedRefText", () => {
  it("renders a note in the requested language", () => {
    const ref = { code: "notes.no_rules", params: { names: "Ampalaya" } };
    expect(localizedRefText(ref, tr("en"))).toContain("Ampalaya");
    expect(localizedRefText(ref, tr("tl"))).toMatch(/[A-Za-z]/);
    expect(localizedRefText(ref, tr("ceb"))).toMatch(/[A-Za-z]/);
  });

  it("never returns the raw i18n key", () => {
    const ref = { code: "notes.no_district" };
    for (const lang of ["en", "ceb", "tl"]) {
      const out = localizedRefText(ref, tr(lang));
      expect(out).not.toContain("farmer.plantingSuitability");
    }
  });

  it("returns nothing for an unknown code instead of leaking it", () => {
    expect(localizedRefText({ code: "notes.made_up" }, tr("en"))).toBe("");
  });

  it("returns nothing for a missing or malformed ref", () => {
    expect(localizedRefText(null, tr("en"))).toBe("");
    expect(localizedRefText(undefined, tr("en"))).toBe("");
    expect(localizedRefText({}, tr("en"))).toBe("");
  });

  it("substitutes every parameter", () => {
    const ref = {
      code: "notes.no_forecast",
      params: { days: 14, location: "Calinan District" },
    };
    for (const lang of ["en", "ceb", "tl"]) {
      const out = localizedRefText(ref, tr(lang));
      expect(out).toContain("14");
      expect(out).toContain("Calinan District");
    }
  });

  it("localizes the excluded reason too", () => {
    const ref = { code: "excluded.no_rules" };
    expect(localizedRefText(ref, tr("en"))).toMatch(/no weather rules/i);
    expect(localizedRefText(ref, tr("tl"))).toMatch(/[A-Za-z]/);
  });

  it("pre-formats a date parameter so locales do not parse ISO strings", () => {
    const ref = { code: "excluded.window_closed", params: { month: "2026-10", end: "2026-10-12" } };
    const out = localizedRefText(ref, tr("en"));
    expect(out).not.toContain("2026-10-12");
    expect(out).not.toContain("2026-10");
    expect(out).not.toContain("{end}");
    expect(out).not.toContain("{month}");
  });

  it("localizes the month name in date parameters", () => {
    const ref = { code: "excluded.window_closed", params: { month: "2026-10", end: "2026-10-12" } };
    // Intl resolves ceb/fil to "Okt"; the old hardcoded en-US path gave "Oct".
    expect(localizedRefText(ref, tr("ceb"), "ceb")).toContain("Okt");
    expect(localizedRefText(ref, tr("tl"), "tl")).toContain("Okt");
  });
});

describe("advisoryCategoryLabel", () => {
  it("localizes each of the three CHECK-constraint values", () => {
    expect(advisoryCategoryLabel("Recommended", tr("en")).text).toBe("Recommended");
    expect(advisoryCategoryLabel("Proceed with Caution", tr("en")).text).toBe(
      "Proceed with Caution",
    );
    expect(advisoryCategoryLabel("Avoid for Now", tr("en")).text).toBe("Avoid for Now");
  });

  it("changes with the selected language", () => {
    const en = advisoryCategoryLabel("Avoid for Now", tr("en")).text;
    const tl = advisoryCategoryLabel("Avoid for Now", tr("tl")).text;
    const ceb = advisoryCategoryLabel("Avoid for Now", tr("ceb")).text;
    expect(new Set([en, tl, ceb]).size).toBe(3);
  });

  it("maps each category to a distinct tone", () => {
    const tones = ["Recommended", "Proceed with Caution", "Avoid for Now"].map(
      (c) => advisoryCategoryLabel(c, tr("en")).tone,
    );
    expect(new Set(tones).size).toBe(3);
  });

  it("returns null for an unknown category rather than styling it red", () => {
    // The old code did `category === "Recommended" ? green : "Proceed with
    // Caution" ? amber : red`, so anything unrecognised became a red "avoid".
    expect(advisoryCategoryLabel("Something New", tr("en"))).toBeNull();
    expect(advisoryCategoryLabel(null, tr("en"))).toBeNull();
  });
});

describe("weatherRiskLabel", () => {
  it("localizes the three CHECK-constraint values", () => {
    expect(weatherRiskLabel("Suitable", tr("en")).text).toBe("Weather looks good");
    expect(weatherRiskLabel("Severe", tr("tl")).text).toMatch(/[A-Za-z]/);
  });

  it("returns null for an unknown level", () => {
    expect(weatherRiskLabel("Extreme", tr("en"))).toBeNull();
  });
});

describe("toneClasses", () => {
  it("gives every tone a distinct style", () => {
    const styles = ["recommended", "caution", "avoid"].map(toneClasses);
    expect(new Set(styles).size).toBe(3);
  });

  it("falls back safely for an unknown tone", () => {
    expect(toneClasses(undefined)).toBeTruthy();
  });
});

describe("recommendationLine", () => {
  it("renders the sowing window instead of the English explanation column", () => {
    const rec = {
      advisory_category: "Avoid for Now",
      explanation: "Severe: Forecast temperature for Ampalaya is >30C; protect vines",
      planting_window_start: "2026-10-10",
      planting_window_end: "2026-10-14",
    };
    for (const lang of ["en", "ceb", "tl"]) {
      const out = recommendationLine(rec, tr(lang));
      expect(out).toBeTruthy();
      expect(out).not.toContain("Severe:");
      expect(out).not.toContain("Forecast temperature");
    }
  });

  it("collapses a single-day window to one date", () => {
    const rec = {
      planting_window_start: "2026-10-10",
      planting_window_end: "2026-10-10",
    };
    expect(recommendationLine(rec, tr("en"))).not.toContain("–");
  });

  it("localizes the month names in the window", () => {
    const rec = {
      planting_window_start: "2026-08-28",
      planting_window_end: "2026-10-07",
    };
    expect(recommendationLine(rec, tr("en"), "en")).toContain("Aug");
    expect(recommendationLine(rec, tr("ceb"), "ceb")).toContain("Ago");
  });

  it("returns nothing when no window is recorded", () => {
    expect(recommendationLine({}, tr("en"))).toBe("");
    expect(recommendationLine({ planting_window_start: "2026-10-10" }, tr("en"))).toBe("");
  });
});
