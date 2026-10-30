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
  Loader2,
  RefreshCw
} from "lucide-react";
import {
  PRICE_CATEGORIES,
  UOM_OPTIONS
} from "./dftc-add-data-data";
import {
  MARKET_TABS,
  clearPrefillCache,
  loadPrefillSnapshot,
  resolveDraftCellTargets
} from "./dftcPricePrefill";
import { CommodityIllustration, COMMODITY_REGISTRY } from "../../global/components/shared/CommodityIllustrations";
import { HW_NAME_TO_ID as _HW_NAME_TO_ID } from "../../global/data/commodities";
import { apiDelete, apiGet, apiPost, apiPut, parseResponse } from "../../global/api";
import DFTCNotificationBanner from "../components/DFTCNotificationBanner";
import { capitalizeNameInput } from "../../global/utils/apiTransforms";
import { useDftcCatalog } from "../../global/hooks/useDftcCatalog";

function hwId(name) {
  return _HW_NAME_TO_ID[name] ?? null;
}
function hasHWIcon(name) {
  const id = hwId(name);
  return id !== null && id in COMMODITY_REGISTRY;
}

// Display name -> canonical DB commodity name for composite/market-listed items.
// Targets must match `commodity.name` exactly: a name that misses is
// auto-registered by the API as a NEW commodity, so a stale spelling here
// silently creates a duplicate instead of reusing the row.
const COMMODITY_NAME_OVERRIDES = {
  "Pak choi / Bok choy": "Pakchoy/Bokchoy",
  "Kangkong / Tinangkong": "Kangkong",
  "Kamote tops / Galay": "Kamote Tops"
};

function nameSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// The categories a new commodity can be filed under. Derived from the same list
// the form renders, so an id here is always an id the form reads: a hand-written
// list drifted from it ("lowland" vs "lowland-vegetables") and the commodity was
// filed in a bucket nothing renders, so it never appeared for anyone.
const CATEGORY_OPTIONS = PRICE_CATEGORIES.map((c) => ({ id: c.id, name: c.name }));

const LEFT_BG = "#c6efce";
const BANK_BG = "#ffeb9c";
const DFTC_BG = "#dae8fc";

const EMPTY_SAMPLES = ["", "", "", "", ""];

function emptyField(uom = "kg") {
  return { samples: [...EMPTY_SAMPLES], uom, low: null, high: null, prevailing: null };
}

function emptyTabFields() {
  return Object.fromEntries(MARKET_TABS.map((t) => [t.id, {}]));
}

function emptyTabMaps() {
  return Object.fromEntries(MARKET_TABS.map((t) => [t.id, new Map()]));
}

function emptyTabSets() {
  return Object.fromEntries(MARKET_TABS.map((t) => [t.id, new Set()]));
}

/** The source date a carried value came from, or null for anything else. */
function carriedSourceDate(carried, tabId, vid, date) {
  return carried[tabId]?.has(vid) ? date : null;
}

/** Field shape for a single stored prevailing price. */
function priceField(price, uom = "kg") {
  return { samples: [String(price), "", "", "", ""], uom, low: price, high: price, prevailing: price };
}

/** True when two form fields hold the same price, samples, and unit. */
function sameField(a, b) {
  if (!a || !b) return a === b;
  if (a.uom !== b.uom) return false;
  if (a.low !== b.low || a.high !== b.high || a.prevailing !== b.prevailing) return false;
  const sa = a.samples ?? [];
  const sb = b.samples ?? [];
  if (sa.length !== sb.length) return false;
  for (let i = 0; i < sa.length; i += 1) {
    if (sa[i] !== sb[i]) return false;
  }
  return true;
}

/**
 * Merge synced draft cells into a tab-field map.
 *
 * Pure on purpose: it returns the next map AND whether anything actually
 * changed, so the caller can keep the previous state object when there is no
 * news (a poll that finds nothing must not re-render the grid) and can report
 * the change without waiting for React to run the state updater.
 *
 * `targets` and `removed` must already exclude the fields this user owns.
 */
