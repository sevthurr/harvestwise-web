import { useNavigate, useLocation } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import { FactorDetailTabs } from "../components/shared/FactorDetailTabs";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { apiGet, parseResponse } from "../../global/api";
import { CheckCircle2, AlertCircle, XCircle, ChevronLeft } from "lucide-react";

const DEFAULT_WEATHER_LAT = 7.0722;
const DEFAULT_WEATHER_LON = 125.6131;

function FactorDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const state = location.state;

  const commodityId = state?.commodityId || null;
  const commodityName = state?.commodityName || null;
  const moduleResults = state?.moduleResults || {};

  const profile = queryClient.getQueryData(["farmer", "profile"]);
  const weatherLat = profile?.latitude ?? DEFAULT_WEATHER_LAT;
  const weatherLon = profile?.longitude ?? DEFAULT_WEATHER_LON;

  const { data: productionFactorData } = useQuery({
    queryKey: ["factors", "production", commodityId],
    queryFn: async () => {
      try {
        const res = await apiGet(`/market/factors/production/${commodityId}`);
        if (!res.ok) return null;
        return await parseResponse(res);
      } catch {
        return null;
      }
    },
    enabled: Boolean(commodityId),
    staleTime: 1000 * 60 * 30,
  });

  const { data: arrivalFactorData } = useQuery({
    queryKey: ["factors", "arrival", commodityId],
    queryFn: async () => {
      try {
        const res = await apiGet(`/market/factors/arrival/${commodityId}?days=180`);
        if (!res.ok) return null;
        return await parseResponse(res);
      } catch {
        return null;
      }
    },
    enabled: Boolean(commodityId),
    staleTime: 1000 * 60 * 30,
  });

  const { data: weatherAdvisoryData } = useQuery({
    queryKey: ["weather", "advisory", weatherLat, weatherLon],
    queryFn: async () => {
      try {
        const res = await apiGet(`/weather/advisory?latitude=${weatherLat}&longitude=${weatherLon}`);
        if (!res.ok) return null;
        return await parseResponse(res);
      } catch {
        return null;
      }
    },
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
    price,
    arrival,
    production,
    weather,
    profitability,
    advisoryCode,
    advisoryLabel,
  } = state;

  const cropWeatherAdv = (weatherAdvisoryData?.advisories || []).find(
    (a) => a.commodity_name?.toLowerCase() === commodityName?.toLowerCase() || a.commodity_id === commodityId
  );

  const productionTab = {
    productionLevel:
      moduleResults.historical_seasonal_production_level ||
      production?.productionLevel ||
      production?.level ||
      null,
    records: production?.records?.length ? production.records : (productionFactorData?.records || []),
    commodityId,
    commodityName,
  };

  const arrivalTab = {
    arrivalPressure: moduleResults.arrival_pressure || arrival?.arrivalPressure || arrival?.trend || null,
    currentVolumeKg: moduleResults.current_arrival_kg ?? arrival?.currentVolumeKg ?? null,
    commodityId,
    commodityName,
    volumesByDate: arrival?.volumesByDate?.length
      ? arrival.volumesByDate
      : (arrivalFactorData?.volumes_by_date || []),
  };

  const weatherTab = {
    risk: moduleResults.weather_risk || weather?.risk || cropWeatherAdv?.suitability || null,
    forecast_14d: weather?.forecast_14d?.length
      ? weather.forecast_14d
      : (weatherAdvisoryData?.daily_forecasts || weather?.forecast || []),
    commodityName,
    actions: cropWeatherAdv?.recommended_actions?.length
      ? cropWeatherAdv.recommended_actions
      : (weather?.actions || []),
    why: cropWeatherAdv?.explanation || weather?.why || "",
    summary: weather?.summary || cropWeatherAdv?.explanation || "",
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
        {backLabel || t("farmer.common.back", {}, "Back")}
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
        price={price}
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
