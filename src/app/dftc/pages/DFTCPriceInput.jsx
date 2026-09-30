import React, { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import { useNavigate, useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
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
  ArrowLeft,
  Calendar,
  FileText,
  Loader2
} from "lucide-react";
import {
  PRICE_CATEGORIES,
  UOM_OPTIONS
} from "./dftc-add-data-data";
import { CommodityIllustration, COMMODITY_REGISTRY } from "../../global/components/shared/CommodityIllustrations";
import { HW_NAME_TO_ID as _HW_NAME_TO_ID } from "../../global/data/commodities";
import { apiGet, apiPost, parseResponse } from "../../global/api";
import DFTCNotificationBanner from "../components/DFTCNotificationBanner";

function hwId(name) {
  return _HW_NAME_TO_ID[name] ?? null;
}
function hasHWIcon(name) {
  const id = hwId(name);
  return id !== null && id in COMMODITY_REGISTRY;
}

// Display name -> canonical DB commodity name for composite/market-listed items.
const COMMODITY_NAME_OVERRIDES = {
  "Pak choi / Bok choy": "Pakchoy/Bukchoy",
  "Kangkong / Tinangkong": "Kangkong",
  "Kamote tops / Galay": "Kamote Tops"
};

function nameSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const CATEGORY_OPTIONS = [
  { id: "lowland", name: "Lowland Vegetables" },
  { id: "highland", name: "Highland Vegetables" },
  { id: "spices", name: "Spices" },
  { id: "rootcrops", name: "Rootcrops" },
  { id: "fruits", name: "Fruits" },
  { id: "others", name: "Others" }
];

const MARKET_TABS = [
  { id: "bangkerohan-retail", label: "Bangkerohan Retail", market: "Bangkerohan Public Market", priceType: "Retail", sourceId: "bankerohan", columnKey: "bankRetail" },
  { id: "bangkerohan-wholesale", label: "Bangkerohan Wholesale", market: "Bangkerohan Public Market", priceType: "Wholesale", sourceId: "bankerohan", columnKey: "bankWholesale" },
  { id: "bangkerohan-landing", label: "Bangkerohan Landing", market: "Bangkerohan Public Market", priceType: "Landing", sourceId: "bankerohan", columnKey: "bankLanding" },
  { id: "dftc-retail", label: "DFTC Retail", market: "DFTC Taboan", priceType: "Retail", sourceId: "dftc", columnKey: "dftcRetail" },
  { id: "dftc-wholesale", label: "DFTC Wholesale", market: "DFTC Taboan", priceType: "Wholesale", sourceId: "dftc", columnKey: "dftcWholesale" }
];

const LEFT_BG = "#c6efce";
const BANK_BG = "#ffeb9c";
const DFTC_BG = "#dae8fc";

const EMPTY_SAMPLES = ["", "", "", "", ""];

function emptyField(uom = "kg") {
  return { samples: [...EMPTY_SAMPLES], uom, low: null, high: null, prevailing: null };
}

function formatDateLabel(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function localToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isFutureDate(dateStr) {
  return Boolean(dateStr && dateStr > localToday());
}

/** Returns true if at least one sample is a valid non-empty number */
function hasValue(f) {
  return (f?.samples ?? []).some((s) => s !== "" && !isNaN(parseFloat(s)));
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

  const freq = {};
  for (const v of valid) {
    freq[v] = (freq[v] ?? 0) + 1;
  }
  const maxFreq = Math.max(...Object.values(freq));

  let prevailing;
  if (maxFreq > 1) {
    const tied = Object.entries(freq)
      .filter(([, f]) => f === maxFreq)
      .map(([p]) => parseFloat(p));
    prevailing = tied.reduce((a, b) => a + b, 0) / tied.length;
  } else {
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
  if (val === null || val === undefined || isNaN(val)) return "—";
  return Number(val).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// ─── Confirm Finalize modal ─────────────────────────────────────────────────
function ConfirmFinalizeModal({
  date,
  totalRecords,
  tabBreakdown,
  encodedBy,
  encodedByRole,
  reviewedBy,
  reviewedByRole,
  onClose,
  onConfirm
}) {
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-lg">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--hw-neutral-100)]">
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Confirm Finalize & Save</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)]">
            <X className="w-4 h-4 text-[var(--hw-neutral-600)]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[13px] text-[var(--hw-neutral-800)]">
            <strong>DFTC Price Monitoring</strong> · Prevailing Market Prices as of {formatDateLabel(date)}
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-[var(--hw-green-200)] bg-[var(--hw-green-50)]">
              <span className="text-[13px] font-medium text-[var(--hw-green-800)]">Total Price Records to Save</span>
              <span className="text-[13px] font-bold text-[var(--hw-green-800)]">{totalRecords}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] text-[var(--hw-neutral-700)] bg-[var(--hw-neutral-50)] p-3 rounded-xl border border-[var(--hw-neutral-200)]">
              <div>
                <p className="font-semibold text-[var(--hw-neutral-900)] mb-1">Bangkerohan Public Market</p>
                <p>Bangkerohan Retail: <strong>{tabBreakdown["bangkerohan-retail"] || 0}</strong></p>
                <p>Bangkerohan Wholesale: <strong>{tabBreakdown["bangkerohan-wholesale"] || 0}</strong></p>
                <p>Bangkerohan Landing: <strong>{tabBreakdown["bangkerohan-landing"] || 0}</strong></p>
              </div>
              <div>
                <p className="font-semibold text-[var(--hw-neutral-900)] mb-1">DFTC Taboan</p>
                <p>DFTC Retail: <strong>{tabBreakdown["dftc-retail"] || 0}</strong></p>
                <p>DFTC Wholesale: <strong>{tabBreakdown["dftc-wholesale"] || 0}</strong></p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] text-[var(--hw-neutral-700)] bg-[var(--hw-neutral-50)] p-3 rounded-xl border border-[var(--hw-neutral-200)]">
              <div>
                <span className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase block">Encoded by</span>
                <strong className="text-[var(--hw-neutral-900)]">{encodedBy || "—"}</strong>
                <span className="text-[11px] text-[var(--hw-neutral-600)] block">{encodedByRole || ""}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase block">Reviewed by</span>
                <strong className="text-[var(--hw-neutral-900)]">{reviewedBy || "—"}</strong>
                <span className="text-[11px] text-[var(--hw-neutral-600)] block">{reviewedByRole || ""}</span>
              </div>
            </div>
          </div>

          <p className="text-[12px] text-[var(--hw-neutral-600)]">
            Once saved, these records will be consolidated under <strong>DFTC Price Monitoring — {formatDateLabel(date)}</strong> as one report file and become viewable and exportable (Image, PDF, Excel) from Recent Saved Data.
          </p>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[var(--hw-green-700)]"
            />
            <span className="text-[13px] text-[var(--hw-neutral-900)]">
              I confirm these market prices have been verified and are ready to finalize.
            </span>
          </label>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors">
            Back
          </button>
          <button
            onClick={onConfirm}
            disabled={!verified}
            className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-semibold hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Finalize & Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SearchableStaffSelect ──────────────────────────────────────────────────
function SearchableStaffSelect({
  id,
  label,
  required,
  value,
  role,
  options = [],
  onChange,
  placeholder = "Select DFTC Personnel"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        (opt.role && opt.role.toLowerCase().includes(q))
    );
  }, [options, search]);

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">
        {label} {required && <span className="text-red-500 font-bold">*</span>}
      </label>

      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-left text-[var(--hw-neutral-900)] hover:border-[var(--hw-neutral-300)] focus:outline-none focus:border-[var(--hw-green-700)] flex items-center justify-between gap-2 cursor-pointer shadow-xs transition-colors"
      >
        <span className="truncate">
          {value ? (
            <span className="font-semibold text-black">
              {value} {role ? <span className="font-normal text-[var(--hw-neutral-600)]">— {role}</span> : ""}
            </span>
          ) : (
            <span className="text-[var(--hw-neutral-400)]">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--hw-neutral-500)] shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {role && (
        <p className="text-[11px] text-[var(--hw-neutral-600)] mt-1 font-medium">{role}</p>
      )}

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-xl overflow-hidden">
          <div className="p-2 border-b border-[var(--hw-neutral-100)] flex items-center gap-2 bg-[var(--hw-neutral-50)]">
            <Search className="w-3.5 h-3.5 text-[var(--hw-neutral-400)] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search DFTC personnel or role..."
              className="w-full bg-transparent text-[12px] text-[var(--hw-neutral-900)] placeholder-[var(--hw-neutral-400)] focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-0.5 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-[12px] text-[var(--hw-neutral-500)]">
                No DFTC personnel found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.name === value;
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => {
                      onChange(opt.name);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-[12px] flex items-center justify-between gap-2 hover:bg-[var(--hw-green-50)] transition-colors cursor-pointer ${
                      isSelected ? "bg-[var(--hw-green-50)] font-semibold text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-800)]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate uppercase font-bold text-[12px]">{opt.name}</p>
                      <p className="text-[11px] text-[var(--hw-neutral-600)] font-normal truncate">{opt.role}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[var(--hw-green-700)] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
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
      <button
        type="button"
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

// ─── Main Component ──────────────────────────────────────────────────────────
function DFTCPriceInput() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const navState = location.state;

  const [selectedDate, setSelectedDate] = useState(() => navState?.date || localToday());
  const [activeTabId, setActiveTabId] = useState("bangkerohan-retail");

  // Single unified state dictionary storing entered fields across ALL market tabs
  const [tabFields, setTabFields] = useState({
    "bangkerohan-retail": {},
    "bangkerohan-wholesale": {},
    "bangkerohan-landing": {},
    "dftc-retail": {},
    "dftc-wholesale": {}
  });

  // On first open, all category sections start collapsed
  const [collapsed, setCollapsed] = useState(() => new Set(PRICE_CATEGORIES.map((c) => c.id)));
  const [customVariants, setCustomVariants] = useState({});
  const [addingVariant, setAddingVariant] = useState(null);
  const [variantInput, setVariantInput] = useState("");
  const bottomReviewRef = useRef(null);

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
  const [reviewFilter, setReviewFilter] = useState("all");
  const [dataName, setDataName] = useState(() => `DFTC Price Monitoring — ${formatDateLabel(localToday())}`);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Guards a reporting date that arrived from navigation state: handleDateChange
  // clamps user input, but a future date passed in via navState bypasses it.
  const [dateError, setDateError] = useState("");
  const [saveError, setSaveError] = useState("");
  const catalogRef = useRef(null);

  // DFTC Personnel from database (with standard staff fallbacks)
  const [staffList, setStaffList] = useState([
    { name: "IVY JOYCE P. BOLODO", role: "Agri-Service & Related Worker I" },
    { name: "CHRISTIAN JOEY PAUL M. HERMOSO", role: "Agricultural Technologist" }
  ]);
  const [encodedBy, setEncodedBy] = useState("IVY JOYCE P. BOLODO");
  const [encodedByRole, setEncodedByRole] = useState("Agri-Service & Related Worker I");
  const [reviewedBy, setReviewedBy] = useState("CHRISTIAN JOEY PAUL M. HERMOSO");
  const [reviewedByRole, setReviewedByRole] = useState("Agricultural Technologist");
  const [enteredTime, setEnteredTime] = useState(() => {
    return new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  });

  const prefilledRef = useRef({
    "bangkerohan-retail": new Map(),
    "bangkerohan-wholesale": new Map(),
    "bangkerohan-landing": new Map(),
    "dftc-retail": new Map(),
    "dftc-wholesale": new Map()
  });
  const [prefillCount, setPrefillCount] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const draftRef = useRef({});
  draftRef.current = { selectedDate, tabFields, customVariants, customCommodities };

  // Fetch DFTC staff profiles from database
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet("/dftc/staff");
        const parsed = await parseResponse(res);
        const items = Array.isArray(parsed) ? parsed : parsed?.items ?? [];
        if (!cancelled && items.length > 0) {
          const list = items.map((s) => {
            const parts = [s.first_name, s.middle_name, s.last_name, s.suffix].filter(Boolean);
            const name = parts.join(" ").toUpperCase();
            return {
              name,
              role: s.position_title || "DFTC Staff"
            };
          });
          const existingNames = new Set(list.map((l) => l.name));
          const defaults = [
            { name: "IVY JOYCE P. BOLODO", role: "Agri-Service & Related Worker I" },
            { name: "CHRISTIAN JOEY PAUL M. HERMOSO", role: "Agricultural Technologist" }
          ];
          defaults.forEach((d) => {
            if (!existingNames.has(d.name)) list.push(d);
          });
          setStaffList(list);
        }
      } catch {
        // Fallback default personnel already set
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function handleEncodedByChange(name) {
    setEncodedBy(name);
    const found = staffList.find((s) => s.name === name);
    if (found) setEncodedByRole(found.role);
  }

  function handleReviewedByChange(name) {
    setReviewedBy(name);
    const found = staffList.find((s) => s.name === name);
    if (found) setReviewedByRole(found.role);
  }

  // Load commodity catalog map from DB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await parseResponse(await apiGet("/dftc/commodities"));
        if (cancelled) return;
        const items = Array.isArray(data) ? data : data?.items ?? [];
        const map = new Map();
        for (const row of items) {
          const baseName = COMMODITY_NAME_OVERRIDES[row.name] ?? row.name;
          map.set(nameSlug(baseName), row.id);
          if (row.variety) {
            map.set(`${nameSlug(baseName)}-${nameSlug(row.variety)}`, row.id);
          }
        }
        catalogRef.current = map;
        const hasLocalDraft = (() => {
          try { return localStorage.getItem("dftc_price_draft") === "true"; } catch { return false; }
        })();
        if (!hasLocalDraft) await loadDayPrefill(selectedDate);
      } catch {
        if (!cancelled) catalogRef.current = null;
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerAutosave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (oldTimer.current) clearTimeout(oldTimer.current);
    // Any edit means the user is acting on the failure notice.
    setSaveError("");
    setSaveStatus("saving");
    saveTimer.current = setTimeout(() => {
      setSaveStatus("saved");
      try {
        localStorage.setItem("dftc_price_draft", "true");
        localStorage.setItem("dftc_price_draft_data", JSON.stringify(draftRef.current));
      } catch { }
      oldTimer.current = setTimeout(() => setSaveStatus("savedOld"), 30000);
    }, 1500);
  }, []);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (oldTimer.current) clearTimeout(oldTimer.current);
  }, []);

  function readDraftData() {
    try {
      const raw = localStorage.getItem("dftc_price_draft_data");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function restoreDraft() {
    const savedData = readDraftData();
    if (savedData?.selectedDate) {
      setSelectedDate(savedData.selectedDate);
      setDataName(`DFTC Price Monitoring — ${formatDateLabel(savedData.selectedDate)}`);
    }
    if (savedData?.tabFields) setTabFields(savedData.tabFields);
    if (savedData?.customVariants) setCustomVariants(savedData.customVariants);
    if (savedData?.customCommodities) setCustomCommodities(savedData.customCommodities);
    setDraftDismissed(true);
  }

  function discardDraft() {
    setDraftDismissed(true);
    setHasDraft(false);
    try {
      localStorage.removeItem("dftc_price_draft");
      localStorage.removeItem("dftc_price_draft_data");
    } catch { }
    setTabFields({
      "bangkerohan-retail": {},
      "bangkerohan-wholesale": {},
      "bangkerohan-landing": {},
      "dftc-retail": {},
      "dftc-wholesale": {}
    });
    loadDayPrefill(selectedDate);
  }

  // Load existing day prices for the given date across all 5 price columns
  async function loadDayPrefill(date) {
    if (!date) return;
    try {
      const data = await parseResponse(await apiGet(`/dftc/reports/preview?date=${encodeURIComponent(date)}`));
      const rows = data?.rows ?? [];
      if (!Array.isArray(rows) || rows.length === 0) {
        setPrefillCount(0);
        return;
      }

      const nextTabs = {
        "bangkerohan-retail": {},
        "bangkerohan-wholesale": {},
        "bangkerohan-landing": {},
        "dftc-retail": {},
        "dftc-wholesale": {}
      };

      const newPrefilled = {
        "bangkerohan-retail": new Map(),
        "bangkerohan-wholesale": new Map(),
        "bangkerohan-landing": new Map(),
        "dftc-retail": new Map(),
        "dftc-wholesale": new Map()
      };

      let count = 0;

      for (const row of rows) {
        // Find matching variant
        let hit = null;
        for (const cat of PRICE_CATEGORIES) {
          for (const com of cat.commodities) {
            for (const v of com.variants) {
              if (!hit && resolveCommodityId(com, v) === row.commodity_id) {
                hit = { cat, com, v };
              }
            }
          }
        }

        const vid = hit?.v?.id ?? `com-${row.commodity_id}`;
        const uom = row.uom || "kg";

        const checks = [
          { tabId: "bangkerohan-retail", val: row.bangkerohan_retail },
          { tabId: "bangkerohan-wholesale", val: row.bangkerohan_wholesale },
          { tabId: "bangkerohan-landing", val: row.bangkerohan_landing },
          { tabId: "dftc-retail", val: row.dftc_taboan_retail },
          { tabId: "dftc-wholesale", val: row.dftc_taboan_wholesale }
        ];

        for (const { tabId, val } of checks) {
          if (val !== null && val !== undefined) {
            count += 1;
            nextTabs[tabId][vid] = {
              samples: [String(val), "", "", "", ""],
              uom,
              low: val,
              high: val,
              prevailing: val
            };
            newPrefilled[tabId].set(vid, {
              commodity_id: row.commodity_id,
              name: row.commodity_name,
              variety: row.variety || "Base"
            });
          }
        }
      }

      setPrefillCount(count);
      prefilledRef.current = newPrefilled;
      setTabFields(nextTabs);
    } catch {
      setPrefillCount(0);
    }
  }

  function handleDateChange(newDate) {
    if (!newDate) return;
    const today = localToday();
    if (newDate > today) newDate = today;
    if (newDate === selectedDate) return;

    setDateError("");
    setSelectedDate(newDate);
    setDataName(`DFTC Price Monitoring — ${formatDateLabel(newDate)}`);
    setCollapsed(new Set(PRICE_CATEGORIES.map((c) => c.id)));
    loadDayPrefill(newDate);
    triggerAutosave();
  }

  async function registerCommodity(body) {
    try {
      return await parseResponse(await apiPost("/dftc/commodities", body));
    } catch { return null; }
  }

  function getField(tabId, variantId, defaultUom = "kg") {
    return tabFields[tabId]?.[variantId] ?? emptyField(defaultUom);
  }

  function updateSample(variantId, sampleIdx, value) {
    setTabFields((prev) => {
      const curTabMap = prev[activeTabId] || {};
      const existing = curTabMap[variantId] || emptyField();
      const newSamples = [...existing.samples];
      newSamples[sampleIdx] = value;
      const computed = computePrices(newSamples);
      return {
        ...prev,
        [activeTabId]: {
          ...curTabMap,
          [variantId]: { ...existing, samples: newSamples, ...computed }
        }
      };
    });
    triggerAutosave();
  }

  function updateUom(variantId, uom) {
    setTabFields((prev) => {
      const curTabMap = prev[activeTabId] || {};
      const existing = curTabMap[variantId] || emptyField(uom);
      return {
        ...prev,
        [activeTabId]: {
          ...curTabMap,
          [variantId]: { ...existing, uom }
        }
      };
    });
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

  const allCollapsed = PRICE_CATEGORIES.every((c) => collapsed.has(c.id));

  function toggleCollapseAll() {
    if (allCollapsed) {
      setCollapsed(new Set());
    } else {
      setCollapsed(new Set(PRICE_CATEGORIES.map((c) => c.id)));
    }
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
    setTabFields((prev) => ({
      ...prev,
      [activeTabId]: {
        ...prev[activeTabId],
        [variantId]: emptyField(uom)
      }
    }));
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
    return com.name.toLowerCase().includes(q) || (v?.name || "").toLowerCase().includes(q);
  }

  function resolveCommodityId(com, v) {
    const map = catalogRef.current;
    if (!map) return com.id;
    const baseName = COMMODITY_NAME_OVERRIDES[com.name] ?? com.name;
    const baseKey = nameSlug(baseName);
    const variantKey = v && v.name && v.name !== "Base"
      ? `${baseKey}-${nameSlug(v.name)}`
      : baseKey;
    return map.get(variantKey) ?? map.get(baseKey) ?? null;
  }

  function findCommodityAndVariant(variantId) {
    for (const cat of PRICE_CATEGORIES) {
      for (const com of getAllCommodities(cat)) {
        for (const v of getVariants(com)) {
          if (v.id === variantId) {
            return { cat, com, v };
          }
        }
      }
    }
    return { cat: null, com: null, v: null };
  }

  // ── Counts Across All Tabs ──
  function getTabCount(tabId) {
    const map = tabFields[tabId] || {};
    return Object.values(map).filter(hasValue).length;
  }

  const tabBreakdown = useMemo(() => {
    const res = {};
    for (const t of MARKET_TABS) {
      res[t.id] = getTabCount(t.id);
    }
    return res;
  }, [tabFields]);

  const totalEnteredCount = useMemo(() => {
    let sum = 0;
    for (const t of MARKET_TABS) {
      sum += getTabCount(t.id);
    }
    return sum;
  }, [tabFields]);

  const activeTab = useMemo(() => {
    return MARKET_TABS.find((t) => t.id === activeTabId) || MARKET_TABS[0];
  }, [activeTabId]);

  const currentTabCount = useMemo(() => {
    return getTabCount(activeTabId);
  }, [tabFields, activeTabId]);

  // Consolidated review commodities list
  const consolidatedReviewRows = useMemo(() => {
    const rows = [];
    PRICE_CATEGORIES.forEach((cat) => {
      const catRows = [];
      let itemNumber = 1;
      getAllCommodities(cat).forEach((com) => {
        getVariants(com).forEach((v, vi) => {
          const bankLandingField = getField("bangkerohan-landing", v.id);
          const bankWholesaleField = getField("bangkerohan-wholesale", v.id);
          const bankRetailField = getField("bangkerohan-retail", v.id);
          const dftcWholesaleField = getField("dftc-wholesale", v.id);
          const dftcRetailField = getField("dftc-retail", v.id);

          const hasAny = hasValue(bankLandingField) ||
            hasValue(bankWholesaleField) ||
            hasValue(bankRetailField) ||
            hasValue(dftcWholesaleField) ||
            hasValue(dftcRetailField);

          if (hasAny) {
            const uom = bankRetailField.uom || bankWholesaleField.uom || bankLandingField.uom || dftcRetailField.uom || dftcWholesaleField.uom || "kg";
            catRows.push({
              no: vi === 0 ? itemNumber++ : "",
              cat,
              com,
              v,
              vi,
              uom,
              bankLanding: bankLandingField.prevailing,
              bankWholesale: bankWholesaleField.prevailing,
              bankRetail: bankRetailField.prevailing,
              dftcWholesale: dftcWholesaleField.prevailing,
              dftcRetail: dftcRetailField.prevailing
            });
          }
        });
      });
      if (catRows.length > 0) {
        rows.push({ cat, rows: catRows });
      }
    });
    return rows;
  }, [tabFields, customCommodities, customVariants]);

  // Filtered review rows based on clicked summary card
  const filteredReviewRows = useMemo(() => {
    if (reviewFilter === "all") return consolidatedReviewRows;
    return consolidatedReviewRows
      .map(({ cat, rows }) => {
        const matching = rows.filter((r) => {
          if (reviewFilter === "bangkerohan-retail") return r.bankRetail !== null;
          if (reviewFilter === "bangkerohan-wholesale") return r.bankWholesale !== null;
          if (reviewFilter === "bangkerohan-landing") return r.bankLanding !== null;
          if (reviewFilter === "dftc-retail") return r.dftcRetail !== null;
          if (reviewFilter === "dftc-wholesale") return r.dftcWholesale !== null;
          return true;
        });
        return { cat, rows: matching };
      })
      .filter((group) => group.rows.length > 0);
  }, [consolidatedReviewRows, reviewFilter]);

  // ── Finalize & Save All Tabs ──
  async function handleSave() {
    if (isFutureDate(selectedDate)) {
      setDateError("Reporting date cannot be after today.");
      return;
    }
    setDateError("");
    setSaveError("");
    setIsSaving(true);
    let totalSaved = 0;
    let dropped = 0;
    const failedTabs = [];

    for (const tab of MARKET_TABS) {
      const tabMap = tabFields[tab.id] || {};
      const tabEntered = Object.entries(tabMap).filter(([, f]) => hasValue(f));
      const prefillMap = prefilledRef.current[tab.id] || new Map();
      const removedCommodities = [];

      for (const [vid, info] of prefillMap.entries()) {
        if (!hasValue(tabMap[vid])) {
          removedCommodities.push(info.commodity_id);
        }
      }

      if (tabEntered.length === 0 && removedCommodities.length === 0) {
        continue;
      }

      const records = [];
      for (const [vid, f] of tabEntered) {
        const { cat, com, v } = findCommodityAndVariant(vid);
        if (!com) continue;
        const commodity_id = resolveCommodityId(com, v);
        const base = {
          variety: v?.name || "Base",
          uom: f.uom || "kg",
          sample_prices: parseValid(f.samples),
          prevail_price: f.prevailing,
          observation_status: "Reported value"
        };

        if (commodity_id) {
          records.push({ commodity_id, ...base });
        } else {
          const registered = await registerCommodity({
            name: com.name,
            category: cat?.name || "Others",
            variety: v?.name || "Base",
            unit_of_measure: f.uom || "kg"
          });
          if (registered?.id) {
            try { catalogRef.current?.set(nameSlug(com.name), registered.id); } catch { }
            records.push({ commodity_id: registered.id, ...base });
          } else {
            dropped += 1;
          }
        }
      }

      const payload = {
        data_type: "price",
        source_id: tab.sourceId,
        price_type: tab.priceType,
        reporting_date: selectedDate,
        records,
        remove_records: removedCommodities
      };

      try {
        await parseResponse(await apiPost("/dftc/submissions/manual", payload));
        totalSaved += records.length;
      } catch (err) {
        console.error(`Failed to save submission for ${tab.label}:`, err);
        failedTabs.push(tab.label);
      }
    }

    // Never report success when a market failed. Records are written as
    // idempotent upserts, so staying on the page and letting the user retry is
    // safe — navigating away would silently drop that market's prices and
    // discard the local draft that holds the retyped values.
    if (failedTabs.length > 0) {
      setSaveError(
        `Could not save ${failedTabs.length} of ${MARKET_TABS.length} markets: ${failedTabs.join(", ")}. ` +
        `Your entries are still on this page — check your connection and press Save again.`
      );
      setIsSaving(false);
      return;
    }

    try {
      localStorage.setItem(
        `dftc_report_personnel_${selectedDate}`,
        JSON.stringify({
          encodedBy,
          encodedByRole,
          reviewedBy,
          reviewedByRole
        })
      );
      localStorage.removeItem("dftc_price_draft");
      localStorage.removeItem("dftc_price_draft_data");
    } catch { }

    setHasDraft(false);
    setSaved(true);
    queryClient.invalidateQueries({ queryKey: ["dftc", "submissions"] });
    queryClient.invalidateQueries({ queryKey: ["dftc-submissions"] });
    queryClient.invalidateQueries({ queryKey: ["dftc-report-preview"] });
    queryClient.invalidateQueries({ queryKey: ["prices"] });

    setTimeout(() => {
      setIsSaving(false);
      navigate("/dftc/input", {
        state: {
          successMsg: `${dataName} saved successfully (${totalSaved} price records across all markets).`,
          restoreMarketFilter: navState?.restoreMarketFilter,
          restoreDataTypeFilter: navState?.restoreDataTypeFilter
        }
      });
    }, 900);
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

  // ═══════════════════════════════════════════════════════════════════════════
  // REVIEW MODE: Consolidated Image 2 DFTC Price Monitoring Table
  // ═══════════════════════════════════════════════════════════════════════════
  if (reviewMode) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto" style={{ overflowX: "hidden" }}>
        {/* Back and Title Header */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => setReviewMode(false)}
            className="p-1.5 -ml-1.5 rounded-xl hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] transition-colors cursor-pointer"
            title="Back to entry"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">Add Price Data — Review</h1>
          </div>
        </div>
        <p className="text-[13px] text-[var(--hw-neutral-700)] mb-4 pl-8">
          Davao Food Terminal Complex Price Monitoring · Prevailing Market Prices as of {formatDateLabel(selectedDate)} · Class A
        </p>

        {/* Info Banner */}
        <DFTCNotificationBanner variant="info" className="mb-4">
          Review entered prevailing market prices for <strong className="text-[var(--hw-neutral-900)]">{formatDateLabel(selectedDate)}</strong> before saving.
        </DFTCNotificationBanner>

        {/* Summary Badges Card — Clickable to filter details */}
        <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hw-neutral-100)] pb-3 mb-3">
            <button
              type="button"
              onClick={() => setReviewFilter("all")}
              className={`text-[14px] font-semibold transition-colors cursor-pointer text-left ${
                reviewFilter === "all" ? "text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-900)] hover:text-[var(--hw-green-700)]"
              }`}
            >
              Total Entered Prices: <strong className="text-[var(--hw-green-700)]">{totalEnteredCount}</strong>
              {reviewFilter !== "all" && (
                <span className="ml-2 text-[12px] font-normal text-[var(--hw-green-700)] underline">
                  (Show All)
                </span>
              )}
            </button>
            <span className="text-[12px] text-[var(--hw-neutral-600)] flex items-center gap-1.5">
              <span>Date entered:</span>
              <strong className="text-[var(--hw-neutral-900)]">{formatDateLabel(selectedDate)}, {enteredTime}</strong>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-[12px]">
            {[
              { id: "bangkerohan-retail", label: "Bangkerohan Retail", count: tabBreakdown["bangkerohan-retail"] || 0 },
              { id: "bangkerohan-wholesale", label: "Bangkerohan Wholesale", count: tabBreakdown["bangkerohan-wholesale"] || 0 },
              { id: "bangkerohan-landing", label: "Bangkerohan Landing", count: tabBreakdown["bangkerohan-landing"] || 0 },
              { id: "dftc-retail", label: "DFTC Retail", count: tabBreakdown["dftc-retail"] || 0 },
              { id: "dftc-wholesale", label: "DFTC Wholesale", count: tabBreakdown["dftc-wholesale"] || 0 }
            ].map((card) => {
              const isSelected = reviewFilter === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setReviewFilter((prev) => (prev === card.id ? "all" : card.id))}
                  className={`text-left rounded-xl p-3 border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? "bg-white border-[var(--hw-neutral-400)] shadow-md ring-1 ring-black/5"
                      : "bg-[var(--hw-neutral-50)] border-[var(--hw-neutral-200)] hover:bg-white hover:shadow-xs"
                  }`}
                  title={isSelected ? "Active filter (click to reset)" : `Filter by ${card.label}`}
                >
                  <span className={`block text-[11px] sm:text-[12px] leading-snug ${isSelected ? "text-[var(--hw-neutral-900)] font-bold" : "text-[var(--hw-neutral-700)] font-medium"}`}>
                    {card.label}
                  </span>
                  <span className="text-[13px] font-bold text-[var(--hw-neutral-900)] whitespace-nowrap text-right shrink-0">
                    {card.count} entered
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Image 2 Consolidated Table Preview */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-300)] shadow-[var(--shadow-xs)] overflow-hidden mb-6">
          <div className="p-4 border-b border-[var(--hw-neutral-200)] text-center bg-white">
            <h2 className="text-[14px] sm:text-[15px] font-bold text-black uppercase tracking-wide">
              Davao Food Terminal Complex Price Monitoring
            </h2>
            <p className="text-[12px] sm:text-[13px] font-bold text-black mt-0.5">
              Prevailing Market Prices as of {formatDateLabel(selectedDate)}
            </p>
            <p className="text-[12px] font-bold text-black">
              Class A
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ background: LEFT_BG, border: "1px solid #999", padding: "6px 8px", width: 44, textAlign: "center" }}>No.</th>
                  <th rowSpan={2} style={{ background: LEFT_BG, border: "1px solid #999", padding: "6px 8px", minWidth: 160, textAlign: "left" }}>Commodity</th>
                  <th rowSpan={2} style={{ background: LEFT_BG, border: "1px solid #999", padding: "6px 8px", width: 72, textAlign: "center" }}>UOM</th>
                  <th colSpan={3} style={{ background: BANK_BG, border: "1px solid #999", padding: "6px 8px", textAlign: "center", fontWeight: "bold" }}>BANKEROHAN MARKET</th>
                  <th colSpan={2} style={{ background: DFTC_BG, border: "1px solid #999", padding: "6px 8px", textAlign: "center", fontWeight: "bold" }}>DFTC TABOAN</th>
                </tr>
                <tr>
                  {["Landing", "Wholesale", "Retail"].map((h) => (
                    <th key={h} style={{ background: BANK_BG, border: "1px solid #999", padding: "5px 8px", textAlign: "right", fontSize: 11, width: 90 }}>{h}</th>
                  ))}
                  {["Wholesale", "Retail"].map((h) => (
                    <th key={h} style={{ background: DFTC_BG, border: "1px solid #999", padding: "5px 8px", textAlign: "right", fontSize: 11, width: 90 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredReviewRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[var(--hw-neutral-500)]">
                      {consolidatedReviewRows.length === 0
                        ? "No price records entered yet. Go back and encode sample prices in any market tab."
                        : "No prices entered for this specific market channel. Click another card or \"Show All\" to view all entered prices."}
                    </td>
                  </tr>
                ) : (
                  filteredReviewRows.map(({ cat, rows }) => (
                    <React.Fragment key={cat.id}>
                      <tr>
                        <td
                          colSpan={3}
                          style={{ background: LEFT_BG, border: "1px solid #999", padding: "5px 8px", fontWeight: "bold", fontStyle: "italic", textDecoration: "underline" }}
                        >
                          {cat.name.toUpperCase()}
                        </td>
                        <td style={{ background: BANK_BG, border: "1px solid #999" }} />
                        <td style={{ background: BANK_BG, border: "1px solid #999" }} />
                        <td style={{ background: BANK_BG, border: "1px solid #999" }} />
                        <td style={{ background: DFTC_BG, border: "1px solid #999" }} />
                        <td style={{ background: DFTC_BG, border: "1px solid #999" }} />
                      </tr>
                      {rows.map((r, ri) => (
                        <tr key={`${cat.id}-${r.com.id}-${r.v.id}-${ri}`}>
                          <td style={{ background: LEFT_BG, border: "1px solid #999", padding: "4px 8px", textAlign: "center" }}>
                            {r.no}
                          </td>
                          <td style={{ background: LEFT_BG, border: "1px solid #999", padding: "4px 8px" }}>
                            {r.vi === 0 ? (
                              <span><strong>{r.com.name}</strong> {r.v.name && r.v.name !== "Base" ? `(${r.v.name})` : ""}</span>
                            ) : (
                              <span style={{ paddingLeft: 16 }}>{r.v.name && r.v.name !== "Base" ? `(${r.v.name})` : ""}</span>
                            )}
                          </td>
                          <td style={{ background: LEFT_BG, border: "1px solid #999", padding: "4px 8px", textAlign: "center" }}>
                            {r.uom}
                          </td>
                          <td style={{ background: BANK_BG, border: "1px solid #999", padding: "4px 8px", textAlign: "right", fontWeight: r.bankLanding !== null ? "bold" : "normal" }}>
                            {r.bankLanding !== null ? `₱${fmt(r.bankLanding)}` : ""}
                          </td>
                          <td style={{ background: BANK_BG, border: "1px solid #999", padding: "4px 8px", textAlign: "right", fontWeight: r.bankWholesale !== null ? "bold" : "normal" }}>
                            {r.bankWholesale !== null ? `₱${fmt(r.bankWholesale)}` : ""}
                          </td>
                          <td style={{ background: BANK_BG, border: "1px solid #999", padding: "4px 8px", textAlign: "right", fontWeight: r.bankRetail !== null ? "bold" : "normal" }}>
                            {r.bankRetail !== null ? `₱${fmt(r.bankRetail)}` : ""}
                          </td>
                          <td style={{ background: DFTC_BG, border: "1px solid #999", padding: "4px 8px", textAlign: "right", fontWeight: r.dftcWholesale !== null ? "bold" : "normal" }}>
                            {r.dftcWholesale !== null ? `₱${fmt(r.dftcWholesale)}` : ""}
                          </td>
                          <td style={{ background: DFTC_BG, border: "1px solid #999", padding: "4px 8px", textAlign: "right", fontWeight: r.dftcRetail !== null ? "bold" : "normal" }}>
                            {r.dftcRetail !== null ? `₱${fmt(r.dftcRetail)}` : ""}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Encoded by / Reviewed by Footer (matching Image 5) */}
          <div className="p-4 sm:p-5 border-t border-[var(--hw-neutral-200)] bg-white grid grid-cols-1 sm:grid-cols-2 gap-6 text-[12px]">
            <div>
              <p className="font-semibold text-black">Encoded by:</p>
              <p className="font-bold text-black mt-2 text-[13px] uppercase">{encodedBy}</p>
              <p className="text-[var(--hw-neutral-700)] text-[12px]">{encodedByRole}</p>
            </div>
            <div>
              <p className="font-semibold text-black">Reviewed by:</p>
              <p className="font-bold text-black mt-2 text-[13px] uppercase">{reviewedBy}</p>
              <p className="text-[var(--hw-neutral-700)] text-[12px]">{reviewedByRole}</p>
            </div>
          </div>
        </div>

        {/* Save Card */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
          <label htmlFor="report-data-name-input" className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-2">Report Data Name</label>
          <input
            id="report-data-name-input"
            type="text"
            value={dataName}
            onChange={(e) => setDataName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)] mb-4"
          />

          {/* Under Report Data Name: Searchable dropdowns for DFTC personnel who encoded and reviewed the data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 pt-1">
            <SearchableStaffSelect
              id="encoded-by-select"
              label="Encoded by (DFTC Personnel)"
              required={true}
              value={encodedBy}
              role={encodedByRole}
              options={staffList}
              onChange={handleEncodedByChange}
              placeholder="Search / select DFTC personnel"
            />

            <SearchableStaffSelect
              id="reviewed-by-select"
              label="Reviewed by (DFTC Personnel)"
              required={true}
              value={reviewedBy}
              role={reviewedByRole}
              options={staffList}
              onChange={handleReviewedByChange}
              placeholder="Search / select DFTC personnel"
            />
          </div>

          <div className="pt-2">
            {saveError && (
              <div
                role="alert"
                className="mb-2 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                {saveError}
              </div>
            )}
            {dateError && (
              <p
                role="alert"
                className="mb-2 flex items-center gap-1.5 text-[12px] text-red-600"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {dateError}
              </p>
            )}
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={totalEnteredCount === 0 || isSaving}
              className="w-full py-3 px-4 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-semibold hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-50 cursor-pointer shadow-[var(--shadow-xs)]"
            >
              Save {dataName} ({totalEnteredCount} records)
            </button>
          </div>

          {/* Centered Loading Modal Overlay while saving */}
          {isSaving && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-xl border border-[var(--hw-neutral-200)] flex flex-col items-center">
                <Loader2 className="w-10 h-10 text-[var(--hw-green-700)] animate-spin mb-4" />
                <h3 className="text-[16px] font-bold text-[var(--hw-neutral-900)]">Saving Price Monitoring Data</h3>
                <p className="text-[13px] text-[var(--hw-neutral-600)] mt-1.5 leading-relaxed">
                  Please wait while your data is being validated and consolidated...
                </p>
              </div>
            </div>
          )}

          {confirmOpen && (
            <ConfirmFinalizeModal
              date={selectedDate}
              totalRecords={totalEnteredCount}
              tabBreakdown={tabBreakdown}
              encodedBy={encodedBy}
              encodedByRole={encodedByRole}
              reviewedBy={reviewedBy}
              reviewedByRole={reviewedByRole}
              onClose={() => setConfirmOpen(false)}
              onConfirm={() => { setConfirmOpen(false); handleSave(); }}
            />
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTRY MODE: All Market Tabs + Past/Today Date Picker + Unified Inputs
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto" style={{ overflowX: "hidden" }}>
      {/* Draft restore banner */}
      {hasDraft && !draftDismissed && (
        <DFTCNotificationBanner
          variant="warning"
          title="Continue your saved draft"
          description="An unfinished entry was found on this device."
          className="mb-5"
          actions={
            <>
              <button
                type="button"
                onClick={discardDraft}
                className="text-[12px] text-[var(--hw-neutral-500)] hover:text-[var(--hw-neutral-700)] cursor-pointer"
              >
                Discard Draft
              </button>
              <button
                type="button"
                onClick={restoreDraft}
                className="font-semibold text-amber-600 underline hover:text-amber-700 text-[12px] cursor-pointer"
              >
                Resume Draft
              </button>
            </>
          }
        />
      )}

      {/* Amend banner — existing records for this day were loaded */}
      {prefillCount > 0 && (
        <DFTCNotificationBanner
          variant="info"
          title="Amending existing entry"
          description={`${prefillCount} existing price records were loaded for ${formatDateLabel(selectedDate)}. Adjust values you need to change, or switch tabs to add more.`}
          className="mb-5"
        />
      )}

      {/* Header: Back Button, Title, SaveStatusIndicator, Top Hyperlink Review Button */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dftc/input", { state: { restoreMarketFilter: navState?.restoreMarketFilter, restoreDataTypeFilter: navState?.restoreDataTypeFilter } })}
              className="p-1.5 -ml-1.5 rounded-xl hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] transition-colors cursor-pointer"
              title="Back to Submit Data"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">Add Price Data</h1>
          </div>
          <div className="flex items-center gap-4">
            <SaveStatusIndicator />
            {/* Top Hyperlink button navigating directly to review mode like the bottom button */}
            <button
              type="button"
              onClick={() => {
                setDataName(`DFTC Price Monitoring — ${formatDateLabel(selectedDate)}`);
                setReviewMode(true);
              }}
              disabled={totalEnteredCount === 0}
              className="text-[13px] font-semibold text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] underline cursor-pointer inline-flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Review Entered Data"
            >
              Review ({totalEnteredCount})
            </button>
          </div>
        </div>

        {/* Tab Navigation for Markets & Price Types + Editable Date Picker (no future dates) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          {/* Market / Price-Type Tabs filling available width before the date button */}
          <div className="flex-1 min-w-0 flex rounded-xl sm:rounded-full border border-[var(--hw-neutral-200)] overflow-x-auto bg-white shadow-[var(--shadow-xs)]">
            {MARKET_TABS.map((tab) => {
              const active = activeTabId === tab.id;
              const count = getTabCount(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex-1 min-w-[125px] sm:min-w-0 py-2.5 px-2 sm:px-3 text-[12px] sm:text-[13px] font-medium transition-colors text-center whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 border-r last:border-r-0 border-[var(--hw-neutral-200)] ${
                    active
                      ? "bg-[var(--hw-green-700)] text-white font-semibold"
                      : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-tight shrink-0 ${
                        active ? "bg-white/25 text-white" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Editable Date Picker (Cannot enter data for future dates) */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] self-start lg:self-auto">
            <Calendar className="w-4 h-4 text-[var(--hw-neutral-500)] shrink-0" />
            <label htmlFor="price-date-picker" className="text-[12px] font-medium text-[var(--hw-neutral-700)] shrink-0">
              Date:
            </label>
            <input
              id="price-date-picker"
              type="date"
              max={localToday()}
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              onBlur={(e) => {
                if (e.target.value > localToday()) {
                  handleDateChange(localToday());
                }
              }}
              className="text-[12px] sm:text-[13px] font-medium text-[var(--hw-neutral-900)] bg-transparent border-0 focus:outline-none cursor-pointer"
            />
            {selectedDate !== localToday() && (
              <button
                type="button"
                onClick={() => handleDateChange(localToday())}
                className="text-[11px] font-semibold text-[var(--hw-green-700)] hover:underline ml-1 cursor-pointer whitespace-nowrap"
              >
                Today
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Price Table Card */}
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
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--hw-green-700)] text-white text-[12px] font-medium hover:bg-[var(--hw-green-800)] transition-colors cursor-pointer"
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
                className={`px-3 py-2 text-[12px] font-medium transition-colors cursor-pointer ${showMode === m ? "bg-[var(--hw-neutral-900)] text-white" : "text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"}`}
              >
                {m === "all" ? "Show All" : "Show Entered Only"}
              </button>
            ))}
          </div>

          {/* Collapse All / Expand All */}
          <button
            onClick={toggleCollapseAll}
            className="shrink-0 px-3 py-2 rounded-lg border border-[var(--hw-neutral-200)] text-[12px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
          >
            {allCollapsed ? "Expand All" : "Collapse All"}
          </button>
        </div>

        {/* Category Rows */}
        {PRICE_CATEGORIES.map((cat) => {
          const catCommodities = getAllCommodities(cat).filter((com) => {
            const variants = getVariants(com);
            if (!matchesCommodity(com, variants)) return false;
            if (showMode === "entered") {
              return variants.some((v) => hasValue(getField(activeTabId, v.id)));
            }
            return true;
          });
          if (catCommodities.length === 0) return null;

          const isCol = collapsed.has(cat.id);
          const catEntered = getAllCommodities(cat).reduce((acc, com) =>
            acc + getVariants(com).filter((v) => hasValue(getField(activeTabId, v.id))).length, 0);

          return (
            <div key={cat.id} className="border-b border-[var(--hw-neutral-200)] last:border-0">
              <button
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="w-full px-4 py-2.5 bg-[var(--hw-neutral-50)] flex items-center justify-between text-left hover:bg-[var(--hw-neutral-100)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[var(--hw-neutral-800)] uppercase tracking-wide">{cat.name}</span>
                  {catEntered > 0 && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--hw-green-100)] text-[var(--hw-green-800)] border border-[var(--hw-green-200)]">
                      {catEntered} entered
                    </span>
                  )}
                </div>
                {isCol
                  ? <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-500)]" />
                  : <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-500)]" />}
              </button>

              {!isCol && catCommodities.map((com) => {
                const variants = getVariants(com).filter((v) => matchesVariant(com, v));
                return (
                  <div key={com.id} className="border-b border-[var(--hw-neutral-100)] last:border-0">
                    {/* Commodity Header */}
                    <div className="px-4 py-2 bg-white flex items-center justify-between border-b border-[var(--hw-neutral-50)]">
                      <div className="flex items-center gap-2">
                        {com.isHW && hasHWIcon(com.name)
                          ? <CommodityIllustration commodityId={hwId(com.name)} className="w-5 h-5 shrink-0" />
                          : <Leaf className={`w-4 h-4 shrink-0 ${com.isHW ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-400)]"}`} />}
                        <span className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{com.name}</span>
                        {com.isHW && (
                          <button
                            type="button"
                            onClick={() => setHwInfoId(com.id)}
                            className="text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)]"
                            title="HarvestWise Supported Commodity"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setCoverageOpen(true)}
                          className="text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)]"
                          title="About Analytics Coverage"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Variant Rows */}
                    {variants.map((v) => {
                      const f = getField(activeTabId, v.id);
                      return (
                        <div key={v.id}>
                          {/* Desktop Grid */}
                          <div
                            className={`hidden md:grid gap-2 items-center px-4 py-2 border-b border-[var(--hw-neutral-50)] hover:bg-[var(--hw-neutral-50)] transition-colors ${hasValue(f) ? "bg-[var(--hw-green-50)]/20" : ""}`}
                            style={{ gridTemplateColumns: "1fr 88px repeat(5, 78px) 76px 76px 84px" }}
                          >
                            <div className="pl-6 flex items-center gap-2 min-w-0">
                              <span className="text-[12px] text-[var(--hw-neutral-800)] truncate">{v.name}</span>
                            </div>

                            <select
                              value={f.uom || "kg"}
                              onChange={(e) => updateUom(v.id, e.target.value)}
                              className="h-8 px-2 rounded-lg border border-[var(--hw-neutral-200)] text-[11px] text-[var(--hw-neutral-900)] bg-white focus:outline-none focus:border-[var(--hw-green-700)]"
                            >
                              {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                            </select>

                            {f.samples.map((s, i) => (
                              <div
                                key={i}
                                className="flex items-center border border-[var(--hw-neutral-200)] rounded-lg overflow-hidden focus-within:border-[var(--hw-green-600)] bg-white h-8"
                              >
                                <span className="px-1.5 text-[10px] text-[var(--hw-neutral-500)] border-r border-[var(--hw-neutral-200)] h-full flex items-center shrink-0">₱</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={s}
                                  onChange={(e) => updateSample(v.id, i, e.target.value)}
                                  placeholder="0.00"
                                  className="w-full px-1 text-[11px] text-[var(--hw-neutral-900)] focus:outline-none min-w-0 bg-transparent text-right pr-1.5"
                                  style={{ MozAppearance: "textfield" }}
                                />
                              </div>
                            ))}

                            <div className="h-8 flex items-center justify-center rounded-lg bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] px-1">
                              <span className="text-[11px] text-[var(--hw-neutral-700)] font-semibold">
                                {f.low !== null ? `₱${fmt(f.low)}` : <span className="text-[var(--hw-neutral-300)] font-normal">—</span>}
                              </span>
                            </div>

                            <div className="h-8 flex items-center justify-center rounded-lg bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] px-1">
                              <span className="text-[11px] text-[var(--hw-neutral-700)] font-semibold">
                                {f.high !== null ? `₱${fmt(f.high)}` : <span className="text-[var(--hw-neutral-300)] font-normal">—</span>}
                              </span>
                            </div>

                            <div className={`h-8 flex items-center justify-center rounded-lg border px-1 ${f.prevailing !== null ? "bg-[var(--hw-green-50)] border-[var(--hw-green-300)]" : "bg-[var(--hw-neutral-50)] border-[var(--hw-neutral-200)]"}`}>
                              <span className={`text-[11px] font-bold ${f.prevailing !== null ? "text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-300)] font-normal"}`}>
                                {f.prevailing !== null ? `₱${fmt(f.prevailing)}` : "—"}
                              </span>
                            </div>
                          </div>

                          {/* Mobile Variant Row */}
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

                    {/* Add Variant Button */}
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
                            <button onClick={() => commitVariant(com.id)} className="px-2.5 py-1.5 rounded-lg bg-[var(--hw-green-700)] text-white text-[11px] font-medium cursor-pointer">Add</button>
                            <button
                              onClick={() => { setAddingVariant(null); setVariantInput(""); }}
                              className="px-2.5 py-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[13px] text-[var(--hw-neutral-800)] cursor-pointer"
                            >Cancel</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingVariant(com.id); setVariantInput(""); }}
                            className="text-[12px] text-[var(--hw-green-700)] hover:underline pl-6 cursor-pointer"
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

      {/* Bottom Review Action Button */}
      <div
        ref={bottomReviewRef}
        className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)]"
      >
        <div className="text-center sm:text-left">
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
            Ready to review entered price data?
          </p>
          <p className="text-[12px] text-[var(--hw-neutral-600)] mt-0.5">
            {totalEnteredCount === 0
              ? "Enter sample prices above to review and save."
              : `${totalEnteredCount} price ${totalEnteredCount === 1 ? "record entered" : "records entered"} across all markets.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDataName(`DFTC Price Monitoring — ${formatDateLabel(selectedDate)}`);
            setReviewMode(true);
          }}
          disabled={totalEnteredCount === 0}
          className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-semibold hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[var(--shadow-xs)] flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Review Entered Data</span>
          {totalEnteredCount > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
              {totalEnteredCount}
            </span>
          )}
        </button>
      </div>

      {/* Modals */}
      {addCommodityOpen && <AddCommodityModal onClose={() => setAddCommodityOpen(false)} onAdd={handleAddCommodity} />}
      {hwInfoId && <HWInfoOverlay onClose={() => setHwInfoId(null)} />}
      {coverageOpen && <AnalyticsCoverageOverlay onClose={() => setCoverageOpen(false)} />}
    </div>
  );
}

export { DFTCPriceInput as default };
