// Explanations for the Data Reliability classification shown on the Analytical
// Modules basis pages.
//
// The classification comes from the API (api/src/modules/advisory/
// reliability.py): three quality dimensions are scored 0.00-1.00, combined with
// fixed weights into a reliability factor/score, and the factor is mapped onto the
// High / Moderate / Limited / Low bands. The API also returns the per-dimension
// scores, the raw counts/dates behind them (`reliability_evidence`) and the
// scoring rules (`reliability_rules`), so everything quoted here is a real value
// from the computation - nothing is restated from memory.

export const RELIABILITY_LEVELS = ["High", "Moderate", "Low"];

export const DIMENSION_ORDER = ["availability", "timeliness", "validity"];

export const DIMENSION_LABELS = {
  availability: "Availability",
  timeliness: "Timeliness",
  validity: "Validity",
};

// Mirrors reliability.py in case an older payload carries no rules.
export const FALLBACK_RELIABILITY_RULES = {
  dimension_weights: { availability: 0.4, timeliness: 0.3, validity: 0.3 },
  stale_after_days: 14,
  timeliness_floor_after_days: 90,
  no_data_timeliness: 0.05,
  floor: 0.1,
  low_threshold: 0.4,
  high_threshold: 0.85,
};

// Short explanations for the minimal bands table.
export const SHORT_BAND_EXPLANATIONS = {
  High: "Data meets reliability requirements; full module weight.",
  Moderate: "Some data limitations; module weight is reduced.",
  Low: "Major data limitations; neutral fallback is used.",
};

// Mirrors RELIABILITY_BANDS in reliability.py (used only when the API sends none).
export const FALLBACK_RELIABILITY_BANDS = [
  {
    label: "High",
    min: 0.85,
    max: 1.0,
    description: SHORT_BAND_EXPLANATIONS.High,
  },
  {
    label: "Moderate",
    min: 0.40,
    max: 0.84,
    description: SHORT_BAND_EXPLANATIONS.Moderate,
  },
  {
    label: "Low",
    min: 0.0,
    max: 0.39,
    description: SHORT_BAND_EXPLANATIONS.Low,
  },
];

const MODULE_NAMES = {
  "price-outlook": "Price Outlook",
  "arrival-pressure": "Arrival Pressure",
  "historical-production": "Historical Seasonal Production Level",
  "weather-risk": "Weather Risk",
};

const fmt2 = (n) => Number(n).toFixed(2);
const plural = (n, word) => `${n} ${word}${Number(n) === 1 ? "" : "s"}`;

/**
 * 2-sentence summary for the card.
 * Quotes actual values (counts, recency, thresholds) without repeating the score or band range.
 */
