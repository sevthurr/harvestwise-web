export const ADVISORY_CODES = {
  RECOMMENDED: "recommended",
  PROCEED_WITH_CAUTION: "proceed_with_caution",
  AVOID_FOR_NOW: "avoid_for_now",
};

export const PHASE_CODES = {
  PLANNING: "phase_planning",
  GROWING: "phase_growing",
  PRE_HARVEST: "phase_pre_harvest",
  HARVESTED: "phase_harvested",
  ON_HOLD: "phase_on_hold",
  COMPLETED: "phase_completed",
};

export const WEATHER_SUITABILITY_CODES = {
  SUITABLE: "suitable",
  CAUTION: "caution",
  SEVERE: "severe",
};

export const LEVEL_CODES = {
  HIGH: "level_high",
  MODERATE: "level_moderate",
  LOW: "level_low",
  NORMAL: "level_normal",
};

export const MARKET_STATUS_CODES = {
  FAVORABLE: "status_favorable",
  BALANCED: "status_balanced",
  MONITOR: "status_monitor",
  HIGH_RISK: "status_high_risk",
};

export const PRICE_TREND_CODES = {
  RISING: "trend_rising",
  STABLE: "trend_stable",
  FALLING: "trend_falling",
};

export function normalizeAdvisoryCode(value) {
  const normalized = String(value || "").trim().toLowerCase();

  const map = {
    "recommended": ADVISORY_CODES.RECOMMENDED,
    "plant conservatively": ADVISORY_CODES.PROCEED_WITH_CAUTION,
    "proceed with caution": ADVISORY_CODES.PROCEED_WITH_CAUTION,
    "proceed_with_caution": ADVISORY_CODES.PROCEED_WITH_CAUTION,
    "conservative": ADVISORY_CODES.PROCEED_WITH_CAUTION,
    "avoid for now": ADVISORY_CODES.AVOID_FOR_NOW,
    "avoid_for_now": ADVISORY_CODES.AVOID_FOR_NOW,
    "avoid": ADVISORY_CODES.AVOID_FOR_NOW,
  };

  return map[normalized] || null;
}

export function normalizePhaseCode(value) {
  const normalized = String(value || "").trim().toLowerCase();

  const map = {
    "planning": PHASE_CODES.PLANNING,
    "draft": PHASE_CODES.PLANNING,
    "phase_planning": PHASE_CODES.PLANNING,
    "planted": PHASE_CODES.GROWING,
    "growing": PHASE_CODES.GROWING,
    "phase_growing": PHASE_CODES.GROWING,
    "pre-harvest": PHASE_CODES.PRE_HARVEST,
    "pre_harvest": PHASE_CODES.PRE_HARVEST,
    "preharvest": PHASE_CODES.PRE_HARVEST,
    "phase_pre_harvest": PHASE_CODES.PRE_HARVEST,
    "harvested": PHASE_CODES.HARVESTED,
    "harvesting": PHASE_CODES.HARVESTED,
    "phase_harvested": PHASE_CODES.HARVESTED,
    "on-hold": PHASE_CODES.ON_HOLD,
    "on hold": PHASE_CODES.ON_HOLD,
    "on_hold": PHASE_CODES.ON_HOLD,
    "phase_on_hold": PHASE_CODES.ON_HOLD,
    "completed": PHASE_CODES.COMPLETED,
    "cancelled": PHASE_CODES.COMPLETED,
    "phase_completed": PHASE_CODES.COMPLETED,
  };

  return map[normalized] || null;
}

export function normalizeWeatherSuitability(value) {
  const normalized = String(value || "").trim().toLowerCase();

  const map = {
    "suitable": WEATHER_SUITABILITY_CODES.SUITABLE,
    "low": WEATHER_SUITABILITY_CODES.SUITABLE,
    "favorable": WEATHER_SUITABILITY_CODES.SUITABLE,
    "caution": WEATHER_SUITABILITY_CODES.CAUTION,
    "moderate": WEATHER_SUITABILITY_CODES.CAUTION,
    "medium": WEATHER_SUITABILITY_CODES.CAUTION,
    "severe": WEATHER_SUITABILITY_CODES.SEVERE,
    "high": WEATHER_SUITABILITY_CODES.SEVERE,
    "high risk": WEATHER_SUITABILITY_CODES.SEVERE,
    "high_risk": WEATHER_SUITABILITY_CODES.SEVERE,
  };

  return map[normalized] || null;
}

export function normalizeLevelCode(value) {
  const normalized = String(value || "").trim().toLowerCase();

  const map = {
    "high": LEVEL_CODES.HIGH,
    "level_high": LEVEL_CODES.HIGH,
    "moderate": LEVEL_CODES.MODERATE,
    "medium": LEVEL_CODES.MODERATE,
    "level_moderate": LEVEL_CODES.MODERATE,
    "low": LEVEL_CODES.LOW,
    "level_low": LEVEL_CODES.LOW,
    "normal": LEVEL_CODES.NORMAL,
    "average": LEVEL_CODES.NORMAL,
    "level_normal": LEVEL_CODES.NORMAL,
  };

  return map[normalized] || null;
}

export function normalizeMarketStatusCode(value) {
  const normalized = String(value || "").trim().toLowerCase();

  const map = {
    "favorable": MARKET_STATUS_CODES.FAVORABLE,
    "status_favorable": MARKET_STATUS_CODES.FAVORABLE,
    "balanced": MARKET_STATUS_CODES.BALANCED,
    "status_balanced": MARKET_STATUS_CODES.BALANCED,
    "monitor": MARKET_STATUS_CODES.MONITOR,
    "watch closely": MARKET_STATUS_CODES.MONITOR,
    "status_monitor": MARKET_STATUS_CODES.MONITOR,
    "high risk": MARKET_STATUS_CODES.HIGH_RISK,
    "high_risk": MARKET_STATUS_CODES.HIGH_RISK,
    "cautious": MARKET_STATUS_CODES.HIGH_RISK,
    "status_high_risk": MARKET_STATUS_CODES.HIGH_RISK,
  };

  return map[normalized] || null;
}

export function normalizePriceTrendCode(value) {
  const normalized = String(value || "").trim().toLowerCase();

  const map = {
    "rising": PRICE_TREND_CODES.RISING,
    "up": PRICE_TREND_CODES.RISING,
    "trend_rising": PRICE_TREND_CODES.RISING,
    "stable": PRICE_TREND_CODES.STABLE,
    "flat": PRICE_TREND_CODES.STABLE,
    "trend_stable": PRICE_TREND_CODES.STABLE,
    "falling": PRICE_TREND_CODES.FALLING,
    "down": PRICE_TREND_CODES.FALLING,
    "trend_falling": PRICE_TREND_CODES.FALLING,
  };

  return map[normalized] || null;
}
