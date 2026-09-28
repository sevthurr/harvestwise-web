import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ArrowRight, Sprout } from "lucide-react";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { apiGet, parseResponse } from "../../global/api";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { Skeleton } from "../components/shared/FarmerSkeletons";
import { useCrops } from "../components/crops/CropsContext";
import { DAVAO_CITY_FALLBACK_COORDINATES } from "../../global/constants/location";
import { WeatherLocationBanner } from "../components/shared/WeatherLocationBanner";
import CalendarGrid from "../components/calendar/CalendarGrid";
import CalendarLegend from "../components/calendar/CalendarLegend";
import DayDetailCard from "../components/calendar/DayDetailCard";
import {
  MONTH_NAMES,
  buildCalendarMarkers,
  hasAnyMarker,
  monthKey,
} from "../utils/calendarMarkers";
import {
  advisoryCategoryLabel,
  recommendationLine,
  toneClasses,
} from "../utils/plantingLabels";
import { formatCropLabel } from "../utils/formatters";

function RecommendationPage() {
  const queryClient = useQueryClient();
  const { t, langCode } = useLanguage();
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(null);

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

  // Monthly crop recommendations from adaptive weights / analytics pipeline
  const { data: recommendationsData } = useQuery({
    queryKey: ["monthly-recommendations"],
    queryFn: async () => {
      const res = await apiGet("/market/monthly-recommendations");
      if (!res.ok) return { items: [] };
      return parseResponse(res);
    },
    staleTime: 1000 * 60 * 30,
  });
  const recommendations = recommendationsData?.items ?? [];

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

      <WeatherLocationBanner />

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
              markers={dayMarkers}
            />

            <CalendarLegend markers={dayMarkers} />
          </div>

          {/* Selected date card — only when a marked day is tapped */}
          {showDetail && selectedDay !== null && selMarkers !== null && (
            <div className="mt-4 md:mt-0">
              <DayDetailCard
                year={viewYear}
                month={viewMonth}
                day={selectedDay}
                marker={selMarkers}
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Crop recommendations ── */}
      <section className="space-y-3">
        <h2 className="text-[17px] font-bold text-[var(--hw-neutral-900)]">
          {t("farmer.calendar.recommendations_title", {}, "Crop recommendations")}
        </h2>

        {recommendations.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendations.map((rec) => {
              const category = advisoryCategoryLabel(rec.advisory_category, t);
              const line = recommendationLine(rec, t, langCode);

              return (
                <div
                  key={rec.id}
                  className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3.5 flex items-start gap-2.5"
                >
                  <CommodityIllustration
                    commodityId={rec.commodity_id}
                    commodityName={rec.commodity_name}
                    baseName={rec.commodity_name}
                    className="w-8 h-8 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)] truncate">
                        {formatCropLabel(rec.commodity_name, rec.commodity_variety, rec.commodity_id)}
                      </p>
                      {category && (
                        <span
                          className={`flex-shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${toneClasses(category.tone)}`}
                        >
                          {category.text}
                        </span>
                      )}
                    </div>
                    {line && (
                      <p className="text-[12px] text-[var(--hw-neutral-600)] leading-snug line-clamp-1 mt-0.5">
                        {line}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export { RecommendationPage as default };
