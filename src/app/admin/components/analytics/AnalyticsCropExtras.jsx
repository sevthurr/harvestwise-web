import { useState } from "react";
import {
  TrendingUp,
  Package,
  CloudRain,
  CalendarDays,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { formatPeso } from "../../../farmer/components/crops/types";
const Section = ({
  title,
  defaultOpen = true,
  children
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      <button
    onClick={() => setOpen((v) => !v)}
    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
        <p className="text-xs font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wide text-left">{title}</p>
        {open ? <ChevronUp className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-[var(--hw-neutral-100)]">{children}</div>}
    </div>;
};
const MetricGrid = ({ items }) => <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3">
    {items.map((m) => <div key={m.label} className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2">
        <p className="text-xs text-[var(--hw-neutral-400)]">{m.label}</p>
        <p className={`text-sm font-semibold mt-0.5 ${m.color ?? (m.accent ? "text-emerald-700" : "text-[var(--hw-neutral-800)]")}`}>{m.value}</p>
      </div>)}
  </div>;
const FactorRow = ({
  icon,
  label,
  status,
  detail,
  accent = "neutral"
}) => {
  const accentColor = {
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-500",
    neutral: "text-[var(--hw-neutral-600)]"
  };
  const accentBg = {
    emerald: "bg-emerald-50",
    amber: "bg-amber-50",
    red: "bg-red-50",
    neutral: "bg-[var(--hw-neutral-100)]"
  };
  return <div className="flex items-start gap-3 py-2.5 border-b border-[var(--hw-neutral-100)] last:border-0">
      <div className={`flex-shrink-0 p-1.5 rounded-lg mt-0.5 ${accentBg[accent]}`}>
        <span className={accentColor[accent]}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--hw-neutral-500)]">{label}</p>
        <p className={`text-sm font-semibold ${accentColor[accent]}`}>{status}</p>
        <p className="text-xs text-[var(--hw-neutral-500)] mt-0.5 leading-snug">{detail}</p>
      </div>
    </div>;
};
const ProgressBar = ({
  pct,
  label,
  color = "bg-[var(--hw-green-600)]"
}) => <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-[var(--hw-neutral-500)]">{label}</span>
      <span className="font-semibold text-[var(--hw-neutral-700)]">{pct}%</span>
    </div>
    <div className="h-2 bg-[var(--hw-neutral-200)] rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  </div>;
function computeDaysToHarvest(harvestDate) {
  const MONTHS = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11
  };
  const parts = harvestDate.trim().split(/\s+/);
  if (parts.length < 2) return 999;
  const month = MONTHS[parts[0]];
  const day = parseInt(parts[1], 10);
  if (month === void 0 || isNaN(day)) return 999;
  const today = new Date(2026, 6, 4);
  const harvest = new Date(2026, month, day);
  return Math.ceil((harvest.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24));
}
const SharedCropAnalytics = ({ crop }) => {
  const daysToHarvest = computeDaysToHarvest(crop.harvestDate);
  const withinForecastHorizon = daysToHarvest <= 28;
  const harvestPriceLabel = withinForecastHorizon ? "Forecast \u2014 harvest" : "Historical harvest-period price context";
  return <Section title="Market and cost analytics">
      <MetricGrid items={[
    { label: "Current market price", value: "\u20B185/kg", accent: false },
    { label: harvestPriceLabel, value: "\u20B184\u2013\u20B188/kg", accent: withinForecastHorizon },
    { label: "Break-even price", value: `${formatPeso(crop.breakEvenPrice)}/kg`, accent: false },
    { label: "Supply pressure", value: "Moderate", accent: false },
    { label: "Arrival volume trend", value: "Stable", accent: false },
    { label: "Total production cost", value: formatPeso(crop.totalCost), accent: false }
  ]} />
      {!withinForecastHorizon && <p className="text-xs text-[var(--hw-neutral-400)] italic mt-2">
          Expected harvest is beyond the 28-day forecast horizon. Price context is based on comparable historical periods.
        </p>}
      <p className="text-xs text-[var(--hw-neutral-400)] mt-2">
        Bangkerohan Public Market · Updated Jun 24, 2026 at 7:30 AM · Sample data
      </p>
    </Section>;
};
const PlanningAnalytics = ({ crop }) => <>
    <Section title="Updated risk assessment">
      <div className="pt-3 space-y-3">
        <div>
          <p className="text-sm font-semibold text-amber-700">Plant Conservatively</p>
          <p className="text-xs text-[var(--hw-neutral-500)] mt-0.5">Moderate risk · Updated today</p>
        </div>
        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-semibold text-[var(--hw-neutral-600)]">Conditions since your last assessment</p>
          <p className="text-xs text-emerald-600">↑ Price outlook improved slightly</p>
          <p className="text-xs text-amber-600">↓ Supply pressure remains elevated</p>
          <p className="text-xs text-[var(--hw-neutral-500)]">→ Weather risk unchanged</p>
        </div>
        <p className="text-xs text-[var(--hw-neutral-400)]">Suggested reassessment: Jun 27, 2026</p>
      </div>
    </Section>

    <Section title="Historical price context near proposed harvest">
      <MetricGrid items={[
  { label: "Historical price range", value: "\u20B184\u2013\u20B188/kg", accent: false },
  { label: "Break-even price", value: `${formatPeso(crop.breakEvenPrice)}/kg` },
  { label: "Current price", value: "\u20B185/kg" },
  { label: "Above break-even", value: "+\u20B143/kg", accent: true }
]} />
      <p className="text-xs text-[var(--hw-neutral-400)] mt-3 italic">
        Expected harvest is beyond the 28-day forecast horizon. Price context is based on comparable historical periods, not a price forecast.
      </p>
    </Section>
  </>;
