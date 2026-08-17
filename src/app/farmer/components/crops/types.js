import { Sprout, Clock, Leaf, Scissors, CheckCircle2, PauseCircle } from "lucide-react";
const PHASE_CONFIG = {
  planning: { label: "Planning", icon: Sprout, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  "on-hold": { label: "On Hold", icon: PauseCircle, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  growing: { label: "Planted", icon: Leaf, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  "pre-harvest": { label: "Pre-Harvest", icon: Clock, color: "text-lime-700", bg: "bg-lime-50", border: "border-lime-200" },
  harvested: { label: "Harvesting", icon: Scissors, color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-[var(--hw-neutral-700)]", bg: "bg-[var(--hw-neutral-100)]", border: "border-[var(--hw-neutral-200)]" }
};
const LIFECYCLE_PHASES = [
  "planning",
  "growing",
  "pre-harvest",
  "harvested",
  "completed"
];
const MOCK_CROPS = [
  {
    id: "crop-1",
    commodity: "kamatis",
    commodityName: "Kamatis",
    variant: "Diamante Big",
    phase: "growing",
    plantingDate: "May 5, 2026",
    harvestDate: "Jul 26, 2026",
    farmArea: 500,
    farmAreaUnit: "sqm",
    harvestQuantity: 600,
    totalCost: 25200,
    breakEvenPrice: 42,
    currentPrice: 85,
    condition: "Heavy rain may affect the farm this week.",
    nextMilestone: "Expected harvest in 32 days",
    lastUpdated: "Jun 24, 2026 at 7:30 AM"
  },
  {
    id: "crop-2",
    commodity: "talong",
    commodityName: "Talong",
    phase: "growing",
    isOnHold: true,
    holdReason: "Waiting to reassess market conditions before continuing planned crop activities.",
    holdDate: "Aug 2, 2026",
    plantingDate: "Jun 20, 2026",
    harvestDate: "Sep 15, 2026",
    farmArea: 300,
    farmAreaUnit: "sqm",
    harvestQuantity: 350,
    totalCost: 14e3,
    breakEvenPrice: 40,
    currentPrice: 60,
    condition: "Market conditions under review.",
    nextMilestone: "Resume when market conditions improve",
    lastUpdated: "Jun 24, 2026 at 7:30 AM"
  },
  {
    id: "crop-3",
    commodity: "repolyo",
    commodityName: "Repolyo",
    variant: "Wakamini",
    phase: "completed",
    plantingDate: "Mar 10, 2026",
    harvestDate: "Jun 1, 2026",
    farmArea: 400,
    farmAreaUnit: "sqm",
    harvestQuantity: 450,
    totalCost: 16200,
    breakEvenPrice: 36,
    currentPrice: 45,
    condition: "Crop cycle completed.",
    nextMilestone: "Crop cycle completed",
    lastUpdated: "Jun 24, 2026 at 7:30 AM",
    actualHarvestQty: 450,
    actualSellingPrice: 38
  }
];
const PHASE_TRANSITIONS = {
  planning: ["growing"],
  growing: ["pre-harvest"],
  "pre-harvest": ["harvested"],
  harvested: ["completed"]
};
function formatPeso(amount) {
  return `\u20B1${amount.toLocaleString("en-PH")}`;
}
export {
  LIFECYCLE_PHASES,
  MOCK_CROPS,
  PHASE_CONFIG,
  PHASE_TRANSITIONS,
  formatPeso
};
