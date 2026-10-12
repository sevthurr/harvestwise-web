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
    price_volatility_alerts_count: 2,
    oversupply_commodities_count: 3,
    top_volatile_commodity: 'Carrots',
    top_oversupply_commodity: 'Kalabasa',
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
  it('renders updated 4 KPI cards with Price Volatility Alerts and Oversupply Commodities', async () => {
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

    // Verify Price Volatility Alerts and Oversupply Commodities cards
    expect(screen.getByText('Price Volatility Alerts')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('2 commodities with >10% shift')).toBeInTheDocument();

    expect(screen.getByText('Oversupply Commodities')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('3 in high arrival pressure (≥Q3)')).toBeInTheDocument();

    // Verify removed cards are NOT present
    expect(screen.queryByText(/Price Data Coverage/i)).toBeNull();
    expect(screen.queryByText(/Arrival Data Coverage/i)).toBeNull();
    expect(screen.queryByText('Needs Correction')).toBeNull();
    expect(screen.queryByText('Datasets Saved Today')).toBeNull();
  });

  it('navigates to the corresponding page/tab when clicking KPI cards', async () => {
    const submissions = [
      { id: 'SUB-PRICE-1', data_type: 'daily_price', status: 'Saved' },
      { id: 'SUB-ARR-1', data_type: 'arrival_volume', status: 'Saved' },
    ];
    const fetchFn = mockFetchByUrl([
      { path: '/dftc/home', response: { ok: true, status: 200, body: HOME_DATA } },
      { path: '/dftc/submissions', response: { ok: true, status: 200, body: { items: submissions } } },
      { path: '/dftc/requirements', response: { ok: true, status: 200, body: { items: [] } } },
    ]);
    vi.stubGlobal('fetch', fetchFn);

    renderDFTCHome();

    await screen.findByText('15');

    // Click Price Records Today -> opens details page /dftc/submissions/SUB-PRICE-1
    fireEvent.click(screen.getByText('Price Records Today').closest('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/dftc/submissions/SUB-PRICE-1');

    // Click Arrival Records Today -> opens details page /dftc/submissions/SUB-ARR-1
    fireEvent.click(screen.getByText('Arrival Records Today').closest('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/dftc/submissions/SUB-ARR-1');

    // Click Price Volatility Alerts (count=2 >= 2) -> /dftc/trends?tab=price&alert=volatility
    fireEvent.click(screen.getByText('Price Volatility Alerts').closest('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/dftc/trends?tab=price&alert=volatility');

    // Click Oversupply Commodities (count=3 >= 2) -> /dftc/trends?tab=arrival&alert=oversupply
    fireEvent.click(screen.getByText('Oversupply Commodities').closest('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/dftc/trends?tab=arrival&alert=oversupply');
  });

  it('navigates correctly for count 0 and count 1 alert states', async () => {
    const singleData = {
      ...HOME_DATA,
      kpis: {
        ...HOME_DATA.kpis,
        price_volatility_alerts_count: 1,
        oversupply_commodities_count: 0,
        top_volatile_commodity: 'Carrots',
      },
    };
    const fetchFn = mockFetchByUrl([
      { path: '/dftc/home', response: { ok: true, status: 200, body: singleData } },
      { path: '/dftc/submissions', response: { ok: true, status: 200, body: { items: [] } } },
      { path: '/dftc/requirements', response: { ok: true, status: 200, body: { items: [] } } },
    ]);
    vi.stubGlobal('fetch', fetchFn);

    renderDFTCHome();

    await screen.findByText('15');

    // Click Price Volatility Alerts (count=1) -> filtered directly to commodity, no modal
    fireEvent.click(screen.getByText('Price Volatility Alerts').closest('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/dftc/trends?tab=price&commodity=Carrots');

    // Click Oversupply Commodities (count=0) -> normal redirect to tab, no modal
    fireEvent.click(screen.getByText('Oversupply Commodities').closest('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/dftc/trends?tab=arrival');
  });

  it('renders the Latest Arrival Volume list without overall kg or direction indicators', async () => {
    const commodities = Array.from({ length: 6 }, (_, i) => ({
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

    // Verify commodity items render with volume
    await screen.findByText('Commodity 1');
    expect(screen.getByText('100 kg')).toBeInTheDocument();
    expect(screen.getByText('Commodity 6')).toBeInTheDocument();
    expect(screen.getByText('105 kg')).toBeInTheDocument();

    // Verify overall kg is removed
    expect(screen.queryByText('1,266 kg')).toBeNull();
    expect(screen.queryByText('1266 kg')).toBeNull();

    // Verify no direction indicator arrows (↑ or ↓) in arrival volume card
    const arrivalCard = screen.getByText('Latest Arrival Volume').closest('div.bg-white');
    expect(arrivalCard.textContent).not.toContain('↑');
    expect(arrivalCard.textContent).not.toContain('↓');

    // Click View Arrival Volume Trends
    fireEvent.click(screen.getByText('View Arrival Volume Trends'));
    expect(mockNavigate).toHaveBeenCalledWith('/dftc/trends?tab=arrival');
  });

  it('filters Recent Saved Data to only the last 7 days and displays indicator', async () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

    const submissions = [
      {
        id: 'SUB-001',
        data_type: 'daily_price',
        price_type: 'Retail',
        source_name: 'Bangkerohan',
        status: 'Saved',
        saved_at: threeDaysAgo,
      },
      {
        id: 'SUB-002',
        data_type: 'daily_price',
        price_type: 'Retail',
        source_name: 'Bangkerohan',
        status: 'Saved',
        saved_at: tenDaysAgo,
      },
    ];

    const fetchFn = mockFetchByUrl([
      { path: '/dftc/home', response: { ok: true, status: 200, body: HOME_DATA } },
      { path: '/dftc/submissions', response: { ok: true, status: 200, body: { items: submissions } } },
      { path: '/dftc/requirements', response: { ok: true, status: 200, body: { items: [] } } },
    ]);
    vi.stubGlobal('fetch', fetchFn);

    renderDFTCHome();

    // Indicates last 7 days in the subtext without redundant badge
    expect(await screen.findByText('Datasets saved and validated in the last 7 days')).toBeInTheDocument();
    expect(screen.queryByText('Last 7 Days')).toBeNull();
    // SUB-001 (3 days ago) is shown
    expect(await screen.findByText('SUB-001')).toBeInTheDocument();
    // SUB-002 (10 days ago) is filtered out
    expect(screen.queryByText('SUB-002')).toBeNull();
  });

  it('renders Today badge on Recent Saved Data entered today', async () => {
    const todayISO = new Date().toISOString();
    const submissions = [
      {
        id: 'SUB-TODAY',
        data_type: 'daily_price',
        price_type: 'Retail',
        source_name: 'Bangkerohan',
        status: 'Saved',
        saved_at: todayISO,
      },
    ];

    const fetchFn = mockFetchByUrl([
      { path: '/dftc/home', response: { ok: true, status: 200, body: HOME_DATA } },
      { path: '/dftc/submissions', response: { ok: true, status: 200, body: { items: submissions } } },
      { path: '/dftc/requirements', response: { ok: true, status: 200, body: { items: [] } } },
    ]);
    vi.stubGlobal('fetch', fetchFn);

    renderDFTCHome();

    expect(await screen.findByText('SUB-TODAY')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders larger commodity icons (w-8 h-8) and uses Leaf icon for non-analytics-supported commodities', async () => {
    const homeWithMixed = {
      ...HOME_DATA,
      price_movement: [
        {
          commodity_id: 'COM-AMP',
          crop_name: 'Ampalaya',
          variety: 'Galaxy',
          unit: 'kg',
          current_price: 90,
          change_pct: 0,
          direction: 'flat',
          market: 'Bangkerohan',
          price_type: 'Retail',
        },
      ],
      latest_arrival_volume: {
        reporting_period: '2026-10-12',
        commodities: [
          { commodity_id: 'COM-KAL', commodity_name: 'Kalabasa', volume_kg: 4001 },
          { commodity_id: 'COM-OTHER', commodity_name: 'Kamote', volume_kg: 2446 },
        ],
      },
    };

    const fetchFn = mockFetchByUrl([
      { path: '/dftc/home', response: { ok: true, status: 200, body: homeWithMixed } },
      { path: '/dftc/submissions', response: { ok: true, status: 200, body: { items: [] } } },
      { path: '/dftc/requirements', response: { ok: true, status: 200, body: { items: [] } } },
    ]);
    vi.stubGlobal('fetch', fetchFn);

    renderDFTCHome();

    await screen.findByText('Ampalaya · Galaxy');
    expect(screen.getByText('Kalabasa')).toBeInTheDocument();
    expect(screen.getByText('Kamote')).toBeInTheDocument();

    // Check that icons have w-8 h-8
    const priceMovementCard = screen.getByText('Price Movement').closest('div.bg-white');
    const priceSvg = priceMovementCard.querySelector('svg.w-8.h-8');
    expect(priceSvg).toBeInTheDocument();

    const arrivalCard = screen.getByText('Latest Arrival Volume').closest('div.bg-white');
    const arrivalSvgs = arrivalCard.querySelectorAll('svg.w-8.h-8');
    expect(arrivalSvgs.length).toBe(2);

    // Kamote (non-analytics supported) renders the lucide-leaf SVG
    const kamoteBtn = screen.getByText('Kamote').closest('button');
    const kamoteSvg = kamoteBtn.querySelector('svg.lucide-leaf');
    expect(kamoteSvg).toBeInTheDocument();
  });
});

