import { useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush
} from "recharts";
import { HW_GREEN_SHADES } from "./trendChartData";
function ArrivalTooltip({ active, payload, label, commodity, sourceType }) {
  if (!active || !payload?.length) return null;
  const dirInfo = payload[0]?.payload?._dirInfo ?? {};
  return <div className="bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-3 min-w-[180px]">
      <div className="text-[11px] font-semibold text-[var(--hw-neutral-800)] mb-2 pb-1.5 border-b border-[var(--hw-neutral-100)]">{label} 2026</div>
      <div className="text-[12px] text-[var(--hw-neutral-800)] mb-1.5">{commodity} · {sourceType} · kg</div>
      {payload.map((entry) => {
    if (entry.value == null) return null;
    const key = entry.dataKey;
    const dir = dirInfo[key]?.dir ?? null;
    return <div key={key} className="flex items-center justify-between gap-3 py-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.fill || HW_GREEN_SHADES[0] }} />
              <span className="text-[12px] text-[var(--hw-neutral-800)]">{key}</span>
              {dir === 1 && <span className="text-[11px] text-green-600">↑</span>}
              {dir === -1 && <span className="text-[11px] text-red-500">↓</span>}
              {dir === 0 && <span className="text-[13px] text-[var(--hw-neutral-800)]">—</span>}
            </div>
            <span className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">{Number(entry.value).toLocaleString("en-US")}</span>
          </div>;
  })}
    </div>;
}
function ArrivalVolumeTrendChart({
  commodity,
  chartData,
  varietyKeys,
  sourceType,
  colors,
  height = 300,
  xDataKey = "month"
}) {
  const palette = colors ?? HW_GREEN_SHADES;
  const containerRef = useRef(null);
  const touchDistRef = useRef(null);
  const [range, setRange] = useState({ start: 0, end: Math.max(0, chartData.length - 1) });
  useEffect(() => {
    setRange({ start: 0, end: Math.max(0, chartData.length - 1) });
  }, [chartData.length]);
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
          return { start: Math.min(prev.start + step, prev.end - 2), end: Math.max(prev.end - step, prev.start + 2) };
        }
        return { start: Math.max(0, prev.start - step), end: Math.min(len - 1, prev.end + step) };
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [chartData.length]);
  function handleTouchStart(e) {
    if (e.touches.length === 2) {
      touchDistRef.current = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
    }
  }
  function handleTouchMove(e) {
    if (e.touches.length !== 2 || touchDistRef.current === null) return;
    const newDist = Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY
    );
    const scale = newDist / touchDistRef.current;
    const len = chartData.length;
    setRange((prev) => {
      const center = (prev.start + prev.end) / 2;
      const newSpan = Math.max(2, Math.min(len - 1, Math.round((prev.end - prev.start) / scale)));
      const newStart = Math.max(0, Math.round(center - newSpan / 2));
      return { start: newStart, end: Math.min(len - 1, newStart + newSpan) };
    });
    touchDistRef.current = newDist;
  }
  return <div
    ref={containerRef}
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    style={{ touchAction: "pan-y" }}
  >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 10, right: 16, bottom: 4, left: 0 }} barCategoryGap="20%" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--hw-neutral-100)" vertical={false} />
          <XAxis
    dataKey={xDataKey}
    tick={{ fontSize: 11, fill: "#1f2937" }}
    tickLine={false}
    axisLine={false}
  />
          <YAxis
    tick={{ fontSize: 11, fill: "#1f2937" }}
    tickLine={false}
    axisLine={false}
    tickFormatter={(v) => v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(v)}
    width={45}
  />
          <Tooltip content={<ArrivalTooltip commodity={commodity} sourceType={sourceType} />} />
          {varietyKeys.map((key, idx) => <Bar
    key={key}
    dataKey={key}
    fill={palette[idx % palette.length]}
    name={key}
    radius={[2, 2, 0, 0]}
  />)}
          <Brush
    dataKey={xDataKey}
    startIndex={range.start}
    endIndex={range.end}
    onChange={(r) => setRange({ start: r.startIndex ?? 0, end: r.endIndex ?? Math.max(0, chartData.length - 1) })}
    height={28}
    fill="#f9fafb"
    stroke="#e5e7eb"
    travellerWidth={8}
  />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-4 mt-2 justify-center">
        {varietyKeys.map((key, idx) => <div key={key} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: palette[idx % palette.length] }} />
            <span className="text-[11px] text-[var(--hw-neutral-800)]">{key}</span>
          </div>)}
      </div>
      <p className="text-center text-[10px] text-[var(--hw-neutral-400)] mt-1.5">Scroll to zoom · drag bar to pan</p>
    </div>;
}
export {
  ArrivalVolumeTrendChart
};
