import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Info,
  AlertTriangle,
  AlertOctagon,
  X
} from "lucide-react";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { Card } from "../../global/components/ui/hw-ui";
import { adminApi } from "../../../services/api";

const URGENCY_CONFIG = {
  urgent: { label: "Urgent", Icon: AlertOctagon, color: "text-red-600", bg: "bg-red-50" },
  attention: { label: "Attention", Icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  information: { label: "Information", Icon: Info, color: "text-blue-500", bg: "bg-blue-50" }
};


// Map audit-log action resource prefixes to notification urgency and a
// sensible admin destination. Action format is "<resource>.<verb>".
const ACTION_META = {
  import:     { urgency: "attention",   route: "/admin/history" },
  processing: { urgency: "attention",   route: "/admin/analytics" },
  advisory:   { urgency: "attention",   route: "/admin/analytics" },
  data:       { urgency: "attention",   route: "/admin/data-sources" },
  system:     { urgency: "urgent",      route: "/admin/system" },
  config:     { urgency: "attention",   route: "/admin/configuration" },
  user:       { urgency: "information", route: "/admin/system" },
  auth:       { urgency: "information", route: "/admin/system" }
};

const DEFAULT_META = { urgency: "information", route: null };

const ROUTE_LABELS = {
  "/admin/history": "View import history",
  "/admin/analytics": "View analytics",
  "/admin/data-sources": "View data sources",
  "/admin/system": "View system",
  "/admin/configuration": "View configuration"
};

function humanizeAction(action = "") {
  return action
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" · ");
}

function fmtTimestamp(isoStr) {
  if (!isoStr) return "";
  try {
    return new Date(isoStr).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return isoStr;
  }
}

function logToNotification(log) {
  const resource = (log.action || "").split(".")[0].toLowerCase();
  const meta = ACTION_META[resource] || DEFAULT_META;
  const route = meta.route;
  return {
    id: log.id,
    title: `${resource.charAt(0).toUpperCase() + resource.slice(1)} · ${humanizeAction(log.action)}`,
    summary: log.details || `${log.action} recorded in the audit trail.`,
    detail: log.details || null,
    timestamp: fmtTimestamp(log.created_at),
    urgency: meta.urgency,
    read: false,
    relatedTo: log.actor_name || log.user_id || null,
    action: route ? { route, label: ROUTE_LABELS[route] || "View details" } : null
  };
}

const AlertDetailDrawer = ({ alert, onClose, onMarkRead, onNavigate }) => {
  if (!alert) return null;
  const urgency = URGENCY_CONFIG[alert.urgency] || URGENCY_CONFIG.information;
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
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--hw-neutral-500)] mb-0.5">Related to</p>
              <p className="text-[13px] font-medium text-[var(--hw-neutral-900)]">{alert.relatedTo}</p>
            </div>
          )}

          {alert.reason && (
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--hw-neutral-500)]">Why you received this</p>
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

function AdminNotifications() {
  const navigate = useNavigate();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [readIds, setReadIds] = useState(new Set());

  const { data: logsRes, isLoading: loading, error: queryErr, refetch } = useQuery({
    queryKey: ["adminNotifications"],
    queryFn: () => adminApi.getAuditLogs({ page_size: 30 }),
    staleTime: 1000 * 60 * 2,
  });

  const rawNotifications = useMemo(() => (logsRes?.items || []).map(logToNotification), [logsRes]);
  const notifications = useMemo(
    () => rawNotifications.map((n) => (readIds.has(n.id) ? { ...n, read: true } : n)),
    [rawNotifications, readIds]
  );
  const error = queryErr ? (queryErr.message || "Could not load notifications.") : "";


  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setReadIds(new Set(rawNotifications.map((n) => n.id)));
  };

  const markRead = (id) => {
    setReadIds((prev) => new Set([...prev, id]));
  };


  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      {/* Consistent Full-Width Admin Page Header */}
      <PageHeader
        title="Notifications"
        description="Stay updated on data submissions, pipeline status, and system alerts."
        action={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-[var(--hw-green-900)] bg-white hover:bg-[var(--hw-neutral-50)] rounded-xl flex-shrink-0 cursor-pointer transition-colors shadow-sm"
            >
              <CheckCheck className="w-4 h-4 text-[var(--hw-green-700)]" />
              Mark all as read
            </button>
          ) : null
        }
      />

      {/* Notifications list or Empty State */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-[var(--hw-neutral-200)] animate-pulse"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--hw-neutral-100)] flex-shrink-0" />
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
              You are all caught up. System alerts, data reviews, and pipeline notifications will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => {
            const urgency = URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG.information;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedAlert(item)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  item.read
                    ? "bg-white border-[var(--hw-neutral-200)] opacity-75 hover:opacity-100 hover:border-[var(--hw-neutral-300)]"
                    : "bg-white border-[var(--hw-green-300)] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-[var(--hw-green-500)]"
                }`}
              >
                <div className={`p-2 rounded-xl flex-shrink-0 ${urgency.bg}`}>
                  <urgency.Icon className={`w-4 h-4 ${urgency.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className={`text-[14px] leading-snug truncate ${item.read ? "font-medium text-[var(--hw-neutral-800)]" : "font-bold text-[var(--hw-neutral-900)]"}`}>
                      {item.title}
                    </p>
                    <span className="text-[11px] text-[var(--hw-neutral-500)] whitespace-nowrap flex-shrink-0">
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--hw-neutral-600)] line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0 self-center" />
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer */}
      <AlertDetailDrawer
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onMarkRead={markRead}
        onNavigate={navigate}
      />
    </div>
  );
}

export { AdminNotifications as default };
