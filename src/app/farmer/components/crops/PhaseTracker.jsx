import React from "react";
import { Sprout, Leaf, Scissors, CheckCircle2, Check, PauseCircle } from "lucide-react";
const TIMELINE_STEPS = [
  { id: "planning", label: "Planning", Icon: Sprout },
  { id: "planted", label: "Planted", Icon: Leaf },
  { id: "harvesting", label: "Harvesting", Icon: Scissors },
  { id: "completed", label: "Completed", Icon: CheckCircle2 }
];
function phaseToStep(phase) {
  switch (phase) {
    case "planning":
      return 0;
    case "on-hold":
      return 0;
    case "growing":
      return 1;
    case "pre-harvest":
      return 1;
    case "harvested":
      return 2;
    case "completed":
      return 3;
    default:
      return 0;
  }
}
const PhaseTracker = ({ currentPhase }) => {
  const currentStep = phaseToStep(currentPhase);
  const isOnHold = currentPhase === "on-hold";
  const isPreHarvest = currentPhase === "pre-harvest";
  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Crop lifecycle</p>
        {isOnHold && <div className="flex items-center gap-1 text-amber-600">
            <PauseCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-[11px] font-medium">On Hold</span>
          </div>}
      </div>

      {
    /* 4-step timeline — no scrolling, equal widths */
  }
      <div className="flex items-start w-full mt-3">
        {TIMELINE_STEPS.map(({ id, label, Icon }, idx) => {
    const isDone = idx < currentStep;
    const isCurrent = idx === currentStep;
    const isUpcoming = idx > currentStep;
    return <React.Fragment key={id}>
              {
      /* Step node */
    }
              <div className="flex flex-col items-center flex-1 min-w-0">
                {
      /* Circle */
    }
                <div className={`
                  w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                  ${isDone ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)]" : ""}
                  ${isCurrent ? "bg-white border-[var(--hw-green-700)]" : ""}
                  ${isUpcoming ? "bg-white border-[var(--hw-neutral-300)]" : ""}
                `}>
                  {isDone ? <Check className="w-4 h-4 text-white" /> : <Icon className={`w-4 h-4 ${isCurrent ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-300)]"}`} />}
                </div>

                {
      /* Label */
    }
                <div className="text-center mt-1.5 px-0.5 w-full">
                  <p className={`text-[11px] sm:text-[12px] font-medium leading-tight ${isCurrent ? "text-[var(--hw-green-700)]" : isDone ? "text-[var(--hw-green-600)]" : "text-[var(--hw-neutral-400)]"}`}>
                    {label}
                  </p>
                  {
      /* Secondary indicator for Pre-Harvest within Planted */
    }
                  {isCurrent && isPreHarvest && id === "planted" && <p className="text-[10px] text-lime-600 font-medium mt-0.5">Pre-Harvest</p>}
                </div>
              </div>

              {
      /* Connector line (not after last step) */
    }
              {idx < TIMELINE_STEPS.length - 1 && <div className="flex-shrink-0 w-4 sm:w-6 mt-4">
                  <div className={`h-0.5 rounded-full transition-colors ${idx < currentStep ? "bg-[var(--hw-green-700)]" : "bg-[var(--hw-neutral-200)]"}`} />
                </div>}
            </React.Fragment>;
  })}
      </div>
    </div>;
};
export {
  PhaseTracker
};
