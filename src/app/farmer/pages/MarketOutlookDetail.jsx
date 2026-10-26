import { useParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Package,
  CloudRain,
  CalendarDays,
  Leaf,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { apiGet, parseResponse } from "../../global/api";
import { CommodityIllustration, COMMODITY_REGISTRY } from "../../global/components/shared/CommodityIllustrations";
import { STATUS_CONFIG, advisoryToStatus } from "./MarketPage";
import {
  LEVEL_CODES,
  MARKET_STATUS_CODES,
  PRICE_TREND_CODES,
  normalizeLevelCode,
  normalizeMarketStatusCode,
  normalizePriceTrendCode,
} from "../utils/farmerCodes";
import { useLanguage } from "../../global/contexts/LanguageContext";
import {
  fetchFarmerProfile,
  fetchMonthlyRecommendations,
  monthlyRecommendationsKey,
} from "../../global/hooks/useFarmerPrefetch";
import { sortWithPreferredFirst, isPreferredCrop } from "../utils/cropPreferences";
import { PreferredStar } from "../components/shared/PreferredStar";
import { Skeleton } from "../components/shared/FarmerSkeletons";

// ── status style helpers ─────────────────────────────────────────────────
const STATUS_CLS = {
  [MARKET_STATUS_CODES.FAVORABLE]: { color: "text-emerald-700", bg: "bg-emerald-50", borderL: "border-l-emerald-500", label: "Favorable"    },
  [MARKET_STATUS_CODES.BALANCED]:  { color: "text-blue-600",    bg: "bg-blue-50",    borderL: "border-l-blue-500",    label: "Balanced"     },
  [MARKET_STATUS_CODES.MONITOR]:   { color: "text-amber-700",   bg: "bg-amber-50",   borderL: "border-l-amber-500",   label: "Watch closely"},
  [MARKET_STATUS_CODES.HIGH_RISK]: { color: "text-red-700",     bg: "bg-red-50",     borderL: "border-l-red-500",     label: "Cautious"     },
};

const VARIANT_CLS = {
  favorable:   { color: "text-emerald-700", badge: "text-emerald-700" },
  neutral:     { color: "text-blue-600",    badge: "text-blue-600"    },
  caution:     { color: "text-amber-700",   badge: "text-amber-700"   },
  unfavorable: { color: "text-red-700",     badge: "text-red-700"     },
  flag:        { color: "text-blue-600",    badge: "text-blue-600"    },
};

// ── derive glance factors from real API fields ───────────────────────────
function getGlanceFactors(rec, priceCard, commodityId) {
  const name = rec.commodity_name || commodityId;

  // 1. Price Outlook
  const priceTrend = normalizePriceTrendCode(rec.price_outlook || priceCard?.forecast?.trend);
  const priceVariant =
    priceTrend === PRICE_TREND_CODES.RISING   ? "neutral" :
    priceTrend === PRICE_TREND_CODES.FALLING  ? "unfavorable" : "neutral";
  const priceClassLabel =
    priceTrend === PRICE_TREND_CODES.RISING  ? "Neutral (Rising)" :
    priceTrend === PRICE_TREND_CODES.FALLING ? "Unfavorable (Falling)" : "Neutral (Stable)";
  const priceDetail =
    priceTrend === PRICE_TREND_CODES.RISING
      ? `${name} prices may stay near or above recent levels.`
      : priceTrend === PRICE_TREND_CODES.FALLING
      ? `${name} prices may continue to fall.`
      : `${name} prices are expected to remain near recent levels.`;

  // 2. DFTC Arrival Pressure
  const arrivalRaw  = rec.arrival_pressure || "";
  const arrivalLevel = normalizeLevelCode(arrivalRaw);
  const arrivalHigh =
    arrivalLevel === LEVEL_CODES.HIGH ||
    arrivalRaw.toLowerCase().includes("upper") ||
    arrivalRaw.toLowerCase().includes("high");
  const arrivalLow =
    arrivalLevel === LEVEL_CODES.LOW ||
    arrivalRaw.toLowerCase().includes("low");
  const arrivalVariant = arrivalHigh ? "caution" : arrivalLow ? "favorable" : "neutral";
  const arrivalClass   = arrivalHigh ? "Upper Middle" : arrivalLow ? "Low" : "Lower Middle";
  const arrivalDetail  = arrivalRaw
    ? `${name} arrival pressure: ${arrivalRaw}.`
    : `${name} arrivals are within the ${arrivalClass} range of recent history.`;

  // 3. Historical Seasonal Production
  const seasonRaw   = rec.historical_seasonal_production_level || "";
  const seasonLevel = normalizeLevelCode(seasonRaw);
  const seasonHigh  =
    seasonLevel === LEVEL_CODES.HIGH ||
    seasonRaw.toLowerCase().includes("upper") ||
    seasonRaw.toLowerCase().includes("high");
  const seasonLow   =
    seasonLevel === LEVEL_CODES.LOW ||
    seasonRaw.toLowerCase().includes("low");
  const seasonVariant = seasonHigh ? "caution" : seasonLow ? "favorable" : "neutral";
  const seasonClass   = seasonHigh ? "Above Average" : seasonLow ? "Below Average" : "Near Average";
  const seasonDetail  = seasonRaw
    ? `Historical ${name} production is currently ${seasonRaw}.`
    : `Historical ${name} production is ${seasonClass} for this period.`;

  // 4. Weather Risk
  const weatherRaw     = rec.weather_risk_level || "";
  const weatherCaution =
    weatherRaw.toLowerCase().includes("caution") ||
    weatherRaw.toLowerCase().includes("severe") ||
    weatherRaw.toLowerCase().includes("high");
  const weatherVariant = weatherCaution ? "caution" : "favorable";
  const weatherClass   = weatherCaution ? "Caution" : "Suitable";
  const weatherDetail  = weatherRaw
    ? `Weather risk for ${name}: ${weatherRaw}.`
    : weatherCaution
    ? "Weather risk may affect field conditions near harvest."
    : "No significant weather risk expected near harvest.";

  return [
    {
      name: "Price Outlook",
      classification: priceClassLabel,
      detail: priceDetail,
      action: "View prices",
      path: `/prices/${commodityId}`,
      variant: priceVariant,
    },
    {
      name: "DFTC Arrival Pressure",
      classification: arrivalClass,
      detail: arrivalDetail,
      action: "View arrivals",
      path: `/market/dftc-arrivals?commodity=${commodityId}`,
      variant: arrivalVariant,
    },
    {
      name: "Historical Seasonal Production",
      classification: seasonClass,
      detail: seasonDetail,
      action: "View production",
      path: `/market/seasonal-production?commodity=${commodityId}`,
      variant: seasonVariant,
    },
    {
      name: "Weather Risk",
      classification: weatherClass,
      detail: weatherDetail,
      action: "View weather",
      path: "/market/weather",
      variant: weatherVariant,
    },
    {
      name: "Calendar Context",
      classification: "See calendar",
      detail: "Check upcoming payday periods and holidays that may affect market demand near your harvest.",
      action: "View calendar",
      path: "/market/calendar",
      variant: "flag",
    },
  ];
}

// ── page ─────────────────────────────────────────────────────────────────
function MarketOutlookDetailPage() {
  const { commodityId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: profile } = useQuery({
    queryKey: ["farmer", "profile"],
    queryFn: fetchFarmerProfile,
    staleTime: 5 * 60 * 1000,
  });
  const preferredCrops = profile?.preferredCrops || profile?.preferred_crops;

  // Fetch all recommendations — we pick the row matching commodityId
  const { data: recsData, isLoading: recsLoading } = useQuery({
    queryKey: monthlyRecommendationsKey(),
    queryFn: () => fetchMonthlyRecommendations(),
    staleTime: 1000 * 60 * 30,
  });

  // Fetch price card for this commodity
  const { data: pricesData } = useQuery({
    queryKey: ["prices", "list"],
    queryFn: async () => {
      const res = await apiGet("/prices?is_top10=true&page_size=50");
      if (!res.ok) return { items: [] };
      return parseResponse(res);
    },
    staleTime: 1000 * 60 * 30,
  });

  const rec = (recsData?.items || []).find((r) => r.commodity_id === commodityId);
  const priceCard = (pricesData?.items || []).find((p) => p.commodity_id === commodityId) || null;

  // Commodity switcher: use registry + all rec commodity_ids
  const registryList = Object.entries(COMMODITY_REGISTRY).map(([id, val]) => ({ id, ...val }));
  const sortedRegistryList = sortWithPreferredFirst(registryList, preferredCrops);

  // All commodity IDs from recs (in case some aren't in registry)
  const recIds = (recsData?.items || []).map((r) => r.commodity_id);

  if (recsLoading) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-4 animate-pulse">
        <Skeleton className="h-5 w-40 rounded" />
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] p-4 flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-2xl flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] p-4 space-y-2">
          <Skeleton className="h-3 w-48 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
        </div>
      </div>
    );
  }

  if (!rec) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[var(--hw-neutral-900)]">
          {t ? t("farmer.empty.commodity_not_found") : "No recommendation found for this commodity."}
        </p>
        <button onClick={() => navigate("/farmer/market")} className="mt-3 text-sm font-medium text-[var(--hw-green-700)]">
          Back to Market Outlook
        </button>
      </div>
    );
  }

  const statusCode = advisoryToStatus(rec.advisory_category);
  const statusCls  = STATUS_CLS[statusCode] || STATUS_CLS[MARKET_STATUS_CODES.BALANCED];
  const glance     = getGlanceFactors(rec, priceCard, commodityId);
  const displayName = rec.commodity_name || commodityId;

  // Farmer insight: use explanation from API, fall back to a sensible default
  const insightLine1 = rec.explanation || `Market conditions have been assessed for ${displayName}.`;
  const insightLine2 =
    statusCode === MARKET_STATUS_CODES.FAVORABLE
      ? `Current conditions are favorable for ${displayName}. Confirm profitability before expanding area.`
      : statusCode === MARKET_STATUS_CODES.MONITOR
      ? `Exercise caution with ${displayName}. Monitor prices and supply before committing to planting.`
      : statusCode === MARKET_STATUS_CODES.HIGH_RISK
      ? `Conditions are not favorable for ${displayName}. Consider waiting for improvement.`
      : `Conditions are balanced for ${displayName}. Monitor before major planting decisions.`;

  const watchText =
    statusCode === MARKET_STATUS_CODES.FAVORABLE
      ? `Good conditions for ${displayName} — confirm costs and profitability before planting.`
      : statusCode === MARKET_STATUS_CODES.MONITOR
      ? `Monitor ${displayName} prices and supply carefully before committing to additional area.`
      : statusCode === MARKET_STATUS_CODES.HIGH_RISK
      ? `Consider waiting before planting ${displayName} until market conditions improve.`
      : `Review current prices and supply conditions before finalizing your ${displayName} planting plan.`;

  const relatedModules = [
    { label: "Price history",       path: `/prices/${commodityId}`,                          icon: <BarChart3 className="w-4 h-4" /> },
    { label: "Price forecast",      path: `/forecast/${commodityId}`,                         icon: <TrendingUp className="w-4 h-4" /> },
    { label: "DFTC arrivals",       path: `/market/dftc-arrivals?commodity=${commodityId}`,   icon: <Package className="w-4 h-4" /> },
    { label: "Seasonal production", path: `/market/seasonal-production?commodity=${commodityId}`, icon: <Leaf className="w-4 h-4" /> },
    { label: "Weather",             path: "/market/weather",                                  icon: <CloudRain className="w-4 h-4" /> },
    { label: "Market calendar",     path: "/market/calendar",                                 icon: <CalendarDays className="w-4 h-4" /> },
  ];

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-4">
      {/* Back + commodity switcher */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate("/farmer/market")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-900)] transition-colors"
        >
          ← Market Overview
        </button>
        <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {sortedRegistryList
            .filter(({ id }) => recIds.includes(id))
            .map(({ id, name }) => {
              const isPref = isPreferredCrop({ id, name }, preferredCrops);
              return (
                <button
                  key={id}
                  onClick={() => navigate(`/farmer/market/detail/${id}`)}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    id === commodityId
                      ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white"
                      : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"
                  }`}
                >
                  {name}
                  {isPref && (
                    <span className={`inline-flex items-center px-1 rounded text-[9px] font-semibold ${
                      id === commodityId
                        ? "bg-white/20 text-white"
                        : "bg-[var(--hw-green-50)] text-[var(--hw-green-700)] border border-[var(--hw-green-200)]"
                    }`}>★</span>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* A. Commodity header */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
        <div className="flex items-center gap-4">
          <CommodityIllustration commodityId={commodityId} commodityName={displayName} className="w-16 h-16 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">{displayName}</h1>
              {rec.commodity_variety && (
                <span className="text-sm text-[var(--hw-neutral-500)]">{rec.commodity_variety}</span>
              )}
              {isPreferredCrop({ id: commodityId, name: displayName }, preferredCrops) && (
                <PreferredStar className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <span className={`inline-block text-sm font-semibold mt-1 ${statusCls.color}`}>
              {statusCls.label}
            </span>
          </div>
        </div>
      </div>

      {/* B. Farmer insight */}
      <div className={`bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] border-l-4 ${statusCls.borderL} p-4 space-y-2`}>
        <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
          Farmer insight for {displayName}
        </p>
        <p className="text-[var(--hw-neutral-900)] leading-relaxed">{insightLine1}</p>
        <p className="text-[13px] font-medium text-[var(--hw-neutral-900)]">{insightLine2}</p>
      </div>

      {/* C. At a glance */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">At a glance</p>
        <div className="grid grid-cols-2 gap-2">
          {glance.map((f, i) => {
            const cls = VARIANT_CLS[f.variant] || VARIANT_CLS.neutral;
            return (
              <div
                key={f.name}
                className={`bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3 space-y-1.5 ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}
              >
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--hw-neutral-700)]">{f.name}</p>
                <p className={`text-sm font-semibold ${cls.badge}`}>{f.classification}</p>
                <p className="text-[12px] text-[var(--hw-neutral-900)] leading-snug">{f.detail}</p>
                <button
                  onClick={() => navigate(f.path)}
                  className={`inline-flex items-center gap-0.5 text-[12px] font-medium ${cls.color} hover:opacity-70 transition-opacity`}
                >
                  {f.action} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* D. What to watch before planting */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
        <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">What to watch before planting</p>
        <p className="text-[var(--hw-neutral-700)] leading-relaxed">{watchText}</p>
        <button
          onClick={() => navigate(`/farmer/assess?commodity=${commodityId}`)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
        >
          Check planting assessment <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* E. Related modules */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Related modules</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {relatedModules.map((m) => (
            <button
              key={m.label}
              onClick={() => navigate(m.path)}
              className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white border border-[var(--hw-neutral-200)] rounded-2xl text-[13px] font-medium text-[var(--hw-green-700)] hover:bg-[var(--hw-green-50)] transition-colors shadow-[var(--shadow-xs)] text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-[var(--hw-neutral-400)]">{m.icon}</span>
                {m.label}
              </div>
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { MarketOutlookDetailPage as default };
