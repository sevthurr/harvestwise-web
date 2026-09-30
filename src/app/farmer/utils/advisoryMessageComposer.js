import { t } from '../../global/i18n/index.js';
import {
  isValidHorizon,
  formatPrice,
  formatAbsoluteDifference,
  formatVolume,
  formatPercent,
} from './formatters.js';
import { validateTemplateParams } from './templateValidator.js';
import { normalizeLifecycleStage } from './farmerCodes.js';

// Reason ranking and the stage action selector live in ./advisoryReasons.js.
// Re-exported so existing import sites keep resolving from this module.
export { composeAdvisoryReasons, composeAdvisoryAction } from './advisoryReasons.js';
export { normalizeLifecycleStage };


/**
 * Safely renders a composed message object { key, params } using i18n t().
 * If key is missing or template interpolation is invalid, falls back safely.
 */
export function renderComposedMessage(composed, lang = 'ceb', fallbackText = '') {
  if (!composed || !composed.key) return fallbackText;
  const params = { ...(composed.params || {}) };
  if (composed.levelKey) {
    params.arrival_level = t(composed.levelKey, {}, lang);
  }
  const rawText = t(composed.key, params, lang);
  if (validateTemplateParams(rawText, params)) {
    return rawText;
  }
  return fallbackText;
}

// ==========================================
// 1. PRICE OUTLOOK COMPOSER
// ==========================================
export function composePriceOutlook(moduleResults, cropName, horizonDays) {
  if (!moduleResults) {
    return cropName
      ? { key: 'farmer.factors.price.price_unavailable_crop', params: { crop_name: cropName } }
      : { key: 'farmer.factors.price.price_unavailable_generic', params: {} };
  }

  const outlook = moduleResults.price_outlook;
  const forecast = moduleResults.forecast_midpoint;
  const avg = moduleResults.recent_average_price;
  const validHorizon = isValidHorizon(horizonDays);
  const formattedForecast = formatPrice(forecast);
  const formattedAvg = formatPrice(avg);

  // Tier 1 — Full value-filled
  if (cropName && validHorizon && formattedForecast && formattedAvg && outlook) {
    const diff = formatAbsoluteDifference(forecast, avg);
    const diffNum = Math.abs(Number(forecast) - Number(avg));
    const isSame = Math.round(diffNum) === 0;

    const outlookLower = String(outlook).toLowerCase();
    if (outlookLower === 'favorable') {
      return {
        key: 'farmer.factors.price.price_favorable',
        params: {
          crop_name: cropName,
          days: horizonDays,
          forecast_price: formattedForecast,
          average_price: formattedAvg,
          difference: diff || '0',
        },
      };
    } else if (outlookLower === 'neutral') {
      if (isSame) {
        return {
          key: 'farmer.factors.price.price_neutral_same',
          params: {
            crop_name: cropName,
            days: horizonDays,
            forecast_price: formattedForecast,
            average_price: formattedAvg,
          },
        };
      } else if (Number(forecast) > Number(avg)) {
        return {
          key: 'farmer.factors.price.price_neutral_higher',
          params: {
            crop_name: cropName,
            days: horizonDays,
            forecast_price: formattedForecast,
            average_price: formattedAvg,
            difference: diff || '0',
          },
        };
      } else {
        return {
          key: 'farmer.factors.price.price_neutral_lower',
          params: {
            crop_name: cropName,
            days: horizonDays,
            forecast_price: formattedForecast,
            average_price: formattedAvg,
            difference: diff || '0',
          },
        };
      }
    } else if (outlookLower === 'unfavorable') {
      return {
        key: 'farmer.factors.price.price_unfavorable',
        params: {
          crop_name: cropName,
          days: horizonDays,
          forecast_price: formattedForecast,
          average_price: formattedAvg,
          difference: diff || '0',
        },
      };
    }
  }

  // Tier 2 — Forecast only
  if (cropName && validHorizon && formattedForecast) {
    return {
      key: 'farmer.factors.price.price_forecast_only',
      params: {
        crop_name: cropName,
        days: horizonDays,
        forecast_price: formattedForecast,
      },
    };
  }

  // Tier 3 — Classification only
  if (outlook && cropName) {
    const outlookLower = String(outlook).toLowerCase();
    if (outlookLower === 'favorable') {
      return { key: 'farmer.factors.price.price_favorable_basic', params: { crop_name: cropName } };
    } else if (outlookLower === 'neutral') {
      return { key: 'farmer.factors.price.price_neutral_basic', params: { crop_name: cropName } };
    } else if (outlookLower === 'unfavorable') {
      return { key: 'farmer.factors.price.price_unfavorable_basic', params: { crop_name: cropName } };
    }
  }

  // Tier 4 — Unavailable
  return cropName
    ? { key: 'farmer.factors.price.price_unavailable_crop', params: { crop_name: cropName } }
    : { key: 'farmer.factors.price.price_unavailable_generic', params: {} };
}

