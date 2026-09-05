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
  LEVEL_CODES,
  normalizePriceTrendCode,
  normalizeWeatherSuitability,
  normalizeLevelCode
} from "../../utils/farmerCodes";
import { useLanguage } from "../../../global/contexts/LanguageContext";
const ARRIVAL_HISTORY = {
  kamatis: [18, 15, 20, 14, 16, 12],
  talong: [10, 12, 9, 11, 10, 9],
  repolyo: [22, 25, 20, 24, 21, 23],
  atsal: [8, 10, 7, 9, 8, 7],
  carrots: [14, 12, 15, 13, 14, 11],
  pipino: [9, 11, 8, 10, 9, 8],
  ampalaya: [18, 20, 16, 19, 17, 12],
  kalabasa: [16, 14, 18, 15, 17, 16],
  lettuce: [6, 8, 5, 7, 6, 7],
  pechay: [12, 14, 11, 13, 12, 11]
};
const WEEK_LABELS = ["5 wks ago", "4 wks ago", "3 wks ago", "2 wks ago", "Last week", "This week"];
function getArrivalData(commodityId, summary) {
  const hist = ARRIVAL_HISTORY[commodityId] ?? [10, 12, 9, 11, 10, 9];
  const thisWeek = hist[5];
  const lastWeek = hist[4];
  const trend = thisWeek < lastWeek ? "lower" : thisWeek > lastWeek ? "higher" : "same";
  const history = hist.map((tons, i) => ({ label: WEEK_LABELS[i], tons }));
  const diff = Math.abs(thisWeek - lastWeek);
  const trendText = trend === "lower" ? `DFTC arrivals dropped from ${lastWeek} to ${thisWeek} tons this week \u2014 a decrease of ${diff} tons. Lower supply usually supports higher prices at the market. This is a favorable signal for sellers.` : trend === "higher" ? `DFTC arrivals rose from ${lastWeek} to ${thisWeek} tons this week \u2014 an increase of ${diff} tons. More supply may put downward pressure on prices. Monitor prices closely before selling.` : `DFTC arrivals are steady at ${thisWeek} tons \u2014 similar to last week. Supply is balanced. Prices are unlikely to shift significantly due to supply alone.`;
  return { thisWeek, lastWeek, history, trend, summary: summary ?? trendText };
}
const PRODUCTION_LEVELS = {
  kamatis: [5, 4, 6, 7, 8, 9, 7, 5, 4, 5, 6, 6],
  talong: [6, 5, 7, 8, 9, 8, 7, 6, 5, 6, 6, 6],
  repolyo: [8, 9, 8, 6, 4, 3, 3, 4, 5, 7, 8, 8],
  atsal: [5, 5, 6, 7, 8, 7, 5, 4, 4, 5, 5, 5],
  carrots: [7, 8, 9, 7, 5, 4, 3, 3, 5, 7, 8, 7],
  pipino: [5, 6, 7, 8, 9, 8, 7, 6, 5, 5, 5, 5],
  ampalaya: [6, 6, 7, 8, 9, 8, 7, 6, 5, 5, 6, 6],
  kalabasa: [7, 7, 8, 8, 7, 6, 5, 6, 7, 8, 8, 7],
  lettuce: [8, 8, 7, 6, 4, 3, 3, 4, 6, 7, 8, 8],
  pechay: [7, 7, 8, 8, 7, 6, 5, 5, 6, 7, 8, 8]
};
const MONTH_LABELS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function getProductionData(commodityId, currentMonthIdx = 7) {
  const levels = PRODUCTION_LEVELS[commodityId] ?? Array(12).fill(5);
  const monthlyData = levels.map((level2, i) => ({ month: MONTH_LABELS_SHORT[i], level: level2 }));
  const cur = levels[currentMonthIdx];
  const level = cur <= 4 ? "low" : cur <= 7 ? "moderate" : "high";
  const max = Math.max(...levels);
  const peakMonths = levels.reduce((acc, v, i) => v === max ? [...acc, MONTH_LABELS_SHORT[i]] : acc, []);
  const levelText = level === "low" ? `Production is typically low this season (${MONTH_LABELS_SHORT[currentMonthIdx]}). Less supply at harvest usually means less competition, which can help keep prices higher. Peak production is in ${peakMonths.join("/")} \u2014 selling before those months may give better returns.` : level === "moderate" ? `Production is at a moderate level this season (${MONTH_LABELS_SHORT[currentMonthIdx]}). Some competition from other farmers is expected near harvest. Monitor arrivals at DFTC as your harvest date approaches.` : `Production is typically high this season (${MONTH_LABELS_SHORT[currentMonthIdx]}). High supply near harvest may push prices down. Consider harvesting earlier or finding a buyer with a confirmed price.`;
  return { level, currentMonthIdx, monthlyData, summary: levelText };
}
const BASE_FORECAST_14D_AUG_2026 = [
  { dayLabel: "Today", date: "Aug 10", icon: "rain", tempMin: 25, tempMax: 28, rainPct: 68, risk: "moderate" },
  { dayLabel: "Mon", date: "Aug 11", icon: "rain", tempMin: 24, tempMax: 28, rainPct: 72, risk: "moderate" },
  { dayLabel: "Tue", date: "Aug 12", icon: "cloud", tempMin: 25, tempMax: 29, rainPct: 45, risk: "low" },
  { dayLabel: "Wed", date: "Aug 13", icon: "cloud-sun", tempMin: 26, tempMax: 30, rainPct: 30, risk: "low" },
  { dayLabel: "Thu", date: "Aug 14", icon: "cloud", tempMin: 26, tempMax: 30, rainPct: 40, risk: "low" },
  { dayLabel: "Fri", date: "Aug 15", icon: "rain", tempMin: 25, tempMax: 28, rainPct: 65, risk: "moderate" },
  { dayLabel: "Sat", date: "Aug 16", icon: "storm", tempMin: 24, tempMax: 27, rainPct: 85, risk: "high" },
  { dayLabel: "Sun", date: "Aug 17", icon: "rain", tempMin: 24, tempMax: 27, rainPct: 75, risk: "moderate" },
  { dayLabel: "Mon", date: "Aug 18", icon: "cloud", tempMin: 25, tempMax: 29, rainPct: 40, risk: "low" },
  { dayLabel: "Tue", date: "Aug 19", icon: "cloud-sun", tempMin: 26, tempMax: 30, rainPct: 25, risk: "low" },
  { dayLabel: "Wed", date: "Aug 20", icon: "sun", tempMin: 27, tempMax: 31, rainPct: 15, risk: "low" },
  { dayLabel: "Thu", date: "Aug 21", icon: "cloud", tempMin: 26, tempMax: 30, rainPct: 35, risk: "low" },
  { dayLabel: "Fri", date: "Aug 22", icon: "rain", tempMin: 25, tempMax: 28, rainPct: 60, risk: "moderate" },
  { dayLabel: "Sat", date: "Aug 23", icon: "rain", tempMin: 24, tempMax: 27, rainPct: 70, risk: "moderate" }
];
const BASE_FORECAST_AUG_2026 = BASE_FORECAST_14D_AUG_2026.slice(0, 7);
const WEATHER_DATA = {
  low: {
    riskLabel: "Suitable",
    riskHeadline: (c) => `Conditions are generally favorable for ${c} this week.`,
    actions: (c) => [
      `Proceed with soil preparation and planting of ${c}.`,
      "Water moderately \u2014 dry days ahead reduce disease risk.",
      "Check soil drainage before planting."
    ],
    why: (c) => `${c} grows well in dry to partly cloudy conditions. This week's forecast is within a manageable range.`,
    plantingWindow: "Good window to plant",
    summary: (c) => `This week's weather is generally suitable for ${c}. Expect mostly dry days with low rain risk. This is a good planting window \u2014 proceed with normal field preparation and maintain adequate soil moisture.`
  },
  moderate: {
    riskLabel: "Caution",
    riskHeadline: (c) => `Light to moderate rain expected. Monitor drainage for ${c}.`,
    actions: (c) => [
      `Clear drainage channels around ${c} planting area.`,
      "Delay fertilizer application during heavy rain days.",
      "Monitor soil moisture \u2014 avoid waterlogging."
    ],
    why: (c) => `${c} can tolerate light rain but is sensitive to waterlogged soil. Monitor drainage closely.`,
    plantingWindow: "Manageable with precautions",
    summary: (c) => `Moderate rain is expected this week, which may affect planting conditions for ${c}. Ensure drainage is clear before planting. Dry windows on midweek days are suitable for field work. Avoid fertilizer application during rainy days.`
  },
  high: {
    riskLabel: "High Risk",
    riskHeadline: (c) => `Heavy rain or storm expected. Planting ${c} is not advised this week.`,
    actions: (c) => [
      `Delay planting ${c} until weather improves.`,
      "Clear all drainage channels and check for flooding risk.",
      "Protect existing crops from strong winds and waterlogging."
    ],
    why: (c) => `Heavy rain and storm conditions can damage ${c} seedlings and cause root rot. Wait for conditions to improve.`,
    plantingWindow: "Not ideal \u2014 delay if possible",
    summary: (c) => `Heavy rain or storm conditions are forecast this week, making it risky to plant ${c}. Prolonged rain can cause root rot and seedling loss. It is better to wait for drier conditions. Protect existing crops by clearing drainage and checking for flooding.`
  }
};
function getWeatherData(risk, cropName) {
  if (!risk || risk === "none" || !WEATHER_DATA[risk]) {
    return {
      risk: "none",
      riskLabel: null,
      riskHeadline: null,
      forecast: [],
      forecast_14d: [],
      actions: [],
      why: "",
      plantingWindow: null,
      summary: "Weather data not available",
      cropName: cropName ?? "-"
    };
  }
  const cfg = WEATHER_DATA[risk];
  return {
    risk,
    riskLabel: cfg.riskLabel,
    riskHeadline: cfg.riskHeadline(cropName),
    forecast: [],
    forecast_14d: [],
    actions: cfg.actions(cropName),
    why: cfg.why(cropName),
    plantingWindow: cfg.plantingWindow,
    summary: cfg.summary(cropName),
    cropName
  };
}
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
const DIR_CFG = {
  [PRICE_TREND_CODES.RISING]: { Icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", label: "Rising" },
  [PRICE_TREND_CODES.STABLE]: { Icon: Minus, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", label: "Stable" },
  [PRICE_TREND_CODES.FALLING]: { Icon: TrendingDown, color: "text-red-500", bg: "bg-red-50", border: "border-red-200", label: "Falling" }
};
const RISK_CFG_WEATHER = {
  [WEATHER_SUITABILITY_CODES.SUITABLE]: { Icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", label: "Suitable" },
  [WEATHER_SUITABILITY_CODES.CAUTION]: { Icon: AlertTriangle, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-400", label: "Caution" },
  [WEATHER_SUITABILITY_CODES.SEVERE]: { Icon: AlertOctagon, color: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500", label: "Severe" }
};
const LEVEL_CFG = {
  [LEVEL_CODES.LOW]: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", label: "Low" },
  [LEVEL_CODES.MODERATE]: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", label: "Moderate" },
  [LEVEL_CODES.HIGH]: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", label: "High" }
};
const PRICE_BANNER_CFG = {
  [PRICE_TREND_CODES.RISING]: {
    Icon: TrendingUp,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Favorable Price",
    desc: "Prices are trending upward \u2014 a good signal for upcoming sales."
  },
  [PRICE_TREND_CODES.STABLE]: {
    Icon: Minus,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    label: "Watch",
    desc: "Prices are stable \u2014 monitor for changes before deciding to sell."
  },
  [PRICE_TREND_CODES.FALLING]: {
    Icon: TrendingDown,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "Unfavorable Price",
    desc: "Prices are trending downward \u2014 consider timing your sale carefully."
  }
};
const ARRIVAL_BANNER_CFG = {
  lower: {
    Icon: TrendingDown,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Low Arrival Pressure",
    desc: "Supply is decreasing \u2014 lower market volume can support higher prices."
  },
  same: {
    Icon: Minus,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    label: "Moderate Arrival Pressure",
    desc: "Arrival volume is stable \u2014 balanced supply and price conditions."
  },
  higher: {
    Icon: TrendingUp,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "High Arrival Pressure",
    desc: "Supply is increasing \u2014 higher volume may push prices down."
  }
};
function getProfitBanner(profitPerKg) {
  if (profitPerKg > 15) return {
    Icon: CheckCircle2,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Profitable",
    desc: "Current prices offer a good margin above your break-even cost."
  };
  if (profitPerKg >= 0) return {
    Icon: AlertTriangle,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    label: "Marginal",
    desc: "Current prices are close to your break-even \u2014 low profit margin."
  };
  return {
    Icon: AlertOctagon,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "Not Favorable",
    desc: "Prices are below your cost to recover. Selling now would result in a loss."
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
const PriceTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return <div className="bg-white border border-[var(--hw-neutral-200)] rounded-xl px-3 py-2 shadow-md text-[12px]">
      <p className="font-semibold text-[var(--hw-neutral-900)] mb-1">{label}</p>
      {payload.map(
    (p, i) => p.value != null && <p key={i} className="text-[var(--hw-neutral-900)]">
            {p.name === "actual" ? "Actual" : p.name === "forecast" ? "Forecast" : p.name}: ₱{p.value}/kg
          </p>
  )}
    </div>;
};
const ArrivalTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return <div className="bg-white border border-[var(--hw-neutral-200)] rounded-xl px-3 py-2 shadow-md text-[12px]">
      <p className="font-semibold text-[var(--hw-neutral-900)]">{label}</p>
      <p className="text-[var(--hw-neutral-900)]">{payload[0].value} tons</p>
    </div>;
};
const PriceTab = ({
  data,
  commodityId,
  commodityName
}) => {
  const hasData = data && data.currentPrice > 0;
  const match = data?.forecastRange?.match(/₱(\d+)–₱(\d+)/);
  const baseFLo = match ? parseInt(match[1]) : (hasData ? Math.round(data.currentPrice * 0.95) : 0);
  const baseFHi = match ? parseInt(match[2]) : (hasData ? Math.round(data.currentPrice * 1.07) : 0);
  const actualPoints = (data?.points || []).filter((p) => p.actual !== void 0).map((p) => ({ label: p.label, price: p.actual }));
  const trendCode = hasData ? normalizePriceTrendCode(data.direction) : null;
  const banner = trendCode ? PRICE_BANNER_CFG[trendCode] : null;
  const BannerIcon = banner?.Icon;

  return <div className="space-y-4">
      {/* Classification banner */}
      {hasData && banner ? (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${banner.bg} ${banner.border}`}>
          <BannerIcon className={`w-5 h-5 ${banner.color} flex-shrink-0`} />
          <div>
            <p className={`text-[15px] font-bold ${banner.color}`}>{banner.label}</p>
            <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">{banner.desc}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] text-[var(--hw-neutral-900)]">
          <p className="text-[13px] font-medium">No trend data available.</p>
        </div>
      )}

      {/* Detailed price view: filters → stats → charts → summaries */}
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
    </div>;
};
const ArrivalTab = ({ data, commodityId }) => {
  const { t } = useLanguage();
  const hasData = data && (data.thisWeek > 0 || data.lastWeek > 0);
  const change = hasData ? data.thisWeek - data.lastWeek : 0;
  const trendColor = hasData ? (data.trend === "lower" ? "text-emerald-600" : data.trend === "higher" ? "text-red-500" : "text-blue-600") : "text-[var(--hw-neutral-900)]";
  const trendLabel = hasData ? (data.trend === "lower" ? "Down" : data.trend === "higher" ? "Up" : "Same") : "-";
  const TrendIcon = data?.trend === "lower" ? TrendingDown : data?.trend === "higher" ? TrendingUp : Minus;
  const banner = hasData ? ARRIVAL_BANNER_CFG[data.trend] : null;
  const BannerIcon = banner?.Icon;
  const dftcName = commodityId ? HW_ID_TO_NAME[commodityId] : void 0;
  const dftcSeries = useMemo(() => dftcName ? getArrivalSeries(dftcName) : null, [dftcName]);
  const dftcVarietyKeys = useMemo(() => dftcSeries ? dftcSeries.map((s) => s.variety || (dftcName ?? "Volume")) : [], [dftcSeries, dftcName]);
  const dftcChartData = useMemo(
    () => dftcSeries && dftcName ? buildArrivalChartData(dftcName, dftcSeries, ARRIVAL_ALL_MONTHS, "Combined Total") : null,
    [dftcSeries, dftcName]
  );
  return <div className="space-y-4">
      {/* Classification banner */}
      {hasData && banner ? (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${banner.bg} ${banner.border}`}>
          <BannerIcon className={`w-5 h-5 ${banner.color} flex-shrink-0`} />
          <div>
            <p className={`text-[15px] font-bold ${banner.color}`}>{banner.label}</p>
            <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">{banner.desc}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] text-[var(--hw-neutral-900)]">
          <p className="text-[13px] font-medium">No comparison data available.</p>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide mb-1">Last Week</p>
          <p className="text-[20px] font-bold text-[var(--hw-neutral-900)]">{hasData ? `${data.lastWeek} tons` : "- tons"}</p>
        </div>
        <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide mb-1">This Week</p>
          <p className="text-[20px] font-bold text-[var(--hw-neutral-900)]">{hasData ? `${data.thisWeek} tons` : "- tons"}</p>
        </div>
        <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide mb-1">Change</p>
          <div className={`flex items-center justify-center gap-0.5 ${trendColor}`}>
            {hasData && <TrendIcon className="w-3.5 h-3.5" />}
            <p className="text-[18px] font-bold">{hasData ? Math.abs(change) : "-"}</p>
          </div>
          <p className={`text-[11px] font-medium ${trendColor}`}>{trendLabel}</p>
        </div>
      </div>

      {
    /* Arrival volume chart */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
        {dftcChartData && dftcChartData.length > 0 ? <>
            <div className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mb-0.5">
              {dftcName} · Arrival Volume Trend
            </div>
            <div className="text-[12px] text-[var(--hw-neutral-800)] mb-4">
              {t("farmer.factors.arrival.chart_subtitle_combined")}
            </div>
            <ArrivalVolumeTrendChart
    commodity={dftcName ?? ""}
    chartData={dftcChartData}
    varietyKeys={dftcVarietyKeys}
    sourceType="Combined Total"
    height={260}
  />
          </> : <>
            <div className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mb-0.5">
              Arrival Volume Trend
            </div>
            <div className="text-[12px] text-[var(--hw-neutral-800)] mb-4">
              Weekly arrivals · tons
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#1f2937" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#1f2937" }} tickLine={false} axisLine={false} width={30} />
                <Tooltip content={<ArrivalTooltip />} />
                <Bar dataKey="tons" radius={[6, 6, 0, 0]}>
                  {data.history.map((_, index) => <Cell
    key={index}
    fill={index === data.history.length - 1 ? data.trend === "lower" ? "#16a34a" : data.trend === "higher" ? "#ef4444" : "#3b82f6" : "#bfdbfe"}
  />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>}
      </div>

      {/* Arrival Volume Sources Breakdown */}
      <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-4 space-y-2">
        <div>
          <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">Arrival Volume by Source</p>
          <p className="text-[11px] text-[var(--hw-neutral-600)]">{t("farmer.factors.arrival.source_breakdown_subtitle")}</p>
        </div>
        <ArrivalSourcePieChart data={data?.sources} height={190} />
      </div>

      {/* What this means */}
      <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-1">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">What this means</p>
        <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">{data.summary}</p>
      </div>
    </div>;
};
const QUARTER_LABELS = ["Q1 (Jan–Mar)", "Q2 (Apr–Jun)", "Q3 (Jul–Sep)", "Q4 (Oct–Dec)"];
const QUARTER_SHORT = ["Q1", "Q2", "Q3", "Q4"];
const ProductionTab = ({ data }) => {
  const { t } = useLanguage();
  const hasData = data && data.level && data.level !== "none" && data.summary !== "Production data not available";
  const cfg = hasData ? LEVEL_CFG[data.level] : null;
  const LevelIcon = cfg ? (data.level === "low" ? TrendingDown : data.level === "high" ? TrendingUp : Minus) : null;
  const currentQuarterIdx = Math.floor((data?.currentMonthIdx ?? 7) / 3);
  const quarterlyData = useMemo(() => {
    if (!hasData || !data?.monthlyData) {
      return QUARTER_SHORT.map((q) => ({ quarter: q, level: 0 }));
    }
    return [0, 1, 2, 3].map((qIdx) => {
      const qMonths = data.monthlyData.slice(qIdx * 3, qIdx * 3 + 3);
      const avgLevel = Math.round(qMonths.reduce((acc, m) => acc + (m.level || 0), 0) / (qMonths.length || 1));
      return { quarter: QUARTER_SHORT[qIdx], level: avgLevel };
    });
  }, [hasData, data]);
  return <div className="space-y-4">
      {/* Level badge */}
      {hasData && cfg ? <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
          <LevelIcon className={`w-5 h-5 ${cfg.color} flex-shrink-0`} />
          <div>
            <p className={`text-[15px] font-bold ${cfg.color}`}>{cfg.label} Production Season</p>
            <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">
              {QUARTER_LABELS[currentQuarterIdx]} is a {data.level}-production period for this crop
            </p>
          </div>
        </div> : <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] text-[var(--hw-neutral-900)]">
          <p className="text-[13px] font-medium">Not available</p>
        </div>}

      {/* Quarterly bar chart */}
      <div>
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)] mb-2">
          Typical Quarterly Production Volume (PSA Data · Q1–Q4)
        </p>
        {hasData ? <>
            <ResponsiveContainer width="100%" height={175}>
              <BarChart data={quarterlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#1f2937" }} tickLine={false} axisLine={false} />
                <YAxis hide domain={[0, 10]} />
                <Tooltip
    formatter={(value) => [value <= 4 ? "Low" : value <= 7 ? "Moderate" : "High", "Production"]}
    contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }}
  />
                <Bar dataKey="level" radius={[4, 4, 0, 0]}>
                  {quarterlyData.map((entry, index) => <Cell
    key={index}
    fill={index === currentQuarterIdx ? entry.level <= 4 ? "#16a34a" : entry.level <= 7 ? "#f59e0b" : "#ef4444" : "#bfdbfe"}
    opacity={index === currentQuarterIdx ? 1 : 0.55}
  />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-1 justify-center text-[11px] text-[var(--hw-neutral-900)]">
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /><span>Low</span></div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /><span>Moderate</span></div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /><span>High</span></div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 inline-block" /><span>Other quarters</span></div>
            </div>
          </> : <div className="flex items-center justify-center h-[175px] bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-[13px] text-[var(--hw-neutral-500)] font-medium">
            {t("farmer.empty.no_production_data")}
          </div>}
      </div>

      {/* Production Sources Breakdown */}
      <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-4 space-y-2">
        <div>
          <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">Major Production Sources</p>
          <p className="text-[11px] text-[var(--hw-neutral-600)]">Production volume distribution across Davao City, Davao Del Sur, and Bukidnon.</p>
        </div>
        <ProductionSourcePieChart data={data?.sources} height={190} />
      </div>

      {/* Summary */}
      <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-1">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">What this means</p>
        <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">
          {hasData ? data.summary : t("farmer.empty.no_production_data")}
        </p>
      </div>
    </div>;
};
const WeatherTab = ({ data, commodityName }) => {
  const { t } = useLanguage();
  const riskCode = data && data.risk && data.risk !== "none" ? normalizeWeatherSuitability(data.risk) : null;
  const hasData = Boolean(riskCode);
  const rc = riskCode ? RISK_CFG_WEATHER[riskCode] : null;
  const RiskIcon = rc?.Icon;
  const carouselRef = useRef(null);
  const scrollBy = (dir) => carouselRef.current?.scrollBy({ left: dir * 90, behavior: "smooth" });
  const insightBullets = hasData ? riskCode === WEATHER_SUITABILITY_CODES.SEVERE ? [
    "Heavy rain forecast \u2014 delay planting if possible this week.",
    "Clear all drainage channels before peak rain days.",
    "Protect existing crops from strong winds and waterlogging."
  ] : riskCode === WEATHER_SUITABILITY_CODES.CAUTION ? [
    "Some rainy days expected \u2014 plan field work for drier windows.",
    "Clear drainage to prevent waterlogging in low-lying areas.",
    "Delay fertilizer application during heavy rain days."
  ] : [
    "Generally clear skies \u2014 a good window for planting.",
    "Water regularly as dry conditions may reduce soil moisture.",
    "Good time for soil preparation and transplanting."
  ] : [];
  const actions = data?.actions ?? [];
  const why = data?.why ?? "";
  const summary = data?.summary ?? "No weather guidance available.";
  const forecast14 = (hasData && data.forecast_14d && data.forecast_14d.length > 0)
    ? data.forecast_14d
    : (hasData && data.forecast && data.forecast.length > 0)
    ? data.forecast
    : Array.from({ length: 14 }, (_, i) => ({
        dayLabel: i === 0 ? "Today" : `+${i}d`,
        date: "-",
        icon: "cloud",
        tempMin: null,
        tempMax: null,
        rainPct: null,
        risk: "none"
      }));
  return <div className="space-y-4">
      {/* Risk header */}
      {hasData && rc ? <div className={`rounded-xl border px-4 py-3 ${rc.bg} ${rc.border}`}>
          <div className={`flex items-start gap-2 ${rc.color}`}>
            <RiskIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className={`text-[14px] font-bold ${rc.color}`}>{data.riskLabel}</p>
              <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">{data.riskHeadline}</p>
            </div>
          </div>
          {data.plantingWindow && <p className="text-[12px] text-[var(--hw-neutral-900)] mt-2 font-medium">Planting window: {data.plantingWindow}</p>}
        </div> : <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] text-[var(--hw-neutral-900)]">
          <p className="text-[13px] font-medium">No weather guidance available.</p>
        </div>}

      {/* 14-day forecast carousel */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">14-Day Forecast</p>
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
        </div>

        <div
          ref={carouselRef}
          className="flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {forecast14.map((day, i) => {
            const dayRc = day.risk !== "none" ? RISK_CFG_WEATHER[day.risk] : null;
            return <div
                key={i}
                className="flex-shrink-0 flex flex-col items-center gap-1 bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-2.5 py-2.5 min-w-[68px]"
              >
                <p className="text-[11px] font-semibold text-[var(--hw-neutral-900)]">{day.dayLabel}</p>
                <p className="text-[10px] text-[var(--hw-neutral-900)]">{day.date}</p>
                <WeatherIconEl icon={day.icon} cls="w-6 h-6 mt-0.5" />
                <div className="text-center mt-0.5">
                  <p className="text-[13px] font-bold text-[var(--hw-neutral-900)]">{day.tempMax != null ? `${day.tempMax}°` : "-°"}</p>
                  <p className="text-[11px] text-[var(--hw-neutral-900)]">{day.tempMin != null ? `${day.tempMin}°` : "-°"}</p>
                </div>
                <p className="text-[11px] font-medium text-[var(--hw-neutral-900)]">{day.rainPct != null ? `${day.rainPct}%` : "-%"}</p>
                <div className="text-[var(--hw-neutral-900)] text-[10px]">
                  {dayRc ? <div className={`flex items-center gap-1 ${dayRc.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dayRc.dot}`} />
                      <span className="text-[10px] font-semibold">{dayRc.label}</span>
                    </div> : "-"}
                </div>
              </div>;
          })}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--hw-neutral-900)]">
          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /><span>Suitable</span></div>
          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /><span>Caution</span></div>
          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /><span>Severe</span></div>
          <span>· % = rain chance</span>
        </div>
      </section>

      {/* General weather insight */}
      <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-2">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">
          Weather Insight · {commodityName ? commodityName.toUpperCase() : "YOUR FARM"}
        </p>
        <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">
          {hasData
            ? riskCode === WEATHER_SUITABILITY_CODES.SEVERE
              ? t("farmer.factors.weather.insight_severe", { crop_name: commodityName || "this crop" })
              : riskCode === WEATHER_SUITABILITY_CODES.CAUTION
              ? t("farmer.factors.weather.insight_caution", { crop_name: commodityName || "this crop" })
              : t("farmer.factors.weather.insight_suitable", { crop_name: commodityName || "this crop" })
            : t("farmer.empty.no_weather_data")}
        </p>
        {insightBullets.length > 0 && <div className="space-y-1.5">
            {insightBullets.map((b, i) => <div key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--hw-neutral-900)] flex-shrink-0 mt-1.5" />
                <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">{b}</p>
              </div>)}
          </div>}
      </div>

      {/* Recommended actions */}
      <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-2">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">Recommended Actions</p>
        {actions.length > 0 ? <div className="space-y-1.5">
            {actions.map((action, i) => <div key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--hw-neutral-900)] flex-shrink-0 mt-1.5" />
                <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">{action}</p>
              </div>)}
          </div> : <p className="text-[13px] text-[var(--hw-neutral-900)]">No weather guidance available.</p>}
        {why && <p className="text-[12px] text-[var(--hw-neutral-900)] italic pt-0.5">"{why}"</p>}
      </div>

      {/* What this means */}
      <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-1">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">What this means</p>
        <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">{summary}</p>
        <p className="text-[11px] text-[var(--hw-neutral-900)] italic mt-1">Source: Open-Meteo · Forecast is a guide only.</p>
      </div>
    </div>;
};
const ProfitabilityTab = ({ data }) => {
  const { t } = useLanguage();
  const maxVal = Math.max(data.costPerKg, data.sellingPricePerKg) * 1.15;
  const costPct = data.costPerKg / maxVal * 100;
  const pricePct = data.sellingPricePerKg / maxVal * 100;
  const isProfit = data.profitPerKg >= 0;
  const totalRevenue = data.harvestQty ? data.sellingPricePerKg * data.harvestQty : null;
  const totalProfit = data.harvestQty ? data.profitPerKg * data.harvestQty : null;
  const banner = getProfitBanner(data.profitPerKg);
  const BannerIcon = banner.Icon;
  return <div className="space-y-4">
      {
    /* Classification banner */
  }
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${banner.bg} ${banner.border}`}>
        <BannerIcon className={`w-5 h-5 ${banner.color} flex-shrink-0`} />
        <div>
          <p className={`text-[15px] font-bold ${banner.color}`}>{banner.label}</p>
          <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">{banner.desc}</p>
        </div>
      </div>

      {
    /* Key metrics */
  }
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide mb-1">Break-even</p>
          <p className="text-[18px] font-bold text-[var(--hw-neutral-900)]">₱{data.costPerKg}</p>
          <p className="text-[10px] text-[var(--hw-neutral-900)]">per kg</p>
        </div>
        <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide mb-1">Selling Price</p>
          <p className="text-[18px] font-bold text-[var(--hw-neutral-900)]">₱{data.sellingPricePerKg}</p>
          <p className="text-[10px] text-[var(--hw-neutral-900)]">per kg</p>
        </div>
        <div className={`rounded-xl p-3 text-center border ${isProfit ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-[10px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide mb-1">{isProfit ? "Profit" : "Loss"}</p>
          <p className={`text-[18px] font-bold ${isProfit ? "text-emerald-700" : "text-red-600"}`}>
            {isProfit ? "+" : ""}₱{data.profitPerKg}
          </p>
          <p className="text-[10px] text-[var(--hw-neutral-900)]">per kg</p>
        </div>
      </div>

      {
    /* Bar comparison */
  }
      <div className="space-y-2.5">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">Cost vs. Selling Price (per kg)</p>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[12px] text-[var(--hw-neutral-900)]">{t("farmer.factors.profitability.cost_to_recover_label")}</span>
            <span className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">₱{data.costPerKg}/kg</span>
          </div>
          <div className="h-5 bg-[var(--hw-neutral-100)] rounded-full overflow-hidden">
            <div className="h-full bg-red-400 rounded-full" style={{ width: `${costPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[12px] text-[var(--hw-neutral-900)]">Estimated selling price</span>
            <span className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">₱{data.sellingPricePerKg}/kg</span>
          </div>
          <div className="h-5 bg-[var(--hw-neutral-100)] rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pricePct}%` }} />
          </div>
        </div>
      </div>

      {/* Total projections */}
      {data.harvestQty != null && data.totalCost != null && totalRevenue != null && totalProfit != null && <div className="border border-[var(--hw-neutral-200)] rounded-xl divide-y divide-[var(--hw-neutral-100)] overflow-hidden">
          {[
    { label: "Harvest quantity", value: `${data.harvestQty} kg` },
    { label: "Total estimated cost", value: `₱${data.totalCost.toLocaleString("en-PH")}` },
    { label: "Total estimated revenue", value: `₱${totalRevenue.toLocaleString("en-PH")}` },
    { label: isProfit ? "Total estimated profit" : "Estimated loss", value: `${isProfit ? "+" : ""}₱${totalProfit.toLocaleString("en-PH")}`, accent: true }
  ].map((r) => <div key={r.label} className={`flex items-center justify-between px-4 py-2.5 text-[13px] ${"accent" in r && r.accent ? "bg-[var(--hw-green-50)]" : ""}`}>
              <span className={"accent" in r && r.accent ? "font-semibold text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-900)]"}>{r.label}</span>
              <span className={"accent" in r && r.accent ? "font-bold text-[var(--hw-green-800)]" : "font-medium text-[var(--hw-neutral-900)]"}>{r.value}</span>
            </div>)}
        </div>}

      {/* Detailed Cost Breakdown Pie Chart (only if detailed expenses are provided) */}
      {data.expenses && data.expenses.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-4 space-y-2">
          <div>
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">Detailed Cost Breakdown</p>
            <p className="text-[11px] text-[var(--hw-neutral-600)]">Itemized expenses entered for this planting cycle.</p>
          </div>
          <CostBreakdownPieChart expenses={data.expenses} height={200} />
        </div>
      )}

      {
    /* Summary */
  }
      <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-1">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">What this means</p>
        <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">{data.summary}</p>
        <p className="text-[11px] text-[var(--hw-neutral-900)] italic mt-1">Estimate only. Actual income may vary.</p>
      </div>
    </div>;
};
const TAB_CONFIG = [
  { id: "price", label: "Price", Icon: TrendingUp },
  { id: "arrival", label: "Arrival", Icon: Package },
  { id: "production", label: "Production", Icon: Leaf },
  { id: "weather", label: "Weather", Icon: Cloud },
  { id: "profitability", label: "Profitability", Icon: PhilippinePeso }
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
  const [activeTab, setActiveTab] = useState(defaultTab);
  const visibleTabs = TAB_CONFIG.filter(
    (t) => t.id !== "profitability" || profitability != null
  );
  const safeTab = visibleTabs.some((t) => t.id === activeTab) ? activeTab : visibleTabs[0].id;
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      {
    /* Tab bar */
  }
      <div className="flex overflow-x-auto border-b border-[var(--hw-neutral-200)]" style={{ scrollbarWidth: "none" }}>
        {visibleTabs.map((tab) => {
    const Icon = tab.Icon;
    const isActive = safeTab === tab.id;
    return <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium border-b-2 flex-shrink-0 transition-colors ${isActive ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)] bg-[var(--hw-green-50)]" : "border-transparent text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`}
    >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>;
  })}
      </div>

      {
    /* Tab content */
  }
      <div className="p-4">
        {safeTab === "price" && <PriceTab data={price} commodityId={commodityId} commodityName={commodityName ?? weather.cropName} />}
        {safeTab === "arrival" && <ArrivalTab data={arrival} commodityId={commodityId} />}
        {safeTab === "production" && <ProductionTab data={production} />}
        {safeTab === "weather" && <WeatherTab data={weather} commodityName={commodityName ?? weather?.cropName} />}
        {safeTab === "profitability" && profitability && <ProfitabilityTab data={profitability} />}
      </div>
    </div>;
};
export {
  FactorDetailTabs,
  buildPricePoints,
  getArrivalData,
  getProductionData,
  getWeatherData
};
