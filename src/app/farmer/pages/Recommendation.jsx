import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CloudRain,
  CloudSun,
  Cloud,
  Sun,
  Calendar,
  CalendarClock,
  Sprout,
  X,
  Banknote,
  Package,
  Leaf,
  TrendingUp
} from "lucide-react";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { apiGet, parseResponse } from "../../global/api";
import { toCamelCase } from "../../global/utils/apiTransforms";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { Skeleton } from "../components/shared/FarmerSkeletons";
import { useCrops } from "../components/crops/CropsContext";
import { DAVAO_CITY_FALLBACK_COORDINATES } from "../../global/constants/location";
import { WeatherLocationBanner } from "../components/shared/WeatherLocationBanner";
import { explainRainfall } from "../../global/components/shared/weatherExplanations";

const TwoToneStormIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path stroke="#3b82f6" d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973" />
    <path stroke="#f59e0b" d="m13 12-3 5h4l-3 5" />
  </svg>
);

// Determine calendar weather marker type matching weather card classifications: storm, rain, heat, or fair
function forecastMarkerType(f) {
  if (!f) return null;
  const condition = String(f.suitability || f.weather_condition || f.condition || "").toLowerCase();
  const rainfall = Number(f.rainfall_mm ?? f.rainfall ?? f.rainfallMm ?? 0);
  const rainProb = Number(f.rain_probability_pct ?? f.rainProb ?? f.rainPct ?? 0);
  const tempMax = Number(f.temperature_max ?? f.temp_max ?? f.tempMax ?? 0);

  // 1. Heavy rain / Severe / Storm
  if (
    condition.includes("storm") ||
    condition.includes("lightning") ||
    condition.includes("thunder") ||
    condition.includes("severe") ||
    rainfall >= 15 ||
    condition.includes("heavy rain")
  ) {
    return "storm";
  }

  // 2. Light rain / passing showers
  if (
    rainfall >= 1.0 ||
    rainProb >= 50 ||
    condition.includes("rain") ||
    condition.includes("drizzle") ||
    condition.includes("shower")
  ) {
    return "rain";
  }

  // 3. Hot days
  if (
    condition.includes("heat") ||
    condition.includes("hot") ||
    tempMax >= 32
  ) {
    return "heat";
  }

  // Normal weather displays no marker icon on calendar cells
  return null;
}

