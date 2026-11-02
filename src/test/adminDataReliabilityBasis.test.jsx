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
          { label: 'Moderate', min: 0.40, max: 0.84, description: 'Reliability factor of 0.40 to 0.84. Usable but aging or partial records; module weight scaled down.' },
          { label: 'Low', min: 0.0, max: 0.39, description: 'Reliability factor below 0.40 (never lower than the 0.10 floor). Neutral default.' },
        ],
        reliability_rules: {
          dimension_weights: { availability: 0.5, timeliness: 0.5 },
          stale_after_days: 14,
          no_data_timeliness: 0.05,
          floor: 0.1,
          low_threshold: 0.4,
          high_threshold: 0.85,
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
    })).toMatch(/42 usable quarterly production observations are available/);
  });

  it('explains the classification with the factor and a templated explanation', async () => {
    renderPage();

    // Status is the label returned by the scoring layer.
    await waitFor(() => {
      expect(screen.getByText('High')).toBeDefined();
    });

    // The numeric score is surfaced as "Reliability score", not "Reliability factor".
    expect(screen.getByText('Reliability score')).toBeDefined();
    expect(screen.getByText('0.92')).toBeDefined();

    // The card explanation is a concise 2-sentence summary quoting real values.
    expect(screen.getByText(/14 price records are on file\. Latest price: September 24, 2026\. Within freshness requirements\. Sufficiency and timeliness criteria are satisfied; the reliability factor is 1\.00\./)).toBeDefined();
    expect(screen.queryByText(/14-day limit/)).toBeNull();
    expect(screen.queryByText(/weekday|weekend/i)).toBeNull();
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
    expect(within(dialog).getAllByText(/Availability/).length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/14 of 14 required distinct records/)).toBeDefined();
    expect(within(dialog).getAllByText(/Timeliness/).length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/0–2 missed days bracket/)).toBeDefined();
    expect(within(dialog).queryByText(/14-day limit/)).toBeNull();
    expect(within(dialog).getByText(/Calculation:/)).toBeDefined();

    expect(within(dialog).getByText('Classification Bands')).toBeDefined();
    expect(within(dialog).getByText('0.85–1.00')).toBeDefined();
    expect(within(dialog).getByText('0.40–0.84')).toBeDefined();
    expect(within(dialog).getByText('0.00–0.39')).toBeDefined();
    expect(within(dialog).getByText('Data meets the High reliability criteria.')).toBeDefined();
    expect(within(dialog).getByText('Major data limitations affect reliability.')).toBeDefined();

    fireEvent.click(within(dialog).getByLabelText('Close'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders two Scoring Rules accordions (Availability 50% and Timeliness 50%) without Validity', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('View explanation'));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('Scoring Rules')).toBeDefined();
    const avail = within(dialog).getByRole('button', { name: /Availability \(50%\)/ });
    const time = within(dialog).getByRole('button', { name: /Timeliness \(50%\)/ });
    expect(within(dialog).queryByRole('button', { name: /Validity/ })).toBeNull();
    [avail, time].forEach((b) => expect(b.getAttribute('aria-expanded')).toBe('false'));

    fireEvent.click(time);
    expect(time.getAttribute('aria-expanded')).toBe('true');
    expect(avail.getAttribute('aria-expanded')).toBe('false');
    expect(within(dialog).getByText(/Scoring rules metadata unavailable/)).toBeDefined();
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
    expect(within(dialog).getByText('Data meets the High reliability criteria.')).toBeDefined();
  });

  it('renders Threshold Applied and Result Explanation cards without any redundant bottom warning banner', async () => {
    analyticsApi.getModuleOutputDetail.mockResolvedValueOnce({
      id: 'OUT-0003',
      commodity_name: 'Ampalaya',
      generated_at: '2026-09-27T08:00:00Z',
      price_outlook: 'Favorable',
      explanation: 'Price outlook shows favorable conditions based on 14 recent price records.',
      basis_inputs: {
        thresholds: [
          { classification: 'Favorable', rule: 'Forecast price change > 2%' },
        ],
        price_outlook: { reliability_factor: 0.9, reliability_status: 'High' },
      },
    });

    renderPage();

    // Verify Threshold Applied and Result Explanation cards are present
    expect(await screen.findByText('Threshold Applied')).toBeDefined();
    expect(screen.getByText('Result Explanation')).toBeDefined();
    expect(screen.getByText('Price Outlook could not be calculated for this forecast.')).toBeDefined();

    // Verify no redundant bottom warning banner is rendered
    expect(screen.queryByText(/basisMissing/i)).toBeNull();
  });

  it('renders Scoring Rules tables for both Availability (50%) and Timeliness (50%) with active bracket highlighting and plain-English explanation', async () => {
    analyticsApi.getModuleOutputDetail.mockResolvedValueOnce({
      id: 'OUT-0004',
      commodity_name: 'Ampalaya',
      generated_at: '2026-09-27T08:00:00Z',
      price_outlook: 'Favorable',
      basis_inputs: {
        reliability_rules: {
          dimension_weights: { availability: 0.5, timeliness: 0.5 },
          module_policies: {
            'price-outlook': {
              availability: {
                rule_type: 'ratio',
                formula: 'observed reporting days ÷ 14 expected reporting days',
                unit: 'reporting days',
                description: 'Evaluates observed Monday-Friday reporting days against expected reporting days.',
                brackets: [
                  { condition: '14 of 14 expected reporting days (full coverage)', score: 1.0, min: 14, max: 14, explanation: 'All 14 expected Monday–Friday reporting days have usable price observations.' },
                  { condition: '1–13 of 14 expected reporting days (partial coverage)', score: 'available ÷ 14', min: 1, max: 13, explanation: 'Proportional score based on the number of observed reporting days out of 14.' },
                  { condition: '0 of 14 expected reporting days (no usable data)', score: 0.0, min: 0, max: 0, explanation: 'No usable price observations in the 14-day window.', safeguard: 'Critical failure cap applies (final factor ≤ 0.39, Low)' },
                ],
              },
              timeliness: {
                rule_type: 'brackets',
                unit: 'missed reporting days',
                brackets: [
                  { condition: '0–2 missed days', score: 1.0, min: 0, max: 2, explanation: 'Within the 2-day allowance for routine market reporting.' },
                  { condition: '3–4 missed days', score: 0.75, min: 3, max: 4, explanation: 'Slightly delayed beyond the 2-day allowance.' },
                ],
              },
            },
          },
        },
        price_outlook: {
          reliability_factor: 1.0,
          reliability_status: 'High',
          reliability_dimensions: { availability: 1.0, timeliness: 1.0 },
          reliability_evidence: { available: 14, required: 14, unit: 'reporting days', missed_reporting_days: 0 },
        },
      },
    });

    renderPage();
    fireEvent.click(await screen.findByText('View explanation'));
    const dialog = await screen.findByRole('dialog');

    // Expand Availability accordion (50%)
    const availBtn = within(dialog).getByRole('button', { name: /Availability \(50%\)/ });
    fireEvent.click(availBtn);

    // Verify Scoring Rules table and evidence summary are rendered for Availability
    expect(within(dialog).getByText('14 of 14 expected reporting days have usable price observations. Availability: 1.00.')).toBeDefined();
    expect(within(dialog).getByText('Condition / Evidence Range')).toBeDefined();
    expect(within(dialog).getByText('14 observed reporting days (Full coverage)')).toBeDefined();
    // Availability explanatory subtexts should not be rendered
    expect(within(dialog).queryByText('All 14 expected Monday–Friday reporting days have usable price observations.')).toBeNull();

    // Expand Timeliness accordion (50%)
    const timeBtn = within(dialog).getByRole('button', { name: /Timeliness \(50%\)/ });
    fireEvent.click(timeBtn);

    // Verify multi-bracket section preserves scoring table layout and timeliness explanations
    expect(within(dialog).getByText('0–2 missed days')).toBeDefined();
    expect(within(dialog).getByText('3–4 missed days')).toBeDefined();
    expect(within(dialog).getByText('Within the 2-day allowance for routine market reporting.')).toBeDefined();
  });

  it('dynamically adapts Price Availability scoring table to 21 expected reporting days without hardcoded 14', async () => {
    analyticsApi.getModuleOutputDetail.mockResolvedValueOnce({
      id: 'OUT-0021',
      commodity_name: 'Ampalaya',
      generated_at: '2026-11-02T08:00:00Z',
      price_outlook: 'Favorable',
      basis_inputs: {
        reliability_rules: {
          dimension_weights: { availability: 0.5, timeliness: 0.5 },
          module_policies: {
            'price-outlook': {
              availability: {
                rule_type: 'ratio',
                brackets: [
                  { condition: '21 observed reporting days (Full coverage)', score: 1.0, min: 21, max: null },
                  { condition: '1–20 observed reporting days (Partial coverage)', score: 'observed reporting days ÷ 21', min: 1, max: 20 },
                  { condition: '0 observed reporting days (No coverage)', score: 0.0, min: 0, max: 0 },
                ],
              },
            },
          },
        },
        price_outlook: {
          reliability_factor: 1.0,
          reliability_status: 'High',
          reliability_dimensions: { availability: 1.0, timeliness: 1.0 },
          reliability_evidence: { available: 21, required: 21, unit: 'reporting days', missed_reporting_days: 0 },
        },
      },
    });

    renderPage();
    fireEvent.click(await screen.findByText('View explanation'));
    const dialog = await screen.findByRole('dialog');

    // Expand Availability accordion (50%)
    const availBtn = within(dialog).getByRole('button', { name: /Availability \(50%\)/ });
    fireEvent.click(availBtn);

    // Verify 21-day table is rendered dynamically
    expect(within(dialog).getByText('21 of 21 expected reporting days have usable price observations. Availability: 1.00.')).toBeDefined();
    expect(within(dialog).getByText('21 observed reporting days (Full coverage)')).toBeDefined();
    expect(within(dialog).getByText('1–20 observed reporting days (Partial coverage)')).toBeDefined();
    expect(within(dialog).getByText('0 observed reporting days (No coverage)')).toBeDefined();
    expect(within(dialog).queryByText('14 of 14 expected reporting days (full coverage)')).toBeNull();
  });

  it('shows Weather Risk quality-gated availability explanation and critical failure safeguard note', async () => {
    analyticsApi.getModuleOutputDetail.mockResolvedValueOnce({
      id: 'OUT-0006',
      commodity_name: 'Ampalaya',
      generated_at: '2026-09-27T08:00:00Z',
      basis_inputs: {
        reliability_rules: {
          dimension_weights: { availability: 0.5, timeliness: 0.5 },
          module_policies: {
            'price-outlook': {
              availability: {
                rule_type: 'ratio',
                brackets: [
                  { condition: '14 of 14 expected reporting days (full coverage)', score: 1.0, min: 14, max: 14 },
                  { condition: '0 of 14 expected reporting days (no usable data)', score: 0.0, min: 0, max: 0, safeguard: 'Critical failure cap applies (final factor ≤ 0.39, Low)' },
                ],
              },
            },
          },
        },
        price_outlook: {
          reliability_factor: 0.10,
          reliability_status: 'Low',
          reliability_dimensions: { availability: 0.0, timeliness: 0.05 },
          reliability_evidence: { available: 0, required: 14, usable_records: 0 },
        },
      },
    });

    renderPage();
    fireEvent.click(await screen.findByText('View explanation'));
    const dialog = await screen.findByRole('dialog');

    // Expand Availability accordion
    const availBtn = within(dialog).getByRole('button', { name: /Availability \(50%\)/ });
    fireEvent.click(availBtn);

    // Verify Scoring Rules table shows the critical safeguard note
    expect(within(dialog).getByText('0 of 14 expected reporting days have usable price observations. Availability: 0.00.')).toBeDefined();
    expect(within(dialog).getByText(/Critical failure cap applies \(final factor ≤ 0.39, Low\)/)).toBeDefined();
  });

  it('formats Price Outlook timeliness evidence without redundant "applied bracket:" phrasing', async () => {
    analyticsApi.getModuleOutputDetail.mockResolvedValueOnce({
      id: 'OUT-0007',
      commodity_name: 'Ampalaya',
      generated_at: '2026-10-28T08:00:00Z',
      price_outlook: 'Favorable',
      basis_inputs: {
        reliability_rules: {
          dimension_weights: { availability: 0.5, timeliness: 0.5 },
          module_policies: {
            'price-outlook': {
              timeliness: {
                rule_type: 'brackets',
                brackets: [
                  { condition: '0–2 missed days', score: 1.0, min: 0, max: 2 },
                  { condition: '3–4 missed days', score: 0.75, min: 3, max: 4, explanation: 'Slightly delayed.' },
                ],
              },
            },
          },
        },
        price_outlook: {
          reliability_factor: 0.875,
          reliability_status: 'High',
          reliability_dimensions: { availability: 1.0, timeliness: 0.75 },
          reliability_evidence: {
            available: 21,
            required: 21,
            unit: 'reporting days',
            latest_date: '2026-10-28',
            missed_reporting_days: 3,
          },
        },
      },
    });

    renderPage();
    fireEvent.click(await screen.findByText('View explanation'));
    const dialog = await screen.findByRole('dialog');

    // Expand Timeliness accordion
    const timeBtn = within(dialog).getByRole('button', { name: /Timeliness \(50%\)/ });
    fireEvent.click(timeBtn);

    // Verify phrasing: "3 missed reporting days (3–4 missed days bracket)." without "applied bracket:"
    expect(within(dialog).getByText(/3 missed reporting days \(3–4 missed days bracket\)\./)).toBeDefined();
    expect(within(dialog).queryByText(/applied bracket:/)).toBeNull();
  });
});
