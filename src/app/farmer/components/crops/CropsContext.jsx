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

export function normalizeCropPlan(raw) {
  if (!raw) return null;
  const item = toCamelCase(raw);
  const rawStatus = item.status || "Planning";
  const phase = STATUS_TO_PHASE[rawStatus] || "planning";
  const commodity = item.commodity || {};
  const commodityName = commodity.name || item.commodityName || item.cropName || "";
  const variant = commodity.variety || item.variety || item.variant || null;
  const commodityId = item.commodityId || commodity.id || (typeof item.commodity === "string" ? item.commodity : "") || "";

  const productionCosts = Array.isArray(item.productionCosts) ? item.productionCosts : [];
  const totalCost = productionCosts.length > 0
    ? productionCosts.reduce((sum, c) => sum + Number(c.amount || 0), 0)
    : Number(item.productionCost || item.totalCost || 0);

  const qty = item.expectedHarvestQty != null ? Number(item.expectedHarvestQty) : (item.harvestQuantity != null ? Number(item.harvestQuantity) : null);
  const breakEven = (qty && qty > 0 && totalCost > 0)
    ? Math.ceil(totalCost / qty)
    : (item.breakevenPricePerKg != null ? Number(item.breakevenPricePerKg) : (item.breakEvenPrice != null ? Number(item.breakEvenPrice) : null));

  return {
    id: item.id,
    commodity: commodityId,
    commodityId,
    commodityName: commodityName || "\u2013",
    variant,
    variety: variant,
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
    rawPlantingDate: item.actualPlantingDate || item.plannedPlantingDate || null,
    rawHarvestDate: item.expectedHarvestDate || null,
    farmArea: item.farmArea || null,
    farmAreaUnit: "sqm",
    harvestQuantity: qty,
    expectedHarvestQty: qty,
    totalCost,
    productionCost: totalCost,
    breakEvenPrice: breakEven,
    breakevenPricePerKg: breakEven,
    currentPrice: item.currentPrice || null,
    forecastLower: item.forecastLower || null,
    forecastUpper: item.forecastUpper || null,
    profitLower: item.profitLower || 0,
    profitUpper: item.profitUpper || 0,
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
}

function transformCropItems(rawItems) {
  return rawItems.map(normalizeCropPlan).filter(Boolean);
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
