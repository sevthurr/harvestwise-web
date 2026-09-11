import { useQueryClient } from "@tanstack/react-query";
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Upload,
  Check,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  Loader2,
  Sparkles
} from "lucide-react";
import { ingestionApi } from "../../../services/api";
import { useBackgroundProcess } from "../../global/contexts/BackgroundProcessContext";


const DATA_TYPE_MAP = {
  "DFTC Wholesale Prices": "dftc_daily_wholesale",
  "DFTC Retail Prices": "dftc_daily_retail",
  "Bangkerohan Retail Prices": "bankerohan_daily_retail",
  "Bangkerohan Wholesale Prices": "bankerohan_daily_wholesale",
  "DFTC Arrival Volume": "arrival",
  "PSA Historical Production": "production",
  "Weather Data": "weather",
  "Price Consolidated Wholesale": "price_consolidated_wholesale",
  "Price Consolidated Retail": "price_consolidated_retail",
  "Price Consolidated Landing": "price_consolidated_landing"
};

const DATASET_TYPES = Object.keys(DATA_TYPE_MAP);
const SOURCES = [
  "Davao Food Terminal Complex (DFTC)",
  "PSA OpenStat",
  "OpenMeteo"
];
const STEP_CONFIG = [
  { active: "Upload", done: "Uploaded" },
  { active: "Validate", done: "Validated" },
  { active: "Standardize", done: "Standardized" },
  { active: "Store", done: "Stored" },
];
const STEPS = STEP_CONFIG.map((s) => s.done);

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

      const allSheets = wb.worksheets || [];
      const validWorksheets = allSheets.filter(w => !/\(2\)|\boverflow\b/i.test(w.name));
      if (validWorksheets.length === 0 && allSheets.length > 0) {
        validWorksheets.push(allSheets[0]);
      }
      if (validWorksheets.length === 0) return { headers: [], rows: [], rawRows: [], sheetNames: [], sheetsData: {}, totalRowCount: 0 };

      const formatCellValue = (v) => {
        if (v == null) return '';
        if (typeof v === 'object') {
          if (v.text !== undefined) return v.text;
          if (Array.isArray(v.richText)) {
            return v.richText.map(t => t.text || '').join('');
          }
          if (v.result !== undefined) return String(v.result);
        }
        return v;
      };

      const sheetNames = validWorksheets.map(w => w.name);
      const sheetsData = {};

      validWorksheets.forEach(ws => {
        const rowsData = [];
        ws.eachRow({ includeEmpty: true }, (row) => {
          const maxCols = Math.max(row.values?.length || 0, ws.columnCount || 0, 35);
          const vals = [];
          for (let c = 1; c <= maxCols; c++) {
            const cell = row.getCell(c);
            vals.push(formatCellValue(cell.value));
          }
          rowsData.push(vals);
        });
        sheetsData[ws.name] = rowsData;
      });

      const extractPreviewForRows = (rowsData) => {
        if (!rowsData || rowsData.length === 0) return { headers: [], rows: [] };

        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(15, rowsData.length); i++) {
          const rVals = rowsData[i].map(v => String(v ?? '').trim().toUpperCase());
          if (rVals.some(v => v === "COMMODITY" || v.startsWith("COMMODIT"))) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx !== -1) {
          const rawHdr = rowsData[headerRowIdx];
          const nextRow = rowsData[headerRowIdx + 1];
          let hasDayRow = false;
          if (nextRow && nextRow.some(v => { const n = parseInt(v, 10); return !isNaN(n) && n >= 1 && n <= 31; })) {
            hasDayRow = true;
          }
          const dataStartIdx = hasDayRow ? headerRowIdx + 2 : headerRowIdx + 1;
          const maxCols = Math.max(rawHdr?.length || 0, nextRow?.length || 0);

          const headers = [];
          for (let i = 0; i < maxCols; i++) {
            const hVal = rawHdr ? rawHdr[i] : undefined;
            const hStr = hVal != null ? String(hVal).trim() : '';
            const dayVal = (hasDayRow && nextRow && nextRow[i] != null) ? String(nextRow[i]).trim() : '';
            const n = parseInt(dayVal, 10);
            if (hasDayRow && !isNaN(n) && n >= 1 && n <= 31) {
              headers.push(`Day ${n}`);
            } else if (hStr) {
              headers.push(hStr);
            } else {
              headers.push(`col_${i + 1}`);
            }
          }

          const dataRows = rowsData.slice(dataStartIdx).filter(r => {
            const rowStr = r.map(v => String(v ?? '').trim().toLowerCase()).join(" ");
            if (rowStr.startsWith("prepared") || rowStr.startsWith("checked") || rowStr.startsWith("approved")) return false;
            // Ensure commodity column (index 1) is present
            const comm = String(r[1] ?? '').trim();
            return comm.length > 0;
          });

          // Trim trailing empty generated column headers
          let lastNonEmptyCol = -1;
          for (let i = headers.length - 1; i >= 0; i--) {
            const h = headers[i];
            const hasData = dataRows.some(r => r[i] !== undefined && r[i] !== null && String(r[i]).trim() !== '');
            if (hasData || (h && !h.startsWith('col_'))) {
              lastNonEmptyCol = i;
              break;
            }
          }
          const activeHeaders = headers.slice(0, lastNonEmptyCol + 1);

          const rows = dataRows.map(r => {
            const rowObj = {};
            activeHeaders.forEach((h, i) => {
              rowObj[h] = r[i] !== undefined && r[i] !== null ? String(r[i]).trim() : '';
            });
            return rowObj;
          });

          return { headers: activeHeaders, rows };
        }

        const headers = (rowsData[0] || []).map((h, i) => String(h).trim() || `col_${i + 1}`);
        const rows = rowsData.slice(1).map(r => {
          const rowObj = {};
          headers.forEach((h, i) => {
            rowObj[h] = r[i] !== undefined && r[i] !== null ? String(r[i]).trim() : '';
          });
          return rowObj;
        });
        return { headers, rows };
      };

      let totalRowCount = 0;
      validWorksheets.forEach(ws => {
        const preview = extractPreviewForRows(sheetsData[ws.name]);
        totalRowCount += preview.rows.length;
      });

      const primarySheetName = validWorksheets[0].name;
      const { headers, rows } = extractPreviewForRows(sheetsData[primarySheetName]);

      return {
        headers,
        rows,
        rawRows: sheetsData[primarySheetName] || [],
        sheetNames,
        sheetsData,
        totalRowCount,
        extractPreviewForRows,
      };
    } catch (err) {
      console.warn("Excel parsing fallback to text:", err);
    }
  }

  const text = await readFileText(selectedFile);
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [], rawRows: [], sheetNames: [], sheetsData: {}, totalRowCount: 0 };

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
  const rawRows = lines.slice(0, 30).map(l => parseLine(l));
  
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

  return { headers, rows, rawRows, sheetNames: [], sheetsData: {}, totalRowCount: rows.length };
}

