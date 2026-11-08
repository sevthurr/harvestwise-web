/**
 * MyActivities.jsx
 *
 * Farmer activity history — simplified farm-diary feed.
 *
 * Deliberately standalone: does NOT render through AuditLogsView (which is an
 * admin-style dense table). This page hides all technical fields (log IDs,
 * IP addresses, raw action codes, actor columns) and presents each event as a
 * plain-language card grouped by date.
 *
 * API (unchanged):
 *   GET  /api/farmer/activity?action=&date_from=&date_to=&page=1&page_size=20
 *   POST /api/farmer/activity   (records PDF export)
 *
 * The backend, permissions, and data are not changed.
 */

import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LogIn,
  LogOut,
  User,
  ShieldAlert,
  Sprout,
  Wheat,
  CalendarDays,
  DollarSign,
  Bell,
  FileDown,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { farmerApi } from "../../../services/api";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { formatFarmerActionLabel } from "../utils/activityActionLabels";
import { useOptionalAuth } from "../../global/contexts/AuthContext";
import { createAuditLogsPdf } from "../../global/utils/auditLogsPdf";
import { formatPersonName, parseApiDateTime } from "../../global/utils/apiTransforms";

// ─── Icon + colour map ────────────────────────────────────────────────────────
// Each entry maps a dot-notation prefix (or exact code) to an icon component
// and a Tailwind background / text pair. More-specific keys are checked first.

const ACTION_META = {
  // Sign-ins
  "auth.login":               { Icon: LogIn,       bg: "bg-[var(--hw-green-50)]",   fg: "text-[var(--hw-green-700)]"  },
  "auth.logout":              { Icon: LogOut,       bg: "bg-[var(--hw-neutral-100)]", fg: "text-[var(--hw-neutral-500)]" },
  "auth.login_failed":        { Icon: ShieldAlert,  bg: "bg-red-50",                 fg: "text-red-500"                },
  "auth.account_locked":      { Icon: ShieldAlert,  bg: "bg-red-50",                 fg: "text-red-500"                },
  "auth.token_reuse_detected":{ Icon: ShieldAlert,  bg: "bg-red-50",                 fg: "text-red-500"                },
  "auth.totp_mfa_lockout":    { Icon: ShieldAlert,  bg: "bg-red-50",                 fg: "text-red-500"                },
  "auth.otp_mfa_lockout":     { Icon: ShieldAlert,  bg: "bg-red-50",                 fg: "text-red-500"                },
  // Profile / account
  "user":                     { Icon: User,         bg: "bg-blue-50",                fg: "text-blue-500"               },
  // Farming
  "farmer.crop_plan_created": { Icon: Sprout,       bg: "bg-[var(--hw-green-50)]",   fg: "text-[var(--hw-green-700)]"  },
  "farmer.crop_plan_updated": { Icon: Sprout,       bg: "bg-[var(--hw-green-50)]",   fg: "text-[var(--hw-green-700)]"  },
  "farmer.harvest_logged":    { Icon: Wheat,        bg: "bg-amber-50",               fg: "text-amber-600"              },
  "farmer.harvest_record_logged":{ Icon: Wheat,     bg: "bg-amber-50",               fg: "text-amber-600"              },
  "farmer.calendar_created":  { Icon: CalendarDays, bg: "bg-indigo-50",              fg: "text-indigo-500"             },
  "farmer.calendar_updated":  { Icon: CalendarDays, bg: "bg-indigo-50",              fg: "text-indigo-500"             },
  "farmer.calendar_deleted":  { Icon: CalendarDays, bg: "bg-indigo-50",              fg: "text-indigo-500"             },
  "farmer.farmgate_price_updated":{ Icon: DollarSign, bg: "bg-emerald-50",           fg: "text-emerald-600"            },
  "farmer.cost_added":        { Icon: DollarSign,   bg: "bg-emerald-50",             fg: "text-emerald-600"            },
  "farmer":                   { Icon: Sprout,       bg: "bg-[var(--hw-green-50)]",   fg: "text-[var(--hw-green-700)]"  },
  // Notifications
  "notification":             { Icon: Bell,         bg: "bg-yellow-50",              fg: "text-yellow-600"             },
  // Exports
  "export":                   { Icon: FileDown,     bg: "bg-[var(--hw-neutral-100)]", fg: "text-[var(--hw-neutral-500)]" },
  // Security (catch-all for auth.*)
  "auth":                     { Icon: ShieldAlert,  bg: "bg-[var(--hw-neutral-100)]", fg: "text-[var(--hw-neutral-500)]" },
};

