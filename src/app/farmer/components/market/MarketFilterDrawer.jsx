import { SlidersHorizontal, X, Check } from "lucide-react";
import { MARKET_SOURCES, PRICE_TYPES } from "./mockData";
const DEFAULT_FILTERS = {
  marketSource: "All markets",
  priceType: "All",
  direction: "All",
  supply: "All",
  period: "All"
};
const MarketFilterButton = ({ activeCount, onClick }) => <button
  onClick={onClick}
  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors text-sm font-medium shadow-[var(--shadow-xs)]"
>
    <SlidersHorizontal className="w-4 h-4" />
    Filter
    {activeCount > 0 && <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--hw-green-700)] text-white text-[10px] font-bold">
        {activeCount}
      </span>}
  </button>;
const MarketSourceSelector = ({ value, onChange }) => <div>
    <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-2">Market source</p>
    <div className="flex flex-wrap gap-2">
      {MARKET_SOURCES.map((s) => <button
  key={s}
  onClick={() => onChange(s)}
  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${value === s ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"}`}
>
          {s}
        </button>)}
    </div>
  </div>;
const PriceTypeSelector = ({ value, onChange }) => <div>
    <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-2">Price type</p>
    <div className="flex flex-wrap gap-2">
      {PRICE_TYPES.map((t) => <button
  key={t}
  onClick={() => onChange(t)}
  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${value === t ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"}`}
>
          {t}
        </button>)}
    </div>
  </div>;
const PERIODS = ["All", "Today", "Last 3 days", "Last 7 days", "Last 30 days"];
const PeriodSelector = ({ value, onChange }) => <div>
    <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-2">Date or period</p>
    <div className="flex flex-wrap gap-2">
      {PERIODS.map((p) => <button
  key={p}
  onClick={() => onChange(p)}
  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${value === p ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"}`}
>
          {p}
        </button>)}
    </div>
  </div>;
const DIRECTIONS = ["All", "Rising", "Stable", "Falling"];
const SUPPLIES = ["All", "Low", "Moderate", "High"];
const MarketFilterDrawer = ({
  open,
  filters,
  onFiltersChange,
  onApply,
  onClear,
  onClose
}) => {
  if (!open) return null;
  const set = (key, val) => onFiltersChange({ ...filters, [key]: val });
  return <>
      {
    /* Backdrop */
  }
      <div
    className="fixed inset-0 z-40 bg-black/40"
    onClick={onClose}
    aria-hidden="true"
  />

      {
    /* Drawer — slides up from bottom on mobile, sidebar panel on md+ */
  }
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-y-0 md:right-0 md:left-auto md:w-80 bg-white rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-[var(--shadow-xl)] flex flex-col max-h-[90vh] md:max-h-none">
        {
    /* Header */
  }
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-200)]">
          <p className="font-semibold text-[var(--hw-neutral-900)]">Filter</p>
          <button
    onClick={onClose}
    className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-500)] transition-colors"
  >
            <X className="w-5 h-5" />
          </button>
        </div>

        {
    /* Body */
  }
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <MarketSourceSelector
    value={filters.marketSource}
    onChange={(v) => set("marketSource", v)}
  />

          <PriceTypeSelector
    value={filters.priceType}
    onChange={(v) => set("priceType", v)}
  />

          <PeriodSelector
    value={filters.period}
    onChange={(v) => set("period", v)}
  />

          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-2">Price direction</p>
            <div className="flex flex-wrap gap-2">
              {DIRECTIONS.map((d) => <button
    key={d}
    onClick={() => set("direction", d)}
    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${filters.direction === d ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                  {d}
                </button>)}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-2">Supply condition</p>
            <div className="flex flex-wrap gap-2">
              {SUPPLIES.map((s) => <button
    key={s}
    onClick={() => set("supply", s)}
    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${filters.supply === s ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                  {s}
                </button>)}
            </div>
          </div>
        </div>

        {
    /* Footer */
  }
        <div className="px-5 py-4 border-t border-[var(--hw-neutral-200)] flex gap-3">
          <button
    onClick={onClear}
    className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            Clear filters
          </button>
          <button
    onClick={onApply}
    className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors flex items-center justify-center gap-1.5"
  >
            <Check className="w-4 h-4" />
            Apply filters
          </button>
        </div>
      </div>
    </>;
};
export {
  DEFAULT_FILTERS,
  MarketFilterButton,
  MarketFilterDrawer,
  MarketSourceSelector,
  PeriodSelector,
  PriceTypeSelector
};
