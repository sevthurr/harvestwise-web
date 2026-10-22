import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
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
import { useLanguage } from "../../global/contexts/LanguageContext";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { MarketEmptyState } from "../components/market/MarketStates";
import { apiGet, parseResponse } from "../../global/api";
import { toCamelCase } from "../../global/utils/apiTransforms";
import { SkeletonPriceGrid } from "../components/shared/FarmerSkeletons";
import { fetchFarmerProfile } from "../../global/hooks/useFarmerPrefetch";
import { sortWithPreferredFirst, isPreferredCrop } from "../utils/cropPreferences";
import { PreferredStar } from "../components/shared/PreferredStar";
import { getCategoryFor } from "../../global/data/commodities";
import * as pricesApi from "../../../services/api/pricesApi";

const DIR_CFG = {
  Rising: { color: "text-emerald-700", bg: "bg-emerald-50/60", Icon: TrendingUp, key: "farmer.prices.trend_rising", label: "Rising" },
  Falling: { color: "text-red-700", bg: "bg-red-50/60", Icon: TrendingDown, key: "farmer.prices.trend_falling", label: "Falling" },
  Stable: { color: "text-blue-700", bg: "bg-blue-50/60", Icon: Minus, key: "farmer.prices.trend_stable", label: "Stable" },
  default: { color: "text-[var(--hw-neutral-500)]", bg: "bg-[var(--hw-neutral-50)]", Icon: Minus, key: "farmer.prices.trend_no_data", label: "No trend data" }
};

function getDirectionFromData(trendDetail, fallbackForecast) {
  const forecast = trendDetail?.forecast || fallbackForecast;
  if (!forecast || !forecast.trend) return null;
  const forecastPrice = forecast.forecast_midpoint != null
    ? Number(forecast.forecast_midpoint)
    : (forecast.forecastMidpoint != null ? Number(forecast.forecastMidpoint) : null);
  const records = trendDetail?.recent_records || trendDetail?.recentRecords || [];
  if (trendDetail) {
    const hasForecast = records.length > 0 && forecastPrice != null;
    return hasForecast ? forecast.trend : null;
  }
  return forecastPrice != null ? forecast.trend : null;
}

const DEFAULT_FILTER = { direction: "All", sortBy: "name", category: "All" };

