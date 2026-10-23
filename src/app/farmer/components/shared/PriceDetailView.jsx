import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, ChevronDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { CommodityIllustration } from "../../../global/components/shared/CommodityIllustrations";
import { ForecastPriceTrendChart } from "../../../global/components/shared/ForecastPriceTrendChart";
import {
  HW_GREEN_SHADES
} from "../../../global/components/shared/trendChartData";
import {
  toPriceTypeKey,
  catalogPairsFromPriceList,
  findCommodityId,
  buildHistoricalChartData,
  buildForecastChartData,
  buildUnifiedPriceTrendData,
  formatChartDate,
  getAvailableVarietiesForCommodity,
  pickDefaultVariety
} from "../../../global/utils/priceChartTransforms";
import { getVariants } from "../../../global/data/commodities";
import { useLanguage } from "../../../global/contexts/LanguageContext";
import {
  fetchPricesList,
  STALE_TIME,
} from "../../../global/hooks/useFarmerPrefetch";
import * as pricesApi from "../../../../services/api/pricesApi";
import * as analyticsApi from "../../../../services/api/analyticsApi";
import { Skeleton } from "./FarmerSkeletons";
import { HistoricalAveragePriceSection } from "../../../global/components/shared/HistoricalAveragePriceSection";

const MARKETS = ["Bangkerohan Public Market", "DFTC"];

const PTYPES = ["Retail", "Wholesale"];
const HORIZONS = ["7d", "14d", "21d", "28d"];
const HDAYS = { "7d": 7, "14d": 14, "21d": 21, "28d": 28 };
const DEFAULT_VARIETY_SENTINEL = "__NO_VARIETY__";

// STATUS_CFG used below the chart for the quantitative interpretation label+icon
const STATUS_CFG = {
  favorable: {
    Icon: TrendingUp,
    color: "text-emerald-700",
    labelKey: "farmer.calendar.factors.price_level_favorable",
    fallback: "Favorable"
  },
  neutral: {
    Icon: Minus,
    color: "text-blue-700",
    labelKey: "farmer.calendar.factors.price_level_neutral",
    fallback: "Neutral"
  },
  unfavorable: {
    Icon: TrendingDown,
    color: "text-red-600",
    labelKey: "farmer.calendar.factors.price_level_unfavorable",
    fallback: "Unfavorable"
  },
  insufficient_data: {
    Icon: AlertCircle,
    color: "text-slate-600",
    labelKey: "farmer.calendar.factors.price_level_insufficient",
    fallback: "Insufficient Data"
  }
};

// Top-of-tab prominent classification banner — matches Kita / Arrival / Production banner style
const PRICE_CLASSIFICATION_BANNER = {
  favorable: {
    Icon: CheckCircle2,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    titleKey: "farmer.factors.price.favorable_banner_title",
    descKey: "farmer.factors.price.favorable_banner_desc",
    fallbackTitle: "Favorable Price",
    fallbackDesc: "Prices are trending upward — a good signal for upcoming sales."
  },
  neutral: {
    Icon: Minus,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    titleKey: "farmer.factors.price.watch_banner_title",
    descKey: "farmer.factors.price.watch_banner_desc",
    fallbackTitle: "Watch",
    fallbackDesc: "Prices are stable — monitor for changes before deciding to sell."
  },
  unfavorable: {
    Icon: AlertCircle,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    titleKey: "farmer.factors.price.unfavorable_banner_title",
    descKey: "farmer.factors.price.unfavorable_banner_desc",
    fallbackTitle: "Unfavorable Price",
    fallbackDesc: "Prices are trending downward — consider timing your sale carefully."
  },
  insufficient_data: {
    Icon: AlertCircle,
    color: "text-slate-700",
    bg: "bg-slate-50",
    border: "border-slate-200",
    titleKey: "farmer.factors.price.insufficient_banner_title",
    descKey: "farmer.factors.price.insufficient_banner_desc",
    fallbackTitle: "Insufficient Data",
    fallbackDesc: "Required price reference or baseline data is unavailable for this crop stage."
  }
};

function SelectFilter({
  label,
  options,
  value,
  onChange,
  getOptionLabel
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label className="text-[11px] sm:text-[12px] font-semibold text-black uppercase tracking-wide truncate">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 sm:h-9 w-full pl-2 sm:pl-2.5 pr-6 sm:pr-8 text-[12px] sm:text-[13px] font-medium text-black bg-white border border-[var(--hw-neutral-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-700)] appearance-none cursor-pointer hover:border-[var(--hw-neutral-400)] transition-colors truncate"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {getOptionLabel ? getOptionLabel(opt) : opt}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black pointer-events-none" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  valueColor,
  isLoading
}) {
  if (isLoading) {
    return (
      <div className="bg-[var(--hw-neutral-50)] rounded-xl p-2.5 sm:p-3 border border-[var(--hw-neutral-100)] space-y-1.5">
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="h-5 w-24 rounded" />
      </div>
    );
  }
  return (
    <div className="bg-[var(--hw-neutral-50)] rounded-xl p-2.5 sm:p-3 flex flex-col justify-between min-w-0 border border-[var(--hw-neutral-100)]">
      <div>
        <p className="text-[10px] sm:text-[11px] font-semibold text-black uppercase tracking-wide mb-1 leading-tight line-clamp-2">
          {label}
        </p>
        <div className={`text-[13px] sm:text-[14px] md:text-[15px] font-bold leading-tight break-words ${valueColor ?? "text-black"}`}>
          {value}
        </div>
      </div>
      {sub && <p className="text-[10px] sm:text-[11px] text-black mt-1 leading-tight">{sub}</p>}
    </div>
  );
}

function ClassificationBadge({ classification, labelPrefix = "" }) {
  const norm = String(classification || "").toLowerCase().replace(/[\s-]/g, "_");
  const cfg = STATUS_CFG[norm] || STATUS_CFG.neutral;
  const Icon = cfg.Icon;
  const label = cfg.fallback;
  const badgeClasses =
    norm === "favorable"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : norm === "unfavorable"
      ? "bg-red-50 text-red-700 border-red-200"
      : norm === "insufficient_data"
      ? "bg-slate-50 text-slate-700 border-slate-200"
      : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold border ${badgeClasses}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{labelPrefix ? `${labelPrefix}: ` : ""}{label}</span>
    </div>
  );
}

