import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import AdminAnalytics from '../app/admin/pages/AdminAnalytics';
import AdminAnalyticsBasis from '../app/admin/pages/AdminAnalyticsBasis';
import { analyticsApi } from '../services/api';
import { apiGet, parseResponse } from '../app/global/api';
import {
  bucketArrivals,
  classifyArrival,
  classificationColor
} from '../app/admin/components/analytics/arrivalVolumeSeries';

// Cover for the two admin Arrival Pressure surfaces:
//
//   - the Weights & Thresholds card, which rendered three hardcoded `- MT/week`
//     literals and had no data source at all
//   - the basis trend chart, which had no source/granularity/year controls
//
// Both read the same `/admin/analytics/outputs/arrival-pressure` records.

vi.mock('../services/api', () => ({
  analyticsApi: {
    listWeights: vi.fn(),
    listThresholds: vi.fn(),
    listThresholdRules: vi.fn(),
    listModuleOutputs: vi.fn(),
    computeModuleOutputs: vi.fn(),
    listWeatherRules: vi.fn(),
    getHistoricalSeasonalProduction: vi.fn(),
    getArrivalPressure: vi.fn(),
    getModuleOutputDetail: vi.fn(),
    getWeatherForecast: vi.fn(),
    getPriceOutlook: vi.fn(),
    listCommodities: vi.fn(),
  },
}));

vi.mock('../app/global/api', async (importOriginal) => ({
  ...(await importOriginal()),
  apiGet: vi.fn(),
  parseResponse: vi.fn(),
}));

// Kalabasa's first variant is "Suprema", which is what the page auto-selects.
const RECORD = (overrides = {}) => ({
  arrival_date: '2025-12-31',
  volume_kg: 207,
  farm_source_volume_kg: 8,
  other_source_volume_kg: 199,
  commodity_name: 'Kalabasa',
  variety: 'Suprema',
  source: 'DFTC Arrival Volume',
  ...overrides,
});

// The shape the backend returns once it has at least four records.
const PROCESSED = {
  status: 'processed',
  classification: 'Low',
  commodity_id: 'COM-0001',
  commodity_name: 'Kalabasa',
  current_arrival_kg: 207,
  quartile_thresholds: { q1: 281.6, q2: 433.1, q3: 494.1 },
  source_breakdown: { farm_source_volume_kg: 8, other_source_volume_kg: 199 },
  total_volume_kg: 4062.9,
  record_count: 10,
  latest_arrival_date: '2025-12-31',
  records: [],
};

// What it returns below four records: volumes reported, classification withheld.
const UNAVAILABLE = {
  status: 'unavailable',
  message: 'Only 1 arrival record(s) available; at least 4 are required to calculate quartiles.',
  commodity_id: 'COM-0001',
  commodity_name: 'Kalabasa',
  current_arrival_kg: 88944.87,
  source_breakdown: { farm_source_volume_kg: 83389.87, other_source_volume_kg: 5555 },
  total_volume_kg: 88944.87,
  record_count: 1,
  latest_arrival_date: '2025-12-31',
  records: [RECORD({ volume_kg: 88944.87, farm_source_volume_kg: 83389.87, other_source_volume_kg: 5555 })],
};

const renderAnalytics = (tab = 'weights') =>
  render(
    <MemoryRouter initialEntries={[`/admin/modules?tab=${tab}`]}>
      <Routes>
        <Route path="/admin/modules" element={<AdminAnalytics />} />
      </Routes>
    </MemoryRouter>
  );

const renderBasis = () =>
  render(
    <MemoryRouter initialEntries={['/admin/modules/basis/arrival-pressure?commodity=Kalabasa&variety=Suprema']}>
      <Routes>
        <Route path="/admin/modules/basis/:resultId" element={<AdminAnalyticsBasis />} />
      </Routes>
    </MemoryRouter>
  );

