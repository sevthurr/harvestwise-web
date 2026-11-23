/**
 * The query client's offline policy.
 *
 * The app's offline layer is the service worker: vite.config.js caches every
 * /api/v1/ GET under a NetworkFirst runtime cache for 7 days, and that cache is
 * only consulted if a request actually reaches the service worker.
 *
 * React Query's default networkMode ('online') refuses to issue the request at
 * all while the browser reports offline, so the cached response can never be
 * read. Queries therefore run with 'always'. Mutations keep the default, so a
 * half-written save is never attempted while offline.
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
  shouldPersistQueryCache,
  shouldRetry,
} from "../app/global/lib/queryClient";

describe("query client offline policy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("runs queries with networkMode 'always' so the service worker can answer offline", () => {
    expect(queryClient.getDefaultOptions().queries.networkMode).toBe("always");
  });

  it("keeps error-status queries with data in the persisted snapshot (failed offline prices refetch)", () => {
    const shouldDehydrateQuery = queryClient.getDefaultOptions().dehydrate.shouldDehydrateQuery;
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
