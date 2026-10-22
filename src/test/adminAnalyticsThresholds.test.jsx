/**
 * Admin Analytics — Price Outlook threshold save wiring.
 *
 * Regression cover for a silent save. `handlePriceOutlookSave` resolves each
 * modal field to a stored rule on `classification` (the `ensureRule` join in
 * AdminAnalytics.jsx); it used to join on `rule_key`, but the stored rows carry
 * descriptive keys (`favorable_min_change`, `unfavorable_max_change`) that
 * share no namespace with the form's classification labels. Every lookup then
 * missed, so the save created duplicate rows instead of updating the existing
 * ones — while the modal still reported "Saved!".
 *
 * The mount refresh deliberately answers with the module but no rules, so no
 * rule id is known when the modal opens: the classification join is the only
 * path from the form fields to the stored rules, which is what makes this test
 * fail if the join is put back on `rule_key`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

import AdminAnalytics from '../app/admin/pages/AdminAnalytics';
import { analyticsApi } from '../services/api';
import { apiGet, parseResponse } from '../app/global/api';

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
    updateThresholdRule: vi.fn(),
    createThresholdRule: vi.fn(),
    createThreshold: vi.fn(),
  },
}));

// The page reads its commodity list through the shared api helper rather than
// analyticsApi, so it needs its own mock. Sibling components pull other helpers
// from the same module, so keep the real ones.
vi.mock('../app/global/api', async (importOriginal) => ({
  ...(await importOriginal()),
  apiGet: vi.fn(),
  parseResponse: vi.fn(),
}));

const priceOutlookModule = (rules) => ({
  items: [{ id: 'TH-1', module_name: 'Price Outlook', rules }],
  total: 1,
});

// The rows `api/scripts/seed_adaptive_weights_and_thresholds.py` writes:
// descriptive rule keys, human classifications.
const STORED_RULES = [
  {
    id: 'RULE-FAV',
    rule_key: 'favorable_min_change',
    classification: 'Favorable',
    operator: '>',
    threshold_value: 0.05,
    display_text: '> +5%',
  },
  {
    id: 'RULE-UNFAV',
    rule_key: 'unfavorable_max_change',
    classification: 'Unfavorable',
    operator: '<',
    threshold_value: -0.05,
    display_text: '< -5%',
  },
];

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/modules/analytics?tab=weights']}>
      <Routes>
        <Route path="/admin/modules/analytics" element={<AdminAnalytics />} />
      </Routes>
    </MemoryRouter>
  );

describe('AdminAnalytics Price Outlook threshold save', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiGet.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'COM-0001', name: 'Kalabasa', is_top10: true, is_active: true }],
    });
    parseResponse.mockImplementation(async (res) => res.json());

    analyticsApi.listWeights.mockResolvedValue({ items: [] });
    // Mount sees the module with no rules; the save, and the refresh that
    // follows it, see the stored rows.
    analyticsApi.listThresholds
      .mockResolvedValueOnce(priceOutlookModule([]))
      .mockResolvedValue(priceOutlookModule(STORED_RULES));
    analyticsApi.listThresholdRules.mockResolvedValue({ items: [] });
    analyticsApi.listModuleOutputs.mockResolvedValue({ items: [] });
    analyticsApi.computeModuleOutputs.mockResolvedValue({ commodity_id: 'COM-0001' });
    analyticsApi.listWeatherRules.mockResolvedValue({ items: [] });
    analyticsApi.getHistoricalSeasonalProduction.mockResolvedValue({});
    // The Arrival Pressure card reads this. Return the backend's "not enough
    // records" shape so the card renders its honest empty state.
    analyticsApi.getArrivalPressure.mockResolvedValue({
      status: 'unavailable',
      message: 'Only 1 arrival record(s) available; at least 4 are required to calculate quartiles.',
      record_count: 1,
      records: [],
    });
    analyticsApi.updateThresholdRule.mockResolvedValue({});
    analyticsApi.createThresholdRule.mockResolvedValue({});
    analyticsApi.createThreshold.mockResolvedValue({ id: 'TH-1', module_name: 'Price Outlook', rules: [] });
  });

  it('updates the rule matching each field by classification instead of creating a duplicate', async () => {
    renderPage();

    // Proof that the mount refresh found no rules: no rule id is known when the
    // modal opens, so only the classification join can find the rows to update.
    await screen.findByText('Price Outlook thresholds not configured.');

    fireEvent.click(screen.getByTitle('Edit Price Outlook Thresholds'));

    fireEvent.change(screen.getByPlaceholderText('e.g. 5'), { target: { value: '8' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. -5'), { target: { value: '-5' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(analyticsApi.updateThresholdRule).toHaveBeenCalledTimes(2));

    // Favorable -> RULE-FAV, Unfavorable -> RULE-UNFAV. Joined on `rule_key`
    // both would miss and become two POSTs instead.
    expect(analyticsApi.updateThresholdRule.mock.calls).toEqual([
      ['RULE-FAV', { threshold_value: 0.08, display_text: '> +8%' }],
      ['RULE-UNFAV', { threshold_value: -0.05, display_text: '< -5%' }],
    ]);
    expect(analyticsApi.createThresholdRule).not.toHaveBeenCalled();
    expect(analyticsApi.createThreshold).not.toHaveBeenCalled();

    await screen.findByText('Saved!');
  });

  it('opens Profitability modal and saves updated percentage thresholds with correct preview font size', async () => {
    analyticsApi.listThresholds.mockResolvedValue({
      items: [
        { id: 'TH-1', module_name: 'Price Outlook', rules: STORED_RULES },
        { id: 'TH-PROF', module_name: 'Profitability', rules: [] },
      ],
      total: 2,
    });
    analyticsApi.listThresholdRules.mockResolvedValue({ items: [] });

    renderPage();

    await screen.findByText(/Lower Forecast ≥ 110% of Break-even Price/i);

    fireEvent.click(screen.getByTitle('Edit Profitability Thresholds'));

    expect(screen.getByText('Edit Profitability Thresholds')).toBeInTheDocument();

    // Verify Decision Rule Preview is present with reduced font size (text-[10px]) and black text
    const previewHeader = screen.getByText(/decision rule preview/i);
    expect(previewHeader).toBeInTheDocument();
    expect(previewHeader.className).toContain('text-[9.5px]');
    expect(previewHeader.className).toContain('text-black');

    const favInput = screen.getByLabelText('Favorable Threshold Percentage');

    // Change threshold from 110 to 115
    fireEvent.change(favInput, { target: { value: '115' } });

    // Preview should dynamically show 115% with reduced text-[10px] size
    const updatedPreview = screen.getByText(/Lower Forecast ≥ 115% of Break-even Price/i);
    expect(updatedPreview).toBeInTheDocument();
    expect(updatedPreview.className).toContain('text-[10px]');
    expect(updatedPreview.className).toContain('text-black');

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(analyticsApi.createThresholdRule).toHaveBeenCalledTimes(2));

    expect(analyticsApi.createThresholdRule).toHaveBeenCalledWith(
      'TH-PROF',
      expect.objectContaining({
        classification: 'Favorable',
        operator: '>=',
        threshold_value: 115,
        display_text: 'Lower Forecast ≥ 115% of Break-even Price',
      })
    );
    expect(analyticsApi.createThresholdRule).toHaveBeenCalledWith(
      'TH-PROF',
      expect.objectContaining({
        classification: 'Unfavorable',
        operator: '<',
        threshold_value: 100,
        display_text: 'Upper Forecast < Break-even Price',
      })
    );
  });
});
