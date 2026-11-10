/**
 * Farmer "My Activities" page locale strings (Cebuano / Bisaya).
 *
 * Cebuano translations of the English source in en/farmer/myActivities.js.
 * Keys mirror the exact `logs.action` dot-notation codes from the backend.
 */
export const myActivities = {
  title: "Akong Mga Kalihokan",
  description: "Talaan sa imong mga kalihokan sa pag-uma sa HarvestWise — mga plano sa tanom, pag-ani, pagbag-o sa profile ug mga export. Ini nga panid read-only.",
  generatedByFallback: "HarvestWise user",
  emptyDescription: "Imong mga kalihokan mugawas dinhi samtang nag-gamit ka sa HarvestWise.",
  filter: "I-filter ang mga kalihokan",
  filterButton: "I-filter",
  clear: "I-clear",
  exportPdf: "I-export ang PDF",
  preparing: "Giandam…",
  loadError: "Dili ma-load ang imong mga kalihokan. Sulayi pag-usab.",
  emptyTitle: "Wala pay mga kalihokan",
  emptyFiltered: "Walay nakit-ang kalihokan sa gipiling panahon.",
  previous: "Miagi",
  next: "Sunod",
  page: "Panid {page} sa {total}",
  showDetails: "Ipakita ang detalye",
  hideDetails: "Tagoa ang detalye",

  groups: {
    today: "Karong Adlawa",
    yesterday: "Gahapon",
    earlier: "Mas Sayo",
  },

  friendlyActions: {
    "auth.login_failed": "Napakyas ang pagsulay sa pag-sign in",
    "auth.account_locked": "Temporaryong naka-lock ang account",
    "farmer.onboarding_completed": "Nahuman nimo ang pag-setup sa imong farmer profile",
    "farmer.crop_plan_created": "Naghimo ka og bag-ong plano sa tanom",
    "farmer.crop_plan_updated": "Giusab nimo ang plano sa tanom",
    "farmer.crop_plan_promoted": "Gisugdan nimo ang plano sa tanom",
    "farmer.crop_plan_status_updated": "Giusab nimo ang kahimtang sa plano sa tanom",
    "farmer.harvest_logged": "Girekord nimo ang imong ani",
    "farmer.harvest_record_logged": "Nagrekord ka og ani",
    "user.profile_updated": "Gipabag-o nimo ang imong profile",
    "notification.all_marked_read": "Gisusi nimo ang imong mga pahibalo",
    "notification.mark_read": "Gibasa nimo ang usa ka pahibalo",
  },

  filters: {
    allActions: "Tanan nga Aksyon",
    all: "Tanang kalihokan",
    today: "Karong adlawa",
    week: "Karong semanaha",
    month: "Karong bulana",
    auth: "Sign-in ug Seguridad",
    user: "Profile ug Account",
    farmer: "Akong Pag-uma",
    notification: "Mga Pahibalo",
    export: "Mga Export",
  },

  actions: {
    // ── Sign-ins & security ────────────────────────────────────────────
    "auth.login_failed": "Napakyas ang pag-sign in",
    "auth.account_locked": "Naka-lock ang account human sa mga napakyas nga sign-in",
    "auth.password_changed": "Gipalitan ang imong password",
    "auth.password_reset_requested": "Nanghagad og password reset",
    "auth.password_reset_success": "Na-reset ang imong password",
    "auth.password_reset_failed": "Napakyas ang pag-reset sa password",
    "auth.registration_otp_requested": "Nanghagad og sign-up verification code",
    "auth.otp_requested": "Nanghagad og verification code",
    "auth.otp_enable_requested": "Nanghagad og email verification",
    "auth.otp_enabled": "Gipalihok ang email verification",
    "auth.otp_disabled": "Gipalong ang email verification",
    "auth.otp_verify_success": "Nakumpirma ang imong email code",
    "auth.otp_verify_failed": "Napakyas ang pag-verify sa email code",
    "auth.otp_mfa_lockout": "Naka-lock human sa mga napakyas nga verification code",
    "auth.totp_setup": "Giset up ang authenticator app",
    "auth.totp_enabled": "Gipalihok ang authenticator app",
    "auth.totp_disabled": "Gipalong ang authenticator app",
    "auth.totp_verify_success": "Nakumpirma gamit ang authenticator app",
    "auth.totp_verify_failed": "Napakyas ang pag-verify sa authenticator",
    "auth.totp_mfa_lockout": "Naka-lock human sa mga napakyas nga authenticator attempt",
    "auth.totp_recovery_used": "Gigamit ang recovery code",
    "auth.recovery_codes_regenerated": "Gihimo pag-usab ang recovery codes",
    "auth.oauth_linked": "Gidakop ang Google account",
    "auth.oauth_unlinked": "Gitangtang ang Google account",
    "auth.token_reuse_detected": "Security alert: gigamit pag-usab ang session token",

    // ── Profile & account ──────────────────────────────────────────────
    "user.profile_updated": "Gipabag-o ang imong profile",
    "user.profile_picture_updated": "Gipabag-o ang imong profile picture",
    "user.data_exported": "Gidownload ang kopya sa imong datos",
    "user.preferences_updated": "Gipabag-o ang imong mga preference sa pag-submit",
    "user.removal_requested": "Nanghagad sa pagtanggal sa account",
    "user.removal_cancelled": "Gikansela ang imong paghagad sa pagtanggal sa account",
    "user.removal_fulfilled": "Kompleto na ang pagtanggal sa account",
    "user.updated": "Gipabag-o ang mga detalye sa account",

    // ── Farming ────────────────────────────────────────────────────────
    "farmer.onboarding_completed": "Nahuman ang setup sa imong farmer profile",
    "farmer.crop_plan_created": "Gihimo ang plano sa tanom",
    "farmer.crop_plan_updated": "Gipabag-o ang plano sa tanom",
    "farmer.crop_plan_draft_saved": "Na-save ang draft sa plano sa tanom",
    "farmer.crop_plan_promoted": "Gipadulong ang plano sa tanom",
    "farmer.crop_plan_status_updated": "Giusab ang kahimtang sa plano sa tanom",
    "farmer.farmgate_price_updated": "Gipabag-o ang presyo sa farmgate",
    "farmer.cost_added": "Gidugang ang gasto sa produksyon",
    "farmer.calendar_created": "Gidugang ang entry sa kalendaryo",
    "farmer.calendar_updated": "Gipabag-o ang entry sa kalendaryo",
    "farmer.calendar_deleted": "Gipanggalang entry sa kalendaryo",
    "farmer.harvest_logged": "Girekord ang ani",
    "farmer.harvest_record_logged": "Girekord ang record sa ani",

    // ── Notifications ──────────────────────────────────────────────────
    "notification.preference_created": "Gidugang ang preference sa pahibalo",
    "notification.preference_updated": "Gipabag-o ang preference sa pahibalo",
    "notification.preference_deleted": "Gitangtang ang preference sa pahibalo",
    "notification.mark_read": "Gimarka ang pahibalo nga nabasa",
    "notification.all_marked_read": "Gimarka tanan nga pahibalo nga nabasa",

    // ── Exports ────────────────────────────────────────────────────────
    "export.my_activities_pdf": "Gi-export ang imong history sa kalihokan",
  },
};
