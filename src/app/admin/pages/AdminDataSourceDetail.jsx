import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

import { useParams, useNavigate } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Upload,
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { adminApi } from "../../../services/api";

const PAGE_SIZE = 20;
const META_COLS = [
  { key: "record_type", label: "Type" },
  { key: "reference_date", label: "Reference Date" },
  { key: "commodity_id", label: "Commodity ID" },
  { key: "recorded_at", label: "Recorded At" }
];

function formatDT(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function buildTable(items) {
  const detailKeys = new Set();
  items.forEach((it) => {
    if (it.detail && typeof it.detail === "object") {
      Object.keys(it.detail).forEach((k) => detailKeys.add(k));
    }
  });
  const detailCols = [...detailKeys];
  const columns = [...META_COLS.map((c) => c.key), ...detailCols];
  const headers = [...META_COLS.map((c) => c.label), ...detailCols];
  const rows = items.map((it) => {
    const row = {};
    META_COLS.forEach((c) => { row[c.key] = c.key === "recorded_at" || c.key === "reference_date" ? formatDT(it[c.key]) : (it[c.key] ?? "—"); });
    detailCols.forEach((k) => {
      const val = it.detail && it.detail[k];
      row[k] = val != null ? String(val) : "—";
    });
    return { row, columns };
  });
  return { columns, headers, rows };
}

function AdminDataSourceDetail() {
  const { sourceId } = useParams();
  const navigate = useNavigate();
  const [showRecords, setShowRecords] = useState(false);
  const [recordPage, setRecordPage] = useState(1);

  const { data, isLoading: loading, error: queryErr } = useQuery({
    queryKey: ["adminDataSourceRecords", sourceId, recordPage],
    queryFn: () => adminApi.getDataSourceRecords(sourceId, { page: recordPage, page_size: PAGE_SIZE }),
    staleTime: 1000 * 60 * 5,
  });

  const dataSource = data?.data_source || null;
  const records = data?.items || [];
  const total = data?.total ?? 0;
  const error = queryErr ? (queryErr.message || "Failed to load data source.") : null;

  const src = dataSource || {};
  const statusCode = src.status;
  const statusColor = statusCode === "Updated" ? "text-emerald-700" : (statusCode === "Failed" ? "text-red-600" : (statusCode === "Requires Review" ? "text-amber-700" : "text-[var(--hw-neutral-600)]"));
  const statusLabel = statusCode || "Not yet updated";
  const btnPrimary = "flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-[var(--hw-green-700)] text-white rounded-xl hover:bg-[var(--hw-green-800)] transition-colors";
  const btnSecondary = "flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors";

  const { columns, headers, rows } = buildTable(records);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-[900px] mx-auto space-y-5">

        <div>
          <button
    onClick={() => navigate("/admin/data-sources")}
    className="flex items-center gap-1 text-[13px] text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-700)] transition-colors mb-4"
  >
            <ChevronLeft className="w-4 h-4" />Back to Data Sources
          </button>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-[20px] font-bold text-[var(--hw-neutral-900)]">{src.source_name || "Data Source"}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[12px] text-[var(--hw-neutral-800)]">{src.source_type || src.ingestion_method || "—"}</span>
                <span className="text-[var(--hw-neutral-300)]">·</span>
                <span className={`text-[13px] font-semibold ${statusColor}`}>{statusLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold text-red-700 uppercase tracking-wide mb-0.5">Error</p>
              <p className="text-[13px] text-red-700 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Overview</p>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {[
    { label: "ID", value: src.id || "-" },
    { label: "Source type", value: src.source_type || "-" },
    { label: "Ingestion method", value: src.ingestion_method || "-" },
    { label: "Update frequency", value: src.update_frequency || "-" },
    { label: "Last successful update", value: formatDT(src.last_successful_update), highlight: !!src.last_successful_update }
  ].map((row) => <div key={row.label} className="flex items-center justify-between gap-3 px-5 py-3">
                <p className="text-[13px] text-[var(--hw-neutral-800)]">{row.label}</p>
                <p className={`text-[13px] font-medium text-right ${"highlight" in row && row.highlight ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-800)]"}`}>
                  {row.value}
                </p>
              </div>)}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Records</p>
          </div>

          <div className="border-t border-[var(--hw-neutral-100)]">
            <button
    onClick={() => {
      setShowRecords((v) => !v);
      if (!showRecords) setRecordPage(1);
    }}
    className="w-full flex items-center justify-between px-5 py-3 text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
              <span>View Records {loading ? "…" : `(${total.toLocaleString()})`}</span>
              {showRecords ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showRecords && (loading ? (
              <div className="px-5 py-8 text-center text-[13px] text-[var(--hw-neutral-500)] border-t border-[var(--hw-neutral-100)]">Loading records…</div>
            ) : records.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-[var(--hw-neutral-500)] border-t border-[var(--hw-neutral-100)]">No records available.</div>
            ) : <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                        {headers.map((h) => <th key={h} className="px-4 py-2.5 text-left font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                      {rows.map((r, i) => <tr key={i} className="hover:bg-[var(--hw-neutral-50)] transition-colors">
                          {r.columns.map((c) => <td key={c} className="px-4 py-2.5 text-[var(--hw-neutral-700)] whitespace-nowrap">{r.row[c] ?? "—"}</td>)}
                        </tr>)}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--hw-neutral-100)]">
                    <p className="text-[12px] text-[var(--hw-neutral-700)]">
                      Showing {Math.min((recordPage - 1) * PAGE_SIZE + 1, total)}–{Math.min(recordPage * PAGE_SIZE, total)} of {total.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
    onClick={() => setRecordPage((p) => Math.max(1, p - 1))}
    disabled={recordPage === 1}
    className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 transition-colors"
  >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[12px] text-[var(--hw-neutral-800)] px-2 font-medium">
                        {recordPage} / {totalPages}
                      </span>
                      <button
    onClick={() => setRecordPage((p) => Math.min(totalPages, p + 1))}
    disabled={recordPage === totalPages}
    className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 transition-colors"
  >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>}
              </div>)}
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button onClick={() => navigate("/admin/import")} className={btnPrimary}>
            <Upload className="w-4 h-4" />Import Data
          </button>
          <button onClick={() => navigate("/admin/history")} className={btnSecondary}>
            <Clock className="w-4 h-4" />View History
          </button>
        </div>

      </div>
    </div>;
}
export {
  AdminDataSourceDetail as default
};
