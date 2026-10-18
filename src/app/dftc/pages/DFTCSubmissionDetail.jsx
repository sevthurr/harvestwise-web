import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, AlertCircle, Loader2, Info } from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
import { apiGet, parseResponse } from "../../global/api";
import { formatMarketName, formatDateOrMonth } from "./dftcSavedDatasets";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    const month = MONTH_NAMES[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
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
const tdCls = "px-4 py-3 whitespace-nowrap text-[var(--hw-neutral-800)] text-[14px]";
const tdBold = `${tdCls} font-medium text-[var(--hw-neutral-900)]`;
const thCls = "px-4 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap";

function ValTabNav({ active, onChange, ds }) {
  const tabs = [
    { id: "analytics", label: `Analytics-Supported Records (${ds.analyticsSupported ?? 0})` },
    { id: "other", label: `Other Commodity Records (${ds.otherCommodities ?? 0})` }
  ];
  return (
    <div className="flex gap-0 border-b border-[var(--hw-neutral-200)] overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${
            active === t.id
              ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)] font-semibold"
              : "border-transparent text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-900)]"
          }`}
        >
          {t.label}
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
    const submitterFullName = apiSubmission.submitted_by_name || apiSubmission.submitter_name || (apiSubmission.user ? `${apiSubmission.user.first_name || ""} ${apiSubmission.user.last_name || ""}`.trim() : null) || currentUserName;

    const analyticsRecords = Array.isArray(apiSubmission.analytics_records) ? apiSubmission.analytics_records : Array.isArray(apiSubmission.records) ? apiSubmission.records.filter((r) => r.is_top10) : [];
    const otherRecords = Array.isArray(apiSubmission.other_records) ? apiSubmission.other_records : Array.isArray(apiSubmission.records) ? apiSubmission.records.filter((r) => !r.is_top10) : [];
    const dateCoverage = computeDateCoverage([...analyticsRecords, ...otherRecords, ...(Array.isArray(apiSubmission.records) ? apiSubmission.records : [])], apiSubmission.reporting_date);
    const hasMarketAndType = !isArrival && ([...analyticsRecords, ...otherRecords].some((r) => r.price_type || r.source_name));

    return {
      datasetId: apiSubmission.id,
      datasetType: dType,
      savedBy: submitterFullName,
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
      <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
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
      <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
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

  const INFO_ROWS = [
    ...(isManual
      ? [["Entry Source", "Manual Data Entry"]]
      : [["Uploaded File", ds.fileName || "—"], ["File Type", ds.fileType || "xlsx"]]),
    ["Dataset Type", ds.datasetType],
    ["Market / Facility", ds.market],
    ...(!isArrival && ds.priceType !== "—" ? [["Price Type", ds.priceType]] : []),
    ["Date Coverage", ds.dateCoverage],
    ["Submission Method", ds.submissionMethod || ds.entryMethod],
    ["Saved By", ds.savedBy],
    ["Saved Date and Time", ds.savedDateTime]
  ];

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
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
      <div className="space-y-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">
            {ds.fileName && ds.fileName !== "—" ? ds.fileName : ds.datasetId}
          </h1>
          {ds.fileName && ds.fileName !== "—" && (
            <span className="text-[13px] text-[var(--hw-neutral-500)] font-medium">({ds.datasetId})</span>
          )}
        </div>
        <p className="text-[14px] text-[var(--hw-neutral-800)]">{ds.datasetType} · {ds.savedDateTime}</p>
        <p className="text-[14px] text-[var(--hw-neutral-800)]">Saved by {ds.savedBy}</p>
      </div>



      {/* Dataset Information */}
      <div className={`${cardCls} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-[var(--hw-neutral-100)]">
          <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Dataset Information</p>
        </div>
        <div className="px-5 divide-y divide-[var(--hw-neutral-100)]">
          {INFO_ROWS.map(([label, value]) => (
            <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4 py-3">
              <span className="text-[13px] font-medium text-[var(--hw-neutral-800)] sm:w-52 flex-shrink-0">{label}</span>
              <span className="text-[14px] text-[var(--hw-neutral-900)]">{value}</span>
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

      {/* Validation Result */}
      {showValidation && (
        <div className={`${cardCls} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Validation Result</p>
            <p className="text-[13px] text-[var(--hw-neutral-800)] mt-0.5">Saved records are read-only.</p>
          </div>

          <ValTabNav active={valTab} onChange={setValTab} ds={ds} />

          {/* Analytics-Supported Records */}
          {valTab === "analytics" && (
            <>
              <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)] flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[var(--hw-neutral-500)] flex-shrink-0 mt-0.5" />
                <p className="text-[14px] text-[var(--hw-neutral-700)]">
                  These records are used in HarvestWise price trends, forecasting, and analytical processing where applicable.
                </p>
              </div>
              {ds.analyticsRecords.length === 0 ? (
                <div className="px-5 py-10 text-center text-[14px] text-[var(--hw-neutral-800)]">
                  No analytics-supported records in this dataset.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {isArrival ? (
                    <table className="w-full">
                      <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                        <tr>
                          {["Row", "Commodity", "Variety", "Date / Month", "Farm Source", "Other Source", "Combined Total", "Unit"].map((h) => (
                            <th key={h} className={thCls}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                        {ds.analyticsRecords.map((r, idx) => (
                          <tr key={idx}>
                            <td className={tdCls}>{idx + 1}</td>
                            <td className={tdBold}>{r.commodity || r.commodity_name || "—"}</td>
                            <td className={tdCls}>{r.variety || "—"}</td>
                            <td className={tdCls}>{formatDateOrMonth(r.dateMonth || r.arrival_date)}</td>
                            <td className={tdCls}>{r.farm_source_volume_kg != null ? Number(r.farm_source_volume_kg).toLocaleString() : (r.farmSource != null ? Number(r.farmSource).toLocaleString() : "—")}</td>
                            <td className={tdCls}>{r.other_source_volume_kg != null ? Number(r.other_source_volume_kg).toLocaleString() : (r.otherSource != null ? Number(r.otherSource).toLocaleString() : "—")}</td>
                            <td className={tdBold}>{r.volume_kg != null ? Number(r.volume_kg).toLocaleString() : (r.combinedTotal != null ? Number(r.combinedTotal).toLocaleString() : "—")}</td>
                            <td className={tdCls}>{r.unit || "kg"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                        <tr>
                          {(ds.hasMarketAndType
                            ? ["Row", "Commodity", "Category", "Variety", "Market", "Type", "Date", "UOM", "Price"]
                            : ["Row", "Commodity", "Category", "Variety", "Date", "UOM", "Price"]
                          ).map((h) => (
                            <th key={h} className={thCls}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                        {ds.analyticsRecords.map((r, idx) => (
                          <tr key={idx}>
                            <td className={tdCls}>{idx + 1}</td>
                            <td className={tdBold}>{r.commodity || r.commodity_name || "—"}</td>
                            <td className={tdCls}>{r.category || "—"}</td>
                            <td className={tdCls}>{r.variety || "—"}</td>
                            {ds.hasMarketAndType && <td className={tdCls}>{formatMarketName(r.source_name || r.market) || "—"}</td>}
                            {ds.hasMarketAndType && <td className={tdCls}>{r.price_type || "—"}</td>}
                            <td className={tdCls}>{formatDateOrMonth(r.price_date || r.date)}</td>
                            <td className={tdCls}>{r.uom || "kg"}</td>
                            <td className={tdBold}>{r.prevail_price != null ? `₱${Number(r.prevail_price).toFixed(2)}` : (r.price != null ? `₱${Number(r.price).toFixed(2)}` : "—")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}

          {/* Other Commodity Records */}
          {valTab === "other" && (
            <>
              <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)] flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[var(--hw-neutral-500)] flex-shrink-0 mt-0.5" />
                <p className="text-[14px] text-[var(--hw-neutral-700)]">
                  These commodities are not part of HarvestWise crop analytics. Records in this list are retained for DFTC monitoring and will be automatically removed after 30 days.
                </p>
              </div>
              {ds.otherRecords.length === 0 ? (
                <div className="px-5 py-10 text-center text-[14px] text-[var(--hw-neutral-800)]">
                  No other commodity records in this dataset.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {isArrival ? (
                    <table className="w-full">
                      <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                        <tr>
                          {["Row", "Commodity", "Variety", "Date / Month", "Farm Source", "Other Source", "Combined Total", "Unit"].map((h) => (
                            <th key={h} className={thCls}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                        {ds.otherRecords.map((r, idx) => (
                          <tr key={idx}>
                            <td className={tdCls}>{idx + 1}</td>
                            <td className={tdBold}>{r.commodity || r.commodity_name || "—"}</td>
                            <td className={tdCls}>{r.variety || "—"}</td>
                            <td className={tdCls}>{formatDateOrMonth(r.dateMonth || r.arrival_date)}</td>
                            <td className={tdCls}>{r.farm_source_volume_kg != null ? Number(r.farm_source_volume_kg).toLocaleString() : (r.farmSource != null ? Number(r.farmSource).toLocaleString() : "—")}</td>
                            <td className={tdCls}>{r.other_source_volume_kg != null ? Number(r.other_source_volume_kg).toLocaleString() : (r.otherSource != null ? Number(r.otherSource).toLocaleString() : "—")}</td>
                            <td className={tdBold}>{r.volume_kg != null ? Number(r.volume_kg).toLocaleString() : (r.combinedTotal != null ? Number(r.combinedTotal).toLocaleString() : "—")}</td>
                            <td className={tdCls}>{r.unit || "kg"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                        <tr>
                          {(ds.hasMarketAndType
                            ? ["Row", "Commodity", "Category", "Variety", "Market", "Type", "Date", "UOM", "Price"]
                            : ["Row", "Commodity", "Category", "Variety", "Date", "UOM", "Price"]
                          ).map((h) => (
                            <th key={h} className={thCls}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                        {ds.otherRecords.map((r, idx) => (
                          <tr key={idx}>
                            <td className={tdCls}>{idx + 1}</td>
                            <td className={tdBold}>{r.commodity || r.commodity_name || "—"}</td>
                            <td className={tdCls}>{r.category || "—"}</td>
                            <td className={tdCls}>{r.variety || "—"}</td>
                            {ds.hasMarketAndType && <td className={tdCls}>{formatMarketName(r.source_name || r.market) || "—"}</td>}
                            {ds.hasMarketAndType && <td className={tdCls}>{r.price_type || "—"}</td>}
                            <td className={tdCls}>{formatDateOrMonth(r.price_date || r.date)}</td>
                            <td className={tdCls}>{r.uom || "kg"}</td>
                            <td className={tdBold}>{r.prevail_price != null ? `₱${Number(r.prevail_price).toFixed(2)}` : (r.price != null ? `₱${Number(r.price).toFixed(2)}` : "—")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export { DFTCSubmissionDetail as default };