const GrowingAnalytics = ({ crop }) => {
  const daysSincePlanting = 50;
  const totalGrowDays = 82;
  const progressPct = Math.round(daysSincePlanting / totalGrowDays * 100);
  return <>
      <Section title="Growing progress">
        <div className="pt-3 space-y-3">
          <ProgressBar pct={progressPct} label={`${daysSincePlanting} of ${totalGrowDays} days`} />
          <MetricGrid items={[
    { label: "Days since planting", value: `${daysSincePlanting} days` },
    { label: "Days to harvest", value: `${totalGrowDays - daysSincePlanting} days` },
    { label: "Expected harvest", value: crop.harvestDate }
  ]} />
        </div>
      </Section>

      <Section title="Harvest-period outlook">
        <div className="pt-3">
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            <FactorRow icon={<TrendingUp className="w-4 h-4" />} label="Historical price context near harvest" status="₱84–₱88/kg" detail="Based on comparable historical price periods near this time of year. Harvest is beyond the 28-day forecast horizon." accent="emerald" />
            <FactorRow icon={<Package className="w-4 h-4" />} label="Supply pressure near harvest" status="Moderate" detail="Arrival volumes are stable now but may increase as more farms approach harvest." accent="amber" />
            <FactorRow icon={<CloudRain className="w-4 h-4" />} label="Weather risk" status="Heavy rain expected" detail="Heavy rain in the next 4–6 days may affect field activity. Monitor drainage." accent="amber" />
            <FactorRow icon={<CalendarDays className="w-4 h-4" />} label="Calendar near harvest" status="Payday period ahead" detail="A mid-July payday period may temporarily support market demand near your harvest window." accent="emerald" />
          </div>
          <p className="text-xs text-[var(--hw-neutral-400)] mt-3 italic">Sample data only. Harvest is beyond the 28-day forecast horizon — price context is based on historical periods.</p>
        </div>
      </Section>

      <Section title="Break-even status">
        <MetricGrid items={[
    { label: "Break-even price", value: `${formatPeso(crop.breakEvenPrice)}/kg` },
    { label: "Current market price", value: "\u20B185/kg", accent: true },
    { label: "Current margin", value: "+\u20B143/kg", accent: true },
    { label: "Historical margin context", value: "+\u20B142\u2013\u20B146/kg", accent: false }
  ]} />
      </Section>
    </>;
};
const PreHarvestAnalytics = ({ crop }) => <>
    <Section title="Harvest window and selling outlook">
      <div className="pt-3">
        <MetricGrid items={[
  { label: "Days until harvest", value: "7 days" },
  { label: "Harvest window", value: "Jul 26 \u2013 Aug 1" },
  { label: "Current price", value: "\u20B185/kg", accent: true },
  { label: "Forecast-based range", value: "\u20B181\u2013\u20B192/kg" },
  { label: "Oversupply risk", value: "Low to Moderate", color: "text-amber-600" },
  { label: "Forecast vs break-even", value: "+\u20B139\u2013\u20B150/kg", accent: true }
]} />
        <div className="mt-3 divide-y divide-[var(--hw-neutral-100)]">
          <FactorRow icon={<CloudRain className="w-4 h-4" />} label="Weather during harvest" status="Rain risk clearing" detail="Heavy rain expected to ease by late July, reducing transport disruption risk." accent="emerald" />
          <FactorRow icon={<CalendarDays className="w-4 h-4" />} label="Demand indicators" status="Payday period" detail="Payday week near harvest may support buyer demand at Bangkerohan." accent="emerald" />
        </div>
        <p className="text-xs text-[var(--hw-neutral-400)] mt-3 italic">
          Harvest is within 28 days. Price range is based on the short-term forecast. Forecasts are estimates only.
        </p>
      </div>
    </Section>

    <Section title="Estimated profit range">
      <MetricGrid items={[
  { label: "Expected harvest", value: `${crop.harvestQuantity} kg` },
  { label: "Break-even price", value: `${formatPeso(crop.breakEvenPrice)}/kg` },
  { label: "Production cost", value: formatPeso(crop.totalCost) },
  { label: "Est. revenue low", value: formatPeso(81 * crop.harvestQuantity) },
  { label: "Est. revenue high", value: formatPeso(92 * crop.harvestQuantity) },
  { label: "Est. profit range", value: `+${formatPeso(81 * crop.harvestQuantity - crop.totalCost)} to +${formatPeso(92 * crop.harvestQuantity - crop.totalCost)}`, accent: true }
]} />
      <p className="text-xs text-[var(--hw-neutral-400)] mt-3 italic">All figures are estimates based on sample data.</p>
    </Section>
  </>;
