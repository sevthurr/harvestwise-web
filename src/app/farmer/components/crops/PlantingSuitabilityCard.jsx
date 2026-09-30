/**
 * PlantingSuitabilityCard — "crops good to plant" on the farmer dashboard.
 *
 * Backed by GET /farmer/planting-suitability, which evaluates the district
 * forecast against the crop's own weather rules.
 *
 * The `unknown` verdict is the important case: a crop with no rules has no
 * planting data. It is rendered neutrally — never with a warning colour, never
 * as "avoid" — and it is excluded from the ranking, so a gap in the research
 * data can never push a genuinely good crop off the list.
 */
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
} from "lucide-react";
import { CommodityIllustration } from "../../../global/components/shared/CommodityIllustrations";
import { useLanguage } from "../../../global/contexts/LanguageContext";
import { Skeleton } from "../shared/FarmerSkeletons";
import {
  formatCropLabel,
  formatMonthShort,
  parseLocalDate,
} from "../../utils/formatters";
import { localizedRefText } from "../../utils/plantingLabels";

// Verdict -> presentation. `unknown` is deliberately neutral: it is an absence
// of data, not a risk signal, and must not read as one.
const VERDICT_CFG = {
  suitable: {
    Icon: CheckCircle2,
    color: "text-[var(--hw-green-700)]",
    accent: "bg-[var(--hw-green-500)]",
    labelKey: "farmer.advisory.labels.recommended",
    fallback: "Recommended",
  },
  caution: {
    Icon: AlertTriangle,
    color: "text-amber-600",
    accent: "bg-amber-400",
    labelKey: "farmer.advisory.labels.proceed_with_caution",
    fallback: "Proceed with Caution",
  },
  severe: {
    Icon: AlertOctagon,
    color: "text-red-500",
    accent: "bg-red-400",
    labelKey: "farmer.advisory.labels.avoid_for_now",
    fallback: "Hold off for now",
  },
  unknown: {
    Icon: HelpCircle,
    color: "text-[var(--hw-neutral-500)]",
    accent: "bg-[var(--hw-neutral-300)]",
    labelKey: "farmer.plantingSuitability.no_data",
    fallback: "No planting data",
  },
};

const RANKED = ["suitable", "caution", "severe"];

function cropLabel(crop) {
  return formatCropLabel(crop.name, crop.variety, crop.commodityId);
}

function windowText(crop, t) {
  const w = crop.window || {};
  if (w.status === "unknown") return null;
  if (w.status === "open" && w.windowEnd) {
    return t(
      "farmer.plantingSuitability.sow_by",
      { date: formatMonthShort(w.windowEnd) },
      `Sow by ${formatMonthShort(w.windowEnd)}`,
    );
  }
  if (w.status === "upcoming" && w.windowStart) {
    return t(
      "farmer.plantingSuitability.window_opens",
      { date: formatMonthShort(w.windowStart) },
      `Window opens ${formatMonthShort(w.windowStart)}`,
    );
  }
  return null;
}

/**
 * Map one crop from the API's snake_case onto the camelCase this card reads.
 *
 * The API speaks snake_case and `parseResponse` does not convert, so reading
 * `crop.commodityId` against a real response yields undefined. That silently
 * disabled the preferred-crop match, the React key, the "N of M forecast days"
 * line and the exclusion reason. Normalising once at the fetch boundary keeps
 * the rest of the card readable.
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

function CropRow({ crop, t, langCode, onNavigate }) {
  const cfg = VERDICT_CFG[crop.verdict] || VERDICT_CFG.unknown;
  const { Icon } = cfg;
  const timing = windowText(crop, t);

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/* Verdict accent: the rows share one card, so the colour that used to
          live on the row border now sits as a rail on the left. */}
      <span className={`w-1 self-stretch rounded-full flex-shrink-0 ${cfg.accent}`} />
      <CommodityIllustration
        commodityId={crop.commodityId}
        commodityName={crop.name}
        baseName={crop.name}
        className="w-9 h-9 flex-shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className={`flex items-center gap-1.5 mb-0.5 ${cfg.color}`}>
          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-[12px] font-semibold">
            {t(cfg.labelKey, {}, cfg.fallback)}
          </span>
        </div>
        <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
          {cropLabel(crop)}
        </p>

        {crop.verdict === "unknown" ? (
          <p className="text-[12px] font-medium text-[var(--hw-neutral-500)]">
            {localizedRefText(crop.excludedRef, t, langCode) ||
              t(
                "farmer.plantingSuitability.no_data_desc",
                {},
                "We don't have planting data for this crop yet.",
              )}
          </p>
        ) : (
          <>
            {timing && (
              <p className={`text-[12px] font-medium ${cfg.color}`}>{timing}</p>
            )}
            {typeof crop.suitableDays === "number" &&
              crop.assessedDays > 0 &&
              crop.suitableDays < crop.assessedDays && (
                <p className="text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
                  {t(
                    "farmer.plantingSuitability.suitable_days",
                    { good: crop.suitableDays, total: crop.assessedDays },
                    `${crop.suitableDays} of ${crop.assessedDays} forecast days look suitable`,
                  )}
                </p>
              )}
          </>
        )}
      </div>
      <button
        onClick={onNavigate}
        className="flex-shrink-0 text-[12px] font-medium text-[var(--hw-green-700)] hover:opacity-70 whitespace-nowrap pt-0.5"
      >
        {t("farmer.dashboard.view_guide", {}, "View guide")}
      </button>
    </div>
  );
}

