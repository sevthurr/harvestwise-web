import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, parseResponse } from "../api";
import { normalizeCropPlan, buildPricesMap } from "../../farmer/components/crops/CropsContext";
import { DAVAO_CITY_FALLBACK_COORDINATES } from "../constants/location";
import { toCamelCase, manilaTodayParts, hasValidAdvisoryDatePair } from "../utils/apiTransforms";
import { getPreferredCropMatcher } from "../../farmer/utils/cropPreferences";
import { persistOfflineQueryCache } from "../lib/queryClient";

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

export function loadFarmerCommodities(queryClient) {
  return queryClient.fetchQuery({
    queryKey: FARMER_COMMODITIES_KEY,
    queryFn: fetchFarmerCommodities,
    staleTime: STALE_TIME,
  });
}

export function loadFarmerPrices(queryClient) {
  return queryClient.fetchQuery({
    queryKey: ["prices", "list"],
    queryFn: fetchPricesList,
    staleTime: 0,
  });
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
      if (!camel.commodityId || !camel.selectedPriceType || (preferredMatcher.count > 0 && !preferredMatcher.isPreferred(camel))) return;
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
      if (!commodityId || !priceTypeKey || (preferredMatcher.count > 0 && !preferredMatcher.isPreferred(entry))) return;
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

  const supportedItems = queryClient.getQueryData(SUPPORTED_PRICES_KEY)?.items || [];
  const priceItems = [...(bundle.price_trends || []), ...supportedItems];
  const preferredPriceIds = [...new Set(priceItems
    // The offline bundle must cover every commodity reachable from Farmer
    // routes, not only the farmer's preferred crops. The variable name is
    // retained for the existing request-building code.
    .filter(() => true)
    .map((item) => item.commodity_id || item.commodityId)
    .filter(Boolean))];
  const cropPlanIds = [...new Set((bundle.crop_plans || [])
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
  // A farmer's own crop plans are always eligible for basis prefetching, even
  // when the crop is not in the farmer's preferred list. The crop factors and
  // commodity detail pages can open any saved plan offline.
  const basisIds = [...new Set([...cropPlanIds, ...preferredPriceIds])];
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
    safePrefetch(["farmerMyActivities", "all", { from: "", to: "" }, 1], async () =>
      parseResponse(await apiGet("/farmer/activity?page=1&page_size=15"))
    ),
  ];

  // Per-commodity requests are deliberately kept out of the shared `requests`
  // array and fired one preferred commodity at a time: Promise.all inside a
  // commodity, await between commodities. Warming every preferred commodity's
  // endpoints at once multiplies already-heavy analytics calls.
  const preferredPriceIdSet = new Set(preferredPriceIds);
  const buildCommodityRequests = (commodityId) => {
    const commodityRequests = [];
    if (preferredPriceIdSet.has(commodityId)) {
      const variety = supportedVarietyById.get(commodityId) || null;
      FARMER_PRICE_TYPES.forEach((priceTypeKey) => {
        FARMER_PRICE_HORIZONS.forEach((horizon) => {
          commodityRequests.push(
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
        commodityRequests.push(
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
          commodityRequests.push(
            safePrefetch(
              ["prices", "historicalAvg", commodityId, priceTypeKey, frequency, variety],
              async () => parseResponse(await apiGet(
                `/prices/${encodeURIComponent(commodityId)}/historical-averages?price_type=${encodeURIComponent(priceTypeKey)}&frequency=${frequency}&start_offset_days=0${variety ? `&variety=${encodeURIComponent(variety)}` : ""}`
              ))
            )
          );
        });
      });
    }

    commodityRequests.push(
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
    return commodityRequests;
  };

  // Warm only the current month. Other months are fetched on demand by the
  // recommendation page, avoiding a 12-request burst against the public
  // market rate limit during every farmer session.
  requests.push(
    safePrefetch(monthlyRecommendationsKey(), () => fetchMonthlyRecommendations())
  );

  for (const commodityId of basisIds) {
    await Promise.all(buildCommodityRequests(commodityId));
  }

  await Promise.all(requests);
}

// Crop Factors and Crop Cycle Details use a parameterized advisory result for
// each saved crop plan. Keep the key and payload identical to CropCycleDetail;
// otherwise the page misses the persisted entry and issues another POST.
export async function prefetchFarmerPlanAdvisories(queryClient, crops = queryClient.getQueryData(["farmer", "crops"]) || []) {
  const prefetches = [];
  const activeCrops = crops.filter((crop) => !crop.isArchived && crop.phase !== "draft" && crop.status !== "Draft");

  activeCrops.forEach((crop) => {
    const totalCost = crop.totalCost || 0;
    // CropCycleDetail uses 1 kg as the advisory fallback while a planning
    // crop has no entered yield yet. Match that page so its planning advisory
    // is seeded under the exact same key instead of being skipped offline.
    const quantity = crop.harvestQuantity > 0 ? crop.harvestQuantity : 1;
    const pDateStr = crop.rawPlantingDate
      ? (typeof crop.rawPlantingDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(crop.rawPlantingDate)
        ? crop.rawPlantingDate.slice(0, 10)
        : new Date(crop.rawPlantingDate).toISOString().split("T")[0])
      : null;
    const hDateStr = crop.rawHarvestDate
      ? (typeof crop.rawHarvestDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(crop.rawHarvestDate)
        ? crop.rawHarvestDate.slice(0, 10)
        : new Date(crop.rawHarvestDate).toISOString().split("T")[0])
      : null;
    const validDates = pDateStr && hDateStr && /^\d{4}-\d{2}-\d{2}$/.test(pDateStr) && /^\d{4}-\d{2}-\d{2}$/.test(hDateStr) && pDateStr < hDateStr;
    if (!crop.id || !crop.commodityName || !validDates || totalCost <= 0 || quantity <= 0) return;

    const rawPhase = String(crop.phase || crop.status || "").toLowerCase();
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
      "advisory", "plan", "v2", crop.id, crop.commodityName, pDateStr,
      hDateStr, totalCost, quantity, explicitStage,
    ];
    prefetches.push(queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        const response = await apiPost("/advisory/plan", {
          crop_name: crop.commodityName,
          planting_date: pDateStr,
          expected_harvest_date: hDateStr,
          total_production_cost: totalCost,
          expected_yield_kg: quantity,
          estimated_selling_price: crop.farmgatePrice > 0 ? crop.farmgatePrice : undefined,
          crop_stage: explicitStage,
        });
        if (!response.ok) throw new Error(`advisory failed: ${response.status}`);
        return parseResponse(response);
      },
      staleTime: STALE_TIME,
    }).catch(() => {}));
  });

  await Promise.all(prefetches);
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
    prefetch(monthlyRecommendationsKey(), fetchMonthlyRecommendations),
    prefetch(FARMER_PROFILE_KEY, fetchFarmerProfile),
    prefetch(FARMER_COMMODITIES_KEY, fetchFarmerCommodities),
    prefetch(["farmer", "crops"], fetchCropPlans),
    // Keep these keys identical to the page queries. The fallback path is
    // used when the snapshot endpoint is unavailable, so an old alias here
    // leaves the pages with an empty query after navigation.
    prefetch(["marketCalendar", "v2"], fetchMarketCalendar),
  ]);

  const recommendations = queryClient.getQueryData(monthlyRecommendationsKey());
  if (recommendations) {
    queryClient.setQueryData(["market", "monthly-recommendations"], recommendations);
    queryClient.setQueryData(["recommendations", "list"], recommendations);
  }

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
  await prefetchFarmerPlanAdvisories(queryClient);
  await prefetchFarmerPageData(queryClient, {
    crop_plans: queryClient.getQueryData(["farmer", "crops"]) || [],
    price_trends: priceItems,
  });
}

