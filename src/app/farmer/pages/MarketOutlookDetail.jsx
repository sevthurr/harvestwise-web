import { useParams, useNavigate } from "react-router";
import {
  TrendingUp,
  Package,
  CloudRain,
  CalendarDays,
  Leaf,
  ChevronRight,
  BarChart3
} from "lucide-react";
import { COMMODITIES } from "../components/market/mockData";
import { CommodityIllustration, COMMODITY_REGISTRY } from "../../global/components/shared/CommodityIllustrations";
import { COMMODITY_OUTLOOK } from "./MarketPage";
import {
  LEVEL_CODES,
  MARKET_STATUS_CODES,
  PRICE_TREND_CODES,
  normalizeLevelCode,
  normalizeMarketStatusCode,
  normalizePriceTrendCode,
} from "../utils/farmerCodes";
import { useLanguage } from "../../global/contexts/LanguageContext";

const STATUS_MAP = {
  [MARKET_STATUS_CODES.FAVORABLE]: "Favorable",
  [MARKET_STATUS_CODES.BALANCED]: "Balanced",
  [MARKET_STATUS_CODES.MONITOR]: "Watch closely",
  [MARKET_STATUS_CODES.HIGH_RISK]: "Cautious",
  "Favorable": "Favorable",
  "Balanced": "Balanced",
  "Monitor": "Watch closely",
  "High Risk": "Cautious"
};
const STATUS_CLS = {
  [MARKET_STATUS_CODES.FAVORABLE]: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-l-emerald-500", label: "Favorable" },
  [MARKET_STATUS_CODES.BALANCED]: { color: "text-blue-600", bg: "bg-blue-50", border: "border-l-blue-500", label: "Balanced" },
  [MARKET_STATUS_CODES.MONITOR]: { color: "text-amber-700", bg: "bg-amber-50", border: "border-l-amber-500", label: "Watch closely" },
  [MARKET_STATUS_CODES.HIGH_RISK]: { color: "text-red-700", bg: "bg-red-50", border: "border-l-red-500", label: "Cautious" },
  "Favorable": { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-l-emerald-500", label: "Favorable" },
  "Balanced": { color: "text-blue-600", bg: "bg-blue-50", border: "border-l-blue-500", label: "Balanced" },
  "Watch closely": { color: "text-amber-700", bg: "bg-amber-50", border: "border-l-amber-500", label: "Watch closely" },
  "Cautious": { color: "text-red-700", bg: "bg-red-50", border: "border-l-red-500", label: "Cautious" }
};
const FARMER_INSIGHTS = {
  kamatis: ["Kamatis prices are slightly rising, but higher arrivals and Q3 production suggest supply may increase near harvest.", "Plant carefully and keep checking prices before expanding your area."],
  talong: ["Talong prices and arrivals are stable with no strong signal in either direction.", "Conditions are acceptable. Monitor before making significant planting decisions."],
  repolyo: ["Repolyo prices are falling and arrivals are elevated. Supply pressure is high near harvest.", "Consider a smaller planting area. Review current prices and wait for signs of improvement."],
  atsal: ["Atsal supply is limited and prices are rising at Bangkerohan. Low arrival pressure supports current prices.", "Conditions are currently favorable. Confirm profitability before expanding area."],
  carrots: ["Carrots prices and arrivals are stable. No unusual supply or price pressure is present.", "Conditions are balanced. Monitor prices and seasonal patterns before planting."],
  pipino: ["Pipino arrivals and prices are stable. Slight upward tendency is present but not strongly favorable.", "Conditions are acceptable. Check prices and costs before finalizing your planting plan."],
  ampalaya: ["Ampalaya supply is tight and prices are rising. Lower arrivals may support market prices near harvest.", "Conditions are currently favorable. Confirm profitability before expanding planted area."],
  kalabasa: ["Kalabasa supply is high and prices are stable but low. Abundant supply is limiting price recovery.", "Conditions are balanced but prices are low. Review break-even carefully before planting."],
  lettuce: ["Lettuce prices are falling and arrivals are rising. Oversupply is putting strong pressure on prices.", "Conditions are not favorable. Consider waiting or checking if supply improves."],
  pechay: ["Chinese Pechay prices are falling and arrivals are significantly elevated. Supply pressure is high.", "Conditions are not favorable. Consider waiting for better market conditions before planting."]
};
const VARIANT_CLS = {
  favorable: { color: "text-emerald-700", bg: "bg-[var(--hw-neutral-50)]", badge: "text-emerald-700" },
  neutral: { color: "text-blue-600", bg: "bg-[var(--hw-neutral-50)]", badge: "text-blue-600" },
  caution: { color: "text-amber-700", bg: "bg-[var(--hw-neutral-50)]", badge: "text-amber-700" },
  unfavorable: { color: "text-red-700", bg: "bg-[var(--hw-neutral-50)]", badge: "text-red-700" },
  flag: { color: "text-blue-600", bg: "bg-[var(--hw-neutral-50)]", badge: "text-blue-600" }
};
function getGlanceFactors(commodityId, name) {
  const outlook = COMMODITY_OUTLOOK[commodityId];
  if (!outlook) return [];
  const priceTrend = normalizePriceTrendCode(outlook.priceBehavior);
  const priceVariant = priceTrend === PRICE_TREND_CODES.RISING ? "neutral" : priceTrend === PRICE_TREND_CODES.FALLING ? "unfavorable" : "neutral";
  const arrivalClass = outlook.arrivalVolume === "Increasing" ? "Upper Middle" : outlook.arrivalVolume === "Decreasing" ? "Low" : "Lower Middle";
  const arrivalVariant = outlook.arrivalVolume === "Increasing" ? "caution" : outlook.arrivalVolume === "Decreasing" ? "favorable" : "neutral";
  const weatherCaution = outlook.weatherInfluence.toLowerCase().includes("rain") || outlook.weatherInfluence.toLowerCase().includes("risk");
  const calendarFlag = outlook.calendarInfluence.toLowerCase().includes("payday") || outlook.calendarInfluence.toLowerCase().includes("holiday");
  const seasonHigh = outlook.seasonalCondition.toLowerCase().includes("peak") || outlook.seasonalCondition.toLowerCase().includes("high");
  const seasonLow = outlook.seasonalCondition.toLowerCase().includes("off-season") || outlook.seasonalCondition.toLowerCase().includes("below");
  const seasonalClass = seasonHigh ? "Upper Middle" : seasonLow ? "Low" : "Lower Middle";
  const seasonalVariant = seasonHigh ? "caution" : seasonLow ? "favorable" : "neutral";
  return [
    {
      name: "Price Outlook",
      classification: priceTrend === PRICE_TREND_CODES.RISING ? "Neutral" : priceTrend === PRICE_TREND_CODES.FALLING ? "Unfavorable" : "Neutral",
      detail: `${name} prices may ${priceTrend === PRICE_TREND_CODES.RISING ? "stay near or above recent levels" : priceTrend === PRICE_TREND_CODES.FALLING ? "continue to fall" : "remain near recent levels"}.`,
      action: "View prices",
      path: `/prices/${commodityId}`,
      variant: priceVariant
    },
    {
      name: "DFTC Arrival Pressure",
      classification: arrivalClass,
      detail: `${name} arrivals remained in the ${arrivalClass === "Upper Middle" ? "upper half" : normalizeLevelCode(arrivalClass) === LEVEL_CODES.LOW ? "below-normal range" : "lower half"} of historical records during the last 4 weeks.`,
      action: "View arrivals",
      path: `/market/dftc-arrivals?commodity=${commodityId}`,
      variant: arrivalVariant
    },
    {
      name: "Historical Seasonal Production",
      classification: seasonalClass,
      detail: `Historical ${name} production is ${seasonHigh ? "above average" : seasonLow ? "below average" : "near average"} in the current quarter.`,
      action: "View production",
      path: `/market/seasonal-production?commodity=${commodityId}`,
      variant: seasonalVariant
    },
    {
      name: "Weather Risk",
      classification: weatherCaution ? "Caution" : "Suitable",
      detail: weatherCaution ? `Heavy rain may affect field work this week.` : `No significant weather risk expected near harvest.`,
      action: "View weather",
      path: "/market/weather",
      variant: weatherCaution ? "caution" : "favorable"
    },
    {
      name: "Calendar Context",
      classification: calendarFlag ? "Relevant flag" : "No relevant flag",
      detail: calendarFlag ? "Payday may support market activity near harvest." : "No major calendar events are expected near your harvest window.",
      action: "View calendar",
      path: "/market/calendar",
      variant: calendarFlag ? "flag" : "neutral"
    }
  ];
}
const WATCH_TEXT = {
  kamatis: "Monitor tomato prices carefully before planting additional area.",
  talong: "Eggplant conditions are stable — maintain current planting plan.",
  repolyo: "Consider waiting or reducing cabbage area until oversupply eases.",
  atsal: "Good conditions for bell pepper — confirm cost and profitability.",
  carrots: "Carrot prices are stable — review costs before planting.",
  pipino: "Cucumber conditions are balanced — monitor before planting.",
  ampalaya: "Bitter gourd conditions are favorable — confirm profit margin.",
  kalabasa: "Squash prices are low — review break-even carefully.",
  lettuce: "Consider waiting before planting lettuce until supply pressure reduces.",
  pechay: "Consider waiting before planting Chinese Pechay until supply pressure reduces."
};
function MarketOutlookDetailPage() {
  const { commodityId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const commodity = COMMODITIES.find((c) => c.id === commodityId);
  const outlook = commodityId ? COMMODITY_OUTLOOK[commodityId] : void 0;
  if (!commodity || !outlook) {
    return <div className="px-4 py-8 text-center">
        <p className="text-[var(--hw-neutral-900)]">{t ? t("farmer.empty.commodity_not_found") : "Commodity not found."}</p>
        <button onClick={() => navigate("/farmer/market")} className="mt-3 text-sm font-medium text-[var(--hw-green-700)]">
          Back to Market Outlook
        </button>
      </div>;
  }
  const statusCode = normalizeMarketStatusCode(outlook.status) || MARKET_STATUS_CODES.BALANCED;
  const statusLabel = STATUS_MAP[statusCode] ?? "Balanced";
  const statusCls = STATUS_CLS[statusCode] || STATUS_CLS[MARKET_STATUS_CODES.BALANCED];
  const insight = FARMER_INSIGHTS[commodity.id] ?? ["Market conditions are mixed.", "Continue monitoring before making planting decisions."];
  const glance = getGlanceFactors(commodity.id, commodity.name);
  const watchText = WATCH_TEXT[commodity.id] ?? `Monitor current conditions before planting ${commodity.name}.`;
  const relatedModules = [
    { label: "Price history", path: `/prices/${commodity.id}`, icon: <BarChart3 className="w-4 h-4" /> },
    { label: "Price forecast", path: `/forecast/${commodity.id}`, icon: <TrendingUp className="w-4 h-4" /> },
    { label: "DFTC arrivals", path: `/market/dftc-arrivals?commodity=${commodity.id}`, icon: <Package className="w-4 h-4" /> },
    { label: "Seasonal production", path: `/market/seasonal-production?commodity=${commodity.id}`, icon: <Leaf className="w-4 h-4" /> },
    { label: "Weather", path: "/market/weather", icon: <CloudRain className="w-4 h-4" /> },
    { label: "Market calendar", path: "/market/calendar", icon: <CalendarDays className="w-4 h-4" /> }
  ];
  return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-4">

        {
    /* Back + commodity switcher */
  }
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
    onClick={() => navigate("/farmer/market")}
    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-900)] transition-colors"
  >
            ← Market Overview
          </button>
          <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {Object.entries(COMMODITY_REGISTRY).map(([id, { name }]) => <button
    key={id}
    onClick={() => navigate(`/farmer/market/detail/${id}`)}
    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${id === commodityId ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                {name}
              </button>)}
          </div>
        </div>

        {
    /* A. Commodity header card */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
          <div className="flex items-center gap-4">
            <CommodityIllustration commodityId={commodity.id} className="w-16 h-16 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">{commodity.name}</h1>
              <span className={`inline-block text-sm font-semibold mt-1 ${statusCls.color}`}>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        {
    /* B. Farmer Insight card */
  }
        <div className={`bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] border-l-4 ${statusCls.border} p-4 space-y-2`}>
          <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
            Farmer insight for {commodity.name}
          </p>
          <p className="text-[var(--hw-neutral-900)] leading-relaxed">{insight[0]}</p>
          <p className="text-[13px] font-medium text-[var(--hw-neutral-900)]">{insight[1]}</p>
        </div>

        {
    /* C. At a glance factors */
  }
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
            At a glance
          </p>
          <div className="grid grid-cols-2 gap-2">
            {glance.map((f, i) => {
    const cls = VARIANT_CLS[f.variant];
    return <div
      key={f.name}
      className={`bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3 space-y-1.5 ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}
    >
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--hw-neutral-700)]">
                    {f.name}
                  </p>
                  <p className={`text-sm font-semibold ${cls.badge}`}>{f.classification}</p>
                  <p className="text-[12px] text-[var(--hw-neutral-900)] leading-snug">{f.detail}</p>
                  <button
      onClick={() => navigate(f.path)}
      className={`inline-flex items-center gap-0.5 text-[12px] font-medium ${cls.color} hover:opacity-70 transition-opacity`}
    >
                    {f.action}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>;
  })}
          </div>
        </div>

        {
    /* D. What to watch before planting */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
          <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
            What to watch before planting
          </p>
          <p className="text-[var(--hw-neutral-700)] leading-relaxed">{watchText}</p>
          <button
    onClick={() => navigate(`/farmer/assess?commodity=${commodity.id}`)}
    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
  >
            Check planting assessment
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {
    /* E. Related modules */
  }
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
            Related modules
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {relatedModules.map((m) => <button
    key={m.label}
    onClick={() => navigate(m.path)}
    className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white border border-[var(--hw-neutral-200)] rounded-2xl text-[13px] font-medium text-[var(--hw-green-700)] hover:bg-[var(--hw-green-50)] transition-colors shadow-[var(--shadow-xs)] text-left"
  >
                <div className="flex items-center gap-2">
                  <span className="text-[var(--hw-neutral-400)]">{m.icon}</span>
                  {m.label}
                </div>
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
              </button>)}
          </div>
        </div>

    </div>;
}
export {
  MarketOutlookDetailPage as default
};
