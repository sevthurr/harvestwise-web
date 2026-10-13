import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  AlertTriangle,
  X,
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
import {
  URGENCY_LEVELS,
  getCategoryUrgency,
  getCategoryActionLabel,
  getCategoryReason,
} from "../../global/utils/notificationCategories";
import { useNotificationEvent } from "../../global/contexts/NotificationStreamContext";
import { useNotificationReadState } from "../../global/hooks/useNotificationReadState";
import { useOptionalAuth } from "../../global/contexts/AuthContext";

const AlertDetailDrawer = ({ alert, onClose, onMarkRead, onNavigate }) => {
  if (!alert) return null;
  const urgency = URGENCY_LEVELS[alert.urgency] || URGENCY_LEVELS.information;
  const UrgencyIcon = urgency.Icon;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-y-0 md:right-0 md:left-auto md:w-96 bg-white rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-[var(--shadow-xl)] flex flex-col max-h-[85vh] md:max-h-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-200)]">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${urgency.bg} ${urgency.color}`}>
              <UrgencyIcon className="w-3.5 h-3.5" />
              {urgency.label}
            </span>
            <span className="text-[12px] text-[var(--hw-neutral-500)]">{alert.timestamp}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <h2 className="text-[17px] font-bold text-[var(--hw-neutral-900)] leading-snug">{alert.title}</h2>
          <p className="text-[14px] text-[var(--hw-neutral-700)] leading-relaxed">{alert.detail || alert.summary}</p>

          {alert.relatedTo && (
            <div className="p-3 bg-[var(--hw-neutral-50)] rounded-xl border border-[var(--hw-neutral-200)]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--hw-neutral-500)] mb-0.5">Related Dataset</p>
              <p className="text-[13px] font-medium text-[var(--hw-neutral-900)]">{alert.relatedTo}</p>
            </div>
          )}

          {alert.reason && (
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--hw-neutral-500)]">Notification Type</p>
              <p className="text-[13px] text-[var(--hw-neutral-600)] leading-relaxed">{alert.reason}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-[var(--hw-neutral-200)] flex gap-2">
          {!alert.read && (
            <button
              onClick={() => {
                onMarkRead(alert.id);
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
            >
              Mark as read
            </button>
          )}
          {alert.action && alert.action.route && (
            <button
              onClick={() => {
                onClose();
                onNavigate(alert.action.route);
              }}
              className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-semibold hover:bg-[var(--hw-green-800)] transition-colors text-center cursor-pointer"
            >
              {alert.action.label}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

function fmtTimestamp(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    if (isToday) return `Today · ${timeStr}`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + ` · ${timeStr}`;
  } catch {
    return isoStr;
  }
}

function DFTCNotifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useOptionalAuth();
  const { readIds, isRead, markReadLocally } = useNotificationReadState(auth?.user?.id);

  const { data: notificationsData, isLoading, error, refetch } = useQuery({
    queryKey: ["dftc-notifications"],
    queryFn: () => listNotifications(1, 50),
    staleTime: 30 * 1000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => apiMarkRead(id),
    // Optimistic: show it as read immediately, even if the request fails.
    onMutate: (id) => markReadLocally(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dftc-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiMarkAllRead(),
    onMutate: () => markReadLocally((notificationsData?.items ?? []).map((item) => item.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dftc-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });

  // Real-time live updates on the shared app-wide notification stream.
  //
  // Both subscriptions are needed and both are correct: a genuine upload
  // completion arrives as `DATASET_INGESTED`, but a notification broadcast for
  // many users at once rides that same data channel and arrives as
  // `DATASET_INGESTED` carrying `type: "NOTIFICATION_CREATED"` — which the
  // shared stream dispatches under both names, handing over the *same* payload
  // object each time.
  //
  // Comparing payload identity collapses exactly that duplicate and nothing
  // else. Measured before the fix: a bulk broadcast refetched the feed twice,
  // a plain ingestion event once. A time-based window would also have worked,
  // but it would silently swallow a genuinely distinct event arriving moments
  // later; identity comparison cannot.
  const lastPayloadRef = useRef(null);
  const invalidateFeed = useCallback(
    (payload) => {
      if (payload && payload === lastPayloadRef.current) return;
      lastPayloadRef.current = payload ?? null;
      queryClient.invalidateQueries({ queryKey: ["dftc-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
    [queryClient],
  );
  useNotificationEvent("NOTIFICATION_CREATED", invalidateFeed);
  // DATASET_INGESTED fires on the shared data channel when a DFTC upload
  // completes, so an accepted/rejected submission lands in this feed without
  // a manual reload.
  useNotificationEvent("DATASET_INGESTED", invalidateFeed);

  useEffect(() => {
    if (typeof notificationsData?.unread_count === "number") {
      queryClient.setQueryData(["notifications", "unread-count"], notificationsData.unread_count);
    }
  }, [notificationsData?.unread_count, queryClient]);

  const notifications = useMemo(() => {
    if (!notificationsData?.items) return [];

    return notificationsData.items.map((item) => {
      const metadata = item.metadata || item.payload || {};
      const submissionId = metadata.submission_id || null;
      const actionLabel = getCategoryActionLabel(item.category);
      return {
        id: item.id,
        category: item.category,
        title: item.title,
        summary: item.body,
        timestamp: fmtTimestamp(item.created_at),
        read: isRead(item),
        metadata,
        route: item.route,
        urgency: getCategoryUrgency(item.category),
        reason: getCategoryReason(item.category),
        relatedTo: submissionId,
        action:
          submissionId && actionLabel
            ? { route: resolveNotificationRoute(item, "DFTC"), label: actionLabel }
            : null,
        rawItem: item,
      };
    });
  }, [notificationsData, isRead]);

  const [selectedAlert, setSelectedAlert] = useState(null);

  // Locally-acknowledged items the server has not caught up with yet must not
  // keep the badge lit while offline.
  const pendingLocal = notifications.filter(
    (n) => readIds.has(n.id) && !(n.rawItem.read_at || n.rawItem.read === true),
  ).length;
  const unreadCount = Math.max(
    0,
    (notificationsData?.unread_count ?? notifications.filter((n) => !n.read).length) - pendingLocal,
  );

  const handleCardClick = (alert) => {
    setSelectedAlert(alert);
    if (!alert.read) {
      markReadMutation.mutate(alert.id);
    }
  };

  const handleMarkAllRead = () => {
    markAllMutation.mutate();
  };

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      <PageHeader
        title="Notifications"
        description="Stay updated on data submissions, validation outcomes, and system alerts."
        action={
          unreadCount > 0 ? (
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

      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-[var(--hw-neutral-200)] animate-pulse"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--hw-neutral-100)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-2.5">
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
            <p className="text-[13px] text-[var(--hw-neutral-600)] max-w-sm mb-4">
              {error?.message || "Could not retrieve DFTC notifications."}
            </p>
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
              You're all caught up! Updates about data submissions, validation results, and alerts will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((alert) => (
            <div
              key={alert.id}
              onClick={() => handleCardClick(alert)}
              className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer ${
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
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-[14px] leading-snug ${
                        alert.read
                          ? "font-medium text-[var(--hw-neutral-700)]"
                          : "font-bold text-[var(--hw-neutral-900)]"
                      }`}
                    >
                      {alert.title}
                    </p>
                    {!alert.read && (
                      <span className="w-2 h-2 rounded-full bg-[var(--hw-green-600)] flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--hw-neutral-500)] whitespace-nowrap flex-shrink-0">
                    {alert.timestamp}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--hw-neutral-600)] mt-1 line-clamp-2 leading-relaxed">
                  {alert.summary}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0 self-center" />
            </div>
          ))}
        </div>
      )}

      {selectedAlert && (
        <AlertDetailDrawer
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onMarkRead={(id) => markReadMutation.mutate(id)}
          onNavigate={(route) => navigate(route)}
        />
      )}
    </div>
  );
}

export { DFTCNotifications as default };
