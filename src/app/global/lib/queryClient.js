import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

// 7-day cache for offline-first farming use
const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7;

/**
 * Never retry a request whose failure is a decision, not a hiccup.
 *
 * 401 — the session is gone. api.js has already cleared tokens and dispatched
 *       hw:auth:expired; retrying the same request can only 401 again, and each
 *       retry re-enters that handler. It also re-enters the 401 path from
 *       resetQueries() during logout, which is how one expired session turned
 *       into a burst of 401s in the network tab.
 * 403 — the account is not allowed. Retrying cannot grant permission.
 *
 * 4xx responses are not idempotent-safe to replay blindly, so the rest of the
 * client range fails fast too; only network errors and 5xx are worth retrying.
 */
export function shouldRetry(failureCount, error) {
  const status = error?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) return false;
  return failureCount < 3;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30,        // 30 min before data is considered stale
      gcTime: SEVEN_DAYS,                // keep in memory for 7 days
      retry: shouldRetry,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,           // refresh when farmer comes back online
      refetchOnMount: false,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => await get(key),
    setItem: async (key, value) => await set(key, value),
    removeItem: async (key) => await del(key),
  },
  key: "HARVESTWISE_FARMER_INDEXEDDB_CACHE_V1",
});

export async function clearQueryPersistedCache() {
  // resetQueries(), NOT clear(). clear()/removeQueries() destroy the Query
  // object a mounted observer is attached to; the observer then re-attaches to
  // an empty, never-fetched query and isLoading stays true forever. resetQueries
  // refetches active queries so every mounted observer settles.
  queryClient.resetQueries();
  try {
    await del("HARVESTWISE_FARMER_INDEXEDDB_CACHE_V1");
  } catch {
    // ignore
  }
}

