import { PageHeader } from "../../global/components/shared/PageHeader";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Info,
  ChevronLeft,
  ChevronDown
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
  ReferenceLine,
  Brush
} from "recharts";
import { CommodityIllustration, getCommodityIconKey } from "../../global/components/shared/CommodityIllustrations";
import { getVariants } from "../../global/data/commodities";
import { apiGet, parseResponse } from "../../global/api";

const MARKETS = ["Bangkerohan", "DFTC"];
const PRICE_TYPES = ["Retail", "Wholesale"];
const HORIZONS = ["7 days", "14 days", "21 days", "28 days"];

const OUTLOOK_STYLE = {
  Favorable: "text-emerald-700",
  Neutral: "text-[var(--hw-neutral-600)]",
  Unfavorable: "text-red-600"
};

const ALL_HISTORICAL = [];
const ALL_FORECAST = [];

function buildChartData(horizon) {
  if (!ALL_HISTORICAL.length && !ALL_FORECAST.length) {
    return [];
  }
  const days = parseInt(horizon) || 7;
  const historical = ALL_HISTORICAL.slice(-Math.min(days, ALL_HISTORICAL.length));
  const forecast = ALL_FORECAST.slice(0, days).map((p) => ({
    ...p,
    hi: p.lo_base !== undefined && p.band !== undefined ? p.lo_base + p.band : undefined
  }));
  return [...historical, ...forecast];
}

const INITIAL_HISTORY = [];

