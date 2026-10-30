import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
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
  Truck
} from "lucide-react";
import {
  PRICE_CATEGORIES,
  UOM_OPTIONS
} from "./dftc-add-data-data";
import { CommodityIllustration, COMMODITY_REGISTRY } from "../../global/components/shared/CommodityIllustrations";
import { HW_NAME_TO_ID as _HW_NAME_TO_ID } from "../../global/data/commodities";
import { apiGet, apiPost, apiPut, apiDelete, parseResponse } from "../../global/api";
import DFTCNotificationBanner from "../components/DFTCNotificationBanner";
import { normalizeKey } from "../components/DFTCFilePreview.jsx";
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

/**
 * The key a commodity or variety name is looked up by.
 *
 * Diacritics are folded: the DB spells a Saging variety "Senorita" and the
 * static mirror spells it "Señorita". Without folding they are two identities
 * for one variety — the sheet would offer it twice, and the mirror's row would
 * not resolve to the DB row. `normalizeKey` is the same folding the price
 * preview uses to match an uploaded workbook.
 */
function nameSlug(name) {
  return normalizeKey(name).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// The categories a new commodity can be filed under. Derived from the same list
// the grid renders, so an id here is always an id the grid reads: a hand-written
// list drifted from it ("lowland" vs "lowland-vegetables") and the commodity was
// filed in a bucket nothing renders, so it never appeared for anyone.
const CATEGORY_OPTIONS = PRICE_CATEGORIES.map((c) => ({ id: c.id, name: c.name }));

// Drafts written before the ids were derived filed Lowland/Highland under
// legacy bucket keys the grid never reads; they are mapped by category name and
// merged into the derived category so a restored draft still shows them.
const LEGACY_CATEGORY_NAMES = { lowland: "Lowland Vegetables", highland: "Highland Vegetables" };

function migrateDraftCommodities(commodities) {
  const next = { ...commodities };
  Object.entries(LEGACY_CATEGORY_NAMES).forEach(([legacyId, name]) => {
    const legacy = next[legacyId];
    if (!legacy?.length) return;
    const targetId = PRICE_CATEGORIES.find((c) => c.name === name)?.id;
    if (!targetId) return;
    delete next[legacyId];
    next[targetId] = [...next[targetId] ?? [], ...legacy];
  });
  return next;
}

const MONTHS = [
  { val: "01", name: "January" },
  { val: "02", name: "February" },
  { val: "03", name: "March" },
  { val: "04", name: "April" },
  { val: "05", name: "May" },
  { val: "06", name: "June" },
  { val: "07", name: "July" },
  { val: "08", name: "August" },
  { val: "09", name: "September" },
  { val: "10", name: "October" },
  { val: "11", name: "November" },
  { val: "12", name: "December" }
];

// Authentic Excel Fills & Borders from DFTC-VOLUME-2025-Final.xlsx (OVERALL TOTAL sheet)
const EXCEL_FARM_BG = "#ff99ff";   // Light pink / magenta (FFFF99FF)
const EXCEL_OTHER_BG = "#92d050";  // Fresh lime green (FF92D050)
const EXCEL_TOTAL_BG = "#ffff00";  // Bright yellow (FFFFFF00)
const EXCEL_HEADER_BG = "#f2f2f2"; // Standard header fill
const EXCEL_BORDER = "1px solid #777";

export function getWeeksForMonth(year, month) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const totalDays = new Date(y, m, 0).getDate();
  const monthName = MONTHS.find((item) => parseInt(item.val, 10) === m)?.name || "Month";
  const shortMonth = monthName.slice(0, 3);

  const weeks = [
    { weekNum: 1, startDay: 1, endDay: 7 },
    { weekNum: 2, startDay: 8, endDay: 14 },
    { weekNum: 3, startDay: 15, endDay: 21 },
    { weekNum: 4, startDay: 22, endDay: 28 }
  ];

  if (totalDays > 28) {
    weeks.push({ weekNum: 5, startDay: 29, endDay: totalDays });
  }

  return weeks.map((w) => {
    const rangeLabel = `${shortMonth} ${w.startDay} – ${shortMonth} ${w.endDay}, ${y}`;
    const endIso = `${y}-${String(m).padStart(2, "0")}-${String(w.endDay).padStart(2, "0")}`;
    const startIso = `${y}-${String(m).padStart(2, "0")}-${String(w.startDay).padStart(2, "0")}`;
    return {
      weekNum: w.weekNum,
      label: `Week ${w.weekNum} (${shortMonth} ${w.startDay} – ${w.endDay})`,
      fullLabel: `Week ${w.weekNum} of ${monthName} ${y}`,
      rangeLabel,
      startDay: w.startDay,
      endDay: w.endDay,
      endIso,
      startIso
    };
  });
}

function getCurrentWeekOfMonth(d = new Date()) {
  const day = d.getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  if (day <= 28) return 4;
  return 5;
}

function emptyArrivalField(uom = "kg") {
  return { farmSource: "", otherSource: "", uom };
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
function isValidDateString(dateStr) {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}
function isFutureDate(dateStr) {
  return isValidDateString(dateStr) && dateStr > localToday();
}
function getReportingDateError(dateStr) {
  if (!isValidDateString(dateStr)) return "Enter a valid reporting date.";
  return isFutureDate(dateStr) ? "Reporting date cannot be after today." : "";
}
function combinedTotal(f) {
  const farm = parseFloat(f.farmSource);
  const other = parseFloat(f.otherSource);
  if (isNaN(farm) && isNaN(other)) return "";
  const total = (isNaN(farm) ? 0 : farm) + (isNaN(other) ? 0 : other);
  return total.toLocaleString();
}
function hasValue(f) {
  if (!f) return false;
  const farmVal = parseFloat(f.farmSource);
  const otherVal = parseFloat(f.otherSource);
  return (!isNaN(farmVal) && farmVal > 0) || (!isNaN(otherVal) && otherVal > 0);
}

function fmtKg(val) {
  if (val === null || val === undefined || isNaN(val) || val === "") return "";
  return Number(val).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a commodity name.");
      return;
    }
    const err = onAdd(trimmed, categoryId, variant.trim(), uom);
    if (err) {
      setError(err);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--hw-neutral-100)]">
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Add New Commodity</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] cursor-pointer">
            <X className="w-4 h-4 text-[var(--hw-neutral-600)]" />
          </button>
        </div>

        <div className="p-5 space-y-3.5">
          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">
              Commodity Name <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(capitalizeNameInput(e.target.value)); setError(""); }}
              placeholder="e.g. Squash, Ginger"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)] cursor-pointer"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">
              Initial Variant / Descriptor
              <span className="text-[12px] text-[var(--hw-neutral-500)] ml-1.5 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={variant}
              onChange={(e) => setVariant(capitalizeNameInput(e.target.value))}
              placeholder="e.g. Suprema, Red, Native"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Default Unit of Measurement</label>
            <select
              value={uom}
              onChange={(e) => setUom(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)] cursor-pointer"
            >
              {UOM_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {error && (
            <p className="text-[12px] text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </p>
          )}

          <p className="text-[12px] text-[var(--hw-neutral-600)] leading-relaxed">
            Newly added commodities will be registered in the DFTC catalog and included across all reporting and Excel exports.
          </p>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors cursor-pointer shadow-xs"
          >
            Add Commodity
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ConfirmFinalizeArrivalModal ─────────────────────────────────────────────
function ConfirmFinalizeArrivalModal({
  periodLabel,
  totalRecords,
  totalVolume,
  farmVolume,
  otherVolume,
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
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Confirm Finalize & Save Arrival Volume</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] cursor-pointer">
            <X className="w-4 h-4 text-[var(--hw-neutral-600)]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[13px] text-[var(--hw-neutral-800)]">
            <strong>DFTC Arrival Volume</strong> · Volume of Commodities Dropped at DFTC for {periodLabel}
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-[var(--hw-green-200)] bg-[var(--hw-green-50)]">
              <span className="text-[13px] font-medium text-[var(--hw-green-800)]">Total Source Values Entered</span>
              <span className="text-[13px] font-bold text-[var(--hw-green-800)]">{totalRecords} inputs</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px] text-[var(--hw-neutral-700)] bg-[var(--hw-neutral-50)] p-3 rounded-xl border border-[var(--hw-neutral-200)]">
              <div>
                <p className="text-[11px] font-medium text-[var(--hw-neutral-500)] uppercase">Combined Total</p>
                <p className="text-[14px] font-bold text-[var(--hw-neutral-900)] mt-0.5">{fmtKg(totalVolume)}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[var(--hw-neutral-500)] uppercase">Farm Source</p>
                <p className="text-[14px] font-bold text-emerald-800 mt-0.5">{fmtKg(farmVolume)}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[var(--hw-neutral-500)] uppercase">Other Sources</p>
                <p className="text-[14px] font-bold text-amber-800 mt-0.5">{fmtKg(otherVolume)}</p>
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
            Once saved, these records will be consolidated under <strong>DFTC Arrival Volume — {periodLabel}</strong> and become viewable and exportable from Recent Saved Data.
          </p>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
              className="w-4 h-4 rounded text-[var(--hw-green-700)] focus:ring-[var(--hw-green-700)]"
            />
            <span className="text-[13px] text-[var(--hw-neutral-900)]">
              I confirm these arrival volume records have been verified and are ready to finalize.
            </span>
          </label>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!verified}
            className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-semibold hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
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