function buildCalendarMarkers(marketEvents, cropPlans, weatherForecasts, year, month) {
  const markers = {};

  // 1. Market Events & Payday Periods
  (marketEvents || []).forEach((item) => {
    const camel = toCamelCase(item);
    const origDate = camel.calendarDate || camel.date;
    if (!origDate) return;
    const ds = String(origDate).split("T")[0];
    const startParts = ds.split("-");
    if (startParts.length < 3) return;
    const startDay = parseInt(startParts[2], 10);
    if (isNaN(startDay)) return;
    if (startParts[0] !== String(year) || parseInt(startParts[1], 10) !== month) return;

    let endDay = startDay;
    const endParts = String(camel.endDate || camel.eventEnd || "").split("T")[0].split("-");
    if (endParts.length === 3 && endParts[0] === String(year) && parseInt(endParts[1], 10) === month) {
      endDay = Math.max(startDay, parseInt(endParts[2], 10) || startDay);
    }

    const eName = camel.holidayName || camel.eventName;

    for (let d = startDay; d <= endDay; d += 1) {
      if (!markers[d]) markers[d] = {};
      markers[d].hasEvent = true;
      if (camel.isPayday) {
        markers[d].payday = true;
      }
      if (eName) {
        markers[d].event = eName;
      }
    }
  });

  // 2. Existing Crop Plans Milestones (Target planting, planted, near-harvest, estimated harvest, harvested)
  (cropPlans || []).forEach((c) => {
    const name = c.commodityName && c.commodityName !== "\u2013" ? c.commodityName : "Crop";
    const variant = c.variant || c.variety || null;
    const cropId = c.commodityId || c.commodity || "crop";
    const planId = c.id;
    const status = c.status || "Planning";

    // Actual Planted Date
    if (c.actualPlantingDate) {
      const parts = String(c.actualPlantingDate).split("T")[0].split("-");
      if (parts[0] === String(year) && parseInt(parts[1], 10) === month) {
        const d = parseInt(parts[2], 10);
        if (!isNaN(d)) {
          if (!markers[d]) markers[d] = {};
          markers[d].crop = {
            id: cropId,
            name,
            variant,
            cropPlanId: planId,
            milestone: "planted",
            purposeEn: "Planted",
            purposeCeb: "Natanom na",
            purposeTl: "Naitanim na",
            purposeDescEn: "Crop was successfully planted on this date.",
            purposeDescCeb: "Natanom kining maong tanom sa maong petsa.",
            purposeDescTl: "Naitanim ang pananim sa petsang ito.",
            harvestStr: c.harvestDate,
          };
        }
      }
    }
    // Target / Planned Planting Date
    else if (c.plannedPlantingDate || c.rawPlantingDate) {
      const pDate = c.plannedPlantingDate || c.rawPlantingDate;
      const parts = String(pDate).split("T")[0].split("-");
      if (parts[0] === String(year) && parseInt(parts[1], 10) === month) {
        const d = parseInt(parts[2], 10);
        if (!isNaN(d)) {
          if (!markers[d]) markers[d] = {};
          markers[d].crop = {
            id: cropId,
            name,
            variant,
            cropPlanId: planId,
            milestone: "target_planting_date",
            purposeEn: "Target Planting Date",
            purposeCeb: "Target nga Petsa sa Pagtanom",
            purposeTl: "Target na Petsa ng Pagtanim",
            purposeDescEn: "Planned target planting date.",
            purposeDescCeb: "Gitinguhang iskedyul sa pagtanom.",
            purposeDescTl: "Nakatakdang petsa ng pagtatanim.",
            harvestStr: c.harvestDate,
          };
        }
      }
    }

    // Actual Harvest Date
    if (c.actualHarvestDate) {
      const parts = String(c.actualHarvestDate).split("T")[0].split("-");
      if (parts[0] === String(year) && parseInt(parts[1], 10) === month) {
        const d = parseInt(parts[2], 10);
        if (!isNaN(d)) {
          if (!markers[d]) markers[d] = {};
          markers[d].crop = {
            id: cropId,
            name,
            variant,
            cropPlanId: planId,
            milestone: "harvested",
            purposeEn: "Harvested",
            purposeCeb: "Na-ani na",
            purposeTl: "Naani na",
            purposeDescEn: "Crop harvest completed on this date.",
            purposeDescCeb: "Nahuman na ang pag-ani niining petsaha.",
            purposeDescTl: "Natapos ang pag-aani sa petsang ito.",
          };
        }
      }
    }
    // Near-Harvest or Estimated Harvest Date
    else if (c.expectedHarvestDate || c.rawHarvestDate) {
      const hDate = c.expectedHarvestDate || c.rawHarvestDate;
      const parts = String(hDate).split("T")[0].split("-");
      if (parts[0] === String(year) && parseInt(parts[1], 10) === month) {
        const d = parseInt(parts[2], 10);
        if (!isNaN(d)) {
          if (!markers[d]) markers[d] = {};
          const isNearHarvest = status === "Pre-Harvest";
          markers[d].crop = {
            id: cropId,
            name,
            variant,
            cropPlanId: planId,
            milestone: isNearHarvest ? "near_harvest" : "estimated_harvest_date",
            purposeEn: isNearHarvest ? "Near-Harvest" : "Estimated Harvest Date",
            purposeCeb: isNearHarvest ? "Duol na sa Ani" : "Gilaom nga Petsa sa Pag-ani",
            purposeTl: isNearHarvest ? "Malapit nang Anihin" : "Inaasahang Petsa ng Pag-ani",
            purposeDescEn: isNearHarvest
              ? "Crop is maturing and approaching harvest."
              : "Projected harvest date based on crop growth timeline.",
            purposeDescCeb: isNearHarvest
              ? "Hapit na ang ting-ani niining tanoma."
              : "Gilaoman nga petsa sa pag-ani sumala sa iskedyul sa pagtubo.",
            purposeDescTl: isNearHarvest
              ? "Malapit na ang anihan ng pananim na ito."
              : "Inaasahang petsa ng pag-aani ayon sa iskedyul ng paglaki.",
          };
        }
      }
    }
  });

  // 3. 14-Day Weather Forecasts
  (weatherForecasts || []).forEach((f) => {
    const ds = String(f.date || f.weather_date || "");
    const parts = ds.split("T")[0].split("-");
    if (parts.length < 3) return;
    if (parts[0] === String(year) && parseInt(parts[1], 10) === month) {
      const d = parseInt(parts[2], 10);
      if (isNaN(d)) return;
      const markerType = forecastMarkerType(f);
      if (markerType) {
        if (!markers[d]) markers[d] = {};
        markers[d].weather = markerType;
        markers[d].weatherInfo = {
          tempMin: f.temperature_min ?? f.temp_min ?? f.tempMin,
          tempMax: f.temperature_max ?? f.temp_max ?? f.tempMax,
          rainfall: f.rainfall_mm ?? f.rainfall ?? f.rainfallMm,
          rainProb: f.rain_probability_pct ?? f.rainProb ?? f.rainPct,
          condition: f.suitability || f.weather_condition || null,
        };
      }
    }
  });

  return markers;
}

