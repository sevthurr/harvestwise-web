import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  Plus,
  Check,
  AlertCircle,
  Cloud,
  CloudOff,
  Info,
  CheckCircle2,
  Leaf,
  ArrowLeft
} from "lucide-react";
import {
  PRICE_CATEGORIES,
  UOM_OPTIONS
} from "./dftc-add-data-data";
import { CommodityIllustration, COMMODITY_REGISTRY } from "../../global/components/shared/CommodityIllustrations";
import { HW_NAME_TO_ID as _HW_NAME_TO_ID } from "../../global/data/commodities";
import { apiPost, parseResponse } from "../../global/api";

function hwId(name) {
  return _HW_NAME_TO_ID[name] ?? null;
}
function hasHWIcon(name) {
  const id = hwId(name);
  return id !== null && id in COMMODITY_REGISTRY;
}

const CATEGORY_OPTIONS = [
  { id: "lowland", name: "Lowland Vegetables" },
  { id: "highland", name: "Highland Vegetables" },
  { id: "spices", name: "Spices" },
  { id: "rootcrops", name: "Rootcrops" },
  { id: "fruits", name: "Fruits" },
  { id: "others", name: "Others" }
];

const EMPTY_SAMPLES = ["", "", "", "", ""];

function emptyField(uom = "kg") {
  return { samples: [...EMPTY_SAMPLES], uom, low: null, high: null, prevailing: null };
}

