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

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  ChevronLeft,
  ChevronRight,
  Activity,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { farmerApi } from "../../../services/api";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { formatFarmerActionLabel } from "../utils/activityActionLabels";
import { parseApiDateTime } from "../../global/utils/apiTransforms";
import { useCrops } from "../components/crops/CropsContext";

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

const RAW_CROP_ID_RE = /^(?:CRP|COM)-\d+$/i;

function isValidCropName(candidate) {
  const clean = String(candidate || "").trim();
  return Boolean(clean) && clean !== "–" && !RAW_CROP_ID_RE.test(clean) && !/^crop plan$/i.test(clean);
}

function resolveCropName(details = "", crops = [], item = null) {
  const afterName = item?.after_values?.commodity_name || item?.before_values?.commodity_name;
  if (isValidCropName(afterName)) return String(afterName).trim();

  const detailStr = String(details || "").trim();
  const planIdCandidate =
    detailStr.match(/\b(CRP-\d+)\b/i)?.[1] ||
    item?.after_values?.plan_id ||
    item?.before_values?.plan_id;

  if (planIdCandidate) {
    const planId = String(planIdCandidate).toUpperCase();
    const matched = (crops || []).find((c) => (c.id || "").toUpperCase() === planId);
    if (matched) {
      const base = matched.commodityName || matched.name || "";
      const full = matched.variant ? `${base} - ${matched.variant}` : base;
      if (isValidCropName(full)) return full;
    }
  }

  const commIdCandidate =
    detailStr.match(/\b(COM-\d+)\b/i)?.[1] ||
    item?.after_values?.commodity_id ||
    item?.before_values?.commodity_id;

  if (commIdCandidate) {
    const commId = String(commIdCandidate).toUpperCase();
    const matched = (crops || []).find((c) => (c.commodityId || c.commodity || "").toUpperCase() === commId);
    if (matched) {
      const base = matched.commodityName || matched.name || "";
      const full = matched.variant ? `${base} - ${matched.variant}` : base;
      if (isValidCropName(full)) return full;
    }
  }

  const forMatch = detailStr.match(/(?:for|alang sa|para sa|from|sa)\s+([^()—.]+?)(?:\s+crop plan|\s*\(|$)/i);
  if (forMatch && isValidCropName(forMatch[1])) {
    return forMatch[1].trim();
  }

  const draftMatch = detailStr.match(/Crop plan draft\s+(.+?)\s+saved/i);
  if (draftMatch && isValidCropName(draftMatch[1])) {
    return draftMatch[1].trim();
  }

  return "";
}

export function getFriendlyLabel(action, lang, translate, details = "", crops = [], item = null) {
  // If this action relates to a crop plan and resolves to a real commodity/variety name, personalize the headline.
  if (action && action.startsWith("farmer.")) {
    const cropName = resolveCropName(details, crops, item);

    if (cropName) {
      if (action === "farmer.crop_plan_draft_saved") {
        if (lang === "ceb") return `Gi-save nimo ang draft sa plano sa tanom alang sa ${cropName}`;
        if (lang === "tl") return `Ni-save mo ang draft ng plano sa pananim para sa ${cropName}`;
        return `You saved a crop plan draft for ${cropName}`;
      }
      if (action === "farmer.crop_plan_created") {
        if (lang === "ceb") return `Naghimo ka og bag-ong plano sa tanom alang sa ${cropName}`;
        if (lang === "tl") return `Gumawa ka ng bagong plano sa pananim para sa ${cropName}`;
        return `You created a new crop plan for ${cropName}`;
      }
      if (action === "farmer.crop_plan_updated") {
        if (lang === "ceb") return `Giusab nimo ang imong plano sa tanom alang sa ${cropName}`;
        if (lang === "tl") return `Binago mo ang iyong plano sa pananim para sa ${cropName}`;
        return `You updated your crop plan for ${cropName}`;
      }
      if (action === "farmer.crop_plan_promoted") {
        if (lang === "ceb") return `Gisugdan nimo ang plano sa tanom alang sa ${cropName}`;
        if (lang === "tl") return `Sinimulan mo ang plano sa pananim para sa ${cropName}`;
        return `You started a crop plan for ${cropName}`;
      }
      if (action === "farmer.crop_plan_status_updated") {
        if (lang === "ceb") return `Giusab nimo ang kahimtang sa plano sa tanom alang sa ${cropName}`;
        if (lang === "tl") return `Binago mo ang katayuan ng plano sa pananim para sa ${cropName}`;
        return `You updated crop plan status for ${cropName}`;
      }
      if (action === "farmer.harvest_logged" || action === "farmer.harvest_record_logged") {
        if (lang === "ceb") return `Nagrekord ka og ani alang sa ${cropName}`;
        if (lang === "tl") return `Nagrekord ka ng ani para sa ${cropName}`;
        return `You logged a harvest for ${cropName}`;
      }
      if (action === "farmer.farmgate_price_updated") {
        if (lang === "ceb") return `Giusab nimo ang presyo sa farmgate alang sa ${cropName}`;
        if (lang === "tl") return `Binago mo ang presyong farmgate para sa ${cropName}`;
        return `You updated expected farmgate price for ${cropName}`;
      }
      if (action === "farmer.cost_added") {
        if (lang === "ceb") return `Nagdugang ka og gasto sa produksyon alang sa ${cropName}`;
        if (lang === "tl") return `Nagdagdag ka ng gastos sa produksyon para sa ${cropName}`;
        return `You added a production cost for ${cropName}`;
      }
    }
  }

  const i18nFriendly = translate(`farmer.myActivities.friendlyActions.${action}`, {}, "");
  if (i18nFriendly && i18nFriendly !== `farmer.myActivities.friendlyActions.${action}`) {
    return i18nFriendly;
  }
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

// Month and weekday names for guaranteed localization across all platforms
const CEB_DAYS = ["Domingo", "Lunes", "Martes", "Miyerkules", "Huwebes", "Biyernes", "Sabado"];
const CEB_MONTHS = [
  "Enero", "Pebrero", "Marso", "Abril", "Mayo", "Hunyo",
  "Hulyo", "Agosto", "Setyembre", "Oktubre", "Nobyembre", "Disyembre"
];

function friendlyDate(isoStr, langCode) {
  const d = parseLocalDate(isoStr);
  if (!d) return "";
  // Ensure Manila timezone
  const mla = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Manila" }));

  if (langCode === "ceb" || langCode === "tl") {
    const dayName = CEB_DAYS[mla.getDay()];
    const monthName = CEB_MONTHS[mla.getMonth()];
    const dayNum = mla.getDate();
    return `${dayName}, ${monthName} ${dayNum}`;
  }

  return d.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
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

// ─── Language code mappings for friendly display ─────────────────────────────
const LANGUAGE_NAMES = {
  en: "English",
  ceb: "Cebuano",
  tl: "Tagalog",
};

// ─── Format detail string to avoid raw IDs and show specific labels in active language ──
export function formatActivityDetails(details, crops = [], langCode = "en", item = null) {
  if (!details) return "";
  let text = String(details).trim();

  // 1. Language preference updates: specify actual language and localize the phrase
  const langMatch = text.match(/Updated profile:\s*(?:language to\s*(\w+)|preferred_language)/i);
  if (langMatch) {
    const rawTargetLang = langMatch[1] || (langCode === "ceb" ? "Cebuano" : langCode === "tl" ? "Tagalog" : "English");
    if (langCode === "ceb") {
      let displayedLang = "Bisaya";
      if (/tagalog|filipino/i.test(rawTargetLang)) displayedLang = "Filipino";
      else if (/english|iningles/i.test(rawTargetLang)) displayedLang = "English";
      return `Giusab ang profile: lenggwahe sa ${displayedLang}`;
    }
    if (langCode === "tl") {
      let displayedLang = "Bisaya";
      if (/tagalog|filipino/i.test(rawTargetLang)) displayedLang = "Filipino";
      else if (/english|ingles/i.test(rawTargetLang)) displayedLang = "English";
      return `Binago ang profile: wika sa ${displayedLang}`;
    }
    const enLang = LANGUAGE_NAMES[rawTargetLang.toLowerCase()] || rawTargetLang;
    return `Updated profile: language to ${enLang}`;
  }

  // 2. Resolve any crop plan / commodity IDs (CRP-XXXX, COM-XXXX) and normalize spacing right away
  const resolvedCropName = resolveCropName(text, crops, item);
  text = text.replace(/\b(?:CRP|COM)-\d+\b/gi, resolvedCropName || "");
  text = text.replace(/\s{2,}/g, " ").trim();

  // 3. Draft saved patterns
  const draftMatch = text.match(/(?:Crop plan draft\s+(.+?)\s+saved|Saved a draft crop plan for\s+([^.]+)|Saved draft for\s+([^.]+))/i);
  if (draftMatch) {
    const rawCandidate = (draftMatch[1] || draftMatch[2] || draftMatch[3] || resolvedCropName).trim();
    const crop = isValidCropName(rawCandidate) ? rawCandidate : resolvedCropName;
    if (crop) {
      if (langCode === "ceb") return `Na-save ang draft sa plano sa tanom alang sa ${crop}`;
      if (langCode === "tl") return `Na-save ang draft ng plano sa pananim para sa ${crop}`;
      return `Saved draft crop plan for ${crop}`;
    }
  }

  if (/^Crop\s+plan\s+draft\s+saved$/i.test(text) || /Crop\s+plan\s+draft\s+saved/i.test(text)) {
    if (resolvedCropName) {
      if (langCode === "ceb") return `Na-save ang draft sa plano sa tanom alang sa ${resolvedCropName}`;
      if (langCode === "tl") return `Na-save ang draft ng plano sa pananim para sa ${resolvedCropName}`;
      return `Saved draft crop plan for ${resolvedCropName}`;
    }
    if (langCode === "ceb") return "Na-save ang draft sa plano sa tanom";
    if (langCode === "tl") return "Na-save ang draft ng plano sa pananim";
    return "Crop plan draft saved";
  }

  // 4. Created crop plan
  const createMatch = text.match(/Created a new crop plan for\s+([^()]+)(?:\(status:\s*([^)]+)\))?/i);
  if (createMatch) {
    const crop = createMatch[1].trim();
    const status = createMatch[2]?.trim();
    if (langCode === "ceb") {
      return `Naghimo og bag-ong plano sa tanom alang sa ${crop}${status ? ` (kahimtang: ${status})` : ""}`;
    }
    if (langCode === "tl") {
      return `Gumawa ng bagong plano sa pananim para sa ${crop}${status ? ` (katayuan: ${status})` : ""}`;
    }
  }

  // 5. Updated crop plan
  const updateMatch = text.match(/Updated crop plan for\s+([^()]+)(?:\(status:\s*([^)]+)\))?/i);
  if (updateMatch) {
    const crop = updateMatch[1].trim();
    const status = updateMatch[2]?.trim();
    if (langCode === "ceb") {
      return `Giusab ang plano sa tanom alang sa ${crop}${status ? ` (kahimtang: ${status})` : ""}`;
    }
    if (langCode === "tl") {
      return `Binago ang plano sa pananim para sa ${crop}${status ? ` (katayuan: ${status})` : ""}`;
    }
  }

  // 6. Promoted / started crop plan
  const promoteMatch = text.match(/Started crop plan for\s+([^—]+)—\s*status changed from\s+([^\s]+)\s+to\s+(.+)/i);
  if (promoteMatch) {
    const crop = promoteMatch[1].trim();
    const prev = promoteMatch[2].trim();
    const next = promoteMatch[3].trim();
    if (langCode === "ceb") return `Gisugdan ang plano sa tanom alang sa ${crop} — giusab gikan sa ${prev} ngadto sa ${next}`;
    if (langCode === "tl") return `Sinimulan ang plano sa pananim para sa ${crop} — binago mula ${prev} patungong ${next}`;
  }

  // 7. Crop plan status updated
  const statusMatch = text.match(/Updated crop plan status for\s+([^—]+)—\s*([^\s→]+)\s*→\s*(.+)/i);
  if (statusMatch) {
    const crop = statusMatch[1].trim();
    const prev = statusMatch[2].trim();
    const next = statusMatch[3].trim();
    if (langCode === "ceb") return `Giusab ang kahimtang sa plano sa tanom alang sa ${crop} — ${prev} → ${next}`;
    if (langCode === "tl") return `Binago ang katayuan ng plano sa pananim para sa ${crop} — ${prev} → ${next}`;
  }

  // 8. Harvest logged
  const harvestMatch = text.match(/Logged harvest(?: record)? for\s+([^—]+)—\s*([\d.]+)\s*kg on\s*([^\s]+)/i);
  if (harvestMatch) {
    const crop = harvestMatch[1].trim();
    const qty = harvestMatch[2].trim();
    const date = harvestMatch[3].trim();
    if (langCode === "ceb") return `Nagrekord og ani alang sa ${crop} — ${qty} kg niadtong ${date}`;
    if (langCode === "tl") return `Nagrekord ng ani para sa ${crop} — ${qty} kg noong ${date}`;
  }

  // 9. Farmgate price updated
  const farmgateMatch = text.match(/Updated expected farmgate price for\s+(.+?)\s+to\s+([\d.]+)/i);
  if (farmgateMatch) {
    const crop = farmgateMatch[1].trim();
    const price = farmgateMatch[2].trim();
    if (langCode === "ceb") return `Giusab ang presyo sa farmgate alang sa ${crop} ngadto sa ₱${price}`;
    if (langCode === "tl") return `Binago ang inaasahang presyong farmgate para sa ${crop} sa ₱${price}`;
  }

  // 10. General profile update detail translations
  if (text.startsWith("Updated profile:")) {
    const rest = text.replace(/^Updated profile:\s*/i, "").trim();
    if (langCode === "ceb") return `Giusab ang profile: ${rest}`;
    if (langCode === "tl") return `Binago ang profile: ${rest}`;
  }

  return text;
}

// ─── Activity card ────────────────────────────────────────────────────────────

function ActivityCard({ item, crops, langCode, translate }) {
  const [expanded, setExpanded] = useState(false);
  const { Icon, bg, fg } = getActionMeta(item.action);
  const label = getFriendlyLabel(item.action, langCode, translate, item.details, crops, item);
  const cleanedDetail = formatActivityDetails(item.details, crops, langCode, item);
  const hasDetail = Boolean(cleanedDetail);
  // Is this a "system / security" type event that should be less prominent?
  const muted = item.action?.startsWith("auth.") &&
    item.action !== "auth.login" &&
    item.action !== "auth.logout";

  return (
    <div
      className={`group flex items-start gap-3 sm:gap-4 py-4 px-4 sm:px-6 transition-colors hover:bg-[var(--hw-neutral-50)]/70 ${
        muted ? "opacity-75" : ""
      }`}
      role="listitem"
    >
      {/* Icon */}
      <div
        className={`mt-0.5 flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border border-black/5 shadow-2xs ${bg}`}
      >
        <Icon className={`w-5 h-5 sm:w-5.5 sm:h-5.5 ${fg}`} strokeWidth={2} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-3">
          <p className="text-[14px] sm:text-[15px] font-semibold text-[var(--hw-neutral-900)] leading-snug">
            {label}
          </p>
          <time
            dateTime={item.created_at}
            className="text-[12px] sm:text-[12.5px] font-medium text-[var(--hw-neutral-500)] flex-shrink-0"
          >
            {friendlyTime(item.created_at, langCode)}
          </time>
        </div>

        {/* Collapsible detail */}
        {hasDetail && (
          <div className="mt-1.5">
            {expanded && (
              <div className="mt-2 p-2.5 sm:p-3 rounded-xl bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)]/80 text-[12.5px] sm:text-[13px] text-[var(--hw-neutral-700)] leading-relaxed break-words font-sans">
                {cleanedDetail}
              </div>
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors cursor-pointer select-none"
              aria-expanded={expanded}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  {translate("farmer.myActivities.hideDetails", {}, "Hide details")}
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  {translate("farmer.myActivities.showDetails", {}, "Show details")}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

const FILTER_OPTIONS = [
  { value: "all",    label: "All activities" },
  { value: "today",  label: "Today"          },
  { value: "week",   label: "This week"      },
  { value: "month",  label: "This month"     },
  { value: "custom", label: "Custom date…"   },
];

export default function MyActivities() {
  const { t, langCode } = useLanguage();
  const { crops = [] } = useCrops();

  const [filter, setFilter]         = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage]             = useState(1);
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [pendingRange, setPendingRange] = useState({ from: "", to: "" });
  const [customError, setCustomError] = useState("");
  const filterRef                   = useRef(null);

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

  // Reset page when filter or customRange changes
  useEffect(() => {
    setPage(1);
  }, [filter, customRange]);

  const apiParams = useMemo(() => {
    if (filter === "custom" && customRange.from && customRange.to) {
      return {
        date_from: customRange.from,
        date_to: customRange.to,
        page,
        page_size: PAGE_SIZE,
      };
    }
    return { ...filterToParams(filter), page, page_size: PAGE_SIZE };
  }, [filter, customRange, page]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["farmerMyActivities", filter, customRange, page],
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

  const activeFilterLabel = useMemo(() => {
    if (filter === "custom") {
      if (customRange.from && customRange.to) {
        return `${customRange.from} – ${customRange.to}`;
      }
      return t("farmer.myActivities.filters.custom", {}, "Custom date…");
    }
    return t(`farmer.myActivities.filters.${filter}`, {}, "All activities");
  }, [filter, customRange, t]);

  const handleApplyCustomDate = () => {
    if (!pendingRange.from || !pendingRange.to) {
      return;
    }
    if (pendingRange.from > pendingRange.to) {
      setCustomError(t("farmer.myActivities.customDate.invalidRange", {}, "Start date cannot be after end date"));
      return;
    }
    setCustomError("");
    setCustomRange(pendingRange);
    setFilter("custom");
    setFilterOpen(false);
  };

  // Calculate pagination window for desktop
  const getPaginationItems = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (page < totalPages - 2) pages.push("...");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  const startRecord = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endRecord = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 py-5 sm:py-7 pb-24 md:pb-12 max-w-4xl mx-auto space-y-6">

      {/* ── Clean Header (Right-justified filter, no subtext / badge / export PDF) ── */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-[var(--hw-neutral-200)]">
        <div>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-[var(--hw-neutral-900)] tracking-tight">
            {t("farmer.myActivities.title", {}, "My Activities")}
          </h1>
        </div>

        {/* ── Right-justified Filter button & controls ── */}
        <div className="flex items-center gap-2" ref={filterRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setFilterOpen((v) => !v);
                if (!filterOpen) {
                  setPendingRange(customRange.from ? customRange : { from: "", to: "" });
                  setCustomError("");
                }
              }}
              aria-label={t("farmer.myActivities.filter", {}, "Filter activities")}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold border border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] hover:border-[var(--hw-neutral-300)] transition-colors cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--hw-green-700)]" />
              <span>{t("farmer.myActivities.filterButton", {}, "Filter")}</span>
              {filter !== "all" && (
                <span className="text-[12px] font-medium text-[var(--hw-green-800)] max-w-[130px] sm:max-w-none truncate">
                  · {activeFilterLabel}
                </span>
              )}
            </button>

            {/* Filter Dropdown */}
            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-[var(--hw-neutral-200)] rounded-2xl shadow-xl overflow-hidden z-20 animate-in fade-in zoom-in-95 p-2">
                <div className="space-y-1">
                  {FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        if (opt.value === "custom") {
                          setFilter("custom");
                        } else {
                          setFilter(opt.value);
                          setFilterOpen(false);
                        }
                      }}
                      className={`w-full text-left px-3.5 py-2 rounded-xl text-[13px] font-medium transition-colors cursor-pointer flex items-center justify-between ${
                        filter === opt.value
                          ? "bg-[var(--hw-green-50)] text-[var(--hw-green-800)] font-semibold"
                          : "text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"
                      }`}
                    >
                      <span>{t(`farmer.myActivities.filters.${opt.value}`, {}, opt.label)}</span>
                      {filter === opt.value && (
                        <CheckCircle2 className="w-4 h-4 text-[var(--hw-green-700)]" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom Date Form */}
                {filter === "custom" && (
                  <div className="mt-2 pt-2 border-t border-[var(--hw-neutral-100)] px-2 pb-1 space-y-2.5">
                    <p className="text-[11.5px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wider">
                      {t("farmer.myActivities.customDate.title", {}, "Custom date range")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-[var(--hw-neutral-600)] mb-1">
                          {t("farmer.myActivities.customDate.from", {}, "From")}
                        </label>
                        <input
                          type="date"
                          value={pendingRange.from}
                          onChange={(e) => setPendingRange((prev) => ({ ...prev, from: e.target.value }))}
                          className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] text-[var(--hw-neutral-800)] focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-600)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[var(--hw-neutral-600)] mb-1">
                          {t("farmer.myActivities.customDate.to", {}, "To")}
                        </label>
                        <input
                          type="date"
                          value={pendingRange.to}
                          onChange={(e) => setPendingRange((prev) => ({ ...prev, to: e.target.value }))}
                          className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] text-[var(--hw-neutral-800)] focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-600)]"
                        />
                      </div>
                    </div>
                    {customError && (
                      <p className="text-[11px] text-red-600 font-medium">
                        {customError}
                      </p>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setFilterOpen(false)}
                        className="px-2.5 py-1 text-[12px] font-medium text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-900)] transition-colors cursor-pointer"
                      >
                        {t("farmer.myActivities.customDate.cancel", {}, "Cancel")}
                      </button>
                      <button
                        type="button"
                        disabled={!pendingRange.from || !pendingRange.to}
                        onClick={handleApplyCustomDate}
                        className="px-3.5 py-1 text-[12px] font-semibold text-white bg-[var(--hw-green-700)] hover:bg-[var(--hw-green-800)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-2xs transition-colors cursor-pointer"
                      >
                        {t("farmer.myActivities.customDate.apply", {}, "Apply")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {filter !== "all" && (
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setCustomRange({ from: "", to: "" });
              }}
              className="px-2 py-2 text-[12px] font-medium text-[var(--hw-neutral-500)] hover:text-[var(--hw-neutral-900)] transition-colors cursor-pointer"
            >
              {t("farmer.myActivities.clear", {}, "Clear")}
            </button>
          )}
        </div>
      </div>

      {/* ── Feed Section ── */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] p-4 sm:p-5 animate-pulse"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--hw-neutral-100)] flex-shrink-0" />
                <div className="flex-1 space-y-2.5 pt-1">
                  <div className="h-4 bg-[var(--hw-neutral-100)] rounded w-2/5" />
                  <div className="h-3 bg-[var(--hw-neutral-100)] rounded w-1/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-2xs p-6">
          <p className="text-[14px] text-[var(--hw-neutral-600)]">
            {t("farmer.myActivities.loadError", {}, "Could not load your activities. Please try again.")}
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 sm:py-20 flex flex-col items-center gap-3 text-center bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-2xs px-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--hw-green-50)] text-[var(--hw-green-700)] flex items-center justify-center">
            <Sprout className="w-6 h-6" />
          </div>
          <p className="text-[16px] font-semibold text-[var(--hw-neutral-800)]">
            {t("farmer.myActivities.emptyTitle", {}, "No activities yet")}
          </p>
          <p className="text-[13px] text-[var(--hw-neutral-500)] max-w-sm">
            {filter !== "all"
              ? t("farmer.myActivities.emptyFiltered", {}, "No activities found for the selected period.")
              : t("farmer.myActivities.emptyDescription", {}, "Your activities will appear here as you use HarvestWise.")}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {GROUP_ORDER.filter((g) => grouped[g]?.length).map((group) => (
            <div key={group} className="space-y-2">
              {/* Group heading */}
              <div className="flex items-center gap-2 px-1">
                <Calendar className="w-3.5 h-3.5 text-[var(--hw-neutral-400)]" />
                <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--hw-neutral-500)]">
                  {GROUP_LABELS[group]}
                  {group === "earlier" && grouped[group][0] && (
                    <span className="ml-2 normal-case tracking-normal font-normal text-[var(--hw-neutral-400)]">
                      — {friendlyDate(grouped[group][0].created_at, langCode)}
                    </span>
                  )}
                </h2>
              </div>

              {/* Card Group */}
              <div
                className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-2xs divide-y divide-[var(--hw-neutral-100)] overflow-hidden"
                role="list"
                aria-label={GROUP_LABELS[group]}
              >
                {grouped[group].map((item) => (
                  <ActivityCard
                    key={item.id}
                    item={item}
                    crops={crops}
                    langCode={langCode}
                    translate={t}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="pt-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-white border border-[var(--hw-neutral-200)] rounded-2xl shadow-2xs text-[13px]">
            {/* Record count indicator */}
            <p className="text-[12.5px] sm:text-[13px] text-[var(--hw-neutral-600)] font-medium text-center sm:text-left">
              {t(
                "farmer.myActivities.showingResults",
                { start: startRecord, end: endRecord, total },
                `Showing ${startRecord}–${endRecord} of ${total} activities`
              )}
            </p>

            {/* Mobile pagination controls */}
            <div className="flex sm:hidden items-center justify-between w-full pt-2 border-t border-[var(--hw-neutral-100)]">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--hw-neutral-200)] text-[12px] font-medium text-[var(--hw-neutral-700)] bg-white hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {t("farmer.myActivities.previous", {}, "Previous")}
              </button>
              <span className="text-[12px] font-semibold text-[var(--hw-neutral-800)]">
                {t("farmer.myActivities.pageOf", { page, total: totalPages }, `Page ${page} of ${totalPages}`)}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--hw-neutral-200)] text-[12px] font-medium text-[var(--hw-neutral-700)] bg-white hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {t("farmer.myActivities.next", {}, "Next")}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Desktop / Tablet pagination controls */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--hw-neutral-200)] text-[12.5px] font-medium text-[var(--hw-neutral-700)] bg-white hover:bg-[var(--hw-neutral-50)] hover:border-[var(--hw-neutral-300)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{t("farmer.myActivities.previous", {}, "Previous")}</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {getPaginationItems().map((item, idx) => {
                  if (item === "...") {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-2 py-1 text-[var(--hw-neutral-400)] select-none text-[12px]"
                      >
                        …
                      </span>
                    );
                  }
                  const isCurrent = item === page;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      aria-current={isCurrent ? "page" : undefined}
                      className={`min-w-[32px] h-8 px-2.5 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer ${
                        isCurrent
                          ? "bg-[var(--hw-green-700)] text-white font-semibold shadow-2xs"
                          : "text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-100)] border border-transparent"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--hw-neutral-200)] text-[12.5px] font-medium text-[var(--hw-neutral-700)] bg-white hover:bg-[var(--hw-neutral-50)] hover:border-[var(--hw-neutral-300)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <span>{t("farmer.myActivities.next", {}, "Next")}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
