import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { PriceDetailView } from "./PriceDetailView";
import { ArrivalVolumeTrendChart } from "../../../global/components/shared/ArrivalVolumeTrendChart";
import { ProductionSourcePieChart } from "../../../global/components/shared/ProductionSourcePieChart";
import { ArrivalSourcePieChart } from "../../../global/components/shared/ArrivalSourcePieChart";
import { CostBreakdownPieChart } from "../../../global/components/shared/CostBreakdownPieChart";
import { suggestHarvestDate } from "../recommend/types";
import { bucketArrivals } from "../../../admin/components/analytics/arrivalVolumeSeries";
import {
  PRICE_TREND_CODES,
  WEATHER_SUITABILITY_CODES,
  normalizePriceTrendCode,
  normalizeWeatherSuitability
} from "../../utils/farmerCodes";
import { useLanguage } from "../../../global/contexts/LanguageContext";
import { WeatherLocationBanner } from "./WeatherLocationBanner";
import { WeatherForecastOutlook } from "../../../global/components/shared/WeatherForecastOutlook";
import { CropWeatherCard } from "./CropWeatherCard";

function computeQuartilesFromRecords(records) {
  if (!records || records.length === 0) return null;
  const values = records
    .map((r) => {
      const v = r.volume_kg != null ? r.volume_kg : r.volumeKg != null ? r.volumeKg : r.volume;
      return v != null ? Number(v) : NaN;
    })
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  if (values.length === 0) return null;
  const n = values.length;
  const getPercentile = (p) => {
    const pos = (p / 100) * (n + 1);
    if (pos <= 1) return values[0];
    if (pos >= n) return values[n - 1];
    const lowerIdx = Math.floor(pos) - 1;
    const fraction = pos - Math.floor(pos);
    return values[lowerIdx] + fraction * (values[lowerIdx + 1] - values[lowerIdx]);
  };
  return {
    q1: getPercentile(25),
    q2: getPercentile(50),
    q3: getPercentile(75),
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
  commodityId,
  commodityName,
  cropStage,
  plantingDate,
  expectedHarvestDate,
  plantingSeason,
  moduleResults,
  plantingWindowStart,
  plantingWindowEnd,
  plantingWindowLabel,
}) => {
  const { t } = useLanguage();
  return (
    <PriceDetailView
      commodityId={commodityId}
      commodityName={commodityName ?? t("farmer.common.unspecified_crop", {}, "Tanom")}
      showHeading={false}
      cropStage={cropStage}
      plantingDate={plantingDate}
      expectedHarvestDate={expectedHarvestDate}
      plantingSeason={plantingSeason}
      moduleResults={moduleResults}
      plantingWindowStart={plantingWindowStart}
      plantingWindowEnd={plantingWindowEnd}
      plantingWindowLabel={plantingWindowLabel}
    />
  );
};


function parseDateOnly(val) {
  if (val == null || typeof val === "number") return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const s = String(val).trim().split("T")[0];
  const parts = s.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y >= 1900) {
      return new Date(y, m, d);
    }
  } else if (parts.length === 2) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    if (!isNaN(y) && !isNaN(m) && y >= 1900) {
      return new Date(y, m, 1);
    }
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) || parsed.getFullYear() < 1900 ? null : parsed;
}

const MONTH_KEYS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

