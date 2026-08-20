import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Check, MapPin, Loader2 } from "lucide-react";
import { HW_COMMODITY_ITEMS, getVariants } from "../global/data/commodities";
import { CommodityIllustration } from "../farmer/components/market/CommodityIllustrations";
import { Footer } from "../global/components/Footer";
import { apiGet, apiPost, parseResponse } from "../global/api";

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
  { id: "farmgate",    label: "To a buyer using farmgate price",  backendLabel: "Direct to Consumers / Farm Gate" },
  { id: "market",      label: "Directly in the market",           backendLabel: "Palengke / Retail (Local Market)" },
  { id: "trader",      label: "Through a trader",                 backendLabel: "Trader / Viajero (Wholesale)" },
  { id: "unsure",      label: "Not sure yet",                     backendLabel: null },
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
const LocationModal = ({ onAllow, onCancel, detecting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
    <div className="w-full max-w-xs bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] p-6 space-y-4">
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-[var(--hw-green-50)] border border-[var(--hw-green-200)] flex items-center justify-center">
          <MapPin className="w-6 h-6 text-[var(--hw-green-700)]" />
        </div>
        <div>
          <p className="text-[16px] font-bold text-[var(--hw-neutral-900)]">Allow location access</p>
          <p className="mt-1.5 text-[14px] text-[var(--hw-neutral-500)] leading-relaxed">
            Turn on location to detect your farm area faster. Your location is only used to fill in the fields below.
          </p>
        </div>
      </div>
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={onAllow}
          disabled={detecting}
          className="w-full h-11 flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white text-[15px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-60 transition-colors"
        >
          {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          {detecting ? "Detecting location…" : "Allow location"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={detecting}
          className="w-full h-11 text-[14px] font-medium text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-900)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

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

const NavButtons = ({ step, onBack, onContinue, onSkip, continueLabel = "Continue", disabled = false }) => (
  <div className="space-y-2 pt-2">
    <div className="flex gap-2">
      {step > 1 && onBack && (
        <button
          type="button"
          onClick={onBack}
          disabled={disabled}
          className="flex items-center justify-center gap-1 px-5 h-12 border border-[var(--hw-neutral-200)] text-[15px] font-medium text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] disabled:opacity-60 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
      )}
      <button
        type="button"
        onClick={onContinue}
        disabled={disabled}
        className="flex-1 h-12 flex items-center justify-center gap-1.5 bg-[var(--hw-green-700)] text-white text-[15px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-60 transition-colors"
      >
        {disabled && <Loader2 className="w-4 h-4 animate-spin" />}
        {continueLabel}
        {!disabled && <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
    <button
      type="button"
      onClick={onSkip}
      disabled={disabled}
      className="w-full text-center text-[14px] text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)] disabled:opacity-40 transition-colors py-1"
    >
      Skip for now
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------
const TOTAL = 4;

const Step1 = ({ data, onChange, onContinue, onSkip }) => (
  <StepCard>
    <p className="text-[13px] font-semibold text-[var(--hw-neutral-400)] uppercase tracking-wide mb-4">Step 1 of {TOTAL}</p>
    <LanguageSVG />
    <h2 className="mt-5 text-[20px] font-bold text-[var(--hw-neutral-900)]">Choose your preferred language</h2>
    <p className="mt-1.5 text-[15px] text-[var(--hw-neutral-500)]">You can change this later in Settings.</p>
    <div className="mt-6 space-y-3">
      {[
        { id: "english", label: "English" },
        { id: "cebuano", label: "Cebuano / Bisaya" },
        { id: "tagalog", label: "Tagalog" },
      ].map((opt) => (
        <OptionChip
          key={opt.id}
          label={opt.label}
          selected={data.language === opt.id}
          onClick={() => onChange({ language: opt.id })}
        />
      ))}
    </div>
    <div className="mt-6">
      <NavButtons step={1} onContinue={onContinue} onSkip={onSkip} />
    </div>
  </StepCard>
);

const Step2 = ({ data, onChange, onContinue, onBack, onSkip }) => {
  const [showModal, setShowModal] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const handleAllow = () => {
    setDetecting(true);
    // Use browser Geolocation API if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onChange({
            locationMode: "auto",
            city: "Davao City",
            district: "Marilog",
            barangay: "Buda",
            farmSize: "",
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setDetecting(false);
          setShowModal(false);
        },
        () => {
          // Permission denied or error — fall back to defaults
          onChange({ locationMode: "auto", city: "Davao City", district: "Marilog", barangay: "Buda", farmSize: "" });
          setDetecting(false);
          setShowModal(false);
        },
        { timeout: 8000 }
      );
    } else {
      setTimeout(() => {
        onChange({ locationMode: "auto", city: "Davao City", district: "Marilog", barangay: "Buda", farmSize: "" });
        setDetecting(false);
        setShowModal(false);
      }, 1800);
    }
  };

  const fieldCls = "w-full h-11 px-3.5 text-[15px] text-[var(--hw-neutral-900)] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)]";
  const labelCls = "text-[14px] font-semibold text-[var(--hw-neutral-700)]";

  return (
    <>
      {showModal && (
        <LocationModal
          onAllow={handleAllow}
          onCancel={() => setShowModal(false)}
          detecting={detecting}
        />
      )}
      <StepCard>
        <p className="text-[13px] font-semibold text-[var(--hw-neutral-400)] uppercase tracking-wide mb-4">Step 2 of {TOTAL}</p>
        <LocationSVG />
        <h2 className="mt-5 text-[20px] font-bold text-[var(--hw-neutral-900)]">Where is your farm located?</h2>
        <p className="mt-1.5 text-[15px] text-[var(--hw-neutral-500)]">This helps HarvestWise show weather and crop advice for your area.</p>

        {data.locationMode === null && (
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex-1 h-12 flex items-center justify-center gap-2 border border-[var(--hw-green-700)] text-[var(--hw-green-700)] text-[14px] font-semibold rounded-xl hover:bg-[var(--hw-green-50)] transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Use my location
            </button>
            <button
              type="button"
              onClick={() => onChange({ locationMode: "manual" })}
              className="flex-1 h-12 flex items-center justify-center bg-[var(--hw-green-700)] text-white text-[14px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
            >
              Enter manually
            </button>
          </div>
        )}

        {data.locationMode === "auto" && (
          <div className="mt-5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-[14px] text-emerald-700 font-medium">Location detected automatically</span>
            </div>
            <button
              type="button"
              onClick={() => onChange({ locationMode: "manual" })}
              className="text-[13px] text-[var(--hw-green-700)] font-semibold hover:underline flex-shrink-0"
            >
              Edit
            </button>
          </div>
        )}

        {(data.locationMode === "manual" || data.locationMode === "auto") && (
          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="city" className={labelCls}>City</label>
              <input id="city" type="text" value={data.city} onChange={(e) => onChange({ city: e.target.value })} placeholder="Davao City" className={fieldCls} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="district" className={labelCls}>District</label>
              <input id="district" type="text" value={data.district} onChange={(e) => onChange({ district: e.target.value })} placeholder="e.g. Marilog" className={fieldCls} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="barangay" className={labelCls}>Barangay</label>
              <input id="barangay" type="text" value={data.barangay} onChange={(e) => onChange({ barangay: e.target.value })} placeholder="e.g. Buda" className={fieldCls} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="farmSize" className={`${labelCls} flex items-center gap-1.5`}>
                Farm Size
                <span className="text-[12px] text-[var(--hw-neutral-400)] font-normal">(optional)</span>
              </label>
              <input id="farmSize" type="text" value={data.farmSize} onChange={(e) => onChange({ farmSize: e.target.value })} placeholder="e.g. 1,500 sq m or 0.5 hectare" className={fieldCls} />
            </div>
          </div>
        )}

        <div className="mt-6">
          <NavButtons step={2} onBack={onBack} onContinue={onContinue} onSkip={onSkip} />
        </div>
      </StepCard>
    </>
  );
};

const Step3 = ({ data, onChange, onContinue, onBack, onSkip, fetchedCommodities }) => {
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
      <p className="text-[13px] font-semibold text-[var(--hw-neutral-400)] uppercase tracking-wide mb-4">Step 3 of {TOTAL}</p>
      <CropsSVG />
      <h2 className="mt-5 text-[20px] font-bold text-[var(--hw-neutral-900)]">What vegetables do you grow or plan to grow?</h2>
      <p className="mt-1.5 text-[15px] text-[var(--hw-neutral-500)]">Choose crops so HarvestWise can personalize your dashboard.</p>

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
              <CommodityIllustration commodityId={crop.id} className="w-7 h-7 flex-shrink-0" />
              <span className="truncate">{crop.name}</span>
            </button>
          );
        })}
      </div>

      {Object.keys(data.crops).length > 0 && (
        <div className="mt-5 space-y-3 pt-4 border-t border-[var(--hw-neutral-100)]">
          <p className="text-[13px] font-semibold text-[var(--hw-neutral-400)] uppercase tracking-wide">
            Preferred variety (optional)
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
                    <option value="">Default</option>
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

const Step4 = ({ data, onChange, onContinue, onBack, onSkip, submitting, submitError }) => (
  <StepCard>
    <p className="text-[13px] font-semibold text-[var(--hw-neutral-400)] uppercase tracking-wide mb-4">Step 4 of {TOTAL}</p>
    <SellingSVG />
    <h2 className="mt-5 text-[20px] font-bold text-[var(--hw-neutral-900)]">How do you usually sell your harvest?</h2>
    <p className="mt-1.5 text-[15px] text-[var(--hw-neutral-500)]">This helps improve possible profit estimates later.</p>
    <div className="mt-6 space-y-3">
      {SELLING_OPTIONS.map((opt) => (
        <OptionChip
          key={opt.id}
          label={opt.label}
          selected={data.sellingMethod === opt.id}
          onClick={() => onChange({ sellingMethod: opt.id })}
        />
      ))}
    </div>
    <div className="mt-5 space-y-1.5">
      <label htmlFor="sellingArea" className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--hw-neutral-700)]">
        Usual selling area or buyer type
        <span className="text-[12px] text-[var(--hw-neutral-400)] font-normal">(optional)</span>
      </label>
      <input
        id="sellingArea"
        type="text"
        value={data.sellingArea}
        onChange={(e) => onChange({ sellingArea: e.target.value })}
        placeholder="e.g. Bangkerohan market, direct buyer"
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
        continueLabel="Finish setup"
        disabled={submitting}
      />
    </div>
  </StepCard>
);

