import { SHORT_MONTH_NAMES, getLocalDateString } from "../pages/dftcSavedDatasets";

/**
 * Builds standard report filename matching the user requirements:
 * e.g., Bankerohan_Arrival_Daily_Report_2026-11-06.pdf
 *       DFTC_Price_Monthly_Report_Nov-2026.pdf
 */
export function buildReportExportFilename({
  market = "DFTC",
  reportType = "Price",
  period = "Daily",
  dateStr = "",
  ext = "pdf",
  pageIndex = null
}) {
  const mLower = String(market || "").toLowerCase();
  const marketPrefix =
    mLower.includes("bankerohan") || mLower.includes("bangkerohan") || mLower.includes("bkrh")
      ? "Bankerohan"
      : "DFTC";

  const typeStr =
    String(reportType || "").toLowerCase().includes("arrival")
      ? "Arrival"
      : "Price";

  const pLower = String(period || "Daily").toLowerCase();
  const periodStr =
    pLower === "monthly"
      ? "Monthly"
      : pLower === "weekly"
      ? "Weekly"
      : "Daily";

  let datePart = "";
  if (periodStr === "Monthly") {
    // Formats to Mon-YYYY, e.g. Nov-2026
    if (dateStr) {
      const ym = String(dateStr).match(/^(\d{4})-(\d{1,2})/);
      if (ym) {
        const mIdx = parseInt(ym[2], 10) - 1;
        const year = ym[1];
        if (mIdx >= 0 && mIdx < 12) {
          datePart = `${SHORT_MONTH_NAMES[mIdx]}-${year}`;
        }
      } else {
        try {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            datePart = `${SHORT_MONTH_NAMES[d.getMonth()]}-${d.getFullYear()}`;
          }
        } catch {}
      }
    }
    if (!datePart) {
      const now = new Date();
      datePart = `${SHORT_MONTH_NAMES[now.getMonth()]}-${now.getFullYear()}`;
    }
  } else {
    // Daily or Weekly: YYYY-MM-DD
    const match = String(dateStr).match(/\d{4}-\d{2}-\d{2}/);
    if (match) {
      datePart = match[0];
    } else {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          datePart = getLocalDateString(d);
        } else {
          datePart = getLocalDateString();
        }
      } catch {
        datePart = getLocalDateString();
      }
    }
  }

  const cleanExt = String(ext || "pdf").replace(/^\./, "");
  if (pageIndex !== null && pageIndex !== undefined) {
    return `${marketPrefix}_${typeStr}_${periodStr}_Report_${datePart}-Page-${pageIndex + 1}.${cleanExt}`;
  }
  return `${marketPrefix}_${typeStr}_${periodStr}_Report_${datePart}.${cleanExt}`;
}

