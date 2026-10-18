/**
 * client/src/app/global/utils/priceChartTransforms.js
 *
 * Shared price chart data transformation utilities for HarvestWise.
 * Authoritative helpers for mapping prices API payloads (recent_records + forecast.points)
 * into unified timeline data for ForecastPriceTrendChart and summary metrics.
 */

export function isoDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export function numericPrice(value) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function normalizeCommodityLabel(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/pechay/g, "petchay");
}

export function normalizeVarietyLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === "no variety") return "";
  return normalized;
}

export function toPriceTypeKey(market, priceType) {
  const marketKey = String(market || "").toLowerCase().includes("dftc")
    ? "dftc"
    : "bangkerohan";
  const typeKey = String(priceType || "").toLowerCase().includes("wholesale")
    ? "wholesale"
    : "retail";
  return `${marketKey}_${typeKey}`;
}

export function isApiBackedPriceSeries(market, priceType) {
  const marketLabel = String(market || "").toLowerCase();
  const typeLabel = String(priceType || "").toLowerCase();
  if (typeLabel.includes("landing")) return false;
  if (marketLabel.includes("dftc")) return true;
  if (marketLabel.includes("bangkerohan") || marketLabel.includes("bankerohan")) return true;
  return false;
}

export function catalogPairsFromPriceList(items) {
  return (items || [])
    .filter((item) => item?.name)
    .map((item) => ({
      commodity: item.name,
      variety: item.variety || null,
      commodity_id: item.commodity_id,
      prices: item.prices || null,
      record_count: item.record_count ?? null,
    }));
}

export function catalogPairsForCommodity(pairs, commodity) {
  const name = normalizeCommodityLabel(commodity);
  return (pairs || []).filter((pair) => normalizeCommodityLabel(pair.commodity) === name);
}

export function varietyDisplayKey(commodity, variety) {
  const label = String(variety || "").trim();
  return label || commodity;
}

export function findCommodityId(pairs, commodity, variety) {
  const name = normalizeCommodityLabel(commodity);
  const varietyKey = normalizeVarietyLabel(variety);

  if (!pairs || pairs.length === 0) return null;

  // 1. Exact match on commodity name and variety
  const match = pairs.find((pair) => {
    if (normalizeCommodityLabel(pair.commodity) !== name) return false;
    return normalizeVarietyLabel(pair.variety) === varietyKey;
  });
  if (match?.commodity_id) return match.commodity_id;

  // 2. Match on commodity name only if no variety was requested
  if (!varietyKey) {
    const nameMatch = pairs.find((pair) => normalizeCommodityLabel(pair.commodity) === name);
    return nameMatch?.commodity_id || null;
  }

  return null;
}

const PERIOD_DAYS = {
  "7d": 7,
  "14d": 14,
  "21d": 21,
  "28d": 28,
  "90d": 90,
  "all": 365,
};

export function periodDayCount(preset) {
  if (typeof preset === "number") return preset;
  return PERIOD_DAYS[preset] || 14;
}

function addDaysIso(iso, days) {
  const stamp = isoDate(iso);
  const [y, m, d] = stamp.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function filterRecordsByPeriod(records, preset, customFrom, customTo) {
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

export function buildHistoricalChartData(varietyDetails, preset = "7d", customFrom, customTo) {
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
    const point = { date, d: date };
    let firstVal = null;
    for (const [key, pricesByDate] of byVariety) {
      const p = pricesByDate.has(date) ? pricesByDate.get(date) : null;
      point[key] = p;
      if (firstVal == null && p != null) firstVal = p;
    }
    point.actual = firstVal;
    point.predicted = null;
    point.lower = null;
    point.upper = null;
    return point;
  });
}

export function buildForecastChartData(varietyDetails) {
  const actualDates = new Set();
  for (const entry of varietyDetails || []) {
    for (const row of entry.detail?.recent_records || []) {
      const d = isoDate(row.price_date || row.date);
      if (d) actualDates.add(d);
    }
  }

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
      // Skip forecast points that are on or before an observed actual price date
      if (actualDates.has(date)) continue;
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
    const point = { date, d: date };
    let firstMid = null;
    let firstLo = null;
    let firstHi = null;
    for (const [key, byDate] of byVariety) {
      const fc = byDate.get(date);
      if (!fc) {
        point[key] = null;
        continue;
      }
      point[key] = fc.mid;
      if (fc.lo != null) point[`${key}__lo`] = fc.lo;
      if (fc.hi != null) point[`${key}__hi`] = fc.hi;
      if (firstMid == null && fc.mid != null) {
        firstMid = fc.mid;
        firstLo = fc.lo;
        firstHi = fc.hi;
      }
    }
    point.actual = null;
    point.predicted = firstMid;
    point.lower = firstLo;
    point.upper = firstHi;
    return point;
  });
}

