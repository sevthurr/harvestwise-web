/**
 * Utilities for matching and prioritizing a farmer's preferred crops
 * across all modules (Dashboard, Today's Prices, Prices / Price Trends,
 * My Crops, Crop Calendar, Market Overview, Assessment, etc.).
 */
import { getCommodityIconKey } from "../../global/components/shared/CommodityIllustrations";
import { HW_NAME_TO_ID, HW_ID_TO_NAME } from "../../global/data/commodities";

function safeGetCommodityIconKey(id, baseName, name) {
  if (typeof getCommodityIconKey === "function") {
    try {
      return getCommodityIconKey(id, baseName, name);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Normalizes any preferred crop input into sets of IDs, names, and canonical keys.
 * Handles:
 *  - Array of profile crop preference objects [{ commodity_id, commodity_name, ... }] or camelCase
 *  - Array of string IDs or names
 *  - Object of { [cropName]: variety }
 *  - Full profile object { preferred_crops: [...] } or { preferredCrops: [...] }
 */
export function getPreferredCropMatcher(preferredCropsInput) {
  let list = [];
  if (Array.isArray(preferredCropsInput)) {
    list = preferredCropsInput;
  } else if (preferredCropsInput && typeof preferredCropsInput === "object") {
    if (Array.isArray(preferredCropsInput.preferred_crops)) {
      list = preferredCropsInput.preferred_crops;
    } else if (Array.isArray(preferredCropsInput.preferredCrops)) {
      list = preferredCropsInput.preferredCrops;
    } else {
      // name -> variety dictionary from settings
      list = Object.keys(preferredCropsInput);
    }
  }

  const rawIds = new Set();
  const names = new Set();
  const canonicalKeys = new Set();

  list.forEach((item) => {
    if (!item) return;

    if (typeof item === "string") {
      const trimmed = item.trim();
      const lower = trimmed.toLowerCase();
      rawIds.add(trimmed);
      rawIds.add(lower);
      names.add(lower);
      const iconKey = safeGetCommodityIconKey(trimmed, null, trimmed);
      if (iconKey) canonicalKeys.add(iconKey.toLowerCase());
      if (HW_NAME_TO_ID[trimmed]) {
        canonicalKeys.add(HW_NAME_TO_ID[trimmed].toLowerCase());
      }
      return;
    }

    if (typeof item === "object") {
      const id = item.commodity_id || item.commodityId || item.id || item.commodity;
      const name = item.commodity_name || item.commodityName || item.name || item.cropName || item.baseName;

      if (id) {
        const idStr = String(id).trim();
        rawIds.add(idStr);
        rawIds.add(idStr.toLowerCase());
        const iconKeyFromId = safeGetCommodityIconKey(idStr, null, name);
        if (iconKeyFromId) canonicalKeys.add(iconKeyFromId.toLowerCase());
      }

      if (name) {
        const nameStr = String(name).trim();
        const nameLower = nameStr.toLowerCase();
        names.add(nameLower);
        const iconKeyFromName = safeGetCommodityIconKey(null, null, nameStr);
        if (iconKeyFromName) canonicalKeys.add(iconKeyFromName.toLowerCase());
        if (HW_NAME_TO_ID[nameStr]) {
          canonicalKeys.add(HW_NAME_TO_ID[nameStr].toLowerCase());
        }
      }
    }
  });

  const count = Math.max(rawIds.size, names.size, canonicalKeys.size);

  function isPreferred(candidate) {
    if (!candidate || count === 0) return false;

    if (typeof candidate === "string") {
      const str = candidate.trim();
      const lower = str.toLowerCase();
      if (rawIds.has(str) || rawIds.has(lower) || names.has(lower) || canonicalKeys.has(lower)) {
        return true;
      }
      const iconKey = safeGetCommodityIconKey(str, null, str);
      if (iconKey && canonicalKeys.has(iconKey.toLowerCase())) return true;
      if (HW_NAME_TO_ID[str] && canonicalKeys.has(HW_NAME_TO_ID[str].toLowerCase())) return true;
      return false;
    }

    if (typeof candidate === "object") {
      const id = candidate.commodity_id || candidate.commodityId || candidate.id || candidate.commodity || candidate.cropId;
      const name = candidate.commodity_name || candidate.commodityName || candidate.name || candidate.cropName || candidate.baseName;
      const baseName = candidate.baseName || candidate.base_name;

      if (id) {
        const idStr = String(id).trim();
        if (rawIds.has(idStr) || rawIds.has(idStr.toLowerCase()) || canonicalKeys.has(idStr.toLowerCase())) {
          return true;
        }
      }

      if (name) {
        const nameStr = String(name).trim();
        const nameLower = nameStr.toLowerCase();
        if (names.has(nameLower) || canonicalKeys.has(nameLower)) {
          return true;
        }
        if (HW_NAME_TO_ID[nameStr] && canonicalKeys.has(HW_NAME_TO_ID[nameStr].toLowerCase())) {
          return true;
        }
      }

      if (baseName) {
        const baseStr = String(baseName).trim();
        const baseLower = baseStr.toLowerCase();
        if (names.has(baseLower) || canonicalKeys.has(baseLower)) {
          return true;
        }
      }

      const iconKey = safeGetCommodityIconKey(id, baseName, name);
      if (iconKey && canonicalKeys.has(iconKey.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  return {
    rawIds,
    names,
    canonicalKeys,
    count,
    isPreferred,
  };
}

/**
 * Checks if a candidate crop/commodity matches the farmer's preferred crops.
 */
export function isPreferredCrop(candidate, preferredCropsInput) {
  if (!candidate || !preferredCropsInput) return false;
  const matcher = preferredCropsInput.isPreferred
    ? preferredCropsInput
    : getPreferredCropMatcher(preferredCropsInput);
  return matcher.isPreferred(candidate);
}

/**
 * Returns a sorted copy of the items array with preferred crops placed FIRST.
 * Within preferred crops and non-preferred crops, secondaryCompareFn is respected.
 * If secondaryCompareFn is not provided, the relative order is preserved.
 */
export function sortWithPreferredFirst(items, preferredCropsInput, secondaryCompareFn) {
  if (!Array.isArray(items)) return [];
  if (items.length <= 1) return [...items];

  const matcher = preferredCropsInput?.isPreferred
    ? preferredCropsInput
    : getPreferredCropMatcher(preferredCropsInput);

  if (matcher.count === 0) {
    if (typeof secondaryCompareFn === "function") {
      return [...items].sort(secondaryCompareFn);
    }
    return [...items];
  }

  return [...items].sort((a, b) => {
    const aPref = matcher.isPreferred(a);
    const bPref = matcher.isPreferred(b);

    if (aPref && !bPref) return -1;
    if (!aPref && bPref) return 1;

    if (typeof secondaryCompareFn === "function") {
      return secondaryCompareFn(a, b);
    }
    return 0;
  });
}
