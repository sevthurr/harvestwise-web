import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Plus,
  Check,
  AlertCircle,
  Cloud,
  CloudOff,
  Info,
  CheckCircle2,
  Leaf
} from "lucide-react";
import {
  PRICE_CATEGORIES,
  UOM_OPTIONS
} from "./dftc-add-data-data";
import { CommodityIllustration, COMMODITY_REGISTRY } from "../../global/components/shared/CommodityIllustrations";
import { HW_NAME_TO_ID as _HW_NAME_TO_ID } from "../../global/data/commodities";
function hwId(name) {
  return _HW_NAME_TO_ID[name] ?? null;
}
function hasHWIcon(name) {
  const id = hwId(name);
  return id !== null && id in COMMODITY_REGISTRY;
}
const CATEGORY_OPTIONS = [
  { id: "lowland", name: "Lowland Vegetables" },
  { id: "highland", name: "Highland Vegetables" },
  { id: "spices", name: "Spices" },
  { id: "rootcrops", name: "Rootcrops" },
  { id: "fruits", name: "Fruits" },
  { id: "others", name: "Others" }
];
function formatDateLabel(iso) {
  const d = /* @__PURE__ */ new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}
function generateDataName(setup) {
  const dateStr = formatDateLabel(setup.date);
  const marketShort = setup.market.includes("Bangkerohan") ? "Bangkerohan" : "DFTC";
  return `${marketShort} ${setup.priceType} Prices \u2014 ${dateStr}`;
}
function hasValue(f) {
  return f.price !== "";
}
function SetupModal({ initial, onClose, onApply }) {
  const [market, setMarket] = useState(initial.market);
  const [priceType, setPriceType] = useState(initial.priceType);
  const [changingDate, setChangingDate] = useState(false);
  const [customDate, setCustomDate] = useState(initial.date);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  const priceMarkets = ["Bangkerohan Public Market", "DFTC Taboan"];
  const priceTypes = ["Retail", "Wholesale", "Landing"];
  function handleApply() {
    const date = changingDate ? customDate : initial.date;
    onApply({ ...initial, market, priceType, date });
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--hw-neutral-100)]">
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Change Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)]">
            <X className="w-4 h-4 text-[var(--hw-neutral-600)]" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Market</label>
            <select
    value={market}
    onChange={(e) => setMarket(e.target.value)}
    className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
  >
              {priceMarkets.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Price Type</label>
            <div className="flex gap-2">
              {priceTypes.map((pt) => <button
    key={pt}
    onClick={() => setPriceType(pt)}
    className={`flex-1 py-2 rounded-xl border text-[13px] font-medium transition-colors ${priceType === pt ? "border-[var(--hw-green-700)] bg-[var(--hw-green-50)] text-[var(--hw-green-800)]" : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                  {pt}
                </button>)}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Date</label>
            {changingDate ? <div className="flex gap-2 items-center">
                <input
    type="date"
    value={customDate}
    onChange={(e) => setCustomDate(e.target.value)}
    className="flex-1 px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
  />
                <button onClick={() => {
    setChangingDate(false);
    setCustomDate(initial.date);
  }} className="text-[12px] text-[var(--hw-green-700)] underline whitespace-nowrap">
                  Reset
                </button>
              </div> : <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]">
                <span className="text-[13px] text-[var(--hw-neutral-900)]">{formatDateLabel(initial.date)}</span>
                <button onClick={() => setChangingDate(true)} className="text-[12px] text-[var(--hw-green-700)] underline ml-3 shrink-0">
                  Change Date
                </button>
              </div>}
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors">
            Cancel
          </button>
          <button onClick={handleApply} className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors">
            Apply Changes
          </button>
        </div>
      </div>
    </div>;
}
function AddCommodityModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("lowland");
  const [variant, setVariant] = useState("");
  const [uom, setUom] = useState("kg");
  const [error, setError] = useState("");
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  function handleAdd() {
    if (!name.trim()) {
      setError("Commodity name is required.");
      return;
    }
    const result = onAdd(name.trim(), categoryId, variant.trim(), uom);
    if (result) {
      setError(result);
      return;
    }
    onClose();
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--hw-neutral-100)]">
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Add New Commodity</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)]">
            <X className="w-4 h-4 text-[var(--hw-neutral-600)]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Commodity Name</label>
            <input
    type="text"
    value={name}
    onChange={(e) => {
      setName(e.target.value);
      setError("");
    }}
    placeholder="e.g. Batong (Negrostar)"
    className={`w-full px-3 py-2.5 rounded-xl border text-[13px] text-[var(--hw-neutral-900)] bg-white focus:outline-none focus:border-[var(--hw-green-700)] ${error && !name.trim() ? "border-red-400" : "border-[var(--hw-neutral-200)]"}`}
    autoFocus
  />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Source Category</label>
            <select
    value={categoryId}
    onChange={(e) => setCategoryId(e.target.value)}
    className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
  >
              {CATEGORY_OPTIONS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">
              Initial Variant / Descriptor
              <span className="text-[12px] text-[var(--hw-neutral-800)] ml-1.5 font-normal">(optional)</span>
            </label>
            <input
    type="text"
    value={variant}
    onChange={(e) => setVariant(e.target.value)}
    placeholder="e.g. Regular, Local, Large"
    className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
  />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Default Unit of Measurement</label>
            <select
    value={uom}
    onChange={(e) => setUom(e.target.value)}
    className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
  >
              {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>

          {error && <p className="text-[12px] text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </p>}

          <p className="text-[13px] text-[var(--hw-neutral-800)]">
            Newly added commodities are not automatically included in HarvestWise analytics. They will be securely retained in all reports and downloads.
          </p>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors">
            Cancel
          </button>
          <button onClick={handleAdd} className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors">
            Add Commodity
          </button>
        </div>
      </div>
    </div>;
}
function HWInfoOverlay({ onClose }) {
  return <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
    className="absolute bg-white rounded-xl shadow-[var(--shadow-lg)] p-4 border border-[var(--hw-neutral-200)] max-w-xs"
    style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
    onClick={(e) => e.stopPropagation()}
  >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hw-green-700)] shrink-0" />
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">Supported by HarvestWise</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-0.5 rounded hover:bg-[var(--hw-neutral-100)]">
            <X className="w-3.5 h-3.5 text-[var(--hw-neutral-600)]" />
          </button>
        </div>
        <p className="text-[11px] text-[var(--hw-neutral-800)] leading-relaxed">
          This commodity receives price-trend analytics, forecasting, and farmer-facing decision support from HarvestWise.
        </p>
      </div>
    </div>;
}
function AnalyticsCoverageOverlay({ onClose }) {
  return <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
    className="absolute bg-white rounded-xl shadow-[var(--shadow-lg)] p-4 border border-[var(--hw-neutral-200)] max-w-sm"
    style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
    onClick={(e) => e.stopPropagation()}
  >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[var(--hw-green-700)] shrink-0" />
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">About Analytics Coverage</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-0.5 rounded hover:bg-[var(--hw-neutral-100)]">
            <X className="w-3.5 h-3.5 text-[var(--hw-neutral-600)]" />
          </button>
        </div>
        <p className="text-[12px] text-[var(--hw-neutral-800)] leading-relaxed mb-3">
          HarvestWise currently provides analytics and price-trend support for{" "}
          <strong>Kamatis, Talong, Repolyo, Atsal, Carrots, Pipino, Ampalaya, Kalabasa, Lettuce, and Chinese Pechay.</strong>
        </p>
        <p className="text-[12px] text-[var(--hw-neutral-800)] leading-relaxed">
          Records for all other commodities are securely saved and remain available in reports and downloads. Analytics support continues to expand over time.
        </p>
        <button onClick={onClose} className="mt-3 text-[12px] text-[var(--hw-green-700)] underline">Close</button>
      </div>
    </div>;
}
function DFTCPriceInput() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state;
  const defaultSetup = navState ?? {
    dataType: "Price Data",
    market: "Bangkerohan Public Market",
    priceType: "Retail",
    date: "2026-08-02"
  };
  const [setup, setSetup] = useState(defaultSetup);
  const [setupModalOpen, setSetupModalOpen] = useState(!navState);
  const [fields, setFields] = useState({});
  const [collapsed, setCollapsed] = useState(/* @__PURE__ */ new Set());
  const [customVariants, setCustomVariants] = useState({});
  const [addingVariant, setAddingVariant] = useState(null);
  const [variantInput, setVariantInput] = useState("");
  const [customCommodities, setCustomCommodities] = useState({});
  const [addCommodityOpen, setAddCommodityOpen] = useState(false);
  const [hwInfoId, setHwInfoId] = useState(null);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMode, setShowMode] = useState("all");
  const [saveStatus, setSaveStatus] = useState("idle");
  const saveTimer = useRef(null);
  const oldTimer = useRef(null);
  const [hasDraft, setHasDraft] = useState(() => {
    try {
      return localStorage.getItem("dftc_price_draft") === "true";
    } catch {
      return false;
    }
  });
  const [draftDismissed, setDraftDismissed] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [dataName, setDataName] = useState(() => generateDataName(defaultSetup));
  const [saved, setSaved] = useState(false);
  const triggerAutosave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (oldTimer.current) clearTimeout(oldTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(() => {
      setSaveStatus("saved");
      try {
        localStorage.setItem("dftc_price_draft", "true");
      } catch {
      }
      oldTimer.current = setTimeout(() => setSaveStatus("savedOld"), 3e4);
    }, 1500);
  }, []);
  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (oldTimer.current) clearTimeout(oldTimer.current);
  }, []);
  function updateField(variantId, patch) {
    setFields((prev) => ({
      ...prev,
      [variantId]: { price: "", uom: "kg", ...prev[variantId], ...patch }
    }));
    triggerAutosave();
  }
  function toggleCategory(catId) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }
  function collapseAll() {
    setCollapsed(new Set(PRICE_CATEGORIES.map((c) => c.id)));
  }
  function getAllCommodities(cat) {
    return [...cat.commodities, ...customCommodities[cat.id] ?? []];
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
    const newId = `custom-${commodityId}-${Date.now()}`;
    setCustomVariants((prev) => ({
      ...prev,
      [commodityId]: [...prev[commodityId] ?? [], { id: newId, name: trimmed }]
    }));
    setAddingVariant(null);
    setVariantInput("");
    triggerAutosave();
  }
  function handleAddCommodity(name, categoryId, variant, uom) {
    const cat = PRICE_CATEGORIES.find((c) => c.id === categoryId);
    const existingNames = [
      ...cat?.commodities ?? [],
      ...customCommodities[categoryId] ?? []
    ].map((c) => c.name.toLowerCase().trim());
    if (existingNames.includes(name.toLowerCase())) {
      return `"${name}" already exists in that category.`;
    }
    const newId = `custom-com-${categoryId}-${Date.now()}`;
    const variantId = `custom-v-${newId}`;
    const variantName = variant || "Regular";
    const newCom = {
      id: newId,
      name,
      isHW: false,
      variants: [{ id: variantId, name: variantName }]
    };
    setFields((prev) => ({
      ...prev,
      [variantId]: { price: "", uom }
    }));
    setCustomCommodities((prev) => ({
      ...prev,
      [categoryId]: [...prev[categoryId] ?? [], newCom]
    }));
    return null;
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
  const enteredCount = Object.values(fields).filter(hasValue).length;
  const reviewEntries = PRICE_CATEGORIES.flatMap(
    (cat) => getAllCommodities(cat).flatMap(
      (com) => getVariants(com).filter((v) => hasValue(fields[v.id] ?? { price: "", uom: "kg" })).map((v) => ({ cat, com, v, f: fields[v.id] }))
    )
  );
  const hwCount = reviewEntries.filter((e) => e.com.isHW).length;
  const otherCount = reviewEntries.filter((e) => !e.com.isHW).length;
  const canReview = reviewEntries.length > 0;
  function handleSave() {
    try {
      localStorage.removeItem("dftc_price_draft");
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
    const byCategory = PRICE_CATEGORIES.map((cat) => ({
      cat,
      entries: getAllCommodities(cat).flatMap(
        (com) => getVariants(com).filter((v) => hasValue(fields[v.id] ?? { price: "", uom: "kg" })).map((v) => ({ com, v, f: fields[v.id] }))
      )
    })).filter((g) => g.entries.length > 0);
    return <div className="px-4 md:px-8 lg:px-10 py-5 max-w-[1240px] mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">Add Price Data</h1>
            <p className="text-[13px] text-[var(--hw-neutral-700)] mt-1">
              {setup.market} · {setup.priceType} · {formatDateLabel(setup.date)}
            </p>
          </div>
          <SaveStatusIndicator />
        </div>

        <div className="bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl px-4 py-3 mb-5 flex items-center justify-between gap-4">
          <p className="text-[13px] text-[var(--hw-neutral-800)]">Showing only commodities with entered values. Review and edit before saving.</p>
          <button onClick={() => setReviewMode(false)} className="shrink-0 text-[13px] text-[var(--hw-green-700)] underline whitespace-nowrap">
            Back to Full Entry
          </button>
        </div>

        <div className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-3 mb-5">
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[12px]">
            <span className="text-[var(--hw-neutral-800)]"><strong className="font-semibold">{reviewEntries.length}</strong> Total Records</span>
            <span className="text-[var(--hw-neutral-800)]"><strong className="font-semibold text-[var(--hw-green-700)]">{hwCount}</strong> Analytics-Supported Commodity Records</span>
            {otherCount > 0 && <span className="text-[var(--hw-neutral-800)]"><strong className="font-semibold">{otherCount}</strong> Other Commodity Records</span>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden mb-5">
          {byCategory.map(({ cat, entries }) => <div key={cat.id}>
              <div className="px-4 py-2 bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                <span className="text-[12px] font-semibold text-[var(--hw-neutral-800)] uppercase tracking-wide">{cat.name}</span>
              </div>
              {entries.map(({ com, v, f }) => <div key={v.id} className="grid grid-cols-[1fr_120px_160px] items-center gap-3 px-4 py-2.5 border-b border-[var(--hw-neutral-100)] last:border-0 hover:bg-[var(--hw-neutral-50)]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {com.isHW && hasHWIcon(com.name) ? <CommodityIllustration commodityId={hwId(com.name)} className="w-4 h-4 shrink-0" /> : <Leaf className={`w-3.5 h-3.5 shrink-0 ${com.isHW ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-400)]"}`} />}
                    <span className="text-[12px] font-medium text-[var(--hw-neutral-700)]">{com.name}</span>
                    <span className="text-[12px] text-[var(--hw-neutral-900)]">{v.name}</span>
                  </div>
                  <select
      value={f?.uom ?? "kg"}
      onChange={(e) => updateField(v.id, { uom: e.target.value })}
      className="w-full px-2 py-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[12px] text-[var(--hw-neutral-900)] bg-white focus:outline-none focus:border-[var(--hw-green-700)]"
    >
                    {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <div className="flex-1 flex items-center border border-[var(--hw-neutral-200)] rounded-lg overflow-hidden focus-within:border-[var(--hw-green-700)]">
                    <span className="px-2 text-[12px] text-[var(--hw-neutral-800)] border-r border-[var(--hw-neutral-200)]">₱</span>
                    <input
      type="number"
      min="0"
      step="0.01"
      value={f?.price ?? ""}
      onChange={(e) => updateField(v.id, { price: e.target.value })}
      placeholder="0.00"
      className="flex-1 px-2 py-1.5 text-[12px] text-[var(--hw-neutral-900)] focus:outline-none min-w-0 bg-white"
    />
                  </div>
                </div>)}
            </div>)}
        </div>

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
        localStorage.removeItem("dftc_price_draft");
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
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">Add Price Data</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[13px] text-[var(--hw-neutral-700)]">
              {setup.market} · {setup.priceType} · {formatDateLabel(setup.date)}
            </span>
            <button onClick={() => setSetupModalOpen(true)} className="text-[12px] text-[var(--hw-green-700)] underline">
              Change Details
            </button>
          </div>
        </div>
        <SaveStatusIndicator />
      </div>

      {
    /* Analytics coverage note */
  }
      <div className="mb-3">
        <button
    onClick={() => setCoverageOpen(true)}
    className="flex items-center gap-1.5 text-[12px] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] transition-colors"
  >
          <Info className="w-3.5 h-3.5 text-[var(--hw-neutral-800)] shrink-0" />
          <span>About analytics coverage</span>
        </button>
      </div>

      {
    /* Price table — toolbar and column header in same card */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden mb-5">

        {
    /* Toolbar */
  }
        <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-[var(--hw-neutral-200)]">
          {
    /* Search */
  }
          <div className="relative flex-1 min-w-[160px]">
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

          {
    /* Add Commodity button */
  }
          <button
    onClick={() => setAddCommodityOpen(true)}
    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--hw-green-700)] text-white text-[12px] font-medium hover:bg-[var(--hw-green-800)] transition-colors"
  >
            <Plus className="w-3.5 h-3.5" />
            Add Commodity
          </button>

          {
    /* Show All / Entered Only */
  }
          <div className="flex rounded-lg border border-[var(--hw-neutral-200)] overflow-hidden shrink-0">
            {["all", "entered"].map((m) => <button
    key={m}
    onClick={() => setShowMode(m)}
    className={`px-3 py-2 text-[12px] font-medium transition-colors ${showMode === m ? "bg-[var(--hw-neutral-900)] text-white" : "text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                {m === "all" ? "Show All" : "Show Entered Only"}
              </button>)}
          </div>

          {
    /* Collapse All */
  }
          <button
    onClick={collapseAll}
    className="shrink-0 px-3 py-2 rounded-lg border border-[var(--hw-neutral-200)] text-[12px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            Collapse All
          </button>

          {
    /* Entered count */
  }
          {enteredCount > 0 && <span className="shrink-0 text-[12px] font-medium text-[var(--hw-green-700)]">
              {enteredCount} {enteredCount === 1 ? "price" : "prices"} entered
            </span>}
        </div>

        {
    /* Sticky column headers */
  }
        <div className="hidden md:grid grid-cols-[1fr_140px_180px] gap-3 px-4 py-2 bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)] sticky top-[52px] z-10">
          <div className="text-[11px] font-semibold text-[var(--hw-neutral-800)]">Commodity Name</div>
          <div className="text-[11px] font-semibold text-[var(--hw-neutral-800)]">Unit of Measurement</div>
          <div className="text-[11px] font-semibold text-[var(--hw-neutral-800)]">Price</div>
        </div>

        {PRICE_CATEGORIES.map((cat) => {
    const isCollapsed = collapsed.has(cat.id);
    const catCommodities = getAllCommodities(cat).filter((com) => {
      const variants = getVariants(com);
      if (!matchesCommodity(com, variants)) return false;
      if (showMode === "entered") {
        return variants.some((v) => hasValue(fields[v.id] ?? { price: "", uom: "kg" }));
      }
      return true;
    });
    if (catCommodities.length === 0) return null;
    return <div key={cat.id}>
              <button
      onClick={() => toggleCategory(cat.id)}
      className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-100)] transition-colors"
    >
                <span className="text-[12px] font-semibold text-[var(--hw-neutral-800)] uppercase tracking-wide">{cat.name}</span>
                {isCollapsed ? <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-800)]" /> : <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-800)]" />}
              </button>

              {!isCollapsed && catCommodities.map((com) => {
      const variants = getVariants(com).filter((v) => {
        if (!matchesVariant(com, v)) return false;
        if (showMode === "entered") return hasValue(fields[v.id] ?? { price: "", uom: "kg" });
        return true;
      });
      return <div key={com.id} className="border-b border-[var(--hw-neutral-100)] last:border-0">
                    {
        /* Commodity name row */
      }
                    <div className="px-4 py-2 bg-white flex items-center gap-2 border-b border-[var(--hw-neutral-50)]">
                      {com.isHW && hasHWIcon(com.name) ? <CommodityIllustration commodityId={hwId(com.name)} className="w-5 h-5 shrink-0" /> : <Leaf className={`w-4 h-4 shrink-0 ${com.isHW ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-400)]"}`} />}
                      <span className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{com.name}</span>
                      {com.isHW && <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hw-green-700)] shrink-0" />
                          <button
        onClick={() => setHwInfoId(hwInfoId === com.id ? null : com.id)}
        className="p-0.5 rounded hover:bg-[var(--hw-neutral-100)] transition-colors"
        title="HarvestWise supported"
      >
                            <Info className="w-3 h-3 text-[var(--hw-neutral-800)]" />
                          </button>
                        </>}
                    </div>

                    {
        /* Variant rows */
      }
                    {variants.map((v) => {
        const f = fields[v.id] ?? { price: "", uom: "kg" };
        const hasVal = hasValue(f);
        return <div key={v.id}>
                          {
          /* Desktop row */
        }
                          <div className={`hidden md:grid grid-cols-[1fr_140px_180px] items-center gap-3 px-4 py-2.5 border-b border-[var(--hw-neutral-50)] last:border-0 ${hasVal ? "bg-[var(--hw-green-50)]/40" : ""}`}>
                            <span className="text-[13px] text-[var(--hw-neutral-800)] pl-6">{v.name}</span>
                            <select
          value={f.uom || "kg"}
          onChange={(e) => updateField(v.id, { uom: e.target.value })}
          className="w-full px-2 py-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[12px] text-[var(--hw-neutral-900)] bg-white focus:outline-none focus:border-[var(--hw-green-700)]"
        >
                              {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                            </select>
                            <div className="flex items-center border border-[var(--hw-neutral-200)] rounded-lg overflow-hidden focus-within:border-[var(--hw-green-700)]">
                              <span className="px-2 text-[12px] text-[var(--hw-neutral-800)] border-r border-[var(--hw-neutral-200)] py-1.5 shrink-0">₱</span>
                              <input
          type="number"
          min="0"
          step="0.01"
          value={f.price}
          onChange={(e) => updateField(v.id, { price: e.target.value })}
          placeholder="0.00"
          className="flex-1 px-2 py-1.5 text-[12px] text-[var(--hw-neutral-900)] focus:outline-none min-w-0 bg-white"
        />
                            </div>
                          </div>

                          {
          /* Mobile row */
        }
                          <div className={`block md:hidden px-4 py-3 border-b border-[var(--hw-neutral-50)] last:border-0 ${hasVal ? "bg-[var(--hw-green-50)]/40" : ""}`}>
                            <p className="text-[13px] text-[var(--hw-neutral-800)] mb-2 pl-2">{v.name}</p>
                            <div className="flex items-center gap-2">
                              <select
          value={f.uom || "kg"}
          onChange={(e) => updateField(v.id, { uom: e.target.value })}
          className="w-24 px-2 py-2 rounded-lg border border-[var(--hw-neutral-200)] text-[12px] text-[var(--hw-neutral-900)] bg-white focus:outline-none"
        >
                                {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                              </select>
                              <div className="flex-1 flex items-center border border-[var(--hw-neutral-200)] rounded-lg overflow-hidden focus-within:border-[var(--hw-green-700)]">
                                <span className="px-2 text-[12px] text-[var(--hw-neutral-800)] border-r border-[var(--hw-neutral-200)] py-2 shrink-0">₱</span>
                                <input
          type="number"
          min="0"
          step="0.01"
          value={f.price}
          onChange={(e) => updateField(v.id, { price: e.target.value })}
          placeholder="0.00"
          className="flex-1 px-2 py-2 text-[12px] text-[var(--hw-neutral-900)] focus:outline-none min-w-0 bg-white"
        />
                              </div>
                            </div>
                          </div>
                        </div>;
      })}

                    {
        /* Add Variant */
      }
                    {showMode === "all" && <div className="px-4 py-2 border-b border-[var(--hw-neutral-50)]">
                        {addingVariant === com.id ? <div className="flex items-center gap-2">
                            <span className="text-[12px] text-[var(--hw-neutral-800)] pl-6">+</span>
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
        className="text-[12px] text-[var(--hw-green-700)] hover:underline pl-6"
      >
                            + Add Variant
                          </button>}
                      </div>}
                  </div>;
    })}
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
      setDataName(generateDataName(setup));
      setReviewMode(true);
    }}
    disabled={!canReview}
    className="flex-1 md:flex-none md:min-w-[160px] py-2.5 px-4 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
  >
          {!canReview ? "Review (no data)" : `Review (${reviewEntries.length} entries)`}
        </button>
      </div>

      {
    /* Modals */
  }
      {setupModalOpen && <SetupModal
    initial={setup}
    onClose={() => setSetupModalOpen(false)}
    onApply={(s) => {
      setSetup(s);
      setDataName(generateDataName(s));
      setSetupModalOpen(false);
    }}
  />}
      {addCommodityOpen && <AddCommodityModal
    onClose={() => setAddCommodityOpen(false)}
    onAdd={handleAddCommodity}
  />}
      {hwInfoId && <HWInfoOverlay onClose={() => setHwInfoId(null)} />}
      {coverageOpen && <AnalyticsCoverageOverlay onClose={() => setCoverageOpen(false)} />}
    </div>;
}
export {
  DFTCPriceInput as default
};
