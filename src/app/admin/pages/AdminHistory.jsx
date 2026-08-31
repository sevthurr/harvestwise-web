import { PageHeader } from "../../global/components/shared/PageHeader";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import {
  STATUS_CFG,
  ACTIVITY_TYPES,
  JOB_STATUSES
} from "../components/analytics/adminHistoryMockData";
import { ingestionApi } from "../../../services/api";

const PAGE_SIZE = 20;

function formatHistoryDT(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function mapHistory(rec) {
  const source = rec.original_file_name || `Import ${rec.submission_id || rec.id}`;
  const result = rec.error_message
    ? rec.error_message
    : rec.records_imported != null
      ? `${rec.records_imported.toLocaleString()} records imported`
      : "No result summary available.";
  return {
    id: rec.id,
    historyId: rec.id,
    datetime: formatHistoryDT(rec.finished_at || rec.started_at),
    sourceModule: source,
    activity: "File Upload",
    result,
    status: rec.status,
    initiatedBy: rec.uploaded_by_user_id || "System",
    details: rec.error_message ? { "Error message": rec.error_message } : {},
    relatedArea: rec.file_format || "—"
  };
}

function parseRecordDate(datetime) {
  if (!datetime) return new Date(0);
  const datePart = datetime.split("·")[0].trim();
  return new Date(datePart);
}

function AdminHistory() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const data = await ingestionApi.getHistory({ page, page_size: PAGE_SIZE });
        if (!active) return;
        setHistory((data?.items || []).map(mapHistory));
      } catch (err) {
        if (active) setHistory([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [page]);

  const hasActiveFilters = !!(filterType || filterStatus || dateFrom || dateTo || search.trim());

  const filtered = useMemo(() => {
    return history.filter((r) => {
      if (filterType && r.activity !== filterType) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (parseRecordDate(r.datetime) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (parseRecordDate(r.datetime) > to) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const src = (r.sourceModule || "").toLowerCase();
        const act = (r.activity || "").toLowerCase();
        const res = (r.result || "").toLowerCase();
        const file = (r.details?.["File name"] || "").toLowerCase();
        const comm = (r.details?.["Commodity"] || "").toLowerCase();
        const varName = (r.details?.["Variety"] || "").toLowerCase();
        const mod = (r.details?.["Module"] || "").toLowerCase();

        return (
          src.includes(q) ||
          act.includes(q) ||
          res.includes(q) ||
          file.includes(q) ||
          comm.includes(q) ||
          varName.includes(q) ||
          mod.includes(q)
        );
      }
      return true;
    });
  }, [filterType, filterStatus, dateFrom, dateTo, search, history]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function resetFilters() {
    setSearch("");
    setFilterType("");
    setFilterStatus("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const inputCls =
    "px-3 py-2 text-[13px] bg-[var(--hw-neutral-50)] hover:bg-white focus:bg-white border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-2 focus:ring-[var(--hw-green-600)]/20 transition text-[var(--hw-neutral-800)]";
  const selectCls = inputCls + " cursor-pointer";

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title="Processing History"
        description="Review uploads, API syncs, forecasts, module calculations, threshold changes, and publishing records."
      />

      {/* Search & Filter Bar (Matching Table Width) */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hw-neutral-400)] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search source, module, file, commodity, or variety..."
              className="w-full pl-9 pr-3.5 py-2 text-[13px] bg-[var(--hw-neutral-50)] hover:bg-white focus:bg-white border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-2 focus:ring-[var(--hw-green-600)]/20 transition text-[var(--hw-neutral-800)] placeholder:text-[var(--hw-neutral-400)]"
            />
          </div>

          {/* Desktop Filters */}
          <div className="hidden sm:flex items-center gap-2.5 flex-wrap">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              className={selectCls}
            >
              <option value="">All activities</option>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className={selectCls}
            >
              <option value="">All statuses</option>
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Date range */}
            <div className="flex items-center gap-1.5">
              <label className="text-[12px] font-medium text-[var(--hw-neutral-500)] whitespace-nowrap">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className={inputCls}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[12px] font-medium text-[var(--hw-neutral-500)] whitespace-nowrap">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className={inputCls}
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-[12px] text-[var(--hw-green-700)] font-semibold hover:underline transition-colors whitespace-nowrap cursor-pointer px-1"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Mobile Filter Button */}
          <button
            onClick={() => setFilterOpen(true)}
            className="sm:hidden flex items-center justify-center gap-1.5 px-3.5 py-2 border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-white transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-amber-500" />}
          </button>
        </div>

        {history.length > 0 && filtered.length !== history.length && (
          <p className="text-[12px] text-[var(--hw-neutral-500)]">
            Showing {filtered.length} of {history.length} activities
          </p>
        )}
      </div>

      {/* Desktop Table (20 rows per page) */}
      <div className="hidden sm:block bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)] text-left">
                <th className="px-5 py-3 font-semibold text-[var(--hw-neutral-600)] whitespace-nowrap">Date & Time</th>
                <th className="px-5 py-3 font-semibold text-[var(--hw-neutral-600)]">Source / Module</th>
                <th className="px-5 py-3 font-semibold text-[var(--hw-neutral-600)]">Activity Type</th>
                <th className="px-5 py-3 font-semibold text-[var(--hw-neutral-600)]">Result</th>
                <th className="px-5 py-3 font-semibold text-[var(--hw-neutral-600)]">Status</th>
                <th className="px-5 py-3 font-semibold text-[var(--hw-neutral-600)]">Initiated By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hw-neutral-100)]">
              {pageRows.length > 0 ? (
                pageRows.map((r) => {
                  const statusCfg = STATUS_CFG[r.status] || { color: "text-[var(--hw-neutral-700)]", dot: "bg-[var(--hw-neutral-400)]" };
                  return (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/admin/history/${r.id}`)}
                      className="hover:bg-[var(--hw-neutral-50)]/70 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 text-[12px] text-[var(--hw-neutral-600)] whitespace-nowrap">
                        {r.datetime || "-"}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-[var(--hw-neutral-900)]">
                        {r.sourceModule || "-"}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--hw-neutral-700)]">
                        {r.activity || "-"}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--hw-neutral-700)]">
                        {r.result || "No result summary available."}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 font-medium text-[12px] ${statusCfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusCfg.dot}`} />
                          {r.status || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-[var(--hw-neutral-600)]">
                        {r.initiatedBy || "System"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--hw-neutral-100)] border border-[var(--hw-neutral-200)] flex items-center justify-center text-[var(--hw-neutral-400)]">
                        <Inbox className="w-5 h-5" />
                      </div>
                      <p className="text-[14px] font-semibold text-[var(--hw-neutral-800)]">
                        {history.length === 0 ? "No processing history available." : "No processing history matches your search."}
                      </p>
                      {hasActiveFilters && history.length > 0 && (
                        <button
                          onClick={resetFilters}
                          className="text-[13px] text-[var(--hw-green-700)] font-medium hover:underline cursor-pointer"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (20 items per page) */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-[var(--hw-neutral-100)] flex items-center justify-between text-[13px] text-[var(--hw-neutral-600)]">
            <span>
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium">
                {safePage} / {totalPages}
              </span>
              <button
                disabled={safePage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {pageRows.length > 0 ? (
          pageRows.map((r) => {
            const statusCfg = STATUS_CFG[r.status] || { color: "text-[var(--hw-neutral-700)]", dot: "bg-[var(--hw-neutral-400)]" };
            return (
              <div
                key={r.id}
                onClick={() => navigate(`/admin/history/${r.id}`)}
                className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-2 cursor-pointer active:bg-[var(--hw-neutral-50)] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[14px] font-bold text-[var(--hw-neutral-900)]">{r.sourceModule || "-"}</p>
                    <p className="text-[12px] text-[var(--hw-neutral-600)] mt-0.5">{r.activity || "-"}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 font-medium text-[12px] ${statusCfg.color} flex-shrink-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusCfg.dot}`} />
                    {r.status || "-"}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--hw-neutral-700)]">{r.result || "No result summary available."}</p>
                <div className="flex items-center justify-between text-[11px] text-[var(--hw-neutral-500)] pt-2 border-t border-[var(--hw-neutral-100)]">
                  <span>{r.datetime || "-"}</span>
                  <span>{r.initiatedBy || "System"}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-8 text-center space-y-2">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-800)]">
              {history.length === 0 ? "No processing history available." : "No processing history matches your search."}
            </p>
            {hasActiveFilters && history.length > 0 && (
              <button
                onClick={resetFilters}
                className="text-[13px] text-[var(--hw-green-700)] font-medium hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-[13px] text-[var(--hw-neutral-600)] px-1">
            <span>
              {safePage} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-[var(--hw-neutral-200)] bg-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={safePage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-[var(--hw-neutral-200)] bg-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Filter Modal */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:hidden">
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-[var(--hw-neutral-900)]">Filter History</p>
              <button
                onClick={() => setFilterOpen(false)}
                className="p-1 rounded-lg text-[var(--hw-neutral-500)] hover:bg-[var(--hw-neutral-100)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-[13px]">
              <div>
                <label className="block text-[12px] font-semibold text-[var(--hw-neutral-700)] mb-1">Activity Type</label>
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-[var(--hw-neutral-200)] rounded-xl"
                >
                  <option value="">All activities</option>
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[var(--hw-neutral-700)] mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-[var(--hw-neutral-200)] rounded-xl"
                >
                  <option value="">All statuses</option>
                  {JOB_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[12px] font-semibold text-[var(--hw-neutral-700)] mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-[var(--hw-neutral-200)] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[var(--hw-neutral-700)] mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-[var(--hw-neutral-200)] rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  resetFilters();
                  setFilterOpen(false);
                }}
                className="flex-1 py-2.5 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-700)]"
              >
                Reset
              </button>
              <button
                onClick={() => setFilterOpen(false)}
                className="flex-1 py-2.5 bg-[var(--hw-green-700)] text-white rounded-xl text-[13px] font-medium"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { AdminHistory as default };
