import { PageHeader } from "../../global/components/shared/PageHeader";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PenLine,
  Upload,
  FileText,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Search,
  Filter
} from "lucide-react";
import {
  PRICE_CATEGORIES
} from "./dftc-add-data-data";
import { CommodityIllustration, COMMODITY_REGISTRY } from "../../global/components/shared/CommodityIllustrations";
import { HW_NAME_TO_ID as _HW_NAME_TO_ID } from "../../global/data/commodities";
import { apiGet, parseResponse } from "../../global/api";

const ITEMS_PER_PAGE = 20;

function hwId(name) {
  return _HW_NAME_TO_ID[name] ?? null;
}

function hasHWIcon(name) {
  const id = hwId(name);
  return id !== null && id in COMMODITY_REGISTRY;
}

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

function getCurrentDateLabel() {
  return new Date().toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
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

function SetupModal({ onClose, onContinue }) {
  const todayStr = getLocalDateString();
  const [dataType, setDataType] = useState("Price Data");
  const [market, setMarket] = useState("Bangkerohan Public Market");
  const [priceType, setPriceType] = useState("Retail");
  const [dateLabel] = useState(getCurrentDateLabel());
  const [changingDate, setChangingDate] = useState(false);
  const [customDate, setCustomDate] = useState(todayStr);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const priceMarkets = ["Bangkerohan Public Market", "DFTC Taboan"];
  const priceTypes = ["Retail", "Wholesale", "Landing"];

  function handleContinue() {
    const date = changingDate ? customDate : todayStr;
    onContinue({ dataType, market, priceType, date });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--hw-neutral-100)]">
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Start Data Entry</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)]">
            <X className="w-4 h-4 text-[var(--hw-neutral-600)]" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-2">Data Type</label>
            <div className="grid grid-cols-2 gap-2">
              {["Price Data", "Arrival Volume"].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setDataType(t);
                    setMarket(t === "Arrival Volume" ? "DFTC Taboan" : "Bangkerohan Public Market");
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-[13px] font-medium transition-colors ${
                    dataType === t
                      ? "border-[var(--hw-green-700)] bg-[var(--hw-green-50)] text-[var(--hw-green-800)]"
                      : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">
              {dataType === "Arrival Volume" ? "Facility" : "Market"}
            </label>
            {dataType === "Arrival Volume" ? (
              <div className="px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] text-[13px] text-[var(--hw-neutral-800)]">
                DFTC Taboan
              </div>
            ) : (
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
              >
                {priceMarkets.map((m) => <option key={m}>{m}</option>)}
              </select>
            )}
          </div>

          {dataType === "Price Data" && (
            <div>
              <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Price Type</label>
              <div className="flex gap-2">
                {priceTypes.map((pt) => (
                  <button
                    key={pt}
                    onClick={() => setPriceType(pt)}
                    className={`flex-1 py-2 rounded-xl border text-[13px] font-medium transition-colors ${
                      priceType === pt
                        ? "border-[var(--hw-green-700)] bg-[var(--hw-green-50)] text-[var(--hw-green-800)]"
                        : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"
                    }`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Date and Time</label>
            {changingDate ? (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
                />
                <button
                  onClick={() => {
                    setCustomDate(todayStr);
                    setChangingDate(false);
                  }}
                  className="text-[12px] text-[var(--hw-green-700)] underline whitespace-nowrap"
                >
                  Use today
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]">
                <span className="text-[13px] text-[var(--hw-neutral-900)]">{dateLabel}</span>
                <button
                  onClick={() => setChangingDate(true)}
                  className="text-[12px] text-[var(--hw-green-700)] underline ml-3 shrink-0"
                >
                  Change Date
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors"
          >
            Continue to Data Entry
          </button>
        </div>
      </div>
    </div>
  );
}

function HowHarvestWiseModal({ onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--hw-neutral-100)]">
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">How HarvestWise Uses DFTC Data</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)]">
            <X className="w-4 h-4 text-[var(--hw-neutral-600)]" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[13px] text-[var(--hw-neutral-800)] leading-relaxed">
            HarvestWise currently provides analytics, price forecasting, and farmer-facing decision support for its 10 supported commodities: <strong>Kamatis, Talong, Repolyo, Atsal, Carrots, Pipino, Ampalaya, Kalabasa, Lettuce, and Chinese Pechay.</strong>
          </p>
          <p className="text-[13px] text-[var(--hw-neutral-800)] leading-relaxed">
            All other market commodities are securely retained for DFTC reporting and downloads. Their records remain available and are not subject to deletion.
          </p>
          <p className="text-[13px] text-[var(--hw-neutral-800)] leading-relaxed">
            Analytics coverage continues to expand over time as more commodities are added to HarvestWise.
          </p>
        </div>
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DFTCInput() {
  const navigate = useNavigate();
  const location = useLocation();
  const todayStr = getLocalDateString();

  const [successMessage, setSuccessMessage] = useState(() => {
    const state = location.state;
    return state?.successMsg ?? "";
  });
  const [setupOpen, setSetupOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [commodityTab, setCommodityTab] = useState(() => {
    const s = location.state;
    return s?.restoreTab ?? "hw";
  });
  const [showAllSaved, setShowAllSaved] = useState(false);

  // Search, Filter, and Pagination for Commodity Records
  const [searchQuery, setSearchQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState("all");
  const [dataTypeFilter, setDataTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch real submissions
  const { data: submissionsData, isLoading: loadingSubmissions } = useQuery({
    queryKey: ["dftc", "submissions"],
    queryFn: async () => {
      const res = await apiGet("/dftc/submissions?page=1&page_size=50");
      return parseResponse(res);
    }
  });

  // Fetch live commodities from backend API
  const { data: commoditiesData, isLoading: loadingCommodities } = useQuery({
    queryKey: ["prices", "commodities", commodityTab],
    queryFn: async () => {
      const isTop10 = commodityTab === "hw";
      const res = await apiGet(`/prices?page=1&page_size=100&is_top10=${isTop10}`);
      return parseResponse(res);
    }
  });

  const rawSubmissions = submissionsData?.items || [];

  // Format submissions per mapping document lines 42-50
  const savedDataList = rawSubmissions.map((sub) => {
    const market = formatMarketName(sub.source_id);
    const isArrival = sub.data_type === "arrival_volume" || sub.data_type === "arrival";
    const priceTypeCapitalized = sub.price_type
      ? sub.price_type.charAt(0).toUpperCase() + sub.price_type.slice(1).toLowerCase()
      : "";

    const dataName = isArrival
      ? `${market} Arrival Volume — ${sub.reporting_date || formatSavedDate(sub.saved_at)}`
      : `${market} ${priceTypeCapitalized} Prices — ${sub.reporting_date || formatSavedDate(sub.saved_at)}`;

    const dataType = isArrival ? "DFTC Arrival Volume" : `Daily ${priceTypeCapitalized} Prices`;
    const entryMethod = sub.submission_method || (sub.file_name ? "File Upload" : "Manual Input");
    const savedDate = formatSavedDate(sub.saved_at);
    const isNew = sub.saved_at?.slice(0, 10) === todayStr || sub.reporting_date === todayStr;

    return {
      id: sub.submission_id || sub.id,
      dataName,
      dataType,
      market,
      entryMethod,
      savedDate,
      records: sub.total_records ?? 0,
      isNew
    };
  });

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

  // Reset page to 1 when changing tab, search, or filters
  useEffect(() => {
    setCurrentPage(1);
  }, [commodityTab, searchQuery, marketFilter, dataTypeFilter]);

  function handleSetupContinue(setup) {
    setSetupOpen(false);
    if (setup.dataType === "Arrival Volume") navigate("/dftc/arrival-input", { state: setup });
    else navigate("/dftc/price-input", { state: setup });
  }

  const displayedSavedData = showAllSaved ? savedDataList : savedDataList.slice(0, 10);

  // Generate combination rows from live commodities API response
  // Only include rows where actual records exist
  const rawCommodityItems = commoditiesData?.items || [];

  const rawCommodityCombinations = useMemo(() => {
    const rows = [];

    if (commodityTab === "hw") {
      rawCommodityItems.forEach((itemData) => {
        const commodityName = itemData.commodity_name || itemData.name;
        if (!commodityName) return;
        const category = itemData.commodity_category || "Vegetables";
        const lastUpdated = itemData.last_updated ? formatSavedDate(itemData.last_updated) : null;

        // Only include if actual price records exist in source
        if (itemData.prices?.bangkerohan_retail !== null && itemData.prices?.bangkerohan_retail !== undefined) {
          rows.push({
            commodity: commodityName,
            category,
            dataType: "Daily Retail Prices",
            market: "Bangkerohan Public Market",
            latestDate: lastUpdated || "—",
            recordCount: 1,
            processingUse: "Price monitoring, forecasting, and analytics"
          });
        }

        if (itemData.prices?.bangkerohan_wholesale !== null && itemData.prices?.bangkerohan_wholesale !== undefined) {
          rows.push({
            commodity: commodityName,
            category,
            dataType: "Daily Wholesale Prices",
            market: "Bangkerohan Public Market",
            latestDate: lastUpdated || "—",
            recordCount: 1,
            processingUse: "Price monitoring, forecasting, and analytics"
          });
        }

        if (itemData.prices?.dftc_retail !== null && itemData.prices?.dftc_retail !== undefined) {
          rows.push({
            commodity: commodityName,
            category,
            dataType: "Daily Landing Prices",
            market: "DFTC Taboan",
            latestDate: lastUpdated || "—",
            recordCount: 1,
            processingUse: "Price monitoring, forecasting, and analytics"
          });
        }

        if (itemData.prices?.dftc_wholesale !== null && itemData.prices?.dftc_wholesale !== undefined) {
          rows.push({
            commodity: commodityName,
            category,
            dataType: "Daily Wholesale Prices",
            market: "DFTC Taboan",
            latestDate: lastUpdated || "—",
            recordCount: 1,
            processingUse: "Price monitoring, forecasting, and analytics"
          });
        }
      });
    } else {
      rawCommodityItems.forEach((itemData) => {
        const commodityName = itemData.commodity_name || itemData.name;
        if (!commodityName) return;
        const category = itemData.commodity_category || "Other";
        const lastUpdated = itemData.last_updated ? formatSavedDate(itemData.last_updated) : null;

        if (itemData.prices?.bangkerohan_retail !== null && itemData.prices?.bangkerohan_retail !== undefined) {
          rows.push({
            commodity: commodityName,
            category,
            dataType: "Daily Retail Prices",
            market: "Bangkerohan Public Market",
            latestDate: lastUpdated || "—",
            records: 1,
            processingUse: "DFTC monitoring and reporting"
          });
        }
      });
    }

    return rows;
  }, [commodityTab, rawCommodityItems]);

  // Filter Commodity Records (Search + Dropdown Filters)
  const filteredRecords = useMemo(() => {
    return rawCommodityCombinations.filter((r) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (r.commodity || "").toLowerCase().includes(q);
        const typeMatch = (r.dataType || "").toLowerCase().includes(q);
        const marketMatch = (r.market || "").toLowerCase().includes(q);
        const categoryMatch = (r.category || "").toLowerCase().includes(q);
        if (!nameMatch && !typeMatch && !marketMatch && !categoryMatch) return false;
      }

      // 2. Market Filter
      if (marketFilter !== "all" && r.market !== marketFilter) {
        return false;
      }

      // 3. Data Type Filter
      if (dataTypeFilter !== "all" && r.dataType !== dataTypeFilter) {
        return false;
      }

      return true;
    });
  }, [rawCommodityCombinations, searchQuery, marketFilter, dataTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE));
  const paginatedCommodityRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecords.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRecords, currentPage]);

  const hasActiveFilters = searchQuery.trim() !== "" || marketFilter !== "all" || dataTypeFilter !== "all";

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      {successMessage && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="flex-1 text-[13px] text-emerald-800">{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="p-0.5 rounded hover:bg-emerald-100">
            <X className="w-3.5 h-3.5 text-emerald-600" />
          </button>
        </div>
      )}

      <PageHeader
        title="Submit Data"
        description="Input, upload, and review market price and arrival-volume data."
      />

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setSetupOpen(true)}
          className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-all active:scale-[.98] flex items-center gap-4"
        >
          <div className="p-3 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <PenLine className="w-6 h-6 text-[var(--hw-green-700)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--hw-neutral-900)]">Input Data</p>
            <p className="text-[12px] text-[var(--hw-neutral-700)] mt-0.5">Encode price or arrival-volume data gathered from the market.</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />
        </button>

        <button
          onClick={() => navigate("/dftc/upload")}
          className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-all active:scale-[.98] flex items-center gap-4"
        >
          <div className="p-3 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <Upload className="w-6 h-6 text-[var(--hw-green-700)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--hw-neutral-900)]">Upload Data</p>
            <p className="text-[12px] text-[var(--hw-neutral-700)] mt-0.5">Import an existing Excel or CSV dataset.</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />
        </button>
      </div>

      {/* Recent Saved Data (Renamed from Recent Saved Files) */}
      <div>
        <div className="mb-3">
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Recent Saved Data</h2>
          <p className="text-[14px] text-[var(--hw-neutral-800)] mt-0.5">Recent datasets saved or imported. All records are securely retained.</p>
        </div>

        {loadingSubmissions ? (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-3 animate-pulse">
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
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-5 py-10 text-center">
            <FileText className="w-8 h-8 text-[var(--hw-neutral-300)] mx-auto mb-2" />
            <p className="text-[13px] text-[var(--hw-neutral-700)] font-medium">No saved data yet.</p>
            <p className="text-[12px] text-[var(--hw-neutral-800)] mt-1">Datasets will appear here after you save or upload data.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
              <table className="w-full">
                <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                  <tr>
                    {["Data Name", "Data Type", "Market or Facility", "Entry Method", "Saved Date", "Records"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedSavedData.map((file) => (
                    <tr
                      key={file.id}
                      onClick={() => navigate(`/dftc/submissions/${file.id}`)}
                      className="border-b border-[var(--hw-neutral-100)] last:border-0 hover:bg-[var(--hw-neutral-50)] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-[var(--hw-neutral-900)] font-medium">{file.dataName}</span>
                          {file.isNew && (
                            <span className="text-[10px] font-medium text-[var(--hw-green-700)] border border-[var(--hw-green-300)] rounded px-1.5 py-0.5 leading-none whitespace-nowrap">New</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{file.dataType}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{file.market}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{file.entryMethod}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{file.savedDate}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)]">{file.records ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="block md:hidden space-y-3">
              {displayedSavedData.map((file) => (
                <button
                  key={file.id}
                  onClick={() => navigate(`/dftc/submissions/${file.id}`)}
                  className="w-full bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left hover:bg-[var(--hw-neutral-50)] transition-colors active:scale-[.98]"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-[13px] font-medium text-[var(--hw-neutral-900)] leading-snug">{file.dataName}</p>
                    {file.isNew && (
                      <span className="shrink-0 text-[10px] font-medium text-[var(--hw-green-700)] border border-[var(--hw-green-300)] rounded px-1.5 py-0.5 leading-none">New</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <span className="text-[12px] text-[var(--hw-neutral-700)]">{file.dataType}</span>
                    <span className="text-[12px] text-[var(--hw-neutral-700)]">·</span>
                    <span className="text-[12px] text-[var(--hw-neutral-700)]">{file.entryMethod}</span>
                    <span className="text-[12px] text-[var(--hw-neutral-700)]">·</span>
                    <span className="text-[12px] text-[var(--hw-neutral-700)]">{file.records ?? 0} records</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[12px] text-[var(--hw-neutral-700)]">{file.savedDate}</span>
                    <span className="text-[12px] text-[var(--hw-neutral-700)]">{file.records ?? 0} records</span>
                  </div>
                </button>
              ))}
            </div>

            {savedDataList.length > 10 && !showAllSaved && (
              <div className="mt-3 text-center">
                <button onClick={() => setShowAllSaved(true)} className="text-[13px] text-[var(--hw-green-700)] hover:underline">
                  View All Recent Data
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Commodity Records */}
      <div>
        <div className="mb-3">
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Commodity Records</h2>
          <p className="text-[14px] text-[var(--hw-neutral-800)] mt-0.5">
            Review retained price and arrival-volume records by commodity. Select a commodity to view its complete record history.
          </p>
        </div>

        {/* Tab Strip - Clean header without scrollbar artifacts */}
        <div className="flex items-center justify-between border-b border-[var(--hw-neutral-200)] mb-4 gap-4">
          <div className="flex gap-2">
            {[["hw", "Analytics-Supported Commodities"], ["temp", "Other Commodities"]].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setCommodityTab(id)}
                className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  commodityTab === id
                    ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)] font-semibold"
                    : "border-transparent text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setInfoModalOpen(true)} className="shrink-0 text-[13px] text-[var(--hw-green-700)] hover:underline whitespace-nowrap pb-1">
            About analytics coverage
          </button>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--hw-neutral-400)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search commodity, category, or type..."
              className="w-full pl-9 pr-8 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:border-[var(--hw-green-700)] text-[var(--hw-neutral-900)] placeholder:text-[var(--hw-neutral-400)] shadow-[var(--shadow-xs)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 border border-[var(--hw-neutral-200)] rounded-xl shadow-[var(--shadow-xs)]">
              <Filter className="w-3.5 h-3.5 text-[var(--hw-neutral-500)]" />
              <select
                value={marketFilter}
                onChange={(e) => setMarketFilter(e.target.value)}
                className="text-[12px] bg-transparent text-[var(--hw-neutral-800)] focus:outline-none cursor-pointer"
              >
                <option value="all">All Markets</option>
                <option value="Bangkerohan Public Market">Bangkerohan Public Market</option>
                <option value="DFTC Taboan">DFTC Taboan</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 border border-[var(--hw-neutral-200)] rounded-xl shadow-[var(--shadow-xs)]">
              <select
                value={dataTypeFilter}
                onChange={(e) => setDataTypeFilter(e.target.value)}
                className="text-[12px] bg-transparent text-[var(--hw-neutral-800)] focus:outline-none cursor-pointer"
              >
                <option value="all">All Data Types</option>
                <option value="Daily Retail Prices">Daily Retail Prices</option>
                <option value="Daily Wholesale Prices">Daily Wholesale Prices</option>
                <option value="Daily Landing Prices">Daily Landing Prices</option>
                <option value="DFTC Arrival Volume">DFTC Arrival Volume</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setMarketFilter("all");
                  setDataTypeFilter("all");
                }}
                className="text-[12px] text-[var(--hw-green-700)] hover:underline whitespace-nowrap px-1"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Loading Skeleton */}
        {loadingCommodities ? (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--hw-neutral-100)] last:border-0">
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-40 bg-[var(--hw-neutral-200)] rounded" />
                  <div className="h-3 w-56 bg-[var(--hw-neutral-200)] rounded" />
                </div>
                <div className="h-4 w-20 bg-[var(--hw-neutral-200)] rounded" />
              </div>
            ))}
          </div>
        ) : commodityTab === "hw" ? (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)] flex items-center justify-between">
              <p className="text-[12px] text-[var(--hw-neutral-800)]">
                Select a top-10 supported commodity to view all of its retained records.
              </p>
              <span className="text-[12px] font-medium text-[var(--hw-neutral-700)]">
                {filteredRecords.length} records
              </span>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="w-8 h-8 text-[var(--hw-neutral-300)] mx-auto mb-2" />
                <p className="text-[13px] text-[var(--hw-neutral-700)] font-medium">
                  {hasActiveFilters ? "No matching analytics-supported commodities found." : "No analytics-supported commodity records found."}
                </p>
                <p className="text-[12px] text-[var(--hw-neutral-800)] mt-1">
                  {hasActiveFilters ? "Try adjusting your search query or filters." : "Commodity records will appear here as prices and volumes are recorded."}
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                      <tr>
                        {["Commodity", "Data Type", "Market or Facility", "Latest Record Date", "Record Count", "Processing Use"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCommodityRecords.map((r, i) => (
                        <tr
                          key={i}
                          onClick={() => navigate(`/dftc/input/commodity/${encodeURIComponent(r.commodity)}`, { state: { returnTab: commodityTab, returnScrollY: window.scrollY } })}
                          className="border-b border-[var(--hw-neutral-100)] last:border-0 hover:bg-[var(--hw-green-50)] cursor-pointer transition-colors focus-within:bg-[var(--hw-green-50)]"
                          tabIndex={0}
                          role="button"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") navigate(`/dftc/input/commodity/${encodeURIComponent(r.commodity)}`, { state: { returnTab: commodityTab, returnScrollY: window.scrollY } });
                          }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {hasHWIcon(r.commodity) && <CommodityIllustration commodityId={hwId(r.commodity)} className="w-5 h-5 shrink-0" />}
                              <span className="text-[14px] font-medium text-[var(--hw-neutral-900)]">{r.commodity}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.dataType}</td>
                          <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.market}</td>
                          <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.latestDate}</td>
                          <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)]">{r.recordCount ?? 0}</td>
                          <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)]">{r.processingUse}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="block md:hidden divide-y divide-[var(--hw-neutral-100)]">
                  {paginatedCommodityRecords.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => navigate(`/dftc/input/commodity/${encodeURIComponent(r.commodity)}`, { state: { returnTab: commodityTab, returnScrollY: window.scrollY } })}
                      className="w-full px-4 py-3 text-left hover:bg-[var(--hw-green-50)] active:bg-[var(--hw-green-100)] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2">
                          {hasHWIcon(r.commodity) && <CommodityIllustration commodityId={hwId(r.commodity)} className="w-5 h-5 shrink-0" />}
                          <span className="text-[14px] font-medium text-[var(--hw-neutral-900)]">{r.commodity}</span>
                        </div>
                        <span className="text-[13px] text-[var(--hw-neutral-800)]">{r.recordCount ?? 0} records</span>
                      </div>
                      <p className="text-[13px] text-[var(--hw-neutral-800)]">{r.dataType} · {r.market}</p>
                      <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">{r.processingUse}</p>
                    </button>
                  ))}
                </div>

                {/* Pagination Controls (20 per page) */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)] flex items-center justify-between gap-2">
                    <p className="text-[12px] text-[var(--hw-neutral-600)]">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length)} of {filteredRecords.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-700)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--hw-neutral-100)]"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg text-[12px] font-medium transition-colors ${
                            currentPage === p
                              ? "bg-[var(--hw-green-700)] text-white"
                              : "border border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-100)]"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-700)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--hw-neutral-100)]"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)] flex items-center justify-between">
              <p className="text-[12px] text-[var(--hw-neutral-800)]">
                Select a commodity to view all of its retained records.
              </p>
              <span className="text-[12px] font-medium text-[var(--hw-neutral-700)]">
                {filteredRecords.length} records
              </span>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="w-8 h-8 text-[var(--hw-neutral-300)] mx-auto mb-2" />
                <p className="text-[13px] text-[var(--hw-neutral-700)] font-medium">
                  {hasActiveFilters ? "No matching commodity records found." : "No commodity records found."}
                </p>
                <p className="text-[12px] text-[var(--hw-neutral-800)] mt-1">
                  {hasActiveFilters ? "Try adjusting your search query or filters." : "Commodity records will appear here as prices and volumes are recorded."}
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                      <tr>
                        {["Commodity", "Category", "Data Type", "Market or Facility", "Latest Record Date", "Record Count", "Processing Use"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCommodityRecords.map((r, i) => (
                        <tr
                          key={i}
                          onClick={() => navigate(`/dftc/input/commodity/${encodeURIComponent(r.commodity)}`, { state: { returnTab: commodityTab, returnScrollY: window.scrollY } })}
                          className="border-b border-[var(--hw-neutral-100)] last:border-0 hover:bg-[var(--hw-green-50)] cursor-pointer transition-colors focus-within:bg-[var(--hw-green-50)]"
                          tabIndex={0}
                          role="button"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") navigate(`/dftc/input/commodity/${encodeURIComponent(r.commodity)}`, { state: { returnTab: commodityTab, returnScrollY: window.scrollY } });
                          }}
                        >
                          <td className="px-4 py-3 text-[14px] font-medium text-[var(--hw-neutral-900)]">{r.commodity}</td>
                          <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)]">{r.category}</td>
                          <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.dataType}</td>
                          <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.market}</td>
                          <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.latestDate}</td>
                          <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)]">{r.records ?? 0}</td>
                          <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)]">{r.processingUse}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="block md:hidden divide-y divide-[var(--hw-neutral-100)]">
                  {paginatedCommodityRecords.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => navigate(`/dftc/input/commodity/${encodeURIComponent(r.commodity)}`, { state: { returnTab: commodityTab, returnScrollY: window.scrollY } })}
                      className="w-full px-4 py-3 text-left hover:bg-[var(--hw-green-50)] active:bg-[var(--hw-green-100)] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[14px] font-medium text-[var(--hw-neutral-900)]">{r.commodity}</span>
                        <span className="text-[13px] text-[var(--hw-neutral-800)]">{r.records ?? 0} records</span>
                      </div>
                      <p className="text-[13px] text-[var(--hw-neutral-800)]">{r.category} · {r.dataType} · {r.market}</p>
                      <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">{r.latestDate}</p>
                    </button>
                  ))}
                </div>

                {/* Pagination Controls (20 per page) */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)] flex items-center justify-between gap-2">
                    <p className="text-[12px] text-[var(--hw-neutral-600)]">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length)} of {filteredRecords.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-700)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--hw-neutral-100)]"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg text-[12px] font-medium transition-colors ${
                            currentPage === p
                              ? "bg-[var(--hw-green-700)] text-white"
                              : "border border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-100)]"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-700)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--hw-neutral-100)]"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {setupOpen && <SetupModal onClose={() => setSetupOpen(false)} onContinue={handleSetupContinue} />}
      {infoModalOpen && <HowHarvestWiseModal onClose={() => setInfoModalOpen(false)} />}
    </div>
  );
}

export { DFTCInput as default };
