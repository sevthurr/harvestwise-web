import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "../../../global/contexts/LanguageContext";
import { SQM_PER_HECTARE, toSqm, calculateNormalizedHarvestQuantity } from "./types";

const HARVEST_UNITS = [
  { id: "kg", labelKey: "farmer.assess.unit_kg", fallback: "Kg" },
  { id: "crate", labelKey: "farmer.assess.unit_crate", fallback: "Crate" },
  { id: "sack", labelKey: "farmer.assess.unit_sack", fallback: "Sack" },
];

const Step2FarmHarvest = ({ data, onChange, errors = {} }) => {
  const { t } = useLanguage();
  const [helpOpen, setHelpOpen] = useState(false);

  // What the farmer typed, expressed in the other unit. The stored value is
  // always sq m (see buildDraftPayload), so this is display-only feedback.
  const areaSqm = toSqm(data.farmArea, data.farmAreaUnit);
  const areaEquivalent = areaSqm == null
    ? null
    : data.farmAreaUnit === "ha"
      ? `\u2248 ${areaSqm.toLocaleString("en-PH", { maximumFractionDigits: 2 })} sq m`
      : `\u2248 ${(areaSqm / SQM_PER_HECTARE).toLocaleString("en-PH", { maximumFractionDigits: 4 })} ha`;

  const switchAreaUnit = (nextUnit) => {
    if (nextUnit === data.farmAreaUnit) return;
    const current = Number(data.farmArea);
    const converted =
      data.farmArea === "" || !Number.isFinite(current) || current <= 0
        ? data.farmArea
        : nextUnit === "ha"
          ? Math.round((current / SQM_PER_HECTARE) * 10000) / 10000
          : Math.round(current * SQM_PER_HECTARE * 100) / 100;
    onChange({ farmAreaUnit: nextUnit, farmArea: converted });
  };

  const currentUnit = (data.harvestQuantityUnit || "kg").toLowerCase();
  const currentEnteredQty =
    data.harvestQuantityRaw !== "" && data.harvestQuantityRaw !== undefined && data.harvestQuantityRaw !== null
      ? data.harvestQuantityRaw
      : (currentUnit === "kg" ? (data.harvestQuantity ?? "") : "");
  const currentConvWeight = data.harvestConversionWeight ?? "";

  const handleQuantityChange = (valStr) => {
    if (valStr === "") {
      onChange({
        harvestQuantityRaw: "",
        harvestQuantity: "",
      });
      return;
    }
    const num = Number(valStr);
    if (currentUnit === "kg") {
      onChange({
        harvestQuantityUnit: "kg",
        harvestQuantityRaw: num,
        harvestQuantity: num,
        harvestConversionWeight: "",
      });
    } else {
      const norm = calculateNormalizedHarvestQuantity(num, currentUnit, currentConvWeight);
      onChange({
        harvestQuantityUnit: currentUnit,
        harvestQuantityRaw: num,
        harvestQuantity: norm != null ? norm : "",
      });
    }
  };

  const handleWeightChange = (valStr) => {
    if (valStr === "") {
      onChange({
        harvestConversionWeight: "",
        harvestQuantity: "",
      });
      return;
    }
    const num = Number(valStr);
    const norm = calculateNormalizedHarvestQuantity(currentEnteredQty, currentUnit, num);
    onChange({
      harvestConversionWeight: num,
      harvestQuantity: norm != null ? norm : "",
    });
  };

  const switchHarvestUnit = (nextUnit) => {
    if (nextUnit === currentUnit) return;
    if (nextUnit === "kg") {
      const norm = calculateNormalizedHarvestQuantity(currentEnteredQty, "kg", null);
      onChange({
        harvestQuantityUnit: "kg",
        harvestConversionWeight: "",
        harvestQuantityRaw: currentEnteredQty,
        harvestQuantity: norm != null ? norm : "",
      });
    } else {
      const nextWeight = currentConvWeight !== "" ? currentConvWeight : "";
      const norm = calculateNormalizedHarvestQuantity(currentEnteredQty, nextUnit, nextWeight);
      onChange({
        harvestQuantityUnit: nextUnit,
        harvestConversionWeight: nextWeight,
        harvestQuantityRaw: currentEnteredQty,
        harvestQuantity: norm != null ? norm : "",
      });
    }
  };

  const normalizedPreview =
    currentUnit !== "kg" && currentEnteredQty !== "" && currentConvWeight !== ""
      ? calculateNormalizedHarvestQuantity(currentEnteredQty, currentUnit, currentConvWeight)
      : null;

  return (
    <div className="space-y-6">
      {/* Farm area */}
      <div>
        <label className="block text-sm font-semibold text-[var(--hw-neutral-700)] mb-1.5">
          {t("farmer.assess.farm_area_label", {}, "Farm area")}
        </label>
        <div className="flex gap-2 items-stretch">
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
          {/* Unit toggle */}
          <div className="flex w-28 rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden flex-shrink-0">
            {["sqm", "ha"].map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => switchAreaUnit(u)}
                className={`flex-1 py-2.5 text-center text-sm font-medium transition-colors ${
                  data.farmAreaUnit === u
                    ? "bg-[var(--hw-green-700)] text-white"
                    : "bg-white text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"
                }`}
              >
                {u === "sqm" ? "sq m" : "ha"}
              </button>
            ))}
          </div>
        </div>
        {areaEquivalent && (
          <p className="mt-1.5 text-xs text-[var(--hw-neutral-700)]">{areaEquivalent}</p>
        )}
        {errors.farmArea && <p className="mt-1.5 text-sm text-red-600">{errors.farmArea}</p>}
      </div>

      {/* Expected harvest quantity */}
      <div>
        <label
          htmlFor="harvest-qty"
          className="block text-sm font-semibold text-[var(--hw-neutral-700)] mb-1.5"
        >
          {t("farmer.assess.harvest_qty_label", {}, "Expected harvest quantity")}
        </label>
        <div className="flex gap-2 items-stretch">
          <input
            id="harvest-qty"
            type="number"
            min="0"
            step="any"
            value={currentEnteredQty}
            onChange={(e) => handleQuantityChange(e.target.value)}
            placeholder={currentUnit === "kg" ? "e.g. 600" : currentUnit === "crate" ? "e.g. 20" : "e.g. 10"}
            className={`
              flex-1 px-3 py-2.5 rounded-xl border text-sm outline-none transition
              focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)]
              ${errors.harvestQuantity ? "border-red-400 bg-red-50" : "border-[var(--hw-neutral-200)] bg-white"}
            `}
          />
          {/* UOM Selector Dropdown */}
          <div className="relative w-28 flex-shrink-0">
            <select
              id="harvest-qty-unit"
              aria-label={t("farmer.assess.uom_label", {}, "Unit of measure")}
              value={currentUnit}
              onChange={(e) => switchHarvestUnit(e.target.value)}
              className="w-full h-full min-h-[42px] pl-3.5 pr-8 py-2.5 bg-white border border-[var(--hw-neutral-200)] rounded-xl text-sm font-semibold text-[var(--hw-neutral-900)] focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] outline-none appearance-none cursor-pointer transition-colors hover:bg-[var(--hw-neutral-50)] shadow-xs"
            >
              {HARVEST_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {t(u.labelKey, {}, u.fallback)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-500)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        {errors.harvestQuantity && <p className="mt-1.5 text-sm text-red-600">{errors.harvestQuantity}</p>}
        <p className="mt-1.5 text-xs text-[var(--hw-neutral-700)]">
          {t("farmer.assess.harvest_qty_helper", {}, "Enter your best estimate. This does not need to be exact.")}
        </p>

        {/* Conditional Weight Conversion for Crate / Sack */}
        {currentUnit !== "kg" && (
          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div>
              <label
                htmlFor="step2-harvest-conversion-weight"
                className="block text-xs font-semibold text-[var(--hw-neutral-700)] mb-1"
              >
                {currentUnit === "crate"
                  ? t("farmer.assess.weight_per_crate_label", {}, "Estimated Weight per Crate (kg)")
                  : t("farmer.assess.weight_per_sack_label", {}, "Estimated Weight per Sack (kg)")}
              </label>
              <div className="relative">
                <input
                  id="step2-harvest-conversion-weight"
                  type="number"
                  min="0"
                  step="any"
                  value={currentConvWeight}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  placeholder={currentUnit === "crate" ? "e.g. 15" : "e.g. 50"}
                  className={`
                    w-full pr-10 pl-3 py-2 rounded-lg border text-sm outline-none transition
                    focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)]
                    ${errors.harvestConversionWeight ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"}
                  `}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 pointer-events-none">
                  kg
                </span>
              </div>
              {errors.harvestConversionWeight && (
                <p className="mt-1 text-xs text-red-600">{errors.harvestConversionWeight}</p>
              )}
              <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                {currentUnit === "crate"
                  ? t("farmer.assess.harvest_weight_crate_hint", {}, "Enter the estimated weight of one crate in kg, not your total harvest.")
                  : t("farmer.assess.harvest_weight_sack_hint", {}, "Enter the estimated weight of one sack in kg, not your total harvest.")}
              </p>
            </div>

            {/* Equivalent total harvest preview */}
            {normalizedPreview != null && (
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--hw-green-800)] bg-[var(--hw-green-50)] px-2.5 py-1.5 rounded-lg border border-[var(--hw-green-200)]">
                <span>{t("farmer.assess.equivalent_harvest", {}, "Equivalent harvest:")}</span>
                <span>≈ {normalizedPreview.toLocaleString("en-PH")} kg</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expandable help */}
      <div className="rounded-2xl border border-[var(--hw-neutral-200)] bg-white overflow-hidden shadow-[var(--shadow-xs)]">
        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
        >
          <span className="text-sm font-medium text-[var(--hw-neutral-700)]">
            {t("farmer.assess.how_to_estimate_title", {}, "How can I estimate my harvest?")}
          </span>
          {helpOpen ? <ChevronUp className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" />}
        </button>
        {helpOpen && (
          <div className="px-4 pb-4 border-t border-[var(--hw-neutral-100)]">
            <p className="mt-3 text-sm text-[var(--hw-neutral-900)] leading-relaxed">
              {t("farmer.assess.how_to_estimate_desc", {}, "You may use your previous harvest, farm records, or advice from an agriculturist.")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export {
  Step2FarmHarvest
};
