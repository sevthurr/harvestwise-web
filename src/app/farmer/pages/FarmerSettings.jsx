import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Check, Navigation, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { isValidEmail } from "../../auth/authValidation";
import { PHONE_MAX_LENGTH, sanitizePhoneInput } from "../../global/phoneInput";
import { useGoogleLink } from "../../auth/useGoogleLink";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { PasswordChangeForm } from "../../global/components/settings/PasswordChangeForm";
import { CommodityIllustration, getCommodityIconKey } from "../../global/components/shared/CommodityIllustrations";
import { getVariants } from "../../global/data/commodities";
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
import { apiGet, apiPut, apiPost, parseResponse } from "../../global/api";
import { capitalizeNameInput, toCamelCase } from "../../global/utils/apiTransforms";
import { FarmLocationFields } from "../../global/components/location/FarmLocationFields";
import { useFarmLocation } from "../../global/hooks/useFarmLocation";
import { SkeletonFormCard } from "../components/shared/FarmerSkeletons";
import { queryClient } from "../../global/lib/queryClient";
import { useRemovalRequest } from "../../global/hooks/useRemovalRequest";
import {
  FARMER_COMMODITIES_KEY,
  FARMER_PROFILE_KEY,
  loadFarmerOfflineData,
  fetchFarmerProfile,
} from "../../global/hooks/useFarmerPrefetch";
import { buildFarmerExportHtml } from "../utils/farmerExportHtml";

const TABS = [
  { id: "account", label: "Account", key: "farmer.settings.tab_account" },
  { id: "security", label: "Security", key: "farmer.settings.tab_security" },
  { id: "farm", label: "Farm Profile", key: "farmer.settings.tab_farm" },
  { id: "preferences", label: "Preferences", key: "farmer.settings.tab_preferences" }
];

const LANGUAGE_OPTIONS = [
  { value: "ceb", label: "Bisaya" },
  { value: "en", label: "English" },
  { value: "tl", label: "Filipino" }
];

