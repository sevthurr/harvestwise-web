import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const DEFAULT_SOURCES = [
  { name: "Davao City", value: 45, color: "#15803d" },
  { name: "Davao Del Sur", value: 30, color: "#0d9488" },
  { name: "Bukidnon", value: 25, color: "#3b82f6" }
];

const EMPTY_SOURCES = [
  { name: "Davao City", value: 0, color: "#15803d" },
  { name: "Davao Del Sur", value: 0, color: "#0d9488" },
  { name: "Bukidnon", value: 0, color: "#3b82f6" }
];

export function ProductionSourcePieChart({ data, height = 300, outerRadius, showEmpty = false }) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 640);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const chartData = data && data.length > 0 && !showEmpty
    ? data
    : EMPTY_SOURCES;

  const total = chartData.reduce((acc, curr) => acc + (curr.value || 0), 0);
  const isEmpty = total === 0;

  // When total is 0, display an empty placeholder donut segment
  const renderData = isEmpty
    ? [{ name: "No data", value: 1, color: "#e2e8f0" }]
    : chartData.map((d, i) => ({
        ...d,
        color: d.color || DEFAULT_SOURCES[i % DEFAULT_SOURCES.length].color
      }));

  // Dynamically compute safe radius based on container height and viewport width so it fits cleanly
  const maxSafeRadius = Math.max(50, Math.floor((height - 70) / 2));
  const effectiveRadius = outerRadius ?? (isMobile ? Math.min(maxSafeRadius, 72) : Math.min(maxSafeRadius, 105));
  const emptyRadius = Math.max(40, effectiveRadius - 10);

  return (
    <div className="w-full flex flex-col items-center">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart margin={{ top: 8, right: isMobile ? 12 : 30, bottom: 8, left: isMobile ? 12 : 30 }}>
          <Pie
            data={renderData}
            cx="50%"
            cy="50%"
            innerRadius={0}
            outerRadius={isEmpty ? emptyRadius : effectiveRadius}
            paddingAngle={0}
            dataKey="value"
            labelLine={!isEmpty}
            label={
              isEmpty
                ? false
                : ({ percent }) => `${(percent * 100).toFixed(0)}%`
            }
          >
            {renderData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          {!isEmpty && (
            <Tooltip
              formatter={(val, name) => [`${val}% (${((val / total) * 100).toFixed(0)}%)`, name]}
              contentStyle={{
                backgroundColor: "white",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
              }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {/* Legend / Breakdown List */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-[11px] text-black">
        {(isEmpty ? DEFAULT_SOURCES : chartData).map((s, index) => {
          const item = chartData.find((d) => d.name === s.name);
          const val = item ? item.value : 0;
          return (
            <div key={s.name} className="flex items-center gap-1.5 bg-[var(--hw-neutral-50)] px-2.5 py-1 rounded-lg border border-[var(--hw-neutral-200)]">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: s.color || DEFAULT_SOURCES[index % DEFAULT_SOURCES.length].color }} />
              <span className="font-medium text-black">{s.name}</span>
              <span className="font-bold text-black">
                {isEmpty ? "0%" : `${val}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProductionSourcePieChart;
