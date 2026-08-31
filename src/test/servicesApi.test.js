/**
 * Tests for the admin API service layer (src/services/api/).
 *
 * Verifies that each service function issues the correct HTTP request
 * (method, URL, body) through the shared engine, and that backend errors
 * propagate as thrown errors with the backend `detail` message.
 *
 * `window.fetch` is mocked; no network calls are made.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import * as authApi from '../services/api/authApi';
import * as adminApi from '../services/api/adminApi';
import * as ingestionApi from '../services/api/ingestionApi';
import * as calendarApi from '../services/api/calendarApi';

const PREFIX = '/api/v1';

/** Capture the last fetch call and return a controllable Response-like object. */
function mockFetch(response) {
  let lastArgs = null;
  const fn = vi.fn(async (...args) => {
    lastArgs = args;
    const body = typeof response.body === 'string' ? response.body : response.body;
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => (response.body == null ? null : body),
    };
  });
  fn.lastArgs = () => lastArgs;
  return fn;
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('authApi', () => {
  it('uploadProfilePicture POSTs a multipart FormData with the file', async () => {
    const fetchFn = mockFetch({ ok: true, status: 200, body: { profile_picture_path: '/pic.png' } });
    vi.stubGlobal('fetch', fetchFn);

    const file = new File(['x'], 'me.png', { type: 'image/png' });
    const res = await authApi.uploadProfilePicture(file);

    const [url, opts] = fetchFn.lastArgs();
    expect(url).toContain(`${PREFIX}/auth/profile/picture`);
    expect(opts.method).toBe('POST');
    expect(opts.body).toBeInstanceOf(FormData);
    expect([...opts.body.entries()].find(([k]) => k === 'file')[1]).toBe(file);
    const parsed = await res.json();
    expect(parsed.profile_picture_path).toBe('/pic.png');
  });
});

describe('adminApi', () => {
  it('getDashboard GETs /admin/dashboard and returns the parsed body', async () => {
    const dashboard = { summary: { uploaded_today: 3 }, sources_requiring_attention: [], recent_audit_logs: [] };
    const fetchFn = mockFetch({ ok: true, status: 200, body: dashboard });
    vi.stubGlobal('fetch', fetchFn);

    const res = await adminApi.getDashboard();
    const [url, opts] = fetchFn.lastArgs();

    expect(url).toContain(`${PREFIX}/admin/dashboard`);
    expect(opts.method).toBe('GET');
    expect(res.summary.uploaded_today).toBe(3);
  });

  it('getDataSourceRecords appends page/page_size as query params', async () => {
    const fetchFn = mockFetch({ ok: true, status: 200, body: { items: [], total: 0, page: 2, page_size: 20 } });
    vi.stubGlobal('fetch', fetchFn);

    await adminApi.getDataSourceRecords('src-1', { page: 2, page_size: 20 });
    const [url] = fetchFn.lastArgs();

    expect(url).toContain(`${PREFIX}/admin/data-sources/src-1/records`);
    expect(url).toContain('page=2');
    expect(url).toContain('page_size=20');
  });
});

describe('ingestionApi', () => {
  it('uploadFile POSTs FormData with file/data_type/overwrite', async () => {
    const fetchFn = mockFetch({ ok: true, status: 202, body: { status: 'processing', message: 'accepted' } });
    vi.stubGlobal('fetch', fetchFn);

    const file = new File(['a,b'], 'data.csv', { type: 'text/csv' });
    const res = await ingestionApi.uploadFile(file, 'bankerohan_daily_retail', false);
    const [url, opts] = fetchFn.lastArgs();

    expect(url).toContain(`${PREFIX}/admin/ingestion/upload`);
    expect(opts.method).toBe('POST');
    expect(opts.body).toBeInstanceOf(FormData);
    const entries = Object.fromEntries(opts.body.entries());
    expect(entries.file).toBe(file);
    expect(entries.data_type).toBe('bankerohan_daily_retail');
    expect(entries.overwrite).toBe('false');
    expect(res.status).toBe('processing');
  });

  it('getHistory GETs /admin/ingestion/history', async () => {
    const fetchFn = mockFetch({ ok: true, status: 200, body: { items: [], total: 0 } });
    vi.stubGlobal('fetch', fetchFn);

    await ingestionApi.getHistory({ page: 1, page_size: 20 });
    const [url] = fetchFn.lastArgs();
    expect(url).toContain(`${PREFIX}/admin/ingestion/history`);
  });

  it('getHistoryDetail GETs /admin/ingestion/history/{id}', async () => {
    const fetchFn = mockFetch({ ok: true, status: 200, body: { id: 'H-1' } });
    vi.stubGlobal('fetch', fetchFn);

    const res = await ingestionApi.getHistoryDetail('H-1');
    const [url] = fetchFn.lastArgs();
    expect(url).toContain(`${PREFIX}/admin/ingestion/history/H-1`);
    expect(res.id).toBe('H-1');
  });
});

describe('calendarApi', () => {
  const event = { event_name: 'Araw ng Dabaw', event_type: 'Holiday', start_date: '2026-03-15', end_date: '2026-03-15' };

  it('createEvent POSTs the event JSON body', async () => {
    const fetchFn = mockFetch({ ok: true, status: 201, body: { id: 'EV-1', ...event } });
    vi.stubGlobal('fetch', fetchFn);

    const res = await calendarApi.createEvent(event);
    const [url, opts] = fetchFn.lastArgs();

    expect(url).toContain(`${PREFIX}/admin/calendar/events`);
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opts.body)).toEqual(event);
    expect(res.id).toBe('EV-1');
  });

  it('deleteEvent issues DELETE to /events/{id}', async () => {
    const fetchFn = mockFetch({ ok: true, status: 200, body: {} });
    vi.stubGlobal('fetch', fetchFn);

    await calendarApi.deleteEvent('EV-9');
    const [url, opts] = fetchFn.lastArgs();
    expect(url).toContain(`${PREFIX}/admin/calendar/events/EV-9`);
    expect(opts.method).toBe('DELETE');
  });
});

describe('error propagation', () => {
  it('throws the backend detail message on a non-2xx response', async () => {
    const fetchFn = mockFetch({ ok: false, status: 422, body: { detail: 'Weights must sum to 1.0000' } });
    vi.stubGlobal('fetch', fetchFn);

    await expect(adminApi.getDashboard()).rejects.toThrow('Weights must sum to 1.0000');
    expect(fetchFn).toHaveBeenCalled();
  });
});
