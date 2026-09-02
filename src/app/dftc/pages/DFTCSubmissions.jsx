import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2 } from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { apiGet, parseResponse } from "../../global/api";

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
const PAGE_SIZE = 20;

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${month} ${day}, ${year} · ${time}`;
  } catch {
    return isoStr;
  }
}

function getCutoff(preset) {
  if (preset === "all" || preset === "custom") return null;
  const d = new Date();
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
    if (statusFilter && r.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
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
    return p.length === 3 ? `${MONTHS[parseInt(p[1], 10) - 1]} ${parseInt(p[2], 10)}` : iso;
  }

  const displayLabel =
    value === "all"
      ? "All Records"
      : value === "7d"
      ? "Last 7 days"
      : value === "14d"
      ? "Last 14 days"
      : value === "28d"
      ? "Last 28 days"
      : customFrom && customTo
      ? `${fmtDate(customFrom)}–${fmtDate(customTo)}`
      : "Custom";

  const OPTIONS = [
    { key: "all", label: "All Records" },
    { key: "7d", label: "Last 7 days" },
    { key: "14d", label: "Last 14 days" },
    { key: "28d", label: "Last 28 days" },
    { key: "custom", label: "Custom" }
  ];

  const invalidRange = !!(pendingFrom && pendingTo && pendingTo < pendingFrom);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setPopOpen(false);
        }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[14px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)] hover:border-[var(--hw-neutral-300)] focus:outline-none transition-colors cursor-pointer"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={14} className={`text-[var(--hw-neutral-800)] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-44 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg py-1">
          {OPTIONS.map((opt) => (
            <button
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
              className={`w-full text-left px-4 py-2.5 text-[14px] transition-colors cursor-pointer ${
                value === opt.key ? "bg-[var(--hw-green-50)] text-[var(--hw-green-800)] font-medium" : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {popOpen && (
        <div className="absolute left-0 top-full mt-1 z-30 w-72 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-4 space-y-3">
          <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">Custom Date Range</p>
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--hw-neutral-700)] mb-1">Start Date</label>
              <input
                type="date"
                value={pendingFrom}
                onChange={(e) => setPFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--hw-neutral-700)] mb-1">End Date</label>
              <input
                type="date"
                value={pendingTo}
                onChange={(e) => setPTo(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] bg-white"
              />
            </div>
          </div>
          {invalidRange && <p className="text-[11px] text-red-500">End date must not be before start date.</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => setPopOpen(false)}
              className="px-3 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={!pendingFrom || !pendingTo || invalidRange}
              onClick={() => {
                onChange("custom", pendingFrom, pendingTo);
                setPopOpen(false);
              }}
              className="px-3 py-1.5 text-[12px] bg-[var(--hw-green-600)] text-white rounded-lg disabled:opacity-50 cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Pagination({ page, total, onChange }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-3.5 border-t border-[var(--hw-neutral-100)]">
      <p className="text-[13px] text-[var(--hw-neutral-800)]">
        Showing {start}–{end} of {total} datasets
      </p>
      {pages > 1 && (
        <div className="flex gap-1.5 items-center">
          <button
            disabled={page === 1}
            onClick={() => onChange(page - 1)}
            className="px-3 py-1.5 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Prev
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`px-3 py-1.5 text-[13px] border rounded-lg transition-colors cursor-pointer ${
                p === page
                  ? "border-[var(--hw-green-600)] bg-[var(--hw-green-700)] text-white font-semibold"
                  : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={page === pages}
            onClick={() => onChange(page + 1)}
            className="px-3 py-1.5 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function DFTCHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserName = user?.name || (user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "DFTC Personnel");

  const [datasetType, setDatasetType] = useState("");
  const [savedBy, setSavedBy] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  // Live Query from backend API
  const { data: submissionsData, isLoading } = useQuery({
    queryKey: ["dftc-submissions"],
    queryFn: async () => {
      try {
        const res = await apiGet("/dftc/submissions?page_size=100");
        return parseResponse(res);
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000
  });

  const rawRows = useMemo(() => {
    if (submissionsData?.items && submissionsData.items.length > 0) {
      return submissionsData.items.map((item) => {
        const dTypeRaw = (item.data_type || "").toLowerCase();
        const isArrival = dTypeRaw.includes("arrival");
        const pTypeRaw = (item.price_type || "").toLowerCase();
        const pTypeDisplay = pTypeRaw.includes("wholesale")
          ? "Wholesale"
          : pTypeRaw.includes("landing")
          ? "Landing"
          : "Retail";
        const dType = isArrival
          ? "DFTC Arrival Volume"
          : `Daily ${pTypeDisplay} Prices`;

        const savedIso = item.saved_at ? item.saved_at.slice(0, 10) : item.created_at ? item.created_at.slice(0, 10) : "";
        const stRaw = (item.status || "").toLowerCase();
        const formattedStatus = stRaw.includes("draft")
          ? "Draft"
          : (stRaw.includes("fail") || stRaw.includes("reject"))
          ? "Failed"
          : "Saved";

        const submitterFullName = item.submitted_by_name || item.submitter_name || (item.user ? `${item.user.first_name || ""} ${item.user.last_name || ""}`.trim() : null) || currentUserName;

        return {
          datasetId: item.id,
          datasetType: dType,
          savedBy: submitterFullName,
          savedDateTime: formatDateTime(item.saved_at || item.created_at),
          savedIso,
          totalRecords: item.total_records ?? 0,
          analyticsSupported: item.analytics_supported_count ?? 0,
          otherCommodities: item.other_commodity_count ?? 0,
          needsCorrection: item.needs_correction_count ?? 0,
          duplicate: item.duplicate_count ?? 0,
          status: formattedStatus
        };
      });
    }
    return [];
  }, [submissionsData, currentUserName]);

  const filtered = useMemo(
    () => applyFilters(rawRows, datasetType, savedBy, datePreset, customFrom, customTo, statusFilter),
    [rawRows, datasetType, savedBy, datePreset, customFrom, customTo, statusFilter]
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

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      {/* Header */}
      <PageHeader
        title="Submission History"
        description="Review previously saved or uploaded datasets by DFTC personnel."
      />

      {/* Filters — compact one-row card */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-3.5">
        <div className="flex flex-col sm:flex-row flex-wrap lg:flex-nowrap gap-3 items-end">
          {/* Dataset Type */}
          <div className="w-full sm:w-auto flex-1 min-w-[150px]">
            <label className={labelCls}>Dataset Type</label>
            <div className="relative">
              <select className={selectCls} value={datasetType} onChange={(e) => setDatasetType(e.target.value)}>
                <option value="">All Types</option>
                <option>Daily Retail Prices</option>
                <option>Daily Wholesale Prices</option>
                <option>Daily Landing Prices</option>
                <option>DFTC Arrival Volume</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-500)] pointer-events-none" />
            </div>
          </div>

          {/* Saved By */}
          <div className="w-full sm:w-auto flex-1 min-w-[150px]">
            <label className={labelCls}>Saved By</label>
            <input
              className={inputCls}
              placeholder="All personnel"
              value={savedBy}
              onChange={(e) => setSavedBy(e.target.value)}
            />
          </div>

          {/* Date */}
          <div className="w-full sm:w-auto flex-1 min-w-[150px]">
            <label className={labelCls}>Period</label>
            <DateCombobox
              value={datePreset}
              customFrom={customFrom}
              customTo={customTo}
              onChange={(v, from, to) => {
                setDatePreset(v);
                if (from !== undefined) setCustomFrom(from);
                if (to !== undefined) setCustomTo(to);
              }}
            />
          </div>

          {/* Status */}
          <div className="w-full sm:w-auto flex-1 min-w-[120px]">
            <label className={labelCls}>Status</label>
            <div className="relative">
              <select className={selectCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option>Draft</option>
                <option>Saved</option>
                <option>Failed</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-500)] pointer-events-none" />
            </div>
          </div>
        </div>

        {hasFilter && (
          <button
            onClick={clearAll}
            className="mt-2.5 text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="text-[13px] text-[var(--hw-neutral-800)]">
        {isLoading ? (
          <span className="inline-flex items-center gap-1.5 text-[var(--hw-neutral-500)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading datasets...
          </span>
        ) : hasFilter ? (
          `${filtered.length} result${filtered.length !== 1 ? "s" : ""} · filtered`
        ) : (
          `${rawRows.length} datasets`
        )}
      </p>

      {/* Skeleton / Loading */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-[var(--hw-neutral-100)] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] py-12 text-center">
          <p className="text-[14px] text-[var(--hw-neutral-800)]">No datasets match the selected filters.</p>
          {hasFilter && (
            <button
              onClick={clearAll}
              className="mt-2 text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70 cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                  <tr>
                    {TABLE_HEADERS.map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {pageRows.map((r) => (
                    <tr
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
                      <td className="px-4 py-3 whitespace-nowrap text-[14px]">
                        <span
                          className={`font-semibold ${
                            r.status === "Saved"
                              ? "text-emerald-700"
                              : r.status === "Failed"
                              ? "text-rose-600"
                              : "text-amber-700"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={filtered.length} onChange={setPage} />
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {pageRows.map((r) => (
              <button
                key={r.datasetId}
                onClick={() => navigate(`/dftc/submissions/${r.datasetId}`)}
                className="w-full bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left hover:bg-[var(--hw-neutral-50)] active:scale-[.99] transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">{r.datasetId}</p>
                    <p className="text-[14px] text-[var(--hw-neutral-800)] mt-0.5">{r.datasetType}</p>
                  </div>
                  <span
                    className={`text-[12px] font-semibold shrink-0 ${
                      r.status === "Saved"
                        ? "text-emerald-700"
                        : r.status === "Failed"
                        ? "text-rose-600"
                        : "text-amber-700"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="text-[13px] text-[var(--hw-neutral-800)] space-y-0.5">
                  <p>
                    {r.savedDateTime} · {r.savedBy}
                  </p>
                  <p className="flex flex-wrap gap-3 mt-1">
                    <span>{r.totalRecords} total</span>
                    <span>{r.analyticsSupported} analytics</span>
                    <span>{r.otherCommodities} other</span>
                    {r.needsCorrection > 0 && <span className="text-amber-700 font-medium">{r.needsCorrection} needs correction</span>}
                    {r.duplicate > 0 && <span className="text-amber-700 font-medium">{r.duplicate} duplicate</span>}
                  </p>
                </div>
              </button>
            ))}
            {Math.ceil(filtered.length / PAGE_SIZE) > 1 && (
              <div className="flex justify-center gap-2 pt-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 border border-[var(--hw-neutral-200)] rounded-lg text-[13px] text-[var(--hw-neutral-800)] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Prev
                </button>
                <span className="px-3 py-1.5 text-[13px] text-[var(--hw-neutral-800)]">
                  {page} / {Math.ceil(filtered.length / PAGE_SIZE)}
                </span>
                <button
                  disabled={page === Math.ceil(filtered.length / PAGE_SIZE)}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 border border-[var(--hw-neutral-200)] rounded-lg text-[13px] text-[var(--hw-neutral-800)] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <p className="text-[13px] text-[var(--hw-neutral-800)]">
        Draft: data entry not yet completed · Saved: dataset saved successfully · Failed: dataset could not be saved
      </p>
    </div>
  );
}

export { DFTCHistory as default };
