import { useRef } from "react";
import { useNavigate } from "react-router";
import {
  RefreshCw,
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudLightning,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Sprout,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { CommodityIllustration } from "../components/market/CommodityIllustrations";
const FORECAST_14D = [
  { dayLabel: "Today", date: "Jul 11", icon: "rain", tempMin: 25, tempMax: 28, rainPct: 70, risk: "Caution" },
  { dayLabel: "Sun", date: "Jul 12", icon: "storm", tempMin: 24, tempMax: 27, rainPct: 90, risk: "Severe" },
  { dayLabel: "Mon", date: "Jul 13", icon: "storm", tempMin: 24, tempMax: 27, rainPct: 88, risk: "Severe" },
  { dayLabel: "Tue", date: "Jul 14", icon: "rain", tempMin: 25, tempMax: 28, rainPct: 65, risk: "Caution" },
  { dayLabel: "Wed", date: "Jul 15", icon: "cloud", tempMin: 26, tempMax: 29, rainPct: 45, risk: "Suitable" },
  { dayLabel: "Thu", date: "Jul 16", icon: "cloud-sun", tempMin: 27, tempMax: 30, rainPct: 30, risk: "Suitable" },
  { dayLabel: "Fri", date: "Jul 17", icon: "sun", tempMin: 27, tempMax: 31, rainPct: 15, risk: "Suitable" },
  { dayLabel: "Sat", date: "Jul 18", icon: "sun", tempMin: 28, tempMax: 33, rainPct: 10, risk: "Caution" },
  { dayLabel: "Sun", date: "Jul 19", icon: "sun", tempMin: 28, tempMax: 33, rainPct: 10, risk: "Caution" },
  { dayLabel: "Mon", date: "Jul 20", icon: "sun", tempMin: 28, tempMax: 32, rainPct: 15, risk: "Caution" },
  { dayLabel: "Tue", date: "Jul 21", icon: "cloud", tempMin: 27, tempMax: 30, rainPct: 40, risk: "Suitable" },
  { dayLabel: "Wed", date: "Jul 22", icon: "rain", tempMin: 26, tempMax: 29, rainPct: 60, risk: "Caution" },
  { dayLabel: "Thu", date: "Jul 23", icon: "rain", tempMin: 25, tempMax: 28, rainPct: 65, risk: "Caution" },
  { dayLabel: "Fri", date: "Jul 24", icon: "cloud-sun", tempMin: 27, tempMax: 30, rainPct: 35, risk: "Suitable" }
];
const CROP_ADVISORIES = [
  {
    id: "kamatis",
    name: "Kamatis",
    variant: "Diamante Big",
    status: "Planted",
    risk: "Severe",
    headline: "Heavy rain may affect your crop this week.",
    dateRange: "Jul 12\u201313 \xB7 Heavy rain expected",
    actions: [
      "Clear drainage around the plants.",
      "Avoid heavy field work during strong rain.",
      "Check for waterlogging after rainfall."
    ],
    why: "Kamatis is sensitive to prolonged rain and waterlogged soil."
  },
  {
    id: "ampalaya",
    name: "Ampalaya",
    variant: "Galaxy",
    status: "Planted",
    risk: "Caution",
    headline: "Heavy rain expected. Check drainage around vines.",
    dateRange: "Jul 12\u201313 \xB7 Heavy rain expected",
    actions: [
      "Clear drainage around vines.",
      "Avoid waterlogging near roots.",
      "Check vines for damage after prolonged rain."
    ],
    why: "Ampalaya is adaptable but sensitive to waterlogged soil."
  }
];
const GENERAL_INSIGHT = {
  location: "Barangay Buda, Davao City",
  summary: "Heavy rain is expected on Jul 12\u201313. Field work and planting may be delayed.",
  bullets: [
    "2 planted crops may be affected.",
    "Clear drainage before the heaviest rain.",
    "Delay heavy field work during strong rain."
  ]
};
const RISK_CFG = {
  Suitable: { Icon: CheckCircle2, color: "text-emerald-700", dot: "bg-emerald-500", label: "Suitable" },
  Caution: { Icon: AlertTriangle, color: "text-amber-700", dot: "bg-amber-400", label: "Caution" },
  Severe: { Icon: AlertOctagon, color: "text-red-600", dot: "bg-red-500", label: "Severe" }
};
function WeatherIconEl({ icon, cls = "w-6 h-6" }) {
  if (icon === "sun") return <Sun className={`${cls} text-amber-400`} />;
  if (icon === "cloud-sun") return <CloudSun className={`${cls} text-amber-300`} />;
  if (icon === "cloud") return <Cloud className={`${cls} text-[var(--hw-neutral-600)]`} />;
  if (icon === "rain") return <CloudRain className={`${cls} text-blue-500`} />;
  if (icon === "storm") return <CloudLightning className={`${cls} text-blue-700`} />;
  return <Sun className={`${cls} text-amber-400`} />;
}
const CropWeatherCard = ({ crop }) => {
  const rc = RISK_CFG[crop.risk];
  const RiskIcon = rc.Icon;
  const displayName = crop.variant ? `${crop.name} (${crop.variant})` : crop.name;
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      {
    /* Header */
  }
      <div className="flex items-start gap-3 p-4 pb-3">
        <CommodityIllustration commodityId={crop.id} className="w-9 h-9 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">{displayName}</p>
          <p className="text-[12px] text-[var(--hw-neutral-900)]">Status: {crop.status}</p>
          <div className={`flex items-start gap-1.5 mt-1 ${rc.color}`}>
            <RiskIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] font-semibold leading-snug">{crop.headline}</p>
          </div>
          <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">{crop.dateRange}</p>
        </div>
      </div>

      {
    /* Actions */
  }
      <div className="px-4 pb-3 space-y-1.5">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide mb-2">
          Recommended actions
        </p>
        {crop.actions.map((action, i) => <div key={i} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--hw-neutral-900)] flex-shrink-0 mt-1.5" />
            <p className="text-[13px] text-[var(--hw-neutral-900)]">{action}</p>
          </div>)}
      </div>

      {
    /* Why */
  }
      <div className="px-4 py-3 border-t border-[var(--hw-neutral-100)]">
        <p className="text-[12px] text-[var(--hw-neutral-900)] italic">"{crop.why}"</p>
      </div>
    </div>;
};
function MarketWeatherPage() {
  const navigate = useNavigate();
  const carouselRef = useRef(null);
  const hasCrops = CROP_ADVISORIES.length > 0;
  const scrollBy = (dir) => carouselRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-3xl space-y-6">

        {
    /* ── Header ── */
  }
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
              Weather
            </h1>
            <div className="flex items-center gap-1.5 text-[var(--hw-neutral-700)] flex-shrink-0 mt-1">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-[13px] whitespace-nowrap">Updated today at 7:30 AM</span>
            </div>
          </div>
          <p className="text-[15px] text-[var(--hw-neutral-900)] mt-0.5">
            See how weather may affect your planted crops.
          </p>
        </div>

        {
    /* ── 1. 14-day forecast carousel ── */
  }
        <section className="space-y-2">
          <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">14-day forecast</h2>

          <div className="relative">
            {
    /* Left arrow */
  }
            <button
    onClick={() => scrollBy(-1)}
    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-10 p-1 bg-white border border-[var(--hw-neutral-200)] rounded-full shadow-[var(--shadow-xs)] text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-700)] transition-colors"
    aria-label="Scroll left"
  >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {
    /* Right arrow + edge fade */
  }
            <button
    onClick={() => scrollBy(1)}
    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 z-10 p-1 bg-white border border-[var(--hw-neutral-200)] rounded-full shadow-[var(--shadow-xs)] text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-700)] transition-colors"
    aria-label="Scroll right"
  >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <div
    ref={carouselRef}
    className="flex gap-2 overflow-x-auto px-4 pb-1"
    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
  >
              {FORECAST_14D.map((day, i) => {
    const rc = RISK_CFG[day.risk];
    return <div
      key={i}
      className="flex-shrink-0 flex flex-col items-center gap-1 bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-2.5 py-3 min-w-[72px]"
    >
                    <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)]">{day.dayLabel}</p>
                    <p className="text-[12px] text-[var(--hw-neutral-700)]">{day.date}</p>
                    <WeatherIconEl icon={day.icon} cls="w-6 h-6 mt-0.5" />
                    <div className="text-center mt-0.5">
                      <p className="text-[13px] font-bold text-[var(--hw-neutral-900)]">{day.tempMax}°</p>
                      <p className="text-[12px] text-[var(--hw-neutral-900)]">{day.tempMin}°</p>
                    </div>
                    <p className="text-[11px] font-medium text-blue-600">{day.rainPct}%</p>
                    <div className={`flex items-center gap-1 ${rc.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${rc.dot}`} />
                      <span className="text-[12px] font-semibold">{rc.label}</span>
                    </div>
                  </div>;
  })}
            </div>
          </div>
        </section>

        {
    /* ── 2. General weather insight ── */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
          <div>
            <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Weather insight</p>
            <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">{GENERAL_INSIGHT.location}</p>
          </div>
          <p className="text-[14px] text-[var(--hw-neutral-900)] leading-snug">
            {GENERAL_INSIGHT.summary}
          </p>
          <div className="pt-2 border-t border-[var(--hw-neutral-100)] space-y-1.5">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">
              What this means
            </p>
            {GENERAL_INSIGHT.bullets.map((b, i) => <div key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--hw-neutral-900)] flex-shrink-0 mt-1.5" />
                <p className="text-[13px] text-[var(--hw-neutral-900)]">{b}</p>
              </div>)}
          </div>
        </div>

        {
    /* ── 3. Crop-specific advisories ── */
  }
        {hasCrops ? <section className="space-y-3">
            <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Your crop advisories</h2>
            {CROP_ADVISORIES.map((crop) => <CropWeatherCard key={crop.id} crop={crop} />)}
          </section> : <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-6 text-center space-y-3">
            <Sprout className="w-8 h-8 text-[var(--hw-neutral-300)] mx-auto" />
            <div>
              <p className="text-[15px] font-semibold text-[var(--hw-neutral-700)]">No saved crops yet</p>
              <p className="text-[13px] text-[var(--hw-neutral-900)] mt-1">
                Add a crop plan to get weather advice for your farm.
              </p>
            </div>
            <button
    onClick={() => navigate("/farmer/assess")}
    className="inline-flex items-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors"
  >
              Add crop plan
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>}

        {
    /* ── 4. Notes ── */
  }
        <div className="space-y-1">
          <p className="text-[12px] text-[var(--hw-neutral-700)]">
            Forecast is a guide only. Actual weather may change.
          </p>
          <p className="text-[12px] text-[var(--hw-neutral-700)]">Source: Open-Meteo</p>
        </div>

      </div>
    </div>;
}
export {
  MarketWeatherPage as default
};
