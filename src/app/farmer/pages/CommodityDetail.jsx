import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, RefreshCw, ChevronRight, BarChart2 } from "lucide-react";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import { toCamelCase, formatPrice } from "../../global/utils/apiTransforms";
import { apiGet, parseResponse } from "../../global/api";
import { Skeleton } from "../components/shared/FarmerSkeletons";

const PRICE_TYPE_KEY = {
  "bangkerohan": "bangkerohan_retail",
  "bangkerohan-wholesale": "bangkerohan_wholesale",
  "dftc-retail": "dftc_retail",
  "dftc-wholesale": "dftc_wholesale"
};

const MARKET_LABEL = {
  "bangkerohan": "Bangkerohan Retail",
  "bangkerohan-wholesale": "Bangkerohan Wholesale",
  "dftc-retail": "DFTC Retail",
  "dftc-wholesale": "DFTC Wholesale"
};

const OUTLOOK_TEXT = {
  Rising: "Price may rise",
  Falling: "Price may fall",
  Stable: "Price may stay stable",
  default: "Forecast unavailable"
};

const DIR_CFG = {
  Rising: { color: "text-emerald-600", Icon: TrendingUp },
  Falling: { color: "text-red-500", Icon: TrendingDown },
  Stable: { color: "text-blue-500", Icon: Minus },
  default: { color: "text-[var(--hw-neutral-500)]", Icon: Minus }
};

const PERIOD_LABEL = {
  7: "7 days",
  14: "14 days", 
  21: "21 days",
  28: "28 days"
};

const segCls = (active) =>
  `flex-1 py-2 text-[12px] font-medium transition-colors text-center leading-tight px-1 ${
    active ? "bg-[var(--hw-green-700)] text-white" : "text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"
  }`;

const periodChipCls = (active) =>
  `px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors flex-shrink-0 ${
    active
      ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white"
      : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"
  }`;

