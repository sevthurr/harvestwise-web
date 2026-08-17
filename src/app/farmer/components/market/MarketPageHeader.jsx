import { Search, X } from "lucide-react";
import { DataFreshnessLabel, MarketStatusBadge } from "./Indicators";
import { MarketFilterButton } from "./MarketFilterDrawer";
const CommoditySearch = ({ value, onChange, onClear }) => <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hw-neutral-400)] pointer-events-none" />
    <input
  type="text"
  value={value}
  onChange={(e) => onChange(e.target.value)}
  placeholder="Search commodity…"
  className="w-full pl-9 pr-9 py-2 text-sm bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition"
/>
    {value && <button
  onClick={onClear}
  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)]"
  aria-label="Clear search"
>
        <X className="w-3.5 h-3.5" />
      </button>}
  </div>;
const MarketPageHeader = ({
  isOffline = false,
  activeFilterCount,
  searchQuery,
  onSearchChange,
  onSearchClear,
  onFilterClick
}) => <div className="space-y-3">
    {
  /* Title row */
}
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--hw-neutral-900)]">Market</h1>
        <p className="text-[var(--hw-neutral-900)] mt-0.5 text-sm">
          Check current prices, supply conditions, and short-term market movement.
        </p>
      </div>
      <MarketStatusBadge isOffline={isOffline} />
    </div>

    <DataFreshnessLabel label="Updated Jun 24, 2026 at 7:30 AM" isOffline={isOffline} />

    {
  /* Search + filter row */
}
    <div className="flex items-center gap-2">
      <CommoditySearch
  value={searchQuery}
  onChange={onSearchChange}
  onClear={onSearchClear}
/>
      <MarketFilterButton activeCount={activeFilterCount} onClick={onFilterClick} />
    </div>
  </div>;
export {
  CommoditySearch,
  MarketPageHeader
};
