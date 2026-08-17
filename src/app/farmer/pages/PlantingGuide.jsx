import { useState } from "react";
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
import { CommodityIllustration } from "../components/market/CommodityIllustrations";
const ADVISORIES = [
  {
    id: "ampalaya",
    name: "Ampalaya",
    advisory: "recommended",
    profit: "\u20B19,000\u2013\u20B114,000",
    harvest: "September",
    reason: "Price outlook is good and expected supply is manageable."
  },
  {
    id: "pipino",
    name: "Pipino",
    advisory: "recommended",
    profit: "\u20B14,000\u2013\u20B17,000",
    harvest: "September",
    reason: "Short growing period and price may stay stable."
  },
  {
    id: "kamatis",
    name: "Kamatis",
    advisory: "conservative",
    profit: "\u20B18,000\u2013\u20B112,000",
    harvest: "October",
    reason: "Estimated profit is good, but rain and supply need monitoring.",
    note: "Consider planting a smaller area."
  },
  {
    id: "talong",
    name: "Talong",
    advisory: "conservative",
    profit: "\u20B16,000\u2013\u20B19,000",
    harvest: "November",
    reason: "Price is stable but weather conditions need watching.",
    note: "Consider planting a smaller area."
  },
  {
    id: "repolyo",
    name: "Repolyo",
    advisory: "avoid",
    profit: "Low or uncertain",
    harvest: "October",
    reason: "Price is low and supply is high."
  },
  {
    id: "lettuce",
    name: "Lettuce",
    advisory: "avoid",
    profit: "Low or uncertain",
    harvest: "September",
    reason: "High supply is keeping prices low."
  }
];
const CALENDAR = [
  { id: "ampalaya", name: "Ampalaya", plantMonth: "July", harvestMonth: "September", note: "Good option this month." },
  { id: "kamatis", name: "Kamatis", plantMonth: "July", harvestMonth: "October", note: "Plant a smaller area if weather remains rainy." },
  { id: "pipino", name: "Pipino", plantMonth: "July", harvestMonth: "September", note: "Good option. Short growing time." },
  { id: "repolyo", name: "Repolyo", plantMonth: "Later", harvestMonth: "October", note: "Better to wait for improved price conditions." },
  { id: "talong", name: "Talong", plantMonth: "August", harvestMonth: "November", note: "Consider waiting until conditions improve." }
];
const MARKET_EVENTS = [
  { id: "payday", title: "Mid-month payday period", date: "Jul 15", note: "May increase people going to the market." },
  { id: "kadayawan", title: "Kadayawan activities", date: "Aug 14\u201317", note: "May affect market activity and delivery schedules." },
  { id: "heroes-day", title: "National Heroes Day", date: "Aug 25", note: "Public holiday. Market activity may be lower." }
];
const WEATHER_ACTIONS = [
  "Clear drainage before planting",
  "Avoid planting during strong rain",
  "Protect harvested crops from moisture"
];
const ADV_CFG = {
  recommended: { label: "Recommended", Icon: CheckCircle2, color: "text-[var(--hw-green-700)]", border: "border-[var(--hw-green-300)]" },
  conservative: { label: "Plant Conservatively", Icon: AlertTriangle, color: "text-amber-600", border: "border-amber-200" },
  avoid: { label: "Avoid for Now", Icon: AlertOctagon, color: "text-red-500", border: "border-red-200" }
};
const CropAdvisoryCard = ({ crop, onViewGuide }) => {
  const cfg = ADV_CFG[crop.advisory];
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
              Estimated profit: <span className="font-medium text-[var(--hw-neutral-700)]">{crop.profit}</span>
            </p>
            <p className="text-[12px] text-[var(--hw-neutral-900)]">
              Harvest: <span className="font-medium text-[var(--hw-neutral-700)]">{crop.harvest}</span>
            </p>
          </div>
          <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">{crop.reason}</p>
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
  const [showAllCalendar, setShowAllCalendar] = useState(false);
  const recommended = ADVISORIES.filter((a) => a.advisory === "recommended");
  const conservative = ADVISORIES.filter((a) => a.advisory === "conservative");
  const avoid = ADVISORIES.filter((a) => a.advisory === "avoid");
  const calendarItems = showAllCalendar ? CALENDAR : CALENDAR.slice(0, 3);
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
              <span className="text-[13px] whitespace-nowrap">Updated today at 7:30 AM</span>
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
    onClick={() => navigate("/assess")}
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
              <div className="space-y-3">
                {recommended.map((crop) => <CropAdvisoryCard
    key={crop.id}
    crop={crop}
    onViewGuide={() => navigate(`/assess?commodity=${crop.id}`)}
  />)}
              </div>
            </section>

            {
    /* Plant Conservatively */
  }
            <section>
              <div className="mb-3">
                <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Plant Conservatively</h2>
                <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">Can be planted, but consider a smaller area first.</p>
              </div>
              <div className="space-y-3">
                {conservative.map((crop) => <CropAdvisoryCard
    key={crop.id}
    crop={crop}
    onViewGuide={() => navigate(`/assess?commodity=${crop.id}`)}
  />)}
              </div>
            </section>

            {
    /* Avoid for Now */
  }
            <section>
              <div className="mb-3">
                <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Avoid for Now</h2>
                <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">Better to wait or check another crop.</p>
              </div>
              <div className="space-y-3">
                {avoid.map((crop) => <CropAdvisoryCard
    key={crop.id}
    crop={crop}
    onViewGuide={() => navigate(`/assess?commodity=${crop.id}`)}
  />)}
              </div>
            </section>
          </div>

          {
    /* Right column: Crop Calendar + Market Events + Weather */
  }
          <div className="space-y-5">

            {
    /* ── 3. Crop Calendar ── */
  }
            <section>
              <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)] mb-3">Crop Calendar</h2>
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] divide-y divide-[var(--hw-neutral-100)]">
                {calendarItems.map((item) => <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                    <CommodityIllustration commodityId={item.id} className="w-9 h-9 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">{item.name}</p>
                      <div className="flex gap-3 mt-0.5">
                        <p className="text-[12px] text-[var(--hw-neutral-900)]">
                          Plant: <span className="font-medium text-[var(--hw-neutral-700)]">{item.plantMonth}</span>
                        </p>
                        <p className="text-[12px] text-[var(--hw-neutral-900)]">
                          Harvest: <span className="font-medium text-[var(--hw-neutral-700)]">{item.harvestMonth}</span>
                        </p>
                      </div>
                      <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">{item.note}</p>
                    </div>
                  </div>)}
                {!showAllCalendar && CALENDAR.length > 3 && <div className="px-4 py-3">
                    <button
    onClick={() => setShowAllCalendar(true)}
    className="text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
  >
                      View all crops
                    </button>
                  </div>}
              </div>
            </section>

            {
    /* ── 4. Upcoming market events ── */
  }
            <section>
              <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)] mb-3">Upcoming market events</h2>
              <div className="space-y-2.5">
                {MARKET_EVENTS.map((event) => <div key={event.id} className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-3">
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
                    <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Rain expected this week</p>
                    <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">
                      Delay planting and clear drainage before heavy rain.
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
    onClick={() => navigate("/market/weather")}
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
    onClick={() => navigate("/assess")}
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
