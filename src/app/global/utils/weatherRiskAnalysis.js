export function buildWeatherRiskAnalysis({
  weatherForecast,
  weatherRules = [],
  commodityName = "selected crop",
  weatherError = "",
  weatherLoading = false,
}) {
  const days = weatherForecast?.status === "ok" && Array.isArray(weatherForecast.days)
    ? weatherForecast.days
    : [];
  const isProcessed = days.length > 0;

  const tempRangeRule = weatherRules.find((rule) => rule.metric_key === "temp_range" && rule.risk_level === "suitable");
  const tempMinSevere = weatherRules.find((rule) => rule.metric_key === "temp_min" && rule.risk_level === "severe");
  const tempMaxSevere = weatherRules.find((rule) => rule.metric_key === "temp_max" && rule.risk_level === "severe");
  const windSevere = weatherRules.find((rule) => rule.metric_key === "wind_speed_max" && rule.risk_level === "severe");
  const rainRule = weatherRules.find((rule) => rule.metric_key.includes("rain"));

  const suitTempMin = tempRangeRule?.threshold_min != null ? Number(tempRangeRule.threshold_min) : 20;
  const suitTempMax = tempRangeRule?.threshold_max != null ? Number(tempRangeRule.threshold_max) : 30;
  const suitRainMax = rainRule?.threshold_max != null ? Number(rainRule.threshold_max) : 15;
  const sevRainMin = 30;
  const sevTempMax = tempMaxSevere?.threshold_min != null ? Number(tempMaxSevere.threshold_min) : 35;
  const sevTempMin = tempMinSevere?.threshold_max != null ? Number(tempMinSevere.threshold_max) : 5;
  const sevWind = windSevere?.threshold_min != null ? Number(windSevere.threshold_min) : 28.8;

  let avgMin = 0;
  let avgMax = 0;
  let avgRain = 0;
  let avgHum = 0;
  let avgProb = 0;
  let severeCount = 0;
  let cautionCount = 0;

  days.forEach((day) => {
    avgMin += day.temp_min ?? 0;
    avgMax += day.temp_max ?? 0;
    avgRain += day.rainfall_mm ?? 0;
    avgHum += day.humidity_pct ?? 0;
    avgProb += day.rain_probability_pct ?? 0;

    const severe =
      (day.rainfall_mm ?? 0) >= sevRainMin ||
      (day.temp_max ?? 0) >= sevTempMax ||
      (day.temp_min ?? 0) <= sevTempMin ||
      (day.wind_speed_max_kmh ?? 0) > sevWind;
    const caution =
      (day.rainfall_mm ?? 0) >= 15 ||
      (day.temp_max ?? 0) > suitTempMax ||
      (day.temp_min ?? 0) < suitTempMin ||
      (day.humidity_pct ?? 0) >= 90;

    if (severe) severeCount += 1;
    else if (caution) cautionCount += 1;
  });

  if (isProcessed) {
    avgMin /= days.length;
    avgMax /= days.length;
    avgRain /= days.length;
    avgHum /= days.length;
    avgProb /= days.length;
  }

  const classification = isProcessed
    ? severeCount >= 2 ? "Severe" : cautionCount > 0 || severeCount > 0 ? "Caution" : "Suitable"
    : "Not processed";
  const firstDate = days[0]?.date
    ? new Date(days[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "Today";
  const lastDate = days.at(-1)?.date
    ? new Date(days.at(-1).date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "+14d";
  const forecast14d = days.map((day) => {
    const severe =
      (day.rainfall_mm ?? 0) >= sevRainMin ||
      (day.temp_max ?? 0) >= sevTempMax ||
      (day.temp_min ?? 0) <= sevTempMin ||
      (day.wind_speed_max_kmh ?? 0) > sevWind;
    const caution =
      (day.rainfall_mm ?? 0) >= 15 ||
      (day.temp_max ?? 0) > suitTempMax ||
      (day.temp_min ?? 0) < suitTempMin ||
      (day.humidity_pct ?? 0) >= 90;

    return {
      dayLabel: day.day_label,
      date: day.date,
      tempMax: day.temp_max != null ? Math.round(day.temp_max) : null,
      tempMin: day.temp_min != null ? Math.round(day.temp_min) : null,
      rainPct: day.rain_probability_pct != null
        ? Math.round(day.rain_probability_pct)
        : (day.rainfall_mm > 0 ? Math.min(Math.round(day.rainfall_mm * 5), 100) : 0),
      rainfallMm: day.rainfall_mm,
      humidity: day.humidity_pct,
      windSpeed: day.wind_speed_max_kmh,
      weatherCondition: day.weather_condition,
      suitability: severe ? "Severe" : caution ? "Caution" : "Suitable",
    };
  });

  const resultExplanation = isProcessed
    ? `14-day weather forecast indicates an average temperature range of ${avgMin.toFixed(1)}°C–${avgMax.toFixed(1)}°C with ${avgRain.toFixed(1)} mm/day average rainfall. ${avgMin >= suitTempMin && avgMax <= suitTempMax
      ? `${commodityName} is within its optimal thermal range (${suitTempMin}–${suitTempMax}°C).`
      : "Temperatures fluctuate slightly outside optimal bounds."
    } ${cautionCount > 0 || severeCount > 0
      ? `Elevated humidity or rainfall detected on ${cautionCount + severeCount} forecast days; monitor bed drainage and disease pressure.`
      : "Favorable meteorological conditions expected throughout the forecast window."
    }`
    : weatherError || (weatherLoading ? "Loading weather forecast data…" : "No weather forecast data is available for this scope.");

  return {
    basisSource: "Open-Meteo 14-day Forecast",
    inputPeriod: isProcessed ? `${days.length} days (${firstDate} – ${lastDate})` : "14 days",
    processedAt: weatherForecast?.fetched_at
      ? new Date(weatherForecast.fetched_at).toLocaleString()
      : new Date().toLocaleDateString(),
    classification,
    basisInputs: {
      Location: "Davao City & Production Areas",
      "Forecast period": isProcessed ? `${days.length} days (${firstDate} – ${lastDate})` : "14 days",
      "Average rainfall": isProcessed ? `${avgRain.toFixed(1)} mm/day` : "- mm/day",
      "Average rain probability": isProcessed ? `${Math.round(avgProb)}%` : "-%",
      "Temperature Range": isProcessed ? `${avgMin.toFixed(1)}°C – ${avgMax.toFixed(1)}°C` : "-°C",
      Humidity: isProcessed ? `${avgHum.toFixed(1)}%` : "-%",
      "Crop threshold": `Suitable: ${suitTempMin}–${suitTempMax}°C, <${suitRainMax} mm/day`,
    },
    thresholds: [
      { classification: "Suitable", rule: `Rainfall < ${suitRainMax} mm/day; temp ${suitTempMin}–${suitTempMax}°C` },
      { classification: "Caution", rule: `Rainfall ${suitRainMax}–${sevRainMin} mm/day; temp ${suitTempMax}–${sevTempMax}°C` },
      { classification: "Severe", rule: `Rainfall > ${sevRainMin} mm/day; temp > ${sevTempMax}°C or < ${sevTempMin}°C; wind > ${sevWind} km/h` },
    ],
    forecast_14d: forecast14d,
    records: days.map((day) => ({
      Date: day.date,
      Location: "Davao City Region",
      Rainfall: day.rainfall_mm != null ? `${day.rainfall_mm} mm` : "-",
      "Temperature Range": `${day.temp_min != null ? day.temp_min : "-"}°C – ${day.temp_max != null ? day.temp_max : "-"}°C`,
      Humidity: day.humidity_pct != null ? `${day.humidity_pct}%` : "-",
      Wind: day.wind_speed_max_kmh != null ? `${day.wind_speed_max_kmh} km/h` : "-",
      Source: "Open-Meteo",
    })),
    resultExplanation,
    basisMissing: isProcessed ? null : weatherError || null,
  };
}
