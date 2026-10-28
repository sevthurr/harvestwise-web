import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search, X, Leaf, Info, AlertCircle, BarChart3, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import {
  COMMODITY_CATEGORIES,
  getCategoryFor,
  isHWCommodity,
  HW_ID_TO_NAME,
  HW_COMMODITY_NAMES
} from "../../global/data/commodities";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { CommodityIllustration, getCommodityIconKey } from "../../global/components/shared/CommodityIllustrations";
import { ForecastPriceTrendChart } from "../../global/components/shared/ForecastPriceTrendChart";
import { ArrivalVolumeTrendChart } from "../../global/components/shared/ArrivalVolumeTrendChart";
import { ArrivalSourcePieChart } from "../../global/components/shared/ArrivalSourcePieChart";
import { HistoricalAveragePriceSection } from "../../global/components/shared/HistoricalAveragePriceSection";
import { useIsMobile } from "../../global/components/ui/use-mobile";
import { normalizeCommodityLabel } from "../../global/utils/priceChartTransforms";
import * as analyticsApi from "../../../services/api/analyticsApi";
import * as pricesApi from "../../../services/api/pricesApi";
import * as dftcApi from "../../../services/api/dftcApi";
import { apiGet, parseResponse } from "../../global/api";
import { getClassificationTextColor } from "./dftcClassificationColors";
import SeasonalProductionTrends from "./DFTCSeasonalProductionTrends";
import { manilaTodayParts, parseManilaDate } from "../../global/utils/apiTransforms";

import {
  buildForecastChartData,
  buildForecastSummaries,
  buildHistoricalChartData,
  buildTableRows,
  catalogPairsForCommodity,
  catalogPairsFromPriceList,
  findCommodityId,
  isApiBackedPriceSeries,
  toPriceTypeKey,
  varietyDisplayKey,
  getAvailableVarietiesForCommodity,
  pickDefaultVariety,
  buildUnifiedPriceTrendData,
} from "./dftcTrendsPriceData";

const HW_GREEN_SHADES = [
  "#15803D",
  "#22C55E",
  "#166534",
  "#4ADE80",
  "#16A34A",
  "#14532D",
  "#86EFAC",
  "#052E16"
];

function formatVol(v) {
  if (v == null || isNaN(v)) return "—";
  return Number(v).toLocaleString("en-US");
}

function getPriceTypeKey(market, priceType) {
  const isDftc = (market || "").toLowerCase().includes("dftc");
  const isWholesale = (priceType || "").toLowerCase().includes("wholesale");
  if (isDftc) {
    return isWholesale ? "dftc_wholesale" : "dftc_retail";
  }
  return isWholesale ? "bangkerohan_wholesale" : "bangkerohan_retail";
}

function toId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const PRICE_CATEGORIES = COMMODITY_CATEGORIES.map((cat) => ({
  id: toId(cat.category),
  name: cat.category,
  commodities: cat.items.map((i) => i.name)
}));

const TOP10_COMMODITY_CATEGORIES = COMMODITY_CATEGORIES.map((cat) => ({
  id: toId(cat.category),
  name: cat.category,
  commodities: cat.items.filter((i) => HW_COMMODITY_NAMES.has(i.name)).map((i) => i.name),
})).filter((cat) => cat.commodities.length > 0);

function getCommodityCategory(name) {
  return getCategoryFor(name) ?? "—";
}

function getDateLabel(preset, customFrom, customTo) {
  if (preset === "7d") return "Last 7 days";
  if (preset === "14d") return "Last 14 days";
  if (preset === "21d") return "Last 21 days";
  if (preset === "28d") return "Last 28 days";
  if (customFrom && customTo) return formatCustomDateLabel(customFrom, customTo);
  return "Custom";
}

function getPeriodLabel(preset, customFrom, customTo) {
  if (preset === "2m" || preset === "7d") return "Last 2 months";
  if (preset === "3m" || preset === "14d") return "Last 3 months";
  if (preset === "6m" || preset === "21d") return "Last 6 months";
  if (preset === "all" || preset === "28d") return "All recorded months";
  if (customFrom && customTo) return formatCustomDateLabel(customFrom, customTo);
  return "Custom";
}

function formatCustomDateLabel(from, to) {
  if (!from || !to) return "Custom";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmt = (d) => {
    const parts = d.split("-");
    if (parts.length < 2) return d;
    return `${months[parseInt(parts[1], 10) - 1]} ${parts[2] ? parseInt(parts[2], 10) : ""}`.trim();
  };
  const year = from && from.includes("-") ? parseInt(from.split("-")[0], 10) : Number(manilaTodayParts().year);
  return `${fmt(from)}–${fmt(to)}, ${year}`;
}

const cardCls = "bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] min-w-0";
const labelCls = "block text-[11px] sm:text-[12px] font-semibold text-[var(--hw-neutral-700)] mb-1";
const selectCls = "w-full truncate px-2.5 py-1.5 sm:px-3 sm:py-2 text-[12px] sm:text-[13px] border border-[var(--hw-neutral-200)] rounded-lg sm:rounded-xl bg-white text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-600)] transition-colors";
const PAGE_SIZE = 20;

