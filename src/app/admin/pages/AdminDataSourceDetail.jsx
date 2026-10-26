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
import { formatDateTime } from "../../global/utils/apiTransforms";

const PAGE_SIZE = 20;
const META_COLS = [
  { key: "record_type", label: "Type" },
  { key: "reference_date", label: "Reference Date" },
  { key: "commodity_id", label: "Commodity ID" },
  { key: "recorded_at", label: "Recorded At" }
];

const RECORD_TYPE_LABELS = {
  price: "Price",
  arrival: "Arrival",
  weather: "Weather",
  production: "Production",
};

// Fixed, labeled column sets per record type so the Records table renders
// stable columns with readable headers, independent of which rows are on the
// current page.
const DETAIL_COLS = {
  price: [
    { key: "commodity_name", label: "Commodity" },
    { key: "price_type", label: "Price Type" },
    { key: "uom", label: "UOM" },
    { key: "price_min", label: "Min Price" },
    { key: "price_max", label: "Max Price" },
    { key: "prevail_price", label: "Prevailing Price" },
  ],
  arrival: [
    { key: "commodity_name", label: "Commodity" },
    { key: "volume_kg", label: "Volume (kg)" },
    { key: "origin_province", label: "Origin Province" },
  ],
  weather: [
    { key: "location_name", label: "Location" },
    { key: "temperature_min", label: "Temp Min (°C)" },
    { key: "temperature_max", label: "Temp Max (°C)" },
    { key: "rainfall_mm", label: "Rainfall (mm)" },
    { key: "humidity_pct", label: "Humidity (%)" },
    { key: "weather_condition", label: "Condition" },
    { key: "record_type", label: "Record Type" },
  ],
  production: [
    { key: "volume_produced", label: "Volume Produced" },
    { key: "reference_year", label: "Year" },
    { key: "reference_quarter", label: "Quarter" },
    { key: "reference_semester", label: "Semester" },
    { key: "region_id", label: "Region" },
    { key: "province_id", label: "Province" },
  ],
};

function formatDT(v) {
  if (!v) return "—";
  return formatDateTime(v) || String(v);
}

function formatDetailValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value !== "string") return String(value);
  const trimmed = value.trim();
  const key = trimmed.toLowerCase().replace(/[\s_-]+/g, "");
  if (key.includes("bankerohan") || key.includes("bangkerohan")) return "Bankerohan";
  if (key.includes("dftc")) return "DFTC";
  if (key.includes("openstat")) return "OpenStat";
  if (key === "api") return "API";
  return trimmed
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const SOURCE_NAME_LABELS = {
  bankerohan_daily_retail: "Bankerohan Daily Retail",
  bankerohan_daily_wholesale: "Bankerohan Daily Wholesale",
  dftc_daily_retail: "DFTC Daily Retail",
  dftc_daily_wholesale: "DFTC Daily Wholesale",
  dftc_volume: "DFTC Arrival Volume",
  psa_openstat: "PSA OpenStat",
  open_meteo: "Open-Meteo Weather API",
};

const formatSourceName = (value) => SOURCE_NAME_LABELS[value] || formatDetailValue(value);

