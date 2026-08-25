import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
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
  const [market, setMarket] = useState("bangkerohan");
  const [period, setPeriod] = useState(7);
  const [showMore, setShowMore] = useState(false);

  // API integration - fetch commodity details
  const [commodity, setCommodity] = useState(null);
  const [priceDetail, setPriceDetail] = useState(null);
  const [priceRecords, setPriceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topCommodities, setTopCommodities] = useState([]);

  // Fetch commodity list for navigation chips (strictly top 10 base commodities)
  useEffect(() => {
    const fetchTopCommodities = async () => {
      try {
        const response = await apiGet('/prices?page_size=100');
        if (response.ok) {
          const data = await parseResponse(response);
          const seen = new Set();
          const uniqueTop10 = [];
          for (const item of (data.items || [])) {
            const camelItem = toCamelCase(item);
            const isTop = camelItem.isTop10 === true || item.is_top10 === true;
            const name = camelItem.name;
            if (isTop && name && !seen.has(name)) {
              seen.add(name);
              uniqueTop10.push(camelItem);
            }
          }
          setTopCommodities(uniqueTop10);
        }
      } catch (error) {
        console.error('Failed to fetch top commodities:', error);
      }
    };
    fetchTopCommodities();
  }, []);

  // Fetch detailed price data for the current commodity
  useEffect(() => {
    const fetchPriceDetail = async () => {
      if (!commodityId) return;
      
      try {
        setLoading(true);
        const priceTypeKey = PRICE_TYPE_KEY[market];
        
        // Fetch price detail with forecast
        const detailResponse = await apiGet(
          `/prices/${commodityId}?price_type=${priceTypeKey}&horizon=${period}&records_limit=5`
        );
        
        if (!detailResponse.ok) {
          throw new Error(`HTTP error! status: ${detailResponse.status}`);
        }
        
        const detailData = await parseResponse(detailResponse);
        const camelDetail = toCamelCase(detailData);
        
        setCommodity({
          id: camelDetail.commodityId,
          name: camelDetail.name || '–',
          baseName: camelDetail.baseName,
          variety: camelDetail.variety,
          icon: camelDetail.icon,
          unitOfMeasure: camelDetail.unitOfMeasure || 'kg'
        });
        setPriceDetail(camelDetail);
        setPriceRecords(camelDetail.recentRecords || []);
        
      } catch (error) {
        console.error('Failed to fetch price detail:', error);
        setCommodity(null);
        setPriceDetail(null);
        setPriceRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceDetail();
  }, [commodityId, market, period]);

  // Fetch extended records when "View more" is clicked
  const fetchMoreRecords = async () => {
    if (!commodityId) return;
    
    try {
      const priceTypeKey = PRICE_TYPE_KEY[market];
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

  // Loading state
  if (loading) {
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

  const forecast = priceDetail.forecast || {};
  const cfg = DIR_CFG[forecast.trend] || DIR_CFG.default;
  const DirIcon = cfg.Icon;
  const uom = commodity.unitOfMeasure || 'kg';

  const currentPrice = forecast.currentPrice != null ? forecast.currentPrice : (priceRecords[0]?.priceAvg ?? null);
  const formattedCurrentPrice = currentPrice != null ? `₱${formatPrice(currentPrice)}` : '-';

  const lowerForecast = forecast.lowerForecast != null ? forecast.lowerForecast : null;
  const upperForecast = forecast.upperForecast != null ? forecast.upperForecast : null;
  const formattedForecastRange = (lowerForecast != null && upperForecast != null)
    ? `₱${formatPrice(lowerForecast)}–₱${formatPrice(upperForecast)}`
    : '-';

  const handleViewPriceTrend = () => {
    const state = {
      commodityName: commodity.name,
      marketLabel: MARKET_LABEL[market],
      currentPrice: currentPrice,
      direction: forecast.trend || 'Stable',
      range: (lowerForecast != null && upperForecast != null)
        ? `₱${formatPrice(lowerForecast)}–₱${formatPrice(upperForecast)}/${uom}`
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
              { label: commodity.name || '–' }
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
                {c.name}
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
              <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">{commodity.name || '–'}</h1>
              <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">Price Details</p>
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
            Price Outlook
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
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Current price */}
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-1.5">
            <p className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wide">
              Current Price
            </p>
            {commodity.variety && (
              <p className="text-[13px] font-medium text-[var(--hw-neutral-700)] truncate">
                {commodity.variety}
              </p>
            )}
            <p className="text-[20px] font-bold text-[var(--hw-neutral-900)] leading-none">
              {formattedCurrentPrice}
              <span className="text-[12px] font-medium">/{uom}</span>
            </p>
            <p className="text-[12px] text-[var(--hw-neutral-500)] mt-auto pt-1">
              {priceRecords[0]?.isToday ? 'Today' : (priceRecords[0]?.priceDate ? new Date(priceRecords[0].priceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-')} · {MARKET_LABEL[market] || '–'}
            </p>
          </div>

          {/* Card 2: Forecasted price */}
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-1.5">
            <p className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wide">
              Forecasted Price
            </p>
            {commodity.variety && (
              <p className="text-[13px] font-medium text-[var(--hw-neutral-700)] truncate">
                {commodity.variety}
              </p>
            )}
            <p className="text-[20px] font-bold text-[var(--hw-neutral-900)] leading-none">
              {formattedForecastRange}
              <span className="text-[12px] font-medium">/{uom}</span>
            </p>
            <p className="text-[12px] text-[var(--hw-neutral-500)]">
              Next {PERIOD_LABEL[period] || `${period} days`}
            </p>
            <div className={`flex items-center gap-1 ${cfg.color} mt-auto`}>
              <DirIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[12px] font-medium">{forecast.advisoryText || OUTLOOK_TEXT[forecast.trend] || OUTLOOK_TEXT.default}</span>
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
