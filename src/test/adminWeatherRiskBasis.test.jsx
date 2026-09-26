import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminAnalyticsBasis from '../app/admin/pages/AdminAnalyticsBasis';
import { WeatherForecastOutlook } from '../app/global/components/shared/WeatherForecastOutlook';

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
    listWeatherRules: vi.fn().mockResolvedValue({ items: [] }),
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

  it('renders live weather-risk basis (inputs, thresholds, explanation), Top 10 reference table, and forecast cards without empty overlay', async () => {
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

    // 1. Verify the live "Result Explanation" IS present on weather risk basis
    expect(screen.getAllByText('Result Explanation').length).toBeGreaterThanOrEqual(1);

    // 2. Verify "DATASETS USED" IS present on weather risk basis (per-day weather records)
    expect(screen.getAllByText(/DATASETS USED/i).length).toBeGreaterThanOrEqual(1);

    // 3. Verify "Threshold Applied" section heading is present
    expect(screen.getByText('Threshold Applied')).toBeDefined();

    // 4. Verify "Reference Thresholds" table heading is present
    expect(screen.getByText('Reference Thresholds · Top 10 Commodities')).toBeDefined();

    // 5. Verify the live classification explanation renders after the forecast resolves
    await waitFor(() => {
      expect(screen.getAllByText(/Favorable meteorological conditions expected/).length).toBeGreaterThanOrEqual(1);
    }, { timeout: 5000 });

    // 6. Verify table column headers (each appears exactly once in thead)
    // Use role-based queries to target the <th> elements specifically,
    // avoiding conflicts with the same text in row badges.
    const columnHeaders = screen.getAllByRole('columnheader');
    const headerTexts = columnHeaders.map((th) => th.textContent);
    expect(headerTexts.some((t) => t === 'Suitable')).toBe(true);
    expect(headerTexts.some((t) => t === 'Caution')).toBe(true);
    expect(headerTexts.some((t) => t === 'Severe')).toBe(true);
    expect(headerTexts.some((t) => t === 'Commodity')).toBe(true);

    // 6b. Verify the "Forecast Data" table exposes the full per-day detail columns
    //     (added alongside the existing day cards — nothing is removed)
    ['Day', 'Temp Range', 'Rainfall', 'Humidity', 'Wind Speed', 'Condition'].forEach((col) => {
      expect(headerTexts.some((t) => t === col)).toBe(true);
    });
    expect(screen.getByText('Forecast Data')).toBeDefined();
    // Per-day detail values that were not surfaced by the cards
    expect(screen.getAllByText('83%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('8.5 km/h').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('23° – 29°C').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('6.0 mm').length).toBeGreaterThanOrEqual(1);

    // 7. Verify commodity rows appear in the threshold table
    expect(screen.getAllByText('Ampalaya').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Kalabasa').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Kamatis').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Carrots').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Chinese Pechay').length).toBeGreaterThanOrEqual(1);

    // 8. Verify 14-day weather forecast section heading always renders
    expect(screen.getByText('14-Day Weather Forecast Outlook')).toBeDefined();

    // Verify forecast card data renders after the async fetch resolves
    await waitFor(() => {
      expect(screen.getAllByText('Today').length).toBeGreaterThanOrEqual(1);
    }, { timeout: 5000 });

    expect(screen.getAllByText('29°').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('23°').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('6.0mm').length).toBeGreaterThanOrEqual(1);

    // 9. Verify the "No weather data available." empty overlay is NOT shown
    expect(screen.queryByText('No weather data available.')).toBeNull();
  });

  it('keeps the shared forecast component card-only by default so the farmer view is unchanged', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <WeatherForecastOutlook
            forecast={[{ date: '2026-09-22', day_label: 'Today', temp_max: 29, temp_min: 23, rainfall_mm: 6, humidity_pct: 82, wind_speed_max_kmh: 8 }]}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Cards still render
    await waitFor(() => {
      expect(screen.getAllByText('Today').length).toBeGreaterThanOrEqual(1);
    });
    // The admin-only detail table must NOT appear without the opt-in prop
    expect(screen.queryByText('Forecast Data')).toBeNull();
  });

  it('paginates the forecast data table and labels rows with relative day offsets', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // 14 days → 2 pages at 7 rows/page
    const forecast = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-09-${String(22 + i).padStart(2, '0')}`,
      day_label: i === 0 ? 'Today' : `+${i}d`,
      temp_max: 29,
      temp_min: 23,
      rainfall_mm: 6,
      humidity_pct: 82,
      wind_speed_max_kmh: 8,
    }));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <WeatherForecastOutlook forecast={forecast} showForecastTable />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Page 1 shows 7 data rows out of 14
    const table = within(screen.getByRole('table'));
    const dataRows = () => table.getAllByRole('row').length - 1; // minus header row
    expect(screen.getByText('Showing 1–7 of 14 days')).toBeDefined();
    expect(dataRows()).toBe(7);
    expect(table.getByText('+6d')).toBeDefined();
    expect(table.queryByText('+7d')).toBeNull();

    // Page 2 shows the remaining 7
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Showing 8–14 of 14 days')).toBeDefined();
    expect(dataRows()).toBe(7);
    expect(table.getByText('+7d')).toBeDefined();
    expect(table.queryByText('+6d')).toBeNull();

    // Back to page 1
    fireEvent.click(screen.getByText('Prev'));
    expect(screen.getByText('Showing 1–7 of 14 days')).toBeDefined();
  });
});