function mergeDraftTargets(base, targets, removed) {
  const next = {};
  for (const tab of MARKET_TABS) next[tab.id] = { ...(base?.[tab.id] || {}) };
  let changed = false;
  for (const { tab, vid, cell } of targets) {
    const field = priceField(cell.prevail_price, cell.uom);
    if (sameField(next[tab.id][vid], field)) continue;
    next[tab.id][vid] = field;
    changed = true;
  }
  for (const [tabId, vid] of removed) {
    if (!Object.prototype.hasOwnProperty.call(next[tabId], vid)) continue;
    delete next[tabId][vid];
    changed = true;
  }
  return { next, changed };
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
  const [categoryId, setCategoryId] = useState(CATEGORY_OPTIONS[0].id);
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
              onChange={(e) => { setName(capitalizeNameInput(e.target.value)); setError(""); }}
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
              onChange={(e) => setVariant(capitalizeNameInput(e.target.value))}
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
  skippedCarried,
  carriedDate,
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
            {skippedCarried > 0 && (
              <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-[12px] text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>
                  {skippedCarried} value{skippedCarried === 1 ? "" : "s"} carried from {formatDateLabel(carriedDate)} {skippedCarried === 1 ? "was" : "were"} left unchanged and will <strong>not</strong> be saved as {formatDateLabel(date)} prices.
                </span>
              </div>
            )}

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

// ─── Review price cell ───────────────────────────────────────────────────────
/** A price cell that dims a value the user never touched, so the review screen
 *  does not present a previous-day carry as something that will be saved. */
function ReviewPriceCell({ bg, value, skipped, carriedDate, isFilteredColumn, isDimmed }) {
  return (
    <td
      style={{
        background: bg,
        border: isFilteredColumn ? "2px solid #166534" : "1px solid #999",
        padding: "4px 8px",
        textAlign: "right",
        fontWeight: value !== null ? "bold" : "normal",
        fontStyle: skipped ? "italic" : "normal",
        color: skipped ? "#92400e" : undefined,
        opacity: isDimmed ? 0.35 : 1
      }}
      title={skipped ? `Carried from ${formatDateLabel(carriedDate)} — not saved unless changed` : undefined}
    >
      {value !== null ? `₱${fmt(value)}` : ""}
      {skipped && <span className="block text-[9px] font-medium not-italic">from {formatDateLabel(carriedDate)}</span>}
    </td>
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
function MobileVariantRow({ v, f, carriedFrom, onUpdateSample, onUpdateUom }) {
  const [expanded, setExpanded] = useState(false);
  const hasVal = hasValue(f);
  const { low, high, prevailing } = f;

  return (
    <div className={`border-b border-[var(--hw-neutral-50)] last:border-0 ${hasVal ? "bg-[var(--hw-green-50)]/30" : ""} ${carriedFrom ? "border-l-2 border-amber-400" : ""}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[var(--hw-neutral-50)] transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-medium text-[var(--hw-neutral-800)] truncate">{v.name}</span>
          {carriedFrom && (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 whitespace-nowrap">
              from {formatDateLabel(carriedFrom)}
            </span>
          )}
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
                      onKeyDown={(e) => {
                        if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                      }}
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

  // Shared commodity catalog — deduplicated across Price Input and Arrival
  // Input through React Query so both pages issue at most one request.
  const { data: catalogData } = useDftcCatalog();

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
  const [collapsedComs, setCollapsedComs] = useState(() => new Set());
  const toggleCommodity = (id) =>
    setCollapsedComs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
  const navTimer = useRef(null);

  const [hasDraft, setHasDraft] = useState(() => {
    try { return localStorage.getItem("dftc_price_draft") === "true"; } catch { return false; }
  });
  const [draftDismissed, setDraftDismissed] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("all");
  const reviewScrollRef = useRef(null);

  // Slide the review table to the filtered market column so it is visible without manual scrolling
  useEffect(() => {
    if (!reviewMode) return;
    const el = reviewScrollRef.current;
    if (!el) return;
    if (reviewFilter === "all") {
      if (typeof el.scrollTo === "function") el.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    // Small timeout to allow DOM to settle if reviewMode just activated
    const timer = setTimeout(() => {
      const targetTh = el.querySelector(`[data-col="${reviewFilter}"]`);
      if (!targetTh) return;
      const containerRect = el.getBoundingClientRect();
      const thRect = targetTh.getBoundingClientRect();
      const scrollOffset = thRect.left - containerRect.left + el.scrollLeft;
      if (typeof el.scrollTo === "function") el.scrollTo({ left: Math.max(0, scrollOffset - 120), behavior: "smooth" });
    }, 50);
    return () => clearTimeout(timer);
  }, [reviewFilter, reviewMode]);
  const [dataName, setDataName] = useState(() => `DFTC Price Monitoring — ${formatDateLabel(localToday())}`);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveProgressStage, setSaveProgressStage] = useState("Validating price entries...");
  // Guards a reporting date that arrived from navigation state: handleDateChange
  // clamps user input, but a future date passed in via navState bypasses it.
  const [dateError, setDateError] = useState("");
  const [saveError, setSaveError] = useState("");
  const catalogRef = useRef(null);
  // The DB catalogue items behind the map above. Kept so a row can be placed
  // for a commodity the static mirror has never heard of.
  const catalogItemsRef = useRef([]);
  // The rows the form gained from the DB catalogue. Only the rows the shared
  // draft references are ever added: the catalogue holds far more commodities
  // than the price sheet.
  const catalogRowsRef = useRef([]);
  // Bumped whenever a catalogue row is added, so the form re-renders and any
  // memo that walks the catalogue is invalidated.
  const [catalogRowsVersion, setCatalogRowsVersion] = useState(0);
  // Commodity ids the catalogue holds but the form has no category for: there
  // is nowhere to put the row, so a draft that references one must not
  // re-fetch the catalogue on every poll.
  const unplaceableRef = useRef(new Set());
  // Tracks whether the initial catalog-driven prefill has run, so catalog
  // refetches (60s, window focus) update the map without re-triggering prefill.
  const prefillInitRef = useRef(false);
  // Stable identity for the commodity resolver: the prefill module keys its
  // session memo on it, so a fresh closure per render would defeat the cache.
  // It only reads catalogRef, which never changes identity.
  const stableResolverRef = useRef(null);
  if (stableResolverRef.current === null) {
    stableResolverRef.current = (com, v) => resolveCommodityId(com, v);
  }
  // The variant resolver reads the custom commodity/variant state, so the
  // memoised autosave must call the CURRENT render's copy: a variety added at
  // runtime is invisible to the closure the callback was created in, and the
  // price would land on the parent commodity instead of its own row.
  const findCommodityRef = useRef(() => ({ cat: null, com: null, v: null }));
  findCommodityRef.current = findCommodityAndVariant;
  // The commodity and variant lists read the runtime additions through a ref
  // for the same reason: an async continuation must see the rows of the
  // current render, not the ones render #1 closed over.
  const customRowsRef = useRef({ customCommodities: {}, customVariants: {} });
  customRowsRef.current = { customCommodities, customVariants };
  // The draft resolver adds a row the form is missing, so it must run the
  // CURRENT render's copy: the memoised resync closure is render #1's.
  const resolveDraftCellsRef = useRef(async () => []);
  resolveDraftCellsRef.current = resolveDraftCells;

  // DFTC Personnel from database
  const [staffList, setStaffList] = useState([]);
  const [encodedBy, setEncodedBy] = useState("");
  const [encodedByRole, setEncodedByRole] = useState("");
  const [reviewedBy, setReviewedBy] = useState("");
  const [reviewedByRole, setReviewedByRole] = useState("");
  const [enteredTime, setEnteredTime] = useState(() => {
    return new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  });

  // Same-day rows only. This map is the sole input to remove_records, and a
  // previous-day row has no row on the selected date to delete.
  const prefilledRef = useRef(emptyTabMaps());
  // tabId -> Set<vid> of values that came from the previous calendar day.
  const carriedRef = useRef(emptyTabSets());
  // "tabId|vid" of every field the user touched, so a carried value is only
  // written when it was actually edited.
  const dirtyRef = useRef(new Set());
  // Monotonic load id: a slow response for date A must not overwrite a newer one.
  const prefillSeqRef = useRef(0);

  const [sameDayCount, setSameDayCount] = useState(0);
  const [carriedCount, setCarriedCount] = useState(0);
  const [unrenderableCount, setUnrenderableCount] = useState(0);
  const [carriedDate, setCarriedDate] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Shared-draft bookkeeping. `draftMetaRef` mirrors prefilledRef but carries the
  // per-cell draft metadata (server version + last editor) so autosave can send
  // an optimistic-concurrency check and a 409 can be attributed to a person.
  const draftMetaRef = useRef(emptyTabMaps());
  // Kept for diagnostics and backwards-compatible state tracking; the draft
  // timestamp below is the authoritative discard signal.
  const lastRemoteCellCountRef = useRef(0);
  // The draft timestamp is the generation token. It changes on every shared
  // write and on discard without requiring another database column.
  const draftUpdatedAtRef = useRef(null);
  // The day has already been finalized; the button becomes "Re-finalize" and a
  // finalize must bump the submission version rather than create a new one.
  const [draftFinalized, setDraftFinalized] = useState(false);
  // Human-readable 409 attribution shown next to the offending tab.
  const [draftConflict, setDraftConflict] = useState("");
  // "tabId|vid" pairs currently being written to the server, so a cell can show
  // an in-flight indicator without blocking the rest of the grid.
  const [draftSavingCells, setDraftSavingCells] = useState(() => new Set());
  // In-flight flag for the manual "Resync" pull of the shared draft.
  const [resyncing, setResyncing] = useState(false);

  /** True only for a previous-day value the user has not touched. */
  const isUntouchedCarried = useCallback(
    (tabId, vid) =>
      carriedRef.current[tabId]?.has(vid) === true &&
      !dirtyRef.current.has(`${tabId}|${vid}`),
    []
  );

  const draftRef = useRef({});
  draftRef.current = {
    selectedDate,
    tabFields,
    customVariants,
    customCommodities,
    carried: Object.fromEntries(MARKET_TABS.map((t) => [t.id, [...(carriedRef.current[t.id] ?? [])]])),
    carriedDate,
    dirty: [...dirtyRef.current]
  };

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
          setStaffList(list);

          // Restore previously selected personnel if they exist in the DB staff list
          let restoredEncoded = null;
          let restoredReviewed = null;
          try {
            const stored = JSON.parse(localStorage.getItem(`dftc_report_personnel_${selectedDate}`));
            if (stored?.encodedBy && list.some((s) => s.name === stored.encodedBy)) {
              restoredEncoded = list.find((s) => s.name === stored.encodedBy);
            }
            if (stored?.reviewedBy && list.some((s) => s.name === stored.reviewedBy)) {
              restoredReviewed = list.find((s) => s.name === stored.reviewedBy);
            }
          } catch {}

          const defaultEncoder = restoredEncoded || list[0];
          const defaultReviewer = restoredReviewed || (list.length > 1 ? list[1] : list[0]);

          setEncodedBy(defaultEncoder.name);
          setEncodedByRole(defaultEncoder.role);
          setReviewedBy(defaultReviewer.name);
          setReviewedByRole(defaultReviewer.role);
        }
      } catch {
        // Staff list will remain empty on network error
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDate]);

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

  // Apply the shared catalog query data when it arrives. Both the mount load
  // and the periodic refetch (60s, window focus) are handled by the shared
  // useDftcCatalog hook, so there is only one network request across both
  // DFTC input pages.
  useEffect(() => {
    if (!catalogData) return;
    applyCatalogItems(catalogData);
    addCatalogRows(catalogData.map((item) => item.id), catalogData);
    // Load the day prefill on the first catalog arrival only — subsequent
    // refetches just update the map, they do not re-trigger prefill.
    // The ref below tracks whether the initial prefill has run.
    if (!prefillInitRef.current) {
      prefillInitRef.current = true;
      loadDayPrefill(draftRef.current.selectedDate, { preserveEdits: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogData]);

  // Push every dirty field to the shared draft. One request per cell so two
  // inputters never overwrite each other wholesale, and a 409 on one cell does
  // not discard the rest. Best-effort: a failure keeps the localStorage fallback
  // and surfaces a message rather than losing the typed value.
  const pushInFlightRef = useRef(null);
  const pushDraftCells = useCallback(() => {
    const flush = async () => {
    // The debounce fires after this callback was created. draftRef.current is
    // re-assigned every render and always holds the latest committed state, so
    // read it here instead of closing over selectedDate/tabFields. Otherwise a
    // single edit pushes nothing and the last edit of a burst is lost.
    const live = draftRef.current;
    if (isFutureDate(live.selectedDate)) return;
    const pending = [];
    const cleared = [];
    for (const tab of MARKET_TABS) {
      for (const [vid, f] of Object.entries(live.tabFields[tab.id] || {})) {
        if (!dirtyRef.current.has(`${tab.id}|${vid}`)) continue;
        const tabMeta = MARKET_TABS.find((t) => t.id === tab.id);
        const { cat, com, v } = findCommodityRef.current(vid);
        const baseName = COMMODITY_NAME_OVERRIDES[com?.name] ?? com?.name ?? "";
        const baseKey = nameSlug(baseName);
        const variantName = v?.name;
        const isBaseOrRegular = !variantName || variantName === "Base" || variantName === "Regular";
        const variantKey = !isBaseOrRegular
          ? `${baseKey}-${nameSlug(variantName)}`
          : baseKey;
        const variantKnown = !!(catalogRef.current && catalogRef.current.has(variantKey));
        const hasValCell = hasValue(f);

        if (hasValCell) {
          let commodity_id = (catalogRef.current &&
            (catalogRef.current.get(variantKey) ?? catalogRef.current.get(baseKey))) ?? null;
          // Register custom-added commodities / new varieties on the fly so
          // their prices reach the DB instead of being skipped as unknown ids.
          if (!variantKnown && com) {
            const registered = await registerCommodity({
              name: baseName,
              category: cat?.name,
              variety: !isBaseOrRegular ? variantName : null,
              unit_of_measure: f.uom || "kg",
            });
            if (registered?.id) {
              commodity_id = registered.id;
              try {
                if (catalogRef.current) {
                  // The base key already points at the parent commodity's row:
                  // overwriting it would send the parent's own prices to the
                  // newly registered variety.
                  if (!catalogRef.current.has(baseKey)) {
                    catalogRef.current.set(baseKey, registered.id);
                  }
                  catalogRef.current.set(variantKey, registered.id);
                }
              } catch { /* ignore */ }
            }
          }
          if (commodity_id) {
            const cell = {
              reporting_date: live.selectedDate,
              commodity_id,
              source_id: tabMeta.sourceId,
              price_type: tabMeta.priceType,
              uom: f.uom || "kg",
              price_min: f.low ?? null,
              price_max: f.high ?? null,
              prevail_price: f.prevailing ?? null,
              observation_status: "Reported value",
              expected_version: draftMetaRef.current[tab.id]?.get(vid)?.version ?? null,
            };
            pending.push({ key: `${tab.id}|${vid}`, cell });
          }
        } else if (tabMeta) {
          // Edited to empty. Only a cell that exists in the draft needs a
          // DELETE; a field that was never drafted has nothing to remove.
          const meta = draftMetaRef.current[tab.id]?.get(vid);
          const commodity_id = meta?.commodity_id ?? resolveCommodityId(com, v);
          if (meta && commodity_id) {
            cleared.push({
              key: `${tab.id}|${vid}`,
              params: {
                reporting_date: live.selectedDate,
                commodity_id,
                source_id: tabMeta.sourceId,
                price_type: tabMeta.priceType,
              },
            });
          }
        }
      }
    }
    if (pending.length === 0 && cleared.length === 0) return;

    setDraftSavingCells(new Set([...pending, ...cleared].map((p) => p.key)));
    let conflict = "";
    const clearedSuccessfully = [];
    const savedSuccessfully = [];
    const acknowledgeConflict = (key, detail) => {
      const separator = key.indexOf("|");
      const tabId = separator === -1 ? "" : key.slice(0, separator);
      const vid = separator === -1 ? key : key.slice(separator + 1);
      const currentVersion = detail?.current_version;
      if (detail?.code === "draft_discarded") {
        dirtyRef.current.delete(key);
        draftMetaRef.current[tabId]?.delete(vid);
        return;
      }
      // A conflict is expected shared-edit behavior. Stop replaying the stale
      // version, but retain the server version so a later user edit can save
      // against the current row instead of creating a retry loop.
      dirtyRef.current.delete(key);
      if (Number.isInteger(currentVersion)) {
        const previous = draftMetaRef.current[tabId]?.get(vid) || {};
        draftMetaRef.current[tabId]?.set(vid, {
          ...previous,
          version: currentVersion,
          updatedBy: detail?.updated_by_user_id ?? previous.updatedBy,
        });
      }
    };
    for (const { key, params } of cleared) {
      try {
        const qs = new URLSearchParams(params).toString();
        await apiDelete(`/dftc/price-draft/cell?${qs}`);
        const tabId = key.split("|")[0];
        const vid = key.slice(tabId.length + 1);
        draftMetaRef.current[tabId]?.delete(vid);
        clearedSuccessfully.push(key);
      } catch (err) {
        if (err?.status === 409 || err?.statusCode === 409) {
          acknowledgeConflict(key, err?.detail);
          conflict = "Someone else edited these prices while you were typing. Review the values and try again.";
        } else {
          console.error("Draft cell delete failed:", err);
        }
      }
    }
    for (const { key, cell } of pending) {
      try {
        const res = await parseResponse(await apiPut("/dftc/price-draft/cell", {
          ...cell,
          // The server uses this only to reject writes after a discard. It
          // does not block saves to a different cell by another inputter.
          expected_draft_updated_at: draftUpdatedAtRef.current,
        }));
        if (res?.draft_updated_at) draftUpdatedAtRef.current = res.draft_updated_at;
        const tabId = key.split("|")[0];
        const vid = key.slice(tabId.length + 1);
        if (res?.version !== undefined && draftMetaRef.current[tabId]) {
          draftMetaRef.current[tabId].set(vid, {
            commodity_id: res.commodity_id,
            uom: res.uom,
            version: res.version,
            updatedBy: res.updated_by_user_id,
          });
        }
        savedSuccessfully.push({ key, cell });
      } catch (err) {
        if (err?.status === 409 || err?.statusCode === 409) {
          acknowledgeConflict(key, err?.detail);
          conflict = err?.detail?.code === "draft_discarded"
            ? "The shared draft was discarded by the other inputter."
            : "Someone else edited these prices while you were typing. Review the values and try again.";
        } else {
          console.error("Draft cell autosave failed:", err);
        }
      }
    }
    // A successful autosave is no longer a local edit. Clearing this marker is
    // important: it lets a discard made by the other inputter remove the same
    // value from this form on the next shared-draft poll. Keep the marker only
    // when the user typed again while the request was in flight.
    for (const key of clearedSuccessfully) {
      const tabId = key.split("|")[0];
      const vid = key.slice(tabId.length + 1);
      if (!hasValue(draftRef.current.tabFields[tabId]?.[vid])) dirtyRef.current.delete(key);
    }
    for (const { key, cell } of savedSuccessfully) {
      const tabId = key.split("|")[0];
      const vid = key.slice(tabId.length + 1);
      const current = draftRef.current.tabFields[tabId]?.[vid];
      if (sameField(current, priceField(cell.prevail_price, cell.uom))) dirtyRef.current.delete(key);
    }
    setDraftSavingCells(new Set());
      if (conflict) setDraftConflict(conflict);
    };

    // Autosave timers and finalization can fire close together. Queue them so
    // optimistic cell versions are never submitted concurrently by this page.
    const previous = pushInFlightRef.current || Promise.resolve();
    const next = previous.catch(() => { }).then(flush);
    pushInFlightRef.current = next;
    next.then(
      () => { if (pushInFlightRef.current === next) pushInFlightRef.current = null; },
      () => { if (pushInFlightRef.current === next) pushInFlightRef.current = null; },
    );
    return next;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pull the shared draft for the selected day and merge it into the form
  // without a reload, so the other inputter's numbers show up on their own.
  // A field this user typed into is never overwritten: their edit wins, and it
  // must still be able to 409 on the next autosave.
  const syncSharedDraft = useCallback(async () => {
    // Read the live date, never a render closure: the poll fires long after
    // the last render, and the user may have picked another day since.
    const date = draftRef.current.selectedDate;
    if (!date) return false;

    let data;
    try {
      data = await parseResponse(await apiGet(`/dftc/price-draft?reporting_date=${date}`));
    } catch {
      // Offline or a server error: keep what is on screen and say nothing.
      return false;
    }
    if (!data || !Array.isArray(data.cells)) return false;
    // The user may have switched days while the request was in flight. A
    // response for the old day must never land on the new one's form.
    if (draftRef.current.selectedDate !== date) return false;

    const remoteDraftToken = data.updated_at || null;
    const sharedDiscarded = Boolean(data.id) && data.cells.length === 0 &&
      draftUpdatedAtRef.current !== null &&
      remoteDraftToken !== draftUpdatedAtRef.current;
    if (remoteDraftToken !== null) draftUpdatedAtRef.current = remoteDraftToken;
    lastRemoteCellCountRef.current = data.cells.length;

    // Discard is authoritative. Clear this page's unsaved edits as well as
    // the cells that had already been autosaved, otherwise the discarded
    // values can be written back by the next debounce.
    const discarded = [];
    if (sharedDiscarded) {
      for (const tab of MARKET_TABS) {
        const keys = new Set([
          ...Object.keys(draftRef.current.tabFields[tab.id] || {})
            .filter((vid) => dirtyRef.current.has(`${tab.id}|${vid}`)),
          ...draftMetaRef.current[tab.id].keys(),
        ]);
        for (const vid of keys) discarded.push([tab.id, vid]);
        draftMetaRef.current[tab.id].clear();
      }
      for (const [tabId, vid] of discarded) dirtyRef.current.delete(`${tabId}|${vid}`);
    }

    // A cell whose commodity the form has no row for is healed here: the
    // catalogue is refreshed and the missing row added before the cells are
    // resolved.
    const targets = await resolveDraftCellsRef.current(data.cells);
    // Identity of every cell the server still holds. A cell this page cannot
    // render is still there, so it must not be mistaken for a deleted one.
    // The identity is written twice: exactly as the server sent it, and
    // normalized to the tab's market key, so the comparison below always uses
    // the same spelling the tabs use.
    const remoteCells = new Set();
    for (const cell of data.cells) {
      remoteCells.add(`${cell.source_key || cell.source_id}|${cell.price_type}|${cell.commodity_id}`);
    }
    for (const { tab, cell } of targets) {
      remoteCells.add(`${tab.sourceId}|${tab.price_type}|${cell.commodity_id}`);
    }

    // 1. Refresh the per-cell metadata of every cell we accept. A dirty field
    //    keeps its own version so the next autosave can still detect a clash.
    for (const { tab, vid, cell } of targets) {
      if (dirtyRef.current.has(`${tab.id}|${vid}`)) continue;
      const map = draftMetaRef.current[tab.id];
      if (!map) continue;
      map.set(vid, {
        commodity_id: cell.commodity_id,
        uom: cell.uom,
        version: cell.version,
        updatedBy: cell.updated_by_user_id,
      });
      // A synced value is a draft cell, never a carried-over one.
      carriedRef.current[tab.id]?.delete(vid);
    }

    // 2. A cell the server no longer holds was cleared by the other inputter.
    const removed = [...discarded];
    for (const tab of MARKET_TABS) {
      const map = draftMetaRef.current[tab.id];
      if (!map) continue;
      for (const [vid, meta] of Array.from(map.entries())) {
        if (dirtyRef.current.has(`${tab.id}|${vid}`)) continue;
        if (!meta?.commodity_id) continue;
        if (remoteCells.has(`${tab.sourceId}|${tab.priceType}|${meta.commodity_id}`)) continue;
        map.delete(vid);
        removed.push([tab.id, vid]);
      }
    }

    // 3. Merge the values into the form. A field this user owns is skipped
    //    entirely: neither its value nor its version is touched.
    const fresh = targets.filter(({ tab, vid }) => !dirtyRef.current.has(`${tab.id}|${vid}`));
    const gone = removed.filter(([tabId, vid]) => !dirtyRef.current.has(`${tabId}|${vid}`));

    // When nothing changed the previous state object is returned unchanged, so
    // a poll with no news does not re-render the grid.
    const preview = mergeDraftTargets(draftRef.current.tabFields, fresh, gone);
    let changed = false;
    setTabFields((prev) => {
      const { next, changed: didChange } = mergeDraftTargets(prev, fresh, gone);
      changed = changed || didChange;
      return didChange ? next : prev;
    });

    // The other inputter finalized the day. Never un-finalize it.
    if (data.status === "saved") setDraftFinalized(true);

    return changed || preview.changed;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The shared draft changes while the other inputter works. Pull it on a
  // timer so their numbers appear without a reload. The interval is cleared on
  // unmount and whenever the day is finalized (nothing left to sync).
  const syncRef = useRef(syncSharedDraft);
  useEffect(() => { syncRef.current = syncSharedDraft; }, [syncSharedDraft]);

  useEffect(() => {
    if (draftFinalized) return;
    const id = setInterval(() => {
      // A hidden tab or an offline device must not spend the user's battery
      // on a request nobody is waiting for.
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      syncRef.current().catch(() => { });
    }, 15000);
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible" && navigator.onLine !== false) {
        syncRef.current().catch(() => { });
      }
    };
    document.addEventListener("visibilitychange", refreshOnReturn);
    window.addEventListener("focus", refreshOnReturn);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refreshOnReturn);
      window.removeEventListener("focus", refreshOnReturn);
    };
  }, [draftFinalized]);

  // Commodity catalogue live-sync is now handled by the shared useDftcCatalog
  // hook above, which refetches every 60 seconds and on window focus. The old
  // manual poll and its setInterval are removed to avoid duplicate requests.

  const triggerAutosave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (oldTimer.current) clearTimeout(oldTimer.current);
    // Any edit means the user is acting on the failure notice.
    setSaveError("");
    setDraftConflict("");
    setSaveStatus("saving");
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem("dftc_price_draft", "true");
        localStorage.setItem("dftc_price_draft_data", JSON.stringify(draftRef.current));
        if (navigator.onLine === false) {
          setSaveStatus("offline");
        } else {
          setSaveStatus("saved");
        }
      } catch {
        setSaveStatus("saved");
      }
      oldTimer.current = setTimeout(() => setSaveStatus("savedOld"), 30000);
      // Server-side shared draft. Fire-and-forget so typing never blocks; the
      // local fallback above already covers an offline or failing connection.
      pushDraftCells().catch(() => { });
    }, 1500);
  }, [pushDraftCells]);

  // Timers scheduled above outlive unmount and fire setState/navigate on a dead
  // tree, which leaks navigation into whatever screen the user moved to.
  useEffect(() => () => {
    if (navTimer.current) clearTimeout(navTimer.current);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (oldTimer.current) clearTimeout(oldTimer.current);
    // Do not leave the last edit device-local when the user navigates away
    // before the debounce fires.
    if (dirtyRef.current.size > 0) pushDraftCells().catch(() => { });
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
    // A draft written before provenance existed has no `carried` key at all.
    // Treat it as all same-day (today's behaviour) so a retyped draft is never
    // silently dropped from the payload.
    const carried = emptyTabSets();
    if (savedData?.carried) {
      for (const tab of MARKET_TABS) {
        carried[tab.id] = new Set(savedData.carried[tab.id] ?? []);
      }
    }
    carriedRef.current = carried;
    dirtyRef.current = new Set(Array.isArray(savedData?.dirty) ? savedData.dirty : []);
    // carriedRef.current is keyed by tab id, not an iterable of Sets.
    setCarriedCount(Object.values(carriedRef.current).reduce((n, s) => n + s.size, 0));
    if (savedData?.carriedDate) setCarriedDate(savedData.carriedDate);
    setDraftDismissed(true);
  }

  useEffect(() => {
    if (location.state?.restoreDraft) {
      restoreDraft();
    }
  }, [location.state]);

  async function discardDraft() {
    // Discard the shared server draft first so it cannot be re-layered back
    // onto the form by the next prefill.
    try {
      await apiDelete(`/dftc/price-draft?reporting_date=${selectedDate}`);
    } catch {
      // A failed delete must not block the local clear.
    }
    setDraftDismissed(true);
    setHasDraft(false);
    try {
      localStorage.removeItem("dftc_price_draft");
      localStorage.removeItem("dftc_price_draft_data");
    } catch { }
    // Invalidate any prefill request that was already in flight. Its response
    // must not repopulate the form after the user discarded the draft.
    prefillSeqRef.current += 1;
    setTabFields(emptyTabFields());
    dirtyRef.current = new Set();
    draftMetaRef.current = emptyTabMaps();
    draftUpdatedAtRef.current = null;
    prefilledRef.current = emptyTabMaps();
    carriedRef.current = emptyTabSets();
    setDraftFinalized(false);
    setSameDayCount(0);
    setCarriedCount(0);
    setUnrenderableCount(0);
    setCarriedDate(null);
  }

  // Load existing prices for the given date across all 5 price columns, then
  // fall back to the previous calendar day only for markets that have nothing
  // of their own on the selected date.
  //
  // `preserveEdits` is for the mount path: the user may have started typing
  // while the lookup was in flight, and a prefill must never discard that. A date
  // change is the opposite — those edits belong to the old date.
  async function loadDayPrefill(date, { preserveEdits = false } = {}) {
    if (!date) return;
    const seq = ++prefillSeqRef.current;

    // Reset synchronously, BEFORE the await. With exact-date lookups an empty or
    // failed response is now the common path, and leaving the previous date's
    // numbers on screen meant they could be saved under the wrong date.
    if (preserveEdits) {
      setTabFields((prev) => {
        const next = emptyTabFields();
        for (const tab of MARKET_TABS) {
          for (const [vid, field] of Object.entries(prev[tab.id] || {})) {
            if (dirtyRef.current.has(`${tab.id}|${vid}`)) next[tab.id][vid] = field;
          }
        }
        return next;
      });
    } else {
      setTabFields(emptyTabFields());
      dirtyRef.current = new Set();
    }
    prefilledRef.current = emptyTabMaps();
    carriedRef.current = emptyTabSets();
    setSameDayCount(0);
    setCarriedCount(0);
    setUnrenderableCount(0);
    setCarriedDate(null);

    // Today's manual-entry form loads the shared draft so both inputters see the
    // same in-progress cells. (Drafts are server-side now; the old "today is a
    // blank capture surface" rule no longer applies.)
    // (early return removed)

    try {
      // The shared draft is the source of truth for the selected day's in-progress
      // cells (it holds both inputters' work). The recorded-price snapshot below is
      // only a fallback for a date whose draft has not been started yet; a draft
      // cell always wins over a snapshot cell for the same variant.
      let draftByTab = emptyTabFields();
      let draftMeta = emptyTabMaps();
      let draftFinalized = false;
      try {
        const draftRes = await apiGet(`/dftc/price-draft?reporting_date=${date}`);
        const draftData = await parseResponse(draftRes);
        if (draftData && Array.isArray(draftData.cells)) {
          draftUpdatedAtRef.current = draftData.updated_at || null;
          draftFinalized = draftData.status === "saved";
          if (draftData.cells.length) {
            // Same healing as the live resync: a commodity the form has no
            // row for yet gets one before the cells are resolved.
            const resolved = await resolveDraftCellsRef.current(draftData.cells);
            for (const { tab, vid, cell } of resolved) {
              draftByTab[tab.id][vid] = priceField(cell.prevail_price, cell.uom);
              draftMeta[tab.id].set(vid, {
                commodity_id: cell.commodity_id,
                uom: cell.uom,
                version: cell.version,
                updatedBy: cell.updated_by_user_id,
              });
            }
          }
        }
      } catch { /* draft load is best-effort */ }

      const snap = await loadPrefillSnapshot(date, stableResolverRef.current);
      // A slow response for a date the user has already moved off of.
      if (!snap || seq !== prefillSeqRef.current) return;

      setDraftFinalized(draftFinalized);

      const nextPrefilled = emptyTabMaps();
      const nextCarried = emptyTabSets();
      const prefillByTab = emptyTabFields();

      for (const tab of MARKET_TABS) {
        for (const [vid, entry] of snap.sameDayByTab[tab.id] ?? []) {
          prefillByTab[tab.id][vid] = priceField(entry.price, entry.uom);
          nextPrefilled[tab.id].set(vid, entry);
        }
        for (const [vid, entry] of snap.carriedByTab[tab.id] ?? []) {
          prefillByTab[tab.id][vid] = priceField(entry.price, entry.uom);
          nextCarried[tab.id].add(vid);
        }
      }

      // Layer the draft on top: a draft cell replaces the snapshot value and its
      // per-cell metadata becomes the prefill tracking (used for version checks).
      draftMetaRef.current = draftMeta;
      for (const tab of MARKET_TABS) {
        for (const [vid, field] of Object.entries(draftByTab[tab.id] ?? {})) {
          prefillByTab[tab.id][vid] = field;
          nextPrefilled[tab.id].set(vid, draftMeta[tab.id].get(vid));
          nextCarried[tab.id].delete(vid);
        }
      }

      prefilledRef.current = nextPrefilled;
      carriedRef.current = nextCarried;
      // Merge, never replace: anything the user typed while the lookup was in
      // flight survives, and a value they edited is not overwritten by a prefill.
      setTabFields((prev) => {
        const next = emptyTabFields();
        for (const tab of MARKET_TABS) {
          next[tab.id] = { ...prefillByTab[tab.id] };
          for (const [vid, field] of Object.entries(prev[tab.id] || {})) {
            if (dirtyRef.current.has(`${tab.id}|${vid}`)) next[tab.id][vid] = field;
          }
        }
        return next;
      });
      setSameDayCount(snap.sameDayCount);
      setCarriedCount(snap.carriedCount);
      setUnrenderableCount(snap.unrenderableCount);
      setCarriedDate(snap.carriedCount > 0 ? snap.previousDate : null);
    } catch {
      // Prefill is an enhancement; the form stays empty and the user encodes
      // from scratch. State was already reset above, so nothing to undo here.
    }
  }

  function handleDateChange(newDate) {
    if (!newDate) return;
    const today = localToday();
    if (newDate > today) newDate = today;
    if (newDate === selectedDate) return;

    setDateError("");
    setSelectedDate(newDate);
    lastRemoteCellCountRef.current = 0;
    setDataName(`DFTC Price Monitoring — ${formatDateLabel(newDate)}`);
    setCollapsed(new Set(PRICE_CATEGORIES.map((c) => c.id)));
    loadDayPrefill(newDate);
    triggerAutosave();
  }

  async function registerCommodity(body) {
    try {
      const registered = await parseResponse(await apiPost("/dftc/commodities", body));
      if (registered?.id) {
        const baseName = COMMODITY_NAME_OVERRIDES[registered.name] ?? registered.name;
        const baseKey = nameSlug(baseName);
        const map = catalogRef.current || new Map();
        map.set(baseKey, map.get(baseKey) ?? registered.id);
        if (registered.variety) {
          map.set(`${baseKey}-${nameSlug(registered.variety)}`, registered.id);
        }
        catalogRef.current = map;
        catalogItemsRef.current = [
          ...catalogItemsRef.current.filter((item) => item.id !== registered.id),
          registered,
        ];
      }
      return registered;
    } catch (error) {
      console.error("Failed to register DFTC commodity:", error);
      setSaveError("Could not sync this commodity/variety. Please retry after the connection recovers.");
      return null;
    }
  }

  function getField(tabId, variantId, defaultUom = "kg") {
    return tabFields[tabId]?.[variantId] ?? emptyField(defaultUom);
  }

  function updateSample(variantId, sampleIdx, value) {
    dirtyRef.current.add(`${activeTabId}|${variantId}`);
    // Strip any non-numerical characters (e.g. e, E, +, -, etc.)
    let cleanVal = String(value).replace(/[^0-9.]/g, "");
    const parts = cleanVal.split(".");
    if (parts.length > 2) {
      cleanVal = parts[0] + "." + parts.slice(1).join("");
    }
    setTabFields((prev) => {
      const curTabMap = prev[activeTabId] || {};
      const existing = curTabMap[variantId] || emptyField();
      const newSamples = [...existing.samples];
      newSamples[sampleIdx] = cleanVal;
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
    dirtyRef.current.add(`${activeTabId}|${variantId}`);
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
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
        // Also collapse its commodities
        const cat = PRICE_CATEGORIES.find((c) => c.id === catId);
        if (cat) {
          setCollapsedComs((cPrev) => {
            const cNext = new Set(cPrev);
            getAllCommodities(cat).forEach((com) => cNext.add(com.id));
            return cNext;
          });
        }
      }
      return next;
    });
  }

  const allCollapsed = PRICE_CATEGORIES.every((c) => collapsed.has(c.id));

  function toggleCollapseAll() {
    if (allCollapsed) {
      setCollapsed(new Set());
      setCollapsedComs(new Set());
    } else {
      setCollapsed(new Set(PRICE_CATEGORIES.map((c) => c.id)));
      const comIds = new Set();
      PRICE_CATEGORIES.forEach((cat) => {
        getAllCommodities(cat).forEach((com) => comIds.add(com.id));
      });
      setCollapsedComs(comIds);
    }
  }

  // ── DB catalogue ──────────────────────────────────────────────────────────
  // The catalogue is fetched once and reused: the mount effect, the day loader
  // and the resync all go through these two helpers, so there is exactly one
  // implementation of the fetch and one of the id map.
  async function fetchCatalogItems() {
    const data = await parseResponse(await apiGet("/dftc/commodities"));
    return Array.isArray(data) ? data : data?.items ?? [];
  }

  function applyCatalogItems(items) {
    const map = new Map();
    for (const row of items) {
      const baseName = COMMODITY_NAME_OVERRIDES[row.name] ?? row.name;
      map.set(nameSlug(baseName), row.id);
      if (row.variety) {
        map.set(`${nameSlug(baseName)}-${nameSlug(row.variety)}`, row.id);
      }
    }
    catalogRef.current = map;
    catalogItemsRef.current = items;
    return map;
  }

  /**
   * The commodities of one category: the static mirror, the rows this user
   * added at runtime, and a block for every catalogue row whose commodity the
   * form does not have yet.
   */
  function getAllCommodities(cat) {
    const customs = customRowsRef.current.customCommodities[cat.id] ?? [];
    const present = new Set([...cat.commodities, ...customs].map((c) => c.id));
    const fromCatalog = [];
    for (const row of catalogRowsRef.current) {
      if (row.categoryId !== cat.id) continue;
      // One block per commodity, even when the catalogue holds several
      // varieties of it.
      if (present.has(row.commodityId)) continue;
      present.add(row.commodityId);
      fromCatalog.push({ id: row.commodityId, name: row.commodityName, isHW: false, variants: [] });
    }
    return [...cat.commodities, ...customs, ...fromCatalog];
  }

  /**
   * The variants of one commodity: the static mirror, the rows this user added
   * at runtime, and the catalogue rows that belong to this commodity.
   */
  function getVariants(com) {
    const customs = customRowsRef.current.customVariants[com.id] ?? [];
    const fromCatalog = catalogRowsRef.current
      .filter((row) => row.commodityId === com.id)
      .map((row) => ({ id: row.variantId, name: row.variantName }));
    return [...com.variants, ...customs, ...fromCatalog];
  }

  // ── Rows the form gained from the DB catalogue ────────────────────────────
  /** Identity of a rendered row: its commodity and its variety, by name. */
  function variantIdentity(commodityName, variantName) {
    return `${nameSlug(commodityName)}|${nameSlug(variantName)}`;
  }

  /** The identities of every variant the form renders right now. */
  function renderedIdentities() {
    const ids = new Set();
    for (const cat of PRICE_CATEGORIES) {
      for (const com of getAllCommodities(cat)) {
        for (const v of getVariants(com)) {
          ids.add(variantIdentity(com.name, v.name));
        }
      }
    }
    return ids;
  }

  /**
   * Turn a DB catalogue item into a row the form can render.
   *
   * An item whose name is a commodity of the static mirror is a new VARIANT of
   * it. An item with a name the mirror does not have is a new COMMODITY and
   * needs a category of ours to sit in. Returns null when neither applies.
   */
  function buildCatalogRow(item) {
    const baseName = COMMODITY_NAME_OVERRIDES[item.name] ?? item.name;
    const baseSlug = nameSlug(baseName);

    for (const cat of PRICE_CATEGORIES) {
      for (const com of cat.commodities) {
        if (nameSlug(COMMODITY_NAME_OVERRIDES[com.name] ?? com.name) !== baseSlug) continue;
        return {
          commodityId: com.id,
          commodityName: com.name,
          categoryId: cat.id,
          variantId: item.variety ? `${com.id}-${nameSlug(item.variety)}` : `${com.id}-regular`,
          variantName: item.variety || "Regular",
          dbId: item.id,
        };
      }
    }

    const cat = PRICE_CATEGORIES.find(
      (c) => c.name.toLowerCase() === (item.category ?? "").toLowerCase()
    );
    if (!cat) return null;
    return {
      commodityId: baseSlug,
      commodityName: baseName,
      categoryId: cat.id,
      variantId: item.variety ? `${baseSlug}-${nameSlug(item.variety)}` : `${baseSlug}-regular`,
      variantName: item.variety || "Regular",
      dbId: item.id,
    };
  }

  /**
   * Add the form rows for the catalogue items behind `commodityIds`.
   *
   * A row is added only when the form renders no variant with the same
   * identity (commodity name + variety name). Dedupe by identity, not by id:
   * the row this user added at runtime carries a different id but the same
   * variety, and it must not show up twice.
   */
  function addCatalogRows(commodityIds, items) {
    const identities = renderedIdentities();
    const added = [];
    for (const dbId of commodityIds) {
      const item = items.find((i) => i.id === dbId);
      if (!item) continue;
      const row = buildCatalogRow(item);
      if (!row) {
        // The catalogue holds the commodity but the form has no category of
        // ours for it: there is nowhere to put the row.
        unplaceableRef.current.add(dbId);
        continue;
      }
      const identity = variantIdentity(row.commodityName, row.variantName);
      if (identities.has(identity)) continue;
      identities.add(identity);
      added.push(row);
    }
    if (added.length === 0) return 0;
    catalogRowsRef.current = [...catalogRowsRef.current, ...added];
    setCatalogRowsVersion((v) => v + 1);
    return added.length;
  }

  /** Every (commodity, variant) pair the form can render, right now. */
  function buildCatalogue() {
    const pairs = [];
    for (const cat of PRICE_CATEGORIES) {
      for (const com of getAllCommodities(cat)) {
        for (const v of getVariants(com)) {
          pairs.push({ com, v });
        }
      }
    }
    return pairs;
  }

  /** The commodity ids of the draft cells the form cannot render (yet). */
  function unresolvedCommodityIds(cells, pairs) {
    const ids = [];
    for (const cell of Array.isArray(cells) ? cells : []) {
      const id = cell?.commodity_id;
      if (!id || ids.includes(id)) continue;
      if (pairs.some(({ com, v }) => resolveCommodityId(com, v) === id)) continue;
      ids.push(id);
    }
    return ids;
  }

  /**
   * Resolve the shared draft's cells onto the form.
   *
   * A cell for a commodity the form has no row for is dropped by the resolver.
   * That is what happens when the other inputter registered a commodity or a
   * variety at runtime: the static mirror does not know it. The catalogue is
   * refreshed once, the missing rows are added, and the cells are resolved
   * again, so the other inputter's number reaches the screen. A refresh that
   * fails keeps everything that is already on screen.
   */
  async function resolveDraftCells(cells) {
    const resolver = stableResolverRef.current;
    const catalogue = buildCatalogue();
    const targets = resolveDraftCellTargets(cells, resolver, catalogue);
    const unresolved = unresolvedCommodityIds(cells, catalogue)
      .filter((id) => !unplaceableRef.current.has(id));
    if (unresolved.length === 0) return targets;

    let items;
    try {
      items = await fetchCatalogItems();
    } catch {
      // Offline or a server error: keep what is on screen.
      return targets;
    }
    applyCatalogItems(items);
    addCatalogRows(unresolved, catalogItemsRef.current);
    // Re-resolve even when no row was added: the refresh alone can make an
    // existing row resolvable — the row this user added at runtime for a
    // variety the catalogue now knows by id.
    return resolveDraftCellTargets(cells, resolver, buildCatalogue());
  }

  function commitVariant(commodityId) {
    const trimmed = variantInput.trim();
    if (!trimmed) { setAddingVariant(null); setVariantInput(""); return; }
    const newId = `custom-${commodityId}-${Date.now()}`;
    setCustomVariants((prev) => ({
      ...prev,
      [commodityId]: [...prev[commodityId] ?? [], { id: newId, name: trimmed }]
    }));
    const parentCategory = PRICE_CATEGORIES.find((category) =>
      category.commodities.some((commodity) => commodity.id === commodityId) ||
      (customCommodities[category.id] ?? []).some((commodity) => commodity.id === commodityId)
    );
    const parentCommodity = parentCategory && getAllCommodities(parentCategory).find((commodity) => commodity.id === commodityId);
    if (parentCommodity) {
      registerCommodity({
        name: COMMODITY_NAME_OVERRIDES[parentCommodity.name] ?? parentCommodity.name,
        category: parentCategory.name,
        variety: trimmed,
        unit_of_measure: "kg",
      });
    }
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
    registerCommodity({
      name,
      category: cat?.name,
      variety: variantName === "Base" ? null : variantName,
      unit_of_measure: uom,
    });
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
    const variantName = v?.name;
    const isBaseOrRegular = !variantName || variantName === "Base" || variantName === "Regular";
    const variantKey = !isBaseOrRegular
      ? `${baseKey}-${nameSlug(variantName)}`
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
  // Counts mean "prices that will actually be written", so an untouched
  // previous-day carry is excluded: it is a starting point, not an entry.
  function getTabCount(tabId) {
    const map = tabFields[tabId] || {};
    return Object.entries(map).filter(([vid, f]) => hasValue(f) && !isUntouchedCarried(tabId, vid)).length;
  }

  /** Values pre-filled from the previous day that will not be saved untouched. */
  const skippedCarriedCount = useMemo(() => {
    let sum = 0;
    for (const tab of MARKET_TABS) {
      for (const [vid, f] of Object.entries(tabFields[tab.id] || {})) {
        if (hasValue(f) && isUntouchedCarried(tab.id, vid)) sum += 1;
      }
    }
    return sum;
  }, [tabFields]);

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

          // The review is the complete monitoring sheet. Keep catalog rows even
          // when every market field is blank so an entry in one commodity does
          // not hide the remaining commodities from the report.
          const uom = bankRetailField.uom || bankWholesaleField.uom || bankLandingField.uom || dftcRetailField.uom || dftcWholesaleField.uom || "kg";
          const skipped = {
            bankLanding: isUntouchedCarried("bangkerohan-landing", v.id),
            bankWholesale: isUntouchedCarried("bangkerohan-wholesale", v.id),
            bankRetail: isUntouchedCarried("bangkerohan-retail", v.id),
            dftcWholesale: isUntouchedCarried("dftc-wholesale", v.id),
            dftcRetail: isUntouchedCarried("dftc-retail", v.id)
          };
          const anyCarried = MARKET_TABS.some((t) => carriedRef.current[t.id]?.has(v.id));
          catRows.push({
            no: vi === 0 ? itemNumber++ : "",
            cat,
            com,
            v,
            vi,
            uom,
            carriedDate: anyCarried ? carriedDate : null,
            skipped,
            bankLanding: bankLandingField.prevailing,
            bankWholesale: bankWholesaleField.prevailing,
            bankRetail: bankRetailField.prevailing,
            dftcWholesale: dftcWholesaleField.prevailing,
            dftcRetail: dftcRetailField.prevailing
          });
        });
      });
      if (catRows.length > 0) {
        rows.push({ cat, rows: catRows });
      }
    });
    return rows;
  }, [tabFields, customCommodities, customVariants, carriedDate, catalogRowsVersion]);

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

  // Finalize: promote the shared draft into price_record + a submission.
  // the day once, atomically, server-side, over every inputter's cells.
  async function finalizeDraft() {
    if (isFutureDate(selectedDate)) {
      setDateError("Reporting date cannot be after today.");
      return;
    }
    setDateError("");
    setSaveError("");
    setIsSaving(true);
    setSaveProgress(30);
    setSaveProgressStage("Sending the day's prices...");

    // Flush any not-yet-autosaved cell first so review and finalize see the same
    // values that are on screen.
    try {
      await pushDraftCells();
    } catch (err) {
      console.error("Failed to push draft cells before finalize:", err);
      setIsSaving(false);
      setSaveError(
        err?.message
          ? `Could not save prices before finalizing: ${err.message}`
          : "Could not sync prices before finalizing. Please try again."
      );
      return;
    }

    setSaveProgress(70);
    setSaveProgressStage("Consolidating price monitoring records...");
    try {
      const res = await parseResponse(
        await apiPost("/dftc/price-draft/finalize", {
          reporting_date: selectedDate,
          encoded_by: encodedBy,
          reviewed_by: reviewedBy,
        }),
      );
      const count = res?.record_count ?? 0;

      try {
        localStorage.setItem(
          `dftc_report_personnel_${selectedDate}`,
          JSON.stringify({ encodedBy, encodedByRole, reviewedBy, reviewedByRole }),
        );
        localStorage.removeItem("dftc_price_draft");
        localStorage.removeItem("dftc_price_draft_data");
      } catch { }

      setHasDraft(false);
      setDraftFinalized(true);
      setSaved(true);
      setSaveProgress(100);
      setSaveProgressStage("Price monitoring data saved successfully!");
      clearPrefillCache();
      queryClient.invalidateQueries({ queryKey: ["dftc", "submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dftc-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dftc-report-preview"] });
      queryClient.invalidateQueries({ queryKey: ["dftc", "home"] });
      queryClient.invalidateQueries({ queryKey: ["dftc", "requirements"] });
      queryClient.invalidateQueries({ queryKey: ["prices"] });

      navTimer.current = setTimeout(() => {
        setIsSaving(false);
        navigate("/dftc/input", {
          state: {
            successMsg: `${dataName} saved successfully (${count} price records across all markets).`,
            restoreMarketFilter: navState?.restoreMarketFilter,
            restoreDataTypeFilter: navState?.restoreDataTypeFilter,
            justSavedType: "price",
            justSavedDate: selectedDate,
            justSavedAt: new Date().toISOString(),
          },
        });
      }, 900);
    } catch (err) {
      // Stay on the page: the draft is intact server-side, so the user retries
      // without retyping. Never navigate away on a failed finalize.
      setIsSaving(false);
      setSaveError(
        err?.message
          ? `Could not finalize: ${err.message}`
          : "Could not finalize the day's prices. Your entries are safe — try again.",
      );
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

  // ═══════════════════════════════════════════════════════════════════════════
  // REVIEW MODE: Consolidated Image 2 DFTC Price Monitoring Table
  // ═══════════════════════════════════════════════════════════════════════════
  if (reviewMode) {
    return (
      <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto" style={{ overflowX: "hidden" }}>
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
          {skippedCarriedCount > 0 && (
            <>{" "}<strong className="text-[var(--hw-neutral-900)]">{skippedCarriedCount}</strong> value{skippedCarriedCount === 1 ? "" : "s"} carried from {formatDateLabel(carriedDate)} {skippedCarriedCount === 1 ? "was" : "were"} left unchanged and will not be saved.</>
          )}
        </DFTCNotificationBanner>

        {/* Summary Badges Card — Clickable to filter details */}
        <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3 sm:p-4 mb-4 sm:mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hw-neutral-100)] pb-2.5 mb-2.5 sm:pb-3 sm:mb-3">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2.5 text-[12px]">
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
                  className={`text-left rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:p-3 border transition-all cursor-pointer flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 ${
                    card.id === "dftc-wholesale" ? "col-span-2 sm:col-span-1" : ""
                  } ${
                    isSelected
                      ? "bg-white border-[var(--hw-neutral-400)] shadow-md ring-1 ring-black/5"
                      : "bg-[var(--hw-neutral-50)] border-[var(--hw-neutral-200)] hover:bg-white hover:shadow-xs"
                  }`}
                  title={isSelected ? "Active filter (click to reset)" : `Filter by ${card.label}`}
                >
                  <span className={`block text-[11px] sm:text-[12px] leading-snug ${isSelected ? "text-[var(--hw-neutral-900)] font-bold" : "text-[var(--hw-neutral-700)] font-medium"}`}>
                    {card.label}
                  </span>
                  <span className="text-[12px] sm:text-[13px] font-bold text-[var(--hw-neutral-900)] whitespace-nowrap text-right shrink-0">
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

          <div className="overflow-x-auto" ref={reviewScrollRef}>
            <table className="w-full text-[12px] border-collapse" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ background: LEFT_BG, border: "1px solid #999", padding: "6px 8px", width: 44, textAlign: "center" }}>No.</th>
                  <th rowSpan={2} style={{ background: LEFT_BG, border: "1px solid #999", padding: "6px 8px", minWidth: 160, textAlign: "left" }}>Commodity</th>
                  <th rowSpan={2} style={{ background: LEFT_BG, border: "1px solid #999", padding: "6px 8px", width: 72, textAlign: "center" }}>UOM</th>
                  <th
                    colSpan={3}
                    style={{
                      background: BANK_BG,
                      border: "1px solid #999",
                      padding: "6px 8px",
                      textAlign: "center",
                      fontWeight: "bold",
                      opacity: reviewFilter.startsWith("dftc") ? 0.45 : 1
                    }}
                  >
                    BANKEROHAN MARKET
                  </th>
                  <th
                    colSpan={2}
                    style={{
                      background: DFTC_BG,
                      border: "1px solid #999",
                      padding: "6px 8px",
                      textAlign: "center",
                      fontWeight: "bold",
                      opacity: reviewFilter.startsWith("bangkerohan") ? 0.45 : 1
                    }}
                  >
                    DFTC TABOAN
                  </th>
                </tr>
                <tr>
                  {[
                    { id: "bangkerohan-landing", name: "Landing" },
                    { id: "bangkerohan-wholesale", name: "Wholesale" },
                    { id: "bangkerohan-retail", name: "Retail" }
                  ].map((h) => {
                    const isFiltered = reviewFilter === h.id;
                    const isDimmed = reviewFilter !== "all" && !isFiltered;
                    return (
                      <th
                        key={h.id}
                        data-col={h.id}
                        style={{
                          background: BANK_BG,
                          border: isFiltered ? "2px solid #166534" : "1px solid #999",
                          padding: "5px 8px",
                          textAlign: "right",
                          fontSize: 11,
                          width: 90,
                          fontWeight: isFiltered ? "bold" : "normal",
                          opacity: isDimmed ? 0.45 : 1
                        }}
                      >
                        {h.name} {isFiltered && "✓"}
                      </th>
                    );
                  })}
                  {[
                    { id: "dftc-wholesale", name: "Wholesale" },
                    { id: "dftc-retail", name: "Retail" }
                  ].map((h) => {
                    const isFiltered = reviewFilter === h.id;
                    const isDimmed = reviewFilter !== "all" && !isFiltered;
                    return (
                      <th
                        key={h.id}
                        data-col={h.id}
                        style={{
                          background: DFTC_BG,
                          border: isFiltered ? "2px solid #166534" : "1px solid #999",
                          padding: "5px 8px",
                          textAlign: "right",
                          fontSize: 11,
                          width: 90,
                          fontWeight: isFiltered ? "bold" : "normal",
                          opacity: isDimmed ? 0.45 : 1
                        }}
                      >
                        {h.name} {isFiltered && "✓"}
                      </th>
                    );
                  })}
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
                              <span><strong>{r.com.name}</strong> {r.v.name && r.v.name !== "Base" && r.v.name !== "Regular" ? `(${r.v.name})` : ""}</span>
                            ) : (
                              <span style={{ paddingLeft: 16 }}>{r.v.name && r.v.name !== "Base" && r.v.name !== "Regular" ? `(${r.v.name})` : (r.v.name || "")}</span>
                            )}
                          </td>
                          <td style={{ background: LEFT_BG, border: "1px solid #999", padding: "4px 8px", textAlign: "center" }}>
                            {r.uom}
                          </td>
                          <ReviewPriceCell
                            bg={BANK_BG}
                            value={reviewFilter === "all" || reviewFilter === "bangkerohan-landing" ? r.bankLanding : null}
                            skipped={r.skipped.bankLanding}
                            carriedDate={r.carriedDate}
                            isFilteredColumn={reviewFilter === "bangkerohan-landing"}
                            isDimmed={reviewFilter !== "all" && reviewFilter !== "bangkerohan-landing"}
                          />
                          <ReviewPriceCell
                            bg={BANK_BG}
                            value={reviewFilter === "all" || reviewFilter === "bangkerohan-wholesale" ? r.bankWholesale : null}
                            skipped={r.skipped.bankWholesale}
                            carriedDate={r.carriedDate}
                            isFilteredColumn={reviewFilter === "bangkerohan-wholesale"}
                            isDimmed={reviewFilter !== "all" && reviewFilter !== "bangkerohan-wholesale"}
                          />
                          <ReviewPriceCell
                            bg={BANK_BG}
                            value={reviewFilter === "all" || reviewFilter === "bangkerohan-retail" ? r.bankRetail : null}
                            skipped={r.skipped.bankRetail}
                            carriedDate={r.carriedDate}
                            isFilteredColumn={reviewFilter === "bangkerohan-retail"}
                            isDimmed={reviewFilter !== "all" && reviewFilter !== "bangkerohan-retail"}
                          />
                          <ReviewPriceCell
                            bg={DFTC_BG}
                            value={reviewFilter === "all" || reviewFilter === "dftc-wholesale" ? r.dftcWholesale : null}
                            skipped={r.skipped.dftcWholesale}
                            carriedDate={r.carriedDate}
                            isFilteredColumn={reviewFilter === "dftc-wholesale"}
                            isDimmed={reviewFilter !== "all" && reviewFilter !== "dftc-wholesale"}
                          />
                          <ReviewPriceCell
                            bg={DFTC_BG}
                            value={reviewFilter === "all" || reviewFilter === "dftc-retail" ? r.dftcRetail : null}
                            skipped={r.skipped.dftcRetail}
                            carriedDate={r.carriedDate}
                            isFilteredColumn={reviewFilter === "dftc-retail"}
                            isDimmed={reviewFilter !== "all" && reviewFilter !== "dftc-retail"}
                          />
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Encoded by / Reviewed by Footer (matching Image 5) */}
          <div className="p-3.5 sm:p-5 border-t border-[var(--hw-neutral-200)] bg-white grid grid-cols-2 gap-3 sm:gap-6 text-[12px]">
            <div>
              <p className="font-semibold text-black">Encoded by:</p>
              <p className="font-bold text-black mt-1 sm:mt-2 text-[12px] sm:text-[13px] uppercase truncate">{encodedBy}</p>
              <p className="text-[var(--hw-neutral-700)] text-[11px] sm:text-[12px] truncate">{encodedByRole}</p>
            </div>
            <div>
              <p className="font-semibold text-black">Reviewed by:</p>
              <p className="font-bold text-black mt-1 sm:mt-2 text-[12px] sm:text-[13px] uppercase truncate">{reviewedBy}</p>
              <p className="text-[var(--hw-neutral-700)] text-[11px] sm:text-[12px] truncate">{reviewedByRole}</p>
            </div>
          </div>
        </div>

        {/* Save Card */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3.5 sm:p-5">
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
            {draftConflict && (
              <div
                role="alert"
                className="mb-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                {draftConflict}
              </div>
            )}
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
              {draftFinalized
                ? `Re-finalize ${dataName} (${totalEnteredCount} records)`
                : `Finalize ${dataName} (${totalEnteredCount} records)`}
            </button>
          </div>

          {/* Centered Loading Modal Overlay while saving (Progress Bar) */}
          {isSaving && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-sm w-full text-center shadow-xl border border-[var(--hw-neutral-200)] flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-[var(--hw-green-50)] border border-[var(--hw-green-200)] flex items-center justify-center text-[var(--hw-green-700)] mb-3">
                  {saveProgress === 100 ? (
                    <Check className="w-6 h-6 text-[var(--hw-green-700)]" />
                  ) : (
                    <FileText className="w-6 h-6 text-[var(--hw-green-700)]" />
                  )}
                </div>
                <h3 className="text-[16px] font-bold text-[var(--hw-neutral-900)]">Saving Price Monitoring Data</h3>
                <p className="text-[12px] text-[var(--hw-neutral-600)] mt-1 leading-relaxed">
                  Please wait while your data is being validated and consolidated...
                </p>

                {/* Progress Bar */}
                <div className="w-full mt-5">
                  <div className="flex items-center justify-between text-[11px] font-medium text-[var(--hw-neutral-600)] mb-1.5">
                    <span className="truncate pr-2">{saveProgressStage}</span>
                    <span className="font-bold text-[var(--hw-green-700)] shrink-0">{saveProgress}%</span>
                  </div>
                  <div className="w-full bg-[var(--hw-neutral-100)] h-2.5 rounded-full overflow-hidden border border-[var(--hw-neutral-200)]">
                    <div
                      className="bg-[var(--hw-green-700)] h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${saveProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {confirmOpen && (
            <ConfirmFinalizeModal
              date={selectedDate}
              totalRecords={totalEnteredCount}
              tabBreakdown={tabBreakdown}
              skippedCarried={skippedCarriedCount}
              carriedDate={carriedDate}
              encodedBy={encodedBy}
              encodedByRole={encodedByRole}
              reviewedBy={reviewedBy}
              reviewedByRole={reviewedByRole}
              onClose={() => setConfirmOpen(false)}
              onConfirm={() => {
                setConfirmOpen(false);
                // finalizeDraft owns its own error handling; this catch only
                // guards a rejection outside its internal try.
                finalizeDraft().catch((err) => {
                  console.error("DFTC price finalize failed:", err);
                  setIsSaving(false);
                  setSaveError(
                    `Could not finalize: ${err?.message || "unexpected error"}. ` +
                    `Your entries are still on this page — press Finalize again.`
                  );
                });
              }}
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
    <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto" style={{ overflowX: "hidden" }}>
      {/* Draft restore banner */}
      {hasDraft && !draftDismissed && (
        <DFTCNotificationBanner
          variant="warning"
          title="Continue your saved draft"
          description="An unfinished entry was found on this device."
          className="mb-3 sm:mb-4"
          actions={
            <>
              <button
                type="button"
                onClick={discardDraft}
                className="text-[11.5px] sm:text-[12px] text-[var(--hw-neutral-500)] hover:text-[var(--hw-neutral-700)] cursor-pointer"
              >
                Discard Draft
              </button>
              <button
                type="button"
                onClick={restoreDraft}
                className="font-semibold text-amber-600 underline hover:text-amber-700 text-[11.5px] sm:text-[12px] cursor-pointer"
              >
                Resume Draft
              </button>
            </>
          }
        />
      )}

      {/* Amend banner — records already on file for this day were loaded */}
      {sameDayCount > 0 && (
        <DFTCNotificationBanner
          variant="info"
          title="Amending existing entry"
          description={`${sameDayCount} existing price records were loaded for ${formatDateLabel(selectedDate)}. Adjust values you need to change, or switch tabs to add more.`}
          className="mb-3 sm:mb-4"
        />
      )}

      {/* Carry banner — values came from the previous day, not from this date */}
      {carriedCount > 0 && (
        <DFTCNotificationBanner
          variant="warning"
          title={`Starting point from ${formatDateLabel(carriedDate)}`}
          description={`${carriedCount} price values were loaded from the previous day because no records exist yet for ${formatDateLabel(selectedDate)}. Rows are marked "from ${formatDateLabel(carriedDate)}" — they are saved as ${formatDateLabel(selectedDate)} prices only if you change them.`}
          className="mb-5"
        />
      )}

      {/* Disclosure — records this page has no input for, so they cannot be amended here */}
      {unrenderableCount > 0 && (
        <p className="mb-5 text-[12px] text-[var(--hw-neutral-600)]">
          {unrenderableCount} existing price {unrenderableCount === 1 ? "record" : "records"} for commodities not available in this form are left unchanged and are not shown here.
        </p>
      )}

      {/* Header: Back Button, Title, SaveStatusIndicator, Top Hyperlink Review Button */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => navigate("/dftc/input", { state: { restoreMarketFilter: navState?.restoreMarketFilter, restoreDataTypeFilter: navState?.restoreDataTypeFilter } })}
              className="p-1.5 -ml-1.5 rounded-xl hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] transition-colors cursor-pointer shrink-0"
              title="Back to Submit Data"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-[var(--hw-neutral-900)] truncate">Add Price Data</h1>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            <SaveStatusIndicator />
            {/* Top Hyperlink button navigating directly to review mode like the bottom button */}
            <button
              type="button"
              onClick={() => {
                setDataName(`DFTC Price Monitoring — ${formatDateLabel(selectedDate)}`);
                setReviewMode(true);
              }}
              disabled={totalEnteredCount === 0}
              className="text-[12.5px] sm:text-[13px] font-semibold text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] underline cursor-pointer inline-flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              title="Review Entered Data"
            >
              Review ({totalEnteredCount})
            </button>
          </div>
        </div>

        {/* Tab Navigation for Markets & Price Types + Editable Date Picker (no future dates) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          {/* Market / Price-Type Tabs filling available width before the date button */}
          <div className="flex-1 min-w-0 grid grid-cols-6 sm:flex rounded-lg border border-[var(--hw-neutral-200)] overflow-hidden bg-white shadow-[var(--shadow-xs)]">
            {MARKET_TABS.map((tab, ti) => {
              const active = activeTabId === tab.id;
              const count = getTabCount(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={`${ti < 3 ? "col-span-2 border-b sm:border-b-0" : "col-span-3"} ${ti === 2 ? "border-r-0 sm:border-r" : "border-r"} sm:flex-1 sm:min-w-0 py-2 sm:py-2.5 px-1.5 sm:px-3 text-[11.5px] sm:text-[13px] leading-tight font-medium transition-colors text-center cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 last:border-r-0 border-[var(--hw-neutral-200)] ${
                    active
                      ? "bg-[var(--hw-green-700)] text-white font-semibold"
                      : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
                  }`}
                >
                  <span className="sm:truncate">{tab.label}</span>
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
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] self-end lg:self-auto">
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
              className="w-[118px] sm:w-auto text-[12px] sm:text-[13px] font-medium text-[var(--hw-neutral-900)] bg-transparent border-0 focus:outline-none cursor-pointer"
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
        <div className="px-2.5 sm:px-4 py-2 sm:py-3 flex items-center gap-1.5 sm:gap-2 border-b border-[var(--hw-neutral-200)] overflow-x-auto">
          {/* Search */}
          <div className="relative flex-1 min-w-[70px] sm:min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--hw-neutral-400)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full pl-8 pr-2 sm:pr-3 py-1.5 sm:py-2 rounded-lg border border-[var(--hw-neutral-200)] bg-white text-[12px] text-[var(--hw-neutral-900)] placeholder:text-[var(--hw-neutral-400)] focus:outline-none focus:border-[var(--hw-green-700)]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-[var(--hw-neutral-400)]" />
              </button>
            )}
          </div>

          {/* Resync shared draft */}
          <button
            type="button"
            onClick={() => {
              setResyncing(true);
              // A failed pull must clear the in-flight state without surfacing
              // anything: the form simply keeps what it already shows.
              syncSharedDraft().catch(() => {}).finally(() => setResyncing(false));
            }}
            disabled={resyncing}
            aria-label="Resync shared draft"
            title="Resync shared draft"
            className="shrink-0 flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-[var(--hw-neutral-200)] text-[11px] sm:text-[12px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Resync</span>
          </button>

          {/* Add Commodity */}
          <button
            onClick={() => setAddCommodityOpen(true)}
            aria-label="Add Commodity"
            title="Add Commodity"
            className="shrink-0 flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[var(--hw-green-700)] text-white text-[11px] sm:text-[12px] font-medium hover:bg-[var(--hw-green-800)] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:hidden">Add</span>
            <span className="hidden sm:inline">Add Commodity</span>
          </button>

          {/* Show All / Entered Only */}
          <div className="flex rounded-lg border border-[var(--hw-neutral-200)] overflow-hidden shrink-0">
            {["all", "entered"].map((m) => (
              <button
                key={m}
                onClick={() => setShowMode(m)}
                className={`px-1.5 xs:px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10.5px] xs:text-[11px] sm:text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${showMode === m ? "bg-[var(--hw-neutral-900)] text-white font-semibold" : "text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"}`}
              >
                {m === "all" ? "All" : "Entered"}
              </button>
            ))}
          </div>

          {/* Collapse All / Expand All */}
          <button
            onClick={toggleCollapseAll}
            title={allCollapsed ? "Expand All" : "Collapse All"}
            aria-label={allCollapsed ? "Expand All" : "Collapse All"}
            className="shrink-0 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-[var(--hw-neutral-200)] text-[11px] sm:text-[12px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer flex items-center gap-1"
          >
            <span className="sm:hidden">{allCollapsed ? "Expand" : "Collapse"}</span>
            <span className="hidden sm:inline">{allCollapsed ? "Expand All" : "Collapse All"}</span>
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

          const isCol = searchQuery.trim() ? false : collapsed.has(cat.id);
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
                const colCom = searchQuery.trim() ? false : collapsedComs.has(com.id);
                return (
                  <div key={com.id} className="border-b border-[var(--hw-neutral-100)] last:border-0">
                    {/* Commodity Header */}
                    <div
                      onClick={() => toggleCommodity(com.id)}
                      className="px-3 sm:px-4 py-2 bg-white flex items-center justify-between border-b border-[var(--hw-neutral-50)] cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {com.isHW && hasHWIcon(com.name)
                          ? <CommodityIllustration commodityId={hwId(com.name)} className="w-5 h-5 shrink-0" />
                          : <Leaf className={`w-4 h-4 shrink-0 ${com.isHW ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-400)]"}`} />}
                        <span className="text-[13px] font-semibold text-[var(--hw-neutral-900)] truncate">{com.name}</span>
                        {com.isHW && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setHwInfoId(com.id); }}
                            className="text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)]"
                            title="HarvestWise Supported Commodity"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCoverageOpen(true); }}
                          className="text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)]"
                          title="About Analytics Coverage"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {colCom
                        ? <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />}
                    </div>

                    {/* Variant Rows */}
                    {!colCom && variants.map((v) => {
                      const f = getField(activeTabId, v.id);
                      return (
                        <div key={v.id}>
                          {/* Desktop Grid */}
                          <div
                            className={`hidden md:grid gap-2 items-center px-4 py-2 border-b border-[var(--hw-neutral-50)] hover:bg-[var(--hw-neutral-50)] transition-colors ${hasValue(f) ? "bg-[var(--hw-green-50)]/20" : ""}`}
                            style={{ gridTemplateColumns: "1fr 88px repeat(5, 78px) 76px 76px 84px" }}
                          >
                            <div
                              className={`pl-6 flex items-center gap-2 min-w-0 self-stretch ${carriedSourceDate(carriedRef.current, activeTabId, v.id, carriedDate) ? "border-l-2 border-amber-400 -ml-4 pl-4" : ""}`}
                            >
                              <span className="text-[12px] text-[var(--hw-neutral-800)] truncate">{v.name}</span>
                              {carriedSourceDate(carriedRef.current, activeTabId, v.id, carriedDate) && (
                                <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 whitespace-nowrap">
                                  from {formatDateLabel(carriedDate)}
                                </span>
                              )}
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
                                  onKeyDown={(e) => {
                                    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                                  }}
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
                              carriedFrom={carriedSourceDate(carriedRef.current, activeTabId, v.id, carriedDate)}
                              onUpdateSample={(i, val) => updateSample(v.id, i, val)}
                              onUpdateUom={(uom) => updateUom(v.id, uom)}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Variant Button */}
                    {!colCom && showMode === "all" && (
                      <div className="px-4 py-2 border-b border-[var(--hw-neutral-50)]">
                        {addingVariant === com.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-[var(--hw-neutral-800)] pl-6">+</span>
                            <input
                              autoFocus
                              type="text"
                              value={variantInput}
                        onChange={(e) => setVariantInput(capitalizeNameInput(e.target.value))}
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
          {skippedCarriedCount > 0 && (
            <span className="text-[11px] font-medium text-amber-700 whitespace-nowrap">
              {skippedCarriedCount} carried from {formatDateLabel(carriedDate)} will be skipped
            </span>
          )}
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
