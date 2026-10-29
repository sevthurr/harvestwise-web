import { useParams, useNavigate, useSearchParams, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useCrops } from "../components/crops/CropsContext";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import { FactorDetailTabs } from "../components/shared/FactorDetailTabs";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { getPhaseConfig } from "../components/crops/types";
import { normalizePhaseCode, PHASE_CODES, normalizeAdvisoryCode, ADVISORY_CODES } from "../utils/farmerCodes";
import { apiPost, parseResponse } from "../../global/api";
import * as analyticsApi from "../../../services/api/analyticsApi";
import { buildWeatherRiskAnalysis } from "../../global/utils/weatherRiskAnalysis";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { CheckCircle2, AlertCircle, XCircle, AlertTriangle, AlertOctagon } from "lucide-react";
import { composeAdvisoryBadge } from "../utils/advisoryMessageComposer";

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
  const { t, effectiveLanguage, langCode } = useLanguage();
  const currentLang = effectiveLanguage || langCode || "ceb";
  const location = useLocation();
  const state = location.state;
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

  const explicitStage = crop?.phase ? (
    crop.phase.toLowerCase().includes("plan") ? "before_planting" :
    crop.phase.toLowerCase().includes("grow") || crop.phase.toLowerCase().includes("plant") ? "during_planting" :
    crop.phase.toLowerCase().includes("pre") ? "near_harvest" :
    crop.phase.toLowerCase().includes("harvest") ? "harvest" : null
  ) : null;

  const updatedTotalCost = crop.totalCost || 0;
  const qty = crop.harvestQuantity > 0 ? crop.harvestQuantity : 0;
  const canQueryPlan = Boolean(crop.commodityName && crop.plantingDate && crop.harvestDate && updatedTotalCost > 0 && qty > 0);

  const { data: planAdvisoryData, error: planAdvisoryError } = useQuery({
    queryKey: ["advisory", "plan", "v2", crop.id, crop.commodityName, crop.plantingDate, crop.harvestDate, updatedTotalCost, qty, explicitStage],
    queryFn: async () => {
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
        estimated_selling_price: farmgatePrice,
        crop_stage: explicitStage,
      };
      const res = await apiPost("/advisory/plan", payload);
      if (!res.ok) {
        let detail = `Advisory request failed (${res.status}).`;
        try {
          const errorBody = await res.json();
          if (typeof errorBody?.detail === "string") detail = errorBody.detail;
        } catch {
          // Keep the status-based message when the server does not return JSON.
        }
        throw new Error(detail);
      }
      return await parseResponse(res);
    },
    enabled: canQueryPlan,
    staleTime: 1000 * 60 * 15,
  });
  const effectiveModuleResults = state?.moduleResults || planAdvisoryData?.module_results || {};

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
  const stageRef = planAdvisoryData?.module_results?.reference_price;
  const phaseCode = normalizePhaseCode(crop.phase);
  const resolvedCropStage =
    state?.cropStage ||
    crop.cropStage ||
    crop.stage ||
    explicitStage ||
    planAdvisoryData?.crop_stage ||
    "before_planting";
  const isPlanning = resolvedCropStage === "before_planting" || phaseCode === PHASE_CODES.PLANNING;
  const useForecast = !isPlanning && [PHASE_CODES.GROWING, PHASE_CODES.ON_HOLD].includes(phaseCode);
  const basePrice = isPlanning
    ? (stageRef || currentPrice)
    : (useForecast ? (stageRef || forecastMid || currentPrice) : currentPrice);
  const costToRecover = qty > 0 && updatedTotalCost > 0 ? Math.ceil(updatedTotalCost / qty) : null;
  const farmgatePrice = crop.farmgatePrice != null && crop.farmgatePrice > 0 ? crop.farmgatePrice : null;
  const sellingBasis = farmgatePrice ?? basePrice;
  const margin = sellingBasis != null && costToRecover != null ? sellingBasis - costToRecover : null;
  const arrivalData = arrivalPressureQuery.data;
  const arrivalTabData = {
    arrivalPressure: arrivalData?.status === "processed" ? arrivalData.classification : null,
    currentVolumeKg: arrivalData?.current_arrival_kg ?? null,
    records: (arrivalData?.history_records && arrivalData.history_records.length > 0)
      ? arrivalData.history_records
      : (arrivalData?.records || []),
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
    productionLevel: effectiveModuleResults.historical_seasonal_production_level ||
      (productionSummary?.status === "processed" ? selectedProductionProfile?.classification : null),
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
    lang: currentLang,
  });
  const weatherTabData = {
    risk: effectiveModuleResults.weather_risk ||
      (weatherAnalysis.classification === "Not processed" ? null : weatherAnalysis.classification),
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

  const rawRec =
    state?.advisoryCode ||
    state?.rawAdvisory ||
    state?.planAdvisoryData?.advisory?.advisory ||
    planAdvisoryData?.advisory?.advisory ||
    crop?.advisoryCategory ||
    crop?.advisory ||
    planAdvisoryData?.recommendation ||
    planAdvisoryData?.final_assessment ||
    null;
  const normalizedAdv = normalizeAdvisoryCode(rawRec);

  const isAvoid =
    normalizedAdv === ADVISORY_CODES.AVOID_FOR_NOW ||
    /avoid|risk|unfavorable|ayaw|dili|panganib/i.test(rawRec || "");

  const isCaution =
    !isAvoid &&
    (normalizedAdv === ADVISORY_CODES.PROCEED_WITH_CAUTION ||
     /caution|watch|marginal|bantay|mag-ingat/i.test(rawRec || ""));

  const isRecommended = !isAvoid && !isCaution;

  const effectiveAdvisoryCode = isAvoid
    ? ADVISORY_CODES.AVOID_FOR_NOW
    : isCaution
    ? ADVISORY_CODES.PROCEED_WITH_CAUTION
    : ADVISORY_CODES.RECOMMENDED;

  const badge = composeAdvisoryBadge(effectiveAdvisoryCode, resolvedCropStage);

  const advisoryText =
    state?.advisoryLabel ||
    (rawRec ? t(badge.key) : null) ||
    (isAvoid
      ? t(badge.key, {}, t("farmer.advisory.recommendation_avoid", {}, "Avoid for Now"))
      : isCaution
      ? t("farmer.advisory.labels.proceed_with_caution", {}, t("farmer.advisory.recommendation_caution", {}, "Proceed with Caution"))
      : t("farmer.advisory.labels.recommended", {}, t("farmer.advisory.recommendation_recommended", {}, "Recommended")));

  let statusConfig = {
    Icon: AlertCircle,
    iconColor: "text-red-600",
    textColor: "text-red-700",
  };
  if (isCaution) {
    statusConfig = {
      Icon: AlertTriangle,
      iconColor: "text-amber-500",
      textColor: "text-amber-700",
    };
  } else if (isRecommended) {
    statusConfig = {
      Icon: CheckCircle2,
      iconColor: "text-[var(--hw-green-700)]",
      textColor: "text-[var(--hw-green-800)]",
    };
  }
  const StatusIcon = statusConfig.Icon;

  return (
    <div className="px-2 xs:px-3.5 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-3 sm:space-y-4">
      {planAdvisoryError && <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-[13px] text-amber-800">
        {planAdvisoryError.message}
      </div>}
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: t("farmer.crops.title", {}, "My Crops"), onClick: () => navigate("/farmer/crops") },
          { label: crop.commodityName, onClick: () => navigate(`/farmer/crops/${crop.id}`) },
          { label: t("farmer.advisory.detailed_factors_title", {}, "Detailed Factors") },
        ]}
      />

      {/* Page title & Emphasized Final Advisory */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 pb-1">
        <div className="flex items-center gap-3 min-w-0">
          <CommodityIllustration
            commodityId={commodityIdentifier}
            commodityName={crop.commodityName}
            baseName={crop.commodityName}
            className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-[17px] sm:text-[20px] font-bold text-black leading-tight">
              {crop.commodityName} — {t("farmer.advisory.detailed_factors_title", {}, "Detailed Factors")}
            </h1>
          </div>
        </div>
        {advisoryText && (
          <div className="inline-flex items-center gap-2 self-start sm:self-auto py-1">
            <span className="text-[11px] sm:text-[12px] font-semibold text-black uppercase tracking-wide">
              {t("farmer.advisory.assessment_result_title", {}, "Assessment Result")}:
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[13px] sm:text-[14px] font-bold ${statusConfig.textColor}`}>
              <StatusIcon className={`w-4 h-4 flex-shrink-0 ${statusConfig.iconColor}`} />
              {advisoryText}
            </span>
          </div>
        )}
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
        cropStage={resolvedCropStage}
        plantingDate={state?.plantingDate || crop.rawPlantingDate || crop.plantingDate || planAdvisoryData?.planting_date}
        expectedHarvestDate={state?.expectedHarvestDate || crop.rawHarvestDate || crop.harvestDate || planAdvisoryData?.expected_harvest_date}
        plantingSeason={state?.plantingSeason || crop.plantingSeason || null}
        moduleResults={effectiveModuleResults}
        plantingWindowStart={state?.plantingWindowStart || planAdvisoryData?.planting_window_start}
        plantingWindowEnd={state?.plantingWindowEnd || planAdvisoryData?.planting_window_end}
        plantingWindowLabel={state?.plantingWindowLabel || planAdvisoryData?.planting_window_label}
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
