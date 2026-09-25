import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Info,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  CloudRain,
  X,
} from "lucide-react";
import { Card } from "../../global/components/ui/hw-ui";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { listNotifications, markRead, markAllRead } from "../../../services/api/notificationsApi";

// ─── Category → urgency + icon mapping ────────────────────────────────────
const CATEGORY_CONFIG = {
  price_change: {
    urgency: "attention",
    Icon: TrendingUp,
    color: "text-amber-600",
    bg: "bg-amber-50",
    labelKey: "farmer.notifications.category_price",
    defaultLabel: "Price Change",
  },
  weather_alert: {
    urgency: "urgent",
    Icon: CloudRain,
    color: "text-red-600",
    bg: "bg-red-50",
    labelKey: "farmer.notifications.category_weather",
    defaultLabel: "Weather Alert",
  },
  harvest_reminder: {
    urgency: "information",
    Icon: Bell,
    color: "text-blue-500",
    bg: "bg-blue-50",
    labelKey: "farmer.notifications.category_harvest",
    defaultLabel: "Harvest",
  },
  price_update: {
    urgency: "information",
    Icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-50",
    labelKey: "farmer.notifications.category_price_update",
    defaultLabel: "New Prices",
  },
};

const URGENCY_CONFIG = {
  urgent: {
    labelKey: "farmer.notifications.tag_urgent",
    label: "Urgent",
    Icon: AlertOctagon,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  attention: {
    labelKey: "farmer.notifications.tag_attention",
    label: "Attention",
    Icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  information: {
    labelKey: "farmer.notifications.tag_info",
    label: "Information",
    Icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
};

// ─── Action routes by category ─────────────────────────────────────────────
const CATEGORY_ROUTE = {
  price_change: "/farmer/prices",
  price_update: "/farmer/prices",
  weather_alert: "/farmer/market-weather",
  harvest_reminder: "/farmer/crops",
};

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

// ─── Detail drawer ─────────────────────────────────────────────────────────
const AlertDetailDrawer = ({ alert, onClose, onMarkRead, onNavigate, t }) => {
  if (!alert) return null;
  const cat = CATEGORY_CONFIG[alert.category] || CATEGORY_CONFIG.harvest_reminder;
  const urgency = URGENCY_CONFIG[cat.urgency] || URGENCY_CONFIG.information;
  const UrgencyIcon = urgency.Icon;
  const actionRoute = CATEGORY_ROUTE[alert.category];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-y-0 md:right-0 md:left-auto md:w-96 bg-white rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-[var(--shadow-xl)] flex flex-col max-h-[85vh] md:max-h-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-200)]">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${urgency.bg} ${urgency.color}`}>
              <UrgencyIcon className="w-3.5 h-3.5" />
              {t(urgency.labelKey, {}, urgency.label)}
            </span>
            <span className="text-[12px] text-[var(--hw-neutral-500)]">
              {formatTimestamp(alert.created_at)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <h2 className="text-[17px] font-bold text-[var(--hw-neutral-900)] leading-snug">
            {alert.title}
          </h2>
          <p className="text-[14px] text-[var(--hw-neutral-700)] leading-relaxed">{alert.body}</p>

          {alert.payload && Object.keys(alert.payload).length > 0 && (
            <div className="p-3 bg-[var(--hw-neutral-50)] rounded-xl border border-[var(--hw-neutral-200)]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--hw-neutral-500)] mb-1">
                {t("farmer.notifications.details", {}, "Details")}
              </p>
              {alert.payload.commodity_name && (
                <p className="text-[13px] font-medium text-[var(--hw-neutral-900)]">
                  {alert.payload.commodity_name}
                  {alert.payload.variety_name ? ` — ${alert.payload.variety_name}` : ""}
                </p>
              )}
              {alert.payload.change_pct != null && (
                <p className="text-[13px] text-[var(--hw-neutral-700)]">
                  {alert.payload.change_pct > 0 ? "+" : ""}
                  {(alert.payload.change_pct * 100).toFixed(1)}%{" "}
                  {t("farmer.notifications.price_change_label", {}, "price change")}
                </p>
              )}
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
              className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
            >
              {t("farmer.notifications.mark_as_read", {}, "Mark as read")}
            </button>
          )}
          {actionRoute && (
            <button
              onClick={() => {
                onClose();
                onNavigate(actionRoute);
              }}
              className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-semibold hover:bg-[var(--hw-green-800)] transition-colors"
            >
              {t("farmer.notifications.view_details", {}, "View Details")}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────
function NotificationsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["farmer-notifications"],
    queryFn: () => listNotifications(1, 50),
    staleTime: 30_000,
  });

  const notifications = data?.items ?? [];
  const unreadCount = data?.unread_count ?? 0;

  const markReadMutation = useMutation({
    mutationFn: markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["farmer-notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["farmer-notifications"] }),
  });

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
            className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] flex-shrink-0 disabled:opacity-50"
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
              <div className="w-8 h-8 rounded-full bg-[var(--hw-neutral-200)] flex-shrink-0 mt-0.5" />
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
            const cat = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.harvest_reminder;
            const CatIcon = cat.Icon;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedAlert(item)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  item.read
                    ? "bg-white border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)]"
                    : "bg-white border-l-4 border-l-[var(--hw-green-700)] border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cat.bg}`}
                >
                  <CatIcon className={`w-4 h-4 ${cat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-[14px] leading-snug ${
                        item.read
                          ? "font-medium text-[var(--hw-neutral-900)]"
                          : "font-bold text-[var(--hw-neutral-900)]"
                      }`}
                    >
                      {item.title}
                    </p>
                    <span className="text-[11px] text-[var(--hw-neutral-500)] flex-shrink-0">
                      {formatTimestamp(item.created_at)}
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--hw-neutral-600)] mt-1 line-clamp-2 leading-relaxed">
                    {item.body}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0 self-center" />
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Drawer */}
      <AlertDetailDrawer
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onMarkRead={(id) => markReadMutation.mutate(id)}
        onNavigate={(route) => navigate(route)}
        t={t}
      />
    </div>
  );
}

export { NotificationsPage as default };
