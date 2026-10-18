/**
 * Calendar cell icon selection.
 *
 * Two jobs, both pure so they can be unit-tested without rendering:
 *
 * 1. **Optical alignment.** The commodity artwork is a *filled* 56x56 SVG that
 *    fills its box, while the weather/event icons are Lucide *stroke* icons
 *    whose glyphs sit inset inside a 24x24 viewBox. Rendered at the same
 *    nominal size the filled art looks noticeably heavier and larger, so the
 *    row reads as misaligned even though every icon is technically centred.
 *    The fix is a fixed slot for layout plus a size ratio (1.2x) that
 *    compensates for the stroke/fill difference.
 *
 * 2. **Signal over noise.** A day can carry crop, weather, an event and a payday
 *    at once. Four glyphs in a 40px cell is unreadable, so the list is capped
 *    and the remainder collapses into a counter the farmer can tap into.
 */

import { formatCropLabel } from "../../utils/formatters";

/** Fixed layout slot. Every icon occupies exactly this, which anchors the row. */
export const CELL_ICON_SLOT = "w-[18px] h-[18px] flex items-center justify-center flex-shrink-0";

/** Filled artwork — the full slot, compensating for its greater visual weight. */
export const CELL_ICON_ART = "w-[18px] h-[18px]";

/** Stroked Lucide glyphs — inset, because the stroke box carries its own padding. */
export const CELL_ICON_STROKE = "w-[15px] h-[15px]";

/** Beyond this the cell stops being scannable. */
export const MAX_CELL_ICONS = 3;

/**
 * Weather severity, most to least urgent. A storm outranks a hot day, which
 * outranks rain, so the single weather slot always shows the worst condition.
 */
const WEATHER_PRIORITY = { storm: 0, heat: 1, rain: 2, sun: 3 };

/**
 * Choose which markers a day cell shows, in priority order, capped at
 * MAX_CELL_ICONS.
 *
 * Priority: the farmer's own crop, then the weather that affects it, then market
 * context. A payday dot ranks last because it is the least actionable of the
 * four and is the first thing worth hiding.
 *
 * @param {object | null} marker  one day from buildCalendarMarkers()
 * @returns {{ icons: Array<object>, overflow: number }}
 */
export function selectCellMarkers(marker) {
  const candidates = [];
  if (!marker) return { icons: [], overflow: 0 };

  if (marker.crop) {
    candidates.push({
      kind: "crop",
      id: marker.crop.id,
      name: marker.crop.name,
      variant: marker.crop.variant,
      type: marker.crop.type,
    });
  }

  if (marker.weather) {
    candidates.push({
      kind: "weather",
      type: marker.weather,
      rank: WEATHER_PRIORITY[marker.weather] ?? 9,
    });
  }

  if (marker.event) {
    candidates.push({ kind: "event", label: marker.event });
  }

  if (marker.payday) {
    candidates.push({ kind: "payday" });
  }

  candidates.sort((a, b) => {
    const aRank = a.kind === "weather" ? a.rank : KIND_PRIORITY[a.kind];
    const bRank = b.kind === "weather" ? b.rank : KIND_PRIORITY[b.kind];
    return aRank - bRank;
  });

  return {
    icons: candidates.slice(0, MAX_CELL_ICONS),
    overflow: Math.max(0, candidates.length - MAX_CELL_ICONS),
  };
}

const KIND_PRIORITY = { crop: 0, weather: 1, event: 2, payday: 3 };

/**
 * Which legend entries a month actually needs.
 *
 * Rendering all four every time teaches the farmer to ignore the legend, and
 * the old legend never mentioned the crop icon or the payday dot at all.
 *
 * @param {Record<string, object>} markers  a whole month from buildCalendarMarkers()
 * @returns {string[]}  subset of ['weather', 'event', 'payday', 'crop']
 */
export function legendKindsFor(markers) {
  const present = new Set();
  for (const day of Object.values(markers || {})) {
    if (day?.crop) present.add("crop");
    if (day?.weather) present.add("weather");
    if (day?.event) present.add("event");
    if (day?.payday) present.add("payday");
  }
  // Weather is the only entry with internal variants, so it collapses to one row.
  return ["crop", "weather", "event", "payday"].filter((k) => present.has(k));
}

/**
 * Compact one-line summary of a day, for the detail card heading.
 *
 * @returns {string | null}
 */
export function summariseDay(marker) {
  if (!marker) return null;
  const parts = [];
  if (marker.crop) {
    const name = formatCropLabel(marker.crop.name, marker.crop.variety);
    parts.push(`${name} — ${marker.crop.type}`);
  }
  return parts.length ? parts.join(" · ") : null;
}
