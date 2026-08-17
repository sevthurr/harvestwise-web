import { useState } from "react";
import { TrendingUp, Package, ChevronRight, CloudRain, Clock, RotateCcw, Leaf } from "lucide-react";
import { useNavigate } from "react-router";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
const SNAPSHOT_DATA = [
  { label: "Avg. market price", value: "\u20B172/kg", sub: "sample commodities", icon: <Package className="w-4 h-4" />, accent: "neutral" },
  { label: "Price change", value: "+3.2%", sub: "vs yesterday", icon: <TrendingUp className="w-4 h-4" />, accent: "green" },
  { label: "Supply condition", value: "Moderate", sub: "Bangkerohan", icon: <Package className="w-4 h-4" />, accent: "neutral" },
  { label: "Short-term forecast", value: "Rising", sub: "next 7 days", icon: <TrendingUp className="w-4 h-4" />, accent: "green" }
];
const accentCls = {
  green: "text-emerald-600",
  amber: "text-amber-600",
  red: "text-red-500",
  neutral: "text-[var(--hw-neutral-700)]"
};
const AnalyticsMarketSnapshot = () => <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
    {SNAPSHOT_DATA.map((item) => <div key={item.label} className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-3 py-3">
        <p className="text-xs text-[var(--hw-neutral-400)] mb-1 leading-snug">{item.label}</p>
        <p className={`text-base font-bold leading-tight ${accentCls[item.accent]}`}>{item.value}</p>
        <p className="text-xs text-[var(--hw-neutral-400)] mt-0.5">{item.sub}</p>
      </div>)}
  </div>;
const AnalyticsRecommendationDetails = () => {
  const navigate = useNavigate();
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
      <p className="text-xs font-semibold text-[var(--hw-neutral-400)] uppercase tracking-wide">
        Recommendation analytics
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
    { label: "Category", value: "Plant Conservatively", highlight: true },
    { label: "Break-even price", value: "\u20B142/kg" },
    { label: "Forecasted range", value: "\u20B155 \u2013 \u20B170/kg" },
    { label: "Main risk factor", value: "Supply increase" },
    { label: "Last calculated", value: "Jun 24, 2026" }
  ].map((m) => <div key={m.label} className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2">
            <p className="text-xs text-[var(--hw-neutral-400)]">{m.label}</p>
            <p className={`text-sm font-semibold mt-0.5 ${m.highlight ? "text-amber-700" : "text-[var(--hw-neutral-800)]"}`}>
              {m.value}
            </p>
          </div>)}
      </div>

      <p className="text-xs text-[var(--hw-neutral-500)] leading-relaxed">
        The recommendation reflects supply pressure near your harvest period and current weather conditions. Figures are estimates only.
      </p>

      <button
    onClick={() => navigate("/assess")}
    className="inline-flex items-center gap-1 text-sm font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
        View full recommendation
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>;
};
const AnalyticsCropsSummary = () => {
  const navigate = useNavigate();
  const items = [
    { label: "Active crops", value: 1, icon: <Leaf className="w-4 h-4" />, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "With weather warnings", value: 1, icon: <CloudRain className="w-4 h-4" />, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Approaching harvest", value: 1, icon: <Clock className="w-4 h-4" />, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Need reassessment", value: 1, icon: <RotateCcw className="w-4 h-4" />, color: "text-[var(--hw-neutral-600)]", bg: "bg-[var(--hw-neutral-100)]" }
  ];
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[var(--hw-neutral-400)] uppercase tracking-wide">My Crops summary</p>
        <button
    onClick={() => navigate("/crops")}
    className="text-xs font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
          View all
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {items.map((item) => <button
    key={item.label}
    onClick={() => navigate("/crops")}
    className="flex flex-col items-start gap-1.5 p-3 rounded-xl border border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
  >
            <div className={`p-1.5 rounded-lg ${item.bg}`}>
              <span className={item.color}>{item.icon}</span>
            </div>
            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-[var(--hw-neutral-500)] leading-snug">{item.label}</p>
          </button>)}
      </div>
    </div>;
};
const TREND_DATA = [
  { d: "Jun 18", price: 78 },
  { d: "Jun 19", price: 80 },
  { d: "Jun 20", price: 77 },
  { d: "Jun 21", price: 82 },
  { d: "Jun 22", price: 84 },
  { d: "Jun 23", price: 83 },
  { d: "Jun 24", price: 85 }
];
const AnalyticsMiniTrend = () => {
  const [commodity, setCommodity] = useState("kamatis");
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-xs font-semibold text-[var(--hw-neutral-400)] uppercase tracking-wide">
          7-day price trend
        </p>
        <div className="flex gap-1.5">
          {["kamatis", "talong", "repolyo"].map((c) => <button
    key={c}
    onClick={() => setCommodity(c)}
    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${commodity === c ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>)}
        </div>
      </div>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={TREND_DATA} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--hw-neutral-200)" />
            <XAxis dataKey="d" tick={{ fill: "var(--hw-neutral-500)", fontSize: 10 }} stroke="var(--hw-neutral-300)" />
            <YAxis tick={{ fill: "var(--hw-neutral-500)", fontSize: 10 }} stroke="var(--hw-neutral-300)" domain={["auto", "auto"]} />
            <Tooltip
    contentStyle={{ backgroundColor: "white", border: "1px solid var(--hw-neutral-200)", borderRadius: 8, fontSize: 12 }}
    formatter={(v) => [`\u20B1${v}/kg`, "Price"]}
  />
            <Line type="monotone" dataKey="price" stroke="#245501" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-[var(--hw-neutral-400)] mt-2">
        Sample data · Bangkerohan Public Market · Retail
      </p>
    </div>;
};
export {
  AnalyticsCropsSummary,
  AnalyticsMarketSnapshot,
  AnalyticsMiniTrend,
  AnalyticsRecommendationDetails
};
