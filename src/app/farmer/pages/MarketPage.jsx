import { useState, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  fetchFarmerProfile,
  fetchMonthlyRecommendations,
  monthlyRecommendationsKey,
} from "../../global/hooks/useFarmerPrefetch";
import { sortWithPreferredFirst, isPreferredCrop } from "../utils/cropPreferences";
import { PreferredStar } from "../components/shared/PreferredStar";
import {
  LayoutDashboard,
  CloudRain,
  CalendarDays,
  SlidersHorizontal,
  X,
  Check,
  CheckCircle2,
  Scale,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  Package,
  Leaf,
  ChevronRight,
} from "lucide-react";
import { apiGet, parseResponse } from "../../global/api";
import { CommodityIllustration, COMMODITY_REGISTRY } from "../../global/components/shared/CommodityIllustrations";
import { useDisplayMode } from "../../global/contexts/DisplayModeContext";
import { useLanguage } from "../../global/contexts/LanguageContext";
import {
  MARKET_STATUS_CODES,
  normalizeMarketStatusCode,
  normalizeAdvisoryCode,
  ADVISORY_CODES,
} from "../utils/farmerCodes";
import { Skeleton } from "../components/shared/FarmerSkeletons";

// ── advisory_category → market status mapping ────────────────────────────
function advisoryToStatus(advisory_category) {
  const code = normalizeAdvisoryCode(advisory_category);
  if (code === ADVISORY_CODES.RECOMMENDED) return MARKET_STATUS_CODES.FAVORABLE;
  if (code === ADVISORY_CODES.PROCEED_WITH_CAUTION) return MARKET_STATUS_CODES.MONITOR;
  if (code === ADVISORY_CODES.AVOID_FOR_NOW) return MARKET_STATUS_CODES.HIGH_RISK;
  return MARKET_STATUS_CODES.BALANCED;
}

