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

const RESULTS = [];

const FINAL_ADVISORY_CUTOFFS = [
  { advisory: "Recommended", range: "0.00–0.99", description: "Most factors support planting. Proceed with planning.", color: "text-emerald-700" },
  { advisory: "Proceed with Caution", range: "1.00–1.99", description: "Some factors add caution. Plant with reduced area or added monitoring.", color: "text-amber-700" },
  { advisory: "Avoid for Now", range: "2.00–3.00", description: "Multiple unfavorable factors. Consider delaying planting.", color: "text-red-700" }
];

export {
  CLASSIFICATIONS,
  CLASSIFICATION_COLORS,
  FINAL_ADVISORY_CUTOFFS,
  MODULES,
  RESULTS
};