export function composePriceRange(moduleResults) {
  if (!moduleResults) return null;
  const lo = formatPrice(moduleResults.lower_forecast_price);
  const hi = formatPrice(moduleResults.upper_forecast_price);
  if (lo && hi) {
    return {
      key: 'farmer.factors.price.price_forecast_range',
      params: { forecast_lo: lo, forecast_hi: hi },
    };
  }
  return null;
}

export function composePriceNotice(horizonDays) {
  if (isValidHorizon(horizonDays)) {
    return {
      key: 'farmer.factors.price.price_short_term_notice',
      params: { days: horizonDays },
    };
  }
  return null;
}

// ==========================================
// 2. ARRIVAL PRESSURE COMPOSER
// ==========================================
export function composeArrivalPressure(moduleResults, cropName) {
  if (!moduleResults) {
    return cropName
      ? { key: 'farmer.factors.arrival.arrival_unavailable_crop', params: { crop_name: cropName } }
      : { key: 'farmer.factors.arrival.arrival_unavailable_generic', params: {} };
  }

  const arrivalPressure = moduleResults.arrival_pressure;
  const currentArrival = moduleResults.current_arrival_kg;
  const formattedVolume = formatVolume(currentArrival);

  // Normalization of arrival level label
  const arrivalLevelCode = String(arrivalPressure || '').toLowerCase().replace(/\s+/g, '_');
  const levelKey = `farmer.factors.arrival.level_${arrivalLevelCode}`;

  // If we had historical average, percentage, and months, we would use Tier 1.
  // In the current backend contract, these are deferred.
  // Fall back safely to Tier 3 (Current volume only) if volume is available:
  if (cropName && formattedVolume && arrivalPressure) {
    return {
      key: 'farmer.factors.arrival.arrival_volume_only',
      params: {
        crop_name: cropName,
        current_volume: formattedVolume,
        unit: 'kg',
        arrival_level: t(levelKey, {}, 'en'),
      },
      levelKey,
    };
  }

  // Tier 5 — Classification only
  if (cropName && arrivalPressure) {
    if (arrivalLevelCode === 'low') {
      return { key: 'farmer.factors.arrival.arrival_low_basic', params: { crop_name: cropName } };
    } else if (arrivalLevelCode === 'lower_middle') {
      return { key: 'farmer.factors.arrival.arrival_lower_middle_basic', params: { crop_name: cropName } };
    } else if (arrivalLevelCode === 'upper_middle') {
      return { key: 'farmer.factors.arrival.arrival_upper_middle_basic', params: { crop_name: cropName } };
    } else if (arrivalLevelCode === 'high') {
      return { key: 'farmer.factors.arrival.arrival_high_basic', params: { crop_name: cropName } };
    }
  }

  // Tier 6 — Unavailable
  return cropName
    ? { key: 'farmer.factors.arrival.arrival_unavailable_crop', params: { crop_name: cropName } }
    : { key: 'farmer.factors.arrival.arrival_unavailable_generic', params: {} };
}

