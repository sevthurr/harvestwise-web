import { PageHeader } from "../../global/components/shared/PageHeader";
import { useNavigate } from "react-router";
import {
  SlidersHorizontal,
  CloudRain,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
const CONFIG_AREAS = [
  {
    Icon: SlidersHorizontal,
    title: "Factor Rules",
    description: "Manage classifications, thresholds, calculation versions, and validation status for the five recommendation factors.",
    statusItems: [
      { label: "Factor sets", value: "5" },
      { label: "Active version", value: "v1.2.0" },
      { label: "Pending validation", value: "1", color: "text-amber-600" }
    ],
    action: "Open Factor Rules",
    accent: "text-[var(--hw-green-700)]"
  },
  {
    Icon: CloudRain,
    title: "Weather Setup",
    description: "Manage Open-Meteo locations, retrieved variables, forecast coverage, and crop-specific weather thresholds.",
    statusItems: [
      { label: "Historical API", value: "Connected", color: "text-emerald-700" },
      { label: "Forecast API", value: "Failed", color: "text-red-600" },
      { label: "Active locations", value: "1" }
    ],
    action: "Open Weather Setup",
    accent: "text-blue-600"
  },
  {
    Icon: CalendarDays,
    title: "Calendar & Events",
    description: "Manage national holidays, local holidays, local events, and payday rules used as supporting market context.",
    statusItems: [
      { label: "Google Calendar API", value: "Warning", color: "text-amber-600" },
      { label: "Active local events", value: "4" },
      { label: "Next configured event", value: "Kadayawan \xB7 Aug 14" }
    ],
    action: "Open Calendar & Events",
    accent: "text-blue-600"
  },
  {
    Icon: CheckCircle2,
    title: "Recommendation Engine",
    description: "Review the five Decision Tree inputs, advisory outputs, active version, and validation scenarios.",
    statusItems: [
      { label: "Engine status", value: "Active", color: "text-emerald-700" },
      { label: "Active version", value: "v1.1.0" },
      { label: "Advisory outputs", value: "3" }
    ],
    action: "Open Recommendation Engine",
    accent: "text-[var(--hw-green-700)]"
  }
];
function AdminConfiguration() {
  const navigate = useNavigate();
  return <div className="px-4 md:px-8 lg:px-10 py-5 max-w-[1440px] mx-auto space-y-5">

      {
    /* Page header */
  }
      <PageHeader
    title="Configuration"
    description="Manage factor rules, weather setup, calendar events, and the recommendation engine."
    action={<div className="hidden sm:flex items-center gap-1.5 text-[var(--hw-neutral-700)] text-[12px]"><RefreshCw className="w-3.5 h-3.5" /><span>System updated Jun 24, 5:12 AM</span></div>}
  />

      {
    /* Notice */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-5 py-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-[var(--hw-neutral-800)]">Configuration changes require validation before going live.</p>
          <p className="text-[13px] text-[var(--hw-neutral-800)] mt-0.5">
            Factor rule changes and threshold updates must be validated against test scenarios before activating a new version.
          </p>
        </div>
      </div>

      {
    /* 4-column config areas grid */
  }
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {CONFIG_AREAS.map((area) => <div
    key={area.title}
    className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 flex flex-col gap-4"
  >
            {
    /* Icon + title */
  }
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[var(--hw-neutral-50)] rounded-xl flex-shrink-0">
                <area.Icon className={`w-5 h-5 ${area.accent}`} />
              </div>
              <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)] mt-1">{area.title}</h2>
            </div>

            {
    /* Description */
  }
            <p className="text-[13px] text-[var(--hw-neutral-800)] leading-relaxed flex-1">
              {area.description}
            </p>

            {
    /* Status items */
  }
            <div className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2.5 space-y-1.5">
              {area.statusItems.map((s) => <div key={s.label} className="flex items-center justify-between gap-2">
                  <p className="text-[12px] text-[var(--hw-neutral-800)]">{s.label}</p>
                  <p className={`text-[12px] font-semibold ${s.color ?? "text-[var(--hw-neutral-800)]"}`}>{s.value}</p>
                </div>)}
            </div>

            {
    /* Action */
  }
            <button
    className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-[var(--hw-neutral-200)] rounded-xl text-[13px] font-medium ${area.accent} hover:bg-[var(--hw-neutral-50)] transition-colors`}
  >
              {area.action}
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            </button>
          </div>)}
      </div>

      {
    /* Version info */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-5 py-4 space-y-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--hw-neutral-700)]">Active configuration versions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
    { label: "Factor Rules", version: "v1.2.0", date: "Jun 1, 2026" },
    { label: "Weather Thresholds", version: "v1.1.0", date: "May 15, 2026" },
    { label: "Calendar Rules", version: "v1.0.2", date: "Apr 10, 2026" },
    { label: "Recommendation Engine", version: "v1.1.0", date: "Jun 1, 2026" }
  ].map((v) => <div key={v.label} className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2.5">
              <p className="text-[12px] text-[var(--hw-neutral-700)]">{v.label}</p>
              <p className="text-[13px] font-semibold text-[var(--hw-neutral-800)] mt-0.5">{v.version}</p>
              <p className="text-[12px] text-[var(--hw-neutral-700)]">Since {v.date}</p>
            </div>)}
        </div>
      </div>

    </div>;
}
export {
  AdminConfiguration as default
};
