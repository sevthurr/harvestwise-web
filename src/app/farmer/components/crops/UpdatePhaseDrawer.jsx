import { useState, useEffect } from "react";
import { X, Check, PauseCircle, Play, ChevronDown } from "lucide-react";
import { PHASE_CONFIG, PHASE_TRANSITIONS, formatPeso } from "./types";
import { PHASE_CODES, normalizePhaseCode } from "../../utils/farmerCodes";
import { useLanguage } from "../../../global/contexts/LanguageContext";
import { suggestHarvestDate } from "../recommend/types";

function toDateInputValue(val) {
  if (!val) return "";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    return val.slice(0, 10);
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function harvestWindowDays(start, end) {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  return Math.max(1, Math.round((e - s) / 864e5) + 1);
}

const HOLD_REASONS = [
  { key: "farmer.cropCycle.hold_reason_market", value: "Waiting for better market conditions", fallback: "Waiting for better market conditions" },
  { key: "farmer.cropCycle.hold_reason_weather", value: "Weather conditions", fallback: "Weather conditions" },
  { key: "farmer.cropCycle.hold_reason_budget", value: "Budget or input constraints", fallback: "Budget or input constraints" },
  { key: "farmer.cropCycle.hold_reason_seed", value: "Seed/material availability", fallback: "Seed/material availability" },
  { key: "farmer.cropCycle.hold_reason_labor", value: "Labor or land availability", fallback: "Labor or land availability" },
  { key: "farmer.cropCycle.hold_reason_time", value: "Need more time to reassess", fallback: "Need more time to reassess" },
  { key: "farmer.cropCycle.hold_reason_other", value: "Other", fallback: "Other" }
];

const UpdatePhaseDrawer = ({
  open,
  crop,
  onClose,
  onConfirm,
  submitting = false,
  mode = "update-phase",
}) => {
  const { t } = useLanguage();
  const normPhase = normalizePhaseCode(crop?.phase) || crop?.phase;
  const transitions = PHASE_TRANSITIONS[normPhase] ?? PHASE_TRANSITIONS[crop?.phase] ?? [];
  const isCompleted = normPhase === PHASE_CODES.COMPLETED || crop?.phase === "completed";
  const [selectedPhase, setSelectedPhase] = useState(() => {
    if (mode === "confirm-planting") return "growing";
    return transitions.length === 1 ? transitions[0] : null;
  });
  const [fields, setFields] = useState({});
  const [view, setView] = useState("main");
  const [holdReason, setHoldReason] = useState("");
  const [holdOther, setHoldOther] = useState("");

  const cropIdentifier = crop?.commodityName || crop?.commodity || crop?.commodityId;
  const cropVariant = crop?.variant || crop?.variety;

  useEffect(() => {
    if (!open || !crop) return;
    if (mode === "hold") {
      setView("hold-reason");
    } else {
      setView("main");
    }
    setHoldReason("");
    setHoldOther("");
    if (mode === "confirm-planting") {
      setSelectedPhase("growing");
    } else if (transitions.length === 1) {
      setSelectedPhase(transitions[0]);
    }
    const initialPlanting = toDateInputValue(crop.rawPlantingDate || crop.plantingDate) || new Date().toISOString().split("T")[0];
    const initialArea = crop.farmArea != null && crop.farmArea !== "" ? Math.trunc(Number(crop.farmArea)) : "";
    let initialStart = toDateInputValue(crop.rawHarvestWindowStart || crop.harvestWindowStart || crop.harvest_window_start);
    let initialEnd = toDateInputValue(crop.rawHarvestWindowEnd || crop.harvestWindowEnd || crop.harvest_window_end);
    let initialHarvest = toDateInputValue(crop.rawHarvestDate || crop.harvestDate);

    if ((!initialStart || !initialEnd || initialStart === initialEnd) && initialPlanting) {
      const suggestion = suggestHarvestDate(initialPlanting, cropIdentifier, cropVariant);
      if (suggestion?.minDate) {
        if (!initialStart || initialStart === initialEnd) initialStart = suggestion.minDate;
        if (!initialEnd || initialStart === initialEnd) initialEnd = suggestion.maxDate || suggestion.minDate;
      }
    }
    if (!initialStart && initialHarvest) initialStart = initialHarvest;
    if (!initialEnd && initialHarvest) initialEnd = initialHarvest;
    if (!initialHarvest && initialEnd) initialHarvest = initialEnd;

    const overallTotalCost = crop?.totalCost != null && crop?.totalCost !== ""
      ? Number(crop.totalCost)
      : (crop?.productionCost != null && crop?.productionCost !== ""
          ? Number(crop.productionCost)
          : (Array.isArray(crop?.productionCosts) && crop.productionCosts.length > 0
              ? crop.productionCosts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
              : 0));
    const initialCompletionDate = toDateInputValue(crop.actualHarvestDate)
      || toDateInputValue(crop.rawHarvestDate || crop.harvestDate)
      || new Date().toISOString().split("T")[0];

    setFields({
      actualPlantingDate: initialPlanting,
      actualPlantedArea: initialArea,
      updatedHarvestDate: initialHarvest,
      updatedHarvestWindowStart: initialStart || "",
      updatedHarvestWindowEnd: initialEnd || "",
      expectedHarvestQty: crop.expectedHarvestQty ?? crop.harvestQuantity ?? "",
      actualHarvestDate: toDateInputValue(crop.actualHarvestDate) || new Date().toISOString().split("T")[0],
      actualHarvestedQty: crop.actualHarvestQty ?? crop.partialHarvestQty ?? "",
      completionDate: initialCompletionDate,
      finalProductionCost: overallTotalCost > 0 ? overallTotalCost : (crop.totalCost ?? ""),
      finalQtySold: crop.actualHarvestQty ?? crop.partialHarvestQty ?? crop.harvestQuantity ?? "",
      avgSellingPrice: crop.actualSellingPrice != null
        ? Number(crop.actualSellingPrice).toFixed(2)
        : (crop.farmgatePrice != null ? Number(crop.farmgatePrice).toFixed(2) : ""),
      notes: crop.notes ?? "",
      updatedTotalCost: "",
      additionalCost: "",
    });
  }, [open, crop?.id]);

  if (!open) return null;

  const set = (patch) => setFields((f) => ({ ...f, ...patch }));
  const isOther = holdReason === "Other";
  const resolvedReason = isOther ? holdOther.trim() : holdReason;
  const holdValid = resolvedReason.length > 0;

  const handlePlantingDateChange = (newPlantingDate) => {
    const suggestion = newPlantingDate
      ? suggestHarvestDate(newPlantingDate, cropIdentifier, cropVariant)
      : null;

    setFields((f) => ({
      ...f,
      actualPlantingDate: newPlantingDate,
      ...(suggestion?.minDate ? {
        updatedHarvestDate: suggestion.minDate,
        updatedHarvestWindowStart: suggestion.minDate,
        updatedHarvestWindowEnd: suggestion.maxDate || suggestion.minDate,
      } : {}),
    }));
  };

  const handleStartDateChange = (newStart) => {
    setFields((f) => {
      let nextEnd = f.updatedHarvestWindowEnd;
      if (newStart && nextEnd && newStart > nextEnd) {
        nextEnd = newStart;
      }
      return {
        ...f,
        updatedHarvestWindowStart: newStart,
        updatedHarvestWindowEnd: nextEnd,
        updatedHarvestDate: newStart || nextEnd || "",
      };
    });
  };

  const handleEndDateChange = (newEnd) => {
    setFields((f) => {
      let nextStart = f.updatedHarvestWindowStart;
      if (newEnd && nextStart && newEnd < nextStart) {
        nextStart = newEnd;
      }
      return {
        ...f,
        updatedHarvestWindowStart: nextStart,
        updatedHarvestWindowEnd: newEnd,
        updatedHarvestDate: nextStart || newEnd || "",
      };
    });
  };

  const handlePhaseConfirm = () => {
    if (!selectedPhase || submitting) return;
    const addCost = fields.updatedTotalCost !== "" && fields.updatedTotalCost != null
      ? Number(fields.updatedTotalCost)
      : (fields.additionalCost !== "" && fields.additionalCost != null ? Number(fields.additionalCost) : null);
    onConfirm({
      kind: "phase",
      phase: selectedPhase,
      fields: {
        ...fields,
        additionalCost: addCost,
        harvestWindowStart: fields.updatedHarvestWindowStart,
        harvestWindowEnd: fields.updatedHarvestWindowEnd,
        updatedHarvestDate: fields.updatedHarvestWindowEnd || fields.updatedHarvestWindowStart || fields.updatedHarvestDate,
      },
    });
  };

  const handleHoldConfirm = () => {
    if (!holdValid || submitting) return;
    onConfirm({ kind: "hold", reason: resolvedReason });
  };

  const handleResume = () => {
    if (submitting) return;
    onConfirm({ kind: "resume" });
  };

  const renderPhaseFields = () => {
    if (!selectedPhase) return null;
    if (selectedPhase === "growing") {
      const selectedWindowDays = harvestWindowDays(fields.updatedHarvestWindowStart, fields.updatedHarvestWindowEnd);
      const daysBadgeText = selectedWindowDays
        ? t("farmer.assess.duration_days_single", { value: selectedWindowDays }, `${selectedWindowDays} ${selectedWindowDays === 1 ? "day" : "days"}`)
        : null;

      return (
        <div className="space-y-4">
          <Field id="actualPlantingDate" label={t("farmer.cropCycle.actual_planting_date", {}, "Actual planting date")}>
            <input
              id="actualPlantingDate"
              type="date"
              value={fields.actualPlantingDate ?? ""}
              onChange={(e) => handlePlantingDateChange(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field id="actualPlantedArea" label={t("farmer.cropCycle.actual_planted_area", {}, "Actual planted area (sq m)")}>
            <input
              id="actualPlantedArea"
              type="number"
              min="0"
              step="1"
              value={fields.actualPlantedArea ?? ""}
              onChange={(e) => set({ actualPlantedArea: e.target.value === "" ? "" : Math.trunc(Number(e.target.value)) })}
              placeholder="e.g. 500"
              className={inputCls}
            />
          </Field>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-[var(--hw-neutral-700)]">
                {t("farmer.assess.harvest_window", {}, "Harvest Window")}
              </label>
              {daysBadgeText ? (
                <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--hw-green-50)] text-[var(--hw-green-800)] border border-[var(--hw-green-200)]">
                  {daysBadgeText}
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="harvest-window-start"
                  className="block text-xs font-medium text-[var(--hw-neutral-600)] mb-1"
                >
                  {t("common.from", {}, "From")}
                </label>
                <input
                  id="harvest-window-start"
                  type="date"
                  value={fields.updatedHarvestWindowStart ?? ""}
                  min={fields.actualPlantingDate || undefined}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label
                  htmlFor="harvest-window-end"
                  className="block text-xs font-medium text-[var(--hw-neutral-600)] mb-1"
                >
                  {t("common.to", {}, "To")}
                </label>
                <input
                  id="harvest-window-end"
                  type="date"
                  value={fields.updatedHarvestWindowEnd ?? ""}
                  min={fields.updatedHarvestWindowStart || fields.actualPlantingDate || undefined}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (selectedPhase === "pre-harvest") {
      const selectedWindowDays = harvestWindowDays(fields.updatedHarvestWindowStart, fields.updatedHarvestWindowEnd);
      const daysBadgeText = selectedWindowDays
        ? t("farmer.assess.duration_days_single", { value: selectedWindowDays }, `${selectedWindowDays} ${selectedWindowDays === 1 ? "day" : "days"}`)
        : null;

      return (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-[var(--hw-neutral-700)]">
                {t("farmer.assess.harvest_window", {}, "Harvest Window")}
              </label>
              {daysBadgeText ? (
                <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--hw-green-50)] text-[var(--hw-green-800)] border border-[var(--hw-green-200)]">
                  {daysBadgeText}
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="preharvest-window-start"
                  className="block text-xs font-medium text-[var(--hw-neutral-600)] mb-1"
                >
                  {t("common.from", {}, "From")}
                </label>
                <input
                  id="preharvest-window-start"
                  type="date"
                  value={fields.updatedHarvestWindowStart ?? ""}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label
                  htmlFor="preharvest-window-end"
                  className="block text-xs font-medium text-[var(--hw-neutral-600)] mb-1"
                >
                  {t("common.to", {}, "To")}
                </label>
                <input
                  id="preharvest-window-end"
                  type="date"
                  value={fields.updatedHarvestWindowEnd ?? ""}
                  min={fields.updatedHarvestWindowStart || undefined}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
          <Field label={t("farmer.cropCycle.expected_harvest_qty_opt", {}, "Expected harvest quantity (kg) — optional")}>
            <input type="number" min="0" value={fields.expectedHarvestQty ?? ""} onChange={(e) => set({ expectedHarvestQty: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="e.g. 600" className={inputCls} />
          </Field>
        </div>
      );
    }
    if (selectedPhase === "harvested") {
      const estimatedYield = crop?.harvestQuantity ?? crop?.expectedHarvestQty ?? 0;
      return (
        <div className="space-y-4">
          <Field label={t("farmer.cropCycle.harvest_started_date", {}, "Harvest started date")}>
            <input
              type="date"
              value={fields.actualHarvestDate ?? ""}
              onChange={(e) => set({ actualHarvestDate: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div>
            <label className="block text-sm font-medium text-[var(--hw-neutral-700)] mb-1.5">
              {t("farmer.cropCycle.quantity_to_harvest_label", {}, "Quantity to Harvest (kg)")}
            </label>
            <div className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] text-sm font-semibold text-[var(--hw-neutral-900)] flex items-center justify-between">
              <span>{estimatedYield > 0 ? `${Number(estimatedYield).toLocaleString()} kg` : "—"}</span>
              <span className="text-xs text-[var(--hw-green-700)] font-medium">
                {t("farmer.cropCycle.based_on_estimated_yield", {}, "Based on Estimated Yield")}
              </span>
            </div>
            <p className="text-[11px] text-[var(--hw-neutral-500)] mt-1">
              {t(
                "farmer.cropCycle.harvest_quantity_auto_desc",
                {},
                "Automatically based on your estimated yield (Gibanabana nga Ani). Harvest entries will deduct from this amount."
              )}
            </p>
          </div>
          <Field label={t("farmer.cropCycle.additional_cost_opt", {}, "Additional production cost (₱) — optional")}>
            <input
              type="number"
              min="0"
              value={fields.updatedTotalCost ?? ""}
              onChange={(e) => set({ updatedTotalCost: e.target.value === "" ? "" : Number(e.target.value) })}
              placeholder="e.g. 0"
              className={inputCls}
            />
          </Field>
        </div>
      );
    }
    if (selectedPhase === "completed") {
      const overallTotalCost = crop?.totalCost != null && crop?.totalCost !== ""
        ? Number(crop.totalCost)
        : (crop?.productionCost != null && crop?.productionCost !== ""
            ? Number(crop.productionCost)
            : (Array.isArray(crop?.productionCosts) && crop.productionCosts.length > 0
                ? crop.productionCosts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
                : 0));
      const qty = typeof fields.finalQtySold === "number" ? fields.finalQtySold : null;
      const price = typeof fields.avgSellingPrice === "number" ? fields.avgSellingPrice : null;
      const cost = typeof fields.finalProductionCost === "number" ? fields.finalProductionCost : overallTotalCost;
      const revenue = qty !== null && price !== null ? qty * price : null;
      const profitLoss = revenue !== null ? revenue - cost : null;
      const addedCosts = crop?.addedCosts ?? crop?.added_costs ?? 0;
      const hasAddedCosts = (addedCosts || 0) > 0;
      const initialCostEst = crop?.initialCost != null ? crop.initialCost : (crop?.initial_cost != null ? crop.initial_cost : Math.max(0, overallTotalCost - addedCosts));

      return (
        <div className="space-y-4">
          <Field id="finalQtySold" label={t("farmer.cropCycle.final_qty_sold", {}, "Final quantity sold (kg)")}>
            <input
              id="finalQtySold"
              type="number"
              min="0"
              value={fields.finalQtySold ?? ""}
              onChange={(e) => set({ finalQtySold: e.target.value === "" ? "" : Number(e.target.value) })}
              placeholder={crop.harvestQuantity ? `e.g. ${crop.harvestQuantity}` : "e.g. 560"}
              className={inputCls}
            />
          </Field>
          <Field id="avgSellingPrice" label={t("farmer.cropCycle.avg_selling_price", {}, "Average selling price (₱/kg)")}>
            <input
              id="avgSellingPrice"
              type="number"
              min="0"
              step="0.01"
              value={fields.avgSellingPrice ?? ""}
              onChange={(e) => set({ avgSellingPrice: e.target.value === "" ? "" : Number(e.target.value) })}
              onBlur={() => {
                if (fields.avgSellingPrice !== "" && Number.isFinite(Number(fields.avgSellingPrice))) {
                  set({ avgSellingPrice: Number(fields.avgSellingPrice).toFixed(2) });
                }
              }}
              placeholder={crop.farmgatePrice ? `e.g. ${crop.farmgatePrice}` : "e.g. 78"}
              className={inputCls}
            />
          </Field>
          <Field id="finalProductionCost" label={t("farmer.cropCycle.final_production_cost", {}, "Final production cost (₱)")}>
            <input
              id="finalProductionCost"
              type="number"
              min="0"
              value={fields.finalProductionCost ?? ""}
              onChange={(e) => set({ finalProductionCost: e.target.value === "" ? "" : Number(e.target.value) })}
              placeholder={String(overallTotalCost || 0)}
              className={inputCls}
            />
          </Field>
          <Field id="completionDate" label={t("farmer.cropCycle.completion_date", {}, "Completion date")}>
            <input
              id="completionDate"
              type="date"
              value={fields.completionDate ?? ""}
              onChange={(e) => set({ completionDate: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)]/70 rounded-xl px-4 py-3 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--hw-neutral-600)]">
                {t("farmer.cropCycle.final_production_cost", {}, "Final production cost")}
              </span>
              <span className="font-semibold text-[var(--hw-neutral-900)]">{formatPeso(cost)}</span>
            </div>
            {revenue !== null && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--hw-neutral-600)]">
                    {t("farmer.cropCycle.est_gross_revenue", {}, "Estimated gross revenue")}
                  </span>
                  <span className="font-semibold text-[var(--hw-neutral-900)]">{formatPeso(revenue)}</span>
                </div>
                {profitLoss !== null && (
                  <div className="flex justify-between items-center text-sm pt-1 border-t border-[var(--hw-neutral-200)]">
                    <span className="font-medium text-[var(--hw-neutral-900)]">
                      {t("farmer.cropCycle.est_profit_loss", {}, "Estimated profit / loss")}
                    </span>
                    <span className={`font-bold ${profitLoss >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {profitLoss >= 0 ? "+" : ""}{formatPeso(profitLoss)}
                    </span>
                  </div>
                )}
              </>
            )}
            <p className="text-[11px] text-[var(--hw-neutral-500)]">
              {hasAddedCosts
                ? t(
                    "farmer.cropCycle.final_cost_breakdown_hint",
                    { initial: formatPeso(initialCostEst), added: formatPeso(addedCosts) },
                    `Nagpakita sa kinatibuk-ang total: gibanabanang gasto (${formatPeso(initialCostEst)}) + dugang nga gasto (${formatPeso(addedCosts)})`
                  )
                : t("farmer.cropCycle.all_amounts_estimates", {}, "All amounts are estimates for decision-support records.")}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (view === "hold-reason") {
    return (
      <>
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs" onClick={onClose} aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-0 z-[70] md:inset-y-0 md:right-0 md:left-auto md:w-96 bg-white rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-200)] flex-shrink-0">
            <p className="font-semibold text-[var(--hw-neutral-900)]">
              {t("farmer.cropCycle.put_on_hold", {}, "Put on hold")}
            </p>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] transition-colors">
              <X className="w-5 h-5 text-[var(--hw-neutral-500)]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            <p className="text-[13px] text-[var(--hw-neutral-900)]">
              {t("farmer.cropCycle.hold_desc", {}, "Your crop plan will be paused. The crop itself continues to grow — only your planned actions are on hold.")}
            </p>

            <div className="space-y-4">
              <Field label={t("farmer.cropCycle.hold_reason_label", {}, "Reason for putting this crop on hold")}>
                <div className="relative">
                  <select
                    value={holdReason}
                    onChange={(e) => {
                      setHoldReason(e.target.value);
                      setHoldOther("");
                    }}
                    className={`${inputCls} appearance-none pr-10`}
                  >
                    <option value="">{t("farmer.cropCycle.select_reason", {}, "Select a reason…")}</option>
                    {HOLD_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {t(r.key, {}, r.fallback)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hw-neutral-500)] pointer-events-none" />
                </div>
              </Field>

              {isOther && (
                <Field label={t("farmer.cropCycle.describe_reason", {}, "Please describe the reason")}>
                  <textarea
                    value={holdOther}
                    onChange={(e) => setHoldOther(e.target.value.slice(0, 255))}
                    placeholder={t("farmer.cropCycle.describe_reason_placeholder", {}, "Briefly describe why this crop plan is being paused…")}
                    rows={3}
                    maxLength={255}
                    className={`${inputCls} resize-none`}
                    autoFocus
                  />
                  <p className={`text-right text-[11px] mt-1 ${holdOther.length >= 240 ? "text-amber-600" : "text-[var(--hw-neutral-500)]"}`}>
                    {holdOther.length}/255
                  </p>
                </Field>
              )}
            </div>
          </div>

          <div className="px-5 py-3.5 pb-6 md:pb-4 border-t border-[var(--hw-neutral-200)] flex gap-3 flex-shrink-0 bg-white">
            <button
              type="button"
              onClick={() => {
                if (mode === "hold") {
                  onClose();
                } else {
                  setView("main");
                }
              }}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors text-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("common.cancel", {}, "Cancel")}
            </button>
            <button
              type="button"
              onClick={handleHoldConfirm}
              disabled={!holdValid || submitting}
              className="flex-1 py-2.5 px-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-sm font-semibold hover:bg-amber-100 active:bg-amber-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-xs"
            >
              <PauseCircle className="w-4 h-4 text-amber-600" />
              <span>{t("common.confirm", {}, "Confirm")}</span>
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-[70] md:inset-y-0 md:right-0 md:left-auto md:w-96 bg-white rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-200)] flex-shrink-0">
          <p className="font-semibold text-[var(--hw-neutral-900)]">
            {mode === "confirm-planting"
              ? t("farmer.crops.btn_confirm_planting", {}, "Confirm Planting")
              : t("farmer.cropCycle.update_phase_title", {}, "Update crop phase")}
          </p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] transition-colors">
            <X className="w-5 h-5 text-[var(--hw-neutral-500)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Resume section — shown only when on hold */}
          {crop.isOnHold && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <PauseCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-amber-700">
                    {t("farmer.cropCycle.is_on_hold", { name: crop.commodityName }, `${crop.commodityName} is currently on hold`)}
                  </p>
                  {crop.holdReason && <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">{crop.holdReason}</p>}
                  {crop.holdDate && (
                    <p className="text-[11px] text-[var(--hw-neutral-900)] mt-0.5">
                      {t("farmer.cropCycle.put_on_hold_date", { date: crop.holdDate }, `Put on hold: ${crop.holdDate}`)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleResume}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-semibold hover:bg-[var(--hw-green-800)] transition-colors"
              >
                <Play className="w-4 h-4" />
                {t("common.continue", {}, "Continue")}
              </button>
            </div>
          )}

          {/* Phase transitions */}
          {transitions.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-3">
                {crop.isOnHold
                  ? t("farmer.cropCycle.advance_phase", {}, "Or advance to a new phase")
                  : t("farmer.cropCycle.move_to", { name: crop.commodityName || "-" }, `Move ${crop.commodityName || '-'} to`)}
              </p>
              <div className="space-y-1">
                {transitions.map((phase) => {
                  const cfg = PHASE_CONFIG[phase];
                  const Icon = cfg.icon;
                  const selected = selectedPhase === phase;
                  return (
                    <button
                      key={phase}
                      type="button"
                      onClick={() => setSelectedPhase(phase)}
                      className="w-full flex items-center gap-3 py-2 text-left bg-transparent border-0 transition-colors"
                    >
                      <Icon className={`w-5 h-5 ${cfg.color} flex-shrink-0`} />
                      <span className="font-semibold text-sm text-black">
                        {t(cfg.labelKey || `farmer.phases.${phase}`, {}, cfg.label)}
                      </span>
                      {selected && <Check className={`w-4 h-4 ml-auto ${cfg.color}`} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedPhase && renderPhaseFields() && (
            <div>
              <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-3">
                {t("farmer.cropCycle.additional_info", {}, "Additional information")}
              </p>
              {renderPhaseFields()}
            </div>
          )}

          {/* Put on hold — only when NOT already on hold and not completed */}
          {!crop.isOnHold && !isCompleted && (
            <div className="pt-2 border-t border-[var(--hw-neutral-100)]">
              <button
                type="button"
                onClick={() => setView("hold-reason")}
                className="w-full flex items-center gap-3 py-2 text-left bg-transparent border-0 transition-colors"
              >
                <PauseCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm text-amber-700">
                    {t("farmer.cropCycle.put_on_hold", {}, "Put on hold")}
                  </span>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    {t("farmer.cropCycle.pause_plan_desc", {}, "Pause your crop plan temporarily")}
                  </p>
                </div>
              </button>
            </div>
          )}

          {transitions.length === 0 && !crop.isOnHold && isCompleted && (
            <p className="text-sm text-[var(--hw-neutral-900)]">
              {t("farmer.cropCycle.no_transitions", {}, "No further phase transitions are available for this crop.")}
            </p>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="px-5 py-3.5 pb-6 md:pb-4 border-t border-[var(--hw-neutral-200)] bg-white flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={submitting ? undefined : onClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors text-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("common.cancel", {}, "Cancel")}
          </button>
          {(transitions.length > 0 || mode === "confirm-planting") && (
            <button
              type="button"
              onClick={handlePhaseConfirm}
              disabled={!selectedPhase || submitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-semibold hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>
                {mode === "confirm-planting"
                  ? t("farmer.crops.btn_confirm_planting", {}, "Confirm Planting")
                  : submitting
                    ? t("common.saving", {}, "Saving…")
                    : (selectedPhase === "completed"
                      ? t("common.confirm", {}, "Confirm")
                      : t("farmer.cropCycle.update_status", {}, "Update status"))}
              </span>
            </button>
          )}
          {crop.isOnHold && transitions.length === 0 && (
            <button
              type="button"
              onClick={handleResume}
              disabled={submitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-semibold hover:bg-[var(--hw-green-800)] transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              <span>{t("common.continue", {}, "Continue")}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition bg-white";

const Field = ({ label, id, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-[var(--hw-neutral-700)] mb-1.5">{label}</label>
    {children}
  </div>
);

export {
  UpdatePhaseDrawer
};
