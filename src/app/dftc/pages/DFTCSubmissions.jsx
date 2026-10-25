import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { apiGet, parseResponse } from "../../global/api";
import { getLocalDateString } from "./dftcSavedDatasets";
import { parseApiDateTime } from "../../global/utils/apiTransforms";

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
    const d = parseApiDateTime(isoStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" });
    return `${month} ${day}, ${year} · ${time}`;
  } catch {
    return isoStr;
  }
}

function getCutoff(preset) {
  if (preset === "all" || preset === "custom") return null;
  const d = new Date();
  d.setDate(d.getDate() - (preset === "7d" ? 7 : preset === "14d" ? 14 : 28));
  return getLocalDateString(d);
}

function applyFilters(rows, datasetType, savedBy, datePreset, customFrom, customTo) {
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
        <div className="absolute right-0 sm:left-0 top-full mt-1 z-30 w-48 max-w-[calc(100vw-32px)] bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg py-1">
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
        <div className="absolute right-0 sm:left-0 top-full mt-1 z-30 w-72 max-w-[calc(100vw-32px)] bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-4 space-y-3">
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
  const [searchParams] = useSearchParams();
  const highlightParam = searchParams.get("highlight");
  const [highlightKey, setHighlightKey] = useState(highlightParam);
  const { user } = useAuth();
  const currentUserName = user?.name || (user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "DFTC Personnel");

  const [datasetType, setDatasetType] = useState("");
  const [savedBy, setSavedBy] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [page, setPage] = useState(1);

  // 3-second temporary highlight timer (matching HarvestWise pattern)
  useEffect(() => {
    if (!highlightParam) return;
    setHighlightKey(highlightParam);
    const timer = setTimeout(() => {
      setHighlightKey(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [highlightParam]);

  // Live Query from backend API
  const { data: submissionsData, isLoading, isError, refetch } = useQuery({
    queryKey: ["dftc-submissions"],
    queryFn: async () => {
      const res = await apiGet("/dftc/submissions?page_size=100");
      return parseResponse(res);
    },
    staleTime: 0,
    refetchOnMount: "always"
  });

  const rawRows = useMemo(() => {
    if (submissionsData?.items && submissionsData.items.length > 0) {
      const mapped = submissionsData.items.map((item) => {
        const dTypeRaw = (item.data_type || "").toLowerCase();
        const isArrival = dTypeRaw.includes("arrival");
        const pTypeRaw = (item.price_type || "").toLowerCase();
        const pTypeDisplay = pTypeRaw.includes("wholesale")
          ? "Wholesale"
          : pTypeRaw.includes("landing")
          ? "Landing"
          : pTypeRaw.includes("retail")
          ? "Retail"
          : "";
        const isManual = (item.submission_method || "").toLowerCase().includes("manual");
        const dType = isArrival
          ? "DFTC Arrival Volume"
          : isManual
          ? (pTypeDisplay ? `Manual Input · ${pTypeDisplay} Prices` : "Manual Input · Daily Prices")
          : `Daily ${pTypeDisplay || "Retail"} Prices`;

        const savedDateObj = item.saved_at
          ? new Date(item.saved_at)
          : item.created_at
          ? new Date(item.created_at)
          : null;
        const savedIso =
          savedDateObj && !isNaN(savedDateObj.getTime())
            ? getLocalDateString(savedDateObj)
            : (item.saved_at?.slice(0, 10) || item.created_at?.slice(0, 10) || "");

        const stRaw = (item.status || "").toLowerCase();
        const formattedStatus = stRaw.includes("draft")
          ? "Draft"
          : (stRaw.includes("fail") || stRaw.includes("reject"))
          ? "Failed"
          : "Saved";

        const submitterFullName =
          item.submitted_by_name ||
          item.submitter_name ||
          (item.user ? `${item.user.first_name || ""} ${item.user.last_name || ""}`.trim() : null) ||
          currentUserName;

        return {
          datasetId: item.id,
          fileName: item.original_file_name || item.file_name || null,
          datasetType: dType,
          isArrival,
          savedBy: submitterFullName,
          savedDateTime: formatDateTime(item.saved_at || item.created_at),
          savedDateTimeRaw: item.saved_at || item.created_at || "",
          savedIso,
          reportingDate: item.reporting_date || "",
          totalRecords: item.record_count ?? 0,
          analyticsSupported: item.analytics_supported_count ?? 0,
          otherCommodities: item.other_commodity_count ?? 0,
          needsCorrection: item.needs_correction_count ?? 0,
          duplicate: item.duplicate_count ?? 0,
          status: formattedStatus
        };
      });

      return mapped.sort((a, b) => {
        const tA = new Date(a.savedDateTimeRaw || 0).getTime();
        const tB = new Date(b.savedDateTimeRaw || 0).getTime();
        if (tB !== tA) return tB - tA;
        return String(b.datasetId || "").localeCompare(String(a.datasetId || ""), undefined, { numeric: true });
      });
    }
    return [];
  }, [submissionsData, currentUserName]);

  const filtered = useMemo(
    () => applyFilters(rawRows, datasetType, savedBy, datePreset, customFrom, customTo),
    [rawRows, datasetType, savedBy, datePreset, customFrom, customTo]
  );

  useEffect(() => {
    setPage(1);
  }, [datasetType, savedBy, datePreset, customFrom, customTo]);

  // Data can shrink after a resync; keep `page` inside the current range.
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (page > totalPages) setPage(totalPages);
  }, [filtered.length, page]);

  // Smooth scroll to highlighted dataset row
  useEffect(() => {
    if (!highlightKey) return;
    const el = document.querySelector('[data-highlighted="true"]');
    if (el) {
      el.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }
  }, [highlightKey, filtered]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilter = !!(datasetType || savedBy || datePreset !== "all");

  function clearAll() {
    setDatasetType("");
    setSavedBy("");
    setDatePreset("all");
    setCustomFrom("");
    setCustomTo("");
  }

  const TABLE_HEADERS = [
    "ID",
    "Dataset Type",
    "Saved By",
    "Saved Date",
    "Total",
    "Analytics-Supported",
    "Other Commodities"
  ];

  const todayStr = getLocalDateString();
  function checkIsHighlighted(r) {
    if (!highlightKey) return false;
    const isToday = r.savedIso === todayStr || r.reportingDate === todayStr;
    const hk = highlightKey.toLowerCase();
    if (hk === "price") {
      return isToday && !r.isArrival;
    }
    if (hk === "arrival") {
      return isToday && r.isArrival;
    }
    if (hk === "today") {
      return isToday;
    }
    return r.datasetId?.toLowerCase() === hk;
  }

  return (
    <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-3 sm:space-y-5">
      {/* Header */}
      <PageHeader
        title="Submission History"
        description="Review previously saved or uploaded datasets by DFTC personnel."
      />

      {/* Filters — compact one-row card */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-3 sm:px-4 py-3 sm:py-3.5">
        <div className="grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap lg:flex-nowrap gap-2.5 sm:gap-3 items-end">
          {/* Dataset Type */}
          <div className="col-span-2 w-full sm:w-auto flex-1 sm:min-w-[150px]">
            <label className={labelCls}>Dataset Type</label>
            <div className="relative">
              <select className={selectCls} value={datasetType} onChange={(e) => setDatasetType(e.target.value)}>
                <option value="">All Types</option>
                <option>Daily Retail Prices</option>
                <option>Daily Wholesale Prices</option>
                <option>Daily Landing Prices</option>
                <option>Manual Input · Daily Prices</option>
                <option>Manual Input · Retail Prices</option>
                <option>Manual Input · Wholesale Prices</option>
                <option>Manual Input · Landing Prices</option>
                <option>DFTC Arrival Volume</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-500)] pointer-events-none" />
            </div>
          </div>

          {/* Saved By */}
          <div className="w-full sm:w-auto flex-1 sm:min-w-[150px] min-w-0">
            <label className={labelCls}>Saved By</label>
            <input
              className={inputCls}
              placeholder="All personnel"
              value={savedBy}
              onChange={(e) => setSavedBy(e.target.value)}
            />
          </div>

          {/* Period */}
          <div className="w-full sm:w-auto flex-1 sm:min-w-[150px] min-w-0">
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

      {/* Error banner */}
      {isError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Submission history could not be loaded. Please try again later.
          <button
            type="button"
            onClick={() => refetch()}
            className="ml-3 font-medium text-red-800 underline underline-offset-2 hover:opacity-70 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Result count */}
      <p className="text-[13px] text-[var(--hw-neutral-800)]">
        {isLoading ? (
          <span className="inline-flex items-center gap-1.5 text-[var(--hw-neutral-500)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading datasets...
          </span>
        ) : isError && !submissionsData ? null : hasFilter ? (
          `${filtered.length} result${filtered.length !== 1 ? "s" : ""} · filtered`
        ) : (
          `${rawRows.length} datasets`
        )}
      </p>

      {/* Skeleton / Loading */}
      {isLoading && !submissionsData ? (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden p-4 sm:p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-[var(--hw-neutral-100)] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : isError && !submissionsData ? (
        /* Error state — the alert banner above carries the message */
        null
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
                  {pageRows.map((r) => {
                    const isHighlighted = checkIsHighlighted(r);
                    return (
                      <tr
                        key={r.datasetId}
                        data-highlighted={isHighlighted ? "true" : undefined}
                        onClick={() => navigate(`/dftc/submissions/${r.datasetId}`)}
                        className={`cursor-pointer transition-all duration-700 ease-out ${
                          isHighlighted
                            ? "bg-emerald-50/90 hover:bg-emerald-100/70 ring-1 ring-inset ring-[var(--hw-green-600)]"
                            : "hover:bg-[var(--hw-neutral-50)]"
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-[14px] font-medium text-[var(--hw-neutral-900)]">{r.datasetId}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[var(--hw-neutral-800)]">
                          {r.fileName ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-[var(--hw-neutral-900)]">{r.fileName}</span>
                              <span className="text-[12px] text-[var(--hw-neutral-500)]">{r.datasetType}</span>
                            </div>
                          ) : (
                            r.datasetType
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[var(--hw-neutral-800)]">{r.savedBy}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[var(--hw-neutral-800)]">{r.savedDateTime}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[var(--hw-neutral-800)]">{r.totalRecords}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[var(--hw-neutral-800)]">{r.analyticsSupported}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[var(--hw-neutral-800)]">{r.otherCommodities}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={filtered.length} onChange={setPage} />
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {pageRows.map((r) => {
              const isHighlighted = checkIsHighlighted(r);
              return (
                <button
                  key={r.datasetId}
                  data-highlighted={isHighlighted ? "true" : undefined}
                  onClick={() => navigate(`/dftc/submissions/${r.datasetId}`)}
                  className={`w-full rounded-2xl border transition-all duration-700 ease-out p-4 text-left shadow-[var(--shadow-xs)] cursor-pointer group ${
                    isHighlighted
                      ? "bg-emerald-50/90 border-[var(--hw-green-600)] ring-1 ring-[var(--hw-green-600)]"
                      : "bg-white border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)] active:scale-[.99]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">
                      {r.datasetId} · {r.totalRecords} {r.totalRecords === 1 ? "record" : "records"}
                    </p>
                    <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] group-hover:text-[var(--hw-neutral-600)] transition-colors shrink-0" />
                  </div>

                  <p className="text-[14px] font-medium text-[var(--hw-neutral-900)] leading-snug group-hover:text-[var(--hw-green-800)] transition-colors">
                    {r.fileName || r.datasetType}
                  </p>
                  {r.fileName && <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">{r.datasetType}</p>}

                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-[var(--hw-neutral-600)] mt-1">
                    <span>{r.savedDateTime}</span>
                    <span className="text-[var(--hw-neutral-300)]">•</span>
                    <span>{r.savedBy}</span>
                  </div>
                </button>
              );
            })}
            {Math.ceil(filtered.length / PAGE_SIZE) > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 border border-[var(--hw-neutral-200)] rounded-lg text-[13px] text-[var(--hw-neutral-800)] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Prev
                </button>
                <span className="px-3 py-1.5 text-[13px] text-[var(--hw-neutral-800)]">
                  {page} / {Math.ceil(filtered.length / PAGE_SIZE)}
                </span>
                <button
                  disabled={page === Math.ceil(filtered.length / PAGE_SIZE)}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 border border-[var(--hw-neutral-200)] rounded-lg text-[13px] text-[var(--hw-neutral-800)] disabled:opacity-40 transition-colors cursor-pointer"
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
