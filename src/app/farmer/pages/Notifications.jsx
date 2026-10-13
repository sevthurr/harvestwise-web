import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import { Card } from "../../global/components/ui/hw-ui";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { listNotifications, markRead, markAllRead } from "../../../services/api/notificationsApi";
import { NotificationIcon } from "../../global/components/shared/NotificationIcon";
import { localizeFarmerNotification } from "../utils/farmerNotificationLocalizer";
import { resolveNotificationRoute } from "../../global/utils/notificationRoutes";
import { useNotificationEvent } from "../../global/contexts/NotificationStreamContext";
import { useNotificationReadState } from "../../global/hooks/useNotificationReadState";
import { useOptionalAuth } from "../../global/contexts/AuthContext";

function formatTimestamp(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function NotificationsPage() {
  const navigate = useNavigate();
  const { t, langCode, effectiveLanguage } = useLanguage();
  const currentLang = langCode || effectiveLanguage || "ceb";
  const queryClient = useQueryClient();
  const auth = useOptionalAuth();
  const { readIds, isRead, markReadLocally } = useNotificationReadState(auth?.user?.id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["farmer-notifications"],
    queryFn: () => listNotifications(1, 50),
    refetchOnMount: "always",
    staleTime: 0,
  });

  const notifications = data?.items ?? [];
  const serverUnreadCount = data?.unread_count ?? 0;

  // Locally-acknowledged items the server has not caught up with yet must not
  // keep the badge lit while offline.
  const pendingLocal = notifications.filter(
    (item) => readIds.has(item.id) && !item.read && !item.read_at,
  ).length;
  const unreadCount = Math.max(0, serverUnreadCount - pendingLocal);

  // Real-time live updates on the shared app-wide notification stream
  useNotificationEvent("NOTIFICATION_CREATED", () => {
    queryClient.invalidateQueries({ queryKey: ["farmer-notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
  });

  useEffect(() => {
    if (typeof data?.unread_count === "number") {
      queryClient.setQueryData(["notifications", "unread-count"], data.unread_count);
    }
  }, [data?.unread_count, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: markRead,
    // Optimistic: show it as read immediately, even if the request fails.
    onMutate: (id) => markReadLocally(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onMutate: () => markReadLocally(notifications.map((item) => item.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });

  const handleCardClick = (item) => {
    if (!isRead(item)) {
      markReadMutation.mutate(item.id);
    }
    let targetRoute = null;
    try {
      targetRoute = resolveNotificationRoute(item, "Farmer");
    } catch {
      targetRoute = null;
    }
    if (targetRoute) {
      navigate(targetRoute);
    } else {
      navigate("/farmer/prices");
    }
  };

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-black">
            {t("farmer.notifications.title", {}, "Notifications")}
          </h1>
          <p className="text-[14px] text-[var(--hw-neutral-600)] mt-0.5">
            {t(
              "farmer.notifications.subtitle",
              {},
              "Stay updated on crop alerts, weather updates, and market movements."
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] flex-shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            {t("farmer.notifications.mark_all_read", {}, "Mark all read")}
          </button>
        )}
      </div>

      {/* List / States */}
      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-[var(--hw-neutral-200)] animate-pulse"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--hw-neutral-200)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-4 bg-[var(--hw-neutral-200)] rounded w-1/3" />
                  <div className="h-3 bg-[var(--hw-neutral-100)] rounded w-16" />
                </div>
                <div className="h-3.5 bg-[var(--hw-neutral-100)] rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <Card className="py-10 text-center">
          <p className="text-[14px] text-[var(--hw-neutral-600)]">
            {t("farmer.notifications.load_error", {}, "Could not load notifications. Please try again.")}
          </p>
        </Card>
      ) : notifications.length === 0 ? (
        <Card className="py-16 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[var(--hw-neutral-100)] flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-[var(--hw-neutral-400)]" />
            </div>
            <p className="text-[16px] font-semibold text-[var(--hw-neutral-900)] mb-1">
              {t("farmer.notifications.all_caught_up", {}, "You're all caught up")}
            </p>
            <p className="text-[13px] text-[var(--hw-neutral-600)] max-w-sm">
              {t("farmer.notifications.no_notifications", {}, "No notifications at this time.")}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((item) => {
            let localizedTitle = item.title || "";
            let localizedBody = item.body || "";
            try {
              const localized = localizeFarmerNotification(
                item,
                t,
                currentLang
              );
              if (localized?.title) localizedTitle = localized.title;
              if (localized?.body) localizedBody = localized.body;
            } catch {
              localizedTitle = item.title || "";
              localizedBody = item.body || "";
            }

            return (
              <div
                key={item.id}
                onClick={() => handleCardClick(item)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  isRead(item)
                    ? "bg-white border-[var(--hw-neutral-200)] opacity-80 hover:opacity-100 hover:border-[var(--hw-neutral-300)]"
                    : "bg-white border-[var(--hw-neutral-300)] shadow-[var(--shadow-xs)] hover:border-[var(--hw-neutral-400)]"
                }`}
              >
                <NotificationIcon
                  category={item.category}
                  metadata={item.metadata || item.payload}
                  fallbackTitle={item.title}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-[14px] leading-snug ${
                          isRead(item)
                            ? "font-medium text-[var(--hw-neutral-700)]"
                            : "font-bold text-[var(--hw-neutral-900)]"
                        }`}
                      >
                        {localizedTitle}
                      </p>
                      {!isRead(item) && (
                        <span className="w-2 h-2 rounded-full bg-[var(--hw-green-600)] flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--hw-neutral-500)] flex-shrink-0">
                      {formatTimestamp(item.created_at)}
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--hw-neutral-600)] mt-1 line-clamp-2 leading-relaxed">
                    {localizedBody}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0 self-center" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { NotificationsPage as default };
