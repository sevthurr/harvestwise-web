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

function fmtTimestamp(isoStr) {
  if (!isoStr) return "";
  try {
    return new Date(isoStr).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

function AdminNotifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useOptionalAuth();
  const { readIds, isRead, markReadLocally } = useNotificationReadState(auth?.user?.id);

  const { data: notificationsData, isLoading: loading, error: queryErr, refetch } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => listNotifications(1, 50),
    staleTime: 30 * 1000,
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
    onMutate: () => markReadLocally((notificationsData?.items ?? []).map((item) => item.id)),
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

  useEffect(() => {
    if (typeof notificationsData?.unread_count === "number") {
      queryClient.setQueryData(["notifications", "unread-count"], notificationsData.unread_count);
    }
  }, [notificationsData?.unread_count, queryClient]);

  const notifications = useMemo(() => {
    if (!notificationsData?.items) return [];

    return notificationsData.items.map((item) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      summary: item.body,
      timestamp: fmtTimestamp(item.created_at),
      read: isRead(item),
      metadata: item.metadata || item.payload,
      route: item.route,
      rawItem: item,
    }));
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
  const error = queryErr ? (queryErr.message || "Could not load notifications.") : "";

  const handleCardClick = (alert) => {
    if (!alert.read) {
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
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      <PageHeader
        title="Notifications"
        description="Stay updated on data submissions, pipeline status, and system alerts."
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

      {loading ? (
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
    </div>
  );
}

export { AdminNotifications as default };
