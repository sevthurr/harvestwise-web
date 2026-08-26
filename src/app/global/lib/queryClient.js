import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { get, set, del } from "idb-keyval";

// 7-day cache for offline-first farming use
const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30,        // 30 min before data is considered stale
      gcTime: SEVEN_DAYS,                // keep in memory for 7 days
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,           // refresh when farmer comes back online
      refetchOnMount: false,
    },
  },
});

const indexedDBPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => await get(key),
    setItem: async (key, value) => await set(key, value),
    removeItem: async (key) => await del(key),
  },
  key: "HARVESTWISE_FARMER_INDEXEDDB_CACHE_V1",
});

persistQueryClient({
  queryClient,
  persister: indexedDBPersister,
  maxAge: SEVEN_DAYS,                     // retain cached data for 7 days
});
