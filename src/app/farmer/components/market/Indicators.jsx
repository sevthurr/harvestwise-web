import { TrendingUp, TrendingDown, Minus, Clock, Wifi, WifiOff } from "lucide-react";
const directionConfig = {
  Rising: { icon: TrendingUp, color: "text-emerald-600", label: "Rising" },
  Stable: { icon: Minus, color: "text-[var(--hw-neutral-700)]", label: "Stable" },
  Falling: { icon: TrendingDown, color: "text-red-500", label: "Falling" }
};
const PriceDirectionIndicator = ({
  direction,
  size = "md"
}) => {
  const { icon: Icon, color, label } = directionConfig[direction];
  const iconClass = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const textClass = size === "sm" ? "text-xs" : "text-sm";
  return <span className={`inline-flex items-center gap-1 font-medium ${color} ${textClass}`}>
      <Icon className={iconClass} />
      {label}
    </span>;
};
const supplyConfig = {
  Low: { color: "text-amber-600", label: "Supply: Low" },
  Moderate: { color: "text-[var(--hw-neutral-700)]", label: "Supply: Moderate" },
  High: { color: "text-emerald-600", label: "Supply: High" }
};
const SupplyConditionIndicator = ({
  supply,
  size = "md"
}) => {
  const { color, label } = supplyConfig[supply];
  const textClass = size === "sm" ? "text-xs" : "text-sm";
  return <span className={`font-medium ${color} ${textClass}`}>{label}</span>;
};
const DataFreshnessLabel = ({
  label = "Updated just now",
  isOffline = false
}) => <div className="flex items-center gap-1.5 text-[var(--hw-neutral-700)]">
    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
    <span className="text-xs">{label}</span>
    {isOffline && <WifiOff className="w-3.5 h-3.5 text-amber-500" />}
    {!isOffline && <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
  </div>;
const MarketStatusBadge = ({ isOffline = false }) => {
  if (isOffline) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
        <WifiOff className="w-3.5 h-3.5" />
        Offline
      </span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
      <Wifi className="w-3.5 h-3.5" />
      Online
    </span>;
};
export {
  DataFreshnessLabel,
  MarketStatusBadge,
  PriceDirectionIndicator,
  SupplyConditionIndicator
};
