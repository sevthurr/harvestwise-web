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
  // A network-level failure (no HTTP status — the request never reached the
  // server) while the browser is offline cannot succeed on a retry: the
  // service worker has already answered from its runtime cache, or there was
  // nothing to answer with. Retrying only delays the error by the backoff.
  if (typeof status !== 'number' && isBrowserOffline()) return false;
  return failureCount < 3;
}

/**
 * True only when the browser reports being offline. `navigator` is absent in
 * non-browser environments (tests, SSR), where offline is not a thing.
 */
function isBrowserOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30,        // 30 min before data is considered stale
      gcTime: SEVEN_DAYS,                // keep in memory for 7 days
      retry: shouldRetry,
      // The offline layer is the service worker: vite.config.js caches every
      // /api/v1/ GET under NetworkFirst for 7 days. React Query's default
      // networkMode ('online') refuses to issue the request at all while the
      // browser reports offline, so the service worker is never consulted and
      // its cached response can never be read. 'always' lets the request go
      // out so the service worker can answer it from cache.
      // Mutations keep the default, so a half-written save is never attempted
      // while offline.
      networkMode: 'always',
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

/**
 * CacheStorage name for runtime-cached API GETs, configured in vite.config.js.
 */
const API_RUNTIME_CACHE = 'harvestwise-api-cache';

/**
 * Drop every trace of the previous user from this device.
 *
 * Two stores are involved and both must be cleared:
 *
 *  1. The react-query IndexedDB persister, holding up to 7 days of farmer PII.
 *  2. The service worker's CacheStorage (`harvestwise-api-cache`), holding raw
 *     API GET bodies under NetworkFirst.
 *
 * Clearing only (1) leaves (2) intact. On a shared handset the next user can go
 * offline, have the network call fail, and be served the previous farmer's
 * cached /farmer responses straight out of CacheStorage — a cross-user data
 * disclosure that no amount of token handling prevents, because the response
 * body is already on disk and the service worker replays it without consulting
 * any credential.
 */
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
  try {
    if (typeof caches !== 'undefined') {
      await caches.delete(API_RUNTIME_CACHE);
    }
  } catch {
    // CacheStorage unavailable (private mode / older browser) — not fatal.
  }
}

