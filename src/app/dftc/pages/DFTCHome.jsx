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

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    },
    staleTime: 30_000
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

  const datasetsSavedToday = submissions.filter(
    (s) =>
      (s.status?.toLowerCase() === "saved" || s.status?.toLowerCase() === "validated" || s.status?.toLowerCase() === "accepted") &&
      (s.reporting_date === todayStr || (s.saved_at && s.saved_at.slice(0, 10) === todayStr))
  );

  const needsCorrectionSubmissions = submissions.filter(
    (s) => s.status?.toLowerCase().includes("correction") || s.status?.toLowerCase() === "needs correction"
  );

  const statusRows = requirements.map((req) => {
    const matchingSub = submissions.find(
      (s) =>
        s.source_id === req.source_id &&
        s.data_type === req.data_type &&
        (s.price_type || null) === (req.price_type || null) &&
        (s.reporting_date === todayStr || (s.saved_at && s.saved_at.slice(0, 10) === todayStr))
    );

    let status = "Not Encoded";
    let lastSaved = "\u2014";
    let savedDatasetId = null;
    let historyDatasetId = null;

    if (matchingSub) {
      const subStatus = (matchingSub.status || "").toLowerCase();
      if (subStatus === "saved" || subStatus === "validated" || subStatus === "accepted") {
        status = "Saved";
        savedDatasetId = matchingSub.id;
      } else if (subStatus.includes("correction")) {
        status = "Needs Correction";
        historyDatasetId = matchingSub.id;
      }
      if (matchingSub.saved_at) {
        lastSaved = new Date(matchingSub.saved_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        });
      }
    }

    const entryPath =
      req.data_type === "arrival_volume" ? "/dftc/arrival-input" : "/dftc/price-input";

    return {
      id: req.id,
      requirement: formatRequirementName(req.data_type, req.price_type),
      market: formatMarketName(req.source_id),
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
      label: `${formatMarketName(sub.source_id)} ${sub.price_type || sub.data_type} records need correction`,
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

  const recentSaved = submissions.slice(0, 5).map((sub) => {
    let savedTimeDisplay = "\u2014";
    if (sub.saved_at) {
      savedTimeDisplay = new Date(sub.saved_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    } else if (sub.created_at) {
      savedTimeDisplay = new Date(sub.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    }

    return {
      id: sub.id,
      name: formatDatasetTitle(sub.data_type, sub.price_type),
      market: formatMarketName(sub.source_id),
      entryMethod: sub.submission_method || "Manual Input",
      savedAt: savedTimeDisplay,
      records: "\u2014",
      status: sub.status || "Saved"
    };
  });

  function handleRowClick(row) {
    if (row.status === "Saved" && row.savedDatasetId) {
      navigate(`/dftc/submissions/${row.savedDatasetId}`);
    } else if (row.status === "Not Encoded" && row.entryPath) {
      navigate(row.entryPath);
    } else if (row.status === "Needs Correction" && row.historyDatasetId) {
      navigate(`/dftc/submissions/${row.historyDatasetId}`);
    }
  }

  const hasAttentionItems = attentionItems.length > 0;

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
          value={kpis.price_records_today ?? (priceSubmissionsToday.length || 0)}
          loading={isLoading}
          dotColor="bg-[var(--hw-neutral-400)]"
          labelColor="text-[var(--hw-neutral-800)]"
          valueColor="text-[var(--hw-neutral-900)]"
          onClick={() => navigate("/dftc/price-input")}
        />
        <DFTCKpiCard
          label="Arrival Records Today"
          value={kpis.arrival_records_today ?? (arrivalSubmissionsToday.length || 0)}
          loading={isLoading}
          dotColor="bg-[var(--hw-neutral-400)]"
          labelColor="text-[var(--hw-neutral-800)]"
          valueColor="text-[var(--hw-neutral-900)]"
          onClick={() => navigate("/dftc/arrival-input")}
        />
        <DFTCKpiCard
          label="Datasets Saved Today"
          value={kpis.datasets_saved_today ?? (datasetsSavedToday.length || 0)}
          loading={isLoading}
          dotColor="bg-[var(--hw-green-700)]"
          labelColor="text-[var(--hw-neutral-800)]"
          valueColor="text-[var(--hw-green-700)]"
          onClick={() => navigate("/dftc/submissions")}
        />
        <DFTCKpiCard
          label="Needs Correction"
          value={kpis.needs_correction_count ?? (needsCorrectionSubmissions.length || 0)}
          loading={isLoading}
          dotColor="bg-orange-500"
          labelColor="text-[var(--hw-neutral-800)]"
          valueColor="text-orange-600"
          onClick={() => navigate("/dftc/submissions")}
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
        <div className="px-5 py-4 border-b border-[var(--hw-neutral-100)]">
          <p className="font-semibold text-[var(--hw-neutral-900)]">Today's Data Status</p>
          <p className="text-[13px] text-[var(--hw-neutral-800)] mt-0.5">
            Check which daily market datasets have already been encoded or uploaded.
          </p>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--hw-neutral-100)] last:border-0">
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-1/3 bg-[var(--hw-neutral-200)] rounded" />
                  <div className="h-3 w-1/4 bg-[var(--hw-neutral-200)] rounded" />
                </div>
                <div className="h-4 w-20 bg-[var(--hw-neutral-200)] rounded" />
              </div>
            ))}
          </div>
        ) : statusRows.length === 0 ? (
          <div className="p-6 text-center text-[var(--hw-neutral-500)] text-[13px]">
            No active data requirements configured.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                  <tr>
                    <th className="px-5 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)]">
                      Data Requirement
                    </th>
                    <th className="px-5 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)]">
                      Market / Facility
                    </th>
                    <th className="px-5 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)]">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)]">
                      Last Saved
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {statusRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleRowClick(row)}
                      className="border-b border-[var(--hw-neutral-100)] last:border-0 hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 text-[14px] font-medium text-[var(--hw-neutral-900)]">
                        {row.requirement}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-[var(--hw-neutral-800)]">{row.market}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-[var(--hw-neutral-800)]">{row.lastSaved}</td>
                      <td className="px-5 py-3.5 text-right">
                        <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-[var(--hw-neutral-100)]">
              {statusRows.map((row) => (
                <button
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[var(--hw-neutral-50)] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[var(--hw-neutral-900)]">{row.requirement}</p>
                    <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">{row.market}</p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <StatusBadge status={row.status} />
                      <span className="text-[12px] text-[var(--hw-neutral-800)]">{row.lastSaved}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}
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
          <p className="font-semibold text-[var(--hw-neutral-900)]">Recent Saved Data</p>
          <button
            onClick={() => navigate("/dftc/submissions")}
            className="text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
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
            No recent saved data found. Encoded or uploaded datasets will appear here.
          </div>
        ) : (
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {recentSaved.map((row) => (
              <button
                key={row.id}
                onClick={() => navigate(`/dftc/submissions/${row.id}`)}
                className="w-full px-5 py-3.5 flex items-center gap-4 text-left hover:bg-[var(--hw-neutral-50)] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-[var(--hw-neutral-900)] truncate">{row.name}</p>
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
                  className="w-full flex items-center justify-between gap-3 text-left hover:bg-[var(--hw-neutral-50)] rounded-lg p-2 -m-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[var(--hw-neutral-900)] truncate">
                      {item.crop_name}{item.variety ? ` · ${item.variety}` : ""}
                    </p>
                    <p className="text-[12px] text-[var(--hw-neutral-800)] truncate">
                      {formatMarketName(item.market)} · {item.price_type || "Retail"}
                    </p>
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

        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-[var(--hw-neutral-900)]">Latest Arrival Volume</p>
            <Truck className="w-4 h-4 text-[var(--hw-neutral-400)]" />
          </div>
          {loadingHome ? (
            <div className="py-6 text-center text-[var(--hw-neutral-500)] text-[13px]">Loading…</div>
          ) : (!homeData?.latest_arrival_volume || (homeData.latest_arrival_volume.combined_volume_kg || 0) <= 0) ? (
            <div className="py-6 text-center text-[var(--hw-neutral-500)] text-[13px]">
              No arrival volume records available yet.
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-[12px] text-[var(--hw-neutral-800)]">
                  Reporting Period {homeData.latest_arrival_volume.reporting_period || "\u2014"}
                </p>
                <p className="text-[22px] font-bold text-[var(--hw-neutral-900)] mt-0.5">
                  {Number(homeData.latest_arrival_volume.combined_volume_kg).toLocaleString()} <span className="text-[13px] font-medium text-[var(--hw-neutral-800)]">kg</span>
                </p>
              </div>
              <div className="space-y-1.5">
                {(homeData.latest_arrival_volume.provenance || []).map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-[13px]">
                    <span className="text-[var(--hw-neutral-800)]">{p.origin_province}</span>
                    <span className="font-medium text-[var(--hw-neutral-900)]">{Number(p.volume_kg).toLocaleString()} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => navigate("/dftc/trends")}
            className="mt-4 flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
          >
            View Arrival Volume Trends <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export { DFTCHome as default };
