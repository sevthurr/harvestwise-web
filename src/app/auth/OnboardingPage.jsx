import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Check, MapPin, Loader2 } from "lucide-react";
import { HW_COMMODITY_ITEMS, getVariants } from "../global/data/commodities";
import { CommodityIllustration } from "../global/components/shared/CommodityIllustrations";
import { Footer } from "../global/components/Footer";
import { apiGet, apiPost, apiPut, parseResponse } from "../global/api";
import { useLanguage } from "../global/contexts/LanguageContext";
import { useAuth } from "../global/contexts/AuthContext";
import { FarmLocationFields } from "../global/components/location/FarmLocationFields";
import { useFarmLocation } from "../global/hooks/useFarmLocation";
import { FARMER_PROFILE_KEY, loadFarmerOfflineData } from "../global/hooks/useFarmerPrefetch";

// ---------------------------------------------------------------------------
// Selling methods are fetched from GET /farmer/selling-methods.
// SELLING_OPTIONS.backendLabel contains the exact seeded label for exact matching.
//
// Commodities are fetched from GET /farmer/commodities (active, is_top10=true).
// The picker renders the fetched list; crops are submitted as real DB PKs.
// The static HW_COMMODITY_ITEMS list is kept as fallback while the fetch loads.
// ---------------------------------------------------------------------------

const ONBOARDING_CROPS = HW_COMMODITY_ITEMS.map((c) => ({ id: c.id, name: c.name }));

const SELLING_OPTIONS = [
  { id: "farmgate", labelKey: "onboarding.selling_farmgate", label: "To a buyer using farmgate price",  backendLabel: "Direct to Consumers / Farm Gate" },
  { id: "market",   labelKey: "onboarding.selling_market",   label: "Directly in the market",           backendLabel: "Palengke / Retail (Local Market)" },
  { id: "trader",   labelKey: "onboarding.selling_trader",   label: "Through a trader",                 backendLabel: "Trader / Viajero (Wholesale)" },
  { id: "unsure",   labelKey: "onboarding.selling_unsure",   label: "Not sure yet",                     backendLabel: null },
];

// ---------------------------------------------------------------------------
// SVG illustrations (unchanged from original)
// ---------------------------------------------------------------------------
const LanguageSVG = () => (
  <svg viewBox="0 0 108 84" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-20 mx-auto">
    <circle cx="40" cy="46" r="32" fill="#dcfce7" />
    <circle cx="40" cy="46" r="32" stroke="#166534" strokeWidth="3.2" />
    <line x1="8" y1="46" x2="72" y2="46" stroke="#166534" strokeWidth="2.4" />
    <path d="M13 32 Q40 25 67 32" stroke="#166534" strokeWidth="2.4" fill="none" />
    <path d="M13 60 Q40 67 67 60" stroke="#166534" strokeWidth="2.4" fill="none" />
    <path d="M40 14 Q27 30 27 46 Q27 62 40 78" stroke="#166534" strokeWidth="2.4" fill="none" />
    <path d="M40 14 Q53 30 53 46 Q53 62 40 78" stroke="#166534" strokeWidth="2.4" fill="none" />
    <line x1="40" y1="14" x2="40" y2="78" stroke="#166534" strokeWidth="2.4" />
    <path d="M64 38 L57 50 L70 44" fill="#166534" />
    <circle cx="82" cy="22" r="22" fill="#166534" />
    <circle cx="73" cy="22" r="3" fill="white" />
    <circle cx="82" cy="22" r="3" fill="white" />
    <circle cx="91" cy="22" r="3" fill="white" />
  </svg>
);

const LocationSVG = () => (
  <svg viewBox="0 0 100 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-24 h-20 mx-auto">
    <ellipse cx="50" cy="78" rx="24" ry="6" fill="#dcfce7" />
    <path d="M50 8 C34 8 22 20 22 36 C22 54 50 78 50 78 C50 78 78 54 78 36 C78 20 66 8 50 8Z" fill="#166534" />
    <path d="M50 11 C36 11 25 22 25 36 C25 53 50 75 50 75 C50 75 75 53 75 36 C75 22 64 11 50 11Z" fill="#22c55e" />
    <circle cx="50" cy="36" r="11" fill="white" />
    <circle cx="50" cy="36" r="6" fill="#166534" />
    <circle cx="50" cy="36" r="18" stroke="#86efac" strokeWidth="1.5" strokeDasharray="4 3" />
    <circle cx="50" cy="36" r="25" stroke="#bbf7d0" strokeWidth="1" strokeDasharray="3 4" />
  </svg>
);

