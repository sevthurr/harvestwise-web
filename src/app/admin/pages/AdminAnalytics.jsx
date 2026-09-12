import { PageHeader } from "../../global/components/shared/PageHeader";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, Info, X, Edit2, Sliders } from "lucide-react";
import { CommodityIllustration, getCommodityIconKey } from "../../global/components/shared/CommodityIllustrations";
import { getVariants } from "../../global/data/commodities";
import { apiGet, parseResponse } from "../../global/api";
import { analyticsApi } from "../../../services/api";
import {
  MODULES,
  CLASSIFICATIONS,
  CLASSIFICATION_COLORS
} from "../components/analytics/adminAnalyticsMockData";

const DEFAULT_ROWS = 8;
const RELIABILITY_TONES = {
  High: "text-[var(--hw-success)] bg-[var(--hw-success)]/10",
  Moderate: "text-[var(--hw-warning)] bg-[var(--hw-warning)]/10",
  Limited: "text-[var(--hw-warning)] bg-[var(--hw-warning)]/10",
  Low: "text-[var(--hw-error)] bg-[var(--hw-error)]/10"
};
const MODULE_CARD_DATA = {
  "price-outlook": { label: "days", required: 14, key: "days_available" },
  "arrival-pressure": { label: "records", required: 4, key: "records_available" },
  "historical-production": { label: "quarters", required: 4, key: "quarters_available" },
  "weather-risk": { label: "days", required: 7, key: "days_available" }
};
const MODULE_ROW_FIELDS = [
  { key: "price-outlook", module: "Price Outlook", field: "price_outlook" },
  { key: "arrival-pressure", module: "Arrival Pressure", field: "arrival_pressure" },
  { key: "historical-production", module: "Historical Seasonal Production Level", field: "historical_seasonal_production_level" },
  { key: "weather-risk", module: "Weather Risk", field: "weather_risk_level" }
];
const WEIGHT_MODULES = [
  "Price Outlook",
  "Arrival Pressure",
  "Historical Seasonal Production Level",
  "Weather Risk",
  "Profitability"
];
const PRICE_OUTLOOK_MODULE = "Price Outlook";

const WEATHER_METRICS = [
  { key: "temp_range", label: "Temperature range", unit: "°C" },
  { key: "temp_min", label: "Temperature min", unit: "°C" },
  { key: "temp_max", label: "Temperature max", unit: "°C" },
  { key: "max_rh", label: "Max relative humidity", unit: "%" },
  { key: "hours_rh_above_85", label: "Hours RH above 85%", unit: "h" },
  { key: "consecutive_rh_hours_above_90", label: "Consecutive hours RH above 90%", unit: "h" },
  { key: "consecutive_rh_hours_above_95", label: "Consecutive hours RH above 95%", unit: "h" },
  { key: "wind_speed_max", label: "Max wind speed", unit: "km/h" },
  { key: "rain_daily_sum", label: "Daily rainfall", unit: "mm" }
];
const WEATHER_OPERATORS = ["between", ">", ">=", "<", "<="];
const WEATHER_RISK_LEVELS = ["suitable", "caution", "severe"];

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

