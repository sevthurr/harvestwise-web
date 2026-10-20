import { useState, useMemo, useEffect, useRef } from "react";
import * as RechartsModule from "recharts";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronDown, Calendar, Info } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import * as pricesApi from "../../../../services/api/pricesApi";
import { suggestHarvestDate } from "../../../farmer/components/recommend/types";

const {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
} = RechartsModule;
const ReferenceArea = RechartsModule.ReferenceArea || (() => null);
const ReferenceLine = RechartsModule.ReferenceLine || (() => null);

const HISTORICAL_AVG_COLOR = "#2563eb";
const HISTORICAL_AVG_DOT_FILL = "#ffffff";
const HISTORICAL_AVG_DOT_STROKE = "#2563eb";
const HISTORICAL_AVG_ACTIVE_DOT = "#1d4ed8";

function parseDateOnly(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatWeeklyLabel(startStr, endStr, includeYear = true) {
  const dStart = parseDateOnly(startStr);
  const dEnd = parseDateOnly(endStr);
  if (!dStart || !dEnd) return `${startStr}–${endStr}`;

  const startMonth = dStart.toLocaleDateString("en-US", { month: "short" });
  const endMonth = dEnd.toLocaleDateString("en-US", { month: "short" });
  const startDay = dStart.getDate();
  const endDay = dEnd.getDate();
  const year = dStart.getFullYear();

  if (startMonth === endMonth) {
    return includeYear
      ? `${startMonth} ${startDay}–${endDay}, ${year}`
      : `${startMonth} ${startDay}–${endDay}`;
  }
  return includeYear
    ? `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`
    : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

function formatWeeklyTick(startStr, endStr) {
  const dStart = parseDateOnly(startStr);
  const dEnd = parseDateOnly(endStr);
  if (!dStart || !dEnd) return startStr;

  const startMonth = dStart.toLocaleDateString("en-US", { month: "short" });
  const endMonth = dEnd.toLocaleDateString("en-US", { month: "short" });
  const startDay = dStart.getDate();
  const endDay = dEnd.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

function formatMonthlyLabel(startStr) {
  const d = parseDateOnly(startStr);
  if (!d) return startStr;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatMonthlyTooltip(startStr) {
  const d = parseDateOnly(startStr);
  if (!d) return startStr;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function CustomTooltip({
  active,
  payload,
  frequency,
  commodity,
  variety,
  priceLabel,
  observationsLabel,
  highlightIndices = null,
  highlightLabel = "🌱 Planting Window",
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point || point.average_price == null) return null;

  const isInsideWindow = highlightIndices && highlightIndices.has(point.index);
  const titleVariety = variety ? ` (${variety})` : "";
  const title = `${commodity || "Crop"}${titleVariety}`;
  const periodLabel =
    frequency === "weekly"
      ? formatWeeklyLabel(point.period_start, point.period_end, true)
      : formatMonthlyTooltip(point.period_start);

  return (
    <div className="bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-3 min-w-[210px] z-50 pointer-events-none space-y-1.5">
      <div className="text-[11px] font-semibold text-black mb-1 pb-1 border-b border-[var(--hw-neutral-100)] flex items-center justify-between gap-2">
        <span>{periodLabel}</span>
      </div>
      <div className="text-[11px] font-medium text-black mb-2">
        {title} · Historical Average · ₱/kg
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#2563eb]" />
            <span className="text-[12px] font-medium text-black">
              {priceLabel}
            </span>
          </div>
          <span className="text-[12px] font-bold text-black">
            ₱{Number(point.average_price).toFixed(2)}/kg
          </span>
        </div>
        {point.observation_count != null && (
          <div className="flex items-center justify-between gap-3 text-[11px] text-black pt-1 border-t border-[var(--hw-neutral-100)]">
            <span>{observationsLabel}:</span>
            <span className="font-semibold text-black">
              {point.observation_count}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function HistoricalAveragePriceSection({
  commodityId,
  commodityName,
  variety = null,
  market = null,
  priceType = null,
  priceTypeKey = "bangkerohan_retail",
  height = 380,
  className = "",
  plantingDate = null,
  expectedHarvestDate = null,
  harvestDate = null,
  plantingWindowStart = null,
  plantingWindowEnd = null,
  plantingWindowLabel = null,
  cropStage = null,
  plantingSeason = null,
}) {
  const { t } = useLanguage();
  const [frequency, setFrequency] = useState("weekly");

  const { data: apiResponse, isLoading, isError } = useQuery({
    queryKey: ["prices", "historicalAvg", commodityId, priceTypeKey, frequency, variety],
    queryFn: () =>
      pricesApi.getHistoricalAveragePrices(commodityId, {
        price_type: priceTypeKey,
        frequency,
        variety: variety || undefined,
        start_offset_days: 0,
      }),
    enabled: Boolean(commodityId && priceTypeKey),
    staleTime: 1000 * 60 * 30,
  });

  const isQueryBusy = isLoading;

  // Stale data isolation: clear chart data immediately when loading a new query
  const rawRecords = isQueryBusy ? [] : (apiResponse?.records || []);

  const chartData = useMemo(() => {
    return rawRecords.map((r, idx) => {
      const tickLabel =
        frequency === "weekly"
          ? formatWeeklyTick(r.period_start, r.period_end)
          : formatMonthlyLabel(r.period_start);
      return {
        ...r,
        index: idx,
        tickLabel,
      };
    });
  }, [rawRecords, frequency]);

  const validDataPoints = useMemo(() => {
    return chartData.filter((d) => d.average_price != null && Number.isFinite(d.average_price));
  }, [chartData]);

  const hasData = !isQueryBusy && !isError && validDataPoints.length > 0;
  const isEmpty = !isQueryBusy && !isError && validDataPoints.length === 0;
  const isSinglePoint = hasData && validDataPoints.length === 1;

  // Determine dynamic Y-domain matching ForecastPriceTrendChart padding
  const yDomain = useMemo(() => {
    if (!hasData) return [0, 100];
    const prices = validDataPoints.map((d) => d.average_price);
    if (!prices.length) return [0, 100];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = Math.max((max - min) * 0.15, 4);
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];
  }, [hasData, validDataPoints]);

  // Context subtitle components
  const hasVarietyInName = variety && commodityName && commodityName.toLowerCase().includes(variety.toLowerCase());
  const varietyLabel = variety && !hasVarietyInName ? ` (${variety})` : "";
  const fullCropName = commodityName ? `${commodityName}${varietyLabel}` : "Crop";
  const marketName = market || (priceTypeKey.includes("dftc") ? "DFTC" : "Bankerohan Public Market");
  const priceTypeName = priceType || (priceTypeKey.includes("wholesale") ? "Wholesale" : "Retail");

  // Localized string constants
  const title = t("farmer.factors.price.historical_avg_title", {}, "Historical Average Price");
  const frequencyLabel = t("farmer.factors.price.historical_avg_frequency", {}, "Frequency");
  const weeklyOptionLabel = t("farmer.factors.price.historical_avg_weekly", {}, "Weekly");
  const monthlyOptionLabel = t("farmer.factors.price.historical_avg_monthly", {}, "Monthly");
  const priceLabel = t("farmer.factors.price.historical_avg_tooltip_price", {}, "Average price");
  const observationsLabel = t("farmer.factors.price.historical_avg_tooltip_observations", {}, "Recorded observations");

  const genericExplanation = t(
    "farmer.factors.price.historical_avg_explanation",
    {},
    "This chart shows weekly or monthly average recorded prices during past seasons to provide context for your crop timeline."
  );

  const emptyMessage = t(
    "farmer.factors.price.historical_avg_empty",
    {},
    "No historical average price data is available for this selection."
  );

  const errorMessage = t(
    "farmer.factors.price.historical_avg_error",
    {},
    "Historical average price data could not be loaded. Please try again."
  );

  const limitedDataMessage = t(
    "farmer.factors.price.historical_avg_limited",
    {},
    "Limited historical data is available for this selection."
  );

  // Compute plant-to-harvest or planting window highlight on historical series (aligned to previous year)
  const plantingHighlight = useMemo(() => {
    const rawStart = plantingDate || plantingWindowStart;
    const explicitHarvestDate = expectedHarvestDate || harvestDate;

    let derivedHarvestDate = null;
    if (!explicitHarvestDate && !plantingWindowEnd && rawStart) {
      const suggestion = suggestHarvestDate(rawStart, commodityId || commodityName, variety);
      if (suggestion) {
        derivedHarvestDate = suggestion.maxDate || suggestion.minDate;
      }
    }

    const isPlantToHarvest = Boolean(explicitHarvestDate || derivedHarvestDate);
    const rawEnd = explicitHarvestDate || derivedHarvestDate || plantingWindowEnd || rawStart;

    // Do not display planting-window highlight for Stage 3 (Near Harvest) or Stage 4 (Harvest)
    const normStage = String(cropStage || "").toLowerCase().trim();
    if (["near_harvest", "pre_harvest", "pre-harvest", "preharvest", "harvest", "harvesting", "harvested"].includes(normStage)) {
      return null;
    }

    // Do not fabricate a window if no planting date or window was selected (Rule 7)
    if (!rawStart && !plantingSeason) {
      return null;
    }

    if (!chartData || chartData.length === 0) {
      return null;
    }

    const dStart = rawStart ? parseDateOnly(rawStart) : null;
    let dEnd = rawEnd ? parseDateOnly(rawEnd) : null;

    if (!dStart) {
      return null;
    }

    if (dEnd && dEnd < dStart) {
      dEnd = new Date(dStart.getTime());
    }

    const plannedYear = dStart.getFullYear();
    const yearSpan = dEnd ? dEnd.getFullYear() - dStart.getFullYear() : 0;

    // Determine available historical years in chartData strictly prior to the planned year
    const availablePriorYears = Array.from(
      new Set(
        chartData
          .map((item) => parseDateOnly(item.period_start)?.getFullYear())
          .filter((y) => y != null && y < plannedYear)
      )
    ).sort((a, b) => b - a);

    let matchingRecords = [];
    let targetYear = plannedYear;
    let isPriorYear = false;

    // Prioritize matching seasonal timeline on prior years (starting with immediately preceding year)
    if (availablePriorYears.length > 0) {
      for (const candidateYear of availablePriorYears) {
        const projStart = new Date(candidateYear, dStart.getMonth(), dStart.getDate());
        const projEnd = dEnd
          ? new Date(candidateYear + yearSpan, dEnd.getMonth(), dEnd.getDate(), 23, 59, 59)
          : new Date(candidateYear, dStart.getMonth(), dStart.getDate(), 23, 59, 59);

        const candidateMatches = chartData.filter((item) => {
          const recStart = parseDateOnly(item.period_start);
          const recEnd = parseDateOnly(item.period_end || item.period_start);
          if (!recStart || !recEnd) return false;
          return recStart <= projEnd && recEnd >= projStart;
        });

        if (candidateMatches.length > 0) {
          matchingRecords = candidateMatches;
          targetYear = candidateYear;
          isPriorYear = true;
          break;
        }
      }
    }

    // Fallback: If no prior-year data exists in chartData (e.g. mock test fixture with only current year),
    // match direct calendar dates in available data
    if (matchingRecords.length === 0) {
      matchingRecords = chartData.filter((item) => {
        const recStart = parseDateOnly(item.period_start);
        const recEnd = parseDateOnly(item.period_end || item.period_start);
        if (!recStart || !recEnd) return false;
        return recStart <= (dEnd || dStart) && recEnd >= dStart;
      });
      targetYear = plannedYear;
      isPriorYear = false;
    }

    if (matchingRecords.length === 0) {
      return null;
    }

    const firstMatch = matchingRecords[0];
    const lastMatch = matchingRecords[matchingRecords.length - 1];
    const indicesSet = new Set(matchingRecords.map((r) => r.index));

    const finalStart = isPriorYear ? new Date(targetYear, dStart.getMonth(), dStart.getDate()) : dStart;
    const finalEnd = isPriorYear
      ? (dEnd ? new Date(targetYear + yearSpan, dEnd.getMonth(), dEnd.getDate()) : finalStart)
      : (dEnd || dStart);

    const formattedLabel =
      (!isPlantToHarvest && plantingWindowLabel && !isPriorYear)
        ? plantingWindowLabel
        : (finalStart && finalEnd
            ? `${finalStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${finalEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
            : (finalStart ? finalStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Planned Window"));

    const isImmediatePrevYear = targetYear === plannedYear - 1;
    const yearTag = isImmediatePrevYear
      ? t("farmer.factors.price.previous_year", {}, "Previous Year")
      : `${targetYear}`;

    const badgeTitle = isPlantToHarvest
      ? (isPriorYear
          ? `${t("farmer.factors.price.plant_to_harvest_period", {}, "Plant-to-Harvest Period")} (${yearTag})`
          : t("farmer.factors.price.plant_to_harvest_period", {}, "Plant-to-Harvest Period"))
      : (isPriorYear
          ? `${t("farmer.factors.price.your_planting_window", {}, "Your Planned Planting Window")} (${yearTag})`
          : t("farmer.factors.price.your_planting_window", {}, "Your Planned Planting Window"));

    const lineLabel = isPlantToHarvest
      ? (isPriorYear ? `🌱 Plant-to-Harvest (${yearTag})` : "🌱 Plant-to-Harvest Period")
      : (isPriorYear ? `🌱 Planting Window (${yearTag})` : "🌱 Planned Planting Window");

    const tooltipLabel = isPlantToHarvest
      ? (isPriorYear ? `🌱 Plant-to-Harvest (${yearTag})` : "🌱 Plant-to-Harvest")
      : (isPriorYear ? `🌱 Planting Window (${yearTag})` : "🌱 Planting Window");

    const validMatchingPrices = matchingRecords
      .map((r) => r.average_price)
      .filter((p) => p != null && Number.isFinite(p));

    return {
      x1: firstMatch.tickLabel,
      x2: lastMatch.tickLabel,
      indices: indicesSet,
      label: formattedLabel,
      badgeTitle,
      lineLabel,
      tooltipLabel,
      isPlantToHarvest,
      isPriorYear,
      targetYear,
      count: matchingRecords.length,
      validMatchingPrices,
    };
  }, [
    chartData,
    plantingWindowStart,
    plantingWindowEnd,
    plantingDate,
    expectedHarvestDate,
    harvestDate,
    commodityId,
    commodityName,
    variety,
    plantingSeason,
    plantingWindowLabel,
    cropStage,
    t,
  ]);

  // Dynamic real-data statement (rendered only on success with data)
  const dynamicExplanation = useMemo(() => {
    if (!hasData || validDataPoints.length === 0) return null;

    if (plantingHighlight?.validMatchingPrices?.length > 0) {
      const avg =
        plantingHighlight.validMatchingPrices.reduce((a, b) => a + b, 0) /
        plantingHighlight.validMatchingPrices.length;
      return t(
        "farmer.factors.price.historical_avg_dynamic",
        { period: plantingHighlight.label, price: avg.toFixed(2) },
        `The average recorded price for ${plantingHighlight.label} was ₱${avg.toFixed(2)}/kg.`
      );
    }

    const latest = validDataPoints[validDataPoints.length - 1];
    const periodStr =
      frequency === "weekly"
        ? formatWeeklyLabel(latest.period_start, latest.period_end, true)
        : formatMonthlyTooltip(latest.period_start);
    return t(
      "farmer.factors.price.historical_avg_dynamic",
      { period: periodStr, price: latest.average_price.toFixed(2) },
      `The average recorded price for ${periodStr} was ₱${latest.average_price.toFixed(2)}/kg.`
    );
  }, [hasData, validDataPoints, frequency, plantingHighlight, t]);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 640);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const chartHeight = isMobile ? Math.min(height, 270) : height;

  const displayMarketName = marketName === "Bangkerohan Public Market" ? "Bangkerohan" : marketName;

  const containerRef = useRef(null);
  const touchDistRef = useRef(null);
  const [range, setRange] = useState({ start: 0, end: 0 });

  useEffect(() => {
    const len = chartData.length;
    if (len === 0) {
      setRange((prev) => (prev.start === 0 && prev.end === 0 ? prev : { start: 0, end: 0 }));
      return;
    }
    let nextStart = 0;
    let nextEnd = len - 1;

    if (frequency === "weekly") {
      const indicesCount = plantingHighlight?.indices ? (plantingHighlight.indices.size ?? plantingHighlight.indices.length ?? 0) : 0;
      if (indicesCount > 0) {
        const minIdx = Math.min(...plantingHighlight.indices);
        const maxIdx = Math.max(...plantingHighlight.indices);
        const windowSpan = maxIdx - minIdx + 1;
        const buffer = Math.max(4, Math.round(windowSpan * 0.4));
        const targetSpan = Math.max(windowSpan + buffer * 2, 16);
        const center = (minIdx + maxIdx) / 2;
        nextStart = Math.max(0, Math.floor(center - targetSpan / 2));
        nextEnd = Math.min(len - 1, nextStart + targetSpan - 1);
        if (nextEnd === len - 1) {
          nextStart = Math.max(0, nextEnd - targetSpan + 1);
        }
        if (nextStart === 0) {
          nextEnd = Math.min(len - 1, nextStart + targetSpan - 1);
        }
        nextStart = Math.min(nextStart, Math.max(0, minIdx - 1));
        nextEnd = Math.max(nextEnd, Math.min(len - 1, maxIdx + 1));
      } else {
        const defaultWeeks = 8;
        nextStart = Math.max(0, len - defaultWeeks);
        nextEnd = len - 1;
      }
    } else if (frequency === "monthly") {
      const indicesCount = plantingHighlight?.indices ? (plantingHighlight.indices.size ?? plantingHighlight.indices.length ?? 0) : 0;
      if (indicesCount > 0) {
        const minIdx = Math.min(...plantingHighlight.indices);
        const maxIdx = Math.max(...plantingHighlight.indices);
        const buffer = 2;
        const targetSpan = Math.max(maxIdx - minIdx + 1 + buffer * 2, 6);
        const center = (minIdx + maxIdx) / 2;
        nextStart = Math.max(0, Math.floor(center - targetSpan / 2));
        nextEnd = Math.min(len - 1, nextStart + targetSpan - 1);
        if (nextEnd === len - 1) {
          nextStart = Math.max(0, nextEnd - targetSpan + 1);
        }
        if (nextStart === 0) {
          nextEnd = Math.min(len - 1, nextStart + targetSpan - 1);
        }
        nextStart = Math.min(nextStart, Math.max(0, minIdx - 1));
        nextEnd = Math.max(nextEnd, Math.min(len - 1, maxIdx + 1));
      } else {
        nextStart = 0;
        nextEnd = len - 1;
      }
    } else {
      nextStart = 0;
      nextEnd = len - 1;
    }
    setRange((prev) => (prev.start === nextStart && prev.end === nextEnd ? prev : { start: nextStart, end: nextEnd }));
  }, [chartData.length, frequency, plantingHighlight?.x1, plantingHighlight?.x2]);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const len = chartData.length;
    function onWheel(e) {
      e.preventDefault();
      setRange((prev) => {
        if (len < 3) return prev;
        const r = prev.end - prev.start;
        const step = Math.max(1, Math.round(r * 0.15));
        if (e.deltaY < 0) {
          return {
            start: Math.min(prev.start + step, prev.end - 2),
            end: Math.max(prev.end - step, prev.start + 2),
          };
        }
        return {
          start: Math.max(0, prev.start - step),
          end: Math.min(len - 1, prev.end + step),
        };
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [chartData.length]);

  // Touch pinch-zoom with non-passive listener to prevent browser viewport scaling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e) {
      if (e.touches.length === 2) {
        touchDistRef.current = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
      }
    }

    function onTouchMove(e) {
      if (e.touches.length === 2 && touchDistRef.current !== null) {
        if (e.cancelable) e.preventDefault();
        const newDist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        const scale = newDist / touchDistRef.current;
        if (scale > 0 && Math.abs(scale - 1) > 0.02) {
          const len = chartData.length;
          setRange((prev) => {
            const center = (prev.start + prev.end) / 2;
            const currentSpan = prev.end - prev.start;
            const newSpan = Math.max(2, Math.min(len - 1, Math.round(currentSpan / scale)));
            const newStart = Math.max(0, Math.round(center - newSpan / 2));
            return { start: newStart, end: Math.min(len - 1, newStart + newSpan) };
          });
          touchDistRef.current = newDist;
        }
      }
    }

    function onTouchEnd() {
      touchDistRef.current = null;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [chartData.length]);

  return (
    <section className={`bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3.5 sm:p-5 md:p-6 space-y-3.5 sm:space-y-4 ${className}`}>
      {/* Header with Title and Frequency Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[var(--hw-neutral-100)]">
        <div>
          <h3 className="text-[15px] sm:text-[16px] font-bold text-black tracking-tight leading-snug">
            {title}
          </h3>
          <p className="text-[12px] sm:text-[13px] text-black mt-0.5">
            {fullCropName} · {displayMarketName} · {priceTypeName} · ₱/kg
          </p>
        </div>

        {/* Local Frequency Selector - Always interactive across all states */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 pt-0.5 sm:pt-0">
          <label className="text-[12px] font-semibold text-black whitespace-nowrap">
            {frequencyLabel}:
          </label>
          <div className="relative">
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="h-8 pl-3 pr-8 text-[12px] font-semibold text-black bg-[var(--hw-neutral-50)] hover:bg-white border border-[var(--hw-neutral-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer transition-colors appearance-none"
            >
              <option value="weekly">{weeklyOptionLabel}</option>
              <option value="monthly">{monthlyOptionLabel}</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Planting Window Period Context (Plain text, no badge) */}
      {plantingHighlight ? (
        <p className="text-[12px] sm:text-[13px] font-medium text-black">
          {plantingHighlight.badgeTitle}: {plantingHighlight.label}
        </p>
      ) : null}

      {/* Plotting Region — Permanent container height matching ForecastPriceTrendChart across all states */}
      <div className="w-full flex flex-col justify-center" style={{ minHeight: `${chartHeight}px` }}>
        {isQueryBusy ? (
          <div
            className="w-full flex flex-col items-center justify-center bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] space-y-3 animate-pulse"
            style={{ height: `${chartHeight}px` }}
          >
            <Calendar className="w-6 h-6 text-black" />
            <p className="text-[13px] font-medium text-black">
              {t("common.loading", {}, "Loading...")}
            </p>
          </div>
        ) : isError ? (
          <div
            className="w-full flex flex-col items-center justify-center p-6 bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-center space-y-2"
            style={{ height: `${chartHeight}px` }}
          >
            <AlertCircle className="w-6 h-6 text-red-500 mb-1" />
            <p className="text-[13px] font-semibold text-black">
              {errorMessage}
            </p>
          </div>
        ) : isEmpty ? (
          <div
            className="w-full flex flex-col items-center justify-center p-6 bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-center space-y-2"
            style={{ height: `${chartHeight}px` }}
          >
            <AlertCircle className="w-6 h-6 text-black mb-1" />
            <p className="text-[13px] font-medium text-black max-w-md">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div
            ref={containerRef}
            style={{ touchAction: "pan-y" }}
            className="w-full space-y-1"
          >
            {isSinglePoint && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800 font-medium">
                <Info className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                <span>{limitedDataMessage}</span>
              </div>
            )}
            <div className="w-full" style={{ height: `${chartHeight}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 16, right: isMobile ? 12 : 20, left: isMobile ? -2 : 4, bottom: 8 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--hw-neutral-100)" />
                  <XAxis
                    dataKey="tickLabel"
                    tick={{ fontSize: isMobile ? 10 : 11, fill: "#000000" }}
                    tickLine={false}
                    axisLine={false}
                    dy={6}
                    minTickGap={16}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={yDomain}
                    tick={{ fontSize: isMobile ? 10 : 11, fill: "#000000" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `\u20B1${v}`}
                    width={isMobile ? 48 : 55}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        frequency={frequency}
                        commodity={commodityName}
                        variety={variety}
                        priceLabel={priceLabel}
                        observationsLabel={observationsLabel}
                        highlightIndices={plantingHighlight?.indices}
                        highlightLabel={plantingHighlight?.tooltipLabel}
                      />
                    }
                  />
                  {chartData.length > 0 && (
                    <Brush
                      dataKey="tickLabel"
                      startIndex={range.start}
                      endIndex={range.end}
                      onChange={(r) =>
                        setRange({
                          start: r.startIndex ?? 0,
                          end: r.endIndex ?? Math.max(0, chartData.length - 1),
                        })
                      }
                      height={isMobile ? 22 : 28}
                      fill="#f9fafb"
                      stroke="#cbd5e1"
                      travellerWidth={isMobile ? 16 : 10}
                    />
                  )}
                  {/* Visually highlighted planting-season window (Section 4) */}
                  {plantingHighlight && ReferenceArea && (
                    <ReferenceArea
                      x1={plantingHighlight.x1}
                      x2={plantingHighlight.x2}
                      yAxisId={0}
                      fill="#86efac"
                      fillOpacity={0.35}
                      stroke="#16a34a"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                  )}
                  {plantingHighlight && ReferenceLine && (
                    <ReferenceLine
                      x={plantingHighlight.x1}
                      stroke="#16a34a"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                    />
                  )}
                  {/* Straight line graph with breaks for missing periods (type="linear", connectNulls={false}) */}
                  <Line
                    type="linear"
                    dataKey="average_price"
                    name={priceLabel}
                    stroke={HISTORICAL_AVG_COLOR}
                    strokeWidth={2.5}
                    dot={{
                      r: isSinglePoint ? 6 : 3.5,
                      fill: HISTORICAL_AVG_DOT_FILL,
                      stroke: HISTORICAL_AVG_DOT_STROKE,
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 5.5,
                      fill: HISTORICAL_AVG_ACTIVE_DOT,
                      strokeWidth: 0,
                    }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-[10px] text-black mt-1.5">
              {t("farmer.factors.price.zoom_pan_help", {}, "Scroll to zoom · drag bar to pan")}
            </p>
          </div>
        )}
      </div>

      {/* Explanation Area Below Chart */}
      <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3.5 space-y-1.5 border border-[var(--hw-neutral-100)]">
        {/* Dynamic real-data statement only shown on success */}
        {dynamicExplanation && (
          <p className="text-[13px] font-semibold text-black leading-relaxed">
            {dynamicExplanation}
          </p>
        )}
        {/* Generic informational statement always shown */}
        <p className="text-[12px] text-black leading-relaxed">
          {genericExplanation}
        </p>
      </div>
    </section>
  );
}

export default HistoricalAveragePriceSection;
