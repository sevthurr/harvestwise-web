import React, { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ChevronRight,
  Info,
  Search,
  SlidersHorizontal,
  X,
  Check
} from "lucide-react";
import { COMMODITIES } from "../components/market/mockData";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { useDisplayMode } from "../../global/contexts/DisplayModeContext";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
const DUAL_FORECAST = {
  kamatis: { bangkerohan: { recentAvg: 82, forecastedPrice: 88, forecastLow: 84, forecastHigh: 95, changePct: 7.3, direction: "rising", directionLabel: "Likely to rise", reliability: "Moderate", reliabilityNote: "Moderate reliability based on recent Bangkerohan price records.", explanation: "Recent Bangkerohan price patterns suggest a possible increase based on historical price behavior.", generatedAt: "Jun 24, 6:00 AM" }, dftcRetail: { recentAvg: 80, forecastedPrice: 85, forecastLow: 80, forecastHigh: 91, changePct: 6.3, direction: "rising", directionLabel: "Likely to rise", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC retail price records.", explanation: "Recent DFTC retail price records show an upward pattern. Prices may continue to rise.", generatedAt: "Jun 24, 6:00 AM" }, dftcWholesale: { recentAvg: 76, forecastedPrice: 80, forecastLow: 75, forecastHigh: 86, changePct: 5.3, direction: "rising", directionLabel: "Likely to rise", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC wholesale price records.", explanation: "Recent DFTC wholesale price records show an upward pattern.", generatedAt: "Jun 24, 6:00 AM" } },
  talong: { bangkerohan: { recentAvg: 61, forecastedPrice: 61, forecastLow: 57, forecastHigh: 66, changePct: 0, direction: "stable", directionLabel: "Likely to remain stable", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on recent Bangkerohan price data.", explanation: "Bangkerohan price records show no clear trend. Prices may remain within a similar range.", generatedAt: "Jun 24, 6:00 AM" }, dftcRetail: { recentAvg: 57, forecastedPrice: 57, forecastLow: 54, forecastHigh: 61, changePct: 0, direction: "stable", directionLabel: "Likely to remain stable", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC retail price records.", explanation: "DFTC retail prices are expected to remain near their recent average.", generatedAt: "Jun 24, 6:00 AM" }, dftcWholesale: { recentAvg: 55, forecastedPrice: 55, forecastLow: 52, forecastHigh: 59, changePct: 0, direction: "stable", directionLabel: "Likely to remain stable", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC wholesale price records.", explanation: "DFTC wholesale prices are expected to remain near their recent average.", generatedAt: "Jun 24, 6:00 AM" } },
  repolyo: { bangkerohan: { recentAvg: 47, forecastedPrice: 42, forecastLow: 38, forecastHigh: 48, changePct: -10.6, direction: "falling", directionLabel: "Likely to fall", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on recent downward Bangkerohan price patterns.", explanation: "Recent Bangkerohan price patterns show a downward trend. Prices may continue to fall.", generatedAt: "Jun 24, 6:00 AM" }, dftcRetail: { recentAvg: 42, forecastedPrice: 38, forecastLow: 34, forecastHigh: 43, changePct: -9.5, direction: "falling", directionLabel: "Likely to fall", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC retail price records.", explanation: "DFTC retail price records show a downward pattern. Prices may continue to fall.", generatedAt: "Jun 24, 6:00 AM" }, dftcWholesale: { recentAvg: 38, forecastedPrice: 33, forecastLow: 30, forecastHigh: 38, changePct: -13.2, direction: "falling", directionLabel: "Likely to fall", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC wholesale price records.", explanation: "DFTC wholesale price records show a steeper downward pattern.", generatedAt: "Jun 24, 6:00 AM" } },
  atsal: { bangkerohan: { recentAvg: 115, forecastedPrice: 124, forecastLow: 118, forecastHigh: 132, changePct: 7.8, direction: "rising", directionLabel: "Likely to rise", reliability: "Moderate", reliabilityNote: "Moderate reliability based on recent Bangkerohan price records.", explanation: "Bangkerohan price records show an upward pattern. This trend may continue based on recent data.", generatedAt: "Jun 24, 6:00 AM" }, dftcRetail: { recentAvg: 112, forecastedPrice: 120, forecastLow: 114, forecastHigh: 128, changePct: 7.1, direction: "rising", directionLabel: "Likely to rise", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC retail price records.", explanation: "DFTC retail price records show an upward pattern. Prices may continue to rise.", generatedAt: "Jun 24, 6:00 AM" }, dftcWholesale: { recentAvg: 105, forecastedPrice: 112, forecastLow: 106, forecastHigh: 120, changePct: 6.7, direction: "rising", directionLabel: "Likely to rise", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC wholesale price records.", explanation: "DFTC wholesale price records show an upward pattern.", generatedAt: "Jun 24, 6:00 AM" } },
  carrots: { bangkerohan: { recentAvg: 90, forecastedPrice: 90, forecastLow: 85, forecastHigh: 96, changePct: 0, direction: "stable", directionLabel: "Likely to remain stable", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on recent Bangkerohan price data.", explanation: "Bangkerohan price records show a stable pattern. No significant movement is indicated.", generatedAt: "Jun 24, 6:00 AM" }, dftcRetail: { recentAvg: 85, forecastedPrice: 85, forecastLow: 80, forecastHigh: 91, changePct: 0, direction: "stable", directionLabel: "Likely to remain stable", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC retail price records.", explanation: "DFTC retail prices are expected to remain near their recent average.", generatedAt: "Jun 24, 6:00 AM" }, dftcWholesale: { recentAvg: 78, forecastedPrice: 78, forecastLow: 74, forecastHigh: 84, changePct: 0, direction: "stable", directionLabel: "Likely to remain stable", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC wholesale price records.", explanation: "DFTC wholesale prices are expected to remain near their recent average.", generatedAt: "Jun 24, 6:00 AM" } },
  pipino: { bangkerohan: { recentAvg: 39, forecastedPrice: 40, forecastLow: 37, forecastHigh: 44, changePct: 2.6, direction: "stable", directionLabel: "Likely to remain stable", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on recent Bangkerohan price data.", explanation: "Bangkerohan price records show a stable pattern with slight upward tendency.", generatedAt: "Jun 24, 6:00 AM" }, dftcRetail: { recentAvg: 37, forecastedPrice: 38, forecastLow: 35, forecastHigh: 42, changePct: 2.7, direction: "stable", directionLabel: "Likely to remain stable", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC retail price records.", explanation: "DFTC retail prices are expected to remain near their recent average.", generatedAt: "Jun 24, 6:00 AM" }, dftcWholesale: { recentAvg: 35, forecastedPrice: 35, forecastLow: 32, forecastHigh: 39, changePct: 0, direction: "stable", directionLabel: "Likely to remain stable", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC wholesale price records.", explanation: "DFTC wholesale prices are expected to remain near their recent average.", generatedAt: "Jun 24, 6:00 AM" } },
  ampalaya: { bangkerohan: { recentAvg: 71, forecastedPrice: 78, forecastLow: 73, forecastHigh: 84, changePct: 9.9, direction: "rising", directionLabel: "Likely to rise", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on recent Bangkerohan price behavior.", explanation: "Recent Bangkerohan price patterns suggest an upward movement. This trend may continue.", generatedAt: "Jun 24, 6:00 AM" }, dftcRetail: { recentAvg: 67, forecastedPrice: 73, forecastLow: 68, forecastHigh: 79, changePct: 9, direction: "rising", directionLabel: "Likely to rise", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC retail price records.", explanation: "DFTC retail price records suggest an upward trend. Prices may continue to rise.", generatedAt: "Jun 24, 6:00 AM" }, dftcWholesale: { recentAvg: 62, forecastedPrice: 67, forecastLow: 62, forecastHigh: 73, changePct: 8.1, direction: "rising", directionLabel: "Likely to rise", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC wholesale price records.", explanation: "DFTC wholesale price records suggest an upward trend.", generatedAt: "Jun 24, 6:00 AM" } },
  kalabasa: { bangkerohan: { recentAvg: 35, forecastedPrice: 35, forecastLow: 32, forecastHigh: 39, changePct: 0, direction: "stable", directionLabel: "Likely to remain stable", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on recent Bangkerohan price records.", explanation: "Bangkerohan price records show no clear trend. Prices have remained within a narrow range.", generatedAt: "Jun 24, 6:00 AM" }, dftcRetail: { recentAvg: 33, forecastedPrice: 33, forecastLow: 30, forecastHigh: 37, changePct: 0, direction: "stable", directionLabel: "Likely to remain stable", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC retail price records.", explanation: "DFTC retail prices are expected to remain near their recent average.", generatedAt: "Jun 24, 6:00 AM" }, dftcWholesale: { recentAvg: 30, forecastedPrice: 30, forecastLow: 28, forecastHigh: 34, changePct: 0, direction: "stable", directionLabel: "Likely to remain stable", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC wholesale price records.", explanation: "DFTC wholesale prices are expected to remain near their recent average.", generatedAt: "Jun 24, 6:00 AM" } },
  lettuce: { bangkerohan: { recentAvg: 86, forecastedPrice: 78, forecastLow: 72, forecastHigh: 84, changePct: -9.3, direction: "falling", directionLabel: "Likely to fall", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on recent Bangkerohan price patterns.", explanation: "Recent Bangkerohan price patterns show a downward trend. Prices may continue to fall.", generatedAt: "Jun 24, 6:00 AM" }, dftcRetail: { recentAvg: 80, forecastedPrice: 73, forecastLow: 67, forecastHigh: 79, changePct: -8.8, direction: "falling", directionLabel: "Likely to fall", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC retail price records.", explanation: "DFTC retail price records show a downward pattern. Prices may continue to fall.", generatedAt: "Jun 24, 6:00 AM" }, dftcWholesale: { recentAvg: 74, forecastedPrice: 67, forecastLow: 62, forecastHigh: 73, changePct: -9.5, direction: "falling", directionLabel: "Likely to fall", reliability: "Moderate", reliabilityNote: "Moderate reliability. Based on available DFTC wholesale price records.", explanation: "DFTC wholesale price records show a steeper downward pattern.", generatedAt: "Jun 24, 6:00 AM" } },
  pechay: { bangkerohan: { recentAvg: 38, forecastedPrice: 33, forecastLow: 30, forecastHigh: 37, changePct: -13.2, direction: "falling", directionLabel: "Likely to fall", reliability: "Low", reliabilityNote: "Low reliability. DFTC Arrival Volume unavailable; relies on Bangkerohan Price Behavior only.", explanation: "Recent Bangkerohan price records show a downward pattern.", generatedAt: "Jun 24, 6:00 AM" }, dftcRetail: { recentAvg: 34, forecastedPrice: 29, forecastLow: 26, forecastHigh: 33, changePct: -14.7, direction: "falling", directionLabel: "Likely to fall", reliability: "Low", reliabilityNote: "Low reliability. Limited DFTC retail price records available.", explanation: "DFTC retail price records show a downward pattern based on limited records.", generatedAt: "Jun 24, 6:00 AM" }, dftcWholesale: { recentAvg: 30, forecastedPrice: 26, forecastLow: 23, forecastHigh: 30, changePct: -13.3, direction: "falling", directionLabel: "Likely to fall", reliability: "Low", reliabilityNote: "Low reliability. Limited DFTC wholesale price records available.", explanation: "DFTC wholesale price records show a downward pattern based on limited records.", generatedAt: "Jun 24, 6:00 AM" } }
};
const tooltipStyle = { backgroundColor: "white", border: "1px solid var(--hw-neutral-200)", borderRadius: 8, fontSize: 11 };
const dirCfg = {
  rising: { Icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  stable: { Icon: Minus, color: "text-blue-600", bg: "bg-blue-50" },
  falling: { Icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" }
};
const relDot = (r) => r === "High" ? "bg-emerald-500" : r === "Moderate" ? "bg-amber-400" : "bg-[var(--hw-neutral-300)]";
const periodDays = (p) => p === "7d" ? 7 : p === "14d" ? 14 : p === "21d" ? 21 : 28;
const periodLabel = (p) => p === "7d" ? "7 days" : p === "14d" ? "14 days" : p === "21d" ? "21 days" : "28 days";
function makeChart(rec, period) {
  const days = periodDays(period);
  const step = (rec.forecastedPrice - rec.recentAvg) / days;
  return Array.from({ length: days + 1 }, (_, i) => ({
    d: i === 0 ? "Now" : `+${i}d`,
    actual: i === 0 ? rec.recentAvg : void 0,
    forecast: Math.round(rec.recentAvg + step * i),
    high: Math.round(rec.forecastLow + (rec.forecastHigh - rec.forecastLow) * 0.35 + step * i * 1.1),
    low: Math.round(rec.forecastLow + step * i * 0.9)
  }));
}
function dualComparisonNote(b, d) {
  if (b.direction === d.direction) {
    const ds = b.direction === "rising" ? "likely to rise" : b.direction === "falling" ? "likely to fall" : "likely to be stable";
    const bChange = Math.abs(b.changePct), dChange = Math.abs(d.changePct);
    if (bChange > dChange + 2) return `Both markets are ${ds}. Bangkerohan shows the stronger expected movement.`;
    if (dChange > bChange + 2) return `Both markets are ${ds}. DFTC shows the stronger expected movement.`;
    return `Both markets are ${ds}. Expected movements are similar.`;
  }
  const bStr = b.direction === "rising" ? "likely to rise" : b.direction === "falling" ? "likely to fall" : "likely to be stable";
  const dStr = d.direction === "rising" ? "likely to rise" : d.direction === "falling" ? "likely to fall" : "likely to be stable";
  return `Bangkerohan retail prices are ${bStr}, while DFTC retail prices are ${dStr}.`;
}
const ForecastRow = ({ label, rec }) => {
  const { Icon, color } = dirCfg[rec.direction];
  return <div className="flex items-center justify-between gap-2 py-2 border-b border-[var(--hw-neutral-100)] last:border-0">
      <span className="text-[13px] font-medium text-[var(--hw-neutral-900)] flex-shrink-0 min-w-[130px]">{label}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`inline-flex items-center gap-0.5 text-[13px] font-medium ${color}`}>
          <Icon className="w-3.5 h-3.5" />
          {rec.directionLabel.replace("Likely to remain ", "").replace("Likely to ", "")}
        </span>
        <span className="text-[13px] text-[var(--hw-neutral-900)]">₱{rec.forecastLow}–₱{rec.forecastHigh}/kg</span>
      </div>
    </div>;
};
const DualForecastCard = ({ commodity, dual, period, onViewDetail, onViewWholesale }) => {
  const note = dualComparisonNote(dual.bangkerohan, dual.dftcRetail);
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3">
      {
    /* Header */
  }
      <div className="flex items-center gap-3">
        <CommodityIllustration commodityId={commodity.id} className="w-10 h-10 flex-shrink-0" />
        <div>
          <p className="font-semibold text-[var(--hw-neutral-900)]">{commodity.name}</p>
          <p className="text-[13px] text-[var(--hw-neutral-900)]">Next {periodLabel(period)}</p>
        </div>
      </div>

      {
    /* Conclusion-first comparison */
  }
      <p className="text-[15px] font-medium text-[var(--hw-neutral-900)] leading-snug">{note}</p>

      {
    /* Compact market rows */
  }
      <div>
        <ForecastRow label="Bangkerohan Retail" rec={dual.bangkerohan} />
        <ForecastRow label="DFTC Retail" rec={dual.dftcRetail} />
      </div>

      {
    /* Actions */
  }
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        <button
    onClick={onViewDetail}
    className="inline-flex items-center gap-1 text-[15px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
          View forecast details
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
    onClick={onViewWholesale}
    className="text-[13px] text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-700)] transition-colors hover:underline underline-offset-2"
  >
          View DFTC wholesale forecast
        </button>
      </div>
    </div>;
};
const SingleForecastCard = ({ commodity, rec, marketLabel, period, showWholesaleLink, onViewDetail }) => {
  const { Icon, color } = dirCfg[rec.direction];
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <CommodityIllustration commodityId={commodity.id} className="w-11 h-11 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--hw-neutral-900)]">{commodity.name}</p>
          <p className="text-[13px] text-[var(--hw-neutral-900)]">{marketLabel} · Next {periodLabel(period)}</p>
        </div>
        <div className={`flex-shrink-0 flex items-center gap-1 font-semibold text-[15px] ${color}`}>
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{rec.directionLabel}</span>
        </div>
      </div>

      <div className="text-[13px] text-[var(--hw-neutral-900)]">
        Range: <span className="font-medium text-[var(--hw-neutral-900)]">₱{rec.forecastLow}–₱{rec.forecastHigh}/kg</span>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
    onClick={onViewDetail}
    className="inline-flex items-center gap-1 text-[15px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
          View forecast details
          <ChevronRight className="w-4 h-4" />
        </button>
        {showWholesaleLink && <button
    onClick={onViewDetail}
    className="text-[13px] text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-700)] transition-colors hover:underline underline-offset-2"
  >
            View DFTC wholesale forecast
          </button>}
      </div>
    </div>;
};
const AnalyticsDualForecastCard = ({ commodity, dual, period, onViewDetail, onViewWholesale }) => {
  const bChart = makeChart(dual.bangkerohan, period);
  const dChart = makeChart(dual.dftcRetail, period);
  const note = dualComparisonNote(dual.bangkerohan, dual.dftcRetail);
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <CommodityIllustration commodityId={commodity.id} className="w-10 h-10 flex-shrink-0" />
        <div>
          <p className="font-semibold text-[var(--hw-neutral-900)]">{commodity.name}</p>
          <p className="text-[13px] text-[var(--hw-neutral-900)]">Next {periodLabel(period)} · Retail comparison</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[12px]">
        {[
    { label: "Bangkerohan Retail", rec: dual.bangkerohan, chart: bChart, lineColor: "#245501", bg: "bg-[var(--hw-green-50)]" },
    { label: "DFTC Retail", rec: dual.dftcRetail, chart: dChart, lineColor: "#2563eb", bg: "bg-blue-50" }
  ].map(({ label, rec, chart, lineColor, bg }) => {
    const { Icon, color } = dirCfg[rec.direction];
    return <div key={label} className={`rounded-xl p-2.5 space-y-1.5 ${bg}`}>
              <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">{label}</p>
              <div className={`flex items-center gap-1 font-semibold text-[13px] ${color}`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{rec.directionLabel}</span>
              </div>
              <p className="text-[12px] text-[var(--hw-neutral-900)]">₱{rec.forecastLow}–₱{rec.forecastHigh}/kg</p>
              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chart} margin={{ top: 2, right: 2, left: -40, bottom: 0 }}>
                    <Area type="monotone" dataKey="high" stroke="none" fill="#AAD576" fillOpacity={lineColor === "#245501" ? 0.2 : 0} />
                    <Area type="monotone" dataKey="low" stroke="none" fill="#ffffff" fillOpacity={lineColor === "#245501" ? 1 : 0} />
                    <Line type="monotone" dataKey="actual" stroke={lineColor} strokeWidth={1.5} dot={{ r: 2 }} connectNulls={false} />
                    <Line type="monotone" dataKey="forecast" stroke={lineColor} strokeWidth={1} strokeDasharray="3 2" dot={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`\u20B1${v}/kg`]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-1 text-[12px] text-[var(--hw-neutral-700)]">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${relDot(rec.reliability)}`} />
                {rec.reliability} reliability
              </div>
            </div>;
  })}
      </div>

      <p className="text-[13px] text-[var(--hw-neutral-900)] italic">{note}</p>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
    onClick={onViewDetail}
    className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
          View details <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
    onClick={onViewWholesale}
    className="text-[13px] text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-700)] transition-colors hover:underline underline-offset-2"
  >
          View DFTC wholesale forecast
        </button>
      </div>
    </div>;
};
const AnalyticsSingleForecastCard = ({ commodity, rec, marketLabel, lineColor, period, showWholesaleLink, onViewDetail }) => {
  const { Icon, color } = dirCfg[rec.direction];
  const chartData = makeChart(rec, period);
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <CommodityIllustration commodityId={commodity.id} className="w-11 h-11 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--hw-neutral-900)]">{commodity.name}</p>
          <p className="text-[13px] text-[var(--hw-neutral-900)]">{marketLabel} · Next {periodLabel(period)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[var(--hw-neutral-50)] rounded-xl px-2 py-1.5">
          <p className="text-[12px] text-[var(--hw-neutral-700)]">Recent avg</p>
          <p className="text-sm font-semibold text-[var(--hw-neutral-900)]">₱{rec.recentAvg}</p>
        </div>
        <div className={`rounded-xl px-2 py-1.5 ${dirCfg[rec.direction].bg}`}>
          <p className="text-[12px] text-[var(--hw-neutral-700)]">Forecast</p>
          <p className={`text-sm font-semibold ${color}`}>₱{rec.forecastedPrice}</p>
        </div>
        <div className="bg-[var(--hw-neutral-50)] rounded-xl px-2 py-1.5">
          <p className="text-[12px] text-[var(--hw-neutral-700)]">Range</p>
          <p className="text-sm font-semibold text-[var(--hw-neutral-700)]">₱{rec.forecastLow}–{rec.forecastHigh}</p>
        </div>
      </div>

      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--hw-neutral-100)" />
            <XAxis dataKey="d" tick={{ fill: "var(--hw-neutral-400)", fontSize: 9 }} stroke="none" />
            <YAxis tick={{ fill: "var(--hw-neutral-400)", fontSize: 9 }} stroke="none" domain={["auto", "auto"]} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`\u20B1${v}/kg`, marketLabel]} />
            <Area type="monotone" dataKey="high" stroke="none" fill="#AAD576" fillOpacity={0.2} />
            <Area type="monotone" dataKey="low" stroke="none" fill="#ffffff" fillOpacity={1} />
            <Line type="monotone" dataKey="actual" stroke={lineColor} strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
            <Line type="monotone" dataKey="forecast" stroke={lineColor} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-1.5 text-[13px] text-[var(--hw-neutral-700)]">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${relDot(rec.reliability)}`} />
        {rec.reliability} reliability · {rec.generatedAt}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
    onClick={onViewDetail}
    className="inline-flex items-center gap-1 text-[15px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
          View forecast details <ChevronRight className="w-4 h-4" />
        </button>
        {showWholesaleLink && <button
    onClick={onViewDetail}
    className="text-[13px] text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-700)] transition-colors hover:underline underline-offset-2"
  >
            View DFTC wholesale forecast
          </button>}
      </div>
    </div>;
};
const ForecastFilterDrawer = ({ open, period, marketView, selectedIds, onClose, onApply }) => {
  const [dP, setDP] = useState(period);
  const [dM, setDM] = useState(marketView);
  const [dIds, setDIds] = useState(selectedIds);
  React.useEffect(() => {
    if (open) {
      setDP(period);
      setDM(marketView);
      setDIds(selectedIds);
    }
  }, [open]);
  const allSel = dIds.length === COMMODITIES.length;
  const toggleId = (id) => setDIds((prev) => prev.includes(id) ? prev.length > 1 ? prev.filter((x) => x !== id) : prev : [...prev, id]);
  const toggleAll = () => setDIds(allSel ? [COMMODITIES[0].id] : COMMODITIES.map((c) => c.id));
  if (!open) return null;
  const chipCls = (active) => `px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${active ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`;
  return <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-y-0 md:right-0 md:left-auto md:w-80 bg-white rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-[var(--shadow-xl)] flex flex-col max-h-[88vh] md:max-h-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-200)]">
          <p className="font-semibold text-[var(--hw-neutral-900)]">Filter</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)]"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-2">Market</p>
            <div className="flex flex-col gap-2">
              {[["both", "Compare Both (default)"], ["bangkerohan", "Bangkerohan"], ["dftc", "DFTC"]].map(([v, label]) => <button key={v} onClick={() => setDM(v)} className={chipCls(dM === v)}>{label}</button>)}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-2">Forecast period</p>
            <div className="flex gap-2 flex-wrap">
              {["7d", "14d", "21d", "28d"].map((p) => <button key={p} onClick={() => setDP(p)} className={chipCls(dP === p)}>{periodLabel(p)}</button>)}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-2">Commodities</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={toggleAll} className={chipCls(allSel)}>All</button>
              {COMMODITIES.map((c) => <button key={c.id} onClick={() => toggleId(c.id)} className={chipCls(dIds.includes(c.id) && !allSel)}>{c.name}</button>)}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[var(--hw-neutral-200)] flex gap-3">
          <button
    onClick={() => {
      setDP("7d");
      setDM("both");
      setDIds(COMMODITIES.map((c) => c.id));
    }}
    className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            Clear
          </button>
          <button
    onClick={() => onApply(dP, dM, dIds)}
    className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors flex items-center justify-center gap-1.5"
  >
            <Check className="w-4 h-4" />Apply
          </button>
        </div>
      </div>
    </>;
};
function ForecastPage() {
  const navigate = useNavigate();
  const { mode } = useDisplayMode();
  const isAnalytics = mode === "analytics";
  const [selectedIds, setSelectedIds] = useState(COMMODITIES.map((c) => c.id));
  const [period, setPeriod] = useState("7d");
  const [marketView, setMarketView] = useState("both");
  const [dftcForecastType, setDftcForecastType] = useState("retail");
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoPos, setInfoPos] = useState({ top: 0, left: 0 });
  const infoButtonRef = useRef(null);
  const handleInfoClick = () => {
    if (infoButtonRef.current) {
      const r = infoButtonRef.current.getBoundingClientRect();
      setInfoPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 300) });
    }
    setInfoOpen((v) => !v);
  };
  const handleApply = (p, m, ids) => {
    setPeriod(p);
    setMarketView(m);
    setSelectedIds(ids);
    setFilterOpen(false);
  };
  const marketSummaryLabel = marketView === "both" ? "Both markets" : marketView === "bangkerohan" ? "Bangkerohan" : "DFTC";
  const filterSummary = `${periodLabel(period)} \xB7 ${marketSummaryLabel} \xB7 ${selectedIds.length} ${selectedIds.length === 1 ? "commodity" : "commodities"}`;
  const visibleCommodities = useMemo(() => {
    let list = COMMODITIES.filter((c) => selectedIds.includes(c.id));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [selectedIds, searchQuery]);
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-4xl space-y-5">

        {
    /* Header */
  }
        <div className="space-y-3">
          {
    /* Title block: h1 + subtitle outside the flex, sync pinned right on same row as h1 */
  }
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
                Price Forecast
              </h1>
              <div className="flex items-center gap-1.5 text-[var(--hw-neutral-700)] flex-shrink-0">
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-[13px] whitespace-nowrap">Updated today at 6:00 AM</span>
              </div>
            </div>
            {
    /* Subtitle + info icon — full width, not inside the flex row */
  }
            <div className="flex items-start gap-1.5">
              <p className="text-[15px] text-[var(--hw-neutral-900)]">
                See likely price movement over the next period.
              </p>
              <button
    ref={infoButtonRef}
    onClick={handleInfoClick}
    aria-label="About price forecasts"
    className="flex-shrink-0 mt-0.5 p-0.5 text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-800)] transition-colors rounded"
  >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {
    /* Search + Filter row — matches Price Monitoring */
  }
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hw-neutral-700)] pointer-events-none" />
              <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search commodity…"
    className="w-full pl-9 pr-9 py-2.5 text-[15px] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition"
  />
              {searchQuery && <button
    onClick={() => setSearchQuery("")}
    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-800)]"
  >
                  <X className="w-3.5 h-3.5" />
                </button>}
            </div>
            <button
    onClick={() => setFilterOpen(true)}
    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors text-[15px] font-medium shadow-[var(--shadow-xs)]"
  >
              <SlidersHorizontal className="w-4 h-4" />
              Filter
            </button>
          </div>

          {
    /* Filter summary — separate line below search/filter */
  }
          <p className="text-[13px] text-[var(--hw-neutral-900)]">{filterSummary}</p>

          {
    /* DFTC retail/wholesale compact toggle — only when DFTC is selected */
  }
          {marketView === "dftc" && <div className="flex items-center gap-2">
              <span className="text-[13px] text-[var(--hw-neutral-900)]">DFTC forecast type:</span>
              <div className="flex rounded-lg border border-[var(--hw-neutral-200)] overflow-hidden">
                {["retail", "wholesale"].map((t) => <button
    key={t}
    onClick={() => setDftcForecastType(t)}
    className={`px-3 py-1 text-[13px] font-medium capitalize transition-colors ${dftcForecastType === t ? "bg-[var(--hw-green-700)] text-white" : "bg-white text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                    {t}
                  </button>)}
              </div>
            </div>}
        </div>

        {
    /* Cards */
  }
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {visibleCommodities.map((c) => {
    const dual = DUAL_FORECAST[c.id];
    if (!dual) return null;
    const goToDetail = () => navigate(`/farmer/forecast/${c.id}`);
    const goToWholesale = () => navigate(`/farmer/forecast/${c.id}/wholesale`);
    if (marketView === "both") {
      return isAnalytics ? <AnalyticsDualForecastCard key={c.id} commodity={c} dual={dual} period={period} onViewDetail={goToDetail} onViewWholesale={goToWholesale} /> : <DualForecastCard key={c.id} commodity={c} dual={dual} period={period} onViewDetail={goToDetail} onViewWholesale={goToWholesale} />;
    }
    const isBangkerohan = marketView === "bangkerohan";
    const rec = isBangkerohan ? dual.bangkerohan : dftcForecastType === "retail" ? dual.dftcRetail : dual.dftcWholesale;
    const mLabel = isBangkerohan ? "Bangkerohan Retail" : dftcForecastType === "retail" ? "DFTC Retail" : "DFTC Wholesale";
    const lineColor = isBangkerohan ? "#245501" : "#2563eb";
    const showWholesaleLink = !isBangkerohan && dftcForecastType === "retail";
    return isAnalytics ? <AnalyticsSingleForecastCard key={c.id} commodity={c} rec={rec} marketLabel={mLabel} lineColor={lineColor} period={period} showWholesaleLink={showWholesaleLink} onViewDetail={goToDetail} /> : <SingleForecastCard key={c.id} commodity={c} rec={rec} marketLabel={mLabel} period={period} showWholesaleLink={showWholesaleLink} onViewDetail={goToDetail} />;
  })}
        </div>
      </div>

      <ForecastFilterDrawer
    open={filterOpen}
    period={period}
    marketView={marketView}
    selectedIds={selectedIds}
    onClose={() => setFilterOpen(false)}
    onApply={handleApply}
  />

      {
    /* Info overlay popup — fixed position, floats over content, transparent backdrop */
  }
      {infoOpen && <>
          <div className="fixed inset-0 z-40" onClick={() => setInfoOpen(false)} aria-hidden="true" />
          <div
    className="fixed z-50 w-72 bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-lg)] p-4"
    style={{ top: infoPos.top, left: infoPos.left }}
  >
            <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">
              Forecasts are estimates based on historical Bangkerohan and DFTC price patterns and may change as new market data becomes available. Do not use these values as guaranteed prices.
            </p>
          </div>
        </>}
    </div>;
}
export {
  ForecastPage as default
};
