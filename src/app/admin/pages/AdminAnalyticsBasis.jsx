import { useState, useRef, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  ResponsiveContainer
} from "recharts";
import { ForecastPriceTrendChart } from "../../global/components/shared/ForecastPriceTrendChart";
import { HistoricalAveragePriceSection } from "../../global/components/shared/HistoricalAveragePriceSection";
import { getVariants } from "../../global/data/commodities";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, ChevronDown, AlertTriangle, Info, Calendar, X } from "lucide-react";
import {
  FALLBACK_RELIABILITY_BANDS,
  SHORT_BAND_EXPLANATIONS,
  buildReliabilitySummary,
  buildReliabilityExplanation,
  buildReliabilityRuleLines
} from "../utils/reliabilityExplanations";
import { CommodityIllustration, getCommodityIconKey } from "../../global/components/shared/CommodityIllustrations";
import { CLASSIFICATION_COLORS } from "../components/analytics/adminAnalyticsMockData";
import {
  FARM_COLOR,
  NO_QUARTILE_BAR_COLOR,
  OTHER_COLOR,
  availableArrivalYears,
  bucketArrivals,
  classifyArrival,
  classificationColor,
  monthlyAxisForYear
} from "../components/analytics/arrivalVolumeSeries";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../global/components/ui/tooltip";
import { ProductionSourcePieChart } from "../../global/components/shared/ProductionSourcePieChart";
import { ArrivalSourcePieChart } from "../../global/components/shared/ArrivalSourcePieChart";
import { WeatherForecastOutlook } from "../../global/components/shared/WeatherForecastOutlook";
import { getCommodityProfile } from "../../global/components/shared/weatherExplanations";
import { analyticsApi } from "../../../services/api";
import { useArrivalPressure, useHistoricalSeasonalProduction, usePriceOutlook } from "../../../hooks/useAnalyticsOutputs";
import { buildWeatherRiskAnalysis } from "../../global/utils/weatherRiskAnalysis";

const ARRIVAL_SOURCE_OPTIONS = [
  { value: "overall", label: "Overall", subtitle: "Overall (Farm + Other)" },
  { value: "farm", label: "Farm Source", subtitle: "Farm Source" },
  { value: "other", label: "Other Sources", subtitle: "Other Sources" }
];
// Arrival rows are stored at a month's last day by design, so a day bucket is
// always one point per month wearing a day label. Monthly is the only
// granularity the DFTC workbook can actually supply.
const ARRIVAL_GRANULARITY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];
const ARRIVAL_CLASSIFICATION_TONES = {
  Low: "bg-blue-100 border-blue-200 text-blue-700",
  "Lower Middle": "bg-emerald-100 border-emerald-200 text-emerald-700",
  "Upper Middle": "bg-amber-100 border-amber-200 text-amber-700",
  High: "bg-red-100 border-red-200 text-red-700"
};