export default function PlantingSuitabilityCard({ preferredCropIds = [] }) {
  const { t, langCode } = useLanguage();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["planting-suitability", "now"],
    queryFn: async () => {
      const { apiGet, parseResponse } = await import("../../../global/api");
      const res = await apiGet("/farmer/planting-suitability");
      if (!res.ok) return null;
      const raw = await parseResponse(res);
      return { ...raw, crops: (raw?.crops ?? []).map(normalizeCrop) };
    },
    staleTime: 1000 * 60 * 30,
  });

  if (isLoading) {
    return (
      <div className="h-full bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="px-4 py-2.5">
          <Skeleton className="h-3 w-28 rounded" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="px-4 py-3 flex items-start gap-3 border-t border-[var(--hw-neutral-100)]">
            <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-36 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // A failed request must not masquerade as "nothing to plant".
  if (!data || !Array.isArray(data.crops)) return null;

  const preferred = new Set(preferredCropIds);
  const crops = data.crops;

  // Data-quality notes arrive as { code, params } so the API never has to guess
  // the client's language. Anything without a translation drops out here rather
  // than rendering a raw i18n key.
  const noteItems = (Array.isArray(data.notes) ? data.notes : [])
    .map((note) => ({ code: note?.code, text: localizedRefText(note, t, langCode) }))
    .filter((note) => note.text);

  const preferredCrops = crops.filter((c) => preferred.has(c.commodityId));
  // Ranked crops the farmer does not already grow. `unknown` crops are
  // excluded here, matching the server-side ranking.
  const otherCrops = crops
    .filter((c) => !preferred.has(c.commodityId) && RANKED.includes(c.verdict))
    .slice(0, 2);

  if (preferredCrops.length === 0 && otherCrops.length === 0) {
    return (
      <div className="h-full bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-3">
        <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
          {t(
            "farmer.plantingSuitability.no_recommendations",
            {},
            "No planting recommendations available right now.",
          )}
        </p>
        {noteItems.length > 0 && (
          <ul className="text-[13px] text-[var(--hw-neutral-900)] space-y-1">
            {noteItems.map((note) => (
              <li key={note.code}>{note.text}</li>
            ))}
          </ul>
        )}
        <button
          onClick={() => navigate("/farmer/market")}
          className="inline-flex items-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors"
        >
          {t("farmer.plantingGuide.view_guide_btn", {}, "Open Planting Guide")}
        </button>
      </div>
    );
  }

  const goToGuide = () => navigate("/farmer/market");

  // One card, groups separated by rules — the same shell as the price list
  // beside it, so the two columns read as a pair.
  const groupClass =
    "px-4 pt-3 pb-1.5 text-[12px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wide";

  return (
    <div className="h-full bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      {preferredCrops.length > 0 && (
        <>
          <p className={groupClass}>
            {t(
              "farmer.dashboard.my_preferred_crops_title",
              {},
              "My preferred crops",
            )}
          </p>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {preferredCrops.map((crop) => (
              <CropRow
                key={crop.commodityId}
                crop={crop}
                t={t}
                langCode={langCode}
                onNavigate={goToGuide}
              />
            ))}
          </div>
        </>
      )}

      {otherCrops.length > 0 && (
        <div className={preferredCrops.length > 0 ? "border-t border-[var(--hw-neutral-100)]" : ""}>
          {/* The page heading above already says this, so the group label only
              earns its space when it separates the two groups. */}
          {preferredCrops.length > 0 && (
            <p className={groupClass}>
              {t(
                "farmer.dashboard.good_crops_title",
                {},
                "Good crops to plant",
              )}
            </p>
          )}
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {otherCrops.map((crop) => (
              <CropRow
                key={crop.commodityId}
                crop={crop}
                t={t}
                langCode={langCode}
                onNavigate={goToGuide}
              />
            ))}
          </div>
        </div>
      )}

      {noteItems.length > 0 && (
        <details className="border-t border-[var(--hw-neutral-100)] text-[12px] text-[var(--hw-neutral-500)] px-4 py-2.5">
          <summary className="cursor-pointer">
            {t(
              "farmer.plantingSuitability.notes_toggle",
              { count: noteItems.length },
              `Data notes (${noteItems.length})`,
            )}
          </summary>
          <ul className="mt-1 space-y-0.5 list-disc pl-4">
            {noteItems.map((note) => (
              <li key={note.code}>{note.text}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
