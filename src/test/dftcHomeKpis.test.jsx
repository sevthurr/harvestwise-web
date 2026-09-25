import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../app/global/contexts/AuthContext';
import DFTCHome from '../app/dftc/pages/DFTCHome';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const HOME_DATA = {
  kpis: {
    price_records_today: 15,
    arrival_records_today: 8,
    price_coverage_count: 7,
    price_coverage_total: 22,
    arrival_coverage_count: 5,
    arrival_coverage_total: 22,
    month_name: 'September',
  },
  today_status: [],
  needs_attention: [],
  recent_saved_data: [],
  price_movement: [],
};

function mockFetchByUrl(handlers) {
  return vi.fn(async (url) => {
    const handler = handlers.find((h) => url.includes(h.path));
    const resp = handler ? handler.response : { ok: true, status: 200, body: { items: [] } };
    return {
      ok: resp.ok ?? true,
      status: resp.status ?? 200,
      json: async () => resp.body,
    };
  });
}

const renderDFTCHome = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dftc']}>
        <AuthProvider>
          <DFTCHome />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  localStorage.clear();
  mockNavigate.mockClear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DFTCHome KPI Overhaul', () => {
  it('renders updated 4 KPI cards and replaces Needs Correction & Datasets Saved Today', async () => {
    const fetchFn = mockFetchByUrl([
      { path: '/dftc/home', response: { ok: true, status: 200, body: HOME_DATA } },
      { path: '/dftc/submissions', response: { ok: true, status: 200, body: { items: [] } } },
      { path: '/dftc/requirements', response: { ok: true, status: 200, body: { items: [] } } },
    ]);
    vi.stubGlobal('fetch', fetchFn);

    renderDFTCHome();

    // Wait for queries to settle and KPI values to appear
    await screen.findByText('15');
    expect(screen.getByText('Price Records Today')).toBeInTheDocument();
    expect(screen.getByText('Arrival Records Today')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();

    // Verify monthly coverage cards
    expect(screen.getByText('Price Data Coverage — September')).toBeInTheDocument();
    expect(screen.getByText('Arrival Data Coverage — September')).toBeInTheDocument();
    expect(screen.getByText('7/22')).toBeInTheDocument();
    expect(screen.getByText('5/22')).toBeInTheDocument();
    expect(screen.getAllByText('monitored commodities').length).toBe(2);

    // Verify removed cards are NOT present
    expect(screen.queryByText('Needs Correction')).toBeNull();
    expect(screen.queryByText('Datasets Saved Today')).toBeNull();
  });

  it('navigates to the corresponding page/tab when clicking KPI cards', async () => {
    const fetchFn = mockFetchByUrl([
      { path: '/dftc/home', response: { ok: true, status: 200, body: HOME_DATA } },
      { path: '/dftc/submissions', response: { ok: true, status: 200, body: { items: [] } } },
      { path: '/dftc/requirements', response: { ok: true, status: 200, body: { items: [] } } },
    ]);
    vi.stubGlobal('fetch', fetchFn);

    renderDFTCHome();

    await screen.findByText('15');

    // Click Price Records Today -> /dftc/price-input
    fireEvent.click(screen.getByText('Price Records Today').closest('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/dftc/price-input');

    // Click Arrival Records Today -> /dftc/arrival-input
    fireEvent.click(screen.getByText('Arrival Records Today').closest('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/dftc/arrival-input');

    // Click Price Data Coverage -> /dftc/trends?tab=price
    fireEvent.click(screen.getByText('Price Data Coverage — September').closest('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/dftc/trends?tab=price');

    // Click Arrival Data Coverage -> /dftc/trends?tab=arrival
    fireEvent.click(screen.getByText('Arrival Data Coverage — September').closest('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/dftc/trends?tab=arrival');
  });

  it('paginates the Latest Arrival Volume commodity list', async () => {
    const commodities = Array.from({ length: 12 }, (_, i) => ({
      commodity_id: `c${i + 1}`,
      commodity_name: `Commodity ${i + 1}`,
      volume_kg: 100 + i,
    }));
    const home = {
      ...HOME_DATA,
      latest_arrival_volume: {
        reporting_period: '2026-09-24',
        combined_volume_kg: 1266,
        provenance: [],
        commodities,
      },
    };
    const fetchFn = mockFetchByUrl([
      { path: '/dftc/home', response: { ok: true, status: 200, body: home } },
      { path: '/dftc/submissions', response: { ok: true, status: 200, body: { items: [] } } },
      { path: '/dftc/requirements', response: { ok: true, status: 200, body: { items: [] } } },
    ]);
    vi.stubGlobal('fetch', fetchFn);

    renderDFTCHome();

    // Page 1: first 6 commodities, pagination info shown
    await screen.findByText('Commodity 1');
    expect(screen.getByText('Commodity 6')).toBeInTheDocument();
    expect(screen.queryByText('Commodity 7')).toBeNull();
    expect(screen.getByText('Showing 1–6 of 12')).toBeInTheDocument();

    // Next -> page 2
    fireEvent.click(screen.getByText('Next'));
    expect(await screen.findByText('Commodity 7')).toBeInTheDocument();
    expect(screen.getByText('Commodity 12')).toBeInTheDocument();
    expect(screen.queryByText('Commodity 1')).toBeNull();
    expect(screen.getByText('Showing 7–12 of 12')).toBeInTheDocument();

    // Prev -> back to page 1
    fireEvent.click(screen.getByText('Prev'));
    expect(await screen.findByText('Commodity 1')).toBeInTheDocument();
    expect(screen.queryByText('Commodity 7')).toBeNull();
  });
});
