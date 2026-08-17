import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { Loader2, RefreshCw, Eye, EyeOff, Check } from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
import { useLanguage } from "../../global/contexts/LanguageContext";
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
  { id: "submissions", label: "Submissions" },
  { id: "preferences", label: "Preferences" },
  { id: "notifications", label: "Notifications" }
];
const NOTIF_ITEMS = [
  { id: "submission_accepted", label: "Submission accepted", desc: "Get notified when submitted records are accepted for processing.", defaultOn: true },
  { id: "submission_failed", label: "Submission failed", desc: "Get notified when a submission fails and needs attention.", defaultOn: true },
  { id: "needs_correction", label: "Records need correction", desc: "Get notified when submitted records require review or correction.", defaultOn: true },
  { id: "upload_validated", label: "Upload validation completed", desc: "Get notified when an uploaded dataset has finished validation.", defaultOn: true },
  { id: "temp_expiry", label: "Temporary records near expiry", desc: "Get notified when temporary market records are close to their 15-day retention period.", defaultOn: true },
  { id: "sync_issue", label: "Connection or sync issue", desc: "Get notified when the system has trouble syncing submitted data.", defaultOn: true },
  { id: "price_alert", label: "Price change alerts", desc: "Get notified when monitored vegetable prices change significantly.", defaultOn: false },
  { id: "arrival_alert", label: "Arrival volume change alerts", desc: "Get notified when commodity arrival volume changes significantly.", defaultOn: false }
];
const AccountTab = ({ showToast, onRemovalRequest }) => {
  const { user } = useAuth();
  const nameParts = (user?.name || "Maria Santos").split(" ");
  const [form, setForm] = useState({
    firstName: nameParts[0] || "",
    lastName: nameParts[nameParts.length - 1] || "",
    middleName: "",
    suffix: "None",
    phone: "09XX XXX XXXX",
    email: user?.email || "",
    position: "Market Monitoring Staff"
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeReason, setRemoveReason] = useState("");
  const [removeReasonErr, setRemoveReasonErr] = useState("");
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
  const handleRemoveSubmit = () => {
    if (!removeReason.trim()) {
      setRemoveReasonErr("Please enter a reason for the request.");
      return;
    }
    setRemoveReasonErr("");
    setShowRemoveModal(false);
    setRemoveReason("");
    onRemovalRequest();
  };
  return <div className="space-y-4">
      <Card>
        <SectionLabel>Personal Information</SectionLabel>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="ac-fn">First Name</FieldLabel>
              <input id="ac-fn" type="text" value={form.firstName} onChange={set("firstName")} className={inputCls} />
            </div>
            <div>
              <FieldLabel htmlFor="ac-ln">Last Name</FieldLabel>
              <input id="ac-ln" type="text" value={form.lastName} onChange={set("lastName")} className={inputCls} />
            </div>
            <div>
              <FieldLabel htmlFor="ac-mn" optional>Middle Name</FieldLabel>
              <input id="ac-mn" type="text" value={form.middleName} onChange={set("middleName")} placeholder="Santos" className={inputCls} />
            </div>
            <div>
              <FieldLabel htmlFor="ac-sfx" optional>Suffix</FieldLabel>
              <div className="relative">
                <select id="ac-sfx" value={form.suffix} onChange={set("suffix")} className={`${inputCls} appearance-none pr-9`}>
                  {SUFFIX_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" fill="none" viewBox="0 0 10 6">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="ac-ph">Phone Number</FieldLabel>
            <input id="ac-ph" type="tel" inputMode="numeric" value={form.phone} onChange={set("phone")} className={inputCls} />
          </div>
          <div>
            <FieldLabel htmlFor="ac-em">Email</FieldLabel>
            <input id="ac-em" type="email" value={form.email} onChange={set("email")} className={inputCls} />
          </div>
          <div>
            <FieldLabel htmlFor="ac-role">Role</FieldLabel>
            <input
    id="ac-role"
    type="text"
    value="DFTC"
    readOnly
    className={`${inputCls} bg-[var(--hw-neutral-100)] opacity-70 cursor-not-allowed`}
  />
          </div>
          <div>
            <FieldLabel htmlFor="ac-pos">Position</FieldLabel>
            <input id="ac-pos" type="text" value={form.position} onChange={set("position")} className={inputCls} />
          </div>
          <GreenBtn onClick={() => setShowSaveModal(true)} className="w-full sm:w-auto">Save changes</GreenBtn>
        </div>
      </Card>

      <Card>
        <SectionLabel>Change Password</SectionLabel>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="d-cpw-cur">Current password</FieldLabel>
            <div className="relative">
              <input
    id="d-cpw-cur"
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
            <FieldLabel htmlFor="d-cpw-new">New password</FieldLabel>
            <div className="relative">
              <input
    id="d-cpw-new"
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
            <FieldLabel htmlFor="d-cpw-cfm">Confirm new password</FieldLabel>
            <div className="relative">
              <input
    id="d-cpw-cfm"
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
            <p className="text-[14px] font-semibold text-black">Request account removal</p>
            <p className="text-[13px] text-black">Submit a request to remove your DFTC account.</p>
          </div>
          <button
    type="button"
    onClick={() => setShowRemoveModal(true)}
    className="h-8 px-3 text-[13px] font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0 ml-3"
  >
            Request
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

      {showRemoveModal && <Modal title="Request account removal?" onClose={() => {
    setShowRemoveModal(false);
    setRemoveReason("");
    setRemoveReasonErr("");
  }}>
          <p className="text-[14px] text-black mb-4">Please describe the reason for your account removal request. The HarvestWise team will review and follow up with you.</p>
          <div className="space-y-1.5 mb-5">
            <label htmlFor="remove-reason" className="block text-[14px] font-semibold text-black">Reason</label>
            <textarea
    id="remove-reason"
    rows={4}
    value={removeReason}
    onChange={(e) => {
      setRemoveReason(e.target.value);
      setRemoveReasonErr("");
    }}
    placeholder="Describe why you want your account removed…"
    className="w-full px-3.5 py-3 text-[14px] text-black bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)] resize-none"
  />
            {removeReasonErr && <p className="text-[13px] text-red-600">{removeReasonErr}</p>}
          </div>
          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={() => {
    setShowRemoveModal(false);
    setRemoveReason("");
    setRemoveReasonErr("");
  }}>Cancel</GhostBtn>
            <button
    type="button"
    onClick={handleRemoveSubmit}
    className="h-11 px-5 flex items-center bg-red-600 text-white text-[14px] font-semibold rounded-xl hover:bg-red-700 transition-colors"
  >
              Submit request
            </button>
          </div>
        </Modal>}
    </div>;
};
const SubmissionsTab = ({ showToast }) => {
  const [toggles, setToggles] = useState({
    ask_before_submit: true,
    show_validation: true,
    download_after_upload: false
  });
  const [reportFormat, setReportFormat] = useState("excel");
  const setToggle = (k) => (v) => setToggles((prev) => ({ ...prev, [k]: v }));
  return <Card>
      <SectionLabel>Submission Behavior</SectionLabel>
      <div className="divide-y divide-[var(--hw-neutral-100)]">
        {[
    { key: "ask_before_submit", label: "Ask before submitting records", desc: "Show a confirmation prompt before each submission." },
    { key: "show_validation", label: "Show validation summary before submit", desc: "Preview validation results before confirming a submission." },
    { key: "download_after_upload", label: "Download report after dataset upload", desc: "Automatically download a validation report after uploading a dataset." }
  ].map((item) => <div key={item.key} className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-black">{item.label}</p>
              <p className="text-[13px] text-black mt-0.5 leading-relaxed">{item.desc}</p>
            </div>
            <Toggle on={toggles[item.key]} onChange={setToggle(item.key)} />
          </div>)}
      </div>
      <div className="pt-4 border-t border-[var(--hw-neutral-100)]">
        <p className="text-[14px] font-semibold text-black mb-3">Report Format</p>
        <div className="flex gap-2">
          {["excel", "csv"].map((fmt) => <button
    key={fmt}
    type="button"
    onClick={() => setReportFormat(fmt)}
    className={`h-10 px-5 rounded-xl border text-[14px] font-medium transition-all ${reportFormat === fmt ? "bg-[var(--hw-green-50)] border-[var(--hw-green-700)] text-[var(--hw-green-700)]" : "bg-white border-[var(--hw-neutral-200)] text-black hover:bg-[var(--hw-neutral-50)]"}`}
  >
              {fmt === "excel" ? "Excel" : "CSV"}
            </button>)}
        </div>
      </div>
      <div className="pt-4">
        <GreenBtn onClick={() => showToast("Submission settings saved.")} className="w-full sm:w-auto">
          Save submission settings
        </GreenBtn>
      </div>
    </Card>;
};
const PreferencesTab = ({ showToast }) => {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
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
      <TextSizeSlider
    showToast={showToast}
    description="Adjusts text size across your DFTC interface."
  />

      <Card>
        <SectionLabel>Offline Data</SectionLabel>
        <div className="space-y-2.5 mb-4">
          {[
    { label: "Last synced", value: "Today, 7:30 AM" },
    { label: "Offline data", value: "Available" },
    { label: "Status", value: syncStatus === "ok" ? "Updated" : syncStatus === "error" ? "Sync failed" : "Up to date", error: syncStatus === "error" }
  ].map((row) => <div key={row.label} className="flex items-center justify-between">
              <span className="text-[14px] text-black">{row.label}</span>
              <span className={`text-[14px] font-medium ${"error" in row && row.error ? "text-red-600" : "text-black"}`}>
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
const NotificationsTab = ({ showToast }) => {
  const [prefs, setPrefs] = useState(
    Object.fromEntries(NOTIF_ITEMS.map((item) => [item.id, item.defaultOn]))
  );
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
function DFTCSettings() {
  const [params] = useSearchParams();
  const tabBarRef = useRef(null);
  const tabFromUrl = params.get("tab") || "account";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const t = params.get("tab") || "account";
    setActiveTab(t);
  }, [params]);

  useEffect(() => {
    const bar = tabBarRef.current;
    if (!bar) return;
    const btn = bar.querySelector('[data-active="true"]');
    if (btn) btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeTab]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3e3);
  };

  const handleRemovalRequest = () => {
    showToast("Account removal request sent.");
  };

  return <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-black">Settings</h1>
        <p className="text-[15px] text-black mt-0.5">Manage your account, submission preferences, and interface settings.</p>
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

      {activeTab === "account" && <AccountTab showToast={showToast} onRemovalRequest={handleRemovalRequest} />}
      {activeTab === "submissions" && <SubmissionsTab showToast={showToast} />}
      {activeTab === "preferences" && <PreferencesTab showToast={showToast} />}
      {activeTab === "notifications" && <NotificationsTab showToast={showToast} />}

      <Toast message={toast} />
    </div>;
}
export {
  DFTCSettings as default
};