export function composeArrivalMeaning(moduleResults, cropName) {
  if (!moduleResults || !moduleResults.arrival_pressure || !cropName) return null;
  const code = String(moduleResults.arrival_pressure).toLowerCase().replace(/\s+/g, '_');
  if (code === 'low') return { key: 'farmer.factors.arrival.arrival_low_meaning', params: { crop_name: cropName } };
  if (code === 'lower_middle') return { key: 'farmer.factors.arrival.arrival_lower_middle_meaning', params: { crop_name: cropName } };
  if (code === 'upper_middle') return { key: 'farmer.factors.arrival.arrival_upper_middle_meaning', params: { crop_name: cropName } };
  if (code === 'high') return { key: 'farmer.factors.arrival.arrival_high_meaning', params: { crop_name: cropName } };
  return null;
}

// ==========================================
// 3. HISTORICAL PRODUCTION COMPOSER
// ==========================================
export function composeHistoricalProduction(moduleResults, cropName) {
  if (!moduleResults) {
    return cropName
      ? { key: 'farmer.factors.production.production_unavailable_crop', params: { crop_name: cropName } }
      : { key: 'farmer.factors.production.production_unavailable_generic', params: {} };
  }

  const prodLevel = moduleResults.historical_seasonal_production_level;
  const levelCode = String(prodLevel || '').toLowerCase().replace(/\s+/g, '_');

  // Since backend does not expose quarter label/range, volume, or average yet:
  // Fall back safely to frozen Tier 3 Classification only!
  if (cropName && prodLevel) {
    if (levelCode === 'low') {
      return { key: 'farmer.factors.production.production_low_basic', params: { crop_name: cropName } };
    } else if (levelCode === 'lower_middle') {
      return { key: 'farmer.factors.production.production_lower_middle_basic', params: { crop_name: cropName } };
    } else if (levelCode === 'upper_middle') {
      return { key: 'farmer.factors.production.production_upper_middle_basic', params: { crop_name: cropName } };
    } else if (levelCode === 'high') {
      return { key: 'farmer.factors.production.production_high_basic', params: { crop_name: cropName } };
    }
  }

  // Tier 4 — Unavailable
  return cropName
    ? { key: 'farmer.factors.production.production_unavailable_crop', params: { crop_name: cropName } }
    : { key: 'farmer.factors.production.production_unavailable_generic', params: {} };
}

export function composeProductionMeaning(moduleResults, cropName) {
  if (!moduleResults || !moduleResults.historical_seasonal_production_level || !cropName) return null;
  const code = String(moduleResults.historical_seasonal_production_level).toLowerCase().replace(/\s+/g, '_');
  if (code === 'low') return { key: 'farmer.factors.production.production_low_meaning', params: { crop_name: cropName } };
  if (code === 'lower_middle') return { key: 'farmer.factors.production.production_lower_middle_meaning', params: { crop_name: cropName } };
  if (code === 'upper_middle') return { key: 'farmer.factors.production.production_upper_middle_meaning', params: { crop_name: cropName } };
  if (code === 'high') return { key: 'farmer.factors.production.production_high_meaning', params: { crop_name: cropName } };
  return null;
}

