import { PageHeader } from "../../global/components/shared/PageHeader";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  HISTORY,
  STATUS_CFG,
  ACTIVITY_TYPES,
  JOB_STATUSES
} from "../components/analytics/adminHistoryMockData";
const PAGE_SIZE = 10;
function parseRecordDate(datetime) {
  const datePart = datetime.split("\xB7")[0].trim();
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
  const hasActiveFilters = !!(filterType || filterStatus || dateFrom || dateTo);
  const filtered = useMemo(() => HISTORY.filter((r) => {
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
      return r.sourceModule.toLowerCase().includes(q) || r.activity.toLowerCase().includes(q) || r.result.toLowerCase().includes(q);
    }
    return true;
  }), [filterType, filterStatus, dateFrom, dateTo, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  function resetFilters() {
    setFilterType("");
    setFilterStatus("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }
  const inputCls = "px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition text-[var(--hw-neutral-700)]";
  const selectCls = inputCls + " cursor-pointer";
  return <div className="px-4 md:px-8 lg:px-10 py-5 max-w-[1240px] mx-auto space-y-5">

      {
    /* Header */
  }
      <PageHeader
    title="Processing History"
    description="Review uploads, API syncs, forecasts, module calculations, threshold changes, and publishing records."
  />

      {
    /* Search + Filters */
  }
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {
    /* Search */
  }
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hw-neutral-700)] pointer-events-none" />
            <input
    type="text"
    value={search}
    onChange={(e) => {
      setSearch(e.target.value);
      setPage(1);
    }}
    placeholder="Search source, module, file, or commodity..."
    className="w-full pl-9 pr-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition"
  />
          </div>

          {
    /* Desktop filters */
  }
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            <select value={filterType} onChange={(e) => {
    setFilterType(e.target.value);
    setPage(1);
  }} className={selectCls}>
              <option value="">All activities</option>
              {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => {
    setFilterStatus(e.target.value);
    setPage(1);
  }} className={selectCls}>
              <option value="">All statuses</option>
              {JOB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {
    /* Date range */
  }
            <div className="flex items-center gap-1.5">
              <label className="text-[12px] text-[var(--hw-neutral-700)] whitespace-nowrap">From</label>
              <input type="date" value={dateFrom} onChange={(e) => {
    setDateFrom(e.target.value);
    setPage(1);
  }} className={inputCls} />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[12px] text-[var(--hw-neutral-700)] whitespace-nowrap">To</label>
              <input type="date" value={dateTo} onChange={(e) => {
    setDateTo(e.target.value);
    setPage(1);
  }} className={inputCls} />
            </div>
            {hasActiveFilters && <button
    onClick={resetFilters}
    className="text-[12px] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-600)] transition-colors whitespace-nowrap"
  >
                Clear filters
              </button>}
          </div>

          {
    /* Mobile filter button */
  }
          <button
    onClick={() => setFilterOpen(true)}
    className="sm:hidden flex items-center gap-1.5 px-3 py-2 border border-[var(--hw-neutral-200)] bg-white rounded-xl text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-amber-500" />}
          </button>
        </div>

        {filtered.length !== HISTORY.length && <p className="text-[12px] text-[var(--hw-neutral-700)]">
            {filtered.length} of {HISTORY.length} activities
          </p>}
      </div>

      {
    /* Desktop table */
  }
      <div className="hidden sm:block bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        {filtered.length === 0 ? <p className="px-4 py-10 text-center text-[var(--hw-neutral-700)] text-[13px]">No activities match your search or filters.</p> : <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                  <tr>
                    {["Date & Time", "Source / Module", "Activity Type", "Result", "Status", "Initiated By"].map((h) => <th key={h} className="px-3 py-2.5 text-left font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {pageRows.map((row) => {
    const cfg = STATUS_CFG[row.status];
    return <tr
      key={row.id}
      onClick={() => navigate(`/admin/history/${row.id}`)}
      className="hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
    >
                        <td className="px-3 py-3 text-[var(--hw-neutral-700)] whitespace-nowrap">{row.datetime}</td>
                        <td className="px-3 py-3 font-medium text-[var(--hw-neutral-800)]">{row.sourceModule}</td>
                        <td className="px-3 py-3 text-[var(--hw-neutral-600)]">{row.activity}</td>
                        <td className="px-3 py-3 text-[var(--hw-neutral-800)]">{row.result}</td>
                        <td className="px-3 py-3">
                          <span className={`flex items-center gap-1.5 ${cfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                            <span className="font-medium whitespace-nowrap">{row.status}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[var(--hw-neutral-700)]">{row.initiatedBy}</td>
                      </tr>;
  })}
                </tbody>
              </table>
            </div>

            {
    /* Pagination */
  }
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-[var(--hw-neutral-100)]">
              <p className="text-[12px] text-[var(--hw-neutral-700)]">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} activities
              </p>
              <div className="flex items-center gap-1">
                <button
    disabled={safePage === 1}
    onClick={() => setPage((p) => p - 1)}
    className="px-2.5 py-1 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => <button
    key={p}
    onClick={() => setPage(p)}
    className={`px-2.5 py-1 text-[12px] border rounded-lg transition-colors ${p === safePage ? "border-[var(--hw-green-600)] bg-[var(--hw-green-700)] text-white" : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                    {p}
                  </button>)}
                <button
    disabled={safePage === totalPages}
    onClick={() => setPage((p) => p + 1)}
    className="px-2.5 py-1 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
                  Next
                </button>
              </div>
            </div>
          </>}
      </div>

      {
    /* Mobile cards */
  }
      <div className="sm:hidden space-y-2">
        {filtered.length === 0 ? <p className="py-10 text-center text-[var(--hw-neutral-700)] text-[13px]">No activities match your search or filters.</p> : <>
            {pageRows.map((row) => {
    const cfg = STATUS_CFG[row.status];
    return <div
      key={row.id}
      onClick={() => navigate(`/admin/history/${row.id}`)}
      className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-2 cursor-pointer hover:bg-[var(--hw-neutral-50)] transition-colors"
    >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--hw-neutral-800)] truncate">{row.sourceModule}</p>
                      <p className="text-[12px] text-[var(--hw-neutral-800)]">{row.activity}</p>
                    </div>
                    <span className={`flex items-center gap-1.5 flex-shrink-0 ${cfg.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      <span className="text-[11px] font-medium">{row.status}</span>
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--hw-neutral-700)]">{row.datetime} · {row.result}</p>
                </div>;
  })}
            {
    /* Mobile pagination */
  }
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
    disabled={safePage === 1}
    onClick={() => setPage((p) => p - 1)}
    className="px-4 py-2 text-[13px] font-medium border border-[var(--hw-neutral-200)] rounded-xl text-[var(--hw-neutral-700)] bg-white hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
                ← Prev
              </button>
              <span className="text-[12px] text-[var(--hw-neutral-700)]">Page {safePage} of {totalPages}</span>
              <button
    disabled={safePage === totalPages}
    onClick={() => setPage((p) => p + 1)}
    className="px-4 py-2 text-[13px] font-medium border border-[var(--hw-neutral-200)] rounded-xl text-[var(--hw-neutral-700)] bg-white hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
                Next →
              </button>
            </div>
          </>}
      </div>

      {
    /* Mobile filter bottom sheet */
  }
      {filterOpen && <>
          <div className="fixed inset-0 z-40 bg-black/40 sm:hidden" onClick={() => setFilterOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 sm:hidden bg-white rounded-t-2xl shadow-[var(--shadow-xl)] p-5 space-y-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-[var(--hw-neutral-900)]">Filter</p>
              <button onClick={() => setFilterOpen(false)} className="p-1.5 text-[var(--hw-neutral-700)]"><X className="w-5 h-5" /></button>
            </div>

            {
    /* Date range */
  }
            <div>
              <p className="text-[13px] font-semibold text-[var(--hw-neutral-700)] mb-2">Date Range</p>
              <div className="space-y-2">
                <div>
                  <label className="text-[12px] text-[var(--hw-neutral-700)] mb-1 block">From</label>
                  <input type="date" value={dateFrom} onChange={(e) => {
    setDateFrom(e.target.value);
    setPage(1);
  }} className={inputCls + " w-full"} />
                </div>
                <div>
                  <label className="text-[12px] text-[var(--hw-neutral-700)] mb-1 block">To</label>
                  <input type="date" value={dateTo} onChange={(e) => {
    setDateTo(e.target.value);
    setPage(1);
  }} className={inputCls + " w-full"} />
                </div>
              </div>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-[var(--hw-neutral-700)] mb-2">Activity Type</p>
              <div className="flex flex-col gap-1.5">
                {["", ...ACTIVITY_TYPES].map((t) => <button
    key={t}
    onClick={() => {
      setFilterType(t);
      setPage(1);
    }}
    className={`text-left px-3 py-2 rounded-xl text-[13px] font-medium border transition-colors
                      ${filterType === t ? "bg-[var(--hw-green-700)] text-white border-[var(--hw-green-700)]" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                    {t || "All activities"}
                  </button>)}
              </div>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-[var(--hw-neutral-700)] mb-2">Status</p>
              <div className="flex flex-col gap-1.5">
                {["", ...JOB_STATUSES].map((s) => <button
    key={s}
    onClick={() => {
      setFilterStatus(s);
      setPage(1);
    }}
    className={`text-left px-3 py-2 rounded-xl text-[13px] font-medium border transition-colors
                      ${filterStatus === s ? "bg-[var(--hw-green-700)] text-white border-[var(--hw-green-700)]" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-600)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                    {s || "All statuses"}
                  </button>)}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
    onClick={() => {
      resetFilters();
      setFilterOpen(false);
    }}
    className="flex-1 py-2.5 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
                Reset
              </button>
              <button
    onClick={() => setFilterOpen(false)}
    className="flex-1 py-2.5 bg-[var(--hw-green-700)] text-white rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors"
  >
                Apply
              </button>
            </div>
          </div>
        </>}
    </div>;
}
export {
  AdminHistory as default
};
