/**
 * Admin Text Template Library
 *
 * Authoritative text templates defined in:
 * api/docs/frontend_backend_mapping/Admin - Frontend to Backend Mapping.md
 */

export const ADMIN_TEXT_TEMPLATES = {
  // Forecasting Page: Price Outlook Calculation — Explanation
  priceOutlookExplanation:
    "The forecast midpoint ({forecast_midpoint}) is {comparison} the recent average price ({recent_average}) with a forecast change of {forecast_change}, so the Price Outlook is classified as {price_outlook}.",
  priceOutlookExplanationNoChange:
    "The forecast midpoint ({forecast_midpoint}) is {comparison} the recent average price ({recent_average}), so the Price Outlook is classified as {price_outlook}.",
  priceOutlookFallback: "Price Outlook could not be calculated for this forecast.",

  // Analytical Modules Basis Fallbacks
  basisNoExplanation: "No explanation available.",
  basisScopeEmpty: "No analytical explanation generated for the selected scope.",
};

/**
 * Format a numeric price to currency string with strictly 2 decimal places and /kg unit.
 *
 * @param {number|string|null} value
 * @returns {string} e.g. "₱84.00/kg"
 */
export function formatTemplateMoney(value) {
  if (value == null || value === "") return "-/kg";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("₱") && trimmed.endsWith("/kg")) {
      return trimmed;
    }
    const cleanNum = Number(trimmed.replace(/[₱,\s/kg]/gi, ""));
    if (Number.isFinite(cleanNum)) {
      return `₱${cleanNum.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg`;
    }
    return trimmed;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) return "-/kg";
  return `₱${num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg`;
}

/**
 * Format a percentage change to signed string with strictly 2 decimal places.
 *
 * @param {number|string|null} value
 * @returns {string|null} e.g. "+20.00%" or "-5.10%"
 */
export function formatTemplateChange(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.endsWith("%")) return trimmed;
    const cleanNum = Number(trimmed.replace(/[%,\s]/gi, ""));
    if (Number.isFinite(cleanNum)) {
      const sign = cleanNum > 0 ? "+" : "";
      return `${sign}${cleanNum.toFixed(2)}%`;
    }
    return trimmed;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
}

/**
 * Format the Price Outlook explanation from forecast midpoint, recent average, and classification.
 * Matches the enhanced official template:
 * "The forecast midpoint ({forecast_midpoint}) is {comparison} the recent average price ({recent_average}) with a forecast change of {forecast_change}, so the Price Outlook is classified as {price_outlook}."
 *
 * @param {Object} params
 * @param {number|null} [params.midpoint] - Forecast midpoint price
 * @param {number|null} [params.recentAverage] - Recent average price
 * @param {number|string|null} [params.changePercent] - Forecast price change percentage
 * @param {string|null} [params.outlook] - Classification ('Favorable', 'Neutral', 'Unfavorable')
 * @param {string|null} [params.customExplanation] - Optional explicit explanation override from API
 * @returns {string} Formatted explanation string
 */
export function formatPriceOutlookExplanation({
  midpoint,
  recentAverage,
  changePercent,
  outlook,
  customExplanation,
} = {}) {
  // If customExplanation already has concrete values populated, preserve it
  if (customExplanation && (customExplanation.includes("₱") || customExplanation.includes("%"))) {
    return customExplanation;
  }
  if (midpoint == null || recentAverage == null || !outlook) {
    return ADMIN_TEXT_TEMPLATES.priceOutlookFallback;
  }

  const numMidpoint = typeof midpoint === "number" ? midpoint : Number(String(midpoint).replace(/[₱,\s/kg]/gi, ""));
  const numAverage = typeof recentAverage === "number" ? recentAverage : Number(String(recentAverage).replace(/[₱,\s/kg]/gi, ""));

  const comparison =
    numMidpoint > numAverage
      ? "above"
      : numMidpoint < numAverage
      ? "below"
      : "equal to";

  const formattedMidpoint = formatTemplateMoney(midpoint);
  const formattedAverage = formatTemplateMoney(recentAverage);
  const formattedChange = formatTemplateChange(changePercent);

  if (formattedChange) {
    return ADMIN_TEXT_TEMPLATES.priceOutlookExplanation
      .replace("{forecast_midpoint}", formattedMidpoint)
      .replace("{comparison}", comparison)
      .replace("{recent_average}", formattedAverage)
      .replace("{forecast_change}", formattedChange)
      .replace("{price_outlook}", outlook);
  }

  return ADMIN_TEXT_TEMPLATES.priceOutlookExplanationNoChange
    .replace("{forecast_midpoint}", formattedMidpoint)
    .replace("{comparison}", comparison)
    .replace("{recent_average}", formattedAverage)
    .replace("{price_outlook}", outlook);
}