const DAY_LABELS = [
  { key: "farmer.calendar.days.sun", fallback: "Sun" },
  { key: "farmer.calendar.days.mon", fallback: "Mon" },
  { key: "farmer.calendar.days.tue", fallback: "Tue" },
  { key: "farmer.calendar.days.wed", fallback: "Wed" },
  { key: "farmer.calendar.days.thu", fallback: "Thu" },
  { key: "farmer.calendar.days.fri", fallback: "Fri" },
  { key: "farmer.calendar.days.sat", fallback: "Sat" }
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const MONTH_SHORT_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function monthKey(year, month) {
  return `${year}-${month}`;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function firstWeekday(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

function hasAnyMarker(m) {
  return !!(m.crop || m.weather || m.hasEvent || m.event || m.payday);
}

const WIcon = ({ type, cls }) => {
  if (type === "storm") return <TwoToneStormIcon className={cls} />;
  if (type === "rain") return <CloudRain className={cls} />;
  if (type === "heat") return <Sun className={cls} />;
  return <CloudSun className={cls} />;
};

const weatherColor = (type, selected = false) => {
  if (selected) return "text-white/90";
  if (type === "heat") return "text-orange-500";
  if (type === "storm") return "text-blue-600";
  if (type === "rain") return "text-blue-500";
  return "text-amber-500";
};

const _weatherNote = (type, info, t) => {
  const hasInfo = !!(info && (info.rainProb != null || info.rainfall != null || info.tempMax != null));
  const rainProb = hasInfo && info.rainProb != null ? ` (${Math.round(info.rainProb)}% chance)` : "";
  const rainMm = hasInfo && info.rainfall != null ? ` ~${info.rainfall} mm` : "";
  const temps =
    hasInfo && info.tempMax != null && info.tempMin != null
      ? ` ${Math.round(info.tempMin)}°–${Math.round(info.tempMax)}°`
      : "";
  if (type === "storm") return t("farmer.calendar.weather_note_storm", { rain_mm: rainMm }, `Heavy rain / thunderstorm expected${rainMm}.`);
  if (type === "heat") return t("farmer.calendar.weather_note_heat", {}, "Consecutive hot days. Ensure sufficient irrigation for crops.");
  if (type === "rain") return t("farmer.calendar.weather_note_rain", { rain_mm: rainMm, rain_chance: rainProb }, `Light rain expected${rainMm}${rainProb}.`);
  return t("farmer.calendar.weather_note_fair", { temps }, `Fair weather${temps}.`);
};

// Default high-quality factor profiles for recommended crops matching the design
const DEFAULT_RECOMMENDED_PROFILES = {
  "COM-0004": {
    bestVariety: "Diamante Big",
    plantWindow: (m) => `${m} 1–20`,
    harvestWindow: (m, t) => (m === "August" ? (t ? t("farmer.calendar.months.november", {}, "November") : "November") : (t ? t("farmer.calendar.months.december", {}, "December") : "December")),
    factors: (m, p, t) => ({
      price: t ? t("farmer.calendar.factor_price_kamatis", {}, "₱85/kg today, rising trend over the past two weeks.") : "₱85/kg today, rising trend over the past two weeks.",
      supply: t ? t("farmer.calendar.factor_supply_kamatis", {}, "Arrivals at DFTC dropped this week compared to last.") : "Arrivals at DFTC dropped this week compared to last.",
      production: t ? t("farmer.calendar.factor_production_kamatis", {}, "Supply is usually moderate.") : "Supply is usually moderate.",
      weather: t ? t("farmer.calendar.factor_weather_kamatis", {}, "Dry days available in early and mid-month for planting.") : "Dry days available in early and mid-month for planting.",
      profit: t ? t("farmer.calendar.factor_profit_kamatis", {}, "Around ₱20/kg above estimated cost.") : "Around ₱20/kg above estimated cost.",
    })
  },
  "COM-0001": {
    bestVariety: "Galaxy",
    plantWindow: (m) => `${m} 1–15`,
    harvestWindow: (m, t) => (m === "August" ? (t ? t("farmer.calendar.months.november", {}, "November") : "November") : (t ? t("farmer.calendar.months.december", {}, "December") : "December")),
    factors: (m, p, t) => ({
      price: t ? t("farmer.calendar.factor_price_ampalaya", {}, "₱90/kg today, stable prices with strong market demand.") : "₱90/kg today, stable prices with strong market demand.",
      supply: t ? t("farmer.calendar.factor_supply_ampalaya", {}, "Arrivals at DFTC dropped this week compared to last.") : "Arrivals at DFTC dropped this week compared to last.",
      production: t ? t("farmer.calendar.factor_production_ampalaya", {}, "Supply is usually moderate.") : "Supply is usually moderate.",
      weather: t ? t("farmer.calendar.factor_weather_ampalaya", {}, "Suitable planting days available.") : "Suitable planting days available.",
      profit: t ? t("farmer.calendar.factor_profit_ampalaya", {}, "Around ₱25/kg above estimated cost.") : "Around ₱25/kg above estimated cost.",
    })
  }
};

const CalendarGrid = ({ year, month, selectedDay, onSelectDay, calendarData }) => {
  const { t } = useLanguage();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-indexed
  const currentDate = today.getDate();

  const isCurrentMonthView = currentYear === year && currentMonth === month;
  const todayDay = isCurrentMonthView ? currentDate : -1;
  const total = daysInMonth(year, month);
  const startCol = firstWeekday(year, month);
  const data = calendarData[monthKey(year, month)] ?? {};
  const cells = [
    ...Array(startCol).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1)
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // A day has passed ONLY if it is strictly before today
  const checkIsPassed = (day) => {
    if (year < currentYear) return true;
    if (year > currentYear) return false;
    if (month < currentMonth) return true;
    if (month > currentMonth) return false;
    return day < currentDate;
  };

  return (
    <>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d.key} className="text-center text-[12px] font-semibold text-[var(--hw-neutral-700)] py-1">
            {t(d.key, {}, d.fallback)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 gap-x-1 sm:gap-x-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const m = data[day] ?? {};
          const marked = hasAnyMarker(m);
          const isToday = day === todayDay;
          const isSelected = day === selectedDay;
          const isPast = checkIsPassed(day);

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`flex flex-col items-center justify-start pt-1.5 pb-1 min-h-[58px] sm:min-h-[64px] rounded-xl text-[13px] font-medium transition-all
                ${isSelected
                  ? "bg-[var(--hw-green-700)] text-white shadow-sm ring-2 ring-[var(--hw-green-700)]"
                  : isToday
                  ? "ring-2 ring-[var(--hw-green-700)] text-[var(--hw-neutral-900)] font-bold hover:bg-[var(--hw-green-50)]"
                  : isPast
                  ? "text-[var(--hw-neutral-400)] hover:bg-[var(--hw-neutral-50)]"
                  : "text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-100)]"
                }
              `}
            >
              <span className="leading-none mb-1">{day}</span>
              {marked && (
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 px-0.5">
                  {m.crop && (
                    <CommodityIllustration
                      commodityId={m.crop.id}
                      commodityName={m.crop.name}
                      baseName={m.crop.name}
                      className={`w-5.5 h-5.5 flex-shrink-0 transition-transform ${isSelected ? "brightness-110 drop-shadow-sm" : ""}`}
                    />
                  )}
                  {m.weather && (
                    <WIcon
                      type={m.weather}
                      cls={`w-4 h-4 flex-shrink-0 ${weatherColor(m.weather, isSelected)}`}
                    />
                  )}
                  {m.hasEvent && (
                    <CalendarClock
                      className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-white/90" : "text-emerald-600"}`}
                    />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
};

const SelectedDateDetails = ({ year, month, day, markers = {}, onClose }) => {
  const navigate = useNavigate();
  const { langCode, t } = useLanguage();
  const currentLang = langCode || "ceb";
  const rawMonthName = MONTH_NAMES[month - 1];
  const localizedMonth = t(`farmer.calendar.months.${rawMonthName.toLowerCase()}`, {}, rawMonthName);

  const fullDateLabel = `${localizedMonth} ${day}, ${year}`;
  const detailsTitle = t("farmer.calendar.selected_date.title", {}, currentLang === "ceb" ? "Inadlaw nga Detalye sa Kalendaryo ug Pag-uma" : currentLang === "tl" ? "Arawang Detalye ng Kalendaryo at Pagsasaka" : "Daily Calendar & Farming Details");

  // Crop Milestone
  const crop = markers?.crop || null;
  const cropPurpose = crop
    ? (currentLang === "ceb" ? crop.purposeCeb : currentLang === "tl" ? crop.purposeTl : crop.purposeEn)
    : null;
  const cropDesc = crop
    ? (currentLang === "ceb" ? crop.purposeDescCeb : currentLang === "tl" ? crop.purposeDescTl : crop.purposeDescEn)
    : null;

  // Weather Details
  const weather = markers?.weather || null;
  const weatherInfo = markers?.weatherInfo || null;
  const rainExplanation = weatherInfo
    ? explainRainfall(weatherInfo.rainfall, weatherInfo.rainProb, currentLang)
    : weather
    ? _weatherNote(weather, null, t)
    : null;

  // Market & Calendar Event Details
  const hasEvent = markers?.hasEvent || false;
  const isPayday = markers?.payday || false;
  const eventName = markers?.event || (isPayday ? t("farmer.calendar.selected_date.payday_note", {}, "Panahon sa sweldo. Gilaom nga mas taas ang gastos sa mga konsumer ug ang panginahanglan sa merkado.") : null);

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-5 md:p-6 space-y-4 transition-all animate-fadeIn">
      {/* Top Header with Date and Close button */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--hw-neutral-100)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--hw-green-100)] text-[var(--hw-green-700)] flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[15px] sm:text-[16px] font-bold text-[var(--hw-neutral-900)]">
              {fullDateLabel}
            </p>
            <p className="text-[12px] text-[var(--hw-neutral-500)]">
              {detailsTitle}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-100)] transition-colors"
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 3 Detail Cards: Crop Milestone, Weather Note, Market Events */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* 1. Crop Milestone Card */}
        <div className="bg-[var(--hw-neutral-50)] rounded-xl border border-[var(--hw-neutral-200)] p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-[var(--hw-neutral-700)]">
              <Sprout className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--hw-neutral-600)]">
                {t("farmer.calendar.legend.crop_schedule", {}, "Crop Schedule")}
              </span>
            </div>

            {crop ? (
              <div className="pt-1">
                <div className="flex items-center gap-2.5 mb-2">
                  <CommodityIllustration
                    commodityId={crop.id}
                    commodityName={crop.name}
                    baseName={crop.name}
                    className="w-10 h-10 flex-shrink-0"
                  />
                  <div>
                    <p className="text-[14px] font-bold text-[var(--hw-neutral-900)] leading-snug">
                      {crop.variant ? `${crop.name} (${crop.variant})` : crop.name}
                    </p>
                    <p className="text-[12px] text-emerald-700 font-medium">
                      {cropPurpose}
                    </p>
                  </div>
                </div>
                <p className="text-[12px] text-[var(--hw-neutral-700)] leading-relaxed">
                  {cropDesc || (crop.harvestStr ? `${t("farmer.calendar.selected_date.expected_harvest", {}, "Expected harvest")}: ${crop.harvestStr}` : "")}
                </p>
              </div>
            ) : (
              <div className="pt-1 text-[13px] text-[var(--hw-neutral-500)] leading-relaxed">
                {t("farmer.calendar.selected_date.no_crop_schedule", {}, "No crop schedule on this date.")}
              </div>
            )}
          </div>

          {crop ? (
            <button
              type="button"
              onClick={() => navigate(crop.cropPlanId ? `/farmer/crops/${crop.cropPlanId}` : "/farmer/crops")}
              className="w-full flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--hw-green-800)] transition-colors mt-auto"
            >
              {t("farmer.calendar.selected_date.check_crop", {}, "Check this crop")}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/farmer/crops")}
              className="w-full flex items-center justify-center gap-1.5 bg-white border border-[var(--hw-neutral-300)] text-[var(--hw-neutral-700)] px-3 py-2 rounded-xl text-xs font-medium hover:bg-[var(--hw-neutral-100)] transition-colors mt-auto"
            >
              <Sprout className="w-3.5 h-3.5 text-emerald-600" />
              {t("farmer.dashboard.add_crop_plan_btn", {}, "Add Crop Plan")}
            </button>
          )}
        </div>

        {/* 2. Weather Details Card */}
        <div className="bg-[var(--hw-neutral-50)] rounded-xl border border-[var(--hw-neutral-200)] p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[var(--hw-neutral-700)]">
                {weather ? (
                  <WIcon type={weather} cls={`w-4 h-4 flex-shrink-0 ${weatherColor(weather)}`} />
                ) : (
                  <Cloud className="w-4 h-4 text-[var(--hw-neutral-500)] flex-shrink-0" />
                )}
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--hw-neutral-600)]">
                  {t("farmer.calendar.selected_date.weather_note", {}, "Weather Note")}
                </span>
              </div>
              {weatherInfo && weatherInfo.tempMax != null && (
                <span className="text-[12px] font-bold text-[var(--hw-neutral-800)]">
                  {Math.round(weatherInfo.tempMax)}°C / {Math.round(weatherInfo.tempMin ?? 22)}°C
                </span>
              )}
            </div>

            <div className="pt-1">
              {weather ? (
                <p className="text-[13px] text-[var(--hw-neutral-700)] leading-relaxed">
                  {rainExplanation || _weatherNote(weather, weatherInfo, t)}
                </p>
              ) : (
                <p className="text-[13px] text-[var(--hw-neutral-500)] leading-relaxed">
                  {t("farmer.calendar.selected_date.no_weather_note", {}, "No weather forecast available for this date (available for next 14 days).")}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/farmer/market/weather")}
            className="w-full flex items-center justify-center gap-1.5 bg-white border border-[var(--hw-neutral-300)] text-[var(--hw-neutral-700)] px-3 py-2 rounded-xl text-xs font-medium hover:bg-[var(--hw-neutral-100)] transition-colors mt-auto"
          >
            {t("farmer.calendar.view_weather", {}, "View weather")}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3. Market & Calendar Events Card */}
        <div className="bg-[var(--hw-neutral-50)] rounded-xl border border-[var(--hw-neutral-200)] p-4 flex flex-col justify-start space-y-2.5">
          <div className="flex items-center gap-1.5 text-[var(--hw-neutral-700)]">
            <CalendarClock className={`w-4 h-4 flex-shrink-0 ${hasEvent ? "text-emerald-600" : "text-[var(--hw-neutral-500)]"}`} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--hw-neutral-600)]">
              {isPayday
                ? t("farmer.calendar.selected_date.payday", {}, "Payday Period")
                : t("farmer.calendar.selected_date.market_note", {}, "Market Note")}
            </span>
          </div>

          <div className="pt-1">
            {hasEvent ? (
              <p className="text-[13px] text-[var(--hw-neutral-800)] font-medium leading-relaxed">
                {eventName}
              </p>
            ) : (
              <p className="text-[13px] text-[var(--hw-neutral-500)] leading-relaxed">
                {t("farmer.calendar.selected_date.no_event_note", {}, "Regular trading day. No special market events or holidays recorded.")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function RecommendationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, langCode } = useLanguage();
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(null);

  // Accordion state for Good crops: first item expanded by default (matching Image 3)
  const [expandedCropId, setExpandedCropId] = useState("COM-0004");

  // Farmer profile coordinates reused by the weather advisory query (defaults to Davao City center)
  const profile = queryClient.getQueryData(["farmer", "profile"]) || queryClient.getQueryData(["dashboard", "profile"]);
  const weatherLat = profile?.latitude ?? DAVAO_CITY_FALLBACK_COORDINATES.latitude;
  const weatherLon = profile?.longitude ?? DAVAO_CITY_FALLBACK_COORDINATES.longitude;

  // Reuse prefetched market calendar
  const { data: rawMarketEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["marketCalendar"],
    queryFn: async () => {
      const res = await apiGet("/market/calendar");
      if (!res.ok) return [];
      const data = await parseResponse(res);
      return data.items || [];
    },
    staleTime: 1000 * 60 * 30,
  });

  // Use normalized farmer crop plans
  const { crops: cropPlansData = [], loading: plansLoading } = useCrops();

  // Monthly crop recommendations
  const formattedRefMonth = `${viewYear}-${String(viewMonth).padStart(2, "0")}-01`;
  const { data: recommendationsData } = useQuery({
    queryKey: ["monthly-recommendations", formattedRefMonth],
    queryFn: async () => {
      const res = await apiGet(`/market/monthly-recommendations?reference_month=${formattedRefMonth}`);
      if (!res.ok) {
        const fallbackRes = await apiGet("/market/monthly-recommendations");
        if (!fallbackRes.ok) return { items: [] };
        return parseResponse(fallbackRes);
      }
      const data = await parseResponse(res);
      if (!data.items || data.items.length === 0) {
        const fallbackRes = await apiGet("/market/monthly-recommendations");
        if (fallbackRes.ok) return parseResponse(fallbackRes);
      }
      return data;
    },
    staleTime: 1000 * 60 * 30,
  });

  const rawRecommendations = recommendationsData?.items ?? [];

  // Weather forecast — fills the calendar's daily weather note + icons
  const { data: weatherForecasts = [] } = useQuery({
    queryKey: ["weather", "advisory", weatherLat, weatherLon],
    queryFn: async () => {
      const res = await apiGet(`/weather/advisory?latitude=${weatherLat}&longitude=${weatherLon}`);
      if (!res.ok) return [];
      const data = await parseResponse(res);
      return data.daily_forecasts || [];
    },
    enabled: true,
    staleTime: 1000 * 60 * 30,
  });

  const weatherForecastList = useMemo(
    () => (Array.isArray(weatherForecasts) ? weatherForecasts : weatherForecasts?.daily_forecasts || []),
    [weatherForecasts]
  );

  // Build calendar data from cached data
  const calendarData = useMemo(
    () => ({ [monthKey(viewYear, viewMonth)]: buildCalendarMarkers(rawMarketEvents, cropPlansData, weatherForecastList, viewYear, viewMonth) }),
    [rawMarketEvents, cropPlansData, weatherForecastList, viewYear, viewMonth]
  );

  const key = monthKey(viewYear, viewMonth);
  const dayMarkers = calendarData[key] ?? {};
  const rawMonthName = MONTH_NAMES[viewMonth - 1];
  const rawMonthShort = MONTH_SHORT_NAMES[viewMonth - 1];
  const localizedMonth = t(`farmer.calendar.months.${rawMonthName.toLowerCase()}`, {}, rawMonthName);
  const selMarkers = selectedDay !== null ? dayMarkers[selectedDay] ?? null : null;

  // Filter ONLY Recommended crops for the "Good crops to plant" section
  const recommendedCrops = useMemo(() => {
    const list = rawRecommendations.filter(
      (rec) => rec.advisory_category === "Recommended"
    );

    // Deduplicate by commodity name or base id
    const seen = new Set();
    const result = [];

    for (const rec of list) {
      const cid = rec.commodity_id;
      const cname = rec.commodity_name || rec.commodityId || "Crop";
      if (seen.has(cname)) continue;
      seen.add(cname);

      const profile = DEFAULT_RECOMMENDED_PROFILES[cid] || {};
      const plantWindowStr = rec.planting_window_start && rec.planting_window_end
        ? `${new Date(rec.planting_window_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${new Date(rec.planting_window_end).getDate()}`
        : profile.plantWindow
        ? profile.plantWindow(localizedMonth)
        : `${localizedMonth} 1–20`;

      const harvestWindowStr = rec.harvest_window_start
        ? new Date(rec.harvest_window_start).toLocaleDateString("en-US", { month: "long" })
        : profile.harvestWindow
        ? profile.harvestWindow(rawMonthName, t)
        : t("farmer.calendar.months.november", {}, "November");

      const factors = profile.factors
        ? profile.factors(rawMonthName, rawMonthShort, t)
        : {
            price: rec.price_outlook ? `Price outlook is classified as ${rec.price_outlook}.` : "Stable market price trend.",
            supply: rec.arrival_pressure ? `Arrival pressure is ${rec.arrival_pressure}.` : "Moderate supply pressure.",
            production: rec.historical_seasonal_production_level ? `${harvestWindowStr} supply expected to be ${rec.historical_seasonal_production_level}.` : "Moderate seasonal production.",
            weather: rec.weather_risk_level ? `Weather conditions evaluated as ${rec.weather_risk_level}.` : "Conditions suitable for planting.",
            profit: "Favorable margin compared to estimated production costs.",
          };

      result.push({
        id: cid,
        name: cname,
        varietyCount: profile.varietyCount || t("farmer.calendar.variety_count_single", {}, "1 variety"),
        priceOutlookText: rec.explanation || profile.priceOutlookText || (cid === "COM-0004" ? t("farmer.calendar.price_outlook_rise", {}, "Price may rise soon") : t("farmer.calendar.price_outlook_profit", {}, "Good estimated profit")),
        bestVariety: profile.bestVariety || rec.bestVariety || null,
        plantWindow: plantWindowStr,
        harvestWindow: harvestWindowStr,
        factors,
      });
    }

    // If no recommended crops exist in the database for this month, fallback to the curated list
    if (result.length === 0) {
      const defaultIds = ["COM-0004", "COM-0001"]; // Kamatis & Ampalaya
      defaultIds.forEach((cid) => {
        const p = DEFAULT_RECOMMENDED_PROFILES[cid];
        const name = cid === "COM-0004" ? "Kamatis" : "Ampalaya";
        result.push({
          id: cid,
          name,
          varietyCount: t("farmer.calendar.variety_count_single", {}, "1 variety"),
          priceOutlookText: cid === "COM-0004"
            ? t("farmer.calendar.price_outlook_rise", {}, "Price may rise soon")
            : t("farmer.calendar.price_outlook_profit", {}, "Good estimated profit"),
          bestVariety: p.bestVariety,
          plantWindow: p.plantWindow(localizedMonth),
          harvestWindow: p.harvestWindow(rawMonthName, t),
          factors: p.factors(rawMonthName, rawMonthShort, t),
        });
      });
    }

    return result;
  }, [rawRecommendations, rawMonthName, rawMonthShort, localizedMonth, t]);

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else setViewMonth((m) => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else setViewMonth((m) => m + 1);
    setSelectedDay(null);
  };

  const handleSelectDay = (day) => setSelectedDay((d) => (d === day ? null : day));

  const toggleAccordion = (cropId) => {
    setExpandedCropId((prev) => (prev === cropId ? null : cropId));
  };

  const loading = eventsLoading && plansLoading;

  if (loading) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-7 w-40 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
          <div className="grid grid-cols-7 gap-2 pt-2">
            {Array.from({ length: 14 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-6">
      {/* ── 1. Page Header ── */}
      <div>
        <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
          {t("farmer.calendar.page_title", {}, "Crop Calendar")}
        </h1>
        <p className="text-[15px] text-[var(--hw-neutral-700)] mt-0.5">
          {t("farmer.calendar.page_subtitle", {}, "Track crop schedules and harvest timing.")}
        </p>
      </div>

      <WeatherLocationBanner />

      {/* ── 2. Crop Calendar Card ── */}
      <section className="space-y-4">
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-5 md:p-6 w-full">
          {/* Month navigator */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)] transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <p className="font-bold text-[16px] text-[var(--hw-neutral-900)]">
              {localizedMonth} {viewYear}
            </p>
            <button
              type="button"
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)] transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <CalendarGrid
            year={viewYear}
            month={viewMonth}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
            calendarData={calendarData}
          />

          {/* Legend matching weather cards, events, and crop milestones */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-5 pt-3.5 border-t border-[var(--hw-neutral-100)] text-[12px] text-[var(--hw-neutral-700)]">
            <div className="flex items-center gap-1.5">
              <CloudRain className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>{t("farmer.calendar.legend.light_rain", {}, "Light rain")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TwoToneStormIcon className="w-4 h-4 flex-shrink-0" />
              <span>{t("farmer.calendar.legend.heavy_rain", {}, "Heavy rain")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span>{t("farmer.calendar.legend.hot_days", {}, "Hot days")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{t("farmer.calendar.legend.events", {}, "Events")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sprout className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{t("farmer.calendar.legend.crop_schedule", {}, "Crop schedule")}</span>
            </div>
          </div>
        </div>

        {/* Selected date details container — placed directly BELOW the calendar container */}
        {selectedDay !== null && (
          <SelectedDateDetails
            year={viewYear}
            month={viewMonth}
            day={selectedDay}
            markers={selMarkers || {}}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </section>

      {/* ── 3. Good crops to plant in [Month] (Image 3) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-[var(--hw-neutral-900)]">
            {t("farmer.calendar.good_crops_month_title", { month: localizedMonth }, `Good crops to plant in ${localizedMonth}`)}
          </h2>
          <button
            type="button"
            onClick={() => navigate("/farmer/prices")}
            className="text-[13px] font-medium text-[var(--hw-green-700)] hover:underline"
          >
            {t("farmer.calendar.view_all_crops", {}, "View all crops")}
          </button>
        </div>

        <div className="space-y-3">
          {recommendedCrops.map((crop) => {
            const isExpanded = expandedCropId === crop.id;
            return (
              <div
                key={crop.id}
                className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-4"
              >
                {/* Crop Top Info */}
                <div className="flex items-start gap-4">
                  <CommodityIllustration
                    commodityId={crop.id}
                    commodityName={crop.name}
                    baseName={crop.name}
                    className="w-12 h-12 flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-[16px] font-bold text-[var(--hw-neutral-900)]">
                        {crop.name}
                      </h3>
                      <span className="text-[13px] text-[var(--hw-neutral-600)]">
                        {crop.varietyCount}
                      </span>
                    </div>

                    <p className="text-[14px] text-[var(--hw-neutral-700)] mt-0.5 leading-snug">
                      {crop.priceOutlookText}
                    </p>

                    {crop.bestVariety && (
                      <p className="text-[13px] font-medium text-[var(--hw-green-700)] mt-1">
                        {t("farmer.calendar.good_variety_prefix", { variety: crop.bestVariety }, `Good variety: ${crop.bestVariety}`)}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--hw-neutral-600)] mt-1">
                      <span>{t("farmer.calendar.plant_prefix", { window: crop.plantWindow }, `Plant: ${crop.plantWindow}`)}</span>
                      <span>{t("farmer.calendar.harvest_prefix", { window: crop.harvestWindow }, `Harvest: ${crop.harvestWindow}`)}</span>
                    </div>
                  </div>
                </div>

                {/* Accordion: Why this is a good crop this month */}
                <div className="border-t border-[var(--hw-neutral-100)] pt-3">
                  <button
                    type="button"
                    onClick={() => toggleAccordion(crop.id)}
                    className="w-full flex items-center justify-between text-left text-[14px] font-semibold text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
                  >
                    <span>{t("farmer.calendar.why_good_crop_title", {}, "Why this is a good crop this month")}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 flex-shrink-0 text-[var(--hw-green-700)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 flex-shrink-0 text-[var(--hw-green-700)]" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-3.5 space-y-2.5 pt-1 text-[13px] text-[var(--hw-neutral-700)]">
                      <div className="flex items-start gap-2.5">
                        <span className="font-bold text-[var(--hw-green-700)] flex-shrink-0 leading-tight">₱</span>
                        <p className="leading-snug">
                          <span className="font-semibold text-[var(--hw-green-700)]">
                            {t("farmer.calendar.factor_price", {}, "Price")}
                          </span>{" "}
                          · {crop.factors.price}
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Package className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="leading-snug">
                          <span className="font-semibold text-blue-500">
                            {t("farmer.calendar.factor_supply", {}, "Supply")}
                          </span>{" "}
                          · {crop.factors.supply}
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Leaf className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <p className="leading-snug">
                          <span className="font-semibold text-emerald-600">
                            {t("farmer.calendar.factor_production", {}, "Production")}
                          </span>{" "}
                          · {crop.factors.production}
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Cloud className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                        <p className="leading-snug">
                          <span className="font-semibold text-sky-500">
                            {t("farmer.calendar.factor_weather", {}, "Weather")}
                          </span>{" "}
                          · {crop.factors.weather}
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <TrendingUp className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="leading-snug">
                          <span className="font-semibold text-amber-500">
                            {t("farmer.calendar.factor_profit", {}, "Profit")}
                          </span>{" "}
                          · {crop.factors.profit}
                        </p>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => navigate("/farmer/market/factors", { state: { commodityId: crop.id, commodityName: crop.name } })}
                          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
                        >
                          {t("farmer.calendar.view_detailed_factors", {}, "View detailed factors")}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 4. Weather Note Card (Image 5) ── */}
      <section>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CloudRain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">
                  {t("farmer.calendar.weather_note_title", {}, "Weather note")}
                </h3>
                <p className="text-[13px] text-[var(--hw-neutral-700)] mt-0.5 leading-snug">
                  {t("farmer.calendar.weather_note_default", {}, "Rain is expected this week. Clear drainage before planting.")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/farmer/market/weather")}
              className="text-[13px] font-medium text-[var(--hw-green-700)] hover:underline whitespace-nowrap flex-shrink-0 pt-0.5"
            >
              {t("farmer.calendar.view_weather", {}, "View weather")}
            </button>
          </div>
        </div>
      </section>

      {/* ── 5. Check a crop before planting Card (Image 5) ── */}
      <section>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-50 text-[var(--hw-green-700)] flex items-center justify-center flex-shrink-0">
              <Sprout className="w-5 h-5" />
            </div>
            <h3 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">
              {t("farmer.calendar.check_crop_title", {}, "Check a crop before planting")}
            </h3>
          </div>
          <p className="text-[13px] text-[var(--hw-neutral-700)] leading-snug">
            {t("farmer.calendar.check_crop_desc", {}, "Enter your crop, farm size, cost, and expected harvest to get a recommendation.")}
          </p>
          <button
            type="button"
            onClick={() => navigate("/farmer/assess")}
            className="w-full bg-[var(--hw-green-700)] hover:bg-[var(--hw-green-800)] text-white font-medium py-3 rounded-full flex items-center justify-center gap-2 transition-colors text-sm"
          >
            {t("farmer.calendar.start_check", {}, "Start check")}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}

export { RecommendationPage as default };
