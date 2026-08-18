import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Pencil,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  CloudRain,
  Sprout,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  ExternalLink,
  PauseCircle,
  Droplets,
  Tractor,
  Eye,
  Scale,
  PhilippinePeso
} from "lucide-react";
import { useCrops } from "../components/crops/CropsContext";
import { PhasePill } from "../components/crops/CropCard";
import { UpdatePhaseDrawer } from "../components/crops/UpdatePhaseDrawer";
import { CommodityIllustration } from "../components/market/CommodityIllustrations";
import { formatPeso } from "../components/crops/types";
import { Breadcrumb } from "../components/shared/Breadcrumb";
const CURRENT_PRICES = {
  kamatis: 85,
  talong: 60,
  repolyo: 45,
  atsal: 120,
  carrots: 90,
  pipino: 40,
  ampalaya: 75,
  kalabasa: 35,
  lettuce: 80,
  pechay: 35
};
const FORECAST_PRICES = {
  kamatis: { mid: 87, lo: 83, hi: 91 },
  talong: { mid: 62, lo: 58, hi: 66 },
  repolyo: { mid: 47, lo: 43, hi: 51 },
  atsal: { mid: 123, lo: 118, hi: 128 },
  carrots: { mid: 92, lo: 88, hi: 96 },
  pipino: { mid: 42, lo: 38, hi: 46 },
  ampalaya: { mid: 78, lo: 73, hi: 83 },
  kalabasa: { mid: 37, lo: 33, hi: 41 },
  lettuce: { mid: 82, lo: 78, hi: 87 },
  pechay: { mid: 37, lo: 33, hi: 41 }
};
const ADVISORY_CFG = {
  "Recommended": { Icon: CheckCircle2, color: "text-emerald-700", border: "border-[var(--hw-neutral-200)]" },
  "Plant Conservatively": { Icon: AlertTriangle, color: "text-amber-700", border: "border-[var(--hw-neutral-200)]" },
  "Avoid for Now": { Icon: AlertOctagon, color: "text-red-700", border: "border-[var(--hw-neutral-200)]" }
};
function getAdvisory(phase, commodity, costToRecover) {
  const price = CURRENT_PRICES[commodity] ?? 70;
  const margin = price - costToRecover;
  if (phase === "completed") return "Recommended";
  if (margin >= 20) return "Recommended";
  if (margin >= 5) return "Plant Conservatively";
  return "Avoid for Now";
}
const ADVISORY_SUMMARY = {
  "Recommended": (name) => `Current conditions support your ${name} plan.`,
  "Plant Conservatively": (name) => `Your ${name} plan is possible, but monitor rain and price changes.`,
  "Avoid for Now": (name) => `Market price is below your cost to recover for ${name}.`
};
const ADVISORY_SUPPORT = {
  "Recommended": "Prices are fair and weather is manageable this week.",
  "Plant Conservatively": "Consider a smaller planting area until conditions improve.",
  "Avoid for Now": "Consider waiting before committing to further planting."
};
const WEEKLY_ACTIONS = {
  planning: [
    { Icon: CloudRain, text: "Check weather before planting." },
    { Icon: PhilippinePeso, text: "Review forecasted price and your estimated profit." },
    { Icon: Droplets, text: "Prepare drainage, labor, and inputs in advance." }
  ],
  "on-hold": [
    { Icon: Eye, text: "Reassess market conditions before resuming." },
    { Icon: TrendingUp, text: "Check if the current price has improved." },
    { Icon: Scale, text: "Update your expected cost if input prices changed." }
  ],
  growing: [
    { Icon: Droplets, text: "Check drainage and crop condition." },
    { Icon: Plus, text: "Update added costs if you have new inputs." },
    { Icon: TrendingUp, text: "Monitor weather and price changes." }
  ],
  "pre-harvest": [
    { Icon: TrendingUp, text: "Check current price and the 7-day forecast." },
    { Icon: PhilippinePeso, text: "Update farmgate price if a buyer gives an offer." },
    { Icon: Tractor, text: "Prepare harvest labor and transport." }
  ],
  harvested: [
    { Icon: PhilippinePeso, text: "Compare market price and buyer price." },
    { Icon: Droplets, text: "Protect harvested produce from rain and moisture." },
    { Icon: Scale, text: "Record actual harvest and selling price." }
  ],
  completed: [
    { Icon: Scale, text: "Record final harvest volume and selling price." },
    { Icon: TrendingUp, text: "Review your profit or loss for this cycle." },
    { Icon: Sprout, text: "Save notes for your next planting cycle." }
  ]
};
const ProfitCalcAccordion = ({
  qty,
  totalCost,
  sellingBasis,
  costToRecover,
  hasFarmgate,
  margin
}) => {
  const [open, setOpen] = useState(false);
  return <div className="border border-[var(--hw-neutral-200)] rounded-xl overflow-hidden">
      <button
    onClick={() => setOpen((v) => !v)}
    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-[var(--hw-neutral-50)] transition-colors text-left bg-[var(--hw-neutral-50)]"
  >
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">How was this calculated?</p>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-[var(--hw-neutral-400)] flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--hw-neutral-400)] flex-shrink-0" />}
      </button>
      {open && <div className="px-3 py-3 space-y-1.5 border-t border-[var(--hw-neutral-200)] bg-white">
          {[
    { label: "Expected harvest", value: `${qty} kg` },
    { label: "Estimated cost", value: formatPeso(totalCost) },
    { label: hasFarmgate ? "Farmgate price" : "Market price reference", value: `\u20B1${sellingBasis}/kg` },
    { label: "Cost to recover", value: `\u20B1${costToRecover}/kg` },
    { label: `Profit per kg (\u20B1${sellingBasis} \u2212 \u20B1${costToRecover})`, value: `\u20B1${margin}/kg`, bold: true }
  ].map((r) => <div key={r.label} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="text-[var(--hw-neutral-900)]">{r.label}</span>
              <span className={r.bold ? "font-bold text-emerald-700" : "font-medium text-[var(--hw-neutral-900)]"}>{r.value}</span>
            </div>)}
          {!hasFarmgate && <p className="text-[12px] text-[var(--hw-neutral-900)] italic pt-1 border-t border-[var(--hw-neutral-100)]">
              Using market price as reference. Actual buyer price may be different.
            </p>}
        </div>}
    </div>;
};
function CropCycleDetailPage() {
  const { cropId } = useParams();
  const navigate = useNavigate();
  const { crops, updateCrop } = useCrops();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addCostOpen, setAddCostOpen] = useState(false);
  const [additionalCost, setAdditionalCost] = useState("");
  const [farmgatePrice, setFarmgatePrice] = useState("");
  const [editFarmgate, setEditFarmgate] = useState(false);
  const [farmgateDraft, setFarmgateDraft] = useState("");
  const crop = crops.find((c) => c.id === cropId);
  if (!crop) {
    return <div className="px-4 py-8 text-center">
        <p className="text-[var(--hw-neutral-900)]">Crop not found.</p>
        <button onClick={() => navigate("/farmer/crops")} className="mt-3 text-sm font-medium text-[var(--hw-green-700)]">
          Go to My Crops
        </button>
      </div>;
  }
  const handleDrawerAction = (action) => {
    if (action.kind === "phase") {
      updateCrop(crop.id, {
        phase: action.phase,
        lastUpdated: "Just now",
        isOnHold: false,
        // advancing phase also resumes
        ...action.fields.actualPlantingDate ? { plantingDate: action.fields.actualPlantingDate } : {},
        ...action.fields.updatedHarvestDate ? { harvestDate: action.fields.updatedHarvestDate } : {}
      });
    } else if (action.kind === "hold") {
      const today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      updateCrop(crop.id, {
        isOnHold: true,
        holdReason: action.reason,
        holdDate: today,
        lastUpdated: "Just now"
      });
    } else if (action.kind === "resume") {
      updateCrop(crop.id, {
        isOnHold: false,
        lastUpdated: "Just now"
      });
    }
    setDrawerOpen(false);
  };
  const extraCost = typeof additionalCost === "number" ? additionalCost : 0;
  const updatedTotalCost = crop.totalCost + extraCost;
  const qty = crop.harvestQuantity > 0 ? crop.harvestQuantity : 1;
  const costToRecover = Math.ceil(updatedTotalCost / qty);
  const currentPrice = CURRENT_PRICES[crop.commodity] ?? 70;
  const forecast = FORECAST_PRICES[crop.commodity] ?? { mid: currentPrice, lo: Math.round(currentPrice * 0.95), hi: Math.round(currentPrice * 1.07) };
  const hasFarmgate = typeof farmgatePrice === "number" && farmgatePrice > 0;
  const useForecast = ["planning", "growing", "on-hold"].includes(crop.phase);
  const basePrice = useForecast ? forecast.mid : currentPrice;
  const sellingBasis = hasFarmgate ? farmgatePrice : basePrice;
  const priceBasisLabel = useForecast ? hasFarmgate ? "Based on estimated farmgate price" : "Based on forecasted price near harvest" : hasFarmgate ? "Based on estimated farmgate price" : "Based on current market price";
  const priceBasisDetail = useForecast ? hasFarmgate ? `Farmgate price: \u20B1${farmgatePrice}/kg` : `Forecasted price reference: \u20B1${forecast.lo}\u2013\u20B1${forecast.hi}/kg` : hasFarmgate ? `Farmgate price: \u20B1${farmgatePrice}/kg` : `Current market price: \u20B1${currentPrice}/kg`;
  const margin = sellingBasis - costToRecover;
  const profitLo = Math.max(0, Math.floor(margin * qty * 0.85 / 1e3) * 1e3);
  const profitHi = Math.ceil(margin * qty * 1.1 / 1e3) * 1e3;
  const advisory = getAdvisory(crop.phase, crop.commodity, costToRecover);
  const advisoryCfg = ADVISORY_CFG[advisory];
  const AdvisoryIcon = advisoryCfg.Icon;
  const weeklyActions = crop.isOnHold ? WEEKLY_ACTIONS["on-hold"] ?? [] : WEEKLY_ACTIONS[crop.phase] ?? [];
  const isCompleted = crop.phase === "completed";
  const isActive = !isCompleted;
  const isPlanted = ["growing", "pre-harvest"].includes(crop.phase);
  const isHarvesting = crop.phase === "harvested";
  const daysSincePlanting = 50;
  const totalGrowDays = 82;
  const progressPct = Math.round(daysSincePlanting / totalGrowDays * 100);
  const daysToHarvest = totalGrowDays - daysSincePlanting;
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-3xl space-y-4">

        {
    /* Breadcrumb */
  }
        {(() => {
    const cropDisplayName = crop.variant ? `${crop.commodityName} (${crop.variant})` : crop.commodityName;
    return <Breadcrumb
      items={[
        { label: "My Crops", onClick: () => navigate("/farmer/crops") },
        { label: cropDisplayName }
      ]}
    />;
  })()}

        {
    /* ── 1. Crop summary ── */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
          <div className="flex items-start gap-4">
            <CommodityIllustration commodityId={crop.commodity} className="w-14 h-14 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">
                    {crop.variant ? `${crop.commodityName} (${crop.variant})` : crop.commodityName}
                  </h1>
                  <div className="mt-1"><PhasePill phase={crop.phase} isOnHold={crop.isOnHold} /></div>
                </div>
                <button
    onClick={() => setDrawerOpen(true)}
    className="flex-shrink-0 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--hw-green-50)]"
  >
                  <Pencil className="w-3.5 h-3.5" />Update phase
                </button>
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-[var(--hw-neutral-900)]">
                {crop.phase === "planning" ? <p>Planned planting: {crop.plantingDate}</p> : <p>Planted: {crop.plantingDate}</p>}
                <p>Est. harvest: {crop.harvestDate}</p>
                <p>Farm area: {crop.farmArea} {crop.farmAreaUnit === "sqm" ? "sq m" : "ha"}</p>
              </div>
              <p className="text-xs text-[var(--hw-neutral-900)] mt-1">Last updated {crop.lastUpdated}</p>
            </div>
          </div>
        </div>

        {
    /* ── On Hold reason — shown between header and advisory ── */
  }
        {crop.isOnHold && <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 flex items-start gap-3">
            <PauseCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[13px] font-semibold text-amber-700">On hold</p>
              {crop.holdReason && <p className="text-[13px] text-[var(--hw-neutral-900)]">Reason: {crop.holdReason}</p>}
              {crop.holdDate && <p className="text-[12px] text-[var(--hw-neutral-900)]">Put on hold: {crop.holdDate}</p>}
            </div>
          </div>}

        {
    /* ── 2. Main advice — white card, colored foreground only ── */
  }
        {isActive && <div className={`bg-white rounded-2xl border shadow-[var(--shadow-xs)] p-4 ${advisoryCfg.border}`}>
            <div className={`flex items-center gap-2 mb-2 ${advisoryCfg.color}`}>
              <AdvisoryIcon className="w-5 h-5 flex-shrink-0" />
              <p className={`text-[15px] font-bold ${advisoryCfg.color}`}>{advisory}</p>
            </div>
            <p className="text-[14px] text-[var(--hw-neutral-900)] leading-snug">
              {ADVISORY_SUMMARY[advisory](crop.variant ? `${crop.commodityName} (${crop.variant})` : crop.commodityName)}
            </p>
            <p className={`text-[13px] font-medium mt-1 ${advisoryCfg.color}`}>
              {ADVISORY_SUPPORT[advisory]}
            </p>
            <button
    onClick={() => navigate(`/crops/${crop.id}/factors`)}
    className="mt-2 text-[13px] font-semibold text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
  >
              View basis →
            </button>
          </div>}

        {
    /* ── 3. Estimated Profit ── */
  }
        {isActive && margin > 0 && <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">Estimated Profit</p>

            <p className="text-[20px] font-bold text-emerald-700 leading-none">
              ₱{profitLo.toLocaleString("en-PH")} – ₱{profitHi.toLocaleString("en-PH")}
            </p>

            <div className="space-y-0.5">
              <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{priceBasisLabel}</p>
              <p className="text-[13px] text-[var(--hw-neutral-900)]">{priceBasisDetail}</p>
            </div>

            <ProfitCalcAccordion
    qty={qty}
    totalCost={updatedTotalCost}
    sellingBasis={sellingBasis}
    costToRecover={costToRecover}
    hasFarmgate={hasFarmgate}
    margin={margin}
  />

            {
    /* Supporting values below the accordion */
  }
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] pt-1 border-t border-[var(--hw-neutral-100)]">
              <div>
                <p className="text-[var(--hw-neutral-900)]">Estimated cost</p>
                <p className="font-medium text-[var(--hw-neutral-900)]">{formatPeso(updatedTotalCost)}</p>
              </div>
              <div>
                <p className="text-[var(--hw-neutral-900)]">Expected harvest</p>
                <p className="font-medium text-[var(--hw-neutral-900)]">{crop.harvestQuantity} kg</p>
              </div>
              <div>
                <p className="text-[var(--hw-neutral-900)]">Price basis</p>
                <p className="font-medium text-[var(--hw-neutral-900)]">₱{sellingBasis}/kg</p>
              </div>
              <div>
                <p className="text-[var(--hw-neutral-900)]">Cost to recover</p>
                <p className="font-medium text-[var(--hw-neutral-900)]">₱{costToRecover}/kg</p>
              </div>
            </div>

            <p className="text-[12px] text-[var(--hw-neutral-900)]">
              Estimate only. Actual income may change.
            </p>
          </div>}

        {
    /* ── 4. What to do this week ── */
  }
        {weeklyActions.length > 0 && <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">What to do this week</p>
            <div className="space-y-2">
              {weeklyActions.map((action, i) => {
    const Icon = action.Icon;
    return <div key={i} className="flex items-start gap-3 py-1">
                    <div className="w-6 h-6 rounded-lg bg-[var(--hw-neutral-100)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-[var(--hw-neutral-900)]" />
                    </div>
                    <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">{action.text}</p>
                  </div>;
  })}
            </div>
          </div>}


        {
    /* ── 5. Price and weather summary ── */
  }
        {isActive && <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <p className="text-[11px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">Price</p>
              </div>
              <p className="text-[15px] font-bold text-[var(--hw-neutral-900)]">₱{currentPrice}/kg</p>
              <p className="text-[12px] text-[var(--hw-neutral-900)]">
                Forecast: ₱{Math.round(currentPrice * 0.98)}–₱{Math.round(currentPrice * 1.07)}/kg
              </p>
              <button
    onClick={() => navigate(`/farmer/prices/${crop.commodity}`)}
    className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
  >
                View prices <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <p className="text-[11px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">Weather</p>
              </div>
              <p className="text-[13px] font-semibold text-blue-700 leading-snug">Heavy rain</p>
              <p className="text-[12px] text-[var(--hw-neutral-900)]">Jul 12–13 · Clear drainage.</p>
              <button
    onClick={() => navigate("/farmer/market/weather")}
    className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
  >
                View weather <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>}

        {
    /* ── 6. Crop progress ── */
  }
        {isPlanted && <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Crop progress</p>
            <div className="space-y-1">
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--hw-neutral-900)]">{daysSincePlanting} of {totalGrowDays} days</span>
                <span className="font-semibold text-[var(--hw-neutral-900)]">{progressPct}%</span>
              </div>
              <div className="h-2.5 bg-[var(--hw-neutral-200)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--hw-green-600)] rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
    { label: "Days planted", value: `${daysSincePlanting}d` },
    { label: "Days to harvest", value: `${daysToHarvest}d` },
    { label: "Harvest est.", value: crop.harvestDate }
  ].map((m) => <div key={m.label} className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2">
                  <p className="text-xs text-[var(--hw-neutral-900)]">{m.label}</p>
                  <p className="text-sm font-semibold text-[var(--hw-neutral-900)] mt-0.5">{m.value}</p>
                </div>)}
            </div>
          </div>}

        {
    /* ── 7. Cost and selling price ── */
  }
        {isActive && <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Cost and selling price</p>
              {!addCostOpen && <button
    onClick={() => setAddCostOpen(true)}
    className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70"
  >
                  <Plus className="w-3.5 h-3.5" />Add cost
                </button>}
            </div>

            {addCostOpen && <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-2">
                <label className="block text-[13px] font-medium text-[var(--hw-neutral-900)]">Additional cost (₱)</label>
                <div className="flex gap-2">
                  <input
    type="number"
    min="0"
    value={additionalCost}
    onChange={(e) => setAdditionalCost(e.target.value === "" ? "" : Number(e.target.value))}
    placeholder="e.g. 500"
    className="flex-1 px-3 py-2 rounded-xl border border-[var(--hw-neutral-200)] text-sm outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] bg-white"
  />
                  <button
    onClick={() => setAddCostOpen(false)}
    className="px-3 py-2 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>}

            <div className="divide-y divide-[var(--hw-neutral-100)]">
              {[
    { label: "Estimated cost", value: formatPeso(crop.totalCost) },
    { label: "Added costs", value: extraCost > 0 ? formatPeso(extraCost) : "\u2014" },
    { label: "Total recorded cost", value: formatPeso(updatedTotalCost), bold: true },
    { label: "Expected harvest volume", value: `${crop.harvestQuantity} kg` },
    { label: "Cost to recover per kg", value: `\u20B1${costToRecover}/kg`, bold: true },
    { label: "Forecasted price reference", value: `\u20B1${forecast.lo}\u2013\u20B1${forecast.hi}/kg` },
    { label: "Current market price", value: `\u20B1${currentPrice}/kg` },
    { label: "Estimated farmgate price", value: hasFarmgate ? `\u20B1${farmgatePrice}/kg` : "Not set", muted: !hasFarmgate }
  ].map((r) => <div key={r.label} className="flex items-center justify-between py-2.5 gap-3">
                  <p className="text-[13px] text-[var(--hw-neutral-900)]">{r.label}</p>
                  <p className={`text-[13px] flex-shrink-0 ${r.bold ? "font-bold text-[var(--hw-neutral-900)]" : r.muted ? "text-[var(--hw-neutral-400)] italic" : "font-medium text-[var(--hw-neutral-900)]"}`}>{r.value}</p>
                </div>)}
            </div>

            {
    /* Farmgate price */
  }
            <div className="border-t border-[var(--hw-neutral-100)] pt-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">Estimated farmgate price</p>
                {!editFarmgate && <button
    onClick={() => {
      setEditFarmgate(true);
      setFarmgateDraft(hasFarmgate ? String(farmgatePrice) : "");
    }}
    className="text-[12px] font-medium text-[var(--hw-green-700)] hover:opacity-70"
  >
                    {hasFarmgate ? "Update" : "Add"}
                  </button>}
              </div>
              {editFarmgate ? <div className="flex gap-2">
                  <input
    type="number"
    min="0"
    value={farmgateDraft}
    onChange={(e) => setFarmgateDraft(e.target.value)}
    placeholder="e.g. 70"
    className="flex-1 px-3 py-2 rounded-xl border border-[var(--hw-neutral-200)] text-sm outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] bg-white"
  />
                  <button
    onClick={() => {
      const v = Number(farmgateDraft);
      if (v > 0) setFarmgatePrice(v);
      setEditFarmgate(false);
    }}
    className="px-3 py-2 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
  >
                    <Check className="w-4 h-4" />
                  </button>
                </div> : <div>
                  {hasFarmgate ? <p className="text-[15px] font-bold text-[var(--hw-neutral-900)]">₱{farmgatePrice}/kg</p> : <p className="text-[13px] text-[var(--hw-neutral-900)] italic">Not set. Using market price as reference.</p>}
                  <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">
                    {hasFarmgate ? "This is the price a buyer may pay you. You can update it later." : "Actual buyer price may be different from market price."}
                  </p>
                </div>}
            </div>

            {
    /* Phase actions */
  }
            {crop.phase === "pre-harvest" && <div className="pt-2 flex flex-wrap gap-2">
                <button onClick={() => setDrawerOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--hw-green-700)] text-white text-[13px] font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors">
                  Start Harvesting
                </button>
                <button onClick={() => navigate(`/farmer/prices/${crop.commodity}`)} className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] text-[13px] font-medium rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors">
                  View Prices
                </button>
              </div>}
            {crop.phase === "planning" && <div className="pt-2 flex flex-wrap gap-2">
                <button onClick={() => setDrawerOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--hw-green-700)] text-white text-[13px] font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors">
                  Confirm Planting
                </button>
              </div>}
            {isHarvesting && <div className="pt-2 border-t border-[var(--hw-neutral-100)] space-y-3">
                <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">Harvest progress</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
    { label: "Qty harvested (kg)", ph: "e.g. 450" },
    { label: "Remaining expected (kg)", ph: "e.g. 150" }
  ].map((f) => <div key={f.label}>
                      <p className="text-xs text-[var(--hw-neutral-900)] mb-1">{f.label}</p>
                      <input
    type="number"
    min="0"
    placeholder={f.ph}
    className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] bg-white"
  />
                    </div>)}
                </div>
                <button onClick={() => setDrawerOpen(true)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors">
                  <Check className="w-4 h-4" />Mark Crop Completed
                </button>
              </div>}
          </div>}


        {
    /* ── Completed: harvest summary ── */
  }
        {isCompleted && <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-4">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">Harvest summary</p>
            <div className="rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden divide-y divide-[var(--hw-neutral-100)]">
              {[
    { label: "Crop", value: crop.variant ? `${crop.commodityName} (${crop.variant})` : crop.commodityName },
    { label: "Planting date", value: crop.plantingDate },
    { label: "Harvest date", value: crop.harvestDate },
    { label: "Harvest quantity", value: crop.actualHarvestQty ? `${crop.actualHarvestQty} kg` : `${crop.harvestQuantity} kg (planned)` },
    { label: "Selling price", value: crop.actualSellingPrice ? `\u20B1${crop.actualSellingPrice}/kg` : "\u2014" },
    { label: "Total cost", value: formatPeso(crop.totalCost) },
    {
      label: "Estimated profit / loss",
      value: crop.actualHarvestQty && crop.actualSellingPrice ? `${crop.actualHarvestQty * crop.actualSellingPrice - crop.totalCost >= 0 ? "+" : ""}${formatPeso(crop.actualHarvestQty * crop.actualSellingPrice - crop.totalCost)}` : "\u2014",
      accent: true
    }
  ].map((r) => <div key={r.label} className={`flex items-center justify-between gap-4 px-3 py-2.5 flex-wrap ${r.accent ? "bg-[var(--hw-green-50)]" : ""}`}>
                  <span className={`text-xs ${r.accent ? "font-semibold text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-900)]"}`}>{r.label}</span>
                  <span className={`text-xs font-semibold ${r.accent ? "text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-900)]"}`}>{r.value}</span>
                </div>)}
            </div>
            <p className="text-[12px] text-[var(--hw-neutral-900)] italic">
              All figures are estimates. This is a decision-support summary, not final accounting.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => navigate("/farmer/assess")} className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--hw-green-700)] text-white text-[13px] font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors">
                Start Another Assessment
              </button>
              <button onClick={() => navigate("/farmer/crops")} className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] text-[13px] font-medium rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors">
                View All Crops
              </button>
            </div>
          </div>}

      </div>

      <UpdatePhaseDrawer
    open={drawerOpen}
    crop={crop}
    onClose={() => setDrawerOpen(false)}
    onConfirm={handleDrawerAction}
  />
    </div>;
}
export {
  CropCycleDetailPage as default
};
