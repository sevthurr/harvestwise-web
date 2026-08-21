import { useRef } from "react";
import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudLightning,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const RISK_CFG = {
  Suitable: { Icon: CheckCircle2, color: "text-emerald-700", dot: "bg-emerald-500", label: "Suitable" },
  Caution: { Icon: AlertTriangle, color: "text-amber-700", dot: "bg-amber-400", label: "Caution" },
  Severe: { Icon: AlertOctagon, color: "text-red-600", dot: "bg-red-500", label: "Severe" }
};

function _mapWeatherConditionToIcon(condition) {
  if (!condition) return "cloud";
  
  const cond = condition.toLowerCase();
  if (cond.includes("sunny") || cond.includes("clear")) return "sun";
  if (cond.includes("partly cloudy")) return "cloud-sun";
  if (cond.includes("cloud") && !cond.includes("rain")) return "cloud";
  if (cond.includes("heavy rain") || cond.includes("storm")) return "storm";
  if (cond.includes("rain") || cond.includes("drizzle")) return "rain";
  return "cloud";
}

function WeatherIconEl({ icon, cls = "w-6 h-6" }) {
  if (icon === "sun") return <Sun className={`${cls} text-amber-400`} />;
  if (icon === "cloud-sun") return <CloudSun className={`${cls} text-amber-300`} />;
  if (icon === "cloud") return <Cloud className={`${cls} text-[var(--hw-neutral-600)]`} />;
  if (icon === "rain") return <CloudRain className={`${cls} text-blue-500`} />;
  if (icon === "storm") return <CloudLightning className={`${cls} text-blue-700`} />;
  return <Cloud className={`${cls} text-[var(--hw-neutral-300)]`} />;
}

/**
 * Shared Weather Forecast Component
 * 
 * Displays a 14-day weather forecast carousel with suitability indicators.
 * Used in both the Weather page and the Weather tab in Detailed Factors.
 * 
 * @param {Array} forecast14d - Array of 14 daily forecast objects with structure:
 *   - date: ISO date string
 *   - day_label: "Today", "Mon", "Tue", etc.
 *   - temp_min: number (Celsius)
 *   - temp_max: number (Celsius)
 *   - weather_condition: string
 *   - rain_probability_pct: number
 *   - suitability: "Suitable" | "Caution" | "Severe"
 * @param {boolean} compact - If true, uses smaller card size for detailed factors tab
 */
export function WeatherForecastCarousel({ forecast14d = [], compact = false }) {
  const carouselRef = useRef(null);
  const scrollBy = (dir) => carouselRef.current?.scrollBy({ 
    left: dir * (compact ? 75 : 90), 
    behavior: "smooth" 
  });

  // Show empty state if no forecast data
  if (forecast14d.length === 0) {
    const today = new Date();
    forecast14d = Array.from({ length: 14 }).map((_, i) => {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      return {
        date: futureDate.toISOString().split('T')[0],
        day_label: i === 0 ? "Today" : futureDate.toLocaleDateString('en-US', { weekday: 'short' }),
        temp_min: null,
        temp_max: null,
        weather_condition: null,
        rain_probability_pct: null,
        suitability: "Suitable"
      };
    });
  }

  const cardSize = compact ? "min-w-[68px] px-2.5 py-2.5" : "min-w-[72px] px-2.5 py-3";
  const iconSize = compact ? "w-5 h-5" : "w-6 h-6";
  const dayLabelSize = compact ? "text-[11px]" : "text-[12px]";
  const dateSize = compact ? "text-[10px]" : "text-[12px]";
  const tempSize = compact ? "text-[12px]" : "text-[13px]";
  const tempMinSize = compact ? "text-[11px]" : "text-[12px]";
  const rainSize = compact ? "text-[11px]" : "text-[11px]";
  const suitabilitySize = compact ? "text-[10px]" : "text-[12px]";

  return (
    <div className="relative">
      {/* Left arrow */}
      <button
        onClick={() => scrollBy(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-10 p-1 bg-white border border-[var(--hw-neutral-200)] rounded-full shadow-[var(--shadow-xs)] text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-700)] transition-colors"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Right arrow */}
      <button
        onClick={() => scrollBy(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 z-10 p-1 bg-white border border-[var(--hw-neutral-200)] rounded-full shadow-[var(--shadow-xs)] text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-700)] transition-colors"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Forecast cards carousel */}
      <div
        ref={carouselRef}
        className="flex gap-2 overflow-x-auto px-4 pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {forecast14d.map((day, i) => {
          const rc = RISK_CFG[day.suitability] || RISK_CFG["Suitable"];
          const icon = _mapWeatherConditionToIcon(day.weather_condition);
          const isEmpty = !day.temp_max && !day.temp_min && !day.rain_probability_pct;
          
          return (
            <div
              key={i}
              className={`flex-shrink-0 flex flex-col items-center gap-1 bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] ${cardSize}`}
            >
              <p className={`${dayLabelSize} font-semibold ${isEmpty ? 'text-[var(--hw-neutral-400)]' : 'text-[var(--hw-neutral-700)]'}`}>
                {day.day_label}
              </p>
              <p className={`${dateSize} ${isEmpty ? 'text-[var(--hw-neutral-400)]' : 'text-[var(--hw-neutral-700)]'}`}>
                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              <WeatherIconEl icon={icon} cls={`${iconSize} mt-0.5 ${isEmpty ? 'text-[var(--hw-neutral-300)]' : ''}`} />
              <div className="text-center mt-0.5">
                <p className={`${tempSize} font-bold ${isEmpty ? 'text-[var(--hw-neutral-400)]' : 'text-[var(--hw-neutral-900)]'}`}>
                  {day.temp_max ?? '–'}°
                </p>
                <p className={`${tempMinSize} ${isEmpty ? 'text-[var(--hw-neutral-400)]' : 'text-[var(--hw-neutral-900)]'}`}>
                  {day.temp_min ?? '–'}°
                </p>
              </div>
              <p className={`${rainSize} font-medium ${isEmpty ? 'text-[var(--hw-neutral-400)]' : 'text-blue-600'}`}>
                {day.rain_probability_pct ?? '–'}%
              </p>
              {isEmpty ? (
                <div className="text-[var(--hw-neutral-400)] text-[12px]">–</div>
              ) : (
                <div className={`flex items-center gap-1 ${rc.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${rc.dot}`} />
                  <span className={`${suitabilitySize} font-semibold`}>{rc.label}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {!compact && (
        <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--hw-neutral-900)] justify-center">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>Suitable</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            <span>Caution</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            <span>Severe</span>
          </div>
          <span>· % = rain chance</span>
        </div>
      )}
    </div>
  );
}
