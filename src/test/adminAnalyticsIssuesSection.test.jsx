import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  },
}));

vi.mock('../app/global/api', async (importOriginal) => ({
  ...(await importOriginal()),
  apiGet: vi.fn(),
  parseResponse: vi.fn(),
}));

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

const renderAnalyticsPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/modules/analytics']}>
      <Routes>
        <Route path="/admin/modules/analytics" element={<AdminAnalytics />} />
      </Routes>
    </MemoryRouter>
  );

describe('AdminAnalytics Redundant UI Removal (Issues Section)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
    analyticsApi.listWeatherRules.mockResolvedValue({ items: [] });
    analyticsApi.getHistoricalSeasonalProduction.mockResolvedValue({});
    analyticsApi.getArrivalPressure.mockResolvedValue({ status: 'unavailable', message: 'Not enough records' });
  });

  it('does NOT render the removed Issues section even when module warnings are present, while keeping Current Analytics Outputs cards intact', async () => {
    analyticsApi.listModuleOutputs.mockResolvedValue({ items: [RECORD] });
    analyticsApi.computeModuleOutputs.mockResolvedValue({
      commodity_id: 'COM-0001',
      output_id: 'MCR-0001',
      price_outlook: {
        classification: 'Favorable',
        reliability_status: 'High',
        reliability_warnings: ['Price reporting lag: 3 missed expected reporting days.'],
        reliability_limitations: [
          'Evaluated on expected Monday-Friday reporting schedule; official holidays and unexpected reporting interruptions are not accounted for.',
        ],
      },
      arrival_pressure: {
        classification: 'Lower Middle',
        reliability_status: 'Moderate',
        reliability_warnings: ['Monthly arrivals has only 1 month, below computational minimum of 4.'],
        reliability_limitations: [
          'Evaluated on expected monthly DFTC schedule; reporting holidays and administrative pauses are not accounted for.',
        ],
      },
      historical_seasonal_production_level: {
        classification: 'Upper Middle',
        reliability_status: 'High',
        reliability_warnings: ['Production data is 2 days overdue for expected release Q3 2026.'],
        reliability_limitations: [
          'Provisional HarvestWise project policy: standard 5-year depth.',
        ],
      },
      weather_risk: {
        classification: 'Low',
        reliability_status: 'Low',
        reliability_warnings: [],
        reliability_limitations: [],
      },
    });

    renderAnalyticsPage();

    // Current Analytics Outputs must be intact
    expect(await screen.findByText('Current Analytics Outputs')).toBeDefined();
    expect(screen.getByText('Price Outlook')).toBeDefined();
    expect(screen.getByText('Arrival Pressure')).toBeDefined();
    expect(screen.getByText('Historical Seasonal Production Level')).toBeDefined();
    expect(screen.getByText('Weather Risk')).toBeDefined();

    // The removed Issues heading and section must NOT render
    expect(screen.queryByRole('heading', { level: 3, name: 'Issues' })).toBeNull();
    expect(screen.queryByText('Data quality and recency issues affecting the current analytical assessment.')).toBeNull();
  });

  it('renders Current Analytics Outputs cards cleanly when no warnings are present without any Issues section', async () => {
    analyticsApi.listModuleOutputs.mockResolvedValue({ items: [RECORD] });
    analyticsApi.computeModuleOutputs.mockResolvedValue({
      commodity_id: 'COM-0001',
      output_id: 'MCR-0001',
      price_outlook: {
        reliability_warnings: [],
        reliability_limitations: [],
      },
      arrival_pressure: {
        reliability_warnings: [],
        reliability_limitations: [],
      },
      historical_seasonal_production_level: {
        reliability_warnings: [],
        reliability_limitations: [],
      },
      weather_risk: {
        reliability_warnings: [],
        reliability_limitations: [],
      },
    });

    renderAnalyticsPage();

    // Wait for the outputs to load
    expect(await screen.findByText('Current Analytics Outputs')).toBeDefined();

    // The Issues section should be completely absent
    expect(screen.queryByRole('heading', { level: 3, name: 'Issues' })).toBeNull();
  });
});
