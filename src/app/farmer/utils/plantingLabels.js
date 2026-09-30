/**
 * Translation of planting-suitability vocabulary.
 *
 * Two distinct kinds of server-sent text have to reach the farmer, and they
 * need different treatment:
 *
 * 1. **Localized refs** — `{ code, params }` objects. The API deliberately does
 *    not build finished sentences for farmer-facing messages, because it cannot
 *    know which of the three locales the client is rendering in. These map
 *    straight onto an i18n key.
 *
 * 2. **Stored English columns** — `advisory_category` and `weather_risk_level`
 *    live in the database behind a CHECK constraint, so their values are fixed
 *    English strings. They are mapped to i18n keys by value.
 *
 * Both paths are guarded: an unrecognised code or category renders nothing
 * rather than leaking a raw key like `farmer.plantingSuitability.notes.…` into
 * the UI, which is worse than showing nothing.
 */

import { formatMonthShort, formatMonthYear, parseLocalDate } from "./formatters";

/** Server `LocalizedRef.code` -> i18n key. */
const REF_KEYS = {
  "notes.no_district": "farmer.plantingSuitability.notes.no_district",
  "notes.no_forecast": "farmer.plantingSuitability.notes.no_forecast",
  "notes.no_rules": "farmer.plantingSuitability.notes.no_rules",
  "notes.no_duration": "farmer.plantingSuitability.notes.no_duration",
  "notes.partial_rules": "farmer.plantingSuitability.notes.partial_rules",
  "excluded.no_rules": "farmer.plantingSuitability.excluded.no_rules",
  "excluded.window_closed": "farmer.plantingSuitability.excluded.window_closed",
  "excluded.no_forecast_covers_window":
    "farmer.plantingSuitability.excluded.no_forecast_covers_window",
  "excluded.no_duration": "farmer.plantingSuitability.excluded.no_duration",
  "excluded.no_data_ranked": "farmer.plantingSuitability.excluded.no_data_ranked",
};

/**
 * Render a server `{ code, params }` message in the active language.
 *
 * @param {{code: string, params?: object} | null | undefined} ref
 * @param {Function} t  the i18n translate function
 * @param {string} [lang]  active language code, for localizing date params
 * @returns {string}  empty string when there is nothing to show
 */
export function localizedRefText(ref, t, lang = "en-US") {
  if (!ref || !ref.code) return "";
  const key = REF_KEYS[ref.code];
  if (!key) return "";

  // Pre-format date parameters so locales do not have to parse ISO strings.
  const params = { ...(ref.params || {}) };
  if (params.end) params.end = formatMonthShort(params.end, "–", lang);
  // harvest_month arrives as "2026-10"; a bare ISO month in a sentence reads as
  // machine output.
  if (params.month) params.month = formatMonthYear(params.month, "–", lang);

  const text = t(key, params, "");
  // `t` echoes the key back when it cannot resolve, which would put a dotted
  // translation key on screen. Treat that as "no translation available".
  return text === key ? "" : text;
}

/**
 * The three values admitted by the `monthly_crop_rec_advisory_category_check`
 * CHECK constraint on `advisory_category`.
 */
const ADVISORY_CATEGORIES = {
  Recommended: { key: "farmer.advisory.labels.recommended", tone: "recommended" },
  "Proceed with Caution": {
    key: "farmer.advisory.labels.proceed_with_caution",
    tone: "caution",
  },
  "Avoid for Now": { key: "farmer.advisory.labels.avoid_for_now", tone: "avoid" },
};

/** The three values admitted by the `weather_risk_level` CHECK constraint. */
const WEATHER_RISK_LEVELS = {
  Suitable: { key: "farmer.plantingSuitability.risk.suitable", tone: "recommended" },
  Caution: { key: "farmer.plantingSuitability.risk.caution", tone: "caution" },
  Severe: { key: "farmer.plantingSuitability.risk.severe", tone: "avoid" },
};

const TONE_CLASSES = {
  recommended: "bg-emerald-50 text-emerald-700",
  caution: "bg-amber-50 text-amber-700",
  avoid: "bg-red-50 text-red-700",
};

function describe(value, table, t) {
  const entry = table[value];
  if (!entry) return null;
  const text = t(entry.key, {}, "");
  if (text === entry.key) return null;
  return { text, tone: entry.tone };
}

/**
 * Localized label and visual tone for a stored `advisory_category`.
 *
 * Replaces the previous `category === "Recommended"` string comparison, which
 * silently turned every unrecognised value red.
 *
 * @returns {{text: string, tone: string} | null}  null when the value is unknown
 */
export function advisoryCategoryLabel(category, t) {
  return describe(category, ADVISORY_CATEGORIES, t);
}

/**
 * Localized label and visual tone for a stored `weather_risk_level`.
 *
 * @returns {{text: string, tone: string} | null}
 */
export function weatherRiskLabel(level, t) {
  return describe(level, WEATHER_RISK_LEVELS, t);
}

/** Badge classes for a tone returned by the two helpers above. */
export function toneClasses(tone) {
  return TONE_CLASSES[tone] || TONE_CLASSES.avoid;
}

/**
 * One short, fully-localized line describing a monthly recommendation.
 *
 * Replaces the stored `explanation` column, which is English prose assembled
 * from the 142 `advisory_template` strings in `crop_weather_rules` and so
 * cannot be translated client-side. The sowing window is the single most
 * actionable fact and needs no translation beyond its month name.
 *
 * @returns {string}  empty string when no window is recorded
 */
export function recommendationLine(rec, t, lang = "en-US") {
  const start = rec.planting_window_start;
  const end = rec.planting_window_end;
  if (!start || !end) return "";

  const from = parseLocalDate(start);
  const to = parseLocalDate(end);
  if (!from || !to || from.getTime() === to.getTime()) {
    return t(
      "farmer.plantingSuitability.sow_on",
      { date: formatMonthShort(start, "–", lang) },
      "Sow on {date}",
    );
  }
  return t(
    "farmer.plantingSuitability.sow_between",
    {
      from: formatMonthShort(start, "–", lang),
      to: formatMonthShort(end, "–", lang),
    },
    "Sow {from}–{to}",
  );
}