const kgFmt = (value) =>
  `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;

// Pill switch used by the trend card's source and granularity controls.
function SegmentedControl({ value, onChange, options }) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[var(--hw-neutral-100)] border border-[var(--hw-neutral-200)] max-w-full overflow-x-auto [scrollbar-width:none]">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-[12px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${active
                ? "bg-white text-[var(--hw-green-800)] shadow-sm border border-[var(--hw-neutral-200)]"
                : "text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-800)] border border-transparent"
              }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const CustomSimpleDropdown = ({ value, options = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-[12px] sm:text-[13px] bg-[var(--hw-neutral-50)] hover:bg-white border border-[var(--hw-neutral-200)] rounded-lg sm:rounded-xl transition-colors cursor-pointer focus:border-[var(--hw-green-600)] focus:ring-2 focus:ring-[var(--hw-green-600)]/20"
      >
        <span className="font-semibold text-black truncate">{value}</span>
        <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-black flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
          {options.map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full flex items-center px-3.5 py-2 text-[12px] sm:text-[13px] text-left transition-colors cursor-pointer ${opt === value ? "bg-[var(--hw-green-50)] font-semibold text-[var(--hw-green-800)]" : "text-black hover:bg-[var(--hw-neutral-50)]"
                }`}
            >
              <span className="flex-1 truncate">{opt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Tooltip card: period + classification badge, the overall total, the farm/other
// split with each share, then the total for whichever view is selected.
function ArrivalTrendTooltip({ active, payload, sourceLabel, sourceValueFor }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const split = (value) => {
    const pct = row.total_kg > 0 ? Math.round((Number(value || 0) / row.total_kg) * 100) : 0;
    return `${kgFmt(value)} (${pct}%)`;
  };

  return (
    <div className="rounded-xl border border-[var(--hw-neutral-200)] bg-white p-3 shadow-lg min-w-[210px]">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-[12px] font-semibold text-[var(--hw-neutral-800)]">{row.tipLabel}</span>
        {row.classification && (
          <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${ARRIVAL_CLASSIFICATION_TONES[row.classification] || "bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-600)]"}`}>
            {row.classification}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 py-0.5">
        <span className="text-[12px] text-[var(--hw-neutral-700)]">Overall Total:</span>
        <span className="text-[12px] font-bold text-[var(--hw-neutral-900)]">{kgFmt(row.total_kg)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 py-0.5">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--hw-neutral-800)]">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FARM_COLOR }} />
          Farm Source:
        </span>
        <span className="text-[12px] text-[var(--hw-neutral-700)]">{split(row.farm_kg)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 py-0.5">
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--hw-neutral-700)]">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: OTHER_COLOR }} />
          Other Sources:
        </span>
        <span className="text-[12px] text-[var(--hw-neutral-700)]">{split(row.other_kg)}</span>
      </div>
      <div className="mt-2 pt-2 border-t border-dashed border-[var(--hw-neutral-200)] flex items-center justify-between gap-3">
        <span className="text-[12px] font-bold text-[var(--hw-neutral-800)]">{sourceLabel}:</span>
        <span className="text-[12px] font-bold text-[var(--hw-neutral-900)]">{kgFmt(sourceValueFor(row))}</span>
      </div>
    </div>
  );
}

const TOP_10_COMMODITIES = [
  "Ampalaya",
  "Atsal",
  "Carrots",
  "Chinese Pechay",
  "Kalabasa",
  "Kamatis",
  "Lettuce",
  "Pipino",
  "Repolyo",
  "Talong"
];

export function sortArrivalRecordsAscending(records) {
  return [...(records || [])].sort((left, right) =>
    String(left?.arrival_date || "").slice(0, 10)
      .localeCompare(String(right?.arrival_date || "").slice(0, 10))
  );
}

const TOP_10_WEATHER_TEMPLATES = [
  {
    commodity: "Ampalaya",
    extraSuitable: "; RH≥90% < 3h; Wind ≤ 18 km/h",
    extraCaution: "; RH≥90% 3–5h; Wind 18–28.8 km/h",
    extraSevere: "; RH≥90% ≥ 6h; Wind > 28.8 km/h",
  },
  {
    commodity: "Atsal",
    extraSuitable: "; RH>85% < 3h; Wind < 21.6 km/h",
    extraCaution: "; RH>85% 3–5h; Wind 21.6–28.8 km/h",
    extraSevere: "; RH>85% ≥ 6h; Wind ≥ 28.8 km/h",
  },
  {
    commodity: "Carrots",
    extraSuitable: "",
    extraCaution: "",
    extraSevere: "",
  },
  {
    commodity: "Chinese Pechay",
    extraSuitable: "; RH>90% < 6h; Wind < 18 km/h",
    extraCaution: "; RH>90% 6–11h; Wind 18–54 km/h",
    extraSevere: "; RH>90% ≥ 12h; Wind ≥ 54 km/h",
  },
  {
    commodity: "Kalabasa",
    extraSuitable: "; RH≥90% < 3h",
    extraCaution: "; RH≥90% 3–5h",
    extraSevere: "; RH≥90% ≥ 6h",
  },
  {
    commodity: "Kamatis",
    extraSuitable: "; Max RH < 85%; Wind ≤ 39.6 km/h",
    extraCaution: "; Max RH 85–90%; Wind 39.6–54 km/h",
    extraSevere: "; Max RH > 90%; Wind > 54 km/h",
  },
  {
    commodity: "Lettuce",
    extraSuitable: "; RH≥95% < 5h; Wind < 18 km/h",
    extraCaution: "; RH≥95% 5–6h; Wind 18–54 km/h",
    extraSevere: "; RH≥95% ≥ 7h; Wind ≥ 54 km/h",
  },
  {
    commodity: "Pipino",
    extraSuitable: "; RH≥90% < 3h; Wind < 21.6 km/h",
    extraCaution: "; RH≥90% 3–5h; Wind 21.6–32.4 km/h",
    extraSevere: "; RH≥90% ≥ 6h; Wind ≥ 32.4 km/h",
  },
  {
    commodity: "Repolyo",
    extraSuitable: "; RH>90% < 6h",
    extraCaution: "; RH>90% 6–11h",
    extraSevere: "; RH>90% ≥ 12h",
  },
  {
    commodity: "Talong",
    extraSuitable: "; Max RH < 86%",
    extraCaution: "; Max RH 86–92%",
    extraSevere: "; Max RH > 92%",
  },
];

function buildCommodityWeatherThreshold(template, commodityRules = [], profile = null) {
  const tempRangeRule = commodityRules.find((r) => r.metric_key === "temp_range" && r.risk_level === "suitable");
  const tempMinCaution = commodityRules.find((r) => r.metric_key === "temp_min" && r.risk_level === "caution" && r.operator === ">");
  const tempMaxCaution = commodityRules.find((r) => r.metric_key === "temp_max" && r.risk_level === "caution" && r.operator === "<");
  const tempMinSevere = commodityRules.find((r) => r.metric_key === "temp_min" && r.risk_level === "severe");
  const tempMaxSevere = commodityRules.find((r) => r.metric_key === "temp_max" && r.risk_level === "severe");

  const suitMin = tempRangeRule?.threshold_min != null ? Number(tempRangeRule.threshold_min) : (profile?.suitTempMin ?? 20);
  const suitMax = tempRangeRule?.threshold_max != null ? Number(tempRangeRule.threshold_max) : (profile?.suitTempMax ?? 30);
  const sevMin = tempMinSevere?.threshold_max != null ? Number(tempMinSevere.threshold_max) : (profile?.sevTempMin ?? 5);
  const sevMax = tempMaxSevere?.threshold_min != null ? Number(tempMaxSevere.threshold_min) : (profile?.sevTempMax ?? 38);
  const cautColdMin = tempMinCaution?.threshold_min != null ? Number(tempMinCaution.threshold_min) : sevMin;
  const cautHotMax = tempMaxCaution?.threshold_max != null ? Number(tempMaxCaution.threshold_max) : sevMax;

  const suitableText = `Temp ${suitMin}–${suitMax}°C${template.extraSuitable || ""}`;
  const cautionText = `Temp ${cautColdMin}–${suitMin}°C or ${suitMax}–${cautHotMax}°C${template.extraCaution || ""}`;
  const severeText = `Temp ≤ ${sevMin}°C or ≥ ${sevMax}°C${template.extraSevere || ""}`;

  return {
    commodity: template.commodity,
    suitable: suitableText,
    caution: cautionText,
    severe: severeText,
  };
}

function formatForecastDate(dateStr) {
  if (!dateStr) return "-";
  const parts = String(dateStr).split("-");
  if (parts.length === 3) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[parseInt(parts[1], 10) - 1] || parts[1];
    return `${month} ${parseInt(parts[2], 10)}`;
  }
  return dateStr;
}


const DEFAULT_BASIS_TEMPLATES = {
  "price-outlook": {
    module: "Price Outlook",
    basisSource: "-",
    inputPeriod: "-",
    processedAt: "-",
    classification: "Not processed",
    basisInputs: {
      "Recent average price": "-/kg",
      "Lower forecast": "-/kg",
      "Forecast midpoint": "-/kg",
      "Upper forecast": "-/kg",
      "Forecast price change": "-"
    },
    thresholds: [
      { classification: "Favorable", rule: "Forecast price change > +5%" },
      { classification: "Neutral", rule: "Forecast price change between −5% and +5%" },
      { classification: "Unfavorable", rule: "Forecast price change < −5%" }
    ],
    resultExplanation: "No explanation available."
  },
  "arrival-pressure": {
    module: "Arrival Pressure",
    basisSource: "-",
    inputPeriod: "-",
    processedAt: "-",
    classification: "Not processed",
    basisInputs: {
      "Current DFTC arrival volume": "- MT/week",
      "Q1 threshold": "- MT/week",
      "Q2 threshold": "- MT/week",
      "Q3 threshold": "- MT/week"
    },
    thresholds: [
      { classification: "Low", rule: "Arrival volume ≤ Q1 threshold" },
      { classification: "Lower Middle", rule: "Arrival volume > Q1 and ≤ Q2 threshold" },
      { classification: "Upper Middle", rule: "Arrival volume > Q2 and ≤ Q3 threshold" },
      { classification: "High", rule: "Arrival volume > Q3 threshold" }
    ],
    resultExplanation: "No explanation available."
  },
  "historical-production": {
    module: "Historical Seasonal Production Level",
    basisSource: "-",
    inputPeriod: "-",
    processedAt: "-",
    classification: "Not processed",
    basisInputs: {
      "Grand average quarterly production": "- MT",
      "Peak production quarter": "-",
      "Lean production quarter": "-",
      "Historical baseline period": "-",
      "Source areas": "-",
      "Q1 ratio threshold": "-",
      "Q2 ratio threshold": "-",
      "Q3 ratio threshold": "-"
    },
    quarterlyProfiles: [],
    thresholds: [
      { classification: "Low", rule: "PSA production ratio < 0.72" },
      { classification: "Lower Middle", rule: "PSA production ratio 0.72–0.99" },
      { classification: "Upper Middle", rule: "PSA production ratio 0.99–1.20" },
      { classification: "High", rule: "PSA production ratio ≥ 1.20" }
    ],
    resultExplanation: "No explanation available."
  },
  "weather-risk": {
    module: "Weather Risk",
    basisSource: "-",
    inputPeriod: "-",
    processedAt: "-",
    classification: "Not processed",
    basisInputs: {
      "Location": "-",
      "Forecast period": "-",
      "Average rainfall": "- mm/day",
      "Average rain probability": "-%",
      "Temperature Range": "-°C",
      "Humidity": "-%",
      "Crop threshold": "Weather thresholds not configured for this commodity and variety."
    },
    thresholds: [
      { classification: "Suitable", rule: "Rainfall < 15 mm/day; temp 20–30°C" },
      { classification: "Caution", rule: "Rainfall 15–30 mm/day; temp 30–35°C" },
      { classification: "Severe", rule: "Rainfall > 30 mm/day; temp > 35°C" }
    ],
    resultExplanation: "No explanation available."
  }
};

const CustomCommodityDropdown = ({ value, options = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedName = value || options[0] || "Ampalaya";
  const selectedIconKey = getCommodityIconKey(null, null, selectedName);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-[13px] bg-[var(--hw-neutral-50)] hover:bg-white border border-[var(--hw-neutral-200)] rounded-xl transition-colors cursor-pointer focus:border-[var(--hw-green-600)] focus:ring-2 focus:ring-[var(--hw-green-600)]/20"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CommodityIllustration commodityId={selectedIconKey} className="w-5 h-5 flex-shrink-0" />
          <span className="text-[13px] font-medium text-[var(--hw-neutral-900)] truncate">{selectedName}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-[var(--hw-neutral-500)] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
          {options.map((optName) => {
            const optIconKey = getCommodityIconKey(null, null, optName);
            const isSelected = optName === selectedName;

            return (
              <button
                type="button"
                key={optName}
                onClick={() => {
                  onChange(optName);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left transition-colors cursor-pointer ${isSelected ? "bg-[var(--hw-green-50)] font-semibold text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
                  }`}
              >
                <CommodityIllustration commodityId={optIconKey} className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 truncate">{optName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CustomVarietyDropdown = ({ value, options = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedVariety = value || "All Varieties";

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-[13px] bg-[var(--hw-neutral-50)] hover:bg-white border border-[var(--hw-neutral-200)] rounded-xl transition-colors cursor-pointer focus:border-[var(--hw-green-600)] focus:ring-2 focus:ring-[var(--hw-green-600)]/20"
      >
        <span className="text-[13px] font-medium text-[var(--hw-neutral-900)] truncate">{selectedVariety}</span>
        <ChevronDown className={`w-4 h-4 text-[var(--hw-neutral-500)] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
          <button
            type="button"
            onClick={() => {
              onChange("All Varieties");
              setOpen(false);
            }}
            className={`w-full flex items-center px-3.5 py-2.5 text-[13px] text-left transition-colors cursor-pointer ${selectedVariety === "All Varieties" ? "bg-[var(--hw-green-50)] font-semibold text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
              }`}
          >
            All Varieties
          </button>
          {options.map((optName) => {
            const isSelected = optName === selectedVariety;

            return (
              <button
                type="button"
                key={optName}
                onClick={() => {
                  onChange(optName);
                  setOpen(false);
                }}
                className={`w-full flex items-center px-3.5 py-2.5 text-[13px] text-left transition-colors cursor-pointer ${isSelected ? "bg-[var(--hw-green-50)] font-semibold text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
                  }`}
              >
                <span className="flex-1 truncate">{optName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

function generateDatasets(module) {
  if (module === "Price Outlook") {
    const cols = ["Date", "Commodity", "Variety", "Market", "Price Type", "Price", "Source"];
    return { columns: cols, rows: [] };
  }
  if (module === "Arrival Pressure") {
    const cols = ["Date", "Commodity", "Variety", "Arrival Volume", "Farm Source", "Other Sources", "Source"];
    return { columns: cols, rows: [] };
  }
  if (module === "Historical Seasonal Production Level") {
    const cols = ["Year", "Quarter", "Commodity", "Variety", "Source Areas", "Production Volume", "Unit"];
    return { columns: cols, rows: [] };
  }
  const cols = ["Date", "Location", "Rainfall", "Temperature Range", "Humidity", "Wind", "Source"];
  return { columns: cols, rows: [] };
}

const PAGE_SIZE = 20;

const DatasetsUsed = ({ module, records = [] }) => {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const { columns, rows: defaultEmpty } = generateDatasets(module);
  const rows = records && records.length > 0 ? records : defaultEmpty;
  const totalPages = Math.ceil(rows.length / PAGE_SIZE) || 1;
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      <button
        onClick={() => {
          setExpanded((v) => !v);
          setPage(1);
        }}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 hover:bg-[var(--hw-neutral-50)] transition-colors text-left cursor-pointer"
      >
        <div>
          <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Datasets Used</p>
          {!expanded && <p className="text-[12px] text-[var(--hw-neutral-600)] mt-0.5">View source records used for this result.</p>}
        </div>
        <ChevronDown className={`w-4 h-4 text-[var(--hw-neutral-700)] flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <>
          <div className="border-t border-[var(--hw-neutral-100)] overflow-x-auto [scrollbar-width:thin] touch-pan-x">
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="px-4 py-3 text-left font-semibold text-[var(--hw-neutral-600)] whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-[var(--hw-neutral-500)] text-[13px]">
                      No source records available for this result.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row, i) => (
                    <tr key={i}>
                      {columns.map((c) => (
                        <td key={c} className="px-4 py-3 text-[var(--hw-neutral-700)] whitespace-nowrap">
                          {row[c] ?? "-"}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-3.5 border-t border-[var(--hw-neutral-100)]">
              <p className="text-[12px] text-[var(--hw-neutral-600)]">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length} records
              </p>
              <div className="flex items-center gap-1 flex-wrap justify-center">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 text-[12px] border rounded-lg transition-colors ${p === page ? "border-[var(--hw-green-600)] bg-[var(--hw-green-700)] text-white" : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
                      }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const DETAIL_MODULE_KEYS = {
  "price-outlook": "price_outlook",
  "arrival-pressure": "arrival_pressure",
  "historical-production": "historical_seasonal_production_level",
  "weather-risk": "weather_risk"
};

const DETAIL_CLASSIFICATION_FIELDS = {
  "price-outlook": "price_outlook",
  "arrival-pressure": "arrival_pressure",
  "historical-production": "historical_seasonal_production_level",
  "weather-risk": "weather_risk_level"
};

const DETAIL_MODULE_SOURCES = {
  "price-outlook": "Forecasting Output (Bangkerohan Retail)",
  "arrival-pressure": "DFTC Arrival Volume",
  "historical-production": "PSA OpenStat Production",
  "weather-risk": "Open-Meteo 14-day Forecast"
};

const DETAIL_MODULE_PERIODS = {
  "price-outlook": "14 days",
  "arrival-pressure": "90 days",
  "historical-production": "Current quarter",
  "weather-risk": "14 days"
};

const PRICE_OUTLOOK_SOURCE_LABELS = {
  bankerohan_daily_retail: "Bangkerohan Retail",
  bankerohan_daily_wholesale: "Bangkerohan Wholesale",
  dftc_daily_retail: "DFTC Retail",
  dftc_daily_wholesale: "DFTC Wholesale",
};

const priceOutlookSourceLabel = (source) =>
  PRICE_OUTLOOK_SOURCE_LABELS[source] || source || "-";

// Modal listing every Data Reliability classification band with its score range
// and meaning. Ranges and meanings come from the scoring layer
// (`reliability.py`) via the API, so they can never drift from the cutoffs.
// Modal showing full Data Reliability details (dimensions, calculation)
// followed by a minimal table with Reliability bands and short explanations.
const ReliabilityExplanationModal = ({ resultId, level, factor, bands, dimensions, evidence, rules, onClose }) => {
  const [expandedSection, setExpandedSection] = useState({
    availability: false,
    timeliness: false,
    validity: false,
  });

  const toggleSection = (dim) => {
    setExpandedSection((prev) => ({
      ...prev,
      [dim]: !prev[dim],
    }));
  };

  const exp = buildReliabilityExplanation({
    resultId,
    level,
    factor,
    bands,
    dimensions,
    evidence,
    rules,
  });

  const minimalBands = (bands || FALLBACK_RELIABILITY_BANDS).map((b) => ({
    ...b,
    shortDescription: SHORT_BAND_EXPLANATIONS[b.label] || b.description || "-",
  }));

  const e = evidence || {};
  const modulePolicy = rules?.module_policies?.[resultId] || null;

  // Helper to determine current assessment value summary text per dimension
  const getCurrentAssessmentText = (dim) => {
    const scoreVal = dimensions?.[dim] != null ? Number(dimensions[dim]).toFixed(2) : "-";
    if (resultId === "price-outlook") {
      if (dim === "availability") {
        const obs = e.available != null ? e.available : (e.observed_reporting_days != null ? e.observed_reporting_days : "-");
        const req = e.required != null ? e.required : (e.expected_reporting_days != null ? e.expected_reporting_days : "-");
        return `${obs} of ${req} expected reporting days have usable price observations. Availability: ${scoreVal}.`;
      }
      if (dim === "timeliness") {
        const lat = e.latest_date || "N/A";
        const missed = e.missed_reporting_days != null ? e.missed_reporting_days : (e.missed_reporting_weekdays != null ? e.missed_reporting_weekdays : 0);
        return `Latest observation: ${lat}. Missed reporting days: ${missed}. Timeliness: ${scoreVal}.`;
      }
      if (dim === "validity") {
        const usable = e.usable_records != null ? e.usable_records : (e.valid_records != null ? e.valid_records : "-");
        return `${usable} usable price observations were included in the reliability assessment. Validity: ${scoreVal}.`;
      }
    } else if (resultId === "arrival-pressure") {
      if (dim === "availability") {
        const obs = e.available != null ? e.available : (e.available_months != null ? e.available_months : "-");
        const req = e.required != null ? e.required : 12;
        return `${obs} of ${req} monthly arrival observations are available. Availability: ${scoreVal}.`;
      }
      if (dim === "timeliness") {
        const lat = e.latest_arrival_month || e.latest_date || "N/A";
        const elapsed = e.elapsed_calendar_months != null ? e.elapsed_calendar_months : "-";
        return `Latest observation: ${lat}. Age: ${elapsed} calendar months. Timeliness: ${scoreVal}.`;
      }
      if (dim === "validity") {
        const usable = e.usable_records != null ? e.usable_records : (e.valid_records != null ? e.valid_records : "-");
        return `${usable} usable monthly arrival observations recorded with positive or non-null volume. Validity: ${scoreVal}.`;
      }
    } else if (resultId === "historical-production") {
      if (dim === "availability") {
        const obs = e.available != null ? e.available : "-";
        const req = e.required != null ? e.required : 20;
        return `${obs} usable quarters are available (target: ${req} quarters / 5 years). Availability: ${scoreVal}.`;
      }
      if (dim === "timeliness") {
        const lat = e.latest_period || (e.latest_year ? `${e.latest_year} ${e.latest_quarter || ""}`.trim() : "N/A");
        const overdue = e.days_overdue != null ? e.days_overdue : 0;
        const missing = e.earliest_missing_period || "subsequent quarter";
        const statusText = overdue === 0 ? `${missing} is not overdue` : `${missing} is ${overdue} days overdue`;
        return `Latest production period: ${lat}. ${statusText}. Timeliness: ${scoreVal}.`;
      }
      if (dim === "validity") {
        const usable = e.usable_records != null ? e.usable_records : "-";
        return `${usable} usable quarters with reported positive volume. Validity: ${scoreVal}.`;
      }
    } else if (resultId === "weather-risk") {
      if (dim === "availability") {
        const obs = e.available != null ? e.available : "-";
        const req = e.required != null ? e.required : 14;
        return `${obs} of ${req} forecast days are available in the 14-day window. Availability: ${scoreVal}.`;
      }
      if (dim === "timeliness") {
        const age = e.age_hours != null ? `${e.age_hours} hours old` : (e.unverified_freshness ? "timestamp unverified" : "fresh");
        return `Forecast retrieval age: ${age}. Timeliness: ${scoreVal}.`;
      }
      if (dim === "validity") {
        const obs = e.valid_records != null ? e.valid_records : (e.available != null ? e.available : "-");
        return `${obs} forecast dates with verified meteorological metrics. Validity: ${scoreVal}.`;
      }
    }
    return `Evaluated score: ${scoreVal}.`;
  };

  // Helper to check if a bracket row is active
  const isBracketActive = (dim, bracket) => {
    if (resultId === "price-outlook" && dim === "timeliness") {
      const missed = e.missed_reporting_days != null ? e.missed_reporting_days : (e.missed_reporting_weekdays != null ? e.missed_reporting_weekdays : null);
      if (missed == null) return false;
      if (bracket.min != null && bracket.max != null) {
        return missed >= bracket.min && missed <= bracket.max;
      }
      if (bracket.min != null && bracket.max == null) {
        return missed >= bracket.min;
      }
    } else if (resultId === "arrival-pressure") {
      if (dim === "availability") {
        const count = e.available != null ? e.available : e.available_months;
        if (count == null) return false;
        if (bracket.min != null && bracket.max != null) {
          return count >= bracket.min && count <= bracket.max;
        }
      }
      if (dim === "timeliness") {
        const elapsed = e.elapsed_calendar_months;
        if (elapsed == null) return false;
        if (bracket.min != null && bracket.max != null) {
          return elapsed >= bracket.min && elapsed <= bracket.max;
        }
        if (bracket.min != null && bracket.max == null) {
          return elapsed >= bracket.min;
        }
      }
    } else if (resultId === "historical-production") {
      if (dim === "availability") {
        const count = e.available;
        if (count == null) return false;
        if (bracket.min != null && bracket.max != null) {
          return count >= bracket.min && count <= bracket.max;
        }
        if (bracket.min != null && bracket.max == null) {
          return count >= bracket.min;
        }
      }
      if (dim === "timeliness") {
        const overdue = e.days_overdue;
        if (overdue == null) return false;
        if (bracket.min != null && bracket.max != null) {
          return overdue >= bracket.min && overdue <= bracket.max;
        }
        if (bracket.min != null && bracket.max == null) {
          return overdue >= bracket.min;
        }
      }
    } else if (resultId === "weather-risk" && dim === "timeliness") {
      if (e.unverified_freshness && bracket.min == null) {
        return true;
      }
      const hours = e.age_hours;
      if (hours == null) return false;
      if (bracket.min != null && bracket.max != null) {
        return hours >= bracket.min && hours <= bracket.max;
      }
      if (bracket.min != null && bracket.max == null) {
        return hours >= bracket.min;
      }
    }
    return false;
  };

  const renderScoringTable = (dim) => {
    const dimTitle = dim.charAt(0).toUpperCase() + dim.slice(1);
    const policy = modulePolicy?.[dim];

    if (!policy) {
      return (
        <p className="text-[12px] text-[var(--hw-neutral-600)] italic">
          Scoring rules metadata unavailable for this dimension.
        </p>
      );
    }

    if (policy.rule_type === "brackets" && policy.brackets) {
      return (
        <div className="overflow-x-auto rounded-xl border border-[var(--hw-neutral-200)] mt-2">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
              <tr>
                <th className="px-3 sm:px-4 py-2 font-semibold text-black whitespace-nowrap">
                  Condition / Evidence Range
                </th>
                <th className="px-3 sm:px-4 py-2 font-semibold text-black whitespace-nowrap">
                  {dimTitle}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hw-neutral-200)]">
              {policy.brackets.map((b, idx) => {
                const active = isBracketActive(dim, b);
                return (
                  <tr
                    key={idx}
                    className={active ? "bg-[var(--hw-green-50)] font-semibold text-[var(--hw-green-900)]" : "text-black"}
                  >
                    <td className="px-3 sm:px-4 py-1.5 align-top">
                      <div>
                        {b.condition}
                        {b.safeguard && (
                          <span className="block text-[11px] text-amber-700 font-normal mt-0.5">
                            * {b.safeguard}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-1.5 align-top whitespace-nowrap">
                      {typeof b.score === "number" ? b.score.toFixed(2) : b.score}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (policy.rule_type === "ratio") {
      const obs = e.available != null ? e.available : "-";
      const req = e.required != null ? e.required : "-";
      const scoreVal = dimensions?.[dim] != null ? Number(dimensions[dim]).toFixed(2) : "-";

      return (
        <div className="space-y-2 mt-2">
          <div className="overflow-x-auto rounded-xl border border-[var(--hw-neutral-200)]">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                <tr>
                  <th className="px-3 sm:px-4 py-2 font-semibold text-black whitespace-nowrap">
                    Formula / Calculation
                  </th>
                  <th className="px-3 sm:px-4 py-2 font-semibold text-black whitespace-nowrap">
                    {dimTitle}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hw-neutral-200)]">
                <tr className="bg-[var(--hw-green-50)] font-semibold text-[var(--hw-green-900)]">
                  <td className="px-3 sm:px-4 py-2 align-top">
                    <div>{policy.formula}</div>
                    <div className="text-[11px] font-normal text-[var(--hw-green-800)] mt-0.5">
                      Actual evidence: {obs} usable of {req} required {policy.unit} = {scoreVal}
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-2 align-top whitespace-nowrap">
                    {scoreVal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11.5px] text-[var(--hw-neutral-600)] leading-relaxed">
            {policy.description}
          </p>
        </div>
      );
    }

    if (policy.rule_type === "rule_based" && policy.checks) {
      return (
        <div className="overflow-x-auto rounded-xl border border-[var(--hw-neutral-200)] mt-2">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
              <tr>
                <th className="px-3 sm:px-4 py-2 font-semibold text-black whitespace-nowrap">
                  Condition / Rule
                </th>
                <th className="px-3 sm:px-4 py-2 font-semibold text-black whitespace-nowrap">
                  {dimTitle}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hw-neutral-200)]">
              {policy.checks.map((chk, idx) => (
                <tr key={idx} className="text-black">
                  <td className="px-3 sm:px-4 py-1.5 align-top">
                    <div>{chk.condition}</div>
                    {chk.safeguard && (
                      <span className="block text-[11px] text-amber-700 font-normal mt-0.5">
                        * {chk.safeguard}
                      </span>
                    )}
                  </td>
                  <td className="px-3 sm:px-4 py-1.5 align-top whitespace-nowrap">
                    {typeof chk.score === "number" ? chk.score.toFixed(2) : chk.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reliability explanation"
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-[var(--hw-neutral-100)]">
          <p className="text-[14px] font-bold text-black">Reliability Explanation</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-black hover:bg-[var(--hw-neutral-100)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-auto p-4 sm:p-6 space-y-5">
          <div className="space-y-3">
            <p className="text-[12px] font-bold text-black uppercase tracking-wider">Score Breakdown</p>
            <p className="text-[13px] text-black leading-relaxed">{exp.summary}</p>
            {exp.rows.length > 0 && (
              <ul className="space-y-2 bg-[var(--hw-neutral-50)] rounded-xl p-3 sm:p-4 border border-[var(--hw-neutral-200)]">
                {exp.rows.map((row) => (
                  <li key={row.key} className="text-[13px] text-black leading-relaxed">
                    <span className="font-semibold">{row.label}</span>{" "}
                    {Number(row.score).toFixed(2)} (weight {Number(row.weight).toFixed(2)}) &mdash; {row.detail}
                  </li>
                ))}
              </ul>
            )}
            {exp.calculation && (
              <p className="text-[13px] text-black leading-relaxed">
                <span className="font-semibold">Calculation:</span> {exp.calculation}
              </p>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-bold text-black uppercase tracking-wider">Classification Bands</p>
            <div className="overflow-hidden rounded-xl border border-[var(--hw-neutral-200)]">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                  <tr>
                    <th className="px-3 sm:px-4 py-2 font-semibold text-black whitespace-nowrap">Classification</th>
                    <th className="px-3 sm:px-4 py-2 font-semibold text-black whitespace-nowrap">Score Range</th>
                    <th className="px-3 sm:px-4 py-2 font-semibold text-black">Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hw-neutral-200)]">
                  {minimalBands.map((band) => (
                    <tr key={band.label} className={band.label === level ? "bg-[var(--hw-green-50)]" : ""}>
                      <td className="px-3 sm:px-4 py-2 font-semibold text-black whitespace-nowrap align-top">{band.label}</td>
                      <td className="px-3 sm:px-4 py-2 text-black whitespace-nowrap align-top">
                        {Number(band.min).toFixed(2)}&ndash;{Number(band.max).toFixed(2)}
                      </td>
                      <td className="px-3 sm:px-4 py-2 text-black leading-relaxed align-top">{band.shortDescription}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expandable Scoring Rules Section */}
          <div className="space-y-3 pt-2 border-t border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-bold text-black uppercase tracking-wider">Scoring Rules</p>
            <div className="space-y-2">
              {[
                { key: "availability", label: "Availability (40%)" },
                { key: "timeliness", label: "Timeliness (30%)" },
                { key: "validity", label: "Validity (30%)" },
              ].map(({ key, label }) => {
                const isOpen = !!expandedSection[key];
                return (
                  <div key={key} className="rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => toggleSection(key)}
                      className="w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 text-left bg-[var(--hw-neutral-50)] hover:bg-[var(--hw-neutral-100)] transition-colors cursor-pointer"
                    >
                      <span className="text-[13px] font-semibold text-black">{label}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-black transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="p-3 sm:p-4 bg-white border-t border-[var(--hw-neutral-200)] space-y-2">
                        <p className="text-[12.5px] text-black font-medium leading-relaxed">
                          {getCurrentAssessmentText(key)}
                        </p>
                        {renderScoringTable(key)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function buildBasisResultFromDetail(detail, resultId, defaultTemplate) {
  const raw = detail?.basis_inputs?.[DETAIL_MODULE_KEYS[resultId]] || {};
  const classification = detail?.[DETAIL_CLASSIFICATION_FIELDS[resultId]] || "Not processed";
  const processedAt = detail?.generated_at
    ? new Date(detail.generated_at).toLocaleString("en-US", { dateStyle: "medium" })
    : "-";

  let basisInputs;
  if (resultId === "price-outlook") {
    basisInputs = {
      "Recent average price": raw.recent_average_price != null ? `${raw.recent_average_price}/kg` : "-/kg",
      "Lower forecast": raw.lower_forecast != null ? `${raw.lower_forecast}/kg` : "-/kg",
      "Forecast midpoint": raw.forecast_midpoint != null ? `${raw.forecast_midpoint}/kg` : "-/kg",
      "Upper forecast": raw.upper_forecast != null ? `${raw.upper_forecast}/kg` : "-/kg",
      "Forecast price change": raw.forecast_price_change_pct != null ? `${raw.forecast_price_change_pct}%` : "-"
    };
  } else if (resultId === "arrival-pressure") {
    basisInputs = {
      "Current DFTC arrival volume": raw.current_arrival_kg != null ? `${raw.current_arrival_kg} kg` : "-",
      "Q1 threshold": raw.q1_kg != null ? `${raw.q1_kg} kg` : "-",
      "Q2 threshold": raw.q2_kg != null ? `${raw.q2_kg} kg` : "-",
      "Q3 threshold": raw.q3_kg != null ? `${raw.q3_kg} kg` : "-"
    };
  } else if (resultId === "historical-production") {
    basisInputs = {
      "Average quarterly production": raw.average_quarterly_production_mt != null ? `${raw.average_quarterly_production_mt} MT` : "-",
      "Current quarter estimate": raw.current_quarter_estimate_mt != null ? `${raw.current_quarter_estimate_mt} MT` : "-",
      "Seasonal production ratio": raw.seasonal_production_ratio != null ? `${raw.seasonal_production_ratio}` : "-",
      "Q1 ratio": raw.q1_ratio != null ? `${raw.q1_ratio}` : "-",
      "Q2 ratio": raw.q2_ratio != null ? `${raw.q2_ratio}` : "-",
      "Q3 ratio": raw.q3_ratio != null ? `${raw.q3_ratio}` : "-"
    };
  } else {
    basisInputs = {
      "Forecast days available": raw.days_available != null ? `${raw.days_available} days` : "-"
    };
  }

  const warnings = detail?.basis_inputs?.warnings || [];
  const warningPrefixes = {
    price_outlook: ["Price:"],
    arrival_pressure: ["Arrivals:"],
    historical_seasonal_production_level: ["Production:"],
    weather_risk: ["Weather:"]
  };
  const moduleWarnings = warnings.filter((w) =>
    (warningPrefixes[DETAIL_MODULE_KEYS[resultId]] || []).some((p) => w.startsWith(p))
  );

  return {
    id: resultId,
    outputId: detail?.id || "-",
    commodity: detail?.commodity_name,
    variant: detail?.variety || "All Varieties",
    module: defaultTemplate.module,
    basisSource: DETAIL_MODULE_SOURCES[resultId],
    inputPeriod: DETAIL_MODULE_PERIODS[resultId],
    processedAt,
    classification,
    basisInputs,
    reliability: raw.reliability_status || null,
    // Factor + band definitions are supplied by the shared reliability layer,
    // so the explanation below always matches the scoring that set the status.
    reliabilityFactor: raw.reliability_factor ?? null,
    reliabilityBands: detail?.basis_inputs?.reliability_bands || [],
    reliabilityDimensions: raw.reliability_dimensions || null,
    reliabilityEvidence: raw.reliability_evidence || null,
    reliabilityRules: detail?.basis_inputs?.reliability_rules || null,
    moduleWarnings,
    thresholds: defaultTemplate.thresholds,
    resultExplanation: detail?.explanation || defaultTemplate.resultExplanation
  };
}

function AdminAnalyticsBasis() {
  const { resultId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const defaultTemplate = DEFAULT_BASIS_TEMPLATES[resultId];

  if (!defaultTemplate) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-16 text-center space-y-3 max-w-[1440px] mx-auto">
        <p className="text-[var(--hw-neutral-500)] text-[14px]">Result not found.</p>
        <button
          onClick={() => navigate("/admin/modules")}
          className="text-[var(--hw-green-700)] text-[13px] font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Analytical Modules
        </button>
      </div>
    );
  }

  const commodityParam = searchParams.get("commodity");
  const varietyParam = searchParams.get("variety");
  const outputParam = searchParams.get("output");

  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!outputParam) {
      setDetail(null);
      return;
    }
    let active = true;
    analyticsApi
      .getModuleOutputDetail(outputParam)
      .then((d) => active && setDetail(d))
      .catch(() => active && setDetail(null));
    return () => { active = false; };
  }, [outputParam]);

  const result = detail ? buildBasisResultFromDetail(detail, resultId, defaultTemplate) : {
    id: resultId,
    outputId: "-",
    commodity: commodityParam || "Ampalaya",
    variant: varietyParam || "All Varieties",
    ...defaultTemplate
  };

  const selectedCommodity = commodityParam || result.commodity || "Ampalaya";
  const selectedVariety = varietyParam || result.variant || "All Varieties";

  const availableVariants = useMemo(() => selectedCommodity !== "-" ? getVariants(selectedCommodity) : [], [selectedCommodity]);

  const [commodities, setCommodities] = useState(TOP_10_COMMODITIES);
  const [commodityRecords, setCommodityRecords] = useState([]);
  const [thresholdRules, setThresholdRules] = useState([]);
  const [thresholdsError, setThresholdsError] = useState("");
  const [weatherForecast, setWeatherForecast] = useState(null);
  const [weatherRules, setWeatherRules] = useState([]);
  const [allWeatherRules, setAllWeatherRules] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadCommodities() {
      try {
        const data = await analyticsApi.listCommodities();
        if (!active) return;
        const raw = Array.isArray(data) ? data : data?.items || [];
        setCommodityRecords(raw);
        const names = raw
          .filter((c) => (c.isTop10 ?? c.is_top10 ?? true) && (c.isActive ?? c.is_active ?? true))
          .map((c) => c.name || c.baseName || c.base_name)
          .filter(Boolean);
        if (names.length > 0) setCommodities(names);
      } catch {
        // keep the TOP_10 fallback list
      }
    }
    loadCommodities();
    return () => { active = false; };
  }, []);

  const selectedCommodityRecord = useMemo(
    () => commodityRecords.find((item) => item.name === selectedCommodity) || null,
    [commodityRecords, selectedCommodity]
  );

  // Fetch 14-day weather forecast + crop weather rules when on the weather-risk module
  useEffect(() => {
    if (resultId !== "weather-risk") return;
    let active = true;
    async function loadWeatherData() {
      try {
        setWeatherLoading(true);
        setWeatherError("");
        const [forecastData, rulesData, allRulesData] = await Promise.all([
          analyticsApi.getWeatherForecast(14),
          selectedCommodityRecord?.id
            ? analyticsApi.listWeatherRules(selectedCommodityRecord.id)
            : Promise.resolve({ items: [] }),
          analyticsApi.listWeatherRules().catch(() => ({ items: [] })),
        ]);
        if (!active) return;
        setWeatherForecast(forecastData);
        setWeatherRules(rulesData?.items || []);
        setAllWeatherRules(allRulesData?.items || []);
      } catch (err) {
        if (active) setWeatherError(err.message || "Unable to load weather forecast.");
      } finally {
        if (active) setWeatherLoading(false);
      }
    }
    loadWeatherData();
    return () => { active = false; };
  }, [resultId, selectedCommodityRecord?.id]);

  const weatherThresholdsRows = useMemo(() => {
    return TOP_10_WEATHER_TEMPLATES.map((tmpl) => {
      const cRec = commodityRecords.find((c) => c.name?.toLowerCase() === tmpl.commodity.toLowerCase());
      const cRules = (allWeatherRules || []).filter((r) => cRec && r.commodity_id === cRec.id);
      const profile = getCommodityProfile(tmpl.commodity);
      return buildCommodityWeatherThreshold(tmpl, cRules, profile);
    });
  }, [commodityRecords, allWeatherRules]);

  const { data: productionSummary, loading: productionLoading, error: productionError } = useHistoricalSeasonalProduction(
    resultId === "historical-production" && !!selectedCommodityRecord?.id,
    selectedCommodityRecord?.id
  );

  const [priceOutlookHorizon, setPriceOutlookHorizon] = useState(14);
  const [showReliabilityBands, setShowReliabilityBands] = useState(false);

  const { data: priceOutlook, error: priceOutlookError } = usePriceOutlook(
    resultId === "price-outlook" && !!selectedCommodityRecord?.id,
    selectedCommodityRecord?.id,
    "bangkerohan_retail",
    priceOutlookHorizon
  );

  const { data: arrivalSummary, loading: arrivalLoading, error: arrivalError } = useArrivalPressure(
    resultId === "arrival-pressure" && !!selectedCommodityRecord?.id,
    selectedCommodityRecord?.id
  );

  // Trend card controls. The year list is derived from the records so the
  // selector can only offer years that actually hold data.
  const [arrivalSource, setArrivalSource] = useState("overall");
  const [arrivalGranularity, setArrivalGranularity] = useState("monthly");
  const [arrivalYear, setArrivalYear] = useState(null);

  // history_records contains all records on file (unbounded); records is
  // scoped to the 90-day classification window. Use history_records for the
  // trend chart and year picker so they span every year on record.
  const arrivalRecords = arrivalSummary?.history_records || arrivalSummary?.records || [];
  const arrivalYears = useMemo(() => availableArrivalYears(arrivalRecords), [arrivalRecords]);
  // Resolve the active year: use the user's selection if it exists in the data,
  // otherwise fall back to the most recent year. Client-side filtering only —
  // no refetch needed per year because the initial fetch returns all records.
  const arrivalActiveYear = arrivalYears.includes(arrivalYear) ? arrivalYear : arrivalYears[0] ?? null;

  const arrivalSeries = useMemo(
    () => {
      // Quarterly and annually naturally span all years; year filter only applies
      // to monthly and weekly where a single-year view is meaningful.
      const yearFilter =
        arrivalGranularity === "quarterly" || arrivalGranularity === "annually"
          ? null
          : arrivalActiveYear;
      return bucketArrivals(arrivalRecords, { granularity: arrivalGranularity, year: yearFilter });
    },
    [arrivalRecords, arrivalGranularity, arrivalActiveYear]
  );

  // Monthly keeps a full Jan-Dec axis so a year with a few recorded months
  // still reads as a yearly trend. Daily only has the days that recorded.
  // When the 90-day window has fewer than 4 records the API withholds
  // quartile_thresholds (classification is unreliable with too few points).
  // For the trend chart we fall back to computing quartiles from the full
  // history so bars still show colours instead of all-grey.
  const arrivalChartQuartiles = useMemo(() => {
    if (arrivalSummary?.quartile_thresholds) return arrivalSummary.quartile_thresholds;
    const vols = arrivalRecords
      .map((r) => Number(r.volume_kg))
      .filter((v) => Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);
    if (vols.length < 4) return null;
    const q = (p) => {
      const idx = p * (vols.length - 1);
      const lo = Math.floor(idx), hi = Math.ceil(idx);
      return lo === hi ? vols[lo] : vols[lo] + (vols[hi] - vols[lo]) * (idx - lo);
    };
    return { q1: q(0.25), q2: q(0.5), q3: q(0.75) };
  }, [arrivalSummary?.quartile_thresholds, arrivalRecords]);

  const arrivalChartData = useMemo(() => {
    const withLabels = arrivalSeries.map((bucket) => ({
      ...bucket,
      tipLabel: `${bucket.label} ${bucket.year}`,
      classification: classifyArrival(bucket.total_kg, arrivalChartQuartiles)
    }));
    return arrivalGranularity === "monthly"
      ? monthlyAxisForYear(arrivalActiveYear, withLabels)
      : withLabels;
  }, [arrivalSeries, arrivalGranularity, arrivalActiveYear, arrivalChartQuartiles]);

  const arrivalSourceOption =
    ARRIVAL_SOURCE_OPTIONS.find((o) => o.value === arrivalSource) || ARRIVAL_SOURCE_OPTIONS[0];
  const arrivalSourceValueFor = (row) =>
    arrivalSource === "farm" ? row.farm_kg : arrivalSource === "other" ? row.other_kg : row.total_kg;
  // One bar per month, as the design shows. The source toggle picks which value
  // that single bar plots rather than adding a second column.
  const arrivalBarKey = arrivalSource === "farm" ? "farm_kg" : arrivalSource === "other" ? "other_kg" : "total_kg";
  const arrivalHasData = arrivalChartData.some((b) => b.total_kg > 0);
  const arrivalSourcePieData = useMemo(() => {
    const totals = arrivalChartData.reduce(
      (sum, row) => ({
        farm: sum.farm + Number(row.farm_kg || 0),
        other: sum.other + Number(row.other_kg || 0)
      }),
      { farm: 0, other: 0 }
    );
    const combined = totals.farm + totals.other;
    if (combined <= 0) return [];

    const farmPercent = Math.round((totals.farm / combined) * 100);
    return [
      { name: "Farm Source", value: farmPercent, volumeKg: totals.farm },
      { name: "Other Sources", value: 100 - farmPercent, volumeKg: totals.other }
    ];
  }, [arrivalChartData]);
  const arrivalSubtitle = `DFTC ${arrivalGranularity} arrivals · ${arrivalSourceOption.subtitle} · kilograms${arrivalGranularity === "monthly" && arrivalActiveYear ? ` · ${arrivalActiveYear}` : ""
    }`;

  // Load the threshold rules for the current module from the admin API
  useEffect(() => {
    let active = true;
    async function loadThresholds() {
      try {
        const data = await analyticsApi.listThresholds();
        if (!active) return;
        const module = (data?.items || []).find((m) => m.module_name === result.module);
        if (!module) return;
        const rules =
          module.rules && module.rules.length > 0
            ? module.rules
            : (await analyticsApi.listThresholdRules(module.id))?.items || [];
        if (active) setThresholdRules(rules);
      } catch (err) {
        if (active) setThresholdsError(err.message || "Failed to load threshold rules.");
      }
    }
    loadThresholds();
    return () => { active = false; };
  }, [result.module]);

  const shownThresholds =
    thresholdRules.length > 0
      ? thresholdRules.map((r) => ({
        classification: r.classification,
        rule:
          r.display_text ||
          (((r.operator || "") + " " + (r.threshold_value != null ? Math.round(Number(r.threshold_value) * 100) / 100 : "")).trim())
      }))
      : result.thresholds || [];

  const historicalResult = useMemo(() => {
    if (resultId !== "historical-production") return result;
    const isProcessed = productionSummary?.status === "processed";
    const quartiles = productionSummary?.quartile_thresholds || productionSummary?.quartiles;
    const formatMt = (value) => value == null ? "- MT" : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} MT`;
    const grandAvg = productionSummary?.grand_average_quarterly_mt ?? productionSummary?.average_quarterly_production_mt;
    const peakQ = productionSummary?.peak_quarter;
    const leanQ = productionSummary?.lean_quarter;
    const profiles = productionSummary?.quarterly_profiles || [];
    const peakProfile = profiles.find((p) => p.quarter === peakQ);
    const leanProfile = profiles.find((p) => p.quarter === leanQ);
    const recordCount = productionSummary?.total_valid_records || productionSummary?.record_count || 0;
    const baselinePeriodText = isProcessed
      ? `${recordCount} valid quarterly records${productionSummary?.years_covered ? ` (${productionSummary.years_covered})` : ""}`
      : "Insufficient data";

    const peakText = peakQ
      ? `${peakQ}${peakProfile?.calendar_period ? ` (${peakProfile.calendar_period})` : ""}${peakProfile?.classification ? ` — ${peakProfile.classification}` : ""}`
      : "-";
    const leanText = leanQ
      ? `${leanQ}${leanProfile?.calendar_period ? ` (${leanProfile.calendar_period})` : ""}${leanProfile?.classification ? ` — ${leanProfile.classification}` : ""}`
      : "-";

    return {
      ...result,
      outputId: productionSummary?.source_commodity_id || "-",
      basisSource: productionSummary?.source || "production_record",
      inputPeriod: isProcessed ? baselinePeriodText : "Insufficient data",
      classification: isProcessed ? (peakQ && leanQ ? `Peak: ${peakQ} · Lean: ${leanQ}` : (productionSummary.classification || "Processed")) : "Not processed",
      peakQuarter: peakQ,
      leanQuarter: leanQ,
      quarterlyProfiles: profiles,
      grandAverageQuarterlyMt: grandAvg,
      basisInputs: {
        "Grand average quarterly production": formatMt(grandAvg),
        "Peak production quarter": peakText,
        "Lean production quarter": leanText,
        "Historical baseline period": isProcessed ? baselinePeriodText : "-",
        "Source areas": productionSummary?.source_areas?.length
          ? productionSummary.source_areas.map((area) => area.name).join(", ")
          : "No geographic source rows available",
        "Q1 ratio threshold": quartiles ? Number(quartiles.q1).toFixed(4) : "-",
        "Q2 ratio threshold": quartiles ? Number(quartiles.q2).toFixed(4) : "-",
        "Q3 ratio threshold": quartiles ? Number(quartiles.q3).toFixed(4) : "-"
      },
      thresholds: quartiles ? [
        { classification: "Low", rule: `Seasonal ratio < ${Number(quartiles.q1).toFixed(4)}` },
        { classification: "Lower Middle", rule: `Seasonal ratio ≥ ${Number(quartiles.q1).toFixed(4)} and < ${Number(quartiles.q2).toFixed(4)}` },
        { classification: "Upper Middle", rule: `Seasonal ratio ≥ ${Number(quartiles.q2).toFixed(4)} and < ${Number(quartiles.q3).toFixed(4)}` },
        { classification: "High", rule: `Seasonal ratio ≥ ${Number(quartiles.q3).toFixed(4)}` }
      ] : result.thresholds,
      productionVolumes: profiles.length > 0
        ? profiles.map((p) => ({ season: p.quarter, quarter: p.quarter, average_production_mt: p.average_production_mt, volume: p.average_production_mt, classification: p.classification, seasonal_ratio: p.seasonal_ratio }))
        : (productionSummary?.seasonal_totals || []),
      productionSources: productionSummary?.source_areas || [],
      records: (productionSummary?.records || []).map((record) => ({
        Year: record.reference_year,
        Quarter: record.reference_quarter,
        Commodity: selectedCommodity,
        Variety: selectedVariety,
        "Source Areas": "Aggregate production_record",
        "Production Volume": `${Number(record.volume_produced).toLocaleString()} MT`,
        Unit: "MT"
      })),
      resultExplanation: isProcessed
        ? `Long-term historical seasonal benchmark derived from ${recordCount} quarterly PSA production records${productionSummary?.years_covered ? ` (${productionSummary.years_covered})` : ""}. Peak production historically occurs in ${peakQ || "Q2"}${peakProfile ? ` (avg ${formatMt(peakProfile.average_production_mt)}, ${peakProfile.classification})` : ""}, while leanest production occurs in ${leanQ || "Q3"}${leanProfile ? ` (avg ${formatMt(leanProfile.average_production_mt)}, ${leanProfile.classification})` : ""}.`
        : (productionError || productionSummary?.message || (productionLoading ? "Loading historical production data…" : "No historical production data is available for this scope.")),
      basisMissing: isProcessed ? null : (productionError || productionSummary?.message || null)
    };
  }, [result, resultId, productionSummary, productionError, productionLoading, selectedCommodity, selectedVariety]);
  const priceResult = useMemo(() => {
    if (resultId !== "price-outlook") return null;
    const processed = priceOutlook?.status === "processed";
    const money = (value) => value == null ? "-/kg" : `₱${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}/kg`;
    return {
      ...result,
      basisSource: priceOutlookSourceLabel(priceOutlook?.source),
      inputPeriod: priceOutlook?.forecast_horizon_days ? `${priceOutlook.forecast_horizon_days} days` : `${priceOutlookHorizon} days`,
      classification: processed ? priceOutlook.classification : "Not processed",
      basisInputs: {
        "Recent average price": money(priceOutlook?.recent_average_price),
        "Lower forecast": money(priceOutlook?.lower_forecast),
        "Forecast midpoint": money(priceOutlook?.forecast_midpoint),
        "Upper forecast": money(priceOutlook?.upper_forecast),
        "Forecast price change": priceOutlook?.forecast_price_change_pct == null ? "-" : `${priceOutlook.forecast_price_change_pct > 0 ? "+" : ""}${Number(priceOutlook.forecast_price_change_pct).toFixed(2)}%`
      },
      forecastPoints: processed
        ? (priceOutlook.forecast_points || []).map((point) => ({
          date: point.forecast_date,
          [selectedVariety]: point.forecast_midpoint,
          [`${selectedVariety}__lo`]: point.lower_forecast,
          [`${selectedVariety}__hi`]: point.upper_forecast
        }))
        : [],
      varieties: [{ variety: selectedVariety }],
      resultExplanation: processed ? priceOutlook.explanation : (priceOutlookError || priceOutlook?.explanation || "Price Outlook could not be calculated for this forecast."),
      basisMissing: processed ? null : (priceOutlookError || priceOutlook?.explanation || null),
      records: (priceOutlook?.price_records || []).map((row) => ({
        Date: row.price_date ? formatForecastDate(row.price_date) : "-",
        Commodity: row.commodity_name || selectedCommodity,
        Variety: row.variety || selectedVariety,
        Market: row.market || "-",
        "Price Type": row.price_type || "-",
        Price: row.prevail_price != null ? `₱${Number(row.prevail_price).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "-",
        Source: priceOutlookSourceLabel(priceOutlook?.source)
      }))
    };
  }, [result, resultId, priceOutlook, priceOutlookError, selectedCommodity, selectedVariety]);

  const arrivalResult = useMemo(() => {
    if (resultId !== "arrival-pressure") return null;
    const processed = arrivalSummary?.status === "processed";
    const kg = (value) => value == null ? "-" : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
    const quartiles = arrivalSummary?.quartile_thresholds;

    return {
      ...result,
      outputId: selectedCommodityRecord?.id || result.outputId,
      basisSource: arrivalSummary?.source || "DFTC Arrival Volume",
      inputPeriod: processed
        ? `${arrivalSummary.record_count} record(s) · latest ${formatForecastDate(arrivalSummary.latest_arrival_date)}`
        : "-",
      processedAt: arrivalSummary?.processed_at
        ? new Date(arrivalSummary.processed_at).toLocaleString("en-US", { dateStyle: "medium" })
        : "-",
      classification: processed ? arrivalSummary.classification : "Not processed",
      basisInputs: {
        "Current DFTC arrival volume": processed ? kg(arrivalSummary.current_arrival_kg) : "-",
        "Q1 threshold": quartiles ? kg(quartiles.q1) : "-",
        "Q2 threshold": quartiles ? kg(quartiles.q2) : "-",
        "Q3 threshold": quartiles ? kg(quartiles.q3) : "-"
      },
      // The trend card buckets `arrivalSummary.records` through
      // `arrivalVolumeSeries`, so no pre-bucketed copy is kept here. The
      // source split it needs comes from the same records.
      records: (arrivalSummary?.records || []).map((row) => ({
        Date: row.arrival_date ? formatForecastDate(row.arrival_date) : "-",
        Commodity: row.commodity_name || selectedCommodity,
        Variety: row.variety || selectedVariety,
        "Arrival Volume": kg(row.volume_kg),
        "Farm Source": kg(row.farm_source_volume_kg),
        "Other Sources": kg(row.other_source_volume_kg),
        Source: row.source || "DFTC Arrival Volume"
      })),
      resultExplanation: processed
        ? `Arrival pressure is classified as ${arrivalSummary.classification} from ${arrivalSummary.record_count} DFTC arrival record(s) (latest ${formatForecastDate(arrivalSummary.latest_arrival_date)}), totalling ${kg(arrivalSummary.total_volume_kg)}.`
        : (arrivalError || arrivalSummary?.message || (arrivalLoading ? "Loading arrival volume data…" : "No arrival volume data is available for this scope.")),
      moduleWarnings: arrivalSummary?.warnings || [],
      basisMissing: processed ? null : (arrivalError || arrivalSummary?.message || null)
    };
  }, [result, resultId, arrivalSummary, arrivalError, arrivalLoading, selectedCommodity, selectedVariety, selectedCommodityRecord]);
  const weatherResult = useMemo(() => {
    if (resultId !== "weather-risk") return null;
    const analysis = buildWeatherRiskAnalysis({
      weatherForecast,
      weatherRules,
      commodityName: selectedCommodity,
      weatherError,
      weatherLoading,
      lang: "en",
    });

    return {
      ...result,
      outputId: selectedCommodityRecord?.id || "WR-001",
      ...analysis,
    };
  }, [result, resultId, weatherForecast, weatherRules, weatherError, weatherLoading, selectedCommodity, selectedVariety, selectedCommodityRecord]);

  const displayResult = resultId === "price-outlook"
    ? priceResult
    : resultId === "arrival-pressure"
      ? arrivalResult
      : resultId === "weather-risk"
        ? weatherResult
        : historicalResult;
  const displayThresholds = resultId === "historical-production" || resultId === "weather-risk"
    ? displayResult.thresholds
    : shownThresholds;

  const isWeatherRisk = result.module === "Weather Risk" || resultId === "weather-risk";

  const handleCommodityChange = (newCommodity) => {
    navigate(`/admin/modules/basis/${resultId}?commodity=${encodeURIComponent(newCommodity)}&variety=All%20Varieties`, { replace: true });
  };

  const handleVarietyChange = (newVariety) => {
    navigate(`/admin/modules/basis/${resultId}?commodity=${encodeURIComponent(selectedCommodity)}&variety=${encodeURIComponent(newVariety)}`, { replace: true });
  };

  // Empty Visual Data Structures with visible line and bars
  const priceForecastEmpty = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      date: `+${i + 1}d`,
      baseline: 50
    }));
  }, []);

  const arrivalGhostData = useMemo(() => {
    return [
      { label: "5 wks ago", placeholder: 5 },
      { label: "4 wks ago", placeholder: 5 },
      { label: "3 wks ago", placeholder: 5 },
      { label: "2 wks ago", placeholder: 5 },
      { label: "Last week", placeholder: 5 },
      { label: "This week", placeholder: 5 },
    ];
  }, []);

  const quarterlyGhostData = useMemo(() => {
    return [
      { quarter: "Q1", placeholder: 5 },
      { quarter: "Q2", placeholder: 5 },
      { quarter: "Q3", placeholder: 5 },
      { quarter: "Q4", placeholder: 5 },
    ];
  }, []);

  // Uniform styling for visualization cards
  const vizCardClass = "bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden p-4 sm:p-6 md:p-8 space-y-4 min-h-[460px] flex flex-col justify-between";

  return (
    <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 pb-24 md:pb-12 max-w-[1440px] mx-auto space-y-4 sm:space-y-6">
      {/* Header & Back button */}
      <div>
        <button
          onClick={() => navigate("/admin/modules")}
          className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-900)] transition-colors mb-1.5 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Analytical Modules
        </button>
        <h1 className="text-[20px] sm:text-[22px] font-bold text-[var(--hw-neutral-900)] tracking-tight">
          {result.module || "-"} Basis
        </h1>
      </div>

      {/* 1. Filter Card (Compact Height) */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-2.5 sm:p-3.5">
        <div className="grid grid-cols-2 gap-2 sm:gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-black mb-1">Commodity</label>
            <CustomCommodityDropdown
              value={selectedCommodity}
              options={commodities}
              onChange={handleCommodityChange}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-black mb-1">Variety</label>
            <CustomVarietyDropdown
              value={selectedVariety}
              options={availableVariants}
              onChange={handleVarietyChange}
            />
          </div>
        </div>
      </div>

      {/* 2. Baseline / Input Values (Full Width) */}
      {displayResult.basisInputs && Object.keys(displayResult.basisInputs).length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">
              {resultId === "historical-production" || result.module === "Historical Seasonal Production Level"
                ? "Historical Production Baseline"
                : "Input Values"}
            </p>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {Object.entries(displayResult.basisInputs).map(([key, val]) => (
              <div key={key} className="flex justify-between items-center gap-4 px-4 sm:px-6 py-2.5 sm:py-3.5 hover:bg-[var(--hw-neutral-50)]/60 transition-colors">
                <span className="text-[13px] text-[var(--hw-neutral-700)]">{key}</span>
                <span className="text-[13px] font-semibold text-[var(--hw-neutral-900)] text-right">{val || "-"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2b. Quarterly Seasonal Benchmark Table (Historical Seasonal Production Level only) */}
      {(resultId === "historical-production" || result.module === "Historical Seasonal Production Level") && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[var(--hw-neutral-100)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">
                Quarterly Seasonal Benchmark
              </p>
              <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
                Long-term quarterly distribution and seasonal index across historical PSA records
              </p>
            </div>
          </div>
          <div className="overflow-x-auto [scrollbar-width:thin] touch-pan-x">
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold text-[var(--hw-neutral-600)] whitespace-nowrap">Quarter</th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold text-[var(--hw-neutral-600)] whitespace-nowrap">Calendar Period</th>
                  <th className="px-4 sm:px-6 py-3 text-right font-semibold text-[var(--hw-neutral-600)] whitespace-nowrap">Average Production</th>
                  <th className="px-4 sm:px-6 py-3 text-right font-semibold text-[var(--hw-neutral-600)] whitespace-nowrap">Seasonal Ratio</th>
                  <th className="px-4 sm:px-6 py-3 text-center font-semibold text-[var(--hw-neutral-600)] whitespace-nowrap">Historical Level</th>
                  <th className="px-4 sm:px-6 py-3 text-right font-semibold text-[var(--hw-neutral-600)] whitespace-nowrap">Years of Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                {displayResult.quarterlyProfiles && displayResult.quarterlyProfiles.length > 0 ? (
                  displayResult.quarterlyProfiles.map((p) => {
                    const levelColor =
                      p.classification === "High"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : p.classification === "Upper Middle"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : p.classification === "Lower Middle"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200";
                    return (
                      <tr key={p.quarter} className="hover:bg-[var(--hw-neutral-50)] transition-colors">
                        <td className="px-4 sm:px-6 py-3.5 font-bold text-[var(--hw-neutral-900)] whitespace-nowrap">{p.quarter}</td>
                        <td className="px-4 sm:px-6 py-3.5 text-[var(--hw-neutral-600)] whitespace-nowrap">{p.calendar_period || p.period}</td>
                        <td className="px-4 sm:px-6 py-3.5 text-right font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">
                          {Number(p.average_production_mt).toLocaleString(undefined, { maximumFractionDigits: 2 })} MT
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right font-semibold text-[var(--hw-neutral-700)] whitespace-nowrap">
                          {Number(p.seasonal_ratio).toFixed(4)}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">
                          <span className="font-semibold text-black text-[13px]">
                            {p.classification}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right text-[var(--hw-neutral-600)] whitespace-nowrap">{p.years_available} yrs</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 sm:px-6 py-8 text-center text-[var(--hw-neutral-500)]">
                      No seasonal benchmark profiles available for this commodity.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Data Reliability (module-specific data sufficiency + warnings) */}
      {(result.reliability || (result.moduleWarnings || []).length > 0) && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Data Reliability</p>
            <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
              How far this module&apos;s source records can be trusted &mdash; sufficiency and timeliness, scored
              0.00&ndash;1.00.
            </p>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            <div className="flex justify-between items-center gap-4 px-4 sm:px-6 py-2.5 sm:py-3.5">
              <span className="text-[13px] text-black font-medium">Reliability</span>
              <span className="text-[13px] font-bold text-black">
                {result.reliability || "-"}
              </span>
            </div>
            {result.reliabilityFactor != null && (
              <div className="flex justify-between items-center gap-4 px-4 sm:px-6 py-2.5 sm:py-3.5">
                <span className="text-[13px] text-black font-medium">Reliability score</span>
                <span className="text-[13px] font-semibold text-black">
                  {Number(result.reliabilityFactor).toFixed(4)}
                </span>
              </div>
            )}
            {result.reliability && (
              <div className="px-4 sm:px-6 py-2.5 sm:py-3.5 space-y-2">
                <p className="text-[13px] text-black font-medium">Explanation</p>
                <p className="text-[13px] text-black leading-relaxed">
                  {buildReliabilitySummary({
                    resultId,
                    level: result.reliability,
                    evidence: result.reliabilityEvidence,
                    rules: result.reliabilityRules
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => setShowReliabilityBands(true)}
                  className="text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline cursor-pointer"
                >
                  View explanation
                </button>
              </div>
            )}
            {(result.moduleWarnings || []).map((w, i) => (
              <div key={i} className="flex items-start gap-2.5 px-4 sm:px-6 py-2.5 sm:py-3.5">
                <AlertTriangle className="w-4 h-4 text-[var(--hw-warning)] flex-shrink-0 mt-0.5" />
                <span className="text-[12px] text-[var(--hw-neutral-700)] leading-relaxed">{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Visualizations (Single Column, Full Width, Visible Line & Bar Frames with Zero/Empty State) */}
      <div className="space-y-6">
        {/* Forecast Price Trend Chart (Price Outlook) */}
        {(result.module === "Price Outlook" || resultId === "price-outlook") && (
          <div className={vizCardClass}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--hw-neutral-100)]">
              <div>
                <p className="text-[13px] font-bold text-black uppercase tracking-wide">Forecast Price Trend</p>
                <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">{priceOutlookHorizon}-day price outlook for {selectedCommodity !== "-" ? selectedCommodity : "selected crop"}.</p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <label className="text-[11px] sm:text-[12px] font-semibold text-black whitespace-nowrap">Forecast Horizon</label>
                <div className="w-28 sm:w-32">
                  <CustomSimpleDropdown
                    value={`${priceOutlookHorizon} days`}
                    options={["7 days", "14 days", "21 days", "28 days"]}
                    onChange={(val) => setPriceOutlookHorizon(parseInt(val, 10))}
                  />
                </div>
              </div>
            </div>
            {displayResult.forecastPoints && displayResult.forecastPoints.length > 0 ? (
              <ForecastPriceTrendChart commodity={selectedCommodity} chartData={displayResult.forecastPoints} varieties={displayResult.varieties || []} height={360} />
            ) : (
              <div className="w-full flex-1 flex flex-col justify-center">
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart data={priceForecastEmpty} margin={{ top: 16, right: 20, bottom: 8, left: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₱${v}`} width={55} />
                    <Line type="monotone" dataKey="baseline" stroke="#93c5fd" strokeDasharray="4 4" strokeWidth={2.5} dot={{ r: 4, fill: "white", stroke: "#60a5fa", strokeWidth: 2 }} connectNulls={true} />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center -mt-[190px] mb-[150px] pointer-events-none">
                  <span className="text-[13px] text-[var(--hw-neutral-600)] font-medium bg-white/90 px-4 py-1.5 rounded-lg shadow-sm border border-[var(--hw-neutral-200)]">
                    No trend data available.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Arrival Pressure Visualizations */}
        {(result.module === "Arrival Pressure" || resultId === "arrival-pressure") && (
          <>
            <div className={vizCardClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wide">
                    Arrival Volume Trend
                  </p>
                  <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">{arrivalSubtitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <SegmentedControl
                    value={arrivalSource}
                    onChange={setArrivalSource}
                    options={ARRIVAL_SOURCE_OPTIONS}
                  />
                  <SegmentedControl
                    value={arrivalGranularity}
                    onChange={setArrivalGranularity}
                    options={ARRIVAL_GRANULARITY_OPTIONS}
                  />
                  {arrivalYears.length > 0 && (arrivalGranularity === "monthly" || arrivalGranularity === "weekly") && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[var(--hw-neutral-200)]">
                      <Calendar className="w-3.5 h-3.5 text-[var(--hw-green-700)]" />
                      <select
                        value={arrivalActiveYear ?? ""}
                        onChange={(e) => setArrivalYear(parseInt(e.target.value, 10))}
                        aria-label="Arrival year"
                        className="text-[12px] font-semibold text-[var(--hw-neutral-800)] bg-transparent outline-none cursor-pointer"
                      >
                        {arrivalYears.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-[var(--hw-neutral-500)]" />
                    </div>
                  )}
                </div>
              </div>

              {arrivalHasData ? (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart
                    data={arrivalChartData}
                    margin={{ top: 16, right: 20, left: 0, bottom: 8 }}
                    barCategoryGap="32%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#4b5563", fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => Number(v).toLocaleString()}
                      width={62}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "rgba(0,0,0,0.03)" }}
                      content={
                        <ArrivalTrendTooltip
                          sourceLabel={arrivalSourceOption.label}
                          sourceValueFor={arrivalSourceValueFor}
                        />
                      }
                    />
                    <Bar
                      dataKey={arrivalBarKey}
                      name={arrivalSourceOption.label}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={44}
                      fill={NO_QUARTILE_BAR_COLOR}
                    >
                      {arrivalChartData.map((entry) => (
                        <Cell
                          key={`bar-${entry.key}`}
                          fill={entry.total_kg > 0 ? classificationColor(entry.classification) : "transparent"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full flex-1 flex flex-col justify-center">
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={arrivalGhostData} margin={{ top: 16, right: 20, left: 0, bottom: 8 }} barSize={60}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#4b5563", fontWeight: 500 }} tickLine={false} axisLine={false} />
                      <YAxis hide domain={[0, 10]} />
                      <Bar dataKey="placeholder" radius={[6, 6, 0, 0]} fill="#e2e8f0" stroke="#cbd5e1" strokeDasharray="3 3" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center -mt-[190px] mb-[150px] pointer-events-none">
                    <span className="text-[13px] text-[var(--hw-neutral-600)] font-medium bg-white/90 px-4 py-1.5 rounded-lg shadow-sm border border-[var(--hw-neutral-200)]">
                      {arrivalLoading
                        ? "Loading arrival volume…"
                        : arrivalError || "No arrival volume records for this scope."}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className={vizCardClass}>
              <div>
                <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wide">
                  Arrival Volume Sources Distribution
                </p>
                <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
                  Farm Source vs Other Sources{arrivalActiveYear ? ` · ${arrivalActiveYear}` : ""} · kilograms
                </p>
              </div>
              <ArrivalSourcePieChart
                showEmpty={!arrivalSourcePieData.length}
                data={arrivalSourcePieData}
                height={340}
              />
            </div>
          </>
        )}

        {/* Historical Production Visualizations */}
        {(result.module === "Historical Seasonal Production Level" || resultId === "historical-production") && (
          <>
            {/* Typical Quarterly Production Volume Bar Chart */}
            <div className={vizCardClass}>
              <div>
                <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wide">Typical Quarterly Production Volume</p>
                <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">PSA Data · Q1–Q4</p>
              </div>
              <div className="w-full flex-1 flex flex-col justify-center">
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={displayResult.productionVolumes?.length ? displayResult.productionVolumes.map((row) => ({ quarter: row.quarter || row.season, volume: row.average_production_mt || 0, level: row.classification })) : quarterlyGhostData} margin={{ top: 16, right: 20, left: 0, bottom: 8 }} barSize={72}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="quarter" tick={{ fontSize: 13, fill: "#4b5563", fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <YAxis hide domain={[0, "auto"]} />
                    {displayResult.productionVolumes?.length > 0 && (
                      <RechartsTooltip
                        formatter={(val, _name, props) => [
                          `${Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })} MT${props.payload?.level ? ` (${props.payload.level})` : ""}`,
                          "Avg Production"
                        ]}
                      />
                    )}
                    <Bar dataKey={displayResult.productionVolumes?.length ? "volume" : "placeholder"} radius={[6, 6, 0, 0]} fill="#2f7d32" stroke="#cbd5e1" strokeDasharray={displayResult.productionVolumes?.length ? undefined : "3 3"}>
                      {displayResult.productionVolumes?.length > 0 && displayResult.productionVolumes.map((entry, index) => {
                        const barColor =
                          entry.classification === "High" ? "#dc2626" :
                            entry.classification === "Upper Middle" ? "#d97706" :
                              entry.classification === "Lower Middle" ? "#2563eb" :
                                "#16a34a";
                        return <Cell key={`cell-${index}`} fill={barColor} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {!displayResult.productionVolumes?.length && <div className="flex items-center justify-center -mt-[190px] mb-[150px] pointer-events-none">
                  <span className="text-[13px] text-[var(--hw-neutral-600)] font-medium bg-white/90 px-4 py-1.5 rounded-lg shadow-sm border border-[var(--hw-neutral-200)]">
                    No production data available.
                  </span>
                </div>}
              </div>
            </div>

            {/* Production Sources Pie Chart (Enlarged) */}
            <div className={vizCardClass}>
              <div>
                <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wide">Production Sources Distribution</p>
                <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">Historical production volume share across major supplying areas (Davao City, Davao Del Sur, Bukidnon).</p>
              </div>
              <ProductionSourcePieChart showEmpty={!displayResult.productionSources || displayResult.productionSources.length === 0} data={displayResult.productionSources} height={380} />
            </div>
          </>
        )}

        {/* Weather Risk Outlook */}
        {isWeatherRisk && (
          <WeatherForecastOutlook
            title="14-Day Weather Forecast Outlook"
            subtitle={`Estimated weather parameters and risks for ${selectedCommodity !== "-" ? selectedCommodity : "selected crop"}.`}
            forecast={displayResult.forecast_14d || []}
            showSuitability={true}
            commodityName={selectedCommodity !== "-" ? selectedCommodity : "Ampalaya"}
            emptyMessage="No weather data available."
            showScrollbar
            showForecastTable
          />
        )}
      </div>

      {/* 4. Datasets Used Table (Full Width) — Weather Risk basis excluded */}
      {!isWeatherRisk && (
        <DatasetsUsed
          module={displayResult.module}
          records={displayResult.records}
        />
      )}

      {/* 5. Weather Threshold — Top 10 Commodities (Weather Risk only) */}
      {isWeatherRisk && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Weather Threshold · Top 10 Commodities</p>
            <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
              Crop-specific weather classification thresholds for the Top 10 monitored commodities.
            </p>
          </div>

          <div className="overflow-x-auto [scrollbar-width:thin] touch-pan-x">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]/60">
                  <th className="py-3 px-4 sm:px-6 text-[12px] font-semibold text-black uppercase tracking-wide">Commodity</th>
                  <th className="py-3 px-4 sm:px-6 text-[12px] font-semibold text-emerald-700 uppercase tracking-wide">Suitable</th>
                  <th className="py-3 px-4 sm:px-6 text-[12px] font-semibold text-amber-700 uppercase tracking-wide">Caution</th>
                  <th className="py-3 px-4 sm:px-6 text-[12px] font-semibold text-rose-700 uppercase tracking-wide">Severe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                {weatherThresholdsRows.map((row) => (
                  <tr key={row.commodity}>
                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <CommodityIllustration
                          commodityId={getCommodityIconKey(null, null, row.commodity)}
                          className="w-5 h-5 flex-shrink-0"
                        />
                        <span className="text-[14px] font-semibold text-black">{row.commodity}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-[13px] text-[var(--hw-neutral-800)] font-medium min-w-[180px] sm:min-w-[200px]">
                      {row.suitable}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-[13px] text-[var(--hw-neutral-800)] font-medium min-w-[180px] sm:min-w-[200px]">
                      {row.caution}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-[13px] text-[var(--hw-neutral-800)] font-medium min-w-[180px] sm:min-w-[200px]">
                      {row.severe}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Threshold Applied & Result Explanation */}
      {isWeatherRisk ? (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Result Explanation</p>
          </div>
          <div className="p-4 sm:p-6">
            {displayResult.resultExplanation && displayResult.resultExplanation !== "No explanation available." ? (
              <p className="text-[14px] font-medium text-[var(--hw-neutral-800)] leading-relaxed">
                {displayResult.resultExplanation}
              </p>
            ) : (
              <div className="py-4 space-y-1.5 max-w-sm mx-auto text-center">
                <div className="w-10 h-10 rounded-2xl bg-[var(--hw-neutral-100)] border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-500)] flex items-center justify-center mx-auto mb-2">
                  <Info className="w-5 h-5" />
                </div>
                <p className="text-[14px] font-semibold text-[var(--hw-neutral-800)]">No Explanation Available</p>
                <p className="text-[12px] text-[var(--hw-neutral-500)] leading-relaxed">
                  No analytical explanation generated for the selected scope.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Threshold Applied Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden h-full flex flex-col justify-between">
            <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[var(--hw-neutral-100)]">
              <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Threshold Applied</p>
            </div>
            {thresholdsError && (
              <div className="px-4 sm:px-6 py-2.5 text-[12px] text-red-600 border-b border-[var(--hw-neutral-100)]">{thresholdsError}</div>
            )}
            <div className="divide-y divide-[var(--hw-neutral-100)] flex-1 flex flex-col justify-around">
              {displayThresholds && displayThresholds.length > 0 ? (
                displayThresholds.map((t) => {
                  const tc = CLASSIFICATION_COLORS[t.classification] ?? "text-[var(--hw-neutral-700)]";
                  return (
                    <div key={t.classification} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-2.5 sm:py-3.5 hover:bg-[var(--hw-neutral-50)]/60 transition-colors">
                      <span className={`text-[13px] font-bold flex-shrink-0 min-w-[95px] ${tc}`}>{t.classification}</span>
                      <span className="text-[13px] text-[var(--hw-neutral-800)] font-medium">{t.rule}</span>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 sm:px-6 py-5 text-[13px] text-[var(--hw-neutral-500)]">
                  Threshold information unavailable.
                </div>
              )}
            </div>
          </div>

          {/* Result Explanation Card (Concise Empty State) */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden h-full flex flex-col justify-between">
            <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[var(--hw-neutral-100)]">
              <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Result Explanation</p>
            </div>
            <div className="p-4 sm:p-6 flex-1 flex flex-col items-center justify-center text-center">
              {displayResult.resultExplanation && displayResult.resultExplanation !== "No explanation available." ? (
                <p className="text-[14px] font-medium text-[var(--hw-neutral-800)] leading-relaxed text-left w-full">
                  {displayResult.resultExplanation}
                </p>
              ) : (
                <div className="py-4 space-y-1.5 max-w-sm mx-auto">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--hw-neutral-100)] border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-500)] flex items-center justify-center mx-auto mb-2">
                    <Info className="w-5 h-5" />
                  </div>
                  <p className="text-[14px] font-semibold text-[var(--hw-neutral-800)]">No Explanation Available</p>
                  <p className="text-[12px] text-[var(--hw-neutral-500)] leading-relaxed">
                    No analytical explanation generated for the selected scope.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Historical Average Price Section (Only on Price Outlook Basis, below Result Explanation) */}
      {(resultId === "price-outlook" || result.module === "Price Outlook") && (
        <HistoricalAveragePriceSection
          commodityId={selectedCommodityRecord?.id || detail?.commodity_id || null}
          commodityName={selectedCommodity}
          variety={selectedVariety && selectedVariety !== "All Varieties" && selectedVariety !== "All" ? selectedVariety : null}
          market="Bankerohan"
          priceType="Retail"
          priceTypeKey="bangkerohan_retail"
        />
      )}

      {/* Missing data warning */}
      {displayResult.basisMissing && (
        <div className="flex items-start gap-3 border border-amber-200 bg-amber-50/60 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-amber-800 leading-relaxed font-medium">{displayResult.basisMissing}</p>
        </div>
      )}

      {showReliabilityBands && (
        <ReliabilityExplanationModal
          resultId={resultId}
          level={result.reliability}
          factor={result.reliabilityFactor}
          bands={(result.reliabilityBands || []).length > 0 ? result.reliabilityBands : FALLBACK_RELIABILITY_BANDS}
          dimensions={result.reliabilityDimensions}
          evidence={result.reliabilityEvidence}
          rules={result.reliabilityRules}
          onClose={() => setShowReliabilityBands(false)}
        />
      )}
    </div>
  );
}

export { AdminAnalyticsBasis as default };
