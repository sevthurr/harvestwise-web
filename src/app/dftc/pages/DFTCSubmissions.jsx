import { PageHeader } from "../../global/components/shared/PageHeader";
import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { ChevronDown } from "lucide-react";
import { DATASETS } from "./dftc-submissions-data";
const selectCls = [
  "w-full px-3 py-2 text-[14px] border border-[var(--hw-neutral-200)] rounded-lg bg-white",
  "text-[var(--hw-neutral-800)] focus:outline-none focus:border-[var(--hw-green-600)]",
  "focus:ring-1 focus:ring-[var(--hw-green-600)] transition-colors appearance-none"
].join(" ");
const inputCls = [
  "w-full px-3 py-2 text-[14px] border border-[var(--hw-neutral-200)] rounded-lg bg-white",
  "text-[var(--hw-neutral-800)] focus:outline-none focus:border-[var(--hw-green-600)]",
  "focus:ring-1 focus:ring-[var(--hw-green-600)] transition-colors"
].join(" ");
const labelCls = "block text-[13px] font-medium text-[var(--hw-neutral-800)] mb-1";
const TODAY_ISO = "2026-08-06";
const PAGE_SIZE = 20;
function getCutoff(preset) {
  if (preset === "all" || preset === "custom") return null;
  const d = new Date(TODAY_ISO);
  d.setDate(d.getDate() - (preset === "7d" ? 7 : preset === "14d" ? 14 : 28));
  return d.toISOString().slice(0, 10);
}
function applyFilters(rows, datasetType, savedBy, datePreset, customFrom, customTo, statusFilter) {
  const cutoff = getCutoff(datePreset);
  return rows.filter((r) => {
    if (datasetType && r.datasetType !== datasetType) return false;
    if (savedBy && !r.savedBy.toLowerCase().includes(savedBy.toLowerCase())) return false;
    if (datePreset === "custom") {
      if (customFrom && r.savedIso < customFrom) return false;
      if (customTo && r.savedIso > customTo) return false;
    } else if (cutoff) {
      if (r.savedIso < cutoff) return false;
    }
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });
}
function DateCombobox({ value, customFrom, customTo, onChange }) {
  const [open, setOpen] = useState(false);
  const [popOpen, setPopOpen] = useState(false);
  const [pendingFrom, setPFrom] = useState("");
  const [pendingTo, setPTo] = useState("");
  const containerRef = useRef(null);
  useEffect(() => {
    function h(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setPopOpen(false);
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(iso) {
    const p = iso.split("-");
    return p.length === 3 ? `${MONTHS[parseInt(p[1]) - 1]} ${parseInt(p[2])}` : iso;
  }
  const displayLabel = value === "all" ? "All Records" : value === "7d" ? "Last 7 days" : value === "14d" ? "Last 14 days" : value === "28d" ? "Last 28 days" : customFrom && customTo ? `${fmtDate(customFrom)}\u2013${fmtDate(customTo)}` : "Custom";
  const OPTIONS = [
    { key: "all", label: "All Records" },
    { key: "7d", label: "Last 7 days" },
    { key: "14d", label: "Last 14 days" },
    { key: "28d", label: "Last 28 days" },
    { key: "custom", label: "Custom" }
  ];
  const invalidRange = !!(pendingFrom && pendingTo && pendingTo < pendingFrom);
  return <div ref={containerRef} className="relative w-full">
      <button
    type="button"
    onClick={() => {
      setOpen((o) => !o);
      setPopOpen(false);
    }}
    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[14px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)] hover:border-[var(--hw-neutral-300)] focus:outline-none transition-colors"
  >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={14} className={`text-[var(--hw-neutral-800)] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && <div className="absolute left-0 top-full mt-1 z-30 w-44 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg py-1">
          {OPTIONS.map((opt) => <button
    key={opt.key}
    type="button"
    onClick={() => {
      if (opt.key === "custom") {
        setPFrom(customFrom);
        setPTo(customTo);
        setOpen(false);
        setPopOpen(true);
      } else {
        onChange(opt.key);
        setOpen(false);
      }
    }}
    className={`w-full text-left px-4 py-2.5 text-[14px] transition-colors ${value === opt.key ? "bg-[var(--hw-green-50)] text-[var(--hw-green-800)] font-medium" : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
              {opt.label}
            </button>)}
        </div>}

      {popOpen && <div className="absolute left-0 top-full mt-1 z-30 w-64 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-3">
          <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mb-2">Select Date Range</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Start</label>
              <input
    type="date"
    value={pendingFrom}
    onChange={(e) => setPFrom(e.target.value)}
    className="w-full px-2 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)] focus:outline-none"
  />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">End</label>
              <input
    type="date"
    value={pendingTo}
    onChange={(e) => setPTo(e.target.value)}
    className="w-full px-2 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)] focus:outline-none"
  />
            </div>
          </div>
          {invalidRange && <p className="text-[12px] text-red-500 mb-2">End date must not be before start date.</p>}
          <div className="flex gap-2 justify-end">
            <button
    onClick={() => setPopOpen(false)}
    className="px-3 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)]"
  >
              Cancel
            </button>
            <button
    disabled={!pendingFrom || !pendingTo || invalidRange}
    onClick={() => {
      onChange("custom", pendingFrom, pendingTo);
      setPopOpen(false);
    }}
    className="px-3 py-1.5 text-[12px] bg-[var(--hw-green-600)] text-white rounded-lg disabled:opacity-50"
  >
              Apply
            </button>
          </div>
        </div>}
    </div>;
}
function Pagination({ page, total, onChange }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  return <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-3.5 border-t border-[var(--hw-neutral-100)]">
      <p className="text-[13px] text-[var(--hw-neutral-800)]">
        Showing {start}–{end} of {total} datasets
      </p>
      {pages > 1 && <div className="flex gap-1.5 items-center">
          <button
    disabled={page === 1}
    onClick={() => onChange(page - 1)}
    className="px-3 py-1.5 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
            Prev
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => <button
    key={p}
    onClick={() => onChange(p)}
    className={`px-3 py-1.5 text-[13px] border rounded-lg transition-colors ${p === page ? "border-[var(--hw-green-600)] bg-[var(--hw-green-700)] text-white" : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
              {p}
            </button>)}
          <button
    disabled={page === pages}
    onClick={() => onChange(page + 1)}
    className="px-3 py-1.5 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
            Next
          </button>
        </div>}
    </div>;
}
function DFTCHistory() {
  const navigate = useNavigate();
  const [datasetType, setDatasetType] = useState("");
  const [savedBy, setSavedBy] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () => applyFilters(DATASETS, datasetType, savedBy, datePreset, customFrom, customTo, statusFilter),
    [datasetType, savedBy, datePreset, customFrom, customTo, statusFilter]
  );
  useEffect(() => {
    setPage(1);
  }, [datasetType, savedBy, datePreset, customFrom, customTo, statusFilter]);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilter = !!(datasetType || savedBy || datePreset !== "all" || statusFilter);
  function clearAll() {
    setDatasetType("");
    setSavedBy("");
    setDatePreset("all");
    setCustomFrom("");
    setCustomTo("");
    setStatusFilter("");
  }
  const TABLE_HEADERS = [
    "Dataset ID",
    "Dataset Type",
    "Saved By",
    "Saved Date",
    "Total",
    "Analytics-Supported",
    "Other Commodities",
    "Needs Correction",
    "Duplicates",
    "Status"
  ];
  return <div className="px-4 md:px-8 lg:px-10 py-5 max-w-[1240px] mx-auto space-y-5">

      {
    /* Header */
  }
      <PageHeader
    title="Submission History"
    description="Review previously saved or uploaded datasets by DFTC personnel."
  />

      {
    /* Filters — compact one-row card */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-3.5">
        <div className="flex flex-col sm:flex-row flex-wrap lg:flex-nowrap gap-3 items-end">

          {
    /* Dataset Type */
  }
          <div className="w-full sm:w-auto flex-1 min-w-[150px]">
            <label className={labelCls}>Dataset Type</label>
            <select className={selectCls} value={datasetType} onChange={(e) => setDatasetType(e.target.value)}>
              <option value="">All Types</option>
              <option>Daily Retail Prices</option>
              <option>Daily Wholesale Prices</option>
              <option>Daily Landing Prices</option>
              <option>DFTC Arrival Volume</option>
            </select>
          </div>

          {
    /* Saved By */
  }
          <div className="w-full sm:w-auto flex-1 min-w-[150px]">
            <label className={labelCls}>Saved By</label>
            <input
    className={inputCls}
    placeholder="All personnel"
    value={savedBy}
    onChange={(e) => setSavedBy(e.target.value)}
  />
          </div>

          {
    /* Date */
  }
          <div className="w-full sm:w-auto flex-1 min-w-[150px]">
            <label className={labelCls}>Date</label>
            <DateCombobox
    value={datePreset}
    customFrom={customFrom}
    customTo={customTo}
    onChange={(v, from, to) => {
      setDatePreset(v);
      if (from !== void 0) setCustomFrom(from);
      if (to !== void 0) setCustomTo(to);
    }}
  />
          </div>

          {
    /* Status */
  }
          <div className="w-full sm:w-auto flex-1 min-w-[120px]">
            <label className={labelCls}>Status</label>
            <select className={selectCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option>Draft</option>
              <option>Saved</option>
              <option>Failed</option>
            </select>
          </div>

        </div>

        {hasFilter && <button
    onClick={clearAll}
    className="mt-2.5 text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
  >
            Clear filters
          </button>}
      </div>

      {
    /* Result count */
  }
      <p className="text-[13px] text-[var(--hw-neutral-800)]">
        {hasFilter ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} \xB7 filtered` : `${DATASETS.length} datasets`}
      </p>

      {
    /* Empty state */
  }
      {filtered.length === 0 && <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] py-12 text-center">
          <p className="text-[14px] text-[var(--hw-neutral-800)]">No datasets match the selected filters.</p>
          <button
    onClick={clearAll}
    className="mt-2 text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70"
  >
            Clear filters
          </button>
        </div>}

      {
    /* ── Desktop table ── */
  }
      {filtered.length > 0 && <div className="hidden md:block bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                <tr>
                  {TABLE_HEADERS.map((h) => <th key={h} className="px-4 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">
                      {h}
                    </th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                {pageRows.map((r) => <tr
    key={r.datasetId}
    onClick={() => navigate(`/dftc/submissions/${r.datasetId}`)}
    className="cursor-pointer hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
                    <td className="px-4 py-3 whitespace-nowrap text-[14px] font-medium text-[var(--hw-neutral-900)]">{r.datasetId}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[var(--hw-neutral-800)]">{r.datasetType}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[var(--hw-neutral-800)]">{r.savedBy}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[var(--hw-neutral-800)]">{r.savedDateTime}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[var(--hw-neutral-800)]">{r.totalRecords}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[var(--hw-neutral-800)]">{r.analyticsSupported}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[var(--hw-neutral-800)]">{r.otherCommodities}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[var(--hw-neutral-800)]">{r.needsCorrection}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[var(--hw-neutral-800)]">{r.duplicate}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[14px] font-medium text-[var(--hw-neutral-900)]">{r.status}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={filtered.length} onChange={setPage} />
        </div>}

      {
    /* ── Mobile cards ── */
  }
      {filtered.length > 0 && <div className="md:hidden space-y-3">
          {pageRows.map((r) => <button
    key={r.datasetId}
    onClick={() => navigate(`/dftc/submissions/${r.datasetId}`)}
    className="w-full bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left hover:bg-[var(--hw-neutral-50)] active:scale-[.99] transition-all"
  >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">{r.datasetId}</p>
                  <p className="text-[14px] text-[var(--hw-neutral-800)] mt-0.5">{r.datasetType}</p>
                </div>
                <span className="text-[13px] font-medium text-[var(--hw-neutral-800)] flex-shrink-0">{r.status}</span>
              </div>
              <div className="text-[13px] text-[var(--hw-neutral-800)] space-y-0.5">
                <p>{r.savedDateTime} · {r.savedBy}</p>
                <p className="flex flex-wrap gap-3 mt-1">
                  <span>{r.totalRecords} total</span>
                  <span>{r.analyticsSupported} analytics</span>
                  <span>{r.otherCommodities} other</span>
                  {r.needsCorrection > 0 && <span>{r.needsCorrection} needs correction</span>}
                  {r.duplicate > 0 && <span>{r.duplicate} duplicate</span>}
                </p>
              </div>
            </button>)}
          {Math.ceil(filtered.length / PAGE_SIZE) > 1 && <div className="flex justify-center gap-2 pt-2">
              <button
    disabled={page === 1}
    onClick={() => setPage((p) => p - 1)}
    className="px-3 py-1.5 border border-[var(--hw-neutral-200)] rounded-lg text-[13px] text-[var(--hw-neutral-800)] disabled:opacity-40 transition-colors"
  >
                Prev
              </button>
              <span className="px-3 py-1.5 text-[13px] text-[var(--hw-neutral-800)]">
                {page} / {Math.ceil(filtered.length / PAGE_SIZE)}
              </span>
              <button
    disabled={page === Math.ceil(filtered.length / PAGE_SIZE)}
    onClick={() => setPage((p) => p + 1)}
    className="px-3 py-1.5 border border-[var(--hw-neutral-200)] rounded-lg text-[13px] text-[var(--hw-neutral-800)] disabled:opacity-40 transition-colors"
  >
                Next
              </button>
            </div>}
        </div>}

      <p className="text-[13px] text-[var(--hw-neutral-800)]">
        Draft: data entry not yet completed · Saved: dataset saved successfully · Failed: dataset could not be saved
      </p>
    </div>;
}
export {
  DFTCHistory as default
};