function CommodityDetailPage() {
  const { commodityId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [market, setMarket] = useState("bangkerohan");
  const [period, setPeriod] = useState(7);
  const [showMore, setShowMore] = useState(false);

  // API integration - fetch commodity details
  const [commodity, setCommodity] = useState(null);
  const [priceDetail, setPriceDetail] = useState(null);
  const [priceRecords, setPriceRecords] = useState([]);

  // Prefetch all 4 price types whenever commodityId or period is active
  useEffect(() => {
    if (!commodityId) return;
    const priceTypes = ["bangkerohan_retail", "bangkerohan_wholesale", "dftc_retail", "dftc_wholesale"];
    priceTypes.forEach((pt) => {
      queryClient.prefetchQuery({
        queryKey: ["prices", "detail", commodityId, pt, period],
        queryFn: async () => {
          const response = await apiGet(
            `/prices/${commodityId}?price_type=${pt}&horizon=${period}&records_limit=5`
          );
          if (!response.ok) return null;
          const data = await parseResponse(response);
          return toCamelCase(data);
        },
        staleTime: 1000 * 60 * 30,
      });
    });
  }, [commodityId, period, queryClient]);

  // Reuse prefetched prices list for navigation chips and variety dropdowns
  const { data: pricesListData } = useQuery({
    queryKey: ["prices", "list"],
    queryFn: async () => {
      const response = await apiGet('/prices?is_top10=true&page_size=50');
      if (!response.ok) return { items: [] };
      return parseResponse(response);
    },
    staleTime: 1000 * 60 * 30,
  });

  const { allCommodities, topCommodities } = useMemo(() => {
    const rawItems = (pricesListData?.items || []).map(toCamelCase);
    const top10Items = rawItems.filter(item => item.isTop10 === true || item.is_top10 === true);

    const getBase = (str) => {
      if (!str) return '';
      let s = String(str);
      if (s.includes(' - ')) s = s.split(' - ')[0];
      if (s.includes(' (')) s = s.split(' (')[0];
      return s.trim();
    };

    const seen = new Set();
    const uniqueTop10 = [];
    for (const item of top10Items) {
      const rawName = item.baseName || item.name;
      const name = getBase(rawName);
      const hasPrices = item.prices && Object.values(item.prices).some(v => v != null);

      if (name) {
        if (!seen.has(name)) {
          seen.add(name);
          uniqueTop10.push({ ...item, displayName: name });
        } else if (hasPrices) {
          const idx = uniqueTop10.findIndex(u => u.displayName === name);
          if (idx !== -1) {
            uniqueTop10[idx] = { ...item, displayName: name };
          }
        }
      }
    }

    return { allCommodities: top10Items, topCommodities: uniqueTop10 };
  }, [pricesListData]);

  const priceTypeKey = PRICE_TYPE_KEY[market];

  // Fetch detailed price data with React Query
  const { data: detailData, isLoading: loading } = useQuery({
    queryKey: ["prices", "detail", commodityId, priceTypeKey, period],
    queryFn: async () => {
      const response = await apiGet(
        `/prices/${commodityId}?price_type=${priceTypeKey}&horizon=${period}&records_limit=5`
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await parseResponse(response);
      return toCamelCase(data);
    },
    enabled: Boolean(commodityId),
    staleTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (detailData) {
      setCommodity({
        id: detailData.commodityId,
        name: detailData.name || '–',
        baseName: detailData.baseName,
        variety: detailData.variety,
        icon: detailData.icon,
        unitOfMeasure: detailData.unitOfMeasure || 'kg'
      });
      setPriceDetail(detailData);
      setPriceRecords(detailData.recentRecords || []);
    }
  }, [detailData]);

  // Fetch extended records when "View more" is clicked
  const fetchMoreRecords = async () => {
    if (!commodityId) return;
    
    try {
      const response = await apiGet(
        `/prices/${commodityId}/records?price_type=${priceTypeKey}&limit=30`
      );
      
      if (response.ok) {
        const data = await parseResponse(response);
        setPriceRecords((data || []).map(r => toCamelCase(r)));
      }
    } catch (error) {
      console.error('Failed to fetch extended records:', error);
    }
  };

  const handleShowMore = async () => {
    if (!showMore) {
      await fetchMoreRecords();
    }
    setShowMore(!showMore);
  };

  const forecast = priceDetail?.forecast || {};
  const cfg = DIR_CFG[forecast.trend] || DIR_CFG.default;
  const DirIcon = cfg.Icon;
  const uom = commodity?.unitOfMeasure || 'kg';

  const currentPrice = forecast.currentPrice != null ? forecast.currentPrice : (priceRecords[0]?.priceAvg ?? null);
  const lowerForecast = forecast.lowerForecast != null ? forecast.lowerForecast : null;
  const upperForecast = forecast.upperForecast != null ? forecast.upperForecast : null;

  const familyVariants = useMemo(() => {
    if (!commodity || !allCommodities.length) return [];
    const getBase = (str) => {
      if (!str) return '';
      let s = String(str);
      if (s.includes(' - ')) s = s.split(' - ')[0];
      if (s.includes(' (')) s = s.split(' (')[0];
      return s.trim().toLowerCase();
    };
    const targetBase = getBase(commodity.baseName || commodity.name);
    const matches = allCommodities.filter(item => {
      const itemBase = getBase(item.baseName || item.name);
      return itemBase === targetBase || (targetBase && itemBase.startsWith(targetBase)) || (itemBase && targetBase.startsWith(itemBase));
    });
    return matches.length > 0 ? matches : [commodity];
  }, [commodity, allCommodities]);

  const variantRows = useMemo(() => {
    if (!familyVariants.length) {
      if (!commodity) return [];
      const priceVal = forecast.currentPrice ?? priceRecords[0]?.priceAvg ?? null;
      const currentPriceText = priceVal != null ? `${formatPrice(priceVal)}/${uom}` : `-/${uom}`;
      const forecastRangeText = (lowerForecast != null && upperForecast != null)
        ? `${formatPrice(lowerForecast)}–${formatPrice(upperForecast)}/${uom}`
        : `-/${uom}`;
      return [{
        id: commodity.id,
        label: commodity.variety || commodity.name,
        currentPriceText,
        forecastRangeText,
      }];
    }

    const mapCamelKey = {
      "bangkerohan": "bangkerohanRetail",
      "bangkerohan-wholesale": "bangkerohanWholesale",
      "dftc-retail": "dftcRetail",
      "dftc-wholesale": "dftcWholesale"
    }[market];

    const getAvailablePrice = (pricesObj) => {
      if (!pricesObj) return null;
      return pricesObj[mapCamelKey] ?? pricesObj.bangkerohanRetail ?? pricesObj.dftcRetail ?? pricesObj.dftcWholesale ?? pricesObj.bangkerohanWholesale ?? null;
    };

    return familyVariants.map((v, i) => {
      const isCurrentActive = String(v.commodityId || v.id) === String(commodityId);

      let label = v.variety;
      if (!label && v.name && v.baseName && v.name !== v.baseName) {
        label = v.name.replace(v.baseName, '').replace(/^[\s\-()]+|[\s\-()]+$/g, '').trim();
      }
      if (!label && v.name && v.name.includes(' - ')) {
        label = v.name.split(' - ')[1]?.trim();
      }
      if (!label) {
        label = familyVariants.length > 1 ? v.name : (v.baseName || v.name);
      }

      let priceVal = null;
      let lower = null;
      let upper = null;

      if (isCurrentActive && detailData) {
        priceVal = forecast.currentPrice ?? priceRecords[0]?.priceAvg ?? getAvailablePrice(v.prices);
        lower = forecast.lowerForecast ?? v.forecast?.lowerForecast ?? null;
        upper = forecast.upperForecast ?? v.forecast?.upperForecast ?? null;
      } else {
        priceVal = getAvailablePrice(v.prices);
        lower = v.forecast?.lowerForecast ?? null;
        upper = v.forecast?.upperForecast ?? null;
      }

      const currentPriceText = priceVal != null ? `${formatPrice(priceVal)}/${uom}` : `-/${uom}`;
      const forecastRangeText = (lower != null && upper != null)
        ? `${formatPrice(lower)}–${formatPrice(upper)}/${uom}`
        : `-/${uom}`;

      return {
        id: v.commodityId || v.id || i,
        label,
        currentPriceText,
        forecastRangeText,
      };
    });
  }, [familyVariants, market, uom, commodity, commodityId, detailData, forecast, priceRecords, lowerForecast, upperForecast]);

  // Loading state (only show full screen skeleton on cold start if NO data exists in cache)
  if (loading && !detailData && !priceDetail) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-5">
        <div className="max-w-2xl mx-auto md:max-w-4xl space-y-5">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 rounded" />
            <span className="text-[var(--hw-neutral-300)]">/</span>
            <Skeleton className="h-4 w-24 rounded" />
          </div>

          {/* Header Card Skeleton */}
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-4 animate-pulse">
            <div className="flex items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-2xl flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-36 rounded" />
                <Skeleton className="h-3.5 w-24 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </div>

          {/* Section Skeletons */}
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-3 animate-pulse">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state - commodity not found
  if (!commodity || !priceDetail) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[var(--hw-neutral-900)]">Commodity not found.</p>
        <button onClick={() => navigate("/farmer/prices")} className="mt-3 text-sm font-medium text-[var(--hw-green-700)]">
          Back to Prices
        </button>
      </div>
    );
  }

  const handleViewPriceTrend = () => {
    const state = {
      commodityName: commodity.name,
      marketLabel: MARKET_LABEL[market],
      currentPrice: currentPrice,
      direction: forecast.trend || 'Stable',
      range: (lowerForecast != null && upperForecast != null)
        ? `${formatPrice(lowerForecast)}–${formatPrice(upperForecast)}/${uom}`
        : `-/${uom}`
    };
    navigate(`/farmer/prices/${commodity.id}/price-trend`, { state });
  };

  const displayRecords = showMore ? priceRecords : priceRecords.slice(0, 5);

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-3xl space-y-4">

        {/* Breadcrumb + commodity switcher */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Breadcrumb
            items={[
              { label: "Prices", onClick: () => navigate("/farmer/prices") },
              { label: commodity.baseName || commodity.name || '–' }
            ]}
          />
          <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {topCommodities.map((c) => (
              <button
                key={c.commodityId}
                onClick={() => navigate(`/farmer/prices/${c.commodityId}`)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  c.commodityId === commodity.id
                    ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white"
                    : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"
                }`}
              >
                {c.displayName || c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Crop header */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
          <div className="flex items-center gap-4">
            <CommodityIllustration 
              commodityId={commodity.id} 
              baseName={commodity.baseName}
              commodityName={commodity.name}
              className="w-14 h-14 flex-shrink-0" 
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">{commodity.baseName || commodity.name || '–'}</h1>
              <p className="text-[13px] text-[var(--hw-neutral-600)] mt-0.5">Price Details</p>
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--hw-neutral-500)] mt-1">
                <RefreshCw className="w-3 h-3 text-[var(--hw-neutral-400)]" />
                <span>Updated today at 7:30 AM</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4-option market selector */}
        <div className="flex rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden bg-white shadow-[var(--shadow-xs)]">
          <button onClick={() => setMarket("bangkerohan")} className={segCls(market === "bangkerohan")}>
            Bangkerohan
          </button>
          <div className="w-px bg-[var(--hw-neutral-200)]" />
          <button onClick={() => setMarket("bangkerohan-wholesale")} className={segCls(market === "bangkerohan-wholesale")}>
            Bangkerohan Wholesale
          </button>
          <div className="w-px bg-[var(--hw-neutral-200)]" />
          <button onClick={() => setMarket("dftc-retail")} className={segCls(market === "dftc-retail")}>
            DFTC Retail
          </button>
          <div className="w-px bg-[var(--hw-neutral-200)]" />
          <button onClick={() => setMarket("dftc-wholesale")} className={segCls(market === "dftc-wholesale")}>
            DFTC Wholesale
          </button>
        </div>

        {/* Price Outlook — period selector */}
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">
            PRICE OUTLOOK
          </p>
          <div className="flex gap-2">
            {[7, 14, 21, 28].map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={periodChipCls(period === p)}>
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Two side-by-side price cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card 1: Current price */}
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col justify-between min-h-[160px]">
            <div>
              <p className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wide mb-3">
                CURRENT PRICE
              </p>
              <div className="space-y-2.5">
                {variantRows.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
                      {row.label}
                    </span>
                    <span className="text-[15px] font-bold text-[var(--hw-neutral-900)]">
                      {row.currentPriceText}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[12px] text-[var(--hw-neutral-500)] mt-4 pt-2 border-t border-[var(--hw-neutral-100)]">
              Today · {MARKET_LABEL[market] || '–'}
            </p>
          </div>

          {/* Card 2: Forecasted price */}
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col justify-between min-h-[160px]">
            <div>
              <p className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wide mb-3">
                FORECASTED PRICE
              </p>
              <div className="space-y-2.5">
                {variantRows.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
                      {row.label}
                    </span>
                    <span className="text-[15px] font-bold text-[var(--hw-neutral-900)]">
                      {row.forecastRangeText}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-[var(--hw-neutral-100)] space-y-1">
              <p className="text-[12px] text-[var(--hw-neutral-500)]">
                Next {PERIOD_LABEL[period] || `${period} days`}
              </p>
              <div className={`flex items-center gap-1 ${cfg.color}`}>
                <DirIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-[12px] font-medium">{forecast.advisoryText || OUTLOOK_TEXT[forecast.trend] || OUTLOOK_TEXT.default}</span>
              </div>
            </div>
          </div>
        </div>

        {/* View price trend details */}
        <button
          onClick={handleViewPriceTrend}
          className="w-full flex items-center justify-between gap-3 bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-3.5 hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--hw-neutral-100)] rounded-xl flex-shrink-0">
              <BarChart2 className="w-4 h-4 text-[var(--hw-neutral-900)]" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">View price trend details</p>
              <p className="text-[12px] text-[var(--hw-neutral-900)]">Historical prices + forecast chart</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-900)] flex-shrink-0" />
        </button>

        {/* Recent price records */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">Recent price records</p>
            <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">
              {MARKET_LABEL[market] || '–'} · {priceRecords[0]?.location || 'Davao City'}
            </p>
          </div>
          
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
                <th className="text-left px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Date</th>
                <th className="text-left px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Variety</th>
                <th className="text-right px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Price</th>
                <th className="text-right px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hw-neutral-100)]">
              {displayRecords.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-6 text-[13px] text-[var(--hw-neutral-500)]">
                    No recent price records available.
                  </td>
                </tr>
              ) : (
                displayRecords.map((row, i) => (
                  <tr key={i} className={row.isToday ? "bg-[var(--hw-neutral-50)]" : ""}>
                    <td className="px-4 py-2.5 text-[var(--hw-neutral-900)] whitespace-nowrap">
                      {row.priceDate ? new Date(row.priceDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      }) : '–'}
                      {row.isToday && <span className="ml-1.5 text-[10px] font-semibold text-[var(--hw-green-700)]">Today</span>}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--hw-neutral-900)] whitespace-nowrap italic text-[12px]">
                      {row.variety || commodity.variety || '–'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[var(--hw-neutral-900)] whitespace-nowrap">
                      {row.priceAvg != null ? `₱${Number(row.priceAvg).toFixed(2)}` : '–'}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {row.change == null || row.change === 0 ? (
                        <span className="text-[var(--hw-neutral-900)]">—</span>
                      ) : (
                        <span className={row.change > 0 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                          {row.change > 0 ? "+" : ""}₱{Number(row.change).toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {displayRecords.length > 0 && (
            <div className="px-4 py-3 border-t border-[var(--hw-neutral-100)]">
              <button
                onClick={handleShowMore}
                className="text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
              >
                {showMore ? "Show fewer records" : "View more records"}
              </button>
            </div>
          )}
        </div>

        {/* Bottom action card */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-3">
          <div>
            <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">
              Check if this crop is good to plant
            </p>
            <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">
              See price, weather, and estimated profit before you plant.
            </p>
          </div>
          <button
            onClick={() => navigate(`/farmer/assess?commodity=${commodity.id}`)}
            className="w-full flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors"
          >
            Check crop
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="text-center">
            <button
              onClick={() => navigate("/farmer/prices")}
              className="text-[13px] font-medium text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-700)] transition-colors"
            >
              View another crop
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export {
  CommodityDetailPage as default
};
