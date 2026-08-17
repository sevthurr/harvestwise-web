import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
const BRAND_SHADES = [
  "#4A8F27",
  // medium green
  "#2D6A10",
  // dark green
  "#73A942",
  // medium-light green
  "#143601",
  // darkest brand green (Onion – top commodity)
  "#5B9B35"
  // warm mid green
];
const VolumeChart = ({
  data,
  height = 300
}) => {
  return <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--hw-neutral-200)" />
        <XAxis
    dataKey="category"
    tick={{ fill: "var(--hw-neutral-500)", fontSize: 12 }}
    stroke="var(--hw-neutral-300)"
  />
        <YAxis
    tick={{ fill: "var(--hw-neutral-500)", fontSize: 12 }}
    stroke="var(--hw-neutral-300)"
  />
        <Tooltip
    contentStyle={{
      backgroundColor: "white",
      border: "1px solid var(--hw-neutral-200)",
      borderRadius: "8px",
      fontSize: "14px"
    }}
    cursor={{ fill: "rgba(20, 54, 1, 0.07)" }}
  />
        <Bar
    dataKey="volume"
    radius={[8, 8, 0, 0]}
    name="Volume (tons)"
  >
          {data.map((_, index) => <Cell
    key={`cell-${index}`}
    fill={BRAND_SHADES[index % BRAND_SHADES.length]}
  />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>;
};
export {
  VolumeChart
};
