import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Package,
  CloudRain,
  CalendarDays,
  Coins,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { getTotalCost, formatPeso } from "../../../farmer/components/recommend/types";
const Section = ({
  title,
  defaultOpen = true,
  children
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      <button
    onClick={() => setOpen((v) => !v)}
    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
        <p className="text-xs font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wide text-left">{title}</p>
        {open ? <ChevronUp className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-[var(--hw-neutral-100)]">{children}</div>}
    </div>;
};
const RISK_FACTORS = [
  {
    icon: <TrendingUp className="w-4 h-4" />,
    label: "Price Outlook Risk",
    status: "Favorable",
    value: "Bangkerohan: \u20B185/kg \xB7 Rising pattern",
    explanation: "Bangkerohan Price Behavior shows an upward pattern. Current prices are above your break-even price. This trend may continue based on recent price records.",
    accent: "emerald"
  },
  {
    icon: <Package className="w-4 h-4" />,
    label: "Supply Pressure Risk",
    status: "Moderate to High",
    value: "DFTC Arrival Pressure: Moderate \xB7 Seasonal: High",
    explanation: "DFTC arrivals are above their recent level. Seasonal Production Pressure is elevated. Supply pressure may increase near your expected harvest period, which could put downward pressure on prices.",
    accent: "amber"
  },
  {
    icon: <TrendingDown className="w-4 h-4" />,
    label: "Seasonal Production Pressure",
    status: "Elevated",
    value: "Peak season approaching in Davao Region",
    explanation: "More farms in the Davao Region may begin harvesting during your planned harvest window. This may increase market supply and add to Supply Pressure.",
    accent: "amber"
  },
  {
    icon: <CloudRain className="w-4 h-4" />,
    label: "Weather Risk",
    status: "Moderate",
    value: "Heavy rain may affect deliveries",
    explanation: "Heavy rain in Davao City may affect field activity and farm-to-market transport. This appears as risk context and is not a direct input to the price forecast.",
    accent: "amber"
  },
  {
    icon: <CalendarDays className="w-4 h-4" />,
    label: "Market Calendar Risk",
    status: "Neutral",
    value: "Payday period near harvest",
    explanation: "A payday period near your expected harvest may support market activity. The effect remains uncertain and does not guarantee higher prices.",
    accent: "neutral"
  },
  {
    icon: <Coins className="w-4 h-4" />,
    label: "Profitability Risk",
    status: "Possible with caution",
    value: "Break-even: \u20B142/kg",
    explanation: "Current Bangkerohan prices are above your break-even price, but the margin may narrow if Supply Pressure increases near your harvest period.",
    accent: "neutral"
  }
];
const accentColor = {
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  red: "text-red-500",
  neutral: "text-[var(--hw-neutral-600)]"
};
const accentBg = {
  emerald: "bg-emerald-50",
  amber: "bg-amber-50",
  red: "bg-red-50",
  neutral: "bg-[var(--hw-neutral-100)]"
};
const AnalyticsRiskFactors = () => {
  const [expandedIdx, setExpandedIdx] = useState(null);
  return <Section title="Risk-factor breakdown — Supply Pressure and Price Outlook">
      <div className="pt-3 space-y-2">
        {RISK_FACTORS.map((f, i) => <div key={f.label} className="rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden">
            <button
    onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
  >
              <div className={`flex-shrink-0 p-1.5 rounded-lg ${accentBg[f.accent]}`}>
                <span className={accentColor[f.accent]}>{f.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--hw-neutral-500)]">{f.label}</p>
                <p className={`text-sm font-semibold ${accentColor[f.accent]}`}>{f.status}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-[var(--hw-neutral-400)] hidden sm:block">{f.value}</span>
                {expandedIdx === i ? <ChevronUp className="w-4 h-4 text-[var(--hw-neutral-400)]" /> : <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-400)]" />}
              </div>
            </button>
            {expandedIdx === i && <div className="px-3 pb-3 border-t border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
                <p className="text-xs text-[var(--hw-neutral-400)] mt-1 mb-1">{f.value}</p>
                <p className="text-sm text-[var(--hw-neutral-600)] leading-relaxed">{f.explanation}</p>
              </div>}
          </div>)}
        <div className="mt-3 rounded-xl bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] px-3 py-2.5 space-y-1">
          <p className="text-xs font-semibold text-[var(--hw-neutral-600)]">Moderate confidence</p>
          <p className="text-xs text-[var(--hw-neutral-500)] leading-relaxed">
            DFTC Arrival Volume was available. This result uses Bangkerohan Price Behavior, DFTC Arrival Pressure, and Seasonal Production Pressure.
          </p>
          <p className="text-xs text-[var(--hw-neutral-400)] italic">
            Prototype weighting — pending stakeholder validation.
          </p>
        </div>
      </div>
    </Section>;
};
const FORECAST_CHART_DATA = [
  { date: "Jun 24", actual: 85 },
  { date: "Jun 28", actual: 84, forecast: 85, high: 90, low: 80 },
  { date: "Jul 5", forecast: 87, high: 93, low: 81 },
  { date: "Jul 12", forecast: 88, high: 95, low: 81 },
  { date: "Jul 19", forecast: 86, high: 93, low: 79 },
  // harvest window
  { date: "Jul 26", forecast: 84, high: 91, low: 77 }
];
const tooltipStyle = {
  backgroundColor: "white",
  border: "1px solid var(--hw-neutral-200)",
  borderRadius: 8,
  fontSize: 12
};
const AnalyticsHarvestForecast = () => {
  const [period, setPeriod] = useState("28d");
  return <Section title="Price forecast and range">
      <div className="pt-3 space-y-3">
        {
    /* Metrics */
  }
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
    { label: "Current price", value: "\u20B185/kg", accent: false },
    { label: "Forecasted price", value: "\u20B184\u2013\u20B188/kg", accent: true },
    { label: "Forecast range", value: "\u20B177\u2013\u20B195/kg", accent: false },
    { label: "Harvest outlook", value: "Stable\u2013Rising", accent: false },
    { label: "Market source", value: "Bangkerohan", accent: false },
    { label: "Forecast updated", value: "Jun 24, 2026", accent: false }
  ].map((m) => <div key={m.label} className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2">
              <p className="text-xs text-[var(--hw-neutral-400)]">{m.label}</p>
              <p className={`text-sm font-semibold mt-0.5 ${m.accent ? "text-emerald-700" : "text-[var(--hw-neutral-800)]"}`}>{m.value}</p>
            </div>)}
        </div>

        {
    /* Period selector */
  }
        <div className="flex gap-2">
          {["7d", "14d", "28d"].map((p) => <button
    key={p}
    onClick={() => setPeriod(p)}
    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${period === p ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
              {p === "7d" ? "7 days" : p === "14d" ? "14 days" : "28 days"}
            </button>)}
        </div>

        {
    /* Chart */
  }
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={FORECAST_CHART_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hw-neutral-200)" />
              <XAxis dataKey="date" tick={{ fill: "var(--hw-neutral-500)", fontSize: 10 }} stroke="var(--hw-neutral-300)" />
              <YAxis tick={{ fill: "var(--hw-neutral-500)", fontSize: 10 }} stroke="var(--hw-neutral-300)" domain={[70, 100]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [`\u20B1${v}/kg`, name === "high" ? "Range high" : name === "low" ? "Range low" : name === "forecast" ? "Forecast" : "Actual"]} />
              <Area type="monotone" dataKey="high" stroke="none" fill="#AAD576" fillOpacity={0.2} />
              <Area type="monotone" dataKey="low" stroke="none" fill="#ffffff" fillOpacity={1} />
              <Line type="monotone" dataKey="actual" stroke="#245501" strokeWidth={2} dot={{ r: 3, fill: "#245501" }} name="actual" />
              <Line type="monotone" dataKey="forecast" stroke="#73A942" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: "#73A942" }} name="forecast" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {
    /* Harvest window label */
  }
        <div className="flex items-center gap-2 text-xs text-[var(--hw-neutral-500)]">
          <div className="w-3 h-px border-t-2 border-dashed border-[var(--hw-green-600)]" />
          Forecast · <div className="w-3 h-3 rounded bg-[var(--hw-green-400)] opacity-40" /> Uncertainty range
        </div>

        <p className="text-xs text-[var(--hw-neutral-400)] italic">
          Forecasts are estimates and may change as new data becomes available.
        </p>
      </div>
    </Section>;
};
const AnalyticsProfitability = ({ data }) => {
  const totalCost = getTotalCost(data);
  const qty = typeof data.harvestQuantity === "number" && data.harvestQuantity > 0 ? data.harvestQuantity : 600;
  const cost = totalCost > 0 ? totalCost : 25200;
  const breakEven = Math.ceil(cost / qty);
  const forecastLow = 46;
  const forecastHigh = 54;
  const revLow = forecastLow * qty;
  const revHigh = forecastHigh * qty;
  const profitLow = revLow - cost;
  const profitHigh = revHigh - cost;
  const marginLow = (profitLow / revLow * 100).toFixed(0);
  const marginHigh = (profitHigh / revHigh * 100).toFixed(0);
  const rows = [
    { label: "Total estimated production cost", value: formatPeso(cost) },
    { label: "Expected harvest quantity", value: `${qty} kg` },
    { label: "Break-even price per kg", value: `${formatPeso(breakEven)}/kg`, highlight: true },
    { label: "Forecasted price range", value: `${formatPeso(forecastLow)}\u2013${formatPeso(forecastHigh)}/kg` },
    { label: "Estimated revenue range", value: `${formatPeso(revLow)}\u2013${formatPeso(revHigh)}` },
    { label: "Estimated profit range", value: `${profitLow >= 0 ? "+" : ""}${formatPeso(profitLow)} to +${formatPeso(profitHigh)}` },
    { label: "Estimated profit margin", value: `${marginLow}%\u2013${marginHigh}%` }
  ];
  return <Section title="Break-even and profitability">
      <div className="pt-3 space-y-3">
        <div className="rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden divide-y divide-[var(--hw-neutral-100)]">
          {rows.map((r) => <div key={r.label} className={`flex justify-between gap-4 px-3 py-2.5 flex-wrap ${r.highlight ? "bg-[var(--hw-green-50)]" : ""}`}>
              <span className={`text-xs ${r.highlight ? "font-semibold text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-500)]"}`}>{r.label}</span>
              <span className={`text-xs font-semibold ${r.highlight ? "text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-800)]"}`}>{r.value}</span>
            </div>)}
        </div>
        <p className="text-xs text-[var(--hw-neutral-400)] italic">All results are estimates based on sample data and do not guarantee actual income.</p>
      </div>
    </Section>;
};
const AnalyticsHowItWorks = () => <Section title="How HarvestWise reached this result" defaultOpen={false}>
    <div className="pt-3 space-y-3 text-sm text-[var(--hw-neutral-600)] leading-relaxed">
      <p><strong className="text-[var(--hw-neutral-800)]">Price forecast.</strong> Current market prices for Kamatis are above your break-even price of ₱42/kg. The short-term price outlook is stable to rising, which supports a cautious positive view.</p>
      <p><strong className="text-[var(--hw-neutral-800)]">Supply and seasonality.</strong> More farms in the area are expected to harvest during your planned harvest window. Increasing supply near the harvest period may reduce market prices and narrow your profit margin.</p>
      <p><strong className="text-[var(--hw-neutral-800)]">Weather conditions.</strong> Heavy rain is expected during the growing period. This may affect field activity and market deliveries, which could create short-term price fluctuations.</p>
      <p><strong className="text-[var(--hw-neutral-800)]">Market calendar.</strong> An upcoming payday period near your expected harvest may temporarily support buyer demand at the market.</p>
      <p><strong className="text-[var(--hw-neutral-800)]">Profitability.</strong> Based on your production cost and the forecasted price range, planting may be profitable but the margin is sensitive to supply changes. Planting a smaller area reduces exposure to price risk.</p>
      <p className="text-xs text-[var(--hw-neutral-400)] italic">This summary is generated from sample market and weather data and does not reflect guaranteed real-world conditions.</p>
    </div>
  </Section>;
