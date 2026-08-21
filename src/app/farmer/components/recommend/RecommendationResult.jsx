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
  Save,
  Sprout,
  RefreshCw,
  AlertCircle,
  Check
} from "lucide-react";
import { useNavigate } from "react-router";
import { COMMODITY_OPTIONS, getTotalCost, formatPeso } from "./types";
import { useCrops } from "../crops/CropsContext";
import { CommodityIllustration } from "../../../global/components/shared/CommodityIllustrations";
import { Breadcrumb } from "../shared/Breadcrumb";
import {
  buildPricePoints,
  getArrivalData,
  getProductionData,
  getWeatherData
} from "../shared/FactorDetailTabs";
const SENTIMENT_COLOR = {
  favorable: "text-emerald-700",
  caution: "text-amber-600",
  unfavorable: "text-red-700"
};
const ADVISORY_CFG = {
  "Recommended": {
    Icon: CheckCircle2,
    color: "text-emerald-700",
    border: "border-[var(--hw-neutral-200)]",
    summary: (n) => `Current conditions support your ${n} plan.`,
    support: "Prices are fair and weather is manageable this week."
  },
  "Plant Conservatively": {
    Icon: MinusCircle,
    color: "text-amber-700",
    border: "border-[var(--hw-neutral-200)]",
    summary: (n) => `${n} may still be planted, but consider starting with a smaller area.`,
    support: "Consider a smaller area until conditions improve."
  },
  "Avoid for Now": {
    Icon: XCircle,
    color: "text-red-700",
    border: "border-[var(--hw-neutral-200)]",
    summary: (n) => `Conditions are not favorable for planting ${n} at this time.`,
    support: "Consider waiting for better timing before committing."
  }
};
function getAdvisory(commodityId) {
  const map = {
    kamatis: "Plant Conservatively",
    talong: "Plant Conservatively",
    repolyo: "Avoid for Now",
    atsal: "Recommended",
    carrots: "Recommended",
    pipino: "Plant Conservatively",
    ampalaya: "Recommended",
    kalabasa: "Plant Conservatively",
    lettuce: "Avoid for Now",
    pechay: "Avoid for Now"
  };
  return map[commodityId] ?? "Plant Conservatively";
}
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
function factorSentiment(advisory, factor) {
  if (advisory === "Recommended") return factor === "Weather" ? "caution" : "favorable";
  if (advisory === "Plant Conservatively") return "caution";
  if (factor === "Price" || factor === "Production") return "caution";
  return "unfavorable";
}
function getWhyFactors(name, commodityId, costToRecover, farmgatePrice, advisory) {
  const currentPrice = CURRENT_PRICES[commodityId] ?? 70;
  const forecast = FORECAST_PRICES[commodityId] ?? { mid: currentPrice, lo: currentPrice - 5, hi: currentPrice + 5 };
  const sellingBasis = farmgatePrice ?? forecast.mid;
  const margin = sellingBasis - costToRecover;
  return [
    {
      label: "Price",
      Icon: TrendingUp,
      sentiment: factorSentiment(advisory, "Price"),
      value: `\u20B1${currentPrice}/kg today, up \u20B15/kg from last week.`
    },
    {
      label: "Supply",
      Icon: Package,
      sentiment: factorSentiment(advisory, "Supply"),
      value: "DFTC arrivals are 12 tons this week, lower than 18 tons last week."
    },
    {
      label: "Production",
      Icon: Leaf,
      sentiment: factorSentiment(advisory, "Production"),
      value: advisory === "Recommended" ? `Q3 (Jul\u2013Sep) production is usually lower for ${name}, which may reduce supply pressure near harvest.` : `Q3 (Jul\u2013Sep) production is usually moderate to high for ${name}, so some harvest competition is expected.`
    },
    {
      label: "Weather",
      Icon: CloudRain,
      sentiment: factorSentiment(advisory, "Weather"),
      value: "Heavy rain is expected on Jul 12\u201313, so field work may need caution."
    },
    {
      label: "Profit",
      Icon: PhilippinePeso,
      sentiment: factorSentiment(advisory, "Profit"),
      value: margin >= 0 ? `Around \u20B1${margin}/kg above cost to recover, using ${farmgatePrice ? "estimated farmgate price" : "forecasted price reference"}.` : `Currently \u20B1${Math.abs(margin)}/kg below cost to recover at forecasted price.`
    }
  ];
}
const ProfitCalcAccordion = ({ qty, totalCost, costToRecover, sellingBasis, priceBasisShort, margin, hasFarmgate }) => {
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
              Using forecasted price as reference. Actual buyer price may be different.
            </p>}
        </div>}
    </div>;
};
function makeCropId() {
  return `crop-${Date.now()}`;
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
    nextMilestone: phase === "growing" ? "Monitor crop conditions" : "Reassess market conditions",
    lastUpdated: "Just now",
    ...overrides
  };
}
const RecommendationResult = ({ data, onEdit }) => {
  const navigate = useNavigate();
  const { addCrop } = useCrops();
  const [saved, setSaved] = useState(null);
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
  const advisory = getAdvisory(data.commodity);
  const advisoryCfg = ADVISORY_CFG[advisory];
  const AdvisoryIcon = advisoryCfg.Icon;
  const hasFarmgate = data.useFarmgate && typeof data.farmgatePrice === "number" && data.farmgatePrice > 0;
  const farmgateNum = hasFarmgate ? data.farmgatePrice : null;
  const forecast = FORECAST_PRICES[data.commodity] ?? { mid: 70, lo: 65, hi: 75 };
  const sellingBasis = hasFarmgate ? data.farmgatePrice : forecast.mid;
  const priceBasisLabel = hasFarmgate ? "Based on estimated farmgate price" : "Based on forecasted market price";
  const priceBasisShort = hasFarmgate ? "Estimated farmgate price" : "Forecasted market price";
  const priceBasisDetail = hasFarmgate ? `Farmgate price: \u20B1${data.farmgatePrice}/kg` : `Forecasted price reference: \u20B1${forecast.lo}\u2013\u20B1${forecast.hi}/kg`;
  const margin = costToRecover !== null ? sellingBasis - costToRecover : null;
  const hasProfit = margin !== null && qty !== null && margin > 0;
  const profitLo = hasProfit ? Math.floor(margin * qty * 0.85 / 1e3) * 1e3 : 0;
  const profitHi = hasProfit ? Math.ceil(margin * qty * 1.1 / 1e3) * 1e3 : 0;
  const whyFactors = getWhyFactors(commodityName, data.commodity, costToRecover ?? 0, farmgateNum, advisory);
  const dirMap = {
    "Recommended": "rising",
    "Plant Conservatively": "stable",
    "Avoid for Now": "falling"
  };
  const priceDir = dirMap[advisory];
  const currentPx = CURRENT_PRICES[data.commodity] ?? 70;
  const fcast = forecast;
  const pricePoints = buildPricePoints(
    Array.from({ length: 7 }, (_, i) => ({
      label: i === 0 ? "7d ago" : i === 6 ? "Today" : `Day ${i + 1}`,
      price: Math.round(currentPx + (priceDir === "rising" ? -0.5 : priceDir === "falling" ? 0.5 : 0.1) * (6 - i) + Math.sin(i * 1.9) * 2)
    })),
    currentPx,
    priceDir,
    fcast.lo,
    fcast.hi,
    7
  );
  const priceTabData = {
    currentPrice: currentPx,
    previousPrice: Math.round(currentPx + (priceDir === "rising" ? -5 : priceDir === "falling" ? 5 : 0)),
    market: "Bangkerohan Retail",
    direction: priceDir,
    directionLabel: priceDir === "rising" ? "Price may rise" : priceDir === "falling" ? "Price may fall" : "Price likely stable",
    forecastRange: `\u20B1${fcast.lo}\u2013\u20B1${fcast.hi}/kg`,
    points: pricePoints,
    summary: whyFactors.find((f) => f.label === "Price")?.value ?? ""
  };
  const arrivalTabData = getArrivalData(data.commodity, whyFactors.find((f) => f.label === "Supply")?.value);
  const productionTabData = getProductionData(data.commodity, (/* @__PURE__ */ new Date()).getMonth());
  const weatherRisk = advisory === "Recommended" ? "low" : advisory === "Plant Conservatively" ? "moderate" : "high";
  const weatherTabData = getWeatherData(weatherRisk, displayName);
  const profitabilityData = costToRecover !== null && qty !== null ? {
    costPerKg: costToRecover,
    sellingPricePerKg: sellingBasis,
    profitPerKg: margin ?? 0,
    totalCost,
    harvestQty: qty,
    summary: hasProfit ? `At \u20B1${sellingBasis}/kg, you may earn around \u20B1${margin}/kg above your cost to recover. Total estimated profit: \u20B1${((margin ?? 0) * qty).toLocaleString("en-PH")}.` : `Current price may not cover your cost to recover. Consider revising your cost or waiting for better pricing.`
  } : void 0;
  const handleSavePlan = () => {
    addCrop(buildCropRecord(data, "planning"));
    setSaved("plan");
  };
  const handleConfirmPlanted = () => {
    addCrop(buildCropRecord(data, "growing", {
      plantingDate: plantedForm.actualPlantingDate || data.plantingDate,
      harvestDate: plantedForm.updatedHarvestDate || data.harvestDate,
      farmArea: typeof plantedForm.actualArea === "number" ? plantedForm.actualArea : typeof data.farmArea === "number" ? data.farmArea : 0
    }));
    setSaved("planted");
    setShowPlantedForm(false);
  };
  if (saved) {
    const lm = { plan: "saved as a crop plan", planted: "marked as planted and growing", "on-hold": "saved and put on hold" };
    return <div className="px-4 md:px-6 lg:px-8 py-5 md:py-8">
        <div className="max-w-lg mx-auto space-y-5">
          <div className="bg-[var(--hw-green-50)] border border-[var(--hw-green-400)] rounded-2xl p-5 text-center space-y-2">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-[var(--hw-green-700)] rounded-full"><Check className="w-6 h-6 text-white" /></div>
            </div>
            <p className="font-semibold text-[var(--hw-green-900)]">{displayName} has been {lm[saved]}.</p>
            <p className="text-sm text-[var(--hw-green-800)]">You can monitor and update it anytime in My Crops.</p>
          </div>
          <button
      onClick={() => navigate("/farmer/crops")}
      className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-[var(--hw-green-700)] text-white font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
    >
            Go to My Crops <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>;
  }
  if (showPlantedForm) {
    const inputCls = "w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition bg-white";
    return <div className="px-4 md:px-6 lg:px-8 py-5 md:py-8">
        <div className="max-w-lg mx-auto space-y-5">
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
      className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-[var(--hw-green-700)] text-white font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
    >
            <Sprout className="w-4 h-4" />Confirm — I planted this
          </button>
        </div>
      </div>;
  }
  return <div className="px-4 md:px-6 lg:px-8 py-5 md:py-8">
      <div className="max-w-lg mx-auto md:max-w-2xl space-y-4">

        <Breadcrumb items={[{ label: "Crop Assessment" }, { label: "Result" }]} />

        <button
    onClick={onEdit}
    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-900)] transition-colors"
  >
          <ChevronLeft className="w-4 h-4" />Edit information
        </button>

        {
    /* 1. Advisory card */
  }
        <div className={`bg-white rounded-2xl border shadow-[var(--shadow-xs)] p-4 space-y-3 ${advisoryCfg.border}`}>

          {
    /* Commodity header */
  }
          <div className="flex items-center gap-2.5">
            <CommodityIllustration commodityId={data.commodity} className="w-10 h-10 flex-shrink-0" />
            <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">{displayName}</p>
          </div>

          {
    /* Advisory level — prominent */
  }
          <div className={`flex items-center gap-2.5 ${advisoryCfg.color}`}>
            <AdvisoryIcon className={`w-7 h-7 flex-shrink-0 ${advisoryCfg.color}`} />
            <p className={`text-[28px] font-bold leading-tight ${advisoryCfg.color}`}>{advisory}</p>
          </div>

          {
    /* Explanation */
  }
          <div>
            <p className="text-[14px] text-[var(--hw-neutral-900)] leading-snug">
              {advisoryCfg.summary(displayName)}
            </p>
            <p className={`text-[13px] font-medium mt-1 ${advisoryCfg.color}`}>
              {advisoryCfg.support}
            </p>
            <button
    onClick={() => {
      const pageState = {
        title: `${displayName} \u2014 Detailed Factors`,
        subtitle: `Assessment result \xB7 ${advisory}`,
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

          {
    /* Date chips */
  }
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

          <p className="text-[12px] text-[var(--hw-neutral-900)]">Based on available market data · Jul 11, 2026</p>
        </div>

        {
    /* 2. Estimated Profit card */
  }
        {hasProfit && qty && margin !== null && costToRecover !== null && <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">Estimated Profit</p>

            <p className="text-[20px] font-bold text-emerald-700 leading-none">
              ₱{profitLo.toLocaleString("en-PH")} – ₱{profitHi.toLocaleString("en-PH")}
            </p>

            <div className="space-y-0.5">
              <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{priceBasisLabel}</p>
              <p className="text-[13px] text-[var(--hw-neutral-900)]">{priceBasisDetail}</p>
              {!hasFarmgate && <p className="text-[12px] text-[var(--hw-neutral-900)]">
                  Price may still change before harvest. Update this as harvest gets closer.
                </p>}
            </div>

            <ProfitCalcAccordion
    qty={qty}
    totalCost={totalCost}
    costToRecover={costToRecover}
    sellingBasis={sellingBasis}
    priceBasisShort={priceBasisShort}
    margin={margin}
    hasFarmgate={hasFarmgate}
  />

            {
    /* Supporting values */
  }
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] pt-1 border-t border-[var(--hw-neutral-100)]">
              <div>
                <p className="text-[var(--hw-neutral-900)]">Estimated cost</p>
                <p className="font-medium text-[var(--hw-neutral-900)]">{formatPeso(totalCost)}</p>
              </div>
              <div>
                <p className="text-[var(--hw-neutral-900)]">Expected harvest</p>
                <p className="font-medium text-[var(--hw-neutral-900)]">{qty} kg</p>
              </div>
              <div>
                <p className="text-[var(--hw-neutral-900)]">Price basis</p>
                <p className="font-medium text-[var(--hw-neutral-900)]">₱{sellingBasis}/kg</p>
              </div>
              <div>
                <p className="text-[var(--hw-neutral-900)]">Cost to recover</p>
                <p className="font-medium text-[var(--hw-neutral-900)]">₱{costToRecover}/kg</p>
              </div>
              <div className="col-span-2">
                <p className="text-[var(--hw-neutral-900)]">Estimated farmgate price</p>
                {hasFarmgate ? <p className="font-medium text-[var(--hw-neutral-900)]">₱{data.farmgatePrice}/kg</p> : <p className="text-[var(--hw-neutral-900)] italic">Not set — using market price as reference.</p>}
              </div>
            </div>

            <p className="text-[12px] text-[var(--hw-neutral-900)]">Estimate only. Actual income may change.</p>
          </div>}

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
          <button
    onClick={handleSavePlan}
    className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-[var(--hw-green-700)] text-white font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
  >
            <Save className="w-4 h-4" />Save to My Crops
          </button>
          <button
    onClick={() => setShowPlantedForm(true)}
    className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-white text-[var(--hw-green-700)] font-medium rounded-xl border border-[var(--hw-green-400)] hover:bg-[var(--hw-green-50)] transition-colors"
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

      </div>
    </div>;
};
export {
  RecommendationResult
};
