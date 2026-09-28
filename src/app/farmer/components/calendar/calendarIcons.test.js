/**
 * Tests for calendar cell icon selection and the legend.
 *
 * The two behaviours that fix the reported problems:
 *  - every icon occupies an identical layout slot, so rows stay aligned
 *  - a day never renders more than MAX_CELL_ICONS glyphs, and the legend only
 *    advertises marker types the month actually contains
 */
import { describe, it, expect } from "vitest";
import {
  CELL_ICON_ART,
  CELL_ICON_SLOT,
  CELL_ICON_STROKE,
  MAX_CELL_ICONS,
  legendKindsFor,
  selectCellMarkers,
} from "./calendarIcons";

const crop = (id = "COM-1", type = "plant") => ({
  id,
  name: "Ampalaya",
  variant: "Galaxy",
  type,
});

describe("alignment tokens", () => {
  it("gives every icon the same layout slot", () => {
    expect(CELL_ICON_SLOT).toContain("w-[18px]");
    expect(CELL_ICON_SLOT).toContain("flex-shrink-0");
  });

  it("scales filled artwork larger than stroked glyphs", () => {
    // 18 vs 15 is the 1.2x ratio that compensates for stroke-vs-fill weight.
    const art = Number(CELL_ICON_ART.match(/w-\[(\d+)px\]/)[1]);
    const stroke = Number(CELL_ICON_STROKE.match(/w-\[(\d+)px\]/)[1]);
    expect(art).toBeGreaterThan(stroke);
    expect(art / stroke).toBeCloseTo(1.2, 2);
  });
});

describe("selectCellMarkers", () => {
  it("returns nothing for an unmarked day", () => {
    expect(selectCellMarkers(null)).toEqual({ icons: [], overflow: 0 });
    expect(selectCellMarkers({})).toEqual({ icons: [], overflow: 0 });
  });

  it("puts the crop first", () => {
    const { icons } = selectCellMarkers({
      crop: crop(),
      weather: "rain",
      event: "Fiesta",
      payday: true,
    });
    expect(icons[0].kind).toBe("crop");
  });

  it("orders crop, weather, event", () => {
    const { icons } = selectCellMarkers({
      event: "Fiesta",
      weather: "rain",
      crop: crop(),
    });
    expect(icons.map((i) => i.kind)).toEqual(["crop", "weather", "event"]);
  });

  it("ranks payday last, below every other marker", () => {
    // Payday alone still renders, but it is the first thing dropped when the
    // cell is full.
    const full = selectCellMarkers({
      crop: crop(),
      weather: "rain",
      event: "Fiesta",
      payday: true,
    });
    expect(full.icons.some((i) => i.kind === "payday")).toBe(false);
    expect(full.overflow).toBe(1);

    const roomy = selectCellMarkers({ weather: "rain", payday: true });
    expect(roomy.icons.map((i) => i.kind)).toEqual(["weather", "payday"]);
  });

  it("caps the icon count and reports the overflow", () => {
    const { icons, overflow } = selectCellMarkers({
      crop: crop(),
      weather: "rain",
      event: "Fiesta",
      payday: true,
    });
    expect(icons).toHaveLength(MAX_CELL_ICONS);
    expect(overflow).toBe(1);
  });

  it("has no overflow when three or fewer markers", () => {
    expect(selectCellMarkers({ crop: crop(), weather: "rain" }).overflow).toBe(0);
    expect(selectCellMarkers({ payday: true }).overflow).toBe(0);
  });

  it("always keeps the crop, dropping the least important marker instead", () => {
    const { icons } = selectCellMarkers({
      crop: crop(),
      weather: "storm",
      event: "Fiesta",
      payday: true,
    });
    expect(icons.some((i) => i.kind === "crop")).toBe(true);
    expect(icons.some((i) => i.kind === "payday")).toBe(false);
  });

  it("carries the crop name through for the accessible label", () => {
    const { icons } = selectCellMarkers({ crop: crop("COM-9") });
    expect(icons[0].name).toBe("Ampalaya");
    expect(icons[0].id).toBe("COM-9");
  });
});

describe("legendKindsFor", () => {
  it("returns nothing for an empty month", () => {
    expect(legendKindsFor({})).toEqual([]);
    expect(legendKindsFor(null)).toEqual([]);
  });

  it("only advertises what is present", () => {
    expect(legendKindsFor({ 5: { crop: crop() } })).toEqual(["crop"]);
    expect(legendKindsFor({ 5: { weather: "rain" } })).toEqual(["weather"]);
    expect(legendKindsFor({ 5: { payday: true } })).toEqual(["payday"]);
  });

  it("finds markers anywhere in the month", () => {
    const kinds = legendKindsFor({
      1: { weather: "sun" },
      14: { payday: true },
      20: { crop: crop() },
      25: { event: "Fiesta" },
    });
    expect(kinds).toEqual(["crop", "weather", "event", "payday"]);
  });

  it("collapses every weather variant into a single entry", () => {
    const kinds = legendKindsFor({
      1: { weather: "storm" },
      2: { weather: "heat" },
      3: { weather: "rain" },
    });
    expect(kinds).toEqual(["weather"]);
  });

  it("covers the crop icon, which the old legend omitted entirely", () => {
    expect(legendKindsFor({ 5: { crop: crop() } })).toContain("crop");
  });

  it("covers the payday dot, which the old legend omitted entirely", () => {
    expect(legendKindsFor({ 5: { payday: true } })).toContain("payday");
  });
});