const CropsSVG = () => (
  <svg viewBox="0 0 110 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-20 mx-auto">
    <ellipse cx="55" cy="62" rx="40" ry="10" fill="#92400e" opacity="0.25" />
    <rect x="15" y="56" width="80" height="12" rx="6" fill="#a16207" opacity="0.35" />
    <line x1="55" y1="56" x2="55" y2="24" stroke="#166534" strokeWidth="3" strokeLinecap="round" />
    <path d="M55 38 Q38 30 34 18 Q48 20 55 38Z" fill="#22c55e" />
    <path d="M55 44 Q72 36 76 24 Q62 26 55 44Z" fill="#166534" />
    <circle cx="55" cy="22" r="5" fill="#4ade80" />
    <line x1="28" y1="56" x2="28" y2="44" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    <path d="M28 48 Q20 44 18 38 Q26 38 28 48Z" fill="#4ade80" />
    <line x1="82" y1="56" x2="82" y2="46" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    <path d="M82 50 Q90 46 92 40 Q84 40 82 50Z" fill="#4ade80" />
    <circle cx="42" cy="60" r="2" fill="#92400e" opacity="0.3" />
    <circle cx="68" cy="60" r="2" fill="#92400e" opacity="0.3" />
  </svg>
);

const SellingSVG = () => (
  <svg viewBox="0 0 110 75" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-20 mx-auto">
    <rect x="12" y="32" width="86" height="34" rx="5" fill="#dcfce7" />
    <rect x="8" y="22" width="94" height="16" rx="5" fill="#166534" />
    {[16, 28, 40, 52, 64, 76, 88].map((x, i) => <path key={i} d={`M${x} 38 Q${x+6} 44 ${x+12} 38`} stroke="#22c55e" strokeWidth="2" fill="none" />)}
    <rect x="24" y="8" width="5" height="26" rx="2" fill="#166534" />
    <rect x="81" y="8" width="5" height="26" rx="2" fill="#166534" />
    <rect x="22" y="44" width="66" height="18" rx="4" fill="white" stroke="#86efac" strokeWidth="1.5" />
    <text x="44" y="57" fontSize="13" fontWeight="700" fill="#166534" fontFamily="sans-serif">₱ Sell</text>
  </svg>
);

const CompleteSVG = () => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-28 mx-auto">
    <circle cx="50" cy="50" r="42" fill="#dcfce7" />
    <circle cx="50" cy="50" r="42" stroke="#86efac" strokeWidth="2" />
    <path d="M50 78 L50 48" stroke="#166534" strokeWidth="4" strokeLinecap="round" />
    <path d="M50 58 Q36 48 28 36 Q40 32 50 46Z" fill="#22c55e" />
    <path d="M50 66 Q64 56 72 44 Q60 40 50 54Z" fill="#166534" />
    <ellipse cx="50" cy="80" rx="12" ry="4" fill="#86efac" />
    <circle cx="72" cy="28" r="14" fill="#166534" />
    <path d="M65 28 L70 33 L79 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------
const StepCard = ({ children }) => (
  <div className="w-full max-w-lg bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_2px_16px_0_rgba(0,0,0,0.07)] p-8">
    {children}
  </div>
);

