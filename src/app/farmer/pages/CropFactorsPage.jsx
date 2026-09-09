import { useParams, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCrops } from "../components/crops/CropsContext";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import { FactorDetailTabs, buildPricePoints } from "../components/shared/FactorDetailTabs";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { getPhaseConfig } from "../components/crops/types";
import { normalizePhaseCode, PHASE_CODES, normalizePriceTrendCode } from "../utils/farmerCodes";
import { apiGet, apiPost, parseResponse } from "../../global/api";

function CropFactorsPage() {
  const { cropId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { crops } = useCrops();
  const queryClient = useQueryClient();

  const crop = crops.find((c) => c.id === cropId);
  if (!crop) {
    return (
      <div className="px-4 py-8 text-center space-y-3">
        <p className="text-[var(--hw-neutral-900)]">{t("farmer.empty.crop_not_found", {}, "Crop not found.")}</p>
        <button onClick={() => navigate("/farmer/crops")} className="text-sm font-medium text-[var(--hw-green-700)]">
          {t("farmer.crops.title", {}, "Go to My Crops")}
        </button>
      </div>
    );
  }

  const updatedTotalCost = crop.totalCost || 0;
  const qty = crop.harvestQuantity > 0 ? crop.harvestQuantity : 0;
  const canQueryPlan = Boolean(crop.commodityName && crop.plantingDate && crop.harvestDate && updatedTotalCost > 0 && qty > 0);

  const { data: planAdvisoryData } = useQuery({
    queryKey: ["advisory", "plan", crop.id, crop.commodityName, crop.plantingDate, crop.harvestDate, updatedTotalCost, qty],
    queryFn: async () => {
      try {
        const pDate = new Date(crop.plantingDate);
        const hDate = new Date(crop.harvestDate);
        const pDateStr = !isNaN(pDate.getTime()) ? pDate.toISOString().split("T")[0] : crop.plantingDate;
        const hDateStr = !isNaN(hDate.getTime()) ? hDate.toISOString().split("T")[0] : crop.harvestDate;
        const payload = {
          crop_name: crop.commodityName,
          planting_date: pDateStr,
          expected_harvest_date: hDateStr,
          total_production_cost: updatedTotalCost,
          expected_yield_kg: qty,
        };
        const res = await apiPost("/advisory/plan", payload);
        if (!res.ok) return null;
        return await parseResponse(res);
      } catch {
        return null;
      }
    },
    enabled: canQueryPlan,
    staleTime: 1000 * 60 * 15,
  });

  const DEFAULT_WEATHER_LAT = 7.0722;
  const DEFAULT_WEATHER_LON = 125.6131;
  const profile = queryClient.getQueryData(["dashboard", "profile"]);
  const weatherLat = profile?.latitude ?? DEFAULT_WEATHER_LAT;
  const weatherLon = profile?.longitude ?? DEFAULT_WEATHER_LON;

  const { data: weatherAdvisoryData } = useQuery({
    queryKey: ["weather", "advisory", weatherLat, weatherLon],
    queryFn: async () => {
      try {
        const response = await apiGet(`/weather/advisory?latitude=${weatherLat}&longitude=${weatherLon}`);
        if (!response.ok) return null;
        return await parseResponse(response);
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 30,
  });

  const commodityIdentifier = crop.commodityId || crop.commodity;
  const { data: productionFactorData } = useQuery({
    queryKey: ["factors", "production", commodityIdentifier],
    queryFn: async () => {
      try {
        const res = await apiGet(`/market/factors/production/${commodityIdentifier}`);
        if (!res.ok) return null;
        return await parseResponse(res);
      } catch {
        return null;
      }
    },
    enabled: Boolean(commodityIdentifier),
    staleTime: 1000 * 60 * 30,
  });

  const currentPrice = crop.currentPrice || planAdvisoryData?.module_results?.recent_average_price || null;
  const fLo = crop.forecastLower || planAdvisoryData?.module_results?.lower_forecast_price || null;
  const fHi = crop.forecastUpper || planAdvisoryData?.module_results?.upper_forecast_price || null;
  const forecastMid = fLo != null && fHi != null ? (fLo + fHi) / 2 : (planAdvisoryData?.module_results?.forecast_midpoint || null);
  const phaseCode = normalizePhaseCode(crop.phase);
  const useForecast = [PHASE_CODES.PLANNING, PHASE_CODES.GROWING, PHASE_CODES.ON_HOLD].includes(phaseCode);
  const basePrice = useForecast ? (forecastMid || currentPrice) : currentPrice;
  const costToRecover = qty > 0 && updatedTotalCost > 0 ? Math.ceil(updatedTotalCost / qty) : null;
  const sellingBasis = basePrice;
  const margin = sellingBasis != null && costToRecover != null ? sellingBasis - costToRecover : null;
  const priceDir = planAdvisoryData?.module_results?.price_outlook
    ? normalizePriceTrendCode(planAdvisoryData.module_results.price_outlook)
    : margin != null && margin > 15
    ? "rising"
    : margin != null && margin > 0
    ? "stable"
    : "falling";

  const priceTabData = {
    currentPrice: basePrice,
    previousPrice: currentPrice || basePrice,
    market: useForecast ? t("farmer.factors.profitability.forecast_price_reference", {}, "Forecasted price reference") : "Bangkerohan Retail",
    direction: priceDir,
    forecastLow: fLo,
    forecastHigh: fHi,
    forecastRange: fLo != null && fHi != null ? `₱${fLo}–₱${fHi}/kg` : null,
    points: basePrice ? buildPricePoints([], basePrice, priceDir, fLo || basePrice, fHi || basePrice, 7) : [],
  };

  const arrivalTabData = {
    arrivalPressure: planAdvisoryData?.module_results?.arrival_pressure || null,
    currentVolumeKg: planAdvisoryData?.module_results?.current_arrival_kg || null,
    commodityId: commodityIdentifier,
    commodityName: crop.commodityName,
  };

  const productionTabData = {
    productionLevel: planAdvisoryData?.module_results?.historical_seasonal_production_level || null,
    records: productionFactorData?.records || [],
    commodityId: commodityIdentifier,
    commodityName: crop.commodityName,
  };

  const cropWeatherAdv = (weatherAdvisoryData?.advisories || []).find(
    (a) => a.commodity_name?.toLowerCase() === crop.commodityName?.toLowerCase() || a.commodity_id === commodityIdentifier
  );
  const weatherRisk = planAdvisoryData?.module_results?.weather_risk || cropWeatherAdv?.suitability || null;
  const weatherTabData = {
    risk: weatherRisk,
    forecast_14d: weatherAdvisoryData?.daily_forecasts || [],
    commodityName: crop.commodityName,
    actions: cropWeatherAdv?.recommended_actions || (planAdvisoryData?.module_results?.weather_advisory ? [planAdvisoryData.module_results.weather_advisory] : []),
    why: cropWeatherAdv?.explanation || "",
  };

  const hasProfitabilityData = Boolean(costToRecover != null && costToRecover > 0 && sellingBasis != null && sellingBasis > 0 && qty > 0);
  const profitabilityData = hasProfitabilityData
    ? {
        costPerKg: costToRecover,
        sellingPricePerKg: sellingBasis,
        profitPerKg: margin != null ? margin : 0,
        totalCost: updatedTotalCost,
        harvestQty: qty,
        expenses: crop.expenses || (crop.costMethod === "detailed" ? crop.expenses : null),
        level: planAdvisoryData?.module_results?.profitability || null,
      }
    : null;

  const phaseConfig = crop.phase ? getPhaseConfig(crop.phase) : null;
  const phaseLabel = phaseConfig ? t(phaseConfig.labelKey, {}, crop.phase) : null;

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: t("farmer.crops.title", {}, "My Crops"), onClick: () => navigate("/farmer/crops") },
          { label: crop.commodityName, onClick: () => navigate(`/farmer/crops/${crop.id}`) },
          { label: t("farmer.advisory.detailed_factors_title", {}, "Detailed Factors") },
        ]}
      />

      {/* Page title */}
      <div>
        <h1 className="text-[20px] font-bold text-[var(--hw-neutral-900)]">
          {crop.commodityName} — {t("farmer.advisory.detailed_factors_title", {}, "Detailed Factors")}
        </h1>
        <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">
          {t("farmer.advisory.market_analysis_crop_plan", {}, "Market analysis for your crop plan")}
          {phaseLabel ? ` · ${phaseLabel}` : ""}
        </p>
      </div>

      {/* Factor tabs */}
      <FactorDetailTabs
        price={priceTabData}
        arrival={arrivalTabData}
        production={productionTabData}
        weather={weatherTabData}
        profitability={profitabilityData}
        defaultTab="price"
        commodityId={commodityIdentifier}
        commodityName={crop.commodityName}
      />

      {/* Bottom action */}
      <button
        onClick={() => navigate(`/farmer/assess?commodity=${commodityIdentifier}`)}
        className="w-full flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-3 rounded-xl text-[14px] font-semibold hover:bg-[var(--hw-green-800)] transition-colors"
      >
        {t("farmer.advisory.assess_crop_again", {}, "Assess this crop again")}
      </button>
    </div>
  );
}

export default CropFactorsPage;

