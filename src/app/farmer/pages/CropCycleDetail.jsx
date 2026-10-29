import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Pencil,
  CheckCircle2,
  AlertCircle,
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
  Package,
  Leaf,
  PauseCircle,
  Droplets,
  Tractor,
  Eye,
  Scale,
  PhilippinePeso,
  Clock,
  RefreshCw
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { formatLocalDate, useCrops } from "../components/crops/CropsContext";
import { PhasePill } from "../components/crops/CropCard";
import { UpdatePhaseDrawer } from "../components/crops/UpdatePhaseDrawer";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { formatPeso } from "../components/crops/types";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import { WeatherLocationBanner } from "../components/shared/WeatherLocationBanner";
import { apiPost, apiPut, parseResponse } from "../../global/api";
import {
  ADVISORY_CODES,
  PHASE_CODES,
  normalizeAdvisoryCode,
  normalizePhaseCode,
  normalizeWeatherSuitability,
} from "../utils/farmerCodes";
import {
  composeAdvisorySummary,
  composeAdvisoryBadge,
  composeAdvisoryAction,
  composeImmediateActions,
  composeWeeklyActions,
  renderComposedMessage,
  normalizeLifecycleStage,
} from "../utils/advisoryMessageComposer";
import {
  composeAdvisoryReasons,
  pickUsablePriceOutlook,
  resolveMainFactor,
} from "../utils/advisoryReasons";
import { resolveFactorCondition } from "../utils/factorColors";
import * as analyticsApi from "../../../services/api/analyticsApi";
import { buildWeatherRiskAnalysis } from "../../global/utils/weatherRiskAnalysis";

function quarterForDate(value) {
  const month = new Date(value || Date.now()).getMonth();
  return `Q${Math.floor(month / 3) + 1}`;
}

const ADVISORY_CFG = {
  recommended: { Icon: CheckCircle2, color: "text-emerald-700", border: "border-[var(--hw-neutral-200)]" },
  proceed_with_caution: { Icon: AlertTriangle, color: "text-amber-700", border: "border-[var(--hw-neutral-200)]" },
  caution: { Icon: AlertTriangle, color: "text-amber-700", border: "border-[var(--hw-neutral-200)]" },
  avoid_for_now: { Icon: AlertOctagon, color: "text-red-700", border: "border-[var(--hw-neutral-200)]" },
  avoid: { Icon: AlertOctagon, color: "text-red-700", border: "border-[var(--hw-neutral-200)]" },
  high_risk: { Icon: AlertOctagon, color: "text-red-700", border: "border-[var(--hw-neutral-200)]" },
};

function getLocalDateInputValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function resolveWeeklyActionIcon(action) {
  if (action?.Icon) return action.Icon;
  const factor = action?.factor;
  if (factor === 'weather_risk' || action?.key?.includes('weather')) return CloudRain;
  if (factor === 'price_outlook' || action?.key?.includes('price')) return TrendingUp;
  if (factor === 'profitability' || action?.key?.includes('profit')) return PhilippinePeso;
  if (factor === 'arrival_pressure' || factor === 'supply' || action?.key?.includes('arrival')) return Tractor;
  if (factor === 'historical_seasonal_production_level' || action?.key?.includes('production')) return Scale;
  if (action?.key?.includes('cost') || action?.key?.includes('growing_2')) return Plus;
  if (action?.key?.includes('drainage') || action?.key?.includes('rain') || action?.key?.includes('harvested_2')) return Droplets;
  if (action?.key?.includes('completed_1') || action?.key?.includes('harvested_3')) return Scale;
  if (action?.key?.includes('completed_3')) return Sprout;
  if (action?.key?.includes('on_hold_1')) return Eye;
  return Sprout;
}

function renderFactorIcon(iconType, colorClass) {
  if (iconType === "price") {
    return <span className={`w-5 h-5 flex items-center justify-center font-bold text-[17px] leading-none flex-shrink-0 mt-0.5 ${colorClass}`}>₱</span>;
  }
  if (iconType === "supply") return <Package className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colorClass}`} />;
  if (iconType === "production") return <Leaf className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colorClass}`} />;
  if (iconType === "weather") return <CloudRain className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colorClass}`} />;
  return <TrendingUp className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colorClass}`} />;
}

const ProfitCalcAccordion = ({
  qty,
  totalCost,
  sellingBasis,
  costToRecover,
  hasFarmgate,
  margin
}) => {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  return <div className="border border-[var(--hw-neutral-200)] rounded-xl overflow-hidden">
      <button
    onClick={() => setOpen((v) => !v)}
    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-[var(--hw-neutral-50)] transition-colors text-left bg-[var(--hw-neutral-50)]"
  >
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">
          {t("farmer.factors.profitability.calc_accordion_title", {}, "How was this calculated?")}
        </p>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-[var(--hw-neutral-400)] flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--hw-neutral-400)] flex-shrink-0" />}
      </button>
      {open && <div className="px-3 py-3 space-y-1.5 border-t border-[var(--hw-neutral-200)] bg-white">
          {[
    { label: t("farmer.factors.profitability.expected_harvest", {}, "Expected harvest"), value: `${qty} kg` },
    { label: t("farmer.factors.profitability.estimated_cost", {}, "Estimated cost"), value: formatPeso(totalCost) },
    { label: hasFarmgate ? t("farmer.factors.profitability.farmgate_price_label", {}, "Farmgate price") : t("farmer.factors.profitability.market_price_reference", {}, "Market price reference"), value: `₱${Number(sellingBasis).toFixed(2)}/kg` },
    { label: t("farmer.factors.profitability.cost_to_recover", {}, "Cost to recover"), value: `₱${costToRecover}/kg` },
    { label: `${t("farmer.factors.profitability.estimated_profit_per_kg_label", {}, "Profit per kg")} (₱${Number(sellingBasis).toFixed(2)} − ₱${costToRecover})`, value: `₱${margin}/kg`, bold: true }
  ].map((r) => <div key={r.label} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="text-[var(--hw-neutral-900)]">{r.label}</span>
              <span className={r.bold ? "font-bold text-emerald-700" : "font-medium text-[var(--hw-neutral-900)]"}>{r.value}</span>
            </div>)}
          {!hasFarmgate && <p className="text-[12px] text-[var(--hw-neutral-900)] italic pt-1 border-t border-[var(--hw-neutral-100)]">
              {t("farmer.factors.profitability.forecast_reference_notice", {}, "Using market price as reference. Actual buyer price may be different.")}
            </p>}
        </div>}
    </div>;
};

function formatHoldReason(reason, t) {
  if (!reason) return "-";
  if (!t) return reason;
  const lower = String(reason).toLowerCase();
  if (lower.includes("market") || lower.includes("palengke")) {
    return t("farmer.cropCycle.hold_reason_market", {}, "Naghulat nga moayo ang kondisyon sa palengke");
  }
  if (lower.includes("weather") || lower.includes("panahon")) {
    return t("farmer.cropCycle.hold_reason_weather", {}, "Kondisyon sa panahon");
  }
  if (lower.includes("budget") || lower.includes("input")) {
    return t("farmer.cropCycle.hold_reason_budget", {}, "Kulang ang budget o materyales");
  }
  if (lower.includes("seed") || lower.includes("binhi") || lower.includes("material")) {
    return t("farmer.cropCycle.hold_reason_seed", {}, "Wala pa available ang binhi o materyales");
  }
  if (lower.includes("labor") || lower.includes("trabahador") || lower.includes("land") || lower.includes("yuta")) {
    return t("farmer.cropCycle.hold_reason_labor", {}, "Wala pa available ang trabahador o yuta");
  }
  if (lower.includes("time") || lower.includes("reassess") || lower.includes("panahon para")) {
    return t("farmer.cropCycle.hold_reason_time", {}, "Kinahanglan pa og panahon para susihon pag-usab");
  }
  if (lower.includes("other") || lower.includes("laing")) {
    return t("farmer.cropCycle.hold_reason_other", {}, "Laing rason");
  }
  return reason;
}

function formatClassification(val, t) {
  if (!val || typeof val !== "string") return val;
  const lower = val.trim().toLowerCase().replace(/[\s-]/g, "_");
  if (lower === "favorable") return t ? t("farmer.calendar.factors.price_level_favorable", {}, "Favorable") : "Favorable";
  if (lower === "neutral") return t ? t("farmer.calendar.factors.price_level_neutral", {}, "Neutral") : "Neutral";
  if (lower === "unfavorable") return t ? t("farmer.calendar.factors.price_level_unfavorable", {}, "Unfavorable") : "Unfavorable";
  if (lower === "low") return t ? t("farmer.factors.arrival.low", {}, "Low") : "Low";
  if (lower === "lower_middle") return t ? t("farmer.factors.arrival.lower_middle", {}, "Lower Middle") : "Lower Middle";
  if (lower === "upper_middle") return t ? t("farmer.factors.arrival.upper_middle", {}, "Upper Middle") : "Upper Middle";
  if (lower === "high") return t ? t("farmer.factors.arrival.high", {}, "High") : "High";
  if (lower === "suitable") return t ? t("farmer.factors.weather.suitable", {}, "Suitable") : "Suitable";
  if (lower === "caution") return t ? t("farmer.factors.weather.caution", {}, "Caution") : "Caution";
  if (lower === "severe") return t ? t("farmer.factors.weather.severe", {}, "Severe") : "Severe";
  return val.charAt(0).toUpperCase() + val.slice(1);
}

