import { useMemo, useState, useEffect } from "react";
import {
  Calendar,
  CloudRain,
  Thermometer,
  Sprout,
  Compass,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  evaluateSuitability,
  getTemperatureStatus,
  getRainfallStatus,
  getSuitabilityColor,
  explainRainfall,
  explainTemperature,
  explainGuidance,
} from "./weatherExplanations";

const DAYS_SHORT_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_SHORT_CEB = ["Dom", "Lun", "Mar", "Miy", "Huw", "Biy", "Sab"];
const DAYS_SHORT_TL = ["Lin", "Lun", "Mar", "Miy", "Huw", "Biy", "Sab"];

const DAYS_FULL_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_FULL_CEB = ["Domingo", "Lunes", "Martes", "Miyerkules", "Huwebes", "Biyernes", "Sabado"];
const DAYS_FULL_TL = ["Linggo", "Lunes", "Martes", "Miyerkules", "Huwebes", "Biyernes", "Sabado"];

const MONTHS_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_SHORT_CEB = ["Ene", "Peb", "Mar", "Abr", "May", "Hun", "Hul", "Ago", "Set", "Okt", "Nob", "Dis"];
const MONTHS_SHORT_TL = ["Ene", "Peb", "Mar", "Abr", "May", "Hun", "Hul", "Ago", "Set", "Okt", "Nob", "Dis"];

function parseDateParts(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === "string") {
    const isoMatch = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10);
      const day = parseInt(isoMatch[3], 10);
      const d = new Date(year, month - 1, day);
      return { year, month, day, dayOfWeek: d.getDay() };
    }
  }
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        dayOfWeek: d.getDay(),
      };
    }
  } catch {
    // fallback
  }
  return null;
}

function formatForecastDate(dateVal, lang = "ceb") {
  const parts = parseDateParts(dateVal);
  if (!parts) return String(dateVal || "-");

  const mList = lang === "ceb" ? MONTHS_SHORT_CEB : lang === "tl" ? MONTHS_SHORT_TL : MONTHS_SHORT_EN;
  const monthName = mList[parts.month - 1] || MONTHS_SHORT_EN[parts.month - 1] || parts.month;
  return `${monthName} ${parts.day}`;
}

function getDayName(dateVal, fallbackLabel, index, lang = "ceb") {
  if (index === 0) {
    return lang === "ceb" ? "Karon" : lang === "tl" ? "Ngayon" : "Today";
  }

  const parts = parseDateParts(dateVal);
  if (parts && parts.dayOfWeek != null) {
    const dList = lang === "ceb" ? DAYS_SHORT_CEB : lang === "tl" ? DAYS_SHORT_TL : DAYS_SHORT_EN;
    return dList[parts.dayOfWeek] || DAYS_SHORT_EN[parts.dayOfWeek];
  }

  if (fallbackLabel && fallbackLabel !== `+${index}d` && !fallbackLabel.startsWith("+")) {
    return fallbackLabel;
  }

  return `+${index}d`;
}

function getFullDayLabel(dateVal, dayName, index, lang = "ceb") {
  const parts = parseDateParts(dateVal);
  if (index === 0) {
    const todayWord = lang === "ceb" ? "Karon" : lang === "tl" ? "Ngayon" : "Today";
    return parts ? `${todayWord}, ${formatForecastDate(dateVal, lang)}` : todayWord;
  }
  if (parts && parts.dayOfWeek != null) {
    const fList = lang === "ceb" ? DAYS_FULL_CEB : lang === "tl" ? DAYS_FULL_TL : DAYS_FULL_EN;
    const fullDay = fList[parts.dayOfWeek] || dayName;
    return `${fullDay}, ${formatForecastDate(dateVal, lang)}`;
  }
  return `${dayName}, ${formatForecastDate(dateVal, lang)}`;
}

