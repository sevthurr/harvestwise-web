import { ChevronRight } from "lucide-react";
import { CommodityIllustration } from "../../../global/components/shared/CommodityIllustrations";
import { PriceDirectionIndicator, SupplyConditionIndicator } from "./Indicators";
const CommodityMarketCard = ({
  commodity,
  onViewDetails
}) => {
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] p-4 shadow-[var(--shadow-xs)] flex flex-col gap-3">
      {
    /* Top row */
  }
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <CommodityIllustration commodityId={commodity.id} className="w-12 h-12" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--hw-neutral-900)]">{commodity.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <PriceDirectionIndicator direction={commodity.direction} size="sm" />
            <SupplyConditionIndicator supply={commodity.supply} size="sm" />
          </div>
        </div>
        {
    /* Reference price — secondary */
  }
        <div className="flex-shrink-0 text-right">
          <p className="text-xs text-[var(--hw-neutral-700)]">ref. price</p>
          <p className="font-semibold text-[var(--hw-neutral-700)]">
            ₱{commodity.price}/{commodity.unit}
          </p>
        </div>
      </div>

      {
    /* Summary */
  }
      <p className="text-sm text-[var(--hw-neutral-900)] leading-snug">{commodity.summary}</p>

      {
    /* Action */
  }
      <button
    onClick={() => onViewDetails(commodity.id)}
    className="self-start inline-flex items-center gap-1 text-sm font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
        View details
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>;
};
export {
  CommodityMarketCard
};
