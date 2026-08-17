import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { CloudRain, Thermometer, AlertTriangle, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
const generateHistory = (base, days) => Array.from({ length: days }, (_, i) => ({
  date: `Jun ${24 - days + i + 1}`,
  retail: Math.round(base + (Math.random() - 0.5) * 10),
  wholesale: Math.round(base * 0.86 + (Math.random() - 0.5) * 8)
}));
const HISTORY_7 = generateHistory(85, 7);
const HISTORY_14 = generateHistory(85, 14);
const HISTORY_28 = generateHistory(85, 28);
const FORECAST_DATA = [
  { date: "Jun 24", actual: 85 },
  { date: "Jun 25", actual: 85, forecast: 86, high: 90, low: 82 },
  { date: "Jun 26", forecast: 87, high: 92, low: 82 },
  { date: "Jun 27", forecast: 88, high: 94, low: 82 },
  { date: "Jun 28", forecast: 89, high: 95, low: 83 },
  { date: "Jun 29", forecast: 90, high: 97, low: 83 },
  { date: "Jun 30", forecast: 91, high: 98, low: 84 },
  { date: "Jul 1", forecast: 90, high: 97, low: 83 }
];
const AnalyticsSection = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      <button
    onClick={() => setOpen((v) => !v)}
    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
        <p className="text-xs font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wide text-left">
          {title}
        </p>
        {open ? <ChevronUp className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-[var(--hw-neutral-100)]">{children}</div>}
    </div>;
};
const tooltipStyle = {
  backgroundColor: "white",
  border: "1px solid var(--hw-neutral-200)",
  borderRadius: 8,
  fontSize: 12
};
const AnalyticsPriceHistory = () => {
  const [period, setPeriod] = useState("7d");
  const [view, setView] = useState("both");
  const data = period === "7d" ? HISTORY_7 : period === "14d" ? HISTORY_14 : HISTORY_28;
  return <AnalyticsSection title="Price history">
      <div className="pt-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          {["7d", "14d", "21d", "28d"].map((p) => <button
    key={p}
    onClick={() => setPeriod(p)}
    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${period === p ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
              {p === "7d" ? "7 days" : p === "14d" ? "14 days" : p === "21d" ? "21 days" : "28 days"}
            </button>)}
          <div className="h-auto w-px bg-[var(--hw-neutral-200)]" />
          {["both", "retail", "wholesale"].map((v) => <button
    key={v}
    onClick={() => setView(v)}
    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${view === v ? "bg-[var(--hw-neutral-700)] border-[var(--hw-neutral-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
              {v === "both" ? "Retail + Wholesale" : v}
            </button>)}
        </div>

        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hw-neutral-200)" />
              <XAxis dataKey="date" tick={{ fill: "var(--hw-neutral-500)", fontSize: 10 }} stroke="var(--hw-neutral-300)" interval="preserveStartEnd" />
              <YAxis tick={{ fill: "var(--hw-neutral-500)", fontSize: 10 }} stroke="var(--hw-neutral-300)" domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [`\u20B1${v}/kg`, name === "retail" ? "Retail" : "Wholesale"]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {(view === "both" || view === "retail") && <Line type="monotone" dataKey="retail" stroke="#245501" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="retail" />}
              {(view === "both" || view === "wholesale") && <Line type="monotone" dataKey="wholesale" stroke="#73A942" strokeWidth={2} strokeDasharray="4 3" dot={false} activeDot={{ r: 4 }} name="wholesale" />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-[var(--hw-neutral-400)]">Bangkerohan Public Market · Sample data</p>
      </div>
    </AnalyticsSection>;
};
const AnalyticsPriceForecast = () => {
  const [period, setPeriod] = useState("7d");
  return <AnalyticsSection title="Price forecast">
      <div className="pt-3 space-y-3">
        <div className="flex gap-2">
          {["7d", "14d", "21d", "28d"].map((p) => <button
    key={p}
    onClick={() => setPeriod(p)}
    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${period === p ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
              {p === "7d" ? "7 days" : p === "14d" ? "14 days" : p === "21d" ? "21 days" : "28 days"}
            </button>)}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
    { label: "Current price", value: "\u20B185/kg" },
    { label: "7-day forecast", value: "\u20B190/kg", accent: true },
    { label: "Forecast range", value: "\u20B184\u2013\u20B198/kg" }
  ].map((m) => <div key={m.label} className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2">
              <p className="text-xs text-[var(--hw-neutral-400)]">{m.label}</p>
              <p className={`text-sm font-bold mt-0.5 ${m.accent ? "text-emerald-700" : "text-[var(--hw-neutral-800)]"}`}>{m.value}</p>
            </div>)}
        </div>

        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={FORECAST_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hw-neutral-200)" />
              <XAxis dataKey="date" tick={{ fill: "var(--hw-neutral-500)", fontSize: 10 }} stroke="var(--hw-neutral-300)" />
              <YAxis tick={{ fill: "var(--hw-neutral-500)", fontSize: 10 }} stroke="var(--hw-neutral-300)" domain={[75, 105]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [`\u20B1${v}/kg`, name === "high" ? "Range high" : name === "low" ? "Range low" : name === "forecast" ? "Forecast" : "Actual"]} />
              <Area type="monotone" dataKey="high" stroke="none" fill="#AAD576" fillOpacity={0.25} />
              <Area type="monotone" dataKey="low" stroke="none" fill="#ffffff" fillOpacity={1} />
              <Line type="monotone" dataKey="actual" stroke="#245501" strokeWidth={2} dot={{ r: 3, fill: "#245501" }} name="actual" />
              <Line type="monotone" dataKey="forecast" stroke="#73A942" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: "#73A942" }} name="forecast" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <p className="text-sm text-[var(--hw-neutral-600)] leading-relaxed">
          Prices may improve during the next several days based on current supply and seasonal patterns.
        </p>
        <p className="text-xs text-[var(--hw-neutral-400)] italic">
          Forecast values are estimates and may change as new information becomes available.
        </p>
      </div>
    </AnalyticsSection>;
};
const AnalyticsMarketComparison = () => {
  const markets = [
    { name: "Bangkerohan", retail: 85, wholesale: 72, updated: "Jun 24, 7:30 AM" },
    { name: "DFTC", retail: 82, wholesale: 70, updated: "Jun 24, 6:00 AM" }
  ];
  const diff = markets[0].retail - markets[1].retail;
  return <AnalyticsSection title="Market comparison">
      <div className="pt-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {markets.map((m) => <div key={m.name} className="bg-[var(--hw-neutral-50)] rounded-xl px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-[var(--hw-neutral-700)]">{m.name}</p>
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-[var(--hw-neutral-400)]">Retail</p>
                  <p className="text-sm font-bold text-[var(--hw-neutral-900)]">₱{m.retail}/kg</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--hw-neutral-400)]">Wholesale</p>
                  <p className="text-sm font-bold text-[var(--hw-neutral-800)]">₱{m.wholesale}/kg</p>
                </div>
              </div>
              <p className="text-xs text-[var(--hw-neutral-400)]">Updated {m.updated}</p>
            </div>)}
        </div>
        <p className="text-sm text-[var(--hw-neutral-600)]">
          Bangkerohan retail prices are <strong>₱{Math.abs(diff)}/kg {diff > 0 ? "higher" : "lower"}</strong> than DFTC retail today.
        </p>
      </div>
    </AnalyticsSection>;
};
const AnalyticsSupplyPressure = () => {
  const dftcArrivalPressure = 48;
  const seasonalPressure = 58;
  const combined = Math.round(dftcArrivalPressure * 0.6 + seasonalPressure * 0.4);
  const bar = (val, color) => <div className="h-2 bg-[var(--hw-neutral-200)] rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${val}%` }} />
    </div>;
  return <AnalyticsSection title="Supply Pressure">
      <div className="pt-3 space-y-4">
        {
    /* DFTC Arrival Pressure */
  }
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-[var(--hw-neutral-700)]">DFTC Arrival Pressure</span>
            <span className="font-semibold text-[var(--hw-neutral-800)]">Normal</span>
          </div>
          {bar(dftcArrivalPressure, "bg-blue-400")}
          <p className="text-xs text-[var(--hw-neutral-500)]">DFTC arrival volumes are within their recent range. No significant upward pressure detected.</p>
        </div>

        {
    /* Seasonal Production Pressure */
  }
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-[var(--hw-neutral-700)]">Seasonal Production Pressure</span>
            <span className="font-semibold text-[var(--hw-neutral-800)]">Moderate</span>
          </div>
          {bar(seasonalPressure, "bg-amber-400")}
          <p className="text-xs text-[var(--hw-neutral-500)]">Seasonal production patterns suggest more farms may begin harvesting soon, which may increase supply pressure.</p>
        </div>

        {
    /* Combined Supply Pressure — label only, no score */
  }
        <div className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-[var(--hw-neutral-700)]">Combined Supply Pressure</span>
            <span className="font-semibold text-amber-700">Moderate</span>
          </div>
          {bar(combined, "bg-[var(--hw-green-600)]")}
          <div className="flex justify-between text-xs text-[var(--hw-neutral-400)]">
            <span>Low pressure</span><span>High pressure</span>
          </div>
        </div>

        <p className="text-sm text-[var(--hw-neutral-600)] leading-relaxed">
          DFTC arrivals are currently within a manageable range. Supply pressure may increase near the next harvest period as more farms begin collecting.
        </p>
      </div>
    </AnalyticsSection>;
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SEASON = [60, 55, 70, 80, 85, 90, 95, 88, 75, 65, 60, 58];
const NOW_IDX = 5;
const AnalyticsSeasonality = () => {
  const max = Math.max(...SEASON);
  return <AnalyticsSection title="Production seasonality">
      <div className="pt-3 space-y-3">
        <p className="text-sm font-medium text-[var(--hw-neutral-800)]">Production may increase soon</p>
        <p className="text-sm text-[var(--hw-neutral-600)] leading-relaxed">
          More farms in the Davao City region are expected to harvest Kamatis during the coming weeks, which may increase market supply and affect prices.
        </p>

        {
    /* Month bar chart */
  }
        <div className="flex items-end gap-1 h-20 pt-2">
          {MONTHS.map((m, i) => {
    const h = Math.round(SEASON[i] / max * 100);
    const isCurrent = i === NOW_IDX;
    return <div key={m} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <div
      className={`w-full rounded-sm transition-all ${isCurrent ? "bg-[var(--hw-green-700)]" : "bg-[var(--hw-green-400)]"} opacity-${isCurrent ? "100" : "60"}`}
      style={{ height: `${h}%` }}
    />
                <span className={`text-[9px] leading-none ${isCurrent ? "font-bold text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-400)]"}`}>
                  {m}
                </span>
              </div>;
  })}
        </div>
        <p className="text-xs text-[var(--hw-neutral-400)]">Relative production index · Sample seasonal pattern</p>
      </div>
    </AnalyticsSection>;
};
const AnalyticsWeatherFactors = () => {
  const items = [
    { icon: <CloudRain className="w-4 h-4" />, label: "Rainfall outlook", value: "Heavy rain next 4\u20136 days", color: "text-amber-600", bg: "bg-amber-50" },
    { icon: <Thermometer className="w-4 h-4" />, label: "Temperature condition", value: "26\u201329\xB0C \u2014 Warm", color: "text-[var(--hw-neutral-600)]", bg: "bg-[var(--hw-neutral-100)]" },
    { icon: <AlertTriangle className="w-4 h-4" />, label: "Severe-weather risk", value: "Moderate", color: "text-amber-600", bg: "bg-amber-50" }
  ];
  return <AnalyticsSection title="Weather factors">
      <div className="pt-3 space-y-3">
        <div className="space-y-2">
          {items.map((item) => <div key={item.label} className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg flex-shrink-0 ${item.bg}`}>
                <span className={item.color}>{item.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--hw-neutral-400)]">{item.label}</p>
                <p className={`text-sm font-semibold ${item.color}`}>{item.value}</p>
              </div>
            </div>)}
        </div>
        <p className="text-sm text-[var(--hw-neutral-600)] leading-relaxed">
          Heavy rain may disrupt field activity, delay deliveries, and temporarily reduce market supply, which could briefly support prices.
        </p>
        <p className="text-xs text-[var(--hw-neutral-400)]">Weather data updated Jun 24, 2026 at 5:00 AM · PAGASA</p>
      </div>
    </AnalyticsSection>;
};
const AnalyticsCalendarFactors = () => {
  const factors = [
    { category: "Payday Period", label: "Mid-month payday", date: "Jun 25\u201326", effect: "May support market activity. Effect remains uncertain.", up: null },
    { category: "Weekends", label: "Weekend", date: "Jun 27\u201328", effect: "Possible market activity increase. Household buying may be higher.", up: null },
    { category: "Local Holidays", label: "Araw ng Dabaw", date: "Mar 16 (past)", effect: "May affect deliveries or market schedules in Davao City.", up: null },
    { category: "Local Events", label: "Kadayawan Festival", date: "Aug (upcoming)", effect: "May support market activity during the festival period.", up: null }
  ];
  return <AnalyticsSection title="Market Activity Context">
      <div className="pt-3 space-y-3">
        {factors.map((f) => <div key={f.label} className="flex items-start gap-3">
            <div className="p-1.5 bg-blue-50 rounded-lg flex-shrink-0 mt-0.5">
              <CalendarDays className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--hw-neutral-700)]">{f.category}</span>
                <p className="text-sm font-medium text-[var(--hw-neutral-800)]">{f.label}</p>
                <span className="text-xs text-[var(--hw-neutral-400)]">{f.date}</span>
              </div>
              <p className="text-xs text-[var(--hw-neutral-500)] mt-0.5 leading-snug">{f.effect}</p>
            </div>
          </div>)}
        <p className="text-xs text-[var(--hw-neutral-400)] italic pt-1">
          Calendar indicators may support or affect market activity. They do not guarantee higher consumer demand.
        </p>
      </div>
    </AnalyticsSection>;
};
const AnalyticsDataInfo = ({ commodityName = "Kamatis", variant }) => {
  const [open, setOpen] = useState(false);
  const rows = [
    { label: "Market source", value: "Bangkerohan Public Market, Davao City" },
    { label: "Price data date", value: "June 24, 2026 at 7:30 AM" },
    { label: "Forecast generated", value: "June 24, 2026 at 6:00 AM" },
    { label: "Weather update", value: "June 24, 2026 at 5:00 AM \xB7 PAGASA" },
    { label: "Market-calendar update", value: "June 24, 2026 \xB7 DA-AMAD" },
    { label: "Selected price type", value: "Retail" },
    { label: "Data for commodity", value: commodityName },
    ...variant ? [{ label: "Variety", value: variant }] : []
  ];
  return <div className="rounded-2xl border border-[var(--hw-neutral-200)] bg-white shadow-[var(--shadow-xs)] overflow-hidden">
      <button
    onClick={() => setOpen((v) => !v)}
    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
        <p className="text-xs font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wide text-left">
          About this information
        </p>
        {open ? <ChevronUp className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-[var(--hw-neutral-100)]">
          <dl className="mt-3 space-y-2">
            {rows.map((r) => <div key={r.label} className="flex justify-between gap-4 flex-wrap">
                <dt className="text-xs text-[var(--hw-neutral-400)]">{r.label}</dt>
                <dd className="text-xs font-medium text-[var(--hw-neutral-700)]">{r.value}</dd>
              </div>)}
          </dl>
        </div>}
    </div>;
};
export {
  AnalyticsCalendarFactors,
  AnalyticsDataInfo,
  AnalyticsMarketComparison,
  AnalyticsPriceForecast,
  AnalyticsPriceHistory,
  AnalyticsSeasonality,
  AnalyticsSupplyPressure,
  AnalyticsWeatherFactors
};