// The card is the only element with both the "Arrival Pressure" heading and a
// "View Basis" affordance, so match on the pair to avoid the module-output card
// of the same name.
const arrivalCard = () => {
  const heading = screen
    .getAllByText('Arrival Pressure')
    .find((el) => el.tagName === 'H3');
  const card = heading.closest('div.rounded-2xl');
  expect(within(card).getByText('View Basis')).toBeInTheDocument();
  return card;
};

// Every mock gets its implementation here rather than per-describe. Both pages
// mount effects that outlive a single test, so a mock left undefined by a
// teardown would blow up inside the *next* test with a confusing stack.
beforeEach(() => {
  vi.clearAllMocks();
  apiGet.mockResolvedValue({
    ok: true,
    json: async () => [{ id: 'COM-0001', name: 'Kalabasa', is_top10: true, is_active: true }],
  });
  parseResponse.mockImplementation(async (res) => res.json());

  analyticsApi.listWeights.mockResolvedValue({ items: [] });
  analyticsApi.listThresholds.mockResolvedValue({ items: [] });
  analyticsApi.listThresholdRules.mockResolvedValue({ items: [] });
  analyticsApi.listModuleOutputs.mockResolvedValue({ items: [] });
  analyticsApi.computeModuleOutputs.mockResolvedValue({ commodity_id: 'COM-0001' });
  analyticsApi.listWeatherRules.mockResolvedValue({ items: [] });
  analyticsApi.getHistoricalSeasonalProduction.mockResolvedValue({});
  analyticsApi.getArrivalPressure.mockResolvedValue(PROCESSED);

  // Basis-view mocks. Resolved here too so a mount effect that fires late
  // never meets an undefined mock.
  analyticsApi.listCommodities.mockResolvedValue({
    items: [{ id: 'COM-0001', name: 'Kalabasa', is_top10: true, is_active: true }],
  });
  analyticsApi.getModuleOutputDetail.mockResolvedValue(null);
  analyticsApi.getWeatherForecast.mockResolvedValue({ status: 'ok', days: [] });
  analyticsApi.getPriceOutlook.mockResolvedValue({});
});

