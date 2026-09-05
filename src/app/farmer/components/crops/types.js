import { Sprout, Clock, Leaf, Scissors, CheckCircle2, PauseCircle } from "lucide-react";
import { PHASE_CODES, normalizePhaseCode } from "../../utils/farmerCodes";

const BASE_PHASE_CONFIG = {
  [PHASE_CODES.PLANNING]: { labelKey: "farmer.phases.planning", label: "Planning", icon: Sprout, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  [PHASE_CODES.ON_HOLD]: { labelKey: "farmer.phases.on_hold", label: "On Hold", icon: PauseCircle, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  [PHASE_CODES.GROWING]: { labelKey: "farmer.phases.planted", label: "Planted", icon: Leaf, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  [PHASE_CODES.PRE_HARVEST]: { labelKey: "farmer.phases.pre_harvest", label: "Pre-Harvest", icon: Clock, color: "text-lime-700", bg: "bg-lime-50", border: "border-lime-200" },
  [PHASE_CODES.HARVESTED]: { labelKey: "farmer.phases.harvesting", label: "Harvesting", icon: Scissors, color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" },
  [PHASE_CODES.COMPLETED]: { labelKey: "farmer.phases.completed", label: "Completed", icon: CheckCircle2, color: "text-[var(--hw-neutral-700)]", bg: "bg-[var(--hw-neutral-100)]", border: "border-[var(--hw-neutral-200)]" }
};

const PHASE_CONFIG = {
  ...BASE_PHASE_CONFIG,
  // Backward compatibility string aliases
  planning: BASE_PHASE_CONFIG[PHASE_CODES.PLANNING],
  "on-hold": BASE_PHASE_CONFIG[PHASE_CODES.ON_HOLD],
  growing: BASE_PHASE_CONFIG[PHASE_CODES.GROWING],
  "pre-harvest": BASE_PHASE_CONFIG[PHASE_CODES.PRE_HARVEST],
  harvested: BASE_PHASE_CONFIG[PHASE_CODES.HARVESTED],
  completed: BASE_PHASE_CONFIG[PHASE_CODES.COMPLETED]
};

export function getPhaseConfig(phase) {
  const code = normalizePhaseCode(phase) || PHASE_CODES.COMPLETED;
  return BASE_PHASE_CONFIG[code] || BASE_PHASE_CONFIG[PHASE_CODES.COMPLETED];
}

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
  harvested: ["completed"],
  [PHASE_CODES.PLANNING]: ["growing"],
  [PHASE_CODES.GROWING]: ["pre-harvest"],
  [PHASE_CODES.PRE_HARVEST]: ["harvested"],
  [PHASE_CODES.HARVESTED]: ["completed"]
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
