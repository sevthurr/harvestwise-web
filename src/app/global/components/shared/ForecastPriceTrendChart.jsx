import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import * as RechartsModule from "recharts";
const {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
} = RechartsModule;
const ReferenceLine = RechartsModule.ReferenceLine || (() => null);
import { HW_GREEN_SHADES } from "./trendChartData";
import { formatChartDate } from "../../utils/priceChartTransforms";
import { useLanguage } from "../../contexts/LanguageContext";

function UnifiedFcTooltip({
  active,
  payload,
  label,
  commodity,
  variety,
  actualLabel = "Actual price",
  forecastLabel = "Forecast",
  forecastRangeLabel = "Forecast range",
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const actual = point.actual;
  const predicted = point.predicted;
  const lower = point.lower;
  const upper = point.upper;
  const isTransition = Boolean(point.isTransition);

  const titleVariety = variety ? ` (${variety})` : "";
  const title = `${commodity || "Crop"}${titleVariety}`;
  const displayDate = formatChartDate(label) || label;

  return (
    <div className="bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-3 min-w-[210px] z-50 pointer-events-none">
      <div className="text-[11px] font-semibold text-black mb-1 pb-1 border-b border-[var(--hw-neutral-100)]">
        {displayDate}
      </div>
      <div className="text-[11px] font-medium text-black mb-2">
        {title} · ₱/kg
      </div>

      {actual != null && (
        <div className="py-0.5 space-y-0.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#15803d]" />
              <span className="text-[12px] font-medium text-black">
                {actualLabel}
              </span>
            </div>
            <span className="text-[12px] font-bold text-black">
              ₱{Number(actual).toFixed(2)}
            </span>
          </div>
          {isTransition && (
            <div className="text-[10px] text-black pl-4 italic">
              Last observed price
            </div>
          )}
        </div>
      )}

      {predicted != null && !isTransition && (
        <div className="py-0.5 space-y-0.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#22c55e]" />
              <span className="text-[12px] font-medium text-black">
                {forecastLabel}
              </span>
            </div>
            <span className="text-[12px] font-bold text-black">
              ₱{Number(predicted).toFixed(2)}
            </span>
          </div>
          {lower != null && upper != null && (
            <div className="text-[11px] text-black pl-4">
              {forecastRangeLabel}: ₱{Number(lower).toFixed(2)}–₱{Number(upper).toFixed(2)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LegacyFcTooltip({ active, payload, label, commodity }) {
  if (!active || !payload?.length) return null;
  const midEntries = payload.filter(
    (p) => !p.dataKey?.endsWith("__lo") && !p.dataKey?.endsWith("__hi") && p.value != null
  );
  const loMap = {};
  const hiMap = {};
  payload.forEach((p) => {
    if (p.dataKey?.endsWith("__lo") && p.value != null) loMap[p.dataKey.replace("__lo", "")] = p.value;
    if (p.dataKey?.endsWith("__hi") && p.value != null) hiMap[p.dataKey.replace("__hi", "")] = p.value;
  });
  const displayDate = formatChartDate(label) || label;

  return (
    <div className="bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-3 min-w-[210px] z-50 pointer-events-none">
      <div className="text-[11px] font-semibold text-black mb-2 pb-1.5 border-b border-[var(--hw-neutral-100)]">
        {displayDate}
      </div>
      <div className="text-[12px] text-black mb-1.5">{commodity} · Forecast · ₱/kg</div>
      {midEntries.map((entry) => (
        <div key={entry.dataKey} className="py-0.5 space-y-0.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.stroke || HW_GREEN_SHADES[0] }} />
              <span className="text-[12px] text-black">{entry.dataKey}</span>
            </div>
            <span className="text-[12px] font-semibold text-black">₱{Number(entry.value).toFixed(2)}</span>
          </div>
          {loMap[entry.dataKey] != null && hiMap[entry.dataKey] != null && (
            <div className="text-[12px] text-black pl-4">
              Range ₱{loMap[entry.dataKey].toFixed(2)}–₱{hiMap[entry.dataKey].toFixed(2)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ForecastPriceTrendChart({
  commodity,
  variety = null,
  chartData = [],
  varieties = [],
  colors,
  height = 300,
  forecastBoundaryDate = null,
  forecastBoundaryLabel = "Forecast starts",
  actualLabel = "Actual price",
  forecastLabel = "Forecast",
  forecastRangeLabel = "Forecast range",
  showLegend = true,
  isUnified: forceUnified = false,
}) {
  const { t } = useLanguage();
  const palette = colors ?? HW_GREEN_SHADES;
  const containerRef = useRef(null);
  const touchDistRef = useRef(null);
  const dataLen = (chartData || []).length;
  const [range, setRange] = useState({ start: 0, end: Math.max(0, dataLen - 1) });

  useEffect(() => {
    setRange({ start: 0, end: Math.max(0, dataLen - 1) });
  }, [dataLen]);

  // Determine whether unified actual-vs-forecast mode is active
  const isUnified = useMemo(() => {
    if (forceUnified) return true;
    if (!Array.isArray(chartData) || chartData.length === 0) return false;
    return chartData.some(
      (pt) => pt.actual !== undefined || pt.predicted !== undefined
    );
  }, [chartData, forceUnified]);

  // Determine the date key on points
  const dateKey = useMemo(() => {
    if (!Array.isArray(chartData) || chartData.length === 0) return "date";
    const sample = chartData[0];
    if (sample.date !== undefined) return "date";
    if (sample.d !== undefined) return "d";
    return "date";
  }, [chartData]);

  // Connect transition boundary seamlessly for visualization if not already connected
  const displayData = useMemo(() => {
    if (!isUnified || !Array.isArray(chartData) || chartData.length === 0) return chartData;
    const hasTransition = chartData.some((pt) => pt.isTransition);
    if (hasTransition) return chartData;

    let lastActualIdx = -1;
    let firstPredictedIdx = -1;
    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].actual != null) lastActualIdx = i;
      if (firstPredictedIdx === -1 && chartData[i].predicted != null) firstPredictedIdx = i;
    }
    if (lastActualIdx !== -1 && firstPredictedIdx !== -1 && lastActualIdx < firstPredictedIdx) {
      const copy = chartData.map((pt) => ({ ...pt }));
      const lastActual = copy[lastActualIdx];
      if (lastActual.predicted == null) {
        lastActual.predicted = lastActual.actual;
        if (lastActual.lower == null) lastActual.lower = lastActual.actual;
        if (lastActual.upper == null) lastActual.upper = lastActual.actual;
        lastActual.isTransition = true;
      }
      return copy;
    }
    return chartData;
  }, [chartData, isUnified]);

  // Determine boundary date between actual and forecast
  const boundaryDate = useMemo(() => {
    if (forecastBoundaryDate) return forecastBoundaryDate;
    if (!isUnified || !Array.isArray(displayData) || displayData.length === 0) return null;

    const hasForecast = displayData.some(
      (pt) => pt.predicted != null && !pt.isTransition
    );
    if (!hasForecast) return null;

    const transitionPt = displayData.find((pt) => pt.isTransition || pt.isBoundary);
    if (transitionPt) return transitionPt[dateKey];

    let lastActualDate = null;
    for (let i = 0; i < displayData.length; i++) {
      const pt = displayData[i];
      if (pt.actual != null) {
        lastActualDate = pt[dateKey];
      } else if (pt.predicted != null && lastActualDate) {
        return lastActualDate;
      }
    }
    return lastActualDate;
  }, [displayData, isUnified, forecastBoundaryDate, dateKey]);

  // Calculate dynamic domain
  const domain = useMemo(() => {
    const values = (displayData || [])
      .flatMap((p) => [
        p.actual,
        p.predicted,
        p.lower,
        p.upper,
        ...(Array.isArray(varieties) ? varieties.map((v) => p[v.variety || commodity]) : []),
      ])
      .map(Number)
      .filter((v) => Number.isFinite(v));
    if (values.length === 0) return ["auto", "auto"];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max((max - min) * 0.12, 4);
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];
  }, [displayData, varieties, commodity]);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 640);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const chartHeight = isMobile ? Math.min(height, 220) : height;

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const len = dataLen;
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
  }, [dataLen]);

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
          const len = dataLen;
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
  }, [dataLen]);

  return (
    <div
      ref={containerRef}
      style={{ touchAction: "pan-y" }}
      className="w-full flex flex-col justify-between"
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart
          data={displayData}
          margin={{
            top: isMobile ? 24 : 26,
            right: isMobile ? 8 : 16,
            bottom: 4,
            left: isMobile ? -6 : 0,
          }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--hw-neutral-100)" />
          <XAxis
            dataKey={dateKey}
            tick={{ fontSize: isMobile ? 10 : 11, fill: "#000000" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tickFormatter={(val) => formatChartDate(val) || val}
            minTickGap={16}
          />
          <YAxis
            domain={domain}
            tick={{ fontSize: isMobile ? 10 : 11, fill: "#000000" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `\u20B1${v}`}
            width={isMobile ? 44 : 55}
          />

          {isUnified ? (
            <>
              <Tooltip
                content={
                  <UnifiedFcTooltip
                    commodity={commodity}
                    variety={variety}
                    actualLabel={actualLabel}
                    forecastLabel={forecastLabel}
                    forecastRangeLabel={forecastRangeLabel}
                  />
                }
              />

              {/* Shaded Forecast Interval Area (between upper and lower) */}
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="#22c55e"
                fillOpacity={0.12}
                connectNulls={false}
                legendType="none"
                tooltipType="none"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="white"
                fillOpacity={1}
                connectNulls={false}
                legendType="none"
                tooltipType="none"
                isAnimationActive={false}
              />

              {/* Dashed lines for forecast interval upper and lower bounds */}
              <Line
                type="monotone"
                dataKey="upper"
                stroke="#86efac"
                strokeDasharray="3 3"
                strokeWidth={1}
                dot={false}
                connectNulls={false}
                legendType="none"
                tooltipType="none"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="lower"
                stroke="#86efac"
                strokeDasharray="3 3"
                strokeWidth={1}
                dot={false}
                connectNulls={false}
                legendType="none"
                tooltipType="none"
                isAnimationActive={false}
              />

              {/* Actual price line: Darker HarvestWise green */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#15803d"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: "white", stroke: "#15803d", strokeWidth: 2 }}
                activeDot={{ r: 5.5, strokeWidth: 0, fill: "#15803d" }}
                connectNulls={false}
                isAnimationActive={false}
                name={actualLabel}
              />

              {/* Forecast midpoint line: Lighter distinct green */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "white", stroke: "#22c55e", strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 0, fill: "#22c55e" }}
                connectNulls={false}
                isAnimationActive={false}
                name={forecastLabel}
              />

              {/* Forecast boundary vertical dashed divider */}
              {boundaryDate && (
                <ReferenceLine
                  x={boundaryDate}
                  stroke="#9ca3af"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: forecastBoundaryLabel,
                    position: "top",
                    fill: "#000000",
                    fontSize: 10,
                    fontWeight: 600,
                    offset: 6,
                  }}
                />
              )}
            </>
          ) : (
            <>
              {/* Legacy mode for AdminAnalyticsBasis.jsx */}
              <Tooltip content={<LegacyFcTooltip commodity={commodity} />} />
              {varieties.map(({ variety: vKey }, idx) => {
                const key = vKey || commodity;
                const color = palette[idx % palette.length];
                return (
                  <Fragment key={`fc-${key}`}>
                    <Area
                      dataKey={`${key}__hi`}
                      stroke="none"
                      fill={color}
                      fillOpacity={0.12}
                      legendType="none"
                      tooltipType="none"
                      connectNulls={false}
                    />
                    <Area
                      dataKey={`${key}__lo`}
                      stroke="none"
                      fill="white"
                      fillOpacity={1}
                      legendType="none"
                      tooltipType="none"
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey={key}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 4, fill: "white", stroke: color, strokeWidth: 2 }}
                      connectNulls={false}
                      activeDot={{ r: 6, strokeWidth: 0, fill: color }}
                      legendType="none"
                    />
                  </Fragment>
                );
              })}
            </>
          )}

          {dataLen > 0 && (
            <Brush
              dataKey={dateKey}
              startIndex={range.start}
              endIndex={range.end}
              onChange={(r) =>
                setRange({
                  start: r.startIndex ?? 0,
                  end: r.endIndex ?? Math.max(0, dataLen - 1),
                })
              }
              height={isMobile ? 22 : 28}
              fill="#f9fafb"
              stroke="#cbd5e1"
              travellerWidth={isMobile ? 16 : 10}
              tickFormatter={(val) => formatChartDate(val) || val}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      {showLegend && (
        isUnified ? (
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-2 sm:mt-3 text-[11px] sm:text-[12px] text-black">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center justify-center w-4 sm:w-5 h-0.5 bg-[#15803d]">
                <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full border-2 border-[#15803d] bg-white" />
              </span>
              <span className="font-medium text-black">{actualLabel}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center justify-center w-4 sm:w-5 h-0.5 bg-[#22c55e]">
                <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full border-2 border-[#22c55e] bg-white" />
              </span>
              <span className="font-medium text-black">{forecastLabel}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="inline-block w-3.5 sm:w-4 h-2 sm:h-2.5 bg-[#22c55e]/20 border border-[#86efac] border-dashed rounded-xs" />
              <span className="font-medium text-black">{forecastRangeLabel}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 mt-2 justify-center">
            {varieties.map(({ variety: vKey }, idx) => {
              const key = vKey || commodity;
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-6 h-0.5 rounded"
                    style={{ backgroundColor: palette[idx % palette.length] }}
                  />
                  <span className="text-[11px] text-black">{key}</span>
                </div>
              );
            })}
          </div>
        )
      )}

      <p className="text-center text-[10px] text-black mt-1.5">
        {t("farmer.factors.price.zoom_pan_help", {}, "Scroll to zoom · drag bar to pan")}
      </p>
    </div>
  );
}

export { ForecastPriceTrendChart };
