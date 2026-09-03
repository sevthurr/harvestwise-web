import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Info,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  X,
  Loader2
} from "lucide-react";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { Card } from "../../global/components/ui/hw-ui";
import { apiGet, parseResponse } from "../../global/api";
import { useAuth } from "../../global/contexts/AuthContext";

const URGENCY_CONFIG = {
  urgent: { label: "Urgent", Icon: AlertOctagon, color: "text-red-600", bg: "bg-red-50" },
  attention: { label: "Attention", Icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  information: { label: "Information", Icon: Info, color: "text-blue-500", bg: "bg-blue-50" },
  success: { label: "Completed", Icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" }
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

function DFTCNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [readIds, setReadIds] = useState(() => new Set());
  const [selectedAlert, setSelectedAlert] = useState(null);

  const { data: preferencesData } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await apiGet("/notifications");
      return parseResponse(res);
    },
    staleTime: 60 * 1000
  });

  const { data: submissionsData, isLoading, error, refetch } = useQuery({
    queryKey: ["dftc-notifications-submissions"],
    queryFn: async () => {
      const res = await apiGet("/dftc/submissions", { page_size: 50 });
      return parseResponse(res);
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000
  });

  useEffect(() => {
    let es;
    try {
      es = new EventSource("/api/v1/notifications/stream");
      es.addEventListener("DATASET_INGESTED", () => {
        refetch();
      });
    } catch {
      // SSE fallback
    }
    return () => {
      if (es) es.close();
    };
  }, [refetch]);

  const enabledTypes = useMemo(() => {
    if (!Array.isArray(preferencesData)) return null;
    const map = {};
    for (const p of preferencesData) {
      map[p.notification_type] = p.enabled;
    }
    return map;
  }, [preferencesData]);

  const isEnabled = (type) => {
    if (!enabledTypes) return true;
    return enabledTypes[type] !== false;
  };


  const notifications = useMemo(() => {
    if (!submissionsData?.items) return [];

    const list = [];
    for (const sub of submissionsData.items) {
      const isArrival = (sub.data_type || "").toLowerCase().includes("arrival");
      const subType = isArrival ? "Arrival Volume" : `Daily ${sub.price_type || "Retail"} Price`;
      const timeStr = fmtTimestamp(sub.saved_at || sub.created_at || sub.validation_completed_at);

      if ((sub.status === "Saved" || sub.status === "saved") && isEnabled("submission_accepted")) {
        list.push({
          id: `sub-saved-${sub.id}`,
          title: "Submission Accepted",
          summary: `${subType} dataset ${sub.id} has been validated and accepted for processing.`,
          detail: `Dataset ${sub.id} containing ${sub.total_records ?? 0} records was accepted and saved into HarvestWise records on ${timeStr}.`,
          timestamp: timeStr,
          urgency: "success",
          relatedTo: sub.id,
          reason: "Submission accepted notification (submission_accepted)",
          action: { route: `/dftc/submissions/${sub.id}`, label: "View Dataset" }
        });
      } else if ((sub.status === "Failed" || sub.status === "failed") && isEnabled("submission_failed")) {
        list.push({
          id: `sub-failed-${sub.id}`,
          title: "Submission Failed",
          summary: `${subType} dataset ${sub.id} encountered an issue and was not saved.`,
          detail: sub.failure_reason || `The dataset submission ${sub.id} could not be processed. Review the error details or re-upload.`,
          timestamp: timeStr,
          urgency: "urgent",
          relatedTo: sub.id,
          reason: "Submission failed alert (submission_failed)",
          action: { route: `/dftc/submissions/${sub.id}`, label: "View Error" }
        });
      }

      if ((sub.needs_correction_count || 0) > 0 && isEnabled("records_need_correction")) {
        list.push({
          id: `sub-corr-${sub.id}`,
          title: "Records Need Correction",
          summary: `${sub.needs_correction_count} record(s) in dataset ${sub.id} need review or correction.`,
          detail: `${sub.needs_correction_count} invalid or incomplete entries were excluded from ${sub.id}. Inspect the validation table for specific issues.`,
          timestamp: timeStr,
          urgency: "attention",
          relatedTo: sub.id,
          reason: "Correction required notification (records_need_correction)",
          action: { route: `/dftc/submissions/${sub.id}`, label: "Review Records" }
        });
      }

      if (sub.validation_completed_at && isEnabled("upload_validation_completed")) {
        list.push({
          id: `sub-val-${sub.id}`,
          title: "Upload Validation Completed",
          summary: `Validation finished for dataset ${sub.id}.`,
          detail: `Upload validation finished at ${fmtTimestamp(sub.validation_completed_at)}. ${sub.analytics_supported_count ?? 0} analytics-supported records ready.`,
          timestamp: fmtTimestamp(sub.validation_completed_at),
          urgency: "information",
          relatedTo: sub.id,
          reason: "Validation completion notice (upload_validation_completed)",
          action: { route: `/dftc/submissions/${sub.id}`, label: "View Summary" }
        });
      }
    }

    return list.map((item) => ({
      ...item,
      read: readIds.has(item.id)
    }));
  }, [submissionsData, readIds, enabledTypes]);


  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  const markRead = (id) => {
    setReadIds((prev) => new Set([...prev, id]));
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
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-[var(--hw-green-900)] bg-white hover:bg-[var(--hw-neutral-50)] rounded-xl flex-shrink-0 cursor-pointer transition-colors shadow-sm"
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
          {notifications.map((alert) => {
            const urgency = URGENCY_CONFIG[alert.urgency] || URGENCY_CONFIG.information;
            const UrgencyIcon = urgency.Icon;
            return (
              <div
                key={alert.id}
                onClick={() => {
                  setSelectedAlert(alert);
                  markRead(alert.id);
                }}
                className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                  alert.read
                    ? "bg-white border-[var(--hw-neutral-200)] opacity-75 hover:opacity-100 hover:border-[var(--hw-neutral-300)]"
                    : "bg-white border-[var(--hw-neutral-300)] shadow-[var(--shadow-xs)] hover:border-[var(--hw-green-600)]"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${urgency.bg} ${urgency.color}`}>
                  <UrgencyIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className={`text-[14px] font-bold ${alert.read ? "text-[var(--hw-neutral-700)]" : "text-[var(--hw-neutral-900)]"}`}>
                        {alert.title}
                      </p>
                      {!alert.read && (
                        <span className="w-2 h-2 rounded-full bg-[var(--hw-green-600)] flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-[12px] text-[var(--hw-neutral-500)] whitespace-nowrap flex-shrink-0">
                      {alert.timestamp}
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--hw-neutral-600)] mt-0.5 line-clamp-2">
                    {alert.summary}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0 self-center" />
              </div>
            );
          })}
        </div>
      )}

      {selectedAlert && (
        <AlertDetailDrawer
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onMarkRead={markRead}
          onNavigate={(route) => navigate(route)}
        />
      )}
    </div>
  );
}

export { DFTCNotifications as default };
