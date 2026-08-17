import { AlertTriangle, TrendingUp, Info, CheckCircle2 } from "lucide-react";
const AlertCard = ({
  type,
  commodity,
  message,
  action,
  onActionClick
}) => {
  const config = {
    oversupply: {
      icon: <AlertTriangle className="w-5 h-5" />,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      title: "Oversupply Warning",
      titleColor: "text-amber-900"
    },
    "high-demand": {
      icon: <TrendingUp className="w-5 h-5" />,
      iconBg: "bg-green-100",
      iconColor: "text-green-700",
      bg: "bg-green-50",
      border: "border-green-200",
      title: "High Demand Alert",
      titleColor: "text-green-900"
    },
    "price-drop": {
      icon: <Info className="w-5 h-5" />,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      title: "Price Alert",
      titleColor: "text-blue-900"
    },
    optimal: {
      icon: <CheckCircle2 className="w-5 h-5" />,
      iconBg: "bg-[var(--hw-green-100)]",
      iconColor: "text-[var(--hw-green-700)]",
      bg: "bg-[var(--hw-green-50)]",
      border: "border-[var(--hw-green-200)]",
      title: "Optimal Conditions",
      titleColor: "text-[var(--hw-green-900)]"
    }
  };
  const { icon, iconBg, iconColor, bg, border, title, titleColor } = config[type];
  return <div className={`${bg} border ${border} rounded-lg p-3 md:p-4`}>
      <div className="flex items-start gap-2 md:gap-3">
        <div className={`${iconBg} ${iconColor} p-1.5 md:p-2 rounded-lg flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${titleColor} mb-0.5 md:mb-1`}>
            {title}: {commodity}
          </p>
          <p className="text-xs text-[var(--hw-neutral-700)] mb-2">
            {message}
          </p>
          {action && onActionClick && <button
    onClick={onActionClick}
    className="text-sm font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
              {action} →
            </button>}
        </div>
      </div>
    </div>;
};
export {
  AlertCard
};
