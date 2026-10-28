import { formatDateTime, formatDate } from "./apiTransforms";

export function buildWeatherRiskAnalysis({
  weatherForecast,
  weatherRules = [],
  commodityName = "selected crop",
  weatherError = "",
  weatherLoading = false,
  lang = "ceb",
}) {
  const normLang = String(lang || "ceb").toLowerCase();
  const isCeb = normLang.includes("ceb") || normLang.includes("bisaya");
  const isTl = normLang.includes("tl") || normLang.includes("tagalog") || normLang.includes("filipino");

  const MONTHS_SHORT = isCeb || isTl
    ? ["Ene", "Peb", "Mar", "Abr", "May", "Hun", "Hul", "Ago", "Set", "Okt", "Nob", "Dis"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function formatShortDate(dateStr) {
    if (!dateStr) return isCeb ? "Karon" : isTl ? "Ngayon" : "Today";
    const formatted = formatDate(dateStr, { month: "short", day: "numeric" }, isCeb ? "ceb" : isTl ? "tl" : "en");
    return formatted ? formatted.replace(/,\s*\d{4}$/, "") : String(dateStr);
  }

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

  const firstDate = days[0]?.date ? formatShortDate(days[0].date) : (isCeb ? "Karon" : isTl ? "Ngayon" : "Today");
  const lastDate = days.at(-1)?.date ? formatShortDate(days.at(-1).date) : "+14d";

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

  let resultExplanation = "";
  if (isProcessed) {
    if (isCeb) {
      const tempNote = avgMin >= suitTempMin && avgMax <= suitTempMax
        ? `Ang ${commodityName} anaa sa husto ug maayong temperatura (${suitTempMin}–${suitTempMax}°C).`
        : "Ang temperatura medyo lapas sa naandang gikinahanglan sa tanom.";
      const riskNote = cautionCount > 0 || severeCount > 0
        ? `Adunay mas taas nga kaumog o ulan sa ${cautionCount + severeCount} ka adlaw sa forecast; bantayi kanunay ang drainage ug mga sakit sa tanom.`
        : "Gilaoman ang maayo ug paborable nga panahon sa tibuok forecast window.";
      resultExplanation = `Ang 14-adlaw nga tagna sa panahon nagpakita og kasarangang temperatura nga ${avgMin.toFixed(1)}°C–${avgMax.toFixed(1)}°C ug kasarangang pag-ulan nga ${avgRain.toFixed(1)} mm/adlaw. ${tempNote} ${riskNote}`;
    } else if (isTl) {
      const tempNote = avgMin >= suitTempMin && avgMax <= suitTempMax
        ? `Ang ${commodityName} ay nasa tamang antas ng temperatura (${suitTempMin}–${suitTempMax}°C).`
        : "Bahagyang lumilihis ang temperatura sa angkop na saklaw ng pananim.";
      const riskNote = cautionCount > 0 || severeCount > 0
        ? `May mataas na halumigmig o ulan sa ${cautionCount + severeCount} araw ng forecast; bantayan ang daloy ng tubig at banta ng mga sakit sa pananim.`
        : "Inaasahan ang maganda at paborableng panahon sa buong forecast window.";
      resultExplanation = `Ipinapakita ng 14-araw na ulat sa panahon ang karaniwang temperatura na ${avgMin.toFixed(1)}°C–${avgMax.toFixed(1)}°C at karaniwang ulan na ${avgRain.toFixed(1)} mm/araw. ${tempNote} ${riskNote}`;
    } else {
      const tempNote = avgMin >= suitTempMin && avgMax <= suitTempMax
        ? `${commodityName} is within its optimal thermal range (${suitTempMin}–${suitTempMax}°C).`
        : "Temperatures fluctuate slightly outside optimal bounds.";
      const riskNote = cautionCount > 0 || severeCount > 0
        ? `Elevated humidity or rainfall detected on ${cautionCount + severeCount} forecast days; monitor bed drainage and disease pressure.`
        : "Favorable meteorological conditions expected throughout the forecast window.";
      resultExplanation = `14-day weather forecast indicates an average temperature range of ${avgMin.toFixed(1)}°C–${avgMax.toFixed(1)}°C with ${avgRain.toFixed(1)} mm/day average rainfall. ${tempNote} ${riskNote}`;
    }
  } else {
    resultExplanation = weatherError || (weatherLoading
      ? (isCeb ? "Gikarga ang datos sa tagna sa panahon…" : isTl ? "Kinakarga ang datos ng ulat panahon…" : "Loading weather forecast data…")
      : (isCeb ? "Walay datos sa tagna sa panahon nga magamit alang niini." : isTl ? "Walang datos ng ulat panahon na magamit para dito." : "No weather forecast data is available for this scope."));
  }

  const periodLabel = isProcessed
    ? (isCeb ? `${days.length} ka adlaw (${firstDate} – ${lastDate})` : isTl ? `${days.length} araw (${firstDate} – ${lastDate})` : `${days.length} days (${firstDate} – ${lastDate})`)
    : (isCeb ? "14 ka adlaw" : isTl ? "14 araw" : "14 days");

  const locationLabel = isCeb
    ? "Davao City ug mga Tanoman"
    : isTl
    ? "Davao City at mga Sakahan"
    : "Davao City & Production Areas";

  const cropThresholdLabel = isCeb
    ? `Maayo: ${suitTempMin}–${suitTempMax}°C, <${suitRainMax} mm/adlaw`
    : isTl
    ? `Angkop: ${suitTempMin}–${suitTempMax}°C, <${suitRainMax} mm/araw`
    : `Suitable: ${suitTempMin}–${suitTempMax}°C, <${suitRainMax} mm/day`;

  return {
    basisSource: "Open-Meteo 14-day Forecast",
    inputPeriod: periodLabel,
    processedAt: weatherForecast?.fetched_at
      ? formatDateTime(weatherForecast.fetched_at)
      : new Date().toLocaleDateString("en-PH", { timeZone: "Asia/Manila" }),
    classification,
    basisInputs: {
      Location: locationLabel,
      "Forecast period": periodLabel,
      "Average rainfall": isProcessed ? `${avgRain.toFixed(1)} mm/day` : "- mm/day",
      "Average rain probability": isProcessed ? `${Math.round(avgProb)}%` : "-%",
      "Temperature Range": isProcessed ? `${avgMin.toFixed(1)}°C – ${avgMax.toFixed(1)}°C` : "-°C",
      Humidity: isProcessed ? `${avgHum.toFixed(1)}%` : "-%",
      "Crop threshold": cropThresholdLabel,
    },
    thresholds: [
      {
        classification: isCeb ? "Maayo" : isTl ? "Angkop" : "Suitable",
        rule: isCeb
          ? `Ulan < ${suitRainMax} mm/adlaw; temperatura ${suitTempMin}–${suitTempMax}°C`
          : isTl
          ? `Ulan < ${suitRainMax} mm/araw; temperatura ${suitTempMin}–${suitTempMax}°C`
          : `Rainfall < ${suitRainMax} mm/day; temp ${suitTempMin}–${suitTempMax}°C`,
      },
      {
        classification: isCeb ? "Kinahanglan Bantayan" : isTl ? "Kailangang Bantayan" : "Caution",
        rule: isCeb
          ? `Ulan ${suitRainMax}–${sevRainMin} mm/adlaw; temperatura ${suitTempMax}–${sevTempMax}°C`
          : isTl
          ? `Ulan ${suitRainMax}–${sevRainMin} mm/araw; temperatura ${suitTempMax}–${sevTempMax}°C`
          : `Rainfall ${suitRainMax}–${sevRainMin} mm/day; temp ${suitTempMax}–${sevTempMax}°C`,
      },
      {
        classification: isCeb ? "Taas ang Risk" : isTl ? "Mataas ang Panganib" : "Severe",
        rule: isCeb
          ? `Ulan > ${sevRainMin} mm/adlaw; temperatura > ${sevTempMax}°C o < ${sevTempMin}°C; hangin > ${sevWind} km/h`
          : isTl
          ? `Ulan > ${sevRainMin} mm/araw; temperatura > ${sevTempMax}°C o < ${sevTempMin}°C; hangin > ${sevWind} km/h`
          : `Rainfall > ${sevRainMin} mm/day; temp > ${sevTempMax}°C or < ${sevTempMin}°C; wind > ${sevWind} km/h`,
      },
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