// ─── Info Overlays ───────────────────────────────────────────────────────────
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
          <button onClick={onClose} className="shrink-0 p-0.5 rounded hover:bg-[var(--hw-neutral-100)] cursor-pointer">
            <X className="w-3.5 h-3.5 text-[var(--hw-neutral-600)]" />
          </button>
        </div>
        <p className="text-[11px] text-[var(--hw-neutral-800)] leading-relaxed">
          This commodity receives volume analytics, trend forecasting, and supply pressure insights in HarvestWise.
        </p>
      </div>
    </div>
  );
}

function CoverageOverlay({ onClose }) {
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="absolute bg-white rounded-xl shadow-[var(--shadow-lg)] p-5 border border-[var(--hw-neutral-200)] max-w-sm"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[var(--hw-green-700)] shrink-0" />
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">About Arrival Volume</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-0.5 rounded hover:bg-[var(--hw-neutral-100)] cursor-pointer">
            <X className="w-3.5 h-3.5 text-[var(--hw-neutral-600)]" />
          </button>
        </div>
        <p className="text-[12px] text-[var(--hw-neutral-700)] leading-relaxed">
          Arrival volume records reflect agricultural commodities dropped at the Davao Food Terminal Complex (DFTC) either directly from farmer hauling trucks (Farm Source) or outside suppliers/markets (Other Sources).
        </p>
      </div>
    </div>
  );
}

