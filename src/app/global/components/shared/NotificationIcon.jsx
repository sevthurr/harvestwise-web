import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  PhilippinePeso,
  CloudSun,
  CloudRain,
  CloudLightning,
  CalendarDays,
  Sprout,
  CircleCheck,
  CircleX,
  TriangleAlert,
  ClipboardCheck,
  Upload,
  Activity,
  Lightbulb,
  Database,
  Server,
  SlidersHorizontal,
  Users,
  ShieldCheck,
  Bell,
} from "lucide-react";
import { CommodityIllustration, getCommodityIconKey, COMMODITY_REGISTRY } from "./CommodityIllustrations";

const CATEGORY_MAP = {
  // Farmer
  price_change: { Icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  price_update: { Icon: PhilippinePeso, color: "text-blue-600", bg: "bg-blue-50" },
  weather_alert: { Icon: CloudSun, color: "text-sky-600", bg: "bg-sky-50" },
  harvest_reminder: { Icon: CalendarDays, color: "text-emerald-600", bg: "bg-emerald-50" },
  planting_advisory: { Icon: Sprout, color: "text-emerald-600", bg: "bg-emerald-50" },

  // DFTC
  submission_accepted: { Icon: CircleCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  submission_failed: { Icon: CircleX, color: "text-red-600", bg: "bg-red-50" },
  records_need_correction: { Icon: TriangleAlert, color: "text-amber-600", bg: "bg-amber-50" },
  upload_validation_completed: { Icon: ClipboardCheck, color: "text-blue-600", bg: "bg-blue-50" },

  // Admin
  import_event: { Icon: Upload, color: "text-indigo-600", bg: "bg-indigo-50" },
  processing_event: { Icon: Activity, color: "text-purple-600", bg: "bg-purple-50" },
  advisory_event: { Icon: Lightbulb, color: "text-teal-600", bg: "bg-teal-50" },
  data_event: { Icon: Database, color: "text-blue-600", bg: "bg-blue-50" },
  system_event: { Icon: Server, color: "text-red-600", bg: "bg-red-50" },
  config_event: { Icon: SlidersHorizontal, color: "text-amber-600", bg: "bg-amber-50" },
  user_event: { Icon: Users, color: "text-sky-600", bg: "bg-sky-50" },
  auth_event: { Icon: ShieldCheck, color: "text-rose-600", bg: "bg-rose-50" },
};

const DEFAULT_CATEGORY = { Icon: Bell, color: "text-blue-600", bg: "bg-blue-50" };

/**
 * Resolves a Top 10 commodity key ONLY from structured metadata.
 * Returns null if not in HarvestWise's Top 10 supported commodities.
 */
function resolveTop10CommodityKey(metadata = {}) {
  const commId = metadata?.commodity_id || metadata?.commodityId;
  const commName =
    metadata?.commodity_name ||
    metadata?.commodity ||
    metadata?.crop_name ||
    metadata?.cropName;
  const baseName = metadata?.base_name || metadata?.baseName;

  if (!commId && !commName && !baseName) {
    return null;
  }

  try {
    const iconKey = getCommodityIconKey(commId, baseName, commName);
    if (iconKey && COMMODITY_REGISTRY[iconKey]) {
      return iconKey;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Event-based icon config resolver for category and structured metadata.
 */
export function getNotificationIconConfig(category, metadata = {}) {
  // 1. Price change: TrendingUp, TrendingDown, or Minus based on change_pct / direction / prices
  if (category === "price_change") {
    let changePct = null;
    if (metadata.change_pct != null) changePct = Number(metadata.change_pct);
    else if (metadata.changePct != null) changePct = Number(metadata.changePct);
    else if (metadata.pct_change != null) changePct = Number(metadata.pct_change);

    if (changePct !== null && !isNaN(changePct)) {
      if (changePct > 0) return { Icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", label: "Price increased" };
      if (changePct < 0) return { Icon: TrendingDown, color: "text-red-600", bg: "bg-red-50", label: "Price decreased" };
      return { Icon: Minus, color: "text-amber-600", bg: "bg-amber-50", label: "Price unchanged" };
    }

    const direction = (metadata.direction || "").toLowerCase();
    if (direction === "rose" || direction === "up" || direction === "increased") {
      return { Icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", label: "Price increased" };
    }
    if (direction === "dropped" || direction === "down" || direction === "decreased" || direction === "falling") {
      return { Icon: TrendingDown, color: "text-red-600", bg: "bg-red-50", label: "Price decreased" };
    }

    if (metadata.latest != null && metadata.prev != null) {
      const latest = Number(metadata.latest);
      const prev = Number(metadata.prev);
      if (!isNaN(latest) && !isNaN(prev)) {
        if (latest > prev) return { Icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", label: "Price increased" };
        if (latest < prev) return { Icon: TrendingDown, color: "text-red-600", bg: "bg-red-50", label: "Price decreased" };
        return { Icon: Minus, color: "text-amber-600", bg: "bg-amber-50", label: "Price unchanged" };
      }
    }

    return { Icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", label: "Price movement" };
  }

  // 2. Weather alert: severity-based icon (severe -> CloudLightning, caution -> CloudRain, general -> CloudSun)
  if (category === "weather_alert") {
    const risk = (metadata.risk || metadata.severity || metadata.level || "").toLowerCase();
    if (risk === "severe" || risk === "danger" || risk === "high") {
      return { Icon: CloudLightning, color: "text-red-600", bg: "bg-red-50", label: "Severe weather" };
    }
    if (risk === "caution" || risk === "warning" || risk === "moderate") {
      return { Icon: CloudRain, color: "text-amber-600", bg: "bg-amber-50", label: "Weather caution" };
    }
    return { Icon: CloudSun, color: "text-sky-600", bg: "bg-sky-50", label: "Weather alert" };
  }

  // 3. Fallback to category map
  return CATEGORY_MAP[category] || DEFAULT_CATEGORY;
}

export function NotificationIcon({
  category,
  metadata = {},
  fallbackTitle = "",
  className = "w-4 h-4",
  containerClassName = "w-9 h-9 rounded-xl",
}) {
  // Top 10 commodity illustrations are ONLY used for harvest_reminder (crop plan)
  // or planting_advisory (updated planting / recommended crop)
  if (category === "harvest_reminder" || category === "planting_advisory") {
    const commodityKey = resolveTop10CommodityKey(metadata);
    if (commodityKey) {
      return (
        <div
          className={`${containerClassName} bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden shadow-xs`}
          title={`Commodity: ${commodityKey}`}
          data-testid={`commodity-icon-${commodityKey}`}
        >
          <CommodityIllustration commodityId={commodityKey} className="w-6 h-6 object-contain" />
        </div>
      );
    }
  }

  // All other categories represent the notification EVENT itself
  const conf = getNotificationIconConfig(category, metadata);
  const { Icon, color, bg, label } = conf;

  return (
    <div
      className={`${containerClassName} flex items-center justify-center flex-shrink-0 mt-0.5 ${bg} ${color}`}
      title={label || category}
      data-testid={`category-icon-${category}`}
    >
      <Icon className={className} />
    </div>
  );
}

export { CATEGORY_MAP, resolveTop10CommodityKey };