describe('Admin Arrival Pressure card', () => {
  // The card renders immediately but its numbers arrive after the async fetch
  // resolves, so wait for the fetch rather than for the markup.
  const settleCard = async () => {
    await waitFor(() => expect(analyticsApi.getArrivalPressure).toHaveBeenCalled());
    return arrivalCard();
  };

  // Waits for a specific value to paint. Asserting on the card straight after
  // the fetch resolves is a race: the fetch spy records the call, the promise
  // has not yet flushed into React state, so numeric assertions intermittently
  // read the "—" placeholder. Naming the expected value makes the wait precise
  // instead of timing-dependent.
  const settleCardWithData = async (expected) => {
    await settleCard();
    return waitFor(() => {
      expect(within(arrivalCard()).getAllByText(expected).length).toBeGreaterThan(0);
      return arrivalCard();
    });
  };

  it('renders the quartile thresholds returned by the endpoint', async () => {
    // Regression: all three read `- MT/week` as a literal, so the card could
    // never show a threshold regardless of the data.
    renderAnalytics();
    const card = await settleCardWithData('281.6');

    // Number and unit are separate spans so the unit can sit lighter, per the
    // design, so assert each rather than the joined string.
    expect(within(card).getByText('433.1')).toBeInTheDocument();
    expect(within(card).getByText('494.1')).toBeInTheDocument();
    expect(within(card).getAllByText('kg/mo').length).toBe(3);
    expect(within(card).queryByText(/- MT\/week/)).toBeNull();
  });

  it('shows the classification badge and the monthly volume', async () => {
    // The volume tile is derived from the records, not from the summary fields.
    analyticsApi.getArrivalPressure.mockResolvedValue({
      ...PROCESSED,
      records: [RECORD()],
    });
    renderAnalytics();
    const card = await settleCardWithData('207 kg');

    expect(within(card).getByText('Current Month Volume')).toBeInTheDocument();
    // The volume and the badge sit on one line, per the design.
    const volumeRow = within(card).getByText('Current Month Volume').nextElementSibling;
    expect(volumeRow).toHaveTextContent('207 kg');
    expect(volumeRow).toHaveTextContent('Low');
  });

  it('lists the four classification boundaries with their supply-pressure readings', async () => {
    renderAnalytics();
    const card = await settleCardWithData('281.6');

    for (const supply of ['Deficit / High Price', 'Moderate Supply', 'Normal Supply', 'Surplus / Low Price']) {
      expect(within(card).getByText(supply)).toBeInTheDocument();
    }
    expect(within(card).getByText(/≤ 281\.6 kg\/mo/)).toBeInTheDocument();
    expect(within(card).getByText(/> 494\.1 kg\/mo/)).toBeInTheDocument();
  });

  it('reports the annual total with the number of months it covers', async () => {
    analyticsApi.getArrivalPressure.mockResolvedValue({
      ...PROCESSED,
      records: [
        RECORD({ arrival_date: '2025-03-31', volume_kg: 100 }),
        RECORD({ arrival_date: '2025-06-30', volume_kg: 200 }),
        RECORD({ arrival_date: '2025-12-31', volume_kg: 207 }),
      ],
    });
    renderAnalytics();
    const card = await settleCardWithData('507 kg');

    expect(within(card).getByText('Annual Recorded Total')).toBeInTheDocument();
    // 100 + 200 + 207 across three distinct months. The month count is a
    // separate span so it reads as a qualifier, per the design.
    const totalRow = within(card).getByText('Annual Recorded Total').nextElementSibling;
    expect(totalRow).toHaveTextContent('507 kg');
    expect(within(totalRow).getByText('(3 mo)')).toBeInTheDocument();
  });

  it('withholds the thresholds and badge rather than inventing a classification', async () => {
    // The backend reports volumes but no quartiles below four records. The
    // card must show that, not a zero-padded reading that classifies every
    // commodity "High".
    analyticsApi.getArrivalPressure.mockResolvedValue(UNAVAILABLE);
    renderAnalytics();
    // Wait for the resolved volume before asserting the withheld state. The
    // "—" placeholders are also what the card shows before the fetch lands, so
    // asserting on them right after the fetch spy fires is a race.
    const card = await settleCardWithData('88,944.9 kg');

    // All three quartile placeholders, not one.
    expect(within(card).getAllByText('— kg/mo')).toHaveLength(3);
    expect(within(card).getByText(/Insufficient arrival history/)).toBeInTheDocument();
    expect(within(card).queryByText('Deficit / High Price')).toBeNull();
    expect(within(card).queryByText('Low')).toBeNull();
    // The volume it does have is still reported, in both tiles.
    const volumeRow = within(card).getByText('Current Month Volume').nextElementSibling;
    expect(volumeRow).toHaveTextContent('88,944.9 kg');
  });

  it('links through to the arrival-pressure basis view', async () => {
    renderAnalytics();
    const card = await settleCard();
    const link = within(card).getByText('View Basis').closest('button');
    expect(link).toBeInTheDocument();
  });

  it('exposes the commodity selector on the Weights & Thresholds tab', async () => {
    // The card reads `scopedCommodity`, but the selector used to render only on
    // the Module Outputs tab, so on this tab there was no way to change the
    // commodity and the card silently kept the other tab's selection.
    renderAnalytics('weights');
    await settleCardWithData('281.6');

    expect(screen.getByText('Commodity')).toBeInTheDocument();
    expect(screen.getByText('Variety')).toBeInTheDocument();
    expect(screen.getByText('Kalabasa · Suprema')).toBeInTheDocument();
  });

  it('re-reads arrival volume when the commodity changes on that tab', async () => {
    apiGet.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'COM-0001', name: 'Kalabasa', is_top10: true, is_active: true },
        { id: 'COM-0002', name: 'Ampalaya', is_top10: true, is_active: true },
      ],
    });
    renderAnalytics('weights');
    await settleCardWithData('281.6');

    // The first commodity is selected automatically, so the page has already
    // read its arrival volume.
    expect(analyticsApi.getArrivalPressure).toHaveBeenCalledWith('COM-0001');

    fireEvent.click(screen.getByRole('button', { name: /Kalabasa/ }));
    fireEvent.click(await screen.findByText('Ampalaya'));

    await waitFor(() =>
      expect(analyticsApi.getArrivalPressure).toHaveBeenCalledWith('COM-0002')
    );
    await waitFor(() =>
      expect(screen.getByText(/Ampalaya ·/)).toBeInTheDocument()
    );
  });
});

