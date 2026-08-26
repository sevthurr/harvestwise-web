import { createContext, useContext, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, parseResponse } from "../../../global/api";
import { toCamelCase } from "../../../global/utils/apiTransforms";

const CropsContext = createContext(null);

const STATUS_TO_PHASE = {
  Draft: "planning",
  Planning: "planning",
  Planted: "growing",
  "Pre-Harvest": "pre-harvest",
  Harvesting: "harvested",
  "On Hold": "planning",
  Completed: "completed",
  Cancelled: "completed",
};

function transformCropItems(rawItems) {
  return rawItems.map((c) => {
    const item = toCamelCase(c);
    const rawStatus = item.status || "Planning";
    const phase = STATUS_TO_PHASE[rawStatus] || "planning";
    const commodity = item.commodity || {};
    return {
      id: item.id,
      commodity: item.commodityId || commodity.id || "",
      commodityName: commodity.name || item.commodityName || "\u2013",
      variant: commodity.variety || item.variety || null,
      phase: rawStatus === "On Hold" ? "planning" : phase,
      status: rawStatus,
      isOnHold: rawStatus === "On Hold",
      holdReason: item.holdReason || null,
      holdDate: item.updatedAt
        ? new Date(item.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : null,
      plantingDate: item.actualPlantingDate
        ? new Date(item.actualPlantingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : item.plannedPlantingDate
          ? new Date(item.plannedPlantingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : null,
      harvestDate: item.expectedHarvestDate
        ? new Date(item.expectedHarvestDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : null,
      farmArea: item.farmArea || null,
      farmAreaUnit: "sqm",
      harvestQuantity: item.expectedHarvestQty || null,
      totalCost: item.productionCost || item.totalCost || 0,
      breakEvenPrice: item.breakevenPricePerKg || item.breakevenPrice || null,
      currentPrice: item.currentPrice || null,
      nextMilestone:
        rawStatus === "Completed"
          ? "Crop cycle completed"
          : rawStatus === "On Hold"
            ? "Resume when market conditions improve"
            : item.nextMilestone || null,
      lastUpdated: item.updatedAt
        ? new Date(item.updatedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
          })
        : null,
    };
  });
}

const CropsProvider = ({ children }) => {
  const queryClient = useQueryClient();

  const { data: crops = [], isLoading: loading } = useQuery({
    queryKey: ["farmer", "crops"],
    queryFn: async () => {
      const res = await apiGet("/crop-plans");
      if (!res.ok) return [];
      const data = await parseResponse(res);
      const rawItems = data?.crop_plans || data?.items || (Array.isArray(data) ? data : []);
      return transformCropItems(rawItems);
    },
    staleTime: 1000 * 60 * 30,
    refetchOnMount: true,
  });

  const addCrop = useCallback(
    (crop) => {
      queryClient.setQueryData(["farmer", "crops"], (old) => [crop, ...(old || [])]);
      queryClient.invalidateQueries({ queryKey: ["farmer", "crops"] });
    },
    [queryClient]
  );

  const updateCrop = useCallback(
    (id, patch) => {
      queryClient.setQueryData(["farmer", "crops"], (old) =>
        (old || []).map((r) => (r.id === id ? { ...r, ...patch } : r))
      );
    },
    [queryClient]
  );

  const refreshCrops = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ["farmer", "crops"] });
  }, [queryClient]);

  const addCostApi = useCallback(
    async (planId, { category, amount, costType = "additional" }) => {
      const res = await apiPost(`/crop-plans/${planId}/costs`, {
        category,
        amount,
        cost_type: costType,
      });
      const data = await parseResponse(res);
      await refreshCrops();
      return data;
    },
    [refreshCrops]
  );

  const updateCropStatusApi = useCallback(
    async (planId, targetStatus, holdReason = null) => {
      const body = { target_status: targetStatus };
      if (holdReason) body.hold_reason = holdReason;
      const res = await apiPut(`/crop-plans/${planId}/status`, body);
      const data = await parseResponse(res);
      await refreshCrops();
      return data;
    },
    [refreshCrops]
  );

  const logHarvestApi = useCallback(
    async (planId, harvestDate, harvestQty, sellingPricePerKg = null) => {
      const res = await apiPost(`/crop-plans/${planId}/harvest`, {
        actual_harvest_date: harvestDate,
        actual_harvest_qty: harvestQty,
        actual_selling_price_per_kg: sellingPricePerKg,
      });
      const data = await parseResponse(res);
      await refreshCrops();
      return data;
    },
    [refreshCrops]
  );

  return (
    <CropsContext.Provider value={{ crops, addCrop, updateCrop, loading, refreshCrops, addCostApi, updateCropStatusApi, logHarvestApi }}>
      {children}
    </CropsContext.Provider>
  );
};

const useCrops = () => {
  const ctx = useContext(CropsContext);
  if (!ctx) throw new Error("useCrops must be used inside CropsProvider");
  return ctx;
};

export { CropsProvider, useCrops };
