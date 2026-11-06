const PHT = "Asia/Manila";

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatWeatherTime(value) {
  const date = validDate(value);
  if (!date) return null;
  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: PHT,
  });
}

export function weatherPartOfDay(value) {
  const date = validDate(value);
  if (!date) return null;
  const hour = Number(new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    hour12: false,
    timeZone: PHT,
  }).format(date));
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export function formatWeatherWindow(start, end) {
  const startTime = formatWeatherTime(start);
  const endTime = formatWeatherTime(end);
  if (!startTime) return null;
  if (!endTime || startTime === endTime) return `around ${startTime}`;
  return `${startTime} to ${endTime}`;
}

export function weatherOccurrenceText(occurrence, translate = null) {
  if (!occurrence) return [];
  const t = (key, values, fallback) => translate
    ? translate(`farmer.factors.weather.${key}`, values, fallback)
    : fallback;
  const lines = [];
  const rainWindow = formatWeatherWindow(occurrence.rain_start_at, occurrence.rain_end_at);
  if (rainWindow) {
    const probability = occurrence.rain_probability_pct != null
      ? ` (${Math.round(Number(occurrence.rain_probability_pct))}% chance)`
      : "";
    lines.push(t("rain_expected", { window: rainWindow, probability }, `Rain expected ${rainWindow}${probability}.`));
  }
  const high = formatWeatherTime(occurrence.temperature_high_at);
  if (high) lines.push(t("hottest_around", { time: high }, `Hottest around ${high}.`));
  const low = formatWeatherTime(occurrence.temperature_low_at);
  if (low) lines.push(t("coolest_around", { time: low }, `Coolest around ${low}.`));
  const wind = formatWeatherTime(occurrence.wind_peak_at);
  if (wind) lines.push(t("strongest_wind_around", { time: wind }, `Strongest wind around ${wind}.`));
  const humidity = formatWeatherTime(occurrence.humidity_peak_at);
  if (humidity) lines.push(t("most_humid_around", { time: humidity }, `Most humid around ${humidity}.`));
  return lines;
}

export function weatherOccurrenceFallback(day, translate = null) {
  const t = (key, fallback) => translate
    ? translate(`farmer.factors.weather.${key}`, {}, fallback)
    : fallback;
  if (!day) return t("timing_unavailable", "Exact timing is not available for this day.");
  const rain = Number(day.rainfall_mm ?? day.rainfallMm ?? 0);
  if (rain > 0) return t("rain_timing_unavailable", "Rain is expected, but the exact time is not available.");
  return t("timing_unavailable", "Exact timing is not available for this day.");
}
