import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PenLine,
  Upload,
  FileText,
  X,
  ChevronRight,
  CheckCircle,
  Truck
} from "lucide-react";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { apiGet, parseResponse } from "../../global/api";
import { DFTCFilePreview } from "../components/DFTCFilePreview";
import { DFTCArrivalPreview } from "../components/DFTCArrivalPreview";

function formatMarketName(sourceId) {
  if (!sourceId) return "—";
  const lower = sourceId.toLowerCase();
  if (lower.includes("bkrh") || lower.includes("bangkerohan") || lower.includes("bankerohan")) {
    return "Bangkerohan Public Market";
  }
  if (lower.includes("dftc") || lower.includes("taboan")) {
    return "DFTC Taboan";
  }
  return sourceId;
}

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatSavedDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return dateStr;
  }
}

function isSubmissionFileUpload(sub) {
  if (!sub) return false;
  const m = String(sub.submission_method || "").toLowerCase();
  if (m.includes("upload") || m.includes("file") || m.includes("excel") || m.includes("csv")) {
    return true;
  }
  return Boolean(sub.file_name || sub.original_file_name);
}

function isSubmissionToday(sub, todayStr) {
  if (!sub) return false;
  const checkDate = (val) => {
    if (!val) return false;
    const s = String(val);
    if (s.slice(0, 10) === todayStr) return true;
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime()) && getLocalDateString(d) === todayStr) return true;
    } catch {}
    return false;
  };
  return checkDate(sub.reporting_date) || checkDate(sub.saved_at) || checkDate(sub.created_at);
}

const PAGE_SIZE = 10;

