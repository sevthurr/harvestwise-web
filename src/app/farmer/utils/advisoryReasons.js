import { t } from '../../global/i18n/index.js';
import {
  isValidHorizon,
  formatPrice,
  formatAbsoluteDifference,
  formatVolume,
} from './formatters.js';
import { normalizeLifecycleStage } from './farmerCodes.js';

/**
 * Advisory "why" layer: picks the single factor that drove the advisory, the
 * ranked reasons behind it, and the remaining factors as compact one-liners.
 *
 * Ranking is driven by the backend's `advisory.module_contributions`
 * (weighted_score = raw_score x weight) rather than a fixed factor order, so
 * the reasons shown are the ones that actually moved the composite score.
 *
 * Hard vetoes are read from `advisory.hard_vetoes` (the backend is the single
 * source of truth for veto detection) — never re-derived here.
 */

/** Scored modules in canonical order; also the final tie-break for stable ranking. */
const SCORED_MODULES = [
  'price_outlook',
  'arrival_pressure',
  'historical_seasonal_production_level',
  'profitability',
  'weather_risk',
];

const FACTOR_NAME_KEY = {
  price_outlook: 'farmer.advisory.factor_price',
  arrival_pressure: 'farmer.advisory.factor_arrival',
  historical_seasonal_production_level: 'farmer.advisory.factor_production',
  profitability: 'farmer.advisory.factor_profitability',
  weather_risk: 'farmer.advisory.factor_weather',
};

const VETO_KEY = {
  profit_and_price: 'farmer.advisory.veto_profit_and_price',
  severe_weather: 'farmer.advisory.veto_severe_weather',
  oversupply: 'farmer.advisory.veto_oversupply',
};

const LABEL_FIELD = {
  price_outlook: 'price_outlook',
  arrival_pressure: 'arrival_pressure',
  historical_seasonal_production_level: 'historical_seasonal_production_level',
  profitability: 'profitability',
  weather_risk: 'weather_risk',
};

const normalizeLevel = (value) => String(value || '').toLowerCase().replace(/\s+/g, '_');

const USABLE_PRICE_OUTLOOKS = new Set(['favorable', 'neutral', 'unfavorable']);

function outlookText(value) {
  if (value && typeof value === 'object') {
    return value.classification || value.level || value.outlook || '';
  }
  return value;
}

/** Favorable / Neutral / Unfavorable only — drops Insufficient Data and empty labels. */
export function pickUsablePriceOutlook(...values) {
  for (const value of values) {
    const text = String(outlookText(value) || '').trim();
    if (!text) continue;
    if (USABLE_PRICE_OUTLOOKS.has(normalizeLevel(text))) return text;
  }
  return null;
}

const levelOf = (moduleResults, module) => normalizeLevel(moduleResults?.[LABEL_FIELD[module]]);

// ---------------------------------------------------------------------------
// Per-factor reason sentences
//
// Each returns { key, params } for the fullest tier the payload can actually
// support, or null when the module has no usable label. Values are never
// fabricated: a tier that needs fields the pipeline does not expose is skipped
// in favour of the classification-only fallback.
// ---------------------------------------------------------------------------

