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
import { useState, useEffect } from "react";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { getVariants } from "../../global/data/commodities";
import { toCamelCase, formatPrice } from "../../global/utils/apiTransforms";
import { apiGet, parseResponse } from "../../global/api";

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
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex items-center justify-center h-32">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--hw-green-700)]"></div>
            <p className="text-xs text-[var(--hw-neutral-700)]">Loading...</p>
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
  
  // State management
  const [farmerProfile, setFarmerProfile] = useState(null);
  const [cropPlans, setCropPlans] = useState([]);
  const [prices, setPrices] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("just now");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch farmer profile
        try {
          const profileRes = await apiGet('/farmer/profile');
          if (profileRes.ok) {
            const profile = await parseResponse(profileRes);
            setFarmerProfile(profile);
          }
        } catch (e) {
          console.warn('Profile fetch failed:', e);
        }
        
        // Fetch crop plans
        try {
          const cropsRes = await apiGet('/crop-plans');
          if (cropsRes.ok) {
            const data = await parseResponse(cropsRes);
            const cropsData = data?.crop_plans || data?.items || [];
            
            // Transform crop plans
            const transformedCrops = cropsData.map((crop) => {
              const camelCrop = toCamelCase(crop);
              return {
                id: camelCrop.id,
                commodityId: camelCrop.commodityId,
                commodityName: camelCrop.commodityName || '–',
                variety: camelCrop.variety,
                status: camelCrop.status,
                expectedHarvestDate: camelCrop.expectedHarvestDate,
                expectedHarvestQty: camelCrop.expectedHarvestQty,
                profitLower: camelCrop.profitLower || 0,
                profitUpper: camelCrop.profitUpper || 0,
                notes: camelCrop.notes
              };
            });
            setCropPlans(transformedCrops);
          }
        } catch (e) {
          console.warn('Crop plans fetch failed:', e);
        }
        
        // Fetch prices (top 10 commodities)
        try {
          const pricesRes = await apiGet('/prices?page_size=100');
          if (pricesRes.ok) {
            const pricesData = await parseResponse(pricesRes);
            const priceItems = (pricesData?.items || [])
              .filter(item => item.is_top10 === true || item.isTop10 === true)
              .map(item => {
                const camelItem = toCamelCase(item);
                const retailPrice = camelItem.prices?.bangkerohanRetail ?? camelItem.prices?.dftcRetail ?? null;
                return {
                  id: camelItem.commodityId,
                  name: camelItem.name || '–',
                  baseName: camelItem.baseName,
                  price: retailPrice,
                  uom: camelItem.unitOfMeasure || 'kg',
                  direction: camelItem.forecast?.trend || null
                };
              });
            setPrices(priceItems);
          }
        } catch (e) {
          console.warn('Prices fetch failed:', e);
        }
        
        // Fetch monthly crop recommendations
        try {
          const recsRes = await apiGet('/advisory/crops');
          if (recsRes.ok) {
            const recsData = await parseResponse(recsRes);
            const recItems = (recsData?.recommendations || []).slice(0, 2).map(rec => {
              const camelRec = toCamelCase(rec);
              return {
                id: camelRec.commodityId,
                name: camelRec.commodityName || '–',
                reason: camelRec.explanation || '–',
                bestVariety: camelRec.bestVariety || null
              };
            });
            setRecommendations(recItems);
          }
        } catch (e) {
          console.warn('Recommendations fetch failed:', e);
        }

        setUpdatedAt("-");
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setUpdatedAt("-");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const greeting = getGreeting();
  const firstName = farmerProfile?.first_name;
  const greetingText = firstName ? `${greeting}, ${firstName}!` : `${greeting}!`;
  const city = farmerProfile?.city;
  const subtitle = city ? `${city} Vegetable Farmer` : "Vegetable Farmer";

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-4xl space-y-5 md:space-y-6">

        {/* ── 1. Greeting ── */}
        <div>
          <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
            {greetingText}
          </h1>
          <p className="text-[15px] text-[var(--hw-neutral-900)] mt-0.5">{subtitle}</p>
          <div className="flex items-center gap-1.5 mt-1.5 text-[var(--hw-neutral-900)]">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[13px]">Updated {updatedAt}</span>
          </div>
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
        <ProfitCard cropPlans={cropPlans} loading={loading} />

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
              {loading ? (
                <div className="flex items-center justify-center p-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--hw-green-700)]"></div>
                    <p className="text-xs text-[var(--hw-neutral-700)]">Loading prices...</p>
                  </div>
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

            {loading ? (
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex items-center justify-center h-32">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--hw-green-700)]"></div>
                  <p className="text-xs text-[var(--hw-neutral-700)]">Loading...</p>
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
                        <CommodityIllustration commodityId={crop.id} className="w-9 h-9 flex-shrink-0 mt-0.5" />
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
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--hw-green-700)]"></div>
                  <p className="text-xs text-[var(--hw-neutral-700)]">Loading reminders...</p>
                </div>
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
                    <CommodityIllustration commodityId={item.commodityId} className="w-9 h-9 flex-shrink-0" />
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
    </div>
  );
}

export {
  DashboardPage as default
};
