import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
const Step2FarmHarvest = ({ data, onChange, errors }) => {
  const [helpOpen, setHelpOpen] = useState(false);
  return <div className="space-y-6">
      {
    /* Farm area */
  }
      <div>
        <label className="block text-sm font-semibold text-[var(--hw-neutral-700)] mb-1.5">
          Farm area
        </label>
        <div className="flex gap-2">
          <input
    type="number"
    min="0"
    step="any"
    value={data.farmArea}
    onChange={(e) => onChange({ farmArea: e.target.value === "" ? "" : Number(e.target.value) })}
    placeholder="e.g. 500"
    className={`
              flex-1 px-3 py-2.5 rounded-xl border text-sm outline-none transition
              focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)]
              ${errors.farmArea ? "border-red-400 bg-red-50" : "border-[var(--hw-neutral-200)] bg-white"}
            `}
  />
          {
    /* Unit toggle */
  }
          <div className="flex rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden flex-shrink-0">
            {["sqm", "ha"].map((u) => <button
    key={u}
    type="button"
    onClick={() => onChange({ farmAreaUnit: u })}
    className={`px-3 py-2.5 text-sm font-medium transition-colors ${data.farmAreaUnit === u ? "bg-[var(--hw-green-700)] text-white" : "bg-white text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                {u === "sqm" ? "sq m" : "ha"}
              </button>)}
          </div>
        </div>
        {errors.farmArea && <p className="mt-1.5 text-sm text-red-600">{errors.farmArea}</p>}
      </div>

      {
    /* Expected harvest quantity */
  }
      <div>
        <label
    htmlFor="harvest-qty"
    className="block text-sm font-semibold text-[var(--hw-neutral-700)] mb-1.5"
  >
          Expected harvest quantity
        </label>
        <div className="flex gap-2">
          <input
    id="harvest-qty"
    type="number"
    min="0"
    step="any"
    value={data.harvestQuantity}
    onChange={(e) => onChange({ harvestQuantity: e.target.value === "" ? "" : Number(e.target.value) })}
    placeholder="e.g. 600"
    className={`
              flex-1 px-3 py-2.5 rounded-xl border text-sm outline-none transition
              focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)]
              ${errors.harvestQuantity ? "border-red-400 bg-red-50" : "border-[var(--hw-neutral-200)] bg-white"}
            `}
  />
          <div className="flex items-center px-3 py-2.5 bg-[var(--hw-neutral-100)] border border-[var(--hw-neutral-200)] rounded-xl text-sm text-[var(--hw-neutral-900)] flex-shrink-0">
            kg
          </div>
        </div>
        {errors.harvestQuantity && <p className="mt-1.5 text-sm text-red-600">{errors.harvestQuantity}</p>}
        <p className="mt-1.5 text-xs text-[var(--hw-neutral-700)]">
          Enter your best estimate. This does not need to be exact.
        </p>
      </div>

      {
    /* Expandable help */
  }
      <div className="rounded-2xl border border-[var(--hw-neutral-200)] bg-white overflow-hidden shadow-[var(--shadow-xs)]">
        <button
    type="button"
    onClick={() => setHelpOpen((v) => !v)}
    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
  >
          <span className="text-sm font-medium text-[var(--hw-neutral-700)]">
            How can I estimate my harvest?
          </span>
          {helpOpen ? <ChevronUp className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" />}
        </button>
        {helpOpen && <div className="px-4 pb-4 border-t border-[var(--hw-neutral-100)]">
            <p className="mt-3 text-sm text-[var(--hw-neutral-900)] leading-relaxed">
              You may use your previous harvest, farm records, or advice from an agriculturist.
            </p>
          </div>}
      </div>
    </div>;
};
export {
  Step2FarmHarvest
};
