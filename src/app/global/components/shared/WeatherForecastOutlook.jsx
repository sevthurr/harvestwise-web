import { useMemo, useState, useEffect } from "react";

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

// Column order for the "Forecast Data" table that follows the day-card strip.
const FORECAST_TABLE_COLUMNS = ["Day", "Temp Range", "Rainfall", "Humidity", "Wind Speed", "Condition"];

// Rows rendered per page in the "Forecast Data" table. Caps a 14-day window to two
// pages so the detail table stays scannable instead of rendering every day at once.
const FORECAST_TABLE_PAGE_SIZE = 7;

/**
 * ForecastDataTable
 * Per-day forecast detail (temp range, rainfall, humidity, wind speed, condition).
 * Admin-only companion to the day-card strip. Extracted as its own component so:
 * - the shared forecast component stays card-only unless `showForecastTable` is set,
 *   leaving the farmer view untouched;
 * - the table-only field normalization below never runs when the table isn't rendered;
 * - pagination state is scoped to the table and resets when the forecast changes.
 */
function ForecastDataTable({ items }) {
  const [page, setPage] = useState(1);

  // Table-only fields (humidity / wind / condition) are normalized here rather than
  // in the shared card memo, so the farmer path does no extra work.
  const rows = useMemo(
    () =>
      items.map((day, i) => {
        const humidity = day.humidity ?? day.humidity_pct;
        const windSpeed = day.wind_speed_max_kmh ?? day.windSpeed;
        // The cards show weekday names (getDayName collapses "+1d" to "Wed" whenever a
        // real date exists). The table keeps the relative offset so a 14-day window is
        // unambiguous at a glance, with the absolute date alongside.
        const relativeLabel = i === 0 ? 'Today' : day.dayLabel || `+${i}d`;
        return {
          key: `${day.formattedDate}-${relativeLabel}`,
          dayName: relativeLabel,
          formattedDate: day.formattedDate,
          tempMin: day.tempMin,
          tempMax: day.tempMax,
          rainfallMm: day.rainfallMm,
          humidity: humidity != null ? Math.round(Number(humidity)) : null,
          windSpeed: windSpeed != null ? Number(windSpeed).toFixed(1) : null,
          condition: day.weather_condition || day.condition || null,
          suitability: day.suitability,
        };
      }),
    [items]
  );

  const totalPages = Math.ceil(rows.length / FORECAST_TABLE_PAGE_SIZE) || 1;
  // Clamp so a shrinking forecast window (commodity switch) can't strand the user
  // on an out-of-range page.
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * FORECAST_TABLE_PAGE_SIZE;
  const pageRows = rows.slice(start, start + FORECAST_TABLE_PAGE_SIZE);

  // A new forecast window means the stored page is meaningless — restart at page 1.
  useEffect(() => {
    setPage(1);
  }, [items]);

  return (
    <div className="border-t border-[var(--hw-neutral-100)] pt-4 space-y-2.5">
      <div>
        <p className="text-[12px] font-bold text-[var(--hw-neutral-700)] uppercase tracking-wider">
          Forecast Data
        </p>
        <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
          Per-day weather parameters used to classify weather risk.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
            <tr>
              {FORECAST_TABLE_COLUMNS.map((c) => (
                <th
                  key={c}
                  className="px-4 py-3 text-left font-semibold text-[var(--hw-neutral-600)] whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--hw-neutral-100)]">
            {pageRows.map((day) => {
              const suitCfg = day.suitability ? SUITABILITY_STYLES[day.suitability] : null;
              return (
                <tr key={day.key} className="hover:bg-[var(--hw-neutral-50)] transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-semibold text-[var(--hw-neutral-900)]">{day.dayName}</span>
                    <span className="text-[var(--hw-neutral-500)] ml-1.5">{day.formattedDate}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--hw-neutral-800)]">
                    {day.tempMin != null && day.tempMax != null ? `${day.tempMin}° – ${day.tempMax}°C` : "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--hw-neutral-800)]">
                    {day.rainfallMm != null ? `${day.rainfallMm} mm` : "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--hw-neutral-800)]">
                    {day.humidity != null ? `${day.humidity}%` : "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--hw-neutral-800)]">
                    {day.windSpeed != null ? `${day.windSpeed} km/h` : "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {day.condition ? (
                      <span className="text-[var(--hw-neutral-800)] font-medium">{day.condition}</span>
                    ) : suitCfg ? (
                      <span className={`inline-flex items-center gap-1.5 font-semibold ${suitCfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${suitCfg.dot}`} />
                        {suitCfg.label}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 pt-1">
          <p className="text-[12px] text-[var(--hw-neutral-600)]">
            Showing {start + 1}–{Math.min(start + FORECAST_TABLE_PAGE_SIZE, rows.length)} of {rows.length} days
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="px-3 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1.5 text-[12px] border rounded-lg transition-colors ${
                  p === currentPage
                    ? "border-[var(--hw-green-600)] bg-[var(--hw-green-700)] text-white"
                    : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="px-3 py-1.5 text-[12px] border border-[var(--hw-neutral-200)] rounded-lg text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * WeatherForecastOutlook
 * Shared 14-day weather forecast container used across Admin and Farmer interfaces.
 * Features:
 * - Clean cards with Day of week, formatted date, 3D weather visual, high/low temp, and precipitation
 * - Optional paginated "Forecast Data" table below the cards exposing the full per-day
 *   detail (temp range, rainfall, humidity, wind speed, condition) for review.
 *   Opt-in via showForecastTable — admin-only; the farmer view stays card-only.
 * - Native horizontal swipe/trackpad/mobile touch scroll without visible scrollbar track
 *   (pass showScrollbar to render a visible native scrollbar instead)
 * - Fully responsive across mobile, tablet, and desktop
 */
export function WeatherForecastOutlook({
  title = "14-Day Weather Forecast Outlook",
  subtitle = "Estimated weather parameters and risks.",
  forecast = [],
  showSuitability = false,
  showScrollbar = false,
  showForecastTable = false,
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
        // Raw relative label from the API ("+1d"), kept alongside the resolved
        // weekday `dayName` for consumers that prefer the offset.
        dayLabel: dayLabel || `+${i}d`,
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

      {/* Cards Container — hidden scrollbars by default; visible native scrollbar when showScrollbar */}
      {items.length > 0 ? (
        <div
          className={`flex gap-2.5 sm:gap-3 overflow-x-auto pb-1 pt-0.5 select-none ${showScrollbar ? "" : "no-scrollbar"}`}
          style={
            showScrollbar
              ? { WebkitOverflowScrolling: "touch" }
              : {
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  WebkitOverflowScrolling: "touch",
                }
          }
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

      {/* Forecast Data Table — full per-day detail behind the card overview.
          Opt-in (showForecastTable) so the farmer view keeps its card-only layout. */}
      {showForecastTable && items.length > 0 && <ForecastDataTable items={items} />}
    </div>
  );
}

export default WeatherForecastOutlook;