function formatDateLabel(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function generateDataName(setup) {
  const dateStr = formatDateLabel(setup.date);
  const marketShort = setup.market.includes("Bangkerohan") ? "Bangkerohan" : "DFTC";
  return `${marketShort} ${setup.priceType} Prices \u2014 ${dateStr}`;
}

/** Returns true if at least one sample is a valid non-empty number */
function hasValue(f) {
  return (f.samples ?? []).some((s) => s !== "" && !isNaN(parseFloat(s)));
}

/** Parse valid (non-blank) sample prices from a samples array */
function parseValid(samples) {
  return (samples ?? [])
    .map((s) => (s === "" ? NaN : parseFloat(s)))
    .filter((n) => !isNaN(n));
}

/**
 * Compute Low, High, Prevailing from 5 sample strings.
 * Returns { low, high, prevailing } — each is number|null.
 */
function computePrices(samples) {
  const valid = parseValid(samples);
  if (valid.length === 0) return { low: null, high: null, prevailing: null };

  const low = Math.min(...valid);
  const high = Math.max(...valid);

  // Frequency map
  const freq = {};
  for (const v of valid) {
    freq[v] = (freq[v] ?? 0) + 1;
  }
  const maxFreq = Math.max(...Object.values(freq));

  let prevailing;
  if (maxFreq > 1) {
    // Tied-most-frequent → average of tied prices
    const tied = Object.entries(freq)
      .filter(([, f]) => f === maxFreq)
      .map(([p]) => parseFloat(p));
    prevailing = tied.reduce((a, b) => a + b, 0) / tied.length;
  } else {
    // All unique
    const sorted = [...valid].sort((a, b) => a - b);
    const n = sorted.length;
    if (n % 2 === 1) {
      prevailing = sorted[Math.floor(n / 2)];
    } else {
      prevailing = (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    }
  }

  return { low, high, prevailing };
}

function fmt(val) {
  if (val === null || val === undefined) return "—";
  return Number(val).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── SetupModal ──────────────────────────────────────────────────────────────
function SetupModal({ initial, onClose, onApply }) {
  const [market, setMarket] = useState(initial.market);
  const [priceType, setPriceType] = useState(initial.priceType);
  const [changingDate, setChangingDate] = useState(false);
  const [customDate, setCustomDate] = useState(initial.date);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const priceMarkets = ["Bangkerohan Public Market", "DFTC Taboan"];
  const priceTypes = ["Retail", "Wholesale", "Landing"];

  function handleApply() {
    const date = changingDate ? customDate : initial.date;
    onApply({ ...initial, market, priceType, date });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--hw-neutral-100)]">
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Change Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)]">
            <X className="w-4 h-4 text-[var(--hw-neutral-600)]" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Market</label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
            >
              {priceMarkets.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Price Type</label>
            <div className="flex gap-2">
              {priceTypes.map((pt) => (
                <button
                  key={pt}
                  onClick={() => setPriceType(pt)}
                  className={`flex-1 py-2 rounded-xl border text-[13px] font-medium transition-colors ${priceType === pt ? "border-[var(--hw-green-700)] bg-[var(--hw-green-50)] text-[var(--hw-green-800)]" : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"}`}
                >
                  {pt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Reporting Date</label>
            {changingDate ? (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
                />
                <button
                  onClick={() => { setChangingDate(false); setCustomDate(initial.date); }}
                  className="text-[12px] text-[var(--hw-green-700)] underline whitespace-nowrap"
                >
                  Reset
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]">
                <span className="text-[13px] text-[var(--hw-neutral-900)]">{formatDateLabel(initial.date)}</span>
                <button onClick={() => setChangingDate(true)} className="text-[12px] text-[var(--hw-green-700)] underline ml-3 shrink-0">
                  Change Date
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors">
            Cancel
          </button>
          <button onClick={handleApply} className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors">
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AddCommodityModal ───────────────────────────────────────────────────────
function AddCommodityModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("lowland");
  const [variant, setVariant] = useState("");
  const [uom, setUom] = useState("kg");
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function handleAdd() {
    if (!name.trim()) { setError("Commodity name is required."); return; }
    const result = onAdd(name.trim(), categoryId, variant.trim(), uom);
    if (result) { setError(result); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--hw-neutral-100)]">
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Add New Commodity</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)]">
            <X className="w-4 h-4 text-[var(--hw-neutral-600)]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Commodity Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="e.g. Batong (Negrostar)"
              className={`w-full px-3 py-2.5 rounded-xl border text-[13px] text-[var(--hw-neutral-900)] bg-white focus:outline-none focus:border-[var(--hw-green-700)] ${error && !name.trim() ? "border-red-400" : "border-[var(--hw-neutral-200)]"}`}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Source Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
            >
              {CATEGORY_OPTIONS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">
              Initial Variant / Descriptor
              <span className="text-[12px] text-[var(--hw-neutral-800)] ml-1.5 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              placeholder="e.g. Regular, Local, Large"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Default Unit of Measurement</label>
            <select
              value={uom}
              onChange={(e) => setUom(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
            >
              {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>

          {error && (
            <p className="text-[12px] text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </p>
          )}

          <p className="text-[13px] text-[var(--hw-neutral-800)]">
            Newly added commodities are not automatically included in HarvestWise analytics. They will be securely retained in all reports and downloads.
          </p>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors">
            Cancel
          </button>
          <button onClick={handleAdd} className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors">
            Add Commodity
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Info overlays ───────────────────────────────────────────────────────────
function HWInfoOverlay({ onClose }) {
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="absolute bg-white rounded-xl shadow-[var(--shadow-lg)] p-4 border border-[var(--hw-neutral-200)] max-w-xs"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hw-green-700)] shrink-0" />
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">Supported by HarvestWise</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-0.5 rounded hover:bg-[var(--hw-neutral-100)]">
            <X className="w-3.5 h-3.5 text-[var(--hw-neutral-600)]" />
          </button>
        </div>
        <p className="text-[11px] text-[var(--hw-neutral-800)] leading-relaxed">
          This commodity receives price-trend analytics, forecasting, and farmer-facing decision support from HarvestWise.
        </p>
      </div>
    </div>
  );
}

function AnalyticsCoverageOverlay({ onClose }) {
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="absolute bg-white rounded-xl shadow-[var(--shadow-lg)] p-4 border border-[var(--hw-neutral-200)] max-w-sm"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[var(--hw-green-700)] shrink-0" />
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">About Analytics Coverage</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-0.5 rounded hover:bg-[var(--hw-neutral-100)]">
            <X className="w-3.5 h-3.5 text-[var(--hw-neutral-600)]" />
          </button>
        </div>
        <p className="text-[12px] text-[var(--hw-neutral-800)] leading-relaxed mb-3">
          HarvestWise currently provides analytics and price-trend support for{" "}
          <strong>Kamatis, Talong, Repolyo, Atsal, Carrots, Pipino, Ampalaya, Kalabasa, Lettuce, and Chinese Pechay.</strong>
        </p>
        <p className="text-[12px] text-[var(--hw-neutral-800)] leading-relaxed">
          Records for all other commodities are securely saved and remain available in reports and downloads. Analytics support continues to expand over time.
        </p>
        <button onClick={onClose} className="mt-3 text-[12px] text-[var(--hw-green-700)] underline">Close</button>
      </div>
    </div>
  );
}

// ─── Computed pill ───────────────────────────────────────────────────────────
function ComputedCell({ label, value, accent }) {
  const colors = accent
    ? "bg-[var(--hw-green-50)] border-[var(--hw-green-300)] text-[var(--hw-green-800)]"
    : "bg-[var(--hw-neutral-50)] border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)]";
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border px-3 py-1.5 flex-1 min-w-[76px] max-w-[110px] text-center ${colors}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-75 mb-0.5">{label}</span>
      <span className="text-[12px] font-bold">
        {value !== null ? `₱${fmt(value)}` : <span className="opacity-40 font-normal">—</span>}
      </span>
    </div>
  );
}

// ─── Mobile variant row ──────────────────────────────────────────────────────
function MobileVariantRow({ v, f, onUpdateSample, onUpdateUom }) {
  const [expanded, setExpanded] = useState(false);
  const hasVal = hasValue(f);
  const { low, high, prevailing } = f;

  return (
    <div className={`border-b border-[var(--hw-neutral-50)] last:border-0 ${hasVal ? "bg-[var(--hw-green-50)]/30" : ""}`}>
      {/* Variant header row — tappable */}
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[var(--hw-neutral-50)] transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-medium text-[var(--hw-neutral-800)] truncate">{v.name}</span>
          {hasVal && (
            <span className="shrink-0 text-[10px] font-semibold text-[var(--hw-green-700)] bg-[var(--hw-green-50)] border border-[var(--hw-green-200)] rounded px-1.5 py-0.5">
              {parseValid(f.samples).length} sample{parseValid(f.samples).length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {hasVal && prevailing !== null && (
            <span className="text-[12px] font-bold text-[var(--hw-green-800)]">₱{fmt(prevailing)}</span>
          )}
          {expanded
            ? <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-500)]" />
            : <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-500)]" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3.5 bg-[var(--hw-neutral-50)]/40 border-t border-[var(--hw-neutral-100)]">
          {/* UoM */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-medium text-[var(--hw-neutral-700)]">Unit of Measurement</span>
            <select
              value={f.uom || "kg"}
              onChange={(e) => onUpdateUom(e.target.value)}
              className="w-36 px-2.5 py-1.5 rounded-xl border border-[var(--hw-neutral-200)] text-[12px] text-[var(--hw-neutral-900)] bg-white focus:outline-none focus:border-[var(--hw-green-700)]"
            >
              {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>

          {/* Sample inputs — vertically stacked */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide block">Sample Prices</span>
            <div className="space-y-1.5">
              {f.samples.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3 bg-white p-2 rounded-xl border border-[var(--hw-neutral-200)]">
                  <span className="text-[12px] font-medium text-[var(--hw-neutral-700)]">Sample {i + 1}</span>
                  <div className="flex items-center border border-[var(--hw-neutral-200)] rounded-lg overflow-hidden focus-within:border-[var(--hw-green-600)] bg-white h-8 w-36">
                    <span className="px-2 text-[11px] text-[var(--hw-neutral-500)] border-r border-[var(--hw-neutral-200)] h-full flex items-center shrink-0">₱</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={s}
                      onChange={(e) => onUpdateSample(i, e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-2 text-[12px] text-[var(--hw-neutral-900)] focus:outline-none min-w-0 bg-transparent text-right pr-2.5"
                      style={{ MozAppearance: "textfield" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Computed — centered */}
          <div className="pt-1">
            <span className="text-[11px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide block text-center mb-2">Computed Prices</span>
            <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
              <ComputedCell label="Low" value={low} />
              <ComputedCell label="High" value={high} />
              <ComputedCell label="Prevailing" value={prevailing} accent />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
function DFTCPriceInput() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state;
  const defaultSetup = navState ?? {
    dataType: "Price Data",
    market: "Bangkerohan Public Market",
    priceType: "Retail",
    date: "2026-08-02"
  };

  const [setup, setSetup] = useState(defaultSetup);
  const [setupModalOpen, setSetupModalOpen] = useState(!navState);
  const [fields, setFields] = useState({});
  const [collapsed, setCollapsed] = useState(new Set());
  const [customVariants, setCustomVariants] = useState({});
  const [addingVariant, setAddingVariant] = useState(null);
  const [variantInput, setVariantInput] = useState("");
  const [customCommodities, setCustomCommodities] = useState({});
  const [addCommodityOpen, setAddCommodityOpen] = useState(false);
  const [hwInfoId, setHwInfoId] = useState(null);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMode, setShowMode] = useState("all");
  const [saveStatus, setSaveStatus] = useState("idle");
  const saveTimer = useRef(null);
  const oldTimer = useRef(null);
  const [hasDraft, setHasDraft] = useState(() => {
    try { return localStorage.getItem("dftc_price_draft") === "true"; } catch { return false; }
  });
  const [draftDismissed, setDraftDismissed] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [dataName, setDataName] = useState(() => generateDataName(defaultSetup));
  const [saved, setSaved] = useState(false);

  const triggerAutosave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (oldTimer.current) clearTimeout(oldTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(() => {
      setSaveStatus("saved");
      try { localStorage.setItem("dftc_price_draft", "true"); } catch { }
      oldTimer.current = setTimeout(() => setSaveStatus("savedOld"), 30000);
    }, 1500);
  }, []);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (oldTimer.current) clearTimeout(oldTimer.current);
  }, []);

  function getField(variantId, defaultUom = "kg") {
    return fields[variantId] ?? emptyField(defaultUom);
  }

  function updateSample(variantId, sampleIdx, value) {
    setFields((prev) => {
      const existing = prev[variantId] ?? emptyField();
      const newSamples = [...existing.samples];
      newSamples[sampleIdx] = value;
      const computed = computePrices(newSamples);
      return {
        ...prev,
        [variantId]: { ...existing, samples: newSamples, ...computed }
      };
    });
    triggerAutosave();
  }

  function updateUom(variantId, uom) {
    setFields((prev) => ({
      ...prev,
      [variantId]: { ...(prev[variantId] ?? emptyField(uom)), uom }
    }));
    triggerAutosave();
  }

  function toggleCategory(catId) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  function collapseAll() {
    setCollapsed(new Set(PRICE_CATEGORIES.map((c) => c.id)));
  }

  function getAllCommodities(cat) {
    return [...cat.commodities, ...customCommodities[cat.id] ?? []];
  }

  function getVariants(com) {
    return [...com.variants, ...customVariants[com.id] ?? []];
  }

  function commitVariant(commodityId) {
    const trimmed = variantInput.trim();
    if (!trimmed) { setAddingVariant(null); setVariantInput(""); return; }
    const newId = `custom-${commodityId}-${Date.now()}`;
    setCustomVariants((prev) => ({
      ...prev,
      [commodityId]: [...prev[commodityId] ?? [], { id: newId, name: trimmed }]
    }));
    setAddingVariant(null);
    setVariantInput("");
    triggerAutosave();
  }

  function handleAddCommodity(name, categoryId, variant, uom) {
    const cat = PRICE_CATEGORIES.find((c) => c.id === categoryId);
    const existingNames = [
      ...cat?.commodities ?? [],
      ...customCommodities[categoryId] ?? []
    ].map((c) => c.name.toLowerCase().trim());
    if (existingNames.includes(name.toLowerCase())) {
      return `"${name}" already exists in that category.`;
    }
    const newId = `custom-com-${categoryId}-${Date.now()}`;
    const variantId = `custom-v-${newId}`;
    const variantName = variant || "Regular";
    const newCom = {
      id: newId,
      name,
      isHW: false,
      variants: [{ id: variantId, name: variantName }]
    };
    setFields((prev) => ({ ...prev, [variantId]: emptyField(uom) }));
    setCustomCommodities((prev) => ({
      ...prev,
      [categoryId]: [...prev[categoryId] ?? [], newCom]
    }));
    return null;
  }

  function matchesCommodity(com, variants) {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return com.name.toLowerCase().includes(q) || variants.some((v) => v.name.toLowerCase().includes(q));
  }

  function matchesVariant(com, v) {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return com.name.toLowerCase().includes(q) || v.name.toLowerCase().includes(q);
  }

  const enteredCount = Object.values(fields).filter(hasValue).length;

  const reviewEntries = PRICE_CATEGORIES.flatMap((cat) =>
    getAllCommodities(cat).flatMap((com) =>
      getVariants(com)
        .filter((v) => hasValue(getField(v.id)))
        .map((v) => ({ cat, com, v, f: getField(v.id) }))
    )
  );

  const hwCount = reviewEntries.filter((e) => e.com.isHW).length;
  const otherCount = reviewEntries.filter((e) => !e.com.isHW).length;
  const canReview = reviewEntries.length > 0;

  async function handleSave() {
    const records = reviewEntries.map(({ com, v, f }) => ({
      commodity_id: com.name,
      variety: v.name,
      uom: f.uom,
      sample_prices: parseValid(f.samples),
      price_avg: f.prevailing,
      observation_status: "Reported value"
    }));

    const payload = {
      data_type: "price",
      source_id: setup.market,
      price_type: setup.priceType,
      reporting_date: setup.date,
      records
    };

    try {
      await parseResponse(await apiPost("/dftc/submissions/manual", payload));
      try { localStorage.removeItem("dftc_price_draft"); } catch { }
      setSaved(true);
      setTimeout(() => {
        navigate("/dftc/input", {
          state: { successMsg: `${dataName} saved successfully.` }
        });
      }, 1000);
    } catch {
      setSaveStatus("offline");
      try { localStorage.setItem("dftc_price_draft", "true"); } catch { }
      setTimeout(() => {
        navigate("/dftc/input", {
          state: { errorMsg: "Could not save to server. Your draft was kept on this device." }
        });
      }, 1200);
    }
  }

  function SaveStatusIndicator() {
    if (saveStatus === "idle") return null;
    return (
      <div className="flex items-center gap-1.5 text-[12px]">
        {saveStatus === "saving" && <><Cloud className="w-3.5 h-3.5 text-[var(--hw-neutral-400)] animate-pulse" /><span className="text-[var(--hw-neutral-800)]">Saving…</span></>}
        {saveStatus === "saved" && <><Check className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-700">Saved just now</span></>}
        {saveStatus === "savedOld" && <><Cloud className="w-3.5 h-3.5 text-[var(--hw-neutral-400)]" /><span className="text-[var(--hw-neutral-800)]">Saved on this device</span></>}
        {saveStatus === "offline" && <><CloudOff className="w-3.5 h-3.5 text-amber-600" /><span className="text-amber-700">Offline — changes saved on this device</span></>}
      </div>
    );
  }

  // ─── Review mode ────────────────────────────────────────────────────────────
  if (reviewMode) {
    const byCategory = PRICE_CATEGORIES.map((cat) => ({
      cat,
      entries: getAllCommodities(cat).flatMap((com) =>
        getVariants(com)
          .filter((v) => hasValue(getField(v.id)))
          .map((v) => ({ com, v, f: getField(v.id) }))
      )
    })).filter((g) => g.entries.length > 0);

    return (
      <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto" style={{ overflowX: "hidden" }}>
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => setReviewMode(false)}
            className="p-1.5 -ml-1.5 rounded-xl hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] transition-colors"
            title="Back to full entry"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">Add Price Data</h1>
          </div>
        </div>
        <p className="text-[13px] text-[var(--hw-neutral-700)] mb-4 pl-8">
          {setup.market} · {setup.priceType} · {formatDateLabel(setup.date)}
        </p>

        <div className="flex items-center gap-2 text-[13px] text-[var(--hw-neutral-700)] mb-5">
          <Info className="w-4 h-4 text-[var(--hw-neutral-500)] shrink-0" />
          <span>Showing only commodities with entered values. Review and edit before saving.</span>
        </div>

        <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-3 mb-5">
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[12px]">
            <span className="text-[var(--hw-neutral-800)]"><strong className="font-semibold">{reviewEntries.length}</strong> Total Records</span>
            <span className="text-[var(--hw-neutral-800)]"><strong className="font-semibold text-[var(--hw-green-700)]">{hwCount}</strong> Analytics-Supported Commodity Records</span>
            {otherCount > 0 && <span className="text-[var(--hw-neutral-800)]"><strong className="font-semibold">{otherCount}</strong> Other Commodity Records</span>}
          </div>
        </div>

        {/* Review table */}
        <div
          className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden mb-5"
          style={{ overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style>{`.hw-no-scroll::-webkit-scrollbar { display: none; }`}</style>

          {byCategory.map(({ cat, entries }) => (
            <div key={cat.id}>
              <div className="px-4 py-2.5 bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                <span className="text-[11px] font-semibold text-[var(--hw-neutral-800)] uppercase tracking-wide">{cat.name}</span>
              </div>

              {/* Desktop review rows */}
              <div className="hidden md:block divide-y divide-[var(--hw-neutral-100)]">
                {entries.map(({ com, v, f }) => (
                  <div
                    key={v.id}
                    className="grid gap-2.5 items-end px-4 py-3 hover:bg-[var(--hw-neutral-50)] transition-colors"
                    style={{ gridTemplateColumns: "1fr 88px repeat(5, 82px) 84px 84px 96px" }}
                  >
                    {/* Commodity / Variant */}
                    <div className="flex flex-col justify-center pb-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {com.isHW && hasHWIcon(com.name)
                          ? <CommodityIllustration commodityId={hwId(com.name)} className="w-4 h-4 shrink-0" />
                          : <Leaf className={`w-3.5 h-3.5 shrink-0 ${com.isHW ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-400)]"}`} />}
                        <span className="text-[12px] font-semibold text-[var(--hw-neutral-800)] truncate">{com.name}</span>
                        <span className="text-[12px] text-[var(--hw-neutral-500)] truncate">· {v.name}</span>
                      </div>
                    </div>

                    {/* UoM */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wide">Unit</span>
                      <select
                        value={f.uom ?? "kg"}
                        onChange={(e) => updateUom(v.id, e.target.value)}
                        className="w-full h-8 px-2 rounded-lg border border-[var(--hw-neutral-200)] text-[11px] text-[var(--hw-neutral-900)] bg-white focus:outline-none focus:border-[var(--hw-green-700)]"
                      >
                        {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                      </select>
                    </div>

                    {/* Sample values read-only in review */}
                    {f.samples.map((s, i) => (
                      <div key={i} className="flex flex-col gap-1 items-center">
                        <span className="text-[10px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wide">Sample {i + 1}</span>
                        <div className="w-full h-8 flex items-center justify-center rounded-lg border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]/50 px-1">
                          <span className="text-[11px] text-[var(--hw-neutral-800)]">
                            {s !== "" && !isNaN(parseFloat(s)) ? `₱${fmt(parseFloat(s))}` : <span className="text-[var(--hw-neutral-300)]">—</span>}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Low */}
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-[10px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wide">Low</span>
                      <div className="w-full h-8 flex items-center justify-center rounded-lg bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] px-1">
                        <span className="text-[11px] text-[var(--hw-neutral-700)] font-semibold">
                          {f.low !== null ? `₱${fmt(f.low)}` : <span className="text-[var(--hw-neutral-300)] font-normal">—</span>}
                        </span>
                      </div>
                    </div>

                    {/* High */}
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-[10px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wide">High</span>
                      <div className="w-full h-8 flex items-center justify-center rounded-lg bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] px-1">
                        <span className="text-[11px] text-[var(--hw-neutral-700)] font-semibold">
                          {f.high !== null ? `₱${fmt(f.high)}` : <span className="text-[var(--hw-neutral-300)] font-normal">—</span>}
                        </span>
                      </div>
                    </div>

                    {/* Prevailing */}
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-[10px] font-semibold text-[var(--hw-green-700)] uppercase tracking-wide">Prevailing</span>
                      <div className={`w-full h-8 flex items-center justify-center rounded-lg border px-1 ${f.prevailing !== null ? "bg-[var(--hw-green-50)] border-[var(--hw-green-300)]" : "bg-[var(--hw-neutral-50)] border-[var(--hw-neutral-200)]"}`}>
                        <span className={`text-[11px] font-bold ${f.prevailing !== null ? "text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-300)] font-normal"}`}>
                          {f.prevailing !== null ? `₱${fmt(f.prevailing)}` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile review cards */}
              <div className="md:hidden divide-y divide-[var(--hw-neutral-100)]">
                {entries.map(({ com, v, f }) => (
                  <div key={v.id} className="px-4 py-3 space-y-3">
                    {/* Commodity + variant */}
                    <div className="flex items-center gap-1.5">
                      {com.isHW && hasHWIcon(com.name)
                        ? <CommodityIllustration commodityId={hwId(com.name)} className="w-4 h-4 shrink-0" />
                        : <Leaf className={`w-3.5 h-3.5 shrink-0 ${com.isHW ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-400)]"}`} />}
                      <span className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{com.name}</span>
                      <span className="text-[12px] text-[var(--hw-neutral-500)]">· {v.name}</span>
                    </div>

                    {/* UoM */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12px] font-medium text-[var(--hw-neutral-700)]">Unit of Measurement</span>
                      <select
                        value={f.uom ?? "kg"}
                        onChange={(e) => updateUom(v.id, e.target.value)}
                        className="w-36 px-2.5 py-1.5 rounded-xl border border-[var(--hw-neutral-200)] text-[12px] text-[var(--hw-neutral-900)] bg-white focus:outline-none"
                      >
                        {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                      </select>
                    </div>

                    {/* Sample list vertically */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide block">Sample Prices</span>
                      {f.samples.map((s, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 bg-[var(--hw-neutral-50)] p-2 rounded-xl border border-[var(--hw-neutral-200)]">
                          <span className="text-[12px] font-medium text-[var(--hw-neutral-700)]">Sample {i + 1}</span>
                          <span className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">
                            {s !== "" && !isNaN(parseFloat(s)) ? `₱${fmt(parseFloat(s))}` : <span className="text-[var(--hw-neutral-400)] font-normal">—</span>}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Computed row centered */}
                    <div className="pt-1">
                      <span className="text-[11px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide block text-center mb-2">Computed Prices</span>
                      <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
                        <ComputedCell label="Low" value={f.low} />
                        <ComputedCell label="High" value={f.high} />
                        <ComputedCell label="Prevailing" value={f.prevailing} accent />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Save card */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
          <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-2">Data Name</label>
          <input
            type="text"
            value={dataName}
            onChange={(e) => setDataName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)] mb-4"
          />
          {saved ? (
            <div className="flex items-center gap-2 text-emerald-700">
              <Check className="w-4 h-4" />
              <span className="text-[13px] font-medium">Saved successfully. Returning…</span>
            </div>
          ) : (
            <button
              onClick={handleSave}
              disabled={!canReview}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-50"
            >
              Save {dataName}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Entry mode ─────────────────────────────────────────────────────────────
  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto" style={{ overflowX: "hidden" }}>
      {/* Draft restore banner */}
      {hasDraft && !draftDismissed && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-amber-800">Continue your saved draft</p>
            <p className="text-[12px] text-amber-700 mt-0.5">An unfinished entry was found on this device.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => { setDraftDismissed(true); setHasDraft(false); try { localStorage.removeItem("dftc_price_draft"); } catch { } }}
              className="text-[12px] text-amber-700 underline"
            >
              Discard Draft
            </button>
            <button
              onClick={() => setDraftDismissed(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[12px] font-medium hover:bg-amber-700 transition-colors"
            >
              Continue Draft
            </button>
          </div>
        </div>
      )}

      {/* Header with ArrowLeft Back Button, SaveStatusIndicator, Subtext, and Review Button */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dftc/input")}
              className="p-1.5 -ml-1.5 rounded-xl hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] transition-colors"
              title="Back to Submit Data"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">Add Price Data</h1>
          </div>
          <SaveStatusIndicator />
        </div>

        <div className="flex items-center justify-between gap-4 pl-8">
          <p className="text-[13px] text-[var(--hw-neutral-700)]">
            {setup.market} · {setup.priceType} · {formatDateLabel(setup.date)}{" "}
            <button onClick={() => setSetupModalOpen(true)} className="text-[12px] text-[var(--hw-green-700)] underline font-medium ml-1">
              Change Details
            </button>
          </p>
          <button
            onClick={() => { setDataName(generateDataName(setup)); setReviewMode(true); }}
            disabled={!canReview}
            className="shrink-0 py-2 px-4 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-semibold hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[var(--shadow-xs)]"
          >
            {!canReview ? "Review (0)" : `Review (${reviewEntries.length})`}
          </button>
        </div>
      </div>

      {/* Price table card */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden mb-5">

        {/* Toolbar */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-[var(--hw-neutral-200)]">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--hw-neutral-400)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search commodity or variant"
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-[var(--hw-neutral-200)] bg-white text-[12px] text-[var(--hw-neutral-900)] placeholder:text-[var(--hw-neutral-400)] focus:outline-none focus:border-[var(--hw-green-700)]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-[var(--hw-neutral-400)]" />
              </button>
            )}
          </div>

          {/* Add Commodity */}
          <button
            onClick={() => setAddCommodityOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--hw-green-700)] text-white text-[12px] font-medium hover:bg-[var(--hw-green-800)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Commodity
          </button>

          {/* Show All / Entered Only */}
          <div className="flex rounded-lg border border-[var(--hw-neutral-200)] overflow-hidden shrink-0">
            {["all", "entered"].map((m) => (
              <button
                key={m}
                onClick={() => setShowMode(m)}
                className={`px-3 py-2 text-[12px] font-medium transition-colors ${showMode === m ? "bg-[var(--hw-neutral-900)] text-white" : "text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"}`}
              >
                {m === "all" ? "Show All" : "Show Entered Only"}
              </button>
            ))}
          </div>

          {/* Collapse All */}
          <button
            onClick={collapseAll}
            className="shrink-0 px-3 py-2 rounded-lg border border-[var(--hw-neutral-200)] text-[12px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
          >
            Collapse All
          </button>

          {/* Entered count */}
          {enteredCount > 0 && (
            <span className="shrink-0 text-[12px] font-medium text-[var(--hw-green-700)]">
              {enteredCount} {enteredCount === 1 ? "price" : "prices"} entered
            </span>
          )}
        </div>

        {/* Category rows (without separate table header) */}
        {PRICE_CATEGORIES.map((cat) => {
          const isCollapsed = collapsed.has(cat.id);
          const catCommodities = getAllCommodities(cat).filter((com) => {
            const variants = getVariants(com);
            if (!matchesCommodity(com, variants)) return false;
            if (showMode === "entered") {
              return variants.some((v) => hasValue(getField(v.id)));
            }
            return true;
          });
          if (catCommodities.length === 0) return null;

          return (
            <div key={cat.id}>
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-100)] transition-colors"
              >
                <span className="text-[12px] font-semibold text-[var(--hw-neutral-800)] uppercase tracking-wide">{cat.name}</span>
                {isCollapsed ? <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-800)]" /> : <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-800)]" />}
              </button>

              {!isCollapsed && catCommodities.map((com) => {
                const variants = getVariants(com).filter((v) => {
                  if (!matchesVariant(com, v)) return false;
                  if (showMode === "entered") return hasValue(getField(v.id));
                  return true;
                });

                return (
                  <div key={com.id} className="border-b border-[var(--hw-neutral-100)] last:border-0">
                    {/* Commodity name row */}
                    <div className="px-4 py-2 bg-white flex items-center gap-2 border-b border-[var(--hw-neutral-50)]">
                      {com.isHW && hasHWIcon(com.name)
                        ? <CommodityIllustration commodityId={hwId(com.name)} className="w-5 h-5 shrink-0" />
                        : <Leaf className={`w-4 h-4 shrink-0 ${com.isHW ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-400)]"}`} />}
                      <span className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{com.name}</span>
                      {com.isHW && (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hw-green-700)] shrink-0" />
                          <button
                            onClick={() => setHwInfoId(hwInfoId === com.id ? null : com.id)}
                            className="p-0.5 rounded hover:bg-[var(--hw-neutral-100)] transition-colors"
                            title="HarvestWise supported"
                          >
                            <Info className="w-3 h-3 text-[var(--hw-neutral-800)]" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Variant rows */}
                    {variants.map((v) => {
                      const f = getField(v.id);
                      const hasVal = hasValue(f);

                      return (
                        <div key={v.id}>
                          {/* ── Desktop variant row (labels placed directly above each field) ── */}
                          <div
                            className={`hidden md:grid gap-2.5 items-end px-4 py-3 border-b border-[var(--hw-neutral-100)] last:border-0 ${hasVal ? "bg-[var(--hw-green-50)]/30" : ""}`}
                            style={{ gridTemplateColumns: "1fr 88px repeat(5, 82px) 84px 84px 96px" }}
                          >
                            {/* Variant name */}
                            <div className="flex flex-col justify-center pb-1.5 min-w-0">
                              <span className="text-[13px] font-medium text-[var(--hw-neutral-900)] pl-6 truncate" title={v.name}>{v.name}</span>
                            </div>

                            {/* Unit */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wide">Unit</span>
                              <select
                                value={f.uom || "kg"}
                                onChange={(e) => updateUom(v.id, e.target.value)}
                                className="w-full h-8 px-2 rounded-lg border border-[var(--hw-neutral-200)] text-[11px] text-[var(--hw-neutral-900)] bg-white focus:outline-none focus:border-[var(--hw-green-700)]"
                              >
                                {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                              </select>
                            </div>

                            {/* Sample 1 to 5 */}
                            {f.samples.map((s, i) => (
                              <div key={i} className="flex flex-col gap-1 items-center">
                                <span className="text-[10px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wide">Sample {i + 1}</span>
                                <div className="w-full flex items-center border border-[var(--hw-neutral-200)] rounded-lg overflow-hidden focus-within:border-[var(--hw-green-600)] bg-white h-8">
                                  <span className="px-1.5 text-[10px] text-[var(--hw-neutral-500)] border-r border-[var(--hw-neutral-200)] h-full flex items-center shrink-0">₱</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={s}
                                    onChange={(e) => updateSample(v.id, i, e.target.value)}
                                    placeholder="0.00"
                                    className="flex-1 px-1 text-[11px] text-[var(--hw-neutral-900)] focus:outline-none min-w-0 bg-transparent text-center"
                                    style={{ MozAppearance: "textfield" }}
                                  />
                                </div>
                              </div>
                            ))}

                            {/* Low */}
                            <div className="flex flex-col gap-1 items-center">
                              <span className="text-[10px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wide">Low</span>
                              <div className="w-full h-8 flex items-center justify-center rounded-lg bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] px-1">
                                <span className="text-[11px] text-[var(--hw-neutral-700)] font-semibold">
                                  {f.low !== null ? `₱${fmt(f.low)}` : <span className="text-[var(--hw-neutral-300)] font-normal">—</span>}
                                </span>
                              </div>
                            </div>

                            {/* High */}
                            <div className="flex flex-col gap-1 items-center">
                              <span className="text-[10px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wide">High</span>
                              <div className="w-full h-8 flex items-center justify-center rounded-lg bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] px-1">
                                <span className="text-[11px] text-[var(--hw-neutral-700)] font-semibold">
                                  {f.high !== null ? `₱${fmt(f.high)}` : <span className="text-[var(--hw-neutral-300)] font-normal">—</span>}
                                </span>
                              </div>
                            </div>

                            {/* Prevailing */}
                            <div className="flex flex-col gap-1 items-center">
                              <span className="text-[10px] font-semibold text-[var(--hw-green-700)] uppercase tracking-wide">Prevailing</span>
                              <div className={`w-full h-8 flex items-center justify-center rounded-lg border px-1 ${f.prevailing !== null ? "bg-[var(--hw-green-50)] border-[var(--hw-green-300)]" : "bg-[var(--hw-neutral-50)] border-[var(--hw-neutral-200)]"}`}>
                                <span className={`text-[11px] font-bold ${f.prevailing !== null ? "text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-300)] font-normal"}`}>
                                  {f.prevailing !== null ? `₱${fmt(f.prevailing)}` : "—"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* ── Mobile variant row (expandable, vertical samples, centered computed) ── */}
                          <div className="md:hidden">
                            <MobileVariantRow
                              v={v}
                              f={f}
                              onUpdateSample={(i, val) => updateSample(v.id, i, val)}
                              onUpdateUom={(uom) => updateUom(v.id, uom)}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Variant */}
                    {showMode === "all" && (
                      <div className="px-4 py-2 border-b border-[var(--hw-neutral-50)]">
                        {addingVariant === com.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-[var(--hw-neutral-800)] pl-6">+</span>
                            <input
                              autoFocus
                              type="text"
                              value={variantInput}
                              onChange={(e) => setVariantInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitVariant(com.id);
                                if (e.key === "Escape") { setAddingVariant(null); setVariantInput(""); }
                              }}
                              placeholder="Enter variety, grade, size, or descriptor"
                              className="flex-1 px-2 py-1.5 text-[12px] text-[var(--hw-neutral-900)] border border-[var(--hw-green-700)] rounded-lg focus:outline-none"
                            />
                            <button onClick={() => commitVariant(com.id)} className="px-2.5 py-1.5 rounded-lg bg-[var(--hw-green-700)] text-white text-[11px] font-medium">Add</button>
                            <button
                              onClick={() => { setAddingVariant(null); setVariantInput(""); }}
                              className="px-2.5 py-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[13px] text-[var(--hw-neutral-800)]"
                            >Cancel</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingVariant(com.id); setVariantInput(""); }}
                            className="text-[12px] text-[var(--hw-green-700)] hover:underline pl-6"
                          >
                            + Add Variant
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {setupModalOpen && (
        <SetupModal
          initial={setup}
          onClose={() => setSetupModalOpen(false)}
          onApply={(s) => { setSetup(s); setDataName(generateDataName(s)); setSetupModalOpen(false); }}
        />
      )}
      {addCommodityOpen && <AddCommodityModal onClose={() => setAddCommodityOpen(false)} onAdd={handleAddCommodity} />}
      {hwInfoId && <HWInfoOverlay onClose={() => setHwInfoId(null)} />}
      {coverageOpen && <AnalyticsCoverageOverlay onClose={() => setCoverageOpen(false)} />}
    </div>
  );
}

export { DFTCPriceInput as default };
