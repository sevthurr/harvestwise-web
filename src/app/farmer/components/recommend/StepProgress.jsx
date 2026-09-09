import { STEP_LABELS, TOTAL_STEPS } from "./types";
import { useLanguage } from "../../../global/contexts/LanguageContext";

const StepProgress = ({ currentStep }) => {
  const { t } = useLanguage();
  const pct = (currentStep / TOTAL_STEPS) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
          {t("common.step_indicator", { current: currentStep, total: TOTAL_STEPS }, `Step ${currentStep} of ${TOTAL_STEPS}`)}
        </span>
        <span className="text-xs font-medium text-[var(--hw-neutral-900)]">
          {t(`farmer.assess.step${currentStep}_title`, {}, STEP_LABELS[currentStep])}
        </span>
      </div>
      <div className="h-1.5 bg-[var(--hw-neutral-200)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--hw-green-700)] rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
export {
  StepProgress
};
