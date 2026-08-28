import { useRef } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
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
import { apiGet, parseResponse } from "../../global/api";
import { Skeleton } from "../components/shared/FarmerSkeletons";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
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

  const { data: weatherData, isLoading: loading, error } = useQuery({
    queryKey: ["weather", "advisory"],
    queryFn: async () => {
      const response = await apiGet('/weather/advisory?latitude=7.0722&longitude=125.6131');
      if (!response.ok) throw new Error('Failed to fetch weather forecast');
      const data = await parseResponse(response);
      const daily = data.daily_forecasts || [];
      const forecast14 = daily.map((d, i) => ({
        dayLabel: d.day_label || (i === 0 ? 'Today' : `+${i}d`),
        date: d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-',
        icon: _mapWeatherConditionToIcon(d.weather_condition),
        tempMin: d.temperature_min != null ? Math.round(d.temperature_min) : null,
        tempMax: d.temperature_max != null ? Math.round(d.temperature_max) : null,
        rainPct: d.rain_probability_pct != null ? Math.round(d.rain_probability_pct) : 0,
        risk: d.suitability ? (d.suitability === 'Severe' ? 'high' : d.suitability === 'Caution' ? 'moderate' : 'low') : 'low'
      }));

      return {
        updated_at: new Date().toISOString(),
        location_name: data.location || 'Davao City',
        forecast_14d: forecast14,
        weather_summary: data.weather_risk_level ? `7-day weather suitability forecast: ${data.weather_risk_level}` : '7-day weather forecast for Davao City',
        crop_advisories: (data.advisories || []).map((adv, idx) => ({
          crop_id: adv.commodity_id || `crop-${idx}`,
          crop_name: adv.commodity_name || 'Crop',
          status: 'Monitoring',
          risk_level: adv.suitability || 'Suitable',
          headline: adv.headline || `${adv.suitability || 'Suitable'} weather conditions`,
          date_range: 'Next 7 Days',
          recommended_actions: adv.recommended_actions || ['Monitor field drainage and moisture'],
          crop_sensitivity: adv.explanation || null
        })),
        has_crops: (data.advisories || []).length > 0
      };
    },
    staleTime: 1000 * 60 * 30,
  });

  const scrollBy = (dir) => carouselRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });

  if (loading) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-7 w-32 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        {/* Main Weather Card Skeleton */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-2xl flex-shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-24 rounded" />
              <Skeleton className="h-3 w-40 rounded" />
            </div>
          </div>
          {/* 14-day carousel skeleton */}
          <div className="flex gap-2 pt-2 overflow-hidden">
            <Skeleton className="h-24 w-20 rounded-xl flex-shrink-0" />
            <Skeleton className="h-24 w-20 rounded-xl flex-shrink-0" />
            <Skeleton className="h-24 w-20 rounded-xl flex-shrink-0" />
            <Skeleton className="h-24 w-20 rounded-xl flex-shrink-0" />
          </div>
        </div>
        {/* Advisories Skeleton */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-3 animate-pulse">
          <Skeleton className="h-5 w-44 rounded" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const hasCrops = weatherData?.has_crops ?? false;
  const forecast14d = weatherData?.forecast_14d ?? [];
  const cropAdvisories = weatherData?.crop_advisories ?? [];
  const locationName = weatherData?.location_name ?? '-';
  const weatherSummary = weatherData?.weather_summary ?? 'No weather data available';
  const updatedAt = weatherData?.updated_at ? new Date(weatherData.updated_at).toLocaleTimeString() : 'Unknown';

  return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-6">

        {/* ── Header ── */}
        <div>
          <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
            Weather
          </h1>
          <p className="text-[15px] text-[var(--hw-neutral-900)] mt-0.5">
            See how weather may affect your planted crops.
          </p>
        </div>

        {/* ── Top Risk Banner ── */}
        {weatherData?.risk_level ? (
          <div className="rounded-xl border px-4 py-3 bg-emerald-50 border-emerald-200">
            <div className="flex items-start gap-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-bold text-emerald-700">{weatherData.risk_level}</p>
                <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">{weatherSummary}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] text-[var(--hw-neutral-900)]">
            <p className="text-[13px] font-medium">No weather guidance available.</p>
          </div>
        )}

        {/* ── 1. 14-day forecast carousel ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">14-Day Forecast</p>
            <div className="flex gap-1 lg:hidden">
              <button
                onClick={() => scrollBy(-1)}
                className="p-1 rounded-full border border-[var(--hw-neutral-200)] bg-white hover:bg-[var(--hw-neutral-50)] shadow-[var(--shadow-xs)] transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-[var(--hw-neutral-900)]" />
              </button>
              <button
                onClick={() => scrollBy(1)}
                className="p-1 rounded-full border border-[var(--hw-neutral-200)] bg-white hover:bg-[var(--hw-neutral-50)] shadow-[var(--shadow-xs)] transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-3.5 h-3.5 text-[var(--hw-neutral-900)]" />
              </button>
            </div>
          </div>

          <div
            ref={carouselRef}
            className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-14 lg:gap-2 lg:overflow-visible"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {forecast14d.length > 0 ? forecast14d.map((day, i) => {
              const rc = RISK_CFG[day.suitability] || RISK_CFG.Suitable;
              const icon = _mapWeatherConditionToIcon(day.weather_condition);
              return (
                <div
                  key={i}
                  className="flex-shrink-0 lg:flex-shrink w-[76px] lg:w-auto flex flex-col items-center justify-between gap-1.5 bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-2.5 hover:border-[var(--hw-neutral-300)] transition-colors"
                >
                  <div className="text-center">
                    <p className="text-[11px] font-semibold text-[var(--hw-neutral-900)]">{day.day_label}</p>
                    <p className="text-[10px] text-[var(--hw-neutral-600)]">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <WeatherIconEl icon={icon} cls="w-6 h-6 my-0.5" />
                  <div className="text-center">
                    <p className="text-[13px] font-bold text-[var(--hw-neutral-900)]">{day.temp_max ?? '–'}°</p>
                    <p className="text-[11px] text-[var(--hw-neutral-500)]">{day.temp_min ?? '–'}°</p>
                  </div>
                  <p className="text-[11px] font-medium text-[var(--hw-neutral-700)]">{day.rain_probability_pct ?? '–'}%</p>
                  <div className={`flex items-center gap-1 ${rc.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${rc.dot}`} />
                    <span className="text-[10px] font-semibold">{rc.label}</span>
                  </div>
                </div>
              );
            }) : 
              Array.from({ length: 14 }).map((_, i) => {
                const dayLabel = i === 0 ? "Today" : `+${i}d`;
                return (
                  <div
                    key={i}
                    className="flex-shrink-0 lg:flex-shrink w-[76px] lg:w-auto flex flex-col items-center justify-between gap-1.5 bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-2.5 hover:border-[var(--hw-neutral-300)] transition-colors"
                  >
                    <div className="text-center">
                      <p className="text-[11px] font-semibold text-[var(--hw-neutral-900)]">{dayLabel}</p>
                      <p className="text-[10px] text-[var(--hw-neutral-600)]">-</p>
                    </div>
                    <Cloud className="w-6 h-6 my-0.5 text-[var(--hw-neutral-400)]" />
                    <div className="text-center">
                      <p className="text-[13px] font-bold text-[var(--hw-neutral-900)]">-°</p>
                      <p className="text-[11px] text-[var(--hw-neutral-500)]">-°</p>
                    </div>
                    <p className="text-[11px] font-medium text-[var(--hw-neutral-700)]">-%</p>
                    <div className="text-[var(--hw-neutral-500)] text-[10px]">-</div>
                  </div>
                );
              })}
          </div>

          <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--hw-neutral-700)]">
            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /><span>Suitable</span></div>
            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /><span>Caution</span></div>
            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /><span>Severe</span></div>
            <span>· % = rain chance</span>
          </div>
        </section>

        {/* ── 2. General weather insight ── */}
        <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-2">
          <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">Weather Insight · {locationName}</p>
          <p className="text-[13px] text-[var(--hw-neutral-900)] leading-relaxed">
            {weatherSummary}
          </p>
        </div>

        {/* ── 3. Crop-specific advisories ── */}
        <section className="space-y-3">
          <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">Your Crop Advisories</p>
          
          {cropAdvisories.length > 0 ? (
            cropAdvisories.map((crop) => <CropWeatherCard key={crop.crop_id} crop={crop} />)
          ) : (
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-6 text-center space-y-3">
              <Sprout className="w-8 h-8 text-[var(--hw-neutral-300)] mx-auto" />
              <div>
                <p className="text-[15px] font-semibold text-[var(--hw-neutral-700)]">No crop-specific weather advisory available.</p>
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

        {/* ── 4. Notes ── */}
        <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3">
          <p className="text-[11px] text-[var(--hw-neutral-900)] italic">
            Source: Open-Meteo · Forecast is a guide only.
          </p>
        </div>

    </div>;
}
export {
  MarketWeatherPage as default
};
