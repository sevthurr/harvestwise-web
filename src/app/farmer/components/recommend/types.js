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
  kamatis: { daysMin: 90, daysMax: 90, label: "3 months" },
  talong: { daysMin: 120, daysMax: 120, label: "4 months" },
  repolyo: { daysMin: 90, daysMax: 120, label: "3\u20134 months" },
  atsal: { daysMin: 120, daysMax: 120, label: "4 months" },
  carrots: { daysMin: 105, daysMax: 120, label: "3.5\u20134 months" },
  pipino: { daysMin: 45, daysMax: 45, label: "45 days" },
  ampalaya: { daysMin: 90, daysMax: 90, label: "3 months" },
  kalabasa: { daysMin: 105, daysMax: 120, label: "3.5\u20134 months" },
  lettuce: { daysMin: 45, daysMax: 45, label: "45 days" },
  pechay: { daysMin: 60, daysMax: 90, label: "2\u20133 months" }
};
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
function suggestHarvestDate(plantingDate, commodityId) {
  if (!plantingDate || !commodityId) return null;
  const dur = CROP_DURATIONS[commodityId];
  if (!dur) return null;
  const minDate = addDays(plantingDate, dur.daysMin);
  const maxDate = dur.daysMin !== dur.daysMax ? addDays(plantingDate, dur.daysMax) : null;
  return { minDate, maxDate };
}
function getHarvestHorizon(harvestDate) {
  if (!harvestDate) return null;
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const harvest = new Date(harvestDate);
  const daysUntil = Math.ceil((harvest.getTime() - today.getTime()) / 864e5);
  return { daysUntil, isWithin28d: daysUntil <= 28 };
}
const DEFAULT_EXPENSE_NAMES = [
  "Seeds or planting materials",
  "Fertilizer",
  "Crop protection",
  "Labor",
  "Irrigation",
  "Transportation",
  "Other expenses"
];
const makeDefaultExpenses = () => DEFAULT_EXPENSE_NAMES.map((name, i) => ({
  id: String(i + 1),
  name,
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
  CROP_DURATIONS,
  DEFAULT_ASSESSMENT,
  STEP_LABELS,
  TOTAL_STEPS,
  formatPeso,
  getHarvestHorizon,
  getTotalCost,
  makeDefaultExpenses,
  suggestHarvestDate
};
