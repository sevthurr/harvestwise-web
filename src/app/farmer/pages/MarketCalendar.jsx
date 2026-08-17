import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  X
} from "lucide-react";
import { useDisplayMode } from "../../global/contexts/DisplayModeContext";
const EVENTS = [
  { id: "jun-25-pay", date: "2026-06-25", category: "payday", title: "End-of-month payday period", description: "End-of-month payday for many employees. Household purchasing activity may temporarily increase.", marketRelevance: "May influence market activity at Bangkerohan. Effect on prices remains uncertain.", source: "Payroll calendar reference" },
  { id: "jul-15-pay", date: "2026-07-15", category: "payday", title: "Mid-month payday period", description: "Payday for many private and government employees. Market activity may increase as households purchase fresh produce.", marketRelevance: "May support retail demand at Bangkerohan and other markets. Effect on prices remains uncertain.", source: "Payroll calendar reference" },
  { id: "jul-31-pay", date: "2026-07-31", category: "payday", title: "End-of-month payday period", description: "End-of-month payday. Household purchasing activity may temporarily increase.", marketRelevance: "May affect consumer turnout at nearby markets. Effect remains uncertain.", source: "Payroll calendar reference" },
  { id: "aug-14-kad", date: "2026-08-14", endDate: "2026-08-16", category: "local-event", title: "Kadayawan Grand Weekend", description: "Major Davao City festival weekend that may affect traffic, delivery schedules, market activity, and operating hours.", marketRelevance: "May affect delivery schedules and market operating hours. Effect on vegetable demand is uncertain.", source: "Davao City Government \u2014 Kadayawan Festival schedule" },
  { id: "aug-15-pay", date: "2026-08-15", category: "payday", title: "Mid-month payday period", description: "Payday period overlapping with the Kadayawan Grand Weekend.", marketRelevance: "Combined payday and festival activity may influence market conditions. Specific impact is uncertain.", source: "Payroll calendar reference" },
  { id: "aug-21-nin", date: "2026-08-21", category: "national-holiday-special", title: "Ninoy Aquino Day", description: "Special non-working holiday that may affect market schedules, government services, transportation, and deliveries.", marketRelevance: "Market may operate on reduced hours or be closed. Deliveries may be delayed. Check market schedules in advance.", source: "Republic Act 9256 \u2014 Official Holidays" },
  { id: "aug-31-nat", date: "2026-08-31", category: "national-holiday-regular", title: "National Heroes Day", description: "Regular public holiday that may affect traffic, operating hours, and deliveries.", marketRelevance: "Market may operate on reduced hours or be closed. Plan deliveries and market activities in advance.", source: "Republic Act 9256 \u2014 Official Holidays" },
  { id: "sep-15-pay", date: "2026-09-15", category: "payday", title: "Mid-month payday period", description: "Payday for many private and government employees.", marketRelevance: "May influence market activity. Effect on prices remains uncertain.", source: "Payroll calendar reference" },
  { id: "sep-30-pay", date: "2026-09-30", category: "payday", title: "End-of-month payday period", description: "End-of-month payday.", marketRelevance: "May affect consumer turnout. Effect remains uncertain.", source: "Payroll calendar reference" }
];
const CAT_CFG = {
  "national-holiday-regular": { label: "National Holiday \u2014 Regular", dotColor: "bg-red-500", textColor: "text-red-700" },
  "national-holiday-special": { label: "National Holiday \u2014 Special Non-Working Day", dotColor: "bg-orange-400", textColor: "text-orange-700" },
  "local-event": { label: "Local Event", dotColor: "bg-blue-500", textColor: "text-blue-700" },
  "payday": { label: "Payday Period", dotColor: "bg-emerald-500", textColor: "text-emerald-700" }
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}
function firstDay(y, m) {
  return new Date(y, m, 1).getDay();
}
function dateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function formatDate(ds) {
  const [y, m, d] = ds.split("-").map(Number);
  return `${MONTH_SHORT[m - 1]} ${d}, ${y}`;
}
function getEvents(ds) {
  return EVENTS.filter((e) => !e.endDate ? e.date === ds : ds >= e.date && ds <= e.endDate);
}
function upcomingEvents(from, days) {
  const fromDate = new Date(from);
  const toDate = new Date(from);
  toDate.setDate(toDate.getDate() + days);
  return EVENTS.filter((e) => {
    const start = new Date(e.date);
    return start >= fromDate && start <= toDate;
  }).sort((a, b) => a.date.localeCompare(b.date));
}
const InfoOverlay = ({ open, onClose }) => {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-[var(--shadow-xl)] p-5 max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <p className="font-semibold text-[var(--hw-neutral-900)]">About this calendar</p>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-800)]"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-[15px] text-[var(--hw-neutral-700)] leading-relaxed">
          Calendar events provide supporting market and operational context. They do not guarantee changes in vegetable demand or prices.
        </p>
      </div>
    </div>;
};
const CalendarGrid = ({ year, month, selectedDate, onSelect }) => {
  const total = daysInMonth(year, month);
  const startDay = firstDay(year, month);
  const todayStr = "2026-06-24";
  const cells = Array.from({ length: startDay }, (_, i) => ({ day: 0, key: `pad-${i}` }));
  for (let d = 1; d <= total; d++) cells.push({ day: d, key: `d-${d}` });
  return <div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => <div key={d} className="text-center text-[11px] font-semibold text-[var(--hw-neutral-700)] py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map(({ day, key }) => {
    if (!day) return <div key={key} />;
    const ds = dateStr(year, month, day);
    const evts = getEvents(ds);
    const isSel = ds === selectedDate;
    const isToday = ds === todayStr;
    return <button
      key={key}
      onClick={() => onSelect(ds)}
      className={`
                relative flex flex-col items-center justify-start pt-1 pb-1.5 rounded-lg min-h-[44px] transition-colors
                ${isSel ? "bg-[var(--hw-green-50)] ring-1 ring-[var(--hw-green-600)]" : "hover:bg-[var(--hw-green-50)]/50"}
              `}
    >
              <span className={`text-[13px] font-medium leading-none ${isSel ? "text-[var(--hw-green-700)] font-semibold" : isToday ? "text-[var(--hw-green-700)] font-bold" : "text-[var(--hw-neutral-900)]"}`}>
                {day}
              </span>
              {
      /* Event dots — always in category color */
    }
              {evts.length > 0 && <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[32px]">
                  {evts.slice(0, 3).map((e, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CAT_CFG[e.category].dotColor}`} />)}
                </div>}
            </button>;
  })}
      </div>
    </div>;
};
function MarketCalendarPage() {
  const navigate = useNavigate();
  const { mode } = useDisplayMode();
  const isAnalytics = mode === "analytics";
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(6);
  const [selectedDate, setSelectedDate] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("14d");
  const [noteOpen, setNoteOpen] = useState(false);
  const [reminderToast, setReminderToast] = useState(false);
  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  };
  const selectedEvents = selectedDate ? getEvents(selectedDate) : [];
  const TODAY = "2026-06-24";
  const periodDays = analyticsPeriod === "7d" ? 7 : analyticsPeriod === "14d" ? 14 : 28;
  const comingEvents = upcomingEvents(TODAY, 90);
  const analyticsEvents = upcomingEvents(TODAY, periodDays);
  const handleReminder = () => {
    setReminderToast(true);
    setTimeout(() => setReminderToast(false), 2500);
  };
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-4xl space-y-5">

        {
    /* Info button */
  }
        <div className="flex items-center justify-end">
          <button
    onClick={() => setNoteOpen(true)}
    className="p-2 rounded-xl hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-400)] hover:text-blue-500 transition-colors"
    aria-label="About this calendar"
  >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {
    /* Analytics period selector */
  }
        {isAnalytics && <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[var(--hw-neutral-900)] flex-shrink-0">Period:</span>
            {["7d", "14d", "28d"].map((p) => <button
    key={p}
    onClick={() => setAnalyticsPeriod(p)}
    className={`px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${analyticsPeriod === p ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                {p === "7d" ? "7 days" : p === "14d" ? "14 days" : "28 days"}
              </button>)}
          </div>}

        {
    /* Main grid: calendar + upcoming */
  }
        <div className="md:grid md:grid-cols-[1fr_280px] md:gap-5 space-y-5 md:space-y-0">

          {
    /* ── Calendar widget ── */
  }
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">

            {
    /* Month navigation */
  }
            <div className="flex items-center justify-between gap-3">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">{MONTHS[month]} {year}</p>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>

            {
    /* Calendar grid */
  }
            <CalendarGrid year={year} month={month} selectedDate={selectedDate} onSelect={setSelectedDate} />

            {
    /* Legend — no weekend */
  }
            <div className="flex flex-wrap gap-3 pt-2 border-t border-[var(--hw-neutral-100)]">
              {Object.entries(CAT_CFG).map(([cat, cfg]) => <div key={cat} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
                  <span className="text-[12px] text-[var(--hw-neutral-900)]">{cfg.label}</span>
                </div>)}
            </div>

            {
    /* Selected-date inline detail */
  }
            {selectedDate && <div className="border-t border-[var(--hw-neutral-100)] pt-3 space-y-2">
                <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{formatDate(selectedDate)}</p>
                {selectedEvents.length === 0 ? <p className="text-[13px] text-[var(--hw-neutral-900)]">No market events recorded for this date.</p> : <div className="space-y-2">
                    {selectedEvents.map((evt) => {
    const cfg = CAT_CFG[evt.category];
    return <div key={evt.id} className="flex items-start gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${cfg.dotColor}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] font-semibold ${cfg.textColor}`}>{evt.title}</p>
                            <p className={`text-[11px] font-medium ${cfg.textColor} opacity-70`}>{cfg.label}</p>
                            <p className="text-[12px] text-[var(--hw-neutral-900)] leading-snug mt-0.5">{evt.marketRelevance}</p>
                          </div>
                        </div>;
  })}
                  </div>}
              </div>}
          </div>

          {
    /* ── Upcoming events list — white card, neutral border ── */
  }
          <div className="space-y-3">
            <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Upcoming events</p>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5" style={{ scrollbarWidth: "none" }}>
              {comingEvents.length === 0 ? <p className="text-[13px] text-[var(--hw-neutral-900)]">No events in the next 3 months.</p> : comingEvents.map((evt) => {
    const cfg = CAT_CFG[evt.category];
    return <button
      key={evt.id}
      onClick={() => {
        setSelectedDate(evt.date);
        setYear(parseInt(evt.date.split("-")[0]));
        setMonth(parseInt(evt.date.split("-")[1]) - 1);
      }}
      className="w-full text-left rounded-xl border border-[var(--hw-neutral-200)] bg-white shadow-[var(--shadow-xs)] p-3 space-y-1 transition-colors hover:bg-[var(--hw-neutral-50)]"
    >
                      <div className="flex items-start gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${cfg.dotColor}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-[13px] font-semibold ${cfg.textColor}`}>{evt.title}</p>
                            <p className={`text-[11px] flex-shrink-0 ${cfg.textColor} opacity-70`}>{evt.date.slice(5).replace("-", "/")}</p>
                          </div>
                          <p className={`text-[11px] font-medium ${cfg.textColor} opacity-70`}>{cfg.label}</p>
                          <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug mt-0.5">{evt.marketRelevance}</p>
                        </div>
                      </div>
                    </button>;
  })}
            </div>
          </div>
        </div>

        {
    /* Analytics: events in selected period */
  }
        {isAnalytics && analyticsEvents.length > 0 && <section className="space-y-3">
            <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">
              Events in next {analyticsPeriod === "7d" ? "7" : analyticsPeriod === "14d" ? "14" : "28"} days
            </p>
            <div className="space-y-2">
              {analyticsEvents.map((evt) => {
    const cfg = CAT_CFG[evt.category];
    return <div key={evt.id} className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3 flex items-start gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${cfg.dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className={`text-[13px] font-semibold ${cfg.textColor}`}>{evt.title}</p>
                        <p className="text-[12px] text-[var(--hw-neutral-700)] flex-shrink-0">{evt.date.slice(5).replace("-", "/")}</p>
                      </div>
                      <p className={`text-[11px] font-medium ${cfg.textColor} opacity-70`}>{cfg.label}</p>
                      <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">{evt.marketRelevance}</p>
                    </div>
                  </div>;
  })}
            </div>
          </section>}

      </div>

      <InfoOverlay open={noteOpen} onClose={() => setNoteOpen(false)} />

      {reminderToast && <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--hw-neutral-900)] text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-[var(--shadow-lg)]">
          Reminder added (prototype — not saved)
        </div>}
    </div>;
}
export {
  MarketCalendarPage as default
};
