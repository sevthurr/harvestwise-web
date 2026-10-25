import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { useNavigate } from "react-router";
import {
  ChevronRight,
  RefreshCw,
  Upload,
  SlidersHorizontal,
  Users,
  ClipboardList
} from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
import { adminApi } from "../../../services/api";
import { formatApiTime, formatPersonName, formatDisplayLabel } from "../../global/utils/apiTransforms";

const QUICK_ACCESS = [
  { Icon: Upload,             label: "Import & Validate",    path: "/admin/import" },
  { Icon: SlidersHorizontal, label: "Weights & Thresholds", path: "/admin/modules?tab=weights" },
  { Icon: Users,             label: "Manage Users",          path: "/admin/system?tab=users" },
  { Icon: ClipboardList,     label: "Audit Logs",            path: "/admin/audit-logs" }
];

const ISSUE_STATUS = {
  Warning: { dot: "bg-amber-400", text: "text-amber-700" },
  Failed: { dot: "bg-red-500", text: "text-red-700" },
  Delayed: { dot: "bg-orange-400", text: "text-orange-700" }
};

const ACTIVITY_STATUS_CFG = {
  Completed: { text: "text-emerald-700" },
  Failed: { text: "text-red-700" },
  Published: { text: "text-blue-700" }
};

const KNOWN_ACTIVITY_NAMES = {
  "analytics.outputs_computed": "Analytics Outputs Computed",
  "data_source.sync": "Data Source Sync",
  "data_source.created": "Data Source Created",
  "data_source.updated": "Data Source Updated",
  "import.file_uploaded": "File Uploaded",
  "import.completed": "Import Completed",
  "import.failed": "Import Failed",
  "auth.login": "User Login",
  "auth.logout": "User Logout",
  "auth.password_change": "Password Changed",
  "auth.password_reset": "Password Reset",
  "config.updated": "Configuration Updated",
  "threshold.updated": "Threshold Updated",
  "weight.updated": "Weight Updated",
  "user.created": "User Created",
  "user.updated": "User Updated",
  "user.approved": "Account Approved",
  "user.rejected": "Account Rejected"
};

