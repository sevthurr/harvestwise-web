import { useState } from "react";
import { X, Check, PauseCircle, Play, ChevronDown } from "lucide-react";
import { PHASE_CONFIG, PHASE_TRANSITIONS, formatPeso } from "./types";
const HOLD_REASONS = [
  "Waiting for better market conditions",
  "Weather conditions",
  "Budget or input constraints",
  "Seed/material availability",
  "Labor or land availability",
  "Need more time to reassess",
  "Other"
];
const UpdatePhaseDrawer = ({
  open,
  crop,
  onClose,
  onConfirm
}) => {
  const transitions = PHASE_TRANSITIONS[crop.phase] ?? [];
  const [selectedPhase, setSelectedPhase] = useState(
    transitions.length === 1 ? transitions[0] : null
  );
  const [fields, setFields] = useState({});
  const [view, setView] = useState("main");
  const [holdReason, setHoldReason] = useState("");
  const [holdOther, setHoldOther] = useState("");
  if (!open) return null;
  const set = (patch) => setFields((f) => ({ ...f, ...patch }));
  const isOther = holdReason === "Other";
  const resolvedReason = isOther ? holdOther.trim() : holdReason;
  const holdValid = resolvedReason.length > 0;
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
      return <div className="space-y-4">
          <Field label="Actual planting date">
            <input type="date" value={fields.actualPlantingDate ?? ""} onChange={(e) => set({ actualPlantingDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Actual planted area (sq m)">
            <input type="number" min="0" value={fields.actualPlantedArea ?? ""} onChange={(e) => set({ actualPlantedArea: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="e.g. 500" className={inputCls} />
          </Field>
          <Field label="Updated expected harvest date">
            <input type="date" value={fields.updatedHarvestDate ?? ""} onChange={(e) => set({ updatedHarvestDate: e.target.value })} className={inputCls} />
          </Field>
        </div>;
    }
    if (selectedPhase === "pre-harvest") {
      return <div className="space-y-4">
          <Field label="Updated expected harvest date">
            <input type="date" value={fields.updatedHarvestDate ?? ""} onChange={(e) => set({ updatedHarvestDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Expected harvest quantity (kg) — optional">
            <input type="number" min="0" value={fields.expectedHarvestQty ?? ""} onChange={(e) => set({ expectedHarvestQty: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="e.g. 600" className={inputCls} />
          </Field>
        </div>;
    }
    if (selectedPhase === "harvested") {
      return <div className="space-y-4">
          <Field label="Harvest started date">
            <input type="date" value={fields.actualHarvestDate ?? ""} onChange={(e) => set({ actualHarvestDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Quantity harvested so far (kg)">
            <input type="number" min="0" value={fields.actualHarvestedQty ?? ""} onChange={(e) => set({ actualHarvestedQty: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="e.g. 580" className={inputCls} />
          </Field>
          <Field label="Additional production cost (₱) — optional">
            <input type="number" min="0" value={fields.updatedTotalCost ?? ""} onChange={(e) => set({ updatedTotalCost: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="e.g. 0" className={inputCls} />
          </Field>
        </div>;
    }
    if (selectedPhase === "completed") {
      const qty = typeof fields.finalQtySold === "number" ? fields.finalQtySold : null;
      const price = typeof fields.avgSellingPrice === "number" ? fields.avgSellingPrice : null;
      const cost = typeof fields.finalProductionCost === "number" ? fields.finalProductionCost : crop.totalCost;
      const revenue = qty !== null && price !== null ? qty * price : null;
      const profitLoss = revenue !== null ? revenue - cost : null;
      return <div className="space-y-4">
          <Field label="Final quantity sold (kg)">
            <input type="number" min="0" value={fields.finalQtySold ?? ""} onChange={(e) => set({ finalQtySold: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="e.g. 560" className={inputCls} />
          </Field>
          <Field label="Average selling price (₱/kg)">
            <input type="number" min="0" value={fields.avgSellingPrice ?? ""} onChange={(e) => set({ avgSellingPrice: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="e.g. 78" className={inputCls} />
          </Field>
          <Field label="Final production cost (₱)">
            <input type="number" min="0" value={fields.finalProductionCost ?? ""} onChange={(e) => set({ finalProductionCost: e.target.value === "" ? "" : Number(e.target.value) })} placeholder={String(crop.totalCost)} className={inputCls} />
          </Field>
          <Field label="Completion date">
            <input type="date" value={fields.completionDate ?? ""} onChange={(e) => set({ completionDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Notes — optional">
            <textarea value={fields.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} placeholder="Any observations about this crop cycle…" rows={2} className={`${inputCls} resize-none`} />
          </Field>
          {revenue !== null && <div className="bg-[var(--hw-neutral-50)] rounded-xl px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--hw-neutral-900)]">Estimated gross revenue</span>
                <span className="font-semibold text-[var(--hw-neutral-900)]">{formatPeso(revenue)}</span>
              </div>
              {profitLoss !== null && <div className="flex justify-between text-sm">
                  <span className="text-[var(--hw-neutral-900)]">Estimated profit / loss</span>
                  <span className={`font-semibold ${profitLoss >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {profitLoss >= 0 ? "+" : ""}{formatPeso(profitLoss)}
                  </span>
                </div>}
              <p className="text-xs text-[var(--hw-neutral-700)]">All amounts are estimates.</p>
            </div>}
        </div>;
    }
    return null;
  };
  if (view === "hold-reason") {
    return <>
        <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-0 z-50 md:inset-y-0 md:right-0 md:left-auto md:w-96 bg-white rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-[var(--shadow-xl)] flex flex-col max-h-[90vh] md:max-h-none">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-200)]">
            <p className="font-semibold text-[var(--hw-neutral-900)]">Put on hold</p>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] transition-colors">
              <X className="w-5 h-5 text-[var(--hw-neutral-500)]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            <p className="text-[13px] text-[var(--hw-neutral-900)]">
              Your crop plan will be paused. The crop itself continues to grow — only your planned actions are on hold.
            </p>

            <div className="space-y-4">
              <Field label="Reason for putting this crop on hold">
                <div className="relative">
                  <select
      value={holdReason}
      onChange={(e) => {
        setHoldReason(e.target.value);
        setHoldOther("");
      }}
      className={`${inputCls} appearance-none pr-10`}
    >
                    <option value="">Select a reason…</option>
                    {HOLD_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hw-neutral-500)] pointer-events-none" />
                </div>
              </Field>

              {isOther && <Field label="Please describe the reason">
                  <textarea
      value={holdOther}
      onChange={(e) => setHoldOther(e.target.value.slice(0, 255))}
      placeholder="Briefly describe why this crop plan is being paused…"
      rows={3}
      maxLength={255}
      className={`${inputCls} resize-none`}
      autoFocus
    />
                  <p className={`text-right text-[11px] mt-1 ${holdOther.length >= 240 ? "text-amber-600" : "text-[var(--hw-neutral-500)]"}`}>
                    {holdOther.length}/255
                  </p>
                </Field>}
            </div>
          </div>

          <div className="px-5 py-4 border-t border-[var(--hw-neutral-200)] flex gap-3">
            <button
      onClick={() => setView("main")}
      className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
    >
              Cancel
            </button>
            <button
      onClick={handleHoldConfirm}
      disabled={!holdValid}
      className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
    >
              <PauseCircle className="w-4 h-4" />Put on hold
            </button>
          </div>
        </div>
      </>;
  }
  return <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-y-0 md:right-0 md:left-auto md:w-96 bg-white rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-[var(--shadow-xl)] flex flex-col max-h-[90vh] md:max-h-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-200)]">
          <p className="font-semibold text-[var(--hw-neutral-900)]">Update crop phase</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] transition-colors">
            <X className="w-5 h-5 text-[var(--hw-neutral-500)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {
    /* Resume section — shown only when on hold */
  }
          {crop.isOnHold && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <PauseCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-amber-700">{crop.commodityName} is currently on hold</p>
                  {crop.holdReason && <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">{crop.holdReason}</p>}
                  {crop.holdDate && <p className="text-[11px] text-[var(--hw-neutral-900)] mt-0.5">Put on hold: {crop.holdDate}</p>}
                </div>
              </div>
              <button
    onClick={handleResume}
    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-semibold hover:bg-[var(--hw-green-800)] transition-colors"
  >
                <Play className="w-4 h-4" />Continue
              </button>
            </div>}

          {
    /* Phase transitions */
  }
          {transitions.length > 0 && <div>
              <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-3">
                {crop.isOnHold ? "Or advance to a new phase" : `Move ${crop.commodityName || '-'} to`}
              </p>
              <div className="space-y-2">
                {transitions.map((phase) => {
    const cfg = PHASE_CONFIG[phase];
    const Icon = cfg.icon;
    const selected = selectedPhase === phase;
    return <button
      key={phase}
      onClick={() => setSelectedPhase(phase)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-left ${selected ? `${cfg.bg} ${cfg.border}` : "bg-white border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)]"}`}
    >
                      <Icon className={`w-5 h-5 ${selected ? cfg.color : "text-[var(--hw-neutral-400)]"}`} />
                      <span className={`font-medium text-sm ${selected ? cfg.color : "text-[var(--hw-neutral-700)]"}`}>
                        {cfg.label}
                      </span>
                      {selected && <Check className={`w-4 h-4 ml-auto ${cfg.color}`} />}
                    </button>;
  })}
              </div>
            </div>}

          {selectedPhase && renderPhaseFields() && <div>
              <p className="text-sm font-semibold text-[var(--hw-neutral-700)] mb-3">Additional information</p>
              {renderPhaseFields()}
            </div>}

          {
    /* Put on hold — only when NOT already on hold and not completed */
  }
          {!crop.isOnHold && crop.phase !== "completed" && <div className="pt-1 border-t border-[var(--hw-neutral-100)]">
              <button
    onClick={() => setView("hold-reason")}
    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
  >
                <PauseCircle className="w-5 h-5 text-amber-600" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-amber-700">Put on hold</span>
                  <p className="text-[11px] text-amber-600 mt-0.5">Pause your crop plan temporarily</p>
                </div>
              </button>
            </div>}

          {transitions.length === 0 && !crop.isOnHold && crop.phase === "completed" && <p className="text-sm text-[var(--hw-neutral-900)]">No further phase transitions are available for this crop.</p>}
        </div>

        {
    /* Footer — only for phase transition confirm */
  }
        {transitions.length > 0 && <div className="px-5 py-4 border-t border-[var(--hw-neutral-200)] flex gap-3">
            <button
    onClick={onClose}
    className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
              Cancel
            </button>
            <button
    onClick={handlePhaseConfirm}
    disabled={!selectedPhase}
    className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
  >
              <Check className="w-4 h-4" />Confirm
            </button>
          </div>}
      </div>
    </>;
};
const inputCls = "w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition bg-white";
const Field = ({ label, children }) => <div>
    <label className="block text-sm font-medium text-[var(--hw-neutral-700)] mb-1.5">{label}</label>
    {children}
  </div>;
export {
  UpdatePhaseDrawer
};
