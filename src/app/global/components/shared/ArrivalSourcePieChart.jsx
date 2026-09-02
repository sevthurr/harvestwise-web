import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const DEFAULT_ARRIVAL_SOURCES = [
  { name: "Farm Source", value: 65, volumeKg: 65000, color: "#15803d" },
  { name: "Other Sources", value: 35, volumeKg: 35000, color: "#f59e0b" }
];

const EMPTY_ARRIVAL_SOURCES = [
  { name: "Farm Source", value: 0, volumeKg: 0, color: "#15803d" },
  { name: "Other Sources", value: 0, volumeKg: 0, color: "#f59e0b" }
];

function formatKgValue(kg) {
  if (kg == null || isNaN(kg)) return "";
  return `${Number(kg).toLocaleString()} kg`;
}

export function ArrivalSourcePieChart({ data, height = 300, showEmpty = false }) {
  const chartData = data && data.length > 0 && !showEmpty
    ? data
    : EMPTY_ARRIVAL_SOURCES;

  const total = chartData.reduce((acc, curr) => acc + (curr.value || 0), 0);
  const totalKg = chartData.reduce((acc, curr) => acc + (curr.volumeKg || 0), 0);
  const isEmpty = total === 0;

  const renderData = isEmpty
    ? [{ name: "No data", value: 1, volumeKg: 0, color: "#e2e8f0" }]
    : chartData.map((d, i) => ({
        ...d,
        color: d.color || DEFAULT_ARRIVAL_SOURCES[i % DEFAULT_ARRIVAL_SOURCES.length].color
      }));

  return (
    <div className="w-full flex flex-col items-center">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <Pie
            data={renderData}
            cx="50%"
            cy="50%"
            innerRadius={0}
            outerRadius={isEmpty ? 80 : 92}
            paddingAngle={0}
            dataKey="value"
            labelLine={!isEmpty}
            label={
              isEmpty
                ? false
                : ({ name, percent, payload }) => {
                    const kgText = payload.volumeKg != null ? ` (${formatKgValue(payload.volumeKg)})` : "";
                    return `${name} ${(percent * 100).toFixed(0)}%${kgText}`;
                  }
            }
          >
            {renderData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          {!isEmpty && (
            <Tooltip
              formatter={(val, name, entry) => {
                const kgText = entry.payload.volumeKg != null ? ` · ${formatKgValue(entry.payload.volumeKg)}` : "";
                return [`${val}% (${((val / total) * 100).toFixed(0)}%)${kgText}`, name];
              }}
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
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2 text-[11px] text-[var(--hw-neutral-800)]">
        {DEFAULT_ARRIVAL_SOURCES.map((s) => {
          const item = chartData.find((d) => d.name === s.name);
          const val = item ? item.value : 0;
          const kg = item?.volumeKg;
          return (
            <div key={s.name} className="flex items-center gap-1.5 bg-[var(--hw-neutral-50)] px-3 py-1.5 rounded-lg border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)]">
              <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: s.color }} />
              <span className="font-medium text-[var(--hw-neutral-700)]">{s.name}:</span>
              <span className="font-bold text-[var(--hw-neutral-900)]">
                {isEmpty ? "0%" : `${val}%`}
              </span>
              {kg != null && !isEmpty && (
                <span className="text-[var(--hw-neutral-500)] font-medium">
                  ({formatKgValue(kg)})
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ArrivalSourcePieChart;
