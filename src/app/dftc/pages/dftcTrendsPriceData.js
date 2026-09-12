/**
 * DFTC Trends Price Trends — map prices API payloads into existing chart/card shapes.
 * Does not run forecasting. Reads recent_records + forecast (+ forecast.points).
 */

import {
  catalogPairsFromPriceList,
  findCommodityId as adminFindCommodityId,
  recentAveragePrice,
  toPriceTypeKey as adminToPriceTypeKey,
} from "../../admin/pages/AdminForecasting";

const PERIOD_DAYS = {
  "7d": 7,
  "14d": 14,
  "21d": 21,
  "28d": 28,
};

function isoDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function numericPrice(value) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/** Align UI "Chinese Pechay" with API/catalog "Chinese Petchay". */
function normalizeCommodityLabel(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/pechay/g, "petchay");
}

function normalizeVarietyLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === "no variety") return "";
  return normalized;
}

function toPriceTypeKey(market, priceType) {
  return adminToPriceTypeKey(market, priceType);
}

function isApiBackedPriceSeries(market, priceType) {
  const marketLabel = String(market || "").toLowerCase();
  const typeLabel = String(priceType || "").toLowerCase();
  if (typeLabel.includes("landing")) return false;
  if (marketLabel.includes("dftc")) return true;
  if (marketLabel.includes("bangkerohan") || marketLabel.includes("bankerohan")) return true;
  return false;
}

function findCommodityId(pairs, commodity, variety) {
  const name = normalizeCommodityLabel(commodity);
  const varietyKey = normalizeVarietyLabel(variety);
  const match = (pairs || []).find((pair) => {
    if (normalizeCommodityLabel(pair.commodity) !== name) return false;
    return normalizeVarietyLabel(pair.variety) === varietyKey;
  });
  return match?.commodity_id || adminFindCommodityId(pairs, commodity, variety) || null;
}

function catalogPairsForCommodity(pairs, commodity) {
  const name = normalizeCommodityLabel(commodity);
  return (pairs || []).filter((pair) => normalizeCommodityLabel(pair.commodity) === name);
}

function varietyDisplayKey(commodity, variety) {
  const label = String(variety || "").trim();
  return label || commodity;
}

function periodDayCount(preset) {
  return PERIOD_DAYS[preset] || 7;
}

