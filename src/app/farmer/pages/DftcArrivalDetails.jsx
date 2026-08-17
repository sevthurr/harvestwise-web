import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { TrendingUp, TrendingDown, Minus, RefreshCw, ChevronRight, Info } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell
} from "recharts";
import { COMMODITIES } from "../components/market/mockData";
import { CommodityIllustration } from "../components/market/CommodityIllustrations";
const ARRIVAL_WEEKLY = {
  kamatis: {
    classification: "Normal",
    historicalPosition: "Within usual range",
    weeks: [{ week: "May 27\u2013Jun 2", tons: 8.7 }, { week: "Jun 3\u20139", tons: 9.1 }, { week: "Jun 10\u201316", tons: 8.8 }, { week: "Jun 17\u201323", tons: 9.6 }]
  },
  talong: {
    classification: "Normal",
    historicalPosition: "Within usual range",
    weeks: [{ week: "May 27\u2013Jun 2", tons: 6.4 }, { week: "Jun 3\u20139", tons: 6.3 }, { week: "Jun 10\u201316", tons: 6.4 }, { week: "Jun 17\u201323", tons: 6.2 }]
  },
  repolyo: {
    classification: "High",
    historicalPosition: "Above usual range",
    weeks: [{ week: "May 27\u2013Jun 2", tons: 11.9 }, { week: "Jun 3\u20139", tons: 13 }, { week: "Jun 10\u201316", tons: 14.2 }, { week: "Jun 17\u201323", tons: 15.5 }]
  },
  atsal: {
    classification: "Low",
    historicalPosition: "Below usual range",
    weeks: [{ week: "May 27\u2013Jun 2", tons: 3.8 }, { week: "Jun 3\u20139", tons: 3.5 }, { week: "Jun 10\u201316", tons: 3.2 }, { week: "Jun 17\u201323", tons: 2.9 }]
  },
  carrots: {
    classification: "Normal",
    historicalPosition: "Within usual range",
    weeks: [{ week: "May 27\u2013Jun 2", tons: 7.5 }, { week: "Jun 3\u20139", tons: 7.6 }, { week: "Jun 10\u201316", tons: 7.5 }, { week: "Jun 17\u201323", tons: 7.7 }]
  },
  pipino: {
    classification: "Normal",
    historicalPosition: "Within usual range",
    weeks: [{ week: "May 27\u2013Jun 2", tons: 5.8 }, { week: "Jun 3\u20139", tons: 6 }, { week: "Jun 10\u201316", tons: 6.1 }, { week: "Jun 17\u201323", tons: 6.2 }]
  },
  ampalaya: {
    classification: "Low",
    historicalPosition: "Below usual range",
    weeks: [{ week: "May 27\u2013Jun 2", tons: 4.1 }, { week: "Jun 3\u20139", tons: 3.8 }, { week: "Jun 10\u201316", tons: 3.5 }, { week: "Jun 17\u201323", tons: 3.2 }]
  },
  kalabasa: {
    classification: "Normal",
    historicalPosition: "Within usual range",
    weeks: [{ week: "May 27\u2013Jun 2", tons: 9.3 }, { week: "Jun 3\u20139", tons: 9.4 }, { week: "Jun 10\u201316", tons: 9.2 }, { week: "Jun 17\u201323", tons: 9.5 }]
  },
  lettuce: {
    classification: "High",
    historicalPosition: "Above usual range",
    weeks: [{ week: "May 27\u2013Jun 2", tons: 11.4 }, { week: "Jun 3\u20139", tons: 12.7 }, { week: "Jun 10\u201316", tons: 13.9 }, { week: "Jun 17\u201323", tons: 15.1 }]
  },
  pechay: {
    classification: "High",
    historicalPosition: "Above usual range",
    weeks: [{ week: "May 27\u2013Jun 2", tons: 10.8 }, { week: "Jun 3\u20139", tons: 12 }, { week: "Jun 10\u201316", tons: 13.4 }, { week: "Jun 17\u201323", tons: 14.6 }]
  }
};
const pressureCfg = {
  Low: { color: "text-emerald-700", borderColor: "border-l-emerald-500", Icon: TrendingDown },
  Normal: { color: "text-blue-600", borderColor: "border-l-blue-500", Icon: Minus },
  High: { color: "text-amber-700", borderColor: "border-l-amber-500", Icon: TrendingUp }
};
function countAboveBelow(weeks) {
  const mean = weeks.reduce((s, w) => s + w.tons, 0) / weeks.length;
  const threshold = mean * 0.05;
  return {
    above: weeks.filter((w) => w.tons > mean + threshold).length,
    below: weeks.filter((w) => w.tons < mean - threshold).length
  };
}
function buildInsight(name, classification, weeks) {
  const latest = weeks[weeks.length - 1];
  const { above, below } = countAboveBelow(weeks);
  if (classification === "High") {
    return {
      headline: `${name} arrivals were above the usual level in ${above} of the last 4 weeks, reaching ${latest.tons.toFixed(1)} tons on ${latest.week}.`,
      meaning: `More ${name} is entering DFTC, which may place pressure on market prices.`,
      action: `Based on recent DFTC arrivals, consider comparing current prices and reviewing your selling schedule.`
    };
  }
  if (classification === "Low") {
    return {
      headline: `${name} arrivals were below the usual level in ${below} of the last 4 weeks.`,
      meaning: `Fewer ${name} deliveries reaching DFTC may reduce supply pressure in the near term.`,
      action: `Based on recent DFTC arrivals, lower volumes may support prices. Confirm the current market price before selling.`
    };
  }
  return {
    headline: `${name} arrivals stayed within the usual range during the last 4 weeks.`,
    meaning: `Arrival volumes at DFTC are consistent with recent seasonal patterns.`,
    action: `Based on recent DFTC arrivals, no strong arrival warning is present. Continue checking current prices before harvesting or selling.`
  };
}
const chipBtn = (active) => `flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[13px] font-medium transition-colors whitespace-nowrap ${active ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`;
const tooltipStyle = { backgroundColor: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 11 };
function DftcArrivalDetailsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultId = searchParams.get("commodity") ?? "kamatis";
  const [commodityId, setCommodityId] = useState(
    COMMODITIES.find((c) => c.id === defaultId) ? defaultId : "kamatis"
  );
  const commodity = COMMODITIES.find((c) => c.id === commodityId);
  const data = ARRIVAL_WEEKLY[commodityId] ?? ARRIVAL_WEEKLY["kamatis"];
  const cfg = pressureCfg[data.classification];
  const PIcon = cfg.Icon;
  const latest = data.weeks[3];
  const previous = data.weeks[2];
  const change = Math.round((latest.tons - previous.tons) * 10) / 10;
  const changeStr = change === 0 ? "\u2014" : change > 0 ? `+${change.toFixed(1)} tons` : `${change.toFixed(1)} tons`;
  const insight = buildInsight(commodity.name, data.classification, data.weeks);
  const chartData = data.weeks.map((w, i) => ({
    week: w.week,
    tons: w.tons,
    isCurrent: i === 3
  }));
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-3xl space-y-5">

        {
    /* Page header */
  }
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
              DFTC Arrival Details
            </h1>
            <div className="flex items-center gap-1.5 text-[var(--hw-neutral-700)] flex-shrink-0">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-[13px] whitespace-nowrap">Updated today at 7:30 AM</span>
            </div>
          </div>
          <p className="text-[15px] text-[var(--hw-neutral-900)]">
            View DFTC commodity arrivals and arrival pressure in Davao City.
          </p>
        </div>

        {
    /* Commodity selector */
  }
        <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {COMMODITIES.map((c) => <button key={c.id} onClick={() => setCommodityId(c.id)} className={chipBtn(c.id === commodityId)}>
              <CommodityIllustration commodityId={c.id} className="w-5 h-5 flex-shrink-0" />
              {c.name}
            </button>)}
        </div>

        {
    /* Coverage label */
  }
        <p className="text-[13px] font-medium text-[var(--hw-neutral-900)]">Last 4 completed weeks</p>

        {
    /* Farmer insight card */
  }
        <div className={`bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] border-l-4 ${cfg.borderColor} p-4 space-y-3`}>
          <div className={`flex items-center gap-1.5 ${cfg.color}`}>
            <PIcon className="w-5 h-5" />
            <span className="font-semibold">Arrival Pressure: {data.classification}</span>
          </div>
          <p className="text-[var(--hw-neutral-900)] leading-relaxed">{insight.headline}</p>
          <div className="space-y-1.5">
            <div>
              <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">What this means</p>
              <p className="text-[13px] text-[var(--hw-neutral-700)] leading-relaxed mt-0.5">{insight.meaning}</p>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">Suggested action</p>
              <p className="text-[13px] text-[var(--hw-neutral-700)] leading-relaxed mt-0.5">{insight.action}</p>
            </div>
          </div>
        </div>

        {
    /* Bar chart */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
          <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
            Weekly DFTC arrivals
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--hw-neutral-100)" />
                <XAxis
    dataKey="week"
    tick={{ fill: "var(--hw-neutral-400)", fontSize: 10 }}
    stroke="var(--hw-neutral-200)"
    tickLine={false}
    interval={0}
  />
                <YAxis
    tick={{ fill: "var(--hw-neutral-400)", fontSize: 10 }}
    stroke="none"
    tickFormatter={(v) => `${v}t`}
    domain={[0, "auto"]}
  />
                <Tooltip
    contentStyle={tooltipStyle}
    formatter={(v) => [`${v.toFixed(1)} tons`, "Arrival volume"]}
  />
                <Bar dataKey="tons" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.isCurrent ? "#245501" : "#AAD576"} />)}
                  <LabelList
    dataKey="tons"
    position="top"
    formatter={(v) => `${v.toFixed(1)}`}
    style={{ fill: "var(--hw-neutral-600)", fontSize: 11, fontWeight: 600 }}
  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[12px] text-[var(--hw-neutral-700)]">Values in tons · Darker bar = latest week</p>
        </div>

        {
    /* Summary — 4 items */
  }
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
    { label: "Latest week", value: latest.week },
    { label: "Arrival volume", value: `${latest.tons.toFixed(1)} tons` },
    {
      label: "Change",
      value: changeStr,
      accent: change > 0 ? "text-amber-600" : change < 0 ? "text-emerald-700" : "text-[var(--hw-neutral-700)]"
    },
    { label: "Historical position", value: data.historicalPosition, accent: cfg.color }
  ].map((m) => <div key={m.label} className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-3 py-2.5">
              <p className="text-xs text-[var(--hw-neutral-700)]">{m.label}</p>
              <p className={`font-semibold text-sm mt-0.5 ${m.accent ?? "text-[var(--hw-neutral-900)]"}`}>{m.value}</p>
            </div>)}
        </div>

        {
    /* Table — 4 rows */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
              Recent arrival records
            </p>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
                <th className="text-left px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Week</th>
                <th className="text-right px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Arrival volume</th>
                <th className="text-right px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hw-neutral-100)]">
              {[...data.weeks].reverse().map((w, i) => {
    const origIdx = data.weeks.length - 1 - i;
    const prev = data.weeks[origIdx - 1];
    const diff = prev ? Math.round((w.tons - prev.tons) * 10) / 10 : null;
    return <tr key={i} className={i === 0 ? "bg-[var(--hw-neutral-50)]" : ""}>
                    <td className="px-4 py-2.5 text-[var(--hw-neutral-700)]">
                      {w.week}
                      {i === 0 && <span className="ml-1.5 text-[10px] font-semibold text-[var(--hw-green-700)]">Latest</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[var(--hw-neutral-900)]">
                      {w.tons.toFixed(1)} tons
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {diff === null || diff === 0 ? <span className="text-[var(--hw-neutral-700)]">—</span> : <span className={diff > 0 ? "text-amber-600 font-medium" : "text-emerald-700 font-medium"}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(1)} tons
                          </span>}
                    </td>
                  </tr>;
  })}
            </tbody>
          </table>
        </div>

        {
    /* Limitation and source */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-[var(--hw-neutral-700)] flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">
              DFTC arrivals cover commodities recorded at the Davao Food Terminal Complex and do not represent all vegetable supply entering Davao City.
            </p>
          </div>
          <div className="pt-1 space-y-0.5 text-[12px] text-[var(--hw-neutral-700)]">
            <p>Source: DFTC · Coverage: DFTC commodity arrival records</p>
            <p>Last updated: Jun 24, 2026 at 6:00 AM</p>
          </div>
        </div>

        {
    /* Check planting assessment */
  }
        <div className="bg-[var(--hw-green-50)] border border-[var(--hw-green-400)] rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium text-[var(--hw-green-900)]">Check planting assessment</p>
            <p className="text-xs text-[var(--hw-green-700)] mt-0.5">Review the full planting assessment for this commodity</p>
          </div>
          <button
    onClick={() => navigate("/assess")}
    className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
  >
            Assess now
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>;
}
export {
  DftcArrivalDetailsPage as default
};
