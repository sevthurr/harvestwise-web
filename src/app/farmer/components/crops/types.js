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
const MOCK_CROPS = [];
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
