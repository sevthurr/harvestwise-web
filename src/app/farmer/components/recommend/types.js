const COMMODITY_OPTIONS = [
  { id: "kamatis", name: "Kamatis" },
  { id: "talong", name: "Talong" },
  { id: "repolyo", name: "Repolyo" },
  { id: "atsal", name: "Atsal" },
  { id: "carrots", name: "Carrots" },
  { id: "pipino", name: "Pipino" },
  { id: "ampalaya", name: "Ampalaya" },
  { id: "kalabasa", name: "Kalabasa" },
  { id: "lettuce", name: "Lettuce" },
  { id: "pechay", name: "Chinese Pechay" }
];
const DAYS_PER_MONTH = 30;
// A range is quoted in months only when both ends land on a half-month step,
// otherwise the day count is the honest unit (e.g. 48–52 days, not "1.6–1.7 mo").
const MONTH_STEP_DAYS = 15;
// Fallback durations used when the API catalog has no row for the crop
// (offline bundle, or a crop missing from GET /prices). The API duration
// always wins when it exists — see `durationForOption` in useCommodityCatalog.
const CROP_DURATIONS = {
  ampalaya: {
    daysMin: 45,
    daysMax: 75,
    label: "45–75 days",
    varieties: {
      galaxy: { daysMin: 48, daysMax: 52, label: "48–52 days" },
    },
  },
  kalabasa: {
    daysMin: 85,
    daysMax: 100,
    label: "85–100 days",
    varieties: {
      suprema: { daysMin: 85, daysMax: 85, label: "85 days" },
    },
  },
  kamatis: {
    daysMin: 55,
    daysMax: 65,
    label: "55–65 days",
    varieties: {
      "diamante big": { daysMin: 55, daysMax: 65, label: "55–65 days" },
    },
  },
  pipino: {
    daysMin: 38,
    daysMax: 45,
    label: "38–45 days",
    varieties: {
      "mega c": { daysMin: 38, daysMax: 45, label: "38–45 days" },
    },
  },
  talong: {
    daysMin: 46,
    daysMax: 50,
    label: "46–50 days",
    varieties: {
      "banate king": { daysMin: 46, daysMax: 50, label: "46–50 days" },
    },
  },
  carrots: {
    daysMin: 90,
    daysMax: 120,
    label: "90–120 days",
    varieties: {
      big: { daysMin: 90, daysMax: 120, label: "90–120 days" },
      medium: { daysMin: 90, daysMax: 120, label: "90–120 days" },
      small: { daysMin: 90, daysMax: 120, label: "90–120 days" },
    },
  },
  pechay: {
    daysMin: 50,
    daysMax: 65,
    label: "50–65 days",
    varieties: {},
  },
  lettuce: {
    daysMin: 45,
    daysMax: 60,
    label: "45–60 days",
    varieties: {
      ball: { daysMin: 45, daysMax: 60, label: "45–60 days" },
    },
  },
  repolyo: {
    daysMin: 55,
    daysMax: 60,
    label: "55–60 days",
    varieties: {
      wakamini: { daysMin: 55, daysMax: 60, label: "55–60 days" },
    },
  },
  atsal: {
    daysMin: 80,
    daysMax: 100,
    label: "80–100 days",
    varieties: {
      "smooth cayene": { daysMin: 90, daysMax: 95, label: "90–95 days" },
      sultan: { daysMin: 55, daysMax: 60, label: "55–60 days" },
    },
  },
};

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
/**
 * Localized label for a `{min, max}` day range. Returns null when the database
 * has no duration, so the caller renders a placeholder rather than inventing
 * a number.
 */
function formatDurationLabel(duration, t) {
  if (!duration) return null;
  const isRange = duration.min !== duration.max;
  const useMonths = duration.min % MONTH_STEP_DAYS === 0 && duration.max % MONTH_STEP_DAYS === 0;
  const unit = useMonths ? "months" : "days";
  const lo = useMonths ? duration.min / DAYS_PER_MONTH : duration.min;
  const hi = useMonths ? duration.max / DAYS_PER_MONTH : duration.max;
  const key = `farmer.assess.duration_${unit}_${isRange ? "range" : "single"}`;
  const fallback = isRange ? `${lo}\u2013${hi} ${unit}` : `${lo} ${unit}`;
  return t ? t(key, { min: lo, max: hi, value: lo }, fallback) : fallback;
}

