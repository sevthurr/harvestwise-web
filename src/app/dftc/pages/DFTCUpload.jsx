import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  ChevronLeft,
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";
const DATASET_TYPES = [
  "Daily Retail Prices",
  "Daily Wholesale Prices",
  "Daily Landing Prices",
  "DFTC Arrival Volume"
];
const ACCEPTED_EXTS = [".xlsx", ".xls", ".csv"];
const STEPS = [
  { id: "upload", label: "Upload File" },
  { id: "preview", label: "Check Records" },
  { id: "match", label: "Match Format" },
  { id: "validate", label: "Submit to HarvestWise" }
];
const isPriceType = (t) => t !== "DFTC Arrival Volume";
const PRICE_UPLOAD_COLS = ["Market", "Price_Type", "Date", "Src_Category", "Commodity", "Variety", "Unit", "Price", "Obs_Status"];
const ARRIVAL_UPLOAD_COLS = ["Date", "Facility", "Commodity", "Variety", "Farm_Volume", "Other_Volume", "Total_Volume", "Unit", "Obs_Status"];
const HW_PRICE_FIELDS = [
  { field: "Market", required: true },
  { field: "Price Type", required: true },
  { field: "Date", required: true },
  { field: "Source Category", required: true },
  { field: "Commodity", required: true },
  { field: "Variety / Grade / Descriptor", required: false },
  { field: "Full Source Commodity Label", required: false },
  { field: "UOM", required: true },
  { field: "Price", required: false },
  { field: "Observation Status", required: false }
];
const HW_ARRIVAL_FIELDS = [
  { field: "Date / Month", required: true },
  { field: "Facility", required: false },
  { field: "Commodity", required: true },
  { field: "Variety / Descriptor", required: false },
  { field: "Farm Source Volume", required: false },
  { field: "Other Source Volume", required: false },
  { field: "Combined Total Volume", required: false },
  { field: "Unit", required: true },
  { field: "Observation Status", required: false }
];
const PRICE_SUGGESTIONS = {
  Market: "Market",
  Price_Type: "Price Type",
  Date: "Date",
  Src_Category: "Source Category",
  Commodity: "Commodity",
  Variety: "Variety / Grade / Descriptor",
  Unit: "UOM",
  Price: "Price",
  Obs_Status: "Observation Status"
};
const ARRIVAL_SUGGESTIONS = {
  Date: "Date / Month",
  Facility: "Facility",
  Commodity: "Commodity",
  Variety: "Variety / Descriptor",
  Farm_Volume: "Farm Source Volume",
  Other_Volume: "Other Source Volume",
  Total_Volume: "Combined Total Volume",
  Unit: "Unit",
  Obs_Status: "Observation Status"
};
const PRICE_PREVIEW_ROWS = [
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Kamatis", Variety: "Round", Unit: "kg", Price: "85.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Talong", Variety: "Long Purple", Unit: "kg", Price: "72.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Repolyo", Variety: "Green", Unit: "kg", Price: "60.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Spices", Commodity: "Atsal", Variety: "Red", Unit: "kg", Price: "120.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Highland Veg.", Commodity: "Carrots", Variety: "Regular", Unit: "kg", Price: "90.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Pipino", Variety: "Regular", Unit: "kg", Price: "40.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Ampalaya", Variety: "Regular", Unit: "kg", Price: "75.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Kalabasa", Variety: "Orange", Unit: "kg", Price: "35.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Lettuce", Variety: "Iceberg", Unit: "kg", Price: "80.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Chinese Pechay", Variety: "Regular", Unit: "kg", Price: "35.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Rootcrops", Commodity: "Onion", Variety: "Yellow", Unit: "kg", Price: "95.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Spices", Commodity: "Garlic", Variety: "Local", Unit: "kg", Price: "180.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Rootcrops", Commodity: "Potato", Variety: "", Unit: "kg", Price: "55.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Kangkong", Variety: "Regular", Unit: "kg", Price: "25.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Sitaw", Variety: "", Unit: "kg", Price: "45.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Sayote", Variety: "", Unit: "kg", Price: "28.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Okra", Variety: "", Unit: "kg", Price: "38.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Upo", Variety: "", Unit: "kg", Price: "0.00", Obs_Status: "Zero in source" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Fruits", Commodity: "Banana", Variety: "", Unit: "kg", Price: "", Obs_Status: "" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Mustasa", Variety: "Local", Unit: "kg", Price: "22.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "", Commodity: "", Variety: "", Unit: "", Price: "", Obs_Status: "" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Kamatis", Variety: "Round", Unit: "kg", Price: "85.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Patola", Variety: "", Unit: "kg", Price: "50.00", Obs_Status: "Reported value" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "2026-08-02", Src_Category: "Lowland Vegetables", Commodity: "Bataw", Variety: "", Unit: "kg", Price: "", Obs_Status: "Missing / not reported" },
  { Market: "Bangkerohan", Price_Type: "Retail", Date: "invalid", Src_Category: "Spices", Commodity: "Ginger", Variety: "", Unit: "kg", Price: "120.00", Obs_Status: "Reported value" }
];
const ARRIVAL_PREVIEW_ROWS = [
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Kamatis", Variety: "Round", Farm_Volume: "1800", Other_Volume: "400", Total_Volume: "2200", Unit: "kg", Obs_Status: "Reported value" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Talong", Variety: "Long Purple", Farm_Volume: "950", Other_Volume: "200", Total_Volume: "1150", Unit: "kg", Obs_Status: "Reported value" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Repolyo", Variety: "", Farm_Volume: "620", Other_Volume: "130", Total_Volume: "750", Unit: "kg", Obs_Status: "Reported value" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Atsal", Variety: "Red", Farm_Volume: "340", Other_Volume: "80", Total_Volume: "420", Unit: "kg", Obs_Status: "Reported value" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Carrots", Variety: "Regular", Farm_Volume: "1100", Other_Volume: "250", Total_Volume: "1350", Unit: "kg", Obs_Status: "Reported value" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Pipino", Variety: "", Farm_Volume: "480", Other_Volume: "100", Total_Volume: "580", Unit: "kg", Obs_Status: "Reported value" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Ampalaya", Variety: "", Farm_Volume: "390", Other_Volume: "60", Total_Volume: "450", Unit: "kg", Obs_Status: "Reported value" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Kalabasa", Variety: "Orange", Farm_Volume: "820", Other_Volume: "180", Total_Volume: "1000", Unit: "kg", Obs_Status: "Reported value" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Lettuce", Variety: "Iceberg", Farm_Volume: "210", Other_Volume: "50", Total_Volume: "260", Unit: "kg", Obs_Status: "Reported value" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Chinese Pechay", Variety: "Regular", Farm_Volume: "670", Other_Volume: "150", Total_Volume: "820", Unit: "kg", Obs_Status: "Reported value" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Onion", Variety: "Yellow", Farm_Volume: "900", Other_Volume: "300", Total_Volume: "1200", Unit: "kg", Obs_Status: "Reported value" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Garlic", Variety: "Local", Farm_Volume: "250", Other_Volume: "120", Total_Volume: "370", Unit: "kg", Obs_Status: "Reported value" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Potato", Variety: "", Farm_Volume: "560", Other_Volume: "90", Total_Volume: "650", Unit: "kg", Obs_Status: "Reported value" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Kangkong", Variety: "", Farm_Volume: "120", Other_Volume: "30", Total_Volume: "150", Unit: "kg", Obs_Status: "Reported value" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Sitaw", Variety: "", Farm_Volume: "310", Other_Volume: "0", Total_Volume: "310", Unit: "kg", Obs_Status: "Zero in source" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Sayote", Variety: "", Farm_Volume: "", Other_Volume: "", Total_Volume: "", Unit: "kg", Obs_Status: "Missing / not reported" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "", Variety: "", Farm_Volume: "", Other_Volume: "", Total_Volume: "", Unit: "", Obs_Status: "" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Kamatis", Variety: "Round", Farm_Volume: "1800", Other_Volume: "400", Total_Volume: "2200", Unit: "kg", Obs_Status: "Reported value" },
  { Date: "2026-08-02", Facility: "DFTC Taboan", Commodity: "Okra", Variety: "", Farm_Volume: "140", Other_Volume: "30", Total_Volume: "170", Unit: "kg", Obs_Status: "Reported value" },
  { Date: "invalid", Facility: "DFTC Taboan", Commodity: "Bataw", Variety: "", Farm_Volume: "80", Other_Volume: "20", Total_Volume: "100", Unit: "kg", Obs_Status: "Reported value" }
];
const VALIDATION_COUNTS = { accepted: 82, temporary: 27, correction: 8, duplicate: 3 };
const ACCEPTED_SAMPLE = [
  { row: 1, commodity: "Kamatis", category: "Lowland Vegetables", variety: "Round", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B185.00", obs: "Reported value", result: "Accepted" },
  { row: 2, commodity: "Talong", category: "Lowland Vegetables", variety: "Long Purple", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B172.00", obs: "Reported value", result: "Accepted" },
  { row: 3, commodity: "Repolyo", category: "Lowland Vegetables", variety: "Green", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B160.00", obs: "Reported value", result: "Accepted" },
  { row: 4, commodity: "Atsal", category: "Spices", variety: "Red", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B1120.00", obs: "Reported value", result: "Accepted" },
  { row: 5, commodity: "Carrots", category: "Highland Vegetables", variety: "Regular", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B190.00", obs: "Reported value", result: "Accepted" },
  { row: 6, commodity: "Pipino", category: "Lowland Vegetables", variety: "Regular", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B140.00", obs: "Reported value", result: "Accepted" },
  { row: 7, commodity: "Ampalaya", category: "Lowland Vegetables", variety: "Regular", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B175.00", obs: "Reported value", result: "Accepted" },
  { row: 8, commodity: "Kalabasa", category: "Lowland Vegetables", variety: "Orange", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B135.00", obs: "Reported value", result: "Accepted" },
  { row: 9, commodity: "Lettuce", category: "Lowland Vegetables", variety: "Iceberg", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B180.00", obs: "Reported value", result: "Accepted" },
  { row: 10, commodity: "Chinese Pechay", category: "Lowland Vegetables", variety: "Regular", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B135.00", obs: "Reported value", result: "Accepted" }
];
const TEMPORARY_SAMPLE = [
  { row: 11, commodity: "Onion", category: "Rootcrops", variety: "Yellow", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B195.00", obs: "Reported value" },
  { row: 12, commodity: "Garlic", category: "Spices", variety: "Local", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B1180.00", obs: "Reported value" },
  { row: 13, commodity: "Potato", category: "Rootcrops", variety: "\u2014", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B155.00", obs: "Reported value" },
  { row: 14, commodity: "Kangkong", category: "Lowland Vegetables", variety: "Regular", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B125.00", obs: "Reported value" },
  { row: 15, commodity: "Sitaw", category: "Lowland Vegetables", variety: "\u2014", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B145.00", obs: "Reported value" },
  { row: 16, commodity: "Sayote", category: "Lowland Vegetables", variety: "\u2014", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B128.00", obs: "Reported value" },
  { row: 17, commodity: "Okra", category: "Lowland Vegetables", variety: "\u2014", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B138.00", obs: "Reported value" },
  { row: 23, commodity: "Patola", category: "Lowland Vegetables", variety: "\u2014", date: "2026-08-02", uom: "kg", priceOrVol: "\u20B150.00", obs: "Reported value" }
];
const CORRECTION_SAMPLE = [
  { row: 19, commodity: "Banana", issue: "Missing price and observation status", fields: [{ label: "Price", value: "", key: "price" }, { label: "Observation Status", value: "", key: "obs" }] },
  { row: 21, commodity: "(blank)", issue: "Missing commodity name and source category", fields: [{ label: "Commodity", value: "", key: "commodity" }, { label: "Source Category", value: "", key: "category" }] },
  { row: 25, commodity: "Ginger", issue: "Invalid date format", fields: [{ label: "Date", value: "invalid", key: "date" }] },
  { row: 30, commodity: "Paria", issue: "Unknown commodity \u2014 cannot match to official list", fields: [{ label: "Commodity", value: "Paria", key: "commodity" }] },
  { row: 44, commodity: "Bisaya Kamatis", issue: "Unknown commodity \u2014 cannot match to official list", fields: [{ label: "Commodity", value: "Bisaya Kamatis", key: "commodity" }] },
  { row: 57, commodity: "Upo", issue: "Zero value without observation status", fields: [{ label: "Price", value: "0.00", key: "price" }, { label: "Observation Status", value: "", key: "obs" }] },
  { row: 68, commodity: "Mustasa", issue: "Missing UOM", fields: [{ label: "UOM", value: "", key: "uom" }] },
  { row: 82, commodity: "Saluyot", issue: "Unknown commodity \u2014 cannot match to official list", fields: [{ label: "Commodity", value: "Saluyot", key: "commodity" }] }
];
const DUPLICATE_SAMPLE = [
  { row: 22, commodity: "Kamatis", variety: "Round", date: "2026-08-02", uom: "kg", price: "\u20B185.00", reason: "Matches row 1 \u2014 same commodity, date, UOM, and market" },
  { row: 91, commodity: "Talong", variety: "Long Purple", date: "2026-08-01", uom: "kg", price: "\u20B170.00", reason: "Already submitted on Aug 1, 2026" },
  { row: 97, commodity: "Repolyo", variety: "Green", date: "2026-08-01", uom: "kg", price: "\u20B158.00", reason: "Already submitted on Aug 1, 2026" }
];
const inputCls = [
  "w-full px-3 py-2.5 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg bg-white",
  "text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-600)]",
  "focus:ring-1 focus:ring-[var(--hw-green-600)] transition-colors"
].join(" ");
const selectCls = `${inputCls} appearance-none`;
const labelCls = "block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1";
function StepBar({ step }) {
  const idx = STEPS.findIndex((s) => s.id === step);
  const label = STEPS[idx]?.label ?? "";
  return <>
      {
    /* Mobile: compact "X of 4 · Label" */
  }
      <div className="flex items-center gap-2 md:hidden">
        <div className="w-6 h-6 rounded-full bg-[var(--hw-green-700)] flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
          {idx + 1}
        </div>
        <span className="text-[12px] font-medium text-[var(--hw-neutral-800)]">
          Step {idx + 1} of {STEPS.length} · {label}
        </span>
      </div>

      {
    /* Desktop: full horizontal stepper */
  }
      <div className="hidden md:flex items-center">
        {STEPS.map((s, i) => {
    const done = i < idx;
    const active = s.id === step;
    return <React.Fragment key={s.id}>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${done || active ? "bg-[var(--hw-green-700)] text-white" : "bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-800)]"}`}>
                  {done ? "\u2713" : i + 1}
                </div>
                <span className={`text-[12px] font-medium whitespace-nowrap ${active ? "text-[var(--hw-green-700)]" : done ? "text-[var(--hw-neutral-800)]" : "text-[var(--hw-neutral-700)]"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 min-w-[12px] ${i < idx ? "bg-[var(--hw-green-700)]" : "bg-[var(--hw-neutral-200)]"}`} />}
            </React.Fragment>;
  })}
      </div>
    </>;
}
function ActionBar({ children }) {
  return <>
      <div className="h-20 md:hidden" />
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-[var(--hw-neutral-100)] px-4 py-3 flex gap-2 z-30 md:static md:bg-transparent md:border-0 md:px-0 md:py-0 md:mt-6">
        {children}
      </div>
    </>;
}
const TAB_LABELS = {
  accepted: `Accepted (82)`,
  temporary: `Temporary (27)`,
  correction: `Needs Correction (8)`,
  duplicate: `Duplicate (3)`
};
function TabNav({ active, onChange, correctedCount }) {
  const tabs = Object.keys(TAB_LABELS);
  return <div className="flex gap-0 border-b border-[var(--hw-neutral-200)] overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {tabs.map((t) => <button
    key={t}
    onClick={() => onChange(t)}
    className={`px-4 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${active === t ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)]" : "border-transparent text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-800)]"}`}
  >
          {t === "correction" && correctedCount > 0 ? `Needs Correction (${Math.max(0, 8 - correctedCount)})` : TAB_LABELS[t]}
        </button>)}
    </div>;
}
function TableWrap({ cols, children }) {
  return <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
          <tr>
            {cols.map((c) => <th key={c} className="px-3 py-2 text-left font-semibold text-[var(--hw-neutral-700)] whitespace-nowrap">{c}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--hw-neutral-100)]">{children}</tbody>
      </table>
    </div>;
}
const td = "px-3 py-2.5 whitespace-nowrap text-[var(--hw-neutral-700)]";
const tdBold = `${td} font-medium text-[var(--hw-neutral-800)]`;
function CorrectionModal({
  row,
  onClose,
  onSave
}) {
  const [vals, setVals] = useState(
    Object.fromEntries(row.fields.map((f) => [f.key, f.value]))
  );
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--hw-neutral-100)]">
          <div>
            <p className="font-semibold text-[var(--hw-neutral-900)]">
              Correct Row {row.row}
            </p>
            <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">
              {row.commodity !== "(blank)" ? row.commodity : "\u2014"} · {row.issue}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-700)] transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {row.fields.map((f) => <div key={f.key}>
              <label className={labelCls}>{f.label}</label>
              <input
    className={inputCls}
    value={vals[f.key]}
    onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
    placeholder={`Enter ${f.label.toLowerCase()}...`}
  />
            </div>)}
        </div>
        <div className="px-5 py-4 border-t border-[var(--hw-neutral-100)] flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors">
            Cancel
          </button>
          <button
    onClick={() => onSave(row.row)}
    className="flex-[2] bg-[var(--hw-green-700)] text-white py-2.5 rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors"
  >
            Save changes
          </button>
        </div>
      </div>
    </div>;
}
function DFTCUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState("upload");
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [datasetType, setDatasetType] = useState("");
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [analyzingFile, setAnalyzingFile] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const PAGE_SIZE = 20;
  const [mappings, setMappings] = useState({});
  const [activeTab, setActiveTab] = useState("accepted");
  const [correctionRow, setCorrectionRow] = useState(null);
  const [correctedRows, setCorrectedRows] = useState(/* @__PURE__ */ new Set());
  const [revalidating, setRevalidating] = useState(false);
  const uploadCols = datasetType && isPriceType(datasetType) ? PRICE_UPLOAD_COLS : ARRIVAL_UPLOAD_COLS;
  const suggestions = datasetType && isPriceType(datasetType) ? PRICE_SUGGESTIONS : ARRIVAL_SUGGESTIONS;
  const hwFields = datasetType && isPriceType(datasetType) ? HW_PRICE_FIELDS : HW_ARRIVAL_FIELDS;
  const previewRows = datasetType && isPriceType(datasetType) ? PRICE_PREVIEW_ROWS : ARRIVAL_PREVIEW_ROWS;
  const totalPreviewPages = Math.ceil(previewRows.length / PAGE_SIZE);
  const pageRows = previewRows.slice((previewPage - 1) * PAGE_SIZE, previewPage * PAGE_SIZE);
  function initMappings() {
    const m = {};
    uploadCols.forEach((col) => {
      m[col] = suggestions[col] ?? "";
    });
    setMappings(m);
  }
  function tryAcceptFile(f) {
    setFileError("");
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTS.includes(ext)) {
      setFileError(`Unsupported file type: ${ext}. Use .xlsx, .xls, or .csv.`);
      return;
    }
    setAnalyzingFile(true);
    setTimeout(() => {
      setFile({
        name: f.name,
        ext,
        sizeKb: Math.round(f.size / 1024),
        rows: Math.floor(Math.random() * 60) + 80
      });
      setAnalyzingFile(false);
    }, 800);
  }
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) tryAcceptFile(f);
  }, [datasetType]);
  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) tryAcceptFile(f);
    e.target.value = "";
  };
  function handleValidate() {
    setValidating(true);
    setTimeout(() => {
      setValidating(false);
      setStep("validate");
    }, 1200);
  }
  function handleRevalidate() {
    setRevalidating(true);
    setTimeout(() => setRevalidating(false), 900);
  }
  function handleSubmit() {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStep("success");
    }, 1e3);
  }
  function handleCorrectionSave(rowNum) {
    setCorrectedRows((prev) => /* @__PURE__ */ new Set([...prev, rowNum]));
    setCorrectionRow(null);
  }
  const canContinueUpload = datasetType && file && !analyzingFile;
  return <div className="px-4 md:px-8 lg:px-10 py-5 max-w-[1240px] mx-auto">

      {
    /* Correction modal */
  }
      {correctionRow && <CorrectionModal
    row={correctionRow}
    onClose={() => setCorrectionRow(null)}
    onSave={handleCorrectionSave}
  />}

      {
    /* Back + step bar */
  }
      {step !== "success" && <div className="mb-5 space-y-3">
          <button
    onClick={() => {
      if (step === "upload") navigate("/dftc");
      if (step === "preview") setStep("upload");
      if (step === "match") setStep("preview");
      if (step === "validate") setStep("match");
    }}
    className="flex items-center gap-1 text-[13px] text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-700)] transition-colors"
  >
            <ChevronLeft className="w-4 h-4" />
            {step === "upload" ? "Back to Home" : "Back"}
          </button>
          <StepBar step={step} />
        </div>}

      {
    /* ═══════════════════════════════════════════════════════════
        STEP 1 — Upload File
    ═══════════════════════════════════════════════════════════ */
  }
      {step === "upload" && <div className="space-y-5">
          <div>
            <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">Upload Dataset</h1>
            <p className="text-[13px] text-[var(--hw-neutral-800)] mt-0.5">
              Upload an Excel or CSV file containing DFTC price or arrival-volume records.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-4">

            {
    /* Dataset type */
  }
            <div>
              <label className={labelCls}>Dataset Type</label>
              <select
    className={selectCls}
    value={datasetType}
    onChange={(e) => {
      setDatasetType(e.target.value);
      setFile(null);
      setFileError("");
    }}
  >
                <option value="">Select dataset type...</option>
                {DATASET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {
    /* File drop zone */
  }
            <div>
              <label className={labelCls}>File</label>
              <input
    ref={fileInputRef}
    type="file"
    accept=".xlsx,.xls,.csv"
    className="sr-only"
    onChange={onFileChange}
  />

              {analyzingFile ? <div className="border border-[var(--hw-neutral-200)] rounded-xl p-8 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 text-[var(--hw-green-700)] animate-spin" />
                  <p className="text-[13px] text-[var(--hw-neutral-800)]">Analyzing file...</p>
                </div> : file ? <div className="border border-[var(--hw-neutral-200)] rounded-xl p-4 flex items-start gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-[var(--hw-green-700)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--hw-neutral-800)] truncate">{file.name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="text-[12px] text-[var(--hw-neutral-800)]">{file.ext.toUpperCase()}</span>
                      <span className="text-[12px] text-[var(--hw-neutral-800)]">{file.sizeKb} KB</span>
                      <span className="text-[12px] text-[var(--hw-neutral-800)]">{file.rows} rows detected</span>
                    </div>
                  </div>
                  <button
    onClick={() => setFile(null)}
    className="p-1 text-[var(--hw-neutral-700)] hover:text-red-500 transition-colors flex-shrink-0"
  >
                    <X className="w-4 h-4" />
                  </button>
                </div> : <div
    onDragOver={(e) => {
      e.preventDefault();
      setIsDragging(true);
    }}
    onDragLeave={() => setIsDragging(false)}
    onDrop={onDrop}
    onClick={() => fileInputRef.current?.click()}
    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer transition-colors ${isDragging ? "border-[var(--hw-green-600)] bg-[var(--hw-green-50)]" : "border-[var(--hw-neutral-200)] hover:border-[var(--hw-green-400)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                  <Upload className="w-6 h-6 text-[var(--hw-neutral-700)]" />
                  <p className="text-[13px] font-medium text-[var(--hw-neutral-700)]">
                    Drag and drop or tap to select a file
                  </p>
                  <p className="text-[12px] text-[var(--hw-neutral-800)]">
                    Accepts .xlsx, .xls, .csv
                  </p>
                </div>}

              {fileError && <div className="mt-2 flex items-start gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px]">{fileError}</p>
                </div>}
            </div>
          </div>

          <ActionBar>
            <button
    onClick={() => navigate("/dftc")}
    className="flex-1 py-3 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-100)] transition-colors bg-white"
  >
              Cancel
            </button>
            <button
    disabled={!canContinueUpload}
    onClick={() => {
      setPreviewPage(1);
      setStep("preview");
    }}
    className="flex-[2] bg-[var(--hw-green-700)] text-white py-3 rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
  >
              Continue
            </button>
          </ActionBar>
        </div>}

      {
    /* ═══════════════════════════════════════════════════════════
        STEP 2 — Check Records
    ═══════════════════════════════════════════════════════════ */
  }
      {step === "preview" && <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">Check Records</h1>
            <p className="text-[13px] text-[var(--hw-neutral-800)] mt-0.5">
              {datasetType} · {file?.name} · {file?.rows} rows detected
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--hw-neutral-100)]">
              <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)]">
                Showing rows {(previewPage - 1) * PAGE_SIZE + 1}–{Math.min(previewPage * PAGE_SIZE, previewRows.length)} of {previewRows.length} (preview sample)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--hw-neutral-700)] whitespace-nowrap">#</th>
                    {uploadCols.map((c) => <th key={c} className="px-3 py-2 text-left font-semibold text-[var(--hw-neutral-700)] whitespace-nowrap">{c}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {pageRows.map((row, i) => {
    const rowNum = (previewPage - 1) * PAGE_SIZE + i + 1;
    return <tr key={rowNum} className={uploadCols.some((c) => !row[c]) ? "bg-amber-50/50" : ""}>
                        <td className="px-3 py-2.5 text-[var(--hw-neutral-700)]">{rowNum}</td>
                        {uploadCols.map((c) => <td key={c} className={`px-3 py-2.5 whitespace-nowrap ${!row[c] ? "text-[var(--hw-neutral-700)] italic" : "text-[var(--hw-neutral-700)]"}`}>
                            {row[c] || "(blank)"}
                          </td>)}
                      </tr>;
  })}
                </tbody>
              </table>
            </div>

            {
    /* Pagination */
  }
            {totalPreviewPages > 1 && <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-[var(--hw-neutral-100)]">
                <p className="text-[12px] text-[var(--hw-neutral-800)]">
                  Page {previewPage} of {totalPreviewPages}
                </p>
                <div className="flex gap-1">
                  <button
    disabled={previewPage === 1}
    onClick={() => setPreviewPage((p) => p - 1)}
    className="px-2.5 py-1 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
                    Prev
                  </button>
                  {Array.from({ length: totalPreviewPages }, (_, i) => i + 1).map((p) => <button
    key={p}
    onClick={() => setPreviewPage(p)}
    className={`px-2.5 py-1 text-[12px] border rounded-lg transition-colors ${p === previewPage ? "border-[var(--hw-green-600)] bg-[var(--hw-green-700)] text-white" : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                      {p}
                    </button>)}
                  <button
    disabled={previewPage === totalPreviewPages}
    onClick={() => setPreviewPage((p) => p + 1)}
    className="px-2.5 py-1 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
                    Next
                  </button>
                </div>
              </div>}
          </div>

          <ActionBar>
            <button
    onClick={() => setStep("upload")}
    className="flex-1 py-3 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-100)] transition-colors bg-white"
  >
              Back
            </button>
            <button
    onClick={() => {
      initMappings();
      setStep("match");
    }}
    className="flex-[2] bg-[var(--hw-green-700)] text-white py-3 rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors"
  >
              Continue
            </button>
          </ActionBar>
        </div>}

      {
    /* ═══════════════════════════════════════════════════════════
        STEP 3 — Match Format
    ═══════════════════════════════════════════════════════════ */
  }
      {step === "match" && <div className="space-y-5">
          <div>
            <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">Match Format</h1>
            <p className="text-[13px] text-[var(--hw-neutral-800)] mt-0.5">
              Map each uploaded column to the matching HarvestWise field. Required fields are marked.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
            {
    /* Column headers */
  }
            <div className="grid grid-cols-2 gap-4 px-4 py-2.5 border-b border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]">
              <p className="text-[11px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Uploaded Column</p>
              <p className="text-[11px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">HarvestWise Field</p>
            </div>

            <div className="divide-y divide-[var(--hw-neutral-100)]">
              {uploadCols.map((col) => {
    const hwMatch = hwFields.find((f) => f.field === mappings[col]);
    const isRequired = hwMatch?.required ?? false;
    return <div key={col} className="grid grid-cols-2 gap-4 px-4 py-3 items-center">
                    <div>
                      <p className="text-[13px] font-medium text-[var(--hw-neutral-800)]">{col}</p>
                      {mappings[col] && <p className="text-[10px] font-medium text-[var(--hw-green-700)] mt-0.5">
                          Auto-suggested
                        </p>}
                    </div>
                    <div>
                      <select
      className={`${selectCls} py-2`}
      value={mappings[col] ?? ""}
      onChange={(e) => setMappings((m) => ({ ...m, [col]: e.target.value }))}
    >
                        <option value="">— Skip this column —</option>
                        {hwFields.map((f) => <option key={f.field} value={f.field}>
                            {f.field}{f.required ? " *" : ""}
                          </option>)}
                      </select>
                    </div>
                  </div>;
  })}
            </div>

            <div className="px-4 py-3 border-t border-[var(--hw-neutral-100)]">
              <p className="text-[12px] text-[var(--hw-neutral-800)]">* Required field</p>
            </div>
          </div>

          {
    /* Validate Records button — shows loading */
  }
          <ActionBar>
            <button
    onClick={() => setStep("preview")}
    className="flex-1 py-3 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-100)] transition-colors bg-white"
  >
              Back
            </button>
            <button
    onClick={handleValidate}
    disabled={validating}
    className="flex-[2] bg-[var(--hw-green-700)] text-white py-3 rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
  >
              {validating ? <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating records...
                </> : "Validate Records"}
            </button>
          </ActionBar>
        </div>}

      {
    /* ═══════════════════════════════════════════════════════════
        STEP 4 — Submit to HarvestWise
    ═══════════════════════════════════════════════════════════ */
  }
      {step === "validate" && <div className="space-y-5">
          <div>
            <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">Submit to HarvestWise</h1>
            <p className="text-[13px] text-[var(--hw-neutral-800)] mt-0.5">
              Review the validation results before submission.
            </p>
          </div>

          {
    /* 4 summary cards */
  }
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
    { key: "accepted", label: "Accepted for HarvestWise Processing", count: VALIDATION_COUNTS.accepted, numCls: "text-emerald-700" },
    { key: "temporary", label: "Temporary Market Records", count: VALIDATION_COUNTS.temporary, numCls: "text-[var(--hw-neutral-800)]" },
    { key: "correction", label: "Needs Correction", count: Math.max(0, VALIDATION_COUNTS.correction - correctedRows.size), numCls: "text-amber-700" },
    { key: "duplicate", label: "Duplicate Records", count: VALIDATION_COUNTS.duplicate, numCls: "text-[var(--hw-neutral-800)]" }
  ].map((c) => <button
    key={c.key}
    onClick={() => setActiveTab(c.key)}
    className={`bg-white rounded-2xl border shadow-[var(--shadow-xs)] p-4 text-left transition-colors ${activeTab === c.key ? "border-[var(--hw-green-400)]" : "border-[var(--hw-neutral-200)] hover:border-[var(--hw-neutral-300)]"}`}
  >
                <p className={`text-2xl font-bold leading-none ${c.numCls}`}>{c.count}</p>
                <p className="text-[11px] font-medium text-[var(--hw-neutral-700)] mt-1.5 leading-snug">{c.label}</p>
              </button>)}
          </div>

          {
    /* Temporary note */
  }
          {activeTab === "temporary" && <p className="text-[12px] text-[var(--hw-neutral-800)]">
              Reporting only. Stored for up to 15 days and not used for forecasting or farmer advisories.
            </p>}

          {
    /* Tab navigation */
  }
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
            <TabNav active={activeTab} onChange={setActiveTab} correctedCount={correctedRows.size} />

            {
    /* Accepted table */
  }
            {activeTab === "accepted" && <TableWrap cols={["Row", "Commodity", "Category", "Variety", "Date", "UOM", "Price / Vol.", "Obs. Status", "Result"]}>
                {ACCEPTED_SAMPLE.map((r) => <tr key={r.row}>
                    <td className={td}>{r.row}</td>
                    <td className={tdBold}>{r.commodity}</td>
                    <td className={td}>{r.category}</td>
                    <td className={td}>{r.variety}</td>
                    <td className={td}>{r.date}</td>
                    <td className={td}>{r.uom}</td>
                    <td className={td}>{r.priceOrVol}</td>
                    <td className={td}>{r.obs}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-emerald-700 font-medium">{r.result}</td>
                  </tr>)}
                <tr>
                  <td colSpan={9} className="px-3 py-2 text-[12px] text-[var(--hw-neutral-800)]">
                    Showing 10 of {VALIDATION_COUNTS.accepted} accepted records
                  </td>
                </tr>
              </TableWrap>}

            {
    /* Temporary table */
  }
            {activeTab === "temporary" && <TableWrap cols={["Row", "Commodity", "Category", "Variety", "Date", "UOM", "Price / Vol.", "Obs. Status"]}>
                {TEMPORARY_SAMPLE.map((r) => <tr key={r.row}>
                    <td className={td}>{r.row}</td>
                    <td className={tdBold}>{r.commodity}</td>
                    <td className={td}>{r.category}</td>
                    <td className={td}>{r.variety}</td>
                    <td className={td}>{r.date}</td>
                    <td className={td}>{r.uom}</td>
                    <td className={td}>{r.priceOrVol}</td>
                    <td className={td}>{r.obs}</td>
                  </tr>)}
                <tr>
                  <td colSpan={8} className="px-3 py-2 text-[12px] text-[var(--hw-neutral-800)]">
                    Showing {TEMPORARY_SAMPLE.length} of {VALIDATION_COUNTS.temporary} temporary records
                  </td>
                </tr>
              </TableWrap>}

            {
    /* Needs Correction table */
  }
            {activeTab === "correction" && <>
                <TableWrap cols={["Row", "Commodity", "Issue", "Validation Result"]}>
                  {CORRECTION_SAMPLE.filter((r) => !correctedRows.has(r.row)).map((r) => <tr
    key={r.row}
    onClick={() => setCorrectionRow(r)}
    className="cursor-pointer hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
                      <td className={td}>{r.row}</td>
                      <td className={tdBold}>{r.commodity}</td>
                      <td className={td}>{r.issue}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-amber-700 font-medium">Needs Correction</td>
                    </tr>)}
                  {CORRECTION_SAMPLE.filter((r) => correctedRows.has(r.row)).map((r) => <tr key={r.row} className="opacity-60">
                      <td className={td}>{r.row}</td>
                      <td className={tdBold}>{r.commodity}</td>
                      <td className={td}>{r.issue}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-emerald-700 font-medium">Corrected — pending revalidation</td>
                    </tr>)}
                  {CORRECTION_SAMPLE.every((r) => correctedRows.has(r.row)) && <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-[12px] text-[var(--hw-neutral-800)]">
                        All records corrected. Click Revalidate Records to update counts.
                      </td>
                    </tr>}
                </TableWrap>
                {correctedRows.size > 0 && <div className="px-4 py-3 border-t border-[var(--hw-neutral-100)]">
                    <button
    onClick={handleRevalidate}
    disabled={revalidating}
    className="flex items-center gap-2 px-4 py-2 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors disabled:opacity-60"
  >
                      {revalidating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      {revalidating ? "Revalidating..." : "Revalidate Records"}
                    </button>
                  </div>}
                {!correctedRows.size && <div className="px-4 py-2.5 border-t border-[var(--hw-neutral-100)]">
                    <p className="text-[12px] text-[var(--hw-neutral-800)]">
                      Click any row to open the correction form. Needs Correction records will not be submitted.
                    </p>
                  </div>}
              </>}

            {
    /* Duplicate table */
  }
            {activeTab === "duplicate" && <>
                <TableWrap cols={["Row", "Commodity", "Variety", "Date", "UOM", "Price", "Reason"]}>
                  {DUPLICATE_SAMPLE.map((r) => <tr key={r.row}>
                      <td className={td}>{r.row}</td>
                      <td className={tdBold}>{r.commodity}</td>
                      <td className={td}>{r.variety}</td>
                      <td className={td}>{r.date}</td>
                      <td className={td}>{r.uom}</td>
                      <td className={td}>{r.price}</td>
                      <td className="px-3 py-2.5 text-[var(--hw-neutral-800)] max-w-[220px] whitespace-normal leading-snug">{r.reason}</td>
                    </tr>)}
                </TableWrap>
                <div className="px-4 py-2.5 border-t border-[var(--hw-neutral-100)]">
                  <p className="text-[12px] text-[var(--hw-neutral-800)]">
                    Duplicate records will not be submitted.
                  </p>
                </div>
              </>}
          </div>

          {
    /* Submission summary */
  }
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-1.5">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-800)] mb-2">Submission summary</p>
            {[
    ["Accepted records", "Will be submitted for HarvestWise processing", `${VALIDATION_COUNTS.accepted} records`],
    ["Temporary records", "Will be stored for reporting up to 15 days", `${VALIDATION_COUNTS.temporary} records`],
    ["Needs Correction", "Will not be submitted", `${Math.max(0, VALIDATION_COUNTS.correction - correctedRows.size)} records`],
    ["Duplicate records", "Will not be submitted", `${VALIDATION_COUNTS.duplicate} records`]
  ].map(([label, desc, count]) => <div key={label} className="flex items-center justify-between gap-3 py-1">
                <div>
                  <p className="text-[13px] font-medium text-[var(--hw-neutral-800)]">{label}</p>
                  <p className="text-[12px] text-[var(--hw-neutral-800)]">{desc}</p>
                </div>
                <p className="text-[13px] font-semibold text-[var(--hw-neutral-800)] flex-shrink-0">{count}</p>
              </div>)}
          </div>

          <ActionBar>
            <button
    onClick={() => setStep("match")}
    className="flex-1 py-3 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-100)] transition-colors bg-white"
  >
              Back
            </button>
            <button
    onClick={handleSubmit}
    disabled={submitting}
    className="flex-[2] bg-[var(--hw-green-700)] text-white py-3 rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
  >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit to HarvestWise"}
            </button>
          </ActionBar>
        </div>}

      {
    /* ═══════════════════════════════════════════════════════════
        SUCCESS
    ═══════════════════════════════════════════════════════════ */
  }
      {step === "success" && <div className="flex flex-col items-center text-center space-y-5 py-8 px-4 max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-full bg-[var(--hw-green-50)] flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-[var(--hw-green-700)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">Dataset submitted to HarvestWise</h1>
          </div>

          {
    /* Summary card */
  }
          <div className="w-full bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left space-y-2.5">
            {[
    ["Dataset type", datasetType],
    ["Submitted records", `${VALIDATION_COUNTS.accepted + VALIDATION_COUNTS.temporary}`],
    ["Accepted for processing", `${VALIDATION_COUNTS.accepted}`],
    ["Temporary records", `${VALIDATION_COUNTS.temporary}`],
    ["Excluded records", `${Math.max(0, VALIDATION_COUNTS.correction - correctedRows.size) + VALIDATION_COUNTS.duplicate}`]
  ].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-[var(--hw-neutral-800)]">{label}</span>
                <span className="text-[13px] font-semibold text-[var(--hw-neutral-800)]">{value}</span>
              </div>)}
          </div>

          <div className="w-full space-y-2">
            <button
    onClick={() => navigate("/dftc")}
    className="w-full bg-[var(--hw-green-700)] text-white py-3 rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors"
  >
              Return to Home
            </button>
            {VALIDATION_COUNTS.temporary > 0 && <button
    onClick={() => navigate("/dftc/temporary-records")}
    className="w-full py-3 border border-[var(--hw-green-600)] rounded-xl text-[13px] font-medium text-[var(--hw-green-700)] hover:bg-[var(--hw-green-50)] transition-colors bg-white"
  >
                View Temporary Market Records
              </button>}
            <button
    onClick={() => {
      setStep("upload");
      setFile(null);
      setDatasetType("");
      setFileError("");
      setCorrectedRows(/* @__PURE__ */ new Set());
    }}
    className="w-full py-3 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-100)] transition-colors bg-white"
  >
              Upload Another Dataset
            </button>
          </div>
        </div>}

    </div>;
}
export {
  DFTCUpload as default
};