export function SearchableCombobox({ categories, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const flatItems = useMemo(() => {
    const q = query.toLowerCase();
    const items = [];
    categories.forEach((cat) => {
      cat.commodities.filter((c) => c.toLowerCase().includes(q)).forEach((c) => items.push({ commodity: c }));
    });
    return items;
  }, [categories, query]);

  useEffect(() => {
    if (open) {
      setHighlightIdx(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    function h(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatItems[highlightIdx]) {
        onChange(flatItems[highlightIdx].commodity);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const groupedFiltered = useMemo(() => {
    const q = query.toLowerCase();
    return categories.map((cat) => ({
      ...cat,
      commodities: cat.commodities.filter((c) => c.toLowerCase().includes(q))
    })).filter((cat) => cat.commodities.length > 0);
  }, [categories, query]);

  const selectedIconKey = getCommodityIconKey(null, null, value);

  return (
    <div ref={containerRef} className="relative w-full">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 sm:px-3 sm:py-2 text-[12px] sm:text-[13px] border border-[var(--hw-neutral-200)] rounded-lg sm:rounded-xl bg-white text-[var(--hw-neutral-900)] focus:outline-none hover:border-[var(--hw-neutral-400)] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {selectedIconKey ? (
              <CommodityIllustration commodityId={selectedIconKey} className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            ) : (
              <Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--hw-green-600)] shrink-0" />
            )}
            <span className="truncate font-medium">{value}</span>
          </div>
          <ChevronDown size={13} className="shrink-0 text-[var(--hw-neutral-500)] ml-1 sm:ml-1.5" />
        </button>
      ) : (
        <div className="border border-[var(--hw-green-600)] rounded-xl bg-white shadow-lg overflow-hidden z-50 relative">
          <div className="flex items-center px-3 py-2 border-b border-[var(--hw-neutral-200)]">
            <Search size={14} className="text-[var(--hw-neutral-400)] shrink-0 mr-2" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlightIdx(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search commodities..."
              className="flex-1 text-[13px] text-[var(--hw-neutral-900)] placeholder-[var(--hw-neutral-400)] focus:outline-none bg-transparent"
            />
            {query ? (
              <button onClick={() => setQuery("")} className="ml-1 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-700)]">
                <X size={13} />
              </button>
            ) : (
              <button onClick={() => setOpen(false)} className="ml-1 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-700)]">
                <ChevronDown size={13} className="rotate-180" />
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {groupedFiltered.length === 0 ? (
              <div className="px-4 py-3 text-[13px] text-[var(--hw-neutral-500)]">No commodities found</div>
            ) : (
              groupedFiltered.map((cat) => (
                <div key={cat.id}>
                  <div className="px-3.5 py-1.5 text-[11px] font-bold text-[var(--hw-neutral-700)] bg-[var(--hw-neutral-50)] select-none uppercase tracking-wider">
                    {cat.name}
                  </div>
                  {cat.commodities.map((c) => {
                    const gIdx = flatItems.findIndex((f) => f.commodity === c);
                    const hi = gIdx === highlightIdx;
                    const itemIcon = getCommodityIconKey(null, null, c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onMouseEnter={() => setHighlightIdx(gIdx)}
                        onClick={() => {
                          onChange(c);
                          setOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-left transition-colors cursor-pointer ${
                          hi ? "bg-[var(--hw-green-50)] text-[var(--hw-green-900)]" : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
                        } ${c === value ? "font-semibold text-[var(--hw-green-800)]" : ""}`}
                      >
                        {itemIcon ? (
                          <CommodityIllustration commodityId={itemIcon} className="w-4 h-4 shrink-0" />
                        ) : (
                          <Leaf className="w-3.5 h-3.5 text-[var(--hw-neutral-400)] shrink-0" />
                        )}
                        <span className="flex-1 truncate">{c}</span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DateSelect({ preset, customFrom, customTo, onChange }) {
  const [dropOpen, setDropOpen] = useState(false);
  const [popOpen, setPopOpen] = useState(false);
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    function h(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropOpen(false);
        setPopOpen(false);
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const displayLabel =
    preset === "7d"
      ? "Last 7 days"
      : preset === "14d"
      ? "Last 14 days"
      : preset === "21d"
      ? "Last 21 days"
      : preset === "28d"
      ? "Last 28 days"
      : customFrom && customTo
      ? formatCustomDateLabel(customFrom, customTo)
      : "Custom";

  const options = [
    { key: "7d", label: "Last 7 days" },
    { key: "14d", label: "Last 14 days" },
    { key: "21d", label: "Last 21 days" },
    { key: "28d", label: "Last 28 days" },
    { key: "custom", label: "Custom" }
  ];

  const invalidRange = pendingFrom && pendingTo && pendingTo < pendingFrom;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => {
          setDropOpen(!dropOpen);
          setPopOpen(false);
        }}
        className="w-full flex items-center justify-between px-2.5 py-1.5 sm:px-3 sm:py-2 text-[12px] sm:text-[13px] border border-[var(--hw-neutral-200)] rounded-lg sm:rounded-xl bg-white text-[var(--hw-neutral-900)] hover:border-[var(--hw-neutral-400)] focus:outline-none transition-colors cursor-pointer"
      >
        <span className="truncate font-medium">{displayLabel}</span>
        <ChevronDown size={13} className={`shrink-0 text-[var(--hw-neutral-500)] ml-1 transition-transform ${dropOpen ? "rotate-180" : ""}`} />
      </button>

      {dropOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-full min-w-[160px] max-w-[calc(100vw-2rem)] bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg py-1">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                if (opt.key === "custom") {
                  setPendingFrom(customFrom);
                  setPendingTo(customTo);
                  setDropOpen(false);
                  setPopOpen(true);
                } else {
                  onChange(opt.key);
                  setDropOpen(false);
                }
              }}
              className={`w-full text-left px-4 py-2 text-[13px] transition-colors cursor-pointer ${
                preset === opt.key ? "bg-[var(--hw-green-50)] text-[var(--hw-green-800)] font-semibold" : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {popOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-72 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-4">
          <div className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mb-3">Select Date Range</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--hw-neutral-700)] mb-1">Start Date</label>
              <input
                type="date"
                value={pendingFrom}
                onChange={(e) => setPendingFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--hw-neutral-700)] mb-1">End Date</label>
              <input
                type="date"
                value={pendingTo}
                onChange={(e) => setPendingTo(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)]"
              />
            </div>
          </div>
          {invalidRange && <div className="text-[11px] text-red-500 mb-2">End date must not be before start date.</div>}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setPopOpen(false)}
              className="px-3 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={!pendingFrom || !pendingTo || !!invalidRange}
              onClick={() => {
                onChange("custom", pendingFrom, pendingTo);
                setPopOpen(false);
              }}
              className="px-3 py-1.5 text-[12px] bg-[var(--hw-green-700)] text-white font-medium rounded-lg hover:bg-[var(--hw-green-800)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PeriodSelect({ preset, customFrom, customTo, onChange }) {
  const [dropOpen, setDropOpen] = useState(false);
  const [popOpen, setPopOpen] = useState(false);
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    function h(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropOpen(false);
        setPopOpen(false);
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const displayLabel = getPeriodLabel(preset, customFrom, customTo);

  const options = [
    { key: "2m", label: "Last 2 months" },
    { key: "3m", label: "Last 3 months" },
    { key: "6m", label: "Last 6 months" },
    { key: "all", label: "All recorded months" },
    { key: "custom", label: "Custom" }
  ];

  const invalidRange = pendingFrom && pendingTo && pendingTo < pendingFrom;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => {
          setDropOpen(!dropOpen);
          setPopOpen(false);
        }}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] border border-[var(--hw-neutral-200)] rounded-xl bg-white text-[var(--hw-neutral-900)] hover:border-[var(--hw-neutral-400)] focus:outline-none transition-colors cursor-pointer"
      >
        <span className="truncate font-medium">{displayLabel}</span>
        <ChevronDown size={14} className={`shrink-0 text-[var(--hw-neutral-500)] ml-2 transition-transform ${dropOpen ? "rotate-180" : ""}`} />
      </button>

      {dropOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-full min-w-[160px] max-w-[calc(100vw-2rem)] bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg py-1">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                if (opt.key === "custom") {
                  setPendingFrom(customFrom);
                  setPendingTo(customTo);
                  setDropOpen(false);
                  setPopOpen(true);
                } else {
                  onChange(opt.key);
                  setDropOpen(false);
                }
              }}
              className={`w-full text-left px-4 py-2 text-[13px] transition-colors cursor-pointer ${
                preset === opt.key ? "bg-[var(--hw-green-50)] text-[var(--hw-green-800)] font-semibold" : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {popOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-72 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-4">
          <div className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mb-3">Select Month Range</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--hw-neutral-700)] mb-1">Start Month</label>
              <input
                type="month"
                value={pendingFrom ? pendingFrom.slice(0, 7) : ""}
                onChange={(e) => setPendingFrom(e.target.value ? `${e.target.value}-01` : "")}
                className="w-full px-2.5 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--hw-neutral-700)] mb-1">End Month</label>
              <input
                type="month"
                value={pendingTo ? pendingTo.slice(0, 7) : ""}
                onChange={(e) => setPendingTo(e.target.value ? `${e.target.value}-28` : "")}
                className="w-full px-2.5 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)]"
              />
            </div>
          </div>
          {invalidRange && <div className="text-[11px] text-red-500 mb-2">End month must not be before start month.</div>}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setPopOpen(false)}
              className="px-3 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={!pendingFrom || !pendingTo || !!invalidRange}
              onClick={() => {
                onChange("custom", pendingFrom, pendingTo);
                setPopOpen(false);
              }}
              className="px-3 py-1.5 text-[12px] bg-[var(--hw-green-700)] text-white font-medium rounded-lg hover:bg-[var(--hw-green-800)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoricalRangeSelect({ preset, customFrom, customTo, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const options = [
    { key: "7d", label: "Last 7 days" },
    { key: "14d", label: "Last 14 days" },
    { key: "21d", label: "Last 21 days" },
    { key: "28d", label: "Last 28 days" }
  ];

  useEffect(() => {
    function h(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = options.find((o) => o.key === preset);
  const displayLabel = selected?.label || getDateLabel(preset, customFrom, customTo);

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-8 w-full sm:w-auto px-2.5 sm:px-3 text-[12px] font-medium text-black bg-[var(--hw-neutral-50)] hover:bg-white border border-[var(--hw-neutral-200)] rounded-lg flex items-center justify-between sm:justify-start gap-2 focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-700)] transition-colors cursor-pointer whitespace-nowrap"
      >
        <span className="font-medium whitespace-nowrap">{displayLabel}</span>
        <ChevronDown size={13} className={`text-black shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1.5 z-50 min-w-[130px] w-full sm:w-36 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg py-1">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                onChange(opt.key);
                setOpen(false);
              }}
              className={`w-full text-left px-3.5 py-1.5 text-[12px] whitespace-nowrap transition-colors cursor-pointer ${
                preset === opt.key ? "bg-[var(--hw-green-50)] text-[var(--hw-green-800)] font-semibold" : "text-black hover:bg-[var(--hw-neutral-50)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ForecastHorizonSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const options = [
    { v: 7, label: "Next 7 days" },
    { v: 14, label: "Next 14 days" },
    { v: 21, label: "Next 21 days" },
    { v: 28, label: "Next 28 days" }
  ];

  useEffect(() => {
    function h(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = options.find((o) => o.v === value);

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-8 w-full sm:w-auto px-2.5 sm:px-3 text-[12px] font-medium text-black bg-[var(--hw-neutral-50)] hover:bg-white border border-[var(--hw-neutral-200)] rounded-lg flex items-center justify-between sm:justify-start gap-2 focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-700)] transition-colors cursor-pointer whitespace-nowrap"
      >
        <span className="font-medium whitespace-nowrap">{selected?.label ?? "Select"}</span>
        <ChevronDown size={13} className={`text-black shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1.5 z-50 min-w-[130px] w-full sm:w-36 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg py-1">
          {options.map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => {
                onChange(opt.v);
                setOpen(false);
              }}
              className={`w-full text-left px-3.5 py-1.5 text-[12px] whitespace-nowrap transition-colors cursor-pointer ${
                value === opt.v ? "bg-[var(--hw-green-50)] text-[var(--hw-green-800)] font-semibold" : "text-black hover:bg-[var(--hw-neutral-50)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Pagination({ page, totalPages, totalRows, onPage }) {
  if (totalRows === 0) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, totalRows);
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-[var(--hw-neutral-100)]">
      <span className="text-[12px] text-[var(--hw-neutral-600)]">
        Showing {from}–{to} of {totalRows} records
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            className="px-2.5 py-1.5 text-[12px] rounded-lg border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] disabled:opacity-40 hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Prev
          </button>
          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} className="px-2 text-[var(--hw-neutral-400)]">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                className={`w-8 h-8 text-[12px] rounded-lg border transition-colors cursor-pointer ${
                  page === p
                    ? "bg-[var(--hw-green-700)] text-white border-[var(--hw-green-700)] font-semibold"
                    : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => onPage(page + 1)}
            disabled={page === totalPages}
            className="px-2.5 py-1.5 text-[12px] rounded-lg border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] disabled:opacity-40 hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function TabNav({ tab, onChange }) {
  return (
    <div className="flex border-b border-[var(--hw-neutral-200)] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {[
        { id: "price", label: "Price Trends", icon: TrendingUp },
        { id: "arrival", label: "Arrival Volume Trends", icon: BarChart3 },
        { id: "production", label: "Seasonal Production", icon: Leaf }
      ].map((t) => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-6 py-2.5 sm:py-3.5 text-[12px] sm:text-[13px] font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              active
                ? "border-[var(--hw-green-700)] text-[var(--hw-green-800)] bg-[var(--hw-green-50)]/30"
                : "border-transparent text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${active ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-400)]"}`} />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SummaryStripSkeleton({ columns = 5 }) {
  return (
    <div className={`grid grid-cols-2 ${columns === 5 ? "sm:grid-cols-3 lg:grid-cols-5" : columns === 4 ? "lg:grid-cols-4" : "sm:grid-cols-3"} gap-2 sm:gap-2.5`}>
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className={`bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-2.5 sm:p-3.5 space-y-2 ${columns === 5 && i === 4 ? "col-span-2 sm:col-span-1" : ""}`}>
          <div className="h-2.5 w-20 bg-[var(--hw-neutral-200)] rounded animate-pulse" />
          <div className="h-4 w-16 bg-[var(--hw-neutral-100)] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function ChartCardSkeleton({ height = 320 }) {
  return (
    <div className={`${cardCls} p-6 md:p-8 space-y-4`}>
      <div className="flex justify-between items-center pb-2 border-b border-[var(--hw-neutral-100)]">
        <div className="space-y-1.5">
          <div className="h-4 w-32 bg-[var(--hw-neutral-200)] rounded animate-pulse" />
          <div className="h-3 w-64 bg-[var(--hw-neutral-100)] rounded animate-pulse" />
        </div>
        <div className="h-8 w-36 bg-[var(--hw-neutral-100)] rounded-xl animate-pulse" />
      </div>
      <div style={{ height }} className="w-full bg-[var(--hw-neutral-50)] rounded-xl flex items-center justify-center animate-pulse" />
    </div>
  );
}

function TableSkeleton({ cols = 8, rows = 5 }) {
  return (
    <div className={`${cardCls} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-3 w-16 bg-[var(--hw-neutral-200)] rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--hw-neutral-100)]">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-4 py-3.5">
                    <div className="h-3.5 bg-[var(--hw-neutral-100)] rounded animate-pulse" style={{ width: `${50 + (c * 17) % 45}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DFTCTrends() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined" && window.location) {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      return ["arrival", "production"].includes(tab) ? tab : "price";
    }
    return "price";
  });

  const resolveCommodityParam = (paramVal) => {
    if (!paramVal) return null;
    const trimmed = String(paramVal).trim();
    const lower = trimmed.toLowerCase();

    // Check direct ID mapping (e.g. "kamatis" -> "Kamatis")
    if (HW_ID_TO_NAME[lower]) {
      return HW_ID_TO_NAME[lower];
    }
    for (const [id, name] of Object.entries(HW_ID_TO_NAME)) {
      if (id.toLowerCase() === lower) return name;
    }

    // Check all commodity categories (covers all 6 categories, not just top 10)
    const allCommodityObjects = COMMODITY_CATEGORIES.flatMap((c) => c.items);
    const directItem = allCommodityObjects.find(
      (item) => item.name.toLowerCase() === lower || item.id === lower
    );
    if (directItem) return directItem.name;

    // Check PRICE_CATEGORIES
    const allCommodities = PRICE_CATEGORIES.flatMap((c) => c.commodities);
    const found = allCommodities.find(
      (c) => c.toLowerCase() === lower || toId(c) === lower
    );
    if (found) return found;

    return paramVal;
  };

  const [activeAlertModal, setActiveAlertModal] = useState(() => {
    if (typeof window !== "undefined" && window.location) {
      const params = new URLSearchParams(window.location.search);
      const alert = params.get("alert");
      if (alert === "volatility" || alert === "oversupply") return alert;
    }
    return null;
  });

  const { data: homeData, isLoading: isHomeLoading } = useQuery({
    queryKey: ["dftc", "home"],
    queryFn: async () => {
      const res = await apiGet("/dftc/home");
      return parseResponse(res);
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (typeof window !== "undefined" && window.location) {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab");
      if (urlTab === "arrival" || urlTab === "production" || urlTab === "price") {
        setActiveTab(urlTab);
      }
      const rawComm = params.get("commodity");
      if (rawComm) {
        const resolved = resolveCommodityParam(rawComm);
        if (urlTab === "arrival") {
          setACommodity(resolved);
        } else {
          setPCommodity(resolved);
        }
      }
      const rawVariety = params.get("variety");
      if (rawVariety) {
        setPVariety(rawVariety);
      }
      const rawMarket = params.get("market");
      if (rawMarket) {
        const lowerMarket = rawMarket.toLowerCase();
        if (lowerMarket.includes("dftc") || lowerMarket.includes("taboan")) {
          setPMarket("DFTC Taboan");
        } else if (lowerMarket.includes("bankerohan") || lowerMarket.includes("bkrh")) {
          setPMarket("Bankerohan Public Market");
        }
      }
      const rawPriceType = params.get("price_type");
      if (rawPriceType) {
        if (rawPriceType.toLowerCase().includes("wholesale")) {
          setPPriceType("Wholesale");
        } else if (rawPriceType.toLowerCase().includes("retail")) {
          setPPriceType("Retail");
        }
      }
      const urlAlert = params.get("alert");
      if (urlAlert === "volatility" || urlAlert === "oversupply") {
        setActiveAlertModal(urlAlert);
      }
    }
  }, []);

  const closeAlertModal = () => {
    setActiveAlertModal(null);
    if (typeof window !== "undefined" && window.location && window.history) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("alert");
        window.history.replaceState({}, "", url.toString());
      } catch {
        // ignore
      }
    }
  };

  const selectAlertCommodity = (commName) => {
    if (activeAlertModal === "volatility") {
      setPCommodity(commName);
      if (typeof window !== "undefined" && window.location && window.history) {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set("tab", "price");
          url.searchParams.set("commodity", commName);
          url.searchParams.delete("alert");
          window.history.replaceState({}, "", url.toString());
        } catch {}
      }
    } else {
      setACommodity(commName);
      if (typeof window !== "undefined" && window.location && window.history) {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set("tab", "arrival");
          url.searchParams.set("commodity", commName);
          url.searchParams.delete("alert");
          window.history.replaceState({}, "", url.toString());
        } catch {}
      }
    }
    closeAlertModal();
  };

  const alertCommoditiesList = useMemo(() => {
    if (activeAlertModal === "volatility") {
      if (homeData?.kpis?.volatile_commodities?.length) {
        return homeData.kpis.volatile_commodities;
      }
      return (homeData?.price_movement || []).filter(
        (p) => p.change_pct != null && Math.abs(p.change_pct) >= 10.0
      );
    }
    if (activeAlertModal === "oversupply") {
      if (homeData?.kpis?.oversupply_commodities?.length) {
        return homeData.kpis.oversupply_commodities;
      }
      return [];
    }
    return [];
  }, [activeAlertModal, homeData]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined" && window.location && window.history) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        window.history.replaceState({}, "", url.toString());
      } catch {
        // ignore
      }
    }
  };

  // Price Trend state
  const [pCommodity, setPCommodity] = useState(() => {
    if (typeof window !== "undefined" && window.location) {
      const params = new URLSearchParams(window.location.search);
      const rawComm = params.get("commodity");
      if (rawComm && params.get("tab") !== "arrival") {
        return resolveCommodityParam(rawComm) || "Kamatis";
      }
    }
    return "Kamatis";
  });
  const [pVariety, setPVariety] = useState(() => {
    if (typeof window !== "undefined" && window.location) {
      const params = new URLSearchParams(window.location.search);
      return params.get("variety") || null;
    }
    return null;
  });
  const [pMarket, setPMarket] = useState(() => {
    if (typeof window !== "undefined" && window.location) {
      const params = new URLSearchParams(window.location.search);
      const m = params.get("market");
      if (m) {
        if (m.toLowerCase().includes("dftc") || m.toLowerCase().includes("taboan")) {
          return "DFTC Taboan";
        }
        if (m.toLowerCase().includes("bankerohan") || m.toLowerCase().includes("bkrh")) {
          return "Bankerohan Public Market";
        }
      }
    }
    return "Bankerohan Public Market";
  });
  const [pPriceType, setPPriceType] = useState(() => {
    if (typeof window !== "undefined" && window.location) {
      const params = new URLSearchParams(window.location.search);
      const pt = params.get("price_type");
      if (pt) {
        if (pt.toLowerCase().includes("wholesale")) return "Wholesale";
        if (pt.toLowerCase().includes("retail")) return "Retail";
      }
    }
    return "Retail";
  });
  const [pDatePreset, setPDatePreset] = useState("7d");
  const [pCustomFrom, setPCustomFrom] = useState("");
  const [pCustomTo, setPCustomTo] = useState("");
  const [fHorizon, setFHorizon] = useState(7);
  const [pPage, setPPage] = useState(1);
  const [pShowAll, setPShowAll] = useState(false);

  // Arrival Volume Trend state
  const [aCommodity, setACommodity] = useState(() => {
    if (typeof window !== "undefined" && window.location) {
      const params = new URLSearchParams(window.location.search);
      const rawComm = params.get("commodity");
      if (rawComm && params.get("tab") === "arrival") {
        return resolveCommodityParam(rawComm) || "Carrots";
      }
    }
    return "Carrots";
  });
  const [aVolumeType, setAVolumeType] = useState("Combined Total");
  const [aDatePreset, setADatePreset] = useState("all");
  const [aCustomFrom, setACustomFrom] = useState("");
  const [aCustomTo, setACustomTo] = useState("");
  const [aYear, setAYear] = useState(Number(manilaTodayParts().year));
  const [aPage, setAPage] = useState(1);
  const [aShowAll, setAShowAll] = useState(false);
  const [showVolumeTypeInfo, setShowVolumeTypeInfo] = useState(false);
  const [sCommodity, setSCommodity] = useState("Kamatis");

  useEffect(() => {
    setPPage(1);
    setPShowAll(false);
  }, [pCommodity, pVariety, pMarket, pPriceType, pDatePreset, pCustomFrom, pCustomTo]);

  useEffect(() => {
    setAPage(1);
    setAShowAll(false);
  }, [aCommodity, aVolumeType, aDatePreset, aCustomFrom, aCustomTo, aYear]);

  // Live Price Queries — catalog commodity_id + persisted forecast.points
  const apiBacked = useMemo(() => isApiBackedPriceSeries(pMarket, pPriceType), [pMarket, pPriceType]);
  const pPriceTypeKey = useMemo(() => toPriceTypeKey(pMarket, pPriceType), [pMarket, pPriceType]);

  const { data: catalogData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ["dftc-trends-price-catalog"],
    queryFn: () => pricesApi.getPriceList({ is_top10: true, page_size: 100 }),
    staleTime: 60 * 1000,
  });

  const catalogPairs = useMemo(
    () => catalogPairsFromPriceList(catalogData?.items),
    [catalogData]
  );

  // Widened catalogue: every variety of a top-10 commodity, including rows
  // whose own is_top10 flag is false. Falls back to the top-10 catalogue until
  // the widened query resolves (or if it fails) so the Price tab keeps working.
  const { data: supportedCatalogData } = useQuery({
    queryKey: ["dftc-trends-price-catalog-supported"],
    queryFn: () =>
      pricesApi.getPriceList({ include_supported_varieties: true, page_size: 100 }),
    staleTime: 60 * 1000,
  });

  const priceCatalogPairs = useMemo(() => {
    const widened = catalogPairsFromPriceList(supportedCatalogData?.items);
    return widened.length > 0 ? widened : catalogPairs;
  }, [supportedCatalogData, catalogPairs]);

  // Price tab only: the analytics catalog is the supported set — commodities
  // outside it have no trend data. Fall back to the full list while the
  // catalog is still loading (or unavailable) so the control is never blank;
  // the production tab keeps PRICE_CATEGORIES and the arrival tab uses the
  // commodity catalog.
  const priceCommodityCategories = useMemo(() => {
    if (isCatalogLoading || priceCatalogPairs.length === 0) return PRICE_CATEGORIES;
    return PRICE_CATEGORIES.map((cat) => ({
      ...cat,
      commodities: cat.commodities.filter(
        (c) => catalogPairsForCommodity(priceCatalogPairs, c).length > 0
      ),
    })).filter((cat) => cat.commodities.length > 0);
  }, [priceCatalogPairs, isCatalogLoading]);

  const pAvailableVarieties = useMemo(() => {
    const priced = getAvailableVarietiesForCommodity(
      priceCatalogPairs,
      pCommodity,
      pMarket,
      pPriceType
    );
    // A variety added later has no price record yet, so the price filter drops
    // it — every variety of the commodity must stay visible and selectable.
    const every = getAvailableVarietiesForCommodity(priceCatalogPairs, pCommodity);
    const seen = new Set(
      priced.map((c) => (c.isNoVariety ? "__NO_VARIETY__" : c.value))
    );
    const extras = every.filter(
      (c) => !seen.has(c.isNoVariety ? "__NO_VARIETY__" : c.value)
    );
    return [...priced, ...extras];
  }, [priceCatalogPairs, pCommodity, pMarket, pPriceType]);

  const selectedVarietyValue = useMemo(
    () => pickDefaultVariety(pAvailableVarieties, pVariety),
    [pAvailableVarieties, pVariety]
  );

  const selectedCatalogPair = useMemo(() => {
    if (!pAvailableVarieties.length) {
      const matches = catalogPairsForCommodity(priceCatalogPairs, pCommodity);
      return matches[0] || null;
    }
    const matched = pAvailableVarieties.find((c) =>
      selectedVarietyValue === null ? c.isNoVariety : c.value === selectedVarietyValue
    );
    if (matched) {
      return (
        priceCatalogPairs.find((p) => p.commodity_id === matched.commodity_id) || {
          commodity: pCommodity,
          variety: matched.value,
          commodity_id: matched.commodity_id,
        }
      );
    }
    return catalogPairsForCommodity(priceCatalogPairs, pCommodity)[0] || null;
  }, [pAvailableVarieties, selectedVarietyValue, priceCatalogPairs, pCommodity]);

  const pCommodityId = selectedCatalogPair?.commodity_id || null;
  const seriesKey = pCommodity;
  const catalogVarietyLabel = selectedVarietyValue
    ? `${pCommodity} (${selectedVarietyValue})`
    : pCommodity;

  const { data: priceDetailData, isLoading: isPriceDetailLoading } = useQuery({
    queryKey: ["dftc-trends-price-detail", pCommodityId, pPriceTypeKey, fHorizon],
    queryFn: () =>
      pricesApi.getPriceDetail(pCommodityId, {
        price_type: pPriceTypeKey,
        horizon: fHorizon,
        records_limit: 100,
      }),
    enabled: Boolean(pCommodityId) && apiBacked,
    placeholderData: (prev) => prev,
    staleTime: 60 * 1000,
  });

  const isPricesLoading =
    isCatalogLoading ||
    (Boolean(pCommodityId) && apiBacked && isPriceDetailLoading && !priceDetailData);

  const varietyDetails = useMemo(() => {
    if (!priceDetailData) return [];
    return [{ varietyKey: seriesKey, detail: priceDetailData }];
  }, [priceDetailData, seriesKey]);

  const varieties = useMemo(() => [{ variety: seriesKey }], [seriesKey]);
  const varietyColors = useMemo(() => [HW_GREEN_SHADES[0]], []);

  const pVarietySummaries = useMemo(() => {
    const rows = buildForecastSummaries(varietyDetails);
    return rows.map((row) => ({
      ...row,
      variety: catalogVarietyLabel,
      records: (priceDetailData?.recent_records || []).length,
    }));
  }, [varietyDetails, catalogVarietyLabel, priceDetailData]);

  const formatChartDate = (iso) => {
    if (!iso) return "";
    const dObj = parseManilaDate(String(iso).slice(0, 10));
    return !dObj
      ? String(iso)
      : dObj.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Manila" });
  };

  const pChartData = useMemo(() => {
    const historical = buildHistoricalChartData(
      varietyDetails,
      pDatePreset,
      pCustomFrom,
      pCustomTo
    ).map((pt) => ({ ...pt, date: formatChartDate(pt.date) }));
    const forecast = buildForecastChartData(varietyDetails, fHorizon).map((pt) => ({
      ...pt,
      date: formatChartDate(pt.date),
    }));
    return buildUnifiedPriceTrendData(historical, forecast, {
      connectTransition: true,
      varietyKeys: [seriesKey],
    });
  }, [varietyDetails, pDatePreset, pCustomFrom, pCustomTo, seriesKey, fHorizon]);

  const pTableRows = useMemo(() => {
    const rows = buildTableRows(
      varietyDetails,
      pCommodity,
      pDatePreset,
      pCustomFrom,
      pCustomTo
    );
    const varietyLabel =
      selectedVarietyValue ||
      priceDetailData?.variety ||
      selectedCatalogPair?.variety ||
      "—";
    return rows.map((row) => ({
      date: row.date,
      commodity: pCommodity,
      variety: varietyLabel,
      category: getCommodityCategory(pCommodity),
      market: pMarket,
      price_type: pPriceType,
      uom: priceDetailData?.unit_of_measure || "kg",
      price: row.price,
    }));
  }, [
    varietyDetails,
    pCommodity,
    pDatePreset,
    pCustomFrom,
    pCustomTo,
    priceDetailData,
    selectedCatalogPair,
    pMarket,
    pPriceType,
  ]);

  const pTotalPages = Math.max(1, Math.ceil(pTableRows.length / PAGE_SIZE));
  const pPageRows = pTableRows.slice((pPage - 1) * PAGE_SIZE, pPage * PAGE_SIZE);

  // Live Arrival Volume Query
  // The arrival tab covers every commodity, not only the top-10 ones, so the
  // scope comes from the DFTC commodity catalog. The top-10 price catalog
  // cannot resolve a commodity that has no top-10 row.
  const { data: commodityCatalog, isLoading: isCommodityCatalogLoading } = useQuery({
    queryKey: ["dftc-trends-commodity-catalog"],
    queryFn: () => dftcApi.getCommodityCatalog(),
    staleTime: 60 * 1000,
  });

  const arrivalCommodityCategories = useMemo(() => {
    const items = commodityCatalog?.items || [];
    if (!items.length) return PRICE_CATEGORIES;
    const byCategory = new Map();
    items.forEach((item) => {
      const name = item?.name;
      if (!name) return;
      const category = item.category || "Others";
      if (!byCategory.has(category)) byCategory.set(category, new Set());
      byCategory.get(category).add(name);
    });
    return [...byCategory.entries()].map(([category, names]) => ({
      id: toId(category),
      name: category,
      commodities: [...names].sort((a, b) => a.localeCompare(b)),
    }));
  }, [commodityCatalog]);

  // When commodity catalog loads, if aCommodity was initialized as an ID (e.g. COM-0051), resolve to name
  useEffect(() => {
    if (!commodityCatalog?.items?.length || !aCommodity) return;
    const match = commodityCatalog.items.find(
      (item) => item?.id === aCommodity || item?.commodity_id === aCommodity
    );
    if (match && match.name && match.name !== aCommodity) {
      setACommodity(match.name);
    }
  }, [commodityCatalog, aCommodity]);

  // When price catalog loads, if pCommodity was initialized as an ID, resolve to name
  useEffect(() => {
    if (!priceCatalogPairs?.length || !pCommodity) return;
    const match = priceCatalogPairs.find(
      (pair) => pair?.commodity_id === pCommodity
    );
    if (match && match.commodity && match.commodity !== pCommodity) {
      setPCommodity(match.commodity);
    }
  }, [priceCatalogPairs, pCommodity]);

  const aCommodityId = useMemo(() => {
    const target = normalizeCommodityLabel(aCommodity);
    const row = (commodityCatalog?.items || []).find(
      (item) => normalizeCommodityLabel(item?.name) === target
    );
    // No catalog row — the endpoint resolves an exact commodity name too.
    return row?.id || aCommodity;
  }, [commodityCatalog, aCommodity]);

  const {
    data: arrivalQueryData,
    isLoading: isArrivalLoading,
    isError: isArrivalError,
  } = useQuery({
    queryKey: ["dftc-trends-arrivals", aCommodityId],
    queryFn: () =>
      analyticsApi.getArrivalPressure(aCommodityId, null, null, {
        aggregateVarieties: true,
      }),
    enabled:
      activeTab === "arrival" &&
      Boolean(aCommodityId) &&
      // Wait for the catalog: before it resolves the id is the raw commodity
      // name, which the endpoint cannot resolve for a name that only exists
      // per variety — the request would 404 and flash an error banner.
      !isCommodityCatalogLoading,
    staleTime: 60 * 1000,
  });

  // Use the full arrival history (all years on record) rather than the 90-day
  // analysis window. `records` is windowed so the classification and its totals
  // describe that span; `history_records` is unfiltered and is what the trend
  // chart and year selector need. Without this the tab silently shows the
  // window's fallback (most-recent records) under any year the window does not
  // cover — e.g. selecting 2026 when 2026 has no data renders 2025 figures.
  const rawArrivalRecords = useMemo(() => {
    return Array.isArray(arrivalQueryData?.history_records)
      ? arrivalQueryData.history_records
      : Array.isArray(arrivalQueryData?.records)
        ? arrivalQueryData.records
        : [];
  }, [arrivalQueryData]);

  const arrivalYears = useMemo(() => {
    return [...new Set(rawArrivalRecords.map((record) => {
      const year = Number.parseInt(String(record.arrival_date || record.date || "").slice(0, 4), 10);
      return Number.isFinite(year) ? year : null;
    }).filter((year) => year != null))].sort((a, b) => b - a);
  }, [rawArrivalRecords]);

  useEffect(() => {
    if (arrivalYears.length > 0 && !arrivalYears.includes(aYear)) {
      setAYear(arrivalYears[0]);
    }
  }, [arrivalYears, aYear]);

  const filteredArrivalRecords = useMemo(() => {
    let startDate = null;
    let endDate = null;
      const today = parseManilaDate(`${manilaTodayParts().year}-${manilaTodayParts().month}-${manilaTodayParts().day}`);
    if (["2m", "3m", "6m"].includes(aDatePreset)) {
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - Number(aDatePreset.slice(0, -1)));
    } else if (aDatePreset === "custom") {
      startDate = aCustomFrom ? new Date(`${aCustomFrom.slice(0, 10)}T00:00:00`) : null;
      endDate = aCustomTo ? new Date(`${aCustomTo.slice(0, 10)}T23:59:59`) : null;
    }
    return rawArrivalRecords.filter((record) => {
      const recordDate = parseManilaDate(String(record.arrival_date || "").slice(0, 10));
      if (!recordDate) return false;
      if (!startDate && !endDate && aYear != null && recordDate.getFullYear() !== aYear) {
        return false;
      }
      return (!startDate || recordDate >= startDate) && (!endDate || recordDate <= endDate);
    });
  }, [rawArrivalRecords, aDatePreset, aCustomFrom, aCustomTo, aYear]);

  const aVarietyKeys = useMemo(() => [aCommodity], [aCommodity]);

  const aChartData = useMemo(() => {
    if (!filteredArrivalRecords.length) return [];
    const grouped = new Map();
    filteredArrivalRecords.forEach((r) => {
      const dStr = r.arrival_date || r.date;
      if (!dStr) return;
      const dateKey = String(dStr).slice(0, 10);
      const val = aVolumeType === "Farm Source"
        ? r.farm_source_volume_kg
        : aVolumeType === "Other Source"
        ? r.other_source_volume_kg
        : r.volume_kg;
      if (val == null) return;

      grouped.set(dateKey, (grouped.get(dateKey) || 0) + Number(val));
    });

    return [...grouped.entries()]
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, val]) => {
      const dObj = parseManilaDate(date);
        const month = !dObj
          ? date
          : dObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
        return { month, [aCommodity]: val };
      });
  }, [filteredArrivalRecords, aVolumeType, aCommodity]);

  const aSourcesBreakdown = useMemo(() => {
    const totalFarm = Number(arrivalQueryData?.source_breakdown?.farm_source_volume_kg || 0);
    const totalOther = Number(arrivalQueryData?.source_breakdown?.other_source_volume_kg || 0);
    const combined = totalFarm + totalOther;
    if (combined === 0) return [];
    const farmPct = Math.round((totalFarm / combined) * 100);
    const otherPct = 100 - farmPct;
    return [
      { name: "Farm Source", value: farmPct, volumeKg: totalFarm, color: "#15803d" },
      { name: "Other Sources", value: otherPct, volumeKg: totalOther, color: "#f59e0b" }
    ];
  }, [arrivalQueryData]);

  const aVarietySummaries = useMemo(() => {
    if (!rawArrivalRecords.length) return [];
    const farm = arrivalQueryData?.source_breakdown?.farm_source_volume_kg ?? null;
    const other = arrivalQueryData?.source_breakdown?.other_source_volume_kg ?? null;
    const combined = arrivalQueryData?.current_arrival_kg ?? null;
    return [{
      variety: aCommodity,
      farm,
      other,
      combined,
      records: rawArrivalRecords.length
    }];
  }, [arrivalQueryData, aCommodity]);

  const aTableRows = useMemo(() => {
    return filteredArrivalRecords.map((r) => {
      const dStr = r.arrival_date || r.date;
      const dObj = parseManilaDate(dStr);
      const monthLabel = !dObj ? dStr : dObj.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "Asia/Manila" });
      const farm = r.farm_source_volume_kg ?? null;
      const other = r.other_source_volume_kg ?? null;
      const combined = r.volume_kg ?? (farm != null || other != null ? (farm || 0) + (other || 0) : null);
      const computed = (farm || 0) + (other || 0);
      const inconsistent = r.volume_kg != null && farm != null && other != null && r.volume_kg !== computed;

      return {
        month: monthLabel,
        variety: r.variety || "—",
        farm,
        other,
        combined,
        inconsistent
      };
    });
  }, [filteredArrivalRecords]);

  const aTotalPages = Math.max(1, Math.ceil(aTableRows.length / PAGE_SIZE));
  const aPageRows = aTableRows.slice((aPage - 1) * PAGE_SIZE, aPage * PAGE_SIZE);
  const aPeriodLabel = aDatePreset === "all"
    ? arrivalQueryData?.data_is_stale
      ? "Historical fallback records"
      : `${arrivalQueryData?.lookback_days ?? 90}-day window`
    : getPeriodLabel(aDatePreset, aCustomFrom, aCustomTo);

  function priceSummaryRows(items, renderValue, showAll, setShowAll) {
    if (!items || items.length === 0) {
      return (
        <div className="py-0.5">
          <span className="text-[13px] font-bold text-[var(--hw-neutral-400)]">—</span>
        </div>
      );
    }
    const visible = items.slice(0, showAll ? undefined : 3);
    return (
      <div className="space-y-1.5">
        {visible.map((v) => (
          <div key={v.variety} className="flex items-center justify-between py-0.5 gap-2">
            <span className="text-[12px] font-medium text-[var(--hw-neutral-700)] truncate">{v.variety}</span>
            <span className="shrink-0">{renderValue(v)}</span>
          </div>
        ))}
        {items.length > 3 && (
          <button onClick={() => setShowAll((s) => !s)} className="text-[11px] text-[var(--hw-green-700)] font-medium hover:underline mt-1 cursor-pointer">
            {showAll ? "Show fewer" : `View all ${items.length} varieties`}
          </button>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Price Trends Tab Content
  // ─────────────────────────────────────────────────────────────────────────────
  const priceTrendsTab = (
    <div className="space-y-6">
      {/* 1. Filters */}
      <div className={`${cardCls} p-3 sm:p-4 md:p-5`}>
        <h2 className="text-[11px] sm:text-[12px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wider mb-2 sm:mb-2.5">Filters</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          <div>
            <label className={labelCls}>Commodity</label>
            <SearchableCombobox
              categories={priceCommodityCategories}
              value={pCommodity}
              onChange={(c) => {
                setPCommodity(c);
                setPVariety(null);
              }}
            />
          </div>
          <div>
            <label className={labelCls}>Variety</label>
            <div className="relative">
              <select
                value={selectedVarietyValue === null ? "__NO_VARIETY__" : (selectedVarietyValue || "")}
                onChange={(e) => setPVariety(e.target.value === "__NO_VARIETY__" ? null : e.target.value)}
                className={selectCls + " appearance-none pr-7 sm:pr-8 cursor-pointer"}
                disabled={pAvailableVarieties.length === 0}
              >
                {pAvailableVarieties.map((choice) => (
                  <option
                    key={choice.isNoVariety ? "__NO_VARIETY__" : choice.value}
                    value={choice.isNoVariety ? "__NO_VARIETY__" : choice.value}
                  >
                    {choice.isNoVariety ? "No variety" : choice.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-500)] pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Market</label>
            <div className="relative">
              <select value={pMarket} onChange={(e) => setPMarket(e.target.value)} className={selectCls + " appearance-none pr-7 sm:pr-8 cursor-pointer"}>
                <option>Bankerohan Public Market</option>
                <option>DFTC Taboan</option>
              </select>
              <ChevronDown size={13} className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-500)] pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Price Type</label>
            <div className="relative">
              <select value={pPriceType} onChange={(e) => setPPriceType(e.target.value)} className={selectCls + " appearance-none pr-7 sm:pr-8 cursor-pointer"}>
                <option>Retail</option>
                <option>Wholesale</option>
              </select>
              <ChevronDown size={13} className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-500)] pointer-events-none" />
            </div>
          </div>
        </div>

      </div>

      {/* 2. Single Unified Price Trend Chart Card */}
      {isPricesLoading ? (
        <ChartCardSkeleton height={380} />
      ) : (
        <div className={`${cardCls} p-3 sm:p-4 md:p-6 lg:p-8 space-y-3 sm:space-y-4`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 sm:pb-3 border-b border-[var(--hw-neutral-100)]">
            <div>
              <h3 className="text-[14px] sm:text-[15px] font-bold text-black">Price Trend</h3>
              <p className="text-[11.5px] sm:text-[12px] text-[var(--hw-neutral-500)] mt-0.5 leading-snug">
                {pMarket} · {pPriceType} · {catalogVarietyLabel} · Next {fHorizon} days price outlook · ₱/kg
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                <span className="text-[11px] sm:text-[12px] font-medium text-black whitespace-nowrap">Historical Range</span>
                <HistoricalRangeSelect
                  preset={pDatePreset}
                  customFrom={pCustomFrom}
                  customTo={pCustomTo}
                  onChange={(p, from, to) => {
                    setPDatePreset(p);
                    if (from !== undefined) setPCustomFrom(from);
                    if (to !== undefined) setPCustomTo(to);
                  }}
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                <span className="text-[11px] sm:text-[12px] font-medium text-black whitespace-nowrap">Forecast Horizon</span>
                <ForecastHorizonSelect value={fHorizon} onChange={setFHorizon} />
              </div>
            </div>
          </div>

          {pChartData.length > 0 ? (
            <ForecastPriceTrendChart
              commodity={pCommodity}
              variety={selectedVarietyValue}
              chartData={pChartData}
              varieties={varieties}
              colors={varietyColors}
              height={isMobile ? 280 : 380}
              actualLabel="Actual price"
              forecastLabel="Forecast"
              forecastRangeLabel="Forecast range"
              forecastBoundaryLabel="Forecast starts"
            />
          ) : (
            <div className="py-12 sm:py-16 text-center flex flex-col items-center justify-center">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[var(--hw-neutral-100)] flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--hw-neutral-400)]" />
              </div>
              <p className="text-[13.5px] sm:text-[14px] font-semibold text-[var(--hw-neutral-800)]">No price trend data available</p>
              <p className="text-[11.5px] sm:text-[12px] text-[var(--hw-neutral-500)] max-w-xs mt-1">
                No price records found for {pCommodity} ({pPriceType}) in {pMarket} within the selected period.
              </p>
            </div>
          )}

          {/* Price Summary Metrics Tiles (Farmer View Basis style, inside chart card) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 pt-3 border-t border-[var(--hw-neutral-100)]">
            {[
              {
                title: "Recent Average Price",
                renderVal: (v) => (
                  <span className="text-[13px] sm:text-[14px] md:text-[15px] font-bold text-black">
                    {v.recentAvg != null ? `₱${v.recentAvg.toFixed(2)}/kg` : "—"}
                  </span>
                )
              },
              {
                title: "Lower Forecast",
                renderVal: (v) => (
                  <span className="text-[13px] sm:text-[14px] md:text-[15px] font-bold text-amber-700">
                    {v.lo != null ? `₱${v.lo.toFixed(2)}/kg` : "—"}
                  </span>
                )
              },
              {
                title: "Forecast Midpoint",
                renderVal: (v) => (
                  <span className="text-[13px] sm:text-[14px] md:text-[15px] font-bold text-black">
                    {v.avgMid != null ? `₱${v.avgMid.toFixed(2)}/kg` : "—"}
                  </span>
                )
              },
              {
                title: "Upper Forecast",
                renderVal: (v) => (
                  <span className="text-[13px] sm:text-[14px] md:text-[15px] font-bold text-emerald-700">
                    {v.hi != null ? `₱${v.hi.toFixed(2)}/kg` : "—"}
                  </span>
                )
              },
              {
                title: "Forecast Price Change",
                colSpan: "col-span-2 sm:col-span-1",
                renderVal: (v) => {
                  if (v.change == null || !Number.isFinite(v.change)) {
                    return (
                      <span className="text-[13px] sm:text-[14px] md:text-[15px] font-bold text-[var(--hw-neutral-500)]">
                        —
                      </span>
                    );
                  }
                  const rounded = Math.abs(v.change).toFixed(1);
                  const isZero = Number(rounded) === 0;
                  const isPositive = v.change > 0 && !isZero;
                  const isNegative = v.change < 0 && !isZero;

                  return (
                    <span
                      className={`text-[13px] sm:text-[14px] md:text-[15px] font-bold ${
                        isPositive
                          ? "text-emerald-700"
                          : isNegative
                          ? "text-rose-600"
                          : "text-black"
                      }`}
                    >
                      {isPositive ? "↑ " : isNegative ? "↓ " : ""}{rounded}%
                    </span>
                  );
                }
              }
            ].map(({ title, colSpan, renderVal }) => (
              <div
                key={title}
                className={`bg-[var(--hw-neutral-50)] rounded-xl p-2.5 sm:p-3 flex flex-col justify-between min-w-0 border border-[var(--hw-neutral-100)] ${colSpan || ""}`}
              >
                <p className="text-[10px] sm:text-[11px] font-semibold text-black uppercase tracking-wide mb-1 leading-tight line-clamp-2">
                  {title}
                </p>
                <div>{priceSummaryRows(pVarietySummaries, renderVal, pShowAll, setPShowAll)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Average Price Section — Informational context only */}
      <HistoricalAveragePriceSection
        commodityId={pCommodityId}
        commodityName={pCommodity}
        variety={selectedVarietyValue}
        market={pMarket}
        priceType={pPriceType}
        priceTypeKey={pPriceTypeKey}
      />

      {/* 4. Recent Price Records Table */}

      <div className="space-y-2.5 sm:space-y-3">
        <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--hw-neutral-900)]">Recent Price Records</h3>
        {isPricesLoading ? (
          <TableSkeleton cols={8} rows={5} />
        ) : (
          <div className={`${cardCls} overflow-hidden`}>
            <div className="overflow-x-auto [scrollbar-width:thin] touch-pan-x">
              <table className="w-full min-w-[620px] text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]">
                    {["Date", "Commodity", "Variety", "Category", "Market", "Price Type", "UOM", "Price"].map((h) => (
                      <th key={h} className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {pPageRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-[var(--hw-neutral-500)]">
                        No price records for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    pPageRows.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--hw-neutral-800)] whitespace-nowrap font-medium">{row.date}</td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--hw-neutral-900)] font-semibold whitespace-nowrap">{pCommodity}</td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--hw-neutral-700)] whitespace-nowrap">{row.variety || "—"}</td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--hw-neutral-600)] whitespace-nowrap">{getCommodityCategory(pCommodity)}</td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--hw-neutral-700)] whitespace-nowrap">{pMarket}</td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--hw-neutral-700)] whitespace-nowrap">{pPriceType}</td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--hw-neutral-600)] whitespace-nowrap">kg</td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-[var(--hw-neutral-900)] whitespace-nowrap">
                          {row.price != null ? `₱${row.price.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {pPageRows.length > 0 && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2">
                <Pagination page={pPage} totalPages={pTotalPages} totalRows={pTableRows.length} onPage={setPPage} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Arrival Volume Trends Tab Content
  // ─────────────────────────────────────────────────────────────────────────────
  const arrivalTrendsTab = (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Filters */}
      <div className={`${cardCls} p-3 sm:p-4 md:p-5`}>
        <h2 className="text-[11px] sm:text-[12px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wider mb-2 sm:mb-2.5">Filters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Commodity</label>
            <SearchableCombobox categories={arrivalCommodityCategories} value={aCommodity} onChange={setACommodity} />
          </div>
          <div className="col-span-1">
            <label className="flex items-center gap-1 text-[11px] sm:text-[12px] font-semibold text-[var(--hw-neutral-700)] mb-1">
              <span className="truncate">Arrival Type</span>
              <div className="relative inline-block shrink-0">
                <button
                  type="button"
                  onMouseEnter={() => setShowVolumeTypeInfo(true)}
                  onMouseLeave={() => setShowVolumeTypeInfo(false)}
                  className="text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-700)] cursor-pointer"
                >
                  <Info size={12} />
                </button>
                {showVolumeTypeInfo && (
                  <div className="absolute left-0 top-6 z-50 w-64 bg-[var(--hw-neutral-900)] text-white border border-[var(--hw-neutral-800)] rounded-xl shadow-xl p-3 text-[11px] space-y-1.5 pointer-events-none">
                    <div>
                      <span className="font-semibold text-[var(--hw-green-400)]">Combined Total</span> — Total DFTC reported volume (Farm + Other Source).
                    </div>
                    <div>
                      <span className="font-semibold text-[var(--hw-green-400)]">Farm Source</span> — Volume from registered local farm producers.
                    </div>
                    <div>
                      <span className="font-semibold text-[var(--hw-green-400)]">Other Source</span> — Volume from traders or intermediaries.
                    </div>
                  </div>
                )}
              </div>
            </label>
            <div className="relative">
              <select value={aVolumeType} onChange={(e) => setAVolumeType(e.target.value)} className={selectCls + " appearance-none pr-7 sm:pr-8 cursor-pointer"}>
                <option>Combined Total</option>
                <option>Farm Source</option>
                <option>Other Source</option>
              </select>
              <ChevronDown size={13} className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-500)] pointer-events-none" />
            </div>
          </div>
          <div className="col-span-1">
            <label className={labelCls}>Period</label>
            <PeriodSelect
              preset={aDatePreset}
              customFrom={aCustomFrom}
              customTo={aCustomTo}
              onChange={(p, from, to) => {
                setADatePreset(p);
                if (from !== undefined) setACustomFrom(from);
                if (to !== undefined) setACustomTo(to);
              }}
            />
          </div>
          <div>
            <label className={labelCls}>Year</label>
            <div className="relative">
              <select
                value={aYear}
                onChange={(e) => setAYear(Number(e.target.value))}
                className={selectCls + " appearance-none pr-9 cursor-pointer"}
              >
                {(() => {
                  return arrivalYears.length > 0 ? arrivalYears : [Number(manilaTodayParts().year)];
                })().map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-500)] pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {isArrivalError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 sm:p-4 text-xs sm:text-sm text-red-700">
          Arrival analytics could not be loaded. Please try again later.
        </div>
      )}

      {/* Arrival Pressure Classification Banner (Farmer View Basis style, above charts) */}
      {arrivalQueryData?.classification && (
        <div className="flex items-start sm:items-center justify-between gap-3 px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white shadow-[var(--shadow-xs)]">
          <div className="flex items-start sm:items-center gap-3">
            <BarChart3 className="w-5 h-5 text-[var(--hw-green-700)] flex-shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-[11px] sm:text-[12px] font-bold text-black uppercase tracking-wider">
                Arrival Pressure Classification
              </p>
              <div className={`mt-0.5 text-[15px] sm:text-base font-bold ${getClassificationTextColor(arrivalQueryData.classification)}`}>
                {arrivalQueryData.classification}
                {arrivalQueryData.data_is_stale && (
                  <span className="ml-2 text-[11px] sm:text-xs font-medium text-amber-700">(Historical data)</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Visualizations with integrated summary cards */}
      {isArrivalLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 items-stretch">
          <ChartCardSkeleton height={300} />
          <ChartCardSkeleton height={300} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 items-stretch">
          {/* Card 1: Arrival Volume Trend Bar Chart */}
          <div className={`${cardCls} p-3.5 sm:p-5 md:p-6 lg:p-8 flex flex-col justify-between space-y-3`}>
            <div>
              <h3 className="text-[14px] sm:text-[15px] font-bold text-[var(--hw-neutral-900)] mb-0.5">Arrival Volume Trend</h3>
              <p className="text-[11.5px] sm:text-[12px] text-[var(--hw-neutral-500)] mb-3 sm:mb-4">
                {aCommodity} · {aVolumeType} · {aPeriodLabel} · kg
              </p>
            </div>

            {aChartData.length === 0 ? (
              <div className="w-full flex-1 flex flex-col justify-center items-center py-12 sm:py-16 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[var(--hw-neutral-100)] flex items-center justify-center mb-3">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--hw-neutral-400)]" />
                </div>
                <p className="text-[13px] sm:text-[14px] font-semibold text-[var(--hw-neutral-800)]">No arrival volume data available</p>
                <p className="text-[11.5px] sm:text-[12px] text-[var(--hw-neutral-500)] max-w-xs mt-1">
                  {arrivalQueryData?.message || `No arrival-volume records for ${aCommodity} within the selected date range.`}
                </p>
              </div>
            ) : (
              <ArrivalVolumeTrendChart
                commodity={aCommodity}
                chartData={aChartData}
                varietyKeys={aVarietyKeys}
                sourceType={aVolumeType}
                height={isMobile ? 250 : 300}
                quartileThresholds={arrivalQueryData?.quartile_thresholds}
              />
            )}

            {/* In-card summary stat tiles (Farmer View Basis style) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 pt-3 border-t border-[var(--hw-neutral-100)] mt-auto">
              <div className="flex sm:flex-col items-center sm:items-start justify-between rounded-xl bg-[var(--hw-neutral-50)] px-3 py-2.5 sm:p-3 border border-[var(--hw-neutral-100)]">
                <p className="text-[12px] sm:text-[11px] font-semibold uppercase tracking-tight text-black leading-tight">
                  Latest Arrival Volume
                </p>
                <p className="text-[13px] sm:text-[14px] md:text-[15px] font-bold text-black leading-tight">
                  {arrivalQueryData?.current_arrival_kg != null
                    ? `${Number(arrivalQueryData.current_arrival_kg).toLocaleString("en-US", { maximumFractionDigits: 1 })} kg`
                    : "—"}
                </p>
              </div>
              <div className="flex sm:flex-col items-center sm:items-start justify-between rounded-xl bg-[var(--hw-neutral-50)] px-3 py-2.5 sm:p-3 border border-[var(--hw-neutral-100)]">
                <p className="text-[12px] sm:text-[11px] font-semibold uppercase tracking-tight text-black leading-tight">
                  Historical Average Arrival
                </p>
                <p className="text-[13px] sm:text-[14px] md:text-[15px] font-bold text-black leading-tight">
                  {arrivalQueryData?.average_arrival_kg != null
                    ? `${Number(arrivalQueryData.average_arrival_kg).toLocaleString("en-US", { maximumFractionDigits: 2 })} kg`
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Arrival Volume Sources Distribution Pie Chart */}
          <div className={`${cardCls} p-3.5 sm:p-5 md:p-6 lg:p-8 flex flex-col justify-between space-y-3`}>
            <div>
              <h3 className="text-[14px] sm:text-[15px] font-bold text-[var(--hw-neutral-900)] mb-0.5">Arrival Volume Sources Distribution</h3>
              <p className="text-[11.5px] sm:text-[12px] text-[var(--hw-neutral-500)] mb-3 sm:mb-4">
                Arrival volume breakdown by origin (Farm Source vs Other Sources).
              </p>
            </div>

            <div className="w-full flex-1 flex flex-col justify-center">
              {aSourcesBreakdown.length > 0 ? (
                <ArrivalSourcePieChart
                  data={aSourcesBreakdown}
                  height={isMobile ? 250 : 300}
                />
              ) : (
                <p className="py-12 sm:py-16 text-center text-xs sm:text-sm text-[var(--hw-neutral-500)]">
                  No arrival source data available.
                </p>
              )}
            </div>

            {/* In-card summary stat tiles (Farmer View Basis style) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 pt-3 border-t border-[var(--hw-neutral-100)] mt-auto">
              <div className="flex sm:flex-col items-center sm:items-start justify-between rounded-xl bg-[var(--hw-neutral-50)] px-3 py-2.5 sm:p-3 border border-[var(--hw-neutral-100)]">
                <p className="text-[12px] sm:text-[11px] font-semibold uppercase tracking-tight text-black leading-tight">
                  Arrival Farm Total
                </p>
                <p className="text-[13px] sm:text-[14px] md:text-[15px] font-bold text-[var(--hw-green-700)] leading-tight">
                  {arrivalQueryData?.source_breakdown?.farm_source_volume_kg != null
                    ? `${Number(arrivalQueryData.source_breakdown.farm_source_volume_kg).toLocaleString("en-US", { maximumFractionDigits: 1 })} kg`
                    : "—"}
                </p>
              </div>
              <div className="flex sm:flex-col items-center sm:items-start justify-between rounded-xl bg-[var(--hw-neutral-50)] px-3 py-2.5 sm:p-3 border border-[var(--hw-neutral-100)]">
                <p className="text-[12px] sm:text-[11px] font-semibold uppercase tracking-tight text-black leading-tight">
                  Arrival Other Total
                </p>
                <p className="text-[13px] sm:text-[14px] md:text-[15px] font-bold text-amber-700 leading-tight">
                  {arrivalQueryData?.source_breakdown?.other_source_volume_kg != null
                    ? `${Number(arrivalQueryData.source_breakdown.other_source_volume_kg).toLocaleString("en-US", { maximumFractionDigits: 1 })} kg`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Recent Arrival Volume Records Table */}
      <div className="space-y-2.5 sm:space-y-3">
        <h3 className="text-[13px] sm:text-[14px] font-bold text-[var(--hw-neutral-900)]">Recent Arrival Volume Records</h3>
        {isArrivalLoading ? (
          <TableSkeleton cols={7} rows={5} />
        ) : (
          <div className={`${cardCls} overflow-hidden`}>
            <div className="overflow-x-auto [scrollbar-width:thin] touch-pan-x">
              <table className="w-full min-w-[620px] text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]">
                    {["Period / Month", "Commodity", "Variety", "Farm Source", "Other Source", "Combined Total", "Unit"].map((h) => (
                      <th key={h} className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {aPageRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 sm:py-12 text-center text-[12px] sm:text-[13px] text-[var(--hw-neutral-500)]">
                        No arrival-volume records for the selected commodity and date range.
                      </td>
                    </tr>
                  ) : (
                    aPageRows.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--hw-neutral-800)] whitespace-nowrap font-medium">{row.month}</td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--hw-neutral-900)] font-semibold whitespace-nowrap">{aCommodity}</td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--hw-neutral-700)] whitespace-nowrap">{row.variety || "—"}</td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--hw-green-700)] font-medium whitespace-nowrap">{formatVol(row.farm)}</td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-amber-700 font-medium whitespace-nowrap">{formatVol(row.other)}</td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold ${row.inconsistent ? "text-amber-700" : "text-[var(--hw-neutral-900)]"}`}>
                              {formatVol(row.combined)}
                            </span>
                            {row.inconsistent && (
                              <div className="relative inline-block group/tip">
                                <AlertCircle size={14} className="text-amber-500 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tip:block z-50 w-60 bg-[var(--hw-neutral-900)] text-white text-[11px] rounded-xl px-3 py-2 shadow-xl pointer-events-none">
                                  Combined Total does not match Farm Source plus Other Source. Review the source record.
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--hw-neutral-600)] whitespace-nowrap">kg</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {aPageRows.length > 0 && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2">
                <Pagination page={aPage} totalPages={aTotalPages} totalRows={aTableRows.length} onPage={setAPage} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--hw-neutral-50)]">
      <div className="max-w-[1440px] mx-auto px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-3 sm:py-5 pb-24 md:pb-8">
        <PageHeader
          title="Market Trends"
          description="Explore price, arrival-volume, and seasonal-production trends at DFTC markets."
          className="mb-4 sm:mb-6"
        />
        <div className={`${cardCls} mb-4 sm:mb-6 overflow-hidden`}>
          <TabNav tab={activeTab} onChange={handleTabChange} />
        </div>
        {activeTab === "price"
          ? priceTrendsTab
          : activeTab === "arrival"
            ? arrivalTrendsTab
            : (
              <SeasonalProductionTrends
                commodity={sCommodity}
                commodityId={findCommodityId(catalogPairs, sCommodity, "") || sCommodity}
                categories={TOP10_COMMODITY_CATEGORIES}
                onCommodityChange={setSCommodity}
              />
            )}

        {/* ── Alert Commodities Modal ── */}
        {activeAlertModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={closeAlertModal}
          >
            <div
              className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-3.5 sm:py-5 border-b border-[var(--hw-neutral-100)] flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${
                        activeAlertModal === "volatility"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      <AlertCircle className="w-4 h-4" />
                    </span>
                    <h3 className="text-[15px] sm:text-[17px] font-bold text-[var(--hw-neutral-900)]">
                      {activeAlertModal === "volatility"
                        ? "Price Volatility Alerts"
                        : "High Arrival Commodities"}
                    </h3>
                  </div>
                  <p className="text-[12px] sm:text-[13px] text-[var(--hw-neutral-600)]">
                    {activeAlertModal === "volatility"
                      ? "Check the trend for these commodities experiencing sharp price swings (>10%)."
                      : "Check the trend for these commodities currently with high arrival volume (≥Q3)."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAlertModal}
                  className="p-1 rounded-lg text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-100)] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal List Body */}
              <div className="p-4 max-h-[360px] overflow-y-auto divide-y divide-[var(--hw-neutral-100)]">
                {isHomeLoading ? (
                  <div className="py-8 text-center text-[13px] text-[var(--hw-neutral-500)] animate-pulse">
                    Loading alert commodities…
                  </div>
                ) : alertCommoditiesList.length === 0 ? (
                  <div className="py-8 text-center text-[13px] text-[var(--hw-neutral-500)]">
                    No commodities found for this alert.
                  </div>
                ) : (
                  alertCommoditiesList.map((comm) => {
                    const commName = comm.crop_name || comm.name || comm.commodity_name;
                    return (
                      <button
                        key={comm.commodity_id || commName}
                        type="button"
                        onClick={() => selectAlertCommodity(commName)}
                        className="w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left cursor-default"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CommodityIllustration
                            commodityId={comm.commodity_id}
                            commodityName={commName}
                            className="w-9 h-9 shrink-0 object-contain rounded-lg bg-[var(--hw-neutral-50)] p-1 border border-[var(--hw-neutral-100)]"
                          />
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)] truncate">
                              {commName}
                              {comm.variety ? ` · ${comm.variety}` : ""}
                            </p>
                            <p className="text-[12px] text-[var(--hw-neutral-500)] truncate">
                              {activeAlertModal === "volatility"
                                ? `${comm.market || "Davao Market"} · ${comm.price_type || "Retail"}`
                                : "High Arrival Pressure (≥Q3)"}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          {activeAlertModal === "volatility" ? (
                            <>
                              {comm.current_price != null && (
                                <p className="text-[13px] font-bold text-[var(--hw-neutral-900)]">
                                  ₱{Number(comm.current_price).toFixed(2)}/{comm.unit || "kg"}
                                </p>
                              )}
                              <p
                                className={`text-[12px] font-bold ${
                                  comm.direction === "down"
                                    ? "text-rose-600"
                                    : "text-emerald-700"
                                }`}
                              >
                                {comm.change_pct != null
                                  ? `${comm.direction === "down" ? "↓" : "↑"} ${Math.abs(
                                      comm.change_pct
                                    )}%`
                                  : "Volatile"}
                              </p>
                            </>
                          ) : (
                            comm.volume_kg != null && (
                              <p className="text-[13px] font-bold text-[var(--hw-neutral-900)]">
                                {Number(comm.volume_kg).toLocaleString("en-US")} kg
                              </p>
                            )
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-[var(--hw-neutral-50)] border-t border-[var(--hw-neutral-100)] flex items-center justify-end">
                <button
                  type="button"
                  onClick={closeAlertModal}
                  className="px-4 py-2 text-[13px] font-semibold text-[var(--hw-neutral-700)] bg-white border border-[var(--hw-neutral-200)] rounded-xl hover:bg-[var(--hw-neutral-100)] transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { DFTCTrends as default };
