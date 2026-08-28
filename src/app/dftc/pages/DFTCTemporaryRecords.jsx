import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Download, X, Loader2, FileSpreadsheet, AlertCircle, Leaf } from "lucide-react";
import {
  TEMP_RECORDS,
  getExpiryInfo,
  formatDate
} from "./dftc-temp-records-data";
const selectCls = [
  "w-full px-3 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg bg-white",
  "text-[var(--hw-neutral-800)] focus:outline-none focus:border-[var(--hw-green-600)]",
  "focus:ring-1 focus:ring-[var(--hw-green-600)] transition-colors appearance-none"
].join(" ");
const inputCls = selectCls.replace("appearance-none", "");
const labelCls = "block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1";
const EMPTY_FILTERS = {
  commodity: "",
  sourceCategory: "",
  market: "",
  priceType: "",
  dateFrom: "",
  dateTo: "",
  expiryStatus: ""
};
function applyFilters(records, f) {
  return records.filter((r) => {
    if (f.commodity && !r.commodity.toLowerCase().includes(f.commodity.toLowerCase())) return false;
    if (f.sourceCategory && r.sourceCategory !== f.sourceCategory) return false;
    if (f.market && r.market !== f.market) return false;
    if (f.priceType && r.priceType !== f.priceType) return false;
    if (f.dateFrom && r.recordDate < f.dateFrom) return false;
    if (f.dateTo && r.recordDate > f.dateTo) return false;
    if (f.expiryStatus) {
      const { label } = getExpiryInfo(r.storageExpiryDate);
      if (f.expiryStatus === "Active" && (label === "Expired" || label.startsWith("Expires"))) return false;
      if (f.expiryStatus === "Expiring Within 3 Days" && !label.startsWith("Expires")) return false;
      if (f.expiryStatus === "Expired" && label !== "Expired") return false;
    }
    return true;
  });
}
const EXCEL_EMPTY = {
  dateFrom: "2026-07-18",
  dateTo: "2026-08-02",
  market: "",
  priceType: "",
  sourceCategory: "",
  commodity: "",
  includePrevDownloaded: true
};
function ExcelModal({
  onClose,
  onDownloaded
}) {
  const [excelStep, setExcelStep] = useState("form");
  const [form, setForm] = useState(EXCEL_EMPTY);
  const genTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  function handleGenerate() {
    setExcelStep("loading");
    setTimeout(() => setExcelStep("success"), 1200);
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">

        {
    /* Header */
  }
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--hw-neutral-100)] flex-shrink-0">
          <div>
            <p className="font-semibold text-[var(--hw-neutral-900)]">Download Temporary Market Records</p>
            {excelStep === "form" && <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">
                Generate an Excel report containing the selected active temporary market records.
              </p>}
          </div>
          <button onClick={onClose} className="p-1 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-700)] flex-shrink-0 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {
    /* Body */
  }
        <div className="flex-1 overflow-y-auto">

          {
    /* ── Form ── */
  }
          {excelStep === "form" && <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Date From</label>
                  <input
    type="date"
    className={inputCls}
    value={form.dateFrom}
    onChange={(e) => setForm((f) => ({ ...f, dateFrom: e.target.value }))}
  />
                </div>
                <div>
                  <label className={labelCls}>Date To</label>
                  <input
    type="date"
    className={inputCls}
    value={form.dateTo}
    onChange={(e) => setForm((f) => ({ ...f, dateTo: e.target.value }))}
  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Market</label>
                <select className={selectCls} value={form.market} onChange={(e) => setForm((f) => ({ ...f, market: e.target.value }))}>
                  <option value="">All Markets</option>
                  <option>Bangkerohan Public Market</option>
                  <option>DFTC Taboan</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Price Type</label>
                <select className={selectCls} value={form.priceType} onChange={(e) => setForm((f) => ({ ...f, priceType: e.target.value }))}>
                  <option value="">All Price Types</option>
                  <option>Retail</option>
                  <option>Wholesale</option>
                  <option>Landing</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Source Category</label>
                <select className={selectCls} value={form.sourceCategory} onChange={(e) => setForm((f) => ({ ...f, sourceCategory: e.target.value }))}>
                  <option value="">All Categories</option>
                  <option>Lowland Vegetables</option>
                  <option>Highland Vegetables</option>
                  <option>Spices</option>
                  <option>Rootcrops</option>
                  <option>Fruits</option>
                  <option>Others</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Commodity</label>
                <input
    className={inputCls}
    value={form.commodity}
    placeholder="All commodities"
    onChange={(e) => setForm((f) => ({ ...f, commodity: e.target.value }))}
  />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
    type="checkbox"
    checked={form.includePrevDownloaded}
    onChange={(e) => setForm((f) => ({ ...f, includePrevDownloaded: e.target.checked }))}
    className="w-4 h-4 accent-[var(--hw-green-700)]"
  />
                <span className="text-[13px] text-[var(--hw-neutral-800)]">Include previously downloaded records</span>
              </label>

              {
    /* Preview summary */
  }
              <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-1.5 border border-[var(--hw-neutral-200)]">
                {[
    ["Records to include", "148"],
    ["Earliest record date", "Jul 18, 2026"],
    ["Latest record date", "Aug 2, 2026"]
  ].map(([label, val]) => <div key={label} className="flex justify-between gap-3">
                    <span className="text-[12px] text-[var(--hw-neutral-700)]">{label}</span>
                    <span className="text-[12px] font-semibold text-[var(--hw-neutral-800)]">{val}</span>
                  </div>)}
              </div>
            </div>}

          {
    /* ── Loading ── */
  }
          {excelStep === "loading" && <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-[var(--hw-green-700)] animate-spin" />
              <p className="text-[13px] text-[var(--hw-neutral-800)]">Generating Excel report...</p>
            </div>}

          {
    /* ── Success ── */
  }
          {excelStep === "success" && <div className="px-5 py-5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <FileSpreadsheet className="w-5 h-5 flex-shrink-0" />
                <p className="font-semibold">Excel report generated successfully</p>
              </div>
              <div className="border border-[var(--hw-neutral-200)] rounded-xl p-4 space-y-2">
                {[
    ["File name", "DFTC-Temporary-Market-Records-Aug-02-2026.xlsx"],
    ["Number of records", "148"],
    ["Generated", `Aug 2, 2026 \xB7 ${genTime}`]
  ].map(([label, val]) => <div key={label} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center sm:gap-3">
                    <span className="text-[12px] text-[var(--hw-neutral-700)]">{label}</span>
                    <span className="text-[12px] font-semibold text-[var(--hw-neutral-800)] sm:text-right break-all">{val}</span>
                  </div>)}
              </div>
              <p className="text-[12px] text-[var(--hw-neutral-800)] leading-snug">
                These records are for temporary market reporting only and are not used for HarvestWise forecasting or farmer advisories.
              </p>
            </div>}

          {
    /* ── Error ── */
  }
          {excelStep === "error" && <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <p className="font-medium text-[var(--hw-neutral-800)]">Report generation failed</p>
              <p className="text-[12px] text-[var(--hw-neutral-800)]">An error occurred while generating the report. Please try again.</p>
            </div>}
        </div>

        {
    /* Footer */
  }
        <div className="px-5 py-4 border-t border-[var(--hw-neutral-100)] flex gap-2 flex-shrink-0">
          {excelStep === "form" && <>
              <button
    onClick={onClose}
    className="flex-1 py-2.5 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
                Cancel
              </button>
              <button
    onClick={handleGenerate}
    className="flex-[2] bg-[var(--hw-green-700)] text-white py-2.5 rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors flex items-center justify-center gap-2"
  >
                <Download className="w-3.5 h-3.5" />
                Generate Excel Report
              </button>
            </>}
          {excelStep === "success" && <>
              <button
    onClick={onClose}
    className="flex-1 py-2.5 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
                Close
              </button>
              <button
    onClick={() => {
      onDownloaded();
      onClose();
    }}
    className="flex-[2] bg-[var(--hw-green-700)] text-white py-2.5 rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors flex items-center justify-center gap-2"
  >
                <Download className="w-3.5 h-3.5" />
                Download File
              </button>
            </>}
          {excelStep === "error" && <>
              <button
    onClick={onClose}
    className="flex-1 py-2.5 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
                Close
              </button>
              <button
    onClick={() => setExcelStep("form")}
    className="flex-[2] bg-[var(--hw-green-700)] text-white py-2.5 rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors"
  >
                Try Again
              </button>
            </>}
        </div>
      </div>
    </div>;
}
const PAGE_SIZE = 20;
function DFTCTemporaryRecords() {
  const navigate = useNavigate();
  const [filterForm, setFilterForm] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [showExcel, setShowExcel] = useState(false);
  const [downloadedAll, setDownloadedAll] = useState(false);
  const filtered = applyFilters(TEMP_RECORDS, appliedFilters);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = Object.values(appliedFilters).some((v) => v !== "");
  const isEmpty = TEMP_RECORDS.length === 0;
  const noResults = !isEmpty && filtered.length === 0;
  function handleApply() {
    setAppliedFilters({ ...filterForm });
    setPage(1);
  }
  function handleClear() {
    setFilterForm(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  }
  function dlStatusCls(s) {
    if (s === "Included") return "text-emerald-700";
    if (s === "Previously Downloaded") return "text-[var(--hw-neutral-800)]";
    return "text-[var(--hw-neutral-700)]";
  }
  return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">

      {showExcel && <ExcelModal
    onClose={() => setShowExcel(false)}
    onDownloaded={() => setDownloadedAll(true)}
  />}

      {
    /* Page header */
  }
      <div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">Temporary Market Records</h1>
            <p className="text-[13px] text-[var(--hw-neutral-800)] mt-0.5 max-w-xl">
              Official market records stored temporarily for reporting and Excel download. These records are not used for forecasting or farmer advisories.
            </p>
          </div>
          <button
    onClick={() => setShowExcel(true)}
    className="flex items-center gap-2 px-4 py-2.5 bg-[var(--hw-green-700)] text-white rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors sm:flex-shrink-0 w-full sm:w-auto justify-center"
  >
            <Download className="w-4 h-4" />
            Download Excel Report
          </button>
        </div>
      </div>

      {
    /* Summary cards */
  }
      <div className="grid grid-cols-3 gap-3">
        {[
    { label: "Active Temporary Records", value: "148" },
    { label: "Expiring Within 3 Days", value: "24" },
    { label: "Included in Current Report", value: downloadedAll ? "0" : "148" }
  ].map((c) => <div key={c.label} className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
            <p className="text-2xl font-bold text-[var(--hw-neutral-900)] leading-none">{c.value}</p>
            <p className="text-[11px] font-medium text-[var(--hw-neutral-700)] mt-1.5 leading-snug">{c.label}</p>
          </div>)}
      </div>

      {
    /* Filters */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-800)]">Filters</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div>
            <label className={labelCls}>Commodity</label>
            <input
    className={inputCls}
    placeholder="All commodities"
    value={filterForm.commodity}
    onChange={(e) => setFilterForm((f) => ({ ...f, commodity: e.target.value }))}
  />
          </div>
          <div>
            <label className={labelCls}>Source Category</label>
            <select
    className={selectCls}
    value={filterForm.sourceCategory}
    onChange={(e) => setFilterForm((f) => ({ ...f, sourceCategory: e.target.value }))}
  >
              <option value="">All Categories</option>
              <option>Lowland Vegetables</option>
              <option>Highland Vegetables</option>
              <option>Spices</option>
              <option>Rootcrops</option>
              <option>Fruits</option>
              <option>Others</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Market</label>
            <select
    className={selectCls}
    value={filterForm.market}
    onChange={(e) => setFilterForm((f) => ({ ...f, market: e.target.value }))}
  >
              <option value="">All Markets</option>
              <option>Bangkerohan Public Market</option>
              <option>DFTC Taboan</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Price Type</label>
            <select
    className={selectCls}
    value={filterForm.priceType}
    onChange={(e) => setFilterForm((f) => ({ ...f, priceType: e.target.value }))}
  >
              <option value="">All Price Types</option>
              <option>Retail</option>
              <option>Wholesale</option>
              <option>Landing</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Date From</label>
            <input
    type="date"
    className={inputCls}
    value={filterForm.dateFrom}
    onChange={(e) => setFilterForm((f) => ({ ...f, dateFrom: e.target.value }))}
  />
          </div>
          <div>
            <label className={labelCls}>Date To</label>
            <input
    type="date"
    className={inputCls}
    value={filterForm.dateTo}
    onChange={(e) => setFilterForm((f) => ({ ...f, dateTo: e.target.value }))}
  />
          </div>
        </div>
        <div>
          <label className={labelCls}>Expiry Status</label>
          <select
    className={`${selectCls} sm:max-w-[200px]`}
    value={filterForm.expiryStatus}
    onChange={(e) => setFilterForm((f) => ({ ...f, expiryStatus: e.target.value }))}
  >
            <option value="">All Records</option>
            <option>Active</option>
            <option>Expiring Within 3 Days</option>
            <option>Expired</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
    onClick={handleApply}
    className="px-4 py-2 bg-[var(--hw-green-700)] text-white rounded-xl text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors"
  >
            Apply Filters
          </button>
          {hasFilters && <button
    onClick={handleClear}
    className="px-4 py-2 border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
              Clear Filters
            </button>}
        </div>
      </div>

      {
    /* Records table */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        {
    /* Table header */
  }
        <div className="px-4 py-3 border-b border-[var(--hw-neutral-100)] flex items-center justify-between gap-3">
          <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)]">
            {hasFilters ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} \xB7 filtered` : `${TEMP_RECORDS.length} records \xB7 sample`}
          </p>
          {totalPages > 1 && <p className="text-[12px] text-[var(--hw-neutral-800)]">
              Page {page} of {totalPages}
            </p>}
        </div>

        {
    /* Empty states */
  }
        {isEmpty && <div className="py-12 text-center">
            <Leaf className="w-8 h-8 text-[var(--hw-neutral-300)] mx-auto mb-3" />
            <p className="text-[13px] text-[var(--hw-neutral-800)]">No temporary market records are currently stored.</p>
          </div>}

        {noResults && <div className="py-12 text-center">
            <p className="text-[13px] text-[var(--hw-neutral-800)]">No temporary records match the selected filters.</p>
            <button onClick={handleClear} className="mt-2 text-[12px] font-medium text-[var(--hw-green-700)] hover:opacity-70">
              Clear filters
            </button>
          </div>}

        {
    /* Table */
  }
        {!isEmpty && !noResults && <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                <tr>
                  {["Commodity", "Source Category", "Variety", "Market", "Price Type", "Record Date", "UOM", "Price", "Obs. Status", "Storage Expiry", "Download Status"].map((h) => <th key={h} className="px-3 py-2 text-left font-semibold text-[var(--hw-neutral-700)] whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                {pageRows.map((r) => {
    const expiry = getExpiryInfo(r.storageExpiryDate);
    return <tr
      key={r.recordId}
      onClick={() => navigate(`/dftc/temporary-records/${r.recordId}`)}
      className="cursor-pointer hover:bg-[var(--hw-neutral-50)] transition-colors"
    >
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-[var(--hw-neutral-100)] flex items-center justify-center flex-shrink-0">
                            <Leaf className="w-3.5 h-3.5 text-[var(--hw-neutral-800)]" />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--hw-neutral-800)]">{r.commodity}</p>
                            <p className="text-[12px] text-[var(--hw-neutral-800)]">Temporary market record</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-[var(--hw-neutral-700)]">{r.sourceCategory}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-[var(--hw-neutral-700)]">{r.variety}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-[var(--hw-neutral-700)]">{r.market}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-[var(--hw-neutral-700)]">{r.priceType}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-[var(--hw-neutral-700)]">{formatDate(r.recordDate)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-[var(--hw-neutral-700)]">{r.uom}</td>
                      <td className="px-3 py-3 whitespace-nowrap font-medium text-[var(--hw-neutral-800)]">{r.price}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-[var(--hw-neutral-700)]">{r.obsStatus}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div>
                          <p className="text-[var(--hw-neutral-700)]">{formatDate(r.storageExpiryDate)}</p>
                          {expiry.label && <p className={`text-[10px] font-medium ${expiry.cls}`}>{expiry.label}</p>}
                        </div>
                      </td>
                      <td className={`px-3 py-3 whitespace-nowrap font-medium ${dlStatusCls(downloadedAll && r.downloadStatus === "Included" ? "Previously Downloaded" : r.downloadStatus)}`}>
                        {downloadedAll && r.downloadStatus === "Included" ? "Previously Downloaded" : r.downloadStatus}
                      </td>
                    </tr>;
  })}
              </tbody>
            </table>
          </div>}

        {
    /* Pagination */
  }
        {totalPages > 1 && <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-[var(--hw-neutral-100)]">
            <p className="text-[12px] text-[var(--hw-neutral-800)]">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              <button
    disabled={page === 1}
    onClick={() => setPage((p) => p - 1)}
    className="px-2.5 py-1 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => <button
    key={p}
    onClick={() => setPage(p)}
    className={`px-2.5 py-1 text-[12px] border rounded-lg transition-colors ${p === page ? "border-[var(--hw-green-600)] bg-[var(--hw-green-700)] text-white" : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                  {p}
                </button>)}
              <button
    disabled={page === totalPages}
    onClick={() => setPage((p) => p + 1)}
    className="px-2.5 py-1 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
                Next
              </button>
            </div>
          </div>}
      </div>

    </div>;
}
export {
  DFTCTemporaryRecords as default
};
