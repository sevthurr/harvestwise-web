import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CloudSun,
  CloudRain,
  CloudLightning,
} from "lucide-react";
import { CommodityIllustration, getCommodityIconKey, COMMODITY_REGISTRY } from "./CommodityIllustrations";
import {
  NOTIFICATION_CATEGORIES,
  getCategoryConfig,
} from "../../utils/notificationCategories";

// Re-exported under the original name: the category→glyph table now lives in
// notificationCategories.js so a new category is declared in exactly one place.
const CATEGORY_MAP = NOTIFICATION_CATEGORIES;

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

  // 2. Price volatility: TrendingUp or TrendingDown based on direction / change_pct, fallback to TrendingUpDown
  if (category === "price_volatility") {
    let changePct = null;
    if (metadata.change_pct != null) changePct = Number(metadata.change_pct);
    else if (metadata.changePct != null) changePct = Number(metadata.changePct);

    if (changePct !== null && !isNaN(changePct)) {
      if (changePct > 0) return { Icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", label: "Price volatility increase" };
      if (changePct < 0) return { Icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-50", label: "Price volatility decrease" };
    }
    const direction = (metadata.direction || "").toLowerCase();
    if (direction === "rose" || direction === "up" || direction === "increased") {
      return { Icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", label: "Price volatility increase" };
    }
    if (direction === "dropped" || direction === "down" || direction === "decreased") {
      return { Icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-50", label: "Price volatility decrease" };
    }
    return getCategoryConfig(category);
  }

  // 3. Weather alert: severity-based icon (severe -> CloudLightning, caution -> CloudRain, general -> CloudSun)
  if (category === "weather_alert") {
    const risk = (metadata.risk || metadata.severity || metadata.level || metadata.verdict || "").toLowerCase();
    if (risk.includes("severe") || risk.includes("danger") || risk.includes("high")) {
      return { Icon: CloudLightning, color: "text-red-600", bg: "bg-red-50", label: "Severe weather" };
    }
    if (risk.includes("caution") || risk.includes("warning") || risk.includes("moderate")) {
      return { Icon: CloudRain, color: "text-amber-600", bg: "bg-amber-50", label: "Weather caution" };
    }
    return { Icon: CloudSun, color: "text-sky-600", bg: "bg-sky-50", label: "Weather alert" };
  }

  // 4. Fallback to category map
  return getCategoryConfig(category);
}

export function NotificationIcon({
  category,
  metadata = {},
  fallbackTitle = "",
  className = "w-4 h-4",
  containerClassName = "w-9 h-9 rounded-xl",
}) {
  try {
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
  } catch {
    return (
      <div
        className={`${containerClassName} flex items-center justify-center flex-shrink-0 mt-0.5 bg-blue-50 text-blue-600`}
        data-testid={`category-icon-${category}`}
      >
        <TrendingUp className={className} />
      </div>
    );
  }
}

export { CATEGORY_MAP, resolveTop10CommodityKey };
