import React from "react";
import { ChevronRight, Info } from "lucide-react";
import { useLanguage } from "../../../global/contexts/LanguageContext";
import { calculateNormalizedPrice } from "./types";

const FARMGATE_UNITS = [
  { id: "kg", labelKey: "farmer.assess.unit_kg", fallback: "Kg" },
  { id: "crate", labelKey: "farmer.assess.unit_crate", fallback: "Crate" },
  { id: "sack", labelKey: "farmer.assess.unit_sack", fallback: "Sack" },
];

export const FarmgatePriceInput = ({
  data,
  onChange,
  onEditStep = null,
  errors = {},
  idPrefix = "farmgate",
  showTitle = true,
  titleText = null,
  showHelperText = false,
  helperText = null,
  t: propT = null,
}) => {
  const { t: contextT } = useLanguage();
  const t = propT || contextT;

  const currentUnit = (data.farmgatePriceUnit || "kg").toLowerCase();
  const rawPrice =
    data.farmgatePriceRaw !== "" && data.farmgatePriceRaw !== undefined && data.farmgatePriceRaw !== null
      ? data.farmgatePriceRaw
      : (data.farmgatePrice ?? "");

  // Step 2 is the single source of truth for crate/sack conversion weight
  const step2Unit = (data.harvestQuantityUnit || "kg").toLowerCase();
  const step2WeightNum = Number(data.harvestConversionWeight);
  const hasStep2Weight =
    data.harvestConversionWeight !== "" &&
    data.harvestConversionWeight !== null &&
    data.harvestConversionWeight !== undefined &&
    Number.isFinite(step2WeightNum) &&
    step2WeightNum > 0;

  const isMatchingStep2Unit = currentUnit !== "kg" && step2Unit === currentUnit && hasStep2Weight;
  const activeConversionWeight = isMatchingStep2Unit ? step2WeightNum : null;

  const handlePriceChange = (valStr) => {
    if (valStr === "") {
      onChange({
        farmgatePriceRaw: "",
        farmgatePrice: "",
        farmgateConversionWeight: activeConversionWeight ?? "",
      });
      return;
    }
    const num = Number(valStr);
    const normalized = currentUnit === "kg"
      ? (num > 0 ? num : "")
      : (activeConversionWeight != null ? calculateNormalizedPrice(num, currentUnit, activeConversionWeight) : "");

    onChange({
      farmgatePriceRaw: num,
      farmgatePrice: normalized != null ? normalized : "",
      farmgateConversionWeight: activeConversionWeight ?? "",
    });
  };

  const handleUnitChange = (nextUnit) => {
    if (nextUnit === currentUnit) return;
    if (nextUnit === "kg") {
      const num = rawPrice !== "" ? Number(rawPrice) : "";
      onChange({
        farmgatePriceUnit: "kg",
        farmgateConversionWeight: "",
        farmgatePrice: num > 0 ? num : "",
      });
    } else {
      const matches = step2Unit === nextUnit && hasStep2Weight;
      const weight = matches ? step2WeightNum : "";
      const num = rawPrice !== "" ? Number(rawPrice) : "";
      const normalized = (matches && num > 0)
        ? calculateNormalizedPrice(num, nextUnit, weight)
        : "";
      onChange({
        farmgatePriceUnit: nextUnit,
        farmgateConversionWeight: weight,
        farmgatePrice: normalized != null ? normalized : "",
      });
    }
  };

  const normalizedPreview =
    currentUnit !== "kg" && rawPrice !== "" && activeConversionWeight !== null
      ? calculateNormalizedPrice(rawPrice, currentUnit, activeConversionWeight)
      : null;

  return (
    <div className="space-y-2.5">
      <div>
        {showTitle && (
          <label
            htmlFor={`${idPrefix}-price`}
            className="block text-xs sm:text-sm font-bold text-black mb-1.5"
          >
            {titleText || t("farmer.factors.profitability.farmgate_price_label", {}, "Estimated farmgate price")}
          </label>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-black pointer-events-none">
              ₱
            </span>
            <input
              id={`${idPrefix}-price`}
              type="number"
              min="0"
              step="any"
              value={rawPrice}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="e.g. 70"
              className={`
                w-full pl-8 pr-3 py-2.5 rounded-xl border text-sm font-semibold text-black outline-none transition
                focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)]
                ${errors.farmgatePrice ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"}
              `}
            />
          </div>

          {/* Unit selection toggle: Kg, Crate, Sack */}
          <div className="flex rounded-xl border border-slate-300 overflow-hidden flex-shrink-0">
            {FARMGATE_UNITS.map((u) => {
              const isActive = currentUnit === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleUnitChange(u.id)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${isActive
                      ? "bg-[var(--hw-green-700)] text-white"
                      : "bg-white text-black hover:bg-slate-50"
                    }`}
                >
                  {t(u.labelKey, {}, u.fallback)}
                </button>
              );
            })}
          </div>
        </div>

        {errors.farmgatePrice && (
          <p className="mt-1 text-sm font-semibold text-red-600">{errors.farmgatePrice}</p>
        )}

        {showHelperText && helperText && (
          <p className="mt-1.5 text-xs text-[var(--hw-neutral-700)]">{helperText}</p>
        )}
      </div>

      {/* Read-only reference or Step 2 prompt when Crate or Sack is selected */}
      {currentUnit !== "kg" && (
        <div className="space-y-1">
          {isMatchingStep2Unit ? (
            <div className="flex items-center justify-between text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[var(--hw-neutral-700)]">
                {currentUnit === "crate"
                  ? t(
                    "farmer.assess.using_step2_conversion_crate",
                    { weight: activeConversionWeight },
                    `Using conversion from Step 2: 1 crate = ${activeConversionWeight} kg`
                  )
                  : t(
                    "farmer.assess.using_step2_conversion_sack",
                    { weight: activeConversionWeight },
                    `Using conversion from Step 2: 1 sack = ${activeConversionWeight} kg`
                  )}
              </span>
              {normalizedPreview !== null && (
                <span className="font-semibold text-[var(--hw-green-700)]">
                  ₱{normalizedPreview.toFixed(2)}/kg
                </span>
              )}
            </div>
          ) : (
            /* Minimal inline notice: no conversion available, so no normalized price is shown */
            <div
              role="note"
              className={`flex items-center gap-2 text-xs leading-5 ${errors.farmgateConversionWeight
                ? "text-red-600"
                : "text-[var(--hw-neutral-700)]"
                }`}
            >
              <Info size={14} className="flex-shrink-0" aria-hidden="true" />
              <span className="flex-1 min-w-0">
                {currentUnit === "crate"
                  ? t(
                    "farmer.assess.missing_step2_conversion_crate",
                    {},
                    "Add crate weight in Step 2 to use this unit."
                  )
                  : t(
                    "farmer.assess.missing_step2_conversion_sack",
                    {},
                    "Add sack weight in Step 2 to use this unit."
                  )}
              </span>
              {onEditStep && (
                <button
                  type="button"
                  onClick={() => onEditStep(2)}
                  className="group flex-shrink-0 inline-flex items-center gap-0.5 text-xs leading-5 font-semibold text-[var(--hw-green-700)] underline-offset-2 hover:underline whitespace-nowrap"
                >
                  {t("farmer.assess.edit_step2_link", {}, "Edit Step 2")}
                  <ChevronRight
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>
          )}

          {/* The inline notice above already covers the missing-weight case */}
          {errors.farmgateConversionWeight && isMatchingStep2Unit && (
            <p className="text-xs font-semibold text-red-600">{errors.farmgateConversionWeight}</p>
          )}
        </div>
      )}
    </div>
  );
};