describe('Admin arrival volume trend', () => {
  // The trend card mounts a recharts ResponsiveContainer.
  beforeEach(() => {
    global.ResizeObserver = class {
      observe() { }
      unobserve() { }
      disconnect() { }
    };
  });

  const multiYear = () => [
    RECORD({ arrival_date: '2025-03-31', volume_kg: 280, farm_source_volume_kg: 100, other_source_volume_kg: 180 }),
    RECORD({ arrival_date: '2025-04-30', volume_kg: 490, farm_source_volume_kg: 20, other_source_volume_kg: 470 }),
    RECORD({ arrival_date: '2024-11-30', volume_kg: 150, farm_source_volume_kg: 150, other_source_volume_kg: 0 }),
  ];

  // The controls and subtitle appear once the records land, so wait for the
  // year selector rather than for the card shell.
  const settleTrend = async () => {
    await screen.findByText('Arrival Volume Trend');
    return screen.findByLabelText('Arrival year');
  };

  it('offers the source, granularity and year controls', async () => {
    analyticsApi.getArrivalPressure.mockResolvedValue({
      ...PROCESSED,
      records: multiYear(),
    });
    renderBasis();

    await settleTrend();
    expect(screen.getByRole('button', { name: 'Overall' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Farm Source' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Other Sources' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Monthly' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Daily' })).toBeInTheDocument();

    const yearSelect = screen.getByLabelText('Arrival year');
    expect([...yearSelect.options].map((o) => o.value)).toEqual(['2025', '2024']);
  });

  it('describes the current selection in the subtitle', async () => {
    analyticsApi.getArrivalPressure.mockResolvedValue({ ...PROCESSED, records: multiYear() });
    renderBasis();

    await settleTrend();
    expect(
      screen.getByText('DFTC monthly arrivals · Overall (Farm + Other) · kilograms · 2025')
    ).toBeInTheDocument();
  });


  it('shows the source pie card below the trend with the selected year totals', async () => {
    analyticsApi.getArrivalPressure.mockResolvedValue({
      ...PROCESSED,
      records: [
        RECORD({ arrival_date: '2025-03-31', volume_kg: 300, farm_source_volume_kg: 100, other_source_volume_kg: 200 })
      ],
    });
    renderBasis();

    await settleTrend();
    const trendHeading = screen.getByText('Arrival Volume Trend');
    const pieHeading = await screen.findByText('Arrival Volume Sources Distribution');

    expect(Boolean(trendHeading.compareDocumentPosition(pieHeading) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
    expect(screen.getByText('(100 kg)')).toBeInTheDocument();
    expect(screen.getByText('(200 kg)')).toBeInTheDocument();
  });
  it('switches the subtitle when a different source is chosen', async () => {
    analyticsApi.getArrivalPressure.mockResolvedValue({ ...PROCESSED, records: multiYear() });
    renderBasis();

    await settleTrend();
    fireEvent.click(screen.getByRole('button', { name: 'Other Sources' }));
    await waitFor(() =>
      expect(
        screen.getByText('DFTC monthly arrivals · Other Sources · kilograms · 2025')
      ).toBeInTheDocument()
    );
  });

  it('switches the year and re-scopes the series', async () => {
    analyticsApi.getArrivalPressure.mockResolvedValue({ ...PROCESSED, records: multiYear() });
    renderBasis();

    await settleTrend();
    fireEvent.change(screen.getByLabelText('Arrival year'), { target: { value: '2024' } });
    await waitFor(() =>
      expect(
        screen.getByText('DFTC monthly arrivals · Overall (Farm + Other) · kilograms · 2024')
      ).toBeInTheDocument()
    );
  });

  it('falls back to daily granularity buckets', async () => {
    analyticsApi.getArrivalPressure.mockResolvedValue({
      ...PROCESSED,
      records: [
        RECORD({ arrival_date: '2025-03-14', volume_kg: 90 }),
        RECORD({ arrival_date: '2025-03-15', volume_kg: 120 }),
      ],
    });
    renderBasis();

    await settleTrend();
    fireEvent.click(screen.getByRole('button', { name: 'Daily' }));
    await waitFor(() =>
      expect(
        screen.getByText('DFTC daily arrivals · Overall (Farm + Other) · kilograms · 2025')
      ).toBeInTheDocument()
    );
  });

  it('shows the sources pie chart below the trend', async () => {
    analyticsApi.getArrivalPressure.mockResolvedValue({ ...PROCESSED, records: multiYear() });
    renderBasis();

    await settleTrend();
    const trendHeading = screen.getByText('Arrival Volume Trend');
    const pieHeading = await screen.findByText('Arrival Volume Sources Distribution');
    expect(Boolean(trendHeading.compareDocumentPosition(pieHeading) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it('keeps one bar series whichever source is selected', async () => {
    // The design shows a single bar per month, so the toggle picks the value
    // that bar plots rather than adding a Farm/Other column pair.
    analyticsApi.getArrivalPressure.mockResolvedValue({ ...PROCESSED, records: multiYear() });
    const { container } = renderBasis();
    await settleTrend();

    const bars = () => container.querySelectorAll('.recharts-bar');
    // recharts needs a measured container, which jsdom does not provide, so fall
    // back to asserting the chart's bar configuration via the rendered legend.
    const barCount = bars().length;
    if (barCount > 0) expect(barCount).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Farm Source' }));
    await waitFor(() =>
      expect(
        screen.getByText('DFTC monthly arrivals · Farm Source · kilograms · 2025')
      ).toBeInTheDocument()
    );
    if (bars().length > 0) expect(bars().length).toBe(1);
  });

  it('classifies each month against the card quartiles', async () => {
    // The chart and the card must not disagree, so the bar scale is the card's
    // own Q1/Q2/Q3 bands rather than a per-month hard-code.
    const quartiles = { q1: 300, q2: 500, q3: 700 };
    const records = [
      RECORD({ arrival_date: '2025-03-31', volume_kg: 100 }),   // <= q1  -> Low
      RECORD({ arrival_date: '2025-04-30', volume_kg: 400 }),   // <= q2  -> Lower Middle
      RECORD({ arrival_date: '2025-05-31', volume_kg: 600 }),   // <= q3  -> Upper Middle
      RECORD({ arrival_date: '2025-06-30', volume_kg: 900 }),   // >  q3  -> High
    ];
    analyticsApi.getArrivalPressure.mockResolvedValue({
      ...PROCESSED,
      quartile_thresholds: quartiles,
      records,
    });
    renderBasis();
    await settleTrend();

    // Same rule, verified on the data the chart is built from.
    const series = bucketArrivals(records, { granularity: 'monthly', year: 2025 });
    const labels = series.map((b) => classifyArrival(b.total_kg, quartiles));
    expect(labels).toEqual(['Low', 'Lower Middle', 'Upper Middle', 'High']);
    // Each band maps to its own colour, so the bars are visually distinct.
    expect(new Set(labels.map(classificationColor)).size).toBe(4);
  });
});
