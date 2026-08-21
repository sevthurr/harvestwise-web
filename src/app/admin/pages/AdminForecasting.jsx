import { PageHeader } from "../../global/components/shared/PageHeader";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Info,
  Play,
  ChevronLeft,
  X,
  Loader2,
  CheckCircle2,
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
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
const COMMODITIES = ["Kamatis", "Talong", "Repolyo", "Atsal", "Carrots", "Pipino", "Ampalaya", "Kalabasa", "Lettuce", "Chinese Pechay"];
const MARKETS = ["Bangkerohan", "DFTC"];
const PRICE_TYPES = ["Retail", "Wholesale"];
const HORIZONS = ["7 days", "14 days", "21 days", "28 days"];
const STATUS_OPTS = ["All", "Successful", "Failed", "Needs Review"];
const STATUS_STYLE = {
  Successful: "text-emerald-700",
  "Needs Review": "text-amber-700",
  Failed: "text-red-600"
};
const OUTLOOK_STYLE = {
  Favorable: "text-emerald-700",
  Neutral: "text-[var(--hw-neutral-600)]",
  Unfavorable: "text-red-600"
};
const ALL_HISTORICAL = [
  { d: "Jun 22", actual: 79 },
  { d: "Jun 23", actual: 80 },
  { d: "Jun 24", actual: 80 },
  { d: "Jun 25", actual: 81 },
  { d: "Jun 26", actual: 81 },
  { d: "Jun 27", actual: 82 },
  { d: "Jun 28", actual: 82 },
  { d: "Jun 29", actual: 83 },
  { d: "Jun 30", actual: 82 },
  { d: "Jul 1", actual: 83 },
  { d: "Jul 2", actual: 84 },
  { d: "Jul 3", actual: 83 },
  { d: "Jul 4", actual: 84 },
  { d: "Jul 5", actual: 84 },
  { d: "Jul 6", actual: 82 },
  { d: "Jul 7", actual: 83 },
  { d: "Jul 8", actual: 81 },
  { d: "Jul 9", actual: 83 },
  { d: "Jul 10", actual: 84 },
  { d: "Jul 11", actual: 83 },
  { d: "Jul 12", actual: 84 },
  { d: "Jul 13", actual: 85 },
  { d: "Jul 14", actual: 84 },
  { d: "Jul 15", actual: 85 },
  { d: "Jul 16", actual: 86 },
  { d: "Jul 17", actual: 85 },
  { d: "Jul 18", actual: 85 },
  { d: "Jul 19", actual: 86 }
];
const ALL_FORECAST = [
  { d: "Jul 21", forecast: 87, lo_base: 83, band: 9 },
  { d: "Jul 22", forecast: 88, lo_base: 84, band: 9 },
  { d: "Jul 23", forecast: 88, lo_base: 84, band: 9 },
  { d: "Jul 24", forecast: 89, lo_base: 85, band: 9 },
  { d: "Jul 25", forecast: 89, lo_base: 85, band: 9 },
  { d: "Jul 26", forecast: 90, lo_base: 85, band: 10 },
  { d: "Jul 27", forecast: 90, lo_base: 85, band: 10 },
  { d: "Jul 28", forecast: 91, lo_base: 86, band: 10 },
  { d: "Jul 29", forecast: 91, lo_base: 86, band: 10 },
  { d: "Jul 30", forecast: 91, lo_base: 86, band: 10 },
  { d: "Jul 31", forecast: 92, lo_base: 87, band: 10 },
  { d: "Aug 1", forecast: 92, lo_base: 87, band: 10 },
  { d: "Aug 2", forecast: 91, lo_base: 84, band: 13 },
  { d: "Aug 3", forecast: 92, lo_base: 85, band: 12 },
  { d: "Aug 4", forecast: 92, lo_base: 85, band: 12 },
  { d: "Aug 5", forecast: 93, lo_base: 85, band: 13 },
  { d: "Aug 6", forecast: 93, lo_base: 85, band: 13 },
  { d: "Aug 7", forecast: 93, lo_base: 86, band: 12 },
  { d: "Aug 8", forecast: 94, lo_base: 86, band: 12 },
  { d: "Aug 9", forecast: 94, lo_base: 86, band: 13 },
  { d: "Aug 10", forecast: 93, lo_base: 85, band: 13 },
  { d: "Aug 11", forecast: 94, lo_base: 85, band: 14 },
  { d: "Aug 12", forecast: 94, lo_base: 85, band: 14 },
  { d: "Aug 13", forecast: 95, lo_base: 85, band: 15 },
  { d: "Aug 14", forecast: 95, lo_base: 85, band: 15 },
  { d: "Aug 15", forecast: 95, lo_base: 84, band: 16 },
  { d: "Aug 16", forecast: 94, lo_base: 84, band: 15 },
  { d: "Aug 17", forecast: 94, lo_base: 83, band: 16 }
];
const PIVOT = { d: "Jul 20", actual: 86, forecast: 87, lo_base: 83, band: 8, hi: 91 };
function buildChartData(horizon) {
  const days = parseInt(horizon);
  const historical = ALL_HISTORICAL.slice(-Math.min(days, ALL_HISTORICAL.length));
  const forecast = ALL_FORECAST.slice(0, days).map((p) => ({
    ...p,
    hi: p.lo_base !== void 0 && p.band !== void 0 ? p.lo_base + p.band : void 0
  }));
  return [...historical, PIVOT, ...forecast];
}
const HORIZON_END = {
  "7 days": "Jul 27, 2026",
  "14 days": "Aug 3, 2026",
  "21 days": "Aug 10, 2026",
  "28 days": "Aug 17, 2026"
};
const INITIAL_HISTORY = [
  { id: "r1", generated: "Jul 20, 2026, 6:00 AM", commodity: "Kamatis", variant: "Diamante Big", market: "Bangkerohan", priceType: "Retail", horizon: "14 days", range: "\u20B184\u2013\u20B197", priceOutlook: "Favorable", reliability: "Moderate", records: 247, status: "Successful" },
  { id: "r2", generated: "Jul 20, 2026, 6:00 AM", commodity: "Talong", variant: "Banate King", market: "Bangkerohan", priceType: "Retail", horizon: "14 days", range: "\u20B157\u2013\u20B166", priceOutlook: "Neutral", reliability: "Moderate", records: 198, status: "Successful" },
  { id: "r3", generated: "Jul 20, 2026, 6:00 AM", commodity: "Repolyo", variant: "Wakamini", market: "Bangkerohan", priceType: "Retail", horizon: "14 days", range: "\u20B136\u2013\u20B148", priceOutlook: "Favorable", reliability: "Moderate", records: 201, status: "Needs Review" },
  { id: "r4", generated: "Jul 20, 2026, 6:00 AM", commodity: "Lettuce", variant: "Curly", market: "DFTC", priceType: "Retail", horizon: "14 days", range: "\u20B168\u2013\u20B188", priceOutlook: "Neutral", reliability: "Low", records: 88, status: "Needs Review" },
  { id: "r5", generated: "Jul 19, 2026, 6:00 AM", commodity: "Kamatis", variant: "Diamante Big", market: "Bangkerohan", priceType: "Retail", horizon: "14 days", range: "\u20B182\u2013\u20B195", priceOutlook: "Neutral", reliability: "Moderate", records: 246, status: "Successful" },
  { id: "r6", generated: "Jul 19, 2026, 6:00 AM", commodity: "Atsal", variant: "Smooth Cayene", market: "DFTC", priceType: "Retail", horizon: "14 days", range: "\u2014", priceOutlook: "\u2014", reliability: "Low", records: 31, status: "Failed" }
];
const METRICS = [
  { label: "MAE", value: "\u20B13.2/kg", sub: "Mean Absolute Error" },
  { label: "RMSE", value: "\u20B14.1/kg", sub: "Root Mean Squared Error" },
  { label: "MAPE", value: "4.8%", sub: "Mean Absolute % Error" },
  { label: "R\xB2", value: "0.82", sub: "Coefficient of determination" }
];
const COMMODITY_ID = {
  "Kamatis": "kamatis",
  "Talong": "talong",
  "Repolyo": "repolyo",
  "Atsal": "atsal",
  "Carrots": "carrots",
  "Pipino": "pipino",
  "Ampalaya": "ampalaya",
  "Kalabasa": "kalabasa",
  "Lettuce": "lettuce",
  "Chinese Pechay": "pechay"
};
const CommodityDropdown = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return <div ref={ref} className="relative">
      <button
    onClick={() => setOpen((o) => !o)}
    className="flex items-center gap-2 px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl hover:border-[var(--hw-neutral-300)] transition-colors cursor-pointer min-w-[148px]"
  >
        {COMMODITY_ID[value] && <CommodityIllustration commodityId={COMMODITY_ID[value]} className="w-5 h-5 flex-shrink-0" />}
        <span className="flex-1 text-left text-[var(--hw-neutral-800)]">{value}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--hw-neutral-700)] flex-shrink-0" />
      </button>

      {open && <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg overflow-hidden min-w-full">
          {options.map((opt) => <button
    key={opt}
    onClick={() => {
      onChange(opt);
      setOpen(false);
    }}
    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-[var(--hw-neutral-50)] transition-colors text-left
                ${opt === value ? "bg-[var(--hw-green-50)] text-[var(--hw-green-700)] font-medium" : "text-[var(--hw-neutral-800)]"}`}
  >
              {COMMODITY_ID[opt] && <CommodityIllustration commodityId={COMMODITY_ID[opt]} className="w-5 h-5 flex-shrink-0" />}
              <span>{opt}</span>
            </button>)}
        </div>}
    </div>;
};
const tooltipStyle = { backgroundColor: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12 };
const InfoPopover = ({ text }) => {
  const [open, setOpen] = useState(false);
  return <span className="relative inline-flex flex-shrink-0">
      <button
    onClick={(e) => {
      e.stopPropagation();
      setOpen((v) => !v);
    }}
    className="p-0.5 text-[var(--hw-neutral-700)] hover:text-blue-500 transition-colors"
  >
        <Info className="w-4 h-4" />
      </button>
      {open && <>
          <span className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <span
    className="absolute left-0 top-full mt-1 z-20 w-72 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-[var(--shadow-lg)] p-3 block text-[13px] text-[var(--hw-neutral-700)] leading-relaxed"
    onClick={(e) => e.stopPropagation()}
  >
            {text}
          </span>
        </>}
    </span>;
};
const CommodityIcon = ({ name, size = "sm" }) => <CommodityIllustration
  commodityId={COMMODITY_ID[name] ?? name.toLowerCase()}
  className={size === "md" ? "w-10 h-10" : "w-7 h-7"}
/>;
const ForecastChart = ({ commodity, market, priceType, horizon, tall }) => {
  const data = buildChartData(horizon);
  const days = parseInt(horizon);
  const endDate = HORIZON_END[horizon] ?? "";
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
    <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)] mb-0.5">
      {commodity} · {market} · {priceType} · {days}-day forecast
    </p>
    <p className="text-[12px] text-[var(--hw-neutral-700)] mb-4">
      Historical prices and forecast range from Jul 20–{endDate} · ₱/kg
    </p>
    <div className={tall ? "h-96" : "h-80"}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 16, left: 4, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
    dataKey="d"
    tick={{ fill: "#737373", fontSize: 10 }}
    stroke="none"
    interval={Math.floor(data.length / 8)}
  />
          <YAxis
    tick={{ fill: "#737373", fontSize: 10 }}
    stroke="none"
    domain={["auto", "auto"]}
    tickFormatter={(v) => `\u20B1${v}`}
    width={44}
  />
          <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => {
    if (n === "lo_base" || n === "band") return null;
    return [`\u20B1${v}/kg`, n === "actual" ? "Actual price" : "Forecast midpoint"];
  }} />
          {
    /* Range band: green hi area first, then white lo_base mask on top, then lines on top of everything */
  }
          <Area type="monotone" dataKey="hi" stroke="none" fill="#AAD576" fillOpacity={0.28} legendType="none" activeDot={false} connectNulls={false} />
          <Area type="monotone" dataKey="lo_base" stroke="none" fill="#ffffff" fillOpacity={1} legendType="none" activeDot={false} connectNulls={false} />
          <Line type="monotone" dataKey="actual" stroke="#245501" strokeWidth={2.5} dot={false} name="actual" connectNulls={false} />
          <Line type="monotone" dataKey="forecast" stroke="#73A942" strokeWidth={2} strokeDasharray="5 3" dot={false} name="forecast" connectNulls={false} />
          <ReferenceLine
    x="Jul 20"
    stroke="#245501"
    strokeDasharray="4 4"
    strokeWidth={1.5}
    label={{ value: "Jul 20", position: "insideTopRight", fontSize: 10, fill: "#245501" }}
  />
          <Brush
    dataKey="d"
    height={22}
    travellerWidth={8}
    stroke="#d4d4d4"
    fill="#fafafa"
    startIndex={0}
    endIndex={data.length - 1}
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
  </div>;
};
const ModelPerformance = () => <section>
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-800)]">Model Performance</h2>
      <InfoPopover text="These metrics evaluate forecasting performance using historical test data. Lower MAE, RMSE, and MAPE indicate smaller prediction errors, while R² indicates how well the model explains price variation." />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {METRICS.map((m) => <div key={m.label} className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-3">
          <p className="text-[12px] text-[var(--hw-neutral-700)]">{m.sub}</p>
          <p className="text-xl font-bold text-[var(--hw-neutral-900)] mt-0.5">{m.value}</p>
          <p className="text-[11px] font-semibold text-[var(--hw-neutral-500)]">{m.label}</p>
        </div>)}
    </div>
  </section>;
const PriceOutlookCalc = ({ showThreshold }) => <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-4">
    {showThreshold && <p className="text-[15px] font-semibold text-[var(--hw-neutral-800)]">Price Outlook Calculation</p>}
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
      {[
  { label: "Lower forecast", value: "\u20B184/kg", color: "" },
  { label: "Forecast midpoint", value: "\u20B190.50/kg", color: "" },
  { label: "Upper forecast", value: "\u20B197/kg", color: "" },
  { label: "Recent average price", value: "\u20B186/kg", color: "" },
  { label: "Forecast price change", value: "+5.23%", color: "text-emerald-700" },
  { label: "Result", value: "Favorable", color: "text-emerald-700" }
].map((f) => <div key={f.label}>
          <p className="text-[12px] text-[var(--hw-neutral-700)]">{f.label}</p>
          <p className={`text-[13px] font-semibold mt-0.5 ${f.color || "text-[var(--hw-neutral-800)]"}`}>{f.value}</p>
        </div>)}
    </div>

    {showThreshold && <div>
        <p className="text-[12px] font-medium text-[var(--hw-neutral-800)] mb-2">Classification threshold used</p>
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
      </div>}

    <p className="text-[13px] text-[var(--hw-neutral-800)] bg-[var(--hw-neutral-50)] rounded-xl px-4 py-3 border border-[var(--hw-neutral-100)]">
      The forecast midpoint is higher than the recent average price, so the Price Outlook is classified as{" "}
      <span className="font-semibold text-emerald-700">Favorable</span>.
    </p>
  </div>;
const GenerateModal = ({ commodity, market, priceType, horizon, onClose, onSuccess, onViewOutput }) => {
  const [step, setStep] = useState("form");
  const [successRun, setSuccessRun] = useState(null);
  const runForecast = () => {
    setStep("loading");
    setTimeout(() => {
      const newRun = {
        id: `r-new-${Date.now()}`,
        generated: "Jul 20, 2026, 6:00 AM",
        commodity,
        market,
        priceType,
        horizon,
        range: "\u20B184\u2013\u20B197",
        priceOutlook: "Favorable",
        reliability: "Moderate",
        records: 247,
        status: "Successful"
      };
      setSuccessRun(newRun);
      onSuccess(newRun);
      setStep("success");
    }, 2e3);
  };
  const btnPrimary = "flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-[var(--hw-green-700)] text-white rounded-xl hover:bg-[var(--hw-green-800)] transition-colors";
  const btnSecondary = "flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors";
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={step !== "loading" ? onClose : void 0} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">

        {
    /* Header */
  }
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-100)]">
          <p className="font-semibold text-[var(--hw-neutral-800)]">Generate Forecast</p>
          {step !== "loading" && <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors">
              <X className="w-4 h-4" />
            </button>}
        </div>

        {step === "form" && <>
            <div className="px-5 py-4 space-y-3">
              <div className="divide-y divide-[var(--hw-neutral-100)] rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden">
                {[
    { label: "Commodity", value: commodity },
    { label: "Market", value: market },
    { label: "Price Type", value: priceType },
    { label: "Forecast Horizon", value: horizon },
    { label: "Latest available price date", value: "Jul 19, 2026" },
    { label: "Records available", value: "247" }
  ].map((f) => <div key={f.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <p className="text-[13px] text-[var(--hw-neutral-800)]">{f.label}</p>
                    <p className="text-[13px] font-medium text-[var(--hw-neutral-800)]">{f.value}</p>
                  </div>)}
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <p className="text-[13px] text-emerald-700">Data is ready for forecasting.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--hw-neutral-100)]">
              <button onClick={onClose} className={btnSecondary}>Cancel</button>
              <button onClick={runForecast} className={btnPrimary}>
                <Play className="w-3.5 h-3.5" />Run Forecast
              </button>
            </div>
          </>}

        {step === "loading" && <div className="px-5 py-10 flex flex-col items-center gap-3">
            <Loader2 className="w-9 h-9 text-[var(--hw-green-700)] animate-spin" />
            <p className="text-[14px] font-medium text-[var(--hw-neutral-700)]">Generating forecast…</p>
            <p className="text-[12px] text-[var(--hw-neutral-700)]">This may take a few seconds.</p>
          </div>}

        {step === "success" && <>
            <div className="px-5 py-7 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-[14px] font-semibold text-[var(--hw-neutral-800)]">Forecast generated successfully.</p>
              <p className="text-[13px] text-[var(--hw-neutral-800)]">The new run has been added to the Forecast Run History.</p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--hw-neutral-100)]">
              <button onClick={onClose} className={btnSecondary}>Close</button>
              <button onClick={() => {
    onClose();
    if (successRun) onViewOutput(successRun);
  }} className={btnPrimary}>
                View Output
              </button>
            </div>
          </>}
      </div>
    </div>;
};
function ForecastOutputDetails({ run, onBack }) {
  const navigate = useNavigate();
  const sectionLabel = "text-[11px] font-semibold uppercase tracking-widest text-[var(--hw-neutral-700)] mb-3";
  return <div className="space-y-5">
    <button
    onClick={onBack}
    className="flex items-center gap-1 text-[13px] text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-700)] transition-colors"
  >
      <ChevronLeft className="w-4 h-4" />Back to Forecasting
    </button>

    {
    /* Output header card */
  }
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
      <p className="text-[18px] font-bold text-[var(--hw-neutral-900)] mb-3">Forecast Output Details</p>
      <div className="flex items-start gap-3">
        <CommodityIcon name={run.commodity} size="md" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[var(--hw-neutral-800)]">{run.commodity}</span>
            {run.variant && <span className="text-[12px] text-[var(--hw-neutral-500)] bg-[var(--hw-neutral-100)] px-2 py-0.5 rounded-full">{run.variant}</span>}
            <span className="text-[var(--hw-neutral-300)]">·</span>
            <span className="text-[13px] text-[var(--hw-neutral-800)]">{run.market}</span>
            <span className="text-[var(--hw-neutral-300)]">·</span>
            <span className="text-[13px] text-[var(--hw-neutral-800)]">{run.priceType}</span>
            <span className="text-[var(--hw-neutral-300)]">·</span>
            <span className="text-[13px] text-[var(--hw-neutral-800)]">{run.horizon} forecast</span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[12px] text-[var(--hw-neutral-700)]">ID: <span className="font-mono">{run.id}</span></span>
            <span className="text-[var(--hw-neutral-200)]">·</span>
            <span className="text-[12px] text-[var(--hw-neutral-700)]">Generated: {run.generated}</span>
            <span className="text-[var(--hw-neutral-200)]">·</span>
            <span className={`text-[12px] font-medium ${STATUS_STYLE[run.status]}`}>{run.status}</span>
          </div>
        </div>
      </div>
    </div>

    {
    /* Forecast Summary */
  }
    <section>
      <p className={sectionLabel}>Forecast Summary</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
    { label: "Forecast Range", value: "\u20B184\u2013\u20B197/kg", color: "" },
    { label: "Forecast Midpoint", value: "\u20B190.50/kg", color: "" },
    { label: "Recent Average", value: "\u20B186.00/kg", color: "" },
    { label: "Forecast Change", value: "+5.23%", color: "text-emerald-700" },
    {
      label: "Price Outlook",
      value: run.priceOutlook,
      color: run.priceOutlook !== "\u2014" ? OUTLOOK_STYLE[run.priceOutlook] : "text-[var(--hw-neutral-700)]"
    },
    { label: "Reliability", value: run.reliability, color: "" }
  ].map((c) => <div key={c.label} className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-3 py-3">
            <p className="text-[12px] text-[var(--hw-neutral-700)]">{c.label}</p>
            <p className={`text-[13px] font-semibold mt-0.5 ${c.color || "text-[var(--hw-neutral-900)]"}`}>{c.value}</p>
          </div>)}
      </div>
    </section>

    {
    /* Forecast Chart */
  }
    <section>
      <p className={sectionLabel}>Forecast Chart</p>
      <ForecastChart commodity={run.commodity} market={run.market} priceType={run.priceType} horizon={run.horizon} tall />
    </section>

    {
    /* Price Outlook Basis */
  }
    <section>
      <p className={sectionLabel}>Price Outlook Basis</p>
      <PriceOutlookCalc showThreshold />
    </section>

    {
    /* Model Performance */
  }
    <section>
      
      <ModelPerformance />
    </section>

    {
    /* Used By */
  }
    <section>
      
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
        <p className="text-[13px] font-medium text-[var(--hw-neutral-700)] mb-1">Used by: Price Outlook analytical result and Recommendation Engine</p>
        <p className="text-[13px] text-[var(--hw-neutral-800)]">
          This forecast output is used as one basis for the Price Outlook module, which later contributes to the adaptive planting advisory.
        </p>
      </div>
    </section>

    {
    /* Footer actions */
  }
    
  </div>;
}
function AdminForecasting() {
  const [commodity, setCommodity] = useState("Kamatis");
  const [market, setMarket] = useState("Bangkerohan");
  const [priceType, setPriceType] = useState("Retail");
  const [horizon, setHorizon] = useState("14 days");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showGenModal, setShowGenModal] = useState(false);
  const [runHistory, setRunHistory] = useState(INITIAL_HISTORY);
  const [viewOutputRun, setViewOutputRun] = useState(null);
  const filteredHistory = runHistory.filter(
    (r) => (statusFilter === "All" || r.status === statusFilter) && r.commodity === commodity && r.market === market && r.priceType === priceType
  );
  const selectCls = "px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition cursor-pointer";
  const btnPrimary = "flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-[var(--hw-green-700)] text-white rounded-xl hover:bg-[var(--hw-green-800)] transition-colors";
  if (viewOutputRun) {
    return <div className="px-4 md:px-8 lg:px-10 py-5 max-w-[1240px] mx-auto">
        <ForecastOutputDetails run={viewOutputRun} onBack={() => setViewOutputRun(null)} />
      </div>;
  }
  return <>
      {showGenModal && <GenerateModal
    commodity={commodity}
    market={market}
    priceType={priceType}
    horizon={horizon}
    onClose={() => setShowGenModal(false)}
    onSuccess={(run) => setRunHistory((prev) => [run, ...prev])}
    onViewOutput={(run) => {
      setShowGenModal(false);
      setViewOutputRun(run);
    }}
  />}

      <div className="px-4 md:px-8 lg:px-10 py-5 max-w-[1240px] mx-auto space-y-5">

        {
    /* Header */
  }
        <PageHeader
    title="Forecasting"
    description="Generate and review short-term vegetable price forecasts used for Price Outlook."
    action={<button onClick={() => setShowGenModal(true)} className={btnPrimary}><Play className="w-4 h-4" />Generate Forecast</button>}
  />

        {
    /* Filters */
  }
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-0.5">
            <label className="text-[12px] text-[var(--hw-neutral-700)] font-medium px-1">Commodity</label>
            <CommodityDropdown value={commodity} options={COMMODITIES} onChange={setCommodity} />
          </div>
          {[
    { label: "Market", value: market, setter: setMarket, opts: MARKETS },
    { label: "Price Type", value: priceType, setter: setPriceType, opts: PRICE_TYPES },
    { label: "Forecast Horizon", value: horizon, setter: setHorizon, opts: HORIZONS },
    { label: "Status", value: statusFilter, setter: setStatusFilter, opts: STATUS_OPTS }
  ].map((f) => <div key={f.label} className="flex flex-col gap-0.5">
              <label className="text-[12px] text-[var(--hw-neutral-700)] font-medium px-1">{f.label}</label>
              <select value={f.value} onChange={(e) => f.setter(e.target.value)} className={selectCls}>
                {f.opts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>)}
        </div>

        {
    /* Selected Forecast Context */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
          <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide mb-3">Selected Forecast Context</p>
          <div className="flex items-start gap-3">
            <CommodityIcon name={commodity} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-2.5 flex-1">
              {[
    { label: "Commodity", value: commodity },
    { label: "Market", value: market },
    { label: "Price Type", value: priceType },
    { label: "Forecast Horizon", value: horizon },
    { label: "Latest price date", value: "Jul 19, 2026" },
    { label: "Generated on", value: "Jul 20, 2026, 6:00 AM" },
    { label: "Records used", value: "247" }
  ].map((f) => <div key={f.label}>
                  <p className="text-[12px] text-[var(--hw-neutral-700)]">{f.label}</p>
                  <p className="text-[13px] font-medium text-[var(--hw-neutral-800)] mt-0.5">{f.value}</p>
                </div>)}
            </div>
          </div>
        </div>

        {
    /* Summary cards */
  }
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
    { label: "Run Status", value: "Successful", color: "text-emerald-700" },
    { label: "Forecast Range", value: "\u20B184\u2013\u20B197/kg", color: "text-[var(--hw-neutral-900)]" },
    { label: "Forecast Midpoint", value: "\u20B190.50/kg", color: "text-[var(--hw-neutral-900)]" },
    { label: "Recent Average", value: "\u20B186.00/kg", color: "text-[var(--hw-neutral-900)]" },
    { label: "Forecast Change", value: "+5.23%", color: "text-emerald-700" },
    { label: "Price Outlook", value: "Favorable", color: "text-emerald-700" }
  ].map((c) => <div key={c.label} className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-3 py-3">
              <p className="text-[12px] text-[var(--hw-neutral-700)]">{c.label}</p>
              <p className={`text-[13px] font-semibold mt-0.5 ${c.color}`}>{c.value}</p>
            </div>)}
        </div>

        {
    /* Forecast chart */
  }
        <ForecastChart commodity={commodity} market={market} priceType={priceType} horizon={horizon} />

        {
    /* Price Outlook Calculation */
  }
        <section>
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-800)] mb-3">Price Outlook Calculation</h2>
          <PriceOutlookCalc />
        </section>

        {
    /* Model performance */
  }
        <ModelPerformance />

        {
    /* Forecast run history */
  }
        <section>
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-800)] mb-3">Forecast Run History</h2>
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
            {filteredHistory.length === 0 ? <p className="px-4 py-10 text-center text-[var(--hw-neutral-700)] text-[13px]">No runs match the selected filters.</p> : <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                    <tr>
                      {["Generated", "Commodity", "Market", "Price Type", "Horizon", "Range", "Price Outlook", "Reliability", "Records", "Status"].map((h) => <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wide whitespace-nowrap">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                    {filteredHistory.map((r) => <tr
    key={r.id}
    onClick={() => setViewOutputRun(r)}
    className="hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
  >
                        <td className="px-3 py-2.5 text-[var(--hw-neutral-600)] whitespace-nowrap">{r.generated}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-[var(--hw-neutral-900)]">{r.commodity}</p>
                          {r.variant && <p className="text-[11px] text-[var(--hw-neutral-500)]">{r.variant}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-[var(--hw-neutral-600)] whitespace-nowrap">{r.market}</td>
                        <td className="px-3 py-2.5 text-[var(--hw-neutral-600)]">{r.priceType}</td>
                        <td className="px-3 py-2.5 text-[var(--hw-neutral-600)]">{r.horizon}</td>
                        <td className="px-3 py-2.5 font-medium text-[var(--hw-neutral-900)]">{r.range}</td>
                        <td className={`px-3 py-2.5 font-medium whitespace-nowrap ${r.priceOutlook !== "\u2014" ? OUTLOOK_STYLE[r.priceOutlook] : "text-[var(--hw-neutral-700)]"}`}>
                          {r.priceOutlook}
                        </td>
                        <td className="px-3 py-2.5 text-[var(--hw-neutral-600)]">{r.reliability}</td>
                        <td className="px-3 py-2.5 text-[var(--hw-neutral-600)]">{r.records}</td>
                        <td className={`px-3 py-2.5 font-medium whitespace-nowrap ${STATUS_STYLE[r.status]}`}>{r.status}</td>
                      </tr>)}
                  </tbody>
                </table>
              </div>}
          </div>
        </section>

      </div>
    </>;
}
export {
  AdminForecasting as default
};