function Pagination({ page, total, pageSize = PAGE_SIZE, onChange }) {
  const pages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

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

export default function DFTCInput() {
  const navigate = useNavigate();
  const location = useLocation();
  const todayStr = getLocalDateString();

  const [successMessage, setSuccessMessage] = useState(() => {
    const state = location.state;
    return state?.successMsg ?? "";
  });
  const [page, setPage] = useState(1);
  const [previewFile, setPreviewFile] = useState(null);

  // Fetch real submissions
  const { data: submissionsData, isLoading: loadingSubmissions } = useQuery({
    queryKey: ["dftc", "submissions"],
    queryFn: async () => {
      const res = await apiGet("/dftc/submissions?page=1&page_size=50");
      return parseResponse(res);
    },
    // Global defaults set staleTime: 30min and refetchOnMount: false, so
    // returning here from the price/arrival entry pages reused the pre-save
    // cache and the submission just saved was missing from the recent list.
    // Saving invalidates this key while this page is unmounted, which only
    // marks it stale — the refetch therefore has to be forced on mount.
    refetchOnMount: "always"
  });

  const rawSubmissions = submissionsData?.items || [];

  // Format submissions: manual price entries for the same reporting date are consolidated into ONE report file.
  // File uploads are kept separate as individual datasets.
  const savedDataList = useMemo(() => {
    const list = [];
    const manualPricesByDate = new Map();

    const todaySubmissions = rawSubmissions.filter((sub) => isSubmissionToday(sub, todayStr));

    for (const sub of todaySubmissions) {
      const isArrival = sub.data_type === "arrival_volume" || sub.data_type === "arrival";
      const isFileUpload = isSubmissionFileUpload(sub);
      const submissionMethod = isFileUpload ? "File Upload" : "Manual Input";
      const reportingDate = sub.reporting_date || (sub.saved_at ? sub.saved_at.slice(0, 10) : "");

      // Consolidate ONLY manual price entries for the same reporting date into one unified report
      if (!isArrival && !isFileUpload && reportingDate) {
        if (!manualPricesByDate.has(reportingDate)) {
          manualPricesByDate.set(reportingDate, []);
        }
        manualPricesByDate.get(reportingDate).push(sub);
      } else {
        const market = formatMarketName(sub.source_name || sub.source_id);
        const priceTypeCapitalized = sub.price_type
          ? sub.price_type.charAt(0).toUpperCase() + sub.price_type.slice(1).toLowerCase()
          : "";

        const defaultName = isArrival
          ? `${market} Arrival Volume — ${sub.reporting_date || formatSavedDate(sub.saved_at || sub.created_at)}`
          : `${market} ${priceTypeCapitalized ? priceTypeCapitalized + " " : ""}Prices — ${sub.reporting_date || formatSavedDate(sub.saved_at || sub.created_at)}`;

        const dataName = isFileUpload
          ? (sub.original_file_name || sub.file_name || defaultName)
          : defaultName;

        const dataType = isArrival
          ? "DFTC Arrival Volume"
          : (priceTypeCapitalized ? `Daily ${priceTypeCapitalized} Prices` : "Price Dataset");

        const savedDate = formatSavedDate(sub.saved_at || sub.created_at);

        list.push({
          id: sub.submission_id || sub.id,
          submissionId: sub.id || sub.submission_id,
          isArrival,
          isFileUpload,
          analyticsRecords: sub.analytics_records || [],
          otherRecords: sub.other_records || [],
          dataName,
          dataType,
          market,
          submissionMethod,
          entryMethod: submissionMethod,
          savedDate,
          savedAtRaw: sub.saved_at || sub.created_at || "",
          reportingDate: sub.reporting_date || (sub.saved_at ? sub.saved_at.slice(0, 10) : ""),
          records: sub.record_count ?? 0,
          isNew: true
        });
      }
    }

    // Add consolidated manual price monitoring files
    for (const [dateStr, subs] of manualPricesByDate.entries()) {
      const totalRecords = subs.reduce((acc, s) => acc + (s.record_count ?? 0), 0);
      const latestSub = [...subs].sort(
        (a, b) => new Date(b.saved_at || b.created_at || 0).getTime() - new Date(a.saved_at || a.created_at || 0).getTime()
      )[0];
      const savedDate = formatSavedDate(latestSub?.saved_at || latestSub?.created_at);

      let dateFormatted = dateStr;
      try {
        const d = new Date(dateStr + "T00:00:00");
        dateFormatted = d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
      } catch {
        dateFormatted = dateStr;
      }

      list.push({
        id: `manual-price-${dateStr}`,
        submissionId: latestSub?.id,
        isArrival: false,
        isFileUpload: false,
        dataName: `DFTC Price Monitoring — ${dateFormatted}`,
        dataType: "Daily Price Monitoring",
        market: "Bankerohan & DFTC Taboan",
        submissionMethod: "Manual Input",
        entryMethod: "Manual Input",
        savedDate,
        savedAtRaw: latestSub?.saved_at || latestSub?.created_at || "",
        reportingDate: dateStr,
        records: totalRecords,
        isNew: true
      });
    }

    list.sort((a, b) => {
      const timeA = new Date(a.savedAtRaw || 0).getTime();
      const timeB = new Date(b.savedAtRaw || 0).getTime();
      return timeB - timeA;
    });

    return list;
  }, [rawSubmissions, todayStr]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 6000);
    return () => clearTimeout(t);
  }, [successMessage]);

  useEffect(() => {
    const s = location.state;
    if (s?.restoreScrollY) {
      window.scrollTo({ top: s.restoreScrollY, behavior: "instant" });
    }
    if (location.state) window.history.replaceState({}, "");
  }, []);

  const totalPages = Math.ceil(savedDataList.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const displayedSavedData = savedDataList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSelectFile = (file) => {
    if (file.submissionMethod === "File Upload" || file.isFileUpload) {
      navigate(`/dftc/submissions/${file.submissionId || file.id}`);
      return;
    }

    let meta = {};
    try {
      const stored = localStorage.getItem(`dftc_report_personnel_${file.reportingDate}`);
      if (stored) meta = JSON.parse(stored);
    } catch {}

    setPreviewFile({
      reportId: file.id,
      submissionId: file.submissionId,
      isArrival: file.isArrival,
      analyticsRecords: file.analyticsRecords,
      otherRecords: file.otherRecords,
      dataName: file.dataName,
      dataType: file.dataType,
      market: file.market,
      submissionMethod: file.submissionMethod,
      entryMethod: file.submissionMethod,
      reportingDate: file.reportingDate || file.savedDate,
      savedDate: file.savedDate,
      records: file.records,
      encodedBy: file.encodedBy || meta.encodedBy,
      encodedByRole: file.encodedByRole || meta.encodedByRole,
      reviewedBy: file.reviewedBy || meta.reviewedBy,
      reviewedByRole: file.reviewedByRole || meta.reviewedByRole
    });
  };

  if (previewFile) {
    // Arrival volumes are a separate dataset from prevailing prices, and
    // DFTCFilePreview only renders the price report. Routing by isArrival stops
    // an arrival row from opening a price report for the same date.
    const PreviewComponent = previewFile.isArrival ? DFTCArrivalPreview : DFTCFilePreview;
    return (
      <div className="px-4 md:px-8 lg:px-10 py-6 pb-24 md:pb-12 max-w-[1440px] mx-auto">
        <PreviewComponent file={previewFile} onClose={() => setPreviewFile(null)} />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 lg:px-10 py-6 pb-24 md:pb-12 max-w-[1440px] mx-auto space-y-8 md:space-y-10">
      {successMessage && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 shadow-xs">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="flex-1 text-[13px] text-emerald-800 font-medium">{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="p-1 rounded-lg hover:bg-emerald-100 cursor-pointer">
            <X className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      )}

      <PageHeader
        title="Submit Data"
        description="Input, upload, and review market price and arrival-volume data."
      />

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
        <button
          onClick={() => navigate("/dftc/price-input")}
          className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 sm:p-6 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-all active:scale-[.99] flex items-center gap-4 cursor-pointer"
        >
          <div className="p-3.5 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <PenLine className="w-6 h-6 text-[var(--hw-green-700)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] text-[var(--hw-neutral-900)]">Input Price Data</p>
            <p className="text-[12px] text-[var(--hw-neutral-600)] mt-0.5 leading-snug">Encode price data gathered from the market.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--hw-neutral-400)] shrink-0" />
        </button>

        <button
          onClick={() => navigate("/dftc/arrival-input")}
          className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 sm:p-6 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-all active:scale-[.99] flex items-center gap-4 cursor-pointer"
        >
          <div className="p-3.5 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <Truck className="w-6 h-6 text-[var(--hw-green-700)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] text-[var(--hw-neutral-900)]">Input Arrival Volume</p>
            <p className="text-[12px] text-[var(--hw-neutral-600)] mt-0.5 leading-snug">Encode commodity arrival volumes.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--hw-neutral-400)] shrink-0" />
        </button>

        <button
          onClick={() => navigate("/dftc/upload")}
          className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 sm:p-6 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-all active:scale-[.99] flex items-center gap-4 cursor-pointer"
        >
          <div className="p-3.5 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <Upload className="w-6 h-6 text-[var(--hw-green-700)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] text-[var(--hw-neutral-900)]">Upload Data</p>
            <p className="text-[12px] text-[var(--hw-neutral-600)] mt-0.5 leading-snug">Import an existing Excel or CSV dataset.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--hw-neutral-400)] shrink-0" />
        </button>
      </div>

      {/* Today's Saved Data */}
      <div className="space-y-4">
        <div>
          <h2 className="text-[16px] sm:text-[17px] font-bold text-[var(--hw-neutral-900)]">Today's Saved Data</h2>
          <p className="text-[13px] text-[var(--hw-neutral-600)] mt-0.5">
            Datasets saved or imported today. All records are securely retained.
          </p>
        </div>

        {loadingSubmissions ? (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-6 space-y-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--hw-neutral-100)] last:border-0">
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-48 bg-[var(--hw-neutral-200)] rounded" />
                  <div className="h-3 w-32 bg-[var(--hw-neutral-200)] rounded" />
                </div>
                <div className="h-4 w-16 bg-[var(--hw-neutral-200)] rounded" />
              </div>
            ))}
          </div>
        ) : savedDataList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-5 py-12 text-center">
            <FileText className="w-9 h-9 text-[var(--hw-neutral-300)] mx-auto mb-2" />
            <p className="text-[14px] text-[var(--hw-neutral-700)] font-medium">No saved data today.</p>
            <p className="text-[12px] text-[var(--hw-neutral-500)] mt-1">Datasets saved or uploaded today will appear here.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
              <table className="w-full">
                <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                  <tr>
                    {["Data Name", "Data Type", "Market or Facility", "Submission Method", "Saved Date", "Records"].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-[12px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {displayedSavedData.map((file) => (
                    <tr
                      key={file.id}
                      onClick={() => handleSelectFile(file)}
                      className="hover:bg-[var(--hw-neutral-50)] cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-[var(--hw-neutral-900)] font-medium">{file.dataName}</span>
                          {file.isNew && (
                            <span className="text-[10px] font-semibold text-[var(--hw-green-700)] bg-[var(--hw-green-50)] border border-[var(--hw-green-200)] rounded px-1.5 py-0.5 leading-none whitespace-nowrap">
                              New
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-[var(--hw-neutral-700)] whitespace-nowrap">{file.dataType}</td>
                      <td className="px-5 py-4 text-[13px] text-[var(--hw-neutral-700)] whitespace-nowrap">{file.market}</td>
                      <td className="px-5 py-4 text-[13px] text-[var(--hw-neutral-700)] whitespace-nowrap">{file.submissionMethod || file.entryMethod}</td>
                      <td className="px-5 py-4 text-[13px] text-[var(--hw-neutral-700)] whitespace-nowrap">{file.savedDate}</td>
                      <td className="px-5 py-4 text-[13px] font-medium text-[var(--hw-neutral-900)]">{file.records ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={currentPage} total={savedDataList.length} pageSize={PAGE_SIZE} onChange={setPage} />
            </div>

            {/* Mobile cards */}
            <div className="block md:hidden space-y-3.5">
              {displayedSavedData.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleSelectFile(file)}
                  className="w-full bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left hover:bg-[var(--hw-neutral-50)] transition-colors active:scale-[.99] cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-[14px] font-medium text-[var(--hw-neutral-900)] leading-snug">{file.dataName}</p>
                    {file.isNew && (
                      <span className="shrink-0 text-[10px] font-semibold text-[var(--hw-green-700)] bg-[var(--hw-green-50)] border border-[var(--hw-green-200)] rounded px-1.5 py-0.5 leading-none">New</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--hw-neutral-600)]">
                    <span>{file.dataType}</span>
                    <span>•</span>
                    <span>{file.market}</span>
                    <span>•</span>
                    <span>{file.submissionMethod || file.entryMethod}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--hw-neutral-100)] text-[12px]">
                    <span className="text-[var(--hw-neutral-500)]">{file.savedDate}</span>
                    <span className="font-semibold text-[var(--hw-neutral-900)]">{file.records ?? 0} records</span>
                  </div>
                </button>
              ))}

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 border border-[var(--hw-neutral-200)] rounded-lg text-[13px] text-[var(--hw-neutral-800)] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-1.5 text-[13px] text-[var(--hw-neutral-800)] font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
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
      </div>
    </div>
  );
}
