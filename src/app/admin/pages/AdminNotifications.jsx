import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { Card } from "../../global/components/ui/hw-ui";
import {
  listNotifications,
  markRead as apiMarkRead,
  markAllRead as apiMarkAllRead,
} from "../../../services/api/notificationsApi";
import { NotificationIcon } from "../../global/components/shared/NotificationIcon";
import { resolveNotificationRoute } from "../../global/utils/notificationRoutes";
import { useNotificationEvent } from "../../global/contexts/NotificationStreamContext";
import { useNotificationReadState } from "../../global/hooks/useNotificationReadState";
import { useOptionalAuth } from "../../global/contexts/AuthContext";
import { parseApiDateTime } from "../../global/utils/apiTransforms";

function fmtTimestamp(isoStr) {
  if (!isoStr) return "";
  try {
    const d = parseApiDateTime(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - d.getTime());
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let relStr = "";
    if (diffMins < 1) {
      relStr = "Just now";
    } else if (diffMins < 60) {
      relStr = `${diffMins} min${diffMins === 1 ? "" : "s"} ago`;
    } else if (diffHours < 24) {
      relStr = `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    } else {
      relStr = `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    }

    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    });
    const dateStr = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    });
    return `${relStr} · ${dateStr}, ${timeStr}`;
  } catch {
    return isoStr;
  }
}

const ACTION_TITLE_MAP = {
  "system.weather_sync": "Open-Meteo Weather Forecast Sync",
  "system.weather_backfill": "Open-Meteo Historical Weather Backfill",
  "system.sync_completed": "PSA OpenStat Data Sync Completed",
  "system.sync_failed": "PSA OpenStat Data Sync Failed",
  "import.upload_received": "Dataset Upload Received",
  "import.completed": "Dataset Import Completed",
  "import.failed": "Dataset Import Failed",
  "config.crop_weather_rule_created": "Weather Risk Threshold Created",
  "config.crop_weather_rule_updated": "Weather Risk Threshold Updated",
  "config.crop_weather_rule_deleted": "Weather Risk Threshold Deleted",
  "config.threshold_rule_created": "Module Threshold Rule Created",
  "config.threshold_rule_updated": "Module Threshold Rule Updated",
  "config.threshold_rule_deleted": "Module Threshold Rule Deleted",
  "config.threshold_module_created": "Threshold Module Created",
  "config.threshold_module_updated": "Threshold Module Updated",
  "config.threshold_module_deleted": "Threshold Module Deleted",
  "config.adaptive_weight_created": "Adaptive Module Weights Created",
  "config.adaptive_weight_updated": "Adaptive Module Weights Updated",
  "config.security_policy_updated": "System Security Policy Updated",
  "calendar.event_created": "Calendar Event Added",
  "calendar.event_updated": "Calendar Event Updated",
  "calendar.event_deleted": "Calendar Event Deleted",
  "export.audit_logs_pdf": "Audit Logs Report Exported",
  "user.created": "User Account Created",
  "user.updated": "User Account Updated",
  "user.profile_updated": "Admin Profile Updated",
  "user.profile_picture_updated": "Profile Picture Updated",
  "user.activated": "User Account Activated",
  "user.deactivated": "User Account Deactivated",
  "user.role_changed": "User Role Changed",
  "auth.password_changed": "Account Password Changed",
  "analytics.outputs_computed": "Module Outputs Recomputed",
  "dftc.submission_received": "DFTC Data Submission Received",
  "dftc.submission_status_changed": "DFTC Submission Status Updated",
};

function humanizeNotificationTitle(rawTitle, metadata) {
  const action = metadata?.action;
  if (action && ACTION_TITLE_MAP[action]) {
    return ACTION_TITLE_MAP[action];
  }
  if (rawTitle === "System · Weather Sync") {
    return "Open-Meteo Weather Forecast Sync";
  }
  return rawTitle || "Notification";
}