const HarvestedAnalytics = ({ crop }) => {
  const actualQty = crop.actualHarvestQty ?? crop.harvestQuantity;
  const costPerKg = Math.round(crop.totalCost / actualQty);
  const revLow = 81 * actualQty;
  const revHigh = 92 * actualQty;
  const profitLow = revLow - crop.totalCost;
  const profitHigh = revHigh - crop.totalCost;
  return <Section title="Post-harvest analysis">
      <MetricGrid items={[
    { label: "Actual harvested qty", value: `${actualQty} kg` },
    { label: "Total production cost", value: formatPeso(crop.totalCost) },
    { label: "Actual cost per kg", value: `${formatPeso(costPerKg)}/kg` },
    { label: "Updated break-even", value: `${formatPeso(costPerKg)}/kg`, highlight: true },
    { label: "Current market price", value: "\u20B185/kg", accent: true },
    { label: "Est. revenue at market", value: formatPeso(85 * actualQty), accent: true },
    { label: "Estimated profit", value: `+${formatPeso(85 * actualQty - crop.totalCost)}`, accent: true }
  ].filter((m) => m !== null)} />
      <div className="mt-3">
        <FactorRow icon={<CloudRain className="w-4 h-4" />} label="Transport risk" status="Low" detail="Weather conditions are improving. Market deliveries should proceed normally." accent="emerald" />
      </div>
      <p className="text-xs text-[var(--hw-neutral-400)] mt-3 italic">Estimates only. Actual results depend on final selling price and quantity.</p>
    </Section>;
};
const CompletedAnalytics = ({ crop }) => {
  const totalSold = crop.actualHarvestQty ?? crop.harvestQuantity;
  const avgPrice = crop.actualSellingPrice ?? 84;
  const totalRevenue = avgPrice * totalSold;
  const profit = totalRevenue - crop.totalCost;
  return <Section title="Final crop-cycle summary">
      <div className="pt-3 space-y-3">
        <div className="rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden divide-y divide-[var(--hw-neutral-100)]">
          {[
    { label: "Total production cost", value: formatPeso(crop.totalCost) },
    { label: "Total harvested", value: `${totalSold} kg` },
    { label: "Total quantity sold", value: `${totalSold} kg` },
    { label: "Average selling price", value: `\u20B1${avgPrice}/kg` },
    { label: "Total revenue", value: formatPeso(totalRevenue), accent: true },
    { label: "Final profit / loss", value: `${profit >= 0 ? "+" : ""}${formatPeso(profit)}`, accent: profit >= 0 },
    { label: "Original break-even price", value: `${formatPeso(crop.breakEvenPrice)}/kg` },
    { label: "Original forecast range", value: "\u20B177\u2013\u20B195/kg" },
    { label: "Forecast vs actual result", value: avgPrice >= 77 ? "Within forecast range" : "Below forecast range", accent: avgPrice >= 77 },
    { label: "Original recommendation", value: "Plant Conservatively" }
  ].map((r) => <div key={r.label} className={`flex justify-between gap-4 px-3 py-2.5 flex-wrap ${r.accent ? "bg-[var(--hw-green-50)]" : ""}`}>
              <span className={`text-xs ${r.accent ? "font-semibold text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-500)]"}`}>{r.label}</span>
              <span className={`text-xs font-semibold ${r.accent ? "text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-800)]"}`}>{r.value}</span>
            </div>)}
        </div>
        <p className="text-xs text-[var(--hw-neutral-400)] italic">All results are estimates based on sample data entered during this session.</p>
      </div>
    </Section>;
};
const AnalyticsCropAnalytics = ({ crop }) => <div className="space-y-4">
    <SharedCropAnalytics crop={crop} />

    {(crop.phase === "planning" || crop.phase === "on-hold") && <PlanningAnalytics crop={crop} />}
    {crop.phase === "growing" && <GrowingAnalytics crop={crop} />}
    {crop.phase === "pre-harvest" && <PreHarvestAnalytics crop={crop} />}
    {crop.phase === "harvested" && <HarvestedAnalytics crop={crop} />}
{crop.phase === "completed" && <CompletedAnalytics crop={crop} />}
  </div>;
export {
  AnalyticsCropAnalytics
};
