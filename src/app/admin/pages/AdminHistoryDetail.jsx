import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ChevronLeft } from "lucide-react";
import {
  HISTORY,
  STATUS_CFG,
  STEP_STATUS_CFG,
  generateProcessedRecords
} from "../components/analytics/adminHistoryMockData";
const PAGE_SIZE = 20;
function AdminHistoryDetail() {
  const { historyId } = useParams();
  const navigate = useNavigate();
  const [recordsPage, setRecordsPage] = useState(1);
  const record = HISTORY.find((r) => r.id === historyId);
  if (!record) {
    return <div className="px-4 py-16 text-center space-y-3">
        <p className="text-[var(--hw-neutral-500)]">History entry not found.</p>
        <button
      onClick={() => navigate("/admin/history")}
      className="text-[var(--hw-green-700)] text-[13px] font-medium hover:underline"
    >
          ← Back to Processing History
        </button>
      </div>;
  }
  const statusCfg = STATUS_CFG[record.status];
  const { columns, rows } = generateProcessedRecords(record);
  const totalPages = columns.length > 0 ? Math.ceil(rows.length / PAGE_SIZE) : 0;
  const pageRows = rows.slice((recordsPage - 1) * PAGE_SIZE, recordsPage * PAGE_SIZE);
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-[900px] mx-auto space-y-5">

        {
    /* Back */
  }
        <button
    onClick={() => navigate("/admin/history")}
    className="flex items-center gap-1 text-[13px] text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-700)] transition-colors"
  >
          <ChevronLeft className="w-4 h-4" />
          Back to Processing History
        </button>

        {
    /* Header */
  }
        <div>
          <h1 className="text-[20px] font-bold text-[var(--hw-neutral-900)]">{record.sourceModule}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-[13px] text-[var(--hw-neutral-800)]">{record.activity}</span>
            <span className="text-[var(--hw-neutral-300)]">·</span>
            <span className={`flex items-center gap-1.5 text-[13px] font-medium ${statusCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusCfg.dot}`} />
              {record.status}
            </span>
          </div>
          <p className="text-[12px] text-[var(--hw-neutral-700)] mt-1">{record.datetime}</p>
        </div>

        {
    /* 1. Summary */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Summary</p>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-4">
            {[
    { label: "History ID", value: record.historyId, mono: true },
    { label: "Source / Module", value: record.sourceModule, mono: false },
    { label: "Activity Type", value: record.activity, mono: false },
    { label: "Status", value: record.status, mono: false, statusColor: statusCfg.color },
    { label: "Date & Time", value: record.datetime, mono: false },
    { label: "Initiated By", value: record.initiatedBy, mono: false },
    { label: "Result", value: record.result, mono: false },
    { label: "Related Area", value: record.relatedArea, mono: false }
  ].map((row) => <div key={row.label}>
                <p className="text-[12px] text-[var(--hw-neutral-700)]">{row.label}</p>
                <p className={`text-[13px] font-medium mt-0.5 ${row.statusColor ?? "text-[var(--hw-neutral-800)]"} ${row.mono ? "font-mono" : ""}`}>
                  {row.value}
                </p>
              </div>)}
          </div>
        </div>

        {
    /* 2. Details */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Details</p>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {Object.entries(record.details).map(([key, val]) => <div key={key} className="flex items-start justify-between gap-4 px-5 py-3">
                <span className="text-[13px] text-[var(--hw-neutral-800)] flex-shrink-0">{key}</span>
                <span className={`text-[13px] font-medium text-right ${key === "Error message" ? "text-red-600" : "text-[var(--hw-neutral-800)]"}`}>
                  {val}
                </span>
              </div>)}
          </div>
        </div>

        {
    /* 3. Processing Steps */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Processing Steps</p>
          </div>
          <div className="px-5 py-4">
            <div className="relative">
              {
    /* Vertical line */
  }
              <div className="absolute left-[7px] top-3 bottom-3 w-px bg-[var(--hw-neutral-200)]" />
              <div className="space-y-3">
                {record.steps.map((step, i) => {
    const cfg = STEP_STATUS_CFG[step.status];
    return <div key={i} className="flex items-center gap-3 relative">
                      <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 z-10 ${cfg.dot} border-2 border-white`} />
                      <span className="text-[13px] text-[var(--hw-neutral-700)] flex-1">{step.label}</span>
                      <span className={`text-[12px] font-medium ${cfg.color}`}>{step.status}</span>
                    </div>;
  })}
              </div>
            </div>
          </div>
        </div>

        {
    /* 4. Processed Records */
  }
        {columns.length > 0 && rows.length > 0 && <div className="space-y-2">
            <p className="text-[15px] font-semibold text-[var(--hw-neutral-800)]">Processed Records</p>
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                    <tr>
                      {columns.map((col) => <th key={col} className="px-3 py-2.5 text-left font-semibold text-[var(--hw-neutral-700)] whitespace-nowrap">{col}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                    {pageRows.map((row, i) => <tr key={i} className={`hover:bg-[var(--hw-neutral-50)] transition-colors ${row["Validation Result"] === "Rejected" || row["Sync Result"] === "Failed" ? "opacity-60" : ""}`}>
                        {columns.map((col) => <td key={col} className={`px-3 py-2.5 whitespace-nowrap ${col === "Row No." ? "text-[var(--hw-neutral-700)]" : col === "Validation Result" || col === "Sync Result" || col === "Published Status" ? row[col] === "Accepted" || row[col] === "Synced" || row[col] === "Published" ? "text-emerald-700 font-medium" : row[col] === "Rejected" || row[col] === "Failed" ? "text-red-700 font-medium" : "text-[var(--hw-neutral-700)]" : col === "Price Outlook" || col === "Classification" ? row[col] === "Favorable" || row[col] === "Suitable" || row[col] === "Low" ? "text-emerald-700 font-medium" : row[col] === "Unfavorable" || row[col] === "Severe" ? "text-red-700 font-medium" : "text-amber-700 font-medium" : "text-[var(--hw-neutral-700)]"}`}>
                            {row[col]}
                          </td>)}
                      </tr>)}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-[var(--hw-neutral-100)]">
                  <p className="text-[12px] text-[var(--hw-neutral-700)]">
                    Showing {(recordsPage - 1) * PAGE_SIZE + 1}–{Math.min(recordsPage * PAGE_SIZE, rows.length)} of {rows.length} records
                  </p>
                  <div className="flex items-center gap-1">
                    <button
    disabled={recordsPage === 1}
    onClick={() => setRecordsPage((p) => p - 1)}
    className="px-2.5 py-1 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => <button
    key={p}
    onClick={() => setRecordsPage(p)}
    className={`px-2.5 py-1 text-[12px] border rounded-lg transition-colors ${p === recordsPage ? "border-[var(--hw-green-600)] bg-[var(--hw-green-700)] text-white" : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                        {p}
                      </button>)}
                    <button
    disabled={recordsPage === totalPages}
    onClick={() => setRecordsPage((p) => p + 1)}
    className="px-2.5 py-1 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
                      Next
                    </button>
                  </div>
                </div>}
            </div>
          </div>}

        <div className="pb-8" />

      </div>
    </div>;
}
export {
  AdminHistoryDetail as default
};
