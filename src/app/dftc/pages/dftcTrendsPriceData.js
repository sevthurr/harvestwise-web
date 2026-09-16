/**
 * DFTC Trends Price Trends — map prices API payloads into existing chart/card shapes.
 * Does not run forecasting. Reads recent_records + forecast (+ forecast.points).
 * Re-exports shared utilities from priceChartTransforms.
 */

import {
  isoDate,
  numericPrice,
  normalizeCommodityLabel,
  normalizeVarietyLabel,
  toPriceTypeKey,
  isApiBackedPriceSeries,
  catalogPairsFromPriceList,
  catalogPairsForCommodity,
  varietyDisplayKey,
  findCommodityId,
  periodDayCount,
  filterRecordsByPeriod,
  buildHistoricalChartData,
  buildForecastChartData,
  recentAveragePrice,
  forecastChangePercent,
  formatChartDate,
  getAvailableVarietiesForCommodity,
  pickDefaultVariety,
  buildUnifiedPriceTrendData,
} from "../../global/utils/priceChartTransforms";

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
  filterRecordsByPeriod,
  findCommodityId,
  forecastChangePercent,
  formatChartDate,
  isApiBackedPriceSeries,
  normalizeCommodityLabel,
  periodDayCount,
  recentAveragePrice,
  toPriceTypeKey,
  varietiesFromDetails,
  varietyDisplayKey,
  getAvailableVarietiesForCommodity,
  pickDefaultVariety,
  buildUnifiedPriceTrendData,
};
