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

export default function DFTCInput() {
  const navigate = useNavigate();
  const location = useLocation();
  const todayStr = getLocalDateString();

  const [successMessage, setSuccessMessage] = useState(() => {
    const state = location.state;
    return state?.successMsg ?? "";
  });
  const [showAllSaved, setShowAllSaved] = useState(false);
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

  // Format submissions: manual price entries for the same reporting date are consolidated into ONE report file
  const savedDataList = useMemo(() => {
    const list = [];
    const manualPricesByDate = new Map();

    for (const sub of rawSubmissions) {
      const isArrival = sub.data_type === "arrival_volume" || sub.data_type === "arrival";
      const isFileUpload = sub.submission_method === "File Upload" || !!sub.file_name;
      const reportingDate = sub.reporting_date || (sub.saved_at ? sub.saved_at.slice(0, 10) : "");

      // Consolidate manual price entries for the same reporting date into one unified report
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

        const dataName = isArrival
          ? `${market} Arrival Volume — ${sub.reporting_date || formatSavedDate(sub.saved_at || sub.created_at)}`
          : (sub.file_name || `${market} ${priceTypeCapitalized} Prices — ${sub.reporting_date || formatSavedDate(sub.saved_at || sub.created_at)}`);

        const dataType = isArrival
          ? "DFTC Arrival Volume"
          : (isFileUpload ? "Price Dataset (File)" : `Daily ${priceTypeCapitalized} Prices`);
        const entryMethod = isFileUpload ? "File Upload" : (sub.submission_method || "Manual Input");
        const savedDate = formatSavedDate(sub.saved_at || sub.created_at);
        const isNew = sub.saved_at?.slice(0, 10) === todayStr || sub.created_at?.slice(0, 10) === todayStr || sub.reporting_date === todayStr;

        list.push({
          id: sub.submission_id || sub.id,
          submissionId: sub.id || sub.submission_id,
          isArrival,
          analyticsRecords: sub.analytics_records || [],
          otherRecords: sub.other_records || [],
          dataName,
          dataType,
          market,
          entryMethod,
          savedDate,
          savedAtRaw: sub.saved_at || sub.created_at || "",
          reportingDate: sub.reporting_date || (sub.saved_at ? sub.saved_at.slice(0, 10) : ""),
          records: sub.record_count ?? 0,
          isNew
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
      const isNew = latestSub?.saved_at?.slice(0, 10) === todayStr || latestSub?.created_at?.slice(0, 10) === todayStr || dateStr === todayStr;

      let dateFormatted = dateStr;
      try {
        const d = new Date(dateStr + "T00:00:00");
        dateFormatted = d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
      } catch {
        dateFormatted = dateStr;
      }

      list.push({
        id: `manual-price-${dateStr}`,
        dataName: `DFTC Price Monitoring — ${dateFormatted}`,
        dataType: "Daily Price Monitoring",
        market: "Bankerohan & DFTC Taboan",
        entryMethod: "Manual Input",
        savedDate,
        savedAtRaw: latestSub?.saved_at || latestSub?.created_at || "",
        reportingDate: dateStr,
        records: totalRecords,
        isNew
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

  const displayedSavedData = showAllSaved ? savedDataList : savedDataList.slice(0, 10);

  const handleSelectFile = (file) => {
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
      entryMethod: file.entryMethod,
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

      {/* Recent Saved Data */}
      <div className="space-y-4">
        <div>
          <h2 className="text-[16px] sm:text-[17px] font-bold text-[var(--hw-neutral-900)]">Recent Saved Data</h2>
          <p className="text-[13px] text-[var(--hw-neutral-600)] mt-0.5">
            Recent datasets saved or imported. All records are securely retained.
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
            <p className="text-[14px] text-[var(--hw-neutral-700)] font-medium">No saved data yet.</p>
            <p className="text-[12px] text-[var(--hw-neutral-500)] mt-1">Datasets will appear here after you save or upload data.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
              <table className="w-full">
                <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                  <tr>
                    {["Data Name", "Data Type", "Market or Facility", "Entry Method", "Saved Date", "Records"].map((h) => (
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
                      <td className="px-5 py-4 text-[13px] text-[var(--hw-neutral-700)] whitespace-nowrap">{file.entryMethod}</td>
                      <td className="px-5 py-4 text-[13px] text-[var(--hw-neutral-700)] whitespace-nowrap">{file.savedDate}</td>
                      <td className="px-5 py-4 text-[13px] font-medium text-[var(--hw-neutral-900)]">{file.records ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    <span>{file.entryMethod}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--hw-neutral-100)] text-[12px]">
                    <span className="text-[var(--hw-neutral-500)]">{file.savedDate}</span>
                    <span className="font-semibold text-[var(--hw-neutral-900)]">{file.records ?? 0} records</span>
                  </div>
                </button>
              ))}
            </div>

            {savedDataList.length > 10 && !showAllSaved && (
              <div className="mt-3 text-center">
                <button onClick={() => setShowAllSaved(true)} className="text-[13px] font-medium text-[var(--hw-green-700)] hover:underline cursor-pointer">
                  View All Recent Data ({savedDataList.length} total)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
