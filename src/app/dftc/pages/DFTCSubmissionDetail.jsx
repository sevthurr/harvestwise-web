import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ChevronLeft, AlertCircle, X, Download, Loader2, FileSpreadsheet } from "lucide-react";
import { DFTCKpiCard } from "../components/DFTCKpiCard";
import { DATASETS } from "./dftc-submissions-data";
const cardCls = "bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)]";
const tdCls = "px-4 py-3 whitespace-nowrap text-[var(--hw-neutral-800)] text-[14px]";
const tdBold = `${tdCls} font-medium text-[var(--hw-neutral-900)]`;
const thCls = "px-4 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap";
function ValTabNav({ active, onChange, ds }) {
  const tabs = [
    { id: "analytics", label: `Analytics-Supported Records (${ds.analyticsSupported})` },
    { id: "other", label: `Other Commodity Records (${ds.otherCommodities})` },
    { id: "correction", label: `Needs Correction (${ds.needsCorrection})` },
    { id: "duplicate", label: `Duplicate Records (${ds.duplicate})` }
  ];
  return <div className="flex gap-0 border-b border-[var(--hw-neutral-200)] overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {tabs.map((t) => <button
    key={t.id}
    onClick={() => onChange(t.id)}
    className={`px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${active === t.id ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)]" : "border-transparent text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-900)]"}`}
  >
          {t.label}
        </button>)}
    </div>;
}
const PRICE_ANALYTICS_ROWS = [
  { row: 1, commodity: "Kamatis", category: "Lowland Vegetables", variety: "Round", date: "Aug 2, 2026", uom: "kg", price: "\u20B185.00" },
  { row: 2, commodity: "Talong", category: "Lowland Vegetables", variety: "Long Purple", date: "Aug 2, 2026", uom: "kg", price: "\u20B172.00" },
  { row: 3, commodity: "Repolyo", category: "Lowland Vegetables", variety: "Green", date: "Aug 2, 2026", uom: "kg", price: "\u20B160.00" },
  { row: 4, commodity: "Atsal", category: "Spices", variety: "Red", date: "Aug 2, 2026", uom: "kg", price: "\u20B1120.00" },
  { row: 5, commodity: "Carrots", category: "Highland Vegetables", variety: "Regular", date: "Aug 2, 2026", uom: "kg", price: "\u20B190.00" },
  { row: 6, commodity: "Pipino", category: "Lowland Vegetables", variety: "Regular", date: "Aug 2, 2026", uom: "kg", price: "\u20B140.00" },
  { row: 7, commodity: "Ampalaya", category: "Lowland Vegetables", variety: "Regular", date: "Aug 2, 2026", uom: "kg", price: "\u20B175.00" },
  { row: 8, commodity: "Kalabasa", category: "Lowland Vegetables", variety: "Orange", date: "Aug 2, 2026", uom: "kg", price: "\u20B135.00" },
  { row: 9, commodity: "Lettuce", category: "Lowland Vegetables", variety: "Iceberg", date: "Aug 2, 2026", uom: "kg", price: "\u20B180.00" },
  { row: 10, commodity: "Chinese Pechay", category: "Lowland Vegetables", variety: "Regular", date: "Aug 2, 2026", uom: "kg", price: "\u20B135.00" }
];
const PRICE_OTHER_ROWS = [
  { row: 11, commodity: "Okra", category: "Lowland Vegetables", variety: "Regular", date: "Aug 2, 2026", uom: "kg", price: "\u20B138.00" },
  { row: 12, commodity: "Onion", category: "Rootcrops", variety: "Yellow", date: "Aug 2, 2026", uom: "kg", price: "\u20B195.00" },
  { row: 13, commodity: "Garlic", category: "Spices", variety: "Local", date: "Aug 2, 2026", uom: "kg", price: "\u20B1180.00" },
  { row: 14, commodity: "Potato", category: "Rootcrops", variety: "\u2014", date: "Aug 2, 2026", uom: "kg", price: "\u20B155.00" },
  { row: 15, commodity: "Kangkong", category: "Lowland Vegetables", variety: "Regular", date: "Aug 2, 2026", uom: "kg", price: "\u20B125.00" }
];
const ARRIVAL_ANALYTICS_ROWS = [
  { row: 1, commodity: "Kamatis", variety: "Round", dateMonth: "Aug 2026", farmSource: 1200, otherSource: 300, combinedTotal: 1500, unit: "kg" },
  { row: 2, commodity: "Talong", variety: "Long Purple", dateMonth: "Aug 2026", farmSource: 800, otherSource: 150, combinedTotal: 950, unit: "kg" },
  { row: 3, commodity: "Repolyo", variety: "Green", dateMonth: "Aug 2026", farmSource: 2100, otherSource: 400, combinedTotal: 2500, unit: "kg" },
  { row: 4, commodity: "Carrots", variety: "Regular", dateMonth: "Aug 2026", farmSource: 950, otherSource: 200, combinedTotal: 1150, unit: "kg" },
  { row: 5, commodity: "Ampalaya", variety: "Regular", dateMonth: "Aug 2026", farmSource: 650, otherSource: 80, combinedTotal: 730, unit: "kg" }
];
const ARRIVAL_OTHER_ROWS = [
  { row: 6, commodity: "Okra", variety: "Regular", dateMonth: "Aug 2026", farmSource: 300, otherSource: 50, combinedTotal: 350, unit: "kg" },
  { row: 7, commodity: "Onion", variety: "Yellow", dateMonth: "Aug 2026", farmSource: 150, otherSource: 30, combinedTotal: 180, unit: "kg" },
  { row: 8, commodity: "Garlic", variety: "Local", dateMonth: "Aug 2026", farmSource: 80, otherSource: 20, combinedTotal: 100, unit: "kg" }
];
const CORRECTION_ROWS = [
  { row: 19, commodity: "Banana", field: "Price", uploaded: "", reason: "Missing price value" },
  { row: 21, commodity: "(blank)", field: "Commodity", uploaded: "", reason: "Missing commodity name" },
  { row: 25, commodity: "Ginger", field: "Date", uploaded: "invalid", reason: "Invalid date format" },
  { row: 57, commodity: "Upo", field: "UOM", uploaded: "", reason: "Zero value without UOM" },
  { row: 68, commodity: "Mustasa", field: "UOM", uploaded: "", reason: "Missing UOM" }
];
const DUPLICATE_ROWS = [
  { row: 22, commodity: "Kamatis", date: "Aug 2, 2026", market: "Bangkerohan", priceType: "Retail", matchId: "REC-2026-08-001", reason: "Matches row 1 \u2014 same commodity, date, UOM, and market" },
  { row: 91, commodity: "Talong", date: "Aug 1, 2026", market: "Bangkerohan", priceType: "Retail", matchId: "REC-2026-08-002", reason: "Already saved on Aug 1, 2026" },
  { row: 97, commodity: "Repolyo", date: "Aug 1, 2026", market: "Bangkerohan", priceType: "Retail", matchId: "REC-2026-08-003", reason: "Already saved on Aug 1, 2026" }
];
function ExcelModal({ onClose, datasetId, count }) {
  const [step, setStep] = useState("form");
  const genTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  const shortId = datasetId.replace("DATA-", "DFTC-Other-");
  return <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--hw-neutral-100)]">
          <p className="font-semibold text-[var(--hw-neutral-900)]">Download Other Commodity Records</p>
          <button onClick={onClose} className="p-1 text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-700)] flex-shrink-0 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === "form" && <>
            <div className="px-5 py-4 space-y-3">
              <p className="text-[14px] text-[var(--hw-neutral-800)]">
                Generate an Excel report containing the other commodity records from this dataset.
              </p>
              <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 border border-[var(--hw-neutral-200)] space-y-1.5">
                {[["Records to include", String(count)], ["Dataset", datasetId]].map(([l, v]) => <div key={l} className="flex justify-between gap-3">
                    <span className="text-[13px] text-[var(--hw-neutral-800)]">{l}</span>
                    <span className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{v}</span>
                  </div>)}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-[var(--hw-neutral-100)] flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] transition-colors">Cancel</button>
              <button
    onClick={() => {
      setStep("loading");
      setTimeout(() => setStep("success"), 1200);
    }}
    className="flex-[2] bg-[var(--hw-green-700)] text-white py-2.5 rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors flex items-center justify-center gap-2"
  >
                <Download className="w-3.5 h-3.5" /> Generate Excel Report
              </button>
            </div>
          </>}

        {step === "loading" && <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-[var(--hw-green-700)] animate-spin" />
            <p className="text-[14px] text-[var(--hw-neutral-800)]">Generating Excel report...</p>
          </div>}

        {step === "success" && <>
            <div className="px-5 py-5 space-y-3">
              <div className="flex items-center gap-2 text-[var(--hw-green-700)]">
                <FileSpreadsheet className="w-5 h-5" />
                <p className="font-semibold">Excel report generated successfully</p>
              </div>
              <div className="border border-[var(--hw-neutral-200)] rounded-xl p-4 space-y-2">
                {[
    ["File name", `${shortId}.xlsx`],
    ["Records", String(count)],
    ["Generated", `Aug 2, 2026 \xB7 ${genTime}`]
  ].map(([l, v]) => <div key={l} className="flex justify-between gap-3">
                    <span className="text-[13px] text-[var(--hw-neutral-800)]">{l}</span>
                    <span className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{v}</span>
                  </div>)}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-[var(--hw-neutral-100)] flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] transition-colors">Close</button>
              <button onClick={onClose} className="flex-[2] bg-[var(--hw-green-700)] text-white py-2.5 rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors flex items-center justify-center gap-2">
                <Download className="w-3.5 h-3.5" /> Download File
              </button>
            </div>
          </>}
      </div>
    </div>;
}
function DeleteModal({ onCancel, onConfirm }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <p className="font-semibold text-[var(--hw-neutral-900)]">Delete Draft?</p>
        <p className="text-[14px] text-[var(--hw-neutral-800)]">
          This draft dataset will be permanently deleted. This action cannot be undone.
        </p>
        <div className="flex gap-2 pt-2">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-[13px] font-medium hover:bg-red-700 transition-colors">
            Delete Draft
          </button>
        </div>
      </div>
    </div>;
}
function DFTCSubmissionDetail() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const dsExact = DATASETS.find((d) => d.datasetId === submissionId);
  const ds = dsExact ?? DATASETS[0];
  const isSample = !dsExact;
  const [valTab, setValTab] = useState("analytics");
  const [showExcel, setShowExcel] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retried, setRetried] = useState(false);
  function handleRetry() {
    setRetrying(true);
    setTimeout(() => {
      setRetrying(false);
      setRetried(true);
    }, 1200);
  }
  const effectiveStatus = retried ? "Saved" : ds.status;
  const isArrival = ds.datasetType === "DFTC Arrival Volume";
  const showValidation = effectiveStatus === "Saved";
  const INFO_ROWS = [
    ["Source", ds.entryMethod === "Manual Input" ? "Manual Data Entry" : ds.fileName],
    ...ds.entryMethod !== "Manual Input" ? [["File Type", ds.fileType]] : [],
    ["Dataset Type", ds.datasetType],
    ["Market / Facility", ds.market],
    ...!isArrival && ds.priceType !== "\u2014" ? [["Price Type", ds.priceType]] : [],
    ["Reporting Date", ds.reportingDate],
    ["Entry Method", ds.entryMethod],
    ["Saved By", ds.savedBy],
    ["Saved Date and Time", ds.savedDateTime],
    ["Validation Completed", ds.validationCompletedDate],
    ["Current Status", effectiveStatus],
    ["Validation Result", effectiveStatus === "Saved" ? "Passed \u2014 dataset saved successfully" : effectiveStatus === "Failed" ? "Failed \u2014 see failure details below" : "Pending \u2014 draft not yet validated"]
  ];
  return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">

      {showExcel && <ExcelModal onClose={() => setShowExcel(false)} datasetId={ds.datasetId} count={ds.otherCommodities} />}
      {showDelete && <DeleteModal onCancel={() => setShowDelete(false)} onConfirm={() => navigate("/dftc/submissions")} />}

      {
    /* Back */
  }
      <button
    onClick={() => navigate("/dftc/submissions")}
    className="flex items-center gap-1.5 text-[14px] text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-900)] transition-colors"
  >
        <ChevronLeft className="w-4 h-4" />
        Back to History
      </button>

      {isSample && <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl text-[13px] text-[var(--hw-neutral-800)]">
          <AlertCircle className="w-4 h-4 text-[var(--hw-neutral-800)] flex-shrink-0" />
          Showing sample dataset — the requested dataset ID was not found.
        </div>}

      {
    /* Header */
  }
      <div className="space-y-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">{ds.datasetId}</h1>
          <span className="text-[14px] font-semibold text-[var(--hw-neutral-900)] px-2.5 py-0.5 bg-[var(--hw-neutral-100)] border border-[var(--hw-neutral-200)] rounded-full">
            {effectiveStatus}
          </span>
        </div>
        <p className="text-[14px] text-[var(--hw-neutral-800)]">{ds.datasetType} · {ds.savedDateTime}</p>
        <p className="text-[14px] text-[var(--hw-neutral-800)]">Saved by {ds.savedBy}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <DFTCKpiCard
          label="Total Records"
          value={ds.totalRecords ?? 0}
          dotColor="bg-[var(--hw-neutral-400)]"
          labelColor="text-[var(--hw-neutral-800)]"
          valueColor="text-[var(--hw-neutral-900)]"
        />
        <DFTCKpiCard
          label="Analytics-Supported"
          value={ds.analyticsSupported ?? 0}
          dotColor="bg-[var(--hw-neutral-400)]"
          labelColor="text-[var(--hw-neutral-800)]"
          valueColor="text-[var(--hw-neutral-900)]"
        />
        <DFTCKpiCard
          label="Other Commodities"
          value={ds.otherCommodities ?? 0}
          dotColor="bg-[var(--hw-neutral-400)]"
          labelColor="text-[var(--hw-neutral-800)]"
          valueColor="text-[var(--hw-neutral-900)]"
        />
        <DFTCKpiCard
          label="Needs Correction"
          value={ds.needsCorrection ?? 0}
          dotColor="bg-[var(--hw-neutral-400)]"
          labelColor="text-[var(--hw-neutral-800)]"
          valueColor="text-[var(--hw-neutral-900)]"
        />
        <DFTCKpiCard
          label="Duplicate Records"
          value={ds.duplicate ?? 0}
          dotColor="bg-[var(--hw-neutral-400)]"
          labelColor="text-[var(--hw-neutral-800)]"
          valueColor="text-[var(--hw-neutral-900)]"
        />
      </div>

      {
    /* Dataset Information */
  }
      <div className={`${cardCls} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-[var(--hw-neutral-100)]">
          <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Dataset Information</p>
        </div>
        <div className="px-5 divide-y divide-[var(--hw-neutral-100)]">
          {INFO_ROWS.map(([label, value]) => <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4 py-3">
              <span className="text-[13px] font-medium text-[var(--hw-neutral-800)] sm:w-52 flex-shrink-0">{label}</span>
              <span className="text-[14px] text-[var(--hw-neutral-900)]">{value}</span>
            </div>)}
        </div>
      </div>

      {
    /* Draft operations */
  }
      {effectiveStatus === "Draft" && <div className={`${cardCls} p-4`}>
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)] mb-3">Draft Operations</p>
          <div className="flex gap-2">
            <button
    onClick={() => navigate("/dftc/input")}
    className="flex-1 py-2.5 bg-[var(--hw-green-700)] text-white rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors"
  >
              Continue Editing
            </button>
            <button
    onClick={() => setShowDelete(true)}
    className="flex-1 py-2.5 border border-red-200 rounded-xl text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
  >
              Delete Draft
            </button>
          </div>
        </div>}

      {
    /* Failed operations */
  }
      {effectiveStatus === "Failed" && !retried && <div className={`${cardCls} p-4 space-y-3`}>
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Save Failure</p>
          {ds.failureReason && <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[14px] text-[var(--hw-neutral-900)]">{ds.failureReason}</p>
            </div>}
          <p className="text-[13px] text-[var(--hw-neutral-800)]">Failed: {ds.savedDateTime}</p>
          <div className="flex gap-2">
            <button
    onClick={handleRetry}
    disabled={retrying}
    className="flex-1 py-2.5 bg-[var(--hw-green-700)] text-white rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
  >
              {retrying ? <><Loader2 className="w-4 h-4 animate-spin" />Retrying...</> : "Retry"}
            </button>
            <button
    onClick={() => navigate("/dftc/input")}
    className="flex-1 py-2.5 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
              Return to Submit Data
            </button>
          </div>
        </div>}

      {retried && <div className="px-4 py-2.5 bg-[var(--hw-green-50)] border border-[var(--hw-green-200)] rounded-xl text-[14px] font-medium text-[var(--hw-green-800)]">
          Retry completed. Status updated to Saved.
        </div>}

      {
    /* Validation Result */
  }
      {showValidation && <div className={`${cardCls} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Validation Result</p>
            <p className="text-[13px] text-[var(--hw-neutral-800)] mt-0.5">Saved records are read-only.</p>
          </div>

          <ValTabNav active={valTab} onChange={setValTab} ds={ds} />

          {
    /* Analytics-Supported Records */
  }
          {valTab === "analytics" && <>
              <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
                <p className="text-[14px] text-[var(--hw-neutral-800)]">
                  These records are used in HarvestWise price trends, forecasting, and analytical processing where applicable.
                </p>
              </div>
              <div className="overflow-x-auto">
                {isArrival ? <table className="w-full">
                    <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                      <tr>{["Row", "Commodity", "Variety", "Date / Month", "Farm Source", "Other Source", "Combined Total", "Unit"].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                      {ARRIVAL_ANALYTICS_ROWS.map((r) => <tr key={r.row} className="hover:bg-[var(--hw-neutral-50)]">
                          <td className={tdCls}>{r.row}</td>
                          <td className={tdBold}>{r.commodity}</td>
                          <td className={tdCls}>{r.variety}</td>
                          <td className={tdCls}>{r.dateMonth}</td>
                          <td className={tdCls}>{r.farmSource.toLocaleString()}</td>
                          <td className={tdCls}>{r.otherSource.toLocaleString()}</td>
                          <td className={tdBold}>{r.combinedTotal.toLocaleString()}</td>
                          <td className={tdCls}>{r.unit}</td>
                        </tr>)}
                      <tr>
                        <td colSpan={8} className="px-4 py-2.5 text-[13px] text-[var(--hw-neutral-800)]">
                          Showing {ARRIVAL_ANALYTICS_ROWS.length} of {ds.analyticsSupported} analytics-supported records
                        </td>
                      </tr>
                    </tbody>
                  </table> : <table className="w-full">
                    <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                      <tr>{["Row", "Commodity", "Category", "Variety", "Date", "UOM", "Price"].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                      {PRICE_ANALYTICS_ROWS.map((r) => <tr key={r.row} className="hover:bg-[var(--hw-neutral-50)]">
                          <td className={tdCls}>{r.row}</td>
                          <td className={tdBold}>{r.commodity}</td>
                          <td className={tdCls}>{r.category}</td>
                          <td className={tdCls}>{r.variety}</td>
                          <td className={tdCls}>{r.date}</td>
                          <td className={tdCls}>{r.uom}</td>
                          <td className={tdBold}>{r.price}</td>
                        </tr>)}
                      <tr>
                        <td colSpan={7} className="px-4 py-2.5 text-[13px] text-[var(--hw-neutral-800)]">
                          Showing {PRICE_ANALYTICS_ROWS.length} of {ds.analyticsSupported} analytics-supported records
                        </td>
                      </tr>
                    </tbody>
                  </table>}
              </div>
            </>}

          {
    /* Other Commodity Records */
  }
          {valTab === "other" && <>
              <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)] flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[14px] text-[var(--hw-neutral-800)]">
                  These records are retained for DFTC monitoring, reporting, and downloads. HarvestWise crop analytics are not available for these commodities yet.
                </p>
                {ds.otherCommodities > 0 && <button
    onClick={() => setShowExcel(true)}
    className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--hw-neutral-200)] rounded-lg text-[13px] font-medium text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] transition-colors flex-shrink-0"
  >
                    <Download className="w-3.5 h-3.5" /> Download Excel Report
                  </button>}
              </div>
              {ds.otherCommodities === 0 ? <div className="px-5 py-10 text-center text-[14px] text-[var(--hw-neutral-800)]">
                  No other commodity records in this dataset.
                </div> : <div className="overflow-x-auto">
                  {isArrival ? <table className="w-full">
                      <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                        <tr>{["Row", "Commodity", "Variety", "Date / Month", "Farm Source", "Other Source", "Combined Total", "Unit"].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                        {ARRIVAL_OTHER_ROWS.map((r) => <tr key={r.row} className="hover:bg-[var(--hw-neutral-50)]">
                            <td className={tdCls}>{r.row}</td>
                            <td className={tdBold}>{r.commodity}</td>
                            <td className={tdCls}>{r.variety}</td>
                            <td className={tdCls}>{r.dateMonth}</td>
                            <td className={tdCls}>{r.farmSource.toLocaleString()}</td>
                            <td className={tdCls}>{r.otherSource.toLocaleString()}</td>
                            <td className={tdBold}>{r.combinedTotal.toLocaleString()}</td>
                            <td className={tdCls}>{r.unit}</td>
                          </tr>)}
                        <tr>
                          <td colSpan={8} className="px-4 py-2.5 text-[13px] text-[var(--hw-neutral-800)]">
                            Showing {ARRIVAL_OTHER_ROWS.length} of {ds.otherCommodities} other commodity records
                          </td>
                        </tr>
                      </tbody>
                    </table> : <table className="w-full">
                      <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                        <tr>{["Row", "Commodity", "Category", "Variety", "Date", "UOM", "Price"].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                        {PRICE_OTHER_ROWS.map((r) => <tr key={r.row} className="hover:bg-[var(--hw-neutral-50)]">
                            <td className={tdCls}>{r.row}</td>
                            <td className={tdBold}>{r.commodity}</td>
                            <td className={tdCls}>{r.category}</td>
                            <td className={tdCls}>{r.variety}</td>
                            <td className={tdCls}>{r.date}</td>
                            <td className={tdCls}>{r.uom}</td>
                            <td className={tdBold}>{r.price}</td>
                          </tr>)}
                        <tr>
                          <td colSpan={7} className="px-4 py-2.5 text-[13px] text-[var(--hw-neutral-800)]">
                            Showing {PRICE_OTHER_ROWS.length} of {ds.otherCommodities} other commodity records
                          </td>
                        </tr>
                      </tbody>
                    </table>}
                </div>}
            </>}

          {
    /* Needs Correction */
  }
          {valTab === "correction" && <>
              <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
                <p className="text-[14px] text-[var(--hw-neutral-800)]">
                  These records were not saved. Review the validation reasons and re-upload a corrected file if needed.
                </p>
              </div>
              {ds.needsCorrection === 0 ? <div className="px-5 py-10 text-center text-[14px] text-[var(--hw-neutral-800)]">No records need correction.</div> : <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                      <tr>{["Row", "Commodity", "Affected Field", "Uploaded Value", "Validation Reason"].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                      {CORRECTION_ROWS.slice(0, ds.needsCorrection).map((r) => <tr key={r.row} className="hover:bg-[var(--hw-neutral-50)]">
                          <td className={tdCls}>{r.row}</td>
                          <td className={tdBold}>{r.commodity}</td>
                          <td className={tdCls}>{r.field}</td>
                          <td className={`${tdCls} italic text-[var(--hw-neutral-800)]`}>{r.uploaded || "(blank)"}</td>
                          <td className={tdCls}>{r.reason}</td>
                        </tr>)}
                    </tbody>
                  </table>
                </div>}
            </>}

          {
    /* Duplicate Records */
  }
          {valTab === "duplicate" && <>
              <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
                <p className="text-[14px] text-[var(--hw-neutral-800)]">
                  Duplicate records are excluded from the dataset and were not saved.
                </p>
              </div>
              {ds.duplicate === 0 ? <div className="px-5 py-10 text-center text-[14px] text-[var(--hw-neutral-800)]">No duplicate records.</div> : <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                      <tr>{["Row", "Commodity", "Date", "Market", "Price Type", "Matching Record ID", "Duplicate Reason"].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                      {DUPLICATE_ROWS.slice(0, ds.duplicate).map((r) => <tr key={r.row} className="hover:bg-[var(--hw-neutral-50)]">
                          <td className={tdCls}>{r.row}</td>
                          <td className={tdBold}>{r.commodity}</td>
                          <td className={tdCls}>{r.date}</td>
                          <td className={tdCls}>{r.market}</td>
                          <td className={tdCls}>{r.priceType}</td>
                          <td className={tdCls}>{r.matchId}</td>
                          <td className={`px-4 py-3 text-[14px] text-[var(--hw-neutral-800)] max-w-[240px] whitespace-normal leading-snug`}>{r.reason}</td>
                        </tr>)}
                    </tbody>
                  </table>
                </div>}
            </>}
        </div>}
    </div>;
}
export {
  DFTCSubmissionDetail as default
};