// ==========================================
// 4. PROFITABILITY COMPOSER
// ==========================================
export function composeProfitability(moduleResults, cropName) {
  if (!moduleResults) {
    return cropName
      ? { key: 'farmer.factors.profitability.profitability_unavailable_crop', params: { crop_name: cropName } }
      : { key: 'farmer.factors.profitability.profitability_unavailable_generic', params: {} };
  }

  const prof = moduleResults.profitability;
  const bePrice = moduleResults.break_even_price;
  const loForecast = moduleResults.lower_forecast_price;
  const hiForecast = moduleResults.upper_forecast_price;

  const formattedBe = formatPrice(bePrice);
  const formattedLo = formatPrice(loForecast);
  const formattedHi = formatPrice(hiForecast);

  // Tier 1 — Value-filled
  if (cropName && formattedBe && formattedLo && formattedHi && prof) {
    const profLower = String(prof).toLowerCase();
    if (profLower === 'favorable') {
      // display-only calculation of favorable price: break_even * 1.10
      const favPrice = formatPrice(Number(bePrice) * 1.10);
      return {
        key: 'farmer.factors.profitability.profitability_favorable',
        params: {
          crop_name: cropName,
          break_even_price: formattedBe,
          favorable_price: favPrice || formattedBe,
          lower_forecast: formattedLo,
          upper_forecast: formattedHi,
        },
      };
    } else if (profLower === 'marginal') {
      return {
        key: 'farmer.factors.profitability.profitability_marginal',
        params: {
          crop_name: cropName,
          break_even_price: formattedBe,
          lower_forecast: formattedLo,
          upper_forecast: formattedHi,
        },
      };
    } else if (profLower === 'unfavorable') {
      return {
        key: 'farmer.factors.profitability.profitability_unfavorable',
        params: {
          crop_name: cropName,
          break_even_price: formattedBe,
          lower_forecast: formattedLo,
          upper_forecast: formattedHi,
        },
      };
    }
  }

  // Tier 3 — Classification only fallback
  if (cropName && prof) {
    const profLower = String(prof).toLowerCase();
    if (profLower === 'favorable') return { key: 'farmer.factors.profitability.profitability_favorable_basic', params: { crop_name: cropName } };
    if (profLower === 'marginal') return { key: 'farmer.factors.profitability.profitability_marginal_basic', params: { crop_name: cropName } };
    if (profLower === 'unfavorable') return { key: 'farmer.factors.profitability.profitability_unfavorable_basic', params: { crop_name: cropName } };
  }

  // Tier 4 — Unavailable
  return cropName
    ? { key: 'farmer.factors.profitability.profitability_unavailable_crop', params: { crop_name: cropName } }
    : { key: 'farmer.factors.profitability.profitability_unavailable_generic', params: {} };
}

export function composeBreakEvenPrice(breakEvenPrice) {
  const formatted = formatPrice(breakEvenPrice);
  if (formatted) {
    return {
      key: 'farmer.factors.profitability.profitability_break_even',
      params: { break_even_price: formatted },
    };
  }
  return null;
}

// ==========================================
// 5. WEATHER COMPOSER
// ==========================================
export function composeWeather(moduleResults, cropName, horizonDays = 7) {
  if (!moduleResults) {
    return cropName
      ? { key: 'farmer.factors.weather.weather_unavailable_crop', params: { crop_name: cropName } }
      : { key: 'farmer.factors.weather.weather_unavailable_generic', params: {} };
  }

  const risk = moduleResults.weather_risk;
  const riskLower = String(risk || '').toLowerCase();

  // If Suitable and valid horizon
  if (riskLower === 'suitable' && cropName) {
    return {
      key: 'farmer.factors.weather.weather_suitable',
      params: { crop_name: cropName, days: horizonDays || 7 },
    };
  }

  // Since granular trigger serialization is missing from API payload:
  // use the frozen basic/overall fallbacks without fabricating fake triggers!
  if (cropName && riskLower === 'caution') {
    return {
      key: 'farmer.factors.weather.weather_caution_basic',
      params: { crop_name: cropName },
    };
  }
  if (cropName && riskLower === 'severe') {
    return {
      key: 'farmer.factors.weather.weather_severe_basic',
      params: { crop_name: cropName },
    };
  }

  // Tier 4 — Unavailable
  return cropName
    ? { key: 'farmer.factors.weather.weather_unavailable_crop', params: { crop_name: cropName } }
    : { key: 'farmer.factors.weather.weather_unavailable_generic', params: {} };
}

