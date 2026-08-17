import { useEffect, useState } from "react";
import { Check, Clock, ChevronRight, ChevronLeft } from "lucide-react";
import { COMMODITY_OPTIONS, CROP_DURATIONS, suggestHarvestDate } from "./types";
import { CommodityIllustration } from "../market/CommodityIllustrations";
import { PlantingActivityContext } from "./PlantingActivityContext";
import { getVariants, HW_ID_TO_NAME } from "../../../global/data/commodities";
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}
const PAGE_SIZE = 4;
const COMMODITY_PAGES = COMMODITY_OPTIONS.reduce((acc, c, i) => {
  const page = Math.floor(i / PAGE_SIZE);
  if (!acc[page]) acc[page] = [];
  acc[page].push(c);
  return acc;
}, []);
const Step1CropSchedule = ({ data, onChange, errors }) => {
  const duration = data.commodity ? CROP_DURATIONS[data.commodity] : null;
  const suggestion = suggestHarvestDate(data.plantingDate, data.commodity);
  const selectedPage = Math.floor(
    COMMODITY_OPTIONS.findIndex((c) => c.id === data.commodity) / PAGE_SIZE
  );
  const [page, setPage] = useState(() => selectedPage >= 0 ? selectedPage : 0);
  useEffect(() => {
    if (suggestion && !data.harvestDate) {
      onChange({ harvestDate: suggestion.minDate });
    }
  }, [data.plantingDate, data.commodity]);
  const applySuggestion = () => {
    if (suggestion) onChange({ harvestDate: suggestion.minDate });
  };
  const suggestionLabel = suggestion ? suggestion.maxDate ? `${formatDate(suggestion.minDate)} \u2013 ${formatDate(suggestion.maxDate)}` : formatDate(suggestion.minDate) : null;
  return <div className="space-y-6">
      {
    /* Commodity selector */
  }
      <div>
        <label className="block text-sm font-semibold text-[var(--hw-neutral-700)] mb-3">
          Vegetable
        </label>
        {
    /* Carousel */
  }
        <div>
          <div className="grid grid-cols-2 gap-3">
            {COMMODITY_PAGES[page]?.map((c) => {
    const selected = data.commodity === c.id;
    return <button
      key={c.id}
      type="button"
      onClick={() => onChange({ commodity: c.id, variant: "" })}
      className={`
                    flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all
                    ${selected ? "border-[var(--hw-green-700)] bg-[var(--hw-green-50)]" : "border-[var(--hw-neutral-200)] bg-white hover:border-[var(--hw-green-400)] hover:bg-[var(--hw-neutral-50)]"}
                  `}
    >
                  <div className="relative">
                    <CommodityIllustration commodityId={c.id} className="w-14 h-14" />
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

          {
    /* Page navigation */
  }
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

            {
    /* Dot indicators */
  }
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

          <p className="text-[12px] text-[var(--hw-neutral-700)] text-center mt-1">
            {page + 1} of {COMMODITY_PAGES.length} · {COMMODITY_OPTIONS.length} vegetables
          </p>
        </div>

        {errors.commodity && <p className="mt-2 text-sm text-red-600">{errors.commodity}</p>}

        {
    /* Typical duration chip */
  }
        {duration && <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--hw-neutral-100)] rounded-full">
            <Clock className="w-3.5 h-3.5 text-[var(--hw-neutral-700)]" />
            <span className="text-[13px] text-[var(--hw-neutral-900)]">
              Typical duration: <strong>{duration.label}</strong>
            </span>
          </div>}

        {
    /* Variant picker — dropdown, shown only when commodity has known varieties */
  }
        {data.commodity && (() => {
    const displayName = HW_ID_TO_NAME[data.commodity] ?? COMMODITY_OPTIONS.find((c) => c.id === data.commodity)?.name ?? "";
    const variants = getVariants(displayName);
    if (variants.length === 0) return null;
    return <div className="mt-4">
              <label htmlFor="variety-select" className="block text-sm font-semibold text-[var(--hw-neutral-700)] mb-1.5">
                Variety
              </label>
              <div className="relative">
                <select
      id="variety-select"
      value={data.variant}
      onChange={(e) => onChange({ variant: e.target.value })}
      className="w-full h-10 pl-3 pr-8 text-[14px] font-medium text-[var(--hw-neutral-900)] bg-white border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] appearance-none cursor-pointer hover:border-[var(--hw-neutral-400)] transition-colors"
    >
                  <option value="">Default</option>
                  {variants.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hw-neutral-500)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
              <p className="mt-1.5 text-[12px] text-[var(--hw-neutral-500)]">
                Default uses commodity-level pricing.
              </p>
            </div>;
  })()}
      </div>

      {
    /* Planting date */
  }
      <div>
        <label
    htmlFor="planting-date"
    className="block text-sm font-semibold text-[var(--hw-neutral-700)] mb-1.5"
  >
          Target planting date
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

      {
    /* Harvest date with suggestion */
  }
      <div>
        <label
    htmlFor="harvest-date"
    className="block text-sm font-semibold text-[var(--hw-neutral-700)] mb-1.5"
  >
          Expected harvest date
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

        {
    /* Harvest suggestion */
  }
        {suggestionLabel && data.plantingDate && <div className="mt-2 space-y-1.5">
            <p className="text-[13px] text-[var(--hw-neutral-900)]">
              Suggested harvest window based on typical duration:
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
                  Use this date
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>}
            </div>
            <p className="text-[12px] text-[var(--hw-neutral-700)] italic">
              Prototype reference only. Actual harvest timing may vary.
            </p>
          </div>}
      </div>
      {
    /* Planting Activity Context — shown once commodity is selected */
  }
      {data.commodity && <PlantingActivityContext
    commodityId={data.commodity}
    commodityName={COMMODITY_OPTIONS.find((c) => c.id === data.commodity)?.name ?? data.commodity}
    defaultExpanded={false}
  />}
    </div>;
};
export {
  Step1CropSchedule
};
