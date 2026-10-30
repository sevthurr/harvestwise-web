import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, parseResponse } from "../api";
import { normalizeCropPlan, buildPricesMap } from "../../farmer/components/crops/CropsContext";
import { DAVAO_CITY_FALLBACK_COORDINATES } from "../constants/location";
import { toCamelCase, manilaTodayParts } from "../utils/apiTransforms";
import { getPreferredCropMatcher } from "../../farmer/utils/cropPreferences";

export const FARMER_PROFILE_KEY = ["farmer", "profile"];
export const FARMER_COMMODITIES_KEY = ["farmer", "commodities"];
export const SUPPORTED_PRICES_KEY = ["prices", "supported-list"];
// Must stay identical to DAVAO_CITY_FALLBACK_COORDINATES: the weather pages key
// their advisory query off that constant, so a farmer with no farm location
// would otherwise miss the seeded entry and refetch. Kept as aliases because
// the fallback coordinates live in one canonical place.
export const DEFAULT_WEATHER_LAT = DAVAO_CITY_FALLBACK_COORDINATES.latitude;
export const DEFAULT_WEATHER_LON = DAVAO_CITY_FALLBACK_COORDINATES.longitude;

// Shared with PriceDetailView so the trend page's freshness matches what the
// bundle seeds. Mirrors queryClient.js's 30-min default.
export const STALE_TIME = 1000 * 60 * 30; // 30 mins

export function currentReferenceMonth(date = new Date()) {
  const parts = manilaTodayParts(date);
  return `${parts.year}-${parts.month}-01`;
}

export function monthlyRecommendationsKey(referenceMonth = currentReferenceMonth()) {
  return ["market", "monthly-recommendations", referenceMonth];
}

export async function fetchMonthlyRecommendations(referenceMonth = currentReferenceMonth()) {
  const suffix = referenceMonth ? `?reference_month=${referenceMonth}` : "";
  const response = await apiGet(`/market/monthly-recommendations${suffix}`);
  if (!response.ok) {
    const error = new Error("Failed to load monthly recommendations");
    error.status = response.status;
    throw error;
  }
  return parseResponse(response);
}

// The horizon the server bundles price detail for. Must match the server's
// BUNDLE_DETAIL_HORIZON and the page's default period chip.
export const BUNDLE_DETAIL_PERIOD = 7;

// Chart-grade detail for the Price Trend Details page. These must match the
// server's BUNDLE_TREND_* constants — they are what the page requests and what
// the bundle seeds, so drift here means a silent cache miss on every open.
export const BUNDLE_TREND_RECORDS_LIMIT = 40;
export const BUNDLE_TREND_PERIOD = 7;
export const BUNDLE_TREND_PRICE_TYPE = "bangkerohan_retail";

// These are the selectors exposed by the farmer price pages. Keep the offline
// warm-up aligned with the UI so changing a market or forecast horizon does
// not immediately fall through to the network.
export const FARMER_PRICE_TYPES = [
  "bangkerohan_retail",
  "bangkerohan_wholesale",
  "dftc_retail",
  "dftc_wholesale",
];
export const FARMER_PRICE_HORIZONS = [7, 14, 21, 28];

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

// The normal Prices list intentionally contains only top-10 rows. Detail and
// trend pages also need the non-top-10 variety rows belonging to those crops.
export async function fetchSupportedPricesList() {
  const items = [];
  let page = 1;
  let total = Infinity;
  while (items.length < total) {
    const data = await parseResponse(await apiGet(
      `/prices?include_supported_varieties=true&page=${page}&page_size=100`
    ));
    const pageItems = data?.items || [];
    items.push(...pageItems);
    total = Number(data?.total ?? items.length);
    if (pageItems.length === 0) break;
    page += 1;
  }
  return { items, total: items.length, page: 1, page_size: items.length };
}

// Raw farmer profile shared by Dashboard and every farmer page.
export function fetchFarmerProfile() {
  return apiGet("/farmer/profile").then(parseResponse);
}

