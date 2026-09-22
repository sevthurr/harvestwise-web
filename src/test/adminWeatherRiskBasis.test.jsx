import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminAnalyticsBasis from '../app/admin/pages/AdminAnalyticsBasis';

vi.mock('../services/api', () => ({
  analyticsApi: {
    getWeatherForecast: vi.fn().mockResolvedValue({
      status: 'ok',
      days: [
        {
          date: '2026-09-22',
          day_label: 'Today',
          temp_max: 29.0,
          temp_min: 23.4,
          rainfall_mm: 6.0,
          humidity_pct: 82.5,
          wind_speed_max_kmh: 8.5,
          rain_probability_pct: null,
          weather_condition: 'Suitable',
        },
        {
          date: '2026-09-23',
          day_label: '+1d',
          temp_max: 28.9,
          temp_min: 23.4,
          rainfall_mm: 6.5,
          humidity_pct: 81.0,
          wind_speed_max_kmh: 9.0,
          rain_probability_pct: null,
          weather_condition: 'Suitable',
        },
      ],
    }),
    listCommodities: vi.fn().mockResolvedValue({
      items: [
        { id: 'COM-0001', name: 'Ampalaya', is_top10: true, is_active: true },
        { id: 'COM-0002', name: 'Kalabasa', is_top10: true, is_active: true },
      ],
    }),
    listThresholds: vi.fn().mockResolvedValue({ items: [] }),
    listThresholdRules: vi.fn().mockResolvedValue({ items: [] }),
    getHistoricalSeasonalProduction: vi.fn().mockResolvedValue({}),
    getPriceOutlook: vi.fn().mockResolvedValue({}),
  },
}));

describe('AdminAnalyticsBasis Weather Risk Basis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes Result Explanation and Datasets Used, renders Top 10 Commodities threshold table, and displays forecast cards without empty overlay', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/modules/basis/weather-risk?commodity=Ampalaya&variety=All%20Varieties']}>
          <Routes>
            <Route path="/admin/modules/basis/:resultId" element={<AdminAnalyticsBasis />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // 1. Verify "Result Explanation" is REMOVED on weather risk basis
    expect(screen.queryByText('Result Explanation')).toBeNull();

    // 2. Verify "DATASETS USED" is REMOVED on weather risk basis
    expect(screen.queryByText(/DATASETS USED/i)).toBeNull();

    // 3. Verify "Threshold Applied" section heading is present
    expect(screen.getByText('Threshold Applied')).toBeDefined();

    // 4. Verify table column headers (each appears exactly once in thead)
    // Use role-based queries to target the <th> elements specifically,
    // avoiding conflicts with the same text in row badges.
    const columnHeaders = screen.getAllByRole('columnheader');
    const headerTexts = columnHeaders.map((th) => th.textContent);
    expect(headerTexts.some((t) => t === 'Suitable')).toBe(true);
    expect(headerTexts.some((t) => t === 'Caution')).toBe(true);
    expect(headerTexts.some((t) => t === 'Severe')).toBe(true);
    expect(headerTexts.some((t) => t === 'Commodity')).toBe(true);

    // 5. Verify commodity rows appear in the threshold table
    expect(screen.getAllByText('Ampalaya').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Kalabasa').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Kamatis').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Carrots').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Chinese Pechay').length).toBeGreaterThanOrEqual(1);

    // 6. Verify 14-day weather forecast section heading always renders
    expect(screen.getByText('14-Day Weather Forecast Outlook')).toBeDefined();

    // Verify forecast card data renders after the async fetch resolves
    await waitFor(() => {
      expect(screen.getAllByText('Today').length).toBeGreaterThanOrEqual(1);
    }, { timeout: 5000 });

    expect(screen.getAllByText('29°').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('23°').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('6.0mm').length).toBeGreaterThanOrEqual(1);

    // 7. Verify the "No weather data available." empty overlay is NOT shown
    expect(screen.queryByText('No weather data available.')).toBeNull();
  });
});
