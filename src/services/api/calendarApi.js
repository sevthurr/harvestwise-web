import { apiGet, apiPost, apiPut, apiFetch, parseResponse } from "../../app/global/api";

export async function listEvents(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return parseResponse(await apiGet(`/admin/calendar/events${qs ? `?${qs}` : ""}`));
}

export async function getEvent(eventId) {
  return parseResponse(await apiGet(`/admin/calendar/events/${eventId}`));
}

export async function createEvent(payload) {
  return parseResponse(await apiPost("/admin/calendar/events", payload));
}

export async function updateEvent(eventId, payload) {
  return parseResponse(await apiPut(`/admin/calendar/events/${eventId}`, payload));
}

export async function deleteEvent(eventId) {
  return parseResponse(
    await apiFetch(`/admin/calendar/events/${eventId}`, { method: "DELETE" })
  );
}
