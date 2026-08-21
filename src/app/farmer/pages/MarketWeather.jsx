import { useRef, useState, useEffect } from "react";
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
const RISK_CFG = {
  Suitable: { Icon: CheckCircle2, color: "text-emerald-700", dot: "bg-emerald-500", label: "Suitable" },
  Caution: { Icon: AlertTriangle, color: "text-amber-700", dot: "bg-amber-400", label: "Caution" },
  Severe: { Icon: AlertOctagon, color: "text-red-600", dot: "bg-red-500", label: "Severe" }
};

function _mapWeatherConditionToIcon(condition) {
  if (!condition) return "sun";
  
  const cond = condition.toLowerCase();
  if (cond.includes("sunny") || cond.includes("clear")) return "sun";
  if (cond.includes("partly cloudy")) return "cloud-sun";
  if (cond.includes("cloud") && !cond.includes("rain")) return "cloud";
  if (cond.includes("heavy rain") || cond.includes("storm")) return "storm";
  if (cond.includes("rain") || cond.includes("drizzle")) return "rain";
  return "sun";
}

function WeatherIconEl({ icon, cls = "w-6 h-6" }) {
  if (icon === "sun") return <Sun className={`${cls} text-amber-400`} />;
  if (icon === "cloud-sun") return <CloudSun className={`${cls} text-amber-300`} />;
  if (icon === "cloud") return <Cloud className={`${cls} text-[var(--hw-neutral-600)]`} />;
  if (icon === "rain") return <CloudRain className={`${cls} text-blue-500`} />;
  if (icon === "storm") return <CloudLightning className={`${cls} text-blue-700`} />;
  return <Sun className={`${cls} text-amber-400`} />;
}

