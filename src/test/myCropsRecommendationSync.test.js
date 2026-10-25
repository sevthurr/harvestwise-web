import { describe, expect, it, vi } from "vitest";

vi.mock("../app/global/api", () => ({
  apiGet: vi.fn(),
  parseResponse: vi.fn(),
}));

import { apiGet, parseResponse } from "../app/global/api";
import { syncFarmerRecommendations } from "../app/farmer/pages/MyCrops";

describe("syncFarmerRecommendations", () => {
  it("calls the farmer suitability endpoint and returns its payload", async () => {
    const payload = { crops: [] };
    apiGet.mockResolvedValue({ ok: true, status: 200 });
    parseResponse.mockResolvedValue(payload);

    await expect(syncFarmerRecommendations()).resolves.toEqual(payload);
    expect(apiGet).toHaveBeenCalledWith("/farmer/planting-suitability");
  });

  it("fails without affecting the page when the sync endpoint rejects", async () => {
    apiGet.mockResolvedValue({ ok: false, status: 503 });

    await expect(syncFarmerRecommendations()).rejects.toThrow("503");
  });
});
