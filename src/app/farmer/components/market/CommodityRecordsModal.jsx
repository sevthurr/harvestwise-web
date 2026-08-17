import { useState, useMemo, useEffect, useRef } from "react";
import { X, ChevronDown, ChevronUp, Leaf } from "lucide-react";
import { PRICE_CATEGORIES, ARRIVAL_COMMODITIES } from "../../../dftc/pages/dftc-add-data-data";
import { CommodityIllustration, COMMODITY_REGISTRY } from "./CommodityIllustrations";
import { HW_NAME_TO_ID as _HW_NAME_TO_ID } from "../../../global/data/commodities";
const PAGE_SIZE = 20;
const HW_NAME_TO_ID = _HW_NAME_TO_ID;
const COMMODITY_BASE_PRICES = {
  "Kamatis": 82,
  "Talong": 70,
  "Repolyo": 65,
  "Atsal": 118,
  "Carrots": 85,
  "Pipino": 55,
  "Ampalaya": 75,
  "Kalabasa": 60,
  "Lettuce": 78,
  "Chinese Pechay": 35,
  "Siling Labuyo": 180,
  "Siling Haba": 55,
  "Bawang": 165,
  "Sibuyas": 145,
  "Luya": 95,
  "Kamote": 45,
  "Gabi": 52,
  "Saging Lakatan": 85,
  "Mangga Carabao": 150,
  "Mushroom": 200,
  "Kangkong": 30,
  "Sitaw": 50,
  "Saging": 55,
  "Mangga": 90
};
const ARRIVAL_BASE_VOLUMES = {
  "Kamatis": 2e4,
  "Talong": 15e3,
  "Repolyo": 12e3,
  "Atsal": 4e3,
  "Carrots": 9500,
  "Pipino": 1e4,
  "Ampalaya": 11e3,
  "Kalabasa": 9e3,
  "Lettuce": 6e3,
  "Chinese Pechay": 8e3,
  "Kangkong": 5e3,
  "Sitaw": 7e3,
  "Bawang": 3e3,
  "Sibuyas": 5e3,
  "Kamote": 5500,
  "Saging": 22e3,
  "Mangga": 18e3
};
const PRICE_DATE_POOL = (() => {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const result = [];
  const start = /* @__PURE__ */ new Date("2026-07-03");
  for (let i = 0; i < 31; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    const label = `${MONTHS[d.getMonth()]} ${d.getDate()}, 2026`;
    result.push({ iso, label });
  }
  return result;
})();
const ARRIVAL_MONTHS = [
  { label: "Jan 2026", iso: "2026-01" },
  { label: "Feb 2026", iso: "2026-02" },
  { label: "Mar 2026", iso: "2026-03" },
  { label: "Apr 2026", iso: "2026-04" },
  { label: "May 2026", iso: "2026-05" },
  { label: "Jun 2026", iso: "2026-06" },
  { label: "Jul 2026", iso: "2026-07" }
];
const PRICE_FILE_MAP = {
  "2026-08-02|Retail": { fileId: "DFTC-PR-20260802-001", entryMethod: "Manual Input", userId: "USR-HERMOSO-001" },
  "2026-08-02|Wholesale": { fileId: "DFTC-WS-20260802-001", entryMethod: "File Upload", userId: "USR-BOLODO-002" },
  "2026-07-30|Landing": { fileId: "DFTC-LP-20260730-001", entryMethod: "File Upload", userId: "USR-BOLODO-002" },
  "2026-07-28|Retail": { fileId: "DFTC-PR-20260728-001", entryMethod: "File Upload", userId: "USR-HERMOSO-001" },
  "2026-07-19|Wholesale": { fileId: "DFTC-WS-20260719-001", entryMethod: "Manual Input", userId: "USR-HERMOSO-001" }
};
const ARRIVAL_FILE_MAP = {
  "2026-07": { fileId: "DFTC-AV-20260801-001", entryMethod: "Manual Input", userId: "USR-HERMOSO-001" },
  "2026-06": { fileId: "DFTC-AV-20260727-001", entryMethod: "Manual Input", userId: "USR-BOLODO-002" }
};
const MARKET_COMBOS = [
  { market: "Bangkerohan Public Market", priceType: "Retail" },
  { market: "Bangkerohan Public Market", priceType: "Wholesale" },
  { market: "Bangkerohan Public Market", priceType: "Landing" },
  { market: "DFTC Taboan", priceType: "Retail" },
  { market: "DFTC Taboan", priceType: "Wholesale" }
];
function hashStr(s) {
  return s.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}
