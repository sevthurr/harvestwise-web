import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  Sparkles,
  Calendar,
} from "lucide-react";
import { apiGet, apiPost, parseResponse } from "../../global/api";
import { useAuth } from "../../global/contexts/AuthContext";
import { PAGE_CATEGORY_GROUPS } from "../components/dftcReportCategories";
import { DEFAULT_PERSONNEL } from "../components/DFTCReportShell";
import {
  PRICE_REPORT_THEMES,
  buildPeriodicPriceWorkbook,
  buildPeriodicArrivalWorkbook,
} from "../utils/periodicReportExcel";
import { FULL_MONTH_NAMES, SHORT_MONTH_NAMES, getLocalDateString } from "./dftcSavedDatasets";

const ALL_CATEGORIES = PAGE_CATEGORY_GROUPS.flat();

const REPORT_COMBINATION_PRESETS = [
  {
    id: "price-weekly-bankerohan-retail",
    label: "Price Data - Weekly - Bangkerohan Public Market - Retail",
    dataType: "price",
    period: "weekly",
    market: "Bangkerohan Public Market",
    priceType: "Retail",
  },
  {
    id: "price-weekly-bankerohan-wholesale",
    label: "Price Data - Weekly - Bangkerohan Public Market - Wholesale",
    dataType: "price",
    period: "weekly",
    market: "Bangkerohan Public Market",
    priceType: "Wholesale",
  },
  {
    id: "price-weekly-bankerohan-landing",
    label: "Price Data - Weekly - Bangkerohan Public Market - Landing",
    dataType: "price",
    period: "weekly",
    market: "Bangkerohan Public Market",
    priceType: "Landing",
  },
  {
    id: "price-weekly-dftc-retail",
    label: "Price Data - Weekly - DFTC Taboan - Retail",
    dataType: "price",
    period: "weekly",
    market: "DFTC Taboan",
    priceType: "Retail",
  },
  {
    id: "price-weekly-dftc-wholesale",
    label: "Price Data - Weekly - DFTC Taboan - Wholesale",
    dataType: "price",
    period: "weekly",
    market: "DFTC Taboan",
    priceType: "Wholesale",
  },
  {
    id: "price-monthly-bankerohan-retail",
    label: "Price Data - Monthly - Bangkerohan Public Market - Retail",
    dataType: "price",
    period: "monthly",
    market: "Bangkerohan Public Market",
    priceType: "Retail",
  },
  {
    id: "price-monthly-bankerohan-wholesale",
    label: "Price Data - Monthly - Bangkerohan Public Market - Wholesale",
    dataType: "price",
    period: "monthly",
    market: "Bangkerohan Public Market",
    priceType: "Wholesale",
  },
  {
    id: "price-monthly-bankerohan-landing",
    label: "Price Data - Monthly - Bangkerohan Public Market - Landing",
    dataType: "price",
    period: "monthly",
    market: "Bangkerohan Public Market",
    priceType: "Landing",
  },
  {
    id: "price-monthly-dftc-retail",
    label: "Price Data - Monthly - DFTC Taboan - Retail",
    dataType: "price",
    period: "monthly",
    market: "DFTC Taboan",
    priceType: "Retail",
  },
  {
    id: "price-monthly-dftc-wholesale",
    label: "Price Data - Monthly - DFTC Taboan - Wholesale",
    dataType: "price",
    period: "monthly",
    market: "DFTC Taboan",
    priceType: "Wholesale",
  },
  {
    id: "arrival-weekly-dftc",
    label: "Arrival Data - Weekly - DFTC Taboan",
    dataType: "arrival_volume",
    period: "weekly",
    market: "DFTC Taboan",
    priceType: null,
  },
  {
    id: "arrival-weekly-bankerohan",
    label: "Arrival Data - Weekly - Bangkerohan Public Market",
    dataType: "arrival_volume",
    period: "weekly",
    market: "Bangkerohan Public Market",
    priceType: null,
  },
  {
    id: "arrival-monthly-dftc",
    label: "Arrival Data - Monthly - DFTC Taboan",
    dataType: "arrival_volume",
    period: "monthly",
    market: "DFTC Taboan",
    priceType: null,
  },
  {
    id: "arrival-monthly-bankerohan",
    label: "Arrival Data - Monthly - Bangkerohan Public Market",
    dataType: "arrival_volume",
    period: "monthly",
    market: "Bangkerohan Public Market",
    priceType: null,
  },
];

