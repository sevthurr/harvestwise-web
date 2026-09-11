import { PageHeader } from "../../global/components/shared/PageHeader";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronDown,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush
} from "recharts";
import { CommodityIllustration, getCommodityIconKey } from "../../global/components/shared/CommodityIllustrations";
import { formatDate, formatPrice } from "../../global/utils/apiTransforms";
import { pricesApi } from "../../../services/api";

const FALLBACK_MARKETS = ["Bankerohan", "DFTC"];
const FALLBACK_PRICE_TYPES = ["Retail", "Wholesale"];
const HORIZON_LABELS = ["7 days", "14 days", "21 days", "28 days"];

const FALLBACK_PAIRS = [
  { commodity: "Ampalaya", variety: "Galaxy" },
  { commodity: "Atsal", variety: "Smooth Cayene" },
  { commodity: "Atsal", variety: "Sultan" },
  { commodity: "Carrots", variety: "Big" },
  { commodity: "Carrots", variety: "Medium" },
  { commodity: "Carrots", variety: "Small" },
  { commodity: "Chinese Petchay", variety: null },
  { commodity: "Kalabasa", variety: "Suprema" },
  { commodity: "Kamatis", variety: "Diamante Big" },
  { commodity: "Lettuce", variety: "Ball" },
  { commodity: "Lettuce", variety: "Curly" },
  { commodity: "Pipino", variety: "Mega C" },
  { commodity: "Repolyo", variety: "Wakamini" },
  { commodity: "Talong", variety: "Banate King" },
];

function uniqueCommodities(pairs) {
  return [...new Set((pairs || []).map((pair) => pair.commodity).filter(Boolean))];
}

function officialVarieties(pairs, commodity) {
  return (pairs || [])
    .filter((pair) => pair.commodity === commodity)
    .map((pair) => pair.variety)
    .filter((value) => value != null && value !== "");
}

function parseHorizonDays(horizon) {
  const days = parseInt(horizon, 10);
  return [7, 14, 21, 28].includes(days) ? days : 14;
}

function horizonLabel(days) {
  return `${days} days`;
}

function iconLookupName(commodity) {
  return String(commodity || "").replace(/Petchay/gi, "Pechay");
}

