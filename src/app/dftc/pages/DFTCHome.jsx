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
  ArrowRight
} from "lucide-react";
import { DFTCKpiCard } from "../components/DFTCKpiCard";
import { DFTCArrivalVolumeCard } from "../components/DFTCArrivalVolumeCard";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { DFTCFilePreview } from "../components/DFTCFilePreview";
import { DFTCArrivalPreview } from "../components/DFTCArrivalPreview";
import { apiGet, parseResponse } from "../../global/api";
import {
  buildSavedDatasetsList,
  formatMarketName,
  getLocalDateString
} from "./dftcSavedDatasets";

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
    queryKey: ["dftc", "submissions"],
    queryFn: async () => {
      const res = await apiGet("/dftc/submissions?page=1&page_size=50");
      return parseResponse(res);
    },
    refetchOnMount: "always"
  });

  const { data: homeData, isLoading: loadingHome } = useQuery({
    queryKey: ["dftc", "home"],
    queryFn: async () => {
      const res = await apiGet("/dftc/home");
      return parseResponse(res);
    },
    refetchOnMount: "always"
  });

  const kpis = homeData?.kpis || {};
  const isLoading = loadingSubmissions || loadingHome;
  const submissions = submissionsData?.items || [];

  const priceSubmissionsToday = submissions.filter(
    (s) =>
      (s.data_type === "price" || s.data_type === "daily_price") &&
      (s.reporting_date === todayStr || (s.saved_at && s.saved_at.slice(0, 10) === todayStr)) &&
      (s.status?.toLowerCase() === "saved" || s.status?.toLowerCase() === "validated" || s.status?.toLowerCase() === "accepted")
  );

  const arrivalSubmissionsToday = submissions.filter(
    (s) =>
      s.data_type === "arrival_volume" &&
      (s.reporting_date === todayStr || (s.saved_at && s.saved_at.slice(0, 10) === todayStr)) &&
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
    refetchOnMount: "always"
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

  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const recentSaved = useMemo(() => {
    const all = buildSavedDatasetsList(submissions, todayStr, todayReportRecordCount);
    return all.filter((item) => {
      const rawDate = item.savedAtRaw || item.reportingDate;
      if (!rawDate) return false;
      const d = new Date(rawDate);
      const isWithin7Days = !isNaN(d.getTime()) && d >= sevenDaysAgo;
      return isWithin7Days || item.isToday;
    });
  }, [submissions, todayStr, todayReportRecordCount, sevenDaysAgo]);

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
      encodedBy: file.encodedBy || meta.encodedBy || "MARIA S. SANTOS",
      encodedByRole: file.encodedByRole || meta.encodedByRole || "Data Analyst",
      reviewedBy: file.reviewedBy || meta.reviewedBy || "MARIA S. SANTOS",
      reviewedByRole: file.reviewedByRole || meta.reviewedByRole || "Data Analyst"
    });
  };

  const volatileItems = (homeData?.price_movement || []).filter(
    (p) => p.change_pct !== null && p.change_pct !== undefined && Math.abs(p.change_pct) >= 10.0
  );
  const priceVolatilityCount = kpis.price_volatility_alerts_count ?? volatileItems.length;
  const topVolatile = kpis.top_volatile_commodity || volatileItems[0]?.crop_name || null;

  const oversupplyCount = kpis.oversupply_commodities_count ?? 0;
  const topOversupply = kpis.top_oversupply_commodity || null;

  const priceSubmissionsCount = priceSubmissionsToday.reduce((sum, s) => sum + (s.record_count || 0), 0) || priceSubmissionsToday.length;
  const arrivalSubmissionsCount = arrivalSubmissionsToday.reduce((sum, s) => sum + (s.record_count || 0), 0) || arrivalSubmissionsToday.length;

  const priceRecordsTodayVal = kpis.price_records_today || priceSubmissionsCount || 0;
  const arrivalRecordsTodayVal = kpis.arrival_records_today || arrivalSubmissionsCount || 0;

  const latestPriceSub =
    priceSubmissionsToday[0] ||
    submissions.find((s) => s.data_type === "price" || s.data_type === "daily_price");

  const latestArrivalSub =
    arrivalSubmissionsToday[0] ||
    submissions.find((s) => s.data_type === "arrival_volume");

  if (previewFile) {
    const PreviewComponent = previewFile.isArrival ? DFTCArrivalPreview : DFTCFilePreview;
    return (
      <div className="px-4 md:px-8 lg:px-10 py-6 pb-24 md:pb-12 max-w-[1440px] mx-auto">
        <PreviewComponent file={previewFile} onClose={() => setPreviewFile(null)} />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      <PageHeader
        title={`Good ${getTimeOfDay()}, ${roleName}`}
        description="Review today's market-data activity and continue encoding or uploading records."
      />

      {/* ── Operational Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DFTCKpiCard
          label="Price Records Today"
          value={priceRecordsTodayVal}
          loading={isLoading}
          labelColor="text-[var(--hw-neutral-800)]"
          valueColor="text-[var(--hw-neutral-900)]"
          onClick={() => {
            if (latestPriceSub?.id) {
              navigate(`/dftc/submissions/${latestPriceSub.id}`);
            } else {
              navigate("/dftc/submissions");
            }
          }}
        />
        <DFTCKpiCard
          label="Arrival Records Today"
          value={arrivalRecordsTodayVal}
          loading={isLoading}
          labelColor="text-[var(--hw-neutral-800)]"
          valueColor="text-[var(--hw-neutral-900)]"
          onClick={() => {
            if (latestArrivalSub?.id) {
              navigate(`/dftc/submissions/${latestArrivalSub.id}`);
            } else {
              navigate("/dftc/submissions");
            }
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
          label="Oversupply Commodities"
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => navigate("/dftc/price-input")}
          className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-colors flex items-center gap-4"
        >
          <div className="p-2.5 bg-[var(--hw-green-50)] rounded-xl shrink-0">
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
          className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-colors flex items-center gap-4"
        >
          <div className="p-2.5 bg-[var(--hw-green-50)] rounded-xl shrink-0">
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
          className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-colors flex items-center gap-4"
        >
          <div className="p-2.5 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <Upload className="w-5 h-5 text-[var(--hw-green-700)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Upload Dataset</p>
            <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">Import an Excel or CSV dataset</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--hw-neutral-100)] flex items-center justify-between">
          <div>
            <p className="font-semibold text-[var(--hw-neutral-900)]">Recent Saved Data</p>
            <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">
              Datasets saved and validated in the last 7 days
            </p>
          </div>
          <button
            onClick={() => navigate("/dftc/submissions")}
            className="text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors shrink-0"
          >
            View Data History
          </button>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--hw-neutral-100)] last:border-0">
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-40 bg-[var(--hw-neutral-200)] rounded" />
                  <div className="h-3 w-56 bg-[var(--hw-neutral-200)] rounded" />
                </div>
                <div className="h-4 w-16 bg-[var(--hw-neutral-200)] rounded" />
              </div>
            ))}
          </div>
        ) : recentSaved.length === 0 ? (
          <div className="p-6 text-center text-[var(--hw-neutral-500)] text-[13px]">
            No saved datasets from the last 7 days. Encoded or uploaded datasets will appear here.
          </div>
        ) : (
          <div className="divide-y divide-[var(--hw-neutral-100)] max-h-[345px] overflow-y-auto">
            {recentSaved.map((row) => (
              <button
                key={row.id}
                onClick={() => handleSelectFile(row)}
                className="w-full px-5 py-3.5 flex items-center gap-4 text-left hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium text-[var(--hw-neutral-900)] truncate">{row.name}</p>
                    {row.isToday && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--hw-green-50)] text-[var(--hw-green-700)] border border-[var(--hw-green-200)] shrink-0">
                        Today
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">
                    {row.market} · {row.entryMethod} · {row.savedAt}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-medium text-[var(--hw-neutral-900)]">{row.submissionId || row.id}</p>
                  <p className="text-[12px] text-[var(--hw-green-700)] mt-0.5 capitalize">{row.status}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
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
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {(homeData?.price_movement || []).map((item) => (
                <button
                  key={item.commodity_id}
                  onClick={() => navigate(`/dftc/trends?commodity=${item.commodity_id}`)}
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
              ))}
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
          onSelectCommodity={(commodityId) => navigate(`/dftc/trends?tab=arrival&commodity=${commodityId}`)}
        />
      </div>
    </div>
  );
}

export { DFTCHome as default };
