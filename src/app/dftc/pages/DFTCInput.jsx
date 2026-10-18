import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PenLine,
  Upload,
  FileText,
  X,
  ChevronRight,
  CheckCircle,
  Truck,
  Trash2
} from "lucide-react";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { apiGet, parseResponse } from "../../global/api";
import { DFTCFilePreview } from "../components/DFTCFilePreview";
import { DFTCArrivalPreview } from "../components/DFTCArrivalPreview";
import {
  buildSavedDatasetsList,
  formatMarketName,
  getLocalDateString,
  formatSavedDate,
  isSubmissionFileUpload,
  isSubmissionToday
} from "./dftcSavedDatasets";

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
  const [searchParams] = useSearchParams();
  const todayStr = getLocalDateString();

  const highlightParam = searchParams.get("highlight");
  const [highlightedDraftId, setHighlightedDraftId] = useState(highlightParam);

  // 3-second temporary highlight timer (matching Good crops to plant pattern)
  useEffect(() => {
    if (!highlightParam) return;
    setHighlightedDraftId(highlightParam);
    const timer = setTimeout(() => {
      setHighlightedDraftId(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [highlightParam]);

  // Smooth scroll to highlighted draft or section
  useEffect(() => {
    if (!highlightedDraftId) return;
    const timer = setTimeout(() => {
      const el =
        document.getElementById(`draft-row-${highlightedDraftId}`) ||
        document.getElementById("dftc-drafts-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [highlightedDraftId]);

  const [successMessage, setSuccessMessage] = useState(() => {
    const state = location.state;
    return state?.successMsg ?? "";
  });
  const [page, setPage] = useState(1);
  const [previewFile, setPreviewFile] = useState(null);
  const [deleteModalDraft, setDeleteModalDraft] = useState(null);
  const [deletedDraftIds, setDeletedDraftIds] = useState(new Set());

  // Preserve just-saved submission context across history.replaceState so that freshly saved items
  // are immediately pinned as the latest (first) item in Today's Saved Data.
  const justSavedRef = useRef({
    type: location.state?.justSavedType,
    date: location.state?.justSavedDate,
    at: location.state?.justSavedAt || (location.state?.successMsg ? new Date().toISOString() : null),
    id: location.state?.justSavedId
  });

  useEffect(() => {
    if (location.state?.successMsg) {
      setPage(1);
    }
  }, [location.state]);

  const justSavedType = justSavedRef.current.type;
  const justSavedDate = justSavedRef.current.date;
  const justSavedAt = justSavedRef.current.at;

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

  // Fetch compiled daily report preview for today to ensure records count matches the details view
  const { data: todayReportPreview } = useQuery({
    queryKey: ["dftc-report-preview", todayStr],
    queryFn: async () => {
      const res = await apiGet(`/dftc/reports/preview?date=${todayStr}`);
      return parseResponse(res);
    },
    enabled: !!todayStr,
    refetchOnMount: "always"
  });

  const todayReportRecordCount = useMemo(() => {
    if (!todayReportPreview?.rows) return 0;
    return todayReportPreview.rows.filter(
      (r) =>
        r.bangkerohan_landing != null ||
        r.bangkerohan_wholesale != null ||
        r.bangkerohan_retail != null ||
        r.dftc_taboan_wholesale != null ||
        r.dftc_taboan_retail != null
    ).length;
  }, [todayReportPreview]);

  const rawSubmissions = submissionsData?.items || [];

  // Format submissions: manual price entries for the same reporting date are consolidated into ONE report file.
  // File uploads are kept separate as individual datasets.
  const savedDataList = useMemo(() => {
    const all = buildSavedDatasetsList(
      rawSubmissions,
      todayStr,
      todayReportRecordCount,
      justSavedRef.current
    );
    return all.filter((s) => s.isToday || s.isJustSaved);
  }, [rawSubmissions, todayStr, todayReportRecordCount, justSavedType, justSavedDate, justSavedAt]);

  // Today's Draft: unsaved entries in progress
  const draftList = useMemo(() => {
    const drafts = [];

    // 1. Check local price monitoring draft
    try {
      const hasPriceDraft = localStorage.getItem("dftc_price_draft") === "true";
      const rawPriceData = localStorage.getItem("dftc_price_draft_data");
      if (hasPriceDraft && rawPriceData) {
        const priceDraft = JSON.parse(rawPriceData);
        let count = 0;
        if (priceDraft?.tabFields) {
          for (const tab of Object.values(priceDraft.tabFields)) {
            for (const field of Object.values(tab || {})) {
              if (field?.samples?.some((s) => s !== "" && s !== null && s !== undefined)) {
                count++;
              }
            }
          }
        }
        let dateFormatted = todayStr;
        try {
          const d = new Date((priceDraft.selectedDate || todayStr) + "T00:00:00");
          dateFormatted = d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
        } catch {}

        drafts.push({
          id: "local-price-draft",
          route: "/dftc/price-input",
          dataName: `DFTC Price Monitoring — ${dateFormatted}`,
          dataType: "Daily Price Monitoring",
          market: "Bankerohan & DFTC Taboan",
          submissionMethod: "Manual Input",
          savedDate: "Unsaved Draft",
          records: count || 1,
          draftData: priceDraft
        });
      }
    } catch {}

    // 2. Check local arrival volume draft
    try {
      const hasArrivalDraft = localStorage.getItem("dftc_arrival_draft") === "true";
      const rawArrivalData = localStorage.getItem("dftc_arrival_draft_data");
      if (hasArrivalDraft && rawArrivalData) {
        const arrivalDraft = JSON.parse(rawArrivalData);
        let count = 0;
        if (arrivalDraft?.fields) {
          const hasVal = (v) => v !== "" && v !== null && v !== undefined && String(v).trim() !== "" && !isNaN(Number(v)) && Number(v) > 0;
          for (const field of Object.values(arrivalDraft.fields || {})) {
            if (
              hasVal(field?.farmSource) ||
              hasVal(field?.otherSource) ||
              hasVal(field?.farmSourceVolume) ||
              hasVal(field?.otherSourcesVolume) ||
              hasVal(field?.reportedVolume) ||
              hasVal(field?.volume)
            ) {
              count++;
            }
          }
        }
        let dateFormatted = todayStr;
        try {
          const d = new Date((arrivalDraft.selectedDate || todayStr) + "T00:00:00");
          dateFormatted = d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
        } catch {}

        drafts.push({
          id: "local-arrival-draft",
          route: "/dftc/arrival-input",
          dataName: `DFTC Arrival Volume — ${dateFormatted}`,
          dataType: "DFTC Arrival Volume",
          market: "DFTC Taboan",
          submissionMethod: "Manual Input",
          savedDate: "Unsaved Draft",
          records: count || 1,
          draftData: arrivalDraft
        });
      }
    } catch {}

    // 3. Any backend submissions with status "draft"
    for (const sub of rawSubmissions) {
      if (String(sub.status || "").toLowerCase() === "draft" && isSubmissionToday(sub, todayStr)) {
        const isArrival = sub.data_type === "arrival_volume" || sub.data_type === "arrival";
        const market = formatMarketName(sub.source_name || sub.source_id);
        const dataName = isArrival
          ? `${market} Arrival Volume — ${sub.reporting_date || todayStr}`
          : `DFTC Price Monitoring — ${sub.reporting_date || todayStr}`;
        drafts.push({
          id: `sub-draft-${sub.id}`,
          route: isArrival ? "/dftc/arrival-input" : "/dftc/price-input",
          dataName,
          dataType: isArrival ? "DFTC Arrival Volume" : "Daily Price Monitoring",
          market: isArrival ? market : "Bankerohan & DFTC Taboan",
          submissionMethod: "Manual Input",
          savedDate: "Unsaved Draft",
          records: sub.record_count ?? 1,
          draftData: sub
        });
      }
    }

    // 4. Fallback if navigated with highlight parameter and draft not yet present
    const highlightLower = (highlightParam || "").toLowerCase();
    const hasPriceDraft = drafts.some(
      (d) => d.id === "local-price-draft" || d.dataType.toLowerCase().includes("price")
    );
    if (
      !hasPriceDraft &&
      (highlightLower === "price" ||
        highlightLower === "local-price-draft" ||
        highlightLower.includes("price"))
    ) {
      let dateFormatted = todayStr;
      try {
        const d = new Date(todayStr + "T00:00:00");
        dateFormatted = d.toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric"
        });
      } catch {}
      drafts.push({
        id: "local-price-draft",
        route: "/dftc/price-input",
        dataName: `DFTC Price Monitoring — ${dateFormatted}`,
        dataType: "Daily Price Monitoring",
        market: "Bankerohan & DFTC Taboan",
        submissionMethod: "Manual Input",
        savedDate: "Unsaved Draft",
        records: todayReportRecordCount || 10,
        draftData: null
      });
    }

    const hasArrivalDraft = drafts.some(
      (d) => d.id === "local-arrival-draft" || d.dataType.toLowerCase().includes("arrival")
    );
    if (
      !hasArrivalDraft &&
      (highlightLower === "arrival" ||
        highlightLower === "local-arrival-draft" ||
        highlightLower.includes("arrival"))
    ) {
      let dateFormatted = todayStr;
      try {
        const d = new Date(todayStr + "T00:00:00");
        dateFormatted = d.toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric"
        });
      } catch {}
      drafts.push({
        id: "local-arrival-draft",
        route: "/dftc/arrival-input",
        dataName: `DFTC Arrival Volume — ${dateFormatted}`,
        dataType: "DFTC Arrival Volume",
        market: "DFTC Taboan",
        submissionMethod: "Manual Input",
        savedDate: "Unsaved Draft",
        records: 10,
        draftData: null
      });
    }

    return drafts;
  }, [rawSubmissions, todayStr, todayReportRecordCount, highlightParam]);

  const visibleDrafts = useMemo(() => {
    return draftList.filter(d => !deletedDraftIds.has(d.id));
  }, [draftList, deletedDraftIds]);

  const handleDeleteDraft = async () => {
    if (!deleteModalDraft) return;
    const draft = deleteModalDraft;

    try {
      if (draft.id === "local-price-draft") {
        localStorage.removeItem("dftc_price_draft");
        localStorage.removeItem("dftc_price_draft_data");
      } else if (draft.id === "local-arrival-draft") {
        localStorage.removeItem("dftc_arrival_draft");
        localStorage.removeItem("dftc_arrival_draft_data");
      }

      setDeletedDraftIds(prev => {
        const next = new Set(prev);
        next.add(draft.id);
        return next;
      });
    } catch (e) {
      console.error("Failed to delete draft:", e);
    } finally {
      setDeleteModalDraft(null);
    }
  };

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

  const handleSelectDraft = (draft) => {
    navigate(draft.route, {
      state: {
        restoreDraft: true,
        draftData: draft.draftData
      }
    });
  };

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
      encodedBy: file.encodedBy || meta.encodedBy || "MARIA S. SANTOS",
      encodedByRole: file.encodedByRole || meta.encodedByRole || "Data Analyst",
      reviewedBy: file.reviewedBy || meta.reviewedBy || "MARIA S. SANTOS",
      reviewedByRole: file.reviewedByRole || meta.reviewedByRole || "Data Analyst"
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

      {/* Today's Draft */}
      <div className="space-y-4" id="dftc-drafts-section">
        <div>
          <h2 className="text-[16px] sm:text-[17px] font-bold text-[var(--hw-neutral-900)]">Today's Draft</h2>
          <p className="text-[13px] text-[var(--hw-neutral-600)] mt-0.5">
            Unsaved forms and entries in progress. Click any draft to view or finish editing before saving.
          </p>
        </div>

        {visibleDrafts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-5 py-6 text-center">
            <p className="text-[13px] text-[var(--hw-neutral-700)] font-medium">No drafts available today.</p>
            <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
              Unsaved price or arrival inputs will appear here so other users can view them before saving.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                <tr>
                  {["Data Name", "Data Type", "Market or Facility", "Submission Method", "Draft Status", "Records", ""].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[12px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                {visibleDrafts.map((draft) => {
                  const param = (highlightedDraftId || "").toLowerCase();
                  const draftId = (draft.id || "").toLowerCase();
                  const dataType = (draft.dataType || "").toLowerCase();
                  const isHighlighted = Boolean(
                    highlightedDraftId &&
                    (draftId === param ||
                      (param.includes("price") && (draftId.includes("price") || dataType.includes("price"))) ||
                      (param.includes("arrival") && (draftId.includes("arrival") || dataType.includes("arrival"))) ||
                      draftId.includes(param))
                  );

                  return (
                    <tr
                      key={draft.id}
                      id={`draft-row-${draft.id}`}
                      onClick={() => handleSelectDraft(draft)}
                      className={`cursor-pointer transition-all duration-700 ease-out ${
                        isHighlighted
                          ? "bg-emerald-50/90 font-medium"
                          : "hover:bg-amber-50/40"
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-[13px] ${isHighlighted ? "text-[var(--hw-green-800)] font-bold" : "text-[var(--hw-neutral-900)] font-medium"}`}>
                            {draft.dataName}
                          </span>
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                            Draft
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-[var(--hw-neutral-700)]">{draft.dataType}</td>
                      <td className="px-5 py-4 text-[13px] text-[var(--hw-neutral-700)]">{draft.market}</td>
                      <td className="px-5 py-4 text-[13px] text-[var(--hw-neutral-700)]">{draft.submissionMethod}</td>
                      <td className="px-5 py-4 text-[13px] text-[var(--hw-neutral-700)]">{draft.savedDate || "Unsaved"}</td>
                      <td className="px-5 py-4 text-[13px] font-bold text-[var(--hw-neutral-900)]">{draft.records}</td>
                      <td className="px-5 py-4 text-right">
                        {(draft.id === "local-price-draft" || draft.id === "local-arrival-draft") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModalDraft(draft);
                            }}
                            className="p-2 rounded-lg text-[var(--hw-neutral-400)] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete draft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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

      {/* Delete Draft Confirmation Modal */}
      {deleteModalDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteModalDraft(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <p className="font-semibold text-[var(--hw-neutral-900)]">Delete Draft?</p>
            <p className="text-[14px] text-[var(--hw-neutral-800)]">
              This draft will be permanently deleted. This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteModalDraft(null)}
                className="flex-1 py-2.5 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDraft}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-[13px] font-medium hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
