/**
 * Top-10 vegetable catalog shared by the crop assessment steps.
 *
 * Crop duration is read from `commodity.typical_duration_min_days` /
 * `typical_duration_max_days` (served by GET /prices) — never from a
 * hardcoded map, so a research correction is a data change only. Duration is
 * per variety: a variety with no duration in the database resolves to `null`
 * and the UI shows "-".
 */
import { useQuery } from "@tanstack/react-query";
import { toCamelCase } from "../../../global/utils/apiTransforms";
import { fetchPricesList } from "../../../global/hooks/useFarmerPrefetch";
import { getCommodityIconKey } from "../../../global/components/shared/CommodityIllustrations";

const STALE_TIME = 1000 * 60 * 30;

function durationOf(camelItem) {
  const min = camelItem.typicalDurationMinDays;
  const max = camelItem.typicalDurationMaxDays;
  if (typeof min !== "number" || typeof max !== "number") return null;
  return { min, max: Math.max(max, min), basis: camelItem.durationBasis || null };
}

/** Group the flat /prices rows into one entry per base vegetable, keyed by icon key. */
function buildCatalog(rawItems) {
  const baseMap = {};

  rawItems.forEach(item => {
    const camelItem = toCamelCase(item);
    if (!(camelItem.isTop10 === true || item.is_top10 === true)) return;

    const nameStr = camelItem.name || camelItem.commodityName || item.name || '';
    const key = getCommodityIconKey(camelItem.commodityId, camelItem.baseName, nameStr);
    if (!key) return;

    const baseName = camelItem.baseName || nameStr.split('-')[0].trim();
    const variety = camelItem.variety || (nameStr.includes('-') ? nameStr.split('-').slice(1).join('-').trim() : '');
    const rawId = camelItem.commodityId || item.id || camelItem.id;
    const duration = durationOf(camelItem);

    if (!baseMap[key]) {
      baseMap[key] = {
        id: key,
        name: baseName,
        varieties: new Set(),
        varietyMap: {},
        durationByVariety: {},
        defaultCommodityId: rawId,
        defaultDuration: duration,
      };
    }
    if (variety) {
      const varietyKey = variety.toLowerCase();
      baseMap[key].varieties.add(variety);
      baseMap[key].varietyMap[varietyKey] = rawId;
      // A variety present in the DB without a duration must stay null rather
      // than inherit a sibling variety's numbers.
      baseMap[key].durationByVariety[varietyKey] = duration;
      if (varietyKey === 'medium') {
        baseMap[key].defaultCommodityId = rawId;
        baseMap[key].defaultDuration = duration;
      }
    }
  });

  return Object.values(baseMap).map(c => ({
    id: c.id,
    name: c.name,
    varieties: Array.from(c.varieties),
    varietyMap: c.varietyMap,
    durationByVariety: c.durationByVariety,
    defaultCommodityId: c.defaultCommodityId,
    defaultDuration: c.defaultDuration,
  }));
}

/** Duration for the selected variety, or null when the DB has none. */
function durationForOption(option, variant) {
  if (!option) return null;
  const varietyKey = String(variant || '').toLowerCase();
  if (Object.prototype.hasOwnProperty.call(option.durationByVariety, varietyKey)) {
    return option.durationByVariety[varietyKey];
  }
  return option.defaultDuration ?? null;
}

function useCommodityCatalog() {
  const { data: resData, isLoading } = useQuery({
    queryKey: ["prices", "list"],
    queryFn: fetchPricesList,
    staleTime: STALE_TIME,
  });

  const rawItems = resData?.items || (Array.isArray(resData) ? resData : []);
  return { options: buildCatalog(rawItems), isLoading };
}

export {
  buildCatalog,
  durationForOption,
  useCommodityCatalog
};
