import { QueryClient, hydrate, onlineManager } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClientSave } from "@tanstack/query-persist-client-core";
import { get, set, del, clear } from "idb-keyval";

// Offline-first farming use: match AuthContext's offline session grace so a
// restored session still has data to show (both expire together).
const OFFLINE_TTL_MS = 1000 * 60 * 60 * 24 * 30;

const initialOnline = typeof navigator === "undefined" || navigator.onLine !== false;
onlineManager.setOnline(initialOnline);
if (typeof window !== "undefined") {
  window.addEventListener("online", () => onlineManager.setOnline(true));
  window.addEventListener("offline", () => onlineManager.setOnline(false));
}

export function shouldDehydrateQuery(query) {
  return query.state.status === "success" ||
    (query.state.status === "error" && query.state.data !== undefined);
}

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
export function isBrowserOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Avoid forcing a network refetch while offline. Refetching on mount is useful
 * for freshness online, but offline it triggers requests that fail when the
 * service worker has no cached response, masking persisted query data behind
 * loading or empty states. When offline, keep the cached data and let the
 * normal reconnect/refocus behavior refresh later.
 */
export function refetchOnMountIfOnline(mode = true) {
  return isBrowserOffline() ? false : mode;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    // A failed offline refetch (the forced prices reload on prefetch) flips
    // status to 'error' while query-core keeps the last good data. The default
    // dehydrate filter drops it, so the persisted snapshot loses the prices and
    // the next cold reopen has nothing to hydrate.
    dehydrate: {
      shouldDehydrateQuery,
    },
    queries: {
      staleTime: 1000 * 60 * 30,        // 30 min before data is considered stale
      // A finite gcTime beyond 2^31-1 ms overflows the platform timer and
      // instantly collects hydrated offline queries with no mounted observer.
      // 30-day retention is enforced by persist maxAge / hasPersistedFarmerData.
      gcTime: Infinity,
      retry: shouldRetry,
      // Exponential backoff with jitter for network/server errors that are
      // worth retrying. The jitter prevents a thundering-herd retry when a
      // server-wide 5xx recovers.
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex + Math.random() * 500, 30000),
      // IndexedDB is the offline read layer. Queries must pause while offline
      // so a failed request cannot replace hydrated data with an error state.
      // Mutations keep the default, so a half-written save is never attempted
      // while offline.
      networkMode: 'online',
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,           // refresh when farmer comes back online
      refetchOnMount: false,
    },
  },
});

// Farmer data freshness. The global defaults skip refetches on mount so the
// 30-day persisted cache is not re-requested on every navigation. These key
// prefixes opt the surfaces that mirror DFTC input back into a stale-aware
// refetch on mount. Arrival pressure also refetches when the PWA becomes
// visible again: that is the safety net for SSE frames missed while offline,
// backgrounded, or disconnected. Query defaults match by key prefix.
//
// When offline, skip mount refetches so failed network requests do not mask
// persisted data behind loading/empty states. These defaults are evaluated at
// module load; per-query call sites should use refetchOnMountIfOnline(...) for
// render-time awareness.
queryClient.setQueryDefaults(["prices"], { refetchOnMount: refetchOnMountIfOnline(true) });
queryClient.setQueryDefaults(["dashboard"], { refetchOnMount: refetchOnMountIfOnline(true) });
queryClient.setQueryDefaults(["price-detail"], { refetchOnMount: refetchOnMountIfOnline(true) });
queryClient.setQueryDefaults(["farmer-price-card-trend"], {
  refetchOnMount: refetchOnMountIfOnline(true),
  // Card charts are a convenience projection; keep them shorter-lived than
  // the core farmer catalog and profile to avoid retaining large histories.
  gcTime: 1000 * 60 * 60 * 24 * 7,
});
queryClient.setQueryDefaults(["farmer", "admin-price-outlook"], {
  refetchOnMount: refetchOnMountIfOnline(true),
});
queryClient.setQueryDefaults(["farmer", "arrival-pressure"], {
  refetchOnMount: refetchOnMountIfOnline(true),
  refetchOnWindowFocus: true,
});

