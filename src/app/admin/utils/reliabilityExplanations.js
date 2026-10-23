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

export const RELIABILITY_LEVELS = ["High", "Moderate", "Limited", "Low"];

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
  no_data_timeliness: 0.05,
  floor: 0.1,
  low_threshold: 0.4,
};

// Short explanations for the minimal bands table.
export const SHORT_BAND_EXPLANATIONS = {
  High: "Complete and fresh records; module weight applied in full (≥0.85).",
  Moderate: "Usable but aging or thin records; module weight scaled down.",
  Limited: "Sparse or stale records; weight heavily dampened (indicative only).",
  Low: "Insufficient records; falls back to neutral default (0.10 floor).",
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
    min: 0.65,
    max: 0.84,
    description: SHORT_BAND_EXPLANATIONS.Moderate,
  },
  {
    label: "Limited",
    min: 0.4,
    max: 0.64,
    description: SHORT_BAND_EXPLANATIONS.Limited,
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
  const stale = r.stale_after_days || 14;
  const count = e.available != null ? e.available : null;
  const age = e.age_days != null ? e.age_days : null;

  switch (resultId) {
    case "price-outlook": {
      if (level === "High") {
        const countText = count != null ? `${count} price records are on file` : "Price records are complete";
        const timeText = age != null
          ? `with the latest entry ${plural(age, "day")} old (within the ${stale}-day limit)`
          : (e.timeliness_basis === "forecast" ? "with active forecast coverage" : "with recent entries");
        return `${countText} ${timeText}. Sufficiency and timeliness criteria are satisfied, so the module's advisory weight is applied in full.`;
      }
      if (level === "Moderate") {
        const countText = count != null ? `${count} price records are on file` : "Price records are on file";
        const timeText = age != null && age > stale
          ? `with the latest entry ${age} days old (past the ${stale}-day limit)`
          : "with moderate historical depth";
        return `${countText} ${timeText}. The data remains usable, but the module's advisory weight is moderately scaled down.`;
      }
      if (level === "Limited") {
        const countText = count != null ? `Only ${count} price records are available` : "Price records are sparse";
        const timeText = age != null ? `with the latest entry dated ${e.latest_date || `${age} days old`}` : "or aging";
        return `${countText} ${timeText}. Due to limited sufficiency, price outlook estimates should be treated as indicative only.`;
      }
      const countText = count != null ? `Only ${count} price records were found` : "Too few price records exist";
      return `${countText}, falling short of reliable calculation thresholds. The module falls back to a neutral default and is flagged for insufficient data.`;
    }

    case "arrival-pressure": {
      if (level === "High") {
        const countText = count != null ? `${count} DFTC arrival records are on file` : "DFTC arrival records are complete";
        const timeText = age != null
          ? `with the latest entry ${plural(age, "day")} old (within the ${stale}-day limit)`
          : "with current entries";
        return `${countText} ${timeText}. Volume data satisfies sufficiency criteria, so the arrival pressure reading is weighted in full.`;
      }
      if (level === "Moderate") {
        const countText = count != null ? `${count} DFTC arrival records are on file` : "DFTC arrival records are on file";
        const timeText = age != null && age > stale
          ? `with the latest entry ${age} days old (past the ${stale}-day limit)`
          : "with volume history below the full-score threshold";
        return `${countText} ${timeText}. Arrival tracking is usable, but the module's advisory weight is scaled down.`;
      }
      if (level === "Limited") {
        const countText = count != null ? `Only ${count} DFTC arrival records are recorded` : "DFTC arrival records are sparse";
        return `${countText}, indicating thin or outdated tracking. The calculated supply pressure is heavily dampened and indicative only.`;
      }
      return "Insufficient DFTC arrival records are available to compute volume quartile thresholds. The module falls back to a neutral reading due to lack of usable data.";
    }

    case "historical-production": {
      const yearText = e.latest_year
        ? e.first_year != null && e.first_year !== e.latest_year
          ? `from ${e.first_year} through ${e.latest_year} (${plural(e.years_old ?? 0, "year")} old at the latest year)`
          : `from ${e.latest_year} (${plural(e.years_old ?? 0, "year")} old)`
        : null;
      if (level === "High") {
        const countText = count != null ? `${count} quarterly PSA production records are on file` : "Quarterly PSA production records are on file";
        const timeText = yearText ? `${yearText}, meeting the recency threshold` : "covering the multi-year benchmark window";
        return `${countText} ${timeText}. The baseline meets all historical depth criteria, so seasonal production is weighted in full.`;
      }
      if (level === "Moderate") {
        const countText = count != null ? `${count} quarterly PSA production records are on file` : "Quarterly PSA production records are on file";
        const timeText = e.years_old > 1 ? `with latest data from ${e.latest_year} (${e.years_old} years old)` : "covering fewer quarters than optimal";
        return `${countText} ${timeText}. Historical records are usable, but the baseline's advisory weight is moderately reduced.`;
      }
      if (level === "Limited") {
        const countText = count != null ? `Only ${count} quarterly PSA production records are recorded` : "Quarterly PSA records are sparse";
        return `${countText}, providing thin historical depth. Seasonal benchmarks are indicative only and have their weight dampened.`;
      }
      return "Too few quarterly PSA production records exist to build a reliable seasonal benchmark. The module falls back to a neutral production baseline.";
    }

    case "weather-risk": {
      if (level === "High") {
        const countText = count != null ? `${count} forecast days are loaded` : "Daily weather forecast days are loaded";
        return `${countText} with complete daily precipitation and temperature metrics. Forecast data meets timeliness criteria, so evaluated weather risk receives full weight.`;
      }
      if (level === "Moderate") {
        const countText = count != null ? `${count} forecast days are loaded` : "Daily forecast days are loaded";
        return `${countText}, covering part of the standard projection window. The weather assessment remains usable, but its advisory weight is moderately scaled down.`;
      }
      if (level === "Limited") {
        const countText = count != null ? `Only ${count} forecast days are available` : "Forecast days are sparse";
        return `${countText}, offering limited forward visibility. Weather risk indicators are indicative only with dampened weighting.`;
      }
      return "No usable daily weather forecast is currently loaded for the target location. The module falls back to a neutral risk rating until forecast entries are available.";
    }

    default:
      return `${MODULE_NAMES[resultId] || "This module"} is evaluated with ${level || "standard"} reliability. Its advisory weight is applied in accordance with data sufficiency rules.`;
  }
}

