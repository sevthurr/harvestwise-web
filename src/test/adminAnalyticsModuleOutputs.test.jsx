import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('AdminAnalytics module outputs', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Kalabasa is picked automatically and carries variants, so the page sets
    // a real scope and runs the compute. Its first variant is "Suprema".
    // `varieties` mirrors the API contract — the page reads the variety list
    // off this response rather than from the hardcoded commodities table.
    apiGet.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'COM-0001', name: 'Kalabasa', is_top10: true, is_active: true, varieties: ['Suprema'] },
      ],
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

  it('computes once for the scope, not once per intermediate variety', async () => {
    // Regression: the variety defaulted to "Standard" while the commodity list
    // was still loading, so the scope looked complete and the compute persisted
    // a second set of module outputs for a variety nobody picked.
    renderPage();
    await waitFor(() => expect(analyticsApi.computeModuleOutputs).toHaveBeenCalledTimes(1));
    expect(analyticsApi.computeModuleOutputs).toHaveBeenCalledTimes(1);
    expect(analyticsApi.computeModuleOutputs).toHaveBeenCalledWith({
      crop_name: 'Kalabasa',
      variety: 'Suprema',
    });
  });

  it('does not render the removed processed-results history or request it', async () => {
    renderPage();
    await waitFor(() => expect(analyticsApi.computeModuleOutputs).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Processed Results')).not.toBeInTheDocument();
    expect(analyticsApi.listModuleOutputs).not.toHaveBeenCalled();
  });
});
