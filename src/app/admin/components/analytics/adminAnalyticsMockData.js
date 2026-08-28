const STATUS_CFG = {
  Completed: { dot: "bg-emerald-500", text: "text-emerald-700" },
  Failed: { dot: "bg-red-500", text: "text-red-700" }
};

const CLASSIFICATION_COLORS = {
  // Price Outlook
  Favorable: "text-emerald-700",
  Neutral: "text-[var(--hw-neutral-600)]",
  Unfavorable: "text-red-600",
  // Arrival Pressure & Historical Seasonal Production Level
  Low: "text-emerald-700",
  "Lower Middle": "text-blue-600",
  "Upper Middle": "text-amber-700",
  High: "text-red-600",
  // Weather Risk
  Suitable: "text-emerald-700",
  Caution: "text-amber-700",
  Severe: "text-red-700",
  // Fallback
  "—": "text-[var(--hw-neutral-400)]",
  "Not processed": "text-[var(--hw-neutral-400)]",
  "Not available": "text-[var(--hw-neutral-400)]"
};

const COMMODITIES = [
  "All",
  "Kamatis",
  "Talong",
  "Repolyo",
  "Atsal",
  "Carrots",
  "Pipino",
  "Ampalaya",
  "Kalabasa",
  "Lettuce",
  "Chinese Pechay"
];

const MODULES = [
  "All",
  "Price Outlook",
  "Arrival Pressure",
  "Historical Seasonal Production Level",
  "Weather Risk"
];

const CLASSIFICATIONS = [
  "All",
  "Favorable",
  "Neutral",
  "Unfavorable",
  "Low",
  "Lower Middle",
  "Upper Middle",
  "High",
  "Suitable",
  "Caution",
  "Severe"
];

const STATUSES = ["All", "Completed", "Failed"];

const MODULE_SUMMARY_CARDS = [
  { module: "Price Outlook", outputId: "-", classification: "Not processed", source: "-", basisId: "" },
  { module: "Arrival Pressure", outputId: "-", classification: "Not processed", source: "-", basisId: "" },
  { module: "Historical Seasonal Production Level", outputId: "-", classification: "Not processed", source: "-", basisId: "" },
  { module: "Weather Risk", outputId: "-", classification: "Not processed", source: "-", basisId: "" }
];

const RESULTS = [];

const MODULE_RULES = [
  {
    module: "Price Outlook",
    ruleId: "RULE-PO-001",
    rules: [
      { classification: "Favorable", rule: "Forecast price change > +5%", color: "text-emerald-700" },
      { classification: "Neutral", rule: "Forecast price change between −5% and +5%", color: "text-[var(--hw-neutral-600)]" },
      { classification: "Unfavorable", rule: "Forecast price change < −5%", color: "text-red-600" }
    ],
    source: "Bangkerohan Retail Prices (Forecasting)",
    lastUpdated: "Jun 1, 2026"
  },
  {
    module: "Arrival Pressure",
    ruleId: "RULE-AP-001",
    rules: [
      { classification: "Low", rule: "Arrival volume ≤ Q1 threshold", color: "text-emerald-700" },
      { classification: "Lower Middle", rule: "Arrival volume > Q1 and ≤ Q2 threshold", color: "text-blue-600" },
      { classification: "Upper Middle", rule: "Arrival volume > Q2 and ≤ Q3 threshold", color: "text-amber-700" },
      { classification: "High", rule: "Arrival volume > Q3 threshold", color: "text-red-600" }
    ],
    source: "DFTC Arrival Volume records",
    lastUpdated: "Jun 1, 2026"
  },
  {
    module: "Historical Seasonal Production Level",
    ruleId: "RULE-HP-001",
    rules: [
      { classification: "Low", rule: "PSA production ratio < 0.75", color: "text-emerald-700" },
      { classification: "Lower Middle", rule: "PSA production ratio 0.75–1.00", color: "text-blue-600" },
      { classification: "Upper Middle", rule: "PSA production ratio 1.00–1.25", color: "text-amber-700" },
      { classification: "High", rule: "PSA production ratio ≥ 1.25", color: "text-red-600" }
    ],
    source: "PSA OpenStat Production Volume API",
    lastUpdated: "Jun 1, 2026"
  },
  {
    module: "Weather Risk",
    ruleId: "RULE-WR-001",
    rules: [
      { classification: "Suitable", rule: "Rainfall < 15 mm/day; temp 20–30°C", color: "text-emerald-700" },
      { classification: "Caution", rule: "Rainfall 15–30 mm/day; temp 30–35°C", color: "text-amber-700" },
      { classification: "Severe", rule: "Rainfall > 30 mm/day; temp > 35°C", color: "text-red-700" }
    ],
    source: "Open-Meteo Weather Forecast API",
    lastUpdated: "Jun 1, 2026"
  },
  {
    module: "Profitability",
    ruleId: "RULE-PROF-001",
    rules: [
      { classification: "Favorable", rule: "Lower Forecast ≥ 110% of Break-even Price", color: "text-emerald-700" },
      { classification: "Marginal", rule: "Forecast Range overlaps Break-even Price", color: "text-amber-700" },
      { classification: "Unfavorable", rule: "Upper Forecast < Break-even Price", color: "text-red-600" }
    ],
    source: "Farmer assessment inputs",
    lastUpdated: "Jun 1, 2026"
  }
];

const FINAL_ADVISORY_CUTOFFS = [
  { advisory: "Recommended", range: "0.00–0.99", description: "Most factors support planting. Proceed with planning.", color: "text-emerald-700" },
  { advisory: "Proceed with Caution", range: "1.00–1.99", description: "Some factors add caution. Plant with reduced area or added monitoring.", color: "text-amber-700" },
  { advisory: "Avoid for Now", range: "2.00–3.00", description: "Multiple unfavorable factors. Consider delaying planting.", color: "text-red-700" }
];

const ADVISORY_CFG = {
  "Recommended": { color: "text-emerald-700" },
  "Proceed with Caution": { color: "text-amber-700" },
  "Plant Conservatively": { color: "text-amber-700" },
  "Avoid for Now": { color: "text-red-700" }
};

const SCORE_COLOR = (score) => score === 0 ? "text-emerald-700" : score === 1 ? "text-blue-600" : score === 2 ? "text-amber-700" : "text-red-700";

export {
  ADVISORY_CFG,
  CLASSIFICATIONS,
  CLASSIFICATION_COLORS,
  COMMODITIES,
  FINAL_ADVISORY_CUTOFFS,
  MODULES,
  MODULE_RULES,
  MODULE_SUMMARY_CARDS,
  RESULTS,
  SCORE_COLOR,
  STATUSES,
  STATUS_CFG
};
