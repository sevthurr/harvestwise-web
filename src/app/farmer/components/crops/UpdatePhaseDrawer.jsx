import { useState, useEffect } from "react";
import { X, Check, PauseCircle, Play, ChevronDown } from "lucide-react";
import { PHASE_CONFIG, PHASE_TRANSITIONS, formatPeso } from "./types";
import { PHASE_CODES, normalizePhaseCode } from "../../utils/farmerCodes";
import { useLanguage } from "../../../global/contexts/LanguageContext";
import { suggestHarvestDate, getCropDuration } from "../recommend/types";

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
  const cropDuration = cropIdentifier ? getCropDuration(cropIdentifier, cropVariant) : null;

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
    const initialArea = crop.farmArea ?? "";
    let initialHarvest = toDateInputValue(crop.rawHarvestDate || crop.harvestDate);
    if (!initialHarvest && initialPlanting) {
      const suggestion = suggestHarvestDate(initialPlanting, cropIdentifier, cropVariant);
      if (suggestion?.minDate) {
        initialHarvest = suggestion.minDate;
      }
    }

    setFields({
      actualPlantingDate: initialPlanting,
      actualPlantedArea: initialArea,
      updatedHarvestDate: initialHarvest,
      expectedHarvestQty: crop.expectedHarvestQty ?? crop.harvestQuantity ?? "",
      actualHarvestDate: toDateInputValue(crop.actualHarvestDate) || new Date().toISOString().split("T")[0],
      actualHarvestedQty: crop.actualHarvestQty ?? "",
      finalProductionCost: crop.totalCost ?? "",
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
      ...(suggestion?.minDate ? { updatedHarvestDate: suggestion.minDate } : {}),
    }));
  };

  const handlePhaseConfirm = () => {
    if (!selectedPhase) return;
    onConfirm({ kind: "phase", phase: selectedPhase, fields });
  };

  const handleHoldConfirm = () => {
    if (!holdValid) return;
    onConfirm({ kind: "hold", reason: resolvedReason });
  };

  const handleResume = () => {
    onConfirm({ kind: "resume" });
  };

  const renderPhaseFields = () => {
    if (!selectedPhase) return null;
    if (selectedPhase === "growing") {
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
              value={fields.actualPlantedArea ?? ""}
              onChange={(e) => set({ actualPlantedArea: e.target.value === "" ? "" : Number(e.target.value) })}
              placeholder="e.g. 500"
              className={inputCls}
            />
          </Field>
          <Field id="updatedHarvestDate" label={t("farmer.cropCycle.updated_harvest_date", {}, "Updated expected harvest date")}>
            <input
              id="updatedHarvestDate"
              type="date"
              value={fields.updatedHarvestDate ?? ""}
              onChange={(e) => set({ updatedHarvestDate: e.target.value })}
              className={inputCls}
            />
            {cropDuration?.label && (
              <p className="text-[11px] text-[var(--hw-neutral-500)] mt-1">
                {t(
                  "farmer.cropCycle.auto_calculated_duration",
                  { duration: cropDuration.label },
                  `Auto-filled based on typical duration (${cropDuration.label})`
                )}
              </p>
            )}
          </Field>
        </div>
      );
    }
    if (selectedPhase === "pre-harvest") {
      return (
        <div className="space-y-4">
          <Field label={t("farmer.cropCycle.updated_harvest_date", {}, "Updated expected harvest date")}>
            <input type="date" value={fields.updatedHarvestDate ?? ""} onChange={(e) => set({ updatedHarvestDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label={t("farmer.cropCycle.expected_harvest_qty_opt", {}, "Expected harvest quantity (kg) — optional")}>
            <input type="number" min="0" value={fields.expectedHarvestQty ?? ""} onChange={(e) => set({ expectedHarvestQty: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="e.g. 600" className={inputCls} />
          </Field>
        </div>
      );
    }
    if (selectedPhase === "harvested") {
      return (
        <div className="space-y-4">
          <Field label={t("farmer.cropCycle.harvest_started_date", {}, "Harvest started date")}>
            <input type="date" value={fields.actualHarvestDate ?? ""} onChange={(e) => set({ actualHarvestDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label={t("farmer.cropCycle.qty_harvested_so_far", {}, "Quantity harvested so far (kg)")}>
            <input type="number" min="0" value={fields.actualHarvestedQty ?? ""} onChange={(e) => set({ actualHarvestedQty: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="e.g. 580" className={inputCls} />
          </Field>
          <Field label={t("farmer.cropCycle.additional_cost_opt", {}, "Additional production cost (₱) — optional")}>
            <input type="number" min="0" value={fields.updatedTotalCost ?? ""} onChange={(e) => set({ updatedTotalCost: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="e.g. 0" className={inputCls} />
          </Field>
        </div>
      );
    }
    if (selectedPhase === "completed") {
      const qty = typeof fields.finalQtySold === "number" ? fields.finalQtySold : null;
      const price = typeof fields.avgSellingPrice === "number" ? fields.avgSellingPrice : null;
      const cost = typeof fields.finalProductionCost === "number" ? fields.finalProductionCost : crop.totalCost;
      const revenue = qty !== null && price !== null ? qty * price : null;
      const profitLoss = revenue !== null ? revenue - cost : null;
      return (
        <div className="space-y-4">
          <Field label={t("farmer.cropCycle.final_qty_sold", {}, "Final quantity sold (kg)")}>
            <input type="number" min="0" value={fields.finalQtySold ?? ""} onChange={(e) => set({ finalQtySold: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="e.g. 560" className={inputCls} />
          </Field>
          <Field label={t("farmer.cropCycle.avg_selling_price", {}, "Average selling price (₱/kg)")}>
            <input type="number" min="0" value={fields.avgSellingPrice ?? ""} onChange={(e) => set({ avgSellingPrice: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="e.g. 78" className={inputCls} />
          </Field>
          <Field label={t("farmer.cropCycle.final_production_cost", {}, "Final production cost (₱)")}>
            <input type="number" min="0" value={fields.finalProductionCost ?? ""} onChange={(e) => set({ finalProductionCost: e.target.value === "" ? "" : Number(e.target.value) })} placeholder={String(crop.totalCost)} className={inputCls} />
          </Field>
          <Field label={t("farmer.cropCycle.completion_date", {}, "Completion date")}>
            <input type="date" value={fields.completionDate ?? ""} onChange={(e) => set({ completionDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label={t("farmer.cropCycle.notes_opt", {}, "Notes — optional")}>
            <textarea value={fields.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} placeholder={t("farmer.cropCycle.notes_placeholder", {}, "Any observations about this crop cycle…")} rows={2} className={`${inputCls} resize-none`} />
          </Field>
          {revenue !== null && (
            <div className="bg-[var(--hw-neutral-50)] rounded-xl px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--hw-neutral-900)]">
                  {t("farmer.cropCycle.est_gross_revenue", {}, "Estimated gross revenue")}
                </span>
                <span className="font-semibold text-[var(--hw-neutral-900)]">{formatPeso(revenue)}</span>
              </div>
              {profitLoss !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--hw-neutral-900)]">
                    {t("farmer.cropCycle.est_profit_loss", {}, "Estimated profit / loss")}
                  </span>
                  <span className={`font-semibold ${profitLoss >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {profitLoss >= 0 ? "+" : ""}{formatPeso(profitLoss)}
                  </span>
                </div>
              )}
              <p className="text-xs text-[var(--hw-neutral-700)]">
                {t("farmer.cropCycle.all_amounts_estimates", {}, "All amounts are estimates.")}
              </p>
            </div>
          )}
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
              className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors text-center"
            >
              {t("common.cancel", {}, "Cancel")}
            </button>
            <button
              type="button"
              onClick={handleHoldConfirm}
              disabled={!holdValid}
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
              <div className="space-y-2">
                {transitions.map((phase) => {
                  const cfg = PHASE_CONFIG[phase];
                  const Icon = cfg.icon;
                  const selected = selectedPhase === phase;
                  return (
                    <button
                      key={phase}
                      onClick={() => setSelectedPhase(phase)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-left ${selected ? `${cfg.bg} ${cfg.border}` : "bg-white border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)]"}`}
                    >
                      <Icon className={`w-5 h-5 ${selected ? cfg.color : "text-[var(--hw-neutral-400)]"}`} />
                      <span className={`font-medium text-sm ${selected ? cfg.color : "text-[var(--hw-neutral-700)]"}`}>
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
            <div className="pt-1 border-t border-[var(--hw-neutral-100)]">
              <button
                onClick={() => setView("hold-reason")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
              >
                <PauseCircle className="w-5 h-5 text-amber-600" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-amber-700">
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
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors text-center"
          >
            {t("common.cancel", {}, "Cancel")}
          </button>
          {(transitions.length > 0 || mode === "confirm-planting") && (
            <button
              type="button"
              onClick={handlePhaseConfirm}
              disabled={!selectedPhase}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-semibold hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>
                {mode === "confirm-planting"
                  ? t("farmer.crops.btn_confirm_planting", {}, "Confirm Planting")
                  : t("farmer.cropCycle.update_status", {}, "Update status")}
              </span>
            </button>
          )}
          {crop.isOnHold && transitions.length === 0 && (
            <button
              type="button"
              onClick={handleResume}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-semibold hover:bg-[var(--hw-green-800)] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
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
