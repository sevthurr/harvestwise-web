import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminAnalyticsBasis from '../app/admin/pages/AdminAnalyticsBasis';

// The reliability layer owns the factor and the band cutoffs; the page must
// render them as-is. Values are inlined in the mock factory because vi.mock
// is hoisted above module-level consts.
vi.mock('../services/api', () => ({
  analyticsApi: {
    getModuleOutputDetail: vi.fn().mockResolvedValue({
      id: 'OUT-0001',
      commodity_id: 'COM-0001',
      commodity_name: 'Ampalaya',
      variety: null,
      generated_at: '2026-09-27T08:00:00Z',
      price_outlook: 'Favorable',
      basis_inputs: {
        reliability_bands: [
          { label: 'High', min: 0.85, max: 1.0 },
          { label: 'Moderate', min: 0.65, max: 0.84 },
          { label: 'Limited', min: 0.4, max: 0.64 },
          { label: 'Low', min: 0.0, max: 0.39 },
        ],
        price_outlook: {
          recent_average_price: 78.5,
          lower_forecast: 76,
          forecast_midpoint: 82,
          upper_forecast: 88,
          forecast_price_change_pct: 4.46,
          reliability_factor: 0.92,
          reliability_status: 'High',
        },
        warnings: ['Price: latest price record is 3 days old.'],
      },
    }),
    listCommodities: vi.fn().mockResolvedValue({
      items: [{ id: 'COM-0001', name: 'Ampalaya', is_top10: true, is_active: true }],
    }),
    listWeatherRules: vi.fn().mockResolvedValue({ items: [] }),
    listThresholds: vi.fn().mockResolvedValue({ items: [] }),
    listThresholdRules: vi.fn().mockResolvedValue({ items: [] }),
    getHistoricalSeasonalProduction: vi.fn().mockResolvedValue({}),
    getPriceOutlook: vi.fn().mockResolvedValue({}),
    getArrivalPressure: vi.fn().mockResolvedValue({}),
    getWeatherForecast: vi.fn().mockResolvedValue({ status: 'ok', days: [] }),
  },
}));

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/modules/basis/price-outlook?commodity=Ampalaya&variety=All%20Varieties&output=OUT-0001']}>
        <Routes>
          <Route path="/admin/modules/basis/:resultId" element={<AdminAnalyticsBasis />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AdminAnalyticsBasis Data Reliability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The price-outlook page mounts a recharts ResponsiveContainer.
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it('explains the classification with the factor and the band legend from the API', async () => {
    renderPage();

    // Status badge is the label returned by the scoring layer.
    await waitFor(() => {
      expect(screen.getByText('High')).toBeDefined();
    });

    // The numeric factor is surfaced, not just the band label.
    expect(screen.getByText('Reliability factor')).toBeDefined();
    expect(screen.getByText('0.9200')).toBeDefined();

    // Band legend is rendered from the API payload, with the server's ranges.
    expect(screen.getByText('Classification bands')).toBeDefined();
    expect(screen.getByText('High 0.85–1.00')).toBeDefined();
    expect(screen.getByText('Moderate 0.65–0.84')).toBeDefined();
    expect(screen.getByText('Limited 0.40–0.64')).toBeDefined();
    expect(screen.getByText('Low 0.00–0.39')).toBeDefined();

    // Module warnings still render underneath.
    expect(screen.getByText('Price: latest price record is 3 days old.')).toBeDefined();
  });
});
