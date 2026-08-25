import { createContext, useContext, useState, useEffect } from "react";
import { apiGet, parseResponse } from "../../../global/api";

function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    acc[camelKey] = toCamelCase(obj[key]);
    return acc;
  }, {});
}

const CropsContext = createContext(null);

const CropsProvider = ({ children }) => {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCrops = async () => {
    try {
      setLoading(true);
      const res = await apiGet('/crop-plans');
      if (res.ok) {
        const data = await parseResponse(res);
        const rawItems = data?.crop_plans || data?.items || (Array.isArray(data) ? data : []);
        const transformed = rawItems.map((c) => {
          const item = toCamelCase(c);
          const rawStatus = item.status || 'Planning';
          const phase = rawStatus.toLowerCase().replace(/\s+/g, '-');
          return {
            id: item.id,
            commodity: item.commodityId || (item.commodity?.name ? item.commodity.name.toLowerCase() : ''),
            commodityName: item.commodityName || item.commodity?.name || '–',
            variant: item.variety || item.commodity?.variety || null,
            phase: phase === 'on-hold' ? 'planning' : phase,
            status: rawStatus,
            isOnHold: rawStatus === 'On Hold',
            holdReason: item.holdReason || null,
            holdDate: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
            plantingDate: item.actualPlantingDate ? new Date(item.actualPlantingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (item.plannedPlantingDate ? new Date(item.plannedPlantingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null),
            harvestDate: item.expectedHarvestDate ? new Date(item.expectedHarvestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
            farmArea: item.farmArea || null,
            farmAreaUnit: 'sqm',
            harvestQuantity: item.expectedHarvestQty || null,
            totalCost: item.productionCost || item.totalCost || 0,
            breakEvenPrice: item.breakevenPricePerKg || item.breakevenPrice || null,
            currentPrice: item.currentPrice || null,
            nextMilestone: rawStatus === 'Completed' ? 'Crop cycle completed' : rawStatus === 'On Hold' ? 'Resume when market conditions improve' : (item.nextMilestone || null),
            lastUpdated: item.updatedAt ? new Date(item.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' }) : null
          };
        });
        setCrops(transformed);
      } else {
        setCrops([]);
      }
    } catch (err) {
      console.warn("Failed to fetch crop plans:", err);
      setCrops([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrops();
  }, []);

  const addCrop = (crop) => setCrops((c) => [crop, ...c]);
  const updateCrop = (id, patch) => setCrops((c) => c.map((r) => r.id === id ? { ...r, ...patch } : r));

  return (
    <CropsContext.Provider value={{ crops, setCrops, addCrop, updateCrop, loading, refreshCrops: fetchCrops }}>
      {children}
    </CropsContext.Provider>
  );
};

const useCrops = () => {
  const ctx = useContext(CropsContext);
  if (!ctx) throw new Error("useCrops must be used inside CropsProvider");
  return ctx;
};

export {
  CropsProvider,
  useCrops
};
