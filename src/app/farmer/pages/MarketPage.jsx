import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  CloudRain,
  CalendarDays,
  RefreshCw,
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
  ChevronRight
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from "recharts";
import { COMMODITIES } from "../components/market/mockData";
import { CommodityIllustration, COMMODITY_REGISTRY } from "../components/market/CommodityIllustrations";
import { useDisplayMode } from "../../global/contexts/DisplayModeContext";
const COMMODITY_OUTLOOK = {
  kamatis: { id: "kamatis", status: "Balanced", nearTermOutlook: "Supply may increase during the next period.", mainFactor: "More harvests are expected soon in the region.", action: "Monitor prices before increasing planted area.", arrivalVolume: "Increasing", arrivalDetail: "Kamatis deliveries to DFTC have risen slightly over the past three days.", priceBehavior: "Rising", priceDetail: "Bangkerohan retail prices have improved slightly, currently above break-even for most farms.", seasonalCondition: "Peak harvest season approaching in the coming weeks.", weatherInfluence: "Heavy rain may delay deliveries and briefly reduce supply.", calendarInfluence: "Upcoming payday period may support buyer demand near harvest.", risks: ["Oversupply risk if multiple farms harvest at the same time"], opportunities: ["Current Bangkerohan prices are above average break-even"], demandPressure: 55, arrivalVolumeMock: [82, 85, 88, 91, 90, 94, 96] },
  talong: { id: "talong", status: "Balanced", nearTermOutlook: "Stable market conditions expected.", mainFactor: "Supply and demand are well balanced.", action: "Continue monitoring. No urgent action needed.", arrivalVolume: "Stable", arrivalDetail: "Talong deliveries to DFTC have remained consistent this week.", priceBehavior: "Stable", priceDetail: "Bangkerohan retail prices have held steady. No major movement expected in the short term.", seasonalCondition: "Normal production season. No major seasonal shift expected soon.", weatherInfluence: "Some rain may occur but unlikely to significantly affect deliveries.", calendarInfluence: "No major calendar events expected to shift demand significantly.", risks: ["Minor supply fluctuations if weather worsens"], opportunities: ["Stable prices make planning easier for farmers"], demandPressure: 48, arrivalVolumeMock: [70, 72, 71, 73, 72, 71, 72] },
  repolyo: { id: "repolyo", status: "Monitor", nearTermOutlook: "High supply may continue to pressure prices.", mainFactor: "Multiple farms are harvesting at the same time.", action: "Consider delaying additional planting until supply eases.", arrivalVolume: "Increasing", arrivalDetail: "Repolyo arrival volumes at DFTC are elevated. Prices may face further downward pressure.", priceBehavior: "Falling", priceDetail: "Bangkerohan prices have declined and may continue falling while supply remains high.", seasonalCondition: "Peak production season is underway. More supply expected for several weeks.", weatherInfluence: "Weather is not currently adding significant pressure beyond supply.", calendarInfluence: "No major calendar events expected to quickly absorb the oversupply.", risks: ["Continued price decline if supply is not absorbed"], opportunities: ["Early exit from the market may yield better prices"], demandPressure: 38, arrivalVolumeMock: [90, 95, 100, 108, 112, 115, 118] },
  atsal: { id: "atsal", status: "Favorable", nearTermOutlook: "Limited supply expected to keep Bangkerohan prices elevated.", mainFactor: "Limited arrivals from key growing areas continue.", action: "Good conditions to sell if you have available stock.", arrivalVolume: "Decreasing", arrivalDetail: "Atsal DFTC arrivals remain low. Market demand is outpacing supply.", priceBehavior: "Rising", priceDetail: "Bangkerohan prices are elevated and may continue rising while supply stays limited.", seasonalCondition: "Off-season production period. Supply is not expected to recover soon.", weatherInfluence: "Weather has not significantly affected growing areas.", calendarInfluence: "Payday demand may further support prices in the near term.", risks: ["Any sudden supply increase could quickly soften prices"], opportunities: ["Current Bangkerohan prices are well above typical break-even levels"], demandPressure: 72, arrivalVolumeMock: [62, 60, 57, 54, 52, 50, 48] },
  carrots: { id: "carrots", status: "Balanced", nearTermOutlook: "No significant changes expected.", mainFactor: "Supply and demand are in balance.", action: "Conditions are acceptable. Monitor before major decisions.", arrivalVolume: "Stable", arrivalDetail: "Carrots deliveries to DFTC are steady. No unusual movement detected.", priceBehavior: "Stable", priceDetail: "Bangkerohan prices have stayed within a narrow range and are not expected to change significantly.", seasonalCondition: "Normal production period. Seasonal patterns are consistent with recent weeks.", weatherInfluence: "No weather events expected to affect supply or transport significantly.", calendarInfluence: "No active calendar events that would alter demand.", risks: ["Gradual supply increase as more farms reach harvest"], opportunities: ["Stable conditions make the market predictable for planning"], demandPressure: 50, arrivalVolumeMock: [65, 66, 65, 67, 66, 67, 67] },
  pipino: { id: "pipino", status: "Balanced", nearTermOutlook: "Stable conditions expected to continue.", mainFactor: "Supply and demand are well balanced.", action: "No urgent action needed. Continue monitoring.", arrivalVolume: "Stable", arrivalDetail: "Pipino DFTC arrivals are consistent. No major supply shocks expected.", priceBehavior: "Stable", priceDetail: "Bangkerohan retail prices are stable with a slight upward tendency.", seasonalCondition: "Normal growing season. Output is consistent with seasonal expectations.", weatherInfluence: "Minor weather risks present but not expected to significantly affect supply.", calendarInfluence: "No active calendar events that would significantly alter demand.", risks: ["Minor price fluctuations if weather affects field activity"], opportunities: ["Stable prices allow consistent planning"], demandPressure: 52, arrivalVolumeMock: [60, 61, 62, 61, 62, 62, 63] },
  ampalaya: { id: "ampalaya", status: "Favorable", nearTermOutlook: "Tight supply expected to continue supporting prices.", mainFactor: "Limited production in key growing areas.", action: "Good conditions to sell. Consider harvesting soon.", arrivalVolume: "Decreasing", arrivalDetail: "Ampalaya DFTC arrivals are low. Market sources indicate limited supply from production areas.", priceBehavior: "Rising", priceDetail: "Bangkerohan prices are rising due to limited availability. Buyers are paying premium rates.", seasonalCondition: "Below-normal production season. Supply is not expected to recover quickly.", weatherInfluence: "Weather conditions have had minimal impact on existing supply.", calendarInfluence: "Food service demand typically increases near payday periods, which may further support prices.", risks: ["Any supply recovery could quickly reduce the price premium"], opportunities: ["Premium prices available for sellers with existing stock"], demandPressure: 76, arrivalVolumeMock: [55, 52, 50, 47, 45, 43, 41] },
  kalabasa: { id: "kalabasa", status: "Balanced", nearTermOutlook: "Stable conditions expected. Prices likely to remain low.", mainFactor: "Ample supply is keeping prices steady.", action: "Conditions are acceptable. No urgent action needed.", arrivalVolume: "Stable", arrivalDetail: "Kalabasa DFTC supply is consistent. No supply shocks expected in the near term.", priceBehavior: "Stable", priceDetail: "Bangkerohan prices are low but stable. High supply is limiting price recovery.", seasonalCondition: "Peak production is sustaining high supply levels this season.", weatherInfluence: "Minor weather risks present, but not expected to disrupt deliveries.", calendarInfluence: "Steady household demand. No major calendar events expected to spike demand.", risks: ["Prices unlikely to recover while supply remains high"], opportunities: ["Stable prices allow for consistent income planning"], demandPressure: 42, arrivalVolumeMock: [88, 89, 90, 88, 89, 88, 90] },
  lettuce: { id: "lettuce", status: "Monitor", nearTermOutlook: "Continued oversupply may push prices lower.", mainFactor: "High farm production across multiple areas at the same time.", action: "Consider delaying additional planting until supply eases.", arrivalVolume: "Increasing", arrivalDetail: "Lettuce DFTC deliveries are rising. Prices may face additional downward pressure.", priceBehavior: "Falling", priceDetail: "Bangkerohan prices have dropped. Retail prices are following with a slight lag.", seasonalCondition: "Peak growing season for leafy vegetables. High production from multiple farms.", weatherInfluence: "Rain may reduce field quality and compound oversupply pressure.", calendarInfluence: "Steady household demand, but not strong enough to absorb current volumes.", risks: ["Continued price decline if supply does not ease soon"], opportunities: ["Buyers benefit from lower prices"], demandPressure: 35, arrivalVolumeMock: [80, 86, 92, 98, 105, 110, 116] },
  pechay: { id: "pechay", status: "Monitor", nearTermOutlook: "Continued oversupply may push Chinese Pechay prices lower.", mainFactor: "High farm production in multiple areas at the same time.", action: "Consider delaying planting until supply conditions improve.", arrivalVolume: "Increasing", arrivalDetail: "Chinese Pechay DFTC deliveries are rising. Prices may face additional downward pressure.", priceBehavior: "Falling", priceDetail: "Bangkerohan prices have dropped. Retail prices are following the wholesale decline.", seasonalCondition: "Peak growing season for leafy vegetables. High production from multiple farms.", weatherInfluence: "Rain may reduce field quality and compound oversupply pressure.", calendarInfluence: "Steady household demand, but not strong enough to absorb current volumes.", risks: ["Continued price decline if supply does not ease soon", "Quality degradation risk from heavy rain"], opportunities: ["Buyers benefit from lower prices", "Demand may improve if supply disruptions occur"], demandPressure: 33, arrivalVolumeMock: [85, 90, 95, 102, 108, 112, 118] }
};
const OVERALL_MARKET = {
  status: "Balanced",
  summary: "Market conditions are generally balanced.",
  detail: "Vegetable arrivals are increasing slightly for some commodities, but upcoming payday demand may help support prices overall.",
  nearTermOutlook7d: "DFTC arrivals and Bangkerohan prices suggest balanced conditions. Monitor weather and arrival volumes closely.",
  nearTermOutlook14d: "DFTC Arrival Volume and Seasonal Production Pressure may increase during the next 14 days. Prices may face mild downward pressure for some commodities.",
  nearTermOutlook28d: "Supply pressure may increase over the next 28 days. Prices may soften for high-supply commodities, while low-supply items may remain elevated."
};
const MARKET_DRIVERS_DATA = {
  arrivals: {
    status: "DFTC Arrival Volume: Slightly Increasing",
    detail: "DFTC arrivals are above their recent level for most commodities. Repolyo and Bawang show the highest increases. Bangkerohan does not have verified arrival volume data.",
    link: null,
    trend: "up"
  },
  price: {
    status: "Mixed",
    detail: "Prices have remained mostly stable. Sibuyas, Luya, and Okra are rising. Repolyo, Bawang, and Pechay are falling.",
    link: "/prices",
    trend: "mixed"
  },
  seasonality: {
    status: "Harvest Season Approaching",
    detail: "More farms in the Davao Region may begin harvesting in the coming weeks, which could increase market supply.",
    link: null,
    trend: "neutral"
  },
  weather: {
    status: "Heavy Rain Risk",
    detail: "Heavy rain may delay deliveries and affect field conditions over the next several days.",
    link: "/market/weather",
    trend: "warning"
  },
  calendar: {
    status: "Payday Period Ahead",
    detail: "An upcoming payday period may support buyer demand at markets this week.",
    link: "/market/calendar",
    trend: "up"
  }
};
const RISKS_OPPORTUNITIES = [
  { type: "risk", icon: AlertTriangle, label: "Possible oversupply", detail: "Kamatis, Repolyo, Bawang, and Pechay may face higher arrivals as farms harvest.", action: "Review market conditions before planting." },
  { type: "risk", icon: CloudRain, label: "Weather-related delivery disruption", detail: "Heavy rain over the next several days may delay farm-to-market transport.", action: "Prepare alternate transport or storage options." },
  { type: "opportunity", icon: TrendingUp, label: "Payday demand may strengthen prices", detail: "Upcoming payday periods historically support higher retail prices.", action: "Consider timing sales to coincide with payday periods." }
];
const STATUS_CONFIG = {
  "Favorable": { icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", label: "Favorable" },
  "Balanced": { icon: Scale, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", label: "Balanced" },
  "Monitor": { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Monitor" },
  "High Risk": { icon: AlertOctagon, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "High Risk" }
};
const DEFAULT_FILTERS = {
  commodityId: "all",
  period: "7d",
  marketSource: "Combined"
};
const MarketOutlookFilterDrawer = ({ open, filters, onClose, onApply }) => {
  const [draft, setDraft] = useState(filters);
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open]);
  if (!open) return null;
  const chipCls = (active) => `px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${active ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`;
  return <>
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
              {Object.entries(COMMODITY_REGISTRY).map(([id, { name }]) => <button key={id} onClick={() => setDraft((d) => ({ ...d, commodityId: id }))} className={chipCls(draft.commodityId === id)}>{name}</button>)}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-2">Outlook period</p>
            <div className="flex gap-2 flex-wrap">
              {["7d", "14d", "28d"].map((p) => <button key={p} onClick={() => setDraft((d) => ({ ...d, period: p }))} className={chipCls(draft.period === p)}>
                  {p === "7d" ? "Next 7 days" : p === "14d" ? "Next 14 days" : "Next 28 days"}
                </button>)}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-2">Market source</p>
            <div className="flex gap-2 flex-wrap">
              {["Combined", "DFTC", "Bangkerohan Public Market"].map((s) => <button key={s} onClick={() => setDraft((d) => ({ ...d, marketSource: s }))} className={chipCls(draft.marketSource === s)}>{s}</button>)}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[var(--hw-neutral-200)] flex gap-3">
          <button
    onClick={() => setDraft(DEFAULT_FILTERS)}
    className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            Clear
          </button>
          <button
    onClick={() => onApply(draft)}
    className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors flex items-center justify-center gap-1.5"
  >
            <Check className="w-4 h-4" />
            Apply
          </button>
        </div>
      </div>
    </>;
};
const CARD_INSIGHTS = {
  kamatis: { insight: "Prices are favorable, while arrivals and seasonal production require monitoring.", consideration: "Review the full assessment before expanding your planting area." },
  talong: { insight: "Prices and arrivals are stable with no strong signal in either direction.", consideration: "Conditions are acceptable. Monitor before making significant decisions." },
  repolyo: { insight: "Prices are falling and arrivals are elevated. Supply pressure is high.", consideration: "Consider waiting or planting a smaller area before prices improve." },
  atsal: { insight: "Arrivals are low and prices are rising. Market conditions are currently favorable.", consideration: "Confirm profitability and monitor supply before expanding." },
  carrots: { insight: "Prices and arrivals are balanced with no unusual pressure in either direction.", consideration: "Monitor prices and costs before finalizing your planting plan." },
  pipino: { insight: "Arrivals and prices are stable with a slight upward tendency.", consideration: "Check costs and current prices before committing to planting." },
  ampalaya: { insight: "Arrivals are low and prices are rising. Supply-side conditions are favorable.", consideration: "Confirm profitability and monitor supply before expanding area." },
  kalabasa: { insight: "Supply is high and prices are stable but low. Abundant supply is limiting recovery.", consideration: "Review your break-even price carefully before planting." },
  lettuce: { insight: "Prices are falling and arrivals are rising. Oversupply is creating strong pressure.", consideration: "Consider waiting for conditions to improve before planting." },
  pechay: { insight: "Prices are falling and arrivals are significantly elevated. Pressure is high.", consideration: "Consider waiting for better market conditions before planting." }
};
const CommodityOutlookCard = ({ commodity, outlook, onViewDetails }) => {
  const cfg = STATUS_CONFIG[outlook.status];
  const cardInsight = CARD_INSIGHTS[commodity.id] ?? {
    insight: outlook.nearTermOutlook,
    consideration: outlook.action
  };
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <CommodityIllustration commodityId={commodity.id} className="w-11 h-11 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--hw-neutral-900)]">{commodity.name}</p>
          <span className={`text-xs font-semibold ${cfg.color} mt-0.5 block`}>{cfg.label}</span>
        </div>
      </div>

      <div className="space-y-1 text-[13px]">
        <p className="text-[var(--hw-neutral-700)] leading-snug">{cardInsight.insight}</p>
        <p className="text-[var(--hw-neutral-900)] leading-snug">{cardInsight.consideration}</p>
      </div>

      <button
    onClick={onViewDetails}
    className="self-start inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
        View details
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>;
};
const signalCls = {
  Risk: "bg-amber-50 text-amber-700 border border-amber-200",
  Opportunity: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Monitor: "bg-blue-50 text-blue-600 border border-blue-200"
};
const MARKET_DRIVERS = [
  {
    id: "price",
    title: "Price Behavior",
    Icon: TrendingUp,
    classification: "Mixed",
    evidence: "Bangkerohan prices showed upward movement for Kamatis and Sibuyas. Repolyo, Bawang, and Pechay prices declined during the same period.",
    signal: "Monitor",
    viewBasisLabel: "View price records",
    viewBasisPath: "/prices"
  },
  {
    id: "dftc",
    title: "DFTC Arrival Pressure",
    Icon: Package,
    classification: "Slightly Elevated",
    evidence: "DFTC arrivals are above their recent level for most commodities. Repolyo and Bawang show the highest increases.",
    signal: "Risk",
    viewBasisLabel: "View arrival details",
    viewBasisPath: "/market/dftc-arrivals"
  },
  {
    id: "seasonal",
    title: "Seasonal Production Pressure",
    Icon: Leaf,
    classification: "Moderate",
    evidence: "More farms in Davao Region may begin harvesting during the coming weeks, which may increase market supply.",
    signal: "Monitor",
    viewBasisLabel: "View production context",
    viewBasisPath: "/market/seasonal-production"
  },
  {
    id: "weather",
    title: "Weather Risk",
    Icon: CloudRain,
    classification: "Elevated",
    evidence: "Heavy rain is expected in Davao City over the next several days. Farm activity and market deliveries may be affected.",
    signal: "Risk",
    viewBasisLabel: "View weather forecast",
    viewBasisPath: "/market/weather"
  },
  {
    id: "calendar",
    title: "Market Calendar",
    Icon: CalendarDays,
    classification: "Neutral to Positive",
    evidence: "An upcoming payday period may support market activity in Davao City. Effect on prices remains uncertain.",
    signal: "Opportunity",
    viewBasisLabel: "View market calendar",
    viewBasisPath: "/market/calendar"
  }
];
const DriverCard = ({
  driver,
  onNavigate
}) => <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-2">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[var(--hw-neutral-900)] flex-shrink-0"><driver.Icon className="w-4 h-4" /></span>
        <p className="text-xs font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide truncate">{driver.title}</p>
      </div>
      
    </div>
    <p className="text-sm font-semibold text-[var(--hw-neutral-900)]">{driver.classification}</p>
    <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">{driver.evidence}</p>
    {driver.viewBasisPath && <button
  onClick={() => onNavigate(driver.viewBasisPath)}
  className="self-start inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors mt-0.5"
>
        View basis
        <ChevronRight className="w-3.5 h-3.5" />
      </button>}
  </div>;
const tooltipStyle = { backgroundColor: "white", border: "1px solid var(--hw-neutral-200)", borderRadius: 8, fontSize: 11 };
const ArrivalVolumeChart = ({ commodityId }) => {
  const data = COMMODITY_OUTLOOK[commodityId]?.arrivalVolumeMock ?? [80, 82, 84, 86, 88, 90, 92];
  const chartData = data.map((v, i) => ({ d: `-${6 - i}d`, vol: v }));
  const lastVal = data[data.length - 1];
  const firstVal = data[0];
  const trend = lastVal > firstVal ? "up" : lastVal < firstVal ? "down" : "flat";
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
      <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide mb-3">DFTC Arrival Volume trend (7 days)</p>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--hw-neutral-100)" />
            <XAxis dataKey="d" tick={{ fill: "var(--hw-neutral-400)", fontSize: 9 }} stroke="none" />
            <YAxis tick={{ fill: "var(--hw-neutral-400)", fontSize: 9 }} stroke="none" domain={["auto", "auto"]} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "Volume (index)"]} />
            <Bar dataKey="vol" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill={i === chartData.length - 1 ? "#245501" : "#AAD576"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[13px] text-[var(--hw-neutral-900)] mt-2">
        Arrivals are <span className="font-medium">{trend === "up" ? "increasing" : trend === "down" ? "decreasing" : "stable"}</span> over the past 7 days. Last index: {lastVal}.
      </p>
    </div>;
};
const SupplyPressureCard = ({ commodityId }) => {
  const value = commodityId === "all" ? Math.round(Object.values(COMMODITY_OUTLOOK).reduce((s, o) => s + o.demandPressure, 0) / Object.keys(COMMODITY_OUTLOOK).length) : COMMODITY_OUTLOOK[commodityId]?.demandPressure ?? 50;
  const label = value >= 70 ? "High supply pressure" : value >= 45 ? "Moderate supply pressure" : "Low supply pressure";
  const color = value >= 70 ? "bg-amber-500" : value >= 45 ? "bg-amber-400" : "bg-[var(--hw-neutral-300)]";
  return null;
};
const ActiveCalendarIndicators = () => <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
    <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Market Activity Context</p>
    {[
  { category: "Payday Period", label: "Mid-month payday", detail: "Jun 25\u201326", impact: "May support market activity. Effect remains uncertain." },
  { category: "Weekends", label: "Weekend", detail: "Jun 27\u201328", impact: "Possible market activity increase in Davao City markets." },
  { category: "Local Holidays", label: "Araw ng Dabaw", detail: "Mar 16", impact: "May affect deliveries or market schedules in Davao City." },
  { category: "Local Events", label: "Kadayawan Festival", detail: "Aug", impact: "May support market activity during the festival period." }
].map((item) => <div key={item.label} className="flex items-start gap-2">
        <CalendarDays className="flex-shrink-0 w-3.5 h-3.5 text-blue-400 mt-1" />
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--hw-neutral-700)]">{item.category}</span>
            <p className="text-sm font-medium text-[var(--hw-neutral-900)]">{item.label} <span className="text-[var(--hw-neutral-700)] font-normal">· {item.detail}</span></p>
          </div>
          <p className="text-[13px] text-[var(--hw-neutral-900)]">{item.impact}</p>
        </div>
      </div>)}
    <p className="text-[13px] text-[var(--hw-neutral-700)] italic">Calendar indicators do not guarantee higher consumer demand.</p>
  </div>;