function formatActivityName(action) {
  if (!action) return "Activity Recorded";
  const trimmed = String(action).trim();
  if (KNOWN_ACTIVITY_NAMES[trimmed.toLowerCase()]) {
    return KNOWN_ACTIVITY_NAMES[trimmed.toLowerCase()];
  }
  return trimmed
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === "dftc") return "DFTC";
      if (lower === "api") return "API";
      if (lower === "kpi") return "KPI";
      if (lower === "id") return "ID";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function getGreeting() {
  const hour = Number(new Intl.DateTimeFormat("en-PH", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, error: queryErr } = useQuery({
    queryKey: ["adminDashboard"],
    queryFn: () => adminApi.getDashboard({ _t: Date.now() }),
    staleTime: 30000,
    refetchOnMount: true,
    refetchInterval: 30000,
  });


  const error = queryErr ? (queryErr.message || "Failed to load dashboard") : null;

  const s = data?.summary || {};
  const attentionCount = s.sources_requiring_attention ?? s.sourcesRequiringAttention ?? (data?.sources_requiring_attention?.length || data?.sourcesRequiringAttention?.length || 0);
  const kpis = {
    uploadedToday: s.uploaded_today ?? s.uploadedToday ?? 0,
    recordsIngestedToday: s.records_ingested_today ?? s.recordsIngestedToday ?? 0,
    sourcesRequiringAttention: attentionCount,
    registeredFarmers: s.registered_farmers ?? s.registeredFarmers ?? 0
  };

  const attentionSources = (data?.sources_requiring_attention || []).map((src) => ({
    id: src.id,
    source: formatDisplayLabel(src.source_name || "Unknown source"),
    type: src.source_type || src.ingestion_method || "—",
    issue: src.reason || "Requires attention",
    status: "Warning",
    path: src.id ? `/admin/data-sources/${src.id}` : "/admin/data-sources"
  }));

  const todayActivities = (data?.recent_audit_logs || []).map((log) => ({
    time: formatApiTime(log.created_at) || "—",
    activity: formatActivityName(log.action),
    performedBy: log.actor_name ? formatPersonName(log.actor_name) : log.user_id || "System",
    status: "Completed"
  }));


  // Greeting: use first_name; if unavailable, parse username before the first dot/underscore
  const rawFirstName =
    user?.first_name ||
    (user?.username ? user.username.split(/[._]/)[0] : null) ||
    "Admin";
  const adminName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);
  const greeting = `${getGreeting()}, ${adminName}!`;

  const kpiCards = [
    {
      value: kpis.uploadedToday.toString(),
      label: "Uploaded Today",
      subtext: kpis.uploadedToday > 0
        ? `${kpis.uploadedToday} data file${kpis.uploadedToday > 1 ? "s" : ""} ingested today`
        : "Data files ingested today",
      path: "/admin/data-sources?tab=history"
    },
    {
      value: kpis.recordsIngestedToday.toLocaleString(),
      label: "Records Ingested Today",
      subtext: kpis.recordsIngestedToday > 0
        ? `${kpis.recordsIngestedToday.toLocaleString()} market data points captured`
        : "Daily market data points captured",
      path: "/admin/data-sources?tab=history"
    },
    {
      value: kpis.sourcesRequiringAttention.toString(),
      label: "Sources Requiring Attention",
      subtext: kpis.sourcesRequiringAttention === 0
        ? "All data sources operational"
        : `${kpis.sourcesRequiringAttention} source${kpis.sourcesRequiringAttention > 1 ? "s" : ""} need review`,
      path: "/admin/system?tab=health"
    },
    {
      value: kpis.registeredFarmers.toString(),
      label: "Registered Farmers",
      subtext: kpis.registeredFarmers > 0
        ? `${kpis.registeredFarmers} active farmer accounts`
        : "Verified active farmer accounts",
      path: "/admin/system?tab=users"
    }
  ];

  return (
    <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-5 sm:py-6 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5 sm:space-y-7">
      {/* ── Header ── */}
      <PageHeader
        title={greeting}
        description="Manage uploads, API sync, processed outputs, and publishing for the farmer app."
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          Unable to load dashboard data: {error}
        </div>
      )}

      {/* ── KPI task cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {kpiCards.map((c) => (
          <button
            key={c.label}
            onClick={() => navigate(c.path)}
            className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3 sm:p-4 text-left hover:bg-[var(--hw-neutral-50)] transition-colors active:scale-[.98] group flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10.5px] sm:text-[11px] font-semibold uppercase tracking-wide text-[var(--hw-neutral-600)] line-clamp-1">
                {c.label}
              </span>
              <span className="text-[11px] font-semibold text-[var(--hw-green-700)] opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                View →
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-[var(--hw-neutral-900)] leading-none mb-1 sm:mb-1.5">
                {c.value}
              </p>
              <p className="text-[11px] sm:text-[12px] text-[var(--hw-neutral-500)] leading-snug line-clamp-2">
                {c.subtext}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Quick access shortcuts ── */}
      <div className="grid grid-cols-4 gap-2 sm:gap-6 py-4 sm:py-6 my-2 sm:my-4">
        {QUICK_ACCESS.map((q) => (
          <button
            key={q.label}
            onClick={() => navigate(q.path)}
            className="flex flex-col items-center justify-start gap-1.5 sm:gap-2.5 py-2.5 px-1 rounded-xl hover:bg-black/[0.02] active:scale-95 transition-all cursor-pointer group text-center"
          >
            <q.Icon
              className="w-7 h-7 sm:w-8 sm:h-8 text-[var(--hw-green-800)] group-hover:text-[var(--hw-green-700)] group-hover:scale-105 transition-transform duration-150"
              strokeWidth={1.75}
            />
            <span className="text-[11.5px] sm:text-[13px] font-medium text-[var(--hw-neutral-800)] group-hover:text-[var(--hw-green-900)] leading-tight">
              {q.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Sources requiring attention ── */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--hw-neutral-100)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[var(--hw-neutral-800)]">Sources requiring attention</p>
            {attentionSources.length > 0 && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {attentionSources.length}
              </span>
            )}
          </div>
          <button
            onClick={() => navigate("/admin/system?tab=health")}
            className="text-[12px] font-medium text-[var(--hw-green-700)] hover:underline inline-flex items-center gap-0.5"
          >
            System Health <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {attentionSources.length === 0 ? (
          <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
            <RefreshCw className="w-5 h-5 text-[var(--hw-neutral-400)]" />
            <p className="text-[13px] font-medium text-[var(--hw-neutral-600)]">No source alerts</p>
            <p className="text-[12px] text-[var(--hw-neutral-500)] max-w-xs">
              There are currently no active alerts for your data sources.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {attentionSources.map((s, i) => {
              const cfg = ISSUE_STATUS[s.status] || { dot: "bg-amber-400", text: "text-amber-700" };
              const PrimaryIcon = s.primaryIcon || RefreshCw;
              return (
                <div
                  key={i}
                  onClick={() => s.path && navigate(s.path)}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-start">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--hw-neutral-800)]">
                        {s.source || "Unknown source"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[12px] text-[var(--hw-neutral-700)]">
                          {s.type || "—"}
                        </span>
                        <span className="text-[var(--hw-neutral-300)]">·</span>
                        <span className={`text-[11px] font-medium ${cfg.text}`}>
                          {s.issue || "Requires attention"}
                        </span>
                      </div>
                      <p className="text-[12px] text-[var(--hw-neutral-700)] mt-0.5">
                        Last activity: {s.lastActivity || "—"}
                      </p>
                    </div>
                    {s.primaryAction && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="px-2.5 py-1 text-[12px] font-medium text-[var(--hw-green-700)] border border-[var(--hw-green-400)] rounded-lg hover:bg-[var(--hw-green-50)] transition-colors inline-flex items-center gap-1 whitespace-nowrap flex-shrink-0 self-start"
                      >
                        <PrimaryIcon className="w-3 h-3" />
                        {s.primaryAction}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Today's Activity ── */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--hw-neutral-100)]">
          <p className="font-semibold text-[var(--hw-neutral-800)]">Today's Activity</p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-y-auto max-h-[320px]">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
                {["Time", "Activity", "Performed By", "Status"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-2.5 font-semibold text-[var(--hw-neutral-700)] text-[11px] uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hw-neutral-100)]">
              {todayActivities.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-sm text-[var(--hw-neutral-500)] italic"
                  >
                    No activity recorded today.
                  </td>
                </tr>
              ) : (
                todayActivities.slice(0, 10).map((row, i) => {
                  const cfg = ACTIVITY_STATUS_CFG[row.status] || { text: "text-[var(--hw-neutral-700)]" };
                  return (
                    <tr
                      key={i}
                      onClick={() => row.path && navigate(row.path)}
                      className="cursor-pointer"
                    >
                      <td className="px-5 py-3 text-[var(--hw-neutral-700)] whitespace-nowrap w-20">
                        {row.time || "—"}
                      </td>
                      <td className="px-5 py-3 font-medium text-[var(--hw-neutral-800)]">
                        {row.activity || "Activity recorded"}
                      </td>
                      <td className="px-5 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">
                        {row.performedBy || "—"}
                      </td>
                      <td className={`px-5 py-3 whitespace-nowrap font-medium ${cfg.text}`}>
                        {row.status || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-[var(--hw-neutral-100)] overflow-y-auto max-h-[400px]">
          {todayActivities.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[var(--hw-neutral-500)] italic">
              No activity recorded today.
            </div>
          ) : (
            todayActivities.slice(0, 10).map((row, i) => {
              const cfg = ACTIVITY_STATUS_CFG[row.status] || { text: "text-[var(--hw-neutral-700)]" };
              return (
                <div
                  key={i}
                  onClick={() => row.path && navigate(row.path)}
                  className="px-5 py-3 flex items-start justify-between gap-2 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[var(--hw-neutral-800)] leading-snug">
                      {row.activity || "Activity recorded"}
                    </p>
                    <p className="text-[12px] text-[var(--hw-neutral-700)] mt-0.5">
                      {row.time || "—"} · {row.performedBy || "—"}
                    </p>
                  </div>
                  <span className={`text-[12px] font-medium flex-shrink-0 ${cfg.text}`}>
                    {row.status || "—"}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-[var(--hw-neutral-100)]">
          <button
            onClick={() => navigate("/admin/data-sources?tab=history")}
            className="text-[13px] font-medium text-[var(--hw-green-700)] flex items-center gap-1"
          >
            View History <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
