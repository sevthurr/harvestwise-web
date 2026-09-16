import { useNavigate, useLocation } from "react-router";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import { FactorDetailTabs } from "../components/shared/FactorDetailTabs";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

function FactorDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const state = location.state;

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
    commodityId,
    commodityName,
    advisoryCode,
    advisoryLabel,
  } = state;

  const breadcrumbItems = (breadcrumbs || []).map((bc) => ({
    label: bc.label,
    onClick: bc.path ? () => navigate(bc.path) : void 0,
  }));

  const advisoryText = advisoryLabel || (subtitle && subtitle.includes("·") ? subtitle.split("·")[1].trim() : subtitle);
  const advCode = String(advisoryCode || "").toLowerCase();

  const isAvoid = advCode.includes("avoid") || advCode.includes("risk") || (advisoryText && /ayaw|dili|avoid|panganib/i.test(advisoryText));
  const isCaution = advCode.includes("caution") || (advisoryText && /caution|bantayan|puwede/i.test(advisoryText));
  const isRecommended = advCode.includes("recommend") || (advisoryText && /itanom|rekomenda|recommend/i.test(advisoryText));

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
        arrival={arrival}
        production={production}
        weather={weather}
        profitability={profitability}
        defaultTab="price"
        commodityId={commodityId}
        commodityName={commodityName}
      />
    </div>
  );
}

export { FactorDetailPage as default };