const STATUS_CONFIG = {
  [MARKET_STATUS_CODES.FAVORABLE]: { icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", label: "Favorable" },
  [MARKET_STATUS_CODES.BALANCED]:  { icon: Scale,        color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200",    label: "Balanced"  },
  [MARKET_STATUS_CODES.MONITOR]:   { icon: AlertTriangle, color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200",   label: "Monitor"   },
  [MARKET_STATUS_CODES.HIGH_RISK]: { icon: AlertOctagon,  color: "text-red-600",     bg: "bg-red-50",     border: "border-red-200",     label: "High Risk" },
};

const DEFAULT_FILTERS = { commodityId: "all", period: "7d" };

// ── filter drawer ────────────────────────────────────────────────────────
const MarketOutlookFilterDrawer = ({ open, filters, onClose, onApply }) => {
  const [draft, setDraft] = useState(filters);
  if (!open) return null;
  const chipCls = (active) =>
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
          <p className="font-semibold text-[var(--hw-neutral-900)]">Filter</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-2">Commodity</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setDraft((d) => ({ ...d, commodityId: "all" }))} className={chipCls(draft.commodityId === "all")}>All</button>
              {Object.entries(COMMODITY_REGISTRY).map(([id, { name }]) => (
                <button key={id} onClick={() => setDraft((d) => ({ ...d, commodityId: id }))} className={chipCls(draft.commodityId === id)}>{name}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-2">Outlook period</p>
            <div className="flex gap-2 flex-wrap">
              {["7d", "14d", "28d"].map((p) => (
                <button key={p} onClick={() => setDraft((d) => ({ ...d, period: p }))} className={chipCls(draft.period === p)}>
                  {p === "7d" ? "Next 7 days" : p === "14d" ? "Next 14 days" : "Next 28 days"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[var(--hw-neutral-200)] flex gap-3">
          <button onClick={() => setDraft(DEFAULT_FILTERS)} className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors">Clear</button>
          <button onClick={() => onApply(draft)} className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4" />Apply
          </button>
        </div>
      </div>
    </>
  );
};

// ── commodity card ───────────────────────────────────────────────────────
const CommodityOutlookCard = ({ rec, priceCard, onViewDetails, isPreferred }) => {
  const statusCode = advisoryToStatus(rec.advisory_category);
  const cfg = STATUS_CONFIG[statusCode] || STATUS_CONFIG[MARKET_STATUS_CODES.BALANCED];
  const Icon = cfg.icon;

  // Short insight: use explanation from API; fall back to a neutral sentence
  const insight = rec.explanation || "Market conditions have been assessed for this commodity.";
  // Consideration: derive from advisory category
  const consideration =
    statusCode === MARKET_STATUS_CODES.FAVORABLE
      ? "Conditions look favorable. Confirm profitability before expanding area."
      : statusCode === MARKET_STATUS_CODES.MONITOR
      ? "Exercise caution. Monitor prices and supply before committing."
      : statusCode === MARKET_STATUS_CODES.HIGH_RISK
      ? "Conditions are not favorable. Consider waiting for improvement."
      : "Conditions are balanced. Monitor before major planting decisions.";

  const displayName = rec.commodity_name || rec.commodity_id;
  const iconKey = rec._iconKey;

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <CommodityIllustration commodityId={iconKey || rec.commodity_id} commodityName={displayName} className="w-11 h-11 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-[var(--hw-neutral-900)]">{displayName}</p>
            {isPreferred && <PreferredStar className="w-3.5 h-3.5 text-amber-500" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
          </div>
        </div>
      </div>
      <div className="space-y-1 text-[13px]">
        <p className="text-[var(--hw-neutral-700)] leading-snug line-clamp-3">{insight}</p>
        <p className="text-[var(--hw-neutral-900)] leading-snug">{consideration}</p>
      </div>
      <button
        onClick={onViewDetails}
        className="self-start inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
      >
        View details <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ── market drivers (static labels, live links) ───────────────────────────
const getMarketDrivers = (t) => [
  {
    id: "price",
    title: "Price Behavior",
    Icon: TrendingUp,
    classification: "Mixed",
    evidence: t
      ? t("farmer.factors.price.driver_overview")
      : "Bangkerohan prices showed mixed movement across commodities this period.",
    signal: "Monitor",
    viewBasisLabel: "View price records",
    viewBasisPath: "/prices",
  },
  {
    id: "dftc",
    title: "DFTC Arrival Pressure",
    Icon: Package,
    classification: "Slightly Elevated",
    evidence: t
      ? `${t("farmer.factors.arrival.driver_overview")} ${t("farmer.factors.arrival.bangkerohan_unverified_notice")}`
      : "DFTC arrivals are above their recent level for most commodities.",
    signal: "Risk",
    viewBasisLabel: "View arrival details",
    viewBasisPath: "/market/dftc-arrivals",
  },
  {
    id: "seasonal",
    title: "Seasonal Production Pressure",
    Icon: Leaf,
    classification: "Moderate",
    evidence: t
      ? t("farmer.factors.production.driver_overview")
      : "More farms in Davao Region may begin harvesting during the coming weeks.",
    signal: "Monitor",
    viewBasisLabel: "View production context",
    viewBasisPath: "/market/seasonal-production",
  },
  {
    id: "weather",
    title: "Weather Risk",
    Icon: CloudRain,
    classification: "See forecast",
    evidence: "Check the Weather tab for current rainfall, temperature, and risk conditions for Davao farms.",
    signal: "Risk",
    viewBasisLabel: "View weather forecast",
    viewBasisPath: "/market/weather",
  },
  {
    id: "calendar",
    title: "Market Calendar",
    Icon: CalendarDays,
    classification: "Neutral to Positive",
    evidence: t
      ? t("farmer.calendar.driver_payday_detail")
      : "Check upcoming payday periods and holidays that may influence market activity.",
    signal: "Opportunity",
    viewBasisLabel: "View market calendar",
    viewBasisPath: "/market/calendar",
  },
];

const signalCls = {
  Risk: "bg-amber-50 text-amber-700 border border-amber-200",
  Opportunity: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Monitor: "bg-blue-50 text-blue-600 border border-blue-200",
};

const DriverCard = ({ driver, onNavigate }) => (
  <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-2">
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[var(--hw-neutral-900)] flex-shrink-0"><driver.Icon className="w-4 h-4" /></span>
      <p className="text-xs font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide truncate">{driver.title}</p>
    </div>
    <p className="text-sm font-semibold text-[var(--hw-neutral-900)]">{driver.classification}</p>
    <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">{driver.evidence}</p>
    {driver.viewBasisPath && (
      <button
        onClick={() => onNavigate(driver.viewBasisPath)}
        className="self-start inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors mt-0.5"
      >
        View basis <ChevronRight className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

// ── skeleton rows ────────────────────────────────────────────────────────
const OverviewSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] p-4 space-y-3 animate-pulse">
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        </div>
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-4/5 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
    ))}
  </div>
);

// ── main overview page ───────────────────────────────────────────────────
function MarketOverviewPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { mode } = useDisplayMode();
  const isAnalytics = mode === "analytics";
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: profileData } = useQuery({
    queryKey: ["farmer", "profile"],
    queryFn: fetchFarmerProfile,
    staleTime: 1000 * 60 * 5,
  });
  const preferredCrops = useMemo(
    () => profileData?.preferred_crops || profileData?.preferredCrops || [],
    [profileData]
  );

  // Live recommendations
  const { data: recsData, isLoading: recsLoading } = useQuery({
    queryKey: monthlyRecommendationsKey(),
    queryFn: () => fetchMonthlyRecommendations(),
    staleTime: 1000 * 60 * 30,
  });

  // Live prices (top-10 only, for direction label + current price)
  const { data: pricesData } = useQuery({
    queryKey: ["prices", "list"],
    queryFn: async () => {
      const res = await apiGet("/prices?is_top10=true&page_size=50");
      if (!res.ok) return { items: [] };
      return parseResponse(res);
    },
    staleTime: 1000 * 60 * 30,
  });

  // Build a commodity_id → price card map
  const priceMap = useMemo(() => {
    const map = new Map();
    for (const p of pricesData?.items || []) {
      map.set(p.commodity_id, p);
    }
    return map;
  }, [pricesData]);

  // Enrich each recommendation with its icon key (for CommodityIllustration)
  const enrichedRecs = useMemo(() => {
    const items = recsData?.items || [];
    return items.map((rec) => ({
      ...rec,
      _iconKey: null, // CommodityIllustration handles name-based lookup internally
      _priceCard: priceMap.get(rec.commodity_id) || null,
    }));
  }, [recsData, priceMap]);

  // Apply filter
  const visibleRecs = useMemo(() => {
    if (filters.commodityId === "all") return enrichedRecs;
    // Match by iconKey slug or by commodity name
    return enrichedRecs.filter((r) => {
      const nameLower = (r.commodity_name || "").toLowerCase();
      return (
        r.commodity_id === filters.commodityId ||
        nameLower.includes(filters.commodityId) ||
        (COMMODITY_REGISTRY[filters.commodityId]?.name || "").toLowerCase() === nameLower
      );
    });
  }, [enrichedRecs, filters.commodityId]);

  // Sort preferred crops first
  const sortedRecs = useMemo(() => {
    // Wrap recs as objects with id/name so sortWithPreferredFirst works
    const withId = visibleRecs.map((r) => ({ ...r, id: r.commodity_id, name: r.commodity_name }));
    return sortWithPreferredFirst(withId, preferredCrops);
  }, [visibleRecs, preferredCrops]);

  const marketDrivers = getMarketDrivers(t);
  const filterSummary = `${filters.period === "7d" ? "7 days" : filters.period === "14d" ? "14 days" : "28 days"} · ${
    filters.commodityId === "all"
      ? "All commodities"
      : COMMODITY_REGISTRY[filters.commodityId]?.name ?? filters.commodityId
  }`;

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      {/* Filter button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setFilterOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors text-[13px] font-medium shadow-[var(--shadow-xs)]"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filter
        </button>
        <span className="text-[13px] text-[var(--hw-neutral-900)] hidden sm:block">{filterSummary}</span>
      </div>

      <div className="md:grid md:grid-cols-[1fr_280px] md:gap-6 space-y-5 md:space-y-0">
        {/* Main column */}
        <div className="space-y-5">
          {/* Commodity overview cards */}
          <section>
            <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)] mb-3">Commodity overview</h2>
            {recsLoading ? (
              <OverviewSkeleton />
            ) : sortedRecs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] p-8 text-center text-[var(--hw-neutral-500)] text-[14px]">
                No recommendations available for this period.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sortedRecs.map((rec) => (
                  <CommodityOutlookCard
                    key={rec.commodity_id + (rec.commodity_variety || "")}
                    rec={rec}
                    priceCard={rec._priceCard}
                    isPreferred={isPreferredCrop({ id: rec.commodity_id, name: rec.commodity_name }, preferredCrops)}
                    onViewDetails={() => navigate(`/farmer/market/detail/${rec.commodity_id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Supporting column — desktop */}
        <div className="hidden md:flex md:flex-col gap-4">
          <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Market drivers</h2>
          {marketDrivers.map((d) => (
            <DriverCard key={d.id} driver={d} onNavigate={navigate} />
          ))}
        </div>
      </div>

      {/* Market drivers — mobile */}
      <div className="md:hidden space-y-3">
        <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Market drivers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {marketDrivers.map((d) => (
            <DriverCard key={d.id} driver={d} onNavigate={navigate} />
          ))}
        </div>
      </div>

      <MarketOutlookFilterDrawer
        open={filterOpen}
        filters={filters}
        onClose={() => setFilterOpen(false)}
        onApply={(f) => { setFilters(f); setFilterOpen(false); }}
      />
    </div>
  );
}

// ── tabs / layout ────────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "Overview",  path: "/market",          icon: LayoutDashboard },
  { id: "weather",  label: "Weather",   path: "/market/weather",  icon: CloudRain       },
  { id: "calendar", label: "Calendar",  path: "/market/calendar", icon: CalendarDays    },
];

const TAB_META = {
  overview: { title: "Market Overview",  subtitle: "See the key price, supply, weather, and calendar signals for each commodity." },
  weather:  { title: "Weather Forecast", subtitle: "Rainfall, temperature, and weather risk for Davao Region farms and deliveries." },
  calendar: { title: "Market Calendar",  subtitle: "Holidays, payday periods, and local events that may influence market activity and consumer turnout." },
};

function getActiveTab(pathname) {
  if (pathname.startsWith("/market/weather"))  return "weather";
  if (pathname.startsWith("/market/calendar")) return "calendar";
  return "overview";
}

const MarketLayout = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const meta      = TAB_META[activeTab];
  return (
    <div>
      <div className="sticky top-16 z-30 bg-white border-b border-[var(--hw-neutral-200)]">
        <div className="px-4 md:px-6 pt-4 pb-2 space-y-1">
          <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">{meta.title}</h1>
          <p className="text-[15px] text-[var(--hw-neutral-900)]">{meta.subtitle}</p>
        </div>
        <div className="flex px-4 md:px-6">
          {TABS.map(({ id, label, path, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => navigate(path)}
                className={`flex items-center gap-1.5 px-4 py-3 text-[15px] font-medium border-b-2 transition-colors ${
                  active
                    ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)]"
                    : "border-transparent text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-700)] hover:border-[var(--hw-neutral-300)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <Outlet />
    </div>
  );
};

export { MarketLayout, MarketOverviewPage, STATUS_CONFIG, advisoryToStatus };
