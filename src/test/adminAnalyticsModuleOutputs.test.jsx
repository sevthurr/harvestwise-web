import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import AdminAnalytics from '../app/admin/pages/AdminAnalytics';
import { analyticsApi } from '../services/api';
import { apiGet, parseResponse } from '../app/global/api';

// Regression cover for the Module Outputs table on the analytics page.
//
// One persisted `module_outputs` record fans out into one row per module
// (MODULE_ROW_FIELDS), so three separate defects were reachable from it:
// rows keyed on `r.id` collided four ways, the variety filter read a `variety`
// field the row shape never had, and the scope refresh listed the unfiltered
// page twice per scope change.

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
  },
}));

// The page reads its commodity list straight from the shared api helper rather
// than through analyticsApi, so it needs its own mock. Sibling components pull
// other helpers from the same module, so keep the real ones.
vi.mock('../app/global/api', async (importOriginal) => ({
  ...(await importOriginal()),
  apiGet: vi.fn(),
  parseResponse: vi.fn(),
}));

// One record -> four rows. The page auto-selects Kalabasa's first variant,
// "Suprema", so this record sits inside the scope.
const RECORD = {
  id: 'MO-1',
  commodity_name: 'Kalabasa',
  variety: 'Suprema',
  reference_month: '2026-09',
  generated_at: '2026-10-01T00:00:00Z',
  price_outlook: 'Favorable',
  arrival_pressure: 'Lower Middle',
  historical_seasonal_production_level: 'Upper Middle',
  weather_risk_level: 'Low',
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/modules/analytics']}>
      <Routes>
        <Route path="/admin/modules/analytics" element={<AdminAnalytics />} />
      </Routes>
    </MemoryRouter>
  );

const resultsTable = () => screen.getByRole('table');
const bodyRows = () => within(resultsTable()).getAllByRole('row').slice(1);

describe('AdminAnalytics module outputs table', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Kalabasa is picked automatically and carries variants, so the page sets
    // a real scope and runs the compute. Its first variant is "Suprema".
    apiGet.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'COM-0001', name: 'Kalabasa', is_top10: true, is_active: true }],
    });
    parseResponse.mockImplementation(async (res) => res.json());

    analyticsApi.listWeights.mockResolvedValue({ items: [] });
    analyticsApi.listThresholds.mockResolvedValue({ items: [] });
    analyticsApi.listThresholdRules.mockResolvedValue({ items: [] });
    analyticsApi.listModuleOutputs.mockResolvedValue({ items: [RECORD] });
    analyticsApi.computeModuleOutputs.mockResolvedValue({ commodity_id: 'COM-0001' });
    analyticsApi.listWeatherRules.mockResolvedValue({ items: [] });
    analyticsApi.getHistoricalSeasonalProduction.mockResolvedValue({});
    // The Weights & Thresholds tab's Arrival Pressure card reads this. Default
    // to the backend's "not enough records" shape so the card renders its
    // honest empty state rather than a fabricated classification.
    analyticsApi.getArrivalPressure.mockResolvedValue({
      status: 'unavailable',
      message: 'Only 1 arrival record(s) available; at least 4 are required to calculate quartiles.',
      record_count: 1,
      records: [],
    });
  });

  afterEach(() => {
    // Deliberately no `restoreAllMocks()` here. It also strips the
    // implementations off the module-factory `vi.fn()`s, and the page's mount
    // effects outlive the test that started them -- the next test then meets an
    // undefined mock and fails with "Cannot read properties of undefined". The
    // one spy this file uses restores itself in its own test.
  });

  // Waits for the mount-time history load plus the scope-driven compute refresh.
  const settle = async () => {
    await waitFor(() => expect(analyticsApi.computeModuleOutputs).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(analyticsApi.listModuleOutputs).toHaveBeenCalledTimes(2));
  };

  it('computes once for the scope, not once per intermediate variety', async () => {
    // Regression: the variety defaulted to "Standard" while the commodity list
    // was still loading, so the scope looked complete and the compute persisted
    // a second set of module outputs for a variety nobody picked.
    renderPage();
    await settle();
    expect(analyticsApi.computeModuleOutputs).toHaveBeenCalledTimes(1);
    expect(analyticsApi.computeModuleOutputs).toHaveBeenCalledWith({
      crop_name: 'Kalabasa',
      variety: 'Suprema',
    });
  });

  it('lists the persisted history once on mount, then once after the compute', async () => {
    // Not three. A scope effect that listed the page alongside the compute
    // refresh fetched the same unfiltered page twice per scope change, and
    // could land its pre-compute copy after the fresh one.
    renderPage();
    await settle();
    expect(analyticsApi.listModuleOutputs).toHaveBeenCalledTimes(2);
  });

  it('keeps the scoped variety and drops the others', async () => {
    // Regression: the filter compared `r.variety`, which the mapped row never
    // set, so every named variety matched nothing and the table looked empty.
    analyticsApi.listModuleOutputs.mockResolvedValue({
      items: [RECORD, { ...RECORD, id: 'MO-2', variety: 'Malagkit' }],
    });

    renderPage();
    await settle();
    await waitFor(() => expect(bodyRows()).toHaveLength(4));

    // Only the Suprema record's four module rows survive the scope filter.
    expect(bodyRows().every((r) => r.textContent.includes('Suprema'))).toBe(true);
  });

  it('renders every module row for a matching record under distinct keys', async () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderPage();
    await settle();
    await waitFor(() => expect(bodyRows()).toHaveLength(4));

    // One record fans out across MODULE_ROW_FIELDS, one row per module.
    expect(bodyRows().map((r) => r.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Price Outlook'),
        expect.stringContaining('Arrival Pressure'),
        expect.stringContaining('Historical Seasonal Production Level'),
        expect.stringContaining('Weather Risk'),
      ])
    );

    // Keys were `r.id`, identical across all four fanned-out rows.
    expect(warn.mock.calls.flat().join(' ')).not.toMatch(/same key/i);
    warn.mockRestore();
  });

  it('blames the module and classification filters when the scope does have rows', async () => {
    renderPage();
    await settle();
    await waitFor(() => expect(bodyRows()).toHaveLength(4));

    // Suprema rows exist, but none are "High" under Price Outlook, so the table
    // empties out for a reason the old single message could not explain.
    const [moduleFilter, classificationFilter] = screen.getAllByRole('combobox');
    fireEvent.change(moduleFilter, { target: { value: 'Price Outlook' } });
    fireEvent.change(classificationFilter, { target: { value: 'High' } });

    await waitFor(() =>
      expect(
        screen.getByText(/No processed results match the selected module and classification/i)
      ).toBeInTheDocument()
    );
  });

  it('points at the compute action when the scope has no rows at all', async () => {
    analyticsApi.listModuleOutputs.mockResolvedValue({ items: [] });
    renderPage();
    await settle();
    await waitFor(() =>
      expect(
        screen.getByText(/Run the module outputs for this commodity to create them/i)
      ).toBeInTheDocument()
    );
  });
});
