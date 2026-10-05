/**
 * Resolves direct navigation destination routes for notifications across Farmer, DFTC, and Admin.
 */

const COMMODITY_ID_MAP = {
  "atsal (sultan)": "COM-0037",
  "atsal (smooth cayene)": "COM-0036",
  "atsal": "COM-0037",
  "kamatis (diamante big)": "COM-0004",
  "kamatis": "COM-0004",
  "talong (banate king)": "COM-0010",
  "talong": "COM-0010",
  "repolyo (wakamini)": "COM-0020",
  "repolyo": "COM-0020",
  "carrots (big)": "COM-0025",
  "carrots": "COM-0025",
  "pipino (morena)": "COM-0015",
  "pipino": "COM-0015",
  "ampalaya (galaxy)": "COM-0001",
  "ampalaya": "COM-0001",
  "kalabasa (suprema)": "COM-0007",
  "kalabasa": "COM-0007",
  "lettuce (grand rapids)": "COM-0028",
  "lettuce": "COM-0028",
  "chinese pechay (ching-chiang)": "COM-0030",
  "chinese pechay": "COM-0030",
  "pechay": "COM-0030",
};

/**
 * Resolves a canonical commodity ID from metadata or fallback title.
 * Structured metadata is prioritized; title matching is only used if there is no structured alternative.
 */
export function resolveCommodityId(meta = {}, title = "") {
  if (meta.commodity_id) return meta.commodity_id;
  if (meta.commodityId) return meta.commodityId;

  // Structured name / variety
  const name = (meta.commodity_name || meta.commodity || meta.crop_name || meta.crop || meta.name || "").trim().toLowerCase();
  const variety = (meta.variety || "").trim().toLowerCase();

  if (name) {
    if (variety && COMMODITY_ID_MAP[`${name} (${variety})`]) {
      return COMMODITY_ID_MAP[`${name} (${variety})`];
    }
    if (COMMODITY_ID_MAP[name]) {
      return COMMODITY_ID_MAP[name];
    }
  }

  // Only parse commodity names from title string if there is absolutely no structured alternative
  if (title) {
    for (const [key, id] of Object.entries(COMMODITY_ID_MAP)) {
      if (title.toLowerCase().includes(key)) {
        return id;
      }
    }
  }

  return null;
}

export function resolveNotificationRoute(item, role = "Farmer") {
  if (!item) return "/";

  const meta = item.metadata || item.payload || {};
  const cat = item.category || "";

  // 1. Farmer Routes
  if (
    role.toLowerCase() === "farmer" ||
    cat.startsWith("price_") ||
    cat === "weather_alert" ||
    cat === "harvest_reminder" ||
    cat === "planting_advisory"
  ) {
    const commId = resolveCommodityId(meta, item.title);
    const cropPlanId = meta.crop_plan_id || meta.cropPlanId;

    if (cat === "price_change" || cat === "price_update") {
      if (commId) return `/farmer/prices/${commId}`;
      if (item.route && item.route !== "/farmer/prices") return item.route;
      return "/farmer/prices";
    }
    if (cat === "weather_alert") {
      return item.route || "/farmer/market/weather";
    }
    if (cat === "harvest_reminder") {
      if (cropPlanId) return `/farmer/crops/${cropPlanId}`;
      if (item.route && item.route !== "/farmer/crops") return item.route;
      return "/farmer/crops";
    }
    if (cat === "planting_advisory") {
      return item.route || "/farmer/crops";
    }
    if (commId && (item.route?.includes("/prices") || !item.route)) {
      return `/farmer/prices/${commId}`;
    }
    return item.route || "/farmer/prices";
  }

  // 2. DFTC Routes
  if (
    role.toLowerCase() === "dftc" ||
    cat.startsWith("submission_") ||
    cat === "records_need_correction" ||
    cat === "upload_validation_completed"
  ) {
    const subId = meta.submission_id || meta.submissionId || item.dedupe_key?.split(":")?.[2];
    if (subId) {
      return `/dftc/submissions/${subId}`;
    }
    return item.route || "/dftc/submissions";
  }

  // 3. Admin Routes
  //
  // The backend picks the destination per audit action and always sends a
  // route (see api/src/modules/notifications/events.py `_resolve_admin_route`),
  // so the category switch below is only a fallback for rows written before
  // that resolver existed, or by a producer that sends no route at all. Both
  // paths must name real pages: /admin/configuration is an orphan mock whose
  // buttons do nothing, so config work lands on the modules page instead.
  if (item.route) {
    // Avoid legacy redirects
    if (item.route === "/admin/analytics") return "/admin/modules";
    // Mirrors the router redirect in app/routes.jsx — import history lives
    // under Data Sources, not Import & Validate.
    // /admin/history/:id is a real detail page and must pass through — only the
    // bare list path is the legacy redirect.
    if (item.route === "/admin/history") return "/admin/data-sources?tab=history";
    // Pre-fix import rows carry /admin/import and no import_id. New rows land on
    // the history entry directly, so only repair those that still point at the
    // form and can be resolved from their audit action.
    if (item.route === "/admin/import" && meta.import_id) {
      return `/admin/history/${meta.import_id}`;
    }
    // Written by the pre-resolver fan-out. The audit action is still in
    // metadata, so route it the same way the backend does now.
    if (item.route === "/admin/configuration") {
      const action = String(meta.action || "");
      if (action.startsWith("config.threshold")) return "/admin/modules/thresholds";
      if (action.startsWith("config.adaptive_weight")) return "/admin/modules?tab=weights";
      return "/admin/modules";
    }
    return item.route;
  }

  switch (cat) {
    case "import_event":
      // An import alert is about a finished upload. The backend supplies
      // metadata.import_id for new rows so this opens that upload's own history
      // entry; /admin/import is only the form that starts one.
      if (meta.import_id) return `/admin/history/${meta.import_id}`;
      return "/admin/import";
    case "processing_event":
    case "advisory_event":
      return "/admin/modules";
    case "data_event":
      return "/admin/data-sources";
    case "system_event":
      // Weather syncs are driven from the API Sync tab; anything else under
      // system.* is a platform-health concern.
      if (String(meta.action || "").startsWith("system.weather")) {
        return "/admin/data-sources?tab=api-sync";
      }
      return "/admin/system?tab=health";
    case "config_event": {
      const action = String(meta.action || "");
      if (action.startsWith("config.threshold")) return "/admin/modules/thresholds";
      if (action.startsWith("config.adaptive_weight")) return "/admin/modules?tab=weights";
      return "/admin/modules";
    }
    case "user_event":
      if (meta.user_id) return `/admin/system/user/${meta.user_id}`;
      return "/admin/system?tab=users";
    case "auth_event":
      return "/admin/audit-logs";
    default:
      return "/admin/audit-logs";
  }
}
