/**
 * Admin dashboard wiring test.
 *
 * Verifies that AdminDashboard fetches GET /admin/dashboard and renders the
 * KPI values from the backend `summary` object. `window.fetch` is mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '../app/global/contexts/AuthContext';
import AdminDashboard from '../app/admin/pages/AdminDashboard';

const DASHBOARD = {
  summary: {
    uploaded_today: 12,
    advisories_created_today: 7,
    for_review: 3,
    failed_uploads_today: 1,
  },
  sources_requiring_attention: [
    { id: 'src-1', source_name: 'DFTC Wholesale', source_type: 'API', ingestion_method: 'sync', reason: 'Timed out' },
  ],
  notification_bell_count: 2,
  recent_audit_logs: [
    { id: 'log-1', user_id: 'USR-1', action: 'login', details: null, ip_address: null, created_at: '2026-08-31T01:00:00Z' },
  ],
};

function mockFetchByUrl(handlers) {
  return vi.fn(async (url, options = {}) => {
    const handler = handlers.find((h) => url.includes(h.path));
    const resp = handler ? handler.response : { ok: false, status: 401, body: { detail: 'Not authenticated' } };
    return {
      ok: resp.ok ?? true,
      status: resp.status ?? 200,
      json: async () => resp.body,
    };
  });
}

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <AuthProvider>
        <AdminDashboard />
      </AuthProvider>
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AdminDashboard', () => {
  it('fetches the dashboard and renders the KPI values', async () => {
    const fetchFn = mockFetchByUrl([{ path: '/admin/dashboard', response: { ok: true, status: 200, body: DASHBOARD } }]);
    vi.stubGlobal('fetch', fetchFn);

    renderDashboard();

    await waitFor(() => expect(screen.getByText('12')).toBeInTheDocument());
    expect(screen.getByText('Uploaded Today')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
  });

  it('renders sources requiring attention from the dashboard payload', async () => {
    const fetchFn = mockFetchByUrl([{ path: '/admin/dashboard', response: { ok: true, status: 200, body: DASHBOARD } }]);
    vi.stubGlobal('fetch', fetchFn);

    renderDashboard();

    await waitFor(() => expect(screen.getByText('DFTC Wholesale')).toBeInTheDocument());
    expect(screen.getByText('Timed out')).toBeInTheDocument();
  });

  it('shows an inline error when the dashboard request fails', async () => {
    const fetchFn = mockFetchByUrl([
      { path: '/admin/dashboard', response: { ok: false, status: 500, body: { detail: 'boom' } } },
    ]);
    vi.stubGlobal('fetch', fetchFn);

    renderDashboard();

    await waitFor(() => expect(screen.getByText(/Unable to load dashboard data/)).toBeInTheDocument());
  });
});
