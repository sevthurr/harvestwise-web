import { TrendingUp, TrendingDown, Activity } from "lucide-react";
const DemandBadge = ({
  level,
  value,
  showIcon = true
}) => {
  const config = {
    high: {
      label: value || "High Demand",
      bg: "bg-[var(--hw-green-50)]",
      text: "text-[var(--hw-green-800)]",
      border: "border-[var(--hw-green-400)]",
      icon: <TrendingUp className="w-3.5 h-3.5" />
    },
    moderate: {
      label: value || "Moderate Demand",
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-300",
      icon: <Activity className="w-3.5 h-3.5" />
    },
    low: {
      label: value || "Low Demand",
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-300",
      icon: <TrendingDown className="w-3.5 h-3.5" />
    },
    stable: {
      label: value || "Stable",
      bg: "bg-[var(--hw-neutral-100)]",
      text: "text-[var(--hw-neutral-700)]",
      border: "border-[var(--hw-neutral-300)]",
      icon: <Activity className="w-3.5 h-3.5" />
    }
  };
  const { label, bg, text, border, icon } = config[level];
  return <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium text-xs whitespace-nowrap ${bg} ${text} ${border}`}
  >
      {showIcon && icon}
      {label}
    </span>;
};
export {
  DemandBadge
};
