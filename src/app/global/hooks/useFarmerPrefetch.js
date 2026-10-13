import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiGet, parseResponse } from "../api";
import { toCamelCase } from "../utils/apiTransforms";
import { normalizeCropPlan } from "../../farmer/components/crops/CropsContext";
import { DAVAO_CITY_FALLBACK_COORDINATES } from "../constants/location";

export const FARMER_PROFILE_KEY = ["farmer", "profile"];
// Must stay identical to DAVAO_CITY_FALLBACK_COORDINATES: the weather pages key
// their advisory query off that constant, so a farmer with no farm location
// would otherwise miss the seeded entry and refetch. Kept as aliases because
// the fallback coordinates live in one canonical place.
export const DEFAULT_WEATHER_LAT = DAVAO_CITY_FALLBACK_COORDINATES.latitude;
export const DEFAULT_WEATHER_LON = DAVAO_CITY_FALLBACK_COORDINATES.longitude;

// Shared with PriceDetailView so the trend page's freshness matches what the
// bundle seeds. Mirrors queryClient.js's 30-min default.
export const STALE_TIME = 1000 * 60 * 30; // 30 mins

// The horizon the server bundles price detail for. Must match the server's
// BUNDLE_DETAIL_HORIZON and the page's default period chip.
export const BUNDLE_DETAIL_PERIOD = 7;

// Chart-grade detail for the Price Trend Details page. These must match the
// server's BUNDLE_TREND_* constants — they are what the page requests and what
// the bundle seeds, so drift here means a silent cache miss on every open.
export const BUNDLE_TREND_RECORDS_LIMIT = 40;
export const BUNDLE_TREND_PERIOD = 7;
export const BUNDLE_TREND_PRICE_TYPE = "bangkerohan_retail";

export function weatherAdvisoryKey(lat, lon) {
  return ["weather", "advisory", lat, lon];
}

// Raw canonical transformation for the Dashboard summary prices. Shared by the
// Dashboard page query and offline bundle seeding so both write the same shape.
export function transformDashboardPrices(pricesData) {
  const baseMap = new Map();
  (pricesData?.items || []).forEach((item) => {
    const camelItem = toCamelCase(item);
    const isTop = camelItem.isTop10 === true || item.is_top10 === true;
    if (!isTop) return;
    const name = camelItem.name || "\u2013";
    const retailPrice =
      camelItem.prices?.bangkerohanRetail ?? camelItem.prices?.dftcRetail ?? null;
    if (!baseMap.has(name)) {
      baseMap.set(name, {
        id: camelItem.commodityId,
        name,
        baseName: camelItem.baseName,
        price: retailPrice,
        uom: camelItem.unitOfMeasure || "kg",
        direction: camelItem.forecast?.trend || null,
      });
    } else if (retailPrice !== null && baseMap.get(name).price === null) {
      const existing = baseMap.get(name);
      existing.price = retailPrice;
      existing.direction = camelItem.forecast?.trend || existing.direction;
      existing.id = camelItem.commodityId;
    }
  });
  return Array.from(baseMap.values());
}

// Canonical transformation for the Dashboard recommendation card.
// Preserves advisoryCategory so the Dashboard can cross-reference preferred crops.
export function transformDashboardRecommendations(rawItems) {
  return rawItems.map((rec) => {
    const camelRec = toCamelCase(rec);
    return {
      id: camelRec.commodityId,
      name: camelRec.commodityName || "\u2013",
      reason: camelRec.explanation || "\u2013",
      bestVariety: camelRec.bestVarietyName || camelRec.bestVariety || null,
      advisoryCategory: camelRec.advisoryCategory || null,
    };
  });
}

// Raw price list shared by Prices, Assess, CommodityDetail, Dashboard.
export function fetchPricesList() {
  return apiGet("/prices?is_top10=true&page_size=50").then(parseResponse);
}

// Raw farmer profile shared by Dashboard and every farmer page.
export function fetchFarmerProfile() {
  return apiGet("/farmer/profile").then(parseResponse);
}

export function fetchCropPlans() {
  return apiGet("/crop-plans").then(async (res) => {
    if (!res.ok) return [];
    const data = await parseResponse(res);
    const rawItems = data?.crop_plans || data?.items || (Array.isArray(data) ? data : []);
    return rawItems.map(normalizeCropPlan).filter(Boolean);
  });
}

export function fetchMarketCalendar() {
  return apiGet("/market/calendar").then(async (res) => {
    if (!res.ok) return [];
    const data = await parseResponse(res);
    return data.items || [];
  });
}

export function fetchWeatherAdvisory(lat, lon) {
  return apiGet(`/weather/advisory?latitude=${lat}&longitude=${lon}`).then(parseResponse);
}

// Monthly recommendations transformed for the Dashboard card.
export async function fetchDashboardRecommendations() {
  const res = await apiGet("/market/monthly-recommendations");
  if (!res.ok) return [];
  const recsData = await parseResponse(res);
  const rawItems =
    recsData?.items || recsData?.recommendations || (Array.isArray(recsData) ? recsData : []);
  return transformDashboardRecommendations(rawItems);
}

// Dashboard summary prices derived from the shared raw price list.
export async function fetchDashboardPrices() {
  const pricesData = await fetchPricesList();
  return transformDashboardPrices(pricesData);
}

// Key shape CommodityDetail.jsx reads:
//   ["prices", "detail", commodityId, priceTypeKey, period]
// The server bundles the default period (7) for the top commodities only, so a
// 14/21/28 chip still misses and fetches on demand — which is exactly what we want.
export function priceDetailKey(commodityId, priceTypeKey, period = 7) {
  return ["prices", "detail", commodityId, priceTypeKey, period];
}