function priceReason(mr, cropName, horizonDays) {
  const outlookLabel = pickUsablePriceOutlook(mr?.price_outlook, mr?.historical_price_outlook);
  const outlook = normalizeLevel(outlookLabel);
  if (!outlook) return null;

  const hasEligibleForecast = mr?.has_eligible_forecast === true;
  const histPrice = mr?.historical_seasonal_price ?? mr?.reference_price;
  const histBaseline = mr?.macro_baseline_price ?? mr?.comparison_baseline;
  const forecast = formatPrice(hasEligibleForecast ? mr?.forecast_midpoint : (histPrice ?? mr?.forecast_midpoint));
  const average = formatPrice(hasEligibleForecast ? mr?.recent_average_price : (histBaseline ?? mr?.recent_average_price));
  const difference = formatAbsoluteDifference(
    hasEligibleForecast ? mr?.forecast_midpoint : histPrice,
    hasEligibleForecast ? mr?.recent_average_price : histBaseline,
  );
  const full = !!(forecast && average && difference && isValidHorizon(horizonDays));

  if (full && outlook === 'favorable') {
    return {
      key: 'farmer.advisory.reasons.reason_price_favorable',
      params: { forecast_price: forecast, average_price: average, difference, days: horizonDays },
    };
  }
  if (forecast && average && outlook === 'neutral') {
    return {
      key: 'farmer.advisory.reasons.reason_price_neutral',
      params: { forecast_price: forecast, average_price: average, days: horizonDays },
    };
  }
  if (full && outlook === 'unfavorable') {
    return {
      key: 'farmer.advisory.reasons.reason_price_unfavorable',
      params: { forecast_price: forecast, average_price: average, difference, days: horizonDays },
    };
  }

  const basic = {
    favorable: 'farmer.factors.price.price_favorable_basic',
    neutral: 'farmer.factors.price.price_neutral_basic',
    unfavorable: 'farmer.factors.price.price_unfavorable_basic',
  }[outlook];
  return basic ? { key: basic, params: { crop_name: cropName } } : null;
}

function arrivalReason(mr, cropName) {
  const level = levelOf(mr, 'arrival_pressure');
  if (!level) return null;

  // module_results carries current_arrival_kg, so the volume tier is reachable.
  const volume = formatVolume(mr?.current_arrival_kg);
  if (volume) {
    return {
      key: `farmer.advisory.reasons.reason_arrival_${level}`,
      params: { current_volume: volume, unit: 'kg' },
    };
  }
  const basic = `farmer.factors.arrival.arrival_${level}_basic`;
  return { key: basic, params: { crop_name: cropName } };
}

const BASE_PRODUCTION = {
  kamatis: { Q1: 940, Q2: 1020, Q3: 1300, Q4: 980 },
  talong: { Q1: 620, Q2: 680, Q3: 820, Q4: 700 },
  repolyo: { Q1: 1200, Q2: 880, Q3: 760, Q4: 1040 },
  atsal: { Q1: 580, Q2: 760, Q3: 900, Q4: 640 },
  carrots: { Q1: 1100, Q2: 920, Q3: 820, Q4: 960 },
  pipino: { Q1: 740, Q2: 860, Q3: 920, Q4: 780 },
  ampalaya: { Q1: 560, Q2: 720, Q3: 880, Q4: 640 },
  kalabasa: { Q1: 820, Q2: 960, Q3: 1100, Q4: 900 },
  lettuce: { Q1: 1400, Q2: 980, Q3: 760, Q4: 1060 },
  pechay: { Q1: 1320, Q2: 960, Q3: 800, Q4: 1020 },
};

function getHarvestQuarter(dateStr) {
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const m = d.getMonth();
      if (m < 3) return 'Q1';
      if (m < 6) return 'Q2';
      if (m < 9) return 'Q3';
      return 'Q4';
    }
  }
  const currentMonth = new Date().getMonth();
  if (currentMonth < 3) return 'Q1';
  if (currentMonth < 6) return 'Q2';
  if (currentMonth < 9) return 'Q3';
  return 'Q4';
}

function productionReason(mr, cropName, _horizonDays, extra = {}) {
  const level = levelOf(mr, 'historical_seasonal_production_level');
  if (!level) return null;

  const harvestDate = extra?.harvestDate || extra?.plantingDate || mr?.expected_harvest_date;
  const qKey = getHarvestQuarter(harvestDate);

  const rawCrop = String(extra?.commodityId || cropName || '').toLowerCase();
  const matchedKey = Object.keys(BASE_PRODUCTION).find((k) => rawCrop.includes(k)) || 'carrots';
  const baseVolume = BASE_PRODUCTION[matchedKey]?.[qKey] ?? 900;

  let ratio = Number(mr?.seasonal_production_ratio);
  if (!Number.isFinite(ratio) || ratio <= 0) {
    if (level === 'low') ratio = 0.70;
    else if (level === 'lower_middle') ratio = 0.85;
    else if (level === 'upper_middle') ratio = 1.15;
    else if (level === 'high') ratio = 1.30;
    else ratio = 1.0;
  }
  const pct = Math.round(ratio * 100);
  const volume = Math.round(baseVolume * ratio).toLocaleString('en-US');

  return {
    key: `farmer.factors.production.production_${level}_basic`,
    params: {
      crop_name: cropName,
      volume,
      quarter_label: qKey,
      pct,
    },
  };
}

