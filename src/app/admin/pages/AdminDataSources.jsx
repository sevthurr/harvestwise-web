import { PageHeader } from "../../global/components/shared/PageHeader";
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
  FileText,
  Download,
  Plus,
  RotateCcw,
  X,
  Pencil,
  Trash2,
  List
} from "lucide-react";
const DATA_SOURCES = [
  { id: "bangk-retail", name: "Bangkerohan Retail Prices", type: "Manual Upload", lastImport: "Jun 24, 7:30 AM", records: 140, status: "Updated", isManual: true },
  { id: "bangk-wholesale", name: "Bangkerohan Wholesale Prices", type: "Manual Upload", lastImport: "Jun 24, 7:35 AM", records: 140, status: "Updated", isManual: true },
  { id: "dftc-retail", name: "DFTC Retail Prices", type: "Manual Upload", lastImport: "Jun 24, 5:31 AM", records: 57, status: "Requires Review", isManual: true, issue: "38 records failed price range validation" },
  { id: "dftc-wholesale", name: "DFTC Wholesale Prices", type: "Manual Upload", lastImport: "Jun 24, 5:10 AM", records: 88, status: "Updated", isManual: true },
  { id: "dftc-arrivals", name: "DFTC Arrival Volume", type: "Manual Upload", lastImport: "Jun 24, 5:22 AM", records: 70, status: "Updated", isManual: true },
  { id: "psa", name: "Historical Production Volume", type: "PSA OpenStat API", lastImport: "Jun 24, 1:00 AM", records: 3200, status: "Updated", isManual: false },
  { id: "meteo-fore", name: "Weather Forecast", type: "OpenMeteo API", lastImport: "Jun 23, 5:00 AM", records: 0, status: "Failed", isManual: false, issue: "Retrieval failed \u2014 Jun 24, 5:00 AM" },
  { id: "gcal", name: "Holidays", type: "Google Calendar API", lastImport: "Jun 24, 1:00 AM", records: 22, status: "Updated", isManual: false }
];
const STATUS_TEXT = {
  Updated: "text-emerald-700",
  "Requires Review": "text-amber-700",
  Failed: "text-red-600"
};
const IMPORT_DATASETS = [
  { id: "bangk-retail", label: "Bangkerohan Retail Prices", required: "Date, Commodity, Retail Price (\u20B1/kg)" },
  { id: "bangk-wholesale", label: "Bangkerohan Wholesale Prices", required: "Date, Commodity, Wholesale Price (\u20B1/kg)" },
  { id: "dftc-retail", label: "DFTC Retail Prices", required: "Date, Commodity, Retail Price (\u20B1/kg)" },
  { id: "dftc-wholesale", label: "DFTC Wholesale Prices", required: "Date, Commodity, Wholesale Price (\u20B1/kg)" },
  { id: "dftc-arrivals", label: "DFTC Arrival Volume", required: "Week ending date, Commodity, Volume (MT)" }
];
const PROCESSING_STEPS = ["Uploaded", "Standardized", "Cleaned", "Validated", "Stored", "Ready for processing"];
const MOCK_PREVIEW = [
  { date: "Jun 24, 2026", commodity: "Kamatis", variety: "Diamante Big", price: "\u20B185.00" },
  { date: "Jun 24, 2026", commodity: "Talong", variety: "Banate King", price: "\u20B160.00" },
  { date: "Jun 24, 2026", commodity: "Repolyo", variety: "Wakamini", price: "\u20B145.00" },
  { date: "Jun 24, 2026", commodity: "Atsal", variety: "Smooth Cayene", price: "\u20B1120.00" },
  { date: "Jun 24, 2026", commodity: "Carrots", variety: "Big", price: "\u20B190.00" }
];
const VALIDATION_ISSUES = [
  { row: 12, field: "price", issue: "Value out of expected range", value: "\u20B1580.00" },
  { row: 28, field: "date", issue: "Date format not recognized", value: "24-06-26" },
  { row: 45, field: "commodity", issue: "Commodity not in registry", value: "Sibuyas Tagalog" }
];
const API_SYNC_SOURCES = [
  { id: "psa", name: "Historical Production Volume", apiSource: "PSA OpenStat API", lastSync: "Jun 24, 1:00 AM", nextSync: "Jun 25, 1:00 AM", recordsFetched: 3200, recordsAccepted: 3200, status: "Updated" },
  { id: "meteo-fore", name: "Weather Forecast", apiSource: "OpenMeteo API", lastSync: "Jun 23, 5:00 AM", nextSync: "\u2014", recordsFetched: 0, recordsAccepted: 0, status: "Failed", issue: "Retrieval failed \u2014 Jun 24, 5:00 AM. API responded with a 503 error. Next retry is scheduled." },
  { id: "gcal", name: "Holidays", apiSource: "Google Calendar API", lastSync: "Jun 24, 1:00 AM", nextSync: "Jun 25, 1:00 AM", recordsFetched: 22, recordsAccepted: 22, status: "Updated" }
];
const syncHasFailed = API_SYNC_SOURCES.some((s) => s.status === "Failed");
const syncSummary = syncHasFailed ? `${API_SYNC_SOURCES.filter((s) => s.status === "Failed").length} source failed \u2014 retry recommended` : "All sources updated";
const syncSummaryColor = syncHasFailed ? "text-red-600" : "text-emerald-700";
const BASE_EVENTS = [
  { id: "CE-001", name: "Araw ng Kagitingan", date: new Date(2026, 3, 9), from: "Apr 9, 2026", to: "Apr 9, 2026", type: "National Event", source: "Google Calendar API", recurrence: "Yearly", status: "Active", lastUpdated: "Jan 1, 2026" },
  { id: "CE-002", name: "Labor Day", date: new Date(2026, 4, 1), from: "May 1, 2026", to: "May 1, 2026", type: "National Event", source: "Google Calendar API", recurrence: "Yearly", status: "Active", lastUpdated: "Jan 1, 2026" },
  { id: "CE-003", name: "Independence Day", date: new Date(2026, 5, 12), from: "Jun 12, 2026", to: "Jun 12, 2026", type: "National Event", source: "Google Calendar API", recurrence: "Yearly", status: "Active", lastUpdated: "Jan 1, 2026" },
  { id: "CE-004", name: "Araw ng Dabaw", date: new Date(2026, 6, 4), from: "Jul 4, 2026", to: "Jul 4, 2026", type: "Local Event", source: "Manual Entry", recurrence: "Yearly", status: "Active", lastUpdated: "Jun 1, 2026", description: "Local Davao City holiday." },
  { id: "CE-005", name: "Kadayawan Festival", date: new Date(2026, 7, 15), from: "Aug 15, 2026", to: "Aug 17, 2026", type: "Local Event", source: "Manual Entry", recurrence: "Yearly", status: "Active", lastUpdated: "Jun 1, 2026", description: "Annual Kadayawan festival in Davao City." },
  { id: "CE-006", name: "Ninoy Aquino Day", date: new Date(2026, 7, 21), from: "Aug 21, 2026", to: "Aug 21, 2026", type: "National Event", source: "Google Calendar API", recurrence: "Yearly", status: "Active", lastUpdated: "Jan 1, 2026" },
  { id: "CE-007", name: "National Heroes Day", date: new Date(2026, 7, 31), from: "Aug 31, 2026", to: "Aug 31, 2026", type: "National Event", source: "Google Calendar API", recurrence: "Yearly", status: "Active", lastUpdated: "Jan 1, 2026" },
  { id: "CE-008", name: "Davao City Charter Day", date: new Date(2026, 9, 16), from: "Oct 16, 2026", to: "Oct 16, 2026", type: "Local Event", source: "Manual Entry", recurrence: "Yearly", status: "Active", lastUpdated: "Jun 1, 2026" },
  { id: "CE-009", name: "Bonifacio Day", date: new Date(2026, 10, 30), from: "Nov 30, 2026", to: "Nov 30, 2026", type: "National Event", source: "Google Calendar API", recurrence: "Yearly", status: "Active", lastUpdated: "Jan 1, 2026" },
  { id: "CE-010", name: "Immaculate Conception", date: new Date(2026, 11, 8), from: "Dec 8, 2026", to: "Dec 8, 2026", type: "National Event", source: "Google Calendar API", recurrence: "Yearly", status: "Active", lastUpdated: "Jan 1, 2026" },
  { id: "CE-011", name: "Christmas Day", date: new Date(2026, 11, 25), from: "Dec 25, 2026", to: "Dec 25, 2026", type: "National Event", source: "Google Calendar API", recurrence: "Yearly", status: "Active", lastUpdated: "Jan 1, 2026" },
  { id: "CE-012", name: "Rizal Day", date: new Date(2026, 11, 30), from: "Dec 30, 2026", to: "Dec 30, 2026", type: "National Event", source: "Google Calendar API", recurrence: "Yearly", status: "Active", lastUpdated: "Jan 1, 2026" }
];
const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TODAY_DATE = new Date(2026, 5, 24);
function buildGrid(year, month) {
  const first = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const cells = Array(first).fill(null);
  for (let d = 1; d <= lastDate; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function filterEnd(f) {
  const d = new Date(TODAY_DATE);
  if (f === "30d") d.setDate(d.getDate() + 30);
  else if (f === "3m") d.setMonth(d.getMonth() + 3);
  else if (f === "6m") d.setMonth(d.getMonth() + 6);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}
const FMT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(s) {
  const dt = new Date(s);
  return `${FMT_MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}
function parseDateToInput(dateStr) {
  const m = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12"
  };
  const parts = dateStr.replace(",", "").trim().split(" ");
  if (parts.length !== 3) return "";
  return `${parts[2]}-${m[parts[0]] ?? "01"}-${parts[1].padStart(2, "0")}`;
}
const EMPTY_FORM = {
  name: "",
  type: "Holiday",
  from: "",
  to: "",
  recurrence: "Yearly",
  description: "",
  status: "Active"
};
function AdminDataSources() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("sources");
  const [showImport, setShowImport] = useState(false);
  const [importStep, setImportStep] = useState(0);
  const [selectedDs, setSelectedDs] = useState(IMPORT_DATASETS[0].id);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(5);
  const [calFilter, setCalFilter] = useState("30d");
  const [events, setEvents] = useState(BASE_EVENTS);
  const [showConfiguredEvents, setShowConfiguredEvents] = useState(false);
  const [selectedCalDay, setSelectedCalDay] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewEventId, setViewEventId] = useState(null);
  const [editEventId, setEditEventId] = useState(null);
  const [deleteEventId, setDeleteEventId] = useState(null);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const calGrid = useMemo(() => buildGrid(calYear, calMonth), [calYear, calMonth]);
  const filteredEvents = useMemo(() => {
    const end = filterEnd(calFilter);
    return events.filter((e) => e.date >= TODAY_DATE && e.date <= end).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, calFilter]);
  const eventsInMonth = useMemo(
    () => events.filter((e) => e.date.getFullYear() === calYear && e.date.getMonth() === calMonth),
    [events, calYear, calMonth]
  );
  const manualEvents = useMemo(
    () => events.filter((e) => e.source === "Manual Entry"),
    [events]
  );
  const viewEvent = viewEventId ? events.find((e) => e.id === viewEventId) : null;
  const deleteEvent = deleteEventId ? events.find((e) => e.id === deleteEventId) : null;
  const ds = IMPORT_DATASETS.find((d) => d.id === selectedDs);
  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };
  const closeImport = () => {
    setShowImport(false);
    setImportStep(0);
    setFileUploaded(false);
  };
  const openEdit = (id) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    setEditForm({
      name: ev.name,
      type: ev.type,
      from: parseDateToInput(ev.from),
      to: parseDateToInput(ev.to),
      recurrence: ev.recurrence,
      description: ev.description ?? "",
      status: ev.status
    });
    setEditEventId(id);
  };
  const tabCls = (id) => `px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${tab === id ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)]" : "border-transparent text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-800)]"}`;
  const inputCls = "w-full px-3 py-2 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] bg-white outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition";
  const btnPrimary = "flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-[var(--hw-green-700)] text-white rounded-xl hover:bg-[var(--hw-green-800)] transition-colors";
  const btnSecondary = "flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors";
  const renderEventFormFields = (form, setForm) => <div className="px-5 py-4 space-y-3">
      <div>
        <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Event name</label>
        <input
    value={form.name}
    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
    placeholder="e.g. Araw ng Dabaw"
    className={inputCls}
  />
      </div>
      <div>
        <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Event type</label>
        <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={inputCls}>
          <option value="Holiday">Holiday</option>
          <option value="Local Event">Local Event</option>
          <option value="National Event">National Event</option>
          <option value="Others">Others</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">From</label>
          <input
    type="date"
    value={form.from}
    onChange={(e) => setForm((f) => ({ ...f, from: e.target.value, to: f.to || e.target.value }))}
    className={inputCls}
  />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">To</label>
          <input
    type="date"
    value={form.to || form.from}
    onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
    className={inputCls}
  />
        </div>
      </div>
      <div>
        <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Recurrence</label>
        <select value={form.recurrence} onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))} className={inputCls}>
          <option value="Bi-weekly">Bi-weekly</option>
          <option value="Monthly">Monthly</option>
          <option value="Yearly">Yearly</option>
        </select>
      </div>
      <div>
        <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Description (optional)</label>
        <input
    value={form.description}
    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
    placeholder="Add short details about this event"
    className={inputCls}
  />
      </div>
      <div>
        <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Status</label>
        <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
    </div>;
  const renderAddModal = () => <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={() => {
    setShowAddModal(false);
    setAddForm(EMPTY_FORM);
  }} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-100)]">
          <p className="font-semibold text-[var(--hw-neutral-800)]">Add Calendar Event</p>
          <button
    onClick={() => {
      setShowAddModal(false);
      setAddForm(EMPTY_FORM);
    }}
    className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors"
  >
            <X className="w-4 h-4" />
          </button>
        </div>
        {renderEventFormFields(addForm, setAddForm)}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--hw-neutral-100)]">
          <button onClick={() => {
    setShowAddModal(false);
    setAddForm(EMPTY_FORM);
  }} className={btnSecondary}>Cancel</button>
          <button onClick={() => {
    if (addForm.name.trim() && addForm.from) {
      const d = new Date(addForm.from);
      const newId = `CE-${String(events.length + 1).padStart(3, "0")}`;
      setEvents((prev) => [...prev, {
        id: newId,
        name: addForm.name,
        date: d,
        from: fmtDate(addForm.from),
        to: addForm.to ? fmtDate(addForm.to) : fmtDate(addForm.from),
        type: addForm.type,
        source: "Manual Entry",
        recurrence: addForm.recurrence,
        description: addForm.description || void 0,
        status: addForm.status,
        lastUpdated: "Jun 24, 2026"
      }]);
      setShowAddModal(false);
      setAddForm(EMPTY_FORM);
    }
  }} className={btnPrimary}>Save Event</button>
        </div>
      </div>
    </div>;
  const renderEditModal = () => {
    if (!editEventId) return null;
    return <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30" onClick={() => setEditEventId(null)} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-100)]">
            <p className="font-semibold text-[var(--hw-neutral-800)]">Edit Calendar Event</p>
            <button
      onClick={() => setEditEventId(null)}
      className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors"
    >
              <X className="w-4 h-4" />
            </button>
          </div>
          {renderEventFormFields(editForm, setEditForm)}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--hw-neutral-100)]">
            <button onClick={() => setEditEventId(null)} className={btnSecondary}>Cancel</button>
            <button onClick={() => {
      if (editForm.name.trim() && editForm.from) {
        setEvents((prev) => prev.map((e) => e.id !== editEventId ? e : {
          ...e,
          name: editForm.name,
          type: editForm.type,
          date: new Date(editForm.from),
          from: fmtDate(editForm.from),
          to: editForm.to ? fmtDate(editForm.to) : fmtDate(editForm.from),
          recurrence: editForm.recurrence,
          description: editForm.description || void 0,
          status: editForm.status,
          lastUpdated: "Jun 24, 2026"
        }));
        setEditEventId(null);
      }
    }} className={btnPrimary}>Save Changes</button>
          </div>
        </div>
      </div>;
  };
  const renderDeleteConfirmModal = () => {
    if (!deleteEvent) return null;
    return <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30" onClick={() => setDeleteEventId(null)} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[var(--hw-neutral-800)]">Delete event?</p>
              <p className="text-[13px] text-[var(--hw-neutral-800)] mt-1">
                <span className="font-medium text-[var(--hw-neutral-700)]">{deleteEvent.name}</span> will be permanently removed from the calendar.
              </p>
            </div>
            <button
      onClick={() => setDeleteEventId(null)}
      className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors flex-shrink-0"
    >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setDeleteEventId(null)} className={btnSecondary}>Cancel</button>
            <button onClick={() => {
      setEvents((prev) => prev.filter((e) => e.id !== deleteEventId));
      setDeleteEventId(null);
    }} className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />Delete
            </button>
          </div>
        </div>
      </div>;
  };
  const renderViewEventModal = () => {
    if (!viewEvent) return null;
    return <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30" onClick={() => setViewEventId(null)} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-100)]">
            <p className="font-semibold text-[var(--hw-neutral-800)]">Calendar Event Details</p>
            <button
      onClick={() => setViewEventId(null)}
      className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors"
    >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {[
      { label: "ID", value: viewEvent.id },
      { label: "Event", value: viewEvent.name },
      { label: "Type", value: viewEvent.type },
      { label: "Source", value: viewEvent.source },
      { label: "From", value: viewEvent.from },
      { label: "To", value: viewEvent.to },
      { label: "Recurrence", value: viewEvent.recurrence },
      { label: "Description", value: viewEvent.description || "\u2014" },
      { label: "Status", value: viewEvent.status, color: viewEvent.status === "Active" ? "text-emerald-700" : "text-[var(--hw-neutral-700)]" },
      { label: "Last updated", value: viewEvent.lastUpdated }
    ].map((row) => <div key={row.label} className="flex items-start justify-between gap-4 px-5 py-3">
                <p className="text-[13px] text-[var(--hw-neutral-800)] flex-shrink-0">{row.label}</p>
                <p className={`text-[13px] font-medium text-right ${"color" in row && row.color ? row.color : "text-[var(--hw-neutral-800)]"}`}>
                  {row.value}
                </p>
              </div>)}
          </div>
          <div className="flex justify-end px-5 py-4 border-t border-[var(--hw-neutral-100)]">
            <button onClick={() => setViewEventId(null)} className={btnSecondary}>Close</button>
          </div>
        </div>
      </div>;
  };
  const renderCalendarWidget = () => {
    const selectedEvents = selectedCalDay ? eventsInMonth.filter((e) => e.date.getDate() === selectedCalDay) : [];
    return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
        {
      /* Month navigation */
    }
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-800)] transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="font-semibold text-[var(--hw-neutral-800)] text-[15px]">{MONTH_FULL[calMonth]} {calYear}</p>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-800)] transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {
      /* Day headers */
    }
        <div className="grid grid-cols-7 mb-1">
          {DAY_SHORT.map((d) => <div key={d} className="text-center text-[12px] font-semibold text-[var(--hw-neutral-700)] py-1">{d}</div>)}
        </div>

        {
      /* Day cells */
    }
        <div className="grid grid-cols-7 gap-y-1">
          {calGrid.map((day, i) => {
      if (day === null) return <div key={i} />;
      const isToday = calYear === 2026 && calMonth === 5 && day === 24;
      const isSelected = selectedCalDay === day;
      const dayEvents = eventsInMonth.filter((e) => e.date.getDate() === day);
      const hasEvents = dayEvents.length > 0;
      return <button
        key={i}
        onClick={() => {
          if (hasEvents) setSelectedCalDay((d) => d === day ? null : day);
        }}
        className={`flex flex-col items-center justify-start pt-2 pb-1.5 min-h-[52px] rounded-xl text-[13px] font-medium transition-colors
                  ${isSelected ? "bg-[var(--hw-green-700)] text-white" : isToday ? "ring-2 ring-[var(--hw-green-700)] text-[var(--hw-neutral-900)]" : hasEvents ? "text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-100)] cursor-pointer" : "text-[var(--hw-neutral-700)] cursor-default"}`}
      >
                <span>{day}</span>
                {hasEvents && <div className="flex gap-0.5 mt-1 justify-center">
                    {dayEvents.slice(0, 3).map((e, ei) => <span key={ei} className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                        ${e.source === "Google Calendar API" ? "bg-emerald-500" : "bg-blue-500"}
                        ${isSelected ? "opacity-70" : ""}`} />)}
                  </div>}
              </button>;
    })}
        </div>

        {
      /* Day event overlay */
    }
        {selectedCalDay && selectedEvents.length > 0 && <div className="mt-4 pt-4 border-t border-[var(--hw-neutral-100)]">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[13px] font-semibold text-[var(--hw-neutral-700)]">
                {MONTH_FULL[calMonth]} {selectedCalDay}, {calYear}
              </p>
              <button
      onClick={() => setSelectedCalDay(null)}
      className="p-1 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors"
    >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {selectedEvents.map((e) => <div key={e.id} className="flex items-start gap-2.5 px-3 py-2.5 bg-[var(--hw-neutral-50)] rounded-xl">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${e.source === "Google Calendar API" ? "bg-emerald-500" : "bg-blue-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[var(--hw-neutral-800)]">{e.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[12px] text-[var(--hw-neutral-800)]">{e.type}</span>
                      <span className="text-[var(--hw-neutral-300)]">·</span>
                      <span className="text-[12px] text-[var(--hw-neutral-700)]">{e.source}</span>
                      {e.from !== e.to && <>
                          <span className="text-[var(--hw-neutral-300)]">·</span>
                          <span className="text-[12px] text-[var(--hw-neutral-700)]">{e.from} – {e.to}</span>
                        </>}
                    </div>
                  </div>
                  <button
      onClick={() => setViewEventId(e.id)}
      className="text-[11px] font-medium text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-800)] flex-shrink-0 mt-0.5"
    >
                    Details
                  </button>
                </div>)}
            </div>
          </div>}

        {
      /* Legend */
    }
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--hw-neutral-100)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-[12px] text-[var(--hw-neutral-800)]">API holiday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-[12px] text-[var(--hw-neutral-800)]">Configured event</span>
          </div>
        </div>
      </div>;
  };
  const renderConfiguredEventsPage = () => <div className="space-y-4">
      {
    /* Back */
  }
      <button
    onClick={() => setShowConfiguredEvents(false)}
    className="flex items-center gap-1 text-[13px] text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-700)] transition-colors"
  >
        <ChevronLeft className="w-4 h-4" />Back to Calendar &amp; Events
      </button>

      {
    /* Header */
  }
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[var(--hw-neutral-800)]">Configured Events</h2>
          <p className="text-[13px] text-[var(--hw-neutral-800)] mt-0.5">
            Manually added events configured by admins. {manualEvents.length} {manualEvents.length === 1 ? "event" : "events"} total.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className={`${btnPrimary} flex-shrink-0`}>
          <Plus className="w-4 h-4" />Add Event
        </button>
      </div>

      {
    /* Table */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                {["ID", "Event Name", "Date", "Type", "Recurrence", "Status", ""].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[var(--hw-neutral-800)] uppercase tracking-wide whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hw-neutral-100)]">
              {manualEvents.length === 0 ? <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-[var(--hw-neutral-700)]">
                    No configured events yet. Add one to get started.
                  </td>
                </tr> : manualEvents.map((e) => <tr
    key={e.id}
    onClick={() => setViewEventId(e.id)}
    className="hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
  >
                  <td className="px-4 py-3 text-[var(--hw-neutral-700)] font-mono text-[12px] whitespace-nowrap">{e.id}</td>
                  <td className="px-4 py-3 font-medium text-[var(--hw-neutral-800)]">{e.name}</td>
                  <td className="px-4 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">
                    {e.from === e.to ? e.from : `${e.from} \u2013 ${e.to}`}
                  </td>
                  <td className="px-4 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">{e.type}</td>
                  <td className="px-4 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">{e.recurrence}</td>
                  <td className={`px-4 py-3 font-medium whitespace-nowrap ${e.status === "Active" ? "text-emerald-700" : "text-[var(--hw-neutral-700)]"}`}>
                    {e.status}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
    onClick={(ev) => {
      ev.stopPropagation();
      openEdit(e.id);
    }}
    className="text-[12px] font-medium text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-800)] inline-flex items-center gap-1 whitespace-nowrap transition-colors"
  >
                        <Pencil className="w-3 h-3" />Edit
                      </button>
                      <button
    onClick={(ev) => {
      ev.stopPropagation();
      setDeleteEventId(e.id);
    }}
    className="text-[12px] font-medium text-red-500 hover:text-red-700 inline-flex items-center gap-1 whitespace-nowrap transition-colors"
  >
                        <Trash2 className="w-3 h-3" />Delete
                      </button>
                    </div>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>;
  const renderImport = () => <div className="max-w-2xl mx-auto space-y-5 pt-2">
      <button
    onClick={closeImport}
    className="flex items-center gap-1 text-[13px] text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-700)] transition-colors"
  >
        <ChevronLeft className="w-4 h-4" />Back to Data Sources
      </button>

      {
    /* Step indicator */
  }
      <div className="flex items-center">
        {["Select dataset", "Upload file", "Preview", "Validate", "Result"].map((label, i) => <React.Fragment key={label}>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${i < importStep ? "bg-[var(--hw-green-700)] text-white" : i === importStep ? "bg-[var(--hw-green-700)] text-white ring-2 ring-[var(--hw-green-200)]" : "bg-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)]"}`}>
                {i < importStep ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-[11px] font-medium hidden sm:block whitespace-nowrap ${i === importStep ? "text-[var(--hw-green-700)]" : i < importStep ? "text-[var(--hw-neutral-800)]" : "text-[var(--hw-neutral-700)]"}`}>
                {label}
              </span>
            </div>
            {i < 4 && <div className={`flex-1 h-0.5 mx-2 rounded ${i < importStep ? "bg-[var(--hw-green-700)]" : "bg-[var(--hw-neutral-200)]"}`} />}
          </React.Fragment>)}
      </div>

      {
    /* Step 0: Select dataset */
  }
      {importStep === 0 && <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-4">
          <p className="font-semibold text-[var(--hw-neutral-800)]">Select dataset</p>
          <div className="space-y-2">
            {IMPORT_DATASETS.map((d) => <label key={d.id} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${selectedDs === d.id ? "border-[var(--hw-green-600)] bg-[var(--hw-green-50)]" : "border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)]"}`}>
                <input type="radio" name="dataset" checked={selectedDs === d.id} onChange={() => setSelectedDs(d.id)} className="mt-0.5 accent-[var(--hw-green-700)]" />
                <div>
                  <p className="font-medium text-[var(--hw-neutral-800)]">{d.label}</p>
                  <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">CSV · {d.required}</p>
                </div>
              </label>)}
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <button className="text-[13px] font-medium text-[var(--hw-neutral-800)] hover:opacity-70 flex items-center gap-1">
              <Download className="w-4 h-4" />Download Template
            </button>
            <button onClick={() => setImportStep(1)} className={btnPrimary}>Continue →</button>
          </div>
        </div>}

      {
    /* Step 1: Upload */
  }
      {importStep === 1 && <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-[var(--hw-neutral-800)]">Upload file</p>
              <span className="text-[12px] text-[var(--hw-neutral-700)]">{ds.label}</span>
            </div>
            {!fileUploaded ? <div
    onClick={() => setFileUploaded(true)}
    className="border-2 border-dashed border-[var(--hw-neutral-300)] rounded-xl p-8 text-center space-y-3 hover:border-[var(--hw-green-500)] transition-colors cursor-pointer"
  >
                <div className="w-10 h-10 mx-auto rounded-xl bg-[var(--hw-neutral-100)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[var(--hw-neutral-700)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--hw-neutral-700)]">Drag and drop your file here</p>
                  <p className="text-[13px] text-[var(--hw-neutral-700)] mt-0.5">CSV only · Max 10 MB</p>
                </div>
                <button type="button" className={btnSecondary + " mx-auto"}>Browse File</button>
              </div> : <div className="flex items-center gap-3 p-3.5 bg-[var(--hw-green-50)] border border-[var(--hw-green-200)] rounded-xl">
                <FileText className="w-5 h-5 text-[var(--hw-green-700)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--hw-neutral-800)]">bangk_retail_jun24.csv</p>
                  <p className="text-[12px] text-[var(--hw-neutral-800)]">24.8 KB · 140 rows</p>
                </div>
                <button onClick={() => setFileUploaded(false)} className="text-[12px] text-[var(--hw-neutral-800)] hover:opacity-70">Replace</button>
              </div>}
          </div>
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => setImportStep(0)} className="text-[13px] text-[var(--hw-neutral-800)] hover:opacity-70">← Back</button>
            <button onClick={() => {
    if (fileUploaded) setImportStep(2);
  }} disabled={!fileUploaded} className={`${btnPrimary} disabled:opacity-40`}>
              Preview Records →
            </button>
          </div>
        </div>}

      {
    /* Step 2: Preview */
  }
      {importStep === 2 && <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-3">
            <p className="font-semibold text-[var(--hw-neutral-800)]">Preview — first 5 rows</p>
            <div className="overflow-x-auto rounded-xl border border-[var(--hw-neutral-200)]">
              <table className="w-full text-[12px]">
                <thead><tr className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                  {["Date", "Commodity", "Variety", "Price"].map((h) => <th key={h} className="px-3 py-2 text-left font-semibold text-[var(--hw-neutral-800)]">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {MOCK_PREVIEW.map((r, i) => <tr key={i}><td className="px-3 py-2">{r.date}</td><td className="px-3 py-2">{r.commodity}</td><td className="px-3 py-2 text-[var(--hw-neutral-500)] italic">{r.variety}</td><td className="px-3 py-2">{r.price}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => setImportStep(1)} className="text-[13px] text-[var(--hw-neutral-800)] hover:opacity-70">← Back</button>
            <button onClick={() => setImportStep(3)} className={btnPrimary}>Validate Records →</button>
          </div>
        </div>}

      {
    /* Step 3: Validate */
  }
      {importStep === 3 && <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
    { label: "Total", value: "140", color: "text-[var(--hw-neutral-900)]" },
    { label: "Accepted", value: "137", color: "text-emerald-700" },
    { label: "Rejected", value: "3", color: "text-red-600" },
    { label: "Warnings", value: "3", color: "text-amber-700" }
  ].map((s) => <div key={s.label} className="bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-3 py-3 text-center">
                <p className="text-[12px] text-[var(--hw-neutral-700)]">{s.label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
              </div>)}
          </div>
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
              <p className="text-[13px] font-semibold text-amber-700">{VALIDATION_ISSUES.length} issues found</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead><tr className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                  {["Row", "Field", "Issue", "Value"].map((h) => <th key={h} className="px-4 py-2 text-left font-semibold text-[var(--hw-neutral-800)]">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {VALIDATION_ISSUES.map((r, i) => <tr key={i}>
                      <td className="px-4 py-2.5 text-[var(--hw-neutral-700)]">Row {r.row}</td>
                      <td className="px-4 py-2.5 font-medium text-[var(--hw-neutral-700)]">{r.field}</td>
                      <td className="px-4 py-2.5 text-amber-700">{r.issue}</td>
                      <td className="px-4 py-2.5 font-mono text-[var(--hw-neutral-800)]">{r.value}</td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setImportStep(2)} className="text-[13px] text-[var(--hw-neutral-800)] hover:opacity-70">← Back</button>
            <div className="flex-1" />
            <button className={btnSecondary}><Download className="w-3.5 h-3.5" />Error Report</button>
            <button onClick={() => setImportStep(4)} className={btnPrimary}>Import 137 Valid Records →</button>
          </div>
        </div>}

      {
    /* Step 4: Result */
  }
      {importStep === 4 && <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--hw-green-700)] flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-white" />
              </div>
              <p className="font-semibold text-[var(--hw-neutral-800)]">Import completed</p>
            </div>
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Processing checklist</p>
              <div className="space-y-1.5">
                {PROCESSING_STEPS.map((step) => <div key={step} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-700" />
                    </div>
                    <span className="text-[13px] text-[var(--hw-neutral-700)]">{step}</span>
                  </div>)}
              </div>
            </div>
            <div className="divide-y divide-[var(--hw-neutral-100)] rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden">
              {[
    { label: "Dataset", value: ds.label },
    { label: "Imported records", value: "137", color: "text-emerald-700" },
    { label: "Rejected records", value: "3", color: "text-amber-700" },
    { label: "Completed", value: "Jun 24, 2026 \xB7 7:52 AM" }
  ].map((r) => <div key={r.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <p className="text-[13px] text-[var(--hw-neutral-800)]">{r.label}</p>
                  <p className={`text-[13px] font-semibold ${"color" in r ? r.color : "text-[var(--hw-neutral-800)]"}`}>{r.value}</p>
                </div>)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate("/admin/history")} className={btnPrimary}>View Processing History</button>
            <button onClick={closeImport} className={btnSecondary}>Done</button>
          </div>
        </div>}
    </div>;
  return <>
      {
    /* Modals */
  }
      {showAddModal && renderAddModal()}
      {editEventId && renderEditModal()}
      {deleteEventId && renderDeleteConfirmModal()}
      {viewEventId && renderViewEventModal()}

      <div className="px-4 md:px-8 lg:px-10 py-5 max-w-[1240px] mx-auto space-y-5">

        {
    /* Header */
  }
        <PageHeader
    title="Data"
    description="Manage data sources, API sync, and calendar events."
    action={<div className="flex items-center gap-1.5 text-[var(--hw-neutral-700)] text-[12px]"><RefreshCw className="w-3.5 h-3.5" /><span>Jun 24, 7:30 AM</span></div>}
  />

        {
    /* Tabs (hidden during import subview) */
  }
        {!showImport && <div className="flex border-b border-[var(--hw-neutral-200)]">
            {[["sources", "Data Sources"], ["api-sync", "API Sync"], ["calendar", "Calendar & Events"]].map(([id, label]) => <button key={id} onClick={() => {
    setTab(id);
    setShowConfiguredEvents(false);
  }} className={tabCls(id)}>{label}</button>)}
          </div>}

        {
    /* Import subview */
  }
        {showImport && renderImport()}

        {
    /* ══ TAB: DATA SOURCES ══ */
  }
        {!showImport && tab === "sources" && <div className="space-y-3">
            <div className="flex items-center justify-end">
              <button onClick={() => {
    setShowImport(true);
    setImportStep(0);
    setFileUploaded(false);
  }} className={btnPrimary}>
                <FileText className="w-4 h-4" />Import Data
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                      {["Source", "Type", "Last Import", "Records Imported", "Status"].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[var(--hw-neutral-800)] uppercase tracking-wide whitespace-nowrap">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                    {DATA_SOURCES.map((s) => <tr
    key={s.id}
    onClick={() => navigate(`/admin/data-sources/${s.id}`)}
    className="hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
  >
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--hw-neutral-800)]">{s.name}</p>
                          {s.issue && <p className="text-[11px] text-amber-600 mt-0.5">{s.issue}</p>}
                        </td>
                        <td className="px-4 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">{s.type}</td>
                        <td className="px-4 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">{s.lastImport}</td>
                        <td className="px-4 py-3 text-[var(--hw-neutral-700)] font-medium">{s.records > 0 ? s.records.toLocaleString() : "\u2014"}</td>
                        <td className={`px-4 py-3 font-medium whitespace-nowrap ${STATUS_TEXT[s.status]}`}>{s.status}</td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>}

        {
    /* ══ TAB: API SYNC ══ */
  }
        {!showImport && tab === "api-sync" && <div className="space-y-4">
            {
    /* Header row */
  }
            <div className="flex items-center justify-end gap-2 flex-shrink-0">
              <button className={btnPrimary}>
                {syncHasFailed ? <><RotateCcw className="w-4 h-4" />Retry Sync</> : <><RefreshCw className="w-4 h-4" />Sync Now</>}
              </button>
              <button onClick={() => navigate("/admin/history")} className={btnSecondary}>
                View Sync History
              </button>
            </div>

            {
    /* Sources list */
  }
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden divide-y divide-[var(--hw-neutral-100)]">
              {API_SYNC_SOURCES.map((s) => <div
    key={s.id}
    onClick={() => navigate(`/admin/data-sources/${s.id}`)}
    className="px-5 py-4 space-y-3 hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
  >
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[var(--hw-neutral-800)]">{s.name}</p>
                        <span className={`text-[13px] font-medium ${STATUS_TEXT[s.status]}`}>{s.status}</span>
                      </div>
                      <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">{s.apiSource}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2">
                    {[
    { label: "Last sync", value: s.lastSync },
    { label: "Next scheduled", value: s.nextSync },
    { label: "Records fetched", value: s.recordsFetched.toLocaleString() },
    { label: "Records accepted", value: s.recordsAccepted.toLocaleString() }
  ].map((f) => <div key={f.label}>
                        <p className="text-[12px] text-[var(--hw-neutral-700)]">{f.label}</p>
                        <p className="text-[13px] font-medium text-[var(--hw-neutral-700)] mt-0.5">{f.value}</p>
                      </div>)}
                  </div>
                  {s.issue && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                      {s.issue}
                    </p>}
                </div>)}
            </div>
          </div>}

        {
    /* ══ TAB: CALENDAR & EVENTS ══ */
  }
        {!showImport && tab === "calendar" && (showConfiguredEvents ? renderConfiguredEventsPage() : <div className="space-y-5">
              {
    /* Top row */
  }
              <div className="flex items-center justify-end gap-2 flex-shrink-0">
                <button onClick={() => setShowConfiguredEvents(true)} className={btnSecondary}>
                  <List className="w-4 h-4" />View Configured Events
                </button>
                <button onClick={() => setShowAddModal(true)} className={btnPrimary}>
                  <Plus className="w-4 h-4" />Add Calendar Event
                </button>
              </div>

              {
    /* Calendar widget — full width */
  }
              {renderCalendarWidget()}

              {
    /* Filter */
  }
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] text-[var(--hw-neutral-800)] font-medium">Show:</span>
                {[["30d", "Next 30 days"], ["3m", "Next 3 months"], ["6m", "Next 6 months"], ["1y", "Next 1 year"]].map(([val, label]) => <button
    key={val}
    onClick={() => setCalFilter(val)}
    className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-colors ${calFilter === val ? "bg-[var(--hw-green-700)] text-white" : "bg-white border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                    {label}
                  </button>)}
              </div>

              {
    /* Events table */
  }
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                        {["Event / Holiday Name", "Date or Date Range", "Type", "Source", "Status"].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[var(--hw-neutral-800)] uppercase tracking-wide whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                      {filteredEvents.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[13px] text-[var(--hw-neutral-700)]">No events in this period.</td></tr> : filteredEvents.map((e) => <tr
    key={e.id}
    onClick={() => setViewEventId(e.id)}
    className="hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
  >
                          <td className="px-4 py-3 font-medium text-[var(--hw-neutral-800)]">{e.name}</td>
                          <td className="px-4 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">
                            {e.from === e.to ? e.from : `${e.from} \u2013 ${e.to}`}
                          </td>
                          <td className="px-4 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">{e.type}</td>
                          <td className="px-4 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">{e.source}</td>
                          <td className={`px-4 py-3 font-medium whitespace-nowrap ${e.status === "Active" ? "text-emerald-700" : "text-[var(--hw-neutral-700)]"}`}>
                            {e.status}
                          </td>
                        </tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>)}

      </div>
    </>;
}
export {
  AdminDataSources as default
};
