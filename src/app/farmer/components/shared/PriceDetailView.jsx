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
import { useLanguage } from "../../../global/contexts/LanguageContext";

const MARKETS = ["Bangkerohan", "DFTC"];
const PTYPES = ["Retail", "Wholesale"];
const HORIZONS = ["7d", "14d", "21d", "28d"];
const HDAYS = { "7d": 7, "14d": 14, "21d": 21, "28d": 28 };
const DEFAULT_VARIETY_SENTINEL = "Default";

const DIR_CFG = {
  rising: { Icon: TrendingUp, color: "text-emerald-600", labelKey: "farmer.factors.price.trend_rising_sub", fallback: "Rising trend" },
  stable: { Icon: Minus, color: "text-blue-600", labelKey: "farmer.factors.price.trend_stable_sub", fallback: "Stable trend" },
  falling: { Icon: TrendingDown, color: "text-red-500", labelKey: "farmer.factors.price.trend_falling_sub", fallback: "Falling trend" },
  none: { Icon: Minus, color: "text-[var(--hw-neutral-500)]", labelKey: "farmer.factors.price.trend_none_sub", fallback: "No trend" }
};

function SelectFilter({
  label,
  options,
  value,
  onChange,
  getOptionLabel
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full pl-3 pr-8 text-[13px] font-medium text-[var(--hw-neutral-900)] bg-white border border-[var(--hw-neutral-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-700)] appearance-none cursor-pointer hover:border-[var(--hw-neutral-400)] transition-colors"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {getOptionLabel ? getOptionLabel(opt) : opt}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--hw-neutral-900)] pointer-events-none" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  valueColor
}) {
  return (
    <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3">
      <p className="text-[10px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide mb-1">{label}</p>
      <div className={`text-[18px] font-bold leading-none ${valueColor ?? "text-[var(--hw-neutral-900)]"}`}>{value}</div>
      {sub && <p className="text-[10px] text-[var(--hw-neutral-900)] mt-0.5">{sub}</p>}
    </div>
  );
}