// Edit Weather Risk Modal (metric-based crop_weather_rules, persisted via API)
const EditWeatherModal = ({ commodity, variety, commodityId, onClose, onSaved }) => {
  const [rules, setRules] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setError("");
      try {
        const data = await analyticsApi.listWeatherRules(commodityId);
        if (!active) return;
        const initial = (data?.items || []).map((r) => ({
          id: r.id,
          commodity_id: r.commodity_id,
          metric_key: r.metric_key,
          operator: r.operator,
          threshold_min: r.threshold_min !== null && r.threshold_min !== undefined ? String(r.threshold_min) : "",
          threshold_max: r.threshold_max !== null && r.threshold_max !== undefined ? String(r.threshold_max) : "",
          risk_level: r.risk_level,
          unit: r.unit || "",
          advisory_template: r.advisory_template || ""
        }));
        if (active) setRules(initial);
      } catch (err) {
        if (active) setError(err.message || "Failed to load weather rules.");
      }
    }
    load();
    return () => { active = false; };
  }, [commodityId]);

  const updateRule = (idx, patch) =>
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const addRule = () => {
    const metric = WEATHER_METRICS[0];
    setRules((prev) => [
      ...(prev || []),
      {
        id: null,
        commodity_id: commodityId,
        metric_key: metric.key,
        operator: ">",
        threshold_min: "",
        threshold_max: "",
        risk_level: "caution",
        unit: metric.unit,
        advisory_template: ""
      }
    ]);
  };

  const removeRule = (idx) =>
    setRules((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!rules || rules.length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setError("");
    try {
      await Promise.all(
        rules.map(async (r) => {
          const payload = {
            metric_key: r.metric_key,
            operator: r.operator,
            threshold_min: r.threshold_min !== "" ? Number(r.threshold_min) : null,
            threshold_max: r.threshold_max !== "" ? Number(r.threshold_max) : null,
            risk_level: r.risk_level,
            unit: r.unit || WEATHER_METRICS.find((m) => m.key === r.metric_key)?.unit,
            advisory_template:
              r.advisory_template ||
              `Crop weather rule for ${r.metric_key} (${r.risk_level}).`
          };
          if (r.id) {
            await analyticsApi.updateWeatherRule(r.id, payload);
          } else {
            await analyticsApi.createWeatherRule({ commodity_id: commodityId, ...payload });
          }
        })
      );
      setSaved(true);
      onSaved?.();
      setTimeout(onClose, 600);
    } catch (err) {
      setError(err.message || "Failed to save weather rules.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] transition";
  const selectCls = "w-full px-2 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] transition cursor-pointer";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
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
          {error && <p className="text-[12px] text-red-600">{error}</p>}
          <p className="text-[12px] text-[var(--hw-neutral-600)]">
            One row per metric threshold stored in <span className="font-mono">crop_weather_rules</span>.
            These rules drive the Weather Risk and HSRA module classifications.
          </p>

          {!rules && !error && <p className="text-[13px] text-[var(--hw-neutral-500)]">Loading weather rules…</p>}
          {rules && rules.length === 0 && (
            <p className="text-[13px] text-[var(--hw-neutral-500)]">
              No weather rules configured for this commodity and variety. Add one below.
            </p>
          )}

          {rules && (
            <div className="space-y-2">
              {rules.map((r, i) => (
                <div key={r.id || `new-${i}`} className="grid grid-cols-12 gap-2 items-center border border-[var(--hw-neutral-200)] rounded-xl p-2.5 bg-[var(--hw-neutral-50)]/50">
                  <div className="col-span-3">
                    <select
                      value={r.metric_key}
                      onChange={(e) => {
                        const metric = WEATHER_METRICS.find((m) => m.key === e.target.value);
                        updateRule(i, { metric_key: e.target.value, unit: metric?.unit || r.unit });
                      }}
                      className={selectCls}
                    >
                      {WEATHER_METRICS.map((m) => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <select
                      value={r.operator}
                      onChange={(e) => updateRule(i, { operator: e.target.value })}
                      className={selectCls}
                    >
                      {WEATHER_OPERATORS.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Min"
                      value={r.threshold_min}
                      onChange={(e) => updateRule(i, { threshold_min: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Max"
                      value={r.threshold_max}
                      onChange={(e) => updateRule(i, { threshold_max: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={r.risk_level}
                      onChange={(e) => updateRule(i, { risk_level: e.target.value })}
                      className={selectCls}
                    >
                      {WEATHER_RISK_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {!r.id && (
                      <button
                        onClick={() => removeRule(i)}
                        className="p-1.5 rounded-lg text-[var(--hw-neutral-500)] hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                        title="Remove rule"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addRule}
            className="text-[12px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors cursor-pointer"
          >
            + Add rule
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--hw-neutral-100)]">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors">
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 text-[13px] font-medium bg-[var(--hw-green-700)] text-white rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saved ? "Saved!" : saving ? "Saving…" : "Save Changes"}
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
  const [weightsLoading, setWeightsLoading] = useState(false);
  const [weightsError, setWeightsError] = useState("");
  const [weightIds, setWeightIds] = useState({});
  const [thresholdsLoading, setThresholdsLoading] = useState(false);
  const [thresholdsError, setThresholdsError] = useState("");
  const [priceOutlookRuleIds, setPriceOutlookRuleIds] = useState({ fav: null, unfav: null });

  // Module outputs state (computed + persisted via /admin/analytics/outputs)
  const [moduleOutputs, setModuleOutputs] = useState(null);
  const [commodityId, setCommodityId] = useState("");
  const [processedResults, setProcessedResults] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");

  // Weather rules per commodity (loaded from API for the summary card)
  const [weatherRulesByCommodity, setWeatherRulesByCommodity] = useState({});

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

  // Load adaptive weights from the admin weights API
  useEffect(() => {
    let active = true;
    async function loadWeights() {
      try {
        setWeightsLoading(true);
        const data = await analyticsApi.listWeights();
        if (!active) return;
        const byPhase = {};
        const ids = {};
        (data?.items || []).forEach((w) => {
          if (!w.crop_stage) return;
          byPhase[w.crop_stage] = {
            "Price Outlook": Number((Number(w.price_outlook_weight) * 100).toFixed(2)),
            "Arrival Pressure": Number((Number(w.arrival_pressure_weight) * 100).toFixed(2)),
            "Historical Seasonal Production Level": Number((Number(w.historical_seasonal_production_weight) * 100).toFixed(2)),
            "Weather Risk": Number((Number(w.weather_risk_weight) * 100).toFixed(2)),
            Profitability: Number((Number(w.profitability_weight) * 100).toFixed(2))
          };
          ids[w.crop_stage] = w.id;
        });
        setPhaseWeights(byPhase);
        setWeightIds(ids);
      } catch (err) {
        if (active) setWeightsError(err.message || "Failed to load weights.");
      } finally {
        if (active) setWeightsLoading(false);
      }
    }
    loadWeights();
    return () => {
      active = false;
    };
  }, []);

  // Load the Price Outlook threshold rules from the admin thresholds API
  const refreshPriceOutlook = useCallback(async () => {
    try {
      setThresholdsError("");
      const data = await analyticsApi.listThresholds();
      const poModule = (data?.items || []).find((m) => m.module_name === PRICE_OUTLOOK_MODULE);
      if (!poModule) return;
      const rules =
        poModule.rules && poModule.rules.length > 0
          ? poModule.rules
          : (await analyticsApi.listThresholdRules(poModule.id))?.items || [];
      const fav = rules.find((r) => (r.classification || "").toLowerCase() === "favorable");
      const unfav = rules.find((r) => (r.classification || "").toLowerCase() === "unfavorable");
      if (fav && unfav) {
        setPriceOutlookRules({
          favMin: Math.round(Number(fav.threshold_value) * 100),
          unfavMax: Math.round(Number(unfav.threshold_value) * 100)
        });
        setPriceOutlookRuleIds({ fav, unfav });
      }
    } catch (err) {
      setThresholdsError(err.message || "Failed to load threshold rules.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    setThresholdsLoading(true);
    refreshPriceOutlook().finally(() => {
      if (active) setThresholdsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [refreshPriceOutlook]);

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

  // Compute + persist module outputs and load the Processed Results history
  // whenever the scoped commodity/variety changes.
  const reloadAnalytics = useCallback(async () => {
    if (!scopedCommodity || !scopedVariety) return;
    setAnalyticsLoading(true);
    setAnalyticsError("");
    try {
      const variety =
        scopedVariety === "Standard" || scopedVariety === "All Varieties"
          ? undefined
          : scopedVariety;
      const outputs = await analyticsApi.computeModuleOutputs({
        crop_name: scopedCommodity,
        variety
      });
      setModuleOutputs(outputs);
      setCommodityId(outputs.commodity_id || "");
    } catch (err) {
      setAnalyticsError(err.message || "Failed to compute module outputs.");
      setModuleOutputs(null);
    }

    try {
      const data = await analyticsApi.listModuleOutputs({ page_size: 100 });
      const rows = (data?.items || []).flatMap((r) =>
        MODULE_ROW_FIELDS.map(({ key, module, field }) => ({
          id: r.id,
          basisId: key,
          module,
          commodity: r.commodity_name,
          variant: r.variety || "Standard",
          classification: r[field] || "Not available",
          inputPeriod: r.reference_month,
          processedAt: r.generated_at
        }))
      );
      setProcessedResults(rows);
    } catch {
      setProcessedResults([]);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [scopedCommodity, scopedVariety]);

  useEffect(() => {
    reloadAnalytics();
  }, [reloadAnalytics]);

  // Load persisted weather rules for the current commodity to render the summary card.
  useEffect(() => {
    if (!commodityId) return;
    let active = true;
    analyticsApi
      .listWeatherRules(commodityId)
      .then((data) => {
        if (active) setWeatherRulesByCommodity((prev) => ({ ...prev, [commodityId]: data?.items || [] }));
      })
      .catch(() => {
        if (active) setWeatherRulesByCommodity((prev) => ({ ...prev, [commodityId]: [] }));
      });
    return () => { active = false; };
  }, [commodityId]);

  const currentWeatherRules = commodityId ? weatherRulesByCommodity[commodityId] || [] : [];
  const weatherMetricLabel = (k) => WEATHER_METRICS.find((m) => m.key === k)?.label || k;
  const weatherRuleSummary = (r) => {
    const unit = r.unit || WEATHER_METRICS.find((m) => m.key === r.metric_key)?.unit || "";
    const lo = r.threshold_min != null && r.threshold_min !== "" ? `${r.threshold_min}${unit}` : "";
    const hi = r.threshold_max != null && r.threshold_max !== "" ? `${r.threshold_max}${unit}` : "";
    if (r.operator === "between") return lo && hi ? `${lo} – ${hi}` : lo || hi || "Set";
    const val = lo || hi;
    return val ? `${r.operator} ${val}` : "Set";
  };

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
  const filteredResults = processedResults.filter((r) => {
    const matchComm = !scopedCommodity || r.commodity === scopedCommodity;
    const matchVar =
      !scopedVariety ||
      (r.variety || "") === (scopedVariety === "Standard" ? "" : scopedVariety);
    const matchMod = fModule === "All" || r.module === fModule;
    const matchClass = fClassification === "All" || r.classification === fClassification;
    return matchComm && matchVar && matchMod && matchClass;
  });

  const visibleResults = showAll ? filteredResults : filteredResults.slice(0, DEFAULT_ROWS);

  // 4 Module cards built from the latest computed outputs for the current scope.
  const withCardData = (key, moduleOutput) => {
    const base = {
      classification: "Not processed",
      source: "-",
      processed: "-",
      reliability: "—",
      dataAvailable: null,
      dataRequired: null,
      dataLabel: "—"
    };
    if (!moduleOutput) return base;
    const cfg = MODULE_CARD_DATA[key];
    const basis = moduleOutput.basis_inputs || {};
    const available = cfg ? basis[cfg.key] ?? 0 : null;
    return {
      classification: moduleOutput.classification || base.classification,
      source: moduleOutput.source_label || "-",
      processed: moduleOutput.input_period || "-",
      reliability: moduleOutput.reliability_status || "—",
      dataAvailable: available,
      dataRequired: cfg ? cfg.required : null,
      dataLabel: cfg ? `${available}/${cfg.required} ${cfg.label}` : "—"
    };
  };

  const moduleOutputsByCard = moduleOutputs
    ? {
        "price-outlook": withCardData("price-outlook", moduleOutputs.price_outlook),
        "arrival-pressure": withCardData("arrival-pressure", moduleOutputs.arrival_pressure),
        "historical-production": withCardData(
          "historical-production",
          moduleOutputs.historical_seasonal_production_level
        ),
        "weather-risk": withCardData("weather-risk", moduleOutputs.weather_risk)
      }
    : {};

  const moduleCards = [
    {
      module: "Price Outlook",
      moduleKey: "price-outlook",
      ...(moduleOutputsByCard["price-outlook"] || { classification: "Not processed", source: "-", processed: "-" })
    },
    {
      module: "Arrival Pressure",
      moduleKey: "arrival-pressure",
      ...(moduleOutputsByCard["arrival-pressure"] || { classification: "Not processed", source: "-", processed: "-" })
    },
    {
      module: "Historical Seasonal Production Level",
      moduleKey: "historical-production",
      ...(moduleOutputsByCard["historical-production"] || { classification: "Not processed", source: "-", processed: "-" })
    },
    {
      module: "Weather Risk",
      moduleKey: "weather-risk",
      ...(moduleOutputsByCard["weather-risk"] || { classification: "Not processed", source: "-", processed: "-" })
    }
  ];

  const handleCardClick = (card) => {
    const targetId = card.basisId || card.moduleKey;
    const match = processedResults.find(
      (r) =>
        r.basisId === targetId &&
        r.commodity === scopedCommodity &&
        (r.variant || "Standard") === (scopedVariety || "Standard")
    );
    const params = new URLSearchParams();
    if (scopedCommodity) params.set("commodity", scopedCommodity);
    if (scopedVariety) params.set("variety", scopedVariety);
    if (match?.id) params.set("output", match.id);
    navigate(`/admin/modules/basis/${targetId}?${params.toString()}`);
  };

  const handleRowClick = (row) => {
    const params = new URLSearchParams();
    params.set("commodity", row.commodity || scopedCommodity);
    params.set("variety", row.variant || scopedVariety);
    if (row.id) params.set("output", row.id);
    navigate(`/admin/modules/basis/${row.basisId || row.moduleKey}?${params.toString()}`);
  };

  const handleWeightSave = async (phase, updated) => {
    try {
      setWeightsError("");
      const keys = ["price_outlook_weight", "arrival_pressure_weight", "historical_seasonal_production_weight", "weather_risk_weight", "profitability_weight"];
      const vals = keys.map((_, i) => Math.round((updated[WEIGHT_MODULES[i]] || 0) * 100) / 10000);
      vals[vals.length - 1] = Number((vals[vals.length - 1] + (1 - vals.reduce((a, b) => a + b, 0))).toFixed(4));
      const payload = Object.fromEntries(keys.map((k, i) => [k, vals[i]]));
      const existingId = weightIds[phase];
      const saved = existingId
        ? await analyticsApi.updateWeight(existingId, payload)
        : await analyticsApi.createWeight({ crop_stage: phase, ...payload });
      setWeightIds((prev) => ({ ...prev, [phase]: saved.id }));
      setPhaseWeights((prev) => ({ ...prev, [phase]: updated }));
    } catch (err) {
      setWeightsError(err.message || "Failed to save weights.");
    }
  };

  const handlePriceOutlookSave = async (updated) => {
    try {
      setThresholdsError("");
      const favPct = Number(updated.favMin);
      const unfavPct = Number(updated.unfavMax);
      const favVal = Math.round(favPct * 100) / 10000;
      const unfavVal = Math.round(unfavPct * 100) / 10000;

      let data = await analyticsApi.listThresholds();
      let poModule = (data?.items || []).find((m) => m.module_name === PRICE_OUTLOOK_MODULE);
      if (!poModule) {
        poModule = await analyticsApi.createThreshold({
          module_name: PRICE_OUTLOOK_MODULE,
          source_label: "Forecasting Output (Bangkerohan Retail)"
        });
      }

      const ensureRule = async (rule, classification, operator, value, display) => {
        if (rule) {
          await analyticsApi.updateThresholdRule(rule.id, {
            threshold_value: value,
            display_text: display
          });
        } else {
          const rules =
            poModule.rules && poModule.rules.length > 0
              ? poModule.rules
              : (await analyticsApi.listThresholdRules(poModule.id))?.items || [];
          const existing = rules.find((r) => (r.classification || "").toLowerCase() === classification.toLowerCase());
          if (existing) {
            await analyticsApi.updateThresholdRule(existing.id, {
              threshold_value: value,
              display_text: display
            });
          } else {
            await analyticsApi.createThresholdRule(poModule.id, {
              rule_key: classification.toLowerCase(),
              classification,
              operator,
              threshold_value: value,
              display_text: display
            });
          }
        }
      };

      const { fav, unfav } = priceOutlookRuleIds;
      await ensureRule(fav, "Favorable", ">", favVal, `> +${favPct}%`);
      await ensureRule(unfav, "Unfavorable", "<", unfavVal, `< ${unfavPct}%`);

      await refreshPriceOutlook();
    } catch (err) {
      setThresholdsError(err.message || "Failed to save threshold rules.");
    }
  };

  return (
    <>
      {editingPhase && (
        <EditWeightModal
          phase={editingPhase}
          currentWeights={phaseWeights[editingPhase]}
          onClose={() => setEditingPhase(null)}
          onSave={handleWeightSave}
        />
      )}
      {editingPriceOutlook && (
        <EditPriceOutlookModal
          currentRules={priceOutlookRules}
          onClose={() => setEditingPriceOutlook(false)}
          onSave={handlePriceOutlookSave}
        />
      )}
      {editingWeather && (
        <EditWeatherModal
          commodity={scopedCommodity}
          variety={scopedVariety}
          commodityId={commodityId}
          onClose={() => setEditingWeather(false)}
          onSaved={() => {
            reloadAnalytics();
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
            {analyticsError && (
              <div className="bg-[var(--hw-red-50)] border border-[var(--hw-red-200)] text-[var(--hw-red-800)] text-[12px] rounded-xl px-4 py-3">
                {analyticsError}
              </div>
            )}
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide mb-3">
                Current Analytics Outputs
              </h2>
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${analyticsLoading ? "opacity-60 pointer-events-none" : ""}`}>
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
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] text-[var(--hw-neutral-700)]">Reliability</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${RELIABILITY_TONES[card.reliability] ?? "text-[var(--hw-neutral-500)] bg-[var(--hw-neutral-100)]"}`}>
                            {card.reliability}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[12px] text-[var(--hw-neutral-700)]">Data</span>
                          <span
                            className={`text-[12px] font-medium ${
                              card.dataAvailable !== null &&
                              card.dataAvailable < card.dataRequired
                                ? "text-[var(--hw-error)]"
                                : "text-[var(--hw-neutral-800)]"
                            }`}
                          >
                            {card.dataLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {(moduleOutputs?.warnings?.length || 0) > 0 && (
                <div className="mt-3 rounded-lg border border-[var(--hw-warning)]/30 bg-[var(--hw-warning)]/5 p-3 flex flex-col gap-1">
                  <p className="text-[12px] font-semibold text-[var(--hw-warning)] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> Data reliability warnings
                  </p>
                  <ul className="space-y-0.5">
                    {moduleOutputs.warnings.map((w, i) => (
                      <li key={i} className="text-[12px] text-[var(--hw-neutral-700)] leading-relaxed">
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
                              onClick={() => handleRowClick(r)}
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

                {weightsLoading && (
                  <p className="text-[12px] text-[var(--hw-neutral-500)]">Loading adaptive weights…</p>
                )}
                {weightsError && (
                  <p className="text-[12px] text-red-600">{weightsError}</p>
                )}

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

                {thresholdsLoading && (
                  <p className="text-[12px] text-[var(--hw-neutral-500)]">Loading threshold rules…</p>
                )}
                {thresholdsError && (
                  <p className="text-[12px] text-red-600">{thresholdsError}</p>
                )}

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

                    {currentWeatherRules.length === 0 ? (
                      <div className="py-6 text-center text-[var(--hw-neutral-500)] text-[12px]">
                        Weather thresholds not configured for {scopedCommodity || "crop"} — {scopedVariety || "Standard"}.
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--hw-neutral-100)] text-[12px]">
                        {currentWeatherRules.slice(0, 3).map((r) => (
                          <div key={r.id || r.metric_key} className="py-2 flex flex-col gap-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--hw-neutral-600)]">{weatherMetricLabel(r.metric_key)}</span>
                              <span className="font-medium text-[var(--hw-neutral-900)] capitalize">{r.risk_level}</span>
                            </div>
                            <span className="text-[11px] text-[var(--hw-neutral-500)]">{weatherRuleSummary(r)}</span>
                          </div>
                        ))}
                        {currentWeatherRules.length > 3 && (
                          <div className="py-2 text-center text-[var(--hw-neutral-400)] text-[11px]">
                            +{currentWeatherRules.length - 3} more rule{currentWeatherRules.length - 3 > 1 ? "s" : ""} configured
                          </div>
                        )}
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
