import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  X
} from "lucide-react";
import { apiGet, parseResponse } from "../../global/api";
import { useDisplayMode } from "../../global/contexts/DisplayModeContext";
import { toCamelCase } from "../../global/utils/apiTransforms";
import { Skeleton } from "../components/shared/FarmerSkeletons";

const CAT_CFG = {
  "national-holiday-regular": { label: "National Holiday — Regular", dotColor: "bg-red-500", textColor: "text-red-700" },
  "national-holiday-special": { label: "National Holiday — Special Non-Working Day", dotColor: "bg-orange-400", textColor: "text-orange-700" },
  "local-event": { label: "Local Event", dotColor: "bg-blue-500", textColor: "text-blue-700" },
  "payday": { label: "Payday Period", dotColor: "bg-emerald-500", textColor: "text-emerald-700" },
  "crop-planting": { label: "My Crop Planting", dotColor: "bg-green-600", textColor: "text-green-700" },
  "crop-harvest": { label: "My Crop Harvest", dotColor: "bg-amber-600", textColor: "text-amber-700" }
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

const CalendarGrid = ({ year, month, selectedDate, onSelect, events }) => {
  const total = daysInMonth(year, month);
  const startDay = firstDay(year, month);
  const todayStr = new Date().toISOString().split('T')[0];
  const cells = Array.from({ length: startDay }, (_, i) => ({ day: 0, key: `pad-${i}` }));
  for (let d = 1; d <= total; d++) cells.push({ day: d, key: `d-${d}` });

  const getEventForDate = (ds) => {
    return events.filter((e) => !e.endDate ? e.date === ds : ds >= e.date && ds <= e.endDate);
  };

  return <div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => <div key={d} className="text-center text-[11px] font-semibold text-[var(--hw-neutral-700)] py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map(({ day, key }) => {
    if (!day) return <div key={key} />;
    const ds = dateStr(year, month, day);
    const dayEvents = getEventForDate(ds);
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
              {dayEvents.length > 0 && <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[32px]">
                  {dayEvents.slice(0, 3).map((e, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CAT_CFG[e.category]?.dotColor || 'bg-gray-300'}`} />)}
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
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("14d");
  const [noteOpen, setNoteOpen] = useState(false);
  const [reminderToast, setReminderToast] = useState(false);

  // Fetch market calendar events with React Query
  const { data: rawMarketEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ["marketCalendar"],
    queryFn: async () => {
      const marketRes = await apiGet('/market/calendar');
      if (!marketRes.ok) return [];
      const data = await parseResponse(marketRes);
      return data.items || [];
    },
    staleTime: 1000 * 60 * 30,
  });

  // Fetch farmer crop plans
  const { data: cropPlansData } = useQuery({
    queryKey: ["farmer", "crops"],
    queryFn: async () => {
      const cropRes = await apiGet('/crop-plans');
      if (!cropRes.ok) return [];
      const cropData = await parseResponse(cropRes);
      return cropData?.crop_plans || cropData?.items || [];
    },
    staleTime: 1000 * 60 * 30,
  });

  // Process all events once, then filter by view month
  const allEvents = useMemo(() => {
    const marketEvents = [];
    (rawMarketEvents || []).forEach(item => {
      const camelItem = toCamelCase(item);
      const origDate = camelItem.calendarDate || camelItem.date;
      if (!origDate) return;

      // Use original date from DB — no year remapping
      const eventDate = String(origDate);

      if (camelItem.isPublicHoliday || camelItem.holidayName) {
        marketEvents.push({
          id: `${camelItem.id || 'cal'}-holiday-${eventDate}`,
          date: eventDate,
          endDate: camelItem.eventEnd,
          category: camelItem.holidayName ? "national-holiday-regular" : "national-holiday-special",
          title: camelItem.holidayName || "Public Holiday",
          description: camelItem.holidayName || "Public Holiday",
          marketRelevance: "Public Holiday. Market operations and delivery schedules may be affected.",
          source: "Market Calendar"
        });
      }

      if (camelItem.isLocalEvent || camelItem.eventName) {
        marketEvents.push({
          id: `${camelItem.id || 'cal'}-local-${eventDate}`,
          date: eventDate,
          endDate: camelItem.eventEnd,
          category: "local-event",
          title: camelItem.eventName || "Davao Local Event",
          description: camelItem.eventName || "Davao City Local Event",
          marketRelevance: "Davao City local event. Consumer turnout and market activity may increase.",
          source: "Local Davao Event"
        });
      }

      if (camelItem.isPayday) {
        marketEvents.push({
          id: `${camelItem.id || 'cal'}-payday-${eventDate}`,
          date: eventDate,
          endDate: camelItem.eventEnd,
          category: "payday",
          title: "Payday Period",
          description: "Payday Period",
          marketRelevance: "Payday period. Higher consumer spending and market demand expected.",
          source: "Market Calendar"
        });
      }
    });

    const cropEvents = [];
    (cropPlansData || []).forEach(c => {
      const camelC = toCamelCase(c);
      const name = camelC.commodityName || 'Crop';
      if (camelC.plannedPlantingDate || camelC.actualPlantingDate) {
        const pDate = camelC.actualPlantingDate || camelC.plannedPlantingDate;
        cropEvents.push({
          id: `crop-plant-${camelC.id}`,
          date: pDate,
          category: "crop-planting",
          title: `Planting: ${name}`,
          description: `Target/actual planting for ${name}`,
          marketRelevance: "Farmer crop schedule event",
          source: "My Crops"
        });
      }
      if (camelC.expectedHarvestDate) {
        cropEvents.push({
          id: `crop-harvest-${camelC.id}`,
          date: camelC.expectedHarvestDate,
          category: "crop-harvest",
          title: `Expected Harvest: ${name}`,
          description: `Expected harvest window for ${name}`,
          marketRelevance: "Farmer crop harvest milestone",
          source: "My Crops"
        });
      }
    });

    return [...marketEvents, ...cropEvents];
  }, [rawMarketEvents, cropPlansData]);

  // Filter events to current view month
  const events = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    return allEvents.filter(e => {
      if (!e.date) return false;
      // Event starts in this month, or spans into this month
      const eventStartMonth = e.date.substring(0, 7);
      if (eventStartMonth === monthPrefix) return true;
      if (e.endDate && e.endDate >= `${monthPrefix}-01` && e.date <= `${monthPrefix}-31`) return true;
      return false;
    });
  }, [allEvents, year, month]);

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

  const selectedEvents = selectedDate ? events.filter((e) => !e.endDate ? e.date === selectedDate : selectedDate >= e.date && selectedDate <= e.endDate) : [];
  const TODAY = new Date().toISOString().split('T')[0];
  const periodDays = analyticsPeriod === "7d" ? 7 : analyticsPeriod === "14d" ? 14 : 28;

  const comingEvents = allEvents.filter((e) => {
    const fromDate = new Date(TODAY);
    const toDate = new Date(TODAY);
    toDate.setDate(toDate.getDate() + 90);
    const start = new Date(e.date);
    return start >= fromDate && start <= toDate;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const analyticsEvents = allEvents.filter((e) => {
    const fromDate = new Date(TODAY);
    const toDate = new Date(TODAY);
    toDate.setDate(toDate.getDate() + periodDays);
    const start = new Date(e.date);
    return start >= fromDate && start <= toDate;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const handleReminder = () => {
    setReminderToast(true);
    setTimeout(() => setReminderToast(false), 2500);
  };

  if (loadingEvents && (!rawMarketEvents || rawMarketEvents.length === 0)) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-5">
        <div className="max-w-2xl mx-auto md:max-w-4xl space-y-5">
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-36 rounded" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 pt-2">
              {Array.from({ length: 28 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-4xl space-y-5">

        <div className="flex items-center justify-end">
          <button
    onClick={() => setNoteOpen(true)}
    className="p-2 rounded-xl hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-400)] hover:text-blue-500 transition-colors"
    aria-label="About this calendar"
  >
            <Info className="w-4 h-4" />
          </button>
        </div>

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

        <div className="md:grid md:grid-cols-[1fr_280px] md:gap-5 space-y-5 md:space-y-0">

          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">

            <div className="flex items-center justify-between gap-3">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">{MONTHS[month]} {year}</p>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>

            <CalendarGrid year={year} month={month} selectedDate={selectedDate} onSelect={setSelectedDate} events={events} />

            <div className="flex flex-wrap gap-3 pt-2 border-t border-[var(--hw-neutral-100)]">
              {Object.entries(CAT_CFG).map(([cat, cfg]) => <div key={cat} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
                  <span className="text-[12px] text-[var(--hw-neutral-900)]">{cfg.label}</span>
                </div>)}
            </div>

            {selectedDate && <div className="border-t border-[var(--hw-neutral-100)] pt-3 space-y-2">
                <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">{formatDate(selectedDate)}</p>
                {selectedEvents.length === 0 ? <p className="text-[13px] text-[var(--hw-neutral-900)]">No market events recorded for this date.</p> : <div className="space-y-2">
                    {selectedEvents.map((evt) => {
    const cfg = CAT_CFG[evt.category] || { dotColor: "bg-gray-300", textColor: "text-gray-700" };
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

          <div className="space-y-3">
            <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Upcoming events</p>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5" style={{ scrollbarWidth: "none" }}>
              {comingEvents.length === 0 ? <p className="text-[13px] text-[var(--hw-neutral-900)]">No events in the next 3 months.</p> : comingEvents.map((evt) => {
    const cfg = CAT_CFG[evt.category] || { dotColor: "bg-gray-300", textColor: "text-gray-700", label: "Other" };
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

        {isAnalytics && analyticsEvents.length > 0 && <section className="space-y-3">
            <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">
              Events in next {analyticsPeriod === "7d" ? "7" : analyticsPeriod === "14d" ? "14" : "28"} days
            </p>
            <div className="space-y-2">
              {analyticsEvents.map((evt) => {
    const cfg = CAT_CFG[evt.category] || { dotColor: "bg-gray-300", textColor: "text-gray-700", label: "Other" };
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
