export function formatMarketName(sourceId) {
  if (!sourceId) return "—";
  const lower = String(sourceId).toLowerCase();
  if (lower.includes("bankerohan") && (lower.includes("dftc") || lower.includes("taboan"))) {
    return "Bangkerohan & DFTC Taboan";
  }
  if (
    lower.includes("bkrh") ||
    lower.includes("bangkerohan") ||
    lower.includes("bankerohan") ||
    lower === "src-0005" ||
    lower === "src-0006" ||
    lower === "src-0007"
  ) {
    return "Bangkerohan Public Market";
  }
  if (
    lower.includes("dftc") ||
    lower.includes("taboan") ||
    lower.includes("volume") ||
    lower === "src-0008" ||
    lower === "src-0009" ||
    lower === "src-0010" ||
    lower === "src-0011"
  ) {
    return "DFTC Taboan";
  }
  return sourceId;
}

export function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function formatDateOrMonth(val) {
  if (!val) return "—";
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === "—") return "—";

    // 1. Check if it's YYYY-MM (month only, e.g. "2026-10")
    const ymMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})$/);
    if (ymMatch) {
      const year = ymMatch[1];
      const mIdx = parseInt(ymMatch[2], 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        return `${FULL_MONTH_NAMES[mIdx]} ${year}`;
      }
    }

    // 2. Check if it's Month YYYY (e.g. "Oct 2026", "October 2026", "Oct-2026")
    const myMatch = trimmed.match(/^([A-Za-z]+)[-\s]+(\d{4})$/);
    if (myMatch) {
      const mStr = myMatch[1].toLowerCase();
      const year = myMatch[2];
      const mIdx = SHORT_MONTH_NAMES.findIndex((m) => mStr.startsWith(m.toLowerCase()));
      if (mIdx !== -1) {
        return `${FULL_MONTH_NAMES[mIdx]} ${year}`;
      }
    }

    // 3. Check if it's already "Oct 18, 2026" or similar
    const alreadyFormatted = trimmed.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$/);
    if (alreadyFormatted) {
      return trimmed;
    }

    // 4. Check if it's YYYY-MM-DD
    const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const mIdx = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      if (mIdx >= 0 && mIdx < 12) {
        return `${SHORT_MONTH_NAMES[mIdx]} ${day}, ${year}`;
      }
    }
  }

  try {
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return `${SHORT_MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return String(val);
  }
}

export function formatSavedDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const month = SHORT_MONTH_NAMES[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${month} ${day}, ${year} · ${time}`;
  } catch {
    return dateStr;
  }
}

export function isSubmissionFileUpload(sub) {
  if (!sub) return false;
  const m = String(sub.submission_method || "").toLowerCase();
  if (m.includes("upload") || m.includes("file") || m.includes("excel") || m.includes("csv")) {
    return true;
  }
  return Boolean(sub.file_name || sub.original_file_name);
}

export function isSubmissionToday(sub, todayStr) {
  if (!sub) return false;
  const checkDate = (val) => {
    if (!val) return false;
    const s = String(val);
    if (s.slice(0, 10) === todayStr) return true;
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime()) && getLocalDateString(d) === todayStr) return true;
    } catch {}
    return false;
  };
  return checkDate(sub.reporting_date) || checkDate(sub.saved_at) || checkDate(sub.created_at);
}

