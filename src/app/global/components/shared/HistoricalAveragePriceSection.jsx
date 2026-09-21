import { useState, useMemo } from "react";
import * as RechartsModule from "recharts";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronDown, Calendar, Info } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import * as pricesApi from "../../../../services/api/pricesApi";

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
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point || point.average_price == null) return null;

  const titleVariety = variety ? ` (${variety})` : "";
  const title = `${commodity || "Crop"}${titleVariety}`;
  const periodLabel =
    frequency === "weekly"
      ? formatWeeklyLabel(point.period_start, point.period_end, true)
      : formatMonthlyTooltip(point.period_start);

  return (
    <div className="bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-3 min-w-[210px] z-50 pointer-events-none">
      <div className="text-[11px] font-semibold text-[var(--hw-neutral-800)] mb-1 pb-1 border-b border-[var(--hw-neutral-100)]">
        {periodLabel}
      </div>
      <div className="text-[11px] font-medium text-[var(--hw-neutral-500)] mb-2">
        {title} · Historical Average · ₱/kg
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#2563eb]" />
            <span className="text-[12px] font-medium text-[var(--hw-neutral-800)]">
              {priceLabel}
            </span>
          </div>
          <span className="text-[12px] font-bold text-[var(--hw-neutral-900)]">
            ₱{Number(point.average_price).toFixed(2)}/kg
          </span>
        </div>
        {point.observation_count != null && (
          <div className="flex items-center justify-between gap-3 text-[11px] text-[var(--hw-neutral-500)] pt-1 border-t border-[var(--hw-neutral-100)]">
            <span>{observationsLabel}:</span>
            <span className="font-semibold text-[var(--hw-neutral-700)]">
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
  const varietyLabel = variety ? ` (${variety})` : "";
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
    "This chart shows the average recorded price for each week or month. It provides additional historical context and does not affect the planting advisory."
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

  // Dynamic real-data statement (rendered only on success with data)
  const dynamicExplanation = useMemo(() => {
    if (!hasData || validDataPoints.length === 0) return null;
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
  }, [hasData, validDataPoints, frequency, t]);

  return (
    <section className={`bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 md:p-6 space-y-4 ${className}`}>
      {/* Header with Title and Frequency Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--hw-neutral-100)]">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--hw-neutral-900)] tracking-tight">
            {title}
          </h3>
          <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
            {fullCropName} · {marketName} · {priceTypeName} · {frequency === "weekly" ? weeklyOptionLabel : monthlyOptionLabel} · ₱/kg
          </p>
        </div>

        {/* Local Frequency Selector - Always interactive across all states */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="text-[12px] font-medium text-[var(--hw-neutral-600)] whitespace-nowrap">
            {frequencyLabel}:
          </label>
          <div className="relative">
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="h-8 pl-3 pr-8 text-[12px] font-semibold text-[var(--hw-neutral-800)] bg-[var(--hw-neutral-50)] hover:bg-white border border-[var(--hw-neutral-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer transition-colors appearance-none"
            >
              <option value="weekly">{weeklyOptionLabel}</option>
              <option value="monthly">{monthlyOptionLabel}</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--hw-neutral-500)] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Plotting Region — Permanent container height matching ForecastPriceTrendChart (380px) across all states */}
      <div className="w-full flex flex-col justify-center" style={{ minHeight: `${height}px` }}>
        {isQueryBusy ? (
          <div
            className="w-full flex flex-col items-center justify-center bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] space-y-3 animate-pulse"
            style={{ height: `${height}px` }}
          >
            <Calendar className="w-6 h-6 text-[var(--hw-neutral-400)]" />
            <p className="text-[13px] font-medium text-[var(--hw-neutral-500)]">
              {t("common.loading", {}, "Loading...")}
            </p>
          </div>
        ) : isError ? (
          <div
            className="w-full flex flex-col items-center justify-center p-6 bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-center space-y-2"
            style={{ height: `${height}px` }}
          >
            <AlertCircle className="w-6 h-6 text-red-500 mb-1" />
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-800)]">
              {errorMessage}
            </p>
          </div>
        ) : isEmpty ? (
          <div
            className="w-full flex flex-col items-center justify-center p-6 bg-[var(--hw-neutral-50)] rounded-xl border border-dashed border-[var(--hw-neutral-200)] text-center space-y-2"
            style={{ height: `${height}px` }}
          >
            <AlertCircle className="w-6 h-6 text-[var(--hw-neutral-400)] mb-1" />
            <p className="text-[13px] font-medium text-[var(--hw-neutral-700)] max-w-md">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div className="w-full space-y-2">
            {isSinglePoint && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800 font-medium">
                <Info className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                <span>{limitedDataMessage}</span>
              </div>
            )}
            <div className="w-full" style={{ height: `${height}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 12, right: 16, left: 0, bottom: 6 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--hw-neutral-100)" />
                  <XAxis
                    dataKey="tickLabel"
                    tick={{ fontSize: 11, fill: "#1f2937" }}
                    tickLine={false}
                    axisLine={false}
                    dy={6}
                    minTickGap={20}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={yDomain}
                    tick={{ fontSize: 11, fill: "#1f2937" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `\u20B1${v}`}
                    width={55}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        frequency={frequency}
                        commodity={commodityName}
                        variety={variety}
                        priceLabel={priceLabel}
                        observationsLabel={observationsLabel}
                      />
                    }
                  />
                  {chartData.length > 16 && (
                    <Brush
                      dataKey="tickLabel"
                      height={18}
                      stroke="#94a3b8"
                      fill="#f8fafc"
                      travellerWidth={8}
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
          </div>
        )}
      </div>

      {/* Explanation Area Below Chart */}
      <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3.5 space-y-1.5 border border-[var(--hw-neutral-100)]">
        {/* Dynamic real-data statement only shown on success */}
        {dynamicExplanation && (
          <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] leading-relaxed">
            {dynamicExplanation}
          </p>
        )}
        {/* Generic informational statement always shown */}
        <p className="text-[12px] text-[var(--hw-neutral-600)] leading-relaxed">
          {genericExplanation}
        </p>
      </div>
    </section>
  );
}

export default HistoricalAveragePriceSection;
