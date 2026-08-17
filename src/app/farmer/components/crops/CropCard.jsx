import { ChevronRight, PauseCircle } from "lucide-react";
import { PHASE_CONFIG } from "./types";
import { CommodityIllustration } from "../market/CommodityIllustrations";
const PhasePill = ({ phase, isOnHold }) => {
  if (isOnHold) {
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200">
        <PauseCircle className="w-3 h-3" />
        On Hold
      </span>;
  }
  if (phase === "pre-harvest") {
    const planted = PHASE_CONFIG["growing"];
    const ph = PHASE_CONFIG["pre-harvest"];
    const Icon2 = planted.icon;
    return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${planted.color} ${planted.bg} ${planted.border} border`}>
        <Icon2 className="w-3 h-3" />
        Planted
        <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${ph.color} ${ph.bg}`}>
          Pre-Harvest
        </span>
      </span>;
  }
  const cfg = PHASE_CONFIG[phase] ?? PHASE_CONFIG["completed"];
  const Icon = cfg.icon;
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color} ${cfg.bg} ${cfg.border} border`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>;
};
function formatPesoRange(lo, hi) {
  const fmt = (n) => `\u20B1${Math.max(0, n).toLocaleString("en-PH")}`;
  return `${fmt(lo)}\u2013${fmt(hi)}`;
}
const CropCard = ({ crop, onView }) => {
  const price = crop.currentPrice ?? 0;
  const loProfit = Math.round((crop.harvestQuantity * price * 0.9 - crop.totalCost) / 1e3) * 1e3;
  const hiProfit = Math.floor((crop.harvestQuantity * price * 1.1 - crop.totalCost) / 1e3) * 1e3;
  const isCompleted = crop.phase === "completed";
  const bottomText = crop.isOnHold ? crop.holdReason ?? "On hold" : crop.nextMilestone;
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3">
      {
    /* Top row: icon + name + pill */
  }
      <div className="flex items-center gap-3">
        <CommodityIllustration commodityId={crop.commodity} className="w-10 h-10 flex-shrink-0" />
        <p className="font-bold text-[var(--hw-neutral-900)] flex-1 leading-tight">{crop.commodityName}</p>
        <PhasePill phase={crop.phase} isOnHold={crop.isOnHold} />
      </div>

      {
    /* Data rows */
  }
      <div className="space-y-1.5">
        <DataRow label="Harvest" value={crop.harvestDate} />
        <DataRow label="Current price" value={price ? `\u20B1${price}/kg` : "\u2014"} />
        {isCompleted && crop.actualSellingPrice != null ? <DataRow label="Sold at" value={`\u20B1${crop.actualSellingPrice}/kg`} /> : <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--hw-green-700)]">Estimated Profit</span>
            <span className="text-sm font-semibold text-emerald-600">
              {price ? formatPesoRange(loProfit, hiProfit) : "\u2014"}
            </span>
          </div>}
      </div>

      {
    /* Footer: milestone / hold reason + view crop */
  }
      <div className="flex items-center justify-between pt-1 border-t border-[var(--hw-neutral-100)] gap-2">
        <span className={`text-xs truncate flex-1 ${crop.isOnHold ? "text-amber-600" : "text-[var(--hw-green-700)]"}`}>
          {bottomText}
        </span>
        <button
    onClick={() => onView(crop.id)}
    className="inline-flex items-center gap-0.5 text-sm font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors whitespace-nowrap flex-shrink-0"
  >
          View crop <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>;
};
const DataRow = ({ label, value }) => <div className="flex items-center justify-between">
    <span className="text-sm text-[var(--hw-green-700)]">{label}</span>
    <span className="text-sm text-[var(--hw-neutral-900)]">{value}</span>
  </div>;
export {
  CropCard,
  PhasePill
};
