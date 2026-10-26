import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

const { apiGet, parseResponse } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  parseResponse: vi.fn(),
}));

vi.mock("../app/global/api", () => ({ apiGet, parseResponse }));

import {
  prefetchFarmerFullData,
  seedFarmerOfflineBundle,
} from "../app/global/hooks/useFarmerPrefetch";

describe("farmer offline recommendation snapshot", () => {
  beforeEach(() => {
    apiGet.mockClear();
    parseResponse.mockClear();
  });

  it("seeds every farmer recommendation query key from the raw snapshot", async () => {
    const recommendations = [{
      commodity_id: "COM-0004",
      commodity_name: "Kamatis",
      advisory_category: "Recommended",
    }];
    const bundle = {
      profile: null,
      crop_plans: [],
      price_trends: [],
      price_detail: [],
      price_trend: [],
      advisory_summary: recommendations,
    };
    apiGet.mockResolvedValue({ ok: true, status: 200 });
    parseResponse.mockResolvedValue(bundle);

    const client = new QueryClient();
    await seedFarmerOfflineBundle(client);

    expect(apiGet).toHaveBeenCalledWith("/farmer/daily-snapshot?detail=0");

    expect(client.getQueryData(["market", "monthly-recommendations"])).toEqual({
      items: recommendations,
    });
    expect(client.getQueryData(["recommendations", "list"])).toEqual({
      items: recommendations,
    });
    const monthKey = [
      "monthly-recommendations",
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`,
    ];
    expect(client.getQueryData(monthKey)).toEqual({ items: recommendations });
  });

  it("warms price forecasts and basis outputs for every listed commodity", async () => {
    const bundle = {
      profile: null,
      crop_plans: [],
      price_trends: [{ commodity_id: "COM-0038" }],
      price_detail: [],
      price_trend: [],
      advisory_summary: [],
    };
    apiGet.mockResolvedValue({ ok: true, status: 200 });
    parseResponse.mockResolvedValue(bundle);

    const client = new QueryClient();
    await seedFarmerOfflineBundle(client);
    await prefetchFarmerFullData(client);

    expect(client.getQueryData([
      "farmer", "admin-price-outlook", "COM-0038", "bangkerohan_retail", 14,
      null, null, null,
    ])).toEqual(bundle);
    expect(client.getQueryData([
      "prices", "detail", "COM-0038", "dftc_wholesale", 28,
    ])).toBeTruthy();
    expect(client.getQueryData([
      "prices", "historicalAvg", "COM-0038", "bangkerohan_retail", "monthly", null,
    ])).toEqual(bundle);
    expect(client.getQueryData(["farmer", "arrival-pressure", "COM-0038"])).toEqual(bundle);
  });

  it("warms only the current month recommendation endpoint", async () => {
    const bundle = {
      profile: null,
      crop_plans: [],
      price_trends: [],
      price_detail: [],
      price_trend: [],
      advisory_summary: [],
    };
    apiGet.mockResolvedValue({ ok: true, status: 200 });
    parseResponse.mockResolvedValue(bundle);

    await prefetchFarmerFullData(new QueryClient());

    const recommendationCalls = apiGet.mock.calls
      .map(([url]) => url)
      .filter((url) => url.startsWith("/market/monthly-recommendations"));
    expect(recommendationCalls).toEqual([
      `/market/monthly-recommendations?reference_month=${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`,
    ]);
  });
});
