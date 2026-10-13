/**
 * PlantingSuitabilityCard — "Maayong gulay nga itanom" on the farmer dashboard.
 *
 * Aligned with the Market Calendar: displays only crops with a "Recommended"
 * final advisory category. Clicking any recommended plant proceeds to the
 * detailed factors view (/farmer/market/factors).
 */
import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { CommodityIllustration } from "../../../global/components/shared/CommodityIllustrations";
import { useLanguage } from "../../../global/contexts/LanguageContext";
import { SkeletonListRow } from "../shared/FarmerSkeletons";
import { apiGet, parseResponse } from "../../../global/api";

const DEFAULT_RECOMMENDED_PROFILES = {
  "COM-0004": {
    bestVariety: "Diamante Big",
    plantWindow: (m) => `${m} 1–20`,
  },
  "COM-0001": {
    bestVariety: "Galaxy",
    plantWindow: (m) => `${m} 1–15`,
  },
};

/**
 * Normalizes snake_case crop payloads. Exported for test compatibility.
 */
export function normalizeCrop(raw) {
  if (!raw) return null;
  return {
    ...raw,
    commodityId: raw.commodity_id,
    excludedRef: raw.excluded_ref,
    advisoryText: raw.advisory_text,
    suitableDays: raw.suitable_days,
    assessedDays: raw.assessed_days,
    ruleCount: raw.rule_count,
    missingGroups: raw.missing_groups ?? [],
  };
}

function useOverflowHint(revision) {
  const ref = useRef(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setScrollable(el.scrollHeight - el.clientHeight > 4);
    measure();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [revision]);

  return [ref, scrollable];
}

