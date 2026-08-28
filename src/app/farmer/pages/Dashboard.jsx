import {
  Clock,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarDays,
  Plus,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { getVariants } from "../../global/data/commodities";
import { toCamelCase, formatPrice } from "../../global/utils/apiTransforms";
import { apiGet, parseResponse } from "../../global/api";
import { Skeleton, SkeletonListRow } from "../components/shared/FarmerSkeletons";

const DIR_CFG = {
  Rising: { color: "text-emerald-600", Icon: TrendingUp, label: "Rising" },
  Falling: { color: "text-red-500", Icon: TrendingDown, label: "Falling" },
  Stable: { color: "text-blue-500", Icon: Minus, label: "Stable" },
  default: { color: "text-[var(--hw-neutral-500)]", Icon: Minus, label: "No trend data" }
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function ProfitCard({ cropPlans, loading }) {
  const navigate = useNavigate();
  
  if (loading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Estimated Profit</h2>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3 animate-pulse">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-1/3 rounded" />
              <Skeleton className="h-3 w-1/4 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      </section>
    );
  }

  if (!cropPlans || cropPlans.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Estimated Profit</h2>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">No active crop plan yet.</p>
          <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">
            Add a crop plan to see how much you might earn.
          </p>
          <button
            onClick={() => navigate("/farmer/assess")}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add crop plan
          </button>
        </div>
      </section>
    );
  }

  // Find nearest harvest crop
  const nearestCrop = cropPlans
    .filter(c => c.expectedHarvestDate)
    .sort((a, b) => new Date(a.expectedHarvestDate) - new Date(b.expectedHarvestDate))[0];
  
  if (!nearestCrop) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Estimated Profit</h2>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">No active crop plan yet.</p>
          <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">
            Add a crop plan to see how much you might earn.
          </p>
          <button
            onClick={() => navigate("/farmer/assess")}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add crop plan
          </button>
        </div>
      </section>
    );
  }

  const harvestDate = nearestCrop.expectedHarvestDate
    ? new Date(nearestCrop.expectedHarvestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '-';
  const profitLow = nearestCrop.profitLower || 0;
  const profitHigh = nearestCrop.profitUpper || 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Estimated Profit</h2>
        <button
          onClick={() => navigate("/farmer/crops")}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
        >
          View all
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
        <div className="flex items-center gap-3 mb-3">
          <CommodityIllustration commodityId={nearestCrop.commodityId} className="w-10 h-10 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
              {nearestCrop.variety ? `${nearestCrop.commodityName || '–'} (${nearestCrop.variety})` : (nearestCrop.commodityName || '–')}
            </p>
            <div className="flex items-center gap-1.5 text-[var(--hw-neutral-900)]">
              <CalendarDays className="w-3 h-3 flex-shrink-0" />
              <span className="text-[12px]">Harvest: {harvestDate}</span>
            </div>
          </div>
        </div>

        <p className="text-[26px] font-bold text-[var(--hw-neutral-900)] leading-tight">
          {profitLow > 0 || profitHigh > 0 ? `₱${profitLow.toLocaleString()}–₱${profitHigh.toLocaleString()}` : '–'}
        </p>
        <p className="text-[12px] font-medium text-[var(--hw-neutral-900)] mt-0.5">Estimated Profit</p>
        <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">Nearest harvest among your crops.</p>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--hw-neutral-100)]">
          <p className="text-[12px] text-[var(--hw-neutral-900)] leading-snug">
            Estimate only. Actual income may change.
          </p>
          <button
            onClick={() => navigate("/farmer/crops")}
            className="flex-shrink-0 text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
          >
            View details
          </button>
        </div>
      </div>
    </section>
  );
}

