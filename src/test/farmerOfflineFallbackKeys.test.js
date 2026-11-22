import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

const { apiGet, parseResponse } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  parseResponse: vi.fn(),
}));

vi.mock("../app/global/api", () => ({ apiGet, parseResponse }));

import { prefetchFarmerOfflineData, monthlyRecommendationsKey } from "../app/global/hooks/useFarmerPrefetch";

describe("farmer offline fallback cache keys", () => {
  beforeEach(() => {
    apiGet.mockReset();
    parseResponse.mockReset();
    apiGet.mockResolvedValue({ ok: true, status: 200 });
    parseResponse.mockImplementation(async (response) => response?.payload ?? { items: [] });
  });

  it("seeds the keys used by calendar and recommendation pages", async () => {
    const recommendations = { items: [{ commodity_id: "COM-1" }] };
    apiGet.mockImplementation(async (url) => ({
      ok: true,
      status: 200,
      payload: url.includes("monthly-recommendations")
        ? recommendations
        : url.includes("market/calendar")
          ? { items: [{ id: "EVENT-1" }] }
          : {},
    }));

    const client = new QueryClient();
    await prefetchFarmerOfflineData(client);

    expect(client.getQueryData(["marketCalendar", "v2"])).toEqual([{ id: "EVENT-1" }]);
    expect(client.getQueryData(monthlyRecommendationsKey())).toEqual(recommendations);
  });
});
