import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Eye, EyeOff, Check } from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { useGoogleLink } from "../../auth/useGoogleLink";
import { apiGet, apiPut, apiPost, parseResponse } from "../../global/api";
import { PHONE_MAX_LENGTH, sanitizePhoneInput } from "../../global/phoneInput";
import { PageHeader } from "../../global/components/shared/PageHeader";
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
import { EmailOtp2FACard } from "../components/settings/EmailOtp2FACard";
const TABS = [
  { id: "account", label: "Account" },
  { id: "security", label: "Security" }
];

const AccountTab = ({ showToast, onRemovalRequest }) => {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const staff = user?.staff_profile || user?.staffProfile || {};
  const firstName = staff.first_name || user?.first_name || (user?.name ? user.name.split(" ")[0] : "") || "";
  const lastName = staff.last_name || user?.last_name || (user?.name && user.name.split(" ").length > 1 ? user.name.split(" ").slice(-1)[0] : "") || "";
  const middleName = staff.middle_name || "";
  const suffix = staff.suffix || "None";
  const phone = user?.phone || "";
  const email = user?.email || "";
  const position = user?.position || staff.position_title || "";

  const [form, setForm] = useState({
    firstName,
    lastName,
    middleName,
    suffix,
    phone,
    email,
    position
  });

  useEffect(() => {
    setForm({
      firstName,
      lastName,
      middleName,
      suffix,
      phone,
      email,
      position
    });
  }, [firstName, lastName, middleName, suffix, phone, email, position]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeReason, setRemoveReason] = useState("");
  const [removeReasonErr, setRemoveReasonErr] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const handleSave = async () => {
    setShowSaveModal(false);
    const payload = {
      first_name: form.firstName,
      last_name: form.lastName,
      middle_name: form.middleName || null,
      suffix: form.suffix === "None" ? null : form.suffix,
      position_title: form.position || null,
      phone: form.phone || null,
      email: form.email || null
    };
    try {
      await parseResponse(await apiPut("/dftc/staff/me", payload));
      try {
        await refreshUser();
        queryClient.invalidateQueries({ queryKey: ["auth-me-profile"] });
      } catch {
        // Profile refresh is best-effort; the save already succeeded.
      }
      showToast("Account updated successfully.");
    } catch (err) {
      showToast(err?.message || "Could not save account changes. Please try again.");
    }
  };
  const handleRemoveSubmit = () => {
    if (!removeReason.trim()) {
      setRemoveReasonErr("Please enter a reason for the request.");
      return;
    }
    setRemoveReasonErr("");
    setShowRemoveModal(false);
    const reason = removeReason;
    setRemoveReason("");
    onRemovalRequest(reason);
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
              <input id="ac-mn" type="text" value={form.middleName} onChange={set("middleName")} placeholder="" className={inputCls} />
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
            <input id="ac-ph" type="tel" inputMode="numeric" maxLength={PHONE_MAX_LENGTH} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: sanitizePhoneInput(e.target.value) }))} className={inputCls} />
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
              value={user?.role?.role_name || user?.role || "DFTC"}
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

const SecurityTab = ({ showToast }) => {
  const { t } = useLanguage();
  const [pw, setPw] = useState({ current: "", newPw: "", confirm: "" });
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCfm, setShowCfm] = useState(false);
  const [pwError, setPwError] = useState("");
  const googleLink = useGoogleLink({
    redirectTo: `${window.location.origin}/dftc/settings?tab=security`,
    onResult: () => showToast(t("dftc.settings.toast_google_connected", {}, "Google account connected.")),
  });

  const handlePasswordSave = async () => {
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
    try {
      await parseResponse(
        await apiPost("/auth/change-password", {
          current_password: pw.current,
          new_password: pw.newPw
        })
      );
      setPw({ current: "", newPw: "", confirm: "" });
      showToast("Password updated successfully.");
    } catch {
      setPwError("Could not update password. Check your current password and try again.");
    }
  };

  const handlePasswordCancel = () => {
    setPw({ current: "", newPw: "", confirm: "" });
    setPwError("");
  };

  return (
    <div className="space-y-4">
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
            {pw.newPw && (
              <ul className="space-y-1 mt-1">
                {PW_REQS.map((r) => {
                  const ok = r.test(pw.newPw);
                  return (
                    <li key={r.label} className={`flex items-center gap-1.5 text-[12px] ${ok ? "text-emerald-600" : "text-black"}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border ${ok ? "bg-emerald-500 border-emerald-500" : "border-[var(--hw-neutral-300)]"}`}>
                        {ok && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      {r.label}
                    </li>
                  );
                })}
              </ul>
            )}
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

      <EmailOtp2FACard showToast={showToast} />

      <Card>
        <SectionLabel>{t("dftc.settings.google_card_title", {}, "Google Sign-In")}</SectionLabel>
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-[14px] font-semibold text-black">{t("dftc.settings.google_card_title", {}, "Google Sign-In")}</p>
            <p className="text-[13px] text-black">{googleLink.googleConnected ? t("dftc.settings.google_connected", {}, "Connected") : t("dftc.settings.google_not_connected", {}, "Not connected")}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (googleLink.googleConnected) {
                googleLink.handleDisconnect();
                showToast(t("dftc.settings.toast_google_disconnected", {}, "Google account disconnected."));
              } else {
                googleLink.handleConnect();
              }
            }}
            disabled={googleLink.loading}
            className={`h-8 px-3 text-[13px] font-medium rounded-lg border transition-colors ${
              googleLink.googleConnected
                ? "border-red-200 text-red-600 hover:bg-red-50"
                : "border-[var(--hw-green-700)] text-[var(--hw-green-700)] hover:bg-[var(--hw-green-50)]"
            }`}
          >
            {googleLink.googleConnected ? t("dftc.settings.google_disconnect", {}, "Disconnect") : t("dftc.settings.google_connect", {}, "Connect")}
          </button>
        </div>
      </Card>
    </div>
  );
};

function DFTCSettings() {
  const [params, setSearchParams] = useSearchParams();
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

  const handleRemovalRequest = async (reason) => {
    try {
      await parseResponse(
        await apiPost("/dftc/removal-requests", { reason: reason || null })
      );
      showToast("Account removal request sent.");
    } catch {
      showToast("Could not send removal request. Please try again.");
    }
  };

  return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      <PageHeader
        title="Settings"
        description="Manage your account and security settings."
      />

      <div
    ref={tabBarRef}
    className="flex gap-1 border-b border-[var(--hw-neutral-200)] mb-5"
    style={{ overflowX: "auto", scrollbarWidth: "none" }}
  >
        {TABS.map((tab) => <button
    key={tab.id}
    data-active={activeTab === tab.id ? "true" : "false"}
    type="button"
    onClick={() => {
      setActiveTab(tab.id);
      setSearchParams({ tab: tab.id });
    }}
    className={`flex-shrink-0 px-3.5 py-2.5 text-[14px] font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)]" : "border-transparent text-black hover:text-[var(--hw-green-700)]"}`}
  >
            {tab.label}
          </button>)}
      </div>

      {activeTab === "account" && <AccountTab showToast={showToast} onRemovalRequest={handleRemovalRequest} />}
      {activeTab === "security" && <SecurityTab showToast={showToast} />}

      <Toast message={toast} />
    </div>;
}
export {
  DFTCSettings as default
};