export function fetchFarmerCommodities() {
  return apiGet("/farmer/commodities").then(parseResponse);
}

export function fetchCropPlans(pricesMap) {
  return apiGet("/crop-plans").then(async (res) => {
    if (!res.ok) return [];
    const data = await parseResponse(res);
    const rawItems = data?.crop_plans || data?.items || (Array.isArray(data) ? data : []);
    return rawItems.map((p) => normalizeCropPlan(p, pricesMap)).filter(Boolean);
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
  const recsData = await fetchMonthlyRecommendations();
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
  // The login path only needs the summary bundle. Detail pages are warmed in
  // the background after the farmer can use the app.
  const res = await apiGet("/farmer/daily-snapshot?detail=0");
  if (!res.ok) throw new Error(`snapshot failed: ${res.status}`);
  const bundle = await parseResponse(res);

  const profile = bundle.profile || null;
  const preferredMatcher = getPreferredCropMatcher(
    profile?.preferred_crops || profile?.preferredCrops || []
  );
  if (profile) {
    queryClient.setQueryData(FARMER_PROFILE_KEY, profile);
    // Several legacy farmer pages still use this key. Keep it backed by the
    // same canonical profile so offline navigation does not refetch it.
    queryClient.setQueryData(["farmerProfile"], profile);
    queryClient.setQueryData(["dashboard", "profile"], profile);
  }

  if (Array.isArray(bundle.crop_plans)) {
    const pricesMap = Array.isArray(bundle.price_trends) ? buildPricesMap(bundle.price_trends) : new Map();
    queryClient.setQueryData(
      ["farmer", "crops"],
      bundle.crop_plans.map((p) => normalizeCropPlan(p, pricesMap)).filter(Boolean)
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
      if (!camel.commodityId || !camel.selectedPriceType || !preferredMatcher.isPreferred(camel)) return;
      // Same transformation the page's queryFn applies, so a bundle hit and a
      // network hit are byte-identical in the cache.
      queryClient.setQueryData(
        priceDetailKey(camel.commodityId, camel.selectedPriceType, BUNDLE_DETAIL_PERIOD),
        camel
      );
      if (camel.selectedPriceType === "bangkerohan_retail") {
        queryClient.setQueryData(["price-detail", camel.commodityId], entry);
      }
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
      if (!commodityId || !priceTypeKey || !preferredMatcher.isPreferred(entry)) return;
      // Selected price type, not BUNDLE_TREND_PRICE_TYPE: the server builds this
      // section from get_price_detail, which echoes back the type it was asked
      // for, and keying off the echo keeps the two sides from drifting.
      queryClient.setQueryData(
        priceTrendKey(commodityId, priceTypeKey, BUNDLE_TREND_PERIOD),
        entry
      );
      // Dashboard and the Prices cards use their own historical query key.
      // Point it at the same raw API-shaped entry so those pages also render
      // immediately from the login snapshot while offline.
      queryClient.setQueryData(
        ["farmer-price-card-trend", commodityId, priceTypeKey, BUNDLE_TREND_PERIOD],
        entry
      );
    });
  }

  if (Array.isArray(bundle.advisory_summary)) {
    const recommendations = { items: bundle.advisory_summary };
    queryClient.setQueryData(
      ["dashboard", "recommendations"],
      transformDashboardRecommendations(bundle.advisory_summary)
    );
    // Seed the raw recommendation keys used by the farmer pages. Without
    // these aliases, offline pages see an empty query and render presentation
    // defaults instead of the snapshot's persisted recommendations.
    queryClient.setQueryData(monthlyRecommendationsKey(), recommendations);
    // Keep the legacy aliases for persisted snapshots created by older clients.
    queryClient.setQueryData(["market", "monthly-recommendations"], recommendations);
    queryClient.setQueryData(["recommendations", "list"], recommendations);
    const currentMonth = currentReferenceMonth();
    queryClient.setQueryData(["monthly-recommendations", currentMonth], recommendations);
  }

  if (bundle.weather_forecast) {
    const lat = profile?.latitude ?? DEFAULT_WEATHER_LAT;
    const lon = profile?.longitude ?? DEFAULT_WEATHER_LON;
    queryClient.setQueryData(weatherAdvisoryKey(lat, lon), bundle.weather_forecast);
  }

}

async function prefetchFarmerPageData(queryClient, bundle) {
  const safePrefetch = (queryKey, queryFn) =>
    queryClient.prefetchQuery({ queryKey, queryFn, staleTime: STALE_TIME }).catch(() => {});

  const profile = queryClient.getQueryData(FARMER_PROFILE_KEY) || {};
  const preferredCrops = profile.preferred_crops || profile.preferredCrops || [];
  const preferredMatcher = getPreferredCropMatcher(preferredCrops);
  const supportedItems = queryClient.getQueryData(SUPPORTED_PRICES_KEY)?.items || [];
  const priceItems = [...(bundle.price_trends || []), ...supportedItems];
  const preferredPriceIds = [...new Set(priceItems
    .filter((item) => preferredMatcher.isPreferred(item))
    .map((item) => item.commodity_id || item.commodityId)
    .filter(Boolean))];
  const preferredCropIds = [...new Set((bundle.crop_plans || [])
    .filter((plan) => preferredMatcher.isPreferred(plan))
    .map((plan) => plan.commodity_id || plan.commodityId)
    .filter(Boolean))];
  const supportedVarietyById = new Map(
    supportedItems
      .map((item) => [
        item.commodity_id || item.commodityId,
        item.variety ?? item.variety_name ?? null,
      ])
      .filter(([id]) => Boolean(id))
  );
  const basisIds = [...new Set([...preferredCropIds, ...preferredPriceIds])];
  const quarters = ["Q1", "Q2", "Q3", "Q4"];

  const requests = [
    safePrefetch(["farmer-notifications"], async () => {
      const response = await apiGet("/me/notifications?page=1&page_size=50");
      return parseResponse(response);
    }),
    safePrefetch(["location", "davao-city", "barangays"], async () => {
      const response = await apiGet("/location/davao-city/barangays");
      const data = await parseResponse(response);
      return data?.items || [];
    }),
    safePrefetch(["farmer", "admin-weather-forecast", 14], async () =>
      parseResponse(await apiGet("/admin/analytics/outputs/weather-forecast?days=14"))
    ),
    safePrefetch(["farmer", "removalRequests"], async () =>
      parseResponse(await apiGet("/dftc/removal-requests"))
    ),
    safePrefetch(["notifications", "unread-count"], async () => {
      const data = await parseResponse(await apiGet("/me/notifications/unread-count"));
      return data?.unread_count ?? 0;
    }),
  ];

  preferredPriceIds.forEach((commodityId) => {
    const variety = supportedVarietyById.get(commodityId) || null;
    FARMER_PRICE_TYPES.forEach((priceTypeKey) => {
      FARMER_PRICE_HORIZONS.forEach((horizon) => {
        requests.push(
          safePrefetch(
            ["farmer", "admin-price-outlook", commodityId, priceTypeKey, horizon, null, null, null],
            async () => parseResponse(await apiGet(
              `/admin/analytics/outputs/price-outlook?commodity_id=${encodeURIComponent(commodityId)}&price_type_key=${encodeURIComponent(priceTypeKey)}&horizon=${horizon}`
            ))
          ),
          safePrefetch(
            ["prices", "detail", commodityId, priceTypeKey, horizon],
            async () => {
              const raw = await parseResponse(await apiGet(
                `/prices/${encodeURIComponent(commodityId)}?price_type=${encodeURIComponent(priceTypeKey)}&horizon=${horizon}&records_limit=5`
              ));
              if (priceTypeKey === "bangkerohan_retail" && horizon === BUNDLE_DETAIL_PERIOD) {
                queryClient.setQueryData(["price-detail", commodityId], raw);
              }
              return toCamelCase(raw);
            }
          ),
        );
      });
      requests.push(
        safePrefetch(
          ["prices", "trend", commodityId, priceTypeKey, BUNDLE_TREND_PERIOD, BUNDLE_TREND_RECORDS_LIMIT],
          async () => {
            const raw = await parseResponse(await apiGet(
              `/prices/${encodeURIComponent(commodityId)}?price_type=${encodeURIComponent(priceTypeKey)}&horizon=${BUNDLE_TREND_PERIOD}&records_limit=${BUNDLE_TREND_RECORDS_LIMIT}`
            ));
            if (priceTypeKey === BUNDLE_TREND_PRICE_TYPE) {
              queryClient.setQueryData(
                ["farmer-price-card-trend", commodityId, priceTypeKey, BUNDLE_TREND_PERIOD],
                raw
              );
            }
            return raw;
          }
        )
      );
      ["weekly", "monthly"].forEach((frequency) => {
        requests.push(
          safePrefetch(
            ["prices", "historicalAvg", commodityId, priceTypeKey, frequency, variety],
            async () => parseResponse(await apiGet(
              `/prices/${encodeURIComponent(commodityId)}/historical-averages?price_type=${encodeURIComponent(priceTypeKey)}&frequency=${frequency}&start_offset_days=0${variety ? `&variety=${encodeURIComponent(variety)}` : ""}`
            ))
          )
        );
      });
    });
  });

  basisIds.forEach((commodityId) => {
    requests.push(
      safePrefetch(["farmer", "arrival-pressure", commodityId], async () =>
        parseResponse(await apiGet(`/admin/analytics/outputs/arrival-pressure?commodity_id=${encodeURIComponent(commodityId)}`))
      ),
      ...quarters.map((quarter) => safePrefetch(
        ["farmer", "seasonal-production", commodityId, quarter],
        async () => parseResponse(await apiGet(
          `/admin/analytics/outputs/historical-seasonal-production?commodity_id=${encodeURIComponent(commodityId)}&quarter=${quarter}`
        ))
      )),
      safePrefetch(["farmer", "weather-rules", commodityId], async () =>
        parseResponse(await apiGet(`/admin/crop-weather-rules?commodity_id=${encodeURIComponent(commodityId)}`))
      ),
    );
  });

  // Warm only the current month. Other months are fetched on demand by the
  // recommendation page, avoiding a 12-request burst against the public
  // market rate limit during every farmer session.
  requests.push(
    safePrefetch(monthlyRecommendationsKey(), () => fetchMonthlyRecommendations())
  );

  // Crop Factors and Crop Cycle Details use a parameterized advisory result
  // for each saved crop plan. Recreate the exact key and payload from the
  // normalized offline crop record.
  const cachedCrops = (queryClient.getQueryData(["farmer", "crops"]) || [])
    .filter((crop) => preferredMatcher.isPreferred(crop));
  cachedCrops.forEach((crop) => {
    const totalCost = crop.totalCost || 0;
    const quantity = crop.harvestQuantity > 0 ? crop.harvestQuantity : 0;
    const canQuery = Boolean(
      crop.id && crop.commodityName && crop.plantingDate && crop.harvestDate && totalCost > 0 && quantity > 0
    );
    if (!canQuery) return;
    const rawPhase = String(crop.phase || "").toLowerCase();
    const explicitStage = rawPhase.includes("plan")
      ? "before_planting"
      : rawPhase.includes("grow") || rawPhase.includes("plant")
        ? "during_planting"
        : rawPhase.includes("pre")
          ? "near_harvest"
          : rawPhase.includes("harvest")
            ? "harvest"
            : null;
    const queryKey = [
      "advisory", "plan", "v2", crop.id, crop.commodityName, crop.plantingDate,
      crop.harvestDate, totalCost, quantity, explicitStage,
    ];
    requests.push(
      safePrefetch(queryKey, async () => {
        const response = await apiPost("/advisory/plan", {
          crop_name: crop.commodityName,
          planting_date: crop.plantingDate,
          expected_harvest_date: crop.harvestDate,
          total_production_cost: totalCost,
          expected_yield_kg: quantity,
          crop_stage: explicitStage,
        });
        if (!response.ok) return null;
        return parseResponse(response);
      })
    );
  });

  await Promise.all(requests);
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
    prefetch(FARMER_COMMODITIES_KEY, fetchFarmerCommodities),
    prefetch(["farmer", "crops"], fetchCropPlans),
    prefetch(["marketCalendar"], fetchMarketCalendar),
  ]);

  const profile = queryClient.getQueryData(FARMER_PROFILE_KEY);
  const lat = profile?.latitude ?? DEFAULT_WEATHER_LAT;
  const lon = profile?.longitude ?? DEFAULT_WEATHER_LON;
  await prefetch(weatherAdvisoryKey(lat, lon), () => fetchWeatherAdvisory(lat, lon));
}

