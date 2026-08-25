import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ChevronRight,
  CalendarDays,
  CloudRain,
  Sprout,
  ArrowRight
} from "lucide-react";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { toCamelCase } from "../../global/utils/apiTransforms";
import { Skeleton } from "../components/shared/FarmerSkeletons";

const ADV_CFG = {
  recommended: { label: "Recommended", Icon: CheckCircle2, color: "text-[var(--hw-green-700)]", border: "border-[var(--hw-green-300)]" },
  "Plant Conservatively": { label: "Plant Conservatively", Icon: AlertTriangle, color: "text-amber-600", border: "border-amber-200" },
  conservative: { label: "Plant Conservatively", Icon: AlertTriangle, color: "text-amber-600", border: "border-amber-200" },
  "Avoid for Now": { label: "Avoid for Now", Icon: AlertOctagon, color: "text-red-500", border: "border-red-200" },
  avoid: { label: "Avoid for Now", Icon: AlertOctagon, color: "text-red-500", border: "border-red-200" }
};

const MARKET_EVENTS_STATIC = [
  { id: "payday", title: "Mid-month payday period", date: "Mid-month", note: "May increase people going to the market." },
  { id: "notes", title: "Market conditions", date: "Current", note: "Check prices and availability before planting." }
];

const WEATHER_ACTIONS = [
  "Clear drainage before planting",
  "Avoid planting during strong rain",
  "Protect harvested crops from moisture"
];

const CropAdvisoryCard = ({ crop, onViewGuide }) => {
  const cfg = ADV_CFG[crop.advisory] || ADV_CFG.recommended;
  const AdvIcon = cfg.Icon;
  return <div className={`bg-white rounded-2xl border ${cfg.border} shadow-[var(--shadow-xs)] p-4`}>
      <div className="flex items-start gap-3">
        <CommodityIllustration commodityId={crop.id} className="w-10 h-10 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1">
          <div className={`flex items-center gap-1.5 ${cfg.color}`}>
            <AdvIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-[12px] font-semibold">{cfg.label}</span>
          </div>
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">{crop.name}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            <p className="text-[12px] text-[var(--hw-neutral-900)]">
              Estimated profit: <span className="font-medium text-[var(--hw-neutral-700)]">{crop.profit || "–"}</span>
            </p>
            <p className="text-[12px] text-[var(--hw-neutral-900)]">
              Harvest: <span className="font-medium text-[var(--hw-neutral-700)]">{crop.harvest || "–"}</span>
            </p>
          </div>
          <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">{crop.reason || crop.explanation || "–"}</p>
          {crop.note && <p className={`text-[12px] font-medium ${cfg.color}`}>{crop.note}</p>}
        </div>
        <button
    onClick={onViewGuide}
    className="flex-shrink-0 text-[12px] font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity whitespace-nowrap pt-0.5"
  >
          View guide
        </button>
      </div>
    </div>;
};