function dimensionDetail(dimension, score, evidence, rules) {
  const e = evidence || {};
  const unit = e.unit || "records";
  const stale = rules.stale_after_days;

  switch (dimension) {
    case "availability":
      return e.available > 0
        ? `${e.available} of ${e.required} required distinct ${unit} (${Math.round(Math.min(1, e.available / (e.required || 1)) * 100)}%).`
        : `No ${unit} found (score 0.00).`;

    case "timeliness":
      if (e.timeliness_basis === "forecast") {
        return "An active forecast covers the outlook window, so timeliness is scored 1.00.";
      }
      if (e.timeliness_basis === "forecast_available") {
        return e.available > 0
          ? `${plural(e.available, "forecast day")} loaded, so timeliness is scored 1.00 (0.00 when none).`
          : "No forecast days loaded (score 0.00).";
      }
      if (e.timeliness_basis === "latest_year") {
        return e.latest_year != null
          ? `Latest production year is ${e.latest_year} with ${e.latest_year_quarters ?? "some"} of 4 quarters available (${plural(e.years_old, "year")} old). Scored 1.00 when at most 1 year old, otherwise 0.20.`
          : "No production year on record (score 0.20).";
      }
      if (e.age_days == null) {
        return `No dated record found (score ${fmt2(rules.no_data_timeliness)}).`;
      }
      return e.age_days <= stale
        ? `Latest record is dated ${e.latest_date}, ${plural(e.age_days, "day")} old — within the ${stale}-day limit, so it scores 1.00.`
        : `Latest record is dated ${e.latest_date}, ${plural(e.age_days, "day")} old — past the ${stale}-day limit. The score drops linearly to ${fmt2(rules.no_data_timeliness)} at ${stale * 2} days.`;

    case "validity":
      return e.available > 0
        ? `${e.available} usable ${unit}; required values, formats, ranges, and duplicate checks passed.`
        : `No usable ${unit} found (score 0.00).`;

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
  const calculation = `${terms} = ${sum.toFixed(4)}${floored ? `, raised to the ${fmt2(effectiveRules.floor)} floor` : ""}`;

  return { summary, rows, calculation };
}

/** Short statement of the scoring rules, quoted with the real values. */
export function buildReliabilityRuleLines(rules) {
  const r = rules || FALLBACK_RELIABILITY_RULES;
  const w = r.dimension_weights;
  return [
    `Reliability score = ${DIMENSION_ORDER.map((d) => `${fmt2(w[d])} × ${DIMENSION_LABELS[d]}`).join(" + ")}, each dimension scored 0.00–1.00 and the result never lower than ${fmt2(r.floor)}.`,
    `Timeliness is 1.00 when the latest record is at most ${r.stale_after_days} days old, then falls linearly to ${fmt2(r.no_data_timeliness)} at ${r.stale_after_days * 2} days.`,
  ];
}
