/**
 * Farmer-specific formatters adhering strictly to the frozen specification formatting rules.
 */

export const SUPPORTED_PRICE_HORIZONS = [7, 14, 21, 28];

export function isValidHorizon(days) {
  const num = Number(days);
  return SUPPORTED_PRICE_HORIZONS.includes(num);
}

export function formatPrice(val) {
  if (val == null || isNaN(val) || !isFinite(val)) return null;
  const num = Number(val);
  if (num <= 0) return null; // spec: Price <= 0 treated as unavailable/invalid

  // Format whole number without decimal if exact, else up to 2 decimal places
  const hasDecimals = num % 1 !== 0;
  return num.toLocaleString('en-PH', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function formatAbsoluteDifference(val1, val2) {
  if (val1 == null || val2 == null || isNaN(val1) || isNaN(val2)) return null;
  const num1 = Number(val1);
  const num2 = Number(val2);
  const diff = Math.abs(num1 - num2);
  return formatPrice(diff);
}

export function formatVolume(val) {
  if (val == null || isNaN(val) || !isFinite(val)) return null;
  const num = Number(val);
  if (num < 0) return null; // negative volume invalid
  const hasDecimals = num % 1 !== 0;
  return num.toLocaleString('en-PH', {
    minimumFractionDigits: hasDecimals ? 1 : 0,
    maximumFractionDigits: 2,
  });
}

export function formatNumber(val) {
  if (val == null || isNaN(val) || !isFinite(val)) return null;
  const num = Number(val);
  return num.toLocaleString('en-PH');
}

export function formatPercent(val) {
  if (val == null || isNaN(val) || !isFinite(val)) return null;
  const num = Math.abs(Number(val));
  return num.toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

/**
 * Parse an ISO date string (as delivered by the API) as a LOCAL date.
 *
 * `new Date("2026-09-27")` is parsed by the runtime as UTC midnight. In the
 * Philippines (UTC+8) that is 08:00 on the 27th locally, which happens to be
 * correct — but anywhere at or west of UTC the same string renders as the
 * PREVIOUS day, so `toLocaleDateString({ month: "short" })` on "2026-10-01"
 * prints "Sep" in Europe and "Oct" in Manila. A farmer in Manila and a reviewer
 * in London then read different months off the same record.
 *
 * Splitting the components and constructing with the local constructor pins the
 * calendar day regardless of the viewer's timezone.
 *
 * @param {string | null | undefined} isoDate  YYYY-MM-DD (or a full ISO timestamp)
 * @returns {Date | null}  local-midnight Date, or null when unparseable
 */
export function parseLocalDate(isoDate) {
  if (isoDate == null || isoDate === "") return null;
  if (isoDate instanceof Date) {
    return Number.isNaN(isoDate.getTime()) ? null : isoDate;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate).trim());
  if (!match) {
    const fallback = new Date(isoDate);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format an ISO date as a short month name, timezone-safe.
 * Returns the fallback when the value is missing or unparseable.
 *
 * `locale` defaults to "en-US" so existing call sites are unchanged. Pass an
 * active language code to localize the month name — Intl resolves "ceb", "fil"
 * and "tl" to their own abbreviations, so the hardcoded default would otherwise
 * render "Okt" as "Oct" for a farmer who selected Cebuano.
 */
export function formatMonthShort(isoDate, fallback = "–", locale = "en-US") {
  const parsed = parseLocalDate(isoDate);
  if (!parsed) return fallback;
  return parsed.toLocaleDateString(locale, { month: "short" });
}

/**
 * Join a crop name and its variety into a single display label.
 *
 * The planting rules are keyed on (crop, variety, county, season), so
 * "Carrots" alone is ambiguous between Big, Medium and Small, which are scored
 * independently. The variety is therefore always shown when the data has one.
 *
 * @param {string|null} name
 * @param {string|null} variety
 * @param {string} [fallback]  used when there is no name at all
 * @returns {string}
 */
export function formatCropLabel(name, variety, fallback = "–") {
  const base = (name ?? "").trim();
  if (!base) return fallback;
  const v = (variety ?? "").trim();
  return v ? `${base} (${v})` : base;
}

/**
 * Same as :func:`formatCropLabel` but accepts either a camelCase or a
 * snake_case record, so it works on API responses and on normalized state.
 */
export function cropLabelOf(item) {
  if (!item) return "–";
  return formatCropLabel(
    item.name ?? item.commodity_name ?? item.commodityName,
    item.variety ?? item.commodity_variety ?? item.commodityVariety,
  );
}

/**
 * Format a date or a "YYYY-MM" string as a short month plus year, e.g. "Oct 2026".
 *
 * The API sends a planting target month as "2026-10"; rendering that verbatim
 * inside a sentence puts an ISO string in front of the farmer.
 */
export function formatMonthYear(value, fallback = "–", locale = "en-US") {
  // A bare YYYY-MM has no day component, so anchor it to the 1st.
  const iso = /^\d{4}-\d{2}$/.test(String(value ?? "").trim())
    ? `${value}-01`
    : value;
  const parsed = parseLocalDate(iso);
  if (!parsed) return value == null || value === "" ? fallback : String(value);
  return parsed.toLocaleDateString(locale, { month: "short", year: "numeric" });
}
