/**
 * Detail card for a selected calendar day.
 *
 * Simplified from the previous version, which stacked up to five labelled
 * sections (crop / weather / market / payday, each a bold heading plus a body
 * line) and *always* rendered a "Weather note" block even when no weather data
 * existed. Ten lines of text for one day, half of it filler.
 *
 * Now: a crop line when there is a crop, a single weather line when there is
 * weather, and market context collapsed onto one line. Nothing renders for data
 * that is not there.
 */
import { useNavigate } from "react-router";
import { ArrowRight, Sprout } from "lucide-react";
import { CommodityIllustration } from "../../../global/components/shared/CommodityIllustrations";
import { useLanguage } from "../../../global/contexts/LanguageContext";
import { MONTH_NAMES } from "../../utils/calendarMarkers";
import { formatCropLabel } from "../../utils/formatters";
import { WeatherGlyph } from "./CalendarGrid";

const WEATHER_TONE = {
  heat: "text-orange-500",
  storm: "text-blue-600",
  rain: "text-blue-500",
  sun: "text-amber-500",
};

function weatherLine(info, type, t) {
  const temp =
    info?.tempMax != null && info?.tempMin != null
      ? `${Math.round(info.tempMin)}–${Math.round(info.tempMax)}°`
      : null;
  const rain =
    info?.rainProb != null && info.rainProb > 0
      ? t("farmer.calendar.weather_rain_chance", { pct: Math.round(info.rainProb) }, "{pct}% rain")
      : null;

  const parts = [temp, rain].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return t(`farmer.calendar.weather_note_${type}`, {}, "");
}

export default function DayDetailCard({ year, month, day, marker }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (!marker) return null;

  const rawMonth = MONTH_NAMES[month - 1];
  const monthLabel =
    t(`farmer.calendar.months.${rawMonth.toLowerCase()}`, {}, rawMonth);

  const hasCrop = !!marker.crop;
  const hasWeather = !!marker.weather;
  const hasMarket = !!(marker.event || marker.payday);

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
      <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">
        {monthLabel} {day}
      </p>

      {hasCrop && (
        <div className="flex items-center gap-2.5">
          <CommodityIllustration
            commodityId={marker.crop.id}
            commodityName={marker.crop.name}
            baseName={marker.crop.name}
            className="w-7 h-7 flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)] truncate">
              {formatCropLabel(marker.crop.name, marker.crop.variety)}
            </p>
            <p className="text-[12px] text-[var(--hw-neutral-600)]">
              {marker.crop.type === "plant"
                ? t("farmer.calendar.selected_date.expected_harvest", {}, "Expected harvest")
                : t("farmer.calendar.selected_date.expected_harvest_date", {}, "Expected harvest date")}
              {marker.crop.type === "plant" && marker.crop.harvestStr
                ? `: ${marker.crop.harvestStr}`
                : ""}
            </p>
          </div>
        </div>
      )}

      {hasWeather && (
        <div className="flex items-center gap-2.5">
          <span className="w-7 flex justify-center flex-shrink-0">
            <WeatherGlyph
              type={marker.weather}
              className={`w-4 h-4 ${WEATHER_TONE[marker.weather] || "text-blue-500"}`}
            />
          </span>
          <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">
            {weatherLine(marker.weatherInfo, marker.weather, t)}
          </p>
        </div>
      )}

      {hasMarket && (
        <div className="flex items-center gap-2.5">
          <span className="w-7 flex justify-center flex-shrink-0 text-amber-500">
            {marker.payday ? (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            ) : (
              <Sprout className="w-4 h-4 text-emerald-600" />
            )}
          </span>
          <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">
            {[
              marker.payday
                ? t("farmer.calendar.selected_date.payday", {}, "Payday period")
                : null,
              marker.event || null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate("/farmer/assess")}
        className="w-full flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors"
      >
        {t("farmer.calendar.selected_date.check_crop", {}, "Check this crop")}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
