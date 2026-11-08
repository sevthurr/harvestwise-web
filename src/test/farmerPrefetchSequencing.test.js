import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

const { apiGet, parseResponse } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  parseResponse: vi.fn(),
}));

vi.mock("../app/global/api", () => ({ apiGet, parseResponse }));

import {
  prefetchFarmerFullData,
  FARMER_PRICE_TYPES,
  FARMER_PRICE_HORIZONS,
} from "../app/global/hooks/useFarmerPrefetch";

const EXPECTED_PER_COMMODITY =
  FARMER_PRICE_TYPES.length * (FARMER_PRICE_HORIZONS.length * 2 + 1 + 2) + 1 + 4 + 1;

describe("farmer prefetch commodity sequencing", () => {
  const deferreds = [];
  const aDeferreds = () => deferreds.filter((d) => d.url.includes("COM-A"));
  const bDeferreds = () => deferreds.filter((d) => d.url.includes("COM-B"));

  beforeEach(() => {
    apiGet.mockClear();
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
});
