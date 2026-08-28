import { PageHeader } from "../../global/components/shared/PageHeader";
import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, Info, X, Edit2, Sliders } from "lucide-react";
import { CommodityIllustration, getCommodityIconKey } from "../../global/components/shared/CommodityIllustrations";
import { getVariants } from "../../global/data/commodities";
import { apiGet, parseResponse } from "../../global/api";
import {
  RESULTS,
  MODULES,
  CLASSIFICATIONS,
  CLASSIFICATION_COLORS
} from "../components/analytics/adminAnalyticsMockData";

const DEFAULT_ROWS = 8;
const WEIGHT_MODULES = [
  "Price Outlook",
  "Arrival Pressure",
  "Historical Seasonal Production Level",
  "Weather Risk",
  "Profitability"
];

// Edit Adaptive Weights Modal
const EditWeightModal = ({ phase, currentWeights, onClose, onSave }) => {
  const [values, setValues] = useState(() => {
    return Object.fromEntries(
      WEIGHT_MODULES.map((m) => [m, currentWeights?.[m] !== undefined ? String(currentWeights[m]) : ""])
    );
  });
  const [saved, setSaved] = useState(false);

  const total = WEIGHT_MODULES.reduce((sum, m) => sum + (parseFloat(values[m]) || 0), 0);
  const totalOk = Math.abs(total - 100) < 0.01;
  const inputCls = "w-full px-3 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition";

  const handleSave = () => {
    if (!totalOk) return;
    const formatted = Object.fromEntries(
      WEIGHT_MODULES.map((m) => [m, parseFloat(values[m]) || 0])
    );
    onSave(phase, formatted);
    setSaved(true);
    setTimeout(onClose, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-100)]">
          <p className="font-semibold text-[var(--hw-neutral-900)]">Edit {phase} Weights</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-600)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {WEIGHT_MODULES.map((m) => (
            <div key={m}>
              <label className="block text-[12px] text-[var(--hw-neutral-700)] mb-1">{m} %</label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={values[m]}
                onChange={(e) => setValues((v) => ({ ...v, [m]: e.target.value }))}
                className={inputCls}
              />
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--hw-neutral-100)]">
            <span className="text-[13px] font-semibold text-[var(--hw-neutral-700)]">Total</span>
            <span className={`text-[13px] font-bold ${totalOk ? "text-emerald-700" : "text-red-600"}`}>
              {total > 0 ? `${total.toFixed(0)}%` : "0%"}
            </span>
          </div>
          {!totalOk && <p className="text-[12px] text-red-600">Weights must total 100%.</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--hw-neutral-100)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!totalOk}
            onClick={handleSave}
            className="px-4 py-2 text-[13px] font-medium bg-[var(--hw-green-700)] text-white rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit Price Outlook Modal (Simplified to Favorable > and Unfavorable < per Section 5)
