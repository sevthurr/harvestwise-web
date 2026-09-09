import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Save, RotateCcw, AlertCircle, RefreshCw } from "lucide-react";
import { RecommendationResult } from "../components/recommend/RecommendationResult";
import {
  DEFAULT_ASSESSMENT,
  STEP_LABELS,
  TOTAL_STEPS,
  getTotalCost
} from "../components/recommend/types";
import { RecommendEntry } from "../components/recommend/RecommendEntry";
import { StepProgress } from "../components/recommend/StepProgress";
import { Step1CropSchedule } from "../components/recommend/Step1CropSchedule";
import { Step2FarmHarvest } from "../components/recommend/Step2FarmHarvest";
import { Step3ProductionCosts } from "../components/recommend/Step3ProductionCosts";
import { Step4ReviewBreakEven } from "../components/recommend/Step4ReviewBreakEven";
import { formatPeso } from "../components/recommend/types";
import { toCamelCase } from "../../global/utils/apiTransforms";
import { apiGet, apiPost, parseResponse } from "../../global/api";

import { useLanguage } from "../../global/contexts/LanguageContext";

function validateStep(step, data, t) {
  const errors = {};
  if (step === 1) {
    if (!data.commodity) errors.commodity = t ? t("farmer.assess.validation_crop", {}, "Select a vegetable before continuing.") : "Select a vegetable before continuing.";
    if (!data.plantingDate) errors.plantingDate = t ? t("farmer.assess.validation_planting_date", {}, "Enter your target planting date.") : "Enter your target planting date.";
    if (!data.harvestDate) errors.harvestDate = t ? t("farmer.assess.validation_harvest_date", {}, "Enter your expected harvest date.") : "Enter your expected harvest date.";
  }
  if (step === 2) {
    if (data.farmArea === "" || Number(data.farmArea) <= 0) errors.farmArea = t ? t("farmer.assess.validation_area", {}, "Enter your farm area.") : "Enter your farm area.";
    if (data.harvestQuantity === "" || Number(data.harvestQuantity) <= 0)
      errors.harvestQuantity = t ? t("farmer.assess.validation_harvest_qty", {}, "Expected harvest must be greater than zero.") : "Expected harvest must be greater than zero.";
  }
  if (step === 3) {
    if (getTotalCost(data) <= 0) errors.totalCost = t ? t("farmer.assess.validation_total_cost", {}, "Enter your estimated total cost.") : "Enter your estimated total cost.";
    if (data.useFarmgate && (data.farmgatePrice === "" || Number(data.farmgatePrice) <= 0)) {
      errors.farmgatePrice = t ? t("farmer.assess.validation_farmgate_price", {}, "Enter your estimated farmgate price, or uncheck the option above.") : "Enter your estimated farmgate price, or uncheck the option above.";
    }
  }
  return errors;
}

const StepActions = ({
  step,
  onBack,
  onContinue,
  onSaveDraft,
  isLastStep,
  onGenerate,
  loading = false,
  error = null,
  onRetry = null,
  t = null,
}) => (
  <div className="pt-4 border-t border-[var(--hw-neutral-200)] space-y-3">
    {error && (
      <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-sm text-red-700">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-red-800 underline hover:text-red-900"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          )}
        </div>
      </div>
    )}
    {isLastStep ? (
      <button
        type="button"
        onClick={onGenerate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-[var(--hw-green-700)] text-white font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            {t ? t("farmer.common.analyzing_plan", {}, "Analyzing crop plan...") : "Analyzing crop plan..."}
          </>
        ) : (
          <>
            {t ? t("farmer.common.see_advisory", {}, "See advisory") : "See advisory"}
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>
    ) : (
      <button
        type="button"
        onClick={onContinue}
        className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-[var(--hw-green-700)] text-white font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
      >
        {t ? t("common.continue", {}, "Continue") : "Continue"}
        <ChevronRight className="w-4 h-4" />
      </button>
    )}
    <div className="flex gap-2">
      {step > 1 && (
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex items-center justify-center gap-1 flex-1 py-2.5 px-4 bg-white text-[var(--hw-neutral-700)] font-medium rounded-xl border border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)] transition-colors text-sm disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
          {t ? t("common.back", {}, "Back") : "Back"}
        </button>
      )}
      <button
        type="button"
        onClick={onSaveDraft}
        disabled={loading}
        className="flex items-center justify-center gap-1.5 flex-1 py-2.5 px-4 bg-white text-[var(--hw-neutral-700)] font-medium rounded-xl border border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)] transition-colors text-sm disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {t ? t("farmer.common.save_draft", {}, "Save draft") : "Save draft"}
      </button>
    </div>
  </div>
);

function AssessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const [view, setView] = useState("entry");
  const [step, setStep] = useState(1);
  const [data, setData] = useState(() => {
    const pre = searchParams.get("commodity");
    return pre ? { ...DEFAULT_ASSESSMENT, commodity: pre } : DEFAULT_ASSESSMENT;
  });
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [loadingAdvisory, setLoadingAdvisory] = useState(false);
  const [advisoryError, setAdvisoryError] = useState(null);
  const [advisoryResponse, setAdvisoryResponse] = useState(null);

  // Reuse prefetched prices list for top10 commodities
  const { data: pricesListData, isLoading: loadingCommodities } = useQuery({
    queryKey: ["prices", "list"],
    queryFn: async () => {
      const response = await apiGet('/prices?is_top10=true&page_size=50');
      if (!response.ok) return { items: [] };
      return parseResponse(response);
    },
    staleTime: 1000 * 60 * 30,
  });

  const commodityOptions = useMemo(() => {
    const rawItems = pricesListData?.items || (Array.isArray(pricesListData) ? pricesListData : []);
    const seen = new Set();
    const top10 = [];
    rawItems.forEach(item => {
      const camelItem = toCamelCase(item);
      const isTop = camelItem.isTop10 === true || item.is_top10 === true;
      const cid = camelItem.commodityId || camelItem.id || item.commodity_id;
      const cname = camelItem.name || camelItem.commodityName || item.name;
      if (isTop && cid && cname && !seen.has(cid)) {
        seen.add(cid);
        top10.push({ id: cid, name: cname });
      }
    });
    return top10;
  }, [pricesListData]);

  useEffect(() => {
    const pre = searchParams.get("commodity");
    if (pre) {
      setData((d) => ({ ...d, commodity: pre }));
      setView("assessment");
      setStep(1);
    }
  }, []);

  const patch = (p) => {
    setData((d) => ({ ...d, ...p }));
    const cleared = Object.keys(p);
    setErrors((e) => {
      const next = { ...e };
      cleared.forEach((k) => delete next[k]);
      return next;
    });
  };

  const handleStart = () => {
    setData(DEFAULT_ASSESSMENT);
    setStep(1);
    setView("assessment");
    setErrors({});
    setShowResult(false);
    setAdvisoryError(null);
    setAdvisoryResponse(null);
  };

  const handleContinueDraft = () => {
    if (draft) {
      setData(draft);
      setStep(1);
      setView("assessment");
      setErrors({});
      setShowResult(false);
      setAdvisoryError(null);
      setAdvisoryResponse(null);
    }
  };

  const handleSaveDraft = () => setDraft({ ...data });

  const handleContinue = () => {
    const errs = validateStep(step, data, t);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setErrors({});
    if (step === 1) setView("entry");
    else setStep((s) => s - 1);
  };

  const handleEditStep = (s) => {
    setErrors({});
    setStep(s);
  };

  const handleGenerateAdvisory = async () => {
    const errs = validateStep(step, data, t);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoadingAdvisory(true);
    setAdvisoryError(null);
    setAdvisoryResponse(null);
    try {
      const selectedCommodity = commodityOptions.find((c) => c.id === data.commodity);
      const baseCropName = selectedCommodity?.name || data.commodity;
      const cropName = data.variant ? `${baseCropName} ${data.variant}` : baseCropName;
      const totalCost = getTotalCost(data);
      const yieldKg = Number(data.harvestQuantity) || 1;

      const payload = {
        crop_name: cropName,
        planting_date: data.plantingDate,
        expected_harvest_date: data.harvestDate,
        total_production_cost: Number(totalCost),
        expected_yield_kg: yieldKg,
      };

      const res = await apiPost("/advisory/plan", payload);
      if (!res.ok) {
        throw new Error("Failed to generate advisory");
      }
      const parsed = await parseResponse(res);
      setAdvisoryResponse(parsed);
      setShowResult(true);
    } catch (_err) {
      setAdvisoryError(
        t(
          "farmer.errors.crop_not_checked",
          {},
          "We could not check this crop right now. Please try again or choose the crop again."
        )
      );
    } finally {
      setLoadingAdvisory(false);
    }
  };

  const total = getTotalCost(data);
  const harvestQty = typeof data.harvestQuantity === "number" && data.harvestQuantity > 0 ? data.harvestQuantity : null;
  const breakEven = harvestQty && total > 0 ? Math.ceil(total / harvestQty) : null;
  const showSidePanel = step >= 3;

  if (showResult) {
    return (
      <RecommendationResult
        data={data}
        advisoryResponse={advisoryResponse}
        onEdit={() => setShowResult(false)}
      />
    );
  }
  if (view === "entry") {
    return <RecommendEntry hasDraft={draft !== null} onStart={handleStart} onContinueDraft={handleContinueDraft} />;
  }
  const SidePanel = () => <div className="hidden md:flex flex-col gap-3 sticky top-24">
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
        <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
          {t("farmer.assess.running_summary", {}, "Running summary")}
        </p>
        {data.commodity && <div>
            <p className="text-xs text-[var(--hw-neutral-700)]">
              {t("farmer.prices.category_vegetables", {}, "Vegetable")}
            </p>
            <p className="text-sm font-medium text-[var(--hw-neutral-900)]">
              {(() => {
                const n = commodityOptions.find((c) => c.id === data.commodity)?.name || "";
                return data.variant ? `${n} (${data.variant})` : n;
              })()}
            </p>
          </div>}
        {data.harvestQuantity !== "" && <div>
            <p className="text-xs text-[var(--hw-neutral-700)]">
              {t("farmer.factors.profitability.expected_harvest_volume_label", {}, "Expected harvest")}
            </p>
            <p className="text-sm font-medium text-[var(--hw-neutral-900)]">{data.harvestQuantity} kg</p>
          </div>}
        <div>
          <p className="text-xs text-[var(--hw-neutral-700)]">
            {t("farmer.factors.profitability.total_estimated_cost_label", {}, "Total production cost")}
          </p>
          <p className="text-sm font-semibold text-[var(--hw-neutral-900)]">{total > 0 ? formatPeso(total) : "—"}</p>
        </div>
        {breakEven && <div className="pt-2 border-t border-[var(--hw-neutral-100)]">
            <p className="text-xs text-[var(--hw-neutral-700)]">
              {t("farmer.factors.profitability.cost_to_recover_short_label", {}, "Break-even price")}
            </p>
            <p className="text-sm font-bold text-[var(--hw-green-700)]">{formatPeso(breakEven)}/kg</p>
          </div>}
      </div>
      <button
        type="button"
        onClick={() => {
          setView("entry");
          setErrors({});
        }}
        className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-white text-[var(--hw-neutral-900)] text-sm font-medium rounded-xl border border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)] transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        {t("farmer.assess.start_again", {}, "Start again")}
      </button>
    </div>;
  return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto">
        <div className={`md:grid gap-8 ${showSidePanel ? "md:grid-cols-[1fr_280px]" : ""}`}>
          <div className="space-y-6">
            <StepProgress currentStep={step} />
            <div>
              <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">
                {t(`farmer.assess.step${step}_title`, {}, STEP_LABELS[step])}
              </h1>
            </div>
            {step === 1 && <Step1CropSchedule data={data} onChange={patch} errors={errors} />}
            {step === 2 && <Step2FarmHarvest data={data} onChange={patch} errors={errors} />}
            {step === 3 && <Step3ProductionCosts data={data} onChange={patch} errors={errors} />}
            {step === 4 && <Step4ReviewBreakEven data={data} onChange={patch} onEditStep={handleEditStep} errors={errors} />}
            <StepActions
              step={step}
              onBack={handleBack}
              onContinue={handleContinue}
              onSaveDraft={handleSaveDraft}
              isLastStep={step === TOTAL_STEPS}
              onGenerate={handleGenerateAdvisory}
              loading={loadingAdvisory}
              error={advisoryError}
              onRetry={handleGenerateAdvisory}
              t={t}
            />
            <button
              type="button"
              onClick={() => {
                setView("entry");
                setErrors({});
              }}
              className="md:hidden flex items-center justify-center gap-1.5 w-full py-2 text-sm text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-800)] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("farmer.assess.start_again", {}, "Start again")}
            </button>
          </div>
          {showSidePanel && <SidePanel />}
        </div>

    </div>;
}
export {
  AssessPage as default
};
