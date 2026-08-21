import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  RefreshCw,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  X,
  SlidersHorizontal,
  Check
} from "lucide-react";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { MarketEmptyState } from "../components/market/MarketStates";
import { toCamelCase, formatPrice } from "../../global/utils/apiTransforms";
import { apiGet, parseResponse } from "../../global/api";

const OUTLOOK_TEXT = {
  Rising: "Price may rise next week",
  Falling: "Price may fall next week",
  Stable: "Price may stay stable",
  default: "No trend data"
};

const DIR_CFG = {
  Rising: { color: "text-emerald-600", Icon: TrendingUp, label: "Rising" },
  Falling: { color: "text-red-500", Icon: TrendingDown, label: "Falling" },
  Stable: { color: "text-blue-500", Icon: Minus, label: "Stable" },
  default: { color: "text-[var(--hw-neutral-500)]", Icon: Minus, label: "No trend data" }
};

const DEFAULT_FILTER = { direction: "All", sortBy: "name" };

const PricesFilterDrawer = ({ open, filter, onClose, onApply }) => {
  const [draft, setDraft] = useState(filter);
  React.useEffect(() => {
    if (open) setDraft(filter);
  }, [open, filter]);
  if (!open) return null;

  const chip = (active) =>
    `px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
      active
        ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white"
        : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"
    }`;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-y-0 md:right-0 md:left-auto md:w-72 bg-white rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-[var(--shadow-xl)] flex flex-col max-h-[88vh] md:max-h-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-200)]">
          <p className="font-semibold text-[var(--hw-neutral-900)]">Filter & Sort</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-900)] mb-2">Sort by</p>
            <div className="flex flex-col gap-2">
              {[
                ["name", "Commodity name (A–Z)"],
                ["rising-first", "Price rising first"],
                ["falling-first", "Price falling first"]
              ].map(([v, label]) => (
                <button key={v} onClick={() => setDraft((d) => ({ ...d, sortBy: v }))} className={chip(draft.sortBy === v)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-900)] mb-2">Price direction</p>
            <div className="flex flex-wrap gap-2">
              {["All", "Rising", "Stable", "Falling"].map((v) => (
                <button key={v} onClick={() => setDraft((d) => ({ ...d, direction: v }))} className={chip(draft.direction === v)}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[var(--hw-neutral-200)] flex gap-3">
          <button
            onClick={() => setDraft(DEFAULT_FILTER)}
            className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => onApply(draft)}
            className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />Apply
          </button>
        </div>
      </div>
    </>
  );
};

const CropPriceCard = ({ commodity, data, onViewDetails }) => {
  const unit = commodity.unitOfMeasure || 'kg';
  
  const primarySource = [
    { key: 'bangkerohanRetail', source: 'Bangkerohan', type: 'Retail' },
    { key: 'dftcRetail', source: 'DFTC', type: 'Retail' },
    { key: 'bangkerohanWholesale', source: 'Bangkerohan', type: 'Wholesale' },
    { key: 'dftcWholesale', source: 'DFTC', type: 'Wholesale' }
  ].find(s => data[s.key] != null) || { source: '-', type: '-', key: null };
  
  const hasPrice = primarySource.key != null && data[primarySource.key] != null;
  const hasForecast = hasPrice && data.range && data.range !== `-/${unit}`;
  
  const cfg = hasForecast ? (DIR_CFG[data.direction] || DIR_CFG.default) : DIR_CFG.default;
  const DirIcon = cfg.Icon;
  const outlook = hasForecast ? (OUTLOOK_TEXT[data.direction] || OUTLOOK_TEXT.default) : "No trend data";

  const formatPriceValue = (value) => {
    if (value === null || value === undefined || value === '') return `-/${unit}`;
    return `₱${value}/${unit}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3">
      {/* Header: icon + name + direction */}
      <div className="flex items-center gap-3">
        <CommodityIllustration 
          commodityId={commodity.id} 
          baseName={commodity.baseName}
          commodityName={commodity.name}
          className="w-10 h-10 flex-shrink-0" 
        />
        <p className="flex-1 font-semibold text-[var(--hw-neutral-900)]">{commodity.name || '–'}</p>
        <div className={`flex items-center gap-1 flex-shrink-0 ${hasForecast ? cfg.color : 'text-[var(--hw-neutral-500)]'}`}>
          {hasForecast && <DirIcon className="w-3.5 h-3.5" />}
          <span className="text-[13px] font-medium">{hasForecast ? cfg.label : 'No trend data'}</span>
        </div>
      </div>

      {/* Current prices — Single Primary Price */}
      <div className="mb-2">
        <p className="text-[12px] text-[var(--hw-neutral-900)] uppercase tracking-wide mb-0.5">
          {primarySource.source !== "-" ? `${primarySource.source} ${primarySource.type}` : "-"}
        </p>
        <p className="text-[15px] font-bold text-[var(--hw-neutral-900)]">
          {formatPriceValue(primarySource.key ? data[primarySource.key] : null)}
        </p>
      </div>

      {/* Outlook */}
      <div className="rounded-xl bg-[var(--hw-neutral-50)] px-3 py-2.5 space-y-0.5">
        <p className={`text-[13px] font-medium ${hasForecast ? cfg.color : 'text-[var(--hw-neutral-500)]'}`}>{outlook}</p>
        <p className="text-[12px] text-[var(--hw-neutral-900)]">
          Expected next {data.horizonDays || 7} days:{" "}
          <span className="font-semibold text-[var(--hw-neutral-900)]">{hasForecast ? data.range : `-/${unit}`}</span>
        </p>
      </div>

      {/* Action */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onViewDetails}
          className="flex-shrink-0 inline-flex items-center gap-0.5 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
        >
          View details
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

function PricesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  
  // API integration - fetch prices from backend
  const [commodities, setCommodities] = useState([]);
  const [priceData, setPriceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        const response = await apiGet('/prices?page_size=100');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await parseResponse(response);
        
        // Build commodities list from API response - STRICTLY FILTER TO TOP 10 ONLY
        const items = data.items || [];
        const commoditiesFromAPI = items
          .filter(item => item.is_top10 === true || item.isTop10 === true)
          .map(item => {
            const camelItem = toCamelCase(item);
            return {
              id: camelItem.commodityId,
              name: camelItem.name || '–',
              baseName: camelItem.baseName,
              variety: camelItem.variety,
              unitOfMeasure: camelItem.unitOfMeasure || 'kg',
              isTop10: camelItem.isTop10,
            };
          });
        
        setCommodities(commoditiesFromAPI);
        
        // Transform API response to match our component's expected format
        const transformed = {};
        items.forEach(item => {
          const camelItem = toCamelCase(item);
          const uom = camelItem.unitOfMeasure || 'kg';
          const hasLower = camelItem.forecast?.lowerForecast != null;
          const hasUpper = camelItem.forecast?.upperForecast != null;

          transformed[camelItem.commodityId] = {
            bangkerohanRetail: camelItem.prices?.bangkerohanRetail ?? null,
            bangkerohanWholesale: camelItem.prices?.bangkerohanWholesale ?? null,
            dftcRetail: camelItem.prices?.dftcRetail ?? null,
            dftcWholesale: camelItem.prices?.dftcWholesale ?? null,
            direction: camelItem.forecast?.trend || 'Stable',
            horizonDays: camelItem.forecast?.horizonDays || 7,
            range: (hasLower && hasUpper)
              ? `₱${formatPrice(camelItem.forecast.lowerForecast)}–₱${formatPrice(camelItem.forecast.upperForecast)}/${uom}`
              : `-/${uom}`,
          };
        });
        
        setPriceData(transformed);
        if (items.length > 0 && items[0].updated_at) {
          setLastUpdated(items[0].updated_at);
        } else if (items.length > 0 && items[0].updatedAt) {
          setLastUpdated(items[0].updatedAt);
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error);
        setCommodities([]);
        setPriceData({});
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, []);
  
  const activeCount = (filter.direction !== "All" ? 1 : 0) + (filter.sortBy !== "name" ? 1 : 0);
  
  const visible = useMemo(() => {
    let list = commodities.map(commodity => {
      const data = priceData[commodity.id];
      return {
        ...commodity,
        displayData: data || {
          bangkerohanRetail: null,
          bangkerohanWholesale: null,
          dftcRetail: null,
          dftcWholesale: null,
          direction: 'Stable',
          horizonDays: 7,
          range: `-/${commodity.unitOfMeasure || 'kg'}`,
        }
      };
    });
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => (c.name || '').toLowerCase().includes(q));
    }
    
    if (filter.direction !== "All") {
      list = list.filter((c) => c.displayData.direction === filter.direction);
    }
    
    list.sort((a, b) => {
      const ORDER_RISING = { Rising: 0, Stable: 1, Falling: 2 };
      const ORDER_FALLING = { Falling: 0, Stable: 1, Rising: 2 };
      if (filter.sortBy === "rising-first") return (ORDER_RISING[a.displayData.direction] ?? 1) - (ORDER_RISING[b.displayData.direction] ?? 1);
      if (filter.sortBy === "falling-first") return (ORDER_FALLING[a.displayData.direction] ?? 1) - (ORDER_FALLING[b.displayData.direction] ?? 1);
      return (a.name || '').localeCompare(b.name || '');
    });
    
    return list;
  }, [searchQuery, filter, commodities, priceData]);
  
  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--hw-green-700)]"></div>
          <p className="text-sm text-[var(--hw-neutral-700)]">Loading prices...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-4xl space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">Prices</h1>
          <p className="text-[15px] text-[var(--hw-neutral-900)] mt-0.5">
            Check today's price and likely price movement.
          </p>
        </div>

        {/* Search + filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hw-neutral-700)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search commodity…"
              className="w-full pl-9 pr-9 py-2.5 text-[15px] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-800)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setFilterOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)] transition-colors text-[14px] font-medium shadow-[var(--shadow-xs)] flex-shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--hw-green-700)] text-white text-[10px] font-bold">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* Cards grid */}
        {visible.length === 0 ? (
          searchQuery.trim() ? (
            <MarketEmptyState query={searchQuery} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-[var(--hw-neutral-100)] flex items-center justify-center mb-4">
                <RefreshCw className="w-8 h-8 text-[var(--hw-neutral-400)]" />
              </div>
              <p className="text-lg font-medium text-[var(--hw-neutral-900)] mb-1">No price data available</p>
              <p className="text-sm text-[var(--hw-neutral-700)]">Price data for top 10 commodities will appear here</p>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {visible.map((c) => (
              <CropPriceCard
                key={c.id}
                commodity={c}
                data={c.displayData}
                onViewDetails={() => navigate(`/farmer/prices/${c.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <PricesFilterDrawer
        open={filterOpen}
        filter={filter}
        onClose={() => setFilterOpen(false)}
        onApply={(f) => {
          setFilter(f);
          setFilterOpen(false);
        }}
      />
    </div>
  );
}

export {
  PricesPage as default
};
