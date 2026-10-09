/**
 * Amend-prefill loader for the Add Price Data screen.
 *
 * The old implementation read GET /dftc/reports/preview, which is a *report*
 * endpoint: the repository resolves it with price_date <= day, so it always
 * answered with the most recent prices on or before the selected date. Opening a
 * date with nothing recorded on it therefore filled the form with an older day's
 * numbers, which the user then saved as today's price.
 *
 * This module queries GET /dftc/prices/by-day, which matches one exact date,
 * and keeps provenance explicit:
 *   - same-day records  → amending; loaded and saved like anything else
 *   - previous-day ones  → a starting point only; the page commits them solely
 *                         when the user edits them.
 *
 * Per-tab rule: a market tab that has ANY same-day record never receives a
 * previous-day carry, so a tab never mixes provenance. The rule and the request
 * count are the same code — flip CARRIES_ONLY_INTO_EMPTY_TABS to change both.
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

const CARRIES_ONLY_INTO_EMPTY_TABS = true;

const emptyTabsById = () => Object.fromEntries(MARKET_TABS.map((t) => [t.id, new Map()]));

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
 * Resolve a DB commodity_id to the form's variant id, or null when this page
 * cannot render it. Takes the page's own resolver so the slug logic and the
 * runtime catalog map stay in one place.
 */
export function resolveVid(commodityId, resolveCommodityId) {
  if (!commodityId || typeof resolveCommodityId !== "function") return null;
  for (const cat of PRICE_CATEGORIES) {
    for (const com of cat.commodities) {
      for (const v of com.variants) {
        if (resolveCommodityId(com, v) === commodityId) return v.id;
      }
    }
  }
  return null;
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
      variety: item.variety || "Base",
      uom: item.uom || "kg",
      price: item.prevail_price
    });
  }
  return { map, unrenderable, count: map.size };
}

/**
 * Build the prefill snapshot for one date.
 *
 * Phase 1 fetches the selected date for all 5 tabs in parallel. Phase 2 fetches
 * the previous calendar day only for tabs whose phase-1 result came back empty,
 * so an amend day costs 5 requests, not 10. Promise.allSettled throughout: a
 * market whose source ref cannot be resolved (404) must not zero out the other
 * four.
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

  const sameDayResults = await Promise.allSettled(MARKET_TABS.map((tab) => fetchDay(tab, date)));
  MARKET_TABS.forEach((tab, i) => {
    const res = sameDayResults[i];
    if (res.status !== "fulfilled") return;
    const { map, unrenderable, count } = collect(res.value, resolveCommodityId);
    snapshot.sameDayByTab[tab.id] = map;
    snapshot.sameDayCount += count;
    snapshot.unrenderableCount += unrenderable;
  });

  const prevDate = CARRIES_ONLY_INTO_EMPTY_TABS ? previousIsoDate(date) : null;
  const emptyTabs = prevDate ? MARKET_TABS.filter((t) => snapshot.sameDayByTab[t.id].size === 0) : [];

  if (emptyTabs.length > 0) {
    const carryResults = await Promise.allSettled(emptyTabs.map((tab) => fetchDay(tab, prevDate)));
    emptyTabs.forEach((tab, i) => {
      const res = carryResults[i];
      if (res.status !== "fulfilled") return;
      const { map, unrenderable, count } = collect(res.value, resolveCommodityId);
      snapshot.carriedByTab[tab.id] = map;
      snapshot.carriedCount += count;
      snapshot.unrenderableCount += unrenderable;
    });
  }

  snapshot.previousDate = prevDate;
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