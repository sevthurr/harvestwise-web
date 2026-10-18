import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const PALETTE = [
  "#15803d", // Green
  "#0284c7", // Sky blue
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#0d9488", // Teal
  "#64748b"  // Slate
];

export function CostBreakdownPieChart({ expenses = [], height = 300 }) {
  if (!expenses || expenses.length === 0) return null;

  // Filter out expenses with 0 or invalid amounts
  const validExpenses = expenses
    .map((e, idx) => ({
      name: e.name || e.label || `Item ${idx + 1}`,
      value: parseFloat(e.amount ?? e.value) || 0,
      color: PALETTE[idx % PALETTE.length]
    }))
    .filter((e) => e.value > 0);

  const total = validExpenses.reduce((sum, e) => sum + e.value, 0);
  if (total === 0) return null;

  return (
    <div className="w-full flex flex-col items-center">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={validExpenses}
            cx="50%"
            cy="50%"
            innerRadius={0}
            outerRadius={85}
            paddingAngle={0}
            dataKey="value"
            labelLine={true}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {validExpenses.map((entry, index) => (
              <Cell key={`cost-cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val, name) => [
              `₱${Number(val).toLocaleString("en-PH", { minimumFractionDigits: 2 })} (${((val / total) * 100).toFixed(1)}%)`,
              name
            ]}
            contentStyle={{
              backgroundColor: "white",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              fontSize: "12px"
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend / Breakdown Items */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full mt-2">
        {validExpenses.map((item) => {
          const pct = ((item.value / total) * 100).toFixed(0);
          return (
            <div
              key={item.name}
              className="flex items-center justify-between gap-1.5 bg-[var(--hw-neutral-50)] px-2.5 py-1.5 rounded-xl border border-[var(--hw-neutral-100)] text-[11px]"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[var(--hw-neutral-700)] truncate font-medium">{item.name}</span>
              </div>
              <span className="font-bold text-[var(--hw-neutral-900)] flex-shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CostBreakdownPieChart;
