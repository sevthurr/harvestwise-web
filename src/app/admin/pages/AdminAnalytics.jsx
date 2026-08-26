import { PageHeader } from "../../global/components/shared/PageHeader";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, Edit2, Info, X } from "lucide-react";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import {
  RESULTS,
  MODULE_SUMMARY_CARDS,
  MODULE_RULES,
  FINAL_ADVISORY_CUTOFFS,
  COMMODITIES,
  MODULES,
  CLASSIFICATIONS,
  STATUSES,
  CLASSIFICATION_COLORS
} from "../components/analytics/adminAnalyticsMockData";
const DEFAULT_ROWS = 8;
const COMMODITY_ID = {
  "Kamatis": "kamatis",
  "Talong": "talong",
  "Repolyo": "repolyo",
  "Atsal": "atsal",
  "Carrots": "carrots",
  "Pipino": "pipino",
  "Ampalaya": "ampalaya",
  "Kalabasa": "kalabasa",
  "Lettuce": "lettuce",
  "Chinese Pechay": "pechay"
};
const WEIGHT_MODULES = ["Price Outlook", "Arrival Pressure", "Historical Seasonal Production Level", "Weather Risk", "Profitability"];
const DEFAULT_PHASE_WEIGHTS = {
  Planning: { "Price Outlook": 30, "Arrival Pressure": 20, "Historical Seasonal Production Level": 15, "Weather Risk": 25, "Profitability": 10 },
  Planting: { "Price Outlook": 25, "Arrival Pressure": 20, "Historical Seasonal Production Level": 15, "Weather Risk": 30, "Profitability": 10 },
  Harvesting: { "Price Outlook": 35, "Arrival Pressure": 15, "Historical Seasonal Production Level": 10, "Weather Risk": 15, "Profitability": 25 }
};
const RULE_EDIT_CONFIGS = {
  "Price Outlook": {
    description: "Compares the forecast midpoint with the recent average price to classify the price direction.",
    fields: [
      { key: "fav_min", label: "Favorable minimum change (%)", defaultValue: "5" },
      { key: "neut_min", label: "Neutral minimum change (%)", defaultValue: "-5" },
      { key: "neut_max", label: "Neutral maximum change (%)", defaultValue: "5" },
      { key: "unfav_max", label: "Unfavorable maximum change (%)", defaultValue: "-5" }
    ],
    sample: [
      { scenario: "Forecast Price Change = 7.5%", result: "Favorable" },
      { scenario: "Forecast Price Change = 2%", result: "Neutral" },
      { scenario: "Forecast Price Change = \u22126%", result: "Unfavorable" }
    ]
  },
  "Arrival Pressure": {
    description: "Classifies market arrival volume against historical Q1/Q2/Q3 quartile thresholds.",
    fields: [
      { key: "q1", label: "Q1 threshold", defaultValue: "32", unit: "MT/week" },
      { key: "q2", label: "Q2 threshold", defaultValue: "35", unit: "MT/week" },
      { key: "q3", label: "Q3 threshold", defaultValue: "41", unit: "MT/week" },
      { key: "unit", label: "Volume unit", defaultValue: "MT/week", isSelect: true, options: ["kg/week", "MT/week", "tons/week"] }
    ],
    sample: [
      { scenario: "Current arrival volume \u2264 Q1", result: "Low" },
      { scenario: "Current arrival volume > Q1 and \u2264 Q2", result: "Lower Middle" },
      { scenario: "Current arrival volume > Q2 and \u2264 Q3", result: "Upper Middle" },
      { scenario: "Current arrival volume > Q3", result: "High" }
    ]
  },
  "Historical Seasonal Production Level": {
    description: "Classifies the expected harvest quarter using PSA OpenStat production ratios against quartile thresholds.",
    fields: [
      { key: "q1_ratio", label: "Q1 ratio", defaultValue: "0.75" },
      { key: "q2_ratio", label: "Q2 ratio", defaultValue: "1.00" },
      { key: "q3_ratio", label: "Q3 ratio", defaultValue: "1.25" }
    ],
    sample: [
      { scenario: "Ratio < Q1", result: "Low" },
      { scenario: "Ratio \u2265 Q1 and < Q2", result: "Lower Middle" },
      { scenario: "Ratio \u2265 Q2 and < Q3", result: "Upper Middle" },
      { scenario: "Ratio \u2265 Q3", result: "High" }
    ]
  },
  "Weather Risk": {
    description: "Compares forecast weather conditions with crop-specific rainfall, temperature, and humidity thresholds.",
    fields: [
      { key: "crop", label: "Crop", defaultValue: "Kamatis", isSelect: true, options: ["Kamatis", "Talong", "Repolyo", "Atsal", "Carrots", "Pipino", "Ampalaya", "Kalabasa", "Lettuce", "Chinese Pechay"] },
      { key: "suit_rain_max", label: "Suitable rainfall maximum", defaultValue: "15", unit: "mm/day" },
      { key: "caut_rain_min", label: "Caution rainfall minimum", defaultValue: "15", unit: "mm/day" },
      { key: "sev_rain_min", label: "Severe rainfall minimum", defaultValue: "30", unit: "mm/day" },
      { key: "suit_temp_min", label: "Suitable temperature minimum", defaultValue: "20", unit: "\xB0C" },
      { key: "suit_temp_max", label: "Suitable temperature maximum", defaultValue: "30", unit: "\xB0C" },
      { key: "caut_temp_min", label: "Caution temperature minimum", defaultValue: "30", unit: "\xB0C" },
      { key: "caut_temp_max", label: "Caution temperature maximum", defaultValue: "35", unit: "\xB0C" },
      { key: "sev_temp", label: "Severe temperature threshold", defaultValue: "35", unit: "\xB0C" },
      { key: "humidity", label: "Humidity threshold (optional)", defaultValue: "90", unit: "%" },
      { key: "wind", label: "Wind threshold (optional)", defaultValue: "60", unit: "km/h" }
    ],
    sample: [
      { scenario: "Values within suitable range", result: "Suitable" },
      { scenario: "Rainfall or temperature enters caution range", result: "Caution" },
      { scenario: "Rainfall, temperature, humidity, or wind exceeds limits", result: "Severe" }
    ]
  },
  "Profitability": {
    description: "Applied during individual farmer assessments using production cost, expected yield, and selling price.",
    note: "This rule is applied during farmer assessment and is not shown as a global admin analytical result.",
    fields: [
      { key: "fav_multiplier", label: "Favorable multiplier (%)", defaultValue: "110" },
      { key: "overlap_rule", label: "Break-even overlap rule", defaultValue: "enabled", isSelect: true, options: ["enabled", "disabled"] }
    ],
    sample: [
      { scenario: "Lower Forecast \u2265 110% of Break-even Price", result: "Favorable" },
      { scenario: "Forecast Range overlaps Break-even Price", result: "Marginal" },
      { scenario: "Upper Forecast < Break-even Price", result: "Unfavorable" }
    ]
  },
  "Final Advisory Cutoffs": {
    description: "Maps the final adaptive weighted score to a planting advisory.",
    fields: [
      { key: "rec_min", label: "Recommended minimum", defaultValue: "0.00" },
      { key: "rec_max", label: "Recommended maximum", defaultValue: "0.99" },
      { key: "cons_min", label: "Plant Conservatively minimum", defaultValue: "1.00" },
      { key: "cons_max", label: "Plant Conservatively maximum", defaultValue: "1.99" },
      { key: "avoid_min", label: "Avoid for Now minimum", defaultValue: "2.00" },
      { key: "avoid_max", label: "Avoid for Now maximum", defaultValue: "3.00" }
    ],
    sample: [
      { scenario: "Final weighted score = 0.75", result: "Recommended" },
      { scenario: "Final weighted score = 1.35", result: "Plant Conservatively" },
      { scenario: "Final weighted score = 2.20", result: "Avoid for Now" }
    ]
  }
};
const CommodityDropdown = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return <div ref={ref} className="relative">
      <button
    onClick={() => setOpen((o) => !o)}
    className="flex items-center gap-2 px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl hover:border-[var(--hw-neutral-300)] transition-colors min-w-[148px]"
  >
        {value !== "All" && COMMODITY_ID[value] && <CommodityIllustration commodityId={COMMODITY_ID[value]} className="w-5 h-5 flex-shrink-0" />}
        <span className="flex-1 text-left text-[var(--hw-neutral-800)]">{value === "All" ? "All commodities" : value}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--hw-neutral-700)] flex-shrink-0" />
      </button>
      {open && <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg overflow-hidden min-w-full">
          {options.map((opt) => <button
    key={opt}
    onClick={() => {
      onChange(opt);
      setOpen(false);
    }}
    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-[var(--hw-neutral-50)] transition-colors text-left
                ${opt === value ? "bg-[var(--hw-green-50)] text-[var(--hw-green-700)] font-medium" : "text-[var(--hw-neutral-800)]"}`}
  >
              {opt !== "All" && COMMODITY_ID[opt] && <CommodityIllustration commodityId={COMMODITY_ID[opt]} className="w-5 h-5 flex-shrink-0" />}
              <span>{opt === "All" ? "All commodities" : opt}</span>
            </button>)}
        </div>}
    </div>;
};
const EditWeightModal = ({ phase, onClose }) => {
  const [values, setValues] = useState(
    Object.fromEntries(WEIGHT_MODULES.map((m) => [m, String(DEFAULT_PHASE_WEIGHTS[phase][m])]))
  );
  const [saved, setSaved] = useState(false);
  const total = WEIGHT_MODULES.reduce((sum, m) => sum + (parseFloat(values[m]) || 0), 0);
  const totalOk = Math.abs(total - 100) < 0.01;
  const inputCls = "w-full px-3 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition";
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-100)]">
          <p className="font-semibold text-[var(--hw-neutral-800)]">Edit {phase} Weights</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {WEIGHT_MODULES.map((m) => <div key={m}>
              <label className="block text-[12px] text-[var(--hw-neutral-800)] mb-1">{m} %</label>
              <input
    type="number"
    min="0"
    max="100"
    value={values[m]}
    onChange={(e) => setValues((v) => ({ ...v, [m]: e.target.value }))}
    className={inputCls}
  />
            </div>)}
          <div className={`flex items-center justify-between pt-2 border-t border-[var(--hw-neutral-100)]`}>
            <span className="text-[13px] font-semibold text-[var(--hw-neutral-700)]">Total</span>
            <span className={`text-[13px] font-bold ${totalOk ? "text-emerald-700" : "text-red-600"}`}>{total.toFixed(0)}%</span>
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
    onClick={() => {
      setSaved(true);
      setTimeout(onClose, 700);
    }}
    className="px-4 py-2 text-[13px] font-medium bg-[var(--hw-green-700)] text-white rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>;
};
const EditThresholdModal = ({ ruleName, onClose }) => {
  const config = RULE_EDIT_CONFIGS[ruleName];
  const [values, setValues] = useState(
    Object.fromEntries(config.fields.map((f) => [f.key, f.defaultValue]))
  );
  const [saved, setSaved] = useState(false);
  const inputCls = "w-full px-3 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition";
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-100)]">
          <p className="font-semibold text-[var(--hw-neutral-800)]">Edit — {ruleName}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="px-5 py-4 space-y-5">
            <p className="text-[13px] text-[var(--hw-neutral-800)]">{config.description}</p>
            {config.note && <div className="flex items-start gap-2 px-3 py-2.5 bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl">
                <Info className="w-4 h-4 text-[var(--hw-neutral-700)] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-[var(--hw-neutral-800)]">{config.note}</p>
              </div>}
            <div className="space-y-3">
              {config.fields.map((f) => <div key={f.key}>
                  <label className="block text-[12px] text-[var(--hw-neutral-800)] mb-1">{f.label}</label>
                  <div className="flex items-center gap-2">
                    {f.isSelect ? <select value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} className={inputCls}>
                        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select> : <input type="number" value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} className={inputCls} />}
                    {f.unit && !f.isSelect && <span className="text-[13px] text-[var(--hw-neutral-700)] flex-shrink-0">{f.unit}</span>}
                  </div>
                </div>)}
            </div>
            <div>
              <p className="text-[12px] font-medium text-[var(--hw-neutral-800)] mb-2">Sample output</p>
              <div className="bg-[var(--hw-neutral-50)] rounded-xl border border-[var(--hw-neutral-100)] divide-y divide-[var(--hw-neutral-100)]">
                {config.sample.map((s, i) => <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="text-[12px] text-[var(--hw-neutral-800)]">{s.scenario}</span>
                    <span className="text-[12px] font-semibold text-[var(--hw-neutral-800)] flex-shrink-0">{s.result}</span>
                  </div>)}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--hw-neutral-100)]">
          <button
    onClick={onClose}
    className="px-4 py-2 text-[13px] font-medium border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            Cancel
          </button>
          <button
    onClick={() => {
      setSaved(true);
      setTimeout(onClose, 700);
    }}
    className="px-4 py-2 text-[13px] font-medium bg-[var(--hw-green-700)] text-white rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
  >
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>;
};
function AdminAnalytics() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("outputs");
  const [fCommodity, setFCommodity] = useState("All");
  const [fModule, setFModule] = useState("All");
  const [fClassification, setFClassification] = useState("All");
  const [fStatus, setFStatus] = useState("All");
  const [showAll, setShowAll] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef(null);
  const [editingPhase, setEditingPhase] = useState(null);
  const [editingThreshold, setEditingThreshold] = useState(null);
  useEffect(() => {
    if (!showTooltip) return;
    const h = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) setShowTooltip(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showTooltip]);
  const selectCls = "px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] transition cursor-pointer";
  const filteredResults = RESULTS.filter(
    (r) => (fCommodity === "All" || r.commodity === fCommodity) && (fModule === "All" || r.module === fModule) && (fClassification === "All" || r.classification === fClassification) && (fStatus === "All" || r.status === fStatus)
  );
  const visibleResults = showAll ? filteredResults : filteredResults.slice(0, DEFAULT_ROWS);
  return <>
      {editingPhase && <EditWeightModal phase={editingPhase} onClose={() => setEditingPhase(null)} />}
      {editingThreshold && <EditThresholdModal ruleName={editingThreshold} onClose={() => setEditingThreshold(null)} />}

      <div className="px-4 md:px-8 lg:px-10 py-5 max-w-[1440px] mx-auto space-y-5">

        {
    /* ── Header ── */
  }
        <PageHeader
    title="Analytics Processing"
    description="Review processed module outputs and advisory rules used by HarvestWise."
    action={<p className="text-[12px] text-[var(--hw-neutral-700)] whitespace-nowrap hidden sm:block">Last updated: Jul 20, 2026, 7:30 AM</p>}
  />

        {
    /* ── Tabs ── */
  }
        <div className="border-b border-[var(--hw-neutral-200)]">
          <div className="flex">
            {[
    { id: "outputs", label: "Module Outputs" },
    { id: "weights", label: "Weights & Thresholds" }
  ].map((t) => <button
    key={t.id}
    onClick={() => setTab(t.id)}
    className={`px-5 py-3 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? "border-[var(--hw-green-700)] text-[var(--hw-neutral-900)]" : "border-transparent text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-700)]"}`}
  >
                {t.label}
              </button>)}
          </div>
        </div>

        {
    /* ══ MODULE OUTPUTS TAB ══ */
  }
        {tab === "outputs" && <div className="space-y-6">

            {
    /* Module output cards */
  }
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {MODULE_SUMMARY_CARDS.map((card) => {
    const cc = CLASSIFICATION_COLORS[card.classification] ?? "text-[var(--hw-neutral-700)]";
    return <div
      key={card.module}
      onClick={() => navigate(`/admin/analytics/basis/${card.basisId}`)}
      className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3 hover:bg-[var(--hw-neutral-50)] hover:border-[var(--hw-neutral-300)] transition-colors cursor-pointer"
    >
                    <p className="text-[13px] font-semibold text-[var(--hw-neutral-800)] leading-snug">{card.module}</p>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[12px] text-[var(--hw-neutral-700)]">Classification</span>
                        <span className={`text-[12px] font-semibold ${cc}`}>{card.classification}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[12px] text-[var(--hw-neutral-700)]">Source</span>
                        <span className="text-[12px] text-[var(--hw-neutral-800)] text-right max-w-[120px] leading-tight">{card.source}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[12px] text-[var(--hw-neutral-700)]">Processed</span>
                        <span className="text-[12px] text-[var(--hw-neutral-800)]">Jul 20, 2026, 7:30 AM</span>
                      </div>
                    </div>
                  </div>;
  })}
            </div>

            {
    /* Processed Results */
  }
            <div className="space-y-4">
              {
    /* Heading + tooltip */
  }
              <div ref={tooltipRef} className="relative flex items-center gap-2">
                <p className="text-[15px] font-semibold text-[var(--hw-neutral-800)]">Processed Results</p>
                <button
    onClick={() => setShowTooltip((v) => !v)}
    className="text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-800)] transition-colors"
  >
                  <Info className="w-4 h-4" />
                </button>
                {showTooltip && <div className="absolute top-full left-0 mt-2 z-20 w-[320px] bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] text-[var(--hw-neutral-800)] leading-relaxed">
                        This table shows processed outputs for Price Outlook, Arrival Pressure, Historical Seasonal Production Level, and Weather Risk. Profitability is calculated during individual farmer assessment because it depends on farmer-specific cost, yield, and selling-price inputs.
                      </p>
                      <button
    onClick={() => setShowTooltip(false)}
    className="text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-800)] flex-shrink-0 mt-0.5"
  >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>}
              </div>

              {
    /* Filters */
  }
              <div className="flex flex-wrap gap-3 items-center">
                <CommodityDropdown value={fCommodity} options={COMMODITIES} onChange={(v) => {
    setFCommodity(v);
    setShowAll(false);
  }} />
                <select value={fModule} onChange={(e) => {
    setFModule(e.target.value);
    setShowAll(false);
  }} className={selectCls}>
                  {MODULES.map((m) => <option key={m} value={m}>{m === "All" ? "All modules" : m}</option>)}
                </select>
                <select value={fClassification} onChange={(e) => {
    setFClassification(e.target.value);
    setShowAll(false);
  }} className={selectCls}>
                  {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c === "All" ? "All classifications" : c}</option>)}
                </select>
                <select value={fStatus} onChange={(e) => {
    setFStatus(e.target.value);
    setShowAll(false);
  }} className={selectCls}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>)}
                </select>
                {(fCommodity !== "All" || fModule !== "All" || fClassification !== "All" || fStatus !== "All") && <button
    onClick={() => {
      setFCommodity("All");
      setFModule("All");
      setFClassification("All");
      setFStatus("All");
      setShowAll(false);
    }}
    className="text-[12px] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-800)] transition-colors"
  >
                    Clear filters
                  </button>}
              </div>

              {
    /* Table */
  }
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
                {filteredResults.length === 0 ? <p className="px-4 py-10 text-center text-[var(--hw-neutral-700)] text-[13px]">No results match the selected filters.</p> : <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px]">
                        <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                          <tr>
                            {["Module", "Commodity", "Input Period", "Classification", "Processed Date"].map((h) => <th key={h} className="px-3 py-2.5 text-left font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                          {visibleResults.map((r) => {
    const cc = CLASSIFICATION_COLORS[r.classification] ?? "text-[var(--hw-neutral-700)]";
    return <tr
      key={r.id}
      onClick={() => navigate(`/admin/analytics/basis/${r.id}`)}
      className="hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
    >
                                <td className="px-3 py-2.5 font-medium text-[var(--hw-neutral-900)] whitespace-nowrap">{r.module}</td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-1.5">
                                    {COMMODITY_ID[r.commodity] && <CommodityIllustration commodityId={COMMODITY_ID[r.commodity]} className="w-5 h-5 flex-shrink-0" />}
                                    <div>
                                      <span className="text-[var(--hw-neutral-700)]">{r.commodity}</span>
                                      {r.variant && <p className="text-[11px] text-[var(--hw-neutral-500)]">{r.variant}</p>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-[var(--hw-neutral-800)] whitespace-nowrap">{r.inputPeriod}</td>
                                <td className={`px-3 py-2.5 font-semibold ${cc}`}>{r.classification}</td>
                                <td className="px-3 py-2.5 text-[var(--hw-neutral-800)] whitespace-nowrap">{r.processedAt}</td>
                              </tr>;
  })}
                        </tbody>
                      </table>
                    </div>
                    {filteredResults.length > DEFAULT_ROWS && <div className="px-4 py-3 border-t border-[var(--hw-neutral-100)] flex items-center justify-between">
                        <p className="text-[12px] text-[var(--hw-neutral-700)]">
                          Showing {visibleResults.length} of {filteredResults.length} results
                        </p>
                        <button
    onClick={() => setShowAll((v) => !v)}
    className="text-[12px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
                          {showAll ? "Show less" : `Show all ${filteredResults.length} results`}
                        </button>
                      </div>}
                  </>}
              </div>
            </div>
          </div>}

        {
    /* ══ WEIGHTS & THRESHOLDS TAB ══ */
  }
        {tab === "weights" && <div className="space-y-8">

            {
    /* Adaptive Weights */
  }
            <div className="space-y-3">
              <p className="text-[15px] font-semibold text-[var(--hw-neutral-800)]">Adaptive Weights</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(DEFAULT_PHASE_WEIGHTS).map(([phase, weights]) => <div key={phase} className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[13px] font-semibold text-[var(--hw-neutral-800)]">{phase}</p>
                      <button
    onClick={() => setEditingPhase(phase)}
    className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-800)] transition-colors"
  >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {WEIGHT_MODULES.map((m) => <div key={m} className="flex items-center justify-between gap-2">
                          <span className="text-[12px] text-[var(--hw-neutral-800)] truncate">{m}</span>
                          <span className="text-[12px] font-semibold text-[var(--hw-neutral-800)] flex-shrink-0">{weights[m]}%</span>
                        </div>)}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--hw-neutral-100)]">
                      <span className="text-[12px] font-semibold text-[var(--hw-neutral-800)]">Total</span>
                      <span className="text-[12px] font-bold text-emerald-700">100%</span>
                    </div>
                  </div>)}
              </div>
            </div>

            {
    /* Threshold Rules */
  }
            <div className="space-y-3">
              <p className="text-[15px] font-semibold text-[var(--hw-neutral-800)]">Threshold Rules</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {
    /* Module rules */
  }
                {MODULE_RULES.map((mr) => <div key={mr.module} className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--hw-neutral-800)] leading-snug">{mr.module}</p>
                        <p className="text-[12px] text-[var(--hw-neutral-700)] mt-0.5 leading-snug">{mr.source}</p>
                      </div>
                      <button
    onClick={() => setEditingThreshold(mr.module)}
    className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-800)] transition-colors flex-shrink-0"
  >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      {mr.rules.map((r) => <div key={r.classification} className="flex items-start justify-between gap-2">
                          <span className={`text-[12px] font-semibold flex-shrink-0 ${r.color}`}>{r.classification}</span>
                          <span className="text-[12px] text-[var(--hw-neutral-800)] text-right leading-snug">{r.rule}</span>
                        </div>)}
                      {mr.module === "Profitability" && <p className="text-[12px] text-[var(--hw-neutral-700)] italic mt-1">Applied during farmer assessment.</p>}
                      {mr.module === "Weather Risk" && <p className="text-[12px] text-[var(--hw-neutral-700)] mt-1">Crop-specific rainfall, temperature, humidity, and wind thresholds.</p>}
                    </div>
                    <p className="text-[12px] text-[var(--hw-neutral-700)]">Updated {mr.lastUpdated}</p>
                  </div>)}
                {
    /* Final Advisory Cutoffs */
  }
                <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--hw-neutral-800)]">Final Advisory Cutoffs</p>
                      <p className="text-[12px] text-[var(--hw-neutral-700)] mt-0.5">Adaptive Weight Crop Modules</p>
                    </div>
                    <button
    onClick={() => setEditingThreshold("Final Advisory Cutoffs")}
    className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-800)] transition-colors flex-shrink-0"
  >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    {FINAL_ADVISORY_CUTOFFS.map((c) => <div key={c.advisory} className="flex items-center justify-between gap-2">
                        <span className={`text-[12px] font-semibold ${c.color}`}>{c.advisory}</span>
                        <span className="text-[12px] text-[var(--hw-neutral-800)] font-medium">{c.range}</span>
                      </div>)}
                  </div>
                  <p className="text-[12px] text-[var(--hw-neutral-700)]">Updated Jun 1, 2026</p>
                </div>
              </div>
            </div>

          </div>}

      </div>
    </>;
}
export {
  AdminAnalytics as default
};