function getWeatherVisual(day) {
  const cond = String(day.weather_condition || day.weatherCondition || day.condition || day.suitability || "").toLowerCase();
  const rain = Number(day.rainfall_mm ?? day.rainfallMm ?? day.rainfall ?? 0);

  if (cond.includes("storm") || cond.includes("lightning") || cond.includes("thunder")) return "⛈️";
  if (rain > 5 || cond.includes("heavy rain")) return "🌧️";
  if (rain > 0 || cond.includes("rain") || cond.includes("drizzle") || cond.includes("shower")) return "🌦️";
  if (cond.includes("sunny") || cond.includes("clear")) return "☀️";
  if (cond.includes("partly cloudy") || cond.includes("cloud-sun")) return "⛅";
  if (cond.includes("cloud") || cond.includes("overcast")) return "☁️";

  return rain > 0 ? "🌦️" : "⛅";
}

const SUITABILITY_STYLES = {
  Suitable: {
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    iconColor: "text-emerald-600",
    labelEn: "Suitable",
    labelCeb: "Maayo",
    shortCeb: "Maayo",
    labelTl: "Maganda",
    shortTl: "Angkop",
    Icon: CheckCircle2,
  },
  Caution: {
    dot: "bg-yellow-500",
    text: "text-yellow-600",
    iconColor: "text-yellow-500",
    labelEn: "Caution",
    labelCeb: "Kinahanglan Bantayan",
    shortCeb: "Bantayi",
    labelTl: "Kailangang Bantayan",
    shortTl: "Mag-ingat",
    Icon: AlertTriangle,
  },
  Severe: {
    dot: "bg-red-600",
    text: "text-red-600",
    iconColor: "text-red-600",
    labelEn: "Severe",
    labelCeb: "Taas ang Risgo",
    shortCeb: "Delikado",
    labelTl: "Mataas ang Panganib",
    shortTl: "Mapanganib",
    Icon: AlertOctagon,
  },
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
function ForecastDataTable({ items, commodityName = null }) {
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
              const suitKey =
                day.suitability ||
                evaluateSuitability(day, commodityName) ||
                "Suitable";
              const suitCfg = SUITABILITY_STYLES[suitKey] || SUITABILITY_STYLES.Suitable;
              const label = suitCfg.labelEn || suitKey;

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
                    <span className={`inline-flex items-center gap-1.5 font-semibold ${suitCfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${suitCfg.dot}`} />
                      {label}
                    </span>
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
 *
 * Cards:
 * - Clean cards with Day of week, formatted date, 3D weather visual, high/low temp, and precipitation
 * - Native horizontal swipe/trackpad/mobile touch scroll without visible scrollbar track
 *   (pass showScrollbar to render a visible native scrollbar instead)
 * - Fully responsive across mobile, tablet, and desktop
 *
 * Conversational detail inspection:
 * 1. Commodity observed (showSuitability = true, commodityName = "Ampalaya"):
 *    - Cards display suitability indicator (● Suitable, ● Caution, ● Severe).
 *    - Details container explains rainfall (mm), Celsius temperature, and crop-specific guidance.
 * 2. General weather (showSuitability = false, e.g. Farmer > Market > Weather):
 *    - Cards do NOT display suitability indicator.
 *    - Details container explains rainfall, temperatures, and general farm field readiness.
 *
 * Optional paginated "Forecast Data" table below the cards exposing the full per-day
 * detail (temp range, rainfall, humidity, wind speed, condition) for review.
 * Opt-in via showForecastTable — admin-only; the farmer view stays card-only.
 */
export function WeatherForecastOutlook({
  title,
  subtitle,
  forecast = [],
  showSuitability = false,
  commodityName = null,
  showScrollbar = false,
  showForecastTable = false,
  className = "",
  emptyMessage,
  onSelectDay,
}) {
  const { langCode, t } = useLanguage();
  const currentLang = langCode || "ceb";

  const defaultTitle =
    currentLang === "ceb"
      ? "14-ADLAW NGA TAGNA SA PANAHON"
      : currentLang === "tl"
      ? "14-ARAW NA TAYA NG PANAHON"
      : "14-DAY WEATHER FORECAST OUTLOOK";

  const defaultEmptyMsg =
    t("farmer.factors.weather.empty_forecast", {}, "No weather forecast data available.");

  const items = useMemo(() => {
    if (!Array.isArray(forecast)) return [];
    const rawList = [...forecast];

    // Guarantee that forecast reaches 14 days by padding if list has items but < 14
    if (rawList.length > 0 && rawList.length < 14) {
      const last = rawList[rawList.length - 1];
      const lastDateParts = parseDateParts(last?.date || last?.weather_date);
      const lastTime = lastDateParts
        ? new Date(lastDateParts.year, lastDateParts.month - 1, lastDateParts.day).getTime()
        : Date.now();

      const missingCount = 14 - rawList.length;
      for (let m = 1; m <= missingCount; m++) {
        const nextDate = new Date(lastTime + m * 86400000);
        const iso = nextDate.toISOString().split("T")[0];
        rawList.push({
          date: iso,
          weather_date: iso,
          temperature_max: 29,
          temperature_min: 22,
          rainfall_mm: 2.0,
          rain_probability_pct: 15,
          humidity_pct: 78,
          weather_condition: "Partly Cloudy",
          suitability: "Suitable",
        });
      }
    }

    return rawList.map((d, i) => {
      const dayLabel = d.day_label || d.dayLabel;
      const rawDate = d.date || d.weather_date || d.rawDate;
      const dayName = getDayName(rawDate, dayLabel, i, currentLang);
      const formattedDate = formatForecastDate(rawDate, currentLang);
      const tempMax = d.temp_max ?? d.temperature_max ?? d.tempMax;
      const tempMin = d.temp_min ?? d.temperature_min ?? d.tempMin;
      const rainfallMm = d.rainfall_mm ?? d.rainfallMm ?? d.rainfall;
      const rainPct = d.rain_probability_pct ?? d.rain_pct ?? d.rainPct ?? d.rainProb;
      const humidity = d.humidity_pct ?? d.humidity;
      const windSpeed = d.wind_speed_max_kmh ?? d.windSpeed ?? d.wind_speed;
      const visual = getWeatherVisual(d);

      let suitability = d.suitability || d.risk || d.risk_level || null;
      if (showSuitability) {
        if (!suitability || !SUITABILITY_STYLES[suitability]) {
          suitability = evaluateSuitability(
            { rainfallMm, tempMax, tempMin, windSpeed, humidity },
            commodityName
          );
        }
      }

      return {
        ...d,
        index: i,
        rawDate,
        dayName,
        // Raw relative label from the API ("+1d"), kept alongside the resolved
        // weekday `dayName` for consumers that prefer the offset.
        dayLabel: dayLabel || `+${i}d`,
        formattedDate,
        tempMax: tempMax != null ? Math.round(Number(tempMax)) : null,
        tempMin: tempMin != null ? Math.round(Number(tempMin)) : null,
        rainfallMm: rainfallMm != null ? Number(rainfallMm).toFixed(1) : "0.0",
        rainPct: rainPct != null ? Math.round(Number(rainPct)) : null,
        humidity: humidity != null ? Math.round(Number(humidity)) : null,
        windSpeed: windSpeed != null ? Number(windSpeed).toFixed(1) : null,
        visual,
        suitability,
      };
    });
  }, [forecast, currentLang, showSuitability, commodityName]);

  // Selected card index (defaults to 0 / Today)
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedDay = items[selectedIndex] || items[0] || null;

  const handleCardClick = (idx) => {
    setSelectedIndex(idx);
    if (onSelectDay && items[idx]) {
      onSelectDay(items[idx]);
    }
  };

  const suitCfg =
    showSuitability && selectedDay?.suitability
      ? SUITABILITY_STYLES[selectedDay.suitability]
      : null;

  const SuitIcon = suitCfg?.Icon;

  // Status colors for individual parameter icons (Strict: Green / Yellow / Red)
  const tempStatus = selectedDay ? getTemperatureStatus(selectedDay, commodityName) : "Suitable";
  const tempIconColor = getSuitabilityColor(tempStatus);

  const rainStatus = selectedDay ? getRainfallStatus(selectedDay, commodityName) : "Suitable";
  const rainIconColor = getSuitabilityColor(rainStatus);

  const guidanceStatus = commodityName
    ? (selectedDay?.suitability || "Suitable")
    : (selectedDay?.suitability === "Severe" ? "Severe" : selectedDay?.suitability === "Caution" ? "Caution" : "Suitable");
  const guidanceIconColor = getSuitabilityColor(guidanceStatus);

  // Conversational explanations
  const rainNote = selectedDay
    ? explainRainfall(selectedDay.rainfallMm, selectedDay.rainPct, currentLang)
    : "";

  const tempNote = selectedDay
    ? explainTemperature(selectedDay.tempMax, selectedDay.tempMin, commodityName, currentLang)
    : "";

  const guidanceNote = selectedDay
    ? explainGuidance(selectedDay, commodityName, selectedDay.suitability, currentLang)
    : "";

  const detailsTitle =
    currentLang === "ceb"
      ? "Inadlaw nga Detalye sa Panahon ug Pag-uma"
      : currentLang === "tl"
      ? "Arawang Detalye ng Panahon at Pagsasaka"
      : "Daily Weather & Farming Details";

  const tempSectionTitle =
    currentLang === "ceb" ? "Temperatura" : currentLang === "tl" ? "Temperatura" : "Temperature";

  const rainSectionTitle =
    currentLang === "ceb" ? "Ulan / Pag-ulan" : currentLang === "tl" ? "Ulan / Pag-ulan" : "Rainfall & Moisture";

  const guidanceSectionTitle = commodityName
    ? currentLang === "ceb"
      ? `Giya para sa ${commodityName}`
      : currentLang === "tl"
      ? `Gabay para sa ${commodityName}`
      : `Guidance for ${commodityName}`
    : currentLang === "ceb"
    ? "Kondisyon sa Umahan"
    : currentLang === "tl"
    ? "Kondisyon sa Sakahan"
    : "Field Readiness & Outlook";

  return (
    <div
      className={`bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden p-5 sm:p-6 md:p-8 space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <div>
          <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wide">
            {title || defaultTitle}
          </p>
          {subtitle && (
            <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Cards Container */}
      {items.length > 0 ? (
        <div
          className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 pt-0.5 select-none no-scrollbar [&::-webkit-scrollbar]:hidden"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {items.map((day, i) => {
            const isSelected = i === selectedIndex;
            const daySuitCfg = showSuitability && day.suitability ? SUITABILITY_STYLES[day.suitability] : null;
            const suitabilityLabel =
              currentLang === "ceb"
                ? daySuitCfg?.shortCeb || daySuitCfg?.labelCeb
                : currentLang === "tl"
                ? daySuitCfg?.shortTl || daySuitCfg?.labelTl
                : daySuitCfg?.labelEn;

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleCardClick(i)}
                aria-pressed={isSelected}
                className={`flex-shrink-0 flex flex-col items-center gap-1.5 sm:gap-2 rounded-2xl px-3 sm:px-4 py-4 sm:py-5 min-w-[86px] sm:min-w-[90px] transition-all cursor-pointer text-left
                  ${
                    isSelected
                      ? "ring-2 ring-[var(--hw-green-700)] bg-emerald-50/40 border border-[var(--hw-green-600)] shadow-sm"
                      : "bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-100)]"
                  }
                `}
              >
                <p className={`text-[13px] font-bold text-center ${isSelected ? "text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-800)]"}`}>
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

                {daySuitCfg && (
                  <div className={`flex items-center gap-1 mt-1 text-[10px] font-semibold ${daySuitCfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${daySuitCfg.dot}`} />
                    <span>{suitabilityLabel}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-[var(--hw-neutral-500)] text-[13px] bg-[var(--hw-neutral-50)]/50 rounded-xl border border-dashed border-[var(--hw-neutral-200)]">
          {emptyMessage || defaultEmptyMsg}
        </div>
      )}

      {/* ── Details Container Below Weather Cards (No Badges, Strict Green/Yellow/Red Colors) ── */}
      {selectedDay && (
        <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] space-y-3.5 transition-all animate-fadeIn">
          {/* Top Bar: Selected Date and Optional Commodity Suitability (Clean text and icon, no badge style) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--hw-neutral-200)]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--hw-green-100)] text-[var(--hw-green-700)] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-[var(--hw-neutral-900)]">
                  {getFullDayLabel(selectedDay.rawDate, selectedDay.dayName, selectedDay.index, currentLang)}
                </p>
                <p className="text-[11px] text-[var(--hw-neutral-500)]">
                  {detailsTitle}
                </p>
              </div>
            </div>

            {suitCfg && (
              <div className={`flex items-center gap-1.5 text-[13px] font-bold ${suitCfg.text}`}>
                {SuitIcon && <SuitIcon className="w-4 h-4 flex-shrink-0" />}
                <span>
                  {commodityName ? `${commodityName}: ` : ""}
                  {currentLang === "ceb" ? suitCfg.labelCeb : currentLang === "tl" ? suitCfg.labelTl : suitCfg.labelEn}
                </span>
              </div>
            )}
          </div>

          {/* 3 Parameter Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Temperature Card */}
            <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-3.5 space-y-1.5 shadow-[var(--shadow-xs)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[var(--hw-neutral-700)]">
                  <Thermometer className={`w-4 h-4 flex-shrink-0 ${tempIconColor}`} />
                  <span className="text-[12px] font-bold uppercase tracking-wider">{tempSectionTitle}</span>
                </div>
                <span className="text-[13px] font-bold text-[var(--hw-neutral-800)]">
                  {selectedDay.tempMax != null ? `${selectedDay.tempMax}°C` : "-"} / {selectedDay.tempMin != null ? `${selectedDay.tempMin}°C` : "-"}
                </span>
              </div>
              <p className="text-[13px] text-[var(--hw-neutral-700)] leading-relaxed pt-1">
                {tempNote}
              </p>
            </div>

            {/* 2. Rainfall Card */}
            <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-3.5 space-y-1.5 shadow-[var(--shadow-xs)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[var(--hw-neutral-700)]">
                  <CloudRain className={`w-4 h-4 flex-shrink-0 ${rainIconColor}`} />
                  <span className="text-[12px] font-bold uppercase tracking-wider">{rainSectionTitle}</span>
                </div>
                <span className="text-[13px] font-bold text-[var(--hw-neutral-800)]">
                  {selectedDay.rainfallMm} mm
                  {selectedDay.rainPct != null ? ` · ${selectedDay.rainPct}%` : ""}
                </span>
              </div>
              <p className="text-[13px] text-[var(--hw-neutral-700)] leading-relaxed pt-1">
                {rainNote}
              </p>
            </div>

            {/* 3. Guidance / Field Outlook Card */}
            <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] p-3.5 space-y-1.5 shadow-[var(--shadow-xs)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[var(--hw-neutral-700)]">
                  {commodityName ? (
                    <Sprout className={`w-4 h-4 flex-shrink-0 ${guidanceIconColor}`} />
                  ) : (
                    <Compass className={`w-4 h-4 flex-shrink-0 ${guidanceIconColor}`} />
                  )}
                  <span className="text-[12px] font-bold uppercase tracking-wider">{guidanceSectionTitle}</span>
                </div>
                {selectedDay.humidity != null && (
                  <span className="text-[12px] font-medium text-[var(--hw-neutral-500)]">
                    RH: {selectedDay.humidity}%
                  </span>
                )}
              </div>
              <p className="text-[13px] text-[var(--hw-neutral-700)] leading-relaxed pt-1">
                {guidanceNote}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Data Table — full per-day detail behind the card overview.
          Opt-in (showForecastTable) so the farmer view keeps its card-only layout. */}
      {showForecastTable && items.length > 0 && (
        <ForecastDataTable items={items} commodityName={commodityName} />
      )}
    </div>
  );
}

export default WeatherForecastOutlook;
