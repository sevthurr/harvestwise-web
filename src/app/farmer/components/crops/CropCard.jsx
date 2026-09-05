import { ChevronRight, PauseCircle } from "lucide-react";
import { getPhaseConfig } from "./types";
import { PHASE_CODES, normalizePhaseCode } from "../../utils/farmerCodes";
import { CommodityIllustration } from "../../../global/components/shared/CommodityIllustrations";
import { useLanguage } from "../../../global/contexts/LanguageContext";

const PhasePill = ({ phase, isOnHold }) => {
  const { t } = useLanguage();
  const phaseCode = normalizePhaseCode(phase);
  if (isOnHold || phaseCode === PHASE_CODES.ON_HOLD) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200">
        <PauseCircle className="w-3 h-3" />
        {t("farmer.phases.on_hold")}
      </span>
    );
  }
  if (phaseCode === PHASE_CODES.PRE_HARVEST) {
    const planted = getPhaseConfig(PHASE_CODES.GROWING);
    const ph = getPhaseConfig(PHASE_CODES.PRE_HARVEST);
    const Icon2 = planted.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${planted.color} ${planted.bg} ${planted.border} border`}>
        <Icon2 className="w-3 h-3" />
        {t("farmer.phases.planted")}
        <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${ph.color} ${ph.bg}`}>
          {t("farmer.phases.pre_harvest")}
        </span>
      </span>
    );
  }
  const cfg = getPhaseConfig(phaseCode);
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color} ${cfg.bg} ${cfg.border} border`}>
      <Icon className="w-3 h-3" />
      {t(cfg.labelKey || "farmer.phases.completed")}
    </span>
  );
};

function formatPesoRange(lo, hi) {
  const fmt = (n) => `\u20B1${Math.max(0, n).toLocaleString("en-PH")}`;
  return `${fmt(lo)}\u2013${fmt(hi)}`;
}

const CropCard = ({ crop, onView }) => {
  const { t } = useLanguage();
  const price = crop.currentPrice ?? 0;
  const loProfit = Math.round((crop.harvestQuantity * price * 0.9 - crop.totalCost) / 1e3) * 1e3;
  const hiProfit = Math.floor((crop.harvestQuantity * price * 1.1 - crop.totalCost) / 1e3) * 1e3;
  const phaseCode = normalizePhaseCode(crop.phase);
  const isCompleted = phaseCode === PHASE_CODES.COMPLETED;
  const bottomText = crop.isOnHold
    ? t("farmer.cropCard.resume_when_improved")
    : isCompleted
    ? t("farmer.cropCard.cycle_completed")
    : (crop.nextMilestone || "-");

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3">
      {/* Top row: icon + name + pill */}
      <div className="flex items-center gap-3">
        <CommodityIllustration commodityId={crop.commodity} commodityName={crop.commodityName} baseName={crop.commodityName} className="w-10 h-10 flex-shrink-0" />
        <p className="font-bold text-[var(--hw-neutral-900)] flex-1 leading-tight">{crop.commodityName || "-"}</p>
        <PhasePill phase={crop.phase} isOnHold={crop.isOnHold} />
      </div>

      {/* Data rows */}
      <div className="space-y-1.5">
        <DataRow label={t("farmer.cropCard.harvest_label")} value={crop.harvestDate || "-"} />
        <DataRow label={t("farmer.cropCard.current_price_label")} value={price ? `\u20B1${price}/kg` : "-/kg"} />
        {isCompleted && crop.actualSellingPrice != null ? (
          <DataRow label={t("farmer.cropCard.sold_at_label")} value={`\u20B1${crop.actualSellingPrice}/kg`} />
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--hw-green-700)]">{t("farmer.cropCard.estimated_profit_label")}</span>
            <span className="text-sm font-semibold text-emerald-600">
              {price ? formatPesoRange(loProfit, hiProfit) : "-"}
            </span>
          </div>
        )}
      </div>

      {/* Footer: milestone / hold reason + view crop */}
      <div className="flex items-center justify-between pt-1 border-t border-[var(--hw-neutral-100)] gap-2">
        <span className={`text-xs truncate flex-1 ${crop.isOnHold ? "text-amber-600" : "text-[var(--hw-green-700)]"}`}>
          {bottomText}
        </span>
        <button
          onClick={() => onView(crop.id)}
          className="inline-flex items-center gap-0.5 text-sm font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors flex-shrink-0"
        >
          {t("farmer.cropCard.view_crop_btn")} <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const DataRow = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-[var(--hw-green-700)]">{label}</span>
    <span className="text-sm text-[var(--hw-neutral-900)]">{value}</span>
  </div>
);

export {
  CropCard,
  PhasePill
};

