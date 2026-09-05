import { useState } from "react";
import {
  CheckCircle2,
  MinusCircle,
  XCircle,
  TrendingUp,
  Package,
  CloudRain,
  Leaf,
  PhilippinePeso,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Save,
  Sprout,
  RefreshCw,
  AlertCircle,
  Check
} from "lucide-react";
import { useNavigate } from "react-router";
import { COMMODITY_OPTIONS, getTotalCost, formatPeso } from "./types";
import { useCrops } from "../crops/CropsContext";
import { useLanguage } from "../../../global/contexts/LanguageContext";
import {
  ADVISORY_CODES,
  PHASE_CODES,
  PRICE_TREND_CODES,
  normalizeAdvisoryCode,
  normalizePhaseCode,
  normalizePriceTrendCode,
} from "../../utils/farmerCodes";
import { apiPost, parseResponse } from "../../../global/api";
import { CommodityIllustration } from "../../../global/components/shared/CommodityIllustrations";
import { Breadcrumb } from "../shared/Breadcrumb";

const ADVISORY_CFG = {
  [ADVISORY_CODES.RECOMMENDED]: {
    Icon: CheckCircle2,
    color: "text-emerald-700",
    border: "border-[var(--hw-neutral-200)]",
    summaryKey: "farmer.advisory.recommended_summary",
    supportKey: "farmer.advisory.recommended_support",
  },
  [ADVISORY_CODES.PROCEED_WITH_CAUTION]: {
    Icon: MinusCircle,
    color: "text-amber-700",
    border: "border-[var(--hw-neutral-200)]",
    summaryKey: "farmer.advisory.caution_summary",
    supportKey: "farmer.advisory.caution_support",
  },
  [ADVISORY_CODES.AVOID_FOR_NOW]: {
    Icon: XCircle,
    color: "text-red-700",
    border: "border-[var(--hw-neutral-200)]",
    summaryKey: "farmer.advisory.avoid_summary",
    supportKey: "farmer.advisory.avoid_support",
  },
};

function getWhyFactors(name, commodityId, costToRecover, farmgatePrice, advisory, currentPrice, forecastLo, forecastHi, data) {
  return [
    {
      label: "Price",
      Icon: TrendingUp,
      value: data.priceInsight || "Not available"
    },
    {
      label: "Arrival",
      Icon: Package,
      value: data.arrivalInsight || data.supplyInsight || "Not available"
    },
    {
      label: "Production",
      Icon: Leaf,
      value: data.productionInsight || "Not available"
    },
    {
      label: "Weather",
      Icon: CloudRain,
      value: data.weatherInsight || "Not available"
    },
    {
      label: "Profitability",
      Icon: PhilippinePeso,
      value: data.profitabilityInsight || "Not available"
    }
  ];
}
const ProfitCalcAccordion = ({ qty, totalCost, costToRecover, sellingBasis, priceBasisShort, margin, hasFarmgate }) => {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  return <div className="border border-[var(--hw-neutral-200)] rounded-xl overflow-hidden">
      <button
    onClick={() => setOpen((v) => !v)}
    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-[var(--hw-neutral-50)] transition-colors text-left bg-[var(--hw-neutral-50)]"
  >
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">
          {t("farmer.factors.profitability.calc_accordion_title")}
        </p>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-[var(--hw-neutral-400)] flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--hw-neutral-400)] flex-shrink-0" />}
      </button>
      {open && <div className="px-3 py-3 space-y-1.5 border-t border-[var(--hw-neutral-200)] bg-white">
          {[
    { label: "Expected harvest volume", value: `${qty} kg` },
    { label: "Total estimated cost", value: formatPeso(totalCost) },
    { label: "Price basis used", value: priceBasisShort },
    { label: "Price basis (per kg)", value: `\u20B1${sellingBasis}/kg` },
    { label: "Cost to recover", value: `\u20B1${costToRecover}/kg` },
    { label: `Estimated profit per kg (\u20B1${sellingBasis} \u2212 \u20B1${costToRecover})`, value: `\u20B1${margin}/kg`, bold: true }
  ].map((r) => <div key={r.label} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="text-[var(--hw-neutral-900)]">{r.label}</span>
              <span className={r.bold ? "font-bold text-emerald-700" : "font-medium text-[var(--hw-neutral-900)]"}>{r.value}</span>
            </div>)}
          {!hasFarmgate && <p className="text-[12px] text-[var(--hw-neutral-900)] italic pt-1 border-t border-[var(--hw-neutral-100)]">
              {t("farmer.factors.profitability.forecast_reference_notice")}
            </p>}
        </div>}
    </div>;
};
function makeCropId() {
  return `crop-${Date.now()}`;
}