// ==========================================
// 6. FINAL ADVISORY COMPOSER
// ==========================================
export function composeAdvisorySummary(advisoryCode, cropStage, cropName) {
  const stage = normalizeLifecycleStage(cropStage);
  const adv = String(advisoryCode || '').toLowerCase().trim();

  // Planning stage
  if (stage === 'planning') {
    if (adv === 'recommended') return { key: 'farmer.advisory.advisory_planning_recommended', params: { crop_name: cropName } };
    if (adv === 'proceed_with_caution' || adv === 'caution') return { key: 'farmer.advisory.advisory_planning_caution', params: { crop_name: cropName } };
    if (adv === 'avoid_for_now' || adv === 'avoid') return { key: 'farmer.advisory.advisory_planning_avoid', params: { crop_name: cropName } };
    return { key: 'farmer.advisory.advisory_planning_generic', params: {} };
  }

  // Growing stage
  if (stage === 'growing') {
    if (adv === 'recommended') return { key: 'farmer.advisory.advisory_growing_recommended', params: { crop_name: cropName } };
    if (adv === 'proceed_with_caution' || adv === 'caution') return { key: 'farmer.advisory.advisory_growing_caution', params: { crop_name: cropName } };
    if (adv === 'avoid_for_now' || adv === 'avoid' || adv === 'high_risk') return { key: 'farmer.advisory.advisory_growing_high_risk', params: { crop_name: cropName } };
    return { key: 'farmer.advisory.advisory_growing_generic', params: {} };
  }

  // Pre-Harvest stage
  if (stage === 'pre_harvest') {
    if (adv === 'recommended') return { key: 'farmer.advisory.advisory_preharvest_recommended', params: { crop_name: cropName } };
    if (adv === 'proceed_with_caution' || adv === 'caution') return { key: 'farmer.advisory.advisory_preharvest_caution', params: { crop_name: cropName } };
    if (adv === 'avoid_for_now' || adv === 'avoid' || adv === 'high_risk') return { key: 'farmer.advisory.advisory_preharvest_high_risk', params: { crop_name: cropName } };
    return { key: 'farmer.advisory.advisory_preharvest_generic', params: {} };
  }

  // Harvest stage
  if (stage === 'harvest') {
    if (adv === 'recommended') return { key: 'farmer.advisory.advisory_harvest_recommended', params: { crop_name: cropName } };
    if (adv === 'proceed_with_caution' || adv === 'caution') return { key: 'farmer.advisory.advisory_harvest_caution', params: { crop_name: cropName } };
    if (adv === 'avoid_for_now' || adv === 'avoid' || adv === 'high_risk') return { key: 'farmer.advisory.advisory_harvest_high_risk', params: { crop_name: cropName } };
    return { key: 'farmer.advisory.advisory_harvest_generic', params: {} };
  }

  return { key: 'farmer.advisory.advisory_result_unavailable', params: {} };
}

/**
 * Returns stage-appropriate advisory badge label.
 * For post-planting stages, avoid_for_now MUST map to High Risk!
 */
export function composeAdvisoryBadge(advisoryCode, cropStage) {
  const stage = normalizeLifecycleStage(cropStage);
  const adv = String(advisoryCode || '').toLowerCase().trim();

  if (stage === 'planning') {
    if (adv === 'recommended') return { key: 'farmer.advisory.labels.recommended', type: 'recommended' };
    if (adv === 'proceed_with_caution' || adv === 'caution') return { key: 'farmer.advisory.labels.proceed_with_caution', type: 'caution' };
    if (adv === 'avoid_for_now' || adv === 'avoid') return { key: 'farmer.advisory.labels.avoid_for_now', type: 'avoid' };
  } else {
    // Post-planting
    if (adv === 'recommended') return { key: 'farmer.advisory.labels.recommended', type: 'recommended' };
    if (adv === 'proceed_with_caution' || adv === 'caution') return { key: 'farmer.advisory.labels.proceed_with_caution', type: 'caution' };
    if (adv === 'avoid_for_now' || adv === 'avoid' || adv === 'high_risk') return { key: 'farmer.advisory.labels.high_risk', type: 'high_risk' };
  }

  return { key: 'farmer.advisory.labels.recommended', type: 'recommended' };
}


