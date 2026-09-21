import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiGet, parseResponse } from "../api";
import { toCamelCase } from "../utils/apiTransforms";
import { normalizeCropPlan } from "../../farmer/components/crops/CropsContext";

export const FARMER_PROFILE_KEY = ["farmer", "profile"];
export const DEFAULT_WEATHER_LAT = 7.0722;
export const DEFAULT_WEATHER_LON = 125.6131;

const STALE_TIME = 1000 * 60 * 30; // 30 mins

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
export function transformDashboardRecommendations(rawItems) {
  return rawItems.slice(0, 2).map((rec) => {
    const camelRec = toCamelCase(rec);
    return {
      id: camelRec.commodityId,
      name: camelRec.commodityName || "\u2013",
      reason: camelRec.explanation || "\u2013",
      bestVariety: camelRec.bestVarietyName || camelRec.bestVariety || null,
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

// Single round-trip: the /farmer/daily-snapshot bundle covers every top-level
// dataset used by the farmer workspace. Write each section into its matching
// cache key so the persister pushes it to IndexedDB on login and sync.
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
<<<<<<< HEAD
    const STALE_TIME = 1000 * 60 * 30; // 30 mins

    // 1. All price records (Retail, Wholesale, Landing, Forecasts across all sources)
    queryClient.prefetchQuery({
      queryKey: ["prices", "list"],
      queryFn: async () => {
        const res = await apiGet("/prices?is_top10=true&page_size=50");
        return parseResponse(res);
      },
      staleTime: STALE_TIME,
    });

    // 2. Dashboard summary prices
    queryClient.prefetchQuery({
      queryKey: ["dashboard", "prices"],
      queryFn: async () => {
        const res = await apiGet("/prices?is_top10=true&page_size=50");
        if (!res.ok) return [];
        const pricesData = await parseResponse(res);
        const baseMap = new Map();
        (pricesData?.items || []).forEach((item) => {
          const camelItem = toCamelCase(item);
          const isTop = camelItem.isTop10 === true || item.is_top10 === true;
          if (!isTop) return;
          const name = camelItem.name || "–";
          const retailPrice = camelItem.prices?.bangkerohanRetail ?? camelItem.prices?.dftcRetail ?? null;
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
      },
      staleTime: STALE_TIME,
    });

    // 3. Farmer profile
    queryClient.prefetchQuery({
      queryKey: ["dashboard", "profile"],
      queryFn: async () => {
        const res = await apiGet("/farmer/profile");
        if (res.ok) return parseResponse(res);
        return null;
      },
      staleTime: STALE_TIME,
    });

    // 4. Crop plans (used by Dashboard, CropsContext, MarketCalendar, Recommendation)
    queryClient.prefetchQuery({
      queryKey: ["farmer", "crops"],
      queryFn: async () => {
        const res = await apiGet("/crop-plans");
        if (!res.ok) return [];
        const data = await parseResponse(res);
        const rawItems = data?.crop_plans || data?.items || (Array.isArray(data) ? data : []);
        return rawItems.map(normalizeCropPlan).filter(Boolean);
      },
      staleTime: STALE_TIME,
    });

    // 5. Backend unified daily snapshot (offline bundle & ETag sync)
    queryClient.prefetchQuery({
      queryKey: ["farmer", "dailySnapshot"],
      queryFn: async () => {
        const res = await apiGet("/farmer/daily-snapshot");
        if (res.ok) return parseResponse(res);
        return null;
      },
      staleTime: STALE_TIME,
    });

    // 6. Market calendar events
    queryClient.prefetchQuery({
      queryKey: ["marketCalendar"],
      queryFn: async () => {
        const marketRes = await apiGet("/market/calendar");
        if (!marketRes.ok) return [];
        const data = await parseResponse(marketRes);
        return data.items || [];
      },
      staleTime: STALE_TIME,
    });

    // 7. Weather advisory for Market Weather page.
    // Only prefetches if farmer profile has coordinates saved.
    const profile = queryClient.getQueryData(["dashboard", "profile"]);
    if (profile?.latitude != null && profile?.longitude != null) {
      const lat = profile.latitude;
      const lon = profile.longitude;
      queryClient.prefetchQuery({
        queryKey: ["weather", "advisory", lat, lon],
        queryFn: async () => {
          const res = await apiGet(`/weather/advisory?latitude=${lat}&longitude=${lon}`);
          if (!res.ok) return null;
          return parseResponse(res);
        },
        staleTime: STALE_TIME,
      });
    }
=======
    loadFarmerOfflineData(queryClient);
>>>>>>> ae9d4a264b1c6ef655a7e8b28207bf0a7e2b198b
  }, [queryClient]);
}