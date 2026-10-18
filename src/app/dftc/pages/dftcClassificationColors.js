// Classification color scale and helpers for DFTC Trends & Seasonal Production.
// User Specification:
// - High is RED (#dc2626 / text-rose-600)
// - Upper Middle is ORANGE (#ea580c / text-orange-500)
// - Lower Middle is YELLOW (#eab308 / text-yellow-600)
// - Low is GREEN (#16a34a / text-emerald-600)

export const CLASSIFICATION_HEX = {
  High: "#dc2626",
  "Upper Middle": "#ea580c",
  "Lower Middle": "#eab308",
  Low: "#16a34a"
};

export const CLASSIFICATION_TEXT_CLASS = {
  High: "text-rose-600",
  "Upper Middle": "text-orange-500",
  "Lower Middle": "text-yellow-600",
  Low: "text-emerald-600"
};

export function getClassificationColor(classification) {
  const norm = String(classification || "").trim().toLowerCase();
  if (norm.includes("high")) return CLASSIFICATION_HEX.High;
  if (norm.includes("upper")) return CLASSIFICATION_HEX["Upper Middle"];
  if (norm.includes("lower")) return CLASSIFICATION_HEX["Lower Middle"];
  if (norm.includes("low")) return CLASSIFICATION_HEX.Low;
  return CLASSIFICATION_HEX.Low;
}

export function getClassificationTextColor(classification) {
  const norm = String(classification || "").trim().toLowerCase();
  if (norm.includes("high")) return CLASSIFICATION_TEXT_CLASS.High;
  if (norm.includes("upper")) return CLASSIFICATION_TEXT_CLASS["Upper Middle"];
  if (norm.includes("lower")) return CLASSIFICATION_TEXT_CLASS["Lower Middle"];
  if (norm.includes("low")) return CLASSIFICATION_TEXT_CLASS.Low;
  return "text-[var(--hw-neutral-800)]";
}

export function getArrivalClassification(val, thresholds, allValues) {
  if (val == null || isNaN(val)) return "Low";
  const numVal = Number(val);
  let q1, q2, q3;
  if (thresholds?.q1 != null && thresholds?.q2 != null && thresholds?.q3 != null) {
    q1 = Number(thresholds.q1);
    q2 = Number(thresholds.q2);
    q3 = Number(thresholds.q3);
  } else if (allValues && allValues.length >= 4) {
    const sorted = [...allValues].map(Number).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b);
    if (sorted.length >= 4) {
      q1 = sorted[Math.floor(sorted.length * 0.25)];
      q2 = sorted[Math.floor(sorted.length * 0.50)];
      q3 = sorted[Math.floor(sorted.length * 0.75)];
    }
  }

  if (q1 != null && q2 != null && q3 != null) {
    if (numVal >= q3) return "High";
    if (numVal >= q2) return "Upper Middle";
    if (numVal >= q1) return "Lower Middle";
    return "Low";
  }
  return "Low";
}
