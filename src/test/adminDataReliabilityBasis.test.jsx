import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminAnalyticsBasis from '../app/admin/pages/AdminAnalyticsBasis';
import { analyticsApi } from '../services/api';
import { buildReliabilitySummary } from '../app/admin/utils/reliabilityExplanations';

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
          { label: 'High', min: 0.85, max: 1.0, description: 'Reliability factor of 0.85 to 1.00. Records are complete and fresh; base weight is scaled by at least 0.85.' },
          { label: 'Moderate', min: 0.65, max: 0.84, description: 'Reliability factor of 0.65 to 0.84. Usable but aging or thin; weight scaled by 0.65 to 0.84.' },
          { label: 'Limited', min: 0.4, max: 0.64, description: 'Reliability factor of 0.40 to 0.64. Indicative only; weight scaled by 0.40 to 0.64.' },
          { label: 'Low', min: 0.0, max: 0.39, description: 'Reliability factor below 0.40 (never lower than the 0.10 floor). Neutral default.' },
        ],
        reliability_rules: {
          dimension_weights: { availability: 0.4, timeliness: 0.3, validity: 0.3 },
          stale_after_days: 14,
          no_data_timeliness: 0.05,
          floor: 0.1,
          low_threshold: 0.4,
        },
        price_outlook: {
          recent_average_price: 78.5,
          lower_forecast: 76,
          forecast_midpoint: 82,
          upper_forecast: 88,
          forecast_price_change_pct: 4.46,
          reliability_factor: 0.92,
          reliability_status: 'High',
          reliability_dimensions: {
            availability: 1.0,
            timeliness: 1.0,
            validity: 1.0,
          },
          reliability_evidence: {
            unit: 'records',
            available: 14,
            required: 14,
            latest_date: '2026-09-24',
            age_days: 3,
            timeliness_basis: 'latest_record',
          },
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

  it('describes the full HSPL coverage window', () => {
    expect(buildReliabilitySummary({
      resultId: 'historical-production',
      level: 'High',
      evidence: {
        available: 42,
        first_year: 2016,
        latest_year: 2026,
        years_old: 0,
      },
    })).toMatch(/42 quarterly PSA production records are on file from 2016 through 2026/);
  });

  it('explains the classification with the factor and a templated explanation', async () => {
    renderPage();

    // Status is the label returned by the scoring layer.
    await waitFor(() => {
      expect(screen.getByText('High')).toBeDefined();
    });

    // The numeric score is surfaced as "Reliability score", not "Reliability factor".
    expect(screen.getByText('Reliability score')).toBeDefined();
    expect(screen.getByText('0.9200')).toBeDefined();

    // The card explanation is a concise 2-sentence summary quoting real values.
    expect(screen.getByText(/14 price records are on file with the latest entry 3 days old \(within the 14-day limit\)\. Sufficiency and timeliness criteria are satisfied, so the module's advisory weight is applied in full\./)).toBeDefined();
    expect(screen.queryByText('High 0.85–1.00')).toBeNull();

    // The details list has moved into the modal, so it is not directly on the card.
    expect(screen.queryByText(/Calculation:/)).toBeNull();

    // Wording uses "timeliness", not "freshness".
    expect(screen.getByText(/sufficiency and timeliness/)).toBeDefined();

    // Module warnings still render underneath.
    expect(screen.getByText('Price: latest price record is 3 days old.')).toBeDefined();
  });

  it('opens a modal table with every band, its range and explanation', async () => {
    renderPage();

    const link = await screen.findByText('View explanation');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(link);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Score Breakdown')).toBeDefined();
    expect(within(dialog).getByText(/Completeness/)).toBeDefined();
    expect(within(dialog).getByText(/14 records on file with the required fields present/)).toBeDefined();
    expect(within(dialog).getByText(/Timeliness/)).toBeDefined();
    expect(within(dialog).getByText(/within the 14-day limit, so it scores 1\.00/)).toBeDefined();
    expect(within(dialog).getByText(/Calculation:/)).toBeDefined();

    expect(within(dialog).getByText('Classification Bands')).toBeDefined();
    expect(within(dialog).getByText('0.85–1.00')).toBeDefined();
    expect(within(dialog).getByText('0.65–0.84')).toBeDefined();
    expect(within(dialog).getByText('0.40–0.64')).toBeDefined();
    expect(within(dialog).getByText('0.00–0.39')).toBeDefined();
    expect(within(dialog).getByText('Complete and fresh records; module weight applied in full (≥0.85).')).toBeDefined();
    expect(within(dialog).getByText('Insufficient records; falls back to neutral default (0.10 floor).')).toBeDefined();

    fireEvent.click(within(dialog).getByLabelText('Close'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('falls back to the built-in bands when the server sends none', async () => {
    analyticsApi.getModuleOutputDetail.mockResolvedValueOnce({
      id: 'OUT-0002',
      commodity_name: 'Ampalaya',
      generated_at: '2026-09-27T08:00:00Z',
      price_outlook: 'Favorable',
      basis_inputs: {
        price_outlook: { reliability_factor: 0.9, reliability_status: 'High' },
      },
    });

    renderPage();

    fireEvent.click(await screen.findByText('View explanation'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('0.85–1.00')).toBeDefined();
    expect(within(dialog).getByText('Complete and fresh records; module weight applied in full (≥0.85).')).toBeDefined();
  });
});
