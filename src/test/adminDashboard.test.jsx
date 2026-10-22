/**
 * Admin dashboard wiring test.
 *
 * Verifies that AdminDashboard fetches GET /admin/dashboard and renders the
 * KPI values from the backend `summary` object. `window.fetch` is mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../app/global/contexts/AuthContext';
import AdminDashboard from '../app/admin/pages/AdminDashboard';

const DASHBOARD = {
  summary: {
    uploaded_today: 12,
    records_ingested_today: 148,
    sources_requiring_attention: 1,
    registered_farmers: 45,
    advisories_created_today: 7,
    for_review: 3,
    failed_uploads_today: 1,
    active_crop_plans: 9,
  },
  sources_requiring_attention: [
    { id: 'src-1', source_name: 'DFTC Wholesale', source_type: 'API', ingestion_method: 'sync', reason: 'Timed out' },
  ],
  notification_bell_count: 2,
  recent_audit_logs: [
    { id: 'log-1', user_id: 'USR-1', action: 'login', details: null, ip_address: null, created_at: '2026-08-31T01:00:00Z' },
    { id: 'log-2', user_id: 'USR-2', actor_name: 'Kaye Mayugba', action: 'analytics.outputs_computed', details: null, ip_address: null, created_at: '2026-08-31T03:26:00Z' },
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

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <AdminDashboard />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

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
    expect(screen.getByText('Records Ingested Today')).toBeInTheDocument();
    expect(screen.getByText('148')).toBeInTheDocument();
    expect(screen.getAllByText('Sources Requiring Attention').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Registered Farmers')).toBeInTheDocument();
    expect(screen.queryByText('Active Crop Plans')).not.toBeInTheDocument();
    expect(screen.queryByText(/Quick Access/i)).not.toBeInTheDocument();
    expect(screen.getByText('Import & Validate')).toBeInTheDocument();
    expect(screen.getByText('Weights & Thresholds')).toBeInTheDocument();
    expect(screen.getByText('Manage Users')).toBeInTheDocument();
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    expect(screen.getAllByText('Analytics Outputs Computed').length).toBeGreaterThanOrEqual(1);
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
