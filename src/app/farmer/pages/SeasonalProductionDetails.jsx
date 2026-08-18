import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ChevronRight,
  Info,
  SlidersHorizontal,
  X,
  Check
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell,
  Legend
} from "recharts";
import { COMMODITIES } from "../components/market/mockData";
import { CommodityIllustration } from "../components/market/CommodityIllustrations";
const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const QUARTER_LABELS = {
  Q1: "Q1 (Jan\u2013Mar)",
  Q2: "Q2 (Apr\u2013Jun)",
  Q3: "Q3 (Jul\u2013Sep)",
  Q4: "Q4 (Oct\u2013Dec)"
};
const QUARTER_FULL = {
  Q1: "Jan 1\u2013Mar 31",
  Q2: "Apr 1\u2013Jun 30",
  Q3: "Jul 1\u2013Sep 30",
  Q4: "Oct 1\u2013Dec 31"
};
const SOURCE_LABELS = {
  "davao-city": "Davao City",
  "davao-del-sur": "Davao del Sur",
  "bukidnon": "Bukidnon",
  "all": "All source locations"
};
const LOCATION_FACTORS = {
  "davao-city": 1,
  "davao-del-sur": 0.82,
  "bukidnon": 0.58,
  "all": 2.4
};
const YEAR_FACTORS = {
  2016: 0.84,
  2017: 0.87,
  2018: 0.9,
  2019: 0.93,
  2020: 0.88,
  2021: 0.92,
  2022: 0.95,
  2023: 0.98,
  2024: 1,
  2025: 1.03
};
const BASE_PRODUCTION = {
  kamatis: { Q1: 940, Q2: 1020, Q3: 1300, Q4: 980 },
  talong: { Q1: 620, Q2: 680, Q3: 820, Q4: 700 },
  repolyo: { Q1: 1200, Q2: 880, Q3: 760, Q4: 1040 },
  atsal: { Q1: 580, Q2: 760, Q3: 900, Q4: 640 },
  carrots: { Q1: 1100, Q2: 920, Q3: 820, Q4: 960 },
  pipino: { Q1: 740, Q2: 860, Q3: 920, Q4: 780 },
  ampalaya: { Q1: 560, Q2: 720, Q3: 880, Q4: 640 },
  kalabasa: { Q1: 820, Q2: 960, Q3: 1100, Q4: 900 },
  lettuce: { Q1: 1400, Q2: 980, Q3: 760, Q4: 1060 },
  pechay: { Q1: 1320, Q2: 960, Q3: 800, Q4: 1020 }
};
function yearQVariation(year, qi) {
  const t = (year * 7 + qi * 13) % 100;
  return 1 + (t - 50) / 600;
}
function getProduction(commodityId, quarter, year, location) {
  const base = BASE_PRODUCTION[commodityId]?.[quarter] ?? 1e3;
  const qi = QUARTERS.indexOf(quarter);
  return Math.round(base * YEAR_FACTORS[year] * LOCATION_FACTORS[location] * yearQVariation(year, qi));
}
function classifyValues(values) {
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const last = values[values.length - 1];
  if (last > avg * 1.12) return "High";
  if (last < avg * 0.88) return "Low";
  return "Normal";
}
const pressureCfg = {
  Low: { color: "text-emerald-700", borderColor: "border-l-emerald-500", Icon: TrendingDown },
  Normal: { color: "text-blue-600", borderColor: "border-l-blue-500", Icon: Minus },
  High: { color: "text-amber-700", borderColor: "border-l-amber-500", Icon: TrendingUp }
};
function buildProductionInsight(name, classification, quarter, locationLabel, avg) {
  const qLabel = QUARTER_LABELS[quarter];
  const qFull = QUARTER_FULL[quarter];
  if (classification === "High") {
    return {
      headline: `Historical ${name} production in ${qLabel} (${qFull}) averaged ${avg.toLocaleString()} tons in ${locationLabel}.`,
      meaning: `More ${name} is usually produced during this quarter, which may increase supply near harvest.`,
      action: `Based on historical production, if your harvest may fall in ${qLabel.split(" ")[0]}, consider reviewing your planting area or schedule. Review the full planting assessment for a complete picture.`
    };
  }
  if (classification === "Low") {
    return {
      headline: `Historical ${name} production in ${qLabel} (${qFull}) was below its usual level in ${locationLabel}.`,
      meaning: `Seasonal supply pressure from production may be lower during this quarter.`,
      action: `Based on historical production, seasonal supply pressure may be lower. Confirm the price and profitability outlook before planting.`
    };
  }
  return {
    headline: `Historical ${name} production in ${qLabel} (${qFull}) was near its usual level in ${locationLabel}.`,
    meaning: `No strong seasonal production pressure is indicated for this quarter.`,
    action: `Based on historical production, no strong seasonal warning is present. Review prices, arrivals, weather, and costs before planting.`
  };
}
const DEFAULT_FILTERS = { view: "quarterly", location: "davao-city", quarter: "Q3" };
const FilterDrawer = ({ open, filters, onClose, onApply }) => {
  const [draft, setDraft] = useState(filters);
  React.useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);
  if (!open) return null;
  const chipCls = (active) => `px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${active ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`;
  return <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-y-0 md:right-0 md:left-auto md:w-72 bg-white rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-[var(--shadow-xl)] flex flex-col max-h-[88vh] md:max-h-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-200)]">
          <p className="font-semibold text-[var(--hw-neutral-900)]">Filter</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {
    /* View */
  }
          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-2">View</p>
            <div className="flex flex-col gap-2">
              {[["quarterly", "Quarterly"], ["annual", "Annual"]].map(([v, label]) => <button key={v} onClick={() => setDraft((d) => ({ ...d, view: v }))} className={chipCls(draft.view === v)}>
                  {label}
                </button>)}
            </div>
          </div>

          {
    /* Source location */
  }
          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-2">Source location</p>
            <div className="flex flex-col gap-2">
              {["davao-city", "davao-del-sur", "bukidnon", "all"].map((loc) => <button key={loc} onClick={() => setDraft((d) => ({ ...d, location: loc }))} className={chipCls(draft.location === loc)}>
                  {SOURCE_LABELS[loc]}
                </button>)}
            </div>
          </div>

          {
    /* Quarter — shown only when Quarterly is selected */
  }
          {draft.view === "quarterly" && <div>
              <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-2">Quarter</p>
              <div className="flex flex-wrap gap-2">
                {QUARTERS.map((q) => <button key={q} onClick={() => setDraft((d) => ({ ...d, quarter: q }))} className={chipCls(draft.quarter === q)}>
                    {QUARTER_LABELS[q]}
                  </button>)}
              </div>
            </div>}
        </div>

        <div className="px-5 py-4 border-t border-[var(--hw-neutral-200)] flex gap-3">
          <button
    onClick={() => setDraft(DEFAULT_FILTERS)}
    className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            Reset
          </button>
          <button
    onClick={() => {
      onApply(draft);
      onClose();
    }}
    className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors flex items-center justify-center gap-1.5"
  >
            <Check className="w-4 h-4" />Apply Filters
          </button>
        </div>
      </div>
    </>;
};
const Q_COLORS = {
  Q1: "#245501",
  Q2: "#397D02",
  Q3: "#73A942",
  Q4: "#AAD576"
};
const chipBtn = (active) => `flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[13px] font-medium transition-colors whitespace-nowrap ${active ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`;
const tooltipStyle = { backgroundColor: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 11 };
function SeasonalProductionDetailsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultId = searchParams.get("commodity") ?? "kamatis";
  const [commodityId, setCommodityId] = useState(
    COMMODITIES.find((c) => c.id === defaultId) ? defaultId : "kamatis"
  );
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const commodity = COMMODITIES.find((c) => c.id === commodityId);
  const { view, location, quarter } = filters;
  const quarterlyData = useMemo(
    () => YEARS.map((yr) => ({
      year: String(yr),
      production: getProduction(commodityId, quarter, yr, location)
    })),
    [commodityId, quarter, location]
  );
  const qValues = quarterlyData.map((d) => d.production);
  const qAvg = Math.round(qValues.reduce((s, v) => s + v, 0) / qValues.length);
  const qHigh = Math.max(...qValues);
  const qLow = Math.min(...qValues);
  const qPressure = classifyValues(qValues);
  const qCfg = pressureCfg[qPressure];
  const QPIcon = qCfg.Icon;
  const qInsight = buildProductionInsight(commodity.name, qPressure, quarter, SOURCE_LABELS[location], qAvg);
  const annualData = useMemo(
    () => YEARS.map((yr) => ({
      year: String(yr),
      Q1: getProduction(commodityId, "Q1", yr, location),
      Q2: getProduction(commodityId, "Q2", yr, location),
      Q3: getProduction(commodityId, "Q3", yr, location),
      Q4: getProduction(commodityId, "Q4", yr, location)
    })),
    [commodityId, location]
  );
  const annualTotals = annualData.map((d) => ({ year: d.year, total: d.Q1 + d.Q2 + d.Q3 + d.Q4 }));
  const bestYear = annualTotals.reduce((b, d) => d.total > b.total ? d : b, annualTotals[0]);
  const bestYearRow = annualData.find((d) => d.year === bestYear.year);
  const bestQ = QUARTERS.reduce((bq, q) => bestYearRow[q] > bestYearRow[bq] ? q : bq, "Q1");
  const annualTableRows = useMemo(
    () => [...YEARS].reverse().flatMap(
      (yr) => QUARTERS.map((q) => ({
        year: yr,
        quarter: q,
        production: getProduction(commodityId, q, yr, location)
      }))
    ),
    [commodityId, location]
  );
  const filterSummary = view === "quarterly" ? `Quarterly \xB7 ${SOURCE_LABELS[location]} \xB7 ${QUARTER_LABELS[quarter]}` : `Annual \xB7 ${SOURCE_LABELS[location]}`;
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-3xl space-y-5">

        {
    /* Page header */
  }
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
              Seasonal Production
            </h1>
            <div className="flex items-center gap-1.5 text-[var(--hw-neutral-700)] flex-shrink-0">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-[13px] whitespace-nowrap">Updated today at 7:30 AM</span>
            </div>
          </div>
          <p className="text-[15px] text-[var(--hw-neutral-900)]">
            View historical seasonal production patterns used as regional context.
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
    /* Active filter row + Filter button */
  }
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug flex-1 min-w-0 truncate">
            {filterSummary}
          </p>
          <button
    onClick={() => setDrawerOpen(true)}
    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors text-[13px] font-medium shadow-[var(--shadow-xs)]"
  >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
          </button>
        </div>

        {
    /* ── QUARTERLY VIEW ────────────────────────────────────────────── */
  }
        {view === "quarterly" && <>
            {
    /* Farmer insight card */
  }
            <div className={`bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] border-l-4 ${qCfg.borderColor} p-4 space-y-3`}>
              <div className={`flex items-center gap-1.5 ${qCfg.color}`}>
                <QPIcon className="w-5 h-5" />
                <span className="font-semibold">Production Pressure: {qPressure}</span>
              </div>
              <p className="text-[var(--hw-neutral-900)] leading-relaxed">{qInsight.headline}</p>
              <div className="space-y-1.5">
                <div>
                  <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">What this means</p>
                  <p className="text-[13px] text-[var(--hw-neutral-700)] leading-relaxed mt-0.5">{qInsight.meaning}</p>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">Suggested action</p>
                  <p className="text-[13px] text-[var(--hw-neutral-700)] leading-relaxed mt-0.5">{qInsight.action}</p>
                </div>
              </div>
            </div>

            {
    /* Quarterly chart */
  }
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
                  {quarter} production by year
                </p>
                <p className="text-[12px] text-[var(--hw-neutral-700)] mt-0.5">
                  Historical production from {SOURCE_LABELS[location].toLowerCase()}.
                </p>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quarterlyData} margin={{ top: 20, right: 8, left: -8, bottom: 0 }} barSize={26}>
                    <CartesianGrid vertical={false} stroke="var(--hw-neutral-100)" />
                    <XAxis dataKey="year" tick={{ fill: "var(--hw-neutral-400)", fontSize: 10 }} stroke="var(--hw-neutral-200)" tickLine={false} />
                    <YAxis tick={{ fill: "var(--hw-neutral-400)", fontSize: 10 }} stroke="none" domain={[0, "auto"]} />
                    <Tooltip
    contentStyle={tooltipStyle}
    formatter={(v) => [`${v.toLocaleString()} tons`, `${quarter} production`]}
    labelFormatter={(l) => `Year ${l}`}
  />
                    <Bar dataKey="production" radius={[3, 3, 0, 0]}>
                      {quarterlyData.map((_, i) => <Cell key={i} fill={i === quarterlyData.length - 1 ? "#245501" : "#AAD576"} />)}
                      <LabelList
    dataKey="production"
    position="top"
    formatter={(v) => v.toLocaleString()}
    style={{ fill: "var(--hw-neutral-500)", fontSize: 9, fontWeight: 600 }}
  />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[12px] text-[var(--hw-neutral-700)]">Values in tons · Darker bar = most recent year</p>
            </div>

            {
    /* Quarterly summary — 6 items */
  }
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
    { label: "Selected quarter", value: QUARTER_LABELS[quarter] },
    { label: "Source location", value: SOURCE_LABELS[location] },
    { label: "10-year average", value: `${qAvg.toLocaleString()} tons` },
    { label: "Highest recorded", value: `${qHigh.toLocaleString()} tons` },
    { label: "Lowest recorded", value: `${qLow.toLocaleString()} tons` },
    { label: "Production Pressure", value: qPressure, accent: qCfg.color }
  ].map((m) => <div key={m.label} className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-3 py-2.5">
                  <p className="text-xs text-[var(--hw-neutral-700)]">{m.label}</p>
                  <p className={`font-semibold text-sm mt-0.5 ${m.accent ?? "text-[var(--hw-neutral-900)]"}`}>{m.value}</p>
                </div>)}
            </div>

            {
    /* Quarterly table */
  }
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--hw-neutral-100)]">
                <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
                  Quarterly production records
                </p>
              </div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
                    <th className="text-left px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Year</th>
                    <th className="text-left px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Quarter</th>
                    <th className="text-right px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Production</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {[...quarterlyData].reverse().map((d, i) => <tr key={i} className={i === 0 ? "bg-[var(--hw-neutral-50)]" : ""}>
                      <td className="px-4 py-2.5 font-medium text-[var(--hw-neutral-700)]">
                        {d.year}
                        {i === 0 && <span className="ml-1.5 text-[10px] font-semibold text-[var(--hw-green-700)]">Latest</span>}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--hw-neutral-900)]">{quarter}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-[var(--hw-neutral-900)]">
                        {d.production.toLocaleString()} tons
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </>}

        {
    /* ── ANNUAL VIEW ───────────────────────────────────────────────── */
  }
        {view === "annual" && <>
            {
    /* Annual insight */
  }
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] border-l-4 border-l-[var(--hw-green-600)] p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-[var(--hw-green-700)]">
                <TrendingUp className="w-5 h-5" />
                <span className="font-semibold">Annual production pattern</span>
              </div>
              <p className="text-[var(--hw-neutral-900)] leading-relaxed">
                {commodity.name} production was highest in{" "}
                <strong>{bestYear.year} at {bestYear.total.toLocaleString()} tons</strong>,
                with {QUARTER_LABELS[bestQ].split(" ")[0]} contributing the largest share in {SOURCE_LABELS[location].toLowerCase()}.
              </p>
              <div>
                <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">Suggested action</p>
                <p className="text-[13px] text-[var(--hw-neutral-700)] leading-relaxed mt-0.5">
                  Based on historical production, review the full planting assessment to see how seasonal production interacts with market prices and other factors.
                </p>
              </div>
            </div>

            {
    /* Stacked bar chart */
  }
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
                  Annual production by quarter
                </p>
                <p className="text-[12px] text-[var(--hw-neutral-700)] mt-0.5">
                  Historical production from {SOURCE_LABELS[location].toLowerCase()}.
                </p>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={annualData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barSize={22}>
                    <CartesianGrid vertical={false} stroke="var(--hw-neutral-100)" />
                    <XAxis dataKey="year" tick={{ fill: "var(--hw-neutral-400)", fontSize: 10 }} stroke="var(--hw-neutral-200)" tickLine={false} />
                    <YAxis tick={{ fill: "var(--hw-neutral-400)", fontSize: 10 }} stroke="none" />
                    <Tooltip
    contentStyle={tooltipStyle}
    formatter={(v, name) => [`${v.toLocaleString()} tons`, name]}
    labelFormatter={(l) => `Year ${l}`}
  />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {QUARTERS.map((q) => <Bar
    key={q}
    dataKey={q}
    stackId="a"
    fill={Q_COLORS[q]}
    radius={q === "Q4" ? [3, 3, 0, 0] : void 0}
  />)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[12px] text-[var(--hw-neutral-700)]">Values in tons · {SOURCE_LABELS[location]}</p>
            </div>

            {
    /* Annual table — 40 rows scrollable, min 10 visible */
  }
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--hw-neutral-100)]">
                <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
                  Annual production records
                </p>
              </div>
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
                    <th className="text-left px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Year</th>
                    <th className="text-left px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Quarter</th>
                    <th className="text-right px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Production</th>
                  </tr>
                </thead>
              </table>
              <div className="overflow-y-auto" style={{ maxHeight: "400px", scrollbarWidth: "thin" }}>
                <table className="w-full text-[13px]">
                  <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                    {annualTableRows.map((r, i) => <tr key={i} className={r.year === 2025 ? "bg-[var(--hw-neutral-50)]" : ""}>
                        <td className="px-4 py-2 font-medium text-[var(--hw-neutral-700)]">{r.year}</td>
                        <td className="px-4 py-2 text-[var(--hw-neutral-900)]">{r.quarter}</td>
                        <td className="px-4 py-2 text-right font-semibold text-[var(--hw-neutral-900)]">
                          {r.production.toLocaleString()} tons
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </>}

        {
    /* Source and limitation */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-[var(--hw-neutral-700)] flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">
              Historical production provides seasonal context and does not predict the exact amount that will be produced this year.
            </p>
          </div>
          <div className="pt-1 space-y-0.5 text-[12px] text-[var(--hw-neutral-700)]">
            <p>Source: PSA OpenStat</p>
            <p>Default source location: Davao City · Other available locations: Davao del Sur and Bukidnon</p>
            <p>Coverage: Quarterly historical production records · Available years: 2016–present</p>
            <p>Last updated: Jun 24, 2026</p>
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
    onClick={() => navigate("/farmer/assess")}
    className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
  >
            Assess now
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {
    /* Filter drawer */
  }
      <FilterDrawer
    open={drawerOpen}
    filters={filters}
    onClose={() => setDrawerOpen(false)}
    onApply={(f) => setFilters(f)}
  />
    </div>;
}
export {
  SeasonalProductionDetailsPage as default
};
