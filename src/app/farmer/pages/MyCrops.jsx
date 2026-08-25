import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Plus, Sprout, ChevronRight } from "lucide-react";
import { useCrops } from "../components/crops/CropsContext";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { PhasePill } from "../components/crops/CropCard";
const STAGE_TABS = [
  { id: "all", label: "All" },
  { id: "planning", label: "Planning" },
  { id: "planted", label: "Planted" },
  { id: "harvesting", label: "Harvesting" },
  { id: "completed", label: "Completed" }
];
function matchesStage(crop, tab) {
  if (tab === "all") return true;
  if (tab === "planning") return crop.phase === "planning" || crop.phase === "on-hold";
  if (tab === "planted") return crop.phase === "growing";
  if (tab === "harvesting") return crop.phase === "pre-harvest" || crop.phase === "harvested";
  if (tab === "completed") return crop.phase === "completed";
  return false;
}
function profitRange(crop) {
  if (crop.phase === "completed") return null;
  if (crop.profitLower != null && crop.profitUpper != null) {
    return `\u20B1${Number(crop.profitLower).toLocaleString("en-PH")}\u2013\u20B1${Number(crop.profitUpper).toLocaleString("en-PH")}`;
  }
  if (crop.currentPrice != null && crop.breakEvenPrice != null && crop.harvestQuantity != null) {
    const margin = crop.currentPrice - crop.breakEvenPrice;
    const midProfit = margin * crop.harvestQuantity;
    if (midProfit <= 0) return null;
    const lo = Math.floor(midProfit * 0.85 / 1e3) * 1e3;
    const hi = Math.ceil(midProfit * 1.15 / 1e3) * 1e3;
    return `\u20B1${lo.toLocaleString("en-PH")}\u2013\u20B1${hi.toLocaleString("en-PH")}`;
  }
  return null;
}
function nextActionText(crop) {
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
const MyCropCard = ({ crop, onView }) => {
  const currentPrice = crop.currentPrice;
  const profit = profitRange(crop);
  const action = crop.isOnHold ? "Resume when market conditions improve" : crop.phase === "completed" ? "Crop cycle completed" : nextActionText(crop);
  const displayName = crop.commodityName ? (crop.variant ? `${crop.commodityName} (${crop.variant})` : crop.commodityName) : "-";
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      {/* Top: icon + name + status */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <CommodityIllustration commodityId={crop.commodity} className="w-11 h-11 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--hw-neutral-900)] leading-tight">
            {displayName}
          </p>
        </div>
        <PhasePill phase={crop.phase} isOnHold={crop.isOnHold} />
      </div>

      {/* Details */}
      <div className="px-4 pb-3 space-y-1.5">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-[var(--hw-neutral-900)]">Harvest on</span>
          <span className="font-medium text-[var(--hw-neutral-900)]">{crop.harvestDate || "-"}</span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-[var(--hw-neutral-900)]">Current price</span>
          <span className="font-medium text-[var(--hw-neutral-900)]">{currentPrice != null ? `₱${currentPrice}/kg` : "-/kg"}</span>
        </div>
        {crop.phase === "completed" && crop.actualSellingPrice ? (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[var(--hw-neutral-900)]">Sold at</span>
            <span className="font-medium text-[var(--hw-neutral-900)]">₱{crop.actualSellingPrice}/kg</span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[var(--hw-neutral-900)]">Estimated Profit</span>
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
          View crop
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>;
};
const MyCropsEmpty = ({ stage, onNew }) => {
  const messages = {
    all: { heading: "No crop plans yet.", sub: "Add a crop plan to start tracking your farm." },
    planning: { heading: "No crops in planning", sub: "Save a planting assessment to create your first crop plan." },
    planted: { heading: "No planted crops", sub: "Mark a plan as planted to track an active crop." },
    harvesting: { heading: "No crops harvesting", sub: "Crops approaching harvest will appear here." },
    completed: { heading: "No completed crops", sub: "Completed crops and their results will appear here." }
  };
  const { heading, sub } = messages[stage] || messages.all;
  return <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-4">
      <Sprout className="w-10 h-10 text-[var(--hw-neutral-300)]" />
      <p className="font-semibold text-[var(--hw-neutral-700)]">{heading}</p>
      <p className="text-sm text-[var(--hw-neutral-900)] max-w-xs">{sub}</p>
      <button
        onClick={onNew}
        className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add crop
      </button>
    </div>;
};
function MyCropsPage() {
  const navigate = useNavigate();
  const { crops } = useCrops();
  const [stageFilter, setStageFilter] = useState("all");
  const visible = useMemo(
    () => crops.filter((c) => matchesStage(c, stageFilter)),
    [crops, stageFilter]
  );
  const tabCount = (tab) => crops.filter((c) => matchesStage(c, tab)).length;
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-4xl space-y-5">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">My Crops</h1>
            <p className="text-[15px] text-[var(--hw-neutral-900)] mt-1">
              Track your crop plans, planted crops, and harvest records.
            </p>
          </div>
          <button
            onClick={() => navigate("/farmer/assess")}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors shadow-[var(--shadow-xs)]"
          >
            <Plus className="w-4 h-4" />
            <span>Add crop</span>
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
              {tab.label}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-green-600 text-white" : "bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)]"}`}>
                {count}
              </span>
            </button>;
          })}
        </div>

        {
    /* Crop list */
  }
        {visible.length === 0 ? <MyCropsEmpty stage={stageFilter} onNew={() => navigate("/farmer/assess")} /> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible.map((crop) => <MyCropCard key={crop.id} crop={crop} onView={(id) => navigate(`/farmer/crops/${id}`)} />)}
          </div>}
      </div>
    </div>;
}
export {
  MyCropsPage as default
};
