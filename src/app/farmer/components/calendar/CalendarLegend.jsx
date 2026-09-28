/**
 * Calendar legend.
 *
 * Only renders entries for marker types actually present in the displayed month.
 * A legend that always shows four items teaches the farmer to skip it — and the
 * previous version never mentioned the crop icon or the payday dot at all, so
 * two of the four glyphs in a day cell were unexplained.
 */
import { CalendarClock } from "lucide-react";
import { CommodityIllustration } from "../../../global/components/shared/CommodityIllustrations";
import { useLanguage } from "../../../global/contexts/LanguageContext";
import { CELL_ICON_ART, CELL_ICON_STROKE, legendKindsFor } from "./calendarIcons";
import { WeatherGlyph } from "./CalendarGrid";

export default function CalendarLegend({ markers = {} }) {
  const { t } = useLanguage();
  const kinds = legendKindsFor(markers);

  if (kinds.length === 0) return null;

  const label = "text-[12px] text-[var(--hw-neutral-700)] whitespace-nowrap";
  const slot = "w-[18px] h-[18px] flex items-center justify-center flex-shrink-0";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-[var(--hw-neutral-100)]">
      {kinds.map((kind) => {
        if (kind === "crop") {
          return (
            <span key="crop" className="flex items-center gap-1.5">
              <span className={slot} aria-hidden="true">
                <CommodityIllustration
                  commodityId="demo"
                  commodityName="Tomato"
                  baseName="Tomato"
                  className={CELL_ICON_ART}
                />
              </span>
              <span className={label}>
                {t("farmer.calendar.legend.crop", {}, "Your crop")}
              </span>
            </span>
          );
        }
        if (kind === "weather") {
          return (
            <span key="weather" className="flex items-center gap-1.5">
              <span className={slot} aria-hidden="true">
                <WeatherGlyph type="rain" className={`${CELL_ICON_STROKE} text-blue-500`} />
              </span>
              <span className={label}>
                {t("farmer.calendar.legend.weather", {}, "Weather")}
              </span>
            </span>
          );
        }
        if (kind === "event") {
          return (
            <span key="event" className="flex items-center gap-1.5">
              <span className={slot} aria-hidden="true">
                <CalendarClock className={`${CELL_ICON_STROKE} text-emerald-600`} />
              </span>
              <span className={label}>
                {t("farmer.calendar.legend.events", {}, "Events")}
              </span>
            </span>
          );
        }
        return (
          <span key="payday" className="flex items-center gap-1.5">
            <span className={slot} aria-hidden="true">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            </span>
            <span className={label}>
              {t("farmer.calendar.legend.payday", {}, "Payday")}
            </span>
          </span>
        );
      })}
    </div>
  );
}
