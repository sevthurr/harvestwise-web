import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, ChevronDown } from "lucide-react";
import { CommodityIllustration } from "../../../global/components/shared/CommodityIllustrations";
import { CurrentPriceTrendChart } from "../../../global/components/shared/CurrentPriceTrendChart";
import { ForecastPriceTrendChart } from "../../../global/components/shared/ForecastPriceTrendChart";
import {
  HW_ID_TO_NAME,
  getCommodityVarietyList,
  buildCurrentPriceChartData,
  buildForecastChartData,
  getPresetDates,
  HW_GREEN_SHADES
} from "../../../global/components/shared/trendChartData";
import { getVariants } from "../../../global/data/commodities";
const MARKETS = ["Bangkerohan", "DFTC"];
const PTYPES = ["Retail", "Wholesale"];
const HORIZONS = ["7d", "14d", "21d", "28d"];
const HDAYS = { "7d": 7, "14d": 14, "21d": 21, "28d": 28 };
const DEFAULT_VARIETY_SENTINEL = "Default";
const DIR_CFG = {
  rising: { Icon: TrendingUp, color: "text-emerald-600", label: "Rising" },
  stable: { Icon: Minus, color: "text-blue-600", label: "Stable" },
  falling: { Icon: TrendingDown, color: "text-red-500", label: "Falling" },
  none: { Icon: Minus, color: "text-[var(--hw-neutral-500)]", label: "No trend" }
};
function SelectFilter({
  label,
  options,
  value,
  onChange
}) {
  return <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="h-9 w-full pl-3 pr-8 text-[13px] font-medium text-[var(--hw-neutral-900)] bg-white border border-[var(--hw-neutral-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-700)] appearance-none cursor-pointer hover:border-[var(--hw-neutral-400)] transition-colors"
  >
          {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--hw-neutral-900)] pointer-events-none" />
      </div>
    </div>;
}
function StatCard({
  label,
  value,
  sub,
  valueColor
}) {
  return <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3">
      <p className="text-[10px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide mb-1">{label}</p>
      <div className={`text-[18px] font-bold leading-none ${valueColor ?? "text-[var(--hw-neutral-900)]"}`}>{value}</div>
      {sub && <p className="text-[10px] text-[var(--hw-neutral-900)] mt-0.5">{sub}</p>}
    </div>;
}
function buildCurrentSummary(cropName, current, previous, direction) {
  const change = current - previous;
  const changeText = change > 0 ? `up \u20B1${change}/kg from the previous record` : change < 0 ? `down \u20B1${Math.abs(change)}/kg from the previous record` : "unchanged from the previous record";
  const trendText = direction === "rising" ? "trending upward" : direction === "falling" ? "trending downward" : "relatively stable";
  const implication = direction === "rising" ? "This is a favorable signal \u2014 prices are moving in the right direction for sellers." : direction === "falling" ? "Consider waiting for a better price if storage allows, or sell quickly if your produce is near spoilage." : "Conditions are predictable \u2014 a good time to plan your sale.";
  return `${cropName} price is ${changeText} and has been ${trendText} this week. ${implication}`;
}
function buildForecastSummary(cropName, fLo, fHi, days, direction) {
  const trendHint = direction === "rising" ? "If the trend continues, prices may improve further." : direction === "falling" ? "If the trend continues, prices may soften further." : "Prices are expected to stay relatively stable over this period.";
  return `The forecast suggests ${cropName} may stay between \u20B1${fLo} and \u20B1${fHi}/kg over the next ${days} days. ${trendHint} Actual market prices can still change \u2014 check again closer to your harvest date.`;
}
function PriceDetailView({
  commodityId,
  commodityName,
  baseCurrentPrice,
  basePreviousPrice,
  direction,
  baseForecastLow,
  baseForecastHigh,
  baseActualPoints,
  showHeading = false
}) {
  const [market, setMarket] = useState("Bangkerohan");
  const [priceType, setPriceType] = useState("Retail");
  const [horizon, setHorizon] = useState("7d");
  const [variety, setVariety] = useState(DEFAULT_VARIETY_SENTINEL);
  const varietyOptions = useMemo(() => {
    const dftcNameForVariety = commodityId ? HW_ID_TO_NAME[commodityId] : void 0;
    const vs = dftcNameForVariety ? getVariants(dftcNameForVariety) : [];
    return [DEFAULT_VARIETY_SENTINEL, ...vs];
  }, [commodityId]);
  const selectedVariety = variety === DEFAULT_VARIETY_SENTINEL ? "" : variety;
  const varietyPriceOffset = useMemo(() => {
    if (!selectedVariety) return 0;
    const idx = varietyOptions.indexOf(variety) - 1;
    const offsets = [0, -5, 3, -8, 7];
    return offsets[idx % offsets.length] ?? 0;
  }, [selectedVariety, variety, varietyOptions]);
  const days = HDAYS[horizon];
  const typeMultiplier = priceType === "Wholesale" ? 0.82 : 1;
  const marketMultiplier = market === "DFTC" ? 0.97 : 1;
  const adj = typeMultiplier * marketMultiplier;
  const adjCurrent = Math.round(baseCurrentPrice * adj) + varietyPriceOffset;
  const adjPrevious = Math.round(basePreviousPrice * adj) + varietyPriceOffset;
  const adjFLo = Math.round(baseForecastLow * adj) + varietyPriceOffset;
  const adjFHi = Math.round(baseForecastHigh * adj) + varietyPriceOffset;
  const adjFMid = Math.round((adjFLo + adjFHi) / 2);
  const change = adjCurrent - adjPrevious;
  const cfg = DIR_CFG[direction] || DIR_CFG.none;
  const DirIcon = cfg.Icon;
  const marketLabel = market === "Bangkerohan" ? "Bangkerohan Market" : "DFTC";
  const displayCropName = selectedVariety ? `${commodityName} (${selectedVariety})` : commodityName;
  const dftcName = commodityId ? HW_ID_TO_NAME[commodityId] : void 0;
  const varieties = useMemo(() => {
    if (dftcName) return getCommodityVarietyList(dftcName);
    return [{ variety: "", basePrice: baseCurrentPrice }];
  }, [dftcName, baseCurrentPrice]);
  const varietyColors = useMemo(() => HW_GREEN_SHADES.slice(0, varieties.length), [varieties.length]);
  const currentChartData = useMemo(() => {
    if (dftcName) {
      return buildCurrentPriceChartData(dftcName, getPresetDates("14d"), adj);
    }
    const key = commodityName;
    return baseActualPoints.map((p) => ({ date: p.label, [key]: Math.round(p.price * adj) }));
  }, [dftcName, adj, baseActualPoints, commodityName]);
  const currentChartVarieties = useMemo(() => {
    if (dftcName) return varieties;
    return [{ variety: "" }];
  }, [dftcName, varieties]);
  const currentChartCommodityKey = dftcName ? dftcName : commodityName;
  const forecastChartData = useMemo(() => {
    if (dftcName) {
      return buildForecastChartData(dftcName, days, adj);
    }
    const key = commodityName;
    return [
      { date: "Today", [key]: adjCurrent, [`${key}__lo`]: adjCurrent, [`${key}__hi`]: adjCurrent },
      ...Array.from({ length: days }, (_, i) => ({
        date: `+${i + 1}d`,
        [key]: Math.round(adjCurrent + (adjFMid - adjCurrent) * ((i + 1) / days)),
        [`${key}__lo`]: Math.round(adjCurrent + (adjFLo - adjCurrent) * ((i + 1) / days)),
        [`${key}__hi`]: Math.round(adjCurrent + (adjFHi - adjCurrent) * ((i + 1) / days))
      }))
    ];
  }, [dftcName, days, adj, adjCurrent, adjFMid, adjFLo, adjFHi, commodityName]);
  const forecastChartVarieties = useMemo(() => {
    if (dftcName) return varieties;
    return [{ variety: "" }];
  }, [dftcName, varieties]);
  return <div className="space-y-5">

      {
    /* ── Optional heading ── */
  }
      {showHeading && <div className="flex items-center gap-3">
          {commodityId && <CommodityIllustration commodityId={commodityId} commodityName={commodityName} className="w-12 h-12 flex-shrink-0" />}
          <div>
            <h1 className="text-[22px] font-bold text-[var(--hw-neutral-900)] leading-tight">
              {commodityName} — Price Trend
            </h1>
            <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">
              {marketLabel} · {priceType} · {baseCurrentPrice > 0 ? "Updated today" : "Updated -"}
            </p>
          </div>
        </div>}

      {
    /* ── Filter row (up to 4 dropdowns) ── */
  }
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SelectFilter label="Market" options={MARKETS} value={market} onChange={setMarket} />
        <SelectFilter label="Price Type" options={PTYPES} value={priceType} onChange={setPriceType} />
        <SelectFilter label="Forecast Horizon" options={HORIZONS} value={horizon} onChange={setHorizon} />
        {varietyOptions.length > 1 && <SelectFilter
    label="Variety"
    options={varietyOptions}
    value={variety}
    onChange={setVariety}
  />}
      </div>

      {
    /* ── Section A: Current Price Trend ── */
  }
      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Current Price Trend</h2>

        {(() => {
          const hasCurrent = baseCurrentPrice > 0;
          const hasPrevious = basePreviousPrice > 0;
          const hasChange = hasCurrent && hasPrevious && change !== 0;

          return (
            <div className="grid grid-cols-3 gap-2">
              <StatCard
                label="Current Price"
                value={hasCurrent ? <>₱{adjCurrent}<span className="text-[13px] font-medium">/kg</span></> : "-/kg"}
                sub={selectedVariety ? `${displayCropName} · ${priceType}` : `${priceType} · ${marketLabel}`}
              />
              <StatCard
                label="Previous Recorded"
                value={hasPrevious ? `₱${adjPrevious}/kg` : "-/kg"}
                sub={selectedVariety ? displayCropName : "Last record"}
              />
              <StatCard
                label="Price Change"
                value={hasChange ? `${change > 0 ? "+" : "−"}₱${Math.abs(change)}` : "-"}
                sub="per kg"
                valueColor={hasChange ? (change > 0 ? "text-emerald-700" : "text-red-600") : "text-[var(--hw-neutral-900)]"}
              />
            </div>
          );
        })()}

        {
    /* Shared line chart — one line per variety */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
          <CurrentPriceTrendChart
    commodity={currentChartCommodityKey}
    chartData={currentChartData}
    varieties={currentChartVarieties}
    colors={varietyColors}
    height={260}
    xDataKey="date"
  />
        </div>

        {
    /* Summary A */
  }
        <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-3 space-y-1.5">
          {baseCurrentPrice > 0 ? (
            <>
              <div className={`flex items-center gap-1.5 ${cfg.color}`}>
                <DirIcon className="w-4 h-4" />
                <span className="text-[12px] font-semibold">{cfg.label} trend</span>
              </div>
              <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">
                {buildCurrentSummary(displayCropName, adjCurrent, adjPrevious, direction)}
              </p>
            </>
          ) : (
            <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">
              No trend data available.
            </p>
          )}
        </div>
      </section>

      {
    /* ── Section B: Forecasted Price Trend ── */
  }
      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">
          Forecasted Price Trend
          <span className="ml-2 text-[12px] font-medium text-[var(--hw-neutral-900)]">· next {days} days</span>
        </h2>

        {/* 4 stat cards (2×2 mobile → 4 cols desktop) */}
        {(() => {
          const hasForecast = baseForecastLow > 0 && baseForecastHigh > 0;
          return (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <StatCard
                  label="Expected Price"
                  value={hasForecast ? <>₱{adjFMid}<span className="text-[12px] font-medium">/kg</span></> : "-/kg"}
                  sub="Forecast midpoint"
                />
                <StatCard
                  label="Forecast Range"
                  value={hasForecast ? `₱${adjFLo}–₱${adjFHi}` : "-/kg"}
                  sub={`Over ${days} days`}
                />
                <StatCard
                  label="Lower Bound"
                  value={hasForecast ? `₱${adjFLo}/kg` : "-/kg"}
                  sub="Conservative estimate"
                  valueColor={hasForecast ? "text-amber-700" : "text-[var(--hw-neutral-900)]"}
                />
                <StatCard
                  label="Upper Bound"
                  value={hasForecast ? `₱${adjFHi}/kg` : "-/kg"}
                  sub="Optimistic estimate"
                  valueColor={hasForecast ? "text-emerald-700" : "text-[var(--hw-neutral-900)]"}
                />
              </div>

              {/* Shared forecast chart */}
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
                <ForecastPriceTrendChart
                  commodity={currentChartCommodityKey}
                  chartData={forecastChartData}
                  varieties={forecastChartVarieties}
                  colors={varietyColors}
                  height={260}
                />
              </div>

              {/* Summary B */}
              <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-3 space-y-1.5">
                <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">
                  {hasForecast
                    ? buildForecastSummary(displayCropName, adjFLo, adjFHi, days, direction)
                    : "Forecast unavailable for this period."}
                </p>
                <p className="text-[11px] text-[var(--hw-neutral-900)] italic">
                  {priceType === "Wholesale" ? "Wholesale prices are typically 15–20% lower than retail. " : ""}
                  Forecast is based on recent trends and is not guaranteed.
                </p>
              </div>
            </>
          );
        })()}
      </section>

    </div>;
}
export {
  PriceDetailView
};