const OptionChip = ({ label, selected, onClick, icon }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-between gap-3 w-full px-4 py-3.5 rounded-xl border text-[15px] font-medium transition-all text-left ${
      selected
        ? "bg-[var(--hw-green-50)] border-[var(--hw-green-700)] text-[var(--hw-green-900)]"
        : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
    }`}
  >
    <span className="flex items-center gap-2.5 min-w-0">
      {icon}
      {label}
    </span>
    {selected && (
      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--hw-green-700)] flex items-center justify-center">
        <Check className="w-3 h-3 text-white" />
      </div>
    )}
  </button>
);

export const NavButtons = ({ step, onBack, onContinue, onSkip, continueLabel, disabled = false, loading = false }) => {
  const { t } = useLanguage();
  const label = continueLabel ?? t("common.continue", {}, "Continue");
  return (
    <div className="space-y-2 pt-2">
      <div className="flex gap-2">
        {step > 1 && onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={disabled || loading}
            className="flex items-center justify-center gap-1 px-5 h-12 border border-[var(--hw-neutral-200)] text-[15px] font-medium text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] disabled:opacity-60 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {t("common.back", {}, "Back")}
          </button>
        )}
        <button
          type="button"
          onClick={onContinue}
          disabled={disabled || loading}
          className="flex-1 h-12 flex items-center justify-center gap-1.5 bg-[var(--hw-green-700)] text-white text-[15px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-60 transition-colors"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {label}
          {!loading && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
      <button
        type="button"
        onClick={onSkip}
        disabled={disabled || loading}
        className="w-full text-center text-[14px] text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)] disabled:opacity-40 transition-colors py-1"
      >
        {t("common.skip_for_now", {}, "Skip for now")}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------
const TOTAL = 4;

const Step1 = ({ data, onLanguageSelect, onContinue, onSkip, langError }) => {
  const { t } = useLanguage();
  return (
    <StepCard>
      <p className="text-[13px] font-semibold text-[var(--hw-neutral-400)] uppercase tracking-wide mb-4">
        {t("common.step_indicator", { current: 1, total: TOTAL }, `Step 1 of ${TOTAL}`)}
      </p>
      <LanguageSVG />
      <h2 className="mt-5 text-[20px] font-bold text-[var(--hw-neutral-900)]">
        {t("onboarding.step1_title", {}, "Choose your preferred language")}
      </h2>
      <p className="mt-1.5 text-[15px] text-[var(--hw-neutral-500)]">
        {t("onboarding.step1_desc", {}, "You can change this later in Settings.")}
      </p>
      {langError && (
        <p role="alert" className="mt-3 text-[13px] text-red-600 font-medium">
          {langError}
        </p>
      )}
      <div className="mt-6 space-y-3">
        {[
          { id: "ceb", label: "Bisaya" },
          { id: "en", label: "English" },
          { id: "tl", label: "Filipino" },
        ].map((opt) => (
          <OptionChip
            key={opt.id}
            label={opt.label}
            selected={data.language === opt.id}
            onClick={() => onLanguageSelect(opt.id)}
          />
        ))}
      </div>
      <div className="mt-6">
        <NavButtons step={1} onContinue={onContinue} onSkip={onSkip} />
      </div>
    </StepCard>
  );
};

export const Step2 = ({ data, onChange, onContinue, onBack, onSkip }) => {
  const { t } = useLanguage();
  const [errorMsg, setErrorMsg] = useState("");

  const locationState = useFarmLocation({
    initialCity: data.city || "Davao City",
    initialDistrict: data.district || "",
    initialBarangay: data.barangay || "",
    initialPurokSitio: data.purokSitio || "",
    initialStreet: data.street || "",
    initialSpecificAddress: data.locationName || "",
    initialLatitude: data.latitude,
    initialLongitude: data.longitude,
    onLocationChange: (loc) => {
      onChange({
        city: loc.city,
        district: loc.district || null,
        barangay: loc.barangay,
        purokSitio: loc.purokSitio || "",
        street: loc.street || "",
        locationName: loc.specificAddress || "",
        latitude: loc.latitude,
        longitude: loc.longitude,
        locationMode: loc.locationMode,
      });
      if (loc.isComplete) {
        setErrorMsg("");
      }
    },
  });

  const isManualEditing = locationState.locationMode === "manual" && !locationState.isSettled;

  const continueLabel = isManualEditing
    ? t("onboarding.check_entered", {}, "Check entered location")
    : t("common.continue", {}, "Continue");

  const handleContinue = async () => {
    if (!data.barangay) {
      setErrorMsg(
        t(
          "onboarding.location_required_error",
          {},
          "Please confirm your farm location, or choose 'Skip for now'."
        )
      );
      return;
    }
    if (data.latitude == null || data.longitude == null) {
      const ok = await locationState.geocodeManualLocation();
      if (!ok && (data.latitude == null || data.longitude == null)) {
        setErrorMsg(
          t(
            "onboarding.location_required_error",
            {},
            "Please confirm your farm location, or choose 'Skip for now'."
          )
        );
        return;
      }
    }
    setErrorMsg("");

    // If currently filling out the manual form, clicking "I-check ang gi-enter" proceeds to the preview
    if (isManualEditing) {
      locationState.setIsSettled(true);
      return;
    }

    // When on the preview card (or GPS settled), clicking "Padayon" proceeds to Step 3
    onContinue();
  };

  const handleBack = () => {
    setErrorMsg("");
    if (locationState.isSettled && locationState.locationMode === "manual") {
      locationState.setIsSettled(false);
    } else if (locationState.locationMode !== null) {
      locationState.resetToChoice();
    } else {
      onBack();
    }
  };

  const isContinueDisabled = !data.barangay || locationState.resolving;

  return (
    <StepCard>
      <p className="text-[13px] font-semibold text-[var(--hw-neutral-400)] uppercase tracking-wide mb-4">
        {t("common.step_indicator", { current: 2, total: TOTAL }, `Step 2 of ${TOTAL}`)}
      </p>
      <LocationSVG />
      <h2 className="mt-5 text-[20px] font-bold text-[var(--hw-neutral-900)]">
        {t("onboarding.step2_title", {}, "Where is your farm located?")}
      </h2>

      {errorMsg && (
        <p role="alert" className="mt-3 text-[13px] text-red-600 font-medium">
          {errorMsg}
        </p>
      )}

      <div className="mt-4">
        <FarmLocationFields locationState={locationState} />
      </div>

      <div className="mt-6">
        <NavButtons
          step={2}
          onBack={handleBack}
          onContinue={handleContinue}
          onSkip={onSkip}
          continueLabel={continueLabel}
          disabled={isContinueDisabled}
          loading={locationState.resolving}
        />
      </div>
    </StepCard>
  );
};

const Step3 = ({ data, onChange, onContinue, onBack, onSkip, fetchedCommodities }) => {
  const { t } = useLanguage();
  // Use fetched commodities (real DB IDs) when available; fall back to static slugs
  const cropList = fetchedCommodities.length > 0
    ? fetchedCommodities
    : ONBOARDING_CROPS;

  const toggleCrop = (name) => {
    const crops = { ...data.crops };
    if (name in crops) delete crops[name];
    else crops[name] = "";
    onChange({ crops });
  };
  const setVariety = (name, variety) => onChange({ crops: { ...data.crops, [name]: variety } });

  return (
    <StepCard>
      <p className="text-[13px] font-semibold text-[var(--hw-neutral-400)] uppercase tracking-wide mb-4">
        {t("common.step_indicator", { current: 3, total: TOTAL }, `Step 3 of ${TOTAL}`)}
      </p>
      <CropsSVG />
      <h2 className="mt-5 text-[20px] font-bold text-[var(--hw-neutral-900)]">
        {t("onboarding.step3_title", {}, "What crops do you grow or plan to grow?")}
      </h2>
      <p className="mt-1.5 text-[15px] text-[var(--hw-neutral-500)]">
        {t("onboarding.step3_desc", {}, "Choose crops so HarvestWise can tailor forecasts and advice.")}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2.5">
        {cropList.map((crop) => {
          const selected = crop.name in data.crops;
          return (
            <button
              key={crop.id}
              type="button"
              onClick={() => toggleCrop(crop.name)}
              className={`flex items-center gap-2.5 h-12 px-3 text-[14px] font-medium rounded-xl border transition-all text-left ${
                selected
                  ? "bg-[var(--hw-green-50)] border-[var(--hw-green-700)] text-[var(--hw-green-900)]"
                  : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"
              }`}
            >
              <CommodityIllustration
                commodityId={crop.id}
                commodityName={crop.name}
                baseName={crop.name}
                className="w-7 h-7 flex-shrink-0"
              />
              <span className="truncate">{crop.name}</span>
            </button>
          );
        })}
      </div>

      {Object.keys(data.crops).length > 0 && (
        <div className="mt-5 space-y-3 pt-4 border-t border-[var(--hw-neutral-100)]">
          <p className="text-[13px] font-semibold text-[var(--hw-neutral-400)] uppercase tracking-wide">
            {t("onboarding.preferred_variety", {}, "Preferred variety (optional)")}
          </p>
          {Object.keys(data.crops).map((cropName) => {
            const variants = getVariants(cropName);
            if (!variants.length) return null;
            return (
              <div key={cropName} className="flex items-center gap-3">
                <span className="text-[14px] font-medium text-[var(--hw-neutral-700)] min-w-0 flex-1 truncate">{cropName}</span>
                <div className="relative flex-shrink-0">
                  <select
                    value={data.crops[cropName]}
                    onChange={(e) => setVariety(cropName, e.target.value)}
                    className="h-9 pl-3 pr-8 text-[13px] font-medium text-[var(--hw-neutral-900)] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-700)] appearance-none"
                  >
                    <option value="">{t("onboarding.variety_default", {}, "Default")}</option>
                    {variants.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--hw-neutral-400)] pointer-events-none" fill="none" viewBox="0 0 10 6">
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <NavButtons step={3} onBack={onBack} onContinue={onContinue} onSkip={onSkip} />
      </div>
    </StepCard>
  );
};

const Step4 = ({ data, onChange, onContinue, onBack, onSkip, submitting, submitError }) => {
  const { t } = useLanguage();
  return (
    <StepCard>
      <p className="text-[13px] font-semibold text-[var(--hw-neutral-400)] uppercase tracking-wide mb-4">
        {t("common.step_indicator", { current: 4, total: TOTAL }, `Step 4 of ${TOTAL}`)}
      </p>
      <SellingSVG />
      <h2 className="mt-5 text-[20px] font-bold text-[var(--hw-neutral-900)]">
        {t("onboarding.step4_title", {}, "How do you usually sell your harvest?")}
      </h2>
      <p className="mt-1.5 text-[15px] text-[var(--hw-neutral-500)]">
        {t("onboarding.step4_desc", {}, "This helps improve possible profit estimates later.")}
      </p>
      <div className="mt-6 space-y-3">
        {SELLING_OPTIONS.map((opt) => (
          <OptionChip
            key={opt.id}
            label={t(opt.labelKey, {}, opt.label)}
            selected={data.sellingMethod === opt.id}
            onClick={() => onChange({ sellingMethod: opt.id })}
          />
        ))}
      </div>
      <div className="mt-5 space-y-1.5">
        <label htmlFor="sellingArea" className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--hw-neutral-700)]">
          {t("onboarding.selling_buyer_label", {}, "Usual selling area or buyer type")}
          <span className="text-[12px] text-[var(--hw-neutral-400)] font-normal">{t("onboarding.optional", {}, "(optional)")}</span>
        </label>
        <input
          id="sellingArea"
          type="text"
          value={data.sellingArea}
          onChange={(e) => onChange({ sellingArea: e.target.value })}
          placeholder={t("onboarding.selling_buyer_placeholder", {}, "Ex. Bangkerohan market, direct buyer")}
          className="w-full h-11 px-3.5 text-[15px] text-[var(--hw-neutral-900)] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)]"
        />
      </div>
      {submitError && (
        <p role="alert" className="mt-3 text-[13px] text-red-600 font-medium">{submitError}</p>
      )}
      <div className="mt-6">
        <NavButtons
          step={4}
          onBack={onBack}
          onContinue={onContinue}
          onSkip={onSkip}
          continueLabel={t("onboarding.finish_setup", {}, "Finish setup")}
          disabled={submitting}
        />
      </div>
    </StepCard>
  );
};

const SetupComplete = ({ data, onDone }) => {
  const { t } = useLanguage();
  const selectedCropNames = Object.keys(data.crops);
  const locationLine = [data.city, data.barangay].filter(Boolean).join(", ") || t("onboarding.summary_not_set", {}, "Not set");

  const getLangLabel = (code) => {
    if (code === "ceb" || code === "cebuano") return t("common.lang_ceb", {}, "Bisaya");
    if (code === "tl" || code === "tagalog") return t("common.lang_tl", {}, "Filipino");
    return t("common.lang_en", {}, "English");
  };

  const getSellingLabel = (method) => {
    if (method === "farmgate") return t("onboarding.selling_label_farmgate", {}, "To a buyer (farmgate)");
    if (method === "market") return t("onboarding.selling_label_market", {}, "Directly in the market");
    if (method === "trader") return t("onboarding.selling_label_trader", {}, "Through a trader");
    if (method === "unsure") return t("onboarding.selling_label_unsure", {}, "Not sure yet");
    return t("onboarding.summary_not_set", {}, "Not set");
  };

  return (
    <StepCard>
      <CompleteSVG />
      <h2 className="mt-5 text-[22px] font-bold text-[var(--hw-neutral-900)] text-center">
        {t("onboarding.step5_title", {}, "You're all set!")}
      </h2>
      <p className="mt-1.5 text-[15px] text-[var(--hw-neutral-500)] text-center">
        {t("onboarding.step5_desc", {}, "Your setup is saved. You can update this anytime in Settings.")}
      </p>
      <div className="mt-6 space-y-0 divide-y divide-[var(--hw-neutral-100)]">
        {[
          { label: t("onboarding.summary_language", {}, "Language"),       value: getLangLabel(data.language) },
          { label: t("onboarding.summary_location", {}, "Farm location"),  value: locationLine },
          { label: t("onboarding.summary_crops", {}, "Selected crops"), value: selectedCropNames.length ? selectedCropNames.join(", ") : t("onboarding.summary_not_set", {}, "Not set") },
          { label: t("onboarding.summary_selling", {}, "Selling method"), value: data.sellingMethod ? getSellingLabel(data.sellingMethod) : t("onboarding.summary_not_set", {}, "Not set") },
        ].map((row) => (
          <div key={row.label} className="flex justify-between gap-3 text-[14px] py-2.5">
            <span className="text-[var(--hw-neutral-500)] flex-shrink-0">{row.label}</span>
            <span className="text-[var(--hw-neutral-900)] font-medium text-right">{row.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <button
          type="button"
          onClick={onDone}
          className="w-full h-12 flex items-center justify-center bg-[var(--hw-green-700)] text-white text-[15px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
        >
          {t("onboarding.go_to_home", {}, "Go To Home")}
        </button>
      </div>
    </StepCard>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const INITIAL = {
  language: "ceb",
  locationMode: null,
  city: "Davao City",
  district: null,
  barangay: "",
  purokSitio: "",
  street: "",
  locationName: "",
  farmSize: "",
  latitude: null,
  longitude: null,
  crops: {},
  sellingMethod: "",
  sellingArea: "",
};

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setLanguage, t } = useLanguage();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState(INITIAL);
  const [langError, setLangError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Selling methods fetched from backend: [{id, label}]
  const [sellingMethods, setSellingMethods] = useState([]);
  // Commodities fetched from backend: [{id, name}] — real DB PKs for crop submission
  const [fetchedCommodities, setFetchedCommodities] = useState([]);

  // Ensure new farmer defaults to ceb and persists to account on mount
  useEffect(() => {
    setLanguage("ceb");
    apiPut("/farmer/profile", { preferred_language: "ceb" })
      .then(() => refreshUser?.())
      .catch((err) => console.warn("Could not persist default onboarding language:", err));
  }, []);

  // Fetch lookup data on mount
  useEffect(() => {
    apiGet("/api/v1/farmer/selling-methods")
      .then(parseResponse)
      .then(setSellingMethods)
      .catch(() => { /* non-fatal */ });

    apiGet("/api/v1/farmer/commodities")
      .then(parseResponse)
      .then(setFetchedCommodities)
      .catch(() => { /* non-fatal — crop submission falls back to empty */ });
  }, []);

  const patch = (d) => setData((prev) => ({ ...prev, ...d }));
  const next  = () => setStep((s) => (s < 5 ? s + 1 : 5));
  const prev  = () => setStep((s) => (s > 1 ? s - 1 : 1));

  const handleLanguageSelect = async (langId) => {
    setLanguage(langId);
    patch({ language: langId });
    setLangError("");
    try {
      await apiPut("/farmer/profile", { preferred_language: langId });
      await refreshUser?.();
    } catch {
      setLangError(t("farmer.settings.toast_lang_error", {}, "Could not save language preference to your account. Please check your connection and try again."));
    }
  };

  // Skip without saving — go straight to farmer home
  const skip = () => {
    queryClient.invalidateQueries({ queryKey: ["farmer"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    navigate("/farmer", { replace: true });
  };

  // Submit all onboarding data to backend
  const submitOnboarding = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      // Exact match using the seeded label stored in SELLING_OPTIONS.backendLabel
      const selectedOption = SELLING_OPTIONS.find((o) => o.id === data.sellingMethod);
      const selectedMethod = selectedOption?.backendLabel
        ? sellingMethods.find((m) => m.label === selectedOption.backendLabel)
        : null;

      // Build a name → id map from fetched commodities for crop submission
      const commodityIdByName = Object.fromEntries(
        fetchedCommodities.map((c) => [c.name, c.id])
      );
      const preferredCrops = Object.keys(data.crops)
        .filter((name) => commodityIdByName[name])
        .map((name) => ({ commodity_id: commodityIdByName[name] }));

      const payload = {
        ...(data.language    && { preferred_language: data.language }),
        ...(data.city        && { city: data.city }),
        district: data.district || null,
        ...(data.barangay    && { barangay: data.barangay }),
        ...(data.purokSitio  && { purok_sitio: data.purokSitio }),
        ...(data.street      && { street: data.street }),
        ...(data.locationName && { location_name: data.locationName }),
        ...(data.latitude != null && { latitude: data.latitude }),
        ...(data.longitude != null && { longitude: data.longitude }),
        ...(data.farmSize    && { farm_size: parseFloat(data.farmSize) || undefined }),
        ...(data.sellingArea && { usual_selling_area_or_buyer: data.sellingArea }),
        preferred_crops: preferredCrops,
        selling_method_ids: selectedMethod ? [selectedMethod.id] : [],
      };

      const res = await apiPost("/api/v1/farmer/onboarding", payload);
      const savedProfile = await parseResponse(res);
      if (savedProfile) {
        queryClient.setQueryData(FARMER_PROFILE_KEY, savedProfile);
        queryClient.setQueryData(["dashboard", "profile"], savedProfile);
      }
      queryClient.invalidateQueries({ queryKey: ["farmer"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["weather"] });
      await refreshUser?.();
      loadFarmerOfflineData(queryClient).catch(() => {});
      setStep(5);
    } catch (err) {
      setSubmitError(err.message || t("onboarding.save_error", {}, "Failed to save. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const done = () => {
    queryClient.invalidateQueries({ queryKey: ["farmer"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    navigate("/farmer", { replace: true });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-4 py-12">

      {/* Progress dots (steps 1–4 only) */}
      {step < 5 && (
        <div className="flex gap-1.5 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? "w-7 bg-[var(--hw-green-700)]"
                : s < step  ? "w-3 bg-[var(--hw-green-400)]"
                :              "w-3 bg-[var(--hw-neutral-200)]"
              }`}
            />
          ))}
        </div>
      )}

      {step === 1 && <Step1 data={data} onLanguageSelect={handleLanguageSelect} onContinue={next} onSkip={skip} langError={langError} />}
      {step === 2 && <Step2 data={data} onChange={patch} onContinue={next} onBack={prev} onSkip={skip} />}
      {step === 3 && <Step3 data={data} onChange={patch} onContinue={next} onBack={prev} onSkip={skip} fetchedCommodities={fetchedCommodities} />}
      {step === 4 && (
        <Step4
          data={data}
          onChange={patch}
          onContinue={submitOnboarding}
          onBack={prev}
          onSkip={skip}
          submitting={submitting}
          submitError={submitError}
        />
      )}
      {step === 5 && <SetupComplete data={data} onDone={done} />}

      <Footer className="mt-4" />
    </div>
  );
}

export { OnboardingPage as default };