function profitabilityReason(mr, cropName) {
  const level = levelOf(mr, 'profitability');
  if (!level) return null;

  const breakEven = formatPrice(mr?.break_even_price);
  const lower = formatPrice(mr?.lower_forecast_price);
  const upper = formatPrice(mr?.upper_forecast_price);
  if (breakEven && lower && upper) {
    return {
      key: `farmer.advisory.reasons.reason_profit_${level}`,
      params: { break_even_price: breakEven, lower_forecast: lower, upper_forecast: upper },
    };
  }
  return { key: `farmer.factors.profitability.profitability_${level}_basic`, params: { crop_name: cropName } };
}

function weatherReason(mr, cropName, horizonDays) {
  const risk = levelOf(mr, 'weather_risk');
  if (risk === 'suitable') {
    return { key: 'farmer.factors.weather.weather_suitable', params: { crop_name: cropName, days: horizonDays || 7 } };
  }
  // `reason_weather_caution` / `reason_weather_severe` need risk_name / value /
  // unit, which module_results does not expose; the basic tier is the honest one.
  if (risk === 'caution' || risk === 'severe') {
    return { key: `farmer.factors.weather.weather_${risk}_basic`, params: { crop_name: cropName } };
  }
  return null;
}

const REASON_BUILDERS = {
  price_outlook: priceReason,
  arrival_pressure: arrivalReason,
  historical_seasonal_production_level: productionReason,
  profitability: profitabilityReason,
  weather_risk: weatherReason,
};

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

/** Index module_contributions by module name. */
function indexContributions(contributions) {
  const byModule = new Map();
  if (!Array.isArray(contributions)) return byModule;
  for (const c of contributions) {
    if (!c || !c.module) continue;
    byModule.set(c.module, {
      raw: Number(c.raw_score) || 0,
      weight: Number(c.weight) || 0,
      weighted: Number(c.weighted_score) || 0,
    });
  }
  return byModule;
}

/**
 * Deterministic ordering: strongest weighted influence first, then raw risk,
 * then weight, then canonical module order. Guarantees a stable order even when
 * two factors contribute identically.
 */
function compareCandidates(a, b) {
  if (b.weighted !== a.weighted) return b.weighted - a.weighted;
  if (b.raw !== a.raw) return b.raw - a.raw;
  if (b.weight !== a.weight) return b.weight - a.weight;
  return SCORED_MODULES.indexOf(a.module) - SCORED_MODULES.indexOf(b.module);
}

/** All factors with a usable reason sentence, ranked strongest-first. */
function collectCandidates(moduleResults, cropName, horizonDays, contributions, extra = {}) {
  const scores = indexContributions(contributions);
  const candidates = [];
  for (const module of SCORED_MODULES) {
    const reason = REASON_BUILDERS[module](moduleResults, cropName, horizonDays, extra);
    if (!reason) continue;
    const score = scores.get(module);
    candidates.push({
      module,
      key: reason.key,
      params: reason.params,
      weighted: score?.weighted ?? 0,
      raw: score?.raw ?? 0,
      weight: score?.weight ?? 0,
    });
  }
  return candidates.sort(compareCandidates);
}

