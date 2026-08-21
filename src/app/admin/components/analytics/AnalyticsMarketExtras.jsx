import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { CommodityIllustration } from "@/app/global/components/shared/CommodityIllustrations";
const SPARKLINES = {
  kamatis: [72, 75, 73, 78, 80, 82, 85],
  talong: [63, 62, 61, 60, 60, 61, 60],
  repolyo: [50, 48, 46, 44, 43, 43, 42],
  sibuyas: [98, 100, 105, 108, 109, 110, 110]
};
const MiniSparkline = ({ commodityId, direction }) => {
  const raw = SPARKLINES[commodityId] ?? [60, 60, 60, 60, 60, 60, 60];
  const min = Math.min(...raw);
  const max = Math.max(...raw);
  const range = Math.max(max - min, 1);
  const w = 72;
  const h = 28;
  const pts = raw.map((v, i) => {
    const x = i / (raw.length - 1) * w;
    const y = h - (v - min) / range * (h - 4) - 2;
    return `${x},${y}`;
  });
  const stroke = direction === "Rising" ? "#16a34a" : direction === "Falling" ? "#ef4444" : "#737373";
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
      <polyline points={pts.join(" ")} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>;
};
const ANALYTICS_COMMODITY_DATA = {
  kamatis: { retailPrice: 85, wholesalePrice: 72, priceChange: 4.9, arrivalTrend: "Stable", dataDate: "Jun 24, 2026" },
  talong: { retailPrice: 60, wholesalePrice: 52, priceChange: -1.6, arrivalTrend: "Increasing", dataDate: "Jun 24, 2026" },
  repolyo: { retailPrice: 42, wholesalePrice: 35, priceChange: -4.5, arrivalTrend: "Increasing", dataDate: "Jun 24, 2026" },
  sibuyas: { retailPrice: 110, wholesalePrice: 95, priceChange: 2.7, arrivalTrend: "Decreasing", dataDate: "Jun 24, 2026" }
};
const dirIcon = (d) => d === "Rising" ? <TrendingUp className="w-3.5 h-3.5" /> : d === "Falling" ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />;
const dirColor = (d) => d === "Rising" ? "text-emerald-600" : d === "Falling" ? "text-red-500" : "text-[var(--hw-neutral-500)]";
const AnalyticsCommodityCard = ({
  commodity,
  priceType,
  onViewDetails
}) => {
  const extra = ANALYTICS_COMMODITY_DATA[commodity.id] ?? {};
  const displayPrice = priceType === "retail" ? extra.retailPrice : extra.wholesalePrice;
  const change = extra.priceChange ?? 0;
  const changeStr = `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
  const arrivalColor = extra.arrivalTrend === "Increasing" ? "text-amber-600" : extra.arrivalTrend === "Decreasing" ? "text-emerald-600" : "text-[var(--hw-neutral-500)]";
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3">
      {
    /* Top row */
  }
      <div className="flex items-start gap-3">
        <CommodityIllustration commodityId={commodity.id} className="w-10 h-10 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--hw-neutral-900)]">{commodity.name}</p>
          <p className="text-xs text-[var(--hw-neutral-400)]">{commodity.market}</p>
        </div>
        <MiniSparkline commodityId={commodity.id} direction={commodity.direction} />
      </div>

      {
    /* Price row */
  }
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2">
          <p className="text-xs text-[var(--hw-neutral-400)]">Retail</p>
          <p className={`text-sm font-bold ${priceType === "retail" ? "text-[var(--hw-neutral-900)]" : "text-[var(--hw-neutral-500)]"}`}>
            ₱{extra.retailPrice}/kg
          </p>
        </div>
        <div className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2">
          <p className="text-xs text-[var(--hw-neutral-400)]">Wholesale</p>
          <p className={`text-sm font-bold ${priceType === "wholesale" ? "text-[var(--hw-neutral-900)]" : "text-[var(--hw-neutral-500)]"}`}>
            ₱{extra.wholesalePrice}/kg
          </p>
        </div>
      </div>

      {
    /* Stats row */
  }
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span className={`inline-flex items-center gap-1 font-medium ${dirColor(commodity.direction)}`}>
          {dirIcon(commodity.direction)}
          {changeStr} vs prev.
        </span>
        <span className="text-[var(--hw-neutral-400)]">·</span>
        <span className={`font-medium ${arrivalColor}`}>
          Arrivals: {extra.arrivalTrend}
        </span>
        <span className="text-[var(--hw-neutral-400)]">·</span>
        <span className="text-[var(--hw-neutral-400)]">{extra.dataDate}</span>
      </div>

      <p className="text-sm text-[var(--hw-neutral-600)] leading-snug">{commodity.summary}</p>

      <button
    onClick={() => onViewDetails(commodity.id)}
    className="self-start inline-flex items-center gap-1 text-sm font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
        View details
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>;
};
function ChipRow({
  label,
  options,
  value,
  onChange
}) {
  return <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-[var(--hw-neutral-500)] flex-shrink-0">{label}:</span>
      {options.map((o) => <button
    key={o.value}
    onClick={() => onChange(o.value)}
    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${value === o.value ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
          {o.label}
        </button>)}
    </div>;
}
const AnalyticsComparisonControls = ({
  priceType,
  market,
  period,
  onPriceTypeChange,
  onMarketChange,
  onPeriodChange
}) => <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
    <p className="text-xs font-semibold text-[var(--hw-neutral-400)] uppercase tracking-wide">Compare</p>
    <ChipRow
  label="Price type"
  options={[{ value: "retail", label: "Retail" }, { value: "wholesale", label: "Wholesale" }]}
  value={priceType}
  onChange={onPriceTypeChange}
/>
    <ChipRow
  label="Market"
  options={[{ value: "all", label: "All markets" }, { value: "bangkerohan", label: "Bangkerohan" }, { value: "dftc", label: "DFTC" }]}
  value={market}
  onChange={onMarketChange}
/>
    <ChipRow
  label="Period"
  options={[{ value: "7d", label: "7 days" }, { value: "14d", label: "14 days" }, { value: "28d", label: "28 days" }]}
  value={period}
  onChange={onPeriodChange}
/>
  </div>;
export {
  AnalyticsCommodityCard,
  AnalyticsComparisonControls
};