function getActionMeta(action) {
  if (!action) return ACTION_META["auth"]; // default
  // Exact match first
  if (ACTION_META[action]) return ACTION_META[action];
  // Prefix match (longest first)
  const prefix = action.split(".")[0];
  return ACTION_META[prefix] || ACTION_META["auth"];
}

// ─── Friendly human labels override ──────────────────────────────────────────
// These replace the i18n label with an even simpler first-person phrase.
const FRIENDLY_LABEL_FALLBACKS = {
  "auth.login": "You opened HarvestWise",
  "auth.logout": "You closed HarvestWise",
  "auth.login_failed": "Sign-in attempt was unsuccessful",
  "auth.account_locked": "Account was temporarily locked",
  "notification.all_marked_read": "You checked your notifications",
  "notification.mark_read": "You read a notification",
};

function getFriendlyLabel(action, lang, translate) {
  const fallback = FRIENDLY_LABEL_FALLBACKS[action];
  return fallback
    ? translate(`farmer.myActivities.friendlyActions.${action}`, {}, fallback)
    : formatFarmerActionLabel(action, lang);
}

// ─── Timestamp helpers ────────────────────────────────────────────────────────

const parseLocalDate = parseApiDateTime;

function localeFor(langCode) {
  return langCode === "ceb" ? "ceb-PH" : langCode === "tl" ? "tl-PH" : "en-PH";
}

function friendlyTime(isoStr, langCode) {
  const d = parseLocalDate(isoStr);
  if (!d) return "";
  return d.toLocaleString(localeFor(langCode), {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  });
}

function dayKey(isoStr) {
  const d = parseLocalDate(isoStr);
  if (!d) return "earlier";
  const mla = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const itemStr  = `${mla.getFullYear()}-${mla.getMonth()}-${mla.getDate()}`;
  if (itemStr === todayStr) return "today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
  if (itemStr === yStr) return "yesterday";
  return "earlier";
}

function friendlyDate(isoStr, langCode) {
  const d = parseLocalDate(isoStr);
  if (!d) return "";
  return d.toLocaleDateString(localeFor(langCode), {
    weekday: "long", month: "long", day: "numeric",
    timeZone: "Asia/Manila",
  });
}

// ─── Date filter → API params ─────────────────────────────────────────────────
function filterToParams(filter) {
  const now = new Date();
  const mlaOffset = 8 * 60; // UTC+8
  const mla = new Date(now.getTime() + (mlaOffset - now.getTimezoneOffset()) * 60000);
  const pad = (n) => String(n).padStart(2, "0");
  const today = `${mla.getFullYear()}-${pad(mla.getMonth() + 1)}-${pad(mla.getDate())}`;

  if (filter === "today") {
    return { date_from: today, date_to: today };
  }
  if (filter === "week") {
    const monday = new Date(mla);
    monday.setDate(mla.getDate() - ((mla.getDay() + 6) % 7));
    const from = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    return { date_from: from, date_to: today };
  }
  if (filter === "month") {
    const from = `${mla.getFullYear()}-${pad(mla.getMonth() + 1)}-01`;
    return { date_from: from, date_to: today };
  }
  return {}; // "all"
}

// ─── Activity card ────────────────────────────────────────────────────────────

