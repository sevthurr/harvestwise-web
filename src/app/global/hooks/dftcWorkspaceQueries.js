import { apiGet, parseResponse } from "../api";

export const DFTC_HOME_KEY = ["dftc", "home"];
export const DFTC_SUBMISSIONS_KEY = ["dftc", "submissions"];
// Separate key for the home page's recent-activity preview — smaller payload,
// never shares the cache entry with the full submissions list (page_size=50).
export const DFTC_SUBMISSIONS_RECENT_KEY = ["dftc", "submissions-recent"];
export const DFTC_STAFF_KEY = ["dftc", "staff"];
export const DFTC_WORKSPACE_STALE_TIME = 5 * 60 * 1000;

export async function fetchDftcHome() {
  return parseResponse(await apiGet("/dftc/home"));
}

export async function fetchDftcSubmissions() {
  return parseResponse(await apiGet("/dftc/submissions?page=1&page_size=50"));
}

// Lightweight fetch for the home page — today's activity only needs the
// most recent records, and page_size=10 stays well under the 10 MB cache limit.
export async function fetchDftcSubmissionsRecent() {
  return parseResponse(await apiGet("/dftc/submissions?page=1&page_size=10"));
}

export async function fetchDftcStaff() {
  const data = await parseResponse(await apiGet("/dftc/staff"));
  const items = Array.isArray(data) ? data : data?.items ?? [];
  return items.map((staff) => ({
    name: [staff.first_name, staff.middle_name, staff.last_name, staff.suffix]
      .filter(Boolean)
      .join(" ")
      .toUpperCase(),
    role: staff.position_title || "DFTC Staff",
  }));
}

export function prefetchDftcWorkspace(queryClient) {
  const options = (queryKey, queryFn) => ({
    queryKey,
    queryFn,
    staleTime: DFTC_WORKSPACE_STALE_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return Promise.all([
    queryClient.prefetchQuery(options(DFTC_HOME_KEY, fetchDftcHome)),
    queryClient.prefetchQuery(options(DFTC_SUBMISSIONS_KEY, fetchDftcSubmissions)),
    queryClient.prefetchQuery(options(DFTC_STAFF_KEY, fetchDftcStaff)),
  ]).catch(() => {});
}
