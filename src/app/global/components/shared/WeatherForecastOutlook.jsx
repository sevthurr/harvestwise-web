import { useMemo } from "react";

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatForecastDate(dateVal) {
  if (!dateVal) return "-";
  if (typeof dateVal === "string" && dateVal.includes("-")) {
    const parts = dateVal.split("-");
    if (parts.length === 3) {
      const month = MONTHS_SHORT[parseInt(parts[1], 10) - 1] || parts[1];
      return `${month} ${parseInt(parts[2], 10)}`;
    }
  }
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
    }
  } catch {
    // fallback
  }
  return String(dateVal);
}

function getDayName(dateVal, fallbackLabel, index) {
  if (index === 0) return "Today";
  if (fallbackLabel && fallbackLabel !== `+${index}d` && !fallbackLabel.startsWith("+")) {
    return fallbackLabel;
  }
  if (dateVal) {
    try {
      const dateStr = String(dateVal).includes("T") ? dateVal : `${dateVal}T00:00:00`;
      const d = new Date(dateStr);
      if (!isNaN(d.getDay())) {
        return DAYS_SHORT[d.getDay()];
      }
    } catch {
      // fallback
    }
  }
  return fallbackLabel || `Day ${index + 1}`;
}

function getWeatherVisual(day) {
  const cond = String(day.weather_condition || day.condition || "").toLowerCase();
  const rain = Number(day.rainfall_mm ?? 0);

  if (cond.includes("storm") || cond.includes("lightning") || cond.includes("thunder")) return "⛈️";
  if (rain > 5 || cond.includes("heavy rain")) return "🌧️";
  if (rain > 0 || cond.includes("rain") || cond.includes("drizzle") || cond.includes("shower")) return "🌦️";
  if (cond.includes("sunny") || cond.includes("clear")) return "☀️";
  if (cond.includes("partly cloudy") || cond.includes("cloud-sun")) return "⛅";
  if (cond.includes("cloud") || cond.includes("overcast")) return "☁️";

  return rain > 0 ? "🌦️" : "⛅";
}

const SUITABILITY_STYLES = {
  Suitable: { dot: "bg-emerald-500", text: "text-emerald-700", label: "Suitable" },
  Caution: { dot: "bg-amber-400", text: "text-amber-700", label: "Caution" },
  Severe: { dot: "bg-rose-500", text: "text-rose-700", label: "Severe" },
};

/**
 * WeatherForecastOutlook
 * Shared 14-day weather forecast container used across Admin and Farmer interfaces.
 * Features:
 * - Clean cards with Day of week, formatted date, 3D weather visual, high/low temp, and precipitation
 * - Native horizontal swipe/trackpad/mobile touch scroll without visible scrollbar track
 * - Fully responsive across mobile, tablet, and desktop
 */
export function WeatherForecastOutlook({
  title = "14-Day Weather Forecast Outlook",
  subtitle = "Estimated weather parameters and risks.",
  forecast = [],
  showSuitability = false,
  className = "",
  emptyMessage = "No weather forecast data available.",
}) {
  const items = useMemo(() => {
    if (!Array.isArray(forecast)) return [];
    return forecast.map((d, i) => {
      const dayLabel = d.day_label || d.dayLabel;
      const dateVal = d.date;
      const dayName = getDayName(dateVal, dayLabel, i);
      const formattedDate = formatForecastDate(dateVal);
      const tempMax = d.temp_max ?? d.tempMax;
      const tempMin = d.temp_min ?? d.tempMin;
      const rainfallMm = d.rainfall_mm ?? d.rainfallMm;
      const rainPct = d.rain_probability_pct ?? d.rainPct;
      const visual = getWeatherVisual(d);
      const suitability = d.suitability;

      return {
        ...d,
        dayName,
        formattedDate,
        tempMax: tempMax != null ? Math.round(Number(tempMax)) : null,
        tempMin: tempMin != null ? Math.round(Number(tempMin)) : null,
        rainfallMm: rainfallMm != null ? Number(rainfallMm).toFixed(1) : null,
        rainPct: rainPct != null ? Math.round(Number(rainPct)) : null,
        visual,
        suitability,
      };
    });
  }, [forecast]);

  return (
    <div
      className={`bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden p-5 sm:p-6 md:p-8 space-y-4 ${className}`}
    >
      {/* Header */}
      <div>
        <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wide">
          {title}
        </p>
        {subtitle && (
          <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Cards Container with hidden scrollbars, enabling smooth trackpad and mobile touch scrolling */}
      {items.length > 0 ? (
        <div
          className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-1 pt-0.5 no-scrollbar select-none"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {items.map((day, i) => {
            const suitCfg = showSuitability && day.suitability ? SUITABILITY_STYLES[day.suitability] : null;

            return (
              <div
                key={i}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 sm:gap-2 bg-[var(--hw-neutral-50)] rounded-2xl border border-[var(--hw-neutral-200)] px-3 sm:px-4 py-4 sm:py-5 min-w-[86px] sm:min-w-[90px] shadow-[var(--shadow-xs)] hover:border-[var(--hw-neutral-300)] transition-colors"
              >
                <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] text-center">
                  {day.dayName}
                </p>
                <p className="text-[11px] text-[var(--hw-neutral-500)] font-medium text-center -mt-0.5">
                  {day.formattedDate}
                </p>

                <div className="w-9 h-9 my-0.5 flex items-center justify-center text-2xl select-none">
                  {day.visual}
                </div>

                <div className="text-center">
                  <p className="text-[15px] font-bold text-[var(--hw-neutral-900)]">
                    {day.tempMax != null ? `${day.tempMax}°` : "-°"}
                  </p>
                  <p className="text-[12px] text-[var(--hw-neutral-500)] font-medium">
                    {day.tempMin != null ? `${day.tempMin}°` : "-°"}
                  </p>
                </div>

                <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] mt-0.5">
                  {day.rainfallMm != null
                    ? `${day.rainfallMm}mm`
                    : day.rainPct != null
                    ? `${day.rainPct}%`
                    : "-%"}
                </p>

                {suitCfg && (
                  <div className={`flex items-center gap-1 mt-1 text-[10px] font-semibold ${suitCfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${suitCfg.dot}`} />
                    <span>{suitCfg.label}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-[var(--hw-neutral-500)] text-[13px] bg-[var(--hw-neutral-50)]/50 rounded-xl border border-dashed border-[var(--hw-neutral-200)]">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

export default WeatherForecastOutlook;
