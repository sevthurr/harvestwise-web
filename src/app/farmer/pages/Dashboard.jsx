import {
  Clock,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarDays,
  Plus
} from "lucide-react";
import { useNavigate } from "react-router";
import { CommodityIllustration } from "../components/market/CommodityIllustrations";
import { getVariants } from "../../global/data/commodities";
const SAVED_CROPS = [
  { cropId: "crop-1", commodityId: "kamatis", name: "Kamatis", variant: "Diamante Big", phase: "Planted", harvestDate: "Jul 26", profitLow: 8e3, profitHigh: 12e3 },
  { cropId: "crop-2", commodityId: "talong", name: "Talong", variant: "", phase: "Planning", harvestDate: "Sep 5", profitLow: 4500, profitHigh: 7200 }
];
const TODAY_PRICES = [
  { id: "kamatis", name: "Kamatis", price: 85, direction: "Rising" },
  { id: "repolyo", name: "Repolyo", price: 60, direction: "Falling" },
  { id: "talong", name: "Talong", price: 72, direction: "Stable" }
];
const GOOD_CROPS = [
  {
    id: "ampalaya",
    name: "Ampalaya",
    reason: "Price outlook is good and expected supply is manageable.",
    bestVariety: "Galaxy"
  },
  {
    id: "pipino",
    name: "Pipino",
    reason: "Short growing period and price may remain stable.",
    bestVariety: "Mega C"
  }
];
const MY_REMINDERS = [
  { id: "kamatis", name: "Kamatis", variant: "Diamante Big", reminder: "Check drainage this week.", phase: "Planted" },
  { id: "talong", name: "Talong", variant: "", reminder: "Update your cost estimate.", phase: "Planning" }
];
const DIR_CFG = {
  Rising: { color: "text-emerald-600", Icon: TrendingUp },
  Falling: { color: "text-red-500", Icon: TrendingDown },
  Stable: { color: "text-blue-500", Icon: Minus }
};
function ProfitCard() {
  const navigate = useNavigate();
  if (SAVED_CROPS.length === 0) {
    return <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Estimated Profit</h2>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Review your estimated profit</p>
          <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">
            Add a crop plan to see how much you might earn.
          </p>
          <button
      onClick={() => navigate("/assess")}
      className="inline-flex items-center gap-2 text-sm font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
    >
            <Plus className="w-4 h-4" />
            Add crop plan
          </button>
        </div>
      </section>;
  }
  const primary = SAVED_CROPS[0];
  return <section>
      {
    /* Section header */
  }
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Estimated Profit</h2>
        <button
    onClick={() => navigate("/crops")}
    className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
          View all
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
        {
    /* Crop identity row */
  }
        <div className="flex items-center gap-3 mb-3">
          <CommodityIllustration commodityId={primary.commodityId} className="w-10 h-10 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
              {primary.variant ? `${primary.name} (${primary.variant})` : primary.name}
            </p>
            <div className="flex items-center gap-1.5 text-[var(--hw-neutral-900)]">
              <CalendarDays className="w-3 h-3 flex-shrink-0" />
              <span className="text-[12px]">Harvest: {primary.harvestDate}</span>
            </div>
          </div>
        </div>

        {
    /* Profit range — most prominent */
  }
        <p className="text-[26px] font-bold text-[var(--hw-neutral-900)] leading-tight">
          ₱{primary.profitLow.toLocaleString()}–₱{primary.profitHigh.toLocaleString()}
        </p>
        <p className="text-[12px] font-medium text-[var(--hw-neutral-900)] mt-0.5">Estimated Profit</p>
        <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">Nearest harvest among your crops.</p>

        {
    /* Action + disclaimer */
  }
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--hw-neutral-100)]">
          <p className="text-[12px] text-[var(--hw-neutral-900)] leading-snug">
            Estimate only. Actual income may change.
          </p>
          <button
    onClick={() => navigate("/crops")}
    className="flex-shrink-0 text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
  >
            View details
          </button>
        </div>
      </div>
    </section>;
}
function DashboardPage() {
  const navigate = useNavigate();
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-4xl space-y-5 md:space-y-6">

        {
    /* ── 1. Greeting ── */
  }
        <div>
          <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
            Good morning, Juan!
          </h1>
          <p className="text-[15px] text-[var(--hw-neutral-900)] mt-0.5">Davao City Vegetable Farmer</p>
          <div className="flex items-center gap-1.5 mt-1.5 text-[var(--hw-neutral-900)]">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[13px]">Updated just now</span>
          </div>
        </div>

        {
    /* ── 2. Main action card ── */
  }
        <div className="bg-[var(--hw-green-700)] rounded-2xl p-5 text-white shadow-[var(--shadow-md)]">
          <p className="font-semibold text-lg leading-snug">Need help choosing what to plant?</p>
          <p className="mt-1.5 text-[15px] text-green-100 leading-relaxed">
            Check prices, weather, and estimated profit before planting.
          </p>
          <button
    onClick={() => navigate("/market")}
    className="mt-4 inline-flex items-center gap-2 bg-white text-[var(--hw-green-700)] px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-green-50 transition-colors"
  >
            Check what to plant
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {
    /* ── 3. Estimated Profit ── */
  }
        <ProfitCard />


        {
    /* ── 4 + 5: Two-column on desktop — prices + good crops ── */
  }
        <div className="md:grid md:grid-cols-2 md:gap-5 space-y-5 md:space-y-0">

          {
    /* ── 4. Today's prices ── */
  }
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Today's prices</h2>
              <button
    onClick={() => navigate("/prices")}
    className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
                See all
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] divide-y divide-[var(--hw-neutral-100)]">
              {TODAY_PRICES.map((item) => {
    const cfg = DIR_CFG[item.direction];
    const DirIcon = cfg.Icon;
    return <button
      key={item.id}
      onClick={() => navigate(`/prices/${item.id}`)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
    >
                    <CommodityIllustration commodityId={item.id} className="w-9 h-9 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">{item.name}</p>
                      {(() => {
      const count = getVariants(item.name).length;
      if (count === 0) return null;
      return <p className="text-[12px] font-semibold text-[var(--hw-green-700)]">
                            {count} {count === 1 ? "variety" : "varieties"}
                          </p>;
    })()}
                      <p className="text-[12px] text-[var(--hw-neutral-900)]">₱{item.price}/kg</p>
                    </div>
                    <div className={`flex items-center gap-1 flex-shrink-0 ${cfg.color}`}>
                      <DirIcon className="w-3.5 h-3.5" />
                      <span className="text-[13px] font-medium">{item.direction}</span>
                    </div>
                  </button>;
  })}
            </div>
          </section>

          {
    /* ── 5. Good crops to plant ── */
  }
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">Good crops to plant</h2>
            </div>

            {GOOD_CROPS.length === 0 ? <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-3">
                <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">No strong crop suggestion today</p>
                <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">
                  Open the Planting Guide to compare other crops.
                </p>
                <button
    onClick={() => navigate("/market")}
    className="inline-flex items-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors"
  >
                  Open Planting Guide
                </button>
              </div> : <div className="space-y-2.5">
                {GOOD_CROPS.map((crop) => <div
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
                        <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">{crop.name}</p>
                        {(() => {
    const count = getVariants(crop.name).length;
    return count > 0 ? <p className="text-[12px] font-semibold text-[var(--hw-green-700)]">
                              {count} {count === 1 ? "variety" : "varieties"}
                            </p> : null;
  })()}
                        {crop.bestVariety && <p className="text-[12px] font-medium text-[var(--hw-green-700)]">
                            Good variety: {crop.bestVariety}
                          </p>}
                        <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">{crop.reason}</p>
                      </div>
                      <button
    onClick={() => navigate("/market")}
    className="flex-shrink-0 text-[12px] font-medium text-[var(--hw-green-700)] hover:opacity-70 whitespace-nowrap"
  >
                        View guide
                      </button>
                    </div>
                  </div>)}
              </div>}
          </section>
        </div>

        {
    /* ── 6. My crop reminders ── */
  }
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[17px] font-semibold text-[var(--hw-neutral-900)]">My crop reminders</h2>
            <button
    onClick={() => navigate("/crops")}
    className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
              View My Crops
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] divide-y divide-[var(--hw-neutral-100)]">
            {MY_REMINDERS.map((item) => <button
    key={item.id}
    onClick={() => navigate("/crops")}
    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
  >
                <CommodityIllustration commodityId={item.id} className="w-9 h-9 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
                    {item.variant ? `${item.name} (${item.variant})` : item.name}
                  </p>
                  <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">Status: {item.phase}</p>
                  <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug mt-0.5">{item.reminder}</p>
                </div>
              </button>)}
          </div>
        </section>

      </div>
    </div>;
}
export {
  DashboardPage as default
};
