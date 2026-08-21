import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Check, Navigation, Loader2, RefreshCw, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { HW_COMMODITY_ITEMS, getVariants } from "../../global/data/commodities";
import {
  inputCls,
  SUFFIX_OPTIONS,
  PW_REQS,
  Card,
  SectionLabel,
  FieldLabel,
  GreenBtn,
  GhostBtn,
  Toggle,
  Toast,
  Modal
} from "../../global/components/ui/hw-ui";
import { TextSizeSlider } from "../../global/components/settings/TextSizeSlider";
const TABS = [
  { id: "account", label: "Account" },
  { id: "farm", label: "Farm Profile" },
  { id: "preferences", label: "Preferences" },
  { id: "notifications", label: "Notifications" }
];
const SELLING_OPTIONS = [
  "To a buyer using farmgate price",
  "Directly in the market",
  "Through a trader",
  "Not sure yet"
];
const LANGUAGE_OPTIONS = [
  { value: "cebuano", label: "Cebuano / Bisaya" },
  { value: "english", label: "English" },
  { value: "tagalog", label: "Tagalog" }
];
const CROPS_LIST = HW_COMMODITY_ITEMS.map((c) => ({ id: c.id, name: c.name }));
const AccountTab = ({ showToast, onDeleteAccount }) => {
  const { user } = useAuth();
  const nameParts = (user?.name || "Juan Dela Cruz").split(" ");
  const [form, setForm] = useState({
    firstName: nameParts[0] || "",
    lastName: nameParts[nameParts.length - 1] || "",
    middleName: "",
    suffix: "None",
    phone: "09XX XXX XXXX",
    email: user?.email || ""
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [pw, setPw] = useState({ current: "", newPw: "", confirm: "" });
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCfm, setShowCfm] = useState(false);
  const [pwError, setPwError] = useState("");
  const handlePasswordSave = () => {
    if (!pw.current || !pw.newPw || !pw.confirm) {
      setPwError("Please fill in all fields.");
      return;
    }
    if (pw.newPw !== pw.confirm) {
      setPwError("Passwords do not match.");
      return;
    }
    if (!PW_REQS.every((r) => r.test(pw.newPw))) {
      setPwError("Password does not meet all requirements.");
      return;
    }
    setPwError("");
    setPw({ current: "", newPw: "", confirm: "" });
    showToast("Password updated successfully.");
  };
  const handlePasswordCancel = () => {
    setPw({ current: "", newPw: "", confirm: "" });
    setPwError("");
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const handleSave = () => {
    setShowSaveModal(false);
    showToast("Account updated successfully.");
  };
  const handleDelete = () => {
    if (deleteConfirm !== "DELETE") return;
    setShowDeleteModal(false);
    onDeleteAccount();
  };
  return <div className="space-y-4">
      <Card>
        <SectionLabel>Personal Information</SectionLabel>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="a-fn">First Name</FieldLabel>
              <input id="a-fn" type="text" value={form.firstName} onChange={set("firstName")} className={inputCls} />
            </div>
            <div>
              <FieldLabel htmlFor="a-ln">Last Name</FieldLabel>
              <input id="a-ln" type="text" value={form.lastName} onChange={set("lastName")} className={inputCls} />
            </div>
            <div>
              <FieldLabel htmlFor="a-mn" optional>Middle Name</FieldLabel>
              <input id="a-mn" type="text" value={form.middleName} onChange={set("middleName")} placeholder="Santos" className={inputCls} />
            </div>
            <div>
              <FieldLabel htmlFor="a-sfx" optional>Suffix</FieldLabel>
              <div className="relative">
                <select id="a-sfx" value={form.suffix} onChange={set("suffix")} className={`${inputCls} appearance-none pr-9`}>
                  {SUFFIX_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" fill="none" viewBox="0 0 10 6">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="a-ph">Phone Number</FieldLabel>
            <input id="a-ph" type="tel" inputMode="numeric" value={form.phone} onChange={set("phone")} className={inputCls} />
          </div>
          <div>
            <FieldLabel htmlFor="a-em">Email</FieldLabel>
            <input id="a-em" type="email" value={form.email} onChange={set("email")} className={inputCls} />
          </div>
          <GreenBtn onClick={() => setShowSaveModal(true)} className="w-full sm:w-auto">Save changes</GreenBtn>
        </div>
      </Card>

      <Card>
        <SectionLabel>Change Password</SectionLabel>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="f-cpw-cur">Current password</FieldLabel>
            <div className="relative">
              <input
    id="f-cpw-cur"
    type={showCur ? "text" : "password"}
    value={pw.current}
    onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
    placeholder="••••••••"
    className={`${inputCls} pr-11`}
  />
              <button
    type="button"
    onClick={() => setShowCur((v) => !v)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-400)] hover:text-black"
  >
                {showCur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="f-cpw-new">New password</FieldLabel>
            <div className="relative">
              <input
    id="f-cpw-new"
    type={showNew ? "text" : "password"}
    value={pw.newPw}
    onChange={(e) => setPw((p) => ({ ...p, newPw: e.target.value }))}
    placeholder="New password"
    className={`${inputCls} pr-11`}
  />
              <button
    type="button"
    onClick={() => setShowNew((v) => !v)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-400)] hover:text-black"
  >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pw.newPw && <ul className="space-y-1 mt-1">
                {PW_REQS.map((r) => {
    const ok = r.test(pw.newPw);
    return <li key={r.label} className={`flex items-center gap-1.5 text-[12px] ${ok ? "text-emerald-600" : "text-black"}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border ${ok ? "bg-emerald-500 border-emerald-500" : "border-[var(--hw-neutral-300)]"}`}>
                      {ok && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    {r.label}
                  </li>;
  })}
              </ul>}
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="f-cpw-cfm">Confirm new password</FieldLabel>
            <div className="relative">
              <input
    id="f-cpw-cfm"
    type={showCfm ? "text" : "password"}
    value={pw.confirm}
    onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
    placeholder="Repeat new password"
    className={`${inputCls} pr-11`}
  />
              <button
    type="button"
    onClick={() => setShowCfm((v) => !v)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-400)] hover:text-black"
  >
                {showCfm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {pwError && <p className="text-[13px] text-red-600">{pwError}</p>}
          <div className="flex gap-2 pt-1">
            <GhostBtn onClick={handlePasswordCancel}>Cancel</GhostBtn>
            <GreenBtn onClick={handlePasswordSave}>Update password</GreenBtn>
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel>Google Sign-In</SectionLabel>
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-[14px] font-semibold text-black">Google sign-in</p>
            <p className="text-[13px] text-black">{googleConnected ? "Connected" : "Not connected"}</p>
          </div>
          <button
    type="button"
    onClick={() => {
      setGoogleConnected((v) => !v);
      showToast(googleConnected ? "Google account disconnected." : "Google account connected.");
    }}
    className={`h-8 px-3 text-[13px] font-medium rounded-lg border transition-colors ${googleConnected ? "border-red-200 text-red-600 hover:bg-red-50" : "border-[var(--hw-green-700)] text-[var(--hw-green-700)] hover:bg-[var(--hw-green-50)]"}`}
  >
            {googleConnected ? "Disconnect" : "Connect"}
          </button>
        </div>
      </Card>

      <Card>
        <p className="text-[12px] font-semibold text-red-500 uppercase tracking-wide mb-3">Danger Zone</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] font-semibold text-black">Delete account</p>
            <p className="text-[13px] text-black">Permanently remove your account and all data.</p>
          </div>
          <button
    type="button"
    onClick={() => setShowDeleteModal(true)}
    className="h-8 px-3 text-[13px] font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0 ml-3"
  >
            Delete
          </button>
        </div>
      </Card>

      {showSaveModal && <Modal title="Save account changes?" onClose={() => setShowSaveModal(false)}>
          <p className="text-[14px] text-black mb-5">Your updated account information will be saved to your HarvestWise profile.</p>
          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={() => setShowSaveModal(false)}>Cancel</GhostBtn>
            <GreenBtn onClick={handleSave}>Save changes</GreenBtn>
          </div>
        </Modal>}

      {showDeleteModal && <Modal title="Delete account?" onClose={() => {
    setShowDeleteModal(false);
    setDeleteConfirm("");
  }}>
          <p className="text-[14px] text-black mb-4">
            This will permanently delete your HarvestWise account, saved farm profile, crop preferences, and crop plans. This action cannot be undone.
          </p>
          <div className="space-y-1.5 mb-5">
            <label className="block text-[14px] font-semibold text-black">
              Type <span className="font-mono text-red-600">DELETE</span> to confirm
            </label>
            <input
    type="text"
    value={deleteConfirm}
    onChange={(e) => setDeleteConfirm(e.target.value)}
    placeholder="DELETE"
    className={inputCls}
  />
          </div>
          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={() => {
    setShowDeleteModal(false);
    setDeleteConfirm("");
  }}>Cancel</GhostBtn>
            <button
    type="button"
    onClick={handleDelete}
    disabled={deleteConfirm !== "DELETE"}
    className="h-11 px-5 flex items-center bg-red-600 text-white text-[14px] font-semibold rounded-xl hover:bg-red-700 disabled:opacity-40 transition-colors"
  >
              Delete account
            </button>
          </div>
        </Modal>}
    </div>;
};
const FarmTab = ({ showToast }) => {
  const [loc, setLoc] = useState({ city: "Davao City", district: "Marilog", barangay: "Buda", farmSize: "1,500 sq m" });
  const [crops, setCrops] = useState({ Kamatis: "Diamante Big", Ampalaya: "", Lettuce: "", Talong: "" });
  const [selling, setSelling] = useState({ method: "To a buyer using farmgate price", area: "Bangkerohan buyer" });
  const [detecting, setDetecting] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const setLocField = (k) => (e) => setLoc((l) => ({ ...l, [k]: e.target.value }));
  const toggleCrop = (name) => {
    setCrops((prev) => {
      const next = { ...prev };
      if (name in next) delete next[name];
      else next[name] = "";
      return next;
    });
  };
  const handleDetect = () => {
    setDetecting(true);
    setTimeout(() => {
      setLoc((l) => ({ ...l, city: "Davao City", district: "Marilog", barangay: "Buda" }));
      setDetecting(false);
      setShowLocModal(false);
      showToast("Location detected and filled in.");
    }, 1800);
  };
  const handleSave = () => {
    setShowSaveModal(false);
    showToast("Farm profile updated successfully.");
  };
  return <div className="space-y-4">
      <Card>
        <SectionLabel>Farm Location</SectionLabel>
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
    type="button"
    onClick={() => setShowLocModal(true)}
    className="h-10 px-4 flex items-center gap-2 border border-[var(--hw-green-700)] text-[var(--hw-green-700)] text-[13px] font-medium rounded-xl hover:bg-[var(--hw-green-50)] transition-colors"
  >
            <Navigation className="w-4 h-4" />Use my location
          </button>
          <button
    type="button"
    onClick={() => document.getElementById("f-city")?.focus()}
    className="h-10 px-4 flex items-center border border-[var(--hw-neutral-200)] text-black text-[13px] font-medium rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            Enter manually
          </button>
        </div>
        <div className="space-y-3">
          {[
    { id: "f-city", key: "city", label: "City" },
    { id: "f-dis", key: "district", label: "District" },
    { id: "f-bar", key: "barangay", label: "Barangay" }
  ].map((f) => <div key={f.id}>
              <FieldLabel htmlFor={f.id}>{f.label}</FieldLabel>
              <input
    id={f.id}
    type="text"
    value={loc[f.key]}
    onChange={(e) => setLoc((l) => ({ ...l, [f.key]: e.target.value }))}
    className={inputCls}
  />
            </div>)}
          <div>
            <FieldLabel htmlFor="f-size" optional>Farm Size</FieldLabel>
            <input
    id="f-size"
    type="text"
    value={loc.farmSize}
    onChange={setLocField("farmSize")}
    placeholder="e.g. 1,500 sq m or 0.5 hectare"
    className={inputCls}
  />
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel>Preferred Crops</SectionLabel>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {CROPS_LIST.map((crop) => {
    const sel = crop.name in crops;
    return <button
      key={crop.id}
      type="button"
      onClick={() => toggleCrop(crop.name)}
      className={`flex items-center gap-2 h-12 px-3 text-[13px] font-medium rounded-xl border transition-all text-left ${sel ? "bg-[var(--hw-green-50)] border-[var(--hw-green-700)] text-[var(--hw-green-900)]" : "bg-white border-[var(--hw-neutral-200)] text-black hover:bg-[var(--hw-neutral-50)]"}`}
    >
                <CommodityIllustration commodityId={crop.id} className="w-7 h-7 flex-shrink-0" />
                <span className="truncate">{crop.name}</span>
              </button>;
  })}
        </div>
        {Object.keys(crops).length > 0 && <div className="pt-3 border-t border-[var(--hw-neutral-100)] space-y-2">
            <p className="text-[12px] font-semibold text-black uppercase tracking-wide">Preferred variety</p>
            {Object.keys(crops).map((name) => {
    const vars = getVariants(name);
    if (!vars.length) return null;
    return <div key={name} className="flex items-center gap-3">
                  <span className="text-[13px] text-black flex-1 truncate">{name}</span>
                  <div className="relative flex-shrink-0">
                    <select
      value={crops[name]}
      onChange={(e) => setCrops((p) => ({ ...p, [name]: e.target.value }))}
      className="h-9 pl-3 pr-8 text-[13px] text-black bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-700)] appearance-none"
    >
                      <option value="">Default</option>
                      {vars.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-black pointer-events-none" fill="none" viewBox="0 0 10 6">
                      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>;
  })}
          </div>}
      </Card>

      <Card>
        <SectionLabel>Selling Preference</SectionLabel>
        <div className="space-y-2 mb-3">
          {SELLING_OPTIONS.map((opt) => <button
    key={opt}
    type="button"
    onClick={() => setSelling((s) => ({ ...s, method: opt }))}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-[14px] font-medium transition-all text-left ${selling.method === opt ? "bg-[var(--hw-green-50)] border-[var(--hw-green-700)] text-[var(--hw-green-900)]" : "bg-white border-[var(--hw-neutral-200)] text-black hover:bg-[var(--hw-neutral-50)]"}`}
  >
              {opt}
              {selling.method === opt && <div className="w-5 h-5 rounded-full bg-[var(--hw-green-700)] flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>}
            </button>)}
        </div>
        <div>
          <FieldLabel htmlFor="f-area" optional>Usual selling area or buyer type</FieldLabel>
          <input
    id="f-area"
    type="text"
    value={selling.area}
    onChange={(e) => setSelling((s) => ({ ...s, area: e.target.value }))}
    placeholder="e.g. Bangkerohan market, direct buyer"
    className={inputCls}
  />
        </div>
      </Card>

      <GreenBtn onClick={() => setShowSaveModal(true)} className="w-full">Save farm profile</GreenBtn>

      {showLocModal && <Modal title="Turn on location?" onClose={() => setShowLocModal(false)}>
          <p className="text-[14px] text-black mb-5">HarvestWise will use your device location to help fill your farm location details. You can still edit the fields manually.</p>
          <div className="space-y-2">
            <GreenBtn onClick={handleDetect} disabled={detecting} className="w-full gap-2">
              {detecting ? <><Loader2 className="w-4 h-4 animate-spin" />Detecting location…</> : <><Navigation className="w-4 h-4" />Use location</>}
            </GreenBtn>
            <GhostBtn onClick={() => setShowLocModal(false)} className="w-full">Cancel</GhostBtn>
          </div>
        </Modal>}

      {showSaveModal && <Modal title="Save farm profile changes?" onClose={() => setShowSaveModal(false)}>
          <p className="text-[14px] text-black mb-5">HarvestWise will use this information to personalize your crop advisories, weather context, and saved profile.</p>
          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={() => setShowSaveModal(false)}>Cancel</GhostBtn>
            <GreenBtn onClick={handleSave}>Save changes</GreenBtn>
          </div>
        </Modal>}
    </div>;
};
const PreferencesTab = ({ showToast }) => {
  const { effectiveLanguage: language, setLanguage } = useLanguage();
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  const handleLanguage = (lang) => {
    setLanguage(lang);
    showToast("Language preference updated.");
  };

  const handleSync = () => {
    setSyncing(true);
    setSyncStatus(null);
    setTimeout(() => {
      setSyncing(false);
      setSyncStatus("ok");
      showToast("Offline data updated successfully.");
    }, 2200);
  };

  return <div className="space-y-4">
      <Card>
        <SectionLabel>Language</SectionLabel>
        <div className="space-y-2">
          {LANGUAGE_OPTIONS.map((lang) => <button
    key={lang.value}
    type="button"
    onClick={() => handleLanguage(lang.value)}
    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-[14px] font-medium transition-all ${language === lang.value ? "bg-[var(--hw-green-50)] border-[var(--hw-green-700)] text-[var(--hw-green-900)]" : "bg-white border-[var(--hw-neutral-200)] text-black hover:bg-[var(--hw-neutral-50)]"}`}
  >
              {lang.label}
              {language === lang.value && <div className="w-5 h-5 rounded-full bg-[var(--hw-green-700)] flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>}
            </button>)}
        </div>
      </Card>

      <TextSizeSlider
    showToast={showToast}
    description="Adjusts text size across Profile, Settings, and app pages."
  />

      <Card>
        <SectionLabel>Offline Data</SectionLabel>
        <div className="space-y-2.5 mb-4">
          {[
    { label: "Last synced", value: "Today, 7:30 AM" },
    { label: "Offline data", value: "Available" },
    { label: "Status", value: syncStatus === "ok" ? "Updated" : syncStatus === "error" ? "Sync failed" : "Up to date" }
  ].map((row) => <div key={row.label} className="flex items-center justify-between">
              <span className="text-[14px] text-black">{row.label}</span>
              <span className={`text-[14px] font-medium ${row.label === "Status" && syncStatus === "error" ? "text-red-600" : "text-black"}`}>
                {row.value}
              </span>
            </div>)}
        </div>
        <button
    type="button"
    onClick={handleSync}
    disabled={syncing}
    className="h-10 px-4 flex items-center gap-2 border border-[var(--hw-neutral-200)] text-[14px] font-medium text-black rounded-xl hover:bg-[var(--hw-neutral-50)] disabled:opacity-60 transition-colors"
  >
          {syncing ? <><Loader2 className="w-4 h-4 animate-spin" />Syncing latest data…</> : <><RefreshCw className="w-4 h-4" />Sync now</>}
        </button>
      </Card>
    </div>;
};
const NOTIF_ITEMS = [
  { id: "weather", label: "Weather reminders", desc: "Get notified when weather may affect your saved crops." },
  { id: "harvest", label: "Harvest reminders", desc: "Get reminded before your expected harvest date." },
  { id: "planting", label: "Planting schedule reminders", desc: "Get reminders for planned crop activities." },
  { id: "price", label: "Price movement alerts", desc: "Get notified when selected crop prices move significantly." },
  { id: "sync", label: "Offline sync reminders", desc: "Get reminded when your saved data needs updating." }
];
const NotificationsTab = ({ showToast }) => {
  const [prefs, setPrefs] = useState({
    weather: true,
    harvest: true,
    planting: true,
    price: false,
    sync: true
  });
  const toggle = (id) => {
    setPrefs((p) => ({ ...p, [id]: !p[id] }));
    showToast("Notification preference updated.");
  };
  return <Card>
      <SectionLabel>Notification Preferences</SectionLabel>
      <div className="divide-y divide-[var(--hw-neutral-100)]">
        {NOTIF_ITEMS.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-black">{item.label}</p>
              <p className="text-[13px] text-black mt-0.5 leading-relaxed">{item.desc}</p>
            </div>
            <Toggle on={prefs[item.id]} onChange={() => toggle(item.id)} />
          </div>)}
      </div>
    </Card>;
};
function FarmerSettings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [params] = useSearchParams();
  const tabFromUrl = params.get("tab") || "account";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [toast, setToast] = useState("");
  const tabBarRef = useRef(null);

  useEffect(() => {
    const t = params.get("tab") || "account";
    setActiveTab(t);
  }, [params]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3e3);
  };

  const handleDeleteAccount = () => {
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const bar = tabBarRef.current;
    if (!bar) return;
    const btn = bar.querySelector('[data-active="true"]');
    if (btn) btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeTab]);

  return <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-black">Settings</h1>
        <p className="text-[15px] text-black mt-0.5">Manage your account, farm profile, and app preferences.</p>
      </div>

      <div
    ref={tabBarRef}
    className="flex gap-1 border-b border-[var(--hw-neutral-200)] mb-5 -mx-4 px-4"
    style={{ overflowX: "auto", scrollbarWidth: "none" }}
  >
        {TABS.map((tab) => <button
    key={tab.id}
    data-active={activeTab === tab.id ? "true" : "false"}
    type="button"
    onClick={() => setActiveTab(tab.id)}
    className={`flex-shrink-0 px-3.5 py-2.5 text-[14px] font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)]" : "border-transparent text-black hover:text-[var(--hw-green-700)]"}`}
  >
            {tab.label}
          </button>)}
      </div>

      {activeTab === "account" && <AccountTab showToast={showToast} onDeleteAccount={handleDeleteAccount} />}
      {activeTab === "farm" && <FarmTab showToast={showToast} />}
      {activeTab === "preferences" && <PreferencesTab showToast={showToast} />}
      {activeTab === "notifications" && <NotificationsTab showToast={showToast} />}

      <Toast message={toast} />
    </div>;
}
export {
  FarmerSettings as default
};
