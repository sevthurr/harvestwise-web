/**
 * Localizes Farmer notification title and body based on current language,
 * notification category, and structured metadata.
 *
 * Supports canonical categories:
 *   - price_change
 *   - price_update
 *   - arrival_update
 *   - production_update
 *   - harvest_reminder (T-7 and T-0)
 *   - weather_alert (Caution, Severe, Severe - Combined Risk)
 *   - planting_advisory (Recommended)
 *
 * Falls back safely to stored title/body if metadata is insufficient or
 * for older legacy records.
 */

const COMMODITY_ID_TO_LABEL = {
  "COM-0037": "Atsal (Sultan)",
  "COM-0036": "Atsal (Smooth Cayene)",
  "COM-0004": "Kamatis (Diamante Big)",
  "COM-0010": "Talong (Banate King)",
  "COM-0020": "Repolyo (Wakamini)",
  "COM-0025": "Carrots (Big)",
  "COM-0015": "Pipino (Morena)",
  "COM-0001": "Ampalaya (Galaxy)",
  "COM-0007": "Kalabasa (Suprema)",
  "COM-0028": "Lettuce (Grand Rapids)",
  "COM-0030": "Chinese Pechay (Ching-Chiang)",
};

export function localizeFarmerNotification(item, t, lang = "en") {
  if (!item) return { title: "", body: "" };

  const fallbackTitle = item.title || "";
  const fallbackBody = item.body || "";
  const category = item.category;
  const metadata = item.metadata || item.payload || {};

  // Extract or resolve commodity
  let commodity =
    metadata.commodity_name ||
    metadata.commodity ||
    metadata.crop_name ||
    metadata.commodity_label ||
    metadata.crop ||
    "";

  // Resolve from commodity_id if available
  const commId = metadata.commodity_id || metadata.commodityId;
  if (!commodity && commId && COMMODITY_ID_TO_LABEL[commId]) {
    commodity = COMMODITY_ID_TO_LABEL[commId];
  }

  // Try extracting commodity from title if not in metadata
  if (!commodity && fallbackTitle) {
    if (category === "price_change") {
      const match = fallbackTitle.match(/^(.*?)\s+(?:price\s+(?:rose|dropped|increased|decreased)|presyo)/i);
      if (match) commodity = match[1];
    } else if (category === "price_update") {
      const match = fallbackTitle.match(/^(?:New prices available for|New price update for|Bag-ong presyo alang sa|Bagong presyo para sa)\s+(.*)$/i);
      if (match) commodity = match[1];
    } else if (category === "arrival_update") {
      const match = fallbackTitle.match(/^(?:High market arrival for|Taas nga abot sa merkado alang sa|Mataas na suplay sa merkado para sa)\s+(.*)$/i);
      if (match) commodity = match[1];
    } else if (category === "production_update") {
      const match = fallbackTitle.match(/^(?:High seasonal production period for|Panahon sa taas nga produksiyon alang sa|Panahon ng mataas na produksyon para sa)\s+(.*)$/i);
      if (match) commodity = match[1];
    } else if (category === "weather_alert") {
      const match = fallbackTitle.match(/^(?:Weather\s+(?:Caution|Severe|Severe - Combined Risk|caution|severe|favorable)\s+for|Alerto sa panahon.*?alang sa|Alerto sa panahon.*?para sa)\s+(.*)$/i);
      if (match) commodity = match[1];
    } else if (category === "harvest_reminder") {
      const match1 = fallbackTitle.match(/^(.*?)\s+(?:ready for harvest|harvest in 7 days|expected harvest date today|Andam na alang sa pag-ani|Handa na para sa pag-aani|sulod sa 7 ka adlaw|sa loob ng 7 araw|ngayon|karon)/i);
      const match2 = fallbackTitle.match(/^(?:Harvest logged for|Narekord na ang pag-ani sa|Naitala na ang pag-aani ng)\s+(.*)$/i);
      if (match1) commodity = match1[1];
      else if (match2) commodity = match2[1];
    } else if (category === "planting_advisory") {
      const match = fallbackTitle.match(
        /^(?:Recommended to plant(?:\s*:|\s+for|\s+)|Planting advisory(?:\s+for|:)|Planting window open for|Conditions easing for|Hold off planting|Girekomenda nga itanom(?:\s*:|\s+)|Inirerekomendang itanim(?:\s*:|\s+)|Pahibalo sa pagtanom alang sa|Abli na ang panahon sa pagtanom alang sa|Payo sa pagtatanim para sa|Bukas na ang panahon ng pagtatanim para sa)\s+(.*?)(?:\s+for now|\s+sa pagkakaron|\s+sa ngayon)?$/i
      );
      if (match) commodity = match[1];
    }
  }

  // If no commodity could be determined, fallback to stored title/body
  if (!commodity) {
    return { title: fallbackTitle, body: fallbackBody };
  }

  // 1. PRICE CHANGE
  if (category === "price_change") {
    let direction = metadata.direction;
    if (!direction && fallbackTitle) {
      if (/rose|increased|up|Misaka|Musaka|Tumaas/i.test(fallbackTitle)) direction = "rose";
      else if (/dropped|decreased|down|Mius-os|Nius-os|Nibaba|Bumaba/i.test(fallbackTitle)) direction = "dropped";
    }
    direction = direction || "rose";

    let latest = metadata.latest ?? metadata.current_price;
    let prev = metadata.prev ?? metadata.previous_price;
    if ((latest == null || prev == null) && fallbackBody) {
      const match = fallbackBody.match(/is\s+([\d\.]+)\s+PHP\/kg,\s+(?:up|down)\s+from\s+([\d\.]+)\s+PHP\/kg/i);
      if (match) {
        latest = match[1];
        prev = match[2];
      }
    }

    const titleKey =
      direction === "dropped"
        ? "farmer.notifications.price_dropped_title"
        : "farmer.notifications.price_rose_title";
    const bodyKey =
      direction === "dropped"
        ? "farmer.notifications.price_dropped_body"
        : "farmer.notifications.price_rose_body";
    const generalBodyKey =
      direction === "dropped"
        ? "farmer.notifications.price_dropped_general_body"
        : "farmer.notifications.price_rose_general_body";

    const title = t(titleKey, { commodity }, fallbackTitle) || fallbackTitle;
    const body =
      latest != null && prev != null
        ? (t(bodyKey, { commodity, latest: Number(latest).toFixed(2), prev: Number(prev).toFixed(2) }, fallbackBody) || fallbackBody)
        : (t(generalBodyKey, { commodity }, fallbackBody) || fallbackBody);

    return { title, body };
  }

  // 2. PRICE UPDATE
  if (category === "price_update") {
    let price = metadata.price != null ? metadata.price : (metadata.prevail_price ?? metadata.latest ?? metadata.current_price);
    if (price == null && fallbackBody) {
      const match = fallbackBody.match(/(?:is|kay|ay)\s+([\d\.]+)\s+PHP\/kg/i);
      if (match) price = match[1];
    }

    let date = metadata.price_date || metadata.date;
    if (!date && fallbackBody) {
      const match = fallbackBody.match(/(?:as of|sugod|simula)\s+(\d{4}-\d{2}-\d{2})/i);
      if (match) date = match[1];
    }

    const title = t("farmer.notifications.price_update_title", { commodity }, fallbackTitle) || fallbackTitle;
    let body;
    if (price != null) {
      body = t("farmer.notifications.price_update_body", { commodity, price: Number(price).toFixed(2) }, fallbackBody) || fallbackBody;
    } else if (date) {
      body = t("farmer.notifications.price_update_date_body", { commodity, date }, fallbackBody) || fallbackBody;
    } else {
      body = t("farmer.notifications.price_update_general_body", { commodity }, fallbackBody) || fallbackBody;
    }

    return { title, body };
  }

  // 3. ARRIVAL UPDATE
  if (category === "arrival_update") {
    const volume = metadata.volume_tons ?? (metadata.volume_kg ? (metadata.volume_kg / 1000).toFixed(1) : "16.4");
    const date = metadata.arrival_date || metadata.date || new Date().toISOString().slice(0, 10);

    const title = t("farmer.notifications.arrival_high_title", { commodity }, fallbackTitle) || fallbackTitle;
    const body = t("farmer.notifications.arrival_high_body", { commodity, volume, date }, fallbackBody) || fallbackBody;
    return { title, body };
  }

  // 4. PRODUCTION UPDATE
  if (category === "production_update") {
    const quarter = metadata.quarter || "Q3";
    const title = t("farmer.notifications.production_high_title", { commodity }, fallbackTitle) || fallbackTitle;
    const body = t("farmer.notifications.production_high_body", { commodity, quarter }, fallbackBody) || fallbackBody;
    return { title, body };
  }

  // 5. WEATHER ALERT
  if (category === "weather_alert") {
    let rawVerdict = (metadata.verdict || metadata.risk || "").toLowerCase();
    let riskKey = "farmer.notifications.risk_caution";
    let defaultRiskLabel = "Caution";

    if (rawVerdict.includes("combined")) {
      riskKey = "farmer.notifications.risk_severe_combined";
      defaultRiskLabel = "Severe - Combined Risk";
    } else if (rawVerdict.includes("severe") || /severe|peligro|panganib/i.test(fallbackTitle)) {
      riskKey = "farmer.notifications.risk_severe";
      defaultRiskLabel = "Severe";
    } else if (rawVerdict.includes("favorable") || /favorable|paborable/i.test(fallbackTitle)) {
      riskKey = "farmer.notifications.risk_favorable";
      defaultRiskLabel = "Favorable";
    }

    const riskLabel = t(riskKey, {}, defaultRiskLabel);
    const title = t("farmer.notifications.weather_alert_title", { commodity, risk: riskLabel }, fallbackTitle) || fallbackTitle;
    const body = t("farmer.notifications.weather_alert_body", { commodity, risk: riskLabel }, fallbackBody) || fallbackBody;

    return { title, body };
  }

  // 6. HARVEST REMINDER
  if (category === "harvest_reminder") {
    const isLogged = metadata.type === "logged" || /Harvest logged|Narekord na|Naitala na/i.test(fallbackTitle);
    if (isLogged) {
      const title = t("farmer.notifications.harvest_logged_title", { commodity }, fallbackTitle) || fallbackTitle;
      const body = t("farmer.notifications.harvest_logged_body", { commodity }, fallbackBody) || fallbackBody;
      return { title, body };
    }

    const milestone = metadata.milestone || (fallbackTitle.includes("7 days") || fallbackTitle.includes("7 ka adlaw") || fallbackTitle.includes("7 araw") ? "T-7" : (fallbackTitle.includes("today") || fallbackTitle.includes("karon") || fallbackTitle.includes("ngayon") ? "T-0" : null));
    const date = metadata.expected_harvest_date || metadata.date || "";

    if (milestone === "T-7") {
      const title = t("farmer.notifications.harvest_t7_title", { commodity, date }, fallbackTitle) || fallbackTitle;
      const body = t("farmer.notifications.harvest_t7_body", { commodity, date }, fallbackBody) || fallbackBody;
      return { title, body };
    }

    if (milestone === "T-0") {
      const title = t("farmer.notifications.harvest_t0_title", { commodity, date }, fallbackTitle) || fallbackTitle;
      const body = t("farmer.notifications.harvest_t0_body", { commodity, date }, fallbackBody) || fallbackBody;
      return { title, body };
    }

    const title = t("farmer.notifications.harvest_ready_title", { commodity }, fallbackTitle) || fallbackTitle;
    const body = date
      ? (t("farmer.notifications.harvest_ready_body", { commodity, date }, fallbackBody) || fallbackBody)
      : (t("farmer.notifications.harvest_ready_general_body", { commodity }, fallbackBody) || fallbackBody);

    return { title, body };
  }

  // 7. PLANTING ADVISORY
  if (category === "planting_advisory") {
    const verdict = (metadata.verdict || "").toLowerCase();
    const isRecommended = verdict === "recommended" || /Recommended|Girekomenda|Inirerekomenda/i.test(fallbackTitle);
    const isOpen = verdict === "suitable" || /window open|abli na ang panahon|bukas na ang panahon/i.test(fallbackTitle);

    if (isOpen && !isRecommended) {
      const title = t("farmer.notifications.planting_open_title", { commodity }, fallbackTitle) || fallbackTitle;
      const body = t("farmer.notifications.planting_suitable_body", { commodity }, fallbackBody) || fallbackBody;
      return { title, body };
    }

    const title = t("farmer.notifications.planting_recommended_title", { commodity }, fallbackTitle) || fallbackTitle;
    const body = t("farmer.notifications.planting_recommended_body", { commodity }, fallbackBody) || fallbackBody;
    return { title, body };
  }

  // Default fallback
  return { title: fallbackTitle, body: fallbackBody };
}