// Key shape PriceDetailView.jsx reads:
//   ["prices", "trend", commodityId, priceTypeKey, period, recordsLimit]
// records_limit is part of the key on purpose. Without it a 40-record bundle entry
// satisfies a page asking for 100 and the chart silently renders a truncated
// history as if it were complete — the worst failure mode here, because nothing
// errors. The server's own cache key (prices_detail_key) includes it too.
export function priceTrendKey(
  commodityId,
  priceTypeKey,
  period = BUNDLE_TREND_PERIOD,
  recordsLimit = BUNDLE_TREND_RECORDS_LIMIT
) {
  return ["prices", "trend", commodityId, priceTypeKey, period, recordsLimit];
}

// Single round-trip: the /farmer/daily-snapshot bundle covers every top-level
// dataset used by the farmer workspace. Write each section into its matching
// cache key so the persister pushes it to IndexedDB on login and sync.
//
// Every section here is defensive: a missing or malformed section is skipped, so a
// degraded server response (a budget-exhausted section arrives as null) still
// seeds everything else rather than throwing away the whole bundle.
export async function seedFarmerOfflineBundle(queryClient) {
  const res = await apiGet("/farmer/daily-snapshot");
  if (!res.ok) throw new Error(`snapshot failed: ${res.status}`);
  const bundle = await parseResponse(res);

  const profile = bundle.profile || null;
  if (profile) queryClient.setQueryData(FARMER_PROFILE_KEY, profile);

  if (Array.isArray(bundle.crop_plans)) {
    queryClient.setQueryData(
      ["farmer", "crops"],
      bundle.crop_plans.map(normalizeCropPlan).filter(Boolean)
    );
  }

  if (Array.isArray(bundle.price_trends)) {
    queryClient.setQueryData(
      ["prices", "list"],
      { items: bundle.price_trends }
    );
    queryClient.setQueryData(
      ["dashboard", "prices"],
      transformDashboardPrices({ items: bundle.price_trends })
    );
  }

  if (Array.isArray(bundle.price_detail)) {
    bundle.price_detail.forEach((entry) => {
      const camel = toCamelCase(entry);
      if (!camel.commodityId || !camel.selectedPriceType) return;
      // Same transformation the page's queryFn applies, so a bundle hit and a
      // network hit are byte-identical in the cache.
      queryClient.setQueryData(
        priceDetailKey(camel.commodityId, camel.selectedPriceType, BUNDLE_DETAIL_PERIOD),
        camel
      );
    });
  }

  if (Array.isArray(bundle.price_trend)) {
    bundle.price_trend.forEach((entry) => {
      // Raw, NOT toCamelCase: PriceDetailView reads recent_records and
      // forecast.forecast_midpoint, because pricesApi.getPriceDetail returns the
      // untransformed response. The price_detail section above camelCases only
      // because CommodityDetail.jsx camelCases inside its own queryFn.
      const commodityId = entry.commodity_id;
      const priceTypeKey = entry.selected_price_type;
      if (!commodityId || !priceTypeKey) return;
      // Selected price type, not BUNDLE_TREND_PRICE_TYPE: the server builds this
      // section from get_price_detail, which echoes back the type it was asked
      // for, and keying off the echo keeps the two sides from drifting.
      queryClient.setQueryData(
        priceTrendKey(commodityId, priceTypeKey, BUNDLE_TREND_PERIOD),
        entry
      );
    });
  }

  if (Array.isArray(bundle.advisory_summary)) {
    queryClient.setQueryData(
      ["dashboard", "recommendations"],
      transformDashboardRecommendations(bundle.advisory_summary)
    );
  }

  if (bundle.weather_forecast) {
    const lat = profile?.latitude ?? DEFAULT_WEATHER_LAT;
    const lon = profile?.longitude ?? DEFAULT_WEATHER_LON;
    queryClient.setQueryData(weatherAdvisoryKey(lat, lon), bundle.weather_forecast);
  }

  // Market calendar is not part of the snapshot bundle; fetch it separately.
  await queryClient.prefetchQuery({
    queryKey: ["marketCalendar"],
    queryFn: fetchMarketCalendar,
    staleTime: STALE_TIME,
  });
}

// Fallback when the bundle endpoint is unavailable (e.g. offline restore that
// still needs warm keys): prefetch each dataset individually.
export async function prefetchFarmerOfflineData(queryClient) {
  const prefetch = (queryKey, queryFn) =>
    queryClient.prefetchQuery({ queryKey, queryFn, staleTime: STALE_TIME });

  await Promise.all([
    prefetch(["prices", "list"], fetchPricesList),
    prefetch(["dashboard", "prices"], fetchDashboardPrices),
    prefetch(["dashboard", "recommendations"], fetchDashboardRecommendations),
    prefetch(FARMER_PROFILE_KEY, fetchFarmerProfile),
    prefetch(["farmer", "crops"], fetchCropPlans),
    prefetch(["marketCalendar"], fetchMarketCalendar),
  ]);

  const profile = queryClient.getQueryData(FARMER_PROFILE_KEY);
  const lat = profile?.latitude ?? DEFAULT_WEATHER_LAT;
  const lon = profile?.longitude ?? DEFAULT_WEATHER_LON;
  await prefetch(weatherAdvisoryKey(lat, lon), () => fetchWeatherAdvisory(lat, lon));
}

/**
 * Load every top-level farmer dataset and write it into the React Query cache
 * so the persister pushes it to IndexedDB. Prefers the single snapshot bundle;
 * falls back to per-endpoint prefetches.
 */
export async function loadFarmerOfflineData(queryClient) {
  try {
    await seedFarmerOfflineBundle(queryClient);
  } catch {
    await prefetchFarmerOfflineData(queryClient);
  }
}

export function useFarmerPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    loadFarmerOfflineData(queryClient);
  }, [queryClient]);
}