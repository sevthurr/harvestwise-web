import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { useGoogleLink } from "../../auth/useGoogleLink";
import { apiGet, apiPut, apiPost, parseResponse } from "../../global/api";
import { PHONE_MAX_LENGTH, sanitizePhoneInput } from "../../global/phoneInput";
import { isValidEmail } from "../../auth/authValidation";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { PasswordChangeForm } from "../../global/components/settings/PasswordChangeForm";
import {
  inputCls,
  SUFFIX_OPTIONS,
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
import { useRemovalRequest } from "../../global/hooks/useRemovalRequest";
const TABS = [
  { id: "account", label: "Account" },
  { id: "security", label: "Security" }
];

const AccountTab = ({ showToast, onRemovalRequest, removalStatus, removalBlocked, removalCurrent, onCancelRemoval }) => {
  const { user, refreshUser } = useAuth();
  const { t, formatDate } = useLanguage();
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeReason, setRemoveReason] = useState("");
  const [removeReasonErr, setRemoveReasonErr] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const removalFulfilledAt = removalCurrent?.fulfilled_at || null;
  const removalGraceDueAt = removalCurrent?.fulfillment_due_at || null;
  const removalInGrace = removalStatus === "approved" && !removalFulfilledAt;
  const removalStatusLabel =
    removalStatus === "cancelled"
      ? t("dftc.settings.removal_status_cancelled", {}, "Cancelled")
      : removalStatus === "fulfilled"
        ? t("dftc.settings.removal_status_fulfilled", {}, "Fulfilled")
        : removalStatus === "approved"
          ? t("dftc.settings.removal_status_approved", {}, "Approved")
          : removalStatus === "rejected"
            ? t("dftc.settings.removal_status_rejected", {}, "Rejected")
            : t("dftc.settings.removal_status_pending", {}, "Pending");
  const removalStatusColor =
    removalStatus === "rejected"
      ? "text-red-600"
      : removalStatus === "approved" || removalStatus === "fulfilled"
        ? "text-[var(--hw-green-800)]"
        : removalStatus === "cancelled"
          ? "text-[var(--hw-neutral-500)]"
          : "text-amber-600";
  const handleCancel = async () => {
    setCancelling(true);
    try {
      await onCancelRemoval();
    } finally {
      setCancelling(false);
    }
  };
  const set = (k) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    if (k === "email") setEmailError(value.trim() && !isValidEmail(value) ? "Enter a valid email address." : "");
  };
  const handlePreSave = () => {
    if (emailError) return;
    setShowSaveModal(true);
  };
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
    if (currentPassword) payload.current_password = currentPassword;
    setCurrentPassword("");
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
      setRemoveReasonErr(t("dftc.settings.removal_reason_required", {}, "Please enter a reason for the request."));
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
            <input id="ac-em" type="email" value={form.email} onChange={set("email")} className={`${inputCls} ${emailError ? "border-red-500 focus:ring-red-500" : ""}`} />
            {emailError && <p className="mt-1 text-[12px] text-red-600">{emailError}</p>}
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
          <GreenBtn onClick={handlePreSave} className="w-full sm:w-auto">Save changes</GreenBtn>
        </div>
      </Card>

      <Card>
        <p className="text-[12px] font-semibold text-red-500 uppercase tracking-wide mb-3">{t("dftc.settings.danger_zone", {}, "Danger Zone")}</p>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-black">{t("dftc.settings.request_deletion_title", {}, "Request account removal")}</p>
            <p className="text-[13px] text-black">{t("dftc.settings.request_deletion_desc", {}, "Submit a request to remove your DFTC account. The HarvestWise team will review it.")}</p>
            {removalStatus && (
              <p className="text-[13px] text-black mt-1">
                {t("dftc.settings.removal_status_label", {}, "Request status")}:{" "}
                <span className={`font-semibold ${removalStatusColor}`}>
                  {removalStatusLabel}
                </span>
              </p>
            )}
            {removalInGrace && (
              <p className="text-[13px] text-amber-700 mt-1">
                {t(
                  "dftc.settings.removal_grace_note",
                  { date: removalGraceDueAt ? formatDate(removalGraceDueAt) : "—" },
                  "Your account is disabled and will be erased after the grace period on {date}. You can cancel this request before then to restore your account."
                )}
              </p>
            )}
            {removalFulfilledAt && (
              <p className="text-[13px] text-[var(--hw-neutral-500)] mt-1">
                {t("dftc.settings.removal_completed_note", {}, "Your account removal request has been fulfilled.")}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {removalInGrace && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="h-8 px-3 text-[13px] font-medium text-black border border-[var(--hw-neutral-200)] rounded-lg hover:bg-[var(--hw-neutral-50)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {cancelling ? t("common.saving", {}, "Saving…") : t("dftc.settings.removal_cancel_btn", {}, "Cancel request")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowRemoveModal(true)}
              disabled={removalBlocked}
              className="h-8 px-3 text-[13px] font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {t("dftc.settings.request_deletion_btn", {}, "Request")}
            </button>
          </div>
        </div>
      </Card>

      {showSaveModal && <Modal title="Save account changes?" onClose={() => setShowSaveModal(false)}>
          <p className="text-[14px] text-black mb-5">Your updated account information will be saved to your HarvestWise profile.</p>
          <label htmlFor="dftc-current-password" className="block text-[13px] font-semibold text-black mb-1.5">
            Current password <span className="font-normal text-gray-500">(required for email or phone changes)</span>
          </label>
          <input
            id="dftc-current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={`${inputCls} mb-5`}
          />
          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={() => setShowSaveModal(false)}>Cancel</GhostBtn>
            <GreenBtn onClick={handleSave}>Save changes</GreenBtn>
          </div>
        </Modal>}

      {showRemoveModal && <Modal title={t("dftc.settings.request_deletion_modal_title", {}, "Request account removal?")} onClose={() => {
    setShowRemoveModal(false);
    setRemoveReason("");
    setRemoveReasonErr("");
  }}>
          <p className="text-[14px] text-black mb-4 leading-relaxed">{t("dftc.settings.request_deletion_modal_body", {}, "To protect your account and records from unauthorized deletion, HarvestWise verifies all requests before processing. Please describe the reason for your request. Once verified, identifying account information and contact information will be permanently removed or irreversibly anonymized in accordance with our Privacy Policy. Agricultural, crop, cost, or harvest information may be retained only after it is anonymised so it can no longer be linked to you, per our Privacy Policy §8. You may also send a request to harvestwise.app@gmail.com from your registered email address.")}</p>
          <div className="space-y-1.5 mb-5">
            <label htmlFor="remove-reason" className="block text-[14px] font-semibold text-black">{t("dftc.settings.removal_reason_label", {}, "Reason")}</label>
            <textarea
    id="remove-reason"
    rows={4}
    value={removeReason}
    onChange={(e) => {
      setRemoveReason(e.target.value);
      setRemoveReasonErr("");
    }}
    placeholder={t("dftc.settings.removal_reason_placeholder", {}, "Describe why you want your account removed…")}
    className="w-full px-3.5 py-3 text-[14px] text-black bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)] resize-none"
  />
            {removeReasonErr && <p className="text-[13px] text-red-600">{removeReasonErr}</p>}
          </div>
          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={() => {
    setShowRemoveModal(false);
    setRemoveReason("");
    setRemoveReasonErr("");
  }}>{t("common.cancel", {}, "Cancel")}</GhostBtn>
            <button
    type="button"
    onClick={handleRemoveSubmit}
    className="h-11 px-5 flex items-center bg-red-600 text-white text-[14px] font-semibold rounded-xl hover:bg-red-700 transition-colors"
  >
              {t("dftc.settings.removal_submit_btn", {}, "Submit request")}
            </button>
          </div>
        </Modal>}
    </div>;
};

const SecurityTab = ({ showToast }) => {
  const { t } = useLanguage();
  const googleLink = useGoogleLink({
    redirectTo: `${window.location.origin}/dftc/settings?tab=security`,
    onResult: () => showToast(t("dftc.settings.toast_google_connected", {}, "Google account connected.")),
  });

  return (
    <div className="space-y-4">
      <Card>
        <SectionLabel>Change Password</SectionLabel>
        <PasswordChangeForm
          idPrefix="d-cpw"
          onSuccess={() => showToast("Password updated successfully.")}
        />
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
  const { t } = useLanguage();
  const [params, setSearchParams] = useSearchParams();
  const tabBarRef = useRef(null);
  const tabFromUrl = params.get("tab") || "account";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [toast, setToast] = useState("");
  const {
    status: removalStatus,
    blocked: removalBlocked,
    refetch: refetchRemoval,
    current: removalCurrent,
    cancel: cancelRemoval,
  } = useRemovalRequest(["dftc", "removalRequests"]);

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
      showToast(t("dftc.settings.removal_success", {}, "Account removal request sent. The HarvestWise team will review it."));
      refetchRemoval();
    } catch (err) {
      // 409: a request is already open. Say so instead of the generic failure,
      // and refresh so the Request button reflects it.
      if (err?.status === 409) {
        showToast(t("dftc.settings.removal_already_pending", {}, "You already have a pending removal request."));
        refetchRemoval();
      } else {
        showToast(t("dftc.settings.removal_error", {}, "Could not send removal request. Please try again."));
      }
    }
  };

  /** POST /dftc/removal-requests/{id}/cancel — restores an approved, unfulfilled request. */
  const handleCancelRemoval = async () => {
    try {
      await cancelRemoval();
      showToast(t("dftc.settings.removal_cancel_success", {}, "Account removal request cancelled."));
      await refetchRemoval();
    } catch (err) {
      showToast({
        message: err?.message || t("dftc.settings.removal_cancel_error", {}, "Could not cancel the request. Please try again."),
        type: "error",
      });
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

      {activeTab === "account" && <AccountTab showToast={showToast} onRemovalRequest={handleRemovalRequest} removalStatus={removalStatus} removalBlocked={removalBlocked} removalCurrent={removalCurrent} onCancelRemoval={handleCancelRemoval} />}
      {activeTab === "security" && <SecurityTab showToast={showToast} />}

      <Toast message={toast} />
    </div>;
}
export {
  DFTCSettings as default
};
