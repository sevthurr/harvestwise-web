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
import * as pricesApi from "../../../services/api/pricesApi";

const DIR_CFG = {
  Rising: { color: "text-emerald-600", Icon: TrendingUp, key: "farmer.prices.trend_rising", label: "Rising" },
  Falling: { color: "text-red-500", Icon: TrendingDown, key: "farmer.prices.trend_falling", label: "Falling" },
  Stable: { color: "text-blue-500", Icon: Minus, key: "farmer.prices.trend_stable", label: "Stable" },
  default: { color: "text-[var(--hw-neutral-500)]", Icon: Minus, key: "farmer.prices.trend_no_data", label: "No trend data" }
};

const getForecastPeriod = (forecast) => {
  const dates = (forecast?.points ?? [])
    .map((point) => point.forecast_date)
    .filter((date) => typeof date === "string" && !Number.isNaN(Date.parse(`${date}T00:00:00`)))
    .sort();
  const endDate = forecast?.forecast_date || dates.at(-1);
  if (!endDate || Number.isNaN(Date.parse(`${endDate}T00:00:00`))) return null;

  const startDate = dates[0] || endDate;
  const formatDate = (date) => new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  return startDate === endDate ? end : `${start} – ${end}`;
};

const DEFAULT_FILTER = { direction: "All", sortBy: "name", category: "All" };

