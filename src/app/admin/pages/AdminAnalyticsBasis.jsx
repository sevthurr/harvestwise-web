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
import {
  RESULTS,
  CLASSIFICATION_COLORS
} from "../components/analytics/adminAnalyticsMockData";
import { ProductionSourcePieChart } from "../../global/components/shared/ProductionSourcePieChart";
import { ArrivalSourcePieChart } from "../../global/components/shared/ArrivalSourcePieChart";

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
      "Expected harvest quarter": "-",
      "Average quarterly production": "- MT",
      "Current quarter estimate": "- MT",
      "Seasonal production ratio": "-",
      "Source areas": "-",
      "Q1 ratio threshold": "-",
      "Q2 ratio threshold": "-",
      "Q3 ratio threshold": "-"
    },
    thresholds: [
      { classification: "Low", rule: "PSA production ratio < 0.75" },
      { classification: "Lower Middle", rule: "PSA production ratio 0.75–1.00" },
      { classification: "Upper Middle", rule: "PSA production ratio 1.00–1.25" },
      { classification: "High", rule: "PSA production ratio ≥ 1.25" }
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
                    <tr key={i} className="hover:bg-[var(--hw-neutral-50)] transition-colors">
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

function AdminAnalyticsBasis() {
  const { resultId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const foundResult = RESULTS.find((r) => r.id === resultId);
  const defaultTemplate = DEFAULT_BASIS_TEMPLATES[resultId];

  if (!foundResult && !defaultTemplate) {
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

  const result = foundResult || {
    id: resultId,
    outputId: "-",
    commodity: commodityParam || "Ampalaya",
    variant: varietyParam || "All Varieties",
    ...defaultTemplate
  };

  const selectedCommodity = commodityParam || result.commodity || "Ampalaya";
  const selectedVariety = varietyParam || result.variant || "All Varieties";

  const availableVariants = useMemo(() => selectedCommodity !== "-" ? getVariants(selectedCommodity) : [], [selectedCommodity]);

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

      {/* 1. Filter Card (Ultra-Compact Height, Styled Farmer Dropdowns with Icons, No Header Bar) */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--hw-neutral-600)] mb-1">Commodity</label>
            <CustomCommodityDropdown
              value={selectedCommodity}
              options={TOP_10_COMMODITIES}
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
            <span className="text-[var(--hw-neutral-400)] font-medium">ID:</span> <span className="font-semibold text-[var(--hw-neutral-800)] font-mono">{result.outputId || "-"}</span>
          </div>
          <div>
            <span className="text-[var(--hw-neutral-400)] font-medium">Module:</span> <span className="font-semibold text-[var(--hw-neutral-800)]">{result.module || "-"}</span>
          </div>
          <div>
            <span className="text-[var(--hw-neutral-400)] font-medium">Data Source:</span> <span className="font-semibold text-[var(--hw-neutral-800)]" title={result.basisSource}>{result.basisSource || "-"}</span>
          </div>
          <div>
            <span className="text-[var(--hw-neutral-400)] font-medium">Input Period:</span> <span className="font-semibold text-[var(--hw-neutral-800)]">{result.inputPeriod || "-"}</span>
          </div>
        </div>
      </div>

      {/* 2. Input Values (Full Width) */}
      {result.basisInputs && Object.keys(result.basisInputs).length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Input Values</p>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {Object.entries(result.basisInputs).map(([key, val]) => (
              <div key={key} className="flex justify-between items-center gap-4 px-6 py-3.5 hover:bg-[var(--hw-neutral-50)]/60 transition-colors">
                <span className="text-[13px] text-[var(--hw-neutral-700)]">{key}</span>
                <span className="text-[13px] font-semibold text-[var(--hw-neutral-900)] text-right">{val || "-"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Visualizations (Single Column, Full Width, Visible Line & Bar Frames with Zero/Empty State) */}
      <div className="space-y-6">
        {/* Forecast Price Trend Chart (Price Outlook) */}
        {(result.module === "Price Outlook" || resultId === "price-outlook") && (
          <div className={vizCardClass}>
            <div>
              <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wide">Forecast Price Trend</p>
              <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">14-day price outlook for {selectedCommodity !== "-" ? selectedCommodity : "selected crop"}.</p>
            </div>
            {result.forecastPoints && result.forecastPoints.length > 0 ? (
              <ForecastPriceTrendChart commodity={selectedCommodity} chartData={result.forecastPoints} varieties={result.varieties || []} height={360} />
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
                  <BarChart data={quarterlyGhostData} margin={{ top: 16, right: 20, left: 0, bottom: 8 }} barSize={72}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="quarter" tick={{ fontSize: 13, fill: "#4b5563", fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <YAxis hide domain={[0, 10]} />
                    <Bar dataKey="placeholder" radius={[6, 6, 0, 0]} fill="#e2e8f0" stroke="#cbd5e1" strokeDasharray="3 3" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center -mt-[190px] mb-[150px] pointer-events-none">
                  <span className="text-[13px] text-[var(--hw-neutral-600)] font-medium bg-white/90 px-4 py-1.5 rounded-lg shadow-sm border border-[var(--hw-neutral-200)]">
                    No production data available.
                  </span>
                </div>
              </div>
            </div>

            {/* Production Sources Pie Chart (Enlarged) */}
            <div className={vizCardClass}>
              <div>
                <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wide">Production Sources Distribution</p>
                <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">Historical production volume share across major supplying areas (Davao City, Davao Del Sur, Bukidnon).</p>
              </div>
              <ProductionSourcePieChart showEmpty={!result.productionSources || result.productionSources.length === 0} data={result.productionSources} height={380} />
            </div>
          </>
        )}

        {/* Weather Risk Outlook */}
        {(result.module === "Weather Risk" || resultId === "weather-risk") && (
          <div className={vizCardClass}>
            <div>
              <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wide">14-Day Weather Forecast Outlook</p>
              <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">Estimated weather parameters and risks for {selectedCommodity !== "-" ? selectedCommodity : "selected crop"}.</p>
            </div>
            {result.forecast_14d && result.forecast_14d.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {result.forecast_14d.map((day, i) => (
                  <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2 bg-[var(--hw-neutral-50)] rounded-2xl border border-[var(--hw-neutral-200)] px-4 py-5 min-w-[90px] shadow-[var(--shadow-xs)]">
                    <p className="text-[13px] font-bold text-[var(--hw-neutral-800)]">{day.dayLabel}</p>
                    <p className="text-[11px] text-[var(--hw-neutral-500)] font-medium">{day.date}</p>
                    <div className="w-9 h-9 my-1 text-[var(--hw-neutral-700)] flex items-center justify-center text-2xl">☁️</div>
                    <div className="text-center">
                      <p className="text-[15px] font-bold text-[var(--hw-neutral-900)]">{day.tempMax != null ? `${day.tempMax}°` : "-°"}</p>
                      <p className="text-[12px] text-[var(--hw-neutral-500)] font-medium">{day.tempMin != null ? `${day.tempMin}°` : "-°"}</p>
                    </div>
                    <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] mt-0.5">{day.rainPct != null ? `${day.rainPct}%` : "-%"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full flex-1 flex flex-col justify-center">
                <div className="flex gap-4 overflow-x-auto pb-3 opacity-50 pointer-events-none" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  {Array.from({ length: 14 }, (_, i) => (
                    <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2 bg-[var(--hw-neutral-50)] rounded-2xl border border-[var(--hw-neutral-200)] px-4 py-5 min-w-[90px]">
                      <p className="text-[13px] font-bold text-[var(--hw-neutral-700)]">{i === 0 ? "Today" : `+${i}d`}</p>
                      <p className="text-[11px] text-[var(--hw-neutral-400)] font-medium">-</p>
                      <div className="w-9 h-9 my-1 text-[var(--hw-neutral-400)] flex items-center justify-center text-2xl">☁️</div>
                      <div className="text-center">
                        <p className="text-[15px] font-bold text-[var(--hw-neutral-700)]">-°</p>
                        <p className="text-[12px] text-[var(--hw-neutral-400)] font-medium">-°</p>
                      </div>
                      <p className="text-[12px] font-semibold text-[var(--hw-neutral-500)] mt-0.5">-%</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center -mt-[160px] mb-[120px] pointer-events-none">
                  <span className="text-[13px] text-[var(--hw-neutral-600)] font-medium bg-white/90 px-4 py-1.5 rounded-lg shadow-sm border border-[var(--hw-neutral-200)]">
                    No weather data available.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Datasets Used Table (Full Width) */}
      <DatasetsUsed
        module={result.module}
        records={result.records}
      />

      {/* 5. Threshold Applied & Result Explanation in 2 Columns with Equal Height */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Threshold Applied Card */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden h-full flex flex-col justify-between">
          <div className="px-6 py-4 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Threshold Applied</p>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)] flex-1 flex flex-col justify-around">
            {result.thresholds && result.thresholds.length > 0 ? (
              result.thresholds.map((t) => {
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
            {result.resultExplanation && result.resultExplanation !== "No explanation available." ? (
              <p className="text-[14px] font-medium text-[var(--hw-neutral-800)] leading-relaxed text-left w-full">
                {result.resultExplanation}
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
      {result.basisMissing && (
        <div className="flex items-start gap-3 border border-amber-200 bg-amber-50/60 rounded-2xl px-5 py-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-amber-800 leading-relaxed font-medium">{result.basisMissing}</p>
        </div>
      )}
    </div>
  );
}

export { AdminAnalyticsBasis as default };
