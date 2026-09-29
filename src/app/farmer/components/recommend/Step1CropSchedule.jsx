import { useEffect, useState } from "react";
import { Check, Clock, ChevronRight, ChevronLeft } from "lucide-react";
import { formatDurationLabel, getCropDuration, suggestHarvestDate } from "./types";
import { durationForOption, useCommodityCatalog } from "./useCommodityCatalog";
import { CommodityIllustration } from "../../../global/components/shared/CommodityIllustrations";
import { PlantingActivityContext } from "./PlantingActivityContext";
import { getVariants, HW_ID_TO_NAME } from "../../../global/data/commodities";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../global/components/ui/select";
import { useLanguage } from "../../../global/contexts/LanguageContext";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}
const PAGE_SIZE = 4;

const Step1CropSchedule = ({ data, onChange, errors }) => {
  const { t } = useLanguage();

  // Top10 commodities + per-variety duration from the API
  // (persisted to IndexedDB by the offline layer).
  const { options: commodityOptions, isLoading: loadingCommodities } = useCommodityCatalog();

  const COMMODITY_PAGES = commodityOptions.reduce((acc, c, i) => {
    const page = Math.floor(i / PAGE_SIZE);
    if (!acc[page]) acc[page] = [];
    acc[page].push(c);
    return acc;
  }, []);

  const selectedOption = commodityOptions.find((c) => c.id === data.commodity) || null;
  // commodity.typical_duration_min_days / max_days from GET /prices; falls back
  // to the CROP_DURATIONS table when the catalog has no row for this crop
  // (offline bundle or a crop outside the top 10).
  const apiDuration = durationForOption(selectedOption, data.variant);
  const duration = apiDuration || (data.commodity ? getCropDuration(data.commodity, data.variant) : null);
  const durationVarKey = data.variant
    ? `duration_${data.commodity}_${data.variant.toLowerCase().replace(/[^a-z0-9]/g, "_")}`
    : `duration_${data.commodity}`;
  const durationLabel = formatDurationLabel(apiDuration, t)
    || (data.commodity ? t(`farmer.assess.${durationVarKey}`, {}, duration?.label || "") : null);
  const suggestion = suggestHarvestDate(data.plantingDate, apiDuration || data.commodity, data.variant);
  const selectedPage = Math.floor(
    commodityOptions.findIndex((c) => c.id === data.commodity) / PAGE_SIZE
  );
  const [page, setPage] = useState(() => selectedPage >= 0 ? selectedPage : 0);

  // Auto-calculate suggested harvest date when planting date, crop, variety or
  // its duration changes.
  useEffect(() => {
    if (suggestion && suggestion.minDate) {
      onChange({ harvestDate: suggestion.minDate });
    }
  }, [data.plantingDate, data.commodity, data.variant, duration?.min, duration?.max]);

  const applySuggestion = () => {
    if (suggestion) onChange({ harvestDate: suggestion.minDate });
  };
  const suggestionLabel = suggestion ? suggestion.maxDate ? `${formatDate(suggestion.minDate)} – ${formatDate(suggestion.maxDate)}` : formatDate(suggestion.minDate) : null;

  if (loadingCommodities) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-4 w-24 bg-[var(--hw-neutral-200)] rounded animate-pulse mb-3" />
          <div className="flex gap-2.5 overflow-hidden py-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-28 h-32 rounded-2xl bg-white border border-[var(--hw-neutral-200)] p-3 flex flex-col items-center justify-center gap-2 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-[var(--hw-neutral-200)]" />
                <div className="h-3 w-16 rounded bg-[var(--hw-neutral-200)]" />
                <div className="h-2.5 w-12 rounded bg-[var(--hw-neutral-200)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return <div className="space-y-6">
      {
    /* Commodity selector */
  }
      <div>
        <label className="block text-sm font-semibold text-[var(--hw-neutral-700)] mb-3">
          {t("farmer.prices.category_vegetables", {}, "Vegetable")}
        </label>
        {
    /* Carousel */
  }
        <div>
          {commodityOptions.length === 0 ? (
            <p className="text-sm text-[var(--hw-neutral-500)] italic py-4">
              {t("farmer.assess.no_vegetables_available", {}, "No top 10 vegetables available in database.")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {COMMODITY_PAGES[page]?.map((c) => {
                const selected = data.commodity === c.id;
                return <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    const defId = c.varietyMap?.['medium'] || c.defaultCommodityId || c.id;
                    onChange({ commodity: c.id, variant: "", commodityId: defId });
                  }}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all
                    ${selected ? "border-[var(--hw-green-700)] bg-[var(--hw-green-50)]" : "border-[var(--hw-neutral-200)] bg-white hover:border-[var(--hw-green-400)] hover:bg-[var(--hw-neutral-50)]"}
                  `}
                >
                  <div className="relative">
                    <CommodityIllustration commodityId={c.id} commodityName={c.name} className="w-14 h-14" />
                    {selected && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--hw-green-700)] flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </span>}
                  </div>
                  <span className={`text-sm font-medium text-center leading-tight ${selected ? "text-[var(--hw-green-800)]" : "text-[var(--hw-neutral-700)]"}`}>
                    {c.name}
                  </span>
                </button>;
              })}
            </div>
          )}

          {/* Page navigation */}
          {COMMODITY_PAGES.length > 1 && (
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg text-[var(--hw-neutral-500)] hover:text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-100)] disabled:opacity-30 disabled:cursor-default transition-colors"
                aria-label="Previous vegetables"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1.5">
                {COMMODITY_PAGES.map((_, i) => <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  className={`rounded-full transition-all ${i === page ? "w-4 h-2 bg-[var(--hw-green-700)]" : "w-2 h-2 bg-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-400)]"}`}
                  aria-label={`Page ${i + 1}`}
                />)}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(COMMODITY_PAGES.length - 1, p + 1))}
                disabled={page === COMMODITY_PAGES.length - 1}
                className="p-1.5 rounded-lg text-[var(--hw-neutral-500)] hover:text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-100)] disabled:opacity-30 disabled:cursor-default transition-colors"
                aria-label="Next vegetables"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          <p className="text-[12px] text-[var(--hw-neutral-700)] text-center mt-1">
            {COMMODITY_PAGES.length > 0 ? page + 1 : 0} of {COMMODITY_PAGES.length} · {commodityOptions.length} vegetables
          </p>
        </div>

        {errors.commodity && <p className="mt-2 text-sm text-red-600">{errors.commodity}</p>}

        {/* Typical duration chip — stays visible; "-" when no duration is known
            for the selected crop/variety. */}
        {data.commodity && <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--hw-neutral-100)] rounded-full">
            <Clock className="w-3.5 h-3.5 text-[var(--hw-neutral-700)]" />
            <span className="text-[13px] text-[var(--hw-neutral-900)]">
              {t("farmer.assess.typical_duration", { label: durationLabel || "-" }, `Typical duration: ${durationLabel || "-"}`)}
            </span>
          </div>}

        {/* Variant picker — dropdown, shown only when commodity has 2+ varieties */}
        {data.commodity && (() => {
          const baseName = selectedOption?.name || HW_ID_TO_NAME[data.commodity] || "";
          const dbVariants = selectedOption?.varieties || [];
          const localVariants = getVariants(baseName);
          const allVariants = Array.from(new Set([...dbVariants, ...localVariants]));

          if (allVariants.length <= 1) return null;
          return (
            <div className="mt-4">
              <label className="block text-sm font-semibold text-[var(--hw-neutral-700)] mb-1.5">
                {t("farmer.commodityDetail.variety", {}, "Variety")}
              </label>
              <Select value={data.variant || undefined} onValueChange={(v) => {
                const varId = selectedOption?.varietyMap?.[v.toLowerCase()] || selectedOption?.defaultCommodityId || data.commodityId;
                onChange({ variant: v, commodityId: varId });
              }}>
                <SelectTrigger className="w-full h-10 text-[14px] font-medium text-[var(--hw-neutral-900)] bg-white border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] hover:border-[var(--hw-neutral-400)] transition-colors">
                  <SelectValue placeholder={t("farmer.commodityDetail.select_variety", {}, "Select a variety")} />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className="rounded-xl border border-[var(--hw-neutral-200)] shadow-lg">
                  {allVariants.map((v) => (
                    <SelectItem key={v} value={v} className="text-[14px] font-medium rounded-lg cursor-pointer">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })()}
      </div>

      {/* Planting date */}
      <div>
        <label
          htmlFor="planting-date"
          className="block text-sm font-semibold text-[var(--hw-neutral-700)] mb-1.5"
        >
          {t("farmer.assess.target_planting_date", {}, "Target planting date")}
        </label>
        <input
          id="planting-date"
          type="date"
          value={data.plantingDate}
          onChange={(e) => onChange({ plantingDate: e.target.value })}
          className={`
            w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition
            focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)]
            ${errors.plantingDate ? "border-red-400 bg-red-50" : "border-[var(--hw-neutral-200)] bg-white"}
          `}
        />
        {errors.plantingDate && <p className="mt-1.5 text-sm text-red-600">{errors.plantingDate}</p>}
      </div>

      {/* Harvest date with suggestion */}
      <div>
        <label
          htmlFor="harvest-date"
          className="block text-sm font-semibold text-[var(--hw-neutral-700)] mb-1.5"
        >
          {t("farmer.assess.expected_harvest_date", {}, "Expected harvest date")}
        </label>
        <input
          id="harvest-date"
          type="date"
          value={data.harvestDate}
          onChange={(e) => onChange({ harvestDate: e.target.value })}
          className={`
            w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition
            focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)]
            ${errors.harvestDate ? "border-red-400 bg-red-50" : "border-[var(--hw-neutral-200)] bg-white"}
          `}
        />
        {errors.harvestDate && <p className="mt-1.5 text-sm text-red-600">{errors.harvestDate}</p>}

        {/* Harvest suggestion */}
        {suggestionLabel && data.plantingDate && <div className="mt-2 space-y-1.5">
            <p className="text-[13px] text-[var(--hw-neutral-900)]">
              {t("farmer.assess.suggested_window_note", {}, "Suggested harvest window based on typical duration:")}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-medium text-[var(--hw-green-800)] bg-[var(--hw-green-50)] px-2.5 py-1 rounded-lg border border-[var(--hw-green-200)]">
                {suggestionLabel}
              </span>
              {data.harvestDate !== suggestion?.minDate && <button
                type="button"
                onClick={applySuggestion}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
              >
                {t("farmer.assess.use_this_date", {}, "Use this date")}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>}
            </div>
          </div>}
      </div>
      {
    /* Planting Activity Context — shown once commodity is selected */
  }
      {data.commodity && <PlantingActivityContext
    commodityId={data.commodity}
    commodityName={selectedOption?.name ?? data.commodity}
    defaultExpanded={false}
  />}
    </div>;
};
export {
  Step1CropSchedule
};
