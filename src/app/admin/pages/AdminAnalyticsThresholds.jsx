import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Edit2, X, Info } from "lucide-react";
import {
  MODULE_RULES,
  FINAL_ADVISORY_CUTOFFS
} from "../components/analytics/adminAnalyticsMockData";
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
      { scenario: "Forecast Price Change = 7.5%", result: "Favorable", color: "text-emerald-700" },
      { scenario: "Forecast Price Change = 2%", result: "Neutral", color: "text-[var(--hw-neutral-600)]" },
      { scenario: "Forecast Price Change = \u22126%", result: "Unfavorable", color: "text-red-600" }
    ]
  },
  "Arrival Pressure": {
    description: "Classifies market arrival volume by comparing current DFTC arrivals with historical Q1/Q2/Q3 quartile thresholds.",
    fields: [
      { key: "q1", label: "Q1 threshold", defaultValue: "32", unit: "MT/week" },
      { key: "q2", label: "Q2 threshold", defaultValue: "35", unit: "MT/week" },
      { key: "q3", label: "Q3 threshold", defaultValue: "41", unit: "MT/week" },
      { key: "unit", label: "Volume unit", defaultValue: "MT/week", isSelect: true, options: ["kg/week", "MT/week", "tons/week"] }
    ],
    sample: [
      { scenario: "Current arrival volume \u2264 Q1", result: "Low", color: "text-emerald-700" },
      { scenario: "Current arrival volume > Q1 and \u2264 Q2", result: "Lower Middle", color: "text-blue-600" },
      { scenario: "Current arrival volume > Q2 and \u2264 Q3", result: "Upper Middle", color: "text-amber-700" },
      { scenario: "Current arrival volume > Q3", result: "High", color: "text-red-600" }
    ]
  },
  "Historical Seasonal Production Level": {
    description: "Classifies the expected harvest quarter using PSA OpenStat historical production ratios against quartile thresholds.",
    fields: [
      { key: "q1_ratio", label: "Q1 ratio", defaultValue: "0.75" },
      { key: "q2_ratio", label: "Q2 ratio", defaultValue: "1.00" },
      { key: "q3_ratio", label: "Q3 ratio", defaultValue: "1.25" }
    ],
    sample: [
      { scenario: "Ratio < Q1", result: "Low", color: "text-emerald-700" },
      { scenario: "Ratio \u2265 Q1 and < Q2", result: "Lower Middle", color: "text-blue-600" },
      { scenario: "Ratio \u2265 Q2 and < Q3", result: "Upper Middle", color: "text-amber-700" },
      { scenario: "Ratio \u2265 Q3", result: "High", color: "text-red-600" }
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
      { key: "sev_temp_thresh", label: "Severe temperature threshold", defaultValue: "35", unit: "\xB0C" },
      { key: "humidity_thresh", label: "Humidity threshold (optional)", defaultValue: "90", unit: "%" },
      { key: "wind_thresh", label: "Wind threshold (optional)", defaultValue: "60", unit: "km/h" }
    ],
    sample: [
      { scenario: "Values within suitable range", result: "Suitable", color: "text-emerald-700" },
      { scenario: "Rainfall or temperature enters caution range", result: "Caution", color: "text-amber-700" },
      { scenario: "Rainfall, temperature, humidity, or wind exceeds severe limits", result: "Severe", color: "text-red-600" }
    ]
  },
  "Profitability": {
    description: "Applied during individual farmer assessments using the farmer's own production cost, expected yield, and selling price.",
    note: "This rule is applied during farmer assessment and is not shown as a global admin analytical result.",
    fields: [
      { key: "fav_multiplier", label: "Favorable multiplier (%)", defaultValue: "110" },
      { key: "overlap_rule", label: "Break-even overlap rule", defaultValue: "enabled", isSelect: true, options: ["enabled", "disabled"] }
    ],
    sample: [
      { scenario: "Lower Forecast \u2265 110% of Break-even Price", result: "Favorable", color: "text-emerald-700" },
      { scenario: "Forecast Range overlaps Break-even Price", result: "Marginal", color: "text-amber-700" },
      { scenario: "Upper Forecast < Break-even Price", result: "Unfavorable", color: "text-red-600" }
    ]
  },
  "Final Advisory Cutoffs": {
    description: "Maps the final adaptive weighted score from all four system modules to a planting advisory.",
    fields: [
      { key: "rec_min", label: "Recommended minimum", defaultValue: "0.00" },
      { key: "rec_max", label: "Recommended maximum", defaultValue: "0.99" },
      { key: "cons_min", label: "Plant Conservatively minimum", defaultValue: "1.00" },
      { key: "cons_max", label: "Plant Conservatively maximum", defaultValue: "1.99" },
      { key: "avoid_min", label: "Avoid for Now minimum", defaultValue: "2.00" },
      { key: "avoid_max", label: "Avoid for Now maximum", defaultValue: "3.00" }
    ],
    sample: [
      { scenario: "Final weighted score = 0.75", result: "Recommended", color: "text-emerald-700" },
      { scenario: "Final weighted score = 1.35", result: "Plant Conservatively", color: "text-amber-700" },
      { scenario: "Final weighted score = 2.20", result: "Avoid for Now", color: "text-red-700" }
    ]
  }
};
const RULE_IDS = {
  "Price Outlook": "RULE-PO-001",
  "Arrival Pressure": "RULE-AP-001",
  "Historical Seasonal Production Level": "RULE-HP-001",
  "Weather Risk": "RULE-WR-001",
  "Profitability": "RULE-PROF-001",
  "Final Advisory Cutoffs": "RULE-FAC-001"
};
const EditModal = ({ ruleName, onClose }) => {
  const config = RULE_EDIT_CONFIGS[ruleName];
  const [values, setValues] = useState(
    Object.fromEntries(config.fields.map((f) => [f.key, f.defaultValue]))
  );
  const [saved, setSaved] = useState(false);
  const inputCls = "w-full px-3 py-2 text-[13px] border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition";
  const handleSave = () => {
    setSaved(true);
    setTimeout(onClose, 800);
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-100)]">
          <div>
            <p className="font-semibold text-[var(--hw-neutral-800)]">Edit — {ruleName}</p>
            {RULE_IDS[ruleName] && <p className="text-[11px] font-mono text-[var(--hw-neutral-700)] mt-0.5">{RULE_IDS[ruleName]}</p>}
          </div>
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
                    {f.isSelect ? <select
    value={values[f.key]}
    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
    className={inputCls}
  >
                        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select> : <input
    type="number"
    value={values[f.key]}
    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
    className={inputCls}
  />}
                    {f.unit && !f.isSelect && <span className="text-[13px] text-[var(--hw-neutral-700)] flex-shrink-0">{f.unit}</span>}
                  </div>
                </div>)}
            </div>
            <div>
              <p className="text-[12px] font-medium text-[var(--hw-neutral-800)] mb-2">Sample output</p>
              <div className="bg-[var(--hw-neutral-50)] rounded-xl border border-[var(--hw-neutral-100)] divide-y divide-[var(--hw-neutral-100)]">
                {config.sample.map((s, i) => <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="text-[12px] text-[var(--hw-neutral-800)]">{s.scenario}</span>
                    <span className={`text-[12px] font-semibold flex-shrink-0 ${s.color}`}>{s.result}</span>
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
    onClick={handleSave}
    className="px-4 py-2 text-[13px] font-medium bg-[var(--hw-green-700)] text-white rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
  >
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>;
};
function AdminAnalyticsThresholds() {
  const navigate = useNavigate();
  const [editingRule, setEditingRule] = useState(null);
  return <>
      {editingRule && <EditModal ruleName={editingRule} onClose={() => setEditingRule(null)} />}

      <div className="px-4 md:px-8 lg:px-10 py-5 max-w-[1440px] mx-auto space-y-5">

        {
    /* Header */
  }
        <div>
          <button
    onClick={() => navigate("/admin/analytics")}
    className="flex items-center gap-1 text-[13px] text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-700)] transition-colors mb-4"
  >
            <ChevronLeft className="w-4 h-4" />
            Back to Analytics
          </button>
          <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">Rules & Thresholds</h1>
          <p className="text-[13px] text-[var(--hw-neutral-800)] mt-0.5">
            Review and adjust classification rules used by HarvestWise.
          </p>
        </div>

        {
    /* Module rule cards */
  }
        {MODULE_RULES.map((mr) => <div key={mr.module} className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-[var(--hw-neutral-100)]">
              <div>
                <p className="text-[11px] font-mono text-[var(--hw-neutral-700)] mb-0.5">{mr.ruleId}</p>
                <p className="font-semibold text-[var(--hw-neutral-900)]">{mr.module}</p>
                <p className="text-[12px] text-[var(--hw-neutral-700)] mt-0.5">Source: {mr.source}</p>
                {mr.module === "Profitability" && <p className="text-[12px] text-[var(--hw-neutral-700)] mt-0.5 italic">
                    This rule is applied during farmer assessment and is not shown as a global admin analytical result.
                  </p>}
                {mr.module === "Weather Risk" && <p className="text-[12px] text-[var(--hw-neutral-700)] mt-0.5">
                    Weather Risk compares rainfall, temperature, humidity, and wind with crop-specific weather requirements.
                  </p>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-[11px] font-medium text-emerald-700">Active</p>
                  <p className="text-[12px] text-[var(--hw-neutral-700)]">Updated {mr.lastUpdated}</p>
                </div>
                <button
    onClick={() => setEditingRule(mr.module)}
    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] rounded-lg hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
                  <Edit2 className="w-3 h-3" />Edit
                </button>
              </div>
            </div>
            <div className="divide-y divide-[var(--hw-neutral-100)]">
              {mr.rules.map((r) => <div key={r.classification} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className={`text-[13px] font-semibold flex-shrink-0 ${r.color}`}>{r.classification}</span>
                  <span className="text-[13px] text-[var(--hw-neutral-800)] text-right">{r.rule}</span>
                </div>)}
            </div>
          </div>)}

        {
    /* Final Advisory Cutoffs */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-[var(--hw-neutral-100)]">
            <div>
              <p className="text-[11px] font-mono text-[var(--hw-neutral-700)] mb-0.5">RULE-FAC-001</p>
              <p className="font-semibold text-[var(--hw-neutral-900)]">Final Advisory Cutoffs</p>
              <p className="text-[12px] text-[var(--hw-neutral-700)] mt-0.5">
                Source: Adaptive Weight Crop Modules
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <p className="text-[11px] font-medium text-emerald-700">Active</p>
                <p className="text-[12px] text-[var(--hw-neutral-700)]">Updated Jun 1, 2026</p>
              </div>
              <button
    onClick={() => setEditingRule("Final Advisory Cutoffs")}
    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] rounded-lg hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
                <Edit2 className="w-3 h-3" />Edit
              </button>
            </div>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {FINAL_ADVISORY_CUTOFFS.map((c) => <div key={c.advisory} className="flex items-start justify-between gap-4 px-5 py-4">
                <div>
                  <p className={`text-[13px] font-semibold ${c.color}`}>{c.advisory}</p>
                  <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">{c.description}</p>
                </div>
                <span className="text-[13px] font-medium text-[var(--hw-neutral-600)] flex-shrink-0">{c.range}</span>
              </div>)}
          </div>
        </div>

      </div>
    </>;
}
export {
  AdminAnalyticsThresholds as default
};
