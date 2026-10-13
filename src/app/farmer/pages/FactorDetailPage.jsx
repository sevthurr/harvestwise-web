import { useNavigate, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import { FactorDetailTabs } from "../components/shared/FactorDetailTabs";
import { useLanguage } from "../../global/contexts/LanguageContext";
import * as analyticsApi from "../../../services/api/analyticsApi";
import { buildWeatherRiskAnalysis } from "../../global/utils/weatherRiskAnalysis";
import { CheckCircle2, AlertCircle, XCircle, ChevronLeft } from "lucide-react";

function quarterForDate(value) {
  const date = value ? new Date(`${String(value).slice(0, 10)}T12:00:00`) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return `Q${Math.floor(validDate.getMonth() / 3) + 1}`;
}

function FactorDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const state = location.state;

  const commodityId = state?.commodityId || null;
  const commodityName = state?.commodityName || null;
  const selectedQuarter = state?.selectedQuarter || quarterForDate(
    state?.resultData?.harvestDate
      || state?.resultData?.expected_harvest_date
      || state?.resultData?.expectedHarvestDate
  );
  const arrivalPressureQuery = useQuery({
    queryKey: ["farmer", "arrival-pressure", commodityId],
    queryFn: () => analyticsApi.getArrivalPressure(commodityId),
    enabled: Boolean(commodityId),
    staleTime: 1000 * 60 * 5,
  });
  const seasonalProductionQuery = useQuery({
    queryKey: ["farmer", "seasonal-production", commodityId, selectedQuarter],
    queryFn: () => analyticsApi.getHistoricalSeasonalProduction(commodityId, selectedQuarter),
    enabled: Boolean(commodityId),
    staleTime: 1000 * 60 * 30,
  });
  const weatherForecastQuery = useQuery({
    queryKey: ["farmer", "admin-weather-forecast", 14],
    queryFn: () => analyticsApi.getWeatherForecast(14),
    enabled: Boolean(state),
    staleTime: 1000 * 60 * 30,
  });
  const weatherRulesQuery = useQuery({
    queryKey: ["farmer", "weather-rules", commodityId],
    queryFn: () => analyticsApi.listWeatherRules(commodityId),
    enabled: Boolean(commodityId),
    staleTime: 1000 * 60 * 30,
  });

  if (!state) {
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
  } = state;

  const arrivalSummary = arrivalPressureQuery.data;
  const arrivalTab = {
    arrivalPressure: arrivalSummary?.status === "processed" ? arrivalSummary.classification : null,
    currentVolumeKg: arrivalSummary?.current_arrival_kg ?? null,
    records: arrivalSummary?.records || [],
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
  });
  const weatherTab = {
    risk: weatherAnalysis.classification === "Not processed" ? null : weatherAnalysis.classification,
    forecast_14d: weatherAnalysis.forecast_14d,
    commodityName,
    actions: [],
    why: weatherAnalysis.resultExplanation,
    summary: weatherAnalysis.resultExplanation,
  };

  const breadcrumbItems = (breadcrumbs || []).map((bc) => ({
    label: bc.label,
    onClick: bc.path ? () => navigate(bc.path) : void 0,
  }));

  const advisoryText = advisoryLabel || (subtitle && subtitle.includes("·") ? subtitle.split("·")[1].trim() : subtitle);
  const advCode = String(advisoryCode || "").toLowerCase();

  const isAvoid = advCode.includes("avoid") || advCode.includes("risk") || (advisoryText && /ayaw|dili|avoid|panganib/i.test(advisoryText));
  const isCaution = advCode.includes("caution") || (advisoryText && /caution|bantayan|puwede/i.test(advisoryText));
  const isRecommended = advCode.includes("recommend") || (advisoryText && /itanom|rekomenda|recommend/i.test(advisoryText));

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

  let badgeTheme = {
    badge: "bg-red-50 text-red-700 border-red-200",
    Icon: XCircle,
  };
  if (isCaution) {
    badgeTheme = {
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      Icon: AlertCircle,
    };
  } else if (isRecommended && !isAvoid) {
    badgeTheme = {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Icon: CheckCircle2,
    };
  }
  const BadgeIcon = badgeTheme.Icon;

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-4">
      {/* Back to decision */}
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-900)] transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {backLabel || t("common.back", {}, "Back")}
      </button>

      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Page title & Emphasized Final Advisory */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <h1 className="text-[20px] font-bold text-[var(--hw-neutral-900)] leading-tight">{title}</h1>
          <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
            {t("farmer.advisory.market_analysis_crop_plan", {}, "Market analysis for your crop plan")}
          </p>
        </div>
        {advisoryText && (
          <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white shadow-[var(--shadow-xs)]">
            <span className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wide">
              {t("farmer.advisory.assessment_result_title", {}, "Assessment Result")}:
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-bold border ${badgeTheme.badge}`}>
              <BadgeIcon className="w-3.5 h-3.5 flex-shrink-0" />
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
        defaultTab="price"
        commodityId={commodityId}
        commodityName={commodityName}
      />
    </div>
  );
}

export { FactorDetailPage as default };
