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
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
function suggestHarvestDate(plantingDate, duration) {
  if (!plantingDate || !duration) return null;
  const minDate = addDays(plantingDate, duration.min);
  const maxDate = duration.min !== duration.max ? addDays(plantingDate, duration.max) : null;
  return { minDate, maxDate };
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
  3: "Cost and selling price",
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
  DEFAULT_ASSESSMENT,
  STEP_LABELS,
  TOTAL_STEPS,
  formatDurationLabel,
  formatPeso,
  getHarvestHorizon,
  getTotalCost,
  makeDefaultExpenses,
  suggestHarvestDate
};
