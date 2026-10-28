import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Inbox, Loader2 } from "lucide-react";
import { formatDateTime, formatDisplayLabel } from "../../global/utils/apiTransforms";
import { ingestionApi } from "../../../services/api";

const PAGE_SIZE = 20;

function formatDT(v) {
  if (!v) return "—";
  return formatDateTime(v) || String(v);
}

function sourceNameFor(rec) {
  if (!rec.original_file_name) return "PSA OpenStat";
  const fileName = (rec.original_file_name || "").toLowerCase();
  if (fileName.includes("dftc")) return "Davao Food Terminal Complex (DFTC)";
  if (fileName.includes("bankerohan")) return "Bankerohan Public Market";
  return rec.file_format || "—";
}

function mapDetail(rec) {
  const isApiSync = !rec.original_file_name;
  const source = isApiSync ? "OpenStat API Sync" : rec.original_file_name || `Import ${rec.submission_id || rec.id}`;
  const result = rec.error_message
    ? (/forecast/i.test(rec.error_message) ? "Price forecasting failed." : rec.error_message)
    : rec.records_imported != null
      ? `${rec.records_imported.toLocaleString()} records imported`
      : "No result summary available.";
  return {
    id: rec.id,
    historyId: rec.id,
    datetime: formatDT(rec.finished_at || rec.started_at),
    sourceModule: source,
    activity: isApiSync ? "OpenStat API Sync" : "File Upload",
    result,
    initiatedBy: rec.uploaded_by_name || rec.uploaded_by_user_id || "System",
    details: rec.error_message ? { "Error message": /forecast/i.test(rec.error_message) ? "Price forecasting failed." : rec.error_message, "File format": rec.file_format || "—" } : (rec.file_format ? { "File format": rec.file_format } : {}),
    relatedArea: sourceNameFor(rec)
  };
}

function getEmptyRecordsMessage(activity) {
  switch (activity) {
    case "File Upload":
      return "No accepted records were produced by this upload.";
    case "API Sync":
      return "No records were retrieved during this sync.";
    case "Forecast Generation":
      return "No forecast points were generated.";
    case "Module Output Calculation":
      return "No analytical outputs were produced.";
    default:
      return "No records available for this processing activity.";
  }
}

