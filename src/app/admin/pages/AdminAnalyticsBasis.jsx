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
import { getVariants } from "../../global/data/commodities";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, ChevronDown, AlertTriangle, Info } from "lucide-react";
import { CommodityIllustration, getCommodityIconKey } from "../../global/components/shared/CommodityIllustrations";
import { CLASSIFICATION_COLORS } from "../components/analytics/adminAnalyticsMockData";
import { ProductionSourcePieChart } from "../../global/components/shared/ProductionSourcePieChart";
import { ArrivalSourcePieChart } from "../../global/components/shared/ArrivalSourcePieChart";
import { WeatherForecastOutlook } from "../../global/components/shared/WeatherForecastOutlook";
import { analyticsApi } from "../../../services/api";
import { useHistoricalSeasonalProduction, usePriceOutlook } from "../../../hooks/useAnalyticsOutputs";

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

const TOP_10_WEATHER_THRESHOLDS = [
  {
    commodity: "Ampalaya",
    suitable: "Temp 22–30°C; RH≥90% < 3h; Wind ≤ 18 km/h",
    caution: "Temp 5–22°C or 30–39°C; RH≥90% 3–5h; Wind 18–28.8 km/h",
    severe: "Temp ≤ 5°C or ≥ 39°C; RH≥90% ≥ 6h; Wind > 28.8 km/h",
  },
  {
    commodity: "Atsal",
    suitable: "Temp 17–30°C; RH>85% < 3h; Wind < 21.6 km/h",
    caution: "Temp 0–17°C or 30–42°C; RH>85% 3–5h; Wind 21.6–28.8 km/h",
    severe: "Temp ≤ 0°C or ≥ 42°C; RH>85% ≥ 6h; Wind ≥ 28.8 km/h",
  },
  {
    commodity: "Carrots",
    suitable: "Temp 15–21°C",
    caution: "Temp -1.2–15°C or 21–35°C",
    severe: "Temp ≤ -1.2°C or ≥ 35°C",
  },
  {
    commodity: "Chinese Pechay",
    suitable: "Temp 13–20°C; RH>90% < 6h; Wind < 18 km/h",
    caution: "Temp -0.6–13°C or 20–25°C; RH>90% 6–11h; Wind 18–54 km/h",
    severe: "Temp ≤ -0.6°C or ≥ 25°C; RH>90% ≥ 12h; Wind ≥ 54 km/h",
  },
  {
    commodity: "Kalabasa",
    suitable: "Temp 18–30°C; RH≥90% < 3h",
    caution: "Temp 0–18°C or 30–35°C; RH≥90% 3–5h",
    severe: "Temp ≤ 0°C or ≥ 35°C; RH≥90% ≥ 6h",
  },
  {
    commodity: "Kamatis",
    suitable: "Temp 21–24°C; Max RH < 85%; Wind ≤ 39.6 km/h",
    caution: "Temp 0–21°C or 24–40°C; Max RH 85–90%; Wind 39.6–54 km/h",
    severe: "Temp ≤ 0°C or ≥ 40°C; Max RH > 90%; Wind > 54 km/h",
  },
  {
    commodity: "Lettuce",
    suitable: "Temp 18–22°C; RH≥95% < 5h; Wind < 18 km/h",
    caution: "Temp 0–18°C or 22–33°C; RH≥95% 5–6h; Wind 18–54 km/h",
    severe: "Temp < 0°C or ≥ 33°C; RH≥95% ≥ 7h; Wind ≥ 54 km/h",
  },
  {
    commodity: "Pipino",
    suitable: "Temp 18–30°C; RH≥90% < 3h; Wind < 21.6 km/h",
    caution: "Temp 0–18°C or 30–38°C; RH≥90% 3–5h; Wind 21.6–32.4 km/h",
    severe: "Temp ≤ 0°C or ≥ 38°C; RH≥90% ≥ 6h; Wind ≥ 32.4 km/h",
  },
  {
    commodity: "Repolyo",
    suitable: "Temp 15–20°C; RH>90% < 6h",
    caution: "Temp -7–15°C or 20–30°C; RH>90% 6–11h",
    severe: "Temp ≤ -7°C or ≥ 30°C; RH>90% ≥ 12h",
  },
  {
    commodity: "Talong",
    suitable: "Temp 21–30°C; Max RH < 86%",
    caution: "Temp 0–21°C or 30–35°C; Max RH 86–92%",
    severe: "Temp ≤ 0°C or ≥ 35°C; Max RH > 92%",
  },
];

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
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left transition-colors cursor-pointer ${
                  isSelected ? "bg-[var(--hw-green-50)] font-semibold text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
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
            className={`w-full flex items-center px-3.5 py-2.5 text-[13px] text-left transition-colors cursor-pointer ${
              selectedVariety === "All Varieties" ? "bg-[var(--hw-green-50)] font-semibold text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
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
                className={`w-full flex items-center px-3.5 py-2.5 text-[13px] text-left transition-colors cursor-pointer ${
                  isSelected ? "bg-[var(--hw-green-50)] font-semibold text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
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
    const cols = ["Week Ending", "Commodity", "Variety", "Arrival Volume", "Unit", "Source"];
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
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      <button
        onClick={() => {
          setExpanded((v) => !v);
          setPage(1);
        }}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 hover:bg-[var(--hw-neutral-50)] transition-colors text-left cursor-pointer"
      >
        <div>
          <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Datasets Used</p>
          {!expanded && <p className="text-[12px] text-[var(--hw-neutral-600)] mt-0.5">View source records used for this result.</p>}
        </div>
        <ChevronDown className={`w-4 h-4 text-[var(--hw-neutral-700)] flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <>
          <div className="border-t border-[var(--hw-neutral-100)] overflow-x-auto">
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
            <div className="flex items-center justify-between gap-4 px-6 py-3.5 border-t border-[var(--hw-neutral-100)]">
              <p className="text-[12px] text-[var(--hw-neutral-600)]">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length} records
              </p>
              <div className="flex items-center gap-1">
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
                    className={`px-3 py-1.5 text-[12px] border rounded-lg transition-colors ${
                      p === page ? "border-[var(--hw-green-600)] bg-[var(--hw-green-700)] text-white" : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
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
        const [forecastData, rulesData] = await Promise.all([
          analyticsApi.getWeatherForecast(14),
          selectedCommodityRecord?.id
            ? analyticsApi.listWeatherRules(selectedCommodityRecord.id)
            : Promise.resolve({ items: [] })
        ]);
        if (!active) return;
        setWeatherForecast(forecastData);
        setWeatherRules(rulesData?.items || []);
      } catch (err) {
        if (active) setWeatherError(err.message || "Unable to load weather forecast.");
      } finally {
        if (active) setWeatherLoading(false);
      }
    }
    loadWeatherData();
    return () => { active = false; };
  }, [resultId, selectedCommodityRecord?.id]);

  const { data: productionSummary, loading: productionLoading, error: productionError } = useHistoricalSeasonalProduction(
    resultId === "historical-production" && !!selectedCommodityRecord?.id,
    selectedCommodityRecord?.id
  );

  const { data: priceOutlook, error: priceOutlookError } = usePriceOutlook(
    resultId === "price-outlook" && !!selectedCommodity && !!selectedVariety,
    selectedCommodity,
    selectedVariety
  );

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
      basisSource: priceOutlook?.source || "-",
      inputPeriod: priceOutlook?.forecast_horizon_days ? `${priceOutlook.forecast_horizon_days} days` : "-",
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
      records: []
    };
  }, [result, resultId, priceOutlook, priceOutlookError]);
  const weatherResult = useMemo(() => {
    if (resultId !== "weather-risk") return null;
    const isProcessed = weatherForecast?.status === "ok" && Array.isArray(weatherForecast?.days) && weatherForecast.days.length > 0;
    const days = isProcessed ? weatherForecast.days : [];

    const tempRangeRule = weatherRules.find((r) => r.metric_key === "temp_range" && r.risk_level === "suitable");
    const tempMinCaution = weatherRules.find((r) => r.metric_key === "temp_min" && r.risk_level === "caution");
    const tempMaxCaution = weatherRules.find((r) => r.metric_key === "temp_max" && r.risk_level === "caution");
    const tempMinSevere = weatherRules.find((r) => r.metric_key === "temp_min" && r.risk_level === "severe");
    const tempMaxSevere = weatherRules.find((r) => r.metric_key === "temp_max" && r.risk_level === "severe");
    const windSevere = weatherRules.find((r) => r.metric_key === "wind_speed_max" && r.risk_level === "severe");
    const rainRule = weatherRules.find((r) => r.metric_key.includes("rain"));

    const suitTempMin = tempRangeRule?.threshold_min != null ? Number(tempRangeRule.threshold_min) : 20;
    const suitTempMax = tempRangeRule?.threshold_max != null ? Number(tempRangeRule.threshold_max) : 30;
    const suitRainMax = rainRule?.threshold_max != null ? Number(rainRule.threshold_max) : 15;
    const cautRainMin = 15;
    const sevRainMin = 30;
    const sevTempMax = tempMaxSevere?.threshold_min != null ? Number(tempMaxSevere.threshold_min) : 35;
    const sevTempMin = tempMinSevere?.threshold_max != null ? Number(tempMinSevere.threshold_max) : 5;
    const sevWind = windSevere?.threshold_min != null ? Number(windSevere.threshold_min) : 28.8;

    let avgMin = 0;
    let avgMax = 0;
    let avgRain = 0;
    let avgHum = 0;
    let avgProb = 0;
    let maxWindVal = 0;
    let severeCount = 0;
    let cautionCount = 0;

    if (days.length > 0) {
      days.forEach((d) => {
        avgMin += d.temp_min ?? 0;
        avgMax += d.temp_max ?? 0;
        avgRain += d.rainfall_mm ?? 0;
        avgHum += d.humidity_pct ?? 0;
        avgProb += d.rain_probability_pct ?? 0;
        if ((d.wind_speed_max_kmh ?? 0) > maxWindVal) maxWindVal = d.wind_speed_max_kmh ?? 0;

        const isSevere =
          (d.rainfall_mm ?? 0) >= sevRainMin ||
          (d.temp_max ?? 0) >= sevTempMax ||
          (d.temp_min ?? 0) <= sevTempMin ||
          (d.wind_speed_max_kmh ?? 0) > sevWind;
        const isCaution =
          (d.rainfall_mm ?? 0) >= cautRainMin ||
          (d.temp_max ?? 0) > suitTempMax ||
          (d.temp_min ?? 0) < suitTempMin ||
          (d.humidity_pct ?? 0) >= 90;

        if (isSevere) severeCount++;
        else if (isCaution) cautionCount++;
      });
      avgMin /= days.length;
      avgMax /= days.length;
      avgRain /= days.length;
      avgHum /= days.length;
      avgProb /= days.length;
    }

    const overallClass = severeCount >= 2 ? "Severe" : cautionCount > 0 || severeCount > 0 ? "Caution" : "Suitable";

    const firstDate = days[0]?.date
      ? new Date(days[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "Today";
    const lastDate = days[days.length - 1]?.date
      ? new Date(days[days.length - 1].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "+14d";

    const forecast14d = days.map((day) => {
      const dateObj = new Date(day.date);
      const dateStr = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : day.date;
      return {
        dayLabel: day.day_label,
        date: dateStr,
        tempMax: day.temp_max != null ? Math.round(day.temp_max) : null,
        tempMin: day.temp_min != null ? Math.round(day.temp_min) : null,
        rainPct: day.rain_probability_pct != null
          ? Math.round(day.rain_probability_pct)
          : (day.rainfall_mm > 0 ? Math.min(Math.round(day.rainfall_mm * 5), 100) : 0),
        rainfallMm: day.rainfall_mm,
        humidity: day.humidity_pct,
        windSpeed: day.wind_speed_max_kmh,
        weatherCondition: day.weather_condition
      };
    });

    const explanation = isProcessed
      ? `14-day weather forecast indicates an average temperature range of ${avgMin.toFixed(1)}°C–${avgMax.toFixed(1)}°C with ${avgRain.toFixed(1)} mm/day average rainfall. ${
          avgMin >= suitTempMin && avgMax <= suitTempMax
            ? `${selectedCommodity} is within its optimal thermal range (${suitTempMin}–${suitTempMax}°C).`
            : `Temperatures fluctuate slightly outside optimal bounds.`
        } ${
          cautionCount > 0 || severeCount > 0
            ? `Elevated humidity or rainfall detected on ${cautionCount + severeCount} forecast days; monitor bed drainage and disease pressure.`
            : `Favorable meteorological conditions expected throughout the forecast window.`
        }`
      : weatherError || (weatherLoading ? "Loading weather forecast data…" : "No weather forecast data is available for this scope.");

    return {
      ...result,
      outputId: selectedCommodityRecord?.id || "WR-001",
      basisSource: "Open-Meteo 14-day Forecast",
      inputPeriod: isProcessed ? `${days.length} days (${firstDate} – ${lastDate})` : "14 days",
      processedAt: weatherForecast?.fetched_at ? new Date(weatherForecast.fetched_at).toLocaleString() : new Date().toLocaleDateString(),
      classification: isProcessed ? overallClass : "Not processed",
      basisInputs: {
        Location: "Davao City & Production Areas",
        "Forecast period": isProcessed ? `${days.length} days (${firstDate} – ${lastDate})` : "14 days",
        "Average rainfall": isProcessed ? `${avgRain.toFixed(1)} mm/day` : "- mm/day",
        "Average rain probability": isProcessed ? `${Math.round(avgProb)}%` : "-%",
        "Temperature Range": isProcessed ? `${avgMin.toFixed(1)}°C – ${avgMax.toFixed(1)}°C` : "-°C",
        Humidity: isProcessed ? `${avgHum.toFixed(1)}%` : "-%",
        "Crop threshold": `Suitable: ${suitTempMin}–${suitTempMax}°C, <${suitRainMax} mm/day`
      },
      thresholds: [
        {
          classification: "Suitable",
          rule: `Rainfall < ${suitRainMax} mm/day; temp ${suitTempMin}–${suitTempMax}°C`
        },
        {
          classification: "Caution",
          rule: `Rainfall ${suitRainMax}–${sevRainMin} mm/day; temp ${suitTempMax}–${sevTempMax}°C`
        },
        {
          classification: "Severe",
          rule: `Rainfall > ${sevRainMin} mm/day; temp > ${sevTempMax}°C or < ${sevTempMin}°C; wind > ${sevWind} km/h`
        }
      ],
      forecast_14d: forecast14d,
      records: days.map((day) => ({
        Date: day.date,
        Location: "Davao City Region",
        Rainfall: day.rainfall_mm != null ? `${day.rainfall_mm} mm` : "-",
        "Temperature Range": `${day.temp_min != null ? day.temp_min : "-"}°C – ${day.temp_max != null ? day.temp_max : "-"}°C`,
        Humidity: day.humidity_pct != null ? `${day.humidity_pct}%` : "-",
        Wind: day.wind_speed_max_kmh != null ? `${day.wind_speed_max_kmh} km/h` : "-",
        Source: "Open-Meteo"
      })),
      resultExplanation: explanation,
      basisMissing: isProcessed ? null : (weatherError || null)
    };
  }, [result, resultId, weatherForecast, weatherRules, weatherError, weatherLoading, selectedCommodity, selectedVariety, selectedCommodityRecord]);

  const displayResult = resultId === "price-outlook"
    ? priceResult
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
  const vizCardClass = "bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden p-6 md:p-8 space-y-4 min-h-[460px] flex flex-col justify-between";

  return (
    <div className="px-4 md:px-8 lg:px-10 py-6 pb-24 md:pb-12 max-w-[1440px] mx-auto space-y-6">
      {/* Header & Back button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <button
            onClick={() => navigate("/admin/modules")}
            className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-900)] transition-colors mb-3 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Analytical Modules
          </button>
          <h1 className="text-[22px] font-bold text-[var(--hw-neutral-900)] tracking-tight">
            {result.module || "-"} Basis
          </h1>
        </div>
        {(resultId === "historical-production" || result.module === "Historical Seasonal Production Level") && displayResult.peakQuarter && (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] font-semibold flex items-center gap-1.5 shadow-[var(--shadow-xs)]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Peak: {displayResult.peakQuarter}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[12px] font-semibold flex items-center gap-1.5 shadow-[var(--shadow-xs)]">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Lean: {displayResult.leanQuarter}
            </span>
          </div>
        )}
      </div>

      {/* 1. Filter Card (Ultra-Compact Height, Styled Farmer Dropdowns with Icons, No Header Bar) */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--hw-neutral-600)] mb-1">Commodity</label>
            <CustomCommodityDropdown
              value={selectedCommodity}
              options={commodities}
              onChange={handleCommodityChange}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--hw-neutral-600)] mb-1">Variety</label>
            <CustomVarietyDropdown
              value={selectedVariety}
              options={availableVariants}
              onChange={handleVarietyChange}
            />
          </div>
        </div>

        {/* Compact Metadata Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-[var(--hw-neutral-100)] text-[11px]">
          <div>
            <span className="text-[var(--hw-neutral-400)] font-medium">ID:</span> <span className="font-semibold text-[var(--hw-neutral-800)] font-mono">{displayResult.outputId || "-"}</span>
          </div>
          <div>
            <span className="text-[var(--hw-neutral-400)] font-medium">Module:</span> <span className="font-semibold text-[var(--hw-neutral-800)]">{result.module || "-"}</span>
          </div>
          <div>
            <span className="text-[var(--hw-neutral-400)] font-medium">Data Source:</span> <span className="font-semibold text-[var(--hw-neutral-800)]" title={displayResult.basisSource}>{displayResult.basisSource || "-"}</span>
          </div>
          <div>
            <span className="text-[var(--hw-neutral-400)] font-medium">
              {resultId === "historical-production" || result.module === "Historical Seasonal Production Level" ? "Historical Baseline:" : "Input Period:"}
            </span>{" "}
            <span className="font-semibold text-[var(--hw-neutral-800)]">{displayResult.inputPeriod || "-"}</span>
          </div>
        </div>
      </div>

      {/* 2. Baseline / Input Values (Full Width) */}
      {displayResult.basisInputs && Object.keys(displayResult.basisInputs).length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">
              {resultId === "historical-production" || result.module === "Historical Seasonal Production Level"
                ? "Historical Production Baseline"
                : "Input Values"}
            </p>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {Object.entries(displayResult.basisInputs).map(([key, val]) => (
              <div key={key} className="flex justify-between items-center gap-4 px-6 py-3.5 hover:bg-[var(--hw-neutral-50)]/60 transition-colors">
                <span className="text-[13px] text-[var(--hw-neutral-700)]">{key}</span>
                <span className="text-[13px] font-semibold text-[var(--hw-neutral-900)] text-right">{val || "-"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2b. Quarterly Seasonal Benchmark Table (Historical Seasonal Production Level only) */}
      {(resultId === "historical-production" || result.module === "Historical Seasonal Production Level") && (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--hw-neutral-100)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">
                Quarterly Seasonal Benchmark
              </p>
              <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
                Long-term quarterly distribution and seasonal index across historical PSA records
              </p>
            </div>
            {displayResult.peakQuarter && (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Peak: {displayResult.peakQuarter}
                </span>
                <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Lean: {displayResult.leanQuarter}
                </span>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-[var(--hw-neutral-600)]">Quarter</th>
                  <th className="px-6 py-3 text-left font-semibold text-[var(--hw-neutral-600)]">Calendar Period</th>
                  <th className="px-6 py-3 text-right font-semibold text-[var(--hw-neutral-600)]">Average Production</th>
                  <th className="px-6 py-3 text-right font-semibold text-[var(--hw-neutral-600)]">Seasonal Ratio</th>
                  <th className="px-6 py-3 text-center font-semibold text-[var(--hw-neutral-600)]">Historical Level</th>
                  <th className="px-6 py-3 text-right font-semibold text-[var(--hw-neutral-600)]">Years of Data</th>
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
                        <td className="px-6 py-3.5 font-bold text-[var(--hw-neutral-900)]">{p.quarter}</td>
                        <td className="px-6 py-3.5 text-[var(--hw-neutral-600)]">{p.calendar_period || p.period}</td>
                        <td className="px-6 py-3.5 text-right font-semibold text-[var(--hw-neutral-800)]">
                          {Number(p.average_production_mt).toLocaleString(undefined, { maximumFractionDigits: 2 })} MT
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono text-[var(--hw-neutral-700)]">
                          {Number(p.seasonal_ratio).toFixed(4)}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-semibold border ${levelColor}`}>
                            {p.classification}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right text-[var(--hw-neutral-600)]">{p.years_available} yrs</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[var(--hw-neutral-500)]">
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
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Data Reliability</p>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            <div className="flex justify-between items-center gap-4 px-6 py-3.5">
              <span className="text-[13px] text-[var(--hw-neutral-700)]">Reliability</span>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  result.reliability === "High"
                    ? "text-[var(--hw-success)] bg-[var(--hw-success)]/10"
                    : result.reliability === "Moderate" || result.reliability === "Limited"
                      ? "text-[var(--hw-warning)] bg-[var(--hw-warning)]/10"
                      : "text-[var(--hw-error)] bg-[var(--hw-error)]/10"
                }`}
              >
                {result.reliability || "-"}
              </span>
            </div>
            {result.moduleWarnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2.5 px-6 py-3.5">
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
            <div>
              <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wide">Forecast Price Trend</p>
              <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">14-day price outlook for {selectedCommodity !== "-" ? selectedCommodity : "selected crop"}.</p>
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
            {/* Arrival Volume Trend Bar Chart */}
            <div className={vizCardClass}>
              <div>
                <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wide">Arrival Volume Trend</p>
                <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">Weekly arrivals · tons</p>
              </div>
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
                    No comparison data available.
                  </span>
                </div>
              </div>
            </div>

            {/* Arrival Volume Sources Pie Chart (Enlarged) */}
            <div className={vizCardClass}>
              <div>
                <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wide">Arrival Volume Sources Distribution</p>
                <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">Arrival volume breakdown by origin (Farm Source vs Other Sources).</p>
              </div>
              <ArrivalSourcePieChart showEmpty={!result.arrivalSources || result.arrivalSources.length === 0} data={result.arrivalSources} height={380} />
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
            emptyMessage="No weather data available."
            showScrollbar
            showForecastTable
          />
        )}
      </div>

      {/* 4. Datasets Used Table (Full Width) */}
      <DatasetsUsed
        module={displayResult.module}
        records={displayResult.records}
      />

      {/* 5. Reference Thresholds — Top 10 Commodities (Weather Risk only) */}
      {isWeatherRisk && (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Reference Thresholds · Top 10 Commodities</p>
            <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
              Crop-specific weather classification thresholds for the Top 10 monitored commodities.
            </p>
          </div>

          <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]/60">
                  <th className="py-3 px-6 text-[12px] font-semibold text-black uppercase tracking-wide">Commodity</th>
                  <th className="py-3 px-6 text-[12px] font-semibold text-emerald-700 uppercase tracking-wide">Suitable</th>
                  <th className="py-3 px-6 text-[12px] font-semibold text-amber-700 uppercase tracking-wide">Caution</th>
                  <th className="py-3 px-6 text-[12px] font-semibold text-rose-700 uppercase tracking-wide">Severe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                {TOP_10_WEATHER_THRESHOLDS.map((row) => (
                  <tr key={row.commodity}>
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <CommodityIllustration
                          commodityId={getCommodityIconKey(null, null, row.commodity)}
                          className="w-5 h-5 flex-shrink-0"
                        />
                        <span className="text-[14px] font-semibold text-black">{row.commodity}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-[13px] text-[var(--hw-neutral-800)] font-medium min-w-[200px]">
                      {row.suitable}
                    </td>
                    <td className="py-3.5 px-6 text-[13px] text-[var(--hw-neutral-800)] font-medium min-w-[200px]">
                      {row.caution}
                    </td>
                    <td className="py-3.5 px-6 text-[13px] text-[var(--hw-neutral-800)] font-medium min-w-[200px]">
                      {row.severe}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Threshold Applied & Result Explanation in 2 Columns with Equal Height */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Threshold Applied Card */}
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden h-full flex flex-col justify-between">
            <div className="px-6 py-4 border-b border-[var(--hw-neutral-100)]">
              <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Threshold Applied</p>
            </div>
            {thresholdsError && (
              <div className="px-6 py-2.5 text-[12px] text-red-600 border-b border-[var(--hw-neutral-100)]">{thresholdsError}</div>
            )}
            <div className="divide-y divide-[var(--hw-neutral-100)] flex-1 flex flex-col justify-around">
              {displayThresholds && displayThresholds.length > 0 ? (
                displayThresholds.map((t) => {
                  const tc = CLASSIFICATION_COLORS[t.classification] ?? "text-[var(--hw-neutral-700)]";
                  return (
                    <div key={t.classification} className="flex items-center gap-4 px-6 py-3.5 hover:bg-[var(--hw-neutral-50)]/60 transition-colors">
                      <span className={`text-[13px] font-bold flex-shrink-0 min-w-[95px] ${tc}`}>{t.classification}</span>
                      <span className="text-[13px] text-[var(--hw-neutral-800)] font-medium">{t.rule}</span>
                    </div>
                  );
                })
              ) : (
                <div className="px-6 py-5 text-[13px] text-[var(--hw-neutral-500)]">
                  Threshold information unavailable.
                </div>
              )}
            </div>
          </div>

          {/* Result Explanation Card (Concise Empty State) */}
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden h-full flex flex-col justify-between">
            <div className="px-6 py-4 border-b border-[var(--hw-neutral-100)]">
              <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Result Explanation</p>
            </div>
            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
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

      {/* Missing data warning */}
      {displayResult.basisMissing && (
        <div className="flex items-start gap-3 border border-amber-200 bg-amber-50/60 rounded-2xl px-5 py-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-amber-800 leading-relaxed font-medium">{displayResult.basisMissing}</p>
        </div>
      )}
    </div>
  );
}

export { AdminAnalyticsBasis as default };
