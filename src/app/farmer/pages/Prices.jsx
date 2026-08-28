import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
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
import { apiGet, parseResponse } from "../../global/api";
import { toCamelCase, formatPrice } from "../../global/utils/apiTransforms";
import { SkeletonPriceGrid } from "../components/shared/FarmerSkeletons";

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

const DEFAULT_FILTER = { direction: "All", sortBy: "name", category: "All", unit: "All" };

const PricesFilterDrawer = ({ open, filter, onClose, onApply, categories, units }) => {
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
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-y-0 md:right-0 md:left-auto md:w-80 bg-white rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-[var(--shadow-xl)] flex flex-col max-h-[88vh] md:max-h-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-200)]">
          <p className="font-semibold text-[var(--hw-neutral-900)]">Filter & Sort</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Sort by */}
          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-900)] mb-2">Sort by</p>
            <div className="flex flex-col gap-2">
              {[
                ["name", "Commodity name (A–Z)"],
                ["rising-first", "Price rising first"],
                ["falling-first", "Price falling first"],
                ["price-low", "Lowest price first"],
                ["price-high", "Highest price first"]
              ].map(([v, label]) => (
                <button key={v} onClick={() => setDraft((d) => ({ ...d, sortBy: v }))} className={chip(draft.sortBy === v)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Price direction */}
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

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-[var(--hw-neutral-900)] mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {["All", ...categories].map((v) => (
                  <button key={v} onClick={() => setDraft((d) => ({ ...d, category: v }))} className={chip(draft.category === v)}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Unit */}
          {units.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-[var(--hw-neutral-900)] mb-2">Unit</p>
              <div className="flex flex-wrap gap-2">
                {["All", ...units].map((v) => (
                  <button key={v} onClick={() => setDraft((d) => ({ ...d, unit: v }))} className={chip(draft.unit === v)}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
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
  
  const hasForecast = data.range && data.range !== `-/${unit}` && data.range !== `-\u2009/\u2009${unit}`;
  const cfg = hasForecast ? (DIR_CFG[data.direction] || DIR_CFG.default) : DIR_CFG.default;
  const DirIcon = cfg.Icon;
  const outlook = hasForecast ? (OUTLOOK_TEXT[data.direction] || OUTLOOK_TEXT.default) : "No trend data";

  const formatPriceValue = (value) => {
    if (value === null || value === undefined || value === '') return `-/${unit}`;
    const clean = typeof value === 'string' ? value.replace(/^₱+/, '') : value;
    return `₱${clean}/${unit}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3">
      {/* Header: icon + name + direction */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CommodityIllustration 
            commodityId={commodity.id} 
            baseName={commodity.baseName}
            commodityName={commodity.name}
            className="w-10 h-10 flex-shrink-0" 
          />
          <p className="font-semibold text-[var(--hw-neutral-900)] text-base truncate">{commodity.name || '–'}</p>
        </div>
        <div className={`flex items-center gap-1 flex-shrink-0 ${hasForecast ? cfg.color : 'text-[var(--hw-neutral-500)]'}`}>
          {hasForecast && <DirIcon className="w-3.5 h-3.5" />}
          <span className="text-[13px] font-medium">{hasForecast ? cfg.label : 'No trend data'}</span>
        </div>
      </div>

      {/* 4-Tier Market Price Grid */}
      <div className="grid grid-cols-2 gap-y-3 gap-x-4 my-1">
        <div>
          <p className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wider">
            BANGKEROHAN RETAIL
          </p>
          <p className="text-[15px] font-bold text-[var(--hw-neutral-900)] mt-0.5">
            {formatPriceValue(data.bangkerohanRetail)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wider">
            DFTC RETAIL
          </p>
          <p className="text-[15px] font-bold text-[var(--hw-neutral-900)] mt-0.5">
            {formatPriceValue(data.dftcRetail)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wider">
            BANGKEROHAN WHOLESALE
          </p>
          <p className="text-[15px] font-bold text-[var(--hw-neutral-900)] mt-0.5">
            {formatPriceValue(data.bangkerohanWholesale)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wider">
            DFTC WHOLESALE
          </p>
          <p className="text-[15px] font-bold text-[var(--hw-neutral-900)] mt-0.5">
            {formatPriceValue(data.dftcWholesale)}
          </p>
        </div>
      </div>

      {/* Outlook summary */}
      <div className="rounded-xl bg-[var(--hw-neutral-50)] px-3.5 py-3 space-y-0.5">
        <p className={`text-[13px] font-medium ${hasForecast ? cfg.color : 'text-[var(--hw-neutral-500)]'}`}>{outlook}</p>
        <p className="text-[12px] text-[var(--hw-neutral-900)]">
          Expected next {data.horizonDays || 7} days:{" "}
          <span className="font-semibold text-[var(--hw-neutral-900)]">{hasForecast ? data.range : `-/${unit}`}</span>
        </p>
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <p className="text-[12px] text-[var(--hw-neutral-500)] truncate">
          {data.advisoryText || (data.direction === 'Rising' ? 'Price may improve soon.' : data.direction === 'Falling' ? 'Price may drop soon.' : 'Price is steady.')}
        </p>
        <button
          onClick={() => onViewDetails(commodity.id)}
          className="flex-shrink-0 inline-flex items-center gap-0.5 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors cursor-pointer"
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

  const { data: apiData, isLoading: loading } = useQuery({
    queryKey: ["prices", "list"],
    queryFn: async () => {
      const response = await apiGet("/prices?is_top10=true&page_size=50");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return parseResponse(response);
    },
    staleTime: 1000 * 60 * 30,
  });

  const { commodities, priceData } = useMemo(() => {
    if (!apiData) return { commodities: [], priceData: {} };

    const items = apiData.items || [];
    const baseMap = new Map();
    const transformed = {};

    items.forEach(item => {
      const camelItem = toCamelCase(item);

      const rawName = camelItem.baseName || camelItem.name || '–';
      let baseName = rawName;
      if (baseName.includes(' - ')) {
        baseName = baseName.split(' - ')[0].trim();
      }
      if (baseName.includes(' (')) {
        baseName = baseName.split(' (')[0].trim();
      }
      const uom = camelItem.unitOfMeasure || 'kg';
      const hasLower = camelItem.forecast?.lowerForecast != null;
      const hasUpper = camelItem.forecast?.upperForecast != null;

      const itemPrices = {
        bangkerohanRetail: camelItem.prices?.bangkerohanRetail ?? null,
        bangkerohanWholesale: camelItem.prices?.bangkerohanWholesale ?? null,
        dftcRetail: camelItem.prices?.dftcRetail ?? null,
        dftcWholesale: camelItem.prices?.dftcWholesale ?? null,
        direction: camelItem.forecast?.trend || 'Stable',
        horizonDays: camelItem.forecast?.horizonDays || 7,
        range: (hasLower && hasUpper)
          ? `${formatPrice(camelItem.forecast.lowerForecast)}\u2013${formatPrice(camelItem.forecast.upperForecast)}/${uom}`
          : `-\u2009/\u2009${uom}`,
      };

      transformed[camelItem.commodityId] = itemPrices;

      const variantItem = {
        id: camelItem.commodityId,
        name: camelItem.name,
        category: camelItem.category,
        variety: camelItem.variety,
        unitOfMeasure: uom,
        displayData: itemPrices,
      };

      if (!baseMap.has(baseName)) {
        baseMap.set(baseName, {
          id: camelItem.commodityId,
          name: baseName,
          baseName: baseName,
          category: camelItem.category,
          unitOfMeasure: uom,
          isTop10: true,
          displayData: { ...itemPrices },
          variants: [variantItem],
        });
      } else {
        const existing = baseMap.get(baseName);
        existing.variants.push(variantItem);

        const existingHasPrice = [
          existing.displayData.bangkerohanRetail,
          existing.displayData.bangkerohanWholesale,
          existing.displayData.dftcRetail,
          existing.displayData.dftcWholesale
        ].some(v => v != null);

        const thisHasPrice = [
          itemPrices.bangkerohanRetail,
          itemPrices.bangkerohanWholesale,
          itemPrices.dftcRetail,
          itemPrices.dftcWholesale
        ].some(v => v != null);

        if (!existingHasPrice && thisHasPrice) {
          existing.id = camelItem.commodityId;
        }

        existing.displayData = {
          bangkerohanRetail: existing.displayData.bangkerohanRetail ?? itemPrices.bangkerohanRetail,
          bangkerohanWholesale: existing.displayData.bangkerohanWholesale ?? itemPrices.bangkerohanWholesale,
          dftcRetail: existing.displayData.dftcRetail ?? itemPrices.dftcRetail,
          dftcWholesale: existing.displayData.dftcWholesale ?? itemPrices.dftcWholesale,
          direction: (existing.displayData.direction && existing.displayData.direction !== 'Stable') 
            ? existing.displayData.direction 
            : itemPrices.direction,
          horizonDays: existing.displayData.horizonDays || itemPrices.horizonDays,
          range: (existing.displayData.range && !existing.displayData.range.startsWith('-')) 
            ? existing.displayData.range 
            : itemPrices.range,
        };
      }
    });

    return {
      commodities: Array.from(baseMap.values()),
      priceData: transformed,
    };
  }, [apiData]);
  
  const activeCount = (filter.direction !== "All" ? 1 : 0)
    + (filter.sortBy !== "name" ? 1 : 0)
    + (filter.category !== "All" ? 1 : 0)
    + (filter.unit !== "All" ? 1 : 0);

  const categories = useMemo(() => {
    const set = new Set();
    commodities.forEach((c) => { if (c.category) set.add(c.category); });
    return [...set].sort();
  }, [commodities]);

  const units = useMemo(() => {
    const set = new Set();
    commodities.forEach((c) => { if (c.unitOfMeasure) set.add(c.unitOfMeasure); });
    return [...set].sort();
  }, [commodities]);
  
  const visible = useMemo(() => {
    let list = commodities.map(commodity => {
      const data = priceData[commodity.id] || commodity.displayData;
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

    if (filter.category !== "All") {
      list = list.filter((c) => c.category === filter.category);
    }

    if (filter.unit !== "All") {
      list = list.filter((c) => c.unitOfMeasure === filter.unit);
    }
    
    list.sort((a, b) => {
      const ORDER_RISING = { Rising: 0, Stable: 1, Falling: 2 };
      const ORDER_FALLING = { Falling: 0, Stable: 1, Rising: 2 };
      if (filter.sortBy === "rising-first") return (ORDER_RISING[a.displayData.direction] ?? 1) - (ORDER_RISING[b.displayData.direction] ?? 1);
      if (filter.sortBy === "falling-first") return (ORDER_FALLING[a.displayData.direction] ?? 1) - (ORDER_FALLING[b.displayData.direction] ?? 1);
      if (filter.sortBy === "price-low" || filter.sortBy === "price-high") {
        const priceA = a.displayData.bangkerohanRetail ?? a.displayData.dftcRetail ?? Infinity;
        const priceB = b.displayData.bangkerohanRetail ?? b.displayData.dftcRetail ?? Infinity;
        return filter.sortBy === "price-low" ? priceA - priceB : priceB - priceA;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
    
    return list;
  }, [searchQuery, filter, commodities, priceData]);
  
  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">Prices</h1>
            <p className="text-[15px] text-[var(--hw-neutral-900)] mt-0.5">
              Check today's price and likely price movement.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-[var(--hw-neutral-600)] flex-shrink-0 mt-1">
            <RefreshCw className="w-3.5 h-3.5 text-[var(--hw-neutral-500)]" />
            <span>Updated today at 7:30 AM</span>
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hw-neutral-700)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              disabled={loading}
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
        {loading ? (
          <SkeletonPriceGrid count={6} />
        ) : visible.length === 0 ? (
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
      <PricesFilterDrawer
        open={filterOpen}
        filter={filter}
        onClose={() => setFilterOpen(false)}
        onApply={(f) => {
          setFilter(f);
          setFilterOpen(false);
        }}
        categories={categories}
        units={units}
      />
    </div>
  );
}

export {
  PricesPage as default
};
