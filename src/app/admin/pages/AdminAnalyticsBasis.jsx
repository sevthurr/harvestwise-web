import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ChevronLeft, ChevronDown, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import {
  RESULTS,
  CLASSIFICATION_COLORS
} from "../components/analytics/adminAnalyticsMockData";
function generateDatasets(module, commodity, variant) {
  if (module === "Price Outlook") {
    const markets = ["Bangkerohan", "DFTC Retail", "DFTC Wholesale"];
    const types = ["Retail", "Wholesale"];
    const rows2 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(2026, 5, 1 + i);
      const ds = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const mkt = markets[i % 3];
      const row = {
        Date: ds,
        Commodity: commodity,
        Market: mkt,
        "Price Type": types[i % 2],
        Price: `\u20B1${60 + Math.round(Math.random() * 40)}/kg`,
        Source: mkt.startsWith("Bangkerohan") ? "Bangkerohan Market" : "DFTC"
      };
      if (variant) row["Variety"] = variant;
      return row;
    });
    const cols = variant ? ["Date", "Commodity", "Variety", "Market", "Price Type", "Price", "Source"] : ["Date", "Commodity", "Market", "Price Type", "Price", "Source"];
    return { columns: cols, rows: rows2 };
  }
  if (module === "Arrival Pressure") {
    const rows2 = Array.from({ length: 26 }, (_, i) => {
      const d = new Date(2026, 0, 4 + i * 7);
      const ds = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const row = {
        "Week Ending": ds,
        Commodity: commodity,
        "Arrival Volume": `${(28 + Math.round(Math.random() * 18)).toFixed(1)}`,
        Unit: "MT/week",
        Source: "DFTC Arrival Records"
      };
      if (variant) row["Variety"] = variant;
      return row;
    });
    const cols = variant ? ["Week Ending", "Commodity", "Variety", "Arrival Volume", "Unit", "Source"] : ["Week Ending", "Commodity", "Arrival Volume", "Unit", "Source"];
    return { columns: cols, rows: rows2 };
  }
  if (module === "Historical Seasonal Production Level") {
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    const locations = ["Bukidnon", "Benguet", "Nueva Vizcaya", "Davao del Sur"];
    const rows2 = Array.from({ length: 24 }, (_, i) => ({
      Year: `${2020 + Math.floor(i / 4)}`,
      Quarter: quarters[i % 4],
      Commodity: commodity,
      "Source Location": locations[i % 4],
      "Production Volume": `${(180 + Math.round(Math.random() * 120)).toFixed(0)}`,
      Unit: "MT"
    }));
    return { columns: ["Year", "Quarter", "Commodity", "Source Location", "Production Volume", "Unit"], rows: rows2 };
  }
  const rows = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(2026, 5, 1 + i);
    const ds = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return {
      Date: ds,
      Location: "Barangay Buda, Davao City",
      Rainfall: `${(Math.random() * 25).toFixed(1)} mm`,
      Temperature: `${(22 + Math.random() * 10).toFixed(1)}\xB0C`,
      Humidity: `${70 + Math.round(Math.random() * 20)}%`,
      Wind: `${10 + Math.round(Math.random() * 30)} km/h`,
      Source: "Open-Meteo API"
    };
  });
  return { columns: ["Date", "Location", "Rainfall", "Temperature", "Humidity", "Wind", "Source"], rows };
}
const PAGE_SIZE = 20;
const DatasetsUsed = ({ module, commodity, variant }) => {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const { columns, rows } = generateDatasets(module, commodity, variant);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      <button
    onClick={() => {
      setExpanded((v) => !v);
      setPage(1);
    }}
    className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
  >
        <div>
          <p className="text-[13px] font-semibold text-[var(--hw-neutral-800)]">Datasets Used</p>
          {!expanded && <p className="text-[12px] text-[var(--hw-neutral-700)] mt-0.5">View source records used for this result.</p>}
        </div>
        <ChevronDown className={`w-4 h-4 text-[var(--hw-neutral-700)] flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && <>
          <div className="border-t border-[var(--hw-neutral-100)] overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                <tr>
                  {columns.map((c) => <th key={c} className="px-3 py-2.5 text-left font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">{c}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                {pageRows.map((row, i) => <tr key={i} className="hover:bg-[var(--hw-neutral-50)] transition-colors">
                    {columns.map((c) => <td key={c} className="px-3 py-2.5 text-[var(--hw-neutral-700)] whitespace-nowrap">{row[c]}</td>)}
                  </tr>)}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-[var(--hw-neutral-100)]">
              <p className="text-[12px] text-[var(--hw-neutral-700)]">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length} records
              </p>
              <div className="flex items-center gap-1">
                <button
    disabled={page === 1}
    onClick={() => setPage((p) => p - 1)}
    className="px-2.5 py-1 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => <button
    key={p}
    onClick={() => setPage(p)}
    className={`px-2.5 py-1 text-[12px] border rounded-lg transition-colors ${p === page ? "border-[var(--hw-green-600)] bg-[var(--hw-green-700)] text-white" : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                    {p}
                  </button>)}
                <button
    disabled={page === totalPages}
    onClick={() => setPage((p) => p + 1)}
    className="px-2.5 py-1 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
                  Next
                </button>
              </div>
            </div>}
        </>}
    </div>;
};
function AdminAnalyticsBasis() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const result = RESULTS.find((r) => r.id === resultId);
  if (!result) {
    return <div className="px-4 py-16 text-center space-y-3">
        <p className="text-[var(--hw-neutral-500)]">Result not found.</p>
        <button
      onClick={() => navigate("/admin/analytics")}
      className="text-[var(--hw-green-700)] text-[13px] font-medium hover:underline"
    >
          ← Back to Analytics
        </button>
      </div>;
  }
  const classColor = CLASSIFICATION_COLORS[result.classification] ?? "text-[var(--hw-neutral-700)]";
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-[900px] mx-auto space-y-5">

        {
    /* Page header */
  }
        <div>
          <button
    onClick={() => navigate("/admin/analytics")}
    className="flex items-center gap-1 text-[13px] text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-700)] transition-colors mb-4"
  >
            <ChevronLeft className="w-4 h-4" />
            Back to Analytics
          </button>
          <h1 className="text-[22px] font-bold text-[var(--hw-neutral-900)]">
            {result.module} Basis
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-[14px] text-[var(--hw-neutral-800)] font-medium">{result.commodity}</span>
            {result.variant && <span className="text-[12px] text-[var(--hw-neutral-500)] bg-[var(--hw-neutral-100)] px-2 py-0.5 rounded-full">{result.variant}</span>}
            <span className="text-[var(--hw-neutral-300)]">·</span>
            <span className={`text-[14px] font-semibold ${classColor}`}>{result.classification}</span>
          </div>
        </div>

        {
    /* 1. Summary */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Summary</p>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-4">
            {[
    { label: "ID", value: result.outputId, color: "", mono: true },
    { label: "Module", value: result.module, color: "" },
    { label: "Commodity", value: result.commodity, color: "" },
    ...result.variant ? [{ label: "Variety", value: result.variant, color: "", mono: false }] : [],
    { label: "Data source", value: result.basisSource, color: "" },
    { label: "Input period", value: result.inputPeriod, color: "" },
    { label: "Calculation date", value: result.processedAt, color: "" },
    { label: "Classification", value: result.classification, color: classColor }
  ].map((row) => <div key={row.label}>
                <p className="text-[12px] text-[var(--hw-neutral-700)]">{row.label}</p>
                <p className={`text-[13px] font-medium mt-0.5 ${row.color || "text-[var(--hw-neutral-800)]"} ${row.mono ? "font-mono" : ""}`}>
                  {row.value}
                </p>
              </div>)}
          </div>
        </div>

        {
    /* 2. Input Values */
  }
        {Object.keys(result.basisInputs).length > 0 && <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
              <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Input Values</p>
            </div>
            <div className="divide-y divide-[var(--hw-neutral-100)]">
              {Object.entries(result.basisInputs).map(([key, val]) => <div key={key} className="flex justify-between gap-4 px-5 py-3">
                  <span className="text-[13px] text-[var(--hw-neutral-800)]">{key}</span>
                  <span className="text-[13px] font-medium text-[var(--hw-neutral-800)] text-right">{val}</span>
                </div>)}
            </div>
          </div>}

        {
    /* 3. Datasets Used */
  }
        <DatasetsUsed module={result.module} commodity={result.commodity} variant={result.variant} />

        {
    /* 4. Rule Used */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Rule Used</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[14px] text-[var(--hw-neutral-700)] leading-relaxed">{result.ruleUsed}</p>
          </div>
        </div>

        {
    /* 5. Threshold Applied */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Threshold Applied</p>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {result.thresholds.map((t) => {
    const tc = CLASSIFICATION_COLORS[t.classification] ?? "text-[var(--hw-neutral-700)]";
    return <div key={t.classification} className="flex items-center gap-4 px-5 py-3">
                  <span className={`text-[13px] font-semibold flex-shrink-0 ${tc}`}>{t.classification}</span>
                  <span className="text-[13px] text-[var(--hw-neutral-800)]">{t.rule}</span>
                </div>;
  })}
          </div>
        </div>

        {
    /* 6. Result Explanation */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Result Explanation</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[14px] font-medium text-[var(--hw-neutral-800)] leading-relaxed">
              {result.resultExplanation}
            </p>
          </div>
        </div>

        {
    /* 7. Recommendation Impact */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Recommendation Impact</p>
          </div>
          <div className="px-5 py-4">
            <div
    className={`flex items-start gap-3 ${result.recommendationImpactType === "supports" ? "text-emerald-700" : result.recommendationImpactType === "caution" ? "text-amber-700" : "text-red-700"}`}
  >
              {result.recommendationImpactType === "supports" ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" /> : result.recommendationImpactType === "caution" ? <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide opacity-70 mb-0.5">
                  Impact on recommendation
                </p>
                <p className="text-[14px] font-medium">{result.recommendationImpact}</p>
              </div>
            </div>
          </div>
        </div>

        {
    /* Missing data warning */
  }
        {result.basisMissing && <div className="flex items-start gap-2.5 border border-amber-200 rounded-2xl px-4 py-3.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-amber-700 leading-relaxed">{result.basisMissing}</p>
          </div>}

      </div>
    </div>;
}
export {
  AdminAnalyticsBasis as default
};
