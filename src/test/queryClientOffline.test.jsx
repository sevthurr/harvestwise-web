/**
 * The query client's offline policy.
 *
 * IndexedDB is the offline read layer. Queries pause while offline, while
 * mutations keep the default online-only behavior.
 *
 * A network-level failure (no HTTP status — the request never reached the
 * server) cannot succeed on a retry while the device is offline: the service
 * worker has already answered, or there was nothing to answer with. Retrying
 * only adds the backoff delay before the error surfaces.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { QueryClient, dehydrate } from "@tanstack/react-query";
import { get as getIndexedDb } from "idb-keyval";

import {
  queryClient,
  restorePersistedFarmerData,
  normalizePersistedQueryStates,
  shouldDehydrateQuery,
  shouldPersistQueryCache,
  shouldRetry,
  ensureCanonicalPriceList,
} from "../app/global/lib/queryClient";

describe("query client offline policy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pauses queries offline so hydrated IndexedDB data remains readable", () => {
    expect(queryClient.getDefaultOptions().queries.networkMode).toBe("online");
  });

  it("normalizes persisted error states that still contain data", () => {
    const state = normalizePersistedQueryStates({ queries: [{
      queryHash: 'prices',
      state: { status: "error", data: { items: [] }, error: { message: "offline" } },
    }] });
    expect(state.queries[0].state.status).toBe("success");
    expect(state.queries[0].state.error).toBeNull();
    expect(state.queries[0].state.data).toEqual({ items: [] });
  });

  it("keeps error-status queries with data in the persisted snapshot (failed offline prices refetch)", () => {
    expect(shouldDehydrateQuery({ state: { status: "success", data: { commodities: [] } } })).toBe(true);
    expect(shouldDehydrateQuery({ state: { status: "error", data: { commodities: [] } } })).toBe(true);
    expect(shouldDehydrateQuery({ state: { status: "error", data: undefined } })).toBe(false);
  });

  it("leaves mutations on the default network mode", () => {
    // The app configures no mutation defaults at all, so a mutation keeps
    // query-core's default ('online'). 'always' on a mutation would attempt a
    // save that cannot complete while the device is offline.
    expect(queryClient.getDefaultOptions().mutations).toBeUndefined();
  });

  it("does not retry a network failure while the browser is offline", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(shouldRetry(0, new TypeError("Failed to fetch"))).toBe(false);
  });

  it("does not replace the last good IndexedDB snapshot while offline", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(shouldPersistQueryCache()).toBe(false);

    vi.stubGlobal("navigator", { onLine: true });
    expect(shouldPersistQueryCache()).toBe(true);
  });

  it("can rehydrate the farmer snapshot directly from IndexedDB", async () => {
    const sourceClient = new QueryClient();
    sourceClient.setQueryData(["dashboard", "prices"], [{ id: "COM-0001", price: 90 }]);
    vi.mocked(getIndexedDb).mockResolvedValueOnce({
      buster: "",
      timestamp: Date.now(),
      clientState: dehydrate(sourceClient),
    });

    const targetClient = new QueryClient();
    expect(await restorePersistedFarmerData(targetClient)).toBe(true);
    expect(targetClient.getQueryData(["dashboard", "prices"])).toEqual([
      { id: "COM-0001", price: 90 },
    ]);
  });

  it("does not replace the full supported price catalogue with the dashboard projection", () => {
    const client = new QueryClient();
    const supported = {
      items: [{
        commodity_id: "COM-VARIETY",
        name: "Ampalaya",
        variety: "Milky Wave",
        prices: {
          bangkerohan_retail: 90,
          bangkerohan_wholesale: 80,
          dftc_retail: 88,
          dftc_wholesale: 78,
        },
      }],
    };
    client.setQueryData(["dashboard", "prices"], [{ id: "COM-0001", name: "Ampalaya", price: 90 }]);
    client.setQueryData(["prices", "supported-list"], supported);

    ensureCanonicalPriceList(client);

    expect(client.getQueryData(["prices", "supported-list"])).toEqual(supported);
  });

  it("still retries a network failure while the browser is online", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(shouldRetry(0, new TypeError("Failed to fetch"))).toBe(true);
  });

  it("never retries a 4xx, online or offline", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(shouldRetry(0, { status: 404 })).toBe(false);
    expect(shouldRetry(0, { status: 401 })).toBe(false);

    vi.stubGlobal("navigator", { onLine: false });
    expect(shouldRetry(0, { status: 404 })).toBe(false);
  });
});