export function buildUnifiedPriceTrendData(historicalPoints = [], forecastPoints = [], options = {}) {
  const { connectTransition = true, varietyKeys = [] } = options;

  const hPoints = Array.isArray(historicalPoints) ? historicalPoints : [];
  const fPoints = Array.isArray(forecastPoints) ? forecastPoints : [];

  if (hPoints.length === 0 && fPoints.length === 0) return [];

  const mainKey = Array.isArray(varietyKeys) && varietyKeys.length > 0 ? varietyKeys[0] : null;

  const hist = hPoints.map((pt) => {
    const rawActual = pt.actual != null ? pt.actual : (mainKey ? pt[mainKey] : null);
    const numActual = numericPrice(rawActual);
    return {
      ...pt,
      date: pt.date || pt.d,
      d: pt.date || pt.d,
      actual: numActual,
      predicted: null,
      lower: null,
      upper: null,
      isTransition: false,
    };
  });

  const fc = fPoints.map((pt) => {
    const rawPred = pt.predicted != null ? pt.predicted : (mainKey ? pt[mainKey] : null);
    const rawLo = pt.lower != null ? pt.lower : (mainKey ? pt[`${mainKey}__lo`] : null);
    const rawHi = pt.upper != null ? pt.upper : (mainKey ? pt[`${mainKey}__hi`] : null);
    return {
      ...pt,
      date: pt.date || pt.d,
      d: pt.date || pt.d,
      actual: null,
      predicted: numericPrice(rawPred),
      lower: numericPrice(rawLo),
      upper: numericPrice(rawHi),
      isTransition: false,
    };
  });

  if (connectTransition && hist.length > 0 && fc.length > 0) {
    const lastHist = hist[hist.length - 1];
    if (lastHist.actual != null) {
      lastHist.predicted = lastHist.actual;
      lastHist.lower = lastHist.actual;
      lastHist.upper = lastHist.actual;
      lastHist.isTransition = true;
      lastHist.isBoundary = true;
      if (mainKey) {
        if (lastHist[`${mainKey}__lo`] === undefined) lastHist[`${mainKey}__lo`] = lastHist.actual;
        if (lastHist[`${mainKey}__hi`] === undefined) lastHist[`${mainKey}__hi`] = lastHist.actual;
      }
    }
  }

  return [...hist, ...fc];
}

export function getAvailableVarietiesForCommodity(catalogPairs, commodity, market, priceType) {
  const normName = normalizeCommodityLabel(commodity);
  const pKey = market && priceType ? toPriceTypeKey(market, priceType) : null;

  const matched = (catalogPairs || []).filter((pair) => {
    return normalizeCommodityLabel(pair.commodity) === normName;
  });

  if (matched.length === 0) return [];

  const hasPriceData = matched.some((p) => p.prices && Object.keys(p.prices).length > 0);
  let available = matched;
  if (hasPriceData && pKey) {
    const withPrice = matched.filter((p) => p.prices?.[pKey] != null && Number(p.prices[pKey]) > 0);
    if (withPrice.length > 0) {
      available = withPrice;
    }
  }

  const choices = available.map((p) => {
    const vStr = p.variety ? String(p.variety).trim() : null;
    const isNoVariety = !vStr || normalizeVarietyLabel(vStr) === "";
    return {
      value: isNoVariety ? null : vStr,
      label: isNoVariety ? null : vStr,
      isNoVariety,
      commodity_id: p.commodity_id,
      recordCount: p.record_count ?? (p.prices?.[pKey] != null ? 100 : 1),
    };
  });

  const seen = new Set();
  const uniqueChoices = [];
  for (const c of choices) {
    const key = c.value === null ? "__no_variety__" : c.value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueChoices.push(c);
    }
  }

  uniqueChoices.sort((a, b) => {
    if ((b.recordCount || 0) !== (a.recordCount || 0)) {
      return (b.recordCount || 0) - (a.recordCount || 0);
    }
    if (a.isNoVariety) return 1;
    if (b.isNoVariety) return -1;
    return String(a.value || "").localeCompare(String(b.value || ""));
  });

  return uniqueChoices;
}

export function pickDefaultVariety(availableChoices, currentSelection = null) {
  if (!availableChoices || availableChoices.length === 0) return null;

  if (currentSelection !== undefined && currentSelection !== null) {
    const existing = availableChoices.find((c) => {
      if (c.value === null && currentSelection === null) return true;
      return c.value != null && normalizeVarietyLabel(c.value) === normalizeVarietyLabel(currentSelection);
    });
    if (existing) return existing.value;
  }

  return availableChoices[0].value;
}

export function recentAveragePrice(records, window = 7) {
  const prices = (records || [])
    .map((row) => numericPrice(row?.prevail_price ?? row?.price))
    .filter((value) => value != null);
  const recent = prices.slice(0, window);
  if (recent.length === 0) return null;
  return recent.reduce((sum, price) => sum + price, 0) / recent.length;
}

export function forecastChangePercent(midpoint, recentAverage) {
  const mid = numericPrice(midpoint);
  const average = numericPrice(recentAverage);
  if (mid == null || average == null || average === 0) return null;
  return ((mid - average) / average) * 100;
}

export function formatChartDate(iso) {
  if (!iso) return "";
  const stamp = String(iso).slice(0, 10);
  const parts = stamp.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0])) return String(iso);
  const dObj = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return Number.isNaN(dObj.getTime())
    ? String(iso)
    : dObj.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
