/**
 * Farmer "My Activities" page locale strings (English).
 *
 * Contains page-level UI copy and plain-language labels for every audit
 * `action` code a farmer can see on their own activity history. The raw code
 * is still rendered as the title attribute in AuditLogsView; only the visible
 * text is humanised here.
 *
 * Keys mirror the exact `logs.action` dot-notation codes from the backend.
 * Anything missing falls back to a generic humanisation of the last segment,
 * so a newly added backend action still renders sensibly.
 */
export const myActivities = {
  title: "My Activities",
  description: "See what you have done on HarvestWise — sign-ins, profile changes, crop plans, harvests and exports. This page is read-only.",
  generatedByFallback: "HarvestWise user",
  emptyDescription: "Your activities will appear here as you use HarvestWise.",
  filter: "Filter activities",
  filterButton: "Filter",
  clear: "Clear",
  exportPdf: "Export PDF",
  preparing: "Preparing…",
  loadError: "Could not load your activities. Please try again.",
  emptyTitle: "No activities yet",
  emptyFiltered: "No activities found for the selected period.",
  previous: "Previous",
  next: "Next",
  page: "Page {page} of {total}",
  showDetails: "Show details",
  hideDetails: "Hide details",

  groups: {
    today: "Today",
    yesterday: "Yesterday",
    earlier: "Earlier",
  },

  friendlyActions: {
    "auth.login": "You opened HarvestWise",
    "auth.logout": "You closed HarvestWise",
    "auth.login_failed": "Sign-in attempt was unsuccessful",
    "auth.account_locked": "Account was temporarily locked",
    "notification.all_marked_read": "You checked your notifications",
    "notification.mark_read": "You read a notification",
  },

  filters: {
    allActions: "All Actions",
    all: "All activities",
    today: "Today",
    week: "This week",
    month: "This month",
    auth: "Sign-ins & Security",
    user: "Profile & Account",
    farmer: "My Farming",
    notification: "Notifications",
    export: "Exports",
  },

  actions: {
    // ── Sign-ins & security ────────────────────────────────────────────
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

    // ── Profile & account ──────────────────────────────────────────────
    "user.profile_updated": "Updated your profile",
    "user.profile_picture_updated": "Updated your profile picture",
    "user.data_exported": "Downloaded a copy of your data",
    "user.preferences_updated": "Updated your submission preferences",
    "user.removal_requested": "Requested account deletion",
    "user.removal_cancelled": "Cancelled your account deletion request",
    "user.removal_fulfilled": "Account deletion completed",
    "user.updated": "Account details updated",

    // ── Farming ────────────────────────────────────────────────────────
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

    // ── Notifications ──────────────────────────────────────────────────
    "notification.preference_created": "Added a notification preference",
    "notification.preference_updated": "Updated a notification preference",
    "notification.preference_deleted": "Removed a notification preference",
    "notification.mark_read": "Marked a notification as read",
    "notification.all_marked_read": "Marked all notifications as read",

    // ── Exports ────────────────────────────────────────────────────────
    "export.my_activities_pdf": "Exported your activity history",
  },
};
