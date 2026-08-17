import { CloudRain, TrendingUp, Clock, Package } from "lucide-react";
import { ChevronRight } from "lucide-react";
const accentText = {
  amber: "text-amber-700",
  blue: "text-blue-600",
  neutral: "text-[var(--hw-neutral-600)]",
  emerald: "text-emerald-700"
};
function getMockAlerts(commodityName) {
  return [
    {
      id: "a1",
      icon: <CloudRain className="w-4 h-4" />,
      type: "Weather caution",
      commodity: commodityName,
      message: `Rainfall of 20\u201335 mm/day is expected for the next 3 days. Check drainage and avoid field work during heavy rain.`,
      time: "Today",
      accent: "amber",
      viewBasis: "/market/weather"
    },
    {
      id: "a2",
      icon: <TrendingUp className="w-4 h-4" />,
      type: "Price updated",
      commodity: commodityName,
      message: `Bangkerohan Retail price for ${commodityName} is now \u20B185/kg as of Jun 24.`,
      time: "Today",
      accent: "neutral",
      viewBasis: void 0
    },
    {
      id: "a3",
      icon: <Package className="w-4 h-4" />,
      type: "DFTC arrival pressure changed",
      commodity: commodityName,
      message: `${commodityName} arrivals moved to Upper Middle during the last 4 completed weeks.`,
      time: "2 days ago",
      accent: "amber",
      viewBasis: "/market/dftc-arrivals"
    },
    {
      id: "a4",
      icon: <Clock className="w-4 h-4" />,
      type: "Approaching pre-harvest",
      commodity: commodityName,
      message: `Your expected harvest window for ${commodityName} begins in 32 days. Review your harvest preparation plan.`,
      time: "3 days ago",
      accent: "blue"
    }
  ];
}
const CropAlerts = ({ commodityName = "Kamatis", alerts }) => {
  const items = alerts ?? getMockAlerts(commodityName);
  return <div className="space-y-2">
      {items.map((alert) => <div
    key={alert.id}
    className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-3 flex items-start gap-3"
  >
          <span className={`flex-shrink-0 mt-0.5 ${accentText[alert.accent]}`}>
            {alert.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-xs font-semibold ${accentText[alert.accent]}`}>{alert.type}</p>
              <span className="text-xs text-[var(--hw-neutral-700)]">{alert.time}</span>
            </div>
            <p className="text-[13px] text-[var(--hw-neutral-700)] leading-snug mt-0.5">{alert.message}</p>
            {alert.viewBasis && <a href={alert.viewBasis} className={`inline-flex items-center gap-0.5 text-[12px] font-medium mt-1 ${accentText[alert.accent]} hover:opacity-70`}>
                View basis <ChevronRight className="w-3 h-3" />
              </a>}
          </div>
        </div>)}
    </div>;
};
export {
  CropAlerts
};
