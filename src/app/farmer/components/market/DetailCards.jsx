import { useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  TrendingUp,
  Package,
  Sprout,
  CloudRain,
  CalendarDays,
  ArrowUpRight,
  Info
} from "lucide-react";
import { COMMODITIES } from "./mockData";
import { CommodityIllustration } from "./CommodityIllustrations";
import { PriceDirectionIndicator, SupplyConditionIndicator, DataFreshnessLabel } from "./Indicators";
const CommodityDetailHeader = ({
  commodity,
  onBack,
  onSwitch
}) => <div className="space-y-4">
    {
  /* Back + switch row */
}
    <div className="flex items-center justify-between gap-3">
      <button
  onClick={onBack}
  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-900)] transition-colors"
>
        <ArrowLeft className="w-4 h-4" />
        Market
      </button>
      {
  /* Commodity switcher */
}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {COMMODITIES.map((c) => <button
  key={c.id}
  onClick={() => onSwitch(c.id)}
  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${c.id === commodity.id ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`}
>
            {c.name}
          </button>)}
      </div>
    </div>

    {
  /* Commodity identity */
}
    <div className="flex items-center gap-4">
      <CommodityIllustration commodityId={commodity.id} className="w-16 h-16 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-[var(--hw-neutral-900)]">{commodity.name}</h1>
        <p className="text-sm text-[var(--hw-neutral-900)] mt-0.5">{commodity.detailStatus}</p>
        <DataFreshnessLabel label={`Updated ${commodity.lastUpdated}`} />
      </div>
    </div>

    {
  /* Market source pill */
}
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--hw-neutral-100)] rounded-full">
      <Package className="w-3.5 h-3.5 text-[var(--hw-neutral-700)]" />
      <span className="text-xs text-[var(--hw-neutral-900)]">{commodity.market}</span>
      <span className="text-xs text-[var(--hw-neutral-400)]">·</span>
      <span className="text-xs text-[var(--hw-neutral-900)]">{commodity.priceType}</span>
    </div>
  </div>;
const CurrentMarketConditionCard = ({
  commodity
}) => <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] p-4 shadow-[var(--shadow-xs)]">
    <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide mb-3">
      Current market condition
    </p>
    {
  /* Condition summary */
}
    <p className="text-sm text-[var(--hw-neutral-700)] leading-relaxed mb-3">
      {commodity.name} prices have {commodity.direction === "Rising" ? "increased slightly" : commodity.direction === "Falling" ? "decreased recently" : "remained steady"}, while current market supply is {commodity.supply.toLowerCase()}.
    </p>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 border-t border-[var(--hw-neutral-100)]">
      {
  /* Reference price — secondary */
}
      <div>
        <p className="text-xs text-[var(--hw-neutral-700)]">Reference price</p>
        <p className="text-sm font-semibold text-[var(--hw-neutral-700)]">
          ₱{commodity.price}/{commodity.unit}
        </p>
      </div>
      <div>
        <p className="text-xs text-[var(--hw-neutral-700)]">Price direction</p>
        <PriceDirectionIndicator direction={commodity.direction} size="sm" />
      </div>
      <div>
        <p className="text-xs text-[var(--hw-neutral-700)]">Supply</p>
        <SupplyConditionIndicator supply={commodity.supply} size="sm" />
      </div>
    </div>
  </div>;
const ForecastSummaryCard = () => <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] p-4 shadow-[var(--shadow-xs)]">
    <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide mb-3">
      Expected price movement
    </p>
    <div className="flex items-center gap-3 mb-3">
      <div className="flex-shrink-0 p-2 bg-emerald-50 rounded-xl">
        <TrendingUp className="w-5 h-5 text-emerald-600" />
      </div>
      <div>
        <p className="font-semibold text-emerald-700">Likely to rise slightly</p>
        <p className="text-xs text-[var(--hw-neutral-900)]">Next several days</p>
      </div>
      {
  /* Simple directional arrow indicator */
}
      <div className="ml-auto flex-shrink-0">
        <ArrowUpRight className="w-6 h-6 text-emerald-500" />
      </div>
    </div>
    <p className="text-sm text-[var(--hw-neutral-900)] leading-relaxed">
      Prices may improve during the next several days, but actual market conditions can still change.
    </p>
    <p className="mt-3 text-xs text-[var(--hw-neutral-700)] italic">
      This is a forecast, not a guaranteed price.
    </p>
  </div>;
const SupplySummaryCard = ({ supply }) => <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] p-4 shadow-[var(--shadow-xs)]">
    <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide mb-3">
      Market supply
    </p>
    <div className="flex items-center gap-3 mb-3">
      <div className="flex-shrink-0 p-2 bg-[var(--hw-neutral-100)] rounded-xl">
        <Package className="w-5 h-5 text-[var(--hw-neutral-700)]" />
      </div>
      <div>
        <SupplyConditionIndicator supply={supply} />
      </div>
    </div>
    <p className="text-sm text-[var(--hw-neutral-900)] leading-relaxed">
      Current deliveries are manageable, but supply may increase near the next harvest period.
    </p>
  </div>;
const SeasonalitySummaryCard = ({ commodityName }) => <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] p-4 shadow-[var(--shadow-xs)]">
    <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide mb-3">
      Seasonal condition
    </p>
    <div className="flex items-center gap-3 mb-3">
      <div className="flex-shrink-0 p-2 bg-green-50 rounded-xl">
        <Sprout className="w-5 h-5 text-green-600" />
      </div>
      <p className="font-semibold text-[var(--hw-neutral-900)]">Production may increase soon</p>
    </div>
    <p className="text-sm text-[var(--hw-neutral-900)] leading-relaxed">
      More farms may begin harvesting {commodityName} during the coming weeks.
    </p>
  </div>;
const WeatherCalendarSummary = () => <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] p-4 shadow-[var(--shadow-xs)] space-y-3">
    <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
      Weather and calendar factors
    </p>
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 p-1.5 bg-amber-50 rounded-lg mt-0.5">
        <CloudRain className="w-4 h-4 text-amber-600" />
      </div>
      <div>
        <p className="text-xs font-semibold text-[var(--hw-neutral-900)]">Weather</p>
        <p className="text-sm text-[var(--hw-neutral-700)] leading-snug">
          Heavy rain may affect farm activity and deliveries.
        </p>
      </div>
    </div>
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 p-1.5 bg-blue-50 rounded-lg mt-0.5">
        <CalendarDays className="w-4 h-4 text-blue-500" />
      </div>
      <div>
        <p className="text-xs font-semibold text-[var(--hw-neutral-900)]">Calendar</p>
        <p className="text-sm text-[var(--hw-neutral-700)] leading-snug">
          Upcoming payday periods may support market demand.
        </p>
      </div>
    </div>
  </div>;
const FarmerActionCard = ({
  commodityName,
  onCheckRecommendation,
  onViewAnother
}) => <div className="bg-[var(--hw-green-700)] rounded-2xl p-5 shadow-[var(--shadow-md)] text-white">
    <p className="font-semibold text-lg">Is {commodityName} suitable for your farm?</p>
    <p className="mt-2 text-sm text-green-100 leading-relaxed">
      Enter your farm size, expected costs, yield, and planting schedule to receive a personalized recommendation.
    </p>
    <div className="mt-4 flex flex-wrap gap-3">
      <button
  onClick={onCheckRecommendation}
  className="inline-flex items-center gap-2 bg-white text-[var(--hw-green-700)] px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-green-50 transition-colors"
>
        Check planting recommendation
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
  onClick={onViewAnother}
  className="inline-flex items-center gap-2 bg-transparent border border-green-300 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-green-800 transition-colors"
>
        View another commodity
      </button>
    </div>
  </div>;
const defaultItems = [
  { label: "Market source", value: "Bangkerohan Public Market, Davao City" },
  { label: "Data date", value: "June 24, 2026" },
  { label: "Forecast update", value: "June 24, 2026 at 6:00 AM" },
  { label: "Weather update", value: "June 24, 2026 at 5:00 AM" }
];
const InformationDisclosure = ({
  items = defaultItems
}) => {
  const [open, setOpen] = useState(false);
  return <div className="rounded-2xl border border-[var(--hw-neutral-200)] bg-white overflow-hidden shadow-[var(--shadow-xs)]">
      <button
    onClick={() => setOpen((v) => !v)}
    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--hw-neutral-900)]">
          <Info className="w-4 h-4" />
          About this information
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[var(--hw-neutral-400)]" /> : <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-400)]" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-[var(--hw-neutral-100)]">
          <dl className="mt-3 space-y-2">
            {items.map((item) => <div key={item.label} className="flex justify-between gap-4 flex-wrap">
                <dt className="text-xs text-[var(--hw-neutral-700)]">{item.label}</dt>
                <dd className="text-xs font-medium text-[var(--hw-neutral-900)]">{item.value}</dd>
              </div>)}
          </dl>
        </div>}
    </div>;
};
export {
  CommodityDetailHeader,
  CurrentMarketConditionCard,
  FarmerActionCard,
  ForecastSummaryCard,
  InformationDisclosure,
  SeasonalitySummaryCard,
  SupplySummaryCard,
  WeatherCalendarSummary
};
