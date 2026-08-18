import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  RefreshCw,
  ChevronRight
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList
} from "recharts";
import { COMMODITIES } from "../components/market/mockData";
import { CommodityIllustration } from "../components/market/CommodityIllustrations";
import { getHistoryRows } from "../components/market/HistoricalPriceTable";
const RETAIL_FORECAST_DATA = {
  kamatis: {
    bangkerohan: { direction: "rising", directionLabel: "Likely to rise", currentPrice: 85, recentAvg: 82, forecastedPrice: 90, forecastLow: 84, forecastHigh: 97, changePct: 9.8, reliability: "Moderate", reliabilityNote: "Based on sufficient recent Bangkerohan Retail price records." },
    dftcRetail: { direction: "rising", directionLabel: "Likely to rise", currentPrice: 82, recentAvg: 80, forecastedPrice: 85, forecastLow: 80, forecastHigh: 91, changePct: 6.3, reliability: "Moderate", reliabilityNote: "Based on available DFTC Retail price records." }
  },
  talong: {
    bangkerohan: { direction: "stable", directionLabel: "Likely to remain stable", currentPrice: 60, recentAvg: 61, forecastedPrice: 61, forecastLow: 57, forecastHigh: 66, changePct: 0, reliability: "Moderate", reliabilityNote: "Based on recent Bangkerohan Retail price data." },
    dftcRetail: { direction: "stable", directionLabel: "Likely to remain stable", currentPrice: 58, recentAvg: 57, forecastedPrice: 57, forecastLow: 54, forecastHigh: 61, changePct: 0, reliability: "Moderate", reliabilityNote: "Based on available DFTC Retail price records." }
  },
  repolyo: {
    bangkerohan: { direction: "falling", directionLabel: "Likely to fall", currentPrice: 45, recentAvg: 47, forecastedPrice: 42, forecastLow: 38, forecastHigh: 48, changePct: -6.7, reliability: "Moderate", reliabilityNote: "Based on recent downward Bangkerohan price patterns." },
    dftcRetail: { direction: "falling", directionLabel: "Likely to fall", currentPrice: 40, recentAvg: 42, forecastedPrice: 38, forecastLow: 34, forecastHigh: 43, changePct: -4.8, reliability: "Moderate", reliabilityNote: "Based on available DFTC Retail price records." }
  },
  atsal: {
    bangkerohan: { direction: "rising", directionLabel: "Likely to rise", currentPrice: 120, recentAvg: 115, forecastedPrice: 124, forecastLow: 118, forecastHigh: 132, changePct: 7.8, reliability: "Moderate", reliabilityNote: "Based on recent Bangkerohan price records." },
    dftcRetail: { direction: "rising", directionLabel: "Likely to rise", currentPrice: 115, recentAvg: 112, forecastedPrice: 120, forecastLow: 114, forecastHigh: 128, changePct: 7.1, reliability: "Moderate", reliabilityNote: "Based on available DFTC Retail price records." }
  },
  carrots: {
    bangkerohan: { direction: "stable", directionLabel: "Likely to remain stable", currentPrice: 90, recentAvg: 90, forecastedPrice: 90, forecastLow: 85, forecastHigh: 96, changePct: 0, reliability: "Moderate", reliabilityNote: "Based on recent Bangkerohan Retail price data." },
    dftcRetail: { direction: "stable", directionLabel: "Likely to remain stable", currentPrice: 85, recentAvg: 85, forecastedPrice: 85, forecastLow: 80, forecastHigh: 91, changePct: 0, reliability: "Moderate", reliabilityNote: "Based on available DFTC Retail price records." }
  },
  pipino: {
    bangkerohan: { direction: "stable", directionLabel: "Likely to remain stable", currentPrice: 40, recentAvg: 39, forecastedPrice: 40, forecastLow: 37, forecastHigh: 44, changePct: 2.6, reliability: "Moderate", reliabilityNote: "Based on recent Bangkerohan Retail price data." },
    dftcRetail: { direction: "stable", directionLabel: "Likely to remain stable", currentPrice: 38, recentAvg: 37, forecastedPrice: 38, forecastLow: 35, forecastHigh: 42, changePct: 2.7, reliability: "Moderate", reliabilityNote: "Based on available DFTC Retail price records." }
  },
  ampalaya: {
    bangkerohan: { direction: "rising", directionLabel: "Likely to rise", currentPrice: 75, recentAvg: 71, forecastedPrice: 78, forecastLow: 73, forecastHigh: 84, changePct: 9.9, reliability: "Moderate", reliabilityNote: "Based on recent Bangkerohan price behavior." },
    dftcRetail: { direction: "rising", directionLabel: "Likely to rise", currentPrice: 70, recentAvg: 67, forecastedPrice: 73, forecastLow: 68, forecastHigh: 79, changePct: 9, reliability: "Moderate", reliabilityNote: "Based on available DFTC Retail price records." }
  },
  kalabasa: {
    bangkerohan: { direction: "stable", directionLabel: "Likely to remain stable", currentPrice: 35, recentAvg: 35, forecastedPrice: 35, forecastLow: 32, forecastHigh: 39, changePct: 0, reliability: "Moderate", reliabilityNote: "Based on recent Bangkerohan Retail price records." },
    dftcRetail: { direction: "stable", directionLabel: "Likely to remain stable", currentPrice: 33, recentAvg: 33, forecastedPrice: 33, forecastLow: 30, forecastHigh: 37, changePct: 0, reliability: "Moderate", reliabilityNote: "Based on available DFTC Retail price records." }
  },
  lettuce: {
    bangkerohan: { direction: "falling", directionLabel: "Likely to fall", currentPrice: 80, recentAvg: 86, forecastedPrice: 78, forecastLow: 72, forecastHigh: 84, changePct: -9.3, reliability: "Moderate", reliabilityNote: "Based on recent Bangkerohan price patterns." },
    dftcRetail: { direction: "falling", directionLabel: "Likely to fall", currentPrice: 75, recentAvg: 80, forecastedPrice: 73, forecastLow: 67, forecastHigh: 79, changePct: -8.8, reliability: "Moderate", reliabilityNote: "Based on available DFTC Retail price records." }
  },
  pechay: {
    bangkerohan: { direction: "falling", directionLabel: "Likely to fall", currentPrice: 35, recentAvg: 38, forecastedPrice: 33, forecastLow: 30, forecastHigh: 37, changePct: -13.2, reliability: "Low", reliabilityNote: "Limited DFTC Arrival Volume data. Relies on Bangkerohan Price Behavior only." },
    dftcRetail: { direction: "falling", directionLabel: "Likely to fall", currentPrice: 32, recentAvg: 34, forecastedPrice: 29, forecastLow: 26, forecastHigh: 33, changePct: -14.7, reliability: "Low", reliabilityNote: "Limited DFTC Retail price records available." }
  }
};
const dirConfig = {
  rising: { Icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  stable: { Icon: Minus, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  falling: { Icon: TrendingDown, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" }
};
const outlookLabel = (dir) => dir === "rising" ? "Favorable" : dir === "falling" ? "Cautious" : "Neutral";
const outlookColor = (dir) => dir === "rising" ? "text-emerald-700" : dir === "falling" ? "text-amber-700" : "text-[var(--hw-neutral-900)]";
const reliabilityDot = (r) => r === "High" ? "bg-emerald-500" : r === "Moderate" ? "bg-amber-400" : "bg-[var(--hw-neutral-300)]";
const segBtn = (active) => `flex-1 py-2 text-[13px] font-medium transition-colors ${active ? "bg-[var(--hw-green-700)] text-white" : "text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`;
const periodBtn = (active) => `px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors flex-shrink-0 whitespace-nowrap ${active ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`;
function forecastDateRange(period) {
  if (period === "7d") return "Jun 25 \u2013 Jul 1";
  if (period === "14d") return "Jun 25 \u2013 Jul 8";
  if (period === "21d") return "Jun 25 \u2013 Jul 15";
  return "Jun 25 \u2013 Jul 22";
}
const recentAvgPeriod = "Jun 10 \u2013 Jun 23";
const tooltipStyle = { backgroundColor: "white", border: "1px solid var(--hw-neutral-200)", borderRadius: 8, fontSize: 12 };
function ForecastDetailPage() {
  const { commodityId } = useParams();
  const navigate = useNavigate();
  const [market, setMarket] = useState("bangkerohan");
  const [period, setPeriod] = useState("7d");
  const commodity = COMMODITIES.find((c) => c.id === commodityId);
  const forecastEntry = commodityId ? RETAIL_FORECAST_DATA[commodityId] : void 0;
  if (!commodity || !forecastEntry) {
    return <div className="px-4 py-8 text-center">
        <p className="text-[var(--hw-neutral-900)]">Commodity not found.</p>
        <button onClick={() => navigate("/farmer/forecast")} className="mt-3 text-sm font-medium text-[var(--hw-green-700)]">
          Back to Forecast
        </button>
      </div>;
  }
  const rec = market === "bangkerohan" ? forecastEntry.bangkerohan : forecastEntry.dftcRetail;
  const marketLabel = market === "bangkerohan" ? "Bangkerohan Retail" : "DFTC Retail";
  const marketStr = market === "bangkerohan" ? "Bangkerohan Public Market" : "DFTC";
  const dir = dirConfig[rec.direction];
  const DirIcon = dir.Icon;
  const fpRange = forecastDateRange(period);
  const diff = rec.forecastedPrice - rec.recentAvg;
  const diffStr = diff === 0 ? `near the ${recentAvgPeriod} average` : diff > 0 ? `up \u20B1${Math.abs(diff)}/kg from the ${recentAvgPeriod} average` : `down \u20B1${Math.abs(diff)}/kg from the ${recentAvgPeriod} average`;
  const barData = [
    { name: `${recentAvgPeriod} avg`, value: rec.recentAvg },
    { name: `${fpRange} forecast`, value: rec.forecastedPrice }
  ];
  const allHistoryRows = getHistoryRows(commodity.id, marketStr, "Retail", rec.currentPrice);
  const periodCount = period === "7d" ? 7 : period === "14d" ? 14 : period === "21d" ? 21 : 28;
  const historyRows = allHistoryRows.slice(0, Math.min(periodCount, allHistoryRows.length));
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-3xl space-y-4">

        {
    /* Back + commodity switcher */
  }
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
    onClick={() => navigate("/farmer/forecast")}
    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-900)] transition-colors"
  >
            <ArrowLeft className="w-4 h-4" />
            Price Forecast
          </button>
          <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {COMMODITIES.map((c) => <button
    key={c.id}
    onClick={() => navigate(`/forecast/${c.id}`)}
    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${c.id === commodity.id ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                {c.name}
              </button>)}
          </div>
        </div>

        {
    /* Commodity header */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
          <div className="flex items-center gap-4">
            <CommodityIllustration commodityId={commodity.id} className="w-16 h-16 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">{commodity.name}</h1>
              <div className={`flex items-center gap-1.5 mt-1 text-sm font-semibold ${dir.color}`}>
                <DirIcon className="w-4 h-4" />
                {rec.directionLabel}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-[var(--hw-neutral-700)]">
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-xs">Forecast updated today at 6:00 AM</span>
              </div>
            </div>
          </div>
        </div>

        {
    /* Period controls */
  }
        <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <span className="text-xs font-medium text-[var(--hw-neutral-900)] flex-shrink-0 pr-1">Period:</span>
          {["7d", "14d", "21d", "28d"].map((p) => <button key={p} onClick={() => setPeriod(p)} className={periodBtn(period === p)}>
              {p === "7d" ? "7 days" : p === "14d" ? "14 days" : p === "21d" ? "21 days" : "28 days"}
            </button>)}
        </div>

        {
    /* Retail market selector */
  }
        <div className="flex rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden bg-white shadow-[var(--shadow-xs)]">
          <button onClick={() => setMarket("bangkerohan")} className={segBtn(market === "bangkerohan")}>
            Bangkerohan Retail
          </button>
          <div className="w-px bg-[var(--hw-neutral-200)]" />
          <button onClick={() => setMarket("dftc-retail")} className={segBtn(market === "dftc-retail")}>
            DFTC Retail
          </button>
        </div>

        {
    /* Forecast Insight card */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
          <div className={`flex items-center gap-1.5 ${dir.color}`}>
            <DirIcon className="w-5 h-5" />
            <span className="font-semibold">{rec.directionLabel}</span>
          </div>
          <p className="text-[var(--hw-neutral-900)] leading-relaxed">
            {commodity.name} is forecasted at{" "}
            <strong className="text-[var(--hw-neutral-900)]">₱{rec.forecastedPrice}/kg for {fpRange}</strong>,{" "}
            {diffStr}.
          </p>
          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--hw-neutral-700)]">Price Outlook:</span>
              <span className={`text-xs font-semibold ${outlookColor(rec.direction)}`}>{outlookLabel(rec.direction)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${reliabilityDot(rec.reliability)}`} />
              <span className="text-xs text-[var(--hw-neutral-700)]">Reliability:</span>
              <span className="text-xs font-semibold text-[var(--hw-neutral-700)]">{rec.reliability}</span>
            </div>
          </div>
          <p className="text-xs text-[var(--hw-neutral-700)]">{marketLabel}</p>
        </div>

        {
    /* Analytics — always visible */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-5">

              {
    /* 2-bar comparison chart */
  }
              <div>
                <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Forecast comparison</p>
                <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">{marketLabel}</p>
                <div className="h-48 mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 20, right: 16, left: -20, bottom: 0 }} barSize={56}>
                      <CartesianGrid vertical={false} stroke="var(--hw-neutral-100)" />
                      <XAxis
    dataKey="name"
    tick={{ fill: "var(--hw-neutral-500)", fontSize: 11 }}
    stroke="var(--hw-neutral-200)"
    tickLine={false}
  />
                      <YAxis
    tick={{ fill: "var(--hw-neutral-400)", fontSize: 10 }}
    stroke="none"
    domain={["auto", "auto"]}
    tickFormatter={(v) => `\u20B1${v}`}
  />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`\u20B1${v}/kg`, ""]} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        <Cell key="cell-avg" fill="var(--hw-neutral-300)" />
                        <Cell key="cell-forecast" fill="#245501" />
                        <LabelList
    dataKey="value"
    position="top"
    formatter={(v) => `\u20B1${v}`}
    style={{ fill: "var(--hw-neutral-700)", fontSize: 12, fontWeight: 600 }}
  />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {
    /* Forecast details */
  }
              <div>
                <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide mb-2">Forecast details</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
    { label: "Current price", value: `\u20B1${rec.currentPrice}/kg` },
    { label: "Recent average", value: `\u20B1${rec.recentAvg}/kg` },
    { label: "Forecasted price", value: `\u20B1${rec.forecastedPrice}/kg`, accent: true },
    { label: "Forecast range", value: `\u20B1${rec.forecastLow}\u2013\u20B1${rec.forecastHigh}/kg` },
    { label: "Forecast change", value: `${rec.changePct >= 0 ? "+" : ""}${rec.changePct.toFixed(1)}%` },
    { label: "Reliability", value: rec.reliability }
  ].map((m) => <div key={m.label} className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2">
                      <p className="text-xs text-[var(--hw-neutral-700)]">{m.label}</p>
                      <p className={`text-sm font-semibold mt-0.5 ${m.accent ? dir.color : "text-[var(--hw-neutral-900)]"}`}>{m.value}</p>
                    </div>)}
                </div>
                <p className="text-xs text-[var(--hw-neutral-700)] mt-2">{rec.reliabilityNote}</p>
              </div>

              {
    /* Historical price table — Date | Price/kg | Change */
  }
              <div>
                <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide mb-2">Price records</p>
                <div className="rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden">
                  <div className="px-3 py-2 border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
                    <p className="text-xs font-semibold text-[var(--hw-neutral-700)]">
                      {commodity.name} · {marketLabel} · Historical prices
                    </p>
                  </div>
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="border-b border-[var(--hw-neutral-100)]">
                        <th className="text-left px-3 py-2 font-semibold text-[var(--hw-neutral-900)]">Date</th>
                        <th className="text-right px-3 py-2 font-semibold text-[var(--hw-neutral-900)]">Price/kg</th>
                        <th className="text-right px-3 py-2 font-semibold text-[var(--hw-neutral-900)]">Change</th>
                      </tr>
                    </thead>
                  </table>
                <div className="overflow-y-auto" style={{ maxHeight: "380px", scrollbarWidth: "thin" }}>
                  <table className="w-full text-[13px]">
                    <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                      {historyRows.map((row, i) => <tr key={i} className={i === 0 ? "bg-[var(--hw-neutral-50)]" : ""}>
                          <td className="px-3 py-2.5 text-[var(--hw-neutral-700)] whitespace-nowrap">
                            {row.date}
                            {i === 0 && <span className="ml-1.5 text-[10px] font-semibold text-[var(--hw-green-700)]">Latest</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-[var(--hw-neutral-900)] whitespace-nowrap">
                            ₱{row.price.toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            {row.change === 0 ? <span className="text-[var(--hw-neutral-700)]">—</span> : <span className={row.change > 0 ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>
                                  {row.change > 0 ? "+" : ""}₱{row.change.toFixed(2)}
                                </span>}
                          </td>
                        </tr>)}
                    </tbody>
                  </table>
                </div>
                <div className="px-3 py-2 border-t border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
                  <p className="text-[12px] text-[var(--hw-neutral-700)]">
                    Sample price records · {marketLabel}, Davao City · {historyRows.length} records ({period})
                  </p>
                </div>
              </div>
            </div>

        </div>

        {
    /* Forecast disclaimer */
  }
        <div className="flex items-start gap-2 text-[var(--hw-neutral-700)]">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            Forecasts are estimates and may change as new price data becomes available. Do not use forecast values as guaranteed prices.
          </p>
        </div>

        {
    /* View current prices */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium text-[var(--hw-neutral-900)]">View current prices for {commodity.name}</p>
            <p className="text-xs text-[var(--hw-neutral-900)] mt-0.5">See recorded retail and wholesale prices</p>
          </div>
          <button
    onClick={() => navigate(`/farmer/prices/${commodity.id}`)}
    className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[var(--hw-neutral-200)] rounded-xl text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            View price history
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {
    /* Check planting recommendation */
  }
        <div className="bg-[var(--hw-green-50)] border border-[var(--hw-green-400)] rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium text-[var(--hw-green-900)]">Check planting recommendation</p>
            <p className="text-xs text-[var(--hw-green-700)] mt-0.5">Assess market conditions before you plant</p>
          </div>
          <button
    onClick={() => navigate(`/assess?commodity=${commodity.id}`)}
    className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
  >
            Assess now
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {
    /* View another commodity */
  }
        <button
    onClick={() => navigate("/farmer/forecast")}
    className="w-full text-sm font-medium text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-700)] transition-colors py-2"
  >
          View another commodity →
        </button>

      </div>
    </div>;
}
export {
  ForecastDetailPage as default
};
