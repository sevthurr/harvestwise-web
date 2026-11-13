import { describe, expect, it } from "vitest";
import {
  FARMER_DATA_SYNC_SCOPES,
  farmerDataSyncScopes,
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