let persistWriteChain = Promise.resolve();

export const persister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => {
      const raw = await get(key);
      if (!raw) return raw;
      const persisted = typeof raw === "string" ? JSON.parse(raw) : raw;
      return JSON.stringify({ ...persisted, clientState: normalizePersistedQueryStates(persisted.clientState) });
    },
    // A failed offline refetch can produce a smaller dehydrated snapshot than
    // the last successful online seed. Never replace the good IndexedDB copy
    // with that partial snapshot; offline mode is read-only for this cache.
    setItem: async (key, value) => {
      if (!shouldPersistQueryCache()) return;
      persistWriteChain = persistWriteChain.catch(() => {}).then(async () => {
        const incoming = typeof value === "string" ? JSON.parse(value) : value;
        const existingRaw = await get(key);
        let existing = existingRaw;
        try {
          existing = typeof existingRaw === "string" ? JSON.parse(existingRaw) : existingRaw;
        } catch {
          existing = null;
        }
        const existingQueries = existing?.clientState?.queries || [];
        const incomingQueries = incoming?.clientState?.queries || [];
        const queriesByHash = new Map(existingQueries.map((query) => [query.queryHash, query]));
        incomingQueries.forEach((query) => {
          const previous = queriesByHash.get(query.queryHash);
          if (!previous || query?.state?.data !== undefined || previous?.state?.data === undefined) {
            queriesByHash.set(query.queryHash, query);
          }
        });
        const merged = {
          ...incoming,
          clientState: {
            ...incoming.clientState,
            queries: [...queriesByHash.values()],
          },
        };
        await set(key, JSON.stringify(merged));
      });
      await persistWriteChain;
    },
    removeItem: async (key) => await del(key),
  },
  key: "HARVESTWISE_FARMER_INDEXEDDB_CACHE_V1",
});

export function normalizePersistedQueryStates(clientState) {
  if (!clientState?.queries) return clientState;
  return {
    ...clientState,
    queries: clientState.queries.map((query) => {
      if (query?.state?.data === undefined || query.state.status !== "error") return query;
      return {
        ...query,
        state: {
          ...query.state,
          status: "success",
          error: null,
          dataUpdatedAt: query.state.dataUpdatedAt || Date.now(),
        },
      };
    }),
  };
}

/**
 * React Query may persist after an offline request settles. That write is not
 * allowed to replace the last known-good farmer read snapshot with a partial
 * error snapshot. Explicit logout still removes the key through removeItem.
 */
export function shouldPersistQueryCache() {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

/**
 * Check the persisted React Query snapshot without requiring the provider to
 * have finished hydrating. This is used during offline mobile startup, where
 * the auth restore and query hydration happen concurrently.
 */
export async function hasPersistedFarmerData() {
  try {
    const raw = await get("HARVESTWISE_FARMER_INDEXEDDB_CACHE_V1");
    const persisted = typeof raw === "string" ? JSON.parse(raw) : raw;
    const queries = persisted?.clientState?.queries || [];
    const usableKeys = new Set([
      '["farmer","crops"]',
      '["prices","list"]',
      '["dashboard","prices"]',
      '["marketCalendar","v2"]',
    ]);
    return queries.some((query) =>
      query?.state?.data !== undefined && usableKeys.has(JSON.stringify(query.queryKey))
    );
  } catch {
    return false;
  }
}

/**
 * Direct offline fallback for mobile startup. The provider normally hydrates
 * this snapshot, but an auth/network transition can finish after that restore
 * and leave the mounted QueryClient empty. Read the same snapshot again and
 * hydrate it without performing any network request or write.
 */
export async function restorePersistedFarmerData(client = queryClient) {
  try {
    const raw = await get("HARVESTWISE_FARMER_INDEXEDDB_CACHE_V1");
    const persisted = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!persisted?.clientState || persisted.buster !== "") return false;
    if (persisted.timestamp && Date.now() - persisted.timestamp > OFFLINE_TTL_MS) return false;

    hydrate(client, normalizePersistedQueryStates(persisted.clientState));
    ensureCanonicalPriceList(client);
    return true;
  } catch {
    return false;
  }
}

