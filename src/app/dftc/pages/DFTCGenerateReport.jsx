import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { PageHeader } from "../../global/components/shared/PageHeader";
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

const STEP_CONFIG = [
  { active: "Select Report", done: "Selected" },
  { active: "File Preview", done: "Previewed" },
  { active: "Download & Record", done: "Recorded" },
];

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

  // Step state modeled after DFTCUpload: "configure" (0) -> "preview" (1) -> "completed" (3)
  const [step, setStep] = useState(() => (prefill ? "preview" : "configure"));
  const [currentStep, setCurrentStep] = useState(() => (prefill ? 1 : 0));

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

  // Weekly anchor date
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

  // Signatories
  const [encodedBy, setEncodedBy] = useState(
    () => prefill?.encoded_by || prefill?.encodedBy || DEFAULT_PERSONNEL.encodedBy
  );
  const [encodedByRole, setEncodedByRole] = useState(DEFAULT_PERSONNEL.encodedByRole);
  const [reviewedBy, setReviewedBy] = useState(
    () => prefill?.submitted_by_name || prefill?.savedBy || DEFAULT_PERSONNEL.reviewedBy
  );
  const [reviewedByRole, setReviewedByRole] = useState(DEFAULT_PERSONNEL.reviewedByRole);

  const [activeArrivalSheet, setActiveArrivalSheet] = useState("OVERALL TOTAL");
  const [isDownloading, setIsDownloading] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

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
    setErrorMessage("");
  };

  // Query live preview data from backend when on preview step (or pre-fetching)
  const { data: pricePreviewData, isLoading: loadingPricePreview } = useQuery({
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
    enabled: dataType === "price" && step !== "configure",
    staleTime: 0,
  });

  const { data: arrivalPreviewData, isLoading: loadingArrivalPreview } = useQuery({
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
    enabled: dataType === "arrival_volume" && step !== "configure",
    staleTime: 0,
  });

  // Lookup map for price rows by normalized commodity + variety
  const priceLookup = useMemo(() => {
    const map = new Map();
    const rows = pricePreviewData?.rows || [];
    for (const r of rows) {
      const cKey = normalizeKey(r.commodity_name);
      const vKey = normalizeKey(r.variety);
      map.set(`${cKey}__${vKey}`, r);
      if (!map.has(`${cKey}__`)) {
        map.set(`${cKey}__`, r);
      }
    }
    return map;
  }, [pricePreviewData]);

  // Categories including any dynamic commodities returned from backend
  const reportCategories = useMemo(() => {
    const cloned = ALL_CATEGORIES.map((cat) => ({
      ...cat,
      commodities: (cat.commodities || []).map((c) => ({
        ...c,
        variants: (c.variants || []).map((v) => ({ ...v })),
      })),
    }));

    const knownKeys = new Set();
    for (const cat of cloned) {
      for (const comm of cat.commodities) {
        const cKey = normalizeKey(comm.name);
        knownKeys.add(`${cKey}__`);
        for (const v of comm.variants || []) {
          knownKeys.add(`${cKey}__${normalizeKey(v.variety)}`);
        }
      }
    }

    for (const r of pricePreviewData?.rows || []) {
      const cKey = normalizeKey(r.commodity_name);
      const vKey = normalizeKey(r.variety);
      const fullKey = `${cKey}__${vKey}`;
      if (knownKeys.has(fullKey)) continue;

      const hasAnyValue =
        r.daily_values_by_date && Object.keys(r.daily_values_by_date).length > 0;
      if (!hasAnyValue) continue;

      const targetCatName = (r.category || "LOWLAND VEGETABLES").toUpperCase();
      const targetCat =
        cloned.find((c) => c.name.toUpperCase() === targetCatName) ||
        cloned[cloned.length - 1];
      if (!targetCat) continue;

      const existingComm = targetCat.commodities.find(
        (c) => normalizeKey(c.name) === cKey
      );
      if (existingComm) {
        existingComm.variants.push({
          variety: r.variety || null,
          uom: r.unit || existingComm.uom || "kg",
        });
      } else {
        targetCat.commodities.push({
          no: targetCat.commodities.length + 1,
          name: r.commodity_name,
          uom: r.unit || "kg",
          variants: [{ variety: r.variety || null, uom: r.unit || "kg" }],
        });
      }
      knownKeys.add(fullKey);
    }

    return cloned;
  }, [pricePreviewData]);

  const getPriceDayValue = (commName, variety, dayCol) => {
    const cKey = normalizeKey(commName);
    const vKey = normalizeKey(variety);
    const row = priceLookup.get(`${cKey}__${vKey}`) || (vKey ? null : priceLookup.get(`${cKey}__`));
    if (!row) return null;
    if (row.daily_values_by_date && row.daily_values_by_date[dayCol.isoDate] != null) {
      return row.daily_values_by_date[dayCol.isoDate];
    }
    if (row.daily_values && row.daily_values[dayCol.dayNum] != null) {
      return row.daily_values[dayCol.dayNum];
    }
    return null;
  };

  // Arrival rows formatted for preview and Excel export
  const arrivalRows = useMemo(() => {
    const rawRows = arrivalPreviewData?.rows || [];
    return rawRows.map((r, idx) => {
      const farm = r.farm_source != null ? Number(r.farm_source) : null;
      const other = r.other_sources != null ? Number(r.other_sources) : null;
      const total =
        r.overall_total != null
          ? Number(r.overall_total)
          : farm != null || other != null
          ? (farm || 0) + (other || 0)
          : null;
      const farmPct =
        r.farm_percentage != null
          ? Number(r.farm_percentage)
          : total && total > 0 && farm != null
          ? (farm / total) * 100
          : null;
      const otherPct =
        r.other_percentage != null
          ? Number(r.other_percentage)
          : total && total > 0 && other != null
          ? (other / total) * 100
          : null;
      return {
        no: r.no || idx + 1,
        commodityId: r.commodity_id,
        commodityName: r.commodity_name,
        variety: r.variety,
        farmSource: farm,
        farmPct,
        otherSources: other,
        otherPct,
        overallTotal: total,
        dailyFarmByDate: r.daily_farm_values_by_date || {},
        dailyOtherByDate: r.daily_other_values_by_date || {},
        dailyTotalByDate: r.daily_values_by_date || {},
      };
    });
  }, [arrivalPreviewData]);

  const arrivalTotals = useMemo(() => {
    let farm = 0;
    let other = 0;
    let overall = 0;
    for (const r of arrivalRows) {
      if (r.farmSource != null) farm += Number(r.farmSource);
      if (r.otherSources != null) other += Number(r.otherSources);
      if (r.overallTotal != null) overall += Number(r.overallTotal);
    }
    const farmPct = overall > 0 ? (farm / overall) * 100 : 0;
    const otherPct = overall > 0 ? (other / overall) * 100 : 0;
    return { farm, other, overall, farmPct, otherPct };
  }, [arrivalRows]);

  const isDftcMarket = market.toLowerCase().includes("dftc");
  const marketSlug = isDftcMarket ? "DFTC-Taboan" : "Bankerohan";
  const freqLabel = period === "weekly" ? "Weekly" : "Monthly";
  const periodSlug =
    period === "weekly"
      ? `${periodInfo.startDate}_to_${periodInfo.endDate}`
      : `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const excelFileName =
    dataType === "arrival_volume"
      ? `DFTC-VOLUME-${marketSlug}-${freqLabel}-${periodSlug}.xlsx`
      : `(CAgrO-Davao)-${marketSlug}-${freqLabel}-${priceType}-Prices-${periodSlug}.xlsx`;

  const combinationLabel =
    dataType === "arrival_volume"
      ? `Arrival Data - ${freqLabel} - ${market}`
      : `Price Data - ${freqLabel} - ${market} - ${priceType}`;

  const descriptiveReportTitle = `${combinationLabel} (${periodInfo.periodLabel})`;

  // Count how many commodity rows have data in the selected period
  const activeRecordCount = useMemo(() => {
    if (dataType === "arrival_volume") {
      return arrivalRows.filter((r) => r.overallTotal != null && r.overallTotal > 0).length;
    }
    let count = 0;
    for (const r of pricePreviewData?.rows || []) {
      if (r.daily_values_by_date && Object.keys(r.daily_values_by_date).length > 0) {
        count++;
      }
    }
    return count;
  }, [dataType, arrivalRows, pricePreviewData]);

  const handleProceedToPreview = () => {
    setErrorMessage("");
    setStep("preview");
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const triggerWorkbookDownload = async () => {
    let wb;
    if (dataType === "price") {
      wb = await buildPeriodicPriceWorkbook({
        marketName: market,
        priceType,
        period,
        periodLabel: periodInfo.periodLabel,
        sheetName: periodInfo.sheetName,
        dayColumns: periodInfo.dayColumns,
        categories: reportCategories,
        getDayValue: getPriceDayValue,
        encodedBy,
        encodedByRole,
        reviewedBy,
        reviewedByRole,
      });
    } else {
      wb = await buildPeriodicArrivalWorkbook({
        marketName: market,
        period,
        periodSubtitle: periodInfo.arrivalSubtitle,
        dayColumns: periodInfo.dayColumns,
        rows: arrivalRows,
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
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download Excel AND record the generated report in backend history + Recent Saved Data
  const handleDownloadAndRecord = async () => {
    setIsDownloading(true);
    setErrorMessage("");
    try {
      // 1. Record in backend database if not already recorded for this session
      let recorded = completedSummary;
      if (!recorded) {
        const res = await apiPost("/dftc/reports/generate", {
          data_type: dataType,
          period,
          reporting_date: periodInfo.reportingDate,
          source_id: market,
          price_type: dataType === "price" ? priceType : null,
          file_name: excelFileName,
          encoded_by: encodedBy,
          reviewed_by: reviewedBy,
        });
        const data = await parseResponse(res);
        recorded = {
          submissionId: data?.submission_id || data?.id || "—",
          reportId: data?.report_id || "—",
          fileName: excelFileName,
          combination: combinationLabel,
          datasetType:
            dataType === "arrival_volume"
              ? `${freqLabel} Arrival Volume Report`
              : `${freqLabel} ${priceType} Price Report`,
          market,
          priceType: dataType === "price" ? priceType : "—",
          period: periodInfo.periodLabel,
          recordsCount: data?.record_count ?? activeRecordCount,
          encodedBy,
          reviewedBy,
          finishedAt: new Date().toLocaleString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setCompletedSummary(recorded);
        queryClient.invalidateQueries({ queryKey: ["dftc", "submissions"] });
        queryClient.invalidateQueries({ queryKey: ["dftc-submissions"] });
      }

      // 2. Build and download the .xlsx file
      await triggerWorkbookDownload();

      // 3. Advance to Step 3 (Completed & Recorded summary view)
      setStep("completed");
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Failed to generate and download Excel report:", err);
      setErrorMessage(err?.message || "Failed to generate report. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    setCompletedSummary(null);
    setErrorMessage("");
    setStep("configure");
    setCurrentStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const shiftWeek = (deltaDays) => {
    const d = new Date(`${weekAnchorDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return;
    d.setDate(d.getDate() + deltaDays);
    setWeekAnchorDate(getLocalDateString(d));
    setCompletedSummary(null);
  };

  const isLoadingPreview =
    dataType === "price" ? loadingPricePreview : loadingArrivalPreview;
  const priceTheme = PRICE_REPORT_THEMES[priceType] || PRICE_REPORT_THEMES.Retail;

  const inputCls =
    "w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] bg-white text-[var(--hw-neutral-900)] outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition";

  return (
    <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-3 sm:space-y-5">
      {/* Navigation & Header (matching DFTCUpload) */}
      <div>
        <button
          type="button"
          onClick={() => {
            if (step === "configure") navigate("/dftc/input");
            else if (step === "preview") {
              setStep("configure");
              setCurrentStep(0);
            } else {
              navigate("/dftc/input");
            }
          }}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--hw-neutral-800)] hover:text-[var(--hw-green-700)] transition-colors cursor-pointer mb-2"
        >
          <ChevronLeft className="w-4 h-4" />
          {step === "configure" ? "Back to Submit Data" : "Back"}
        </button>
        <PageHeader
          title="Generate Periodic Report"
          description="Select a Weekly or Monthly report combination, preview the compiled Excel workbook, and download."
        />
      </div>

      {/* Step-by-step progress bar (matching DFTCUpload) */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-3 sm:px-4 py-3 sm:py-3.5">
        <div className="flex items-center justify-between">
          {STEP_CONFIG.map((stepCfg, i) => {
            const isDone = i < currentStep;
            const stepLabel = isDone ? stepCfg.done : stepCfg.active;
            return (
              <React.Fragment key={stepCfg.active}>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-bold border-2 transition-colors ${
                      isDone
                        ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white"
                        : i === currentStep
                        ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)] bg-white"
                        : "border-[var(--hw-neutral-300)] text-[var(--hw-neutral-400)] bg-white"
                    }`}
                  >
                    {isDone ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : i + 1}
                  </div>
                  <span
                    className={`text-[9.5px] sm:text-[10.5px] font-medium ${
                      i <= currentStep ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-400)]"
                    }`}
                  >
                    {stepLabel}
                  </span>
                </div>
                {i < STEP_CONFIG.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 sm:mx-2 min-w-2 sm:min-w-3 transition-colors ${
                      isDone ? "bg-[var(--hw-green-700)]" : "bg-[var(--hw-neutral-200)]"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          STEP 1: SELECT REPORT CONFIGURATION
      ────────────────────────────────────────────────────────────────────── */}
      {step === "configure" && (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">
              Report information
            </h2>
            <p className="text-[12.5px] text-[var(--hw-neutral-600)] mt-0.5">
              Select the report type and reporting period to compile from daily encoded records.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-[var(--hw-neutral-100)]">
            {/* Report Combination Dropdown */}
            <div className="sm:col-span-2">
              <label
                htmlFor="report-preset-select"
                className="block text-[13px] font-medium text-[var(--hw-neutral-700)] mb-1.5"
              >
                Report type *
              </label>
              <select
                id="report-preset-select"
                value={currentPresetId}
                onChange={(e) => handlePresetChange(e.target.value)}
                className={`${inputCls} font-medium cursor-pointer`}
              >
                <optgroup label="Price Data — Weekly">
                  {REPORT_COMBINATION_PRESETS.filter(
                    (p) => p.dataType === "price" && p.period === "weekly"
                  ).map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Price Data — Monthly">
                  {REPORT_COMBINATION_PRESETS.filter(
                    (p) => p.dataType === "price" && p.period === "monthly"
                  ).map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Arrival Data — Weekly">
                  {REPORT_COMBINATION_PRESETS.filter(
                    (p) => p.dataType === "arrival_volume" && p.period === "weekly"
                  ).map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Arrival Data — Monthly">
                  {REPORT_COMBINATION_PRESETS.filter(
                    (p) => p.dataType === "arrival_volume" && p.period === "monthly"
                  ).map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Reporting Period Selector */}
            <div className="sm:col-span-2">
              <label className="block text-[13px] font-medium text-[var(--hw-neutral-700)] mb-1.5">
                {period === "weekly"
                  ? `Reporting week (${periodInfo.periodLabel}) *`
                  : `Reporting month (${periodInfo.periodLabel}) *`}
              </label>
              {period === "weekly" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => shiftWeek(-7)}
                    title="Previous week"
                    className="p-2.5 border border-[var(--hw-neutral-200)] rounded-xl hover:bg-[var(--hw-neutral-50)] text-[var(--hw-neutral-700)] cursor-pointer"
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
                          setCompletedSummary(null);
                        }
                      }}
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => shiftWeek(7)}
                    title="Next week"
                    className="p-2.5 border border-[var(--hw-neutral-200)] rounded-xl hover:bg-[var(--hw-neutral-50)] text-[var(--hw-neutral-700)] cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <select
                    aria-label="Report month"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(Number(e.target.value));
                      setCompletedSummary(null);
                    }}
                    className={`${inputCls} cursor-pointer`}
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
                      setCompletedSummary(null);
                    }}
                    className={`${inputCls} cursor-pointer`}
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
            <div>
              <label className="block text-[13px] font-medium text-[var(--hw-neutral-700)] mb-1.5">
                Prepared / Encoded By
              </label>
              <input
                type="text"
                value={encodedBy}
                onChange={(e) => setEncodedBy(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--hw-neutral-700)] mb-1.5">
                Noted / Reviewed By
              </label>
              <input
                type="text"
                value={reviewedBy}
                onChange={(e) => setReviewedBy(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Selected Output File Summary Banner */}
          <div className="flex items-center gap-3 p-3.5 bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl">
            <FileSpreadsheet className="w-5 h-5 text-[var(--hw-green-700)] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[var(--hw-neutral-900)] truncate">
                {excelFileName}
              </p>
              <p className="text-[12px] text-[var(--hw-neutral-600)] truncate">
                {combinationLabel} · {periodInfo.periodLabel} · Excel Workbook (.xlsx)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleProceedToPreview}
            className="w-full py-2.5 bg-[var(--hw-green-700)] text-white text-[15px] font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            Generate File Preview
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          STEP 2: EXCEL FILE PREVIEW & DOWNLOAD
      ────────────────────────────────────────────────────────────────────── */}
      {step === "preview" && (
        <div className="space-y-4">
          {/* Selected Report Bar (matching DFTCUpload's file summary bar) */}
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-[var(--hw-neutral-900)] truncate">
                  {excelFileName}
                </p>
                <p className="text-[12px] text-[var(--hw-neutral-600)] truncate">
                  {descriptiveReportTitle} · Prepared by {encodedBy}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setStep("configure");
                  setCurrentStep(0);
                }}
                className="px-3.5 py-2 border border-[var(--hw-neutral-200)] rounded-xl text-[12.5px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
              >
                Change Selection
              </button>
              <button
                type="button"
                onClick={handleDownloadAndRecord}
                disabled={isDownloading || isLoadingPreview}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--hw-green-700)] hover:bg-[var(--hw-green-800)] text-white text-[12.5px] font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Download Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Excel Workbook Preview Card */}
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
            <div className="px-4 py-3 bg-[#f8fafc] border-b border-[var(--hw-neutral-200)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
                {dataType === "arrival_volume"
                  ? `Excel preview — sheet "${activeArrivalSheet}"`
                  : `Excel preview — sheet "${periodInfo.sheetName}"`}
              </p>

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

            {/* Spreadsheet Preview Body */}
            {isLoadingPreview ? (
              <div className="p-16 text-center space-y-3">
                <Loader2 className="w-7 h-7 animate-spin mx-auto text-[var(--hw-green-700)]" />
                <p className="text-[13px] text-[var(--hw-neutral-600)]">
                  Compiling {period} {dataType === "price" ? "price" : "arrival volume"} records...
                </p>
              </div>
            ) : dataType === "price" ? (
              <div className="overflow-x-auto max-h-[580px] p-4 sm:p-6 bg-white">
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
              <div className="overflow-x-auto max-h-[580px] p-4 sm:p-6 bg-white">
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
                  ) : (
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
                                const dayMap = isFarmTab ? r.dailyFarmByDate : r.dailyOtherByDate;
                                const dayVals = periodInfo.dayColumns.map((dc) => {
                                  const v = dayMap?.[dc.isoDate];
                                  return v != null && !Number.isNaN(Number(v)) ? Number(v) : null;
                                });
                                const rowSum = dayVals.reduce((acc, v) => acc + (v || 0), 0);
                                const fallbackSum = isFarmTab ? r.farmSource : r.otherSources;
                                const displaySum =
                                  rowSum > 0
                                    ? rowSum
                                    : fallbackSum != null && fallbackSum > 0
                                    ? fallbackSum
                                    : null;

                                return (
                                  <tr key={`${r.commodityId}-${r.no}-${activeArrivalSheet}`}>
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
                                    {dayVals.map((v, dIdx) => (
                                      <td
                                        key={periodInfo.dayColumns[dIdx].isoDate}
                                        style={{
                                          border: "1px solid #000",
                                          padding: "2px 4px",
                                          textAlign: "right",
                                        }}
                                      >
                                        {v != null && v > 0 ? v.toFixed(2) : ""}
                                      </td>
                                    ))}
                                    <td
                                      style={{
                                        border: "1px solid #000",
                                        padding: "2px 6px",
                                        textAlign: "right",
                                        fontWeight: displaySum != null ? 700 : 400,
                                      }}
                                    >
                                      {displaySum != null ? displaySum.toFixed(2) : ""}
                                    </td>
                                  </tr>
                                );
                              })}
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
                                {periodInfo.dayColumns.map((dc) => {
                                  const colTotal = arrivalRows.reduce((acc, r) => {
                                    const map = isFarmTab ? r.dailyFarmByDate : r.dailyOtherByDate;
                                    const v = map?.[dc.isoDate];
                                    return acc + (v != null && !Number.isNaN(Number(v)) ? Number(v) : 0);
                                  }, 0);
                                  return (
                                    <td
                                      key={dc.isoDate}
                                      style={{
                                        border: "1px solid #000",
                                        padding: "4px",
                                        textAlign: "right",
                                      }}
                                    >
                                      {colTotal > 0 ? colTotal.toFixed(2) : ""}
                                    </td>
                                  );
                                })}
                                <td
                                  style={{
                                    border: "1px solid #000",
                                    padding: "4px 6px",
                                    textAlign: "right",
                                  }}
                                >
                                  {(isFarmTab ? arrivalTotals.farm : arrivalTotals.other).toFixed(2)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </>
                      );
                    })()
                  )}
                </div>
              </div>
            )}

            {/* Bottom Action Bar inside Preview Card (matching DFTCUpload) */}
            <div className="p-4 bg-[#f8fafc] border-t border-[var(--hw-neutral-200)] flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleDownloadAndRecord}
                disabled={isDownloading || isLoadingPreview}
                className="w-full sm:flex-1 py-2.5 px-4 bg-[var(--hw-green-700)] text-white text-[14px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating & Downloading Excel…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download Excel File (.xlsx)
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("configure");
                  setCurrentStep(0);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-[var(--hw-neutral-200)] bg-white text-[13px] font-medium text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Change Report Options
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          STEP 3: COMPLETED & RECORDED SUMMARY VIEW (matching DFTCUpload Step 4)
      ────────────────────────────────────────────────────────────────────── */}
      {step === "completed" && (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-start gap-3 sm:gap-3.5 pb-4 sm:pb-5 border-b border-[var(--hw-neutral-100)]">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] sm:text-[17px] font-bold text-[var(--hw-neutral-900)]">
                Report Generated & Recorded
              </h2>
              <p className="text-[12.5px] sm:text-[13px] text-[var(--hw-neutral-600)] mt-0.5">
                The official Excel workbook has been downloaded and recorded in Recent Saved Data and Submission History.
              </p>
            </div>
          </div>

          {/* Summary of the Generated Report (matching DFTCUpload Upload Summary) */}
          <div className="rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]/50 overflow-hidden">
            <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-100)]/60 flex items-center justify-between">
              <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">
                Generated Report Summary
              </p>
              <span className="inline-flex items-center gap-1.5 text-[11.5px] sm:text-[12px] font-semibold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Recorded
              </span>
            </div>

            <div className="p-3.5 sm:p-5 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 md:gap-5">
              <div className="col-span-1">
                <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">Submission ID</p>
                <p className="text-[12.5px] sm:text-[13px] font-semibold text-emerald-800 font-mono mt-0.5 break-all">
                  {completedSummary?.submissionId || "—"}
                </p>
              </div>
              <div className="col-span-1">
                <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">Report ID</p>
                <p className="text-[12.5px] sm:text-[13px] font-semibold text-[var(--hw-neutral-900)] font-mono mt-0.5 break-all">
                  {completedSummary?.reportId || "—"}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-2 lg:col-span-1">
                <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">Excel File Name</p>
                <p
                  className="text-[12.5px] sm:text-[13px] font-semibold text-[var(--hw-neutral-900)] mt-0.5 break-all leading-snug"
                  title={completedSummary?.fileName || excelFileName}
                >
                  {completedSummary?.fileName || excelFileName}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1 lg:col-span-1">
                <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">Report Combination</p>
                <p className="text-[12.5px] sm:text-[13px] font-semibold text-[var(--hw-neutral-900)] mt-0.5 leading-snug">
                  {completedSummary?.combination || combinationLabel}
                </p>
              </div>
              <div className="col-span-1">
                <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">Market / Facility</p>
                <p className="text-[12.5px] sm:text-[13px] font-semibold text-[var(--hw-neutral-900)] mt-0.5">
                  {completedSummary?.market || market}
                </p>
              </div>
              <div className="col-span-1">
                <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">Reporting Period</p>
                <p className="text-[12.5px] sm:text-[13px] font-semibold text-[var(--hw-neutral-900)] mt-0.5">
                  {completedSummary?.period || periodInfo.periodLabel}
                </p>
              </div>
              <div className="col-span-1">
                <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">Prepared / Encoded By</p>
                <p className="text-[12.5px] sm:text-[13px] font-semibold text-[var(--hw-neutral-900)] mt-0.5">
                  {completedSummary?.encodedBy || encodedBy}
                </p>
              </div>
              <div className="col-span-1">
                <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">Noted / Reviewed By</p>
                <p className="text-[12.5px] sm:text-[13px] font-semibold text-[var(--hw-neutral-900)] mt-0.5">
                  {completedSummary?.reviewedBy || reviewedBy}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">Generated Time</p>
                <p className="text-[12.5px] sm:text-[13px] font-semibold text-[var(--hw-neutral-900)] mt-0.5 leading-snug">
                  {completedSummary?.finishedAt || "Just now"}
                </p>
              </div>
            </div>
          </div>

          {/* Actions: Download Again, View Submission History, Generate Another Report */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={triggerWorkbookDownload}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--hw-green-700)] text-white text-[13px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Excel (.xlsx)
            </button>

            <button
              type="button"
              onClick={() => navigate("/dftc/submissions")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-[var(--hw-neutral-200)] text-[13px] font-semibold text-[var(--hw-neutral-800)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              View Submission History
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Generate another report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
