import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

const { apiGet, apiPost, parseResponse } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  parseResponse: vi.fn(),
}));

vi.mock("../app/global/api", () => ({ apiGet, apiPost, parseResponse }));

import {
  loadFarmerCommodities,
  loadFarmerPrices,
  prefetchFarmerPlanAdvisories,
  prefetchFarmerFullData,
  FARMER_PRICE_TYPES,
  FARMER_PRICE_HORIZONS,
} from "../app/global/hooks/useFarmerPrefetch";

const EXPECTED_PER_COMMODITY =
  FARMER_PRICE_TYPES.length * (FARMER_PRICE_HORIZONS.length * 3 + 1 + 2) + 1 + 4 + 1;

describe("farmer prefetch commodity sequencing", () => {
  const deferreds = [];
  const aDeferreds = () => deferreds.filter((d) => d.url.includes("COM-A"));
  const bDeferreds = () => deferreds.filter((d) => d.url.includes("COM-B"));

  beforeEach(() => {
    apiGet.mockClear();
    apiPost.mockClear();
    parseResponse.mockClear();
    deferreds.length = 0;
    apiGet.mockImplementation((url) => {
      if (url.includes("COM-A") || url.includes("COM-B")) {
        return new Promise((resolve) => {
          deferreds.push({ url, resolve });
        });
      }
      return Promise.resolve({ ok: true, status: 200 });
    });
    parseResponse.mockImplementation(async (res) => res?.payload ?? {});
    apiPost.mockResolvedValue({ ok: true, status: 200, payload: { advisory: { advisory: "Proceed with Caution" } } });
  });

  it("does not start commodity B requests until every commodity A prefetch has settled", async () => {
    const client = new QueryClient();
    client.setQueryData(["farmer", "profile"], { preferred_crops: ["COM-A", "COM-B"] });
    client.setQueryData(["prices", "list"], {
      items: [{ commodity_id: "COM-A" }, { commodity_id: "COM-B" }],
    });

    const promise = prefetchFarmerFullData(client);

    // All of commodity A's queryFns are dispatched before any of them settles,
    // so the expected count here is deterministic.
    await vi.waitFor(() => {
      expect(aDeferreds()).toHaveLength(EXPECTED_PER_COMMODITY);
    });
    expect(bDeferreds()).toHaveLength(0);

    aDeferreds().forEach((d) => d.resolve({ ok: true, status: 200 }));

    await vi.waitFor(() => {
      expect(bDeferreds()).toHaveLength(EXPECTED_PER_COMMODITY);
    });

    bDeferreds().forEach((d) => d.resolve({ ok: true, status: 200 }));
    await promise;

    expect(aDeferreds()).toHaveLength(EXPECTED_PER_COMMODITY);
    expect(bDeferreds()).toHaveLength(EXPECTED_PER_COMMODITY);
  });

  it("uses the persisted commodity catalog while offline", async () => {
    const client = new QueryClient();
    const catalog = [{ id: "COM-0001", name: "Ampalaya", varieties: ["Galaxy"] }];
    client.setQueryData(["farmer", "commodities"], catalog);

    await loadFarmerCommodities(client);

    expect(client.getQueryData(["farmer", "commodities"])).toEqual(catalog);
    expect(apiGet).not.toHaveBeenCalledWith("/farmer/commodities");
  });

  it("refreshes the canonical Top-10 price list used by assessment", async () => {
    const client = new QueryClient();
    apiGet.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      payload: { items: [{ commodity_id: "COM-0001", is_top10: true, name: "Ampalaya" }] },
    }));

    await loadFarmerPrices(client);

    expect(client.getQueryData(["prices", "list"])).toEqual({
      items: [{ commodity_id: "COM-0001", is_top10: true, name: "Ampalaya" }],
    });
  });

  it("prefetches each saved crop advisory under the detail-page query key", async () => {
    const client = new QueryClient();
    const crop = {
      id: "CRP-001",
      commodityName: "Chinese Pechay",
      phase: "planning",
      rawPlantingDate: "2026-12-03",
      rawHarvestDate: "2027-02-06",
      totalCost: 100000,
      harvestQuantity: 25000,
      farmgatePrice: 20,
    };

    await prefetchFarmerPlanAdvisories(client, [crop]);

    expect(apiPost).toHaveBeenCalledWith("/advisory/plan", {
      crop_name: "Chinese Pechay",
      planting_date: "2026-12-03",
      expected_harvest_date: "2027-02-06",
      total_production_cost: 100000,
      expected_yield_kg: 25000,
      estimated_selling_price: 20,
      crop_stage: "before_planting",
    });
    expect(client.getQueryData([
      "advisory", "plan", "v2", "CRP-001", "Chinese Pechay",
      "2026-12-03", "2027-02-06", 100000, 25000, "before_planting",
    ])).toEqual({ advisory: { advisory: "Proceed with Caution" } });
  });

  it("prefetches a planning advisory before a yield is entered", async () => {
    const client = new QueryClient();
    const crop = {
      id: "CRP-PLANNING",
      commodityName: "Tomato",
      phase: "planning",
      status: "Planning",
      rawPlantingDate: "2026-12-03",
      rawHarvestDate: "2027-02-06",
      totalCost: 100000,
      harvestQuantity: 0,
      farmgatePrice: null,
    };

    await prefetchFarmerPlanAdvisories(client, [crop]);

    expect(apiPost).toHaveBeenCalledWith("/advisory/plan", expect.objectContaining({
      crop_name: "Tomato",
      expected_yield_kg: 1,
      crop_stage: "before_planting",
    }));
    expect(client.getQueryData([
      "advisory", "plan", "v2", "CRP-PLANNING", "Tomato",
      "2026-12-03", "2027-02-06", 100000, 1, "before_planting",
    ])).toEqual({ advisory: { advisory: "Proceed with Caution" } });
  });
});