function AdminHistoryDetail() {
  const { historyId } = useParams();
  const navigate = useNavigate();
  const [recordsPage, setRecordsPage] = useState(1);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recordsData, setRecordsData] = useState({ columns: [], rows: [], total: 0, total_pages: 0 });
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setRecord(null);
    (async () => {
      try {
        const data = await ingestionApi.getHistoryDetail(historyId);
        if (!active) return;
        setRecord(mapDetail(data));
      } catch (err) {
        if (active) setRecord(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [historyId]);

  useEffect(() => {
    let active = true;
    setRecordsLoading(true);
    (async () => {
      try {
        const data = await ingestionApi.getHistoryRecords(historyId, { page: recordsPage, page_size: PAGE_SIZE });
        if (!active) return;
        setRecordsData(data || { columns: [], rows: [], total: 0, total_pages: 0 });
      } catch (err) {
        console.warn("Failed to fetch records for history entry:", err);
        if (active) setRecordsData({ columns: [], rows: [], total: 0, total_pages: 0 });
      } finally {
        if (active) setRecordsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [historyId, recordsPage]);

  if (loading) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-16 max-w-[1440px] mx-auto text-center space-y-3">
        <p className="text-[15px] font-semibold text-[var(--hw-neutral-800)]">Loading history entry…</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-16 max-w-[1440px] mx-auto text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[var(--hw-neutral-100)] border border-[var(--hw-neutral-200)] flex items-center justify-center text-[var(--hw-neutral-400)] mx-auto">
          <Inbox className="w-6 h-6" />
        </div>
        <p className="text-[15px] font-semibold text-[var(--hw-neutral-800)]">History entry not found.</p>
        <p className="text-[13px] text-[var(--hw-neutral-500)]">The requested processing history record does not exist or has been cleared.</p>
        <button
          onClick={() => navigate("/admin/history")}
          className="inline-flex items-center gap-1.5 text-[var(--hw-green-700)] text-[13px] font-semibold hover:underline cursor-pointer pt-2"
        >
          ← Back to Processing History
        </button>
      </div>
    );
  }

  const columns = recordsData.columns || [];
  const pageRows = recordsData.rows || [];
  const totalRecords = recordsData.total || 0;
  const totalPages = recordsData.total_pages || (totalRecords > 0 ? Math.ceil(totalRecords / PAGE_SIZE) : 0);

  const supportsProcessedRecords = true;

  return (
    <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-4 sm:space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate("/admin/history")}
        className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Processing History
      </button>

      {/* Header */}
      <div>
        <h1 className="text-[20px] sm:text-[22px] font-bold text-[var(--hw-neutral-900)] tracking-tight break-words">
          {record.sourceModule || "Processing Record"}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="text-[13px] font-medium text-[var(--hw-neutral-700)]">{record.activity || "-"}</span>
        </div>
      </div>

      {/* 1. Summary */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[var(--hw-neutral-100)]">
          <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Summary</p>
        </div>
        <div className="p-4 sm:p-6 grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { label: "History ID", value: record.historyId || "-", mono: true },
            { label: "Source / Module", value: record.sourceModule || "-", mono: false },
            { label: "Activity Type", value: record.activity || "-", mono: false },
            { label: "Date & Time", value: record.datetime || "-", mono: false },
            { label: "Initiated By", value: record.initiatedBy || "System", mono: false },
            { label: "Result", value: record.result || "No result summary available.", mono: false },
            { label: "Related Area", value: record.relatedArea || "-", mono: false }
          ].map((row) => (
            <div key={row.label}>
              <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">{row.label}</p>
              <p
                className={`text-[13px] font-semibold mt-0.5 break-words ${
                  row.statusColor ?? "text-[var(--hw-neutral-900)]"
                } ${row.mono ? "font-mono text-[12px]" : ""}`}
              >
                {row.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Activity-Specific Details */}
      {record.details && Object.keys(record.details).length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">
              {record.activity} Details
            </p>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {Object.entries(record.details).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 sm:py-3">
                <span className="text-[13px] text-[var(--hw-neutral-600)] flex-shrink-0">{key}</span>
                <span
                  className={`text-[13px] font-medium text-right break-words ${
                    key === "Error message" ? "text-red-600 font-semibold" : "text-[var(--hw-neutral-900)]"
                  }`}
                >
                  {val || "-"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Processed Records (Only displayed for activities that produce row-level outputs) */}
      {supportsProcessedRecords && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[var(--hw-neutral-100)] flex flex-col xs:flex-row xs:items-center justify-between gap-2">
            <div>
              <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Processed Records</p>
              {totalRecords > 0 && (
                <p className="text-[11px] text-[var(--hw-neutral-500)] mt-0.5">
                  {totalRecords.toLocaleString()} records processed in this activity
                </p>
              )}
            </div>
            {recordsLoading && (
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--hw-neutral-500)]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--hw-green-700)]" />
                <span>Loading…</span>
              </div>
            )}
          </div>

          {columns.length > 0 && pageRows.length > 0 ? (
            <>
              <div className="overflow-x-auto [scrollbar-width:thin] touch-pan-x max-h-[500px]">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)] z-10">
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="px-4 py-2.5 text-left font-semibold text-[var(--hw-neutral-600)] whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y divide-[var(--hw-neutral-100)] ${recordsLoading ? "opacity-60" : ""}`}>
                    {pageRows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {columns.map((col) => {
                          const val = row[col];
                          if (col === "Outcome") {
                            const lower = (val || "").toLowerCase();
                            let outcomeColor = "text-[var(--hw-neutral-700)] font-semibold";
                            if (lower === "inserted") outcomeColor = "text-emerald-700 font-semibold";
                            else if (lower === "updated") outcomeColor = "text-amber-700 font-semibold";
                            else if (lower === "skipped") outcomeColor = "text-amber-600 font-semibold";
                            else if (lower === "rejected") outcomeColor = "text-red-600 font-semibold";
                            return (
                              <td key={col} className={`px-4 py-2.5 whitespace-nowrap ${outcomeColor}`}>
                                {val || "—"}
                              </td>
                            );
                          }
                          if (col === "Uploaded Price") {
                            return (
                              <td key={col} className="px-4 py-2.5 text-[var(--hw-neutral-900)] font-semibold whitespace-nowrap">
                                {val || "—"}
                              </td>
                            );
                          }
                          if (col === "Stored Price") {
                            return (
                              <td key={col} className="px-4 py-2.5 text-[var(--hw-neutral-600)] whitespace-nowrap">
                                {val || "—"}
                              </td>
                            );
                          }
                          if (col === "Source") {
                            return (
                              <td key={col} className="px-4 py-2.5 text-[var(--hw-neutral-600)] whitespace-nowrap">
                                {val ? formatDisplayLabel(val) : "—"}
                              </td>
                            );
                          }
                          if (col === "Source Trace") {
                            return (
                              <td key={col} className="px-4 py-2.5 text-[var(--hw-neutral-500)] font-mono text-[11px] whitespace-nowrap">
                                {val || "—"}
                              </td>
                            );
                          }
                          if (col === "Reason") {
                            return (
                              <td key={col} className="px-4 py-2.5 text-[var(--hw-neutral-500)] text-[11px] whitespace-nowrap">
                                {val || "—"}
                              </td>
                            );
                          }
                          return (
                            <td key={col} className="px-4 py-2.5 text-[var(--hw-neutral-800)] whitespace-nowrap font-medium">
                              {val || "-"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Records Pagination (20 per page) */}
              {totalPages > 1 && (
                <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-[var(--hw-neutral-100)] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[12px] text-[var(--hw-neutral-600)]">
                  <span>
                    Showing {(recordsPage - 1) * PAGE_SIZE + 1}–{Math.min(recordsPage * PAGE_SIZE, totalRecords)} of {totalRecords.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={recordsPage === 1 || recordsLoading}
                      onClick={() => setRecordsPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 font-medium">
                      {recordsPage} / {totalPages}
                    </span>
                    <button
                      disabled={recordsPage === totalPages || recordsLoading}
                      onClick={() => setRecordsPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : recordsLoading ? (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--hw-green-700)]" />
                <p className="text-[13px] font-medium text-[var(--hw-neutral-700)]">Loading processed records…</p>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-1.5 max-w-sm mx-auto">
                <div className="w-10 h-10 rounded-2xl bg-[var(--hw-neutral-100)] border border-[var(--hw-neutral-200)] flex items-center justify-center text-[var(--hw-neutral-400)]">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="text-[13px] font-semibold text-[var(--hw-neutral-800)]">
                  {getEmptyRecordsMessage(record.activity)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { AdminHistoryDetail as default };
