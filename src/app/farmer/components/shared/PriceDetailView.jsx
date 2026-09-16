import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, ChevronDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { CommodityIllustration } from "../../../global/components/shared/CommodityIllustrations";
import { ForecastPriceTrendChart } from "../../../global/components/shared/ForecastPriceTrendChart";
import {
  HW_ID_TO_NAME,
  HW_GREEN_SHADES
} from "../../../global/components/shared/trendChartData";
import {
  toPriceTypeKey,
  catalogPairsFromPriceList,
  catalogPairsForCommodity,
  findCommodityId,
  buildHistoricalChartData,
  buildForecastChartData,
  buildUnifiedPriceTrendData,
  recentAveragePrice,
  forecastChangePercent,
  formatChartDate,
  getAvailableVarietiesForCommodity,
  pickDefaultVariety
} from "../../../global/utils/priceChartTransforms";
import { getVariants } from "../../../global/data/commodities";
import { useLanguage } from "../../../global/contexts/LanguageContext";
import { composePriceOutlook, renderComposedMessage } from "../../utils/advisoryMessageComposer";
import * as pricesApi from "../../../../services/api/pricesApi";
import { Skeleton } from "./FarmerSkeletons";
import { HistoricalAveragePriceSection } from "../../../global/components/shared/HistoricalAveragePriceSection";

const MARKETS = ["Bankerohan Public Market", "DFTC"];

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
  valueColor,
  isLoading
}) {
  if (isLoading) {
    return (
      <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-2">
        <Skeleton className="h-2.5 w-16 rounded" />
        <Skeleton className="h-5 w-24 rounded" />
        <Skeleton className="h-2.5 w-20 rounded" />
      </div>
    );
  }
  return (
    <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3">
      <p className="text-[10px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wide mb-1">{label}</p>
      <div className={`text-[18px] font-bold leading-tight ${valueColor ?? "text-[var(--hw-neutral-900)]"}`}>{value}</div>
      {sub && <p className="text-[11px] text-[var(--hw-neutral-600)] mt-1">{sub}</p>}
    </div>
  );
}

