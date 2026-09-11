/**
 * Admin forecast graph and summary wiring.
 *
 * Confirms AdminForecasting reads GET /prices/{id} with series-scoped
 * price_type + horizon, plots forecast_midpoint, and fills Forecast Summary
 * from recent records plus lower/upper/midpoint using the existing
 * price-change and Price Outlook formulas.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import AdminForecasting, {
  buildChartData,
  catalogPairsFromPriceList,
  findCommodityId,
  forecastChangePercent,
  parseHorizonDays,
  priceOutlookFromChange,
  recentAveragePrice,
  toPriceTypeKey,
} from '../app/admin/pages/AdminForecasting';
import * as pricesApi from '../services/api/pricesApi';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div data-testid="forecast-chart">{children}</div>,
  };
});

const PREFIX = '/api/v1';

const LIST = {
  items: [
    { commodity_id: 'COM-AMP-GAL', name: 'Ampalaya', variety: 'Galaxy', is_top10: true },
    { commodity_id: 'COM-TAL-BAN', name: 'Talong', variety: 'Banate King', is_top10: true },
  ],
  total: 2,
  page: 1,
  page_size: 100,
};

function detailBody({
  commodityId = 'COM-AMP-GAL',
  name = 'Ampalaya',
  variety = 'Galaxy',
  priceType = 'bangkerohan_retail',
  horizon = 14,
  midpoint = 81.25,
  forecastDate = '2026-08-14',
  records = [{ record_id: 'PRC-1', price_date: '2026-07-31', price_avg: 70, data_source: 'bankerohan_daily_retail', price_type: 'retail' }],
  forecast = undefined,
} = {}) {
  const resolvedForecast = forecast === undefined
    ? {
        forecast_id: 'FCS-1',
        forecast_date: forecastDate,
        horizon_days: horizon,
        lower_forecast: 71.25,
        upper_forecast: 91.25,
        forecast_midpoint: midpoint,
        trend: 'Rising',
        advisory_text: 'should not be used for outlook',
        price_type: priceType,
        generated_at: '2026-07-31T12:00:00',
      }
    : forecast;
  return {
    commodity_id: commodityId,
    name,
    variety,
    selected_price_type: priceType,
    current_price: 70,
    forecast: resolvedForecast,
    recent_records: records,
  };
}

function mockFetchByUrl(handlers) {
  return vi.fn(async (url) => {
    const href = String(url);
    const handler = handlers.find((h) => h.match(href));
    const resp = handler
      ? handler.response(href)
      : { ok: false, status: 404, body: { detail: `unmocked ${href}` } };
    return {
      ok: resp.ok ?? true,
      status: resp.status ?? 200,
      json: async () => resp.body,
    };
  });
}

function searchParams(url) {
  const href = String(url);
  const qIndex = href.indexOf('?');
  return new URLSearchParams(qIndex >= 0 ? href.slice(qIndex + 1) : '');
}

function detailUrls(fetchFn) {
  return fetchFn.mock.calls
    .map(([url]) => String(url))
    .filter((url) => /\/prices\/COM-/.test(url));
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('forecast graph mapping helpers', () => {
  it('maps horizon selector labels to forecast_horizon_days', () => {
    expect(parseHorizonDays('7 days')).toBe(7);
    expect(parseHorizonDays('14 days')).toBe(14);
    expect(parseHorizonDays('21 days')).toBe(21);
    expect(parseHorizonDays('28 days')).toBe(28);
  });

  it('maps market + price type to series-scoped API keys without mixing series', () => {
    expect(toPriceTypeKey('Bankerohan', 'Retail')).toBe('bangkerohan_retail');
    expect(toPriceTypeKey('Bankerohan', 'Wholesale')).toBe('bangkerohan_wholesale');
    expect(toPriceTypeKey('DFTC', 'Retail')).toBe('dftc_retail');
    expect(toPriceTypeKey('DFTC', 'Wholesale')).toBe('dftc_wholesale');
    expect(toPriceTypeKey('Bankerohan', 'Retail')).not.toBe(toPriceTypeKey('DFTC', 'Retail'));
    expect(toPriceTypeKey('Bankerohan', 'Wholesale')).not.toBe(toPriceTypeKey('Bankerohan', 'Retail'));
    expect(toPriceTypeKey('DFTC', 'Retail')).not.toBe(toPriceTypeKey('DFTC', 'Wholesale'));
  });

  it('keeps different varieties on distinct commodity ids', () => {
    const pairs = catalogPairsFromPriceList(LIST.items);
    expect(findCommodityId(pairs, 'Ampalaya', 'Galaxy')).toBe('COM-AMP-GAL');
    expect(findCommodityId(pairs, 'Talong', 'Banate King')).toBe('COM-TAL-BAN');
    expect(findCommodityId(pairs, 'Ampalaya', 'Galaxy')).not.toBe(
      findCommodityId(pairs, 'Talong', 'Banate King')
    );
  });

  it('plots forecast_midpoint on forecast_date and does not invent daily points', () => {
    const data = buildChartData(
      [
        { price_date: '2026-07-30', price_avg: 68 },
        { price_date: '2026-07-31', price_avg: 70 },
      ],
      { forecast_date: '2026-08-14', forecast_midpoint: 81.25 }
    );
    expect(data).toEqual([
      { d: '2026-07-30', actual: 68 },
      { d: '2026-07-31', actual: 70 },
      { d: '2026-08-14', predicted: 81.25 },
    ]);
    expect(data).toHaveLength(3);
    expect(data.some((point) => point.d === '2026-08-01')).toBe(false);
  });

  it('plots daily forecast.points when the prices API returns them', () => {
    const data = buildChartData(
      [{ price_date: '2026-07-31', price_avg: 70 }],
      { forecast_date: '2026-08-14', forecast_midpoint: 81.25 },
      [
        { forecast_date: '2026-08-01', forecast_midpoint: 71 },
        { forecast_date: '2026-08-02', forecast_midpoint: 72 },
      ]
    );
    expect(data).toEqual([
      { d: '2026-07-31', actual: 70 },
      { d: '2026-08-01', predicted: 71 },
      { d: '2026-08-02', predicted: 72 },
    ]);
  });

  it('does not attach lower/upper interval fields the existing chart does not render', () => {
    const [point] = buildChartData(
      [],
      { forecast_date: '2026-08-14', forecast_midpoint: 81.25, lower_forecast: 71.25, upper_forecast: 91.25 }
    );
    expect(point.predicted).toBe(81.25);
    expect(point.lower).toBe(71.25);
    expect(point.upper).toBe(91.25);
  });

  it('anchors forecast range bounds to the last observed date so the range renders as two lines', () => {
    const data = buildChartData(
      [
        { price_date: '2026-07-30', price_avg: 68 },
        { price_date: '2026-07-31', price_avg: 70 },
      ],
      { forecast_date: '2026-08-14', forecast_midpoint: 81.25, lower_forecast: 71.25, upper_forecast: 91.25 }
    );
    const anchor = data.find((point) => point.d === '2026-07-31');
    const forecast = data.find((point) => point.d === '2026-08-14');
    expect(anchor.lower).toBe(71.25);
    expect(anchor.upper).toBe(91.25);
    expect(forecast.lower).toBe(71.25);
    expect(forecast.upper).toBe(91.25);
  });

  it('averages the most recent observed prices for Recent Average', () => {
    expect(
      recentAveragePrice([
        { price_date: '2026-07-31', price_avg: 86 },
        { price_date: '2026-07-30', price_avg: 82 },
        { price_date: '2026-07-29', price_avg: 80 },
      ])
    ).toBeCloseTo(82.666, 2);
  });

  it('computes forecast change % and Price Outlook from the existing thresholds', () => {
    expect(forecastChangePercent(77.25, 70)).toBeCloseTo(10.357, 3);
    expect(priceOutlookFromChange(5.1)).toBe('Favorable');
    expect(priceOutlookFromChange(5)).toBe('Neutral');
    expect(priceOutlookFromChange(-5)).toBe('Neutral');
    expect(priceOutlookFromChange(-5.1)).toBe('Unfavorable');
    expect(priceOutlookFromChange(null)).toBeNull();
  });
});

describe('pricesApi', () => {
  it('getPriceDetail GETs /prices/{id} with price_type and horizon', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => detailBody({ horizon: 7 }),
    }));
    vi.stubGlobal('fetch', fetchFn);

    await pricesApi.getPriceDetail('COM-AMP-GAL', {
      price_type: 'bangkerohan_retail',
      horizon: 7,
      records_limit: 20,
    });

    const [url, opts] = fetchFn.mock.calls[0];
    expect(url).toContain(`${PREFIX}/prices/COM-AMP-GAL`);
    expect(url).toContain('price_type=bangkerohan_retail');
    expect(url).toContain('horizon=7');
    expect(url).not.toContain('/forecasts');
    expect(opts.method).toBe('GET');
  });
});

describe('AdminForecasting graph', () => {
  function dropdownButton(label) {
    const fieldLabel = screen.getByText(label);
    return fieldLabel.parentElement.querySelector('button');
  }

  function mountWithApi() {
    const fetchFn = mockFetchByUrl([
      {
        match: (url) => url.includes('/prices?') || url.includes('/prices/?') || /\/prices\/?$/.test(url.split('?')[0]),
        response: (url) => {
          if (/\/prices\/COM-/.test(url)) return { ok: true, body: detailBody() };
          return { ok: true, body: LIST };
        },
      },
      {
        match: (url) => /\/prices\/COM-/.test(url),
        response: (url) => {
          const params = searchParams(url);
          const commodityId = url.includes('COM-TAL-BAN') ? 'COM-TAL-BAN' : 'COM-AMP-GAL';
          return {
            ok: true,
            body: detailBody({
              commodityId,
              name: commodityId === 'COM-TAL-BAN' ? 'Talong' : 'Ampalaya',
              variety: commodityId === 'COM-TAL-BAN' ? 'Banate King' : 'Galaxy',
              priceType: params.get('price_type') || 'bangkerohan_retail',
              horizon: Number(params.get('horizon') || 14),
              midpoint: Number(params.get('horizon') || 14) + 70,
              forecastDate: `2026-08-${String(Number(params.get('horizon') || 14)).padStart(2, '0')}`,
            }),
          };
        },
      },
    ]);
    vi.stubGlobal('fetch', fetchFn);
    render(<AdminForecasting />);
    return fetchFn;
  }

  it('loads the 7-day selector as horizon=7', async () => {
    const user = userEvent.setup();
    const fetchFn = mountWithApi();

    await waitFor(() => expect(detailUrls(fetchFn).length).toBeGreaterThan(0));
    await user.click(dropdownButton('Forecast Horizon'));
    await user.click(screen.getByText('7 days'));

    await waitFor(() => {
      expect(detailUrls(fetchFn).some((url) => url.includes('horizon=7'))).toBe(true);
    });
  });

  it('loads the 14-day selector as horizon=14', async () => {
    const fetchFn = mountWithApi();
    await waitFor(() => {
      expect(detailUrls(fetchFn).some((url) => url.includes('horizon=14'))).toBe(true);
    });
  });

  it('loads the 21-day selector as horizon=21', async () => {
    const user = userEvent.setup();
    const fetchFn = mountWithApi();
    await waitFor(() => expect(detailUrls(fetchFn).length).toBeGreaterThan(0));
    await user.click(dropdownButton('Forecast Horizon'));
    await user.click(screen.getByText('21 days'));
    await waitFor(() => {
      expect(detailUrls(fetchFn).some((url) => url.includes('horizon=21'))).toBe(true);
    });
  });

  it('loads the 28-day selector as horizon=28', async () => {
    const user = userEvent.setup();
    const fetchFn = mountWithApi();
    await waitFor(() => expect(detailUrls(fetchFn).length).toBeGreaterThan(0));
    await user.click(dropdownButton('Forecast Horizon'));
    await user.click(screen.getByText('28 days'));
    await waitFor(() => {
      expect(detailUrls(fetchFn).some((url) => url.includes('horizon=28'))).toBe(true);
    });
  });

  it('uses forecast_midpoint and forecast_date from the prices detail payload', async () => {
    mountWithApi();
    await waitFor(() => {
      expect(screen.getByText(/Aug 14, 2026/)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/₱84\/kg/).length).toBeGreaterThan(0);
  });

  it('does not request Bankerohan Retail when DFTC Retail is selected', async () => {
    const user = userEvent.setup();
    const fetchFn = mountWithApi();
    await waitFor(() => expect(detailUrls(fetchFn).length).toBeGreaterThan(0));
    await user.click(dropdownButton('Market'));
    await user.click(screen.getByRole('button', { name: 'DFTC' }));
    await waitFor(() => {
      expect(detailUrls(fetchFn).some((url) => url.includes('price_type=dftc_retail'))).toBe(true);
    });
    const dftcCalls = detailUrls(fetchFn).filter((url) => url.includes('price_type=dftc_retail'));
    expect(dftcCalls.every((url) => !url.includes('bangkerohan_retail'))).toBe(true);
  });

  it('does not request Bankerohan Retail when Bankerohan Wholesale is selected', async () => {
    const user = userEvent.setup();
    const fetchFn = mountWithApi();
    await waitFor(() => expect(detailUrls(fetchFn).length).toBeGreaterThan(0));
    await user.click(dropdownButton('Price Type'));
    await user.click(screen.getByRole('button', { name: 'Wholesale' }));
    await waitFor(() => {
      expect(detailUrls(fetchFn).some((url) => url.includes('price_type=bangkerohan_wholesale'))).toBe(true);
    });
  });

  it('does not request DFTC Wholesale when DFTC Retail is selected', async () => {
    const user = userEvent.setup();
    const fetchFn = mountWithApi();
    await waitFor(() => expect(detailUrls(fetchFn).length).toBeGreaterThan(0));
    await user.click(dropdownButton('Market'));
    await user.click(screen.getByRole('button', { name: 'DFTC' }));
    await waitFor(() => {
      expect(detailUrls(fetchFn).some((url) => url.includes('price_type=dftc_retail'))).toBe(true);
    });
    expect(detailUrls(fetchFn).some((url) => url.includes('price_type=dftc_wholesale'))).toBe(false);
  });

  it('requests a different commodity id for a different variety', async () => {
    const user = userEvent.setup();
    const fetchFn = mountWithApi();
    await waitFor(() => expect(detailUrls(fetchFn).some((url) => url.includes('/prices/COM-AMP-GAL'))).toBe(true));
    await user.click(dropdownButton('Commodity'));
    await user.click(screen.getByRole('button', { name: /Talong/ }));
    await waitFor(() => {
      expect(detailUrls(fetchFn).some((url) => url.includes('/prices/COM-TAL-BAN'))).toBe(true);
    });
    const talongCalls = detailUrls(fetchFn).filter((url) => url.includes('/prices/COM-TAL-BAN'));
    expect(talongCalls.every((url) => !url.includes('COM-AMP-GAL'))).toBe(true);
  });

  it('fills Forecast Summary from recent records and persisted interval bounds', async () => {
    mountWithApi();
    await waitFor(() => {
      expect(screen.getByText('Forecast Midpoint', { selector: 'p' }).parentElement).toHaveTextContent('₱84/kg');
    });
    expect(screen.getByText('Recent Average').parentElement).toHaveTextContent('₱70/kg');
    expect(screen.getByText('Lower Forecast').parentElement).toHaveTextContent('₱71.25/kg');
    expect(screen.getByText('Upper Forecast').parentElement).toHaveTextContent('₱91.25/kg');
    expect(screen.getByText('Forecast Change').parentElement).toHaveTextContent('+20.0%');
    expect(screen.getByText('Price Outlook').parentElement).toHaveTextContent('Favorable');
  });

  it('still plots historical recent_records from the prices detail payload', async () => {
    const data = buildChartData(
      [{ price_date: '2026-07-31', price_avg: 70 }],
      { forecast_date: '2026-08-14', forecast_midpoint: 81.25 }
    );
    expect(data.find((point) => point.d === '2026-07-31')?.actual).toBe(70);
    expect(data.find((point) => point.d === '2026-08-14')?.predicted).toBe(81.25);
  });

  it('keeps the existing loading overlay', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<AdminForecasting />);
    expect(screen.getByText('Loading forecast...')).toBeInTheDocument();
  });

  it('keeps the existing empty overlay when the series has no rows', async () => {
    const fetchFn = mockFetchByUrl([
      {
        match: (url) => !/\/prices\/COM-/.test(url),
        response: () => ({ ok: true, body: LIST }),
      },
      {
        match: (url) => /\/prices\/COM-/.test(url),
        response: () => ({
          ok: true,
          body: detailBody({ forecast: null, records: [] }),
        }),
      },
    ]);
    vi.stubGlobal('fetch', fetchFn);
    render(<AdminForecasting />);
    await waitFor(() => {
      expect(screen.getByText('No forecast records available')).toBeInTheDocument();
    });
  });

  it('keeps the existing error banner when the prices API fails', async () => {
    const fetchFn = mockFetchByUrl([
      {
        match: (url) => !/\/prices\/COM-/.test(url),
        response: () => ({ ok: true, body: LIST }),
      },
      {
        match: (url) => /\/prices\/COM-/.test(url),
        response: () => ({ ok: false, status: 500, body: { detail: 'detail failed' } }),
      },
    ]);
    vi.stubGlobal('fetch', fetchFn);
    render(<AdminForecasting />);
    await waitFor(() => {
      expect(screen.getByText(/Unable to load forecast data: detail failed/)).toBeInTheDocument();
    });
  });

  it('does not call the removed /forecasts API', async () => {
    const fetchFn = mountWithApi();
    await waitFor(() => expect(detailUrls(fetchFn).length).toBeGreaterThan(0));
    const urls = fetchFn.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes('/forecasts'))).toBe(false);
  });
});