function detectDatasetInfo({ fileName = "", sheetNames = [], rawRows = [], headers = [], rows = [] }) {
  const fn = fileName.toLowerCase();
  const sheets = sheetNames.map(s => String(s || '').trim().toLowerCase());
  
  const topRawRows = rawRows.slice(0, 25);
  const rawLines = topRawRows.map(r => Array.isArray(r) ? r.map(v => String(v ?? '').trim()).filter(Boolean).join(" ") : "");
  const allText = (fn + " " + sheets.join(" ") + " " + rawLines.join(" ") + " " + headers.join(" ")).toLowerCase();

  let detectedDatasetType = "";
  let detectedSource = "";
  let detectedPeriod = "";

  // 1. DATASET TYPE DETECTION
  const isWeather = 
    (topRawRows.length > 3 && Array.isArray(topRawRows[3]) && String(topRawRows[3][0] ?? '').trim().toLowerCase() === "time") ||
    headers.some(h => ["weather_date", "temp_max_c", "precip_mm", "temp_min_c"].includes(h.toLowerCase())) ||
    fn.includes("weather") || fn.includes("openmeteo") || fn.includes("open-meteo") || fn.includes("buda");

  const quarterKeywords = ["quarter1", "quarter2", "quarter3", "quarter4", "annual"];
  const row3Text = topRawRows.length > 3 && Array.isArray(topRawRows[3]) ? topRawRows[3].map(v => String(v ?? '').toLowerCase().trim()) : [];
  const hasQuarterRow = row3Text.some(t => quarterKeywords.includes(t));
  const isProduction = 
    hasQuarterRow ||
    (allText.includes("crop") && (allText.includes("volume_mt") || allText.includes("production volume") || (allText.includes("province") && allText.includes("quarter")))) ||
    (fn.includes("production") || fn.includes("openstat") || (fn.includes("psa") && !fn.includes("price")));

  const hasOverallTotalSheet = sheets.some(s => s === "overall total" || s.includes("overall total"));
  const hasArrivalKeywords = 
    allText.includes("arrival_date") || 
    allText.includes("farm_source_vol") || 
    allText.includes("farm_volume") || 
    allText.includes("total_volume") ||
    allText.includes("arrival volume") ||
    (allText.includes("commodity") && (allText.includes("volume_kg") || allText.includes("volume_mt")));
  const isArrival = 
    hasOverallTotalSheet || 
    hasArrivalKeywords || 
    ((fn.includes("dftc") || fn.includes("taboan") || fn.includes("food terminal")) && (fn.includes("vol") || fn.includes("arrival")));

  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  let hasConsolidatedRow = false;
  for (const r of topRawRows) {
    if (Array.isArray(r)) {
      const rowTokens = r.map(v => String(v ?? '').toLowerCase().trim());
      const mCount = rowTokens.filter(t => months.includes(t)).length;
      if (mCount >= 6) {
        hasConsolidatedRow = true;
        break;
      }
    }
  }
  const isConsolidated = hasConsolidatedRow || fn.includes("consolidated");

  if (isWeather) {
    detectedDatasetType = "Weather Data";
    detectedSource = "OpenMeteo";
  } else if (isProduction) {
    detectedDatasetType = "PSA Historical Production";
    detectedSource = "PSA OpenStat";
  } else if (isArrival) {
    detectedDatasetType = "DFTC Arrival Volume";
    detectedSource = "Davao Food Terminal Complex (DFTC)";
  } else if (isConsolidated) {
    detectedSource = "Davao Food Terminal Complex (DFTC)";
    if (fn.includes("retail") || allText.includes("retail")) {
      detectedDatasetType = "Price Consolidated Retail";
    } else if (fn.includes("landing") || allText.includes("landing")) {
      detectedDatasetType = "Price Consolidated Landing";
    } else {
      detectedDatasetType = "Price Consolidated Wholesale";
    }
  } else {
    // Daily Price monitoring (Bankerohan or DFTC)
    // Filename metadata has strict precedence over internal text to prevent stale template headers from misclassifying files
    let isWholesale = fn.includes("wholesale") || fn.includes("whls");
    let isRetail = fn.includes("retail") || fn.includes("ret");
    let isLanding = fn.includes("landing") || fn.includes("land");

    if (!isWholesale && !isRetail && !isLanding) {
      isWholesale = allText.includes("wholesale") || allText.includes("prevailing wholesale");
      isRetail = allText.includes("retail") || allText.includes("prevailing retail");
      isLanding = allText.includes("landing");
    }

    let isDftc = fn.includes("dftc") || fn.includes("taboan") || fn.includes("food terminal");
    let isBankerohan = fn.includes("bankerohan") || fn.includes("bangkerohan") || fn.includes("bkr");

    if (!isDftc && !isBankerohan) {
      isDftc = allText.includes("dftc") || allText.includes("taboan") || allText.includes("davao food terminal");
      isBankerohan = allText.includes("bankerohan") || allText.includes("bangkerohan");
    }

    if (isDftc) {
      detectedSource = "Davao Food Terminal Complex (DFTC)";
      if (isWholesale) detectedDatasetType = "DFTC Wholesale Prices";
      else if (isLanding) detectedDatasetType = "Price Consolidated Landing";
      else detectedDatasetType = "DFTC Retail Prices";
    } else if (isBankerohan) {
      detectedSource = "Davao Food Terminal Complex (DFTC)";
      if (isWholesale) detectedDatasetType = "Bangkerohan Wholesale Prices";
      else if (isLanding) detectedDatasetType = "Price Consolidated Landing";
      else detectedDatasetType = "Bangkerohan Retail Prices";
    } else if (isRetail || isWholesale) {
      detectedSource = "Davao Food Terminal Complex (DFTC)";
      detectedDatasetType = isWholesale ? "Bangkerohan Wholesale Prices" : "Bangkerohan Retail Prices";
    }
  }

  if (detectedDatasetType && !detectedSource) {
    if (detectedDatasetType.includes("PSA")) {
      detectedSource = "PSA OpenStat";
    } else if (detectedDatasetType.includes("Weather")) {
      detectedSource = "OpenMeteo";
    } else {
      detectedSource = "Davao Food Terminal Complex (DFTC)";
    }
  }

  // 2. REPORTING PERIOD DETECTION
  // Check for multi-month workbook sheets (e.g. JANUARY, FEBRUARY, ... DECEMBER)
  const MONTH_NAMES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];
  const MONTH_DISPLAY = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const recognizedMonthIndices = [];
  for (const s of sheetNames) {
    const sClean = String(s || '').trim().toLowerCase().replace(/\s*\(\d+\)$/, '');
    const idx = MONTH_NAMES.indexOf(sClean);
    if (idx !== -1 && !recognizedMonthIndices.includes(idx)) {
      recognizedMonthIndices.push(idx);
    }
  }
  recognizedMonthIndices.sort((a, b) => a - b);

  const yrMatch = (fn + " " + rawLines.slice(0, 5).join(" ")).match(/\b(20\d\d)\b/);
  const yearStr = yrMatch ? yrMatch[1] : "";

  if (recognizedMonthIndices.length > 1) {
    const minM = recognizedMonthIndices[0];
    const maxM = recognizedMonthIndices[recognizedMonthIndices.length - 1];
    if (minM === 0 && maxM === 11) {
      // Complete calendar year
      detectedPeriod = yearStr ? `January – December ${yearStr}` : "January – December";
    } else {
      detectedPeriod = `${MONTH_DISPLAY[minM]} – ${MONTH_DISPLAY[maxM]}${yearStr ? ` ${yearStr}` : ''}`;
    }
  } else if (recognizedMonthIndices.length === 1 && !topRawRows.some(r => r && r.some(c => /^Period\s*[:\-–]/i.test(String(c ?? ''))))) {
    const m = recognizedMonthIndices[0];
    detectedPeriod = `${MONTH_DISPLAY[m]}${yearStr ? ` ${yearStr}` : ''}`;
  }

  // A. Check cells directly for "Period: ..." if not resolved from sheet structure
  if (!detectedPeriod) {
    for (const r of topRawRows) {
      if (!Array.isArray(r)) continue;
      for (let c = 0; c < r.length; c++) {
        const cellStr = String(r[c] ?? '').trim();
        if (/^Period\s*[:\-–]/i.test(cellStr)) {
          let val = cellStr.replace(/^Period\s*[:\-–]\s*/i, '').trim();
          if (c + 1 < r.length && /^\s*20\d\d\s*$/.test(String(r[c + 1] ?? ''))) {
            val = `${val}, ${String(r[c + 1]).trim()}`;
          }
          if (val) {
            detectedPeriod = val;
            break;
          }
        }
      }
      if (detectedPeriod) break;
    }
  }

  // B. Search raw lines for "Period: ..." or "Covered Period: ..."
  if (!detectedPeriod) {
    for (const line of rawLines) {
      const periodMatch = line.match(/(?:Covered\s+Period|Reporting\s+Period|Period)\s*[:\-–]\s*([^,;|\r\n]+(?:,\s*\d{4})?)/i);
      if (periodMatch && periodMatch[1]) {
        const val = periodMatch[1].trim().replace(/^["']|["']$/g, '');
        if (val.length > 2 && !val.toLowerCase().includes("market") && !val.toLowerCase().includes("division")) {
          detectedPeriod = val;
          break;
        }
      }
    }
  }

  // B. Look for "As of <Date>" e.g. "As of June 23, 2026"
  if (!detectedPeriod) {
    for (const line of rawLines) {
      const asOfMatch = line.match(/As\s+of\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
      if (asOfMatch && asOfMatch[1]) {
        detectedPeriod = asOfMatch[1].trim();
        break;
      }
    }
  }

  // C. Year range pattern in raw text or filename (e.g. 2016-2025, 2020-2024)
  if (!detectedPeriod) {
    const yearRangeMatch = (fn + " " + rawLines.slice(0, 10).join(" ")).match(/\b(20\d\d\s*[-–—]\s*20\d\d)\b/);
    if (yearRangeMatch && yearRangeMatch[1]) {
      detectedPeriod = yearRangeMatch[1].replace(/\s+/g, ' ').trim();
    }
  }

  // D. Quarter and year pattern (e.g. Q1 2026, 2025 Q3)
  if (!detectedPeriod) {
    const qMatch = (fn + " " + rawLines.slice(0, 10).join(" ")).match(/\b(Q[1-4]\s*[-–—/ ]?\s*20\d\d|20\d\d\s*[-–—/ ]?\s*Q[1-4])\b/i);
    if (qMatch && qMatch[1]) {
      detectedPeriod = qMatch[1].toUpperCase().trim();
    }
  }

  // E. Month and year in sheet name or filename (e.g. "Retail-Jan-2025.xlsx", sheet "January 2025")
  if (!detectedPeriod) {
    const monthYearRegex = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[-_ ]*(20\d\d)\b/i;
    for (const s of sheetNames) {
      const sm = s.match(monthYearRegex);
      if (sm) {
        detectedPeriod = `${sm[1]} ${sm[2]}`;
        break;
      }
    }
    if (!detectedPeriod) {
      const fnm = fn.match(monthYearRegex);
      if (fnm) {
        const monthCap = fnm[1].charAt(0).toUpperCase() + fnm[1].slice(1);
        detectedPeriod = `${monthCap} ${fnm[2]}`;
      }
    }
  }

  // F. Year in filename if present (e.g. "Bankerohan-Retail-2025.xlsx" -> "2025")
  if (!detectedPeriod) {
    const yrMatch = fn.match(/\b(20\d\d)\b/);
    if (yrMatch && yrMatch[1]) {
      detectedPeriod = yrMatch[1];
    }
  }

  // G. Check date rows if available
  if (!detectedPeriod && rows.length > 0) {
    const dateHeaders = headers.filter(h => h.toLowerCase().includes("date") || h.toLowerCase() === "time");
    const dates = [];
    for (const r of rows) {
      for (const dh of dateHeaders) {
        const val = r[dh];
        if (val && !isNaN(Date.parse(val))) {
          dates.push(new Date(val));
          break;
        }
      }
      if (dates.length >= 100) break;
    }
    if (dates.length > 0) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      const minD = dates[0];
      const maxD = dates[dates.length - 1];
      const opt = { year: 'numeric', month: 'short', day: 'numeric' };
      if (minD.getTime() === maxD.getTime()) {
        detectedPeriod = minD.toLocaleDateString('en-US', opt);
      } else {
        detectedPeriod = `${minD.toLocaleDateString('en-US', opt)} - ${maxD.toLocaleDateString('en-US', opt)}`;
      }
    }
  }

  if (detectedPeriod) {
    detectedPeriod = detectedPeriod.replace(/([A-Za-z0-9])\s+(20\d\d)$/, '$1, $2');
  }

  return {
    datasetType: detectedDatasetType,
    source: detectedSource,
    period: detectedPeriod
  };
}

const ISSUE_CODE_LABELS = {
  duplicate: "Duplicate",
  missing_required: "Missing Data",
  invalid_date: "Invalid Date",
  new_commodity: "New Commodity",
  invalid_price: "Invalid Price",
  price_out_of_range: "Price Out of Range",
  invalid_price_range: "Invalid Price Range",
  historical_cutoff: "Invalid Date",
  invalid_volume: "Invalid Volume",
  volume_out_of_range: "Volume Out of Range",
  invalid_quarter: "Invalid Format",
  unexpected_year: "Invalid Year",
  invalid_temp_range: "Invalid Temperature",
  precip_out_of_range: "Precipitation Out of Range",
  humidity_out_of_range: "Humidity Out of Range",
};

function AdminImport() {
  const queryClient = useQueryClient();
  let navigate;
  try {
    navigate = useNavigate();
  } catch {
    navigate = (path) => {
      if (typeof window !== "undefined") window.location.href = path;
    };
  }
  const [step, setStep] = useState("form");
  const [completedImportId, setCompletedImportId] = useState(null);
  const [completedSummary, setCompletedSummary] = useState(null);

  const [datasetType, setDatasetType] = useState("");
  const [source, setSource] = useState("");
  const [period, setPeriod] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState(null);
  const [parsedHeaders, setParsedHeaders] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  const [fileSheets, setFileSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState("");
  const [totalDetectedRows, setTotalDetectedRows] = useState(0);
  const sheetsDataRef = useRef({});
  const extractPreviewFnRef = useRef(null);
  const [validationResult, setValidationResult] = useState({
    totalRows: 0,
    valid: 0,
    duplicates: 0,
    missingValues: 0,
    unrecognizedCommodities: 0,
    rejected: 0
  });
  const [validationRows, setValidationRows] = useState([]);
  const [validating, setValidating] = useState(false);
  const [tableFilter, setTableFilter] = useState("all");
  const [currentStep, setCurrentStep] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [ingestionStatus, setIngestionStatus] = useState("idle"); // "idle" | "processing" | "success" | "failed"
  const [ingestionRecord, setIngestionRecord] = useState(null);
  const fileRef = useRef(null);

  const runValidation = async (targetFile, dt, isOverwrite) => {
    const f = targetFile || file;
    const targetDt = dt || datasetType;
    if (!f) return;
    if (!targetDt) {
      setUploadError("Select a dataset type before validating.");
      return;
    }
    const mappedType = DATA_TYPE_MAP[targetDt] || targetDt;
    setValidating(true);
    setUploadError("");
    try {
      const res = await ingestionApi.validateFile(f, mappedType, isOverwrite);
      const summary = res?.summary || {};
      setValidationResult({
        totalRows: summary.total_rows ?? 0,
        valid: summary.valid_rows ?? 0,
        duplicates: summary.duplicate_rows ?? 0,
        missingValues: summary.missing_value_rows ?? 0,
        unrecognizedCommodities: summary.unrecognized_commodity_rows ?? 0,
        rejected: summary.rejected_rows ?? 0,
      });
      setValidationRows(res?.rows || []);
      setStep("validated");
      setCurrentStep(1);
    } catch (err) {
      console.error("Validation error:", err);
      setUploadError("We couldn't validate this file. Please try again.");
    } finally {
      setValidating(false);
    }
  };

  const handleFileSelect = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setFileName(selected.name);
    setUploadError("");
    setUploadMessage("");
    setIngestionStatus("idle");
    setIngestionRecord(null);
    setValidationRows([]);
    setValidationResult({
      totalRows: 0,
      valid: 0,
      duplicates: 0,
      missingValues: 0,
      unrecognizedCommodities: 0,
      rejected: 0,
    });
    setParsing(true);
    try {
      const { headers, rows, rawRows, sheetNames, sheetsData, totalRowCount, extractPreviewForRows } = await parseFileReal(selected);
      setParsedHeaders(headers);
      setParsedRows(rows);
      setFileSheets(sheetNames || []);
      setActiveSheet(sheetNames?.[0] || "");
      setTotalDetectedRows(totalRowCount || rows.length);
      sheetsDataRef.current = sheetsData || {};
      extractPreviewFnRef.current = extractPreviewForRows || null;

      // Auto-detect dataset information from file content and metadata
      const detected = detectDatasetInfo({
        fileName: selected.name,
        sheetNames: sheetNames || [],
        rawRows: rawRows || [],
        headers: headers || [],
        rows: rows || []
      });

      let detectedAny = false;
      if (detected.datasetType) {
        setDatasetType(detected.datasetType);
        detectedAny = true;
      }
      if (detected.source) {
        setSource(detected.source);
        detectedAny = true;
      }
      if (detected.period) {
        setPeriod(detected.period);
        detectedAny = true;
      }
      setAutoDetected(detectedAny);

      setStep("preview");
      setCurrentStep(0);
    } catch (err) {
      setUploadError("Failed to parse file: " + (err.message || "Unknown error"));
    } finally {
      setParsing(false);
    }
  };

  const handleSheetChange = (sheetName) => {
    setActiveSheet(sheetName);
    if (sheetsDataRef.current?.[sheetName] && extractPreviewFnRef.current) {
      const { headers: h, rows: r } = extractPreviewFnRef.current(sheetsDataRef.current[sheetName]);
      setParsedHeaders(h);
      setParsedRows(r);
    }
  };

  const handleValidate = () => {
    runValidation(file, datasetType, overwrite);
  };

  const { startProcess, updateProgress, finishProcess } = useBackgroundProcess();

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
      const importId = res?.import_id || res?.importId || res?.data?.import_id;
      if (importId) setCompletedImportId(importId);

      setUploadMessage(res?.message || "Import accepted and processing in background.");
      setIngestionStatus("processing");
      setStep("importing");
      setCurrentStep(2);

      startProcess({
        title: `Importing ${datasetType}`,
        statusText: "Uploading file...",
        initialProgress: 10,
        importId,
      });
      updateProgress(15, "File uploaded, processing in background...");

      if (importId) {
        let isFinished = false;
        let attempts = 0;
        while (!isFinished && attempts < 60) {
          attempts++;
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const statusRes = await ingestionApi.getHistoryDetail(importId);
            if (statusRes?.status === "completed" || statusRes?.status === "success") {
              isFinished = true;
              setIngestionStatus("success");
              setCompletedImportId(importId);
              setCompletedSummary({
                fileName: fileName || file?.name || "Uploaded File",
                importId: importId || "—",
                datasetType: datasetType || "—",
                source: source || (DATA_TYPE_MAP[datasetType]?.includes("dftc") ? "Davao Food Terminal Complex (DFTC)" : "Bangkerohan Public Market"),
                period: period || "—",
                recordsImported: statusRes.records_imported ?? validationResult.valid,
                totalRows: validationResult.totalRows,
                validRows: validationResult.valid,
                rejectedRows: validationResult.rejected,
                fileFormat: file?.name ? ("." + file.name.split(".").pop().toLowerCase()) : ".xlsx",
                finishedAt: new Date().toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
              });
              setUploadMessage(`Import completed successfully! Stored ${statusRes.records_imported || 0} records.`);
              finishProcess(`Stored ${statusRes.records_imported || 0} records`);
              setStep("stored");
              setCurrentStep(4);
              queryClient.invalidateQueries();
              queryClient.refetchQueries();
            } else if (statusRes?.status === "failed") {
              isFinished = true;
              setIngestionStatus("failed");
              setUploadError(statusRes.error_message || "Background ingestion task failed.");
              finishProcess(statusRes.error_message || "Import failed", true);
              setStep("validated");
              setCurrentStep(1);
              queryClient.invalidateQueries();
              queryClient.refetchQueries();
            } else {
              const pct = Math.min(90, 20 + attempts * 3);
              updateProgress(pct, `Processing records... (${attempts * 2}s)`);
            }
          } catch (statusErr) {
            console.warn("Status poll error:", statusErr);
          }
        }
        if (!isFinished) {
          finishProcess("Import timed out", true);
        }
      }
    } catch (err) {
      setUploadError(err.message || "Upload failed.");
      setStep("validated");
      setCurrentStep(1);
      finishProcess("Upload failed", true);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setStep("form");
    setFileName("");
    setCurrentStep(0);
    setDatasetType("");
    setPeriod("");
    setAutoDetected(false);
    setOverwrite(false);
    setFile(null);
    setParsedHeaders([]);
    setParsedRows([]);
    setFileSheets([]);
    setActiveSheet("");
    setTotalDetectedRows(0);
    sheetsDataRef.current = {};
    extractPreviewFnRef.current = null;
    setValidationRows([]);
    setValidationResult({
      totalRows: 0,
      valid: 0,
      duplicates: 0,
      missingValues: 0,
      unrecognizedCommodities: 0,
      rejected: 0
    });
    setUploadError("");
    setUploadMessage("");
    setIngestionStatus("idle");
    setIngestionRecord(null);
    setCompletedImportId(null);
    setCompletedSummary(null);
    setStep("form");
    setCurrentStep(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const displayedIssueRows = validationRows.filter((r) => r.issues && r.issues.length > 0);

  const filteredTableRows = displayedIssueRows.filter((r) => {
    if (tableFilter === "all") return true;
    if (tableFilter === "rejected") return r.result === "rejected";
    if (tableFilter === "warning") return r.result === "valid_with_warning";
    if (tableFilter === "duplicate") return r.issues?.some((i) => i.code === "duplicate");
    if (tableFilter === "missing") return r.issues?.some((i) => i.code === "missing_required");
    if (tableFilter === "new_commodity") return r.issues?.some((i) => i.code === "new_commodity");
    return true;
  });

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
            {STEP_CONFIG.map((stepCfg, i) => {
              const isDone = i < currentStep;
              const stepLabel = isDone ? stepCfg.done : stepCfg.active;
              return (
                <React.Fragment key={stepCfg.active}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-colors ${isDone ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : i === currentStep ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)] bg-white" : "border-[var(--hw-neutral-300)] text-[var(--hw-neutral-400)] bg-white"}`}>
                      {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span className={`text-[10px] font-medium ${i <= currentStep ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-400)]"}`}>
                      {stepLabel}
                    </span>
                  </div>
                  {i < STEP_CONFIG.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 transition-colors ${isDone ? "bg-[var(--hw-green-700)]" : "bg-[var(--hw-neutral-200)]"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form */}
        {(step === "form" || step === "preview") && (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-4">
            {/* File upload area */}
            {!fileName ? (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={parsing}
                className="w-full border-2 border-dashed border-[var(--hw-neutral-300)] rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-[var(--hw-green-400)] hover:bg-[var(--hw-green-50)] transition-colors disabled:opacity-50 cursor-pointer"
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
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : ""} · {fileSheets.length > 1 ? `${fileSheets.length} sheets · ` : ""}{totalDetectedRows || parsedRows.length} rows detected
                  </p>
                </div>
                <button onClick={handleReset} className="p-1 text-[var(--hw-neutral-400)] hover:text-red-500 transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {uploadError && (
              <p className="text-[12px] text-red-600 font-medium">{uploadError}</p>
            )}

            <div className="pt-2 border-t border-[var(--hw-neutral-200)] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Dataset information</h2>
                {autoDetected && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Auto-filled from file
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dataset-type-select" className="block text-[13px] font-medium text-[var(--hw-neutral-700)] mb-1.5">Dataset type *</label>
                  <select
                    id="dataset-type-select"
                    value={datasetType}
                    onChange={(e) => {
                      setDatasetType(e.target.value);
                      if (step === "validated") {
                        setStep("preview");
                        setCurrentStep(0);
                        setValidationRows([]);
                      }
                    }}
                    className={inputCls}
                  >
                    <option value="">Select dataset type…</option>
                    {DATASET_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="source-select" className="block text-[13px] font-medium text-[var(--hw-neutral-700)] mb-1.5">Source</label>
                  <select id="source-select" value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
                    <option value="">Select source…</option>
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
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
                    onChange={(e) => {
                      const newVal = e.target.checked;
                      setOverwrite(newVal);
                      if (step === "validated" && file) {
                        runValidation(file, datasetType, newVal);
                      }
                    }}
                    className="w-4 h-4 rounded border-[var(--hw-neutral-300)] text-[var(--hw-green-700)] focus:ring-[var(--hw-green-600)] cursor-pointer"
                  />
                  <label htmlFor="overwrite-checkbox" className="text-[13px] font-medium text-[var(--hw-neutral-700)] cursor-pointer">
                    Overwrite existing records (upsert mode)
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        {step === "preview" && fileName && (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">
                {fileSheets.length > 1
                  ? `File preview — sheet "${activeSheet}" (first ${Math.min(5, parsedRows.length)} of ${parsedRows.length} rows)`
                  : `File preview — first ${Math.min(5, parsedRows.length)} of ${parsedRows.length} rows`}
              </p>
              {fileSheets.length > 1 && (
                <div className="flex items-center gap-1.5 text-[12px]">
                  <label htmlFor="sheet-select" className="text-[var(--hw-neutral-600)] font-medium">Sheet:</label>
                  <select
                    id="sheet-select"
                    value={activeSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="px-2.5 py-1 border border-[var(--hw-neutral-300)] rounded-lg text-[12px] bg-white text-[var(--hw-neutral-800)] focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-600)] font-medium cursor-pointer shadow-sm"
                  >
                    {fileSheets.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

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
              disabled={validating}
              className="w-full py-2.5 bg-[var(--hw-green-700)] text-white text-[15px] font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {validating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating Data with Backend…
                </>
              ) : (
                "Validate Data"
              )}
            </button>
          </div>
        )}

        {/* Validation results & importing progress */}
        {(step === "validated" || step === "importing" || (step === "done" && ingestionStatus !== "success")) && (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Validation complete</p>
            </div>

            {/* 6 KPI Cards (3 on Row 1, 3 on Row 2) */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="bg-[var(--hw-neutral-50)] rounded-xl px-4 py-3">
                  <p className="text-[12px] font-medium text-[var(--hw-neutral-700)]">Total Rows</p>
                  <p className="text-[18px] font-bold text-[var(--hw-neutral-900)] mt-0.5">{validationResult.totalRows}</p>
                </div>
                <div className="bg-[var(--hw-neutral-50)] rounded-xl px-4 py-3">
                  <p className="text-[12px] font-medium text-[var(--hw-neutral-700)]">Valid Rows</p>
                  <p className="text-[18px] font-bold text-emerald-700 mt-0.5">{validationResult.valid}</p>
                </div>
                <div className="bg-[var(--hw-neutral-50)] rounded-xl px-4 py-3">
                  <p className="text-[12px] font-medium text-[var(--hw-neutral-700)]">Rejected Rows</p>
                  <p className="text-[18px] font-bold text-red-600 mt-0.5">{validationResult.rejected}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="bg-[var(--hw-neutral-50)] rounded-xl px-4 py-3">
                  <p className="text-[12px] font-medium text-[var(--hw-neutral-700)]">Duplicates</p>
                  <p className="text-[18px] font-bold text-amber-700 mt-0.5">{validationResult.duplicates}</p>
                </div>
                <div className="bg-[var(--hw-neutral-50)] rounded-xl px-4 py-3">
                  <p className="text-[12px] font-medium text-[var(--hw-neutral-700)]">Missing Values</p>
                  <p className="text-[18px] font-bold text-amber-700 mt-0.5">{validationResult.missingValues}</p>
                </div>
                <div className="bg-[var(--hw-neutral-50)] rounded-xl px-4 py-3">
                  <p className="text-[12px] font-medium text-[var(--hw-neutral-700)]">Unrecognized Commodities</p>
                  <p className="text-[18px] font-bold text-[var(--hw-neutral-800)] mt-0.5">{validationResult.unrecognizedCommodities}</p>
                </div>
              </div>
            </div>

            {/* Validation Details Table Section */}
            <div className="pt-2 border-t border-[var(--hw-neutral-200)] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Validation Details</p>
                {validationRows.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[12px]">
                    <span className="text-[var(--hw-neutral-600)]">Filter:</span>
                    <select
                      value={tableFilter}
                      onChange={(e) => setTableFilter(e.target.value)}
                      className="px-2 py-1 border border-[var(--hw-neutral-300)] rounded-lg text-[12px] bg-white text-[var(--hw-neutral-800)] focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-600)]"
                    >
                      <option value="all">All Issues ({displayedIssueRows.length})</option>
                      <option value="rejected">Rejected Only</option>
                      <option value="warning">Warnings Only</option>
                      <option value="duplicate">Duplicates</option>
                      <option value="missing">Missing Values</option>
                      <option value="new_commodity">New Commodities</option>
                    </select>
                  </div>
                )}
              </div>

              {filteredTableRows.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-[var(--hw-neutral-200)] max-h-80">
                  <table className="w-full text-[12px] text-left border-collapse">
                    <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)] sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-[var(--hw-neutral-800)] w-28">Source</th>
                        <th className="px-3 py-2 font-semibold text-[var(--hw-neutral-800)]">Commodity / Record</th>
                        <th className="px-3 py-2 font-semibold text-[var(--hw-neutral-800)] w-36">Result</th>
                        <th className="px-3 py-2 font-semibold text-[var(--hw-neutral-800)]">Issues</th>
                        <th className="px-3 py-2 font-semibold text-[var(--hw-neutral-800)]">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--hw-neutral-100)] bg-white">
                      {filteredTableRows.map((r, idx) => {
                        const isRejected = r.result === "rejected";
                        const isWarning = r.result === "valid_with_warning";
                        const resultLabel = isRejected ? "Rejected" : (isWarning ? "Valid with warning" : "Valid");
                        const resultTextColor = isRejected ? "text-red-600" : (isWarning ? "text-amber-700" : "text-emerald-700");

                        const issuesText = (r.issues || []).map(i => ISSUE_CODE_LABELS[i.code] || i.code).join(", ");
                        const reasonText = (r.issues || []).map(i => i.message).join(" ");
                        const sourceDisplay = r.source_label || (r.source_sheet ? `${r.source_sheet} · Row ${r.row_number}` : `Row ${r.row_number}`);

                        return (
                          <tr key={idx} className="hover:bg-[var(--hw-neutral-50)]">
                            <td className="px-3 py-2 text-[var(--hw-neutral-700)] whitespace-nowrap font-medium">{sourceDisplay}</td>
                            <td className="px-3 py-2 font-medium text-[var(--hw-neutral-900)]">{r.record_label || "—"}</td>
                            <td className={`px-3 py-2 font-medium ${resultTextColor}`}>{resultLabel}</td>
                            <td className="px-3 py-2 text-[var(--hw-neutral-800)]">{issuesText || "—"}</td>
                            <td className="px-3 py-2 text-[var(--hw-neutral-600)]">{reasonText || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white border border-[var(--hw-neutral-200)] text-[13px]">
                  <p className="font-semibold text-emerald-700">No validation issues found.</p>
                  <p className="text-black mt-0.5">All rows passed validation and are ready to import.</p>
                </div>
              )}
            </div>

            {uploadError && (
              <p className="text-[12px] text-red-600 font-medium">{uploadError}</p>
            )}

            {step === "validated" && (
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  onClick={handleImport}
                  disabled={uploading || validationResult.valid === 0}
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
              <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-blue-950">Standardizing & Storing Records…</p>
                  <p className="text-[12px] text-blue-800 mt-0.5">
                    {uploadMessage || "Uploading and processing dataset in the background…"}
                  </p>
                </div>
              </div>
            )}

            {step === "done" && ingestionStatus === "failed" && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-bold text-red-950">Background Import Failed</p>
                    <p className="text-[13px] text-red-800 mt-0.5">{uploadError || "The background ingestion task failed."}</p>
                    {fileName && <p className="text-[12px] text-red-700 mt-1">File: <span className="font-mono">{fileName}</span></p>}
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Try another file
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Stored View */}
        {(step === "stored" || (step === "done" && ingestionStatus === "success")) && (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-6 space-y-6">
            <div className="flex items-start gap-3.5 pb-5 border-b border-[var(--hw-neutral-100)]">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-[var(--hw-neutral-900)]">
                  Import Completed & Stored
                </h2>
                <p className="text-[13px] text-[var(--hw-neutral-600)] mt-0.5">
                  {uploadMessage || "The dataset was successfully validated, standardized, and stored in the database."}
                </p>
              </div>
            </div>

            {/* Summary of the Uploaded File */}
            <div className="rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]/50 overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-100)]/60 flex items-center justify-between">
                <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">
                  Upload Summary
                </p>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Completed
                </span>
              </div>

              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">History ID</p>
                  <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] font-mono mt-0.5">
                    {completedSummary?.importId || completedImportId || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">Source / File Name</p>
                  <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] truncate mt-0.5" title={completedSummary?.fileName || fileName}>
                    {completedSummary?.fileName || fileName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">Dataset Type</p>
                  <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mt-0.5">
                    {completedSummary?.datasetType || datasetType || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">Records Stored</p>
                  <p className="text-[14px] font-bold text-emerald-700 mt-0.5">
                    {(completedSummary?.recordsImported ?? validationResult.valid).toLocaleString()} records
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">Reporting Period</p>
                  <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mt-0.5">
                    {completedSummary?.period || period || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">Data Source</p>
                  <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mt-0.5">
                    {completedSummary?.source || source || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">Total Rows Processed</p>
                  <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mt-0.5">
                    {(completedSummary?.totalRows ?? validationResult.totalRows).toLocaleString()} rows
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">Completion Time</p>
                  <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] mt-0.5">
                    {completedSummary?.finishedAt || "Just now"}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions: View Details and Import another file */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => {
                  const targetId = completedSummary?.importId || completedImportId;
                  if (targetId) {
                    navigate(`/admin/history/${targetId}`);
                  } else {
                    navigate("/admin/history");
                  }
                }}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--hw-green-700)] text-white text-[13px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] transition-colors shadow-sm cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                View Details
              </button>

              <button
                onClick={handleReset}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Import another file
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { AdminImport as default };