// Full detail warm-up for pages the farmer may visit later. This is
// intentionally separate from the login-critical path and runs during idle
// time, so a slow analytics endpoint cannot delay the dashboard.
export async function prefetchFarmerFullData(queryClient) {
  await queryClient.prefetchQuery({
    queryKey: SUPPORTED_PRICES_KEY,
    queryFn: fetchSupportedPricesList,
    staleTime: STALE_TIME,
  }).catch(() => {});
  await queryClient.prefetchQuery({
    queryKey: ["marketCalendar", "v2"],
    queryFn: fetchMarketCalendar,
    staleTime: STALE_TIME,
  }).catch(() => {});

  // Keep the fallback path equivalent to the snapshot path for variety-aware
  // price and basis pages.
  const supportedItems = queryClient.getQueryData(SUPPORTED_PRICES_KEY)?.items || [];
  const priceItems = supportedItems.length
    ? supportedItems
    : queryClient.getQueryData(["prices", "list"])?.items || [];
  await prefetchFarmerPageData(queryClient, {
    crop_plans: queryClient.getQueryData(["farmer", "crops"]) || [],
    price_trends: priceItems,
  });
}

let farmerOfflineLoadPromise = null;
let lastFarmerOfflineLoadAt = 0;
const OFFLINE_LOAD_DEDUPE_MS = 1000 * 60 * 30;

