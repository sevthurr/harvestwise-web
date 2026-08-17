import { useState } from "react";
import {
  Pencil,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { getTotalCost, formatPeso, COMMODITY_OPTIONS, CROP_DURATIONS } from "./types";
const ReviewRow = ({ label, value, onEdit }) => <div className="flex items-start justify-between gap-3 py-2.5">
    <div className="min-w-0">
      <p className="text-xs text-[var(--hw-neutral-700)]">{label}</p>
      <p className="text-sm font-medium text-[var(--hw-neutral-900)] mt-0.5">{value || "\u2014"}</p>
    </div>
    <button
  type="button"
  onClick={onEdit}
  className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors mt-0.5"
>
      <Pencil className="w-3 h-3" />
      Edit
    </button>
  </div>;
const Step4ReviewBreakEven = ({
  data,
  onChange,
  onEditStep,
  errors
}) => {
  const [calcOpen, setCalcOpen] = useState(false);
  const commodityLabel = COMMODITY_OPTIONS.find((c) => c.id === data.commodity)?.name ?? "\u2014";
  const displayLabel = data.variant ? `${commodityLabel} (${data.variant})` : commodityLabel;
  const totalCost = getTotalCost(data);
  const harvestQty = typeof data.harvestQuantity === "number" && data.harvestQuantity > 0 ? data.harvestQuantity : null;
  const breakEven = harvestQty ? Math.ceil(totalCost / harvestQty) : null;
  const sellingPrice = typeof data.sellingPrice === "number" && data.sellingPrice > 0 ? data.sellingPrice : null;
  const revenue = sellingPrice && harvestQty ? sellingPrice * harvestQty : null;
  const earnings = revenue !== null ? revenue - totalCost : null;
  const farmAreaText = data.farmArea !== "" ? `${data.farmArea} ${data.farmAreaUnit === "sqm" ? "sq m" : "ha"}` : "\u2014";
  return <div className="space-y-5">
      {
    /* 1. Cost to recover */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
        <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
          Cost to recover per kg
        </p>

        {breakEven !== null ? <>
            <p className="font-semibold text-[var(--hw-neutral-900)] leading-snug">
              You need to sell{" "}
              <span className="text-[var(--hw-green-800)]">{displayLabel}</span> for at least{" "}
              <span className="text-[var(--hw-green-800)]">{formatPeso(breakEven)}/kg</span> to
              recover your expected costs.
            </p>
            <p className="text-sm text-[var(--hw-neutral-900)] leading-relaxed">
              A selling price above this amount means estimated profit. Below means a possible loss.
            </p>

            {
    /* Expandable calculation */
  }
            <div className="rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden">
              <button
    type="button"
    onClick={() => setCalcOpen((v) => !v)}
    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
  >
                <span className="text-sm font-medium text-[var(--hw-neutral-900)]">
                  How was this calculated?
                </span>
                {calcOpen ? <ChevronUp className="w-4 h-4 text-[var(--hw-neutral-400)]" /> : <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-400)]" />}
              </button>
              {calcOpen && <div className="px-3 pb-3 border-t border-[var(--hw-neutral-100)]">
                  <p className="mt-2.5 text-sm text-[var(--hw-neutral-900)] leading-relaxed">
                    HarvestWise divided your estimated total cost of{" "}
                    <strong>{formatPeso(totalCost)}</strong> by your expected harvest of{" "}
                    <strong>{data.harvestQuantity} kilograms</strong>.
                  </p>
                </div>}
            </div>
          </> : <div className="flex items-start gap-2 text-amber-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              Enter an expected harvest quantity to calculate your break-even price.
            </p>
          </div>}
      </div>

      {
    /* 2. Optional selling price */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
        <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
          Optional: expected selling price
        </p>
        <p className="text-xs text-[var(--hw-neutral-700)] leading-relaxed">
          You may leave this blank. Your recommendation will use the forecasted market price as reference.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--hw-neutral-700)] flex-shrink-0">₱</span>
          <input
    type="number"
    min="0"
    step="any"
    value={data.sellingPrice}
    onChange={(e) => onChange({ sellingPrice: e.target.value === "" ? "" : Number(e.target.value) })}
    placeholder="e.g. 50"
    className="flex-1 px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition bg-white"
  />
          <span className="text-sm text-[var(--hw-neutral-700)] flex-shrink-0">/ kg</span>
        </div>
        {errors.sellingPrice && <p className="text-sm text-red-600">{errors.sellingPrice}</p>}

        {
    /* Estimated results */
  }
        {revenue !== null && earnings !== null && <div className="space-y-2 pt-2 border-t border-[var(--hw-neutral-100)]">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--hw-neutral-900)]">Estimated revenue</span>
              <span className="text-sm font-semibold text-[var(--hw-neutral-900)]">
                {formatPeso(revenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--hw-neutral-900)]">Estimated earnings / loss</span>
              <div className={`flex items-center gap-1 text-sm font-semibold ${earnings >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {earnings >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {earnings >= 0 ? "+" : ""}{formatPeso(earnings)}
              </div>
            </div>
            <p className="text-xs text-[var(--hw-neutral-700)]">All amounts are estimates.</p>
          </div>}
      </div>

      {
    /* 3. Review of inputs */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--hw-neutral-100)]">
          <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Review of inputs</p>
        </div>
        <div className="px-4 divide-y divide-[var(--hw-neutral-100)]">
          <ReviewRow label="Vegetable" value={displayLabel} onEdit={() => onEditStep(1)} />
          {data.variant && <ReviewRow label="Variety" value={data.variant} onEdit={() => onEditStep(1)} />}
          <ReviewRow label="Target planting date" value={data.plantingDate} onEdit={() => onEditStep(1)} />
          <ReviewRow label="Expected harvest date" value={data.harvestDate} onEdit={() => onEditStep(1)} />
          {data.commodity && CROP_DURATIONS[data.commodity] && <ReviewRow label="Typical crop duration" value={CROP_DURATIONS[data.commodity].label} onEdit={() => onEditStep(1)} />}
          <ReviewRow label="Farm area" value={farmAreaText} onEdit={() => onEditStep(2)} />
          <ReviewRow
    label="Expected harvest"
    value={data.harvestQuantity !== "" ? `${data.harvestQuantity} kg` : "\u2014"}
    onEdit={() => onEditStep(2)}
  />
          <ReviewRow
    label="Total production cost"
    value={totalCost > 0 ? formatPeso(totalCost) : "\u2014"}
    onEdit={() => onEditStep(3)}
  />
          <ReviewRow
    label="Estimated farmgate price"
    value={data.useFarmgate && data.farmgatePrice !== "" && Number(data.farmgatePrice) > 0 ? `\u20B1${data.farmgatePrice}/kg` : "Not set"}
    onEdit={() => onEditStep(3)}
  />
        </div>
      </div>
    </div>;
};
export {
  Step4ReviewBreakEven
};
