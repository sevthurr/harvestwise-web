import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { notificationMock, loadFarmerOfflineDataMock } = vi.hoisted(() => ({
  notificationMock: vi.fn(),
  loadFarmerOfflineDataMock: vi.fn(),
}));

vi.mock("../app/global/contexts/NotificationStreamContext", () => ({
  useNotificationEvent: (eventName, handler) => notificationMock(eventName, handler),
}));

vi.mock("../app/global/hooks/useFarmerPrefetch", () => ({
  loadFarmerOfflineData: loadFarmerOfflineDataMock,
}));

import {
  FARMER_DATA_SYNC_SCOPES,
  farmerDataSyncScopes,
  useFarmerDataSync,
} from "../app/global/hooks/useFarmerDataSync";

describe("farmerDataSyncScopes", () => {
  it("invalidates every price surface on PRICES_UPDATED", () => {
    expect(farmerDataSyncScopes("PRICES_UPDATED")).toEqual([
      ["prices"],
      ["dashboard"],
      ["price-detail"],
      ["farmer-price-card-trend"],
      ["farmer", "admin-price-outlook"],
    ]);
  });

  it("invalidates only arrival pressure on ARRIVAL_UPDATED", () => {
    expect(farmerDataSyncScopes("ARRIVAL_UPDATED")).toEqual([
      ["farmer", "arrival-pressure"],
    ]);
  });

  it("invalidates prices on COMMODITIES_UPDATED", () => {
    expect(farmerDataSyncScopes("COMMODITIES_UPDATED")).toEqual([["prices"]]);
  });

  it("ignores unknown or missing types", () => {
    expect(farmerDataSyncScopes("DATASET_INGESTION_SUCCESS")).toEqual([]);
    expect(farmerDataSyncScopes(undefined)).toEqual([]);
  });

  it("does not expose mutable scope arrays", () => {
    expect(Object.isFrozen(FARMER_DATA_SYNC_SCOPES)).toBe(true);
  });
});

const originalOnLine = navigator.onLine;

function setOnline(value) {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
}

function renderSyncHook() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  renderHook(() => useFarmerDataSync(), { wrapper });
  return queryClient;
}

function emitDataset(type) {
  const handler = notificationMock.mock.calls.at(-1)[1];
  act(() => handler({ type }));
}

const COALESCE_MS = 1000;

describe("useFarmerDataSync offline bundle re-seed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setOnline(true);
    loadFarmerOfflineDataMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    setOnline(originalOnLine);
    vi.restoreAllMocks();
  });

  it("force re-seeds the offline bundle after PRICES_UPDATED", async () => {
    const queryClient = renderSyncHook();

    emitDataset("PRICES_UPDATED");
    expect(loadFarmerOfflineDataMock).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(COALESCE_MS); });

    expect(loadFarmerOfflineDataMock).toHaveBeenCalledTimes(1);
    expect(loadFarmerOfflineDataMock).toHaveBeenCalledWith(queryClient, { force: true });
  });

  it("coalesces a burst of mapped events into one re-seed", async () => {
    renderSyncHook();

    emitDataset("PRICES_UPDATED");
    await act(async () => { await vi.advanceTimersByTimeAsync(COALESCE_MS / 2); });
    emitDataset("ARRIVAL_UPDATED");
    await act(async () => { await vi.advanceTimersByTimeAsync(COALESCE_MS); });

    expect(loadFarmerOfflineDataMock).toHaveBeenCalledTimes(1);
  });

  it("does not re-seed when the device is offline when the timer fires", async () => {
    renderSyncHook();

    emitDataset("PRICES_UPDATED");
    setOnline(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(COALESCE_MS); });

    expect(loadFarmerOfflineDataMock).not.toHaveBeenCalled();
  });

  it("re-seeds when the device is back online by the time the timer fires", async () => {
    renderSyncHook();

    setOnline(false);
    emitDataset("PRICES_UPDATED");
    setOnline(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(COALESCE_MS); });

    expect(loadFarmerOfflineDataMock).toHaveBeenCalledTimes(1);
  });

  it("does not re-seed for an unmapped event type", async () => {
    renderSyncHook();

    emitDataset("DATASET_INGESTION_SUCCESS");
    await act(async () => { await vi.advanceTimersByTimeAsync(COALESCE_MS); });

    expect(loadFarmerOfflineDataMock).not.toHaveBeenCalled();
  });

  it("logs a re-seed rejection without letting it escape the handler", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    loadFarmerOfflineDataMock.mockRejectedValueOnce(new Error("seed failed"));
    renderSyncHook();

    emitDataset("PRICES_UPDATED");
    await act(async () => { await vi.advanceTimersByTimeAsync(COALESCE_MS); });

    expect(loadFarmerOfflineDataMock).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
  });
});
