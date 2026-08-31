import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Check,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  Loader2
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

const STEPS = ["Uploaded", "Validated", "Standardized", "Stored"];

function readFileText(file) {
  return new Promise((resolve, reject) => {
    if (typeof file.text === "function") {
      file.text().then(resolve).catch(reject);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result || "");
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

async function parseFileReal(selectedFile) {
  const ext = (selectedFile.name.split('.').pop() || '').toLowerCase();
  
  if (['xlsx', 'xlsm', 'xls', 'ods'].includes(ext)) {
    try {
      const ExcelJSModule = await import("exceljs");
      const Workbook = ExcelJSModule.default?.Workbook ?? ExcelJSModule.Workbook;
      const wb = new Workbook();
      const buffer = await selectedFile.arrayBuffer();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];
      if (!ws) return { headers: [], rows: [] };
      
      const rowsData = [];
      ws.eachRow((row) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        rowsData.push(values.map(v => (v != null && typeof v === 'object' && v.result !== undefined ? v.result : (v ?? ''))));
      });
      if (rowsData.length === 0) return { headers: [], rows: [] };
      const headers = rowsData[0].map((h, i) => String(h).trim() || `col_${i + 1}`);
      const rows = rowsData.slice(1).map(r => {
        const rowObj = {};
        headers.forEach((h, i) => {
          rowObj[h] = r[i] !== undefined && r[i] !== null ? String(r[i]).trim() : '';
        });
        return rowObj;
      });
      return { headers, rows };
    } catch (err) {
      console.warn("Excel parsing fallback to text:", err);
    }
  }

  const text = await readFileText(selectedFile);
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = ext === 'tsv' ? '\t' : ',';
  
  const parseLine = (line) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h, i) => h.replace(/^"|"$/g, '').trim() || `col_${i + 1}`);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const parsed = parseLine(lines[i]);
    const rowObj = {};
    let hasAnyData = false;
    headers.forEach((h, idx) => {
      const val = (parsed[idx] || '').replace(/^"|"$/g, '').trim();
      if (val) hasAnyData = true;
      rowObj[h] = val;
    });
    if (hasAnyData) rows.push(rowObj);
  }

  return { headers, rows };
}

function computeValidationResult(rows, headers) {
  const totalRows = rows.length;
  let valid = 0;
  let duplicates = 0;
  let missingValues = 0;
  let invalidDates = 0;
  let rejected = 0;

  const seen = new Set();
  const dateRegex = /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/i;

  rows.forEach((row) => {
    const jsonStr = JSON.stringify(row);
    if (seen.has(jsonStr)) {
      duplicates++;
    } else {
      seen.add(jsonStr);
    }

    let rowHasMissing = false;
    let rowHasInvalidDate = false;
    let emptyCount = 0;

    headers.forEach((h) => {
      const val = row[h];
      if (!val) {
        rowHasMissing = true;
        emptyCount++;
      }
      if (h.toLowerCase().includes('date') && val) {
        if (isNaN(Date.parse(val)) && !dateRegex.test(val)) {
          rowHasInvalidDate = true;
        }
      }
    });

    if (rowHasMissing) missingValues++;
    if (rowHasInvalidDate) invalidDates++;

    if (emptyCount >= Math.max(1, Math.floor(headers.length / 2)) || rowHasInvalidDate) {
      rejected++;
    } else {
      valid++;
    }
  });

  return {
    totalRows,
    valid,
    duplicates,
    missingValues,
    invalidDates,
    unrecognizedCommodities: 0,
    rejected
  };
}