const ArrivalTab = ({
  data,
  commodityId,
  commodityName,
  cropStage,
  plantingDate,
  expectedHarvestDate,
  plantingSeason,
  moduleResults,
  plantingWindowStart,
  plantingWindowEnd,
  plantingWindowLabel,
}) => {
  const { t } = useLanguage();
  const [frequency, setFrequency] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState("all");
  const farmSourceLabel = t("farmer.cropCycle.farm_source", {}, "Farm source");
  const otherSourcesLabel = t("farmer.cropCycle.other_sources", {}, "Other sources");

  const availableYears = useMemo(() => {
    if (!data?.records || data.records.length === 0) return [];
    const years = new Set();
    data.records.forEach((r) => {
      const d = parseDateOnly(r.arrival_date);
      if (d) years.add(d.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [data?.records]);

  // Determine expected harvest date (from explicit prop, module results, or crop maturity duration)
  const harvestDateObj = useMemo(() => {
    const explicitHarvest = expectedHarvestDate || moduleResults?.expected_harvest_date;
    const rawStart = plantingDate || plantingWindowStart;
    let derivedHarvest = null;
    if (!explicitHarvest && rawStart) {
      const suggestion = suggestHarvestDate(rawStart, commodityId || commodityName);
      if (suggestion) {
        derivedHarvest = suggestion.maxDate || suggestion.minDate;
      }
    }
    const harvestDateStr = explicitHarvest || derivedHarvest;
    return harvestDateStr ? parseDateOnly(harvestDateStr) : null;
  }, [expectedHarvestDate, moduleResults?.expected_harvest_date, plantingDate, plantingWindowStart, commodityId, commodityName]);

  const harvestPeriodLabel = useMemo(() => {
    if (!harvestDateObj) return null;
    const m = harvestDateObj.getMonth();
    const y = harvestDateObj.getFullYear();
    const enName = harvestDateObj.toLocaleDateString("en-US", { month: "long" });
    const locMonth = t(`farmer.calendar.${MONTH_KEYS[m]}`, {}, enName);
    return `${locMonth} ${y}`;
  }, [harvestDateObj, t]);

  const realChartData = useMemo(() => {
    if (!data?.records || data.records.length === 0) return null;
    let validRecords = data.records.filter((r) => r.arrival_date && r.volume_kg != null);
    if (validRecords.length === 0) return null;

    if (selectedYear !== "all") {
      const targetYearNum = Number(selectedYear);
      validRecords = validRecords.filter((r) => {
        const d = parseDateOnly(r.arrival_date);
        return d && d.getFullYear() === targetYearNum;
      });
      if (validRecords.length === 0) return null;
    }

    if (frequency === "weekly") {
      const buckets = bucketArrivals(validRecords, { granularity: "weekly" });
      if (buckets && buckets.length > 0) {
        return buckets.map((b) => ({
          month: b.period,
          Volume: Number(b.total_kg),
          [farmSourceLabel]: b.farm_kg > 0 ? Number(b.farm_kg) : null,
          [otherSourcesLabel]: b.other_kg > 0 ? Number(b.other_kg) : null,
        }));
      }
    }

    // Default: return records sorted by arrival_date
    return [...validRecords]
      .sort((a, b) => a.arrival_date.localeCompare(b.arrival_date))
      .map((record) => ({
        month: record.arrival_date,
        Volume: Number(record.volume_kg),
        [farmSourceLabel]: record.farm_source_volume_kg != null
          ? Number(record.farm_source_volume_kg)
          : null,
        [otherSourcesLabel]: record.other_source_volume_kg != null
          ? Number(record.other_source_volume_kg)
          : null,
      }));
  }, [data?.records, frequency, selectedYear, farmSourceLabel, otherSourcesLabel]);

  const showRealChart = Boolean(realChartData && realChartData.length > 0);
  const arrivalSeries = [
    { key: "Volume", color: "#15803d" },
    ...(realChartData?.some((record) => record[farmSourceLabel] != null)
      ? [{ key: farmSourceLabel, color: "#65a30d" }]
      : []),
    ...(realChartData?.some((record) => record[otherSourcesLabel] != null)
      ? [{ key: otherSourcesLabel, color: "#f59e0b" }]
      : []),
  ];
  // Harvest Window Arrival Assessment using existing stored quartile thresholds or dynamically calculated from records
  const arrivalAssessment = useMemo(() => {
    let storedThresholds =
      data?.quartileThresholds ||
      moduleResults?.quartile_thresholds ||
      moduleResults?.quartiles ||
      null;

    if (
      (!storedThresholds || storedThresholds.q1 == null) &&
      data?.records &&
      data.records.length > 0
    ) {
      storedThresholds = computeQuartilesFromRecords(data.records);
    }

    let harvestArrivalVal = null;
    if (harvestDateObj && data?.records && data.records.length > 0) {
      const hMonth = harvestDateObj.getMonth();
      const hYear = harvestDateObj.getFullYear();
      const validRecords = data.records.filter((r) => r.arrival_date && r.volume_kg != null);

      const exactMatches = validRecords.filter((r) => {
        const d = parseDateOnly(r.arrival_date);
        return d && d.getFullYear() === hYear && d.getMonth() === hMonth;
      });

      if (exactMatches.length > 0) {
        harvestArrivalVal = exactMatches.reduce((sum, r) => sum + Number(r.volume_kg), 0) / exactMatches.length;
      } else {
        const monthMatches = validRecords.filter((r) => {
          const d = parseDateOnly(r.arrival_date);
          return d && d.getMonth() === hMonth;
        });
        if (monthMatches.length > 0) {
          harvestArrivalVal = monthMatches.reduce((sum, r) => sum + Number(r.volume_kg), 0) / monthMatches.length;
        }
      }
    }

    if (harvestArrivalVal == null) {
      harvestArrivalVal = data?.currentVolumeKg != null
        ? Number(data.currentVolumeKg)
        : data?.averageArrivalKg != null
        ? Number(data.averageArrivalKg)
        : moduleResults?.current_arrival_kg != null
        ? Number(moduleResults.current_arrival_kg)
        : null;
    }

    if (!storedThresholds || storedThresholds.q1 == null) {
      const fallbackClassification = moduleResults?.arrival_pressure || null;
      if (fallbackClassification) {
        const norm = String(fallbackClassification).toLowerCase();
        let code = "low";
        let range = "< Q1";
        let intKey = "farmer.factors.arrival.assessment_interpretation_low";
        let defInt = "Historical arrivals during this harvest period fall below the first quartile. This period typically experiences relatively lower market supply.";
        if (norm.includes("high")) {
          code = "high";
          range = "≥ Q3";
          intKey = "farmer.factors.arrival.assessment_interpretation_high";
          defInt = "Historical arrivals during this harvest period exceed Q3. This period typically experiences the highest levels of market supply and competition.";
        } else if (norm.includes("upper")) {
          code = "upper_middle";
          range = "Q2 – Q3";
          intKey = "farmer.factors.arrival.assessment_interpretation_upper_middle";
          defInt = "Historical arrivals during this harvest period fall between Q2 and Q3. This period typically experiences above-average market supply.";
        } else if (norm.includes("lower")) {
          code = "lower_middle";
          range = "Q1 – Q2";
          intKey = "farmer.factors.arrival.assessment_interpretation_lower_middle";
          defInt = "Historical arrivals during this harvest period fall between Q1 and Q2. This period typically experiences below-average market supply.";
        }
        return {
          expectedHarvest: harvestPeriodLabel || "—",
          classification: t(`farmer.factors.arrival.level_${code}`, {}, fallbackClassification),
          classificationCode: code,
          range,
          interpretation: t(intKey, {}, defInt),
          harvestVolume: harvestArrivalVal,
          isWithheld: false,
          thresholds: null,
        };
      }

      return {
        expectedHarvest: harvestPeriodLabel || "—",
        classification: "—",
        classificationCode: null,
        range: "—",
        interpretation: t(
          "farmer.empty.no_arrival_data",
          {},
          "DFTC arrival information is not available right now."
        ),
        harvestVolume: harvestArrivalVal,
        isWithheld: false,
        thresholds: null,
      };
    }

    const q1 = Number(storedThresholds.q1);
    const q2 = Number(storedThresholds.q2);
    const q3 = Number(storedThresholds.q3);
    const val = harvestArrivalVal != null ? harvestArrivalVal : q2;

    let code = "low";
    let classificationLabel = t("farmer.factors.arrival.level_low", {}, "Low");
    let range = "< Q1";
    let interpretationKey = "farmer.factors.arrival.assessment_interpretation_low";
    let defaultInterpretation = "Historical arrivals during this harvest period fall below the first quartile. This period typically experiences relatively lower market supply.";

    if (val >= q3) {
      code = "high";
      classificationLabel = t("farmer.factors.arrival.level_high", {}, "High");
      range = "≥ Q3";
      interpretationKey = "farmer.factors.arrival.assessment_interpretation_high";
      defaultInterpretation = "Historical arrivals during this harvest period exceed Q3. This period typically experiences the highest levels of market supply and competition.";
    } else if (val >= q2) {
      code = "upper_middle";
      classificationLabel = t("farmer.factors.arrival.level_upper_middle", {}, "Upper Middle");
      range = "Q2 – Q3";
      interpretationKey = "farmer.factors.arrival.assessment_interpretation_upper_middle";
      defaultInterpretation = "Historical arrivals during this harvest period fall between Q2 and Q3. This period typically experiences above-average market supply.";
    } else if (val >= q1) {
      code = "lower_middle";
      classificationLabel = t("farmer.factors.arrival.level_lower_middle", {}, "Lower Middle");
      range = "Q1 – Q2";
      interpretationKey = "farmer.factors.arrival.assessment_interpretation_lower_middle";
      defaultInterpretation = "Historical arrivals during this harvest period fall between Q1 and Q2. This period typically experiences below-average market supply.";
    }

    return {
      expectedHarvest: harvestPeriodLabel || "—",
      classification: classificationLabel,
      classificationCode: code,
      range,
      interpretation: t(interpretationKey, {}, defaultInterpretation),
      harvestVolume: harvestArrivalVal,
      isWithheld: false,
      thresholds: { q1, q2, q3 },
    };
  }, [data, moduleResults, harvestDateObj, harvestPeriodLabel, t]);

  const normPressure = normalizeArrivalPressure(
    arrivalAssessment?.classificationCode || data?.arrivalPressure || data?.trend || moduleResults?.arrival_pressure
  );
  const banner = normPressure ? ARRIVAL_PRESSURE_CFG[normPressure] : null;
  const BannerIcon = banner?.Icon;
  const hasData = Boolean(normPressure || showRealChart || (data?.records && data.records.length > 0));

  const averageVolume = data?.averageArrivalKg != null && Number.isFinite(Number(data.averageArrivalKg))
    ? Number(data.averageArrivalKg)
    : null;

  const sourceBreakdown = [
    { name: t("farmer.cropCycle.farm_source", {}, "Farm source"), volumeKg: Number(data?.sourceBreakdown?.farm_source_volume_kg) || 0 },
    { name: t("farmer.cropCycle.other_sources", {}, "Other sources"), volumeKg: Number(data?.sourceBreakdown?.other_source_volume_kg) || 0 },
  ].map((source) => ({ ...source, value: source.volumeKg }))
    .filter((source) => source.volumeKg > 0);

  const chartSubtitle = useMemo(() => {
    if (data?.dataIsStale) {
      return t("farmer.cropCycle.arrival_stale_notice", {}, "The latest available arrival records are older than 90 days.");
    }
    return t("farmer.factors.arrival.chart_subtitle_actual", {}, "Actual arrivals · kg");
  }, [data?.dataIsStale, t]);

  const classificationTextClass = useMemo(() => {
    if (!arrivalAssessment?.classificationCode) return "text-black";
    if (arrivalAssessment.classificationCode === "high") return "text-[#dc2626]";
    if (arrivalAssessment.classificationCode === "upper_middle") return "text-[#ea580c]";
    if (arrivalAssessment.classificationCode === "lower_middle") return "text-[#eab308]";
    return "text-[#16a34a]";
  }, [arrivalAssessment?.classificationCode]);

  const arrivalExplanation = useMemo(() => {
    if (arrivalAssessment.interpretation) {
      return arrivalAssessment.interpretation;
    }
    const rawText = data?.summary || data?.message || "";
    if (banner) {
      return t(banner.descKey, {}, banner.fallbackDesc);
    }
    return rawText || t("farmer.empty.no_arrival_data", {}, "DFTC arrival information is not available right now.");
  }, [arrivalAssessment.interpretation, data, banner, t]);

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
        <div className="flex items-start sm:items-center gap-3 px-4 py-3 rounded-xl border border-[var(--hw-neutral-200)] bg-transparent">
          <BannerIcon className={`w-5 h-5 ${banner.color} flex-shrink-0 mt-0.5 sm:mt-0`} />
          <div>
            <p className="text-[14px] sm:text-[15px] font-bold text-black">
              {t(banner.titleKey, {}, banner.fallbackTitle)}
            </p>
            <p className="text-[12px] sm:text-[13px] text-black mt-0.5">
              {t(banner.descKey, {}, banner.fallbackDesc)}
            </p>
          </div>
        </div>
      )}

      {showRealChart && (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[var(--hw-neutral-100)]">
            <div>
              <p className="text-[13px] font-bold text-black">
                {commodityName} · {t("farmer.factors.arrival.arrival_volume_trend_title", {}, "Arrival Volume Trend")}
              </p>
              <p className="text-[12px] text-black mt-0.5">
                {chartSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 self-start sm:self-auto shrink-0 pt-0.5 sm:pt-0">
              {availableYears.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <label className="text-[12px] font-semibold text-black whitespace-nowrap">
                    {t("farmer.factors.arrival.filter_year_label", {}, "Year")}:
                  </label>
                  <div className="relative">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="h-8 pl-3 pr-8 text-[12px] font-semibold text-black bg-[var(--hw-neutral-50)] hover:bg-white border border-[var(--hw-neutral-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer transition-colors appearance-none"
                    >
                      <option value="all">{t("farmer.factors.arrival.filter_all_years", {}, "All Years")}</option>
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black pointer-events-none" />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <label className="text-[12px] font-semibold text-black whitespace-nowrap">
                  {t("farmer.factors.price.historical_avg_frequency", {}, "Frequency")}:
                </label>
                <div className="relative">
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="h-8 pl-3 pr-8 text-[12px] font-semibold text-black bg-[var(--hw-neutral-50)] hover:bg-white border border-[var(--hw-neutral-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer transition-colors appearance-none"
                  >
                    <option value="monthly">{t("farmer.factors.price.historical_avg_monthly", {}, "Monthly")}</option>
                    <option value="weekly">{t("farmer.factors.price.historical_avg_weekly", {}, "Weekly")}</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
          {harvestPeriodLabel && (
            <p className="text-[12px] sm:text-[13px] font-medium text-black">
              {t("farmer.factors.arrival.expected_harvest_period_label", {}, "Expected Harvest Period")}: {harvestPeriodLabel}
            </p>
          )}
          <ArrivalVolumeTrendChart
            commodity={commodityName ?? ""}
            chartData={realChartData}
            varietyKeys={arrivalSeries.map((series) => series.key)}
            colors={arrivalSeries.map((series) => series.color)}
            sourceType="Actual Arrivals"
            referenceValue={averageVolume}
            quartileThresholds={data?.quartileThresholds || moduleResults?.quartile_thresholds || arrivalAssessment?.thresholds}
            height={260}
            cropStage={cropStage}
            plantingDate={plantingDate}
            expectedHarvestDate={expectedHarvestDate}
            plantingWindowStart={plantingWindowStart}
            plantingWindowEnd={plantingWindowEnd}
            harvestPeriodLabel={harvestPeriodLabel}
          />
        </div>
      )}

      {/* Arrival Assessment Card (replaces old Latest Arrival block) */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between border-b border-[var(--hw-neutral-100)] pb-2.5">
          <p className="text-[12px] sm:text-[13px] font-bold uppercase tracking-wider text-black">
            {t("farmer.factors.arrival.assessment_title", {}, "ARRIVAL ASSESSMENT")}
          </p>
          {arrivalAssessment.harvestVolume != null && (
            <span className="text-[11.5px] font-semibold text-[var(--hw-neutral-600)]">
              {Number(arrivalAssessment.harvestVolume.toFixed(1)).toLocaleString()} kg
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div className="flex sm:flex-col items-center sm:items-start justify-between rounded-xl bg-[var(--hw-neutral-50)] px-3 py-2.5 sm:p-3 border border-[var(--hw-neutral-100)]">
            <p className="text-[11px] font-semibold uppercase tracking-tight text-[var(--hw-neutral-600)] leading-tight">
              {t("farmer.factors.arrival.assessment_expected_harvest", {}, "Expected Harvest")}
            </p>
            <p className="text-[14px] sm:text-[15px] font-bold text-black sm:mt-1 leading-tight">
              {arrivalAssessment.expectedHarvest}
            </p>
          </div>
          <div className="flex sm:flex-col items-center sm:items-start justify-between rounded-xl bg-[var(--hw-neutral-50)] px-3 py-2.5 sm:p-3 border border-[var(--hw-neutral-100)]">
            <p className="text-[11px] font-semibold uppercase tracking-tight text-[var(--hw-neutral-600)] leading-tight">
              {t("farmer.factors.arrival.assessment_classification_label", {}, "Arrival Classification")}
            </p>
            <p className={`text-[14px] sm:text-[15px] font-bold sm:mt-1 leading-tight ${classificationTextClass}`}>
              {arrivalAssessment.classification}
            </p>
          </div>
          <div className="flex sm:flex-col items-center sm:items-start justify-between rounded-xl bg-[var(--hw-neutral-50)] px-3 py-2.5 sm:p-3 border border-[var(--hw-neutral-100)]">
            <p className="text-[11px] font-semibold uppercase tracking-tight text-[var(--hw-neutral-600)] leading-tight">
              {t("farmer.factors.arrival.assessment_range_label", {}, "Range")}
            </p>
            <p className="text-[14px] sm:text-[15px] font-bold text-black sm:mt-1 leading-tight">
              {arrivalAssessment.range}
            </p>
          </div>
        </div>
        <div className="pt-2 border-t border-[var(--hw-neutral-100)]">
          <p className="text-[11px] font-semibold uppercase tracking-tight text-[var(--hw-neutral-600)] mb-1">
            {t("farmer.factors.arrival.assessment_interpretation_label", {}, "Interpretation")}
          </p>
          <p className="text-[12.5px] sm:text-[13px] text-black leading-relaxed">
            {arrivalAssessment.interpretation}
          </p>
        </div>
      </div>

      {sourceBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-5 space-y-3">
          <div>
            <p className="text-[13px] font-bold text-black">{t("farmer.factors.arrival.source_breakdown_title", {}, "Arrival Volume by Source")}</p>
            <p className="text-[12px] text-black mt-0.5">{t("farmer.factors.arrival.source_breakdown_subtitle", {}, "DFTC registered farms vs other supplying sources.")}</p>
          </div>
          <ArrivalSourcePieChart data={sourceBreakdown} height={240} />
        </div>
      )}

      <div className="bg-[var(--hw-neutral-50)] rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-1.5">
        <p className="text-[12px] font-bold text-black uppercase tracking-wide">{t("farmer.common.what_this_means", {}, "What this means")}</p>
        <p className="text-[13px] text-black leading-relaxed">
          {arrivalExplanation}
        </p>
      </div>
    </div>
  );
};

const HARVEST_QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const ProductionTab = ({
  data,
  commodityId,
  commodityName,
  cropStage,
  plantingDate,
  expectedHarvestDate,
  plantingSeason,
  moduleResults,
  plantingWindowStart,
  plantingWindowEnd,
  plantingWindowLabel,
}) => {
  const { t } = useLanguage();
  const currentQuarter = `Q${Math.floor(new Date().getMonth() / 3) + 1}`;
  const profiles = Array.isArray(data?.quarterlyProfiles) ? data.quarterlyProfiles : [];

  // Automatically determine the quarter on which the harvest window falls
  const defaultHarvestQuarter = useMemo(() => {
    if (data?.selectedQuarter && HARVEST_QUARTERS.includes(data.selectedQuarter)) {
      return data.selectedQuarter;
    }
    if (moduleResults?.harvest_quarter && HARVEST_QUARTERS.includes(moduleResults.harvest_quarter)) {
      return moduleResults.harvest_quarter;
    }
    const explicitHarvest = expectedHarvestDate || moduleResults?.expected_harvest_date;
    const rawStart = plantingDate || plantingWindowStart;
    let derivedHarvest = null;
    if (!explicitHarvest && rawStart) {
      const suggestion = suggestHarvestDate(rawStart, commodityId || commodityName);
      if (suggestion) {
        derivedHarvest = suggestion.maxDate || suggestion.minDate;
      }
    }
    const finalHarvestStr = explicitHarvest || derivedHarvest || rawStart;
    if (finalHarvestStr) {
      const d = parseDateOnly(finalHarvestStr);
      if (d && !isNaN(d.getTime())) {
        return `Q${Math.floor(d.getMonth() / 3) + 1}`;
      }
    }
    return currentQuarter;
  }, [data?.selectedQuarter, moduleResults, expectedHarvestDate, plantingDate, plantingWindowStart, commodityId, commodityName, currentQuarter]);

  const [activeHarvestQuarter, setActiveHarvestQuarter] = useState(defaultHarvestQuarter);

  useEffect(() => {
    if (defaultHarvestQuarter) {
      setActiveHarvestQuarter(defaultHarvestQuarter);
    }
  }, [defaultHarvestQuarter]);

  const [selectedLocation, setSelectedLocation] = useState("all");

  const locations = useMemo(() => {
    const locSet = new Set();
    (data?.sourceAreas || data?.sources || []).forEach((s) => {
      if (s.name) locSet.add(s.name);
    });
    (data?.geoRecords || []).forEach((r) => {
      if (r.location) locSet.add(r.location);
    });
    return [...locSet].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [data?.sourceAreas, data?.sources, data?.geoRecords]);

  const selectedProfile = profiles.find((profile) => profile.quarter === (activeHarvestQuarter || data?.selectedQuarter || defaultHarvestQuarter));
  const currentSelectedQuarter = activeHarvestQuarter || data?.selectedQuarter || defaultHarvestQuarter;
  const isDefaultHarvestQuarter = currentSelectedQuarter === defaultHarvestQuarter;
  const normLevel = normalizeProductionLevel(
    (isDefaultHarvestQuarter && data?.classificationOverride) || selectedProfile?.classification || data?.productionLevel
  );
  const banner = normLevel ? PRODUCTION_BANNER_CFG[normLevel] : null;
  const LevelIcon = banner?.Icon;

  const historicalData = useMemo(() => {
    const byYear = new Map();
    (Array.isArray(data?.records) ? data.records : []).forEach((record) => {
      const yr = Number(record.reference_year);
      if (Number.isFinite(yr) && !byYear.has(yr)) {
        byYear.set(yr, { year: yr });
      }
    });

    if (selectedLocation === "all") {
      (Array.isArray(data?.records) ? data.records : []).forEach((record) => {
        const year = Number(record.reference_year);
        const quarter = record.reference_quarter;
        const volume = Number(record.volume_produced);
        if (!Number.isFinite(year) || !HARVEST_QUARTERS.includes(quarter) || !Number.isFinite(volume)) return;
        const row = byYear.get(year) || { year };
        row[quarter] = (row[quarter] || 0) + volume;
        byYear.set(year, row);
      });
    } else {
      (Array.isArray(data?.geoRecords) ? data.geoRecords : []).forEach((record) => {
        if (record.location !== selectedLocation) return;
        const year = Number(record.reference_year);
        const quarter = record.reference_quarter;
        const volume = Number(record.volume_produced);
        if (!Number.isFinite(year) || !HARVEST_QUARTERS.includes(quarter) || !Number.isFinite(volume)) return;
        const row = byYear.get(year) || { year };
        row[quarter] = (row[quarter] || 0) + volume;
        byYear.set(year, row);
      });
    }
    return [...byYear.values()].sort((a, b) => a.year - b.year);
  }, [data?.records, data?.geoRecords, selectedLocation]);

  const chartQuarters = activeHarvestQuarter ? [activeHarvestQuarter] : HARVEST_QUARTERS;
  const chartData = historicalData.length > 0
    ? historicalData
    : profiles.filter((profile) => Number(profile.years_available) > 0).map((profile) => ({
      year: profile.quarter,
      [profile.quarter]: Number(profile.average_production_mt),
    }));
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 640);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const hasData = chartData.length > 0;

  const locationStats = useMemo(() => {
    if (selectedLocation === "all") {
      const histAvg = data?.grandAverageQuarterlyMt != null
        && Number.isFinite(Number(data.grandAverageQuarterlyMt))
        ? Number(data.grandAverageQuarterlyMt)
        : null;
      const selProd = selectedProfile
        && selectedProfile.average_production_mt != null
        && Number.isFinite(Number(selectedProfile.average_production_mt))
        ? Number(selectedProfile.average_production_mt)
        : null;
      const diff = selProd != null && histAvg != null ? selProd - histAvg : null;
      const diffPct = diff != null && histAvg > 0 ? (diff / histAvg) * 100 : null;
      return {
        historicalAverage: histAvg,
        selectedProduction: selProd,
        productionDifference: diff,
        productionDifferencePct: diffPct,
      };
    }
    const matchingGeo = (Array.isArray(data?.geoRecords) ? data.geoRecords : []).filter(
      (r) => r.location === selectedLocation && Number.isFinite(Number(r.volume_produced))
    );
    const seasonGeo = activeHarvestQuarter
      ? matchingGeo.filter((r) => r.reference_quarter === activeHarvestQuarter)
      : matchingGeo;
    const selProd = seasonGeo.length > 0
      ? seasonGeo.reduce((sum, r) => sum + Number(r.volume_produced), 0) / seasonGeo.length
      : null;

    const qAverages = HARVEST_QUARTERS.map((q) => {
      const qRecords = matchingGeo.filter((r) => r.reference_quarter === q);
      return qRecords.length > 0
        ? qRecords.reduce((sum, r) => sum + Number(r.volume_produced), 0) / qRecords.length
        : 0;
    });
    const histAvg = qAverages.some((v) => v > 0)
      ? qAverages.reduce((sum, v) => sum + v, 0) / 4
      : null;
    const diff = selProd != null && histAvg != null ? selProd - histAvg : null;
    const diffPct = diff != null && histAvg > 0 ? (diff / histAvg) * 100 : null;

    return {
      historicalAverage: histAvg,
      selectedProduction: selProd,
      productionDifference: diff,
      productionDifferencePct: diffPct,
    };
  }, [selectedLocation, data?.grandAverageQuarterlyMt, selectedProfile, data?.geoRecords, activeHarvestQuarter]);

  const { historicalAverage, selectedProduction, productionDifference, productionDifferencePct } = locationStats;

  const levelColor = (classification) => {
    const level = normalizeProductionLevel(classification);
    if (level === "high") return "#dc2626";
    if (level === "upper_middle") return "#ea580c";
    if (level === "lower_middle") return "#eab308";
    return "#16a34a";
  };

  if (!hasData) {
    return (
      <div className="flex items-center justify-center p-8 bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-[13px] text-black font-medium">
        {t("farmer.empty.no_production_data", {}, "Production data not available")}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {banner && (
        <div className="flex items-start sm:items-center gap-3 px-4 py-3 rounded-xl border border-[var(--hw-neutral-200)] bg-transparent">
          <LevelIcon className={`w-5 h-5 ${banner.color} flex-shrink-0 mt-0.5 sm:mt-0`} />
          <div>
            <p className="text-[14px] sm:text-[15px] font-bold text-black">
              {t(banner.titleKey, {}, banner.fallbackTitle)}
            </p>
            <p className="text-[12px] sm:text-[13px] text-black mt-0.5">
              {t(banner.descKey, { name: commodityName || data?.commodityName || t("common.crop", {}, "tanom") }, banner.fallbackDesc)}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-[13px] font-bold text-black">
              {t("farmer.factors.production.typical_quarterly_title", {}, "Typical Quarterly Production Volume (PSA Data · Q1–Q4)")}
            </p>
            {selectedLocation !== "all" && (
              <p className="text-[11.5px] text-[var(--hw-neutral-600)] mt-0.5">
                {selectedLocation} · MT
              </p>
            )}
          </div>
          {locations.length > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <label htmlFor="farmer-source-filter" className="text-[11.5px] sm:text-[12px] font-semibold text-[var(--hw-neutral-600)] whitespace-nowrap">
                {t("farmer.cropCycle.location_filter_label", {}, "Source:")}
              </label>
              <select
                id="farmer-source-filter"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="text-[11.5px] sm:text-[12px] font-medium text-[var(--hw-neutral-800)] bg-white border border-[var(--hw-neutral-200)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-600)] shadow-xs"
              >
                <option value="all">{t("farmer.cropCycle.all_locations", {}, "All Locations (Overall)")}</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {chartData.length > 0 ? (
          <div
            style={{ touchAction: "pan-y" }}
            className="w-full space-y-1"
          >
            <div className="flex flex-wrap items-center gap-2 mb-3" aria-label="Harvest Season">
              <span className="text-[12px] font-semibold text-black mr-1">Harvest Season</span>
              {HARVEST_QUARTERS.map((quarter) => (
                <button
                  key={quarter}
                  type="button"
                  aria-pressed={activeHarvestQuarter === quarter}
                  onClick={() => setActiveHarvestQuarter((current) => current === quarter ? null : quarter)}
                  className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-colors ${activeHarvestQuarter === quarter
                    ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white"
                    : "bg-white border-[var(--hw-neutral-300)] text-[var(--hw-neutral-700)] hover:border-[var(--hw-green-500)]"}`}
                >
                  {quarter}
                </button>
              ))}
            </div>
            <div className="w-full overflow-x-auto touch-pan-x [scrollbar-width:thin]">
              <div style={{ minWidth: isMobile ? Math.max(560, chartData.length * 56) : "100%" }}>
                <ResponsiveContainer width="100%" height={isMobile ? 220 : 250}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#000000" }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: "#000000" }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(value) => `${Number(value).toLocaleString()} MT`}
                />
                <Tooltip formatter={(value, name) => [`${Number(value).toLocaleString()} MT`, name]} 
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                {chartQuarters.map((quarter) => {
                  const profile = profiles.find((item) => item.quarter === quarter);
                  return <Bar key={quarter} dataKey={quarter} name={quarter} fill={levelColor(profile?.classification)} radius={[4, 4, 0, 0]} />;
                })}
              </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#16a34a]" />
                <span className="text-[11px] font-medium text-black">{t("farmer.factors.arrival.level_low", {}, "Low")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#eab308]" />
                <span className="text-[11px] font-medium text-black">{t("farmer.factors.arrival.level_lower_middle", {}, "Lower Middle")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#ea580c]" />
                <span className="text-[11px] font-medium text-black">{t("farmer.factors.arrival.level_upper_middle", {}, "Upper Middle")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#dc2626]" />
                <span className="text-[11px] font-medium text-black">{t("farmer.factors.arrival.level_high", {}, "High")}</span>
              </div>
            </div>
            <p className="text-center text-[10px] text-black mt-1">
              {t(
                "farmer.cropCycle.production_chart_note",
                {},
                "Across all available years · click the selected quarter again to show Q1–Q4"
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 mt-3">
              <div className="flex sm:flex-col items-center sm:items-start justify-between rounded-xl bg-[var(--hw-neutral-50)] px-3 py-2.5 sm:p-3 border border-[var(--hw-neutral-100)]">
                <p className="text-[12px] sm:text-[11px] font-semibold uppercase tracking-tight text-black leading-tight">
                  {t("farmer.cropCycle.historical_seasonal_average", {}, "Historical Average nga Produksyon")}
                </p>
                <p className="sm:mt-1 text-[14px] sm:text-[15px] md:text-[16px] font-bold text-black leading-tight">
                  {historicalAverage == null ? "—" : `${historicalAverage.toLocaleString()} MT`}
                </p>
              </div>
              <div className="flex sm:flex-col items-center sm:items-start justify-between rounded-xl bg-[var(--hw-neutral-50)] px-3 py-2.5 sm:p-3 border border-[var(--hw-neutral-100)]">
                <p className="text-[12px] sm:text-[11px] font-semibold uppercase tracking-tight text-black leading-tight">
                  {t("farmer.cropCycle.selected_season_level", { quarter: activeHarvestQuarter || "" }, `Produksyon sa ${activeHarvestQuarter || ""}`)}
                </p>
                <p className="sm:mt-1 text-[14px] sm:text-[15px] md:text-[16px] font-bold text-black leading-tight">
                  {selectedProduction == null ? "—" : `${selectedProduction.toLocaleString()} MT`}
                </p>
              </div>
              <div className="flex sm:flex-col items-center sm:items-start justify-between rounded-xl bg-[var(--hw-neutral-50)] px-3 py-2.5 sm:p-3 border border-[var(--hw-neutral-100)]">
                <p className="text-[12px] sm:text-[11px] font-semibold uppercase tracking-tight text-black leading-tight">
                  {t("farmer.cropCycle.difference_from_average", {}, "Kalainan sa Historical Average")}
                </p>
                <p className="sm:mt-1 text-[14px] sm:text-[15px] md:text-[16px] font-bold text-black leading-tight">
                  {productionDifference == null
                    ? "—"
                    : `${productionDifference > 0 ? "+" : ""}${productionDifference.toLocaleString()} MT${productionDifferencePct == null ? "" : ` (${productionDifferencePct > 0 ? "+" : ""}${productionDifferencePct.toFixed(1)}%)`}`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[175px] bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-[13px] text-black font-medium">
            {t("farmer.empty.no_production_data", {}, "Production data not available")}
          </div>
        )}
      </div>

      {data?.sources && data.sources.length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-5 space-y-3">
          <div>
            <p className="text-[13px] font-bold text-black">{t("farmer.factors.production.major_sources_title", {}, "Pangunang mga Source sa Produksyon")}</p>
            <p className="text-[12px] text-black mt-0.5">{t("farmer.factors.production.major_sources_subtitle", {}, "Bahin sa volume sa produksyon gikan sa Davao City, Davao Del Sur, ug Bukidnon.")}</p>
          </div>
          <ProductionSourcePieChart data={data.sources} height={260} />
        </div>
      )}

      <div className="bg-[var(--hw-neutral-50)] rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-1.5">
        <p className="text-[12px] font-bold text-black uppercase tracking-wide">{t("farmer.common.what_this_means", {}, "What this means")}</p>
        <p className="text-[13px] text-black leading-relaxed">
          {data?.summary || (banner ? t(banner.descKey, { name: commodityName || data?.commodityName || t("farmer.common.unspecified_crop", {}, "kini nga tanom") }, banner.fallbackDesc) : t("farmer.empty.no_production_data", {}, "Production data not available"))}
        </p>
      </div>
    </div>
  );
};

const WeatherTab = ({ data, commodityName }) => {
  const { t, effectiveLanguage, langCode } = useLanguage();
  const currentLang = effectiveLanguage || langCode || "ceb";
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
      <div className="space-y-4">
        <WeatherLocationBanner />
        <div className="flex items-center justify-center p-8 bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-[13px] text-[var(--hw-neutral-500)] font-medium">
          {t("farmer.empty.no_weather_data", {}, "No weather data available.")}
        </div>
      </div>
    );
  }

  const defaultCropName = commodityName || data?.commodityName || (currentLang === "ceb" ? "Tanom" : currentLang === "tl" ? "Pananim" : "Crop");
  const defaultCautionTemp = (commodityName || "").toLowerCase().includes("kamatis")
    ? "24"
    : (commodityName || "").toLowerCase().includes("carrots")
    ? "21"
    : (commodityName || "").toLowerCase().includes("pechay")
    ? "20"
    : "30";

  const defaultHeadline = data?.riskHeadline ||
    (riskCode === WEATHER_SUITABILITY_CODES.SEVERE || riskCode === "combined_severe"
      ? (currentLang === "ceb" ? `Taas ang risk sa panahon alang sa ${defaultCropName}` : currentLang === "tl" ? `Mataas ang panganib sa panahon para sa ${defaultCropName}` : `Severe weather risk for ${defaultCropName}`)
      : riskCode === WEATHER_SUITABILITY_CODES.CAUTION
      ? (currentLang === "ceb"
          ? `Ang gitagnang temperatura alang sa ${defaultCropName} kay >${defaultCautionTemp}°C`
          : currentLang === "tl"
          ? `Ang tinatayang temperatura para sa ${defaultCropName} ay >${defaultCautionTemp}°C`
          : `Forecast temperature for ${defaultCropName} is >${defaultCautionTemp}°C`)
      : (currentLang === "ceb" ? `Paborable ang kahimtang sa panahon alang sa ${defaultCropName}` : currentLang === "tl" ? `Maganda ang kondisyon ng panahon para sa ${defaultCropName}` : `Suitable weather conditions for ${defaultCropName}`));

  return (
    <div className="space-y-4 sm:space-y-5">
      <WeatherLocationBanner />
      {banner && (
        <div className="rounded-xl border border-[var(--hw-neutral-200)] bg-transparent px-4 py-3">
          <div className="flex items-start gap-2.5">
            <RiskIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${banner.color}`} />
            <div>
              <p className="text-[14px] sm:text-[15px] font-bold text-black">
                {t(banner.titleKey, {}, banner.fallback)}
              </p>
              {data?.riskHeadline && (
                <p className="text-[12px] sm:text-[13px] text-black mt-0.5 leading-snug">
                  {data.riskHeadline}
                </p>
              )}
            </div>
          </div>
          {data?.plantingWindow && (
            <p className="text-[12px] text-black mt-2 font-medium">
              {t("farmer.factors.weather.planting_window_prefix", {}, "Planting window: ")}{data.plantingWindow}
            </p>
          )}
        </div>
      )}

      {/* 14-day forecast section */}
      <WeatherForecastOutlook
        title={t("farmer.factors.weather.forecast_14day_title", {}, "14-Day Weather Forecast Outlook")}
        subtitle={commodityName ? t("farmer.factors.weather.insight_crop_title", { crop_name: commodityName }, `Weather parameters and risks for ${commodityName}`) : ""}
        forecast={forecastList}
        showSuitability={true}
        commodityName={commodityName}
        emptyMessage={t("farmer.factors.weather.empty_forecast", {}, "No weather details available right now.")}
      />

      {/* ── 3. Crop-specific advisory section (strictly for this single commodity) ── */}
      <section className="space-y-3 pt-3 sm:pt-4">
        <p className="text-[13px] font-bold text-black uppercase tracking-wide">
          {t("farmer.factors.weather.crop_advisories_title")}
        </p>
        <CropWeatherCard
          crop={{
            crop_id: data?.commodityId || (typeof commodityName === "string" ? commodityName : "crop"),
            crop_name: commodityName || data?.commodityName || "Crop",
            variety: data?.variety || null,
            status: currentLang === "ceb" ? "Pagbantay" : currentLang === "tl" ? "Binabantayan" : "Monitoring",
            risk_level:
              riskCode === WEATHER_SUITABILITY_CODES.SEVERE || riskCode === "combined_severe"
                ? "Severe"
                : riskCode === WEATHER_SUITABILITY_CODES.CAUTION
                ? "Caution"
                : "Suitable",
            headline: defaultHeadline,
            date_range: currentLang === "ceb" ? "Sunod 7 ka Adlaw" : currentLang === "tl" ? "Susunod na 7 Araw" : "Next 7 Days",
            recommended_actions: actions && actions.length > 0 ? actions : [],
            crop_sensitivity: why || summary || null,
          }}
        />
      </section>

      {/* ── 4. Notes ── */}
      <div className="bg-[var(--hw-neutral-50)] rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
        <p className="text-[12px] text-black leading-relaxed italic">
          {t("farmer.factors.weather.source_open_meteo_notice")}
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

  const levelCode = data.level ? String(data.level).toLowerCase().trim() : null;
  const bannerFromLocal = getProfitBanner(data.profitPerKg);
  const banner = bannerFromLocal;
  if (levelCode) {
    banner.fallbackTitle =
      levelCode === "favorable" ? "Favorable"
      : levelCode === "marginal" ? "Marginal"
      : levelCode === "unfavorable" ? "Unfavorable"
      : banner.fallbackTitle;
  }
  const BannerIcon = banner.Icon;

  return (
    <div className="space-y-4">
      {/* Classification banner */}
      <div className="flex items-start sm:items-center gap-3 px-4 py-3 rounded-xl border border-[var(--hw-neutral-200)] bg-transparent">
        <BannerIcon className={`w-5 h-5 ${banner.color} flex-shrink-0 mt-0.5 sm:mt-0`} />
        <div>
          <p className="text-[14px] sm:text-[15px] font-bold text-black">
            {t(banner.titleKey, {}, banner.fallbackTitle)}
          </p>
          <p className="text-[12px] sm:text-[13px] text-black mt-0.5">
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
        <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 text-center">
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
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-5 space-y-3">
          <div>
            <p className="text-[13px] font-bold text-black">{t("farmer.factors.profitability.detailed_cost_breakdown_title", {}, "Detailed Cost Breakdown")}</p>
            <p className="text-[12px] text-black mt-0.5">{t("farmer.factors.profitability.detailed_cost_breakdown_subtitle", {}, "Itemized expenses entered for this planting cycle.")}</p>
          </div>
          <CostBreakdownPieChart expenses={data.expenses} height={200} />
        </div>
      )}

      {/* Summary */}
      <div className="bg-[var(--hw-neutral-50)] rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-1.5">
        <p className="text-[12px] font-bold text-black uppercase tracking-wide">{t("farmer.common.what_this_means", {}, "What this means")}</p>
        <p className="text-[13px] text-black leading-relaxed">{data.summary || t("farmer.factors.profitability.estimate_disclaimer", {}, "Estimate only. Actual income may vary.")}</p>
        <p className="text-[11px] text-black italic">{t("farmer.factors.profitability.estimate_disclaimer", {}, "Estimate only. Actual income may vary.")}</p>
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
  arrival,
  production,
  weather,
  profitability,
  defaultTab = "price",
  commodityId,
  commodityName,
  cropStage,
  plantingDate,
  expectedHarvestDate,
  plantingSeason,
  moduleResults,
  plantingWindowStart,
  plantingWindowEnd,
  plantingWindowLabel,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const visibleTabs = TAB_CONFIG.filter(
    (tab) => tab.id !== "profitability" || profitability != null
  );
  const safeTab = visibleTabs.some((tab) => tab.id === activeTab) ? activeTab : visibleTabs[0].id;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="bg-white rounded-lg border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="flex w-full overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {visibleTabs.map((tab) => {
            const Icon = tab.Icon;
            const isActive = safeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={t(tab.labelKey, {}, tab.fallback)}
                className={`flex-auto min-w-fit flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 xs:px-2.5 sm:px-4 py-2 sm:py-2.5 text-[11px] xs:text-[12px] sm:text-[13px] md:text-[14px] font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)] bg-[var(--hw-green-50)]"
                    : "border-transparent text-black hover:bg-[var(--hw-neutral-50)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="whitespace-nowrap shrink-0">{t(tab.labelKey, {}, tab.fallback)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content directly in the main container */}
      <div className="w-full">
        {safeTab === "price" && (
          <PriceTab
            commodityId={commodityId}
            commodityName={commodityName ?? weather?.cropName}
            cropStage={cropStage}
            plantingDate={plantingDate}
            expectedHarvestDate={expectedHarvestDate}
            plantingSeason={plantingSeason}
            moduleResults={moduleResults}
            plantingWindowStart={plantingWindowStart}
            plantingWindowEnd={plantingWindowEnd}
            plantingWindowLabel={plantingWindowLabel}
          />
        )}
        {safeTab === "arrival" && (
          <ArrivalTab
            data={arrival}
            commodityId={commodityId}
            commodityName={commodityName ?? weather?.cropName}
            cropStage={cropStage}
            plantingDate={plantingDate}
            expectedHarvestDate={expectedHarvestDate}
            plantingSeason={plantingSeason}
            moduleResults={moduleResults}
            plantingWindowStart={plantingWindowStart}
            plantingWindowEnd={plantingWindowEnd}
            plantingWindowLabel={plantingWindowLabel}
          />
        )}
        {safeTab === "production" && (
          <ProductionTab
            data={production}
            commodityId={commodityId}
            commodityName={commodityName ?? weather?.cropName}
            cropStage={cropStage}
            plantingDate={plantingDate}
            expectedHarvestDate={expectedHarvestDate}
            plantingSeason={plantingSeason}
            moduleResults={moduleResults}
            plantingWindowStart={plantingWindowStart}
            plantingWindowEnd={plantingWindowEnd}
            plantingWindowLabel={plantingWindowLabel}
          />
        )}
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
