import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  ReferenceLine
} from "recharts";
import {
  getArrivalClassification,
  CLASSIFICATION_HEX,
  CLASSIFICATION_TEXT_CLASS
} from "../../../dftc/pages/dftcClassificationColors";
import { useLanguage } from "../../contexts/LanguageContext";

function ArrivalTooltip({ active, payload, label, commodity, sourceType, quartileThresholds, allValues }) {
  if (!active || !payload?.length) return null;
  const dirInfo = payload[0]?.payload?._dirInfo ?? {};
  return (
    <div className="bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-3 min-w-[190px]">
      <div className="text-[11px] font-semibold text-[var(--hw-neutral-800)] mb-2 pb-1.5 border-b border-[var(--hw-neutral-100)]">{label}</div>
      <div className="text-[12px] text-[var(--hw-neutral-800)] mb-1.5">{commodity} · {sourceType} · kg</div>
      {payload.map((entry) => {
        if (entry.value == null) return null;
        const key = entry.dataKey;
        const dir = dirInfo[key]?.dir ?? null;
        const val = Number(entry.value);
        const cls = getArrivalClassification(val, quartileThresholds, allValues);
        const color = CLASSIFICATION_HEX[cls] || "#16a34a";
        const textCls = CLASSIFICATION_TEXT_CLASS[cls] || "text-emerald-600";
        return (
          <div key={key} className="space-y-1 py-0.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[12px] text-[var(--hw-neutral-800)]">{key}</span>
                {dir === 1 && <span className="text-[11px] text-green-600">↑</span>}
                {dir === -1 && <span className="text-[11px] text-red-500">↓</span>}
                {dir === 0 && <span className="text-[13px] text-[var(--hw-neutral-800)]">—</span>}
              </div>
              <span className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">{Number(entry.value).toLocaleString("en-US")}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pl-4">
              <span className="text-[var(--hw-neutral-500)]">Classification:</span>
              <span className={`font-bold ${textCls}`}>{cls}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) || parsed.getFullYear() < 1900 ? null : parsed;
}

function ArrivalVolumeTrendChart({
  commodity,
  chartData,
  varietyKeys,
  sourceType,
  height = 280,
  xDataKey = "month",
  referenceValue = null,
  quartileThresholds = null,
  cropStage = null,
  plantingDate = null,
  expectedHarvestDate = null,
  plantingWindowStart = null,
  plantingWindowEnd = null,
}) {
  const { t } = useLanguage();
  const containerRef = useRef(null);
  const touchDistRef = useRef(null);

  const defaultRange = useMemo(() => {
    const len = chartData?.length || 0;
    if (len === 0) return { start: 0, end: 0 };

    // For datasets up to 30 records (or when all records fit comfortably),
    // show the full date coverage by default so no data is cut off or hidden behind the brush.
    if (len <= 30) {
      return { start: 0, end: len - 1 };
    }

    const rawStart = plantingDate || plantingWindowStart;
    const rawEnd = expectedHarvestDate || plantingWindowEnd || rawStart;

    const dStart = parseDateOnly(rawStart);
    let dEnd = parseDateOnly(rawEnd);
    if (dStart && dEnd && dEnd < dStart) {
      dEnd = new Date(dStart.getTime());
    }

    const recordDates = chartData.map((item) =>
      parseDateOnly(item[xDataKey] || item.month || item.date || item.arrival_date)
    );

    if (dStart || dEnd) {
      const planStart = dStart || dEnd;
      const planEnd = dEnd || dStart;
      const planYear = planStart.getFullYear();
      const yearSpan = planEnd.getFullYear() - planStart.getFullYear();

      const availableYears = Array.from(
        new Set(recordDates.filter(Boolean).map((d) => d.getFullYear()))
      ).sort((a, b) => b - a);

      let targetYear = planYear;
      if (!availableYears.includes(planYear) && availableYears.length > 0) {
        const priorYears = availableYears.filter((y) => y <= planYear);
        targetYear = priorYears.length > 0 ? priorYears[0] : availableYears[0];
      }

      const projStart = new Date(targetYear, planStart.getMonth(), planStart.getDate());
      const projEnd = new Date(targetYear + yearSpan, planEnd.getMonth(), planEnd.getDate(), 23, 59, 59);

      const matchingIndices = [];
      recordDates.forEach((recDate, idx) => {
        if (!recDate) return;
        if (recDate >= projStart && recDate <= projEnd) {
          matchingIndices.push(idx);
        }
      });

      if (matchingIndices.length > 0) {
        const minIdx = matchingIndices[0];
        const maxIdx = matchingIndices[matchingIndices.length - 1];
        const windowSpan = maxIdx - minIdx + 1;
        const buffer = Math.max(3, Math.round(windowSpan * 0.35));
        const targetSpan = Math.max(windowSpan + buffer * 2, Math.min(20, len));
        const center = (minIdx + maxIdx) / 2;

        let start = Math.max(0, Math.floor(center - targetSpan / 2));
        let end = Math.min(len - 1, start + targetSpan - 1);
        if (end === len - 1) {
          start = Math.max(0, end - targetSpan + 1);
        }
        if (start === 0) {
          end = Math.min(len - 1, start + targetSpan - 1);
        }
        start = Math.min(start, Math.max(0, minIdx - 1));
        end = Math.max(end, Math.min(len - 1, maxIdx + 1));
        return { start, end };
      }
    }

    const validDates = recordDates.filter(Boolean);
    if (validDates.length > 0) {
      const latestRec = validDates[validDates.length - 1];
      const ninetyDaysBefore = new Date(latestRec.getTime() - 90 * 24 * 60 * 60 * 1000);
      const startIdx = recordDates.findIndex((d) => d && d >= ninetyDaysBefore);
      if (startIdx !== -1 && startIdx < len) {
        return { start: startIdx, end: len - 1 };
      }
    }

    if (len > 20) {
      return { start: Math.max(0, len - 20), end: len - 1 };
    }
    return { start: 0, end: len - 1 };
  }, [
    chartData,
    xDataKey,
    plantingDate,
    expectedHarvestDate,
    plantingWindowStart,
    plantingWindowEnd,
    cropStage,
  ]);

  const [range, setRange] = useState(defaultRange);

  useEffect(() => {
    setRange(defaultRange);
  }, [defaultRange]);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 640);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const chartHeight = isMobile ? Math.min(height, 220) : height;

  const allValues = useMemo(() => {
    const vals = [];
    (chartData || []).forEach((row) => {
      (varietyKeys || []).forEach((key) => {
        const v = Number(row[key]);
        if (!isNaN(v) && v > 0) vals.push(v);
      });
    });
    return vals;
  }, [chartData, varietyKeys]);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const len = chartData.length;
    function onWheel(e) {
      e.preventDefault();
      setRange((prev) => {
        if (len < 2) return prev;
        const r = prev.end - prev.start;
        const step = Math.max(1, Math.round(r * 0.15));
        if (e.deltaY < 0) {
          return { start: Math.min(prev.start + step, prev.end - 1), end: Math.max(prev.end - step, prev.start + 1) };
        }
        return { start: Math.max(0, prev.start - step), end: Math.min(len - 1, prev.end + step) };
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
            const newSpan = Math.max(1, Math.min(len - 1, Math.round(currentSpan / scale)));
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
    <div
      ref={containerRef}
      style={{ touchAction: "pan-y" }}
      className="w-full space-y-1"
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={chartData} margin={{ top: 10, right: isMobile ? 8 : 16, bottom: 4, left: isMobile ? -6 : 0 }} barCategoryGap="20%" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--hw-neutral-100)" vertical={false} />
          <XAxis
            dataKey={xDataKey}
            tick={{ fontSize: isMobile ? 10 : 11, fill: "#000000" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: isMobile ? 10 : 11, fill: "#000000" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(v))}
            width={isMobile ? 40 : 45}
          />
          <Tooltip content={<ArrivalTooltip commodity={commodity} sourceType={sourceType} quartileThresholds={quartileThresholds} allValues={allValues} />} />
          {Number.isFinite(referenceValue) && (
            <ReferenceLine
              y={referenceValue}
              stroke="#64748b"
              strokeDasharray="4 4"
            />
          )}
          {varietyKeys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              name={key}
              radius={[3, 3, 0, 0]}
            >
              {chartData.map((entry, idx) => {
                const val = Number(entry[key]);
                const cls = getArrivalClassification(val, quartileThresholds, allValues);
                const color = CLASSIFICATION_HEX[cls] || "#16a34a";
                return <Cell key={`cell-${key}-${idx}`} fill={color} />;
              })}
            </Bar>
          ))}
          <Brush
            dataKey={xDataKey}
            startIndex={range.start}
            endIndex={range.end}
            onChange={(r) => setRange({ start: r.startIndex ?? 0, end: r.endIndex ?? Math.max(0, chartData.length - 1) })}
            height={isMobile ? 22 : 28}
            fill="#f9fafb"
            stroke="#cbd5e1"
            travellerWidth={isMobile ? 16 : 10}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 justify-center">
        <span className="text-[11px] font-semibold text-black">
          {t("farmer.factors.arrival.classification_label", {}, "Classification")}:
        </span>
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
        {t("farmer.factors.price.zoom_pan_help", {}, "Scroll to zoom · drag bar to pan")}
      </p>
    </div>
  );
}

export {
  ArrivalVolumeTrendChart
};

