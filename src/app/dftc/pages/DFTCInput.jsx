import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PenLine,
  Upload,
  FileText,
  X,
  Search,
  ChevronRight,
  ChevronDown,
  Check,
  CheckCircle,
  Truck,
  Trash2,
  Loader2
} from "lucide-react";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { apiDelete, apiGet, parseResponse } from "../../global/api";
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
  const queryClient = useQueryClient();
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
  const [deletingDraft, setDeletingDraft] = useState(false);
  const [deletedDraftIds, setDeletedDraftIds] = useState(new Set());
  const [dateRangeFilter, setDateRangeFilter] = useState("7d"); // "7d" | "30d"
  const [datasetTypeFilter, setDatasetTypeFilter] = useState("all"); // "all" | "arrival" | "price"
  const [searchFilter, setSearchFilter] = useState("");
  const [isDaysDropdownOpen, setIsDaysDropdownOpen] = useState(false);
  const [isModuleDropdownOpen, setIsModuleDropdownOpen] = useState(false);
  const daysDropdownRef = useRef(null);
  const moduleDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (daysDropdownRef.current && !daysDropdownRef.current.contains(event.target)) {
        setIsDaysDropdownOpen(false);
      }
      if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(event.target)) {
        setIsModuleDropdownOpen(false);
      }
    }
    if (isDaysDropdownOpen || isModuleDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDaysDropdownOpen, isModuleDropdownOpen]);

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
      const res = await apiGet("/dftc/submissions?page=1&page_size=100");
      return parseResponse(res);
    },
    // Global defaults set staleTime: 30min and refetchOnMount: false, so
    // returning here from the price/arrival entry pages reused the pre-save
    // cache and the submission just saved was missing from the recent list.
    // Saving invalidates this key while this page is unmounted, which only
    // marks it stale — the refetch therefore has to be forced on mount.
    refetchOnMount: "always"
  });

  // Drafts are shared server state. Local storage is only a recovery fallback
  // for an entry page that was offline, so this page must not list it as the
  // canonical draft when the API has a shared draft available.
  const { data: sharedDrafts } = useQuery({
    queryKey: ["dftc", "shared-drafts", todayStr],
    queryFn: async () => {
      const [price, arrival] = await Promise.all([
        parseResponse(await apiGet(`/dftc/price-draft?reporting_date=${todayStr}`)),
        parseResponse(await apiGet(`/dftc/arrival-draft?reporting_date=${todayStr}`)),
      ]);
      return { price, arrival };
    },
    refetchOnMount: "always",
    // The entry pages already synchronize their active draft. Keep this
    // overview poll as a low-frequency fallback and never run it in a hidden
    // tab, where several mounted queries can otherwise create a request burst.
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
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

  const cutoffDays = dateRangeFilter === "30d" ? 30 : 7;
  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - cutoffDays);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [cutoffDays]);

  const recentSaved = useMemo(() => {
    const all = buildSavedDatasetsList(
      rawSubmissions,
      todayStr,
      todayReportRecordCount,
      justSavedRef.current
    );
    const query = searchFilter.trim().toLowerCase();

    return all.filter((item) => {
      // 1. Timeframe filter
      const rawDate = item.savedAtRaw || item.reportingDate;
      let isWithinCutoff = item.isToday || item.isJustSaved;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime()) && d >= cutoffDate) {
          isWithinCutoff = true;
        }
      }
      if (!isWithinCutoff) return false;

      // 2. Module / Dataset Type filter
      if (datasetTypeFilter === "arrival" && !item.isArrival) return false;
      if (datasetTypeFilter === "price" && item.isArrival) return false;

      // 3. Search filter: dataset name, ID, date, user, market, etc.
      if (query) {
        const searchableFields = [
          item.name,
          item.dataName,
          item.id,
          item.submissionId,
          item.reportingDate,
          item.savedDate,
          item.savedAt,
          item.savedAtRaw,
          item.savedBy,
          item.submitted_by_name,
          item.encoded_by,
          item.preparedBy,
          item.userId,
          item.market,
          item.submissionMethod,
          item.entryMethod,
          item.dataType,
          item.status
        ].filter(Boolean);
        const matchesSearch = searchableFields.some((f) =>
          String(f).toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [
    rawSubmissions,
    todayStr,
    todayReportRecordCount,
    cutoffDate,
    datasetTypeFilter,
    searchFilter,
    justSavedType,
    justSavedDate,
    justSavedAt
  ]);

  // Today's Draft: unsaved entries in progress
  const draftList = useMemo(() => {
    const drafts = [];
    const serverPriceDraft = sharedDrafts?.price;
    const serverArrivalDraft = sharedDrafts?.arrival;
    const hasServerPriceDraft = Boolean(serverPriceDraft?.id && serverPriceDraft.cells?.length);
    const hasServerArrivalDraft = Boolean(serverArrivalDraft?.id && Object.keys(serverArrivalDraft.payload?.fields || {}).length);

    // 1. Check local price monitoring draft
    try {
      const hasPriceDraft = localStorage.getItem("dftc_price_draft") === "true";
      const rawPriceData = localStorage.getItem("dftc_price_draft_data");
      if (!hasServerPriceDraft && hasPriceDraft && rawPriceData) {
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
      if (!hasServerArrivalDraft && hasArrivalDraft && rawArrivalData) {
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

    if (hasServerPriceDraft) {
      drafts.push({
        id: "server-price-draft",
        route: "/dftc/price-input",
        dataName: `DFTC Price Monitoring — ${new Date(todayStr + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`,
        dataType: "Daily Price Monitoring",
        market: "Bankerohan & DFTC Taboan",
        submissionMethod: "Manual Input",
        savedDate: "Unsaved Draft",
        records: serverPriceDraft.cells.length,
        draftData: null,
      });
    }
    if (hasServerArrivalDraft) {
      drafts.push({
        id: "server-arrival-draft",
        route: "/dftc/arrival-input",
        dataName: `DFTC Arrival Volume — ${new Date(todayStr + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`,
        dataType: "DFTC Arrival Volume",
        market: "DFTC Taboan",
        submissionMethod: "Manual Input",
        savedDate: "Unsaved Draft",
        records: Object.keys(serverArrivalDraft.payload?.fields || {}).length,
        draftData: null,
      });
    }

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
  }, [rawSubmissions, todayStr, todayReportRecordCount, highlightParam, sharedDrafts]);

  const visibleDrafts = useMemo(() => {
    return draftList.filter(d => !deletedDraftIds.has(d.id));
  }, [draftList, deletedDraftIds]);

  const handleDeleteDraft = async () => {
    if (!deleteModalDraft || deletingDraft) return;
    const draft = deleteModalDraft;
    setDeletingDraft(true);

    let remoteDeleted = true;
    try {
      const isPriceDraft = draft.route === "/dftc/price-input";
      const isArrivalDraft = draft.route === "/dftc/arrival-input";
      const reportingDate = draft.draftData?.selectedDate || todayStr;
      if (isPriceDraft) {
        await apiDelete(`/dftc/price-draft?reporting_date=${encodeURIComponent(reportingDate)}`);
      } else if (isArrivalDraft) {
        await apiDelete(`/dftc/arrival-draft?reporting_date=${encodeURIComponent(reportingDate)}`);
      }

      if (isPriceDraft) {
        localStorage.removeItem("dftc_price_draft");
        localStorage.removeItem("dftc_price_draft_data");
      } else if (isArrivalDraft) {
        localStorage.removeItem("dftc_arrival_draft");
        localStorage.removeItem("dftc_arrival_draft_data");
      }

      setDeletedDraftIds(prev => {
        const next = new Set(prev);
        next.add(draft.id);
        return next;
      });
      queryClient.setQueryData(["dftc", "shared-drafts", reportingDate], (current) => {
        if (!current) return current;
        return {
          ...current,
          ...(isPriceDraft ? { price: null } : { arrival: null }),
        };
      });
      await queryClient.invalidateQueries({ queryKey: ["dftc", "shared-drafts", reportingDate] });
    } catch (e) {
      remoteDeleted = false;
      console.error("Failed to delete draft:", e);
    } finally {
      setDeletingDraft(false);
      if (remoteDeleted) setDeleteModalDraft(null);
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

  const handleSelectDraft = (draft) => {
    navigate(draft.route, {
      state: {
        restoreDraft: true,
        draftData: draft.draftData
      }
    });
  };

  const handleSelectFile = (file) => {
    let meta = {};
    try {
      const stored = localStorage.getItem(`dftc_report_personnel_${file.reportingDate}`);
      if (stored) meta = JSON.parse(stored);
    } catch {}

    setPreviewFile({
      reportId: file.id,
      submissionId: file.submissionId || file.id,
      isArrival: file.isArrival,
      analyticsRecords: file.analyticsRecords,
      otherRecords: file.otherRecords,
      dataName: file.dataName || file.name,
      dataType: file.dataType,
      market: file.market,
      submissionMethod: file.submissionMethod,
      entryMethod: file.submissionMethod,
      reportingDate: file.reportingDate || file.savedDate,
      savedDate: file.savedDate,
      records: file.records,
      encodedBy: meta.encodedBy || file.encodedBy || file.submitted_by_name || file.savedBy || "",
      encodedByRole: meta.encodedByRole || file.encodedByRole || "Data Analyst",
      reviewedBy: meta.reviewedBy || file.reviewedBy || "",
      reviewedByRole: meta.reviewedByRole || file.reviewedByRole || "Data Analyst"
    });
  };

  if (previewFile) {
    // Arrival volumes are a separate dataset from prevailing prices, and
    // DFTCFilePreview only renders the price report. Routing by isArrival stops
    // an arrival row from opening a price report for the same date.
    const PreviewComponent = previewFile.isArrival ? DFTCArrivalPreview : DFTCFilePreview;
    return (
      <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 pb-24 md:pb-12 max-w-[1440px] mx-auto">
        <PreviewComponent file={previewFile} onClose={() => setPreviewFile(null)} />
      </div>
    );
  }

  return (
    <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 pb-24 md:pb-12 max-w-[1440px] mx-auto space-y-6 md:space-y-10">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 md:gap-6">
        <button
          onClick={() => navigate("/dftc/price-input")}
          className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3 sm:p-6 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-all active:scale-[.99] flex items-center gap-3 sm:gap-4 cursor-pointer"
        >
          <div className="p-2.5 sm:p-3.5 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <PenLine className="w-6 h-6 text-[var(--hw-green-700)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] text-[var(--hw-neutral-900)]">Input Price Data</p>
            <p className="text-[11.5px] sm:text-[12px] text-[var(--hw-neutral-600)] mt-0 leading-snug">Encode price data gathered from the market.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--hw-neutral-400)] shrink-0" />
        </button>

        <button
          onClick={() => navigate("/dftc/arrival-input")}
          className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3 sm:p-6 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-all active:scale-[.99] flex items-center gap-3 sm:gap-4 cursor-pointer"
        >
          <div className="p-2.5 sm:p-3.5 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <Truck className="w-6 h-6 text-[var(--hw-green-700)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] text-[var(--hw-neutral-900)]">Input Arrival Volume</p>
            <p className="text-[11.5px] sm:text-[12px] text-[var(--hw-neutral-600)] mt-0 leading-snug">Encode commodity arrival volumes.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--hw-neutral-400)] shrink-0" />
        </button>

        <button
          onClick={() => navigate("/dftc/upload")}
          className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3 sm:p-6 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-all active:scale-[.99] flex items-center gap-3 sm:gap-4 cursor-pointer"
        >
          <div className="p-2.5 sm:p-3.5 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <Upload className="w-6 h-6 text-[var(--hw-green-700)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] text-[var(--hw-neutral-900)]">Upload Data</p>
            <p className="text-[11.5px] sm:text-[12px] text-[var(--hw-neutral-600)] mt-0 leading-snug">Import an existing Excel or CSV dataset.</p>
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
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
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
                          {(draft.route === "/dftc/price-input" || draft.route === "/dftc/arrival-input") && (
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

            {/* Mobile cards for Today's Draft */}
            <div className="block md:hidden space-y-3">
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
                  <div
                    key={draft.id}
                    id={`draft-card-${draft.id}`}
                    onClick={() => handleSelectDraft(draft)}
                    className={`rounded-2xl border p-4 text-left shadow-[var(--shadow-xs)] transition-all cursor-pointer ${
                      isHighlighted
                        ? "bg-emerald-50/90 border-[var(--hw-green-600)] ring-1 ring-[var(--hw-green-600)]"
                        : "bg-white border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)] active:scale-[.99]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-[14px] leading-snug font-semibold ${isHighlighted ? "text-[var(--hw-green-900)]" : "text-[var(--hw-neutral-900)]"}`}>
                          {draft.dataName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 text-[10.5px] font-semibold rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                          Draft
                        </span>
                        {(draft.route === "/dftc/price-input" || draft.route === "/dftc/arrival-input") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModalDraft(draft);
                            }}
                            className="p-1.5 rounded-lg text-[var(--hw-neutral-400)] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete draft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--hw-neutral-600)]">
                      <span>{draft.dataType}</span>
                      <span className="text-[var(--hw-neutral-300)]">•</span>
                      <span>{draft.market}</span>
                      {draft.submissionMethod && (
                        <>
                          <span className="text-[var(--hw-neutral-300)]">•</span>
                          <span>{draft.submissionMethod}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--hw-neutral-100)] text-[12px]">
                      <span className="text-[var(--hw-neutral-500)]">{draft.savedDate || "Unsaved draft"}</span>
                      <span className="font-semibold text-[var(--hw-neutral-900)]">{draft.records} records</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Recent Saved Data */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-[var(--hw-neutral-100)] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-[var(--hw-neutral-900)]">Recent Saved Data</p>
            <p className="text-[12px] text-[var(--hw-neutral-600)] mt-0.5">
              Datasets saved and validated in the last {dateRangeFilter === "30d" ? "30" : "7"} days
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Search records filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--hw-neutral-400)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search records..."
                aria-label="Filter records"
                className="w-36 sm:w-44 pl-7 pr-6 py-1.5 text-[12px] bg-white border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-900)] placeholder:text-[var(--hw-neutral-400)] focus:outline-none focus:border-[var(--hw-green-600)] transition-colors shadow-xs"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)] p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Module Dropdown Button */}
            <div className="relative" ref={moduleDropdownRef}>
              <button
                type="button"
                aria-label="Filter by module"
                onClick={() => {
                  setIsModuleDropdownOpen((prev) => !prev);
                  setIsDaysDropdownOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] bg-white border border-[var(--hw-neutral-200)] hover:border-[var(--hw-neutral-300)] rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              >
                <span>
                  {datasetTypeFilter === "arrival"
                    ? "Arrival Volume"
                    : datasetTypeFilter === "price"
                    ? "Price Monitoring"
                    : "All Modules"}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-[var(--hw-neutral-500)] transition-transform duration-150 ${isModuleDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isModuleDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-30 w-40 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg py-1 text-[12px]">
                  <button
                    type="button"
                    onClick={() => {
                      setDatasetTypeFilter("all");
                      setIsModuleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer ${
                      datasetTypeFilter === "all" ? "font-semibold text-[var(--hw-green-700)] bg-[var(--hw-green-50)]/50" : "text-[var(--hw-neutral-700)]"
                    }`}
                  >
                    <span>All Modules</span>
                    {datasetTypeFilter === "all" && <Check className="w-3.5 h-3.5 text-[var(--hw-green-700)]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDatasetTypeFilter("arrival");
                      setIsModuleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer ${
                      datasetTypeFilter === "arrival" ? "font-semibold text-[var(--hw-green-700)] bg-[var(--hw-green-50)]/50" : "text-[var(--hw-neutral-700)]"
                    }`}
                  >
                    <span>Arrival Volume</span>
                    {datasetTypeFilter === "arrival" && <Check className="w-3.5 h-3.5 text-[var(--hw-green-700)]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDatasetTypeFilter("price");
                      setIsModuleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer ${
                      datasetTypeFilter === "price" ? "font-semibold text-[var(--hw-green-700)] bg-[var(--hw-green-50)]/50" : "text-[var(--hw-neutral-700)]"
                    }`}
                  >
                    <span>Price Monitoring</span>
                    {datasetTypeFilter === "price" && <Check className="w-3.5 h-3.5 text-[var(--hw-green-700)]" />}
                  </button>
                </div>
              )}
            </div>

            {/* Days Dropdown Button */}
            <div className="relative" ref={daysDropdownRef}>
              <button
                type="button"
                aria-label="Filter by days"
                onClick={() => {
                  setIsDaysDropdownOpen((prev) => !prev);
                  setIsModuleDropdownOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] bg-white border border-[var(--hw-neutral-200)] hover:border-[var(--hw-neutral-300)] rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              >
                <span>{dateRangeFilter === "30d" ? "Last 30 Days" : "Last 7 Days"}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-[var(--hw-neutral-500)] transition-transform duration-150 ${isDaysDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isDaysDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-30 w-36 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg py-1 text-[12px]">
                  <button
                    type="button"
                    onClick={() => {
                      setDateRangeFilter("7d");
                      setIsDaysDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer ${
                      dateRangeFilter === "7d" ? "font-semibold text-[var(--hw-green-700)] bg-[var(--hw-green-50)]/50" : "text-[var(--hw-neutral-700)]"
                    }`}
                  >
                    <span>Last 7 Days</span>
                    {dateRangeFilter === "7d" && <Check className="w-3.5 h-3.5 text-[var(--hw-green-700)]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateRangeFilter("30d");
                      setIsDaysDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer ${
                      dateRangeFilter === "30d" ? "font-semibold text-[var(--hw-green-700)] bg-[var(--hw-green-50)]/50" : "text-[var(--hw-neutral-700)]"
                    }`}
                  >
                    <span>Last 30 Days</span>
                    {dateRangeFilter === "30d" && <Check className="w-3.5 h-3.5 text-[var(--hw-green-700)]" />}
                  </button>
                </div>
              )}
            </div>

            <span className="hidden sm:inline text-[var(--hw-neutral-200)] font-light">|</span>

            {/* View Data History */}
            <button
              onClick={() => navigate("/dftc/submissions")}
              className="text-[12px] sm:text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors shrink-0 cursor-pointer whitespace-nowrap"
            >
              View Data History
            </button>
          </div>
        </div>

        {loadingSubmissions ? (
          <div className="p-4 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--hw-neutral-100)] last:border-0">
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-40 bg-[var(--hw-neutral-200)] rounded" />
                  <div className="h-3 w-56 bg-[var(--hw-neutral-200)] rounded" />
                </div>
                <div className="h-4 w-16 bg-[var(--hw-neutral-200)] rounded" />
              </div>
            ))}
          </div>
        ) : recentSaved.length === 0 ? (
          <div className="p-6 text-center text-[var(--hw-neutral-500)] text-[13px] space-y-2">
            <p>
              {datasetTypeFilter !== "all" || dateRangeFilter !== "7d" || searchFilter.trim()
                ? "No saved datasets match the selected filters."
                : `No saved datasets from the last ${dateRangeFilter === "30d" ? "30" : "7"} days. Encoded or uploaded datasets will appear here.`}
            </p>
            {(datasetTypeFilter !== "all" || dateRangeFilter !== "7d" || Boolean(searchFilter.trim())) && (
              <button
                type="button"
                onClick={() => {
                  setDatasetTypeFilter("all");
                  setDateRangeFilter("7d");
                  setSearchFilter("");
                }}
                className="text-[12px] font-medium text-[var(--hw-green-700)] hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--hw-neutral-100)] max-h-[320px] sm:max-h-[360px] overflow-y-auto">
            {recentSaved.map((row) => (
              <button
                key={row.id}
                onClick={() => handleSelectFile(row)}
                className="w-full px-3.5 sm:px-5 py-3 sm:py-3.5 flex items-start sm:items-center gap-2.5 sm:gap-4 text-left hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <p className="text-[13.5px] sm:text-[14px] font-semibold sm:font-medium text-[var(--hw-neutral-900)] leading-snug group-hover:text-[var(--hw-green-800)] transition-colors">
                      {row.name}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {row.isToday && (
                        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[var(--hw-green-50)] text-[var(--hw-green-700)] border border-[var(--hw-green-200)] shrink-0">
                          Today
                        </span>
                      )}
                      <span className="sm:hidden text-[11px] font-medium text-[var(--hw-neutral-500)] bg-[var(--hw-neutral-100)] px-1.5 py-0.5 rounded">
                        {row.submissionId || row.id}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11.5px] sm:text-[12px] text-[var(--hw-neutral-600)] mt-1 sm:mt-0.5">
                    <span className="font-medium text-[var(--hw-neutral-700)]">{row.market}</span>
                    <span className="text-[var(--hw-neutral-300)]">•</span>
                    <span>{row.entryMethod}</span>
                    <span className="text-[var(--hw-neutral-300)]">•</span>
                    <span>{row.savedAt}</span>
                    {row.savedBy && (
                      <>
                        <span className="text-[var(--hw-neutral-300)]">•</span>
                        <span>Saved by {row.savedBy}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="hidden sm:block shrink-0 text-right">
                  <p className="text-[13px] font-medium text-[var(--hw-neutral-900)]">{row.submissionId || row.id}</p>
                  <p className="text-[12px] text-[var(--hw-green-700)] mt-0.5 font-medium capitalize">{row.status}</p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-center self-center shrink-0">
                  <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] group-hover:text-[var(--hw-neutral-600)] transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Delete Draft Confirmation Modal */}
      {deleteModalDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !deletingDraft && setDeleteModalDraft(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            {deletingDraft ? (
              <div className="py-4 text-center" role="status" aria-live="polite">
                <Loader2 className="w-8 h-8 mx-auto mb-3 text-red-600 animate-spin" aria-hidden="true" />
                <p className="font-semibold text-[var(--hw-neutral-900)]">Deleting draft…</p>
                <p className="text-[14px] text-[var(--hw-neutral-600)] mt-1">
                  Please wait while the shared draft is removed.
                </p>
              </div>
            ) : (
              <>
                <p className="font-semibold text-[var(--hw-neutral-900)]">Delete Draft?</p>
                <p className="text-[14px] text-[var(--hw-neutral-800)]">
                  This draft will be permanently deleted. This action cannot be undone.
                </p>
              </>
            )}
            <div className="flex gap-2 pt-2">
              <button
                disabled={deletingDraft}
                onClick={() => setDeleteModalDraft(null)}
                className="flex-1 py-2.5 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                disabled={deletingDraft}
                onClick={handleDeleteDraft}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-[13px] font-medium hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingDraft ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
