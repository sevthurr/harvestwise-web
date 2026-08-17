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
  "\u2014": "text-[var(--hw-neutral-400)]"
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
  { module: "Price Outlook", outputId: "PO-20260720-001", classification: "Favorable", source: "Forecasting output", basisId: "a10" },
  { module: "Arrival Pressure", outputId: "AP-20260720-001", classification: "Upper Middle", source: "DFTC Arrival Volume", basisId: "a11" },
  { module: "Historical Seasonal Production Level", outputId: "HP-20260720-001", classification: "Lower Middle", source: "PSA OpenStat API", basisId: "a9" },
  { module: "Weather Risk", outputId: "WR-20260720-001", classification: "Caution", source: "Open-Meteo Forecast API", basisId: "a12" }
];
const RESULTS = [
  // ── Jul 20 batch ──
  {
    id: "a10",
    outputId: "PO-20260720-001",
    module: "Price Outlook",
    commodity: "Kamatis",
    variant: "Diamante Big",
    inputPeriod: "Jul 14\u201320, 2026",
    classification: "Favorable",
    processedAt: "Jul 20, 2026, 7:30 AM",
    status: "Completed",
    basisSource: "Bangkerohan Retail Prices",
    basisInputs: {
      "Recent average price": "\u20B186/kg",
      "Lower forecast": "\u20B184/kg",
      "Forecast midpoint": "\u20B190.50/kg",
      "Upper forecast": "\u20B197/kg",
      "Forecast price change": "+5.23%"
    },
    ruleUsed: "Price Outlook compares the forecast midpoint with the recent average price. A change above +5% is Favorable; below \u22125% is Unfavorable; within \xB15% is Neutral.",
    thresholds: [
      { classification: "Favorable", rule: "Forecast change > +5%" },
      { classification: "Neutral", rule: "Forecast change between \u22125% and +5%" },
      { classification: "Unfavorable", rule: "Forecast change < \u22125%" }
    ],
    resultExplanation: "Forecast midpoint is above the recent average price by +5.23%, so the Price Outlook is Favorable. Prices are trending upward toward the harvest window.",
    recommendationImpact: "Supports planting \u2014 price outlook is above the recent average.",
    recommendationImpactType: "supports"
  },
  {
    id: "a11",
    outputId: "AP-20260720-001",
    module: "Arrival Pressure",
    commodity: "Kamatis",
    variant: "Diamante Big",
    inputPeriod: "Jul 14\u201320, 2026",
    classification: "Upper Middle",
    processedAt: "Jul 20, 2026, 7:30 AM",
    status: "Completed",
    basisSource: "DFTC Arrival Volume",
    basisInputs: {
      "Current DFTC arrival volume": "40.8 MT/week",
      "Q1 threshold": "32.1 MT/week",
      "Q2 threshold": "35.4 MT/week",
      "Q3 threshold": "41.2 MT/week"
    },
    ruleUsed: "Arrival Pressure classifies current DFTC arrivals against historical Q1/Q2/Q3 thresholds. Above Q3 is High; Q2\u2013Q3 is Upper Middle; Q1\u2013Q2 is Lower Middle; below Q1 is Low.",
    thresholds: [
      { classification: "Low", rule: "Current arrival volume \u2264 Q1" },
      { classification: "Lower Middle", rule: "Current arrival volume > Q1 and \u2264 Q2" },
      { classification: "Upper Middle", rule: "Current arrival volume > Q2 and \u2264 Q3" },
      { classification: "High", rule: "Current arrival volume > Q3" }
    ],
    resultExplanation: "DFTC arrivals are above the middle historical range at 40.8 MT/week, between Q2 (35.4) and Q3 (41.2). Arrival pressure is Upper Middle.",
    recommendationImpact: "Adds caution \u2014 DFTC arrivals are above the middle historical range.",
    recommendationImpactType: "caution"
  },
  {
    id: "a12",
    outputId: "WR-20260720-001",
    module: "Weather Risk",
    commodity: "Kamatis",
    variant: "Diamante Big",
    inputPeriod: "Jul 20\u201326, 2026",
    classification: "Caution",
    processedAt: "Jul 20, 2026, 7:30 AM",
    status: "Completed",
    basisSource: "Open-Meteo Weather Forecast API",
    basisInputs: {
      "Location": "Davao City",
      "Forecast period": "Jul 20\u201326, 2026",
      "Rainfall (avg/day)": "18 mm",
      "Rain probability": "72%",
      "Temperature range": "26\u201329\xB0C",
      "Humidity": "78\u201384%",
      "Crop threshold": "> 15 mm/day = Caution; > 30 mm/day = Severe"
    },
    ruleUsed: "Weather Risk compares forecast rainfall and temperature with crop-specific thresholds. Rainfall above the caution minimum triggers Caution; above the severe minimum triggers Severe.",
    thresholds: [
      { classification: "Suitable", rule: "Rainfall < 15 mm/day; temperature 20\u201330\xB0C" },
      { classification: "Caution", rule: "Rainfall 15\u201330 mm/day; or temperature 30\u201335\xB0C" },
      { classification: "Severe", rule: "Rainfall > 30 mm/day; or temperature > 35\xB0C" }
    ],
    resultExplanation: "Forecast rainfall reaches the crop caution range at 18 mm/day, exceeding the 15 mm/day threshold for Kamatis. Rain probability is 72% for the forecast period.",
    recommendationImpact: "Adds caution \u2014 forecasted rainfall exceeds the Kamatis caution threshold.",
    recommendationImpactType: "caution"
  },
  // ── Jun 24 batch ──
  {
    id: "a1",
    outputId: "PO-20260624-001",
    module: "Price Outlook",
    commodity: "Kamatis",
    variant: "Diamante Big",
    inputPeriod: "Jun 17\u201323, 2026",
    classification: "Favorable",
    processedAt: "Jun 24, 2026, 6:05 AM",
    status: "Completed",
    basisSource: "Bangkerohan Retail Prices",
    basisInputs: {
      "Recent average price": "\u20B182/kg",
      "Lower forecast": "\u20B184/kg",
      "Forecast midpoint": "\u20B188/kg",
      "Upper forecast": "\u20B195/kg",
      "Forecast price change": "+7.3%"
    },
    ruleUsed: "Price Outlook compares the forecast midpoint with the recent average price. A change above +5% is Favorable; below \u22125% is Unfavorable; within \xB15% is Neutral.",
    thresholds: [
      { classification: "Favorable", rule: "Forecast change > +5%" },
      { classification: "Neutral", rule: "Forecast change between \u22125% and +5%" },
      { classification: "Unfavorable", rule: "Forecast change < \u22125%" }
    ],
    resultExplanation: "Forecast midpoint is above the recent average price by +7.3%. Prices are trending upward heading into the harvest window.",
    recommendationImpact: "Supports planting \u2014 price outlook is above the recent average.",
    recommendationImpactType: "supports"
  },
  {
    id: "a5",
    outputId: "PO-20260624-002",
    module: "Price Outlook",
    commodity: "Repolyo",
    variant: "Wakamini",
    inputPeriod: "Jun 17\u201323, 2026",
    classification: "Unfavorable",
    processedAt: "Jun 24, 2026, 6:05 AM",
    status: "Completed",
    basisSource: "Bangkerohan Retail Prices",
    basisInputs: {
      "Recent average price": "\u20B145/kg",
      "Lower forecast": "\u20B136/kg",
      "Forecast midpoint": "\u20B140/kg",
      "Upper forecast": "\u20B148/kg",
      "Forecast price change": "\u221211.1%"
    },
    ruleUsed: "Price Outlook compares the forecast midpoint with the recent average price. A change above +5% is Favorable; below \u22125% is Unfavorable; within \xB15% is Neutral.",
    thresholds: [
      { classification: "Favorable", rule: "Forecast change > +5%" },
      { classification: "Neutral", rule: "Forecast change between \u22125% and +5%" },
      { classification: "Unfavorable", rule: "Forecast change < \u22125%" }
    ],
    resultExplanation: "Forecast midpoint is below the recent average price by \u221211.1%. Prices are trending downward, reducing expected revenue at harvest.",
    recommendationImpact: "Against planting \u2014 price outlook is below the recent average by more than 5%.",
    recommendationImpactType: "against"
  },
  {
    id: "a2",
    outputId: "AP-20260624-001",
    module: "Arrival Pressure",
    commodity: "Kamatis",
    variant: "Diamante Big",
    inputPeriod: "Jun 17\u201323, 2026",
    classification: "Upper Middle",
    processedAt: "Jun 24, 2026, 6:05 AM",
    status: "Completed",
    basisSource: "DFTC Arrival Volume",
    basisInputs: {
      "Current DFTC arrival volume": "44.2 MT/week",
      "Q1 threshold": "32.1 MT/week",
      "Q2 threshold": "35.4 MT/week",
      "Q3 threshold": "41.2 MT/week"
    },
    ruleUsed: "Arrival Pressure classifies current DFTC arrivals against historical Q1/Q2/Q3 thresholds.",
    thresholds: [
      { classification: "Low", rule: "Current arrival volume \u2264 Q1" },
      { classification: "Lower Middle", rule: "Current arrival volume > Q1 and \u2264 Q2" },
      { classification: "Upper Middle", rule: "Current arrival volume > Q2 and \u2264 Q3" },
      { classification: "High", rule: "Current arrival volume > Q3" }
    ],
    resultExplanation: "DFTC arrivals are above the middle historical range at 44.2 MT/week. Arrival pressure is Upper Middle, between Q2 and Q3 thresholds.",
    recommendationImpact: "Adds caution \u2014 arrival volume is above the historical middle range.",
    recommendationImpactType: "caution"
  },
  {
    id: "a7",
    outputId: "AP-20260624-002",
    module: "Arrival Pressure",
    commodity: "Lettuce",
    variant: "Curly",
    inputPeriod: "Jun 17\u201323, 2026",
    classification: "Upper Middle",
    processedAt: "Jun 24, 2026, 6:05 AM",
    status: "Failed",
    basisSource: "DFTC Arrival Volume",
    basisInputs: {
      "Current DFTC arrival volume": "28.4 MT/week (partial)",
      "Q2 threshold": "24.8 MT/week",
      "Q3 threshold": "32.1 MT/week",
      "Data completeness": "84%"
    },
    ruleUsed: "Arrival Pressure classifies current DFTC arrivals against historical Q1/Q2/Q3 thresholds.",
    thresholds: [
      { classification: "Low", rule: "Current arrival volume \u2264 Q1" },
      { classification: "Lower Middle", rule: "Current arrival volume > Q1 and \u2264 Q2" },
      { classification: "Upper Middle", rule: "Current arrival volume > Q2 and \u2264 Q3" },
      { classification: "High", rule: "Current arrival volume > Q3" }
    ],
    resultExplanation: "DFTC arrivals for Lettuce are estimated at 28.4 MT/week (Upper Middle range). Classification is based on 84% of available data; 3 daily records were unavailable.",
    recommendationImpact: "Adds caution \u2014 arrival volume is above the middle range, though based on partial data.",
    recommendationImpactType: "caution",
    basisMissing: "3 daily records unavailable (Jun 20\u201322). Classification is based on 84% of available data."
  },
  {
    id: "a3",
    outputId: "HP-20260624-001",
    module: "Historical Seasonal Production Level",
    commodity: "Repolyo",
    inputPeriod: "Q2 2026",
    classification: "High",
    processedAt: "Jun 24, 2026, 6:05 AM",
    status: "Completed",
    basisSource: "PSA OpenStat API \u2014 Historical Production",
    basisInputs: {
      "Source location": "Bukidnon, Benguet (main supply)",
      "Expected harvest quarter": "Q2 2026",
      "Average quarterly production": "1,420 MT",
      "Current quarter estimate": "1,780 MT",
      "Seasonal production ratio": "1.25",
      "Q3 threshold": "1.25"
    },
    ruleUsed: "Historical Seasonal Production Level classifies the expected harvest quarter using PSA OpenStat production ratios against Q1/Q2/Q3 quartile thresholds.",
    thresholds: [
      { classification: "Low", rule: "Representative Seasonal Production Ratio < Q1" },
      { classification: "Lower Middle", rule: "Ratio \u2265 Q1 and < Q2" },
      { classification: "Upper Middle", rule: "Ratio \u2265 Q2 and < Q3" },
      { classification: "High", rule: "Ratio \u2265 Q3" }
    ],
    resultExplanation: "Repolyo production in Q2 2026 is significantly above the historical baseline at a ratio of 1.25, which meets or exceeds the Q3 threshold. High production levels typically increase supply and compress market prices.",
    recommendationImpact: "Against planting \u2014 production is at or above the Q3 quartile, indicating elevated supply.",
    recommendationImpactType: "against"
  },
  {
    id: "a9",
    outputId: "HP-20260720-001",
    module: "Historical Seasonal Production Level",
    commodity: "Kamatis",
    inputPeriod: "Q3 2026",
    classification: "Lower Middle",
    processedAt: "Jun 24, 2026, 6:05 AM",
    status: "Completed",
    basisSource: "PSA OpenStat API \u2014 Historical Production",
    basisInputs: {
      "Source location": "Davao del Norte, Compostela Valley",
      "Expected harvest quarter": "Q3 2026",
      "Average quarterly production": "1,850 MT",
      "Current quarter estimate": "1,580 MT",
      "Seasonal production ratio": "0.85",
      "Q1 threshold": "0.75",
      "Q2 threshold": "1.00"
    },
    ruleUsed: "Historical Seasonal Production Level classifies the expected harvest quarter using PSA OpenStat production ratios against Q1/Q2/Q3 quartile thresholds.",
    thresholds: [
      { classification: "Low", rule: "Representative Seasonal Production Ratio < Q1" },
      { classification: "Lower Middle", rule: "Ratio \u2265 Q1 and < Q2" },
      { classification: "Upper Middle", rule: "Ratio \u2265 Q2 and < Q3" },
      { classification: "High", rule: "Ratio \u2265 Q3" }
    ],
    resultExplanation: "Expected harvest quarter has below-middle historical production in source areas. Kamatis production ratio in Q3 2026 is 0.85, between Q1 (0.75) and Q2 (1.00), placing it in the Lower Middle range.",
    recommendationImpact: "Neutral to slightly supportive \u2014 production is in the lower-middle historical range.",
    recommendationImpactType: "supports"
  },
  {
    id: "a4",
    outputId: "WR-20260624-001",
    module: "Weather Risk",
    commodity: "Kamatis",
    variant: "Diamante Big",
    inputPeriod: "Jun 24\u201330, 2026",
    classification: "Caution",
    processedAt: "Jun 24, 2026, 6:05 AM",
    status: "Completed",
    basisSource: "Open-Meteo Weather Forecast API",
    basisInputs: {
      "Location": "Davao City",
      "Forecast period": "Jun 24\u201330, 2026",
      "Rainfall (avg/day)": "18 mm",
      "Rain probability": "75%",
      "Temperature range": "26\u201329\xB0C",
      "Humidity": "78\u201385%",
      "Wind speed": "12\u201318 km/h",
      "Crop threshold": "> 15 mm/day = Caution; > 30 mm/day = Severe"
    },
    ruleUsed: "Weather Risk compares forecast rainfall and temperature with crop-specific thresholds.",
    thresholds: [
      { classification: "Suitable", rule: "Rainfall < 15 mm/day; temperature 20\u201330\xB0C" },
      { classification: "Caution", rule: "Rainfall 15\u201330 mm/day; or temperature 30\u201335\xB0C" },
      { classification: "Severe", rule: "Rainfall > 30 mm/day; or temperature > 35\xB0C" }
    ],
    resultExplanation: "Forecast rainfall of 18 mm/day exceeds the Caution threshold for Kamatis. Rain probability is 75% for the forecast period. Field activity and crop health may be at risk.",
    recommendationImpact: "Adds caution \u2014 forecasted rainfall exceeds the crop-specific Caution threshold.",
    recommendationImpactType: "caution"
  }
];
const MODULE_RULES = [
  {
    module: "Price Outlook",
    ruleId: "RULE-PO-001",
    rules: [
      { classification: "Favorable", rule: "Forecast Price Change greater than 5%", color: "text-emerald-700" },
      { classification: "Neutral", rule: "Forecast Price Change from \u22125% to 5%", color: "text-[var(--hw-neutral-600)]" },
      { classification: "Unfavorable", rule: "Forecast Price Change less than \u22125%", color: "text-red-600" }
    ],
    source: "Bangkerohan Retail Prices, DFTC Retail Prices, DFTC Wholesale Prices",
    lastUpdated: "Jun 1, 2026"
  },
  {
    module: "Arrival Pressure",
    ruleId: "RULE-AP-001",
    rules: [
      { classification: "Low", rule: "Current Arrival Volume \u2264 Q1", color: "text-emerald-700" },
      { classification: "Lower Middle", rule: "Current Arrival Volume > Q1 and \u2264 Q2", color: "text-blue-600" },
      { classification: "Upper Middle", rule: "Current Arrival Volume > Q2 and \u2264 Q3", color: "text-amber-700" },
      { classification: "High", rule: "Current Arrival Volume > Q3", color: "text-red-600" }
    ],
    source: "DFTC Arrival Volume",
    lastUpdated: "Jun 1, 2026"
  },
  {
    module: "Historical Seasonal Production Level",
    ruleId: "RULE-HP-001",
    rules: [
      { classification: "Low", rule: "Representative Seasonal Production Ratio < Q1", color: "text-emerald-700" },
      { classification: "Lower Middle", rule: "Representative Seasonal Production Ratio \u2265 Q1 and < Q2", color: "text-blue-600" },
      { classification: "Upper Middle", rule: "Representative Seasonal Production Ratio \u2265 Q2 and < Q3", color: "text-amber-700" },
      { classification: "High", rule: "Representative Seasonal Production Ratio \u2265 Q3", color: "text-red-600" }
    ],
    source: "PSA OpenStat API \u2014 Historical Production",
    lastUpdated: "Jun 1, 2026"
  },
  {
    module: "Weather Risk",
    ruleId: "RULE-WR-001",
    rules: [
      { classification: "Suitable", rule: "Rainfall, temperature, humidity, and wind within crop-specific suitable ranges", color: "text-emerald-700" },
      { classification: "Caution", rule: "Rainfall or temperature enters the caution range for the crop", color: "text-amber-700" },
      { classification: "Severe", rule: "Rainfall, temperature, humidity, or wind exceeds severe limits for the crop", color: "text-red-600" }
    ],
    source: "Open-Meteo Historical Weather API and Open-Meteo Weather Forecast API",
    lastUpdated: "Jun 1, 2026"
  },
  {
    module: "Profitability",
    ruleId: "RULE-PROF-001",
    rules: [
      { classification: "Favorable", rule: "Lower Forecast \u2265 110% of Break-even Price", color: "text-emerald-700" },
      { classification: "Marginal", rule: "Forecast Range overlaps Break-even Price", color: "text-amber-700" },
      { classification: "Unfavorable", rule: "Upper Forecast < Break-even Price", color: "text-red-600" }
    ],
    source: "Farmer assessment inputs",
    lastUpdated: "Jun 1, 2026"
  }
];
const FINAL_ADVISORY_CUTOFFS = [
  { advisory: "Recommended", range: "0.00\u20130.99", description: "Most factors support planting. Proceed with planning.", color: "text-emerald-700" },
  { advisory: "Plant Conservatively", range: "1.00\u20131.99", description: "Some factors add caution. Plant with reduced area or added monitoring.", color: "text-amber-700" },
  { advisory: "Avoid for Now", range: "2.00\u20133.00", description: "Multiple unfavorable factors. Consider delaying planting.", color: "text-red-700" }
];
const ADVISORY_CFG = {
  "Recommended": { color: "text-emerald-700" },
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
