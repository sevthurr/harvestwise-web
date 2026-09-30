import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import AdminAnalyticsBasis from '../app/admin/pages/AdminAnalyticsBasis';

// Regression cover for the "Datasets Used" panel. Price Outlook and Arrival
// Pressure both hard-coded / never populated `records`, so the table always
// rendered its empty state even though the source rows were available.
vi.mock('../services/api', () => ({
  analyticsApi: {
    getModuleOutputDetail: vi.fn().mockResolvedValue(null),
    listCommodities: vi.fn().mockResolvedValue({
      items: [{ id: 'COM-0001', name: 'Ampalaya', is_top10: true, is_active: true }],
    }),
    listWeatherRules: vi.fn().mockResolvedValue({ items: [] }),
    listThresholds: vi.fn().mockResolvedValue({ items: [] }),
    listThresholdRules: vi.fn().mockResolvedValue({ items: [] }),
    getHistoricalSeasonalProduction: vi.fn().mockResolvedValue({}),
    getPriceOutlook: vi.fn().mockResolvedValue({
      status: 'processed',
      classification: 'Favorable',
      source: 'Bangkerohan Retail',
      forecast_horizon_days: 14,
      price_records: [
        {
          price_date: '2026-09-26',
          prevail_price: 78.5,
          commodity_name: 'Ampalaya',
          variety: null,
          market: 'Bangkerohan',
          price_type: 'retail',
        },
        {
          price_date: '2026-09-25',
          prevail_price: 77.25,
          commodity_name: 'Ampalaya',
          variety: null,
          market: 'Bangkerohan',
          price_type: 'retail',
        },
      ],
    }),
    getArrivalPressure: vi.fn().mockResolvedValue({
      status: 'processed',
      classification: 'Low',
      source: 'DFTC Arrival Volume',
      record_count: 2,
      total_volume_kg: 30000,
      current_arrival_kg: 12000,
      latest_arrival_date: '2025-12-31',
      quartile_thresholds: { q1: 40000, q2: 60000, q3: 80000 },
      source_breakdown: {
        farm_source_volume_kg: 20000,
        other_source_volume_kg: 10000,
      },
      records: [
        {
          arrival_date: '2025-12-31',
          volume_kg: 12000,
          farm_source_volume_kg: 8000,
          other_source_volume_kg: 4000,
          commodity_name: 'Ampalaya',
          variety: null,
          source: 'DFTC Arrival Volume',
        },
        {
          arrival_date: '2024-12-31',
          volume_kg: 18000,
          farm_source_volume_kg: 12000,
          other_source_volume_kg: 6000,
          commodity_name: 'Ampalaya',
          variety: null,
          source: 'DFTC Arrival Volume',
        },
      ],
    }),
    getWeatherForecast: vi.fn().mockResolvedValue({ status: 'ok', days: [] }),
  },
}));

const openDatasets = async () => {
  const toggle = await screen.findByText('Datasets Used');
  fireEvent.click(toggle.closest('button'));
  return (await screen.findByText('Date')).closest('table');
};

// Row-scoped lookups: a value can legitimately repeat across columns/rows
// (e.g. a farm-source volume that matches another row's total).
const dataRows = (table) =>
  within(table).getAllByRole('row').slice(1).map((row) =>
    [...row.querySelectorAll('td')].map((cell) => cell.textContent)
  );

const renderPage = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/modules/basis/:resultId" element={<AdminAnalyticsBasis />} />
      </Routes>
    </MemoryRouter>
  );

describe('AdminAnalyticsBasis Datasets Used', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The price/arrival visualizations mount a recharts ResponsiveContainer.
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it('lists the price_record rows behind the Price Outlook result', async () => {
    renderPage('/admin/modules/basis/price-outlook?commodity=Ampalaya&variety=All%20Varieties');

    const table = await openDatasets();

    expect(dataRows(table)).toEqual([
      ['Sep 26', 'Ampalaya', 'All Varieties', 'Bangkerohan', 'retail', '₱78.5', 'Bangkerohan Retail'],
      ['Sep 25', 'Ampalaya', 'All Varieties', 'Bangkerohan', 'retail', '₱77.25', 'Bangkerohan Retail'],
    ]);
    expect(screen.queryByText('No source records available for this result.')).toBeNull();
  });

  it('lists the arrival_volume rows behind the Arrival Pressure result', async () => {
    renderPage('/admin/modules/basis/arrival-pressure?commodity=Ampalaya&variety=All%20Varieties');

    const table = await openDatasets();

    expect(dataRows(table)).toEqual([
      ['Dec 31', 'Ampalaya', 'All Varieties', '12,000 kg', '8,000 kg', '4,000 kg', 'DFTC Arrival Volume'],
      ['Dec 31', 'Ampalaya', 'All Varieties', '18,000 kg', '12,000 kg', '6,000 kg', 'DFTC Arrival Volume'],
    ]);
    expect(screen.queryByText('No source records available for this result.')).toBeNull();
  });

  it('requests both module datasets by commodity id, not by display name', async () => {
    const { analyticsApi } = await import('../services/api');
    renderPage('/admin/modules/basis/arrival-pressure?commodity=Ampalaya&variety=All%20Varieties');

    await waitFor(() => {
      expect(analyticsApi.getArrivalPressure).toHaveBeenCalledWith('COM-0001');
    });
  });
});