/** Flush the current query cache before a caller reports offline data ready. */
export function persistOfflineQueryCache(client = queryClient) {
  return persistQueryClientSave({
    queryClient: client,
    persister,
    dehydrateOptions: { shouldDehydrateQuery },
  });
}

export async function getStorageHealth() {
  try {
    if (typeof navigator === "undefined" || !navigator.storage) {
      return { persisted: false, unavailable: true };
    }
    const estimate = await navigator.storage.estimate?.();
    return {
      persisted: await navigator.storage.persist?.() ?? false,
      usage: estimate?.usage ?? 0,
      quota: estimate?.quota ?? 0,
    };
  } catch (error) {
    return { persisted: false, unavailable: true, error };
  }
}

/**
 * Migrate older snapshots that persisted only the dashboard price projection.
 * The catalog pages use the canonical list key, including during offline boot.
 */
export function ensureCanonicalPriceList(client = queryClient) {
  const existing = client.getQueryData(["prices", "list"]);
  if (existing?.items?.length) return existing;

  const dashboardPrices = client.getQueryData(["dashboard", "prices"]);
  if (!Array.isArray(dashboardPrices) || dashboardPrices.length === 0) return null;

  const list = {
    items: dashboardPrices
      .filter((item) => item?.id && item?.name)
      .map((item) => ({
        commodity_id: item.id,
        name: item.name,
        base_name: item.baseName || item.name,
        is_top10: true,
        unit_of_measure: item.uom || "kg",
        prices: item.price == null ? {} : { bangkerohan_retail: item.price },
        forecast: item.direction ? { trend: item.direction } : null,
      })),
  };
  if (list.items.length === 0) return null;

  client.setQueryData(["prices", "list"], list);
  // Keep a previously persisted full catalogue intact. The dashboard fallback
  // is intentionally a one-price-per-commodity projection and must not erase
  // the other market prices or non-top-level varieties.
  if (!client.getQueryData(["prices", "supported-list"])?.items?.length) {
    client.setQueryData(["prices", "supported-list"], list);
  }
  return list;
}

/**
 * CacheStorage name for runtime-cached API GETs, configured in vite.config.js.
 */
const API_RUNTIME_CACHE = 'harvestwise-api-cache';

/**
 * Drop every trace of the previous user from this device.
 *
 * Two stores are involved and both must be cleared:
 *
 *  1. The react-query IndexedDB persister, holding up to 30 days of farmer PII.
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
export async function clearQueryPersistedCache({ refetchActive = true } = {}) {
  // Forced auth expiry keeps the mounted query observers alive and refetches
  // them so they settle. Intentional logout/session changes pass
  // refetchActive:false and cancel/clear instead; refetching during an offline
  // route transition can wake queries when connectivity returns and leave a
  // blank loading state.
  if (refetchActive) {
    queryClient.resetQueries();
  } else {
    // Logout/session changes are terminal for the mounted user. Refetching
    // active queries here can wake them when connectivity returns, during the
    // route transition to /login, and leave the app in a blank loading state.
    queryClient.cancelQueries();
    queryClient.clear();
  }
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

/** Remove all HarvestWise device copies, including non-React-Query caches. */
export async function clearDeviceData() {
  // Rotate the cache namespace first so an in-flight response cannot refill a
  // cache entry that this action just removed.
  try { localStorage.setItem('hw_session_generation', `${Date.now()}-${Math.random()}`); } catch {}
  await clearQueryPersistedCache({ refetchActive: false });
  try { await clear(); } catch {}
  try {
    if (typeof caches !== 'undefined') {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
  } catch {}
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('HARVESTWISE_') || key.startsWith('hw_'))
      .forEach((key) => localStorage.removeItem(key));
  } catch {}
}

