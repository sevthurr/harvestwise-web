import { TrendingUp, CloudRain, Package, CalendarDays, Clock, Coins } from "lucide-react";
const accentMap = {
  green: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-200" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", border: "border-amber-200" },
  blue: { bg: "bg-blue-50", icon: "text-blue-500", border: "border-blue-200" },
  neutral: { bg: "bg-[var(--hw-neutral-50)]", icon: "text-[var(--hw-neutral-500)]", border: "border-[var(--hw-neutral-200)]" }
};
const MonitoringCard = ({
  icon,
  title,
  status,
  explanation,
  accent = "neutral"
}) => {
  const a = accentMap[accent];
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${a.bg}`}>
          <span className={a.icon}>{icon}</span>
        </div>
        <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
          {title}
        </p>
      </div>
      <p className="font-medium text-sm text-[var(--hw-neutral-900)]">{status}</p>
      <p className="text-xs text-[var(--hw-neutral-900)] leading-relaxed">{explanation}</p>
    </div>;
};
const KamatisPriceOutlookCard = () => <MonitoringCard
  icon={<TrendingUp className="w-4 h-4" />}
  title="Price outlook"
  status="Prices are expected to remain stable."
  explanation="No major price movement is expected near your harvest period."
  accent="green"
/>;
const KamatisWeatherCard = () => <MonitoringCard
  icon={<CloudRain className="w-4 h-4" />}
  title="Weather risk"
  status="Heavy rain expected this week."
  explanation="Heavy rain may affect field activity and market deliveries during the next several days."
  accent="amber"
/>;
const KamatisSupplyCard = () => <MonitoringCard
  icon={<Package className="w-4 h-4" />}
  title="Market supply"
  status="Supply may increase near your harvest."
  explanation="More farms may begin harvesting Kamatis during the coming weeks, which could affect prices."
  accent="neutral"
/>;
const KamatisCalendarCard = () => <MonitoringCard
  icon={<CalendarDays className="w-4 h-4" />}
  title="Market calendar"
  status="Payday period may support demand."
  explanation="An upcoming payday period may temporarily increase buyer demand at the market."
  accent="blue"
/>;
const KamatisHarvestWindowCard = () => <MonitoringCard
  icon={<Clock className="w-4 h-4" />}
  title="Harvest window"
  status="Expected harvest begins in 32 days."
  explanation="Based on your planting date, your expected harvest window begins on July 26, 2026."
  accent="neutral"
/>;
const KamatisBreakEvenCard = () => <MonitoringCard
  icon={<Coins className="w-4 h-4" />}
  title="Break-even price"
  status="Your estimated break-even price is ₱42/kg."
  explanation="You need to sell at ₱42 per kilogram to recover your estimated production costs of ₱25,200."
  accent="green"
/>;
export {
  KamatisBreakEvenCard,
  KamatisCalendarCard,
  KamatisHarvestWindowCard,
  KamatisPriceOutlookCard,
  KamatisSupplyCard,
  KamatisWeatherCard,
  MonitoringCard
};
