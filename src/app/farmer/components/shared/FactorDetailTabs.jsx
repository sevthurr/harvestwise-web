import { useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sun,
  CloudRain,
  Cloud,
  CloudSun,
  CloudLightning,
  Package,
  Leaf,
  PhilippinePeso,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { PriceDetailView } from "./PriceDetailView";
import { ArrivalVolumeTrendChart } from "../../../global/components/shared/ArrivalVolumeTrendChart";
import { ProductionSourcePieChart } from "../../../global/components/shared/ProductionSourcePieChart";
import { ArrivalSourcePieChart } from "../../../global/components/shared/ArrivalSourcePieChart";
import { CostBreakdownPieChart } from "../../../global/components/shared/CostBreakdownPieChart";
import {
  HW_ID_TO_NAME,
  getArrivalSeries,
  buildArrivalChartData,
  ARRIVAL_ALL_MONTHS
} from "../../../global/components/shared/trendChartData";
import {
  PRICE_TREND_CODES,
  WEATHER_SUITABILITY_CODES,
  normalizePriceTrendCode,
  normalizeWeatherSuitability
} from "../../utils/farmerCodes";
import { useLanguage } from "../../../global/contexts/LanguageContext";

function buildPricePoints(actualData, currentPrice, direction, forecastLow, forecastHigh, days = 7) {
  const forecastMid = (forecastLow + forecastHigh) / 2;
  const trendCode = normalizePriceTrendCode(direction);
  const trend = trendCode === PRICE_TREND_CODES.RISING ? (forecastMid - currentPrice) / days : trendCode === PRICE_TREND_CODES.FALLING ? (forecastMid - currentPrice) / days : 0;
  const actualPoints = actualData.map((d) => ({ label: d.label, actual: d.price }));
  const lastActual = actualPoints[actualPoints.length - 1];
  if (lastActual?.label === "Today") {
    lastActual.forecast = currentPrice;
    lastActual.forecastLow = currentPrice;
    lastActual.forecastHigh = currentPrice;
  } else {
    actualPoints.push({ label: "Today", actual: currentPrice, forecast: currentPrice, forecastLow: currentPrice, forecastHigh: currentPrice });
  }
  const forecastPoints = Array.from({ length: days }, (_, i) => ({
    label: `+${i + 1}d`,
    forecast: Math.round(currentPrice + trend * (i + 1)),
    forecastLow: Math.round(currentPrice + (forecastLow - currentPrice) * ((i + 1) / days)),
    forecastHigh: Math.round(currentPrice + (forecastHigh - currentPrice) * ((i + 1) / days))
  }));
  return [...actualPoints, ...forecastPoints];
}

const PRICE_BANNER_CFG = {
  [PRICE_TREND_CODES.RISING]: {
    Icon: TrendingUp,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    titleKey: "farmer.factors.price.favorable_banner_title",
    descKey: "farmer.factors.price.favorable_banner_desc",
    fallbackTitle: "Favorable Price",
    fallbackDesc: "Prices are trending upward — a good signal for upcoming sales."
  },
  [PRICE_TREND_CODES.STABLE]: {
    Icon: Minus,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    titleKey: "farmer.factors.price.watch_banner_title",
    descKey: "farmer.factors.price.watch_banner_desc",
    fallbackTitle: "Watch",
    fallbackDesc: "Prices are stable — monitor for changes before deciding to sell."
  },
  [PRICE_TREND_CODES.FALLING]: {
    Icon: TrendingDown,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    titleKey: "farmer.factors.price.unfavorable_banner_title",
    descKey: "farmer.factors.price.unfavorable_banner_desc",
    fallbackTitle: "Unfavorable Price",
    fallbackDesc: "Prices are trending downward — consider timing your sale carefully."
  }
};

function normalizeArrivalPressure(val) {
  if (!val) return null;
  const s = String(val).toLowerCase().trim().replace(/[-_]/g, " ");
  if (s.includes("lower middle")) return "lower_middle";
  if (s.includes("upper middle")) return "upper_middle";
  if (s.includes("low") || s.includes("ubos") || s.includes("mababa") || s.includes("lower")) return "low";
  if (s.includes("high") || s.includes("taas") || s.includes("mataas") || s.includes("higher")) return "high";
  if (s.includes("moderate") || s.includes("katamtaman") || s.includes("same")) return "upper_middle";
  return null;
}

const ARRIVAL_PRESSURE_CFG = {
  low: {
    Icon: TrendingDown,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    titleKey: "farmer.factors.arrival.level_low_banner",
    descKey: "farmer.factors.arrival.meaning_low",
    fallbackTitle: "Low Arrival Pressure",
    fallbackDesc: "Supply is decreasing — lower market volume can support higher prices."
  },
  lower_middle: {
    Icon: Minus,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    titleKey: "farmer.factors.arrival.level_lower_middle_banner",
    descKey: "farmer.factors.arrival.meaning_low",
    fallbackTitle: "Moderately Low Arrival Pressure",
    fallbackDesc: "Supply is decreasing — lower market volume can support higher prices."
  },
  upper_middle: {
    Icon: Minus,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    titleKey: "farmer.factors.arrival.level_upper_middle_banner",
    descKey: "farmer.factors.arrival.meaning_moderate",
    fallbackTitle: "Moderately High Arrival Pressure",
    fallbackDesc: "Arrival volume is stable — balanced supply and price conditions."
  },
  high: {
    Icon: TrendingUp,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    titleKey: "farmer.factors.arrival.level_high_banner",
    descKey: "farmer.factors.arrival.meaning_high",
    fallbackTitle: "High Arrival Pressure",
    fallbackDesc: "Supply is increasing — higher volume may push prices down."
  }
};

function normalizeProductionLevel(val) {
  if (!val) return null;
  const s = String(val).toLowerCase().trim().replace(/[-_]/g, " ");
  if (s.includes("lower middle")) return "lower_middle";
  if (s.includes("upper middle")) return "upper_middle";
  if (s.includes("low") || s.includes("ubos") || s.includes("mababa")) return "low";
  if (s.includes("high") || s.includes("taas") || s.includes("mataas")) return "high";
  if (s.includes("moderate") || s.includes("katamtaman") || s.includes("medium")) return "upper_middle";
  return null;
}

const PRODUCTION_BANNER_CFG = {
  low: {
    Icon: TrendingDown,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    titleKey: "farmer.factors.production.level_low_banner",
    descKey: "farmer.factors.production.meaning_low",
    fallbackTitle: "Low Production Season",
    fallbackDesc: "Seasonal supply pressure from production may be lower during this quarter."
  },
  lower_middle: {
    Icon: Minus,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    titleKey: "farmer.factors.production.level_lower_middle_banner",
    descKey: "farmer.factors.production.meaning_low",
    fallbackTitle: "Moderately Low Production Season",
    fallbackDesc: "Seasonal supply pressure from production may be lower during this quarter."
  },
  upper_middle: {
    Icon: Minus,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    titleKey: "farmer.factors.production.level_upper_middle_banner",
    descKey: "farmer.factors.production.meaning_normal",
    fallbackTitle: "Moderately High Production Season",
    fallbackDesc: "No strong seasonal production pressure is indicated for this quarter."
  },
  high: {
    Icon: TrendingUp,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    titleKey: "farmer.factors.production.level_high_banner",
    descKey: "farmer.factors.production.meaning_high",
    fallbackTitle: "High Production Season",
    fallbackDesc: "More is usually produced during this quarter, which may increase supply near harvest."
  }
};

function normalizeWeatherRisk(val) {
  if (!val) return null;
  const s = String(val).toLowerCase().trim().replace(/[-_]/g, " ");
  if (s.includes("combined") || s.includes("kombinadong") || s.includes("pinagsamang")) return "combined_severe";
  if (s.includes("severe") || s.includes("taas ang risgo") || s.includes("mataas ang panganib")) return WEATHER_SUITABILITY_CODES.SEVERE;
  if (s.includes("caution") || s.includes("bantayan")) return WEATHER_SUITABILITY_CODES.CAUTION;
  if (s.includes("suitable") || s.includes("maayo") || s.includes("angkop")) return WEATHER_SUITABILITY_CODES.SUITABLE;
  return normalizeWeatherSuitability(val);
}

const RISK_CFG_WEATHER = {
  [WEATHER_SUITABILITY_CODES.SUITABLE]: {
    Icon: CheckCircle2,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    titleKey: "farmer.factors.weather.suitability_suitable",
    fallback: "Suitable"
  },
  [WEATHER_SUITABILITY_CODES.CAUTION]: {
    Icon: AlertTriangle,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-400",
    titleKey: "farmer.factors.weather.suitability_caution",
    fallback: "Caution"
  },
  [WEATHER_SUITABILITY_CODES.SEVERE]: {
    Icon: AlertOctagon,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    titleKey: "farmer.factors.weather.suitability_severe",
    fallback: "Severe"
  },
  combined_severe: {
    Icon: AlertOctagon,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    titleKey: "farmer.factors.weather.suitability_combined_severe",
    fallback: "Severe — Combined Risk"
  }
};

function getProfitBanner(profitPerKg) {
  if (profitPerKg > 15) {
    return {
      Icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      titleKey: "farmer.factors.profitability.favorable_label",
      descKey: "farmer.factors.profitability.favorable_desc",
      fallbackTitle: "Favorable",
      fallbackDesc: "Current prices offer a good margin above your break-even cost."
    };
  }
  if (profitPerKg >= 0) {
    return {
      Icon: AlertTriangle,
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      titleKey: "farmer.factors.profitability.marginal_label",
      descKey: "farmer.factors.profitability.marginal_desc",
      fallbackTitle: "Close to Break-Even",
      fallbackDesc: "Current prices are close to your break-even — low profit margin."
    };
  }
  return {
    Icon: AlertOctagon,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    titleKey: "farmer.factors.profitability.unfavorable_label",
    descKey: "farmer.factors.profitability.unfavorable_desc",
    fallbackTitle: "Unfavorable",
    fallbackDesc: "Prices are below your cost to recover. Selling now would result in a loss."
  };
}

function WeatherIconEl({ icon, cls = "w-5 h-5" }) {
  if (icon === "sun") return <Sun className={`${cls} text-amber-400`} />;
  if (icon === "cloud-sun") return <CloudSun className={`${cls} text-amber-300`} />;
  if (icon === "cloud") return <Cloud className={`${cls} text-slate-400`} />;
  if (icon === "rain") return <CloudRain className={`${cls} text-blue-500`} />;
  if (icon === "storm") return <CloudLightning className={`${cls} text-blue-700`} />;
  if (icon === "heat") return <Sun className={`${cls} text-orange-500`} />;
  return <Cloud className={`${cls} text-slate-400`} />;
}

const PriceTab = ({
  data,
  commodityId,
  commodityName
}) => {
  const { t } = useLanguage();
  const hasData = data && data.currentPrice > 0;
  const match = data?.forecastRange?.match(/₱(\d+)–₱(\d+)/);
  const baseFLo = match ? parseInt(match[1], 10) : (hasData ? Math.round(data.currentPrice * 0.95) : 0);
  const baseFHi = match ? parseInt(match[2], 10) : (hasData ? Math.round(data.currentPrice * 1.07) : 0);
  const actualPoints = (data?.points || []).filter((p) => p.actual !== void 0).map((p) => ({ label: p.label, price: p.actual }));
  const trendCode = hasData ? normalizePriceTrendCode(data.direction) : null;
  const banner = trendCode ? PRICE_BANNER_CFG[trendCode] : null;
  const BannerIcon = banner?.Icon;

  return (
    <div className="space-y-4">
      {hasData && banner ? (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${banner.bg} ${banner.border}`}>
          <BannerIcon className={`w-5 h-5 ${banner.color} flex-shrink-0`} />
          <div>
            <p className={`text-[15px] font-bold ${banner.color}`}>
              {t(banner.titleKey, {}, banner.fallbackTitle)}
            </p>
            <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">
              {t(banner.descKey, {}, banner.fallbackDesc)}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] text-[var(--hw-neutral-900)]">
          <p className="text-[13px] font-medium">
            {t("farmer.empty.no_price_data", {}, "Price information is not available right now.")}
          </p>
        </div>
      )}

      <PriceDetailView
        commodityId={commodityId}
        commodityName={commodityName ?? "this crop"}
        baseCurrentPrice={hasData ? data.currentPrice : 0}
        basePreviousPrice={hasData ? data.previousPrice : 0}
        direction={hasData ? data.direction : "none"}
        baseForecastLow={baseFLo}
        baseForecastHigh={baseFHi}
        baseActualPoints={actualPoints}
        showHeading={false}
      />
    </div>
  );
};

const ArrivalTab = ({ data, commodityId }) => {
  const { t } = useLanguage();
  const dftcName = commodityId ? HW_ID_TO_NAME[commodityId] : void 0;
  const dftcSeries = useMemo(() => (dftcName ? getArrivalSeries(dftcName) : null), [dftcName]);
  const dftcVarietyKeys = useMemo(
    () => (dftcSeries ? dftcSeries.map((s) => s.variety || (dftcName ?? "Volume")) : []),
    [dftcSeries, dftcName]
  );
  const dftcChartData = useMemo(
    () => (dftcSeries && dftcName ? buildArrivalChartData(dftcName, dftcSeries, ARRIVAL_ALL_MONTHS, "Combined Total") : null),
    [dftcSeries, dftcName]
  );

  const normPressure = normalizeArrivalPressure(data?.arrivalPressure || data?.trend);
  const banner = normPressure ? ARRIVAL_PRESSURE_CFG[normPressure] : null;
  const BannerIcon = banner?.Icon;
  const hasData = Boolean(normPressure || (dftcChartData && dftcChartData.length > 0));

  if (!hasData) {
    return (
      <div className="flex items-center justify-center p-8 bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-[13px] text-[var(--hw-neutral-500)] font-medium">
        {t("farmer.empty.no_arrival_data", {}, "DFTC arrival information is not available right now.")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {banner && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${banner.bg} ${banner.border}`}>
          <BannerIcon className={`w-5 h-5 ${banner.color} flex-shrink-0`} />
          <div>
            <p className={`text-[15px] font-bold ${banner.color}`}>
              {t(banner.titleKey, {}, banner.fallbackTitle)}
            </p>
            <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">
              {t(banner.descKey, {}, banner.fallbackDesc)}
            </p>
          </div>
        </div>
      )}

      {dftcChartData && dftcChartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
          <div className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mb-0.5">
            {dftcName} · {t("farmer.factors.arrival.arrival_volume_trend_title", {}, "Arrival Volume Trend")}
          </div>
          <div className="text-[12px] text-[var(--hw-neutral-800)] mb-4">
            {t("farmer.factors.arrival.chart_subtitle_combined", {}, "Combined Total by variety · Last 7 months · kg")}
          </div>
          <ArrivalVolumeTrendChart
            commodity={dftcName ?? ""}
            chartData={dftcChartData}
            varietyKeys={dftcVarietyKeys}
            sourceType="Combined Total"
            height={260}
          />
        </div>
      )}

      {data?.sources && data.sources.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-4 space-y-2">
          <div>
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">{t("farmer.factors.arrival.source_breakdown_title", {}, "Arrival Volume by Source")}</p>
            <p className="text-[11px] text-[var(--hw-neutral-600)]">{t("farmer.factors.arrival.source_breakdown_subtitle", {}, "DFTC registered farms vs other supplying sources.")}</p>
          </div>
          <ArrivalSourcePieChart data={data.sources} height={190} />
        </div>
      )}

      <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-1">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">{t("farmer.common.what_this_means", {}, "What this means")}</p>
        <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">
          {data?.summary || (banner ? t(banner.descKey, {}, banner.fallbackDesc) : t("farmer.empty.no_arrival_data", {}, "DFTC arrival information is not available right now."))}
        </p>
      </div>
    </div>
  );
};

