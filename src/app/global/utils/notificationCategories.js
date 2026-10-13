/**
 * Single source of truth for the notification category taxonomy.
 *
 * Three consumers used to enumerate the same categories independently, so a new
 * category had to be added in three places and a miss was silent — the category
 * fell back to the default bell icon and the urgency defaulted to
 * "information". This module is the one place a category is declared.
 *
 * Each entry carries the static presentation facts:
 *   Icon/color/bg  the glyph shown in the feed card
 *   urgency        the urgency level, resolved through URGENCY_LEVELS
 *   actionLabel    the drawer's primary button copy
 *   reason         human copy for "why you received this" (no enum names)
 *
 * Dynamic per-item resolution stays where the metadata lives: price direction
 * in NotificationIcon, and the role/commodity deep links in notificationRoutes.
 */

import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  CloudSun,
  Database,
  Info,
  Lightbulb,
  PhilippinePeso,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Sprout,
  TriangleAlert,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";

/**
 * The urgency vocabulary. A category declares a level, the UI presents it.
 */
export const URGENCY_LEVELS = {
  urgent: {
    label: "Urgent",
    Icon: AlertOctagon,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  attention: {
    label: "Attention",
    Icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  information: {
    label: "Information",
    Icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  success: {
    label: "Completed",
    Icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
};

export const NOTIFICATION_CATEGORIES = {
  // Farmer
  price_change: {
    Icon: TrendingUp,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    urgency: "attention",
  },
  price_update: {
    Icon: PhilippinePeso,
    color: "text-blue-600",
    bg: "bg-blue-50",
    urgency: "information",
  },
  weather_alert: {
    Icon: CloudSun,
    color: "text-sky-600",
    bg: "bg-sky-50",
    urgency: "attention",
  },
  harvest_reminder: {
    Icon: CalendarDays,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    urgency: "information",
  },
  planting_advisory: {
    Icon: Sprout,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    urgency: "information",
  },

  // DFTC — these four are exactly what
  // notifications.service.notify_dftc_submission_event persists.
  submission_accepted: {
    Icon: CircleCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    urgency: "success",
    actionLabel: "View Dataset",
    reason: "Your submission was accepted and is being processed.",
  },
  submission_failed: {
    Icon: CircleX,
    color: "text-red-600",
    bg: "bg-red-50",
    urgency: "urgent",
    actionLabel: "View Error",
    reason: "Your submission could not be processed. Open it to see what failed.",
  },
  records_need_correction: {
    Icon: TriangleAlert,
    color: "text-amber-600",
    bg: "bg-amber-50",
    urgency: "attention",
    actionLabel: "Review Records",
    reason: "Some records need correction before this submission can be processed.",
  },
  upload_validation_completed: {
    Icon: ClipboardCheck,
    color: "text-blue-600",
    bg: "bg-blue-50",
    urgency: "information",
    actionLabel: "View Summary",
    reason: "Validation finished for your uploaded file.",
  },

  // Admin
  import_event: {
    Icon: Upload,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    urgency: "information",
  },
  processing_event: {
    Icon: Activity,
    color: "text-purple-600",
    bg: "bg-purple-50",
    urgency: "information",
  },
  advisory_event: {
    Icon: Lightbulb,
    color: "text-teal-600",
    bg: "bg-teal-50",
    urgency: "information",
  },
  data_event: {
    Icon: Database,
    color: "text-blue-600",
    bg: "bg-blue-50",
    urgency: "information",
  },
  system_event: {
    Icon: Server,
    color: "text-red-600",
    bg: "bg-red-50",
    urgency: "urgent",
  },
  config_event: {
    Icon: SlidersHorizontal,
    color: "text-amber-600",
    bg: "bg-amber-50",
    urgency: "attention",
  },
  user_event: {
    Icon: Users,
    color: "text-sky-600",
    bg: "bg-sky-50",
    urgency: "information",
  },
  auth_event: {
    Icon: ShieldCheck,
    color: "text-rose-600",
    bg: "bg-rose-50",
    urgency: "urgent",
  },
};

/** Used for any category not declared above, so nothing ever renders undefined. */
export const DEFAULT_CATEGORY_CONFIG = {
  Icon: Bell,
  color: "text-blue-600",
  bg: "bg-blue-50",
  urgency: "information",
};

export function getCategoryConfig(category) {
  return NOTIFICATION_CATEGORIES[category] || DEFAULT_CATEGORY_CONFIG;
}

export function getCategoryUrgency(category) {
  return getCategoryConfig(category).urgency || "information";
}

export function getCategoryActionLabel(category) {
  return getCategoryConfig(category).actionLabel || null;
}

/**
 * Human copy for "why you received this". Deliberately never the enum name —
 * this string is rendered to a DFTC officer in the alert drawer.
 */
export function getCategoryReason(category) {
  return getCategoryConfig(category).reason || null;
}

/** Every declared category, for tests that guard taxonomy coverage. */
export const ALL_CATEGORIES = Object.keys(NOTIFICATION_CATEGORIES);