function DashboardPage() {
  const navigate = useNavigate();

  const profileQuery = useQuery({
    queryKey: ["dashboard", "profile"],
    queryFn: async () => {
      const res = await apiGet("/farmer/profile");
      if (res.ok) return parseResponse(res);
      return null;
    },
    staleTime: 1000 * 60 * 30,
  });

  const cropsQuery = useQuery({
    queryKey: ["farmer", "crops"],
    queryFn: async () => {
      const res = await apiGet("/crop-plans");
      if (!res.ok) return [];
      const data = await parseResponse(res);
      return data?.crop_plans || data?.items || (Array.isArray(data) ? data : []);
    },
    select: (rawItems) => {
      return rawItems.map((crop) => {
        const camelCrop = toCamelCase(crop);
        return {
          id: camelCrop.id,
          commodityId: camelCrop.commodityId,
          commodityName: camelCrop.commodityName || '\u2013',
          variety: camelCrop.variety,
          status: camelCrop.status,
          expectedHarvestDate: camelCrop.expectedHarvestDate,
          expectedHarvestQty: camelCrop.expectedHarvestQty,
          profitLower: camelCrop.profitLower || 0,
          profitUpper: camelCrop.profitUpper || 0,
          notes: camelCrop.notes
        };
      });
    },
    staleTime: 1000 * 60 * 30,
  });

  const pricesQuery = useQuery({
    queryKey: ["dashboard", "prices"],
    queryFn: async () => {
      const res = await apiGet("/prices?is_top10=true&page_size=50");
      if (!res.ok) return [];
      const pricesData = await parseResponse(res);
      const baseMap = new Map();
      (pricesData?.items || []).forEach(item => {
        const camelItem = toCamelCase(item);
        const isTop = camelItem.isTop10 === true || item.is_top10 === true;
        if (!isTop) return;
        const name = camelItem.name || '\u2013';
        const retailPrice = camelItem.prices?.bangkerohanRetail ?? camelItem.prices?.dftcRetail ?? null;
        if (!baseMap.has(name)) {
          baseMap.set(name, {
            id: camelItem.commodityId,
            name,
            baseName: camelItem.baseName,
            price: retailPrice,
            uom: camelItem.unitOfMeasure || 'kg',
            direction: camelItem.forecast?.trend || null
          });
        } else if (retailPrice !== null && baseMap.get(name).price === null) {
          const existing = baseMap.get(name);
          existing.price = retailPrice;
          existing.direction = camelItem.forecast?.trend || existing.direction;
          existing.id = camelItem.commodityId;
        }
      });
      return Array.from(baseMap.values());
    },
    staleTime: 1000 * 60 * 30,
  });

  const recsQuery = useQuery({
    queryKey: ["dashboard", "recommendations"],
    queryFn: async () => {
      const res = await apiGet("/market/monthly-recommendations");
      if (!res.ok) return [];
      const recsData = await parseResponse(res);
      const rawItems = recsData?.items || recsData?.recommendations || (Array.isArray(recsData) ? recsData : []);
      return rawItems.slice(0, 2).map(rec => {
        const camelRec = toCamelCase(rec);
        return {
          id: camelRec.commodityId,
          name: camelRec.commodityName || '\u2013',
          reason: camelRec.explanation || '\u2013',
          bestVariety: camelRec.bestVarietyName || camelRec.bestVariety || null
        };
      });
    },
    staleTime: 1000 * 60 * 30,
  });

  const farmerProfile = profileQuery.data;
  const cropPlans = cropsQuery.data ?? [];
  const prices = pricesQuery.data ?? [];
  const recommendations = recsQuery.data ?? [];
  const isLoading = profileQuery.isLoading || cropsQuery.isLoading || pricesQuery.isLoading || recsQuery.isLoading;

  const greeting = getGreeting();
  const firstName = farmerProfile?.first_name;
  const greetingText = firstName ? `${greeting}, ${firstName}!` : `${greeting}!`;
  const city = farmerProfile?.city;
  const subtitle = city ? `${city} Vegetable Farmer` : "Vegetable Farmer";

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5 md:space-y-6">

        {/* ── 1. Greeting ── */}
        <div>
          <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
            {greetingText}
          </h1>
          <p className="text-[15px] text-[var(--hw-neutral-900)] mt-0.5">{subtitle}</p>
        </div>

        {/* ── 2. Main action card ── */}
        <div className="bg-[var(--hw-green-700)] rounded-2xl p-5 text-white shadow-[var(--shadow-md)]">
          <p className="font-semibold text-lg leading-snug">Need help choosing what to plant?</p>
          <p className="mt-1.5 text-[15px] text-green-100 leading-relaxed">
            Check prices, weather, and estimated profit before planting.
          </p>
          <button
            onClick={() => navigate("/farmer/market")}
            className="mt-4 inline-flex items-center gap-2 bg-white text-[var(--hw-green-700)] px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-green-50 transition-colors"
          >
            Check what to plant
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── 3. Estimated Profit ── */}
        <ProfitCard cropPlans={cropPlans} loading={isLoading} />

        {/* ── 4 + 5: Two-column on desktop — prices + good crops ── */}
        <div className="md:grid md:grid-cols-2 md:gap-5 space-y-5 md:space-y-0">

          {/* ── 4. Today's prices ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Today's prices</h2>
              <button
                onClick={() => navigate("/farmer/prices")}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
              >
                See all
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)]">
              {isLoading ? (
                <div className="divide-y divide-[var(--hw-neutral-100)]">
                  <SkeletonListRow />
                  <SkeletonListRow />
                  <SkeletonListRow />
                </div>
              ) : prices.length === 0 ? (
                <div className="p-4 text-center text-[13px] text-[var(--hw-neutral-700)]">
                  No price data available
                </div>
              ) : (
                <div className="divide-y divide-[var(--hw-neutral-100)] max-h-[260px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {prices.map((item) => {
                    const hasForecast = item.price != null && item.direction != null;
                    const cfg = hasForecast ? (DIR_CFG[item.direction] || DIR_CFG.default) : DIR_CFG.default;
                    const DirIcon = cfg.Icon;
                    const count = getVariants(item.name).length;
                    const formattedPrice = item.price != null && item.price !== '' ? `₱${item.price}/${item.uom || 'kg'}` : `-/${item.uom || 'kg'}`;

                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(`/farmer/prices/${item.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
                      >
                        <CommodityIllustration 
                          commodityId={item.id} 
                          baseName={item.baseName}
                          commodityName={item.name}
                          className="w-9 h-9 flex-shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">{item.name || '–'}</p>
                          <p className="text-[12px] font-semibold text-[var(--hw-green-700)]">
                            {count} {count === 1 ? "variety" : "varieties"}
                          </p>
                          <p className="text-[12px] text-[var(--hw-neutral-900)]">{formattedPrice}</p>
                        </div>
                        <div className={`flex items-center gap-1 flex-shrink-0 ${hasForecast ? cfg.color : 'text-[var(--hw-neutral-500)]'}`}>
                          {hasForecast && <DirIcon className="w-3.5 h-3.5" />}
                          <span className="text-[13px] font-medium">{hasForecast ? cfg.label : 'No trend data'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ── 5. Good crops to plant ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Good crops to plant</h2>
            </div>

            {isLoading ? (
              <div className="space-y-2.5">
                <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-2 animate-pulse">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-20 rounded" />
                      <Skeleton className="h-4 w-28 rounded" />
                      <Skeleton className="h-3 w-36 rounded" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-2 animate-pulse">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-20 rounded" />
                      <Skeleton className="h-4 w-28 rounded" />
                      <Skeleton className="h-3 w-36 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-3">
                <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">No recommendations available for this month.</p>
                <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">
                  Open the Planting Guide to compare other crops.
                </p>
                <button
                  onClick={() => navigate("/farmer/market")}
                  className="inline-flex items-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors"
                >
                  Open Planting Guide
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recommendations.map((crop) => {
                  const count = getVariants(crop.name).length;
                  return (
                    <div
                      key={crop.id}
                      className="bg-white rounded-2xl border border-[var(--hw-green-300)] shadow-[var(--shadow-xs)] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <CommodityIllustration commodityId={crop.id} commodityName={crop.name} baseName={crop.name} className="w-9 h-9 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 text-[var(--hw-green-700)]">
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-[12px] font-semibold">Good option</span>
                          </div>
                          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">{crop.name || '–'}</p>
                          <p className="text-[12px] font-semibold text-[var(--hw-green-700)]">
                            {count} {count === 1 ? "variety" : "varieties"}
                          </p>
                          <p className="text-[12px] font-medium text-[var(--hw-green-700)]">
                            Good variety: {crop.bestVariety || '–'}
                          </p>
                          <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">{crop.reason || '–'}</p>
                        </div>
                        <button
                          onClick={() => navigate("/farmer/market")}
                          className="flex-shrink-0 text-[12px] font-medium text-[var(--hw-green-700)] hover:opacity-70 whitespace-nowrap"
                        >
                          View guide
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ── 6. My crop reminders ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">My crop reminders</h2>
            <button
              onClick={() => navigate("/farmer/crops")}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
            >
              View My Crops
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)]">
            {isLoading ? (
              <div className="divide-y divide-[var(--hw-neutral-100)]">
                <SkeletonListRow />
                <SkeletonListRow />
              </div>
            ) : cropPlans.length === 0 ? (
              <div className="p-4 text-center text-[13px] text-[var(--hw-neutral-700)]">
                No crop reminders yet.
              </div>
            ) : (
              <div className="divide-y divide-[var(--hw-neutral-100)]">
                {cropPlans.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate("/farmer/crops")}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
                  >
                    <CommodityIllustration commodityId={item.commodityId} commodityName={item.commodityName} baseName={item.commodityName} className="w-9 h-9 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
                        {item.variety ? `${item.commodityName || '–'} (${item.variety})` : (item.commodityName || '–')}
                      </p>
                      <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">Status: {item.status || '–'}</p>
                      {item.notes && <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug mt-0.5">{item.notes}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

    </div>
  );
}

export {
  DashboardPage as default
};
