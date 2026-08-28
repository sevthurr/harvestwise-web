import { PageHeader } from "../../global/components/shared/PageHeader";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronDown,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush
} from "recharts";
import { CommodityIllustration, getCommodityIconKey } from "../../global/components/shared/CommodityIllustrations";
import { getVariants } from "../../global/data/commodities";

const MARKETS = ["Bangkerohan", "DFTC"];
const PRICE_TYPES = ["Retail", "Wholesale"];
const HORIZONS = ["7 days", "14 days", "21 days", "28 days"];

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

const CustomCommodityDropdown = ({ value, options = TOP_10_COMMODITIES, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedName = typeof value === "object" ? value?.name : value || options[0] || "Ampalaya";
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
          {options.map((opt) => {
            const optName = typeof opt === "object" ? opt.name : opt;
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
        className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-[13px] bg-[var(--hw-neutral-50)] hover:bg-white border border-[var(--hw-neutral-200)] rounded-xl transition-colors cursor-pointer focus:border-[var(--hw-green-600)] focus:ring-2 focus:ring-[var(--hw-green-600)]/20"
      >
        <span className="text-[13px] font-medium text-[var(--hw-neutral-900)] truncate">{value}</span>
        <ChevronDown className={`w-4 h-4 text-[var(--hw-neutral-500)] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
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
              className={`w-full flex items-center px-3.5 py-2 text-[13px] text-left transition-colors cursor-pointer ${
                opt === value ? "bg-[var(--hw-green-50)] font-semibold text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
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

const tooltipStyle = { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12 };

function generateEmptyChartData(horizon) {
  const days = parseInt(horizon) || 14;
  const points = [];
  for (let i = 1; i <= days; i++) {
    points.push({
      d: `+${i}d`,
      baseline: 50
    });
  }
  return points;
}

const ForecastChart = ({ commodity, variety, market, priceType, horizon }) => {
  const days = parseInt(horizon) || 14;
  const data = useMemo(() => generateEmptyChartData(horizon), [horizon]);
  const varietyLabel = variety && variety !== "All Varieties" ? ` (${variety})` : "";

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-6 md:p-8 space-y-4 min-h-[520px] flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-[14px] font-bold text-[var(--hw-neutral-900)] tracking-tight">
            {commodity ? `${commodity}${varietyLabel} · ${market || "-"} · ${priceType || "-"} · ${days}-Day Forecast` : "Forecast Chart"}
          </p>
          <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
            Historical prices and forecast price range across {days} days · ₱/kg
          </p>
        </div>
      </div>

      <div className="w-full flex-1 flex flex-col justify-center my-2">
        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 12, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="d"
                tick={{ fill: "#6b7280", fontSize: 11, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₱${v}`}
                width={50}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="baseline"
                stroke="#93c5fd"
                strokeDasharray="4 4"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "white", stroke: "#60a5fa", strokeWidth: 2 }}
                name="Forecast Baseline"
              />
              <Brush
                dataKey="d"
                height={24}
                stroke="#cbd5e1"
                fill="#f8fafc"
                startIndex={0}
                endIndex={data.length - 1}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center -mt-[210px] mb-[170px] pointer-events-none">
          <span className="text-[13px] text-[var(--hw-neutral-600)] font-medium bg-white/90 px-4 py-1.5 rounded-lg shadow-sm border border-[var(--hw-neutral-200)]">
            No forecast records available
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-[var(--hw-neutral-100)] text-[12px] text-[var(--hw-neutral-700)]">
        <div className="flex items-center gap-2">
          <div className="w-5 border-t-2 border-[#16a34a]" />
          <span>Actual price</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 border-t-2 border-dashed border-[#60a5fa]" />
          <span>Forecast midpoint</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-3 rounded bg-emerald-200/50" />
          <span>Forecast range</span>
        </div>
      </div>
    </div>
  );
};

function AdminForecasting() {
  const [commodity, setCommodity] = useState("Ampalaya");
  const [variety, setVariety] = useState("All Varieties");
  const [market, setMarket] = useState("Bangkerohan");
  const [priceType, setPriceType] = useState("Retail");
  const [horizon, setHorizon] = useState("14 days");

  const variants = useMemo(() => {
    if (!commodity) return [];
    return getVariants(commodity);
  }, [commodity]);

  // Reset variety when commodity changes
  useEffect(() => {
    if (!variants.includes(variety)) {
      setVariety("All Varieties");
    }
  }, [commodity, variants]);

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title="Forecasting"
        description="Review automatically generated short-term vegetable price forecasts used for Price Outlook."
      />

      {/* 1. Filter Card */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
        {/* Dropdowns row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--hw-neutral-600)] mb-1">Commodity</label>
            <CustomCommodityDropdown
              value={commodity}
              options={TOP_10_COMMODITIES}
              onChange={setCommodity}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--hw-neutral-600)] mb-1">Variety</label>
            <CustomVarietyDropdown
              value={variety}
              options={variants}
              onChange={setVariety}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--hw-neutral-600)] mb-1">Market</label>
            <CustomSimpleDropdown
              value={market}
              options={MARKETS}
              onChange={setMarket}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--hw-neutral-600)] mb-1">Price Type</label>
            <CustomSimpleDropdown
              value={priceType}
              options={PRICE_TYPES}
              onChange={setPriceType}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--hw-neutral-600)] mb-1">Forecast Horizon</label>
            <CustomSimpleDropdown
              value={horizon}
              options={HORIZONS}
              onChange={setHorizon}
            />
          </div>
        </div>

        {/* Filter context metadata sub-line: ID, Forecast Date, Latest Price Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t border-[var(--hw-neutral-100)] text-[11px]">
          <div>
            <span className="text-[var(--hw-neutral-400)] font-medium">ID:</span> <span className="font-semibold text-[var(--hw-neutral-800)] font-mono">-</span>
          </div>
          <div>
            <span className="text-[var(--hw-neutral-400)] font-medium">Forecast Date:</span> <span className="font-semibold text-[var(--hw-neutral-800)]">-</span>
          </div>
          <div>
            <span className="text-[var(--hw-neutral-400)] font-medium">Latest Price Date:</span> <span className="font-semibold text-[var(--hw-neutral-800)]">-</span>
          </div>
        </div>
      </div>

      {/* 2. Forecast Summary Container */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--hw-neutral-100)] flex items-center justify-between">
          <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Forecast Summary</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[var(--hw-neutral-100)] p-4 sm:p-5">
          <div className="px-3.5 py-2.5 sm:py-0 flex flex-col justify-between">
            <p className="text-[11px] font-medium text-[var(--hw-neutral-500)] text-left">Recent Average</p>
            <p className="text-[14px] font-bold text-[var(--hw-neutral-900)] mt-1.5 text-right">-/kg</p>
          </div>
          <div className="px-3.5 py-2.5 sm:py-0 flex flex-col justify-between">
            <p className="text-[11px] font-medium text-[var(--hw-neutral-500)] text-left">Lower Forecast</p>
            <p className="text-[14px] font-bold text-[var(--hw-neutral-900)] mt-1.5 text-right">-/kg</p>
          </div>
          <div className="px-3.5 py-2.5 sm:py-0 flex flex-col justify-between">
            <p className="text-[11px] font-medium text-[var(--hw-neutral-500)] text-left">Upper Forecast</p>
            <p className="text-[14px] font-bold text-[var(--hw-neutral-900)] mt-1.5 text-right">-/kg</p>
          </div>
          <div className="px-3.5 py-2.5 sm:py-0 flex flex-col justify-between">
            <p className="text-[11px] font-medium text-[var(--hw-neutral-500)] text-left">Forecast Midpoint</p>
            <p className="text-[14px] font-bold text-[var(--hw-neutral-900)] mt-1.5 text-right">-/kg</p>
          </div>
          <div className="px-3.5 py-2.5 sm:py-0 flex flex-col justify-between">
            <p className="text-[11px] font-medium text-[var(--hw-neutral-500)] text-left">Forecast Change</p>
            <p className="text-[14px] font-bold text-[var(--hw-neutral-900)] mt-1.5 text-right">-</p>
          </div>
          <div className="px-3.5 py-2.5 sm:py-0 flex flex-col justify-between">
            <p className="text-[11px] font-medium text-[var(--hw-neutral-500)] text-left">Price Outlook</p>
            <p className="text-[14px] font-bold text-[var(--hw-neutral-700)] mt-1.5 text-right">Not available</p>
          </div>
        </div>
      </div>

      {/* 3. Forecast Chart */}
      <ForecastChart
        commodity={commodity}
        variety={variety}
        market={market}
        priceType={priceType}
        horizon={horizon}
      />

      {/* 4. Threshold Applied & Result Explanation (Consistent with Basis Page, No Duplicate Metrics) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Threshold Applied Card */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden h-full flex flex-col justify-between">
          <div className="px-6 py-4 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Threshold Applied</p>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)] flex-1 flex flex-col justify-around">
            <div className="flex items-center gap-4 px-6 py-3.5 hover:bg-[var(--hw-neutral-50)]/60 transition-colors">
              <span className="text-[13px] font-bold flex-shrink-0 min-w-[95px] text-emerald-700">Favorable</span>
              <span className="text-[13px] text-[var(--hw-neutral-800)] font-medium">Forecast price change &gt; +5%</span>
            </div>
            <div className="flex items-center gap-4 px-6 py-3.5 hover:bg-[var(--hw-neutral-50)]/60 transition-colors">
              <span className="text-[13px] font-bold flex-shrink-0 min-w-[95px] text-[var(--hw-neutral-700)]">Neutral</span>
              <span className="text-[13px] text-[var(--hw-neutral-800)] font-medium">Forecast price change between −5% and +5%</span>
            </div>
            <div className="flex items-center gap-4 px-6 py-3.5 hover:bg-[var(--hw-neutral-50)]/60 transition-colors">
              <span className="text-[13px] font-bold flex-shrink-0 min-w-[95px] text-red-600">Unfavorable</span>
              <span className="text-[13px] text-[var(--hw-neutral-800)] font-medium">Forecast price change &lt; −5%</span>
            </div>
          </div>
        </div>

        {/* Result Explanation Card */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden h-full flex flex-col justify-between">
          <div className="px-6 py-4 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">Result Explanation</p>
          </div>
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
            <div className="py-4 space-y-1.5 max-w-sm mx-auto">
              <div className="w-10 h-10 rounded-2xl bg-[var(--hw-neutral-100)] border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-500)] flex items-center justify-center mx-auto mb-2">
                <Info className="w-5 h-5" />
              </div>
              <p className="text-[14px] font-semibold text-[var(--hw-neutral-800)]">No Explanation Available</p>
              <p className="text-[12px] text-[var(--hw-neutral-500)] leading-relaxed">
                No analytical explanation generated for the selected scope.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { AdminForecasting as default };
