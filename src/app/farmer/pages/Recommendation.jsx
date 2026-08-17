import { useState } from "react";
import { useNavigate } from "react-router";
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  CloudRain,
  Sun,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Sprout,
  PhilippinePeso,
  Package,
  Leaf,
  Cloud,
  TrendingUp
} from "lucide-react";
import { CommodityIllustration } from "../components/market/CommodityIllustrations";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import {
  FactorDetailTabs,
  buildPricePoints,
  getArrivalData,
  getProductionData,
  getWeatherData
} from "../components/shared/FactorDetailTabs";
import { getVariants } from "../../global/data/commodities";
const TwoToneStormIcon = ({ className }) => <svg
  viewBox="0 0 24 24"
  fill="none"
  strokeWidth={2}
  strokeLinecap="round"
  strokeLinejoin="round"
  className={className}
>
    <path stroke="#3b82f6" d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973" />
    <path stroke="#f59e0b" d="m13 12-3 5h4l-3 5" />
  </svg>;
const FACTOR_ICONS = {
  Price: PhilippinePeso,
  Supply: Package,
  Production: Leaf,
  Weather: Cloud,
  Profit: TrendingUp
};
const FACTOR_COLORS = {
  Price: "text-emerald-600",
  Supply: "text-blue-500",
  Production: "text-green-600",
  Weather: "text-sky-500",
  Profit: "text-amber-600"
};
const CALENDAR_DATA = {
  "2026-7": {
    1: { crop: { id: "kamatis", name: "Kamatis", variant: "Diamante Big", type: "plant", harvestStr: "Oct 1, 2026" } },
    5: { crop: { id: "ampalaya", name: "Ampalaya", variant: "Galaxy", type: "plant", harvestStr: "Oct 5, 2026" } },
    8: { weather: "rain" },
    9: { weather: "rain" },
    10: { weather: "rain" },
    11: { weather: "rain" },
    12: { weather: "storm" },
    13: { weather: "rain" },
    15: { event: "Mid-month payday period. May bring more people to the market." },
    18: { weather: "heat" },
    19: { weather: "heat" },
    20: { weather: "heat" },
    25: { weather: "storm" },
    26: { weather: "rain" },
    27: { weather: "rain" }
  },
  "2026-8": {
    5: { weather: "rain" },
    6: { weather: "storm" },
    7: { weather: "rain" },
    14: { event: "Kadayawan activities. May affect delivery schedules." },
    15: { event: "Kadayawan activities. May affect delivery schedules." },
    16: { event: "Kadayawan activities. May affect delivery schedules." },
    17: { event: "Kadayawan activities. May affect delivery schedules." },
    21: { weather: "heat" },
    22: { weather: "heat" },
    23: { weather: "rain" },
    24: { weather: "rain" },
    25: { event: "National Heroes Day. Market activity may be lower." }
  },
  "2026-10": {
    1: { crop: { id: "kamatis", name: "Kamatis", variant: "Diamante Big", type: "harvest" } },
    5: { crop: { id: "ampalaya", name: "Ampalaya", variant: "Galaxy", type: "harvest" } }
  }
};
const MONTH_CROPS = {
  "2026-7": [
    {
      id: "ampalaya",
      name: "Ampalaya",
      summary: "Good option this month",
      plantWindow: "Jul 1\u201320",
      harvestWindow: "October",
      bestVariety: "Galaxy",
      reasons: [
        { label: "Price", text: "\u20B175/kg today, up \u20B13/kg from last week." },
        { label: "Supply", text: "DFTC arrivals are 10 tons this week, lower than 14 tons last week." },
        { label: "Production", text: "October harvest is not usually a peak production period." },
        { label: "Weather", text: "No heavy rain expected during Jul 1\u201320." },
        { label: "Profit", text: "Around \u20B118/kg above estimated cost." }
      ]
    },
    {
      id: "pipino",
      name: "Pipino",
      summary: "Short growing time",
      plantWindow: "Jul 1\u201315",
      harvestWindow: "Aug 15\u201330",
      bestVariety: "Mega C",
      reasons: [
        { label: "Price", text: "\u20B140/kg today, stable over the past week." },
        { label: "Supply", text: "No unusual increase in DFTC arrivals this week." },
        { label: "Production", text: "45-day growing period fits within the current dry window." },
        { label: "Weather", text: "Planting window Jul 1\u201315 has dry days before the rain period." },
        { label: "Profit", text: "Around \u20B112/kg above estimated cost." }
      ]
    },
    {
      id: "atsal",
      name: "Atsal",
      summary: "Good estimated profit",
      plantWindow: "Jul 5\u201325",
      harvestWindow: "November",
      bestVariety: "Smooth Cayene",
      reasons: [
        { label: "Price", text: "\u20B1120/kg today, up \u20B15/kg from last week." },
        { label: "Supply", text: "DFTC arrivals are slightly lower than the previous week." },
        { label: "Production", text: "November is not a peak supply period for this crop." },
        { label: "Weather", text: "Planting window Jul 5\u201325 includes several dry days." },
        { label: "Profit", text: "Around \u20B125/kg above estimated cost." }
      ]
    }
  ],
  "2026-8": [
    {
      id: "kamatis",
      name: "Kamatis",
      summary: "Price may rise soon",
      plantWindow: "Aug 1\u201320",
      harvestWindow: "November",
      bestVariety: "Diamante Big",
      reasons: [
        { label: "Price", text: "\u20B185/kg today, rising trend over the past two weeks." },
        { label: "Supply", text: "Arrivals at DFTC dropped this week compared to last." },
        { label: "Production", text: "November supply is usually moderate." },
        { label: "Weather", text: "Dry days available in early and mid-August for planting." },
        { label: "Profit", text: "Around \u20B120/kg above estimated cost." }
      ]
    },
    {
      id: "ampalaya",
      name: "Ampalaya",
      summary: "Good estimated profit",
      plantWindow: "Aug 1\u201315",
      harvestWindow: "November",
      bestVariety: "Galaxy",
      reasons: [
        { label: "Price", text: "\u20B175/kg today, stable to rising trend." },
        { label: "Supply", text: "Supply remains manageable at DFTC." },
        { label: "Production", text: "November is not a peak production period for this crop." },
        { label: "Weather", text: "Dry days in early August are suitable for planting." },
        { label: "Profit", text: "Around \u20B118/kg above estimated cost." }
      ]
    },
    {
      id: "kalabasa",
      name: "Kalabasa",
      summary: "Stable price expected",
      plantWindow: "Aug 5\u201325",
      harvestWindow: "Nov\u2013Dec",
      bestVariety: "Suprema",
      reasons: [
        { label: "Price", text: "\u20B135/kg today, stable this week." },
        { label: "Supply", text: "Arrivals are consistent with previous weeks." },
        { label: "Production", text: "Nov\u2013Dec harvest is not a high-supply period." },
        { label: "Weather", text: "Mid-August planting window has several dry days." },
        { label: "Profit", text: "Around \u20B110/kg above estimated cost." }
      ]
    }
  ]
};
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
function monthKey(year, month) {
  return `${year}-${month}`;
}
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}
function firstWeekday(year, month) {
  return new Date(year, month - 1, 1).getDay();
}
function longDate(year, month, day) {
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}
function hasAnyMarker(m) {
  return !!(m.crop || m.weather || m.event);
}
const WIcon = ({ type, cls }) => {
  if (type === "rain") return <CloudRain className={cls} />;
  if (type === "storm") return <TwoToneStormIcon className={cls} />;
  return <Sun className={cls} />;
};
const weatherColor = (type, selected = false) => {
  if (selected) return "text-white/80";
  if (type === "heat") return "text-orange-500";
  if (type === "storm") return "text-blue-600";
  return "text-blue-500";
};
const CalendarGrid = ({ year, month, selectedDay, onSelectDay }) => {
  const today = /* @__PURE__ */ new Date();
  const isNow = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay = isNow ? today.getDate() : -1;
  const total = daysInMonth(year, month);
  const startCol = firstWeekday(year, month);
  const data = CALENDAR_DATA[monthKey(year, month)] ?? {};
  const cells = [
    ...Array(startCol).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1)
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return <>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d) => <div key={d} className="text-center text-[12px] font-semibold text-[var(--hw-neutral-700)] py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
    if (day === null) return <div key={`e${i}`} />;
    const m = data[day] ?? {};
    const marked = hasAnyMarker(m);
    const isToday = day === todayDay;
    const isSelected = day === selectedDay;
    return <button
      key={day}
      onClick={() => onSelectDay(day)}
      className={`flex flex-col items-center justify-start pt-1.5 pb-1 min-h-[52px] rounded-xl text-[13px] font-medium transition-colors
                ${isSelected ? "bg-[var(--hw-green-700)] text-white" : isToday ? "ring-2 ring-[var(--hw-green-700)] text-[var(--hw-neutral-900)]" : marked ? "text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-100)]" : "text-[var(--hw-neutral-400)] hover:bg-[var(--hw-neutral-50)]"}
              `}
    >
              <span>{day}</span>
              {marked && <div className="flex items-center justify-center gap-0.5 mt-0.5 px-0.5">
                  {m.crop && <CommodityIllustration
      commodityId={m.crop.id}
      className={`w-4 h-4 flex-shrink-0 ${isSelected ? "opacity-80" : ""}`}
    />}
                  {m.weather && <WIcon
      type={m.weather}
      cls={`w-3.5 h-3.5 flex-shrink-0 ${weatherColor(m.weather, isSelected)}`}
    />}
                  {m.event && <CalendarClock className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-white/80" : "text-emerald-600"}`} />}
                </div>}
            </button>;
  })}
      </div>
    </>;
};
const SelectedDateCard = ({ year, month, day, markers }) => {
  const navigate = useNavigate();
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
      <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">{longDate(year, month, day)}</p>

      {markers.crop && <div className="flex items-start gap-2.5">
          <CommodityIllustration commodityId={markers.crop.id} className="w-8 h-8 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
              {markers.crop.variant ? `${markers.crop.name} (${markers.crop.variant})` : markers.crop.name}
            </p>
            {markers.crop.type === "plant" && markers.crop.harvestStr && <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">
                Expected harvest: {markers.crop.harvestStr}
              </p>}
            {markers.crop.type === "harvest" && <p className="text-[13px] text-emerald-600 font-medium mt-0.5">Expected harvest date</p>}
          </div>
        </div>}

      {markers.weather && <div className="flex items-start gap-2">
          <WIcon
    type={markers.weather}
    cls={`w-4 h-4 flex-shrink-0 mt-0.5 ${weatherColor(markers.weather)}`}
  />
          <div>
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-700)]">Weather note</p>
            <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">
              {markers.weather === "storm" ? "Heavy rain with thunderstorm expected. Avoid planting and protect harvested crops." : markers.weather === "heat" ? "Unusually hot days. Water crops early in the morning and monitor soil moisture." : "Rain is expected. Clear drainage before planting."}
            </p>
          </div>
        </div>}

      {markers.event && <div className="flex items-start gap-2">
          <CalendarClock className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-700)]">Market note</p>
            <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">{markers.event}</p>
          </div>
        </div>}

      <button
    onClick={() => navigate("/assess")}
    className="w-full flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors"
  >
        Check this crop
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>;
};
const CropCard = ({ crop, onViewDetail }) => {
  const [open, setOpen] = useState(false);
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      {
    /* Summary row */
  }
      <div className="flex items-start gap-3 p-4">
        <CommodityIllustration commodityId={crop.id} className="w-10 h-10 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">{crop.name}</p>
            {(() => {
    const vs = getVariants(crop.name);
    if (vs.length === 0) return null;
    return <span className="text-[12px] font-semibold text-[var(--hw-green-700)] whitespace-nowrap">
                  {vs.length} {vs.length === 1 ? "variety" : "varieties"}
                </span>;
  })()}
          </div>
          <p className="text-[13px] text-[var(--hw-neutral-900)]">{crop.summary}</p>
          {crop.bestVariety && <p className="text-[12px] font-medium text-[var(--hw-green-700)]">
              Good variety: {crop.bestVariety}
            </p>}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            <p className="text-[12px] text-[var(--hw-neutral-900)]">
              Plant: <span className="font-medium text-[var(--hw-neutral-700)]">{crop.plantWindow}</span>
            </p>
            <p className="text-[12px] text-[var(--hw-neutral-900)]">
              Harvest: <span className="font-medium text-[var(--hw-neutral-700)]">{crop.harvestWindow}</span>
            </p>
          </div>
        </div>
      </div>

      {
    /* Accordion toggle */
  }
      <button
    onClick={() => setOpen((v) => !v)}
    className="w-full flex items-center justify-between px-4 py-2.5 border-t border-[var(--hw-neutral-100)] text-[13px] font-medium text-[var(--hw-green-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
        <span>Why this is a good crop this month</span>
        {open ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
      </button>

      {open && <div className="px-4 pt-3 pb-4 bg-[var(--hw-neutral-50)] space-y-2.5">
          {crop.reasons.map((r) => {
    const Icon = FACTOR_ICONS[r.label];
    const color = FACTOR_COLORS[r.label] ?? "text-[var(--hw-neutral-900)]";
    return <div key={r.label} className="flex items-start gap-2">
                {Icon && <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${color}`} />}
                <div className="flex-1 min-w-0">
                  <span className={`text-[12px] font-semibold ${color}`}>{r.label}</span>
                  <span className="text-[13px] text-[var(--hw-neutral-400)]"> · </span>
                  <span className="text-[13px] text-[var(--hw-neutral-900)]">{r.text}</span>
                </div>
              </div>;
  })}
          {
    /* View detailed factors button */
  }
          <div className="pt-1">
            <button
    onClick={() => onViewDetail(crop)}
    className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
  >
              View detailed factors
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>}
    </div>;
};
function extractPrice(text) {
  const m = text.match(/₱(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 50;
}
function priceTrend(text) {
  const lower = text.toLowerCase();
  if (lower.includes("up") || lower.includes("rising")) return "rising";
  if (lower.includes("falling") || lower.includes("down")) return "falling";
  return "stable";
}
function makeSparkline(basePrice, trend) {
  const points = [];
  let current = basePrice;
  const slope = trend === "rising" ? -0.6 : trend === "falling" ? 0.6 : 0;
  for (let i = 6; i >= 0; i--) {
    const variance = (Math.random() - 0.5) * 4;
    current = basePrice + slope * i + variance;
    points.unshift({ day: 7 - i, price: Math.max(1, Math.round(current)) });
  }
  points[6].price = basePrice;
  return points;
}
function extractSupplyVolumes(text) {
  const nums = [...text.matchAll(/(\d+(?:\.\d+)?)\s*ton/gi)].map((m) => parseFloat(m[1]));
  if (nums.length >= 2) return { thisWeek: nums[0], lastWeek: nums[1] };
  if (nums.length === 1) return { thisWeek: nums[0], lastWeek: nums[0] + 4 };
  return { thisWeek: 12, lastWeek: 18 };
}
function productionLevel(text) {
  const lower = text.toLowerCase();
  if (lower.includes("peak") || lower.includes("high")) return "high";
  if (lower.includes("moderate") || lower.includes("usual")) return "moderate";
  return "low";
}
function weatherRisk(text) {
  const lower = text.toLowerCase();
  if (lower.includes("no heavy") || lower.includes("dry") || lower.includes("suitable")) return "low";
  if (lower.includes("heavy") || lower.includes("storm")) return "high";
  return "moderate";
}
const CropDetailView = ({ crop, onBack }) => {
  const navigate = useNavigate();
  const priceReason = crop.reasons.find((r) => r.label === "Price");
  const supplyReason = crop.reasons.find((r) => r.label === "Supply");
  const productionReason = crop.reasons.find((r) => r.label === "Production");
  const weatherReason = crop.reasons.find((r) => r.label === "Weather");
  const basePrice = extractPrice(priceReason?.text ?? "");
  const trend = priceTrend(priceReason?.text ?? "");
  const actualPoints = makeSparkline(basePrice, trend).map((p, i) => ({
    label: i === 0 ? "7d ago" : i === 6 ? "Today" : `Day ${i + 1}`,
    price: p.price
  }));
  const pricePoints = buildPricePoints(
    actualPoints.map((p) => ({ label: p.label, price: p.price })),
    basePrice,
    trend,
    Math.round(basePrice * 0.96),
    Math.round(basePrice * 1.08),
    7
  );
  const priceTabData = {
    currentPrice: basePrice,
    previousPrice: actualPoints[0].price,
    market: "DFTC",
    direction: trend,
    directionLabel: trend === "rising" ? "Price may rise" : trend === "falling" ? "Price may fall" : "Price likely stable",
    forecastRange: `\u20B1${Math.round(basePrice * 0.96)}\u2013\u20B1${Math.round(basePrice * 1.08)}/kg`,
    points: pricePoints,
    summary: priceReason?.text ?? ""
  };
  const { thisWeek, lastWeek } = extractSupplyVolumes(supplyReason?.text ?? "");
  const arrivalTabData = getArrivalData(crop.id, supplyReason?.text);
  Object.assign(arrivalTabData, {
    thisWeek,
    lastWeek,
    trend: thisWeek < lastWeek ? "lower" : thisWeek > lastWeek ? "higher" : "same"
  });
  const prodLevel = productionLevel(productionReason?.text ?? "");
  const prodTabData = getProductionData(crop.id);
  Object.assign(prodTabData, { level: prodLevel, summary: productionReason?.text ?? prodTabData.summary });
  const wRisk = weatherRisk(weatherReason?.text ?? "");
  const weatherTabData = getWeatherData(wRisk, crop.name);
  if (weatherReason?.text) weatherTabData.summary = weatherReason.text;
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-4xl space-y-5">

        {
    /* Breadcrumb */
  }
        <Breadcrumb
    items={[
      { label: "Crop Calendar", onClick: onBack },
      { label: "Good Crops to Plant", onClick: onBack },
      { label: crop.name }
    ]}
  />

        {
    /* Crop header */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
          <div className="flex items-start gap-4">
            <CommodityIllustration commodityId={crop.id} className="w-16 h-16 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-[20px] font-bold text-[var(--hw-neutral-900)]">{crop.name}</h1>
              <p className="text-[14px] text-[var(--hw-neutral-900)] mt-0.5">{crop.summary}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
                <div>
                  <span className="text-[12px] text-[var(--hw-neutral-900)] font-medium">Plant window</span>
                  <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{crop.plantWindow}</p>
                </div>
                <div>
                  <span className="text-[12px] text-[var(--hw-neutral-900)] font-medium">Harvest window</span>
                  <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{crop.harvestWindow}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {
    /* Detailed factor tabs — inline, no Profitability (no crop plan in this context) */
  }
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)] mb-3">Detailed Factors</h2>
          <FactorDetailTabs
    price={priceTabData}
    arrival={arrivalTabData}
    production={prodTabData}
    weather={weatherTabData}
    defaultTab="price"
    commodityId={crop.id}
    commodityName={crop.name}
  />
        </div>

        {
    /* CTA */
  }
        <button
    onClick={() => navigate(`/assess?commodity=${crop.id}`)}
    className="w-full flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-3 rounded-xl text-[14px] font-semibold hover:bg-[var(--hw-green-800)] transition-colors"
  >
          Assess this crop
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>;
};
function RecommendationPage() {
  const navigate = useNavigate();
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(8);
  const [selectedDay, setSelectedDay] = useState(null);
  const [detailCrop, setDetailCrop] = useState(null);
  const key = monthKey(viewYear, viewMonth);
  const dayMarkers = CALENDAR_DATA[key] ?? {};
  const crops = MONTH_CROPS[key] ?? [];
  const monthName = MONTH_NAMES[viewMonth - 1];
  const selMarkers = selectedDay !== null ? dayMarkers[selectedDay] ?? null : null;
  const showDetail = selMarkers !== null && hasAnyMarker(selMarkers);
  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else setViewMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else setViewMonth((m) => m + 1);
    setSelectedDay(null);
  };
  const handleSelectDay = (day) => setSelectedDay((d) => d === day ? null : day);
  if (detailCrop !== null) {
    return <CropDetailView
      crop={detailCrop}
      onBack={() => setDetailCrop(null)}
    />;
  }
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-4xl space-y-6">

        {
    /* ── Header ── */
  }
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
              Crop Calendar
            </h1>
            <div className="flex items-center gap-1.5 text-[var(--hw-neutral-700)] flex-shrink-0 mt-1">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-[13px] whitespace-nowrap">Updated today at 7:30 AM</span>
            </div>
          </div>
          <p className="text-[15px] text-[var(--hw-neutral-900)] mt-0.5">
            Track crop schedules and harvest timing.
          </p>
        </div>

        {
    /* ── Crop Calendar ── */
  }
        <section>
          <div className={`md:grid md:gap-5 md:items-start ${showDetail ? "md:grid-cols-[1fr_288px]" : ""}`}>

            {
    /* Calendar card */
  }
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
              {
    /* Month navigator */
  }
              <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)] transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <p className="font-semibold text-[var(--hw-neutral-900)]">
                  {MONTH_NAMES[viewMonth - 1]} {viewYear}
                </p>
                <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)] transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <CalendarGrid
    year={viewYear}
    month={viewMonth}
    selectedDay={selectedDay}
    onSelectDay={handleSelectDay}
  />

              {
    /* Legend */
  }
              <div className="flex items-center gap-x-3 mt-4 pt-3 border-t border-[var(--hw-neutral-100)]">
                <div className="flex items-center gap-1">
                  <CloudRain className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span className="text-[12px] text-[var(--hw-neutral-900)] whitespace-nowrap">Light rain</span>
                </div>
                <div className="flex items-center gap-1">
                  <TwoToneStormIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-[12px] text-[var(--hw-neutral-900)] whitespace-nowrap">Heavy rain</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                  <span className="text-[12px] text-[var(--hw-neutral-900)] whitespace-nowrap">Hot days</span>
                </div>
                <div className="flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="text-[12px] text-[var(--hw-neutral-900)] whitespace-nowrap">Events</span>
                </div>
              </div>
            </div>

            {
    /* Selected date card — only when a marked day is tapped */
  }
            {showDetail && selectedDay !== null && selMarkers !== null && <div className="mt-4 md:mt-0">
                <SelectedDateCard year={viewYear} month={viewMonth} day={selectedDay} markers={selMarkers} />
              </div>}
          </div>
        </section>

        {
    /* ── Good crops to plant in [Month] ── */
  }
        {crops.length > 0 && <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">
                Good crops to plant in {monthName}
              </h2>
              <button
    onClick={() => navigate("/assess")}
    className="text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity flex-shrink-0 ml-3"
  >
                View all crops
              </button>
            </div>
            <div className="space-y-3">
              {crops.slice(0, 3).map((crop) => <CropCard key={crop.id} crop={crop} onViewDetail={setDetailCrop} />)}
            </div>
          </section>}

        {
    /* ── Weather note ── */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-blue-50 rounded-lg flex-shrink-0 mt-0.5">
              <CloudRain className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Weather note</p>
              <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">
                Rain is expected this week. Clear drainage before planting.
              </p>
            </div>
            <button
    onClick={() => navigate("/market/weather")}
    className="flex-shrink-0 text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity whitespace-nowrap"
  >
              View weather
            </button>
          </div>
        </div>

        {
    /* ── Check crop CTA ── */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[var(--hw-green-50)] rounded-xl flex-shrink-0">
              <Sprout className="w-4 h-4 text-[var(--hw-green-700)]" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Check a crop before planting</p>
              <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">
                Enter your crop, farm size, cost, and expected harvest to get a recommendation.
              </p>
            </div>
          </div>
          <button
    onClick={() => navigate("/assess")}
    className="w-full flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors"
  >
            Start check
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>;
}
export {
  RecommendationPage as default
};
