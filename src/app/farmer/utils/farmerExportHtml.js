/**
 * Render the `GET /dftc/data-export` payload as a self-contained, human-readable
 * HTML document a farmer can open in any browser (and print to PDF).
 *
 * The payload (see `api/src/modules/dftc/service.py`) is a raw data dump: its
 * keys are snake_case, its ids are opaque, and it is explicitly *not* an API
 * contract. A farmer cannot read that, so this module only presents it — every
 * value is escaped, labels come from the active locale, and fields a farmer
 * cannot act on are omitted rather than shown as raw codes.
 */

import {
  t as translate,
  formatCurrency,
  formatDate,
  formatNumber,
  normalizeLangCode,
} from "../../global/i18n";

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape any value before it is interpolated into the generated document. */
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

const has = (value) =>
  value !== null && value !== undefined && String(value).trim() !== "";

const LANGUAGE_KEYS = {
  en: "common.lang_en",
  ceb: "common.lang_ceb",
  tl: "common.lang_tl",
};

const STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 24px; background: #f6f7f5; color: #1f2a24;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    line-height: 1.5; }
  main { max-width: 820px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e6e1;
    border-radius: 12px; padding: 28px 32px 40px; }
  header h1 { margin: 0 0 4px; font-size: 24px; color: #14532d; }
  header p { margin: 0 0 4px; color: #4b5563; }
  .meta { margin: 12px 0 0; font-size: 13px; color: #6b7280; }
  section { margin-top: 32px; }
  section > h2 { font-size: 18px; margin: 0 0 12px; padding-bottom: 6px;
    border-bottom: 2px solid #dfe7dd; color: #14532d; }
  h3 { font-size: 16px; margin: 20px 0 8px; color: #1f2a24; }
  h4 { font-size: 14px; margin: 16px 0 6px; color: #374151; }
  dl { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; }
  .field { display: contents; }
  dt { color: #6b7280; font-size: 14px; }
  dd { margin: 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0 8px; font-size: 14px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #edf0ec;
    vertical-align: top; }
  th { background: #f3f6f2; color: #374151; font-weight: 600; }
  .none { color: #9ca3af; font-style: italic; }
  footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #edf0ec;
    font-size: 12px; color: #6b7280; }
  @media print { body { background: #ffffff; padding: 0; } main { border: 0; } }
`;

/**
 * @param {object} payload  the `/dftc/data-export` response body
 * @param {string} lang     active language code (en | ceb | tl)
 * @returns {string} a complete HTML document
 */
export function buildFarmerExportHtml(payload, lang = "ceb") {
  const code = normalizeLangCode(lang);
  const t = (key) => translate(key, {}, code);
  const date = (value) => (has(value) ? formatDate(value, {}, code) : "");
  const money = (value) => (has(value) ? formatCurrency(Number(value), code) : "");
  const num = (value) => (has(value) ? formatNumber(Number(value), {}, code) : "");
  const languageName = (value) =>
    has(value) && LANGUAGE_KEYS[String(value).toLowerCase()]
      ? t(LANGUAGE_KEYS[String(value).toLowerCase()])
      : value;

  const field = (labelKey, value) =>
    has(value)
      ? `<div class="field"><dt>${escapeHtml(t(labelKey))}</dt><dd>${escapeHtml(
          value
        )}</dd></div>`
      : "";

  const dl = (fields) => (fields ? `<dl>${fields}</dl>` : "");

  const section = (titleKey, body) =>
    body ? `<section><h2>${escapeHtml(t(titleKey))}</h2>${body}</section>` : "";

  const table = (captionKey, columnKeys, rows) => {
    const body = rows.length
      ? rows
          .map(
            (cells) =>
              `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`
          )
          .join("")
      : `<tr><td class="none" colspan="${columnKeys.length}">${escapeHtml(
          t("farmer.settings.export_none")
        )}</td></tr>`;
    const head = columnKeys
      .map((k) => `<th>${escapeHtml(t(k))}</th>`)
      .join("");
    return `<h4>${escapeHtml(t(captionKey))}</h4><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  };

  const profile = payload?.profile || {};
  const account = dl([
    field("farmer.settings.export_email", profile.email),
    field("farmer.settings.export_phone", profile.phone),
    field("farmer.settings.export_account_type", profile.role_name),
    field("farmer.settings.export_language", languageName(profile.preferred_language)),
    field("farmer.settings.export_registered", date(profile.created_at)),
  ].join(""));

  const farmers = Array.isArray(payload?.farmers) ? payload.farmers : [];
  const farm = farmers
    .map((farmer) => {
      const name = [
        farmer.first_name,
        farmer.middle_name,
        farmer.last_name,
        farmer.suffix,
      ]
        .filter(has)
        .join(" ");
      const coords =
        has(farmer.latitude) && has(farmer.longitude)
          ? `${num(farmer.latitude)}, ${num(farmer.longitude)}`
          : "";
      return dl([
        field("farmer.settings.export_name", name),
        field(
          "farmer.settings.export_farm_size",
          has(farmer.farm_size)
            ? `${num(farmer.farm_size)} ${t("farmer.settings.export_unit_ha")}`
            : ""
        ),
        field("farmer.settings.export_location", farmer.location_name),
        field("farmer.settings.export_city", farmer.city),
        field("farmer.settings.export_district", farmer.district),
        field("farmer.settings.export_barangay", farmer.barangay),
        field("farmer.settings.export_purok", farmer.purok_sitio),
        field("farmer.settings.export_street", farmer.street),
        field("farmer.settings.export_buyer", farmer.usual_selling_area_or_buyer),
        field("farmer.settings.export_coordinates", coords),
        field("farmer.settings.export_registered", date(farmer.registered_at)),
      ].join(""));
    })
    .join("");

  const plans = Array.isArray(payload?.crop_plans) ? payload.crop_plans : [];
  const crops = plans
    .map((plan) => {
      const title =
        plan.commodity_name || plan.commodity_id || t("farmer.settings.export_crop");
      const details = dl([
        field("farmer.settings.export_status", plan.status),
        field("farmer.settings.export_selling_method", plan.selling_method_label),
        field("farmer.settings.export_planned_planting", date(plan.planned_planting_date)),
        field("farmer.settings.export_actual_planting", date(plan.actual_planting_date)),
        field("farmer.settings.export_expected_harvest", date(plan.expected_harvest_date)),
        field(
          "farmer.settings.export_farm_area",
          has(plan.farm_area)
            ? `${num(plan.farm_area)} ${t("farmer.settings.export_unit_sqm")}`
            : ""
        ),
        field(
          "farmer.settings.export_expected_qty",
          has(plan.expected_harvest_qty)
            ? `${num(plan.expected_harvest_qty)} ${t("farmer.settings.export_unit_kg")}`
            : ""
        ),
        field("farmer.settings.export_expected_price", money(plan.expected_farmgate_price)),
      ].join(""));

      const costs = table(
        "farmer.settings.export_costs",
        [
          "farmer.settings.export_category",
          "farmer.settings.export_amount",
          "farmer.settings.export_date",
        ],
        (Array.isArray(plan.production_costs) ? plan.production_costs : []).map((c) => [
          c.category,
          money(c.amount),
          date(c.created_at),
        ])
      );

      const calendar = table(
        "farmer.settings.export_calendar",
        [
          "farmer.settings.export_date",
          "farmer.settings.export_activity",
          "farmer.settings.export_notes",
        ],
        (Array.isArray(plan.calendar) ? plan.calendar : []).map((e) => [
          date(e.calendar_date),
          e.event_type,
          e.notes,
        ])
      );

      const harvests = table(
        "farmer.settings.export_harvests",
        [
          "farmer.settings.export_date",
          "farmer.settings.export_quantity",
          "farmer.settings.export_selling_price",
        ],
        (Array.isArray(plan.harvests) ? plan.harvests : []).map((h) => [
          date(h.actual_harvest_date),
          has(h.actual_harvest_qty)
            ? `${num(h.actual_harvest_qty)} ${t("farmer.settings.export_unit_kg")}`
            : "",
          money(h.actual_selling_price_per_kg),
        ])
      );

      return `<h3>${escapeHtml(title)}</h3>${details}${costs}${calendar}${harvests}`;
    })
    .join("");

  const exportedOn = date(payload?.exported_at);
  const meta = exportedOn
    ? `<p class="meta">${escapeHtml(t("farmer.settings.export_exported_on"))}: ${escapeHtml(
        exportedOn
      )}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="${escapeHtml(code)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(t("farmer.settings.export_title"))}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<header>
<h1>${escapeHtml(t("farmer.settings.export_title"))}</h1>
<p>${escapeHtml(t("farmer.settings.export_intro"))}</p>
${meta}
</header>
${section("farmer.settings.export_account", account)}
${section("farmer.settings.export_farm", farm)}
${section("farmer.settings.export_crops", crops)}
<footer>${escapeHtml(t("common.app_name"))}</footer>
</main>
</body>
</html>`;
}
