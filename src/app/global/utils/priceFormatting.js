/**
 * Price Formatting Utilities
 *
 * Implements the standard Price Difference (Percentage) format:
 *   Price Difference (Percentage)
 *
 * Examples:
 *   Price increases by ₱11 (2%):      +₱11 (+2%)
 *   Price decreases by ₱15 (5%):      -₱15 (-5%)
 *   Price increases by ₱8.50 (3.5%):  +₱8.50 (+3.5%)
 *   No price change:                  ₱0 (0%)
 *   Forecast ₱61 vs Baseline ₱50:     +₱11 (+22%)
 */

export function formatPriceChangeDisplay(diff, pct, options = {}) {
  let numDiff = diff != null && Number.isFinite(Number(diff)) ? Number(diff) : null;
  let numPct = pct != null && Number.isFinite(Number(pct)) ? Number(pct) : null;

  const refPrice =
    options.referencePrice != null && Number.isFinite(Number(options.referencePrice))
      ? Number(options.referencePrice)
      : null;
  const fcPrice =
    options.forecastedPrice != null && Number.isFinite(Number(options.forecastedPrice))
      ? Number(options.forecastedPrice)
      : null;

  if (numDiff == null && fcPrice != null && refPrice != null) {
    numDiff = fcPrice - refPrice;
  }

  if (numPct == null && numDiff != null && refPrice != null && refPrice > 0) {
    numPct = (numDiff / refPrice) * 100;
  } else if (numDiff == null && numPct != null && refPrice != null && refPrice > 0) {
    numDiff = refPrice * (numPct / 100);
  }

  if (numDiff == null && numPct == null) {
    return options.fallback ?? "—";
  }

  const isZeroDiff = numDiff == null || Math.abs(numDiff) < 0.005;
  const isZeroPct = numPct == null || Math.abs(numPct) < 0.05;

  if (isZeroDiff && isZeroPct) {
    const unitStr = options.includeUnit ? "/kg" : "";
    let zeroStr = options.hidePercent || options.showPercent === false
      ? `₱0${unitStr}`
      : `₱0${unitStr} (0%)`;
    if (options.direction) {
      zeroStr += ` · ${options.direction}`;
    }
    return zeroStr;
  }

  const isPositive =
    (numDiff != null && numDiff > 0.005) || (numDiff == null && numPct != null && numPct > 0.05);
  const isNegative =
    (numDiff != null && numDiff < -0.005) || (numDiff == null && numPct != null && numPct < -0.05);
  const sign = isPositive ? "+" : isNegative ? "-" : "";

  let diffStr = "0";
  if (numDiff != null) {
    const absDiff = Math.abs(numDiff);
    if (options.decimals != null) {
      diffStr = absDiff.toFixed(options.decimals);
    } else if (Math.abs(absDiff - Math.round(absDiff)) < 0.005) {
      diffStr = Math.round(absDiff).toString();
    } else {
      diffStr = absDiff.toFixed(2);
    }
  }

  let pctStr = "0%";
  if (numPct != null) {
    const absPct = Math.abs(numPct);
    let pctFormatted;
    if (options.pctDecimals != null) {
      pctFormatted = absPct.toFixed(options.pctDecimals);
    } else if (Math.abs(absPct - Math.round(absPct)) < 0.005) {
      pctFormatted = Math.round(absPct).toString();
    } else if (Math.abs(absPct * 10 - Math.round(absPct * 10)) < 0.05) {
      pctFormatted = absPct.toFixed(1);
    } else {
      pctFormatted = absPct.toFixed(2);
    }
    pctStr = `${sign}${pctFormatted}%`;
  }

  const unitStr = options.includeUnit ? "/kg" : "";
  let result = options.hidePercent || options.showPercent === false
    ? `${sign}₱${diffStr}${unitStr}`
    : `${sign}₱${diffStr}${unitStr} (${pctStr})`;

  if (options.direction) {
    result += ` · ${options.direction}`;
  }

  return result;
}

/**
 * Format market and price type into a user-facing label (e.g., "Bangkerohan Retail", "DFTC Wholesale").
 */
export function formatMarketPriceLabel(marketOrKey, priceType, fallback = "Bangkerohan Retail") {
  if (!marketOrKey && !priceType) return fallback;

  let str = String(marketOrKey || "").trim();
  let pStr = priceType ? String(priceType).trim() : "";

  if (str.includes("_") && !pStr) {
    const parts = str.split("_");
    str = parts[0];
    pStr = parts.slice(1).join(" ");
  }

  let m = "Bangkerohan";
  if (str.toLowerCase().includes("dftc")) {
    m = "DFTC";
  } else if (str.toLowerCase().includes("bangkerohan") || str.toLowerCase().includes("bankerohan") || str.toLowerCase().includes("bkr")) {
    m = "Bangkerohan";
  } else if (str) {
    m = str;
  }

  let p = "Retail";
  if (pStr.toLowerCase().includes("wholesale")) {
    p = "Wholesale";
  } else if (pStr.toLowerCase().includes("landing")) {
    p = "Landing";
  } else if (pStr.toLowerCase().includes("retail")) {
    p = "Retail";
  }

  return `${m} ${p}`;
}


