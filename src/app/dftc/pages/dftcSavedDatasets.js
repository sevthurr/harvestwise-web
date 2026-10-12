export function formatMarketName(sourceId) {
  if (!sourceId) return "—";
  const lower = sourceId.toLowerCase();
  if (lower.includes("bkrh") || lower.includes("bangkerohan") || lower.includes("bankerohan")) {
    return "Bangkerohan Public Market";
  }
  if (lower.includes("dftc") || lower.includes("taboan")) {
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

export function formatSavedDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
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

      const defaultName = isArrival
        ? `${market} Arrival Volume — ${sub.reporting_date || formatSavedDate(sub.saved_at || sub.created_at)}`
        : `${market} ${priceTypeCapitalized ? priceTypeCapitalized + " " : ""}Prices — ${sub.reporting_date || formatSavedDate(sub.saved_at || sub.created_at)}`;

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

    let dateFormatted = dateStr;
    try {
      const d = new Date(dateStr + "T00:00:00");
      dateFormatted = d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      dateFormatted = dateStr;
    }

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
