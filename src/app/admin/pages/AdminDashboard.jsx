import { useState } from "react";
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

const QUICK_ACCESS = [
  { Icon: Upload,             label: "Import & Validate",    path: "/admin/import" },
  { Icon: SlidersHorizontal, label: "Weights & Thresholds", path: "/admin/analytics/thresholds" },
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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Dynamic KPI counts (defaults to 0 per specification)
  const [kpis, setKpis] = useState({
    uploadedToday: 0,
    advisoriesCreated: 0,
    forReview: 0,
    failedUploads: 0
  });

  // Sources requiring attention (empty by default until populated by live data)
  const [attentionSources, setAttentionSources] = useState([]);

  // Today's activity list (empty by default until populated by live logs)
  const [todayActivities, setTodayActivities] = useState([]);

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
      insight: "Completed uploads from today's processing history.",
      color: "text-emerald-700",
      dot: "bg-emerald-500",
      path: "/admin/history"
    },
    {
      value: kpis.advisoriesCreated.toString(),
      label: "Advisories Created",
      insight: "Advisory outputs generated from analytical processing.",
      color: "text-blue-700",
      dot: "bg-blue-500",
      path: "/admin/analytics"
    },
    {
      value: kpis.forReview.toString(),
      label: "For Review",
      insight: "Uploads that need checking before publishing.",
      color: "text-amber-700",
      dot: "bg-amber-400",
      path: "/admin/data-sources"
    },
    {
      value: kpis.failedUploads.toString(),
      label: "Failed Uploads",
      insight: "Uploads or data processes that failed today.",
      color: "text-red-700",
      dot: "bg-red-500",
      path: "/admin/data-sources"
    }
  ];

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 max-w-[1440px] mx-auto space-y-5">
      {/* ── Header ── */}
      <PageHeader
        title={greeting}
        description="Manage uploads, API sync, processed outputs, and publishing for the farmer app."
      />

      {/* ── KPI task cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiCards.map((c) => (
          <button
            key={c.label}
            onClick={() => navigate(c.path)}
            className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-4 text-left hover:bg-[var(--hw-neutral-50)] transition-colors active:scale-[.98] group"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
              <span className={`text-[11px] font-semibold uppercase tracking-wide ${c.color}`}>
                {c.label}
              </span>
            </div>
            <p className={`text-3xl font-bold ${c.color} leading-none`}>{c.value}</p>
            <p className={`text-[11px] font-medium mt-2 ${c.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
              View →
            </p>
          </button>
        ))}
      </div>

      {/* ── Quick access shortcut grid ── */}
      <div>
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide mb-3">
          Quick access
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUICK_ACCESS.map((q) => (
            <button
              key={q.label}
              onClick={() => navigate(q.path)}
              className="bg-white border border-[var(--hw-green-600)] rounded-2xl shadow-[var(--shadow-xs)] py-5 px-3 flex flex-col items-center gap-2.5 hover:bg-[var(--hw-green-50)] hover:border-[var(--hw-green-700)] active:scale-[.97] transition-all"
            >
              <q.Icon className="w-5 h-5 text-[var(--hw-green-700)]" />
              <span className="text-[12px] font-medium text-[var(--hw-green-900)] text-center leading-snug">
                {q.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Sources requiring attention ── */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--hw-neutral-100)] flex items-center justify-between gap-3">
          <p className="font-semibold text-[var(--hw-neutral-800)]">Sources requiring attention</p>
          {attentionSources.length > 0 && (
            <span className="text-[11px] font-semibold text-amber-700">
              {attentionSources.length}
            </span>
          )}
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
                      className="hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
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
                  className="px-5 py-3 flex items-start justify-between gap-2 cursor-pointer hover:bg-[var(--hw-neutral-50)] transition-colors"
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
            onClick={() => navigate("/admin/history")}
            className="text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70 flex items-center gap-1"
          >
            View History <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
