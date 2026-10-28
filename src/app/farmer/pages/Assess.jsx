import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Save, RotateCcw, AlertCircle, RefreshCw, Check, FileText } from "lucide-react";
import { RecommendationResult } from "../components/recommend/RecommendationResult";
import {
  DEFAULT_ASSESSMENT,
  STEP_LABELS,
  TOTAL_STEPS,
  getTotalCost,
  makeDefaultExpenses,
  toSqm
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
import { useCrops } from "../components/crops/CropsContext";

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
  }
  if (step === 4) {
    if (data.useFarmgate && (data.farmgatePrice === "" || Number(data.farmgatePrice) <= 0)) {
      errors.farmgatePrice = t ? t("farmer.assess.validation_farmgate_price", {}, "Enter your estimated farmgate price, or uncheck the option above.") : "Enter your estimated farmgate price, or uncheck the option above.";
    }
  }
  return errors;
}

function buildDraftPayload(data) {
  const totalCost = getTotalCost(data);
  const productionCosts = data.costMethod === "detailed"
    ? (data.expenses || [])
        .filter((e) => typeof e.amount === "number" && e.amount > 0)
        .map((e) => ({
          category: e.name || "Additional",
          amount: e.amount,
          cost_type: "initial",
        }))
    : totalCost > 0
      ? [{ category: "Total Cost", amount: totalCost, cost_type: "initial" }]
      : [];

  return {
    plan_id: data.draftId || null,
    commodity_id: data.commodityId || data.commodity,
    planned_planting_date: data.plantingDate || null,
    expected_harvest_date: data.harvestDate || null,
    farm_area: toSqm(data.farmArea, data.farmAreaUnit),
    expected_harvest_qty: typeof data.harvestQuantity === "number" && data.harvestQuantity > 0 ? data.harvestQuantity : null,
    expected_farmgate_price: data.useFarmgate && typeof data.farmgatePrice === "number" && data.farmgatePrice > 0 ? data.farmgatePrice : null,
    cost_entry_mode: data.costMethod === "detailed" ? "detailed" : "simple",
    production_costs: productionCosts,
  };
}

