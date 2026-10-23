import { createContext, useContext, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, parseResponse } from "../../../global/api";
import { toCamelCase } from "../../../global/utils/apiTransforms";
import { parseLocalDate } from "../../utils/formatters";
import { useAuth } from "../../../global/contexts/AuthContext";

const CropsContext = createContext(null);

/**
 * "Sep 27, 2026" from an API date, timezone-safe.
 *
 * `new Date("2026-09-27")` parses as UTC midnight, which renders as the previous
 * day for viewers at or west of UTC — so a plan dated the 27th would display as
 * the 26th. See parseLocalDate.
 */
export function formatLocalDate(isoDate) {
  const parsed = parseLocalDate(isoDate);
  if (!parsed) return null;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_TO_PHASE = {
  Draft: "draft",
  Planning: "planning",
  Planted: "growing",
  "Pre-Harvest": "pre-harvest",
  Harvesting: "harvested",
  "On Hold": "planning",
  Completed: "completed",
  Cancelled: "completed",
};

export function normalizeCropPlan(raw, pricesMap) {
  if (!raw) return null;
  const item = toCamelCase(raw);
  const rawStatus = item.status || "Planning";
  const phase = STATUS_TO_PHASE[rawStatus] || "planning";
  const commodity = item.commodity || {};
  const commodityName = commodity.name || item.commodityName || item.cropName || "";
  const variant = commodity.variety || item.variety || item.variant || null;
  const commodityId = item.commodityId || commodity.id || (typeof item.commodity === "string" ? item.commodity : "") || "";

  const rawProductionCosts = Array.isArray(item.productionCosts) ? item.productionCosts : [];
  const productionCosts = rawProductionCosts.map((c, i) => ({
    id: c.id || String(i + 1),
    cropPlanId: c.cropPlanId || item.id,
    category: c.category || "Additional",
    amount: Number(c.amount || 0),
    costType: c.costType || c.cost_type || "initial",
    createdAt: c.createdAt || c.created_at || null,
  }));

  const initialCostsList = productionCosts.filter((c) => c.costType !== "additional");
  const additionalCostsList = productionCosts.filter((c) => c.costType === "additional");

  const addedCosts = additionalCostsList.reduce((sum, c) => sum + c.amount, 0);

  let initialCost = 0;
  if (initialCostsList.length > 0) {
    initialCost = initialCostsList.reduce((sum, c) => sum + c.amount, 0);
  } else if (productionCosts.length > 0) {
    initialCost = Math.max(0, productionCosts.reduce((sum, c) => sum + c.amount, 0) - addedCosts);
  } else {
    initialCost = Number(item.productionCost || item.totalCost || 0);
  }

  const totalCost = initialCost + addedCosts;

  const costMethod = item.costEntryMode === "detailed" ? "detailed" : "simple";
  const expenses = (productionCosts || []).map((c, i) => ({
    id: c.id || String(i + 1),
    name: c.category || "Additional",
    amount: Number(c.amount || 0),
    isCustom: true,
  }));
  const farmgatePrice = item.expectedFarmgatePrice != null ? Number(item.expectedFarmgatePrice) : null;

  const qty = item.expectedHarvestQty != null ? Number(item.expectedHarvestQty) : (item.harvestQuantity != null ? Number(item.harvestQuantity) : null);
  const breakEven = (qty && qty > 0 && totalCost > 0)
    ? Math.ceil(totalCost / qty)
    : (item.breakevenPricePerKg != null ? Number(item.breakevenPricePerKg) : (item.breakEvenPrice != null ? Number(item.breakEvenPrice) : null));

  const harvestRecords = Array.isArray(item.harvestRecords) ? item.harvestRecords : [];
  const latestHarvest = harvestRecords[0] || null;
  const actualHarvestQty = latestHarvest
    ? Number(latestHarvest.actualHarvestQty)
    : item.actualHarvestQty != null
      ? Number(item.actualHarvestQty)
      : null;
  const actualSellingPrice = latestHarvest
    ? Number(latestHarvest.actualSellingPricePerKg)
    : item.actualSellingPrice != null
      ? Number(item.actualSellingPrice)
      : null;

  const pMap = pricesMap instanceof Map ? pricesMap : null;
  const priceEntry = pMap
    ? (pMap.get(commodityId)
       || pMap.get(`${(commodityName || "").toLowerCase().trim()}_${(variant || "").toLowerCase().trim()}`)
       || pMap.get((commodityName || "").toLowerCase().trim())
       || pMap.get((item.baseName || "").toLowerCase().trim()))
    : null;
  const currentPrice = item.currentPrice != null
    ? Number(item.currentPrice)
    : (priceEntry?.price != null ? Number(priceEntry.price) : null);

  let profitLower = Number(item.profitLower || 0);
  let profitUpper = Number(item.profitUpper || 0);

  // If user did not enter a farmgate price (or profit is 0), estimate profit from benchmark market price
  const sellingBasis = farmgatePrice != null ? farmgatePrice : currentPrice;
  if ((profitLower <= 0 || profitUpper <= 0) && sellingBasis != null && breakEven != null && qty != null && qty > 0) {
    const margin = sellingBasis - breakEven;
    if (margin > 0) {
      profitLower = Math.floor(margin * qty * 0.85 / 1e3) * 1e3;
      profitUpper = Math.ceil(margin * qty * 1.1 / 1e3) * 1e3;
    }
  }

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
    holdDate: formatLocalDate(item.updatedAt),
    plantingDate: formatLocalDate(item.actualPlantingDate || item.plannedPlantingDate),
    harvestDate: formatLocalDate(item.expectedHarvestDate),
    expectedHarvestDate: item.expectedHarvestDate || null,
    rawPlantingDate: item.actualPlantingDate || item.plannedPlantingDate || null,
    rawHarvestDate: item.expectedHarvestDate || null,
    farmArea: item.farmArea || null,
    farmAreaUnit: "sqm",
    harvestQuantity: qty,
    expectedHarvestQty: qty,
    harvestRecords,
    actualHarvestDate: latestHarvest
      ? new Date(latestHarvest.actualHarvestDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : item.actualHarvestDate || null,
    actualHarvestQty,
    actualSellingPrice,
    costMethod,
    expenses,
    farmgatePrice,
    totalCost,
    initialCost,
    addedCosts,
    productionCosts,
    productionCost: totalCost,
    breakEvenPrice: breakEven,
    breakevenPricePerKg: breakEven,
    currentPrice,
    forecastLower: item.forecastLower || null,
    forecastUpper: item.forecastUpper || null,
    profitLower,
    profitUpper,
    nextMilestone:
      rawStatus === "Completed"
        ? "Crop cycle completed"
        : rawStatus === "On Hold"
          ? "Resume when market conditions improve"
          : item.nextMilestone || null,
    advisoryCategory: item.advisoryCategory || item.advisory || item.advisory_category || null,
    advisory: item.advisory || item.advisoryCategory || item.advisory_category || null,
    notes: item.notes || (Array.isArray(item.cropCalendarEntries) ? item.cropCalendarEntries.find((e) => e.notes)?.notes : null) || null,
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

export function buildPricesMap(priceItems = []) {
  const map = new Map();
  priceItems.forEach(rawItem => {
    const item = toCamelCase(rawItem);
    const p = item.prices || {};
    const price = p.bangkerohanRetail ?? p.dftcRetail ?? p.bangkerohanWholesale ?? p.dftcWholesale ?? null;
    if (price == null) return;

    if (item.commodityId) {
      map.set(item.commodityId, { price: Number(price), uom: item.unitOfMeasure || 'kg' });
    }
    const name = (item.name || "").toLowerCase().trim();
    const baseName = (item.baseName || "").toLowerCase().trim();
    const variety = (item.variety || "").toLowerCase().trim();
    if (name && variety) {
      map.set(`${name}_${variety}`, { price: Number(price), uom: item.unitOfMeasure || 'kg' });
    }
    if (baseName && variety) {
      map.set(`${baseName}_${variety}`, { price: Number(price), uom: item.unitOfMeasure || 'kg' });
    }
    if (name && !map.has(name)) {
      map.set(name, { price: Number(price), uom: item.unitOfMeasure || 'kg' });
    }
    if (baseName && !map.has(baseName)) {
      map.set(baseName, { price: Number(price), uom: item.unitOfMeasure || 'kg' });
    }
  });
  return map;
}

export function transformCropItems(rawItems, pricesMap = new Map()) {
  return rawItems.map(item => normalizeCropPlan(item, pricesMap)).filter(Boolean);
}

const CropsProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: crops = [], isLoading: loading } = useQuery({
    queryKey: ["farmer", "crops"],
    queryFn: async () => {
      const [res, pricesRes] = await Promise.all([
        apiGet("/crop-plans"),
        apiGet("/prices?page_size=100").catch(() => null),
      ]);
      if (!res.ok) return [];
      const data = await parseResponse(res);
      const rawItems = data?.crop_plans || data?.items || (Array.isArray(data) ? data : []);
      const pricesData = pricesRes && pricesRes.ok ? await parseResponse(pricesRes) : null;
      const pricesMap = buildPricesMap(pricesData?.items || []);
      return transformCropItems(rawItems, pricesMap);
    },
    // This provider is mounted above the router, so it runs on /login too.
    // Without a session the request is a guaranteed 401; gating on the user
    // keeps it at 0 requests until login and auto-fetches once enabled flips.
    enabled: Boolean(user?.id),
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
    async (planId, { category = "Additional", amount, costType = "additional" }) => {
      const res = await apiPost(`/crop-plans/${planId}/costs`, {
        category: category || "Additional",
        amount,
        cost_type: costType,
      });
      const data = await parseResponse(res);
      const newCost = toCamelCase(data);
      queryClient.setQueryData(["farmer", "crops"], (old) => {
        if (!old) return old;
        return old.map((c) => {
          if (c.id !== planId) return c;
          const costItem = {
            id: newCost.id || `PDC-tmp-${Date.now()}`,
            cropPlanId: planId,
            category: newCost.category || category || "Additional",
            amount: Number(newCost.amount || amount || 0),
            costType: newCost.costType || costType,
            createdAt: newCost.createdAt || new Date().toISOString(),
          };
          const updatedCosts = [...(c.productionCosts || []), costItem];
          const newAddedCosts = (c.addedCosts || 0) + Number(costItem.amount || 0);
          const initial = c.initialCost != null ? c.initialCost : Math.max(0, (c.totalCost || 0) - (c.addedCosts || 0));
          const newTotal = initial + newAddedCosts;
          const qty = c.harvestQuantity || c.expectedHarvestQty || 1;
          const newBreakEven = qty > 0 ? Math.ceil(newTotal / qty) : c.breakEvenPrice;
          return {
            ...c,
            productionCosts: updatedCosts,
            initialCost: initial,
            addedCosts: newAddedCosts,
            totalCost: newTotal,
            productionCost: newTotal,
            breakEvenPrice: newBreakEven,
            breakevenPricePerKg: newBreakEven,
          };
        });
      });
      await refreshCrops();
      return data;
    },
    [queryClient, refreshCrops]
  );

  const updateCropStatusApi = useCallback(
    async (planId, targetStatus, holdReason = null, extra = {}) => {
      const body = { target_status: targetStatus };
      if (holdReason) body.hold_reason = holdReason;
      if (extra?.additionalCost != null || extra?.additional_cost != null) {
        body.additional_cost = Number(extra.additionalCost ?? extra.additional_cost);
      }
      if (extra?.actualHarvestQty != null || extra?.actual_harvest_qty != null) {
        body.actual_harvest_qty = Number(extra.actualHarvestQty ?? extra.actual_harvest_qty);
      }
      if (extra?.actualHarvestDate != null || extra?.actual_harvest_date != null) {
        body.actual_harvest_date = extra.actualHarvestDate ?? extra.actual_harvest_date;
      }
      if (extra?.actualSellingPricePerKg != null || extra?.actual_selling_price_per_kg != null) {
        body.actual_selling_price_per_kg = Number(extra.actualSellingPricePerKg ?? extra.actual_selling_price_per_kg);
      }
      if (extra?.finalProductionCost != null || extra?.final_production_cost != null) {
        body.final_production_cost = Number(extra.finalProductionCost ?? extra.final_production_cost);
      }
      if (extra?.notes) {
        body.notes = String(extra.notes).trim();
      }
      const res = await apiPut(`/crop-plans/${planId}/status`, body);
      const data = await parseResponse(res);
      await refreshCrops();
      return data;
    },
    [refreshCrops]
  );

  const logHarvestApi = useCallback(
    async (planId, harvestDate, harvestQty, sellingPricePerKg = null, extra = {}) => {
      const payload = {
        actual_harvest_date: harvestDate,
        actual_harvest_qty: harvestQty,
        actual_selling_price_per_kg: sellingPricePerKg,
      };
      if (extra?.finalProductionCost != null || extra?.final_production_cost != null) {
        payload.final_production_cost = Number(extra.finalProductionCost ?? extra.final_production_cost);
      }
      if (extra?.notes) {
        payload.notes = String(extra.notes).trim();
      }
      const res = await apiPost(`/crop-plans/${planId}/harvest`, payload);
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