// ─── Mobile Arrival Variant Row ──────────────────────────────────────────────
function MobileArrivalVariantRow({ v, f, onUpdateFarm, onUpdateOther, onUpdateUom }) {
  const farmVal = parseFloat(f.farmSource) || 0;
  const otherVal = parseFloat(f.otherSource) || 0;
  const combined = farmVal + otherVal;
  const uom = f.uom || "kg";

  return (
    <div className={`p-3 border-b border-[var(--hw-neutral-100)] ${hasValue(f) ? "bg-[var(--hw-green-50)]/20" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-medium text-[var(--hw-neutral-800)]">{v.name}</span>
        <select
          value={uom}
          onChange={(e) => onUpdateUom(e.target.value)}
          className="h-7 px-2 rounded-lg border border-[var(--hw-neutral-200)] text-[11px] text-[var(--hw-neutral-900)] bg-white"
        >
          {UOM_OPTIONS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-[10px] text-[var(--hw-neutral-500)] uppercase font-semibold mb-0.5">Farm Source</label>
          <input
            type="number"
            min="0"
            step="any"
            value={f.farmSource}
            onKeyDown={(e) => {
              if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
            }}
            onChange={(e) => onUpdateFarm(e.target.value)}
            placeholder="0"
            className="w-full px-2 py-1 text-right rounded-lg border border-[var(--hw-neutral-200)] bg-white text-[12px]"
          />
        </div>
        <div>
          <label className="block text-[10px] text-[var(--hw-neutral-500)] uppercase font-semibold mb-0.5">Other Sources</label>
          <input
            type="number"
            min="0"
            step="any"
            value={f.otherSource}
            onKeyDown={(e) => {
              if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
            }}
            onChange={(e) => onUpdateOther(e.target.value)}
            placeholder="0"
            className="w-full px-2 py-1 text-right rounded-lg border border-[var(--hw-neutral-200)] bg-white text-[12px]"
          />
        </div>
      </div>
      {combined > 0 && (
        <div className="flex items-center justify-between pt-1 border-t border-[var(--hw-neutral-100)] text-[11px]">
          <span className="text-[var(--hw-neutral-600)] font-medium">Combined Total:</span>
          <span className="font-bold text-[var(--hw-neutral-900)]">{fmtKg(combined)} {uom}</span>
        </div>
      )}
    </div>
  );
}

// ─── DFTCArrivalInput Main Component ─────────────────────────────────────────
export default function DFTCArrivalInput() {
  const { data: catalogData } = useDftcCatalog();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const navState = location.state;

  // Period / Frequency selection: 'monthly' (Daily and Weekly removed per requirements)
  const [periodType, setPeriodType] = useState(() => navState?.periodType || "monthly");
  const [selectedDate, setSelectedDate] = useState(() => navState?.date ?? localToday());
  const [selectedWeek, setSelectedWeek] = useState(() => navState?.week ?? getCurrentWeekOfMonth());
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return String(d.getMonth() + 1).padStart(2, "0");
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    return String(new Date().getFullYear());
  });

  const availableWeeks = useMemo(() => {
    return getWeeksForMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const activeWeekObj = useMemo(() => {
    const found = availableWeeks.find((w) => w.weekNum === selectedWeek);
    return found || availableWeeks[availableWeeks.length - 1];
  }, [availableWeeks, selectedWeek]);

  // fields: { [variantId]: { farmSource: string, otherSource: string, uom: string } }
  const [fields, setFields] = useState({});

  // Category collapsed state: starts collapsed initially
  const [collapsedComs, setCollapsedComs] = useState(() => new Set());
  const toggleCommodity = (id) =>
    setCollapsedComs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [collapsed, setCollapsed] = useState(() => new Set(PRICE_CATEGORIES.map((c) => c.id)));
  const [customVariants, setCustomVariants] = useState({});
  const [customCommodities, setCustomCommodities] = useState({});
  const arrivalDraftStateRef = useRef({});
  const [addingVariant, setAddingVariant] = useState(null);
  const [variantInput, setVariantInput] = useState("");
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
    try { return localStorage.getItem("dftc_arrival_draft") === "true"; } catch { return false; }
  });
  const [draftDismissed, setDraftDismissed] = useState(false);
  const arrivalDraftVersionRef = useRef(0);
  const arrivalDraftPollRef = useRef(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("all");
  const reviewScrollRef = useRef(null);

  // Slide the review table to the filtered source column so it is visible without manual scrolling
  useEffect(() => {
    if (!reviewMode) return;
    const el = reviewScrollRef.current;
    if (!el) return;
    if (reviewFilter === "all") {
      if (typeof el.scrollTo === "function") el.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
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
  const [dataName, setDataName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveProgressStage, setSaveProgressStage] = useState("Validating arrival records...");
  const [saveError, setSaveError] = useState("");
  const catalogRef = useRef(null);
  // The DB catalogue items behind the map above. Kept so a row can be placed
  // for a commodity the static mirror has never heard of.
  const catalogItemsRef = useRef([]);
  // The rows the grid gained from the DB catalogue.
  const catalogRowsRef = useRef([]);
  // Bumped whenever a catalogue row is added, so the grid re-renders and any
  // memo that walks the catalogue is invalidated.
  const [catalogRowsVersion, setCatalogRowsVersion] = useState(0);

  // DFTC Personnel from database
  const [staffList, setStaffList] = useState([]);
  const [encodedBy, setEncodedBy] = useState("");
  const [encodedByRole, setEncodedByRole] = useState("");
  const [reviewedBy, setReviewedBy] = useState("");
  const [reviewedByRole, setReviewedByRole] = useState("");
  const [enteredTime, setEnteredTime] = useState(() => {
    return new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  });
  const [confirmOpen, setConfirmOpen] = useState(false);

  arrivalDraftStateRef.current = {
    periodType, selectedDate, selectedWeek, selectedMonth, selectedYear,
    fields, customVariants, customCommodities,
  };

  // Calculate reporting label, subtitle, and effective date
  const effectivePeriodInfo = useMemo(() => {
    if (periodType === "monthly") {
      const monthObj = MONTHS.find((m) => m.val === selectedMonth) || MONTHS[0];
      const label = `${monthObj.name} ${selectedYear}`;
      const lastDay = new Date(parseInt(selectedYear, 10), parseInt(selectedMonth, 10), 0).getDate();
      const iso = `${selectedYear}-${selectedMonth}-${String(lastDay).padStart(2, "0")}`;
      const startIso = `${selectedYear}-${selectedMonth}-01`;
      const subtitle = `For the Month of ${monthObj.name} ${selectedYear}`;
      return { label, subtitle, rangeLabel: `${monthObj.name} 1 – ${lastDay}, ${selectedYear}`, iso, startIso, freq: "Monthly" };
    }
    if (periodType === "weekly") {
      const label = activeWeekObj.fullLabel; // e.g. "Week 1 of September 2026"
      const subtitle = `For ${activeWeekObj.fullLabel} (${activeWeekObj.rangeLabel})`;
      return {
        label,
        subtitle,
        rangeLabel: activeWeekObj.rangeLabel, // e.g. "Sep 1 – Sep 7, 2026"
        iso: activeWeekObj.endIso,
        startIso: activeWeekObj.startIso,
        freq: "Weekly"
      };
    }
    const label = formatDateLabel(selectedDate);
    return { label, subtitle: `For ${label}`, rangeLabel: label, iso: selectedDate, startIso: selectedDate, freq: "Daily" };
  }, [periodType, selectedDate, selectedMonth, selectedYear, activeWeekObj]);

  // Update default data name whenever period changes
  useEffect(() => {
    setDataName(`DFTC Arrival Volume — ${effectivePeriodInfo.label}`);
  }, [effectivePeriodInfo.label]);

  // Reporting-date guard, mirroring the server rule in
  // `ManualArrivalSubmissionCreate`.
  //
  // Daily submissions are stamped with the day the data was observed, so that
  // date must not be in the future. Weekly/monthly submissions are stamped with
  // the *last* day of the period, which legitimately falls in the future while
  // the period is still running — staff file figures for the week or month in
  // progress. What must never be allowed is a period that has not begun, so
  // those are validated on the period start instead.
  const reportingDateError =
    periodType === "daily"
      ? getReportingDateError(effectivePeriodInfo.iso)
      : isFutureDate(effectivePeriodInfo.startIso)
        ? "Reporting period cannot start in the future."
        : "";

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
            return { name, role: s.position_title || "DFTC Staff" };
          });
          setStaffList(list);

          // Restore previously selected personnel if they exist in DB staff list
          let restoredEncoded = null;
          let restoredReviewed = null;
          try {
            const stored = JSON.parse(localStorage.getItem(`dftc_arrival_personnel_${effectivePeriodInfo.iso}`));
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
      } catch { }
    })();
    return () => { cancelled = true; };
  }, [effectivePeriodInfo.iso]);

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

  // Apply the shared catalog query so Price Input and Arrival Input never
  // issue separate catalog requests while both pages are mounted.
  useEffect(() => {
    if (!catalogData) return;
    const items = Array.isArray(catalogData) ? catalogData : catalogData?.items ?? [];
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
    addCatalogRows(items);
  }, [catalogData]);

  // The shared catalog hook owns refresh and visibility handling.

  // Commodity catalogue live-sync: another inputter may register a commodity or
  // variety while this page stays open. Re-run the page's own catalogue helper
  // on a timer so those rows appear without a full reload.
  // ── Rows the grid gained from the DB catalogue ────────────────────────────
  /** Identity of a rendered row: its commodity and its variety, by name. */
  function variantIdentity(commodityName, variantName) {
    return `${nameSlug(commodityName)}|${nameSlug(variantName)}`;
  }

  /**
   * Turn a DB catalogue item into a row the grid can render.
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
          dbId: item.id
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
      dbId: item.id
    };
  }

  /** The identities of every variant the grid renders right now. */
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
   * Add the grid rows for the catalogue items.
   *
   * A row is added only when the grid renders no variant with the same
   * identity (commodity name + variety name). Dedupe by identity, not by id:
   * the mirror's row and the catalogue's row for the same thing must not both
   * render, and the row this user added at runtime carries a different id but
   * the same variety.
   */
  function addCatalogRows(items) {
    const identities = renderedIdentities();
    const added = [];
    for (const item of items) {
      const row = buildCatalogRow(item);
      // The catalogue holds the commodity but the grid has no category of ours
      // for it: there is nowhere to put the row.
      if (!row) continue;
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

  const triggerAutosave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (oldTimer.current) clearTimeout(oldTimer.current);
    // Any edit means the user is acting on the failure notice.
    setSaveError("");
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      const payload = arrivalDraftStateRef.current;
      try {
        localStorage.setItem("dftc_arrival_draft", "true");
        localStorage.setItem("dftc_arrival_draft_data", JSON.stringify(payload));
        const enteredCount = Object.values(payload.fields || {}).filter(
          (f) =>
            (f.farmSource && String(f.farmSource).trim() !== "") ||
            (f.otherSource && String(f.otherSource).trim() !== "") ||
            (f.farm && String(f.farm).trim() !== "") ||
            (f.other && String(f.other).trim() !== "")
        ).length;
        if (enteredCount > 0) {
          apiPost("/dftc/draft/notify", {
            data_type: "arrival_volume",
            reporting_date: effectivePeriodInfo.iso || payload.selectedDate,
            record_count: enteredCount,
          }).catch((err) => {
            console.warn("Draft notification failed:", err);
          });
        }
      } catch { }
      try {
        const saved = await parseResponse(await apiPut("/dftc/arrival-draft", {
          reporting_date: effectivePeriodInfo.iso,
          payload,
          expected_version: arrivalDraftVersionRef.current || null,
        }));
        arrivalDraftVersionRef.current = saved?.version || arrivalDraftVersionRef.current;
        setHasDraft(true);
      } catch { /* local fallback remains available */ }
      setSaveStatus("savedNew");
      oldTimer.current = setTimeout(() => setSaveStatus("savedOld"), 30000);
    }, 1500);
  }, [periodType, selectedDate, selectedWeek, selectedMonth, selectedYear, effectivePeriodInfo.iso, fields, customVariants, customCommodities]);

  function restoreDraft() {
    try {
      const raw = localStorage.getItem("dftc_arrival_draft_data");
      if (raw) {
        const d = JSON.parse(raw);
        if (d.periodType) setPeriodType(d.periodType);
        if (d.selectedDate) setSelectedDate(d.selectedDate);
        if (d.selectedWeek) setSelectedWeek(d.selectedWeek);
        if (d.selectedMonth) setSelectedMonth(d.selectedMonth);
        if (d.selectedYear) setSelectedYear(d.selectedYear);
        if (d.fields) setFields(d.fields);
        if (d.customVariants) setCustomVariants(d.customVariants);
        if (d.customCommodities) setCustomCommodities(migrateDraftCommodities(d.customCommodities));
      }
    } catch { }
    setDraftDismissed(true);
  }

  useEffect(() => {
    if (location.state?.restoreDraft) {
      restoreDraft();
    }
  }, [location.state]);

  // The server draft is shared by both inputters. Local storage is only the
  // offline fallback for dates with no server draft yet.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const draft = await parseResponse(
          await apiGet(`/dftc/arrival-draft?reporting_date=${effectivePeriodInfo.iso}`)
        );
        if (cancelled) return;
        arrivalDraftVersionRef.current = draft?.version || 0;
        if (draft?.id) {
          const payload = draft.payload || {};
          setFields(payload.fields || {});
          setCustomVariants(payload.customVariants || {});
          setCustomCommodities(migrateDraftCommodities(payload.customCommodities || {}));
          setHasDraft(Object.keys(payload.fields || {}).length > 0);
        }
        // Device-local data remains available through the explicit Resume
        // Draft action; it must not override shared server state on open.
      } catch { /* local fallback remains available offline */ }
    })();
    return () => { cancelled = true; };
  }, [effectivePeriodInfo.iso]);

  useEffect(() => {
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible" || navigator.onLine === false) return;
      try {
        const draft = await parseResponse(
          await apiGet(`/dftc/arrival-draft?reporting_date=${effectivePeriodInfo.iso}`)
        );
        if (!draft?.id || (draft.version || 0) <= arrivalDraftVersionRef.current) return;
        arrivalDraftVersionRef.current = draft.version;
        const payload = draft.payload || {};
        setFields(payload.fields || {});
        setCustomVariants(payload.customVariants || {});
        setCustomCommodities(migrateDraftCommodities(payload.customCommodities || {}));
        setHasDraft(Object.keys(payload.fields || {}).length > 0);
      } catch { /* shared polling is best effort */ }
    }, 15000);
    return () => clearInterval(id);
  }, [effectivePeriodInfo.iso]);

  async function discardDraft() {
    try {
      await apiDelete(`/dftc/arrival-draft?reporting_date=${effectivePeriodInfo.iso}`);
    } catch { /* local state is still cleared */ }
    setDraftDismissed(true);
    setHasDraft(false);
    try {
      localStorage.removeItem("dftc_arrival_draft");
      localStorage.removeItem("dftc_arrival_draft_data");
    } catch { }
    setFields({});
  }

  function getField(variantId) {
    return fields[variantId] || emptyArrivalField();
  }

  function updateVolume(variantId, sourceKey, value) {
    let cleanVal = String(value).replace(/[^0-9.]/g, "");
    const parts = cleanVal.split(".");
    if (parts.length > 2) {
      cleanVal = parts[0] + "." + parts.slice(1).join("");
    }
    setFields((prev) => {
      const cur = prev[variantId] || emptyArrivalField();
      return {
        ...prev,
        [variantId]: {
          ...cur,
          [sourceKey]: cleanVal
        }
      };
    });
    triggerAutosave();
  }

  function updateUom(variantId, uom) {
    setFields((prev) => {
      const cur = prev[variantId] || emptyArrivalField();
      return {
        ...prev,
        [variantId]: {
          ...cur,
          uom
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

  /**
   * The commodities of one category: the static mirror, the rows this user
   * added at runtime, and a block for every catalogue commodity the grid does
   * not have yet.
   */
  function getAllCommodities(cat) {
    const rendered = [...cat.commodities, ...customCommodities[cat.id] ?? []];
    const present = new Set(rendered.map((c) => c.id));
    const presentNames = new Set(rendered.map((c) => nameSlug(COMMODITY_NAME_OVERRIDES[c.name] ?? c.name)));
    const fromCatalog = [];
    for (const row of catalogRowsRef.current) {
      if (row.categoryId !== cat.id) continue;
      // One block per commodity, even when the catalogue holds several
      // varieties of it.
      if (present.has(row.commodityId)) continue;
      // A commodity this user added at runtime carries a different id but the
      // same name: it must not gain a second header.
      if (presentNames.has(nameSlug(row.commodityName))) continue;
      present.add(row.commodityId);
      presentNames.add(nameSlug(row.commodityName));
      fromCatalog.push({ id: row.commodityId, name: row.commodityName, isHW: false, variants: [] });
    }
    return [...rendered, ...fromCatalog];
  }

  /**
   * The variants of one commodity: the static mirror, the rows this user added
   * at runtime, and the catalogue rows that belong to this commodity.
   */
  function getVariants(com) {
    const rendered = [...com.variants, ...customVariants[com.id] ?? []];
    const identities = new Set(rendered.map((v) => variantIdentity(com.name, v.name)));
    const fromCatalog = catalogRowsRef.current
      .filter((row) => row.commodityId === com.id)
      // The row this user added at runtime carries a different id but the same
      // variety: it must not show up twice.
      .filter((row) => !identities.has(variantIdentity(row.commodityName, row.variantName)))
      .map((row) => ({ id: row.variantId, name: row.variantName }));
    return [...rendered, ...fromCatalog];
  }

  function commitVariant(commodityId) {
    const trimmed = variantInput.trim();
    if (!trimmed) {
      setAddingVariant(null);
      return;
    }
    const newId = `custom-var-${commodityId}-${Date.now()}`;
    setFields((prev) => ({
      ...prev,
      [newId]: emptyArrivalField()
    }));
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
      }).catch(() => { });
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
    setFields((prev) => ({
      ...prev,
      [variantId]: emptyArrivalField(uom)
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
    }).catch(() => { });
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
    const baseName = COMMODITY_NAME_OVERRIDES[com?.name] ?? com?.name ?? "";
    const baseKey = nameSlug(baseName);
    const variantName = v?.name;
    const isBaseOrRegular = !variantName || variantName === "Base" || variantName === "Regular";
    const variantKey = !isBaseOrRegular
      ? `${baseKey}-${nameSlug(variantName)}`
      : baseKey;
    if (map) {
      const found = map.get(variantKey) ?? map.get(baseKey);
      if (found) return found;
    }
    return com?.id ?? null;
  }

  async function registerCommodity(body) {
    try {
      const registered = await parseResponse(await apiPost("/dftc/commodities", body));
      if (registered?.id) {
        const baseName = COMMODITY_NAME_OVERRIDES[registered.name] ?? registered.name;
        const baseKey = nameSlug(baseName);
        const map = catalogRef.current || new Map();
        map.set(baseKey, map.get(baseKey) ?? registered.id);
        if (registered.variety) map.set(`${baseKey}-${nameSlug(registered.variety)}`, registered.id);
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

  // ── Metrics & Totals Calculation ──
  const enteredRows = useMemo(() => {
    const list = [];
    PRICE_CATEGORIES.forEach((cat) => {
      getAllCommodities(cat).forEach((com) => {
        getVariants(com).forEach((v, vi) => {
          const f = getField(v.id);
          if (hasValue(f)) {
            const farmVal = parseFloat(f.farmSource) || 0;
            const otherVal = parseFloat(f.otherSource) || 0;
            const combined = farmVal + otherVal;
            list.push({
              cat,
              com,
              v,
              vi,
              uom: f.uom || "kg",
              farmVal,
              otherVal,
              combined
            });
          }
        });
      });
    });
    return list;
  }, [fields, customCommodities, customVariants, catalogRowsVersion]);

  const totalEnteredCount = enteredRows.length;

  const totalFarmVolume = useMemo(() => {
    return enteredRows.reduce((acc, r) => acc + r.farmVal, 0);
  }, [enteredRows]);

  const totalOtherVolume = useMemo(() => {
    return enteredRows.reduce((acc, r) => acc + r.otherVal, 0);
  }, [enteredRows]);

  const totalCombinedVolume = totalFarmVolume + totalOtherVolume;

  const farmPercentage = totalCombinedVolume > 0 ? ((totalFarmVolume / totalCombinedVolume) * 100).toFixed(1) : "0.0";
  const otherPercentage = totalCombinedVolume > 0 ? ((totalOtherVolume / totalCombinedVolume) * 100).toFixed(1) : "0.0";

  const farmEnteredCount = useMemo(() => {
    return enteredRows.filter((r) => r.farmVal > 0).length;
  }, [enteredRows]);

  const otherEnteredCount = useMemo(() => {
    return enteredRows.filter((r) => r.otherVal > 0).length;
  }, [enteredRows]);

  // enteredRows stays one record per commodity because it is also the save
  // payload, so a commodity with both sources filled counts once there but
  // fills two source cells. The review counts cells.
  const totalSourceValueCount = farmEnteredCount + otherEnteredCount;

  // The review is the complete monitoring sheet, so it walks the full catalogue
  // rather than enteredRows — that one is the save payload and the printed
  // totals, which must stay limited to commodities that carry a volume.
  const catalogueReviewRows = useMemo(() => {
    const list = [];
    PRICE_CATEGORIES.forEach((cat) => {
      getAllCommodities(cat).forEach((com) => {
        getVariants(com).forEach((v, vi) => {
          const f = getField(v.id);
          const farmVal = parseFloat(f.farmSource) || 0;
          const otherVal = parseFloat(f.otherSource) || 0;
          list.push({
            cat,
            com,
            v,
            vi,
            uom: f.uom || "kg",
            farmVal,
            otherVal,
            combined: farmVal + otherVal
          });
        });
      });
    });
    return list;
  }, [fields, customCommodities, customVariants, catalogRowsVersion]);

  // Consolidated review rows grouped by category
  const consolidatedReviewGroups = useMemo(() => {
    const groups = [];
    PRICE_CATEGORIES.forEach((cat) => {
      const rows = catalogueReviewRows.filter((r) => r.cat.id === cat.id);
      if (rows.length > 0) {
        groups.push({ cat, rows });
      }
    });
    return groups;
  }, [catalogueReviewRows]);

  // Filtered review groups based on summary card clicks
  const filteredReviewGroups = useMemo(() => {
    if (reviewFilter === "all") return consolidatedReviewGroups;
    return consolidatedReviewGroups
      .map(({ cat, rows }) => {
        const matching = rows.filter((r) => {
          if (reviewFilter === "farm") return r.farmVal > 0;
          if (reviewFilter === "other") return r.otherVal > 0;
          return true;
        });
        return { cat, rows: matching };
      })
      .filter((g) => g.rows.length > 0);
  }, [consolidatedReviewGroups, reviewFilter]);

  // ── Finalize & Save ──
  async function handleSave() {
    if (reportingDateError) return;
    setIsSaving(true);
    setSaveProgress(20);
    setSaveProgressStage("Validating arrival records...");
    let totalSaved = 0;

    const records = [];
    for (const r of enteredRows) {
      const baseName = COMMODITY_NAME_OVERRIDES?.[r.com.name] ?? r.com.name;
      const baseKey = nameSlug(baseName);
      const variantName = r.v.name;
      const isBaseOrRegular = !variantName || variantName === "Base" || variantName === "Regular";
      const variantKey = !isBaseOrRegular
        ? `${baseKey}-${nameSlug(variantName)}`
        : baseKey;
      const variantKnown = !!(catalogRef.current && catalogRef.current.has(variantKey));

      let commodity_id = resolveCommodityId(r.com, r.v);

      const base = {
        variety: r.v.name,
        uom: r.uom || "kg",
        farm_source_volume_kg: r.farmVal > 0 ? r.farmVal : null,
        other_source_volume_kg: r.otherVal > 0 ? r.otherVal : null,
        reported_combined_volume_kg: r.combined > 0 ? Number(r.combined.toFixed(2)) : null,
        observation_status: "Reported value"
      };

      // Register custom-added commodities / new varieties on the fly so their
      // volumes reach the DB instead of being silently dropped as unknown ids.
      if (!variantKnown) {
        const registered = await registerCommodity({
          name: baseName,
          category: r.cat.name,
          variety: !isBaseOrRegular ? r.v.name : null,
          unit_of_measure: r.uom || "kg"
        });
        if (registered?.id) {
          commodity_id = registered.id;
          try {
            if (catalogRef.current) {
              // The base key already points at the parent commodity's row:
              // overwriting it would send the parent's own volumes to the
              // newly registered variety.
              if (!catalogRef.current.has(baseKey)) {
                catalogRef.current.set(baseKey, registered.id);
              }
              catalogRef.current.set(variantKey, registered.id);
            }
          } catch { /* ignore */ }
        }
      }

      if (!commodity_id) {
        // The catalog is keyed by the override-resolved DB name, not the UI
        // label: "Pak choi / Bok choy" is stored as "Pakchoy/Bokchoy".
        commodity_id = catalogRef.current?.get(baseKey) ?? r.com.id;
      }

      if (commodity_id) {
        records.push({ commodity_id, ...base });
      }
    }

    setSaveProgress(55);
    setSaveProgressStage("Standardizing volume figures...");

    const payload = {
      data_type: "arrival_volume",
      source_id: "dftc_volume",
      reporting_date: effectivePeriodInfo.iso,
      period_type: periodType,
      // The server validates the period start, not the end: the end date of an
      // in-progress week/month is legitimately in the future.
      period_start: effectivePeriodInfo.startIso,
      encoded_by: encodedBy,
      reviewed_by: reviewedBy,
      records
    };

    setSaveProgress(75);
    setSaveProgressStage("Saving records to database...");

    try {
      await parseResponse(await apiPost("/dftc/submissions/manual", payload));
      totalSaved = records.length;
    } catch (err) {
      console.error("Failed to save arrival volume submission:", err);
      setSaveError(
        "Could not save this arrival volume submission. Your entries are still on " +
        "this page — check your connection and press Save again."
      );
      setIsSaving(false);
      return;
    }

    setSaveProgress(95);
    setSaveProgressStage("Consolidating arrival volume records...");

    try {
      await apiDelete(`/dftc/arrival-draft?reporting_date=${effectivePeriodInfo.iso}`);
      localStorage.setItem(
        `dftc_arrival_personnel_${effectivePeriodInfo.iso}`,
        JSON.stringify({
          encodedBy,
          encodedByRole,
          reviewedBy,
          reviewedByRole
        })
      );
      localStorage.removeItem("dftc_arrival_draft");
      localStorage.removeItem("dftc_arrival_draft_data");
    } catch { }

    setHasDraft(false);
    setSaveProgress(100);
    setSaveProgressStage("Arrival volume data saved successfully!");
    queryClient.invalidateQueries({ queryKey: ["dftc", "submissions"] });
    queryClient.invalidateQueries({ queryKey: ["dftc-submissions"] });
    queryClient.invalidateQueries({ queryKey: ["dftc", "home"] });
    queryClient.invalidateQueries({ queryKey: ["dftc", "requirements"] });

    navTimer.current = setTimeout(() => {
      setIsSaving(false);
      navigate("/dftc/input", {
        state: {
          successMsg: `${dataName} saved successfully (${totalSaved} commodity records, ${totalSourceValueCount} source values across Farm Source and Other Sources).`,
          justSavedType: "arrival",
          justSavedDate: effectivePeriodInfo.iso,
          justSavedAt: new Date().toISOString(),
          savedData: {
            title: dataName,
            recordsCount: totalSaved,
            timestamp: new Date().toISOString(),
            date: effectivePeriodInfo.iso,
            category: "DFTC Arrival Volume",
            status: "Saved"
          }
        }
      });
    }, 600);
  }

  // Timers scheduled above outlive unmount and fire setState/navigate on a dead
  // tree, which leaks navigation into whatever screen the user moved to.
  useEffect(() => () => {
    clearTimeout(navTimer.current);
    clearTimeout(saveTimer.current);
    clearTimeout(oldTimer.current);
  }, []);

  // ── Autosave Status Indicator ──
  function SaveStatusIndicator() {
    if (saveStatus === "saving") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--hw-neutral-500)]">
          <Cloud className="w-3.5 h-3.5 animate-pulse text-[var(--hw-green-700)]" />
          <span>Saving...</span>
        </span>
      );
    }
    if (saveStatus === "savedNew") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--hw-green-800)] font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hw-green-700)]" />
          <span>Draft autosaved</span>
        </span>
      );
    }
    if (saveStatus === "savedOld") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--hw-neutral-400)]">
          <CloudOff className="w-3.5 h-3.5" />
          <span>Saved</span>
        </span>
      );
    }
    return null;
  }

  // ── RENDER REVIEW MODE ─────────────────────────────────────────────────────
  if (reviewMode) {
    return (
      <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto" style={{ overflowX: "hidden" }}>
        {/* Top bar with back button */}
        <div className="flex items-center gap-3 mb-1">
          <button
            type="button"
            onClick={() => setReviewMode(false)}
            className="p-1.5 -ml-1.5 rounded-xl hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] transition-colors cursor-pointer"
            title="Back to entry"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">Add Arrival Volume — Review</h1>
          </div>
        </div>

        <p className="text-[13px] text-[var(--hw-neutral-700)] mb-4 pl-8">
          Davao Food Terminal Complex · Volume of Commodities Dropped at DFTC · {effectivePeriodInfo.subtitle}
        </p>

        {/* Info Banner */}
        <DFTCNotificationBanner variant="info" className="mb-4">
          Review entered arrival volume records for <strong className="text-[var(--hw-neutral-900)]">{effectivePeriodInfo.label}</strong> before saving.
        </DFTCNotificationBanner>

        {reportingDateError && (
          <DFTCNotificationBanner variant="danger" className="mb-4" role="alert">
            {reportingDateError}
          </DFTCNotificationBanner>
        )}

        {/* Summary Badges Card — Clickable to filter details (Matching Add Price Data Review) */}
        <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3 sm:p-4 mb-4 sm:mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hw-neutral-100)] pb-3 mb-3">
            <button
              type="button"
              onClick={() => setReviewFilter("all")}
              className={`text-[14px] font-semibold transition-colors cursor-pointer text-left ${
                reviewFilter === "all" ? "text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-900)] hover:text-[var(--hw-green-700)]"
              }`}
            >
              Total Source Values Entered: <strong className="text-[var(--hw-green-700)]">{totalSourceValueCount}</strong>
              {reviewFilter !== "all" && (
                <span className="ml-2 text-[12px] font-normal text-[var(--hw-green-700)] underline">
                  (Show All)
                </span>
              )}
            </button>
            <span className="text-[12px] text-[var(--hw-neutral-600)] flex items-center gap-1.5">
              <span>Date entered:</span>
              <strong className="text-[var(--hw-neutral-900)]">{effectivePeriodInfo.label}, {enteredTime}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2.5 text-[12px]">
            {[
              { id: "all", label: "Combined Overall Volume", count: totalSourceValueCount },
              { id: "farm", label: "Farm Source", count: farmEnteredCount },
              { id: "other", label: "Other Sources", count: otherEnteredCount }
            ].map((card) => {
              const isSelected = reviewFilter === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setReviewFilter((prev) => (prev === card.id ? "all" : card.id))}
                  className={`text-left rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:p-3 border transition-all cursor-pointer flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 ${
                    card.id === "all" ? "col-span-2 sm:col-span-1" : ""
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
                  <span className="text-[13px] font-bold text-[var(--hw-neutral-900)] whitespace-nowrap text-right shrink-0">
                    {card.count} entered
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Official DFTC Table Container */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-2.5 sm:p-6 mb-6">
          <div className="text-center mb-4">
            <h2 className="text-[14px] sm:text-[15px] font-bold text-black uppercase tracking-wide">
              Davao Food Terminal Complex
            </h2>
            <p className="text-[12px] sm:text-[13px] font-bold text-black mt-0.5 uppercase tracking-wide">
              VOLUME (KG) OF COMMODITIES DROPPED AT DFTC
            </p>
            <p className="text-[12px] font-medium text-[var(--hw-neutral-700)]">
              {effectivePeriodInfo.subtitle}
            </p>
          </div>

          <div className="overflow-x-auto" ref={reviewScrollRef}>
            <table className="w-full text-[12px] border-collapse bg-white" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ background: EXCEL_HEADER_BG, border: EXCEL_BORDER, padding: "6px 8px", width: 44, textAlign: "center", fontWeight: "bold" }}>No.</th>
                  <th rowSpan={2} style={{ background: EXCEL_HEADER_BG, border: EXCEL_BORDER, padding: "6px 8px", minWidth: 160, textAlign: "left", fontWeight: "bold" }}>Commodity</th>
                  <th rowSpan={2} style={{ background: EXCEL_HEADER_BG, border: EXCEL_BORDER, padding: "6px 8px", width: 64, textAlign: "center", fontWeight: "bold" }}>Unit</th>
                  <th
                    colSpan={2}
                    data-col="farm"
                    style={{
                      background: EXCEL_FARM_BG,
                      border: reviewFilter === "farm" ? "2px solid #166534" : EXCEL_BORDER,
                      padding: "6px 8px",
                      textAlign: "center",
                      fontWeight: "bold",
                      color: "#000",
                      opacity: reviewFilter === "other" ? 0.45 : 1
                    }}
                  >
                    FARM SOURCE {reviewFilter === "farm" && "✓"}
                  </th>
                  <th
                    colSpan={2}
                    data-col="other"
                    style={{
                      background: EXCEL_OTHER_BG,
                      border: reviewFilter === "other" ? "2px solid #166534" : EXCEL_BORDER,
                      padding: "6px 8px",
                      textAlign: "center",
                      fontWeight: "bold",
                      color: "#000",
                      opacity: reviewFilter === "farm" ? 0.45 : 1
                    }}
                  >
                    OTHER SOURCES {reviewFilter === "other" && "✓"}
                  </th>
                  <th rowSpan={2} style={{ background: EXCEL_TOTAL_BG, border: EXCEL_BORDER, padding: "6px 8px", textAlign: "right", fontWeight: "bold", width: 130, color: "#000" }}>OVERALL TOTAL</th>
                </tr>
                <tr>
                  <th style={{ background: EXCEL_FARM_BG, border: reviewFilter === "farm" ? "2px solid #166534" : EXCEL_BORDER, padding: "5px 8px", textAlign: "right", fontSize: 11, fontWeight: "600", width: 110, color: "#000", opacity: reviewFilter === "other" ? 0.45 : 1 }}>Volume</th>
                  <th style={{ background: EXCEL_FARM_BG, border: reviewFilter === "farm" ? "2px solid #166534" : EXCEL_BORDER, padding: "5px 8px", textAlign: "right", fontSize: 11, fontWeight: "600", width: 75, color: "#000", opacity: reviewFilter === "other" ? 0.45 : 1 }}>Percentage (%)</th>
                  <th style={{ background: EXCEL_OTHER_BG, border: reviewFilter === "other" ? "2px solid #166534" : EXCEL_BORDER, padding: "5px 8px", textAlign: "right", fontSize: 11, fontWeight: "600", width: 110, color: "#000", opacity: reviewFilter === "farm" ? 0.45 : 1 }}>Volume</th>
                  <th style={{ background: EXCEL_OTHER_BG, border: reviewFilter === "other" ? "2px solid #166534" : EXCEL_BORDER, padding: "5px 8px", textAlign: "right", fontSize: 11, fontWeight: "600", width: 75, color: "#000", opacity: reviewFilter === "farm" ? 0.45 : 1 }}>Percentage (%)</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviewGroups.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[var(--hw-neutral-500)]" style={{ border: EXCEL_BORDER }}>
                      {consolidatedReviewGroups.length === 0
                        ? "No arrival volume records entered yet. Go back and enter volumes."
                        : "No volume records entered for this specific source channel filter. Click \"Show All\" to view all entered volumes."}
                    </td>
                  </tr>
                ) : (
                  filteredReviewGroups.map(({ cat, rows }) => {
                    let itemNum = 1;
                    return (
                      <React.Fragment key={cat.id}>
                        <tr>
                          <td
                            colSpan={3}
                            style={{ background: "#f9fafb", border: EXCEL_BORDER, padding: "5px 8px", fontWeight: "bold", fontStyle: "italic", textDecoration: "underline" }}
                          >
                            {cat.name.toUpperCase()}
                          </td>
                          <td style={{ background: "#ffffff", border: EXCEL_BORDER }} />
                          <td style={{ background: "#ffffff", border: EXCEL_BORDER }} />
                          <td style={{ background: "#ffffff", border: EXCEL_BORDER }} />
                          <td style={{ background: "#ffffff", border: EXCEL_BORDER }} />
                          <td style={{ background: "#ffffff", border: EXCEL_BORDER }} />
                        </tr>
                        {rows.map((r, ri) => {
                          const farmPct = r.combined > 0 ? ((r.farmVal / r.combined) * 100).toFixed(1) : "0.0";
                          const otherPct = r.combined > 0 ? ((r.otherVal / r.combined) * 100).toFixed(1) : "0.0";
                          const isFarmActive = reviewFilter === "all" || reviewFilter === "farm";
                          const isOtherActive = reviewFilter === "all" || reviewFilter === "other";

                          const displayFarmVal = isFarmActive && r.farmVal > 0 ? fmtKg(r.farmVal) : "";
                          const displayFarmPct = isFarmActive && r.farmVal > 0 ? (reviewFilter === "farm" ? "100.0%" : `${farmPct}%`) : "";
                          const displayOtherVal = isOtherActive && r.otherVal > 0 ? fmtKg(r.otherVal) : "";
                          const displayOtherPct = isOtherActive && r.otherVal > 0 ? (reviewFilter === "other" ? "100.0%" : `${otherPct}%`) : "";

                          let displayTotal = "";
                          if (reviewFilter === "farm") {
                            displayTotal = r.farmVal > 0 ? fmtKg(r.farmVal) : "";
                          } else if (reviewFilter === "other") {
                            displayTotal = r.otherVal > 0 ? fmtKg(r.otherVal) : "";
                          } else {
                            displayTotal = r.combined > 0 ? fmtKg(r.combined) : "";
                          }

                          return (
                            <tr key={`${cat.id}-${r.com.id}-${r.v.id}-${ri}`}>
                              <td style={{ background: "#ffffff", border: EXCEL_BORDER, padding: "4px 8px", textAlign: "center" }}>
                                {r.vi === 0 ? itemNum++ : ""}
                              </td>
                              <td style={{ background: "#ffffff", border: EXCEL_BORDER, padding: "4px 8px" }}>
                                {r.vi === 0 ? (
                                  <span><strong>{r.com.name}</strong> {r.v.name && r.v.name !== "Base" && r.v.name !== "Regular" ? `(${r.v.name})` : ""}</span>
                                ) : (
                                  <span style={{ paddingLeft: 16 }}>{r.v.name && r.v.name !== "Base" && r.v.name !== "Regular" ? `(${r.v.name})` : (r.v.name || "")}</span>
                                )}
                              </td>
                              <td style={{ background: "#ffffff", border: EXCEL_BORDER, padding: "4px 8px", textAlign: "center" }}>
                                {r.uom}
                              </td>
                              <td style={{ background: "#ffffff", border: reviewFilter === "farm" ? "2px solid #166534" : EXCEL_BORDER, padding: "4px 8px", textAlign: "right", fontWeight: r.farmVal > 0 ? "bold" : "normal", opacity: isFarmActive ? 1 : 0.35 }}>
                                {displayFarmVal}
                              </td>
                              <td style={{ background: "#ffffff", border: reviewFilter === "farm" ? "2px solid #166534" : EXCEL_BORDER, padding: "4px 8px", textAlign: "right", fontSize: 11, color: "#333", opacity: isFarmActive ? 1 : 0.35 }}>
                                {displayFarmPct}
                              </td>
                              <td style={{ background: "#ffffff", border: reviewFilter === "other" ? "2px solid #166534" : EXCEL_BORDER, padding: "4px 8px", textAlign: "right", fontWeight: r.otherVal > 0 ? "bold" : "normal", opacity: isOtherActive ? 1 : 0.35 }}>
                                {displayOtherVal}
                              </td>
                              <td style={{ background: "#ffffff", border: reviewFilter === "other" ? "2px solid #166534" : EXCEL_BORDER, padding: "4px 8px", textAlign: "right", fontSize: 11, color: "#333", opacity: isOtherActive ? 1 : 0.35 }}>
                                {displayOtherPct}
                              </td>
                              <td style={{ background: "#ffffff", border: EXCEL_BORDER, padding: "4px 8px", textAlign: "right", fontWeight: "bold" }}>
                                {displayTotal}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}

                {/* Grand Total Row */}
                {filteredReviewGroups.length > 0 && (
                  <tr style={{ fontWeight: "bold" }}>
                    <td
                      colSpan={3}
                      style={{ background: EXCEL_HEADER_BG, border: EXCEL_BORDER, padding: "6px 8px", textAlign: "center" }}
                    >
                      TOTAL
                    </td>
                    <td style={{ background: EXCEL_FARM_BG, border: reviewFilter === "farm" ? "2px solid #166534" : EXCEL_BORDER, padding: "6px 8px", textAlign: "right", color: "#000", opacity: reviewFilter === "other" ? 0.35 : 1 }}>
                      {reviewFilter !== "other" ? fmtKg(totalFarmVolume) : ""}
                    </td>
                    <td style={{ background: EXCEL_FARM_BG, border: reviewFilter === "farm" ? "2px solid #166534" : EXCEL_BORDER, padding: "6px 8px", textAlign: "right", color: "#000", opacity: reviewFilter === "other" ? 0.35 : 1 }}>
                      {reviewFilter === "farm" ? "100.0%" : (reviewFilter !== "other" ? `${farmPercentage}%` : "")}
                    </td>
                    <td style={{ background: EXCEL_OTHER_BG, border: reviewFilter === "other" ? "2px solid #166534" : EXCEL_BORDER, padding: "6px 8px", textAlign: "right", color: "#000", opacity: reviewFilter === "farm" ? 0.35 : 1 }}>
                      {reviewFilter !== "farm" ? fmtKg(totalOtherVolume) : ""}
                    </td>
                    <td style={{ background: EXCEL_OTHER_BG, border: reviewFilter === "other" ? "2px solid #166534" : EXCEL_BORDER, padding: "6px 8px", textAlign: "right", color: "#000", opacity: reviewFilter === "farm" ? 0.35 : 1 }}>
                      {reviewFilter === "other" ? "100.0%" : (reviewFilter !== "farm" ? `${otherPercentage}%` : "")}
                    </td>
                    <td style={{ background: EXCEL_TOTAL_BG, border: EXCEL_BORDER, padding: "6px 8px", textAlign: "right", color: "#000" }}>
                      {reviewFilter === "farm" ? fmtKg(totalFarmVolume) : (reviewFilter === "other" ? fmtKg(totalOtherVolume) : fmtKg(totalCombinedVolume))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Personnel Signatures Block */}
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-[var(--hw-neutral-200)] grid grid-cols-2 gap-3 sm:gap-6 px-1 sm:px-4 text-[12px]">
            <div>
              <span className="text-[11px] text-[var(--hw-neutral-500)] uppercase font-semibold block mb-1">Encoded by:</span>
              <p className="text-[12px] sm:text-[13px] font-bold text-[var(--hw-neutral-900)] underline tracking-wide truncate">
                {encodedBy || "—"}
              </p>
              <p className="text-[11px] text-[var(--hw-neutral-600)] mt-0.5 truncate">{encodedByRole || ""}</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[var(--hw-neutral-500)] uppercase font-semibold block mb-1">Reviewed by:</span>
              <p className="text-[12px] sm:text-[13px] font-bold text-[var(--hw-neutral-900)] underline tracking-wide truncate">
                {reviewedBy || "—"}
              </p>
              <p className="text-[11px] text-[var(--hw-neutral-600)] mt-0.5 truncate">{reviewedByRole || ""}</p>
            </div>
          </div>
        </div>

        {/* Report Metadata and Final Save */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">
              Report Data Name
            </label>
            <input
              type="text"
              value={dataName}
              onChange={(e) => setDataName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)] shadow-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            {reportingDateError && (
              <p
                role="alert"
                className="mb-2 flex items-center gap-1.5 text-[12px] text-red-600"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {reportingDateError}
              </p>
            )}
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={totalEnteredCount === 0 || isSaving || Boolean(reportingDateError)}
              className="w-full py-3 px-4 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-semibold hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-50 cursor-pointer shadow-[var(--shadow-xs)]"
            >
              Save {dataName} ({totalEnteredCount} commodities)
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
                    <Truck className="w-6 h-6 text-[var(--hw-green-700)]" />
                  )}
                </div>
                <h3 className="text-[16px] font-bold text-[var(--hw-neutral-900)]">Saving Arrival Volume Data</h3>
                <p className="text-[12px] text-[var(--hw-neutral-600)] mt-1 leading-relaxed">
                  Please wait while your arrival records are being validated and recorded...
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
            <ConfirmFinalizeArrivalModal
              periodLabel={effectivePeriodInfo.label}
              totalRecords={totalSourceValueCount}
              totalVolume={totalCombinedVolume}
              farmVolume={totalFarmVolume}
              otherVolume={totalOtherVolume}
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

  // ── RENDER DATA INPUT MODE ─────────────────────────────────────────────────
  return (
    <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto" style={{ overflowX: "hidden" }}>
      {/* Draft restoration banner */}
      {hasDraft && !draftDismissed && (
        <DFTCNotificationBanner
          variant="warning"
          description="You have unsaved arrival volume draft data."
          className="mb-4"
          actions={
            <>
              <button
                type="button"
                onClick={restoreDraft}
                className="font-semibold text-amber-600 underline hover:text-amber-700 cursor-pointer text-[12px]"
              >
                Resume Draft
              </button>
              <button
                type="button"
                onClick={discardDraft}
                className="text-[var(--hw-neutral-500)] hover:text-[var(--hw-neutral-700)] cursor-pointer text-[12px]"
              >
                Discard
              </button>
            </>
          }
        />
      )}

      {/* Top Header */}
      <div className="space-y-1 mb-3.5 sm:mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/dftc/input")}
              className="p-1.5 -ml-1.5 rounded-xl hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] transition-colors cursor-pointer shrink-0"
              title="Back to Submit Data"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-[var(--hw-neutral-900)] truncate">Add Arrival Volume</h1>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            <SaveStatusIndicator />
            <button
              type="button"
              onClick={() => {
                setDataName(`DFTC Arrival Volume — ${effectivePeriodInfo.label}`);
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
        <p className="text-[12px] text-[var(--hw-neutral-600)] pl-7 sm:pl-8 leading-snug">
          Record commodity arrival volumes dropped at DFTC ({effectivePeriodInfo.label})
        </p>
      </div>

      {/* Controls Bar: Monthly Period selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[var(--hw-neutral-700)] shrink-0">Period:</span>
          <div className="flex rounded-full border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] p-0.5">
            <span
              className="px-3.5 py-1 text-[11.5px] sm:text-[12px] font-semibold rounded-full bg-[var(--hw-green-700)] text-white shadow-xs text-center cursor-default inline-block"
            >
              Monthly
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-[var(--hw-neutral-100)]">
          <span className="text-[12px] font-medium text-[var(--hw-neutral-600)] shrink-0">Month:</span>
          <div className="flex items-center gap-1.5">
            <select
              id="arrival-monthly-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2 py-1 rounded-lg border border-[var(--hw-neutral-200)] bg-white text-[12px] font-medium text-[var(--hw-neutral-800)] focus:outline-none focus:border-[var(--hw-green-700)] shadow-[var(--shadow-xs)] cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m.val} value={m.val}>{m.name}</option>
              ))}
            </select>
            <select
              id="arrival-monthly-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-2 py-1 rounded-lg border border-[var(--hw-neutral-200)] bg-white text-[12px] font-medium text-[var(--hw-neutral-800)] focus:outline-none focus:border-[var(--hw-green-700)] shadow-[var(--shadow-xs)] cursor-pointer"
            >
              {["2025", "2026", "2027"].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card (matching Add Price Data) */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden mb-6">
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
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Add Commodity */}
          <button
            type="button"
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
                type="button"
                onClick={() => setShowMode(m)}
                className={`px-1.5 xs:px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10.5px] xs:text-[11px] sm:text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  showMode === m
                    ? "bg-[var(--hw-neutral-900)] text-white font-semibold"
                    : "text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"
                }`}
              >
                {m === "all" ? "All" : "Entered"}
              </button>
            ))}
          </div>

          {/* Collapse All / Expand All */}
          <button
            type="button"
            onClick={toggleCollapseAll}
            title={allCollapsed ? "Expand All" : "Collapse All"}
            aria-label={allCollapsed ? "Expand All" : "Collapse All"}
            className="shrink-0 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-[var(--hw-neutral-200)] text-[11px] sm:text-[12px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer flex items-center gap-1"
          >
            <span className="sm:hidden">{allCollapsed ? "Expand" : "Collapse"}</span>
            <span className="hidden sm:inline">{allCollapsed ? "Expand All" : "Collapse All"}</span>
          </button>
        </div>

        {/* Category Rows with Commodity Icons & Variants (No Numbers) */}
        {PRICE_CATEGORIES.map((cat) => {
          const catCommodities = getAllCommodities(cat).filter((com) => {
            const variants = getVariants(com);
            if (!matchesCommodity(com, variants)) return false;
            if (showMode === "entered") {
              return variants.some((v) => hasValue(getField(v.id)));
            }
            return true;
          });

          if (catCommodities.length === 0) return null;

          const isCol = searchQuery.trim() ? false : collapsed.has(cat.id);
          const catEntered = getAllCommodities(cat).reduce(
            (acc, com) => acc + getVariants(com).filter((v) => hasValue(getField(v.id))).length,
            0
          );

          return (
            <div key={cat.id} className="border-b border-[var(--hw-neutral-200)] last:border-0">
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="w-full px-4 py-2.5 bg-[var(--hw-neutral-50)] flex items-center justify-between text-left hover:bg-[var(--hw-neutral-100)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[var(--hw-neutral-800)] uppercase tracking-wide">
                    {cat.name}
                  </span>
                  {catEntered > 0 && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--hw-green-100)] text-[var(--hw-green-800)] border border-[var(--hw-green-200)]">
                      {catEntered} entered
                    </span>
                  )}
                </div>
                {isCol ? (
                  <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-500)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-500)]" />
                )}
              </button>

              {!isCol && (
                <div>
                  {/* Desktop Grid Header (No 'kg', No 'No.') */}
                  <div
                    className="hidden md:grid gap-3 items-center px-4 py-2 bg-[var(--hw-neutral-50)]/70 border-b border-[var(--hw-neutral-200)] text-[11px] font-bold text-[var(--hw-neutral-600)] uppercase tracking-wider"
                    style={{ gridTemplateColumns: "1fr 90px 130px 130px 120px" }}
                  >
                    <span className="pl-6">Commodity / Variant</span>
                    <span>Unit</span>
                    <span className="text-right">Farm Source</span>
                    <span className="text-right">Other Sources</span>
                    <span className="text-right">Combined Total</span>
                  </div>

                  {catCommodities.map((com) => {
                    const variants = getVariants(com).filter((v) => matchesVariant(com, v));
                    const colCom = searchQuery.trim() ? false : collapsedComs.has(com.id);
                    return (
                      <div key={com.id} className="border-b border-[var(--hw-neutral-100)] last:border-0">
                        {/* Commodity Header with Icon (matching Image 1) */}
                        <div
                          onClick={() => toggleCommodity(com.id)}
                          className="px-3 sm:px-4 py-2 bg-white flex items-center justify-between border-b border-[var(--hw-neutral-50)] cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {com.isHW && hasHWIcon(com.name) ? (
                              <CommodityIllustration commodityId={hwId(com.name)} className="w-5 h-5 shrink-0" />
                            ) : (
                              <Leaf className={`w-4 h-4 shrink-0 ${com.isHW ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-400)]"}`} />
                            )}
                            <span className="text-[13px] font-semibold text-[var(--hw-neutral-900)] truncate">
                              {com.name}
                            </span>
                            {com.isHW && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setHwInfoId(com.id); }}
                                className="text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] cursor-pointer"
                                title="HarvestWise Supported Commodity"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setCoverageOpen(true); }}
                              className="text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)] cursor-pointer"
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
                          const f = getField(v.id);
                          const farmVal = parseFloat(f.farmSource) || 0;
                          const otherVal = parseFloat(f.otherSource) || 0;
                          const combined = farmVal + otherVal;
                          const uom = f.uom || "kg";

                          return (
                            <div key={v.id}>
                              {/* Desktop Grid */}
                              <div
                                className={`hidden md:grid gap-3 items-center px-4 py-2 border-b border-[var(--hw-neutral-50)] hover:bg-[var(--hw-neutral-50)] transition-colors ${
                                  hasValue(f) ? "bg-[var(--hw-green-50)]/20" : ""
                                }`}
                                style={{ gridTemplateColumns: "1fr 90px 130px 130px 120px" }}
                              >
                                <div className="pl-6 flex items-center gap-2 min-w-0">
                                  <span className="text-[12px] text-[var(--hw-neutral-800)] truncate">
                                    {v.name}
                                  </span>
                                </div>

                                <select
                                  value={uom}
                                  onChange={(e) => updateUom(v.id, e.target.value)}
                                  className="h-8 px-2 rounded-lg border border-[var(--hw-neutral-200)] text-[11px] text-[var(--hw-neutral-900)] bg-white focus:outline-none focus:border-[var(--hw-green-700)] cursor-pointer"
                                >
                                  {UOM_OPTIONS.map((u) => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>

                                {/* Farm Source Input */}
                                <div className="flex items-center justify-end">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={f.farmSource}
                                    onKeyDown={(e) => {
                                      if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                                    }}
                                    onChange={(e) => updateVolume(v.id, "farmSource", e.target.value)}
                                    placeholder="0"
                                    className="w-full max-w-[120px] px-2.5 py-1 text-right rounded-lg border border-[var(--hw-neutral-200)] bg-white text-[12px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
                                  />
                                </div>

                                {/* Other Sources Input */}
                                <div className="flex items-center justify-end">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={f.otherSource}
                                    onKeyDown={(e) => {
                                      if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                                    }}
                                    onChange={(e) => updateVolume(v.id, "otherSource", e.target.value)}
                                    placeholder="0"
                                    className="w-full max-w-[120px] px-2.5 py-1 text-right rounded-lg border border-[var(--hw-neutral-200)] bg-white text-[12px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
                                  />
                                </div>

                                {/* Combined Total Display */}
                                <div className="text-right">
                                  <span className="text-[12px] font-bold text-[var(--hw-neutral-900)]">
                                    {combined > 0 ? `${fmtKg(combined)} ${uom}` : ""}
                                  </span>
                                </div>
                              </div>

                              {/* Mobile Grid */}
                              <div className="md:hidden">
                                <MobileArrivalVariantRow
                                  v={v}
                                  f={f}
                                  onUpdateFarm={(val) => updateVolume(v.id, "farmSource", val)}
                                  onUpdateOther={(val) => updateVolume(v.id, "otherSource", val)}
                                  onUpdateUom={(u) => updateUom(v.id, u)}
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
                                  placeholder="Enter variety, grade, or descriptor"
                                  className="flex-1 max-w-xs px-2.5 py-1 text-[12px] text-[var(--hw-neutral-900)] border border-[var(--hw-green-700)] rounded-lg focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => commitVariant(com.id)}
                                  className="px-2.5 py-1 rounded-lg bg-[var(--hw-green-700)] text-white text-[11px] font-medium cursor-pointer"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setAddingVariant(null); setVariantInput(""); }}
                                  className="px-2.5 py-1 rounded-lg border border-[var(--hw-neutral-200)] text-[12px] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setAddingVariant(com.id); setVariantInput(""); }}
                                className="text-[12px] font-medium text-[var(--hw-green-700)] hover:underline pl-6 cursor-pointer"
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
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Review Bar */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-[14px] font-bold text-[var(--hw-neutral-900)]">
            Ready to review entered arrival volume?
          </h3>
          <p className="text-[12px] text-[var(--hw-neutral-600)] mt-0.5">
            {totalSourceValueCount} source value{totalSourceValueCount === 1 ? "" : "s"} entered across Farm Source and Other Sources.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDataName(`DFTC Arrival Volume — ${effectivePeriodInfo.label}`);
            setReviewMode(true);
          }}
          disabled={totalEnteredCount === 0}
          className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-semibold hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[var(--shadow-xs)] flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Review Entered Data</span>
          {totalEnteredCount > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
              {totalSourceValueCount}
            </span>
          )}
        </button>
      </div>

      {/* Modals */}
      {addCommodityOpen && (
        <AddCommodityModal
          onClose={() => setAddCommodityOpen(false)}
          onAdd={handleAddCommodity}
        />
      )}

      {hwInfoId && (
        <HWInfoOverlay onClose={() => setHwInfoId(null)} />
      )}

      {coverageOpen && (
        <CoverageOverlay onClose={() => setCoverageOpen(false)} />
      )}
    </div>
  );
}