function PlantingGuidePage() {
  const navigate = useNavigate();
  const [advisories, setAdvisories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllCalendar, setShowAllCalendar] = useState(false);

  // Fetch monthly crop recommendations from API
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
        const response = await fetch(`${apiUrl}/advisory/crops`);
        if (response.ok) {
          const data = await response.json();
          // Transform API data to match advisories format
          const transformedAdvisories = (data.recommendations || []).map(rec => {
            const camelRec = toCamelCase(rec);
            // Map advisory_category to advisory status
            let advisory = "recommended";
            if (camelRec.advisoryCategory) {
              if (camelRec.advisoryCategory.includes("Conservatively")) {
                advisory = "conservative";
              } else if (camelRec.advisoryCategory.includes("Avoid")) {
                advisory = "avoid";
              }
            }
            
            return {
              id: camelRec.commodityId,
              name: camelRec.commodityName || "–",
              advisory,
              profit: "–", // API doesn't provide estimated profit per crop
              harvest: camelRec.harvestWindowStart ? new Date(camelRec.harvestWindowStart).toLocaleDateString('en-US', { month: 'short' }) : "–",
              reason: camelRec.explanation || "–",
              note: null
            };
          });
          setAdvisories(transformedAdvisories);
        } else {
          setAdvisories([]);
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        setAdvisories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const recommended = advisories.filter((a) => a.advisory === "recommended");
  const conservative = advisories.filter((a) => a.advisory === "conservative");
  const avoid = advisories.filter((a) => a.advisory === "avoid");

  if (loading) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-5">
        <div className="max-w-2xl mx-auto md:max-w-4xl space-y-6">
          <div className="space-y-1">
            <Skeleton className="h-7 w-40 rounded" />
            <Skeleton className="h-4 w-60 rounded" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-32 rounded" />
            <div className="space-y-3">
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex items-center gap-3 animate-pulse">
                <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-3 w-48 rounded" />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex items-center gap-3 animate-pulse">
                <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-3 w-48 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-4xl space-y-6">

        {
    /* ── Header ── */
  }
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
              Planting Guide
            </h1>
            <div className="flex items-center gap-1.5 text-[var(--hw-neutral-700)] flex-shrink-0 mt-1">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-[13px] whitespace-nowrap">Updated -</span>
            </div>
          </div>
          <p className="text-[15px] text-[var(--hw-neutral-900)] mt-0.5">
            See which crops are better to plant, based on price, weather, and estimated profit.
          </p>
        </div>

        {
    /* ── 1. Main guide card ── */
  }
        <div className="bg-[var(--hw-green-700)] rounded-2xl p-5 text-white shadow-[var(--shadow-md)]">
          <p className="font-semibold text-lg leading-snug">What can I plant now?</p>
          <p className="mt-1.5 text-[15px] text-green-100 leading-relaxed">
            Compare crops before planting. HarvestWise checks price, weather, supply, and estimated profit.
          </p>
          <button
    onClick={() => navigate("/farmer/assess")}
    className="mt-4 inline-flex items-center gap-2 bg-white text-[var(--hw-green-700)] px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-green-50 transition-colors"
  >
            Check my crop
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {
    /* ── 2 + 3: Desktop two-column — Advisories | Calendar & Events ── */
  }
        <div className="md:grid md:grid-cols-[1fr_360px] md:gap-6 space-y-6 md:space-y-0">

          {
    /* Left column: Crop advisory groups */
  }
          <div className="space-y-6">

            {
    /* Recommended */
  }
            <section>
              <div className="mb-3">
                <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Recommended</h2>
                <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">Good options to consider planting.</p>
              </div>
              {recommended.length === 0 ? (
                <div className="text-[13px] text-[var(--hw-neutral-700)]">No recommendations available at this time.</div>
              ) : (
                <div className="space-y-3">
                  {recommended.map((crop) => <CropAdvisoryCard
    key={crop.id}
    crop={crop}
    onViewGuide={() => navigate(`/farmer/assess?commodity=${crop.id}`)}
  />)}
                </div>
              )}
            </section>

            {
    /* Plant Conservatively */
  }
            <section>
              <div className="mb-3">
                <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Plant Conservatively</h2>
                <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">Can be planted, but consider a smaller area first.</p>
              </div>
              {conservative.length === 0 ? (
                <div className="text-[13px] text-[var(--hw-neutral-700)]">No conservative recommendations at this time.</div>
              ) : (
                <div className="space-y-3">
                  {conservative.map((crop) => <CropAdvisoryCard
    key={crop.id}
    crop={crop}
    onViewGuide={() => navigate(`/farmer/assess?commodity=${crop.id}`)}
  />)}
                </div>
              )}
            </section>

            {
    /* Avoid for Now */
  }
            <section>
              <div className="mb-3">
                <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Avoid for Now</h2>
                <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">Better to wait or check another crop.</p>
              </div>
              {avoid.length === 0 ? (
                <div className="text-[13px] text-[var(--hw-neutral-700)]">No crops to avoid at this time.</div>
              ) : (
                <div className="space-y-3">
                  {avoid.map((crop) => <CropAdvisoryCard
    key={crop.id}
    crop={crop}
    onViewGuide={() => navigate(`/farmer/assess?commodity=${crop.id}`)}
  />)}
                </div>
              )}
            </section>
          </div>

          {
    /* Right column: Market Events + Weather */
  }
          <div className="space-y-5">

            {
    /* ── 4. Upcoming market events ── */
  }
            <section>
              <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)] mb-3">Upcoming market events</h2>
              <div className="space-y-2.5">
                {MARKET_EVENTS_STATIC.map((event) => <div key={event.id} className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-[var(--hw-neutral-50)] rounded-lg flex-shrink-0 mt-0.5">
                        <CalendarDays className="w-3.5 h-3.5 text-[var(--hw-neutral-900)]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{event.title}</p>
                          <span className="text-[12px] font-medium text-[var(--hw-neutral-700)]">{event.date}</span>
                        </div>
                        <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">{event.note}</p>
                      </div>
                    </div>
                  </div>)}
              </div>
            </section>

            {
    /* ── 5. Weather advice ── */
  }
            <section>
              <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)] mb-3">Weather advice</h2>
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
                {
    /* Condition headline */
  }
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 rounded-xl flex-shrink-0">
                    <CloudRain className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Check weather conditions</p>
                    <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">
                      Review current weather before making planting decisions.
                    </p>
                  </div>
                </div>

                {
    /* Actions */
  }
                <div className="space-y-1.5">
                  {WEATHER_ACTIONS.map((action, i) => <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                      <p className="text-[13px] text-[var(--hw-neutral-900)]">{action}</p>
                    </div>)}
                </div>

                {
    /* Link to weather screen */
  }
                <button
    onClick={() => navigate("/farmer/market/weather")}
    className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
  >
                  View weather forecast
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </section>
          </div>
        </div>

        {
    /* ── 6. Check my crop action (bottom) ── */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[var(--hw-green-50)] rounded-xl flex-shrink-0">
              <Sprout className="w-4 h-4 text-[var(--hw-green-700)]" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Check a crop before planting</p>
              <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">
                Enter your crop, farm size, cost, and expected harvest to get a planting advisory.
              </p>
            </div>
          </div>
          <button
    onClick={() => navigate("/farmer/assess")}
    className="w-full flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors"
  >
            Start check
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>;
}
export {
  PlantingGuidePage as default
};
