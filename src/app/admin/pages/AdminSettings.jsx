import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { Loader2, RefreshCw, Eye, EyeOff, Check } from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
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
  { id: "security", label: "Security" },
  { id: "preferences", label: "Preferences" },
  { id: "notifications", label: "Notifications" }
];
const NOTIF_ITEMS = [
  { id: "dftc_submission", label: "DFTC submission received", desc: "Get notified when a DFTC user submits new price or arrival records.", defaultOn: true },
  { id: "upload_review", label: "Upload requires review", desc: "Get notified when an uploaded dataset needs admin review.", defaultOn: true },
  { id: "api_sync_failed", label: "API sync failed", desc: "Get notified when an API-based data source fails to sync.", defaultOn: true },
  { id: "forecast_failed", label: "Forecast generation failed", desc: "Get notified when a forecast run fails.", defaultOn: true },
  { id: "module_failed", label: "Module output calculation failed", desc: "Get notified when module processing does not complete successfully.", defaultOn: true },
  { id: "records_pending", label: "Records pending publish", desc: "Get notified when validated records are ready to publish to the Farmer interface.", defaultOn: true },
  { id: "weight_updated", label: "Weight or threshold updated", desc: "Get notified when advisory rules are changed.", defaultOn: true },
  { id: "user_access_change", label: "User access change", desc: "Get notified when a user account role or access status changes.", defaultOn: true },
  { id: "security_alert", label: "System security alert", desc: "Get notified about important security-related events.", defaultOn: true },
  { id: "health_alert", label: "System health alert", desc: "Get notified when system services need attention.", defaultOn: true }
];
const AccountTab = ({ showToast }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    firstName: "HarvestWise",
    lastName: "Admin",
    middleName: "",
    suffix: "None",
    phone: "09XX XXX XXXX",
    email: user?.email || ""
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const handleSave = () => {
    setShowSaveModal(false);
    showToast("Account updated successfully.");
  };
  return <div className="space-y-4">
      <Card>
        <SectionLabel>Personal Information</SectionLabel>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="adm-fn">First Name</FieldLabel>
              <input id="adm-fn" type="text" value={form.firstName} onChange={set("firstName")} className={inputCls} />
            </div>
            <div>
              <FieldLabel htmlFor="adm-ln">Last Name</FieldLabel>
              <input id="adm-ln" type="text" value={form.lastName} onChange={set("lastName")} className={inputCls} />
            </div>
            <div>
              <FieldLabel htmlFor="adm-mn" optional>Middle Name</FieldLabel>
              <input id="adm-mn" type="text" value={form.middleName} onChange={set("middleName")} placeholder="Optional" className={inputCls} />
            </div>
            <div>
              <FieldLabel htmlFor="adm-sfx" optional>Suffix</FieldLabel>
              <div className="relative">
                <select id="adm-sfx" value={form.suffix} onChange={set("suffix")} className={`${inputCls} appearance-none pr-9`}>
                  {SUFFIX_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" fill="none" viewBox="0 0 10 6">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="adm-ph">Phone Number</FieldLabel>
            <input id="adm-ph" type="tel" inputMode="numeric" value={form.phone} onChange={set("phone")} className={inputCls} />
          </div>
          <div>
            <FieldLabel htmlFor="adm-em">Email</FieldLabel>
            <input id="adm-em" type="email" value={form.email} onChange={set("email")} className={inputCls} />
          </div>
          <div>
            <FieldLabel htmlFor="adm-role">Role</FieldLabel>
            <input
    id="adm-role"
    type="text"
    value="Admin"
    readOnly
    className={`${inputCls} bg-[var(--hw-neutral-100)] opacity-70 cursor-not-allowed`}
  />
          </div>
          <GreenBtn onClick={() => setShowSaveModal(true)} className="w-full sm:w-auto">Save changes</GreenBtn>
        </div>
      </Card>

      {showSaveModal && <Modal title="Save account changes?" onClose={() => setShowSaveModal(false)}>
          <p className="text-[14px] text-black mb-5">Your updated account information will be saved to your Admin profile.</p>
          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={() => setShowSaveModal(false)}>Cancel</GhostBtn>
            <GreenBtn onClick={handleSave}>Save changes</GreenBtn>
          </div>
        </Modal>}
    </div>;
};
const SecurityTab = ({ showToast }) => {
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAAccordionOpen, setTwoFAAccordionOpen] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
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
  const handleTwoFAConfirm = () => {
    setTwoFAEnabled(true);
    setTwoFAAccordionOpen(false);
    setVerifyCode("");
    showToast("Two-Factor Authentication enabled.");
  };
  const handleGoogleConnect = () => {
    setGoogleConnected(true);
    showToast("Google sign-in updated.");
  };
  const handleGoogleDisconnect = () => {
    setShowDisconnectModal(false);
    setGoogleConnected(false);
    showToast("Google sign-in updated.");
  };
  return <div className="space-y-4">

      {
    /* Card 1: Two-Factor Authentication */
  }
      <Card>
        <SectionLabel>Two-Factor Authentication</SectionLabel>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-black">Two-Factor Authentication</p>
              {twoFAEnabled ? <p className="text-[13px] text-emerald-600 mt-0.5">Enabled</p> : <p className="text-[13px] text-black mt-0.5">Not set up</p>}
            </div>
            {twoFAEnabled ? <GhostBtn onClick={() => setTwoFAAccordionOpen((v) => !v)}>
                Manage Two-Factor Authentication
              </GhostBtn> : <GreenBtn onClick={() => setTwoFAAccordionOpen((v) => !v)}>
                Set up Two-Factor Authentication
              </GreenBtn>}
          </div>

          {!twoFAEnabled && twoFAAccordionOpen && <div className="border border-[var(--hw-neutral-200)] rounded-xl p-4 space-y-3">
              <p className="text-[14px] text-black">Enter the verification code sent to your registered phone number or email to complete setup.</p>
              <div>
                <FieldLabel htmlFor="twofa-code">Verification Code</FieldLabel>
                <input
    id="twofa-code"
    type="text"
    inputMode="numeric"
    value={verifyCode}
    onChange={(e) => setVerifyCode(e.target.value)}
    placeholder="Enter 6-digit code"
    className={inputCls}
  />
              </div>
              <div className="flex gap-2">
                <GhostBtn onClick={() => {
    setTwoFAAccordionOpen(false);
    setVerifyCode("");
  }}>Cancel</GhostBtn>
                <GreenBtn onClick={handleTwoFAConfirm} disabled={!verifyCode.trim()}>Confirm setup</GreenBtn>
              </div>
            </div>}
        </div>
      </Card>

      {
    /* Card 2: Password Reset */
  }
      <Card>
        <SectionLabel>Change Password</SectionLabel>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="adm-cpw-cur">Current password</FieldLabel>
            <div className="relative">
              <input
    id="adm-cpw-cur"
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
            <FieldLabel htmlFor="adm-cpw-new">New password</FieldLabel>
            <div className="relative">
              <input
    id="adm-cpw-new"
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
            <FieldLabel htmlFor="adm-cpw-cfm">Confirm new password</FieldLabel>
            <div className="relative">
              <input
    id="adm-cpw-cfm"
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

      {
    /* Card 3: Google Sign-In */
  }
      <Card>
        <SectionLabel>Google Sign-In</SectionLabel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-black">Google sign-in</p>
            <p className="text-[13px] text-black mt-0.5">{googleConnected ? "Connected" : "Not connected"}</p>
          </div>
          {googleConnected ? <button
    type="button"
    onClick={() => setShowDisconnectModal(true)}
    className="h-9 px-4 text-[13px] font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors flex-shrink-0"
  >
              Disconnect Google account
            </button> : <button
    type="button"
    onClick={handleGoogleConnect}
    className="h-9 px-4 text-[13px] font-medium text-[var(--hw-green-700)] border border-[var(--hw-green-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors flex-shrink-0"
  >
              Connect Google account
            </button>}
        </div>
      </Card>

      {showDisconnectModal && <Modal title="Disconnect Google sign-in?" onClose={() => setShowDisconnectModal(false)}>
          <p className="text-[14px] text-black mb-5">You can still sign in using your email or phone number and password.</p>
          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={() => setShowDisconnectModal(false)}>Cancel</GhostBtn>
            <button
    type="button"
    onClick={handleGoogleDisconnect}
    className="h-11 px-5 flex items-center bg-red-600 text-white text-[14px] font-semibold rounded-xl hover:bg-red-700 transition-colors"
  >
              Disconnect
            </button>
          </div>
        </Modal>}
    </div>;
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
    description="Adjusts text size across your Admin interface."
  />

      <Card>
        <SectionLabel>Offline Data</SectionLabel>
        <div className="space-y-2.5 mb-4">
          {[
    { label: "Last synced", value: "Today, 7:30 AM" },
    { label: "Offline data", value: "Available" },
    {
      label: "Status",
      value: syncStatus === "ok" ? "Updated" : syncStatus === "error" ? "Sync failed" : "Up to date",
      error: syncStatus === "error"
    }
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
function AdminSettings() {
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
  return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1240px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-black">Settings</h1>
        <p className="text-[15px] text-black mt-0.5">Manage your admin account, security, preferences, and notifications.</p>
      </div>

      <div
    ref={tabBarRef}
    className="flex gap-1 border-b border-[var(--hw-neutral-200)] mb-5"
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

      {activeTab === "account" && <AccountTab showToast={showToast} />}
      {activeTab === "security" && <SecurityTab showToast={showToast} />}
      {activeTab === "preferences" && <PreferencesTab showToast={showToast} />}
      {activeTab === "notifications" && <NotificationsTab showToast={showToast} />}

      <Toast message={toast} />
    </div>;
}
export {
  AdminSettings as default
};
