import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { formatPeso } from "./types";
const CropInfoDisclosure = ({ crop }) => {
  const [open, setOpen] = useState(false);
  const rows = [
    { label: "Target planting date", value: crop.plantingDate },
    { label: "Farm area", value: `${crop.farmArea} ${crop.farmAreaUnit === "sqm" ? "sq m" : "ha"}` },
    { label: "Expected harvest date", value: crop.harvestDate },
    { label: "Expected yield", value: `${crop.harvestQuantity} kg` },
    { label: "Estimated production cost", value: formatPeso(crop.totalCost) },
    { label: "Break-even price", value: `${formatPeso(crop.breakEvenPrice)}/kg` },
    { label: "Market source", value: "Bangkerohan Public Market" },
    { label: "Last data update", value: crop.lastUpdated }
  ];
  return <div className="rounded-2xl border border-[var(--hw-neutral-200)] bg-white shadow-[var(--shadow-xs)] overflow-hidden">
      <button
    onClick={() => setOpen((v) => !v)}
    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--hw-neutral-900)]">
          <Info className="w-4 h-4" />
          Crop information
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[var(--hw-neutral-400)]" /> : <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-400)]" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-[var(--hw-neutral-100)]">
          <dl className="mt-3 space-y-2">
            {rows.map((r) => <div key={r.label} className="flex justify-between gap-4 flex-wrap">
                <dt className="text-xs text-[var(--hw-neutral-700)]">{r.label}</dt>
                <dd className="text-xs font-medium text-[var(--hw-neutral-700)]">{r.value}</dd>
              </div>)}
          </dl>
        </div>}
    </div>;
};
export {
  CropInfoDisclosure
};
