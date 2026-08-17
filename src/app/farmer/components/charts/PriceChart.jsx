import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from "recharts";
const PriceChart = ({
  data,
  showForecast = false,
  height = 300
}) => {
  return <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--hw-neutral-200)" />
        <XAxis
    dataKey="date"
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
  />
        
        {
    /* Confidence Band */
  }
        {showForecast && <Area
    type="monotone"
    dataKey="confidenceHigh"
    stroke="none"
    fill="#AAD576"
    fillOpacity={0.2}
  />}
        {showForecast && <Area
    type="monotone"
    dataKey="confidenceLow"
    stroke="none"
    fill="#AAD576"
    fillOpacity={0.2}
  />}
        
        {
    /* Actual Price Line */
  }
        <Line
    type="monotone"
    dataKey="price"
    stroke="#245501"
    strokeWidth={3}
    dot={{ fill: "#245501", r: 4 }}
    activeDot={{ r: 6 }}
    name="Current Price"
  />
        
        {
    /* Forecast Line */
  }
        {showForecast && <Line
    type="monotone"
    dataKey="forecast"
    stroke="#73A942"
    strokeWidth={3}
    strokeDasharray="5 5"
    dot={{ fill: "#73A942", r: 4 }}
    activeDot={{ r: 6 }}
    name="Forecast"
  />}
      </ComposedChart>
    </ResponsiveContainer>;
};
export {
  PriceChart
};