export default function PlantingSuitabilityCard({ preferredCropIds = [] }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const formattedRefMonth = `${currentYear}-${String(currentMonthNum).padStart(2, "0")}-01`;
  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];
  const rawMonthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentMonthKey = monthNames[now.getMonth()];
  const rawMonthName = rawMonthNames[now.getMonth()];
  const localizedMonth = t(`farmer.calendar.months.${currentMonthKey}`, {}, rawMonthName);

  const { data: recommendationsData, isLoading } = useQuery({
    queryKey: ["monthly-recommendations", formattedRefMonth],
    queryFn: async () => {
      const res = await apiGet(`/market/monthly-recommendations?reference_month=${formattedRefMonth}`);
      if (!res.ok) {
        const fallbackRes = await apiGet("/market/monthly-recommendations");
        if (!fallbackRes.ok) return { items: [] };
        return parseResponse(fallbackRes);
      }
      const data = await parseResponse(res);
      if (!data.items || data.items.length === 0) {
        const fallbackRes = await apiGet("/market/monthly-recommendations");
        if (fallbackRes.ok) return parseResponse(fallbackRes);
      }
      return data;
    },
    staleTime: 1000 * 60 * 30,
  });

  const rawRecommendations = recommendationsData?.items ?? [];

  // Filter ONLY Recommended crops (matching Market Calendar)
  const recommendedCrops = useMemo(() => {
    const list = rawRecommendations.filter(
      (rec) => rec.advisory_category === "Recommended"
    );

    const seen = new Set();
    const result = [];

    for (const rec of list) {
      const cid = rec.commodity_id;
      const cname = rec.commodity_name || rec.commodityId || "Crop";
      if (seen.has(cname)) continue;
      seen.add(cname);

      const profile = DEFAULT_RECOMMENDED_PROFILES[cid] || {};
      const plantWindowStr = rec.planting_window_start && rec.planting_window_end
        ? `${new Date(rec.planting_window_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${new Date(rec.planting_window_end).getDate()}`
        : profile.plantWindow
        ? profile.plantWindow(localizedMonth)
        : `${localizedMonth} 1–20`;

      result.push({
        id: cid,
        name: cname,
        variety: rec.variety || profile.bestVariety || null,
        priceOutlookText: rec.explanation || (cid === "COM-0004" ? t("farmer.calendar.price_outlook_rise", {}, "Price may rise soon") : t("farmer.calendar.price_outlook_profit", {}, "Good estimated profit")),
        plantWindow: plantWindowStr,
      });
    }

    // Fallback if none in database for this month (same as Market Calendar)
    if (result.length === 0) {
      const defaultIds = ["COM-0004", "COM-0001"]; // Kamatis & Ampalaya
      defaultIds.forEach((cid) => {
        const p = DEFAULT_RECOMMENDED_PROFILES[cid];
        const name = cid === "COM-0004" ? "Kamatis" : "Ampalaya";
        result.push({
          id: cid,
          name,
          variety: p?.bestVariety || null,
          priceOutlookText: cid === "COM-0004"
            ? t("farmer.calendar.price_outlook_rise", {}, "Price may rise soon")
            : t("farmer.calendar.price_outlook_profit", {}, "Good estimated profit"),
          plantWindow: p?.plantWindow ? p.plantWindow(localizedMonth) : `${localizedMonth} 1–20`,
        });
      });
    }

    return result;
  }, [rawRecommendations, localizedMonth, t]);

  const [cropsListRef, cropsScrollable] = useOverflowHint(`${recommendedCrops.length}:${isLoading}`);

  const handleViewDetails = (crop) => {
    navigate("/farmer/market/factors", {
      state: {
        commodityId: crop.id,
        commodityName: crop.name,
        title: `${crop.name} — ${t("farmer.advisory.detailed_factors_title", {}, "Detailed Factors")}`,
        subtitle: `${t("farmer.advisory.assessment_result_title", {}, "Assessment result")} · ${t("farmer.advisory.labels.recommended", {}, "Recommended")}`,
        breadcrumbs: [
          { label: t("farmer.dashboard.title", {}, "Dashboard"), path: "/farmer" },
          { label: crop.name },
          { label: t("farmer.advisory.detailed_factors_title", {}, "Detailed Factors") },
        ],
        backPath: "/farmer",
        backLabel: t("farmer.dashboard.title", {}, "Dashboard"),
        advisoryCode: "REC",
        advisoryLabel: t("farmer.advisory.labels.recommended", {}, "Recommended"),
      },
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] flex-1 flex flex-col min-h-0 overflow-hidden">
      {isLoading ? (
        <div className="divide-y divide-[var(--hw-neutral-100)]">
          <SkeletonListRow />
          <SkeletonListRow />
          <SkeletonListRow />
        </div>
      ) : recommendedCrops.length === 0 ? (
        <div className="p-4 text-center text-[13px] text-[var(--hw-neutral-700)]">
          {t("farmer.plantingSuitability.no_recommendations", {}, "No planting recommendations available right now.")}
        </div>
      ) : (
        <>
          <div className="relative flex-1 flex flex-col min-h-0">
            <div
              ref={cropsListRef}
              className="divide-y divide-[var(--hw-neutral-100)] flex-1 min-h-0 max-h-[240px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {recommendedCrops.map((crop) => (
                <button
                  key={crop.id}
                  type="button"
                  onClick={() => handleViewDetails(crop)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 h-[80px] hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
                >
                  <span className="w-1 self-stretch rounded-full flex-shrink-0 bg-[var(--hw-green-500)]" />
                  <CommodityIllustration
                    commodityId={crop.id}
                    commodityName={crop.name}
                    baseName={crop.name}
                    className="w-9 h-9 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 text-[var(--hw-green-700)]">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-[12px] font-semibold">
                        {t("farmer.advisory.labels.recommended", {}, "Recommended")}
                      </span>
                    </div>
                    <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)] truncate">
                      {crop.variety ? `${crop.name} (${crop.variety})` : crop.name}
                    </p>
                    <p className="text-[12px] text-[var(--hw-neutral-600)] truncate">
                      {crop.priceOutlookText || (crop.plantWindow ? `${t("farmer.calendar.plant_prefix", { window: crop.plantWindow }, `Plant: ${crop.plantWindow}`)}` : "")}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-[12px] font-medium text-[var(--hw-green-700)] hover:opacity-70 whitespace-nowrap pt-0.5">
                    {t("farmer.dashboard.view_guide", {}, "View guide")}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {cropsScrollable && (
            <div className="flex-shrink-0 flex items-center justify-center border-t border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)] px-4 py-2 text-[12px] font-medium text-[var(--hw-neutral-700)]">
              {t("farmer.dashboard.scroll_more_prices", {}, "Scroll to see more")}
            </div>
          )}
        </>
      )}
    </div>
  );
}