function ActivityCard({ item, langCode, translate }) {
  const [expanded, setExpanded] = useState(false);
  const { Icon, bg, fg } = getActionMeta(item.action);
  const label = getFriendlyLabel(item.action, langCode, translate);
  const hasDetail = Boolean(item.details);
  // Is this a "system / security" type event that should be less prominent?
  const muted = item.action?.startsWith("auth.") &&
    item.action !== "auth.login" &&
    item.action !== "auth.logout";

  return (
    <div
      className={`flex items-start gap-3 py-3.5 px-1 ${muted ? "opacity-70" : ""}`}
      role="listitem"
    >
      {/* Icon */}
      <div className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon className={`w-4.5 h-4.5 ${fg}`} strokeWidth={2} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] sm:text-[15px] font-semibold text-[var(--hw-neutral-900)] leading-snug">
          {label}
        </p>
        <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">{friendlyTime(item.created_at, langCode)}</p>

        {/* Collapsible detail */}
        {hasDetail && (
          <div className="mt-1.5">
            {expanded && (
              <p className="text-[12px] text-[var(--hw-neutral-600)] leading-relaxed break-words">
                {item.details}
              </p>
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-[var(--hw-green-700)] cursor-pointer"
              aria-expanded={expanded}
            >
              {expanded ? (
                <><ChevronUp className="w-3 h-3" /> {translate("farmer.myActivities.hideDetails", {}, "Hide details")}</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> {translate("farmer.myActivities.showDetails", {}, "Show details")}</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;
const EXPORT_PAGE_SIZE = 100;

const FILTER_OPTIONS = [
  { value: "all",   label: "All activities"  },
  { value: "today", label: "Today"           },
  { value: "week",  label: "This week"       },
  { value: "month", label: "This month"      },
];

export default function MyActivities() {
  const { t, langCode } = useLanguage();
  const auth = useOptionalAuth();
  const user = auth?.user;
  const queryClient = useQueryClient();

  const [filter, setFilter]               = useState("all");
  const [filterOpen, setFilterOpen]       = useState(false);
  const [page, setPage]                   = useState(1);
  const [exporting, setExporting]         = useState(false);
  const filterRef                         = useRef(null);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    if (!filterOpen) return;
    function onOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [filterOpen]);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [filter]);

  const apiParams = { ...filterToParams(filter), page, page_size: PAGE_SIZE };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["farmerMyActivities", filter, page],
    queryFn: () => farmerApi.getMyActivities(apiParams),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Group items by Today / Yesterday / Earlier
  const grouped = items.reduce((acc, item) => {
    const key = dayKey(item.created_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const GROUP_ORDER = ["today", "yesterday", "earlier"];
  const GROUP_LABELS = {
    today: t("farmer.myActivities.groups.today", {}, "Today"),
    yesterday: t("farmer.myActivities.groups.yesterday", {}, "Yesterday"),
    earlier: t("farmer.myActivities.groups.earlier", {}, "Earlier"),
  };

  // ── Export PDF ──────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      // Fetch all pages matching the current filter
      const all = [];
      let pageNo = 1;
      for (;;) {
        const res = await farmerApi.getMyActivities({
          ...filterToParams(filter),
          page: pageNo,
          page_size: EXPORT_PAGE_SIZE,
        });
        all.push(...(res.items ?? []));
        if (all.length >= (res.total ?? 0) || (res.items ?? []).length === 0) break;
        pageNo += 1;
      }

      const generatedAt = new Date().toLocaleString("en-PH", {
        year: "numeric", month: "short", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: true,
        timeZone: "Asia/Manila",
      });
      const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
      const generatedBy = formatPersonName(fullName) || user?.email || "HarvestWise user";
      const activeFilter = t(`farmer.myActivities.filters.${filter}`, {}, "All activities");

      const doc = await createAuditLogsPdf({
        logs: all,
        total: all.length,
        filterLabel: `My Activities — ${activeFilter}`,
        generatedAt,
        generatedBy,
      });

      const slug = new Date().toISOString().slice(0, 10);
      const filename = `my-activities-${slug}.pdf`;
      doc.save(filename);

      // Record the export
      try {
        await farmerApi.recordActivity({
          action: "export.my_activities_pdf",
          details: `Exported My Activities PDF '${filename}' (${all.length} record(s), filter: ${activeFilter}).`,
          metadata: { filename, count: all.length },
        });
        queryClient.invalidateQueries({ queryKey: ["farmerMyActivities"] });
        queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      } catch {
        // Recording failure must not block the download
      }
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const activeFilterLabel = t(`farmer.myActivities.filters.${filter}`, {}, "All activities");

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-bold text-black">{t("farmer.myActivities.title", {}, "My Activities")}</h1>
          <p className="text-[13px] sm:text-[14px] text-[var(--hw-neutral-500)] mt-0.5 leading-snug">
            {t("farmer.myActivities.description", {}, "A record of what you have done in HarvestWise.")}
          </p>
        </div>

        {/* Export PDF — secondary */}
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          aria-label={t("farmer.myActivities.exportPdf", {}, "Export PDF")}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-[var(--hw-neutral-200)] rounded-xl text-[var(--hw-neutral-600)] bg-white hover:bg-[var(--hw-neutral-50)] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <FileText className={`w-3.5 h-3.5 text-[var(--hw-green-700)] ${exporting ? "animate-pulse" : ""}`} />
          {exporting ? t("farmer.myActivities.preparing", {}, "Preparing…") : t("farmer.myActivities.exportPdf", {}, "Export PDF")}
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 mb-5" ref={filterRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-label={t("farmer.myActivities.filter", {}, "Filter activities")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold border border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer shadow-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {t("farmer.myActivities.filterButton", {}, "Filter")}
            {filter !== "all" && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[11px] rounded-full bg-[var(--hw-green-700)] text-white">
                {activeFilterLabel}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {filterOpen && (
            <div className="absolute left-0 top-full mt-2 w-44 bg-white border border-[var(--hw-neutral-200)] rounded-2xl shadow-lg overflow-hidden z-20">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setFilter(opt.value); setFilterOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors cursor-pointer ${
                    filter === opt.value
                      ? "bg-[var(--hw-green-50)] text-[var(--hw-green-800)] font-semibold"
                      : "text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"
                  }`}
                >
                  {t(`farmer.myActivities.filters.${opt.value}`, {}, opt.label)}
                </button>
              ))}
            </div>
          )}
        </div>

        {filter !== "all" && (
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="text-[12px] text-[var(--hw-neutral-500)] hover:text-black transition-colors cursor-pointer"
          >
            {t("farmer.myActivities.clear", {}, "Clear")}
          </button>
        )}
      </div>

      {/* ── Feed ── */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-[var(--hw-neutral-100)] p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--hw-neutral-100)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[var(--hw-neutral-100)] rounded w-2/3" />
                  <div className="h-3 bg-[var(--hw-neutral-100)] rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="py-16 text-center">
          <p className="text-[14px] text-[var(--hw-neutral-500)]">
            {t("farmer.myActivities.loadError", {}, "Could not load your activities. Please try again.")}
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[var(--hw-neutral-100)] flex items-center justify-center">
            <Sprout className="w-6 h-6 text-[var(--hw-neutral-400)]" />
          </div>
          <p className="text-[15px] font-semibold text-[var(--hw-neutral-700)]">{t("farmer.myActivities.emptyTitle", {}, "No activities yet")}</p>
          <p className="text-[13px] text-[var(--hw-neutral-500)] max-w-xs">
            {filter !== "all"
              ? t("farmer.myActivities.emptyFiltered", {}, "No activities found for the selected period.")
              : t("farmer.myActivities.emptyDescription", {}, "Your activities will appear here as you use HarvestWise.")}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {GROUP_ORDER.filter((g) => grouped[g]?.length).map((group) => (
            <div key={group}>
              {/* Group heading */}
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--hw-neutral-400)] mb-1 px-1">
                {GROUP_LABELS[group]}
                {group === "earlier" && grouped[group][0] && (
                  <span className="ml-2 normal-case tracking-normal font-normal">
                    — {friendlyDate(grouped[group][0].created_at, langCode)}
                  </span>
                )}
              </p>

              {/* Cards */}
              <div
                className="bg-white rounded-2xl border border-[var(--hw-neutral-100)] shadow-[0_1px_4px_rgba(0,0,0,0.05)] divide-y divide-[var(--hw-neutral-100)] px-4"
                role="list"
                aria-label={GROUP_LABELS[group]}
              >
                {grouped[group].map((item) => (
                  <ActivityCard key={item.id} item={item} langCode={langCode} translate={t} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] bg-white hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {t("farmer.myActivities.previous", {}, "Previous")}
          </button>
          <span className="text-[13px] text-[var(--hw-neutral-500)]">
            {t("farmer.myActivities.page", { page, total: totalPages }, `Page ${page} of ${totalPages}`)}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-4 py-2 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] bg-white hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {t("farmer.myActivities.next", {}, "Next")}
          </button>
        </div>
      )}
    </div>
  );
}