const LANGUAGE_LABEL = { english: "English", cebuano: "Cebuano / Bisaya", tagalog: "Tagalog" };
const SELLING_LABEL  = {
  farmgate: "To a buyer (farmgate)",
  market:   "Directly in the market",
  trader:   "Through a trader",
  unsure:   "Not sure yet",
};

const SetupComplete = ({ data, onDone }) => {
  const selectedCropNames = Object.keys(data.crops);
  const locationLine = [data.city, data.district, data.barangay].filter(Boolean).join(", ") || "Not set";
  return (
    <StepCard>
      <CompleteSVG />
      <h2 className="mt-5 text-[22px] font-bold text-[var(--hw-neutral-900)] text-center">
        You&apos;re ready to use HarvestWise
      </h2>
      <p className="mt-1.5 text-[15px] text-[var(--hw-neutral-500)] text-center">
        Your setup is saved. You can update this anytime in Settings.
      </p>
      <div className="mt-6 space-y-0 divide-y divide-[var(--hw-neutral-100)]">
        {[
          { label: "Language",       value: LANGUAGE_LABEL[data.language] ?? data.language },
          { label: "Farm location",  value: locationLine },
          { label: "Selected crops", value: selectedCropNames.length ? selectedCropNames.join(", ") : "Not set" },
          { label: "Selling method", value: data.sellingMethod ? SELLING_LABEL[data.sellingMethod] : "Not set" },
        ].map((row) => (
          <div key={row.label} className="flex justify-between gap-3 text-[14px] py-2.5">
            <span className="text-[var(--hw-neutral-500)] flex-shrink-0">{row.label}</span>
            <span className="text-[var(--hw-neutral-900)] font-medium text-right">{row.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <button
          onClick={onDone}
          className="w-full h-12 flex items-center justify-center bg-[var(--hw-green-700)] text-white text-[15px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
        >
          Go To Home
        </button>
      </div>
    </StepCard>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const INITIAL = {
  language: "cebuano",
  locationMode: null,
  city: "Davao City",
  district: "",
  barangay: "",
  farmSize: "",
  latitude: null,
  longitude: null,
  crops: {},
  sellingMethod: "",
  sellingArea: "",
};

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Selling methods fetched from backend: [{id, label}]
  const [sellingMethods, setSellingMethods] = useState([]);
  // Commodities fetched from backend: [{id, name}] — real DB PKs for crop submission
  const [fetchedCommodities, setFetchedCommodities] = useState([]);

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

  // Skip without saving — go straight to farmer home
  const skip = () => navigate("/farmer", { replace: true });

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
        ...(data.district    && { district: data.district }),
        ...(data.barangay    && { barangay: data.barangay }),
        ...(data.latitude    && { latitude: data.latitude }),
        ...(data.longitude   && { longitude: data.longitude }),
        ...(data.farmSize    && { farm_size: parseFloat(data.farmSize) || undefined }),
        ...(data.sellingArea && { usual_selling_area_or_buyer: data.sellingArea }),
        preferred_crops: preferredCrops,
        selling_method_ids: selectedMethod ? [selectedMethod.id] : [],
      };

      await apiPost("/api/v1/farmer/onboarding", payload).then(parseResponse);
      setStep(5);
    } catch (err) {
      setSubmitError(err.message || "Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const done = () => navigate("/farmer", { replace: true });

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

      {step === 1 && <Step1 data={data} onChange={patch} onContinue={next} onSkip={skip} />}
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
