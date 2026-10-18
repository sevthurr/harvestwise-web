import { SearchX, WifiOff, AlertTriangle } from "lucide-react";

const MarketLoadingState = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--hw-neutral-200)] flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-28 rounded bg-[var(--hw-neutral-200)]" />
            <div className="h-3 w-16 rounded bg-[var(--hw-neutral-200)]" />
          </div>
        </div>
        <div className="h-16 w-full rounded-xl bg-[var(--hw-neutral-200)]" />
      </div>
    ))}
  </div>
);
const MarketEmptyState = ({ query }) => <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
    <SearchX className="w-10 h-10 text-[var(--hw-neutral-300)]" />
    <p className="font-semibold text-[var(--hw-neutral-700)]">
      {query ? `No results for "${query}"` : "No commodities found"}
    </p>
    <p className="text-sm text-[var(--hw-neutral-500)] max-w-xs">
      {query ? "Try a different commodity name or clear your search." : "Try changing the active filters."}
    </p>
  </div>;
const MarketOfflineState = ({
  savedAt = "today at 8:30 AM"
}) => <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
    <WifiOff className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
    <div>
      <p className="text-sm font-semibold text-amber-800">You are offline</p>
      <p className="text-sm text-amber-700 mt-0.5">
        Showing market information saved {savedAt}.
      </p>
    </div>
  </div>;
const MarketErrorState = ({ onRetry }) => <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
    <AlertTriangle className="w-10 h-10 text-amber-400" />
    <p className="font-semibold text-[var(--hw-neutral-700)]">Market update failed</p>
    <p className="text-sm text-[var(--hw-neutral-500)] max-w-xs">
      We could not load the latest market information. Please check your connection and try again.
    </p>
    {onRetry && <button
  onClick={onRetry}
  className="mt-2 px-4 py-2 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
>
        Try again
      </button>}
  </div>;
export {
  MarketEmptyState,
  MarketErrorState,
  MarketLoadingState,
  MarketOfflineState
};
