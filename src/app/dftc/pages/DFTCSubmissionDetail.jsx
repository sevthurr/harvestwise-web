import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, AlertCircle, Loader2, Info } from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
import { apiGet, parseResponse } from "../../global/api";
import { formatMarketName, formatDateOrMonth } from "./dftcSavedDatasets";
import { parseApiDateTime } from "../../global/utils/apiTransforms";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = parseApiDateTime(isoStr);
    const month = MONTH_NAMES[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" });
    return `${month} ${day}, ${year} · ${time}`;
  } catch {
    return isoStr;
  }
}

function formatDateOnly(val) {
  if (!val) return null;
  if (typeof val === "string") {
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = match[1];
      const monthIdx = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return `${MONTH_NAMES[monthIdx]} ${day}, ${year}`;
    }
  }
  try {
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return String(val);
  }
}

function parseToDayTimestamp(val) {
  if (!val) return null;
  if (typeof val === "string") {
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return Date.UTC(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
    }
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return null;
}

function computeDateCoverage(records, fallbackDate) {
  const timestamps = [];
  if (Array.isArray(records)) {
    for (const r of records) {
      const raw = r.price_date || r.arrival_date || r.date || r.dateMonth;
      const ts = parseToDayTimestamp(raw);
      if (ts !== null) {
        timestamps.push(ts);
      }
    }
  }

  if (timestamps.length === 0) {
    return formatDateOrMonth(fallbackDate) || "—";
  }

  timestamps.sort((a, b) => a - b);
  const minTs = timestamps[0];
  const maxTs = timestamps[timestamps.length - 1];

  const minD = new Date(minTs);
  const maxD = new Date(maxTs);

  const minStr = `${MONTH_NAMES[minD.getUTCMonth()]} ${minD.getUTCDate()}, ${minD.getUTCFullYear()}`;
  const maxStr = `${MONTH_NAMES[maxD.getUTCMonth()]} ${maxD.getUTCDate()}, ${maxD.getUTCFullYear()}`;

  if (minStr === maxStr) {
    return minStr;
  }
  return `${minStr} – ${maxStr}`;
}

const cardCls = "bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)]";
const tdCls = "px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap text-[var(--hw-neutral-800)] text-[13px] sm:text-[14px]";
const tdBold = `${tdCls} font-medium text-[var(--hw-neutral-900)]`;
const thCls = "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[12px] sm:text-[13px] font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap";

function capitalizeFirstLetter(str) {
  if (!str) return "—";
  return String(str).charAt(0).toUpperCase() + String(str).slice(1);
}

const PAGE_SIZE = 20;

function Pagination({ page, total, pageSize = PAGE_SIZE, onChange }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Sliding window with ellipsis for numbered pagination
  const pageNumbers = [];
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (page > 3) pageNumbers.push("...");
    const windowStart = Math.max(2, page - 1);
    const windowEnd = Math.min(pages - 1, page + 1);
    for (let i = windowStart; i <= windowEnd; i++) {
      if (!pageNumbers.includes(i)) pageNumbers.push(i);
    }
    if (page < pages - 2) pageNumbers.push("...");
    if (!pageNumbers.includes(pages)) pageNumbers.push(pages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-[var(--hw-neutral-100)] text-[12.5px] sm:text-[13px] text-[var(--hw-neutral-600)]">
      <p className="text-center sm:text-left text-[12.5px] sm:text-[13px] font-medium text-[var(--hw-neutral-700)]">
        Showing {start}–{end} of {total.toLocaleString()} records
      </p>

      {/* Mobile view: Compact Prev / Page X of Y / Next */}
      <div className="flex sm:hidden items-center justify-between w-full pt-2 border-t border-[var(--hw-neutral-100)]">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-3 py-1.5 border border-[var(--hw-neutral-200)] rounded-lg text-[12px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Prev
        </button>
        <span className="text-[12px] font-semibold text-[var(--hw-neutral-800)]">
          Page {page} of {pages}
        </span>
        <button
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="px-3 py-1.5 border border-[var(--hw-neutral-200)] rounded-lg text-[12px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Next
        </button>
      </div>

      {/* Desktop / Tablet view: Sliding window with ellipsis so numbers never wrap or overflow */}
      <div className="hidden sm:flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-2.5 py-1.5 border border-[var(--hw-neutral-200)] rounded-lg text-[12px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Prev
        </button>

        {pageNumbers.map((item, idx) => {
          if (item === "...") {
            return (
              <span key={`ellipsis-${idx}`} className="px-2 py-1 text-[var(--hw-neutral-400)] select-none">
                …
              </span>
            );
          }
          return (
            <button
              key={item}
              onClick={() => onChange(item)}
              className={`min-w-[32px] h-8 px-2 py-1 text-[12px] border rounded-lg transition-colors cursor-pointer ${
                item === page
                  ? "border-[var(--hw-green-600)] bg-[var(--hw-green-700)] text-white font-semibold"
                  : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"
              }`}
            >
              {item}
            </button>
          );
        })}

        <button
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="px-2.5 py-1.5 border border-[var(--hw-neutral-200)] rounded-lg text-[12px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function ValTabNav({ active, onChange, ds }) {
  const tabs = [
    { id: "analytics", label: "Analytics-Supported", fullLabel: "Analytics-Supported Records", count: ds.analyticsSupported ?? 0 },
    { id: "other", label: "Other Commodities", fullLabel: "Other Commodity Records", count: ds.otherCommodities ?? 0 }
  ];
  return (
    <div className="flex gap-2 sm:gap-4 border-b border-[var(--hw-neutral-200)] px-3 sm:px-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`py-2.5 sm:py-3 text-[12.5px] sm:text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer flex items-center gap-1.5 ${
            active === t.id
              ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)] font-semibold"
              : "border-transparent text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-900)]"
          }`}
        >
          <span className="hidden sm:inline">{t.fullLabel}</span>
          <span className="sm:hidden">{t.label}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10.5px] sm:text-[11px] font-semibold ${
            active === t.id
              ? "bg-[var(--hw-green-100)] text-[var(--hw-green-800)]"
              : "bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-600)]"
          }`}>
            {t.count}
          </span>
        </button>
      ))}
    </div>
  );
}