let farmerOfflineLoadPromise = null;
let lastFarmerOfflineLoadAt = 0;
const OFFLINE_LOAD_DEDUPE_MS = 1000 * 60 * 30;
const OFFLINE_SEED_MARKER_KEY = 'hw_offline_seed_marker_v1';

export function hasOfflineSeedMarker() {
  try {
    const raw = localStorage.getItem(OFFLINE_SEED_MARKER_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.at);
  } catch {
    return false;
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
    await loadFarmerCommodities(queryClient).catch(() => {});
    // The assessment catalog reads the canonical prices list, not the optional
    // snapshot price_trends section. Refresh it explicitly so Top-10 crops are
    // available after an online login and remain available offline.
    await loadFarmerPrices(queryClient).catch(() => {});
    await prefetchFarmerPlanAdvisories(queryClient);

    // These are navigation-critical list pages. They must be persisted before
    // the sync status becomes ready; leaving them to the idle detail warm-up
    // lets a farmer go offline immediately after login and see blank pages.
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

    // Finish the full read-only Farmer bundle before reporting success. This
    // prevents mobile users from going offline while detail-page queries are
    // still waiting in the idle queue.
    await prefetchFarmerFullData(queryClient);
    await persistOfflineQueryCache();
    lastFarmerOfflineLoadAt = Date.now();
    try { localStorage.setItem(OFFLINE_SEED_MARKER_KEY, JSON.stringify({ at: Date.now() })); } catch {}
  })().finally(() => {
    farmerOfflineLoadPromise = null;
  });
  return farmerOfflineLoadPromise;
}

export function resetFarmerOfflineDedupeForTests() {
  lastFarmerOfflineLoadAt = 0;
  farmerOfflineLoadPromise = null;
}

export function useFarmerPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // On a cold offline PWA start, PersistQueryClientProvider is still
    // hydrating IndexedDB. Starting a new seed here races that restore and
    // can leave pages showing an empty network result instead of the saved
    // snapshot. Auth reconnect/login paths seed when connectivity is present.
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    loadFarmerOfflineData(queryClient);
  }, [queryClient]);
}