function scheduleFullFarmerPrefetch(queryClient) {
  const run = () => prefetchFarmerFullData(queryClient).catch(() => {});
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 5000 });
  } else {
    setTimeout(run, 0);
  }
}

/**
 * Load every top-level farmer dataset and write it into the React Query cache
 * so the persister pushes it to IndexedDB. Prefers the single snapshot bundle;
 * falls back to per-endpoint prefetches.
 */
export function loadFarmerOfflineData(queryClient, { force = false } = {}) {
  const now = Date.now();
  if (!force && (farmerOfflineLoadPromise || now - lastFarmerOfflineLoadAt < OFFLINE_LOAD_DEDUPE_MS)) {
    return farmerOfflineLoadPromise || Promise.resolve();
  }
  farmerOfflineLoadPromise = (async () => {
    try {
      await seedFarmerOfflineBundle(queryClient);
    } catch {
      await prefetchFarmerOfflineData(queryClient);
    }
    // Settings → Farm Profile uses these exact cache keys. Warm the catalogue
    // alongside the login bundle so opening that tab does not wait on a second
    // round trip after the farmer is already signed in.
    await queryClient.prefetchQuery({
      queryKey: FARMER_COMMODITIES_KEY,
      queryFn: fetchFarmerCommodities,
      staleTime: STALE_TIME,
    }).catch(() => {});
    lastFarmerOfflineLoadAt = Date.now();
    scheduleFullFarmerPrefetch(queryClient);
  })().finally(() => {
    farmerOfflineLoadPromise = null;
  });
  return farmerOfflineLoadPromise;
}

export function useFarmerPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    loadFarmerOfflineData(queryClient);
  }, [queryClient]);
}