const EditPriceOutlookModal = ({ currentRules, onClose, onSave }) => {
  const [favMin, setFavMin] = useState(currentRules?.favMin !== undefined ? String(currentRules.favMin) : "");
  const [unfavMax, setUnfavMax] = useState(currentRules?.unfavMax !== undefined ? String(currentRules.unfavMax) : "");
  const [saved, setSaved] = useState(false);

  const favNum = parseFloat(favMin);
  const unfavNum = parseFloat(unfavMax);
  const isValid = !isNaN(favNum) && !isNaN(unfavNum) && unfavNum < favNum;
  const inputCls = "w-full px-3 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] transition";

  const handleSave = () => {
    if (!isValid) return;
    onSave({ favMin: favNum, unfavMax: unfavNum });
    setSaved(true);
    setTimeout(onClose, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-100)]">
          <p className="font-semibold text-[var(--hw-neutral-900)]">Edit Price Outlook Thresholds</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-600)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-[12px] text-[var(--hw-neutral-600)]">
            Configure global percentage change thresholds. Neutral is automatically derived as the range between unfavorable and favorable boundaries.
          </p>
          <div>
            <label className="block text-[12px] text-[var(--hw-neutral-700)] mb-1">Favorable above (%)</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 5"
              value={favMin}
              onChange={(e) => setFavMin(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[12px] text-[var(--hw-neutral-700)] mb-1">Unfavorable below (%)</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. -5"
              value={unfavMax}
              onChange={(e) => setUnfavMax(e.target.value)}
              className={inputCls}
            />
          </div>
          {!isValid && (favMin !== "" || unfavMax !== "") && (
            <p className="text-[12px] text-red-600">Unfavorable cutoff must be strictly less than Favorable cutoff.</p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--hw-neutral-100)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!isValid}
            onClick={handleSave}
            className="px-4 py-2 text-[13px] font-medium bg-[var(--hw-green-700)] text-white rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit Weather Risk Modal (Commodity + Variety scoped)
const EditWeatherModal = ({ commodity, variety, currentRules, onClose, onSave }) => {
  const [suitRainMax, setSuitRainMax] = useState(currentRules?.suitRainMax !== undefined ? String(currentRules.suitRainMax) : "");
  const [cautRainMin, setCautRainMin] = useState(currentRules?.cautRainMin !== undefined ? String(currentRules.cautRainMin) : "");
  const [sevRainMin, setSevRainMin] = useState(currentRules?.sevRainMin !== undefined ? String(currentRules.sevRainMin) : "");
  const [suitTempMin, setSuitTempMin] = useState(currentRules?.suitTempMin !== undefined ? String(currentRules.suitTempMin) : "");
  const [suitTempMax, setSuitTempMax] = useState(currentRules?.suitTempMax !== undefined ? String(currentRules.suitTempMax) : "");
  const [cautTempMin, setCautTempMin] = useState(currentRules?.cautTempMin !== undefined ? String(currentRules.cautTempMin) : "");
  const [cautTempMax, setCautTempMax] = useState(currentRules?.cautTempMax !== undefined ? String(currentRules.cautTempMax) : "");
  const [sevTempThresh, setSevTempThresh] = useState(currentRules?.sevTempThresh !== undefined ? String(currentRules.sevTempThresh) : "");
  const [humidityThresh, setHumidityThresh] = useState(currentRules?.humidityThresh !== undefined ? String(currentRules.humidityThresh) : "");
  const [windThresh, setWindThresh] = useState(currentRules?.windThresh !== undefined ? String(currentRules.windThresh) : "");
  const [saved, setSaved] = useState(false);

  const inputCls = "w-full px-3 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] transition";

  const handleSave = () => {
    onSave({
      commodity,
      variety,
      suitRainMax: suitRainMax ? parseFloat(suitRainMax) : null,
      cautRainMin: cautRainMin ? parseFloat(cautRainMin) : null,
      sevRainMin: sevRainMin ? parseFloat(sevRainMin) : null,
      suitTempMin: suitTempMin ? parseFloat(suitTempMin) : null,
      suitTempMax: suitTempMax ? parseFloat(suitTempMax) : null,
      cautTempMin: cautTempMin ? parseFloat(cautTempMin) : null,
      cautTempMax: cautTempMax ? parseFloat(cautTempMax) : null,
      sevTempThresh: sevTempThresh ? parseFloat(sevTempThresh) : null,
      humidityThresh: humidityThresh ? parseFloat(humidityThresh) : null,
      windThresh: windThresh ? parseFloat(windThresh) : null
    });
    setSaved(true);
    setTimeout(onClose, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-100)]">
          <div>
            <p className="font-semibold text-[var(--hw-neutral-900)]">Edit Weather Thresholds</p>
            <p className="text-[12px] text-[var(--hw-neutral-600)]">{commodity} · {variety || "Standard"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-600)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <h4 className="text-[13px] font-semibold text-[var(--hw-neutral-800)] mb-2">Rainfall Thresholds (mm/day)</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[var(--hw-neutral-600)] mb-1">Suitable max</label>
                <input type="number" placeholder="e.g. 15" value={suitRainMax} onChange={(e) => setSuitRainMax(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--hw-neutral-600)] mb-1">Caution min</label>
                <input type="number" placeholder="e.g. 15" value={cautRainMin} onChange={(e) => setCautRainMin(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--hw-neutral-600)] mb-1">Severe min</label>
                <input type="number" placeholder="e.g. 30" value={sevRainMin} onChange={(e) => setSevRainMin(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-[13px] font-semibold text-[var(--hw-neutral-800)] mb-2">Temperature Thresholds (°C)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[var(--hw-neutral-600)] mb-1">Suitable range</label>
                <div className="flex items-center gap-1">
                  <input type="number" placeholder="Min" value={suitTempMin} onChange={(e) => setSuitTempMin(e.target.value)} className={inputCls} />
                  <span>–</span>
                  <input type="number" placeholder="Max" value={suitTempMax} onChange={(e) => setSuitTempMax(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-[var(--hw-neutral-600)] mb-1">Caution range</label>
                <div className="flex items-center gap-1">
                  <input type="number" placeholder="Min" value={cautTempMin} onChange={(e) => setCautTempMin(e.target.value)} className={inputCls} />
                  <span>–</span>
                  <input type="number" placeholder="Max" value={cautTempMax} onChange={(e) => setCautTempMax(e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-[13px] font-semibold text-[var(--hw-neutral-800)] mb-2">Additional Environmental Thresholds (Optional)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[var(--hw-neutral-600)] mb-1">Humidity max (%)</label>
                <input type="number" placeholder="e.g. 90" value={humidityThresh} onChange={(e) => setHumidityThresh(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--hw-neutral-600)] mb-1">Wind max (km/h)</label>
                <input type="number" placeholder="e.g. 60" value={windThresh} onChange={(e) => setWindThresh(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--hw-neutral-100)]">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-[13px] font-medium bg-[var(--hw-green-700)] text-white rounded-xl hover:bg-[var(--hw-green-800)] transition-colors">
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Text-only Commodity Dropdown without icons
const TextOnlyCommodityDropdown = ({ value, options = [], onChange, placeholder = "Select commodity" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!options || options.length === 0) {
    return (
      <div className="px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl text-[var(--hw-neutral-500)] min-w-[148px]">
        No analytics commodities available.
      </div>
    );
  }

  const selectedName = typeof value === "object" ? value?.name : value;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl hover:border-[var(--hw-neutral-300)] transition-colors cursor-pointer min-w-[148px]"
      >
        <span className="flex-1 text-left text-[var(--hw-neutral-800)]">
          {selectedName || placeholder}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--hw-neutral-700)] flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg overflow-hidden min-w-full max-h-60 overflow-y-auto">
          {options.map((opt) => {
            const optName = typeof opt === "object" ? opt.name : opt;
            const isSelected = optName === selectedName;

            return (
              <button
                key={optName}
                onClick={() => {
                  onChange(optName);
                  setOpen(false);
                }}
                className={`w-full flex items-center px-3 py-2 text-[13px] hover:bg-[var(--hw-neutral-50)] transition-colors text-left
                  ${isSelected ? "bg-[var(--hw-green-50)] text-[var(--hw-green-700)] font-medium" : "text-[var(--hw-neutral-800)]"}`}
              >
                <span>{optName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

function AdminAnalytics() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("outputs");
  const [commodities, setCommodities] = useState([]);
  const [loadingCommodities, setLoadingCommodities] = useState(true);

  // Scoped commodity and variety selection
  const [scopedCommodity, setScopedCommodity] = useState("");
  const [scopedVariety, setScopedVariety] = useState("");

  // History table filters (only Module and Classification since Commodity + Variety are scoped above)
  const [fModule, setFModule] = useState("All");
  const [fClassification, setFClassification] = useState("All");
  const [showAll, setShowAll] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef(null);

  // Weights & Thresholds state (empty handling support)
  const [phaseWeights, setPhaseWeights] = useState({});
  const [priceOutlookRules, setPriceOutlookRules] = useState(null);
  const [weatherRulesByCrop, setWeatherRulesByCrop] = useState({});

  // Modals state
  const [editingPhase, setEditingPhase] = useState(null);
  const [editingPriceOutlook, setEditingPriceOutlook] = useState(false);
  const [editingWeather, setEditingWeather] = useState(false);

  // Fetch commodities from database
  useEffect(() => {
    let active = true;
    async function loadCommodities() {
      try {
        setLoadingCommodities(true);
        const res = await apiGet("/farmer/commodities");
        if (res.ok && active) {
          const data = await parseResponse(res);
          const rawList = Array.isArray(data) ? data : data?.items || [];
          const top10 = rawList
            .filter((c) => (c.isTop10 ?? c.is_top10 ?? true) && (c.isActive ?? c.is_active ?? true))
            .map((c) => {
              const name = c.name || c.baseName || c.base_name;
              return {
                id: c.id,
                name,
                iconKey: getCommodityIconKey(c.id, c.baseName || c.base_name, name)
              };
            });
          setCommodities(top10);
          if (top10.length > 0) {
            setScopedCommodity(top10[0].name);
          }
        }
      } catch (err) {
        console.warn("Failed to load commodities for analytics:", err);
      } finally {
        if (active) setLoadingCommodities(false);
      }
    }
    loadCommodities();
    return () => {
      active = false;
    };
  }, []);

  // Scoped varieties
  const scopedVariants = useMemo(() => {
    if (!scopedCommodity) return [];
    return getVariants(scopedCommodity);
  }, [scopedCommodity]);

  useEffect(() => {
    if (scopedVariants.length > 0) {
      setScopedVariety(scopedVariants[0]);
    } else {
      setScopedVariety("Standard");
    }
  }, [scopedCommodity, scopedVariants]);

  useEffect(() => {
    if (!showTooltip) return;
    const h = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) setShowTooltip(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showTooltip]);

  const selectCls = "px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] transition cursor-pointer";

  // Filter processed results using the top scope (scopedCommodity + scopedVariety) + module & classification
  const filteredResults = RESULTS.filter((r) => {
    const matchComm = !scopedCommodity || r.commodity === scopedCommodity;
    const matchVar = !scopedVariety || r.variant === scopedVariety || (!r.variant && scopedVariety === "Standard");
    const matchMod = fModule === "All" || r.module === fModule;
    const matchClass = fClassification === "All" || r.classification === fClassification;
    return matchComm && matchVar && matchMod && matchClass;
  });

  const visibleResults = showAll ? filteredResults : filteredResults.slice(0, DEFAULT_ROWS);

  // 4 Module definitions for current variety outputs (all clickable)
  const moduleCards = [
    { module: "Price Outlook", moduleKey: "price-outlook", classification: "Not processed", source: "-", processed: "-" },
    { module: "Arrival Pressure", moduleKey: "arrival-pressure", classification: "Not processed", source: "-", processed: "-" },
    { module: "Historical Seasonal Production Level", moduleKey: "historical-production", classification: "Not processed", source: "-", processed: "-" },
    { module: "Weather Risk", moduleKey: "weather-risk", classification: "Not processed", source: "-", processed: "-" }
  ];

  const handleCardClick = (card) => {
    const targetId = card.basisId || card.moduleKey;
    const params = new URLSearchParams();
    if (scopedCommodity) params.set("commodity", scopedCommodity);
    if (scopedVariety) params.set("variety", scopedVariety);
    navigate(`/admin/modules/basis/${targetId}?${params.toString()}`);
  };

  const currentCropWeatherKey = `${scopedCommodity}_${scopedVariety || "Standard"}`;
  const currentWeatherConfig = weatherRulesByCrop[currentCropWeatherKey];

  return (
    <>
      {editingPhase && (
        <EditWeightModal
          phase={editingPhase}
          currentWeights={phaseWeights[editingPhase]}
          onClose={() => setEditingPhase(null)}
          onSave={(phase, updated) => {
            setPhaseWeights((prev) => ({ ...prev, [phase]: updated }));
          }}
        />
      )}
      {editingPriceOutlook && (
        <EditPriceOutlookModal
          currentRules={priceOutlookRules}
          onClose={() => setEditingPriceOutlook(false)}
          onSave={(updated) => setPriceOutlookRules(updated)}
        />
      )}
      {editingWeather && (
        <EditWeatherModal
          commodity={scopedCommodity}
          variety={scopedVariety}
          currentRules={currentWeatherConfig}
          onClose={() => setEditingWeather(false)}
          onSave={(updated) => {
            setWeatherRulesByCrop((prev) => ({
              ...prev,
              [`${updated.commodity}_${updated.variety || "Standard"}`]: updated
            }));
          }}
        />
      )}

      <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-6">
        {/* Header */}
        <PageHeader
          title="Analytical Modules"
          description="Review processed module outputs and advisory rules used by HarvestWise."
        />

        {/* Navigation Tabs */}
        <div className="border-b border-[var(--hw-neutral-200)]">
          <div className="flex">
            {[
              { id: "outputs", label: "Module Outputs" },
              { id: "weights", label: "Weights & Thresholds" }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-5 py-3 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? "border-[var(--hw-green-700)] text-[var(--hw-neutral-900)] font-semibold"
                    : "border-transparent text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-900)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══ MODULE OUTPUTS TAB ══ */}
        {tab === "outputs" && (
          <div className="space-y-6">
            {/* Scoped Variety Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)]">
              <div className="flex items-center gap-3">
                {scopedCommodity && (
                  <CommodityIllustration
                    commodityId={getCommodityIconKey(null, null, scopedCommodity)}
                    className="w-8 h-8 flex-shrink-0"
                  />
                )}
                <span className="text-[17px] font-bold text-[var(--hw-neutral-900)]">
                  {scopedCommodity ? `${scopedCommodity} · ${scopedVariety || "Standard"}` : "Select a commodity and variety"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[11px] text-[var(--hw-neutral-600)] font-medium px-1">Commodity</label>
                  <TextOnlyCommodityDropdown
                    value={scopedCommodity}
                    options={commodities}
                    onChange={setScopedCommodity}
                    placeholder="Select Commodity"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[11px] text-[var(--hw-neutral-600)] font-medium px-1">Variety</label>
                  <select
                    value={scopedVariety}
                    onChange={(e) => setScopedVariety(e.target.value)}
                    disabled={!scopedCommodity || scopedVariants.length === 0}
                    className={`${selectCls} min-w-[140px] disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {scopedVariants.length === 0 ? (
                      <option value="Standard">Standard</option>
                    ) : (
                      scopedVariants.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* 4 Module Output Cards (Clickable & Empty State) */}
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide mb-3">
                Current Analytics Outputs
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {moduleCards.map((card) => {
                  const cc = CLASSIFICATION_COLORS[card.classification] ?? "text-[var(--hw-neutral-500)]";
                  return (
                    <div
                      key={card.module}
                      onClick={() => handleCardClick(card)}
                      className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3 hover:bg-[var(--hw-neutral-50)] hover:border-[var(--hw-neutral-300)] transition-colors cursor-pointer"
                    >
                      <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] leading-snug">{card.module}</p>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[12px] text-[var(--hw-neutral-700)]">Classification</span>
                          <span className={`text-[12px] font-semibold ${cc}`}>{card.classification}</span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[12px] text-[var(--hw-neutral-700)]">Source</span>
                          <span className="text-[12px] text-[var(--hw-neutral-800)] text-right max-w-[120px] leading-tight truncate">
                            {card.source}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[12px] text-[var(--hw-neutral-700)]">Processed</span>
                          <span className="text-[12px] text-[var(--hw-neutral-800)]">{card.processed}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Processed Results History Table */}
            <div className="space-y-4 pt-2">
              {/* Heading + tooltip */}
              <div ref={tooltipRef} className="relative flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Processed Results</h2>
                <button
                  onClick={() => setShowTooltip((v) => !v)}
                  className="text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-800)] transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>
                {showTooltip && (
                  <div className="absolute top-full left-0 mt-2 z-20 w-[320px] bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] text-[var(--hw-neutral-800)] leading-relaxed">
                        This table shows processed outputs for Price Outlook, Arrival Pressure, Historical Seasonal Production Level, and Weather Risk. Profitability is calculated during individual farmer assessment because it depends on farmer-specific cost, yield, and selling-price inputs.
                      </p>
                      <button
                        onClick={() => setShowTooltip(false)}
                        className="text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-800)] flex-shrink-0 mt-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Filters (Module & Classification only — redundant Commodity/Variety removed) */}
              <div className="flex flex-wrap gap-3 items-center">
                {/* Module Filter */}
                <select
                  value={fModule}
                  onChange={(e) => {
                    setFModule(e.target.value);
                    setShowAll(false);
                  }}
                  className={selectCls}
                >
                  {MODULES.map((m) => (
                    <option key={m} value={m}>
                      {m === "All" ? "All modules" : m}
                    </option>
                  ))}
                </select>

                {/* Classification Filter */}
                <select
                  value={fClassification}
                  onChange={(e) => {
                    setFClassification(e.target.value);
                    setShowAll(false);
                  }}
                  className={selectCls}
                >
                  {CLASSIFICATIONS.map((c) => (
                    <option key={c} value={c}>
                      {c === "All" ? "All classifications" : c}
                    </option>
                  ))}
                </select>

                {(fModule !== "All" || fClassification !== "All") && (
                  <button
                    onClick={() => {
                      setFModule("All");
                      setFClassification("All");
                      setShowAll(false);
                    }}
                    className="text-[12px] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] transition-colors underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                      <tr>
                        {["Module", "Commodity", "Variety", "Input Period", "Classification", "Processed Date"].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold text-[var(--hw-neutral-600)] whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                      {filteredResults.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-[var(--hw-neutral-500)] text-[13px]">
                            No processed results found for the selected commodity, variety, and filters.
                          </td>
                        </tr>
                      ) : (
                        visibleResults.map((r) => {
                          const cc = CLASSIFICATION_COLORS[r.classification] ?? "text-[var(--hw-neutral-700)]";
                          return (
                            <tr
                              key={r.id}
                              onClick={() => navigate(`/admin/modules/basis/${r.id}`)}
                              className="hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
                            >
                              <td className="px-3 py-2.5 font-medium text-[var(--hw-neutral-900)] whitespace-nowrap">{r.module}</td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  {r.commodity && (
                                    <CommodityIllustration
                                      commodityId={getCommodityIconKey(null, null, r.commodity)}
                                      className="w-5 h-5 flex-shrink-0"
                                    />
                                  )}
                                  <span className="text-[var(--hw-neutral-800)]">{r.commodity || "-"}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-700)] whitespace-nowrap">{r.variant || "Standard"}</td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-800)] whitespace-nowrap">{r.inputPeriod || "-"}</td>
                              <td className={`px-3 py-2.5 font-semibold ${cc}`}>{r.classification || "Not available"}</td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-800)] whitespace-nowrap">{r.processedAt || "-"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredResults.length > DEFAULT_ROWS && (
                  <div className="px-4 py-3 border-t border-[var(--hw-neutral-100)] flex items-center justify-between">
                    <p className="text-[12px] text-[var(--hw-neutral-700)]">
                      Showing {visibleResults.length} of {filteredResults.length} results
                    </p>
                    <button
                      onClick={() => setShowAll((v) => !v)}
                      className="text-[12px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
                    >
                      {showAll ? "Show less" : `Show all ${filteredResults.length} results`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ WEIGHTS & THRESHOLDS TAB ══ */}
        {tab === "weights" && (
          <div className="space-y-8">
            {/* Section 1: Adaptive Weights */}
            <section className="space-y-4">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--hw-neutral-900)]">Adaptive Weights</h2>
                <p className="text-[12px] text-[var(--hw-neutral-600)] mt-0.5">
                  Stage-level weights applied across Price Outlook, Arrival Pressure, Historical Production, Weather Risk, and Profitability. Weights per phase must sum to 100%.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["Planning", "Planting", "Harvesting"].map((phase) => {
                  const weights = phaseWeights[phase];
                  const hasWeights = weights && Object.keys(weights).length > 0;
                  const total = hasWeights ? Object.values(weights).reduce((a, b) => a + b, 0) : null;

                  return (
                    <div
                      key={phase}
                      className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--hw-neutral-100)]">
                          <div>
                            <h3 className="text-[15px] font-bold text-[var(--hw-neutral-900)]">{phase}</h3>
                            <p className="text-[11px] text-[var(--hw-neutral-500)]">Phase weight profile</p>
                          </div>
                          <button
                            onClick={() => setEditingPhase(phase)}
                            className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] hover:text-black transition-colors cursor-pointer"
                            title={`Edit ${phase} Weights`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {!hasWeights ? (
                          <div className="py-6 text-center text-[var(--hw-neutral-500)] text-[12px]">
                            No {phase} weights configured.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {WEIGHT_MODULES.map((m) => (
                              <div key={m} className="flex items-center justify-between text-[12px]">
                                <span className="text-[var(--hw-neutral-700)] truncate pr-2">{m}</span>
                                <span className="font-semibold text-[var(--hw-neutral-900)] shrink-0">
                                  {weights[m] !== undefined ? `${weights[m]}%` : "-"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--hw-neutral-100)] flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-[var(--hw-neutral-700)]">Total</span>
                        <span className={`text-[13px] font-bold ${total !== null ? "text-emerald-700" : "text-[var(--hw-neutral-400)]"}`}>
                          {total !== null ? `Total ${total}%` : "Total -"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section 2: Threshold Rules */}
            <section className="space-y-4">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--hw-neutral-900)]">Threshold Rules</h2>
                <p className="text-[12px] text-[var(--hw-neutral-600)] mt-0.5">
                  Threshold configurations and classification boundaries used by each analytical module.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Price Outlook (Global Admin Configured) */}
                <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b border-[var(--hw-neutral-100)]">
                      <div>
                        <h3 className="text-[15px] font-bold text-[var(--hw-neutral-900)]">Price Outlook</h3>
                        <p className="text-[11px] text-[var(--hw-neutral-500)] mt-0.5">Source: Forecasting output (Bangkerohan Retail Prices)</p>
                      </div>
                      <button
                        onClick={() => setEditingPriceOutlook(true)}
                        className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] hover:text-black transition-colors shrink-0 cursor-pointer"
                        title="Edit Price Outlook Thresholds"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {!priceOutlookRules ? (
                      <div className="py-6 text-center text-[var(--hw-neutral-500)] text-[12px]">
                        Price Outlook thresholds not configured.
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--hw-neutral-100)] text-[12px]">
                        <div className="py-2 flex items-center justify-between gap-3">
                          <span className="font-semibold text-emerald-700">Favorable</span>
                          <span className="text-[var(--hw-neutral-700)]">Forecast price change &gt; +{priceOutlookRules.favMin}%</span>
                        </div>
                        <div className="py-2 flex items-center justify-between gap-3">
                          <span className="font-semibold text-[var(--hw-neutral-600)]">Neutral</span>
                          <span className="text-[var(--hw-neutral-700)]">{priceOutlookRules.unfavMax}% to +{priceOutlookRules.favMin}%</span>
                        </div>
                        <div className="py-2 flex items-center justify-between gap-3">
                          <span className="font-semibold text-red-600">Unfavorable</span>
                          <span className="text-[var(--hw-neutral-700)]">Forecast price change &lt; {priceOutlookRules.unfavMax}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Arrival Pressure (Derived per Commodity + Variety — Read-Only) */}
                <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b border-[var(--hw-neutral-100)]">
                      <div>
                        <h3 className="text-[15px] font-bold text-[var(--hw-neutral-900)]">Arrival Pressure</h3>
                        <p className="text-[11px] text-[var(--hw-neutral-500)] mt-0.5">
                          Source: DFTC Arrival Volume records · {scopedCommodity ? `${scopedCommodity} (${scopedVariety || "Standard"})` : "No crop selected"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 bg-[var(--hw-neutral-50)] p-3 rounded-xl border border-[var(--hw-neutral-100)] text-center">
                        <div>
                          <p className="text-[11px] text-[var(--hw-neutral-500)]">Q1 Threshold</p>
                          <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] mt-0.5">- MT/week</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[var(--hw-neutral-500)]">Q2 (Median)</p>
                          <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] mt-0.5">- MT/week</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[var(--hw-neutral-500)]">Q3 Threshold</p>
                          <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] mt-0.5">- MT/week</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--hw-neutral-500)] text-center">
                        Insufficient arrival history to calculate quartiles for this variety.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Historical Seasonal Production Level (Derived per Commodity + Variety — Read-Only) */}
                <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b border-[var(--hw-neutral-100)]">
                      <div>
                        <h3 className="text-[15px] font-bold text-[var(--hw-neutral-900)]">Historical Seasonal Production Level</h3>
                        <p className="text-[11px] text-[var(--hw-neutral-500)] mt-0.5">
                          Source: PSA OpenStat Production API · {scopedCommodity ? `${scopedCommodity} (${scopedVariety || "Standard"})` : "No crop selected"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 bg-[var(--hw-neutral-50)] p-3 rounded-xl border border-[var(--hw-neutral-100)] text-center">
                        <div>
                          <p className="text-[11px] text-[var(--hw-neutral-500)]">Q1 Ratio</p>
                          <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] mt-0.5">-</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[var(--hw-neutral-500)]">Q2 Ratio</p>
                          <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] mt-0.5">-</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[var(--hw-neutral-500)]">Q3 Ratio</p>
                          <p className="text-[13px] font-bold text-[var(--hw-neutral-800)] mt-0.5">-</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--hw-neutral-500)] text-center">
                        Insufficient historical production data to calculate thresholds.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Weather Risk (Configured per Commodity + Variety) */}
                <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b border-[var(--hw-neutral-100)]">
                      <div>
                        <h3 className="text-[15px] font-bold text-[var(--hw-neutral-900)]">Weather Risk</h3>
                        <p className="text-[11px] text-[var(--hw-neutral-500)] mt-0.5">
                          Scope: {scopedCommodity ? `${scopedCommodity} — ${scopedVariety || "Standard"}` : "Select a commodity and variety"}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingWeather(true)}
                        disabled={!scopedCommodity}
                        className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] hover:text-black transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        title="Edit Weather Thresholds"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {!currentWeatherConfig ? (
                      <div className="py-6 text-center text-[var(--hw-neutral-500)] text-[12px]">
                        Weather thresholds not configured for {scopedCommodity || "crop"} — {scopedVariety || "Standard"}.
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--hw-neutral-100)] text-[12px]">
                        <div className="py-2 flex items-center justify-between">
                          <span className="text-[var(--hw-neutral-600)]">Suitable Rainfall</span>
                          <span className="font-medium text-[var(--hw-neutral-900)]">
                            {currentWeatherConfig.suitRainMax ? `< ${currentWeatherConfig.suitRainMax} mm/day` : "Not configured"}
                          </span>
                        </div>
                        <div className="py-2 flex items-center justify-between">
                          <span className="text-[var(--hw-neutral-600)]">Suitable Temperature</span>
                          <span className="font-medium text-[var(--hw-neutral-900)]">
                            {currentWeatherConfig.suitTempMin && currentWeatherConfig.suitTempMax
                              ? `${currentWeatherConfig.suitTempMin}–${currentWeatherConfig.suitTempMax}°C`
                              : "Not configured"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Profitability (Global Farmer Assessment Rule) */}
                <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b border-[var(--hw-neutral-100)]">
                      <div>
                        <h3 className="text-[15px] font-bold text-[var(--hw-neutral-900)]">Profitability</h3>
                        <p className="text-[11px] text-[var(--hw-neutral-500)] mt-0.5">Applied during individual farmer assessment</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3 bg-[var(--hw-neutral-50)] rounded-xl border border-[var(--hw-neutral-100)]">
                        <p className="text-[11px] text-[var(--hw-neutral-600)] leading-relaxed">
                          This rule is applied during individual farmer assessment using the farmer&apos;s own production cost, expected yield, and selling price. It is not shown as a global analytical result.
                        </p>
                      </div>
                      <div className="divide-y divide-[var(--hw-neutral-100)] text-[12px]">
                        <div className="py-1.5 flex items-center justify-between">
                          <span className="text-[var(--hw-neutral-600)]">Favorable Multiplier</span>
                          <span className="font-medium text-[var(--hw-neutral-900)]">-</span>
                        </div>
                        <div className="py-1.5 flex items-center justify-between">
                          <span className="text-[var(--hw-neutral-600)]">Break-even Overlap Rule</span>
                          <span className="font-medium text-[var(--hw-neutral-500)]">Not configured</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Final Advisory Cutoffs (Global Rule) */}
                <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b border-[var(--hw-neutral-100)]">
                      <div>
                        <h3 className="text-[15px] font-bold text-[var(--hw-neutral-900)]">Final Advisory Cutoffs</h3>
                        <p className="text-[11px] text-[var(--hw-neutral-500)] mt-0.5">Recommendation Engine output mapping</p>
                      </div>
                    </div>

                    <div className="divide-y divide-[var(--hw-neutral-100)] text-[12px]">
                      <div className="py-2.5 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-700">Recommended</span>
                          <span className="font-mono text-[var(--hw-neutral-800)] font-medium">-</span>
                        </div>
                        <p className="text-[11px] text-[var(--hw-neutral-500)]">Most factors support planting.</p>
                      </div>
                      <div className="py-2.5 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-amber-700">Proceed with Caution</span>
                          <span className="font-mono text-[var(--hw-neutral-800)] font-medium">-</span>
                        </div>
                        <p className="text-[11px] text-[var(--hw-neutral-500)]">Some factors add caution.</p>
                      </div>
                      <div className="py-2.5 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-red-700">Avoid for Now</span>
                          <span className="font-mono text-[var(--hw-neutral-800)] font-medium">-</span>
                        </div>
                        <p className="text-[11px] text-[var(--hw-neutral-500)]">Multiple unfavorable factors.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  );
}

export { AdminAnalytics as default };