const PricesFilterDrawer = ({ open, filter, onClose, onApply, categories }) => {
  const { t } = useLanguage();
  const [draft, setDraft] = useState(filter);
  React.useEffect(() => {
    if (open) setDraft(filter);
  }, [open, filter]);
  if (!open) return null;

  const chip = (active) =>
    `px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
      active
        ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white"
        : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"
    }`;

  const sortOptions = [
    ["name", t("farmer.prices.sort_name", {}, "Commodity name (A–Z)")],
    ["rising-first", t("farmer.prices.sort_rising_first", {}, "Price rising first")],
    ["falling-first", t("farmer.prices.sort_falling_first", {}, "Price falling first")],
    ["price-low", t("farmer.prices.sort_price_low", {}, "Lowest price first")],
    ["price-high", t("farmer.prices.sort_price_high", {}, "Highest price first")]
  ];

  const directionOptions = [
    ["All", "All"],
    ["Rising", t("farmer.prices.trend_rising", {}, "Rising")],
    ["Stable", t("farmer.prices.trend_stable", {}, "Stable")],
    ["Falling", t("farmer.prices.trend_falling", {}, "Falling")]
  ];

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-[70] md:inset-y-0 md:right-0 md:left-auto md:w-80 bg-white rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-[var(--shadow-xl)] flex flex-col max-h-[88vh] md:max-h-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-200)] flex-shrink-0">
          <p className="font-semibold text-[var(--hw-neutral-900)]">{t("farmer.prices.filter_and_sort", {}, "Filter & Sort")}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Sort by */}
          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-900)] mb-2">{t("farmer.prices.sort_by", {}, "Sort by")}</p>
            <div className="flex flex-col gap-2">
              {sortOptions.map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, sortBy: v }))}
                  className={`w-full py-2.5 px-4 rounded-full text-[13px] font-medium border transition-colors text-center ${
                    draft.sortBy === v
                      ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white"
                      : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Price direction */}
          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-900)] mb-2">{t("farmer.prices.direction_label", {}, "Price direction")}</p>
            <div className="flex flex-wrap gap-2">
              {directionOptions.map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, direction: v }))}
                  className={chip(draft.direction === v)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-[var(--hw-neutral-900)] mb-2">{t("farmer.prices.category_label", {}, "Category")}</p>
              <div className="flex flex-wrap gap-2">
                {["All", ...categories].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, category: v }))}
                    className={chip(draft.category === v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="px-5 py-4 border-t border-[var(--hw-neutral-200)] flex gap-3 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={() => {
              setDraft(DEFAULT_FILTER);
              onApply(DEFAULT_FILTER);
            }}
            className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
          >
            {t("farmer.prices.clear", {}, t("common.clear", {}, "Clear"))}
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-[var(--shadow-xs)]"
            aria-label="Save filter"
          >
            <Check className="w-4 h-4" />{t("farmer.prices.save", {}, t("common.save", {}, "Save"))}
          </button>
        </div>
      </div>
    </>
  );
};

const CropPriceCard = ({ commodity, data, onViewDetails, isPreferred = false }) => {
  const { t } = useLanguage();
  const unit = commodity.unitOfMeasure || 'kg';
  const direction = data.direction ?? getDirectionFromData(data.trendDetail, commodity.forecast);
  const hasForecast = Boolean(direction);
  const cfg = direction ? (DIR_CFG[direction] || DIR_CFG.default) : DIR_CFG.default;
  const DirIcon = cfg.Icon;
  const outlook = hasForecast
    ? (direction === 'Rising' ? t("farmer.prices.micro_rising", {}, "Price may improve soon.") : direction === 'Falling' ? t("farmer.prices.micro_falling", {}, "Price may drop soon.") : t("farmer.prices.micro_steady", {}, "Price is steady."))
    : data.trendError
      ? t("farmer.prices.trend_unavailable", {}, "Price trend unavailable")
      : t("farmer.prices.trend_no_data", {}, "No trend data");

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
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-semibold text-[var(--hw-neutral-900)] text-base truncate">{commodity.name || '–'}</p>
            {isPreferred && (
              <PreferredStar className="w-4 h-4 text-amber-500" />
            )}
          </div>
        </div>
        <div className={`flex items-center gap-1 flex-shrink-0 ${hasForecast ? cfg.color : 'text-[var(--hw-neutral-500)]'}`}>
          {hasForecast && <DirIcon className="w-3.5 h-3.5" />}
          <span className="text-[13px] font-medium">
            {data.trendLoading
                ? t("farmer.prices.trend_loading", {}, "Loading trend")
              : hasForecast
                ? t(cfg.key, {}, cfg.label)
                : outlook}
          </span>
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
      <div className={`rounded-xl px-3.5 py-2.5 ${hasForecast ? (cfg.bg || 'bg-[var(--hw-neutral-50)]') : 'bg-[var(--hw-neutral-50)]'}`}>
        <p className={`text-[13px] font-medium leading-snug ${hasForecast ? cfg.color : 'text-[var(--hw-neutral-500)]'}`}>
          {data.trendLoading ? t("farmer.prices.trend_loading", {}, "Loading trend") : outlook}
        </p>
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-end pt-0.5">
        <button
          type="button"
          onClick={() => onViewDetails(commodity.id)}
          className="inline-flex items-center gap-0.5 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors cursor-pointer"
        >
          {t("common.see_details", {}, "View details")}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

function PricesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: profileData } = useQuery({
    queryKey: ["farmer", "profile"],
    queryFn: fetchFarmerProfile,
    staleTime: 1000 * 60 * 5,
  });

  const preferredCrops = useMemo(() => {
    return profileData?.preferred_crops || profileData?.preferredCrops || [];
  }, [profileData]);

  const { data: apiData, isLoading: loading } = useQuery({
    queryKey: ["prices", "list"],
    queryFn: async () => {
      const response = await apiGet("/prices?is_top10=true&page_size=50");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return parseResponse(response);
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const { commodities } = useMemo(() => {
    if (!apiData) return { commodities: [] };

    const items = apiData.items || [];
    const baseMap = new Map();

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
      const cat = camelItem.category || getCategoryFor(baseName) || getCategoryFor(camelItem.name) || null;
      const itemPrices = {
        bangkerohanRetail: camelItem.prices?.bangkerohanRetail ?? null,
        bangkerohanWholesale: camelItem.prices?.bangkerohanWholesale ?? null,
        dftcRetail: camelItem.prices?.dftcRetail ?? null,
        dftcWholesale: camelItem.prices?.dftcWholesale ?? null,
      };

      const variantItem = {
        id: camelItem.commodityId,
        name: camelItem.name,
        category: cat,
        variety: camelItem.variety,
        unitOfMeasure: uom,
        displayData: itemPrices,
      };

      if (!baseMap.has(baseName)) {
        baseMap.set(baseName, {
          id: camelItem.commodityId,
          name: baseName,
          baseName: baseName,
          category: cat,
          unitOfMeasure: uom,
          isTop10: true,
          displayData: { ...itemPrices },
          variants: [variantItem],
          forecast: camelItem.forecast || null,
        });
      } else {
        const existing = baseMap.get(baseName);
        existing.variants.push(variantItem);

        if (!existing.category && cat) {
          existing.category = cat;
        }

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
        };
      }
    });

    return {
      commodities: Array.from(baseMap.values()),
    };
  }, [apiData]);

  const priceTrendQueries = useQueries({
    queries: commodities.map((commodity) => ({
      queryKey: ["farmer-price-card-trend", commodity.id, "bangkerohan_retail", 7],
      queryFn: () => pricesApi.getPriceDetail(commodity.id, {
        price_type: "bangkerohan_retail",
        horizon: 7,
        records_limit: 100,
      }),
      enabled: Boolean(commodity.id),
      staleTime: 60 * 1000,
      refetchOnMount: true,
    })),
  });

  const priceTrendByCommodity = useMemo(
    () => new Map(commodities.map((commodity, index) => [
      commodity.id,
      {
        trendDetail: priceTrendQueries[index]?.data,
        trendLoading: priceTrendQueries[index]?.isPending || priceTrendQueries[index]?.isFetching,
        trendError: priceTrendQueries[index]?.isError,
      },
    ])),
    [commodities, priceTrendQueries],
  );
  
  const activeCount = (filter.direction !== "All" ? 1 : 0)
    + (filter.sortBy !== "name" ? 1 : 0)
    + (filter.category !== "All" ? 1 : 0);

  const categories = useMemo(() => {
    const set = new Set(["Highland Vegetables", "Lowland Vegetables", "Spices"]);
    commodities.forEach((c) => { if (c.category) set.add(c.category); });
    return [...set].sort();
  }, [commodities]);
  
  const visible = useMemo(() => {
    let list = commodities.map(commodity => {
      const data = commodity.displayData;
      const trendInfo = priceTrendByCommodity.get(commodity.id) || {};
      const direction = getDirectionFromData(trendInfo.trendDetail, commodity.forecast);

      return {
        ...commodity,
        displayData: {
          ...(data || {
            bangkerohanRetail: null,
            bangkerohanWholesale: null,
            dftcRetail: null,
            dftcWholesale: null,
          }),
          ...trendInfo,
          direction,
        },
      };
    });
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => (c.name || '').toLowerCase().includes(q));
    }
    
    if (filter.direction !== "All") {
      list = list.filter((c) => c.displayData.direction === filter.direction);
    }

    if (filter.category !== "All") {
      list = list.filter((c) => c.category === filter.category);
    }
    
    const secondaryCompare = (a, b) => {
      const ORDER_RISING = { Rising: 0, Stable: 1, Falling: 2 };
      const ORDER_FALLING = { Falling: 0, Stable: 1, Rising: 2 };
      if (filter.sortBy === "rising-first") {
        const orderA = a.displayData.direction in ORDER_RISING ? ORDER_RISING[a.displayData.direction] : 3;
        const orderB = b.displayData.direction in ORDER_RISING ? ORDER_RISING[b.displayData.direction] : 3;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || '').localeCompare(b.name || '');
      }
      if (filter.sortBy === "falling-first") {
        const orderA = a.displayData.direction in ORDER_FALLING ? ORDER_FALLING[a.displayData.direction] : 3;
        const orderB = b.displayData.direction in ORDER_FALLING ? ORDER_FALLING[b.displayData.direction] : 3;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || '').localeCompare(b.name || '');
      }
      if (filter.sortBy === "price-low" || filter.sortBy === "price-high") {
        const getPrice = (c) => {
          const d = c.displayData;
          const p = d.bangkerohanRetail ?? d.dftcRetail ?? d.bangkerohanWholesale ?? d.dftcWholesale;
          return p != null ? Number(p) : null;
        };
        const priceA = getPrice(a);
        const priceB = getPrice(b);
        if (priceA == null && priceB == null) return (a.name || '').localeCompare(b.name || '');
        if (priceA == null) return 1;
        if (priceB == null) return -1;
        if (priceA !== priceB) {
          return filter.sortBy === "price-low" ? priceA - priceB : priceB - priceA;
        }
        return (a.name || '').localeCompare(b.name || '');
      }
      return (a.name || '').localeCompare(b.name || '');
    };

    return sortWithPreferredFirst(list, preferredCrops, secondaryCompare);
  }, [searchQuery, filter, commodities, priceTrendByCommodity, preferredCrops]);

  const sortLabelMap = {
    "name": t("farmer.prices.sort_name", {}, "Commodity name (A–Z)"),
    "rising-first": t("farmer.prices.sort_rising_first", {}, "Price rising first"),
    "falling-first": t("farmer.prices.sort_falling_first", {}, "Price falling first"),
    "price-low": t("farmer.prices.sort_price_low", {}, "Lowest price first"),
    "price-high": t("farmer.prices.sort_price_high", {}, "Highest price first"),
  };
  
  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
              {t("nav.prices", {}, "Prices")}
            </h1>
            <p className="text-[15px] text-[var(--hw-neutral-900)] mt-0.5">
              {t("farmer.prices.subtitle", {}, "Check today's price and likely price movement.")}
            </p>
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
              placeholder={t("farmer.prices.search_placeholder", {}, "Search commodity…")}
              className="w-full pl-9 pr-9 py-2.5 text-[15px] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-800)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label="Open filter drawer"
            onClick={() => setFilterOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)] transition-colors text-[14px] font-medium shadow-[var(--shadow-xs)] flex-shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {t("common.filter", {}, "Filter")}
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--hw-green-700)] text-white text-[10px] font-bold">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter tags */}
        {activeCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-[12px] font-medium text-[var(--hw-neutral-500)]">
              {t("farmer.prices.active_filters", {}, "Active filters:")}
            </span>
            {filter.sortBy !== "name" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-[var(--hw-green-50)] text-[var(--hw-green-800)] border border-[var(--hw-green-200)]">
                {sortLabelMap[filter.sortBy] || filter.sortBy}
                <button
                  type="button"
                  onClick={() => setFilter((f) => ({ ...f, sortBy: "name" }))}
                  className="hover:opacity-75 p-0.5 text-[var(--hw-green-800)]"
                  aria-label="Remove sort filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filter.direction !== "All" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-[var(--hw-green-50)] text-[var(--hw-green-800)] border border-[var(--hw-green-200)]">
                {filter.direction}
                <button
                  type="button"
                  onClick={() => setFilter((f) => ({ ...f, direction: "All" }))}
                  className="hover:opacity-75 p-0.5 text-[var(--hw-green-800)]"
                  aria-label="Remove direction filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filter.category !== "All" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-[var(--hw-green-50)] text-[var(--hw-green-800)] border border-[var(--hw-green-200)]">
                {filter.category}
                <button
                  type="button"
                  onClick={() => setFilter((f) => ({ ...f, category: "All" }))}
                  className="hover:opacity-75 p-0.5 text-[var(--hw-green-800)]"
                  aria-label="Remove category filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => setFilter(DEFAULT_FILTER)}
              className="text-[12px] font-medium text-[var(--hw-neutral-500)] hover:text-[var(--hw-neutral-800)] underline ml-1 cursor-pointer"
            >
              {t("farmer.prices.clear_all", {}, "Clear all")}
            </button>
          </div>
        )}

        {/* Cards grid */}
        {loading ? (
          <SkeletonPriceGrid count={6} />
        ) : visible.length === 0 ? (
          searchQuery.trim() ? (
            <MarketEmptyState query={searchQuery} />
          ) : activeCount > 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--hw-neutral-100)] flex items-center justify-center mb-4">
                <SlidersHorizontal className="w-8 h-8 text-[var(--hw-neutral-400)]" />
              </div>
              <p className="text-lg font-medium text-[var(--hw-neutral-900)] mb-1">
                {t("farmer.emptyStates.no_filter_matches", {}, "No commodities match the selected filter")}
              </p>
              <p className="text-sm text-[var(--hw-neutral-500)] mb-4">
                {t("farmer.emptyStates.try_clearing_filters", {}, "Try adjusting or clearing your filters to see more results.")}
              </p>
              <button
                type="button"
                onClick={() => setFilter(DEFAULT_FILTER)}
                className="px-4 py-2 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors cursor-pointer"
              >
                {t("farmer.prices.clear_filters", {}, "Clear filters")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-[var(--hw-neutral-100)] flex items-center justify-center mb-4">
                <RefreshCw className="w-8 h-8 text-[var(--hw-neutral-400)]" />
              </div>
              <p className="text-lg font-medium text-[var(--hw-neutral-900)] mb-1">
                {t("farmer.emptyStates.no_prices", {}, "No price data available")}
              </p>
              <p className="text-sm text-[var(--hw-neutral-700)]">
                {t("farmer.emptyStates.no_prices_desc", {}, "Price data for top 10 commodities will appear here")}
              </p>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {visible.map((c) => (
              <CropPriceCard
                key={c.id}
                commodity={c}
                data={c.displayData}
                isPreferred={isPreferredCrop(c, preferredCrops)}
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
      />
    </div>
  );
}

export {
  PricesPage as default
};
