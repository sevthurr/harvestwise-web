/**
 * Month grid for the crop calendar.
 *
 * Cell layout is deliberately rigid: the day number sits on a fixed-height
 * line, then a fixed-height icon row. Every icon occupies the same
 * CELL_ICON_SLOT width, so the row stays optically centred no matter how many
 * markers a day carries. See calendarIcons.js for why filled artwork and stroked
 * glyphs need different sizes inside that slot.
 */
import { CloudRain, Sun, CalendarClock } from "lucide-react";
import { CommodityIllustration } from "../../../global/components/shared/CommodityIllustrations";
import { useLanguage } from "../../../global/contexts/LanguageContext";
import {
  DAY_LABELS,
  MONTH_NAMES,
  daysInMonth,
  firstWeekday,
  hasAnyMarker,
  monthKey,
} from "../../utils/calendarMarkers";
import {
  CELL_ICON_ART,
  CELL_ICON_SLOT,
  CELL_ICON_STROKE,
  selectCellMarkers,
} from "./calendarIcons";
import { formatCropLabel } from "../../utils/formatters";

const TwoToneStormIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path stroke="#3b82f6" d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973" />
    <path stroke="#f59e0b" d="m13 12-3 5h4l-3 5" />
  </svg>
);

export function WeatherGlyph({ type, className = "" }) {
  if (type === "rain") return <CloudRain className={className} />;
  if (type === "storm") return <TwoToneStormIcon className={className} />;
  return <Sun className={className} />;
}

const WEATHER_TONE = {
  heat: "text-orange-500",
  storm: "text-blue-600",
  rain: "text-blue-500",
  sun: "text-amber-500",
};

function MarkerIcon({ icon, selected }) {
  const slot = `${CELL_ICON_SLOT}`;
  const stroke = `${CELL_ICON_STROKE}`;

  if (icon.kind === "crop") {
    return (
      <span className={slot} aria-hidden="true">
        <CommodityIllustration
          commodityId={icon.id}
          commodityName={icon.name}
          baseName={icon.name}
          className={`${CELL_ICON_ART} ${selected ? "opacity-90" : ""}`}
        />
      </span>
    );
  }

  if (icon.kind === "weather") {
    return (
      <span className={slot} aria-hidden="true">
        <WeatherGlyph
          type={icon.type}
          className={`${stroke} ${selected ? "text-white/85" : WEATHER_TONE[icon.type] || "text-blue-500"}`}
        />
      </span>
    );
  }

  if (icon.kind === "event") {
    return (
      <span className={slot} aria-hidden="true">
        <CalendarClock
          className={`${stroke} ${selected ? "text-white/85" : "text-emerald-600"}`}
        />
      </span>
    );
  }

  // Payday: a dot, but still on the shared slot so the row stays aligned.
  return (
    <span className={slot} aria-hidden="true">
      <span
        className={`w-1.5 h-1.5 rounded-full ${selected ? "bg-white/85" : "bg-amber-500"}`}
      />
    </span>
  );
}

function DayCell({ day, marker, isToday, isSelected, onSelect, t }) {
  const marked = hasAnyMarker(marker);
  const { icons, overflow } = selectCellMarkers(marker);

  const base =
    "flex flex-col items-center justify-start min-h-[54px] pt-1.5 pb-1 rounded-xl text-[13px] font-medium transition-colors";
  const tone = isSelected
    ? "bg-[var(--hw-green-700)] text-white"
    : isToday
      ? "ring-2 ring-[var(--hw-green-700)] text-[var(--hw-neutral-900)]"
      : marked
        ? "text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-100)]"
        : "text-[var(--hw-neutral-400)] hover:bg-[var(--hw-neutral-50)]";

  // The accessible name carries the variety too; "Carrots" alone cannot be
  // told apart from Carrots (Big) when reading a list of days aloud.
  const describe = icons
    .map((i) => {
      if (i.kind === "crop") return formatCropLabel(i.name, i.variant);
      if (i.kind === "weather") return i.type;
      if (i.kind === "event") return i.label;
      return "payday";
    })
    .join(", ");

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      aria-pressed={isSelected}
      aria-label={
        marked
          ? `${t("farmer.calendar.day_summary", { day, summary: describe }, `${day}: ${describe}`)}`
          : String(day)
      }
      className={`${base} ${tone}`}
    >
      <span className="leading-none">{day}</span>
      {marked && (
        <span className="flex items-center justify-center gap-0.5 mt-1">
          {icons.map((icon, i) => (
            <MarkerIcon key={`${icon.kind}-${i}`} icon={icon} selected={isSelected} />
          ))}
          {overflow > 0 && (
            <span
              className={`text-[10px] font-semibold leading-none pl-0.5 ${
                isSelected ? "text-white/85" : "text-[var(--hw-neutral-500)]"
              }`}
            >
              +{overflow}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

export default function CalendarGrid({
  year,
  month,
  selectedDay,
  onSelectDay,
  markers = {},
}) {
  const { t } = useLanguage();
  const today = new Date();
  const isNow = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay = isNow ? today.getDate() : -1;

  const total = daysInMonth(year, month);
  const startCol = firstWeekday(year, month);
  const cells = [
    ...Array(startCol).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d) => (
          <div
            key={d.key}
            className="text-center text-[12px] font-semibold text-[var(--hw-neutral-700)] py-1"
          >
            {t(d.key, {}, d.fallback)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) =>
          day === null ? (
            <div key={`e${i}`} />
          ) : (
            <DayCell
              key={day}
              day={day}
              marker={markers[day] ?? null}
              isToday={day === todayDay}
              isSelected={day === selectedDay}
              onSelect={onSelectDay}
              t={t}
            />
          ),
        )}
      </div>
    </>
  );
}

export { TwoToneStormIcon, MONTH_NAMES, monthKey };
