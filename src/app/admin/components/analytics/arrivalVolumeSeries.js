// Shared arrival-volume series helpers for the admin Arrival Pressure views.
//
// Both the card (AdminAnalytics.jsx) and the trend chart
// (AdminAnalyticsBasis.jsx) read the same `/admin/analytics/outputs/
// arrival-pressure` records and need the same bucketing, so it lives here
// rather than being written twice and drifting.
//
// Records arrive one per DFTC submission, each carrying an `arrival_date`,
// a `volume_kg` total and the farm/other split. DFTC also files annual
// aggregates on YYYY-12-31, so a bucket can legitimately hold a single
// year-end figure rather than a true monthly reading — the views report the
// bucket count instead of implying a full series.

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Farm / Other source colors, read off the design's tooltip legend: Farm green,
// Other orange. These identify *which source* a number came from, so they are
// deliberately NOT the bar scale below — a source color must keep its meaning
// regardless of where the card's quartiles land, and reusing band values here
// is what previously made the green Farm dot collide with the green band.
// `#538D22` is the app's own `--hw-green-600`; neither value appears in
// CLASSIFICATION_BAR_COLORS, which keeps the two scales legible side by side.
const FARM_COLOR = "#538D22";
const OTHER_COLOR = "#ea580c";

// Bar scale for the trend chart: one bar per month, coloured by where that
// month's total falls against the card's own Q1/Q2/Q3, so the two views of the
// module cannot disagree. Sourced from the design, where Low and Lower Middle
// read blue and the upper two read amber/red.
const CLASSIFICATION_BAR_COLORS = {
  Low: "#2563eb",
  "Lower Middle": "#16a34a",
  "Upper Middle": "#d97706",
  High: "#dc2626"
};
const NO_QUARTILE_BAR_COLOR = "#94a3b8";

function classificationColor(classification) {
  return CLASSIFICATION_BAR_COLORS[classification] || NO_QUARTILE_BAR_COLOR;
}

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Math.round(n * 100) / 100;

// Years present in the records, newest first. Drives the year selector.
function availableArrivalYears(records) {
  const years = new Set();
  for (const row of records || []) {
    const year = parseInt(String(row?.arrival_date || "").slice(0, 4), 10);
    if (Number.isFinite(year)) years.add(year);
  }
  return [...years].sort((a, b) => b - a);
}

// Group records into a chronological series for the given granularity.
//
// `year` filters to a single calendar year; pass null to take every year.
// Buckets with no data are omitted, so the axis only shows periods that
// actually recorded arrivals.
function bucketArrivals(records, { granularity = "monthly", year = null } = {}) {
  const buckets = new Map();

  for (const row of records || []) {
    const date = String(row?.arrival_date || "");
    const parts = date.split("-");
    if (parts.length !== 3) continue;

    const rowYear = parseInt(parts[0], 10);
    if (!Number.isFinite(rowYear)) continue;
    if (year != null && rowYear !== year) continue;

    const month = parts[1];
    const key = granularity === "daily" ? date : `${rowYear}-${month}`;
    const label =
      granularity === "daily"
        ? `${MONTH_LABELS[parseInt(month, 10) - 1] || month} ${parseInt(parts[2], 10)}`
        : MONTH_LABELS[parseInt(month, 10) - 1] || month;

    const bucket = buckets.get(key) || {
      key,
      label,
      period: granularity === "daily" ? date : `${rowYear}-${month}`,
      year: rowYear,
      farm_kg: 0,
      other_kg: 0,
      total_kg: 0
    };

    bucket.farm_kg = round2(bucket.farm_kg + num(row.farm_source_volume_kg));
    bucket.other_kg = round2(bucket.other_kg + num(row.other_source_volume_kg));
    bucket.total_kg = round2(bucket.total_kg + num(row.volume_kg));
    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort((a, b) => (a.period < b.period ? -1 : 1));
}

// Totals for a series, plus how many distinct months it covers. The card shows
// these as "Annual Recorded Total" and the month count beside it.
function arrivalSeriesTotals(series) {
  const months = new Set();
  let total = 0;

  for (const bucket of series || []) {
    total += num(bucket.total_kg);
    months.add(String(bucket.period).slice(0, 7));
  }

  return { total_kg: round2(total), months: months.size };
}

// The latest bucket in a series — the card's "Current Month Volume".
function latestArrivalBucket(series) {
  if (!series || series.length === 0) return null;
  return series[series.length - 1];
}

// Classify a volume against the Q1/Q2/Q3 boundaries, using the same inclusive
// comparisons as `compute_arrival_pressure`. Returns null when the quartiles
// are unavailable rather than guessing.
function classifyArrival(volumeKg, quartiles) {
  if (!quartiles) return null;
  const v = num(volumeKg);
  const q1 = num(quartiles.q1);
  const q2 = num(quartiles.q2);
  const q3 = num(quartiles.q3);
  if (v <= q1) return "Low";
  if (v <= q2) return "Lower Middle";
  if (v <= q3) return "Upper Middle";
  return "High";
}

// The four boundary rows the card renders, with the supply-pressure reading
// each classification implies. `unit` is appended to every boundary.
function arrivalBoundaryRows(quartiles, unit = "kg/mo") {
  if (!quartiles) return [];
  const fmt = (n) =>
    `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`;

  return [
    { classification: "Low", boundary: `≤ ${fmt(quartiles.q1)}`, supply: "Deficit / High Price" },
    { classification: "Lower Middle", boundary: `${fmt(quartiles.q1)} – ${fmt(quartiles.q2)}`, supply: "Moderate Supply" },
    { classification: "Upper Middle", boundary: `${fmt(quartiles.q2)} – ${fmt(quartiles.q3)}`, supply: "Normal Supply" },
    { classification: "High", boundary: `> ${fmt(quartiles.q3)}`, supply: "Surplus / Low Price" }
  ];
}

// Twelve-month axis for the selected year, zero-filled where nothing was
// recorded. Keeps a stable Jan-Dec scale so a year with a handful of months
// still reads as a yearly trend rather than a sparse scatter.
function monthlyAxisForYear(year, series) {
  if (year == null) return series || [];

  const byPeriod = new Map((series || []).map((b) => [b.period, b]));

  return MONTH_LABELS.map((label, idx) => {
    const month = String(idx + 1).padStart(2, "0");
    const period = `${year}-${month}`;
    const found = byPeriod.get(period);

    return (
      found || {
        key: period,
        label,
        period,
        year,
        farm_kg: 0,
        other_kg: 0,
        total_kg: 0
      }
    );
  });
}

export {
  CLASSIFICATION_BAR_COLORS,
  FARM_COLOR,
  MONTH_LABELS,
  NO_QUARTILE_BAR_COLOR,
  OTHER_COLOR,
  arrivalBoundaryRows,
  arrivalSeriesTotals,
  availableArrivalYears,
  bucketArrivals,
  classifyArrival,
  classificationColor,
  latestArrivalBucket,
  monthlyAxisForYear
};
