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

  // Removal notifications identify a request record, not just the affected
  // user. Keep this before the persisted-route branch for older rows whose
  // route still points at the user's profile.
  if (role.toLowerCase() === "admin" && cat === "user_event") {
    const action = String(meta.action || "").toLowerCase();
    const requestId = meta.removal_request_id || meta.request_id ||
      String(item.body || item.title || "").match(/ARR-\d+/i)?.[0];
    if (action.includes("removal") && requestId) {
      return `/admin/system?tab=removal-requests&request_id=${encodeURIComponent(requestId)}`;
    }
  }

  // 1. Respect valid persisted route if already explicit and non-generic
  if (item.route) {
    const r = item.route;
    // Normalize legacy redirects
    if (r === "/admin/analytics") return "/admin/modules";
    if (r === "/admin/history") return "/admin/data-sources?tab=history";
    if (r === "/admin/modules/thresholds" || r.startsWith("/admin/modules/thresholds?")) {
      const q = r.includes("?") ? `&${r.slice(r.indexOf("?") + 1)}` : "";
      return `/admin/modules?tab=weights${q}`;
    }
    if (r === "/admin/import" && meta.import_id) return `/admin/history/${meta.import_id}`;
    if (r === "/admin/configuration") {
      const action = String(meta.action || "");
      if (action.startsWith("config.threshold") || action.startsWith("config.adaptive_weight")) return "/admin/modules?tab=weights";
      return "/admin/modules";
    }
    // Return specific persisted routes directly (must contain specific path or query params)
    if (
      r.startsWith("/farmer/prices/COM-") ||
      r.startsWith("/farmer/crops/") ||
      r.startsWith("/dftc/submissions/") ||
      r.startsWith("/dftc/trends") ||
      r.startsWith("/dftc/input") ||
      r.startsWith("/dftc/price-input") ||
      r.startsWith("/dftc/arrival-input") ||
      r.startsWith("/dftc/upload") ||
      (r.startsWith("/admin/") && (r.includes("?") || r.startsWith("/admin/history/") || r.startsWith("/admin/data-sources/") || r.startsWith("/admin/system/user/"))) ||
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
      const targetCommId = commId || meta.commodity_id || meta.commodityId;
      if (item.route && item.route.includes("highlight=")) return item.route;
      if (targetCommId) return `/farmer/market/weather?highlight=${targetCommId}`;
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
    cat === "manual_price_entry" ||
    cat === "manual_arrival_entry" ||
    cat.startsWith("manual_") ||
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
    if (cat === "manual_price_entry") {
      return item.route || "/dftc/input?highlight=price";
    }
    if (cat === "manual_arrival_entry") {
      return item.route || "/dftc/input?highlight=arrival";
    }
    const subId = meta.submission_id || meta.submissionId || item.dedupe_key?.split(":")?.[2];
    if (subId) {
      return `/dftc/submissions/${subId}`;
    }
    return item.route || "/dftc/submissions";
  }

  // 4. Admin / SuperAdmin Routes
  switch (cat) {
    case "pipeline_failed": {
      const rawMod = meta.module || meta.moduleKey || "";
      const mod = rawMod.toLowerCase();
      const err = meta.error ? `?alert=${encodeURIComponent(meta.error)}` : "";
      if (mod.includes("forecast") || mod.includes("price")) {
        return `/admin/forecasting${err}`;
      }
      if (mod.includes("arrival")) {
        return "/admin/modules?tab=outputs&highlight=arrival-pressure";
      }
      if (mod.includes("weather")) {
        return "/admin/modules?tab=outputs&highlight=weather-risk";
      }
      if (mod.includes("production") || mod.includes("seasonal")) {
        return "/admin/modules?tab=outputs&highlight=historical-production";
      }
      const slug = mod.replace(/\s+/g, "-");
      return `/admin/modules?tab=outputs&highlight=${encodeURIComponent(slug)}`;
    }
    case "processing_event":
    case "advisory_event": {
      const rawMod = meta.module || meta.moduleKey || "";
      if (!rawMod) return "/admin/modules";
      const mod = rawMod.toLowerCase();
      if (mod.includes("forecast") || mod.includes("price")) {
        return "/admin/modules?tab=outputs&highlight=price-outlook";
      }
      if (mod.includes("arrival")) {
        return "/admin/modules?tab=outputs&highlight=arrival-pressure";
      }
      if (mod.includes("weather")) {
        return "/admin/modules?tab=outputs&highlight=weather-risk";
      }
      if (mod.includes("production") || mod.includes("seasonal")) {
        return "/admin/modules?tab=outputs&highlight=historical-production";
      }
      const slug = mod.replace(/\s+/g, "-");
      return `/admin/modules?tab=outputs&highlight=${encodeURIComponent(slug)}`;
    }
    case "ingestion_failed":
      if (meta.import_id) return `/admin/history/${meta.import_id}`;
      if (meta.source) {
        return `/admin/data-sources?tab=sources&highlight=${encodeURIComponent(meta.source)}`;
      }
      return "/admin/data-sources";
    case "security_alert":
    case "auth_event": {
      const search = meta.event_type || meta.action || "";
      const hl = meta.target_user_id || meta.user_id || (search && search !== "auth" ? search : "");
      const searchParam = search ? `search=${encodeURIComponent(search)}` : "";
      const hlParam = hl ? `highlight=${encodeURIComponent(hl)}` : "";
      const query = [searchParam, hlParam].filter(Boolean).join("&");
      return query ? `/admin/audit-logs?${query}` : "/admin/audit-logs";
    }
    case "import_event":
      if (meta.import_id) return `/admin/history/${meta.import_id}`;
      return "/admin/import";
    case "data_event":
      if (meta.source) return `/admin/data-sources?tab=sources&highlight=${encodeURIComponent(meta.source)}`;
      return "/admin/data-sources";
    case "system_event":
      if (String(meta.action || "").startsWith("system.weather")) {
        return "/admin/data-sources?tab=api-sync";
      }
      return "/admin/system?tab=health";
    case "config_event": {
      const action = String(meta.action || "");
      const param = meta.param || meta.rule || "";
      if (action.startsWith("config.threshold") || action.startsWith("config.adaptive_weight")) {
        return param ? `/admin/modules?tab=weights&highlight=${encodeURIComponent(param)}` : "/admin/modules?tab=weights";
      }
      return "/admin/modules";
    }
    case "user_event": {
      if (meta.target_user_id) return `/admin/system/user/${meta.target_user_id}`;
      if (meta.user_id) return `/admin/system/user/${meta.user_id}`;
      return "/admin/system?tab=users";
    }
    default:
      return item.route || "/admin/audit-logs";
  }
}
