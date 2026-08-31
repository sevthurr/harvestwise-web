import React, { useState, useRef } from "react";
import {
  Upload,
  Check,
  X,
  FileText,
  CheckCircle2,
  Download,
  RefreshCw
} from "lucide-react";
import { ingestionApi } from "../../../services/api";

const DATA_TYPE_MAP = {
  "DFTC Wholesale Prices": "dftc_daily_wholesale",
  "DFTC Retail Prices": "dftc_daily_retail",
  "Bangkerohan Retail Prices": "bankerohan_daily_retail",
  "Bangkerohan Wholesale Prices": "bankerohan_daily_wholesale",
  "DFTC Arrival Volume": "arrival",
  "PSA Historical Production": "production",
  "Weather Data": "weather",
  "Commodity Metadata": "commodity",
  "Price Consolidated Wholesale": "price_consolidated_wholesale",
  "Price Consolidated Retail": "price_consolidated_retail",
  "Price Consolidated Landing": "price_consolidated_landing"
};

const DATASET_TYPES = Object.keys(DATA_TYPE_MAP);
const ORGS = [
  "DA-AMAD Davao City",
  "DFTC Davao City",
  "PSA Region XI",
  "PAGASA",
  "Philippine Government",
  "HarvestWise Admin"
];
const PREVIEW_ROWS = [
  { commodity: "Kamatis", variety: "Diamante Big", market: "Bangkerohan", date: "2026-06-23", price: "85.00", unit: "kg", type: "Retail" },
  { commodity: "Talong", variety: "Banate King", market: "Bangkerohan", date: "2026-06-23", price: "60.00", unit: "kg", type: "Retail" },
  { commodity: "Repolyo", variety: "Wakamini", market: "Bangkerohan", date: "2026-06-23", price: "45.00", unit: "kg", type: "Retail" },
  { commodity: "Atsal", variety: "Smooth Cayene", market: "Bangkerohan", date: "2026-06-23", price: "120.00", unit: "kg", type: "Retail" },
  { commodity: "Carrots", variety: "Big", market: "Bangkerohan", date: "2026-06-23", price: "90.00", unit: "kg", type: "Retail" }
];
const VALIDATION_RESULT = {
  totalRows: 248,
  valid: 241,
  duplicates: 4,
  missingValues: 2,
  invalidDates: 1,
  unrecognizedCommodities: 0,
  rejected: 7
};
const STEPS = ["Uploaded", "Validated", "Standardized", "Stored"];
function AdminImport() {
  const [step, setStep] = useState("form");
  const [datasetType, setDatasetType] = useState("");
  const [org, setOrg] = useState("");
  const [period, setPeriod] = useState("");
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const fileRef = useRef(null);
  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setFileName(selected.name);
    setUploadError("");
    setUploadMessage("");
    setStep("preview");
    setCurrentStep(0);
  };
  const handleValidate = () => {
    if (!datasetType) {
      setUploadError("Select a dataset type before validating.");
      return;
    }
    setStep("validated");
    setCurrentStep(1);
  };
  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    setUploadMessage("");
    setStep("importing");
    setCurrentStep(2);
    try {
      const dataType = DATA_TYPE_MAP[datasetType];
      const res = await ingestionApi.uploadFile(file, dataType, false);
      setUploadMessage(res?.message || "Import accepted and processing.");
      setStep("done");
      setCurrentStep(3);
    } catch (err) {
      setUploadError(err.message || "Upload failed.");
      setStep("validated");
      setCurrentStep(1);
    } finally {
      setUploading(false);
    }
  };
  const handleReset = () => {
    setStep("form");
    setFileName("");
    setCurrentStep(0);
    setDatasetType("");
    setOrg("");
    setPeriod("");
    setFile(null);
    setUploadError("");
    setUploadMessage("");
    if (fileRef.current) fileRef.current.value = "";
  };
  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] bg-white outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition";
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-[900px] mx-auto space-y-5">

        <div>
          <h1 className="text-[22px] font-bold text-[var(--hw-neutral-900)]">Import & Validate</h1>
          <p className="text-[15px] text-[var(--hw-neutral-800)] mt-0.5">
            Upload CSV or Excel files and validate before storing.
          </p>
        </div>

        {
    /* Processing steps indicator */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-3.5">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-colors ${i < currentStep ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : i === currentStep ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)] bg-white" : "border-[var(--hw-neutral-300)] text-[var(--hw-neutral-400)] bg-white"}`}>
                    {i < currentStep ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-[10px] font-medium ${i <= currentStep ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-400)]"}`}>
                    {s}
                  </span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 rounded ${i < currentStep ? "bg-[var(--hw-green-700)]" : "bg-[var(--hw-neutral-200)]"}`} />}
              </React.Fragment>)}
          </div>
        </div>

        {
    /* ── Form ── */
  }
        {(step === "form" || step === "preview") && <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-4">
            <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Dataset information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-[var(--hw-neutral-700)] mb-1.5">Dataset type</label>
                <select value={datasetType} onChange={(e) => setDatasetType(e.target.value)} className={inputCls}>
                  <option value="">Select dataset type…</option>
                  {DATASET_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--hw-neutral-700)] mb-1.5">Source organization</label>
                <select value={org} onChange={(e) => setOrg(e.target.value)} className={inputCls}>
                  <option value="">Select organization…</option>
                  {ORGS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-medium text-[var(--hw-neutral-700)] mb-1.5">Reporting period</label>
                <input
    type="text"
    value={period}
    onChange={(e) => setPeriod(e.target.value)}
    placeholder="e.g. Jun 23, 2026 or Q1 2026"
    className={inputCls}
  />
              </div>
            </div>

            {
    /* File upload area */
  }
            {!fileName ? <button
    onClick={() => fileRef.current?.click()}
    className="w-full border-2 border-dashed border-[var(--hw-neutral-300)] rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-[var(--hw-green-400)] hover:bg-[var(--hw-green-50)] transition-colors"
  >
                <div className="p-3 bg-[var(--hw-neutral-100)] rounded-2xl">
                  <Upload className="w-7 h-7 text-[var(--hw-neutral-800)]" />
                </div>
                <div className="text-center">
                  <p className="text-[15px] font-medium text-[var(--hw-neutral-700)]">Drop file here or click to upload</p>
                  <p className="text-[13px] text-[var(--hw-neutral-800)] mt-1">CSV or Excel (.xlsx) · Max 10 MB</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsm,.ods,.tsv,.parquet,.feather" className="hidden" onChange={handleFileSelect} />
              </button> : <div className="flex items-center gap-3 p-3.5 bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl">
                <FileText className="w-5 h-5 text-[var(--hw-green-700)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--hw-neutral-900)] truncate">{fileName}</p>
                  <p className="text-[12px] text-[var(--hw-neutral-700)]">{file ? `${(file.size / 1024).toFixed(1)} KB` : ""} · Ready to validate</p>
                </div>
                <button onClick={handleReset} className="p-1 text-[var(--hw-neutral-400)] hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>}
            {uploadError && (
              <p className="text-[12px] text-red-600 font-medium">{uploadError}</p>
            )}
          </div>}

        {
    /* ── Preview ── */
  }
        {step === "preview" && fileName && <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
            <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">File preview — first 5 rows</p>
            <div className="overflow-x-auto rounded-xl border border-[var(--hw-neutral-200)]">
              <table className="w-full text-[12px]">
                <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                  <tr>
                    {["Commodity", "Variety", "Market", "Date", "Price", "Unit", "Type"].map((h) => <th key={h} className="px-3 py-2 text-left font-semibold text-[var(--hw-neutral-800)]">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {PREVIEW_ROWS.map((r, i) => <tr key={i} className="hover:bg-[var(--hw-neutral-50)]">
                      <td className="px-3 py-2 text-[var(--hw-neutral-800)]">{r.commodity}</td>
                      <td className="px-3 py-2 text-[var(--hw-neutral-500)] italic">{r.variety}</td>
                      <td className="px-3 py-2 text-[var(--hw-neutral-800)]">{r.market}</td>
                      <td className="px-3 py-2 text-[var(--hw-neutral-800)]">{r.date}</td>
                      <td className="px-3 py-2 font-medium text-[var(--hw-neutral-900)]">₱{r.price}</td>
                      <td className="px-3 py-2 text-[var(--hw-neutral-800)]">{r.unit}</td>
                      <td className="px-3 py-2 text-[var(--hw-neutral-800)]">{r.type}</td>
                    </tr>)}
                </tbody>
              </table>
            </div>
            <button
    onClick={handleValidate}
    className="w-full py-2.5 bg-[var(--hw-green-700)] text-white text-[15px] font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
  >
              Validate Data
            </button>
          </div>}

        {
    /* ── Validation results ── */
  }
        {(step === "validated" || step === "importing" || step === "done") && <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Validation complete</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
    { label: "Total rows", value: VALIDATION_RESULT.totalRows, color: "text-[var(--hw-neutral-900)]" },
    { label: "Valid rows", value: VALIDATION_RESULT.valid, color: "text-emerald-700" },
    { label: "Duplicates", value: VALIDATION_RESULT.duplicates, color: "text-amber-700" },
    { label: "Missing values", value: VALIDATION_RESULT.missingValues, color: "text-amber-700" },
    { label: "Invalid dates", value: VALIDATION_RESULT.invalidDates, color: "text-amber-700" },
    { label: "Unrecognized commodities", value: VALIDATION_RESULT.unrecognizedCommodities, color: "text-[var(--hw-neutral-800)]" },
    { label: "Rejected rows", value: VALIDATION_RESULT.rejected, color: "text-red-600" }
  ].map((r) => <div key={r.label} className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2.5">
                  <p className="text-[12px] text-[var(--hw-neutral-700)]">{r.label}</p>
                  <p className={`text-[17px] font-bold mt-0.5 ${r.color}`}>{r.value}</p>
                </div>)}
            </div>

            {step === "validated" && <div className="flex flex-wrap gap-3 pt-1">
                <button
    onClick={handleImport}
    className="flex-1 min-w-[140px] py-2.5 bg-[var(--hw-green-700)] text-white text-[13px] font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
  >
                  Import Valid Records ({VALIDATION_RESULT.valid})
                </button>
                <button className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors">
                  <Download className="w-3.5 h-3.5" />
                  Download Error Report
                </button>
                <button onClick={handleReset} className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Replace File
                </button>
              </div>}

            {step === "importing" && <div className="flex items-center gap-3 py-2">
                <RefreshCw className="w-4 h-4 text-[var(--hw-green-700)] animate-spin flex-shrink-0" />
                <p className="text-[13px] text-[var(--hw-neutral-800)]">Uploading file for processing…</p>
              </div>}

            {step === "done" && <div className="space-y-3">
                <div className="flex items-center gap-2 py-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <p className="text-[13px] font-medium text-emerald-700">
                    {uploadMessage || "Import accepted and processing in the background."}
                  </p>
                </div>
                <button
    onClick={handleReset}
    className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
                  <Upload className="w-3.5 h-3.5" />
                  Import another file
                </button>
              </div>}
          </div>}

      </div>
    </div>;
}
export {
  AdminImport as default
};
