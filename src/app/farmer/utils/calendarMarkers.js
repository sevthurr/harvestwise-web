/**
 * Calendar marker construction and date helpers.
 *
 * Extracted from the Recommendation page so both the grid and the marker logic
 * can be reasoned about (and unit-tested) independently.
 *
 * A marker bundles everything happening on one calendar day:
 *   { crop, weather, weatherInfo, event, payday }
 */
import { toCamelCase } from "../../global/utils/apiTransforms";
import { parseLocalDate } from "./formatters";

/** Map a forecast row onto a single icon class. */
export function forecastMarkerType(f) {
  const condition = String(f.suitability || f.weather_condition || "").toLowerCase();
  if (condition.includes("severe")) return "storm";
  if (condition.includes("heat")) return "heat";
  const rainfall = Number(f.rainfall_mm) || 0;
  const rainProb = Number(f.rain_probability_pct) || 0;
  if (rainfall >= 5 || rainProb >= 60) return "rain";
  if (condition.includes("caution") && rainfall > 0) return "rain";
  return "sun";
}

/** Parse "YYYY-MM-DD" into its day-of-month, or null if not in year/month. */
function dayInMonth(isoDate, year, month) {
  const parts = String(isoDate || "").split("-");
  if (parts.length < 3) return null;
  if (parts[0] !== String(year)) return null;
  if (parseInt(parts[1], 10) !== month) return null;
  const day = parseInt(parts[2], 10);
  return Number.isNaN(day) ? null : day;
}

/** "Sep 18" — timezone-safe short date for a harvest estimate. */
function shortDate(isoDate) {
  const parsed = parseLocalDate(isoDate);
  if (!parsed) return null;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Build the per-day marker map for one month of the calendar.
 *
 * Market events, crop plans and the weather forecast are layered onto the same
 * day keys, so a single grid cell can show a payday, a holiday, a crop stage and
 * the weather at once.
 *
 * Input contract: `marketEvents` arrive raw from the API and are camelCased
 * here; `cropPlans` and `weatherForecasts` must already be camelCased by the
 * caller (CropsContext / the forecast query both do).
 */
export function buildCalendarMarkers(
  marketEvents,
  cropPlans,
  weatherForecasts,
  year,
  month,
) {
  const markers = {};

  (marketEvents || []).forEach((item) => {
    if (!item) return;
    const camel = toCamelCase(item);
    const origDate = camel.calendarDate || camel.date;
    if (!origDate) return;
    const ds = String(origDate);
    const startParts = ds.split("-");
    if (startParts.length < 3) return;
    const startDay = parseInt(startParts[2], 10);
    if (isNaN(startDay)) return;
    if (startParts[0] !== String(year) || parseInt(startParts[1], 10) !== month) return;

    if (camel.isPayday) {
      if (!markers[startDay]) markers[startDay] = {};
      markers[startDay].payday = true;
    }

    const eName = camel.holidayName || camel.eventName;
    if (!eName) return;

    let endDay = startDay;
    const endParts = (camel.endDate || "").split("-");
    if (
      endParts.length === 3 &&
      endParts[0] === String(year) &&
      parseInt(endParts[1], 10) === month
    ) {
      endDay = Math.max(startDay, parseInt(endParts[2], 10) || startDay);
    }

    // Multi-day events mark every day they cover.
    for (let d = startDay; d <= endDay; d += 1) {
      if (!markers[d]) markers[d] = {};
      markers[d].event = eName;
    }
  });

  (cropPlans || []).forEach((c) => {
    if (!c) return;
    const name =
      c.commodityName && c.commodityName !== "–" ? c.commodityName : "Crop";
    const variant = c.variant || c.variety || null;
    const id = c.commodityId || c.commodity || "crop";

    const pDate =
      c.rawPlantingDate || c.actualPlantingDate || c.plannedPlantingDate || c.plantingDate;
    if (pDate) {
      const d = dayInMonth(pDate, year, month);
      if (d) {
        if (!markers[d]) markers[d] = {};
        markers[d].crop = {
          id,
          name,
          variant,
          type: "plant",
          harvestStr: c.harvestDate || shortDate(c.expectedHarvestDate),
        };
      }
    }

    const hDate = c.rawHarvestDate || c.expectedHarvestDate || c.harvestDate;
    if (hDate) {
      const d = dayInMonth(hDate, year, month);
      if (d) {
        if (!markers[d]) markers[d] = {};
        markers[d].crop = { id, name, variant, type: "harvest" };
      }
    }
  });

  (weatherForecasts || []).forEach((f) => {
    if (!f) return;
    const d = dayInMonth(f.date, year, month);
    if (!d) return;
    if (!markers[d]) markers[d] = {};
    markers[d].weather = forecastMarkerType(f);
    markers[d].weatherInfo = {
      tempMin: f.temperature_min,
      tempMax: f.temperature_max,
      rainfall: f.rainfall_mm,
      rainProb: f.rain_probability_pct,
      condition: f.suitability || f.weather_condition || null,
    };
  });

  return markers;
}

export const DAY_LABELS = [
  { key: "farmer.calendar.days.sun", fallback: "Sun" },
  { key: "farmer.calendar.days.mon", fallback: "Mon" },
  { key: "farmer.calendar.days.tue", fallback: "Tue" },
  { key: "farmer.calendar.days.wed", fallback: "Wed" },
  { key: "farmer.calendar.days.thu", fallback: "Thu" },
  { key: "farmer.calendar.days.fri", fallback: "Fri" },
  { key: "farmer.calendar.days.sat", fallback: "Sat" },
];

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const monthKey = (year, month) => `${year}-${month}`;

export const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

export const firstWeekday = (year, month) => new Date(year, month - 1, 1).getDay();

/**
 * Whether a day carries anything worth rendering.
 *
 * Null-safe on purpose: `buildCalendarMarkers` only creates keys for days that
 * have data, so a lookup for an unmarked day yields `undefined`. Callers pass
 * that straight through as `null`, and dereferencing it would crash the whole
 * calendar on the first empty day.
 */
export const hasAnyMarker = (m) =>
  !!(m && (m.crop || m.weather || m.event || m.payday));
