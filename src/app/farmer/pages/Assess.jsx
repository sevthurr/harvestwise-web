import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Save, RotateCcw } from "lucide-react";
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
import { apiGet, parseResponse } from "../../global/api";

function validateStep(step, data) {
  const errors = {};
  if (step === 1) {
    if (!data.commodity) errors.commodity = "Select a vegetable before continuing.";
    if (!data.plantingDate) errors.plantingDate = "Enter your target planting date.";
    if (!data.harvestDate) errors.harvestDate = "Enter your expected harvest date.";
  }
  if (step === 2) {
    if (data.farmArea === "" || Number(data.farmArea) <= 0) errors.farmArea = "Enter your farm area.";
    if (data.harvestQuantity === "" || Number(data.harvestQuantity) <= 0)
      errors.harvestQuantity = "Expected harvest must be greater than zero.";
  }
  if (step === 3) {
    if (getTotalCost(data) <= 0) errors.totalCost = "Enter your estimated total cost.";
    if (data.useFarmgate && (data.farmgatePrice === "" || Number(data.farmgatePrice) <= 0)) {
      errors.farmgatePrice = "Enter your estimated farmgate price, or uncheck the option above.";
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
  onGenerate
}) => <div className="pt-4 border-t border-[var(--hw-neutral-200)] space-y-3">
    {isLastStep ? <button
  type="button"
  onClick={onGenerate}
  className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-[var(--hw-green-700)] text-white font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
>
        See advisory
        <ChevronRight className="w-4 h-4" />
      </button> : <button
  type="button"
  onClick={onContinue}
  className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-[var(--hw-green-700)] text-white font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
>
        Continue
        <ChevronRight className="w-4 h-4" />
      </button>}
    <div className="flex gap-2">
      {step > 1 && <button
  type="button"
  onClick={onBack}
  className="flex items-center justify-center gap-1 flex-1 py-2.5 px-4 bg-white text-[var(--hw-neutral-700)] font-medium rounded-xl border border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)] transition-colors text-sm"
>
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>}
      <button
  type="button"
  onClick={onSaveDraft}
  className="flex items-center justify-center gap-1.5 flex-1 py-2.5 px-4 bg-white text-[var(--hw-neutral-700)] font-medium rounded-xl border border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)] transition-colors text-sm"
>
        <Save className="w-4 h-4" />
        Save draft
      </button>
    </div>
  </div>;

function AssessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState("entry");
  const [step, setStep] = useState(1);
  const [commodityOptions, setCommodityOptions] = useState([]);
  const [loadingCommodities, setLoadingCommodities] = useState(true);
  const [data, setData] = useState(() => {
    const pre = searchParams.get("commodity");
    return pre ? { ...DEFAULT_ASSESSMENT, commodity: pre } : DEFAULT_ASSESSMENT;
  });
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [showResult, setShowResult] = useState(false);

  // Fetch top10 commodities from API
  useEffect(() => {
    const fetchCommodities = async () => {
      try {
        setLoadingCommodities(true);
        const response = await apiGet('/prices?page_size=100');
        if (response.ok) {
          const resData = await parseResponse(response);
          const rawItems = resData?.items || (Array.isArray(resData) ? resData : []);
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
          setCommodityOptions(top10);
        }
      } catch (error) {
        console.error('Failed to fetch commodities:', error);
        setCommodityOptions([]);
      } finally {
        setLoadingCommodities(false);
      }
    };

    fetchCommodities();
  }, []);
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
  };
  const handleContinueDraft = () => {
    if (draft) {
      setData(draft);
      setStep(1);
      setView("assessment");
      setErrors({});
      setShowResult(false);
    }
  };
  const handleSaveDraft = () => setDraft({ ...data });
  const handleContinue = () => {
    const errs = validateStep(step, data);
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
  const total = getTotalCost(data);
  const harvestQty = typeof data.harvestQuantity === "number" && data.harvestQuantity > 0 ? data.harvestQuantity : null;
  const breakEven = harvestQty && total > 0 ? Math.ceil(total / harvestQty) : null;
  const showSidePanel = step >= 3;
  if (showResult) {
    return <RecommendationResult data={data} onEdit={() => setShowResult(false)} />;
  }
  if (view === "entry") {
    return <RecommendEntry hasDraft={draft !== null} onStart={handleStart} onContinueDraft={handleContinueDraft} />;
  }
  const SidePanel = () => <div className="hidden md:flex flex-col gap-3 sticky top-24">
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
        <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Running summary</p>
        {data.commodity && <div>
            <p className="text-xs text-[var(--hw-neutral-700)]">Vegetable</p>
            <p className="text-sm font-medium text-[var(--hw-neutral-900)]">
              {commodityOptions.find((c) => c.id === data.commodity)?.name}
            </p>
          </div>}
        {data.harvestQuantity !== "" && <div>
            <p className="text-xs text-[var(--hw-neutral-700)]">Expected harvest</p>
            <p className="text-sm font-medium text-[var(--hw-neutral-900)]">{data.harvestQuantity} kg</p>
          </div>}
        <div>
          <p className="text-xs text-[var(--hw-neutral-700)]">Total production cost</p>
          <p className="text-sm font-semibold text-[var(--hw-neutral-900)]">{total > 0 ? formatPeso(total) : "\u2014"}</p>
        </div>
        {breakEven && <div className="pt-2 border-t border-[var(--hw-neutral-100)]">
            <p className="text-xs text-[var(--hw-neutral-700)]">Break-even price</p>
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
        Start again
      </button>
    </div>;
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-lg mx-auto md:max-w-4xl">
        <div className={`md:grid gap-8 ${showSidePanel ? "md:grid-cols-[1fr_280px]" : ""}`}>
          <div className="space-y-6">
            <StepProgress currentStep={step} />
            <div>
              <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">{STEP_LABELS[step]}</h1>
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
    onGenerate={() => setShowResult(true)}
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
              Start again
            </button>
          </div>
          {showSidePanel && <SidePanel />}
        </div>
      </div>
    </div>;
}
export {
  AssessPage as default
};