function buildTable(items) {
  const presentTypes = Array.from(new Set(items.map((it) => it.record_type)));
  const detailCols = [];
  presentTypes.forEach((t) => {
    (DETAIL_COLS[t] || []).forEach((c) => {
      if (!detailCols.some((d) => d.key === c.key)) detailCols.push(c);
    });
  });
  const columns = [...META_COLS.map((c) => c.key), ...detailCols.map((c) => c.key)];
  const headers = [...META_COLS.map((c) => c.label), ...detailCols.map((c) => c.label)];
  const rows = items.map((it) => {
    const row = {};
    META_COLS.forEach((c) => {
      if (c.key === "record_type") row[c.key] = RECORD_TYPE_LABELS[it[c.key]] || it[c.key] || "—";
      else row[c.key] = c.key === "recorded_at" || c.key === "reference_date" ? formatDT(it[c.key]) : (it[c.key] ?? "—");
    });
    detailCols.forEach((c) => {
      const val = it.detail && it.detail[c.key];
      row[c.key] = formatDetailValue(val);
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
  const btnPrimary = "flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-[var(--hw-green-700)] text-white rounded-xl hover:bg-[var(--hw-green-800)] transition-colors";
  const btnSecondary = "flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors";

  const { columns, headers, rows } = buildTable(records);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto">
      <div className="max-w-[900px] mx-auto space-y-4 sm:space-y-5">

        <div>
          <button
    onClick={() => navigate("/admin/data-sources")}
    className="flex items-center gap-1 text-[13px] text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-700)] transition-colors mb-3 sm:mb-4 cursor-pointer"
  >
            <ChevronLeft className="w-4 h-4" />Back to Data Sources
          </button>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-[18px] sm:text-[20px] font-bold text-[var(--hw-neutral-900)]">{formatSourceName(src.source_name || "Data Source")}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[12px] text-[var(--hw-neutral-800)]">{formatDetailValue(src.source_type || src.ingestion_method)}</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl px-4 py-3.5">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold text-red-700 uppercase tracking-wide mb-0.5">Error</p>
              <p className="text-[13px] text-red-700 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Overview</p>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {[
    { label: "ID", value: src.id || "-" },
    { label: "Source type", value: formatDetailValue(src.source_type) },
    { label: "Ingestion method", value: formatDetailValue(src.ingestion_method) },
    { label: "Update frequency", value: formatDetailValue(src.update_frequency) },
    { label: "Last successful update", value: formatDT(src.last_successful_update), highlight: !!src.last_successful_update }
  ].map((row) => <div key={row.label} className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 xs:gap-3 px-4 sm:px-5 py-2.5 sm:py-3">
                <p className="text-[13px] text-[var(--hw-neutral-800)]">{row.label}</p>
                <p className={`text-[13px] font-medium text-left xs:text-right ${"highlight" in row && row.highlight ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-800)]"}`}>
                  {row.value}
                </p>
              </div>)}
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Records</p>
          </div>

          <div className="border-t border-[var(--hw-neutral-100)]">
            <button
    onClick={() => {
      setShowRecords((v) => !v);
      if (!showRecords) setRecordPage(1);
    }}
    className="w-full flex items-center justify-between px-4 sm:px-5 py-3 text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
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
                  <table className="w-full text-[12px] min-w-[500px]">
                    <thead>
                      <tr className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                        {headers.map((h) => <th key={h} className="px-4 py-2.5 text-left font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                      {rows.map((r, i) => <tr key={i}>
                          {r.columns.map((c) => <td key={c} className="px-4 py-2.5 text-[var(--hw-neutral-700)] whitespace-nowrap">{r.row[c] ?? "—"}</td>)}
                        </tr>)}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && <div className="flex flex-col xs:flex-row items-center justify-between gap-2.5 px-4 sm:px-5 py-3 border-t border-[var(--hw-neutral-100)]">
                    <p className="text-[12px] text-[var(--hw-neutral-700)]">
                      Showing {Math.min((recordPage - 1) * PAGE_SIZE + 1, total)}–{Math.min(recordPage * PAGE_SIZE, total)} of {total.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
    onClick={() => setRecordPage((p) => Math.max(1, p - 1))}
    disabled={recordPage === 1}
    className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 transition-colors cursor-pointer"
  >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[12px] text-[var(--hw-neutral-800)] px-2 font-medium">
                        {recordPage} / {totalPages}
                      </span>
                      <button
    onClick={() => setRecordPage((p) => Math.min(totalPages, p + 1))}
    disabled={recordPage === totalPages}
    className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 transition-colors cursor-pointer"
  >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>}
              </div>)}
          </div>
        </div>

        <div className="flex flex-col xs:flex-row gap-2.5">
          <button onClick={() => navigate("/admin/import")} className={`${btnPrimary} w-full xs:w-auto justify-center`}>
            <Upload className="w-4 h-4" />Import Data
          </button>
          <button onClick={() => navigate("/admin/data-sources?tab=history")} className={`${btnSecondary} w-full xs:w-auto justify-center`}>
            <Clock className="w-4 h-4" />View History
          </button>
        </div>

      </div>
    </div>;
}
export {
  AdminDataSourceDetail as default
};
