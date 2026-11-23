import { apiGet, parseResponse } from "../api";
import * as pricesApi from "../../../services/api/pricesApi";
import * as dftcApi from "../../../services/api/dftcApi";

export const DFTC_HOME_KEY = ["dftc", "home"];
export const DFTC_SUBMISSIONS_KEY = ["dftc", "submissions"];
// Separate key for the home page's recent-activity preview — smaller payload,
// never shares the cache entry with the full submissions list (page_size=50).
export const DFTC_SUBMISSIONS_RECENT_KEY = ["dftc", "submissions-recent"];
export const DFTC_STAFF_KEY = ["dftc", "staff"];
export const DFTC_TRENDS_PRICE_CATALOG_KEY = ["dftc-trends-price-catalog"];
export const DFTC_TRENDS_PRICE_CATALOG_SUPPORTED_KEY = ["dftc-trends-price-catalog-supported"];
export const DFTC_TRENDS_COMMODITY_CATALOG_KEY = ["dftc-trends-commodity-catalog"];
export const DFTC_WORKSPACE_STALE_TIME = 30 * 60 * 1000;
export const DFTC_DAILY_CACHE_TIME = 24 * 60 * 60 * 1000;

export async function fetchDftcHome() {
  // Cold-cache build runs ~15 N+1 DB queries; give it more headroom than the
  // global 15s default so a slow Render cold-start doesn't abort a valid response.
  return parseResponse(await apiGet("/dftc/home", { timeoutMs: 40000 }));
}

export async function fetchDftcSubmissions() {
  return parseResponse(await apiGet("/dftc/submissions?page=1&page_size=50", { timeoutMs: 30000 }));
}

// Lightweight fetch for the home page — today's activity only needs the
// most recent records, and page_size=10 stays well under the 10 MB cache limit.
export async function fetchDftcSubmissionsRecent() {
  return parseResponse(await apiGet("/dftc/submissions?page=1&page_size=10", { timeoutMs: 30000 }));
}

export async function fetchDftcStaff() {
  const data = await parseResponse(await apiGet("/dftc/staff"));
  const items = Array.isArray(data) ? data : data?.items ?? [];
  return items.map((staff) => ({
    id: staff.id,
    user_id: staff.user_id,
    name: [staff.first_name, staff.middle_name, staff.last_name, staff.suffix]
      .filter(Boolean)
      .join(" ")
      .toUpperCase(),
    role: staff.position_title || staff.position_name || "DFTC Staff",
  }));
}

export function prefetchDftcWorkspace(queryClient, { includeRecent = false } = {}) {
  const options = (queryKey, queryFn) => ({
    queryKey,
    queryFn,
    staleTime: DFTC_WORKSPACE_STALE_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const queries = [
    queryClient.prefetchQuery(options(DFTC_HOME_KEY, fetchDftcHome)),
    queryClient.prefetchQuery(options(DFTC_SUBMISSIONS_KEY, fetchDftcSubmissions)),
  ];
  if (includeRecent) {
    queries.push(queryClient.prefetchQuery(options(DFTC_SUBMISSIONS_RECENT_KEY, fetchDftcSubmissionsRecent)));
  }
  return Promise.all(queries).catch(() => {});
}

export function prefetchDftcTrends(queryClient) {
  const options = (queryKey, queryFn) => ({
    queryKey,
    queryFn,
    staleTime: DFTC_DAILY_CACHE_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return Promise.all([
    queryClient.prefetchQuery(options(
      DFTC_TRENDS_PRICE_CATALOG_KEY,
      () => pricesApi.getPriceList({ is_top10: true, page_size: 100 })
    )),
    queryClient.prefetchQuery(options(
      DFTC_TRENDS_PRICE_CATALOG_SUPPORTED_KEY,
      () => pricesApi.getPriceList({ include_supported_varieties: true, page_size: 100 })
    )),
    queryClient.prefetchQuery(options(
      DFTC_TRENDS_COMMODITY_CATALOG_KEY,
      () => dftcApi.getCommodityCatalog()
    )),
  ]).catch(() => {});
}