function PriceDetailView({
  commodityId,
  commodityName,
  baseCurrentPrice,
  showHeading = false
}) {
  const { t, langCode } = useLanguage();
  const [market, setMarket] = useState("Bankerohan Public Market");
  const [priceType, setPriceType] = useState("Retail");
  const [historicalRange, setHistoricalRange] = useState("7d");
  const [horizon, setHorizon] = useState("7d");
  const [variety, setVariety] = useState(null);

  const days = HDAYS[horizon] || 7;
  const pPriceTypeKey = toPriceTypeKey(market, priceType);

  // 1. Fetch top-10 catalog list to resolve commodity IDs & catalog varieties
  const { data: catalogData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ["prices-catalog"],
    queryFn: () => pricesApi.getPriceList({ is_top10: true, page_size: 100 }),
    staleTime: 5 * 60 * 1000,
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

  // 2. Fetch authoritative price detail using the exact same API pipeline as DFTC
  const {
    data: priceDetailData,
    isLoading: isPriceDetailLoading,
    isFetching: isPriceDetailFetching,
    isError: isPriceDetailError,
  } = useQuery({
    queryKey: ["farmer-price-detail", resolvedCommodityId, pPriceTypeKey, days],
    queryFn: () =>
      pricesApi.getPriceDetail(resolvedCommodityId, {
        price_type: pPriceTypeKey,
        horizon: days,
        records_limit: 100,
      }),
    enabled: Boolean(resolvedCommodityId),
    staleTime: 60 * 1000,
  });

  // Strict loading state that catches filter transitions to prevent stale/default data leaks
  const isDataLoading =
    isCatalogLoading ||
    (Boolean(resolvedCommodityId) && (isPriceDetailLoading || isPriceDetailFetching));

  const displayCropName = selectedVariety ? `${commodityName} (${selectedVariety})` : commodityName;
  const seriesKey = commodityName || "Price";

  // 3. Single authoritative Price Outlook model (shares data between summary, chart, banner, and range)
  const priceOutlookModel = useMemo(() => {
    if (isDataLoading || !priceDetailData) return null;
    const recentRecords = priceDetailData.recent_records || [];
    const forecast = priceDetailData.forecast || null;

    const recentAvg = recentAveragePrice(recentRecords, days);
    const midpoint = forecast?.forecast_midpoint != null ? Number(forecast.forecast_midpoint) : null;
    const lower = forecast?.lower_forecast != null ? Number(forecast.lower_forecast) : null;
    const upper = forecast?.upper_forecast != null ? Number(forecast.upper_forecast) : null;

    if (recentAvg == null || midpoint == null) {
      return null;
    }

    const absoluteChange = midpoint - recentAvg;
    const percentChange = forecastChangePercent(midpoint, recentAvg);

    // Canonical Price Outlook threshold: > 5% favorable, < -5% unfavorable, -5%..5% neutral
    const classification =
      percentChange > 5 ? "favorable" : percentChange < -5 ? "unfavorable" : "neutral";

    const composed = composePriceOutlook(
      {
        price_outlook: classification,
        forecast_midpoint: midpoint,
        recent_average_price: recentAvg,
        lower_forecast_price: lower,
        upper_forecast_price: upper,
      },
      displayCropName,
      days
    );

    return {
      recentAverage: recentAvg,
      forecastMidpoint: midpoint,
      lowerForecast: lower,
      upperForecast: upper,
      absoluteChange,
      percentChange,
      classification,
      composed,
    };
  }, [priceDetailData, isDataLoading, days, displayCropName]);

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
  const composedExplanation = priceOutlookModel
    ? renderComposedMessage(priceOutlookModel.composed, langCode)
    : "";

  const marketLabel = market;
  const priceTypeLabel = priceType === "Wholesale" ? t("farmer.factors.price.wholesale", {}, "Wholesale") : t("farmer.factors.price.retail", {}, "Retail");

  const getPriceTypeOptionLabel = (pt) => (pt === "Wholesale" ? t("farmer.factors.price.wholesale", {}, "Wholesale") : t("farmer.factors.price.retail", {}, "Retail"));
  const getVarietyOptionLabel = (v) => (v === DEFAULT_VARIETY_SENTINEL ? t("farmer.factors.price.default_variety", {}, "No variety") : v);
  const getHorizonOptionLabel = (h) => {
    const d = HDAYS[h] || 7;
    return t("farmer.factors.price.horizon_days_option", { days: d }, `${d} days`);
  };


  // Expected price change formatted string & styling
  let changeDisplay = "—";
  let changeColor = "text-[var(--hw-neutral-900)]";
  if (priceOutlookModel) {
    const diff = priceOutlookModel.absoluteChange;
    const pct = priceOutlookModel.percentChange;
    if (Math.abs(diff) < 0.05 || Math.abs(pct) < 0.1) {
      changeDisplay = t("farmer.factors.price.about_the_same", {}, "About the same");
      changeColor = "text-[var(--hw-neutral-700)]";
    } else if (diff > 0) {
      changeDisplay = `↑ ₱${diff.toFixed(2)}/kg · ${Math.abs(pct).toFixed(1)}% ${t("farmer.factors.price.higher_word", {}, "higher")}`;
      changeColor = "text-emerald-700";
    } else {
      changeDisplay = `↓ ₱${Math.abs(diff).toFixed(2)}/kg · ${Math.abs(pct).toFixed(1)}% ${t("farmer.factors.price.lower_word", {}, "lower")}`;
      changeColor = "text-red-600";
    }
  }

  // Top classification banner config — resolved from live priceOutlookModel
  const bannerCfg = priceOutlookModel
    ? PRICE_CLASSIFICATION_BANNER[priceOutlookModel.classification]
    : null;
  const BannerIcon = bannerCfg?.Icon;

  return (
    <div className="space-y-4">
      {/* Optional heading */}
      {showHeading && (
        <div className="flex items-center gap-3">
          {commodityId && <CommodityIllustration commodityId={commodityId} commodityName={commodityName} className="w-12 h-12 flex-shrink-0" />}
          <div>
            <h1 className="text-[22px] font-bold text-[var(--hw-neutral-900)] leading-tight">
              {commodityName} — {t("farmer.factors.price.unified_chart_title", {}, "Price trend and forecast")}
            </h1>
            <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">
              {marketLabel} · {priceTypeLabel} · {t("farmer.common.updated", {}, "Updated")}
            </p>
          </div>
        </div>
      )}

      {/* ─── Classification Banner (Favorable / Neutral / Unfavorable) ─── */}
      {isDataLoading ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]">
          <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3.5 w-28 rounded" />
            <Skeleton className="h-3 w-56 rounded" />
          </div>
        </div>
      ) : bannerCfg && BannerIcon ? (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bannerCfg.bg} ${bannerCfg.border}`}>
          <BannerIcon className={`w-5 h-5 ${bannerCfg.color} flex-shrink-0`} />
          <div>
            <p className={`text-[15px] font-bold ${bannerCfg.color}`}>
              {t(bannerCfg.titleKey, {}, bannerCfg.fallbackTitle)}
            </p>
            <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">
              {t(bannerCfg.descKey, {}, bannerCfg.fallbackDesc)}
            </p>
          </div>
        </div>
      ) : null}

      {/* Filter row: Palengke | Variety | Price Type */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SelectFilter
          label={t("farmer.factors.price.filter_market", {}, "Market")}
          options={MARKETS}
          value={market}
          onChange={setMarket}
        />
        {varietySelectOptions.length > 0 && (
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
        )}
        <SelectFilter
          label={t("farmer.factors.price.filter_price_type", {}, "Price Type")}
          options={PTYPES}
          value={priceType}
          onChange={setPriceType}
          getOptionLabel={getPriceTypeOptionLabel}
        />
      </div>

      {/* Authoritative 4-Item Farmer Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard
          label={t("farmer.factors.price.recent_average_price_label", {}, "Recent Average Price")}
          value={
            priceOutlookModel?.recentAverage != null ? (
              <>
                ₱{priceOutlookModel.recentAverage.toFixed(2)}
                <span className="text-[12px] font-medium text-[var(--hw-neutral-600)]">
                  {" "}{t("farmer.common.per_kg", {}, "/ kg")}
                </span>
              </>
            ) : (
              "—"
            )
          }
          sub={t("farmer.factors.price.past_days_average_sub", { days }, `Past ${days}-day average`)}
          isLoading={isDataLoading}
        />
        <StatCard
          label={t("farmer.factors.price.estimated_price_label", {}, "Estimated Price")}
          value={
            priceOutlookModel?.forecastMidpoint != null ? (
              <>
                ₱{priceOutlookModel.forecastMidpoint.toFixed(2)}
                <span className="text-[12px] font-medium text-[var(--hw-neutral-600)]">
                  {" "}{t("farmer.common.per_kg", {}, "/ kg")}
                </span>
              </>
            ) : (
              "—"
            )
          }
          sub={t("farmer.factors.price.next_days_sub_simple", { days }, `Next ${days} days`)}
          isLoading={isDataLoading}
        />
        <StatCard
          label={t("farmer.factors.price.forecast_range_label", {}, "Forecast Range")}
          value={
            priceOutlookModel?.lowerForecast != null && priceOutlookModel?.upperForecast != null ? (
              <>
                ₱{priceOutlookModel.lowerForecast.toFixed(2)}–₱{priceOutlookModel.upperForecast.toFixed(2)}
                <span className="text-[12px] font-medium text-[var(--hw-neutral-600)]">
                  {" "}{t("farmer.common.per_kg", {}, "/ kg")}
                </span>
              </>
            ) : (
              "—"
            )
          }
          sub={t("farmer.factors.price.possible_price_range_sub", {}, "Possible price range")}
          isLoading={isDataLoading}
        />
        <StatCard
          label={t("farmer.factors.price.expected_price_change_label", {}, "Expected Price Change")}
          value={changeDisplay}
          sub={t("farmer.factors.price.compared_with_recent_avg_sub", { days }, `Compared with the recent ${days}-day average`)}
          valueColor={changeColor}
          isLoading={isDataLoading}
        />
      </div>

      {/* Unified Single Price Trend & Forecast Chart Card */}
      <section className="space-y-3">
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 md:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--hw-neutral-100)]">
            <div>
              <h2 className="text-[15px] font-bold text-[var(--hw-neutral-900)]">
                {t("farmer.factors.price.unified_chart_title", {}, "Price trend and forecast")}
              </h2>
              <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
                {displayCropName} · {marketLabel} · {priceTypeLabel} · {t("farmer.factors.price.chart_context_sub", { days }, `Recent prices and next ${days} days`)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-[var(--hw-neutral-600)]">
                  {t("farmer.factors.price.historical_range_label", {}, "Historical Range")}
                </span>
                <select
                  value={historicalRange}
                  onChange={(e) => setHistoricalRange(e.target.value)}
                  className="h-8 pl-2.5 pr-7 text-[12px] font-medium text-[var(--hw-neutral-800)] bg-[var(--hw-neutral-50)] hover:bg-white border border-[var(--hw-neutral-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-700)] cursor-pointer transition-colors"
                >
                  <option value="7d">{t("farmer.factors.price.last_days_option", { days: 7 }, "Last 7 days")}</option>
                  <option value="14d">{t("farmer.factors.price.last_days_option", { days: 14 }, "Last 14 days")}</option>
                  <option value="21d">{t("farmer.factors.price.last_days_option", { days: 21 }, "Last 21 days")}</option>
                  <option value="28d">{t("farmer.factors.price.last_days_option", { days: 28 }, "Last 28 days")}</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-[var(--hw-neutral-600)]">
                  {t("farmer.factors.price.forecast_horizon_label", {}, "Forecast Horizon")}
                </span>
                <select
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                  className="h-8 pl-2.5 pr-7 text-[12px] font-medium text-[var(--hw-neutral-800)] bg-[var(--hw-neutral-50)] hover:bg-white border border-[var(--hw-neutral-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-700)] cursor-pointer transition-colors"
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
              <div className="h-[380px] w-full flex items-center justify-center bg-[var(--hw-neutral-50)] rounded-xl animate-pulse">
                <Skeleton className="h-56 w-full max-w-[90%] rounded-xl" />
              </div>
            ) : unifiedChartData.length > 0 ? (
              <ForecastPriceTrendChart
                commodity={seriesKey}
                variety={activeVariety}
                chartData={unifiedChartData}
                varieties={chartVarieties}
                colors={varietyColors}
                height={380}
                actualLabel={t("farmer.factors.price.actual_price_label", {}, "Actual price")}
                forecastLabel={t("farmer.factors.price.forecast_price_label", {}, "Forecast price")}
                forecastRangeLabel={t("farmer.factors.price.forecast_range_label", {}, "Forecast range")}
                forecastBoundaryLabel={t("farmer.factors.price.forecast_starts", {}, "Forecast starts")}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-[13px] text-[var(--hw-neutral-500)] text-center space-y-1">
                <AlertCircle className="w-5 h-5 text-[var(--hw-neutral-400)] mb-1" />
                <p className="font-medium text-[var(--hw-neutral-700)]">
                  {t("farmer.empty.no_price_data", {}, "Price information is not available right now.")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Advisory Outlook Banner — Authoritatively tied to the exact Price Outlook result */}
        {isDataLoading ? (
          <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded-full" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
            <Skeleton className="h-4 w-5/6 rounded" />
          </div>
        ) : priceOutlookModel && composedExplanation ? (
          <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-4 space-y-2">
            <div className={`flex items-center gap-1.5 ${statusCfg.color}`}>
              <StatusIcon className="w-4 h-4 shrink-0" />
              <span className="text-[13px] font-bold">
                {t(statusCfg.labelKey, {}, statusCfg.fallback)}
              </span>
            </div>
            <p className="text-[13px] text-[var(--hw-neutral-800)] leading-relaxed">
              {composedExplanation}
            </p>
          </div>
        ) : null}

        {/* Reference Range & Disclaimers — Tied to the exact loaded query */}
        {isDataLoading ? (
          <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-3 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-3 space-y-1.5">
            <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">
              {priceOutlookModel?.lowerForecast != null && priceOutlookModel?.upperForecast != null
                ? t(
                    "farmer.factors.price.forecast_reference_range",
                    {
                      forecast_lo: priceOutlookModel.lowerForecast.toFixed(2),
                      forecast_hi: priceOutlookModel.upperForecast.toFixed(2),
                    },
                    `Estimated selling price is between ₱${priceOutlookModel.lowerForecast.toFixed(2)} and ₱${priceOutlookModel.upperForecast.toFixed(2)}/kg.`
                  )
                : t("farmer.factors.price.forecast_unavailable_period", {}, "Forecast unavailable for this period.")}
            </p>
            <p className="text-[11px] text-[var(--hw-neutral-500)] italic">
              {priceType === "Wholesale"
                ? t("farmer.factors.price.wholesale_notice", {}, "Wholesale prices are typically 15–20% lower than retail. ")
                : ""}
              {t("farmer.factors.price.forecast_disclaimer", {}, "Forecast is based on recent trends and is not guaranteed.")}
            </p>
          </div>
        )}
      </section>

      {/* Historical Average Price Section — Informational context only */}
      <HistoricalAveragePriceSection
        commodityId={resolvedCommodityId}
        commodityName={displayCropName}
        variety={activeVariety}
        market={market}
        priceType={priceType}
        priceTypeKey={pPriceTypeKey}
      />
    </div>
  );
}


export {
  PriceDetailView
};