function buildCropPlanPayload(data, status = "Draft") {
  const totalCost = getTotalCost(data);
  const productionCosts = data.costMethod === "detailed"
    ? (data.expenses || [])
        .filter((e) => typeof e.amount === "number" && e.amount > 0)
        .map((e) => ({
          category: e.name || "Additional",
          amount: e.amount,
          cost_type: "initial",
        }))
    : totalCost > 0
      ? [{ category: "Total Cost", amount: totalCost, cost_type: "initial" }]
      : [];

  return {
    commodity_id: data.commodity,
    planned_planting_date: data.plantingDate || null,
    expected_harvest_date: data.harvestDate || null,
    farm_area: typeof data.farmArea === "number" && data.farmArea > 0 ? data.farmArea : null,
    expected_harvest_qty: typeof data.harvestQuantity === "number" && data.harvestQuantity > 0 ? data.harvestQuantity : null,
    expected_farmgate_price: typeof data.farmgatePrice === "number" && data.farmgatePrice > 0 ? data.farmgatePrice : null,
    status,
    cost_entry_mode: data.costMethod === "detailed" ? "detailed" : "simple",
    production_costs: productionCosts,
  };
}

function buildCropRecord(data, phase, overrides = {}) {
  const commodityName = COMMODITY_OPTIONS.find((c) => c.id === data.commodity)?.name ?? data.commodity;
  const totalCost = getTotalCost(data);
  const qty = typeof data.harvestQuantity === "number" ? data.harvestQuantity : 1;
  const breakEvenPrice = qty > 0 ? Math.ceil(totalCost / qty) : 0;
  return {
    id: makeCropId(),
    commodity: data.commodity,
    commodityName,
    variant: data.variant || void 0,
    phase,
    plantingDate: data.plantingDate || "TBD",
    harvestDate: data.harvestDate || "TBD",
    farmArea: typeof data.farmArea === "number" ? data.farmArea : 0,
    farmAreaUnit: data.farmAreaUnit,
    harvestQuantity: typeof data.harvestQuantity === "number" ? data.harvestQuantity : 0,
    totalCost,
    breakEvenPrice,
    condition: "Monitor market conditions near harvest.",
    nextMilestone: normalizePhaseCode(phase) === PHASE_CODES.GROWING ? "Monitor crop conditions" : "Reassess market conditions",
    lastUpdated: "Just now",
    ...overrides
  };
}

const STATUS_TO_PHASE = {
  Draft: "planning",
  Planning: "planning",
  Planted: "growing",
  "Pre-Harvest": "pre-harvest",
  Harvesting: "harvested",
  "On Hold": "planning",
  Completed: "completed",
  Cancelled: "completed",
};

