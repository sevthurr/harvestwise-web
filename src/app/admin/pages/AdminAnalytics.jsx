import { PageHeader } from "../../global/components/shared/PageHeader";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChevronDown, Info, X, Edit2, Sliders, ArrowRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../global/components/ui/tooltip";
import { CommodityIllustration, getCommodityIconKey } from "../../global/components/shared/CommodityIllustrations";
import { apiGet, parseResponse } from "../../global/api";
import { analyticsApi } from "../../../services/api";
import { useArrivalPressure, useHistoricalSeasonalProduction } from "../../../hooks/useAnalyticsOutputs";
import { formatDateTime, formatDate } from "../../global/utils/apiTransforms";
import {
  arrivalBoundaryRows,
  arrivalSeriesTotals,
  bucketArrivals,
  latestArrivalBucket
} from "../components/analytics/arrivalVolumeSeries";
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
// The Arrival Pressure card reads as a supply scale: Low (deficit) through
// High (surplus). This is deliberately not CLASSIFICATION_COLORS, which maps
// Low to emerald and Lower Middle to blue because it is shared with Price
// Outlook, where those labels mean something different.
const ARRIVAL_PRESSURE_TONES = {
  Low: "text-emerald-700",
  "Lower Middle": "text-blue-600",
  "Upper Middle": "text-amber-600",
  High: "text-red-600"
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
const WEIGHT_ABBR = {
  "Price Outlook": "Price",
  "Arrival Pressure": "Arrival",
  "Historical Seasonal Production Level": "Seasonal",
  "Weather Risk": "Weather",
  Profitability: "Profit"
};
// Backend crop-stage keys (must match the advisory pipeline's CropStage enum)
// with the display labels shown to admins.
const WEIGHT_PHASES = [
  { key: "before_planting", label: "Planning" },
  { key: "during_planting", label: "Planting" },
  { key: "near_harvest", label: "Near Harvest" },
  { key: "harvest", label: "Harvest" }
];
// Validated weather-sensitive presets (percent) — default base profile per
// stage, pre-filled when no adaptive_weight row exists yet.
const DEFAULT_STAGE_WEIGHTS = {
  before_planting: {
    "Price Outlook": 30, "Arrival Pressure": 20,
    "Historical Seasonal Production Level": 15, "Weather Risk": 25, Profitability: 10
  },
  during_planting: {
    "Price Outlook": 25, "Arrival Pressure": 15,
    "Historical Seasonal Production Level": 15, "Weather Risk": 35, Profitability: 10
  },
  near_harvest: {
    "Price Outlook": 35, "Arrival Pressure": 20,
    "Historical Seasonal Production Level": 5, "Weather Risk": 30, Profitability: 10
  },
  harvest: {
    "Price Outlook": 40, "Arrival Pressure": 25,
    "Historical Seasonal Production Level": 5, "Weather Risk": 20, Profitability: 10
  }
};
// Weather-resilient presets (percent) — read-only reference for the admin.
const RESILIENT_STAGE_WEIGHTS = {
  before_planting: {
    "Price Outlook": 35, "Arrival Pressure": 20,
    "Historical Seasonal Production Level": 15, "Weather Risk": 15, Profitability: 15
  },
  during_planting: {
    "Price Outlook": 30, "Arrival Pressure": 15,
    "Historical Seasonal Production Level": 15, "Weather Risk": 25, Profitability: 15
  },
  near_harvest: {
    "Price Outlook": 40, "Arrival Pressure": 20,
    "Historical Seasonal Production Level": 5, "Weather Risk": 20, Profitability: 15
  },
  harvest: {
    "Price Outlook": 45, "Arrival Pressure": 25,
    "Historical Seasonal Production Level": 5, "Weather Risk": 10, Profitability: 15
  }
};
const PROFITABILITY_MODULE = "Profitability";
const PRICE_OUTLOOK_MODULE = "Price Outlook";

const formatDisplayDate = (val) => {
  if (!val) return "-";
  try {
    const s = String(val);
    const formatted = formatDate(s.length === 7 ? `${s}-01` : s);
    return formatted && formatted !== "Invalid Date" ? formatted : s;
  } catch {
    return val;
  }
};

const formatDisplayDateTime = (val) => {
  if (!val) return "-";
  try {
    const formatted = formatDateTime(val);
    return formatted && formatted !== "Invalid Date" ? formatted : val;
  } catch {
    return val;
  }
};

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
  const phaseLabel = WEIGHT_PHASES.find((p) => p.key === phase)?.label || phase;
  const [values, setValues] = useState(() => {
    const base =
      currentWeights && Object.keys(currentWeights).length > 0
        ? currentWeights
        : DEFAULT_STAGE_WEIGHTS[phase] || {};
    return Object.fromEntries(
      WEIGHT_MODULES.map((m) => [m, base[m] !== undefined ? String(base[m]) : ""])
    );
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const total = WEIGHT_MODULES.reduce((sum, m) => sum + (parseFloat(values[m]) || 0), 0);
  const totalOk = Math.abs(total - 100) < 0.01;
  const inputCls = "w-full px-3 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition";

  // `onSave` resolves to null on success or the failure message. It must be
  // awaited: setting "Saved!" before the write resolves is what let a rejected
  // save look identical to a successful one.
  const handleSave = async () => {
    if (!totalOk) return;
    const formatted = Object.fromEntries(
      WEIGHT_MODULES.map((m) => [m, parseFloat(values[m]) || 0])
    );
    setSaveError("");
    setSaving(true);
    let failure;
    try {
      failure = await onSave(phase, formatted);
    } catch (err) {
      failure = err.message || "Failed to save weights.";
    }
    setSaving(false);
    if (failure) {
      setSaveError(`${failure} Nothing was changed.`);
      return;
    }
    setSaved(true);
    setTimeout(onClose, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 xs:p-4 pt-4 pb-24 sm:p-6">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[calc(100dvh-7.5rem)] sm:max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-100)] shrink-0">
          <p className="font-semibold text-black">Edit {phaseLabel} Weights</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-black transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0 [scrollbar-width:thin]">
          {WEIGHT_MODULES.map((m) => (
            <div key={m}>
              <label className="block text-[12px] text-black mb-1">{m} %</label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={values[m]}
                onChange={(e) => setValues((v) => ({ ...v, [m]: e.target.value }))}
                className="w-full px-3 py-2 text-[13px] text-black border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition"
              />
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--hw-neutral-100)]">
            <span className="text-[13px] font-semibold text-black">Total</span>
            <span className={`text-[13px] font-bold ${totalOk ? "text-emerald-700" : "text-red-600"}`}>
              {total > 0 ? `${total.toFixed(0)}%` : "0%"}
            </span>
          </div>
          {!totalOk && <p className="text-[12px] text-red-600">Weights must total 100%.</p>}
        </div>
        <div className="flex items-center justify-between gap-2 px-5 py-3.5 sm:py-4 border-t border-[var(--hw-neutral-100)] shrink-0 bg-white">
          <div className="flex-1 min-w-0">
            {saveError && <p className="text-[12px] text-red-600 text-right">{saveError}</p>}
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-[13px] font-medium border border-[var(--hw-neutral-200)] text-black rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors disabled:opacity-50 disabled:text-neutral-400"
          >
            Cancel
          </button>
          <button
            disabled={!totalOk || saving || saved}
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

// Edit Price Outlook Modal (Simplified to Favorable > and Unfavorable < per Section 5)
const EditPriceOutlookModal = ({ currentRules, onClose, onSave }) => {
  const [favMin, setFavMin] = useState(currentRules?.favMin !== undefined ? String(currentRules.favMin) : "");
  const [unfavMax, setUnfavMax] = useState(currentRules?.unfavMax !== undefined ? String(currentRules.unfavMax) : "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const favNum = parseFloat(favMin);
  const unfavNum = parseFloat(unfavMax);
  const isValid = !isNaN(favNum) && !isNaN(unfavNum) && unfavNum < favNum;
  const inputCls = "w-full px-3 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] transition";

  const handleSave = async () => {
    if (!isValid) return;
    setSaveError("");
    setSaving(true);
    let failure;
    try {
      failure = await onSave({ favMin: favNum, unfavMax: unfavNum });
    } catch (err) {
      failure = err.message || "Failed to save threshold rules.";
    }
    setSaving(false);
    if (failure) {
      setSaveError(`${failure} Nothing was changed.`);
      return;
    }
    setSaved(true);
    setTimeout(onClose, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 xs:p-4 pt-4 pb-24 sm:p-6">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[calc(100dvh-7.5rem)] sm:max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-100)] shrink-0">
          <p className="font-semibold text-black">Edit Price Outlook Thresholds</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-black transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0 [scrollbar-width:thin]">
          <p className="text-[12px] text-black">
            Configure global percentage change thresholds. Neutral is automatically derived as the range between unfavorable and favorable boundaries.
          </p>
          <div>
            <label className="block text-[12px] text-black mb-1">Favorable above (%)</label>
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
            <label className="block text-[12px] text-black mb-1">Unfavorable below (%)</label>
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
        <div className="flex items-center justify-between gap-2 px-5 py-3.5 sm:py-4 border-t border-[var(--hw-neutral-100)] shrink-0 bg-white">
          <div className="flex-1 min-w-0">
            {saveError && <p className="text-[12px] text-red-600 text-right">{saveError}</p>}
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-[13px] font-medium border border-[var(--hw-neutral-200)] text-black rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors disabled:opacity-50 disabled:text-neutral-400"
          >
            Cancel
          </button>
          <button
            disabled={!isValid || saving || saved}
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

// Edit Profitability Modal (Configures farmer assessment classification rules matching Table 9)
// Edit Profitability Modal (Configures farmer assessment classification rules)
const EditProfitabilityModal = ({ currentRules, onClose, onSave }) => {
  const initialFav = currentRules?.favPct ?? (currentRules?.favMultiplier ? Math.round(Number(currentRules.favMultiplier) <= 10 ? currentRules.favMultiplier * 100 : currentRules.favMultiplier) : 110);

  const [favPct, setFavPct] = useState(initialFav);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const favNum = Number(favPct);
  const isValid = !isNaN(favNum) && favNum > 100 && favNum <= 300;
  const favMargin = Math.round(favNum - 100);

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    setSaveError("");
    try {
      const err = await onSave({ favPct: favNum, unfavPct: 100 });
      if (err) {
        setSaveError(err);
      } else {
        setSaved(true);
        setTimeout(onClose, 600);
      }
    } catch (e) {
      setSaveError(e.message || "Failed to save profitability threshold.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 xs:p-4 pt-4 pb-24 sm:p-6">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[calc(100dvh-7.5rem)] sm:max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-100)] shrink-0">
          <div>
            <p className="font-semibold text-black">Edit Profitability Thresholds</p>
            <p className="text-[12px] text-black">Global farmer assessment classification rules</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-black transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0 [scrollbar-width:thin]">
          <p className="text-[12px] text-black leading-relaxed">
            Profitability is evaluated during farmer crop planning where <span className="font-semibold text-black">Break-Even = Total Cost ÷ Marketable Yield</span>. Marginal and Unfavorable are anchored to the Break-even Price.
          </p>

          <div>
            <label className="block text-[12px] font-medium text-black mb-1">
              Favorable Threshold (% of Break-even Price)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="1"
                  min="101"
                  max="300"
                  placeholder="110"
                  aria-label="Favorable Threshold Percentage"
                  value={favPct}
                  onChange={(e) => setFavPct(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] text-black border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] transition pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-black">
                  %
                </span>
              </div>
              <span className="text-[12px] font-medium text-black whitespace-nowrap">
                ({favMargin >= 0 ? `+${favMargin}%` : `${favMargin}%`} profit buffer)
              </span>
            </div>
            <p className="text-[11px] text-black mt-1">
              Lower Forecast must be at least this percentage of Break-even Price to be Favorable.
            </p>
          </div>

          <div className="p-3 bg-[var(--hw-neutral-50)] rounded-xl border border-[var(--hw-neutral-100)] text-[10px] space-y-1">
            <p className="font-semibold text-black text-[9.5px] uppercase tracking-wide mb-1">
              Decision Rule Preview
            </p>
            <p className="text-black text-[10px] leading-snug">
              <span className="text-emerald-700 font-semibold">Favorable:</span> Lower Forecast ≥ {favNum || 110}% of Break-even Price
            </p>
            <p className="text-black text-[10px] leading-snug">
              <span className="text-amber-600 font-semibold">Marginal:</span> Forecast Range overlaps Break-even Price
            </p>
            <p className="text-black text-[10px] leading-snug">
              <span className="text-red-600 font-semibold">Unfavorable:</span> Upper Forecast &lt; Break-even Price
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3.5 sm:py-4 border-t border-[var(--hw-neutral-100)] shrink-0 bg-white">
          <div className="flex-1 min-w-0">
            {saveError && <p className="text-[12px] text-red-600 text-right">{saveError}</p>}
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-[13px] font-medium border border-[var(--hw-neutral-200)] text-black rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors disabled:opacity-50 disabled:text-neutral-400"
          >
            Cancel
          </button>
          <button
            disabled={!isValid || saving || saved}
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

  const allMetricOptions = useMemo(() => {
    const existingKeys = new Set(WEATHER_METRICS.map((m) => m.key));
    const extras = (rules || [])
      .filter((r) => r.metric_key && !existingKeys.has(r.metric_key))
      .map((r) => ({
        key: r.metric_key,
        label: r.metric_key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        unit: r.unit || ""
      }));
    return [...WEATHER_METRICS, ...extras];
  }, [rules]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 xs:p-4 pt-4 pb-24 sm:p-6">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[calc(100dvh-7.5rem)] sm:max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-100)] shrink-0">
          <div>
            <p className="font-semibold text-black">Edit Weather Thresholds</p>
            <p className="text-[12px] text-black">{commodity} · {variety || "Standard"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-black transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4 min-h-0 [scrollbar-width:thin]">
          {error && <p className="text-[12px] text-red-600">{error}</p>}
          <p className="text-[12px] text-black leading-relaxed">
            One rule per weather metric stored in <span className="font-mono text-black font-semibold">crop_weather_rules</span>.
            These rules drive the Weather Risk and crop suitability classifications.
          </p>

          {!rules && !error && <p className="text-[13px] text-black">Loading weather rules…</p>}
          {rules && rules.length === 0 && (
            <p className="text-[13px] text-black">
              No weather rules configured for this commodity and variety. Add one below.
            </p>
          )}

          {rules && (
            <div className="space-y-3">
              {rules.map((r, i) => (
                <div
                  key={r.id || `new-${i}`}
                  className="border border-[var(--hw-neutral-200)] rounded-xl p-3 bg-white hover:border-[var(--hw-neutral-300)] transition-colors space-y-2.5 shadow-[var(--shadow-xs)]"
                >
                  {/* Line 1: Weather Metric & Risk Level & Delete */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[11px] font-medium text-black mb-1">
                        Weather Metric
                      </label>
                      <select
                        value={r.metric_key}
                        onChange={(e) => {
                          const metric = allMetricOptions.find((m) => m.key === e.target.value);
                          updateRule(i, { metric_key: e.target.value, unit: metric?.unit || r.unit });
                        }}
                        className="w-full px-2.5 py-1.5 text-[12px] font-medium text-black bg-white border border-[var(--hw-neutral-200)] rounded-lg outline-none focus:border-[var(--hw-green-600)] transition cursor-pointer"
                      >
                        {allMetricOptions.map((m) => (
                          <option key={m.key} value={m.key} className="text-black">
                            {m.label} {m.unit ? `(${m.unit})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end gap-2 shrink-0">
                      <div className="w-32 sm:w-36">
                        <label className="block text-[11px] font-medium text-black mb-1">
                          Risk Level
                        </label>
                        <select
                          value={r.risk_level}
                          onChange={(e) => updateRule(i, { risk_level: e.target.value })}
                          className={`w-full px-2.5 py-1.5 text-[12px] font-semibold capitalize bg-white border border-[var(--hw-neutral-200)] rounded-lg outline-none focus:border-[var(--hw-green-600)] transition cursor-pointer ${
                            r.risk_level?.toLowerCase() === "suitable"
                              ? "text-emerald-700"
                              : r.risk_level?.toLowerCase() === "caution"
                              ? "text-amber-600"
                              : r.risk_level?.toLowerCase() === "severe"
                              ? "text-red-600"
                              : "text-black"
                          }`}
                        >
                          {WEATHER_RISK_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl} className="text-black">
                              {lvl}
                            </option>
                          ))}
                        </select>
                      </div>

                      {!r.id && (
                        <button
                          onClick={() => removeRule(i)}
                          className="p-1.5 mb-0.5 rounded-lg text-black hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                          title="Remove rule"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Line 2: Operator / Condition and Threshold Values */}
                  <div className="grid grid-cols-12 gap-2 items-center bg-[var(--hw-neutral-50)] p-2.5 rounded-lg border border-[var(--hw-neutral-100)] text-[12px]">
                    <div className="col-span-4 sm:col-span-3">
                      <label className="block text-[10px] font-medium text-black mb-0.5">
                        Condition
                      </label>
                      <select
                        value={r.operator}
                        onChange={(e) => updateRule(i, { operator: e.target.value })}
                        className="w-full px-2 py-1.5 text-[12px] text-black bg-white border border-[var(--hw-neutral-200)] rounded-lg outline-none focus:border-[var(--hw-green-600)] transition cursor-pointer"
                      >
                        {WEATHER_OPERATORS.map((op) => (
                          <option key={op} value={op} className="text-black">
                            {op === "between"
                              ? "Between"
                              : op === ">"
                              ? "Greater than (>)"
                              : op === "<"
                              ? "Less than (<)"
                              : op === ">="
                              ? "At least (≥)"
                              : op === "<="
                              ? "At most (≤)"
                              : op}
                          </option>
                        ))}
                      </select>
                    </div>

                    {r.operator === "between" ? (
                      <>
                        <div className="col-span-4 sm:col-span-4">
                          <label className="block text-[10px] font-medium text-black mb-0.5">
                            Min Value {r.unit ? `(${r.unit})` : ""}
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Min"
                            value={r.threshold_min}
                            onChange={(e) => updateRule(i, { threshold_min: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-[12px] text-black bg-white border border-[var(--hw-neutral-200)] rounded-lg outline-none focus:border-[var(--hw-green-600)] transition"
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-5">
                          <label className="block text-[10px] font-medium text-black mb-0.5">
                            Max Value {r.unit ? `(${r.unit})` : ""}
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Max"
                            value={r.threshold_max}
                            onChange={(e) => updateRule(i, { threshold_max: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-[12px] text-black bg-white border border-[var(--hw-neutral-200)] rounded-lg outline-none focus:border-[var(--hw-green-600)] transition"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="col-span-8 sm:col-span-9">
                        <label className="block text-[10px] font-medium text-black mb-0.5">
                          Threshold Value {r.unit ? `(${r.unit})` : ""}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder={`Value ${r.unit ? `in ${r.unit}` : ""}`}
                          value={r.threshold_min !== "" ? r.threshold_min : r.threshold_max}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (r.operator.includes(">")) {
                              updateRule(i, { threshold_min: val, threshold_max: "" });
                            } else {
                              updateRule(i, { threshold_min: "", threshold_max: val });
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-[12px] text-black bg-white border border-[var(--hw-neutral-200)] rounded-lg outline-none focus:border-[var(--hw-green-600)] transition"
                        />
                      </div>
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

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 sm:py-4 border-t border-[var(--hw-neutral-100)] shrink-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium border border-[var(--hw-neutral-200)] text-black rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors disabled:opacity-50 disabled:text-neutral-400">
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
      <div className="px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl text-black min-w-[148px]">
        No analytics commodities available.
      </div>
    );
  }

  const selectedName = typeof value === "object" ? value?.name : value;

  return (
    <div ref={ref} className="relative w-full sm:w-auto">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl hover:border-[var(--hw-neutral-300)] transition-colors cursor-pointer sm:min-w-[148px]"
      >
        <span className="flex-1 text-left text-black truncate">
          {selectedName || placeholder}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-black flex-shrink-0" />
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
                  ${isSelected ? "bg-[var(--hw-green-50)] text-[var(--hw-green-700)] font-medium" : "text-black"}`}
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

// Commodity + variety scope control. Both tabs drive the same `scopedCommodity`
// / `scopedVariety` state, so this renders on each of them rather than being
// duplicated inline -- the threshold cards read that scope, and without a
// control on the Weights & Thresholds tab the card had no way to change
// commodity and silently kept whatever the other tab had selected.
const ScopeSelector = ({
  commodity,
  variety,
  commodities = [],
  variants = [],
  selectCls = "",
  onCommodityChange,
  onVarietyChange
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)]">
    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
      {commodity && (
        <CommodityIllustration
          commodityId={getCommodityIconKey(null, null, commodity)}
          className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0"
        />
      )}
      <span className="text-[15px] sm:text-[17px] font-bold text-black truncate">
        {commodity ? `${commodity} · ${variety || "Standard"}` : "Select a commodity and variety"}
      </span>
    </div>
    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
      <div className="flex flex-col gap-0.5 min-w-0">
        <label className="text-[11px] text-black font-medium px-1">Commodity</label>
        <TextOnlyCommodityDropdown
          value={commodity}
          options={commodities}
          onChange={onCommodityChange}
          placeholder="Select Commodity"
        />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <label className="text-[11px] text-black font-medium px-1">Variety</label>
        <select
          value={variety}
          onChange={(e) => onVarietyChange(e.target.value)}
          disabled={!commodity || variants.length === 0}
          className={`${selectCls} w-full sm:min-w-[140px] text-black disabled:opacity-60 disabled:cursor-not-allowed disabled:text-neutral-400`}
        >
          {variants.length === 0 ? (
            <option value="Standard">Standard</option>
          ) : (
            variants.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  </div>
);

function AdminAnalytics() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightParam = searchParams.get("highlight");
  const [tab, setTabState] = useState(() => {
    const t = searchParams.get("tab");
    if (t === "weights") return "weights";
    if (t === "outputs") return "outputs";
    const hl = (searchParams.get("highlight") || "").toLowerCase();
    if (
      hl.includes("weight") ||
      hl.includes("threshold") ||
      hl.includes("q1") ||
      hl.includes("q2") ||
      hl.includes("q3") ||
      hl.includes("ratio")
    ) {
      return "weights";
    }
    return "outputs";
  });
  const setTab = (id) => {
    setTabState(id);
    if (id === "weights") {
      setSearchParams({ tab: "weights" }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

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
  const [profitabilityRules, setProfitabilityRules] = useState(() => {
    try {
      const saved = localStorage.getItem("hw_profitability_thresholds");
      if (saved) {
        const parsed = JSON.parse(saved);
        const favVal = parsed.favPct ?? (parsed.favMultiplier ? Math.round(parsed.favMultiplier <= 10 ? parsed.favMultiplier * 100 : parsed.favMultiplier) : 110);
        const unfavVal = parsed.unfavPct ?? (parsed.unfavMultiplier ? Math.round(parsed.unfavMultiplier <= 10 ? parsed.unfavMultiplier * 100 : parsed.unfavMultiplier) : 100);
        return {
          favPct: favVal,
          unfavPct: unfavVal,
          favMultiplier: favVal / 100,
          unfavMultiplier: unfavVal / 100
        };
      }
    } catch {}
    return {
      favPct: 110,
      unfavPct: 100,
      favMultiplier: 1.10,
      unfavMultiplier: 1.00
    };
  });
  const [weightsLoading, setWeightsLoading] = useState(false);
  const [weightsError, setWeightsError] = useState("");
  const [weightIds, setWeightIds] = useState({});
  const [thresholdsLoading, setThresholdsLoading] = useState(false);
  const [thresholdsError, setThresholdsError] = useState("");
  const [priceOutlookRuleIds, setPriceOutlookRuleIds] = useState({ fav: null, unfav: null });
  const [profitabilityRuleIds, setProfitabilityRuleIds] = useState({ fav: null, unfav: null });

  // Module outputs state (computed + persisted via /admin/analytics/outputs)
  const [moduleOutputs, setModuleOutputs] = useState(null);
  const [commodityId, setCommodityId] = useState("");
  const [processedResults, setProcessedResults] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");

  const [highlightedCard, setHighlightedCard] = useState(highlightParam);

  // 3-second temporary highlight timer (matching DFTC highlight pattern)
  useEffect(() => {
    if (!highlightParam) return;
    setHighlightedCard(highlightParam);
    const timer = setTimeout(() => {
      setHighlightedCard(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [highlightParam]);

  const isCardHighlighted = useCallback((key) => {
    if (!highlightedCard) return false;
    const hl = highlightedCard.toLowerCase();
    if (key === "price" && (hl.includes("price") || hl.includes("forecast"))) return true;
    if (key === "arrival" && hl.includes("arrival")) return true;
    if (key === "production" && (hl.includes("production") || hl.includes("seasonal"))) return true;
    if (key === "weather" && hl.includes("weather")) return true;
    if (key === "profitability" && hl.includes("profit")) return true;
    if (key === "advisory" && hl.includes("advisory")) return true;
    return hl.includes(key);
  }, [highlightedCard]);

  // Smooth scroll to highlighted card (works for both Module Outputs and Weights & Thresholds)
  useEffect(() => {
    if (!highlightedCard) return;
    const t = setTimeout(() => {
      const hl = highlightedCard.toLowerCase();
      const el =
        document.getElementById(`threshold-${hl}`) ||
        document.getElementById(`threshold-${hl.replace(/_/g, "-")}`) ||
        (hl.includes("arrival") ? document.getElementById("threshold-arrival-pressure") : null) ||
        (hl.includes("price") ? document.getElementById("threshold-price-outlook") : null) ||
        (hl.includes("weather") ? document.getElementById("threshold-weather-risk") : null) ||
        (hl.includes("production") || hl.includes("seasonal") ? document.getElementById("threshold-seasonal-production") : null) ||
        (hl.includes("profit") ? document.getElementById("threshold-profitability") : null) ||
        (hl.includes("advisory") ? document.getElementById("threshold-final-advisory") : null) ||
        (hl.includes("weight") ? document.querySelector('[id^="weight-phase-"]') : null) ||
        document.querySelector(`[data-threshold-card*="${hl}"]`) ||
        document.getElementById(`module-card-${hl}`) ||
        document.querySelector(`[data-module-card*="${hl}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [highlightedCard, analyticsLoading, tab]);

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
                // Varieties come from the same DB rows that produced this
                // list, under the same is_top10/is_active filter. Reading them
                // here rather than from a hardcoded table is what keeps the
                // variety list from offering a scope the commodity list would
                // never produce (Lettuce/Romaine is is_top10=false).
                varieties: Array.isArray(c.varieties) ? c.varieties : [],
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

  // Load Price Outlook & Profitability threshold rules from the admin thresholds API
  const refreshPriceOutlook = useCallback(async () => {
    try {
      setThresholdsError("");
      const data = await analyticsApi.listThresholds();
      const items = data?.items || [];
      const poModule = items.find((m) => m.module_name === PRICE_OUTLOOK_MODULE);
      if (poModule) {
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
      }

      const profModule = items.find((m) => m.module_name?.toLowerCase().includes("profit"));
      if (profModule) {
        const rules =
          profModule.rules && profModule.rules.length > 0
            ? profModule.rules
            : (await analyticsApi.listThresholdRules(profModule.id))?.items || [];
        const fav = rules.find((r) => (r.classification || "").toLowerCase() === "favorable");
        const unfav = rules.find((r) => (r.classification || "").toLowerCase() === "unfavorable");
        if (fav || unfav) {
          const rawFav = fav?.threshold_value != null ? Number(fav.threshold_value) : 110;
          const rawUnfav = unfav?.threshold_value != null ? Number(unfav.threshold_value) : 100;
          const favVal = rawFav <= 10 ? Math.round(rawFav * 100) : Math.round(rawFav);
          const unfavVal = rawUnfav <= 10 ? Math.round(rawUnfav * 100) : Math.round(rawUnfav);
          const loaded = {
            favPct: favVal,
            unfavPct: unfavVal,
            favMultiplier: favVal / 100,
            unfavMultiplier: unfavVal / 100
          };
          setProfitabilityRules(loaded);
          try {
            localStorage.setItem("hw_profitability_thresholds", JSON.stringify(loaded));
          } catch {}
          setProfitabilityRuleIds({ fav, unfav, moduleId: profModule.id });
        }
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

  // Scoped varieties — read from the fetched commodity row, not from the
  // hardcoded commodities table, so the variety dropdown can only ever offer a
  // scope the commodity dropdown also offers.
  const scopedVariants = useMemo(() => {
    if (!scopedCommodity) return [];
    return commodities.find((commodity) => commodity.name === scopedCommodity)?.varieties || [];
  }, [scopedCommodity, commodities]);

  // Wait for the commodity list before defaulting the variety. Setting
  // "Standard" while the list was still in flight made the scope briefly
  // ("Kalabasa" + "Standard") look complete, so `reloadAnalytics` computed and
  // persisted a second set of module outputs for a variety nobody selected.
  useEffect(() => {
    if (loadingCommodities) return;
    if (scopedVariants.length > 0) {
      setScopedVariety(scopedVariants[0]);
    } else {
      setScopedVariety("Standard");
    }
  }, [scopedCommodity, scopedVariants, loadingCommodities]);

  // Load the persisted module-output history.
  //
  // Refreshes whenever the commodity or variety scope changes, so the table
  // always reflects the commodity currently selected in Module Outputs. It also
  // runs on mount, before any scope exists, so the table is populated on open
  // rather than waiting for a commodity to be picked.
  const loadProcessedResults = useCallback(async () => {
    try {
      const data = await analyticsApi.listModuleOutputs({ page_size: 100 });
      const rows = (data?.items || []).flatMap((r) =>
        MODULE_ROW_FIELDS.map(({ key, module, field }) => ({
          id: r.id,
          basisId: key,
          module,
          commodity: r.commodity_name,
          // `variant`, not `variety` — the row shape uses `variant` and the
          // filter below reads it. Reading `variety` here left it undefined,
          // which made every non-Standard variety match nothing.
          variant: r.variety || "Standard",
          classification: r[field] || "Not available",
          inputPeriod: r.reference_month,
          processedAt: r.generated_at
        }))
      );
      setProcessedResults(rows);
    } catch {
      setProcessedResults([]);
    }
  }, []);

  // Mount only. Once a scope exists, `reloadAnalytics` owns the refresh: it
  // awaits the compute before reloading, so the table never shows pre-compute
  // rows. Listing the scope here as well raced that and fetched the same
  // unfiltered page twice on every scope change.
  useEffect(() => {
    loadProcessedResults();
  }, [loadProcessedResults]);

  // A module or classification chosen for the previous commodity can mask the
  // new one entirely, leaving an empty table that looks like missing records.
  // Reset both whenever the scope changes so the table starts from "All".
  useEffect(() => {
    setFModule("All");
    setFClassification("All");
  }, [scopedCommodity, scopedVariety]);

  // Compute + persist module outputs for the scoped commodity/variety.
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
    } finally {
      setAnalyticsLoading(false);
    }

    // A compute rewrites rows, so refresh the history it feeds.
    await loadProcessedResults();
  }, [scopedCommodity, scopedVariety, loadProcessedResults]);

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

  const scopedCommodityRecord = useMemo(
    () => commodities.find((commodity) => commodity.name === scopedCommodity) || null,
    [commodities, scopedCommodity]
  );

  // Historical seasonal production used in the Weights & Thresholds tab.
  const { data: productionSummary, loading: productionLoading, error: productionError } = useHistoricalSeasonalProduction(
    !!scopedCommodityRecord?.id,
    scopedCommodityRecord?.id
  );

  // Live arrival volume behind the Arrival Pressure card. The backend withholds
  // the classification and quartiles below four records rather than publishing a
  // zero-padded reading, so this card can legitimately show "—" for the
  // thresholds while still reporting the volumes it does have.
  const { data: arrivalSummary, loading: arrivalLoading, error: arrivalError } = useArrivalPressure(
    !!scopedCommodityRecord?.id,
    scopedCommodityRecord?.id
  );

  const arrivalQuartiles = arrivalSummary?.quartile_thresholds || null;
  const arrivalClassification = arrivalSummary?.classification || null;
  const arrivalSeries = useMemo(
    () => bucketArrivals(arrivalSummary?.records || [], { granularity: "monthly" }),
    [arrivalSummary]
  );
  const arrivalTotals = useMemo(() => arrivalSeriesTotals(arrivalSeries), [arrivalSeries]);
  const arrivalCurrentKg = useMemo(() => {
    const bucket = latestArrivalBucket(arrivalSeries);
    return bucket ? bucket.total_kg : null;
  }, [arrivalSeries]);
  const arrivalBoundary = useMemo(() => arrivalBoundaryRows(arrivalQuartiles), [arrivalQuartiles]);
  const arrivalBasisParams = useMemo(() => {
    const params = new URLSearchParams();
    if (scopedCommodity) params.set("commodity", scopedCommodity);
    if (scopedVariety) params.set("variety", scopedVariety);
    return params.toString();
  }, [scopedCommodity, scopedVariety]);

  useEffect(() => {
    if (!showTooltip) return;
    const h = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) setShowTooltip(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showTooltip]);

  const selectCls = "px-3 py-2 text-[13px] text-black bg-white border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] transition cursor-pointer";

  // Filter processed results using the top scope (scopedCommodity + scopedVariety) + module & classification
  const filteredResults = processedResults.filter((r) => {
    const matchComm = !scopedCommodity || r.commodity === scopedCommodity;
    // Rows carry `variant`; "Standard" in the selector means the commodity's
    // plain (null-variety) row. Comparing against `r.variety` here silently
    // matched nothing for every named variety.
    const rowVariant = r.variant === "Standard" ? "" : r.variant || "";
    const matchVar =
      !scopedVariety || rowVariant === (scopedVariety === "Standard" ? "" : scopedVariety);
    const matchMod = fModule === "All" || r.module === fModule;
    const matchClass = fClassification === "All" || r.classification === fClassification;
    return matchComm && matchVar && matchMod && matchClass;
  });

  const visibleResults = showAll ? filteredResults : filteredResults.slice(0, DEFAULT_ROWS);

  // True when rows exist for the scope but the module/classification filters are
  // hiding them. Distinguishes "no records" from "filtered everything away".
  const scopeHasFiltered = processedResults.some((r) => {
    const matchComm = !scopedCommodity || r.commodity === scopedCommodity;
    const rowVariant = r.variant === "Standard" ? "" : r.variant || "";
    const matchVar =
      !scopedVariety || rowVariant === (scopedVariety === "Standard" ? "" : scopedVariety);
    return matchComm && matchVar;
  });

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
      ...(moduleOutputs?.historical_seasonal_production_level
        ? moduleOutputsByCard["historical-production"]
        : {
          classification: productionLoading
            ? "Loading..."
            : productionSummary?.status === "processed"
              ? (productionSummary.peak_quarter && productionSummary.lean_quarter
                ? `Peak: ${productionSummary.peak_quarter} · Lean: ${productionSummary.lean_quarter}`
                : (productionSummary.classification || "Processed"))
              : "Not processed",
          source: productionSummary?.source || "-",
          processed: productionSummary?.processed_at
            ? new Date(productionSummary.processed_at).toLocaleString()
            : "-"
        })
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
      return null;
    } catch (err) {
      const message = err.message || "Failed to save weights.";
      setWeightsError(message);
      // Returned so the modal can refuse to claim success. Without this the
      // modal closed showing "Saved!" even when the write was rejected.
      return message;
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
      return null;
    } catch (err) {
      const message = err.message || "Failed to save threshold rules.";
      setThresholdsError(message);
      return message;
    }
  };

  const [editingProfitability, setEditingProfitability] = useState(false);

  const handleProfitabilitySave = async (updated) => {
    try {
      setThresholdsError("");
      const rawFav = Number(updated.favPct ?? updated.favMultiplier);
      const rawUnfav = Number(updated.unfavPct ?? updated.unfavMultiplier);
      const favPct = rawFav <= 10 ? Math.round(rawFav * 100) : Math.round(rawFav);
      const unfavPct = rawUnfav <= 10 ? Math.round(rawUnfav * 100) : Math.round(rawUnfav);
      const favMultiplier = favPct / 100;
      const unfavMultiplier = unfavPct / 100;

      let data = await analyticsApi.listThresholds();
      let profModule = (data?.items || []).find((m) =>
        m.module_name?.toLowerCase().includes("profit")
      );
      if (!profModule) {
        profModule = await analyticsApi.createThreshold({
          module_name: PROFITABILITY_MODULE,
          source_label: "Farmer crop-plan assessment"
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
            profModule.rules && profModule.rules.length > 0
              ? profModule.rules
              : (await analyticsApi.listThresholdRules(profModule.id))?.items || [];
          const existing = rules.find((r) => (r.classification || "").toLowerCase() === classification.toLowerCase());
          if (existing) {
            await analyticsApi.updateThresholdRule(existing.id, {
              threshold_value: value,
              display_text: display
            });
          } else {
            await analyticsApi.createThresholdRule(profModule.id, {
              rule_key: classification.toLowerCase(),
              classification,
              operator,
              threshold_value: value,
              display_text: display
            });
          }
        }
      };

      const { fav, unfav } = profitabilityRuleIds;
      await ensureRule(
        fav,
        "Favorable",
        ">=",
        favPct,
        `Lower Forecast ≥ ${favPct}% of Break-even Price`
      );
      await ensureRule(
        unfav,
        "Unfavorable",
        "<",
        unfavPct,
        unfavPct === 100
          ? "Upper Forecast < Break-even Price"
          : `Upper Forecast < ${unfavPct}% of Break-even Price`
      );

      const stateVal = {
        favPct,
        unfavPct,
        favMultiplier,
        unfavMultiplier
      };
      try {
        localStorage.setItem("hw_profitability_thresholds", JSON.stringify(stateVal));
      } catch {}
      setProfitabilityRules(stateVal);
      await refreshPriceOutlook();
      return null;
    } catch (err) {
      // In case of API network failure, persist locally
      const rawFav = Number(updated.favPct ?? updated.favMultiplier);
      const rawUnfav = Number(updated.unfavPct ?? updated.unfavMultiplier);
      const favPct = rawFav <= 10 ? Math.round(rawFav * 100) : Math.round(rawFav);
      const unfavPct = rawUnfav <= 10 ? Math.round(rawUnfav * 100) : Math.round(rawUnfav);
      const fallback = {
        favPct,
        unfavPct,
        favMultiplier: favPct / 100,
        unfavMultiplier: unfavPct / 100
      };
      try {
        localStorage.setItem("hw_profitability_thresholds", JSON.stringify(fallback));
      } catch {}
      setProfitabilityRules(fallback);
      return null;
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
      {editingProfitability && (
        <EditProfitabilityModal
          currentRules={profitabilityRules}
          onClose={() => setEditingProfitability(false)}
          onSave={handleProfitabilitySave}
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

      <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-4 sm:space-y-6">
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
                className={`px-5 py-3 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id
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
            <ScopeSelector
              commodity={scopedCommodity}
              variety={scopedVariety}
              commodities={commodities}
              variants={scopedVariants}
              selectCls={selectCls}
              onCommodityChange={setScopedCommodity}
              onVarietyChange={setScopedVariety}
            />

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
                  const modSlug = card.module.toLowerCase().replace(/[^a-z0-9]/g, "-");
                  const hl = (highlightedCard || "").toLowerCase();
                  const isHighlighted = Boolean(
                    hl &&
                    (card.module.toLowerCase().includes(hl) ||
                     hl.includes(modSlug) ||
                     (hl.includes("forecast") && card.module === "Price Outlook") ||
                     (hl.includes("price") && card.module === "Price Outlook") ||
                     (hl.includes("arrival") && card.module === "Arrival Pressure") ||
                     (hl.includes("weather") && card.module === "Weather Risk") ||
                     (hl.includes("production") && card.module === "Historical Seasonal Production Level"))
                  );

                  return (
                    <div
                      key={card.module}
                      id={`module-card-${modSlug}`}
                      data-module-card={`${modSlug} ${card.module.toLowerCase()}`}
                      onClick={() => handleCardClick(card)}
                      className={`rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3 hover:border-[var(--hw-neutral-300)] transition-colors duration-500 cursor-pointer ${
                        isHighlighted
                          ? "bg-emerald-50/70 font-medium"
                          : "bg-white hover:bg-[var(--hw-neutral-50)]"
                      }`}
                    >
                      <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] leading-snug">{card.module}</p>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[12px] text-[var(--hw-neutral-700)]">Classification</span>
                          <span className={`text-[12px] font-semibold ${cc}`}>{card.classification}</span>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[12px] text-[var(--hw-neutral-700)] shrink-0">Source</span>
                          <span className="text-[12px] text-[var(--hw-neutral-800)] text-right leading-tight">
                            {card.source}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] text-[var(--hw-neutral-700)]">Reliability</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${RELIABILITY_TONES[card.reliability] ?? "text-[var(--hw-neutral-500)] bg-[var(--hw-neutral-100)]"}`}>
                            {card.reliability}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {(moduleOutputs?.warnings?.length || 0) > 0 && (
                <div className="mt-3 flex flex-col gap-1">
                  <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Data reliability warnings
                  </p>
                  <ul className="space-y-0.5 pl-5">
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
              {/* Heading */}
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Processed Results</h2>
              </div>

              {/* Filters (Module & Classification in the same row) */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3">
                {/* Module Filter */}
                <select
                  value={fModule}
                  onChange={(e) => {
                    setFModule(e.target.value);
                    setShowAll(false);
                  }}
                  className={`${selectCls} w-full sm:w-auto`}
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
                  className={`${selectCls} w-full sm:w-auto`}
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
                    className="col-span-2 sm:col-span-1 text-[12px] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] transition-colors underline whitespace-nowrap cursor-pointer px-1"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
                <div className="overflow-x-auto [scrollbar-width:thin] touch-pan-x">
                  <table className="w-full text-[12px]">
                    <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                      <tr>
                        {["Module", "Input Period", "Classification", "Processed Date"].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold text-[var(--hw-neutral-600)] whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                      {filteredResults.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-[var(--hw-neutral-500)] text-[13px]">
                            {scopeHasFiltered ? (
                              "No processed results match the selected module and classification."
                            ) : scopedCommodity ? (
                              <>
                                No processed results for{" "}
                                <span className="font-medium text-[var(--hw-neutral-800)]">
                                  {scopedCommodity}
                                  {scopedVariety && scopedVariety !== "Standard"
                                    ? ` · ${scopedVariety}`
                                    : ""}
                                </span>
                                . Run the module outputs for this commodity to create them.
                              </>
                            ) : (
                              "No processed results yet. Run the module outputs for a commodity to create them."
                            )}
                          </td>
                        </tr>
                      ) : (
                        visibleResults.map((r) => {
                          const cc = CLASSIFICATION_COLORS[r.classification] ?? "text-[var(--hw-neutral-700)]";
                          return (
                            <tr
                              key={`${r.id}::${r.basisId}`}
                              data-commodity={r.commodity}
                              data-variety={r.variant}
                              onClick={() => handleRowClick(r)}
                              className="hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
                            >
                              <td className="px-3 py-2.5 font-medium text-[var(--hw-neutral-900)] whitespace-nowrap">
                                {r.module}
                                <span className="sr-only"> ({r.commodity || "-"} · {r.variant || "Standard"})</span>
                              </td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-800)] whitespace-nowrap">
                                {formatDisplayDate(r.inputPeriod)}
                              </td>
                              <td className={`px-3 py-2.5 font-semibold ${cc}`}>{r.classification || "Not available"}</td>
                              <td className="px-3 py-2.5 text-[var(--hw-neutral-800)] whitespace-nowrap">
                                {formatDisplayDateTime(r.processedAt)}
                              </td>
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
            {/* The threshold cards below read this scope, so the control has to
                be reachable from this tab too. */}
            <ScopeSelector
              commodity={scopedCommodity}
              variety={scopedVariety}
              commodities={commodities}
              variants={scopedVariants}
              selectCls={selectCls}
              onCommodityChange={setScopedCommodity}
              onVarietyChange={setScopedVariety}
            />

            {/* Section 1: Adaptive Weights */}
            <section className="space-y-4">
              <div>
                <h2 className="text-[16px] font-bold text-black">Adaptive Weights</h2>
                <p className="text-[12px] text-black mt-0.5 leading-relaxed">
                  Set module weight distribution per crop stage. Defaults are used when no override is set. Stage weights must total 100%.
                </p>
              </div>

              {weightsLoading && (
                <p className="text-[12px] text-black">Loading adaptive weights…</p>
              )}
              {weightsError && (
                <p className="text-[12px] text-red-600">{weightsError}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {WEIGHT_PHASES.map(({ key: phase, label }) => {
                  const weights = phaseWeights[phase];
                  const hasWeights = weights && Object.keys(weights).length > 0;
                  const defaultWeights = DEFAULT_STAGE_WEIGHTS[phase] || {};
                  const effectiveWeights = hasWeights ? weights : defaultWeights;
                  const total = Object.values(effectiveWeights).reduce((a, b) => a + (Number(b) || 0), 0);

                  const isPhaseHighlighted = Boolean(
                    highlightedCard &&
                    (highlightedCard.toLowerCase().includes(phase.toLowerCase()) ||
                     (highlightedCard.toLowerCase().includes("weight") && phase === "planning"))
                  );

                  return (
                    <div
                      key={phase}
                      id={`weight-phase-${phase.toLowerCase()}`}
                      data-threshold-card={`weights ${phase.toLowerCase()}`}
                      className={`rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-5 flex flex-col justify-between transition-colors duration-500 ${
                        isPhaseHighlighted ? "bg-emerald-50/70" : "bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--hw-neutral-100)]">
                          <div>
                            <h3 className="text-[15px] font-bold text-black">{label}</h3>
                            <p className="text-[11px] text-black">Base weight override for this stage</p>
                          </div>
                          <button
                            onClick={() => setEditingPhase(phase)}
                            className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-black hover:bg-[var(--hw-neutral-50)] hover:text-black transition-colors cursor-pointer"
                            title={`Edit ${label} Weights`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-2">
                          {WEIGHT_MODULES.map((m) => (
                            <div key={m} className="flex items-center justify-between text-[12px]">
                              <span className="text-black truncate pr-2">{m}</span>
                              <span className="font-semibold text-black shrink-0">
                                {effectiveWeights[m] !== undefined ? `${effectiveWeights[m]}%` : "-"}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 pt-3 border-t border-dashed border-[var(--hw-neutral-200)]">
                          <p className="text-[11px] font-medium text-black">
                            {!hasWeights ? "No override set — using built-in presets." : "Custom override active."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-[var(--hw-neutral-100)] flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-black">Total</span>
                        <span className={`text-[13px] font-bold ${Math.abs(total - 100) < 0.01 ? "text-emerald-700" : "text-amber-600"}`}>
                          {total}%
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
                <h2 className="text-[16px] font-bold text-black">Threshold Rules</h2>
                <p className="text-[12px] text-black mt-0.5">
                  Threshold configurations and classification boundaries used by each analytical module.
                </p>
              </div>

              {thresholdsLoading && (
                <p className="text-[12px] text-black">Loading threshold rules…</p>
              )}
              {thresholdsError && (
                <p className="text-[12px] text-red-600">{thresholdsError}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Price Outlook (Global Admin Configured) */}
                <div
                  id="threshold-price-outlook"
                  data-threshold-card="price price-outlook"
                  className={`rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-5 flex flex-col justify-between transition-colors duration-500 ${
                    isCardHighlighted("price") ? "bg-emerald-50/70" : "bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b border-[var(--hw-neutral-100)]">
                      <div>
                        <h3 className="text-[15px] font-bold text-black">Price Outlook</h3>
                        <p className="text-[11px] text-black mt-0.5">Source: Forecasting output (Bangkerohan Retail Prices)</p>
                      </div>
                      <button
                        onClick={() => setEditingPriceOutlook(true)}
                        className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-black hover:bg-[var(--hw-neutral-50)] hover:text-black transition-colors shrink-0 cursor-pointer"
                        title="Edit Price Outlook Thresholds"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {!priceOutlookRules ? (
                      <div className="py-6 text-center text-black text-[12px]">
                        Price Outlook thresholds not configured.
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--hw-neutral-100)] text-[12px]">
                        <div className="py-2 flex items-center justify-between gap-3">
                          <span className="font-semibold text-emerald-700">Favorable</span>
                          <span className="text-black">Forecast price change &gt; +{priceOutlookRules.favMin}%</span>
                        </div>
                        <div className="py-2 flex items-center justify-between gap-3">
                          <span className="font-semibold text-black">Neutral</span>
                          <span className="text-black">{priceOutlookRules.unfavMax}% to +{priceOutlookRules.favMin}%</span>
                        </div>
                        <div className="py-2 flex items-center justify-between gap-3">
                          <span className="font-semibold text-red-600">Unfavorable</span>
                          <span className="text-black">Forecast price change &lt; {priceOutlookRules.unfavMax}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Weather Risk (Configured per Commodity + Variety) */}
                <div
                  id="threshold-weather-risk"
                  data-threshold-card="weather weather-risk"
                  className={`rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-5 flex flex-col justify-between transition-colors duration-500 ${
                    isCardHighlighted("weather") ? "bg-emerald-50/70" : "bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b border-[var(--hw-neutral-100)]">
                      <div>
                        <h3 className="text-[15px] font-bold text-black">Weather Risk</h3>
                        <p className="text-[11px] text-black mt-0.5">
                          Scope: {scopedCommodity ? `${scopedCommodity} — ${scopedVariety || "Standard"}` : "Select a commodity and variety"}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingWeather(true)}
                        disabled={!scopedCommodity}
                        className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-black hover:bg-[var(--hw-neutral-50)] hover:text-black transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:text-neutral-400 cursor-pointer"
                        title="Edit Weather Thresholds"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {currentWeatherRules.length === 0 ? (
                      <div className="py-6 text-center text-black text-[12px]">
                        Weather thresholds not configured for {scopedCommodity || "crop"} — {scopedVariety || "Standard"}.
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--hw-neutral-100)] text-[12px] max-h-[160px] overflow-y-auto [scrollbar-width:thin] pr-1.5">
                        {currentWeatherRules.map((r) => {
                          const riskLower = r.risk_level?.toLowerCase();
                          const riskColor =
                            riskLower === "suitable"
                              ? "text-emerald-700"
                              : riskLower === "caution"
                              ? "text-amber-600"
                              : riskLower === "severe"
                              ? "text-red-600"
                              : "text-black";
                          return (
                            <div key={r.id || r.metric_key} className="py-2 flex flex-col gap-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-black font-medium">{weatherMetricLabel(r.metric_key)}</span>
                                <span className={`font-semibold capitalize ${riskColor}`}>{r.risk_level}</span>
                              </div>
                              <span className="text-[11px] text-black">{weatherRuleSummary(r)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Arrival Pressure (Derived per Commodity + Variety — Read-Only) */}
                <div
                  id="threshold-arrival-pressure"
                  data-threshold-card="arrival arrival-pressure arrival_pressure_q3"
                  className={`rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-5 flex flex-col justify-between transition-colors duration-500 ${
                    isCardHighlighted("arrival") ? "bg-emerald-50/70" : "bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b border-[var(--hw-neutral-100)]">
                      <div>
                        <h3 className="text-[15px] font-bold text-black">Arrival Pressure</h3>
                        <p className="text-[11px] text-black mt-0.5">
                          Source: DFTC Arrival Volume · {scopedCommodity ? `${scopedCommodity} (${scopedVariety || "Standard"})` : "No crop selected"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 bg-[var(--hw-neutral-50)] p-3 rounded-xl border border-[var(--hw-neutral-100)] text-center">
                        {[
                          { label: "Q1 Threshold", value: arrivalQuartiles?.q1 },
                          { label: "Q2 (Median)", value: arrivalQuartiles?.q2 },
                          { label: "Q3 Threshold", value: arrivalQuartiles?.q3 }
                        ].map((q) => (
                          <div key={q.label}>
                            <p className="text-[11px] text-black">{q.label}</p>
                            <p className="text-[13px] mt-0.5">
                              {q.value == null ? (
                                <span className="font-bold text-neutral-400">— kg/mo</span>
                              ) : (
                                <>
                                  <span className="font-bold text-black">
                                    {q.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                  </span>{" "}
                                  <span className="text-[11px] text-black">kg/mo</span>
                                </>
                              )}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-100)] rounded-xl px-3 py-2.5 text-center">
                          <p className="text-[11px] font-medium text-black">Current Month Volume</p>
                          <div className="mt-0.5">
                            <p className={`text-[15px] font-bold ${ARRIVAL_PRESSURE_TONES[arrivalClassification] || "text-black"}`}>
                              {arrivalCurrentKg == null
                                ? "—"
                                : `${arrivalCurrentKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`}
                            </p>
                            {arrivalClassification && (
                              <p className="text-[11px] font-medium text-black mt-0.5">
                                {arrivalClassification}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-100)] rounded-xl px-3 py-2.5 text-center">
                          <p className="text-[11px] font-medium text-black">Annual Recorded Total</p>
                          <p className="mt-0.5 text-[15px] font-bold text-black">
                            {arrivalTotals.total_kg == null ? (
                              "—"
                            ) : (
                              <>
                                {arrivalTotals.total_kg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg{" "}
                                <span className="text-[12px] font-medium text-black">
                                  ({arrivalTotals.months} mo)
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {arrivalBoundary.length > 0 ? (
                        <div className="border border-[var(--hw-neutral-200)] rounded-xl overflow-hidden">
                          <div className="grid grid-cols-[1fr_1.4fr_1.2fr] gap-2 px-3 py-2 bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)] text-[10px] font-semibold uppercase tracking-wide text-black">
                            <span>Classification</span>
                            <span>Monthly Boundary</span>
                            <span className="text-right">Supply Pressure</span>
                          </div>
                          {arrivalBoundary.map((row) => (
                            <div
                              key={row.classification}
                              className="grid grid-cols-[1fr_1.4fr_1.2fr] gap-2 px-3 py-2 border-b border-[var(--hw-neutral-100)] last:border-b-0 text-[11px]"
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    tabIndex={0}
                                    title={row.supply}
                                    className={`font-bold cursor-help ${ARRIVAL_PRESSURE_TONES[row.classification]}`}
                                  >
                                    {row.classification}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-xs bg-black text-white p-2.5 rounded-lg shadow-xl text-[12px] leading-relaxed z-50"
                                >
                                  <p>{row.supply}</p>
                                </TooltipContent>
                              </Tooltip>
                              <span className="text-black">{row.boundary}</span>
                              <span className="text-right text-black">{row.supply}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-black text-center">
                          {arrivalLoading
                            ? "Loading arrival volume…"
                            : arrivalError || "Insufficient arrival history to calculate quartiles for this variety."}
                        </p>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/modules/basis/arrival-pressure?${arrivalBasisParams}`)}
                          className="text-[13px] font-bold text-[var(--hw-green-700)] hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          View Basis
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Historical Seasonal Production Level (Derived per Commodity + Variety — Read-Only) */}
                <div
                  id="threshold-seasonal-production"
                  data-threshold-card="production seasonal seasonal-production"
                  className={`rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 flex flex-col justify-between transition-colors duration-500 ${
                    isCardHighlighted("production") ? "bg-emerald-50/70" : "bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b border-[var(--hw-neutral-100)]">
                      <div>
                        <h3 className="text-[15px] font-bold text-black">Historical Seasonal Production Level</h3>
                        <p className="text-[11px] text-black mt-0.5">
                          Source: {productionSummary?.source || "production_record"} · {scopedCommodity ? `${scopedCommodity} (${scopedVariety || "Standard"})` : "No crop selected"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 bg-[var(--hw-neutral-50)] p-3 rounded-xl border border-[var(--hw-neutral-100)] text-center">
                        <div>
                          <p className="text-[11px] text-black">Q1 Ratio</p>
                          <p className="text-[13px] font-bold text-black mt-0.5">
                            {productionSummary?.quartiles ? productionSummary.quartiles.q1.toFixed(2) : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-black">Q2 Ratio</p>
                          <p className="text-[13px] font-bold text-black mt-0.5">
                            {productionSummary?.quartiles ? productionSummary.quartiles.q2.toFixed(2) : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-black">Q3 Ratio</p>
                          <p className="text-[13px] font-bold text-black mt-0.5">
                            {productionSummary?.quartiles ? productionSummary.quartiles.q3.toFixed(2) : "-"}
                          </p>
                        </div>
                      </div>
                      {productionLoading ? (
                        <p className="text-[11px] text-black text-center">Loading production history…</p>
                      ) : productionError ? (
                        <p className="text-[11px] text-red-600 text-center">{productionError}</p>
                      ) : productionSummary?.status !== "processed" ? (
                        <p className="text-[11px] text-black text-center">
                          {productionSummary?.message || "Insufficient historical production data to calculate thresholds."}
                        </p>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-100)] rounded-xl px-3 py-2 text-center">
                              <p className="text-[10px] text-black font-medium">Peak Season</p>
                              <p className="text-[13px] font-bold text-emerald-700 mt-0.5">{productionSummary.peak_quarter || "—"}</p>
                            </div>
                            <div className="bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-100)] rounded-xl px-3 py-2 text-center">
                              <p className="text-[10px] text-black font-medium">Lean Season</p>
                              <p className="text-[13px] font-bold text-amber-600 mt-0.5">{productionSummary.lean_quarter || "—"}</p>
                            </div>
                          </div>
                          <div className="overflow-x-auto rounded-lg border border-[var(--hw-neutral-100)]">
                            <table className="w-full text-[10px] text-left">
                              <thead className="bg-[var(--hw-neutral-50)] text-black font-semibold">
                                <tr>
                                  <th className="px-2 py-1.5">Quarter</th>
                                  <th className="px-2 py-1.5 text-right">Avg MT</th>
                                  <th className="px-2 py-1.5 text-right">Ratio</th>
                                  <th className="px-2 py-1.5 text-center">Level</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(productionSummary.quarterly_profiles && productionSummary.quarterly_profiles.length > 0
                                  ? productionSummary.quarterly_profiles
                                  : (productionSummary.seasonal_totals || []).map((st) => ({
                                    quarter: st.season,
                                    average_production_mt: st.average_production_mt || 0,
                                    seasonal_ratio: 1.0,
                                    classification: "—"
                                  }))
                                ).map((qp) => (
                                  <tr key={qp.quarter} className="border-t border-[var(--hw-neutral-100)]">
                                    <td className="px-2 py-1.5 font-semibold text-black">{qp.quarter}</td>
                                    <td className="px-2 py-1.5 text-right text-black">
                                      {Number(qp.average_production_mt).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="px-2 py-1.5 text-right font-mono text-black">
                                      {Number(qp.seasonal_ratio).toFixed(2)}
                                    </td>
                                    <td className="px-2 py-1.5 text-center font-medium">
                                      <span className={`text-[11px] font-semibold ${CLASSIFICATION_COLORS[qp.classification] || "text-black"}`}>
                                        {qp.classification}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. Profitability (Global Farmer Assessment Rule) */}
                <div
                  id="threshold-profitability"
                  data-threshold-card="profit profitability"
                  className={`rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-5 flex flex-col justify-between transition-colors duration-500 ${
                    isCardHighlighted("profitability") ? "bg-emerald-50/70" : "bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b border-[var(--hw-neutral-100)]">
                      <div>
                        <h3 className="text-[15px] font-bold text-black">Profitability</h3>
                        <p className="text-[11px] text-black mt-0.5">Source: Farmer crop-plan assessment</p>
                      </div>
                      <button
                        onClick={() => setEditingProfitability(true)}
                        className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-black hover:bg-[var(--hw-neutral-50)] hover:text-black transition-colors shrink-0 cursor-pointer"
                        title="Edit Profitability Thresholds"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                      <div className="space-y-3">
                        <div className="p-3 bg-[var(--hw-neutral-50)] rounded-xl border border-[var(--hw-neutral-100)]">
                          <p className="text-[11px] text-black leading-relaxed">
                            Applied during farmer crop planning where <span className="font-semibold text-black">Break-Even = Total Cost ÷ Marketable Yield</span>. Evaluates forecasted selling price range against break-even price percentages.
                          </p>
                        </div>

                        <div className="divide-y divide-[var(--hw-neutral-100)] text-[12px]">
                          <div className="py-2 flex items-center justify-between gap-3">
                            <span className="font-semibold text-emerald-700">Favorable</span>
                            <span className="text-black text-right">
                              Lower Forecast ≥ {profitabilityRules.favPct || 110}% of Break-even Price
                            </span>
                          </div>
                          <div className="py-2 flex items-center justify-between gap-3">
                            <span className="font-semibold text-amber-600">Marginal</span>
                            <span className="text-black text-right">
                              Forecast Range overlaps Break-even Price
                            </span>
                          </div>
                          <div className="py-2 flex items-center justify-between gap-3">
                            <span className="font-semibold text-red-600">Unfavorable</span>
                            <span className="text-black text-right">
                              {(profitabilityRules.unfavPct || 100) === 100
                                ? "Upper Forecast < Break-even Price"
                                : `Upper Forecast < ${profitabilityRules.unfavPct}% of Break-even Price`}
                            </span>
                          </div>
                        </div>
                      </div>
                  </div>
                </div>

                {/* 6. Final Advisory Cutoffs (Global Rule) */}
                <div
                  id="threshold-final-advisory"
                  data-threshold-card="advisory final-advisory"
                  className={`rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 sm:p-5 flex flex-col justify-between transition-colors duration-500 ${
                    isCardHighlighted("advisory") ? "bg-emerald-50/70" : "bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b border-[var(--hw-neutral-100)]">
                      <div>
                        <h3 className="text-[15px] font-bold text-black">Final Advisory Cutoffs</h3>
                        <p className="text-[11px] text-black mt-0.5">Recommendation Engine output mapping</p>
                      </div>
                    </div>

                    <div className="divide-y divide-[var(--hw-neutral-100)] text-[12px]">
                      <div className="py-2.5 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-700">Recommended</span>
                          <span className="font-mono text-neutral-400 font-medium">-</span>
                        </div>
                        <p className="text-[11px] text-black">Most factors support planting.</p>
                      </div>
                      <div className="py-2.5 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-amber-700">Proceed with Caution</span>
                          <span className="font-mono text-neutral-400 font-medium">-</span>
                        </div>
                        <p className="text-[11px] text-black">Some factors add caution.</p>
                      </div>
                      <div className="py-2.5 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-red-700">Avoid for Now</span>
                          <span className="font-mono text-neutral-400 font-medium">-</span>
                        </div>
                        <p className="text-[11px] text-black">Multiple unfavorable factors.</p>
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

export { AdminAnalytics as default, EditPriceOutlookModal, EditWeightModal };
