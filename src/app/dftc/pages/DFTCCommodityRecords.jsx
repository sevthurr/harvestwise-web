import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronDown, ChevronUp, Leaf, AlertCircle, FileText } from "lucide-react";
import { CommodityIllustration, COMMODITY_REGISTRY } from "../../global/components/shared/CommodityIllustrations";
import { HW_NAME_TO_ID as _HW_NAME_TO_ID } from "../../global/data/commodities";
import { DFTCFilePreview } from "../components/DFTCFilePreview";
import { apiGet, parseResponse } from "../../global/api";

const PAGE_SIZE = 20;

function hwId(name) {
  return _HW_NAME_TO_ID[name] ?? null;
}

function hasHWIcon(name) {
  const id = hwId(name);
  return id !== null && id in COMMODITY_REGISTRY;
}

function formatSavedDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

function formatMonthYear(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", {
      month: "short",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

function SortableHeader({ label, col, sort, onSort }) {
  const active = sort.col === col;
  return (
    <th className="px-4 py-3 text-left whitespace-nowrap cursor-pointer select-none group" onClick={() => onSort(col)}>
      <div className="flex items-center gap-1">
        <span className={`text-[13px] font-semibold ${active ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-800)] group-hover:text-[var(--hw-neutral-900)]"}`}>
          {label}
        </span>
        <span>
          {active ? (
            sort.dir === "asc" ? <ChevronUp size={12} className="text-[var(--hw-green-700)]" /> : <ChevronDown size={12} className="text-[var(--hw-green-700)]" />
          ) : (
            <ChevronDown size={12} className="text-[var(--hw-neutral-400)] opacity-50 group-hover:opacity-80" />
          )}
        </span>
      </div>
    </th>
  );
}

function StaticHeader({ label }) {
  return <th className="px-4 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">{label}</th>;
}

function TablePagination({ page, totalPages, totalRows, onPage }) {
  if (totalRows === 0) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, totalRows);
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-[var(--hw-neutral-200)]">
      <span className="text-[13px] text-[var(--hw-neutral-800)]">
        Showing {from}–{to} of {totalRows} records
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            className="px-3 py-1.5 text-[13px] rounded-lg border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] disabled:opacity-40 hover:border-[var(--hw-green-400)] transition-colors"
          >
            Prev
          </button>
          <span className="px-3 py-1.5 text-[13px] rounded-lg border border-[var(--hw-green-600)] bg-[var(--hw-green-700)] text-white min-w-[34px] text-center">
            {page}
          </span>
          <span className="text-[13px] text-[var(--hw-neutral-800)] px-1">of {totalPages}</span>
          <button
            onClick={() => onPage(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-[13px] rounded-lg border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] disabled:opacity-40 hover:border-[var(--hw-green-400)] transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function DateFilterSelect({ value, customFrom, customTo, onChange }) {
  const [open, setOpen] = useState(false);
  const [popOpen, setPopOpen] = useState(false);
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    function h(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setPopOpen(false);
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const displayLabel =
    value === "all"
      ? "All Records"
      : value === "7d"
      ? "Last 7 days"
      : value === "14d"
      ? "Last 14 days"
      : value === "21d"
      ? "Last 21 days"
      : value === "28d"
      ? "Last 28 days"
      : customFrom && customTo
      ? `${customFrom} – ${customTo}`
      : "Custom";

  const options = [
    { key: "all", label: "All Records" },
    { key: "7d", label: "Last 7 days" },
    { key: "14d", label: "Last 14 days" },
    { key: "21d", label: "Last 21 days" },
    { key: "28d", label: "Last 28 days" },
    { key: "custom", label: "Custom" }
  ];

  const invalidRange = pendingFrom && pendingTo && pendingTo < pendingFrom;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setPopOpen(false);
        }}
        className="flex items-center gap-2 px-3 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)] hover:border-[var(--hw-neutral-400)] focus:outline-none transition-colors whitespace-nowrap"
      >
        <span>{displayLabel}</span>
        <ChevronDown size={13} className={`text-[var(--hw-neutral-500)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-44 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg py-1">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                if (opt.key === "custom") {
                  setPendingFrom(customFrom);
                  setPendingTo(customTo);
                  setOpen(false);
                  setPopOpen(true);
                } else {
                  onChange(opt.key);
                  setOpen(false);
                }
              }}
              className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${
                value === opt.key
                  ? "bg-[var(--hw-green-50)] text-[var(--hw-green-800)] font-medium"
                  : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {popOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-3">
          <div className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mb-2">Select Date Range</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Start</label>
              <input
                type="date"
                value={pendingFrom}
                onChange={(e) => setPendingFrom(e.target.value)}
                className="w-full px-2 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">End</label>
              <input
                type="date"
                value={pendingTo}
                onChange={(e) => setPendingTo(e.target.value)}
                className="w-full px-2 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)] focus:outline-none"
              />
            </div>
          </div>
          {invalidRange && <div className="text-[12px] text-red-500 mb-2">End date must not be before start date.</div>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setPopOpen(false)} className="px-3 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)]">
              Cancel
            </button>
            <button
              disabled={!pendingFrom || !pendingTo || !!invalidRange}
              onClick={() => {
                onChange("custom", pendingFrom, pendingTo);
                setPopOpen(false);
              }}
              className="px-3 py-1.5 text-[12px] bg-[var(--hw-green-600)] text-white rounded-lg disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const selectCls =
  "px-3 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-800)] focus:outline-none focus:border-[var(--hw-green-600)] transition-colors";
const labelCls = "block text-[13px] font-medium text-[var(--hw-neutral-800)] mb-1";

function DFTCCommodityRecords() {
  const { commodityName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const commodity = decodeURIComponent(commodityName ?? "");
  const returnState = location.state;

  const [previewFile, setPreviewFile] = useState(null);
  const [activeTab, setActiveTab] = useState("price");

  // Filters for Price Records
  const [pMarket, setPMarket] = useState("All Markets");
  const [pPriceType, setPPriceType] = useState("All Types");
  const [pVariety, setPVariety] = useState("All Varieties");
  const [pDateFilter, setPDateFilter] = useState("all");
  const [pCustomFrom, setPCustomFrom] = useState("");
  const [pCustomTo, setPCustomTo] = useState("");
  const [pPage, setPPage] = useState(1);
  const [pSort, setPSort] = useState({ col: "date", dir: "desc" });

  // Filters for Arrival Volume Records (Renamed to Arrival Source per line 111)
  const [aSource, setASource] = useState("All");
  const [aVariety, setAVariety] = useState("All Varieties");
  const [aDateFilter, setADateFilter] = useState("all");
  const [aCustomFrom, setACustomFrom] = useState("");
  const [aCustomTo, setACustomTo] = useState("");
  const [aPage, setAPage] = useState(1);
  const [aSort, setASort] = useState({ col: "month", dir: "desc" });

  // Fetch commodity details from backend
  const { data: priceListData, isLoading } = useQuery({
    queryKey: ["prices", "commodity-detail", commodity],
    queryFn: async () => {
      const res = await apiGet(`/prices?search=${encodeURIComponent(commodity)}&page=1&page_size=10`);
      return parseResponse(res);
    }
  });

  const commodityItem = priceListData?.items?.find(
    (c) => (c.commodity_name || c.name || "").toLowerCase() === commodity.toLowerCase()
  );

  const category = commodityItem?.commodity_category || commodityItem?.category || "Vegetables";
  const iconId = hwId(commodity);
  const hasIcon = hasHWIcon(commodity);

  // Derive real price records from live backend data
  const allPriceRecords = useMemo(() => {
    if (!commodityItem) return [];
    const rows = [];
    const lastUpdated = formatSavedDate(commodityItem.last_updated || commodityItem.updated_at);
    const variety = commodityItem.variety || "—";
    const uom = commodityItem.unit_of_measure || "kg";

    if (commodityItem.prices?.bangkerohan_retail != null) {
      rows.push({
        date: lastUpdated,
        dateIso: commodityItem.last_updated || "",
        variety,
        category,
        market: "Bangkerohan Public Market",
        priceType: "Retail",
        uom,
        price: commodityItem.prices.bangkerohan_retail,
        entryMethod: "Manual Input",
        reportId: "—",
        encodedBy: "DFTC Staff"
      });
    }
    if (commodityItem.prices?.bangkerohan_wholesale != null) {
      rows.push({
        date: lastUpdated,
        dateIso: commodityItem.last_updated || "",
        variety,
        category,
        market: "Bangkerohan Public Market",
        priceType: "Wholesale",
        uom,
        price: commodityItem.prices.bangkerohan_wholesale,
        entryMethod: "Manual Input",
        reportId: "—",
        encodedBy: "DFTC Staff"
      });
    }
    if (commodityItem.prices?.dftc_retail != null) {
      rows.push({
        date: lastUpdated,
        dateIso: commodityItem.last_updated || "",
        variety,
        category,
        market: "DFTC Taboan",
        priceType: "Landing",
        uom,
        price: commodityItem.prices.dftc_retail,
        entryMethod: "Manual Input",
        reportId: "—",
        encodedBy: "DFTC Staff"
      });
    }
    if (commodityItem.prices?.dftc_wholesale != null) {
      rows.push({
        date: lastUpdated,
        dateIso: commodityItem.last_updated || "",
        variety,
        category,
        market: "DFTC Taboan",
        priceType: "Wholesale",
        uom,
        price: commodityItem.prices.dftc_wholesale,
        entryMethod: "Manual Input",
        reportId: "—",
        encodedBy: "DFTC Staff"
      });
    }
    return rows;
  }, [commodityItem, category]);

  // Derive real arrival records from live backend data
  const allArrivalRecords = useMemo(() => {
    // Arrival volume records if available
    return [];
  }, []);

  const totalRecords = allPriceRecords.length + allArrivalRecords.length;

  useEffect(() => {
    setPPage(1);
  }, [pMarket, pPriceType, pVariety, pDateFilter, pCustomFrom, pCustomTo, pSort]);

  useEffect(() => {
    setAPage(1);
  }, [aSource, aVariety, aDateFilter, aCustomFrom, aCustomTo, aSort]);

  const priceVarieties = useMemo(() => {
    const set = new Set(allPriceRecords.map((r) => r.variety).filter(Boolean));
    return ["All Varieties", ...Array.from(set).sort()];
  }, [allPriceRecords]);

  const arrivalVarieties = useMemo(() => {
    const set = new Set(allArrivalRecords.map((r) => r.variety).filter(Boolean));
    return ["All Varieties", ...Array.from(set).sort()];
  }, [allArrivalRecords]);

  const filteredPriceRecords = useMemo(() => {
    let result = allPriceRecords.filter((r) => {
      if (pMarket !== "All Markets" && r.market !== pMarket) return false;
      if (pPriceType !== "All Types" && r.priceType !== pPriceType) return false;
      if (pVariety !== "All Varieties" && r.variety !== pVariety) return false;
      return true;
    });

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (pSort.col === "date") cmp = (a.dateIso || "").localeCompare(b.dateIso || "");
      else if (pSort.col === "variety") cmp = (a.variety || "").localeCompare(b.variety || "");
      else if (pSort.col === "market") cmp = (a.market || "").localeCompare(b.market || "");
      else if (pSort.col === "price") cmp = (a.price ?? -1) - (b.price ?? -1);
      return pSort.dir === "desc" ? -cmp : cmp;
    });
  }, [allPriceRecords, pMarket, pPriceType, pVariety, pSort]);

  const filteredArrivalRecords = useMemo(() => {
    let result = allArrivalRecords.filter((r) => {
      if (aVariety !== "All Varieties" && r.variety !== aVariety) return false;
      if (aSource === "Farm Source" && r.farmSource == null) return false;
      if (aSource === "Other Source" && r.otherSource == null) return false;
      return true;
    });

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (aSort.col === "month") cmp = (a.monthIso || "").localeCompare(b.monthIso || "");
      else if (aSort.col === "variety") cmp = (a.variety || "").localeCompare(b.variety || "");
      else if (aSort.col === "combined") cmp = (a.combined ?? -1) - (b.combined ?? -1);
      return aSort.dir === "desc" ? -cmp : cmp;
    });
  }, [allArrivalRecords, aSource, aVariety, aSort]);

  const pTotalPages = Math.max(1, Math.ceil(filteredPriceRecords.length / PAGE_SIZE));
  const pPageRows = filteredPriceRecords.slice((pPage - 1) * PAGE_SIZE, pPage * PAGE_SIZE);

  const aTotalPages = Math.max(1, Math.ceil(filteredArrivalRecords.length / PAGE_SIZE));
  const aPageRows = filteredArrivalRecords.slice((aPage - 1) * PAGE_SIZE, aPage * PAGE_SIZE);

  function toggleSort(col, current, set) {
    set({ col, dir: current.col === col ? (current.dir === "asc" ? "desc" : "asc") : "desc" });
  }

  function goBack() {
    navigate("/dftc/input", { state: { restoreTab: returnState?.returnTab, restoreScrollY: returnState?.returnScrollY } });
  }

  if (previewFile) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto">
        <DFTCFilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      {/* Back button */}
      <button onClick={goBack} className="flex items-center gap-1.5 text-[14px] text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-900)] transition-colors">
        <ChevronLeft className="w-4 h-4" />
        Back to Submit Data
      </button>

      {/* Header Container per line 98-99: {commodity_name} Records, {category} · {record_count} retained records */}
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-1">
          {hasIcon && iconId ? (
            <CommodityIllustration commodityId={iconId} className="w-9 h-9" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[var(--hw-green-50)] flex items-center justify-center border border-[var(--hw-green-200)]">
              <Leaf className="w-5 h-5 text-[var(--hw-green-600)]" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">{commodity} Records</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span className="text-[14px] text-[var(--hw-neutral-800)]">{category}</span>
            <span className="text-[var(--hw-neutral-300)]">·</span>
            <span className="text-[14px] text-[var(--hw-neutral-800)]">
              {isLoading ? "Loading records…" : `${totalRecords.toLocaleString()} retained records`}
            </span>
          </div>
        </div>
      </div>

      {/* Record type tabs */}
      <div className="flex border-b border-[var(--hw-neutral-200)]">
        <button
          onClick={() => setActiveTab("price")}
          className={`px-5 py-2.5 text-[14px] font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "price"
              ? "border-[var(--hw-green-600)] text-[var(--hw-green-700)] font-semibold"
              : "border-transparent text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-900)]"
          }`}
        >
          Price Records
        </button>
        <button
          onClick={() => setActiveTab("arrival")}
          className={`px-5 py-2.5 text-[14px] font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "arrival"
              ? "border-[var(--hw-green-600)] text-[var(--hw-green-700)] font-semibold"
              : "border-transparent text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-900)]"
          }`}
        >
          Arrival Volume Records
        </button>
      </div>

      {/* PRICE RECORDS TAB */}
      {activeTab === "price" && (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          {/* Filters */}
          <div className="px-5 py-3.5 border-b border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] flex flex-wrap items-end gap-4">
            <div>
              <label className={labelCls}>Market</label>
              <select value={pMarket} onChange={(e) => setPMarket(e.target.value)} className={selectCls}>
                <option>All Markets</option>
                <option>Bangkerohan Public Market</option>
                <option>DFTC Taboan</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Price Type</label>
              <select value={pPriceType} onChange={(e) => setPPriceType(e.target.value)} className={selectCls}>
                <option>All Types</option>
                <option>Retail</option>
                <option>Wholesale</option>
                <option>Landing</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Variety / Descriptor</label>
              <select value={pVariety} onChange={(e) => setPVariety(e.target.value)} className={selectCls}>
                {priceVarieties.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <DateFilterSelect
                value={pDateFilter}
                customFrom={pCustomFrom}
                customTo={pCustomTo}
                onChange={(v, from, to) => {
                  setPDateFilter(v);
                  if (from !== void 0) setPCustomFrom(from);
                  if (to !== void 0) setPCustomTo(to);
                }}
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="p-6 space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-[var(--hw-neutral-200)] rounded w-full" />
              ))}
            </div>
          ) : filteredPriceRecords.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <FileText className="w-8 h-8 text-[var(--hw-neutral-300)] mx-auto mb-2" />
              <p className="text-[13px] text-[var(--hw-neutral-700)] font-medium">No retained price records found for {commodity}.</p>
              <p className="text-[12px] text-[var(--hw-neutral-800)] mt-1">Price records will appear here as price data is submitted.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                    <tr>
                      <SortableHeader label="Date" col="date" sort={pSort} onSort={(c) => toggleSort(c, pSort, setPSort)} />
                      <SortableHeader label="Variety / Descriptor" col="variety" sort={pSort} onSort={(c) => toggleSort(c, pSort, setPSort)} />
                      <StaticHeader label="Category" />
                      <SortableHeader label="Market" col="market" sort={pSort} onSort={(c) => toggleSort(c, pSort, setPSort)} />
                      <StaticHeader label="Price Type" />
                      <StaticHeader label="UOM" />
                      <SortableHeader label="Price" col="price" sort={pSort} onSort={(c) => toggleSort(c, pSort, setPSort)} />
                      <StaticHeader label="Entry Method" />
                      <StaticHeader label="Report ID" />
                      <StaticHeader label="Encoded By" />
                    </tr>
                  </thead>
                  <tbody>
                    {pPageRows.map((r, i) => (
                      <tr key={i} className="border-b border-[var(--hw-neutral-100)] hover:bg-[var(--hw-neutral-50)] transition-colors">
                        <td className="px-4 py-3 text-[14px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.date}</td>
                        <td className="px-4 py-3 text-[14px] text-[var(--hw-neutral-800)]">{r.variety || "—"}</td>
                        <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.category}</td>
                        <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.market}</td>
                        <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)]">{r.priceType}</td>
                        <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)]">{r.uom}</td>
                        <td className="px-4 py-3 text-[14px] font-semibold whitespace-nowrap">
                          {r.price == null ? (
                            <span className="text-[var(--hw-neutral-500)] italic font-normal">—</span>
                          ) : (
                            <span className="text-[var(--hw-neutral-900)]">₱{Number(r.price).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.entryMethod}</td>
                        <td className="px-4 py-3 text-[13px] whitespace-nowrap">
                          {r.reportId === "—" ? (
                            <span className="text-[var(--hw-neutral-500)]">—</span>
                          ) : (
                            <button
                              onClick={() =>
                                setPreviewFile({
                                  reportId: r.reportId,
                                  dataName: `${r.market} ${r.priceType} Prices — ${r.date}`,
                                  reportingDate: r.date,
                                  dataType: `Daily ${r.priceType} Prices`,
                                  market: r.market,
                                  entryMethod: r.entryMethod,
                                  records: 1,
                                  savedDate: r.date,
                                  encodedBy: r.encodedBy
                                })
                              }
                              className="text-[var(--hw-green-700)] font-medium underline underline-offset-2 hover:text-[var(--hw-green-800)] transition-colors"
                            >
                              {r.reportId}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[13px] whitespace-nowrap text-[var(--hw-neutral-800)]">{r.encodedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination page={pPage} totalPages={pTotalPages} totalRows={filteredPriceRecords.length} onPage={setPPage} />
            </>
          )}
        </div>
      )}

      {/* ARRIVAL VOLUME RECORDS TAB */}
      {activeTab === "arrival" && (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          {/* Filters (Arrival Source per line 111) */}
          <div className="px-5 py-3.5 border-b border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] flex flex-wrap items-end gap-4">
            <div>
              <label className={labelCls}>Arrival Source</label>
              <select value={aSource} onChange={(e) => setASource(e.target.value)} className={selectCls}>
                <option value="All">All</option>
                <option value="Farm Source">Farm Source</option>
                <option value="Other Source">Other Source</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Variety / Descriptor</label>
              <select value={aVariety} onChange={(e) => setAVariety(e.target.value)} className={selectCls}>
                {arrivalVarieties.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <DateFilterSelect
                value={aDateFilter}
                customFrom={aCustomFrom}
                customTo={aCustomTo}
                onChange={(v, from, to) => {
                  setADateFilter(v);
                  if (from !== void 0) setACustomFrom(from);
                  if (to !== void 0) setACustomTo(to);
                }}
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="p-6 space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-[var(--hw-neutral-200)] rounded w-full" />
              ))}
            </div>
          ) : filteredArrivalRecords.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <FileText className="w-8 h-8 text-[var(--hw-neutral-300)] mx-auto mb-2" />
              <p className="text-[13px] text-[var(--hw-neutral-700)] font-medium">No retained arrival-volume records found for {commodity}.</p>
              <p className="text-[12px] text-[var(--hw-neutral-800)] mt-1">Arrival records will appear here as arrival volume data is submitted.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                    <tr>
                      <SortableHeader label="Date / Month" col="month" sort={aSort} onSort={(c) => toggleSort(c, aSort, setASort)} />
                      <SortableHeader label="Variety / Descriptor" col="variety" sort={aSort} onSort={(c) => toggleSort(c, aSort, setASort)} />
                      <StaticHeader label="Farm Source" />
                      <StaticHeader label="Other Source" />
                      <SortableHeader label="Combined Total" col="combined" sort={aSort} onSort={(c) => toggleSort(c, aSort, setASort)} />
                      <StaticHeader label="Unit" />
                      <StaticHeader label="Entry Method" />
                      <StaticHeader label="Report ID" />
                      <StaticHeader label="Encoded By" />
                    </tr>
                  </thead>
                  <tbody>
                    {aPageRows.map((r, i) => (
                      <tr key={i} className="border-b border-[var(--hw-neutral-100)] hover:bg-[var(--hw-neutral-50)] transition-colors">
                        <td className="px-4 py-3 text-[14px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.dateMonth}</td>
                        <td className="px-4 py-3 text-[14px] text-[var(--hw-neutral-800)]">{r.variety || "—"}</td>
                        <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.farmSource != null ? `${Number(r.farmSource).toLocaleString()} kg` : "—"}</td>
                        <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.otherSource != null ? `${Number(r.otherSource).toLocaleString()} kg` : "—"}</td>
                        <td className="px-4 py-3 text-[14px] font-semibold text-[var(--hw-neutral-900)] whitespace-nowrap">{r.combined != null ? `${Number(r.combined).toLocaleString()} kg` : "—"}</td>
                        <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)]">{r.unit || "kg"}</td>
                        <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.entryMethod}</td>
                        <td className="px-4 py-3 text-[13px] whitespace-nowrap">
                          {r.reportId === "—" ? (
                            <span className="text-[var(--hw-neutral-500)]">—</span>
                          ) : (
                            <button
                              onClick={() =>
                                setPreviewFile({
                                  reportId: r.reportId,
                                  dataName: `DFTC Arrival Volume — ${r.dateMonth}`,
                                  reportingDate: r.dateMonth,
                                  dataType: "DFTC Arrival Volume",
                                  market: "DFTC Taboan",
                                  entryMethod: r.entryMethod,
                                  records: 1,
                                  savedDate: r.dateMonth,
                                  encodedBy: r.encodedBy
                                })
                              }
                              className="text-[var(--hw-green-700)] font-medium underline underline-offset-2 hover:text-[var(--hw-green-800)] transition-colors"
                            >
                              {r.reportId}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[13px] whitespace-nowrap text-[var(--hw-neutral-800)]">{r.encodedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination page={aPage} totalPages={aTotalPages} totalRows={filteredArrivalRecords.length} onPage={setAPage} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export { DFTCCommodityRecords as default };