const PricesFilterDrawer = ({ open, filter, onClose, onApply, categories }) => {
  const { t } = useLanguage();
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
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-y-0 md:right-0 md:left-auto md:w-80 bg-white rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-[var(--shadow-xl)] flex flex-col max-h-[88vh] md:max-h-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-200)]">
          <p className="font-semibold text-[var(--hw-neutral-900)]">{t("farmer.prices.filter_and_sort", {}, "Filter & Sort")}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Sort by */}
          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-900)] mb-2">{t("farmer.prices.sort_by", {}, "Sort by")}</p>
            <div className="flex flex-col gap-2">
              {sortOptions.map(([v, label]) => (
                <button key={v} onClick={() => setDraft((d) => ({ ...d, sortBy: v }))} className={chip(draft.sortBy === v)}>
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
                <button key={v} onClick={() => setDraft((d) => ({ ...d, direction: v }))} className={chip(draft.direction === v)}>
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
                  <button key={v} onClick={() => setDraft((d) => ({ ...d, category: v }))} className={chip(draft.category === v)}>
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
            {t("farmer.prices.clear", {}, "Clear")}
          </button>
          <button
            onClick={() => onApply(draft)}
            className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />{t("farmer.prices.apply", {}, "Apply")}
          </button>
        </div>
      </div>
    </>
  );
};

const CropPriceCard = ({ commodity, data, onViewDetails }) => {
  const { t } = useLanguage();
  const unit = commodity.unitOfMeasure || 'kg';
  const forecast = data.trendDetail?.forecast;
  const forecastPrice = forecast?.forecast_midpoint != null
    ? Number(forecast.forecast_midpoint)
    : null;
  const hasForecast = (data.trendDetail?.recent_records?.length ?? 0) > 0
    && forecastPrice != null;
  const direction = hasForecast ? forecast.trend : null;
  const horizonDays = hasForecast ? forecast.horizon_days : 7;
  const forecastPeriod = hasForecast ? getForecastPeriod(forecast) : null;
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
  const forecastRange = forecast?.lower_forecast != null && forecast?.upper_forecast != null
    ? `₱${Number(forecast.lower_forecast).toFixed(2)}–₱${Number(forecast.upper_forecast).toFixed(2)}/${unit}`
    : null;

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
      <div className="rounded-xl bg-[var(--hw-neutral-50)] px-3.5 py-3 space-y-0.5">
        <p className={`text-[13px] font-medium ${hasForecast ? cfg.color : 'text-[var(--hw-neutral-500)]'}`}>
          {data.trendLoading ? t("farmer.prices.trend_loading", {}, "Loading trend") : outlook}
        </p>
        <p className="text-[12px] text-[var(--hw-neutral-900)]">
          {forecastPeriod
            ? t("farmer.prices.forecast_period", { period: forecastPeriod }, `Forecast period ${forecastPeriod}:`)
            : t("farmer.prices.forecast_horizon", { days: horizonDays }, `Forecast horizon: ${horizonDays} days:`)}{" "}
          <span className="font-semibold text-[var(--hw-neutral-900)]">
            {hasForecast ? formatPriceValue(forecastPrice) : t("farmer.prices.forecast_unavailable", {}, "Not available")}
          </span>
        </p>
        {hasForecast && forecastRange && (
          <p className="text-[11px] text-[var(--hw-neutral-600)]">
            {t("farmer.prices.forecast_range", {}, "Possible range")}: {forecastRange}
          </p>
        )}
        <p className="text-[10px] text-[var(--hw-neutral-500)]">
          {t("farmer.prices.trend_series_label", {}, "Bankerohan Retail")}
        </p>
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <p className="text-[12px] text-[var(--hw-neutral-500)] truncate">
          {(() => {
            const name = commodity.baseName || commodity.name || '';
            const range = forecastRange || (forecastPrice != null ? formatPriceValue(forecastPrice) : null);
            const days = horizonDays;
            if (!hasForecast) {
              return data.trendError
                ? t('farmer.prices.trend_unavailable_for_crop', { commodity: name }, `Price trend is unavailable for ${name}.`)
                : t('farmer.prices.no_trend_for_crop', { commodity: name }, `No price trend data is available for ${name}.`);
            }
            if (direction === 'Rising') {
              return range
                ? t('farmer.prices.advisory_rising', { commodity: name, range, days }, `Prices for ${name} are expected to rise to ${range} over the next ${days} days.`)
                : t('farmer.prices.advisory_rising_no_range', { commodity: name }, `Prices for ${name} are expected to rise in the coming days.`);
            }
            if (direction === 'Falling') {
              return range
                ? t('farmer.prices.advisory_falling', { commodity: name, range, days }, `Prices for ${name} are expected to drop to ${range} over the next ${days} days.`)
                : t('farmer.prices.advisory_falling_no_range', { commodity: name }, `Prices for ${name} are expected to drop in the coming days.`);
            }
            return range
              ? t('farmer.prices.advisory_stable', { commodity: name, range }, `Prices for ${name} are expected to remain stable around ${range}.`)
              : t('farmer.prices.advisory_stable_no_range', { commodity: name }, `Prices for ${name} are expected to remain stable.`);
          })()}
        </p>
        <button
          onClick={() => onViewDetails(commodity.id)}
          className="flex-shrink-0 inline-flex items-center gap-0.5 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors cursor-pointer"
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
      const itemPrices = {
        bangkerohanRetail: camelItem.prices?.bangkerohanRetail ?? null,
        bangkerohanWholesale: camelItem.prices?.bangkerohanWholesale ?? null,
        dftcRetail: camelItem.prices?.dftcRetail ?? null,
        dftcWholesale: camelItem.prices?.dftcWholesale ?? null,
      };

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
    const set = new Set();
    commodities.forEach((c) => { if (c.category) set.add(c.category); });
    return [...set].sort();
  }, [commodities]);
  
  const visible = useMemo(() => {
    let list = commodities.map(commodity => {
      const data = commodity.displayData;
      return {
        ...commodity,
        displayData: {
          ...(data || {
          bangkerohanRetail: null,
          bangkerohanWholesale: null,
          dftcRetail: null,
          dftcWholesale: null,
          }),
          ...(priceTrendByCommodity.get(commodity.id) || {}),
        },
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
  }, [searchQuery, filter, commodities, priceTrendByCommodity]);
  
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
            {t("common.filter", {}, "Filter")}
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