function addDaysIso(iso, days) {
  const stamp = isoDate(iso);
  const [y, m, d] = stamp.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Period filter applies to historical actuals only.
 * Forecast points are never filtered by Period.
 */
function filterRecordsByPeriod(records, preset, customFrom, customTo) {
  const rows = (records || [])
    .map((row) => ({ ...row, price_date: isoDate(row.price_date || row.date) }))
    .filter((row) => row.price_date);

  if (preset === "custom" && customFrom && customTo) {
    const from = isoDate(customFrom);
    const to = isoDate(customTo);
    return rows.filter((row) => row.price_date >= from && row.price_date <= to);
  }

  if (!rows.length) return [];
  const latest = rows.reduce(
    (max, row) => (row.price_date > max ? row.price_date : max),
    rows[0].price_date
  );
  const days = periodDayCount(preset);
  const cutoff = addDaysIso(latest, -(days - 1));
  return rows.filter((row) => row.price_date >= cutoff && row.price_date <= latest);
}

function buildHistoricalChartData(varietyDetails, preset, customFrom, customTo) {
  const dateSet = new Set();
  const byVariety = new Map();

  for (const entry of varietyDetails || []) {
    const key = entry.varietyKey;
    const filtered = filterRecordsByPeriod(
      entry.detail?.recent_records,
      preset,
      customFrom,
      customTo
    );
    const pricesByDate = new Map();
    for (const row of filtered) {
      const price = numericPrice(row.prevail_price ?? row.price);
      if (price == null) continue;
      pricesByDate.set(row.price_date, price);
      dateSet.add(row.price_date);
    }
    byVariety.set(key, pricesByDate);
  }

  const dates = [...dateSet].sort((a, b) => a.localeCompare(b));
  return dates.map((date) => {
    const point = { date };
    for (const [key, pricesByDate] of byVariety) {
      point[key] = pricesByDate.has(date) ? pricesByDate.get(date) : null;
    }
    return point;
  });
}

function buildForecastChartData(varietyDetails) {
  const dateSet = new Set();
  const byVariety = new Map();

  for (const entry of varietyDetails || []) {
    const key = entry.varietyKey;
    const points = entry.detail?.forecast?.points || [];
    const byDate = new Map();
    for (const point of points) {
      const date = isoDate(point.forecast_date);
      const mid = numericPrice(point.forecast_midpoint);
      if (!date || mid == null) continue;
      byDate.set(date, {
        mid,
        lo: numericPrice(point.lower_forecast),
        hi: numericPrice(point.upper_forecast),
      });
      dateSet.add(date);
    }
    byVariety.set(key, byDate);
  }

  const dates = [...dateSet].sort((a, b) => a.localeCompare(b));
  return dates.map((date) => {
    const point = { date };
    for (const [key, byDate] of byVariety) {
      const fc = byDate.get(date);
      if (!fc) {
        point[key] = null;
        continue;
      }
      point[key] = fc.mid;
      if (fc.lo != null) point[`${key}__lo`] = fc.lo;
      if (fc.hi != null) point[`${key}__hi`] = fc.hi;
    }
    return point;
  });
}

function buildHistoricalSummaries(varietyDetails, preset, customFrom, customTo) {
  return (varietyDetails || []).map((entry) => {
    const filtered = filterRecordsByPeriod(
      entry.detail?.recent_records,
      preset,
      customFrom,
      customTo
    );
    const ordered = [...filtered].sort((a, b) =>
      isoDate(b.price_date).localeCompare(isoDate(a.price_date))
    );
    const latest = ordered[0] ? numericPrice(ordered[0].prevail_price) : null;
    const prev = ordered[1] ? numericPrice(ordered[1].prevail_price) : null;
    const change =
      latest != null && prev != null && prev > 0 ? ((latest - prev) / prev) * 100 : null;
    return {
      variety: entry.varietyKey,
      latest,
      prev,
      change,
      records: ordered.length,
    };
  });
}

/**
 * Summary cards use the selected horizon endpoint (+7/+14/+21/+28),
 * not the +1 point and not an average of daily points.
 * Forecast Change stays unimplemented (null → "—").
 */
function buildForecastSummaries(varietyDetails) {
  return (varietyDetails || []).map((entry) => {
    const forecast = entry.detail?.forecast || null;
    const records = entry.detail?.recent_records || [];
    const recentAvg = recentAveragePrice(records);
    if (!forecast) {
      return {
        variety: entry.varietyKey,
        avgMid: null,
        lo: null,
        hi: null,
        recentAvg,
        change: null,
      };
    }
    return {
      variety: entry.varietyKey,
      avgMid: numericPrice(forecast.forecast_midpoint),
      lo: numericPrice(forecast.lower_forecast),
      hi: numericPrice(forecast.upper_forecast),
      recentAvg,
      change: null,
    };
  });
}

function buildTableRows(varietyDetails, commodity, preset, customFrom, customTo) {
  const rows = [];
  for (const entry of varietyDetails || []) {
    const filtered = filterRecordsByPeriod(
      entry.detail?.recent_records,
      preset,
      customFrom,
      customTo
    );
    for (const row of filtered) {
      const price = numericPrice(row.prevail_price);
      if (price == null) continue;
      rows.push({
        date: isoDate(row.price_date),
        variety: entry.varietyKey,
        price,
      });
    }
  }
  rows.sort((a, b) => b.date.localeCompare(a.date));
  return rows;
}

function varietiesFromDetails(varietyDetails, commodity) {
  return (varietyDetails || []).map((entry) => ({
    variety: entry.varietyKey === commodity ? "" : entry.varietyKey,
  }));
}

export {
  buildForecastChartData,
  buildForecastSummaries,
  buildHistoricalChartData,
  buildHistoricalSummaries,
  buildTableRows,
  catalogPairsForCommodity,
  catalogPairsFromPriceList,
  findCommodityId,
  filterRecordsByPeriod,
  isApiBackedPriceSeries,
  normalizeCommodityLabel,
  periodDayCount,
  recentAveragePrice,
  toPriceTypeKey,
  varietiesFromDetails,
  varietyDisplayKey,
};
