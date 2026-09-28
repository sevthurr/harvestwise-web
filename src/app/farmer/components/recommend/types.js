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

function suggestHarvestDate(plantingDate, commodityId, variant = null) {
  if (!plantingDate || !commodityId) return null;
  const dur = getCropDuration(commodityId, variant);
  if (!dur) return null;
  const minDate = addDays(plantingDate, dur.daysMin);
  const maxDate = dur.daysMin !== dur.daysMax ? addDays(plantingDate, dur.daysMax) : null;
  return { minDate, maxDate, duration: dur };
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
  formatPeso,
  getCropDuration,
  getHarvestHorizon,
  getTotalCost,
  makeDefaultExpenses,
  suggestHarvestDate
};
