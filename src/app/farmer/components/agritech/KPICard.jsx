import { TrendingUp, TrendingDown, Minus } from "lucide-react";
const KPICard = ({
  label,
  value,
  change,
  changeLabel,
  icon,
  variant = "default"
}) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const isNeutral = change === 0;
  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const variantStyles = {
    default: "bg-white",
    success: "bg-green-50 border-green-200",
    warning: "bg-amber-50 border-amber-200",
    error: "bg-red-50 border-red-200"
  };
  return <div
    className={`
        p-3 md:p-4 rounded-lg border border-[var(--hw-neutral-200)]
        ${variantStyles[variant]}
        hover:shadow-md transition-shadow duration-200
      `}
  >
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs md:text-sm font-medium text-[var(--hw-neutral-900)]">{label}</p>
        {icon && <div className="text-[var(--hw-green-700)]">
            {icon}
          </div>}
      </div>
      
      <div className="space-y-1">
        <p className="text-xl md:text-2xl font-bold text-[var(--hw-neutral-900)]">
          {value}
        </p>
        
        {change !== void 0 && <div className="flex items-center gap-1.5">
            <div className={`
              flex items-center gap-1 text-xs md:text-sm font-medium
              ${isNeutral ? "text-[var(--hw-neutral-700)]" : ""}
              ${isPositive ? "text-green-600" : ""}
              ${isNegative ? "text-red-600" : ""}
            `}>
              <TrendIcon className="w-3 h-3 md:w-4 md:h-4" />
              <span>
                {isPositive && "+"}{change.toFixed(1)}%
              </span>
            </div>
            {changeLabel && <span className="text-xs text-[var(--hw-neutral-700)]">
                {changeLabel}
              </span>}
          </div>}
      </div>
    </div>;
};
export {
  KPICard
};
