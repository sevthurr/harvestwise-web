import { COMMODITY_CATEGORIES, getCategoryFor } from "../../global/data/commodities";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, Search, X, Leaf, Info, AlertCircle } from "lucide-react";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { CurrentPriceTrendChart } from "../../global/components/shared/CurrentPriceTrendChart";
import { ForecastPriceTrendChart } from "../../global/components/shared/ForecastPriceTrendChart";
import { ArrivalVolumeTrendChart } from "../../global/components/shared/ArrivalVolumeTrendChart";
import {
  HW_GREEN_SHADES,
  HW_COMMODITIES,
  HW_NAME_TO_ID,
  ALL_DATES,
  FORECAST_DATE_POOL,
  ARRIVAL_ALL_MONTHS,
  getCommodityVarietyList,
  getVarietyPrices,
  getVarietyForecast,
  getArrivalSeries,
  buildArrivalChartData,
  getPresetDates,
  formatVol
} from "../../global/components/shared/trendChartData";
function toId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
const PRICE_CATEGORIES = COMMODITY_CATEGORIES.map((cat) => ({
  id: toId(cat.category),
  name: cat.category,
  commodities: cat.items.map((i) => i.name)
}));
function getArrivalMonthsForDatePreset(preset, customFrom, customTo) {
  if (preset === "7d") return ARRIVAL_ALL_MONTHS.slice(-2);
  if (preset === "14d") return ARRIVAL_ALL_MONTHS.slice(-3);
  if (preset === "21d") return ARRIVAL_ALL_MONTHS.slice(-5);
  if (preset === "28d") return ARRIVAL_ALL_MONTHS;
  if (preset === "custom" && customFrom && customTo) {
    const getMonthIdx = (iso) => {
      const parts = iso.split("-");
      return parts.length >= 2 ? parseInt(parts[1]) - 1 : -1;
    };
    const fromIdx = getMonthIdx(customFrom);
    const toIdx = getMonthIdx(customTo);
    if (fromIdx >= 0 && toIdx >= fromIdx) {
      return ARRIVAL_ALL_MONTHS.filter((_, i) => i >= fromIdx && i <= toIdx);
    }
  }
  return ARRIVAL_ALL_MONTHS;
}
function getCommodityCategory(name) {
  return getCategoryFor(name) ?? "\u2014";
}
function getDateLabel(preset, customFrom, customTo) {
  if (preset === "7d") return "Last 7 days";
  if (preset === "14d") return "Last 14 days";
  if (preset === "21d") return "Last 21 days";
  if (preset === "28d") return "Last 28 days";
  if (customFrom && customTo) return formatCustomDateLabel(customFrom, customTo);
  return "Custom";
}
function formatCustomDateLabel(from, to) {
  if (!from || !to) return "Custom";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmt = (d) => {
    const parts = d.split("-");
    if (parts.length !== 3) return d;
    return `${months[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}`;
  };
  return `${fmt(from)}\u2013${fmt(to)}, 2026`;
}
const cardCls = "bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)]";
const labelCls = "block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1";
const selectCls = "w-full px-3 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)] focus:outline-none focus:border-[var(--hw-green-600)] transition-colors";
const PAGE_SIZE = 20;
function SearchableCombobox({ categories, value, onChange }) {
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
    return categories.map((cat) => ({ ...cat, commodities: cat.commodities.filter((c) => c.toLowerCase().includes(q)) })).filter((cat) => cat.commodities.length > 0);
  }, [categories, query]);
  return <div ref={containerRef} className="relative">
      {!open ? <button
    type="button"
    onClick={() => setOpen(true)}
    className="w-full flex items-center justify-between px-3 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)] focus:outline-none hover:border-[var(--hw-neutral-400)] transition-colors"
  >
          <span className="truncate">{value}</span>
          <ChevronDown size={14} className="shrink-0 text-[var(--hw-neutral-800)] ml-2" />
        </button> : <div className="border border-[var(--hw-green-600)] rounded-lg bg-white shadow-lg overflow-hidden z-50 relative">
          <div className="flex items-center px-3 py-2 border-b border-[var(--hw-neutral-200)]">
            <Search size={14} className="text-[var(--hw-neutral-700)] shrink-0 mr-2" />
            <input
    ref={inputRef}
    value={query}
    onChange={(e) => {
      setQuery(e.target.value);
      setHighlightIdx(0);
    }}
    onKeyDown={handleKeyDown}
    placeholder="Search commodities..."
    className="flex-1 text-[13px] text-[var(--hw-neutral-800)] placeholder-[var(--hw-neutral-400)] focus:outline-none bg-transparent"
  />
            {query ? <button onClick={() => setQuery("")} className="ml-1 text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-700)]"><X size={13} /></button> : <button onClick={() => setOpen(false)} className="ml-1 text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-700)]"><ChevronDown size={13} className="rotate-180" /></button>}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {groupedFiltered.length === 0 ? <div className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)]">No commodities found</div> : groupedFiltered.map((cat) => <div key={cat.id}>
                  <div className="px-3 py-1.5 text-[11px] font-bold text-[var(--hw-neutral-800)] bg-[var(--hw-neutral-50)] select-none pointer-events-none">{cat.name}</div>
                  {cat.commodities.map((c) => {
    const gIdx = flatItems.findIndex((f) => f.commodity === c);
    const hi = gIdx === highlightIdx;
    return <button
      key={c}
      type="button"
      onMouseEnter={() => setHighlightIdx(gIdx)}
      onClick={() => {
        onChange(c);
        setOpen(false);
      }}
      className={`w-full px-5 py-2 text-[13px] text-left transition-colors ${hi ? "bg-[var(--hw-green-50)] text-[var(--hw-green-900)]" : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"} ${c === value ? "font-medium" : ""}`}
    >
                        {c}
                      </button>;
  })}
                </div>)}
          </div>
        </div>}
    </div>;
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
  const displayLabel = preset === "7d" ? "Last 7 days" : preset === "14d" ? "Last 14 days" : preset === "21d" ? "Last 21 days" : preset === "28d" ? "Last 28 days" : customFrom && customTo ? formatCustomDateLabel(customFrom, customTo) : "Custom";
  const options = [
    { key: "7d", label: "Last 7 days" },
    { key: "14d", label: "Last 14 days" },
    { key: "21d", label: "Last 21 days" },
    { key: "28d", label: "Last 28 days" },
    { key: "custom", label: "Custom" }
  ];
  const invalidRange = pendingFrom && pendingTo && pendingTo < pendingFrom;
  return <div ref={containerRef} className="relative">
      <button
    type="button"
    onClick={() => {
      setDropOpen(!dropOpen);
      setPopOpen(false);
    }}
    className="w-full flex items-center justify-between px-3 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)] hover:border-[var(--hw-neutral-400)] focus:outline-none transition-colors"
  >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={14} className={`shrink-0 text-[var(--hw-neutral-800)] ml-2 transition-transform ${dropOpen ? "rotate-180" : ""}`} />
      </button>

      {dropOpen && <div className="absolute top-full left-0 mt-1 z-50 w-full min-w-[160px] bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg py-1">
          {options.map((opt) => <button
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
    className={`w-full text-left px-4 py-2 text-[13px] transition-colors ${preset === opt.key ? "bg-[var(--hw-green-50)] text-[var(--hw-green-800)] font-medium" : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
              {opt.label}
            </button>)}
        </div>}

      {popOpen && <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-4">
          <div className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mb-3">Select Date Range</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" value={pendingFrom} onChange={(e) => setPendingFrom(e.target.value)} className={selectCls} />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input type="date" value={pendingTo} onChange={(e) => setPendingTo(e.target.value)} className={selectCls} />
            </div>
          </div>
          {invalidRange && <div className="text-[11px] text-red-500 mb-2">End date must not be before start date.</div>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setPopOpen(false)} className="px-3 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:border-[var(--hw-neutral-400)]">Cancel</button>
            <button
    disabled={!pendingFrom || !pendingTo || !!invalidRange}
    onClick={() => {
      onChange("custom", pendingFrom, pendingTo);
      setPopOpen(false);
    }}
    className="px-3 py-1.5 text-[12px] bg-[var(--hw-green-600)] text-white rounded-lg hover:bg-[var(--hw-green-700)] disabled:opacity-50 disabled:cursor-not-allowed"
  >
              Apply
            </button>
          </div>
        </div>}
    </div>;
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
  return <div ref={containerRef} className="relative">
      <button
    type="button"
    onClick={() => setOpen(!open)}
    className="flex items-center gap-2 px-3 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)] hover:border-[var(--hw-neutral-400)] focus:outline-none transition-colors"
  >
        <span>{selected?.label ?? "Select"}</span>
        <ChevronDown size={12} className={`text-[var(--hw-neutral-800)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="absolute top-full right-0 mt-1 z-50 w-40 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg py-1">
          {options.map((opt) => <button
    key={opt.v}
    type="button"
    onClick={() => {
      onChange(opt.v);
      setOpen(false);
    }}
    className={`w-full text-left px-4 py-2 text-[12px] transition-colors ${value === opt.v ? "bg-[var(--hw-green-50)] text-[var(--hw-green-800)] font-medium" : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
              {opt.label}
            </button>)}
        </div>}
    </div>;
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
  return <div className="flex items-center justify-between flex-wrap gap-3 pt-4">
      <span className="text-[13px] text-[var(--hw-neutral-800)]">
        Showing {from}–{to} of {totalRows} records
      </span>
      {totalPages > 1 && <div className="flex items-center gap-1">
          <button
    onClick={() => onPage(page - 1)}
    disabled={page === 1}
    className="px-2.5 py-1.5 text-[12px] rounded border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] disabled:opacity-40 hover:border-[var(--hw-green-400)] transition-colors"
  >
            Prev
          </button>
          {pages.map(
    (p, i) => p === "..." ? <span key={`e${i}`} className="px-2 text-[var(--hw-neutral-800)]">…</span> : <button
      key={p}
      onClick={() => onPage(p)}
      className={`w-8 h-8 text-[12px] rounded border transition-colors ${page === p ? "bg-[var(--hw-green-600)] text-white border-[var(--hw-green-600)]" : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:border-[var(--hw-green-400)]"}`}
    >
                  {p}
                </button>
  )}
          <button
    onClick={() => onPage(page + 1)}
    disabled={page === totalPages}
    className="px-2.5 py-1.5 text-[12px] rounded border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] disabled:opacity-40 hover:border-[var(--hw-green-400)] transition-colors"
  >
            Next
          </button>
        </div>}
    </div>;
}
function TabNav({ tab, onChange }) {
  return <div className="flex border-b border-[var(--hw-neutral-200)]">
      {["price", "arrival"].map((t) => <button
    key={t}
    onClick={() => onChange(t)}
    className={`px-6 py-3 text-[13px] font-medium border-b-2 transition-colors ${tab === t ? "border-[var(--hw-green-600)] text-[var(--hw-green-700)]" : "border-transparent text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)]"}`}
  >
          {t === "price" ? "Price Trends" : "Arrival Volume Trends"}
        </button>)}
    </div>;
}
function VarietyRow({ variety, value, showAll }) {
  return null;
}
void VarietyRow;
function DFTCTrends() {
  const [activeTab, setActiveTab] = useState("price");
  const [pCommodity, setPCommodity] = useState("Kamatis");
  const [pMarket, setPMarket] = useState("Bangkerohan Public Market");
  const [pPriceType, setPPriceType] = useState("Retail");
  const [pDatePreset, setPDatePreset] = useState("7d");
  const [pCustomFrom, setPCustomFrom] = useState("");
  const [pCustomTo, setPCustomTo] = useState("");
  const [fHorizon, setFHorizon] = useState(7);
  const [pPage, setPPage] = useState(1);
  const [pShowAll, setPShowAll] = useState(false);
  const [aCommodity, setACommodity] = useState("Carrots");
  const [aSourceType, setASourceType] = useState("Combined Total");
  const [aDatePreset, setADatePreset] = useState("28d");
  const [aCustomFrom, setACustomFrom] = useState("");
  const [aCustomTo, setACustomTo] = useState("");
  const [aPage, setAPage] = useState(1);
  const [aShowAll, setAShowAll] = useState(false);
  const [showSourceInfo, setShowSourceInfo] = useState(false);
  useEffect(() => {
    setPPage(1);
    setPShowAll(false);
  }, [pCommodity, pMarket, pPriceType, pDatePreset, pCustomFrom, pCustomTo]);
  useEffect(() => {
    setAPage(1);
    setAShowAll(false);
  }, [aCommodity, aSourceType, aDatePreset, aCustomFrom, aCustomTo]);
  const varieties = useMemo(() => getCommodityVarietyList(pCommodity), [pCommodity]);
  const varietyColors = useMemo(() => HW_GREEN_SHADES.slice(0, varieties.length), [varieties.length]);
  const pDates = useMemo(() => {
    if (pDatePreset === "custom") return ALL_DATES;
    return getPresetDates(pDatePreset);
  }, [pDatePreset]);
  const pChartData = useMemo(() => pDates.map((date) => {
    const point = { date };
    varieties.forEach(({ variety, basePrice }) => {
      const key = variety || pCommodity;
      const prices = getVarietyPrices(`${pCommodity}::${variety}`, basePrice);
      point[key] = prices[date] ?? null;
    });
    return point;
  }), [pDates, varieties, pCommodity]);
  const pVarietySummaries = useMemo(() => {
    if (!pDates.length) return [];
    const latestDate = pDates[pDates.length - 1];
    const prevDate = pDates.length >= 2 ? pDates[pDates.length - 2] : null;
    return varieties.map(({ variety, basePrice }) => {
      const key = variety || pCommodity;
      const prices = getVarietyPrices(`${pCommodity}::${variety}`, basePrice);
      const latest = prices[latestDate] ?? null;
      const prev = prevDate ? prices[prevDate] ?? null : null;
      const change = latest != null && prev != null && prev > 0 ? (latest - prev) / prev * 100 : null;
      const records = pDates.filter((d) => prices[d] != null).length;
      return { variety: key, latest, prev, change, records };
    });
  }, [varieties, pCommodity, pDates]);
  const isHWCommodity = useMemo(() => HW_COMMODITIES.has(pCommodity), [pCommodity]);
  const pFcChartData = useMemo(() => {
    if (!isHWCommodity) return [];
    return FORECAST_DATE_POOL.slice(0, fHorizon).map((date, i) => {
      const point = { date };
      varieties.forEach(({ variety, basePrice }) => {
        const cacheKey = `${pCommodity}::${variety}`;
        const key = variety || pCommodity;
        const prices = getVarietyPrices(cacheKey, basePrice);
        let lastActual = basePrice;
        for (let j = ALL_DATES.length - 1; j >= 0; j--) {
          if (prices[ALL_DATES[j]] != null) {
            lastActual = prices[ALL_DATES[j]];
            break;
          }
        }
        const fcs = getVarietyForecast(cacheKey, basePrice, lastActual, fHorizon);
        const fc = fcs[i];
        if (fc) {
          point[key] = fc.mid;
          point[`${key}__lo`] = fc.lo;
          point[`${key}__hi`] = fc.hi;
        }
      });
      return point;
    });
  }, [isHWCommodity, varieties, pCommodity, fHorizon]);
  const pFcSummaries = useMemo(() => {
    if (!isHWCommodity) return [];
    return varieties.map(({ variety, basePrice }) => {
      const cacheKey = `${pCommodity}::${variety}`;
      const key = variety || pCommodity;
      const prices = getVarietyPrices(cacheKey, basePrice);
      let lastActual = basePrice;
      for (let j = ALL_DATES.length - 1; j >= 0; j--) {
        if (prices[ALL_DATES[j]] != null) {
          lastActual = prices[ALL_DATES[j]];
          break;
        }
      }
      const recentDays = ALL_DATES.slice(-7);
      const recentPrices = recentDays.map((d) => prices[d]).filter((v) => v != null);
      const recentAvg = recentPrices.length ? recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length : basePrice;
      const fcs = getVarietyForecast(cacheKey, basePrice, lastActual, fHorizon);
      if (!fcs.length) return null;
      const lo = Math.min(...fcs.map((f) => f.lo));
      const hi = Math.max(...fcs.map((f) => f.hi));
      const avgMid = fcs.reduce((a, f) => a + f.mid, 0) / fcs.length;
      const change = recentAvg > 0 ? (avgMid - recentAvg) / recentAvg * 100 : null;
      return { variety: key, avgMid, lo, hi, recentAvg, change };
    }).filter(Boolean);
  }, [isHWCommodity, varieties, pCommodity, fHorizon]);
  const pTableRows = useMemo(() => {
    const rows = [];
    varieties.forEach(({ variety, basePrice }) => {
      const prices = getVarietyPrices(`${pCommodity}::${variety}`, basePrice);
      pDates.forEach((date) => {
        if (prices[date] != null) rows.push({ date, variety: variety || pCommodity, price: prices[date] });
      });
    });
    rows.sort((a, b) => ALL_DATES.indexOf(b.date) - ALL_DATES.indexOf(a.date));
    return rows;
  }, [varieties, pCommodity, pDates]);
  const pTotalPages = Math.max(1, Math.ceil(pTableRows.length / PAGE_SIZE));
  const pPageRows = pTableRows.slice((pPage - 1) * PAGE_SIZE, pPage * PAGE_SIZE);
  const aSeries = useMemo(() => getArrivalSeries(aCommodity), [aCommodity]);
  const aVarietyKeys = useMemo(() => aSeries.map((s) => s.variety || aCommodity), [aSeries, aCommodity]);
  const aMonths = useMemo(() => getArrivalMonthsForDatePreset(aDatePreset, aCustomFrom, aCustomTo), [aDatePreset, aCustomFrom, aCustomTo]);
  const aChartData = useMemo(() => buildArrivalChartData(aCommodity, aSeries, aMonths, aSourceType), [aCommodity, aSeries, aMonths, aSourceType]);
  const aVarietySummaries = useMemo(() => {
    if (!aMonths.length) return [];
    const latestMonth = aMonths[aMonths.length - 1];
    return aSeries.map(({ variety, records }) => {
      const varKey = variety || aCommodity;
      const latestRec = records.find((r) => r.month === latestMonth);
      const farm = latestRec?.farm ?? null;
      const other = latestRec?.other ?? null;
      const combined = farm != null && other != null ? farm + other : farm ?? other ?? null;
      const recCount = aMonths.filter((m) => {
        const r = records.find((x) => x.month === m);
        return r && (r.farm != null || r.other != null);
      }).length;
      return { variety: varKey, farm, other, combined, records: recCount };
    });
  }, [aSeries, aCommodity, aMonths]);
  const aTableRows = useMemo(() => {
    const rows = [];
    aSeries.forEach(({ variety, records }) => {
      aMonths.forEach((month) => {
        const rec = records.find((r) => r.month === month);
        if (!rec || rec.farm == null && rec.other == null) return;
        const computed = (rec.farm ?? 0) + (rec.other ?? 0);
        const combined = rec.storedCombined ?? computed;
        const inconsistent = rec.storedCombined != null && rec.storedCombined !== computed;
        rows.push({ month, variety: variety || "", farm: rec.farm, other: rec.other, combined, inconsistent });
      });
    });
    rows.sort((a, b) => ARRIVAL_ALL_MONTHS.indexOf(b.month) - ARRIVAL_ALL_MONTHS.indexOf(a.month));
    return rows;
  }, [aSeries, aMonths]);
  const aTotalPages = Math.max(1, Math.ceil(aTableRows.length / PAGE_SIZE));
  const aPageRows = aTableRows.slice((aPage - 1) * PAGE_SIZE, aPage * PAGE_SIZE);
  const isInvalidCombo = pMarket === "DFTC Taboan" && pPriceType === "Landing";
  function priceSummaryRows(items, renderValue, showAll, setShowAll) {
    const visible = items.slice(0, showAll ? void 0 : 3);
    return <>
        {visible.map((v) => <div key={v.variety} className="flex items-center justify-between py-0.5 gap-2">
            <span className="text-[12px] font-semibold text-[var(--hw-neutral-900)] truncate">{v.variety}</span>
            <span className="shrink-0">{renderValue(v)}</span>
          </div>)}
        {items.length > 3 && <button onClick={() => setShowAll((s) => !s)} className="text-[11px] text-[var(--hw-green-700)] hover:underline mt-1">
            {showAll ? "Show fewer" : `View all ${items.length} varieties`}
          </button>}
      </>;
  }
  const priceTrendsTab = <div className="space-y-5">

      {
    /* Filters — single compact row */
  }
      <div className={`${cardCls} px-5 py-4`}>
        <div className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mb-3">Filters</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Commodity</label>
            <SearchableCombobox categories={PRICE_CATEGORIES} value={pCommodity} onChange={setPCommodity} />
          </div>
          <div>
            <label className={labelCls}>Market</label>
            <div className="relative">
              <select value={pMarket} onChange={(e) => setPMarket(e.target.value)} className={selectCls + " appearance-none pr-8"}>
                <option>Bangkerohan Public Market</option>
                <option>DFTC Taboan</option>
                <option>Carbon Public Market</option>
                <option>Mandaue Public Market</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-800)] pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Price Type</label>
            <div className="relative">
              <select value={pPriceType} onChange={(e) => setPPriceType(e.target.value)} className={selectCls + " appearance-none pr-8"}>
                <option>Retail</option>
                <option>Wholesale</option>
                <option>Landing</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-800)] pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <DateSelect
    preset={pDatePreset}
    customFrom={pCustomFrom}
    customTo={pCustomTo}
    onChange={(p, from, to) => {
      setPDatePreset(p);
      if (from !== void 0) setPCustomFrom(from);
      if (to !== void 0) setPCustomTo(to);
    }}
  />
          </div>
        </div>
        {isInvalidCombo && <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
            DFTC Taboan does not record Landing prices. Change Market or Price Type.
          </div>}
      </div>

      {
    /* Selected Commodity Context */
  }
      <div className={`${cardCls} px-5 py-4`}>
        <div className="text-[12px] font-semibold text-[var(--hw-neutral-800)] mb-2">Selected Commodity Context</div>
        <div className="flex items-center gap-2 mb-3">
          {HW_COMMODITIES.has(pCommodity) ? <CommodityIllustration commodityId={HW_NAME_TO_ID[pCommodity]} size={28} /> : <Leaf size={22} className="text-[var(--hw-green-600)] shrink-0" />}
          <span className="text-[15px] font-bold text-[var(--hw-neutral-900)]">{pCommodity}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2">
          {[
    { label: "Category", value: getCommodityCategory(pCommodity) },
    { label: "Market", value: pMarket },
    { label: "Price Type", value: pPriceType },
    { label: "Date", value: getDateLabel(pDatePreset, pCustomFrom, pCustomTo) },
    { label: "Varieties", value: `${varieties.length}` }
  ].map((item) => <div key={item.label} className="border-l-2 border-[var(--hw-neutral-200)] pl-2">
              <div className="text-[13px] text-[var(--hw-neutral-800)]">{item.label}</div>
              <div className="text-[12px] font-medium text-[var(--hw-neutral-900)] mt-0.5">{item.value}</div>
            </div>)}
        </div>
      </div>

      {
    /* Current Price Trend */
  }
      <div className="space-y-4">
        <h2 className="text-[15px] font-bold text-[var(--hw-neutral-900)]">Current Price Trend</h2>

        {
    /* Per-variety summary cards — no color circles */
  }
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
    {
      title: "Latest Price",
      renderVal: (v) => <span className={`text-[12px] font-semibold ${v.latest != null ? "text-[var(--hw-neutral-900)]" : "text-[var(--hw-neutral-800)]"}`}>
                  {v.latest != null ? `\u20B1${v.latest.toFixed(2)}` : "\u2014"}
                </span>
    },
    {
      title: "Previous Price",
      renderVal: (v) => <span className={`text-[12px] font-semibold ${v.prev != null ? "text-[var(--hw-neutral-900)]" : "text-[var(--hw-neutral-800)]"}`}>
                  {v.prev != null ? `\u20B1${v.prev.toFixed(2)}` : "\u2014"}
                </span>
    },
    {
      title: "Price Change",
      renderVal: (v) => <span className={`text-[12px] font-semibold ${v.change == null ? "text-[var(--hw-neutral-800)]" : v.change > 0 ? "text-green-600" : v.change < 0 ? "text-red-500" : "text-[var(--hw-neutral-800)]"}`}>
                  {v.change == null ? "\u2014" : `${v.change > 0 ? "\u2191" : v.change < 0 ? "\u2193" : ""}${Math.abs(v.change).toFixed(1)}%`}
                </span>
    },
    {
      title: "Records Available",
      renderVal: (v) => <span className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">{v.records} rec.</span>
    }
  ].map(({ title, renderVal }) => <div key={title} className={`${cardCls} p-4`}>
              <div className="text-[11px] font-semibold text-[var(--hw-neutral-700)] mb-2">{title}</div>
              {priceSummaryRows(pVarietySummaries, renderVal, pShowAll, setPShowAll)}
            </div>)}
        </div>

        {
    /* Current price chart */
  }
        <div className={`${cardCls} p-5`}>
          <div className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mb-0.5">{pCommodity} · Current Price Trend</div>
          <div className="text-[12px] text-[var(--hw-neutral-800)] mb-4">{pMarket} · {pPriceType} · {getDateLabel(pDatePreset, pCustomFrom, pCustomTo)} · ₱/kg</div>
          <CurrentPriceTrendChart
    commodity={pCommodity}
    chartData={pChartData}
    varieties={varieties}
    colors={varietyColors}
    height={240}
  />
        </div>
      </div>

      {
    /* Forecasted Price Trend */
  }
      <div className="space-y-4">
        <h2 className="text-[15px] font-bold text-[var(--hw-neutral-900)]">Forecasted Price Trend</h2>

        {!isHWCommodity ? <div className={`${cardCls} p-8 text-center`}>
            <div className="text-[14px] font-semibold text-[var(--hw-neutral-800)] mb-2">Forecast Not Available</div>
            <p className="text-[13px] text-[var(--hw-neutral-800)] max-w-md mx-auto">
              AI price forecasting is available for the 10 HarvestWise-monitored commodities: Kamatis, Talong, Repolyo, Atsal, Carrots, Pipino, Ampalaya, Kalabasa, Lettuce, and Chinese Pechay.
            </p>
          </div> : <>
            {
    /* Forecast summary cards — no color circles */
  }
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
    {
      title: "Forecast Midpoint",
      renderVal: (v) => <span className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">₱{v.avgMid.toFixed(2)}</span>
    },
    {
      title: "Forecast Range",
      renderVal: (v) => <span className="text-[11px] font-semibold text-[var(--hw-neutral-900)]">₱{v.lo.toFixed(0)}–₱{v.hi.toFixed(0)}</span>
    },
    {
      title: "Recent Average Price",
      renderVal: (v) => <span className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">₱{v.recentAvg.toFixed(2)}</span>
    },
    {
      title: "Forecast Change",
      renderVal: (v) => <span className={`text-[12px] font-semibold ${v.change == null ? "text-[var(--hw-neutral-800)]" : v.change > 0 ? "text-green-600" : v.change < 0 ? "text-red-500" : "text-[var(--hw-neutral-800)]"}`}>
                      {v.change == null ? "\u2014" : `${v.change > 0 ? "\u2191" : v.change < 0 ? "\u2193" : ""}${Math.abs(v.change).toFixed(1)}%`}
                    </span>
    }
  ].map(({ title, renderVal }) => <div key={title} className={`${cardCls} p-4`}>
                  <div className="text-[11px] font-semibold text-[var(--hw-neutral-700)] mb-2">{title}</div>
                  {priceSummaryRows(pFcSummaries, renderVal, pShowAll, setPShowAll)}
                </div>)}
            </div>

            {
    /* Forecast chart — forecast dates only, Forecast Horizon control inside card */
  }
            <div className={`${cardCls} p-5`}>
              <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <div className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{pCommodity} · Forecasted Price Trend</div>
                  <div className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">Next {fHorizon} days forecast by variety · ₱/kg</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-[var(--hw-neutral-800)]">Forecast Horizon</span>
                  <ForecastHorizonSelect value={fHorizon} onChange={setFHorizon} />
                </div>
              </div>
              <ForecastPriceTrendChart
    commodity={pCommodity}
    chartData={pFcChartData}
    varieties={varieties}
    colors={varietyColors}
    height={240}
  />
            </div>
          </>}
      </div>

      {
    /* Recent Price Records */
  }
      <div className="space-y-3">
        <h3 className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Recent Price Records</h3>
        <div className={`${cardCls} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]">
                  {["Date", "Commodity", "Variety", "Category", "Market", "Price Type", "UOM", "Price"].map((h) => <th key={h} className="px-4 py-3 text-left font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {pPageRows.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-[var(--hw-neutral-800)]">No price records for the selected filters.</td></tr> : pPageRows.map((row, i) => <tr key={i} className="border-b border-[var(--hw-neutral-100)] hover:bg-[var(--hw-neutral-50)] transition-colors">
                      <td className="px-4 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">{row.date}</td>
                      <td className="px-4 py-3 text-[var(--hw-neutral-800)]">{pCommodity}</td>
                      <td className="px-4 py-3 text-[var(--hw-neutral-800)]">{row.variety || "\u2014"}</td>
                      <td className="px-4 py-3 text-[var(--hw-neutral-800)]">{getCommodityCategory(pCommodity)}</td>
                      <td className="px-4 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">{pMarket}</td>
                      <td className="px-4 py-3 text-[var(--hw-neutral-800)]">{pPriceType}</td>
                      <td className="px-4 py-3 text-[var(--hw-neutral-800)]">kg</td>
                      <td className="px-4 py-3 font-semibold text-[var(--hw-neutral-900)]">{row.price != null ? `\u20B1${row.price.toFixed(2)}` : "\u2014"}</td>
                    </tr>)}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4">
            <Pagination page={pPage} totalPages={pTotalPages} totalRows={pTableRows.length} onPage={setPPage} />
          </div>
        </div>
      </div>
    </div>;
  const arrivalTrendsTab = <div className="space-y-5">

      {
    /* Filters — single compact row */
  }
      <div className={`${cardCls} px-5 py-4`}>
        <div className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mb-3">Filters</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Commodity</label>
            <SearchableCombobox categories={PRICE_CATEGORIES} value={aCommodity} onChange={setACommodity} />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">
              Source Type
              <div className="relative inline-block">
                <button
    type="button"
    onMouseEnter={() => setShowSourceInfo(true)}
    onMouseLeave={() => setShowSourceInfo(false)}
    className="text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-700)]"
  >
                  <Info size={13} />
                </button>
                {showSourceInfo && <div className="absolute left-0 top-6 z-50 w-64 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-3 text-[11px] text-[var(--hw-neutral-800)] space-y-1.5">
                    <div><span className="font-semibold">Farm Source</span> — Volume from registered farm producers.</div>
                    <div><span className="font-semibold">Other Source</span> — Volume from traders or intermediaries.</div>
                    <div><span className="font-semibold">Combined Total</span> — Farm Source plus Other Source.</div>
                  </div>}
              </div>
            </label>
            <div className="relative">
              <select value={aSourceType} onChange={(e) => setASourceType(e.target.value)} className={selectCls + " appearance-none pr-8"}>
                <option>Combined Total</option>
                <option>Farm Source</option>
                <option>Other Source</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-800)] pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <DateSelect
    preset={aDatePreset}
    customFrom={aCustomFrom}
    customTo={aCustomTo}
    onChange={(p, from, to) => {
      setADatePreset(p);
      if (from !== void 0) setACustomFrom(from);
      if (to !== void 0) setACustomTo(to);
    }}
  />
          </div>
        </div>
      </div>

      {
    /* Selected Commodity Context */
  }
      <div className={`${cardCls} px-5 py-4`}>
        <div className="text-[12px] font-semibold text-[var(--hw-neutral-800)] mb-2">Selected Commodity Context</div>
        <div className="flex items-center gap-2 mb-3">
          {HW_COMMODITIES.has(aCommodity) ? <CommodityIllustration commodityId={HW_NAME_TO_ID[aCommodity]} size={28} /> : <Leaf size={22} className="text-[var(--hw-green-600)] shrink-0" />}
          <span className="text-[15px] font-bold text-[var(--hw-neutral-900)]">{aCommodity}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2">
          {[
    { label: "Category", value: getCommodityCategory(aCommodity) },
    { label: "Facility", value: "DFTC" },
    { label: "Source Type", value: aSourceType },
    { label: "Date", value: getDateLabel(aDatePreset, aCustomFrom, aCustomTo) },
    { label: "Unit", value: "kg" },
    { label: "Varieties", value: `${aSeries.length}` }
  ].map((item) => <div key={item.label} className="border-l-2 border-[var(--hw-neutral-200)] pl-2">
              <div className="text-[13px] text-[var(--hw-neutral-800)]">{item.label}</div>
              <div className="text-[12px] font-medium text-[var(--hw-neutral-900)] mt-0.5">{item.value}</div>
            </div>)}
        </div>
      </div>

      {
    /* Arrival Volume Summary */
  }
      <div className="space-y-4">
        <h2 className="text-[15px] font-bold text-[var(--hw-neutral-900)]">Arrival Volume Summary</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
    {
      title: "Latest Combined Volume",
      renderVal: (v) => <span className={`text-[12px] font-semibold ${v.combined != null ? "text-[var(--hw-neutral-900)]" : "text-[var(--hw-neutral-800)]"}`}>
                  {formatVol(v.combined)}
                </span>
    },
    {
      title: "Latest Farm Source Volume",
      renderVal: (v) => <span className={`text-[12px] font-semibold ${v.farm != null ? "text-[var(--hw-neutral-900)]" : "text-[var(--hw-neutral-800)]"}`}>
                  {formatVol(v.farm)}
                </span>
    },
    {
      title: "Latest Other Source Volume",
      renderVal: (v) => <span className={`text-[12px] font-semibold ${v.other != null ? "text-[var(--hw-neutral-900)]" : "text-[var(--hw-neutral-800)]"}`}>
                  {formatVol(v.other)}
                </span>
    },
    {
      title: "Records Available",
      renderVal: (v) => <span className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">{v.records} rec.</span>
    }
  ].map(({ title, renderVal }) => <div key={title} className={`${cardCls} p-4`}>
              <div className="text-[11px] font-semibold text-[var(--hw-neutral-700)] mb-2">{title}</div>
              {priceSummaryRows(aVarietySummaries, renderVal, aShowAll, setAShowAll)}
            </div>)}
        </div>
      </div>

      {
    /* Arrival Volume Trend chart */
  }
      <div className="space-y-3">
        <h2 className="text-[15px] font-bold text-[var(--hw-neutral-900)]">Arrival Volume Trend</h2>
        {aChartData.length === 0 ? <div className={`${cardCls} p-8 text-center`}>
            <div className="text-[14px] font-semibold text-[var(--hw-neutral-800)] mb-2">No Data Available</div>
            <p className="text-[13px] text-[var(--hw-neutral-800)]">No arrival-volume records for the selected commodity and date range.</p>
          </div> : <div className={`${cardCls} p-5`}>
            <div className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mb-0.5">{aCommodity} · Arrival Volume Trend</div>
            <div className="text-[12px] text-[var(--hw-neutral-800)] mb-4">{aSourceType} by variety · {getDateLabel(aDatePreset, aCustomFrom, aCustomTo)} · kg</div>
            <ArrivalVolumeTrendChart
    commodity={aCommodity}
    chartData={aChartData}
    varietyKeys={aVarietyKeys}
    sourceType={aSourceType}
    height={240}
  />
          </div>}
      </div>

      {
    /* Recent Arrival Volume Records */
  }
      <div className="space-y-3">
        <h3 className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Recent Arrival Volume Records</h3>
        <div className={`${cardCls} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]">
                  {["Date / Month", "Commodity", "Variety", "Farm Source", "Other Source", "Combined Total", "Unit"].map((h) => <th key={h} className="px-4 py-3 text-left font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {aPageRows.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--hw-neutral-800)]">No arrival-volume records for the selected commodity and date range.</td></tr> : aPageRows.map((row, i) => <tr key={i} className="border-b border-[var(--hw-neutral-100)] hover:bg-[var(--hw-neutral-50)] transition-colors">
                      <td className="px-4 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">{row.month} 2026</td>
                      <td className="px-4 py-3 text-[var(--hw-neutral-800)]">{aCommodity}</td>
                      <td className="px-4 py-3 text-[var(--hw-neutral-800)]">{row.variety || "\u2014"}</td>
                      <td className="px-4 py-3 text-[var(--hw-neutral-800)]">{formatVol(row.farm)}</td>
                      <td className="px-4 py-3 text-[var(--hw-neutral-800)]">{formatVol(row.other)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-semibold ${row.inconsistent ? "text-amber-700" : "text-[var(--hw-neutral-900)]"}`}>{formatVol(row.combined)}</span>
                          {row.inconsistent && <div className="relative inline-block group/tip">
                              <AlertCircle size={13} className="text-amber-500 cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/tip:block z-50 w-56 bg-[var(--hw-neutral-900)] text-white text-[11px] rounded-lg px-2.5 py-2 shadow-lg pointer-events-none">
                                Combined Total does not match Farm Source plus Other Source. Review the source record.
                              </div>
                            </div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--hw-neutral-800)]">kg</td>
                    </tr>)}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4">
            <Pagination page={aPage} totalPages={aTotalPages} totalRows={aTableRows.length} onPage={setAPage} />
          </div>
        </div>
      </div>
    </div>;
  return <div className="min-h-screen bg-[var(--hw-neutral-50)]">
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 lg:px-10 py-5">
        <PageHeader
    title="Market Trends"
    description="Explore commodity price trends and arrival volume trends at DFTC markets."
    className="mb-6"
  />
        <div className={`${cardCls} mb-5`}>
          <TabNav tab={activeTab} onChange={setActiveTab} />
        </div>
        {activeTab === "price" ? priceTrendsTab : arrivalTrendsTab}
      </div>
    </div>;
}
export {
  DFTCTrends as default
};
