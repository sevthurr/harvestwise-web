import { PageHeader } from "../../global/components/shared/PageHeader";
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  RotateCcw,
  X,
  Pencil,
  Trash2,
  List
} from "lucide-react";
import { calendarApi, adminApi, ingestionApi } from "../../../services/api";

function fmtISO(dateStr) {
  return dateStr ? new Date(dateStr).toISOString().slice(0, 10) : "";
}

function toApiEvent(form) {
  return {
    event_name: form.name,
    event_type: form.type,
    start_date: form.from,
    end_date: form.to || form.from,
    recurrence: form.recurrence === "None" ? null : form.recurrence,
    description: form.description || null,
    status: form.status.toLowerCase()
  };
}

function mapEvent(ev) {
  return {
    id: ev.id,
    name: ev.event_name || "Untitled",
    type: ev.event_type || "Others",
    date: new Date(ev.start_date),
    from: fmtDate(ev.start_date),
    to: ev.end_date ? fmtDate(ev.end_date) : fmtDate(ev.start_date),
    source: "Manual Entry",
    recurrence: ev.recurrence || "None",
    description: ev.description || undefined,
    status: ev.status === "active" ? "Active" : "Inactive",
    lastUpdated: ev.updated_at ? fmtDate(ev.updated_at) : fmtDate(ev.created_at)
  };
}