function PriceSummaryStrip({
  isStageSpecific,
  isStage2,
  hasStage2Forecast,
  effectiveCropStage,
  priceOutlookModel,
  isDataLoading,
  changeDisplay,
  changeColor,
  histChangeDisplay,
  histChangeColor,
  t,
}) {
  if (isStageSpecific) {
    if (isStage2 && hasStage2Forecast) {
      return (
        <div className="space-y-3 pt-2">
          {/* Dual Assessment Header */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Dual Assessment
                </span>
                <span className="text-[11px] font-medium text-emerald-700">· Forecast & Seasonal Benchmarks</span>
              </div>
              <p className="text-[12px] text-emerald-950 mt-0.5">
                Your crop is planted and covered by an eligible harvest forecast. Both the harvest forecast and historical seasonal benchmarks are displayed below.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-white border border-emerald-300 text-emerald-800 self-start sm:self-auto shrink-0 shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Forecast Eligible
            </span>
          </div>

          {/* Two panels: 1) Forecast Information, 2) Historical Seasonal Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Panel 1: Forecast Information (Primary Assessment) */}
            <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-3.5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--hw-neutral-100)]">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <h3 className="text-[13px] font-bold text-black">
                    Forecast Information (Primary Basis)
                  </h3>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {t("farmer.factors.price.forecast_source", {}, "Forecasting")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  label={t("farmer.factors.price.forecast_harvest_price", {}, "Forecast Harvest Price")}
                  value={
                    priceOutlookModel?.referencePrice != null ? (
                      <>
                        ₱{priceOutlookModel.referencePrice.toFixed(2)}
                        <span className="text-[10px] sm:text-[12px] font-medium text-black">
                          {" "}{t("common.per_kg", {}, "/ kg")}
                        </span>
                      </>
                    ) : (
                      "—"
                    )
                  }
                  sub={
                    priceOutlookModel?.lowerForecast != null && priceOutlookModel?.upperForecast != null
                      ? `Range: ₱${priceOutlookModel.lowerForecast.toFixed(2)}–₱${priceOutlookModel.upperForecast.toFixed(2)}`
                      : "Expected harvest window"
                  }
                  isLoading={isDataLoading}
                />
                <StatCard
                  label={t("farmer.factors.price.forecast_baseline_label", {}, "Forecast Baseline")}
                  value={
                    priceOutlookModel?.comparisonBaseline != null ? (
                      <>
                        ₱{priceOutlookModel.comparisonBaseline.toFixed(2)}
                        <span className="text-[10px] sm:text-[12px] font-medium text-black">
                          {" "}{t("common.per_kg", {}, "/ kg")}
                        </span>
                      </>
                    ) : (
                      "—"
                    )
                  }
                  sub={priceOutlookModel?.comparisonBaselineLabel || "Comparison baseline"}
                  isLoading={isDataLoading}
                />
                <StatCard
                  label={t("farmer.factors.price.forecast_price_change_label", {}, "Forecast Price Change")}
                  value={changeDisplay}
                  sub={t("farmer.factors.price.vs_baseline", {}, "vs. baseline")}
                  valueColor={changeColor}
                  isLoading={isDataLoading}
                />
                <div className="bg-[var(--hw-neutral-50)] rounded-xl p-2 sm:p-3 flex flex-col justify-between min-w-0 border border-[var(--hw-neutral-100)]">
                  <p className="text-[9px] sm:text-[10px] font-semibold text-black uppercase tracking-wide mb-0.5 sm:mb-1">
                    {t("farmer.factors.price.forecast_classification", {}, "Forecast Classification")}
                  </p>
                  <div>
                    <ClassificationBadge classification={priceOutlookModel?.forecastPriceOutlook || priceOutlookModel?.classification} />
                  </div>
                  <p className="text-[9px] sm:text-[11px] text-black mt-1">
                    {t("farmer.factors.price.stage_planting", {}, "Stage 2: Planting")}
                  </p>
                </div>
              </div>
            </div>

            {/* Panel 2: Historical Seasonal Information */}
            <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-3.5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--hw-neutral-100)]">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <h3 className="text-[13px] font-bold text-black">
                    {t("farmer.factors.price.historical_seasonal_info_title", {}, "Historical Seasonal Information")}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {t("farmer.factors.price.seasonal_source", {}, "Historical Seasonal")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  label={t("farmer.factors.price.historical_seasonal_avg_label", {}, "Historical Seasonal Avg")}
                  value={
                    priceOutlookModel?.historicalSeasonalPrice != null ? (
                      <>
                        ₱{priceOutlookModel.historicalSeasonalPrice.toFixed(2)}
                        <span className="text-[10px] sm:text-[12px] font-medium text-black">
                          {" "}{t("common.per_kg", {}, "/ kg")}
                        </span>
                      </>
                    ) : (
                      "—"
                    )
                  }
                  sub={t("farmer.factors.price.harvest_season_avg", {}, "Harvest season avg")}
                  isLoading={isDataLoading}
                />
                <StatCard
                  label={t("farmer.factors.price.macro_baseline_label", {}, "Multi-Year Macro Baseline")}
                  value={
                    priceOutlookModel?.macroBaselinePrice != null ? (
                      <>
                        ₱{priceOutlookModel.macroBaselinePrice.toFixed(2)}
                        <span className="text-[10px] sm:text-[12px] font-medium text-black">
                          {" "}{t("common.per_kg", {}, "/ kg")}
                        </span>
                      </>
                    ) : (
                      "—"
                    )
                  }
                  sub={t("farmer.factors.price.historical_benchmark", {}, "Historical benchmark")}
                  isLoading={isDataLoading}
                />
                <StatCard
                  label={t("farmer.factors.price.historical_change_label", {}, "Historical Price Change")}
                  value={histChangeDisplay}
                  sub={t("farmer.factors.price.vs_macro_baseline", {}, "vs. macro baseline")}
                  valueColor={histChangeColor}
                  isLoading={isDataLoading}
                />
                <div className="bg-[var(--hw-neutral-50)] rounded-xl p-2 sm:p-3 flex flex-col justify-between min-w-0 border border-[var(--hw-neutral-100)]">
                  <p className="text-[9px] sm:text-[10px] font-semibold text-black uppercase tracking-wide mb-0.5 sm:mb-1">
                    {t("farmer.factors.price.historical_classification", {}, "Historical Classification")}
                  </p>
                  <div>
                    <ClassificationBadge classification={priceOutlookModel?.historicalPriceOutlook || "neutral"} />
                  </div>
                  <p className="text-[9px] sm:text-[11px] text-black mt-1">
                    {t("farmer.factors.price.preserved_historical_benchmark", {}, "Preserved historical benchmark")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="pt-2">
        {/* Stage 2 Forecast Unavailable Callout */}
        {isStage2 && (
          <div className="bg-white border border-[var(--hw-neutral-200)] rounded-xl p-3 flex items-start gap-2.5 text-[12px] text-[var(--hw-neutral-800)] shadow-xs mb-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-700" />
            </div>
            <div className="min-w-0 flex-1 leading-snug pt-0.5">
              <span className="font-semibold text-black">
                {t("farmer.factors.price.stage2_forecast_unavailable_title", {}, "Forecast Information Unavailable: ")}
              </span>
              <span>
                {t("farmer.factors.price.stage2_forecast_unavailable_desc", {}, "Your crop is in the planting stage, but the expected harvest date is beyond the validated 28-day forecast horizon (or valid forecast data is not yet available). Current Price Outlook is based on historical seasonal data. Forecast data will automatically become available when your crop enters the 28-day harvest window.")}
              </span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          <StatCard
            label={
              priceOutlookModel?.priceReferenceType === "historical_seasonal" ||
              String(priceOutlookModel?.priceReferenceLabel || "").toLowerCase().includes("historical seasonal")
                ? t("farmer.factors.price.historical_seasonal_average_label", {}, "Historical Seasonal Average Price")
                : (priceOutlookModel?.priceReferenceLabel || t("farmer.factors.price.reference_price_label", {}, "Reference Price"))
            }
            value={
              priceOutlookModel?.referencePrice != null ? (
                <>
                  ₱{priceOutlookModel.referencePrice.toFixed(2)}
                  <span className="text-[10px] sm:text-[12px] font-medium text-black">
                    {" "}{t("common.per_kg", {}, "/ kg")}
                  </span>
                </>
              ) : (
                "—"
              )
            }
            isLoading={isDataLoading}
          />
          <StatCard
            label={
              priceOutlookModel?.priceReferenceType === "historical_seasonal" ||
              String(priceOutlookModel?.comparisonBaselineLabel || "").toLowerCase().includes("macro baseline")
                ? t("farmer.factors.price.macro_baseline_label", {}, "Multi-Year Macro Baseline")
                : (priceOutlookModel?.comparisonBaselineLabel || t("farmer.factors.price.baseline_price_label", {}, "Baseline Price"))
            }
            value={
              priceOutlookModel?.comparisonBaseline != null ? (
                <>
                  ₱{priceOutlookModel.comparisonBaseline.toFixed(2)}
                  <span className="text-[10px] sm:text-[12px] font-medium text-black">
                    {" "}{t("common.per_kg", {}, "/ kg")}
                  </span>
                </>
              ) : (
                "—"
              )
            }
            isLoading={isDataLoading}
          />
          <StatCard
            label={t("farmer.factors.price.expected_price_change_label", {}, "Expected Price Change")}
            value={changeDisplay}
            valueColor={changeColor}
            isLoading={isDataLoading}
          />
          <StatCard
            label={t("farmer.factors.price.data_source_label", {}, "Price Basis & Stage")}
            value={
              priceOutlookModel?.status === "insufficient_data" ? (
                <span className="text-slate-600 font-semibold">{t("farmer.calendar.factors.price_level_insufficient", {}, "Insufficient Data")}</span>
              ) : priceOutlookModel?.isFallback ? (
                <span className="text-amber-700 font-semibold">{t("farmer.factors.price.fallback_source", {}, "Historical Fallback")}</span>
              ) : priceOutlookModel?.priceReferenceType === "historical_seasonal" ? (
                <span className="text-emerald-700 font-semibold">{t("farmer.factors.price.seasonal_source", {}, "Historical Seasonal")}</span>
              ) : priceOutlookModel?.priceReferenceType === "forecast" ? (
                <span className="text-blue-700 font-semibold">{t("farmer.factors.price.forecast_source", {}, "Forecasting")}</span>
              ) : priceOutlookModel?.priceReferenceType === "current_observed" ? (
                <span className="text-teal-700 font-semibold">{t("farmer.factors.price.observed_source", {}, "Observed Market")}</span>
              ) : (
                <span className="text-black font-semibold">{t("farmer.factors.price.standard_source", {}, "Market Data")}</span>
              )
            }
            sub={
              effectiveCropStage === "before_planting"
                ? t("farmer.factors.price.stage_planning", {}, "Stage 1: Planning")
                : effectiveCropStage === "during_planting"
                ? t("farmer.factors.price.stage_planting", {}, "Stage 2: Planting")
                : effectiveCropStage === "near_harvest"
                ? t("farmer.factors.price.stage_near_harvest", {}, "Stage 3: Near Harvest")
                : effectiveCropStage === "harvest"
                ? t("farmer.factors.price.stage_harvest", {}, "Stage 4: Harvest")
                : t("farmer.factors.price.stage_active", {}, "Active Crop Stage")
            }
            isLoading={isDataLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 pt-2">
      <StatCard
        label={t("farmer.factors.price.recent_average_price_label", {}, "Recent Average Price")}
        value={
          priceOutlookModel?.recentAverage != null ? (
            <>
              ₱{priceOutlookModel.recentAverage.toFixed(2)}
              <span className="text-[10px] sm:text-[12px] font-medium text-black">
                {" "}{t("common.per_kg", {}, "/ kg")}
              </span>
            </>
          ) : (
            "—"
          )
        }
        isLoading={isDataLoading}
      />
      <StatCard
        label={t("farmer.factors.price.estimated_price_label", {}, "Estimated Price")}
        value={
          priceOutlookModel?.forecastMidpoint != null ? (
            <>
              ₱{priceOutlookModel.forecastMidpoint.toFixed(2)}
              <span className="text-[10px] sm:text-[12px] font-medium text-black">
                {" "}{t("common.per_kg", {}, "/ kg")}
              </span>
            </>
          ) : (
            "—"
          )
        }
        isLoading={isDataLoading}
      />
      <StatCard
        label={t("farmer.factors.price.forecast_range_label", {}, "Forecast Range")}
        value={
          priceOutlookModel?.lowerForecast != null && priceOutlookModel?.upperForecast != null ? (
            <>
              ₱{priceOutlookModel.lowerForecast.toFixed(2)}–₱{priceOutlookModel.upperForecast.toFixed(2)}
              <span className="text-[10px] sm:text-[12px] font-medium text-black">
                {" "}{t("common.per_kg", {}, "/ kg")}
              </span>
            </>
          ) : (
            "—"
          )
        }
        isLoading={isDataLoading}
      />
      <StatCard
        label={t("farmer.factors.price.expected_price_change_label", {}, "Expected Price Change")}
        value={changeDisplay}
        valueColor={changeColor}
        isLoading={isDataLoading}
      />
    </div>
  );
}

function PriceDetailView({
  commodityId,
  commodityName,
  showHeading = false,
  cropStage = null,
  plantingDate = null,
  expectedHarvestDate = null,
  plantingSeason = null,
  moduleResults = null,
  plantingWindowStart = null,
  plantingWindowEnd = null,
  plantingWindowLabel = null,
}) {
  const { t, effectiveLanguage, langCode } = useLanguage();
  const currentLang = effectiveLanguage || langCode || "ceb";
  const [market, setMarket] = useState("Bangkerohan Public Market");
  const [priceType, setPriceType] = useState("Retail");
  const [historicalRange, setHistoricalRange] = useState("14d");
  const [horizon, setHorizon] = useState("14d");
  const [variety, setVariety] = useState(null);

  const days = HDAYS[horizon] || 14;
  const pPriceTypeKey = toPriceTypeKey(market, priceType);

  // 1. Top-10 catalog, to resolve commodity IDs & catalog varieties.
  const { data: catalogData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ["prices", "list"],
    queryFn: () => pricesApi.getPriceList({ is_top10: true, page_size: 50 }),
    staleTime: STALE_TIME,
  });

  const catalogPairs = useMemo(
    () => catalogPairsFromPriceList(catalogData?.items),
    [catalogData]
  );

  const availableVarieties = useMemo(
    () => getAvailableVarietiesForCommodity(catalogPairs, commodityName, market, priceType),
    [catalogPairs, commodityName, market, priceType]
  );

  const activeVariety = useMemo(
    () => pickDefaultVariety(availableVarieties, variety),
    [availableVarieties, variety]
  );

  const selectedVariety = activeVariety || "";

  const varietySelectOptions = useMemo(() => {
    return availableVarieties.map((choice) => ({
      value: choice.isNoVariety ? DEFAULT_VARIETY_SENTINEL : choice.value,
      label: choice.isNoVariety ? t("farmer.factors.price.default_variety", {}, "No variety") : choice.label,
    }));
  }, [availableVarieties, t]);

  const resolvedCommodityId = useMemo(() => {
    const matched = availableVarieties.find((c) =>
      activeVariety === null ? c.isNoVariety : c.value === activeVariety
    );
    if (matched?.commodity_id) return matched.commodity_id;
    if (activeVariety) {
      const vMatch = findCommodityId(catalogPairs, commodityName, activeVariety);
      if (vMatch) return vMatch;
    }
    if (commodityId && String(commodityId).startsWith("COM-")) {
      return commodityId;
    }
    return findCommodityId(catalogPairs, commodityName) || commodityId || null;
  }, [availableVarieties, activeVariety, catalogPairs, commodityName, commodityId]);

  const normalizedInputStage = useMemo(() => {
    if (!cropStage) return null;
    const raw = String(cropStage).toLowerCase().trim();
    if (["before_planting", "planning", "draft"].includes(raw)) return "before_planting";
    if (["during_planting", "growing", "planted"].includes(raw)) return "during_planting";
    if (["near_harvest", "pre_harvest", "pre-harvest", "preharvest"].includes(raw)) return "near_harvest";
    if (["harvest", "harvesting", "harvested"].includes(raw)) return "harvest";
    return raw;
  }, [cropStage]);

  // 2. Fetch authoritative price detail using the exact same API pipeline as backend.
  const stageOptions = useMemo(() => {
    if (!normalizedInputStage && !plantingDate && !expectedHarvestDate) return undefined;
    return {
      cropStage: normalizedInputStage,
      plantingDate,
      harvestDate: expectedHarvestDate,
    };
  }, [normalizedInputStage, plantingDate, expectedHarvestDate]);

  const {
    data: priceOutlookData,
    isLoading: isPriceOutlookLoading,
    isFetching: isPriceOutlookFetching,
  } = useQuery({
    queryKey: [
      "farmer",
      "admin-price-outlook",
      resolvedCommodityId,
      pPriceTypeKey,
      days,
      cropStage,
      plantingDate,
      expectedHarvestDate,
    ],
    queryFn: () =>
      stageOptions
        ? analyticsApi.getPriceOutlook(resolvedCommodityId, pPriceTypeKey, days, stageOptions)
        : analyticsApi.getPriceOutlook(resolvedCommodityId, pPriceTypeKey, days),
    enabled: Boolean(resolvedCommodityId),
    staleTime: STALE_TIME,
  });

  const priceDetailData = useMemo(() => {
    if (!priceOutlookData) return null;
    return {
      recent_records: priceOutlookData.price_records || [],
      forecast: { points: priceOutlookData.forecast_points || [] },
    };
  }, [priceOutlookData]);

  const isDataLoading =
    isCatalogLoading ||
    (Boolean(resolvedCommodityId) && (isPriceOutlookLoading || isPriceOutlookFetching));

  const displayCropName = selectedVariety ? `${commodityName} (${selectedVariety})` : commodityName;
  const seriesKey = commodityName || "Price";

  const rawStage = String(priceOutlookData?.crop_stage || normalizedInputStage || "").toLowerCase().trim();
  const effectiveCropStage =
    ["before_planting", "planning", "draft"].includes(rawStage) ? "before_planting" :
    ["during_planting", "growing", "planted"].includes(rawStage) ? "during_planting" :
    ["near_harvest", "pre_harvest", "pre-harvest", "preharvest"].includes(rawStage) ? "near_harvest" :
    ["harvest", "harvesting", "harvested"].includes(rawStage) ? "harvest" :
    (rawStage || null);
  const isStageSpecific = Boolean(effectiveCropStage);

  // 3. Single authoritative Price Outlook model (shares data between summary, chart, banner, and range)
  const priceOutlookModel = useMemo(() => {
    if (isDataLoading && !moduleResults) {
      return null;
    }

    const source = priceOutlookData || (moduleResults ? {
      status: moduleResults.price_outlook_status === "insufficient_data" ? "insufficient_data" : "processed",
      classification: moduleResults.price_outlook,
      forecast_price_change_pct: moduleResults.price_change_pct,
      reference_price: moduleResults.reference_price,
      comparison_baseline: moduleResults.comparison_baseline,
      price_reference_type: moduleResults.price_reference_type,
      price_reference_label: moduleResults.price_reference_label,
      comparison_baseline_label: moduleResults.comparison_baseline_label,
      reference_period: moduleResults.reference_period,
      is_fallback: moduleResults.is_fallback,
      historical_seasonal_price: moduleResults.historical_seasonal_price,
      macro_baseline_price: moduleResults.macro_baseline_price,
      spot_7d_average_price: moduleResults.spot_7d_average_price,
      recent_average_price: moduleResults.recent_average_price,
      forecast_midpoint: moduleResults.forecast_midpoint,
      lower_forecast: moduleResults.lower_forecast_price,
      upper_forecast: moduleResults.upper_forecast_price,
      explanation: moduleResults.price_explanation,
      crop_stage: cropStage,
      historical_price_change_pct: moduleResults.historical_price_change_pct,
      historical_price_outlook: moduleResults.historical_price_outlook,
      forecast_price_outlook: moduleResults.forecast_price_outlook,
      has_eligible_forecast: moduleResults.has_eligible_forecast,
      days_to_harvest: moduleResults.days_to_harvest,
      planting_window_start: moduleResults.planting_window_start || plantingWindowStart,
      planting_window_end: moduleResults.planting_window_end || plantingWindowEnd,
      planting_window_label: moduleResults.planting_window_label || plantingWindowLabel,
    } : null);

    if (!source) return null;

    const rawStatus = String(source.status || "").toLowerCase();
    const rawClass = String(source.classification || "").toLowerCase().replace(/[\s-]/g, "_");

    if (rawStatus === "insufficient_data" || rawClass === "insufficient_data") {
      return {
        status: "insufficient_data",
        classification: "insufficient_data",
        explanation: source.explanation || t("farmer.factors.price.insufficient_data_expl", {}, "Required price reference or baseline data is unavailable for this crop stage."),
        percentChange: null,
        referencePrice: source.reference_price ?? null,
        comparisonBaseline: source.comparison_baseline ?? null,
        priceReferenceType: source.price_reference_type || "insufficient_data",
        priceReferenceLabel: source.price_reference_label || t("farmer.factors.price.insufficient_data_label", {}, "Insufficient Data"),
        comparisonBaselineLabel: source.comparison_baseline_label || "",
        referencePeriod: source.reference_period || "",
        isFallback: Boolean(source.is_fallback),
        plantingWindowStart: source.planting_window_start || plantingWindowStart,
        plantingWindowEnd: source.planting_window_end || plantingWindowEnd,
        plantingWindowLabel: source.planting_window_label || plantingWindowLabel,
        expectedHarvestDate: source.expected_harvest_date || expectedHarvestDate || moduleResults?.expected_harvest_date,
      };
    }

    if (rawStatus === "unavailable" && !isStageSpecific) {
      return null;
    }

    const classification = ["favorable", "neutral", "unfavorable"].includes(rawClass) ? rawClass : "neutral";
    const refPrice = source.reference_price ?? (isStageSpecific ? null : source.forecast_midpoint);
    const basePrice = source.comparison_baseline ?? (isStageSpecific ? null : (source.current_prevailing_price ?? source.recent_average_price));

    const isNearHarvest = effectiveCropStage === "near_harvest";
    const availableForecastMidpoint = source.forecast_midpoint ?? (
      priceDetailData?.forecast?.points?.length > 0
        ? (priceDetailData.forecast.points[0].midpoint ?? priceDetailData.forecast.points[0].price)
        : null
    );

    let finalRefPrice = refPrice;
    let finalBasePrice = basePrice;
    let finalPriceReferenceType = source.price_reference_type || (source.forecast_midpoint ? "forecast" : "historical_seasonal");
    let finalPriceReferenceLabel = source.price_reference_label || (isStageSpecific ? "Reference Price" : t("farmer.factors.price.estimated_price_label", {}, "Estimated Price"));
    let finalIsFallback = Boolean(source.is_fallback);

    if (isNearHarvest && (availableForecastMidpoint != null || finalPriceReferenceType === "forecast")) {
      if (availableForecastMidpoint != null) {
        finalRefPrice = availableForecastMidpoint;
      }
      if (finalBasePrice == null) {
        finalBasePrice = source.macro_baseline_price ?? source.recent_average_price;
      }
      finalPriceReferenceType = "forecast";
      finalPriceReferenceLabel = t("farmer.factors.price.forecast_harvest_price", {}, "Forecasted Price");
      finalIsFallback = false;
    }

    const percentChange = source.forecast_price_change_pct != null
      ? source.forecast_price_change_pct
      : ((finalRefPrice != null && finalBasePrice != null && finalBasePrice > 0)
          ? ((finalRefPrice - finalBasePrice) / finalBasePrice) * 100
          : (source.forecast_midpoint != null && source.recent_average_price != null && source.recent_average_price > 0)
            ? ((source.forecast_midpoint - source.recent_average_price) / source.recent_average_price) * 100
            : null);

    const diff = (finalRefPrice != null && finalBasePrice != null)
      ? (finalRefPrice - finalBasePrice)
      : ((source.forecast_midpoint != null && source.recent_average_price != null) ? (source.forecast_midpoint - source.recent_average_price) : null);

    const histPct = source.historical_price_change_pct != null
      ? source.historical_price_change_pct
      : ((source.historical_seasonal_price != null && source.macro_baseline_price != null && source.macro_baseline_price > 0)
          ? ((source.historical_seasonal_price - source.macro_baseline_price) / source.macro_baseline_price) * 100
          : null);
    const histClass = source.historical_price_outlook || (
      histPct != null
        ? (histPct > 5.0 ? "favorable" : histPct < -5.0 ? "unfavorable" : "neutral")
        : null
    );
    const fcPct = source.forecast_price_change_pct != null
      ? source.forecast_price_change_pct
      : (finalPriceReferenceType === "forecast" ? percentChange : null);
    const fcClass = source.forecast_price_outlook || (
      finalPriceReferenceType === "forecast"
        ? (classification !== "neutral" ? classification : (fcPct != null ? (fcPct > 5.0 ? "favorable" : fcPct < -5.0 ? "unfavorable" : "neutral") : "neutral"))
        : (fcPct != null ? (fcPct > 5.0 ? "favorable" : fcPct < -5.0 ? "unfavorable" : "neutral") : null)
    );
    const hasEligibleFc = Boolean(
      source.has_eligible_forecast ||
      (isNearHarvest && (availableForecastMidpoint != null || finalPriceReferenceType === "forecast")) ||
      (effectiveCropStage === "during_planting" && finalPriceReferenceType === "forecast")
    );

    return {
      status: "processed",
      classification: finalPriceReferenceType === "forecast" && fcClass ? fcClass : classification,
      percentChange,
      referencePrice: finalRefPrice,
      comparisonBaseline: finalBasePrice,
      absoluteChange: diff,
      priceReferenceType: finalPriceReferenceType,
      priceReferenceLabel: finalPriceReferenceLabel,
      comparisonBaselineLabel: source.comparison_baseline_label || (isStageSpecific ? "Multi-Year Macro Baseline" : t("farmer.factors.price.recent_average_price_label", {}, "Recent Average Price")),
      referencePeriod: source.reference_period || "",
      isFallback: finalIsFallback,
      explanation: source.explanation || "",
      historicalSeasonalPrice: source.historical_seasonal_price,
      macroBaselinePrice: source.macro_baseline_price,
      historicalPriceChangePct: histPct,
      historicalPriceOutlook: histClass,
      forecastPriceChangePct: fcPct,
      forecastPriceOutlook: fcClass,
      hasEligibleForecast: hasEligibleFc,
      daysToHarvest: source.days_to_harvest ?? null,
      spot7dAveragePrice: source.spot_7d_average_price,
      recentAverage: source.recent_average_price,
      forecastMidpoint: source.forecast_midpoint ?? finalRefPrice,
      lowerForecast: source.lower_forecast,
      upperForecast: source.upper_forecast,
      plantingWindowStart: source.planting_window_start || plantingWindowStart,
      plantingWindowEnd: source.planting_window_end || plantingWindowEnd,
      plantingWindowLabel: source.planting_window_label || plantingWindowLabel,
      expectedHarvestDate: source.expected_harvest_date || expectedHarvestDate || moduleResults?.expected_harvest_date,
    };
  }, [priceOutlookData, moduleResults, isDataLoading, isStageSpecific, cropStage, plantingWindowStart, plantingWindowEnd, plantingWindowLabel, expectedHarvestDate, t]);

  const varietyDetails = useMemo(() => {
    if (!priceDetailData) return [];
    return [{ varietyKey: seriesKey, detail: priceDetailData }];
  }, [priceDetailData, seriesKey]);

  const chartVarieties = useMemo(() => [{ variety: seriesKey }], [seriesKey]);
  const varietyColors = useMemo(() => [HW_GREEN_SHADES[0]], []);

  // 4. Transform historical and forecast points using shared utilities
  const historicalData = useMemo(() => {
    if (!priceDetailData) return [];
    return buildHistoricalChartData(varietyDetails, historicalRange).map((pt) => ({
      ...pt,
      date: formatChartDate(pt.date),
    }));
  }, [varietyDetails, priceDetailData, historicalRange]);

  const forecastData = useMemo(() => {
    if (!priceDetailData) return [];
    return buildForecastChartData(varietyDetails).map((pt) => ({
      ...pt,
      date: formatChartDate(pt.date),
    }));
  }, [varietyDetails, priceDetailData]);

  const unifiedChartData = useMemo(() => {
    return buildUnifiedPriceTrendData(historicalData, forecastData, {
      connectTransition: true,
      varietyKeys: [seriesKey],
    });
  }, [historicalData, forecastData, seriesKey]);

  // Status config and explanation
  const statusCfg = (priceOutlookModel && STATUS_CFG[priceOutlookModel.classification]) || STATUS_CFG.neutral;
  const StatusIcon = statusCfg.Icon;
  const composedExplanation = useMemo(() => {
    if (!priceOutlookModel) return "";
    if (priceOutlookModel.status === "insufficient_data") {
      return priceOutlookModel.explanation || t("farmer.factors.price.insufficient_data_expl", {}, "Required price reference or baseline data is unavailable for this crop stage.");
    }
    if (effectiveCropStage === "before_planting" || priceOutlookModel.priceReferenceType === "historical_seasonal") {
      const p = priceOutlookModel.referencePrice != null ? priceOutlookModel.referencePrice.toFixed(2) : "—";
      const b = priceOutlookModel.comparisonBaseline != null ? priceOutlookModel.comparisonBaseline.toFixed(2) : "—";
      const pctVal = priceOutlookModel.percentChange != null ? `${priceOutlookModel.percentChange > 0 ? "+" : ""}${priceOutlookModel.percentChange.toFixed(1)}%` : "0.0%";
      const classKey = priceOutlookModel.classification || "neutral";
      const classLabel = classKey === "favorable"
        ? (currentLang === "ceb" ? "Maayo" : currentLang === "tl" ? "Maganda" : "Favorable")
        : classKey === "unfavorable"
        ? (currentLang === "ceb" ? "Dili Maayo" : currentLang === "tl" ? "Hindi Maganda" : "Unfavorable")
        : (currentLang === "ceb" ? "Sakto ug normal" : currentLang === "tl" ? "Katamtaman" : "Neutral");

      let pctDisplay = pctVal;
      if (priceOutlookModel.percentChange != null) {
        const absVal = Math.abs(priceOutlookModel.percentChange).toFixed(1);
        if (currentLang === "ceb") {
          pctDisplay = priceOutlookModel.percentChange < 0
            ? `mas ubos og ${absVal}%`
            : priceOutlookModel.percentChange > 0
            ? `mas taas og ${absVal}%`
            : "halos pareho (0.0%)";
        } else if (currentLang === "tl") {
          pctDisplay = priceOutlookModel.percentChange < 0
            ? `mas mababa nang ${absVal}%`
            : priceOutlookModel.percentChange > 0
            ? `mas mataas nang ${absVal}%`
            : "halos pareho (0.0%)";
        }
      }

      const defaultFallback = priceOutlookModel.explanation ||
        `Historical seasonal average price (₱${p}/kg) for expected harvest season is ${pctVal} relative to multi-year macro baseline (₱${b}/kg), classified as ${classLabel}.`;

      return t(
        "farmer.factors.price.historical_seasonal_explanation",
        {
          price: p,
          baseline: b,
          pct: pctDisplay,
          classification: classLabel,
        },
        defaultFallback
      );
    }
    return priceOutlookModel.explanation || "";
  }, [priceOutlookModel, effectiveCropStage, currentLang, t]);

  const marketLabel = market === "Bangkerohan Public Market" ? "Bangkerohan" : market;
  const priceTypeLabel = priceType === "Wholesale" ? t("farmer.factors.price.wholesale", {}, "Wholesale") : t("farmer.factors.price.retail", {}, "Retail");

  const getPriceTypeOptionLabel = (pt) => (pt === "Wholesale" ? t("farmer.factors.price.wholesale", {}, "Wholesale") : t("farmer.factors.price.retail", {}, "Retail"));
  const getVarietyOptionLabel = (v) => (v === DEFAULT_VARIETY_SENTINEL ? t("farmer.factors.price.default_variety", {}, "No variety") : v);
  const getHorizonOptionLabel = (h) => {
    const d = HDAYS[h] || 7;
    return t("farmer.factors.price.horizon_days_option", { days: d }, `${d} days`);
  };

  // Expected price change formatted string & styling
  let changeDisplay = "—";
  let changeColor = "text-black";
  if (priceOutlookModel && priceOutlookModel.status !== "insufficient_data" && priceOutlookModel.percentChange != null) {
    const diff = priceOutlookModel.absoluteChange;
    const pct = priceOutlookModel.percentChange;
    if (diff != null && Math.abs(diff) < 0.05 && Math.abs(pct) < 0.1) {
      changeDisplay = t("farmer.factors.price.about_the_same", {}, "About the same");
      changeColor = "text-black";
    } else if (pct > 0) {
      const diffStr = diff != null ? `↑ ₱${diff.toFixed(2)}/kg · ` : "↑ ";
      changeDisplay = `${diffStr}${Math.abs(pct).toFixed(1)}%`;
      changeColor = "text-emerald-700";
    } else if (pct < 0) {
      const diffStr = diff != null ? `↓ ₱${Math.abs(diff).toFixed(2)}/kg · ` : "↓ ";
      changeDisplay = `${diffStr}${Math.abs(pct).toFixed(1)}%`;
      changeColor = "text-red-600";
    } else {
      changeDisplay = `0.0% (${t("farmer.factors.price.stable_word", {}, "no change")})`;
      changeColor = "text-black";
    }
  }

  // Historical seasonal change formatted string & styling for Stage 2 dual display
  const histPct = priceOutlookModel?.historicalPriceChangePct;
  const histDiff = (priceOutlookModel?.historicalSeasonalPrice != null && priceOutlookModel?.macroBaselinePrice != null)
    ? (priceOutlookModel.historicalSeasonalPrice - priceOutlookModel.macroBaselinePrice)
    : null;

  let histChangeDisplay = "—";
  let histChangeColor = "text-black";
  if (histPct != null) {
    if (histDiff != null && Math.abs(histDiff) < 0.05 && Math.abs(histPct) < 0.1) {
      histChangeDisplay = t("farmer.factors.price.about_the_same", {}, "About the same");
      histChangeColor = "text-black";
    } else if (histPct > 0) {
      const diffStr = histDiff != null ? `↑ ₱${histDiff.toFixed(2)}/kg · ` : "↑ ";
      histChangeDisplay = `${diffStr}${Math.abs(histPct).toFixed(1)}%`;
      histChangeColor = "text-emerald-700";
    } else if (histPct < 0) {
      const diffStr = histDiff != null ? `↓ ₱${Math.abs(histDiff).toFixed(2)}/kg · ` : "↓ ";
      histChangeDisplay = `${diffStr}${Math.abs(histPct).toFixed(1)}%`;
      histChangeColor = "text-red-600";
    } else {
      changeDisplay = `0.0% (${t("farmer.factors.price.stable_word", {}, "no change")})`;
      histChangeColor = "text-black";
    }
  }

  const isStage2 = effectiveCropStage === "during_planting";
  const hasStage2Forecast = isStage2 && Boolean(priceOutlookModel?.hasEligibleForecast && !priceOutlookModel?.isFallback);

  // Top classification banner config — resolved from live priceOutlookModel
  const bannerCfg = priceOutlookModel
    ? PRICE_CLASSIFICATION_BANNER[priceOutlookModel.classification]
    : null;
  const BannerIcon = bannerCfg?.Icon;

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* Optional heading */}
      {showHeading && (
        <div className="flex items-center gap-3">
          {commodityId && <CommodityIllustration commodityId={commodityId} commodityName={commodityName} className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" />}
          <div>
            <h1 className="text-[18px] sm:text-[22px] font-bold text-black leading-tight">
              {commodityName} — {t("farmer.factors.price.unified_chart_title", {}, "Price trend and forecast")}
            </h1>
            <p className="text-[12px] sm:text-[13px] text-black mt-0.5">
              {marketLabel} · {priceTypeLabel} · {t("common.updated", {}, "Updated")}
            </p>
          </div>
        </div>
      )}

      {/* ─── Classification Banner (Favorable / Neutral / Unfavorable / Insufficient Data) ─── */}
      {isDataLoading ? (
        <div className="flex items-center gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-[var(--hw-neutral-200)] bg-transparent">
          <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3.5 w-28 rounded" />
            <Skeleton className="h-3 w-56 rounded" />
          </div>
        </div>
      ) : bannerCfg && BannerIcon ? (
        <div className="flex items-center gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-[var(--hw-neutral-200)] bg-transparent">
          <BannerIcon className={`w-5 h-5 ${bannerCfg.color} flex-shrink-0`} />
          <div>
            <p className="text-[14px] sm:text-[15px] font-bold text-black">
              {t(bannerCfg.titleKey, {}, bannerCfg.fallbackTitle)}
            </p>
            <p className="text-[12px] sm:text-[13px] text-black mt-0.5">
              {t(bannerCfg.descKey, {}, bannerCfg.fallbackDesc)}
            </p>
          </div>
        </div>
      ) : null}

      {/* Filter row: Palengke | Variety | Price Type */}
      <div className={`grid gap-2 sm:gap-3 ${varietySelectOptions.length > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
        <div className="min-w-0">
          <SelectFilter
            label={t("farmer.factors.price.filter_market", {}, "Market")}
            options={MARKETS}
            value={market}
            onChange={setMarket}
            getOptionLabel={(m) => m === "Bangkerohan Public Market" ? "Bangkerohan" : m}
          />
        </div>
        {varietySelectOptions.length > 0 && (
          <div className="min-w-0">
            <SelectFilter
              label={t("farmer.factors.price.filter_variety", {}, "Variety")}
              options={varietySelectOptions.map((o) => o.value)}
              value={activeVariety === null ? DEFAULT_VARIETY_SENTINEL : activeVariety}
              onChange={(val) => setVariety(val === DEFAULT_VARIETY_SENTINEL ? null : val)}
              getOptionLabel={(val) => {
                const opt = varietySelectOptions.find((o) => o.value === val);
                return opt ? opt.label : val;
              }}
            />
          </div>
        )}
        <div className="min-w-0">
          <SelectFilter
            label={t("farmer.factors.price.filter_price_type", {}, "Price Type")}
            options={PTYPES}
            value={priceType}
            onChange={setPriceType}
            getOptionLabel={getPriceTypeOptionLabel}
          />
        </div>
      </div>

      {/* Unified Single Price Trend & Forecast Chart Card */}
      <section className="space-y-3 sm:space-y-4">
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3 sm:p-4 md:p-6 space-y-2.5 sm:space-y-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 border-b border-[var(--hw-neutral-100)]">
            <div>
              <h2 className="text-[15px] font-bold text-black">
                {t("farmer.factors.price.unified_chart_title", {}, "Price trend and forecast")}
              </h2>
              <p className="text-[12px] sm:text-[13px] text-black mt-0.5">
                {displayCropName} · {marketLabel} · {priceTypeLabel} · {t("farmer.factors.price.chart_context_sub", { days }, `Recent prices and next ${days} days`)}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-[11px] sm:text-[12px] font-medium text-black whitespace-nowrap">
                  {t("farmer.factors.price.historical_range_label", {}, "Historical Range")}
                </span>
                <select
                  value={historicalRange}
                  onChange={(e) => setHistoricalRange(e.target.value)}
                  className="h-8 w-full sm:w-auto pl-2.5 pr-7 text-[12px] font-medium text-black bg-[var(--hw-neutral-50)] hover:bg-white border border-[var(--hw-neutral-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-700)] cursor-pointer transition-colors"
                >
                  <option value="7d">{t("farmer.factors.price.last_days_option", { days: 7 }, "Last 7 days")}</option>
                  <option value="14d">{t("farmer.factors.price.last_days_option", { days: 14 }, "Last 14 days")}</option>
                  <option value="21d">{t("farmer.factors.price.last_days_option", { days: 21 }, "Last 21 days")}</option>
                  <option value="28d">{t("farmer.factors.price.last_days_option", { days: 28 }, "Last 28 days")}</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-[11px] sm:text-[12px] font-medium text-black whitespace-nowrap">
                  {t("farmer.factors.price.filter_forecast_horizon", {}, "Forecast Horizon")}
                </span>
                <select
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                  className="h-8 w-full sm:w-auto pl-2.5 pr-7 text-[12px] font-medium text-black bg-[var(--hw-neutral-50)] hover:bg-white border border-[var(--hw-neutral-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-700)] cursor-pointer transition-colors"
                >
                  <option value="7d">{t("farmer.factors.price.next_days_option", { days: 7 }, "Next 7 days")}</option>
                  <option value="14d">{t("farmer.factors.price.next_days_option", { days: 14 }, "Next 14 days")}</option>
                  <option value="21d">{t("farmer.factors.price.next_days_option", { days: 21 }, "Next 21 days")}</option>
                  <option value="28d">{t("farmer.factors.price.next_days_option", { days: 28 }, "Next 28 days")}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="w-full">
            {isDataLoading ? (
              <div className="h-[220px] sm:h-[280px] w-full flex items-center justify-center bg-[var(--hw-neutral-50)] rounded-xl animate-pulse">
                <Skeleton className="h-44 w-full max-w-[90%] rounded-xl" />
              </div>
            ) : unifiedChartData.length > 0 ? (
              <ForecastPriceTrendChart
                commodity={seriesKey}
                variety={activeVariety}
                chartData={unifiedChartData}
                varieties={chartVarieties}
                colors={varietyColors}
                height={280}
                actualLabel={t("farmer.factors.price.actual_price_label", {}, "Actual price")}
                forecastLabel={t("farmer.factors.price.forecast_price_label", {}, "Forecast price")}
                forecastRangeLabel={t("farmer.factors.price.forecast_range_label", {}, "Forecast range")}
                forecastBoundaryLabel={t("farmer.factors.price.forecast_starts", {}, "Forecast starts")}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-[13px] text-black text-center space-y-1">
                <AlertCircle className="w-5 h-5 text-black mb-1" />
                <p className="font-medium text-black">
                  {t("farmer.empty.no_price_data", {}, "Price information is not available right now.")}
                </p>
              </div>
            )}
          </div>

          <PriceSummaryStrip
            isStageSpecific={isStageSpecific}
            isStage2={isStage2}
            hasStage2Forecast={hasStage2Forecast}
            effectiveCropStage={effectiveCropStage}
            priceOutlookModel={priceOutlookModel}
            isDataLoading={isDataLoading}
            changeDisplay={changeDisplay}
            changeColor={changeColor}
            histChangeDisplay={histChangeDisplay}
            histChangeColor={histChangeColor}
            t={t}
          />
        </div>

        {/* Combined Advisory Outlook & Reference Details Card */}
        {isDataLoading ? (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded-full" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
            <Skeleton className="h-4 w-5/6 rounded" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3.5 sm:p-4 space-y-2.5">
            {priceOutlookModel && composedExplanation && (
              <div className="space-y-1.5">
                <div className={`flex items-center gap-1.5 ${statusCfg.color}`}>
                  <StatusIcon className="w-4 h-4 shrink-0" />
                  <span className="text-[13px] sm:text-[14px] font-bold">
                    {t(statusCfg.labelKey, {}, statusCfg.fallback)}
                  </span>
                </div>
                <p className="text-[13px] sm:text-[14px] text-black leading-relaxed">
                  {composedExplanation}
                </p>
              </div>
            )}

            <div className={`space-y-1.5 ${priceOutlookModel && composedExplanation ? "pt-2.5 border-t border-[var(--hw-neutral-100)]" : ""}`}>
              <p className="text-[11.5px] sm:text-[12px] font-medium text-black leading-snug">
                {priceOutlookModel?.status === "insufficient_data" ? (
                  t("farmer.factors.price.insufficient_reference_notice", {}, "Price reference unavailable: Required price data could not be determined for this crop stage.")
                ) : effectiveCropStage === "before_planting" ? (
                  t(
                    "farmer.factors.price.historical_seasonal_notice",
                    {
                      price: priceOutlookModel?.referencePrice != null ? priceOutlookModel.referencePrice.toFixed(2) : "—",
                      baseline: priceOutlookModel?.comparisonBaseline != null ? priceOutlookModel.comparisonBaseline.toFixed(2) : "—",
                    },
                    `Historical seasonal price reference: ₱${priceOutlookModel?.referencePrice != null ? priceOutlookModel.referencePrice.toFixed(2) : "—"}/kg (multi-year macro baseline: ₱${priceOutlookModel?.comparisonBaseline != null ? priceOutlookModel.comparisonBaseline.toFixed(2) : "—"}/kg).`
                  )
                ) : effectiveCropStage === "during_planting" ? (
                  hasStage2Forecast
                    ? t(
                        "farmer.factors.price.stage2_dual_notice",
                        {
                          price: priceOutlookModel?.referencePrice != null ? priceOutlookModel.referencePrice.toFixed(2) : "—",
                          forecastOutlook: priceOutlookModel?.forecastPriceOutlook || priceOutlookModel?.classification || "Neutral",
                          historicalPrice: priceOutlookModel?.historicalSeasonalPrice != null ? priceOutlookModel.historicalSeasonalPrice.toFixed(2) : "—",
                          historicalOutlook: priceOutlookModel?.historicalPriceOutlook || "Neutral",
                        },
                        `Stage 2 dual assessment: Forecasted harvest price is ₱${priceOutlookModel?.referencePrice != null ? priceOutlookModel.referencePrice.toFixed(2) : "—"}/kg (${priceOutlookModel?.forecastPriceOutlook || priceOutlookModel?.classification || "Neutral"}), alongside historical seasonal average of ₱${priceOutlookModel?.historicalSeasonalPrice != null ? priceOutlookModel.historicalSeasonalPrice.toFixed(2) : "—"}/kg (${priceOutlookModel?.historicalPriceOutlook || "Neutral"}).`
                      )
                    : t(
                        "farmer.factors.price.stage2_historical_notice",
                        {
                          price: priceOutlookModel?.referencePrice != null ? priceOutlookModel.referencePrice.toFixed(2) : "—",
                          baseline: priceOutlookModel?.comparisonBaseline != null ? priceOutlookModel.comparisonBaseline.toFixed(2) : "—",
                        },
                        `Stage 2 historical seasonal price reference: ₱${priceOutlookModel?.referencePrice != null ? priceOutlookModel.referencePrice.toFixed(2) : "—"}/kg (multi-year macro baseline: ₱${priceOutlookModel?.comparisonBaseline != null ? priceOutlookModel.comparisonBaseline.toFixed(2) : "—"}/kg). Forecast information is unavailable beyond the 28-day horizon.`
                      )
                ) : effectiveCropStage === "harvest" ? (
                  t(
                    "farmer.factors.price.observed_price_notice",
                    {
                      price: priceOutlookModel?.referencePrice != null ? priceOutlookModel.referencePrice.toFixed(2) : "—",
                      baseline: priceOutlookModel?.comparisonBaseline != null ? priceOutlookModel.comparisonBaseline.toFixed(2) : "—",
                    },
                    `Current observed market price: ₱${priceOutlookModel?.referencePrice != null ? priceOutlookModel.referencePrice.toFixed(2) : "—"}/kg (7-day spot baseline: ₱${priceOutlookModel?.comparisonBaseline != null ? priceOutlookModel.comparisonBaseline.toFixed(2) : "—"}/kg).`
                  )
                ) : priceOutlookModel?.lowerForecast != null && priceOutlookModel?.upperForecast != null ? (
                  t(
                    "farmer.factors.price.forecast_reference_range",
                    {
                      forecast_lo: priceOutlookModel.lowerForecast.toFixed(2),
                      forecast_hi: priceOutlookModel.upperForecast.toFixed(2),
                    },
                    `Estimated selling price is between ₱${priceOutlookModel.lowerForecast.toFixed(2)} and ₱${priceOutlookModel.upperForecast.toFixed(2)}/kg.`
                  )
                ) : priceOutlookModel?.referencePrice != null ? (
                  t(
                    "farmer.factors.price.price_reference_notice",
                    {
                      price: priceOutlookModel.referencePrice.toFixed(2),
                      baseline: priceOutlookModel?.comparisonBaseline != null ? priceOutlookModel.comparisonBaseline.toFixed(2) : "—",
                    },
                    `Price reference: ₱${priceOutlookModel.referencePrice.toFixed(2)}/kg (baseline: ₱${priceOutlookModel?.comparisonBaseline != null ? priceOutlookModel.comparisonBaseline.toFixed(2) : "—"}/kg).`
                  )
                ) : (
                  t("farmer.factors.price.forecast_unavailable_period", {}, "Forecast unavailable for this period.")
                )}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Historical Average Price Section — Informational context with planting window highlight */}
      <HistoricalAveragePriceSection
        commodityId={resolvedCommodityId}
        commodityName={displayCropName}
        variety={activeVariety}
        market={market}
        priceType={priceType}
        priceTypeKey={pPriceTypeKey}
        plantingDate={plantingDate}
        expectedHarvestDate={expectedHarvestDate || priceOutlookModel?.expectedHarvestDate}
        plantingWindowStart={priceOutlookModel?.plantingWindowStart || plantingWindowStart}
        plantingWindowEnd={priceOutlookModel?.plantingWindowEnd || plantingWindowEnd}
        plantingWindowLabel={priceOutlookModel?.plantingWindowLabel || plantingWindowLabel}
        cropStage={effectiveCropStage}
        plantingSeason={plantingSeason}
      />
    </div>
  );
}


export {
  PriceDetailView
};

export default PriceDetailView;
