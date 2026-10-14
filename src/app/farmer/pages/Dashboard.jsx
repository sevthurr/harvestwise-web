import {
  Clock,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarDays,
  Plus,
  RefreshCw,
  MapPin
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { getVariants } from "../../global/data/commodities";
import { toCamelCase, formatPrice } from "../../global/utils/apiTransforms";
import { fetchFarmerProfile } from "../../global/hooks/useFarmerPrefetch";
import { Skeleton, SkeletonListRow } from "../components/shared/FarmerSkeletons";
import PlantingSuitabilityCard from "../components/crops/PlantingSuitabilityCard";
import { getPhaseConfig } from "../components/crops/types";
import { useCrops } from "../components/crops/CropsContext";
import { useAuth } from "../../global/contexts/AuthContext";
import * as pricesApi from "../../../services/api/pricesApi";

const DIR_CFG = {
  Rising: { color: "text-emerald-600", Icon: TrendingUp, key: "farmer.prices.trend_rising", label: "Rising" },
  Falling: { color: "text-red-500", Icon: TrendingDown, key: "farmer.prices.trend_falling", label: "Falling" },
  Stable: { color: "text-blue-500", Icon: Minus, key: "farmer.prices.trend_stable", label: "Stable" },
  default: { color: "text-[var(--hw-neutral-500)]", Icon: Minus, key: "farmer.prices.trend_no_data", label: "No trend data" }
};

function formatForecastPeriod(forecast) {
  const forecastDates = (forecast?.points ?? [])
    .map((point) => point.forecast_date)
    .filter((date) => typeof date === "string" && !Number.isNaN(Date.parse(`${date}T00:00:00`)))
    .sort();
  const endDate = forecast?.forecast_date || forecastDates.at(-1);
  if (!endDate || Number.isNaN(Date.parse(`${endDate}T00:00:00`))) return null;

  const startDate = forecastDates[0] || endDate;
  const formatDate = (date) => new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  return startDate === endDate ? end : `${start} – ${end}`;
}

function formatPriceChange(forecast, currentPrice) {
  if (!forecast || forecast.forecast_midpoint == null) return null;
  const midpoint = Number(forecast.forecast_midpoint);
  const current = currentPrice != null ? Number(currentPrice) : null;
  if (current == null || current <= 0) return null;

  const diff = midpoint - current;
  const absDiff = Math.abs(diff);
  const formattedVal = absDiff < 1 && absDiff > 0.05
    ? absDiff.toFixed(2)
    : Math.round(absDiff).toString();

  const direction = forecast.trend;
  if (direction === "Rising" || (direction !== "Falling" && diff > 0.05)) {
    return `+₱${formattedVal}`;
  }
  if (direction === "Falling" || (direction !== "Rising" && diff < -0.05)) {
    return `-₱${formattedVal}`;
  }
  return `₱${formattedVal}`;
}

/**
 * Tracks whether a scroll region actually overflows, so the "scroll for more"
 * affordance is only rendered when there is something hidden below the fold.
 *
 * The list height is decided by flexbox and by the neighbouring column, so a
 * one-off measurement is not enough: it changes on resize and whenever the
 * suitability card beside it grows.
 */
function useOverflowHint(revision) {
  const ref = useRef(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setScrollable(el.scrollHeight - el.clientHeight > 4);
    measure();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [revision]);

  return [ref, scrollable];
}


function getGreeting(t) {
  const hour = new Date().getHours();
  if (hour < 12) return t("farmer.dashboard.greeting_morning", {}, "Good morning");
  if (hour < 18) return t("farmer.dashboard.greeting_afternoon", {}, "Good afternoon");
  return t("farmer.dashboard.greeting_evening", {}, "Good evening");
}

function ProfitCard({ cropPlans, loading }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  if (loading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">{t("farmer.dashboard.estimated_profit", {}, "Estimated Profit")}</h2>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3 animate-pulse">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-1/3 rounded" />
              <Skeleton className="h-3 w-1/4 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      </section>
    );
  }

  if (!cropPlans || cropPlans.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">{t("farmer.dashboard.estimated_profit", {}, "Estimated Profit")}</h2>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">{t("farmer.dashboard.no_active_plan", {}, "No active crop plan yet.")}</p>
          <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">
            {t("farmer.dashboard.add_crop_plan_desc", {}, "Add a crop plan to see how much you might earn.")}
          </p>
          <button
            onClick={() => navigate("/farmer/assess")}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {t("farmer.dashboard.add_crop_plan_btn", {}, "Add crop plan")}
          </button>
        </div>
      </section>
    );
  }

  // Find nearest harvest crop
  const nearestCrop = cropPlans
    .filter(c => (c.expectedHarvestDate || c.rawHarvestDate || c.harvestDate) && c.phase !== 'completed' && c.status !== 'Completed')
    .sort((a, b) => new Date(a.expectedHarvestDate || a.rawHarvestDate || a.harvestDate) - new Date(b.expectedHarvestDate || b.rawHarvestDate || b.harvestDate))[0]
    || cropPlans.find(c => c.expectedHarvestDate || c.rawHarvestDate || c.harvestDate)
    || cropPlans[0];
  
  if (!nearestCrop) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">{t("farmer.dashboard.estimated_profit", {}, "Estimated Profit")}</h2>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">{t("farmer.dashboard.no_active_plan", {}, "No active crop plan yet.")}</p>
          <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">
            {t("farmer.dashboard.add_crop_plan_desc", {}, "Add a crop plan to see how much you might earn.")}
          </p>
          <button
            onClick={() => navigate("/farmer/assess")}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {t("farmer.dashboard.add_crop_plan_btn", {}, "Add crop plan")}
          </button>
        </div>
      </section>
    );
  }

  const rawDate = nearestCrop.expectedHarvestDate || nearestCrop.rawHarvestDate;
  const harvestDate = rawDate
    ? new Date(rawDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : (nearestCrop.harvestDate || '-');
  let profitLow = nearestCrop.profitLower || 0;
  let profitHigh = nearestCrop.profitUpper || 0;
  if ((profitLow <= 0 || profitHigh <= 0) && (nearestCrop.currentPrice || nearestCrop.farmgatePrice) && nearestCrop.breakEvenPrice && (nearestCrop.expectedHarvestQty || nearestCrop.harvestQuantity)) {
    const basis = nearestCrop.farmgatePrice || nearestCrop.currentPrice;
    const qty = nearestCrop.expectedHarvestQty || nearestCrop.harvestQuantity;
    const margin = basis - nearestCrop.breakEvenPrice;
    if (margin > 0) {
      profitLow = Math.floor(margin * qty * 0.85 / 1e3) * 1e3;
      profitHigh = Math.ceil(margin * qty * 1.1 / 1e3) * 1e3;
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">{t("farmer.dashboard.estimated_profit", {}, "Estimated Profit")}</h2>
        <button
          onClick={() => navigate("/farmer/crops")}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
        >
          {t("common.view_all", {}, "View all")}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
        <div className="flex items-center gap-3 mb-3">
          <CommodityIllustration
            commodityId={nearestCrop.commodityId || nearestCrop.commodity}
            commodityName={nearestCrop.commodityName}
            baseName={nearestCrop.commodityName}
            className="w-10 h-10 flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
              {nearestCrop.variety ? `${nearestCrop.commodityName || '–'} (${nearestCrop.variety})` : (nearestCrop.commodityName || '–')}
            </p>
            <div className="flex items-center gap-1.5 text-[var(--hw-neutral-900)]">
              <CalendarDays className="w-3 h-3 flex-shrink-0" />
              <span className="text-[12px]">{t("farmer.dashboard.harvest_label", {}, "Harvest: ")}{harvestDate}</span>
            </div>
          </div>
        </div>

        <p className="text-[26px] font-bold text-[var(--hw-neutral-900)] leading-tight">
          {profitLow > 0 || profitHigh > 0 ? `₱${profitLow.toLocaleString()}–₱${profitHigh.toLocaleString()}` : '–'}
        </p>
        <p className="text-[12px] font-medium text-[var(--hw-neutral-900)] mt-0.5">{t("farmer.dashboard.estimated_profit", {}, "Estimated Profit")}</p>
        <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">{t("farmer.dashboard.nearest_harvest_caption", {}, "Nearest harvest among your crops.")}</p>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--hw-neutral-100)]">
          <p className="text-[12px] text-[var(--hw-neutral-900)] leading-snug">
            {t("farmer.dashboard.estimate_income_notice", {}, "Estimate only. Actual income may change.")}
          </p>
          <button
            onClick={() => navigate("/farmer/crops")}
            className="flex-shrink-0 text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
          >
            {t("common.see_details", {}, "View details")}
          </button>
        </div>
      </div>
    </section>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["farmer", "profile"],
    queryFn: fetchFarmerProfile,
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
  });

  const { crops: cropPlans = [], loading: cropsLoading } = useCrops();

  const pricesQuery = useQuery({
    queryKey: ["dashboard", "prices"],
    queryFn: async () => {
      const pricesData = await pricesApi.getPriceList({ is_top10: true, page_size: 50 });
      const baseMap = new Map();
      (pricesData?.items || []).forEach(item => {
        const camelItem = toCamelCase(item);
        const isTop = camelItem.isTop10 === true || item.is_top10 === true;
        if (!isTop) return;
        const name = camelItem.name || '\u2013';
        const bangkerohanRetail = camelItem.prices?.bangkerohanRetail;
        const dftcRetail = camelItem.prices?.dftcRetail;
        const priceType = bangkerohanRetail != null
          ? "bangkerohan_retail"
          : dftcRetail != null
            ? "dftc_retail"
            : null;
        const retailPrice = bangkerohanRetail ?? dftcRetail ?? null;
        if (!baseMap.has(name)) {
          baseMap.set(name, {
            id: camelItem.commodityId,
            name,
            baseName: camelItem.baseName,
            price: retailPrice,
            priceType,
            uom: camelItem.unitOfMeasure || 'kg',
          });
        } else {
          const existing = baseMap.get(name);
          if (retailPrice !== null && existing.price === null) {
            existing.price = retailPrice;
            existing.id = camelItem.commodityId;
            if (priceType) existing.priceType = priceType;
          }
          if (!existing.direction && camelItem.forecast?.trend) {
            existing.direction = camelItem.forecast.trend;
          }
        }
      });
      const itemsList = Array.from(baseMap.values());
      // Populate real increasing / decreasing trend for commodities from their price detail endpoint
      await Promise.all(
        itemsList.map(async (item) => {
          if (item.id) {
            try {
              const dRes = await apiGet(`/prices/${item.id}?price_type=${item.priceType || 'bangkerohan_retail'}&horizon=7&records_limit=5`);
              if (dRes.ok) {
                const detail = await parseResponse(dRes);
                if (detail?.forecast) {
                  item.forecast = detail.forecast;
                  item.direction = detail.forecast.trend;
                }
                if (detail?.recent_records) {
                  item.recent_records = detail.recent_records;
                }
              }
            } catch {
              // fallback remains null
            }
          }
        })
      );
      return itemsList;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const farmerProfile = profileQuery.data;
  const prices = pricesQuery.data ?? [];
  const priceTrendQueries = useQueries({
    queries: prices.map((item) => ({
      queryKey: ["farmer-price-card-trend", item.id, item.priceType || "bangkerohan_retail", 7],
      queryFn: () => pricesApi.getPriceDetail(item.id, {
        price_type: item.priceType || "bangkerohan_retail",
        horizon: 7,
        records_limit: 100,
      }),
      enabled: Boolean(item.id),
      staleTime: 60 * 1000,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
    })),
  });
  const isLoading = profileQuery.isLoading || cropsLoading || pricesQuery.isLoading;

  // Re-measured whenever the list content or the page loading state changes.
  const [pricesListRef, pricesScrollable] = useOverflowHint(`${prices.length}:${isLoading}`);

  // Preferred crops the farmer already selected.
  const preferredCrops = farmerProfile?.preferred_crops || farmerProfile?.preferredCrops || [];
  const preferredCropIds = new Set(preferredCrops.map(p => p.commodity_id || p.commodityId));

  const greeting = getGreeting(t);
  const firstName = farmerProfile?.first_name || user?.first_name;
  const greetingText = firstName ? t("farmer.dashboard.greeting_name", { greeting, name: firstName }, `${greeting}, ${firstName}!`) : `${greeting}!`;

  const now = new Date();
  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];
  const currentMonthKey = monthNames[now.getMonth()];
  const rawMonthName = currentMonthKey.charAt(0).toUpperCase() + currentMonthKey.slice(1);
  const localizedMonth = t(`farmer.calendar.months.${currentMonthKey}`, {}, rawMonthName);

  // Format farmer's location: [purok_sitio, street, barangay, district, city]
  const formatLocationSubtitle = () => {
    const purok = farmerProfile?.purok_sitio || farmerProfile?.purokSitio || user?.purok_sitio || user?.purokSitio;
    const street = farmerProfile?.street || user?.street;
    const barangay = farmerProfile?.barangay || user?.barangay;
    const district = farmerProfile?.district || user?.district;
    const city = farmerProfile?.city || user?.city || "Davao City";

    // If farmer has no location details entered, default to Davao City
    if (!barangay && !district && !purok && !street) {
      return "Davao City";
    }

    const parts = [purok, street, barangay, district, city].filter(Boolean);
    return [...new Set(parts)].join(", ");
  };

  const subtitle = formatLocationSubtitle();

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5 md:space-y-6">

        {/* ── 1. Greeting ── */}
        <div>
          <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
            {greetingText}
          </h1>
          <p className="text-[15px] text-[var(--hw-neutral-600)] mt-0.5 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[var(--hw-green-700)] flex-shrink-0" />
            <span>{subtitle}</span>
          </p>
        </div>

        {/* ── 2. Main action card ── */}
        <div className="bg-[var(--hw-green-700)] rounded-2xl p-5 text-white shadow-[var(--shadow-md)]">
          <p className="font-semibold text-lg leading-snug">{t("farmer.dashboard.hero_title", {}, "Need help choosing what to plant?")}</p>
          <p className="mt-1.5 text-[15px] text-green-100 leading-relaxed">
            {t("farmer.dashboard.hero_desc", {}, "Check prices, weather, and estimated profit before planting.")}
          </p>
          <button
            onClick={() => navigate("/farmer/market")}
            className="mt-4 inline-flex items-center gap-2 bg-white text-[var(--hw-green-700)] px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-green-50 transition-colors"
          >
            {t("farmer.dashboard.hero_btn", {}, "Check what to plant")}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── 3. Estimated Profit ── */}
        <ProfitCard cropPlans={cropPlans} loading={isLoading} />

        {/* ── 4 + 5: Two-column on desktop — prices + good crops ── */}
        <div className="md:grid md:grid-cols-2 md:gap-5 space-y-5 md:space-y-0">

          {/* ── 4. Today's prices ── */}
          <section className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">{t("farmer.dashboard.todays_prices", {}, "Today's prices")}</h2>
              <button
                onClick={() => navigate("/farmer/prices")}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
              >
                {t("common.view_all", {}, "See all")}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] flex-1 flex flex-col min-h-0 overflow-hidden">
              {isLoading ? (
                <div className="divide-y divide-[var(--hw-neutral-100)]">
                  <SkeletonListRow />
                  <SkeletonListRow />
                  <SkeletonListRow />
                </div>
              ) : prices.length === 0 ? (
                <div className="p-4 text-center text-[13px] text-[var(--hw-neutral-700)]">
                  {t("farmer.emptyStates.no_prices", {}, "No price data available")}
                </div>
              ) : (
                <>
                  <div className="relative flex-1 flex flex-col min-h-0">
                    <div
                      ref={pricesListRef}
                      className="divide-y divide-[var(--hw-neutral-100)] flex-1 min-h-0 h-[240px] max-h-[240px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {prices.map((item, index) => {
                        const trendQuery = priceTrendQueries[index];
                        const trendDetail = trendQuery?.data || (item.forecast ? { forecast: item.forecast, recent_records: item.recent_records || [] } : null);
                        const forecast = trendDetail?.forecast || item.forecast;
                        const direction = forecast?.trend || item.direction;
                        const forecastPeriod = formatForecastPeriod(forecast);
                        const hasForecast = Boolean(forecast?.forecast_midpoint != null && direction != null);
                        const cfg = hasForecast ? (DIR_CFG[direction] || DIR_CFG.default) : DIR_CFG.default;
                        const DirIcon = cfg.Icon;
                        const count = getVariants(item.name).length;
                        const formattedPrice = item.price != null && item.price !== '' ? `₱${item.price}/${item.uom || 'kg'}` : `-/${item.uom || 'kg'}`;
                        const currentPrice = item.price != null
                          ? Number(item.price)
                          : (trendDetail?.recent_records?.[0]?.prevail_price != null
                            ? Number(trendDetail.recent_records[0].prevail_price)
                            : null);
                        const priceChange = hasForecast ? formatPriceChange(forecast, currentPrice) : null;
                        const isQueryLoading = !item.forecast && item.id && (trendQuery?.isPending || trendQuery?.isFetching);

                        return (
                          <button
                            key={item.id}
                            onClick={() => navigate(`/farmer/prices/${item.id}`)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 h-[80px] hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
                          >
                            <CommodityIllustration 
                              commodityId={item.id} 
                              baseName={item.baseName}
                              commodityName={item.name}
                              className="w-9 h-9 flex-shrink-0" 
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)] leading-tight truncate">{item.name || '–'}</p>
                              <p className="text-[12px] font-semibold text-[var(--hw-green-700)] leading-tight mt-0.5 truncate">
                                {count === 1 ? t("common.variety_one", {}, "1 variety") : t("common.varieties_count", { count }, `${count} varieties`)}
                              </p>
                              <p className="text-[12px] text-[var(--hw-neutral-900)] leading-tight mt-0.5">{formattedPrice}</p>
                            </div>
                            <div className={`flex items-center gap-1.5 flex-shrink-0 ${hasForecast ? cfg.color : 'text-[var(--hw-neutral-500)]'}`}>
                              {hasForecast && <DirIcon className="w-3.5 h-3.5" />}
                              <span className="flex flex-col items-end text-[13px] font-medium leading-tight">
                                <span className={hasForecast && priceChange ? "font-bold text-[14px]" : ""}>
                                  {isQueryLoading
                                  ? t("farmer.prices.trend_loading", {}, "Loading trend")
                                  : hasForecast
                                    ? (priceChange || t(cfg.key, {}, cfg.label))
                                    : trendQuery?.isError
                                      ? t("farmer.prices.trend_unavailable", {}, "Price trend unavailable")
                                      : t("farmer.prices.trend_no_data", {}, "No trend data")}
                                </span>
                                {hasForecast && priceChange && (
                                  <span className="text-[11px] font-normal opacity-85 mt-0.5">
                                    {t(cfg.key, {}, cfg.label)}
                                  </span>
                                )}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {pricesScrollable && (
                    <div className="flex-shrink-0 flex items-center justify-center border-t border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)] px-4 py-2 text-[12px] font-medium text-[var(--hw-neutral-700)]">
                      {t("farmer.dashboard.scroll_more_prices", {}, "Scroll to see more prices")}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* ── 5. Good crops to plant ── */}
          <section className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">
                {t("farmer.dashboard.good_crops_title", { month: localizedMonth }, `Maayong gulay nga itanom karong ${localizedMonth}`)}
              </h2>
              <button
                onClick={() => navigate("/farmer/market")}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
              >
                {t("farmer.plantingGuide.page_title", {}, "Planting Guide")}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <PlantingSuitabilityCard preferredCropIds={[...preferredCropIds]} />
            </div>
          </section>
        </div>

        {/* ── 6. My crop reminders ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">{t("farmer.dashboard.reminders_title", {}, "My crop reminders")}</h2>
            <button
              onClick={() => navigate("/farmer/crops")}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
            >
              {t("nav.my_crops", {}, "View My Crops")}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)]">
            {isLoading ? (
              <div className="divide-y divide-[var(--hw-neutral-100)]">
                <SkeletonListRow />
                <SkeletonListRow />
              </div>
            ) : cropPlans.length === 0 ? (
              <div className="p-4 text-center text-[13px] text-[var(--hw-neutral-700)]">
                {t("farmer.dashboard.no_reminders", {}, "No crop reminders yet.")}
              </div>
            ) : (
              <div className="divide-y divide-[var(--hw-neutral-100)]">
                {cropPlans.map((item) => {
                  // The API stores the status as an English string
                  // ("Pre-Harvest", "On Hold", …). Resolve it through the same
                  // phase codes the crop cards use so it renders localized.
                  const phase = getPhaseConfig(item.status);
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate("/farmer/crops")}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
                    >
                      <CommodityIllustration commodityId={item.commodityId} commodityName={item.commodityName} baseName={item.commodityName} className="w-9 h-9 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
                          {item.variety ? `${item.commodityName || '–'} (${item.variety})` : (item.commodityName || '–')}
                        </p>
                        <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">
                          {t("common.status", {}, "Status")}: {t(phase.labelKey, {}, phase.label)}
                        </p>
                        {item.notes && <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug mt-0.5">{item.notes}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

    </div>
  );
}

export {
  DashboardPage as default
};