function getCropDuration(commodityId, variant = null) {
  if (!commodityId) return null;
  const key = String(commodityId).toLowerCase().replace(/[^a-z]/g, "");
  let baseConfig = CROP_DURATIONS[commodityId] || CROP_DURATIONS[key];
  if (!baseConfig) {
    for (const [k, v] of Object.entries(CROP_DURATIONS)) {
      if (key.includes(k) || k.includes(key)) {
        baseConfig = v;
        break;
      }
    }
  }
  if (!baseConfig) return null;

  if (variant && baseConfig.varieties) {
    const varKey = String(variant).toLowerCase().trim();
    if (baseConfig.varieties[varKey]) {
      return baseConfig.varieties[varKey];
    }
    for (const [vk, vv] of Object.entries(baseConfig.varieties)) {
      if (varKey.includes(vk) || vk.includes(varKey)) {
        return vv;
      }
    }
  }
  return baseConfig;
}

/**
 * Harvest window from a planting date.
 *
 * Accepts either the API duration shape (`{min, max}` from the commodity
 * catalog — preferred, since it reflects the database) or a commodity id plus
 * an optional variety, in which case the `CROP_DURATIONS` fallback table is
 * consulted. Returns `null` when there is nothing to base the window on.
 */
function suggestHarvestDate(plantingDate, durationOrCommodity, variant = null) {
  if (!plantingDate || !durationOrCommodity) return null;
  const isApiDuration =
    typeof durationOrCommodity === "object" &&
    typeof durationOrCommodity.min === "number" &&
    typeof durationOrCommodity.max === "number";
  const dur = isApiDuration
    ? durationOrCommodity
    : getCropDuration(durationOrCommodity, variant);
  if (!dur) return null;
  const min = isApiDuration ? dur.min : dur.daysMin;
  const max = isApiDuration ? dur.max : dur.daysMax;
  const minDate = addDays(plantingDate, min);
  const maxDate = min !== max ? addDays(plantingDate, max) : null;
  return { minDate, maxDate, duration: isApiDuration ? undefined : dur };
}

function getHarvestHorizon(harvestDate) {
  if (!harvestDate) return null;
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const harvest = new Date(harvestDate);
  const daysUntil = Math.ceil((harvest.getTime() - today.getTime()) / 864e5);
  return { daysUntil, isWithin28d: daysUntil <= 28 };
}
const DEFAULT_EXPENSES_DEF = [
  { key: "expense_seeds", name: "Seeds or planting materials" },
  { key: "expense_fertilizer", name: "Fertilizer" },
  { key: "expense_protection", name: "Crop protection" },
  { key: "expense_labor", name: "Labor" },
  { key: "expense_irrigation", name: "Irrigation" },
  { key: "expense_transport", name: "Transportation" }
];
const DEFAULT_EXPENSE_NAMES = DEFAULT_EXPENSES_DEF.map((e) => e.name);
const makeDefaultExpenses = () => DEFAULT_EXPENSES_DEF.map((exp, i) => ({
  id: String(i + 1),
  key: exp.key,
  name: exp.name,
  amount: "",
  isCustom: false
}));
const DEFAULT_ASSESSMENT = {
  commodity: "",
  variant: "",
  plantingDate: "",
  harvestDate: "",
  farmArea: "",
  farmAreaUnit: "sqm",
  harvestQuantity: "",
  costMethod: "simple",
  simpleCost: "",
  expenses: makeDefaultExpenses(),
  sellingPrice: "",
  useFarmgate: true,
  farmgatePrice: ""
};
const STEP_LABELS = {
  1: "Choose crop",
  2: "Planting details",
  3: "Production costs",
  4: "Review Breakeven"
};
const TOTAL_STEPS = 4;
function getTotalCost(data) {
  if (data.costMethod === "simple") {
    return typeof data.simpleCost === "number" ? data.simpleCost : 0;
  }
  return data.expenses.reduce(
    (sum, e) => sum + (typeof e.amount === "number" ? e.amount : 0),
    0
  );
}
function formatPeso(amount) {
  return `\u20B1${amount.toLocaleString("en-PH")}`;
}
export {
  COMMODITY_OPTIONS,
  CROP_DURATIONS,
  DEFAULT_ASSESSMENT,
  STEP_LABELS,
  TOTAL_STEPS,
  formatDurationLabel,
  formatPeso,
  getCropDuration,
  getHarvestHorizon,
  getTotalCost,
  makeDefaultExpenses,
  suggestHarvestDate
};
