import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Sprout, ChevronRight, CheckCircle2, X } from "lucide-react";
import { useCrops } from "../components/crops/CropsContext";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { PhasePill } from "../components/crops/CropCard";
import { fetchFarmerProfile } from "../../global/hooks/useFarmerPrefetch";
import { sortWithPreferredFirst, isPreferredCrop } from "../utils/cropPreferences";
import { PreferredStar } from "../components/shared/PreferredStar";

const STAGE_TABS = [
  { id: "all", key: "common.filter_all", label: "All" },
  { id: "drafts", key: "farmer.phases.drafts_tab", label: "Drafts" },
  { id: "planning", key: "farmer.phases.planning", label: "Planning" },
  { id: "planted", key: "farmer.phases.planted", label: "Planted" },
  { id: "harvesting", key: "farmer.phases.harvesting", label: "Harvesting" },
  { id: "completed", key: "farmer.phases.completed", label: "Completed" }
];
function matchesStage(crop, tab) {
  if (tab === "all") return true;
  if (tab === "draft" || tab === "drafts") {
    return Boolean(crop.phase === "draft" || crop.status === "Draft" || crop.isDraft);
  }
  if (tab === "planning") {
    return (crop.phase === "planning" || crop.phase === "on-hold") && crop.phase !== "draft" && crop.status !== "Draft" && !crop.isDraft;
  }
  if (tab === "planted") return crop.phase === "growing";
  if (tab === "harvesting") return crop.phase === "pre-harvest" || crop.phase === "harvested";
  if (tab === "completed") return crop.phase === "completed";
  return false;
}
function profitRange(crop) {
  if (crop.phase === "completed" || crop.phase === "draft" || crop.status === "Draft") return null;
  const pLow = Number(crop.profitLower || 0);
  const pHigh = Number(crop.profitUpper || 0);
  if (pLow > 0 && pHigh > 0) {
    return `\u20B1${pLow.toLocaleString("en-PH")}\u2013\u20B1${pHigh.toLocaleString("en-PH")}`;
  }
  const sellingBasis = crop.farmgatePrice != null ? crop.farmgatePrice : crop.currentPrice;
  const qty = crop.expectedHarvestQty != null ? crop.expectedHarvestQty : crop.harvestQuantity;
  const cost = crop.breakEvenPrice != null ? crop.breakEvenPrice : crop.breakevenPricePerKg;
  if (sellingBasis != null && cost != null && qty != null && qty > 0) {
    const margin = sellingBasis - cost;
    if (margin > 0) {
      const lo = Math.floor(margin * qty * 0.85 / 1e3) * 1e3;
      const hi = Math.ceil(margin * qty * 1.1 / 1e3) * 1e3;
      return `\u20B1${lo.toLocaleString("en-PH")}\u2013\u20B1${hi.toLocaleString("en-PH")}`;
    }
  }
  return null;
}
function nextActionText(crop) {
  if (crop.phase === "draft" || crop.status === "Draft") {
    return "Assessment incomplete – Step 1 draft saved";
  }
  if (crop.nextMilestone) return crop.nextMilestone;
  const map = {
    planning: "Review plan before planting",
    "on-hold": "Reassess before planting",
    growing: "Check drainage this week",
    "pre-harvest": "Prepare for harvest soon",
    harvested: "Record harvest and selling price",
    completed: "Crop cycle completed"
  };
  return map[crop.phase] ?? "";
}
const MyCropCard = ({ crop, onView, isPreferred = false }) => {
  const { t } = useLanguage();
  const isDraft = crop.phase === "draft" || crop.status === "Draft" || crop.isDraft;
  const currentPrice = crop.currentPrice;
  const profit = profitRange(crop);
  const action = isDraft
    ? t("farmer.draft.card_action", {}, "Assessment incomplete – Step 1 draft saved")
    : crop.isOnHold
    ? "Resume when market conditions improve"
    : crop.phase === "completed"
    ? "Crop cycle completed"
    : nextActionText(crop);
  const displayName = crop.commodityName ? (crop.variant ? `${crop.commodityName} (${crop.variant})` : crop.commodityName) : "-";
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      {/* Top: icon + name + status */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <CommodityIllustration commodityId={crop.commodity} commodityName={crop.commodityName} baseName={crop.commodityName} className="w-11 h-11 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-[var(--hw-neutral-900)] leading-tight truncate">
              {displayName}
            </p>
            {isPreferred && (
              <PreferredStar className="w-3.5 h-3.5 text-amber-500" />
            )}
          </div>
        </div>
        <PhasePill phase={crop.phase} isOnHold={crop.isOnHold} />
      </div>

      {/* Details */}
      <div className="px-4 pb-3 space-y-1.5">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-[var(--hw-neutral-900)]">{t("farmer.crops.harvest_on", {}, "Harvest on")}</span>
          <span className="font-medium text-[var(--hw-neutral-900)]">{crop.harvestDate || "-"}</span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-[var(--hw-neutral-900)]">{t("farmer.crops.current_price", {}, "Current price")}</span>
          <span className="font-medium text-[var(--hw-neutral-900)]">
            {currentPrice != null
              ? `₱${Number(currentPrice).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg`
              : "-/kg"}
          </span>
        </div>
        {crop.phase === "completed" && crop.actualSellingPrice ? (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[var(--hw-neutral-900)]">{t("farmer.crops.sold_at", {}, "Sold at")}</span>
            <span className="font-medium text-[var(--hw-neutral-900)]">₱{crop.actualSellingPrice}/kg</span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[var(--hw-neutral-900)]">{t("farmer.crops.estimated_profit", {}, "Estimated Profit")}</span>
            <span className="font-semibold text-emerald-700">{profit || "-"}</span>
          </div>
        )}
      </div>

      {/* Next action + view button */}
      <div className="px-4 py-3 border-t border-[var(--hw-neutral-100)] flex items-center justify-between gap-3">
        <p className="text-[12px] text-[var(--hw-neutral-900)] leading-snug flex-1">{action || "-"}</p>
        <button
          onClick={() => onView(crop.id)}
          className="flex-shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
        >
          {isDraft ? t("farmer.draft.continue_btn", {}, "Continue draft") : t("farmer.crops.view_crop", {}, "View crop")}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>;
};
const MyCropsEmpty = ({ stage, onNew }) => {
  const { t } = useLanguage();
  const isDraftStage = stage === "drafts" || stage === "draft";
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-4">
      <Sprout className="w-10 h-10 text-[var(--hw-neutral-300)]" />
      <p className="font-semibold text-[var(--hw-neutral-700)]">
        {isDraftStage
          ? t("farmer.empty.no_drafts", {}, "No draft crop plans.")
          : t("farmer.empty.no_crops", {}, "No crop plans yet.")}
      </p>
      <p className="text-sm text-[var(--hw-neutral-900)] max-w-xs">
        {isDraftStage
          ? t("farmer.empty.no_drafts_desc", {}, "Incomplete crop assessments will appear here.")
          : t("farmer.dashboard.add_crop_plan_desc", {}, "Add a crop plan to start tracking your farm.")}
      </p>
      <button
        onClick={onNew}
        className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
      >
        <Plus className="w-4 h-4" />
        {t("farmer.crops.add_crop_btn", {}, "Add crop")}
      </button>
    </div>
  );
};
function MyCropsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { crops } = useCrops();
  const [stageFilter, setStageFilter] = useState("all");
  const [toastMessage, setToastMessage] = useState(
    () => location.state?.message || (location.state?.draftSaved ? "Assessment draft saved. Continue editing Step 1 anytime." : null)
  );
  const [isToastFading, setIsToastFading] = useState(false);

  useEffect(() => {
    if (!toastMessage) return;

    if (location.state?.message || location.state?.draftSaved) {
      window.history.replaceState({}, document.title);
    }

    const fadeTimer = setTimeout(() => {
      setIsToastFading(true);
    }, 4000);

    const removeTimer = setTimeout(() => {
      setToastMessage(null);
      setIsToastFading(false);
    }, 4700);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [toastMessage]);

  const handleDismissToast = () => {
    setIsToastFading(true);
    setTimeout(() => {
      setToastMessage(null);
      setIsToastFading(false);
    }, 300);
  };

  const localDraft = useMemo(() => {
    try {
      const raw = localStorage.getItem("harvestwise_assessment_draft");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.isDraft) return null;
      if (parsed.draftId && crops.some((c) => c.id === parsed.draftId)) return null;
      return {
        id: parsed.draftId || "local_draft",
        commodity: parsed.commodity || "",
        commodityName: parsed.commodityName || (parsed.commodity ? (parsed.commodity.charAt(0).toUpperCase() + parsed.commodity.slice(1)) : "Unspecified Crop"),
        variant: parsed.variant || "",
        plantingDate: parsed.plantingDate || null,
        harvestDate: parsed.harvestDate || null,
        harvestQuantity: parsed.harvestQuantity ? Number(parsed.harvestQuantity) : 0,
        totalCost: parsed.totalCost || parsed.simpleCost ? Number(parsed.totalCost || parsed.simpleCost) : 0,
        currentPrice: null,
        status: "Draft",
        phase: "draft",
        isDraft: true,
      };
    } catch {
      return null;
    }
  }, [crops]);

  const { data: profileData } = useQuery({
    queryKey: ["farmer", "profile"],
    queryFn: fetchFarmerProfile,
    staleTime: 1000 * 60 * 5,
  });

  const preferredCrops = useMemo(() => {
    return profileData?.preferred_crops || profileData?.preferredCrops || [];
  }, [profileData]);

  const allCrops = useMemo(() => {
    let list = crops;
    if (localDraft && !crops.some((c) => c.id === localDraft.id)) {
      list = [localDraft, ...crops];
    }
    return sortWithPreferredFirst(list, preferredCrops);
  }, [crops, localDraft, preferredCrops]);

  const visible = useMemo(
    () => allCrops.filter((c) => matchesStage(c, stageFilter)),
    [allCrops, stageFilter]
  );
  const tabCount = (tab) => allCrops.filter((c) => matchesStage(c, tab)).length;
  return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">

        {/* Draft Saved Toast */}
        {toastMessage && (
          <div
            className={`bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center justify-between gap-3 text-sm text-emerald-900 shadow-xs transition-all duration-700 ease-out transform ${
              isToastFading
                ? "opacity-0 -translate-y-2 max-h-0 py-0 my-0 overflow-hidden pointer-events-none"
                : "opacity-100 translate-y-0 max-h-24"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
              <p className="font-medium">{toastMessage}</p>
            </div>
            <button
              type="button"
              onClick={handleDismissToast}
              className="text-emerald-700 hover:text-emerald-900 p-1"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
              {t("nav.my_crops", {}, "My Crops")}
            </h1>
            <p className="text-[15px] text-[var(--hw-neutral-900)] mt-1">
              {t("farmer.crops.subtitle", {}, "Track your crop plans, planted crops, and harvest records.")}
            </p>
          </div>
          <button
            onClick={() => navigate("/farmer/assess")}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors shadow-[var(--shadow-xs)]"
          >
            <Plus className="w-4 h-4" />
            <span>{t("farmer.crops.add_crop_btn", {}, "Add crop")}</span>
          </button>
        </div>

        {/* Stage filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {STAGE_TABS.map((tab) => {
            const count = tabCount(tab.id);
            const isActive = stageFilter === tab.id;
            return <button
              key={tab.id}
              onClick={() => setStageFilter(tab.id)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${isActive ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`}
            >
              {t(tab.key, {}, tab.label)}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-green-600 text-white" : "bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)]"}`}>
                {count}
              </span>
            </button>;
          })}
        </div>

        {/* Crop list */}
        {visible.length === 0 ? <MyCropsEmpty stage={stageFilter} onNew={() => navigate("/farmer/assess")} /> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible.map((crop) => (
              <MyCropCard
                key={crop.id}
                crop={crop}
                isPreferred={isPreferredCrop(crop, preferredCrops)}
                onView={(id) => {
                  if (crop.phase === "draft" || crop.status === "Draft" || crop.isDraft) {
                    navigate(id === "local_draft" ? "/farmer/assess" : `/farmer/assess?resumeDraft=${id}`);
                  } else {
                    navigate(`/farmer/crops/${id}`);
                  }
                }}
              />
            ))}
          </div>}
    </div>;
}
export {
  MyCropsPage as default,
  MyCropCard,
  MyCropsEmpty,
  matchesStage,
  STAGE_TABS
};
