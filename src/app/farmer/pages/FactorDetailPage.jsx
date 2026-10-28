import { useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import { FactorDetailTabs } from "../components/shared/FactorDetailTabs";
import { useLanguage } from "../../global/contexts/LanguageContext";
import * as analyticsApi from "../../../services/api/analyticsApi";
import * as pricesApi from "../../../services/api/pricesApi";
import { buildWeatherRiskAnalysis } from "../../global/utils/weatherRiskAnalysis";
import { catalogPairsFromPriceList, findCommodityId } from "../../global/utils/priceChartTransforms";
import { fetchPricesList, STALE_TIME } from "../../global/hooks/useFarmerPrefetch";
import { CheckCircle2, AlertCircle, XCircle, ChevronLeft } from "lucide-react";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { ADVISORY_CODES, normalizeAdvisoryCode } from "../utils/farmerCodes";

function quarterForDate(value) {
  const date = value ? new Date(`${String(value).slice(0, 10)}T12:00:00`) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return `Q${Math.floor(validDate.getMonth() / 3) + 1}`;
}

function FactorDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t, effectiveLanguage, langCode } = useLanguage();
  const currentLang = effectiveLanguage || langCode || "ceb";
  const state = location.state;

  const paramCommodity = searchParams.get("commodity") || searchParams.get("commodityId");
  const commodityId = state?.commodityId || paramCommodity || null;
  const defaultTab = searchParams.get("tab") || state?.defaultTab || "price";

  const priceDetailQuery = useQuery({
    queryKey: ["price-detail", commodityId],
    queryFn: () => pricesApi.getPriceDetail(commodityId),
    enabled: Boolean(commodityId && (!state?.commodityName || state?.commodityName === "this crop")),
    staleTime: 1000 * 60 * 15,
  });

  const { data: catalogData } = useQuery({
    queryKey: ["prices", "list"],
    queryFn: fetchPricesList,
    staleTime: STALE_TIME,
  });
  const catalogPairs = useMemo(
    () => catalogPairsFromPriceList(catalogData?.items),
    [catalogData]
  );

  const catalogMatch = useMemo(() => {
    if (!catalogPairs?.length) return null;
    return catalogPairs.find((p) => p.id === commodityId || p.name === commodityId);
  }, [catalogPairs, commodityId]);

  const rawStateName = (state?.commodityName && state.commodityName !== "this crop") ? state.commodityName : null;
  const commodityName =
    rawStateName ||
    priceDetailQuery.data?.commodity_name ||
    priceDetailQuery.data?.name ||
    catalogMatch?.name ||
    (commodityId && !commodityId.startsWith("COM-") ? (commodityId.charAt(0).toUpperCase() + commodityId.slice(1)) : null) ||
    t("farmer.common.unspecified_crop", {}, "Tanom");

  const selectedQuarter = state?.selectedQuarter || quarterForDate(
    state?.resultData?.harvestDate
      || state?.resultData?.expected_harvest_date
      || state?.resultData?.expectedHarvestDate
  );

  const resolvedCommodityId = useMemo(() => {
    if (!commodityId) return null;
    if (String(commodityId).startsWith("COM-")) return commodityId;
    if (catalogPairs.length === 0) return null;
    return findCommodityId(catalogPairs, commodityName || "", null)
      || findCommodityId(catalogPairs, commodityId, null)
      || commodityName
      || commodityId;
  }, [catalogPairs, commodityId, commodityName]);

  const isAssessmentRoute = location.pathname.includes("/assess");
  const cropStage =
    state?.cropStage ||
    state?.crop_stage ||
    state?.stage ||
    state?.phase ||
    state?.advisoryPayload?.crop_stage ||
    state?.resultData?.cropStage ||
    state?.resultData?.crop_stage ||
    state?.resultData?.phase ||
    state?.resultData?.stage ||
    (isAssessmentRoute ? "before_planting" : null);

  const plantingDate =
    state?.plantingDate ||
    state?.planting_date ||
    state?.resultData?.plantingDate ||
    state?.resultData?.planting_date ||
    state?.advisoryPayload?.planting_date ||
    null;

  const expectedHarvestDate =
    state?.expectedHarvestDate ||
    state?.expected_harvest_date ||
    state?.resultData?.harvestDate ||
    state?.resultData?.expectedHarvestDate ||
    state?.resultData?.expected_harvest_date ||
    state?.advisoryPayload?.expected_harvest_date ||
    null;

  const plantingSeason =
    state?.plantingSeason ||
    state?.planting_season ||
    state?.resultData?.plantingSeason ||
    state?.resultData?.season ||
    null;

  const moduleResults =
    state?.moduleResults ||
    state?.module_results ||
    state?.advisoryPayload?.module_results ||
    null;

  const plantingWindowStart =
    state?.plantingWindowStart ||
    state?.planting_window_start ||
    state?.advisoryPayload?.planting_window_start ||
    moduleResults?.planting_window_start ||
    null;

  const plantingWindowEnd =
    state?.plantingWindowEnd ||
    state?.planting_window_end ||
    state?.advisoryPayload?.planting_window_end ||
    moduleResults?.planting_window_end ||
    null;

  const plantingWindowLabel =
    state?.plantingWindowLabel ||
    state?.planting_window_label ||
    state?.advisoryPayload?.planting_window_label ||
    moduleResults?.planting_window_label ||
    null;
  const arrivalPressureQuery = useQuery({
    queryKey: ["farmer", "arrival-pressure", resolvedCommodityId],
    queryFn: () => analyticsApi.getArrivalPressure(resolvedCommodityId),
    enabled: Boolean(resolvedCommodityId),
    staleTime: 1000 * 60 * 5,
  });
  const seasonalProductionQuery = useQuery({
    queryKey: ["farmer", "seasonal-production", resolvedCommodityId, selectedQuarter],
    queryFn: () => analyticsApi.getHistoricalSeasonalProduction(resolvedCommodityId, selectedQuarter),
    enabled: Boolean(resolvedCommodityId),
    staleTime: 1000 * 60 * 30,
  });
  const weatherForecastQuery = useQuery({
    queryKey: ["farmer", "admin-weather-forecast", 14],
    queryFn: () => analyticsApi.getWeatherForecast(14),
    enabled: Boolean(commodityId || state),
    staleTime: 1000 * 60 * 30,
  });
  const weatherRulesQuery = useQuery({
    queryKey: ["farmer", "weather-rules", resolvedCommodityId],
    queryFn: () => analyticsApi.listWeatherRules(resolvedCommodityId),
    enabled: Boolean(resolvedCommodityId),
    staleTime: 1000 * 60 * 30,
  });

  if (!state && !commodityId) {
    return (
      <div className="px-4 py-8 text-center space-y-3">
        <p className="text-[var(--hw-neutral-900)]">Detailed factors not available.</p>
        <button onClick={() => navigate(-1)} className="text-sm font-medium text-[var(--hw-green-700)]">Go back</button>
      </div>
    );
  }

  const {
    title,
    subtitle,
    breadcrumbs,
    profitability,
    advisoryCode,
    advisoryLabel,
  } = state || {};

  const arrivalSummary = arrivalPressureQuery.data;
  const moduleClassification = (value) => {
    if (value && typeof value === "object") {
      return value.classification || value.level || value.status || value.outlook || null;
    }
    return value || null;
  };
  const resultArrivalClassification = moduleClassification(moduleResults?.arrival_pressure);
  const resultProductionClassification = moduleClassification(
    moduleResults?.historical_seasonal_production_level
  );
  const resultWeatherClassification = moduleClassification(moduleResults?.weather_risk);
  const arrivalTab = {
    arrivalPressure: resultArrivalClassification
      || (arrivalSummary?.status === "processed" ? arrivalSummary.classification : null),
    currentVolumeKg: arrivalSummary?.current_arrival_kg ?? null,
    records: (arrivalSummary?.history_records && arrivalSummary.history_records.length > 0)
      ? arrivalSummary.history_records
      : (arrivalSummary?.records || []),
    averageArrivalKg: arrivalSummary?.average_arrival_kg ?? null,
    quartileThresholds: arrivalSummary?.quartile_thresholds || null,
    sourceBreakdown: arrivalSummary?.source_breakdown || {},
    summary: arrivalSummary?.status === "processed"
      ? `The latest recorded arrival volume is ${arrivalSummary.current_arrival_kg?.toLocaleString?.() ?? "—"} kg; the historical average is ${arrivalSummary.average_arrival_kg?.toLocaleString?.() ?? "—"} kg.`
      : arrivalSummary?.message,
    dataIsStale: arrivalSummary?.data_is_stale === true,
    commodityId,
    commodityName,
  };

  const productionSummary = seasonalProductionQuery.data;
  const selectedProductionProfile = productionSummary?.quarterly_profiles?.find(
    (profile) => profile.quarter === selectedQuarter
  );
  const productionTab = {
    productionLevel: resultProductionClassification
      || (productionSummary?.status === "processed" ? selectedProductionProfile?.classification : null),
    classificationOverride: resultProductionClassification,
    quarterlyProfiles: productionSummary?.quarterly_profiles || [],
    selectedQuarter,
    grandAverageQuarterlyMt: productionSummary?.grand_average_quarterly_mt ?? null,
    records: productionSummary?.records || [],
    sources: (productionSummary?.source_areas || []).map((area) => ({
      name: area.name,
      value: Number(area.value),
      volumeKg: Number(area.total_production_mt),
    })),
    commodityId,
    commodityName,
    dataSource: productionSummary?.record_count > 0 ? { name: productionSummary.commodity_name } : null,
  };

  const weatherAnalysis = buildWeatherRiskAnalysis({
    weatherForecast: weatherForecastQuery.data,
    weatherRules: weatherRulesQuery.data?.items || [],
    commodityName: commodityName || "selected crop",
    weatherLoading: weatherForecastQuery.isLoading || weatherRulesQuery.isLoading,
    weatherError: weatherForecastQuery.error?.message || weatherRulesQuery.error?.message || "",
    lang: currentLang,
  });
  const weatherTab = {
    risk: resultWeatherClassification
      || (weatherAnalysis.classification === "Not processed" ? null : weatherAnalysis.classification),
    forecast_14d: weatherAnalysis.forecast_14d,
    commodityName,
    actions: [],
    why: weatherAnalysis.resultExplanation,
    summary: weatherAnalysis.resultExplanation,
  };

  const cleanTitle = (title && !title.toLowerCase().startsWith("this crop")) ? title : null;
  const displayTitle = cleanTitle || `${commodityName || t("farmer.common.unspecified_crop", {}, "Tanom")} — ${t("farmer.advisory.detailed_factors_title", {}, "Detailed Factors")}`;

  const rawAdv =
    advisoryCode ||
    state?.advisoryCode ||
    state?.rawAdvisory ||
    state?.advisoryPayload?.advisory?.advisory ||
    state?.planAdvisoryData?.advisory?.advisory ||
    state?.resultData?.advisoryCategory ||
    state?.resultData?.advisory ||
    null;
  const normalizedAdv = normalizeAdvisoryCode(rawAdv);
  const advTextStr = String(advisoryLabel || (subtitle && subtitle.includes("·") ? subtitle.split("·")[1].trim() : subtitle) || "").toLowerCase();

  const isAvoid =
    normalizedAdv === ADVISORY_CODES.AVOID_FOR_NOW ||
    /avoid|risk|unfavorable|ayaw|dili|panganib/i.test(rawAdv || "") ||
    /ayaw|dili|avoid|panganib|unfavorable|high risk|taas ang risk/i.test(advTextStr);

  const isCaution =
    !isAvoid &&
    (normalizedAdv === ADVISORY_CODES.PROCEED_WITH_CAUTION ||
     /caution|watch|marginal|bantay|mag-ingat/i.test(rawAdv || "") ||
     /caution|bantay|mag-ingat|puwede padayon/i.test(advTextStr));

  const isRecommended = !isAvoid && !isCaution;

  const advisoryText =
    advisoryLabel ||
    (subtitle && subtitle.includes("·") ? subtitle.split("·")[1].trim() : subtitle) ||
    (isAvoid
      ? t("farmer.advisory.labels.avoid_for_now", {}, "Avoid for Now")
      : isCaution
      ? t("farmer.advisory.labels.proceed_with_caution", {}, "Proceed with Caution")
      : t("farmer.advisory.labels.recommended", {}, "Recommended"));

  const backPath = state?.backPath || null;
  const backLabel = state?.backLabel || null;
  const canResume = Boolean(state?.resultData || state?.advisoryPayload);
  const handleBack = () => {
    if (canResume && backPath) {
      navigate(backPath, {
        state: { resumeRecommendation: { data: state.resultData, advisoryResponse: state.advisoryPayload } },
      });
    } else if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  const breadcrumbItems = useMemo(() => {
    let rawItems = [];

    if (breadcrumbs && breadcrumbs.length > 0) {
      rawItems = breadcrumbs;
    } else {
      const isAssessRoute = location.pathname.startsWith("/farmer/assess");
      const isFromDashboard = backPath === "/farmer" || (!backPath && !isAssessRoute && state?.source === "dashboard");
      const isFromWeather = backPath?.includes("/weather") || searchParams.get("tab") === "weather";

      if (isAssessRoute) {
        rawItems = [
          { label: t("farmer.assess.title", {}, "Crop Assessment"), path: "/farmer/assess" },
          canResume
            ? { label: t("farmer.assess.result", {}, "Result") }
            : (commodityName ? { label: commodityName } : null),
          { label: t("farmer.advisory.detailed_factors_title", {}, "Detailed Factors") },
        ].filter(Boolean);
      } else if (isFromWeather) {
        rawItems = [
          { label: t("farmer.weather.title", {}, "Weather"), path: "/farmer/market/weather" },
          commodityName ? { label: commodityName } : null,
          { label: t("farmer.advisory.detailed_factors_title", {}, "Detailed Factors") },
        ].filter(Boolean);
      } else if (isFromDashboard) {
        rawItems = [
          { label: t("farmer.dashboard.title", {}, "Dashboard"), path: "/farmer" },
          commodityName ? { label: commodityName } : null,
          { label: t("farmer.advisory.detailed_factors_title", {}, "Detailed Factors") },
        ].filter(Boolean);
      } else {
        rawItems = [
          { label: t("nav.market", {}, "Market"), path: "/farmer/market" },
          commodityName ? { label: commodityName } : null,
          { label: t("farmer.advisory.detailed_factors_title", {}, "Detailed Factors") },
        ].filter(Boolean);
      }
    }

    return rawItems.map((bc, index) => {
      const isLast = index === rawItems.length - 1;
      const isImmediatePrevious = index === rawItems.length - 2;

      let onClick = undefined;
      if (!isLast) {
        if (typeof bc.onClick === "function") {
          onClick = bc.onClick;
        } else if (isImmediatePrevious) {
          onClick = handleBack;
        } else if (bc.path) {
          onClick = () => navigate(bc.path);
        } else {
          onClick = handleBack;
        }
      }

      return {
        label: bc.label,
        onClick,
      };
    });
  }, [breadcrumbs, location.pathname, backPath, state, searchParams, canResume, commodityName, t, handleBack, navigate]);

  let statusConfig = {
    Icon: XCircle,
    iconColor: "text-red-600",
    textColor: "text-red-700",
  };
  if (isCaution) {
    statusConfig = {
      Icon: AlertCircle,
      iconColor: "text-amber-500",
      textColor: "text-amber-700",
    };
  } else if (isRecommended || (!isAvoid && !isCaution)) {
    statusConfig = {
      Icon: CheckCircle2,
      iconColor: "text-[var(--hw-green-700)]",
      textColor: "text-[var(--hw-green-800)]",
    };
  }
  const StatusIcon = statusConfig.Icon;

  return (
    <div className="px-2 xs:px-3.5 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-3 sm:space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Page title & Emphasized Final Advisory */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 pb-1">
        <div className="flex items-center gap-3 min-w-0">
          <CommodityIllustration
            commodityId={commodityId}
            commodityName={commodityName}
            baseName={commodityName}
            className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-[17px] sm:text-[20px] font-bold text-black leading-tight">{displayTitle}</h1>
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
        arrival={arrivalTab}
        production={productionTab}
        weather={weatherTab}
        profitability={profitability}
        defaultTab={defaultTab}
        commodityId={commodityId}
        commodityName={commodityName}
        cropStage={cropStage}
        plantingDate={plantingDate}
        expectedHarvestDate={expectedHarvestDate}
        plantingSeason={plantingSeason}
        moduleResults={moduleResults}
        plantingWindowStart={plantingWindowStart}
        plantingWindowEnd={plantingWindowEnd}
        plantingWindowLabel={plantingWindowLabel}
      />
    </div>
  );
}

export { FactorDetailPage as default };
