const STATUS_CFG = {
  "Completed": { color: "text-emerald-700", dot: "bg-emerald-500" },
  "Completed with Warnings": { color: "text-amber-700", dot: "bg-amber-400" },
  "Failed": { color: "text-red-700", dot: "bg-red-500" }
};
const STEP_STATUS_CFG = {
  "Completed": { color: "text-emerald-700", dot: "bg-emerald-500" },
  "Skipped": { color: "text-[#94a3b8]", dot: "bg-slate-300" },
  "Failed": { color: "text-red-700", dot: "bg-red-500" }
};
const ACTIVITY_TYPES = [
  "Manual Upload",
  "API Sync",
  "Forecast Generation",
  "Module Output Calculation",
  "Weight / Threshold Update",
  "Publish to Farmer App"
];
const JOB_STATUSES = [
  "Completed",
  "Completed with Warnings",
  "Failed"
];
const HISTORY = [
  // ── Jul 20, 2026 ────────────────────────────────────────────────────────────
  {
    id: "ph1",
    historyId: "PH-20260720-001",
    datetime: "Jul 20, 2026 \xB7 7:30 AM",
    sourceModule: "Bangkerohan Retail Prices",
    activity: "Manual Upload",
    result: "140 records imported",
    status: "Completed",
    initiatedBy: "admin@harvestwise.ph",
    relatedArea: "Data > Data Sources",
    details: {
      "File name": "bangk_retail_jul20.csv",
      "Dataset": "Bangkerohan Retail Prices",
      "Submitted records": "140",
      "Accepted records": "140",
      "Rejected records": "0",
      "Duplicate records": "0",
      "Warning count": "0",
      "Published status": "Pending"
    },
    steps: [
      { label: "Uploaded", status: "Completed" },
      { label: "Standardized", status: "Completed" },
      { label: "Validated", status: "Completed" },
      { label: "Imported", status: "Completed" },
      { label: "Ready for Publishing", status: "Completed" }
    ],
    recordsType: "manual-upload",
    recordsMeta: { commodity: "mixed", source: "Bangkerohan", totalRows: 140 }
  },
  {
    id: "ph2",
    historyId: "PH-20260720-002",
    datetime: "Jul 20, 2026 \xB7 7:10 AM",
    sourceModule: "DFTC Retail Prices",
    activity: "Manual Upload",
    result: "57/95 records accepted",
    status: "Completed with Warnings",
    initiatedBy: "admin@harvestwise.ph",
    relatedArea: "Data > Data Sources",
    details: {
      "File name": "dftc_retail_jul20.csv",
      "Dataset": "DFTC Retail Prices",
      "Submitted records": "95",
      "Accepted records": "57",
      "Rejected records": "38",
      "Duplicate records": "0",
      "Warning count": "38",
      "Published status": "Pending"
    },
    steps: [
      { label: "Uploaded", status: "Completed" },
      { label: "Standardized", status: "Completed" },
      { label: "Validated", status: "Completed" },
      { label: "Imported", status: "Completed" },
      { label: "Ready for Publishing", status: "Completed" }
    ],
    recordsType: "manual-upload",
    recordsMeta: { commodity: "mixed", source: "DFTC Retail", totalRows: 95, rejectedAt: [3, 7, 11, 14, 18, 21, 25, 27, 30, 33, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 57, 59, 61, 63, 65, 67, 69, 71, 73, 75, 77, 79, 81, 83, 85, 87, 89, 91] }
  },
  {
    id: "ph3",
    historyId: "PH-20260720-003",
    datetime: "Jul 20, 2026 \xB7 6:50 AM",
    sourceModule: "Weather Forecast",
    activity: "API Sync",
    result: "Retrieval failed",
    status: "Failed",
    initiatedBy: "System",
    relatedArea: "Data > Data Sources",
    details: {
      "API source": "Open-Meteo Forecast API",
      "Last sync attempt": "Jul 20, 2026 \xB7 6:50 AM",
      "Records fetched": "0",
      "Records accepted": "0",
      "Records rejected": "0",
      "Error message": "Connection timeout after 30s",
      "Next scheduled sync": "Jul 20, 2026 \xB7 8:00 AM"
    },
    steps: [
      { label: "Requested", status: "Completed" },
      { label: "Retrieved", status: "Failed" },
      { label: "Validated", status: "Skipped" },
      { label: "Stored", status: "Skipped" },
      { label: "Ready for Processing", status: "Skipped" }
    ],
    recordsType: "none",
    recordsMeta: { source: "Open-Meteo", totalRows: 0 }
  },
  {
    id: "ph4",
    historyId: "PH-20260720-004",
    datetime: "Jul 20, 2026 \xB7 6:30 AM",
    sourceModule: "Historical Production Volume",
    activity: "API Sync",
    result: "3,200 records synced",
    status: "Completed",
    initiatedBy: "System",
    relatedArea: "Data > Data Sources",
    details: {
      "API source": "PSA OpenStat API",
      "Last sync attempt": "Jul 20, 2026 \xB7 6:30 AM",
      "Records fetched": "3,200",
      "Records accepted": "3,200",
      "Records rejected": "0",
      "Next scheduled sync": "Jul 27, 2026 \xB7 6:30 AM"
    },
    steps: [
      { label: "Requested", status: "Completed" },
      { label: "Retrieved", status: "Completed" },
      { label: "Validated", status: "Completed" },
      { label: "Stored", status: "Completed" },
      { label: "Ready for Processing", status: "Completed" }
    ],
    recordsType: "api-sync",
    recordsMeta: { source: "PSA OpenStat", commodity: "mixed", totalRows: 32 }
  },
  {
    id: "ph5",
    historyId: "PH-20260720-005",
    datetime: "Jul 20, 2026 \xB7 6:00 AM",
    sourceModule: "Price Forecasting",
    activity: "Forecast Generation",
    result: "Kamatis 14-day forecast generated",
    status: "Completed",
    initiatedBy: "System",
    relatedArea: "Forecasting",
    details: {
      "Commodity": "Kamatis",
      "Market": "Bangkerohan Retail",
      "Price type": "Retail",
      "Forecast horizon": "14 days (Jul 21\u2013Aug 3, 2026)",
      "Records used": "84",
      "Forecast range": "\u20B182\u2013\u20B197",
      "Forecast midpoint": "\u20B189",
      "Price Outlook result": "Favorable"
    },
    steps: [
      { label: "Records loaded", status: "Completed" },
      { label: "Model executed", status: "Completed" },
      { label: "Forecast range generated", status: "Completed" },
      { label: "Price Outlook calculated", status: "Completed" },
      { label: "Output stored", status: "Completed" }
    ],
    recordsType: "forecast",
    recordsMeta: { commodity: "Kamatis", totalRows: 14 }
  },
  {
    id: "ph6",
    historyId: "PH-20260720-006",
    datetime: "Jul 20, 2026 \xB7 5:45 AM",
    sourceModule: "Price Outlook",
    activity: "Module Output Calculation",
    result: "12 outputs calculated",
    status: "Completed",
    initiatedBy: "System",
    relatedArea: "Analytics",
    details: {
      "Module": "Price Outlook",
      "Commodity count": "10 commodities",
      "Input period": "Jul 14\u201320, 2026",
      "Outputs generated": "12",
      "Failed outputs": "0",
      "Related rules used": "Price Outlook threshold \u2014 Favorable > 5%, Neutral \u22125%\u20135%, Unfavorable < \u22125%"
    },
    steps: [
      { label: "Input data loaded", status: "Completed" },
      { label: "Rule applied", status: "Completed" },
      { label: "Classification determined", status: "Completed" },
      { label: "Output stored", status: "Completed" }
    ],
    recordsType: "module-calc",
    recordsMeta: { module: "Price Outlook", totalRows: 12 }
  },
  {
    id: "ph7",
    historyId: "PH-20260720-007",
    datetime: "Jul 20, 2026 \xB7 5:30 AM",
    sourceModule: "Rules & Thresholds",
    activity: "Weight / Threshold Update",
    result: "Price Outlook threshold updated",
    status: "Completed",
    initiatedBy: "admin@harvestwise.ph",
    relatedArea: "Analytics > Weights & Thresholds",
    details: {
      "Rule name": "Price Outlook",
      "Previous value": "Favorable > 3%, Neutral \u22123%\u20133%, Unfavorable < \u22123%",
      "New value": "Favorable > 5%, Neutral \u22125%\u20135%, Unfavorable < \u22125%",
      "Updated by": "admin@harvestwise.ph",
      "Updated at": "Jul 20, 2026 \xB7 5:30 AM"
    },
    steps: [
      { label: "Change submitted", status: "Completed" },
      { label: "Validated", status: "Completed" },
      { label: "Applied", status: "Completed" },
      { label: "Logged", status: "Completed" }
    ],
    recordsType: "weight-update",
    recordsMeta: { totalRows: 0 }
  },
  {
    id: "ph8",
    historyId: "PH-20260720-008",
    datetime: "Jul 20, 2026 \xB7 5:15 AM",
    sourceModule: "Farmer App Records",
    activity: "Publish to Farmer App",
    result: "24 records published",
    status: "Completed",
    initiatedBy: "admin@harvestwise.ph",
    relatedArea: "Data > Publishing",
    details: {
      "Published batch": "BATCH-20260720-001",
      "Records published": "24",
      "Published by": "admin@harvestwise.ph",
      "Farmer app update time": "Jul 20, 2026 \xB7 5:16 AM",
      "Affected output type": "Market Outlook, Price Forecast"
    },
    steps: [
      { label: "Records selected", status: "Completed" },
      { label: "Data formatted", status: "Completed" },
      { label: "Published", status: "Completed" },
      { label: "Farmer app updated", status: "Completed" }
    ],
    recordsType: "publish",
    recordsMeta: { totalRows: 24 }
  },
  // ── Jun 24, 2026 ─────────────────────────────────────────────────────────────
  {
    id: "ph9",
    historyId: "PH-20260624-001",
    datetime: "Jun 24, 2026 \xB7 7:30 AM",
    sourceModule: "Bangkerohan Retail Prices",
    activity: "Manual Upload",
    result: "140 records imported",
    status: "Completed",
    initiatedBy: "admin@harvestwise.ph",
    relatedArea: "Data > Data Sources",
    details: {
      "File name": "bangk_retail_jun24.csv",
      "Dataset": "Bangkerohan Retail Prices",
      "Submitted records": "140",
      "Accepted records": "140",
      "Rejected records": "0",
      "Duplicate records": "0",
      "Warning count": "0",
      "Published status": "Published"
    },
    steps: [
      { label: "Uploaded", status: "Completed" },
      { label: "Standardized", status: "Completed" },
      { label: "Validated", status: "Completed" },
      { label: "Imported", status: "Completed" },
      { label: "Published", status: "Completed" }
    ],
    recordsType: "manual-upload",
    recordsMeta: { commodity: "mixed", source: "Bangkerohan", totalRows: 140 }
  },
  {
    id: "ph10",
    historyId: "PH-20260624-002",
    datetime: "Jun 24, 2026 \xB7 5:31 AM",
    sourceModule: "DFTC Retail Prices",
    activity: "Manual Upload",
    result: "57/95 records accepted",
    status: "Completed with Warnings",
    initiatedBy: "admin@harvestwise.ph",
    relatedArea: "Data > Data Sources",
    details: {
      "File name": "dftc_retail_jun24.csv",
      "Dataset": "DFTC Retail Prices",
      "Submitted records": "95",
      "Accepted records": "57",
      "Rejected records": "38",
      "Duplicate records": "0",
      "Warning count": "38",
      "Published status": "Pending"
    },
    steps: [
      { label: "Uploaded", status: "Completed" },
      { label: "Standardized", status: "Completed" },
      { label: "Validated", status: "Completed" },
      { label: "Imported", status: "Completed" },
      { label: "Ready for Publishing", status: "Completed" }
    ],
    recordsType: "manual-upload",
    recordsMeta: { commodity: "mixed", source: "DFTC Retail", totalRows: 95 }
  },
  {
    id: "ph11",
    historyId: "PH-20260624-003",
    datetime: "Jun 24, 2026 \xB7 5:22 AM",
    sourceModule: "DFTC Arrival Volume",
    activity: "Manual Upload",
    result: "70 records imported",
    status: "Completed",
    initiatedBy: "admin@harvestwise.ph",
    relatedArea: "Data > Data Sources",
    details: {
      "File name": "dftc_arrivals_jun24.csv",
      "Dataset": "DFTC Arrival Volume",
      "Submitted records": "70",
      "Accepted records": "70",
      "Rejected records": "0",
      "Duplicate records": "0",
      "Warning count": "0",
      "Published status": "Published"
    },
    steps: [
      { label: "Uploaded", status: "Completed" },
      { label: "Standardized", status: "Completed" },
      { label: "Validated", status: "Completed" },
      { label: "Imported", status: "Completed" },
      { label: "Published", status: "Completed" }
    ],
    recordsType: "manual-upload",
    recordsMeta: { commodity: "mixed", source: "DFTC Arrival", totalRows: 70 }
  },
  {
    id: "ph12",
    historyId: "PH-20260624-004",
    datetime: "Jun 24, 2026 \xB7 5:10 AM",
    sourceModule: "DFTC Wholesale Prices",
    activity: "Manual Upload",
    result: "88 records imported",
    status: "Completed",
    initiatedBy: "admin@harvestwise.ph",
    relatedArea: "Data > Data Sources",
    details: {
      "File name": "dftc_wholesale_jun24.csv",
      "Dataset": "DFTC Wholesale Prices",
      "Submitted records": "88",
      "Accepted records": "88",
      "Rejected records": "0",
      "Duplicate records": "0",
      "Warning count": "0",
      "Published status": "Published"
    },
    steps: [
      { label: "Uploaded", status: "Completed" },
      { label: "Standardized", status: "Completed" },
      { label: "Validated", status: "Completed" },
      { label: "Imported", status: "Completed" },
      { label: "Published", status: "Completed" }
    ],
    recordsType: "manual-upload",
    recordsMeta: { commodity: "mixed", source: "DFTC Wholesale", totalRows: 88 }
  },
  {
    id: "ph13",
    historyId: "PH-20260624-005",
    datetime: "Jun 24, 2026 \xB7 5:48 AM",
    sourceModule: "Historical Production Volume",
    activity: "API Sync",
    result: "3,200 records synced",
    status: "Completed",
    initiatedBy: "System",
    relatedArea: "Data > Data Sources",
    details: {
      "API source": "PSA OpenStat API",
      "Last sync attempt": "Jun 24, 2026 \xB7 5:48 AM",
      "Records fetched": "3,200",
      "Records accepted": "3,200",
      "Records rejected": "0",
      "Next scheduled sync": "Jul 1, 2026 \xB7 5:48 AM"
    },
    steps: [
      { label: "Requested", status: "Completed" },
      { label: "Retrieved", status: "Completed" },
      { label: "Validated", status: "Completed" },
      { label: "Stored", status: "Completed" },
      { label: "Ready for Processing", status: "Completed" }
    ],
    recordsType: "api-sync",
    recordsMeta: { source: "PSA OpenStat", commodity: "mixed", totalRows: 32 }
  },
  {
    id: "ph14",
    historyId: "PH-20260624-006",
    datetime: "Jun 24, 2026 \xB7 5:00 AM",
    sourceModule: "Weather Forecast",
    activity: "API Sync",
    result: "Retrieval failed",
    status: "Failed",
    initiatedBy: "System",
    relatedArea: "Data > Data Sources",
    details: {
      "API source": "Open-Meteo Forecast API",
      "Last sync attempt": "Jun 24, 2026 \xB7 5:00 AM",
      "Records fetched": "0",
      "Records accepted": "0",
      "Records rejected": "0",
      "Error message": "Connection timeout after 30s",
      "Next scheduled sync": "Jun 24, 2026 \xB7 7:00 AM"
    },
    steps: [
      { label: "Requested", status: "Completed" },
      { label: "Retrieved", status: "Failed" },
      { label: "Validated", status: "Skipped" },
      { label: "Stored", status: "Skipped" },
      { label: "Ready for Processing", status: "Skipped" }
    ],
    recordsType: "none",
    recordsMeta: { totalRows: 0 }
  },
  {
    id: "ph15",
    historyId: "PH-20260624-007",
    datetime: "Jun 24, 2026 \xB7 6:02 AM",
    sourceModule: "Price Forecasting",
    activity: "Forecast Generation",
    result: "Kamatis 14-day forecast generated",
    status: "Completed",
    initiatedBy: "System",
    relatedArea: "Forecasting",
    details: {
      "Commodity": "Kamatis",
      "Market": "Bangkerohan Retail",
      "Price type": "Retail",
      "Forecast horizon": "14 days (Jun 25\u2013Jul 8, 2026)",
      "Records used": "84",
      "Forecast range": "\u20B178\u2013\u20B192",
      "Forecast midpoint": "\u20B185",
      "Price Outlook result": "Neutral"
    },
    steps: [
      { label: "Records loaded", status: "Completed" },
      { label: "Model executed", status: "Completed" },
      { label: "Forecast range generated", status: "Completed" },
      { label: "Price Outlook calculated", status: "Completed" },
      { label: "Output stored", status: "Completed" }
    ],
    recordsType: "forecast",
    recordsMeta: { commodity: "Kamatis", totalRows: 14 }
  },
  {
    id: "ph16",
    historyId: "PH-20260624-008",
    datetime: "Jun 24, 2026 \xB7 6:10 AM",
    sourceModule: "Arrival Pressure",
    activity: "Module Output Calculation",
    result: "10 outputs calculated",
    status: "Completed",
    initiatedBy: "System",
    relatedArea: "Analytics",
    details: {
      "Module": "Arrival Pressure",
      "Commodity count": "10 commodities",
      "Input period": "Last 4 completed weeks",
      "Outputs generated": "10",
      "Failed outputs": "0",
      "Related rules used": "Arrival Pressure quartile thresholds \u2014 Q1/Q2/Q3 based on DFTC historical volume"
    },
    steps: [
      { label: "Input data loaded", status: "Completed" },
      { label: "Rule applied", status: "Completed" },
      { label: "Classification determined", status: "Completed" },
      { label: "Output stored", status: "Completed" }
    ],
    recordsType: "module-calc",
    recordsMeta: { module: "Arrival Pressure", totalRows: 10 }
  }
];
const COMMODITY_PRIMARY_VARIANT = {
  "Kamatis": "Diamante Big",
  "Talong": "Banate King",
  "Repolyo": "Wakamini",
  "Atsal": "Smooth Cayene",
  "Carrots": "Big",
  "Pipino": "Mega C",
  "Ampalaya": "Galaxy",
  "Kalabasa": "Suprema",
  "Lettuce": "Curly",
  "Chinese Pechay": ""
};
function generateProcessedRecords(record) {
  const meta = record.recordsMeta ?? {};
  const total = meta.totalRows ?? 0;
  if (record.recordsType === "none" || total === 0) {
    return { columns: [], rows: [] };
  }
  const commodities = ["Kamatis", "Talong", "Repolyo", "Atsal", "Carrots", "Pipino", "Ampalaya", "Kalabasa", "Lettuce", "Chinese Pechay"];
  const markets = ["Bangkerohan", "DFTC Retail", "DFTC Wholesale"];
  if (record.recordsType === "manual-upload") {
    const isBangk = (meta.source ?? "").includes("Bangkerohan");
    const isDFTCArrival = (meta.source ?? "").includes("Arrival");
    const isDFTCWholesale = (meta.source ?? "").includes("Wholesale");
    const rejectedSet = new Set(meta.rejectedAt ?? []);
    if (isDFTCArrival) {
      const rows2 = Array.from({ length: total }, (_, i) => {
        const comm = commodities[i % commodities.length];
        const variety = COMMODITY_PRIMARY_VARIANT[comm] ?? "";
        const d = new Date(2026, 5, 1 + Math.floor(i / commodities.length) * 7);
        return {
          "Row No.": `${i + 1}`,
          "Week Ending": d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          "Commodity": comm,
          "Variety": variety || "\u2014",
          "Arrival Volume": `${(28 + Math.round(Math.random() * 18)).toFixed(1)}`,
          "Unit": "MT/week",
          "Validation Result": rejectedSet.has(i + 1) ? "Rejected" : "Accepted"
        };
      });
      return { columns: ["Row No.", "Week Ending", "Commodity", "Variety", "Arrival Volume", "Unit", "Validation Result"], rows: rows2 };
    }
    const priceTypeLabel = isDFTCWholesale ? "Wholesale" : "Retail";
    const marketName = isBangk ? "Bangkerohan" : isDFTCWholesale ? "DFTC Wholesale" : "DFTC Retail";
    const rows = Array.from({ length: total }, (_, i) => {
      const comm = commodities[i % commodities.length];
      const variety = COMMODITY_PRIMARY_VARIANT[comm] ?? "";
      const d = new Date(2026, 6, 14 + Math.floor(i / commodities.length));
      const isRejected = rejectedSet.has(i + 1) || !isBangk && i >= 57;
      return {
        "Row No.": `${i + 1}`,
        "Date": d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        "Commodity": comm,
        "Variety": variety || "\u2014",
        "Market": marketName,
        "Price Type": priceTypeLabel,
        "Price": isRejected ? "\u2014" : `\u20B1${60 + Math.round(Math.random() * 50)}/kg`,
        "Unit": isRejected ? "\u2014" : "per kg",
        "Validation Result": isRejected ? "Rejected" : "Accepted"
      };
    });
    return { columns: ["Row No.", "Date", "Commodity", "Variety", "Market", "Price Type", "Price", "Unit", "Validation Result"], rows };
  }
  if (record.recordsType === "api-sync") {
    const isPSA = (meta.source ?? "").includes("PSA");
    if (isPSA) {
      const quarters = ["Q1", "Q2", "Q3", "Q4"];
      const locs = ["Bukidnon", "Benguet", "Nueva Vizcaya", "Davao del Sur"];
      const rows2 = Array.from({ length: total }, (_, i) => ({
        "Row No.": `${i + 1}`,
        "Date / Period": `${quarters[i % 4]} ${2024 + Math.floor(i / 4)}`,
        "Commodity / Event": commodities[i % commodities.length],
        "Source": `PSA OpenStat \u2014 ${locs[i % locs.length]}`,
        "Retrieved Value": `${180 + Math.round(Math.random() * 120)}`,
        "Unit": "MT",
        "Sync Result": "Synced"
      }));
      return { columns: ["Row No.", "Date / Period", "Commodity / Event", "Source", "Retrieved Value", "Unit", "Sync Result"], rows: rows2 };
    }
    const rows = Array.from({ length: total }, (_, i) => {
      const d = new Date(2026, 5, 1 + i);
      return {
        "Row No.": `${i + 1}`,
        "Date / Period": d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        "Commodity / Event": "Weather",
        "Source": "Open-Meteo",
        "Retrieved Value": `${(15 + Math.round(Math.random() * 20)).toFixed(1)} mm`,
        "Unit": "mm/day",
        "Sync Result": "Synced"
      };
    });
    return { columns: ["Row No.", "Date / Period", "Commodity / Event", "Source", "Retrieved Value", "Unit", "Sync Result"], rows };
  }
  if (record.recordsType === "forecast") {
    const commodity = meta.commodity ?? "Kamatis";
    const variety = COMMODITY_PRIMARY_VARIANT[commodity] ?? "";
    const outlooks = ["Favorable", "Neutral", "Unfavorable"];
    const rows = Array.from({ length: total }, (_, i) => {
      const d = new Date(2026, 6, 21 + i);
      const lo = 82 + Math.round(Math.random() * 8);
      const hi = lo + 10 + Math.round(Math.random() * 6);
      const mid = Math.round((lo + hi) / 2);
      return {
        "Row No.": `${i + 1}`,
        "Forecast Date": d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        "Commodity": commodity,
        "Variety": variety || "\u2014",
        "Market": "Bangkerohan Retail",
        "Price Type": "Retail",
        "Lower Forecast": `\u20B1${lo}`,
        "Forecast Midpoint": `\u20B1${mid}`,
        "Upper Forecast": `\u20B1${hi}`,
        "Price Outlook": outlooks[i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 0]
      };
    });
    return { columns: ["Row No.", "Forecast Date", "Commodity", "Variety", "Market", "Price Type", "Lower Forecast", "Forecast Midpoint", "Upper Forecast", "Price Outlook"], rows };
  }
  if (record.recordsType === "module-calc") {
    const module = meta.module ?? "Price Outlook";
    const periods = ["Jul 14\u201320, 2026", "Jun 24\u201330, 2026"];
    const classMap = {
      "Price Outlook": ["Favorable", "Neutral", "Unfavorable"],
      "Arrival Pressure": ["Low", "Lower Middle", "Upper Middle", "High"],
      "Historical Seasonal Production Level": ["Low", "Lower Middle", "Upper Middle", "High"],
      "Weather Risk": ["Suitable", "Caution", "Severe"]
    };
    const classes = classMap[module] ?? ["Favorable", "Neutral", "Unfavorable"];
    const rows = Array.from({ length: total }, (_, i) => ({
      "Row No.": `${i + 1}`,
      "Module": module,
      "Commodity": commodities[i % commodities.length],
      "Input Period": periods[i % 2],
      "Classification": classes[i % classes.length],
      "Rule Applied": module === "Price Outlook" ? "Forecast price change threshold" : "Quartile-based classification",
      "Calculation Result": module === "Price Outlook" ? `${i % 2 === 0 ? "+" : "-"}${(3 + Math.round(Math.random() * 8)).toFixed(1)}%` : `Q${i % 4 + 1} range`
    }));
    return { columns: ["Row No.", "Module", "Commodity", "Input Period", "Classification", "Rule Applied", "Calculation Result"], rows };
  }
  if (record.recordsType === "publish") {
    const outputTypes = ["Market Outlook", "Price Forecast", "Advisory"];
    const screens = ["Advisory", "Market", "Dashboard"];
    const rows = Array.from({ length: total }, (_, i) => ({
      "Row No.": `${i + 1}`,
      "Output Type": outputTypes[i % outputTypes.length],
      "Commodity": commodities[i % commodities.length],
      "Target Screen": screens[i % screens.length],
      "Published Status": "Published",
      "Published At": record.datetime
    }));
    return { columns: ["Row No.", "Output Type", "Commodity", "Target Screen", "Published Status", "Published At"], rows };
  }
  if (record.recordsType === "weight-update") {
    const rows = [
      {
        "Row No.": "1",
        "Rule Name": record.details["Rule name"] ?? "",
        "Field Changed": "Classification thresholds",
        "Previous Value": record.details["Previous value"] ?? "",
        "New Value": record.details["New value"] ?? "",
        "Updated By": record.details["Updated by"] ?? ""
      }
    ];
    return { columns: ["Row No.", "Rule Name", "Field Changed", "Previous Value", "New Value", "Updated By"], rows };
  }
  return { columns: [], rows: [] };
}
export {
  ACTIVITY_TYPES,
  HISTORY,
  JOB_STATUSES,
  STATUS_CFG,
  STEP_STATUS_CFG,
  generateProcessedRecords
};
