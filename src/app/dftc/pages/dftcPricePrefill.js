/**
 * Amend-prefill loader for the Add Price Data screen.
 *
 * The old implementation read GET /dftc/reports/preview, which is a *report*
 * endpoint: the repository resolves it with price_date <= day, so it always
 * answered with the most recent prices on or before the selected date. Opening a
 * date with nothing recorded on it therefore filled the form with an older day's
 * numbers, which the user then saved as today's price.
 *
 * This module queries GET /dftc/prices/by-day, which matches one exact date.
 * It never falls back to an earlier date: a missing day must remain empty so
 * an older price cannot be mistaken for a new observation.
 */

import { apiGet, parseResponse } from "../../global/api";
import { PRICE_CATEGORIES } from "./dftc-add-data-data";

export const MARKET_TABS = [
  { id: "bangkerohan-retail", label: "Bangkerohan Retail", market: "Bangkerohan Public Market", priceType: "Retail", sourceId: "bankerohan" },
  { id: "bangkerohan-wholesale", label: "Bangkerohan Wholesale", market: "Bangkerohan Public Market", priceType: "Wholesale", sourceId: "bankerohan" },
  { id: "bangkerohan-landing", label: "Bangkerohan Landing", market: "Bangkerohan Public Market", priceType: "Landing", sourceId: "bankerohan" },
  { id: "dftc-retail", label: "DFTC Retail", market: "DFTC Taboan", priceType: "Retail", sourceId: "dftc" },
  { id: "dftc-wholesale", label: "DFTC Wholesale", market: "DFTC Taboan", priceType: "Wholesale", sourceId: "dftc" }
];

const emptyTabsById = () => Object.fromEntries(MARKET_TABS.map((t) => [t.id, new Map()]));
const PREFILL_CONCURRENCY = 2;

/** "2026-10-05" → "2026-10-04". Returns null for anything unparseable. */
export function previousIsoDate(date) {
  if (typeof date !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function fetchDay(tab, date) {
  const qs = new URLSearchParams({
    source_id: tab.sourceId,
    price_type: tab.priceType,
    reporting_date: date
  });
  const data = await parseResponse(await apiGet(`/dftc/prices/by-day?${qs.toString()}`));
  return Array.isArray(data?.items) ? data.items : [];
}

/**
 * The static mirror's (commodity, variant) pairs. Built once: the mirror never
 * changes at runtime, and resolveVid walks it for every draft cell.
 */
const STATIC_PAIRS = PRICE_CATEGORIES.flatMap((cat) =>
  cat.commodities.flatMap((com) => com.variants.map((v) => ({ com, v })))
);

/**
 * Resolve a DB commodity_id to the form's variant id, or null when this page
 * cannot render it. Takes the page's own resolver so the slug logic and the
 * runtime catalog map stay in one place.
 *
 * `catalogue` is the page's list of { com, v } pairs: the static mirror plus
 * the rows the page gained from the DB catalogue. When it is omitted the
 * static mirror is searched, exactly as before.
 */
export function resolveVid(commodityId, resolveCommodityId, catalogue) {
  if (!commodityId || typeof resolveCommodityId !== "function") return null;
  const pairs = catalogue ?? STATIC_PAIRS;
  for (const { com, v } of pairs) {
    if (resolveCommodityId(com, v) === commodityId) return v.id;
  }
  return null;
}

/**
 * Map shared-draft cells onto the form's (tab, variant) pairs.
 *
 * The market-key + price-type rule lives here so the initial load and the
 * live resync can never drift apart: both ask the same question, "which column
 * does this cell belong to?". A cell whose commodity this page cannot render
 * is skipped, exactly as the day loader skips it.
 *
 * `catalogue` is the page's list of { com, v } pairs; it is passed through to
 * resolveVid so a row the page gained from the DB catalogue can be resolved.
 */
export function resolveDraftCellTargets(cells, resolveCommodityId, catalogue) {
  const out = [];
  for (const cell of Array.isArray(cells) ? cells : []) {
    const tab = MARKET_TABS.find(
      (t) => t.sourceId === (cell.source_key || cell.source_id) && t.priceType === cell.price_type,
    );
    if (!tab) continue;
    const vid = resolveVid(cell.commodity_id, resolveCommodityId, catalogue);
    if (!vid) continue;
    out.push({ tab, vid, cell });
  }
  return out;
}

/** Keep only priced items this page can render, keyed by variant id. */
function collect(items, resolveCommodityId) {
  const map = new Map();
  let unrenderable = 0;
  for (const item of items) {
    if (item?.prevail_price === null || item?.prevail_price === undefined) continue;
    const vid = resolveVid(item.commodity_id, resolveCommodityId);
    if (!vid) { unrenderable += 1; continue; }
    map.set(vid, {
      commodity_id: item.commodity_id,
      name: item.commodity_name,
      variety: item.variety || "Regular",
      uom: item.uom || "kg",
      price: item.prevail_price
    });
  }
  return { map, unrenderable, count: map.size };
}

/**
 * Build the prefill snapshot for one date.
 *
 * The selected date is fetched with bounded concurrency. Two DFTC users can
 * otherwise open ten database-backed requests at once, exhausting the API's
 * small production connection pool before the draft request runs.
 */
export async function buildPrefillSnapshot(date, resolveCommodityId) {
  const snapshot = {
    sameDayByTab: emptyTabsById(),
    carriedByTab: emptyTabsById(),
    sameDayCount: 0,
    carriedCount: 0,
    unrenderableCount: 0,
    previousDate: null
  };
  if (!date || typeof resolveCommodityId !== "function") return snapshot;

  const sameDayResults = [];
  for (let i = 0; i < MARKET_TABS.length; i += PREFILL_CONCURRENCY) {
    const batch = MARKET_TABS.slice(i, i + PREFILL_CONCURRENCY);
    sameDayResults.push(...await Promise.allSettled(batch.map((tab) => fetchDay(tab, date))));
  }
  MARKET_TABS.forEach((tab, i) => {
    const res = sameDayResults[i];
    if (res.status !== "fulfilled") return;
    const { map, unrenderable, count } = collect(res.value, resolveCommodityId);
    snapshot.sameDayByTab[tab.id] = map;
    snapshot.sameDayCount += count;
    snapshot.unrenderableCount += unrenderable;
  });

  return snapshot;
}

// Session memo so re-selecting a date costs nothing. Cleared after a successful
// save, otherwise the next mount is served pre-save values.
const cache = new Map();

export function clearPrefillCache() {
  cache.clear();
}

/** Memoized buildPrefillSnapshot. One in-flight promise per date. */
export function loadPrefillSnapshot(date, resolveCommodityId) {
  if (!date) return Promise.resolve(null);
  const key = `${date}|${resolveCommodityId}`;
  if (cache.has(key)) return cache.get(key);
  const pending = buildPrefillSnapshot(date, resolveCommodityId);
  cache.set(key, pending);
  // A failed load must not become a sticky cached value for the session.
  pending.catch(() => { if (cache.get(key) === pending) cache.delete(key); });
  return pending;
}