const STATUS_TEXT = {
  Updated: "text-emerald-700",
  "Requires Review": "text-amber-700",
  Failed: "text-red-600",
  "Not yet updated": "text-[var(--hw-neutral-500)]",
  "Not yet synced": "text-[var(--hw-neutral-500)]"
};
const BASE_EVENTS = [];
const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TODAY_DATE = new Date();
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
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
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

  const [dataSources, setDataSources] = useState([]);
  const [apiSyncSources, setApiSyncSources] = useState([]);
  const [dataSourcesLoading, setDataSourcesLoading] = useState(false);
  const [apiSyncLoading, setApiSyncLoading] = useState(false);
  const [dataSourcesError, setDataSourcesError] = useState(null);
  const [apiSyncError, setApiSyncError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncError("");
    try {
      await ingestionApi.syncNow();
    } catch (err) {
      setSyncError(err.message || "Failed to start sync.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await calendarApi.listEvents();
        if (!active) return;
        setEvents((data?.items || []).map(mapEvent));
      } catch (err) {
        if (active) setEvents([]);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setDataSourcesLoading(true);
    setDataSourcesError(null);
    (async () => {
      try {
        const res = await adminApi.listDataSources();
        if (!active) return;
        setDataSources(res?.items || []);
      } catch (err) {
        if (active) {
          setDataSourcesError(err.message || "Failed to load data sources.");
          setDataSources([]);
        }
      } finally {
        if (active) setDataSourcesLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setApiSyncLoading(true);
    setApiSyncError(null);
    (async () => {
      try {
        const res = await adminApi.listApiSyncSources();
        if (!active) return;
        setApiSyncSources(res?.items || []);
      } catch (err) {
        if (active) {
          setApiSyncError(err.message || "Failed to load API sync sources.");
          setApiSyncSources([]);
        }
      } finally {
        if (active) setApiSyncLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const syncHasFailed = apiSyncSources.some((s) => s.status === "Failed");
  const syncSummary = syncHasFailed ? `${apiSyncSources.filter((s) => s.status === "Failed").length} source failed \u2014 retry recommended` : apiSyncSources.length > 0 ? "All sources updated" : "";
  const syncSummaryColor = syncHasFailed ? "text-red-600" : "text-emerald-700";

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
  const renderEventFormFields = (form, setForm, error) => <div className="px-5 py-4 space-y-3">
      <div>
        <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Event name *</label>
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
          <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">From *</label>
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
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      <div>
        <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Recurrence</label>
        <select value={form.recurrence} onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))} className={inputCls}>
          <option value="None">None</option>
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
  const [formError, setFormError] = useState("");
  const renderAddModal = () => <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={() => {
    setShowAddModal(false);
    setAddForm(EMPTY_FORM);
    setFormError("");
  }} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-100)]">
          <p className="font-semibold text-[var(--hw-neutral-800)]">Add Calendar Event</p>
          <button
    onClick={() => {
      setShowAddModal(false);
      setAddForm(EMPTY_FORM);
      setFormError("");
    }}
    className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors"
  >
            <X className="w-4 h-4" />
          </button>
        </div>
        {renderEventFormFields(addForm, setAddForm, formError)}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--hw-neutral-100)]">
          <button onClick={() => {
    setShowAddModal(false);
    setAddForm(EMPTY_FORM);
    setFormError("");
  }} className={btnSecondary}>Cancel</button>
          <button onClick={async () => {
    if (!addForm.name.trim() || !addForm.from) {
      setFormError("Event name and 'From' date are required.");
      return;
    }
    if (addForm.to && addForm.from && addForm.to < addForm.from) {
      setFormError("'To' date cannot be earlier than 'From' date.");
      return;
    }
    try {
      const created = await calendarApi.createEvent(toApiEvent(addForm));
      setEvents((prev) => [...prev, mapEvent(created)]);
      setShowAddModal(false);
      setAddForm(EMPTY_FORM);
      setFormError("");
    } catch (err) {
      setFormError(err.message || "Failed to create event.");
    }
  }} className={btnPrimary}>Save Event</button>
        </div>
      </div>
    </div>;
  const renderEditModal = () => {
    if (!editEventId) return null;
    return <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30" onClick={() => {
          setEditEventId(null);
          setFormError("");
        }} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-100)]">
            <p className="font-semibold text-[var(--hw-neutral-800)]">Edit Calendar Event</p>
            <button
      onClick={() => {
        setEditEventId(null);
        setFormError("");
      }}
      className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors"
    >
              <X className="w-4 h-4" />
            </button>
          </div>
          {renderEventFormFields(editForm, setEditForm, formError)}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--hw-neutral-100)]">
            <button onClick={() => {
              setEditEventId(null);
              setFormError("");
            }} className={btnSecondary}>Cancel</button>
            <button onClick={async () => {
      if (!editForm.name.trim() || !editForm.from) {
        setFormError("Event name and 'From' date are required.");
        return;
      }
      if (editForm.to && editForm.from && editForm.to < editForm.from) {
        setFormError("'To' date cannot be earlier than 'From' date.");
        return;
      }
      try {
        const updated = await calendarApi.updateEvent(editEventId, toApiEvent(editForm));
        setEvents((prev) => prev.map((e) => e.id !== editEventId ? e : mapEvent(updated)));
        setEditEventId(null);
        setFormError("");
      } catch (err) {
        setFormError(err.message || "Failed to update event.");
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
            <button onClick={async () => {
      const id = deleteEventId;
      try {
        await calendarApi.deleteEvent(id);
        setEvents((prev) => prev.filter((e) => e.id !== id));
      } catch (err) {
        // Keep the modal open context; deletion failure leaves event in place.
      }
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
      const isToday = calYear === new Date().getFullYear() && calMonth === new Date().getMonth() && day === new Date().getDate();
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
  const renderConfiguredEventsPage = () => <div className="space-y-6">
      {/* Back */}
      <div>
        <button
          onClick={() => setShowConfiguredEvents(false)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] hover:text-black transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />Back to Calendar &amp; Events
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-[18px] font-bold text-[var(--hw-neutral-900)]">Configured Events</h2>
          <p className="text-[13px] text-[var(--hw-neutral-600)] mt-0.5">
            Manage custom holidays and special market events for the platform.
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
  return <>
      {
    /* Modals */
  }
      {showAddModal && renderAddModal()}
      {editEventId && renderEditModal()}
      {deleteEventId && renderDeleteConfirmModal()}
      {viewEventId && renderViewEventModal()}

      <div className="px-4 md:px-8 lg:px-10 py-5 max-w-[1440px] mx-auto space-y-5">

        {/* Header */}
        <PageHeader
          title="Data"
          description="Manage data sources, API sync, and calendar events."
        />

        {/* Tabs */}
        {<div className="flex border-b border-[var(--hw-neutral-200)]">
            {[["sources", "Data Sources"], ["api-sync", "API Sync"], ["calendar", "Calendar & Events"]].map(([id, label]) => <button key={id} onClick={() => {
    setTab(id);
    setShowConfiguredEvents(false);
  }} className={tabCls(id)}>{label}</button>)}
          </div>}

        {/* ══ TAB: DATA SOURCES ══ */}
        {tab === "sources" && <div className="space-y-3">
            <div className="flex items-center justify-end">
              <button onClick={() => navigate("/admin/import")} className={btnPrimary}>
                <FileText className="w-4 h-4" />Import Data
              </button>
            </div>
            {dataSourcesLoading ? (
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-12 text-center">
                <div className="w-5 h-5 border-2 border-[var(--hw-green-600)] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[13px] text-[var(--hw-neutral-500)] mt-3">Loading data sources...</p>
              </div>
            ) : dataSourcesError ? (
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-12 text-center">
                <p className="text-[13px] text-red-600">{dataSourcesError}</p>
              </div>
            ) : (
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                      {["Source", "Type", "Last Update", "Records Imported", "Status"].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[var(--hw-neutral-800)] uppercase tracking-wide whitespace-nowrap">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                    {dataSources.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[13px] text-[var(--hw-neutral-500)]">
                          No data sources configured.
                        </td>
                      </tr>
                    ) : (
                      dataSources.map((s) => <tr
                        key={s.id}
                        onClick={() => navigate(`/admin/data-sources/${s.id}`)}
                        className="hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--hw-neutral-800)]">{s.name}</p>
                        </td>
                        <td className="px-4 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">{s.type}</td>
                        <td className="px-4 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">{s.lastUpdate ? fmtDate(s.lastUpdate) : "-"}</td>
                        <td className="px-4 py-3 text-[var(--hw-neutral-700)] font-medium">
                          {s.records != null ? s.records.toLocaleString() : "-"}
                        </td>
                        <td className={`px-4 py-3 font-medium whitespace-nowrap ${STATUS_TEXT[s.status] || "text-[var(--hw-neutral-600)]"}`}>{s.status}</td>
                      </tr>)
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>}

        {/* ══ TAB: API SYNC ══ */}
        {tab === "api-sync" && <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-end gap-2 flex-shrink-0">
              <button className={btnPrimary} onClick={handleSyncAll} disabled={syncing || apiSyncSources.length === 0}>
                {syncing ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Syncing...
                  </span>
                ) : syncHasFailed ? <><RotateCcw className="w-4 h-4" />Retry Failed Syncs</> : <><RefreshCw className="w-4 h-4" />Sync Now</>}
              </button>
              <button onClick={() => navigate("/admin/history")} className={btnSecondary}>
                View Sync History
              </button>
            </div>

            {syncError && <p className="text-[13px] text-red-600">{syncError}</p>}

            {apiSyncLoading ? (
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-12 text-center">
                <div className="w-5 h-5 border-2 border-[var(--hw-green-600)] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[13px] text-[var(--hw-neutral-500)] mt-3">Loading sync sources...</p>
              </div>
            ) : apiSyncError ? (
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-12 text-center">
                <p className="text-[13px] text-red-600">{apiSyncError}</p>
              </div>
            ) : (
            <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden divide-y divide-[var(--hw-neutral-100)]">
              {apiSyncSources.length === 0 ? (
                <div className="px-5 py-12 text-center text-[13px] text-[var(--hw-neutral-500)]">
                  No API sources configured.
                </div>
              ) : (
                apiSyncSources.map((s) => <div
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
                      { label: "Last sync", value: s.lastSync ? fmtDate(s.lastSync) : "-" },
                      { label: "Next scheduled", value: s.nextSync || "-" },
                      { label: "Records fetched", value: s.recordsFetched != null ? s.recordsFetched.toLocaleString() : "0" },
                      { label: "Records accepted", value: s.recordsAccepted != null ? s.recordsAccepted.toLocaleString() : "0" }
                    ].map((f) => <div key={f.label}>
                        <p className="text-[12px] text-[var(--hw-neutral-700)]">{f.label}</p>
                        <p className="text-[13px] font-medium text-[var(--hw-neutral-700)] mt-0.5">{f.value}</p>
                      </div>)}
                  </div>
                  {s.issue && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                      {s.issue}
                    </p>}
                </div>)
              )}
            </div>
            )}
          </div>}

        {/* ══ TAB: CALENDAR & EVENTS ══ */}
        {tab === "calendar" && (showConfiguredEvents ? renderConfiguredEventsPage() : <div className="space-y-5">
              {/* Top row */}
              <div className="flex items-center justify-end gap-2 flex-shrink-0">
                <button onClick={() => setShowConfiguredEvents(true)} className={btnSecondary}>
                  <List className="w-4 h-4" />View Configured Events
                </button>
                <button onClick={() => setShowAddModal(true)} className={btnPrimary}>
                  <Plus className="w-4 h-4" />Add Calendar Event
                </button>
              </div>

              {/* Calendar widget — full width */}
              {renderCalendarWidget()}

              {/* Filter */}
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

              {/* Events table */}
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                        {["Event / Holiday Name", "Date or Date Range", "Type", "Source", "Status"].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[var(--hw-neutral-800)] uppercase tracking-wide whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                      {filteredEvents.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[13px] text-[var(--hw-neutral-500)]">No events found for this period.</td></tr> : filteredEvents.map((e) => <tr
    key={e.id}
    onClick={() => setViewEventId(e.id)}
    className="hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
  >
                          <td className="px-4 py-3 font-medium text-[var(--hw-neutral-800)]">{e.name}</td>
                          <td className="px-4 py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">
                            {e.from === e.to || !e.to ? e.from : `${e.from} \u2013 ${e.to}`}
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
