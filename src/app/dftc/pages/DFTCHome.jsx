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
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  AlertTriangle,
  FileSpreadsheet
} from "lucide-react";
import { DFTCKpiCard } from "../components/DFTCKpiCard";
import { DFTCArrivalVolumeCard } from "../components/DFTCArrivalVolumeCard";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { apiGet, parseResponse } from "../../global/api";

function formatMarketName(sourceId) {
  if (!sourceId) return "\u2014";
  const lower = sourceId.toLowerCase();
  if (lower.includes("bkrh") || lower.includes("bangkerohan") || lower.includes("bankerohan")) {
    return "Bangkerohan Public Market";
  }
  if (lower.includes("dftc") || lower.includes("taboan")) {
    return "DFTC Taboan";
  }
  return sourceId;
}

function formatRequirementName(dataType, priceType) {
  if (dataType === "arrival_volume" || dataType === "arrival") {
    return "Arrival Volume";
  }
  if (priceType) {
    return `${priceType.charAt(0).toUpperCase() + priceType.slice(1).toLowerCase()} Prices`;
  }
  return "Price Records";
}

function formatDatasetTitle(dataType, priceType) {
  if (dataType === "arrival_volume" || dataType === "arrival") {
    return "DFTC Arrival Volume";
  }
  if (priceType) {
    return `Daily ${priceType.charAt(0).toUpperCase() + priceType.slice(1).toLowerCase()} Prices`;
  }
  return "Daily Prices";
}

function isSubmissionFileUpload(sub) {
  if (!sub) return false;
  const m = String(sub.submission_method || "").toLowerCase();
  if (m.includes("upload") || m.includes("file") || m.includes("excel") || m.includes("csv")) {
    return true;
  }
  return Boolean(sub.original_file_name || sub.file_name);
}

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatSavedDate(val) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return String(val);
  }
}