function MarketOverviewPage() {
  const navigate = useNavigate();
  const { mode } = useDisplayMode();
  const isAnalytics = mode === "analytics";
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const commoditiesToShow = filters.commodityId === "all" ? COMMODITIES : COMMODITIES.filter((c) => c.id === filters.commodityId);
  const periodLabel = filters.period === "7d" ? "7 days" : filters.period === "14d" ? "14 days" : "28 days";
  const filterSummary = `${periodLabel} \xB7 ${filters.marketSource === "Combined" ? "All markets" : filters.marketSource === "Bangkerohan Public Market" ? "Bangkerohan" : "DFTC"} \xB7 ${filters.commodityId === "all" ? "All commodities" : COMMODITY_REGISTRY[filters.commodityId]?.name ?? filters.commodityId}`;
  const nearTermOutlook = filters.period === "7d" ? OVERALL_MARKET.nearTermOutlook7d : filters.period === "14d" ? OVERALL_MARKET.nearTermOutlook14d : OVERALL_MARKET.nearTermOutlook28d;
  const overallStatus = STATUS_CONFIG[OVERALL_MARKET.status];
  const OverallIcon = overallStatus.icon;
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-4xl space-y-5">

        {
    /* Filter button — below tabs, compact height */
  }
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

        {
    /* ── Desktop: two-column layout ── */
  }
        <div className="md:grid md:grid-cols-[1fr_280px] md:gap-6 space-y-5 md:space-y-0">

          {
    /* Main column */
  }
          <div className="space-y-5">

            {
    /* 1. Overall market condition */
  }
            <div className={`rounded-2xl border p-4 space-y-2 ${overallStatus.bg} ${overallStatus.border}`}>
              <div className="flex items-center gap-2">
                <OverallIcon className={`w-5 h-5 ${overallStatus.color}`} />
                <p className={`text-xs font-semibold uppercase tracking-wide ${overallStatus.color}`}>
                  {overallStatus.label} · Overall market condition
                </p>
              </div>
              <p className="font-semibold text-[var(--hw-neutral-900)]">{OVERALL_MARKET.summary}</p>
              <p className="text-[15px] text-[var(--hw-neutral-700)] leading-relaxed">{OVERALL_MARKET.detail}</p>
            </div>

            {
    /* 2. Near-term outlook */
  }
            

            {
    /* 3. Commodity overview cards */
  }
            <section>
              <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)] mb-3">Commodity overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {commoditiesToShow.map((c) => {
    const outlook = COMMODITY_OUTLOOK[c.id];
    if (!outlook) return null;
    return <CommodityOutlookCard
      key={c.id}
      commodity={c}
      outlook={outlook}
      isAnalytics={isAnalytics}
      period={filters.period}
      onViewDetails={() => navigate(`/market/detail/${c.id}`)}
    />;
  })}
              </div>
            </section>

            {
    /* Analytics: demand pressure + arrival chart */
  }
            {isAnalytics && <section className="space-y-4">
                
                <SupplyPressureCard commodityId={filters.commodityId} />
                {filters.commodityId !== "all" && <ArrivalVolumeChart commodityId={filters.commodityId} />}
                <ActiveCalendarIndicators />
              </section>}
          </div>

          {
    /* Supporting column — desktop */
  }
          <div className="hidden md:flex md:flex-col gap-4">
            <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Market drivers</h2>
            {MARKET_DRIVERS.map((d) => <DriverCard key={d.id} driver={d} onNavigate={navigate} />)}
            {isAnalytics && <SupplyPressureCard commodityId={filters.commodityId} />}
          </div>
        </div>

        {
    /* Market drivers — mobile */
  }
        <div className="md:hidden space-y-3">
          <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Market drivers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MARKET_DRIVERS.map((d) => <DriverCard key={d.id} driver={d} onNavigate={navigate} />)}
          </div>
        </div>

      </div>

      <MarketOutlookFilterDrawer
    open={filterOpen}
    filters={filters}
    onClose={() => setFilterOpen(false)}
    onApply={(f) => {
      setFilters(f);
      setFilterOpen(false);
    }}
  />
    </div>;
}
const TABS = [
  { id: "overview", label: "Overview", path: "/market", icon: LayoutDashboard },
  { id: "weather", label: "Weather", path: "/market/weather", icon: CloudRain },
  { id: "calendar", label: "Calendar", path: "/market/calendar", icon: CalendarDays }
];
const TAB_META = {
  overview: { title: "Market Overview", subtitle: "See the key price, supply, weather, and calendar signals for each commodity." },
  weather: { title: "Weather Forecast", subtitle: "Rainfall, temperature, and weather risk for Davao Region farms and deliveries." },
  calendar: { title: "Market Calendar", subtitle: "Holidays, payday periods, and local events that may influence market activity and consumer turnout." }
};
function getActiveTab(pathname) {
  if (pathname.startsWith("/market/weather")) return "weather";
  if (pathname.startsWith("/market/calendar")) return "calendar";
  return "overview";
}
const MarketLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const meta = TAB_META[activeTab];
  return <div>
      <div className="sticky top-16 z-30 bg-white border-b border-[var(--hw-neutral-200)]">
        <div className="px-4 md:px-6 pt-4 pb-2 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">{meta.title}</h1>
            <div className="flex items-center gap-1.5 text-[var(--hw-neutral-700)] flex-shrink-0">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-[13px] whitespace-nowrap">Updated today at 7:30 AM</span>
            </div>
          </div>
          <p className="text-[15px] text-[var(--hw-neutral-900)]">{meta.subtitle}</p>
        </div>
        <div className="flex px-4 md:px-6">
          {TABS.map(({ id, label, path, icon: Icon }) => {
    const active = activeTab === id;
    return <button
      key={id}
      onClick={() => navigate(path)}
      className={`flex items-center gap-1.5 px-4 py-3 text-[15px] font-medium border-b-2 transition-colors ${active ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)]" : "border-transparent text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-700)] hover:border-[var(--hw-neutral-300)]"}`}
    >
                <Icon className="w-4 h-4" />
                {label}
              </button>;
  })}
        </div>
      </div>
      <Outlet />
    </div>;
};
function MarketWeatherPage() {
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-3xl">
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-6 py-14 text-center">
          <CloudRain className="w-10 h-10 text-[var(--hw-neutral-300)] mx-auto mb-3" />
          <p className="font-semibold text-[var(--hw-neutral-900)]">Weather Forecast</p>
          <p className="text-[15px] text-[var(--hw-neutral-700)] mt-1 max-w-xs mx-auto leading-relaxed">
            This view will show detailed weather conditions that may affect field activity, farm-to-market transport, and delivery volumes.
          </p>
        </div>
      </div>
    </div>;
}
function MarketCalendarPage() {
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-3xl">
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-6 py-14 text-center">
          <CalendarDays className="w-10 h-10 text-[var(--hw-neutral-300)] mx-auto mb-3" />
          <p className="font-semibold text-[var(--hw-neutral-900)]">Market Calendar</p>
          <p className="text-[15px] text-[var(--hw-neutral-700)] mt-1 max-w-xs mx-auto leading-relaxed">
            This view will show upcoming payday periods, public holidays, market-day schedules, and other calendar factors.
          </p>
        </div>
      </div>
    </div>;
}
export {
  COMMODITY_OUTLOOK,
  MARKET_DRIVERS_DATA,
  MarketCalendarPage,
  MarketLayout,
  MarketOverviewPage,
  MarketWeatherPage,
  STATUS_CONFIG
};
