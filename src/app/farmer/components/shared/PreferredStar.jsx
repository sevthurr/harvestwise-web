import { Star } from "lucide-react";
import { useLanguage } from "../../../global/contexts/LanguageContext";

/**
 * Filled star icon indicator for preferred crops.
 * Rendered in yellow/amber with an accessible title tooltip and sr-only label.
 */
export function PreferredStar({ className = "w-3.5 h-3.5", title }) {
  const { t } = useLanguage();
  const label = title || (t ? t("common.preferred", {}, "Preferred") : "Preferred");

  return (
    <span
      className="inline-flex items-center justify-center flex-shrink-0"
      title={label}
      aria-label={label}
      data-testid="preferred-star"
    >
      <Star
        className={`text-amber-500 fill-current ${className}`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export default PreferredStar;