function formatAxisDate(iso) {
  if (!iso) return "";
  const stamp = String(iso).slice(0, 10);
  const [year, month, day] = stamp.split("-");
  if (!year || !month || !day) return formatDate(iso) || stamp;
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatSummaryPrice(value) {
  if (value == null || value === "") return "-/kg";
  return `${formatPrice(value)}/kg`;
}

function formatSummaryPriceRange(lower, upper) {
  const lo = numericPrice(lower);
  const hi = numericPrice(upper);
  if (lo == null && hi == null) return "-/kg";
  const parts = [lo != null ? formatPrice(lo) : "-", hi != null ? formatPrice(hi) : "-"];
  return `${parts.join(" – ")}/kg`;
}

function formatChange(percent) {
  if (percent == null || !Number.isFinite(percent)) return "-";
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}%`;
}

const RECENT_AVERAGE_WINDOW = 7;
const OUTLOOK_FAVORABLE_MIN = 5;
const OUTLOOK_UNFAVORABLE_MAX = -5;

const OUTLOOK_COLORS = {
  Favorable: "text-emerald-700",
  Neutral: "text-[var(--hw-neutral-700)]",
  Unfavorable: "text-red-600",
};

function numericPrice(value) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function recentAveragePrice(records, window = RECENT_AVERAGE_WINDOW) {
  const prices = (records || [])
    .map((row) => numericPrice(row?.price_avg ?? row?.price))
    .filter((value) => value != null);
  const recent = prices.slice(0, window);
  if (recent.length === 0) return null;
  return recent.reduce((sum, price) => sum + price, 0) / recent.length;
}

function forecastChangePercent(midpoint, recentAverage) {
  const mid = numericPrice(midpoint);
  const average = numericPrice(recentAverage);
  if (mid == null || average == null || average === 0) return null;
  return ((mid - average) / average) * 100;
}

function priceOutlookFromChange(percent) {
  if (percent == null || !Number.isFinite(percent)) return null;
  if (percent > OUTLOOK_FAVORABLE_MIN) return "Favorable";
  if (percent < OUTLOOK_UNFAVORABLE_MAX) return "Unfavorable";
  return "Neutral";
}

function isoDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function normalizeVariety(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === "no variety") return "";
  return normalized;
}

function toPriceTypeKey(market, priceType) {
  const marketKey = String(market || "").toLowerCase().includes("dftc")
    ? "dftc"
    : "bangkerohan";
  const typeKey = String(priceType || "").toLowerCase().includes("wholesale")
    ? "wholesale"
    : "retail";
  return `${marketKey}_${typeKey}`;
}

function catalogPairsFromPriceList(items) {
  return (items || [])
    .filter((item) => item?.name)
    .map((item) => ({
      commodity: item.name,
      variety: item.variety || null,
      commodity_id: item.commodity_id,
    }));
}

function findCommodityId(pairs, commodity, variety) {
  const name = String(commodity || "").trim().toLowerCase();
  const varietyKey = normalizeVariety(variety);
  const match = (pairs || []).find((pair) => {
    if (String(pair.commodity || "").trim().toLowerCase() !== name) return false;
    return normalizeVariety(pair.variety) === varietyKey;
  });
  return match?.commodity_id || null;
}

function buildChartData(historical, forecastPoint, forecastPoints = []) {
  const byDate = new Map();
  for (const row of historical || []) {
    const date = isoDate(row?.price_date || row?.date);
    if (!date) continue;
    const price = row.price_avg ?? row.price;
    if (price == null || price === "") continue;
    const numeric = Number(price);
    if (!Number.isFinite(numeric)) continue;
    byDate.set(date, { d: date, actual: numeric });
  }
  const forecastDate = isoDate(forecastPoint?.forecast_date);
  const midpoint = forecastPoint?.forecast_midpoint;
  const lower = Number(forecastPoint?.lower_forecast);
  const upper = Number(forecastPoint?.upper_forecast);
  const hasRange = Number.isFinite(lower) || Number.isFinite(upper);
  if (forecastDate && (midpoint != null && midpoint !== "" || hasRange)) {
    const existing = byDate.get(forecastDate) || { d: forecastDate };
    const numeric = Number(midpoint);
    if (Number.isFinite(numeric)) existing.predicted = numeric;
    if (Number.isFinite(lower)) existing.lower = lower;
    if (Number.isFinite(upper)) existing.upper = upper;
    byDate.set(forecastDate, existing);

    if (hasRange) {
      const anchorDate = [...byDate.keys()].filter((d) => d !== forecastDate).sort().at(-1);
      if (anchorDate) {
        const anchor = byDate.get(anchorDate) || { d: anchorDate };
        if (Number.isFinite(lower)) anchor.lower = lower;
        if (Number.isFinite(upper)) anchor.upper = upper;
        byDate.set(anchorDate, anchor);
      }
    }
  }

  const dailyPoints = Array.isArray(forecastPoints) ? forecastPoints : [];
  if (dailyPoints.length > 0) {
    for (const point of dailyPoints) {
      const forecastDate = isoDate(point?.forecast_date);
      const midpoint = point?.forecast_midpoint;
      if (!forecastDate || midpoint == null || midpoint === "") continue;
      const numeric = Number(midpoint);
      if (!Number.isFinite(numeric)) continue;
      const existing = byDate.get(forecastDate) || { d: forecastDate };
      existing.predicted = numeric;
      byDate.set(forecastDate, existing);
    }
  } else {
    const forecastDate = isoDate(forecastPoint?.forecast_date);
    const midpoint = forecastPoint?.forecast_midpoint;
    if (forecastDate && midpoint != null && midpoint !== "") {
      const numeric = Number(midpoint);
      if (Number.isFinite(numeric)) {
        const existing = byDate.get(forecastDate) || { d: forecastDate };
        existing.predicted = numeric;
        byDate.set(forecastDate, existing);
      }
    }
  }
  return [...byDate.values()].sort((a, b) => String(a.d).localeCompare(String(b.d)));
}

function yDomain(data) {
  const values = (data || [])
    .flatMap((point) => [point.actual, point.predicted, point.lower, point.upper])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) return ["auto", "auto"];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.1, 5);
  return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];
}

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

  const selectedName = typeof value === "object" ? value?.name : value || options[0] || "Ampalaya";
  const selectedIconKey = getCommodityIconKey(null, null, iconLookupName(selectedName));

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
            const optIconKey = getCommodityIconKey(null, null, iconLookupName(optName));
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
  const hasVarieties = options.length > 0;
  const selectedVariety = hasVarieties ? (value || options[0]) : "No Variety";

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
        onClick={() => hasVarieties && setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-[13px] bg-[var(--hw-neutral-50)] hover:bg-white border border-[var(--hw-neutral-200)] rounded-xl transition-colors cursor-pointer focus:border-[var(--hw-green-600)] focus:ring-2 focus:ring-[var(--hw-green-600)]/20"
      >
        <span className="text-[13px] font-medium text-[var(--hw-neutral-900)] truncate">{selectedVariety}</span>
        <ChevronDown className={`w-4 h-4 text-[var(--hw-neutral-500)] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && hasVarieties && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
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

const ForecastChart = ({
  commodity,
  variety,
  market,
  priceType,
  horizonDays,
  data,
  loading,
  empty,
}) => {
  const varietyLabel = variety ? ` (${variety})` : "";
  const domain = useMemo(() => yDomain(data), [data]);
  const hasData = (data || []).length > 0;

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-6 md:p-8 space-y-4 min-h-[520px] flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-[14px] font-bold text-[var(--hw-neutral-900)] tracking-tight">
            {commodity ? `${commodity}${varietyLabel} · ${market || "-"} · ${priceType || "-"} · ${horizonDays}-Day Forecast` : "Forecast Chart"}
          </p>
          <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
            Historical actual prices vs forecast midpoint and forecast range · ₱/kg
          </p>
        </div>
      </div>

      <div className="w-full flex-1 flex flex-col justify-center my-2 relative">
        <div className="h-[380px] w-full">
          {hasData && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 12, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="d"
                  tick={{ fill: "#6b7280", fontSize: 11, fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatAxisDate}
                  minTickGap={24}
                />
                <YAxis
                  domain={domain}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatPrice(v)}
                  width={58}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(label) => formatDate(label) || label}
                  formatter={(value, name) => [formatPrice(value), name]}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "white", stroke: "#16a34a", strokeWidth: 2 }}
                  connectNulls={false}
                  name="Actual"
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: "white", stroke: "#2563eb", strokeWidth: 2 }}
                  connectNulls={false}
                  name="Forecast Midpoint"
                />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fill="#2563eb"
                  fillOpacity={0.12}
                  legendType="none"
                  tooltipType="none"
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="none"
                  fill="white"
                  fillOpacity={1}
                  legendType="none"
                  tooltipType="none"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="upper"
                  stroke="#93c5fd"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls={false}
                  name="Forecast Range"
                />
                <Line
                  type="monotone"
                  dataKey="lower"
                  stroke="#93c5fd"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls={false}
                  name="Forecast Range"
                />
                <Brush
                  dataKey="d"
                  height={24}
                  stroke="#cbd5e1"
                  fill="#f8fafc"
                  startIndex={0}
                  endIndex={Math.max((data || []).length - 1, 0)}
                  tickFormatter={formatAxisDate}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
        {(loading || empty || !hasData) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[13px] text-[var(--hw-neutral-600)] font-medium bg-white/90 px-4 py-1.5 rounded-lg shadow-sm border border-[var(--hw-neutral-200)]">
              {loading ? "Loading forecast..." : "No forecast records available"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-[var(--hw-neutral-100)] text-[12px] text-[var(--hw-neutral-700)]">
        <div className="flex items-center gap-2">
          <div className="w-5 border-t-2 border-[#16a34a]" />
          <span>Actual</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 border-t-2 border-[#2563eb]" />
          <span>Forecast Midpoint</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-2 bg-[#2563eb]/20 border border-dashed border-[#93c5fd]" />
          <span>Forecast Range</span>
        </div>
      </div>
    </div>
  );
};

function AdminForecasting() {
  const [pairs, setPairs] = useState(FALLBACK_PAIRS);
  const [markets, setMarkets] = useState(FALLBACK_MARKETS);
  const [priceTypes, setPriceTypes] = useState(FALLBACK_PRICE_TYPES);
  const [horizonOptions, setHorizonOptions] = useState(HORIZON_LABELS);

  const [commodity, setCommodity] = useState("Ampalaya");
  const [variety, setVariety] = useState("Galaxy");
  const [market, setMarket] = useState("Bankerohan");
  const [priceType, setPriceType] = useState("Retail");
  const [horizon, setHorizon] = useState("14 days");

  const [chartPayload, setChartPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const commodities = useMemo(() => uniqueCommodities(pairs), [pairs]);
  const variants = useMemo(() => officialVarieties(pairs, commodity), [pairs, commodity]);
  const horizonDays = parseHorizonDays(horizon);
  const apiVariety = variants.length === 0 ? null : variety;

  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      try {
        const list = await pricesApi.getPriceList({ is_top10: true, page_size: 100 });
        if (!active) return;
        const nextPairs = catalogPairsFromPriceList(list?.items);
        if (nextPairs.length) {
          setPairs(nextPairs);
          setCommodity((current) => {
            const names = uniqueCommodities(nextPairs);
            return names.includes(current) ? current : (names[0] || "Ampalaya");
          });
        } else {
          setLoading(false);
        }
        setMarkets(FALLBACK_MARKETS);
        setPriceTypes(FALLBACK_PRICE_TYPES);
        setHorizonOptions([7, 14, 21, 28].map(horizonLabel));
        setError(null);
      } catch (e) {
        if (active) {
          setError(e.message || "Failed to load forecast catalog");
          setPairs(FALLBACK_PAIRS);
          setChartPayload(null);
          setLoading(false);
        }
      }
    }
    loadCatalog();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const nextVariants = officialVarieties(pairs, commodity);
    if (nextVariants.length === 0) {
      if (variety != null) setVariety(null);
      return;
    }
    if (!nextVariants.includes(variety)) {
      setVariety(nextVariants[0]);
    }
  }, [commodity, pairs, variety]);

  useEffect(() => {
    if (!commodity || !market || !priceType) return;
    const nextVariants = officialVarieties(pairs, commodity);
    if (nextVariants.length > 0 && (variety == null || !nextVariants.includes(variety))) {
      return;
    }

    const commodityId = findCommodityId(pairs, commodity, nextVariants.length === 0 ? null : variety);
    if (!commodityId) {
      setChartPayload(null);
      if ((pairs || []).some((pair) => pair.commodity_id)) {
        setLoading(false);
      }
      return;
    }

    let active = true;
    async function loadChart() {
      setLoading(true);
      try {
        const payload = await pricesApi.getPriceDetail(commodityId, {
          price_type: toPriceTypeKey(market, priceType),
          horizon: horizonDays,
          records_limit: 20,
        });
        if (!active) return;
        setChartPayload(payload);
        setError(null);
      } catch (e) {
        if (!active) return;
        setChartPayload(null);
        setError(e.message || "Failed to load forecast");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadChart();
    return () => { active = false; };
  }, [commodity, variety, market, priceType, horizonDays, pairs]);

  const selectedForecast = chartPayload?.forecast || null;
  const latestPriceDate = chartPayload?.recent_records?.[0]?.price_date || null;
  const recentAverage = useMemo(
    () => recentAveragePrice(chartPayload?.recent_records),
    [chartPayload]
  );
  const lowerForecast = numericPrice(selectedForecast?.lower_forecast);
  const upperForecast = numericPrice(selectedForecast?.upper_forecast);
  const forecastMidpoint = numericPrice(
    selectedForecast?.forecast_midpoint ?? selectedForecast?.predicted_price
  );
  const changePercent = useMemo(
    () => forecastChangePercent(forecastMidpoint, recentAverage),
    [forecastMidpoint, recentAverage]
  );
  const outlook = useMemo(
    () => priceOutlookFromChange(changePercent),
    [changePercent]
  );

  const chartData = useMemo(
    () => buildChartData(
      chartPayload?.recent_records,
      selectedForecast,
      selectedForecast?.points || []
    ),
    [chartPayload, selectedForecast]
  );

  const seriesId = [market, priceType, commodity, apiVariety || "No Variety"].filter(Boolean).join(" / ");
  const empty = !loading && chartData.length === 0;

  function handleCommodityChange(nextCommodity) {
    setCommodity(nextCommodity);
    const nextVariants = officialVarieties(pairs, nextCommodity);
    setVariety(nextVariants.length === 0 ? null : nextVariants[0]);
  }

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title="Forecasting"
        description="Review automatically generated short-term vegetable price forecasts used for Price Outlook."
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          Unable to load forecast data: {error}
        </div>
      )}

      {/* 1. Filter Card */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
        {/* Dropdowns row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--hw-neutral-600)] mb-1">Commodity</label>
            <CustomCommodityDropdown
              value={commodity}
              options={commodities}
              onChange={handleCommodityChange}
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
              options={markets}
              onChange={setMarket}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--hw-neutral-600)] mb-1">Price Type</label>
            <CustomSimpleDropdown
              value={priceType}
              options={priceTypes}
              onChange={setPriceType}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--hw-neutral-600)] mb-1">Forecast Horizon</label>
            <CustomSimpleDropdown
              value={horizon}
              options={horizonOptions}
              onChange={setHorizon}
            />
          </div>
        </div>

        {/* Filter context metadata: series identity, dates, official prices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-2.5 border-t border-[var(--hw-neutral-100)] text-[11px]">
          <div>
            <span className="text-[var(--hw-neutral-400)] font-medium">ID:</span>{" "}
            <span className="font-semibold text-[var(--hw-neutral-800)] font-mono">{seriesId || "-"}</span>
          </div>
          <div>
            <span className="text-[var(--hw-neutral-400)] font-medium">Forecast Date:</span>{" "}
            <span className="font-semibold text-[var(--hw-neutral-800)]">
              {selectedForecast?.forecast_date ? formatDate(selectedForecast.forecast_date) : "-"}
            </span>
          </div>
          <div>
            <span className="text-[var(--hw-neutral-400)] font-medium">Latest Price Date:</span>{" "}
            <span className="font-semibold text-[var(--hw-neutral-800)]">
              {chartPayload?.as_of_date ? formatDate(chartPayload.as_of_date) : (latestPriceDate ? formatDate(latestPriceDate) : "-")}
            </span>
          </div>
          <div>
            <span className="text-[var(--hw-neutral-400)] font-medium">Forecast Midpoint:</span>{" "}
            <span className="font-semibold text-[var(--hw-neutral-800)]">
              {formatSummaryPrice(selectedForecast?.forecast_midpoint ?? selectedForecast?.predicted_price)}
            </span>
          </div>
          <div>
            <span className="text-[var(--hw-neutral-400)] font-medium">Forecast Range:</span>{" "}
            <span className="font-semibold text-[var(--hw-neutral-800)]">
              {formatSummaryPriceRange(lowerForecast, upperForecast)}
            </span>
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
            <p className="text-[14px] font-bold text-[var(--hw-neutral-900)] mt-1.5 text-right">
              {formatSummaryPrice(recentAverage)}
            </p>
          </div>
          <div className="px-3.5 py-2.5 sm:py-0 flex flex-col justify-between">
            <p className="text-[11px] font-medium text-[var(--hw-neutral-500)] text-left">Lower Forecast</p>
            <p className="text-[14px] font-bold text-[var(--hw-neutral-900)] mt-1.5 text-right">
              {formatSummaryPrice(lowerForecast)}
            </p>
          </div>
          <div className="px-3.5 py-2.5 sm:py-0 flex flex-col justify-between">
            <p className="text-[11px] font-medium text-[var(--hw-neutral-500)] text-left">Upper Forecast</p>
            <p className="text-[14px] font-bold text-[var(--hw-neutral-900)] mt-1.5 text-right">
              {formatSummaryPrice(upperForecast)}
            </p>
          </div>
          <div className="px-3.5 py-2.5 sm:py-0 flex flex-col justify-between">
            <p className="text-[11px] font-medium text-[var(--hw-neutral-500)] text-left">Forecast Midpoint</p>
            <p className="text-[14px] font-bold text-[var(--hw-neutral-900)] mt-1.5 text-right">
              {formatSummaryPrice(forecastMidpoint)}
            </p>
          </div>
          <div className="px-3.5 py-2.5 sm:py-0 flex flex-col justify-between">
            <p className="text-[11px] font-medium text-[var(--hw-neutral-500)] text-left">Forecast Change</p>
            <p className="text-[14px] font-bold text-[var(--hw-neutral-900)] mt-1.5 text-right">
              {formatChange(changePercent)}
            </p>
          </div>
          <div className="px-3.5 py-2.5 sm:py-0 flex flex-col justify-between">
            <p className="text-[11px] font-medium text-[var(--hw-neutral-500)] text-left">Price Outlook</p>
            <p className={`text-[14px] font-bold mt-1.5 text-right ${outlook ? OUTLOOK_COLORS[outlook] : "text-[var(--hw-neutral-700)]"}`}>
              {outlook || "Not available"}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Forecast Chart */}
      <ForecastChart
        commodity={commodity}
        variety={apiVariety}
        market={market}
        priceType={priceType}
        horizonDays={horizonDays}
        data={chartData}
        loading={loading}
        empty={empty}
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

export {
  buildChartData,
  catalogPairsFromPriceList,
  findCommodityId,
  forecastChangePercent,
  parseHorizonDays,
  priceOutlookFromChange,
  recentAveragePrice,
  toPriceTypeKey,
};
export { AdminForecasting as default };
