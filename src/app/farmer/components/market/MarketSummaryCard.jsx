import { ChevronRight } from "lucide-react";
const MarketSummaryCard = ({
  title = "Market conditions are mixed today",
  summary = "Kamatis prices are improving, while Talong supply may increase soon.",
  onAction,
  actionLabel = "See market update"
}) => <div className="bg-[var(--hw-green-50)] border border-[var(--hw-green-400)] rounded-2xl p-4 md:p-5">
    <p className="font-semibold text-[var(--hw-green-900)]">{title}</p>
    <p className="mt-1.5 text-sm text-[var(--hw-green-800)] leading-relaxed">{summary}</p>
    {onAction && <button
  onClick={onAction}
  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
>
        {actionLabel}
        <ChevronRight className="w-4 h-4" />
      </button>}
  </div>;
export {
  MarketSummaryCard
};