/* -------------------------------------------------------------------------- */
/* 1. Account Tab                                                             */
/* -------------------------------------------------------------------------- */
const AccountTab = ({ showToast, onDeleteAccount }) => {
  const { user, refreshUser } = useAuth();
  const { t, formatDate, langCode } = useLanguage();
  const googleLink = useGoogleLink({
    redirectTo: `${window.location.origin}/farmer/settings?tab=account`,
    onResult: () => {},
  });
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    suffix: "None",
    phone: "",
    email: ""
  });
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [removalReason, setRemovalReason] = useState("");
  const [removalError, setRemovalError] = useState("");
  const [submittingRemoval, setSubmittingRemoval] = useState(false);
  const [cancellingRemoval, setCancellingRemoval] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  // The farmer's own removal requests. Rejected requests may be re-submitted,
  // so only an open/approved one blocks a new request; `fulfilled_at` marks a
  // fulfilled request as terminal even if its stored status still reads
  // "approved".
  const {
    current: removalCurrent,
    status: removalStatus,
    blocked: removalBlocked,
    refetch: refetchRemoval,
    cancel: cancelRemoval,
  } = useRemovalRequest(["farmer", "removalRequests"]);
  const removalFulfilledAt = removalCurrent?.fulfilled_at || null;
  const removalGraceDueAt = removalCurrent?.fulfillment_due_at || null;
  // Approved but not yet fulfilled: the account is disabled and the farmer can
  // still cancel before the grace period ends.
  const removalInGrace = removalStatus === "approved" && !removalFulfilledAt;

  const removalStatusLabel =
    removalStatus === "approved"
      ? t("farmer.settings.removal_status_approved", {}, "Approved")
      : removalStatus === "rejected"
        ? t("farmer.settings.removal_status_rejected", {}, "Rejected")
        : removalStatus === "fulfilled"
          ? t("farmer.settings.removal_status_fulfilled", {}, "Fulfilled")
          : removalStatus === "cancelled"
            ? t("farmer.settings.removal_status_cancelled", {}, "Cancelled")
            : t("farmer.settings.removal_status_pending", {}, "Pending");

  const removalStatusColor =
    removalStatus === "rejected"
      ? "text-red-600"
      : removalStatus === "approved" || removalStatus === "fulfilled"
        ? "text-[var(--hw-green-800)]"
        : removalStatus === "cancelled"
          ? "text-[var(--hw-neutral-500)]"
          : "text-amber-600";


  // Load account and profile data from the shared cached profile
  const { data: rawProfile, isLoading: loading } = useQuery({
    queryKey: ["farmer", "profile"],
    queryFn: fetchFarmerProfile,
    staleTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    const camel = rawProfile ? toCamelCase(rawProfile) : null;
    if (camel) {
      setForm({
        firstName: camel.firstName || "",
        lastName: camel.lastName || "",
        middleName: camel.middleName || "",
        suffix: camel.suffix || "None",
        phone: camel.phone || user?.phone || "",
        email: camel.email || user?.email || ""
      });
    } else {
      setForm({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        middleName: user?.middleName || "",
        suffix: user?.suffix || "None",
        phone: user?.phone || "",
        email: user?.email || ""
      });
    }
  }, [rawProfile, user]);

  const set = (k) => (e) => {
    const value = ["firstName", "lastName", "middleName"].includes(k)
      ? capitalizeNameInput(e.target.value)
      : e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    if (k === "email") setEmailError(value.trim() && !isValidEmail(value) ? "Enter a valid email address." : "");
  };
  const handlePreSave = () => {
    if (emailError) return;
    const profile = rawProfile ? toCamelCase(rawProfile) : {};
    const originalEmail = profile.email || user?.email || "";
    if (form.email !== originalEmail) setShowSaveModal(true);
    else handleSave();
  };

  const handleSave = async () => {
    setShowSaveModal(false);
    try {
      setSaving(true);
      const payload = {
        first_name: form.firstName || null,
        last_name: form.lastName || null,
        middle_name: form.middleName || null,
        suffix: form.suffix === "None" ? null : form.suffix
      };
      const profile = rawProfile ? toCamelCase(rawProfile) : {};
      const originalPhone = profile.phone || user?.phone || "";
      const originalEmail = profile.email || user?.email || "";
      if (form.phone !== originalPhone) payload.phone = form.phone || null;
      if (form.email !== originalEmail) payload.email = form.email || null;
      if (currentPassword && form.email !== originalEmail) payload.current_password = currentPassword;
      setCurrentPassword("");
      await parseResponse(await apiPut("/farmer/profile", payload));
      await queryClient.invalidateQueries({ queryKey: ["farmer", "profile"] });
      try {
        await refreshUser();
      } catch {
        // The profile save already succeeded; auth refresh is best-effort.
      }
      showToast("Account updated successfully.");
    } catch (err) {
      showToast(err?.message || "Could not save your account information.", "error");
    } finally {
      setSaving(false);
    }
  };



  const closeRemovalModal = () => {
    setShowDeleteModal(false);
    setRemovalError("");
  };

  const handleRemovalSubmit = async () => {
    setSubmittingRemoval(true);
    setRemovalError("");
    try {
      await parseResponse(
        await apiPost("/dftc/removal-requests", { reason: removalReason.trim() || null })
      );
      setShowDeleteModal(false);
      setRemovalReason("");
      showToast(t("farmer.settings.removal_success", {}, "Account removal request submitted. Our team will review it."));
      queryClient.invalidateQueries({ queryKey: ["farmer", "removalRequests"] });
    } catch (err) {
      // 409 means a request is already open — surface the exact reason rather
      // than the generic failure, and refresh so the button disables itself.
      if (err?.status === 409) {
        setRemovalError(t("farmer.settings.removal_already_pending", {}, "You already have a pending removal request."));
        queryClient.invalidateQueries({ queryKey: ["farmer", "removalRequests"] });
      } else {
        setRemovalError(err?.message || t("farmer.settings.removal_error", {}, "Could not send the removal request. Please try again."));
      }
    } finally {
      setSubmittingRemoval(false);
    }
  };

  const handleCancelRemoval = async () => {
    setCancellingRemoval(true);
    try {
      await cancelRemoval();
      showToast(t("farmer.settings.removal_cancel_success", {}, "Account removal request cancelled."));
      await refetchRemoval();
    } catch (err) {
      showToast(
        err?.message || t("farmer.settings.removal_cancel_error", {}, "Could not cancel the request. Please try again."),
        "error"
      );
    } finally {
      setCancellingRemoval(false);
    }
  };

  /** GET /dftc/data-export — download the caller's own data as a readable HTML file. */
  const handleExportData = async () => {
    setExportingData(true);
    try {
      const data = await parseResponse(await apiGet("/dftc/data-export"));
      const html = buildFarmerExportHtml(data, langCode);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "harvestwise-data-export.html";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      showToast(t("farmer.settings.removal_export_error", {}, "Could not download your data. Please try again."), "error");
    } finally {
      setExportingData(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionLabel>{t("farmer.settings.personal_info", {}, "Personal Information")}</SectionLabel>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="a-fn">{t("farmer.settings.first_name", {}, "First Name")}</FieldLabel>
              <input
                id="a-fn"
                type="text"
                value={form.firstName}
                onChange={set("firstName")}
                placeholder={t("farmer.settings.first_name", {}, "First Name")}
                className={inputCls}
              />
            </div>
            <div>
              <FieldLabel htmlFor="a-ln">{t("farmer.settings.last_name", {}, "Last Name")}</FieldLabel>
              <input
                id="a-ln"
                type="text"
                value={form.lastName}
                onChange={set("lastName")}
                placeholder={t("farmer.settings.last_name", {}, "Last Name")}
                className={inputCls}
              />
            </div>
            <div>
              <FieldLabel htmlFor="a-mn" optional>{t("farmer.settings.middle_name", {}, "Middle Name")}</FieldLabel>
              <input
                id="a-mn"
                type="text"
                value={form.middleName}
                onChange={set("middleName")}
                placeholder={t("farmer.settings.middle_name", {}, "Middle Name")}
                className={inputCls}
              />
            </div>
            <div>
              <FieldLabel htmlFor="a-sfx" optional>Suffix</FieldLabel>
              <div className="relative">
                <select
                  id="a-sfx"
                  value={form.suffix}
                  onChange={set("suffix")}
                  style={{ color: form.suffix === "None" ? "var(--hw-neutral-400, #9ca3af)" : "var(--hw-neutral-900, #111827)" }}
                  className={`w-full h-11 px-3.5 text-[15px] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow appearance-none pr-9 ${
                    form.suffix === "None" ? "text-[var(--hw-neutral-400)] text-gray-400" : "text-black"
                  }`}
                >
                  <option value="None" hidden disabled>
                    {t("auth.suffix_placeholder", {}, "Ex. Jr.")}
                  </option>
                  {SUFFIX_OPTIONS.filter((s) => s !== "None").map((s) => (
                    <option key={s} value={s} style={{ color: "#111827" }}>
                      {s}
                    </option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" fill="none" viewBox="0 0 10 6">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="a-ph">{t("farmer.settings.phone_number", {}, "Phone Number")}</FieldLabel>
            <input
              id="a-ph"
              type="tel"
              inputMode="numeric"
              maxLength={PHONE_MAX_LENGTH}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: sanitizePhoneInput(e.target.value) }))}
              placeholder="09XX XXX XXXX"
              className={inputCls}
            />
          </div>
          <div>
            <FieldLabel htmlFor="a-em">{t("farmer.settings.email_address", {}, "Email")}</FieldLabel>
            <input
              id="a-em"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="farmer@example.com"
              disabled={googleLink.googleConnected}
              className={`${inputCls} ${emailError ? "border-red-500 focus:ring-red-500" : ""} ${googleLink.googleConnected ? "bg-[var(--hw-neutral-100)] opacity-70 cursor-not-allowed" : ""}`}
            />
            {emailError && <p className="mt-1 text-[12px] text-red-600">{emailError}</p>}
            {googleLink.googleConnected && (
              <p className="mt-1 text-[12px] text-amber-700">
                Your account is linked to Google Sign-In. To change your email, update it in your Google account first.
              </p>
            )}
          </div>
          <GreenBtn onClick={handlePreSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? t("common.saving", {}, "Saving…") : t("farmer.settings.save_changes", {}, "Save changes")}
          </GreenBtn>
        </div>
      </Card>

      <Card>
        <p className="text-[12px] font-semibold text-red-500 uppercase tracking-wide mb-3">Danger Zone</p>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[14px] sm:text-[15px] font-semibold text-black">{t("farmer.settings.request_deletion_title", {}, "Request account removal")}</p>
            <p className="text-[13px] text-[var(--hw-neutral-700)] leading-relaxed mt-0.5">{t("farmer.settings.request_deletion_desc", {}, "Account removal is processed after verification. Requests are reviewed by the HarvestWise team.")}</p>
            {removalStatus && (
              <p className="text-[13px] text-black mt-1.5">
                {t("farmer.settings.removal_status_label", {}, "Request status")}:{" "}
                <span className={`font-semibold ${removalStatusColor}`}>
                  {removalStatusLabel}
                </span>
              </p>
            )}
            {removalInGrace && (
              <p className="text-[13px] text-amber-700 mt-1.5 leading-snug">
                {t(
                  "farmer.settings.removal_grace_note",
                  { date: removalGraceDueAt ? formatDate(removalGraceDueAt) : "—" },
                  "Your account is disabled and will be erased after the grace period on {date}. You can cancel this request before then to restore your account."
                )}
              </p>
            )}
            {removalFulfilledAt && (
              <p className="text-[13px] text-[var(--hw-neutral-500)] mt-1.5 leading-snug">
                {t("farmer.settings.removal_completed_note", {}, "Your account removal request has been fulfilled.")}
              </p>
            )}
          </div>
          <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto flex-shrink-0 pt-1 sm:pt-0">
            {removalInGrace && (
              <button
                type="button"
                onClick={handleCancelRemoval}
                disabled={cancellingRemoval}
                className="w-full sm:w-auto h-9 sm:h-8 px-3.5 text-[13px] font-medium text-black border border-[var(--hw-neutral-200)] rounded-xl sm:rounded-lg hover:bg-[var(--hw-neutral-50)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {cancellingRemoval
                  ? t("common.saving", {}, "Saving…")
                  : t("farmer.settings.removal_cancel_btn", {}, "Cancel request")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={removalBlocked}
              className="w-full sm:w-auto h-9 sm:h-8 px-3.5 text-[13px] font-medium text-red-600 border border-red-200 rounded-xl sm:rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {removalStatus === "rejected"
                ? t("farmer.settings.request_again_btn", {}, "Request Again")
                : t("farmer.settings.request_deletion_btn", {}, "Request removal")}
            </button>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--hw-neutral-100)]">
          <button
            type="button"
            onClick={handleExportData}
            disabled={exportingData}
            className="w-full sm:w-auto h-9 sm:h-8 px-3.5 text-[13px] font-medium text-[var(--hw-green-800)] border border-[var(--hw-green-700)] rounded-xl sm:rounded-lg hover:bg-[var(--hw-green-50)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exportingData
              ? t("common.saving", {}, "Saving…")
              : t("farmer.settings.removal_export_btn", {}, "Export my data")}
          </button>
        </div>
      </Card>

      {showSaveModal && (
        <Modal title={t("farmer.settings.save_changes", {}, "Save changes")} onClose={() => setShowSaveModal(false)}>
          <p className="text-[14px] text-black mb-5">Your updated account information will be saved to your HarvestWise profile.</p>
          <label htmlFor="farmer-current-password" className="block text-[13px] font-semibold text-black mb-1.5">
            Current password <span className="font-normal text-gray-500">(required for email or phone changes)</span>
          </label>
          <input
            id="farmer-current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={`${inputCls} mb-5`}
          />
          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={() => setShowSaveModal(false)}>{t("common.cancel", {}, "Cancel")}</GhostBtn>
            <GreenBtn onClick={handleSave}>{t("farmer.settings.save_changes", {}, "Save changes")}</GreenBtn>
          </div>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal
          title={t("farmer.settings.request_deletion_title", {}, "Request account removal")}
          onClose={closeRemovalModal}
        >
          <p className="text-[14px] text-black mb-4 leading-relaxed">
            {t("farmer.settings.request_deletion_modal_body", {}, "To protect your account and records from unauthorized deletion, HarvestWise verifies all requests before processing. Please send a deletion request to harvestwise.app@gmail.com from your registered email address. Once verified, identifying account information, contact information, and precise farm-location coordinates will be permanently removed or irreversibly anonymized in accordance with our Privacy Policy.")}
          </p>

          <div className="space-y-1.5 mb-5">
            <label htmlFor="removal-reason" className="block text-[14px] font-semibold text-black">
              {t("farmer.settings.removal_reason_label", {}, "Reason (optional)")}
            </label>
            <textarea
              id="removal-reason"
              rows={4}
              maxLength={1000}
              value={removalReason}
              onChange={(e) => {
                setRemovalReason(e.target.value);
                setRemovalError("");
              }}
              placeholder={t("farmer.settings.removal_reason_placeholder", {}, "Tell us why you are requesting account removal…")}
              className="w-full px-3.5 py-3 text-[14px] text-black bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)] resize-none"
            />
            {removalError && <p className="text-[13px] text-red-600">{removalError}</p>}
          </div>

          <div className="bg-[var(--hw-neutral-50)] p-3.5 rounded-xl border border-[var(--hw-neutral-200)] mb-5 text-sm space-y-1">
            <p className="font-semibold text-black">Contact:</p>
            <a href="mailto:harvestwise.app@gmail.com?subject=Account%20Removal%20Request" className="text-[var(--hw-green-800)] font-medium hover:underline block">
              harvestwise.app@gmail.com
            </a>
          </div>

          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={closeRemovalModal}>
              {t("common.cancel", {}, "Cancel")}
            </GhostBtn>
            <GreenBtn onClick={handleRemovalSubmit} disabled={submittingRemoval}>
              {submittingRemoval
                ? t("common.saving", {}, "Saving…")
                : t("farmer.settings.request_deletion_btn", {}, "Request removal")}
            </GreenBtn>
          </div>
        </Modal>
      )}
    </div>
  );
};


