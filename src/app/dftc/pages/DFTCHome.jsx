import { useState, useMemo } from "react";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../global/contexts/AuthContext";
import {
  PenLine,
  Truck,
  Upload,
  ChevronRight,
  TrendingUp,
  ArrowRight,
  FileText
} from "lucide-react";
import { DFTCKpiCard } from "../components/DFTCKpiCard";
import { DFTCArrivalVolumeCard } from "../components/DFTCArrivalVolumeCard";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { DFTCFilePreview } from "../components/DFTCFilePreview";
import { DFTCArrivalPreview } from "../components/DFTCArrivalPreview";
import { apiGet, parseResponse } from "../../global/api";
import {
  DFTC_HOME_KEY,
  DFTC_SUBMISSIONS_KEY,
  DFTC_WORKSPACE_STALE_TIME,
  fetchDftcHome,
  fetchDftcSubmissions,
} from "../../global/hooks/dftcWorkspaceQueries";
import {
  buildSavedDatasetsList,
  formatMarketName,
  getLocalDateString,
  isSubmissionToday
} from "./dftcSavedDatasets";

const PAGE_SIZE = 10;

function Pagination({ page, total, pageSize = PAGE_SIZE, onChange }) {
  const pages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-3.5 border-t border-[var(--hw-neutral-100)]">
      <p className="text-[13px] text-[var(--hw-neutral-800)]">
        Showing {start}–{end} of {total} datasets
      </p>
      {pages > 1 && (
        <div className="flex gap-1.5 items-center">
          <button
            disabled={page === 1}
            onClick={() => onChange(page - 1)}
            className="px-3 py-1.5 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Prev
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`px-3 py-1.5 text-[13px] border rounded-lg transition-colors cursor-pointer ${
                p === page
                  ? "border-[var(--hw-green-600)] bg-[var(--hw-green-700)] text-white font-semibold"
                  : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={page === pages}
            onClick={() => onChange(page + 1)}
            className="px-3 py-1.5 text-[13px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function DFTCHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleName = user?.role_name || user?.role?.role_name || (typeof user?.role === "string" ? user.role : null) || "DFTC";
  const todayDate = new Date();
  const todayStr = getLocalDateString(todayDate);

  const { data: submissionsData, isLoading: loadingSubmissions } = useQuery({
    queryKey: DFTC_SUBMISSIONS_KEY,
    queryFn: fetchDftcSubmissions,
    staleTime: DFTC_WORKSPACE_STALE_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const { data: homeData, isLoading: loadingHome } = useQuery({
    queryKey: DFTC_HOME_KEY,
    queryFn: fetchDftcHome,
    staleTime: DFTC_WORKSPACE_STALE_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const kpis = homeData?.kpis || {};
  const isLoading = loadingSubmissions || loadingHome;
  const submissions = submissionsData?.items || [];

  const priceSubmissionsToday = submissions.filter(
    (s) =>
      (s.data_type === "price" || s.data_type === "daily_price") &&
      isSubmissionToday(s, todayStr) &&
      (s.status?.toLowerCase() === "saved" || s.status?.toLowerCase() === "validated" || s.status?.toLowerCase() === "accepted")
  );

  const arrivalSubmissionsToday = submissions.filter(
    (s) =>
      s.data_type === "arrival_volume" &&
      isSubmissionToday(s, todayStr) &&
      (s.status?.toLowerCase() === "saved" || s.status?.toLowerCase() === "validated" || s.status?.toLowerCase() === "accepted")
  );

  const [previewFile, setPreviewFile] = useState(null);

  const { data: todayReportPreview } = useQuery({
    queryKey: ["dftc-report-preview", todayStr],
    queryFn: async () => {
      const res = await apiGet(`/dftc/reports/preview?date=${todayStr}`);
      return parseResponse(res);
    },
    enabled: !!todayStr,
    staleTime: 30000,
    refetchOnMount: true
  });

  const todayReportRecordCount = useMemo(() => {
    if (!todayReportPreview?.rows) return 0;
    return todayReportPreview.rows.filter(
      (r) =>
        r.bangkerohan_landing != null ||
        r.bangkerohan_wholesale != null ||
        r.bangkerohan_retail != null ||
        r.dftc_taboan_wholesale != null ||
        r.dftc_taboan_retail != null
    ).length;
  }, [todayReportPreview]);

  const [page, setPage] = useState(1);

  const savedDataList = useMemo(() => {
    const all = buildSavedDatasetsList(submissions, todayStr, todayReportRecordCount);
    return all.filter((s) => s.isToday || s.isJustSaved);
  }, [submissions, todayStr, todayReportRecordCount]);

  const totalPages = Math.ceil(savedDataList.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const displayedSavedData = savedDataList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSelectFile = (file) => {
    if (file.isFileUpload) {
      navigate(`/dftc/submissions/${file.submissionId || file.id}`);
      return;
    }

    let meta = {};
    try {
      const stored = localStorage.getItem(`dftc_report_personnel_${file.reportingDate}`);
      if (stored) meta = JSON.parse(stored);
    } catch {}

    setPreviewFile({
      reportId: file.id,
      submissionId: file.submissionId,
      isArrival: file.isArrival,
      analyticsRecords: file.analyticsRecords,
      otherRecords: file.otherRecords,
      dataName: file.dataName || file.name,
      dataType: file.dataType,
      market: file.market,
      submissionMethod: file.submissionMethod,
      entryMethod: file.submissionMethod,
      reportingDate: file.reportingDate || file.savedDate,
      savedDate: file.savedDate,
      records: file.records,
      encodedBy: meta.encodedBy || file.encodedBy || "MARIA S. SANTOS",
      encodedByRole: meta.encodedByRole || file.encodedByRole || "Data Analyst",
      reviewedBy: meta.reviewedBy || file.reviewedBy || "MARIA S. SANTOS",
      reviewedByRole: meta.reviewedByRole || file.reviewedByRole || "Data Analyst"
    });
  };

  const volatileItems = (homeData?.price_movement || []).filter(
    (p) => p.change_pct !== null && p.change_pct !== undefined && Math.abs(p.change_pct) >= 10.0
  );
  const priceVolatilityCount = kpis.price_volatility_alerts_count ?? volatileItems.length;
  const topVolatile = kpis.top_volatile_commodity || volatileItems[0]?.crop_name || null;

  const oversupplyCount = kpis.oversupply_commodities_count ?? 0;
  const topOversupply = kpis.top_oversupply_commodity || null;

  const priceSubmissionsCount = priceSubmissionsToday.reduce((sum, s) => sum + (s.record_count || 0), 0);
  const arrivalSubmissionsCount = arrivalSubmissionsToday.reduce((sum, s) => sum + (s.record_count || 0), 0);

  const priceRecordsTodayVal = Math.max(kpis.price_records_today || 0, priceSubmissionsCount || 0);
  const arrivalRecordsTodayVal = Math.max(kpis.arrival_records_today || 0, arrivalSubmissionsCount || 0);

  const latestPriceSub =
    priceSubmissionsToday[0] ||
    submissions.find((s) => s.data_type === "price" || s.data_type === "daily_price");

  const latestArrivalSub =
    arrivalSubmissionsToday[0] ||
    submissions.find((s) => s.data_type === "arrival_volume");

  if (previewFile) {
    const PreviewComponent = previewFile.isArrival ? DFTCArrivalPreview : DFTCFilePreview;
    return (
      <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 pb-24 md:pb-12 max-w-[1440px] mx-auto">
        <PreviewComponent file={previewFile} onClose={() => setPreviewFile(null)} />
      </div>
    );
  }

  return (
    <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-3 sm:space-y-5">
      <PageHeader
        title={`Good ${getTimeOfDay()}, ${roleName}`}
        description="Review today's market-data activity and continue encoding or uploading records."
      />

      {/* ── Operational Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <DFTCKpiCard
          label="Price Records Today"
          value={priceRecordsTodayVal}
          loading={isLoading}
          labelColor="text-[var(--hw-neutral-800)]"
          valueColor="text-[var(--hw-neutral-900)]"
          onClick={() => {
            navigate("/dftc/submissions?highlight=price");
          }}
        />
        <DFTCKpiCard
          label="Arrival Records Today"
          value={arrivalRecordsTodayVal}
          loading={isLoading}
          labelColor="text-[var(--hw-neutral-800)]"
          valueColor="text-[var(--hw-neutral-900)]"
          onClick={() => {
            navigate("/dftc/submissions?highlight=arrival");
          }}
        />
        <DFTCKpiCard
          label="Price Volatility Alerts"
          value={priceVolatilityCount}
          sub={priceVolatilityCount === 1 ? "1 commodity with >10% shift" : `${priceVolatilityCount} commodities with >10% shift`}
          loading={isLoading}
          labelColor="text-[var(--hw-neutral-800)]"
          valueColor={priceVolatilityCount > 0 ? "text-amber-600" : "text-[var(--hw-neutral-900)]"}
          onClick={() => {
            if (priceVolatilityCount === 0) {
              navigate("/dftc/trends?tab=price");
            } else if (priceVolatilityCount === 1) {
              navigate(`/dftc/trends?tab=price&commodity=${encodeURIComponent(topVolatile || "")}`);
            } else {
              navigate("/dftc/trends?tab=price&alert=volatility");
            }
          }}
        />
        <DFTCKpiCard
          label="High Arrival Commodities"
          value={oversupplyCount}
          sub={oversupplyCount === 1 ? "1 in high arrival pressure (≥Q3)" : `${oversupplyCount} in high arrival pressure (≥Q3)`}
          loading={isLoading}
          labelColor="text-[var(--hw-neutral-800)]"
          valueColor={oversupplyCount > 0 ? "text-rose-600" : "text-[var(--hw-neutral-900)]"}
          onClick={() => {
            if (oversupplyCount === 0) {
              navigate("/dftc/trends?tab=arrival");
            } else if (oversupplyCount === 1) {
              navigate(`/dftc/trends?tab=arrival&commodity=${encodeURIComponent(topOversupply || "")}`);
            } else {
              navigate("/dftc/trends?tab=arrival&alert=oversupply");
            }
          }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <button
          onClick={() => navigate("/dftc/price-input")}
          className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3 sm:p-4 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-colors flex items-center gap-3 sm:gap-4"
        >
          <div className="p-2 sm:p-2.5 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <PenLine className="w-5 h-5 text-[var(--hw-green-700)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Encode Price Data</p>
            <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">Encode daily commodity market prices</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />
        </button>
        <button
          onClick={() => navigate("/dftc/arrival-input")}
          className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3 sm:p-4 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-colors flex items-center gap-3 sm:gap-4"
        >
          <div className="p-2 sm:p-2.5 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <Truck className="w-5 h-5 text-[var(--hw-green-700)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Encode Arrival Volume</p>
            <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">Encode DFTC commodity arrival volumes</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />
        </button>
        <button
          onClick={() => navigate("/dftc/upload")}
          className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3 sm:p-4 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-colors flex items-center gap-3 sm:gap-4"
        >
          <div className="p-2 sm:p-2.5 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <Upload className="w-5 h-5 text-[var(--hw-green-700)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Upload Dataset</p>
            <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">Import an Excel or CSV dataset</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-[var(--hw-neutral-900)]">Price Movement</p>
            <TrendingUp className="w-4 h-4 text-[var(--hw-neutral-400)]" />
          </div>
          {loadingHome ? (
            <div className="py-6 text-center text-[var(--hw-neutral-500)] text-[13px]">Loading…</div>
          ) : (homeData?.price_movement || []).length === 0 ? (
            <div className="py-6 text-center text-[var(--hw-neutral-500)] text-[13px]">
              No price movement data available yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
              {(homeData?.price_movement || []).map((item) => {
                const targetMarket = formatMarketName(item.market);
                const marketParam = (targetMarket === "DFTC Taboan" || targetMarket === "Bankerohan Public Market")
                  ? targetMarket
                  : (String(item.market || "").toLowerCase().includes("dftc") ? "DFTC Taboan" : "Bankerohan Public Market");
                const priceTypeParam = (item.price_type && String(item.price_type).toLowerCase().includes("wholesale"))
                  ? "Wholesale"
                  : "Retail";
                const commParam = item.crop_name || item.commodity_id;
                const queryParts = [
                  "tab=price",
                  `commodity=${encodeURIComponent(commParam)}`,
                  item.variety ? `variety=${encodeURIComponent(item.variety)}` : null,
                  `market=${encodeURIComponent(marketParam)}`,
                  `price_type=${encodeURIComponent(priceTypeParam)}`
                ].filter(Boolean);

                return (
                  <button
                    key={item.commodity_id}
                    onClick={() => navigate(`/dftc/trends?${queryParts.join("&")}`)}
                    className="w-full flex items-center justify-between gap-3 text-left hover:bg-[var(--hw-neutral-50)] rounded-lg p-2 -m-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CommodityIllustration
                        commodityId={item.commodity_id}
                        commodityName={item.crop_name}
                        className="w-8 h-8 shrink-0 object-contain"
                      />
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-[var(--hw-neutral-900)] truncate">
                          {item.crop_name}{item.variety ? ` · ${item.variety}` : ""}
                        </p>
                        <p className="text-[12px] text-[var(--hw-neutral-800)] truncate">
                          {formatMarketName(item.market)} · {item.price_type || "Retail"}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
                        {item.current_price != null ? `₱${item.current_price}/${item.unit || ""}` : "\u2014"}
                      </p>
                      <p className={`text-[12px] font-medium ${item.direction === "down" ? "text-red-600" : item.direction === "up" ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-500)]"}`}>
                        {item.change_pct != null
                          ? `${item.direction === "down" ? "↓" : "↑"} ${Math.abs(item.change_pct)}%`
                          : "\u2014"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <button
            onClick={() => navigate("/dftc/trends")}
            className="mt-4 flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
          >
            View Price Trends <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <DFTCArrivalVolumeCard
          loadingHome={loadingHome}
          latestArrivalVolume={homeData?.latest_arrival_volume}
          onViewTrends={() => navigate("/dftc/trends?tab=arrival")}
          onSelectCommodity={(commodityName, commodityId) => {
            const target = commodityName || commodityId;
            navigate(`/dftc/trends?tab=arrival&commodity=${encodeURIComponent(target)}`);
          }}
        />
      </div>

      {/* Today's Saved Data */}
      <div className="space-y-4">
        <div>
          <h2 className="text-[16px] sm:text-[17px] font-bold text-[var(--hw-neutral-900)]">Today's Saved Data</h2>
          <p className="text-[13px] text-[var(--hw-neutral-600)] mt-0.5">
            Datasets saved or imported today. All records are securely retained.
          </p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-6 space-y-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--hw-neutral-100)] last:border-0">
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-48 bg-[var(--hw-neutral-200)] rounded" />
                  <div className="h-3 w-32 bg-[var(--hw-neutral-200)] rounded" />
                </div>
                <div className="h-4 w-16 bg-[var(--hw-neutral-200)] rounded" />
              </div>
            ))}
          </div>
        ) : savedDataList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-5 py-12 text-center">
            <FileText className="w-9 h-9 text-[var(--hw-neutral-300)] mx-auto mb-2" />
            <p className="text-[14px] text-[var(--hw-neutral-700)] font-medium">No saved data today.</p>
            <p className="text-[12px] text-[var(--hw-neutral-500)] mt-1">Datasets saved or uploaded today will appear here.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
              <table className="w-full">
                <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                  <tr>
                    {["Data Name", "Data Type", "Market or Facility", "Submission Method", "Saved Date", "Records"].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-[12px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {displayedSavedData.map((file) => (
                    <tr
                      key={file.id}
                      onClick={() => handleSelectFile(file)}
                      className="hover:bg-[var(--hw-neutral-50)] cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-[var(--hw-neutral-900)] font-medium">{file.dataName}</span>
                          {file.isNew && (
                            <span className="text-[10px] font-semibold text-[var(--hw-green-700)] bg-[var(--hw-green-50)] border border-[var(--hw-green-200)] rounded px-1.5 py-0.5 leading-none whitespace-nowrap">
                              New
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-[var(--hw-neutral-700)] whitespace-nowrap">{file.dataType}</td>
                      <td className="px-5 py-4 text-[13px] text-[var(--hw-neutral-700)] whitespace-nowrap">{file.market}</td>
                      <td className="px-5 py-4 text-[13px] text-[var(--hw-neutral-700)] whitespace-nowrap">{file.submissionMethod || file.entryMethod}</td>
                      <td className="px-5 py-4 text-[13px] text-[var(--hw-neutral-700)] whitespace-nowrap">{file.savedDate}</td>
                      <td className="px-5 py-4 text-[13px] font-medium text-[var(--hw-neutral-900)]">{file.records ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={currentPage} total={savedDataList.length} pageSize={PAGE_SIZE} onChange={setPage} />
            </div>

            {/* Mobile cards */}
            <div className="block md:hidden space-y-3">
              {displayedSavedData.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleSelectFile(file)}
                  className="w-full bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left hover:bg-[var(--hw-neutral-50)] transition-colors active:scale-[.99] cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)] leading-snug group-hover:text-[var(--hw-green-800)] transition-colors">
                      {file.dataName}
                    </p>
                    {file.isNew && (
                      <span className="text-[10px] font-semibold text-[var(--hw-green-700)] bg-[var(--hw-green-50)] border border-[var(--hw-green-200)] rounded px-2 py-0.5 leading-none shrink-0">
                        New
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-[var(--hw-neutral-600)]">
                    <span className="font-medium text-[var(--hw-neutral-700)]">{file.dataType}</span>
                    <span className="text-[var(--hw-neutral-300)]">•</span>
                    <span>{file.market}</span>
                    {(file.submissionMethod || file.entryMethod) && (
                      <>
                        <span className="text-[var(--hw-neutral-300)]">•</span>
                        <span>{file.submissionMethod || file.entryMethod}</span>
                      </>
                    )}
                    {file.savedBy && (
                      <>
                        <span className="text-[var(--hw-neutral-300)]">•</span>
                        <span>Saved by {file.savedBy}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--hw-neutral-100)] text-[12px]">
                    <span className="font-semibold text-[var(--hw-neutral-900)]">{file.records ?? 0} records</span>
                  </div>
                </button>
              ))}

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 border border-[var(--hw-neutral-200)] rounded-lg text-[13px] text-[var(--hw-neutral-800)] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-1.5 text-[13px] text-[var(--hw-neutral-800)] font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 border border-[var(--hw-neutral-200)] rounded-lg text-[13px] text-[var(--hw-neutral-800)] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { DFTCHome as default };
