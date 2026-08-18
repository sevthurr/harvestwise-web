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
import { CommodityIllustration } from "../components/market/CommodityIllustrations";
import { MarketEmptyState } from "../components/market/MarketStates";
import { toCamelCase, formatPrice } from "../../global/utils/apiTransforms";
const OUTLOOK_TEXT = {
  Rising: "Price may rise next week",
  Falling: "Price may fall next week",
  Stable: "Price may stay stable"
};
const MEANING_TEXT = {
  Rising: "Price may improve soon.",
  Falling: "Be careful before planting more.",
  Stable: "Price is not changing much."
};
const DIR_CFG = {
  Rising: { color: "text-emerald-600", Icon: TrendingUp },
  Falling: { color: "text-red-500", Icon: TrendingDown },
  Stable: { color: "text-blue-500", Icon: Minus }
};
const DEFAULT_FILTER = { direction: "All", sortBy: "name" };
const PricesFilterDrawer = ({ open, filter, onClose, onApply }) => {
  const [draft, setDraft] = useState(filter);
  React.useEffect(() => {
    if (open) setDraft(filter);
  }, [open, filter]);
  if (!open) return null;
  const chip = (active) => `px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${active ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`;
  return <>
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
    ["name", "Commodity name (A\u2013Z)"],
    ["rising-first", "Price rising first"],
    ["falling-first", "Price falling first"]
  ].map(([v, label]) => <button key={v} onClick={() => setDraft((d) => ({ ...d, sortBy: v }))} className={chip(draft.sortBy === v)}>
                  {label}
                </button>)}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-900)] mb-2">Price direction</p>
            <div className="flex flex-wrap gap-2">
              {["All", "Rising", "Stable", "Falling"].map((v) => <button key={v} onClick={() => setDraft((d) => ({ ...d, direction: v }))} className={chip(draft.direction === v)}>
                  {v}
                </button>)}
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
    </>;
};
const CropPriceCard = ({ commodity, data, onViewDetails }) => {
  const cfg = DIR_CFG[data.direction];
  const DirIcon = cfg.Icon;
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3">

      {
    /* Header: icon + name + direction */
  }
      <div className="flex items-center gap-3">
        <CommodityIllustration 
          commodityId={commodity.id} 
          baseName={commodity.baseName}
          commodityName={commodity.name}
          className="w-10 h-10 flex-shrink-0" 
        />
        <p className="flex-1 font-semibold text-[var(--hw-neutral-900)]">{commodity.name}</p>
        <div className={`flex items-center gap-1 flex-shrink-0 ${cfg.color}`}>
          <DirIcon className="w-3.5 h-3.5" />
          <span className="text-[13px] font-medium">{data.direction}</span>
        </div>
      </div>

      {
    /* Current prices — 2×2 grid */
  }
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <p className="text-[12px] text-[var(--hw-neutral-900)] uppercase tracking-wide mb-0.5">Bangkerohan Retail</p>
          <p className="text-[15px] font-bold text-[var(--hw-neutral-900)]">
            {data.bangkerohanRetail ? `₱${data.bangkerohanRetail}/kg` : '-'}
          </p>
        </div>
        <div>
          <p className="text-[12px] text-[var(--hw-neutral-900)] uppercase tracking-wide mb-0.5">DFTC Retail</p>
          <p className="text-[15px] font-bold text-[var(--hw-neutral-900)]">
            {data.dftcRetail ? `₱${data.dftcRetail}/kg` : '-'}
          </p>
        </div>
        <div>
          <p className="text-[12px] text-[var(--hw-neutral-900)] uppercase tracking-wide mb-0.5">Bangkerohan Wholesale</p>
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
            {data.bangkerohanWholesale ? `₱${data.bangkerohanWholesale}/kg` : '-'}
          </p>
        </div>
        <div>
          <p className="text-[12px] text-[var(--hw-neutral-900)] uppercase tracking-wide mb-0.5">DFTC Wholesale</p>
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
            {data.dftcWholesale ? `₱${data.dftcWholesale}/kg` : '-'}
          </p>
        </div>
      </div>

      {
    /* Outlook */
  }
      <div className="rounded-xl bg-[var(--hw-neutral-50)] px-3 py-2.5 space-y-0.5">
        <p className={`text-[13px] font-medium ${cfg.color}`}>{OUTLOOK_TEXT[data.direction]}</p>
        <p className="text-[12px] text-[var(--hw-neutral-900)]">
          Expected next 7 days:{" "}
          <span className="font-semibold text-[var(--hw-neutral-900)]">{data.range}</span>
        </p>
      </div>

      {
    /* Meaning + action */
  }
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug flex-1">
          {MEANING_TEXT[data.direction]}
        </p>
        <button
    onClick={onViewDetails}
    className="flex-shrink-0 inline-flex items-center gap-0.5 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
          View details
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>;
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
        console.log('Fetching prices from API...');
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
        const response = await fetch(`${apiUrl}/prices?page_size=100`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API response:', data);
        
        // Build commodities list from API response - FILTER TO TOP 10 ONLY
        const commoditiesFromAPI = data.items
          .filter(item => {
            // Filter for top 10 commodities
            const isTop10 = item.is_top10 === true;
            console.log('Checking commodity:', item.name, 'is_top10:', item.is_top10, 'filtered:', isTop10);
            return isTop10;
          })
          .map(item => {
            const camelItem = toCamelCase(item);
            console.log('Mapped top-10 commodity:', camelItem.name, 'baseName:', camelItem.baseName);
            return {
              id: camelItem.commodityId,
              name: camelItem.name,
              baseName: camelItem.baseName,
              variety: camelItem.variety,
              isTop10: camelItem.isTop10,
              // Store other useful data
              ...camelItem
            };
          });
        
        console.log('Top 10 Commodities from API:', commoditiesFromAPI);
        setCommodities(commoditiesFromAPI);
        
        // Transform API response to match our component's expected format
        const transformed = {};
        data.items.forEach(item => {
          const camelItem = toCamelCase(item);
          console.log('Transformed item:', camelItem);
          transformed[camelItem.commodityId] = {
            bangkerohanRetail: camelItem.prices?.bangkerohanRetail || 0,
            bangkerohanWholesale: camelItem.prices?.bangkerohanWholesale || 0,
            dftcRetail: camelItem.prices?.dftcRetail || 0,
            dftcWholesale: camelItem.prices?.dftcWholesale || 0,
            direction: camelItem.forecast?.trend || 'Stable',
            range: camelItem.forecast
              ? `${formatPrice(camelItem.forecast.lowerForecast)}–${formatPrice(camelItem.forecast.upperForecast)}/kg`
              : '–',
          };
        });
        
        console.log('Final priceData:', transformed);
        setPriceData(transformed);
        if (data.items.length > 0) {
          setLastUpdated(data.items[0].updated_at);
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error);
        console.error('Error details:', error.message);
        // On error, show empty lists
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
    // Use commodities from API (database)
    let list = commodities.map(commodity => {
      const hasPriceData = priceData[commodity.id];
      return {
        ...commodity,
        hasPriceData,
        // Use API data if available, otherwise use placeholders
        displayData: hasPriceData ? priceData[commodity.id] : {
          bangkerohanRetail: 0,
          bangkerohanWholesale: 0,
          dftcRetail: 0,
          dftcWholesale: 0,
          direction: 'Stable',
          range: '-',
        }
      };
    });
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    
    if (filter.direction !== "All") {
      list = list.filter((c) => c.displayData.direction === filter.direction);
    }
    
    list.sort((a, b) => {
      const ORDER_RISING = { Rising: 0, Stable: 1, Falling: 2 };
      const ORDER_FALLING = { Falling: 0, Stable: 1, Rising: 2 };
      if (filter.sortBy === "rising-first") return ORDER_RISING[a.displayData.direction] - ORDER_RISING[b.displayData.direction];
      if (filter.sortBy === "falling-first") return ORDER_FALLING[a.displayData.direction] - ORDER_FALLING[b.displayData.direction];
      return a.name.localeCompare(b.name);
    });
    
    return list;
  }, [searchQuery, filter, commodities, priceData]);
  
  // Show loading state
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--hw-green-700)]"></div>
        <p className="text-sm text-[var(--hw-neutral-700)]">Loading prices...</p>
      </div>
    </div>;
  }
  
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-4xl space-y-5">

        {
    /* Header */
  }
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">Prices</h1>
            <div className="flex items-center gap-1.5 text-[var(--hw-neutral-900)] flex-shrink-0 mt-1">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-[13px] whitespace-nowrap">Updated today at 7:30 AM</span>
            </div>
          </div>
          <p className="text-[15px] text-[var(--hw-neutral-900)] mt-0.5">
            Check today's price and likely price movement.
          </p>
        </div>

        {
    /* Search + filter */
  }
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
            {searchQuery && <button
    onClick={() => setSearchQuery("")}
    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-800)]"
  >
                <X className="w-3.5 h-3.5" />
              </button>}
          </div>
          <button
    onClick={() => setFilterOpen(true)}
    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)] transition-colors text-[14px] font-medium shadow-[var(--shadow-xs)] flex-shrink-0"
  >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
            {activeCount > 0 && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--hw-green-700)] text-white text-[10px] font-bold">
                {activeCount}
              </span>}
          </button>
        </div>

        {
    /* Cards grid */
  }
        {visible.length === 0 ? (
          searchQuery.trim() ? (
            // Filtered/searched to nothing
            <MarketEmptyState query={searchQuery} />
          ) : (
            // No commodities from API
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-[var(--hw-neutral-100)] flex items-center justify-center mb-4">
                <RefreshCw className="w-8 h-8 text-[var(--hw-neutral-400)]" />
              </div>
              <p className="text-lg font-medium text-[var(--hw-neutral-900)] mb-1">No commodities available</p>
              <p className="text-sm text-[var(--hw-neutral-700)]">Top 10 commodities will appear here once data is available</p>
            </div>
          )
        ) : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {visible.map((c) => {
              console.log('Rendering commodity:', c);
              return <CropPriceCard
                key={c.id}
                commodity={c}
                data={c.displayData}
                onViewDetails={() => navigate(`/farmer/prices/${c.id}`)}
              />;
            })}
          </div>}
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
    </div>;
}
export {
  PricesPage as default
};
