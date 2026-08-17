import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Search,
  X,
  MoreHorizontal,
  Check,
  Cloud,
  CloudOff
} from "lucide-react";
import {
  ARRIVAL_COMMODITIES,
  UOM_OPTIONS,
  OBS_STATUS_LABELS
} from "./dftc-add-data-data";
function formatDateLabel(iso) {
  const d = /* @__PURE__ */ new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}
function combinedTotal(f) {
  const farm = parseFloat(f.farmSource);
  const other = parseFloat(f.otherSource);
  if (isNaN(farm) && isNaN(other)) return "";
  const total = (isNaN(farm) ? 0 : farm) + (isNaN(other) ? 0 : other);
  return total.toLocaleString();
}
function hasArrivalValue(f) {
  return f.farmSource !== "" || f.farmObs !== null || f.otherSource !== "" || f.otherObs !== null;
}
function generateArrivalName(date) {
  return `DFTC Arrival Volume \u2014 ${formatDateLabel(date)}`;
}
function ObsStatusMenu({ currentStatus, onSelect, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  const options = [
    { key: "zero", label: "Zero in Source" },
    { key: "blank", label: "Blank in Source" },
    { key: "dash", label: "Dash in Source" },
    { key: "missing", label: "Missing / Not Reported" }
  ];
  return <div
    ref={ref}
    className="absolute right-0 top-full mt-1 w-48 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-[var(--shadow-lg)] z-30 overflow-hidden"
  >
      <div className="py-1">
        <p className="px-3 py-1.5 text-[12px] font-semibold text-[var(--hw-neutral-800)] uppercase tracking-wide">Set source value</p>
        {options.map((opt) => <button
    key={opt.key}
    onClick={() => onSelect(opt.key)}
    className={`w-full flex items-center justify-between px-3 py-2 text-[12px] hover:bg-[var(--hw-neutral-50)] transition-colors text-left ${currentStatus === opt.key ? "text-[var(--hw-green-700)] font-medium" : "text-[var(--hw-neutral-800)]"}`}
  >
            <span>{opt.label}</span>
            {currentStatus === opt.key && <Check className="w-3 h-3" />}
          </button>)}
        {currentStatus !== null && <>
            <div className="my-1 border-t border-[var(--hw-neutral-100)]" />
            <button
    onClick={() => onSelect(null)}
    className="w-full px-3 py-2 text-[12px] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
  >
              Clear Status
            </button>
          </>}
      </div>
    </div>;
}
function VolumeField({ variantId, fieldKey, value, obsStatus, onChange, onObsChange }) {
  const menuId = `${variantId}-${fieldKey}`;
  const [open, setOpen] = useState(false);
  return <div className="flex items-center gap-1 relative">
      {obsStatus ? <div className="flex-1 px-2 py-1.5 rounded-lg border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] text-[12px] text-[var(--hw-neutral-800)] italic truncate">
          {OBS_STATUS_LABELS[obsStatus]}
        </div> : <input
    type="number"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder="0"
    className="flex-1 px-2 py-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[12px] text-[var(--hw-neutral-900)] bg-white focus:outline-none focus:border-[var(--hw-green-700)] min-w-0"
  />}
      <div className="relative shrink-0">
        <button
    onClick={() => setOpen(!open)}
    className={`p-1 rounded-lg hover:bg-[var(--hw-neutral-100)] transition-colors ${obsStatus ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-400)]"}`}
  >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
        {open && <ObsStatusMenu
    currentStatus={obsStatus}
    onSelect={(s) => {
      onObsChange(s);
      setOpen(false);
    }}
    onClose={() => setOpen(false)}
  />}
      </div>
    </div>;
}
function DFTCArrivalInput() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state;
  const defaultDate = navState?.date ?? "2026-08-02";
  const [fields, setFields] = useState({});
  const [customVariants, setCustomVariants] = useState({});
  const [addingVariant, setAddingVariant] = useState(null);
  const [variantInput, setVariantInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMode, setShowMode] = useState("all");
  const [saveStatus, setSaveStatus] = useState("idle");
  const saveTimer = useRef(null);
  const oldTimer = useRef(null);
  const [hasDraft, setHasDraft] = useState(() => {
    try {
      return localStorage.getItem("dftc_arrival_draft") === "true";
    } catch {
      return false;
    }
  });
  const [draftDismissed, setDraftDismissed] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [dataName, setDataName] = useState(generateArrivalName(defaultDate));
  const [saved, setSaved] = useState(false);
  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (oldTimer.current) clearTimeout(oldTimer.current);
  }, []);
  const triggerAutosave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (oldTimer.current) clearTimeout(oldTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(() => {
      setSaveStatus("saved");
      try {
        localStorage.setItem("dftc_arrival_draft", "true");
      } catch {
      }
      oldTimer.current = setTimeout(() => setSaveStatus("savedOld"), 3e4);
    }, 1500);
  }, []);
  function updateField(variantId, patch) {
    setFields((prev) => ({
      ...prev,
      [variantId]: {
        farmSource: "",
        farmObs: null,
        otherSource: "",
        otherObs: null,
        uom: "kg",
        ...prev[variantId],
        ...patch
      }
    }));
    triggerAutosave();
  }
  function getVariants(com) {
    return [...com.variants, ...customVariants[com.id] ?? []];
  }
  function commitVariant(commodityId) {
    const trimmed = variantInput.trim();
    if (!trimmed) {
      setAddingVariant(null);
      setVariantInput("");
      return;
    }
    const newId = `custom-arr-${commodityId}-${Date.now()}`;
    setCustomVariants((prev) => ({
      ...prev,
      [commodityId]: [...prev[commodityId] ?? [], { id: newId, name: trimmed }]
    }));
    setAddingVariant(null);
    setVariantInput("");
    triggerAutosave();
  }
  function matchesCommodity(com, variants) {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return com.name.toLowerCase().includes(q) || variants.some((v) => v.name.toLowerCase().includes(q));
  }
  function matchesVariant(com, v) {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return com.name.toLowerCase().includes(q) || v.name.toLowerCase().includes(q);
  }
  const allEntries = ARRIVAL_COMMODITIES.flatMap(
    (com) => getVariants(com).map((v) => ({ com, v, f: fields[v.id] ?? { farmSource: "", farmObs: null, otherSource: "", otherObs: null, uom: "kg" } })).filter(({ f }) => hasArrivalValue(f))
  );
  const hwCount = allEntries.filter((e) => e.com.isHW).length;
  const tempCount = allEntries.filter((e) => !e.com.isHW).length;
  const enteredCount = allEntries.length;
  const canReview = enteredCount > 0;
  function handleSave() {
    try {
      localStorage.removeItem("dftc_arrival_draft");
    } catch {
    }
    setSaved(true);
    setTimeout(() => {
      navigate("/dftc/input", {
        state: { successMsg: `${dataName} saved successfully.` }
      });
    }, 1e3);
  }
  function SaveStatusIndicator() {
    if (saveStatus === "idle") return null;
    return <div className="flex items-center gap-1.5 text-[12px]">
        {saveStatus === "saving" && <><Cloud className="w-3.5 h-3.5 text-[var(--hw-neutral-400)] animate-pulse" /><span className="text-[var(--hw-neutral-800)]">Saving…</span></>}
        {saveStatus === "saved" && <><Check className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-700">Saved just now</span></>}
        {saveStatus === "savedOld" && <><Cloud className="w-3.5 h-3.5 text-[var(--hw-neutral-400)]" /><span className="text-[var(--hw-neutral-800)]">Saved on this device</span></>}
        {saveStatus === "offline" && <><CloudOff className="w-3.5 h-3.5 text-amber-600" /><span className="text-amber-700">Offline — changes saved on this device</span></>}
      </div>;
  }
  if (reviewMode) {
    return <div className="px-4 md:px-8 lg:px-10 py-5 max-w-[1240px] mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">Add Arrival Volume</h1>
            <p className="text-[13px] text-[var(--hw-neutral-700)] mt-1">DFTC · {formatDateLabel(defaultDate)}</p>
          </div>
          <SaveStatusIndicator />
        </div>

        <div className="bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl px-4 py-3 mb-5 flex items-center justify-between gap-4">
          <p className="text-[13px] text-[var(--hw-neutral-800)]">Showing only commodities with entered values. Review and edit before saving.</p>
          <button onClick={() => setReviewMode(false)} className="shrink-0 text-[13px] text-[var(--hw-green-700)] underline whitespace-nowrap">
            Back to Full Entry
          </button>
        </div>

        {
      /* Summary */
    }
        <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-3 mb-5">
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[12px]">
            <span className="text-[var(--hw-neutral-800)]"><strong className="font-semibold">{enteredCount}</strong> Total Records</span>
            <span className="text-[var(--hw-neutral-800)]"><strong className="font-semibold text-[var(--hw-green-700)]">{hwCount}</strong> HarvestWise Commodity Records</span>
            <span className="text-[var(--hw-neutral-800)]"><strong className="font-semibold text-amber-700">{tempCount}</strong> Temporary Commodity Records</span>
          </div>
        </div>

        {
      /* Review table */
    }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden mb-5">
          {
      /* Header */
    }
          <div className="hidden md:grid grid-cols-[1fr_80px_150px_150px_120px] gap-3 px-4 py-2.5 bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
            {["Commodity / Variant", "Unit", "Farm Source", "Other Source", "Combined Total"].map((h) => <div key={h} className="text-[11px] font-semibold text-[var(--hw-neutral-700)]">{h}</div>)}
          </div>
          {allEntries.map(({ com, v, f }) => {
      const total = combinedTotal(f);
      return <div key={v.id}>
                {
        /* Desktop */
      }
                <div className="hidden md:grid grid-cols-[1fr_80px_150px_150px_120px] items-center gap-3 px-4 py-2.5 border-b border-[var(--hw-neutral-100)] last:border-0">
                  <div>
                    <span className="text-[12px] font-medium text-[var(--hw-neutral-800)]">{com.name}</span>
                    <span className="text-[12px] text-[var(--hw-neutral-900)] ml-1.5">{v.name}</span>
                    {!com.isHW && <span className="ml-2 text-[10px] text-amber-700 font-medium">Temporary</span>}
                  </div>
                  <select
        value={f.uom}
        onChange={(e) => updateField(v.id, { uom: e.target.value })}
        className="w-full px-2 py-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[12px] text-[var(--hw-neutral-900)] bg-white focus:outline-none"
      >
                    {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <VolumeField variantId={v.id} fieldKey="farm" value={f.farmSource} obsStatus={f.farmObs} onChange={(val) => updateField(v.id, { farmSource: val, farmObs: null })} onObsChange={(s) => updateField(v.id, { farmObs: s, farmSource: "" })} />
                  <VolumeField variantId={v.id} fieldKey="other" value={f.otherSource} obsStatus={f.otherObs} onChange={(val) => updateField(v.id, { otherSource: val, otherObs: null })} onObsChange={(s) => updateField(v.id, { otherObs: s, otherSource: "" })} />
                  <div className="px-2 py-1.5 text-[12px] text-[var(--hw-neutral-700)] font-medium">
                    {total ? `${total} ${f.uom}` : "\u2014"}
                  </div>
                </div>
                {
        /* Mobile */
      }
                <div className="block md:hidden px-4 py-3 border-b border-[var(--hw-neutral-100)] last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium text-[var(--hw-neutral-900)]">{com.name} — {v.name}</span>
                    {!com.isHW && <span className="text-[10px] text-amber-700 font-medium">Temporary</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Farm Source</p>
                      <VolumeField variantId={v.id} fieldKey="farm" value={f.farmSource} obsStatus={f.farmObs} onChange={(val) => updateField(v.id, { farmSource: val, farmObs: null })} onObsChange={(s) => updateField(v.id, { farmObs: s, farmSource: "" })} />
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Other Source</p>
                      <VolumeField variantId={v.id} fieldKey="other" value={f.otherSource} obsStatus={f.otherObs} onChange={(val) => updateField(v.id, { otherSource: val, otherObs: null })} onObsChange={(s) => updateField(v.id, { otherObs: s, otherSource: "" })} />
                    </div>
                  </div>
                  {total && <p className="text-[12px] text-[var(--hw-neutral-700)] mt-2">Combined: <strong>{total} {f.uom}</strong></p>}
                </div>
              </div>;
    })}
        </div>

        {
      /* Save section */
    }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
          <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-2">Data Name</label>
          <input
      type="text"
      value={dataName}
      onChange={(e) => setDataName(e.target.value)}
      className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)] mb-4"
    />
          {saved ? <div className="flex items-center gap-2 text-emerald-700">
              <Check className="w-4 h-4" />
              <span className="text-[13px] font-medium">Saved successfully. Returning…</span>
            </div> : <div className="flex items-center gap-3">
              <button
      onClick={() => setReviewMode(false)}
      className="py-2.5 px-4 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
    >
                Back to Full Entry
              </button>
              <button
      onClick={handleSave}
      disabled={!canReview}
      className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-50"
    >
                Save {dataName}
              </button>
            </div>}
        </div>
      </div>;
  }
  const displayedCommodities = ARRIVAL_COMMODITIES.filter((com) => {
    const variants = getVariants(com);
    if (!matchesCommodity(com, variants)) return false;
    if (showMode === "entered") {
      return variants.some((v) => hasArrivalValue(fields[v.id] ?? { farmSource: "", farmObs: null, otherSource: "", otherObs: null, uom: "kg" }));
    }
    return true;
  });
  return <div className="px-4 md:px-8 lg:px-10 py-5 max-w-[1240px] mx-auto">

      {
    /* Draft restore banner */
  }
      {hasDraft && !draftDismissed && <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-amber-800">Continue your saved draft</p>
            <p className="text-[12px] text-amber-700 mt-0.5">An unfinished entry was found on this device.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
    onClick={() => {
      setDraftDismissed(true);
      setHasDraft(false);
      try {
        localStorage.removeItem("dftc_arrival_draft");
      } catch {
      }
    }}
    className="text-[12px] text-amber-700 underline"
  >
              Discard Draft
            </button>
            <button
    onClick={() => setDraftDismissed(true)}
    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[12px] font-medium hover:bg-amber-700 transition-colors"
  >
              Continue Draft
            </button>
          </div>
        </div>}

      {
    /* Header */
  }
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">Add Arrival Volume</h1>
          <p className="text-[13px] text-[var(--hw-neutral-700)] mt-1">
            DFTC · {formatDateLabel(defaultDate)}
          </p>
        </div>
        <SaveStatusIndicator />
      </div>

      {
    /* Toolbar */
  }
      <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--hw-neutral-400)]" />
          <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search commodity or variant"
    className="w-full pl-8 pr-3 py-2 rounded-lg border border-[var(--hw-neutral-200)] bg-white text-[12px] text-[var(--hw-neutral-900)] placeholder:text-[var(--hw-neutral-400)] focus:outline-none focus:border-[var(--hw-green-700)]"
  />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-[var(--hw-neutral-400)]" />
            </button>}
        </div>

        <div className="flex rounded-lg border border-[var(--hw-neutral-200)] overflow-hidden shrink-0">
          {["all", "entered"].map((m) => <button
    key={m}
    onClick={() => setShowMode(m)}
    className={`px-3 py-2 text-[12px] font-medium transition-colors ${showMode === m ? "bg-[var(--hw-neutral-900)] text-white" : "text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
              {m === "all" ? "Show All" : "Show Entered Only"}
            </button>)}
        </div>

        {enteredCount > 0 && <span className="shrink-0 text-[12px] font-medium text-[var(--hw-green-700)]">
            {enteredCount} {enteredCount === 1 ? "volume" : "volumes"} entered
          </span>}
      </div>

      {
    /* Table */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden mb-5">

        {
    /* Desktop sticky header */
  }
        <div className="hidden md:grid grid-cols-[1fr_80px_1fr_1fr_110px] gap-3 px-4 py-2.5 bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)] sticky top-13 z-10">
          {["Commodity Name", "Unit", "Farm Source", "Other Source", "Combined Total"].map((h) => <div key={h} className="text-[11px] font-semibold text-[var(--hw-neutral-700)]">{h}</div>)}
        </div>

        {displayedCommodities.length === 0 ? <div className="px-4 py-10 text-center text-[13px] text-[var(--hw-neutral-700)]">
            {showMode === "entered" ? "No volumes entered yet." : "No commodities match the search."}
          </div> : displayedCommodities.map((com) => {
    const variants = getVariants(com).filter((v) => {
      if (!matchesVariant(com, v)) return false;
      if (showMode === "entered") return hasArrivalValue(fields[v.id] ?? { farmSource: "", farmObs: null, otherSource: "", otherObs: null, uom: "kg" });
      return true;
    });
    return <div key={com.id} className="border-b border-[var(--hw-neutral-100)] last:border-0">
                {
      /* Commodity name */
    }
                <div className="px-4 py-2 bg-white border-b border-[var(--hw-neutral-50)] flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{com.name}</span>
                  {!com.isHW && <span className="text-[10px] text-amber-700 font-medium border border-amber-200 rounded px-1.5 py-0.5 leading-none">Temporary</span>}
                  {com.isHW && <span className="text-[10px] text-[var(--hw-green-700)] font-medium">Arrival Pressure</span>}
                </div>

                {
      /* Variant rows */
    }
                {variants.map((v) => {
      const f = fields[v.id] ?? { farmSource: "", farmObs: null, otherSource: "", otherObs: null, uom: "kg" };
      const hasVal = hasArrivalValue(f);
      const total = combinedTotal(f);
      return <div key={v.id}>
                      {
        /* Desktop */
      }
                      <div className={`hidden md:grid grid-cols-[1fr_80px_1fr_1fr_110px] items-center gap-3 px-4 py-2.5 border-b border-[var(--hw-neutral-50)] last:border-0 ${hasVal ? "bg-[var(--hw-green-50)]/30" : ""}`}>
                        <span className="text-[13px] text-[var(--hw-neutral-700)] pl-2">{v.name}</span>
                        {
        /* UOM */
      }
                        <select
        value={f.uom}
        onChange={(e) => updateField(v.id, { uom: e.target.value })}
        className="w-full px-2 py-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[12px] text-[var(--hw-neutral-900)] bg-white focus:outline-none focus:border-[var(--hw-green-700)]"
      >
                          {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                        </select>
                        {
        /* Farm Source */
      }
                        <VolumeField
        variantId={v.id}
        fieldKey="farm"
        value={f.farmSource}
        obsStatus={f.farmObs}
        onChange={(val) => updateField(v.id, { farmSource: val, farmObs: null })}
        onObsChange={(s) => updateField(v.id, { farmObs: s, farmSource: "" })}
      />
                        {
        /* Other Source */
      }
                        <VolumeField
        variantId={v.id}
        fieldKey="other"
        value={f.otherSource}
        obsStatus={f.otherObs}
        onChange={(val) => updateField(v.id, { otherSource: val, otherObs: null })}
        onObsChange={(s) => updateField(v.id, { otherObs: s, otherSource: "" })}
      />
                        {
        /* Combined Total - read-only */
      }
                        <div className="px-2 py-1.5 rounded-lg border border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)] text-[12px] text-[var(--hw-neutral-700)] font-medium">
                          {total || "\u2014"}
                        </div>
                      </div>

                      {
        /* Mobile */
      }
                      <div className={`block md:hidden px-4 py-3 border-b border-[var(--hw-neutral-50)] last:border-0 ${hasVal ? "bg-[var(--hw-green-50)]/30" : ""}`}>
                        <p className="text-[13px] text-[var(--hw-neutral-800)] mb-2">{v.name}</p>
                        <div className="flex gap-2 mb-2">
                          <select
        value={f.uom}
        onChange={(e) => updateField(v.id, { uom: e.target.value })}
        className="w-20 px-2 py-2 rounded-lg border border-[var(--hw-neutral-200)] text-[11px] text-[var(--hw-neutral-900)] bg-white focus:outline-none"
      >
                            {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[12px] font-medium text-[var(--hw-neutral-700)] mb-1">Farm Source</p>
                            <VolumeField
        variantId={v.id}
        fieldKey="farm"
        value={f.farmSource}
        obsStatus={f.farmObs}
        onChange={(val) => updateField(v.id, { farmSource: val, farmObs: null })}
        onObsChange={(s) => updateField(v.id, { farmObs: s, farmSource: "" })}
      />
                          </div>
                          <div>
                            <p className="text-[12px] font-medium text-[var(--hw-neutral-700)] mb-1">Other Source</p>
                            <VolumeField
        variantId={v.id}
        fieldKey="other"
        value={f.otherSource}
        obsStatus={f.otherObs}
        onChange={(val) => updateField(v.id, { otherSource: val, otherObs: null })}
        onObsChange={(s) => updateField(v.id, { otherObs: s, otherSource: "" })}
      />
                          </div>
                        </div>
                        {total && <p className="text-[12px] text-[var(--hw-neutral-700)] mt-2">
                            Combined: <strong className="font-semibold">{total} {f.uom}</strong>
                          </p>}
                      </div>
                    </div>;
    })}

                {
      /* Add Variant */
    }
                {showMode === "all" && <div className="px-4 py-2 border-b border-[var(--hw-neutral-50)]">
                    {addingVariant === com.id ? <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[var(--hw-neutral-800)] pl-2">+</span>
                        <input
      autoFocus
      type="text"
      value={variantInput}
      onChange={(e) => setVariantInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commitVariant(com.id);
        if (e.key === "Escape") {
          setAddingVariant(null);
          setVariantInput("");
        }
      }}
      placeholder="Enter variety, grade, size, or descriptor"
      className="flex-1 px-2 py-1.5 text-[12px] text-[var(--hw-neutral-900)] border border-[var(--hw-green-700)] rounded-lg focus:outline-none"
    />
                        <button onClick={() => commitVariant(com.id)} className="px-2.5 py-1.5 rounded-lg bg-[var(--hw-green-700)] text-white text-[11px] font-medium">Add</button>
                        <button onClick={() => {
      setAddingVariant(null);
      setVariantInput("");
    }} className="px-2.5 py-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[13px] text-[var(--hw-neutral-800)]">Cancel</button>
                      </div> : <button
      onClick={() => {
        setAddingVariant(com.id);
        setVariantInput("");
      }}
      className="text-[12px] text-[var(--hw-green-700)] hover:underline pl-2"
    >
                        + Add Variant
                      </button>}
                  </div>}
              </div>;
  })}
      </div>

      {
    /* ActionBar */
  }
      <div className="h-14 md:hidden" />
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-[var(--hw-neutral-200)] shadow-[var(--shadow-lg)] px-4 py-3 flex items-center justify-between gap-3 md:static md:shadow-none md:border-0 md:px-0 md:py-0 md:bg-transparent md:mb-8">
        <button
    onClick={() => navigate("/dftc/input")}
    className="py-2.5 px-4 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
          Cancel
        </button>
        <button
    onClick={() => {
      setDataName(generateArrivalName(defaultDate));
      setReviewMode(true);
    }}
    disabled={!canReview}
    className="flex-1 md:flex-none md:min-w-[140px] py-2.5 px-4 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
  >
          {!canReview ? "Review (no data)" : `Review (${enteredCount})`}
        </button>
      </div>
    </div>;
}
export {
  DFTCArrivalInput as default
};
