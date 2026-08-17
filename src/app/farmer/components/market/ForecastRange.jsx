import { TrendingUp, TrendingDown, Minus } from "lucide-react";
const dirConfig = {
  rising: { Icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", label: "Likely to rise" },
  stable: { Icon: Minus, color: "text-[var(--hw-neutral-700)]", bg: "bg-[var(--hw-neutral-100)]", label: "Remain stable" },
  falling: { Icon: TrendingDown, color: "text-emerald-600", bg: "bg-emerald-50", label: "Likely to fall" }
};
function periodLabel(period) {
  if (period === "7d") return "Next 7 days";
  if (period === "14d") return "Next 14 days";
  if (period === "21d") return "Next 21 days";
  if (period === "28d") return "Next 28 days";
  return period;
}
const ForecastRange = ({
  direction,
  directionLabel,
  currentPrice,
  forecastedPrice,
  forecastLow,
  forecastHigh,
  period,
  market,
  priceType,
  isAnalytics
}) => {
  const { Icon, color, bg } = dirConfig[direction];
  const marketLabel = market.toLowerCase().includes("dftc") ? "DFTC" : "Bangkerohan";
  const range = forecastHigh - forecastLow;
  const expPct = range > 0 ? Math.max(0, Math.min(100, (forecastedPrice - forecastLow) / range * 100)) : 50;
  const curPct = range > 0 ? Math.max(0, Math.min(100, (currentPrice - forecastLow) / range * 100)) : 50;
  const recentAvg = Math.round(currentPrice * 0.97);
  const diffFromAvg = forecastedPrice - recentAvg;
  const changePct = ((forecastedPrice - currentPrice) / currentPrice * 100).toFixed(1);
  const interpretation = direction === "rising" ? `Prices are expected to rise above the recent ${marketLabel} average.` : direction === "falling" ? `Prices are expected to fall below the recent ${marketLabel} average.` : `Prices are expected to remain close to the recent ${marketLabel} average.`;
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--hw-neutral-100)]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
              Forecast range
            </p>
            <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">
              {marketLabel} · {priceType} · {periodLabel(period)}
            </p>
          </div>
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${bg} ${color}`}>
            <Icon className="w-4 h-4" />
            {directionLabel}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {
    /* Current price callout */
  }
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[var(--hw-neutral-500)] border-2 border-white shadow flex-shrink-0" />
          <span className="text-[13px] text-[var(--hw-neutral-900)]">
            Current price: <strong className="text-[var(--hw-neutral-900)]">₱{currentPrice}/kg</strong>
          </span>
        </div>

        {
    /* Range bar */
  }
        <div className="relative pt-3 pb-6">
          {
    /* Track */
  }
          <div className="relative h-2.5 rounded-full bg-[var(--hw-green-100)]">
            {
    /* Current price marker */
  }
            <div
    className="absolute w-4 h-4 rounded-full bg-[var(--hw-neutral-500)] border-2 border-white shadow-sm top-1/2"
    style={{ left: `${curPct}%`, transform: "translate(-50%, -50%)" }}
  />
            {
    /* Expected price marker */
  }
            <div
    className="absolute w-4 h-4 rounded-full bg-[var(--hw-green-700)] border-2 border-white shadow-sm top-1/2"
    style={{ left: `${expPct}%`, transform: "translate(-50%, -50%)" }}
  />
          </div>

          {
    /* Bottom labels */
  }
          <div className="flex justify-between mt-3 text-xs">
            <div>
              <p className="font-semibold text-[var(--hw-neutral-700)]">₱{forecastLow}</p>
              <p className="text-[var(--hw-neutral-700)]">Low</p>
            </div>
            <div className="text-center">
              <p className={`font-semibold ${color}`}>₱{forecastedPrice}</p>
              <p className="text-[var(--hw-neutral-700)]">Expected</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-[var(--hw-neutral-700)]">₱{forecastHigh}</p>
              <p className="text-[var(--hw-neutral-700)]">High</p>
            </div>
          </div>
        </div>

        {
    /* Analytics-only expanded details */
  }
        {isAnalytics && <div className="border-t border-[var(--hw-neutral-100)] pt-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
    { label: "Forecast low", value: `\u20B1${forecastLow}/kg` },
    { label: "Forecast midpoint", value: `\u20B1${forecastedPrice}/kg`, accent: true },
    { label: "Forecast high", value: `\u20B1${forecastHigh}/kg` },
    { label: `Recent avg (14d)`, value: `\u20B1${recentAvg}/kg` },
    { label: "Diff from avg", value: `${diffFromAvg >= 0 ? "+" : ""}\u20B1${diffFromAvg}/kg` },
    { label: "Forecast change", value: `${Number(changePct) >= 0 ? "+" : ""}${changePct}%`, accent: Number(changePct) !== 0 }
  ].map((m) => <div key={m.label} className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2">
                  <p className="text-xs text-[var(--hw-neutral-700)]">{m.label}</p>
                  <p className={`text-sm font-semibold mt-0.5 ${m.accent ? color : "text-[var(--hw-neutral-900)]"}`}>{m.value}</p>
                </div>)}
            </div>
            <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed italic">{interpretation}</p>
          </div>}
      </div>
    </div>;
};
export {
  ForecastRange
};
