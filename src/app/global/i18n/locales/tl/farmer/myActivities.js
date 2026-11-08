/**
 * Farmer "My Activities" page locale strings (Tagalog / Filipino).
 *
 * Tagalog translations of the English source in en/farmer/myActivities.js.
 * Keys mirror the exact `logs.action` dot-notation codes from the backend.
 */
export const myActivities = {
  title: "Aking Mga Gawain",
  description: "Tingnan ang iyong mga ginawa sa HarvestWise — mga sign-in, pagbabago sa profile, mga plano sa pananim, pag-aani at mga export. Ito ay read-only na pahina.",
  generatedByFallback: "HarvestWise user",
  emptyDescription: "Lalabas dito ang iyong mga gawain habang ginagamit mo ang HarvestWise.",
  filter: "I-filter ang mga gawain",
  filterButton: "I-filter",
  clear: "I-clear",
  exportPdf: "I-export ang PDF",
  preparing: "Inihahanda…",
  loadError: "Hindi ma-load ang iyong mga gawain. Pakisubukang muli.",
  emptyTitle: "Wala pang mga gawain",
  emptyFiltered: "Walang nakitang gawain para sa napiling panahon.",
  previous: "Nakaraan",
  next: "Susunod",
  page: "Pahina {page} ng {total}",
  showDetails: "Ipakita ang detalye",
  hideDetails: "Itago ang detalye",

  groups: {
    today: "Ngayon",
    yesterday: "Kahapon",
    earlier: "Mas maaga",
  },

  friendlyActions: {
    "auth.login": "Binuksan mo ang HarvestWise",
    "auth.logout": "Isinara mo ang HarvestWise",
    "auth.login_failed": "Hindi matagumpay ang pagtatangkang mag-sign in",
    "auth.account_locked": "Pansamantalang naka-lock ang account",
    "notification.all_marked_read": "Sinuri mo ang iyong mga abiso",
    "notification.mark_read": "Binasa mo ang isang abiso",
  },

  filters: {
    allActions: "Lahat ng Aksyon",
    all: "Lahat ng gawain",
    today: "Ngayon",
    week: "Ngayong linggo",
    month: "Ngayong buwan",
    auth: "Sign-in at Seguridad",
    user: "Profile at Account",
    farmer: "Aking Pagsasaka",
    notification: "Mga Abiso",
    export: "Mga Export",
  },

  actions: {
    // ── Sign-ins & security ────────────────────────────────────────────
    "auth.login": "Naka-sign in",
    "auth.logout": "Naka-log out",
    "auth.login_failed": "Nabigo ang pag-sign in",
    "auth.account_locked": "Naka-lock ang account matapos ang mga nabigong sign-in",
    "auth.password_changed": "Pinapalitan ang iyong password",
    "auth.password_reset_requested": "Humingi ng password reset",
    "auth.password_reset_success": "Na-reset ang iyong password",
    "auth.password_reset_failed": "Nabigo ang pag-reset ng password",
    "auth.registration_otp_requested": "Humingi ng sign-up verification code",
    "auth.otp_requested": "Humingi ng verification code",
    "auth.otp_enable_requested": "Humingi ng email verification",
    "auth.otp_enabled": "Pinagana ang email verification",
    "auth.otp_disabled": "Hininto ang email verification",
    "auth.otp_verify_success": "Napatunayan ang iyong email code",
    "auth.otp_verify_failed": "Nabigo ang pag-verify ng email code",
    "auth.otp_mfa_lockout": "Naka-lock matapos ang mga nabigong verification code",
    "auth.totp_setup": "Itinakda ang authenticator app",
    "auth.totp_enabled": "Pinagana ang authenticator app",
    "auth.totp_disabled": "Hininto ang authenticator app",
    "auth.totp_verify_success": "Napatunayan gamit ang authenticator app",
    "auth.totp_verify_failed": "Nabigo ang pag-verify sa authenticator",
    "auth.totp_mfa_lockout": "Naka-lock matapos ang mga nabigong authenticator attempt",
    "auth.totp_recovery_used": "Ginamit ang recovery code",
    "auth.recovery_codes_regenerated": "Muling binuo ang recovery codes",
    "auth.oauth_linked": "Ini-link ang Google account",
    "auth.oauth_unlinked": "Tinanggal ang link sa Google account",
    "auth.token_reuse_detected": "Security alert: muling ginamit ang session token",

    // ── Profile & account ──────────────────────────────────────────────
    "user.profile_updated": "Ibinago ang iyong profile",
    "user.profile_picture_updated": "Ibinago ang iyong profile picture",
    "user.data_exported": "Nai-download ang kopya ng iyong datos",
    "user.preferences_updated": "Ibinago ang iyong mga preference sa pagsusumite",
    "user.removal_requested": "Humingi ng pagtanggal sa account",
    "user.removal_cancelled": "Kinansela ang iyong kahilingan sa pagtanggal sa account",
    "user.removal_fulfilled": "Tapos na ang pagtanggal sa account",
    "user.updated": "Ibinago ang mga detalye ng account",

    // ── Farming ────────────────────────────────────────────────────────
    "farmer.onboarding_completed": "Natapos ang setup ng iyong farmer profile",
    "farmer.crop_plan_created": "Gumawa ng plano sa pananim",
    "farmer.crop_plan_updated": "Ibinago ang plano sa pananim",
    "farmer.crop_plan_draft_saved": "Na-save ang draft ng plano sa pananim",
    "farmer.crop_plan_promoted": "Iinantabay ang plano sa pananim",
    "farmer.crop_plan_status_updated": "Ibinago ang katayuan ng plano sa pananim",
    "farmer.farmgate_price_updated": "Ibinago ang presyong farmgate",
    "farmer.cost_added": "Idinagdag ang gastos sa produksyon",
    "farmer.calendar_created": "Idinagdag ang entry sa kalendaryo",
    "farmer.calendar_updated": "Ibinago ang entry sa kalendaryo",
    "farmer.calendar_deleted": "Tinanggal ang entry sa kalendaryo",
    "farmer.harvest_logged": "Naitala ang ani",
    "farmer.harvest_record_logged": "Naitala ang record ng ani",

    // ── Notifications ──────────────────────────────────────────────────
    "notification.preference_created": "Idinagdag ang preference sa abiso",
    "notification.preference_updated": "Ibinago ang preference sa abiso",
    "notification.preference_deleted": "Tinanggal ang preference sa abiso",
    "notification.mark_read": "Minarkahan ang abiso na nabasa",
    "notification.all_marked_read": "Minarkahan lahat ng abiso na nabasa",

    // ── Exports ────────────────────────────────────────────────────────
    "export.my_activities_pdf": "Ni-export ang iyong kasaysayan ng mga gawain",
  },
};