/* -------------------------------------------------------------------------- */
/* 2. Security Tab                                                            */
/* -------------------------------------------------------------------------- */
const SecurityTab = ({ showToast }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [pwError, setPwError] = useState("");
  const googleLink = useGoogleLink({
    redirectTo: `${window.location.origin}/farmer/settings?tab=security`,
    onResult: () => showToast(t("farmer.settings.toast_google_connected", {}, "Google account connected.")),
  });

  return (
    <div className="space-y-4">
      <Card>
        <SectionLabel>
          {user?.has_password === false
            ? t("farmer.settings.add_password", {}, "Add a password")
            : t("farmer.settings.change_password", {}, "Change Password")}
        </SectionLabel>
        {user?.has_password === false && (
          <p className="text-[13px] text-black mb-3">
            {t(
              "farmer.settings.add_password_desc",
              {},
              "Add a password so you can also sign in with your email and password."
            )}
          </p>
        )}
        <PasswordChangeForm
          idPrefix="f-cpw"
          requireCurrentPassword={user?.has_password !== false}
          onSuccess={() => showToast(t("farmer.settings.toast_pw_success", {}, "Password updated successfully."))}
          onError={() => setPwError(t("farmer.settings.toast_pw_error", {}, "Could not update password. Check your current password and try again."))}
        />
        {pwError && <p className="mt-3 text-[13px] text-red-600">{pwError}</p>}
      </Card>

      <Card>
        <SectionLabel>{t("farmer.settings.google_card_title", {}, "Google Sign-In")}</SectionLabel>
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-[14px] font-semibold text-black">{t("farmer.settings.google_card_title", {}, "Google Sign-In")}</p>
            <p className="text-[13px] text-black">{googleLink.googleConnected ? t("farmer.settings.google_connected", {}, "Connected") : t("farmer.settings.google_not_connected", {}, "Not connected")}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (googleLink.googleConnected) {
                googleLink.handleDisconnect();
                showToast(t("farmer.settings.toast_google_disconnected", {}, "Google account disconnected."));
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
            {googleLink.googleConnected ? t("farmer.settings.google_disconnect", {}, "Disconnect") : t("farmer.settings.google_connect", {}, "Connect")}
          </button>
        </div>
      </Card>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. Farm Profile Tab                                                        */
/* -------------------------------------------------------------------------- */
const FarmTabForm = ({ initialLoc, initialCrops, availableCrops, showToast, onSaved }) => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [crops, setCrops] = useState(initialCrops || {});
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const locationState = useFarmLocation({
    initialCity: initialLoc.city || "Davao City",
    initialDistrict: initialLoc.district || "",
    initialBarangay: initialLoc.barangay || "",
    initialPurokSitio: initialLoc.purokSitio || "",
    initialStreet: initialLoc.street || "",
    initialSpecificAddress: initialLoc.locationName || "",
    initialLatitude: initialLoc.latitude,
    initialLongitude: initialLoc.longitude,
  });

  const toggleCrop = (name) => {
    setCrops((prev) => {
      const next = { ...prev };
      if (name in next) delete next[name];
      else next[name] = "";
      return next;
    });
  };

  const handleSave = async () => {
    setShowSaveModal(false);
    try {
      setSaving(true);

      // Build preferred_crops from the crops grid
      // crops = { [commodityName]: varietyLabel }
      // availableCrops = [{ id, name, baseName }]
      const nameToId = Object.fromEntries(availableCrops.map((c) => [c.name, c.id]));
      const resolvedCrops = Object.entries(crops).filter(([name]) => nameToId[name]);
      // Sending the list is only safe when every saved crop survived the lookup.
      // One dropped name would otherwise be deleted from the database.
      const cropsResolved =
        availableCrops.length > 0 && resolvedCrops.length === Object.keys(crops).length;

      const payload = {
        city: locationState.city || "Davao City",
        district: locationState.district ? locationState.district.trim() : null,
        barangay: locationState.barangay ? locationState.barangay.trim() : null,
        purok_sitio: locationState.purokSitio ? locationState.purokSitio.trim() : null,
        street: locationState.street ? locationState.street.trim() : null,
        location_name: null,
        latitude: locationState.latitude != null ? locationState.latitude : null,
        longitude: locationState.longitude != null ? locationState.longitude : null,
        ...(cropsResolved && {
          preferred_crops: resolvedCrops.map(([name, variety]) => ({
            commodity_id: nameToId[name],
            ...(variety ? { preferred_variety_name: variety } : {}),
          })),
        }),
      };
      const res = await apiPut("/farmer/profile", payload);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["farmer"] });
      if (res.ok) {
        const updated = await parseResponse(res);
        onSaved?.(updated);
        showToast(t("farmer.settings.toast_saved", {}, "Farm profile updated successfully."), "success");
      } else {
        showToast(t("farmer.settings.toast_save_error", {}, "Could not update farm profile. Please try again."), "error");
      }
    } catch {
      showToast(t("farmer.settings.toast_save_error", {}, "Could not update farm profile. Please try again."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionLabel>{t("farmer.settings.farm_location", {}, "Farm Location")}</SectionLabel>
        <div>
          <FarmLocationFields locationState={locationState} showCheckButton={true} />
        </div>
      </Card>

      <Card>
        <SectionLabel>{t("farmer.settings.preferred_crops", {}, "Preferred Crops")}</SectionLabel>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {availableCrops.map((crop) => {
            const sel = crop.name in crops;
            const iconKey = getCommodityIconKey(crop.id, crop.baseName, crop.name);
            return (
              <button
                key={crop.id || crop.name}
                type="button"
                onClick={() => toggleCrop(crop.name)}
                className={`flex items-center gap-2 h-12 px-3 text-[13px] font-medium rounded-xl border transition-all text-left ${
                  sel
                    ? "bg-[var(--hw-green-50)] border-[var(--hw-green-700)] text-[var(--hw-green-900)]"
                    : "bg-white border-[var(--hw-neutral-200)] text-black hover:bg-[var(--hw-neutral-50)]"
                }`}
              >
                <CommodityIllustration commodityId={iconKey || crop.id} className="w-7 h-7 flex-shrink-0" />
                <span className="truncate">{crop.name}</span>
              </button>
            );
          })}
        </div>

        {/* Empty state for preferred crops */}
        {Object.keys(crops).length === 0 ? (
          <div className="py-2 text-[13px] text-[var(--hw-neutral-500)] italic">
            No preferred crops selected.
          </div>
        ) : (
          <div className="pt-3 border-t border-[var(--hw-neutral-100)] space-y-2">
            <p className="text-[12px] font-semibold text-black uppercase tracking-wide">Preferred variety</p>
            {Object.keys(crops).map((name) => {
              const vars = availableCrops.find((crop) => crop.name === name)?.varieties || getVariants(name);
              if (!vars.length) return null;
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-[13px] text-black flex-1 truncate">{name}</span>
                  <div className="relative flex-shrink-0 w-36">
                    <select
                      value={crops[name] || ""}
                      onChange={(e) => setCrops((p) => ({ ...p, [name]: e.target.value }))}
                      className="w-full h-9 pl-3 pr-8 text-[13px] text-black bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-700)] appearance-none cursor-pointer truncate"
                    >
                      <option value="">Default</option>
                      {vars.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-black pointer-events-none" fill="none" viewBox="0 0 10 6">
                      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <GreenBtn onClick={() => setShowSaveModal(true)} disabled={saving} className="w-full">
        {saving ? t("common.saving", {}, "Saving…") : t("farmer.settings.save_changes", {}, "Save changes")}
      </GreenBtn>

      {showSaveModal && (
        <Modal title="Save farm profile changes?" onClose={() => setShowSaveModal(false)}>
          <p className="text-[14px] text-black mb-5">HarvestWise will use this information to personalize your crop advisories, weather context, and saved profile.</p>
          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={() => setShowSaveModal(false)}>Cancel</GhostBtn>
            <GreenBtn onClick={handleSave}>Save changes</GreenBtn>
          </div>
        </Modal>
      )}
    </div>
  );
};

const FarmTab = ({ showToast }) => {
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);
  const [availableCrops, setAvailableCrops] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        const [profileRes, cropsRes, pricesRes] = await Promise.allSettled([
          queryClient.getQueryData(FARMER_PROFILE_KEY)
            ? Promise.resolve({ ok: true, json: async () => queryClient.getQueryData(FARMER_PROFILE_KEY) })
            : apiGet("/farmer/profile"),
          queryClient.getQueryData(FARMER_COMMODITIES_KEY)
            ? Promise.resolve({ ok: true, json: async () => queryClient.getQueryData(FARMER_COMMODITIES_KEY) })
            : apiGet("/farmer/commodities"),
          queryClient.getQueryData(["prices", "list"])
            ? Promise.resolve({ ok: true, json: async () => queryClient.getQueryData(["prices", "list"]) })
            : apiGet("/prices?is_top10=true&page_size=50"),
        ]);

        if (profileRes.status === "fulfilled" && profileRes.value.ok && active) {
          const pData = await parseResponse(profileRes.value);
          const camel = toCamelCase(pData);

          const cropMap = {};
          if (camel.preferredCrops && Array.isArray(camel.preferredCrops)) {
            camel.preferredCrops.forEach((cp) => {
              const name = cp.commodityName || cp.name;
              if (name) cropMap[name] = cp.varietyName || "";
            });
          }

          setInitialData({
            loc: {
              city: camel.city || "Davao City",
              district: camel.district || null,
              barangay: camel.barangay || "",
              purokSitio: camel.purokSitio || camel.purok_sitio || "",
              street: camel.street || "",
              locationName: camel.locationName || camel.location_name || "",
              latitude: camel.latitude != null ? camel.latitude : null,
              longitude: camel.longitude != null ? camel.longitude : null,
            },
            crops: cropMap,
          });
        }

        if (active) {
          const cData = cropsRes.status === "fulfilled" && cropsRes.value.ok
            ? await parseResponse(cropsRes.value)
            : null;
          const catalogItems = Array.isArray(cData) ? cData : [];
          const items = catalogItems.length > 0
            ? catalogItems
            : pricesRes.status === "fulfilled" && pricesRes.value.ok
              ? (await parseResponse(pricesRes.value))?.items || []
              : [];
          const topList = items
            .map((item) => {
              const camel = toCamelCase(item);
              return {
                id: camel.id,
                name: camel.name || "",
                varieties: Array.isArray(camel.varieties) ? camel.varieties : [],
                baseName: camel.baseName,
              };
            })
            .filter((item) => item.name && item.id);
          if (catalogItems.length === 0) {
            const uniqueTopList = topList.filter(
              (item, index, list) => list.findIndex((candidate) => candidate.name === item.name) === index
            );
            if (uniqueTopList.length > 0) setAvailableCrops(uniqueTopList);
          } else if (topList.length > 0) {
            setAvailableCrops(topList);
          }
        }
      } catch (err) {
        console.warn("Could not load farm profile:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, []);

  if (loading || !initialData) {
    return (
      <div className="space-y-4">
        <SkeletonFormCard />
        <SkeletonFormCard />
      </div>
    );
  }

  const handleSaved = (updated) => {
    if (!updated) return;
    const camel = toCamelCase(updated);
    setInitialData((prev) => ({
      ...prev,
      loc: {
        city: camel.city || "Davao City",
        district: camel.district || null,
        barangay: camel.barangay || "",
        purokSitio: camel.purokSitio || camel.purok_sitio || "",
        street: camel.street || "",
        locationName: camel.locationName || camel.location_name || "",
        latitude: camel.latitude != null ? camel.latitude : null,
        longitude: camel.longitude != null ? camel.longitude : null,
      },
    }));
  };

  return (
    <FarmTabForm
      initialLoc={initialData.loc}
      initialCrops={initialData.crops}
      availableCrops={availableCrops}
      showToast={showToast}
      onSaved={handleSaved}
    />
  );
};

/* -------------------------------------------------------------------------- */
/* 3. Preferences Tab                                                         */
/* -------------------------------------------------------------------------- */
const PreferencesTab = ({ showToast }) => {
  const { effectiveLanguage: language, setLanguage, t } = useLanguage();
  const { refreshUser } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [lastSynced, setLastSynced] = useState(() => localStorage.getItem("hw_last_synced") || null);
  const [hasOfflineCache, setHasOfflineCache] = useState(() => Boolean(localStorage.getItem("hw_last_synced")));
  const [syncStatus, setSyncStatus] = useState(() => (localStorage.getItem("hw_last_synced") ? "ok" : "needs_sync"));

  const handleLanguage = async (lang) => {
    setLanguage(lang);
    setSaveError(null);
    try {
      await apiPut("/farmer/profile", { preferred_language: lang });
      await refreshUser?.();
      showToast(t("farmer.settings.toast_lang_success", {}, "Language preference updated."));
    } catch {
      setSaveError(t("farmer.settings.toast_lang_error", {}, "Could not save language preference to your account. Please check your connection and try again."));
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSaveError(null);
    try {
      await loadFarmerOfflineData(queryClient, { force: true });
      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      localStorage.setItem("hw_last_synced", `Today, ${nowStr}`);
      setLastSynced(`Today, ${nowStr}`);
      setHasOfflineCache(true);
      setSyncStatus("ok");
      showToast(t("farmer.settings.toast_offline_success", {}, "Offline data updated successfully."));
    } catch {
      setSyncStatus("needs_sync");
      showToast(t("farmer.settings.toast_offline_error", {}, "Could not update offline data. Check your connection and try again."));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-xl flex items-center justify-between">
          <span>{saveError}</span>
          <button
            type="button"
            onClick={() => handleLanguage(language)}
            className="font-semibold underline ml-2 hover:text-red-800"
          >
            {t("farmer.settings.btn_retry", {}, "Retry")}
          </button>
        </div>
      )}
      <Card>
        <SectionLabel>{t("farmer.settings.section_language", {}, "Language")}</SectionLabel>
        <div className="space-y-2">
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang.value}
              type="button"
              onClick={() => handleLanguage(lang.value)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-[14px] font-medium transition-all ${
                language === lang.value
                  ? "bg-[var(--hw-green-50)] border-[var(--hw-green-700)] text-[var(--hw-green-900)]"
                  : "bg-white border-[var(--hw-neutral-200)] text-black hover:bg-[var(--hw-neutral-50)]"
              }`}
            >
              {lang.label}
              {language === lang.value && (
                <div className="w-5 h-5 rounded-full bg-[var(--hw-green-700)] flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionLabel>{t("farmer.settings.section_offline_data", {}, "Offline Data")}</SectionLabel>
        <div className="space-y-2.5 mb-4">
          {[
            { label: t("farmer.settings.offline_last_updated", {}, "Last updated"), value: lastSynced ? lastSynced : t("farmer.settings.offline_never", {}, "Never") },
            { label: t("farmer.settings.offline_data_label", {}, "Offline data"), value: hasOfflineCache ? t("farmer.settings.offline_available", {}, "Available") : t("farmer.settings.offline_unavailable", {}, "Unavailable") },
            { label: t("farmer.settings.offline_status_label", {}, "Status"), value: syncStatus === "ok" ? t("farmer.settings.offline_status_ok", {}, "Up to date") : t("farmer.settings.offline_status_needs_sync", {}, "Needs sync") }
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-[14px] text-black">{row.label}</span>
              <span className="text-[14px] font-medium text-black">
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="h-10 px-4 flex items-center gap-2 border border-[var(--hw-neutral-200)] text-[14px] font-medium text-black rounded-xl hover:bg-[var(--hw-neutral-50)] disabled:opacity-60 transition-colors"
        >
          {syncing ? <><Loader2 className="w-4 h-4 animate-spin" />{t("farmer.syncing", {}, "Updating latest data...")}</> : <><RefreshCw className="w-4 h-4" />{t("farmer.settings.btn_sync_now", {}, "Sync now")}</>}
        </button>
      </Card>
    </div>
  );
};


/* -------------------------------------------------------------------------- */
/* Main Settings Screen                                                       */
/* -------------------------------------------------------------------------- */
function FarmerSettings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { t } = useLanguage();
  const [params, setSearchParams] = useSearchParams();
  const tabFromUrl = params.get("tab") || "account";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [toast, setToast] = useState(null);
  const tabBarRef = useRef(null);

  useEffect(() => {
    const t = params.get("tab") || "account";
    setActiveTab(t);
  }, [params]);

  const showToast = (msg, type = "success") => {
    if (typeof msg === "object" && msg !== null) {
      setToast(msg);
    } else {
      setToast({ message: msg, type });
    }
  };


  useEffect(() => {
    const bar = tabBarRef.current;
    if (!bar) return;
    const btn = bar.querySelector('[data-active="true"]');
    if (btn) btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeTab]);

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      <PageHeader
        title={t("farmer.settings.title", {}, "Settings")}
        description={t("farmer.settings.desc", {}, "Manage your account, farm profile, and app preferences.")}
      />

      <div
        ref={tabBarRef}
        className="flex gap-1 border-b border-[var(--hw-neutral-200)] mb-5"
        style={{ overflowX: "auto", scrollbarWidth: "none" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            data-active={activeTab === tab.id ? "true" : "false"}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setSearchParams({ tab: tab.id });
            }}
            className={`flex-shrink-0 px-3.5 py-2.5 text-[14px] font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)]"
                : "border-transparent text-black hover:text-[var(--hw-green-700)]"
            }`}
          >
            {t(tab.key, {}, tab.label)}
          </button>
        ))}
      </div>

      {activeTab === "account" && <AccountTab showToast={showToast} />}
      {activeTab === "security" && <SecurityTab showToast={showToast} />}
      {activeTab === "farm" && <FarmTab showToast={showToast} />}
      {activeTab === "preferences" && <PreferencesTab showToast={showToast} />}

      <Toast
        message={toast?.message}
        type={toast?.type || "success"}
        onClose={() => setToast(null)}
        duration={5000}
      />
    </div>
  );
}

export { FarmerSettings as default };
