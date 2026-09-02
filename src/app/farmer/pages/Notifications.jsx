import { useState } from "react";
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
import { Card } from "../../global/components/ui/hw-ui";

const URGENCY_CONFIG = {
  urgent: { label: "Urgent", Icon: AlertOctagon, color: "text-red-600", bg: "bg-red-50" },
  attention: { label: "Attention", Icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  information: { label: "Information", Icon: Info, color: "text-blue-500", bg: "bg-blue-50" }
};

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
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)]">
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
              className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
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
              className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-semibold hover:bg-[var(--hw-green-800)] transition-colors text-center"
            >
              {alert.action.label}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-black">Notifications</h1>
          <p className="text-[14px] text-[var(--hw-neutral-600)] mt-0.5">
            Stay updated on crop alerts, weather updates, and market movements.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] flex-shrink-0"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications list or Empty State */}
      {loading ? (
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
      ) : notifications.length === 0 ? (
        <Card className="py-16 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[var(--hw-neutral-100)] flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-[var(--hw-neutral-400)]" />
            </div>
            <p className="text-[16px] font-semibold text-[var(--hw-neutral-900)] mb-1">
              No notifications yet
            </p>
            <p className="text-[13px] text-[var(--hw-neutral-600)] max-w-sm">
              You are all caught up. Reminders for your crops, weather risks, and price movement alerts will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((item) => {
            const urgency = URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG.information;
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
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${urgency.bg}`}>
                  <urgency.Icon className={`w-4 h-4 ${urgency.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[14px] leading-snug ${item.read ? "font-medium text-[var(--hw-neutral-900)]" : "font-bold text-[var(--hw-neutral-900)]"}`}>
                      {item.title}
                    </p>
                    <span className="text-[11px] text-[var(--hw-neutral-500)] flex-shrink-0">{item.timestamp}</span>
                  </div>
                  <p className="text-[13px] text-[var(--hw-neutral-600)] mt-1 line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0 self-center" />
              </div>
            );
          })}
        </div>
      )}

      {/* Alert Detail Drawer */}
      <AlertDetailDrawer
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onMarkRead={markRead}
        onNavigate={(route) => navigate(route)}
      />
    </div>
  );
}

export { NotificationsPage as default };
