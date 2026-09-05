import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ChevronRight,
  CalendarDays,
  CloudRain,
  Sprout,
  ArrowRight
} from "lucide-react";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { toCamelCase } from "../../global/utils/apiTransforms";
import { apiGet, parseResponse } from "../../global/api";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { Skeleton } from "../components/shared/FarmerSkeletons";
import { ADVISORY_CODES, normalizeAdvisoryCode } from "../utils/farmerCodes";

const ADV_CFG = {
  [ADVISORY_CODES.RECOMMENDED]: {
    labelKey: "farmer.advisory.labels.recommended",
    Icon: CheckCircle2,
    color: "text-[var(--hw-green-700)]",
    border: "border-[var(--hw-green-300)]"
  },
  [ADVISORY_CODES.PROCEED_WITH_CAUTION]: {
    labelKey: "farmer.advisory.labels.proceed_with_caution",
    Icon: AlertTriangle,
    color: "text-amber-600",
    border: "border-amber-200"
  },
  [ADVISORY_CODES.AVOID_FOR_NOW]: {
    labelKey: "farmer.advisory.labels.avoid_for_now",
    Icon: AlertOctagon,
    color: "text-red-500",
    border: "border-red-200"
  }
};

const MARKET_EVENTS_STATIC = [
  {
    id: "payday",
    titleKey: "farmer.plantingGuide.event_payday_title",
    dateKey: "farmer.plantingGuide.event_payday_date",
    noteKey: "farmer.plantingGuide.event_payday_note"
  },
  {
    id: "notes",
    titleKey: "farmer.plantingGuide.event_market_conditions_title",
    dateKey: "farmer.plantingGuide.event_market_conditions_date",
    noteKey: "farmer.plantingGuide.event_market_conditions_note"
  }
];

const WEATHER_ACTIONS = [
  "farmer.factors.weather.actions.clear_drainage",
  "farmer.factors.weather.actions.avoid_heavy_rain",
  "farmer.factors.weather.actions.protect_harvest"
];

const CropAdvisoryCard = ({ crop, onViewGuide }) => {
  const { t } = useLanguage();
  const advCode = normalizeAdvisoryCode(crop.advisory || crop.advisoryCategory) || ADVISORY_CODES.RECOMMENDED;
  const cfg = ADV_CFG[advCode] || ADV_CFG[ADVISORY_CODES.RECOMMENDED];
  const AdvIcon = cfg.Icon;
  return (
    <div className={`bg-white rounded-2xl border ${cfg.border} shadow-[var(--shadow-xs)] p-4`}>
      <div className="flex items-start gap-3">
        <CommodityIllustration commodityId={crop.id} className="w-10 h-10 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1">
          <div className={`flex items-center gap-1.5 ${cfg.color}`}>
            <AdvIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-[12px] font-semibold">{t(cfg.labelKey)}</span>
          </div>
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">{crop.name}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            <p className="text-[12px] text-[var(--hw-neutral-900)]">
              {t("farmer.plantingGuide.estimated_profit_label")} <span className="font-medium text-[var(--hw-neutral-700)]">{crop.profit || "–"}</span>
            </p>
            <p className="text-[12px] text-[var(--hw-neutral-900)]">
              {t("farmer.plantingGuide.harvest_label")} <span className="font-medium text-[var(--hw-neutral-700)]">{crop.harvest || "–"}</span>
            </p>
          </div>
          <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">{crop.reason || crop.explanation || "–"}</p>
          {crop.note && <p className={`text-[12px] font-medium ${cfg.color}`}>{crop.note}</p>}
        </div>
        <button
          onClick={onViewGuide}
          className="flex-shrink-0 text-[12px] font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity pt-0.5"
        >
          {t("farmer.plantingGuide.view_guide_btn")}
        </button>
      </div>
    </div>
  );
};

function PlantingGuidePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [advisories, setAdvisories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch monthly crop recommendations from API
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const response = await apiGet('/market/monthly-recommendations');
        if (response.ok) {
          const data = await parseResponse(response);
          const rawItems = data?.items || data?.recommendations || (Array.isArray(data) ? data : []);
          const transformedAdvisories = rawItems.map(rec => {
            const camelRec = toCamelCase(rec);
            const advisoryCode = normalizeAdvisoryCode(camelRec.advisoryCategory || camelRec.advisory) || ADVISORY_CODES.RECOMMENDED;
            
            return {
              id: camelRec.commodityId,
              name: camelRec.commodityName || "–",
              advisory: advisoryCode,
              profit: "–",
              harvest: camelRec.harvestWindowStart ? new Date(camelRec.harvestWindowStart).toLocaleDateString('en-US', { month: 'short' }) : "–",
              reason: camelRec.explanation || "–",
              bestVariety: camelRec.bestVarietyName || null,
              note: null
            };
          });
          setAdvisories(transformedAdvisories);
        } else {
          setAdvisories([]);
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        setAdvisories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const recommended = advisories.filter((a) => a.advisory === ADVISORY_CODES.RECOMMENDED);
  const conservative = advisories.filter((a) => a.advisory === ADVISORY_CODES.PROCEED_WITH_CAUTION);
  const avoid = advisories.filter((a) => a.advisory === ADVISORY_CODES.AVOID_FOR_NOW);

  if (loading) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-7 w-40 rounded" />
          <Skeleton className="h-4 w-60 rounded" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-32 rounded" />
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex items-center gap-3 animate-pulse">
              <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-36 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex items-center gap-3 animate-pulse">
              <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-36 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-6">
      {/* ── Header ── */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
            {t("farmer.plantingGuide.page_title")}
          </h1>
          <div className="flex items-center gap-1.5 text-[var(--hw-neutral-700)] flex-shrink-0 mt-1">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="text-[13px] whitespace-nowrap">{t("farmer.plantingGuide.updated_recent")}</span>
          </div>
        </div>
        <p className="text-[15px] text-[var(--hw-neutral-900)] mt-0.5">
          {t("farmer.plantingGuide.page_subtitle")}
        </p>
      </div>

      {/* ── 1. Main guide card ── */}
      <div className="bg-[var(--hw-green-700)] rounded-2xl p-5 text-white shadow-[var(--shadow-md)]">
        <p className="font-semibold text-lg leading-snug">{t("farmer.plantingGuide.hero_title")}</p>
        <p className="mt-1.5 text-[15px] text-green-100 leading-relaxed">
          {t("farmer.plantingGuide.hero_desc")}
        </p>
        <button
          onClick={() => navigate("/farmer/assess")}
          className="mt-4 inline-flex items-center gap-2 bg-white text-[var(--hw-green-700)] px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-green-50 transition-colors"
        >
          {t("farmer.plantingGuide.check_crop_btn")}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── 2 + 3: Desktop two-column — Advisories | Calendar & Events ── */}
      <div className="md:grid md:grid-cols-[1fr_360px] md:gap-6 space-y-6 md:space-y-0">
        {/* Left column: Crop advisory groups */}
        <div className="space-y-6">
          {/* Recommended */}
          <section>
            <div className="mb-3">
              <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">
                {t("farmer.plantingGuide.recommended_title")}
              </h2>
              <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">
                {t("farmer.plantingGuide.recommended_subtitle")}
              </p>
            </div>
            {recommended.length === 0 ? (
              <div className="text-[13px] text-[var(--hw-neutral-700)]">
                {t("farmer.plantingGuide.no_recommendations")}
              </div>
            ) : (
              <div className="space-y-3">
                {recommended.map((crop) => (
                  <CropAdvisoryCard
                    key={crop.id}
                    crop={crop}
                    onViewGuide={() => navigate(`/farmer/assess?commodity=${crop.id}`)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Proceed with Caution */}
          <section>
            <div className="mb-3">
              <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">
                {t("farmer.plantingGuide.caution_title")}
              </h2>
              <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">
                {t("farmer.plantingGuide.caution_subtitle")}
              </p>
            </div>
            {conservative.length === 0 ? (
              <div className="text-[13px] text-[var(--hw-neutral-700)]">
                {t("farmer.plantingGuide.no_caution_recommendations")}
              </div>
            ) : (
              <div className="space-y-3">
                {conservative.map((crop) => (
                  <CropAdvisoryCard
                    key={crop.id}
                    crop={crop}
                    onViewGuide={() => navigate(`/farmer/assess?commodity=${crop.id}`)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Avoid for Now */}
          <section>
            <div className="mb-3">
              <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">
                {t("farmer.plantingGuide.avoid_title")}
              </h2>
              <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">
                {t("farmer.plantingGuide.avoid_subtitle")}
              </p>
            </div>
            {avoid.length === 0 ? (
              <div className="text-[13px] text-[var(--hw-neutral-700)]">
                {t("farmer.plantingGuide.no_avoid_recommendations")}
              </div>
            ) : (
              <div className="space-y-3">
                {avoid.map((crop) => (
                  <CropAdvisoryCard
                    key={crop.id}
                    crop={crop}
                    onViewGuide={() => navigate(`/farmer/assess?commodity=${crop.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column: Market Events + Weather */}
        <div className="space-y-5">
          {/* ── 4. Upcoming market events ── */}
          <section>
            <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)] mb-3">
              {t("farmer.plantingGuide.upcoming_market_events_title")}
            </h2>
            <div className="space-y-2.5">
              {MARKET_EVENTS_STATIC.map((event) => (
                <div key={event.id} className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-[var(--hw-neutral-50)] rounded-lg flex-shrink-0 mt-0.5">
                      <CalendarDays className="w-3.5 h-3.5 text-[var(--hw-neutral-900)]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{t(event.titleKey)}</p>
                        <span className="text-[12px] font-medium text-[var(--hw-neutral-700)]">{t(event.dateKey)}</span>
                      </div>
                      <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">{t(event.noteKey)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 5. Weather advice ── */}
          <section>
            <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)] mb-3">
              {t("farmer.plantingGuide.weather_advice_title")}
            </h2>
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
              {/* Condition headline */}
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 rounded-xl flex-shrink-0">
                  <CloudRain className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
                    {t("farmer.plantingGuide.check_weather_title")}
                  </p>
                  <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">
                    {t("farmer.plantingGuide.check_weather_subtitle")}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-1.5">
                {WEATHER_ACTIONS.map((actionKey, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                    <p className="text-[13px] text-[var(--hw-neutral-900)]">{t(actionKey)}</p>
                  </div>
                ))}
              </div>

              {/* Link to weather screen */}
              <button
                onClick={() => navigate("/farmer/market/weather")}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
              >
                {t("farmer.plantingGuide.view_weather_forecast_btn")}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* ── 6. Check my crop action (bottom) ── */}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[var(--hw-green-50)] rounded-xl flex-shrink-0">
            <Sprout className="w-4 h-4 text-[var(--hw-green-700)]" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">
              {t("farmer.plantingGuide.check_crop_card_title")}
            </p>
            <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">
              {t("farmer.plantingGuide.check_crop_card_desc")}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/farmer/assess")}
          className="w-full flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors"
        >
          {t("farmer.plantingGuide.start_check_btn")}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default PlantingGuidePage;

