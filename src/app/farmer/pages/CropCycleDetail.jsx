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
import { useLanguage } from "../../global/contexts/LanguageContext";
import { useCrops } from "../components/crops/CropsContext";
import { PhasePill } from "../components/crops/CropCard";
import { UpdatePhaseDrawer } from "../components/crops/UpdatePhaseDrawer";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { formatPeso } from "../components/crops/types";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import {
  ADVISORY_CODES,
  PHASE_CODES,
  normalizeAdvisoryCode,
  normalizePhaseCode,
} from "../utils/farmerCodes";

const ADVISORY_CFG = {
  [ADVISORY_CODES.RECOMMENDED]: { Icon: CheckCircle2, color: "text-emerald-700", border: "border-[var(--hw-neutral-200)]", label: "Recommended" },
  [ADVISORY_CODES.PROCEED_WITH_CAUTION]: { Icon: AlertTriangle, color: "text-amber-700", border: "border-[var(--hw-neutral-200)]", label: "Proceed with Caution" },
  [ADVISORY_CODES.AVOID_FOR_NOW]: { Icon: AlertOctagon, color: "text-red-700", border: "border-[var(--hw-neutral-200)]", label: "Avoid for Now" }
};

function getAdvisory(phase, currentPrice, costToRecover) {
  const phaseCode = normalizePhaseCode(phase);
  if (phaseCode === PHASE_CODES.COMPLETED) return ADVISORY_CODES.RECOMMENDED;
  if (currentPrice == null || costToRecover == null) return null;
  const margin = currentPrice - costToRecover;
  if (margin >= 20) return ADVISORY_CODES.RECOMMENDED;
  if (margin >= 5) return ADVISORY_CODES.PROCEED_WITH_CAUTION;
  return ADVISORY_CODES.AVOID_FOR_NOW;
}

const ADVISORY_SUMMARY = {
  [ADVISORY_CODES.RECOMMENDED]: (name, t) => t ? t("farmer.advisory.cycle_recommended_summary", { crop_name: name }) : `Current conditions support your ${name} plan.`,
  [ADVISORY_CODES.PROCEED_WITH_CAUTION]: (name, t) => t ? t("farmer.advisory.cycle_caution_summary", { crop_name: name }) : `Your ${name} plan is possible, but monitor conditions and price changes.`,
  [ADVISORY_CODES.AVOID_FOR_NOW]: (name, t) => t ? t("farmer.advisory.cycle_avoid_summary", { crop_name: name }) : `Market price is below your cost to recover for ${name}.`
};

const ADVISORY_SUPPORT = {
  [ADVISORY_CODES.RECOMMENDED]: (t) => t ? t("farmer.advisory.cycle_recommended_support") : "Prices are fair and weather is manageable this week.",
  [ADVISORY_CODES.PROCEED_WITH_CAUTION]: (t) => t ? t("farmer.advisory.cycle_caution_support") : "Proceed with caution and monitor conditions closely.",
  [ADVISORY_CODES.AVOID_FOR_NOW]: (t) => t ? t("farmer.advisory.cycle_avoid_support") : "Consider waiting before committing to further planting."
};

