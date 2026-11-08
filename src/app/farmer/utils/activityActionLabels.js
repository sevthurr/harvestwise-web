/**
 * activityActionLabels.js
 *
 * Plain-language labels for the audit `action` codes a farmer can see on their
 * own "My Activities" page. The raw code is what the backend stores and
 * filters on, so it is kept as the title attribute in AuditLogsView; only the
 * visible text is humanised here.
 *
 * Labels are resolved through the i18n system under the
 * `farmer.myActivities.actions.<code>` namespace. Anything missing falls
 * back to a generic humanisation of the last segment, so a newly added
 * backend action still renders sensibly instead of showing raw snake_case.
 *
 * The static FARMER_ACTION_LABELS map is kept for backwards compatibility
 * (tests import it to verify non-empty values) but the runtime path now
 * goes through the i18n dictionary.
 */

import { t as translate } from "../../global/i18n";

// Static English fallback map — also used by tests that verify every label
// is non-empty.
export const FARMER_ACTION_LABELS = {
  // ── Sign-ins & security ────────────────────────────────────────────────
  "auth.login": "Logged in",
  "auth.logout": "Logged out",
  "auth.login_failed": "Failed sign-in attempt",
  "auth.account_locked": "Account locked after failed sign-ins",
  "auth.password_changed": "Changed your password",
  "auth.password_reset_requested": "Requested a password reset",
  "auth.password_reset_success": "Reset your password",
  "auth.password_reset_failed": "Password reset failed",
  "auth.registration_otp_requested": "Requested a sign-up verification code",
  "auth.otp_requested": "Requested a verification code",
  "auth.otp_enable_requested": "Requested email verification",
  "auth.otp_enabled": "Enabled email verification",
  "auth.otp_disabled": "Disabled email verification",
  "auth.otp_verify_success": "Verified your email code",
  "auth.otp_verify_failed": "Email code verification failed",
  "auth.otp_mfa_lockout": "Locked out after failed verification codes",
  "auth.totp_setup": "Set up authenticator app",
  "auth.totp_enabled": "Enabled authenticator app",
  "auth.totp_disabled": "Disabled authenticator app",
  "auth.totp_verify_success": "Verified with authenticator app",
  "auth.totp_verify_failed": "Authenticator verification failed",
  "auth.totp_mfa_lockout": "Locked out after failed authenticator attempts",
  "auth.totp_recovery_used": "Used a recovery code",
  "auth.recovery_codes_regenerated": "Regenerated recovery codes",
  "auth.oauth_linked": "Linked a Google account",
  "auth.oauth_unlinked": "Unlinked a Google account",
  "auth.token_reuse_detected": "Security alert: session token reused",

  // ── Profile & account ──────────────────────────────────────────────────
  "user.profile_updated": "Updated your profile",
  "user.profile_picture_updated": "Updated your profile picture",
  "user.data_exported": "Downloaded a copy of your data",
  "user.preferences_updated": "Updated your submission preferences",
  "user.removal_requested": "Requested account deletion",
  "user.removal_cancelled": "Cancelled your account deletion request",
  "user.removal_fulfilled": "Account deletion completed",
  "user.updated": "Account details updated",

  // ── Farming ────────────────────────────────────────────────────────────
  "farmer.onboarding_completed": "Finished setting up your farmer profile",
  "farmer.crop_plan_created": "Created a crop plan",
  "farmer.crop_plan_updated": "Updated a crop plan",
  "farmer.crop_plan_draft_saved": "Saved a crop plan draft",
  "farmer.crop_plan_promoted": "Moved a crop plan forward",
  "farmer.crop_plan_status_updated": "Changed a crop plan status",
  "farmer.farmgate_price_updated": "Updated a farmgate price",
  "farmer.cost_added": "Added a production cost",
  "farmer.calendar_created": "Added a calendar entry",
  "farmer.calendar_updated": "Updated a calendar entry",
  "farmer.calendar_deleted": "Deleted a calendar entry",
  "farmer.harvest_logged": "Logged a harvest",
  "farmer.harvest_record_logged": "Logged a harvest record",

  // ── Notifications ──────────────────────────────────────────────────────
  "notification.preference_created": "Added a notification preference",
  "notification.preference_updated": "Updated a notification preference",
  "notification.preference_deleted": "Removed a notification preference",
  "notification.mark_read": "Marked a notification as read",
  "notification.all_marked_read": "Marked all notifications as read",

  // ── Exports ────────────────────────────────────────────────────────────
  "export.my_activities_pdf": "Exported your activity history",
};

/**
 * Humanise an unmapped action as a last resort: keep the last dot segment,
 * swap underscores for spaces and sentence-case it.
 */
function humanise(action) {
  const last = String(action ?? "").split(".").pop() || "";
  const words = last.replace(/_/g, " ").toLowerCase();
  if (!words) return " ";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Resolve a human-readable label for an audit action code via the i18n
 * dictionary (`farmer.myActivities.actions.<code>`). Falls back to the
 * static English map, then to humanise().
 *
 * @param {string} action  Dot-notation action code (e.g. "auth.login").
 * @param {string} lang    Language code: "en", "ceb", or "tl". Defaults to "en".
 * @returns {string}       Human-readable label.
 */
export function formatFarmerActionLabel(action, lang = "en") {
  const key = typeof action === "string" ? action : "";
  if (!key) return " ";

  // Try the i18n dictionary first.
  const i18nKey = `farmer.myActivities.actions.${key}`;
  const val = translate(i18nKey, {}, lang);
  if (val && val !== i18nKey) {
    return val;
  }

  // Fall back to the static English map.
  // hasOwnProperty guard: a code such as "constructor" must not resolve to a
  // prototype member and render "[object Object]".
  if (Object.prototype.hasOwnProperty.call(FARMER_ACTION_LABELS, key)) {
    return FARMER_ACTION_LABELS[key];
  }

  return humanise(key);
}

export default formatFarmerActionLabel;
