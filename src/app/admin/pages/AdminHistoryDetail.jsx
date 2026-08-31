import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { STATUS_CFG, STEP_STATUS_CFG } from "../components/analytics/adminHistoryMockData";
import { ingestionApi } from "../../../services/api";

const PAGE_SIZE = 20;

function formatDT(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function mapDetail(rec) {
  const source = rec.original_file_name || `Import ${rec.submission_id || rec.id}`;
  const result = rec.error_message
    ? rec.error_message
    : rec.records_imported != null
      ? `${rec.records_imported.toLocaleString()} records imported`
      : "No result summary available.";
  return {
    id: rec.id,
    historyId: rec.id,
    datetime: formatDT(rec.finished_at || rec.started_at),
    sourceModule: source,
    activity: "File Upload",
    result,
    status: rec.status,
    initiatedBy: rec.uploaded_by_user_id || "System",
    details: rec.error_message ? { "Error message": rec.error_message, "File format": rec.file_format || "—" } : (rec.file_format ? { "File format": rec.file_format } : {}),
    relatedArea: rec.file_format || "—"
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

  const statusCfg = STATUS_CFG[record.status] || { color: "text-[var(--hw-neutral-700)]", dot: "bg-[var(--hw-neutral-400)]" };
  const columns = [];
  const rows = [];
  const totalPages = 0;
  const pageRows = [];

  const hasSteps = false;
  const supportsProcessedRecords = true;

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-6">
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
        <h1 className="text-[22px] font-bold text-[var(--hw-neutral-900)] tracking-tight">
          {record.sourceModule || "Processing Record"}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="text-[13px] font-medium text-[var(--hw-neutral-700)]">{record.activity || "-"}</span>
          <span className="text-[var(--hw-neutral-300)]">·</span>
          <span className={`flex items-center gap-1.5 text-[13px] font-semibold ${statusCfg.color}`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusCfg.dot}`} />
            {record.status || "-"}
          </span>
        </div>
        <p className="text-[12px] text-[var(--hw-neutral-500)] mt-1">{record.datetime || "-"}</p>
      </div>

      {/* 1. Summary */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="px-6 py-3.5 border-b border-[var(--hw-neutral-100)]">
          <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Summary</p>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "History ID", value: record.historyId || "-", mono: true },
            { label: "Source / Module", value: record.sourceModule || "-", mono: false },
            { label: "Activity Type", value: record.activity || "-", mono: false },
            { label: "Status", value: record.status || "-", mono: false, statusColor: statusCfg.color },
            { label: "Date & Time", value: record.datetime || "-", mono: false },
            { label: "Initiated By", value: record.initiatedBy || "System", mono: false },
            { label: "Result", value: record.result || "No result summary available.", mono: false },
            { label: "Related Area", value: record.relatedArea || "-", mono: false }
          ].map((row) => (
            <div key={row.label}>
              <p className="text-[11px] font-medium text-[var(--hw-neutral-500)]">{row.label}</p>
              <p
                className={`text-[13px] font-semibold mt-0.5 ${
                  row.statusColor ?? "text-[var(--hw-neutral-900)]"
                } ${row.mono ? "font-mono" : ""}`}
              >
                {row.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Activity-Specific Details */}
      {record.details && Object.keys(record.details).length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-6 py-3.5 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">
              {record.activity} Details
            </p>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {Object.entries(record.details).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between gap-4 px-6 py-3">
                <span className="text-[13px] text-[var(--hw-neutral-600)] flex-shrink-0">{key}</span>
                <span
                  className={`text-[13px] font-medium text-right ${
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

      {/* 3. Processing Steps (Only displayed when meaningful steps exist) */}
      {hasSteps && (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-6 py-3.5 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Processing Steps</p>
          </div>
          <div className="p-6">
            <div className="space-y-3 max-w-xl">
              {record.steps.map((step, idx) => {
                const cfg = STEP_STATUS_CFG[step.status] || { color: "text-[var(--hw-neutral-700)]", dot: "bg-[var(--hw-neutral-400)]" };
                return (
                  <div key={step.label} className="flex items-center justify-between gap-3 text-[13px]">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-600)] text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-[var(--hw-neutral-900)]">{step.label}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${cfg.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      {step.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Processed Records (Only displayed for activities that produce row-level outputs) */}
      {supportsProcessedRecords && (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-6 py-3.5 border-b border-[var(--hw-neutral-100)] flex items-center justify-between">
            <div>
              <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Processed Records</p>
              {rows.length > 0 && (
                <p className="text-[11px] text-[var(--hw-neutral-500)] mt-0.5">
                  {rows.length} records processed in this activity
                </p>
              )}
            </div>
          </div>

          {columns.length > 0 && rows.length > 0 ? (
            <>
              <div className="overflow-x-auto max-h-[500px]">
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
                  <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                    {pageRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[var(--hw-neutral-50)]/60 transition-colors">
                        {columns.map((col) => {
                          const val = row[col];
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
                <div className="px-6 py-3.5 border-t border-[var(--hw-neutral-100)] flex items-center justify-between text-[12px] text-[var(--hw-neutral-600)]">
                  <span>
                    Showing {(recordsPage - 1) * PAGE_SIZE + 1}–{Math.min(recordsPage * PAGE_SIZE, rows.length)} of {rows.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={recordsPage === 1}
                      onClick={() => setRecordsPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 font-medium">
                      {recordsPage} / {totalPages}
                    </span>
                    <button
                      disabled={recordsPage === totalPages}
                      onClick={() => setRecordsPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
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