const CropWeatherCard = ({ crop }) => {
  const rc = RISK_CFG[crop.risk_level];
  const RiskIcon = rc.Icon;
  const displayName = crop.variety ? `${crop.crop_name} (${crop.variety})` : crop.crop_name;
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      {
    /* Header */
  }
      <div className="flex items-start gap-3 p-4 pb-3">
        <CommodityIllustration commodityId={crop.crop_id} className="w-9 h-9 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">{displayName}</p>
          <p className="text-[12px] text-[var(--hw-neutral-900)]">Status: {crop.status}</p>
          <div className={`flex items-start gap-1.5 mt-1 ${rc.color}`}>
            <RiskIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] font-semibold leading-snug">{crop.headline}</p>
          </div>
          <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">{crop.date_range}</p>
        </div>
      </div>

      {
    /* Actions */
  }
      <div className="px-4 pb-3 space-y-1.5">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide mb-2">
          Recommended actions
        </p>
        {crop.recommended_actions.map((action, i) => <div key={i} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--hw-neutral-900)] flex-shrink-0 mt-1.5" />
            <p className="text-[13px] text-[var(--hw-neutral-900)]">{action}</p>
          </div>)}
      </div>

      {
    /* Why */
  }
      {crop.crop_sensitivity && <div className="px-4 py-3 border-t border-[var(--hw-neutral-100)]">
        <p className="text-[12px] text-[var(--hw-neutral-900)] italic">"{crop.crop_sensitivity}"</p>
      </div>}
    </div>;
};
function MarketWeatherPage() {
  const navigate = useNavigate();
  const carouselRef = useRef(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWeatherForecast();
  }, []);

  const fetchWeatherForecast = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
      const response = await fetch(`${apiUrl}/crop-plans/weather/forecast`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch weather forecast');
      }

      const data = await response.json();
      setWeatherData(data);
    } catch (err) {
      console.error('Weather forecast fetch error:', err);
      setError(err.message);
      // Set empty state data so UI doesn't crash
      setWeatherData({
        updated_at: new Date().toISOString(),
        location_name: 'Your Farm',
        forecast_14d: [],
        weather_summary: 'No weather data available',
        crop_advisories: [],
        has_crops: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollBy = (dir) => carouselRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--hw-green-700)]"></div>
        <p className="text-sm text-[var(--hw-neutral-700)]">Loading weather data...</p>
      </div>
    </div>;
  }

  const hasCrops = weatherData?.has_crops ?? false;
  const forecast14d = weatherData?.forecast_14d ?? [];
  const cropAdvisories = weatherData?.crop_advisories ?? [];
  const locationName = weatherData?.location_name ?? 'Your Farm';
  const weatherSummary = weatherData?.weather_summary ?? 'No weather data available';
  const updatedAt = weatherData?.updated_at ? new Date(weatherData.updated_at).toLocaleTimeString() : 'Unknown';

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
              <span className="text-[13px] whitespace-nowrap">Updated today at {updatedAt}</span>
            </div>
          </div>
          <p className="text-[15px] text-[var(--hw-neutral-900)] mt-0.5">
            See how weather may affect your planted crops.
          </p>
        </div>

        {
    /* ── 1. 14-day forecast carousel ── Always show section */
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
              {forecast14d.length > 0 ? forecast14d.map((day, i) => {
    const rc = RISK_CFG[day.suitability];
    const icon = _mapWeatherConditionToIcon(day.weather_condition);
    return <div
      key={i}
      className="flex-shrink-0 flex flex-col items-center gap-1 bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-2.5 py-3 min-w-[72px]"
    >
                    <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)]">{day.day_label}</p>
                    <p className="text-[12px] text-[var(--hw-neutral-700)]">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    <WeatherIconEl icon={icon} cls="w-6 h-6 mt-0.5" />
                    <div className="text-center mt-0.5">
                      <p className="text-[13px] font-bold text-[var(--hw-neutral-900)]">{day.temp_max ?? '–'}°</p>
                      <p className="text-[12px] text-[var(--hw-neutral-900)]">{day.temp_min ?? '–'}°</p>
                    </div>
                    <p className="text-[11px] font-medium text-blue-600">{day.rain_probability_pct ?? '–'}%</p>
                    <div className={`flex items-center gap-1 ${rc.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${rc.dot}`} />
                      <span className="text-[12px] font-semibold">{rc.label}</span>
                    </div>
                  </div>;
  }) : 
              // Show skeleton forecast cards when no data
              Array.from({ length: 14 }).map((_, i) => {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    const dayLabel = i === 0 ? "Today" : futureDate.toLocaleDateString('en-US', { weekday: 'short' });
    
    return <div
      key={i}
      className="flex-shrink-0 flex flex-col items-center gap-1 bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-2.5 py-3 min-w-[72px]"
    >
                    <p className="text-[12px] font-semibold text-[var(--hw-neutral-400)]">{dayLabel}</p>
                    <p className="text-[12px] text-[var(--hw-neutral-400)]">{futureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    <Cloud className="w-6 h-6 mt-0.5 text-[var(--hw-neutral-300)]" />
                    <div className="text-center mt-0.5">
                      <p className="text-[13px] font-bold text-[var(--hw-neutral-400)]">–°</p>
                      <p className="text-[12px] text-[var(--hw-neutral-400)]">–°</p>
                    </div>
                    <p className="text-[11px] font-medium text-[var(--hw-neutral-400)]">–%</p>
                    <div className="text-[var(--hw-neutral-400)] text-[12px]">–</div>
                  </div>;
  })}
            </div>
          </div>
        </section>

        {
    /* ── 2. General weather insight ── Always show */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
          <div>
            <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Weather insight</p>
            <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">{locationName}</p>
          </div>
          <p className="text-[14px] text-[var(--hw-neutral-900)] leading-snug">
            {weatherSummary}
          </p>
        </div>

        {
    /* ── 3. Crop-specific advisories ── Always show section */
  }
        <section className="space-y-3">
          <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Your crop advisories</h2>
          
          {cropAdvisories.length > 0 ? (
            cropAdvisories.map((crop) => <CropWeatherCard key={crop.crop_id} crop={crop} />)
          ) : (
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-6 text-center space-y-3">
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
            </div>
          )}
        </section>

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
