import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Pencil,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { getTotalCost, formatPeso, formatDurationLabel, COMMODITY_OPTIONS, getCropDuration } from "./types";
import { durationForOption, findCatalogOption, useCommodityCatalog } from "./useCommodityCatalog";
import { useLanguage } from "../../../global/contexts/LanguageContext";
import { fetchPricesList } from "../../../global/hooks/useFarmerPrefetch";
import { getCommodityIconKey } from "../../../global/components/shared/CommodityIllustrations";
import { toCamelCase } from "../../../global/utils/apiTransforms";
import { getVariants, HW_ID_TO_NAME } from "../../../global/data/commodities";

const ReviewRow = ({ label, value, onEdit, t }) => (
  <div className="flex items-start justify-between gap-3 py-2.5">
    <div className="min-w-0">
      <p className="text-xs font-semibold text-black">{label}</p>
      <p className="text-sm font-bold text-black mt-0.5">{value || "—"}</p>
    </div>
    <button
      type="button"
      onClick={onEdit}
      className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors mt-0.5"
    >
      <Pencil className="w-3 h-3" />
      {t ? t("common.edit", {}, "Edit") : "Edit"}
    </button>
  </div>
);

const MarketPriceCard = ({ variantItem, farmgatePrice, breakEven, commodityName, t }) => {
  const displayName = variantItem.variety
    ? `${commodityName} (${variantItem.variety})`
    : (variantItem.name || commodityName);
  const numPrice = typeof farmgatePrice === "number" && farmgatePrice > 0 ? farmgatePrice : null;
  const hasComparison = numPrice !== null && breakEven !== null;
  const difference = hasComparison ? numPrice - breakEven : null;
  const differenceAbs = difference !== null ? Math.abs(difference) : null;
  const percentage = difference !== null && breakEven > 0
    ? Math.abs((difference / breakEven) * 100).toFixed(1)
    : null;

  return (
    <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
      {/* Full crop and variety name without truncation */}
      <p className="text-sm font-bold text-black">
        {displayName}
      </p>

      {/* Two clean metric blocks */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg border border-slate-200 bg-white">
          <span className="text-[11px] font-medium text-black block leading-tight">
            {t("farmer.assess.current_market_price", {}, "Current market price")}
          </span>
          <span className="text-sm font-bold text-black mt-0.5 block">
            {typeof variantItem.avgPrice === "number"
              ? `₱${variantItem.avgPrice.toFixed(2)}/kg`
              : t("farmer.assess.no_market_price", {}, "No current market price")}
          </span>
        </div>
        <div className="p-2 rounded-lg border border-slate-200 bg-white">
          <span className="text-[11px] font-medium text-black block leading-tight">
            {t("farmer.assess.break_even_price", {}, "Break-even price")}
          </span>
          <span className="text-sm font-bold text-black mt-0.5 block">
            {breakEven !== null
              ? `₱${breakEven}/kg`
              : t("farmer.assess.no_break_even_data", {}, "No break-even price")}
          </span>
        </div>
      </div>

      {/* Comparison row */}
      {hasComparison && (
        <div className="flex items-center gap-1.5 pt-0.5">
          {difference > 0.005 ? (
            <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : difference < -0.005 ? (
            <TrendingDown className="w-4 h-4 text-amber-600 flex-shrink-0" />
          ) : (
            <Minus className="w-4 h-4 text-blue-600 flex-shrink-0" />
          )}
          <p className="text-xs font-semibold text-black leading-tight">
            {difference > 0.005
              ? t("farmer.assess.diff_higher_break_even", { diff: differenceAbs.toFixed(2), pct: percentage }, `₱${differenceAbs.toFixed(2)} higher (+${percentage}%) than break-even price`)
              : difference < -0.005
                ? t("farmer.assess.diff_lower_break_even", { diff: differenceAbs.toFixed(2), pct: percentage }, `₱${differenceAbs.toFixed(2)} lower (-${percentage}%) than break-even price`)
                : t("farmer.assess.diff_equal_break_even", {}, "Equal to break-even price")}
          </p>
        </div>
      )}
    </div>
  );
};

const Step4ReviewBreakEven = ({
  data,
  onChange,
  onEditStep,
  errors
}) => {
  const { t } = useLanguage();
  const [calcOpen, setCalcOpen] = useState(false);
  const { options } = useCommodityCatalog();
  const selectedOption = findCatalogOption(options, data.commodity);
  const commodityKey = selectedOption?.id || data.commodity;
  // API duration first, CROP_DURATIONS as the fallback table (see Step1).
  const apiDuration = durationForOption(selectedOption, data.variant);
  const duration = apiDuration || (data.commodity ? getCropDuration(data.commodity, data.variant) : null);
  const durationVarKey = data.variant
    ? `duration_${data.commodity}_${data.variant.toLowerCase().replace(/[^a-z0-9]/g, "_")}`
    : `duration_${data.commodity}`;
  const durationLabel = formatDurationLabel(apiDuration, t)
    || (data.commodity ? t(`farmer.assess.${durationVarKey}`, {}, duration?.label || "") : null);
  const commodityLabel = selectedOption?.name
    || COMMODITY_OPTIONS.find((c) => c.id === commodityKey)?.name
    || data.commodityName
    || HW_ID_TO_NAME[commodityKey]
    || data.commodity
    || "\u2014";
  const displayLabel = data.variant ? `${commodityLabel} (${data.variant})` : commodityLabel;
  const totalCost = getTotalCost({
    ...data,
    simpleCost: Number(data.simpleCost) || 0,
    expenses: (data.expenses || []).map((expense) => ({
      ...expense,
      amount: Number(expense.amount) || 0,
    })),
  });
  const harvestQty = Number(data.harvestQuantity) > 0 ? Number(data.harvestQuantity) : null;
  const breakEven = harvestQty ? Math.ceil(totalCost / harvestQty) : null;
  const farmAreaText = data.farmArea !== "" ? `${data.farmArea} ${data.farmAreaUnit === "sqm" ? t("farmer.assess.sqm", {}, "sq m") : t("farmer.assess.hectares", {}, "ha")}` : "—";

  // Query top10 prices from cache / API
  const { data: pricesListData } = useQuery({
    queryKey: ["prices", "list"],
    queryFn: fetchPricesList,
    staleTime: 1000 * 60 * 30,
  });

  const variantPricingList = useMemo(() => {
    if (!data.commodity) return [];
    const rawItems = pricesListData?.items || (Array.isArray(pricesListData) ? pricesListData : []);
    const matching = [];

    rawItems.forEach((item) => {
      const camelItem = toCamelCase(item);
      const isTop = camelItem.isTop10 === true || item.is_top10 === true;
      if (!isTop) return;

      const nameStr = camelItem.name || camelItem.commodityName || item.name || "";
      const iconKey = getCommodityIconKey(camelItem.commodityId, camelItem.baseName, nameStr);
      if (iconKey !== commodityKey) return;

      let varietyName = camelItem.variety || "";
      if (!varietyName && nameStr.includes("-")) {
        varietyName = nameStr.split("-").slice(1).join("-").trim();
      }

      const p = camelItem.prices || item.prices || {};
      const validPrices = [
        p.bangkerohanRetail ?? p.bangkerohan_retail,
        p.bangkerohanWholesale ?? p.bangkerohan_wholesale,
        p.dftcRetail ?? p.dftc_retail,
        p.dftcWholesale ?? p.dftc_wholesale,
      ].filter((v) => typeof v === "number" && v > 0);

      const avgPrice = validPrices.length > 0
        ? validPrices.reduce((sum, v) => sum + v, 0) / validPrices.length
        : null;

      matching.push({
        id: camelItem.commodityId || item.id,
        name: camelItem.name || nameStr,
        baseName: camelItem.baseName || nameStr.split("-")[0].trim(),
        variety: varietyName,
        avgPrice,
      });
    });

    const baseName = commodityLabel;
    const localVariants = getVariants(baseName);

    if (matching.length === 0) {
      if (localVariants.length > 0) {
        return localVariants.map((v) => ({
          id: `${data.commodity}-${v.toLowerCase()}`,
          name: `${baseName} (${v})`,
          variety: v,
          avgPrice: null,
        }));
      }
      return [{
        id: commodityKey,
        name: baseName,
        variety: "",
        avgPrice: null,
      }];
    }

    return matching;
  }, [pricesListData, commodityKey, commodityLabel]);

  const displayedVariants = useMemo(() => {
    if (!data.commodity) return [];
    if (data.variant) {
      const normSelected = data.variant.toLowerCase().trim();
      const match = variantPricingList.find(
        (v) => (v.variety && v.variety.toLowerCase().trim() === normSelected) ||
               (v.name && v.name.toLowerCase().includes(normSelected))
      );
      if (match) return [match];

      const fallbackAvg = variantPricingList[0]?.avgPrice ?? null;
      return [{
        id: `${commodityKey}-${normSelected}`,
        name: `${commodityLabel} (${data.variant})`,
        variety: data.variant,
        avgPrice: fallbackAvg,
      }];
    }
    return variantPricingList;
  }, [variantPricingList, data.commodity, data.variant, commodityLabel]);

  return (
    <div className="space-y-5">
      {/* 1. Farmgate price section (Transferred before Pagbawi sa Gasto) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-4 space-y-3">
        <div>
          <p className="text-sm font-bold text-black">
            {t("farmer.assess.how_will_you_sell", {}, "How will you sell?")}
          </p>
          <label className="flex items-start gap-2.5 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={data.useFarmgate}
              onChange={(e) => onChange({
                useFarmgate: e.target.checked,
                farmgatePrice: e.target.checked ? data.farmgatePrice : ""
              })}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[var(--hw-green-700)] focus:ring-[var(--hw-green-600)] cursor-pointer"
            />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-black">
                {t("farmer.assess.sell_farmgate_check", {}, "I will sell the produce to a buyer using farmgate price.")}
              </p>
              <p className="text-[11px] sm:text-[12px] text-black mt-0.5 font-normal">
                {t("farmer.assess.farmgate_explainer", {}, "Farmgate price is the price a buyer may pay you. You can update this later.")}
              </p>
            </div>
          </label>
        </div>

        {data.useFarmgate ? (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div>
              <label
                htmlFor="farmgate-price"
                className="block text-xs sm:text-sm font-bold text-black mb-1"
              >
                {t("farmer.factors.profitability.farmgate_price_label", {}, "Estimated farmgate price")}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-black flex-shrink-0">₱</span>
                <input
                  id="farmgate-price"
                  type="number"
                  min="0"
                  step="any"
                  value={data.farmgatePrice}
                  onChange={(e) => onChange({ farmgatePrice: e.target.value === "" ? "" : Number(e.target.value) })}
                  placeholder="e.g. 70"
                  className={`
                    flex-1 px-3 py-2 rounded-xl border text-sm font-semibold text-black outline-none transition
                    focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)]
                    ${errors?.farmgatePrice ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"}
                  `}
                />
                <span className="text-sm font-bold text-black flex-shrink-0">/kg</span>
              </div>
              {errors?.farmgatePrice && <p className="mt-1 text-sm font-semibold text-red-600">{errors.farmgatePrice}</p>}
            </div>

            {/* Current market price reference */}
            {displayedVariants.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-bold text-black uppercase tracking-wide">
                  {!data.variant && displayedVariants.length > 1
                    ? t("farmer.assess.current_market_prices", {}, "Current market prices")
                    : t("farmer.assess.farmgate_price_comparison", {}, "Farmgate price comparison with break-even price")}
                </p>
                <div className="space-y-2">
                  {displayedVariants.map((v) => (
                    <MarketPriceCard
                      key={v.id || v.variety || v.name}
                      variantItem={v}
                      farmgatePrice={data.farmgatePrice}
                      breakEven={breakEven}
                      commodityName={commodityLabel}
                      t={t}
                    />
                  ))}
                </div>
                {(!data.farmgatePrice || Number(data.farmgatePrice) <= 0) && (
                  <p className="text-xs font-medium text-black pt-1">
                    {t("farmer.assess.type_to_compare_break_even", {}, "Enter your farmgate price above to compare it with your break-even price.")}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs font-medium text-black pt-2 border-t border-slate-200">
            {t("farmer.assess.market_reference_note", {}, "Market price will be used as reference. Actual buyer price may be different.")}
          </p>
        )}
      </div>

      {/* 2. Cost to recover / Pagbawi sa Gasto */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
        <p className="text-xs font-bold text-black uppercase tracking-wide">
          {t("farmer.factors.profitability.cost_to_recover_short_label", {}, "Cost to recover per kg")}
        </p>

        {breakEven !== null ? (
          <>
            <p className="font-bold text-black leading-snug">
              {t("farmer.assess.need_to_sell", {
                crop: displayLabel,
                price: breakEven
              }, `You need to sell ${displayLabel} for at least ₱${breakEven}/kg to recover your expected costs.`)}
            </p>
            <p className="text-sm font-medium text-black leading-relaxed">
              {t("farmer.assess.cost_to_recover_sub", {}, "A selling price above this amount means estimated profit. Below means a possible loss.")}
            </p>

            {/* Expandable calculation */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setCalcOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
              >
                <span className="text-sm font-bold text-black">
                  {t("farmer.assess.how_calculated", {}, "How was this calculated?")}
                </span>
                {calcOpen ? <ChevronUp className="w-4 h-4 text-black flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-black flex-shrink-0" />}
              </button>
              {calcOpen && (
                <div className="px-3 pb-3 border-t border-slate-200">
                  <p className="mt-2.5 text-sm font-medium text-black leading-relaxed">
                    {t("farmer.assess.how_calculated_desc", {
                      cost: formatPeso(totalCost),
                      harvest: data.harvestQuantity || 0,
                      qty: data.harvestQuantity || 0
                    }, `HarvestWise divided your estimated total cost of ${formatPeso(totalCost)} by your expected harvest of ${data.harvestQuantity} kilograms.`)}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-start gap-2 text-amber-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-semibold">
              {t("farmer.assess.enter_harvest_qty_to_calc", {}, "Enter an expected harvest quantity to calculate your break-even price.")}
            </p>
          </div>
        )}
      </div>

      {/* 3. Review of inputs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <p className="text-xs font-bold text-black uppercase tracking-wide">
            {t("farmer.assess.review_inputs_title", {}, "Review of inputs")}
          </p>
        </div>
        <div className="px-4 divide-y divide-slate-200">
          <ReviewRow label={t("farmer.prices.category_vegetables", {}, "Vegetable")} value={displayLabel} onEdit={() => onEditStep(1)} t={t} />
          {data.variant && <ReviewRow label={t("farmer.commodityDetail.variety", {}, "Variety")} value={data.variant} onEdit={() => onEditStep(1)} t={t} />}
          <ReviewRow label={t("farmer.assess.target_planting_date", {}, "Target planting date")} value={data.plantingDate} onEdit={() => onEditStep(1)} t={t} />
          <ReviewRow label={t("farmer.assess.expected_harvest_date", {}, "Expected harvest date")} value={data.harvestDate} onEdit={() => onEditStep(1)} t={t} />
          {duration && <ReviewRow label={t("farmer.assess.typical_crop_duration", {}, "Typical crop duration")} value={durationLabel} onEdit={() => onEditStep(1)} t={t} />}
          <ReviewRow label={t("farmer.assess.farm_area_label", {}, "Farm area")} value={farmAreaText} onEdit={() => onEditStep(2)} t={t} />
          <ReviewRow
            label={t("farmer.factors.profitability.expected_harvest_volume_label", {}, "Expected harvest")}
            value={data.harvestQuantity !== "" ? `${data.harvestQuantity} kg` : "—"}
            onEdit={() => onEditStep(2)}
            t={t}
          />
          <ReviewRow
            label={t("farmer.factors.profitability.total_estimated_cost_label", {}, "Total production cost")}
            value={totalCost > 0 ? formatPeso(totalCost) : "—"}
            onEdit={() => onEditStep(3)}
            t={t}
          />
          <ReviewRow
            label={t("farmer.factors.profitability.farmgate_price_label", {}, "Estimated Farmgate Price")}
            value={data.useFarmgate && data.farmgatePrice !== "" && Number(data.farmgatePrice) > 0 ? `₱${data.farmgatePrice}/kg` : t("farmer.assess.not_set", {}, "Not set")}
            onEdit={() => {
              const el = document.getElementById("farmgate-price");
              if (el) el.focus();
            }}
            t={t}
          />
        </div>
      </div>
    </div>
  );
};

export {
  Step4ReviewBreakEven
};