function deterministicRandom(seed) {
  const x = Math.sin(seed * 1.7 + 0.3) * 1e4;
  return x - Math.floor(x);
}
function getVarietiesForCommodity(commodity) {
  for (const cat of PRICE_CATEGORIES) {
    const com = cat.commodities.find((c) => c.name === commodity);
    if (com && com.variants.length > 0) return com.variants.map((v) => v.name);
  }
  return [];
}
function getArrivalVarietiesForCommodity(commodity) {
  const com = ARRIVAL_COMMODITIES.find((c) => c.name === commodity);
  if (com && com.variants.length > 0) return com.variants.map((v) => v.name);
  return [];
}
function hasArrivalData(commodity) {
  return ARRIVAL_COMMODITIES.some((c) => c.name === commodity);
}
function formatVol(v) {
  if (v == null) return "\u2014";
  return v.toLocaleString("en-US");
}
function generatePriceRecords(commodity, category) {
  const basePrice = COMMODITY_BASE_PRICES[commodity] ?? 60;
  const varieties = getVarietiesForCommodity(commodity);
  const varietyList = varieties.length > 0 ? varieties : [""];
  const records = [];
  const comSeed = hashStr(commodity);
  PRICE_DATE_POOL.forEach((dateObj, di) => {
    MARKET_COMBOS.forEach(({ market, priceType }, ci) => {
      varietyList.forEach((variety, vi) => {
        const seedStr = `${commodity}|${variety}|${dateObj.iso}|${market}|${priceType}`;
        const seed = hashStr(seedStr);
        const presence = deterministicRandom(seed + 7);
        if (presence < 0.28) return;
        const ptFactor = priceType === "Retail" ? 1 : priceType === "Wholesale" ? 0.8 : 0.65;
        const varFactor = varieties.length > 0 ? 1 - vi * 0.07 + deterministicRandom(comSeed + vi * 31) * 0.05 : 1;
        const wave = (deterministicRandom(seed + 11) - 0.5) * 0.18;
        const rawPrice = basePrice * ptFactor * varFactor * (1 + wave);
        const isNull = deterministicRandom(seed + 5) < 0.06;
        const price = isNull ? null : Math.max(1, Math.round(rawPrice * 100) / 100);
        const fileKey = `${dateObj.iso}|${priceType}`;
        const fileInfo = PRICE_FILE_MAP[fileKey] ?? null;
        const fallbackUserId = (seed + di + vi) % 2 === 0 ? "USR-HERMOSO-001" : "USR-BOLODO-002";
        records.push({
          date: dateObj.label,
          dateIso: dateObj.iso,
          variety: variety || "\u2014",
          category,
          market,
          priceType,
          uom: "kg",
          price,
          entryMethod: fileInfo?.entryMethod ?? "Manual Input",
          fileId: fileInfo?.fileId ?? null,
          encodedUserId: fileInfo?.userId ?? fallbackUserId
        });
      });
    });
  });
  records.sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  return records;
}
function generateArrivalRecords(commodity) {
  if (!hasArrivalData(commodity)) return [];
  const baseVolume = ARRIVAL_BASE_VOLUMES[commodity] ?? 5e3;
  const varieties = getArrivalVarietiesForCommodity(commodity);
  const varietyList = varieties.length > 0 ? varieties : [""];
  const records = [];
  ARRIVAL_MONTHS.forEach(({ label, iso }) => {
    varietyList.forEach((variety, vi) => {
      const seedStr = `${commodity}|${variety}|${iso}`;
      const seed = hashStr(seedStr);
      const isNull = deterministicRandom(seed + 3) < 0.07;
      const fileInfo = ARRIVAL_FILE_MAP[iso] ?? null;
      const fallbackUserId = seed % 2 === 0 ? "USR-HERMOSO-001" : "USR-BOLODO-002";
      let farmSource = null;
      let otherSource = null;
      if (!isNull) {
        const factor = 0.65 + deterministicRandom(seed + 9) * 0.7;
        const total = Math.round(baseVolume * factor * (1 - vi * 0.12));
        const farmRatio = 0.55 + (deterministicRandom(seed + 13) - 0.5) * 0.12;
        farmSource = Math.round(total * farmRatio);
        otherSource = total - farmSource;
      }
      records.push({
        dateMonth: label,
        monthIso: iso,
        variety: variety || "\u2014",
        farmSource,
        otherSource,
        combined: farmSource != null && otherSource != null ? farmSource + otherSource : null,
        unit: "kg",
        entryMethod: fileInfo?.entryMethod ?? "Manual Input",
        fileId: fileInfo?.fileId ?? null,
        encodedUserId: fileInfo?.userId ?? fallbackUserId
      });
    });
  });
  records.sort((a, b) => b.monthIso.localeCompare(a.monthIso));
  return records;
}
function filterPriceByDate(r, df, from, to) {
  if (df === "all") return true;
  if (df === "custom") {
    if (!from || !to) return true;
    return r.dateIso >= from && r.dateIso <= to;
  }
  const days = df === "7d" ? 7 : df === "14d" ? 14 : df === "21d" ? 21 : 28;
  const cutoff = /* @__PURE__ */ new Date("2026-08-02");
  cutoff.setDate(cutoff.getDate() - days + 1);
  const cutoffIso = cutoff.toISOString().split("T")[0];
  return r.dateIso >= cutoffIso;
}
function filterArrivalByDate(r, df, from, to) {
  if (df === "all") return true;
  if (df === "custom") {
    if (!from || !to) return true;
    const fromMonth = from.slice(0, 7);
    const toMonth = to.slice(0, 7);
    return r.monthIso >= fromMonth && r.monthIso <= toMonth;
  }
  const monthCount = df === "7d" ? 1 : df === "14d" ? 2 : df === "21d" ? 3 : 4;
  const allMonths = ARRIVAL_MONTHS.map((m) => m.iso);
  const cutoffIdx = Math.max(0, allMonths.length - monthCount);
  return r.monthIso >= allMonths[cutoffIdx];
}
function sortPriceRecords(records, sort) {
  return [...records].sort((a, b) => {
    let cmp = 0;
    if (sort.col === "date") cmp = a.dateIso.localeCompare(b.dateIso);
    else if (sort.col === "variety") cmp = a.variety.localeCompare(b.variety);
    else if (sort.col === "market") cmp = a.market.localeCompare(b.market);
    else if (sort.col === "price") cmp = (a.price ?? -1) - (b.price ?? -1);
    return sort.dir === "desc" ? -cmp : cmp;
  });
}
function sortArrivalRecords(records, sort) {
  return [...records].sort((a, b) => {
    let cmp = 0;
    if (sort.col === "month") cmp = a.monthIso.localeCompare(b.monthIso);
    else if (sort.col === "variety") cmp = a.variety.localeCompare(b.variety);
    else if (sort.col === "combined") cmp = (a.combined ?? -1) - (b.combined ?? -1);
    return sort.dir === "desc" ? -cmp : cmp;
  });
}
function SortableHeader({ label, col, sort, onSort }) {
  const active = sort.col === col;
  return <th className="px-3 py-3 text-left whitespace-nowrap cursor-pointer select-none group" onClick={() => onSort(col)}>
      <div className="flex items-center gap-1">
        <span className={`text-[11px] font-semibold ${active ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-900)] group-hover:text-[var(--hw-neutral-900)]"}`}>{label}</span>
        <span className="text-[var(--hw-neutral-400)]">
          {active ? sort.dir === "asc" ? <ChevronUp size={11} className="text-[var(--hw-green-700)]" /> : <ChevronDown size={11} className="text-[var(--hw-green-700)]" /> : <ChevronDown size={11} className="opacity-30 group-hover:opacity-60" />}
        </span>
      </div>
    </th>;
}
function StaticHeader({ label }) {
  return <th className="px-3 py-3 text-left text-[11px] font-semibold text-[var(--hw-neutral-900)] whitespace-nowrap">{label}</th>;
}
function ModalPagination({ page, totalPages, totalRows, onPage }) {
  if (totalRows === 0) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, totalRows);
  return <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-[var(--hw-neutral-100)]">
      <span className="text-[11px] text-[var(--hw-neutral-700)]">Showing {from}–{to} of {totalRows} records</span>
      {totalPages > 1 && <div className="flex items-center gap-1">
          <button
    onClick={() => onPage(page - 1)}
    disabled={page === 1}
    className="px-2.5 py-1 text-[11px] rounded border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] disabled:opacity-40 hover:border-[var(--hw-green-400)]"
  >Prev</button>
          <span className="px-2.5 py-1 text-[11px] rounded border border-[var(--hw-green-600)] bg-[var(--hw-green-600)] text-white min-w-[28px] text-center">{page}</span>
          {totalPages > 1 && <span className="text-[12px] text-[var(--hw-neutral-700)] px-1">of {totalPages}</span>}
          <button
    onClick={() => onPage(page + 1)}
    disabled={page === totalPages}
    className="px-2.5 py-1 text-[11px] rounded border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] disabled:opacity-40 hover:border-[var(--hw-green-400)]"
  >Next</button>
        </div>}
    </div>;
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
  const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(iso) {
    const p = iso.split("-");
    return p.length === 3 ? `${MONTHS_SHORT[parseInt(p[1]) - 1]} ${parseInt(p[2])}` : iso;
  }
  const displayLabel = value === "all" ? "All Records" : value === "7d" ? "Last 7 days" : value === "14d" ? "Last 14 days" : value === "21d" ? "Last 21 days" : value === "28d" ? "Last 28 days" : customFrom && customTo ? `${fmtDate(customFrom)}\u2013${fmtDate(customTo)}` : "Custom";
  const options = [
    { key: "all", label: "All Records" },
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
      setOpen(!open);
      setPopOpen(false);
    }}
    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-900)] hover:border-[var(--hw-neutral-400)] focus:outline-none transition-colors whitespace-nowrap"
  >
        <span>{displayLabel}</span>
        <ChevronDown size={12} className={`text-[var(--hw-neutral-500)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="absolute top-full left-0 mt-1 z-50 w-44 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg py-1">
          {options.map((opt) => <button
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
    className={`w-full text-left px-4 py-2 text-[12px] transition-colors ${value === opt.key ? "bg-[var(--hw-green-50)] text-[var(--hw-green-800)] font-medium" : "text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
              {opt.label}
            </button>)}
        </div>}
      {popOpen && <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-3">
          <div className="text-[12px] font-semibold text-[var(--hw-neutral-900)] mb-2">Select Date Range</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[11px] font-medium text-[var(--hw-neutral-900)] mb-1">Start</label>
              <input
    type="date"
    value={pendingFrom}
    onChange={(e) => setPendingFrom(e.target.value)}
    className="w-full px-2 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-900)] focus:outline-none"
  />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--hw-neutral-900)] mb-1">End</label>
              <input
    type="date"
    value={pendingTo}
    onChange={(e) => setPendingTo(e.target.value)}
    className="w-full px-2 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-900)] focus:outline-none"
  />
            </div>
          </div>
          {invalidRange && <div className="text-[11px] text-red-500 mb-2">End date must not be before start date.</div>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setPopOpen(false)} className="px-2.5 py-1 text-[11px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-900)]">Cancel</button>
            <button
    disabled={!pendingFrom || !pendingTo || !!invalidRange}
    onClick={() => {
      onChange("custom", pendingFrom, pendingTo);
      setPopOpen(false);
    }}
    className="px-2.5 py-1 text-[11px] bg-[var(--hw-green-600)] text-white rounded-lg disabled:opacity-50"
  >Apply</button>
          </div>
        </div>}
    </div>;
}
function CommodityRecordsModal({ data, onClose, savedFiles, onOpenFile }) {
  const { commodity, isHW, category, totalRecords } = data;
  const allPriceRecords = useMemo(() => generatePriceRecords(commodity, category), [commodity, category]);
  const allArrivalRecords = useMemo(() => generateArrivalRecords(commodity), [commodity]);
  const hasPriceTab = allPriceRecords.length > 0;
  const hasArrivalTab = allArrivalRecords.length > 0;
  const [activeTab, setActiveTab] = useState(hasPriceTab ? "price" : "arrival");
  const [pMarket, setPMarket] = useState("All Markets");
  const [pPriceType, setPPriceType] = useState("All Types");
  const [pVariety, setPVariety] = useState("All Varieties");
  const [pDateFilter, setPDateFilter] = useState("all");
  const [pCustomFrom, setPCustomFrom] = useState("");
  const [pCustomTo, setPCustomTo] = useState("");
  const [pPage, setPPage] = useState(1);
  const [pSort, setPSort] = useState({ col: "date", dir: "desc" });
  const [aSource, setASource] = useState("All Source Types");
  const [aVariety, setAVariety] = useState("All Varieties");
  const [aDateFilter, setADateFilter] = useState("all");
  const [aCustomFrom, setACustomFrom] = useState("");
  const [aCustomTo, setACustomTo] = useState("");
  const [aPage, setAPage] = useState(1);
  const [aSort, setASort] = useState({ col: "month", dir: "desc" });
  useEffect(() => {
    setPPage(1);
  }, [pMarket, pPriceType, pVariety, pDateFilter, pCustomFrom, pCustomTo, pSort]);
  useEffect(() => {
    setAPage(1);
  }, [aSource, aVariety, aDateFilter, aCustomFrom, aCustomTo, aSort]);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  useEffect(() => {
    function h(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  const priceVarieties = useMemo(() => {
    const set = new Set(allPriceRecords.map((r) => r.variety));
    return ["All Varieties", ...Array.from(set).sort()];
  }, [allPriceRecords]);
  const arrivalVarieties = useMemo(() => {
    const set = new Set(allArrivalRecords.map((r) => r.variety));
    return ["All Varieties", ...Array.from(set).sort()];
  }, [allArrivalRecords]);
  const filteredPriceRecords = useMemo(() => {
    const filtered = allPriceRecords.filter((r) => {
      if (pMarket !== "All Markets" && r.market !== pMarket) return false;
      if (pPriceType !== "All Types" && r.priceType !== pPriceType) return false;
      if (pVariety !== "All Varieties" && r.variety !== pVariety) return false;
      return filterPriceByDate(r, pDateFilter, pCustomFrom, pCustomTo);
    });
    return sortPriceRecords(filtered, pSort);
  }, [allPriceRecords, pMarket, pPriceType, pVariety, pDateFilter, pCustomFrom, pCustomTo, pSort]);
  const filteredArrivalRecords = useMemo(() => {
    const filtered = allArrivalRecords.filter((r) => {
      if (aVariety !== "All Varieties" && r.variety !== aVariety) return false;
      if (aSource === "Farm Source" && r.farmSource == null) return false;
      if (aSource === "Other Source" && r.otherSource == null) return false;
      if (aSource === "Combined Total" && r.combined == null) return false;
      return filterArrivalByDate(r, aDateFilter, aCustomFrom, aCustomTo);
    });
    return sortArrivalRecords(filtered, aSort);
  }, [allArrivalRecords, aSource, aVariety, aDateFilter, aCustomFrom, aCustomTo, aSort]);
  const pTotalPages = Math.max(1, Math.ceil(filteredPriceRecords.length / PAGE_SIZE));
  const pPageRows = filteredPriceRecords.slice((pPage - 1) * PAGE_SIZE, pPage * PAGE_SIZE);
  const aTotalPages = Math.max(1, Math.ceil(filteredArrivalRecords.length / PAGE_SIZE));
  const aPageRows = filteredArrivalRecords.slice((aPage - 1) * PAGE_SIZE, aPage * PAGE_SIZE);
  function toggleSort(col, current, set) {
    if (current.col === col) {
      set({ col, dir: current.dir === "asc" ? "desc" : "asc" });
    } else {
      set({ col, dir: "desc" });
    }
  }
  function findSavedFile(fileId) {
    if (!fileId) return null;
    return savedFiles.find((f) => f.fileId === fileId) ?? null;
  }
  const hasHWIcon = HW_NAME_TO_ID[commodity] != null && HW_NAME_TO_ID[commodity] in COMMODITY_REGISTRY;
  const iconId = HW_NAME_TO_ID[commodity] ?? null;
  const selectCls = "px-2.5 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg bg-white text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-600)] transition-colors";
  return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div
    className="bg-white w-full sm:rounded-2xl shadow-2xl flex flex-col"
    style={{ maxWidth: 1100, height: "100dvh", maxHeight: "100dvh", ["@media (min-width: 640px)"]: { maxHeight: "90vh", height: "auto" } }}
  >

        {
    /* ── Header ── */
  }
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-[var(--hw-neutral-100)] shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              {hasHWIcon && iconId ? <CommodityIllustration commodityId={iconId} size={28} className="shrink-0 mt-0.5" /> : <Leaf size={22} className="text-[var(--hw-green-600)] shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <h2 className="text-[16px] font-bold text-[var(--hw-neutral-900)] leading-snug">
                  {commodity} Records
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="text-[12px] text-[var(--hw-neutral-700)]">{category}</span>
                  <span className="text-[var(--hw-neutral-300)]">·</span>
                  <span className="text-[12px] text-[var(--hw-neutral-700)]">{totalRecords} retained records</span>
                  <span className="text-[var(--hw-neutral-300)]">·</span>
                  {isHW ? <span className="text-[11px] font-medium text-[var(--hw-green-700)] bg-[var(--hw-green-50)] border border-[var(--hw-green-200)] rounded-full px-2 py-0.5">HarvestWise analytics available</span> : <span className="text-[11px] font-medium text-[var(--hw-neutral-700)] bg-[var(--hw-neutral-100)] border border-[var(--hw-neutral-200)] rounded-full px-2 py-0.5">Retained for DFTC monitoring and reporting</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] shrink-0 transition-colors">
              <X className="w-4 h-4 text-[var(--hw-neutral-600)]" />
            </button>
          </div>

          {
    /* Tabs */
  }
          {hasPriceTab && hasArrivalTab && <div className="flex mt-4 border-b border-[var(--hw-neutral-200)] -mb-4">
              {hasPriceTab && <button
    onClick={() => setActiveTab("price")}
    className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${activeTab === "price" ? "border-[var(--hw-green-600)] text-[var(--hw-green-700)]" : "border-transparent text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)]"}`}
  >
                  Price Records
                </button>}
              {hasArrivalTab && <button
    onClick={() => setActiveTab("arrival")}
    className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${activeTab === "arrival" ? "border-[var(--hw-green-600)] text-[var(--hw-green-700)]" : "border-transparent text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)]"}`}
  >
                  Arrival Volume Records
                </button>}
            </div>}
        </div>

        {
    /* ── Content ── */
  }
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">

          {
    /* PRICE RECORDS TAB */
  }
          {activeTab === "price" && hasPriceTab && <div className="flex flex-col flex-1 min-h-0">
              {
    /* Filters */
  }
              <div className="px-5 sm:px-6 py-3 border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)] flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--hw-neutral-900)] mb-1">Market</label>
                  <select value={pMarket} onChange={(e) => setPMarket(e.target.value)} className={selectCls}>
                    <option>All Markets</option>
                    <option>Bangkerohan Public Market</option>
                    <option>DFTC Taboan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--hw-neutral-900)] mb-1">Price Type</label>
                  <select value={pPriceType} onChange={(e) => setPPriceType(e.target.value)} className={selectCls}>
                    <option>All Types</option>
                    <option>Retail</option>
                    <option>Wholesale</option>
                    <option>Landing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--hw-neutral-900)] mb-1">Variety / Descriptor</label>
                  <select value={pVariety} onChange={(e) => setPVariety(e.target.value)} className={selectCls}>
                    {priceVarieties.map((v) => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--hw-neutral-900)] mb-1">Date</label>
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

              {
    /* Table */
  }
              <div className="flex-1 overflow-auto">
                <table className="w-full text-[12px] min-w-max">
                  <thead className="sticky top-0 bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)] z-10">
                    <tr>
                      <SortableHeader label="Date" col="date" sort={pSort} onSort={(col) => toggleSort(col, pSort, setPSort)} />
                      <SortableHeader label="Variety / Descriptor" col="variety" sort={pSort} onSort={(col) => toggleSort(col, pSort, setPSort)} />
                      <StaticHeader label="Category" />
                      <SortableHeader label="Market" col="market" sort={pSort} onSort={(col) => toggleSort(col, pSort, setPSort)} />
                      <StaticHeader label="Price Type" />
                      <StaticHeader label="UOM" />
                      <SortableHeader label="Price" col="price" sort={pSort} onSort={(col) => toggleSort(col, pSort, setPSort)} />
                      <StaticHeader label="Entry Method" />
                      <StaticHeader label="File ID" />
                      <StaticHeader label="Encoded User ID" />
                    </tr>
                  </thead>
                  <tbody>
                    {pPageRows.length === 0 ? <tr><td colSpan={10} className="px-4 py-8 text-center text-[var(--hw-neutral-500)]">No records match the selected filters.</td></tr> : pPageRows.map((r, i) => {
    const file = findSavedFile(r.fileId);
    return <tr key={i} className="border-b border-[var(--hw-neutral-100)] hover:bg-[var(--hw-neutral-50)] transition-colors">
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-900)] whitespace-nowrap">{r.date}</td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-900)]">{r.variety}</td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-900)] whitespace-nowrap">{r.category}</td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-900)] whitespace-nowrap">{r.market}</td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-900)]">{r.priceType}</td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-900)]">{r.uom}</td>
                              <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                                {r.price == null ? <span className="text-[var(--hw-neutral-500)] italic">Blank</span> : <span className="text-[var(--hw-neutral-900)]">₱{r.price.toFixed(2)}</span>}
                              </td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-900)] whitespace-nowrap">{r.entryMethod}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                {r.fileId ? file ? <button onClick={() => onOpenFile(file)} className="text-[var(--hw-green-700)] underline underline-offset-1 font-medium hover:text-[var(--hw-green-800)]">{r.fileId}</button> : <span className="text-[var(--hw-neutral-900)]">{r.fileId}</span> : <span className="text-[var(--hw-neutral-900)]">—</span>}
                              </td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-900)] whitespace-nowrap">{r.encodedUserId}</td>
                            </tr>;
  })}
                  </tbody>
                </table>
              </div>

              <ModalPagination page={pPage} totalPages={pTotalPages} totalRows={filteredPriceRecords.length} onPage={setPPage} />
            </div>}

          {
    /* ARRIVAL VOLUME RECORDS TAB */
  }
          {activeTab === "arrival" && hasArrivalTab && <div className="flex flex-col flex-1 min-h-0">
              {
    /* Filters */
  }
              <div className="px-5 sm:px-6 py-3 border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)] flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--hw-neutral-900)] mb-1">Source Type</label>
                  <select value={aSource} onChange={(e) => setASource(e.target.value)} className={selectCls}>
                    <option>All Source Types</option>
                    <option>Farm Source</option>
                    <option>Other Source</option>
                    <option>Combined Total</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--hw-neutral-900)] mb-1">Variety / Descriptor</label>
                  <select value={aVariety} onChange={(e) => setAVariety(e.target.value)} className={selectCls}>
                    {arrivalVarieties.map((v) => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--hw-neutral-900)] mb-1">Date</label>
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

              {
    /* Table */
  }
              <div className="flex-1 overflow-auto">
                <table className="w-full text-[12px] min-w-max">
                  <thead className="sticky top-0 bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)] z-10">
                    <tr>
                      <SortableHeader label="Date / Month" col="month" sort={aSort} onSort={(col) => toggleSort(col, aSort, setASort)} />
                      <SortableHeader label="Variety / Descriptor" col="variety" sort={aSort} onSort={(col) => toggleSort(col, aSort, setASort)} />
                      <StaticHeader label="Farm Source" />
                      <StaticHeader label="Other Source" />
                      <SortableHeader label="Combined Total" col="combined" sort={aSort} onSort={(col) => toggleSort(col, aSort, setASort)} />
                      <StaticHeader label="Unit" />
                      <StaticHeader label="Entry Method" />
                      <StaticHeader label="File ID" />
                      <StaticHeader label="Encoded User ID" />
                    </tr>
                  </thead>
                  <tbody>
                    {aPageRows.length === 0 ? <tr><td colSpan={9} className="px-4 py-8 text-center text-[var(--hw-neutral-500)]">No records match the selected filters.</td></tr> : aPageRows.map((r, i) => {
    const file = findSavedFile(r.fileId);
    return <tr key={i} className="border-b border-[var(--hw-neutral-100)] hover:bg-[var(--hw-neutral-50)] transition-colors">
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-900)] whitespace-nowrap">{r.dateMonth}</td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-900)]">{r.variety}</td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-900)]">{formatVol(r.farmSource)}</td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-900)]">{formatVol(r.otherSource)}</td>
                              <td className="px-3 py-2.5 font-semibold text-[var(--hw-neutral-900)]">{formatVol(r.combined)}</td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-900)]">{r.unit}</td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-900)] whitespace-nowrap">{r.entryMethod}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                {r.fileId ? file ? <button onClick={() => onOpenFile(file)} className="text-[var(--hw-green-700)] underline underline-offset-1 font-medium hover:text-[var(--hw-green-800)]">{r.fileId}</button> : <span className="text-[var(--hw-neutral-900)]">{r.fileId}</span> : <span className="text-[var(--hw-neutral-900)]">—</span>}
                              </td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-900)] whitespace-nowrap">{r.encodedUserId}</td>
                            </tr>;
  })}
                  </tbody>
                </table>
              </div>

              <ModalPagination page={aPage} totalPages={aTotalPages} totalRows={filteredArrivalRecords.length} onPage={setAPage} />
            </div>}

          {!hasPriceTab && !hasArrivalTab && <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <div className="text-[14px] font-semibold text-[var(--hw-neutral-900)] mb-1">No Records Found</div>
                <p className="text-[13px] text-[var(--hw-neutral-600)]">No retained records are available for this commodity.</p>
              </div>
            </div>}
        </div>

        {
    /* ── Footer ── */
  }
        <div className="px-5 sm:px-6 py-4 border-t border-[var(--hw-neutral-100)] shrink-0">
          <button
    onClick={onClose}
    className="px-5 py-2.5 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            Close
          </button>
        </div>
      </div>
    </div>;
}
export {
  CommodityRecordsModal
};
