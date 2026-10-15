import { useParams, useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useCrops } from "../components/crops/CropsContext";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import { FactorDetailTabs } from "../components/shared/FactorDetailTabs";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { getPhaseConfig } from "../components/crops/types";
import { normalizePhaseCode, PHASE_CODES } from "../utils/farmerCodes";
import { apiPost, parseResponse } from "../../global/api";
import * as analyticsApi from "../../../services/api/analyticsApi";
import { buildWeatherRiskAnalysis } from "../../global/utils/weatherRiskAnalysis";

function quarterForDate(value) {
  const date = value ? new Date(`${String(value).slice(0, 10)}T12:00:00`) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return `Q${Math.floor(validDate.getMonth() / 3) + 1}`;
}

function CropFactorsPage() {
  const { cropId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "price";
  const { t } = useLanguage();
  const { crops } = useCrops();
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

  const commodityIdentifier = crop.commodityId || crop.commodity;
  const selectedQuarter = quarterForDate(crop.harvestDate || crop.plantingDate);
  const arrivalPressureQuery = useQuery({
    queryKey: ["farmer", "arrival-pressure", commodityIdentifier],
    queryFn: () => analyticsApi.getArrivalPressure(commodityIdentifier),
    enabled: Boolean(commodityIdentifier),
    staleTime: 1000 * 60 * 5,
  });
  const seasonalProductionQuery = useQuery({
    queryKey: ["farmer", "seasonal-production", commodityIdentifier, selectedQuarter],
    queryFn: () => analyticsApi.getHistoricalSeasonalProduction(commodityIdentifier, selectedQuarter),
    enabled: Boolean(commodityIdentifier),
    staleTime: 1000 * 60 * 30,
  });
  const weatherForecastQuery = useQuery({
    queryKey: ["farmer", "admin-weather-forecast", 14],
    queryFn: () => analyticsApi.getWeatherForecast(14),
    staleTime: 1000 * 60 * 30,
  });
  const weatherRulesQuery = useQuery({
    queryKey: ["farmer", "weather-rules", commodityIdentifier],
    queryFn: () => analyticsApi.listWeatherRules(commodityIdentifier),
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
  const farmgatePrice = crop.farmgatePrice != null && crop.farmgatePrice > 0 ? crop.farmgatePrice : null;
  const sellingBasis = farmgatePrice ?? basePrice;
  const margin = sellingBasis != null && costToRecover != null ? sellingBasis - costToRecover : null;
  const arrivalData = arrivalPressureQuery.data;
  const arrivalTabData = {
    arrivalPressure: arrivalData?.status === "processed" ? arrivalData.classification : null,
    currentVolumeKg: arrivalData?.current_arrival_kg ?? null,
    records: arrivalData?.records || [],
    averageArrivalKg: arrivalData?.average_arrival_kg ?? null,
    quartileThresholds: arrivalData?.quartile_thresholds || null,
    sourceBreakdown: arrivalData?.source_breakdown || {},
    summary: arrivalData?.status === "processed"
      ? `The latest recorded arrival volume is ${arrivalData.current_arrival_kg?.toLocaleString?.() ?? "—"} kg; the historical average is ${arrivalData.average_arrival_kg?.toLocaleString?.() ?? "—"} kg.`
      : arrivalData?.message,
    dataIsStale: arrivalData?.data_is_stale === true,
    commodityId: commodityIdentifier,
    commodityName: crop.commodityName,
  };

  const productionSummary = seasonalProductionQuery.data;
  const selectedProductionProfile = productionSummary?.quarterly_profiles?.find(
    (profile) => profile.quarter === selectedQuarter
  );
  const productionTabData = {
    productionLevel: productionSummary?.status === "processed" ? selectedProductionProfile?.classification : null,
    quarterlyProfiles: productionSummary?.quarterly_profiles || [],
    selectedQuarter,
    grandAverageQuarterlyMt: productionSummary?.grand_average_quarterly_mt ?? null,
    records: productionSummary?.records || [],
    sources: (productionSummary?.source_areas || []).map((area) => ({
      name: area.name,
      value: Number(area.value),
      volumeKg: Number(area.total_production_mt),
    })),
    commodityId: commodityIdentifier,
    commodityName: crop.commodityName,
    dataSource: productionSummary?.record_count > 0 ? { name: productionSummary.commodity_name } : null,
  };

  const weatherAnalysis = buildWeatherRiskAnalysis({
    weatherForecast: weatherForecastQuery.data,
    weatherRules: weatherRulesQuery.data?.items || [],
    commodityName: crop.commodityName,
    weatherLoading: weatherForecastQuery.isLoading || weatherRulesQuery.isLoading,
    weatherError: weatherForecastQuery.error?.message || weatherRulesQuery.error?.message || "",
  });
  const weatherTabData = {
    risk: weatherAnalysis.classification === "Not processed" ? null : weatherAnalysis.classification,
    forecast_14d: weatherAnalysis.forecast_14d,
    commodityName: crop.commodityName,
    actions: [],
    why: weatherAnalysis.resultExplanation,
    summary: weatherAnalysis.resultExplanation,
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
        arrival={arrivalTabData}
        production={productionTabData}
        weather={weatherTabData}
        profitability={profitabilityData}
        defaultTab={defaultTab}
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