function normalizeKey(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getMondayOfWeek(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return new Date();
  const day = d.getDay(); // 0 = Sun, 1 = Mon
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export default function DFTCGenerateReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const prefill = location.state?.prefill || null;
  const now = new Date();
  const todayIso = getLocalDateString(now);

  const [dataType, setDataType] = useState(() => {
    if (prefill) return prefill.isArrival ? "arrival_volume" : "price";
    return "price";
  });
  const [period, setPeriod] = useState(() => prefill?.reportPeriod || "weekly");
  const [market, setMarket] = useState(() => {
    if (prefill?.market) {
      return String(prefill.market).toLowerCase().includes("dftc")
        ? "DFTC Taboan"
        : "Bangkerohan Public Market";
    }
    return "Bangkerohan Public Market";
  });
  const [priceType, setPriceType] = useState(() => prefill?.priceType || "Retail");

  // Weekly anchor date (any date in the selected week)
  const [weekAnchorDate, setWeekAnchorDate] = useState(() => {
    if (prefill?.reportingDate && /^\d{4}-\d{2}-\d{2}$/.test(prefill.reportingDate)) {
      return prefill.reportingDate;
    }
    return todayIso;
  });

  // Monthly selectors
  const [selectedYear, setSelectedYear] = useState(() => {
    if (prefill?.reportingDate && /^\d{4}-\d{2}/.test(prefill.reportingDate)) {
      return Number(prefill.reportingDate.slice(0, 4));
    }
    return now.getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (prefill?.reportingDate && /^\d{4}-\d{2}/.test(prefill.reportingDate)) {
      return Number(prefill.reportingDate.slice(5, 7));
    }
    return now.getMonth() + 1;
  });

  // Personnel
  const [encodedBy, setEncodedBy] = useState(
    () => prefill?.encoded_by || prefill?.encodedBy || DEFAULT_PERSONNEL.encodedBy
  );
  const [encodedByRole, setEncodedByRole] = useState(DEFAULT_PERSONNEL.encodedByRole);
  const [reviewedBy, setReviewedBy] = useState(
    () => prefill?.submitted_by_name || prefill?.savedBy || DEFAULT_PERSONNEL.reviewedBy
  );
  const [reviewedByRole, setReviewedByRole] = useState(DEFAULT_PERSONNEL.reviewedByRole);

  const [activeArrivalSheet, setActiveArrivalSheet] = useState("OVERALL TOTAL");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [generatedSubmission, setGeneratedSubmission] = useState(null);
  const [hasGeneratedPreview, setHasGeneratedPreview] = useState(Boolean(prefill));

  // If user switches market to DFTC Taboan while Landing is selected, switch to Retail
  useEffect(() => {
    if (market === "DFTC Taboan" && priceType === "Landing") {
      setPriceType("Retail");
    }
  }, [market, priceType]);

  // Staff directory query to populate default encoder / reviewer names
  const { data: staffData } = useQuery({
    queryKey: ["dftc", "staff-list"],
    queryFn: async () => {
      try {
        const res = await apiGet("/dftc/staff");
        return parseResponse(res);
      } catch {
        return { items: [] };
      }
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (prefill) return;
    const staffItems = staffData?.items || [];
    if (staffItems.length > 0) {
      const first = staffItems[0];
      const fullFirst = `${first.first_name || ""} ${first.middle_name ? first.middle_name + " " : ""}${first.last_name || ""}`.trim();
      if (fullFirst) {
        setEncodedBy(fullFirst.toUpperCase());
        if (first.position_title) setEncodedByRole(first.position_title);
      }
      const second = staffItems[1] || staffItems[0];
      const fullSecond = `${second.first_name || ""} ${second.middle_name ? second.middle_name + " " : ""}${second.last_name || ""}`.trim();
      if (fullSecond) {
        setReviewedBy(fullSecond.toUpperCase());
        if (second.position_title) setReviewedByRole(second.position_title);
      }
    } else if (user?.first_name) {
      const uName = `${user.first_name} ${user.last_name || ""}`.trim().toUpperCase();
      if (uName) setReviewedBy(uName);
    }
  }, [staffData, user, prefill]);

  // Compute query date, dayColumns, periodLabel, sheetName
  const periodInfo = useMemo(() => {
    if (period === "weekly") {
      const mon = getMondayOfWeek(weekAnchorDate);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      const dayColumns = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        const isoDate = getLocalDateString(d);
        const dayNum = d.getDate();
        const mShort = SHORT_MONTH_NAMES[d.getMonth()];
        dayColumns.push({
          isoDate,
          dayNum,
          dayLabel: dayNum,
          shortLabel: `${mShort.toUpperCase()} ${dayNum}`,
        });
      }
      const sameMonth = mon.getMonth() === sun.getMonth();
      const mStartFull = FULL_MONTH_NAMES[mon.getMonth()];
      const mEndFull = FULL_MONTH_NAMES[sun.getMonth()];
      const periodLabel = sameMonth
        ? `${mStartFull} ${mon.getDate()}-${sun.getDate()}, ${sun.getFullYear()}`
        : `${SHORT_MONTH_NAMES[mon.getMonth()]} ${mon.getDate()} - ${SHORT_MONTH_NAMES[sun.getMonth()]} ${sun.getDate()}, ${sun.getFullYear()}`;
      const arrivalSubtitle = sameMonth
        ? `For the Period of ${mStartFull} ${mon.getDate()}–${sun.getDate()}, ${sun.getFullYear()}`
        : `For the Period of ${SHORT_MONTH_NAMES[mon.getMonth()]} ${mon.getDate()} – ${SHORT_MONTH_NAMES[sun.getMonth()]} ${sun.getDate()}, ${sun.getFullYear()}`;
      const sheetName = sameMonth
        ? `${SHORT_MONTH_NAMES[mon.getMonth()]} ${mon.getDate()}-${sun.getDate()}, ${sun.getFullYear()}`
        : `${SHORT_MONTH_NAMES[mon.getMonth()]} ${mon.getDate()}-${SHORT_MONTH_NAMES[sun.getMonth()]} ${sun.getDate()}`;
      return {
        reportingDate: getLocalDateString(mon),
        startDate: getLocalDateString(mon),
        endDate: getLocalDateString(sun),
        dayColumns,
        periodLabel,
        arrivalSubtitle,
        sheetName,
      };
    }

    // Monthly
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const mName = FULL_MONTH_NAMES[selectedMonth - 1] || "November";
    const mShort = SHORT_MONTH_NAMES[selectedMonth - 1] || "Nov";
    const mPadded = String(selectedMonth).padStart(2, "0");
    const dayColumns = [];
    for (let d = 1; d <= lastDay; d++) {
      const dPadded = String(d).padStart(2, "0");
      dayColumns.push({
        isoDate: `${selectedYear}-${mPadded}-${dPadded}`,
        dayNum: d,
        dayLabel: d,
        shortLabel: `${mShort.toUpperCase()} ${d}`,
      });
    }
    return {
      reportingDate: `${selectedYear}-${mPadded}-01`,
      startDate: `${selectedYear}-${mPadded}-01`,
      endDate: `${selectedYear}-${mPadded}-${String(lastDay).padStart(2, "0")}`,
      dayColumns,
      periodLabel: `${mName} 1-${lastDay}, ${selectedYear}`,
      arrivalSubtitle: `For the Month of ${mName} ${selectedYear}`,
      sheetName: mName,
    };
  }, [period, weekAnchorDate, selectedYear, selectedMonth]);

  // Active combination preset ID
  const currentPresetId = useMemo(() => {
    const matched = REPORT_COMBINATION_PRESETS.find(
      (p) =>
        p.dataType === dataType &&
        p.period === period &&
        p.market === market &&
        (dataType === "arrival_volume" || p.priceType === priceType)
    );
    return matched?.id || "";
  }, [dataType, period, market, priceType]);

  const handlePresetChange = (presetId) => {
    const found = REPORT_COMBINATION_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setDataType(found.dataType);
    setPeriod(found.period);
    setMarket(found.market);
    if (found.priceType) setPriceType(found.priceType);
    setGeneratedSubmission(null);
  };

  // Query live preview data from backend
  const {
    data: pricePreviewData,
    isLoading: loadingPricePreview,
    refetch: refetchPricePreview,
  } = useQuery({
    queryKey: [
      "dftc",
      "periodic-price-preview",
      periodInfo.reportingDate,
      period,
      market,
      priceType,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        date: periodInfo.reportingDate,
        period,
        source_id: market,
        price_type: priceType,
      });
      const res = await apiGet(`/dftc/reports/preview?${params.toString()}`);
      return parseResponse(res);
    },
    enabled: dataType === "price",
    staleTime: 0,
  });

  const {
    data: arrivalPreviewData,
    isLoading: loadingArrivalPreview,
    refetch: refetchArrivalPreview,
  } = useQuery({
    queryKey: [
      "dftc",
      "periodic-arrival-preview",
      periodInfo.reportingDate,
      period,
      market,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        date: periodInfo.reportingDate,
        period,
        source_id: market,
      });
      const res = await apiGet(`/dftc/reports/arrival-preview?${params.toString()}`);
      return parseResponse(res);
    },
    enabled: dataType === "arrival_volume",
    staleTime: 0,
  });

  const isLoadingPreview =
    dataType === "price" ? loadingPricePreview : loadingArrivalPreview;

  // Build Price Report categories + lookup
  const reportCategories = useMemo(() => {
    const apiCategories = pricePreviewData?.categories;
    if (Array.isArray(apiCategories) && apiCategories.length > 0) {
      return apiCategories;
    }
    return ALL_CATEGORIES;
  }, [pricePreviewData]);

  const priceRowLookup = useMemo(() => {
    const map = {};
    for (const r of pricePreviewData?.rows || []) {
      const cKey = normalizeKey(r.commodity_name);
      const vKey = normalizeKey(r.variety);
      const fullKey = `${cKey}__${vKey}`;
      map[fullKey] = r;
      if (!map[`${cKey}__`]) {
        map[`${cKey}__`] = r;
      }
    }
    return map;
  }, [pricePreviewData]);

  const getPriceDayValue = (commodityName, variety, dayCol) => {
    const cKey = normalizeKey(commodityName);
    const vKey = normalizeKey(variety);
    const row = priceRowLookup[`${cKey}__${vKey}`] || (!vKey ? priceRowLookup[`${cKey}__`] : null);
    if (!row) return null;
    if (row.daily_values_by_date && dayCol.isoDate in row.daily_values_by_date) {
      return row.daily_values_by_date[dayCol.isoDate];
    }
    if (row.daily_values && String(dayCol.dayNum) in row.daily_values) {
      return row.daily_values[String(dayCol.dayNum)];
    }
    return null;
  };

  // Build Arrival Report rows
  const arrivalRows = useMemo(() => {
    const raw = arrivalPreviewData?.rows || [];
    const sorted = [...raw].sort((a, b) => {
      const cmp = (a.commodity_name || "").localeCompare(b.commodity_name || "");
      if (cmp !== 0) return cmp;
      return (a.variety || "").localeCompare(b.variety || "");
    });
    return sorted.map((r, idx) => {
      const f = r.farm_source_volume_kg != null ? Number(r.farm_source_volume_kg) : null;
      const o = r.other_source_volume_kg != null ? Number(r.other_source_volume_kg) : null;
      const tot =
        r.volume_kg != null
          ? Number(r.volume_kg)
          : f != null || o != null
          ? Number(f || 0) + Number(o || 0)
          : null;
      const farmPct = tot && tot > 0 && f != null ? (f / tot) * 100 : null;
      const otherPct = tot && tot > 0 && o != null ? (o / tot) * 100 : null;
      return {
        no: idx + 1,
        commodityId: r.commodity_id,
        commodityName: r.commodity_name,
        variety: r.variety || null,
        farmSource: f != null && f > 0 ? f : null,
        farmPct,
        otherSources: o != null && o > 0 ? o : null,
        otherPct,
        overallTotal: tot != null && tot > 0 ? tot : null,
        dailyFarm: r.daily_farm_values || {},
        dailyOther: r.daily_other_values || {},
        dailyFarmByDate: r.daily_farm_values_by_date || {},
        dailyOtherByDate: r.daily_other_values_by_date || {},
      };
    });
  }, [arrivalPreviewData]);

  // Descriptive report name & filename
  const descriptiveReportTitle = useMemo(() => {
    const dLabel = dataType === "price" ? "Price Data" : "Arrival Data";
    const pLabel = period === "weekly" ? "Weekly" : "Monthly";
    if (dataType === "price") {
      return `${dLabel} - ${pLabel} - ${market} - ${priceType} (${periodInfo.periodLabel})`;
    }
    return `${dLabel} - ${pLabel} - ${market} (${periodInfo.periodLabel})`;
  }, [dataType, period, market, priceType, periodInfo.periodLabel]);

  const excelFileName = useMemo(() => {
    const mSlug = market.toLowerCase().includes("dftc") ? "DFTC-Taboan" : "Bankerohan";
    const pSlug = period === "weekly" ? `Weekly-${periodInfo.startDate}_to_${periodInfo.endDate}` : `Monthly-${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
    if (dataType === "price") {
      return `(CAgrO-Davao)-${mSlug}-${priceType}-Prices-${pSlug}.xlsx`;
    }
    return `DFTC-VOLUME-${mSlug}-${pSlug}.xlsx`;
  }, [dataType, period, market, priceType, periodInfo.startDate, periodInfo.endDate, selectedYear, selectedMonth]);

  // Record generation in backend (Processing History & Recent Saved Data)
  const recordGeneratedReportInBackend = async () => {
    setIsGenerating(true);
    try {
      const payload = {
        data_type: dataType,
        period,
        market,
        price_type: dataType === "price" ? priceType : null,
        reporting_date: periodInfo.reportingDate,
        start_date: periodInfo.startDate,
        end_date: periodInfo.endDate,
        encoded_by: encodedBy,
        reviewed_by: reviewedBy,
        file_name: descriptiveReportTitle,
      };
      const res = await apiPost("/dftc/reports/generate", payload);
      const saved = await parseResponse(res);
      setGeneratedSubmission(saved);
      setHasGeneratedPreview(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dftc", "submissions"] }),
        queryClient.invalidateQueries({ queryKey: ["dftc-submissions"] }),
      ]);
      if (dataType === "price") {
        await refetchPricePreview();
      } else {
        await refetchArrivalPreview();
      }
      return saved;
    } catch (err) {
      console.error("Failed to record generated report:", err);
      setHasGeneratedPreview(true);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      if (!generatedSubmission) {
        await recordGeneratedReportInBackend();
      }
      let wb;
      if (dataType === "price") {
        wb = await buildPeriodicPriceWorkbook({
          categories: reportCategories,
          getDayValue: getPriceDayValue,
          dayColumns: periodInfo.dayColumns,
          period,
          market,
          priceType,
          periodLabel: periodInfo.periodLabel,
          sheetName: periodInfo.sheetName,
          encodedBy,
          encodedByRole,
          reviewedBy,
          reviewedByRole,
        });
      } else {
        wb = await buildPeriodicArrivalWorkbook({
          rows: arrivalRows,
          dayColumns: periodInfo.dayColumns,
          market,
          periodSubtitle: periodInfo.arrivalSubtitle,
          encodedBy,
          encodedByRole,
          reviewedBy,
          reviewedByRole,
        });
      }
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = excelFileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate Excel file:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const shiftWeek = (deltaDays) => {
    const d = new Date(`${weekAnchorDate}T00:00:00`);
    d.setDate(d.getDate() + deltaDays);
    setWeekAnchorDate(getLocalDateString(d));
    setGeneratedSubmission(null);
  };

  const priceTheme = PRICE_REPORT_THEMES[priceType] || PRICE_REPORT_THEMES.Retail;
  const isDftcMarket = market.toLowerCase().includes("dftc");

  // Totals for Arrival Preview
  const arrivalTotals = useMemo(() => {
    let farm = 0;
    let other = 0;
    let overall = 0;
    for (const r of arrivalRows) {
      if (r.farmSource != null) farm += r.farmSource;
      if (r.otherSources != null) other += r.otherSources;
      if (r.overallTotal != null) overall += r.overallTotal;
    }
    return {
      farm,
      other,
      overall,
      farmPct: overall > 0 ? (farm / overall) * 100 : 0,
      otherPct: overall > 0 ? (other / overall) * 100 : 0,
    };
  }, [arrivalRows]);

  return (
    <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 pb-24 md:pb-12 max-w-[1440px] mx-auto space-y-5">
      {/* Top navigation & Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate("/dftc/input")}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] mb-2 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Submit Data
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--hw-neutral-900)]">
            Generate Periodic Report
          </h1>
          <p className="text-[13px] text-[var(--hw-neutral-600)] mt-0.5">
            Compile daily encoded entries into official Weekly or Monthly Excel reports for Price Monitoring and Arrival Volume.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            type="button"
            disabled={isGenerating}
            onClick={recordGeneratedReportInBackend}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[var(--hw-green-700)] text-white hover:bg-[var(--hw-green-800)] transition-colors shadow-xs cursor-pointer disabled:opacity-60"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{isGenerating ? "Generating..." : "Generate Report"}</span>
          </button>

          <button
            type="button"
            disabled={isDownloading || isLoadingPreview}
            onClick={handleDownloadExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-white border border-[var(--hw-neutral-300)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)] transition-colors shadow-xs cursor-pointer disabled:opacity-60"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[var(--hw-green-700)]" />
            ) : (
              <Download className="w-4 h-4 text-[var(--hw-green-700)]" />
            )}
            <span>{isDownloading ? "Preparing Excel..." : "Download Excel (.xlsx)"}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Banner when recorded in History & Recent Saved Data */}
      {generatedSubmission && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-[13px] text-emerald-900">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Recorded in <strong>Recent Saved Data</strong> and <strong>Submission History</strong> as{" "}
              <span className="font-mono font-semibold">{generatedSubmission.id}</span> ({descriptiveReportTitle}).
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/dftc/submissions/${generatedSubmission.id}`)}
            className="text-[12px] font-semibold text-emerald-800 hover:underline shrink-0 cursor-pointer"
          >
            View in History →
          </button>
        </div>
      )}

      {/* Report Configuration Card */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          {/* Quick Combination Selector */}
          <div className="lg:col-span-5">
            <label
              htmlFor="report-preset-select"
              className="block text-[11.5px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wider mb-1.5"
            >
              Report Combination Preset
            </label>
            <select
              id="report-preset-select"
              value={currentPresetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2 text-[13px] font-medium bg-white border border-[var(--hw-neutral-200)] rounded-xl text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-600)] cursor-pointer"
            >
              {REPORT_COMBINATION_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {/* Data Type */}
          <div className="lg:col-span-2">
            <label className="block text-[11.5px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wider mb-1.5">
              Data Type
            </label>
            <div className="grid grid-cols-2 bg-[var(--hw-neutral-100)] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setDataType("price");
                  setGeneratedSubmission(null);
                }}
                className={`py-1.5 text-[12px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  dataType === "price"
                    ? "bg-white text-[var(--hw-green-800)] shadow-xs"
                    : "text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-900)]"
                }`}
              >
                Price Data
              </button>
              <button
                type="button"
                onClick={() => {
                  setDataType("arrival_volume");
                  setGeneratedSubmission(null);
                }}
                className={`py-1.5 text-[12px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  dataType === "arrival_volume"
                    ? "bg-white text-[var(--hw-green-800)] shadow-xs"
                    : "text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-900)]"
                }`}
              >
                Arrival Data
              </button>
            </div>
          </div>

          {/* Frequency */}
          <div className="lg:col-span-2">
            <label className="block text-[11.5px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wider mb-1.5">
              Frequency
            </label>
            <div className="grid grid-cols-2 bg-[var(--hw-neutral-100)] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setPeriod("weekly");
                  setGeneratedSubmission(null);
                }}
                className={`py-1.5 text-[12px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  period === "weekly"
                    ? "bg-white text-[var(--hw-green-800)] shadow-xs"
                    : "text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-900)]"
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriod("monthly");
                  setGeneratedSubmission(null);
                }}
                className={`py-1.5 text-[12px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  period === "monthly"
                    ? "bg-white text-[var(--hw-green-800)] shadow-xs"
                    : "text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-900)]"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          {/* Market */}
          <div className="lg:col-span-3">
            <label
              htmlFor="report-market-select"
              className="block text-[11.5px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wider mb-1.5"
            >
              Market / Facility
            </label>
            <select
              id="report-market-select"
              value={market}
              onChange={(e) => {
                setMarket(e.target.value);
                setGeneratedSubmission(null);
              }}
              className="w-full px-3 py-2 text-[13px] font-medium bg-white border border-[var(--hw-neutral-200)] rounded-xl text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-600)] cursor-pointer"
            >
              <option value="Bangkerohan Public Market">Bangkerohan Public Market</option>
              <option value="DFTC Taboan">DFTC Taboan</option>
            </select>
          </div>
        </div>

        {/* Second row: Price Type (if Price Data), Period Picker, Signatories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 pt-3 border-t border-[var(--hw-neutral-100)] items-end">
          {dataType === "price" && (
            <div className="lg:col-span-3">
              <label className="block text-[11.5px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wider mb-1.5">
                Price Type
              </label>
              <div className="flex gap-1.5">
                {(market === "DFTC Taboan"
                  ? ["Retail", "Wholesale"]
                  : ["Retail", "Wholesale", "Landing"]
                ).map((pt) => {
                  const active = priceType === pt;
                  const swatch = PRICE_REPORT_THEMES[pt]?.hex || "#BDD7EE";
                  return (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => {
                        setPriceType(pt);
                        setGeneratedSubmission(null);
                      }}
                      className={`flex-1 py-1.5 px-2.5 rounded-xl text-[12px] font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        active
                          ? "border-[var(--hw-neutral-900)] bg-[var(--hw-neutral-900)] text-white shadow-xs"
                          : "border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: swatch }}
                      />
                      <span>{pt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Period Date / Month Selector */}
          <div className={dataType === "price" ? "lg:col-span-5" : "lg:col-span-6"}>
            <label className="block text-[11.5px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wider mb-1.5">
              {period === "weekly"
                ? `Selected Week (${periodInfo.periodLabel})`
                : `Selected Month (${periodInfo.periodLabel})`}
            </label>
            {period === "weekly" ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => shiftWeek(-7)}
                  title="Previous week"
                  className="p-2 border border-[var(--hw-neutral-200)] rounded-xl hover:bg-[var(--hw-neutral-50)] text-[var(--hw-neutral-700)] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="relative flex-1">
                  <Calendar className="w-4 h-4 text-[var(--hw-neutral-400)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    aria-label="Week date"
                    value={weekAnchorDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        setWeekAnchorDate(e.target.value);
                        setGeneratedSubmission(null);
                      }
                    }}
                    className="w-full pl-9 pr-3 py-1.5 text-[13px] font-medium bg-white border border-[var(--hw-neutral-200)] rounded-xl text-[var(--hw-neutral-900)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => shiftWeek(7)}
                  title="Next week"
                  className="p-2 border border-[var(--hw-neutral-200)] rounded-xl hover:bg-[var(--hw-neutral-50)] text-[var(--hw-neutral-700)] cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  aria-label="Report month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(Number(e.target.value));
                    setGeneratedSubmission(null);
                  }}
                  className="flex-1 px-3 py-2 text-[13px] font-medium bg-white border border-[var(--hw-neutral-200)] rounded-xl text-[var(--hw-neutral-900)] cursor-pointer"
                >
                  {FULL_MONTH_NAMES.map((mName, idx) => (
                    <option key={mName} value={idx + 1}>
                      {mName}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Report year"
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(Number(e.target.value));
                    setGeneratedSubmission(null);
                  }}
                  className="w-28 px-3 py-2 text-[13px] font-medium bg-white border border-[var(--hw-neutral-200)] rounded-xl text-[var(--hw-neutral-900)] cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Signatories */}
          <div className={dataType === "price" ? "lg:col-span-2" : "lg:col-span-3"}>
            <label className="block text-[11.5px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wider mb-1.5">
              Encoded By
            </label>
            <input
              type="text"
              value={encodedBy}
              onChange={(e) => setEncodedBy(e.target.value)}
              className="w-full px-3 py-1.5 text-[12.5px] bg-white border border-[var(--hw-neutral-200)] rounded-xl text-[var(--hw-neutral-900)]"
            />
          </div>
          <div className={dataType === "price" ? "lg:col-span-2" : "lg:col-span-3"}>
            <label className="block text-[11.5px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wider mb-1.5">
              Reviewed By
            </label>
            <input
              type="text"
              value={reviewedBy}
              onChange={(e) => setReviewedBy(e.target.value)}
              className="w-full px-3 py-1.5 text-[12.5px] bg-white border border-[var(--hw-neutral-200)] rounded-xl text-[var(--hw-neutral-900)]"
            />
          </div>
        </div>
      </div>

      {/* Excel Workbook Preview Container */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        {/* Excel Top Chrome Bar */}
        <div className="px-4 py-3 bg-[#f8fafc] border-b border-[var(--hw-neutral-200)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[var(--hw-neutral-900)] truncate">
                {excelFileName}
              </p>
              <p className="text-[11.5px] text-[var(--hw-neutral-500)] truncate">
                {descriptiveReportTitle} · Excel Workbook Preview (.xlsx)
              </p>
            </div>
          </div>

          {dataType === "arrival_volume" && (
            <div className="flex items-center gap-1 bg-[var(--hw-neutral-200)]/70 p-1 rounded-xl">
              {["OVERALL TOTAL", "FARM SOURCE", "OTHER SOURCES"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveArrivalSheet(tab)}
                  className={`px-3 py-1 text-[11.5px] font-bold rounded-lg transition-colors cursor-pointer ${
                    activeArrivalSheet === tab
                      ? "bg-white text-[var(--hw-neutral-900)] shadow-xs"
                      : "text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-900)]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Spreadsheet Content Area */}
        {isLoadingPreview ? (
          <div className="p-16 text-center space-y-3">
            <Loader2 className="w-7 h-7 animate-spin mx-auto text-[var(--hw-green-700)]" />
            <p className="text-[13px] text-[var(--hw-neutral-600)]">
              Compiling {period} {dataType === "price" ? "price" : "arrival volume"} records...
            </p>
          </div>
        ) : dataType === "price" ? (
          <div className="overflow-x-auto p-4 sm:p-6 bg-white">
            <div
              style={{
                fontFamily: "Tahoma, Verdana, sans-serif",
                color: "#000000",
                minWidth: period === "monthly" ? "1380px" : "780px",
              }}
            >
              {/* Rows 1–6: Official CAgrO-Davao Top-Left Header */}
              <div className="mb-3 space-y-0.5 text-left">
                <div style={{ fontSize: "11px", fontStyle: "italic" }}>
                  CITY AGRICULTURIST&apos;S OFFICE - Davao City
                </div>
                <div style={{ fontSize: "11px", fontStyle: "italic" }}>
                  Agribusiness Development Services Division (ADSD)
                </div>
                <div className="h-2" />
                <div style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "0.01em" }}>
                  {priceTheme.title}
                </div>
                <div style={{ fontSize: "11px" }}>Period: {periodInfo.periodLabel}</div>
                <div style={{ fontSize: "11px" }}>
                  Market: {isDftcMarket ? "DFTC Taboan, Davao City" : "Bankerohan, Davao City"}
                </div>
              </div>

              {/* Price Matrix Table */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: "Tahoma, Verdana, sans-serif",
                  fontSize: "10px",
                  border: "1px solid #000",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: priceTheme.hex }}>
                    <th
                      style={{
                        border: "1px solid #000",
                        padding: "3px 4px",
                        width: "36px",
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      No.
                    </th>
                    <th
                      style={{
                        border: "1px solid #000",
                        padding: "3px 6px",
                        width: "190px",
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      Commodity
                    </th>
                    <th
                      style={{
                        border: "1px solid #000",
                        padding: "3px 4px",
                        width: "68px",
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      UOM
                    </th>
                    <th
                      colSpan={periodInfo.dayColumns.length}
                      style={{
                        border: "1px solid #000",
                        padding: "3px 4px",
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      DATE
                    </th>
                    <th
                      rowSpan={2}
                      style={{
                        border: "1px solid #000",
                        padding: "3px 6px",
                        width: "110px",
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      {period === "weekly" ? "Weekly Average Price" : "Monthly Average Price"}
                    </th>
                  </tr>
                  <tr style={{ backgroundColor: priceTheme.hex }}>
                    <th
                      colSpan={3}
                      style={{
                        border: "1px solid #000",
                        padding: "3px 6px",
                        textAlign: "left",
                        fontWeight: 700,
                        fontStyle: "italic",
                        textDecoration: "underline",
                      }}
                    >
                      {reportCategories[0]?.name?.toUpperCase() || "LOWLAND VEGETABLES"}
                    </th>
                    {periodInfo.dayColumns.map((dc) => (
                      <th
                        key={dc.isoDate}
                        style={{
                          border: "1px solid #000",
                          padding: "2px 3px",
                          textAlign: "center",
                          fontWeight: 700,
                          minWidth: period === "weekly" ? "58px" : "34px",
                        }}
                      >
                        {dc.dayLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportCategories.map((cat, catIdx) => (
                    <React.Fragment key={cat.name}>
                      {catIdx > 0 && (
                        <tr style={{ backgroundColor: priceTheme.hex }}>
                          <td
                            colSpan={4 + periodInfo.dayColumns.length}
                            style={{
                              border: "1px solid #000",
                              padding: "3px 6px",
                              fontWeight: 700,
                              fontStyle: "italic",
                              textDecoration: "underline",
                            }}
                          >
                            {cat.name.toUpperCase()}
                          </td>
                        </tr>
                      )}
                      {(cat.commodities || []).map((comm) => {
                        const variants = comm.variants?.length
                          ? comm.variants
                          : [{ variety: null, uom: comm.uom }];
                        return variants.map((v, vIdx) => {
                          const isFirst = vIdx === 0;
                          const dayVals = periodInfo.dayColumns.map((dc) => {
                            const val = getPriceDayValue(comm.name, v.variety, dc);
                            return val != null && !Number.isNaN(Number(val))
                              ? Number(val)
                              : null;
                          });
                          const validVals = dayVals.filter((x) => x != null);
                          const avgVal =
                            validVals.length > 0
                              ? validVals.reduce((a, b) => a + b, 0) / validVals.length
                              : null;

                          return (
                            <tr key={`${comm.name}-${v.variety || "base"}-${vIdx}`}>
                              <td
                                style={{
                                  border: "1px solid #000",
                                  padding: "2px 4px",
                                  textAlign: "center",
                                }}
                              >
                                {isFirst ? comm.no : ""}
                              </td>
                              <td
                                style={{
                                  border: "1px solid #000",
                                  padding: "2px 6px",
                                  textAlign: "left",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {isFirst ? (
                                  <>
                                    <span style={{ fontWeight: 700 }}>{comm.name}</span>
                                    {v.variety ? <span> ({v.variety})</span> : null}
                                  </>
                                ) : (
                                  <span style={{ paddingLeft: "10px" }}>({v.variety})</span>
                                )}
                              </td>
                              <td
                                style={{
                                  border: "1px solid #000",
                                  padding: "2px 4px",
                                  textAlign: "center",
                                }}
                              >
                                {v.uom || comm.uom || "kg"}
                              </td>
                              {dayVals.map((val, dIdx) => (
                                <td
                                  key={periodInfo.dayColumns[dIdx].isoDate}
                                  style={{
                                    border: "1px solid #000",
                                    padding: "2px 4px",
                                    textAlign: "right",
                                  }}
                                >
                                  {val != null ? val.toFixed(2) : ""}
                                </td>
                              ))}
                              <td
                                style={{
                                  border: "1px solid #000",
                                  padding: "2px 6px",
                                  textAlign: "right",
                                  fontWeight: 700,
                                }}
                              >
                                {avgVal != null ? avgVal.toFixed(2) : ""}
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              {/* Signatories */}
              <div className="mt-6 grid grid-cols-2 gap-8 max-w-xl text-[11px]">
                <div>
                  <div className="italic text-[10px] mb-3">Prepared by:</div>
                  <div className="font-bold uppercase">{encodedBy}</div>
                  <div className="text-[10px]">{encodedByRole}</div>
                </div>
                <div>
                  <div className="italic text-[10px] mb-3">Noted by:</div>
                  <div className="font-bold uppercase">{reviewedBy}</div>
                  <div className="text-[10px]">{reviewedByRole}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Arrival Volume Multi-Tab Excel Preview */
          <div className="overflow-x-auto p-4 sm:p-6 bg-white">
            <div
              style={{
                fontFamily: "Tahoma, Verdana, sans-serif",
                color: "#000000",
                minWidth:
                  activeArrivalSheet === "OVERALL TOTAL"
                    ? "760px"
                    : period === "monthly"
                    ? "1380px"
                    : "820px",
              }}
            >
              {/* Title & Subtitle */}
              <div className="text-center mb-3">
                <div style={{ fontSize: "14px", fontWeight: 700 }}>
                  {isDftcMarket
                    ? "VOLUME (KG) OF COMMODITIES DROPPED AT DFTC"
                    : "VOLUME (KG) OF COMMODITIES DROPPED AT BANKEROHAN PUBLIC MARKET"}
                </div>
                <div style={{ fontSize: "12px" }}>{periodInfo.arrivalSubtitle}</div>
              </div>

              {activeArrivalSheet === "OVERALL TOTAL" ? (
                <>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontFamily: "Tahoma, Verdana, sans-serif",
                      fontSize: "10px",
                      border: "1px solid #000",
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          rowSpan={2}
                          style={{
                            border: "1px solid #000",
                            padding: "4px",
                            width: "40px",
                            textAlign: "center",
                            fontWeight: 700,
                          }}
                        >
                          No.
                        </th>
                        <th
                          rowSpan={2}
                          style={{
                            border: "1px solid #000",
                            padding: "4px 6px",
                            textAlign: "left",
                            fontWeight: 700,
                          }}
                        >
                          Commodity
                        </th>
                        <th
                          colSpan={2}
                          style={{
                            border: "1px solid #000",
                            padding: "4px",
                            backgroundColor: "#FF99FF",
                            textAlign: "center",
                            fontWeight: 700,
                          }}
                        >
                          FARM SOURCE
                        </th>
                        <th
                          colSpan={2}
                          style={{
                            border: "1px solid #000",
                            padding: "4px",
                            backgroundColor: "#92D050",
                            textAlign: "center",
                            fontWeight: 700,
                          }}
                        >
                          OTHER SOURCES
                        </th>
                        <th
                          rowSpan={2}
                          style={{
                            border: "1px solid #000",
                            padding: "4px",
                            backgroundColor: "#FFFF00",
                            textAlign: "center",
                            fontWeight: 700,
                            width: "120px",
                          }}
                        >
                          OVERALL TOTAL
                        </th>
                      </tr>
                      <tr>
                        <th
                          style={{
                            border: "1px solid #000",
                            padding: "3px 4px",
                            backgroundColor: "#FF99FF",
                            textAlign: "center",
                            fontWeight: 700,
                          }}
                        >
                          Volume (kg)
                        </th>
                        <th
                          style={{
                            border: "1px solid #000",
                            padding: "3px 4px",
                            backgroundColor: "#FF99FF",
                            textAlign: "center",
                            fontWeight: 700,
                          }}
                        >
                          Percentage (%)
                        </th>
                        <th
                          style={{
                            border: "1px solid #000",
                            padding: "3px 4px",
                            backgroundColor: "#92D050",
                            textAlign: "center",
                            fontWeight: 700,
                          }}
                        >
                          Volume (kg)
                        </th>
                        <th
                          style={{
                            border: "1px solid #000",
                            padding: "3px 4px",
                            backgroundColor: "#92D050",
                            textAlign: "center",
                            fontWeight: 700,
                          }}
                        >
                          Percentage (%)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {arrivalRows.map((r) => (
                        <tr key={`${r.commodityId}-${r.no}`}>
                          <td
                            style={{
                              border: "1px solid #000",
                              padding: "2px 4px",
                              textAlign: "center",
                            }}
                          >
                            {r.no}
                          </td>
                          <td
                            style={{
                              border: "1px solid #000",
                              padding: "2px 6px",
                              textAlign: "left",
                            }}
                          >
                            <span style={{ fontWeight: 700 }}>{r.commodityName}</span>
                            {r.variety ? <span> ({r.variety})</span> : null}
                          </td>
                          <td
                            style={{
                              border: "1px solid #000",
                              padding: "2px 6px",
                              textAlign: "right",
                            }}
                          >
                            {r.farmSource != null ? r.farmSource.toFixed(2) : ""}
                          </td>
                          <td
                            style={{
                              border: "1px solid #000",
                              padding: "2px 6px",
                              textAlign: "right",
                            }}
                          >
                            {r.farmPct != null ? `${r.farmPct.toFixed(2)}%` : ""}
                          </td>
                          <td
                            style={{
                              border: "1px solid #000",
                              padding: "2px 6px",
                              textAlign: "right",
                            }}
                          >
                            {r.otherSources != null ? r.otherSources.toFixed(2) : ""}
                          </td>
                          <td
                            style={{
                              border: "1px solid #000",
                              padding: "2px 6px",
                              textAlign: "right",
                            }}
                          >
                            {r.otherPct != null ? `${r.otherPct.toFixed(2)}%` : ""}
                          </td>
                          <td
                            style={{
                              border: "1px solid #000",
                              padding: "2px 6px",
                              textAlign: "right",
                              fontWeight: r.overallTotal != null ? 700 : 400,
                            }}
                          >
                            {r.overallTotal != null ? r.overallTotal.toFixed(2) : ""}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>
                        <td
                          colSpan={2}
                          style={{
                            border: "1px solid #000",
                            padding: "4px 6px",
                            textAlign: "center",
                          }}
                        >
                          TOTAL
                        </td>
                        <td
                          style={{
                            border: "1px solid #000",
                            padding: "4px 6px",
                            textAlign: "right",
                          }}
                        >
                          {arrivalTotals.farm.toFixed(2)}
                        </td>
                        <td
                          style={{
                            border: "1px solid #000",
                            padding: "4px 6px",
                            textAlign: "right",
                          }}
                        >
                          {arrivalTotals.farmPct.toFixed(2)}%
                        </td>
                        <td
                          style={{
                            border: "1px solid #000",
                            padding: "4px 6px",
                            textAlign: "right",
                          }}
                        >
                          {arrivalTotals.other.toFixed(2)}
                        </td>
                        <td
                          style={{
                            border: "1px solid #000",
                            padding: "4px 6px",
                            textAlign: "right",
                          }}
                        >
                          {arrivalTotals.otherPct.toFixed(2)}%
                        </td>
                        <td
                          style={{
                            border: "1px solid #000",
                            padding: "4px 6px",
                            textAlign: "right",
                          }}
                        >
                          {arrivalTotals.overall.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              ) : (
                /* FARM SOURCE or OTHER SOURCES Multi-Day Breakdown Preview */
                (() => {
                  const isFarmTab = activeArrivalSheet === "FARM SOURCE";
                  const tabColor = isFarmTab ? "#FF99FF" : "#92D050";
                  const sourceTitle = isFarmTab ? "FARM SOURCE" : "OTHER SOURCE";
                  const sourceDesc = isFarmTab
                    ? "(Directly sourced from the farms of farmer-vendors and transported through the DFTC hauling truck service.)"
                    : "(Sourced from public markets or external suppliers, not directly from farmer-vendors.)";

                  return (
                    <>
                      <div className="mb-2 text-[10.5px]">
                        <span>Source: </span>
                        <strong>{sourceTitle} </strong>
                        <span className="italic">{sourceDesc}</span>
                      </div>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontFamily: "Tahoma, Verdana, sans-serif",
                          fontSize: "10px",
                          border: "1px solid #000",
                        }}
                      >
                        <thead>
                          <tr style={{ backgroundColor: tabColor }}>
                            <th
                              style={{
                                border: "1px solid #000",
                                padding: "4px",
                                width: "38px",
                                textAlign: "center",
                                fontWeight: 700,
                              }}
                            >
                              No.
                            </th>
                            <th
                              style={{
                                border: "1px solid #000",
                                padding: "4px 6px",
                                width: "190px",
                                textAlign: "center",
                                fontWeight: 700,
                              }}
                            >
                              Commodity
                            </th>
                            {periodInfo.dayColumns.map((dc) => (
                              <th
                                key={dc.isoDate}
                                style={{
                                  border: "1px solid #000",
                                  padding: "3px 4px",
                                  textAlign: "center",
                                  fontWeight: 700,
                                  minWidth: period === "weekly" ? "64px" : "36px",
                                }}
                              >
                                {dc.shortLabel}
                              </th>
                            ))}
                            <th
                              style={{
                                border: "1px solid #000",
                                padding: "4px 6px",
                                width: "110px",
                                textAlign: "center",
                                fontWeight: 700,
                              }}
                            >
                              OVERALL TOTAL
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {arrivalRows.map((r) => {
                            const dayValues = periodInfo.dayColumns.map((dc) => {
                              const rawVal = isFarmTab
                                ? r.dailyFarmByDate?.[dc.isoDate] ?? r.dailyFarm?.[String(dc.dayNum)]
                                : r.dailyOtherByDate?.[dc.isoDate] ?? r.dailyOther?.[String(dc.dayNum)];
                              return rawVal != null && Number(rawVal) > 0 ? Number(rawVal) : null;
                            });
                            const rowTotal = isFarmTab ? r.farmSource : r.otherSources;
                            return (
                              <tr key={`${r.commodityId}-${r.no}`}>
                                <td
                                  style={{
                                    border: "1px solid #000",
                                    padding: "2px 4px",
                                    textAlign: "center",
                                  }}
                                >
                                  {r.no}
                                </td>
                                <td
                                  style={{
                                    border: "1px solid #000",
                                    padding: "2px 6px",
                                    textAlign: "left",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <span style={{ fontWeight: 700 }}>{r.commodityName}</span>
                                  {r.variety ? <span> ({r.variety})</span> : null}
                                </td>
                                {dayValues.map((dv, idx) => (
                                  <td
                                    key={periodInfo.dayColumns[idx].isoDate}
                                    style={{
                                      border: "1px solid #000",
                                      padding: "2px 4px",
                                      textAlign: "right",
                                    }}
                                  >
                                    {dv != null ? dv.toFixed(2) : ""}
                                  </td>
                                ))}
                                <td
                                  style={{
                                    border: "1px solid #000",
                                    padding: "2px 6px",
                                    textAlign: "right",
                                    fontWeight: rowTotal != null ? 700 : 400,
                                  }}
                                >
                                  {rowTotal != null ? rowTotal.toFixed(2) : ""}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  );
                })()
              )}
            </div>
          </div>
        )}

        {/* Excel Bottom Sheet Tab Bar */}
        <div className="px-4 py-2 bg-[#f1f5f9] border-t border-[var(--hw-neutral-200)] flex items-center justify-between text-[11.5px]">
          <div className="flex items-center gap-1">
            {dataType === "price" ? (
              <div className="px-3 py-1 bg-white border border-b-2 border-b-[var(--hw-green-700)] border-[var(--hw-neutral-300)] rounded-t font-bold text-[var(--hw-green-800)] shadow-2xs">
                {periodInfo.sheetName}
              </div>
            ) : (
              ["OVERALL TOTAL", "FARM SOURCE", "OTHER SOURCES"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveArrivalSheet(tab)}
                  className={`px-3 py-1 rounded-t font-bold transition-colors cursor-pointer ${
                    activeArrivalSheet === tab
                      ? "bg-white border border-b-2 border-b-[var(--hw-green-700)] border-[var(--hw-neutral-300)] text-[var(--hw-green-800)] shadow-2xs"
                      : "text-[var(--hw-neutral-600)] hover:bg-white/60"
                  }`}
                >
                  {tab}
                </button>
              ))
            )}
          </div>
          <span className="text-[var(--hw-neutral-500)] font-medium">
            {hasGeneratedPreview ? "Ready for Excel Download (.xlsx)" : "Live Preview"}
          </span>
        </div>
      </div>
    </div>
  );
}

