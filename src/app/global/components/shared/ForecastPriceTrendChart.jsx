import { Fragment, useEffect, useRef, useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush
} from "recharts";
import { HW_GREEN_SHADES } from "./trendChartData";
function FcTooltip({ active, payload, label, commodity }) {
  if (!active || !payload?.length) return null;
  const midEntries = payload.filter((p) => !p.dataKey?.endsWith("__lo") && !p.dataKey?.endsWith("__hi") && p.value != null);
  const loMap = {};
  const hiMap = {};
  payload.forEach((p) => {
    if (p.dataKey?.endsWith("__lo") && p.value != null) loMap[p.dataKey.replace("__lo", "")] = p.value;
    if (p.dataKey?.endsWith("__hi") && p.value != null) hiMap[p.dataKey.replace("__hi", "")] = p.value;
  });
  return <div className="bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-3 min-w-[210px]">
      <div className="text-[11px] font-semibold text-[var(--hw-neutral-800)] mb-2 pb-1.5 border-b border-[var(--hw-neutral-100)]">{label}</div>
      <div className="text-[12px] text-[var(--hw-neutral-800)] mb-1.5">{commodity} · Forecast · ₱/kg</div>
      {midEntries.map((entry) => <div key={entry.dataKey} className="py-0.5 space-y-0.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.stroke || HW_GREEN_SHADES[0] }} />
              <span className="text-[12px] text-[var(--hw-neutral-800)]">{entry.dataKey}</span>
            </div>
            <span className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">₱{Number(entry.value).toFixed(2)}</span>
          </div>
          {loMap[entry.dataKey] != null && hiMap[entry.dataKey] != null && <div className="text-[12px] text-[var(--hw-neutral-800)] pl-4">
              Range ₱{loMap[entry.dataKey].toFixed(2)}–₱{hiMap[entry.dataKey].toFixed(2)}
            </div>}
        </div>)}
    </div>;
}
function ForecastPriceTrendChart({
  commodity,
  chartData,
  varieties,
  colors,
  height = 300
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
        <ComposedChart data={chartData} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--hw-neutral-100)" />
          <XAxis
    dataKey="date"
    tick={{ fontSize: 11, fill: "#1f2937" }}
    tickLine={false}
    axisLine={false}
    interval="preserveStartEnd"
  />
          <YAxis
    tick={{ fontSize: 11, fill: "#1f2937" }}
    tickLine={false}
    axisLine={false}
    tickFormatter={(v) => `\u20B1${v}`}
    width={55}
  />
          <Tooltip content={<FcTooltip commodity={commodity} />} />
          {varieties.map(({ variety }, idx) => {
    const key = variety || commodity;
    const color = palette[idx % palette.length];
    return <Fragment key={`fc-${key}`}>
                <Area dataKey={`${key}__hi`} stroke="none" fill={color} fillOpacity={0.12} legendType="none" tooltipType="none" connectNulls={false} />
                <Area dataKey={`${key}__lo`} stroke="none" fill="white" fillOpacity={1} legendType="none" tooltipType="none" connectNulls={false} />
                <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={{ r: 4, fill: "white", stroke: color, strokeWidth: 2 }} connectNulls={false} activeDot={{ r: 6, strokeWidth: 0, fill: color }} legendType="none" />
              </Fragment>;
  })}
          <Brush
    dataKey="date"
    startIndex={range.start}
    endIndex={range.end}
    onChange={(r) => setRange({ start: r.startIndex ?? 0, end: r.endIndex ?? Math.max(0, chartData.length - 1) })}
    height={28}
    fill="#f9fafb"
    stroke="#e5e7eb"
    travellerWidth={8}
  />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-4 mt-2 justify-center">
        {varieties.map(({ variety }, idx) => {
    const key = variety || commodity;
    return <div key={key} className="flex items-center gap-1.5">
              <span className="inline-block w-6 h-0.5 rounded" style={{ backgroundColor: palette[idx % palette.length] }} />
              <span className="text-[11px] text-[var(--hw-neutral-800)]">{key}</span>
            </div>;
  })}
      </div>
      <p className="text-center text-[10px] text-[var(--hw-neutral-400)] mt-1.5">Scroll to zoom · drag bar to pan</p>
    </div>;
}
export {
  ForecastPriceTrendChart
};