export function buildReliabilitySummary({ resultId, level, evidence, rules }) {
  const e = evidence || {};
  const r = rules || FALLBACK_RELIABILITY_RULES;
  const count = e.available != null ? e.available : (e.available_months != null ? e.available_months : null);
  const age = e.age_days != null ? e.age_days : null;

  switch (resultId) {
    case "price-outlook": {
      const missed = e.missed_reporting_days != null ? e.missed_reporting_days : (e.missed_reporting_weekdays != null ? e.missed_reporting_weekdays : null);
      const isReportingDayMode = missed != null || (e.unit && e.unit.includes("reporting day"));
      const latestDateStr = e.latest_date || "recent";

      if (level === "High") {
        const countText = count != null
          ? (isReportingDayMode ? `${count} of ${e.required || count} expected reporting days have usable price observations` : `${count} price records are on file`)
          : "Price records are complete";
        const timeText = missed != null
          ? (missed === 0
            ? `Latest price: ${latestDateStr}. No reporting days missed; within the 2-day allowance.`
            : `Latest price: ${latestDateStr}. ${plural(missed, "reporting day")} missed; within the 2-day allowance.`)
          : `Latest price: ${latestDateStr}. Within freshness requirements.`;
        return `${countText}. ${timeText} Sufficiency and timeliness criteria are satisfied, so full module weight is applied.`;
      }
      if (level === "Moderate") {
        const countText = count != null
          ? (isReportingDayMode ? `${count} of ${e.required || count} expected reporting days are covered` : `${count} price records are on file`)
          : "Price records are on file";
        const timeText = missed != null
          ? `Latest price: ${latestDateStr}. ${plural(missed, "reporting day")} missed since latest observation.`
          : `Latest price: ${latestDateStr}. Moderate historical reporting depth.`;
        return `${countText}. ${timeText} Data remains usable, but module weight is reduced.`;
      }
      // Low
      const countText = count != null
        ? (isReportingDayMode ? `Only ${count} price reporting days were found` : `Only ${count} price records were found`)
        : "Too few price records exist";
      const timeNote = missed != null && missed > 10 ? ` (${missed} missed reporting days, critically stale)` : "";
      return `${countText}${timeNote}. Major data limitations apply; neutral fallback is used.`;
    }

    case "arrival-pressure": {
      const elapsed = e.elapsed_calendar_months != null ? e.elapsed_calendar_months : null;
      const latestMo = e.latest_arrival_month ? e.latest_arrival_month : "2025-12";
      if (level === "High") {
        const countText = count != null ? `${count} of ${e.required || 12} monthly arrival observations are available` : "DFTC monthly arrival observations are complete";
        const elapsedText = elapsed != null ? ` (${plural(elapsed, "month")} elapsed)` : "";
        return `${countText} (latest month: ${latestMo})${elapsedText}. Full coverage criteria are satisfied; full module weight is applied.`;
      }
      if (level === "Moderate") {
        const countText = count != null ? `${count} of ${e.required || 12} monthly arrival observations are available` : "DFTC monthly arrival observations are on file";
        const elapsedText = elapsed != null ? ` (${plural(elapsed, "month")} elapsed)` : "";
        return `${countText} (latest month: ${latestMo})${elapsedText}. The data satisfies computational minimums, but partial coverage or reporting lag reduces module weight.`;
      }
      // Low: Distinguish between coverage deficiency vs staleness
      if (count != null && count >= (e.min_required_months || 4) && elapsed != null && elapsed > 6) {
        return `${count} of ${e.required || 12} monthly arrival observations are available, but the latest record is ${plural(elapsed, "month")} old (${latestMo}). Reliability is Low because the data is outdated.`;
      }
      const countText = count != null && count > 0 ? `Only ${count} monthly arrival observation(s) are recorded` : "Insufficient monthly arrival observations are available";
      const stalenessNote = elapsed != null && elapsed > 6 ? ` (${elapsed} calendar months elapsed, critically stale)` : "";
      return `${countText}${stalenessNote}. Major data limitations apply; neutral fallback is used.`;
    }

    case "historical-production": {
      const latestPeriod = e.latest_period || (e.latest_year ? `${e.latest_year} ${e.latest_quarter || ""}`.trim() : null);
      const isOverdue = e.days_overdue != null && e.days_overdue > 0;
      const graceText = isOverdue
        ? `${e.earliest_missing_period || "next period"} is ${plural(e.days_overdue, "day")} overdue past HarvestWise grace deadline`
        : "the next expected quarter is not overdue";

      if (level === "High") {
        const countText = count != null
          ? `${count} usable quarterly production observations are available${latestPeriod ? ` through ${latestPeriod}` : ""}`
          : "Quarterly PSA production records are on file";
        return `${countText}. Baseline meets historical depth requirements (target: ${e.required || 20} quarters) and ${graceText}; full module weight is applied.`;
      }
      if (level === "Moderate") {
        const countText = count != null
          ? `${count} usable quarterly production observations are available${latestPeriod ? ` through ${latestPeriod}` : ""}`
          : "Quarterly PSA production records are on file";
        return `${countText}. Baseline is usable but ${isOverdue ? graceText : "covers fewer quarters than optimal"}; module weight is reduced.`;
      }
      // Low
      const countText = count != null && count > 0 ? `Only ${count} quarterly production records are available` : "Too few quarterly production records exist";
      return `${countText}. Major data limitations apply; neutral fallback is used.`;
    }

    case "weather-risk": {
      const availDays = e.available != null ? e.available : count;
      const reqDays = e.required || 14;
      if (level === "High") {
        const countText = availDays != null ? `${availDays} of ${reqDays} forecast days are available` : "14 of 14 forecast days are available";
        const ageText = e.age_hours != null ? ` (refreshed ${e.age_hours}h ago)` : " recently";
        return `${countText}. The forecast was refreshed${ageText} and meets freshness requirements; full module weight is applied.`;
      }
      if (level === "Moderate") {
        const countText = availDays != null ? `${availDays} of ${reqDays} forecast days are available` : "Daily forecast days are loaded";
        const warnText = e.unverified_freshness ? "freshness is unverified" : (e.age_hours != null ? `retrieved ${e.age_hours}h ago` : "partial forecast horizon");
        return `${countText} (${warnText}). Weather assessment remains usable, but module weight is reduced.`;
      }
      // Low
      const countText = availDays != null && availDays > 0 ? `Only ${availDays} daily forecast day(s) are available` : "No usable daily weather forecast is currently loaded";
      return `${countText} in the 14-day window. Major data limitations apply; neutral fallback is used.`;
    }

    default:
      return `${MODULE_NAMES[resultId] || "This module"} is evaluated with ${level || "standard"} reliability. Its advisory weight is applied in accordance with data sufficiency rules.`;
  }
}