const StepActions = ({
  step,
  onBack,
  onContinue,
  onSaveDraft,
  isLastStep,
  onGenerate,
  loading = false,
  savingDraft = false,
  draftStatus = null,
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
              <RefreshCw className="w-3.5 h-3.5" />
              {t ? t("common.try_again", {}, "Sulayi Pag-usab") : "Sulayi Pag-usab"}
            </button>
          )}
        </div>
      </div>
    )}
    {draftStatus && (
      <div className={`rounded-xl px-3 py-2 flex items-start gap-2 text-[12px] ${draftStatus.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
        {draftStatus.type === "success" ? <Check className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
        <span>{draftStatus.message}</span>
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
        disabled={loading || savingDraft}
        className="flex items-center justify-center gap-1.5 flex-1 py-2.5 px-4 bg-white text-[var(--hw-neutral-700)] font-medium rounded-xl border border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)] transition-colors text-sm disabled:opacity-50"
      >
        {savingDraft ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {savingDraft
          ? (t ? t("farmer.common.saving_draft", {}, "Saving draft...") : "Saving draft...")
          : (t ? t("farmer.common.save_draft", {}, "Save draft") : "Save draft")}
      </button>
    </div>
  </div>
);

function AssessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { t } = useLanguage();
  const [view, setView] = useState("entry");
  const [step, setStep] = useState(1);
  const [data, setData] = useState(() => {
    const pre = searchParams.get("commodity");
    return pre ? { ...DEFAULT_ASSESSMENT, commodity: pre } : DEFAULT_ASSESSMENT;
  });
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftStatus, setDraftStatus] = useState(null);
  const [errors, setErrors] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [loadingAdvisory, setLoadingAdvisory] = useState(false);
  const [advisoryError, setAdvisoryError] = useState(null);
  const [advisoryResponse, setAdvisoryResponse] = useState(null);

  const { crops, loading: cropsLoading, refreshCrops } = useCrops();
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftLoadError, setDraftLoadError] = useState(null);

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
    const resume = location.state?.resumeRecommendation;
    if (resume?.data) {
      setData(resume.data);
      if (resume.advisoryResponse) {
        setAdvisoryResponse(resume.advisoryResponse);
      }
      setShowResult(true);
      return;
    }

    const resumeDraftId = searchParams.get("resumeDraft") || searchParams.get("draft") || searchParams.get("id");
    if (resumeDraftId) {
      if (cropsLoading) {
        setDraftLoading(true);
        return;
      }

      setDraftLoading(false);
      let match = Array.isArray(crops) ? crops.find((c) => c.id === resumeDraftId) : null;

      if (!match) {
        try {
          const raw = localStorage.getItem("harvestwise_assessment_draft");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && (resumeDraftId === "local_draft" || parsed.draftId === resumeDraftId || parsed.isDraft)) {
              match = {
                id: parsed.draftId || "local_draft",
                commodity: parsed.commodity || "",
                commodityId: parsed.commodityId || parsed.commodity || "",
                commodityName: parsed.commodityName || "",
                variant: parsed.variant || "",
                rawPlantingDate: parsed.plantingDate || "",
                rawHarvestDate: parsed.harvestDate || "",
                farmArea: parsed.farmArea ?? "",
                farmAreaUnit: parsed.farmAreaUnit || "sqm",
                harvestQuantity: parsed.harvestQuantity ?? "",
                costMethod: parsed.costMethod || "simple",
                totalCost: parsed.totalCost || parsed.simpleCost || 0,
                expenses: parsed.expenses,
                farmgatePrice: parsed.farmgatePrice,
                status: "Draft",
                isDraft: true,
              };
            }
          }
        } catch {
          // ignore
        }
      }

      if (match) {
        const expenses =
          match.costMethod === "detailed" && Array.isArray(match.expenses) && match.expenses.length > 0
            ? match.expenses
            : makeDefaultExpenses();
        setData({
          ...DEFAULT_ASSESSMENT,
          commodity: match.commodity || "",
          commodityId: match.commodityId || match.commodity || "",
          commodityName: match.commodityName || "",
          variant: match.variant || match.variety || "",
          plantingDate: match.rawPlantingDate || match.plantingDate || "",
          harvestDate: match.rawHarvestDate || match.harvestDate || "",
          farmArea: match.farmArea ?? "",
          farmAreaUnit: match.farmAreaUnit || "sqm",
          harvestQuantity: match.harvestQuantity ?? "",
          costMethod: match.costMethod || "simple",
          simpleCost: match.costMethod !== "detailed" ? (match.totalCost || "") : "",
          expenses,
          useFarmgate: Boolean(match.farmgatePrice && match.farmgatePrice > 0),
          farmgatePrice: match.farmgatePrice ?? "",
          draftId: match.id === "local_draft" ? null : match.id,
          isDraft: true,
        });
        setDraftStatus(null);
        setDraftLoadError(null);
        setStep(1);
        setView("assessment");
        setErrors({});
        setShowResult(false);
        return;
      }

      if (resumeDraftId !== "local_draft") {
        setDraftLoading(true);
        (async () => {
          try {
            const res = await apiGet(`/crop-plans/${resumeDraftId}`);
            if (!res.ok) {
              throw new Error("Draft not found");
            }
            const rawPlan = await parseResponse(res);
            if (rawPlan.status !== "Draft") {
              throw new Error("Not a draft assessment");
            }
            const prodCosts = Array.isArray(rawPlan.production_costs) ? rawPlan.production_costs : [];
            const exps = rawPlan.cost_entry_mode === "detailed"
              ? prodCosts.map((c, i) => ({ id: String(i + 1), name: c.category || "Additional", amount: Number(c.amount || 0), isCustom: true }))
              : makeDefaultExpenses();
            setData({
              ...DEFAULT_ASSESSMENT,
              commodity: rawPlan.commodity_id || "",
              commodityId: rawPlan.commodity_id || "",
              commodityName: rawPlan.commodity?.name || "",
              variant: rawPlan.commodity?.variety || "",
              plantingDate: rawPlan.planned_planting_date || "",
              harvestDate: rawPlan.expected_harvest_date || "",
              farmArea: rawPlan.farm_area ?? "",
              farmAreaUnit: "sqm",
              harvestQuantity: rawPlan.expected_harvest_qty == null ? "" : Number(rawPlan.expected_harvest_qty),
              costMethod: rawPlan.cost_entry_mode || "simple",
              simpleCost: rawPlan.cost_entry_mode !== "detailed" && prodCosts[0] ? Number(prodCosts[0].amount || 0) : "",
              expenses: exps,
              useFarmgate: Boolean(rawPlan.expected_farmgate_price && Number(rawPlan.expected_farmgate_price) > 0),
              farmgatePrice: rawPlan.expected_farmgate_price ?? "",
              draftId: rawPlan.id,
              isDraft: true,
            });
            setDraftStatus(null);
            setDraftLoadError(null);
            setStep(1);
            setView("assessment");
            setErrors({});
            setShowResult(false);
          } catch (_err) {
            setDraftLoadError(
              t(
                "farmer.draft.not_found_message",
                {},
                "The requested draft assessment could not be found or you do not have permission to access it."
              )
            );
          } finally {
            setDraftLoading(false);
          }
        })();
        return;
      }

      setDraftLoadError(
        t(
          "farmer.draft.not_found_message",
          {},
          "The requested draft assessment could not be found or you do not have permission to access it."
        )
      );
      return;
    }

    setDraftLoadError(null);
    setDraftLoading(false);
    const pre = searchParams.get("commodity");
    if (pre) {
      const existingCropDraft = Array.isArray(crops) ? crops.find((c) =>
        (c.phase === "draft" || c.status === "Draft" || c.isDraft) &&
        (c.commodityId === pre || c.commodity === pre || (c.commodityName || "").toLowerCase() === pre.toLowerCase())
      ) : null;

      if (existingCropDraft) {
        setData({
          ...DEFAULT_ASSESSMENT,
          commodity: existingCropDraft.commodity || pre,
          commodityId: existingCropDraft.commodityId || existingCropDraft.commodity || pre,
          commodityName: existingCropDraft.commodityName || "",
          variant: existingCropDraft.variant || existingCropDraft.variety || "",
          plantingDate: existingCropDraft.rawPlantingDate || existingCropDraft.plantingDate || "",
          harvestDate: existingCropDraft.rawHarvestDate || existingCropDraft.harvestDate || "",
          farmArea: existingCropDraft.farmArea ?? "",
          farmAreaUnit: existingCropDraft.farmAreaUnit || "sqm",
          harvestQuantity: existingCropDraft.harvestQuantity ?? "",
          costMethod: existingCropDraft.costMethod || "simple",
          simpleCost: existingCropDraft.costMethod !== "detailed" ? (existingCropDraft.totalCost || "") : "",
          expenses: existingCropDraft.expenses && existingCropDraft.expenses.length > 0 ? existingCropDraft.expenses : makeDefaultExpenses(),
          useFarmgate: Boolean(existingCropDraft.farmgatePrice && existingCropDraft.farmgatePrice > 0),
          farmgatePrice: existingCropDraft.farmgatePrice ?? "",
          draftId: existingCropDraft.id,
          isDraft: true,
        });
      } else {
        setData((d) => ({ ...d, commodity: pre }));
      }
      setView("assessment");
      setStep(1);
    }
  }, [searchParams, crops, cropsLoading]);

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
    try {
      localStorage.removeItem("harvestwise_assessment_draft");
    } catch {
      // ignore
    }
    setDraftLoadError(null);
    setDraftLoading(false);
    setData(DEFAULT_ASSESSMENT);
    setStep(1);
    setView("assessment");
    setErrors({});
    setShowResult(false);
    setAdvisoryError(null);
    setAdvisoryResponse(null);
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setDraftStatus(null);

    if (!data.commodity) {
      const draftSnapshot = {
        ...data,
        isDraft: true,
      };
      try {
        localStorage.setItem("harvestwise_assessment_draft", JSON.stringify(draftSnapshot));
        setLocalDraft(draftSnapshot);
      } catch {
        // ignore
      }
      setSavingDraft(false);
      navigate("/farmer/crops", {
        state: {
          draftSaved: true,
          message: t(
            "farmer.assess.draft_saved_partial",
            {},
            "Step 1 progress saved as draft. You can continue anytime."
          ),
        },
      });
      return;
    }

    try {
      const targetCommId = data.commodityId || data.commodity;
      const existingCropDraft = data.draftId ? null : (Array.isArray(crops) ? crops.find((c) =>
        (c.phase === "draft" || c.status === "Draft" || c.isDraft) &&
        (c.commodityId === targetCommId || c.commodity === targetCommId || c.commodity === data.commodity || (data.commodityName && (c.commodityName || "").toLowerCase().trim() === data.commodityName.toLowerCase().trim()))
      ) : null);

      const effectiveDraftId = data.draftId || existingCropDraft?.id || null;
      const payload = buildDraftPayload({ ...data, draftId: effectiveDraftId });

      const res = await apiPost("/crop-plans/draft", payload);
      if (!res.ok) {
        throw new Error("Failed to save draft");
      }
      const saved = await parseResponse(res);

      try {
        localStorage.removeItem("harvestwise_assessment_draft");
        setLocalDraft(null);
      } catch {
        // ignore
      }

      setData((d) => ({
        ...d,
        draftId: saved.id,
        isDraft: true,
      }));
      await refreshCrops();
      navigate("/farmer/crops", {
        state: {
          draftSaved: true,
          message: t(
            "farmer.assess.draft_saved",
            {},
            "Draft saved. Continue anytime from My Crops or Assessment home."
          ),
        },
      });
    } catch (_err) {
      const offlineSnapshot = {
        ...data,
        isDraft: true,
      };
      try {
        localStorage.setItem("harvestwise_assessment_draft", JSON.stringify(offlineSnapshot));
        setLocalDraft(offlineSnapshot);
      } catch {
        // ignore
      }
      navigate("/farmer/crops", {
        state: {
          draftSaved: true,
          message: t(
            "farmer.assess.draft_saved_local_notice",
            {},
            "Draft saved locally on this device. You can continue anytime."
          ),
        },
      });
    } finally {
      setSavingDraft(false);
    }
  };

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
      const baseCropName = data.commodityName || selectedCommodity?.name || data.commodity;
      const cropName = data.variant ? `${baseCropName} ${data.variant}` : baseCropName;
      const totalCost = getTotalCost(data);
      const yieldKg = Number(data.harvestQuantity) || 1;

      setData((prev) => ({
        ...prev,
        commodityName: baseCropName,
      }));

      const payload = {
        crop_name: cropName,
        planting_date: data.plantingDate,
        expected_harvest_date: data.harvestDate,
        total_production_cost: Number(totalCost),
        expected_yield_kg: yieldKg,
        estimated_selling_price: data.useFarmgate && Number(data.farmgatePrice) > 0
          ? Number(data.farmgatePrice)
          : null,
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

  if (draftLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <RefreshCw className="w-8 h-8 text-[var(--hw-green-700)] animate-spin" />
        <p className="text-sm font-medium text-[var(--hw-neutral-700)]">
          {t("farmer.draft.loading", {}, "Loading assessment draft...")}
        </p>
      </div>
    );
  }

  if (draftLoadError) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-10 max-w-2xl mx-auto space-y-6">
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-800">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-amber-950">
            {t("farmer.draft.not_found_title", {}, "Draft Assessment Not Found")}
          </h2>
          <p className="text-sm text-amber-900 leading-relaxed max-w-md mx-auto">
            {draftLoadError}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={() => navigate("/farmer/crops")}
              className="px-5 py-2.5 bg-[var(--hw-green-700)] text-white font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors text-sm shadow-xs"
            >
              {t("farmer.draft.go_to_crops", {}, "Back to My Crops")}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftLoadError(null);
                handleStart();
              }}
              className="px-5 py-2.5 bg-white text-[var(--hw-neutral-800)] font-medium rounded-xl border border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-colors text-sm"
            >
              {t("farmer.assess.start_new_assessment", {}, "Start new assessment")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showResult) {
    return (
      <RecommendationResult
        data={data}
        advisoryResponse={advisoryResponse}
        onEdit={() => setShowResult(false)}
        onCompareAnother={handleStart}
      />
    );
  }
  if (view === "entry") {
    return <RecommendEntry onStart={handleStart} />;
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
            {(data.isDraft || data.draftId) && (
              <div className="flex items-center gap-3 p-3.5 sm:p-4 bg-white border border-[var(--hw-neutral-200)] rounded-2xl shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-amber-100/80 flex items-center justify-center flex-shrink-0 text-amber-700">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold uppercase tracking-wider text-amber-800">
                    {t("farmer.assess.draft_incomplete_badge", {}, "Draft – Dili Kompleto")}
                  </p>
                  <p className="text-[12px] sm:text-[13px] text-[var(--hw-neutral-700)] mt-0.5 leading-snug">
                    {t(
                      "farmer.assess.draft_banner_notice",
                      {},
                      "Gipadayon nimo ang wala pa nahuman nga assessment. Rebyuha, usba, ug kompletoha ang Step 1 bago mopadayon."
                    )}
                  </p>
                </div>
              </div>
            )}
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
              savingDraft={savingDraft}
              draftStatus={draftStatus}
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
  AssessPage as default,
  StepActions,
  buildDraftPayload,
  validateStep
};