function AdminImport() {
  const [step, setStep] = useState("form");
  const [datasetType, setDatasetType] = useState("");
  const [org, setOrg] = useState("");
  const [period, setPeriod] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState(null);
  const [parsedHeaders, setParsedHeaders] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  const [validationResult, setValidationResult] = useState({
    totalRows: 0,
    valid: 0,
    duplicates: 0,
    missingValues: 0,
    invalidDates: 0,
    unrecognizedCommodities: 0,
    rejected: 0
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [ingestionStatus, setIngestionStatus] = useState("idle"); // "idle" | "processing" | "success" | "failed"
  const [ingestionRecord, setIngestionRecord] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (step !== "done" || ingestionStatus === "success" || ingestionStatus === "failed") return;

    let isMounted = true;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const historyRes = await ingestionApi.getHistory({ page: 1, page_size: 5 });
        const items = historyRes?.items || [];
        const match = items.find(
          (item) => item.original_file_name === fileName || item.status !== "running"
        );
        if (match && isMounted) {
          if (match.status === "success") {
            setIngestionStatus("success");
            setIngestionRecord(match);
            setUploadMessage(`Import completed successfully! ${match.records_imported ?? 0} records processed.`);
            clearInterval(interval);
          } else if (match.status === "failed") {
            setIngestionStatus("failed");
            setIngestionRecord(match);
            setUploadError(match.error_message || "Background ingestion encountered an error.");
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.warn("Polling import history error:", err);
      }
      if (attempts >= 30) clearInterval(interval);
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [step, fileName, ingestionStatus]);

  const handleFileSelect = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setFileName(selected.name);
    setUploadError("");
    setUploadMessage("");
    setIngestionStatus("idle");
    setIngestionRecord(null);
    setParsing(true);
    try {
      const { headers, rows } = await parseFileReal(selected);
      setParsedHeaders(headers);
      setParsedRows(rows);
      setValidationResult(computeValidationResult(rows, headers));
      setStep("preview");
      setCurrentStep(0);
    } catch (err) {
      setUploadError("Failed to parse file: " + (err.message || "Unknown error"));
    } finally {
      setParsing(false);
    }
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
    if (!datasetType) {
      setUploadError("Select a dataset type before importing.");
      return;
    }
    setUploading(true);
    setUploadError("");
    setUploadMessage("");
    setStep("importing");
    setCurrentStep(2);
    try {
      const dataType = DATA_TYPE_MAP[datasetType];
      const res = await ingestionApi.uploadFile(file, dataType, overwrite);
      setUploadMessage(res?.message || "Import accepted and processing in background.");
      setIngestionStatus("processing");
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
    setOverwrite(false);
    setFile(null);
    setParsedHeaders([]);
    setParsedRows([]);
    setValidationResult({
      totalRows: 0,
      valid: 0,
      duplicates: 0,
      missingValues: 0,
      invalidDates: 0,
      unrecognizedCommodities: 0,
      rejected: 0
    });
    setUploadError("");
    setUploadMessage("");
    setIngestionStatus("idle");
    setIngestionRecord(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] bg-white outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition";

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-[900px] mx-auto space-y-5">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--hw-neutral-900)]">Import & Validate</h1>
          <p className="text-[15px] text-[var(--hw-neutral-800)] mt-0.5">
            Upload CSV or Excel files and validate before storing.
          </p>
        </div>

        {/* Processing steps indicator */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-3.5">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-colors ${i < currentStep ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : i === currentStep ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)] bg-white" : "border-[var(--hw-neutral-300)] text-[var(--hw-neutral-400)] bg-white"}`}>
                    {i < currentStep ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-[10px] font-medium ${i <= currentStep ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-400)]"}`}>
                    {s}
                  </span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 rounded ${i < currentStep ? "bg-[var(--hw-green-700)]" : "bg-[var(--hw-neutral-200)]"}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form */}
        {(step === "form" || step === "preview") && (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-4">
            <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Dataset information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="dataset-type-select" className="block text-[13px] font-medium text-[var(--hw-neutral-700)] mb-1.5">Dataset type *</label>
                <select id="dataset-type-select" value={datasetType} onChange={(e) => setDatasetType(e.target.value)} className={inputCls}>
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
              <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="overwrite-checkbox"
                  checked={overwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--hw-neutral-300)] text-[var(--hw-green-700)] focus:ring-[var(--hw-green-600)] cursor-pointer"
                />
                <label htmlFor="overwrite-checkbox" className="text-[13px] font-medium text-[var(--hw-neutral-700)] cursor-pointer">
                  Overwrite existing records (upsert mode)
                </label>
              </div>
            </div>

            {/* File upload area */}
            {!fileName ? (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={parsing}
                className="w-full border-2 border-dashed border-[var(--hw-neutral-300)] rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-[var(--hw-green-400)] hover:bg-[var(--hw-green-50)] transition-colors disabled:opacity-50"
              >
                <div className="p-3 bg-[var(--hw-neutral-100)] rounded-2xl">
                  {parsing ? <Loader2 className="w-7 h-7 text-[var(--hw-green-700)] animate-spin" /> : <Upload className="w-7 h-7 text-[var(--hw-neutral-800)]" />}
                </div>
                <div className="text-center">
                  <p className="text-[15px] font-medium text-[var(--hw-neutral-700)]">
                    {parsing ? "Parsing file content…" : "Drop file here or click to upload"}
                  </p>
                  <p className="text-[13px] text-[var(--hw-neutral-800)] mt-1">CSV or Excel (.xlsx, .ods) · Max 20 MB</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsm,.ods,.tsv,.parquet,.feather" className="hidden" onChange={handleFileSelect} />
              </button>
            ) : (
              <div className="flex items-center gap-3 p-3.5 bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl">
                <FileText className="w-5 h-5 text-[var(--hw-green-700)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--hw-neutral-900)] truncate">{fileName}</p>
                  <p className="text-[12px] text-[var(--hw-neutral-700)]">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : ""} · {parsedRows.length} rows detected
                  </p>
                </div>
                <button onClick={handleReset} className="p-1 text-[var(--hw-neutral-400)] hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {uploadError && (
              <p className="text-[12px] text-red-600 font-medium">{uploadError}</p>
            )}
          </div>
        )}

        {/* Preview */}
        {step === "preview" && fileName && (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
            <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">
              File preview — first {Math.min(5, parsedRows.length)} of {parsedRows.length} rows
            </p>

            {parsedRows.length > 0 && parsedHeaders.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-[var(--hw-neutral-200)] max-h-64">
                <table className="w-full text-[12px]">
                  <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)] sticky top-0">
                    <tr>
                      {parsedHeaders.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                    {parsedRows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="hover:bg-[var(--hw-neutral-50)]">
                        {parsedHeaders.map((h) => (
                          <td key={h} className="px-3 py-2 text-[var(--hw-neutral-800)] whitespace-nowrap">
                            {r[h] !== undefined && r[h] !== "" ? r[h] : <span className="text-gray-400 italic">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[13px] text-gray-500 italic py-2">No rows parsed from file.</p>
            )}

            <button
              onClick={handleValidate}
              className="w-full py-2.5 bg-[var(--hw-green-700)] text-white text-[15px] font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
            >
              Validate Data
            </button>
          </div>
        )}

        {/* Validation results */}
        {(step === "validated" || step === "importing" || step === "done") && (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Validation complete</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Total rows", value: validationResult.totalRows, color: "text-[var(--hw-neutral-900)]" },
                { label: "Valid rows", value: validationResult.valid, color: "text-emerald-700" },
                { label: "Duplicates", value: validationResult.duplicates, color: "text-amber-700" },
                { label: "Missing values", value: validationResult.missingValues, color: "text-amber-700" },
                { label: "Invalid dates", value: validationResult.invalidDates, color: "text-amber-700" },
                { label: "Unrecognized commodities", value: validationResult.unrecognizedCommodities, color: "text-[var(--hw-neutral-800)]" },
                { label: "Rejected rows", value: validationResult.rejected, color: "text-red-600" }
              ].map((r) => (
                <div key={r.label} className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2.5">
                  <p className="text-[12px] text-[var(--hw-neutral-700)]">{r.label}</p>
                  <p className={`text-[17px] font-bold mt-0.5 ${r.color}`}>{r.value}</p>
                </div>
              ))}
            </div>

            {uploadError && (
              <p className="text-[12px] text-red-600 font-medium">{uploadError}</p>
            )}

            {step === "validated" && (
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  onClick={handleImport}
                  disabled={uploading}
                  className="flex-1 min-w-[140px] py-2.5 bg-[var(--hw-green-700)] text-white text-[13px] font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-50"
                >
                  Import Valid Records ({validationResult.valid})
                </button>
                <button onClick={handleReset} className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Replace File
                </button>
              </div>
            )}

            {step === "importing" && (
              <div className="flex items-center gap-3 py-2">
                <RefreshCw className="w-4 h-4 text-[var(--hw-green-700)] animate-spin flex-shrink-0" />
                <p className="text-[13px] text-[var(--hw-neutral-800)]">Uploading file to HarvestWise backend API…</p>
              </div>
            )}

            {step === "done" && (
              <div className="space-y-4">
                {ingestionStatus === "processing" && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-bold text-blue-950">Background Task In Progress</p>
                      <p className="text-[13px] text-blue-800 mt-0.5">{uploadMessage || "Import accepted and processing in the background."}</p>
                      <p className="text-[12px] text-blue-600 mt-1">Polling background worker status…</p>
                    </div>
                  </div>
                )}
                {ingestionStatus === "success" && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-bold text-emerald-950">Import Completed Successfully</p>
                      <p className="text-[13px] text-emerald-800 mt-0.5">{uploadMessage}</p>
                      {fileName && <p className="text-[12px] text-emerald-700 mt-1">File: <span className="font-mono">{fileName}</span></p>}
                    </div>
                  </div>
                )}
                {ingestionStatus === "failed" && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-bold text-red-950">Background Import Failed</p>
                      <p className="text-[13px] text-red-800 mt-0.5">{uploadError || "The background ingestion task failed."}</p>
                      {fileName && <p className="text-[12px] text-red-700 mt-1">File: <span className="font-mono">{fileName}</span></p>}
                    </div>
                  </div>
                )}
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import another file
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { AdminImport as default };