export function buildSavedDatasetsList(
  rawSubmissions = [],
  todayStr = getLocalDateString(),
  todayReportRecordCount = 0,
  justSaved = null
) {
  const list = [];
  const manualPricesByDate = new Map();

  const validSubmissions = (rawSubmissions || []).filter(
    (sub) => String(sub.status || "").toLowerCase() !== "draft"
  );

  for (const sub of validSubmissions) {
    const isArrival = sub.data_type === "arrival_volume" || sub.data_type === "arrival";
    const isFileUpload = isSubmissionFileUpload(sub);
    const submissionMethod = isFileUpload ? "File Upload" : "Manual Input";
    const reportingDate = sub.reporting_date || (sub.saved_at ? sub.saved_at.slice(0, 10) : "");

    // Consolidate ONLY manual price entries for the same reporting date into one unified report
    if (!isArrival && !isFileUpload && reportingDate) {
      if (!manualPricesByDate.has(reportingDate)) {
        manualPricesByDate.set(reportingDate, []);
      }
      manualPricesByDate.get(reportingDate).push(sub);
    } else {
      const market = formatMarketName(sub.source_name || sub.source_id);
      const priceTypeCapitalized = sub.price_type
        ? sub.price_type.charAt(0).toUpperCase() + sub.price_type.slice(1).toLowerCase()
        : "";

      const formattedRepDate = formatDateOrMonth(sub.reporting_date);
      const defaultName = isArrival
        ? `${market} Arrival Volume — ${formattedRepDate !== "—" ? formattedRepDate : formatSavedDate(sub.saved_at || sub.created_at)}`
        : `${market} ${priceTypeCapitalized ? priceTypeCapitalized + " " : ""}Prices — ${formattedRepDate !== "—" ? formattedRepDate : formatSavedDate(sub.saved_at || sub.created_at)}`;

      const dataName = isFileUpload
        ? (sub.original_file_name || sub.file_name || defaultName)
        : defaultName;

      const dataType = isArrival
        ? "DFTC Arrival Volume"
        : (priceTypeCapitalized ? `Daily ${priceTypeCapitalized} Prices` : "Price Dataset");

      const savedDate = formatSavedDate(sub.saved_at || sub.created_at);

      const isJustSaved =
        justSaved?.type === "arrival" &&
        (sub.reporting_date === justSaved.date ||
          sub.reporting_date === todayStr ||
          sub.submission_id === justSaved.id);

      const recCount = Math.max(
        sub.record_count ?? 0,
        (sub.analytics_records?.length || 0) + (sub.other_records?.length || 0)
      );

      const isToday = isSubmissionToday(sub, todayStr);

      list.push({
        id: sub.submission_id || sub.id,
        submissionId: sub.id || sub.submission_id,
        isArrival,
        isFileUpload,
        analyticsRecords: sub.analytics_records || [],
        otherRecords: sub.other_records || [],
        dataName,
        name: dataName,
        dataType,
        market,
        submissionMethod,
        entryMethod: submissionMethod,
        savedDate: isJustSaved && justSaved?.at ? formatSavedDate(justSaved.at) : savedDate,
        savedAt: isJustSaved && justSaved?.at ? formatSavedDate(justSaved.at) : savedDate,
        savedAtRaw: isJustSaved && justSaved?.at ? justSaved.at : (sub.saved_at || sub.created_at || ""),
        reportingDate: sub.reporting_date || (sub.saved_at ? sub.saved_at.slice(0, 10) : ""),
        records: recCount,
        isNew: true,
        isJustSaved: Boolean(isJustSaved),
        isToday,
        status: sub.status || "Saved"
      });
    }
  }

  // Add consolidated manual price monitoring files
  for (const [dateStr, subs] of manualPricesByDate.entries()) {
    const distinctCommodities = new Set();
    for (const s of subs) {
      for (const r of s.analytics_records || []) {
        if (r.commodity_name) distinctCommodities.add(r.commodity_name);
      }
      for (const r of s.other_records || []) {
        if (r.commodity_name) distinctCommodities.add(r.commodity_name);
      }
    }
    const sumRecords = subs.reduce((acc, s) => acc + (s.record_count ?? 0), 0);
    const totalRecords = Math.max(
      sumRecords,
      distinctCommodities.size,
      dateStr === todayStr ? (todayReportRecordCount || 0) : 0
    );

    const latestSub = [...subs].sort(
      (a, b) => new Date(b.saved_at || b.created_at || 0).getTime() - new Date(a.saved_at || a.created_at || 0).getTime()
    )[0];
    const savedDate = formatSavedDate(latestSub?.saved_at || latestSub?.created_at);

    const dateFormatted = formatDateOrMonth(dateStr);

    const isJustSaved =
      justSaved?.type === "price" && (dateStr === justSaved.date || dateStr === todayStr);
    const isToday = subs.some((s) => isSubmissionToday(s, todayStr));

    list.push({
      id: `manual-price-${dateStr}`,
      submissionId: latestSub?.id,
      isArrival: false,
      isFileUpload: false,
      dataName: `DFTC Price Monitoring — ${dateFormatted}`,
      name: `DFTC Price Monitoring — ${dateFormatted}`,
      dataType: "Daily Price Monitoring",
      market: "Bankerohan & DFTC Taboan",
      submissionMethod: "Manual Input",
      entryMethod: "Manual Input",
      savedDate: isJustSaved && justSaved?.at ? formatSavedDate(justSaved.at) : savedDate,
      savedAt: isJustSaved && justSaved?.at ? formatSavedDate(justSaved.at) : savedDate,
      savedAtRaw: isJustSaved && justSaved?.at ? justSaved.at : (latestSub?.saved_at || latestSub?.created_at || ""),
      reportingDate: dateStr,
      records: totalRecords,
      isNew: true,
      isJustSaved: Boolean(isJustSaved),
      isToday,
      status: "Saved"
    });
  }

  list.sort((a, b) => {
    if (a.isJustSaved && !b.isJustSaved) return -1;
    if (!a.isJustSaved && b.isJustSaved) return 1;
    const timeA = new Date(a.savedAtRaw || 0).getTime();
    const timeB = new Date(b.savedAtRaw || 0).getTime();
    if (Math.abs(timeA - timeB) < 60000) {
      const idA = a.submissionId || a.id || "";
      const idB = b.submissionId || b.id || "";
      return String(idB).localeCompare(String(idA), undefined, { numeric: true });
    }
    return timeB - timeA;
  });

  return list;
}
