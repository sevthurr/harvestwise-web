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

  // 1. Respect valid persisted route if already explicit and non-generic
  if (item.route) {
    const r = item.route;
    // Normalize legacy redirects
    if (r === "/admin/analytics") return "/admin/modules";
    if (r === "/admin/history") return "/admin/data-sources?tab=history";
    if (r === "/admin/import" && meta.import_id) return `/admin/history/${meta.import_id}`;
    if (r === "/admin/configuration") {
      const action = String(meta.action || "");
      if (action.startsWith("config.threshold")) return "/admin/modules/thresholds";
      if (action.startsWith("config.adaptive_weight")) return "/admin/modules?tab=weights";
      return "/admin/modules";
    }
    // Return specific persisted routes directly
    if (
      r.startsWith("/farmer/prices/COM-") ||
      r.startsWith("/farmer/crops/") ||
      r.startsWith("/dftc/submissions/") ||
      r.startsWith("/dftc/trends") ||
      r.startsWith("/admin/") ||
      r === "/farmer/market/weather" ||
      r.startsWith("/farmer/market/factors") ||
      r === "/farmer/market/dftc-arrivals" ||
      r === "/farmer/market/seasonal-production" ||
      r.startsWith("/farmer/market")
    ) {
      return r;
    }
  }

  // 2. Farmer Routes
  if (
    role.toLowerCase() === "farmer" ||
    cat.startsWith("price_") ||
    cat === "arrival_update" ||
    cat === "production_update" ||
    cat === "weather_alert" ||
    cat === "harvest_reminder" ||
    cat === "planting_advisory"
  ) {
    const commId = resolveCommodityId(meta, item.title);
    const cropPlanId = meta.crop_plan_id || meta.cropPlanId;

    if (cat === "price_change" || cat === "price_update") {
      if (commId) return `/farmer/prices/${commId}`;
      return item.route || "/farmer/prices";
    }
    if (cat === "arrival_update") {
      if (cropPlanId) return `/farmer/crops/${cropPlanId}/factors?tab=arrival`;
      if (commId) return `/farmer/market/factors?commodity=${commId}&tab=arrival`;
      return item.route || "/farmer/crops";
    }
    if (cat === "production_update") {
      if (cropPlanId) return `/farmer/crops/${cropPlanId}/factors?tab=production`;
      if (commId) return `/farmer/market/factors?commodity=${commId}&tab=production`;
      return item.route || "/farmer/crops";
    }
    if (cat === "weather_alert") {
      return item.route || "/farmer/market/weather";
    }
    if (cat === "harvest_reminder") {
      if (cropPlanId) return `/farmer/crops/${cropPlanId}`;
      return item.route || "/farmer/crops";
    }
    if (cat === "planting_advisory") {
      const targetCommId = commId || meta.commodity_id || meta.commodityId;
      if (targetCommId) return `/farmer/market?highlight=${targetCommId}`;
      return item.route || "/farmer/market";
    }
    if (commId) {
      return `/farmer/prices/${commId}`;
    }
    return item.route || "/farmer/prices";
  }

  // 3. DFTC Routes
  if (
    role.toLowerCase() === "dftc" ||
    cat === "price_volatility" ||
    cat === "oversupply_alert" ||
    cat.startsWith("submission_") ||
    cat === "records_need_correction" ||
    cat === "upload_validation_completed"
  ) {
    if (cat === "price_volatility") {
      return item.route || "/dftc/trends?tab=price&alert=volatility";
    }
    if (cat === "oversupply_alert") {
      return item.route || "/dftc/trends?tab=arrival&alert=oversupply";
    }
    const subId = meta.submission_id || meta.submissionId || item.dedupe_key?.split(":")?.[2];
    if (subId) {
      return `/dftc/submissions/${subId}`;
    }
    return item.route || "/dftc/submissions";
  }

  // 4. Admin / SuperAdmin Routes
  switch (cat) {
    case "pipeline_failed":
    case "processing_event":
    case "advisory_event":
      return "/admin/modules";
    case "ingestion_failed":
      if (meta.import_id) return `/admin/history/${meta.import_id}`;
      return "/admin/data-sources";
    case "security_alert":
    case "auth_event":
      return "/admin/audit-logs";
    case "import_event":
      if (meta.import_id) return `/admin/history/${meta.import_id}`;
      return "/admin/import";
    case "data_event":
      return "/admin/data-sources";
    case "system_event":
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
      if (meta.target_user_id) return `/admin/system/user/${meta.target_user_id}`;
      if (meta.user_id) return `/admin/system/user/${meta.user_id}`;
      return "/admin/system?tab=users";
    default:
      return item.route || "/admin/audit-logs";
  }
}