function transformSavedPlan(plan) {
  const rawStatus = plan.status || "Planning";
  const phase = STATUS_TO_PHASE[rawStatus] || "planning";
  const commodity = plan.commodity || {};
  const totalCost = (plan.production_costs || []).reduce(
    (sum, c) => sum + Number(c.amount || 0), 0
  );
  const qty = Number(plan.expected_harvest_qty) || 1;
  return {
    id: plan.id,
    commodity: plan.commodity_id,
    commodityName: commodity.name || "\u2013",
    variant: commodity.variety || null,
    phase,
    status: rawStatus,
    isOnHold: rawStatus === "On Hold",
    holdReason: plan.hold_reason || null,
    plantingDate: plan.actual_planting_date
      ? new Date(plan.actual_planting_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : plan.planned_planting_date
        ? new Date(plan.planned_planting_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : null,
    harvestDate: plan.expected_harvest_date
      ? new Date(plan.expected_harvest_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : null,
    farmArea: plan.farm_area || null,
    farmAreaUnit: "sqm",
    harvestQuantity: plan.expected_harvest_qty || null,
    totalCost,
    breakEvenPrice: qty > 0 ? Math.ceil(totalCost / qty) : 0,
    nextMilestone: null,
    lastUpdated: "Just now",
  };
}
const RecommendationResult = ({ data, onEdit }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { addCrop } = useCrops();
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showPlantedForm, setShowPlantedForm] = useState(false);
  const [plantedForm, setPlantedForm] = useState({
    actualPlantingDate: data.plantingDate,
    actualArea: data.farmArea,
    updatedHarvestDate: data.harvestDate
  });
  const commodityName = COMMODITY_OPTIONS.find((c) => c.id === data.commodity)?.name ?? "this crop";
  const displayName = data.variant ? `${commodityName} (${data.variant})` : commodityName;
  const totalCost = getTotalCost(data);
  const qty = typeof data.harvestQuantity === "number" && data.harvestQuantity > 0 ? data.harvestQuantity : null;
  const costToRecover = qty ? Math.ceil(totalCost / qty) : null;
  const advisoryCode = normalizeAdvisoryCode(data.advisoryCategory);
  const advisoryCfg = advisoryCode ? ADVISORY_CFG[advisoryCode] : null;
  const AdvisoryIcon = advisoryCfg ? advisoryCfg.Icon : null;
  const advisoryLabel = advisoryCode ? t(`farmer.advisory.labels.${advisoryCode}`) : t("farmer.advisory.not_available");
  const hasFarmgate = data.useFarmgate && typeof data.farmgatePrice === "number" && data.farmgatePrice > 0;
  const farmgateNum = hasFarmgate ? data.farmgatePrice : null;
  const currentPx = data.currentPrice || null;
  const forecastLo = data.forecastLower || null;
  const forecastHi = data.forecastUpper || null;
  const forecastMid = forecastLo != null && forecastHi != null ? (forecastLo + forecastHi) / 2 : currentPx;
  const sellingBasis = hasFarmgate ? data.farmgatePrice : forecastMid;
  const priceBasisLabel = hasFarmgate ? "Based on estimated farmgate price" : "Based on forecasted market price";
  const priceBasisShort = hasFarmgate ? "Estimated farmgate price" : "Forecasted market price";
  const priceBasisDetail = hasFarmgate
    ? `Farmgate price: \u20B1${data.farmgatePrice}/kg`
    : (forecastLo != null && forecastHi != null
        ? t("farmer.factors.price.forecast_reference_range", { forecast_lo: forecastLo, forecast_hi: forecastHi })
        : `Forecasted price reference: -/kg`);
  const margin = costToRecover !== null && sellingBasis != null ? sellingBasis - costToRecover : null;
  const hasProfit = margin !== null && qty !== null && margin > 0;
  const profitLo = hasProfit ? Math.floor(margin * qty * 0.85 / 1e3) * 1e3 : 0;
  const profitHi = hasProfit ? Math.ceil(margin * qty * 1.1 / 1e3) * 1e3 : 0;
  const whyFactors = getWhyFactors(commodityName, data.commodity, costToRecover ?? 0, farmgateNum, advisoryCode, currentPx, forecastLo, forecastHi, data);
  const dirMap = {
    [ADVISORY_CODES.RECOMMENDED]: PRICE_TREND_CODES.RISING,
    [ADVISORY_CODES.PROCEED_WITH_CAUTION]: PRICE_TREND_CODES.STABLE,
    [ADVISORY_CODES.AVOID_FOR_NOW]: PRICE_TREND_CODES.FALLING
  };
  const priceDir = advisoryCode ? (dirMap[advisoryCode] || PRICE_TREND_CODES.STABLE) : PRICE_TREND_CODES.STABLE;
  const pricePoints = data.pricePoints || [];
  const priceTabData = {
    currentPrice: currentPx,
    previousPrice: currentPx ? Math.round(currentPx + (priceDir === PRICE_TREND_CODES.RISING ? -5 : priceDir === PRICE_TREND_CODES.FALLING ? 5 : 0)) : null,
    market: data.market || "Not available",
    direction: priceDir,
    directionLabel: priceDir === PRICE_TREND_CODES.RISING
      ? t("farmer.factors.price.trend_label_rising")
      : priceDir === PRICE_TREND_CODES.FALLING
        ? t("farmer.factors.price.trend_label_falling")
        : t("farmer.factors.price.trend_label_stable"),
    forecastRange: forecastLo != null && forecastHi != null ? `₱${forecastLo}–₱${forecastHi}/kg` : "-/kg",
    points: pricePoints,
    summary: whyFactors.find((f) => f.label === "Price")?.value ?? ""
  };
  const arrivalTabData = data.arrivalData || null;
  const productionTabData = data.productionData || null;
  const weatherTabData = data.weatherData || null;
  const weatherRisk = advisoryCode === ADVISORY_CODES.RECOMMENDED ? "low" : advisoryCode === ADVISORY_CODES.PROCEED_WITH_CAUTION ? "moderate" : "high";
  const profitabilityData = costToRecover !== null && qty !== null ? {
    costPerKg: costToRecover,
    sellingPricePerKg: sellingBasis,
    profitPerKg: margin ?? 0,
    totalCost,
    harvestQty: qty,
    expenses: data.costMethod === "detailed" ? data.expenses : null,
    summary: hasProfit
      ? t("farmer.factors.profitability.summary_positive", {
          selling_price: sellingBasis,
          margin: margin,
          total_profit: ((margin ?? 0) * qty).toLocaleString("en-PH")
        })
      : t("farmer.factors.profitability.summary_negative")
  } : void 0;
  const handleSavePlan = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = buildCropPlanPayload(data, "Planning");
      const res = await apiPost("/crop-plans", payload);
      const savedPlan = await parseResponse(res);
      addCrop(transformSavedPlan(savedPlan));
      setSaved("plan");
    } catch (err) {
      setSaveError(err.message || t("farmer.errors.save_plan_failed"));
    } finally {
      setSaving(false);
    }
  };
  const handleConfirmPlanted = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = buildCropPlanPayload(data, "Planted");
      payload.actual_planting_date = plantedForm.actualPlantingDate || data.plantingDate || null;
      const res = await apiPost("/crop-plans", payload);
      const savedPlan = await parseResponse(res);
      addCrop(transformSavedPlan(savedPlan));
      setSaved("planted");
      setShowPlantedForm(false);
    } catch (err) {
      setSaveError(err.message || t("farmer.errors.save_plan_failed"));
    } finally {
      setSaving(false);
    }
  };
  if (saved) {
    const lm = { plan: "saved as a crop plan", planted: "marked as planted and growing", "on-hold": "saved and put on hold" };
    return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
          <div className="bg-[var(--hw-green-50)] border border-[var(--hw-green-400)] rounded-2xl p-5 text-center space-y-2">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-[var(--hw-green-700)] rounded-full"><Check className="w-6 h-6 text-white" /></div>
            </div>
            <p className="font-semibold text-[var(--hw-green-900)]">
              {t("farmer.common.crop_plan_saved_toast", { displayName, action_status: lm[saved] })}
            </p>
            <p className="text-sm text-[var(--hw-green-800)]">
              {t("farmer.common.crop_plan_saved_desc")}
            </p>
          </div>
          <button
            onClick={() => navigate("/farmer/crops")}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-[var(--hw-green-700)] text-white font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
          >
            Go to My Crops <ChevronRight className="w-4 h-4" />
          </button>
      </div>;
  }
  if (showPlantedForm) {
    const inputCls = "w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition bg-white";
    return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
          <Breadcrumb items={[{ label: "Crop Assessment" }, { label: "Result" }]} />
          <button
            onClick={() => setShowPlantedForm(false)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-900)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />Back to recommendation
          </button>
          <div>
            <h2 className="text-xl font-bold text-[var(--hw-neutral-900)]">Adjust planting details</h2>
            <p className="text-sm text-[var(--hw-neutral-900)] mt-1">Confirm your details to start monitoring {displayName}.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--hw-neutral-900)] mb-1.5">Actual planting date</label>
              <input type="date" value={plantedForm.actualPlantingDate} onChange={(e) => setPlantedForm((f) => ({ ...f, actualPlantingDate: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--hw-neutral-900)] mb-1.5">Actual planted area (sq m)</label>
              <input type="number" min="0" value={plantedForm.actualArea} onChange={(e) => setPlantedForm((f) => ({ ...f, actualArea: e.target.value === "" ? "" : Number(e.target.value) }))} placeholder="e.g. 500" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--hw-neutral-900)] mb-1.5">Updated expected harvest date</label>
              <input type="date" value={plantedForm.updatedHarvestDate} onChange={(e) => setPlantedForm((f) => ({ ...f, updatedHarvestDate: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <button
            onClick={handleConfirmPlanted}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-[var(--hw-green-700)] text-white font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sprout className="w-4 h-4" />{saving ? "Saving..." : "Confirm — I planted this"}
          </button>
      </div>;
  }
  return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-4">

        <Breadcrumb items={[{ label: "Crop Assessment" }, { label: "Result" }]} />

        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-900)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />Edit information
        </button>

        {/* 1. Advisory card */}
        <div className={`bg-white rounded-2xl border shadow-[var(--shadow-xs)] p-4 space-y-3 ${advisoryCfg ? advisoryCfg.border : "border-[var(--hw-neutral-200)]"}`}>

          {/* Commodity header */}
          <div className="flex items-center gap-2.5">
            <CommodityIllustration commodityId={data.commodity} commodityName={commodityName} className="w-10 h-10 flex-shrink-0" />
            <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">{displayName}</p>
          </div>

          {!advisoryCode ? (
            <div>
              <p className="text-[14px] text-[var(--hw-neutral-900)] leading-snug font-medium">
                {t("farmer.advisory.not_available")}
              </p>
            </div>
          ) : (
            <>
              {/* Advisory level — prominent */}
              <div className={`flex items-center gap-2.5 ${advisoryCfg.color}`}>
                <AdvisoryIcon className={`w-7 h-7 flex-shrink-0 ${advisoryCfg.color}`} />
                <p className={`text-[28px] font-bold leading-tight ${advisoryCfg.color}`}>{advisoryLabel}</p>
              </div>

              {/* Explanation */}
              <div>
                <p className="text-[14px] text-[var(--hw-neutral-900)] leading-snug">
                  {t(advisoryCfg.summaryKey, { crop_name: displayName })}
                </p>
                <p className={`text-[13px] font-medium mt-1 ${advisoryCfg.color}`}>
                  {t(advisoryCfg.supportKey)}
                </p>
                <button
        onClick={() => {
          const pageState = {
            title: `${displayName} — Detailed Factors`,
            subtitle: `Assessment result · ${advisoryLabel}`,
            breadcrumbs: [
              { label: "Crop Assessment", path: "/assess" },
              { label: "Result" },
              { label: "Detailed Factors" }
            ],
            backPath: "/assess",
            backLabel: "Assessment Result",
            price: priceTabData,
            arrival: arrivalTabData,
            production: productionTabData,
            weather: weatherTabData,
            profitability: profitabilityData,
            commodityId: data.commodity,
            commodityName
          };
          navigate("/farmer/assess/factors", { state: pageState });
        }}
        className="mt-2 text-[13px] font-semibold text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
      >
                  View basis →
                </button>
              </div>
            </>
          )}

          {/* Date chips */}
          {(data.plantingDate || data.harvestDate) && <div className="grid grid-cols-2 gap-2 text-[13px]">
              {data.plantingDate && <div className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2">
                  <p className="text-[var(--hw-neutral-900)] text-[12px]">Planting date</p>
                  <p className="font-medium text-[var(--hw-neutral-900)]">{data.plantingDate}</p>
                </div>}
              {data.harvestDate && <div className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2">
                  <p className="text-[var(--hw-neutral-900)] text-[12px]">Expected harvest</p>
                  <p className="font-medium text-[var(--hw-neutral-900)]">{data.harvestDate}</p>
                </div>}
            </div>}

          <p className="text-[12px] text-[var(--hw-neutral-900)]">
            {t("farmer.dataNotes.market_data_as_of", { date: data.generatedDate || "Jul 11, 2026" })}
          </p>
        </div>

        {/* 2. Why this recommendation? Factors card */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
          <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">
            {t("farmer.advisory.why_recommendation_title")}
          </p>
          <div className="space-y-2.5">
            {whyFactors.map((f) => {
              const Icon = f.Icon || TrendingUp;
              return (
                <div key={f.label} className="flex items-start gap-3 p-2.5 rounded-xl bg-[var(--hw-neutral-50)]">
                  <Icon className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--hw-neutral-900)]" />
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{f.label}</p>
                    <p className="text-[12px] text-[var(--hw-neutral-700)]">{f.value || "Not available"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {
    /* 3. Estimated Profit card — Always retained with empty states when data is null */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
          <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">Estimated Profit</p>

          <p className={`text-[20px] font-bold leading-none ${hasProfit ? "text-emerald-700" : "text-[var(--hw-neutral-700)]"}`}>
            {hasProfit
              ? `₱${profitLo.toLocaleString("en-PH")} – ₱${profitHi.toLocaleString("en-PH")}`
              : margin !== null && qty !== null
                ? `₱${(margin * qty).toLocaleString("en-PH")}`
                : "-"}
          </p>

          <div className="space-y-0.5">
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{priceBasisLabel}</p>
            <p className="text-[13px] text-[var(--hw-neutral-900)]">{priceBasisDetail}</p>
            {!hasFarmgate && <p className="text-[12px] text-[var(--hw-neutral-900)]">
                Price may still change before harvest. Update this as harvest gets closer.
              </p>}
          </div>

          <ProfitCalcAccordion
            qty={qty || "-"}
            totalCost={totalCost}
            costToRecover={costToRecover != null ? costToRecover : "-"}
            sellingBasis={sellingBasis != null ? sellingBasis : "-"}
            priceBasisShort={priceBasisShort}
            margin={margin != null ? margin : "-"}
            hasFarmgate={hasFarmgate}
          />

          {
    /* Supporting values */
  }
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] pt-1 border-t border-[var(--hw-neutral-100)]">
            <div>
              <p className="text-[var(--hw-neutral-900)]">Estimated cost</p>
              <p className="font-medium text-[var(--hw-neutral-900)]">{totalCost > 0 ? formatPeso(totalCost) : "-"}</p>
            </div>
            <div>
              <p className="text-[var(--hw-neutral-900)]">Expected harvest</p>
              <p className="font-medium text-[var(--hw-neutral-900)]">{qty ? `${qty} kg` : "- kg"}</p>
            </div>
            <div>
              <p className="text-[var(--hw-neutral-900)]">Price basis</p>
              <p className="font-medium text-[var(--hw-neutral-900)]">{sellingBasis != null ? `₱${sellingBasis}/kg` : "-/kg"}</p>
            </div>
            <div>
              <p className="text-[var(--hw-neutral-900)]">Cost to recover</p>
              <p className="font-medium text-[var(--hw-neutral-900)]">{costToRecover != null ? `₱${costToRecover}/kg` : "-/kg"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[var(--hw-neutral-900)]">Estimated farmgate price</p>
              {hasFarmgate ? <p className="font-medium text-[var(--hw-neutral-900)]">₱{data.farmgatePrice}/kg</p> : <p className="text-[var(--hw-neutral-900)] italic">Not set — using market price as reference.</p>}
            </div>
          </div>

          <p className="text-[12px] text-[var(--hw-neutral-900)]">Estimate only. Actual income may change.</p>
        </div>

        {
    /* 3. What to do next */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">What to do next</p>
          <div className="space-y-2.5">
            {[
    "Save to My Crops to start tracking your plan and monitoring conditions.",
    hasFarmgate ? "Confirm your farmgate price with your buyer before harvest." : "Update your farmgate price later when a buyer gives you an offer.",
    "Check prices again closer to harvest before deciding when to sell."
  ].map((text, i) => <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[var(--hw-neutral-100)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <p className="text-[12px] font-bold text-[var(--hw-neutral-900)]">{i + 1}</p>
                </div>
                <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">{text}</p>
              </div>)}
          </div>
        </div>

        {
    /* 5. Actions */
  }
        <div className="space-y-3 pt-1">
          {saveError && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>}
          <button
    onClick={handleSavePlan}
    disabled={saving}
    className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-[var(--hw-green-700)] text-white font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
            <Save className="w-4 h-4" />{saving ? "Saving..." : "Save to My Crops"}
          </button>
          <button
    onClick={() => setShowPlantedForm(true)}
    disabled={saving}
    className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-white text-[var(--hw-green-700)] font-medium rounded-xl border border-[var(--hw-green-400)] hover:bg-[var(--hw-green-50)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
            <Sprout className="w-4 h-4" />I already planted this
          </button>
          <button
    onClick={() => navigate("/farmer/assess")}
    className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-white text-[var(--hw-neutral-900)] font-medium rounded-xl border border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            <RefreshCw className="w-4 h-4" />Compare another crop
          </button>
        </div>

        <div className="flex items-start gap-2 text-[var(--hw-neutral-900)]">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-[13px]">Results are estimates and do not guarantee income.</p>
        </div>

    </div>;
};
export {
  RecommendationResult
};