const AnalyticsAssumptions = ({ data }) => {
  const totalCost = getTotalCost(data);
  return <Section title="Assumptions and data information" defaultOpen={false}>
      <div className="pt-3 space-y-4">
        <div>
          <p className="text-xs font-semibold text-[var(--hw-neutral-600)] mb-2">Your inputs</p>
          <div className="rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden divide-y divide-[var(--hw-neutral-100)]">
            {[
    { label: "Planned planting date", value: data.plantingDate || "Not entered" },
    { label: "Expected harvest date", value: data.harvestDate || "Not entered" },
    { label: "Farm area", value: data.farmArea !== "" ? `${data.farmArea} ${data.farmAreaUnit === "sqm" ? "sq m" : "ha"}` : "Not entered" },
    { label: "Expected harvest", value: data.harvestQuantity !== "" ? `${data.harvestQuantity} kg` : "Not entered" },
    { label: "Entered production cost", value: totalCost > 0 ? formatPeso(totalCost) : "Not entered" }
  ].map((r) => <div key={r.label} className="flex justify-between gap-4 px-3 py-2.5 flex-wrap">
                <span className="text-xs text-[var(--hw-neutral-500)]">{r.label}</span>
                <span className="text-xs font-medium text-[var(--hw-neutral-700)]">{r.value}</span>
              </div>)}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-[var(--hw-neutral-600)] mb-2">Data sources and dates</p>
          <div className="rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden divide-y divide-[var(--hw-neutral-100)]">
            {[
    { label: "Market data source", value: "Bangkerohan Public Market \xB7 DA-AMAD" },
    { label: "Market data date", value: "Jun 24, 2026 at 7:30 AM" },
    { label: "Forecast generated", value: "Jun 24, 2026 at 6:00 AM" },
    { label: "Weather update", value: "Jun 24, 2026 at 5:00 AM \xB7 PAGASA" },
    { label: "Calendar update", value: "Jun 24, 2026 \xB7 DA-AMAD" }
  ].map((r) => <div key={r.label} className="flex justify-between gap-4 px-3 py-2.5 flex-wrap">
                <span className="text-xs text-[var(--hw-neutral-500)]">{r.label}</span>
                <span className="text-xs font-medium text-[var(--hw-neutral-700)]">{r.value}</span>
              </div>)}
          </div>
        </div>
      </div>
    </Section>;
};
export {
  AnalyticsAssumptions,
  AnalyticsHarvestForecast,
  AnalyticsHowItWorks,
  AnalyticsProfitability,
  AnalyticsRiskFactors
};