const CommodityDropdown = ({ value, options = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!options || options.length === 0) {
    return (
      <div className="px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl text-[var(--hw-neutral-500)] min-w-[148px]">
        No forecasting commodities available
      </div>
    );
  }

  const selectedName = typeof value === "object" ? value?.name : value;
  const selectedIconKey = getCommodityIconKey(null, null, selectedName);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl hover:border-[var(--hw-neutral-300)] transition-colors cursor-pointer min-w-[148px]"
      >
        <CommodityIllustration commodityId={selectedIconKey} className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1 text-left text-[var(--hw-neutral-800)]">{selectedName || "Select commodity"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--hw-neutral-700)] flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg overflow-hidden min-w-full max-h-60 overflow-y-auto">
          {options.map((opt) => {
            const optName = typeof opt === "object" ? opt.name : opt;
            const optIconKey = typeof opt === "object" && opt.iconKey ? opt.iconKey : getCommodityIconKey(opt?.id, opt?.baseName, optName);
            const isSelected = optName === selectedName;

            return (
              <button
                key={optName}
                onClick={() => {
                  onChange(optName);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-[var(--hw-neutral-50)] transition-colors text-left
                  ${isSelected ? "bg-[var(--hw-green-50)] text-[var(--hw-green-700)] font-medium" : "text-[var(--hw-neutral-800)]"}`}
              >
                <CommodityIllustration commodityId={optIconKey} className="w-5 h-5 flex-shrink-0" />
                <span>{optName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const tooltipStyle = { backgroundColor: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12 };

const InfoPopover = ({ text }) => {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex flex-shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-0.5 text-[var(--hw-neutral-700)] hover:text-blue-500 transition-colors"
      >
        <Info className="w-4 h-4" />
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <span
            className="absolute left-0 top-full mt-1 z-20 w-72 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-[var(--shadow-lg)] p-3 block text-[13px] text-[var(--hw-neutral-700)] leading-relaxed"
            onClick={(e) => e.stopPropagation()}
          >
            {text}
          </span>
        </>
      )}
    </span>
  );
};

const CommodityIcon = ({ name, size = "sm" }) => {
  const iconKey = getCommodityIconKey(null, null, name);
  return (
    <CommodityIllustration
      commodityId={iconKey}
      className={size === "md" ? "w-10 h-10" : "w-7 h-7"}
    />
  );
};

function generateEmptyChartData(horizon) {
  const days = parseInt(horizon) || 7;
  const now = new Date();
  const points = [];
  // 7 historical empty days
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(now);
    dt.setDate(now.getDate() - i);
    points.push({
      d: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      actual: null,
      forecast: null,
      lo_base: null,
      hi: null
    });
  }
  // `days` forecast empty days
  for (let i = 1; i <= days; i++) {
    const dt = new Date(now);
    dt.setDate(now.getDate() + i);
    points.push({
      d: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      actual: null,
      forecast: null,
      lo_base: null,
      hi: null
    });
  }
  return points;
}

const ForecastChart = ({ commodity, variety, market, priceType, horizon, tall, chartData = [], startDate, endDate }) => {
  const rawData = chartData && chartData.length > 0 ? chartData : buildChartData(horizon);
  const isEmpty = rawData.length === 0 || rawData.every((p) => p.actual == null && p.forecast == null);
  const data = rawData.length > 0 ? rawData : generateEmptyChartData(horizon);
  const days = parseInt(horizon) || 7;
  const varietyLabel = variety && variety !== "All Varieties" ? ` (${variety})` : "";

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)] mb-0.5">
            {commodity ? `${commodity}${varietyLabel} · ${market || "-"} · ${priceType || "-"} · ${days}-day forecast` : "Forecast chart"}
          </p>
          <p className="text-[12px] text-[var(--hw-neutral-700)]">
            {startDate && endDate ? `Historical prices and forecast range from ${startDate}–${endDate} · ₱/kg` : "Historical prices and forecast range · ₱/kg"}
          </p>
        </div>
        {isEmpty && (
          <span className="text-[11px] font-medium text-[var(--hw-neutral-500)] bg-[var(--hw-neutral-100)] px-2.5 py-1 rounded-lg">
            No forecast records available
          </span>
        )}
      </div>

      <div className={tall ? "h-96" : "h-80"}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 16, left: 4, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="d"
              tick={{ fill: "#737373", fontSize: 10 }}
              stroke="none"
              interval={Math.max(0, Math.floor(data.length / 8))}
            />
            <YAxis
              tick={{ fill: "#737373", fontSize: 10 }}
              stroke="none"
              domain={isEmpty ? [0, 100] : ["auto", "auto"]}
              tickFormatter={(v) => `₱${v}`}
              width={44}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v, n) => {
                if (v == null || n === "lo_base" || n === "band") return null;
                return [`₱${v}/kg`, n === "actual" ? "Actual price" : "Forecast midpoint"];
              }}
            />
            <Area type="monotone" dataKey="hi" stroke="none" fill="#AAD576" fillOpacity={0.28} legendType="none" activeDot={false} connectNulls={false} />
            <Area type="monotone" dataKey="lo_base" stroke="none" fill="#ffffff" fillOpacity={1} legendType="none" activeDot={false} connectNulls={false} />
            <Line type="monotone" dataKey="actual" stroke="#245501" strokeWidth={2.5} dot={false} name="actual" connectNulls={false} />
            <Line type="monotone" dataKey="forecast" stroke="#73A942" strokeWidth={2} strokeDasharray="5 3" dot={false} name="forecast" connectNulls={false} />
            {startDate && (
              <ReferenceLine
                x={startDate}
                stroke="#245501"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: startDate, position: "insideTopRight", fontSize: 10, fill: "#245501" }}
              />
            )}
            <Brush
              dataKey="d"
              height={22}
              travellerWidth={8}
              stroke="#d4d4d4"
              fill="#fafafa"
              startIndex={0}
              endIndex={Math.max(0, data.length - 1)}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-5 mt-3 pt-3 border-t border-[var(--hw-neutral-100)]">
        <div className="flex items-center gap-1.5">
          <div className="w-5 border-t-2 border-[#245501]" />
          <span className="text-[12px] text-[var(--hw-neutral-800)]">Actual price</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 border-t-2 border-dashed border-[#73A942]" />
          <span className="text-[12px] text-[var(--hw-neutral-800)]">Forecast midpoint</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-3 rounded bg-[#AAD576] opacity-40" />
          <span className="text-[12px] text-[var(--hw-neutral-800)]">Forecast range</span>
        </div>
      </div>
    </div>
  );
};

const ModelPerformance = ({ metrics }) => {
  const metricItems = [
    { label: "MAE", value: metrics?.mae ? `₱${metrics.mae}/kg` : "-", sub: "Mean Absolute Error" },
    { label: "RMSE", value: metrics?.rmse ? `₱${metrics.rmse}/kg` : "-", sub: "Root Mean Squared Error" },
    { label: "MAPE", value: metrics?.mape ? `${metrics.mape}%` : "-", sub: "Mean Absolute % Error" },
    { label: "R²", value: metrics?.rSquared ?? "-", sub: "Coefficient of determination" }
  ];

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-800)]">Model Performance</h2>
        <InfoPopover text="These metrics evaluate forecasting performance using historical test data. Lower MAE, RMSE, and MAPE indicate smaller prediction errors, while R² indicates how well the model explains price variation." />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metricItems.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-3">
            <p className="text-[12px] text-[var(--hw-neutral-700)]">{m.sub}</p>
            <p className="text-xl font-bold text-[var(--hw-neutral-900)] mt-0.5">{m.value}</p>
            <p className="text-[11px] font-semibold text-[var(--hw-neutral-500)]">{m.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const PriceOutlookCalc = ({ data, showThreshold }) => {
  const hasData = Boolean(data && data.priceOutlook);

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-4">
      {showThreshold && <p className="text-[15px] font-semibold text-[var(--hw-neutral-800)]">Price Outlook Calculation</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
        {[
          { label: "Lower forecast", value: data?.lowerForecast ? `₱${data.lowerForecast}/kg` : "-/kg", color: "" },
          { label: "Forecast midpoint", value: data?.midpoint ? `₱${data.midpoint}/kg` : "-/kg", color: "" },
          { label: "Upper forecast", value: data?.upperForecast ? `₱${data.upperForecast}/kg` : "-/kg", color: "" },
          { label: "Recent average price", value: data?.recentAvg ? `₱${data.recentAvg}/kg` : "-/kg", color: "" },
          { label: "Forecast price change", value: data?.forecastChange ?? "-", color: data?.forecastChange ? "text-emerald-700" : "" },
          {
            label: "Result",
            value: data?.priceOutlook ?? "Not available",
            color: data?.priceOutlook && OUTLOOK_STYLE[data.priceOutlook] ? OUTLOOK_STYLE[data.priceOutlook] : ""
          }
        ].map((f) => (
          <div key={f.label}>
            <p className="text-[12px] text-[var(--hw-neutral-700)]">{f.label}</p>
            <p className={`text-[13px] font-semibold mt-0.5 ${f.color || "text-[var(--hw-neutral-800)]"}`}>{f.value}</p>
          </div>
        ))}
      </div>

      {showThreshold && (
        <div>
          <p className="text-[12px] font-medium text-[var(--hw-neutral-800)] mb-2">Current Price Outlook Thresholds</p>
          <div className="overflow-x-auto rounded-xl border border-[var(--hw-neutral-200)]">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                  <th className="px-3 py-2 text-left font-semibold text-[var(--hw-neutral-500)]">Condition</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--hw-neutral-500)]">Price Outlook</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                <tr className="bg-emerald-50/60">
                  <td className="px-3 py-2 text-[var(--hw-neutral-700)]">Forecast change &gt; 5%</td>
                  <td className="px-3 py-2 font-semibold text-emerald-700">Favorable</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-[var(--hw-neutral-700)]">−5% to 5%</td>
                  <td className="px-3 py-2 font-semibold text-[var(--hw-neutral-600)]">Neutral</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-[var(--hw-neutral-700)]">Forecast change &lt; −5%</td>
                  <td className="px-3 py-2 font-semibold text-red-600">Unfavorable</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[13px] text-[var(--hw-neutral-800)] bg-[var(--hw-neutral-50)] rounded-xl px-4 py-3 border border-[var(--hw-neutral-100)]">
        {hasData ? (
          <>
            The forecast midpoint is {data.comparison || "comparable to"} the recent average price, so the Price Outlook is classified as{" "}
            <span className={`font-semibold ${OUTLOOK_STYLE[data.priceOutlook] || "text-[var(--hw-neutral-800)]"}`}>
              {data.priceOutlook}
            </span>.
          </>
        ) : (
          "Price Outlook could not be calculated for this forecast."
        )}
      </p>
    </div>
  );
};

function ForecastOutputDetails({ run, onBack }) {
  const sectionLabel = "text-[11px] font-semibold uppercase tracking-widest text-[var(--hw-neutral-700)] mb-3";

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] hover:text-black transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />Back to Forecasting
      </button>

      {/* Output header card */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
        <p className="text-[18px] font-bold text-[var(--hw-neutral-900)] mb-3">Forecast Output Details</p>
        <div className="flex items-start gap-3">
          <CommodityIcon name={run?.commodity} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[var(--hw-neutral-800)]">{run?.commodity || "-"}</span>
              {run?.variety && <span className="text-[12px] text-[var(--hw-neutral-600)] bg-[var(--hw-neutral-100)] px-2 py-0.5 rounded-md font-medium">{run.variety}</span>}
              <span className="text-[var(--hw-neutral-300)]">·</span>
              <span className="text-[13px] text-[var(--hw-neutral-800)]">{run?.market || "-"}</span>
              <span className="text-[var(--hw-neutral-300)]">·</span>
              <span className="text-[13px] text-[var(--hw-neutral-800)]">{run?.priceType || "-"}</span>
              <span className="text-[var(--hw-neutral-300)]">·</span>
              <span className="text-[13px] text-[var(--hw-neutral-800)]">{run?.horizon ? `${run.horizon} forecast` : "-"}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-[12px] text-[var(--hw-neutral-700)]">ID: <span className="font-mono">{run?.id || "-"}</span></span>
              <span className="text-[var(--hw-neutral-200)]">·</span>
              <span className="text-[12px] text-[var(--hw-neutral-700)]">Generated: {run?.generated || "-"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Summary */}
      <section>
        <p className={sectionLabel}>Forecast Summary</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Forecast Range", value: run?.range || "-/kg", color: "" },
            { label: "Forecast Midpoint", value: run?.midpoint || "-/kg", color: "" },
            { label: "Recent Average", value: run?.recentAvg || "-/kg", color: "" },
            { label: "Forecast Change", value: run?.forecastChange || "-", color: run?.forecastChange ? "text-emerald-700" : "" },
            {
              label: "Price Outlook",
              value: run?.priceOutlook || "Not available",
              color: run?.priceOutlook && OUTLOOK_STYLE[run.priceOutlook] ? OUTLOOK_STYLE[run.priceOutlook] : "text-[var(--hw-neutral-700)]"
            },
            { label: "Reliability", value: run?.reliability || "Not available", color: "" }
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-3 py-3">
              <p className="text-[12px] text-[var(--hw-neutral-700)]">{c.label}</p>
              <p className={`text-[13px] font-semibold mt-0.5 ${c.color || "text-[var(--hw-neutral-900)]"}`}>{c.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Forecast Chart */}
      <section>
        <p className={sectionLabel}>Forecast Chart</p>
        <ForecastChart
          commodity={run?.commodity}
          variety={run?.variety}
          market={run?.market}
          priceType={run?.priceType}
          horizon={run?.horizon}
          tall
        />
      </section>

      {/* Price Outlook Basis */}
      <section>
        <p className={sectionLabel}>Price Outlook Basis</p>
        <PriceOutlookCalc data={run} showThreshold />
      </section>

      {/* Model Performance */}
      <section>
        <ModelPerformance metrics={run?.metrics} />
      </section>

      {/* Used By */}
      <section>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
          <p className="text-[13px] font-medium text-[var(--hw-neutral-700)] mb-1">
            Used by: Price Outlook analytical result and Recommendation Engine
          </p>
          <p className="text-[13px] text-[var(--hw-neutral-800)]">
            This forecast output is used as one basis for the Price Outlook module, which later contributes to the adaptive planting advisory.
          </p>
        </div>
      </section>
    </div>
  );
}

function AdminForecasting() {
  const [commodities, setCommodities] = useState([]);
  const [loadingCommodities, setLoadingCommodities] = useState(true);
  const [commodity, setCommodity] = useState("");
  const [variety, setVariety] = useState("All Varieties");
  const [market, setMarket] = useState(MARKETS[0] || "");
  const [priceType, setPriceType] = useState(PRICE_TYPES[0] || "");
  const [horizon, setHorizon] = useState(HORIZONS[1] || "14 days");
  const [runHistory] = useState(INITIAL_HISTORY);
  const [viewOutputRun, setViewOutputRun] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadCommodities() {
      try {
        setLoadingCommodities(true);
        const res = await apiGet("/farmer/commodities");
        if (res.ok && active) {
          const data = await parseResponse(res);
          const rawList = Array.isArray(data) ? data : data?.items || [];
          const top10 = rawList
            .filter((c) => (c.isTop10 ?? c.is_top10 ?? true) && (c.isActive ?? c.is_active ?? true))
            .map((c) => {
              const name = c.name || c.baseName || c.base_name;
              return {
                id: c.id,
                name,
                iconKey: getCommodityIconKey(c.id, c.baseName || c.base_name, name)
              };
            });
          setCommodities(top10);
          if (top10.length > 0) {
            setCommodity((prev) => prev || top10[0].name);
          }
        }
      } catch (err) {
        console.warn("Failed to load commodities for forecasting:", err);
      } finally {
        if (active) setLoadingCommodities(false);
      }
    }
    loadCommodities();
    return () => {
      active = false;
    };
  }, []);

  const variants = useMemo(() => {
    if (!commodity) return [];
    return getVariants(commodity);
  }, [commodity]);

  const varietyOptions = useMemo(() => {
    if (variants.length === 0) return ["Standard"];
    return ["All Varieties", ...variants];
  }, [variants]);

  // Reset variety when commodity changes if current variety is not in new variants
  useEffect(() => {
    if (variants.length === 0) {
      setVariety("Standard");
    } else if (variety !== "All Varieties" && !variants.includes(variety)) {
      setVariety("All Varieties");
    }
  }, [commodity, variants]);

  const filteredHistory = runHistory.filter((r) => {
    const matchComm = r.commodity === commodity;
    const matchMarket = r.market === market;
    const matchType = r.priceType === priceType;
    const matchVar = !variety || variety === "All Varieties" || variety === "Standard" || r.variety === variety;
    return matchComm && matchMarket && matchType && matchVar;
  });

  const selectCls = "px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition cursor-pointer";

  if (viewOutputRun) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto">
        <ForecastOutputDetails run={viewOutputRun} onBack={() => setViewOutputRun(null)} />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      {/* Header */}
      <PageHeader
        title="Forecasting"
        description="Review automatically generated short-term vegetable price forecasts used for Price Outlook."
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Commodity Filter */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[12px] text-[var(--hw-neutral-700)] font-medium px-1">Commodity</label>
          <CommodityDropdown value={commodity} options={commodities} onChange={setCommodity} />
        </div>

        {/* Variety Filter */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[12px] text-[var(--hw-neutral-700)] font-medium px-1">Variety</label>
          <select
            value={variety}
            onChange={(e) => setVariety(e.target.value)}
            disabled={varietyOptions.length <= 1 && varietyOptions[0] === "Standard"}
            className={`${selectCls} min-w-[130px] disabled:opacity-60`}
          >
            {varietyOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {[
          { label: "Market", value: market, setter: setMarket, opts: MARKETS, emptyFallback: "No markets available" },
          { label: "Price Type", value: priceType, setter: setPriceType, opts: PRICE_TYPES },
          { label: "Forecast Horizon", value: horizon, setter: setHorizon, opts: HORIZONS }
        ].map((f) => (
          <div key={f.label} className="flex flex-col gap-0.5">
            <label className="text-[12px] text-[var(--hw-neutral-700)] font-medium px-1">{f.label}</label>
            {f.opts.length === 0 ? (
              <div className="px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl text-[var(--hw-neutral-500)]">
                {f.emptyFallback || "-"}
              </div>
            ) : (
              <select value={f.value} onChange={(e) => f.setter(e.target.value)} className={selectCls}>
                {f.opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      {/* Latest Forecast Context */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide mb-3">Latest Forecast</p>
        <div className="flex items-start gap-3">
          <CommodityIcon name={commodity} />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-6 gap-y-2.5 flex-1">
            {[
              { label: "Commodity", value: commodity || "-" },
              { label: "Variety", value: variety || "Standard" },
              { label: "Market", value: market || "-" },
              { label: "Price Type", value: priceType || "-" },
              { label: "Forecast Horizon", value: horizon || "-" },
              { label: "Latest price date", value: "-" },
              { label: "Generated on", value: "-" }
            ].map((f) => (
              <div key={f.label}>
                <p className="text-[12px] text-[var(--hw-neutral-700)]">{f.label}</p>
                <p className="text-[13px] font-medium text-[var(--hw-neutral-800)] mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Forecast Range", value: "-/kg", color: "text-[var(--hw-neutral-900)]" },
          { label: "Forecast Midpoint", value: "-/kg", color: "text-[var(--hw-neutral-900)]" },
          { label: "Recent Average", value: "-/kg", color: "text-[var(--hw-neutral-900)]" },
          { label: "Forecast Change", value: "-", color: "text-[var(--hw-neutral-900)]" },
          { label: "Price Outlook", value: "Not available", color: "text-[var(--hw-neutral-700)]" }
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-3 py-3">
            <p className="text-[12px] text-[var(--hw-neutral-700)]">{c.label}</p>
            <p className={`text-[13px] font-semibold mt-0.5 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Forecast chart */}
      <ForecastChart
        commodity={commodity}
        variety={variety}
        market={market}
        priceType={priceType}
        horizon={horizon}
      />

      {/* Price Outlook Calculation */}
      <section>
        <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-800)] mb-3">Price Outlook Calculation</h2>
        <PriceOutlookCalc />
      </section>

      {/* Model performance */}
      <ModelPerformance />

      {/* Forecast History */}
      <section>
        <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-800)] mb-3">Forecast History</h2>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                <tr>
                  {[
                    "Generated",
                    "Commodity",
                    "Variety",
                    "Market",
                    "Price Type",
                    "Horizon",
                    "Range",
                    "Price Outlook",
                    "Reliability",
                    "Records"
                  ].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-[var(--hw-neutral-500)] text-[13px]">
                      No forecast history found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setViewOutputRun(r)}
                      className="hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-2.5 text-[var(--hw-neutral-600)] whitespace-nowrap">{r.generated || "-"}</td>
                      <td className="px-3 py-2.5 font-medium text-[var(--hw-neutral-900)]">
                        {r.commodity || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--hw-neutral-600)]">
                        {r.variety || "Standard"}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--hw-neutral-600)] whitespace-nowrap">{r.market || "-"}</td>
                      <td className="px-3 py-2.5 text-[var(--hw-neutral-600)]">{r.priceType || "-"}</td>
                      <td className="px-3 py-2.5 text-[var(--hw-neutral-600)]">{r.horizon || "-"}</td>
                      <td className="px-3 py-2.5 font-medium text-[var(--hw-neutral-900)]">{r.range || "-"}</td>
                      <td className={`px-3 py-2.5 font-medium whitespace-nowrap ${r.priceOutlook && OUTLOOK_STYLE[r.priceOutlook] ? OUTLOOK_STYLE[r.priceOutlook] : "text-[var(--hw-neutral-700)]"}`}>
                        {r.priceOutlook || "Not available"}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--hw-neutral-600)]">{r.reliability || "Not available"}</td>
                      <td className="px-3 py-2.5 text-[var(--hw-neutral-600)]">{r.records != null ? r.records : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

export { AdminForecasting as default };