function DeleteModal({ onCancel, onConfirm }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <p className="font-semibold text-[var(--hw-neutral-900)]">Delete Draft?</p>
        <p className="text-[14px] text-[var(--hw-neutral-800)]">
          This draft dataset will be permanently deleted. This action cannot be undone.
        </p>
        <div className="flex gap-2 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-[13px] font-medium hover:bg-red-700 transition-colors cursor-pointer"
          >
            Delete Draft
          </button>
        </div>
      </div>
    </div>
  );
}

function DFTCSubmissionDetail() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserName = user?.name || (user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "DFTC Personnel");

  const { data: apiSubmission, isLoading } = useQuery({
    queryKey: ["dftc-submission", submissionId],
    queryFn: async () => {
      try {
        const res = await apiGet(`/dftc/submissions/${submissionId}`);
        return parseResponse(res);
      } catch {
        return null;
      }
    },
    enabled: !!submissionId
  });

  const ds = useMemo(() => {
    if (!apiSubmission) return null;
    const isArrival = apiSubmission.data_type === "arrival_volume";
    const isManual = (apiSubmission.submission_method || "").toLowerCase().includes("manual");
    const pTypeRaw = (apiSubmission.price_type || "").toLowerCase();
    const pTypeDisplay = pTypeRaw.includes("wholesale")
      ? "Wholesale"
      : pTypeRaw.includes("landing")
      ? "Landing"
      : pTypeRaw.includes("retail")
      ? "Retail"
      : "";
    const dType = isArrival
      ? "DFTC Arrival Volume"
      : isManual
      ? (pTypeDisplay ? `Manual Input · ${pTypeDisplay} Prices` : "Manual Input · Daily Prices")
      : `Daily ${pTypeDisplay || "Retail"} Prices`;
    const formattedStatus = apiSubmission.status
      ? apiSubmission.status.charAt(0).toUpperCase() + apiSubmission.status.slice(1).toLowerCase()
      : "Saved";
    let storedPersonnel = null;
    try {
      if (apiSubmission.reporting_date) {
        storedPersonnel = JSON.parse(localStorage.getItem(`dftc_report_personnel_${apiSubmission.reporting_date}`));
      }
    } catch {}

    const submitterFullName = (isManual && storedPersonnel?.reviewedBy)
      ? storedPersonnel.reviewedBy
      : (apiSubmission.submitted_by_name || apiSubmission.submitter_name || (apiSubmission.user ? `${apiSubmission.user.first_name || ""} ${apiSubmission.user.last_name || ""}`.trim() : null) || "DFTC Personnel");

    const encoderFullName = (isManual && storedPersonnel?.encodedBy)
      ? storedPersonnel.encodedBy
      : (apiSubmission.encoded_by || apiSubmission.encoded_by_name || "MARIA S. SANTOS");

    const analyticsRecords = Array.isArray(apiSubmission.analytics_records) ? apiSubmission.analytics_records : Array.isArray(apiSubmission.records) ? apiSubmission.records.filter((r) => r.is_top10) : [];
    const otherRecords = Array.isArray(apiSubmission.other_records) ? apiSubmission.other_records : Array.isArray(apiSubmission.records) ? apiSubmission.records.filter((r) => !r.is_top10) : [];
    const dateCoverage = computeDateCoverage([...analyticsRecords, ...otherRecords, ...(Array.isArray(apiSubmission.records) ? apiSubmission.records : [])], apiSubmission.reporting_date);
    const hasMarketAndType = !isArrival && ([...analyticsRecords, ...otherRecords].some((r) => r.price_type || r.source_name));

    return {
      datasetId: apiSubmission.id,
      datasetType: dType,
      savedBy: submitterFullName,
      encodedBy: encoderFullName,
      savedDateTime: formatDateTime(apiSubmission.saved_at || apiSubmission.created_at),
      savedIso: apiSubmission.saved_at ? apiSubmission.saved_at.slice(0, 10) : "",
      totalRecords: apiSubmission.record_count ?? 0,
      analyticsSupported: apiSubmission.analytics_supported_count ?? 0,
      otherCommodities: apiSubmission.other_commodity_count ?? 0,
      needsCorrection: apiSubmission.needs_correction_count ?? 0,
      duplicate: apiSubmission.duplicate_count ?? 0,
      status: formattedStatus,
      fileName: apiSubmission.submission_method === "Manual Input" ? "—" : (apiSubmission.original_file_name || apiSubmission.file_name || "—"),
      fileType: apiSubmission.submission_method === "Manual Input" ? "—" : (apiSubmission.file_format || (apiSubmission.original_file_name ? apiSubmission.original_file_name.split('.').pop() : "xlsx")),
      market: (isManual && !pTypeDisplay) ? "Bangkerohan & DFTC Taboan" : formatMarketName(apiSubmission.source_name || apiSubmission.source_id),
      priceType: isArrival ? "—" : (pTypeDisplay || "All Price Types"),
      hasMarketAndType,
      dateCoverage,
      entryMethod: (apiSubmission.submission_method === "Manual Input") ? "Manual Input" : "File Upload",
      submissionMethod: (apiSubmission.submission_method === "Manual Input") ? "Manual Input" : "File Upload",
      failureReason: apiSubmission.failure_reason || null,
      analyticsRecords,
      otherRecords,
      correctionIssues: Array.isArray(apiSubmission.validation_issues) ? apiSubmission.validation_issues.filter((i) => i.result_type === "needs_correction" || i.issue_type === "needs_correction" || i.type === "correction") : [],
      duplicateIssues: Array.isArray(apiSubmission.validation_issues) ? apiSubmission.validation_issues.filter((i) => i.result_type === "duplicate" || i.issue_type === "duplicate" || i.type === "duplicate") : []
    };
  }, [apiSubmission, currentUserName]);

  const [valTab, setValTab] = useState("analytics");
  const [analyticsPage, setAnalyticsPage] = useState(1);
  const [otherPage, setOtherPage] = useState(1);
  const [showDelete, setShowDelete] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retried, setRetried] = useState(false);

  function handleRetry() {
    setRetrying(true);
    setTimeout(() => {
      setRetrying(false);
      setRetried(true);
    }, 1200);
  }

  if (isLoading) {
    return (
      <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-3 sm:space-y-5">
        <button
          onClick={() => navigate("/dftc/submissions")}
          className="flex items-center gap-1.5 text-[14px] text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-900)] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to History
        </button>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] p-8 text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--hw-green-700)]" />
          <p className="text-[14px] text-[var(--hw-neutral-600)]">Loading submission details...</p>
        </div>
      </div>
    );
  }

  if (!ds) {
    return (
      <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-3 sm:space-y-5">
        <button
          onClick={() => navigate("/dftc/submissions")}
          className="flex items-center gap-1.5 text-[14px] text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-900)] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to History
        </button>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] p-12 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-[var(--hw-neutral-400)] mx-auto" />
          <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Dataset Not Found</p>
          <p className="text-[13px] text-[var(--hw-neutral-500)] max-w-sm mx-auto">
            The requested dataset ID could not be located in the database records.
          </p>
          <button
            onClick={() => navigate("/dftc/submissions")}
            className="mt-2 px-4 py-2 bg-[var(--hw-green-700)] text-white text-[13px] font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors cursor-pointer"
          >
            Return to Submissions
          </button>
        </div>
      </div>
    );
  }

  const effectiveStatus = retried ? "Saved" : ds.status;
  const isArrival = ds.datasetType === "DFTC Arrival Volume";
  const showValidation = effectiveStatus === "Saved";
  const isManual = ds.entryMethod === "Manual Input";

  const INFO_ROWS = isManual
    ? [
        ["Entry Source", "Manual Data Entry"],
        ["Dataset Type", ds.datasetType],
        ["Market / Facility", ds.market],
        ...(!isArrival && ds.priceType !== "—" ? [["Price Type", ds.priceType]] : []),
        ["Date Coverage", ds.dateCoverage],
        ["Submission Method", "Manual Input"],
        ["Saved By", ds.savedBy],
        ["Encoded By", ds.encodedBy],
        ["Saved Date and Time", ds.savedDateTime]
      ]
    : [
        ["Uploaded File", ds.fileName || "—"],
        ["File Type", ds.fileType || "xlsx"],
        ["Dataset Type", ds.datasetType],
        ["Market / Facility", ds.market],
        ...(!isArrival && ds.priceType !== "—" ? [["Price Type", ds.priceType]] : []),
        ["Date Coverage", ds.dateCoverage],
        ["Submission Method", "File Upload"],
        ["Uploaded By", ds.savedBy],
        ["Uploaded Date and Time", ds.savedDateTime]
      ];

  return (
    <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-3 sm:space-y-5">
      {showDelete && <DeleteModal onCancel={() => setShowDelete(false)} onConfirm={() => navigate("/dftc/submissions")} />}

      {/* Back */}
      <button
        onClick={() => navigate("/dftc/submissions")}
        className="flex items-center gap-1.5 text-[14px] text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-900)] transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to History
      </button>

      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-lg sm:text-xl font-bold text-[var(--hw-neutral-900)] break-words">
            {ds.fileName && ds.fileName !== "—" ? ds.fileName : ds.datasetId}
          </h1>
          {ds.fileName && ds.fileName !== "—" && (
            <span className="text-[12px] font-mono font-medium text-[var(--hw-neutral-600)] bg-[var(--hw-neutral-100)] px-2 py-0.5 rounded-md">
              {ds.datasetId}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] sm:text-[13px] text-[var(--hw-neutral-600)]">
          <span className="font-medium text-[var(--hw-neutral-800)]">{ds.datasetType}</span>
          <span className="text-[var(--hw-neutral-300)]">•</span>
          <span>{ds.savedDateTime}</span>
        </div>
      </div>

      {/* Dataset Information */}
      <div className={`${cardCls} overflow-hidden`}>
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-[var(--hw-neutral-100)]">
          <p className="text-[14.5px] sm:text-[15px] font-semibold text-[var(--hw-neutral-900)]">Dataset Information</p>
        </div>
        <div className="px-4 sm:px-5 divide-y divide-[var(--hw-neutral-100)]">
          {INFO_ROWS.map(([label, value]) => (
            <div key={label} className="flex flex-col sm:flex-row sm:items-center justify-between sm:justify-start gap-0.5 sm:gap-4 py-2.5 sm:py-3 text-[13px]">
              <span className="font-medium text-[var(--hw-neutral-600)] sm:w-52 shrink-0">{label}</span>
              <span className="font-medium text-[var(--hw-neutral-900)] break-words min-w-0">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Draft operations */}
      {effectiveStatus === "Draft" && (
        <div className={`${cardCls} p-4`}>
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)] mb-3">Draft Operations</p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/dftc/input")}
              className="flex-1 py-2.5 bg-[var(--hw-green-700)] text-white rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors cursor-pointer"
            >
              Continue Editing
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="flex-1 py-2.5 border border-red-200 rounded-xl text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              Delete Draft
            </button>
          </div>
        </div>
      )}

      {/* Failed operations */}
      {effectiveStatus === "Failed" && !retried && (
        <div className={`${cardCls} p-4 space-y-3`}>
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Save Failure</p>
          {ds.failureReason && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[14px] text-[var(--hw-neutral-900)]">{ds.failureReason}</p>
            </div>
          )}
          <p className="text-[13px] text-[var(--hw-neutral-800)]">Failed: {ds.savedDateTime}</p>
          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex-1 py-2.5 bg-[var(--hw-green-700)] text-white rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] disabled:opacity-60 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {retrying ? <><Loader2 className="w-4 h-4 animate-spin" />Retrying...</> : "Retry"}
            </button>
            <button
              onClick={() => navigate("/dftc/input")}
              className="flex-1 py-2.5 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
            >
              Return to Submit Data
            </button>
          </div>
        </div>
      )}

      {retried && (
        <div className="px-4 py-2.5 bg-[var(--hw-green-50)] border border-[var(--hw-green-200)] rounded-xl text-[14px] font-medium text-[var(--hw-green-800)]">
          Retry completed. Status updated to Saved.
        </div>
      )}

      {/* Saved Records */}
      {showValidation && (
        <div className={`${cardCls} overflow-hidden`}>
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[14.5px] sm:text-[15px] font-semibold text-[var(--hw-neutral-900)]">Saved Records</p>
            <p className="text-[12px] sm:text-[13px] text-[var(--hw-neutral-600)] mt-0.5">Saved records are read-only.</p>
          </div>

          <ValTabNav active={valTab} onChange={(t) => { setValTab(t); }} ds={ds} />

          {/* Analytics-Supported Records */}
          {valTab === "analytics" && (
            <>
              <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-[var(--hw-neutral-100)] flex items-start gap-2 sm:gap-2.5 bg-[var(--hw-neutral-50)]/50">
                <Info className="w-4 h-4 text-[var(--hw-neutral-500)] shrink-0 mt-0.5" />
                <p className="text-[12.5px] sm:text-[13.5px] text-[var(--hw-neutral-700)] leading-relaxed">
                  These records are used in HarvestWise price trends, forecasting, and analytical processing where applicable.
                </p>
              </div>
              {ds.analyticsRecords.length === 0 ? (
                <div className="px-4 sm:px-5 py-8 sm:py-10 text-center text-[13px] sm:text-[14px] text-[var(--hw-neutral-600)]">
                  No analytics-supported records in this dataset.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto [scrollbar-width:thin] touch-pan-x">
                    {isArrival ? (
                      <table className="w-full min-w-[580px]">
                        <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                          <tr>
                            {["Row", "Commodity", "Variety", "Date / Month", "Farm Source", "Other Source", "Combined Total", "Unit"].map((h) => (
                              <th key={h} className={thCls}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                          {ds.analyticsRecords
                            .slice((analyticsPage - 1) * PAGE_SIZE, analyticsPage * PAGE_SIZE)
                            .map((r, idx) => {
                              const actualIdx = (analyticsPage - 1) * PAGE_SIZE + idx;
                              return (
                                <tr key={actualIdx}>
                                  <td className={tdCls}>{actualIdx + 1}</td>
                                  <td className={tdBold}>{r.commodity || r.commodity_name || "—"}</td>
                                  <td className={tdCls}>{r.variety || "—"}</td>
                                  <td className={tdCls}>{formatDateOrMonth(r.dateMonth || r.arrival_date)}</td>
                                  <td className={tdCls}>{r.farm_source_volume_kg != null ? Number(r.farm_source_volume_kg).toLocaleString() : (r.farmSource != null ? Number(r.farmSource).toLocaleString() : "—")}</td>
                                  <td className={tdCls}>{r.other_source_volume_kg != null ? Number(r.other_source_volume_kg).toLocaleString() : (r.otherSource != null ? Number(r.otherSource).toLocaleString() : "—")}</td>
                                  <td className={tdBold}>{r.volume_kg != null ? Number(r.volume_kg).toLocaleString() : (r.combinedTotal != null ? Number(r.combinedTotal).toLocaleString() : "—")}</td>
                                  <td className={tdCls}>{r.unit || "kg"}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full min-w-[620px]">
                        <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                          <tr>
                            {(ds.hasMarketAndType
                              ? ["Row", "Commodity", "Category", "Variety", "Market", "Price Type", "Date", "UOM", "Price"]
                              : ["Row", "Commodity", "Category", "Variety", "Date", "UOM", "Price"]
                            ).map((h) => (
                              <th key={h} className={thCls}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                          {ds.analyticsRecords
                            .slice((analyticsPage - 1) * PAGE_SIZE, analyticsPage * PAGE_SIZE)
                            .map((r, idx) => {
                              const actualIdx = (analyticsPage - 1) * PAGE_SIZE + idx;
                              return (
                                <tr key={actualIdx}>
                                  <td className={tdCls}>{actualIdx + 1}</td>
                                  <td className={tdBold}>{r.commodity || r.commodity_name || "—"}</td>
                                  <td className={tdCls}>{r.category || "—"}</td>
                                  <td className={tdCls}>{r.variety || "—"}</td>
                                  {ds.hasMarketAndType && <td className={tdCls}>{formatMarketName(r.source_name || r.market) || "—"}</td>}
                                  {ds.hasMarketAndType && <td className={tdCls}>{capitalizeFirstLetter(r.price_type)}</td>}
                                  <td className={tdCls}>{formatDateOrMonth(r.price_date || r.date)}</td>
                                  <td className={tdCls}>{r.uom || "kg"}</td>
                                  <td className={tdBold}>{r.prevail_price != null ? `₱${Number(r.prevail_price).toFixed(2)}` : (r.price != null ? `₱${Number(r.price).toFixed(2)}` : "—")}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <Pagination
                    page={analyticsPage}
                    total={ds.analyticsRecords.length}
                    pageSize={PAGE_SIZE}
                    onChange={setAnalyticsPage}
                  />
                </>
              )}
            </>
          )}

          {/* Other Commodity Records */}
          {valTab === "other" && (
            <>
              <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-[var(--hw-neutral-100)] flex items-start gap-2 sm:gap-2.5 bg-[var(--hw-neutral-50)]/50">
                <Info className="w-4 h-4 text-[var(--hw-neutral-500)] shrink-0 mt-0.5" />
                <p className="text-[12.5px] sm:text-[13.5px] text-[var(--hw-neutral-700)] leading-relaxed">
                  These commodities are not part of HarvestWise crop analytics. Records in this list are retained for DFTC monitoring and will be automatically removed after 30 days.
                </p>
              </div>
              {ds.otherRecords.length === 0 ? (
                <div className="px-4 sm:px-5 py-8 sm:py-10 text-center text-[13px] sm:text-[14px] text-[var(--hw-neutral-600)]">
                  No other commodity records in this dataset.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto [scrollbar-width:thin] touch-pan-x">
                    {isArrival ? (
                      <table className="w-full min-w-[580px]">
                        <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                          <tr>
                            {["Row", "Commodity", "Variety", "Date / Month", "Farm Source", "Other Source", "Combined Total", "Unit"].map((h) => (
                              <th key={h} className={thCls}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                          {ds.otherRecords
                            .slice((otherPage - 1) * PAGE_SIZE, otherPage * PAGE_SIZE)
                            .map((r, idx) => {
                              const actualIdx = (otherPage - 1) * PAGE_SIZE + idx;
                              return (
                                <tr key={actualIdx}>
                                  <td className={tdCls}>{actualIdx + 1}</td>
                                  <td className={tdBold}>{r.commodity || r.commodity_name || "—"}</td>
                                  <td className={tdCls}>{r.variety || "—"}</td>
                                  <td className={tdCls}>{formatDateOrMonth(r.dateMonth || r.arrival_date)}</td>
                                  <td className={tdCls}>{r.farm_source_volume_kg != null ? Number(r.farm_source_volume_kg).toLocaleString() : (r.farmSource != null ? Number(r.farmSource).toLocaleString() : "—")}</td>
                                  <td className={tdCls}>{r.other_source_volume_kg != null ? Number(r.other_source_volume_kg).toLocaleString() : (r.otherSource != null ? Number(r.otherSource).toLocaleString() : "—")}</td>
                                  <td className={tdBold}>{r.volume_kg != null ? Number(r.volume_kg).toLocaleString() : (r.combinedTotal != null ? Number(r.combinedTotal).toLocaleString() : "—")}</td>
                                  <td className={tdCls}>{r.unit || "kg"}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full min-w-[620px]">
                        <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                          <tr>
                            {(ds.hasMarketAndType
                              ? ["Row", "Commodity", "Category", "Variety", "Market", "Price Type", "Date", "UOM", "Price"]
                              : ["Row", "Commodity", "Category", "Variety", "Date", "UOM", "Price"]
                            ).map((h) => (
                              <th key={h} className={thCls}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                          {ds.otherRecords
                            .slice((otherPage - 1) * PAGE_SIZE, otherPage * PAGE_SIZE)
                            .map((r, idx) => {
                              const actualIdx = (otherPage - 1) * PAGE_SIZE + idx;
                              return (
                                <tr key={actualIdx}>
                                  <td className={tdCls}>{actualIdx + 1}</td>
                                  <td className={tdBold}>{r.commodity || r.commodity_name || "—"}</td>
                                  <td className={tdCls}>{r.category || "—"}</td>
                                  <td className={tdCls}>{r.variety || "—"}</td>
                                  {ds.hasMarketAndType && <td className={tdCls}>{formatMarketName(r.source_name || r.market) || "—"}</td>}
                                  {ds.hasMarketAndType && <td className={tdCls}>{capitalizeFirstLetter(r.price_type)}</td>}
                                  <td className={tdCls}>{formatDateOrMonth(r.price_date || r.date)}</td>
                                  <td className={tdCls}>{r.uom || "kg"}</td>
                                  <td className={tdBold}>{r.prevail_price != null ? `₱${Number(r.prevail_price).toFixed(2)}` : (r.price != null ? `₱${Number(r.price).toFixed(2)}` : "—")}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <Pagination
                    page={otherPage}
                    total={ds.otherRecords.length}
                    pageSize={PAGE_SIZE}
                    onChange={setOtherPage}
                  />
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export { DFTCSubmissionDetail as default };
