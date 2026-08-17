import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { getHistoryRows, HistoricalPriceTable } from "./HistoricalPriceTable";
function computeDirection(prices) {
  if (prices.length < 2) return "stable";
  const diff = prices[prices.length - 1] - prices[0];
  const pct = Math.abs(diff / prices[0]);
  if (pct < 0.025) return "stable";
  return diff > 0 ? "rising" : "falling";
}
const tooltipStyle = {
  backgroundColor: "white",
  border: "1px solid var(--hw-neutral-200)",
  borderRadius: 8,
  fontSize: 12
};
const RecentPriceTrend = ({
  commodityId,
  commodityName,
  market,
  priceType,
  basePrice,
  isAnalytics
}) => {
  const [period, setPeriod] = useState("7d");
  const [showTable, setShowTable] = useState(false);
  const allRows = getHistoryRows(commodityId, market, priceType, basePrice);
  const periodCount = period === "7d" ? 7 : period === "14d" ? 14 : period === "28d" ? 28 : 90;
  const rows = isAnalytics ? allRows.slice(0, Math.min(periodCount, allRows.length)) : allRows.slice(0, 7);
  const latestPrice = rows[0]?.price ?? basePrice;
  const chartData = [...rows].reverse().map((r) => ({ date: r.date, price: r.price }));
  const direction = computeDirection(chartData.map((d) => d.price));
  const marketLabel = market.toLowerCase().includes("dftc") ? "DFTC" : "Bangkerohan Public Market";
  const dirInfo = {
    rising: { label: "Rising", Icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
    falling: { label: "Falling", Icon: TrendingDown, color: "text-emerald-600", bg: "bg-emerald-50" },
    stable: { label: "Stable", Icon: Minus, color: "text-[var(--hw-neutral-700)]", bg: "bg-[var(--hw-neutral-100)]" }
  }[direction];
  const DirIcon = dirInfo.Icon;
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      {
    /* Header */
  }
      <div className="px-4 py-3 border-b border-[var(--hw-neutral-100)]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
              Recent price trend
            </p>
            <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">
              {marketLabel} · {priceType}
            </p>
          </div>
          {isAnalytics && <div className="flex gap-1 flex-wrap justify-end">
              {["7d", "14d", "28d", "90d"].map((p) => <button
    key={p}
    onClick={() => setPeriod(p)}
    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${period === p ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                  {p}
                </button>)}
            </div>}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {
    /* Latest price + direction */
  }
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-bold text-[var(--hw-neutral-900)]">
              ₱{latestPrice.toFixed(2)}
              <span className="text-sm font-normal text-[var(--hw-neutral-700)]">/kg</span>
            </p>
            <p className="text-xs text-[var(--hw-neutral-700)] mt-0.5">Latest recorded price</p>
          </div>
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${dirInfo.bg} ${dirInfo.color}`}>
            <DirIcon className="w-4 h-4" />
            {dirInfo.label}
          </span>
        </div>

        {
    /* Chart — one price line only */
  }
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: isAnalytics ? -8 : -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hw-neutral-100)" vertical={false} />
              <XAxis
    dataKey="date"
    tick={{ fill: "var(--hw-neutral-400)", fontSize: 10 }}
    stroke="var(--hw-neutral-200)"
    tickLine={false}
    interval={isAnalytics ? "preserveStartEnd" : 0}
  />
              {isAnalytics && <YAxis
    tick={{ fill: "var(--hw-neutral-400)", fontSize: 10 }}
    stroke="none"
    domain={["auto", "auto"]}
    tickFormatter={(v) => `\u20B1${v}`}
  />}
              <Tooltip
    contentStyle={tooltipStyle}
    formatter={(v) => [`\u20B1${v.toFixed(2)}/kg`, `${marketLabel} ${priceType}`]}
  />
              <Line
    type="monotone"
    dataKey="price"
    stroke="#245501"
    strokeWidth={2}
    dot={isAnalytics ? { r: 3, fill: "#245501" } : false}
    activeDot={{ r: 4, fill: "#245501" }}
  />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {
    /* Price records */
  }
        {isAnalytics ? <HistoricalPriceTable
    commodityId={commodityId}
    commodityName={commodityName}
    market={market}
    priceType={priceType}
    basePrice={basePrice}
  /> : <>
            <button
    onClick={() => setShowTable((v) => !v)}
    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
              <span>View price records</span>
              {showTable ? <ChevronUp className="w-4 h-4 text-[var(--hw-neutral-400)]" /> : <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-400)]" />}
            </button>
            {showTable && <div className="mt-1">
                <HistoricalPriceTable
    commodityId={commodityId}
    commodityName={commodityName}
    market={market}
    priceType={priceType}
    basePrice={basePrice}
  />
              </div>}
          </>}
      </div>
    </div>;
};
export {
  RecentPriceTrend
};