function CropCycleDetailPage() {
  const { cropId } = useParams();
  const navigate = useNavigate();
  const { t, langCode } = useLanguage();
  const { crops, updateCrop, updateCropStatusApi, addCostApi, logHarvestApi, saveHarvestRecordApi, refreshCrops } = useCrops();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("update-phase");
  const [addCostOpen, setAddCostOpen] = useState(false);
  const [additionalCostCategory, setAdditionalCostCategory] = useState("Others");
  const [additionalCost, setAdditionalCost] = useState("");
  const [isSubmittingCost, setIsSubmittingCost] = useState(false);
  const [addedCostsExpanded, setAddedCostsExpanded] = useState(true);
  const [advisoryExpanded, setAdvisoryExpanded] = useState(true);
  const [whyExpanded, setWhyExpanded] = useState(false);
  const [editFarmgate, setEditFarmgate] = useState(false);
  const [farmgateDraft, setFarmgateDraft] = useState("");
  const [actionError, setActionError] = useState(null);
  const crop = crops.find((c) => c.id === cropId);
  const [farmgatePrice, setFarmgatePrice] = useState(() =>
    crop?.farmgatePrice != null && crop.farmgatePrice > 0 ? crop.farmgatePrice : ""
  );
  useEffect(() => {
    if (crop?.farmgatePrice != null && crop.farmgatePrice > 0 && farmgatePrice === "") {
      setFarmgatePrice(crop.farmgatePrice);
    }
  }, [crop?.id, crop?.farmgatePrice]);

  const [harvestEntryDate, setHarvestEntryDate] = useState(() => getLocalDateInputValue());
  const [harvestEntryQty, setHarvestEntryQty] = useState("");
  const [harvestEntryPrice, setHarvestEntryPrice] = useState("");
  const [isSavingHarvestEntry, setIsSavingHarvestEntry] = useState(false);

  const expectedTotalVolume = Number(crop?.harvestQuantity ?? crop?.expectedHarvestQty ?? 0);
  const savedHarvestProgress = Array.isArray(crop?.harvestRecords) && crop.harvestRecords.length > 0
    ? crop.harvestRecords.reduce((sum, record) => {
        const q = record.actualHarvestQty ?? record.actual_harvest_qty;
        return sum + (q != null && !isNaN(Number(q)) ? Number(q) : 0);
      }, 0)
    : 0;
  const parsedHarvestEntry = harvestEntryQty !== "" && !isNaN(Number(harvestEntryQty))
    ? Number(harvestEntryQty)
    : 0;
  const parsedHarvestPrice = harvestEntryPrice !== "" && !isNaN(Number(harvestEntryPrice))
    ? Number(harvestEntryPrice)
    : null;
  const remainingExpected = expectedTotalVolume > 0
    ? Math.max(0, expectedTotalVolume - savedHarvestProgress)
    : "";
  const isExceedingRemaining = expectedTotalVolume > 0 && parsedHarvestEntry > (expectedTotalVolume - savedHarvestProgress);
  if (!crop) {
    return <div className="px-4 py-8 text-center">
        <p className="text-[var(--hw-neutral-900)]">{t ? t("farmer.empty.crop_not_found") : "Crop not found."}</p>
        <button onClick={() => navigate("/farmer/crops")} className="mt-3 text-sm font-medium text-[var(--hw-green-700)]">
          {t("farmer.crops.title", {}, "Go to My Crops")}
        </button>
      </div>;
  }

  const handleSaveHarvestEntry = async () => {
    const quantity = Number(harvestEntryQty);
    if (
      !harvestEntryDate
      || !Number.isFinite(quantity)
      || quantity <= 0
      || (expectedTotalVolume > 0 && quantity > remainingExpected)
      || parsedHarvestPrice == null
      || !Number.isFinite(parsedHarvestPrice)
      || parsedHarvestPrice < 0
    ) {
      if (expectedTotalVolume > 0 && quantity > remainingExpected) {
        setActionError(
          t(
            "farmer.cropCycle.harvest_exceeds_remaining",
            { max: remainingExpected },
            `Harvest quantity cannot exceed remaining yield (${remainingExpected} kg).`
          )
        );
      }
      return;
    }

    setIsSavingHarvestEntry(true);
    setActionError(null);
    try {
      const savedRec = await saveHarvestRecordApi(crop.id, harvestEntryDate, quantity, parsedHarvestPrice);
      const rawQty = savedRec?.actualHarvestQty ?? savedRec?.actual_harvest_qty;
      const rawPrice = savedRec?.actualSellingPricePerKg ?? savedRec?.actual_selling_price_per_kg;
      const newRecord = {
        id: savedRec?.id || `HVR-${Date.now()}`,
        actualHarvestDate: savedRec?.actualHarvestDate || savedRec?.actual_harvest_date || harvestEntryDate,
        actualHarvestQty: rawQty != null && !isNaN(Number(rawQty)) ? Number(rawQty) : quantity,
        actualSellingPricePerKg: rawPrice != null && !isNaN(Number(rawPrice))
          ? Number(rawPrice)
          : parsedHarvestPrice,
      };
      const existing = (crop.harvestRecords || []).filter((r) => r.id !== newRecord.id);
      const updatedRecords = [newRecord, ...existing];
      const newSavedProgress = updatedRecords.reduce((sum, r) => {
        const q = r.actualHarvestQty ?? r.actual_harvest_qty;
        return sum + (q != null && !isNaN(Number(q)) ? Number(q) : 0);
      }, 0);
      updateCrop(crop.id, {
        harvestRecords: updatedRecords,
        actualHarvestQty: newSavedProgress,
      });
      setHarvestEntryQty("");
      setHarvestEntryPrice("");
      setHarvestEntryDate(getLocalDateInputValue());
    } catch (err) {
      setActionError(err.message || "Failed to save harvest entry. Please try again.");
    } finally {
      setIsSavingHarvestEntry(false);
    }
  };

  const isDraftCrop = crop.phase === "draft" || crop.status === "Draft";
  if (isDraftCrop) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-8 max-w-3xl mx-auto space-y-6">
        <Breadcrumb
          crumbs={[
            { label: t("farmer.crops.title", {}, "My Crops"), to: "/farmer/crops" },
            { label: crop.commodityName || "Draft" },
          ]}
        />
        <div className="bg-white border border-[var(--hw-neutral-200)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[var(--hw-neutral-900)]">
                {t("farmer.draft.incomplete_title", {}, "Assessment Draft – Incomplete")}
              </h2>
              <p className="text-sm text-[var(--hw-neutral-600)]">
                {t(
                  "farmer.draft.incomplete_desc",
                  {},
                  "This crop assessment is saved as a draft. Step 1 has not been submitted yet, and this crop is not yet active in your farm plan."
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => navigate(`/farmer/assess?resumeDraft=${crop.id}`)}
              className="px-5 py-2.5 bg-[var(--hw-green-700)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--hw-green-800)] transition-colors shadow-sm"
            >
              {t("farmer.draft.continue_btn", {}, "Review & continue Step 1")}
            </button>
            <button
              onClick={() => navigate("/farmer/crops")}
              className="px-4 py-2.5 bg-white border border-[var(--hw-neutral-300)] text-sm font-medium text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)]"
            >
              {t("common.back_to_crops", {}, "Back to My Crops")}
            </button>
          </div>
        </div>
      </div>
    );
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
        const isComp = targetStatus === "Completed";
        const addCostNum = action.fields?.additionalCost != null && action.fields?.additionalCost !== ""
          ? Number(action.fields.additionalCost)
          : (action.fields?.updatedTotalCost != null && action.fields?.updatedTotalCost !== "" ? Number(action.fields.updatedTotalCost) : 0);
        const actualHarvestQtyVal = action.fields?.actualHarvestedQty != null && action.fields?.actualHarvestedQty !== ""
          ? Number(action.fields.actualHarvestedQty)
          : null;
        const actualHarvestDateVal = action.fields?.actualHarvestDate || new Date().toISOString().split("T")[0];

        const compDate = action.fields?.completionDate || action.fields?.actualHarvestDate || new Date().toISOString().split('T')[0];
        const finalQty = action.fields?.finalQtySold != null && action.fields?.finalQtySold !== ""
          ? Number(action.fields.finalQtySold)
          : (actualHarvestQtyVal ?? crop.actualHarvestQty ?? crop.harvestQuantity ?? 0);
        const avgPrice = action.fields?.avgSellingPrice != null && action.fields?.avgSellingPrice !== ""
          ? Number(action.fields.avgSellingPrice)
          : (crop.actualSellingPrice ?? null);
        const finalCost = action.fields?.finalProductionCost != null && action.fields?.finalProductionCost !== ""
          ? Number(action.fields.finalProductionCost)
          : (crop.totalCost || 0);
        const notesText = action.fields?.notes ? String(action.fields.notes).trim() : null;

        if (isComp) {
          if (finalQty > 0) {
            await logHarvestApi(crop.id, compDate, finalQty, avgPrice, {
              finalProductionCost: finalCost,
              notes: notesText,
            });
          } else {
            await updateCropStatusApi(crop.id, "Completed", null, {
              actualHarvestDate: compDate,
              actualHarvestQty: finalQty > 0 ? finalQty : undefined,
              actualSellingPricePerKg: avgPrice != null ? avgPrice : undefined,
              finalProductionCost: finalCost,
              notes: notesText,
            });
          }
        } else {
          const isTransitionToHarvesting = targetStatus === "Harvesting" || action.phase === "harvested";
          await updateCropStatusApi(crop.id, targetStatus, null, {
            additionalCost: addCostNum > 0 ? addCostNum : undefined,
            actualHarvestQty: isTransitionToHarvesting ? undefined : actualHarvestQtyVal,
            actualHarvestDate: actualHarvestDateVal,
          });
          if (addCostNum > 0) {
            try {
              await addCostApi(crop.id, {
                category: "Additional",
                amount: addCostNum,
                costType: "additional",
              });
            } catch {
              // Already saved via updateCropStatusApi
            }
          }
        }

        const newAddedCosts = (crop.addedCosts || 0) + (addCostNum > 0 ? addCostNum : 0);
        const initialC = crop.initialCost != null ? crop.initialCost : Math.max(0, (crop.totalCost || 0) - (crop.addedCosts || 0));
        const newTotalCost = initialC + newAddedCosts;
        const cropYield = crop.harvestQuantity || crop.expectedHarvestQty || 1;
        const newBreakEven = cropYield > 0 ? Math.ceil(newTotalCost / cropYield) : crop.breakEvenPrice;

        updateCrop(crop.id, {
          phase: action.phase,
          status: targetStatus,
          lastUpdated: "Just now",
          isOnHold: false,
          ...(isComp ? {
            totalCost: finalCost,
            productionCost: finalCost,
            actualHarvestQty: finalQty > 0 ? finalQty : (crop.actualHarvestQty ?? crop.harvestQuantity),
            harvestQuantity: finalQty > 0 ? finalQty : crop.harvestQuantity,
            actualSellingPrice: avgPrice != null ? avgPrice : crop.actualSellingPrice,
            sellingPrice: avgPrice != null ? avgPrice : crop.actualSellingPrice,
            actualHarvestDate: compDate,
            harvestDate: compDate,
            ...(notesText ? { notes: notesText } : {}),
          } : {
            ...(addCostNum > 0 ? {
              addedCosts: newAddedCosts,
              totalCost: newTotalCost,
              productionCost: newTotalCost,
              breakEvenPrice: newBreakEven,
              breakevenPricePerKg: newBreakEven,
            } : {}),
            ...(isTransitionToHarvesting ? {
              harvestQuantity: crop.harvestQuantity || crop.expectedHarvestQty,
              expectedHarvestQty: crop.harvestQuantity || crop.expectedHarvestQty,
              actualHarvestQty: Array.isArray(crop.harvestRecords) && crop.harvestRecords.length > 0
                ? crop.harvestRecords.reduce((sum, r) => sum + Number(r.actualHarvestQty || 0), 0)
                : 0,
            } : (actualHarvestQtyVal != null ? {
              actualHarvestQty: actualHarvestQtyVal,
              partialHarvestQty: actualHarvestQtyVal,
            } : {})),
            ...(action.fields?.actualPlantingDate ? { plantingDate: action.fields.actualPlantingDate } : {}),
            ...(action.fields?.updatedHarvestDate ? { harvestDate: action.fields.updatedHarvestDate } : {}),
            ...(action.fields?.actualPlantedArea != null && action.fields?.actualPlantedArea !== "" ? { farmArea: Number(action.fields.actualPlantedArea) } : {}),
            ...(action.fields?.expectedHarvestQty != null && action.fields?.expectedHarvestQty !== "" ? { harvestQuantity: Number(action.fields.expectedHarvestQty) } : {})
          })
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
        const resumeStatus = statusMap[crop.phase] || (crop.plantingDate ? "Planted" : "Planning");
        await updateCropStatusApi(crop.id, resumeStatus);
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

  const handleAddCostSubmit = async () => {
    const val = Number(additionalCost);
    if (!val || val <= 0 || isNaN(val)) return;
    setIsSubmittingCost(true);
    setActionError(null);
    try {
      await addCostApi(crop.id, {
        category: additionalCostCategory || "Others",
        amount: val,
        costType: "additional",
      });
      setAdditionalCostCategory("Others");
      setAdditionalCost("");
      setAddCostOpen(false);
    } catch (err) {
      setActionError(err.message || "Failed to add cost. Please try again.");
    } finally {
      setIsSubmittingCost(false);
    }
  };

  const totalCost = crop.totalCost || 0;
  const initialCost = crop.initialCost != null ? crop.initialCost : Math.max(0, totalCost - (crop.addedCosts || 0));
  const addedCosts = crop.addedCosts || 0;
  const qty = crop.harvestQuantity > 0 ? crop.harvestQuantity : 1;
  const costToRecover = crop.breakEvenPrice || (totalCost > 0 && qty > 0 ? Math.ceil(totalCost / qty) : 0);
  const additionalCostsList = (crop.productionCosts || []).filter(
    (c) => c.costType === "additional"
  );

  // Real backend advisory query from existing POST /api/v1/advisory/plan
  const canQueryPlan = Boolean(crop.commodityName && crop.plantingDate && crop.harvestDate && totalCost > 0 && qty > 0);
  const commodityIdentifier = crop.commodityId || (typeof crop.commodity === "string" ? crop.commodity : crop.commodity?.id) || crop.commodityName;
  const phaseCode = normalizePhaseCode(crop.phase) || normalizePhaseCode(crop.status);
  const explicitStage = (crop.phase || crop.status) ? (
    (crop.phase || crop.status).toLowerCase().includes("plan") ? "before_planting" :
    (crop.phase || crop.status).toLowerCase().includes("grow") || (crop.phase || crop.status).toLowerCase().includes("plant") ? "during_planting" :
    (crop.phase || crop.status).toLowerCase().includes("pre") ? "near_harvest" :
    (crop.phase || crop.status).toLowerCase().includes("harvest") ? "harvest" : null
  ) : null;


  const pDate = crop.plantingDate ? new Date(crop.plantingDate) : null;
  const hDate = crop.harvestDate ? new Date(crop.harvestDate) : null;
  const pDateStr = crop.rawPlantingDate || (pDate && !isNaN(pDate.getTime()) ? pDate.toISOString().split("T")[0] : crop.plantingDate);
  const hDateStr = crop.rawHarvestDate || (hDate && !isNaN(hDate.getTime()) ? hDate.toISOString().split("T")[0] : crop.harvestDate);

  const { data: planAdvisoryData, error: planAdvisoryError } = useQuery({
    queryKey: ["advisory", "plan", "v2", crop.id, crop.commodityName, pDateStr, hDateStr, totalCost, qty, explicitStage],
    queryFn: async () => {
      const payload = {
        crop_name: crop.commodityName,
        planting_date: pDateStr,
        expected_harvest_date: hDateStr,
        total_production_cost: totalCost,
        expected_yield_kg: qty,
        estimated_selling_price: crop.farmgatePrice > 0 ? crop.farmgatePrice : undefined,
        crop_stage: explicitStage,
      };
      const res = await apiPost("/advisory/plan", payload);
      if (!res.ok) {
        let detail = `Advisory request failed (${res.status}).`;
        try {
          const errorBody = await res.json();
          if (typeof errorBody?.detail === "string") detail = errorBody.detail;
        } catch {
          // Keep the status-based message when the server does not return JSON.
        }
        throw new Error(detail);
      }
      return await parseResponse(res);
    },
    enabled: canQueryPlan,
    staleTime: 1000 * 60 * 15,
  });

  const arrivalFallbackQuery = useQuery({
    queryKey: ["farmer", "arrival-pressure", commodityIdentifier],
    queryFn: () => analyticsApi.getArrivalPressure(commodityIdentifier),
    enabled: Boolean(!canQueryPlan && commodityIdentifier),
    staleTime: 1000 * 60 * 5,
  });
  const productionFallbackQuery = useQuery({
    queryKey: ["farmer", "seasonal-production", commodityIdentifier, quarterForDate(crop.harvestDate || crop.plantingDate)],
    queryFn: () => analyticsApi.getHistoricalSeasonalProduction(
      commodityIdentifier,
      quarterForDate(crop.harvestDate || crop.plantingDate)
    ),
    enabled: Boolean(!canQueryPlan && commodityIdentifier),
    staleTime: 1000 * 60 * 30,
  });
  const weatherFallbackQuery = useQuery({
    queryKey: ["farmer", "admin-weather-forecast", 14],
    queryFn: () => analyticsApi.getWeatherForecast(14),
    enabled: !canQueryPlan,
    staleTime: 1000 * 60 * 30,
  });
  const weatherRulesFallbackQuery = useQuery({
    queryKey: ["farmer", "weather-rules", commodityIdentifier],
    queryFn: () => analyticsApi.listWeatherRules(commodityIdentifier),
    enabled: Boolean(!canQueryPlan && commodityIdentifier),
    staleTime: 1000 * 60 * 30,
  });
  const priceFallbackQuery = useQuery({
    queryKey: ["farmer", "price-outlook", commodityIdentifier, "bangkerohan_retail", explicitStage, pDateStr, hDateStr],
    queryFn: () => analyticsApi.getPriceOutlook(
      commodityIdentifier,
      "bangkerohan_retail",
      14,
      {
        cropStage: explicitStage,
        plantingDate: pDateStr,
        harvestDate: hDateStr,
      }
    ),
    enabled: Boolean(!canQueryPlan && commodityIdentifier),
    staleTime: 1000 * 60 * 15,
  });

  const currentPrice = crop.currentPrice || planAdvisoryData?.module_results?.recent_average_price || null;
  const forecastLo = crop.forecastLower || planAdvisoryData?.module_results?.lower_forecast_price || null;
  const forecastHi = crop.forecastUpper || planAdvisoryData?.module_results?.upper_forecast_price || null;
  const forecastMid = forecastLo != null && forecastHi != null ? (forecastLo + forecastHi) / 2 : (planAdvisoryData?.module_results?.forecast_midpoint || null);
  const stageRef = planAdvisoryData?.module_results?.reference_price;
  const hasFarmgate = typeof farmgatePrice === "number" && farmgatePrice > 0;
  const isHarvestingPhase = phaseCode === PHASE_CODES.HARVESTED || (crop.status || "").toLowerCase().includes("harvest") || (crop.phase || "").toLowerCase().includes("harvest");
  const currentCropStage = isHarvestingPhase ? "harvest" : (explicitStage || planAdvisoryData?.crop_stage || "before_planting");
  const isPlanning = currentCropStage === "before_planting" || phaseCode === PHASE_CODES.PLANNING;
  const useForecast = !isPlanning && (
    [PHASE_CODES.GROWING, PHASE_CODES.PRE_HARVEST, PHASE_CODES.ON_HOLD].includes(phaseCode) ||
    currentCropStage === "near_harvest"
  );
  const basePrice = hasFarmgate
    ? farmgatePrice
    : (isPlanning
        ? (stageRef || currentPrice)
        : (useForecast ? (stageRef || forecastMid || currentPrice) : currentPrice));
  const sellingBasis = basePrice;
  const priceBasisLabel = hasFarmgate
    ? t("farmer.factors.profitability.based_on_farmgate", {}, "Based on estimated farmgate price")
    : isPlanning
    ? t("farmer.factors.profitability.based_on_seasonal", {}, "Based on historical seasonal price")
    : useForecast
    ? t("farmer.factors.profitability.based_on_forecast_market", {}, "Based on forecasted market price")
    : t("farmer.factors.profitability.based_on_current_market", {}, "Based on current market price");
  const priceBasisDetail = hasFarmgate
    ? `${t("farmer.factors.profitability.estimated_farmgate", {}, "Farmgate price")}: ₱${farmgatePrice}/kg`
    : (stageRef != null)
    ? `${t("farmer.factors.price.reference_price_label", {}, "Reference price")}: ₱${stageRef.toFixed(2)}/kg`
    : (forecastLo != null && forecastHi != null
        ? `${t("farmer.factors.profitability.forecast_price_reference", {}, "Forecasted price reference")}: ₱${forecastLo}–₱${forecastHi}/kg`
        : (currentPrice != null
            ? `${t("farmer.factors.profitability.price_basis", {}, "Price basis")}: ₱${currentPrice}/kg`
            : `${t("farmer.factors.profitability.price_basis", {}, "Price basis")}: ${t("farmer.advisory.not_available", {}, "Not available")}`));
  const margin = sellingBasis != null && costToRecover > 0 ? sellingBasis - costToRecover : null;
  const profitLo = margin != null ? Math.max(0, Math.floor(margin * qty * 0.85 / 1e3) * 1e3) : 0;
  const profitHi = margin != null ? Math.ceil(margin * qty * 1.1 / 1e3) * 1e3 : 0;
  const rawAdvisory = planAdvisoryData?.advisory?.advisory || crop.advisoryCategory;
  const advisoryCode = normalizeAdvisoryCode(rawAdvisory) || ADVISORY_CODES.RECOMMENDED;
  const badge = composeAdvisoryBadge(advisoryCode, currentCropStage);
  const advisoryCfg = ADVISORY_CFG[badge.type] || ADVISORY_CFG[advisoryCode] || ADVISORY_CFG.recommended;
  const AdvisoryIcon = advisoryCfg?.Icon;
  const advisoryLabel = advisoryCode ? t(badge.key) : t("farmer.advisory.not_available");

  const cropDisplayName = crop.variant ? `${crop.commodityName} (${crop.variant})` : crop.commodityName;
  const composedSummary = composeAdvisorySummary(advisoryCode, currentCropStage, cropDisplayName);
  const summaryText = renderComposedMessage(composedSummary, langCode);
  const immediateActions = composeImmediateActions({
    advisoryCode,
    cropStage: currentCropStage,
    moduleResults: planAdvisoryData?.module_results,
    cropName: cropDisplayName,
    contributions: planAdvisoryData?.advisory?.module_contributions,
    vetoes: planAdvisoryData?.advisory?.hard_vetoes,
    actionGuidance: planAdvisoryData?.advisory?.action_guidance,
    hasFarmgate,
  });
  const composedAction = immediateActions[0] || composeAdvisoryAction(
    advisoryCode,
    currentCropStage,
    planAdvisoryData?.module_results,
    cropDisplayName,
    {
      contributions: planAdvisoryData?.advisory?.module_contributions,
      vetoes: planAdvisoryData?.advisory?.hard_vetoes,
      actionGuidance: planAdvisoryData?.advisory?.action_guidance,
      hasFarmgate,
    }
  );
  const displayImmediateActions = immediateActions.length > 0 ? immediateActions.slice(0, 2) : [composedAction].filter(Boolean);

  const weeklyActions = composeWeeklyActions({
    cropStage: currentCropStage,
    phaseCode,
    moduleResults: planAdvisoryData?.module_results,
    contributions: planAdvisoryData?.advisory?.module_contributions,
    vetoes: planAdvisoryData?.advisory?.hard_vetoes,
    cropName: cropDisplayName,
    actionGuidance: planAdvisoryData?.advisory?.action_guidance,
    immediateAction: displayImmediateActions[0] || composedAction,
    isOnHold: crop.isOnHold,
  });
  const fallbackWeather = buildWeatherRiskAnalysis({
    weatherForecast: weatherFallbackQuery.data,
    weatherRules: weatherRulesFallbackQuery.data?.items || [],
    commodityName: crop.commodityName,
    weatherLoading: weatherFallbackQuery.isLoading || weatherRulesFallbackQuery.isLoading,
    weatherError: weatherFallbackQuery.error?.message || weatherRulesFallbackQuery.error?.message || "",
    lang: langCode,
  });
  const fallbackArrival = arrivalFallbackQuery.data;
  const fallbackProduction = productionFallbackQuery.data;
  const fallbackProductionProfile = fallbackProduction?.quarterly_profiles?.find(
    (profile) => profile.quarter === quarterForDate(crop.harvestDate || crop.plantingDate)
  );
  const fallbackPrice = priceFallbackQuery.data || {};
  const advisoryModuleResults = planAdvisoryData?.module_results || planAdvisoryData?.moduleResults || {};
  const hasEligibleForecast = Boolean(
    advisoryModuleResults.has_eligible_forecast || fallbackPrice.has_eligible_forecast
  );
  const planningPriceOutlook = pickUsablePriceOutlook(
    advisoryModuleResults.historical_price_outlook,
    fallbackPrice.historical_price_outlook,
    advisoryModuleResults.price_outlook,
    fallbackPrice.price_outlook,
    fallbackPrice.classification,
  );
  const previewModuleResults = {
    ...advisoryModuleResults,
    price_outlook: (isPlanning || !hasEligibleForecast)
      ? (planningPriceOutlook || pickUsablePriceOutlook(advisoryModuleResults.price_outlook, fallbackPrice.price_outlook, fallbackPrice.classification))
      : (pickUsablePriceOutlook(
          advisoryModuleResults.price_outlook,
          fallbackPrice.price_outlook,
          fallbackPrice.classification,
          advisoryModuleResults.historical_price_outlook,
          fallbackPrice.historical_price_outlook,
        )),
    historical_price_outlook: pickUsablePriceOutlook(
      advisoryModuleResults.historical_price_outlook,
      fallbackPrice.historical_price_outlook,
    ) || advisoryModuleResults.historical_price_outlook || fallbackPrice.historical_price_outlook,
    forecast_price_outlook: advisoryModuleResults.forecast_price_outlook ||
      fallbackPrice.forecast_price_outlook,
    historical_seasonal_price: advisoryModuleResults.historical_seasonal_price ??
      fallbackPrice.historical_seasonal_price,
    macro_baseline_price: advisoryModuleResults.macro_baseline_price ??
      fallbackPrice.macro_baseline_price,
    reference_price: advisoryModuleResults.reference_price ?? fallbackPrice.reference_price ?? advisoryModuleResults.historical_seasonal_price ?? fallbackPrice.historical_seasonal_price,
    comparison_baseline: advisoryModuleResults.comparison_baseline ?? fallbackPrice.comparison_baseline ?? advisoryModuleResults.macro_baseline_price ?? fallbackPrice.macro_baseline_price,
    has_eligible_forecast: hasEligibleForecast,
    price_explanation: advisoryModuleResults.price_explanation || fallbackPrice.explanation,
    historical_price_change_pct: advisoryModuleResults.historical_price_change_pct ?? fallbackPrice.historical_price_change_pct ?? fallbackPrice.forecast_price_change_pct,
    recent_average_price: advisoryModuleResults.recent_average_price ??
      fallbackPrice.recent_average_price,
    forecast_midpoint: advisoryModuleResults.forecast_midpoint ??
      fallbackPrice.forecast_midpoint,
    arrival_pressure: advisoryModuleResults.arrival_pressure ||
      (fallbackArrival?.status === "processed" ? fallbackArrival.classification : null),
    current_arrival_kg: advisoryModuleResults.current_arrival_kg ?? fallbackArrival?.current_arrival_kg,
    historical_seasonal_production_level: advisoryModuleResults.historical_seasonal_production_level ||
      (fallbackProduction?.status === "processed" ? fallbackProductionProfile?.classification : null),
    seasonal_production_ratio: advisoryModuleResults.seasonal_production_ratio ??
      fallbackProductionProfile?.ratio,
    weather_risk: advisoryModuleResults.weather_risk ||
      (fallbackWeather.classification === "Not processed" ? null : fallbackWeather.classification),
    profitability: advisoryModuleResults.profitability ||
      (sellingBasis != null && costToRecover > 0
        ? (sellingBasis >= costToRecover ? "Favorable" : "Unfavorable")
        : null),
    break_even_price: advisoryModuleResults.break_even_price ?? costToRecover,
    lower_forecast_price: advisoryModuleResults.lower_forecast_price ?? forecastLo,
    upper_forecast_price: advisoryModuleResults.upper_forecast_price ?? forecastHi,
  };
  const normalizeModuleResult = (value) => {
    if (value && typeof value === "object") {
      return value.classification || value.level || value.outlook || value.status || null;
    }
    return value;
  };
  const normalizedPreviewResults = Object.fromEntries(
    Object.entries(previewModuleResults).map(([key, value]) => [key, normalizeModuleResult(value)])
  );
  const advisoryMeta = planAdvisoryData?.advisory || {};
  const mainFactor = resolveMainFactor({
    moduleResults: normalizedPreviewResults,
    contributions: advisoryMeta.module_contributions,
    weightsApplied: advisoryMeta.weights_applied,
    vetoes: advisoryMeta.hard_vetoes,
    lang: langCode,
  });
  const composedReasons = composeAdvisoryReasons({
    moduleResults: previewModuleResults,
    contributions: advisoryMeta.module_contributions,
    vetoes: advisoryMeta.hard_vetoes,
    cropName: cropDisplayName,
    horizonDays: 14,
    extra: {
      commodityId: commodityIdentifier,
      harvestDate: crop.harvestDate || crop.plantingDate,
      plantingDate: crop.plantingDate,
    },
  });
  const factorClassificationRows = [
    { module: "price_outlook", label: t("farmer.factors.price.factor_title", {}, "Price") },
    { module: "arrival_pressure", label: t("farmer.factors.arrival.factor_title", {}, "DFTC arrivals") },
    { module: "historical_seasonal_production_level", label: t("farmer.factors.production.factor_title", {}, "Past production") },
    { module: "weather_risk", label: t("farmer.factors.weather.factor_title", {}, "Weather") },
    { module: "profitability", label: t("farmer.factors.profitability.factor_title", {}, "Profitability") },
  ];
  const reasonByModule = new Map(
    composedReasons.filter((reason) => reason.module).map((reason) => [reason.module, reason])
  );
  const isCompleted = phaseCode === PHASE_CODES.COMPLETED ||
    String(crop.status || "").toLowerCase() === "completed" ||
    String(crop.phase || "").toLowerCase() === "completed";
  const isActive = !isCompleted;
  const isPlanted = isActive && [PHASE_CODES.GROWING, PHASE_CODES.PRE_HARVEST].includes(phaseCode);
  const isHarvesting = isActive && phaseCode === PHASE_CODES.HARVESTED;

  const now = new Date();
  const daysSincePlanting = pDate && !isNaN(pDate.getTime()) ? Math.max(0, Math.floor((now - pDate) / (1000 * 60 * 60 * 24))) : null;
  const totalGrowDays = pDate && hDate && !isNaN(pDate.getTime()) && !isNaN(hDate.getTime()) ? Math.max(1, Math.floor((hDate - pDate) / (1000 * 60 * 60 * 24))) : null;
  const progressPct = daysSincePlanting != null && totalGrowDays != null ? Math.min(100, Math.round(daysSincePlanting / totalGrowDays * 100)) : null;
  const daysToHarvest = hDate && !isNaN(hDate.getTime()) ? Math.max(0, Math.floor((hDate - now) / (1000 * 60 * 60 * 24))) : null;
  return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-4">

        {actionError && <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-[13px] text-red-700">{actionError}</div>}
        {planAdvisoryError && <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-[13px] text-amber-800">
          {planAdvisoryError.message}
        </div>}

        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: t("farmer.crops.title", {}, "My Crops"), onClick: () => navigate("/farmer/crops") },
            { label: cropDisplayName }
          ]}
        />

        {/* ── 1. Crop summary ── */}
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
                  onClick={() => {
                    setDrawerMode("update-phase");
                    setDrawerOpen(true);
                  }}
                  className="flex-shrink-0 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--hw-green-50)]"
                >
                  <Pencil className="w-3.5 h-3.5" />{t("farmer.cropCycle.update_phase", {}, "Update phase")}
                </button>
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-[var(--hw-neutral-900)]">
                {phaseCode === PHASE_CODES.PLANNING ? <p>{t("farmer.calendar.labels.planned_planting", {}, "Planned planting")}: {crop.plantingDate || "-"}</p> : <p>{t("farmer.advisory.labels.planted", {}, "Planted")}: {crop.plantingDate || "-"}</p>}
                <p>{t("farmer.calendar.labels.expected_harvest", {}, "Est. harvest")}: {crop.harvestDate || "-"}</p>
                <p>{t("farmer.assess.farm_area_label", {}, "Farm area")}: {crop.farmArea != null ? `${crop.farmArea} sq m` : "- sq m"}</p>
              </div>
              <p className="text-xs text-[var(--hw-neutral-900)] mt-1">{t("common.last_updated", {}, "Last updated")} {crop.lastUpdated || "-"}</p>
            </div>
          </div>
        </div>

        {/* ── On Hold reason — shown between header and advisory ── */}
        {crop.isOnHold && <div className="bg-white border border-[var(--hw-neutral-200)] rounded-2xl px-4 py-3.5 flex items-start gap-3">
            <PauseCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[13px] font-bold text-amber-700">{t("farmer.advisory.labels.on_hold", {}, "On hold")}</p>
              <p className="text-[13px] text-[var(--hw-neutral-900)]">
                <span className="text-[var(--hw-neutral-600)]">{t("farmer.cropCycle.hold_reason_label", {}, "Reason for putting this crop on hold")}:</span> {formatHoldReason(crop.holdReason, t)}
              </p>
              {crop.holdDate && <p className="text-[12px] text-[var(--hw-neutral-500)]">{t("farmer.cropCycle.put_on_hold", {}, "Put on hold")}: {crop.holdDate}</p>}
            </div>
          </div>}

        {/* ── 2. Main advice — white card, colored foreground only ── */}
        {isActive && (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
            <button
              type="button"
              onClick={() => setAdvisoryExpanded((v) => !v)}
              aria-expanded={advisoryExpanded}
              aria-label={advisoryLabel}
              className="w-full flex items-center justify-between gap-2 text-left cursor-pointer group"
            >
              <div className={`flex items-center gap-2 ${advisoryCfg?.color || "text-[var(--hw-neutral-700)]"}`}>
                {AdvisoryIcon ? <AdvisoryIcon className="w-5 h-5 flex-shrink-0" /> : <Sprout className="w-5 h-5 flex-shrink-0" />}
                <p className={`text-[15px] font-bold ${advisoryCfg?.color || "text-[var(--hw-neutral-700)]"}`}>{advisoryLabel}</p>
              </div>
              {advisoryExpanded ? (
                <ChevronUp className="w-4 h-4 text-[var(--hw-neutral-400)] group-hover:text-[var(--hw-neutral-700)] transition-colors flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-400)] group-hover:text-[var(--hw-neutral-700)] transition-colors flex-shrink-0" />
              )}
            </button>
            {advisoryExpanded && (
              <div className="mt-2.5">
                <p className="text-[14px] text-[var(--hw-neutral-900)] leading-snug">
                  {summaryText}
                </p>
                {displayImmediateActions.map((act, idx) => {
                  const text = renderComposedMessage(act, langCode);
                  return text ? (
                    <p key={act.key || idx} className="text-[13px] text-[var(--hw-neutral-700)] font-medium leading-relaxed mt-1.5">
                      {text}
                    </p>
                  ) : null; })}
                {isPlanning && normalizedPreviewResults.price_outlook && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {(() => {
                        const priceCondition = resolveFactorCondition(
                          "price_outlook",
                          normalizedPreviewResults.price_outlook
                        );
                        return renderFactorIcon(priceCondition.iconType, priceCondition.colorClass);
                      })()}
                      <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] truncate">
                        {t("farmer.factors.price.factor_title", {}, "Price outlook")}
                      </p>
                    </div>
                    <p className={`text-[13px] font-bold ${resolveFactorCondition(
                      "price_outlook",
                      normalizedPreviewResults.price_outlook
                    ).colorClass}`}>
                      {formatClassification(normalizedPreviewResults.price_outlook, t)}
                    </p>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-[var(--hw-neutral-200)]">
                  <button
                    type="button"
                    onClick={() => setWhyExpanded((v) => !v)}
                    aria-expanded={whyExpanded}
                    className="w-full flex items-center justify-between text-left py-1 hover:opacity-80 transition-opacity cursor-pointer group"
                  >
                    <span className="text-[12px] sm:text-[13px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">
                      {t("farmer.advisory.why_recommendation_title", {}, "Why this recommendation?")}
                    </span>
                    {whyExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[var(--hw-neutral-500)] group-hover:text-[var(--hw-neutral-700)] transition-colors flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-500)] group-hover:text-[var(--hw-neutral-700)] transition-colors flex-shrink-0" />
                    )}
                  </button>
                  {whyExpanded && (
                    <div className="mt-3 space-y-3">
                      {mainFactor && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-[var(--hw-neutral-200)] shadow-xs">
                          <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                            badge.type === "avoid" ? "bg-red-50 text-red-600" :
                            badge.type === "caution" ? "bg-amber-50 text-amber-600" :
                            "bg-emerald-50 text-emerald-700"
                          }`}>
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <p className="text-[13px] font-medium text-[var(--hw-neutral-900)] leading-snug pt-0.5">
                            {renderComposedMessage(mainFactor, langCode)}
                          </p>
                        </div>
                      )}
                      <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">
                        {t("farmer.advisory.advisory_main_reasons", {}, "Main reasons")}
                      </p>
                      <div className="space-y-2 sm:space-y-2.5">
                        {factorClassificationRows.map(({ module, label }) => {
                          const reason = reasonByModule.get(module);
                          const reasonTextCandidate = reason
                            ? renderComposedMessage(reason, langCode)
                            : (module === "price_outlook" && (previewModuleResults.price_explanation || fallbackPrice.explanation)
                              ? (previewModuleResults.price_explanation || fallbackPrice.explanation)
                              : null);
                          const extractedClass = (module === "price_outlook" && reasonTextCandidate)
                            ? (reasonTextCandidate.match(/classified as (Favorable|Neutral|Unfavorable)/i)?.[1] || null)
                            : null;
                          const rawClassification = normalizedPreviewResults[module] || (
                            module === "price_outlook"
                              ? (reason?.params?.classification || planningPriceOutlook || previewModuleResults.historical_price_outlook || previewModuleResults.price_outlook || fallbackPrice.classification || extractedClass)
                              : null
                          );
                          const classification = formatClassification(rawClassification, t);
                          const reasonText = reasonTextCandidate || t("farmer.advisory.not_available", {}, "Assessment data is not available yet.");
                          const factorCond = resolveFactorCondition(
                            module,
                            rawClassification || classification,
                            reason?.key,
                            reasonText
                          );
                          return (
                            <div key={module} className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-100)]">
                              <div className="w-8 h-8 rounded-lg bg-white border border-[var(--hw-neutral-200)] flex items-center justify-center flex-shrink-0 mt-0.5">
                                {renderFactorIcon(factorCond.iconType, factorCond.colorClass)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-[13px] font-semibold leading-snug ${factorCond.colorClass}`}>
                                  {reason?.labelKey
                                    ? t(reason.labelKey, {}, label)
                                    : label}
                                </p>
                                <p className={`text-[12px] font-semibold leading-snug mt-0.5 ${factorCond.colorClass}`}>
                                  {classification || t("farmer.advisory.not_available", {}, "Not available")}
                                </p>
                                <p className="text-[12px] text-[var(--hw-neutral-800)] leading-snug mt-0.5">{reasonText}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/farmer/crops/${crop.id}/factors`, {
                            state: {
                              cropStage: currentCropStage,
                              plantingDate: crop.rawPlantingDate || crop.plantingDate,
                              expectedHarvestDate: crop.rawHarvestDate || crop.harvestDate,
                              moduleResults: previewModuleResults,
                              plantingWindowStart: planAdvisoryData?.planting_window_start,
                              plantingWindowEnd: planAdvisoryData?.planting_window_end,
                              plantingWindowLabel: planAdvisoryData?.planting_window_label,
                              advisoryCode,
                              rawAdvisory,
                              advisoryLabel,
                              planAdvisoryData,
                            },
                          })
                        }
                        className="mt-3 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[var(--hw-green-700)] text-white text-[13px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] transition-colors shadow-xs"
                      >
                        {t("farmer.advisory.view_basis", {}, "View basis →")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 3. Crop progress ── */}
        {isPlanted && (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
              {t("farmer.cropCycle.crop_progress", {}, "Crop progress")}
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--hw-neutral-900)]">
                  {daysSincePlanting != null && totalGrowDays != null
                    ? t("farmer.cropCycle.days_of_days", { current: daysSincePlanting, total: totalGrowDays }, `${daysSincePlanting} of ${totalGrowDays} days`)
                    : "-"}
                </span>
                <span className="font-semibold text-[var(--hw-neutral-900)]">
                  {progressPct != null ? `${progressPct}%` : "-"}
                </span>
              </div>
              <div className="h-2.5 bg-[var(--hw-neutral-200)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--hw-green-600)] rounded-full"
                  style={{ width: `${progressPct != null ? progressPct : 0}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: t("farmer.cropCycle.days_planted", {}, "Days planted"), value: daysSincePlanting != null ? `${daysSincePlanting}d` : "-" },
                { label: t("farmer.cropCycle.days_to_harvest", {}, "Days to harvest"), value: daysToHarvest != null ? `${daysToHarvest}d` : "-" },
                { label: t("farmer.cropCycle.harvest_est", {}, "Harvest est."), value: crop.harvestDate || "-" }
              ].map((m) => (
                <div key={m.label} className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2">
                  <p className="text-xs text-[var(--hw-neutral-900)]">{m.label}</p>
                  <p className="text-sm font-semibold text-[var(--hw-neutral-900)] mt-0.5">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 3b. Harvest progress ── */}
        {isHarvesting && (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
              {t("farmer.cropCycle.harvest_progress", {}, "Harvest progress")}
            </p>
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
              <div>
                <label htmlFor="harvest-date-input" className="block text-xs text-[var(--hw-neutral-900)] mb-1">
                  {t("farmer.cropCycle.harvest_date", {}, "Harvest date")}
                </label>
                <input
                  id="harvest-date-input"
                  type="date"
                  value={harvestEntryDate}
                  onChange={(e) => setHarvestEntryDate(e.target.value)}
                  className="w-full min-w-0 px-2 py-1.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] bg-white"
                />
              </div>
              <div>
                <label htmlFor="harvest-qty-input" className="block text-xs text-[var(--hw-neutral-900)] mb-1">
                  {t("farmer.cropCycle.qty_harvested", {}, "Qty (kg)")}
                </label>
                <input
                  id="harvest-qty-input"
                  type="number"
                  min="0.01"
                  max={remainingExpected !== "" && Number(remainingExpected) > 0 ? remainingExpected : undefined}
                  step="0.01"
                  value={harvestEntryQty}
                  onChange={(e) => setHarvestEntryQty(e.target.value)}
                  placeholder="e.g. 450"
                  className={`w-full min-w-0 px-2 py-1.5 rounded-xl border text-sm outline-none focus:ring-1 bg-white ${
                    isExceedingRemaining
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500 text-red-900"
                      : "border-[var(--hw-neutral-200)] focus:border-[var(--hw-green-600)] focus:ring-[var(--hw-green-600)]"
                  }`}
                />
              </div>
              <div>
                <label htmlFor="harvest-price-input" className="block text-xs text-[var(--hw-neutral-900)] mb-1">
                  {t("farmer.cropCycle.harvest_price", {}, "Price (₱/kg)")}
                </label>
                <input
                  id="harvest-price-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={harvestEntryPrice}
                  onChange={(e) => setHarvestEntryPrice(e.target.value)}
                  placeholder="e.g. 85"
                  className="w-full min-w-0 px-2 py-1.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] bg-white"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveHarvestEntry}
                disabled={isSavingHarvestEntry || !harvestEntryDate || parsedHarvestEntry <= 0 || isExceedingRemaining || parsedHarvestPrice == null || parsedHarvestPrice < 0}
                aria-label={t("farmer.cropCycle.save_harvest_entry", {}, "Save harvest entry")}
                title={t("farmer.cropCycle.save_harvest_entry", {}, "Save harvest entry")}
                className="h-[34px] w-[38px] inline-flex items-center justify-center rounded-xl bg-[var(--hw-green-700)] text-white hover:bg-[var(--hw-green-800)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
            {isExceedingRemaining && (
              <p className="text-xs text-red-600 font-medium">
                {t(
                  "farmer.cropCycle.harvest_exceeds_remaining",
                  { max: remainingExpected },
                  `Harvest quantity cannot exceed remaining yield (${remainingExpected} kg).`
                )}
              </p>
            )}
            <p className="text-xs text-[var(--hw-neutral-700)]">
              {t("farmer.cropCycle.remaining_expected", {}, "Remaining expected (kg)")}: {remainingExpected === "" ? "—" : remainingExpected}
            </p>
            {crop.harvestRecords?.length > 0 && (
              <div className="rounded-xl border border-[var(--hw-neutral-200)] divide-y divide-[var(--hw-neutral-100)] max-h-40 overflow-y-auto">
                {crop.harvestRecords.map((record) => {
                  const recordDate = record.actualHarvestDate || record.actual_harvest_date;
                  const rawQty = record.actualHarvestQty ?? record.actual_harvest_qty;
                  const recordQty = rawQty != null && !isNaN(Number(rawQty)) ? Number(rawQty) : 0;
                  const rawPrice = record.actualSellingPricePerKg ?? record.actual_selling_price_per_kg;
                  const recordPrice = rawPrice != null && !isNaN(Number(rawPrice)) ? Number(rawPrice) : null;
                  return (
                    <div key={record.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2 text-xs">
                      <span className="min-w-0 text-[var(--hw-neutral-700)]">
                        {formatLocalDate(recordDate) || recordDate || "—"}
                      </span>
                      <span className="text-right font-medium text-[var(--hw-neutral-900)]">
                        {recordQty.toLocaleString()} kg
                      </span>
                      <span className="min-w-[72px] text-right text-[var(--hw-neutral-700)]">
                        {recordPrice != null ? `₱${recordPrice.toFixed(2)}/kg` : "—"}
                      </span>
                    </div>
                  );
                })}
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2 text-xs bg-[var(--hw-neutral-50)]">
                  <span className="font-semibold text-[var(--hw-neutral-900)]">
                    {t("farmer.cropCycle.total_harvested", {}, "Total quantity")}
                  </span>
                  <span className="col-span-2 text-right font-semibold text-[var(--hw-neutral-900)]">
                    {savedHarvestProgress.toLocaleString()} kg
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                setDrawerMode("update-phase");
                setDrawerOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
            >
              <Check className="w-4 h-4" />
              {t("farmer.cropCycle.mark_completed", {}, "Mark Crop Completed")}
            </button>
          </div>
        )}

        {/* ── 4. Estimated Profit ── */}
        {isActive && <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">
              {t("farmer.factors.profitability.title", {}, "Estimated Profit")}
            </p>

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
                totalCost={totalCost}
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
                <p className="text-[var(--hw-neutral-900)]">{t("farmer.factors.profitability.estimated_cost", {}, "Estimated cost")}</p>
                <p className="font-medium text-[var(--hw-neutral-900)]">{totalCost > 0 ? formatPeso(totalCost) : t("farmer.advisory.not_available")}</p>
              </div>
              <div>
                <p className="text-[var(--hw-neutral-900)]">{t("farmer.factors.profitability.expected_harvest", {}, "Expected harvest")}</p>
                <p className="font-medium text-[var(--hw-neutral-900)]">{crop.harvestQuantity ? `${crop.harvestQuantity} kg` : t("farmer.advisory.not_available")}</p>
              </div>
              <div>
                <p className="text-[var(--hw-neutral-900)]">{t("farmer.factors.profitability.price_basis", {}, "Price basis")}</p>
                <p className="font-medium text-[var(--hw-neutral-900)]">{sellingBasis ? `₱${Number(sellingBasis).toFixed(2)}/kg` : t("farmer.advisory.not_available")}</p>
              </div>
              <div>
                <p className="text-[var(--hw-neutral-900)]">{t("farmer.factors.profitability.cost_to_recover", {}, "Cost to recover")}</p>
                <p className="font-medium text-[var(--hw-neutral-900)]">{costToRecover ? `₱${costToRecover}/kg` : t("farmer.advisory.not_available")}</p>
              </div>
            </div>

            <p className="text-[12px] text-[var(--hw-neutral-900)]">
              {t("farmer.factors.profitability.estimate_disclaimer", {}, "Estimate only. Actual income may change.")}
            </p>
          </div>}

        {/* ── 5. What to do this week ── */}
        {isActive && weeklyActions.length > 0 && <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
              {t("farmer.actions.monitoring.weekly_actions_title", {}, "What to do this week")}
            </p>
            <div className="space-y-2">
              {weeklyActions.map((action, i) => {
                const Icon = resolveWeeklyActionIcon(action);
                return (
                  <div key={i} className="flex items-start gap-3 py-1">
                    <div className="w-6 h-6 rounded-lg bg-[var(--hw-neutral-100)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-[var(--hw-neutral-900)]" />
                    </div>
                    <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">
                      {action.key ? t(action.key, action.params || {}, action.text || "") : (action.text || "")}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>}

        {/* ── 7. Cost and selling price ── */}
        {isActive && (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
                {t("farmer.cropCycle.cost_and_selling_price", {}, "Cost and selling price")}
              </p>
              {!addCostOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setAdditionalCostCategory("Others");
                    setAdditionalCost("");
                    setAddCostOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("farmer.cropCycle.add_cost", {}, "Add cost")}
                </button>
              )}
            </div>

            {addCostOpen && (
              <div className="bg-[var(--hw-neutral-50)] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[13px] font-medium text-[var(--hw-neutral-900)]">
                    {t("farmer.cropCycle.additional_cost", {}, "Additional cost (₱)")}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAddCostOpen(false);
                      setAdditionalCost("");
                    }}
                    className="text-xs text-[var(--hw-neutral-500)] hover:text-[var(--hw-neutral-700)]"
                  >
                    {t("common.cancel", {}, "Cancel")}
                  </button>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] gap-2">
                  <select
                    value={additionalCostCategory}
                    onChange={(e) => setAdditionalCostCategory(e.target.value)}
                    disabled={isSubmittingCost}
                    aria-label={t("farmer.cropCycle.cost_category", {}, "Cost")}
                    className="min-w-0 px-3 py-2 rounded-xl border border-[var(--hw-neutral-200)] text-sm outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] bg-white disabled:opacity-50"
                  >
                    <option value="Seeds or planting materials">{t("farmer.assess.expense_seeds", {}, "Seeds or planting materials")}</option>
                    <option value="Fertilizer">{t("farmer.assess.expense_fertilizer", {}, "Fertilizer")}</option>
                    <option value="Crop protection">{t("farmer.assess.expense_protection", {}, "Crop protection")}</option>
                    <option value="Labor">{t("farmer.assess.expense_labor", {}, "Labor")}</option>
                    <option value="Irrigation">{t("farmer.assess.expense_irrigation", {}, "Irrigation")}</option>
                    <option value="Transportation">{t("farmer.assess.expense_transport", {}, "Transportation")}</option>
                    <option value="Others">{t("farmer.assess.expense_other", {}, "Others")}</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={additionalCost}
                    onChange={(e) => setAdditionalCost(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCostSubmit();
                      }
                    }}
                    placeholder="e.g. 500"
                    disabled={isSubmittingCost}
                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--hw-neutral-200)] text-sm outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] bg-white disabled:opacity-50"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCostSubmit}
                    disabled={isSubmittingCost || !additionalCost || Number(additionalCost) <= 0}
                    className="px-3 py-2 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[40px]"
                  >
                    {isSubmittingCost ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-[var(--hw-neutral-100)]">
              {[
                { label: t("farmer.cropCycle.estimated_cost", {}, "Estimated cost"), value: initialCost > 0 ? formatPeso(initialCost) : "-" },
                {
                  key: "added_costs",
                  label: t("farmer.cropCycle.added_costs", {}, "Added costs"),
                  value: addedCosts > 0 ? formatPeso(addedCosts) : "-",
                },
                { label: t("farmer.cropCycle.total_recorded_cost", {}, "Total recorded cost"), value: totalCost > 0 ? formatPeso(totalCost) : "-", bold: true },
                { label: t("farmer.cropCycle.expected_harvest_volume", {}, "Expected harvest volume"), value: crop.harvestQuantity ? `${crop.harvestQuantity} kg` : "- kg" },
                { label: t("farmer.cropCycle.cost_to_recover_per_kg", {}, "Cost to recover per kg"), value: costToRecover > 0 ? `₱${costToRecover}/kg` : "-/kg", bold: true },
                { label: t("farmer.cropCycle.forecasted_price_ref", {}, "Forecasted price reference"), value: forecastLo != null && forecastHi != null ? `₱${forecastLo}–₱${forecastHi}/kg` : "-/kg" },
                { label: t("farmer.cropCycle.current_market_price", {}, "Current market price"), value: currentPrice != null ? `₱${currentPrice}/kg` : "-/kg" },
                { label: t("farmer.cropCycle.estimated_farmgate_price", {}, "Estimated farmgate price"), value: hasFarmgate ? `₱${farmgatePrice}/kg` : t("farmer.cropCycle.not_set", {}, "Not set"), muted: !hasFarmgate }
              ].map((r) => (
                <div key={r.label}>
                  <div className="flex items-center justify-between py-2.5 gap-3">
                    <p className="text-[13px] text-[var(--hw-neutral-900)]">{r.label}</p>
                    <p className={`text-[13px] flex-shrink-0 ${r.bold ? "font-bold text-[var(--hw-neutral-900)]" : r.muted ? "text-[var(--hw-neutral-400)] italic" : "font-medium text-[var(--hw-neutral-900)]"}`}>{r.value}</p>
                  </div>
                  {r.key === "added_costs" && additionalCostsList.length > 0 && (
                    <div className="bg-[var(--hw-neutral-50)] rounded-xl p-2.5 mb-2 space-y-1.5 border border-[var(--hw-neutral-200)]/60">
                      <button
                        type="button"
                        onClick={() => setAddedCostsExpanded((expanded) => !expanded)}
                        aria-expanded={addedCostsExpanded}
                        className="w-full flex items-center justify-between text-xs font-semibold text-[var(--hw-neutral-600)] px-1 text-left"
                      >
                        <span>{t("farmer.cropCycle.added_cost_records", {}, "Added cost records")}</span>
                        <span className="flex items-center gap-2">
                          <span>{additionalCostsList.length} {additionalCostsList.length === 1 ? "entry" : "entries"}</span>
                          {addedCostsExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </span>
                      </button>
                      {addedCostsExpanded && (
                        <div className="divide-y divide-[var(--hw-neutral-200)]/50">
                          {additionalCostsList.map((c, idx) => {
                            const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
                            return (
                              <div key={c.id || idx} className="flex items-center justify-between py-1.5 px-1 text-xs">
                                <div className="flex flex-col">
                                  <span className="font-medium text-[var(--hw-neutral-800)]">{c.category || "Additional cost"}</span>
                                  {dateStr && (
                                    <span className="text-[10px] text-[var(--hw-neutral-500)]">{dateStr}</span>
                                  )}
                                </div>
                                <span className="font-semibold text-[var(--hw-green-700)]">
                                  +{formatPeso(c.amount)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Farmgate price */}
            <div className="border-t border-[var(--hw-neutral-100)] pt-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">
                  {t("farmer.cropCycle.estimated_farmgate_price", {}, "Estimated farmgate price")}
                </p>
                {!editFarmgate && (
                  <div className="flex items-center gap-3">
                    {hasFarmgate && (
                      <button
                        onClick={async () => {
                          setActionError(null);
                          try {
                            const res = await apiPut(`/crop-plans/${crop.id}/farmgate`, { expected_farmgate_price: null });
                            if (!res.ok) throw new Error("Failed to remove farmgate price.");
                            setFarmgatePrice("");
                            updateCrop(crop.id, { farmgatePrice: null });
                            await refreshCrops();
                          } catch (err) {
                            setActionError(err.message || "Failed to remove farmgate price. Please try again.");
                          }
                        }}
                        className="text-[12px] font-medium text-red-600 hover:opacity-70"
                      >
                        {t("farmer.cropCycle.remove_farmgate", {}, "Remove")}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditFarmgate(true);
                        setFarmgateDraft(hasFarmgate ? String(farmgatePrice) : "");
                      }}
                      className="text-[12px] font-medium text-[var(--hw-green-700)] hover:opacity-70"
                    >
                      {hasFarmgate ? t("common.edit", {}, "Edit") : t("farmer.cropCycle.add_cost", {}, "Add")}
                    </button>
                  </div>
                )}
              </div>
              {editFarmgate ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={farmgateDraft}
                    onChange={(e) => setFarmgateDraft(e.target.value)}
                    placeholder="e.g. 70"
                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--hw-neutral-200)] text-sm outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] bg-white"
                  />
                  <button
                    onClick={async () => {
                      const v = Number(farmgateDraft);
                      if (!(v > 0)) return;
                      setActionError(null);
                      try {
                        const res = await apiPut(`/crop-plans/${crop.id}/farmgate`, { expected_farmgate_price: v });
                        if (!res.ok) throw new Error("Failed to save farmgate price.");
                        setFarmgatePrice(v);
                        updateCrop(crop.id, { farmgatePrice: v });
                        await refreshCrops();
                        setEditFarmgate(false);
                      } catch (err) {
                        setActionError(err.message || "Failed to save farmgate price. Please try again.");
                      }
                    }}
                    className="px-3 py-2 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  {hasFarmgate ? (
                    <p className="text-[15px] font-bold text-[var(--hw-neutral-900)]">₱{farmgatePrice}/kg</p>
                  ) : (
                    <p className="text-[13px] text-[var(--hw-neutral-900)] italic">
                      {t("farmer.cropCycle.not_set_market_ref", {}, "Not set. Using market price as reference.")}
                    </p>
                  )}
                  <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">
                    {hasFarmgate
                      ? t("farmer.cropCycle.farmgate_explainer", {}, "This is the price a buyer may pay you. You can update it later.")
                      : t("farmer.cropCycle.market_ref_explainer", {}, "Actual buyer price may be different from market price.")}
                  </p>
                </div>
              )}
            </div>

            {/* Phase actions */}
            {normalizePhaseCode(crop.phase) === PHASE_CODES.PRE_HARVEST && (
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setDrawerMode("update-phase");
                    setDrawerOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--hw-green-700)] text-white text-[13px] font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
                >
                  {t("farmer.crops.btn_start_harvesting", {}, "Start Harvesting")}
                </button>
                <button
                  onClick={() => navigate(`/farmer/prices/${crop.commodity}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] text-[13px] font-medium rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors"
                >
                  {t("farmer.cropCycle.view_prices", {}, "View Prices")}
                </button>
              </div>
            )}
            {normalizePhaseCode(crop.phase) === PHASE_CODES.GROWING && (
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setDrawerMode("update-phase");
                    setDrawerOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--hw-green-700)] text-white text-[13px] font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t("farmer.cropCycle.update_phase", {}, "Update phase")}
                </button>
              </div>
            )}
            {crop.isOnHold && (
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setDrawerMode("update-phase");
                    setDrawerOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--hw-green-700)] text-white text-[13px] font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  {t("common.continue", {}, "Continue")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Completed: harvest summary ── */}
        {isCompleted && (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-4">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
              {t("farmer.cropCycle.harvest_summary", {}, "Harvest summary")}
            </p>
            <div className="rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden divide-y divide-[var(--hw-neutral-100)]">
              {[
                { label: t("farmer.cropCycle.crop_label", {}, "Crop"), value: crop.variant ? `${crop.commodityName} (${crop.variant})` : crop.commodityName },
                { label: t("farmer.cropCycle.planting_date", {}, "Planting date"), value: crop.plantingDate },
                { label: t("farmer.cropCycle.harvest_date", {}, "Harvest date"), value: crop.harvestDate },
                { label: t("farmer.cropCycle.harvest_quantity", {}, "Harvest quantity"), value: crop.actualHarvestQty ? `${crop.actualHarvestQty} kg` : `${crop.harvestQuantity} kg (planned)` },
                { label: t("farmer.cropCycle.selling_price", {}, "Selling price"), value: crop.actualSellingPrice != null ? `₱${Number(crop.actualSellingPrice).toFixed(2)}/kg` : "—" },
                { label: t("farmer.cropCycle.total_cost", {}, "Total cost"), value: formatPeso(crop.totalCost) },
                {
                  label: t("farmer.cropCycle.total_sales", {}, "Total sales"),
                  value: crop.actualHarvestQty && crop.actualHarvestRevenue != null
                    ? formatPeso(crop.actualHarvestRevenue)
                    : crop.actualHarvestQty && crop.actualSellingPrice
                      ? formatPeso(crop.actualHarvestQty * crop.actualSellingPrice)
                      : "—",
                },
                ...(crop.notes ? [{ label: t("farmer.cropCycle.notes", {}, "Notes"), value: crop.notes }] : []),
                {
                  label: t("farmer.cropCycle.est_profit_loss", {}, "Estimated profit / loss"),
                  value: crop.actualHarvestQty && crop.actualHarvestRevenue != null
                    ? `${crop.actualHarvestRevenue - crop.totalCost >= 0 ? "+" : ""}${formatPeso(crop.actualHarvestRevenue - crop.totalCost)}`
                    : crop.actualHarvestQty && crop.actualSellingPrice
                      ? `${crop.actualHarvestQty * crop.actualSellingPrice - crop.totalCost >= 0 ? "+" : ""}${formatPeso(crop.actualHarvestQty * crop.actualSellingPrice - crop.totalCost)}`
                      : "—",
                  negative: crop.actualHarvestQty && crop.actualHarvestRevenue != null
                    ? crop.actualHarvestRevenue - crop.totalCost < 0
                    : Boolean(crop.actualHarvestQty && crop.actualSellingPrice && crop.actualHarvestQty * crop.actualSellingPrice - crop.totalCost < 0),
                  accent: true
                }
              ].map((r) => (
                <div key={r.label} className={`flex items-center justify-between gap-4 px-3 py-2.5 flex-wrap ${r.negative ? "bg-red-50" : r.accent ? "bg-[var(--hw-green-50)]" : ""}`}>
                  <span className={`text-xs ${r.negative ? "font-semibold text-red-700" : r.accent ? "font-semibold text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-900)]"}`}>{r.label}</span>
                  <span className={`text-xs font-semibold ${r.negative ? "text-red-700" : r.accent ? "text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-900)]"}`}>{r.value}</span>
                </div>
              ))}
            </div>
            {crop.harvestRecords?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--hw-neutral-900)]">
                  {t("farmer.cropCycle.harvest_records", {}, "Harvest entries")}
                </p>
                <div className="rounded-xl border border-[var(--hw-neutral-200)] divide-y divide-[var(--hw-neutral-100)]">
                  {crop.harvestRecords.map((record) => {
                    const recordDate = record.actualHarvestDate || record.actual_harvest_date;
                    const rawQty = record.actualHarvestQty ?? record.actual_harvest_qty;
                    const recordQty = rawQty != null && !isNaN(Number(rawQty)) ? Number(rawQty) : 0;
                    const rawPrice = record.actualSellingPricePerKg ?? record.actual_selling_price_per_kg;
                    const recordPrice = rawPrice != null && !isNaN(Number(rawPrice)) ? Number(rawPrice) : null;
                    return (
                      <div key={record.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2 text-xs">
                        <span className="min-w-0 text-[var(--hw-neutral-700)]">
                          {formatLocalDate(recordDate) || recordDate || "—"}
                        </span>
                        <span className="text-right font-medium text-[var(--hw-neutral-900)]">
                          {recordQty.toLocaleString()} kg
                        </span>
                        <span className="min-w-[72px] text-right text-[var(--hw-neutral-700)]">
                          {recordPrice != null ? `₱${recordPrice.toFixed(2)}/kg` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <p className="text-[12px] text-[var(--hw-neutral-900)] italic">
              {t("farmer.cropCycle.summary_disclaimer", {}, "All figures are estimates. This is a decision-support summary, not final accounting.")}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigate("/farmer/assess")}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--hw-green-700)] text-white text-[13px] font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
              >
                {t("farmer.cropCycle.start_another_assessment", {}, "Start Another Assessment")}
              </button>
              <button
                onClick={() => navigate("/farmer/crops")}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] text-[13px] font-medium rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors"
              >
                {t("farmer.cropCycle.view_all_crops", {}, "View All Crops")}
              </button>
            </div>
          </div>
        )}

      <UpdatePhaseDrawer
        open={drawerOpen}
        crop={crop}
        mode={drawerMode}
        onClose={() => setDrawerOpen(false)}
        onConfirm={handleDrawerAction}
      />
    </div>;
}
export {
  CropCycleDetailPage as default
};