export function dimensionDetail(dimension, score, evidence, rules) {
  const e = evidence || {};
  const rawUnit = e.unit || "records";
  const unit = rawUnit.startsWith("distinct ") ? rawUnit.slice(9) : rawUnit;
  const stale = rules.stale_after_days || 14;

  switch (dimension) {
    case "availability": {
      const count = e.available != null ? e.available : (e.available_months != null ? e.available_months : 0);
      const req = e.required != null ? e.required : (e.full_benchmark_months || e.min_required_months || 1);
      return count > 0
        ? `${count} of ${req} required distinct ${unit} (${Math.round(Math.min(1, count / req) * 100)}%).`
        : `No ${unit} found (score 0.00).`;
    }

    case "timeliness": {
      if (e.timeliness_basis === "missed_reporting_days" || e.timeliness_basis === "missed_reporting_weekdays") {
        const missed = e.missed_reporting_days != null ? e.missed_reporting_days : (e.missed_reporting_weekdays != null ? e.missed_reporting_weekdays : 0);
        return missed <= 2
          ? `Latest observation: ${e.latest_date || "recent"}. Missed reporting days: ${missed} (within 2-day allowance; score ${fmt2(score)}).`
          : `Latest observation: ${e.latest_date || "older"}. Missed reporting days: ${missed} (score ${fmt2(score)}).`;
      }
      if (e.timeliness_basis === "elapsed_calendar_months") {
        const elapsed = e.elapsed_calendar_months != null ? e.elapsed_calendar_months : 0;
        return `Latest arrival observation: ${e.latest_arrival_month || e.latest_date || "recent"}. Age: ${plural(elapsed, "calendar month")} (score ${fmt2(score)}).`;
      }
      if (e.timeliness_basis === "provisional_quarter_grace_period") {
        const overdue = e.days_overdue != null ? e.days_overdue : 0;
        return overdue === 0
          ? `Next expected period: ${e.earliest_missing_period || "subsequent quarter"}. Grace deadline: not overdue (score ${fmt2(score)}).`
          : `Next expected period: ${e.earliest_missing_period || "subsequent quarter"}. Overdue: ${plural(overdue, "day")} past grace deadline (score ${fmt2(score)}).`;
      }
      if (e.timeliness_basis === "forecast") {
        return `An active forecast covers the outlook window (score ${fmt2(score)}).`;
      }
      if (e.timeliness_basis === "historical_benchmark_currency") {
        return `Active ${e.benchmark_year || 2025} historical arrival benchmark; currency scored ${fmt2(score)}.`;
      }
      if (
        e.timeliness_basis === "provisional_quarterly_lag" ||
        e.timeliness_basis === "official_publication_lag_adjusted" ||
        e.timeliness_basis === "latest_year"
      ) {
        const periodDesc = e.latest_period || (e.latest_year ? `${e.latest_year}${e.latest_quarter ? ` ${e.latest_quarter}` : ""}` : null);
        const lagDesc = e.quarters_lag != null ? `${e.quarters_lag} quarters lag` : (e.years_old != null ? `${plural(e.years_old, "year")} old` : null);
        return periodDesc
          ? `Latest production period is ${periodDesc}${lagDesc ? ` (${lagDesc})` : ""}; timeliness scored ${fmt2(score)} under quarterly publication lag rules.`
          : `No production records on file (score ${fmt2(score)}).`;
      }
      if (e.timeliness_basis === "unverified_retrieval_time" || e.unverified_freshness) {
        return `Forecast retrieval timestamp unavailable; freshness is unverified (conservative score ${fmt2(score)}, capped to Moderate).`;
      }
      if (e.timeliness_basis === "forecast_retrieval_age" || e.timeliness_basis === "retrieval_timestamp") {
        const ageDesc = e.age_hours != null ? `${e.age_hours}h old` : (e.age_days != null ? `${plural(e.age_days, "day")} old` : null);
        return ageDesc
          ? `Forecast retrieved ${ageDesc} (score ${fmt2(score)}).`
          : `Forecast retrieval timestamp verified (score ${fmt2(score)}).`;
      }
      if (e.timeliness_basis === "forecast_available") {
        const count = e.available != null ? e.available : 0;
        return count > 0
          ? `${plural(count, "forecast day")} loaded, so timeliness is scored ${fmt2(score)}.`
          : "No forecast days loaded (score 0.00).";
      }
      if (e.age_days == null) {
        return score > (rules.no_data_timeliness || 0.05)
          ? `Timeliness scored ${fmt2(score)} based on available benchmark evidence.`
          : `No dated record found (score ${fmt2(rules.no_data_timeliness || 0.05)}).`;
      }
      return e.age_days <= stale
        ? `Latest record is dated ${e.latest_date || "recent"}, ${plural(e.age_days, "day")} old (score ${fmt2(score)}).`
        : `Latest record is dated ${e.latest_date || "older"}, ${plural(e.age_days, "day")} old (past ${stale}-day limit; score ${fmt2(score)}).`;
    }

    case "validity": {
      const usable = e.valid_records != null ? e.valid_records : (e.usable_records != null ? e.usable_records : (e.available != null ? e.available : (score > 0 ? 1 : 0)));
      return score > 0 && usable > 0
        ? `${usable} usable ${unit} verified for calculation (score ${fmt2(score)}).`
        : `No usable ${unit} found (score 0.00).`;
    }

    default:
      return "";
  }
}