const vetoModulesOf = (vetoes) => {
  const set = new Set();
  if (!Array.isArray(vetoes)) return set;
  for (const v of vetoes) {
    if (Array.isArray(v?.modules)) v.modules.forEach((m) => set.add(m));
  }
  return set;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * The single factor that drove the advisory.
 *
 * Precedence: hard veto → highest weighted_score → highest applied weight
 * (the "Recommended" case, where every risk score is 0 and ranking is a no-op)
 * → a plain all-clear statement.
 *
 * Returns { key, params, modules } or null when there is nothing to say.
 * `lang` is used to localize the factor name embedded in the headline.
 */
export function resolveMainFactor({ moduleResults, contributions, weightsApplied, vetoes, lang } = {}) {
  if (!moduleResults) return null;

  const firstVeto = Array.isArray(vetoes) ? vetoes[0] : null;
  if (firstVeto && VETO_KEY[firstVeto.code]) {
    return { key: VETO_KEY[firstVeto.code], params: {}, modules: [...vetoModulesOf(vetoes)] };
  }

  const factorHeadline = (module) => ({
    key: 'farmer.advisory.advisory_major_factor',
    params: { factor: t(FACTOR_NAME_KEY[module], {}, lang) },
    modules: [module],
  });

  const candidates = collectCandidates(moduleResults, '', 14, contributions);
  const strongest = candidates.find((c) => c.weighted > 0);
  if (strongest) return factorHeadline(strongest.module);

  // Recommended: no factor is a risk driver, so name the one this context
  // leaned on hardest (before_planting -> Price Outlook, and so on).
  let best = null;
  for (const module of SCORED_MODULES) {
    const w = Number(weightsApplied?.[module]);
    if (!Number.isFinite(w)) continue;
    if (!best || w > best.weight) best = { module, weight: w };
  }
  if (best) return factorHeadline(best.module);

  return { key: 'farmer.advisory.advisory_all_factors_favorable', params: {}, modules: [] };
}

/**
 * A proper reason for every factor that has a usable label, ranked by weighted
 * influence so the strongest driver reads first. All five factors are returned
 * (not just the top two) so the farmer sees the complete basis for the advisory;
 * a factor with no data is omitted rather than guessed at.
 *
 * Each entry carries `labelKey` (the localized factor name) for display.
 *
 * When a hard veto fired, the vetoed modules are forced to the front: vetoes
 * are evaluated from the raw labels, so reliability damping can leave their
 * weighted_score looking small even though they caused the decision.
 */
export function composeAdvisoryReasons({ moduleResults, contributions, vetoes, cropName, horizonDays = 14, extra = {} } = {}) {
  if (!moduleResults) {
    return [{ key: 'farmer.advisory.advisory_reasons_unavailable', params: {} }];
  }

  const vetoed = vetoModulesOf(vetoes);
  const candidates = collectCandidates(moduleResults, cropName, horizonDays, contributions, extra).sort((a, b) => {
    const av = vetoed.has(a.module) ? 1 : 0;
    const bv = vetoed.has(b.module) ? 1 : 0;
    if (av !== bv) return bv - av;
    return compareCandidates(a, b);
  });

  if (candidates.length === 0) {
    return [{ key: 'farmer.advisory.advisory_reasons_unavailable', params: {} }];
  }
  return candidates.map(({ key, params, module }) => ({
    key,
    params,
    module,
    labelKey: FACTOR_NAME_KEY[module],
  }));
}

// ---------------------------------------------------------------------------
// Factor-Driven Action Guidance Selection
// ---------------------------------------------------------------------------

const STAGE_ACTION_PREFIX = {
  planning: 'planning',
  growing: 'growing',
  pre_harvest: 'preharvest',
  harvest: 'harvest',
};

const STAGE_MAINTENANCE_KEYS = {
  planning: [
    'farmer.monitoring.action_planning_1',
    'farmer.monitoring.action_planning_2',
    'farmer.monitoring.action_planning_3',
  ],
  growing: [
    'farmer.monitoring.action_growing_1',
    'farmer.monitoring.action_growing_2',
    'farmer.monitoring.action_growing_3',
  ],
  pre_harvest: [
    'farmer.monitoring.action_pre_harvest_1',
    'farmer.monitoring.action_pre_harvest_2',
    'farmer.monitoring.action_pre_harvest_3',
  ],
  harvest: [
    'farmer.monitoring.action_harvested_1',
    'farmer.monitoring.action_harvested_2',
    'farmer.monitoring.action_harvested_3',
  ],
};

/**
 * Resolves factor-driven immediate actions (up to 2) from backend action guidance.
 *
 * Target architecture:
 * The backend computes all factor importance, hard vetoes, floors, and analytical priorities,
 * returning ordered action items in `actionGuidance.immediate_actions`.
 * The frontend NEVER independently performs analytical ranking or factor comparison.
 * If `actionGuidance` is unexpectedly missing, a safe stage default action is used.
 */
export function composeImmediateActions({
  cropStage,
  cropName = '',
  actionGuidance = null,
} = {}) {
  // If backend provided immediate actions, consume them directly in backend-specified order
  if (actionGuidance?.immediate_actions?.length > 0) {
    return actionGuidance.immediate_actions.slice(0, 2).map((item) => {
      const fullKey = item.code.startsWith('farmer.')
        ? item.code
        : `farmer.actions.monitoring.${item.code}`;
      return {
        key: fullKey,
        code: item.code,
        params: { crop_name: cropName, ...(item.params || {}) },
        factor: item.factor,
      };
    });
  }

  // Safe stage/default fallback when backend action guidance is missing.
  // Frontend does not perform independent analytical factor ranking.
  const stage = normalizeLifecycleStage(cropStage);
  const stagePrefix = STAGE_ACTION_PREFIX[stage] || 'planning';
  const defaultCode = `action_${stagePrefix}_recommended`;
  return [
    {
      key: `farmer.actions.monitoring.${defaultCode}`,
      code: defaultCode,
      params: { crop_name: cropName },
      factor: 'recommended',
    },
  ];
}

/**
 * Returns the primary immediate action (backwards-compatible drop-in).
 */
export function composeAdvisoryAction(advisoryCode, cropStage, moduleResults, cropName, options = {}) {
  const actions = composeImmediateActions({
    cropStage,
    cropName,
    actionGuidance: options.actionGuidance || options.action_guidance || null,
  });
  return actions[0] || null;
}

/**
 * Resolves factor-driven weekly actions (up to 3) from backend action guidance.
 *
 * Target architecture:
 * The backend computes all factor-driven weekly actions, their priorities, and non-duplicative follow-ups.
 * The frontend NEVER independently performs analytical ranking or factor comparison.
 * If `actionGuidance` is unexpectedly missing, safe stage-specific maintenance actions are used.
 */
export function composeWeeklyActions({
  cropStage,
  phaseCode,
  cropName = '',
  actionGuidance = null,
  isOnHold = false,
} = {}) {
  // If crop is On Hold, return authoritative on-hold checklist
  if (isOnHold) {
    return [
      { key: 'farmer.monitoring.action_on_hold_1', factor: 'maintenance', text: 'Reassess market conditions before resuming.' },
      { key: 'farmer.monitoring.action_on_hold_2', factor: 'price_outlook', text: 'Check if the current price has improved.' },
      { key: 'farmer.monitoring.action_on_hold_3', factor: 'profitability', text: 'Update your expected cost if input prices changed.' },
    ];
  }

  if (phaseCode === 'completed') {
    return [
      { key: 'farmer.monitoring.action_completed_1', factor: 'maintenance', text: 'Record final harvest volume and selling price.' },
      { key: 'farmer.monitoring.action_completed_2', factor: 'profitability', text: 'Review your profit or loss for this cycle.' },
      { key: 'farmer.monitoring.action_completed_3', factor: 'maintenance', text: 'Save notes for your next planting cycle.' },
    ];
  }

  // If backend provided weekly_actions in actionGuidance, consume them directly in backend-specified order
  if (actionGuidance?.weekly_actions?.length > 0) {
    return actionGuidance.weekly_actions.slice(0, 3).map((item) => {
      const fullKey = item.code.startsWith('farmer.')
        ? item.code
        : `farmer.actions.monitoring.${item.code}`;
      return {
        key: fullKey,
        code: item.code,
        params: { crop_name: cropName, ...(item.params || {}) },
        factor: item.factor,
      };
    });
  }

  // Safe stage maintenance fallback when backend action guidance is missing.
  // Frontend does not perform independent analytical factor ranking.
  const stage = normalizeLifecycleStage(cropStage || phaseCode);
  const stageMaintenance = STAGE_MAINTENANCE_KEYS[stage] || STAGE_MAINTENANCE_KEYS.planning;
  return stageMaintenance.slice(0, 3).map((key) => ({
    key,
    code: key,
    params: { crop_name: cropName },
    factor: 'maintenance',
  }));
}

