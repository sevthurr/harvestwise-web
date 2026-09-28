/**
 * Tests for calendar marker construction.
 *
 * Markers are built by layering market events, crop plans and the forecast onto
 * the same day keys, so the interesting cases are the overlaps and the
 * month-filtering.
 */
import { describe, it, expect } from "vitest";
import {
  buildCalendarMarkers,
  forecastMarkerType,
  daysInMonth,
  firstWeekday,
  monthKey,
  hasAnyMarker,
} from "./calendarMarkers";

const YEAR = 2026;
const MONTH = 10; // October

describe("forecastMarkerType", () => {
  it("maps severe conditions to storm", () => {
    expect(forecastMarkerType({ suitability: "Severe" })).toBe("storm");
  });
  it("maps heat to heat", () => {
    expect(forecastMarkerType({ weather_condition: "heat" })).toBe("heat");
  });
  it("maps heavy rain to rain", () => {
    expect(forecastMarkerType({ rainfall_mm: 10 })).toBe("rain");
    expect(forecastMarkerType({ rain_probability_pct: 70 })).toBe("rain");
  });
  it("defaults to sun", () => {
    expect(forecastMarkerType({ rainfall_mm: 0, rain_probability_pct: 5 })).toBe("sun");
  });
});

describe("buildCalendarMarkers", () => {
  it("returns an empty map with no input", () => {
    expect(buildCalendarMarkers([], [], [], YEAR, MONTH)).toEqual({});
    expect(buildCalendarMarkers(null, null, null, YEAR, MONTH)).toEqual({});
  });

  it("marks a payday", () => {
    const m = buildCalendarMarkers(
      [{ date: "2026-10-05", is_payday: true }],
      [], [], YEAR, MONTH,
    );
    expect(m[5].payday).toBe(true);
  });

  it("marks a single-day event", () => {
    const m = buildCalendarMarkers(
      [{ date: "2026-10-12", holiday_name: "Fiesta" }],
      [], [], YEAR, MONTH,
    );
    expect(m[12].event).toBe("Fiesta");
  });

  it("spreads a multi-day event across every covered day", () => {
    const m = buildCalendarMarkers(
      [{ date: "2026-10-12", end_date: "2026-10-14", holiday_name: "Harvest Festival" }],
      [], [], YEAR, MONTH,
    );
    expect(m[12].event).toBe("Harvest Festival");
    expect(m[13].event).toBe("Harvest Festival");
    expect(m[14].event).toBe("Harvest Festival");
  });

  it("ignores events outside the requested month", () => {
    const m = buildCalendarMarkers(
      [{ date: "2026-09-30", holiday_name: "Rizal" }],
      [], [], YEAR, MONTH,
    );
    expect(m).toEqual({});
  });

  it("marks a planting day with its harvest estimate", () => {
    // Crop plans arrive already camelCased from CropsContext.
    const m = buildCalendarMarkers([], [
      {
        commodityId: "COM-0001",
        commodityName: "Ampalaya",
        rawPlantingDate: "2026-10-03",
        expectedHarvestDate: "2026-11-20",
      },
    ], [], YEAR, MONTH);
    expect(m[3].crop).toMatchObject({
      id: "COM-0001",
      name: "Ampalaya",
      type: "plant",
    });
    expect(m[3].crop.harvestStr).toBe("Nov 20");
  });

  it("marks a harvest day", () => {
    const m = buildCalendarMarkers([], [
      {
        commodityId: "COM-0002",
        commodityName: "Lettuce",
        rawHarvestDate: "2026-10-20",
      },
    ], [], YEAR, MONTH);
    expect(m[20].crop).toMatchObject({ name: "Lettuce", type: "harvest" });
  });

  it("marks a forecast day with its type and details", () => {
    const m = buildCalendarMarkers([], [], [
      { date: "2026-10-08", temperature_min: 22, temperature_max: 31, rainfall_mm: 12 },
    ], YEAR, MONTH);
    expect(m[8].weather).toBe("rain");
    expect(m[8].weatherInfo).toMatchObject({ tempMin: 22, tempMax: 31, rainfall: 12 });
  });

  it("layers a payday, a crop and the weather onto one day", () => {
    const m = buildCalendarMarkers(
      [{ date: "2026-10-15", is_payday: true, holiday_name: "Town Fiesta" }],
      [{ commodityId: "COM-0003", commodityName: "Kamatis", rawPlantingDate: "2026-10-15" }],
      [{ date: "2026-10-15", temperature_min: 23, temperature_max: 30 }],
      YEAR, MONTH,
    );
    expect(m[15].payday).toBe(true);
    expect(m[15].event).toBe("Town Fiesta");
    expect(m[15].crop.type).toBe("plant");
    expect(m[15].weather).toBe("sun");
    expect(hasAnyMarker(m[15])).toBe(true);
  });

  it("does not throw on malformed or null input", () => {
    expect(() =>
      buildCalendarMarkers(
        [{ date: "garbage" }, { date: null }, {}, null],
        [{ rawPlantingDate: "nope" }, null, { rawHarvestDate: "" }],
        [{ date: "" }, null],
        YEAR, MONTH,
      ),
    ).not.toThrow();
  });
});

describe("date helpers", () => {
  it("counts days in a month", () => {
    expect(daysInMonth(2026, 10)).toBe(31);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29); // leap year
  });

  it("finds the weekday the month starts on", () => {
    expect(firstWeekday(2026, 10)).toBe(4); // 1 Oct 2026 is a Thursday
  });

  it("builds a month key", () => {
    expect(monthKey(2026, 10)).toBe("2026-10");
  });

  it("hasAnyMarker is false for an empty day", () => {
    expect(hasAnyMarker({})).toBe(false);
    expect(hasAnyMarker({ weather: "sun" })).toBe(true);
  });

  it("hasAnyMarker tolerates null and undefined", () => {
    // buildCalendarMarkers omits keys for unmarked days, so a lookup for one
    // yields undefined. Dereferencing that would crash the whole calendar.
    expect(hasAnyMarker(null)).toBe(false);
    expect(hasAnyMarker(undefined)).toBe(false);
  });
});