/**
 * Build the full data-backed explanation for the modal.
 *
 * Returns { summary, rows, calculation }:
 *  - summary: 2-sentence summary (with weakest dimension note appended if not High)
 *  - rows: one entry per dimension (label, score, weight, detail with real values)
 *  - calculation: the weighted sum that produced the factor
 */
export function buildReliabilityExplanation({ resultId, level, factor, bands, dimensions, evidence, rules }) {
  const effectiveRules = rules || FALLBACK_RELIABILITY_RULES;
  let summary = buildReliabilitySummary({
    resultId,
    level,
    factor,
    evidence,
    rules: effectiveRules,
  });

  if (!dimensions) return { summary, rows: [], calculation: "" };

  const weights = effectiveRules.dimension_weights;
  const rows = DIMENSION_ORDER.filter((d) => dimensions[d] != null).map((d) => ({
    key: d,
    label: DIMENSION_LABELS[d],
    score: Number(dimensions[d]),
    weight: weights[d],
    detail: dimensionDetail(d, Number(dimensions[d]), evidence, effectiveRules),
  }));

  if (level !== "High" && rows.length > 0) {
    const weakest = [...rows].sort((a, b) => a.score - b.score)[0];
    if (weakest.score < 1) {
      summary += ` The lowest-scoring dimension is ${weakest.label} (${fmt2(weakest.score)}).`;
    }
  }

  const sum = rows.reduce((acc, r) => acc + r.weight * r.score, 0);
  const terms = rows.map((r) => `${fmt2(r.weight)} × ${fmt2(r.score)}`).join(" + ");
  const floored = factor != null && Number(factor) > sum + 1e-9;
  const capped = factor != null && Number(factor) < sum - 1e-9;
  const calculation = `${terms} = ${sum.toFixed(4)}${
    floored
      ? `, raised to the ${fmt2(effectiveRules.floor)} floor`
      : (capped ? `, capped to ${Number(factor).toFixed(4)}` : "")
  }`;

  return { summary, rows, calculation };
}

/** Short statement of the scoring rules, quoted with the real values. */
export function buildReliabilityRuleLines(rules) {
  const r = rules || FALLBACK_RELIABILITY_RULES;
  const w = r.dimension_weights;
  return [
    `Reliability score = ${DIMENSION_ORDER.map((d) => `${fmt2(w[d])} × ${DIMENSION_LABELS[d]}`).join(" + ")}, each dimension scored 0.00–1.00 and the result never lower than ${fmt2(r.floor)}.`,
    `Timeliness is 1.00 when the latest record is at most ${r.stale_after_days} days old, then falls linearly to ${fmt2(r.no_data_timeliness)} at ${r.timeliness_floor_after_days ?? r.stale_after_days * 2} days.`,
  ];
}