function formatDateTimeDisplay(val) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const dateStr = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    return `${dateStr} · ${timeStr}`;
  } catch {
    return String(val);
  }
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function StatusBadge({ status }) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "saved" || normalized === "validated" || normalized === "accepted") {
    return (
      <span className="flex items-center gap-1.5">
        <CheckCircle className="w-3.5 h-3.5 text-[var(--hw-green-700)] shrink-0" />
        <span className="text-[13px] text-[var(--hw-green-700)] font-medium">Saved</span>
      </span>
    );
  }
  if (normalized.includes("correction") || normalized === "needs correction") {
    return (
      <span className="flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
        <span className="text-[13px] text-orange-700 font-medium">Needs Correction</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <Clock className="w-3.5 h-3.5 text-[var(--hw-neutral-500)] shrink-0" />
      <span className="text-[13px] text-[var(--hw-neutral-800)] font-medium">Not Encoded</span>
    </span>
  );
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
    }
  });

  const { data: requirementsData, isLoading: loadingRequirements } = useQuery({
    queryKey: ["dftc", "requirements"],
    queryFn: async () => {
      const res = await apiGet("/dftc/requirements");
      return parseResponse(res);
    }
  });

  const { data: homeData, isLoading: loadingHome } = useQuery({
    queryKey: ["dftc", "home"],
    queryFn: async () => {
      const res = await apiGet("/dftc/home");
      return parseResponse(res);
    }
  });

  const kpis = homeData?.kpis || {};
  const isLoading = loadingSubmissions || loadingRequirements || loadingHome;
  const submissions = submissionsData?.items || [];
  const requirements = requirementsData?.items || [];

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


  const needsCorrectionSubmissions = submissions.filter(
    (s) => s.status?.toLowerCase().includes("correction") || s.status?.toLowerCase() === "needs correction"
  );

  const requirementsList =
    requirements.length > 0
      ? requirements
      : (homeData?.today_status || []).map((ts) => ({
          id: ts.requirement_id || `${ts.source_id}-${ts.data_type}`,
          source_id: ts.source_id,
          source_name: ts.source_name || ts.source_id,
          data_type: ts.data_type,
          price_type: ts.price_type,
          status: ts.status,
          submission_id: ts.submission_id,
          last_saved: ts.last_saved
        }));

  const statusRows = requirementsList.map((req) => {
    const matchingSub = submissions.find((s) => {
      const matchSource = s.source_id === req.source_id;
      const matchDataType = s.data_type === req.data_type;
      const matchPriceType = (s.price_type || null) === (req.price_type || null);
      const isDateToday =
        s.reporting_date === todayStr ||
        (s.saved_at && getLocalDateString(new Date(s.saved_at)) === todayStr) ||
        (s.created_at && getLocalDateString(new Date(s.created_at)) === todayStr);
      return matchSource && matchDataType && matchPriceType && isDateToday;
    });

    const matchingHomeStatus = (homeData?.today_status || []).find(
      (ts) =>
        ts.requirement_id === req.id ||
        (ts.source_id === req.source_id &&
          ts.data_type === req.data_type &&
          (ts.price_type || null) === (req.price_type || null))
    );

    let status = req.status || matchingHomeStatus?.status || "Not Encoded";
    let savedDatasetId = req.submission_id || matchingHomeStatus?.submission_id || null;
    let historyDatasetId = null;
    let rawDate = req.last_saved || matchingHomeStatus?.last_saved || null;

    if (matchingSub) {
      const subStatus = (matchingSub.status || "").toLowerCase();
      if (subStatus === "saved" || subStatus === "validated" || subStatus === "accepted") {
        status = "Saved";
        savedDatasetId = matchingSub.id;
      } else if (subStatus.includes("correction")) {
        status = "Needs Correction";
        historyDatasetId = matchingSub.id;
      }
      if (matchingSub.saved_at || matchingSub.created_at) {
        rawDate = matchingSub.saved_at || matchingSub.created_at;
      }
    }

    const lastSaved = formatDateTimeDisplay(rawDate);
    const entryPath =
      req.data_type === "arrival_volume" ? "/dftc/arrival-input" : "/dftc/price-input";

    return {
      id: req.id,
      requirement: formatRequirementName(req.data_type, req.price_type),
      market: formatMarketName(req.source_name || req.source_id),
      status,
      lastSaved,
      savedDatasetId,
      historyDatasetId,
      entryPath
    };
  });

  const attentionItems = [];
  needsCorrectionSubmissions.forEach((sub) => {
    attentionItems.push({
      label: `${formatMarketName(sub.source_name || sub.source_id)} ${sub.price_type || sub.data_type} records need correction`,
      action: "Review Records",
      path: `/dftc/submissions/${sub.id}`
    });
  });

  statusRows
    .filter((row) => row.status === "Not Encoded")
    .forEach((row) => {
      attentionItems.push({
        label: `${row.market} ${row.requirement.toLowerCase()} not yet entered`,
        action: "Continue Entry",
        path: row.entryPath
      });
    });

  const failedUploads = submissions.filter((s) => s.status?.toLowerCase() === "failed");
  if (failedUploads.length > 0) {
    attentionItems.push({
      label: `${failedUploads.length} uploaded file${failedUploads.length > 1 ? "s" : ""} failed validation`,
      action: "Retry Upload",
      path: "/dftc/upload"
    });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentSavedSubmissions = submissions.filter((sub) => {
    const rawDate = sub.saved_at || sub.created_at || sub.reporting_date;
    if (!rawDate) return false;
    const subDate = new Date(rawDate);
    if (isNaN(subDate.getTime())) return false;
    const isWithin7Days = subDate >= sevenDaysAgo;
    const status = (sub.status || "").toLowerCase();
    const isSaved = status === "saved" || status === "validated" || status === "accepted" || !status;
    return isWithin7Days && isSaved;
  });

  const recentSaved = recentSavedSubmissions.map((sub) => {
    const savedTimeDisplay = formatSavedDate(sub.saved_at || sub.created_at || sub.reporting_date);
    const isToday =
      sub.reporting_date === todayStr ||
      (sub.saved_at && getLocalDateString(new Date(sub.saved_at)) === todayStr) ||
      (sub.created_at && getLocalDateString(new Date(sub.created_at)) === todayStr);

    const isFileUpload = isSubmissionFileUpload(sub);
    const name = isFileUpload
      ? (sub.original_file_name || sub.file_name || formatDatasetTitle(sub.data_type, sub.price_type))
      : formatDatasetTitle(sub.data_type, sub.price_type);

    return {
      id: sub.id,
      name,
      market: formatMarketName(sub.source_name || sub.source_id),
      entryMethod: isFileUpload ? "File Upload" : "Manual Input",
      savedAt: savedTimeDisplay,
      records: sub.record_count ?? "—",
      status: sub.status || "Saved",
      isToday: Boolean(isToday)
    };
  });

  const volatileItems = (homeData?.price_movement || []).filter(
    (p) => p.change_pct !== null && p.change_pct !== undefined && Math.abs(p.change_pct) >= 10.0
  );
  const priceVolatilityCount = kpis.price_volatility_alerts_count ?? volatileItems.length;
  const topVolatile = kpis.top_volatile_commodity || volatileItems[0]?.crop_name || null;

  const oversupplyCount = kpis.oversupply_commodities_count ?? 0;
  const topOversupply = kpis.top_oversupply_commodity || null;

  const hasAttentionItems = attentionItems.length > 0;

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

      {hasAttentionItems && (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--hw-neutral-100)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
            <p className="font-semibold text-[var(--hw-neutral-900)]">Needs Attention</p>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {attentionItems.map((item, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <p className="text-[13px] text-[var(--hw-neutral-800)]">{item.label}</p>
                <button
                  onClick={() => navigate(item.path)}
                  className="shrink-0 flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors whitespace-nowrap"
                >
                  {item.action}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                onClick={() => navigate(`/dftc/submissions/${row.id}`)}
                className="w-full px-5 py-3.5 flex items-center gap-4 text-left hover:bg-[var(--hw-neutral-50)] transition-colors"
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
                  <p className="text-[13px] font-medium text-[var(--hw-neutral-900)]">{row.id}</p>
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
