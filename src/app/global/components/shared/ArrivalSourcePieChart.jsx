import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const DEFAULT_ARRIVAL_SOURCES = [
  { name: "Farm Source", value: 65, color: "#15803d" },
  { name: "Other Sources", value: 35, color: "#f59e0b" }
];

const EMPTY_ARRIVAL_SOURCES = [
  { name: "Farm Source", value: 0, color: "#15803d" },
  { name: "Other Sources", value: 0, color: "#f59e0b" }
];

export function ArrivalSourcePieChart({ data, height = 380, showEmpty = false }) {
  const chartData = data && data.length > 0 && !showEmpty
    ? data
    : EMPTY_ARRIVAL_SOURCES;

  const total = chartData.reduce((acc, curr) => acc + (curr.value || 0), 0);
  const isEmpty = total === 0;

  const renderData = isEmpty
    ? [{ name: "No data", value: 1, color: "#e2e8f0" }]
    : chartData.map((d, i) => ({
        ...d,
        color: d.color || DEFAULT_ARRIVAL_SOURCES[i % DEFAULT_ARRIVAL_SOURCES.length].color
      }));

  return (
    <div className="w-full flex flex-col items-center">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={renderData}
            cx="50%"
            cy="50%"
            innerRadius={0}
            outerRadius={isEmpty ? 130 : 145}
            paddingAngle={0}
            dataKey="value"
            labelLine={!isEmpty}
            label={isEmpty ? false : ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                fontSize: "12px"
              }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {/* Legend / Breakdown List */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-1 text-[11px] text-[var(--hw-neutral-800)]">
        {DEFAULT_ARRIVAL_SOURCES.map((s) => {
          const item = chartData.find((d) => d.name === s.name);
          const val = item ? item.value : 0;
          return (
            <div key={s.name} className="flex items-center gap-1.5 bg-[var(--hw-neutral-50)] px-2.5 py-1 rounded-lg border border-[var(--hw-neutral-100)]">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
              <span className="font-medium text-[var(--hw-neutral-700)]">{s.name}</span>
              <span className="font-bold text-[var(--hw-neutral-900)]">
                {isEmpty ? "0%" : `${val}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ArrivalSourcePieChart;
