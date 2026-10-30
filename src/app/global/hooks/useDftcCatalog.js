import { useQuery } from "@tanstack/react-query";
import { apiGet, parseResponse } from "../api";

/**
 * Shared React Query hook for the DFTC commodity catalog.
 *
 * Both the Price Input and Arrival Input pages previously fetched
 * `/dftc/commodities` via direct `apiGet` in a useEffect, each issuing its
 * own request. Routing both through the same React Query key deduplicates
 * them: when both pages are mounted (or navigating between them re-uses the
 * cached data), only one network request goes out.
 *
 * The query is refetched on window focus and every 60 seconds so a commodity
 * registered by the other inputter still appears, matching the old polling
 * cadence.
 *
 * @returns {{ data: Array|null, isLoading: boolean, refetch: Function }}
 */
export function useDftcCatalog() {
  return useQuery({
    queryKey: ["dftc", "commodities"],
    queryFn: async () => {
      const res = await apiGet("/dftc/commodities");
      const data = await parseResponse(res);
      return Array.isArray(data) ? data : data?.items ?? [];
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