const QUARTER_SHORT = ["Q1", "Q2", "Q3", "Q4"];

const ProductionTab = ({ data }) => {
  const { t } = useLanguage();
  const normLevel = normalizeProductionLevel(data?.productionLevel || data?.level);
  const banner = normLevel ? PRODUCTION_BANNER_CFG[normLevel] : null;
  const LevelIcon = banner?.Icon;

  const currentQuarterIdx = Math.floor((data?.currentMonthIdx ?? new Date().getMonth()) / 3);
  const hasRecords = Boolean(data?.records && data.records.length > 0);
  const hasMonthly = Boolean(data?.monthlyData && data.monthlyData.some((m) => m.level > 0));
  const hasChartData = hasRecords || hasMonthly;

  const quarterlyData = useMemo(() => {
    if (hasMonthly && data.monthlyData) {
      return [0, 1, 2, 3].map((qIdx) => {
        const qMonths = data.monthlyData.slice(qIdx * 3, qIdx * 3 + 3);
        const avgLevel = Math.round(qMonths.reduce((acc, m) => acc + (m.level || 0), 0) / (qMonths.length || 1));
        return { quarter: QUARTER_SHORT[qIdx], level: avgLevel };
      });
    }
    return [];
  }, [hasMonthly, data]);

  const hasData = Boolean(normLevel || hasChartData);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center p-8 bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-[13px] text-[var(--hw-neutral-500)] font-medium">
        {t("farmer.empty.no_production_data", {}, "Production data not available")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {banner && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${banner.bg} ${banner.border}`}>
          <LevelIcon className={`w-5 h-5 ${banner.color} flex-shrink-0`} />
          <div>
            <p className={`text-[15px] font-bold ${banner.color}`}>
              {t(banner.titleKey, {}, banner.fallbackTitle)}
            </p>
            <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">
              {t(banner.descKey, {}, banner.fallbackDesc)}
            </p>
          </div>
        </div>
      )}

      <div>
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)] mb-2">
          {t("farmer.factors.production.typical_quarterly_title", {}, "Typical Quarterly Production Volume (PSA Data · Q1–Q4)")}
        </p>
        {quarterlyData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={175}>
              <BarChart data={quarterlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#1f2937" }} tickLine={false} axisLine={false} />
                <YAxis hide domain={[0, 10]} />
                <Tooltip
                  formatter={(value) => [value <= 4 ? t("farmer.factors.production.level_low_banner", {}, "Low") : value <= 7 ? t("farmer.factors.production.level_lower_middle_banner", {}, "Moderate") : t("farmer.factors.production.level_high_banner", {}, "High"), t("farmer.factors.production.factor_title", {}, "Production")]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Bar dataKey="level" radius={[4, 4, 0, 0]}>
                  {quarterlyData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={index === currentQuarterIdx ? (entry.level <= 4 ? "#16a34a" : entry.level <= 7 ? "#f59e0b" : "#ef4444") : "#bfdbfe"}
                      opacity={index === currentQuarterIdx ? 1 : 0.55}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-1 justify-center text-[11px] text-[var(--hw-neutral-900)]">
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /><span>{t("farmer.factors.arrival.level_low", {}, "Low")}</span></div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /><span>{t("farmer.factors.arrival.level_lower_middle", {}, "Moderate")}</span></div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /><span>{t("farmer.factors.arrival.level_high", {}, "High")}</span></div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[175px] bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-[13px] text-[var(--hw-neutral-500)] font-medium">
            {t("farmer.empty.no_production_data", {}, "Production data not available")}
          </div>
        )}
      </div>

      {data?.sources && data.sources.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-4 space-y-2">
          <div>
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">{t("farmer.factors.production.major_sources_title", {}, "Major Production Sources")}</p>
            <p className="text-[11px] text-[var(--hw-neutral-600)]">{t("farmer.factors.production.major_sources_subtitle", {}, "Production volume distribution across Davao City, Davao Del Sur, and Bukidnon.")}</p>
          </div>
          <ProductionSourcePieChart data={data.sources} height={190} />
        </div>
      )}

      <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-1">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">{t("farmer.common.what_this_means", {}, "What this means")}</p>
        <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">
          {data?.summary || (banner ? t(banner.descKey, {}, banner.fallbackDesc) : t("farmer.empty.no_production_data", {}, "Production data not available"))}
        </p>
      </div>
    </div>
  );
};

const WeatherTab = ({ data, commodityName }) => {
  const { t } = useLanguage();
  const carouselRef = useRef(null);
  const scrollBy = (dir) => carouselRef.current?.scrollBy({ left: dir * 90, behavior: "smooth" });

  const riskCode = normalizeWeatherRisk(data?.risk);
  const banner = riskCode ? RISK_CFG_WEATHER[riskCode] : null;
  const RiskIcon = banner?.Icon;

  const actions = data?.actions ?? [];
  const why = data?.why ?? "";
  const summary = data?.summary;
  const forecastList = (data?.forecast_14d && data.forecast_14d.length > 0)
    ? data.forecast_14d
    : (data?.forecast && data.forecast.length > 0)
    ? data.forecast
    : [];

  const hasData = Boolean(riskCode || forecastList.length > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center p-8 bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-[13px] text-[var(--hw-neutral-500)] font-medium">
        {t("farmer.empty.no_weather_data", {}, "No weather data available.")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {banner && (
        <div className={`rounded-xl border px-4 py-3 ${banner.bg} ${banner.border}`}>
          <div className={`flex items-start gap-2 ${banner.color}`}>
            <RiskIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className={`text-[14px] font-bold ${banner.color}`}>
                {t(banner.titleKey, {}, banner.fallback)}
              </p>
              {data?.riskHeadline && (
                <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">
                  {data.riskHeadline}
                </p>
              )}
            </div>
          </div>
          {data?.plantingWindow && (
            <p className="text-[12px] text-[var(--hw-neutral-900)] mt-2 font-medium">
              {t("farmer.factors.weather.planting_window_prefix", {}, "Planting window: ")}{data.plantingWindow}
            </p>
          )}
        </div>
      )}

      {/* 14-day forecast section */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">
            {t("farmer.factors.weather.forecast_14day_title", {}, "14-Day Forecast")}
          </p>
          {forecastList.length > 0 && (
            <div className="flex gap-1">
              <button
                onClick={() => scrollBy(-1)}
                className="p-1 rounded-full border border-[var(--hw-neutral-200)] bg-white hover:bg-[var(--hw-neutral-50)] shadow-[var(--shadow-xs)] transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-[var(--hw-neutral-900)]" />
              </button>
              <button
                onClick={() => scrollBy(1)}
                className="p-1 rounded-full border border-[var(--hw-neutral-200)] bg-white hover:bg-[var(--hw-neutral-50)] shadow-[var(--shadow-xs)] transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-3.5 h-3.5 text-[var(--hw-neutral-900)]" />
              </button>
            </div>
          )}
        </div>

        {forecastList.length > 0 ? (
          <>
            <div
              ref={carouselRef}
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {forecastList.map((day, i) => {
                const dayRisk = normalizeWeatherRisk(day.risk);
                const dayRc = dayRisk ? RISK_CFG_WEATHER[dayRisk] : null;
                const label = i === 0 ? t("farmer.factors.weather.today_day_label", {}, "Today") : day.dayLabel;

                return (
                  <div
                    key={i}
                    className="flex-shrink-0 flex flex-col items-center gap-1 bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-2.5 py-2.5 min-w-[68px]"
                  >
                    <p className="text-[11px] font-semibold text-[var(--hw-neutral-900)]">{label}</p>
                    <p className="text-[10px] text-[var(--hw-neutral-900)]">{day.date}</p>
                    <WeatherIconEl icon={day.icon} cls="w-6 h-6 mt-0.5" />
                    <div className="text-center mt-0.5">
                      <p className="text-[13px] font-bold text-[var(--hw-neutral-900)]">{day.tempMax != null ? `${day.tempMax}°` : ""}</p>
                      <p className="text-[11px] text-[var(--hw-neutral-900)]">{day.tempMin != null ? `${day.tempMin}°` : ""}</p>
                    </div>
                    {day.rainPct != null && (
                      <p className="text-[11px] font-medium text-[var(--hw-neutral-900)]">{day.rainPct}%</p>
                    )}
                    <div className="text-[var(--hw-neutral-900)] text-[10px]">
                      {dayRc ? (
                        <div className={`flex items-center gap-1 ${dayRc.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dayRc.dot}`} />
                          <span className="text-[10px] font-semibold">{t(dayRc.titleKey, {}, dayRc.fallback)}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--hw-neutral-900)]">
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /><span>{t("farmer.factors.weather.suitability_suitable", {}, "Suitable")}</span></div>
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /><span>{t("farmer.factors.weather.suitability_caution", {}, "Caution")}</span></div>
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /><span>{t("farmer.factors.weather.suitability_severe", {}, "Severe")}</span></div>
              <span>{t("farmer.factors.weather.rain_chance_note", {}, "· % = rain chance")}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center p-8 bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-[13px] text-[var(--hw-neutral-500)] font-medium">
            {t("farmer.factors.weather.empty_forecast", {}, "No weather details available right now.")}
          </div>
        )}
      </section>

      {/* General weather insight */}
      <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-2">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">
          {t("farmer.factors.weather.insight_crop_title", { crop_name: (commodityName || "YOUR FARM").toUpperCase() })}
        </p>
        <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">
          {riskCode === WEATHER_SUITABILITY_CODES.SEVERE || riskCode === "combined_severe"
            ? t("farmer.factors.weather.insight_severe", { crop_name: commodityName || "this crop" })
            : riskCode === WEATHER_SUITABILITY_CODES.CAUTION
            ? t("farmer.factors.weather.insight_caution", { crop_name: commodityName || "this crop" })
            : riskCode === WEATHER_SUITABILITY_CODES.SUITABLE
            ? t("farmer.factors.weather.insight_suitable", { crop_name: commodityName || "this crop" })
            : t("farmer.empty.no_weather_data", {}, "No weather data available.")}
        </p>
      </div>

      {/* Recommended actions */}
      <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-2">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">
          {t("farmer.factors.weather.recommended_actions_title", {}, "Recommended Actions")}
        </p>
        {actions.length > 0 ? (
          <div className="space-y-1.5">
            {actions.map((action, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--hw-neutral-900)] flex-shrink-0 mt-1.5" />
                <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">{action}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[var(--hw-neutral-900)]">
            {t("farmer.factors.weather.no_weather_guidance", {}, "No weather guidance available.")}
          </p>
        )}
        {why && <p className="text-[12px] text-[var(--hw-neutral-900)] italic pt-0.5">"{why}"</p>}
      </div>

      {/* What this means */}
      <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-1">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">{t("farmer.common.what_this_means", {}, "What this means")}</p>
        <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">
          {summary || (banner ? t(banner.titleKey, {}, banner.fallback) : t("farmer.empty.no_weather_data", {}, "No weather data available."))}
        </p>
        <p className="text-[11px] text-[var(--hw-neutral-900)] italic mt-1">
          {t("farmer.factors.weather.source_open_meteo_notice", {}, "Source: Open-Meteo · Forecast is a guide only.")}
        </p>
      </div>
    </div>
  );
};

const ProfitabilityTab = ({ data }) => {
  const { t } = useLanguage();
  const hasData = Boolean(data && data.costPerKg > 0 && data.sellingPricePerKg > 0 && data.harvestQty > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center p-8 bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-[13px] text-[var(--hw-neutral-500)] font-medium text-center">
        {t("farmer.factors.profitability.unavailable_inputs", {}, "Production cost and expected yield inputs are required to calculate profitability.")}
      </div>
    );
  }

  const maxVal = Math.max(data.costPerKg, data.sellingPricePerKg) * 1.15;
  const costPct = (data.costPerKg / maxVal) * 100;
  const pricePct = (data.sellingPricePerKg / maxVal) * 100;
  const isProfit = data.profitPerKg >= 0;
  const totalRevenue = data.sellingPricePerKg * data.harvestQty;
  const totalProfit = data.profitPerKg * data.harvestQty;
  const banner = getProfitBanner(data.profitPerKg);
  const BannerIcon = banner.Icon;

  return (
    <div className="space-y-4">
      {/* Classification banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${banner.bg} ${banner.border}`}>
        <BannerIcon className={`w-5 h-5 ${banner.color} flex-shrink-0`} />
        <div>
          <p className={`text-[15px] font-bold ${banner.color}`}>
            {t(banner.titleKey, {}, banner.fallbackTitle)}
          </p>
          <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">
            {t(banner.descKey, {}, banner.fallbackDesc)}
          </p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide mb-1">
            {t("farmer.factors.profitability.cost_to_recover_short_label", {}, "Break-even")}
          </p>
          <p className="text-[18px] font-bold text-[var(--hw-neutral-900)]">₱{data.costPerKg}</p>
          <p className="text-[10px] text-[var(--hw-neutral-900)]">{t("farmer.factors.profitability.per_kg", {}, "per kg")}</p>
        </div>
        <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide mb-1">
            {t("farmer.factors.profitability.selling_price_label", {}, "Selling Price")}
          </p>
          <p className="text-[18px] font-bold text-[var(--hw-neutral-900)]">₱{data.sellingPricePerKg}</p>
          <p className="text-[10px] text-[var(--hw-neutral-900)]">{t("farmer.factors.profitability.per_kg", {}, "per kg")}</p>
        </div>
        <div className={`rounded-xl p-3 text-center border ${isProfit ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-[10px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide mb-1">
            {isProfit ? t("farmer.factors.profitability.profit_label", {}, "Profit") : t("farmer.factors.profitability.loss_label", {}, "Loss")}
          </p>
          <p className={`text-[18px] font-bold ${isProfit ? "text-emerald-700" : "text-red-600"}`}>
            {isProfit ? "+" : ""}₱{data.profitPerKg}
          </p>
          <p className="text-[10px] text-[var(--hw-neutral-900)]">{t("farmer.factors.profitability.per_kg", {}, "per kg")}</p>
        </div>
      </div>

      {/* Bar comparison */}
      <div className="space-y-2.5">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">
          {t("farmer.factors.profitability.cost_vs_selling_title", {}, "Cost vs. Selling Price (per kg)")}
        </p>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[12px] text-[var(--hw-neutral-900)]">{t("farmer.factors.profitability.cost_to_recover_label", {}, "Break-even cost (to recover)")}</span>
            <span className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">₱{data.costPerKg}/kg</span>
          </div>
          <div className="h-5 bg-[var(--hw-neutral-100)] rounded-full overflow-hidden">
            <div className="h-full bg-red-400 rounded-full" style={{ width: `${costPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[12px] text-[var(--hw-neutral-900)]">{t("farmer.factors.profitability.estimated_selling_price_label", {}, "Estimated selling price")}</span>
            <span className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">₱{data.sellingPricePerKg}/kg</span>
          </div>
          <div className="h-5 bg-[var(--hw-neutral-100)] rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pricePct}%` }} />
          </div>
        </div>
      </div>

      {/* Total projections */}
      <div className="border border-[var(--hw-neutral-200)] rounded-xl divide-y divide-[var(--hw-neutral-100)] overflow-hidden">
        {[
          { label: t("farmer.factors.profitability.expected_harvest_volume_label", {}, "Expected harvest volume"), value: `${data.harvestQty} kg` },
          { label: t("farmer.factors.profitability.total_estimated_cost_label", {}, "Total estimated cost"), value: `₱${(data.totalCost || 0).toLocaleString("en-PH")}` },
          { label: t("farmer.factors.profitability.total_estimated_revenue_label", {}, "Total estimated revenue"), value: `₱${totalRevenue.toLocaleString("en-PH")}` },
          { label: isProfit ? t("farmer.factors.profitability.total_estimated_profit_label", {}, "Total estimated profit") : t("farmer.factors.profitability.total_estimated_loss_label", {}, "Estimated loss"), value: `${isProfit ? "+" : ""}₱${totalProfit.toLocaleString("en-PH")}`, accent: true }
        ].map((r) => (
          <div key={r.label} className={`flex items-center justify-between px-4 py-2.5 text-[13px] ${r.accent ? "bg-[var(--hw-green-50)]" : ""}`}>
            <span className={r.accent ? "font-semibold text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-900)]"}>{r.label}</span>
            <span className={r.accent ? "font-bold text-[var(--hw-green-800)]" : "font-medium text-[var(--hw-neutral-900)]"}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Detailed Cost Breakdown Pie Chart */}
      {data.expenses && data.expenses.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-4 space-y-2">
          <div>
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">{t("farmer.factors.profitability.detailed_cost_breakdown_title", {}, "Detailed Cost Breakdown")}</p>
            <p className="text-[11px] text-[var(--hw-neutral-600)]">{t("farmer.factors.profitability.detailed_cost_breakdown_subtitle", {}, "Itemized expenses entered for this planting cycle.")}</p>
          </div>
          <CostBreakdownPieChart expenses={data.expenses} height={200} />
        </div>
      )}

      {/* Summary */}
      <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-1">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">{t("farmer.common.what_this_means", {}, "What this means")}</p>
        <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">{data.summary || t("farmer.factors.profitability.estimate_disclaimer", {}, "Estimate only. Actual income may vary.")}</p>
        <p className="text-[11px] text-[var(--hw-neutral-900)] italic mt-1">{t("farmer.factors.profitability.estimate_disclaimer", {}, "Estimate only. Actual income may vary.")}</p>
      </div>
    </div>
  );
};

const TAB_CONFIG = [
  { id: "price", labelKey: "farmer.factors.price.factor_title", fallback: "Price", Icon: TrendingUp },
  { id: "arrival", labelKey: "farmer.factors.arrival.factor_title", fallback: "Arrival", Icon: Package },
  { id: "production", labelKey: "farmer.factors.production.factor_title", fallback: "Production", Icon: Leaf },
  { id: "weather", labelKey: "farmer.factors.weather.factor_title", fallback: "Weather", Icon: Cloud },
  { id: "profitability", labelKey: "farmer.factors.profitability.factor_title", fallback: "Profitability", Icon: PhilippinePeso }
];

const FactorDetailTabs = ({
  price,
  arrival,
  production,
  weather,
  profitability,
  defaultTab = "price",
  commodityId,
  commodityName
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const visibleTabs = TAB_CONFIG.filter(
    (tab) => tab.id !== "profitability" || profitability != null
  );
  const safeTab = visibleTabs.some((tab) => tab.id === activeTab) ? activeTab : visibleTabs[0].id;

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-[var(--hw-neutral-200)]" style={{ scrollbarWidth: "none" }}>
        {visibleTabs.map((tab) => {
          const Icon = tab.Icon;
          const isActive = safeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium border-b-2 flex-shrink-0 transition-colors ${
                isActive
                  ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)] bg-[var(--hw-green-50)]"
                  : "border-transparent text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t(tab.labelKey, {}, tab.fallback)}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {safeTab === "price" && <PriceTab data={price} commodityId={commodityId} commodityName={commodityName ?? weather?.cropName} />}
        {safeTab === "arrival" && <ArrivalTab data={arrival} commodityId={commodityId} />}
        {safeTab === "production" && <ProductionTab data={production} />}
        {safeTab === "weather" && <WeatherTab data={weather} commodityName={commodityName ?? weather?.cropName} />}
        {safeTab === "profitability" && profitability && <ProfitabilityTab data={profitability} />}
      </div>
    </div>
  );
};

export {
  FactorDetailTabs,
  buildPricePoints
};
