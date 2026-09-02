import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search, X, Leaf, Info, AlertCircle, BarChart3, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { COMMODITY_CATEGORIES, getCategoryFor, isHWCommodity } from "../../global/data/commodities";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { CommodityIllustration, getCommodityIconKey } from "../../global/components/shared/CommodityIllustrations";
import { ForecastPriceTrendChart } from "../../global/components/shared/ForecastPriceTrendChart";
import { ArrivalVolumeTrendChart } from "../../global/components/shared/ArrivalVolumeTrendChart";
import { ArrivalSourcePieChart } from "../../global/components/shared/ArrivalSourcePieChart";
import { apiGet, parseResponse } from "../../global/api";

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

function getCommoditySlug(name) {
  if (!name) return "";
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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
  return `${fmt(from)}–${fmt(to)}, 2026`;
}

const cardCls = "bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)]";
const labelCls = "block text-[12px] font-semibold text-[var(--hw-neutral-700)] mb-1.5";
const selectCls = "w-full px-3.5 py-2.5 text-[13px] border border-[var(--hw-neutral-200)] rounded-xl bg-white text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-600)] transition-colors";
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
          className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] border border-[var(--hw-neutral-200)] rounded-xl bg-white text-[var(--hw-neutral-900)] focus:outline-none hover:border-[var(--hw-neutral-400)] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            {selectedIconKey ? (
              <CommodityIllustration commodityId={selectedIconKey} className="w-5 h-5 shrink-0" />
            ) : (
              <Leaf className="w-4 h-4 text-[var(--hw-green-600)] shrink-0" />
            )}
            <span className="truncate font-medium">{value}</span>
          </div>
          <ChevronDown size={14} className="shrink-0 text-[var(--hw-neutral-500)] ml-2" />
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
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] border border-[var(--hw-neutral-200)] rounded-xl bg-white text-[var(--hw-neutral-900)] hover:border-[var(--hw-neutral-400)] focus:outline-none transition-colors cursor-pointer"
      >
        <span className="truncate font-medium">{displayLabel}</span>
        <ChevronDown size={14} className={`shrink-0 text-[var(--hw-neutral-500)] ml-2 transition-transform ${dropOpen ? "rotate-180" : ""}`} />
      </button>

      {dropOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-full min-w-[160px] bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg py-1">
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
        <div className="absolute top-full left-0 mt-1.5 z-50 w-full min-w-[160px] bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg py-1">
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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)] hover:border-[var(--hw-neutral-400)] focus:outline-none transition-colors cursor-pointer"
      >
        <span className="font-medium">{selected?.label ?? "Select"}</span>
        <ChevronDown size={12} className={`text-[var(--hw-neutral-500)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1.5 z-50 w-40 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg py-1">
          {options.map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => {
                onChange(opt.v);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-[12px] transition-colors cursor-pointer ${
                value === opt.v ? "bg-[var(--hw-green-50)] text-[var(--hw-green-800)] font-semibold" : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
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
    <div className="flex border-b border-[var(--hw-neutral-200)]">
      {[
        { id: "price", label: "Price Trends", icon: TrendingUp },
        { id: "arrival", label: "Arrival Volume Trends", icon: BarChart3 }
      ].map((t) => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-2 px-6 py-3.5 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer ${
              active
                ? "border-[var(--hw-green-700)] text-[var(--hw-green-800)] bg-[var(--hw-green-50)]/30"
                : "border-transparent text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"
            }`}
          >
            <Icon className={`w-4 h-4 ${active ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-400)]"}`} />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SummaryStripSkeleton({ columns = 5 }) {
  return (
    <div className={`${cardCls} p-5 md:p-6`}>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${columns === 5 ? "lg:grid-cols-5" : "lg:grid-cols-3"} gap-6`}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className={`${i !== 0 ? "lg:border-l-2 lg:border-[var(--hw-neutral-200)] lg:pl-5" : "lg:pl-0"} space-y-3`}>
            <div className="h-3 w-28 bg-[var(--hw-neutral-200)] rounded animate-pulse" />
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-3 w-16 bg-[var(--hw-neutral-100)] rounded animate-pulse" />
                <div className="h-3.5 w-14 bg-[var(--hw-neutral-200)] rounded animate-pulse" />
              </div>
              <div className="flex justify-between items-center">
                <div className="h-3 w-20 bg-[var(--hw-neutral-100)] rounded animate-pulse" />
                <div className="h-3.5 w-14 bg-[var(--hw-neutral-200)] rounded animate-pulse" />
              </div>
              <div className="flex justify-between items-center">
                <div className="h-3 w-14 bg-[var(--hw-neutral-100)] rounded animate-pulse" />
                <div className="h-3.5 w-14 bg-[var(--hw-neutral-200)] rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
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
  const [activeTab, setActiveTab] = useState("price");

  // Price Trend state
  const [pCommodity, setPCommodity] = useState("Kamatis");
  const [pMarket, setPMarket] = useState("Bankerohan Public Market");
  const [pPriceType, setPPriceType] = useState("Retail");
  const [pDatePreset, setPDatePreset] = useState("14d");
  const [pCustomFrom, setPCustomFrom] = useState("");
  const [pCustomTo, setPCustomTo] = useState("");
  const [fHorizon, setFHorizon] = useState(14);
  const [pPage, setPPage] = useState(1);
  const [pShowAll, setPShowAll] = useState(false);

  // Arrival Volume Trend state
  const [aCommodity, setACommodity] = useState("Carrots");
  const [aVolumeType, setAVolumeType] = useState("Combined Total");
  const [aDatePreset, setADatePreset] = useState("all");
  const [aCustomFrom, setACustomFrom] = useState("");
  const [aCustomTo, setACustomTo] = useState("");
  const [aPage, setAPage] = useState(1);
  const [aShowAll, setAShowAll] = useState(false);
  const [showVolumeTypeInfo, setShowVolumeTypeInfo] = useState(false);

  useEffect(() => {
    setPPage(1);
    setPShowAll(false);
  }, [pCommodity, pMarket, pPriceType, pDatePreset, pCustomFrom, pCustomTo]);

  useEffect(() => {
    setAPage(1);
    setAShowAll(false);
  }, [aCommodity, aVolumeType, aDatePreset, aCustomFrom, aCustomTo]);

  // Live Price Queries
  const pCommodityId = useMemo(() => getCommoditySlug(pCommodity), [pCommodity]);
  const pPriceTypeKey = useMemo(() => getPriceTypeKey(pMarket, pPriceType), [pMarket, pPriceType]);

  const { data: priceDetailData, isLoading: isPriceDetailLoading } = useQuery({
    queryKey: ["dftc-trends-price-detail", pCommodityId, pPriceTypeKey, fHorizon],
    queryFn: async () => {
      try {
        const res = await apiGet(`/prices/${pCommodityId}?price_type=${pPriceTypeKey}&horizon=${fHorizon}`);
        return parseResponse(res);
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000
  });

  const { data: priceRecordsData, isLoading: isPriceRecordsLoading } = useQuery({
    queryKey: ["dftc-trends-price-records", pCommodityId, pPriceTypeKey],
    queryFn: async () => {
      try {
        const res = await apiGet(`/prices/${pCommodityId}/records?price_type=${pPriceTypeKey}&limit=100`);
        return parseResponse(res);
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000
  });

  const isPricesLoading = isPriceDetailLoading || isPriceRecordsLoading;

  // Live Arrival Volume Query
  const aCommodityId = useMemo(() => getCommoditySlug(aCommodity), [aCommodity]);
  const { data: arrivalQueryData, isLoading: isArrivalLoading } = useQuery({
    queryKey: ["dftc-trends-arrivals", aCommodityId],
    queryFn: async () => {
      try {
        const res = await apiGet(`/market/factors/arrival/${aCommodityId}?days=180`);
        return parseResponse(res);
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000
  });

  // 1. Process Price Trends Data from Database Response Only
  const rawPriceRecords = useMemo(() => {
    if (Array.isArray(priceRecordsData)) return priceRecordsData;
    if (Array.isArray(priceRecordsData?.items)) return priceRecordsData.items;
    if (Array.isArray(priceDetailData?.recent_records)) return priceDetailData.recent_records;
    return [];
  }, [priceRecordsData, priceDetailData]);

  const filteredPriceRecords = useMemo(() => {
    if (!rawPriceRecords.length) return [];
    let recs = [...rawPriceRecords].sort((a, b) => new Date(b.price_date || b.date) - new Date(a.price_date || a.date));
    const limit = pDatePreset === "7d" ? 7 : pDatePreset === "14d" ? 14 : pDatePreset === "21d" ? 21 : pDatePreset === "28d" ? 28 : null;
    if (limit) {
      recs = recs.slice(0, limit);
    } else if (pDatePreset === "custom" && pCustomFrom && pCustomTo) {
      recs = recs.filter((r) => {
        const d = r.price_date || r.date;
        return d >= pCustomFrom && d <= pCustomTo;
      });
    }
    return recs;
  }, [rawPriceRecords, pDatePreset, pCustomFrom, pCustomTo]);

  const forecastObj = priceDetailData?.forecast;

  const varieties = useMemo(() => [{ variety: pCommodity }], [pCommodity]);
  const varietyColors = useMemo(() => [HW_GREEN_SHADES[0]], []);

  // 5-Metric Price Summary Strip
  const pVarietySummaries = useMemo(() => {
    if (!filteredPriceRecords.length && !forecastObj) return [];
    const validPrices = filteredPriceRecords.map((r) => r.price_avg ?? r.price).filter((p) => p != null);
    const recentAvg = validPrices.length
      ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length
      : (forecastObj?.current_price ?? null);
    const lo = forecastObj?.lower_forecast ?? null;
    const avgMid = forecastObj?.forecast_midpoint ?? (lo != null && forecastObj?.upper_forecast != null ? (lo + forecastObj.upper_forecast) / 2 : null);
    const hi = forecastObj?.upper_forecast ?? null;
    const change = recentAvg != null && avgMid != null && recentAvg > 0 ? ((avgMid - recentAvg) / recentAvg) * 100 : null;

    return [{
      variety: pCommodity,
      recentAvg,
      lo,
      avgMid,
      hi,
      change,
      records: filteredPriceRecords.length
    }];
  }, [filteredPriceRecords, forecastObj, pCommodity]);

  // Price Trend Chart Data
  const pChartData = useMemo(() => {
    if (!filteredPriceRecords.length && !forecastObj) return [];
    const pts = [];
    const sorted = [...filteredPriceRecords].sort((a, b) => new Date(a.price_date || a.date) - new Date(b.price_date || b.date));

    sorted.forEach((r) => {
      const dStr = r.price_date || r.date;
      const dObj = new Date(dStr);
      const label = isNaN(dObj.getTime()) ? dStr : dObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      pts.push({
        date: label,
        [pCommodity]: r.price_avg ?? r.price
      });
    });

    if (forecastObj && (forecastObj.lower_forecast != null || forecastObj.forecast_midpoint != null)) {
      const baseDate = sorted.length ? new Date(sorted[sorted.length - 1].price_date || sorted[sorted.length - 1].date) : new Date();
      const mid = forecastObj.forecast_midpoint ?? ((forecastObj.lower_forecast + forecastObj.upper_forecast) / 2);
      const lo = forecastObj.lower_forecast ?? mid;
      const hi = forecastObj.upper_forecast ?? mid;
      const horizonDays = parseInt(fHorizon, 10) || 7;

      for (let i = 1; i <= horizonDays; i++) {
        const nextD = new Date(baseDate);
        nextD.setDate(nextD.getDate() + i);
        const fLabel = nextD.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        pts.push({
          date: fLabel,
          [pCommodity]: mid,
          [`${pCommodity}__lo`]: lo,
          [`${pCommodity}__hi`]: hi
        });
      }
    }

    return pts;
  }, [filteredPriceRecords, forecastObj, pCommodity, fHorizon]);

  // Recent Price Records Table Rows
  const pTableRows = useMemo(() => {
    return filteredPriceRecords.map((r) => ({
      date: r.price_date || r.date,
      commodity: pCommodity,
      variety: r.variety || "—",
      category: getCommodityCategory(pCommodity),
      market: pMarket,
      price_type: pPriceType,
      uom: r.uom || "kg",
      price: r.price_avg ?? r.price
    }));
  }, [filteredPriceRecords, pCommodity, pMarket, pPriceType]);

  const pTotalPages = Math.max(1, Math.ceil(pTableRows.length / PAGE_SIZE));
  const pPageRows = pTableRows.slice((pPage - 1) * PAGE_SIZE, pPage * PAGE_SIZE);

  // 2. Process Arrival Volume Data from Database Response Only
  const rawArrivalRecords = useMemo(() => {
    if (Array.isArray(arrivalQueryData?.volumes)) return arrivalQueryData.volumes;
    if (Array.isArray(arrivalQueryData?.items)) return arrivalQueryData.items;
    if (Array.isArray(arrivalQueryData)) return arrivalQueryData;
    return [];
  }, [arrivalQueryData]);

  const aVarietyKeys = useMemo(() => [aCommodity], [aCommodity]);

  const aChartData = useMemo(() => {
    if (!rawArrivalRecords.length) return [];
    const grouped = {};
    rawArrivalRecords.forEach((r) => {
      const dStr = r.arrival_date || r.date;
      const dObj = new Date(dStr);
      const monthLabel = isNaN(dObj.getTime()) ? dStr : dObj.toLocaleDateString("en-US", { month: "short" });
      const val = aVolumeType === "Farm Source"
        ? (r.farm_source_volume_kg ?? 0)
        : aVolumeType === "Other Source"
        ? (r.other_source_volume_kg ?? 0)
        : (r.volume_kg ?? (r.farm_source_volume_kg ?? 0) + (r.other_source_volume_kg ?? 0));

      grouped[monthLabel] = (grouped[monthLabel] || 0) + val;
    });

    return Object.entries(grouped).map(([month, val]) => ({
      month,
      [aCommodity]: val
    }));
  }, [rawArrivalRecords, aVolumeType, aCommodity]);

  const aSourcesBreakdown = useMemo(() => {
    if (!rawArrivalRecords.length) return [];
    let totalFarm = 0;
    let totalOther = 0;
    rawArrivalRecords.forEach((r) => {
      totalFarm += Number(r.farm_source_volume_kg || 0);
      totalOther += Number(r.other_source_volume_kg || 0);
    });
    const combined = totalFarm + totalOther;
    if (combined === 0) return [];
    const farmPct = Math.round((totalFarm / combined) * 100);
    const otherPct = 100 - farmPct;
    return [
      { name: "Farm Source", value: farmPct, volumeKg: totalFarm, color: "#15803d" },
      { name: "Other Sources", value: otherPct, volumeKg: totalOther, color: "#f59e0b" }
    ];
  }, [rawArrivalRecords]);

  const aVarietySummaries = useMemo(() => {
    if (!rawArrivalRecords.length) return [];
    const latest = rawArrivalRecords[0];
    const farm = latest?.farm_source_volume_kg ?? null;
    const other = latest?.other_source_volume_kg ?? null;
    const combined = latest?.volume_kg ?? (farm != null || other != null ? (farm || 0) + (other || 0) : null);
    return [{
      variety: aCommodity,
      farm,
      other,
      combined,
      records: rawArrivalRecords.length
    }];
  }, [rawArrivalRecords, aCommodity]);

  const aTableRows = useMemo(() => {
    return rawArrivalRecords.map((r) => {
      const dStr = r.arrival_date || r.date;
      const dObj = new Date(dStr);
      const monthLabel = isNaN(dObj.getTime()) ? dStr : dObj.toLocaleDateString("en-US", { month: "short", year: "numeric" });
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
  }, [rawArrivalRecords]);

  const aTotalPages = Math.max(1, Math.ceil(aTableRows.length / PAGE_SIZE));
  const aPageRows = aTableRows.slice((aPage - 1) * PAGE_SIZE, aPage * PAGE_SIZE);

  const isInvalidCombo = pMarket === "DFTC Taboan" && pPriceType === "Landing";

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
      <div className={`${cardCls} p-5 md:p-6`}>
        <h2 className="text-[13px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wider mb-4">Filters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Commodity</label>
            <SearchableCombobox categories={PRICE_CATEGORIES} value={pCommodity} onChange={setPCommodity} />
          </div>
          <div>
            <label className={labelCls}>Market</label>
            <div className="relative">
              <select value={pMarket} onChange={(e) => setPMarket(e.target.value)} className={selectCls + " appearance-none pr-9 cursor-pointer"}>
                <option>Bankerohan Public Market</option>
                <option>DFTC Taboan</option>
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-500)] pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Price Type</label>
            <div className="relative">
              <select value={pPriceType} onChange={(e) => setPPriceType(e.target.value)} className={selectCls + " appearance-none pr-9 cursor-pointer"}>
                <option>Retail</option>
                <option>Wholesale</option>
                <option>Landing</option>
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-500)] pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Period</label>
            <DateSelect
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
        </div>
        {isInvalidCombo && (
          <div className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mt-4 flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-600 shrink-0" />
            <span>DFTC Taboan does not record Landing prices. Please change Market or Price Type.</span>
          </div>
        )}
      </div>

      {/* 2. Price Summary Metrics Strip */}
      {isPricesLoading ? (
        <SummaryStripSkeleton columns={5} />
      ) : (
        <div className={`${cardCls} p-5 md:p-6`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              {
                title: "Recent Average Price",
                renderVal: (v) => (
                  <span className="text-[13px] font-bold text-[var(--hw-neutral-900)]">
                    {v.recentAvg != null ? `₱${v.recentAvg.toFixed(2)}/kg` : "—"}
                  </span>
                )
              },
              {
                title: "Lower Forecast",
                renderVal: (v) => (
                  <span className="text-[13px] font-bold text-amber-700">
                    {v.lo != null ? `₱${v.lo.toFixed(2)}/kg` : "—"}
                  </span>
                )
              },
              {
                title: "Forecast Midpoint",
                renderVal: (v) => (
                  <span className="text-[13px] font-bold text-[var(--hw-neutral-900)]">
                    {v.avgMid != null ? `₱${v.avgMid.toFixed(2)}/kg` : "—"}
                  </span>
                )
              },
              {
                title: "Upper Forecast",
                renderVal: (v) => (
                  <span className="text-[13px] font-bold text-emerald-700">
                    {v.hi != null ? `₱${v.hi.toFixed(2)}/kg` : "—"}
                  </span>
                )
              },
              {
                title: "Forecast Price Change",
                renderVal: (v) => (
                  <span
                    className={`text-[12px] font-bold ${
                      v.change == null
                        ? "text-[var(--hw-neutral-500)]"
                        : v.change > 0
                        ? "text-emerald-700"
                        : v.change < 0
                        ? "text-rose-600"
                        : "text-[var(--hw-neutral-700)]"
                    }`}
                  >
                    {v.change == null ? "—" : `${v.change > 0 ? "↑ " : v.change < 0 ? "↓ " : ""}${Math.abs(v.change).toFixed(1)}%`}
                  </span>
                )
              }
            ].map(({ title, renderVal }, idx) => (
              <div key={title} className={`${idx !== 0 ? "lg:border-l-2 lg:border-[var(--hw-neutral-200)] lg:pl-5" : "lg:pl-0"} flex flex-col justify-between`}>
                <div className="text-[11px] font-bold text-[var(--hw-neutral-500)] uppercase tracking-wider mb-2">{title}</div>
                {priceSummaryRows(pVarietySummaries, renderVal, pShowAll, setPShowAll)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Single Unified Price Trend Chart Card */}
      {isPricesLoading ? (
        <ChartCardSkeleton height={320} />
      ) : (
        <div className={`${cardCls} p-6 md:p-8 space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--hw-neutral-100)]">
            <div>
              <h3 className="text-[15px] font-bold text-[var(--hw-neutral-900)]">Price Trend</h3>
              <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
                {pMarket} · {pPriceType} · Next {fHorizon} days price outlook for {pCommodity} · ₱/kg
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[12px] font-medium text-[var(--hw-neutral-600)]">Forecast Horizon</span>
              <ForecastHorizonSelect value={fHorizon} onChange={setFHorizon} />
            </div>
          </div>

          {pChartData.length > 0 ? (
            <ForecastPriceTrendChart
              commodity={pCommodity}
              chartData={pChartData}
              varieties={varieties}
              colors={varietyColors}
              height={320}
            />
          ) : (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-[var(--hw-neutral-100)] flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-[var(--hw-neutral-400)]" />
              </div>
              <p className="text-[14px] font-semibold text-[var(--hw-neutral-800)]">No price trend data available</p>
              <p className="text-[12px] text-[var(--hw-neutral-500)] max-w-xs mt-1">
                No price records found for {pCommodity} ({pPriceType}) in {pMarket} within the selected period.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4. Recent Price Records Table */}
      <div className="space-y-3">
        <h3 className="text-[14px] font-bold text-[var(--hw-neutral-900)]">Recent Price Records</h3>
        {isPricesLoading ? (
          <TableSkeleton cols={8} rows={5} />
        ) : (
          <div className={`${cardCls} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]">
                    {["Date", "Commodity", "Variety", "Category", "Market", "Price Type", "UOM", "Price"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider whitespace-nowrap">
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
                      <tr key={i} className="hover:bg-[var(--hw-neutral-50)]/70 transition-colors">
                        <td className="px-4 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap font-medium">{row.date}</td>
                        <td className="px-4 py-3 text-[var(--hw-neutral-900)] font-semibold">{pCommodity}</td>
                        <td className="px-4 py-3 text-[var(--hw-neutral-700)]">{row.variety || "—"}</td>
                        <td className="px-4 py-3 text-[var(--hw-neutral-600)]">{getCommodityCategory(pCommodity)}</td>
                        <td className="px-4 py-3 text-[var(--hw-neutral-700)] whitespace-nowrap">{pMarket}</td>
                        <td className="px-4 py-3 text-[var(--hw-neutral-700)]">{pPriceType}</td>
                        <td className="px-4 py-3 text-[var(--hw-neutral-600)]">kg</td>
                        <td className="px-4 py-3 font-bold text-[var(--hw-neutral-900)]">
                          {row.price != null ? `₱${row.price.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {pPageRows.length > 0 && (
              <div className="px-4 pb-4">
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
    <div className="space-y-6">
      {/* 1. Filters */}
      <div className={`${cardCls} p-5 md:p-6`}>
        <h2 className="text-[13px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wider mb-4">Filters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Commodity</label>
            <SearchableCombobox categories={PRICE_CATEGORIES} value={aCommodity} onChange={setACommodity} />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--hw-neutral-700)] mb-1.5">
              Arrival Volume Type
              <div className="relative inline-block">
                <button
                  type="button"
                  onMouseEnter={() => setShowVolumeTypeInfo(true)}
                  onMouseLeave={() => setShowVolumeTypeInfo(false)}
                  className="text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-700)] cursor-pointer"
                >
                  <Info size={13} />
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
              <select value={aVolumeType} onChange={(e) => setAVolumeType(e.target.value)} className={selectCls + " appearance-none pr-9 cursor-pointer"}>
                <option>Combined Total</option>
                <option>Farm Source</option>
                <option>Other Source</option>
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-500)] pointer-events-none" />
            </div>
          </div>
          <div>
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
        </div>
      </div>

      {/* 2. Arrival Volume Summary Metrics Strip */}
      {isArrivalLoading ? (
        <SummaryStripSkeleton columns={3} />
      ) : (
        <div className={`${cardCls} p-5 md:p-6`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                title: "Latest Combined Volume",
                renderVal: (v) => (
                  <span className={`text-[13px] font-bold ${v.combined != null ? "text-[var(--hw-neutral-900)]" : "text-[var(--hw-neutral-400)]"}`}>
                    {formatVol(v.combined)}
                  </span>
                )
              },
              {
                title: "Latest Farm Source Volume",
                renderVal: (v) => (
                  <span className={`text-[13px] font-bold ${v.farm != null ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-400)]"}`}>
                    {formatVol(v.farm)}
                  </span>
                )
              },
              {
                title: "Latest Other Source Volume",
                renderVal: (v) => (
                  <span className={`text-[13px] font-bold ${v.other != null ? "text-amber-700" : "text-[var(--hw-neutral-400)]"}`}>
                    {formatVol(v.other)}
                  </span>
                )
              }
            ].map(({ title, renderVal }, idx) => (
              <div key={title} className={`${idx !== 0 ? "sm:border-l-2 sm:border-[var(--hw-neutral-200)] sm:pl-5" : "sm:pl-0"} flex flex-col justify-between`}>
                <div className="text-[11px] font-bold text-[var(--hw-neutral-500)] uppercase tracking-wider mb-2">{title}</div>
                {priceSummaryRows(aVarietySummaries, renderVal, aShowAll, setAShowAll)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Visualizations: Both Bar Chart & Pie Chart (matching Admin Arrival Pressure) */}
      {isArrivalLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <ChartCardSkeleton height={300} />
          <ChartCardSkeleton height={300} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: Arrival Volume Trend Bar Chart */}
          <div className={`${cardCls} p-6 md:p-8 flex flex-col justify-between`}>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--hw-neutral-900)] mb-0.5">Arrival Volume Trend</h3>
              <p className="text-[12px] text-[var(--hw-neutral-500)] mb-4">
                {aCommodity} · {aVolumeType} by variety · {getPeriodLabel(aDatePreset, aCustomFrom, aCustomTo)} · kg
              </p>
            </div>

            {aChartData.length === 0 ? (
              <div className="w-full flex-1 flex flex-col justify-center items-center py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[var(--hw-neutral-100)] flex items-center justify-center mb-3">
                  <BarChart3 className="w-6 h-6 text-[var(--hw-neutral-400)]" />
                </div>
                <p className="text-[14px] font-semibold text-[var(--hw-neutral-800)]">No arrival volume data available</p>
                <p className="text-[12px] text-[var(--hw-neutral-500)] max-w-xs mt-1">
                  No arrival-volume records for {aCommodity} within the selected date range.
                </p>
              </div>
            ) : (
              <ArrivalVolumeTrendChart
                commodity={aCommodity}
                chartData={aChartData}
                varietyKeys={aVarietyKeys}
                sourceType={aVolumeType}
                height={300}
              />
            )}
          </div>

          {/* Card 2: Arrival Volume Sources Distribution Pie Chart */}
          <div className={`${cardCls} p-6 md:p-8 flex flex-col justify-between`}>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--hw-neutral-900)] mb-0.5">Arrival Volume Sources Distribution</h3>
              <p className="text-[12px] text-[var(--hw-neutral-500)] mb-4">
                Arrival volume breakdown by origin (Farm Source vs Other Sources).
              </p>
            </div>

            <div className="w-full flex-1 flex flex-col justify-center">
              <ArrivalSourcePieChart
                showEmpty={!aSourcesBreakdown || aSourcesBreakdown.length === 0}
                data={aSourcesBreakdown}
                height={300}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Recent Arrival Volume Records Table */}
      <div className="space-y-3">
        <h3 className="text-[14px] font-bold text-[var(--hw-neutral-900)]">Recent Arrival Volume Records</h3>
        {isArrivalLoading ? (
          <TableSkeleton cols={7} rows={5} />
        ) : (
          <div className={`${cardCls} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]">
                    {["Period / Month", "Commodity", "Variety", "Farm Source", "Other Source", "Combined Total", "Unit"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {aPageRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-[var(--hw-neutral-500)]">
                        No arrival-volume records for the selected commodity and date range.
                      </td>
                    </tr>
                  ) : (
                    aPageRows.map((row, i) => (
                      <tr key={i} className="hover:bg-[var(--hw-neutral-50)]/70 transition-colors">
                        <td className="px-4 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap font-medium">{row.month}</td>
                        <td className="px-4 py-3 text-[var(--hw-neutral-900)] font-semibold">{aCommodity}</td>
                        <td className="px-4 py-3 text-[var(--hw-neutral-700)]">{row.variety || "—"}</td>
                        <td className="px-4 py-3 text-[var(--hw-green-700)] font-medium">{formatVol(row.farm)}</td>
                        <td className="px-4 py-3 text-amber-700 font-medium">{formatVol(row.other)}</td>
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3 text-[var(--hw-neutral-600)]">kg</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {aPageRows.length > 0 && (
              <div className="px-4 pb-4">
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
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8">
        <PageHeader
          title="Market Trends"
          description="Explore commodity price trends and arrival volume trends at DFTC markets."
          className="mb-6"
        />
        <div className={`${cardCls} mb-6 overflow-hidden`}>
          <TabNav tab={activeTab} onChange={setActiveTab} />
        </div>
        {activeTab === "price" ? priceTrendsTab : arrivalTrendsTab}
      </div>
    </div>
  );
}

export { DFTCTrends as default };
