import { PageHeader } from "../../global/components/shared/PageHeader";
import { useNavigate } from "react-router";
import {
  PenLine,
  Truck,
  Upload,
  ChevronRight,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  AlertTriangle
} from "lucide-react";
const RECENT_SAVED = [
  { id: "DATA-2026-0802-001", name: "Daily Retail Prices", market: "Bangkerohan", entryMethod: "Manual Input", savedAt: "Aug 2, 10:15 AM", records: 94, status: "Saved" },
  { id: "DATA-2026-0802-002", name: "DFTC Arrival Volume", market: "DFTC", entryMethod: "Manual Input", savedAt: "Aug 2, 8:56 AM", records: 22, status: "Saved" },
  { id: "DATA-2026-0801-003", name: "Daily Wholesale Prices", market: "Bangkerohan", entryMethod: "File Upload", savedAt: "Aug 1, 5:10 PM", records: 45, status: "Saved" }
];
const STATUS_ROWS = [
  { requirement: "Retail Prices", market: "Bangkerohan Public Market", status: "Saved", lastSaved: "10:15 AM", savedDatasetId: "DATA-2026-0802-001" },
  { requirement: "Wholesale Prices", market: "Bangkerohan Public Market", status: "Saved", lastSaved: "9:44 AM", savedDatasetId: "DATA-2026-0801-003" },
  { requirement: "Landing Prices", market: "Bangkerohan Public Market", status: "Not Encoded", lastSaved: "\u2014", entryPath: "/dftc/input" },
  { requirement: "Retail Prices", market: "DFTC Taboan", status: "Saved", lastSaved: "9:30 AM", savedDatasetId: "DATA-2026-0802-001" },
  { requirement: "Wholesale Prices", market: "DFTC Taboan", status: "Needs Correction", lastSaved: "9:20 AM", historyDatasetId: "DATA-2026-0801-003" },
  { requirement: "Arrival Volume", market: "DFTC", status: "Saved", lastSaved: "8:56 AM", savedDatasetId: "DATA-2026-0802-002" }
];
const ATTENTION_ITEMS = [
  { label: "8 price records need correction", action: "Review Records", path: "/dftc/submissions" },
  { label: "3 duplicate records were detected", action: "Review Duplicates", path: "/dftc/submissions" },
  { label: "Bangkerohan landing prices not yet entered", action: "Continue Entry", path: "/dftc/input" },
  { label: "One uploaded file failed validation", action: "Retry Upload", path: "/dftc/input" }
];
const PRICE_MOVEMENTS = [
  { name: "Kamatis", price: "\u20B185/kg", change: "+3.7%", dir: "up" },
  { name: "Repolyo", price: "\u20B160/kg", change: "-2.4%", dir: "down" },
  { name: "Talong", price: "\u20B172/kg", change: "No change", dir: "flat" }
];
function StatusBadge({ status }) {
  if (status === "Saved") {
    return <span className="flex items-center gap-1.5">
        <CheckCircle className="w-3.5 h-3.5 text-[var(--hw-green-700)] shrink-0" />
        <span className="text-[13px] text-[var(--hw-green-700)] font-medium">Saved</span>
      </span>;
  }
  if (status === "Needs Correction") {
    return <span className="flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
        <span className="text-[13px] text-orange-700 font-medium">Needs Correction</span>
      </span>;
  }
  return <span className="flex items-center gap-1.5">
      <Clock className="w-3.5 h-3.5 text-[var(--hw-neutral-500)] shrink-0" />
      <span className="text-[13px] text-[var(--hw-neutral-800)] font-medium">Not Encoded</span>
    </span>;
}
function DFTCHome() {
  const navigate = useNavigate();
  const today = (/* @__PURE__ */ new Date("2026-08-02")).toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  function handleRowClick(row) {
    if (row.status === "Saved" && row.savedDatasetId) {
      navigate(`/dftc/submissions/${row.savedDatasetId}`);
    } else if (row.status === "Not Encoded" && row.entryPath) {
      navigate(row.entryPath);
    } else if (row.status === "Needs Correction" && row.historyDatasetId) {
      navigate(`/dftc/submissions/${row.historyDatasetId}`);
    }
  }
  const hasAttentionItems = ATTENTION_ITEMS.length > 0;
  return <div className="px-4 md:px-8 lg:px-10 py-5 max-w-[1240px] mx-auto space-y-5">

      {
    /* ── Header ── */
  }
      <PageHeader
    title="Good morning, DFTC"
    description="Review today's market-data activity and continue encoding or uploading records."
    meta={today}
  />

      {
    /* ── Operational Summary Cards ── */
  }
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
    onClick={() => navigate("/dftc/input")}
    className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
          <p className="text-[28px] font-bold text-[var(--hw-neutral-900)] leading-none">94</p>
          <p className="text-[13px] text-[var(--hw-neutral-800)] mt-1.5">Price Records Today</p>
        </button>
        <button
    onClick={() => navigate("/dftc/input")}
    className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
          <p className="text-[28px] font-bold text-[var(--hw-neutral-900)] leading-none">22</p>
          <p className="text-[13px] text-[var(--hw-neutral-800)] mt-1.5">Arrival Records Today</p>
        </button>
        <button
    onClick={() => navigate("/dftc/submissions")}
    className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
          <p className="text-[28px] font-bold text-[var(--hw-green-700)] leading-none">3</p>
          <p className="text-[13px] text-[var(--hw-neutral-800)] mt-1.5">Datasets Saved Today</p>
        </button>
        <button
    onClick={() => navigate("/dftc/submissions")}
    className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
          <p className="text-[28px] font-bold text-orange-600 leading-none">8</p>
          <p className="text-[13px] text-[var(--hw-neutral-800)] mt-1.5">Needs Correction</p>
        </button>
      </div>

      {
    /* ── Quick Actions ── */
  }
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
    onClick={() => navigate("/dftc/price-input")}
    className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-colors flex items-center gap-4"
  >
          <div className="p-2.5 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <PenLine className="w-5 h-5 text-[var(--hw-green-700)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Encode Price Data</p>
            <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">Encode daily commodity market prices</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />
        </button>
        <button
    onClick={() => navigate("/dftc/arrival-input")}
    className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-colors flex items-center gap-4"
  >
          <div className="p-2.5 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <Truck className="w-5 h-5 text-[var(--hw-green-700)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Encode Arrival Volume</p>
            <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">Encode DFTC commodity arrival volumes</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />
        </button>
        <button
    onClick={() => navigate("/dftc/upload")}
    className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-colors flex items-center gap-4"
  >
          <div className="p-2.5 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <Upload className="w-5 h-5 text-[var(--hw-green-700)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Upload Dataset</p>
            <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">Import an Excel or CSV dataset</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />
        </button>
      </div>

      {
    /* ── Today's Data Status ── */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--hw-neutral-100)]">
          <p className="font-semibold text-[var(--hw-neutral-900)]">Today's Data Status</p>
          <p className="text-[13px] text-[var(--hw-neutral-800)] mt-0.5">Check which daily market datasets have already been encoded or uploaded.</p>
        </div>

        {
    /* Desktop table */
  }
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
              <tr>
                <th className="px-5 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)]">Data Requirement</th>
                <th className="px-5 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)]">Market / Facility</th>
                <th className="px-5 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)]">Status</th>
                <th className="px-5 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)]">Last Saved</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {STATUS_ROWS.map((row, i) => <tr
    key={i}
    onClick={() => handleRowClick(row)}
    className="border-b border-[var(--hw-neutral-100)] last:border-0 hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
  >
                  <td className="px-5 py-3.5 text-[14px] font-medium text-[var(--hw-neutral-900)]">{row.requirement}</td>
                  <td className="px-5 py-3.5 text-[13px] text-[var(--hw-neutral-800)]">{row.market}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={row.status} /></td>
                  <td className="px-5 py-3.5 text-[13px] text-[var(--hw-neutral-800)]">{row.lastSaved}</td>
                  <td className="px-5 py-3.5 text-right">
                    <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] ml-auto" />
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>

        {
    /* Mobile cards */
  }
        <div className="md:hidden divide-y divide-[var(--hw-neutral-100)]">
          {STATUS_ROWS.map((row, i) => <button
    key={i}
    onClick={() => handleRowClick(row)}
    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[var(--hw-neutral-900)]">{row.requirement}</p>
                <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">{row.market}</p>
                <div className="mt-1.5 flex items-center gap-3">
                  <StatusBadge status={row.status} />
                  <span className="text-[12px] text-[var(--hw-neutral-800)]">{row.lastSaved}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />
            </button>)}
        </div>
      </div>

      {
    /* ── Needs Attention ── */
  }
      {hasAttentionItems && <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--hw-neutral-100)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
            <p className="font-semibold text-[var(--hw-neutral-900)]">Needs Attention</p>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {ATTENTION_ITEMS.map((item, i) => <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <p className="text-[13px] text-[var(--hw-neutral-800)]">{item.label}</p>
                <button
    onClick={() => navigate(item.path)}
    className="shrink-0 flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors whitespace-nowrap"
  >
                  {item.action}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>)}
          </div>
        </div>}

      {
    /* ── Recent Saved Data ── */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--hw-neutral-100)] flex items-center justify-between">
          <p className="font-semibold text-[var(--hw-neutral-900)]">Recent Saved Data</p>
          <button
    onClick={() => navigate("/dftc/submissions")}
    className="text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
            View Data History
          </button>
        </div>
        <div className="divide-y divide-[var(--hw-neutral-100)]">
          {RECENT_SAVED.map((row) => <button
    key={row.id}
    onClick={() => navigate(`/dftc/submissions/${row.id}`)}
    className="w-full px-5 py-3.5 flex items-center gap-4 text-left hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-[var(--hw-neutral-900)] truncate">{row.name}</p>
                <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">
                  {row.market} · {row.entryMethod} · {row.savedAt}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-medium text-[var(--hw-neutral-900)]">{row.records} records</p>
                <p className="text-[12px] text-[var(--hw-green-700)] mt-0.5">{row.status}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />
            </button>)}
        </div>
      </div>

      {
    /* ── Market Snapshot ── */
  }
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {
    /* Price Movement */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-[var(--hw-neutral-900)]">Price Movement</p>
            <TrendingUp className="w-4 h-4 text-[var(--hw-neutral-400)]" />
          </div>
          <div className="space-y-3">
            {PRICE_MOVEMENTS.map((item) => <div key={item.name} className="flex items-center justify-between">
                <span className="text-[14px] font-medium text-[var(--hw-neutral-900)]">{item.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[14px] text-[var(--hw-neutral-800)]">{item.price}</span>
                  <span className={`text-[13px] font-medium w-20 text-right ${item.dir === "up" ? "text-[var(--hw-green-700)]" : item.dir === "down" ? "text-red-600" : "text-[var(--hw-neutral-800)]"}`}>
                    {item.dir === "up" ? "\u2191 " : item.dir === "down" ? "\u2193 " : ""}{item.change}
                  </span>
                </div>
              </div>)}
          </div>
          <button
    onClick={() => navigate("/dftc/trends")}
    className="mt-4 flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
            View Price Trends <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {
    /* Latest Arrival Volume */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-[var(--hw-neutral-900)]">Latest Arrival Volume</p>
            <Truck className="w-4 h-4 text-[var(--hw-neutral-400)]" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--hw-neutral-800)]">Reporting Period</span>
              <span className="text-[14px] font-medium text-[var(--hw-neutral-900)]">Jul 2026</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--hw-neutral-800)]">Combined Volume</span>
              <span className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">22,367 kg</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--hw-neutral-800)]">Farm Source</span>
              <span className="text-[14px] text-[var(--hw-neutral-800)]">15,300 kg</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--hw-neutral-800)]">Other Source</span>
              <span className="text-[14px] text-[var(--hw-neutral-800)]">7,067 kg</span>
            </div>
          </div>
          <button
    onClick={() => navigate("/dftc/trends")}
    className="mt-4 flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
            View Arrival Volume Trends <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>;
}
export {
  DFTCHome as default
};