const WEEKLY_ACTIONS = {
  [PHASE_CODES.PLANNING]: [
    { Icon: CloudRain, key: "farmer.monitoring.action_planning_1", text: "Check weather before planting." },
    { Icon: PhilippinePeso, key: "farmer.monitoring.action_planning_2", text: "Review forecasted price and your estimated profit." },
    { Icon: Droplets, key: "farmer.monitoring.action_planning_3", text: "Prepare drainage, labor, and inputs in advance." }
  ],
  [PHASE_CODES.ON_HOLD]: [
    { Icon: Eye, key: "farmer.monitoring.action_on_hold_1", text: "Reassess market conditions before resuming." },
    { Icon: TrendingUp, key: "farmer.monitoring.action_on_hold_2", text: "Check if the current price has improved." },
    { Icon: Scale, key: "farmer.monitoring.action_on_hold_3", text: "Update your expected cost if input prices changed." }
  ],
  [PHASE_CODES.GROWING]: [
    { Icon: Droplets, key: "farmer.monitoring.action_growing_1", text: "Check drainage and crop condition." },
    { Icon: Plus, key: "farmer.monitoring.action_growing_2", text: "Update added costs if you have new inputs." },
    { Icon: TrendingUp, key: "farmer.monitoring.action_growing_3", text: "Monitor weather and price changes." }
  ],
  [PHASE_CODES.PRE_HARVEST]: [
    { Icon: TrendingUp, key: "farmer.monitoring.action_pre_harvest_1", text: "Check current price and the 7-day forecast." },
    { Icon: PhilippinePeso, key: "farmer.monitoring.action_pre_harvest_2", text: "Update farmgate price if a buyer gives an offer." },
    { Icon: Tractor, key: "farmer.monitoring.action_pre_harvest_3", text: "Prepare harvest labor and transport." }
  ],
  [PHASE_CODES.HARVESTED]: [
    { Icon: PhilippinePeso, key: "farmer.monitoring.action_harvested_1", text: "Compare market price and buyer price." },
    { Icon: Droplets, key: "farmer.monitoring.action_harvested_2", text: "Protect harvested produce from rain and moisture." },
    { Icon: Scale, key: "farmer.monitoring.action_harvested_3", text: "Record actual harvest and selling price." }
  ],
  [PHASE_CODES.COMPLETED]: [
    { Icon: Scale, key: "farmer.monitoring.action_completed_1", text: "Record final harvest volume and selling price." },
    { Icon: TrendingUp, key: "farmer.monitoring.action_completed_2", text: "Review your profit or loss for this cycle." },
    { Icon: Sprout, key: "farmer.monitoring.action_completed_3", text: "Save notes for your next planting cycle." }
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
  const { t } = useLanguage();
  const { crops, updateCrop, updateCropStatusApi, addCostApi, logHarvestApi } = useCrops();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addCostOpen, setAddCostOpen] = useState(false);
  const [additionalCost, setAdditionalCost] = useState("");
  const [farmgatePrice, setFarmgatePrice] = useState("");
  const [editFarmgate, setEditFarmgate] = useState(false);
  const [farmgateDraft, setFarmgateDraft] = useState("");
  const [actionError, setActionError] = useState(null);
  const crop = crops.find((c) => c.id === cropId);
  if (!crop) {
    return <div className="px-4 py-8 text-center">
        <p className="text-[var(--hw-neutral-900)]">{t ? t("farmer.empty.crop_not_found") : "Crop not found."}</p>
        <button onClick={() => navigate("/farmer/crops")} className="mt-3 text-sm font-medium text-[var(--hw-green-700)]">
          Go to My Crops
        </button>
      </div>;
  }
  const handleDrawerAction = async (action) => {
    const statusMap = {
      [PHASE_CODES.PLANNING]: "Planning",
      [PHASE_CODES.GROWING]: "Planted",
      [PHASE_CODES.PRE_HARVEST]: "Pre-Harvest",
      [PHASE_CODES.HARVESTED]: "Harvesting",
      [PHASE_CODES.COMPLETED]: "Completed",
      planning: "Planning",
      growing: "Planted",
      "pre-harvest": "Pre-Harvest",
      harvested: "Harvesting",
      completed: "Completed"
    };

    setActionError(null);
    try {
      if (action.kind === "phase") {
        const targetStatus = statusMap[action.phase] || "Planning";
        if (targetStatus === "Completed" && action.fields?.finalQtySold && action.fields?.avgSellingPrice) {
          const harvestDate = action.fields.actualHarvestDate || new Date().toISOString().split('T')[0];
          await logHarvestApi(crop.id, harvestDate, action.fields.finalQtySold, action.fields.avgSellingPrice);
        } else {
          await updateCropStatusApi(crop.id, targetStatus);
        }
        updateCrop(crop.id, {
          phase: action.phase,
          lastUpdated: "Just now",
          isOnHold: false,
          ...action.fields?.actualPlantingDate ? { plantingDate: action.fields.actualPlantingDate } : {},
          ...action.fields?.updatedHarvestDate ? { harvestDate: action.fields.updatedHarvestDate } : {}
        });
      } else if (action.kind === "hold") {
        await updateCropStatusApi(crop.id, "On Hold", action.reason);
        const today = (new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        updateCrop(crop.id, {
          isOnHold: true,
          holdReason: action.reason,
          holdDate: today,
          lastUpdated: "Just now"
        });
      } else if (action.kind === "resume") {
        await updateCropStatusApi(crop.id, "Planning");
        updateCrop(crop.id, {
          isOnHold: false,
          lastUpdated: "Just now"
        });
      }
      setDrawerOpen(false);
    } catch (err) {
      setActionError(err.message || "Action failed. Please try again.");
    }
  };
  const extraCost = typeof additionalCost === "number" ? additionalCost : 0;
  const updatedTotalCost = crop.totalCost + extraCost;
  const qty = crop.harvestQuantity > 0 ? crop.harvestQuantity : 1;
  const costToRecover = Math.ceil(updatedTotalCost / qty);
  const currentPrice = crop.currentPrice || null;
  const forecastLo = crop.forecastLower || null;
  const forecastHi = crop.forecastUpper || null;
  const forecastMid = forecastLo != null && forecastHi != null ? (forecastLo + forecastHi) / 2 : null;
  const hasFarmgate = typeof farmgatePrice === "number" && farmgatePrice > 0;
  const phaseCode = normalizePhaseCode(crop.phase);
  const useForecast = [PHASE_CODES.PLANNING, PHASE_CODES.GROWING, PHASE_CODES.ON_HOLD].includes(phaseCode);
  const basePrice = hasFarmgate ? farmgatePrice : (useForecast ? (forecastMid || currentPrice) : currentPrice);
  const sellingBasis = basePrice;
  const priceBasisLabel = useForecast ? (hasFarmgate ? "Based on estimated farmgate price" : "Based on forecasted price near harvest") : (hasFarmgate ? "Based on estimated farmgate price" : "Based on current market price");
  const priceBasisDetail = useForecast
    ? (hasFarmgate ? `Farmgate price: \u20B1${farmgatePrice}/kg` : (forecastLo != null && forecastHi != null ? `Forecasted price reference: \u20B1${forecastLo}\u2013\u20B1${forecastHi}/kg` : `Forecasted price reference: -/kg`))
    : (hasFarmgate ? `Farmgate price: \u20B1${farmgatePrice}/kg` : (currentPrice != null ? `Current market price: \u20B1${currentPrice}/kg` : `Current market price: -/kg`));
  const margin = sellingBasis != null && costToRecover > 0 ? sellingBasis - costToRecover : null;
  const profitLo = margin != null ? Math.max(0, Math.floor(margin * qty * 0.85 / 1e3) * 1e3) : 0;
  const profitHi = margin != null ? Math.ceil(margin * qty * 1.1 / 1e3) * 1e3 : 0;
  const advisoryCode = normalizeAdvisoryCode(crop.advisoryCategory) || getAdvisory(phaseCode, sellingBasis, costToRecover);
  const advisoryCfg = advisoryCode ? ADVISORY_CFG[advisoryCode] : null;
  const AdvisoryIcon = advisoryCfg?.Icon;
  const advisoryLabel = advisoryCode ? t(`farmer.advisory.labels.${advisoryCode}`) : t("farmer.advisory.not_available");
  const weeklyActions = crop.isOnHold ? WEEKLY_ACTIONS[PHASE_CODES.ON_HOLD] ?? [] : WEEKLY_ACTIONS[phaseCode] ?? [];
  const isCompleted = phaseCode === PHASE_CODES.COMPLETED;
  const isActive = !isCompleted;
  const isPlanted = [PHASE_CODES.GROWING, PHASE_CODES.PRE_HARVEST].includes(phaseCode);
  const isHarvesting = phaseCode === PHASE_CODES.HARVESTED;
  const pDate = crop.plantingDate ? new Date(crop.plantingDate) : null;
  const hDate = crop.harvestDate ? new Date(crop.harvestDate) : null;
  const now = new Date();
  const daysSincePlanting = pDate && !isNaN(pDate.getTime()) ? Math.max(0, Math.floor((now - pDate) / (1000 * 60 * 60 * 24))) : null;
  const totalGrowDays = pDate && hDate && !isNaN(pDate.getTime()) && !isNaN(hDate.getTime()) ? Math.max(1, Math.floor((hDate - pDate) / (1000 * 60 * 60 * 24))) : null;
  const progressPct = daysSincePlanting != null && totalGrowDays != null ? Math.min(100, Math.round(daysSincePlanting / totalGrowDays * 100)) : null;
  const daysToHarvest = hDate && !isNaN(hDate.getTime()) ? Math.max(0, Math.floor((hDate - now) / (1000 * 60 * 60 * 24))) : null;
  return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-4">

        {actionError && <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-[13px] text-red-700">{actionError}</div>}

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
            <CommodityIllustration commodityId={crop.commodity} commodityName={crop.commodityName} baseName={crop.commodityName} className="w-14 h-14 flex-shrink-0" />
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
                {phaseCode === PHASE_CODES.PLANNING ? <p>Planned planting: {crop.plantingDate || "-"}</p> : <p>Planted: {crop.plantingDate || "-"}</p>}
                <p>Est. harvest: {crop.harvestDate || "-"}</p>
                <p>Farm area: {crop.farmArea != null ? `${crop.farmArea} sq m` : "- sq m"}</p>
              </div>
              <p className="text-xs text-[var(--hw-neutral-900)] mt-1">Last updated {crop.lastUpdated || "-"}</p>
            </div>
          </div>
        </div>

        {/* ── On Hold reason — shown between header and advisory ── */}
        {crop.isOnHold && <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 flex items-start gap-3">
            <PauseCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[13px] font-semibold text-amber-700">On hold</p>
              <p className="text-[13px] text-[var(--hw-neutral-900)]">Reason for putting this crop on hold: {crop.holdReason || "-"}</p>
              {crop.holdDate && <p className="text-[12px] text-[var(--hw-neutral-900)]">Put on hold: {crop.holdDate}</p>}
            </div>
          </div>}

        {/* ── 2. Main advice — white card, colored foreground only ── */}
        {isActive && (
          <div className={`bg-white rounded-2xl border shadow-[var(--shadow-xs)] p-4 ${advisoryCfg?.border || "border-[var(--hw-neutral-200)]"}`}>
            <div className={`flex items-center gap-2 mb-2 ${advisoryCfg?.color || "text-[var(--hw-neutral-700)]"}`}>
              {AdvisoryIcon ? <AdvisoryIcon className="w-5 h-5 flex-shrink-0" /> : <Sprout className="w-5 h-5 flex-shrink-0" />}
              <p className={`text-[15px] font-bold ${advisoryCfg?.color || "text-[var(--hw-neutral-700)]"}`}>{advisoryLabel}</p>
            </div>
            <p className="text-[14px] text-[var(--hw-neutral-900)] leading-snug">
              {advisoryCode && ADVISORY_SUMMARY[advisoryCode] ? ADVISORY_SUMMARY[advisoryCode](crop.variant ? `${crop.commodityName} (${crop.variant})` : crop.commodityName, t) : t("farmer.advisory.not_available")}
            </p>
            <p className={`text-[13px] font-medium mt-1 ${advisoryCfg?.color || "text-[var(--hw-neutral-700)]"}`}>
              {advisoryCode && ADVISORY_SUPPORT[advisoryCode] ? ADVISORY_SUPPORT[advisoryCode](t) : t("farmer.advisory.not_available")}
            </p>
            <button
              onClick={() => navigate(`/farmer/crops/${crop.id}/factors`)}
              className="mt-2 text-[13px] font-semibold text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
            >
              View basis →
            </button>
          </div>
        )}

        {/* ── 3. Estimated Profit ── */}
        {isActive && <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">Estimated Profit</p>

            <p className="text-[20px] font-bold text-emerald-700 leading-none">
              {margin > 0 ? `₱${profitLo.toLocaleString("en-PH")} – ₱${profitHi.toLocaleString("en-PH")}` : "-"}
            </p>

            <div className="space-y-0.5">
              <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{priceBasisLabel}</p>
              <p className="text-[13px] text-[var(--hw-neutral-900)]">{priceBasisDetail}</p>
            </div>

            {margin > 0 ? (
              <ProfitCalcAccordion
                qty={qty}
                totalCost={updatedTotalCost}
                sellingBasis={sellingBasis}
                costToRecover={costToRecover}
                hasFarmgate={hasFarmgate}
                margin={margin}
              />
            ) : (
              <p className="text-[13px] text-[var(--hw-neutral-900)] italic">{t ? t("farmer.empty.profit_unavailable") : "Profit details unavailable."}</p>
            )}

            {/* Supporting values below the accordion */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] pt-1 border-t border-[var(--hw-neutral-100)]">
              <div>
                <p className="text-[var(--hw-neutral-900)]">Estimated cost</p>
                <p className="font-medium text-[var(--hw-neutral-900)]">{updatedTotalCost > 0 ? formatPeso(updatedTotalCost) : "-"}</p>
              </div>
              <div>
                <p className="text-[var(--hw-neutral-900)]">Expected harvest</p>
                <p className="font-medium text-[var(--hw-neutral-900)]">{crop.harvestQuantity ? `${crop.harvestQuantity} kg` : "- kg"}</p>
              </div>
              <div>
                <p className="text-[var(--hw-neutral-900)]">Price basis</p>
                <p className="font-medium text-[var(--hw-neutral-900)]">{sellingBasis ? `₱${sellingBasis}/kg` : "-/kg"}</p>
              </div>
              <div>
                <p className="text-[var(--hw-neutral-900)]">Cost to recover</p>
                <p className="font-medium text-[var(--hw-neutral-900)]">{costToRecover ? `₱${costToRecover}/kg` : "-/kg"}</p>
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
                    <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">{action.key ? t(action.key) : action.text}</p>
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
              <p className="text-[15px] font-bold text-[var(--hw-neutral-900)]">{currentPrice != null ? `\u20B1${currentPrice}/kg` : "-/kg"}</p>
              <p className="text-[12px] text-[var(--hw-neutral-900)]">
                Forecast: {forecastLo != null && forecastHi != null ? `\u20B1${forecastLo}\u2013\u20B1${forecastHi}/kg` : "-/kg"}
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
              <p className="text-[13px] font-semibold text-blue-700 leading-snug">{crop.weatherCondition || "Not available"}</p>
              <p className="text-[12px] text-[var(--hw-neutral-900)]">{crop.weatherAction || "-"}</p>
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
                <span className="text-[var(--hw-neutral-900)]">{daysSincePlanting != null && totalGrowDays != null ? `${daysSincePlanting} of ${totalGrowDays} days` : "-"}</span>
                <span className="font-semibold text-[var(--hw-neutral-900)]">{progressPct != null ? `${progressPct}%` : "-"}</span>
              </div>
              <div className="h-2.5 bg-[var(--hw-neutral-200)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--hw-green-600)] rounded-full" style={{ width: `${progressPct != null ? progressPct : 0}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Days planted", value: daysSincePlanting != null ? `${daysSincePlanting}d` : "-" },
                { label: "Days to harvest", value: daysToHarvest != null ? `${daysToHarvest}d` : "-" },
                { label: "Harvest est.", value: crop.harvestDate || "-" }
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
                { label: "Estimated cost", value: updatedTotalCost > 0 ? formatPeso(updatedTotalCost) : "-" },
                { label: "Added costs", value: extraCost > 0 ? formatPeso(extraCost) : "-" },
                { label: "Total recorded cost", value: updatedTotalCost > 0 ? formatPeso(updatedTotalCost) : "-", bold: true },
                { label: "Expected harvest volume", value: crop.harvestQuantity ? `${crop.harvestQuantity} kg` : "- kg" },
                { label: "Cost to recover per kg", value: costToRecover > 0 ? `\u20B1${costToRecover}/kg` : "-/kg", bold: true },
                { label: "Forecasted price reference", value: forecastLo != null && forecastHi != null ? `\u20B1${forecastLo}\u2013\u20B1${forecastHi}/kg` : "-/kg" },
                { label: "Current market price", value: currentPrice != null ? `\u20B1${currentPrice}/kg` : "-/kg" },
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

            {/* Phase actions */}
            {normalizePhaseCode(crop.phase) === PHASE_CODES.PRE_HARVEST && <div className="pt-2 flex flex-wrap gap-2">
                <button onClick={() => setDrawerOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--hw-green-700)] text-white text-[13px] font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors">
                  Start Harvesting
                </button>
                <button onClick={() => navigate(`/farmer/prices/${crop.commodity}`)} className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] text-[13px] font-medium rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors">
                  View Prices
                </button>
              </div>}
            {normalizePhaseCode(crop.phase) === PHASE_CODES.PLANNING && <div className="pt-2 flex flex-wrap gap-2">
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
