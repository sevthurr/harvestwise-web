import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  CloudRain,
  Sun,
  CalendarClock,
  Sprout
} from "lucide-react";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { toCamelCase } from "../../global/utils/apiTransforms";
import { apiGet, parseResponse } from "../../global/api";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { Skeleton } from "../components/shared/FarmerSkeletons";
import { useCrops } from "../components/crops/CropsContext";

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

// Build calendar markers from market events, crop plans, and the weather forecast for the grid
function forecastMarkerType(f) {
  const condition = String(f.suitability || f.weather_condition || "").toLowerCase();
  if (condition.includes("severe")) return "storm";
  if (condition.includes("heat")) return "heat";
  const rainfall = Number(f.rainfall_mm) || 0;
  const rainProb = Number(f.rain_probability_pct) || 0;
  if (rainfall >= 5 || rainProb >= 60) return "rain";
  if (condition.includes("caution") && rainfall > 0) return "rain";
  return "sun";
}

function buildCalendarMarkers(marketEvents, cropPlans, weatherForecasts, year, month) {
  const markers = {};

  (marketEvents || []).forEach((item) => {
    const camel = toCamelCase(item);
    const origDate = camel.calendarDate || camel.date;
    if (!origDate) return;
    const ds = String(origDate);
    const d = parseInt(ds.split("-")[2], 10);
    if (isNaN(d)) return;

    if (camel.holidayName || camel.eventName) {
      if (!markers[d]) markers[d] = {};
      markers[d].event = camel.holidayName || camel.eventName;
    }
  });

  (cropPlans || []).forEach((c) => {
    const pDate = c.rawPlantingDate || c.actualPlantingDate || c.plannedPlantingDate || c.plantingDate;
    const name = c.commodityName && c.commodityName !== "\u2013" ? c.commodityName : "Crop";
    const variant = c.variant || c.variety || null;
    if (pDate) {
      const ds = String(pDate);
      const parts = ds.split("-");
      if (parts[0] === String(year) && parseInt(parts[1], 10) === month) {
        const d = parseInt(parts[2], 10);
        if (!markers[d]) markers[d] = {};
        markers[d].crop = {
          id: c.commodityId || c.commodity || "crop",
          name,
          variant,
          type: "plant",
          harvestStr: c.harvestDate || (c.expectedHarvestDate ? new Date(c.expectedHarvestDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null),
        };
      }
    }
    const hDate = c.rawHarvestDate || c.expectedHarvestDate || c.harvestDate;
    if (hDate) {
      const ds = String(hDate);
      const parts = ds.split("-");
      if (parts[0] === String(year) && parseInt(parts[1], 10) === month) {
        const d = parseInt(parts[2], 10);
        if (!markers[d]) markers[d] = {};
        markers[d].crop = {
          id: c.commodityId || c.commodity || "crop",
          name,
          variant,
          type: "harvest",
        };
      }
    }
  });

  (weatherForecasts || []).forEach((f) => {
    const ds = String(f.date || "");
    const parts = ds.split("-");
    if (parts.length < 3) return;
    if (parts[0] === String(year) && parseInt(parts[1], 10) === month) {
      const d = parseInt(parts[2], 10);
      if (isNaN(d)) return;
      if (!markers[d]) markers[d] = {};
      markers[d].weather = forecastMarkerType(f);
      markers[d].weatherInfo = {
        tempMin: f.temperature_min,
        tempMax: f.temperature_max,
        rainfall: f.rainfall_mm,
        rainProb: f.rain_probability_pct,
        condition: f.suitability || f.weather_condition || null,
      };
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
  return !!(m.crop || m.weather || m.event);
}

const WIcon = ({ type, cls }) => {
  if (type === "rain") return <CloudRain className={cls} />;
  if (type === "storm") return <TwoToneStormIcon className={cls} />;
  return <Sun className={cls} />;
};

const weatherColor = (type, selected = false) => {
  if (selected) return "text-white/80";
  if (type === "heat") return "text-orange-500";
  if (type === "storm") return "text-blue-600";
  return "text-blue-500";
};

const _weatherNote = (type, info, t) => {
  const hasInfo = !!(info && (info.rainProb != null || info.rainfall != null || info.tempMax != null));
  const rainProb = hasInfo && info.rainProb != null ? ` (${Math.round(info.rainProb)}% chance)` : "";
  const rainMm = hasInfo && info.rainfall != null ? ` ~${info.rainfall} mm` : "";
  const temps =
    hasInfo && info.tempMax != null && info.tempMin != null
      ? ` ${Math.round(info.tempMin)}°–${Math.round(info.tempMax)}°`
      : "";
  if (type === "storm") return t("farmer.calendar.weather_note_storm", { rain_mm: rainMm });
  if (type === "heat") return t("farmer.calendar.weather_note_heat");
  if (type === "rain") return t("farmer.calendar.weather_note_rain", { rain_mm: rainMm, rain_chance: rainProb });
  return t("farmer.calendar.weather_note_fair", { temps });
};

const CalendarGrid = ({ year, month, selectedDay, onSelectDay, calendarData }) => {
  const { t } = useLanguage();
  const today = new Date();
  const isNow = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay = isNow ? today.getDate() : -1;
  const total = daysInMonth(year, month);
  const startCol = firstWeekday(year, month);
  const data = calendarData[monthKey(year, month)] ?? {};
  const cells = [
    ...Array(startCol).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1)
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d.key} className="text-center text-[12px] font-semibold text-[var(--hw-neutral-700)] py-1">
            {t(d.key, {}, d.fallback)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const m = data[day] ?? {};
          const marked = hasAnyMarker(m);
          const isToday = day === todayDay;
          const isSelected = day === selectedDay;
          return (
            <button
              key={day}
              onClick={() => onSelectDay(day)}
              className={`flex flex-col items-center justify-start pt-1.5 pb-1 min-h-[52px] rounded-xl text-[13px] font-medium transition-colors
                ${isSelected ? "bg-[var(--hw-green-700)] text-white" : isToday ? "ring-2 ring-[var(--hw-green-700)] text-[var(--hw-neutral-900)]" : marked ? "text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-100)]" : "text-[var(--hw-neutral-400)] hover:bg-[var(--hw-neutral-50)]"}
              `}
            >
              <span>{day}</span>
              {marked && (
                <div className="flex items-center justify-center gap-0.5 mt-0.5 px-0.5">
                  {m.crop && (
                    <CommodityIllustration
                      commodityId={m.crop.id}
                      className={`w-4 h-4 flex-shrink-0 ${isSelected ? "opacity-80" : ""}`}
                    />
                  )}
                  {m.weather && (
                    <WIcon
                      type={m.weather}
                      cls={`w-3.5 h-3.5 flex-shrink-0 ${weatherColor(m.weather, isSelected)}`}
                    />
                  )}
                  {m.event && (
                    <CalendarClock
                      className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-white/80" : "text-emerald-600"}`}
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

const SelectedDateCard = ({ year, month, day, markers }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const rawMonthName = MONTH_NAMES[month - 1];
  const localizedMonth = t(`farmer.calendar.months.${rawMonthName.toLowerCase()}`, {}, rawMonthName);

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
      <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">
        {localizedMonth} {day}, {year}
      </p>

      {markers.crop && (
        <div className="flex items-start gap-2.5">
          <CommodityIllustration commodityId={markers.crop.id} className="w-8 h-8 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
              {markers.crop.variant ? `${markers.crop.name} (${markers.crop.variant})` : markers.crop.name}
            </p>
            {markers.crop.type === "plant" && markers.crop.harvestStr && (
              <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">
                {t("farmer.calendar.selected_date.expected_harvest", {}, "Expected harvest")}: {markers.crop.harvestStr}
              </p>
            )}
            {markers.crop.type === "harvest" && (
              <p className="text-[13px] text-emerald-600 font-medium mt-0.5">
                {t("farmer.calendar.selected_date.expected_harvest_date", {}, "Expected harvest date")}
              </p>
            )}
          </div>
        </div>
      )}

      {markers.weather ? (
        <div className="flex items-start gap-2">
          <WIcon
            type={markers.weather}
            cls={`w-4 h-4 flex-shrink-0 mt-0.5 ${weatherColor(markers.weather)}`}
          />
          <div>
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-700)]">
              {t("farmer.calendar.selected_date.weather_note", {}, "Weather note")}
            </p>
            <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">
              {_weatherNote(markers.weather, markers.weatherInfo || null, t)}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <CloudRain className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-700)]">
              {t("farmer.calendar.selected_date.weather_note", {}, "Weather note")}
            </p>
            <p className="text-[13px] text-[var(--hw-neutral-500)] mt-0.5 leading-snug">
              {t("farmer.calendar.empty_weather_note", {}, "No weather note available right now.")}
            </p>
          </div>
        </div>
      )}

      {markers.event && (
        <div className="flex items-start gap-2">
          <CalendarClock className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-700)]">
              {t("farmer.calendar.selected_date.market_note", {}, "Market note")}
            </p>
            <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">{markers.event}</p>
          </div>
        </div>
      )}

      <button
        onClick={() => navigate("/farmer/assess")}
        className="w-full flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors"
      >
        {t("farmer.calendar.selected_date.check_crop", {}, "Check this crop")}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

function RecommendationPage() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(null);

  // Farmer profile coordinates reused by the weather advisory query
  const DEFAULT_WEATHER_LAT = 7.0722;
  const DEFAULT_WEATHER_LON = 125.6131;
  const profile = queryClient.getQueryData(["dashboard", "profile"]);
  const weatherLat = profile?.latitude ?? DEFAULT_WEATHER_LAT;
  const weatherLon = profile?.longitude ?? DEFAULT_WEATHER_LON;

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

  // Weather forecast — fills the calendar's daily weather note + icons
  const { data: weatherForecasts = [] } = useQuery({
    queryKey: ["weather", "advisory"],
    queryFn: async () => {
      const res = await apiGet(`/weather/advisory?latitude=${weatherLat}&longitude=${weatherLon}`);
      if (!res.ok) return [];
      const data = await parseResponse(res);
      return data.daily_forecasts || [];
    },
    staleTime: 1000 * 60 * 30,
  });

  // The prefetched cache may hold the raw advisory object instead of the array
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
  const monthName = t(`farmer.calendar.months.${rawMonthName.toLowerCase()}`, {}, rawMonthName);
  const selMarkers = selectedDay !== null ? dayMarkers[selectedDay] ?? null : null;
  const showDetail = selMarkers !== null && hasAnyMarker(selMarkers);

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

  const loading = eventsLoading && plansLoading;

  if (loading) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-7 w-40 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        {/* Calendar Month Selector Skeleton */}
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
      {/* ── Header ── */}
      <div>
        <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
          {t("farmer.calendar.page_title", {}, "Crop Calendar")}
        </h1>
        <p className="text-[15px] text-[var(--hw-neutral-900)] mt-0.5">
          {t("farmer.calendar.page_subtitle", {}, "Track crop schedules and harvest timing.")}
        </p>
      </div>

      {/* ── Crop Calendar ── */}
      <section>
        <div className={`md:grid md:gap-5 md:items-start ${showDetail ? "md:grid-cols-[1fr_320px]" : ""}`}>
          {/* Calendar card */}
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
            {/* Month navigator */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="p-2 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)] transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="font-semibold text-[var(--hw-neutral-900)]">
                {monthName} {viewYear}
              </p>
              <button
                type="button"
                onClick={nextMonth}
                className="p-2 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)] transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <CalendarGrid
              year={viewYear}
              month={viewMonth}
              selectedDay={selectedDay}
              onSelectDay={handleSelectDay}
              calendarData={calendarData}
            />

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-[var(--hw-neutral-100)]">
              <div className="flex items-center gap-1">
                <CloudRain className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span className="text-[12px] text-[var(--hw-neutral-900)] whitespace-nowrap">
                  {t("farmer.calendar.legend.light_rain", {}, "Light rain")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <TwoToneStormIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-[12px] text-[var(--hw-neutral-900)] whitespace-nowrap">
                  {t("farmer.calendar.legend.heavy_rain", {}, "Heavy rain")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                <span className="text-[12px] text-[var(--hw-neutral-900)] whitespace-nowrap">
                  {t("farmer.calendar.legend.hot_days", {}, "Hot days")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <CalendarClock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span className="text-[12px] text-[var(--hw-neutral-900)] whitespace-nowrap">
                  {t("farmer.calendar.legend.events", {}, "Events")}
                </span>
              </div>
            </div>
          </div>

          {/* Selected date card — only when a marked day is tapped */}
          {showDetail && selectedDay !== null && selMarkers !== null && (
            <div className="mt-4 md:mt-0">
              <SelectedDateCard year={viewYear} month={viewMonth} day={selectedDay} markers={selMarkers} />
            </div>
          )}
        </div>
      </section>

      {/* ── Crop recommendations ── */}
      <section className="space-y-3">
        <h2 className="text-[17px] font-bold text-[var(--hw-neutral-900)]">
          {t("farmer.calendar.recommendations_title", {}, "Crop recommendations")}
        </h2>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-6 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--hw-green-50)] text-[var(--hw-green-700)] flex items-center justify-center">
            <Sprout className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--hw-neutral-900)] text-[15px]">
              {t("farmer.calendar.empty_recommendations_title", {}, "No crop recommendations available yet.")}
            </p>
            <p className="text-sm text-[var(--hw-neutral-600)] max-w-md mx-auto">
              {t("farmer.calendar.empty_recommendations_helper", {}, "There is not enough data yet to provide a recommendation for this month.")}
            </p>
          </div>
          <div className="pt-1">
            <button
              onClick={() => navigate("/farmer/assess")}
              className="inline-flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors"
            >
              {t("farmer.calendar.check_a_crop", {}, "Check a crop")}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export { RecommendationPage as default };