function PriceDetailView({
  commodityId,
  commodityName,
  baseCurrentPrice,
  basePreviousPrice,
  direction,
  baseForecastLow,
  baseForecastHigh,
  baseActualPoints = [],
  showHeading = false
}) {
  const { t } = useLanguage();
  const [market, setMarket] = useState("Bangkerohan");
  const [priceType, setPriceType] = useState("Retail");
  const [horizon, setHorizon] = useState("7d");
  const [variety, setVariety] = useState(DEFAULT_VARIETY_SENTINEL);

  if (!baseCurrentPrice || baseCurrentPrice <= 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-[13px] text-[var(--hw-neutral-500)] font-medium text-center">
        {t("farmer.empty.no_price_data", {}, "Price information is not available right now.")}
      </div>
    );
  }

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

  const days = HDAYS[horizon] || 7;
  const typeMultiplier = priceType === "Wholesale" ? 0.82 : 1;
  const marketMultiplier = market === "DFTC" ? 0.97 : 1;
  const adj = typeMultiplier * marketMultiplier;

  const adjCurrent = Math.round(baseCurrentPrice * adj) + varietyPriceOffset;
  const adjPrevious = Math.round((basePreviousPrice || baseCurrentPrice) * adj) + varietyPriceOffset;
  const adjFLo = Math.round((baseForecastLow || baseCurrentPrice * 0.95) * adj) + varietyPriceOffset;
  const adjFHi = Math.round((baseForecastHigh || baseCurrentPrice * 1.05) * adj) + varietyPriceOffset;
  const adjFMid = Math.round((adjFLo + adjFHi) / 2);
  const change = adjCurrent - adjPrevious;

  const cfg = DIR_CFG[direction] || DIR_CFG.none;
  const DirIcon = cfg.Icon;

  const marketLabel = market === "Bangkerohan" ? t("farmer.factors.price.bangkerohan_market", {}, "Bangkerohan Market") : "DFTC";
  const priceTypeLabel = priceType === "Wholesale" ? t("farmer.factors.price.wholesale", {}, "Wholesale") : t("farmer.factors.price.retail", {}, "Retail");
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
      { date: t("farmer.factors.weather.today_day_label", {}, "Today"), [key]: adjCurrent, [`${key}__lo`]: adjCurrent, [`${key}__hi`]: adjCurrent },
      ...Array.from({ length: days }, (_, i) => ({
        date: `+${i + 1}d`,
        [key]: Math.round(adjCurrent + (adjFMid - adjCurrent) * ((i + 1) / days)),
        [`${key}__lo`]: Math.round(adjCurrent + (adjFLo - adjCurrent) * ((i + 1) / days)),
        [`${key}__hi`]: Math.round(adjCurrent + (adjFHi - adjCurrent) * ((i + 1) / days))
      }))
    ];
  }, [dftcName, days, adj, adjCurrent, adjFMid, adjFLo, adjFHi, commodityName, t]);

  const forecastChartVarieties = useMemo(() => {
    if (dftcName) return varieties;
    return [{ variety: "" }];
  }, [dftcName, varieties]);

  const hasCurrent = adjCurrent > 0;
  const hasPrevious = adjPrevious > 0;
  const hasChange = hasCurrent && hasPrevious && change !== 0;
  const hasForecast = adjFLo > 0 && adjFHi > 0;

  const getMarketOptionLabel = (m) => (m === "Bangkerohan" ? t("farmer.factors.price.bangkerohan_market", {}, "Bangkerohan Market") : "DFTC");
  const getPriceTypeOptionLabel = (pt) => (pt === "Wholesale" ? t("farmer.factors.price.wholesale", {}, "Wholesale") : t("farmer.factors.price.retail", {}, "Retail"));
  const getVarietyOptionLabel = (v) => (v === DEFAULT_VARIETY_SENTINEL ? t("farmer.factors.price.default_variety", {}, "Default") : v);

  return (
    <div className="space-y-5">
      {/* Optional heading */}
      {showHeading && (
        <div className="flex items-center gap-3">
          {commodityId && <CommodityIllustration commodityId={commodityId} commodityName={commodityName} className="w-12 h-12 flex-shrink-0" />}
          <div>
            <h1 className="text-[22px] font-bold text-[var(--hw-neutral-900)] leading-tight">
              {commodityName} — {t("farmer.factors.price.current_price_trend_title", {}, "Current Price Trend")}
            </h1>
            <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">
              {marketLabel} · {priceTypeLabel} · {t("farmer.common.updated", {}, "Updated")}
            </p>
          </div>
        </div>
      )}

      {/* Filter row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SelectFilter
          label={t("farmer.factors.price.filter_market", {}, "Market")}
          options={MARKETS}
          value={market}
          onChange={setMarket}
          getOptionLabel={getMarketOptionLabel}
        />
        <SelectFilter
          label={t("farmer.factors.price.filter_price_type", {}, "Price Type")}
          options={PTYPES}
          value={priceType}
          onChange={setPriceType}
          getOptionLabel={getPriceTypeOptionLabel}
        />
        <SelectFilter
          label={t("farmer.factors.price.filter_forecast_horizon", {}, "Forecast Horizon")}
          options={HORIZONS}
          value={horizon}
          onChange={setHorizon}
        />
        {varietyOptions.length > 1 && (
          <SelectFilter
            label={t("farmer.factors.price.filter_variety", {}, "Variety")}
            options={varietyOptions}
            value={variety}
            onChange={setVariety}
            getOptionLabel={getVarietyOptionLabel}
          />
        )}
      </div>

      {/* Section A: Current Price Trend */}
      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">
          {t("farmer.factors.price.current_price_trend_title", {}, "Current Price Trend")}
        </h2>

        <div className="grid grid-cols-3 gap-2">
          <StatCard
            label={t("farmer.factors.price.current_price_label", {}, "Current Price")}
            value={hasCurrent ? <>₱{adjCurrent}<span className="text-[13px] font-medium">{t("farmer.common.per_kg", {}, "/ kg")}</span></> : t("farmer.advisory.not_available", {}, "Not available")}
            sub={selectedVariety ? `${displayCropName} · ${priceTypeLabel}` : `${priceTypeLabel} · ${marketLabel}`}
          />
          <StatCard
            label={t("farmer.factors.price.previous_recorded_label", {}, "Previous Recorded")}
            value={hasPrevious ? `₱${adjPrevious}${t("farmer.common.per_kg", {}, "/ kg")}` : t("farmer.advisory.not_available", {}, "Not available")}
            sub={selectedVariety ? displayCropName : t("farmer.factors.price.last_record_sub", {}, "Last record")}
          />
          <StatCard
            label={t("farmer.factors.price.price_change_label", {}, "Price Change")}
            value={hasChange ? `${change > 0 ? "+" : "−"}₱${Math.abs(change)}` : t("farmer.advisory.not_available", {}, "Not available")}
            sub={t("farmer.factors.price.per_kg", {}, "per kg")}
            valueColor={hasChange ? (change > 0 ? "text-emerald-700" : "text-red-600") : "text-[var(--hw-neutral-900)]"}
          />
        </div>

        {/* Current price chart */}
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

        {/* Summary A */}
        <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-3 space-y-1.5">
          <div className={`flex items-center gap-1.5 ${cfg.color}`}>
            <DirIcon className="w-4 h-4" />
            <span className="text-[12px] font-semibold">{t(cfg.labelKey, {}, cfg.fallback)}</span>
          </div>
          <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">
            {direction === "rising"
              ? t("farmer.factors.price.favorable_banner_desc", {}, "Prices are trending upward — a good signal for upcoming sales.")
              : direction === "falling"
              ? t("farmer.factors.price.unfavorable_banner_desc", {}, "Prices are trending downward — consider timing your sale carefully.")
              : t("farmer.factors.price.watch_banner_desc", {}, "Prices are stable — monitor for changes before deciding to sell.")}
          </p>
        </div>
      </section>

      {/* Section B: Forecasted Price Trend */}
      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">
          {t("farmer.factors.price.forecasted_price_trend_title", {}, "Forecasted Price Trend")}
          <span className="ml-2 text-[12px] font-medium text-[var(--hw-neutral-900)]">
            {t("farmer.factors.price.next_days_sub", { days }, `· next ${days} days`)}
          </span>
        </h2>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatCard
            label={t("farmer.factors.price.expected_price_label", {}, "Expected Price")}
            value={hasForecast ? <>₱{adjFMid}<span className="text-[12px] font-medium">{t("farmer.common.per_kg", {}, "/ kg")}</span></> : t("farmer.advisory.not_available", {}, "Not available")}
            sub={t("farmer.factors.price.forecast_midpoint_sub", {}, "Forecast midpoint")}
          />
          <StatCard
            label={t("farmer.factors.price.forecast_range_label", {}, "Forecast Range")}
            value={hasForecast ? `₱${adjFLo}–₱${adjFHi}` : t("farmer.advisory.not_available", {}, "Not available")}
            sub={t("farmer.factors.price.over_days_sub", { days }, `Over ${days} days`)}
          />
          <StatCard
            label={t("farmer.factors.price.lower_bound_label", {}, "Lower Bound")}
            value={hasForecast ? `₱${adjFLo}${t("farmer.common.per_kg", {}, "/ kg")}` : t("farmer.advisory.not_available", {}, "Not available")}
            sub={t("farmer.factors.price.conservative_sub", {}, "Conservative estimate")}
            valueColor={hasForecast ? "text-amber-700" : "text-[var(--hw-neutral-900)]"}
          />
          <StatCard
            label={t("farmer.factors.price.upper_bound_label", {}, "Upper Bound")}
            value={hasForecast ? `₱${adjFHi}${t("farmer.common.per_kg", {}, "/ kg")}` : t("farmer.advisory.not_available", {}, "Not available")}
            sub={t("farmer.factors.price.optimistic_sub", {}, "Optimistic estimate")}
            valueColor={hasForecast ? "text-emerald-700" : "text-[var(--hw-neutral-900)]"}
          />
        </div>

        {/* Forecast chart */}
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
              ? t("farmer.factors.price.forecast_reference_range", { forecast_lo: adjFLo, forecast_hi: adjFHi }, `Estimated selling price is between ₱${adjFLo} and ₱${adjFHi}/kg.`)
              : t("farmer.factors.price.forecast_unavailable_period", {}, "Forecast unavailable for this period.")}
          </p>
          <p className="text-[11px] text-[var(--hw-neutral-900)] italic">
            {priceType === "Wholesale" ? t("farmer.factors.price.wholesale_notice", {}, "Wholesale prices are typically 15–20% lower than retail. ") : ""}
            {t("farmer.factors.price.forecast_disclaimer", {}, "Forecast is based on recent trends and is not guaranteed.")}
          </p>
        </div>
      </section>
    </div>
  );
}

export {
  PriceDetailView
};