function humanizeNotificationSummary(rawBody, actorName) {
  if (!rawBody || typeof rawBody !== "string") return "";
  let text = rawBody.trim();

  // Clean legacy Open-Meteo raw dict strings if present
  if (text.includes("Open-Meteo forecast sync") && text.includes("—")) {
    const writtenMatch = text.match(/'written':\s*(\d+)/);
    const locMatch = text.match(/'locations':\s*\[([^\]]*)\]/);
    const written = writtenMatch ? parseInt(writtenMatch[1], 10) : 0;
    const locs = locMatch
      ? locMatch[1]
          .split(",")
          .map((s) => s.replace(/['"]/g, "").trim())
          .filter(Boolean)
      : [];
    if (written > 0 && locs.length > 0) {
      text = `Synced ${written} 14-day weather forecast record(s) from Open-Meteo for ${locs.join(", ")}.`;
    } else if (written > 0) {
      text = `Verified ${written} Open-Meteo weather forecast record(s) (all locations are up to date).`;
    } else {
      text = "Open-Meteo weather forecast is already up to date.";
    }
  } else if (text.includes("PSA OpenSTAT sync") && text.includes("—")) {
    // Clean legacy PSA OpenSTAT raw dict strings if present
    const insMatch = text.match(/'rows_inserted':\s*(\d+)/);
    const updMatch = text.match(/'rows_updated':\s*(\d+)/);
    const skpMatch = text.match(/'rows_skipped':\s*(\d+)/);
    const ins = insMatch ? parseInt(insMatch[1], 10) : 0;
    const upd = updMatch ? parseInt(updMatch[1], 10) : 0;
    const skp = skpMatch ? parseInt(skpMatch[1], 10) : 0;
    text = `PSA OpenStat sync completed: ${ins} new record(s) added, ${upd} updated, ${skp} unchanged.`;
  }

  if (actorName && !text.toLowerCase().includes(actorName.toLowerCase())) {
    return `${actorName}: ${text}`;
  }

  return text;
}

function resolveActorDisplay(item, metadata) {
  const actor =
    metadata?.actor_name ||
    metadata?.submitter_name ||
    (String(metadata?.action || "").startsWith("system.") && !metadata?.actor_id
      ? "System"
      : null) ||
    (String(item?.title || "").startsWith("System ·") ? "System" : null);
  return actor || "System";
}

function AdminNotifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useOptionalAuth();
  const { readIds, isRead, markReadLocally } = useNotificationReadState(auth?.user?.id);

  const { data: notificationsData, isLoading: loading, error: queryErr, refetch } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => listNotifications(1, 50),
    refetchOnMount: "always",
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => apiMarkRead(id),
    // Optimistic: show it as read immediately, even if the request fails.
    onMutate: (id) => markReadLocally(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiMarkAllRead(),
    onMutate: () => {
      markReadLocally((notificationsData?.items ?? []).map((item) => item.id));
      queryClient.setQueryData(["notifications", "unread-count"], 0);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });

  // Real-time live updates on the shared app-wide notification stream
  useNotificationEvent("NOTIFICATION_CREATED", () => {
    queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
  });

  const notifications = useMemo(() => {
    if (!notificationsData?.items) return [];

    return notificationsData.items.map((item) => {
      const meta = item.metadata || item.payload || {};
      const actorName = resolveActorDisplay(item, meta);
      return {
        id: item.id,
        category: item.category,
        title: humanizeNotificationTitle(item.title, meta),
        summary: humanizeNotificationSummary(item.body, actorName),
        timestamp: fmtTimestamp(item.created_at),
        read: isRead(item),
        metadata: meta,
        route: item.route,
        rawItem: item,
      };
    });
  }, [notificationsData, isRead]);

  // Locally-acknowledged items the server has not caught up with yet must not
  // keep the badge lit while offline.
  const pendingLocal = notifications.filter(
    (n) => readIds.has(n.id) && !(n.rawItem.read_at || n.rawItem.read === true),
  ).length;
  const unreadCount = Math.max(
    0,
    (notificationsData?.unread_count ?? notifications.filter((n) => !n.read).length) - pendingLocal,
  );
  const serverUnreadCount = notificationsData?.unread_count ?? 0;
  const hasUnread = unreadCount > 0 || serverUnreadCount > 0 || notifications.some((n) => !n.read);

  useEffect(() => {
    if (typeof notificationsData?.unread_count === "number") {
      const effectiveUnread = Math.max(0, notificationsData.unread_count - pendingLocal);
      queryClient.setQueryData(["notifications", "unread-count"], effectiveUnread);
    }
  }, [notificationsData?.unread_count, pendingLocal, queryClient]);

  const error = queryErr ? (queryErr.message || "Could not load notifications.") : "";

  const handleCardClick = (alert) => {
    if (!alert.rawItem?.read_at && !alert.rawItem?.read) {
      markReadMutation.mutate(alert.id);
    }
    const targetRoute = resolveNotificationRoute(alert.rawItem || alert, "Admin");
    if (targetRoute) {
      navigate(targetRoute);
    }
  };

  const handleMarkAllRead = () => {
    markAllMutation.mutate();
  };

  return (
    <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-3 sm:space-y-5">
      <PageHeader
        title="Notifications"
        description="Stay updated on data submissions, pipeline status, and system alerts."
        action={
          hasUnread ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markAllMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-[var(--hw-green-900)] bg-white hover:bg-[var(--hw-neutral-50)] rounded-xl flex-shrink-0 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4 text-[var(--hw-green-700)]" />
              Mark all as read
            </button>
          ) : null
        }
      />

      {loading ? (
        <div className="space-y-2 sm:space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 sm:gap-3.5 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-[var(--hw-neutral-200)] animate-pulse"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--hw-neutral-100)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-4 bg-[var(--hw-neutral-200)] rounded-md w-1/3" />
                  <div className="h-3 bg-[var(--hw-neutral-100)] rounded w-20" />
                </div>
                <div className="h-3.5 bg-[var(--hw-neutral-100)] rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <Card className="py-16 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-3.5 text-red-500">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <p className="text-[16px] font-bold text-[var(--hw-neutral-900)] mb-1">
              Unable to load notifications
            </p>
            <p className="text-[13px] text-[var(--hw-neutral-600)] max-w-sm mb-4">{error}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-semibold hover:bg-[var(--hw-green-800)] transition-colors cursor-pointer"
            >
              Try again
            </button>
          </div>
        </Card>
      ) : notifications.length === 0 ? (
        <Card className="py-16 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--hw-neutral-100)] border border-[var(--hw-neutral-200)] flex items-center justify-center mb-3.5 text-[var(--hw-neutral-400)]">
              <Bell className="w-7 h-7" />
            </div>
            <p className="text-[16px] font-bold text-[var(--hw-neutral-900)] mb-1">
              No notifications yet
            </p>
            <p className="text-[13px] text-[var(--hw-neutral-600)] max-w-sm">
              You're all caught up! Updates about data imports, system operations, and alerts will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2 sm:space-y-2.5">
          {notifications.map((alert) => (
            <div
              key={alert.id}
              onClick={() => handleCardClick(alert)}
              className={`flex items-start gap-3 sm:gap-3.5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${
                alert.read
                  ? "bg-white border-[var(--hw-neutral-200)] opacity-80 hover:opacity-100 hover:border-[var(--hw-neutral-300)]"
                  : "bg-white border-[var(--hw-neutral-300)] shadow-[var(--shadow-xs)] hover:border-[var(--hw-neutral-400)]"
              }`}
            >
              <NotificationIcon
                category={alert.category}
                metadata={alert.metadata}
                fallbackTitle={alert.title}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p
                        className={`text-[13.5px] sm:text-[14px] leading-snug ${
                          alert.read
                            ? "font-medium text-[var(--hw-neutral-700)]"
                            : "font-bold text-[var(--hw-neutral-900)]"
                        }`}
                      >
                        {alert.title}
                      </p>
                      {!alert.read && (
                        <span className="w-2 h-2 rounded-full bg-[var(--hw-green-600)] shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--hw-neutral-500)] block sm:hidden mt-0.5">
                      {alert.timestamp}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--hw-neutral-500)] whitespace-nowrap hidden sm:inline-block shrink-0 mt-0.5">
                    {alert.timestamp}
                  </span>
                </div>
                <p className="text-[12.5px] sm:text-[13px] text-[var(--hw-neutral-600)] mt-1 line-clamp-2 leading-relaxed">
                  {alert.summary}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0 self-center" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { AdminNotifications as default };
